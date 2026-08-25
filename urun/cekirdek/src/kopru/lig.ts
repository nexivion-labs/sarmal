// ═══════════════════════════════════════════════════════════════════════════
// kopru/lig.ts — 🎻 ÇALGICI LİGİ: plan-review köprüsü (STR-3.2 çalgıcı-köprüsü soyu)
//
//   Bir planı (+ opsiyonel karar metnini) LİGDEKİ modellere sunar (DeepSeek ·
//   Kimi · GLM — NVIDIA API Catalog, tek uç), her birinden YAPILANDIRILMIŞ görüş
//   toplar (eksik kabul kriteri · kapsam boşluğu · risk · öneri · puan) ve SAF
//   bir sentezle uzlaşıyı çıkarır. Amaç: madde kapsamları + kabul kriterleri
//   kod yazılmadan ÖNCE sağlamlaşsın (Founder süreci: karar → plan → görüş → kod).
//
//   STR-3.1 sıfır-npm: nvidia.ts'in senkron curl çekirdeğini paylaşır. Ağ hatası
//   fail-visible: çöken model sentezde "görüş alınamadı" olarak görünür, akış
//   durmaz. Ders (dersler.sar): NVIDIA kotası MODEL-BAZLI dolar — lig çok-modelli
//   kurulur; 429'da kardeş model ayakta kalır.
// ═══════════════════════════════════════════════════════════════════════════

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { anahtarBul, jsonAyıkla, nvidiaÇağır } from "./nvidia.ts";

/** Varsayılan lig kadrosu (canlı ping ile doğrulandı 2026-07-10). Çeşitlilik: üç ayrı
 *  model ailesi (DeepSeek · GLM · Llama/Nemotron). NOT: moonshotai/kimi-k2.6 katalogda
 *  listeli ama bu hesaba KAPALI (404 — canlı tur 1); qwen3.5/qwen3-next kuyrukta
 *  zaman-aşımı verdi. `--modeller a,b,c` ile değiştirilebilir. */
export const LIG_MODELLER = [
  "deepseek-ai/deepseek-v4-pro",
  "z-ai/glm-5.2",
  "nvidia/llama-3.3-nemotron-super-49b-v1.5",
];

/** Bir çalgıcının yapılandırılmış plan görüşü (JSON sözleşmesi). */
export interface Gorus {
  model: string;
  eksikKabulKriterleri: string[];
  kapsamBosluklari: string[];
  riskler: string[];
  oneriler: string[];
  genelPuan?: number;          // 0..10
  hata?: string;               // ağ/parse çöktüyse — fail-visible
  tokenGiris?: number;
  tokenCikis?: number;
}

// ── Sistem promptu — görüş sözleşmesini dikte eder ───────────────────────────
export function ligSistemPrompt(): string {
  return (
    "Sen deneyimli bir yazılım mimarı ve plan hakemisin. Sana Sarmal dilinde (.sar) " +
    "yazılmış bir uygulama planı (ve varsa ilgili mimari kararlar) verilecek. Türkçe düşün.\n" +
    "Görevin: planı SERTLEŞTİRMEK — övgü değil, boşluk bul. Şunlara odaklan:\n" +
    "• eksik/zayıf KABUL kriterleri (ölçülemez, kanıtsız, sahte-yeşile açık olanlar)\n" +
    "• kapsam boşlukları (planın adım olarak İÇERMEDİĞİ ama gereken işler; belirsiz sınırlar)\n" +
    "• riskler (sıralama/bağımlılık hataları, geri-alınamaz adımlar, entegrasyon kör noktaları)\n" +
    "• somut öneriler (hangi adıma hangi kabul maddesi eklenmeli — adım KOD'uyla)\n" +
    "YALNIZCA geçerli bir JSON nesnesi döndür — açıklama, markdown, ``` bloğu YOK. Şema:\n" +
    '{ "eksikKabulKriterleri": ["ADIM-KOD: eksik ölçüt ..."], "kapsamBosluklari": [".."],\n' +
    '  "riskler": [".."], "oneriler": [".."], "genelPuan": 0-10 }\n' +
    "Her madde kısa, somut ve adım-KOD'lu olsun; en fazla 6'şar madde."
  );
}

// ── Görüş toplama (etkili — ağ; model başına fail-visible) ────────────────────
export function ligGorusTopla(planMetni: string, kararMetni: string | undefined, modeller: string[]): Gorus[] {
  const anahtar = anahtarBul();
  const kullanici =
    (kararMetni ? `## Bağlayıcı mimari kararlar\n${kararMetni}\n\n` : "") +
    `## Gözden geçirilecek plan (.sar)\n${planMetni}`;

  return modeller.map((model): Gorus => {
    try {
      const { içerik, tokenGiriş, tokenÇıkış } = nvidiaÇağır(anahtar, model, [
        { role: "system", content: ligSistemPrompt() },
        { role: "user", content: kullanici },
      ], 4096);   // görüş JSON'u 2048'de kesiliyordu (deepseek dersi — canlı tur 1)
      const obj = jsonAyıkla(içerik) as Record<string, unknown>;
      const dizi = (x: unknown): string[] => (Array.isArray(x) ? x.map(String) : []);
      return {
        model,
        eksikKabulKriterleri: dizi(obj.eksikKabulKriterleri),
        kapsamBosluklari: dizi(obj.kapsamBosluklari),
        riskler: dizi(obj.riskler),
        oneriler: dizi(obj.oneriler),
        genelPuan: typeof obj.genelPuan === "number" ? obj.genelPuan : undefined,
        tokenGiris: tokenGiriş,
        tokenCikis: tokenÇıkış,
      };
    } catch (e) {
      return { model, eksikKabulKriterleri: [], kapsamBosluklari: [], riskler: [], oneriler: [],
               hata: (e as Error).message.slice(0, 200) };   // fail-visible — akış durmaz
    }
  });
}

// ── Sentez (SAF — birim-testlenebilir) ────────────────────────────────────────
const KATEGORILER: Array<{ anahtar: keyof Pick<Gorus, "eksikKabulKriterleri" | "kapsamBosluklari" | "riskler" | "oneriler">; baslik: string }> = [
  { anahtar: "eksikKabulKriterleri", baslik: "🎯 Eksik/zayıf kabul kriterleri" },
  { anahtar: "kapsamBosluklari", baslik: "🕳️ Kapsam boşlukları" },
  { anahtar: "riskler", baslik: "⚠️ Riskler" },
  { anahtar: "oneriler", baslik: "💡 Öneriler" },
];

/** Görüşleri tek markdown sentezine indirger: puan tablosu + kategori başına
 *  model-imzalı maddeler + kategori-uzlaşı sayacı (kaç model o kategoride konuştu). */
export function ligSentezle(gorusler: Gorus[]): string {
  const satirlar: string[] = ["# 🎻 Çalgıcı Ligi — Plan Görüş Sentezi", ""];

  satirlar.push("## Puanlar");
  for (const g of gorusler) {
    satirlar.push(g.hata
      ? `- **${g.model}**: ⛔ görüş alınamadı — ${g.hata}`
      : `- **${g.model}**: ${g.genelPuan ?? "—"}/10 (token ${g.tokenGiris ?? "?"}→${g.tokenCikis ?? "?"})`);
  }
  satirlar.push("");

  const saglam = gorusler.filter((g) => !g.hata);
  for (const { anahtar, baslik } of KATEGORILER) {
    const konusan = saglam.filter((g) => g[anahtar].length > 0);
    satirlar.push(`## ${baslik} — uzlaşı: ${konusan.length}/${saglam.length} model`);
    for (const g of konusan) for (const madde of g[anahtar]) {
      satirlar.push(`- ${madde}  \`[${g.model.split("/")[1] ?? g.model}]\``);
    }
    if (!konusan.length) satirlar.push("- (hiçbir model bu kategoride bulgu vermedi)");
    satirlar.push("");
  }
  return satirlar.join("\n");
}

// ── CLI kabuğu (etkili — dosya I/O + rapor) ───────────────────────────────────
export function ligKomutu(planYolu: string, kararYolu: string | undefined, modeller: string[]): number {
  if (!existsSync(planYolu)) { console.error(`✖ plan bulunamadı: ${planYolu}`); return 2; }
  const planMetni = readFileSync(planYolu, "utf8");
  const kararMetni = kararYolu ? readFileSync(kararYolu, "utf8") : undefined;

  console.log(`🎻 Lig toplanıyor — ${modeller.length} çalgıcı: ${modeller.join(" · ")}`);
  const gorusler = ligGorusTopla(planMetni, kararMetni, modeller);

  // ham görüşler + sentez → .sarmal/lig/ (gitignore'daki .sarmal çatısı altında)
  const dizin = join(process.cwd(), ".sarmal", "lig");
  mkdirSync(dizin, { recursive: true });
  for (const g of gorusler) {
    writeFileSync(join(dizin, `${g.model.replace(/[/]/g, "_")}.json`), JSON.stringify(g, null, 2));
  }
  const sentez = ligSentezle(gorusler);
  writeFileSync(join(dizin, "sentez.md"), sentez);

  console.log(sentez);
  console.log(`📁 Ham görüşler + sentez → ${dizin}`);
  return gorusler.every((g) => g.hata) ? 4 : 0;   // hepsi çöktüyse hata
}

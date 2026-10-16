// ═══════════════════════════════════════════════════════════════════════════
// mcp-ingilizce-kip.test.ts — 🌐 MCP YÜZÜNÜN İNGİLİZCE KİPİ (MGZ-A11)
//
//   Founder 2026-10-10 tarihinde İngilizce yüzün tek ilkesine hükmetmiştir:
//   dosya her dilde olduğu gibi Türkçe kalır, yüz İngilizce konuşur ve dosyadaki
//   gerçek Türkçe adları anar. 2026-10-16 hükmüyle aynı ilke MCP yüzüne uygulanır.
//
//   ① ÖĞRETİM NÖBETİ. İngilizce kipteki bir ajan .sar yazmayı sunucu talimatından,
//      araç açıklamalarından, karşılama kartından, doğuş rehberinden, şablonlardan,
//      doğuş aracından ve şef brifinginden öğrenir. Bu yüzlerden biri dosyada
//      bulunmayan bir ad karşılığı (Step, Phase, `dependsOn:`) öğretirse ajan
//      motorun bilinmeyen tip ya da şema dışı alan saydığı bir dosya yazar.
//      Nöbet bu yüzleri gerçek stdio sunucusunda koşturur ve ölçere
//      (src/ingilizce-yuz.ts) yaptırır; ad kusuru sıfır olmalıdır.
//
//   ② DÜZYAZI NÖBETİ. İngilizce kipte araç çıktısının düzyazısı İngilizcedir; çıktıda
//      kalan Türkçe yalnız dosya içeriğinin ve kanon verisinin yankısı olabilir.
//      Yankı ölçümden önce düşer: fikstür ağacının `.sar` dizgeleri (motorun
//      kırptığı uzunluklarla birlikte), karşılama kartının örnek dosyaları ve
//      kavram sözlüğünün dizgeleri. Dosyanın kendisini döndüren iki araç
//      (`bicimle`, `prizma`) bu nöbetin konusu değildir.
//   ③ TÜRKÇE KİP NÖBETİ. Aynı çağrılar Türkçe kipte İngilizceye kaymaz: her
//      düzyazı çıktısı Türkçe kalır ve iki kipin çıktısı birbirinden ayrışır.
//      Türkçe kipin tabanla bayt bayt aynı kaldığı ayrıca üretim koşusunda
//      ölçülür (MGZ-A11 Koşum kaydı); bu nöbet kipin yönünü korur.
//
//   Sunucu alt-süreçle sınanır: içe aktarma stdin dinleyicisi kurar ve test
//   sürecini asılı bırakır (mcp.test.ts ile aynı sınır).
// ═══════════════════════════════════════════════════════════════════════════

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { ingilizceYuzKusurlari } from "../src/ingilizce-yuz.ts";
import { sablonTurleri } from "../src/sablon.ts";
import { MINIMAL_ANADIZIN, MINIMAL_PLAN } from "../src/ogret.ts";
import { cevir } from "../src/cevir.ts";

const MCP = fileURLToPath(new URL("../src/mcp.ts", import.meta.url));
const SARMAL = fileURLToPath(new URL("../src/sarmal.ts", import.meta.url));

interface Oturum {
  readonly talimat: string;
  readonly araclar: ReadonlyArray<{ name: string; title: string; description: string; inputSchema: { properties: Record<string, { description: string }> } }>;
  readonly cevaplar: readonly string[];
}

/** Sunucuyu verilen dilde ve çalışma dizininde açar; initialize, tools/list ve çağrıları tek süreçte koşar. */
function oturum(dil: "tr" | "en", cwd: string, cagrilar: ReadonlyArray<[string, Record<string, unknown>]>): Oturum {
  const istekler = [
    { jsonrpc: "2.0", id: 1, method: "initialize", params: {} },
    { jsonrpc: "2.0", id: 2, method: "tools/list" },
    ...cagrilar.map(([name, args], i) => ({ jsonrpc: "2.0", id: i + 3, method: "tools/call", params: { name, arguments: args } })),
  ].map((x) => JSON.stringify(x)).join("\n") + "\n";
  const ham = execFileSync(process.execPath, [MCP], {
    input: istekler, encoding: "utf8", timeout: 300_000, maxBuffer: 64 * 1024 * 1024, cwd,
    env: { ...process.env, SARMAL_DIL: dil },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const yanit = ham.trim().split("\n").filter(Boolean).map((s) => JSON.parse(s) as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bul = (id: number): any => yanit.find((y) => y.id === id);
  return {
    talimat: bul(1).result.instructions,
    araclar: bul(2).result.tools,
    cevaplar: cagrilar.map((_, i) => ((bul(i + 3)?.result?.content ?? []) as Array<{ text: string }>).map((c) => c.text).join("\n")),
  };
}

/** Doğuş paketinin ürettiği gerçek bir ağaç: brifing ve doğuş yüzleri bunun üstünde koşar. */
function fiksturKur(): string {
  const kok = mkdtempSync(join(tmpdir(), "sarmal-mcp-en-"));
  execFileSync(process.execPath, [SARMAL, "dogus", join(kok, "agac"), "--tur", "proje"], {
    encoding: "utf8", env: { ...process.env, SARMAL_DIL: "tr" },
  });
  return kok;
}

/** Öğretim yüzlerinin çağrıları: ajanın .sar yazmayı öğrendiği her yer. */
function ogretimCagrilari(kok: string): Array<[string, Record<string, unknown>]> {
  return [
    ["ogret", {}],
    ["basla", {}],
    ...sablonTurleri().map((tur): [string, Record<string, unknown>] => ["basla", { tur }]),
    ["dogus", { hedef: join(kok, "soru") }],
    ["dogus", { hedef: join(kok, "yeni"), tur: "proje" }],
    ["sef", { adim: "ADM-KURULUS-01" }],
  ];
}

/** Bir yüzdeki ad kusurları, kaynağıyla etiketli. */
function adKusurlari(etiket: string, metin: string): string[] {
  return ingilizceYuzKusurlari(metin).filter((k) => k.tur === "ingilizce-ad").map((k) => `${etiket}: ${k.sozce}`);
}

test("MGZ-A11 nöbeti ①: İngilizce kipte öğretim yüzleri dosyada bulunmayan ad öğretmez", { timeout: 600_000 }, () => {
  const kok = fiksturKur();
  try {
    const cagrilar = ogretimCagrilari(kok);
    const en = oturum("en", join(kok, "agac"), cagrilar);
    const kusurlar: string[] = [...adKusurlari("talimat", en.talimat)];
    for (const a of en.araclar) {
      kusurlar.push(...adKusurlari(`${a.name}.title`, a.title), ...adKusurlari(`${a.name}.description`, a.description));
      for (const [p, s] of Object.entries(a.inputSchema.properties)) kusurlar.push(...adKusurlari(`${a.name}.${p}`, s.description));
    }
    cagrilar.forEach(([ad, args], i) => kusurlar.push(...adKusurlari(`${ad}${JSON.stringify(args)}`, en.cevaplar[i]!)));
    assert.deepEqual(kusurlar, [], `İngilizce kipte dosyada bulunmayan ${kusurlar.length} ad öğretiliyor:\n${kusurlar.join("\n")}`);
  } finally {
    rmSync(kok, { recursive: true, force: true });
  }
});

test("MGZ-A11 nöbeti ① kırmızı fikstür: ölçer öğretim yüzüne sızan ad karşılığını yakalar", () => {
  // Nöbetin kör olmadığının kanıtı: dosyadaki adla yazılmış temiz bir cümle
  // ad karşılığına çevrildiğinde ölçer onu adıyla bildirir.
  const temiz = "Write the plan as Faz → Blok → Katman → AltKatman → Adım and declare the dependency with `bağımlı: [ ADM-X ]`.";
  assert.deepEqual(adKusurlari("temiz", temiz), []);
  const bozuk = "Write the plan as Phase → Block → Layer → Sublayer → Step and declare the dependency with `dependsOn: [ ADM-X ]`.";
  assert.ok(adKusurlari("bozuk", bozuk).length >= 2, `ölçer ad karşılığını yakalamadı: ${adKusurlari("bozuk", bozuk).join(", ")}`);
});

// ── ② · ③ ────────────────────────────────────────────────────────────────────

/** Bir kökün altındaki bütün `.sar` dosyaları (gizli klasörler hariç). */
function sarDosyalari(kok: string): string[] {
  const sonuc: string[] = [];
  for (const ad of readdirSync(kok)) {
    if (ad.startsWith(".") || ad === "node_modules") continue;
    const yol = join(kok, ad);
    if (statSync(yol).isDirectory()) sonuc.push(...sarDosyalari(yol));
    else if (ad.endsWith(".sar")) sonuc.push(yol);
  }
  return sonuc;
}

/** JSON belgesindeki bütün dizge değerleri. */
function jsonDizgeleri(deger: unknown): string[] {
  if (typeof deger === "string") return [deger];
  if (Array.isArray(deger)) return deger.flatMap(jsonDizgeleri);
  if (deger && typeof deger === "object") return Object.values(deger).flatMap(jsonDizgeleri);
  return [];
}

/**
 * Bilerek çıktıya giren yankı: fikstür ağacının dizgeleri ve motorun onları
 * kırptığı uzunluklar (gezin 140, bul 97, açık Adım gerekçesi 88 karakter),
 * doğuş rehberinin şablon dosyaları, karşılama kartının örnek dosyaları ve
 * kavram sözlüğünün dizgeleri.
 */
function yankiMetinleri(agac: string): string[] {
  const dizgeler = sarDosyalari(agac).flatMap((d) => [...readFileSync(d, "utf8").matchAll(/"([^"\n]*)"/gu)].map((m) => m[1]!));
  const kirpik = dizgeler.flatMap((d) => [d, d.slice(0, 140), d.slice(0, 97), d.slice(0, 88)]);
  const harita = JSON.parse(readFileSync(fileURLToPath(new URL("../../../ogreti/bilgi/tasarim_sozlugu/baglam-haritasi.json", import.meta.url)), "utf8"));
  const terim = cevir("hover").terim;
  // Doğuş rehberinin şablonları ogreti/sablon/ altındaki gerçek .sar dosyalarıdır ve her dilde aynı Türkçe kaynaktır.
  const sablonlar = sarDosyalari(fileURLToPath(new URL("../../../ogreti/sablon/", import.meta.url)))
    .flatMap((d) => readFileSync(d, "utf8").split("\n").map((x) => x.trim()).filter(Boolean));
  return [...kirpik, ...sablonlar, ...MINIMAL_ANADIZIN.split("\n"), ...MINIMAL_PLAN.split("\n"), ...jsonDizgeleri(harita), ...(terim ? [terim.tr] : [])];
}

/** Düzyazı nöbetinin çağrıları: dosyanın kendisini döndürmeyen her araç en az bir kez. */
function duzyaziCagrilari(kok: string): Array<[string, Record<string, unknown>]> {
  return [
    ...ogretimCagrilari(kok),
    ["kavram", { kelime: "hover" }],
    ["karne", {}],
    ["graf", {}],
    ["gezin", { kod: "ADM-KURULUS-01" }],
    ["denetle", { kaynak: 'Adım( kod: ADM-X, durum: yanlis, ne: "deneme" )\n' }],
    ["kurallar", {}],
    ["siniflama", {}],
    ["siniflama", { tip: "Adım" }],
    ["denetle-proje", {}],
    ["iskelet", {}],
    ["etki", { kod: "ADM-KURULUS-01" }],
    ["bul", { metin: "kuruluş" }],
    ["durum-guncelle", { kod: "ADM-KURULUS-01", durum: "geliştirmede" }],
  ];
}

const turkceKusurlari = (metin: string, izinli: readonly string[]): string[] =>
  ingilizceYuzKusurlari(metin, izinli).filter((k) => k.tur === "turkce-duzyazi").map((k) => k.sozce);

test("MGZ-A11 nöbeti ② ve ③: İngilizce kipte düzyazı İngilizcedir, Türkçe kip Türkçe kalır", { timeout: 600_000 }, () => {
  const kok = fiksturKur();
  try {
    const agac = join(kok, "agac");
    const izinli = yankiMetinleri(agac);
    const cagrilar = duzyaziCagrilari(kok);
    const en = oturum("en", agac, cagrilar);
    // ③ Türkçe kip aynı fikstürün temiz bir kopyasında koşar: İngilizce oturum
    //    doğuş ve durum yazımıyla ağacı değiştirdi.
    rmSync(join(kok, "yeni"), { recursive: true, force: true });
    rmSync(agac, { recursive: true, force: true });
    execFileSync(process.execPath, [SARMAL, "dogus", agac, "--tur", "proje"], { encoding: "utf8", env: { ...process.env, SARMAL_DIL: "tr" } });
    const tr = oturum("tr", agac, cagrilar);

    const bulgular: string[] = [];
    cagrilar.forEach(([ad, args], i) => {
      const etiket = `${ad}${JSON.stringify(args)}`;
      const kusur = turkceKusurlari(en.cevaplar[i]!, izinli);
      if (kusur.length) bulgular.push(`${etiket}: ${[...new Set(kusur)].join(", ")}`);
      // ③ Türkçe kip İngilizceye kaymadı: düzyazı Türkçe kalır ve iki kip ayrışır.
      assert.ok(turkceKusurlari(tr.cevaplar[i]!, []).length > 0, `${etiket} Türkçe kipte Türkçe konuşmuyor:\n${tr.cevaplar[i]}`);
      assert.notEqual(en.cevaplar[i], tr.cevaplar[i], `${etiket} iki kipte aynı metni döndürdü — İngilizce kip uygulanmıyor`);
    });
    assert.deepEqual(bulgular, [], `İngilizce kipte Türkçe kalan düzyazı (${bulgular.length} çağrı):\n${bulgular.join("\n")}`);
  } finally {
    rmSync(kok, { recursive: true, force: true });
  }
});

test("MGZ-A11 nöbeti ② kırmızı fikstür: yankı dışında kalan Türkçe cümle yakalanır", () => {
  const izinli = ["Mimari diyaloğu yürütmek"];
  assert.deepEqual(turkceKusurlari("ne: Mimari diyaloğu yürütmek — the engine reads it.", izinli), [], "yankı düşmeli");
  assert.ok(turkceKusurlari("── DENETİM (0 hata · 0 uyarı) ──", izinli).length > 0, "çevrilmemiş başlık yakalanmalı");
});

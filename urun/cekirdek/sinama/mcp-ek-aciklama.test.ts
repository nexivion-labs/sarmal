// ═══════════════════════════════════════════════════════════════════════════
// mcp-ek-aciklama.test.ts — EKL-F6-A03 araç ek açıklama nöbeti
//
//   Bu nöbetin varlık sebebi şudur: bir aracın "yalnız okurum" beyanı, ajanın o
//   aracı onay sormadan çağırmasına yol açar. Beyan yanlışsa ajan diske yazan
//   bir aracı güvenli sanır ve zarar sessizce gelir. Bu yüzden burada beyan
//   yalnız ŞEKİL olarak denetlenmez; her araç geçici bir çalışma alanında
//   GERÇEKTEN koşturulur, dosya ağacı önce ve sonra karşılaştırılır ve beyan
//   ile ölçüm ayrışırsa süit kırmızıya döner.
//
//   Alan adları protokol şemasından alınmıştır (schema 2025-06-18): görünen ad
//   `Tool.title` ile `Tool.annotations.title` hanelerinde, davranış ipuçları
//   `Tool.annotations` içindeki `readOnlyHint` ve `destructiveHint` alanlarında
//   yayımlanır.
// ═══════════════════════════════════════════════════════════════════════════
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { dogusYaz } from "../src/dogus.ts";
import {
  MCP_ARAC_ADI,
  MCP_ARAC_METINLERI,
  mcpAracSemalari,
  mcpEkAciklamaEksikleri,
  type McpAracAdi,
  type McpAracSemasi,
  type McpMetinBaglami,
  type McpMetinKatalogu,
} from "../src/mcp-metinleri.ts";

const MCP = fileURLToPath(new URL("../src/mcp.ts", import.meta.url));
const BAGLAM: McpMetinBaglami = {
  kuralBolumleri: ["dil", "mimari"],
  sablonTurleri: ["adım", "proje"],
  adimDurumlari: ["beklemede", "geliştirmede", "tamamlandı"],
};

/** Ölçülen gerçek: kaç araç okur, kaç araç yazar ilan edilmiştir. */
const BEKLENEN_ARAC_SAYISI = 18;
const BEKLENEN_OKUR_SAYISI = 15;
const BEKLENEN_YAZAR_SAYISI = 3;

// ── yardımcılar ─────────────────────────────────────────────────────────────

/** Sunucunun tools/list yüzünü gerçek alt-süreçten okur (katalogdan değil). */
function sunucuAraclari(): readonly McpAracSemasi[] {
  const istek = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }) + "\n";
  const ham = execFileSync(process.execPath, [MCP], { input: istek, encoding: "utf8", timeout: 30_000 });
  return (JSON.parse(ham.trim()) as { result: { tools: McpAracSemasi[] } }).result.tools;
}

/** Tek bir tools/call koşar; hem metni hem hata bayrağını döndürür. */
function aracCagir(arac: string, args: Record<string, unknown>): { metin: string; isError: boolean } {
  const istekler = [
    { jsonrpc: "2.0", id: 1, method: "initialize", params: {} },
    { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: arac, arguments: args } },
  ].map((x) => JSON.stringify(x)).join("\n") + "\n";
  const ham = execFileSync(process.execPath, [MCP], { input: istekler, encoding: "utf8", timeout: 180_000, maxBuffer: 32 * 1024 * 1024 });
  const satirlar = ham.trim().split("\n").filter(Boolean);
  const yanit = JSON.parse(satirlar[satirlar.length - 1]) as {
    result?: { content?: Array<{ text?: string }>; isError?: boolean };
    error?: { message?: string };
  };
  if (yanit.error) return { metin: `✖ protokol hatası: ${yanit.error.message}`, isError: true };
  return {
    metin: yanit.result?.content?.map((c) => c.text).join("\n") ?? "",
    isError: yanit.result?.isError === true,
  };
}

/** Dizin ağacının içerik parmak izi: yol → içerik özeti (klasörler de sayılır). */
function agacIzi(kok: string): Map<string, string> {
  const iz = new Map<string, string>();
  const yuru = (dizin: string): void => {
    for (const giris of readdirSync(dizin, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const tam = join(dizin, giris.name);
      const yol = relative(kok, tam);
      if (giris.isDirectory()) {
        iz.set(yol + "/", "dizin");
        yuru(tam);
      } else {
        iz.set(yol, createHash("sha256").update(readFileSync(tam)).digest("hex"));
      }
    }
  };
  yuru(kok);
  return iz;
}

function izlerEsit(once: Map<string, string>, sonra: Map<string, string>): boolean {
  if (once.size !== sonra.size) return false;
  for (const [yol, ozet] of once) if (sonra.get(yol) !== ozet) return false;
  return true;
}

// ── ① beyan bütünlüğü (şekil nöbeti · mutasyonla kanıtlı) ────────────────────

test("EKL-F6-A03 nöbeti ①: 18 aracın tamamı ek açıklama taşır (15 okur · 3 yazar)", () => {
  assert.deepEqual(mcpEkAciklamaEksikleri(), []);
  assert.equal(Object.keys(MCP_ARAC_METINLERI).length, BEKLENEN_ARAC_SAYISI);

  const okurlar = Object.entries(MCP_ARAC_METINLERI).filter(([, a]) => a.ekAciklama.readOnlyHint);
  const yazarlar = Object.entries(MCP_ARAC_METINLERI).filter(([, a]) => !a.ekAciklama.readOnlyHint);
  assert.equal(okurlar.length, BEKLENEN_OKUR_SAYISI, `okur araç sayısı beklenenden farklı: ${okurlar.map(([a]) => a).join(" · ")}`);
  assert.equal(yazarlar.length, BEKLENEN_YAZAR_SAYISI, `yazar araç sayısı beklenenden farklı: ${yazarlar.map(([a]) => a).join(" · ")}`);
  assert.deepEqual(yazarlar.map(([ad]) => ad).sort(), ["dogus", "durum-guncelle", "iskelet"]);

  // Yazar araçların yıkıcılık beyanı ölçüme dayanır: doğuş ve iskelet var olanı
  // ezmeden ekler, durum-guncelle var olan değerin üstüne yazar.
  assert.equal(MCP_ARAC_METINLERI[MCP_ARAC_ADI.dogus].ekAciklama.destructiveHint, false);
  assert.equal(MCP_ARAC_METINLERI[MCP_ARAC_ADI.iskelet].ekAciklama.destructiveHint, false);
  assert.equal(MCP_ARAC_METINLERI[MCP_ARAC_ADI.durumGuncelle].ekAciklama.destructiveHint, true);

  // Mutasyon kanıtı ①: görünen adın bir dil hanesi boşalırsa nöbet yolu gösterir.
  const graf = MCP_ARAC_METINLERI[MCP_ARAC_ADI.graf];
  const baslikMutasyonu = {
    ...MCP_ARAC_METINLERI,
    [MCP_ARAC_ADI.graf]: { ...graf, ekAciklama: { ...graf.ekAciklama, title: { ...graf.ekAciklama.title, en: "" } } },
  } as unknown as McpMetinKatalogu;
  assert.ok(mcpEkAciklamaEksikleri(baslikMutasyonu).includes("graf.ekAciklama.title.en"));

  // Mutasyon kanıtı ②: okur/yazar beyanı hiç yazılmazsa nöbet aracı adıyla anar.
  const beyansiz = {
    ...MCP_ARAC_METINLERI,
    [MCP_ARAC_ADI.bul]: { ...MCP_ARAC_METINLERI[MCP_ARAC_ADI.bul], ekAciklama: { title: { tr: "a", en: "b" } } },
  } as unknown as McpMetinKatalogu;
  assert.ok(mcpEkAciklamaEksikleri(beyansiz).includes("bul.ekAciklama.readOnlyHint"));

  // Mutasyon kanıtı ③: yıkıcılık ipucu okur ilan edilmiş araca iliştirilemez —
  // protokolde bu alan yalnız readOnlyHint yanlışken anlamlıdır.
  const yanlisIpucu = {
    ...MCP_ARAC_METINLERI,
    [MCP_ARAC_ADI.graf]: { ...graf, ekAciklama: { ...graf.ekAciklama, destructiveHint: false } },
  } as unknown as McpMetinKatalogu;
  assert.ok(mcpEkAciklamaEksikleri(yanlisIpucu).includes("graf.ekAciklama.destructiveHint(okur-araca-yazilamaz)"));

  // Mutasyon kanıtı ④: yazar araçtan yıkıcılık beyanı düşerse sessiz varsayılana
  // düşmek yerine nöbet konuşur.
  const durum = MCP_ARAC_METINLERI[MCP_ARAC_ADI.durumGuncelle];
  const ipucusuz = {
    ...MCP_ARAC_METINLERI,
    [MCP_ARAC_ADI.durumGuncelle]: { ...durum, ekAciklama: { title: durum.ekAciklama.title, readOnlyHint: false } },
  } as unknown as McpMetinKatalogu;
  assert.ok(mcpEkAciklamaEksikleri(ipucusuz).includes("durum-guncelle.ekAciklama.destructiveHint"));
});

test("EKL-F6-A03 nöbeti ②: ek açıklama tools/list telinde iki yerde de yayımlanır", () => {
  const araclar = sunucuAraclari();
  assert.equal(araclar.length, BEKLENEN_ARAC_SAYISI);
  for (const arac of araclar) {
    assert.ok(arac.title?.trim(), `${arac.name} görünen ad taşımıyor (Tool.title)`);
    assert.ok(arac.annotations, `${arac.name} annotations taşımıyor`);
    assert.equal(arac.annotations.title, arac.title, `${arac.name} iki görünen ad hanesi ayrışmış`);
    assert.equal(typeof arac.annotations.readOnlyHint, "boolean", `${arac.name} okur/yazar beyanı yok`);
    if (arac.annotations.readOnlyHint) {
      assert.equal(arac.annotations.destructiveHint, undefined, `${arac.name} okurdur ama yıkıcılık ipucu taşıyor`);
    } else {
      assert.equal(typeof arac.annotations.destructiveHint, "boolean", `${arac.name} yazardır ama yıkıcılık beyanı yok`);
    }
  }
  assert.equal(araclar.filter((a) => a.annotations.readOnlyHint).length, BEKLENEN_OKUR_SAYISI);
  assert.equal(araclar.filter((a) => !a.annotations.readOnlyHint).length, BEKLENEN_YAZAR_SAYISI);

  // Görünen ad yayın diliyle birlikte taşınır; araç kimliği (name) sabit kalır.
  const tr = mcpAracSemalari("tr", BAGLAM);
  const en = mcpAracSemalari("en", BAGLAM);
  assert.deepEqual(tr.map((a) => a.name), en.map((a) => a.name));
  assert.equal(tr.find((a) => a.name === MCP_ARAC_ADI.durumGuncelle)!.title, "Adım durumunu yaz");
  assert.equal(en.find((a) => a.name === MCP_ARAC_ADI.durumGuncelle)!.title, "Write an Adım's status");
  for (let i = 0; i < tr.length; i++) {
    assert.deepEqual(tr[i].annotations.readOnlyHint, en[i].annotations.readOnlyHint);
    assert.deepEqual(tr[i].annotations.destructiveHint, en[i].annotations.destructiveHint);
  }
});

// ── ② NÖBETİN KALBİ: beyan ile ölçülen davranış karşılaştırılır ──────────────
//   Her araç kendi kopyasında koşar. Okur ilan edilmiş bir araç tek bir bayt
//   yazarsa ya da yazar ilan edilmiş bir araç hiç yazmazsa süit kırmızıya döner.

test("EKL-F6-A03 nöbeti ③: okur/yazar beyanı gerçek disk davranışıyla ölçülür", { timeout: 600_000 }, () => {
  const kok = mkdtempSync(join(tmpdir(), "sarmal-ek-aciklama-"));
  try {
    // Şablon: doğuş paketinin ürettiği geçerli proje (denetle'den sıfır hata ile çıkar).
    const sablon = join(kok, "sablon");
    dogusYaz(sablon, "deneme");
    const ornekKaynak = readFileSync(join(sablon, "plan", "ilk_plan.sar"), "utf8");

    /** Araç kendi taze kopyasında koşsun — tur birbirini kirletmesin. */
    const alanKur = (etiket: string): string => {
      const alan = join(kok, "alan-" + etiket);
      cpSync(sablon, alan, { recursive: true });
      return alan;
    };

    // iskelet'in yazım yolunun GERÇEKTEN koşması için ilan-edilen ama diskte
    // olmayan bir raf gerekir; aksi halde araç yazar ilan edilip hiç yazmazdı.
    const iskeletAlani = alanKur("iskelet");
    const anaYol = join(iskeletAlani, "deneme_anadizin.sar");
    const ana = readFileSync(anaYol, "utf8");
    const sonKapanis = ana.lastIndexOf("}");
    writeFileSync(anaYol,
      ana.slice(0, sonKapanis) +
      '  Raf( kod: RAF-NOBET, yol: "nobet/", ne: "Nöbet fikstürü — ilan edilmiştir fakat diskte yoktur" )\n' +
      ana.slice(sonKapanis), "utf8");

    const turlar: Array<{ arac: McpAracAdi; alan: string; args: Record<string, unknown> }> = [
      { arac: MCP_ARAC_ADI.sef, alan: alanKur("sef"), args: { adim: "ADM-KURULUS-01", dizin: "" } },
      { arac: MCP_ARAC_ADI.ogret, alan: alanKur("ogret"), args: {} },
      { arac: MCP_ARAC_ADI.kavram, alan: alanKur("kavram"), args: { kelime: "kapsayıcı" } },
      { arac: MCP_ARAC_ADI.karne, alan: alanKur("karne"), args: { dizin: "" } },
      { arac: MCP_ARAC_ADI.basla, alan: alanKur("basla"), args: { tur: "adım" } },
      { arac: MCP_ARAC_ADI.dogus, alan: alanKur("dogus"), args: { hedef: "", ad: "yavru", tur: "proje" } },
      { arac: MCP_ARAC_ADI.graf, alan: alanKur("graf"), args: { dizin: "" } },
      { arac: MCP_ARAC_ADI.gezin, alan: alanKur("gezin"), args: { kod: "ADM-KURULUS-01", dizin: "" } },
      { arac: MCP_ARAC_ADI.denetle, alan: alanKur("denetle"), args: { kaynak: ornekKaynak, dizin: "" } },
      { arac: MCP_ARAC_ADI.kurallar, alan: alanKur("kurallar"), args: {} },
      { arac: MCP_ARAC_ADI.siniflama, alan: alanKur("siniflama"), args: { tip: "Adım" } },
      { arac: MCP_ARAC_ADI.denetleProje, alan: alanKur("denetle-proje"), args: { dizin: "" } },
      { arac: MCP_ARAC_ADI.iskelet, alan: iskeletAlani, args: { dizin: "", uret: true } },
      { arac: MCP_ARAC_ADI.etki, alan: alanKur("etki"), args: { kod: "ADM-KURULUS-01", dizin: "" } },
      { arac: MCP_ARAC_ADI.bul, alan: alanKur("bul"), args: { metin: "kuruluş", dizin: "" } },
      { arac: MCP_ARAC_ADI.bicimle, alan: alanKur("bicimle"), args: { kaynak: ornekKaynak } },
      { arac: MCP_ARAC_ADI.prizma, alan: alanKur("prizma"), args: { kaynak: ornekKaynak, yuz: "json" } },
      { arac: MCP_ARAC_ADI.durumGuncelle, alan: alanKur("durum-guncelle"), args: { dizin: "", kod: "ADM-KURULUS-01", durum: "geliştirmede" } },
    ];
    assert.equal(turlar.length, BEKLENEN_ARAC_SAYISI, "ölçüm turu 18 aracın tamamını kapsamıyor");

    let olculenOkur = 0;
    let olculenYazar = 0;
    for (const tur of turlar) {
      const beyan = MCP_ARAC_METINLERI[tur.arac].ekAciklama;
      // Yol argümanları çalışma alanına bağlanır; doğuş hedefi alanın İÇİNDE
      // doğsun ki yazım ölçüm penceresinde görünsün.
      const args = Object.fromEntries(Object.entries(tur.args).map(([ad, deger]) => {
        if (deger !== "") return [ad, deger];
        return [ad, ad === "hedef" ? join(tur.alan, "yavru") : tur.alan];
      }));

      const once = agacIzi(tur.alan);
      const sonuc = aracCagir(tur.arac, args);
      assert.equal(sonuc.isError, false, `${tur.arac} ölçüm turunda hata döndürdü — yazım yolu koşmamış olabilir:\n${sonuc.metin}`);
      const sonra = agacIzi(tur.alan);
      const yazdi = !izlerEsit(once, sonra);

      assert.equal(
        yazdi, !beyan.readOnlyHint,
        yazdi
          ? `${tur.arac} okunur ilan edilmiş fakat çalışma alanını DEĞİŞTİRDİ — beyan yalandır.`
          : `${tur.arac} yazar ilan edilmiş fakat hiçbir şey yazmadı — beyan ölçülmemiş demektir.`,
      );
      if (beyan.readOnlyHint) olculenOkur++; else olculenYazar++;
    }
    assert.equal(olculenOkur, BEKLENEN_OKUR_SAYISI);
    assert.equal(olculenYazar, BEKLENEN_YAZAR_SAYISI);
  } finally {
    rmSync(kok, { recursive: true, force: true });
  }
});

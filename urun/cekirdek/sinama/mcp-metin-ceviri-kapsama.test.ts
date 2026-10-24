// ═══════════════════════════════════════════════════════════════════════════
// mcp-metin-ceviri-kapsama.test.ts — CDL-A05 araç okuma-yüzü çeviri nöbeti
// ═══════════════════════════════════════════════════════════════════════════
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { etkinCiktiDili } from "../src/cevir.ts";
import {
  MCP_ARAC_ADI,
  MCP_ARAC_METINLERI,
  mcpAracSemalari,
  mcpMetinKapsamaEksikleri,
  type McpMetinBaglami,
  type McpMetinKatalogu,
} from "../src/mcp-metinleri.ts";

const MCP = fileURLToPath(new URL("../src/mcp.ts", import.meta.url));
const BAGLAM: McpMetinBaglami = {
  kuralBolumleri: ["dil", "mimari"],
  sablonTurleri: ["Adım", "Proje"],
  adimDurumlari: ["beklemede", "geliştirmede", "tamamlandı"],
};

function sunucuAraclari(dil: "tr" | "en") {
  const istek = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }) + "\n";
  const ham = execFileSync(process.execPath, [MCP], {
    input: istek,
    encoding: "utf8",
    timeout: 30_000,
    env: { ...process.env, SARMAL_DIL: dil },
  });
  return (JSON.parse(ham.trim()) as { result: { tools: ReturnType<typeof mcpAracSemalari> } }).result.tools;
}

test("CDL-A05 nöbeti: 18 araç/34 parametre eksiksiz çevrilir; kimlik ve şema sabit kalır; mutasyon yakalanır", () => {
  // Tek dil kaynağı: yalnız SARMAL_DIL etkilidir; LANG ikinci kapı değildir.
  assert.equal(etkinCiktiDili({}), "tr");
  assert.equal(etkinCiktiDili({ LANG: "en_US.UTF-8" }), "tr");
  assert.equal(etkinCiktiDili({ SARMAL_DIL: "en", LANG: "tr_TR.UTF-8" }), "en");
  assert.equal(etkinCiktiDili({ SARMAL_DIL: "bilinmeyen" }), "tr");

  // Gerçek katalog eksiksizdir ve ölçülen kod evreni plan tahmini değil 18'dir.
  assert.deepEqual(mcpMetinKapsamaEksikleri(), []);
  assert.equal(Object.keys(MCP_ARAC_METINLERI).length, 18);
  assert.equal(
    Object.values(MCP_ARAC_METINLERI).reduce(
      (toplam, arac) => toplam + Object.keys(arac.inputSchema.properties).length,
      0,
    ),
    34,   // GOC-A10: dogus aracına tur ve proje parametreleri eklendi (32 → 34)
  );

  const tr = mcpAracSemalari("tr", BAGLAM);
  const en = mcpAracSemalari("en", BAGLAM);
  const beklenenAdlar = [
    "sef", "ogret", "kavram", "karne", "basla", "dogus", "graf", "gezin", "denetle",
    "kurallar", "siniflama", "denetle-proje", "iskelet", "etki", "bul", "bicimle", "prizma",
    "durum-guncelle",
  ];
  const beklenenParametreler: Record<string, readonly string[]> = {
    sef: ["adim", "dizin"],
    ogret: ["konu"],
    kavram: ["kelime", "baglam"],
    karne: ["dizin"],
    basla: ["tur"],
    dogus: ["hedef", "tur", "ad", "proje"],   // GOC-A10: tür sorusu ve ilk proje adı
    graf: ["dizin", "kok"],
    gezin: ["kod", "dizin"],
    denetle: ["kaynak", "yol", "dizin", "agac"],
    kurallar: ["kategori"],
    siniflama: ["tip"],
    "denetle-proje": ["dizin"],
    iskelet: ["dizin", "uret"],
    etki: ["kod", "dizin"],
    bul: ["metin", "dizin"],
    bicimle: ["kaynak"],
    prizma: ["kaynak", "yuz"],
    "durum-guncelle": ["dizin", "kod", "durum"],
  };
  // EKL-F6-A07: `dizin` hiçbir araçta zorunlu değildir; verilmezse oturumun çalışma dizini kullanılır.
  const beklenenZorunlu: Record<string, readonly string[] | undefined> = {
    sef: ["adim"],
    ogret: undefined,
    kavram: undefined,
    karne: undefined,
    basla: undefined,
    dogus: ["hedef"],
    graf: undefined,
    gezin: ["kod"],
    denetle: undefined,
    kurallar: undefined,
    siniflama: undefined,
    "denetle-proje": undefined,
    iskelet: undefined,
    etki: ["kod"],
    bul: ["metin"],
    bicimle: ["kaynak"],
    prizma: ["kaynak", "yuz"],
    "durum-guncelle": ["kod", "durum"],
  };
  assert.deepEqual(tr.map((a) => a.name), beklenenAdlar);
  assert.deepEqual(en.map((a) => a.name), beklenenAdlar);
  // EKL-F6-A03 · Founder hükmü 2026-09-16: bir araç açıklaması aracın NE YAPTIĞINI
  // anlatır, modele NASIL DAVRANACAĞINI söylemez; MCP dizin ölçütü de bunu ister.
  // Eski kullanım-kapısı kuyruğu (NE ZAMAN · WHEN) ile alışkanlık buyruğu bu yüzden
  // katalogdan çıkarıldı. Nöbet iki hanenin de DOLU olduğunu ölçmeyi sürdürür ve
  // buna ek olarak buyrukların GERİ DÖNMEDİĞİNİ ölçer — kural gevşemedi, yön değişti.
  const yonlendirmeKalibi = /NE ZAMAN:|WHEN:|ALIŞKANLIK|HABIT:/u;
  for (let i = 0; i < tr.length; i++) {
    assert.ok(tr[i].description.trim(), `${tr[i].name} Türkçe açıklaması boş`);
    assert.ok(en[i].description.trim(), `${en[i].name} İngilizce açıklaması boş`);
    assert.doesNotMatch(tr[i].description, yonlendirmeKalibi, `${tr[i].name} Türkçe açıklaması davranış buyruğu taşıyor`);
    assert.doesNotMatch(en[i].description, yonlendirmeKalibi, `${en[i].name} İngilizce açıklaması davranış buyruğu taşıyor`);
    assert.deepEqual(Object.keys(tr[i].inputSchema.properties), beklenenParametreler[tr[i].name]);
    assert.deepEqual(Object.keys(en[i].inputSchema.properties), beklenenParametreler[en[i].name]);
    assert.deepEqual(tr[i].inputSchema.required, beklenenZorunlu[tr[i].name]);
    assert.deepEqual(en[i].inputSchema.required, beklenenZorunlu[en[i].name]);
    for (const parametreAdi of Object.keys(tr[i].inputSchema.properties)) {
      const trParametre = tr[i].inputSchema.properties[parametreAdi];
      const enParametre = en[i].inputSchema.properties[parametreAdi];
      assert.equal(enParametre.type, trParametre.type);
      assert.deepEqual(enParametre.enum, trParametre.enum);
      assert.ok(enParametre.description.trim(), `${en[i].name}.${parametreAdi} İngilizce tarifi boş`);
    }
  }

  // Gerçek stdio sunucusu iki süreçte yalnız açıklamayı çevirir; kimlik aynı kalır.
  const sunucuTr = sunucuAraclari("tr");
  const sunucuEn = sunucuAraclari("en");
  assert.deepEqual(sunucuEn.map((a) => a.name), sunucuTr.map((a) => a.name));
  assert.match(sunucuTr.find((a) => a.name === MCP_ARAC_ADI.sef)!.description, /Bir Adım KOD'u/u);
  assert.match(sunucuEn.find((a) => a.name === MCP_ARAC_ADI.sef)!.description, /Builds ŞEF's/u);

  // Mutasyon kanıtı ①: araç açıklamasının en hanesi düşerse nöbet yolu gösterir.
  const sef = MCP_ARAC_METINLERI[MCP_ARAC_ADI.sef];
  const aracMutasyonu = {
    ...MCP_ARAC_METINLERI,
    [MCP_ARAC_ADI.sef]: { ...sef, description: { ...sef.description, en: undefined } },
  } as unknown as McpMetinKatalogu;
  assert.ok(mcpMetinKapsamaEksikleri(aracMutasyonu).includes("sef.description.en"));

  // Mutasyon kanıtı ②: tek parametre çevirisi boşalırsa nöbet tam yolu gösterir.
  const sefDizin = sef.inputSchema.properties.dizin;
  const parametreMutasyonu = {
    ...MCP_ARAC_METINLERI,
    [MCP_ARAC_ADI.sef]: {
      ...sef,
      inputSchema: {
        ...sef.inputSchema,
        properties: {
          ...sef.inputSchema.properties,
          dizin: { ...sefDizin, description: { ...sefDizin.description, en: "" } },
        },
      },
    },
  } as unknown as McpMetinKatalogu;
  assert.ok(mcpMetinKapsamaEksikleri(parametreMutasyonu)
    .includes("sef.inputSchema.properties.dizin.description.en"));
});

// ── HST-MTR-A17 · ÖRNEK ALANINDA SOMUT KOD YOK ─────────────────────────────────
//   Araç metinleri kullanıcı projelerinde de okunur. Örnek olarak verilen somut
//   bir kod o projede yoktur ve ajan onu gerçek sanıp aramaya çıkar; bu depoda
//   bile örnek kodlardan biri hiçbir yerde tanımlı değildi. Founder'ın 2026-10-10
//   hükmüyle örnekler biçimi anlatan bir kalıp gösterir ve kalıp yalnız ASCII
//   harf taşır. Nöbet örnek alanını işaretinden (`ör.`, `örneğin`, `for
//   example`, `e.g.`) ilk kapanan paranteze ya da cümle sonuna kadar okur ve
//   orada kimlik dizininin metin katmanının KOD saydığı bir sözce arar; ölçüm
//   gezinin kendi tanıyıcısıyla yapılır, böylece nöbetin "kod" dediği şey
//   aracın atıf saydığı şeyle aynıdır.

import { readFileSync } from "node:fs";
import { dosyayiTara } from "../src/kimlik.ts";
import { MCP_SUNUCU_TALIMATI } from "../src/mcp-metinleri.ts";

// JavaScript'in `\b` sınırı yalnız ASCII sözcük harfini tanır ve `ö` ile başlayan
// işareti kaçırır; sınır bu yüzden Unicode harf sınıfıyla kurulur.
const ORNEK_ISARETI = /(?<![\p{L}\p{N}])(?:ör\.|örn\.|örneğin|for example|e\.g\.)(?![\p{L}\p{N}])/giu;

/** Bir metnin örnek alanlarında metin katmanının KOD saydığı sözceler. */
function ornekKodlari(metin: string): string[] {
  const bulunan: string[] = [];
  for (const es of metin.matchAll(ORNEK_ISARETI)) {
    const bas = es.index + es[0].length;
    const kalan = metin.slice(bas);
    const son = kalan.search(/\)|\.\s|\.$/u);
    const alan = son < 0 ? kalan : kalan.slice(0, son);
    bulunan.push(...dosyayiTara(alan, false).adaylar.map((a) => a.metin));
  }
  return bulunan;
}

/** Araç açıklamaları, parametre tarifleri, sunucu talimatı ve mcp.ts hata cümleleri. */
function aracMetinleri(): [string, string][] {
  const metinler: [string, string][] = [];
  for (const dil of ["tr", "en"] as const) {
    for (const s of mcpAracSemalari(dil, BAGLAM)) {
      metinler.push([`${dil}:${s.name}`, s.description]);
      for (const [p, v] of Object.entries(s.inputSchema.properties)) metinler.push([`${dil}:${s.name}.${p}`, v.description]);
    }
    metinler.push([`${dil}:talimat`, MCP_SUNUCU_TALIMATI[dil]]);
  }
  readFileSync(MCP, "utf8").split("\n").forEach((satir, i) => {
    for (const es of satir.matchAll(/"(✖[^"]*)"|'(✖[^']*)'|`(✖[^`]*)`/gu)) metinler.push([`mcp.ts:${i + 1}`, es[1] ?? es[2] ?? es[3]!]);
  });
  return metinler;
}

test("HST-MTR-A17 · araç metinleri ve hata cümleleri örnek olarak somut bir kod göstermez", () => {
  const metinler = aracMetinleri();
  assert.ok(metinler.some(([yer]) => yer.startsWith("mcp.ts:")), "mcp.ts hata cümleleri okunamadı — nöbet dişsiz");
  const ihlaller = metinler.flatMap(([yer, metin]) => ornekKodlari(metin).map((kod) => `${yer} → ${kod}`));
  assert.deepEqual(ihlaller, [], `örnek alanında somut kod var:\n${ihlaller.join("\n")}`);
  // Nöbetin dişi: aynı okuyucu somut bir örneği gerçekten yakalar.
  assert.deepEqual(ornekKodlari("Adım KOD'u (ör. ABC-XYZ-A01)"), ["ABC-XYZ-A01"]);
  assert.deepEqual(ornekKodlari("KOD (for example, ABC-XYZ-A01 or ABC-XYZ)."), ["ABC-XYZ-A01", "ABC-XYZ"]);
  assert.deepEqual(ornekKodlari("✖ kod gerekli (ör. ABC-XYZ-A01)."), ["ABC-XYZ-A01"]);
});

test("HST-MTR-A17 · kalıp iki dilde aynıdır ve yalnız ASCII harf taşır", () => {
  const tr = new Map(mcpAracSemalari("tr", BAGLAM).map((s) => [s.name, s]));
  const en = new Map(mcpAracSemalari("en", BAGLAM).map((s) => [s.name, s]));
  // Kod kalıbı yer tutucu taşıyan ve tireyle bölünen sözcedir (`<ONEK>-<KONU>`);
  // `<dizin>` gibi tiresiz yer tutucular kod kalıbı değildir.
  const kaliplar = (metin: string): string[] =>
    (metin.match(/[^\s(),;:'"·.]+/gu) ?? []).filter((x) => x.includes("<") && x.includes("-"));
  let sayi = 0;
  for (const [ad, s] of tr) {
    const yuzler: [string, string][] = [[s.description, en.get(ad)!.description]];
    for (const [p, v] of Object.entries(s.inputSchema.properties)) yuzler.push([v.description, en.get(ad)!.inputSchema.properties[p]!.description]);
    for (const [t, e] of yuzler) {
      assert.deepEqual(kaliplar(t), kaliplar(e), `${ad}: Türkçe ve İngilizce kalıplar ayrışıyor`);
      for (const k of kaliplar(t)) {
        sayi++;
        assert.match(k, /^[\x21-\x7e]+$/u, `${ad}: kalıp ASCII dışı harf taşıyor: ${k}`);
      }
    }
  }
  assert.ok(sayi >= 3, `kalıp sayısı ${sayi}: sef, graf ve etki örnekleri kalıba çevrilmemiş`);
});

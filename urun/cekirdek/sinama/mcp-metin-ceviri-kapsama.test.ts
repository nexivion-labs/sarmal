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
  const beklenenZorunlu: Record<string, readonly string[] | undefined> = {
    sef: ["adim", "dizin"],
    ogret: undefined,
    kavram: undefined,
    karne: undefined,
    basla: undefined,
    dogus: ["hedef"],
    graf: ["dizin"],
    gezin: ["kod", "dizin"],
    denetle: undefined,
    kurallar: undefined,
    siniflama: undefined,
    "denetle-proje": ["dizin"],
    iskelet: ["dizin"],
    etki: ["kod", "dizin"],
    bul: ["metin", "dizin"],
    bicimle: ["kaynak"],
    prizma: ["kaynak", "yuz"],
    "durum-guncelle": ["dizin", "kod", "durum"],
  };
  assert.deepEqual(tr.map((a) => a.name), beklenenAdlar);
  assert.deepEqual(en.map((a) => a.name), beklenenAdlar);
  for (let i = 0; i < tr.length; i++) {
    assert.match(tr[i].description, /NE ZAMAN:/u, `${tr[i].name} Türkçe kullanım kapısını taşımıyor`);
    assert.match(en[i].description, /WHEN:/u, `${en[i].name} İngilizce kullanım kapısını taşımıyor`);
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

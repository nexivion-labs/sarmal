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
//   Sunucu alt-süreçle sınanır: içe aktarma stdin dinleyicisi kurar ve test
//   sürecini asılı bırakır (mcp.test.ts ile aynı sınır).
// ═══════════════════════════════════════════════════════════════════════════

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { ingilizceYuzKusurlari } from "../src/ingilizce-yuz.ts";
import { sablonTurleri } from "../src/sablon.ts";

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

// ═══════════════════════════════════════════════════════════════════════════
// belgele.test.ts — .sar → Markdown üretici sınamaları (DIL-2)
//
//   Güvenceler: şekil → başlık + kod-çiti (içerik AYNEN — DIL-2.2) · bölüm tag →
//   ‹tag› başlığı · düğüm → başlık + ne-alıntı + kenar okları · iç içe çocuk
//   başlık seviyesi · çit-uzatma (içerikte ``` varsa) · gerçek bolum1 uçtan uca.
// ═══════════════════════════════════════════════════════════════════════════

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { belgeMd, belgeGovdesiMd } from "../src/belgele.ts";

const KOK = new URL("../../..", import.meta.url).pathname;

test("belgele: şekil tag'i → başlık satırı + kod-çiti, içerik karaktere karakter", () => {
  const md = belgeGovdesiMd('<şekil ad="Düzenek" kaynak="s.2">\n  │Güney│  [3, 1]^T\n</şekil>');
  assert.ok(md.includes('<strong>◈ Düzenek</strong> · <em>s.2</em>'));  // class'lı şekil başlığı
  assert.ok(md.includes("```\n│Güney│  [3, 1]^T\n```"));  // ortak girinti söküldü (nizami kural), iç hiza korunur
});

test("belgele: bölüm tag'i → ‹tag› başlığı, gövde markdown olarak kalır", () => {
  const md = belgeGovdesiMd("<desenler>\n**kural bir** — metin\n</desenler>");
  assert.ok(md.includes('<h4 class="sarmal-tag">‹desenler›</h4>'));  // amber rozet (önizleme CSS'i boyar)
  assert.ok(md.includes("**kural bir** — metin"));
});

test("belgele: içerikte ``` varsa çit uzar (kaçış güvenliği)", () => {
  const md = belgeGovdesiMd('<şekil ad="X">\niçinde ``` var\n</şekil>');
  assert.ok(md.includes("````\niçinde ``` var\n````"));
});

test("belgele: FATİH KURALI — kod DOSYADAKİ HALİYLE sarmal çitinde, aynen", () => {
  const kaynak = '// yorum da aynen kalır\nÇıkarım( kod: CKR-X, kaynak: "kitap" ) {\n  ne: "açıklama"\n  --> ETM-Y\n}';
  const md = belgeMd(kaynak);
  assert.ok(md.includes("```sarmal\n" + kaynak + "\n```"));  // birebir — yeniden-yazım YOK
  assert.ok(!md.includes("## Çıkarım"));                       // sentetik başlık YOK
});

test("belgele: belgesiz dosya = tek sarmal çiti (tüm parametreler kod)", () => {
  const md = belgeMd("Blok( kod: BLK-A ) {\n  Katman( kod: FAZ-B ) { }\n}");
  assert.equal((md.match(/```sarmal/g) ?? []).length, 1);
  assert.ok(md.includes("Katman( kod: FAZ-B )"));
});

test("belgele: yalnız -->| içi MD olur; kod-belge-kod sırası korunur", () => {
  const md = belgeMd('çağır A\n-->|\n# Anlatı\niçerik |0⟩ serbest\n|<--\nBlok( kod: BLK-B ) { }');
  const citA = md.indexOf("çağır A");
  const anlati = md.indexOf("# Anlatı");
  const citB = md.indexOf("Blok( kod: BLK-B )");
  assert.ok(citA !== -1 && anlati !== -1 && citB !== -1 && citA < anlati && anlati < citB);
  assert.ok(md.includes("içerik |0⟩ serbest"));
  assert.equal((md.match(/```sarmal/g) ?? []).length, 2);      // blok öncesi + sonrası
});

test("belgele: uçtan uca — şekil + tag + kod bir arada (inline fixture)", () => {
  const kaynak = [
    "// baş yorumu",
    "-->|",
    "# Başlık Belgeden Gelir",
    '<şekil ad="Düzenek" kaynak="s.2">',
    "  ┌─────┐",
    "  │Güney│",
    "  └─────┘",
    "</şekil>",
    "<desenler>",
    "ölçüm |0⟩ ya da |1⟩",
    "</desenler>",
    "<anti-desenler>",
    "❌ yanlış",
    "</anti-desenler>",
    "<neden>",
    "gerekçe",
    "</neden>",
    "|<--",
    'Çıkarım( kod: CKR-X, kaynak: "k" ) {',
    '  ne: "n"',
    "  --> ETM-Y",
    "}",
  ].join("\n");
  const md = belgeMd(kaynak);
  assert.equal((md.match(/<strong>◈ /g) ?? []).length, 1);        // şekil başlığı
  assert.ok(md.includes("‹desenler›") && md.includes("‹neden›") && md.includes("‹anti-desenler›"));
  assert.ok(md.includes("# Başlık Belgeden Gelir"));               // başlık belgeden
  assert.ok(md.includes("│Güney│"));                               // şekil aynen
  assert.ok(md.includes("Çıkarım( kod: CKR-X") && md.includes("--> ETM-Y")); // bildirim kod çitinde
  assert.ok((md.match(/```sarmal/g) ?? []).length >= 2);           // kod parçaları
});

test("belgele: boya modu — kod parçası renk-sınıflı HTML (editör paritesi)", () => {
  const md = belgeMd('// yorum\nÇıkarım( kod: CKR-X, sayı: 42 ) {\n  ne: "metin"\n  --> ETM-Y\n}',
    { boya: true, tipRenk: (ad) => (ad === "Çıkarım" ? "#4ec9b0" : undefined) });
  assert.ok(md.includes('<pre class="sarmal-kod">'));
  assert.ok(md.includes('<span class="sk-yorum">// yorum</span>'));
  assert.ok(md.includes('<span class="sk-tip" style="color:#4ec9b0">Çıkarım</span>'));
  assert.ok(md.includes('<span class="sk-kod">CKR-X</span>'));
  assert.ok(md.includes('<span class="sk-param">ne</span>'));
  assert.ok(md.includes('<span class="sk-dizgi">"metin"</span>'));
  assert.ok(md.includes('<span class="sk-ok">--&gt;</span>'));
  assert.ok(md.includes('<span class="sk-sayi">42</span>'));
  assert.ok(!md.includes("```sarmal"));                          // boya modunda çit yok
});

test("belgele: boya modu varsayılan DEĞİL — CLI çıktısı saf MD kalır", () => {
  const md = belgeMd("Blok( kod: BLK-A ) { }");
  assert.ok(md.includes("```sarmal") && !md.includes("sk-tip"));
});

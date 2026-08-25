// ═══════════════════════════════════════════════════════════════════════════
// bicimle.test.ts — Biçimlendirici güvence sınamaları (VS Code'suz)
//
//   İki matematiksel güvence:
//     1. İDEMPOTENLİK: biçimle(biçimle(x)) === biçimle(x)
//        → temiz (bir kez biçimlenmiş) dosyada ⇧⌥F = 0 değişiklik.
//     2. ANLAM-KORUMA: ağaç(x) === ağaç(biçimle(x))
//        → biçimleme .sar'ın ANLAMINI asla değiştiremez (DIL-1.3/DIL-1.4 dahil).
//   Koşum: cd eklenti && npm test
// ═══════════════════════════════════════════════════════════════════════════

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { bicimle } from "../../cekirdek/src/bicimle.ts";
import { belirtecle } from "../../cekirdek/src/belirtec.ts";
import { ayristir } from "../../cekirdek/src/ayristirici.ts";
import { agaciYaz } from "../../cekirdek/src/yazdir.ts";

const KOK = new URL("../../..", import.meta.url).pathname;
const ornekler: string[] = [KOK + "sarmal_anadizin.sar"];
for (const d of readdirSync(KOK + "ogreti/ornek", { recursive: true }) as string[]) {
  if (d.endsWith(".sar") && !d.includes("bozuk")) ornekler.push(KOK + "ogreti/ornek/" + d);
}

const agac = (kaynak: string): string => agaciYaz(ayristir(belirtecle(kaynak)));

for (const yol of ornekler) {
  const ad = yol.slice(KOK.length);
  const kaynak = readFileSync(yol, "utf8");

  test(`idempotenlik: ${ad} — biçimle(biçimle(x)) === biçimle(x)`, () => {
    const bir = bicimle(kaynak, "\n");
    const iki = bicimle(bir, "\n");
    assert.equal(iki, bir);
  });

  test(`anlam-koruma: ${ad} — biçimleme ağacı değiştirmez`, () => {
    assert.equal(agac(bicimle(kaynak, "\n")), agac(kaynak));
  });
}

test("DIL-1.4: --> satırları gövde derinliğinde hizalanır", () => {
  const daginik = 'Adım( kod: A ) {\n--> EKR-X\n      --> DRM-Y\n}';
  const bicimli = bicimle(daginik, "\n");
  assert.equal(bicimli, 'Adım( kod: A ) {\n  --> EKR-X\n  --> DRM-Y\n}');
  assert.equal(agac(bicimli), agac(daginik));
});

test("DIL-1.3: çok-satırlı parantezli ifade — girinti derinleşir, anlam korunur", () => {
  const daginik = 'Ekran( kod: E,\nrozet: (a + 5) *\n2,\ngörünür: x.y >= 18 ve değil z )';
  const bicimli = bicimle(daginik, "\n");
  assert.equal(agac(bicimli), agac(daginik));
  assert.equal(bicimle(bicimli, "\n"), bicimli); // idempotent
});

test("DIL-1.3: #anahtar ve işleçler string/yorum korumasını bozmaz", () => {
  const kaynak = 'Metin( kod: M, değer: #a.b, not: "içinde { --> ve == var" ) // yorum: (((';
  const bicimli = bicimle(kaynak, "\n");
  assert.equal(bicimli, kaynak);           // zaten temiz → 0 değişiklik
  assert.equal(agac(bicimli), agac(kaynak));
});

test("DIL-2: -->| bloğu içine biçimlendirici HİÇ dokunmaz (şekil + boş satır + girinti)", () => {
  const kaynak = 'Blok( kod: BLK-A ) { }\n\n-->|\n<desenler>\n\n  |a⟩ = [3, 1]^T   ┌──┐\n\n    girintili şekil │  │\n</desenler>\n|<--\nÇıkarım( kod: CKR-B, kaynak: "k" ) { ne: "n" }';
  const bicimli = bicimle(kaynak, "\n");
  assert.ok(bicimli.includes("  |a⟩ = [3, 1]^T   ┌──┐\n\n    girintili şekil │  │")); // içerik aynen
  assert.equal(agac(bicimli), agac(kaynak));
  assert.equal(bicimle(bicimli, "\n"), bicimli); // idempotent
});

test("DIL-2: blok içindeki [ ] { } sonraki satırların derinliğini BOZMAZ", () => {
  const kaynak = '-->|\nşekil: [[[ {{{ açık kalanlar\n|<--\nBlok( kod: BLK-D ) {\nFaz( kod: KAT-E ) { }\n}';
  const bicimli = bicimle(kaynak, "\n");
  assert.ok(bicimli.includes("\n  Faz( kod: KAT-E ) { }")); // 1 kat girinti — şekil sayaca girmedi
  assert.equal(agac(bicimli), agac(kaynak));
});

test("DIL-2 regresyonu: 100 sütunu aşan virgüllü belge satırı sığdırma geçişinde parçalanmaz", () => {
  const promql = "              expr: histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, instance))";
  const kaynak = `-->|\n\`\`\`yaml\n${promql}\n\`\`\`\n|<--\nAdım( kod: ADM-PROM, ne: "belgeyi koru" )`;
  const bicimli = bicimle(kaynak, "\n");
  assert.ok(promql.length > 100, "fikstür satır-sığdırma sınırını gerçekten aşmalı");
  assert.ok(bicimli.includes(promql), `uzun belge satırı bayt-birebir korunmadı:\n${bicimli}`);
  assert.equal(bicimli.split("\n").filter((s) => s.includes("expr:")).length, 1,
    "virgüllü PromQL satırı birden çok Sarmal parametresi gibi parçalanmış");
});

// ── EKL-F4-A02 · Emoji-koruma güvencesi ─────────────────────────────────────
// Anlatı emoji taşıyabilir ve taşıdığı emoji İÇERİKTİR; belirteç + biçimlendirici onu
// BOZAMAZ. Zorlu adaylar: ZWJ ailesi, bayrak (regional pair), ten tonu, VS16.
const EMOJILI = `-->|
  # 🎯 Başlık 👨‍👩‍👧‍👦 aile
  <desenler> 🇹🇷 bayrak · 👍🏽 tonlu · ✳️ vs16 </desenler>
|<--
Katman( kod: K-EMOJI, ne: "🎯 hedef 🌀 sarmal 🍎 meyve" ) {
  Adım( kod: A-EMOJI, durum: geliştirmede, ne: "📦 kutu 👨‍👩‍👧‍👦 ve 🇹🇷" )
}
`;

test("emoji-koruma: biçimlendirici hiçbir emojiyi bozamaz (bayt-birebir)", () => {
  const bicimli = bicimle(EMOJILI, "\n");
  for (const e of ["🎯", "👨‍👩‍👧‍👦", "🇹🇷", "👍🏽", "✳️", "🌀", "🍎", "📦"])
    assert.ok(bicimli.includes(e), `emoji kayboldu/bozuldu: ${e}`);
  assert.equal(bicimle(bicimli, "\n"), bicimli, "emojili kaynakta idempotens bozuldu");
});

test("emoji-koruma: belirteç emojili kaynağın anlamını korur", () => {
  assert.equal(agac(EMOJILI), agac(bicimle(EMOJILI, "\n")));
});

// ── EKL-F4-A01 · Uzun-niyet katlayıcısı (saf) ──────────────────────────────
import { uzunNiyetiKatla } from "../src/katla.ts";

test("katla: 110+ sütunluk niyet üç-tırnağa sarılır ve anlam korunur", () => {
  const uzun = '  ne: "' + "sarmal niyet cümlesi tekrar ede ede uzar gider ".repeat(4).trim() + '",';
  const k = uzunNiyetiKatla(uzun)!;
  assert.ok(k && k[0].endsWith('ne: """') && k[k.length - 1].trim().startsWith('"""'));
  // katlanmış hali gerçek bir .sar içinde motordan geçmeli
  const kaynak = "Katman( kod: KTL ) {\n  Adım( kod: KTL-A,\n" + k.map((x) => "  " + x).join("\n") + "\n  )\n}";
  const dugum = ayristir(belirtecle(kaynak));
  assert.ok(agaciYaz(dugum).includes("sarmal niyet"));
});

test("katla: kısa satır, kaçışlı ve yorumlu satır DOKUNULMAZ (null)", () => {
  assert.equal(uzunNiyetiKatla('  ne: "kısa",'), null);
  assert.equal(uzunNiyetiKatla('  ne: "' + "x".repeat(120) + '\\" kaçışlı",'), null);
  assert.equal(uzunNiyetiKatla('  ne: "' + "uzun kelime ".repeat(12) + '", // yorum'), null);
});

// ── EKL-F4-A05 · Tablo hizalayıcı ───────────────────────────────────────────
import { tabloHizala } from "../src/katla.ts";

test("tabloHizala: dağınık tablo sütun-nizami olur ve idempotenttir", () => {
  const kirli = ["  | Ad | Ne |", "  |---|-----|", "  | 🎯 amaç | uzun açıklama |", "  | k | x |"];
  const h = tabloHizala(kirli)!;
  assert.ok(h && h.every((s) => s.trimEnd().endsWith("|")));
  const genislikler = h.map((s) => [...s].length);   // kod-noktası cetveli (emoji 1 sayılır)
  assert.ok(genislikler.every((g) => g === genislikler[0]), "tüm satırlar eşit genişlikte olmalı");
  assert.equal(tabloHizala(h), null, "nizami tabloya ikinci öneri çıkmaz (idempotens)");
});

test("tabloHizala: tablo olmayan satırlar null", () => {
  assert.equal(tabloHizala(["merhaba", "| x |"]), null);
});

test("uzunNiyetiKatla: tek-satır imza (Adım( kod: X, ne: ... )) da katlanır — F5 güçlendirmesi", () => {
  const satir = `      Adım( kod: ORN-A1, ne: "🚂 ${"upuzun niyet cümlesi ".repeat(7)}sonu" )`;
  const k = uzunNiyetiKatla(satir)!;
  assert.ok(k, "tek-satır imza tanınmalı");
  assert.ok(k[0].trimEnd().endsWith(","), "öntakı virgülle kendi satırında biter");
  assert.ok(k[1].includes('ne: """'), "niyet üç-tırnağa açılır");
  assert.ok(k[k.length - 1].includes('"""'), "kapanış üç-tırnak + kuyruk");
});

// ── İki-nokta hizalama (vitrin turu VIT-K77-A04) ──────────────────────────────
test("iki-nokta hizalama: aynı girintideki ardışık parametreler tek sütunda başlar", () => {
  const kaynak = [
    'Felsefe( kod: FEL-T,',
    'ad: "kısa",',
    'tez: "uzun anahtar hizası",',
    'ne: "orta" )',
  ].join("\n");
  const cikti = bicimle(kaynak, "\n");
  const satirlar = cikti.split("\n");
  const degerSutunlari = satirlar
    .filter((s) => /^\s*(ad|tez|ne):/.test(s))
    .map((s) => s.indexOf('"'));
  assert.equal(new Set(degerSutunlari).size, 1,
    "değerler tek sütunda başlamalı; sütunlar: " + degerSutunlari.join(",") + "\n" + cikti);
});

test("iki-nokta hizalama: idempotent + üç-tırnak içi ve belge bloğu DOKUNULMAZ", () => {
  const kaynak = [
    'Adım( kod: ADM-T, durum: beklemede,',
    'görev: "işi yap",',
    'sınır: "buradan öte yok",',
    'ne: """',
    '   içerik:   aynen    kalmalı',
    '""" )',
  ].join("\n");
  const bir = bicimle(kaynak, "\n");
  const iki = bicimle(bir, "\n");
  assert.equal(bir, iki, "idempotent olmalı");
  assert.ok(bir.includes("   içerik:   aynen    kalmalı"), "üç-tırnak içi birebir korunmalı");
});

test("üç-tırnak kapanışı + dengesiz parantez: derinlik sonraki kardeşe SIZMAZ", () => {
  const kaynak = [
    "Blok( kod: BLK-X, ad: \"test\" ) {",
    "Katman( kod: KAT-X, ad: \"test\" ) {",
    "Adım( kod: ADM-X,",
    "koşu: \"\"\"",
    "çok satırlı kapanış notu",
    "\"\"\" )",
    "Adım( kod: ADM-Y, ne: \"kardeş adım aynı girintide kalmalı\" )",
    "}",
    "}",
  ].join("\n");
  const bir = bicimle(kaynak, "\n");
  const iki = bicimle(bir, "\n");
  assert.equal(bir, iki, "idempotent olmalı");
  const satirlar = bir.split("\n");
  const admX = satirlar.findIndex((s) => s.includes("kod: ADM-X"));
  const admY = satirlar.findIndex((s) => s.includes("kod: ADM-Y"));
  const girintiX = satirlar[admX].match(/^\s*/)?.[0].length ?? -1;
  const girintiY = satirlar[admY].match(/^\s*/)?.[0].length ?? -1;
  assert.equal(girintiY, girintiX,
    `ADM-Y (${girintiY}) ADM-X (${girintiX}) ile aynı girintide olmalı — üç-tırnak kapanışındaki ')' derinliği kaçırılmışsa kalıcı kayma oluşur\n${bir}`);
});

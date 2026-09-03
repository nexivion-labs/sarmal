// ═══════════════════════════════════════════════════════════════════════════
// prizma.test.ts — 🔺 Prizma projektörü sınamaları (FEL-5 · tek kaynak → dört yüz)
//
//   Güvenceler: yalınla (kod ayıklama · param+özellik birleşimi · liste · çocuk) ·
//   JSON geçerli + parse-back · YAML blok-skalar/liste/tırnak · XML kod-niteliği +
//   liste SARMALAYICISI (regresyon: çıplak <öğe> hatası) + CDATA belge ·
//   ÇAPRAZ-YÜZ DEĞİŞMEZİ: üç yüz de aynı ağaçtan → aynı kod/değer (drift imkânsız).
// ═══════════════════════════════════════════════════════════════════════════

import { test } from "node:test";
import assert from "node:assert/strict";
import { belirtecle } from "../src/belirtec.ts";
import { ayristir } from "../src/ayristirici.ts";
import { yalınla, jsonYüz, yamlYüz, xmlYüz, type YalınDüğüm } from "../src/prizma.ts";

// Söz-dizim-geçerli örnek: kod + params + liste + gövde-özelliği + çocuk.
const ÖRNEK = `Blok( kod: BLK-X, ne: "başlık: özel", besler: [ HDF-1, HDF-2 ] ) {
  durum: geliştirmede
  Adım( kod: ADM-1, ne: "çocuk" )
}`;

function yalın() {
  return yalınla(ayristir(belirtecle(ÖRNEK)));
}

test("yalınla: kod öne çıkar, param+özellik birleşir, çocuk özyineli", () => {
  const n = yalın() as YalınDüğüm & { alanlar: Record<string, unknown>; çocuklar: YalınDüğüm[] };
  assert.equal(n.tip, "Blok");
  assert.equal(n.kod, "BLK-X");                       // kod alanlardan ayıklandı
  assert.equal(n.alanlar.ne, "başlık: özel");
  assert.deepEqual(n.alanlar.besler, ["HDF-1", "HDF-2"]); // liste → dizi
  assert.equal(n.alanlar.durum, "geliştirmede");      // gövde özelliği de alanlarda
  assert.equal(n.çocuklar[0].kod, "ADM-1");           // çocuk düğüm
  assert.equal(n.çocuklar[0].tip, "Adım");
});

test("JSON yüzü: geçerli + parse-back ağaçla birebir", () => {
  const j = JSON.parse(jsonYüz(ÖRNEK));
  assert.equal(j.tip, "Blok");
  assert.equal(j.kod, "BLK-X");
  assert.deepEqual(j.alanlar.besler, ["HDF-1", "HDF-2"]);
  assert.equal(j.çocuklar[0].kod, "ADM-1");
});

test("YAML yüzü: kök tip anahtarı · liste `- ` · özel-karakterli dizgi tırnaklı", () => {
  const y = yamlYüz(ÖRNEK);
  assert.match(y, /^Blok:/m);                    // kök = tip
  assert.match(y, /kod: BLK-X/);
  assert.match(y, /besler:\n {2,}- HDF-1\n {2,}- HDF-2/); // liste öğeleri
  assert.match(y, /ne: "başlık: özel"/);         // ':' içeren dizgi tırnaklanır (YAML güvenliği)
});

test("YAML yüzü: çocuk düğüm KANONİK liste-öğesi (regresyon: '-      Tip' kayması)", () => {
  const y = yamlYüz(ÖRNEK);
  assert.match(y, /çocuklar:\n {2}- Adım:\n {6}kod: ADM-1/); // tire hemen tipin yanında, iç 6-hizalı
  assert.ok(!/- {2,}Adım/.test(y));                          // tireden sonra fazla boşluk YOK
});

test("YAML yüzü: çok-satırlı belge literal blok-skalar (|) olur", () => {
  const kaynak = `-->|\n  satır bir\n  satır iki\n|<--\nBlok( kod: B )`;
  const y = yamlYüz(kaynak);
  assert.match(y, /belge: \|/);                  // blok-skalar göstergesi
  assert.match(y, /satır bir/);
  assert.match(y, /satır iki/);
});

test("XML yüzü: kod niteliği + liste SARMALAYICISI (çıplak <öğe> regresyonu)", () => {
  const x = xmlYüz(ÖRNEK);
  assert.match(x, /<Blok kod="BLK-X">/);         // kimlik = nitelik
  assert.match(x, /<besler>\s*<öğe>HDF-1<\/öğe>\s*<öğe>HDF-2<\/öğe>\s*<\/besler>/); // alan adı sarmalar
  assert.ok(!/^\s*<öğe>HDF-1/m.test(x.replace(/<besler>[\s\S]*?<\/besler>/, ""))); // çıplak öğe YOK
  assert.match(x, /<Adım kod="ADM-1">/);         // çocuk = iç-içe eleman (ağaç izomorfizmi)
});

test("XML yüzü: çok-satırlı belge CDATA'ya sarılır (kaçış cehennemi yok)", () => {
  const kaynak = `-->|\n  <ok> & "tırnak" satırı\n  ikinci satır\n|<--\nBlok( kod: B )`;
  const x = xmlYüz(kaynak);
  assert.match(x, /<belge><!\[CDATA\[/);
  assert.match(x, /<ok> & "tırnak" satırı/);     // CDATA içinde AYNEN (kaçışsız)
});

test("XML yüzü: belgede ']]>' CDATA'yı KIRMAZ (bölünmüş-kaçış regresyonu)", () => {
  const x = xmlYüz(`-->|\n  içinde ]]> var\n  iki satır\n|<--\nBlok( kod: B, ne: "t" )`);
  assert.match(x, /\]\]\]\]><!\[CDATA\[>/);                 // bölünmüş kaçış üretildi
  // bağımsız sağlama yerine yapısal: CDATA açılış sayısı ≥ 2 (bölünme gerçekleşti)
  assert.ok((x.match(/<!\[CDATA\[/g) ?? []).length >= 2);
});

test("YAML yüzü: sayı/bool-görünümlü dizgi TIRNAKLANIR (tip-drifti regresyonu)", () => {
  const y = yamlYüz(`Blok( kod: B, ne: "007", sürüm: "1.0", açık: "true" )`);
  assert.match(y, /ne: "007"/);                             // sayı-görünümlü → tırnaklı
  assert.match(y, /sürüm: "1\.0"/);
  assert.match(y, /açık: "true"/);                          // bool-görünümlü → tırnaklı
});

test("ÇAPRAZ-YÜZ DEĞİŞMEZİ: üç yüz de aynı kaynaktan → aynı kimlik/değer (drift imkânsız)", () => {
  const j = jsonYüz(ÖRNEK), y = yamlYüz(ÖRNEK), x = xmlYüz(ÖRNEK);
  // kod: her üç yüzde de var
  assert.ok(j.includes('"BLK-X"') && y.includes("BLK-X") && x.includes('"BLK-X"'));
  // besler değeri: her üç yüzde de HDF-2 taşınır
  assert.ok(j.includes("HDF-2") && y.includes("HDF-2") && x.includes("HDF-2"));
  // çocuk kimliği: her üç yüzde de ADM-1
  assert.ok(j.includes("ADM-1") && y.includes("ADM-1") && x.includes("ADM-1"));
});

test("Prizma smoke: söz-dizim hatası kaynağı fırlatır (çağıran yakalar)", () => {
  assert.throws(() => jsonYüz("Blok( kod: B"));   // kapanmamış paren
});

// ── A11/E4: tırnaklı kod: "X" da kimliktir (kodIndeksle ile tutarlı) ──────────
test("A11/E4: tırnaklı kod değeri JSON yüzünde kimlik (kod alanı) olarak çıkar", () => {
  const j = JSON.parse(jsonYüz('Karar( kod: "KRR-TIRNAK", karar: "t", gerekçe: "t", ne: "tırnaklı kimlik" )'));
  assert.equal(j.kod, "KRR-TIRNAK");
  assert.equal(j.alanlar.kod, undefined, "kimlik alanlara düşmemeli");
});

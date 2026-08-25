// Belirteçleyici sınamaları (node:test).
import { test } from "node:test";
import assert from "node:assert/strict";
import { belirtecle, SozDizimHatasi } from "../src/belirtec.ts";

test("çağır bildirimi belirteçlenir", () => {
  const b = belirtecle("çağır FLUTTER");
  assert.equal(b[0].tur, "ad");
  assert.equal(b[0].deger, "çağır");
  assert.equal(b[1].tur, "ad");
  assert.equal(b[1].deger, "FLUTTER");
  assert.equal(b[2].tur, "dosyaSonu");
});

test("KOD içindeki tire tek ad sayılır", () => {
  const b = belirtecle("BLK-KIMLIK");
  assert.equal(b[0].tur, "ad");
  assert.equal(b[0].deger, "BLK-KIMLIK");
});

test("Türkçe harfli ad tek belirteç olur", () => {
  const b = belirtecle("GirişEkranı");
  assert.equal(b[0].deger, "GirişEkranı");
  assert.equal(b.length, 2); // ad + dosyaSonu
});

test("dizgi tırnak-içi çözülür", () => {
  const b = belirtecle('"#14B8A6"');
  assert.equal(b[0].tur, "metin");
  assert.equal(b[0].deger, "#14B8A6");
});

test("yorum atlanır ve konum korunur", () => {
  const b = belirtecle("// yorum\nMetin");
  assert.equal(b[0].deger, "Metin");
  assert.equal(b[0].satir, 2);
});

test("blok yorum atlanır (satır-içi)", () => {
  const b = belirtecle('[ "a" /* not */, "b" ]');
  const turler = b.slice(0, -1).map((x) => x.tur);
  assert.deepEqual(turler, ["köşeAç", "metin", "virgül", "metin", "köşeKapa"]);
});

test("çok-satırlı blok yorum atlanır ve konum korunur", () => {
  const b = belirtecle("A /* satır1\nsatır2 */ B");
  assert.equal(b[0].deger, "A");
  assert.equal(b[1].deger, "B");
  assert.equal(b[1].satir, 2);
});

test("kapanmamış blok yorum hata verir", () => {
  assert.throws(() => belirtecle("/* açık"), SozDizimHatasi);
});

test("imler doğru tiplenir", () => {
  const b = belirtecle("({[:,]})");
  const turler = b.slice(0, -1).map((x) => x.tur);
  assert.deepEqual(turler, [
    "parenAç", "süsAç", "köşeAç", "ikiNokta", "virgül", "köşeKapa", "süsKapa", "parenKapa",
  ]);
});

test("kapanmamış dizgi hata verir", () => {
  assert.throws(() => belirtecle('"açık'), SozDizimHatasi);
});

// ── Karar D (v1 göçü · GOC-SPEC-A05): kimlik dilbilgisi noktalı madde kodunu kabul eder ──
// Kural: nokta yalnız ardından rakam gelirse ve en çok iki derinlik yutulur.

test("noktalı madde kodu tek ad sayılır (Karar D)", () => {
  for (const kod of ["MIM-1.5", "STR-2.1", "YUZ-3.3", "TIP-2.5", "YAS-4.1"]) {
    const b = belirtecle(kod);
    assert.equal(b[0].tur, "ad");
    assert.equal(b[0].deger, kod);
    assert.equal(b.length, 2); // ad + dosyaSonu
  }
});

test("nokta derinliği en çok iki — MIM-1.5.2.7 tek kod sayılmaz (Karar D)", () => {
  const b = belirtecle("MIM-1.5.2.7");
  assert.equal(b[0].deger, "MIM-1.5.2"); // üçüncü nokta yutulmaz
  assert.equal(b[1].tur, "nokta");       // kalan .7 ayrı belirteçlere düşer
});

test("alan erişimi noktadan bölünmeye devam eder (Karar D güvenliği)", () => {
  const b = belirtecle("düğüm.alan");
  assert.equal(b[0].deger, "düğüm");
  assert.equal(b[1].tur, "nokta");
  assert.equal(b[2].deger, "alan");
});

test("cümle sonu noktası koda yapışmaz (Karar D güvenliği)", () => {
  const b = belirtecle("STR-2. Sonra");
  assert.equal(b[0].deger, "STR-2");
  assert.equal(b[1].tur, "nokta");
  assert.equal(b[2].deger, "Sonra");
});

test("sürüm numarası sayı belirteci kalır (Karar D güvenliği)", () => {
  const b = belirtecle("0.9.7");
  assert.equal(b[0].tur, "sayı");
  assert.equal(b[0].deger, "0.9.7");
});

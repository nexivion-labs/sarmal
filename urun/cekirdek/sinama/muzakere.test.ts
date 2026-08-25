// muzakere.test.ts — 🗣️ SEF-L3-A30/A31/A32: debate · recovery · çok-Etmen.
import { test } from "node:test";
import assert from "node:assert/strict";
import { muzakereEt, kurtar, basitKurtarma, cokEtmenÜret, type Hakem } from "../src/muzakere.ts";

const bulgu = { mesaj: "test kapsamı düşük", kanıt: "a.ts:12" };

test("A30 debate: itiraz-haklı hüküm → bulgu düşer; turlar denetçi→üretici→hakem izini taşır", () => {
  const savun = () => ({ iddia: "kapsam yeterli, uç senaryolar ayrı Adım'da", kanıt: "b.test.ts:3" });
  const hakem: Hakem = () => "itiraz-haklı";
  const s = muzakereEt(bulgu, savun, hakem);
  assert.equal(s.hüküm, "itiraz-haklı");
  assert.equal(s.turlar[0].taraf, "denetçi");
  assert.ok(s.turlar.some((t) => t.taraf === "üretici") && s.turlar.some((t) => t.taraf === "hakem"));
});

test("A30 debate: savunma yok → bulgu-geçerli; aynı-iddia tekrarı döngü kilidi", () => {
  assert.equal(muzakereEt(bulgu, () => undefined, () => "itiraz-haklı").hüküm, "bulgu-geçerli");
  let n = 0;
  const kısır = () => { n++; return { iddia: "hep aynı sav" }; };   // hakem hep reddediyor
  const s = muzakereEt(bulgu, kısır, () => "bulgu-geçerli", 5);
  assert.equal(s.hüküm, "bulgu-geçerli");
  assert.ok(n <= 2, "aynı-iddia tekrarı sonsuz dönmez (döngü kilidi)");
});

test("A31 recovery: basit strateji yeniden-dene→böl→eskale; böl ÖNERİ üretir, eskale Hatırlatıcı", () => {
  assert.equal(basitKurtarma("ADM-X", 1, []), "yeniden-dene");
  assert.equal(basitKurtarma("ADM-X", 2, []), "böl");
  assert.equal(basitKurtarma("ADM-X", 3, []), "eskale");
  const böl = kurtar("ADM-X", 2, [bulgu, { mesaj: "ikinci sorun" }]);
  assert.equal(böl.yol, "böl");
  assert.equal(böl.bölmeÖnerisi?.length, 2, "böl yalnız ÖNERİ üretir (YUZ-1.2: yazmaz)");
  const esk = kurtar("ADM-X", 3, [bulgu]);
  assert.equal(esk.yol, "eskale");
  assert.ok(esk.hatırlatıcı?.includes("ADM-X"));
});

test("A32 çok-Etmen: paylar sıralı, üretilenDosyalar birleşir (dedupe), tek-Etmen birebir", () => {
  const çok = cokEtmenÜret(
    [{ kod: "ETM-API", ad: "api" }, { kod: "ETM-TEST", ad: "test" }],
    (e) => e.kod === "ETM-API"
      ? { üretilenDosyalar: ["api.ts", "ortak.ts"], testSonucu: "kaldı — test yok" }
      : { üretilenDosyalar: ["api.test.ts", "ortak.ts"], testSonucu: "geçti — kapsam tam" });
  assert.equal(çok.çokEtmen, true);
  assert.equal((çok.paylar as unknown[]).length, 2);
  assert.deepEqual([...(çok.üretilenDosyalar as string[])].sort(), ["api.test.ts", "api.ts", "ortak.ts"]);
  assert.equal(çok.testSonucu, "geçti — kapsam tam", "son pay bütünü doğrular");
  const tek = cokEtmenÜret([{ kod: "ETM-SOLO", ad: "solo" }], () => ({ üretilenDosyalar: ["x.ts"], testSonucu: "geçti" }));
  assert.equal(tek.çokEtmen, false);
  assert.deepEqual(tek.üretilenDosyalar, ["x.ts"]);
});

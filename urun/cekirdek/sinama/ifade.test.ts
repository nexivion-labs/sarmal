// DIL-1.3 (ifade dili) + DIL-1.4 (--> akış şekeri) sınamaları.
import { test } from "node:test";
import assert from "node:assert/strict";
import { belirtecle, SozDizimHatasi } from "../src/belirtec.ts";
import { ayristir } from "../src/ayristirici.ts";
import type { Deger } from "../src/sozdizim.ts";

const deger = (kaynak: string): Deger =>
  ayristir(belirtecle(`Ekran( kod: E, x: ${kaynak} )`)).bildirimler[0].parametreler[1].deger;

test("geriye-uyum: tek atomlar eskisi gibi ayrışır (ifade sarmalanmaz)", () => {
  assert.equal(deger('"metin"').tur, "metin");
  assert.equal(deger("42").tur, "sayı");
  assert.equal(deger("ADM-GIRIS").tur, "kod");
  assert.equal(deger("[ A, B ]").tur, "liste");
  assert.equal(deger("{ a: 1 }").tur, "harita");
  assert.equal(deger("Yasa( kod: Y )").tur, "widget");
});

test("#anahtar: i18n sözlük anahtarı tek değer olarak ayrışır", () => {
  const d = deger("#giris.başlık");
  assert.equal(d.tur, "anahtar");
  assert.equal(d.metin, "giris.başlık");
});

test("nokta-erişimi: kullanıcı.ad tek erişim değeri olur", () => {
  const d = deger("kullanıcı.adres.il");
  assert.equal(d.tur, "erişim");
  assert.equal(d.metin, "kullanıcı.adres.il");
});

test("aritmetik öncelik: a + b * c → +(a, *(b,c))", () => {
  const d = deger("a + b * c");
  assert.equal(d.tur, "ifade");
  assert.equal(d.islem, "+");
  assert.equal(d.sol!.metin, "a");
  assert.equal(d.sag!.islem, "*");
});

test("parantez gruplama önceliği kırar: (a + b) * c", () => {
  const d = deger("(a + b) * c");
  assert.equal(d.islem, "*");
  assert.equal(d.sol!.islem, "+");
});

test("karşılaştırma + mantık: yaş >= 18 ve aktif", () => {
  const d = deger("kullanıcı.yaş >= 18 ve kullanıcı.aktif");
  assert.equal(d.islem, "ve");
  assert.equal(d.sol!.islem, ">=");
  assert.equal(d.sol!.sol!.tur, "erişim");
  assert.equal(d.sag!.tur, "erişim");
});

test("değil tekli işleci: değil kilitli veya yönetici", () => {
  const d = deger("değil kilitli veya yönetici");
  assert.equal(d.islem, "veya");
  assert.equal(d.sol!.islem, "değil");
  assert.equal(d.sol!.sol, undefined);
  assert.equal(d.sol!.sag!.metin, "kilitli");
});

test("çıkarma boşluk ister; tireli ad KOD birleşimi kalır", () => {
  assert.equal(deger("puan - 10").islem, "-");
  assert.equal(deger("BLK-KIMLIK").tur, "kod"); // tire yutulur — DIL-1.2 KOD
});

test('tek "=" Türkçe hatayla reddedilir (== önerisi)', () => {
  assert.throws(() => belirtecle("x = 1"), (e: any) =>
    e instanceof SozDizimHatasi && /==/.test(e.message));
});

test("--> akış şekeri: gövdede besler özelliğine açılır (DIL-1.4)", () => {
  const p = ayristir(belirtecle('Adım( kod: A ) {\n  --> ADM-GIRIS\n  --> ADM-JETON\n}'));
  const o = p.bildirimler[0].ozellikler;
  assert.equal(o.length, 2);
  assert.ok(o.every((x) => x.ad === "besler" && x.deger.tur === "kod"));
  assert.deepEqual(o.map((x) => x.deger.metin), ["ADM-GIRIS", "ADM-JETON"]);
});

test("liste/harita İÇİNDE ifade de çalışır", () => {
  const d = deger("[ a + 1, #s.b ]");
  assert.equal(d.ogeler![0].islem, "+");
  assert.equal(d.ogeler![1].tur, "anahtar");
});

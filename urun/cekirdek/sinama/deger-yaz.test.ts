// deger-yaz.test.ts — 🔏 EKL-F9-A09: quote-güvenli değer yazıcı güvenceleri.
//   Latent bug senaryosu: tırnaklı değeri uzunluk-splice'la değiştirmek yarım tırnak
//   bırakıyordu — artık tırnak sınırları otomatik kapsanır ya da null (dokunma).

import { test } from "node:test";
import assert from "node:assert/strict";
import { ciplakGuvenli, degerBicimle, satirdaDegerDegistir } from "../src/deger-yaz.ts";

test("ciplakGuvenli: Türkçe kimlik/enum çıplak — boşluk/tırnak/virgül değil", () => {
  assert.ok(ciplakGuvenli("tamamlandı"));
  assert.ok(ciplakGuvenli("HALKA-SENK-A05"));
  assert.ok(!ciplakGuvenli("iki kelime"));
  assert.ok(!ciplakGuvenli('tır"naklı'));
  assert.ok(!ciplakGuvenli("a,b"));
});

test("degerBicimle: gerekirse tırnaklar, iç tırnağı '→ çevirir, satır kırığını · yapar", () => {
  assert.equal(degerBicimle("geliştirmede"), "geliştirmede");                 // çıplak kalır
  assert.equal(degerBicimle("çok güzel iş"), '"çok güzel iş"');               // tırnaklanır
  assert.equal(degerBicimle('o "harika" dedi'), `"o 'harika' dedi"`);         // iç tırnak güvenli
  assert.equal(degerBicimle("satır1\nsatır2"), '"satır1 · satır2"');          // tek-satır garantisi
});

test("çıplak → çıplak değişim (bugünkü durum: akışı)", () => {
  //                     1-tabanlı sutun: 'beklemede' b=22. sütun
  const satir = "      Adım( kod: X, durum: beklemede, ne: \"n\" )";
  const sutun = satir.indexOf("beklemede") + 1;
  const yeni = satirdaDegerDegistir(satir, sutun, "beklemede".length, "geliştirmede");
  assert.equal(yeni, "      Adım( kod: X, durum: geliştirmede, ne: \"n\" )");
});

test("TIRNAKLI değer — sutun tırnaktaysa: yarım tırnak KALMAZ (latent bug kapandı)", () => {
  const satir = '      takdir: "eski not", durum: beklemede';
  const sutun = satir.indexOf('"eski not"') + 1;              // tırnağın kendisi
  const yeni = satirdaDegerDegistir(satir, sutun, "eski not".length, "yeni harika not");
  assert.equal(yeni, '      takdir: "yeni harika not", durum: beklemede');
});

test("TIRNAKLI değer — sutun içerikteyse de iki tırnak birden kapsanır", () => {
  const satir = '      takdir: "eski not", durum: beklemede';
  const sutun = satir.indexOf("eski not") + 1;                // içeriğin başı
  const yeni = satirdaDegerDegistir(satir, sutun, "eski not".length, "yeni");
  assert.equal(yeni, "      takdir: yeni, durum: beklemede"); // yeni değer çıplak-güvenli → tırnak düşer
});

test("kapanmamış tırnak → null (fail-safe: DOKUNMA, bozma)", () => {
  const satir = '      takdir: "yarım kalan';
  const sutun = satir.indexOf('"') + 1;
  assert.equal(satirdaDegerDegistir(satir, sutun, 5, "x"), null);
});

test("uzunluk satıra sığmıyorsa → null (bayat konum bozamaz)", () => {
  assert.equal(satirdaDegerDegistir("kisa: a", 7, 99, "x"), null);
});

// ═══════════════════════════════════════════════════════════════════════════
// durum.test.ts — 🚦 durumTuret kanonik tanım sınamaları (YUZ-4.1 · RF-T1-A01)
//
//   Teftiş bulgusunun kapanış kanıtı: "bitti" türetmesi artık TEK tanım —
//   bloklu ve durumsuz Adım HER ZAMAN açık iştir; bloklu-içerir bayrağı
//   kapsayıcıya buradan çıkar; renk evresi geliştirmedeyi "sürüyor" sayar.
// ═══════════════════════════════════════════════════════════════════════════
import { test } from "node:test";
import assert from "node:assert/strict";
import { belirtecle } from "../src/belirtec.ts";
import { ayristir } from "../src/ayristirici.ts";
import { durumTuret, kapsayiciEvre, adimDurumlariTopla, adimDurumu } from "../src/durum.ts";

test("durumTuret: bloklu ve durumsuz Adım açık iştir — asla bitti sayılmaz", () => {
  const t = durumTuret(["tamamlandı", "bloklu", undefined]);
  assert.equal(t.tamam, 1);
  assert.equal(t.toplam, 3);
  assert.equal(t.bloklu, 1);
  assert.equal(t.acikIs, true);
  assert.equal(t.bitti, false);
});

test("durumTuret: tümü tamamlandı → bitti; boş küme bitti DEĞİL", () => {
  assert.equal(durumTuret(["tamamlandı", "tamamlandı"]).bitti, true);
  assert.equal(durumTuret([]).bitti, false);
  assert.equal(durumTuret([]).acikIs, false);
});

test("kapsayiciEvre: geliştirmede çocuk kapsayıcıyı 'sürüyor' yapar (tamam 0 olsa da)", () => {
  assert.equal(kapsayiciEvre(durumTuret(["geliştirmede", "beklemede"])), "sürüyor");
  assert.equal(kapsayiciEvre(durumTuret(["beklemede", "bloklu"])), "bekliyor");
  assert.equal(kapsayiciEvre(durumTuret(["tamamlandı"])), "bitti");
});

test("adimDurumlariTopla + adimDurumu: AST'den durumlar — gövde-özelliği yazımı da okunur", () => {
  const kaynak = `Blok( kod: BLK-T, ne: "test" ) {
  Katman( kod: KAT-T, ne: "k" ) {
    Adım( kod: A1, durum: tamamlandı, ne: "bitti iş" )
    Adım( kod: A2, ne: "gövde-durumlu" ) {
      durum: bloklu
    }
    Adım( kod: A3, ne: "durumsuz iş" )
  }
}`;
  const program = ayristir(belirtecle(kaynak));
  const blok = program.bildirimler[0];
  const durumlar = adimDurumlariTopla(blok);
  assert.deepEqual(durumlar, ["tamamlandı", "bloklu", undefined]);
  const t = durumTuret(durumlar);
  assert.equal(t.bloklu, 1, "bloklu-içerir bayrağı: bloklu çocuk sayılmalı");
  assert.equal(t.acikIs, true);
  const a1 = blok.cocuklar[0].cocuklar[0];
  assert.equal(adimDurumu(a1), "tamamlandı");
});

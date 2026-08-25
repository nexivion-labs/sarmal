// ═══════════════════════════════════════════════════════════════════════════
// onay-kuyrugu.test.ts — 📬 Onay kapısı saf çekirdeği sınamaları (VS Code'suz)
//
//   NTK-A08 kapanış kanıtı: kapı tanıma kuralının üç koşulu (durum açık +
//   Founder-onay imzalı ölçüt + onay: yok) fikstürler üzerinde doğrulanır;
//   karar yazım noktası (durumSatir/durumSutun) gidiş-dönüş kanıtlıdır —
//   `, onay: "…"` o noktaya eklenince kapı gerçekten kapanır (0.9.76 sessiz-
//   kayıp yasağının saf karşılığı). Koşum: cd eklenti && npm test
// ═══════════════════════════════════════════════════════════════════════════

import { test } from "node:test";
import assert from "node:assert/strict";
import { belirtecle } from "../../cekirdek/src/belirtec.ts";
import { ayristir } from "../../cekirdek/src/ayristirici.ts";
import { onayKapilariTopla, ONAY_DESENI } from "../src/onay-cekirdek.ts";

const kapilar = (kaynak: string) => onayKapilariTopla(ayristir(belirtecle(kaynak)).bildirimler);

/** Tam-zincirli fikstür kalıbı — Adım gövdesi parametreyle beslenir. */
const zincir = (adim: string): string =>
  `Faz( kod: F1, ad: "deneme dönemi" ) {\n` +
  `  Blok( kod: B1, ad: "deneme işi" ) {\n` +
  `    Katman( kod: KT1, ad: "deneme teknolojisi" ) {\n` +
  `      ${adim}\n` +
  `    }\n` +
  `  }\n` +
  `}\n`;

const ONAYLI_OLCUT = `"Tasarım Founder tarafından onaylanmıştır — onaysız uygulanmaz"`;

test("kapı tanıma: beklemede + Founder-onay ölçütü + onay yok → kapı VAR", () => {
  const k = kapilar(zincir(
    `Adım( kod: A1, durum: beklemede, ne: "🧪 Deneme amacı", kabul: [ ${ONAYLI_OLCUT} ] )`));
  assert.equal(k.length, 1);
  assert.equal(k[0].kod, "A1");
  assert.equal(k[0].ne, "🧪 Deneme amacı");
  assert.match(k[0].olcut, /Founder tarafından onaylanmıştır/u);
});

test("kapı tanıma: geliştirmede durumundaki Adım da kuyruğa girer", () => {
  const k = kapilar(zincir(
    `Adım( kod: A2, durum: geliştirmede, kabul: [ ${ONAYLI_OLCUT} ] )`));
  assert.equal(k.length, 1);
  assert.equal(k[0].kod, "A2");
});

test("kapı tanıma: onay: kaydı yazılmış kapı kuyruğa GİRMEZ (karar verilmiştir)", () => {
  const k = kapilar(zincir(
    `Adım( kod: A3, durum: beklemede, onay: "onaylandı — 2026-07-17", kabul: [ ${ONAYLI_OLCUT} ] )`));
  assert.equal(k.length, 0);
});

test("kapı tanıma: tamamlandı durumundaki Adım kuyruğa girmez", () => {
  const k = kapilar(zincir(
    `Adım( kod: A4, durum: tamamlandı, kabul: [ ${ONAYLI_OLCUT} ] )`));
  assert.equal(k.length, 0);
});

test("kapı tanıma: Founder-onay imzası taşımayan kabul kapı açmaz", () => {
  const k = kapilar(zincir(
    `Adım( kod: A5, durum: beklemede, kabul: [ "Süit ve denetim tam geçmektedir" ] )`));
  assert.equal(k.length, 0);
});

test("kapı tanıma: durumsuz Adım kapı açmaz (açıklık beyanı şarttır)", () => {
  const k = kapilar(zincir(
    `Adım( kod: A6, kabul: [ ${ONAYLI_OLCUT} ] )`));
  assert.equal(k.length, 0);
});

test("imza deseni: büyük/küçük harf ve ara sözcükler tanınır", () => {
  assert.match("Founder onayından geçti", ONAY_DESENI);
  assert.match("founder tarafından onaylanmıştır", ONAY_DESENI);
  assert.doesNotMatch("Süit tam geçmektedir", ONAY_DESENI);
});

test("derin ağaç: kapı, Faz›Blok›Katman zincirinin dibinde de bulunur ve satır 0-tabanlıdır", () => {
  const kaynak = zincir(
    `Adım( kod: A7, durum: beklemede, kabul: [ ${ONAYLI_OLCUT} ] )`);
  const k = kapilar(kaynak);
  assert.equal(k.length, 1);
  // Adım fikstürde 4. satırdadır (1-tabanlı) → 0-tabanlı 3.
  assert.equal(k[0].satir, 3);
  assert.match(kaynak.split("\n")[k[0].satir], /kod: A7/u);
});

test("gidiş-dönüş kanıtı: onay kaydı yazım noktasına eklenince kapı KAPANIR", () => {
  const kaynak = zincir(
    `Adım( kod: A8, durum: beklemede, ne: "🧪 Karar bekleyen iş", kabul: [ ${ONAYLI_OLCUT} ] )`);
  const [kapi] = kapilar(kaynak);
  assert.ok(kapi, "kapı önce açık olmalı");
  // kaydiIsle'nin yaptığı ekleme birebir: durum değerinin sonuna `, onay: "…"`.
  const satirlar = kaynak.split("\n");
  const s = satirlar[kapi.durumSatir];
  satirlar[kapi.durumSatir] =
    s.slice(0, kapi.durumSutun) + `, onay: "onaylandı — 2026-07-18"` + s.slice(kapi.durumSutun);
  const yeni = satirlar.join("\n");
  // Ekleme geçerli sözdizimidir ve kapıyı kapatır — sessiz kayıp yok.
  assert.equal(kapilar(yeni).length, 0);
  // Ekleme durum değerinin HEMEN ardına düşmüştür (başka alanı bozmaz).
  assert.match(yeni, /durum: beklemede, onay: "onaylandı — 2026-07-18",/u);
});

test("kırpma: uzun amaç 320, uzun ölçüt 160 karakterde kırpılır", () => {
  const uzunNe = "Ç".repeat(400);
  const uzunOlcut = "Founder onayından geçen " + "ç".repeat(200);
  const k = kapilar(zincir(
    `Adım( kod: A9, durum: beklemede, ne: "${uzunNe}", kabul: [ "${uzunOlcut}" ] )`));
  assert.equal(k.length, 1);
  assert.equal(k[0].ne.length, 321);        // 320 + "…"
  assert.ok(k[0].ne.endsWith("…"));
  assert.equal(k[0].olcut.length, 161);     // 160 + "…"
  assert.ok(k[0].olcut.endsWith("…"));
});

test("çoklu kapı: aynı belgede birden çok açık kapı ayrı ayrı listelenir", () => {
  const k = kapilar(zincir(
    `Adım( kod: C1, durum: beklemede, kabul: [ ${ONAYLI_OLCUT} ] )\n` +
    `      Adım( kod: C2, durum: geliştirmede, kabul: [ ${ONAYLI_OLCUT} ] )\n` +
    `      Adım( kod: C3, durum: tamamlandı, kabul: [ ${ONAYLI_OLCUT} ] )`));
  assert.deepEqual(k.map((x) => x.kod), ["C1", "C2"]);
});

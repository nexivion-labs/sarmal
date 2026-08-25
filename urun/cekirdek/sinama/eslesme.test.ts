// ═══════════════════════════════════════════════════════════════════════════
// eslesme.test.ts — 🎯 RAY3-ESL-A01 · EŞLEYİCİ NÖBETLERİ
//
//   Adımın beş kabul maddesi burada tek tek ölçülür: determinizm, ağırlıkların
//   gövdeye gömülü olmaması, gerekçesiz elemenin imkânsızlığı, boş aday
//   kümesinde aday uydurulmaması ve sınırın korunması.
//
//   NÖBETLER ÇIKTIYI ÖLÇER, METİN AVLAMAZ: eşleyici gerçek fikstürlerle
//   koşturulur ve dönen nesne incelenir. Tek istisna sınır nöbetidir; o da
//   kaynağı okur, çünkü ölçtüğü şey davranış değil ilanın kendisidir.
// ═══════════════════════════════════════════════════════════════════════════
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { etmenEşle, VARSAYILAN_ESLEME, BOYUTLAR, type AdayProfil } from "../src/eslesme.ts";

/** Üç aday: biri her boyutta güçlü, biri orta, biri eşiğin altında kalacak kadar zayıf. */
const ADAYLAR: AdayProfil[] = [
  { etmen: "ETM-USTA",   alan: 0.9, dil: 0.9, başarı: 0.9, hız: 0.8, hata: 0.05 },
  { etmen: "ETM-ORTA",   alan: 0.7, dil: 0.6, başarı: 0.6, hız: 0.5, hata: 0.20 },
  { etmen: "ETM-ZAYIF",  alan: 0.2, dil: 0.2, başarı: 0.1, hız: 0.3, hata: 0.80 },
];

// ── ① DETERMİNİZM ───────────────────────────────────────────────────────────

test("ESL: aynı girdi iki koşuda BİREBİR aynı çıktıyı verir", () => {
  const bir = etmenEşle("ADM-X", ADAYLAR);
  const iki = etmenEşle("ADM-X", ADAYLAR);
  assert.deepEqual(bir, iki,
    "eşleyici deterministik değil — yeniden üretilemeyen bir sıralama savunulamaz ve denetlenemez");
  assert.deepEqual(bir.sıralı.map((s) => s.etmen), ["ETM-USTA", "ETM-ORTA"],
    "sıralama beklenen düzende değil; güçlü aday öne geçmeli");
});

test("ESL: eşit skorlu adaylar alfabetik sıralanır — kararsız sıra determinizmi bozar", () => {
  const eşit: AdayProfil[] = [
    { etmen: "ETM-ZEBRA", alan: 0.8, dil: 0.8, başarı: 0.8, hız: 0.8, hata: 0.1 },
    { etmen: "ETM-ADANA", alan: 0.8, dil: 0.8, başarı: 0.8, hız: 0.8, hata: 0.1 },
  ];
  const s = etmenEşle("ADM-X", eşit).sıralı;
  assert.equal(s[0].skor, s[1].skor, "fikstür bozulmuş: iki aday eşit skorlu olmalı");
  assert.deepEqual(s.map((x) => x.etmen), ["ETM-ADANA", "ETM-ZEBRA"],
    "eşitlikte alfabetik sıra uygulanmıyor — girdi sırası değişince çıktı da değişir");
});

// ── ② AĞIRLIK VE EŞİK GÖVDEYE GÖMÜLÜ DEĞİLDİR ──────────────────────────────

test("ESL: enjekte edilen yapılandırma sonucu GERÇEKTEN değiştirir", () => {
  // Alan boyutunu tek başına belirleyici yaparsak sıra alan uyumuna göre kurulur.
  const yalnızAlan = {
    ağırlıklar: { alan: 1, dil: 0, başarı: 0, hız: 0, hata: 0 },
    eşik: 0.5,
  };
  const s = etmenEşle("ADM-X", ADAYLAR, yalnızAlan);
  assert.deepEqual(s.sıralı.map((x) => x.etmen), ["ETM-USTA", "ETM-ORTA"]);
  assert.equal(s.sıralı[0].skor, 0.9, "ağırlık enjeksiyonu skoru etkilemiyor — değerler gövdeye gömülü olabilir");
  assert.deepEqual(s.elenen.map((x) => x.etmen), ["ETM-ZAYIF"]);
});

test("ESL: yapılandırma verilmezse varsayılan devreye girer", () => {
  const varsayılansız = etmenEşle("ADM-X", ADAYLAR);
  const açıkça = etmenEşle("ADM-X", ADAYLAR, VARSAYILAN_ESLEME);
  assert.deepEqual(varsayılansız, açıkça, "varsayılan yapılandırma devreye girmiyor");
});

// ── ③ GEREKÇESİZ ELEME ÜRETİLEMEZ ──────────────────────────────────────────

test("ESL: elenen her adayın gerekçesi vardır ve eşiği adıyla anar", () => {
  const s = etmenEşle("ADM-X", ADAYLAR);
  assert.ok(s.elenen.length > 0, "fikstür bozulmuş: en az bir aday elenmeliydi");
  for (const e of s.elenen) {
    assert.ok(e.gerekçe.trim().length > 0, `${e.etmen} gerekçesiz elendi — gerekçesiz eleme denetlenemez`);
    assert.match(e.gerekçe, /eşik/, `${e.etmen} gerekçesi eşiği anmıyor — okuyucu neden elendiğini bilemez`);
    for (const b of BOYUTLAR)
      assert.match(e.gerekçe, new RegExp(`${b}=`), `${e.etmen} gerekçesi "${b}" boyutunun katkısını göstermiyor`);
  }
});

test("ESL: seçilen adayların da skor dökümü okunur — kara kutu sıralama yok", () => {
  for (const s of etmenEşle("ADM-X", ADAYLAR).sıralı) {
    const toplam = BOYUTLAR.reduce((t, b) => t + s.katkılar[b], 0);
    assert.ok(Math.abs(toplam - s.skor) < 0.005,
      `${s.etmen}: boyut katkılarının toplamı skoru vermiyor — döküm skoru açıklamıyor`);
  }
});

// ── ④ BOŞ KÜME: ADAY UYDURULMAZ ────────────────────────────────────────────

test("ESL: aday kümesi boşken işlev aday UYDURMAZ ve sebebini döner", () => {
  const s = etmenEşle("ADM-X", []);
  assert.deepEqual(s.sıralı, [], "boş kümeden aday üretilmiş");
  assert.ok(s.sebep && /aday uydurmaz/i.test(s.sebep),
    "boş sonucun sebebi yazılmamış — çağıran neden boş döndüğünü bilemez");
});

test("ESL: adayların tamamı eşiğin altındaysa sonuç boştur ve sebebi yazılıdır", () => {
  const s = etmenEşle("ADM-X", ADAYLAR, { ağırlıklar: VARSAYILAN_ESLEME.ağırlıklar, eşik: 0.99 });
  assert.deepEqual(s.sıralı, [], "eşiğin üstünde olmayan aday seçilmiş");
  assert.equal(s.elenen.length, ADAYLAR.length, "elenen adaylar kaydı eksik");
  assert.ok(s.sebep && s.sebep.includes("0.99"), "sebep, uygulanan eşiği anmıyor");
});

// ── ⑤ SINIR: MEKANİZMA AÇIK, DEĞERLER ENJEKTE (STR-3.1) ────────────────────

test("ESL/STR-3.1: ağırlık ve eşik değerleri işlev GÖVDESİNE gömülü değildir", () => {
  const kaynak = readFileSync(fileURLToPath(new URL("../src/eslesme.ts", import.meta.url)), "utf8");
  const gövde = kaynak.slice(kaynak.indexOf("export function etmenEşle"));
  // Gövdede hiçbir ondalık sabit bulunmamalı; tek istisna yuvarlama çarpanıdır ve
  // o da ayrı bir yardımcıda yaşar, gövdede değil.
  const sabitler = [...gövde.matchAll(/\b0\.\d+\b/g)].map((m) => m[0]);
  assert.deepEqual(sabitler, [],
    `eşleyici gövdesinde gömülü sayısal politika var: ${sabitler.join(" · ")} — ayarlanmış değer enjekte edilmelidir (STR-3.1)`);
  assert.ok(/VARSAYILAN_ESLEME/.test(gövde),
    "varsayılan yapılandırma parametre olarak bağlanmamış");
});

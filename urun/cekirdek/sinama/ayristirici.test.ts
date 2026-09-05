// Ayrıştırıcı sınamaları (node:test) — gerçek örnek dosya üzerinde.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { belirtecle, SozDizimHatasi } from "../src/belirtec.ts";
import { ayristir } from "../src/ayristirici.ts";

const ornekYol = fileURLToPath(new URL("../../../ogreti/ornek/gercek/blok_kimlik.sar", import.meta.url));
const ornek = () => ayristir(belirtecle(readFileSync(ornekYol, "utf8")));

test("örnek dosyanın bildirimleri sayılır ve tiplenir", () => {
  const program = ornek();
  // 2 çağır + 1 Tip + 1 Blok + 1 Karar + 1 Göç (A02 meyve ilanı 2026-07-11)
  assert.equal(program.bildirimler.length, 6);
  assert.deepEqual(
    program.bildirimler.map((d) => d.tur),
    ["çağır", "çağır", "tipTanım", "widget", "widget", "widget"],
  );
});

test("çağır düğümleri KOD'u taşır", () => {
  const program = ornek();
  assert.equal(program.bildirimler[0].ad, "FLUTTER");
  assert.equal(program.bildirimler[1].ad, "FASTAPI");
});

test("Tip tanımı gövdeden ne: özelliğini alır", () => {
  const tip = ornek().bildirimler.find((d) => d.tur === "tipTanım")!;
  assert.equal(tip.ad, "GirişEkranı");
  const ne = tip.ozellikler.find((o) => o.ad === "ne");
  assert.equal(ne?.deger.metin, "Kimlik girişi için özel yüzey tipi");
  const icerir = tip.parametreler.find((p) => p.ad === "içerir");
  assert.equal(icerir?.deger.tur, "liste");
  assert.equal(icerir?.deger.ogeler?.length, 2);
});

test("Faz › Blok › Katman › AltKatman › Adım ağacı iç içe çözülür (tam-zincir · MIM-1 · MIM-1.5)", () => {
  const faz = ornek().bildirimler.find((d) => d.ad === "Faz")!;
  assert.equal(faz.ad, "Faz");   // tam-zincir kök: Faz Blok'u sarar (rütbe-atlama kalktı)
  const blok = faz.cocuklar.find((d) => d.ad === "Blok")!;
  assert.equal(blok.cocuklar.length, 3); // üç Katman = teknoloji dalı (önyüz/arkayüz/güvenlik)
  const onyuz = blok.cocuklar[0];
  assert.equal(onyuz.ad, "Katman");
  const arkayuz = blok.cocuklar[1];
  // MIM-1.7 (Founder hükmü 2026-08-28): arkayüz Katmanı altındaki iki kodlama
  // kademesi TEK kademede birleşti. Örnek eskiden "servisler" ve "veritabani"
  // adlarıyla iki AltKatman taşıyordu ve ikisi de kodlama departmanındaydı;
  // hüküm aynı departmanın Katman içinde bir kez temsil edilmesini şart koşar,
  // konu ayrımı ise Adım kademesinde yapılır. Adımların hiçbiri kaybolmadı.
  assert.equal(arkayuz.cocuklar.length, 1); // arkayüz → tek kodlama kademesi
  const ekranlar = onyuz.cocuklar[0];
  assert.equal(ekranlar.cocuklar.length, 2); // ekranlar → iki Adım (giris/kayit)
  const adim = ekranlar.cocuklar[0];
  assert.equal(adim.ad, "Adım");
  const bagimli = adim.parametreler.find((p) => p.ad === "bağımlı");
  assert.equal(bagimli?.deger.metin, "FLUTTER");
});

test("Karar düğümü besler kenarını liste olarak taşır", () => {
  const karar = ornek().bildirimler.find((d) => d.ad === "Karar")!;
  const besler = karar.parametreler.find((p) => p.ad === "besler");
  assert.equal(besler?.deger.tur, "liste");
  assert.deepEqual(besler?.deger.ogeler?.map((o) => o.metin), ["ADM-GIRIS", "ADM-SERVIS", "ADM-JETON"]);
});

test("eksik parantez Türkçe söz dizim hatası verir", () => {
  assert.throws(() => ayristir(belirtecle("Blok kod: X )")), SozDizimHatasi);
});

test("harita değeri ayrıştırılır (DIL-1.3)", () => {
  const p = ayristir(belirtecle('X( raflar: { ÖZ: "oz/", YASA: "yasa/" } )'));
  const raflar = p.bildirimler[0].parametreler.find((x) => x.ad === "raflar")!;
  assert.equal(raflar.deger.tur, "harita");
  assert.equal(raflar.deger.ciftler?.length, 2);
  assert.equal(raflar.deger.ciftler?.[0].ad, "ÖZ");
  assert.equal(raflar.deger.ciftler?.[0].deger.metin, "oz/");
});

test("widget değeri ayrıştırılır (DIL-1.3 · Flutter kalbi)", () => {
  const p = ayristir(belirtecle('X( yasa: Yasa( kod: GK, trust: değişmez ) )'));
  const yasa = p.bildirimler[0].parametreler.find((x) => x.ad === "yasa")!;
  assert.equal(yasa.deger.tur, "widget");
  assert.equal(yasa.deger.dugum?.ad, "Yasa");
  assert.equal(yasa.deger.dugum?.parametreler.find((x) => x.ad === "kod")?.deger.metin, "GK");
});

// ── ORK-4 · ad alanlı kod değer olarak ayrıştırılır (KPS-ADA-A01) ────────────
//   Liste içindeki ad alanlı kodlar hata üretmez: belirteçleyici sözceyi tek ad
//   yaptığı için ayrıştırıcı onu bedelsiz olarak tek bir KOD değeri sayar.

test("ORK-4: ad alanlı kod tek KOD değeridir ve listede hata üretmez", () => {
  const p = ayristir(belirtecle(
    'Blok( kod: BLK-KOMSU-GOVDE, mevsim: PRJ-SARMAL::FAZ-2026-AGUSTOS, bağımlı: [ PRJ-SARMAL::ADM-BIR, ADM-IKI ] )'));
  const blok = p.bildirimler[0];
  const mevsim = blok.parametreler.find((x) => x.ad === "mevsim")!;
  assert.equal(mevsim.deger.tur, "kod");
  assert.equal(mevsim.deger.metin, "PRJ-SARMAL::FAZ-2026-AGUSTOS");
  const bagimli = blok.parametreler.find((x) => x.ad === "bağımlı")!;
  assert.deepEqual(bagimli.deger.ogeler?.map((o) => o.metin),
    ["PRJ-SARMAL::ADM-BIR", "ADM-IKI"]);
});

test("ORK-4: çağır hedefi ad alanlı yazılabilir", () => {
  const p = ayristir(belirtecle("çağır PRJ-KOMSU::BLK-KOMSU-GOVDE"));
  assert.equal(p.bildirimler[0].tur, "çağır");
  assert.equal(p.bildirimler[0].ad, "PRJ-KOMSU::BLK-KOMSU-GOVDE");
});

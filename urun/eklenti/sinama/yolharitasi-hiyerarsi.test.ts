// ═══════════════════════════════════════════════════════════════════════════
// yolharitasi-hiyerarsi.test.ts — 🪆 VARLIK KÜMESİ NÖBETİ (EKL-F7-A09)
//
//   Founder hükmü (2026-08-24): yol haritasında varlıklar birbirini kapsayan
//   kümeler gibi görünür. Bu nöbet o hükmün çekirdeğini korur: iç içe kökler
//   üst ve alt ilişkisine bağlanır, kök listesinde yalnız üstü olmayanlar
//   kalır ve bir dosyanın aktif varlığı iç içe köklerde EN DERİN kümedir.
//   Fikstür, kusurun sahada görüldüğü gerçek düzenin küçültülmüş eşidir:
//   depo kökünde iki eski varlık ile bir çatı ve çatının içinde bir proje.
// ═══════════════════════════════════════════════════════════════════════════
import { test } from "node:test";
import assert from "node:assert/strict";
import { varlikUstleri, enDerinVarlik, varlikSimgesi } from "../src/yolharitasi-cekirdek.ts";

const CATI = { kod: "CALISMA-ALANI", kokDizin: "/depo/Nexivion-Labs" };
const SARMAL_YENI = { kod: "PRJ-SARMAL", kokDizin: "/depo/Nexivion-Labs/sarmal" };
const SARMAL_ESKI = { kod: "ANA", kokDizin: "/depo/_Sarmal" };
const KAPALI = { kod: "KPLU", kokDizin: "/depo/_KapaliUrun" };
const HEPSI = [SARMAL_ESKI, KAPALI, CATI, SARMAL_YENI];

test("kapsanan varlık kapsayıcısına bağlanır, ayrık varlıklar köksüz kalır", () => {
  const ust = varlikUstleri(HEPSI);
  assert.equal(ust.get(SARMAL_YENI), CATI);
  assert.equal(ust.get(CATI), undefined);
  assert.equal(ust.get(SARMAL_ESKI), undefined);
  assert.equal(ust.get(KAPALI), undefined);
});

test("kök listesi yalnız üstü olmayanları taşır — kapsanan kökte görünmez", () => {
  const ust = varlikUstleri(HEPSI);
  const kokler = HEPSI.filter((v) => !ust.get(v)).map((v) => v.kod).sort();
  assert.deepEqual(kokler, ["ANA", "CALISMA-ALANI", "KPLU"]);
});

test("üç seviyeli kümede üst her zaman EN DERİN kapsayıcıdır, ara seviye atlanmaz", () => {
  const ORTA = { kod: "ORTA", kokDizin: "/depo/Nexivion-Labs/sarmal" };
  const DERIN = { kod: "DERIN", kokDizin: "/depo/Nexivion-Labs/sarmal/urun" };
  const ust = varlikUstleri([CATI, ORTA, DERIN]);
  assert.equal(ust.get(DERIN), ORTA);
  assert.equal(ust.get(ORTA), CATI);
});

test("ad benzerliği kapsama sayılmaz — önek sınırı klasör ayracıdır", () => {
  const BENZER = { kod: "BENZER", kokDizin: "/depo/Nexivion-Labs-arsiv" };
  const ust = varlikUstleri([CATI, BENZER]);
  assert.equal(ust.get(BENZER), undefined);
});

test("kapsayan çalışma alanı istasyon, kapsanan proje sefer simgesi taşır", () => {
  assert.equal(varlikSimgesi("ÇalışmaAlanı"), "istasyon");
  assert.equal(varlikSimgesi("Proje"), "sefer");
  assert.equal(varlikSimgesi("Uygulama"), "sefer");
  assert.notEqual(varlikSimgesi("ÇalışmaAlanı"), varlikSimgesi("Proje"));
});

test("aktif varlık çözümü iç içe köklerde en derin kümeyi seçer", () => {
  assert.equal(enDerinVarlik(HEPSI, "/depo/Nexivion-Labs/sarmal/yasa/kanon/dil.sar"), SARMAL_YENI);
  assert.equal(enDerinVarlik(HEPSI, "/depo/Nexivion-Labs/nexivion_labs_anadizin.sar"), CATI);
  assert.equal(enDerinVarlik(HEPSI, "/depo/_Sarmal/plan/yapi_gocu.sar"), SARMAL_ESKI);
  assert.equal(enDerinVarlik(HEPSI, "/depo/tanimsiz/dosya.sar"), undefined);
});

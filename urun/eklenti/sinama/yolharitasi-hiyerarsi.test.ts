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
import {
  varlikUstleri, enDerinVarlik, varlikSimgesi, kapsamIcinde,
} from "../src/yolharitasi-cekirdek.ts";

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

// ── 🔭 KAPSAM SÜZGECİ — çatı odaktayken alt projeler görünür ─────────────────
//   Founder canlı bulgusu 2026-08-27: çatı seçiliyken Hatırlatıcılar, Gözlemler
//   ve Fikirler boşalıyordu, çünkü süzgeç tam eşitlik yapıyordu. Nöbet kuralın
//   iki yönünü de ölçer: aşağı doğru kapsama açıktır, yukarı ve yana kapalıdır.

test("kapsamIcinde · odaktaki kökün kendisi görünür", () => {
  assert.equal(kapsamIcinde("/a/Nexivion-Labs/sarmal", "/a/Nexivion-Labs/sarmal"), true);
});

test("kapsamIcinde · çatı odaktayken altındaki proje görünür", () => {
  assert.equal(kapsamIcinde("/a/Nexivion-Labs/sarmal", "/a/Nexivion-Labs"), true);
  assert.equal(kapsamIcinde("/a/Nexivion-Labs/laboratuvar", "/a/Nexivion-Labs"), true);
});

test("kapsamIcinde · alt proje odaktayken çatının kendisi görünmez", () => {
  assert.equal(kapsamIcinde("/a/Nexivion-Labs", "/a/Nexivion-Labs/sarmal"), false);
});

test("kapsamIcinde · kardeş proje görünmez", () => {
  assert.equal(kapsamIcinde("/a/Nexivion-Labs/laboratuvar", "/a/Nexivion-Labs/sarmal"), false);
});

test("kapsamIcinde · ön ek benzerliği kapsama sayılmaz", () => {
  // Saf `startsWith` tuzağı: "sarmal-eski" adı "sarmal" ile başlar fakat onun
  // altında DEĞİLDİR. Ayırıcı sınırı olmadan bu dosya yanlışlıkla görünürdü.
  assert.equal(kapsamIcinde("/a/sarmal-eski", "/a/sarmal"), false);
});

test("kapsamIcinde · kökün kendisi kapsama dâhildir", () => {
  assert.equal(kapsamIcinde("/a/Nexivion-Labs/sarmal", "/a/Nexivion-Labs/sarmal"), true);
});

test("kapsamIcinde · sondaki ayırıcı ile ters bölü aynı kökü gösterir", () => {
  assert.equal(kapsamIcinde("/a/Nexivion-Labs/sarmal", "/a/Nexivion-Labs/"), true);
  assert.equal(kapsamIcinde("C:\\a\\Labs\\sarmal", "C:\\a\\Labs"), true);
  assert.equal(kapsamIcinde("C:\\a\\Labs", "C:\\a\\Labs\\sarmal"), false);
});

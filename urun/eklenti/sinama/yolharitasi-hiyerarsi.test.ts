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
  anadizinHaritasi, cagirCevrimi, ogeleriTopla, varlikCozucu, varliklariKur, type PlanOgesi,
} from "../src/yolharitasi-cekirdek.ts";
import { YOL_METINLERI } from "../src/yuzey-metinleri.ts";
import { ayristir } from "../../cekirdek/src/ayristirici.ts";
import { belirtecle } from "../../cekirdek/src/belirtec.ts";
import { mevsimNormalize } from "../../cekirdek/src/denetci.ts";
import type { Program } from "../../cekirdek/src/sozdizim.ts";

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

// ── 🧭 ÇAPRAZ PROJE BLOKU KENDİ PROJESİNDE KALIR (KPS-ADA-A01) ────────────────
//   Founder şerhi 2026-09-13: başka bir projenin Fazına ad alanıyla bağlanan
//   Blok panelde kendi projesinin altında durur, bağlandığı Faz ile o Fazın
//   projesi yanında not olarak gösterilir ve yabancı Fazın sayacı onu saymaz.
//   Kusur canlı pencerede görülmüştür: laboratuvarın Bulgu Kapatma Bloku
//   Sarmal'ın Çatı Mevsimi Fazının altında duruyor ve iki açık Adımı o Fazın
//   sayacına ekleniyordu.
//
//   Fikstür turun gerçek sırasını izler: kaynak → belirteç → ayrıştır → motorun
//   mevsim çevrimi → panelin öge toplaması → çağır çevrimi → varlık kurulumu.
//   Nöbet iki yönü ayrı ayrı ölçer: (a) çapraz bağ taşınmaz ve sayılmaz,
//   (b) aynı proje içindeki bağ eskisi gibi taşınır ve sayaç kabarcıklanır.
//
//   MUTASYON KANITI (2026-09-13). `cagirCevrimi` içindeki `caprazMi` hep yanlış
//   döndürüldüğünde, yani eski davranışa dönüldüğünde, yalnız (a) kırılır. Aynı
//   yüklem varlık karşılaştırmasını atlayıp her ad alanlı beyanı çapraz saydığında
//   ve ayrıca sayaçların Faza kabarcıklanması söküldüğünde yalnız (b) kırılır.

const CAPRAZ_KAYNAKLAR: Record<string, string> = {
  "/cati/sarmal/sarmal_anadizin.sar": 'Proje( kod: PRJ-SARMAL, ad: "Sarmal", rejim: katı )',
  "/cati/sarmal/is/plan/faz.sar": 'Faz( kod: FAZ-2026-AGUSTOS, ad: "Çatı Mevsimi" ) {\n  çağır BLK-CAGRILAN\n}',
  "/cati/sarmal/is/plan/blok.sar": [
    "Blok( kod: BLK-NITELIKSIZ, mevsim: FAZ-2026-AGUSTOS ) { Adım( kod: ADM-S1, durum: tamamlandı ) }",
    "Blok( kod: BLK-KENDI-ADALANI, mevsim: PRJ-SARMAL::FAZ-2026-AGUSTOS ) { Adım( kod: ADM-S2, durum: beklemede ) }",
    "Blok( kod: BLK-CAGRILAN ) { Adım( kod: ADM-S3, durum: beklemede ) }",
  ].join("\n"),
  "/cati/laboratuvar/laboratuvar_anadizin.sar": 'Proje( kod: PRJ-LABORATUVAR, ad: "Laboratuvar", rejim: katı )',
  "/cati/laboratuvar/plan/bulgu.sar": [
    'Blok( kod: BLK-LAB-BULGU, ad: "Bulgu Kapatma", mevsim: PRJ-SARMAL::FAZ-2026-AGUSTOS ) {',
    "  Adım( kod: ADM-L1, durum: beklemede )",
    "  Adım( kod: ADM-L2, durum: geliştirmede )",
    "}",
  ].join("\n"),
};

function caprazPaneliKur() {
  const programlar = new Map<string, Program>();
  for (const [yol, metin] of Object.entries(CAPRAZ_KAYNAKLAR)) programlar.set(yol, ayristir(belirtecle(metin)));
  // Tur mevsim çevrimini yayından önce koşturur; panel onun kurduğu kenarı okur.
  mevsimNormalize(programlar);
  const ogeler: PlanOgesi<string>[] = [];
  for (const [yol, program] of programlar) ogeler.push(...ogeleriTopla(program.bildirimler, yol));
  const anadizinler = anadizinHaritasi(programlar.keys());
  const coz = varlikCozucu(anadizinler, (anaSar) => programlar.get(anaSar));
  cagirCevrimi(ogeler, (o) => coz(o.dosya));
  const varliklar = varliklariKur(ogeler, anadizinler, coz, (yol) => yol);
  const sarmal = varliklar.get("/cati/sarmal");
  const lab = varliklar.get("/cati/laboratuvar");
  const faz = sarmal?.cocuklar.find((o) => o.kod === "FAZ-2026-AGUSTOS");
  assert.ok(sarmal && lab && faz, "fikstürün iki projesi ya da Fazı panelde kurulmadı; nöbet boşlukta ölçer");
  return { sarmal, lab, faz };
}

const kodlari = (liste: readonly PlanOgesi<string>[]): string[] => liste.map((o) => o.kod).sort();

test("çapraz proje (a): ad alanıyla başka projenin Fazına bağlanan Blok kendi projesinde kalır ve yabancı Fazın sayacına girmez", () => {
  const { sarmal, lab, faz } = caprazPaneliKur();
  // Motorun Faz bağı korunur: sanal kenar yabancı Fazın çağır listesinde durur.
  assert.ok(faz.cagirlar?.includes("BLK-LAB-BULGU"), "motorun ad alanlı Faz bağı panelin okuduğu ağaçta yok");
  assert.deepEqual(kodlari(lab.cocuklar), ["BLK-LAB-BULGU"], "Blok kendi projesinin altında durmuyor");
  assert.ok(!kodlari(faz.cocuklar).includes("BLK-LAB-BULGU"), "Blok yabancı projenin Fazının altına taşındı");
  assert.ok(!kodlari(sarmal.cocuklar).includes("BLK-LAB-BULGU"), "Blok yabancı projenin kökünde duruyor");
  assert.deepEqual([lab.toplam, lab.gelistirmede], [2, 1], "Blokun Adımları kendi projesinde sayılmıyor");
  // Fikstürde geliştirmedeki tek Adım laboratuvarındır; yabancı Faz onu sayarsa bu sayı bir olur.
  assert.equal(faz.gelistirmede, 0, "yabancı Fazın sayacı başka projenin açık Adımını sayıyor");
  const bag = lab.cocuklar[0].bagliFaz;
  assert.equal(bag?.faz, faz, "not bağlandığı Fazı göstermiyor");
  assert.deepEqual([bag?.proje.kod, bag?.proje.ad], ["PRJ-SARMAL", "Sarmal"], "not Fazın projesini göstermiyor");
});

test("çapraz proje (b): aynı projede niteliksiz mevsim, kendi ad alanı ya da çağır ile bağlanan Blok Fazın altına taşınır ve sayaç kabarcıklanır", () => {
  const { sarmal, faz } = caprazPaneliKur();
  const ayniProje = ["BLK-CAGRILAN", "BLK-KENDI-ADALANI", "BLK-NITELIKSIZ"];
  for (const kod of ayniProje) {
    assert.ok(kodlari(faz.cocuklar).includes(kod), `${kod} kendi projesinin Fazının altına taşınmadı`);
    assert.ok(!kodlari(sarmal.cocuklar).includes(kod), `${kod} Fazın yanında kök olarak kaldı`);
  }
  const toplam = (alan: "tamam" | "toplam" | "gelistirmede") => faz.cocuklar.reduce((t, c) => t + c[alan], 0);
  assert.ok(faz.toplam >= 3, "Fazın sayacı kendi projesinin Adımlarını kabarcıklandırmıyor");
  assert.deepEqual([faz.tamam, faz.toplam, faz.gelistirmede], [toplam("tamam"), toplam("toplam"), toplam("gelistirmede")],
    "Fazın sayacı altına taşınan Blokların sayaçlarının toplamına eşit değil");
  for (const b of faz.cocuklar) {
    if (ayniProje.includes(b.kod)) assert.equal(b.bagliFaz, undefined, `${b.kod} aynı projede olduğu hâlde çapraz not taşıyor`);
  }
});

test("çapraz proje notu: satırın yanındaki metin Fazın ve projesinin adını söyler", () => {
  assert.equal(YOL_METINLERI.caprazFaz("Çatı Mevsimi", "Sarmal"), "Sarmal projesinin Çatı Mevsimi Fazına bağlı");
  assert.match(YOL_METINLERI.caprazFazIpucu("Çatı Mevsimi", "Sarmal"), /sayacına katılmaz/);
});

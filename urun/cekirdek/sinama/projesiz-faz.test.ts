// ═══════════════════════════════════════════════════════════════════════════
// projesiz-faz.test.ts — 🛡️ KPS-FAZ-A02 · Projesiz Faz bekçisi (MIM-1.2)
//
//   KPS-FAZ-A01 Faz ile Proje arasındaki bağı plan dosyasının yaşadığı Proje
//   kökünden kurdu; fakat bağın KURULAMADIĞI hâl susuyordu. Founder hükmüyle
//   (2026-09-19) MIM-1.2 maddesi bu hâli bilgi düzeyinde bir gözlemle ilan etti
//   ve bekçi `projesiz-faz` doğdu. Bu nöbet dört şeyi kanıtlar: kök dışında
//   yaşayan bir Faz bekçiyi ateşler, kök altında yaşayan bir Faz ateşlemez,
//   ayrışık kökte sebep adıyla yazılır ve ders dünyası beyanlı muafiyetiyle
//   sessiz kalır. Klasör→Proje çözümü burada yeniden kurulmaz; bekçi grafın
//   kapsayan zincirini okur, dolayısıyla çevrim söküldüğünde bekçi kırmızıya
//   döner ve bu, kabul ölçütünün ta kendisidir.
//
//   MUTASYON KANITI (2026-09-19 · dördü elden koşuldu, her biri yedekten geri kondu):
//   ① dag.ts'deki proje çevrimi (`PLAN_KADEMELERI.has(node.ad) ? projeKoku(dosya)`)
//      `undefined` yapılırsa ikinci ve üçüncü sınama kırmızı yanar, çünkü kök
//      altındaki Faz da köksüz görünür ve bekçi onu bildirir; birinci sınama yeşil
//      kalır, çünkü kök dışı Faz zaten köksüzdü. Kabul ölçütünün "çevrim söküldüğünde
//      bekçi kırmızıya döner" cümlesi bu mutasyonla kanıtlanmıştır. ② üreticideki
//      `DERS_DUNYASI` süzgeci kaldırılırsa beşinci sınama kırmızı yanar. ③ sebep
//      çözümü daima "köksüz" döndürecek biçimde bozulursa altıncı sınama kırmızı
//      yanar. ④ üretici boş dizi döndürürse birinci, üçüncü ve altıncı sınama
//      kırmızı yanar. Nöbet dört mutasyonun dördünü görür.
//   DÜRÜST BEYAN: üreticideki Proje zinciri yürüyüşü yalnız doğrudan kapsayana
//   bakacak biçimde daraltıldığında dördüncü sınama YEŞİL kalmaktadır, çünkü
//   izinli sarmada Faz ile Proje arasında başka kademe yoktur ve iç içe yazılmış
//   Faz da doğrudan Projenin altındadır; yürüyüş savunmacıdır ve bozuk girdide
//   (Blok içine yazılmış Faz gibi izinsiz sarmada) anlam kazanır, bu nöbet onu
//   ölçmez.
// ═══════════════════════════════════════════════════════════════════════════
import { test } from "node:test";
import assert from "node:assert/strict";
import { belirtecle } from "../src/belirtec.ts";
import { ayristir } from "../src/ayristirici.ts";
import type { Program } from "../src/sozdizim.ts";
import { dagKur } from "../src/dag.ts";
import { projesizFazTanilari } from "../src/denetci.ts";
import { YENI_TANI_INDEKS } from "../src/tani-sicili.ts";

function progla(kaynaklar: Record<string, string>): Map<string, Program> {
  return new Map(Object.entries(kaynaklar).map(([dosya, k]) => [dosya, ayristir(belirtecle(k))]));
}

/** Tam zincirli bir plan gövdesi: Faz → Blok → Katman → AltKatman → Adım. */
const planGovdesi = (ek: string, teknoloji: string) => `
Faz( kod: FAZ-${ek}, ad: "${ek} Mevsimi", hedefTarih: "2026-09" ) {
  Blok( kod: BLK-${ek}, ne: "${ek} gövdesinin işi tam cümleyle yazılmıştır." ) {
    Katman( kod: KAT-${ek}, ad: "${ek} Katmanı", kullanır: ${teknoloji} ) {
      AltKatman( kod: ALT-${ek}, ad: "${ek} Alt Katmanı", departman: kodlama ) {
        Adım( kod: ADM-${ek}, durum: beklemede, ne: "${ek} işini yürütmek." )
      }
    }
  }
}`;

const PROJE_A = `Proje( kod: PRJ-A, ad: "A Projesi" ) { Teknoloji( kod: TEK-A, ad: "A tekniği" ) }`;

function bekci(kaynaklar: Record<string, string>) {
  const programlar = progla(kaynaklar);
  return projesizFazTanilari(dagKur(programlar), programlar);
}

test("KPS-FAZ-A02 · kök DIŞINDA yaşayan bir plan dosyasının Fazı bekçiyi ateşler; sebep köksüzdür, düzey bilgidir", () => {
  const t = bekci({
    "a/a_anadizin.sar": PROJE_A,
    "disarida/faz.sar": planGovdesi("DIS", "TEK-A"),
  });
  assert.equal(t.length, 1);
  assert.equal(t[0].dosya, "disarida/faz.sar");
  assert.equal(t[0].tani.kod, "projesiz-faz");
  assert.equal(t[0].tani.duzey, "bilgi", "gözlemdir; hiçbir kapıyı kırmızıya düşürmez");
  assert.match(t[0].tani.mesaj, /FAZ-DIS/);
  assert.match(t[0].tani.mesaj, /hiçbir Proje kökünün altında yaşamıyor/);
  assert.equal(t[0].tani.satir, 2, "konum Faz düğümünün kendisidir");
  assert.ok(t[0].tani.oneri?.includes("Proje kökünün altına taşı"), "öneri düzeltmeyi öğretir");
});

test("KPS-FAZ-A02 · kök ALTINDA yaşayan bir Faz bekçiyi ateşlemez — bağ klasörden kurulmuştur", () => {
  assert.equal(bekci({
    "a/a_anadizin.sar": PROJE_A,
    "a/is/plan/faz.sar": planGovdesi("A", "TEK-A"),
  }).length, 0);
});

test("KPS-FAZ-A02 · iki Projeli çalışma alanında yalnız köksüz Faz bildirilir; komşu Projeler susar", () => {
  const t = bekci({
    "a/a_anadizin.sar": PROJE_A,
    "a/is/plan/faz.sar": planGovdesi("A", "TEK-A"),
    "b/b_anadizin.sar": `Proje( kod: PRJ-B, ad: "B Projesi" ) { Teknoloji( kod: TEK-B, ad: "B tekniği" ) }`,
    "b/is/plan/faz.sar": planGovdesi("B", "TEK-B"),
    "disarida/faz.sar": planGovdesi("DIS", "TEK-A"),
  });
  assert.deepEqual(t.map((x) => x.dosya), ["disarida/faz.sar"]);
});

test("KPS-FAZ-A02 · iç içe yazım: Proje gövdesinin içinde yazılmış Faz Projelidir, kapsayan zinciri yürünür", () => {
  // Faz doğrudan Projenin altında değil, ÇalışmaAlanı → Proje → Faz zincirinde
  // yaşar; bekçi yalnız doğrudan kapsayana bakarsa bu Fazı köksüz sanır.
  assert.equal(bekci({
    "cal_anadizin.sar": `ÇalışmaAlanı( kod: CAL-X, ad: "Çatı" ) {
  Proje( kod: PRJ-IC, ad: "İç Proje" ) {
    Teknoloji( kod: TEK-IC, ad: "iç teknik" )
    ${planGovdesi("IC", "TEK-IC")}
  }
}`,
  }).length, 0);
});

test("KPS-FAZ-A02 · ders dünyası beyanlı muafiyetiyle sessiz kalır (OGR-5)", () => {
  // Bugünkü ağaçta on yedi köksüz plan düğümünün on yedisi de ders dünyasındadır
  // ve öğretim malzemesi bilinçle kök taşımadan yazılır; ürün hükmü oraya inmez.
  assert.equal(bekci({
    "a/a_anadizin.sar": PROJE_A,
    "a/ogreti/ornek/faz.sar": planGovdesi("ORNEK", "TEK-A"),
    "ogreti/sablon/faz.sar": planGovdesi("SABLON", "TEK-A"),
  }).length, 0);
});

test("KPS-FAZ-A02 · AYRIŞIK kök: aynı derinlikte iki ayrı Proje kodu varsa bağ kurulmaz ve sebep adıyla yazılır", () => {
  const t = bekci({
    "c/birinci_anadizin.sar": `Proje( kod: PRJ-BIR, ad: "Birinci" ) { Teknoloji( kod: TEK-C, ad: "C tekniği" ) }`,
    "c/ikinci_anadizin.sar": `Proje( kod: PRJ-IKI, ad: "İkinci" ) { Teknoloji( kod: TEK-D, ad: "D tekniği" ) }`,
    "c/is/plan/faz.sar": planGovdesi("C", "TEK-C"),
  });
  assert.equal(t.length, 1);
  assert.match(t[0].tani.mesaj, /birden çok Proje kodu kapsıyor/);
  assert.ok(t[0].tani.oneri?.includes("giriş ilanından birini kaldır"));
});

test("KPS-FAZ-A02 · üçlü senkron: sicil kaydı maddesine bağlıdır ve kanonun yazdığı düzeyde doğar", () => {
  const kayit = YENI_TANI_INDEKS.get("projesiz-faz");
  assert.ok(kayit, "tanı sicilde kayıtlı olmalı");
  assert.equal(kayit.madde, "MIM-1.2");
  assert.equal(kayit.kanonDüzey, "bilgi");
  assert.equal(kayit.kademe, "bilgi");
  assert.equal(kayit.kapsam, "proje");
});

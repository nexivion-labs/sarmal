// ═══════════════════════════════════════════════════════════════════════════
// proje-bulgu-ayrimi.test.ts — 🧭 KPS-AYR-A01 · Her Projenin Ayrı Ölçülmesi (YAS-3.3)
//
//   YAS-3.3 Problems gruplarının, grafın ve karnenin kimliğini fiziksel dizin
//   yolundan değil tekil Proje KODUNDAN türetmeyi emreder. Motor bunu yapmıyor,
//   yapmadığını da dürüstçe söylüyordu: iki projeli bir çatının kökünden koşulan
//   denetim `proje-tanı-kimliği-uyumsuz` hatası veriyordu. Ölçüm gerçek bir
//   çatıda yapılmıştır (2026-09-10): her proje KENDİ kökünden sıfır hata
//   verirken, aynı ağaç çatı kökünden denetlenince bir hata doğuyordu.
//
//   Nöbetler üç şeyi birlikte ölçer. Birincisi gruplamanın KURULDUĞUDUR: iki
//   projeli bir çatıda her bulgu kendi Proje kodunun hanesine düşer. İkincisi
//   hükmün hâlâ KIRMIZI YANABİLDİĞİDİR: gruplama düşerse ya da bir bulgu evsiz
//   kalırsa tanı yeniden doğar — kapatılan bir hükmün ölü bir dala dönüşmemesi
//   bunun ölçülmesine bağlıdır. Üçüncüsü tek projeli bir depoda HİÇBİR ŞEYİN
//   DEĞİŞMEDİĞİDİR: hane açılmaz ve tanı doğmaz.
// ═══════════════════════════════════════════════════════════════════════════

import { test } from "node:test";
import assert from "node:assert/strict";
import { belirtecle } from "../src/belirtec.ts";
import { ayristir } from "../src/ayristirici.ts";
import type { Program } from "../src/sozdizim.ts";
import { dagKur, projeKarneleri, projeSahibi } from "../src/dag.ts";
import { projeKapsamlari } from "../src/kimlik.ts";
import { orkestrasyonTanilari, projeGruplariKur } from "../src/denetim.ts";
import type { DenetimRapor } from "../src/denetim.ts";
import { taniSicili } from "../src/tani-sicili.ts";
import { siniflamaYukle } from "../src/siniflama.ts";
import { join } from "node:path";

function progla(kaynaklar: Record<string, string>): Map<string, Program> {
  return new Map(Object.entries(kaynaklar).map(([dosya, k]) => [dosya, ayristir(belirtecle(k))]));
}

const SNF = siniflamaYukle(join(import.meta.dirname, "../../../oz/siniflama/kayit.json"));
const SICIL = taniSicili(SNF);

/** İki bağımsız Proje kökü, her biri kendi planıyla; kodlar ÇAKIŞMAZ. */
function ikiProje(): Map<string, Program> {
  const plan = (ek: string, tek: string) => `
Faz( kod: FAZ-${ek}, ad: "${ek} Mevsimi", hedefTarih: "2026-09" ) {
  Blok( kod: BLK-${ek}, ne: "${ek} gövdesinin işi tam cümleyle yazılmıştır." ) {
    Katman( kod: KAT-${ek}, ad: "${ek} Katmanı", kullanır: ${tek} ) {
      AltKatman( kod: ALT-${ek}, ad: "${ek} Alt Katmanı", departman: motor ) {
        Adım( kod: ADM-${ek}, durum: beklemede, ne: "${ek} işini yürütmek." )
      }
    }
  }
}`;
  return progla({
    "cati_anadizin.sar": `ÇalışmaAlanı( kod: CAL-CATI, ad: "Çatı" ) {
      Kitaplık( kod: KTP-A, yol: "a/", ne: "A." ) Kitaplık( kod: KTP-B, yol: "b/", ne: "B." ) }`,
    "a/a_anadizin.sar": `Proje( kod: PRJ-A, ad: "A Projesi", rejim: katı ) { Teknoloji( kod: TEK-A, ad: "A tekniği" ) }`,
    "a/is/plan/faz.sar": plan("A", "TEK-A"),
    "b/b_anadizin.sar": `Proje( kod: PRJ-B, ad: "B Projesi", rejim: katı ) { Teknoloji( kod: TEK-B, ad: "B tekniği" ) }`,
    "b/is/plan/faz.sar": plan("B", "TEK-B"),
  });
}

/**
 * Bir bulgu satırı. İçeriği bilerek en sadedir ve `yeniTani` yerine düz nesneyle
 * kurulur: bu nöbetin ölçtüğü şey tanının METNİ değil, bulgunun hangi Proje
 * hanesine düştüğüdür. Kimlik yine de sicilde GERÇEKTEN bulunan bir koddur,
 * çünkü aynı işlev tanı sözleşmesini de denetler ve uydurma bir kimlik ölçümü
 * ilgisiz bir tanıyla kirletirdi.
 */
const rapor = (dosya: string, adet = 1): DenetimRapor => ({
  dosya,
  tanilar: Array.from({ length: adet }, () => ({
    duzey: "bilgi" as const, kod: "terfi-kanıtı-eksik", satir: 1, sutun: 1,
    mesaj: "Ölçüm bulgusu — bu nöbet metni değil, bulgunun hangi Proje hanesine düştüğünü ölçer.",
    oneri: 'Örnek: `Kural <ad>( kod: <KOD>, uygulama: <tanı>, doğrulama: <sınama>, kabul: <onay> )` yaz.',
  })),
});

// ── ① Gruplama KURULDU ───────────────────────────────────────────────────────

test("KPS-AYR-A01 · bulgunun evi dizin yolundan değil Proje kodundan türer", () => {
  const kapsamlar = projeKapsamlari(ikiProje());
  assert.equal(projeSahibi("a/is/plan/faz.sar", kapsamlar), "PRJ-A");
  assert.equal(projeSahibi("b/is/plan/faz.sar", kapsamlar), "PRJ-B");
  // Çatının kendi ilanı hiçbir Projenin malı değildir; ona sahip aramak
  // kimlikleri birleştirmek olurdu (MIM-1.1).
  assert.equal(projeSahibi("cati_anadizin.sar", kapsamlar), undefined);
});

test("KPS-AYR-A01 · her projenin bulguları KENDİ hanesinde toplanır ve haneler birleşmez", () => {
  const kapsamlar = projeKapsamlari(ikiProje());
  const akis = [rapor("a/is/plan/faz.sar", 3), rapor("b/is/plan/faz.sar", 2), rapor("cati_anadizin.sar", 1)];
  const gruplar = new Map<string, string>();
  for (const r of akis) { const k = projeSahibi(r.dosya, kapsamlar); if (k) gruplar.set(r.dosya, k); }
  const karneler = projeKarneleri(dagKur(ikiProje()), kapsamlar);
  const tablo = projeGruplariKur(akis, gruplar, karneler);

  assert.deepEqual(tablo.map((g) => g.kod), ["PRJ-A", "PRJ-B", ""]);
  assert.equal(tablo[0].bilgi, 3);
  assert.equal(tablo[1].bilgi, 2);
  // Çatının kendi hanesi kodsuzdur ve KAYBOLMAZ: hane toplamı akışın toplamına
  // eşittir, çünkü tabloda eksilen bir bulgu tablonun kendisini güvenilmez kılar.
  assert.equal(tablo[2].catininKendisi, true);
  assert.equal(tablo.reduce((t, g) => t + g.hata + g.uyari + g.bilgi, 0), 6);
});

test("KPS-AYR-A01 · karne çatı düzeyinde tek sayı basmaz; her Proje kendi karnesini taşır", () => {
  const programlar = ikiProje();
  const karneler = projeKarneleri(dagKur(programlar), projeKapsamlari(programlar));
  assert.deepEqual(karneler.map((k) => k.kod), ["PRJ-A", "PRJ-B"]);
  assert.deepEqual(karneler.map((k) => k.ad), ["A Projesi", "B Projesi"]);
  // Her projenin kendi Adımı kendi hanesindedir; ikisi tek bir sayıda birleşmez.
  assert.deepEqual(karneler.map((k) => k.adim), [1, 1]);
  assert.deepEqual(karneler.map((k) => k.durumlar["beklemede"]), [1, 1]);
});

test("KPS-AYR-A01 · gruplama TAM olduğunda proje-tanı-kimliği-uyumsuz tanısı DOĞMAZ", () => {
  const kapsamlar = projeKapsamlari(ikiProje());
  const akis = [rapor("a/is/plan/faz.sar"), rapor("b/is/plan/faz.sar")];
  const gruplar = new Map(akis.map((r) => [r.dosya, projeSahibi(r.dosya, kapsamlar)!]));
  const cikan = orkestrasyonTanilari({
    uretilen: akis.flatMap((r) => r.tanilar.map((t) => ({ dosya: r.dosya, tani: t }))),
    projeKapisi: [], projeKodlari: new Set(["PRJ-A", "PRJ-B"]),
    bulguGruplari: gruplar, atlananKapilar: [], sicil: SICIL, anaEtiket: "cati_anadizin.sar",
  });
  assert.deepEqual(cikan.filter((c) => c.tani.kod === "proje-tanı-kimliği-uyumsuz"), []);
});

// ── ② Hüküm HÂLÂ kırmızı yanabilir — kapanan hüküm ölü dala dönmez ───────────

test("KPS-AYR-A01 · gruplama HİÇ yapılmazsa tanı yeniden doğar", () => {
  const akis = [rapor("a/is/plan/faz.sar"), rapor("b/is/plan/faz.sar")];
  const cikan = orkestrasyonTanilari({
    uretilen: akis.flatMap((r) => r.tanilar.map((t) => ({ dosya: r.dosya, tani: t }))),
    projeKapisi: [], projeKodlari: new Set(["PRJ-A", "PRJ-B"]),
    atlananKapilar: [], sicil: SICIL, anaEtiket: "cati_anadizin.sar",
  });
  const bulgu = cikan.filter((c) => c.tani.kod === "proje-tanı-kimliği-uyumsuz");
  assert.equal(bulgu.length, 1);
  assert.match(bulgu[0].tani.mesaj, /tek bir dizin kimliği altında toplanıyor/);
});

test("KPS-AYR-A01 · bir bulgu EVSİZ kalırsa tanı doğar ve evsiz dosyayı adıyla söyler", () => {
  const kapsamlar = projeKapsamlari(ikiProje());
  const akis = [rapor("a/is/plan/faz.sar"), rapor("disarida/kayip.sar")];
  const gruplar = new Map<string, string>();
  for (const r of akis) { const k = projeSahibi(r.dosya, kapsamlar); if (k) gruplar.set(r.dosya, k); }
  const cikan = orkestrasyonTanilari({
    uretilen: akis.flatMap((r) => r.tanilar.map((t) => ({ dosya: r.dosya, tani: t }))),
    projeKapisi: [], projeKodlari: new Set(["PRJ-A", "PRJ-B"]),
    bulguGruplari: gruplar, atlananKapilar: [], sicil: SICIL, anaEtiket: "cati_anadizin.sar",
  });
  const bulgu = cikan.filter((c) => c.tani.kod === "proje-tanı-kimliği-uyumsuz");
  assert.equal(bulgu.length, 1);
  assert.match(bulgu[0].tani.mesaj, /disarida\/kayip\.sar/);
});

// ── ③ Tek projeli depoda hiçbir şey değişmez ────────────────────────────────

test("KPS-AYR-A01 · tek Projeli bir depoda hane AÇILMAZ ve tanı doğmaz", () => {
  const akis = [rapor("is/plan/faz.sar")];
  const cikan = orkestrasyonTanilari({
    uretilen: akis.flatMap((r) => r.tanilar.map((t) => ({ dosya: r.dosya, tani: t }))),
    projeKapisi: [], projeKodlari: new Set(["PRJ-TEK"]),
    atlananKapilar: [], sicil: SICIL, anaEtiket: "tek_anadizin.sar",
  });
  assert.deepEqual(cikan.filter((c) => c.tani.kod === "proje-tanı-kimliği-uyumsuz"), []);
  // Gruplama tablosu boşken tablo da boştur: kabuk hiçbir yeni satır basmaz ve
  // tek projeli çıktı bayt-bayt korunur.
  assert.deepEqual(projeGruplariKur(akis, new Map(), []), []);
});

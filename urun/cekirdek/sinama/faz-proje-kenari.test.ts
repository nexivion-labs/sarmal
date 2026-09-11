// ═══════════════════════════════════════════════════════════════════════════
// faz-proje-kenari.test.ts — 🌀 KPS-FAZ-A01 · Fazın Projeye Bağlanması (MIM-1.2)
//
//   MIM-1.2 hükmü Fazın Proje içindeki zaman dilimini kurduğunu hata düzeyinde
//   yazar; motor bu hükmün yalnız Blok ile Faz arasındaki yarısını zorluyor,
//   Faz ile Proje arasındaki yarısını hiç kurmuyordu. Ölçüm (2026-09-10):
//   Sarmal'ın kendi Proje kökü sorulduğunda graf otuz üç düğüm döndürüyor ve
//   bunların tamamı Kitaplık, Raf, Teknoloji ile Sınıflama oluyordu; sıfır Faz,
//   sıfır Blok ve sıfır Adım geliyordu, çünkü `kapsayan` yalnız İÇ İÇE YAZIMDAN
//   türüyor ve klasörle kurulan bağ grafta hiç görünmüyordu.
//
//   Buradaki nöbetler onarımın iki yüzünü birlikte ölçer: bağın KURULDUĞU yer
//   (dosyanın yaşadığı Proje kökü tekil ve kesinse) ve KURULMADIĞI yer (kök
//   yoksa, ayrışıksa ya da dosya ders dünyasındaysa). İkincisi birincisi kadar
//   önemlidir: tesadüfî eşleşmenin bağ sayıldığı bir motor, panelde yanlış
//   aidiyeti gerçek gibi gösterir ve sessiz başarı taklidi yapar.
// ═══════════════════════════════════════════════════════════════════════════

import { test } from "node:test";
import assert from "node:assert/strict";
import { belirtecle } from "../src/belirtec.ts";
import { ayristir } from "../src/ayristirici.ts";
import type { Program } from "../src/sozdizim.ts";
import { dagKur } from "../src/dag.ts";
import { grafCikar } from "../src/graf.ts";

function progla(kaynaklar: Record<string, string>): Map<string, Program> {
  return new Map(Object.entries(kaynaklar).map(([dosya, k]) => [dosya, ayristir(belirtecle(k))]));
}

/** Tam zincirli bir plan gövdesi: Faz → Blok → Katman → AltKatman → Adım. */
const planGovdesi = (ek: string, teknoloji: string) => `
Faz( kod: FAZ-${ek}, ad: "${ek} Mevsimi", hedefTarih: "2026-09" ) {
  Blok( kod: BLK-${ek}, ne: "${ek} gövdesinin işi tam cümleyle yazılmıştır." ) {
    Katman( kod: KAT-${ek}, ad: "${ek} Katmanı", kullanır: ${teknoloji} ) {
      AltKatman( kod: ALT-${ek}, ad: "${ek} Alt Katmanı", departman: motor ) {
        Adım( kod: ADM-${ek}, durum: beklemede, ne: "${ek} işini yürütmek." )
      }
    }
  }
}`;

/** İki bağımsız Proje kökü ve her birinin kendi plan dosyası. */
function ikiProjeFiksturu(ek: Record<string, string> = {}): Map<string, Program> {
  return progla({
    "a/a_anadizin.sar": `Proje( kod: PRJ-A, ad: "A Projesi" ) { Teknoloji( kod: TEK-A, ad: "A tekniği" ) }`,
    "a/is/plan/faz.sar": planGovdesi("A", "TEK-A"),
    "b/b_anadizin.sar": `Proje( kod: PRJ-B, ad: "B Projesi" ) { Teknoloji( kod: TEK-B, ad: "B tekniği" ) }`,
    "b/is/plan/faz.sar": planGovdesi("B", "TEK-B"),
    ...ek,
  });
}

// ── ① Bağın KURULDUĞU yer ────────────────────────────────────────────────────

test("KPS-FAZ-A01 · iki Projeli çalışma alanında her Fazın kapsayanı KENDİ Projesidir", () => {
  const dag = dagKur(ikiProjeFiksturu());
  assert.equal(dag.dugumler.get("FAZ-A")!.kapsayan, "PRJ-A");
  assert.equal(dag.dugumler.get("FAZ-B")!.kapsayan, "PRJ-B");
  // Tesadüfî eşleşme bağ DEĞİLDİR: her Faz yalnız kendi kökünü tanır, komşu
  // Projenin varlığı hiçbir yeni yol kazandırmaz.
  assert.notEqual(dag.dugumler.get("FAZ-A")!.kapsayan, "PRJ-B");
  assert.notEqual(dag.dugumler.get("FAZ-B")!.kapsayan, "PRJ-A");
});

test("KPS-FAZ-A01 · zincir Adımdan Projeye kesintisiz yürür (graf alt-grafı planı döndürür)", () => {
  const dag = dagKur(ikiProjeFiksturu());
  const yukari = (kod: string): string[] => {
    const zincir: string[] = [];
    let a = dag.dugumler.get(kod)?.kapsayan;
    while (a) { zincir.push(a); a = dag.dugumler.get(a)?.kapsayan; }
    return zincir;
  };
  assert.deepEqual(yukari("ADM-A"), ["ALT-A", "KAT-A", "BLK-A", "FAZ-A", "PRJ-A"]);

  // Kabul ölçütünün kendisi: Proje kökü sorulduğunda alt-graf planı GERÇEKTEN
  // taşır — ölçümün sıfır Faz · sıfır Blok · sıfır Adım döndüğü hâl kapanmıştır.
  const g = grafCikar(dag, "PRJ-A")!;
  const tipler = g.düğümler.map((d) => d.tip);
  assert.equal(tipler.filter((t) => t === "Faz").length, 1);
  assert.equal(tipler.filter((t) => t === "Blok").length, 1);
  assert.equal(tipler.filter((t) => t === "Adım").length, 1);
  // Komşu Projenin planı bu alt-grafa SIZMAZ (varlık sınırı korunur).
  assert.deepEqual(g.düğümler.map((d) => d.kod).filter((k) => k.endsWith("-B")), []);
});

test("KPS-FAZ-A01 · iç içe yazım DOKUNULMAZ: kapsayıcısı yazılmış düğüm klasörden kök almaz", () => {
  const dag = dagKur(progla({
    "a/a_anadizin.sar": `Proje( kod: PRJ-A, ad: "A Projesi" ) { Teknoloji( kod: TEK-A, ad: "A tekniği" ) }`,
    "a/is/plan/faz.sar": planGovdesi("A", "TEK-A"),
  }));
  // Blok kendi Fazının içinde yazılmıştır; çevrim onu Projeye TERFİ ETTİRMEZ.
  assert.equal(dag.dugumler.get("BLK-A")!.kapsayan, "FAZ-A");
  assert.equal(dag.dugumler.get("ADM-A")!.kapsayan, "ALT-A");
});

// ── ② Bağın KURULMADIĞI yer — sessiz başarı taklidi yasağı ───────────────────

test("KPS-FAZ-A01 · kök DIŞINDA yaşayan bir plan dosyasının Fazı KÖKSÜZ kalır", () => {
  const dag = dagKur(ikiProjeFiksturu({ "disarida/faz.sar": planGovdesi("DIS", "TEK-A") }));
  assert.equal(dag.dugumler.get("FAZ-DIS")!.kapsayan, undefined);
  // Köksüz Faz komşu Projelerden birine tesadüfen yapışmaz.
  assert.equal(grafCikar(dag, "PRJ-A")!.düğümler.some((d) => d.kod === "FAZ-DIS"), false);
  assert.equal(grafCikar(dag, "PRJ-B")!.düğümler.some((d) => d.kod === "FAZ-DIS"), false);
});

test("KPS-FAZ-A01 · AYRIŞIK kök: aynı derinlikte iki ayrı Proje kodu varsa bağ kurulmaz", () => {
  const dag = dagKur(progla({
    "c/birinci_anadizin.sar": `Proje( kod: PRJ-BIR, ad: "Birinci" ) { Teknoloji( kod: TEK-C, ad: "C tekniği" ) }`,
    "c/ikinci_anadizin.sar": `Proje( kod: PRJ-IKI, ad: "İkinci" ) { Teknoloji( kod: TEK-D, ad: "D tekniği" ) }`,
    "c/is/plan/faz.sar": planGovdesi("C", "TEK-C"),
  }));
  // İki aday eşit derinliktedir ve kodları ayrışıktır: hangisinin zaman ekseni
  // olduğu ölçülemez, dolayısıyla düğüm köksüz kalır (tahmin bağ sayılmaz).
  assert.equal(dag.dugumler.get("FAZ-C")!.kapsayan, undefined);
});

test("KPS-FAZ-A01 · ders dünyası ürün Projesinin zaman eksenine binmez", () => {
  const dag = dagKur(ikiProjeFiksturu({ "a/ogreti/ornek/faz.sar": planGovdesi("ORNEK", "TEK-A") }));
  assert.equal(dag.dugumler.get("FAZ-ORNEK")!.kapsayan, undefined);
});

test("KPS-FAZ-A01 · çevrim YALNIZ plan kademelerine iner; yasa ve kayıt düğümleri köksüz kalır", () => {
  const dag = dagKur(ikiProjeFiksturu({
    "a/oz/kayit/kayitlar.sar": `
      Hatırlatıcı( kod: HTR-A, ne: "A hatırlatıcısının gövdesi tam cümleyle yazılmıştır." )
      Karar( kod: KRR-A, ne: "A kararının gövdesi tam cümleyle yazılmıştır." )`,
  }));
  assert.equal(dag.dugumler.get("HTR-A")!.kapsayan, undefined);
  assert.equal(dag.dugumler.get("KRR-A")!.kapsayan, undefined);
});

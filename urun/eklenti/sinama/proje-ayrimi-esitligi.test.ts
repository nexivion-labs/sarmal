// ═══════════════════════════════════════════════════════════════════════════
// proje-ayrimi-esitligi.test.ts — 🧭 KPS-AYR-A01 · Eklenti ile Motorun AYNI Ayrımı (YUZ-3.1)
//
//   Bu Adımın iki yarısı ayrı gövdelerde yaşar. EKLENTİ YARISI hazırdır: panel
//   kayıtlarını `projeyeGrupla` ile Proje koduna göre kümeler ve kodu, dosyadan
//   yukarı yürüyüp giriş dosyasını taşıyan ilk dizini varlık kökü sayan
//   `varlikCozucu` çözer. MOTOR YARISI bu turda kurulmuştur: bulgunun evi
//   `projeSahibi` ile, yani Proje düğümünün yaşadığı dizinin öneki ile çözülür.
//
//   İki gövde AYRI yollardan yürür ve bu bilinçlidir: eklenti diskteki giriş
//   dosyasını, motor yüklenmiş ağaçtaki Proje düğümünü okur. Ayrı yollar aynı
//   cevabı vermek ZORUNDADIR, yoksa kullanıcı aynı olguda çelişkili iki tablo
//   görür ve bu YUZ-3.1 ihlalidir. Bu nöbet o eşitliği ölçer; eklentinin odak
//   ve etiket mekanizmasına DOKUNMAZ, yalnız iki ayrımın örtüştüğünü sınar.
//
//   Eşitliğin sınırı da ölçülür ve dürüstçe yazılır: çatının kendi giriş dosyası
//   için eklenti bir ÇalışmaAlanı kimliği döndürür, motor ise hiçbir Proje
//   döndürmez. Bu bir ayrışma değildir — ikisi de "bu dosya hiçbir Projenin malı
//   değil" der, yalnız biri çatının adını da söyler.
// ═══════════════════════════════════════════════════════════════════════════

import { test } from "node:test";
import assert from "node:assert/strict";
import { belirtecle } from "../../cekirdek/src/belirtec.ts";
import { ayristir } from "../../cekirdek/src/ayristirici.ts";
import type { Program } from "../../cekirdek/src/sozdizim.ts";
import { projeKapsamlari } from "../../cekirdek/src/kimlik.ts";
import { projeSahibi } from "../../cekirdek/src/dag.ts";
import { anadizinHaritasi, varlikCozucu } from "../src/yolharitasi-cekirdek.ts";

/** İki projeli bir çatının bütün dosyaları — kaynak metniyle birlikte. */
const AGAC: Record<string, string> = {
  "/cati/cati_anadizin.sar":
    `ÇalışmaAlanı( kod: CAL-CATI, ad: "Çatı" ) {
       Kitaplık( kod: KTP-A, yol: "a/", ne: "A." ) Kitaplık( kod: KTP-B, yol: "b/", ne: "B." ) }`,
  "/cati/a/a_anadizin.sar": `Proje( kod: PRJ-A, ad: "A Projesi", rejim: katı ) { Teknoloji( kod: TEK-A, ad: "A tekniği" ) }`,
  "/cati/a/is/plan/faz.sar": `Blok( kod: BLK-A, ne: "A gövdesinin işi tam cümleyle yazılmıştır." )`,
  "/cati/a/is/durum/durum_devir.sar": `DurumKaydı( kod: DRM-A, ne: "A durumu tam cümleyle yazılmıştır." )`,
  "/cati/b/b_anadizin.sar": `Proje( kod: PRJ-B, ad: "B Projesi", rejim: katı ) { Teknoloji( kod: TEK-B, ad: "B tekniği" ) }`,
  "/cati/b/is/plan/faz.sar": `Blok( kod: BLK-B, ne: "B gövdesinin işi tam cümleyle yazılmıştır." )`,
  "/cati/b/ogreti/ogrenme/dersler.sar": `Bellek( kod: BLK-DERS-B, ne: "B dersleri tam cümleyle yazılmıştır." )`,
};

const YOLLAR = Object.keys(AGAC);
const PROGRAMLAR: ReadonlyMap<string, Program> =
  new Map(YOLLAR.map((y) => [y, ayristir(belirtecle(AGAC[y]))]));

/** Eklentinin ayrımı: dosyadan yukarı yürü, girişi olan ilk dizini varlık say. */
const eklentiAyrimi = varlikCozucu(anadizinHaritasi(YOLLAR), (anaSar) => PROGRAMLAR.get(anaSar));
/** Motorun ayrımı: Proje düğümünün yaşadığı dizinin en uzun öneki kazanır. */
const KAPSAMLAR = projeKapsamlari(PROGRAMLAR);
const motorAyrimi = (yol: string): string | undefined => projeSahibi(yol, KAPSAMLAR);

test("KPS-AYR-A01 · eklentinin panel ayrımı ile motorun bulgu ayrımı BİREBİR aynıdır", () => {
  const ayrisanlar: string[] = [];
  for (const yol of YOLLAR) {
    const eklenti = eklentiAyrimi(yol);
    const motor = motorAyrimi(yol);
    // Eklenti bir ÇalışmaAlanı kökü bulduğunda o dosya hiçbir Projenin malı
    // değildir; motor da orada susar. İki cevap aynı hükmü söyler.
    const beklenen = eklenti.tip === "Proje" ? eklenti.kod : undefined;
    if (beklenen !== motor) ayrisanlar.push(`${yol}: eklenti=${eklenti.tip}/${eklenti.kod} · motor=${motor ?? "—"}`);
  }
  assert.deepEqual(ayrisanlar, []);
});

test("KPS-AYR-A01 · iki yüzey de her projeye AYNI dosya kümesini yazar", () => {
  const kume = (coz: (y: string) => string | undefined): Record<string, string[]> => {
    const out: Record<string, string[]> = {};
    for (const yol of YOLLAR) {
      const kod = coz(yol);
      if (!kod) continue;
      (out[kod] ??= []).push(yol);
    }
    return out;
  };
  const eklenti = kume((y) => { const v = eklentiAyrimi(y); return v.tip === "Proje" ? v.kod : undefined; });
  const motor = kume(motorAyrimi);
  assert.deepEqual(motor, eklenti);
  // Ölçüm boş bir eşitlik DEĞİLDİR: iki proje de gerçekten dolu ve ayrıktır.
  assert.deepEqual(Object.keys(motor).sort(), ["PRJ-A", "PRJ-B"]);
  assert.equal(motor["PRJ-A"].length, 3);
  assert.equal(motor["PRJ-B"].length, 3);
  // Komşu projenin dosyası hiçbir hanede karışmaz (MIM-1.1).
  assert.equal(motor["PRJ-A"].some((y) => y.startsWith("/cati/b/")), false);
  assert.equal(motor["PRJ-B"].some((y) => y.startsWith("/cati/a/")), false);
});

test("KPS-AYR-A01 · çatının kendi ilanı iki yüzeyde de hiçbir Projeye yazılmaz", () => {
  const cati = "/cati/cati_anadizin.sar";
  assert.equal(eklentiAyrimi(cati).tip, "ÇalışmaAlanı");
  assert.equal(eklentiAyrimi(cati).kod, "CAL-CATI");
  assert.equal(motorAyrimi(cati), undefined);
});

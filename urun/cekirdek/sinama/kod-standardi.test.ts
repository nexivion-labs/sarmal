// ═══════════════════════════════════════════════════════════════════════════
// kod-standardi.test.ts — 🏷️ DÜĞÜM KODU STANDARDI NÖBETİ (DIL-1.8 · RFM-MOTOR-A02)
//
//   Nöbet üç şeyi ölçer. Birincisi biçim hükmünün saf ölçümüdür: hangi kodun
//   hangi kusurla biçim dışı kaldığı. İkincisi üreticinin davranışıdır: önek
//   sicili beyan eden projede ilansız önek ve biçim dışı kod uyarı alır, sicilsiz
//   projede ise hiçbir kod tanı üretmez, çünkü standart ileriye dönüktür ve
//   benimsemeyen bir projeyi bir gecede uyarıya boyamak hükmün tersidir. Üçüncüsü
//   deponun kendisidir: toptan ilan ile muafiyet listesi mevcut hiçbir kodu
//   konuşturmaz; yalnız yeni doğan kod konuşur.
// ═══════════════════════════════════════════════════════════════════════════
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { belirtecle } from "../src/belirtec.ts";
import { ayristir } from "../src/ayristirici.ts";
import { kodStandardiTanilari, programlariYukle } from "../src/denetci.ts";
import { beklenenSunumYuzeyi, denetimKos } from "../src/denetim.ts";
import { KAPI_KAPSAMI } from "../src/kapi-kapsami.ts";
import { YENI_TANI_INDEKS } from "../src/tani-sicili.ts";
import { kodBicimKusuru, kodStandardiHukmu, maddeKoduMu, onekSiciliOku } from "../src/kod-standardi.ts";
import type { Program } from "../src/sozdizim.ts";

const KOK = fileURLToPath(new URL("../../..", import.meta.url));
const SNF_YOL = join(KOK, "oz/siniflama/kayit.json");

function harita(girdiler: Record<string, string>): ReadonlyMap<string, Program> {
  return new Map(Object.entries(girdiler).map(([ad, k]) => [ad, ayristir(belirtecle(k))]));
}

const SICILLI_KOK = `Proje( kod: PRJ-P, rejim: esnek, ne: "p",
  önekler: [ PRJ, ADM, KSC, SNV3 ],
  biçimMuafları: [ KSC, SNV3-A01 ] )\n`;

test("biçim: dört kusur ayrı ayrı ölçülür, uyumlu kod kusursuzdur", () => {
  assert.equal(kodBicimKusuru("RFM-KANON-A01", "Adım"), undefined);
  assert.equal(kodBicimKusuru("BLK-RFM", "Blok"), undefined);
  assert.equal(kodBicimKusuru("rfm_kanon_1", "Adım"), "karakter");
  assert.equal(kodBicimKusuru("RFM-KANON.A01", "Adım"), "karakter");
  assert.equal(kodBicimKusuru("SZL-ARAÇ-TALEP", "Sözleşme"), "karakter");
  assert.equal(kodBicimKusuru("RFM--A01", "Adım"), "karakter");
  assert.equal(kodBicimKusuru("1RF-A01", "Adım"), "karakter");
  assert.equal(kodBicimKusuru("RFM", "Blok"), "tek-parça");
  assert.equal(kodBicimKusuru("TAKIM-CEKIRDEK", "Takım"), "önek");
  assert.equal(kodBicimKusuru("SNV3-A01", "Adım"), "önek");
  assert.equal(kodBicimKusuru("R-A01", "Adım"), "önek");
  assert.equal(kodBicimKusuru("RFM-KANON-A1", "Adım"), "adım-sırası");
  assert.equal(kodBicimKusuru("RFM-KANON-01", "Adım"), "adım-sırası");
  // Son parça kuralı yalnız Adım tipini bağlar; öteki tipler anlamlı sözcük taşır.
  assert.equal(kodBicimKusuru("RFM-KANON-DIL", "Kod"), undefined);
});

test("kanon madde kodu bu standardın konusu değildir (DIL-5.1)", () => {
  assert.equal(maddeKoduMu("DIL-1.8"), true);
  assert.equal(maddeKoduMu("TIP-1.15"), true);
  assert.equal(maddeKoduMu("DIL-2"), false);
  assert.equal(maddeKoduMu("KSC-DIL-1.1"), false);
  const sicil = { onekler: new Set<string>(), muafOnekler: new Set<string>(), muafKodlar: new Set<string>() };
  assert.equal(kodStandardiHukmu("XYZ-6.1", "Karar", sicil), undefined);
});

test("sicil: Proje düğümünün iki alanından okunur, tiresiz muafiyet önek düzeyindedir", () => {
  const proje = ayristir(belirtecle(SICILLI_KOK)).bildirimler[0];
  const sicil = onekSiciliOku(proje)!;
  assert.deepEqual([...sicil.onekler], ["PRJ", "ADM", "KSC", "SNV3"]);
  assert.deepEqual([...sicil.muafOnekler], ["KSC"]);
  assert.deepEqual([...sicil.muafKodlar], ["SNV3-A01"]);
  const sicilsiz = ayristir(belirtecle(`Proje( kod: PRJ-Q, rejim: esnek, ne: "q" )\n`)).bildirimler[0];
  assert.equal(onekSiciliOku(sicilsiz), undefined);
});

test("üretici: ilansız önek ve biçim dışı kod uyarı alır, uyumlu ve muaf kod susar", () => {
  const t = kodStandardiTanilari(harita({
    "p/p_anadizin.sar": SICILLI_KOK,
    "p/is/plan.sar": [
      `Adım( kod: ADM-IS-A01, durum: beklemede, ne: "uyumlu" )`,
      `Adım( kod: XYZ-IS-A01, durum: beklemede, ne: "ilansız önek" )`,
      `Adım( kod: ADM-IS-A1, durum: beklemede, ne: "sıra biçimi" )`,
      `Kapsama( kod: KSC-DIL-1.1, ne: "önek düzeyinde muaf" )`,
      `Adım( kod: SNV3-A01, durum: beklemede, ne: "adıyla muaf" )`,
      `Adım( kod: SNV3-A02, durum: beklemede, ne: "yeni kod, önek biçimi kusurlu" )`,
      `Karar( kod: DIL-6.1, ne: "kanon madde kodu" )`,
      "",
    ].join("\n"),
  }));
  const ozet = t.map(({ dosya, tani }) => `${dosya}|${tani.kod}|${tani.duzey}|${tani.satir}`).sort();
  assert.deepEqual(ozet, [
    "p/is/plan.sar|ilansız-önek|uyarı|2",
    "p/is/plan.sar|kod-biçimi-uyumsuz|uyarı|3",
    "p/is/plan.sar|kod-biçimi-uyumsuz|uyarı|6",
  ]);
  const ilansiz = t.find(({ tani }) => tani.kod === "ilansız-önek")!.tani;
  assert.match(ilansiz.mesaj, /XYZ-IS-A01/);
  assert.match(ilansiz.mesaj, /"XYZ"/);
  assert.match(ilansiz.oneri ?? "", /önekler: \[ PRJ, XYZ \]/);
});

test("ileriye dönüklük: sicil beyan etmeyen projede hiçbir kod tanı üretmez", () => {
  const t = kodStandardiTanilari(harita({
    "p/p_anadizin.sar": `Proje( kod: PRJ-P, rejim: esnek, ne: "p" )\n`,
    "p/is/plan.sar": `Adım( kod: xyz_1, durum: beklemede, ne: "biçim dışı" )\nAdım( kod: QQQ-A01, durum: beklemede, ne: "ilansız" )\n`,
  }));
  assert.deepEqual(t, []);
});

test("sınır: sicil yalnız kendi varlığını bağlar; ders dünyası ve muaf dosya ölçülmez", () => {
  const programlar = harita({
    "a/a_anadizin.sar": SICILLI_KOK,
    "a/is/plan.sar": `Adım( kod: QQQ-A01, durum: beklemede, ne: "ilansız" )\n`,
    "b/b_anadizin.sar": `Proje( kod: PRJ-B, rejim: esnek, ne: "b" )\n`,
    "b/is/plan.sar": `Adım( kod: QQQ-A01, durum: beklemede, ne: "sicilsiz varlık" )\n`,
    "a/ogreti/ornek/ders.sar": `Adım( kod: ZZZ-A01, durum: beklemede, ne: "ders" )\n`,
    "a/is/bilerek.sar": `Adım( kod: WWW-A01, durum: beklemede, ne: "muaf dosya" )\n`,
  });
  const t = kodStandardiTanilari(programlar, new Set(["a/is/bilerek.sar"]));
  assert.deepEqual(t.map(({ dosya, tani }) => `${dosya}|${tani.kod}`), ["a/is/plan.sar|ilansız-önek"]);
});

test("orkestrasyon: tanı proje denetiminin akışına uyarı olarak girer", () => {
  const kok = mkdtempSync(join(tmpdir(), "sarmal-kodstd-"));
  try {
    writeFileSync(join(kok, "t_anadizin.sar"),
      'Proje( kod: PRJ-DNT, ad: "dnt", ne: "fikstür", rejim: esnek, önekler: [ PRJ, KTP, RAF, FZ, BLK, KAT, ADM ] ) {\n  Kitaplık( kod: KTP-IS, yol: "is/", ne: "işin kitaplığı" ) {\n    Raf( kod: RAF-PLN, yol: "plan/", ne: "plan rafı" )\n  }\n}\n');
    mkdirSync(join(kok, "is", "plan"), { recursive: true });
    writeFileSync(join(kok, "is", "plan", "is.sar"), `Faz( kod: FZ-T, ad: "mevsim", ne: "dönem" ) {
  Blok( kod: BLK-T, ad: "gövde", ne: "iş" ) {
    Katman( kod: KAT-T, ad: "dal", ne: "teknoloji" ) {
      Adım( kod: ADM-T-A01, durum: beklemede, ne: "uyumlu iş" )
      Adım( kod: YNI-T-A01, durum: beklemede, ne: "ilansız önekle doğan iş" )
    }
  }
}\n`);
    const s = denetimKos(kok, { snfYol: SNF_YOL, tamListe: true });
    const kodlar = s.akis.flatMap((r) => r.tanilar.filter((t) => t.kod === "ilansız-önek" || t.kod === "kod-biçimi-uyumsuz").map((t) => `${r.dosya}|${t.kod}|${t.duzey}`));
    assert.deepEqual(kodlar, ["is/plan/is.sar|ilansız-önek|uyarı"]);
    assert.ok(s.turDokumu.some((d) => d.kod === "ilansız-önek" && d.toplam === 1), "tür dökümü yeni tanıyı saymıyor");
  } finally { rmSync(kok, { recursive: true, force: true }); }
});

test("bölüşüm: iki uyarı Problems hanesine yönlenir, üreticisi panele ulaşır ve matris kaydı onları o hanede anar", () => {
  // Yönlendirme matrisinin nöbeti hanelerin toplamını sicille tartar, fakat bir kimliğin
  // hangi haneye yazıldığını ölçmez; bu sınama iki yeni tanının yerini adıyla tutar.
  for (const kod of ["ilansız-önek", "kod-biçimi-uyumsuz"]) {
    const kayit = YENI_TANI_INDEKS.get(kod);
    assert.ok(kayit, `${kod} sicilde yok`);
    assert.equal(kayit.kademe, "uyarı", `${kod} uyarı düzeyinde konuşmalı`);
    assert.equal(beklenenSunumYuzeyi({ kod, duzey: kayit.kademe }), "problems", `${kod} Problems hanesine yönlenmeli`);
  }
  const girdi = KAPI_KAPSAMI.find((g) => g.uretici === "kodStandardiTanilari");
  assert.ok(girdi?.yuzeyler.includes("panel"), "uyarı basan üretici panele ulaşmalı");
  const matris = readFileSync(join(KOK, "is/nitelik/goc/tani_yuzeyi_yonlendirme_matrisi.sar"), "utf8");
  const satir = (hane: string): string => matris.split("\n").find((s) => s.startsWith(`| ${hane} |`)) ?? "";
  assert.ok(satir("Problems").includes("`ilansız-önek` ile `kod-biçimi-uyumsuz`"), "matris kaydı iki uyarıyı Problems hanesinde anmalı");
  for (const hane of ["Hatırlatıcılar", "Bildirimler"]) {
    assert.ok(!/ilansız-önek|kod-biçimi-uyumsuz/.test(satir(hane)), `matris kaydı iki uyarıyı ${hane} hanesine yazmamalı`);
  }
});

test("depo: toptan ilan ile muafiyet listesi mevcut hiçbir kodu konuşturmaz", () => {
  const { programlar, muaflar } = programlariYukle(KOK);
  const t = kodStandardiTanilari(programlar, muaflar);
  assert.deepEqual(t.map(({ dosya, tani }) => `${dosya}:${tani.satir} ${tani.kod}`), [],
    "depoda standart dışı kod var — yeni kod ise standarda uydur, standarttan önce doğmuşsa biçim muafiyetine ekle");
});

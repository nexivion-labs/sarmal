// ═══════════════════════════════════════════════════════════════════════════
// MDR-A04 bağ sınıflandırması: bu dosyadaki mesaj-metnine dokunan assert'ler ya kod-çıpalı ikincil kontroldür ya da bilinçli metin sözleşmesidir (nöbet); çıpasız tanı araması yasaktır. Tam döküm: nitelik/motor_tani_envanteri.sar (MDR-A04 bölümü).
// metin-atif.test.ts — Denetçinin .md/.ts körlüğü kapandı (KNT-A12 · B9)
//
//   Problem (sade dille): gezgin (kimlik.ts) kod atıflarını ÜÇ uzantıda görür
//   (.sar + .md + .ts — YUZ-3.2, Founder onaylı) ama denetçi yalnız .sar yüklerdi.
//   Sonuç: KARARLAR/CHANGELOG/rapor ve kod yorumlarındaki KARŞILIKSIZ kod atıfları
//   (uydurma ADM-DGS-99 gibi) denetimde GÖRÜNMEZDİ.
//
//   Kabul kanıtı:
//     ① karşılıksız .md/.ts atfı tanı alır · UTF-8/A-Z/0-10 çöpü ELENİR
//     ② aile ön-eki süzgeci: ön-eki gerçek aileye uymayan aday kod SAYILMAZ
//     ③ düzey .md → bilgi · .ts → uyarı (HATA hiçbir hâlde DEĞİL · YAS-4.2 kademesi)
//     ④ ÖZELLİK bloğunda beyan edilmiş kod artık denetçi için TANIM
//   Koşum: cd cekirdek && node --test sinama/metin-atif.test.ts
// ═══════════════════════════════════════════════════════════════════════════

import { test } from "node:test";
import assert from "node:assert/strict";
import { belirtecle } from "../src/belirtec.ts";
import { ayristir } from "../src/ayristirici.ts";
import { KimlikIndeksi } from "../src/kimlik.ts";
import { kodIndeksle, metinAtifTanilari } from "../src/denetci.ts";
import type { Program } from "../src/sozdizim.ts";

const derle = (k: string): Program => ayristir(belirtecle(k));

/** Aile evrenini DOĞURAN .sar tanımları — gerçek aileler: ADM · BKM · K · EKR. */
const SAR = `
Adım( kod: ADM-DGS-13, durum: beklemede, ne: "gerçek adım" )
Adım( kod: BKM-BUG-A02, durum: beklemede, ne: "gerçek adım" )
Karar( kod: K-86, ne: "gerçek karar" )
Ekran( kod: EKR-1, ne: "gerçek ekran" )
`;

const kurulum = (dosyalar: Record<string, string>) => {
  const programlar = new Map([["a.sar", derle(SAR)]]);
  const kodIndeks = kodIndeksle(programlar);
  const indeks = new KimlikIndeksi();
  indeks.dosyaGuncelle("a.sar", SAR);
  for (const [dosya, metin] of Object.entries(dosyalar)) indeks.dosyaGuncelle(dosya, metin);
  return { indeks, kodIndeks };
};

// ── ① KARŞILIKSIZ atıf yakalanır ───────────────────────────────────────────
test("①: .md düz metnindeki karşılıksız kod atfı (uydurma ADM-DGS-99) tanı alır", () => {
  const { indeks, kodIndeks } = kurulum({
    "nitelik/rapor.md": "Bu tur ADM-DGS-99 adımını kapattı; ADM-DGS-13 zaten yeşildi.",
  });
  const t = metinAtifTanilari(indeks, kodIndeks);
  assert.equal(t.length, 1, "yalnız karşılıksız olan tanı almalı");
  assert.equal(t[0].dosya, "nitelik/rapor.md");
  assert.equal(t[0].tani.kod, "karşılıksız-metin-atfı");
  assert.ok(t[0].tani.mesaj.includes("ADM-DGS-99"));
  assert.equal(t[0].tani.satir, 1);
});

test("①: .ts kod yorumundaki karşılıksız atıf da yakalanır (denetçi artık .sar'a hapis değil)", () => {
  const { indeks, kodIndeks } = kurulum({
    "src/dongu.ts": "// Kadro kimliği (BKM-BUG-A99): çözülen atanan Etmen çağrıya biner.",
  });
  const t = metinAtifTanilari(indeks, kodIndeks);
  assert.equal(t.length, 1);
  assert.ok(t[0].tani.mesaj.includes("BKM-BUG-A99"));
});

test("①: ÇÖZÜLEN atıf sessiz — .sar'da tanımlı kod tanı üretmez (yanlış-pozitif nöbeti)", () => {
  const { indeks, kodIndeks } = kurulum({
    "KARARLAR.md": "K-86 kararı ADM-DGS-13 ve BKM-BUG-A02 ile birlikte okunur (EKR-1).",
  });
  assert.deepEqual(metinAtifTanilari(indeks, kodIndeks), []);
});

test("①: .md frontmatter kimlikleri (ekKodlar) çözer — referansTanilari ile AYNI kod evreni", () => {
  const { indeks, kodIndeks } = kurulum({ "felsefe/x.md": "Bkz. K-9 (dil-bağımsızlık)." });
  assert.equal(metinAtifTanilari(indeks, kodIndeks).length, 1, "ekKodlar'sız: karşılıksız");
  assert.deepEqual(metinAtifTanilari(indeks, kodIndeks, new Set(["K-9"])), [], "ekKodlar ile: çözülür");
});

// ── ② AİLE ÖN-EKİ SÜZGECİ — Adım'ın kalbi ──────────────────────────────────
test("②: ÇÖP elenir — UTF-8 · A-Z · 0-10 · 4-CLI ön-eki gerçek aileye uymaz, kod SAYILMAZ", () => {
  const { indeks, kodIndeks } = kurulum({
    "nitelik/copluk.md": [
      "Kodlama UTF-8 olmalı; harfler A-Z arası, puan 0-10 ölçeğinde.",
      "IDA arızası #4-CLI kapısında görüldü; satır 918-922 arası.",
      "TypeScript tipleri: KimlikIndeksi, DosyaKaydi — TAM-ZİNCİR zorunlu.",
    ].join("\n"),
  });
  assert.deepEqual(metinAtifTanilari(indeks, kodIndeks), [],
    "ön-ek süzgeci olmadan burada YÜZLERCE sahte kırık-referans çıkardı");
});

test("②: aile evreni YALNIZ .sar tanımlarından türer — tanımsız ailenin adayı sessizdir", () => {
  // ZZZ hiçbir .sar'da aile doğurmadı → ZZZ-42 kod-denemesi bile sayılmaz.
  const { indeks, kodIndeks } = kurulum({ "x.md": "ZZZ-42 diye bir şey yok; ADM-DGS-99 ise var-gibi." });
  const t = metinAtifTanilari(indeks, kodIndeks);
  assert.equal(t.length, 1, "yalnız GERÇEK aileye (ADM) uyan aday tanı alır");
  assert.ok(t[0].tani.mesaj.includes("ADM-DGS-99"));
});

test("②: kod ŞEKLİ süzgeci — rakamsız BÜYÜK-HARF düz yazı ve yer-tutucu kod sayılmaz", () => {
  const { indeks, kodIndeks } = kurulum({
    "KARARLAR.md": "Plan TEK-ANLAMLI olmalı; ADM-X yer-tutucudur, BKM-KRR ailesi geneldir.",
  });
  assert.deepEqual(metinAtifTanilari(indeks, kodIndeks), []);
});

// ── ③ DÜZEY — YAS-4.2 kademesi: HATA değil ──────────────────────────────────────
test("③: düzey .md → bilgi · .ts → uyarı; HİÇBİR hâlde HATA değil (prose'da bayat atıf meşru)", () => {
  const { indeks, kodIndeks } = kurulum({
    "CHANGELOG.md": "ADM-DGS-99 kapandı.",
    "src/x.ts": "// ADM-DGS-99 izi",
  });
  const t = metinAtifTanilari(indeks, kodIndeks);
  assert.equal(t.length, 2);
  assert.equal(t.find((x) => x.dosya.endsWith(".md"))!.tani.duzey, "bilgi");
  assert.equal(t.find((x) => x.dosya.endsWith(".ts"))!.tani.duzey, "uyarı");
  assert.ok(t.every((x) => x.tani.duzey !== "hata"), "kapı HATA vermez — YAS-4.2 kademesi");
});

test("③: sentetik fikstür kapsam-dışı — *.test.ts inline malzemesi indeksi kirletmez", () => {
  const { indeks, kodIndeks } = kurulum({ "sinama/dag.test.ts": 'derle("Adım( kod: ADM-1 )"); // ADM-DGS-99' });
  assert.deepEqual(metinAtifTanilari(indeks, kodIndeks), [],
    "INDEKS_DISI'nın fikstur/ gerekçesinin aynısı — kasıtlı drift malzemesi");
});

test("③: .sar dosyaları bu kapının DIŞI — referansTanilari onların tek yetkilisi (çift tanı yok)", () => {
  const { indeks, kodIndeks } = kurulum({
    "plan/x.sar": 'Adım( kod: ADM-DGS-14, durum: beklemede, ne: "ADM-DGS-99 metninde geçer" )',
  });
  assert.deepEqual(metinAtifTanilari(indeks, kodIndeks), []);
});

test("③: TANIM satırı kendi kendine atıf sayılmaz (gezginin `atiflar` kuralıyla birebir)", () => {
  const { indeks, kodIndeks } = kurulum({});
  assert.deepEqual(metinAtifTanilari(indeks, kodIndeks), [], "a.sar'ın kendi tanımları tanı doğurmaz");
});

// ── ④ BONUS: özellik-bloğu körlüğü kapandı ─────────────────────────────────
test("④: ÖZELLİK bloğunda beyan edilmiş kod artık denetçi için TANIM (kimlik.ts ile hizalandı)", () => {
  // Sapma: kodIndeksle yalnız `parametreler`e bakıyordu; kimlik.ts:144 ikisini de gezer.
  const p = derle('Adım( durum: beklemede, ne: "özellikte kimlik" ) {\n  kod: ADM-OZ-1\n}');
  const indeks = kodIndeksle(new Map([["a.sar", p]]));
  assert.ok(indeks.has("ADM-OZ-1"), "özellik-bloğu kod'u indekste olmalı");
  assert.equal(indeks.get("ADM-OZ-1")!.tip, "Adım");
});

test("④: özellikte tanımlı koda yapılan .md atfı artık SAHTE kırık-referans üretmez", () => {
  const programlar = new Map([["a.sar", derle('Adım( durum: beklemede, ne: "x" ) {\n  kod: ADM-OZ-1\n}')]]);
  const kodIndeks = kodIndeksle(programlar);
  const indeks = new KimlikIndeksi();
  indeks.dosyaGuncelle("rapor.md", "ADM-OZ-1 tamamlandı.");
  assert.deepEqual(metinAtifTanilari(indeks, kodIndeks), []);
});

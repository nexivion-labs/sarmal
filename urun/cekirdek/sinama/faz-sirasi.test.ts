// ═══════════════════════════════════════════════════════════════════════════
// faz-sirasi.test.ts — 🧭 FAZ SIRASI VE BLOK YAPISI NÖBETİ (KPS-SIR-A01)
//
//   Founder hükmü (2026-09-29): hiçbir Blok Fazsız bir yapıda yaşayamaz; Faz
//   sırası katıdır, önceki Faz kapanmadan sonraki Fazda iş başlamaz ve
//   bağımlılıkları bitmemiş bir Adım geliştirmeye alınamaz. Hüküm, kardeş bir
//   projenin planında Fazsız, boş ve sırası bozuk Blokların motor sıfır hata
//   verirken birikmesi üzerine verilmiştir. Ölçülen dört kök şunlardır:
//     ① kardeş Faz grubunun anahtarı dosya adını taşıyordu ve her Fazı kendi
//       dosyasında yaşayan planda Fazlar arasında hiçbir sıra kenarı yoktu;
//     ② `planlanmamış` beyanı fazsız-blok hatasını bilgi notuna indiriyordu;
//     ③ Faz sırası ihlali ile geriye dönük Faz bağımlılığının tanısı yoktu;
//     ④ seçilemez Adım tanısı yalnız ham `bağımlı:` listesini okuyordu.
//   Bu dosya dördünü de davranışla ölçer. Fikstürler küçük ve tek Projelidir;
//   kardeş proje yalnız Faz zincirinin proje sınırını ölçmek için doğar.
// ═══════════════════════════════════════════════════════════════════════════
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { belirtecle } from "../src/belirtec.ts";
import { ayristir } from "../src/ayristirici.ts";
import type { Program } from "../src/sozdizim.ts";
import { dagKur, dagTanilari, durumTutarlilikTanilari, dogalYolKarsilastir, fazKarsilastir } from "../src/dag.ts";
import { fazSirasiTanilari, blokYapisiTanilari, hiyerarsiTanilari, mevsimNormalize, DOGUS_ISKELETI_ADIMI } from "../src/denetci.ts";
import { orkestrasyonTanilari } from "../src/denetim.ts";
import { tarihselTani } from "../src/tani-metinleri.ts";
import { YENI_TANI_KODLARI } from "../src/tani-sicili.ts";
import type { Tani } from "../src/tani.ts";

function progla(kaynaklar: Record<string, string>): Map<string, Program> {
  const p = new Map(Object.entries(kaynaklar).map(([dosya, k]) => [dosya, ayristir(belirtecle(k))]));
  mevsimNormalize(p);
  return p;
}

const KOK = `Proje( kod: PRJ-SIR, ad: "Sıra Projesi" ) { Teknoloji( kod: TEK-SIR, ad: "t" ) }`;

/** Tam zincirli Faz gövdesi; `adimlar` AltKatmanın içine olduğu gibi yazılır. */
const faz = (ek: string, tarih: string | undefined, adimlar: string, onBosluk = 0): string =>
  "\n".repeat(onBosluk) +
  `Faz( kod: FAZ-${ek}, ad: "${ek}"${tarih ? `, hedefTarih: "${tarih}"` : ""} ) {\n` +
  `  Blok( kod: BLK-${ek}, ne: "gövde" ) {\n    Katman( kod: KAT-${ek}, ad: "k" ) {\n      AltKatman( kod: ALT-${ek}, ad: "m" ) {\n` +
  `${adimlar}\n      }\n    }\n  }\n}\n`;
const adim = (kod: string, durum: string, ek = ""): string =>
  `        Adım( kod: ${kod}, durum: ${durum}${ek}, ne: "iş" )`;

// ── ① Faz zinciri dosyalar arasında kurulur ─────────────────────────────────

test("① iki dosyalı sınav çatısında ayrı dosyalardaki Fazlar sıra kenarıyla zincirlenir", () => {
  const dag = dagKur(progla({
    "p/p_anadizin.sar": KOK,
    "p/is/plan/faz/1_ilk.sar": faz("ILK", undefined, adim("ADM-ILK", "tamamlandı")),
    "p/is/plan/faz/2_son.sar": faz("SON", undefined, adim("ADM-SON", "beklemede")),
  }));
  assert.deepEqual(dag.dugumler.get("ADM-SON")!.oncekiler, ["ADM-ILK"], "sonraki Fazın yaprağı önceki Fazın yaprağına bağlanmalı");
  assert.deepEqual(dag.dugumler.get("ADM-ILK")!.sonrakiler, ["ADM-SON"]);
  assert.equal(dag.fazSirasi!.get("FAZ-ILK")!.grup, dag.fazSirasi!.get("FAZ-SON")!.grup, "iki Faz aynı kardeş grubunda olmalı");
  assert.ok(dag.fazKenari!.has("ADM-ILK\u0000ADM-SON"), "kenar Faz sırasından doğduğu için işaretli olmalı");
});

test("① eşit tarihli ya da tarihsiz Fazlar satırla değil dosya önekinin doğal sayı sırasıyla dizilir", () => {
  // Satır numaraları bilerek ters kurulur: 10_ dosyasının Fazı birinci satırda,
  // 1_ dosyasınınki kırkıncı satırda başlar. Satırla karşılaştırma 10_ → 2_ → 1_,
  // düz sözlük sırası 1_ → 10_ → 2_ verirdi; doğru sıra 1_ → 2_ → 10_ dir.
  const dag = dagKur(progla({
    "p/p_anadizin.sar": KOK,
    "p/is/plan/faz/10_uc.sar": faz("UC", "2026-10", adim("ADM-UC", "beklemede")),
    "p/is/plan/faz/2_iki.sar": faz("IKI", "2026-10", adim("ADM-IKI", "beklemede"), 20),
    "p/is/plan/faz/1_bir.sar": faz("BIR", "2026-10", adim("ADM-BIR", "beklemede"), 40),
  }));
  const sira = [...dag.fazSirasi!.entries()].sort((a, b) => a[1].sira - b[1].sira).map(([k]) => k);
  assert.deepEqual(sira, ["FAZ-BIR", "FAZ-IKI", "FAZ-UC"]);
  assert.deepEqual(dag.dugumler.get("ADM-IKI")!.oncekiler, ["ADM-BIR"]);
  assert.deepEqual(dag.dugumler.get("ADM-UC")!.oncekiler, ["ADM-IKI"]);
});

test("① tarih önekten önce gelir: tarihli Faz tarihsizlerin önündedir", () => {
  const dag = dagKur(progla({
    "p/p_anadizin.sar": KOK,
    "p/is/plan/faz/1_tarihsiz.sar": faz("T0", undefined, adim("ADM-T0", "beklemede")),
    "p/is/plan/acilis.sar": faz("T1", "2026-09-30", adim("ADM-T1", "beklemede")),
  }));
  assert.deepEqual(dag.dugumler.get("ADM-T0")!.oncekiler, ["ADM-T1"]);
});

test("① doğal yol karşılaştırıcısı sayı parçalarını sayı olarak okur ve toplamdır", () => {
  assert.ok(dogalYolKarsilastir("plan/faz/2_a.sar", "plan/faz/10_a.sar") < 0);
  assert.ok(dogalYolKarsilastir("plan/faz/10_a.sar", "plan/faz/2_a.sar") > 0);
  assert.equal(dogalYolKarsilastir("a.sar", "a.sar"), 0);
  assert.ok(fazKarsilastir({ satir: 90, dosya: "f/1_a.sar" }, { satir: 1, dosya: "f/2_b.sar" }) < 0, "ayrı dosyada satır değil dosya karar verir");
  assert.ok(fazKarsilastir({ satir: 9, dosya: "f/a.sar" }, { satir: 1, dosya: "f/a.sar" }) > 0, "aynı dosyada satır karar verir");
});

test("① Fazın `çağır` ile kapsadığı Blok zincire girer; kardeş projenin Fazı girmez", () => {
  const blok = (ek: string, durum: string, mevsim = ""): string =>
    `Blok( kod: BLK-${ek}${mevsim}, ne: "gövde" ) {\n  Katman( kod: KAT-${ek}, ad: "k" ) {\n    AltKatman( kod: ALT-${ek}, ad: "m" ) {\n      Adım( kod: ADM-${ek}, durum: ${durum}, ne: "iş" )\n    }\n  }\n}\n`;
  const dag = dagKur(progla({
    "p/p_anadizin.sar": KOK,
    "p/is/plan/faz/faz.sar": `Faz( kod: FAZ-A, ad: "a", hedefTarih: "2026-08" ) {\n  çağır BLK-A\n}\nFaz( kod: FAZ-B, ad: "b", hedefTarih: "2026-09" ) {\n  çağır BLK-B\n}\n`,
    "p/is/plan/blok/a.sar": blok("A", "tamamlandı"),
    "p/is/plan/blok/b.sar": blok("B", "beklemede"),
    "k/k_anadizin.sar": `Proje( kod: PRJ-KARDES, ad: "Kardeş" ) { Teknoloji( kod: TEK-K, ad: "t" ) }`,
    "k/is/plan/faz.sar": `Faz( kod: FAZ-K0, ad: "k0", hedefTarih: "2026-01" ) {\n  Blok( kod: BLK-K0, ne: "g" ) {\n    Katman( kod: KAT-K0, ad: "k" ) {\n      AltKatman( kod: ALT-K0, ad: "m" ) {\n        Adım( kod: ADM-K0, durum: beklemede, ne: "iş" )\n      }\n    }\n  }\n}\n`,
  }));
  assert.deepEqual(dag.dugumler.get("ADM-B")!.oncekiler, ["ADM-A"], "çağrılan Blokların Adımları Faz sırasıyla bağlanmalı");
  assert.equal(dag.adimFazi!.get("ADM-A"), "FAZ-A");
  assert.ok(!dag.dugumler.get("ADM-A")!.oncekiler.includes("ADM-K0"), "kardeş projenin Fazı bu projenin zincirine girmemeli");
  assert.notEqual(dag.fazSirasi!.get("FAZ-K0")!.grup, dag.fazSirasi!.get("FAZ-A")!.grup);
});

// ── ③ Faz sırası ihlalleri ──────────────────────────────────────────────────

test("③ ters Faz bağımlılığı HATA verir, döngü yağdırmaz ve kenar sıra hesabına girmez", () => {
  const programlar = progla({
    "p/p_anadizin.sar": KOK,
    "p/is/plan/faz/1_ilk.sar": faz("ILK", undefined,
      [adim("ADM-I1", "beklemede", ", bağımlı: [ ADM-S1 ]"), adim("ADM-I2", "beklemede"), adim("ADM-I3", "beklemede")].join("\n")),
    "p/is/plan/faz/2_son.sar": faz("SON", undefined, [adim("ADM-S1", "beklemede"), adim("ADM-S2", "beklemede")].join("\n")),
  });
  const dag = dagKur(programlar);
  assert.deepEqual(dagTanilari(dag), [], "ters kenar ile Faz sırası birlikte döngü kurmamalı");
  assert.ok(!dag.dugumler.get("ADM-I1")!.oncekiler.includes("ADM-S1"), "çelişen açık kenar sıra hesabına girmemeli");
  const t = fazSirasiTanilari(dag).filter((x) => x.tani.kod === "ters-faz-bağımlılığı");
  assert.equal(t.length, 1, "kenar başına bir bulgu basılmalı");
  assert.equal(t[0].tani.duzey, "hata");
  assert.equal(t[0].dosya, "p/is/plan/faz/1_ilk.sar");
  assert.match(t[0].tani.mesaj, /ADM-S1/);
  assert.match(t[0].tani.mesaj, /FAZ-SON/);
});

test("③ iki ucu da tamamlanmış ters kenar tarihseldir: döngü kurmaz ve BİLGİ düzeyinde görünür kalır", () => {
  // Provider deseni: Blok gövdesi biten Adımlarıyla birlikte sonraki Faza devredilir
  // ve eski Fazdaki biten iş o Adımlara bağlı görünür. Sarmal'ın kendi göç planında
  // iki kenar tam olarak budur; iş bitmiştir ve sıra hesabını artık etkilemez.
  const dag = dagKur(progla({
    "p/p_anadizin.sar": KOK,
    "p/is/plan/faz/1_ilk.sar": faz("ILK", undefined, adim("ADM-I1", "tamamlandı", ", bağımlı: [ ADM-S1 ]")),
    "p/is/plan/faz/2_son.sar": faz("SON", undefined, [adim("ADM-S1", "tamamlandı"), adim("ADM-S2", "beklemede")].join("\n")),
  }));
  assert.deepEqual(dagTanilari(dag), []);
  const t = fazSirasiTanilari(dag).filter((x) => x.tani.kod === "ters-faz-bağımlılığı");
  assert.equal(t.length, 1);
  assert.equal(t[0].tani.duzey, "bilgi");
  assert.match(t[0].tani.mesaj, /tarihseldir/);
});

test("③ kapsayıcıya yazılan ters kenar da yapraklarında yakalanır, ileri kenar yakalanmaz", () => {
  const dag = dagKur(progla({
    "p/p_anadizin.sar": KOK,
    "p/is/plan/faz/1_ilk.sar": faz("ILK", undefined, adim("ADM-I1", "beklemede", ", bağımlı: [ BLK-SON ]")),
    "p/is/plan/faz/2_son.sar": faz("SON", undefined, adim("ADM-S1", "beklemede", ", bağımlı: [ ADM-I1 ]")),
  }));
  const t = fazSirasiTanilari(dag).filter((x) => x.tani.kod === "ters-faz-bağımlılığı");
  assert.equal(t.length, 1);
  assert.match(t[0].tani.mesaj, /ADM-I1/);
  assert.ok(dag.dugumler.get("ADM-S1")!.oncekiler.includes("ADM-I1"), "ileri yöndeki açık kenar korunmalı");
});

test("③ önceki Faz açıkken sonraki Fazda başlamış iş Faz başına bir UYARI verir", () => {
  const dag = dagKur(progla({
    "p/p_anadizin.sar": KOK,
    "p/is/plan/faz/1_ilk.sar": faz("ILK", undefined, adim("ADM-I1", "beklemede")),
    "p/is/plan/faz/2_orta.sar": faz("ORTA", undefined, adim("ADM-O1", "tamamlandı")),
    "p/is/plan/faz/3_son.sar": faz("SON", undefined, [adim("ADM-S1", "geliştirmede"), adim("ADM-S2", "geliştirmede")].join("\n")),
  }));
  const t = fazSirasiTanilari(dag).filter((x) => x.tani.kod === "erken-faz-işi");
  assert.equal(t.length, 1, "bulgu Adım başına değil Faz başına bir kez basılmalı");
  assert.equal(t[0].tani.duzey, "uyarı");
  assert.equal(t[0].dosya, "p/is/plan/faz/3_son.sar");
  assert.match(t[0].tani.mesaj, /FAZ-ILK/, "en yakın açık önceki Faz adıyla anılmalı");
  assert.match(t[0].tani.mesaj, /ADM-S1, ADM-S2/);
});

test("③ önceki Fazların hepsi kapalıyken sonraki Fazdaki iş erken sayılmaz", () => {
  const dag = dagKur(progla({
    "p/p_anadizin.sar": KOK,
    "p/is/plan/faz/1_ilk.sar": faz("ILK", undefined, adim("ADM-I1", "tamamlandı")),
    "p/is/plan/faz/2_son.sar": faz("SON", undefined, adim("ADM-S1", "geliştirmede")),
  }));
  const t = fazSirasiTanilari(dag);
  assert.deepEqual(t.map((x) => x.tani.kod), [], "kapalı öncül Fazlarla hiçbir Faz sırası tanısı doğmamalı");
});

test("③ Faz sırasından doğan öncül durum tutarsızlığı hatası yağdırmaz; açık kenar yağdırır", () => {
  const dag = dagKur(progla({
    "p/p_anadizin.sar": KOK,
    "p/is/plan/faz/1_ilk.sar": faz("ILK", undefined, adim("ADM-I1", "beklemede")),
    "p/is/plan/faz/2_son.sar": faz("SON", undefined,
      [adim("ADM-S1", "tamamlandı"), adim("ADM-S2", "tamamlandı", ", bağımlı: [ ADM-S3 ]"), adim("ADM-S3", "beklemede")].join("\n")),
  }));
  const t = durumTutarlilikTanilari(dag);
  assert.deepEqual(t.map((x) => `${x.tani.kod}:${x.tani.mesaj.includes("ADM-S3")}`), ["durum-tutarsızlığı:true"],
    "yalnız açık kenarın (ADM-S2 → ADM-S3) durum çelişkisi hata olmalı");
});

// ── ④ seçilebilirlik genişletilmiş öncül listesini okur ────────────────────

test("④ kapsayıcıya yazılmış öncül yapraklarına açılır ve seçilemez Adım UYARI verir", () => {
  // Ham `bağımlı:` listesi yalnız BLK-HAZIRLIK kodunu görür ve o bir Adım olmadığı
  // için eski üretici susuyordu; graf onu iki yaprağına açar.
  const dag = dagKur(progla({
    "p/p_anadizin.sar": KOK,
    "p/is/plan/faz/1_ilk.sar": `Faz( kod: FAZ-ILK, ad: "ilk" ) {\n` +
      `  Blok( kod: BLK-HAZIRLIK, ne: "g" ) {\n    Katman( kod: KAT-H, ad: "k" ) {\n      AltKatman( kod: ALT-H, ad: "m" ) {\n` +
      `${adim("ADM-H1", "tamamlandı")}\n${adim("ADM-H2", "beklemede")}\n      }\n    }\n  }\n` +
      `  Blok( kod: BLK-IS, ne: "g" ) {\n    Katman( kod: KAT-I, ad: "k" ) {\n      AltKatman( kod: ALT-I, ad: "m" ) {\n` +
      `${adim("ADM-IS", "geliştirmede", ", bağımlı: [ BLK-HAZIRLIK ]")}\n      }\n    }\n  }\n}\n`,
  }));
  const t = fazSirasiTanilari(dag).filter((x) => x.tani.kod === "seçilemez-adım-yürütümü");
  assert.equal(t.length, 1, "Adım başına bir bulgu basılmalı");
  assert.equal(t[0].tani.duzey, "uyarı");
  assert.match(t[0].tani.mesaj, /ADM-H2/);
  assert.doesNotMatch(t[0].tani.mesaj, /ADM-H1/, "tamamlanmış öncül sayılmamalı");
});

test("④ Faz sırasından gelen açık öncül seçilemez Adım bulgusunda sayılır ve adıyla ayrılır", () => {
  const dag = dagKur(progla({
    "p/p_anadizin.sar": KOK,
    "p/is/plan/faz/1_ilk.sar": faz("ILK", undefined, adim("ADM-I1", "beklemede")),
    "p/is/plan/faz/2_son.sar": faz("SON", undefined, adim("ADM-S1", "geliştirmede")),
  }));
  const t = fazSirasiTanilari(dag).filter((x) => x.tani.kod === "seçilemez-adım-yürütümü");
  assert.equal(t.length, 1);
  assert.match(t[0].tani.mesaj, /Faz sırasıyla/);
});

test("③④ ders dünyası muaftır: aynı ihlaller öğreti fikstüründe tanı üretmez", () => {
  const dag = dagKur(progla({
    "ogreti/ornek/plan.sar": faz("ILK", undefined, adim("ADM-I1", "beklemede", ", bağımlı: [ ADM-S1 ]")) +
      faz("SON", undefined, adim("ADM-S1", "geliştirmede")),
  }));
  assert.equal(dag.tersFaz!.length, 1, "graf ölçer");
  assert.deepEqual(fazSirasiTanilari(dag), [], "tanı ders dünyasında susar (OGR-5)");
});

// ── ② planlanmamış kaçışı kapalı ────────────────────────────────────────────

test("② Fazsız Blok `planlanmamış` beyanıyla da HATA verir", () => {
  const t = hiyerarsiTanilari(progla({
    "p/is/plan/blok.sar": `Blok( kod: BLK-P, planlanmamış: "önceliklendirme bekliyor", ne: "g" ) {\n  Katman( kod: KAT-P, ad: "k" ) {\n    AltKatman( kod: ALT-P, ad: "m" ) {\n${adim("ADM-P", "beklemede")}\n    }\n  }\n}\n`,
  }));
  const hata = t.filter((x) => x.tani.kod === "fazsız-blok");
  assert.equal(hata.length, 1);
  assert.equal(hata[0].tani.duzey, "hata");
  assert.equal(t.filter((x) => x.tani.kod === "planlanmamış-gövde").length, 0);
});

// ── Blok yapısı ─────────────────────────────────────────────────────────────

const blokYapisi = (kaynaklar: Record<string, string>) => {
  const p = progla({ "p/p_anadizin.sar": KOK, ...kaynaklar });
  return blokYapisiTanilari(p, dagKur(p));
};

test("yabancı Faz bağı: açık işte UYARI, bitmiş işte BİLGİ, kendi Projesinin ad alanında sessiz", () => {
  const govde = (kod: string, mevsim: string, durum: string): string =>
    `Blok( kod: ${kod}, mevsim: ${mevsim}, ne: "g" ) {\n  Katman( kod: KAT-${kod}, ad: "k" ) {\n    AltKatman( kod: ALT-${kod}, ad: "m" ) {\n${adim(`ADM-${kod}-1`, durum)}\n${adim(`ADM-${kod}-2`, durum)}\n    }\n  }\n}\n`;
  const t = blokYapisi({
    "p/is/plan/faz.sar": `Faz( kod: FAZ-KENDI, ad: "k" ) {\n  Blok( kod: BLK-DOLU, ne: "g" ) {\n    Katman( kod: KAT-D, ad: "k" ) {\n      AltKatman( kod: ALT-D, ad: "m" ) {\n${adim("ADM-D1", "beklemede")}\n${adim("ADM-D2", "beklemede")}\n      }\n    }\n  }\n}\n`,
    "p/is/plan/acik.sar": govde("BLK-ACIK", "PRJ-KARDES::FAZ-X", "beklemede"),
    "p/is/plan/bitmis.sar": govde("BLK-BITMIS", "PRJ-KARDES::FAZ-X", "tamamlandı"),
    "p/is/plan/kendi.sar": govde("BLK-KENDI", "PRJ-SIR::FAZ-KENDI", "beklemede"),
  }).filter((x) => x.tani.kod === "yabancı-faz-bağı");
  assert.deepEqual(t.map((x) => `${x.dosya}:${x.tani.duzey}`).sort(),
    ["p/is/plan/acik.sar:uyarı", "p/is/plan/bitmis.sar:bilgi"]);
});

test("Katmansız Blok UYARI verir; doğrudan Adım taşıyan Blok burada ikinci kez sayılmaz", () => {
  const t = blokYapisi({
    "p/is/plan/faz.sar": `Faz( kod: FAZ-Y, ad: "y" ) {\n  Blok( kod: BLK-BOS, ne: "boş" )\n  Blok( kod: BLK-CIPLAK, ne: "g" ) {\n    Adım( kod: ADM-C, durum: beklemede, ne: "iş" )\n    Adım( kod: ADM-C2, durum: beklemede, ne: "iş" )\n  }\n}\n`,
  });
  assert.deepEqual(t.filter((x) => x.tani.kod === "katmansız-blok").map((x) => x.tani.mesaj.includes("BLK-BOS")), [true]);
  assert.equal(t.filter((x) => x.tani.kod === "adımsız-kapsayıcı").length, 0, "boş Blok katmansız olarak bir kez konuşmalı");
});

test("Adımsız kapsayıcı yalnız en üstteki boş kapsayıcıda BİLGİ verir; çağrıyla dolan Faz boş sayılmaz", () => {
  const t = blokYapisi({
    "p/is/plan/faz.sar": `Faz( kod: FAZ-BOS, ad: "boş" )\n` +
      `Faz( kod: FAZ-CAGIRAN, ad: "ç" ) {\n  çağır BLK-UZAK\n}\n` +
      `Faz( kod: FAZ-Z, ad: "z" ) {\n  Blok( kod: BLK-Z, ne: "g" ) {\n    Katman( kod: KAT-Z1, ad: "k" ) {\n      AltKatman( kod: ALT-Z1, ad: "m" ) {\n${adim("ADM-Z1", "beklemede")}\n${adim("ADM-Z2", "beklemede")}\n      }\n    }\n    Katman( kod: KAT-ISSIZ, ad: "k2" ) {\n      AltKatman( kod: ALT-ISSIZ, ad: "m2" )\n    }\n  }\n}\n`,
    "p/is/plan/uzak.sar": `Blok( kod: BLK-UZAK, ne: "g" ) {\n  Katman( kod: KAT-U, ad: "k" ) {\n    AltKatman( kod: ALT-U, ad: "m" ) {\n${adim("ADM-U1", "beklemede")}\n${adim("ADM-U2", "beklemede")}\n    }\n  }\n}\n`,
  });
  const bos = t.filter((x) => x.tani.kod === "adımsız-kapsayıcı").map((x) => x.tani.mesaj.match(/"([^"]+)"/)![1]).sort();
  assert.deepEqual(bos, ["FAZ-BOS", "KAT-ISSIZ"]);
});

test("tek Adımlı Blok BİLGİ verir; doğuş iskeleti ve ders dünyası muaftır", () => {
  const tekBlok = (kod: string, adimKodu: string): string =>
    `Faz( kod: FAZ-${kod}, ad: "f" ) {\n  Blok( kod: BLK-${kod}, ne: "g" ) {\n    Katman( kod: KAT-${kod}, ad: "k" ) {\n      AltKatman( kod: ALT-${kod}, ad: "m" ) {\n${adim(adimKodu, "beklemede")}\n      }\n    }\n  }\n}\n`;
  const t = blokYapisi({
    "p/is/plan/tek.sar": tekBlok("TEK", "ADM-TEK"),
    "p/is/plan/ilk_plan.sar": tekBlok("DOGUS", DOGUS_ISKELETI_ADIMI),
    "ogreti/ornek/tek.sar": tekBlok("DERS", "ADM-DERS"),
  }).filter((x) => x.tani.kod === "tek-adımlı-blok");
  assert.deepEqual(t.map((x) => x.dosya), ["p/is/plan/tek.sar"]);
});

test("doğuş şablonu iskelet Adımının kodunu hâlâ taşır (muafiyetin dayanağı bayatlamaz)", () => {
  const sablon = readFileSync(fileURLToPath(new URL("../../../ogreti/sablon/dogus/ilk_plan.sar", import.meta.url)), "utf8");
  assert.ok(sablon.includes(`kod: ${DOGUS_ISKELETI_ADIMI},`), "doğuş şablonunun kuruluş Adımı kodu değişmiş; muafiyet sabitini de güncelle");
});

test("yüz tutarlılığı sicilin tarihsel kayıt düzeyini sapma saymaz, başka bir alçak düzeyi sayar", () => {
  const yuzUyumsuz = (tanilar: Tani[]): number => orkestrasyonTanilari({
    uretilen: tanilar.map((tani) => ({ dosya: "a.sar", tani })),
    projeKapisi: [], projeKodlari: new Set<string>(), atlananKapilar: [],
    sicil: new Set(YENI_TANI_KODLARI), anaEtiket: "ana.sar",
  }).filter((x) => x.tani.kod === "tanı-yüzü-uyumsuz").length;
  const tani = (kod: string, duzey: Tani["duzey"]): Tani =>
    ({ duzey, kod, mesaj: "m", satir: 1, sutun: 1, oneri: "Yapıştır-düzelt: `Faz( kod: FAZ-A )` yaz." });
  // Aynı koşumda canlı ihlal ile tarihsel kayıt birlikte görünebilir.
  assert.equal(yuzUyumsuz([tani("ters-faz-bağımlılığı", "hata"), tani("ters-faz-bağımlılığı", "bilgi")]), 0);
  assert.equal(yuzUyumsuz([tani("yabancı-faz-bağı", "uyarı"), tani("yabancı-faz-bağı", "bilgi")]), 0);
  // Sicilin izin vermediği alçak düzey sapmadır.
  assert.equal(yuzUyumsuz([tani("ters-faz-bağımlılığı", "uyarı")]), 1);
  assert.equal(yuzUyumsuz([tani("katmansız-blok", "bilgi")]), 1);
  // Tarihsel düzeyi olmayan tanı indirilemez.
  assert.throws(() => tarihselTani(tani("katmansız-blok", "uyarı")), /tarihsel kayıt düzeyi sicilde yok/);
});

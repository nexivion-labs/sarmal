// ═══════════════════════════════════════════════════════════════════════════
// cati-proje-kenari.test.ts — 🏛️ KPS-CAT-A01 · Çatının Projelerini Evlat Edinmesi (MIM-1.1)
//
//   MIM-1.1 hükmü ÇalışmaAlanının en az bir bağımsız Proje kökünü KAPSADIĞINI
//   söyler; motor bu kapsamayı hiç kurmuyordu. Ölçüm (Founder 2026-09-10):
//   çatı kökünden çözülen graf dört bin dört yüz üç düğüm döndürüyor, çalışma
//   alanı düğümü grafta duruyor, fakat sarmal · laboratuvar ve orkestrasyon
//   Projeleri onun ALTINDA değil YANINDA öksüz duruyordu; çatı ile Proje
//   arasında tek bir kenar yoktu. Kusurun bedeli şudur: hiçbir yüzey ağaçları
//   yan yana dizemez, çünkü hangi ağacın hangi çatıya ait olduğu graftan
//   okunamaz.
//
//   Nöbetler onarımın iki yüzünü birlikte ölçer: bağın KURULDUĞU yer (Proje
//   kökü, çatının ilan ettiği bir Kitaplık ya da Rafın altında yaşıyorsa) ve
//   KURULMADIĞI yer (ilan yoksa, ilan iç raftan geliyorsa ya da aynı derinlikte
//   iki ayrı çatı kodu varsa). İkincisi birincisi kadar önemlidir, çünkü
//   tesadüfî bir klasör komşuluğunu bağ sayan bir motor, panelde yanlış
//   aidiyeti gerçek gibi gösterir. Bağın kurulamadığı hâl ayrıca SUSMAZ:
//   `catisiz` listesi susmanın kendisini ölçülebilir kılar.
// ═══════════════════════════════════════════════════════════════════════════

import { test } from "node:test";
import assert from "node:assert/strict";
import { belirtecle } from "../src/belirtec.ts";
import { ayristir } from "../src/ayristirici.ts";
import type { Program } from "../src/sozdizim.ts";
import { dagKur } from "../src/dag.ts";
import { grafCikar, grafOzetYuzu } from "../src/graf.ts";
import { catiKapsamlari, catiIlaniProjeleri, dizindenIndeks, dosyaOkuGuvenli, gezinRaporu } from "../src/kimlik.ts";
import { programlariYukle } from "../src/denetci.ts";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

function progla(kaynaklar: Record<string, string>): Map<string, Program> {
  return new Map(Object.entries(kaynaklar).map(([dosya, k]) => [dosya, ayristir(belirtecle(k))]));
}

/** Bir Proje kökü: kendi anadizini, kendi teknolojisi. */
const projeKoku = (ek: string) =>
  `Proje( kod: PRJ-${ek}, ad: "${ek} Projesi", rejim: katı ) { Teknoloji( kod: TEK-${ek}, ad: "${ek} tekniği" ) }`;

/** Çatı ilanı: iki kardeş projeyi Kitaplık satırıyla duyurur (Founder hükmü 2026-09-09). */
const catiIlani = `
ÇalışmaAlanı( kod: CAL-CATI, ad: "Sınav Çatısı", ne: "İki kardeş projeyi saran çatı." ) {
  Kitaplık( kod: KTP-A, yol: "a/", ne: "Birinci proje." )
  Kitaplık( kod: KTP-B, yol: "b/", ne: "İkinci proje." )
  Kitaplık( kod: KTP-OZ, yol: "oz/", ne: "Çatının kendi özü." ) {
    Raf( kod: RAF-SNF, yol: "siniflama/", ne: "İç raf — yolu KTP-OZ'a görelidir." )
  }
}`;

/** İki projeli bir çatı: çatı ilanı kökte, projeler kendi kitaplıklarında. */
function catiFiksturu(ek: Record<string, string> = {}): Map<string, Program> {
  return progla({
    "cati_anadizin.sar": catiIlani,
    "a/a_anadizin.sar": projeKoku("A"),
    "b/b_anadizin.sar": projeKoku("B"),
    ...ek,
  });
}

// ── ① Bağın KURULDUĞU yer ────────────────────────────────────────────────────

test("KPS-CAT-A01 · çatının ilan ettiği her Proje kökünün kapsayanı çalışma alanı düğümüdür", () => {
  const dag = dagKur(catiFiksturu());
  assert.equal(dag.dugumler.get("PRJ-A")!.kapsayan, "CAL-CATI");
  assert.equal(dag.dugumler.get("PRJ-B")!.kapsayan, "CAL-CATI");
  // Çatının kendisi köktedir; kimse onu kapsamaz.
  assert.equal(dag.dugumler.get("CAL-CATI")!.kapsayan, undefined);
  // Bağ kurulduğunda susma ölçümü BOŞTUR — kurulan bağ kusur olarak sayılmaz.
  assert.deepEqual(dag.catisiz, []);
});

test("KPS-CAT-A01 · zincir Adımdan ÇATIYA kesintisiz yürür (iki çevrim üst üste biner)", () => {
  const dag = dagKur(catiFiksturu({
    "a/is/plan/faz.sar": `
      Faz( kod: FAZ-A, ad: "A Mevsimi", hedefTarih: "2026-09" ) {
        Blok( kod: BLK-A, ne: "A gövdesinin işi tam cümleyle yazılmıştır." ) {
          Katman( kod: KAT-A, ad: "A Katmanı", kullanır: TEK-A ) {
            AltKatman( kod: ALT-A, ad: "A Alt Katmanı", departman: motor ) {
              Adım( kod: ADM-A, durum: beklemede, ne: "A işini yürütmek." )
            }
          }
        }
      }`,
  }));
  const yukari = (kod: string): string[] => {
    const zincir: string[] = [];
    let a = dag.dugumler.get(kod)?.kapsayan;
    while (a) { zincir.push(a); a = dag.dugumler.get(a)?.kapsayan; }
    return zincir;
  };
  // KPS-FAZ-A01 Adımı Projeye taşır; KPS-CAT-A01 Projeyi çatıya taşır. Kabul
  // ölçütü zincirin KESİNTİSİZ olmasıdır: bir Adımın hangi çatıda yaşadığı
  // artık dosya yoluna değil grafın kendisine sorulur.
  assert.deepEqual(yukari("ADM-A"), ["ALT-A", "KAT-A", "BLK-A", "FAZ-A", "PRJ-A", "CAL-CATI"]);

  // Çatı kökü sorulduğunda alt-graf her iki Projeyi de GERÇEKTEN taşır.
  const g = grafCikar(dag, "CAL-CATI")!;
  const projeler = g.düğümler.filter((d) => d.tip === "Proje").map((d) => d.kod).sort();
  assert.deepEqual(projeler, ["PRJ-A", "PRJ-B"]);
});

test("KPS-CAT-A01 · iç içe yazım DOKUNULMAZ: çatının içine yazılmış Proje klasörden çatı almaz", () => {
  const dag = dagKur(progla({
    "cati_anadizin.sar": `
      ÇalışmaAlanı( kod: CAL-IC, ad: "İç Çatı", ne: "Projeyi kendi gövdesinde taşıyan çatı." ) {
        ${projeKoku("IC")}
      }`,
  }));
  // Bağ zaten yazılmıştır; çevrim onu yeniden hesaplamaz ve değiştirmez.
  assert.equal(dag.dugumler.get("PRJ-IC")!.kapsayan, "CAL-IC");
});

// ── ② Bağın KURULMADIĞI yer — sessiz başarı taklidi yasağı ───────────────────

test("KPS-CAT-A01 · çatısı olmayan tek projeli bir depoda hiçbir şey değişmez", () => {
  const dag = dagKur(progla({ "a/a_anadizin.sar": projeKoku("A") }));
  assert.equal(dag.dugumler.get("PRJ-A")!.kapsayan, undefined);
  // Bağlanacak çatı YOKTUR: olmayan bir bağın kurulamaması kusur değildir ve
  // ölçüm listesi boş kalır. Tek projeli deponun regresyon kalkanı budur.
  assert.deepEqual(dag.catisiz, []);
});

test("KPS-CAT-A01 · İLANSIZ klasör kardeş sayılmaz: çatı yalnız duyurduğunu evlat edinir", () => {
  const dag = dagKur(catiFiksturu({ "c/c_anadizin.sar": projeKoku("C") }));
  // c/ diskte çatının yanındadır fakat çatı ilanında bir satırı yoktur;
  // tesadüfî komşuluk aidiyet doğurmaz.
  assert.equal(dag.dugumler.get("PRJ-C")!.kapsayan, undefined);
  assert.equal(dag.dugumler.get("PRJ-A")!.kapsayan, "CAL-CATI");
  assert.deepEqual(dag.catisiz, []);
});

test("KPS-CAT-A01 · İÇ RAF çatı kapsamı doğurmaz: yol kendi ebeveynine görelidir", () => {
  // RAF-SNF yolu "siniflama/" olarak yazılmıştır ve KTP-OZ'a görelidir. Düz
  // okuma bunu çatı köküne "siniflama/" diye yazsaydı, kökteki siniflama/
  // klasöründe yaşayan bir Proje çatıya YANLIŞ bağlanırdı.
  const dag = dagKur(catiFiksturu({ "siniflama/s_anadizin.sar": projeKoku("SNF") }));
  assert.equal(dag.dugumler.get("PRJ-SNF")!.kapsayan, undefined);
});

test("KPS-CAT-A01 · AYRIŞIK çatı: aynı derinlikte iki ayrı ÇalışmaAlanı kodu varsa bağ kurulmaz ve SUSULMAZ", () => {
  const dag = dagKur(progla({
    "birinci_anadizin.sar": `ÇalışmaAlanı( kod: CAL-BIR, ad: "Birinci Çatı" ) { Kitaplık( kod: KTP-1, yol: "a/", ne: "A." ) }`,
    "ikinci_anadizin.sar": `ÇalışmaAlanı( kod: CAL-IKI, ad: "İkinci Çatı" ) { Kitaplık( kod: KTP-2, yol: "a/", ne: "A." ) }`,
    "a/a_anadizin.sar": projeKoku("A"),
  }));
  // İki aday eşit derinliktedir ve kodları ayrışıktır: hangi çatının çocuğu
  // olduğu ölçülemez, dolayısıyla bağ kurulmaz (tahmin bağ sayılmaz).
  assert.equal(dag.dugumler.get("PRJ-A")!.kapsayan, undefined);
  // Susma SESSİZ DEĞİLDİR: çatının rafı altında yaşayıp bağlanamayan kök
  // adıyla ölçülür ve graf yüzünde görünür.
  assert.deepEqual(dag.catisiz.map((c) => c.proje), ["PRJ-A"]);
  const yuz = grafOzetYuzu(grafCikar(dag)!);
  assert.match(yuz, /ÇATIYA BAĞLANAMAYAN PROJE KÖKÜ \(1\)/);
  assert.match(yuz, /PRJ-A/);
});

test("KPS-CAT-A01 · ders dünyasındaki örnek çatı ürün Projesini evlat edinemez", () => {
  const dag = dagKur(progla({
    "ogreti/ornek/cati/ornek_anadizin.sar":
      `ÇalışmaAlanı( kod: CAL-ORNEK, ad: "Örnek Çatı" ) { Kitaplık( kod: KTP-O, yol: "a/", ne: "A." ) }`,
    "ogreti/ornek/cati/a/a_anadizin.sar": projeKoku("ORNEK"),
  }));
  // Şablon ile örnek kendi evrenlerinde yaşar; ders dünyası gerçek bir sınır
  // doğurmaz ve ürün ağacının aidiyetine karışmaz (INDEKS_DISI).
  assert.equal(dag.dugumler.get("PRJ-ORNEK")!.kapsayan, undefined);
  assert.deepEqual(dag.catisiz, []);
});

test("KPS-CAT-A01 · ders dünyası kapısı KENDİ kademesinde ölçülür: örnek çatı hiç kapsam doğurmaz", () => {
  // Mutasyon ölçümü (2026-09-10): `catiKapsamlari` içindeki ders kapısı
  // sökülünce yukarıdaki dag nöbeti YEŞİL kaldı, çünkü aynı hüküm bir kademe
  // aşağıda `kesinCatiKapsami` ile `catiAltindaMi` içinde de duruyor ve dosya
  // orada eleniyordu. Yeşil kalan bir mutasyon, ölçülmemiş bir davranıştır:
  // kapı bu yüzden KENDİ kademesinde, kapsam listesinin üstünde sınanır.
  // Kapının yükü gerçektir, çünkü kapsam listesini süzmeyen bir okur (kardeşi
  // `sahipProjeKapsami` böyledir) ders dünyasındaki bir ilanı gerçek sanar.
  const örnek = catiKapsamlari(progla({
    "ogreti/ornek/cati/ornek_anadizin.sar":
      `ÇalışmaAlanı( kod: CAL-ORNEK, ad: "Örnek Çatı" ) { Kitaplık( kod: KTP-O, yol: "a/", ne: "A." ) }`,
  }));
  assert.deepEqual(örnek, []);

  // Aynı ilan ÜRÜN ağacında yazıldığında kapsam gerçekten doğar — kapı ders
  // dünyasını eler, ilanın kendisini değil.
  const ürün = catiKapsamlari(progla({ "cati_anadizin.sar": catiIlani }));
  assert.deepEqual(ürün.map((k) => `${k.kod}:${k.onek}`), ["CAL-CATI:a/", "CAL-CATI:b/", "CAL-CATI:oz/"]);
});

test("KPS-CAT-A01 · çevrim YALNIZ Proje tipine iner; öteki köksüz düğümler çatıya bağlanmaz", () => {
  const dag = dagKur(catiFiksturu({
    "a/oz/kayit/kayitlar.sar": `
      Hatırlatıcı( kod: HTR-A, ne: "A hatırlatıcısının gövdesi tam cümleyle yazılmıştır." )
      Karar( kod: KRR-A, ne: "A kararının gövdesi tam cümleyle yazılmıştır." )`,
  }));
  // Kanon, karar ve kayıt düğümleri üretim omurgasında yaşamaz; bağları
  // `dayanak`, `referans` ve `hatırlat` gibi TİPLİ kenarlardan kurulur ve
  // içerme kenarı almaları omurganın anlamını boşaltırdı (MIM-1).
  assert.equal(dag.dugumler.get("HTR-A")!.kapsayan, undefined);
  assert.equal(dag.dugumler.get("KRR-A")!.kapsayan, undefined);
});


// ═══════════════════════════════════════════════════════════════════════════
// ③ KPS-CAT-A02 · ÇALIŞMA ALANININ PROJELERİNİ GÖSTERMESİ (MIM-1.1 · YUZ-3.1)
//
//   Ölçüm (2026-09-28, gerçek çatı): yukarıdaki nöbetler yeşildi ve HAKLIYDI —
//   grafta çatı ile üç Proje kökü arasındaki kapsama kenarı yerindeydi. Kusur
//   grafta değil KARTTAYDI: bağlam kartı yalnız tanımın kendi dosyasının
//   sözdizim ağacını okuyor, çatı bağı ise dosyalar arası bir kenar olduğu için
//   kartta hiçbir zaman görünmüyordu. Nöbet yalnız `dagKur` çıktısını ölçtüğünden
//   kartın bu kenarı göstermediğini hiç soramıyordu; çatı ilanının Raf'tan
//   Kitaplık'a çevrilmesi bu yüzden sebep değildi ve geri çevirmek de bir şey
//   değiştirmedi. Aşağıdaki sınamalar dört yüzü aynı diskte birlikte ölçer: graf,
//   bağlam kartı, graf özet yüzü ve eklenti anahattının çekirdeği. İlan hem
//   Kitaplık hem Raf yazımıyla sınanır, çünkü Raf geriye dönük uyumdur.
//
//   Mutasyon kanıtları (her biri tek başına uygulandı, nöbet kırmızıya döndü,
//   kaynak cp yedeğinden geri kondu):
//     M1 · kimlik.ts'te karta çatı bağını işleyen çağrı söküldü → kart sınamaları kırmızı.
//     M2 · dag.ts'te çatı çevrimi söküldü (catiKoku daima tanımsız) → Kitaplık ve Raf graf sınamaları kırmızı.
//     M3 · catiRafYollari yalnız Kitaplık okuyacak biçimde daraltıldı → Raf ilanı sınamaları kırmızı.
//     M4 · kart evrenindeki sentetik gövde süzgeci söküldü → fikstür sınaması kırmızı.
//     M5 · graf özet yüzündeki proje bölümü söküldü → özet sınaması kırmızı.
// ═══════════════════════════════════════════════════════════════════════════

function diskCatisi(ilanTipi: "Kitaplık" | "Raf", ek: Record<string, string> = {}): string {
  const kok = mkdtempSync(join(tmpdir(), "sarmal-cati-yuzu-"));
  const onek = ilanTipi === "Kitaplık" ? "KTP" : "RAF";
  const dosyalar: Record<string, string> = {
    "cati_anadizin.sar": `
ÇalışmaAlanı( kod: CAL-SINAV, ad: "Sınav Çatısı", ne: "İki kardeş projeyi saran çatı." ) {
  ${ilanTipi}( kod: ${onek}-A, yol: "a/", ne: "Birinci proje." )
  ${ilanTipi}( kod: ${onek}-B, yol: "b/", ne: "İkinci proje." )
}`,
    "a/a_anadizin.sar": projeKoku("A"),
    "b/b_anadizin.sar": projeKoku("B"),
    ...ek,
  };
  for (const [yol, metin] of Object.entries(dosyalar)) {
    mkdirSync(dirname(join(kok, yol)), { recursive: true });
    writeFileSync(join(kok, yol), metin, "utf8");
  }
  return kok;
}

const kart = (kok: string, kod: string): string => {
  const rapor = gezinRaporu(dizindenIndeks(kok), kod, dosyaOkuGuvenli);
  return rapor.split("\n\n").find((b) => b.startsWith("BAĞLAM KARTI")) ?? "";
};

for (const ilanTipi of ["Kitaplık", "Raf"] as const) {
  test(`KPS-CAT-A02 · ${ilanTipi} ilanı · diskteki iki projeli çatıda graf iki Proje kökünü de çatıya bağlar`, () => {
    const kok = diskCatisi(ilanTipi);
    try {
      const dag = dagKur(programlariYukle(kok).programlar);
      assert.equal(dag.dugumler.get("PRJ-A")!.kapsayan, "CAL-SINAV");
      assert.equal(dag.dugumler.get("PRJ-B")!.kapsayan, "CAL-SINAV");
      assert.deepEqual(dag.catisiz, []);
    } finally { rmSync(kok, { recursive: true, force: true }); }
  });

  test(`KPS-CAT-A02 · ${ilanTipi} ilanı · bağlam kartı çalışma alanının projelerini çocukları, projenin çatısını üst zinciri olarak gösterir`, () => {
    const kok = diskCatisi(ilanTipi);
    try {
      const cati = kart(kok, "CAL-SINAV");
      assert.match(cati, /çocuklar \(4\):.*Proje PRJ-A \(A Projesi\).*Proje PRJ-B \(B Projesi\)/);
      const a = kart(kok, "PRJ-A");
      assert.match(a, /üst zincir: ÇalışmaAlanı CAL-SINAV \(Sınav Çatısı\)/);
      assert.match(a, /kardeşler \(1\): Proje PRJ-B/);
    } finally { rmSync(kok, { recursive: true, force: true }); }
  });

  test(`KPS-CAT-A02 · ${ilanTipi} ilanı · anahat çekirdeği her ilan satırının altına o klasörün Proje kökünü koyar`, () => {
    const kok = diskCatisi(ilanTipi);
    try {
      const dosya = join(kok, "cati_anadizin.sar");
      const program = programlariYukle(kok).programlar.get("cati_anadizin.sar")!;
      const onek = ilanTipi === "Kitaplık" ? "KTP" : "RAF";
      const harita = catiIlaniProjeleri(dosya, program);
      assert.deepEqual([...harita].map(([raf, b]) => `${raf}→${b.map((x) => x.proje).join(",")}`), [`${onek}-A→PRJ-A`, `${onek}-B→PRJ-B`]);
    } finally { rmSync(kok, { recursive: true, force: true }); }
  });
}

test("KPS-CAT-A02 · graf özet yüzü çalışma alanının projelerini adıyla basar; tek projeli depoda bölüm doğmaz", () => {
  const kok = diskCatisi("Kitaplık");
  try {
    const yuz = grafOzetYuzu(grafCikar(dagKur(programlariYukle(kok).programlar))!);
    assert.match(yuz, /ÇALIŞMA ALANI CAL-SINAV — PROJELERİ \(2\):\n {3}PRJ-A\n {3}PRJ-B/);
  } finally { rmSync(kok, { recursive: true, force: true }); }
  const tek = grafOzetYuzu(grafCikar(dagKur(progla({ "a/a_anadizin.sar": projeKoku("A") })))!);
  assert.doesNotMatch(tek, /ÇALIŞMA ALANI/);
});

test("KPS-CAT-A02 · kart tek projeli depoda ve ilansız klasörde çatı uydurmaz", () => {
  const kok = diskCatisi("Kitaplık", { "c/c_anadizin.sar": projeKoku("C") });
  try {
    assert.doesNotMatch(kart(kok, "PRJ-C"), /üst zincir/);
    assert.doesNotMatch(kart(kok, "CAL-SINAV"), /PRJ-C/);
    assert.doesNotMatch(kart(join(kok, "a"), "PRJ-A"), /üst zincir|kardeşler/);
  } finally { rmSync(kok, { recursive: true, force: true }); }
});

test("KPS-CAT-A02 · kartın evreni grafın evrenidir: sınama fikstüründeki Proje çatıya bağlanmaz", () => {
  // Gerçek çatıda ölçüldü: indeks sınama fikstürlerini tanım olarak görür, yükleyici
  // ise onları ayrıştırmaz; süzgeç olmadan kart grafın bilmediği bir projeyi
  // çalışma alanının çocuğu sayıyordu.
  const kok = diskCatisi("Kitaplık", { "a/sinama/fikstur/f.sar": projeKoku("FIKSTUR") });
  try {
    assert.equal(dagKur(programlariYukle(kok).programlar).dugumler.has("PRJ-FIKSTUR"), false);
    assert.doesNotMatch(kart(kok, "CAL-SINAV"), /PRJ-FIKSTUR/);
  } finally { rmSync(kok, { recursive: true, force: true }); }
});

test("KPS-CAT-A02 · ayrışık çatıda kart da susar: bağ tekil değilse ne zincir ne çocuk yazılır", () => {
  const kok = diskCatisi("Kitaplık", {
    "ikinci_anadizin.sar": `ÇalışmaAlanı( kod: CAL-IKI, ad: "İkinci Çatı" ) { Kitaplık( kod: KTP-2, yol: "a/", ne: "A." ) }`,
  });
  try {
    assert.doesNotMatch(kart(kok, "PRJ-A"), /üst zincir/);
    assert.doesNotMatch(kart(kok, "CAL-SINAV"), /PRJ-A/);
    assert.match(kart(kok, "CAL-SINAV"), /PRJ-B/);
  } finally { rmSync(kok, { recursive: true, force: true }); }
});

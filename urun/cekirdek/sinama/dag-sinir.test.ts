// dag-sinir.test.ts — 🛡️ PRF-KP-B05 · Yığın gövdesinin sınır güvenliği (2026-08-30)
//
//   `topolojikSira` motorun kullanıcı projelerinde de koşar; bozuk bir graf çökme
//   ya da sonsuz döngü üretmemelidir. Buradaki nöbetler bozuk girdileri (negatif
//   in-derece, grafta olmayan uç, öz-döngü, boş graf, tek düğüm) ve on bin düğümlük
//   ölçeği `dagKur` yolundan geçmeden doğrudan `Dag` nesnesi olarak kurar; her
//   koşuda gövdenin çökmeden ve iki saniyelik sınırın altında sonlandığını, döngü
//   kümesini eski gövdeyle aynı kuralla verdiğini ölçer.
//
//   Süre sınırı iki katmanlıdır. Eşzamanlı gövde için duvar saati ölçümü ve
//   node:test süre seçeneği kullanılır; fakat eşzamanlı bir işlev ne `AbortSignal`
//   görebilir ne de olay döngüsünü serbest bırakır, bu yüzden gerçek bir takılmayı
//   ancak ayrı bir iş parçacığında koşup sınırda parçacığı sonlandıran sert nöbet
//   yakalar. Sert nöbet aynı girdileri ikinci kez, iş parçacığı içinde koşar ve
//   sonucun süreç içi koşuyla birebir olduğunu da ölçer.
// ═══════════════════════════════════════════════════════════════════════════

import { test } from "node:test";
import assert from "node:assert/strict";
import { Worker } from "node:worker_threads";
import { topolojikSira } from "../src/dag.ts";
import type { Dag, DagDugum, SiraSonuc, SiraOlcumu } from "../src/dag.ts";

/** Her koşunun üst sınırı. Bilerek cömerttir: en ağır fikstür bile onlarca
 *  milisaniyede sonlanır, sınır yalnız takılmayı ve çökmeyi yakalamak içindir. */
const SURE_SINIRI_MS = 2000;

/** Ölçek fikstürlerinin düğüm sayısı. */
const OLCEK = 10_000;

/** Bir düğümün ham yazımı: kod, öncüller ve ardıllar. Listeler bilerek
 *  bağımsızdır; simetrik olmayan ve kopuk girdi bu üçlüyle üretilir. */
type HamDugum = [kod: string, oncekiler: string[], sonrakiler: string[]];

/** Doğrudan `Dag` kurar ve `dagKur` yolunu atlar; `kenarEkle` içindeki içerme
 *  denetiminin hiç görmediği bozuk kenar listeleri ancak bu yoldan sınanabilir.
 *  Aynı yardımcı dag.test.ts içinde de yaşar; iki sınama dosyası birbirinden
 *  ithal etmesin diye burada yeniden yazılmıştır. */
function hamDag(satirlar: HamDugum[]): Dag {
  const dugumler = new Map<string, DagDugum>();
  for (const [kod, oncekiler, sonrakiler] of satirlar) {
    dugumler.set(kod, { kod, tip: "Adım", dosya: "sinir.sar", satir: 0, sutun: 0,
      oncekiler: [...oncekiler], sonrakiler: [...sonrakiler] });
  }
  return { dugumler, kopuk: [], oz: [], disProje: [] };
}

/** Gövdeyi süreç içinde duvar saatiyle koşar. Çökerse hatayı nedenle birlikte
 *  yükseltir, sınırı aşarsa ölçülen süreyi bildirir; ikisi de nöbeti kırmızıya çeker. */
function sinirdaKos(dag: Dag, ad: string): { sonuc: SiraSonuc; sureMs: number } {
  const baslangic = performance.now();
  let sonuc: SiraSonuc;
  try {
    sonuc = topolojikSira(dag);
  } catch (hata) {
    throw new Error(`${ad}: gövde çöktü — ${(hata as Error).message}`, { cause: hata });
  }
  const sureMs = performance.now() - baslangic;
  assert.ok(sureMs < SURE_SINIRI_MS, `${ad}: gövde ${sureMs.toFixed(1)} ms sürdü; sınır ${SURE_SINIRI_MS} ms`);
  return { sonuc, sureMs };
}

/** Sonuç sözleşmesi: sıra ile döngü ayrıktır, birleşimleri grafın düğüm kümesine
 *  eşittir ve hiçbiri grafta olmayan bir kodu taşımaz. Bozuk girdide bu sözleşme
 *  kırılırsa döngü kümesi sahte düğümlerle dolar ya da bir düğüm iki kez yerleşir. */
function sozlesmeyiOlc(dag: Dag, sonuc: SiraSonuc, ad: string): void {
  const gorulen = new Set<string>();
  for (const kod of [...sonuc.sira, ...sonuc.dongu]) {
    assert.ok(dag.dugumler.has(kod), `${ad}: ${kod} grafta yok, fakat sonuçta geçiyor`);
    assert.ok(!gorulen.has(kod), `${ad}: ${kod} sonuçta iki kez geçiyor`);
    gorulen.add(kod);
  }
  assert.equal(gorulen.size, dag.dugumler.size, `${ad}: sonuç grafın düğüm kümesini birebir kapsamıyor`);
}

/** Bozuk girdi tablosu. Beklenen çıktılar eski gövdenin kuralıdır: in-derecesi
 *  hiç tam sıfıra oturmayan düğüm döngüdedir ve grafta olmayan bir uç hiçbir
 *  kümeye girmez. */
const BOZUK_GIRDILER: ReadonlyArray<{ ad: string; kur: () => Dag; sira: string[]; dongu: string[] }> = [
  {
    // A'nın ardıl listesinde B üç kez, B'nin öncül listesinde A bir kez geçer;
    // A yerleşince B'nin in-derecesi sıfıra iner ve yığına girer, sonra eksi ikiye
    // düşer. Çıkarma anı doğrulaması onu yerleştirmez ve B döngüye düşer.
    ad: "negatif in-derece",
    kur: () => hamDag([["A", [], ["B", "B", "B"]], ["B", ["A"], []]]),
    sira: ["A"], dongu: ["B"],
  },
  {
    // A grafta olmayan bir hedefe ve gerçek C'ye gider; B grafta olmayan bir
    // kaynaktan beslenir. Sahte uçlar hiçbir kümeye girmez, C yerleşir, B'nin
    // in-derecesi hiç inmediği için B döngüde kalır.
    ad: "grafta olmayan uç",
    kur: () => hamDag([["A", [], ["YOK-HEDEF", "C"]], ["B", ["YOK-KAYNAK"], []], ["C", ["A"], []]]),
    sira: ["A", "C"], dongu: ["B"],
  },
  {
    // A kendi öncülü ve kendi ardılıdır; in-derecesi hiç sıfıra inmez.
    ad: "öz-döngü",
    kur: () => hamDag([["A", ["A"], ["A"]]]),
    sira: [], dongu: ["A"],
  },
  {
    ad: "boş graf",
    kur: () => hamDag([]),
    sira: [], dongu: [],
  },
  {
    ad: "tek düğüm",
    kur: () => hamDag([["A", [], []]]),
    sira: ["A"], dongu: [],
  },
];

for (const girdi of BOZUK_GIRDILER) {
  test(`PRF-KP-B05 · bozuk girdi · ${girdi.ad}: gövde sonlanır, çökmez ve döngü kümesini doğru verir`, { timeout: SURE_SINIRI_MS }, () => {
    const dag = girdi.kur();
    const { sonuc } = sinirdaKos(dag, girdi.ad);
    assert.deepEqual(sonuc, { sira: girdi.sira, dongu: girdi.dongu }, `${girdi.ad}: sıra ya da döngü beklenenden sapıyor`);
    sozlesmeyiOlc(dag, sonuc, girdi.ad);
  });
}

// ── Ölçek ──────────────────────────────────────────────────────────────────

/** Sıfırla doldurulmuş beş haneli kod; dizgi sırası sayı sırasıyla çakışır,
 *  böylece beklenen sıra düğümlerin kuruluş sırasına eşittir. */
const olcekKodu = (i: number): string => "D" + String(i).padStart(5, "0");

/** Kenarsız on bin düğüm: hepsi aynı anda hazırdır ve yığın en geniş hâlini alır. */
function bagimsizDag(n: number): Dag {
  const satirlar: HamDugum[] = [];
  for (let i = 0; i < n; i++) satirlar.push([olcekKodu(i), [], []]);
  return hamDag(satirlar);
}

/** On bin düğümlük zincir: her düğüm bir öncekine bağlıdır, yığın hiç birden
 *  fazla düğüm tutmaz ve yerleşim en derin sıralı yolu izler. */
function zincirDag(n: number): Dag {
  const satirlar: HamDugum[] = [];
  for (let i = 0; i < n; i++) {
    satirlar.push([olcekKodu(i), i === 0 ? [] : [olcekKodu(i - 1)], i === n - 1 ? [] : [olcekKodu(i + 1)]]);
  }
  return hamDag(satirlar);
}

/** Yinelenen yelpaze: kök düğümün ardıl listesinde diğer her düğüm üç kez, o
 *  düğümlerin öncül listesinde kök bir kez geçer. Negatif in-derece girdisinin
 *  ölçekli hâlidir: yaklaşık otuz bin kenar, kök dışındaki her düğüm döngüde. */
function yinelenenYelpazeDag(n: number): Dag {
  const kok = olcekKodu(0);
  const ardillar: string[] = [];
  const satirlar: HamDugum[] = [[kok, [], ardillar]];
  for (let i = 1; i < n; i++) {
    ardillar.push(olcekKodu(i), olcekKodu(i), olcekKodu(i));
    satirlar.push([olcekKodu(i), [kok], []]);
  }
  return hamDag(satirlar);
}

test("PRF-KP-B05 · ölçek · on bin bağımsız düğümlü grafta gövde sınırın altında sonlanır ve her düğüm sıraya girer", { timeout: SURE_SINIRI_MS }, (t) => {
  const dag = bagimsizDag(OLCEK);
  const { sonuc, sureMs } = sinirdaKos(dag, "on bin bağımsız düğüm");
  t.diagnostic(`on bin bağımsız düğüm: ${sureMs.toFixed(1)} ms`);
  assert.equal(sonuc.sira.length, OLCEK);
  assert.deepEqual(sonuc.dongu, []);
  assert.deepEqual(sonuc.sira, [...dag.dugumler.keys()]);
  sozlesmeyiOlc(dag, sonuc, "on bin bağımsız düğüm");
});

test("PRF-KP-B05 · ölçek · on bin düğümlük zincir ve yinelenen yelpaze sınırın altında sonlanır", { timeout: SURE_SINIRI_MS }, (t) => {
  const zincir = zincirDag(OLCEK);
  const zincirKosu = sinirdaKos(zincir, "on bin düğümlük zincir");
  t.diagnostic(`on bin düğümlük zincir: ${zincirKosu.sureMs.toFixed(1)} ms`);
  assert.deepEqual(zincirKosu.sonuc.sira, [...zincir.dugumler.keys()]);
  assert.deepEqual(zincirKosu.sonuc.dongu, []);
  sozlesmeyiOlc(zincir, zincirKosu.sonuc, "on bin düğümlük zincir");

  const yelpaze = yinelenenYelpazeDag(OLCEK);
  const yelpazeKosu = sinirdaKos(yelpaze, "yinelenen yelpaze");
  t.diagnostic(`yinelenen yelpaze (${yelpaze.dugumler.get(olcekKodu(0))!.sonrakiler.length} kenar): ${yelpazeKosu.sureMs.toFixed(1)} ms`);
  assert.deepEqual(yelpazeKosu.sonuc.sira, [olcekKodu(0)]);
  assert.equal(yelpazeKosu.sonuc.dongu.length, OLCEK - 1);
  sozlesmeyiOlc(yelpaze, yelpazeKosu.sonuc, "yinelenen yelpaze");
});

// ── Bellek: yığın büyümesi doğrusaldır ─────────────────────────────────────

/** Bellek nöbetinin ölçekleri: her adımda düğüm sayısı ikiye katlanır, böylece
 *  sayaçların düğüm sayısıyla birlikte doğrusal büyüdüğü dört noktada görünür. */
const BELLEK_OLCEKLERI: readonly number[] = [1_000, 2_000, 4_000, 8_000];

/** Sıfırlanmış ölçüm nesnesi. */
const yeniOlcum = (): SiraOlcumu => ({ ekleme: 0, azamiBoyut: 0 });

test("PRF-KP-B05 · bellek · yığına ekleme sayısı ve azami yığın boyutu düğüm sayısıyla doğrusal kalır (1.000 · 2.000 · 4.000 · 8.000)", { timeout: SURE_SINIRI_MS }, (t) => {
  for (const n of BELLEK_OLCEKLERI) {
    // Bağımsız graf: her düğüm başlangıçta hazırdır ve yığın en geniş hâlini alır;
    // ekleme sayısı ile azami boyut tam olarak düğüm sayısına oturmalıdır.
    const bagimsizOlcum = yeniOlcum();
    const bagimsiz = bagimsizDag(n);
    const bagimsizSonuc = topolojikSira(bagimsiz, bagimsizOlcum);
    t.diagnostic(`bağımsız n=${n}: ekleme=${bagimsizOlcum.ekleme} azamiBoyut=${bagimsizOlcum.azamiBoyut}`);
    assert.ok(bagimsizOlcum.ekleme <= n, `bağımsız n=${n}: ekleme ${bagimsizOlcum.ekleme} düğüm sayısını aşıyor`);
    assert.ok(bagimsizOlcum.azamiBoyut <= n, `bağımsız n=${n}: azami boyut ${bagimsizOlcum.azamiBoyut} düğüm sayısını aşıyor`);
    assert.equal(bagimsizOlcum.azamiBoyut, n, `bağımsız n=${n}: yığın bütün hazır düğümleri aynı anda tutmalıdır`);
    assert.equal(bagimsizSonuc.sira.length, n);

    // Yinelenen yelpaze: kök dışındaki her düğüme üç yinelenen kenar gelir; yığına
    // yine de en fazla bir kez girer, çünkü in-derece tam sıfıra yalnız bir kez iner.
    const yelpazeOlcum = yeniOlcum();
    const yelpaze = yinelenenYelpazeDag(n);
    const yelpazeSonuc = topolojikSira(yelpaze, yelpazeOlcum);
    t.diagnostic(`yelpaze n=${n}: ekleme=${yelpazeOlcum.ekleme} azamiBoyut=${yelpazeOlcum.azamiBoyut}`);
    assert.ok(yelpazeOlcum.ekleme <= n, `yelpaze n=${n}: ekleme ${yelpazeOlcum.ekleme} düğüm sayısını aşıyor`);
    assert.ok(yelpazeOlcum.azamiBoyut <= n, `yelpaze n=${n}: azami boyut ${yelpazeOlcum.azamiBoyut} düğüm sayısını aşıyor`);
    assert.equal(yelpazeSonuc.dongu.length, n - 1);

    // Zincir: her an yalnız bir düğüm hazırdır; ekleme yine düğüm sayısı, boyut bir.
    const zincirOlcum = yeniOlcum();
    topolojikSira(zincirDag(n), zincirOlcum);
    t.diagnostic(`zincir n=${n}: ekleme=${zincirOlcum.ekleme} azamiBoyut=${zincirOlcum.azamiBoyut}`);
    assert.ok(zincirOlcum.ekleme <= n, `zincir n=${n}: ekleme ${zincirOlcum.ekleme} düğüm sayısını aşıyor`);
    assert.equal(zincirOlcum.azamiBoyut, 1, `zincir n=${n}: yığın birden fazla düğüm tutmamalıdır`);
  }
});

test("PRF-KP-B05 · bellek · ölçüm kancası verilmediğinde çıktı kancalı koşuyla birebir aynı kalır", { timeout: SURE_SINIRI_MS }, () => {
  const fiksturler: Array<{ ad: string; kur: () => Dag }> = [
    ...BOZUK_GIRDILER,
    { ad: "bağımsız 1.000", kur: () => bagimsizDag(1_000) },
    { ad: "zincir 1.000", kur: () => zincirDag(1_000) },
    { ad: "yelpaze 1.000", kur: () => yinelenenYelpazeDag(1_000) },
  ];
  for (const f of fiksturler) {
    const olcum = yeniOlcum();
    const kancasiz = topolojikSira(f.kur());
    const kancali = topolojikSira(f.kur(), olcum);
    assert.deepEqual(kancasiz, kancali, `${f.ad}: kanca çıktıyı değiştiriyor`);
    assert.ok(olcum.ekleme <= f.kur().dugumler.size, `${f.ad}: ekleme düğüm sayısını aşıyor`);
  }
  // Kanca verilmediğinde bozuk girdi tablosunun beklenen çıktısı da korunur.
  for (const girdi of BOZUK_GIRDILER) {
    assert.deepEqual(topolojikSira(girdi.kur()), { sira: girdi.sira, dongu: girdi.dongu }, `${girdi.ad}: kancasız çıktı beklenenden sapıyor`);
  }
});

// ── Sert süre sınırı ───────────────────────────────────────────────────────

/** Gövdeyi ayrı bir iş parçacığında koşar ve sınırda parçacığı öldürür. Eşzamanlı
 *  gövde `AbortSignal` göremeyeceği için gerçek bir takılmayı yalnız bu yol
 *  yakalar. Graf yapılandırılmış kopyayla parçacığa geçer; `Map` bu kopyada
 *  korunur. Parçacık üst sürecin bayraklarını devralmaz, çünkü tür soyma bu Node
 *  sürümünde varsayılan davranıştır ve test koşucusunun bayrakları parçacığa
 *  taşınmamalıdır. */
function sertSinirdaKos(dag: Dag, sinirMs: number): Promise<SiraSonuc> {
  const modul = new URL("../src/dag.ts", import.meta.url).href;
  const govde =
    'const { parentPort, workerData } = require("node:worker_threads");\n' +
    "import(workerData.modul).then((m) => parentPort.postMessage(m.topolojikSira(workerData.dag)));\n";
  return new Promise((resolve, reject) => {
    const parcacik = new Worker(govde, { eval: true, execArgv: [], workerData: { modul, dag } });
    const zamanlayici = setTimeout(() => {
      void parcacik.terminate();
      reject(new Error(`gövde ${sinirMs} ms içinde sonlanmadı; iş parçacığı öldürüldü`));
    }, sinirMs);
    parcacik.once("message", (sonuc: SiraSonuc) => {
      clearTimeout(zamanlayici);
      void parcacik.terminate();
      resolve(sonuc);
    });
    parcacik.once("error", (hata) => {
      clearTimeout(zamanlayici);
      reject(hata);
    });
  });
}

test("PRF-KP-B05 · sert sınır · bozuk girdiler ayrı iş parçacığında iki saniyede sonlanır ve süreç içi sonuçla birebirdir", async () => {
  for (const girdi of BOZUK_GIRDILER) {
    const dag = girdi.kur();
    const parcacikSonucu = await sertSinirdaKos(dag, SURE_SINIRI_MS);
    assert.deepEqual(parcacikSonucu, topolojikSira(dag), `${girdi.ad}: iş parçacığı sonucu süreç içi sonuçtan sapıyor`);
    assert.deepEqual(parcacikSonucu, { sira: girdi.sira, dongu: girdi.dongu }, `${girdi.ad}: iş parçacığı sonucu beklenenden sapıyor`);
  }
});

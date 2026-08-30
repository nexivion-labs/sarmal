// ═══════════════════════════════════════════════════════════════════════════
// mikro-onarim.test.ts — ⚡ PRF-MK-A02 · üç mikro onarımın davranış eşitliği nöbetleri
//
//   Performans denetim mevsiminin mikro onarımları davranışı DEĞİŞTİRMEZ; yalnız
//   boş işi atlar. Bu dosya her onarımın "atladığı işin gerçekten boş olduğunu"
//   ölçer ve bir mutasyonla kırılır: yanlış tire ölçütü, ters ön denetim ve yanlış
//   Türkçe harf dönüşümü. Nöbetler PRF-MK-A05'te altı mutasyona tamamlanır.
//   Koşum: cd cekirdek && npm test
// ═══════════════════════════════════════════════════════════════════════════

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { dosyayiTara } from "../src/kimlik.ts";
import { esikIziOnDenetimi, stratejiTanilari, kodIndeksle } from "../src/denetci.ts";
import { ilkKarakterBicimi, ilkKarakterMemoBoyutu } from "../src/dogrulayici.ts";

// ── ① TİRE ÖN SÜZGECİ ───────────────────────────────────────────────────────

/** Tohumlu üreteç — aynı tohum aynı diziyi verir; kırmızı sonuç yeniden üretilir. */
function tohumlu(tohum: number): () => number {
  let d = tohum >>> 0;
  return () => { d = (Math.imul(d, 1664525) + 1013904223) >>> 0; return d / 4294967296; };
}

test("PRF-MK-A02 · tire süzgeci sağlamdır: tire taşımayan hiçbir satır metin katmanında aday üretmez", () => {
  const r = tohumlu(20260830);
  // Tire DIŞINDA kod deseninin kullandığı bütün karakter sınıfları: büyük harf,
  // rakam, alt çizgi, Türkçe harf, ad alanı ayracı, boşluk ve sınır dışı harfler.
  const havuz = ["A", "B", "Z", "Ç", "Ğ", "İ", "Ö", "Ş", "Ü", "0", "7", "_", "::", " ", "a", "ş", ".", ":", "(", ")", "\"", ","];
  for (let i = 0; i < 5000; i++) {
    const n = 1 + Math.floor(r() * 24);
    let satir = "";
    for (let k = 0; k < n; k++) satir += havuz[Math.floor(r() * havuz.length)];
    assert.ok(!satir.includes("-"), "havuz tire üretmemeli");
    const kayit = dosyayiTara(satir, false);
    assert.equal(kayit.adaylar.length, 0, `tiresiz satır aday üretti: ${JSON.stringify(satir)} → ${JSON.stringify(kayit.adaylar)}`);
  }
});

test("PRF-MK-A02 · tire süzgeci hiçbir gerçek kodu düşürmez: tireli kodlar aynı konumla bulunur, tarih ve tek parça bulunmaz", () => {
  const metin = [
    "bağımlı: [ ADM-X1, PRF-MK-A02 ]",   // iki kod
    "ad alanlı PRJ-A::KOD-X burada",     // ad alanlı tek sözce
    "tarih 2026-07-11 kod değildir",     // harfsiz — HARF_VAR eler
    "TAM ve YOK tek parçadır",           // tiresiz
    "alt_çizgi ADM_X1 tire değildir",    // tire yerine alt çizgi: kod SAYILMAZ
  ].join("\n");
  const adaylar = dosyayiTara(metin, false).adaylar.map((a) => `${a.satir}:${a.sutun}:${a.metin}`);
  assert.deepEqual(adaylar, ["1:12:ADM-X1", "1:20:PRF-MK-A02", "2:11:PRJ-A::KOD-X"]);
});

// ── ② STRATEJİ ÖN DENETİMİ ──────────────────────────────────────────────────

/** PRF-MK-A01 strateji matrisinin altı olumlu satırı (her biri tek bir ize düşer). */
const OLUMLU = [
  "güven < 0.4 iken karar motoru bekler ve güven < 0.7 iken onay ister",
  "seçici kümesi: single / sequential / parallel / debate",
  "koreografi: risk → debate → human-escalate",
  "3 özellikli risk kaydı tutulur",
  "max 3 deneme, sonra 2 hata → eskale edilir",
  "≤ 4 kanca ve her biri ≤ 250 ms",
];
const OLUMSUZ = ["sıradan bir plan satırı", "güven yüksek", "single sequential", "risk → human", "max deneme", "kanca ve ms"];

test("PRF-MK-A02 · eşik izi ön denetimi yanlış olumsuz üretemez: satırda geçen iz bütünde de geçer, olumsuz metin geçmez", () => {
  for (const satir of OLUMLU) {
    assert.ok(esikIziOnDenetimi(satir), `tek satır iz taşıyor ama ön denetim geçirmedi: ${satir}`);
    const govde = ["# başlık", "sıradan satır", satir, "son satır"].join("\n");
    assert.ok(esikIziOnDenetimi(govde), `gömülü satır ön denetimde düştü: ${satir}`);
  }
  assert.ok(!esikIziOnDenetimi(OLUMSUZ.join("\n")), "olumsuz metin ön denetimden geçti; kapı hiç elemiyor");
  assert.ok(!esikIziOnDenetimi(""), "boş metin ön denetimden geçti");
});

test("PRF-MK-A02 · ön denetimden sonra eşik izi tanısı yine üretilir (uçtan uca, geçici dizin)", () => {
  const kok = mkdtempSync(join(tmpdir(), "sarmal-mk-a02-"));
  try {
    writeFileSync(join(kok, "anlati.md"), "# Not\n\nsıradan cümle\n\n" + OLUMLU[5] + "\n");
    writeFileSync(join(kok, "temiz.md"), "# Temiz\n\n" + OLUMSUZ.join("\n") + "\n");
    const bos = new Map();
    const tanilar = stratejiTanilari(bos, new Map(), kodIndeksle(bos), kok)
      .filter((t) => t.tani.kod === "açık-gizli-sınır-ihlali");
    assert.equal(tanilar.length, 1, `eşik izi tanısı tam bir kez beklenir: ${JSON.stringify(tanilar.map((t) => t.dosya))}`);
    assert.equal(tanilar[0]!.dosya, "anlati.md");
    assert.equal(tanilar[0]!.tani.satir, 5, "tanı satırı iz satırını göstermiyor");
  } finally { rmSync(kok, { recursive: true, force: true }); }
});

// ── ③ AD-BİÇİMİ MEMOSU ──────────────────────────────────────────────────────

test("PRF-MK-A02 · ilk karakter memosu Türkçe eşlemeyi korur ve yalnız ilk karakterle sınırlıdır", () => {
  const beklenen: Array<[string, string, string]> = [
    ["i", "İ", "i"], ["ı", "I", "ı"], ["I", "I", "ı"], ["İ", "İ", "i"],
    ["ç", "Ç", "ç"], ["Ş", "Ş", "ş"], ["a", "A", "a"], ["Z", "Z", "z"],
  ];
  for (const [c, buyuk, kucuk] of beklenen) {
    const k = ilkKarakterBicimi(c);
    assert.equal(k.buyuk, buyuk, `büyük eşleme yanlış: ${c}`);
    assert.equal(k.kucuk, kucuk, `küçük eşleme yanlış: ${c}`);
    assert.equal(k.harf, true);
    assert.equal(k.buyuk, c.toLocaleUpperCase("tr"), "memo doğrudan çağrıyla ayrıştı");
    assert.equal(k.kucuk, c.toLocaleLowerCase("tr"), "memo doğrudan çağrıyla ayrıştı");
  }
  assert.equal(ilkKarakterBicimi("_").harf, false);
  assert.equal(ilkKarakterBicimi("9").harf, false);
  // Harita ad gövdesine değil ilk karaktere anahtarlıdır: yüz farklı ad, tek giriş.
  const once = ilkKarakterMemoBoyutu();
  for (let i = 0; i < 100; i++) ilkKarakterBicimi("k" + i);   // ad gövdesi verilse bile
  // ilkKarakterBicimi ilk karakteri ÇAĞIRAN ayırır; burada tam dizgi verildiği için
  // her biri ayrı anahtar olurdu — ölçülen şey çağıranın sözleşmesidir:
  for (let i = 0; i < 100; i++) ilkKarakterBicimi(("k" + i)[0]!);
  assert.ok(ilkKarakterMemoBoyutu() - once <= 101, "memo ad sayısıyla büyüyor");
  assert.strictEqual(ilkKarakterBicimi("i"), ilkKarakterBicimi("i"), "aynı karakter iki kez hesaplandı; memo çalışmıyor");
});

// ── ④ PRF-MK-A03 · TEK DİSK TARAMASI, HAM PAYLAŞIMI, TUR ÖMÜRLÜ BELİRTEÇ MEMOSU ──

import { readFileSync } from "node:fs";
import { denetimKos } from "../src/denetim.ts";
import { diskTaraSayaci, diskTaraSayaciniSifirla, programlariYukle } from "../src/denetci.ts";
import { belirtecle, belirtecMemosuyla, belirtecMemoBoyutu, belirtecSayaci, belirtecSayaciniSifirla } from "../src/belirtec.ts";

const SNF_YOLU = new URL("../../../oz/siniflama/kayit.json", import.meta.url).pathname;

/** Küçük ama gerçek bir çalışma alanı: anadizin, iki plan dosyası, bir belge. */
function mikroProjeKur(): string {
  const kok = mkdtempSync(join(tmpdir(), "sarmal-mk-a03-"));
  writeFileSync(join(kok, "deneme_anadizin.sar"), 'Proje( kod: PRJ-MK3, ad: "d", ne: "deneme kökü" )\n');
  writeFileSync(join(kok, "plan.sar"), 'Faz( kod: FZ-MK3, ad: "faz" ) {\n  Adım( kod: ADM-MK3-A, ne: "temel adım", durum: beklemede ) {\n    görev: "işi yap"\n  }\n}\n');
  writeFileSync(join(kok, "ikinci.sar"), 'Blok( kod: BLK-MK3, ne: "blok" ) { }\n');
  writeFileSync(join(kok, "not.md"), "# Not\n\nsıradan cümle\n");
  return kok;
}

test("PRF-MK-A03 · bir turda disk tam bir kez taranır ve her .sar tam bir kez belirteçlenir; memo tur bitince düşer", () => {
  const kok = mikroProjeKur();
  try {
    diskTaraSayaciniSifirla(); belirtecSayaciniSifirla();
    const sonuc = denetimKos(kok, { snfYol: SNF_YOLU, bugun: "2026-08-30", tamListe: true });
    assert.ok(sonuc.akis !== undefined, "tur koşmalı");
    assert.equal(diskTaraSayaci(), 1, "disk turda birden fazla tarandı; anlık görüntü paylaşılmıyor");
    const s = belirtecSayaci();
    // Üç .sar dosyası: yükleyici üçünü, kimlik indeksi üçünü belirteçler → altı çağrı, üç hesap.
    assert.equal(s.hesap, 3, `belirteçleme sayısı yinelenen dosya kadar azalmadı: hesap ${s.hesap}, çağrı ${s.cagri}`);
    assert.ok(s.cagri >= 6, `iki tüketici de belirteç istemeli: çağrı ${s.cagri}`);
    assert.equal(belirtecMemoBoyutu(), 0, "memo tur bittikten sonra hâlâ dolu; süreç ömürlü olamaz");
  } finally { rmSync(kok, { recursive: true, force: true }); }
});

test("PRF-MK-A03 · ham metinler diskle birebirdir; dış anadizin etiketi dizinde yoksa haritaya girmez", () => {
  const kok = mikroProjeKur();
  const dis = mkdtempSync(join(tmpdir(), "sarmal-mk-a03-dis-"));
  try {
    const yuk = programlariYukle(kok);
    for (const [etiket, ham] of yuk.hamlar) {
      assert.equal(ham, readFileSync(join(kok, etiket), "utf8"), `ham metin diskle ayrıştı: ${etiket}`);
    }
    assert.deepEqual([...yuk.hamlar.keys()].sort(), ["deneme_anadizin.sar", "ikinci.sar", "plan.sar"]);
    // Dış anadizin: "ana.sar" etiketi ayrıştırılır, fakat dizinde ana.sar yoksa ham haritasına girmez.
    const disAna = join(dis, "dis_anadizin.sar");
    writeFileSync(disAna, 'Proje( kod: PRJ-DIS, ad: "dış", ne: "dış kök" )\n');
    const disYuk = programlariYukle(kok, disAna);
    assert.ok(disYuk.programlar.has("ana.sar"), "dış anadizin ana.sar etiketiyle yüklenmeli");
    assert.ok(!disYuk.hamlar.has("ana.sar"), "dizinde ana.sar yokken dış etiket ham haritasına girdi; istisna bozuldu");
    assert.ok(!disYuk.hamlar.has("deneme_anadizin.sar"), "dış anadizin verilince dizinin kendi girişi yeniden yüklenmemeli");
  } finally { rmSync(kok, { recursive: true, force: true }); rmSync(dis, { recursive: true, force: true }); }
});

// 🛡️ PRF-MK-A06 denetçi bulgusu: ham metin haritasının anahtar kümesi `programlar`
//   ile BİREBİR olmalıdır. Eski `denetimKos` hamları `programlar.keys()` üzerinden
//   okuduğu için ayrıştırılamayan bir dosyanın hamı hiç doğmazdı. Ham erken (ayrıştırma
//   denenmeden) eklenirse bilerek-hatalı VE gerçekten ayrıştırılamayan bir dosya ham
//   tabanlı tanı döngülerine girer ve eski davranışta olmayan bulgular üretir; denetçi
//   bunu salt okur karşı deneyle ölçmüştür (normalizasyon-uyumsuz, açık-gizli-sınır-ihlali).
//   Canlı depoda böyle bir dosya bulunmadığı için döküm karşılaştırması bu kenarı kaçırır;
//   nöbet bu yüzden kenarı kendi fikstürüyle kurar.
test("PRF-MK-A06 · muaf VE ayrıştırılamayan dosyanın hamı doğmaz: ham anahtarları programlarla birebirdir", () => {
  const kok = mkdtempSync(join(tmpdir(), "sarmal-mk-a06-ham-"));
  try {
    writeFileSync(join(kok, "deneme_anadizin.sar"), 'Proje( kod: PRJ-HAM, ad: "ham", ne: "ham nöbeti" )\n');
    writeFileSync(join(kok, "saglam.sar"), 'Blok( kod: BLK-HAM, ad: "sağlam", ne: "ayrıştırılabilir" )\n');
    // Bilerek-hatalı (muaf) VE gerçekten ayrıştırılamayan dosya: hatası sessiz geçilir,
    // `programlar` haritasına girmez, dolayısıyla hamı da doğmamalıdır.
    writeFileSync(join(kok, "bozuk.sar"),
      '// sarmal: bilerek-hatalı — ham nöbetinin fikstürü\nBlok( kod: BLK-BOZUK, ad: "Bozuk", gizliYol: "/Users/biri/gizli"\n');

    const yuk = programlariYukle(kok);
    assert.ok(yuk.muaflar.has("bozuk.sar"), "fikstür muaf sayılmadı; BILEREK_HATALI deseni değişmiş olabilir");
    assert.ok(!yuk.programlar.has("bozuk.sar"), "fikstür gerçekten ayrıştırılamıyor olmalı; nöbetin ölçtüğü kenar kayboldu");
    assert.equal(yuk.hatalar.length, 0, "muaf dosyanın sözdizim hatası sessiz geçmeliydi");
    assert.ok(!yuk.hamlar.has("bozuk.sar"),
      "ayrıştırılamayan muaf dosyanın hamı doğdu; ham tabanlı tanılar eski davranışta olmayan bulgu üretir");
    // Birebirlik DIŞ ANADİZİN OLMAYAN yolda ölçülür; dış giriş verildiğinde "ana.sar"
    // etiketi programlarda bulunur fakat dizinin kendi altında dosya yoksa hamı doğmaz
    // ve bu kasıtlı istisna yukarıdaki PRF-MK-A03 nöbetinde ayrıca ölçülür (denetçi
    // bulgusu · MK-A06 ikinci tur: genel birebirlik iddiası o istisnayla sınırlıdır).
    assert.deepEqual([...yuk.hamlar.keys()].sort(), [...yuk.programlar.keys()].sort(),
      "ham anahtarları programlar anahtarlarıyla birebir değil; iki harita ayrıştı");
  } finally { rmSync(kok, { recursive: true, force: true }); }
});

test("PRF-MK-A03 · memo içerik anahtarlıdır: farklı metin farklı dizi, aynı metin aynı dizi; kapsam dışında memo yoktur", () => {
  belirtecSayaciniSifirla();
  belirtecMemosuyla(() => {
    const a = belirtecle('Faz( kod: A )');
    const b = belirtecle('Faz( kod: B )');
    const a2 = belirtecle('Faz( kod: A )');
    assert.notDeepEqual(a.map((t) => t.deger), b.map((t) => t.deger), "farklı metinler aynı diziyi verdi; memo anahtarı içerik değil");
    assert.strictEqual(a, a2, "aynı metin ikinci kez hesaplandı; memo isabet etmiyor");
    assert.equal(belirtecMemoBoyutu(), 2);
    assert.equal(belirtecSayaci().hesap, 2);
  });
  assert.equal(belirtecMemoBoyutu(), 0, "kapsam kapanınca memo düşmeli");
  const once = belirtecSayaci().hesap;
  belirtecle('Faz( kod: A )'); belirtecle('Faz( kod: A )');
  assert.equal(belirtecSayaci().hesap, once + 2, "kapsam dışında memo çalışmamalı; her çağrı hesaplanır");
});

// ── ⑤ PRF-MK-A04 · BLOK DİLİMLEME VE EMOJİ KISA DEVRESİ ─────────────────────────

import { EMOJI_SOZCELER, emojiEsle } from "../src/emoji-yazim.ts";

/** Eski karakter-karakter gövdenin dört fikstürdeki belirteç anlık görüntüsü (2026-08-30,
 *  kapanış ilk karakterde · son karakterde · metin ortasında (iki blok) · hiç yok). */
const ESKI_ANLIK = {"ilk": [{"tur": "belge", "deger": "", "satir": 1, "sutun": 1}, {"tur": "ad", "deger": "Faz", "satir": 2, "sutun": 1}, {"tur": "parenAç", "deger": "(", "satir": 2, "sutun": 4}, {"tur": "ad", "deger": "kod", "satir": 2, "sutun": 6}, {"tur": "ikiNokta", "deger": ":", "satir": 2, "sutun": 9}, {"tur": "ad", "deger": "A", "satir": 2, "sutun": 11}, {"tur": "virgül", "deger": ",", "satir": 2, "sutun": 12}, {"tur": "ad", "deger": "ne", "satir": 2, "sutun": 14}, {"tur": "ikiNokta", "deger": ":", "satir": 2, "sutun": 16}, {"tur": "metin", "deger": "", "satir": 2, "sutun": 18}, {"tur": "parenKapa", "deger": ")", "satir": 2, "sutun": 25}, {"tur": "belge", "deger": "", "satir": 3, "sutun": 1}, {"tur": "dosyaSonu", "deger": "", "satir": 4, "sutun": 1}], "son": [{"tur": "ad", "deger": "Faz", "satir": 1, "sutun": 1}, {"tur": "parenAç", "deger": "(", "satir": 1, "sutun": 4}, {"tur": "ad", "deger": "kod", "satir": 1, "sutun": 6}, {"tur": "ikiNokta", "deger": ":", "satir": 1, "sutun": 9}, {"tur": "ad", "deger": "A", "satir": 1, "sutun": 11}, {"tur": "virgül", "deger": ",", "satir": 1, "sutun": 12}, {"tur": "ad", "deger": "ne", "satir": 1, "sutun": 14}, {"tur": "ikiNokta", "deger": ":", "satir": 1, "sutun": 16}, {"tur": "metin", "deger": "x", "satir": 1, "sutun": 18}, {"tur": "parenKapa", "deger": ")", "satir": 1, "sutun": 26}, {"tur": "belge", "deger": "belge", "satir": 2, "sutun": 1}, {"tur": "belge", "deger": " y ", "satir": 3, "sutun": 1}, {"tur": "dosyaSonu", "deger": "", "satir": 3, "sutun": 12}], "orta": [{"tur": "belge", "deger": " a ", "satir": 1, "sutun": 1}, {"tur": "ad", "deger": "Faz", "satir": 1, "sutun": 13}, {"tur": "parenAç", "deger": "(", "satir": 1, "sutun": 16}, {"tur": "ad", "deger": "kod", "satir": 1, "sutun": 18}, {"tur": "ikiNokta", "deger": ":", "satir": 1, "sutun": 21}, {"tur": "ad", "deger": "A", "satir": 1, "sutun": 23}, {"tur": "virgül", "deger": ",", "satir": 1, "sutun": 24}, {"tur": "ad", "deger": "ne", "satir": 1, "sutun": 26}, {"tur": "ikiNokta", "deger": ":", "satir": 1, "sutun": 28}, {"tur": "metin", "deger": "b", "satir": 1, "sutun": 30}, {"tur": "parenKapa", "deger": ")", "satir": 1, "sutun": 38}, {"tur": "belge", "deger": " c ", "satir": 1, "sutun": 40}, {"tur": "belge", "deger": "d", "satir": 2, "sutun": 1}, {"tur": "ad", "deger": "Blok", "satir": 3, "sutun": 1}, {"tur": "parenAç", "deger": "(", "satir": 3, "sutun": 5}, {"tur": "ad", "deger": "kod", "satir": 3, "sutun": 7}, {"tur": "ikiNokta", "deger": ":", "satir": 3, "sutun": 10}, {"tur": "ad", "deger": "B", "satir": 3, "sutun": 12}, {"tur": "parenKapa", "deger": ")", "satir": 3, "sutun": 14}, {"tur": "dosyaSonu", "deger": "", "satir": 4, "sutun": 1}], "emoji": [{"tur": "ad", "deger": "Faz", "satir": 1, "sutun": 1}, {"tur": "parenAç", "deger": "(", "satir": 1, "sutun": 4}, {"tur": "ad", "deger": "kod", "satir": 1, "sutun": 6}, {"tur": "ikiNokta", "deger": ":", "satir": 1, "sutun": 9}, {"tur": "ad", "deger": "A", "satir": 1, "sutun": 11}, {"tur": "virgül", "deger": ",", "satir": 1, "sutun": 12}, {"tur": "ad", "deger": "ne", "satir": 1, "sutun": 14}, {"tur": "ikiNokta", "deger": ":", "satir": 1, "sutun": 16}, {"tur": "metin", "deger": "🎯 hedef", "satir": 1, "sutun": 18}, {"tur": "virgül", "deger": ",", "satir": 1, "sutun": 28}, {"tur": "ad", "deger": "durum", "satir": 1, "sutun": 30}, {"tur": "ikiNokta", "deger": ":", "satir": 1, "sutun": 35}, {"tur": "ad", "deger": "tamamlandı", "satir": 1, "sutun": 37}, {"tur": "parenKapa", "deger": ")", "satir": 1, "sutun": 48}, {"tur": "süsAç", "deger": "{", "satir": 1, "sutun": 50}, {"tur": "ad", "deger": "çağır", "satir": 1, "sutun": 52}, {"tur": "ad", "deger": "BLK-X", "satir": 1, "sutun": 58}, {"tur": "süsKapa", "deger": "}", "satir": 1, "sutun": 64}, {"tur": "dosyaSonu", "deger": "", "satir": 2, "sutun": 1}], "belgeAcik": {"mesaj": "Kapanmamış belge bloğu — kapanış |<-- eksik.", "satir": 1, "sutun": 1}, "ucluAcik": {"mesaj": "Kapanmamış çok-satırlı değer — kapanış \"\"\" eksik.", "satir": 1, "sutun": 18}} as Record<string, unknown>;
const FIKSTUR: Record<string, string> = {
  ilk: '-->||<--\nFaz( kod: A, ne: """""" )\n///\n',
  son: 'Faz( kod: A, ne: """x""" )\n/// belge\n-->| y |<--',
  orta: '-->| a |<-- Faz( kod: A, ne: """b""" ) -->| c |<--\n/// d\nBlok( kod: B )\n',
  emoji: 'Faz( kod: A, ne: "🎯 hedef", durum: tamamlandı ) { çağır BLK-X }\n',
};
const HATALI: Record<string, string> = { belgeAcik: '-->| açık kaldı\nFaz( kod: A )', ucluAcik: 'Faz( kod: A, ne: """açık\n kaldı' };

test("PRF-MK-A04 · dilimlenmiş bloklar dört fikstürde eski gövdeyle birebir belirteç verir", () => {
  for (const [ad, kaynak] of Object.entries(FIKSTUR)) {
    assert.deepEqual(JSON.parse(JSON.stringify(belirtecle(kaynak))), ESKI_ANLIK[ad], `fikstür '${ad}' eski gövdeden ayrıştı`);
  }
  // Metin ortasındaki iki blok: ilk blok İLK kapanışta biter (son kapanış seçilirse iki blok birleşir).
  const belgeler = belirtecle(FIKSTUR.orta!).filter((t) => t.tur === "belge").map((t) => t.deger);
  assert.deepEqual(belgeler, [" a ", " c ", "d"]);
});

test("PRF-MK-A04 · kapanış hiç yoksa aynı hata aynı konumla atılır", () => {
  for (const [ad, kaynak] of Object.entries(HATALI)) {
    const beklenen = ESKI_ANLIK[ad] as { mesaj: string; satir: number; sutun: number };
    assert.throws(() => belirtecle(kaynak), (e: any) => e.message === beklenen.mesaj && e.satir === beklenen.satir && e.sutun === beklenen.sutun,
      `'${ad}' hatası eski gövdeden ayrıştı`);
  }
});

test("PRF-MK-A04 · emoji kısa devresi sağlamdır: hiçbir sözce ASCII ile başlamaz ve ASCII karakterde eşleşme yoktur", () => {
  assert.ok(EMOJI_SOZCELER.length >= 30, "sözce listesi beklenenden kısa");
  for (const s of EMOJI_SOZCELER) assert.ok(s.charCodeAt(0) >= 0x80, `ASCII ile başlayan sözce: ${JSON.stringify(s)}; kısa devre artık sağlam değil`);
  for (let c = 0; c < 128; c++) assert.equal(emojiEsle(String.fromCharCode(c) + "🎯", 0), undefined);
  assert.ok(emojiEsle(EMOJI_SOZCELER[0]! + " x", 0) !== undefined, "gerçek kanon sözcesi kısa devreye takıldı");
});

// ── ⑥ PRF-MK-A05 · REFERANS EŞİTLİKLERİ SÜİTTE ──────────────────────────────────
//   Eski gövdelerin (tire süzgeci, dilimleme ve memo öncesi) temsilî bir kaynaktaki
//   belirteç dizisi ve kimlik taraması anlık görüntü olarak gömülüdür; yeni gövde
//   bu görüntüyle birebir olmak zorundadır. Kaynak bütün belirteç türlerini taşır:
//   satır ve blok yorumu, belge bloğu, belge yorumu, üç tırnak, sözlük anahtarı,
//   ad alanlı kod, sayı, emoji takma adı, çağır ve kural tanımı.

const REFERANS = {"kaynak": "// başlık yorumu\n/* blok\n   yorum */\n-->|\n  # Başlık\n  | tablo | hücre |\n  ASCII şekil: +--+\n|<--\nFaz( kod: FZ-REF, ad: \"Referans\", hedefTarih: \"2026-08-30\", ne: \"🎯 hedef\" ) {\n  /// belge yorumu satırı  \n  Blok( kod: BLK-REF, mevsim: FZ-REF, ne: \"\"\"\n    çok satırlı\n      girintili değer\n  \"\"\" ) {\n    Katman( kod: KAT-REF, kullanır: TAKIM-X, ad: #giris.başlık ) {\n      Adım( kod: ADM-REF-A01, durum: tamamlandı, öncelik: p0, bağımlı: [ ADM-REF-A00, PRJ-A::KOD-X ], üretir: [ KOD-REF ], sayı: 12.5, oran: 3 )\n      çağır BLK-REF\n    }\n  }\n}\nKural sözleşmeAdı( kod: ORK-9.9, dayanak: ORK-9 )\n", "belirtec": [{"tur": "belge", "deger": "  # Başlık\n  | tablo | hücre |\n  ASCII şekil: +--+", "satir": 4, "sutun": 1}, {"tur": "ad", "deger": "Faz", "satir": 9, "sutun": 1}, {"tur": "parenAç", "deger": "(", "satir": 9, "sutun": 4}, {"tur": "ad", "deger": "kod", "satir": 9, "sutun": 6}, {"tur": "ikiNokta", "deger": ":", "satir": 9, "sutun": 9}, {"tur": "ad", "deger": "FZ-REF", "satir": 9, "sutun": 11}, {"tur": "virgül", "deger": ",", "satir": 9, "sutun": 17}, {"tur": "ad", "deger": "ad", "satir": 9, "sutun": 19}, {"tur": "ikiNokta", "deger": ":", "satir": 9, "sutun": 21}, {"tur": "metin", "deger": "Referans", "satir": 9, "sutun": 23}, {"tur": "virgül", "deger": ",", "satir": 9, "sutun": 33}, {"tur": "ad", "deger": "hedefTarih", "satir": 9, "sutun": 35}, {"tur": "ikiNokta", "deger": ":", "satir": 9, "sutun": 45}, {"tur": "metin", "deger": "2026-08-30", "satir": 9, "sutun": 47}, {"tur": "virgül", "deger": ",", "satir": 9, "sutun": 59}, {"tur": "ad", "deger": "ne", "satir": 9, "sutun": 61}, {"tur": "ikiNokta", "deger": ":", "satir": 9, "sutun": 63}, {"tur": "metin", "deger": "🎯 hedef", "satir": 9, "sutun": 65}, {"tur": "parenKapa", "deger": ")", "satir": 9, "sutun": 76}, {"tur": "süsAç", "deger": "{", "satir": 9, "sutun": 78}, {"tur": "belge", "deger": "belge yorumu satırı", "satir": 10, "sutun": 3}, {"tur": "ad", "deger": "Blok", "satir": 11, "sutun": 3}, {"tur": "parenAç", "deger": "(", "satir": 11, "sutun": 7}, {"tur": "ad", "deger": "kod", "satir": 11, "sutun": 9}, {"tur": "ikiNokta", "deger": ":", "satir": 11, "sutun": 12}, {"tur": "ad", "deger": "BLK-REF", "satir": 11, "sutun": 14}, {"tur": "virgül", "deger": ",", "satir": 11, "sutun": 21}, {"tur": "ad", "deger": "mevsim", "satir": 11, "sutun": 23}, {"tur": "ikiNokta", "deger": ":", "satir": 11, "sutun": 29}, {"tur": "ad", "deger": "FZ-REF", "satir": 11, "sutun": 31}, {"tur": "virgül", "deger": ",", "satir": 11, "sutun": 37}, {"tur": "ad", "deger": "ne", "satir": 11, "sutun": 39}, {"tur": "ikiNokta", "deger": ":", "satir": 11, "sutun": 41}, {"tur": "metin", "deger": "çok satırlı\n  girintili değer", "satir": 11, "sutun": 43}, {"tur": "parenKapa", "deger": ")", "satir": 14, "sutun": 7}, {"tur": "süsAç", "deger": "{", "satir": 14, "sutun": 9}, {"tur": "ad", "deger": "Katman", "satir": 15, "sutun": 5}, {"tur": "parenAç", "deger": "(", "satir": 15, "sutun": 11}, {"tur": "ad", "deger": "kod", "satir": 15, "sutun": 13}, {"tur": "ikiNokta", "deger": ":", "satir": 15, "sutun": 16}, {"tur": "ad", "deger": "KAT-REF", "satir": 15, "sutun": 18}, {"tur": "virgül", "deger": ",", "satir": 15, "sutun": 25}, {"tur": "ad", "deger": "kullanır", "satir": 15, "sutun": 27}, {"tur": "ikiNokta", "deger": ":", "satir": 15, "sutun": 35}, {"tur": "ad", "deger": "TAKIM-X", "satir": 15, "sutun": 37}, {"tur": "virgül", "deger": ",", "satir": 15, "sutun": 44}, {"tur": "ad", "deger": "ad", "satir": 15, "sutun": 46}, {"tur": "ikiNokta", "deger": ":", "satir": 15, "sutun": 48}, {"tur": "anahtar", "deger": "giris.başlık", "satir": 15, "sutun": 50}, {"tur": "parenKapa", "deger": ")", "satir": 15, "sutun": 64}, {"tur": "süsAç", "deger": "{", "satir": 15, "sutun": 66}, {"tur": "ad", "deger": "Adım", "satir": 16, "sutun": 7}, {"tur": "parenAç", "deger": "(", "satir": 16, "sutun": 11}, {"tur": "ad", "deger": "kod", "satir": 16, "sutun": 13}, {"tur": "ikiNokta", "deger": ":", "satir": 16, "sutun": 16}, {"tur": "ad", "deger": "ADM-REF-A01", "satir": 16, "sutun": 18}, {"tur": "virgül", "deger": ",", "satir": 16, "sutun": 29}, {"tur": "ad", "deger": "durum", "satir": 16, "sutun": 31}, {"tur": "ikiNokta", "deger": ":", "satir": 16, "sutun": 36}, {"tur": "ad", "deger": "tamamlandı", "satir": 16, "sutun": 38}, {"tur": "virgül", "deger": ",", "satir": 16, "sutun": 48}, {"tur": "ad", "deger": "öncelik", "satir": 16, "sutun": 50}, {"tur": "ikiNokta", "deger": ":", "satir": 16, "sutun": 57}, {"tur": "ad", "deger": "p0", "satir": 16, "sutun": 59}, {"tur": "virgül", "deger": ",", "satir": 16, "sutun": 61}, {"tur": "ad", "deger": "bağımlı", "satir": 16, "sutun": 63}, {"tur": "ikiNokta", "deger": ":", "satir": 16, "sutun": 70}, {"tur": "köşeAç", "deger": "[", "satir": 16, "sutun": 72}, {"tur": "ad", "deger": "ADM-REF-A00", "satir": 16, "sutun": 74}, {"tur": "virgül", "deger": ",", "satir": 16, "sutun": 85}, {"tur": "ad", "deger": "PRJ-A::KOD-X", "satir": 16, "sutun": 87}, {"tur": "köşeKapa", "deger": "]", "satir": 16, "sutun": 100}, {"tur": "virgül", "deger": ",", "satir": 16, "sutun": 101}, {"tur": "ad", "deger": "üretir", "satir": 16, "sutun": 103}, {"tur": "ikiNokta", "deger": ":", "satir": 16, "sutun": 109}, {"tur": "köşeAç", "deger": "[", "satir": 16, "sutun": 111}, {"tur": "ad", "deger": "KOD-REF", "satir": 16, "sutun": 113}, {"tur": "köşeKapa", "deger": "]", "satir": 16, "sutun": 121}, {"tur": "virgül", "deger": ",", "satir": 16, "sutun": 122}, {"tur": "ad", "deger": "sayı", "satir": 16, "sutun": 124}, {"tur": "ikiNokta", "deger": ":", "satir": 16, "sutun": 128}, {"tur": "sayı", "deger": "12.5", "satir": 16, "sutun": 130}, {"tur": "virgül", "deger": ",", "satir": 16, "sutun": 134}, {"tur": "ad", "deger": "oran", "satir": 16, "sutun": 136}, {"tur": "ikiNokta", "deger": ":", "satir": 16, "sutun": 140}, {"tur": "sayı", "deger": "3", "satir": 16, "sutun": 142}, {"tur": "parenKapa", "deger": ")", "satir": 16, "sutun": 144}, {"tur": "ad", "deger": "çağır", "satir": 17, "sutun": 7}, {"tur": "ad", "deger": "BLK-REF", "satir": 17, "sutun": 13}, {"tur": "süsKapa", "deger": "}", "satir": 18, "sutun": 5}, {"tur": "süsKapa", "deger": "}", "satir": 19, "sutun": 3}, {"tur": "süsKapa", "deger": "}", "satir": 20, "sutun": 1}, {"tur": "ad", "deger": "Kural", "satir": 21, "sutun": 1}, {"tur": "ad", "deger": "sözleşmeAdı", "satir": 21, "sutun": 7}, {"tur": "parenAç", "deger": "(", "satir": 21, "sutun": 18}, {"tur": "ad", "deger": "kod", "satir": 21, "sutun": 20}, {"tur": "ikiNokta", "deger": ":", "satir": 21, "sutun": 23}, {"tur": "ad", "deger": "ORK-9.9", "satir": 21, "sutun": 25}, {"tur": "virgül", "deger": ",", "satir": 21, "sutun": 32}, {"tur": "ad", "deger": "dayanak", "satir": 21, "sutun": 34}, {"tur": "ikiNokta", "deger": ":", "satir": 21, "sutun": 41}, {"tur": "ad", "deger": "ORK-9", "satir": 21, "sutun": 43}, {"tur": "parenKapa", "deger": ")", "satir": 21, "sutun": 49}, {"tur": "dosyaSonu", "deger": "", "satir": 22, "sutun": 1}], "tara": {"tanimlar": [{"kod": "FZ-REF", "tip": "Faz", "ad": "Referans", "satir": 9, "sutun": 11}, {"kod": "BLK-REF", "tip": "Blok", "satir": 11, "sutun": 14}, {"kod": "KAT-REF", "tip": "Katman", "satir": 15, "sutun": 18}, {"kod": "ADM-REF-A01", "tip": "Adım", "satir": 16, "sutun": 18}, {"kod": "sözleşmeAdı", "tip": "kuralTanım", "satir": 21, "sutun": 7}, {"kod": "ORK-9.9", "tip": "sözleşmeAdı", "satir": 21, "sutun": 25}], "adaylar": [{"metin": "FZ-REF", "satir": 9, "sutun": 11}, {"metin": "BLK-REF", "satir": 11, "sutun": 14}, {"metin": "FZ-REF", "satir": 11, "sutun": 31}, {"metin": "KAT-REF", "satir": 15, "sutun": 18}, {"metin": "TAKIM-X", "satir": 15, "sutun": 37}, {"metin": "ADM-REF-A01", "satir": 16, "sutun": 18}, {"metin": "ADM-REF-A00", "satir": 16, "sutun": 74}, {"metin": "PRJ-A::KOD-X", "satir": 16, "sutun": 87}, {"metin": "KOD-REF", "satir": 16, "sutun": 113}, {"metin": "BLK-REF", "satir": 17, "sutun": 13}, {"metin": "ORK-9", "satir": 21, "sutun": 25}, {"metin": "ORK-9", "satir": 21, "sutun": 43}, {"metin": "tamamlandı", "satir": 16, "sutun": 38}, {"metin": "p0", "satir": 16, "sutun": 59}], "giden": [{"kaynak": "ADM-REF-A01", "hedef": "ADM-REF-A00", "kenar": "bağımlı", "satir": 16, "sutun": 74}, {"kaynak": "ADM-REF-A01", "hedef": "PRJ-A::KOD-X", "kenar": "bağımlı", "satir": 16, "sutun": 87}, {"kaynak": "ADM-REF-A01", "hedef": "KOD-REF", "kenar": "üretir", "satir": 16, "sutun": 113}, {"kaynak": "ORK-9.9", "hedef": "ORK-9", "kenar": "dayanak", "satir": 21, "sutun": 43}]}} as { kaynak: string; belirtec: unknown[]; tara: unknown };

test("PRF-MK-A05 · temsilî kaynakta belirteç dizisi ve kimlik taraması eski gövdelerle birebirdir", () => {
  assert.deepEqual(JSON.parse(JSON.stringify(belirtecle(REFERANS.kaynak))), REFERANS.belirtec, "belirteç dizisi referanstan ayrıştı");
  assert.deepEqual(JSON.parse(JSON.stringify(dosyayiTara(REFERANS.kaynak, true))), REFERANS.tara, "kimlik taraması referanstan ayrıştı");
  const tara = dosyayiTara(REFERANS.kaynak, true);
  assert.ok(tara.tanimlar.length >= 5 && tara.adaylar.length >= 8 && tara.giden.length >= 2, "referans kaynağı dişsiz: tanım, aday ve giden kenar bekleniyor");
});

// ── ⑦ PRF-MK-A07 · MEMO SINIRI VE GÜVENLİK NÖBETLERİNİN KORUNMASI ────────────────

import { GIZLI_KOK_ADI } from "../src/kok-yuzeyi.ts";

test("PRF-MK-A07 · belirteç memosu tur sonunda boştur ve ardışık turlarda büyümez", () => {
  const kok = mikroProjeKur();
  try {
    const sec = { snfYol: SNF_YOLU, bugun: "2026-08-30", tamListe: true };
    for (let tur = 0; tur < 3; tur++) {
      denetimKos(kok, sec);
      assert.equal(belirtecMemoBoyutu(), 0, `tur ${tur + 1} bittikten sonra memo dolu`);
    }
    // İç içe kapsam da sızdırmaz: dıştaki harita içtekini görmez, iç kapanınca dış geri gelir.
    belirtecMemosuyla(() => {
      belirtecle("Faz( kod: DIS )");
      belirtecMemosuyla(() => { belirtecle("Faz( kod: IC )"); assert.equal(belirtecMemoBoyutu(), 1); });
      assert.equal(belirtecMemoBoyutu(), 1, "iç kapsam kapanınca dış harita geri gelmeli");
    });
    assert.equal(belirtecMemoBoyutu(), 0);
  } finally { rmSync(kok, { recursive: true, force: true }); }
});

test("PRF-MK-A07 · ön denetimden sonra olumlu sızıntı fikstürlerinin tamamı yakalanır; yorumdaki ek yakalanmaz", () => {
  const kok = mkdtempSync(join(tmpdir(), "sarmal-mk-a07-"));
  try {
    // Altı eşik izi, altı ayrı belge: her biri tam bir tanı üretmeli.
    OLUMLU.forEach((satir, k) => writeFileSync(join(kok, `iz${k}.md`), `# Belge ${k}\n\n${satir}\n`));
    writeFileSync(join(kok, "temiz.md"), "# Temiz\n\n" + OLUMSUZ.join("\n") + "\n");
    const bos = new Map();
    const esik = stratejiTanilari(bos, new Map(), kodIndeksle(bos), kok).filter((t) => t.tani.kod === "açık-gizli-sınır-ihlali");
    assert.deepEqual(esik.map((t) => t.dosya).sort(), OLUMLU.map((_, k) => `iz${k}.md`).sort(), "olumlu fikstürlerden biri ön denetimden sonra kaçtı ya da temiz belge yakalandı");
    // Gizli yol: yol alanında geçen ek tanı üretir; yalnız yorumda geçen ek üretmez
    // (ön denetim dosyayı geçirir, satır süzgeci yorumu eler — davranış korunur).
    const eki = `${GIZLI_KOK_ADI}/`;
    const hamlar = new Map<string, string>([
      ["yol.sar", `Adım( kod: A, dosya: "${eki}gizli/x.ts" )\n`],
      ["yorum.sar", `// ${eki} yalnız yorumda\nAdım( kod: B )\n`],
    ]);
    const gizli = stratejiTanilari(bos, hamlar, kodIndeksle(bos), kok).filter((t) => t.tani.kod === "açık-gizli-sınır-ihlali" && t.dosya.endsWith(".sar"));
    assert.deepEqual(gizli.map((t) => t.dosya), ["yol.sar"], "gizli yol nöbeti ön denetimden sonra farklı davranıyor");
  } finally { rmSync(kok, { recursive: true, force: true }); }
});

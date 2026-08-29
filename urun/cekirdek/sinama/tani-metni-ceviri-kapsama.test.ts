// tani-metni-ceviri-kapsama.test.ts — tanı çevirisinin kapsam ve dürüstlük nöbeti (CDL-A03).
//
// Türkçe kanonik hanedir; İngilizce onun paralel yüzüdür. İki katalogdan
// birine tanı eklenip ötekine eklenmezse, bir alan boş bırakılırsa ya da
// Türkçe kurucu İngilizce haneye kopyalanırsa bu süit kırmızıya döner.
// Önerilerdeki `.sar` örneklerinin Türkçe kalması bilinçlidir: kaynak dili
// Türkçedir ve yapıştırılabilir örnek çevrilirse geçersiz kaynak üretir.
//
// İKİNCİ HÜKÜM — ANLATIM BÜTÜNLÜĞÜ (VIT-GRAF-A18). Aynı bağlam matrisi ikinci
// bir nöbeti daha besler: motorun ürettiği hiçbir cümle ok işaretiyle ya da
// dikey çizgiyle sıralanmış seçeneklerle yazılamaz (DIL-1.5). İki nöbet tek
// dosyada yaşar, çünkü ikisi de aynı kurucuları aynı matris üzerinde koşturur
// ve matrisin ikinci bir kopyası zamanla ilkinden ayrışırdı.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  IKIZ_NOBET_METINLERI,
  IKIZ_NOBET_METINLERI_EN,
  KOK_YUZEYI_METINLERI,
  KOK_YUZEYI_METINLERI_EN,
  ONCEKI_TANI_METINLERI,
  ONCEKI_TANI_METINLERI_EN,
  ORTAK_TANI_METINLERI,
  ORTAK_TANI_METINLERI_EN,
  TANI_METINLERI,
  TANI_METINLERI_EN,
  eskiTani,
  yeniTani,
  sozDizimTanisi,
  taniDilineCevir,
  type OncekiTaniMetni,
  type TaniBaglami,
  type TaniMetni,
} from "../src/tani-metinleri.ts";
import { belirtecle, SozDizimHatasi } from "../src/belirtec.ts";
import { ayristir } from "../src/ayristirici.ts";

type Katalog = Readonly<Record<string, OncekiTaniMetni>>;

const sirali = (katalog: Katalog): string[] => Object.keys(katalog).sort((a, b) => a.localeCompare(b, "tr"));

function ayniKume(ad: string, tr: Katalog, en: Katalog): void {
  assert.deepEqual(
    sirali(en),
    sirali(tr),
    `${ad}: Türkçe ve İngilizce haneler aynı tanı kimliklerini taşımalıdır`,
  );
}

function ayniAlanlar(ad: string, tr: Katalog, en: Katalog): void {
  const eksik: string[] = [];
  for (const kod of Object.keys(tr)) {
    if (typeof en[kod]?.mesaj !== "function") eksik.push(`${kod}.mesaj`);
    if (typeof tr[kod].oneri === "function" && typeof en[kod]?.oneri !== "function") eksik.push(`${kod}.oneri`);
    if (typeof tr[kod].oneri !== "function" && typeof en[kod]?.oneri === "function") eksik.push(`${kod}.oneri-fazla`);
  }
  assert.deepEqual(eksik, [], `${ad}: dil hanelerinin mesaj/öneri alan kapsamı ayrıştı`);
}

// Koşullu kurucuların bütün dallarını dolaşan küçük bağlam matrisi. Kaynak
// karşılaştırması bir kurucunun tümüyle kopyalanmasını yakalar; bu matris ise
// tek bir koşul dalına yapıştırılmış Türkçe çıktıyı da görünür kılar.
const BAGLAMLAR: readonly TaniBaglami[] = [
  {},
  { dolaylı: true },
  { özet: true, sayı: 5, adlar: ["A", "B", "C", "D", "E"] },
  { enAzBiri: true },
  { diskte: "dizin" },
  { yakin: "Adım" },
  { hedef: "ADM-HEDEF" },
  { eşik: true },
  { önyüz: true },
  { fazAltında: true },
  { çocuk: "Mekanizma" },
  { çocuk: "Adım", ebeveynler: ["Katman"] },
  { durum: "geliştirmede" },
  { kusur: "biçim" },
  { kusur: "mod" },
  { kusur: "niyet-koşullu" },
  { kusur: "katmansız" },
  { kusur: "otorite" },
  { kusur: "silinmiş" },
  { kusur: "sıra" },
  { kusur: "çelişki" },
  { kusur: "daraltmıyor" },
  { kusur: "giriş-ayrıştırılamıyor" },
  { kusur: "ad-kuralı" },
  { kusur: "girişsiz-dizin" },
  { kusur: "girişsiz-dizin", hedef: "dosya" },
  { kusur: "girişsiz-dizin", hedef: "dizin" },
  { kusur: "girişsiz-dizin", hedef: "yok" },
  { kusur: "kanıtsız" },
  { kusur: "kapsayıcı-alan" },
  { kusur: "meyve" },
  { kusur: "ileri-bağlama" },
  { kusur: "çağır" },
  { kusur: "ilan-dışı", izinli: ["Adım"] },
  { kusur: "ilansız-yaprak" },
  { kusur: "yüzey-dışı" },
  { kusur: "yaprak" },
  { kusur: "sarmaz" },
  { kusur: "tek-katman" },
  // VIT-GRAF-A18 · anlatım nöbetinin ulaşması gereken ek dallar. Bir kurucu
  // ayrımını hangi alandan yapıyorsa o alanın değeri burada bir satır tutar.
  { kusur: "ad" },
  { kusur: "mod", mod: "uçmak", ham: "MCP-PG:uçmak", etmen: "ETM-A" },
  { belgede: true },
  { kodHedefi: true },
  { özet: true, sayı: 5, örnek: "ORN-1", örnekler: "ORN-1", açık: 3, kararlaşmış: 2 },
  { zincir: ["K-1", "K-2", "K-3"], bölümler: ["Amaç", "Kapsam"], dosyalar: ["a.sar", "b.sar"] },
  { gizli: ["ADM-A", "ADM-B"], takımlar: ["ön"], hedefTakımları: ["arka"], aileler: ["yuzey", "plan"] },
  { çıpaYol: "a/x.sar", karşıYol: "b/x.sar", satırNo: 7, çıpaSatır: "birinci", karşıSatır: "ikinci" },
  { sahne: true, çıpaYol: "a/x.sar", karşıYol: "b/x.sar", satırNo: 7, toplam: 9, gösterilen: 3, gerekçe: "ikiz kümesi" },
];

function sonuc(fn: ((p: TaniBaglami) => string | undefined) | undefined, baglam: TaniBaglami): string | undefined {
  return fn?.(baglam)?.trim();
}

function kopyalar(ad: string, tr: Katalog, en: Katalog): string[] {
  const bulunan = new Set<string>();
  for (const kod of Object.keys(tr)) {
    const trKayit = tr[kod];
    const enKayit = en[kod];
    if (!enKayit) continue;
    for (const alan of ["mesaj", "oneri"] as const) {
      const trFn = trKayit[alan];
      const enFn = enKayit[alan];
      if (!trFn || !enFn) continue;
      if (trFn.toString() === enFn.toString()) bulunan.add(`${ad}.${kod}.${alan}`);
      for (const baglam of BAGLAMLAR) {
        const trMetin = sonuc(trFn, baglam);
        const enMetin = sonuc(enFn, baglam);
        if (trMetin && trMetin === enMetin) bulunan.add(`${ad}.${kod}.${alan}`);
      }
    }
  }
  return [...bulunan];
}

test("tanı çevirisi kapsamı: yeni kanonun Türkçe ve İngilizce tanı kümeleri aynıdır", () => {
  ayniKume("yeni kanon", TANI_METINLERI, TANI_METINLERI_EN);
});

test("tanı çevirisi kapsamı: önceki kanonun Türkçe ve İngilizce tanı kümeleri aynıdır", () => {
  ayniKume("önceki kanon", ONCEKI_TANI_METINLERI, ONCEKI_TANI_METINLERI_EN);
});

test("tanı çevirisi kapsamı: iki dil aynı mesaj ve öneri alanlarını taşır", () => {
  ayniAlanlar("yeni kanon", TANI_METINLERI, TANI_METINLERI_EN);
  ayniAlanlar("önceki kanon", ONCEKI_TANI_METINLERI, ONCEKI_TANI_METINLERI_EN);
});

test("tanı çevirisi dürüstlüğü: İngilizce hanede Türkçe metnin birebir kopyası yoktur", () => {
  const bulunan = [
    ...kopyalar("yeni", TANI_METINLERI, TANI_METINLERI_EN),
    ...kopyalar("önceki", ONCEKI_TANI_METINLERI, ONCEKI_TANI_METINLERI_EN),
  ];
  assert.deepEqual(bulunan, [], `Türkçesi İngilizce haneye kopyalanmış alan(lar): ${bulunan.join(", ")}`);
});

test("tanı dili kapısı: varsayılan Türkçedir ve açık İngilizce seçimi ikinci haneyi verir", () => {
  const yeniKod = "kanonik-kaynak-biçimi";
  const yeniBaglam = { dosya: "yasa/kanon/örnek.md" };
  assert.equal(yeniTani(yeniKod, yeniBaglam, {}).mesaj, (TANI_METINLERI[yeniKod] as TaniMetni).mesaj(yeniBaglam));
  assert.equal(yeniTani(yeniKod, yeniBaglam, {}, "en").mesaj, TANI_METINLERI_EN[yeniKod].mesaj(yeniBaglam));

  const eskiKod = "döngüsel-bağımlılık";
  const eskiBaglam = { kod: "ADM-ORNEK" };
  assert.equal(eskiTani(eskiKod, "hata", eskiBaglam, {}).mesaj, ONCEKI_TANI_METINLERI[eskiKod].mesaj(eskiBaglam));
  assert.equal(eskiTani(eskiKod, "hata", eskiBaglam, {}, "en").mesaj, ONCEKI_TANI_METINLERI_EN[eskiKod].mesaj(eskiBaglam));
});

test("söz-dizim tanısı: dinamik ayrıştırıcı cümlesi gerçek İngilizce haneyi taşır", () => {
  let hata: SozDizimHatasi | undefined;
  try {
    ayristir(belirtecle("Adım("));
  } catch (e) {
    if (e instanceof SozDizimHatasi) hata = e;
    else throw e;
  }
  assert.ok(hata, "fikstür söz-dizim hatası üretmedi");

  const tani = sozDizimTanisi(hata);
  assert.equal(tani.mesaj, '")" (parametre listesi sonu) bekleniyordu, "dosyaSonu" bulundu.');
  assert.equal(
    taniDilineCevir(tani, "en").mesaj,
    '")" (end of parameter list) was expected, "end of file" was found.',
  );
  assert.ok(tani.dilMetinleri?.en.mesaj, "İngilizce söz-dizim hanesi yok");
});

// ═══════════════════════════════════════════════════════════════════════════
// 🗣️ ANLATIM BÜTÜNLÜĞÜ NÖBETİ (VIT-GRAF-A18 · DIL-1.5)
//
//   HÜKMÜN DOĞUŞU. Founder 2026-08-16 tarihli canlı turda ipucu penceresini
//   fotoğrafla belgeledi ve öneri cümlelerinin ok işaretiyle, dikey çizgiyle
//   sıralanmış seçeneklerle ve kesik ibarelerle geldiğini bildirdi. DIL-1.5
//   kanonik kaynağa yazılan her metnin tam cümlelerle kurulmasını şart koşar ve
//   motorun kullanıcıya söylediği cümle de bu hükmün kapsamındadır, çünkü o
//   cümle kullanıcının okuduğu tek kayıttır.
//
//   NÖBET KAYNAK METNİNİ DEĞİL, ÜRETİLEN CÜMLEYİ ÖLÇER. Bir yazım kalıbını
//   dosyanın içinde aramak, davranış hiç değişmediği hâlde bir yeniden
//   düzenlemede kırmızıya döner ve nöbeti güvenilmez kılar; bu ders VIT-GRAF-A19
//   turunda ödenmiştir. Bu yüzden nöbet bütün kurucuları yukarıdaki bağlam
//   matrisi üzerinde koşturur ve yalnız çıkan cümleye bakar.
//
//   İKİ İSTİSNA VARDIR VE İKİSİ DE DİLİN KENDİ SÖZ DİZİMİDİR. Birincisi, belge
//   bloğunun açılış ile kapanış imleri tek bir sözcüktür ve seçenek ayracı
//   değildir. İkincisi, ters tırnak içinde verilen yapıştırılabilir örnek düzyazı
//   değil KAYNAK metnidir; oradaki çizelge satırı Sarmal söz diziminin kendisidir
//   ve düzyazıya çevrilirse örnek geçersizleşir.
// ═══════════════════════════════════════════════════════════════════════════

/** Dilin kendi söz dizimi olan iki im — seçenek ayracı değil, tek sözcüktür. */
const BELGE_IMLERI: readonly string[] = ["-->|", "|<--"];

/**
 * Ölçülecek düzyazıyı çıkarır: yapıştırılabilir örnekler ile belge imleri düşer,
 * geriye kullanıcının OKUDUĞU cümle kalır.
 */
function duzyaziyaIndir(metin: string): string {
  let govde = metin.replace(/`[^`]*`/g, " ");
  for (const im of BELGE_IMLERI) govde = govde.split(im).join(" ");
  return govde;
}

/** Bir cümlede kalan telegrafik imleri sayar; boş liste temiz demektir. */
function telegrafikImler(metin: string): string[] {
  const govde = duzyaziyaIndir(metin);
  const bulunan: string[] = [];
  if (govde.includes("→")) bulunan.push("ok işareti");
  if (govde.includes("|")) bulunan.push("dikey çizgi");
  return bulunan;
}

const ANLATIM_KATALOGLARI: ReadonlyArray<readonly [string, Katalog]> = [
  ["yeni kanon (tr)", TANI_METINLERI],
  ["yeni kanon (en)", TANI_METINLERI_EN],
  ["önceki kanon (tr)", ONCEKI_TANI_METINLERI],
  ["önceki kanon (en)", ONCEKI_TANI_METINLERI_EN],
  ["ikiz nöbeti (tr)", IKIZ_NOBET_METINLERI],
  ["ikiz nöbeti (en)", IKIZ_NOBET_METINLERI_EN],
  ["kök yüzeyi (tr)", KOK_YUZEYI_METINLERI],
  ["kök yüzeyi (en)", KOK_YUZEYI_METINLERI_EN],
];

const ORTAK_KATALOGLAR: ReadonlyArray<
  readonly [string, Readonly<Record<string, (p: TaniBaglami) => string>>]
> = [
  ["ortak (tr)", ORTAK_TANI_METINLERI],
  ["ortak (en)", ORTAK_TANI_METINLERI_EN],
];

/** Bütün kurucuları matris üzerinde koşturur ve üretilen her cümleyi verir. */
function uretilenCumleler(): Array<{ yer: string; metin: string }> {
  const cumleler: Array<{ yer: string; metin: string }> = [];
  for (const [ad, katalog] of ANLATIM_KATALOGLARI) {
    for (const kod of Object.keys(katalog)) {
      for (const alan of ["mesaj", "oneri"] as const) {
        const kurucu = katalog[kod][alan];
        if (typeof kurucu !== "function") continue;
        for (const baglam of BAGLAMLAR) {
          const metin = kurucu(baglam);
          if (metin) cumleler.push({ yer: `${ad} · ${kod}.${alan}`, metin });
        }
      }
    }
  }
  for (const [ad, katalog] of ORTAK_KATALOGLAR) {
    for (const kod of Object.keys(katalog)) {
      for (const baglam of BAGLAMLAR) {
        const metin = katalog[kod](baglam);
        if (metin) cumleler.push({ yer: `${ad} · ${kod}`, metin });
      }
    }
  }
  return cumleler;
}

test("anlatım bütünlüğü: motorun ürettiği hiçbir cümlede ok işareti ya da dikey çizgi kalmaz", () => {
  const kirli: string[] = [];
  for (const { yer, metin } of uretilenCumleler()) {
    const imler = telegrafikImler(metin);
    if (imler.length) kirli.push(`${yer} — ${imler.join(" ve ")}: ${metin}`);
  }
  assert.deepEqual(
    [...new Set(kirli)],
    [],
    "DIL-1.5 telegrafik yazımı yasaklar; bu cümleler tam cümleye çevrilmelidir",
  );
});

test("anlatım bütünlüğü nöbeti kör değildir: matris her katalog girdisine ulaşır", () => {
  const ulasilan = new Set(uretilenCumleler().map((c) => c.yer.split(".")[0]));
  const eksik: string[] = [];
  for (const [ad, katalog] of ANLATIM_KATALOGLARI) {
    for (const kod of Object.keys(katalog)) {
      if (!ulasilan.has(`${ad} · ${kod}`)) eksik.push(`${ad} · ${kod}`);
    }
  }
  assert.deepEqual(eksik, [], "matris bu girdilerden hiç cümle üretemedi; matris genişletilmelidir");
});

test("anlatım bütünlüğü nöbetinin iki istisnası dar tutulur", () => {
  assert.deepEqual(telegrafikImler("Bloğu -->| ile |<-- arasına yaz."), []);
  assert.deepEqual(telegrafikImler("Örnek: `| sütun | değer |` satırını koru."), []);
  assert.deepEqual(telegrafikImler("Yeniden adlandır: 'a' → 'b'."), ["ok işareti"]);
  assert.deepEqual(telegrafikImler("Üç yol: ekle | aç | güncelle."), ["dikey çizgi"]);
});

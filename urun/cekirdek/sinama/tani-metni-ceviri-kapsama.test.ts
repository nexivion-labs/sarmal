// tani-metni-ceviri-kapsama.test.ts — tanı çevirisinin kapsam ve dürüstlük nöbeti (CDL-A03).
//
// Türkçe kanonik hanedir; İngilizce onun paralel yüzüdür. İki katalogdan
// birine tanı eklenip ötekine eklenmezse, bir alan boş bırakılırsa ya da
// Türkçe kurucu İngilizce haneye kopyalanırsa bu süit kırmızıya döner.
// Önerilerdeki `.sar` örneklerinin Türkçe kalması bilinçlidir: kaynak dili
// Türkçedir ve yapıştırılabilir örnek çevrilirse geçersiz kaynak üretir.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ONCEKI_TANI_METINLERI,
  ONCEKI_TANI_METINLERI_EN,
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

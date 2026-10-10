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
import { createRequire } from "node:module";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  IKIZ_NOBET_METINLERI,
  IKIZ_NOBET_METINLERI_EN,
  KUSUR_YAN_CUMLELERI,
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
import { ingilizceYuzKusurlari } from "../src/ingilizce-yuz.ts";

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
  // BKM-DNT-A13: `--ana` bayrağının dalları da matrise girer. Hedef üçlüsü
  // (dosya · dizin · yok) zaten aşağıda dolaşılıyordu, fakat dış beyan dalı
  // dolaşılmıyordu ve o dalda kap iddiası kuran bir çeviri sessizce yaşardı.
  { kusur: "girişsiz-dizin", hedef: "dizin", disBeyan: true },
  { kusur: "girişsiz-dizin", hedef: "yok", disBeyan: true },
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

// ═══════════════════════════════════════════════════════════════════════════
// 🌐 İNGİLİZCE YÜZÜN TEK İLKESİ (MGZ-A09 · Founder hükmü 2026-10-10)
//
//   Dosya her dilde Türkçe görünür; İngilizce tanı İngilizce konuşur ve
//   dosyadaki gerçek Türkçe adları (tip, kenar, alan, değer) aynen anar. Nöbet
//   aynı bağlam matrisinin ürettiği her İngilizce cümleyi çekirdeğin İngilizce
//   yüz ölçerinden geçirir: cümlede kalan Türkçe düzyazı da, dosyada bulunmayan
//   bir ad karşılığı (`dependsOn:`, "a Step") da kusurdur. Matrisin kendi
//   değerleri kullanıcı içeriği yerine geçer ve ölçümden önce düşer.
//
//   Kusur yan cümleleri ayrıca ölçülür. Üretici yan cümleyi artık kendisi kurmaz;
//   `kusur` alanına çizelgedeki bir kimliği yazar ve iki dilin cümlesi tanı
//   kataloğunda kurulur. Nöbet üç şeyi birlikte tutar: her yan cümlenin İngilizcesi
//   ölçerden temiz geçer, yan cümle okuyan her katalog girdisi çerçeve olarak
//   temizdir ve kaynakta yan cümle okuyan tanıya düzyazı geçiren hiçbir üretici yoktur.
// ═══════════════════════════════════════════════════════════════════════════

/** Bağlam matrisindeki bütün metin değerleri — tanının yansıttığı kullanıcı içeriği. */
const MATRIS_ICERIGI: readonly string[] = [...new Set(BAGLAMLAR.flatMap((b) => Object.values(b)
  .flatMap((v) => (Array.isArray(v) ? v : [v])).filter((v): v is string => typeof v === "string")))];

/** Kurucu yan cümle çizelgesinden okuyor mu (`yc`)? Okuyorsa `kusur` alanı bir yan cümle kimliğidir. */
const ycKullanir = (kurucu: (p: TaniBaglami) => unknown): boolean => kurucu.toString().includes("yc(p");

/**
 * İngilizce katalogların matris üzerindeki bütün cümleleri. Yan cümle okuyan
 * kurucuya matrisin dal kimlikleri (`kusur: "biçim"` gibi) verilmez: o kimlikler
 * başka tanıların dalını seçer ve yan cümle okuyan kurucu onları olduğu gibi
 * basardı; gerçek üreticiler o kurucuya yalnız çizelgedeki kimliği verir (aşağıdaki
 * kaynak nöbeti bunu ölçer).
 */
function ingilizceCumleler(): Array<{ yer: string; metin: string }> {
  const cumleler: Array<{ yer: string; metin: string }> = [];
  for (const [ad, katalog] of ANLATIM_KATALOGLARI) {
    if (!ad.endsWith("(en)")) continue;
    for (const kod of Object.keys(katalog)) {
      for (const alan of ["mesaj", "oneri"] as const) {
        const kurucu = katalog[kod][alan];
        if (typeof kurucu !== "function") continue;
        const satirlar = ycKullanir(kurucu)
          ? BAGLAMLAR.filter((b) => b.kusur === undefined || String(b.kusur) in KUSUR_YAN_CUMLELERI)
          : BAGLAMLAR;
        for (const baglam of satirlar) {
          const metin = kurucu(baglam);
          if (metin) cumleler.push({ yer: `${ad} · ${kod}.${alan}`, metin });
        }
      }
    }
  }
  for (const [ad, katalog] of ORTAK_KATALOGLAR) {
    if (!ad.endsWith("(en)")) continue;
    for (const kod of Object.keys(katalog)) {
      for (const baglam of BAGLAMLAR) {
        const metin = katalog[kod](baglam);
        if (metin) cumleler.push({ yer: `${ad} · ${kod}`, metin });
      }
    }
  }
  return cumleler;
}

test("MGZ-A09: İngilizce tanı cümlesi İngilizce konuşur ve dosyadaki Türkçe adları aynen anar", () => {
  const kusurlu = new Map<string, string>();
  for (const { yer, metin } of ingilizceCumleler()) {
    const kusur = ingilizceYuzKusurlari(metin, MATRIS_ICERIGI);
    const anahtar = yer.split(" · ").slice(0, 2).join(" · ");
    if (kusur.length && !kusurlu.has(anahtar)) {
      kusurlu.set(anahtar, `[${kusur.map((k) => `${k.tur}=${k.sozce}`).join(", ")}] ${metin.replace(/\s+/gu, " ").slice(0, 160)}`);
    }
  }
  assert.deepEqual([...kusurlu].map(([yer, bulgu]) => `${yer} ${bulgu}`), [],
    "İngilizce tanıda Türkçe düzyazı ya da dosyada bulunmayan bir ad karşılığı var");
});

/** Yan cümlelerin örnek olgusu; dizgi değerleri dosyanın içeriği yerine geçer. */
const YAN_CUMLE_ORNEGI: TaniBaglami = {
  sayi: 2, hedef: "ADM-HEDEF", hedefTip: "Teknoloji", kaynakTip: "Blok", kademe: "Katman", ust: "Blok", alt: "Adım",
  beklenen: "KimlikKökü", yonlendir: "takim", yol: "src/a.ts", etmen: "ETM-A", bolum: "MIM", anaMadde: "MIM-1",
  atlanan: "MIM-2", dayanak: "XYZ-1", kaynakYol: "kaynak.sar", acikAsama: "kapsam", asama: "uygulama", iz: "guven-esikleri",
  adlar: ["left-pad"], tip: "Adım", aile: "plan", alanlar: ["zorunlu"], bolge: "TAKSONOMI", acilis: 2, kapanis: 1,
  taniKodu: "tanı-örneği", deger: "orta", oncul: ['"ADM-1" (beklemede)', '"ADM-2" (bloklu)'], fazdan: 1, uye: "MIM",
  ay: "13", yil: "2026", sonGun: "30", gun: "31", kapsam: "tek-dosya", projeler: ["PRJ-A", "PRJ-B"], evsizSayi: 4,
  evsiz: ["a.sar", "b.sar", "c.sar"], duzeyler: ["hata", "uyarı"], terfiGerekce: "örnek gerekçe",
  terfiBulgulari: ["atlama:bilgi:hata", "sayac", "kanit:uygulama,doğrulama", "kabul"], kapilar: ["rejim"],
  duzey: "hata", cozulmeyen: ["ADM-X"], sonlanmaYok: true, otoriteGecersiz: "üst", katmanYok: true, kapsamYok: true,
};
/** Listesi yan cümleye göre değişen eksik kimlikleri. */
const YAN_CUMLE_EKSIKLERI: Readonly<Record<string, readonly string[]>> = {
  "beceri-eksikleri": ["hedef", "tetik", "ornek", "kabul"],
  "kapanis-eksikleri": ["kapsam", "dogrulama", "borc", "etki"],
  "omurga-eksikleri": ["tip", "sema", "sarma"],
  "terfi-kanitlari-eksik": ["uygulama", "dogrulama", "kabul"],
  "tani-alanlari-eksik": ["duzey", "kod", "mesaj", "konum", "oneri", "sicil"],
};

test("MGZ-A09: her kusur yan cümlesi iki dilde kurulur ve İngilizcesi dosyadaki adları anar", () => {
  const ornekIcerigi = Object.values(YAN_CUMLE_ORNEGI).flatMap((v) => (Array.isArray(v) ? v : [v]))
    .filter((v): v is string => typeof v === "string");
  const kusurlu: string[] = [];
  for (const [kimlik, cumle] of Object.entries(KUSUR_YAN_CUMLELERI)) {
    assert.match(kimlik, /^[a-z0-9-]+$/u, `${kimlik}: yan cümle kimliği ASCII yazılır (H15)`);
    for (const ek of [{}, { eksik: YAN_CUMLE_EKSIKLERI[kimlik] ?? [] }, { sayi: 1, evsizSayi: 1, hedefYok: true, yonlendir: "kullanir" }]) {
      const p = { ...YAN_CUMLE_ORNEGI, ...ek, kusur: kimlik };
      const tr = cumle.tr(p);
      const en = cumle.en(p);
      assert.ok(tr.trim() && en.trim(), `${kimlik}: yan cümle boş kaldı`);
      assert.notEqual(en, tr, `${kimlik}: İngilizce yan cümle Türkçenin kopyası`);
      const k = ingilizceYuzKusurlari(en, ornekIcerigi);
      if (k.length) kusurlu.push(`${kimlik} [${k.map((x) => `${x.tur}=${x.sozce}`).join(", ")}] ${en}`);
    }
  }
  assert.deepEqual([...new Set(kusurlu)], [], "İngilizce yan cümlede Türkçe düzyazı ya da dosyada bulunmayan bir ad karşılığı var");
});

// Kaynak nöbeti: yan cümle okuyan bir tanıya hiçbir üretici düzyazı geçiremez.
// Ölçüt üreticinin kaynağıdır, çünkü bir üretici yolu her koşumda ateşlenmez ve
// çalışma anı ölçümü ateşlenmeyen yolu hiç görmezdi.
test("MGZ-A09: yan cümle okuyan tanının üreticisi `kusur` alanına yalnız çizelgedeki bir kimliği yazar", () => {
  const ts = createRequire(import.meta.url)("typescript") as typeof import("typescript");
  const SRC = fileURLToPath(new URL("../src/", import.meta.url));
  const okunan = (ad: string): import("typescript").SourceFile =>
    ts.createSourceFile(ad, readFileSync(join(SRC, ad), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

  // Yan cümle okuyan tanılar: İngilizce kataloğu `yc(p` çağıran girdiler.
  const ycTanilari = new Set<string>();
  for (const katalog of [TANI_METINLERI_EN, ONCEKI_TANI_METINLERI_EN] as Katalog[]) {
    for (const [kod, girdi] of Object.entries(katalog)) {
      if ([girdi.mesaj, girdi.oneri].some((f) => typeof f === "function" && ycKullanir(f))) ycTanilari.add(kod);
    }
  }
  assert.ok(ycTanilari.size > 40, `yalnız ${ycTanilari.size} yan cümle tanısı bulundu — nöbet kör`);

  const kimlikMi = (d: import("typescript").Node): boolean => ts.isStringLiteral(d) && d.text in KUSUR_YAN_CUMLELERI;
  const ifadeGecerli = (d: import("typescript").Node): boolean =>
    kimlikMi(d) || (ts.isConditionalExpression(d) && ifadeGecerli(d.whenTrue) && ifadeGecerli(d.whenFalse))
    || (ts.isParenthesizedExpression(d) && ifadeGecerli(d.expression));
  const ihlaller: string[] = [];
  let olculen = 0;
  for (const ad of readdirSync(SRC).filter((x) => x.endsWith(".ts") && x !== "tani-metinleri.ts")) {
    const sf = okunan(ad);
    const islevler = new Map<string, import("typescript").FunctionDeclaration>();
    const topla = (n: import("typescript").Node): void => {
      if (ts.isFunctionDeclaration(n) && n.name) islevler.set(n.name.text, n);
      ts.forEachChild(n, topla);
    };
    topla(sf);
    /** Bir adın, kullanıldığı yeri saran en yakın blokta ilan edildiği değer. */
    const bildirimBul = (yer: import("typescript").Node, isim: string): import("typescript").Expression | undefined => {
      for (let n: import("typescript").Node | undefined = yer; n; n = n.parent) {
        if (!ts.isBlock(n) && !ts.isSourceFile(n)) continue;
        for (const st of n.statements) {
          if (!ts.isVariableStatement(st)) continue;
          for (const v of st.declarationList.declarations) {
            if (ts.isIdentifier(v.name) && v.name.text === isim && v.initializer) return v.initializer;
          }
        }
      }
      return undefined;
    };
    /** Yayılan bağlamın kaynağı: kusurunu çizelge kimliğiyle kuran bir yardımcı mı? */
    const yayilanGecerli = (d: import("typescript").Expression): boolean => {
      const kaynak = ts.isIdentifier(d) ? bildirimBul(d, d.text) : d;
      if (!kaynak) return false;
      if (ts.isObjectLiteralExpression(kaynak)) return true;   // kusursuz olgu nesnesi
      if (!ts.isCallExpression(kaynak) || !ts.isIdentifier(kaynak.expression)) return false;
      const islev = islevler.get(kaynak.expression.text);
      if (!islev) return false;
      const kusurlar: import("typescript").Node[] = [];
      const ara = (n: import("typescript").Node): void => {
        if (ts.isPropertyAssignment(n) && n.name.getText() === "kusur") kusurlar.push(n.initializer);
        ts.forEachChild(n, ara);
      };
      ara(islev);
      return kusurlar.length > 0 && kusurlar.every(ifadeGecerli);
    };
    const gez = (n: import("typescript").Node): void => {
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && ["yeniTani", "eskiTani"].includes(n.expression.text)) {
        const ilk = n.arguments[0];
        if (ilk && ts.isStringLiteral(ilk) && ycTanilari.has(ilk.text)) {
          olculen++;
          const yer = `${ad}:${sf.getLineAndCharacterOfPosition(n.getStart()).line + 1} ${ilk.text}`;
          const baglam = n.arguments[n.expression.text === "eskiTani" ? 2 : 1];
          if (!baglam || !ts.isObjectLiteralExpression(baglam)) {
            ihlaller.push(`${yer}: bağlam bir nesne değişmezi değil`);
          } else {
            let karar: boolean | undefined;
            for (const o of baglam.properties) {
              if (ts.isPropertyAssignment(o) && o.name.getText() === "kusur") karar = ifadeGecerli(o.initializer);
              else if (ts.isShorthandPropertyAssignment(o) && o.name.text === "kusur") {
                const ilkDeger = bildirimBul(o, "kusur");
                karar = ilkDeger !== undefined && ifadeGecerli(ilkDeger);
              } else if (ts.isSpreadAssignment(o) && karar === undefined && !yayilanGecerli(o.expression)) {
                karar = false;
              }
            }
            if (karar === false) ihlaller.push(`${yer}: kusur alanı çizelgedeki bir kimlik değil`);
          }
        }
      }
      ts.forEachChild(n, gez);
    };
    gez(sf);
  }
  assert.ok(olculen > 80, `yalnız ${olculen} üretici çağrısı ölçüldü — nöbet kör`);
  assert.deepEqual(ihlaller, [], "yan cümle okuyan tanıya düzyazı ya da çizelgede olmayan bir kimlik geçiliyor");
});

test("anlatım bütünlüğü nöbetinin iki istisnası dar tutulur", () => {
  assert.deepEqual(telegrafikImler("Bloğu -->| ile |<-- arasına yaz."), []);
  assert.deepEqual(telegrafikImler("Örnek: `| sütun | değer |` satırını koru."), []);
  assert.deepEqual(telegrafikImler("Yeniden adlandır: 'a' → 'b'."), ["ok işareti"]);
  assert.deepEqual(telegrafikImler("Üç yol: ekle | aç | güncelle."), ["dikey çizgi"]);
});

// ═══════════════════════════════════════════════════════════════════════════
// BKM-DNT-A13 · İDDİA DÜZEYİNDE ÇEVİRİ NÖBETİ
//
//   Bağımsız denetçi 2026-08-09 tarihinde şunu göstermiştir: İngilizce cümleyi
//   eski KAP İDDİASINA geri döndüren mutasyon kapıdan YEŞİL geçmektedir, çünkü
//   çeviri nöbeti yalnız anahtar ile alan eşliğini ölçmekte, cümlenin NE İDDİA
//   ETTİĞİNİ ölçmemektedir. Bugünkü metin doğrudur fakat sessizce bayatlayabilir.
//
//   Bu nöbet iddiayı ölçer: yol bir DOSYA ise, diskte YOK ise ya da `--ana`
//   bayrağına bir DİZİN verilmişse, hiçbir dilin cümlesi "bu dizinde giriş
//   dosyası yok" biçiminde bir kap iddiası kuramaz. Ölçülmeyen kap iddiası
//   kullanıcıyı var olmayan bir dizinin içini aramaya yöneltir.
// ═══════════════════════════════════════════════════════════════════════════

/** Kap iddiası imzaları — iki dilde, cümlenin NE DEDİĞİNİ arar. */
const KAP_IDDIASI: readonly RegExp[] = [
  /dizininde giriş dosyası yok/u,
  /içinde giriş dosyası yok/u,
  /has no entry file/u,
  /no entry file inside/u,
];

test("BKM-DNT-A13: ölçülmüş dosya · yok · bayrak-dizin dallarında hiçbir dil KAP İDDİASI kurmaz", () => {
  const daller: ReadonlyArray<{ ad: string; baglam: TaniBaglami }> = [
    { ad: "hedef=dosya", baglam: { kusur: "girişsiz-dizin", dizin: "/x/y.sar", hedef: "dosya" } },
    { ad: "hedef=yok", baglam: { kusur: "girişsiz-dizin", dizin: "/x/yok", hedef: "yok" } },
    { ad: "--ana + dizin", baglam: { kusur: "girişsiz-dizin", dizin: "/tmp", hedef: "dizin", disBeyan: true } },
    { ad: "--ana + yok", baglam: { kusur: "girişsiz-dizin", dizin: "/x/yok.sar", hedef: "yok", disBeyan: true } },
  ];
  const ihlaller: string[] = [];
  for (const { ad, baglam } of daller) {
    for (const [dil, katalog] of [["tr", ONCEKI_TANI_METINLERI], ["en", ONCEKI_TANI_METINLERI_EN]] as const) {
      const girdi = katalog["kural-ihlali"];
      assert.ok(girdi, "kural-ihlali kataloğu bulunmalı");
      for (const [alan, uret] of [["mesaj", girdi.mesaj], ["oneri", girdi.oneri]] as const) {
        if (!uret) continue;
        const cumle = uret(baglam) ?? "";
        for (const desen of KAP_IDDIASI) {
          if (desen.test(cumle)) ihlaller.push(`${dil}.${alan} [${ad}] → ${cumle}`);
        }
      }
    }
  }
  assert.deepEqual(ihlaller, [],
    "ölçülmüş dalda kap iddiası kuran cümle, kullanıcıyı var olmayan bir dizinin içini aramaya yöneltir");
});

test("BKM-DNT-A13: varsayılan dal (gerçekten girişsiz DİZİN) kap iddiasını kurmaya DEVAM eder", () => {
  // Nöbetin körlük sınavı: iddia yasağı yalnız ÖLÇÜLMÜŞ dallarda geçerlidir.
  // Gerçekten bir dizin girişsizse cümle onu söylemek ZORUNDADIR, yoksa nöbet
  // bütün cümleleri boşaltmakla da yeşil kalırdı.
  const baglam: TaniBaglami = { kusur: "girişsiz-dizin", dizin: "/x/proje", hedef: "dizin" };
  const tr = ONCEKI_TANI_METINLERI["kural-ihlali"]?.mesaj(baglam) ?? "";
  const en = ONCEKI_TANI_METINLERI_EN["kural-ihlali"]?.mesaj(baglam) ?? "";
  assert.match(tr, /dizininde giriş dosyası yok/u, "gerçek girişsiz dizinde Türkçe cümle iddiayı kurmalı");
  assert.match(en, /has no entry file/u, "gerçek girişsiz dizinde İngilizce cümle iddiayı kurmalı");
});

test("BKM-DNT-A13: `--ana` dalında iki dilin önerisi de BAYRAĞI anar", () => {
  for (const [dil, katalog] of [["tr", ONCEKI_TANI_METINLERI], ["en", ONCEKI_TANI_METINLERI_EN]] as const) {
    for (const hedef of ["dizin", "yok"] as const) {
      const oneri = katalog["kural-ihlali"]?.oneri?.({ kusur: "girişsiz-dizin", dizin: "/x", hedef, disBeyan: true }) ?? "";
      assert.match(oneri, /--ana/u,
        `${dil} önerisi (hedef=${hedef}) kullanıcının fiilen kullandığı bayrağı anmalı; anmayan öneri kullanıcıyı kendi komutunun dışına yönlendirir`);
    }
  }
});

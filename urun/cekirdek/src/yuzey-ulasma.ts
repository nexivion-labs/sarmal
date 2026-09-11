// ═══════════════════════════════════════════════════════════════════════════
// yuzey-ulasma.ts — 🧭 YÖNLENDİRME İLE ULAŞMANIN AYRI ÖLÇÜMÜ (BKM-DNT-A02)
//
//   YUZ-3.3 her tanıyı doğasına göre bir sunum yüzeyine YÖNLENDİRİR. Yönlendirme
//   bir NİYETTİR; tanının o yüzeye gerçekten ULAŞMASI ise ayrı bir olgudur ve
//   kararı tanının kimliği değil, onu doğuran ÜRETİCİNİN ilan edilmiş yüzeyi
//   verir (`kapi-kapsami.ts`). İki olgu bugüne dek tek sütunda konuşuyordu ve
//   yönlendirilmiş fakat hiçbir yüzeye ulaşmayan kayıtlar sessiz kalıyordu.
//
//   Bu modül ikisini AYRI ölçer ve aradaki farkı bir nöbete bağlanabilir veri
//   olarak döndürür. İkinci bir yönlendirme çizelgesi YAZMAZ: yüzey kararını
//   `denetim.ts` içindeki `beklenenSunumYuzeyi` işlevinden okur, çünkü kararın
//   iki kaynağı olsaydı biri sessizce bayatlar ve tanı yanlış yüzeye düşerdi.
//
//   Modülün ikinci işi kaydın SAYILARINI türetmektir. `tani_yuzeyi_yonlendirme_
//   matrisi.sar` kaydı aynı olguyu üç yerde (Çıkarım düğümü · düzyazı · çizelge)
//   söyler ve üçü elle yazıldığı için birbirinden ayrışmıştı. Buradaki üreteç
//   üçünün de karşılaştırılacağı TEK canlı ölçümü verir.
// ═══════════════════════════════════════════════════════════════════════════

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { KAPI_KAPSAMI, type KapiGirdisi } from "./kapi-kapsami.ts";
import { beklenenSunumYuzeyi, ILERI_BAGLAM_KIMLIKLERI, type SunumYuzeyi } from "./denetim.ts";
import { ONCEKI_TANI_KODLARI, YENI_TANI_KANONU, SABIT_TANI_KODLARI } from "./tani-sicili.ts";
import type { Duzey } from "./tani.ts";

/** Tek bir ilan girdisinin yönlendirme ve ulaşma hâli. */
export interface UlasmaSatiri {
  uretici: string;
  modul: KapiGirdisi["modul"];
  kademe: KapiGirdisi["kademe"];
  /** YUZ-3.3'ün bu kademeyi yolladığı yüzey — `beklenenSunumYuzeyi` kararıdır. */
  yonlendirilen: SunumYuzeyi;
  /** İlanda `panel` yüzeyi var mı — üç sunum yüzeyinin üçü de panelde yaşar. */
  ulasir: boolean;
  /** Ulaşmayan girdinin ilandaki gerekçesi; gerekçesizlik nöbetin konusudur. */
  gerekce?: string;
}

/** Bir sunum yüzeyinin yönlendirme ve ulaşma sayacı. */
export interface YuzeySayaci {
  yonlendirilen: number;
  ulasan: number;
  ulasmayan: number;
}

/** Önceki gövdenin kaynaktan ölçülen kademe dağılımı. */
export interface OncekiKademeOlcumu {
  /** Kaynakta TEK bir kademeyle doğan kimlikler. */
  hata: number;
  uyari: number;
  bilgi: number;
  /** Birden çok çağrı yerinde farklı kademelerle doğan kimlikler (hepsi hata|uyarı). */
  cokKademeli: readonly string[];
  /** Kademesi koşum anındaki bir koşuldan gelen kimlikler. */
  baglamsal: readonly string[];
  /** `eskiTani` çağrısı taramada bulunamayan kimlikler. */
  olculemeyen: readonly string[];
  /** hata + uyarı + bilgi + çokKademeli + bağlamsal + ölçülemeyen = ONCEKI_TANI_KODLARI. */
  toplam: number;
}

/** Yönlendirme ile ulaşmanın tam ölçümü. */
export interface UlasmaOzeti {
  /** Kanonik tanı sicilinin bugünkü boyutu (`SABIT_TANI_KODLARI`). */
  sicilToplami: number;
  yeniKimlik: number;
  oncekiKimlik: number;
  /** İleri-bağlam kümesinin boyutu — Hatırlatıcılar hanesinin TEK belirleyicisi. */
  hatirlaticiKimlik: number;
  satirlar: readonly UlasmaSatiri[];
  yuzeyler: Readonly<Record<SunumYuzeyi, YuzeySayaci>>;
  /**
   * FARKIN SIFIR OLMASI GEREKEN YARISI: hata ya da uyarı basıp panele
   * ulaşmayan ve hiçbir panel ikiziyle korunmayan girdiler. YUZ-3.1 gizleme
   * yasağı gereği bu küme BOŞ olmalıdır (BKM-DNT-A01 kapanışı) ve dolması
   * doğrudan kanon ihlalidir.
   */
  sessizFark: readonly UlasmaSatiri[];
  /**
   * PANEL İKİZİYLE KORUNAN FARK: hata ya da uyarı basıp panele ulaşmayan,
   * fakat aynı hükmü panele basan bir ikizi ilanda ADIYLA beyan edilmiş ve o
   * ikizin panelde yaşadığı ÖLÇÜLMÜŞ girdiler. Bu küme gizlenmez, ayrı sayılır:
   * korunuyor olmak görünmez olmak değildir ve kaydın bu satırları adıyla
   * listelemesi gerekir.
   */
  ikizliFark: readonly UlasmaSatiri[];
  /**
   * FARKIN GEREKÇE İSTEYEN YARISI: ulaşmayan fakat gerekçe cümlesi taşımayan
   * girdiler. Gerekçesiz bir ulaşmama sessiz bir gizleme kararıdır.
   */
  gerekcesizFark: readonly UlasmaSatiri[];
  /** Ulaşmayan ve gerekçesi yazılmış girdiler — kayda listelenecek küme. */
  gerekceliFark: readonly UlasmaSatiri[];
}

/**
 * YÖNLENDİRME × ULAŞMA ÜRETECİ. Tabanını üretilen tanılardan değil İLAN EDİLEN
 * ÜRETİCİ KÜMESİNDEN alır; bir üreticinin hiç koşmaması da ölçülmüş olsun diye.
 *
 * Yönlendirme kararı `beklenenSunumYuzeyi` işlevine SORULUR, burada yeniden
 * kurulmaz. İşlev bir `Tani` beklediği için girdi başına yapay bir tanı nesnesi
 * kurulur; nesnenin kimliği ilan girdisinin adı değil BOŞTUR, çünkü ilan
 * ÜRETİCİ granülünde yazılır ve bir üreticinin bastığı kimlikler tek tek
 * ilan edilmez. Boş kimlik ileri-bağlam kümesine düşmez, dolayısıyla üretici
 * granülünde yönlendirme yalnız kademeden türer; ileri-bağlam hanesi kimlik
 * granülünde ayrıca sayılır (`hatirlaticiKimlik`).
 */
export function yuzeyUlasmaOzeti(ilan: readonly KapiGirdisi[] = KAPI_KAPSAMI): UlasmaOzeti {
  const satirlar: UlasmaSatiri[] = [];
  const yuzeyler: Record<SunumYuzeyi, YuzeySayaci> = {
    problems: { yonlendirilen: 0, ulasan: 0, ulasmayan: 0 },
    "hatırlatıcılar": { yonlendirilen: 0, ulasan: 0, ulasmayan: 0 },
    bildirimler: { yonlendirilen: 0, ulasan: 0, ulasmayan: 0 },
  };
  for (const girdi of ilan) {
    const yonlendirilen = beklenenSunumYuzeyi({ kod: "", duzey: girdi.kademe });
    const ulasir = girdi.yuzeyler.includes("panel");
    const satir: UlasmaSatiri = {
      uretici: girdi.uretici, modul: girdi.modul, kademe: girdi.kademe,
      yonlendirilen, ulasir,
      ...(girdi.cliGerekcesi?.trim() ? { gerekce: girdi.cliGerekcesi.trim() } : {}),
    };
    satirlar.push(satir);
    const sayac = yuzeyler[yonlendirilen];
    sayac.yonlendirilen++;
    if (ulasir) sayac.ulasan++; else sayac.ulasmayan++;
  }
  const panelliler = new Set(ilan.filter((g) => g.yuzeyler.includes("panel")).map((g) => g.uretici));
  const ikizAdi = new Map(ilan.map((g) => [g.uretici, g.panelIkizi]));
  const ikizKoruyor = (uretici: string): boolean => {
    const ikiz = ikizAdi.get(uretici);
    return !!ikiz && panelliler.has(ikiz);
  };
  const ulasmayanlar = satirlar.filter((s) => !s.ulasir);
  const kademeliUlasmayan = ulasmayanlar.filter((s) => s.kademe === "hata" || s.kademe === "uyarı");
  return {
    sicilToplami: SABIT_TANI_KODLARI.length,
    yeniKimlik: YENI_TANI_KANONU.length,
    oncekiKimlik: ONCEKI_TANI_KODLARI.length,
    hatirlaticiKimlik: ILERI_BAGLAM_KIMLIKLERI.size,
    satirlar,
    yuzeyler,
    sessizFark: kademeliUlasmayan.filter((s) => !ikizKoruyor(s.uretici)),
    ikizliFark: kademeliUlasmayan.filter((s) => ikizKoruyor(s.uretici)),
    gerekcesizFark: ulasmayanlar.filter((s) => !s.gerekce),
    gerekceliFark: ulasmayanlar.filter((s) => !!s.gerekce),
  };
}

/**
 * Motor kaynağının `eskiTani("<kimlik>", "<kademe>", …)` çağrılarını tarayarak
 * önceki gövdenin kademe dağılımını ölçer. Bu ölçüm kaydın "elle doğrulanır"
 * dediği iki sayıyı makineye bağlar: önceki 101 kimliğin kademesi sicilde
 * makine-okur biçimde tutulmaz, yalnız üreticinin çağrı satırında yaşar ve
 * tarama tam da o satırı okur.
 *
 * Tarama DÜRÜSTTÜR: ölçemediğini ölçülmüş göstermez. Kademesi bir koşula bağlı
 * yazılmış kimlik `bağlamsal`, hiç çağrı bulunamayan kimlik `ölçülemeyen`
 * hanesine düşer ve ikisi de sayısal dağılımın dışında kalır.
 */
export function oncekiKademeOlcumu(kaynakDizini: string): OncekiKademeOlcumu {
  const kademeler = new Map<string, Set<string>>();
  for (const dosya of readdirSync(kaynakDizini).filter((d) => d.endsWith(".ts"))) {
    const kaynak = readFileSync(join(kaynakDizini, dosya), "utf8");
    const desen = /eskiTani\(\s*"([^"]+)"\s*,\s*([^,]+?),/g;
    let eslesme: RegExpExecArray | null;
    while ((eslesme = desen.exec(kaynak))) {
      const kod = eslesme[1];
      if (!ONCEKI_TANI_KODLARI.includes(kod)) continue;
      const arguman = eslesme[2].trim();
      const sabit = arguman.match(/^"(hata|uyarı|bilgi)"$/);
      if (!kademeler.has(kod)) kademeler.set(kod, new Set());
      kademeler.get(kod)!.add(sabit ? sabit[1] : "bağlamsal");
    }
  }
  const sayac: Record<Duzey, number> = { hata: 0, "uyarı": 0, bilgi: 0 };
  const cokKademeli: string[] = [];
  const baglamsal: string[] = [];
  const olculemeyen: string[] = [];
  for (const kod of ONCEKI_TANI_KODLARI) {
    const bulunan = kademeler.get(kod);
    if (!bulunan) { olculemeyen.push(kod); continue; }
    const degerler = [...bulunan];
    if (degerler.includes("bağlamsal")) { baglamsal.push(kod); continue; }
    if (degerler.length > 1) { cokKademeli.push(kod); continue; }
    sayac[degerler[0] as Duzey]++;
  }
  return {
    hata: sayac.hata, uyari: sayac["uyarı"], bilgi: sayac.bilgi,
    cokKademeli, baglamsal, olculemeyen,
    toplam: sayac.hata + sayac["uyarı"] + sayac.bilgi + cokKademeli.length + baglamsal.length + olculemeyen.length,
  };
}

/** Kaydın üç sayı kaynağından okunan tek bir haneli iddia. */
export interface KayitIddiasi {
  kaynak: "çizelge" | "düzyazı" | "çıkarım";
  hane: string;
  deger: number;
}

const SAYI_DESENLERI: readonly { kaynak: KayitIddiasi["kaynak"]; hane: string; desen: RegExp }[] = [
  { kaynak: "çizelge", hane: "toplam", desen: /^\| \*\*Toplam\*\* \| \*\*(\d+)\*\* \|/m },
  { kaynak: "çizelge", hane: "problems", desen: /^\| Problems \| (\d+) \|/m },
  { kaynak: "çizelge", hane: "hatırlatıcılar", desen: /^\| Hatırlatıcılar \| (\d+) \|/m },
  { kaynak: "çizelge", hane: "bildirimler", desen: /^\| Bildirimler \| (\d+) \|/m },
  { kaynak: "düzyazı", hane: "toplam", desen: /sicilinde bugün \*\*(\d+)\*\* kimlik vardır/ },
  { kaynak: "düzyazı", hane: "yeni", desen: /ettiği \*\*(\d+)\*\* kimlik ile ondan önce/ },
  { kaynak: "düzyazı", hane: "önceki", desen: /ondan önce yazılmış \*\*(\d+)\*\* kimlik/ },
  // Ulaşma çizelgesi (ilan granülü) — kaydın bu üç sayısı da canlı ölçüme bağlıdır.
  { kaynak: "çizelge", hane: "ilanToplamı", desen: /^\| \*\*İlan toplamı\*\* \| \*\*(\d+)\*\* \|/m },
  { kaynak: "çizelge", hane: "ilanUlaşan", desen: /^\| \*\*İlan toplamı\*\* \| \*\*\d+\*\* \| \*\*(\d+)\*\* \|/m },
  { kaynak: "çizelge", hane: "ilanUlaşmayan", desen: /^\| \*\*İlan toplamı\*\* \| \*\*\d+\*\* \| \*\*\d+\*\* \| \*\*(\d+)\*\* \|/m },
  { kaynak: "çıkarım", hane: "toplam", desen: /sicilin (\d+) kimliğinin tamamını tek yüzeye YÖNLENDİRİR/ },
  { kaynak: "çıkarım", hane: "ilanToplamı", desen: /ilan granülünde ölçülür: (\d+) ilan girdisinin/ },
  // Türkçe iyelik ve belirtme ekleri sayıya göre değişir (52'si · 53'ü · 54'ü · 60'ı);
  // desen ekin biçimine değil sayıya bağlanır ki ilan büyüdüğünde kayıt yeniden
  // yazılabilsin ve nöbet ek yüzünden kör kalmasın (KPS-MVS-A01 · 2026-09-10).
  { kaynak: "çıkarım", hane: "ilanUlaşan", desen: /ilan girdisinin (\d+)'(?:si|sı|sü|su|i|ı|ü|u) panele ulaşır/ },
  { kaynak: "çıkarım", hane: "ilanUlaşmayan", desen: /panele ulaşır, (\d+)'(?:u|ü|ı|i|si|sı|sü|su) ulaşmaz/ },
  { kaynak: "çıkarım", hane: "problems", desen: /dağılım (\d+) Problems/ },
  { kaynak: "çıkarım", hane: "hatırlatıcılar", desen: /Problems, (\d+) Hatırlatıcılar/ },
  { kaynak: "çıkarım", hane: "bildirimler", desen: /Hatırlatıcılar ve (\d+) Bildirimler/ },
];

/** Kayıt metninden üç kaynağın sayısal iddialarını çıkarır. */
export function kayitIddialari(kayitMetni: string): KayitIddiasi[] {
  const iddialar: KayitIddiasi[] = [];
  for (const { kaynak, hane, desen } of SAYI_DESENLERI) {
    const eslesme = kayitMetni.match(desen);
    if (eslesme) iddialar.push({ kaynak, hane, deger: Number(eslesme[1]) });
  }
  return iddialar;
}

/**
 * KAYIT NÖBETİ. Kaydın üç sayı kaynağını hem BİRBİRİNE hem canlı ölçüme karşı
 * tartar ve her sapmayı tek cümlede döndürür; boş dizi kaydın taze olduğunu
 * bildirir. Nöbet dört şeyi birden ölçer:
 *
 *   1. Üç kaynağın da tam takım olması — eksik desen sessiz geçilmez, çünkü
 *      okunamayan bir iddia ölçülmemiş iddiadır.
 *   2. Aynı hanenin üç kaynakta AYNI sayıyı söylemesi.
 *   3. Canlı sicilden türeyen hanelerin (toplam · yeni · önceki · Hatırlatıcılar)
 *      ölçümle BİREBİR eşitliği.
 *   4. Yüzey hanelerinin toplamının sicil boyutunu vermesi — Problems ile
 *      Bildirimler haneleri birlikte ve ters yönde kaydırılamasın diye.
 */
export function matrisKayitSapmalari(kayitMetni: string, ozet: UlasmaOzeti): string[] {
  const sapmalar: string[] = [];
  const iddialar = kayitIddialari(kayitMetni);
  if (iddialar.length !== SAYI_DESENLERI.length) {
    const okunan = new Set(iddialar.map((i) => `${i.kaynak}/${i.hane}`));
    for (const { kaynak, hane } of SAYI_DESENLERI) {
      if (!okunan.has(`${kaynak}/${hane}`)) sapmalar.push(`okunamayan iddia: ${kaynak} kaynağında ${hane} hanesi bulunamadı`);
    }
  }
  const haneler = new Map<string, KayitIddiasi[]>();
  for (const iddia of iddialar) {
    if (!haneler.has(iddia.hane)) haneler.set(iddia.hane, []);
    haneler.get(iddia.hane)!.push(iddia);
  }
  for (const [hane, liste] of haneler) {
    const degerler = new Set(liste.map((i) => i.deger));
    if (degerler.size > 1) {
      sapmalar.push(`${hane} hanesi kaynaklar arasında ayrışıyor: ${liste.map((i) => `${i.kaynak}=${i.deger}`).join(" · ")}`);
    }
  }
  const ulasan = ozet.satirlar.filter((s) => s.ulasir).length;
  const canli: Readonly<Record<string, number>> = {
    toplam: ozet.sicilToplami, yeni: ozet.yeniKimlik,
    "önceki": ozet.oncekiKimlik, "hatırlatıcılar": ozet.hatirlaticiKimlik,
    "ilanToplamı": ozet.satirlar.length,
    "ilanUlaşan": ulasan,
    "ilanUlaşmayan": ozet.satirlar.length - ulasan,
  };
  for (const [hane, beklenen] of Object.entries(canli)) {
    for (const iddia of haneler.get(hane) ?? []) {
      if (iddia.deger !== beklenen) {
        sapmalar.push(`${hane} hanesi canlı ölçümle uyuşmuyor: ${iddia.kaynak}=${iddia.deger}, canlı=${beklenen}`);
      }
    }
  }
  const oku = (hane: string): number | undefined => haneler.get(hane)?.[0]?.deger;
  const problems = oku("problems"), hatirlatici = oku("hatırlatıcılar"), bildirimler = oku("bildirimler");
  if (problems !== undefined && hatirlatici !== undefined && bildirimler !== undefined) {
    const toplam = problems + hatirlatici + bildirimler;
    if (toplam !== ozet.sicilToplami) {
      sapmalar.push(`yüzey haneleri sicil boyutunu vermiyor: ${problems}+${hatirlatici}+${bildirimler}=${toplam}, sicil=${ozet.sicilToplami}`);
    }
  }
  const yeni = oku("yeni"), onceki = oku("önceki");
  if (yeni !== undefined && onceki !== undefined && yeni + onceki !== ozet.sicilToplami) {
    sapmalar.push(`gövde haneleri sicil boyutunu vermiyor: ${yeni}+${onceki}=${yeni + onceki}, sicil=${ozet.sicilToplami}`);
  }
  return sapmalar;
}

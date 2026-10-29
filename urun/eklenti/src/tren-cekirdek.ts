// ═══════════════════════════════════════════════════════════════════════════
// tren-cekirdek.ts — 🚆 TREN GÖRÜNÜMÜNÜN SAF ÇEKİRDEĞİ
//
//   Founder 2026-10-21: Tren, yapay zekâ ajanlarının bölümüdür. Görünüm üç şey
//   gösterir: projedeki Etmen düğümleri (ajan ilanları), `geliştirmede` durumundaki
//   Adımlar ve varsa son Koşum mührü.
//
//   YENİ AYRIŞTIRICI YOKTUR. Girdi, denetim turunun yayınladığı program haritasıdır
//   (tur-goruntusu.ts); Yol Haritası paneli de aynı haritayı okur. Bu dosya o
//   ağaçtan yalnız üç şeyi süzer ve VS Code'u tanımaz, bu yüzden kabuksuz sınanır.
// ═══════════════════════════════════════════════════════════════════════════

import type { Deger, Dugum, Program } from "../../cekirdek/src/sozdizim.ts";
import { degerMetni } from "../../cekirdek/src/yolcoz.ts";
import { adAlaniAyir } from "../../cekirdek/src/kimlik.ts";
import { planAlani } from "./yolharitasi-cekirdek.ts";

/** Etmenin bir alanı: değeri ve alanın kaynak satırı (kartın satırı oraya götürür). */
export interface TrenAlan {
  deger: string;
  satir: number;
}

/** Profil kartının saydığı alt düğüm tipleri (PNL-A11 görev metni; şemada Etmen bunları sarar). */
export const ALT_DUGUM_TIPLERI = ["Beceri", "Yetenek", "Bellek", "Kanca", "Tetikleyici"] as const;
export type AltDugumTipi = (typeof ALT_DUGUM_TIPLERI)[number];

/** Etmenin sardığı bir alt düğüm. */
export interface TrenAltDugum {
  tip: AltDugumTipi;
  kod: string;
  ad: string;
  satir: number;
}

/**
 * Ajanın ilan edildiği yer: dosyayı kapsayan, `.sar` kaynağında ilan edilmiş Raf ya da Kitaplık.
 * Görünen ad ilanın kendi metnidir (`ad`, yoksa `ne` metninin ilk cümlesi, o da yoksa kod); panel
 * sabit bir departman adı yazmaz, ilan değişince ad da değişir.
 */
export interface TrenRaf {
  kod: string;
  ad: string;
  dosya: string;
  satir: number;
}

/** Projede ilan edilmiş bir ajan (Etmen düğümü) ve profil kartının verisi (PNL-A11). */
export interface TrenEtmeni {
  kod: string;
  ad: string;
  /** Etmenin türü: apex · yönetici · uzman (boş olabilir). */
  tur: string;
  ne: string;
  dosya: string;
  satir: number;
  /** Kartın skaler alanları (sınır PNL-A11 sunum kararıyla eklendi); ilan edilmemişse tanımsızdır. */
  alanlar: { uzmanlik?: TrenAlan; yetki?: TrenAlan; bellek?: TrenAlan; ne?: TrenAlan; sinir?: TrenAlan };
  /** `uygular:` hedefleri (anayasa) ve alanın satırı. */
  uygular: TrenHedef[];
  uygularSatir?: number;
  /** `yönetir:` hedefleri (örgüt şemasının tek kaynağı) ve alanın satırı. */
  yonetir: TrenHedef[];
  yonetirSatir?: number;
  /** Beceri, Yetenek, Bellek, Kanca ve Tetikleyici alt düğümleri, kaynak sırasıyla. */
  altlar: TrenAltDugum[];
  /** Departman: Etmeni saran ya da dosyasını kapsayan en derin Raf ya da Kitaplık ilanı. */
  departman?: TrenRaf;
  /** Ekip: departmanın altındaki kompakt `raflar:` haritasında dosyayı kapsayan girdi (ör. bir teknoloji ekibi). */
  ekip?: TrenRaf;
}

/**
 * Bir kenarın hedefi ya da zincirin bir halkası: kod, tipi, adı ve tanımının yeri. Kod indekste
 * bulunamazsa (başka projede ilan edilmiş, yazım hatalı ya da hiç ilan edilmemiş) `dosya` ve `satir`
 * tanımsızdır; satır yine kodla görünür, fakat tanımına götürmez.
 */
export interface TrenHedef {
  kod: string;
  /** Hedefin tipi (Etmen · Takım · Teknoloji …); çözülemeyen hedefte boştur. */
  tip: string;
  ad: string;
  dosya?: string;
  satir?: number;
}

/**
 * GELİŞTİRMEDEKİ İŞİN ZİNCİRİ (PNL-A12 · OZK-13 DÖRDÜNCÜSÜ): Adım → ajan → Katmanın zemini →
 * AltKatmanın departmanı. Dört parça da planın kendi beyanından okunur; atama yapılmaz, tahmin
 * edilmez. Ajan, Adıma bir Görev ile atanmış Etmendir (`Görev.gerçekleştirir` = Adımın kodu,
 * `Görev.atanan` = Etmenin kodu; çekirdekteki `atananEtmenler` ile aynı kural). Zemin, Adımı
 * kapsayan en yakın Katmanın `takım:` ve `kullanır:` kenarlarıdır; Takım ya da Teknolojiye yönelen
 * eski `bağımlı:` yazımı da çekirdeğin zemin kaydında olduğu gibi sayılır (dag.ts `zemin`).
 * Departman, Adımı kapsayan en yakın AltKatmanın `departman:` alanıdır (MIM-1.5).
 */
export interface TrenZinciri {
  /** Görev ile atanmış ajanlar; boşsa Adım atanmamıştır. */
  ajanlar: TrenHedef[];
  /** Adımı kapsayan en yakın Katman; esnek rejimde ya da Katmansız Adımda yoktur. */
  katman?: TrenHedef;
  /** Katmanın zemini: takım ve teknoloji hedefleri (beyan sırasıyla). */
  zemin: TrenHedef[];
  /** Adımı kapsayan en yakın AltKatman. */
  altKatman?: TrenHedef;
  /** AltKatmanın `departman:` değeri ve alanın satırı. */
  departman?: { deger: string; dosya: string; satir: number };
}

/** `durum: geliştirmede` olan bir Adım ve kapsayan zinciri. */
export interface TrenAdimi {
  kod: string;
  ad: string;
  dosya: string;
  satir: number;
  zincir: TrenZinciri;
}

/** Bir Adımın `koşu: Koşum(...)` kaydı. */
export interface TrenMuhru {
  /** Koşumun kendi kodu. */
  kod: string;
  /** Koşumun bağlı olduğu Adımın kodu. */
  adim: string;
  muhur: string;
  karar: string;
  tarih: string;
  ne: string;
  dosya: string;
  satir: number;
}

export interface TrenOzeti {
  etmenler: TrenEtmeni[];
  adimlar: TrenAdimi[];
  /** Tarihi en yeni Koşum; tarih yoksa taramada son görülen. */
  sonMuhur?: TrenMuhru;
}

const metin = (d: Dugum, alan: string): string => planAlani(d, alan)?.deger.metin ?? "";

/** Kenar değerindeki kodlar (tek kod ya da kod listesi; dag.ts `kenarHedefleri` ile aynı kural). */
function kenarKodlari(d: Deger | undefined): string[] {
  if (!d) return [];
  if (d.tur === "liste") return (d.ogeler ?? []).flatMap(kenarKodlari);
  return d.tur === "kod" && d.metin ? [d.metin] : [];
}

/** Görev'in atanan değeri: kod ya da metin, tek ya da liste (sef.ts `kodlariCikar` ile aynı kural). */
function atananKodlari(d: Deger | undefined): string[] {
  if (!d) return [];
  if (d.tur === "liste") return (d.ogeler ?? []).flatMap(atananKodlari);
  return (d.tur === "kod" || d.tur === "metin") && d.metin ? [d.metin] : [];
}

/** Çekirdeğin zemin tipleri (dag.ts `ZEMIN_TIPLERI`): Katman yalnız bunlara zemin bağı kurar. */
const ZEMIN_TIPLERI: ReadonlySet<string> = new Set(["Takım", "Teknoloji"]);

/** Yol yazımını tek biçime indirir: ters eğik çizgi düz olur, `.` ve `..` parçaları çözülür, sondaki eğik atılır. */
function yolDuzle(yol: string): string {
  const parcalar: string[] = [];
  const mutlak = yol.startsWith("/") || yol.startsWith("\\");
  for (const p of yol.replace(/\\/g, "/").split("/")) {
    if (!p || p === ".") continue;
    if (p === "..") parcalar.pop(); else parcalar.push(p);
  }
  return (mutlak ? "/" : "") + parcalar.join("/");
}
const dizinAdi = (dosya: string): string => { const d = yolDuzle(dosya); return d.slice(0, Math.max(0, d.lastIndexOf("/"))); };
/** `dizin` yolu `dosya`yı kapsıyor mu (ad benzerliği taşıyan kardeş klasör kapsanmış sayılmaz)? */
const kapsar = (dizin: string, dosya: string): boolean => yolDuzle(dosya).startsWith(`${dizin}/`);

/**
 * İlan metninin görünen adı: `ad` alanı, yoksa `ne` metninin ilk cümlesi (baştaki simge atılır, uzun
 * tire ile ayrılan açıklama kesilir), o da yoksa kod. Departman adı panelde sabit yazılmaz.
 */
export function ilanAdi(ad: string, ne: string, kod: string): string {
  if (ad.trim()) return ad.trim();
  const ilk = ne.replace(/^[\p{Extended_Pictographic}\uFE0F\u200D\s]+/u, "").split(/\s+—\s+/)[0]!.replace(/\s+/g, " ").trim();
  return ilk || kod;
}

/** Raf ya da Kitaplık ilanı ve çözülmüş mutlak dizini (iskeletci.ts ile aynı kural: `yol:` üst rafa göreli). */
interface RafIlani extends TrenRaf { dizin: string; kompakt: boolean }

/** Zincir çözülmeden önceki ham kayıt: düğümler ve henüz indekse bakılmamış kodlar. */
interface HamZincir {
  katman?: { d: Dugum; dosya: string };
  altKatman?: { d: Dugum; dosya: string };
}

/**
 * Program haritasından Tren özetini çıkarır. Sıra kararlıdır: etmenler ve adımlar
 * koda göre, aynı kodda dosya yoluna göre dizilir; böylece iki tur arasındaki
 * görünür fark yalnız veri farkıdır.
 *
 * Gezi tektir ve aynı geçişte üç şey daha toplanır (PNL-A12): her kodlu düğümün tanım yeri (kod
 * indeksi; aynı kodun ilk tanımı geçerlidir), Görev atamaları ve geliştirmedeki Adımın atası olan
 * en yakın Katman ile AltKatman. Zincir gezi bittikten sonra indeksle çözülür, çünkü atanan Etmen
 * ya da zemin Takımı başka bir dosyada ve gezide Adımdan sonra ilan edilmiş olabilir.
 */
export function trenOzetiCikar(programlar: Iterable<readonly [string, Program]>): TrenOzeti {
  const etmenler: TrenEtmeni[] = [];
  const adimlar: TrenAdimi[] = [];
  const hamZincir = new Map<TrenAdimi, HamZincir>();
  const indeks = new Map<string, { tip: string; ad: string; dosya: string; satir: number }>();
  /** Birden çok yerde ilan edilmiş kodlar: ad alanlı yazımın yerel parçası bunlarda tahminle çözülmez. */
  const yinelenen = new Set<string>();
  const atamalar = new Map<string, string[]>();
  let sonMuhur: TrenMuhru | undefined;
  const atalar: Dugum[] = [];
  const ataDosyasi: string[] = [];
  /** Raf ve Kitaplık ilanları (PNL-A11 departmanı); kompakt `raflar:` haritasının girdileri ekip adıdır. */
  const raflar: RafIlani[] = [];
  /** Etmeni fiziksel olarak saran en yakın Raf ya da Kitaplık (dosya yolundan önce gelir). */
  const sarilan = new Map<TrenEtmeni, TrenRaf>();
  const hamEtmen = new Map<TrenEtmeni, { uygular: string[]; yonetir: string[] }>();
  const enYakin = (tip: string): { d: Dugum; dosya: string } | undefined => {
    for (let i = atalar.length - 1; i >= 0; i--) if (atalar[i]!.ad === tip) return { d: atalar[i]!, dosya: ataDosyasi[i]! };
    return undefined;
  };
  const gez = (d: Dugum, dosya: string, taban: string): void => {
    const kodu = metin(d, "kod");
    let altTaban = taban;
    if (d.ad === "Raf" || d.ad === "Kitaplık") {
      const yol = metin(d, "yol");
      if (yol) altTaban = yolDuzle(`${taban}/${yol}`);
      if (kodu) raflar.push({ kod: kodu, ad: ilanAdi(metin(d, "ad"), metin(d, "ne"), kodu), dosya, satir: d.satir, dizin: yol ? altTaban : "", kompakt: false });
    }
    // Kompakt yaprak raflar (`raflar: { ad: "tarif" }`): yol = ad, görünen ad tarifin ilk cümlesi.
    const kompakt = planAlani(d, "raflar")?.deger;
    if (kompakt?.tur === "harita") {
      for (const c of kompakt.ciftler ?? []) {
        const ad = c.ad.replace(/\/+$/, "");
        raflar.push({ kod: ad, ad: ilanAdi("", degerMetni(c.deger), ad), dosya, satir: c.satir || d.satir, dizin: yolDuzle(`${altTaban}/${ad}`), kompakt: true });
      }
    }
    if (kodu) {
      if (indeks.has(kodu)) yinelenen.add(kodu);
      else indeks.set(kodu, { tip: d.ad, ad: metin(d, "ad"), dosya, satir: d.satir });
    }
    if (d.ad === "Etmen") {
      const kod = kodu;
      if (kod) {
        const alan = (ad: string): TrenAlan | undefined => {
          const p = planAlani(d, ad);
          const deger = p ? degerMetni(p.deger) : "";
          return p && deger ? { deger, satir: p.satir || d.satir } : undefined;
        };
        const e: TrenEtmeni = {
          kod, ad: metin(d, "ad"), tur: metin(d, "tür"), ne: metin(d, "ne"), dosya, satir: d.satir,
          alanlar: { uzmanlik: alan("uzmanlık"), yetki: alan("yetki"), bellek: alan("bellek"), ne: alan("ne"), sinir: alan("sınır") },
          uygular: [], uygularSatir: planAlani(d, "uygular")?.satir, yonetir: [], yonetirSatir: planAlani(d, "yönetir")?.satir,
          altlar: d.cocuklar.filter((c) => (ALT_DUGUM_TIPLERI as readonly string[]).includes(c.ad)).map((c) => ({
            tip: c.ad as AltDugumTipi, kod: metin(c, "kod"), ad: metin(c, "ad"), satir: c.satir,
          })),
        };
        etmenler.push(e);
        hamEtmen.set(e, { uygular: atananKodlari(planAlani(d, "uygular")?.deger), yonetir: atananKodlari(planAlani(d, "yönetir")?.deger) });
        const raf = [...atalar].reverse().find((x) => (x.ad === "Raf" || x.ad === "Kitaplık") && metin(x, "kod"));
        if (raf) {
          const i = atalar.lastIndexOf(raf);
          sarilan.set(e, { kod: metin(raf, "kod"), ad: ilanAdi(metin(raf, "ad"), metin(raf, "ne"), metin(raf, "kod")), dosya: ataDosyasi[i]!, satir: raf.satir });
        }
      }
    } else if (d.ad === "Görev") {
      // Atama beyanı (sef.ts `atananEtmenler`): gerçekleştirdiği Adımın kodu → atanan Etmenler.
      const g = planAlani(d, "gerçekleştirir");
      const adim = g ? degerMetni(g.deger) : "";
      if (adim) {
        const liste = atamalar.get(adim) ?? [];
        for (const k of atananKodlari(planAlani(d, "atanan")?.deger)) if (!liste.includes(k)) liste.push(k);
        atamalar.set(adim, liste);
      }
    } else if (d.ad === "Adım") {
      const kod = kodu;
      if (kod && metin(d, "durum") === "geliştirmede") {
        const a: TrenAdimi = { kod, ad: metin(d, "ad"), dosya, satir: d.satir, zincir: { ajanlar: [], zemin: [] } };
        adimlar.push(a);
        hamZincir.set(a, { katman: enYakin("Katman"), altKatman: enYakin("AltKatman") });
      }
      const k = planAlani(d, "koşu")?.deger.dugum;
      if (kod && k && k.ad === "Koşum") {
        const aday: TrenMuhru = {
          kod: metin(k, "kod"), adim: kod, muhur: metin(k, "mühür"), karar: metin(k, "karar"),
          tarih: metin(k, "tarih"), ne: metin(k, "ne"), dosya, satir: k.satir || d.satir,
        };
        // Tarihli kayıt tarihsizi yener; iki tarih arasında yenisi kazanır, eşitlikte sonraki.
        if (!sonMuhur || aday.tarih >= sonMuhur.tarih) sonMuhur = aday;
      }
    }
    atalar.push(d);
    ataDosyasi.push(dosya);
    for (const c of d.cocuklar) gez(c, dosya, altTaban);
    atalar.pop();
    ataDosyasi.pop();
  };
  for (const [dosya, program] of programlar) for (const d of program.bildirimler) gez(d, dosya, dizinAdi(dosya));

  // Ad alanlı yazım (`PRJ-X::KOD`, ORK-4) yerel parçasıyla çözülür; yerel kod birden çok yerde ilan
  // edilmişse hangi projenin tanımı olduğu buradan bilinemez ve hedef çözülmeden bırakılır.
  const tanim = (kod: string) => {
    const t = indeks.get(kod);
    if (t) return t;
    const { adAlani, yerel } = adAlaniAyir(kod);
    return adAlani && !yinelenen.has(yerel) ? indeks.get(yerel) : undefined;
  };
  const hedef = (kod: string): TrenHedef => {
    const t = tanim(kod);
    return t ? { kod, tip: t.tip, ad: t.ad, dosya: t.dosya, satir: t.satir } : { kod, tip: "", ad: "" };
  };
  const dugumHedefi = (k: { d: Dugum; dosya: string }): TrenHedef =>
    ({ kod: metin(k.d, "kod"), tip: k.d.ad, ad: metin(k.d, "ad"), dosya: k.dosya, satir: k.d.satir });
  for (const [a, ham] of hamZincir) {
    const z = a.zincir;
    z.ajanlar = (atamalar.get(a.kod) ?? []).map(hedef);
    if (ham.katman) {
      z.katman = dugumHedefi(ham.katman);
      // Önce tip-saf iki kenar (takım, kullanır), sonra Takım ya da Teknolojiye yönelen eski bağımlı yazımı.
      const kodlar: string[] = [];
      for (const kenar of ["takım", "kullanır"]) for (const k of kenarKodlari(planAlani(ham.katman.d, kenar)?.deger)) if (!kodlar.includes(k)) kodlar.push(k);
      for (const k of kenarKodlari(planAlani(ham.katman.d, "bağımlı")?.deger)) {
        if (!kodlar.includes(k) && ZEMIN_TIPLERI.has(tanim(k)?.tip ?? "")) kodlar.push(k);
      }
      z.zemin = kodlar.map(hedef);
    }
    if (ham.altKatman) {
      z.altKatman = dugumHedefi(ham.altKatman);
      const dep = planAlani(ham.altKatman.d, "departman");
      const deger = dep ? degerMetni(dep.deger) : "";
      if (dep && deger) z.departman = { deger, dosya: ham.altKatman.dosya, satir: dep.satir || ham.altKatman.d.satir };
    }
  }
  // PNL-A11: ajanın kenar hedefleri ve departmanı. Departman önce Etmeni saran ilandır; yoksa dosyayı
  // kapsayan en derin Raf ya da Kitaplık. Ekip, departmandan daha derin kompakt girdidir.
  const rafSec = (e: TrenEtmeni, kompakt: boolean, enAz = ""): RafIlani | undefined => {
    let sec: RafIlani | undefined;
    for (const r of raflar) {
      if (r.kompakt !== kompakt || !r.dizin || !kapsar(r.dizin, e.dosya) || r.dizin.length <= enAz.length) continue;
      if (!sec || r.dizin.length > sec.dizin.length) sec = r;
    }
    return sec;
  };
  const yalin = (r: RafIlani | undefined): TrenRaf | undefined => (r ? { kod: r.kod, ad: r.ad, dosya: r.dosya, satir: r.satir } : undefined);
  for (const [e, ham] of hamEtmen) {
    e.uygular = ham.uygular.map(hedef);
    e.yonetir = ham.yonetir.map(hedef);
    const yoldan = rafSec(e, false);
    e.departman = sarilan.get(e) ?? yalin(yoldan);
    const ekip = rafSec(e, true, sarilan.has(e) ? "" : yoldan?.dizin ?? "");
    if (ekip) e.ekip = yalin(ekip);
  }
  const sirala = <T extends { kod: string; dosya: string }>(l: T[]): T[] =>
    l.sort((a, b) => a.kod.localeCompare(b.kod, "tr") || a.dosya.localeCompare(b.dosya));
  return { etmenler: sirala(etmenler), adimlar: sirala(adimlar), sonMuhur };
}

/** Özet boş mu: ne ajan ilanı ne geliştirmede Adım ne de Koşum mührü var. */
export function trenBosMu(o: TrenOzeti): boolean {
  return o.etmenler.length === 0 && o.adimlar.length === 0 && !o.sonMuhur;
}

/** Değişim denetimi için parmak izi: aynı özet ikinci kez çizdirilmez. */
export function trenParmakIzi(o: TrenOzeti): string {
  const m = o.sonMuhur;
  const h = (x: TrenHedef | undefined) => (x ? [x.kod, x.tip, x.ad, x.dosya, x.satir] : null);
  return JSON.stringify([
    o.etmenler,
    o.adimlar.map((a) => [a.kod, a.ad, a.dosya, a.satir, a.zincir.ajanlar.map(h), h(a.zincir.katman), a.zincir.zemin.map(h),
      h(a.zincir.altKatman), a.zincir.departman ? [a.zincir.departman.deger, a.zincir.departman.dosya, a.zincir.departman.satir] : null]),
    m ? [m.kod, m.adim, m.muhur, m.karar, m.tarih, m.dosya, m.satir] : null,
  ]);
}

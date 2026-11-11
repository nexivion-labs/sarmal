// ═══════════════════════════════════════════════════════════════════════════
// bina.ts — 🏢 ÇALIŞMA ALANININ KATLARI VE LOGOSU (PNL-A31 · saf çekirdek)
//
//   Founder 2026-11-04: çok ofisli bir çalışma alanı panelde bir bina gibi
//   görünür. Kat, Kitaplık düğümünün isteğe bağlı `kat:` alanıyla ilan edilir ve
//   klasörler yerinden oynamaz; birinci kat yönetim katı, üst katlar çalışan
//   ofislerdir ve katsız Kitaplıklar bina dışında kalır. Logo ÇalışmaAlanı
//   düğümünün isteğe bağlı `logo:` alanıdır ve çalışma alanı köküne göreli bir
//   SVG dosyasını gösterir.
//
//   Bu dosya üç şeyin TEK EVİDİR ve ne diske ne de VS Code'a dokunur:
//     1. Binanın okunması: ÇalışmaAlanı kökünün Kitaplık ilanları, çözülmüş
//        dizinleri ve her birinin etkin katı (kendi katı ya da en yakın katlı
//        atasının katı). Yol haritası, Tren şeması ve motor aynı okumayı kullanır.
//     2. Kat kusurları: katlı bir Kitaplığın başka bir katlı Kitaplığın içinde
//        yaşaması ve pozitif olmayan kat değeri (`geçersiz-kat` tanısı).
//     3. Logonun güvenlik kararı: yol kökün dışına çıkamaz, yalnız `.svg` kabul
//        edilir ve içerik betik ya da dış kaynak taşıyorsa logo GÖSTERİLMEZ
//        (`geçersiz-logo` tanısı). Süzgeç içeriği onarmaz, reddeder: onarılmış bir
//        SVG kullanıcının yazmadığı bir resimdir ve onarımın kaçırdığı her yol bir
//        açıktır. Webview ayrıca logoyu `<img>` içinde veri adresiyle gösterir ve
//        tarayıcı o bağlamda betik koşturmaz; iki savunma birbirinin yedeğidir.
//
//   Dosya okuma dışarıdan verilir (`oku`, `gercekYol`), böylece motor ile eklenti
//   aynı kararı verir ve nöbet diske dokunmadan sınar.
// ═══════════════════════════════════════════════════════════════════════════

import type { Dugum, Param, Program } from "./sozdizim.ts";
import { degerMetni } from "./yolcoz.ts";

/** Binanın bir Kitaplık ilanı: çözülmüş dizini, kendi katı ve etkin katı. */
export interface BinaKitapligi {
  kod: string;
  /** Görünen ad: `ad` alanı, yoksa `ne` metninin ilk cümlesi, o da yoksa kod. */
  ad: string;
  /** İlanın `ne` metni (bina dışı klasör satırının ipucu alanın kuralını buradan okur). */
  ne?: string;
  /** Çalışma alanı köküne göre çözülmüş dizin (eğik çizgiyle, sonda ayraçsız). */
  dizin: string;
  /** İlanın kendi `kat:` değeri (geçerliyse). */
  kendiKati?: number;
  /** Etkin kat: kendi katı ya da en yakın katlı atasının katı; katsızsa tanımsız. */
  kat?: number;
  /** İlan sırası (kaynakta baştan sona); kat bandında projelerin sırası buradan gelir. */
  sira: number;
  satir: number;
  /** Kitaplığın doğrudan içinde ilan edilmiş Profil (müşteri düzeyindeki kimlik kartı gibi). */
  profil?: BinaProfili;
}

/**
 * 🪪 Bir Profil düğümünün bina ağacının okuduğu yüzü (TIP-1.17): kimliği, adı ve kişiler listesindeki
 * ilk kişinin hitabı. Profil kişileri yalnız hitap, rol ve sorumlulukla taşır; ad soyad alanı yoktur,
 * dolayısıyla kişinin görünen adı hitaptır.
 */
export interface BinaProfili {
  kod: string;
  ad: string;
  /** Kişiler listesindeki ilk kişinin hitabı; kişi yazılmamışsa tanımsız. */
  kisi?: string;
}

/** Bir Profil düğümünü okur; düğüm Profil değilse tanımsız döner. */
export function profilOku(d: Dugum): BinaProfili | undefined {
  if (d.tur !== "widget" || d.ad !== "Profil") return undefined;
  const kod = metin(d, "kod");
  let kisi: string | undefined;
  for (const o of alan(d, "kişiler")?.deger.ogeler ?? []) {
    const hitap = o.tur === "harita" ? (o.ciftler ?? []).find((c) => c.ad === "hitap") : undefined;
    const m = hitap ? degerMetni(hitap.deger).trim() : "";
    if (m) { kisi = m; break; }
  }
  return { kod, ad: metin(d, "ad") || kod, ...(kisi ? { kisi } : {}) };
}

/** Bir düğümün doğrudan çocukları arasındaki ilk Profil. */
function cocukProfili(d: Dugum): BinaProfili | undefined {
  for (const c of d.cocuklar) { const p = profilOku(c); if (p) return p; }
  return undefined;
}

/**
 * Bir proje giriş dosyasının kimlik kartı: kök Proje (ya da Uygulama) düğümünün doğrudan içindeki ya
 * da dosyanın tepesindeki ilk Profil. Proje kökünde tek Profil bulunur (`profil-çift`).
 */
export function projeProfili(program: Program): BinaProfili | undefined {
  for (const d of program.bildirimler) {
    const p = profilOku(d);
    if (p) return p;
    if (d.tur === "widget" && (d.ad === "Proje" || d.ad === "Uygulama")) {
      const ic = cocukProfili(d);
      if (ic) return ic;
    }
  }
  return undefined;
}

/** Bir ÇalışmaAlanı kökünün bina okuması. */
export interface Bina {
  kod: string;
  ad: string;
  /** Giriş dosyasının dizini (ÇalışmaAlanı kökü). */
  kokDizin: string;
  /** `logo:` alanı yazılmışsa ham değeri ve konumu. */
  logo?: { yol: string; satir: number; sutun: number };
  kitapliklar: BinaKitapligi[];
  /** Kullanılan katlar, artan sırayla (boşsa bina katsızdır). */
  katlar: number[];
}

/** `geçersiz-kat` kusuru. */
export interface KatKusuru {
  kimlik: string;
  kat: string;
  neden: "iç-içe" | "pozitif-değil";
  /** İç içe kusurda katlı atanın kodu ve katı. */
  ust?: string;
  ustKat?: number;
  satir: number;
  sutun: number;
}

const alan = (d: Dugum, ad: string): Param | undefined =>
  d.parametreler.find((p) => p.ad === ad) ?? d.ozellikler.find((p) => p.ad === ad);
const metin = (d: Dugum, ad: string): string => { const p = alan(d, ad); return p ? degerMetni(p.deger).trim() : ""; };

/** Yol yazımını tek biçime indirir: ters eğik çizgi düz olur, `.` ve `..` çözülür, sondaki ayraç atılır. */
export function yolDuzle(yol: string): string {
  const parcalar: string[] = [];
  const s = yol.replace(/\\/g, "/");
  const mutlak = s.startsWith("/");
  for (const p of s.split("/")) {
    if (!p || p === ".") continue;
    if (p === "..") parcalar.pop(); else parcalar.push(p);
  }
  return (mutlak ? "/" : "") + parcalar.join("/");
}

/** `dizin` yolu `yol`u kapsıyor mu (kendisi dâhil; ad benzerliği taşıyan kardeş kapsanmaz)? */
export function dizinKapsar(dizin: string, yol: string): boolean {
  const d = yolDuzle(dizin), y = yolDuzle(yol);
  return y === d || y.startsWith(d === "/" ? "/" : `${d}/`);
}

/** Kat değeri: pozitif tam sayı ise sayı, değilse tanımsız. */
export function katDegeri(ham: string): number | undefined {
  return /^\d+$/.test(ham) && Number(ham) > 0 ? Number(ham) : undefined;
}

/** İlanın görünen adı (Tren departman adıyla aynı kural: ad → `ne`nin ilk cümlesi → kod). */
export function binaIlanAdi(d: Dugum, kod: string): string {
  const ad = metin(d, "ad");
  if (ad) return ad;
  const ilk = metin(d, "ne").replace(/^[\p{Extended_Pictographic}\uFE0F\u200D\s]+/u, "").split(/\s+—\s+/)[0]!.replace(/\s+/g, " ").trim();
  return ilk || kod;
}

/**
 * Bir programdaki ÇalışmaAlanı kökünün bina okuması. `dosya` giriş dosyasının yoludur; Kitaplık
 * dizinleri onun dizinine göre çözülür (iskeletci.ts ile aynı kural: `yol:` üst Kitaplığa göreli).
 * Program bir ÇalışmaAlanı kökü taşımıyorsa tanımsız döner. Kusurlar `kusurlar` dizisine eklenir.
 */
export function binaOku(program: Program, dosya: string, kusurlar?: KatKusuru[]): Bina | undefined {
  const kok = program.bildirimler.find((d) => d.tur === "widget" && d.ad === "ÇalışmaAlanı");
  if (!kok) return undefined;
  const duz = yolDuzle(dosya);
  const kokDizin = duz.includes("/") ? duz.slice(0, duz.lastIndexOf("/")) || "/" : ".";
  const kitapliklar: BinaKitapligi[] = [];
  let sira = 0;
  const gez = (d: Dugum, taban: string, ustKatli: BinaKitapligi | undefined): void => {
    for (const c of d.cocuklar) {
      if (c.tur !== "widget") continue;
      if (c.ad !== "Kitaplık") { if (c.ad !== "Proje" && c.ad !== "Uygulama") gez(c, taban, ustKatli); continue; }
      const kod = metin(c, "kod") || c.ad;
      const yol = metin(c, "yol");
      const dizin = yol ? yolDuzle(`${taban}/${yol}`) : taban;
      const katP = alan(c, "kat");
      const ham = katP ? degerMetni(katP.deger).trim() : "";
      const kendi = katP ? katDegeri(ham) : undefined;
      if (katP && kendi === undefined && /^-?\d+$/.test(ham)) {
        kusurlar?.push({ kimlik: kod, kat: ham, neden: "pozitif-değil", satir: katP.satir, sutun: katP.sutun });
      }
      if (kendi !== undefined && ustKatli) {
        kusurlar?.push({ kimlik: kod, kat: ham, neden: "iç-içe", ust: ustKatli.kod, ustKat: ustKatli.kendiKati,
          satir: katP!.satir, sutun: katP!.sutun });
      }
      const profil = cocukProfili(c);
      const k: BinaKitapligi = {
        kod, ad: binaIlanAdi(c, kod), dizin, sira: sira++, satir: c.satir,
        ...(metin(c, "ne") ? { ne: metin(c, "ne") } : {}),
        ...(kendi !== undefined ? { kendiKati: kendi } : {}),
        ...(profil ? { profil } : {}),
      };
      // Etkin kat: iç içe kusurlu ilanda atanın katı geçerli kalır (tanı konuşur, görünüm atlamaz).
      const etkin = ustKatli?.kendiKati ?? kendi;
      if (etkin !== undefined) k.kat = etkin;
      kitapliklar.push(k);
      gez(c, dizin, ustKatli ?? (kendi !== undefined ? k : undefined));
    }
  };
  gez(kok, kokDizin, undefined);
  const logoP = alan(kok, "logo");
  const logoYolu = logoP ? degerMetni(logoP.deger).trim() : "";
  const kod = metin(kok, "kod");
  return {
    kod, ad: metin(kok, "ad") || kod || kokDizin.replace(/^.*\//, ""), kokDizin,
    ...(logoP ? { logo: { yol: logoYolu, satir: logoP.satir, sutun: logoP.sutun } } : {}),
    kitapliklar,
    katlar: [...new Set(kitapliklar.map((k) => k.kat).filter((k): k is number => k !== undefined))].sort((a, b) => a - b),
  };
}

/**
 * Program haritasındaki binalar: her ÇalışmaAlanı kökü bir binadır. Yol haritası ve Tren yalnız
 * katı olan binayı bina gibi çizer; motor katsız binanın logosunu da denetler.
 */
export function binalariBul(programlar: Iterable<readonly [string, Program]>): Bina[] {
  const sonuc: Bina[] = [];
  for (const [dosya, p] of programlar) {
    const b = binaOku(p, dosya);
    if (b) sonuc.push(b);
  }
  return sonuc.sort((a, b) => a.kokDizin.length - b.kokDizin.length || a.kokDizin.localeCompare(b.kokDizin));
}

/** Bir yolun düştüğü en derin Kitaplık ilanı ve onun etkin katı. */
export function katBul(bina: Bina, yol: string): { kat?: number; kitaplik?: BinaKitapligi } {
  let sec: BinaKitapligi | undefined;
  for (const k of bina.kitapliklar) {
    if (!dizinKapsar(k.dizin, yol)) continue;
    if (!sec || k.dizin.length > sec.dizin.length) sec = k;
  }
  return sec ? { kat: sec.kat, kitaplik: sec } : {};
}

// ── LOGO ─────────────────────────────────────────────────────────────────────

/** Logonun gösterilmeme sebebi; her sebep `geçersiz-logo` tanısının bir dalıdır. */
export type LogoKusuru = "boş" | "kök-dışı" | "svg-değil" | "yok" | "büyük" | "betik" | "dış-kaynak";

/** Bir logo dosyasının en büyük boyutu (bayt). Logo bir simgedir; daha büyüğü panelde iş görmez. */
export const LOGO_EN_BUYUK = 256 * 1024;

/**
 * SVG içeriğinin güvenlik kararı: içerik gösterilebilirse tanımsız, değilse sebep döner. Süzgeç
 * reddeder, onarmaz. Betik sayılanlar: `<script>`, `on…=` olay nitelikleri, `javascript:` adresi,
 * `<foreignObject>` (HTML gömer). Dış kaynak sayılanlar: belge içi çapa (`#`) ya da `data:image/`
 * dışında bir `href`/`src`, `url(…)` içinde dış adres, `@import` ve DOCTYPE ya da ENTITY bildirimi.
 */
export function svgSuzgeci(icerik: string): LogoKusuru | undefined {
  if (icerik.length > LOGO_EN_BUYUK) return "büyük";
  const govde = icerik.replace(/^\uFEFF/, "").replace(/<!--[\s\S]*?-->/g, "").trim();
  if (!/^(<\?xml[^>]*\?>\s*)?<svg[\s>]/i.test(govde)) return "svg-değil";
  if (/<\s*script\b/i.test(govde) || /\son[a-z]+\s*=/i.test(govde) || /javascript\s*:/i.test(govde) || /<\s*foreignObject\b/i.test(govde)) return "betik";
  if (/<!DOCTYPE|<!ENTITY/i.test(govde) || /@import/i.test(govde)) return "dış-kaynak";
  for (const m of govde.matchAll(/\b(?:xlink:)?(?:href|src)\s*=\s*(["'])(.*?)\1/gis)) {
    const v = m[2]!.trim();
    if (!v.startsWith("#") && !/^data:image\/(png|jpeg|gif|webp);base64,/i.test(v)) return "dış-kaynak";
  }
  for (const m of govde.matchAll(/url\(\s*(["']?)(.*?)\1\s*\)/gi)) {
    if (!m[2]!.trim().startsWith("#")) return "dış-kaynak";
  }
  return undefined;
}

/** Logonun çözümü: gösterilebilir SVG metni ya da kusur ve çözülmüş mutlak yol. */
export type LogoSonucu =
  | { tur: "svg"; svg: string; yol: string }
  | { tur: "kusur"; neden: LogoKusuru; yol: string };

/**
 * Logo yolunu çözer ve içeriği süzer. `kokDizin` çalışma alanı köküdür (mutlak). Yol köke göreli
 * yazılır; mutlak yol, `..` ile kökün dışına çıkan yol ve (verilmişse `gercekYol` ile) kökün dışına
 * giden sembolik bağ reddedilir. `oku` dosya yoksa ya da okunamıyorsa tanımsız döner.
 */
export function logoCoz(
  kokDizin: string, logoYolu: string,
  oku: (mutlakYol: string) => string | undefined,
  gercekYol: (mutlakYol: string) => string = (y) => y,
): LogoSonucu {
  const kok = yolDuzle(kokDizin);
  const ham = logoYolu.trim();
  const mutlak = yolDuzle(`${kok}/${ham}`);
  if (!ham) return { tur: "kusur", neden: "boş", yol: mutlak };
  if (ham.startsWith("/") || /^[a-z]:[\\/]/i.test(ham) || ham.startsWith("\\") || !dizinKapsar(kok, mutlak) || mutlak === kok) {
    return { tur: "kusur", neden: "kök-dışı", yol: mutlak };
  }
  if (!/\.svg$/i.test(mutlak)) return { tur: "kusur", neden: "svg-değil", yol: mutlak };
  const icerik = oku(mutlak);
  if (icerik === undefined) return { tur: "kusur", neden: "yok", yol: mutlak };
  let gercek: string;
  try { gercek = yolDuzle(gercekYol(mutlak)); } catch { return { tur: "kusur", neden: "yok", yol: mutlak }; }
  let gercekKok: string;
  try { gercekKok = yolDuzle(gercekYol(kok)); } catch { gercekKok = kok; }
  if (!dizinKapsar(gercekKok, gercek)) return { tur: "kusur", neden: "kök-dışı", yol: mutlak };
  const neden = svgSuzgeci(icerik);
  return neden ? { tur: "kusur", neden, yol: mutlak } : { tur: "svg", svg: icerik, yol: mutlak };
}

/** Gösterilebilir logonun webview veri adresi (`<img src>` için; CSP `img-src data:` izinlidir). */
export function logoVeriAdresi(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

// ── YÖNETİM KATININ YASASI ───────────────────────────────────────────────────
//
//   Founder 2026-11-04 gecesi: yönetim katındaki bir proje yasanın yeridir ve açılınca
//   plan ağacı değil yasası görünür. Gruplar yalnız tiplerden türer (SNF-0); hiçbir proje
//   adı, kod öneki ya da dosya adı okunmaz:
//     • Anayasa: Anayasa düğümleri ve sardıkları Kurallar; hiçbir şeyin sarmadığı
//       `otorite: anayasa` Kuralları da buraya düşer.
//     • Yönetmelik ve Politikalar: Politika ve Mevzuat düğümleri, Kural ya da Politika
//       saran Mekanizmalar (Kural ile Politika şemada Mekanizmaya konabilir) ve bir yasa
//       Kitaplığında duran Mekanizmalar; sarılmamış öteki Kurallar da buraya düşer.
//       Yasa Kitaplığı, dosyalarından birinde Anayasa, Kural, Karar, Politika ya da Mevzuat
//       düğümü taşıyan Kitaplıktır; içi henüz boş bir yönetmelik böylece yerini korur.
//     • Kararlar: Karar düğümleri; açıklama `durum` dağılımını sayılarla verir.
//     • Arayüz Dili: Tema düğümleri (tasarım sistemi sözleşmesi).

/** Yasa görünümündeki bir düğüm: tanımına gidilecek konum, görünen ad ve sardığı yasa düğümleri. */
export interface YasaDugumu {
  kod: string;
  /** Kanon tipi (Anayasa, Kural, Politika, Mekanizma, Mevzuat, Karar, Tema). */
  tip: string;
  ad: string;
  dosya: string;
  satir: number;
  /** Karar düğümünün `durum` değeri. */
  durum?: string;
  /** Sardığı Kurallar ve Politikalar (Politika da kendi Kurallarını sarar). */
  cocuklar: YasaDugumu[];
}

/** Bir yönetim katı projesinin yasası. Gruplar boş olsa da vardır; boş grup yüzeyde boş diye yazılır. */
export interface Yasa {
  anayasa: YasaDugumu[];
  yonetmelik: YasaDugumu[];
  karar: YasaDugumu[];
  arayuz: YasaDugumu[];
  /** Yasa görünümündeki bütün Kuralların sayısı (her grupta, her derinlikte). */
  kuralSayisi: number;
  /** Karar durumlarının dağılımı: çoktan aza, eşitlikte ada göre. */
  kararDurumlari: Array<readonly [string, number]>;
}

/** Bir tipin yasa ağacında tuttuğu yer; tip kanonun adıdır. */
const YASA_SARAN = new Set(["Anayasa", "Politika", "Mekanizma"]);
const YASA_ROLU = new Set(["Anayasa", "Kural", "Karar", "Politika", "Mevzuat"]);

/** Kuralın düğüm tipi: `Kural ad(...)` tanımı ya da `Kural(...)` widget'ı. */
const kuralMi = (d: Dugum): boolean => (d.tur === "kuralTanım") || (d.tur === "widget" && d.ad === "Kural");

/** Tanım adı (`yasaKatmanları`) → görünen ad (`Yasa Katmanları`). */
function tanimAdi(ad: string): string {
  return ad.replace(/([\p{Ll}\d])(\p{Lu})/gu, "$1 $2").replace(/^\p{Ll}/u, (h) => h.toLocaleUpperCase("tr"));
}

/**
 * Yasa satırının görünen adı: `ad` alanı; Kural tanımında kuralın adı; o da yoksa `ne` alanının kısa
 * hâli (baştaki simge atılır, iki nokta ya da uzun çizgiden önceki parça alınır, uzun metin kısaltılır).
 */
export function yasaAdi(d: Dugum, kod: string): string {
  const ad = metin(d, "ad");
  if (ad) return ad;
  if (d.tur === "kuralTanım" && d.ad) return tanimAdi(d.ad);
  const ne = metin(d, "ne").replace(/^[\p{Extended_Pictographic}\uFE0F\u200D\s]+/u, "").replace(/\s+/g, " ").trim();
  const ilk = baslikHarfi(ne.split(/:\s|\s—\s|\.\s/)[0]!.trim());
  if (!ilk) return kod;
  return ilk.length > 60 ? `${ilk.slice(0, 58).trimEnd()}…` : ilk;
}

/** Bağlaçlar başlıkta küçük kalır. */
const BAGLACLAR = new Set(["ve", "ile", "ya", "da", "de", "ki", "veya", "için"]);

/**
 * `ne` metninden türeyen adın başlık biçimi: her sözcüğün yalnız ilk harfi büyür, sözcüğün geri kalanı
 * olduğu gibi kalır (`ASCII`, `WhatsApp` bozulmaz); ilk sözcük dışındaki bağlaçlar küçük kalır.
 */
function baslikHarfi(metin: string): string {
  return metin.split(" ").map((s, i) => (i > 0 && BAGLACLAR.has(s)) ? s
    : s.replace(/^\p{Ll}/u, (h) => h.toLocaleUpperCase("tr"))).join(" ");
}

/** Bir proje kökünün (Proje ya da Uygulama) Kitaplık dizinleri; `yol:` üst Kitaplığa göreli çözülür. */
export function projeKitapliklari(program: Program, dosya: string): string[] {
  const duz = yolDuzle(dosya);
  const kokDizin = duz.includes("/") ? duz.slice(0, duz.lastIndexOf("/")) || "/" : ".";
  const sonuc: string[] = [];
  const gez = (d: Dugum, taban: string): void => {
    for (const c of d.cocuklar) {
      if (c.tur !== "widget") continue;
      if (c.ad !== "Kitaplık") { gez(c, taban); continue; }
      const yol = metin(c, "yol");
      const dizin = yol ? yolDuzle(`${taban}/${yol}`) : taban;
      sonuc.push(dizin);
      gez(c, dizin);
    }
  };
  for (const d of program.bildirimler) {
    if (d.tur === "widget" && (d.ad === "Proje" || d.ad === "Uygulama")) gez(d, kokDizin);
  }
  return sonuc;
}

/**
 * Bir yönetim katı projesinin yasa okuması. `dosyalar` projenin kendi dosyalarıdır (iç içe projelerin
 * dosyaları çağıran tarafından ayrılmıştır); `kitapliklar` projenin Kitaplık dizinleridir.
 */
export function yasaOku(dosyalar: Iterable<readonly [string, Program]>, kitapliklar: readonly string[] = []): Yasa {
  const liste = [...dosyalar].sort((a, b) => a[0].localeCompare(b[0]));
  const yasa: Yasa = { anayasa: [], yonetmelik: [], karar: [], arayuz: [], kuralSayisi: 0, kararDurumlari: [] };
  const enDerinKitaplik = (yol: string): string | undefined => {
    let sec: string | undefined;
    for (const k of kitapliklar) if (dizinKapsar(k, yol) && (!sec || k.length > sec.length)) sec = k;
    return sec;
  };
  // Yasa Kitaplıkları: dosyalarından birinde yasa rolünde bir düğüm taşıyan Kitaplıklar.
  const yasaKitapliklari = new Set<string>();
  const yasaVarMi = (ds: readonly Dugum[]): boolean =>
    ds.some((d) => kuralMi(d) || (d.tur === "widget" && YASA_ROLU.has(d.ad)) || yasaVarMi(d.cocuklar));
  for (const [dosya, p] of liste) {
    const k = enDerinKitaplik(dosya);
    if (k && yasaVarMi(p.bildirimler)) yasaKitapliklari.add(k);
  }
  const dugum = (d: Dugum, dosya: string, tip: string): YasaDugumu => {
    const kod = metin(d, "kod") || d.ad;
    const durum = tip === "Karar" ? metin(d, "durum") : "";
    return { kod, tip, ad: yasaAdi(d, kod), dosya, satir: d.satir, ...(durum ? { durum } : {}), cocuklar: [] };
  };
  /** Saran düğümün içindeki Kurallar ve Politikalar. */
  const ic = (d: Dugum, dosya: string): YasaDugumu[] => {
    const sonuc: YasaDugumu[] = [];
    for (const c of d.cocuklar) {
      if (kuralMi(c)) { sonuc.push(dugum(c, dosya, "Kural")); yasa.kuralSayisi += 1; continue; }
      if (c.tur === "widget" && c.ad === "Politika") { const p = dugum(c, dosya, "Politika"); p.cocuklar = ic(c, dosya); sonuc.push(p); }
    }
    return sonuc;
  };
  const sarar = (d: Dugum): boolean => d.cocuklar.some((c) => kuralMi(c) || (c.tur === "widget" && c.ad === "Politika"));
  const serbestAnayasa: YasaDugumu[] = [];
  const gez = (ds: readonly Dugum[], dosya: string, yasaKitapligi: boolean): void => {
    for (const d of ds) {
      if (kuralMi(d)) {
        const k = dugum(d, dosya, "Kural");
        yasa.kuralSayisi += 1;
        (metin(d, "otorite") === "anayasa" ? serbestAnayasa : yasa.yonetmelik).push(k);
        continue;
      }
      if (d.tur !== "widget") { gez(d.cocuklar, dosya, yasaKitapligi); continue; }
      if (d.ad === "Anayasa") { const a = dugum(d, dosya, "Anayasa"); a.cocuklar = ic(d, dosya); yasa.anayasa.push(a); continue; }
      if (d.ad === "Politika" || d.ad === "Mevzuat") { const p = dugum(d, dosya, d.ad); p.cocuklar = ic(d, dosya); yasa.yonetmelik.push(p); continue; }
      if (d.ad === "Mekanizma" && (yasaKitapligi || sarar(d))) {
        const m = dugum(d, dosya, "Mekanizma"); m.cocuklar = ic(d, dosya); yasa.yonetmelik.push(m); continue;
      }
      if (d.ad === "Karar") { yasa.karar.push(dugum(d, dosya, "Karar")); continue; }
      if (d.ad === "Tema") { yasa.arayuz.push(dugum(d, dosya, "Tema")); continue; }
      if (YASA_SARAN.has(d.ad)) continue;
      gez(d.cocuklar, dosya, yasaKitapligi);
    }
  };
  for (const [dosya, p] of liste) {
    const k = enDerinKitaplik(dosya);
    gez(p.bildirimler, dosya, k !== undefined && yasaKitapliklari.has(k));
  }
  // Hiçbir Anayasanın sarmadığı anayasa otoriteli Kurallar: tek Anayasa varsa onun yanına, yoksa grubun kendisine.
  if (serbestAnayasa.length) {
    if (yasa.anayasa.length === 1) yasa.anayasa[0]!.cocuklar.push(...serbestAnayasa); else yasa.anayasa.push(...serbestAnayasa);
  }
  const say = new Map<string, number>();
  for (const k of yasa.karar) if (k.durum) say.set(k.durum, (say.get(k.durum) ?? 0) + 1);
  yasa.kararDurumlari = [...say].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "tr"));
  return yasa;
}

/** Bir yasa düğümünün (her derinlikte) sardığı Kural sayısı. */
export function yasaKuralSayisi(d: YasaDugumu): number {
  return d.cocuklar.reduce((n, c) => n + (c.tip === "Kural" ? 1 : 0) + yasaKuralSayisi(c), 0);
}

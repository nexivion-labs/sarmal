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
  /** Çalışma alanı köküne göre çözülmüş dizin (eğik çizgiyle, sonda ayraçsız). */
  dizin: string;
  /** İlanın kendi `kat:` değeri (geçerliyse). */
  kendiKati?: number;
  /** Etkin kat: kendi katı ya da en yakın katlı atasının katı; katsızsa tanımsız. */
  kat?: number;
  /** İlan sırası (kaynakta baştan sona); kat bandında projelerin sırası buradan gelir. */
  sira: number;
  satir: number;
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
      const k: BinaKitapligi = {
        kod, ad: binaIlanAdi(c, kod), dizin, sira: sira++, satir: c.satir,
        ...(kendi !== undefined ? { kendiKati: kendi } : {}),
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

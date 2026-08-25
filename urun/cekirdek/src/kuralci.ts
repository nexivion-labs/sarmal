// ═══════════════════════════════════════════════════════════════════════════
// kuralci.ts — Kuralcı (DIL-3 · YAS-2.3 kural motoru · M-1 hijyen — PLN-6)
//
//   Kuralın KENDİSİNİ analiz eder (koşul değerlendirmeden — o M-3'ün işi):
//     • katman-uyumsuz    : niyet + koşul (niyet zorlanamaz) · koşul var katman yok
//                           · geçersiz katman değeri (YAS-2.3 dürüstlük beyanı)
//     • zorlanamayan-kural: eşik/yapısal beyan edilmiş ama koşul: yok
//     • ebedi-ihlal       : ebedi bayrağı anayasa-dışı otoritede (biçim hali;
//                           diff hali M-2'de)
//     • koni-taşması      : bir düğüme kapsam yoluyla >20 kural düşüyor
//     • ağırlık-toplamı   : Değerlendirme boyutlar toplamı ≠ 1.0 (K6)
//     • eşik-sırası       : Değerlendirme eşikler bandı monoton değil / aralık dışı (K2)
//   + eşik defteri: tüm sayısal eşiklerin raporu (dağınık-eşik görünürlüğü).
//
//   Temel: bilgi/eski-akil/eski-yapi-sentezi.md (K1-K16 koşul tipolojisi).
// ═══════════════════════════════════════════════════════════════════════════

import type { Program, Dugum, Deger } from "./sozdizim.ts";
import type { Siniflama } from "./siniflama.ts";
import type { Tani } from "./tani.ts";
import { eskiTani, yeniTani } from "./tani-metinleri.ts";
import { YENI_TANI_INDEKS } from "./tani-sicili.ts";

/** YAS-2.3 katman değerleri — kuralı KİM zorlar beyanı.
 *  YEDEK küme: kuralDenetle koşum başına kanondan türetir (BKM-BUG-A03/M5 —
 *  modül-düzeyi mutable durum kaldırıldı: kanonsuz proje, kanonlu projeden
 *  sonra denetlendiğinde önceki kümeyi DEVRALMAZ; uzun-ömürlü MCP sürecinde
 *  kanon sızıntısı kapandı). */
const VARSAYILAN_KATMANLAR: ReadonlySet<string> = new Set(["yapısal", "eşik", "niyet"]);

/** Koni-taşması eşiği (YAS-2.3: >20 kural = bağlam boğulması). */
const KONI_ESIGI = 20;

/** Kapsam JOKERLERİ (YAS-2.3 · Founder 2026-07-11): kanonik kelime `genel` (yasa dili
 *  kazandı — 53 kural elden geçmedi); `tümü` eş anlamlı tanınır (geriye-uyum).
 *  Tek kaynak: kapsamKapsar · koniTasmasi · kapsamDugumleri · denetci kapsam-çözümü. */
export const KAPSAM_JOKER: ReadonlySet<string> = new Set(["genel", "tümü"]);

/** Bir kuralın kapsamı bir düğümü KAPSIYOR mu? (joker · widget-adı · aile · kod).
 *  TEK KAYNAK predikatı: koniTasmasi · kapsamDugumleri · dugumeDusenKurallar aynı
 *  eşleşmeyi sürer (üç yerde kopya = kapsam-drift riski; kanon burada). */
function kapsamKapsar(kapsam: string, d: Dugum, kod: string, aile: Map<string, string>): boolean {
  return KAPSAM_JOKER.has(kapsam) || kapsam === d.ad || kapsam === aile.get(d.ad) || kapsam === kod;
}

export interface KuralBilgi {
  d: Dugum;
  kod: string;
  katman?: string;
  otorite?: string;
  ebedi: boolean;
  kapsam?: string;
  kosul?: Deger;
  /** RF-T6-A04: ÖzelKural dizin-hedefi ("eklenti/") — hedef dışındaki dosyada
   *  yapısal/eşik değerlendirme ATLANIR (kapsam farkı = tip farkı, vitrin tanımı). */
  hedef?: string;
}

/** Eşik defteri girdisi — bir kuralda/değerlendirmede geçen sayısal eşik. */
export interface Esik {
  deger: number;
  /** sahibin KOD'u (kural ya da Değerlendirme). */
  sahip: string;
  satir: number;
}

// ── toplama ──────────────────────────────────────────────────────────────────

function paramVeyaOzellik(d: Dugum, ad: string): Deger | undefined {
  return [...d.parametreler, ...d.ozellikler].find((p) => p.ad === ad)?.deger;
}

function kodOf(d: Dugum): string {
  return paramVeyaOzellik(d, "kod")?.metin ?? d.ad;
}

function kuralOku(d: Dugum): KuralBilgi {
  return {
    d,
    kod: kodOf(d),
    katman: paramVeyaOzellik(d, "katman")?.metin,
    otorite: paramVeyaOzellik(d, "otorite")?.metin,
    ebedi: paramVeyaOzellik(d, "ebedi")?.metin === "evet",
    kapsam: paramVeyaOzellik(d, "kapsam")?.metin,
    kosul: paramVeyaOzellik(d, "koşul"),
    hedef: paramVeyaOzellik(d, "hedef")?.metin,
  };
}

interface Toplam {
  kurallar: KuralBilgi[];
  widgetlar: Dugum[];
  degerlendirmeler: Dugum[];
}

function topla(program: Program): Toplam {
  const t: Toplam = { kurallar: [], widgetlar: [], degerlendirmeler: [] };
  const gezDeger = (v: Deger): void => {
    if (v.tur === "widget" && v.dugum) gez(v.dugum);
    else if (v.tur === "liste") for (const o of v.ogeler ?? []) gezDeger(o);
    else if (v.tur === "harita") for (const c of v.ciftler ?? []) gezDeger(c.deger);
  };
  const gez = (d: Dugum): void => {
    if (d.tur === "kuralTanım") t.kurallar.push(kuralOku(d));
    if (d.tur === "widget") {
      t.widgetlar.push(d);
      if (d.ad === "Değerlendirme") t.degerlendirmeler.push(d);
      // RF-T6-A04 MOTOR-VATANDAŞLIĞI (Founder: "bunları biz neden uygulamadık?"):
      // GenelKural/ÖzelKural = Kural'ın KAPSAM-özelleşmiş halleri — AYNI motorda
      // değerlendirilir (DIL-3 tek motor korunur; vitrin dalga1_yasa tanımıyla birebir):
      // GenelKural → kapsam varsayılanı "genel" (çalışma alanının tamamı);
      // ÖzelKural → hedef: dizinine iner (yapisalDegerlendir dosya-süzgeci).
      if (d.ad === "GenelKural" || d.ad === "ÖzelKural") {
        const k = kuralOku(d);
        // Her ikisi de kapsam-varsayılanı "genel" alır: GenelKural çalışma alanının
        // TAMAMINI, ÖzelKural yalnız hedef: dizinini (yapisalDegerlendir dosya-süzgeci)
        // — tip farkı = KAPSAM farkı. Varsayılan olmadan koşullu ÖzelKural ölü kalırdı
        // ("motorsuz doğmuş" hastalığı — RF-T6-A04'ün kapattığı kopukluk).
        if (k.kapsam === undefined) k.kapsam = "genel";
        t.kurallar.push(k);
      }
    }
    for (const p of d.parametreler) gezDeger(p.deger);
    for (const o of d.ozellikler) gezDeger(o.deger);
    for (const c of d.cocuklar) gez(c);
  };
  for (const b of program.bildirimler) gez(b);
  return t;
}

// ── M-1 denetimleri ──────────────────────────────────────────────────────────

/** Kural bildirimlerinin hijyenini denetler (PLN-6 M-1 + M-2 dosya-içi). dogrula() çağırır. */
export function kuralDenetle(program: Program, snf: Siniflama, dosyaYolu?: string): Tani[] {
  // Katman kümesi kanondan (tek kaynak — KRR-MUT Sütun D); kanonda yoksa yedek —
  // koşum-yerel (M5): kanon sızıntısı yok, çağrılar arası durum taşınmaz.
  const kanonKatman = snf.semalar?.["Kural"]?.enum?.["katman"];
  const katmanlar: ReadonlySet<string> = kanonKatman?.length ? new Set(kanonKatman) : VARSAYILAN_KATMANLAR;
  const out: Tani[] = [];
  const { kurallar, widgetlar, degerlendirmeler } = topla(program);

  for (const k of kurallar) hijyen(k, katmanlar, out);
  koniTasmasi(kurallar, widgetlar, snf, out);
  for (const d of degerlendirmeler) degerlendirmeDenetle(d, out);

  // M-2: dosya-içi kural-çatışması (çiftler halinde).
  for (let i = 0; i < kurallar.length; i++) {
    for (let j = i + 1; j < kurallar.length; j++) {
      const t = ciftCatismasi(kurallar[i], kurallar[j]);
      if (t) out.push(t);
    }
  }

  // M-3: yapısal koşulları GRAF düğümleri üstünde değerlendir.
  yapisalDegerlendir(kurallar, widgetlar, snf, out, dosyaYolu);

  // Yeni kanonun kural gövdesi sözleşmeleri (motor turu ikinci halkası).
  out.push(...yeniKuralTanilari(program, snf));

  return out;
}

/** Programdaki tüm kural bildirimlerini döndürür (CLI dosyalar-arası denetimi için). */
export function kurallariCikar(program: Program): KuralBilgi[] {
  return topla(program).kurallar;
}

/** Tek kuralın YAS-2.3 dürüstlük-beyanı hijyeni. */
function hijyen(k: KuralBilgi, katmanlar: ReadonlySet<string>, out: Tani[]): void {
  const d = k.d;

  if (k.katman !== undefined && !katmanlar.has(k.katman)) {
    out.push(eskiTani("katman-uyumsuz", "uyarı",
      { kod: k.kod, katman: k.katman, kusur: "bilinmeyen" }, { satir: d.satir, sutun: d.sutun }));
    return; // katman bilinmiyorsa alt kontroller anlamsız
  }

  if (k.katman === "niyet" && k.kosul) {
    out.push(eskiTani("katman-uyumsuz", "uyarı",
      { kod: k.kod, katman: k.katman, kusur: "niyet-koşullu" }, { satir: d.satir, sutun: d.sutun }));
  }

  if ((k.katman === "eşik" || k.katman === "yapısal") && !k.kosul) {
    out.push(eskiTani("zorlanamayan-kural", "uyarı",
      { kod: k.kod, katman: k.katman }, { satir: d.satir, sutun: d.sutun }));
  }

  // M3 sessizlik-yaması (BKM-BUG-A03 · KRR-MUT-3 kapsam ayağı): zorlanan katmanda
  // DÜZYAZI koşul ne değerlendirilir ne söylenirdi — artık bilgi düzeyinde görünür.
  // Bilgi bilinçli: yasadaki beyan-koşulları (zorlama başka bekçide yaşar, koşul
  // onu İŞARET eder — YUZ-4/MIM-3 deseni) meşrudur; kapı/karne etkilenmez.
  if ((k.katman === "eşik" || k.katman === "yapısal") && k.kosul?.tur === "metin") {
    out.push(eskiTani("düzyazı-koşul", "bilgi",
      { kod: k.kod, katman: k.katman }, { satir: d.satir, sutun: d.sutun }));
  }

  if (k.katman === undefined && k.kosul) {
    out.push(eskiTani("katman-uyumsuz", "uyarı",
      { kod: k.kod, kusur: "katmansız" }, { satir: d.satir, sutun: d.sutun }));
  }

  if (k.ebedi && k.otorite !== "anayasa") {
    out.push(eskiTani("ebedi-ihlal", "uyarı",
      { kod: k.kod, otorite: k.otorite ?? "tercih", kusur: "otorite" }, { satir: d.satir, sutun: d.sutun }));
  }
}

/** Bir düğüme kapsam yoluyla düşen kural sayısı — >20 = bağlam boğulması. */
function koniTasmasi(kurallar: KuralBilgi[], widgetlar: Dugum[], snf: Siniflama, out: Tani[]): void {
  const kapsamli = kurallar.filter((k) => k.kapsam !== undefined);
  if (kapsamli.length <= KONI_ESIGI) return; // hiçbir düğüm eşiği aşamaz

  const aile = new Map<string, string>(snf.widgetTipleri.map((t) => [t.ad, t.aile]));

  for (const d of widgetlar) {
    const kod = kodOf(d);
    let sayi = 0;
    for (const k of kapsamli) {
      if (kapsamKapsar(k.kapsam!, d, kod, aile)) sayi++;
    }
    if (sayi > KONI_ESIGI) {
      out.push(eskiTani("koni-taşması", "uyarı",
        { ad: d.ad, kimlik: kod, sayı: sayi, eşik: KONI_ESIGI }, { satir: d.satir, sutun: d.sutun }));
    }
  }
}

/** Değerlendirme: boyutlar toplamı 1.0 (K6) + eşikler bandı monoton (K2). */
function degerlendirmeDenetle(d: Dugum, out: Tani[]): void {
  const kod = kodOf(d);

  const boyutlar = paramVeyaOzellik(d, "boyutlar");
  if (boyutlar?.tur === "harita") {
    const sayilar = (boyutlar.ciftler ?? []).map((c) => c.deger).filter((v) => v.tur === "sayı");
    if (sayilar.length === (boyutlar.ciftler ?? []).length && sayilar.length > 0) {
      const toplam = sayilar.reduce((t, v) => t + Number(v.metin), 0);
      if (Math.abs(toplam - 1) > 0.001) {
        out.push(eskiTani("ağırlık-toplamı", "uyarı",
          { kimlik: kod, toplam: toplam.toFixed(2) }, { satir: d.satir, sutun: d.sutun }));
      }
    }
  }

  const esikler = paramVeyaOzellik(d, "eşikler");
  if (esikler?.tur === "harita") {
    const ciftler = esikler.ciftler ?? [];
    let onceki: number | undefined;
    for (const c of ciftler) {
      if (c.deger.tur !== "sayı") continue; // sayısal-olmayan çift atlanır — kalanlar denetlenir (C7: return tüm bandı terk ediyordu)
      const v = Number(c.deger.metin);
      if (v <= 0 || v > 1) {
        out.push(eskiTani("eşik-sırası", "uyarı",
          { kimlik: kod, ad: c.ad, deger: c.deger.metin, kusur: "aralık" }, { satir: d.satir, sutun: d.sutun }));
        return;
      }
      if (onceki !== undefined && v >= onceki) {
        out.push(eskiTani("eşik-sırası", "uyarı",
          { kimlik: kod, ad: c.ad, deger: c.deger.metin, onceki, kusur: "sıra" }, { satir: d.satir, sutun: d.sutun }));
        return;
      }
      onceki = v;
    }
  }
}

// ── eşik defteri ─────────────────────────────────────────────────────────────

/**
 * Tüm sayısal eşiklerin raporu: kural koşullarındaki + Değerlendirme
 * eşiklerindeki sayılar. Koşul kuralda KALIR; defter yalnız GÖRÜNÜRLÜK verir
 * (eski sistemin "eşikler 73 dosyaya serpildi, kimse görmedi" tuzağına karşı).
 */
export function esikDefteri(program: Program): Esik[] {
  const out: Esik[] = [];
  const { kurallar, degerlendirmeler } = topla(program);

  const sayilariTopla = (v: Deger, sahip: string): void => {
    if (v.tur === "sayı") out.push({ deger: Number(v.metin), sahip, satir: v.satir });
    if (v.sol) sayilariTopla(v.sol, sahip);
    if (v.sag) sayilariTopla(v.sag, sahip);
    for (const o of v.ogeler ?? []) sayilariTopla(o, sahip);
    for (const c of v.ciftler ?? []) sayilariTopla(c.deger, sahip);
  };

  for (const k of kurallar) if (k.kosul) sayilariTopla(k.kosul, k.kod);
  for (const d of degerlendirmeler) {
    const esikler = paramVeyaOzellik(d, "eşikler");
    if (esikler) sayilariTopla(esikler, kodOf(d));
  }
  return out;
}

// ═══ M-2 · Kural-çatışması + otorite çözümü + ebedi mühür (PLN-6) ═══════════

/** Otorite sırası (YAS-2.3): anayasa > politika > tercih (varsayılan). */
const OTORITE_SIRA: Record<string, number> = { anayasa: 3, politika: 2, tercih: 1 };

function otoriteSira(k: KuralBilgi): number {
  return OTORITE_SIRA[k.otorite ?? "tercih"] ?? 1;
}

/** Değer ağacını kanonik metne döker (imza + çatışma mesajları için). */
function degerYaz(v: Deger): string {
  switch (v.tur) {
    case "metin": return `"${v.metin ?? ""}"`;
    case "sayı": case "kod": case "erişim": case "anahtar": return v.metin ?? "";
    case "liste": return `[${(v.ogeler ?? []).map(degerYaz).join(", ")}]`;
    case "harita": return `{${(v.ciftler ?? []).map((c) => `${c.ad}: ${degerYaz(c.deger)}`).join(", ")}}`;
    case "widget": return v.dugum ? `${v.dugum.ad}(…)` : "widget";
    case "ifade":
      return v.sol
        ? `(${degerYaz(v.sol)} ${v.islem} ${v.sag ? degerYaz(v.sag) : ""})`
        : `(${v.islem} ${v.sag ? degerYaz(v.sag) : ""})`;
  }
}

/** Kuralın kanonik imzası — aynı-KOD çelişkisi + ebedi mühür bunun üstünden. */
export function kuralImzasi(k: KuralBilgi): string {
  const alan = (ad: string): string => {
    const v = paramVeyaOzellik(k.d, ad);
    return v ? degerYaz(v) : "";
  };
  return [
    k.otorite ?? "", k.ebedi ? "ebedi" : "", k.katman ?? "", k.kapsam ?? "",
    alan("ne"), k.kosul ? degerYaz(k.kosul) : "", alan("ihlal"), alan("düzey"),
  ].join(" | ");
}

// ── aralık analizi: koşul → sayısal kısıt kümesi ────────────────────────────

interface Aralik { lo: number; loKapali: boolean; hi: number; hiKapali: boolean; }

const TUM_ARALIK = (): Aralik => ({ lo: -Infinity, loKapali: true, hi: Infinity, hiKapali: true });

function aralikBos(a: Aralik): boolean {
  return a.lo > a.hi || (a.lo === a.hi && !(a.loKapali && a.hiKapali));
}

function aralikKesis(a: Aralik, b: Aralik): Aralik {
  const r = { ...a };
  if (b.lo > r.lo || (b.lo === r.lo && !b.loKapali)) { r.lo = b.lo; r.loKapali = b.loKapali; }
  if (b.hi < r.hi || (b.hi === r.hi && !b.hiKapali)) { r.hi = b.hi; r.hiKapali = b.hiKapali; }
  return r;
}

/** alt ⊆ üst mü? (doğuş-rehberi turu · CUE unification: DARALTMA testi — sınır eşitliğinde
 *  açık/kapalı gözetilir: üst açıksa alt aynı sınırda kapalı olamaz). */
function aralikAltKume(alt: Aralik, üst: Aralik): boolean {
  if (alt.lo < üst.lo || (alt.lo === üst.lo && alt.loKapali && !üst.loKapali)) return false;
  if (alt.hi > üst.hi || (alt.hi === üst.hi && alt.hiKapali && !üst.hiKapali)) return false;
  return true;
}

function opUygula(a: Aralik, op: string, v: number): Aralik {
  switch (op) {
    case ">=": return aralikKesis(a, { lo: v, loKapali: true, hi: Infinity, hiKapali: true });
    case ">":  return aralikKesis(a, { lo: v, loKapali: false, hi: Infinity, hiKapali: true });
    case "<=": return aralikKesis(a, { lo: -Infinity, loKapali: true, hi: v, hiKapali: true });
    case "<":  return aralikKesis(a, { lo: -Infinity, loKapali: true, hi: v, hiKapali: false });
    case "==": return aralikKesis(a, { lo: v, loKapali: true, hi: v, hiKapali: true });
    default:   return a; // != aralıkla ifade edilmez — atla
  }
}

const TERS_OP: Record<string, string> = { "<": ">", "<=": ">=", ">": "<", ">=": "<=", "==": "==" };

/**
 * Koşulun ÜST-DÜZEY `ve`-bağlaçlı karşılaştırmalarından yol→aralık haritası
 * çıkarır. `veya`/`değil` görülürse analiz o kural için GÜVENLE atlanır
 * (yanlış-pozitif üretmemek — disjonksiyon aralıkla modellenmez).
 */
function kisitHaritasi(v: Deger): Map<string, Aralik> | undefined {
  const harita = new Map<string, Aralik>();
  const gez = (n: Deger): boolean => {
    if (n.tur !== "ifade") return true; // atom — kısıt değil, zararsız
    if (n.islem === "ve") return gez(n.sol!) && gez(n.sag!);
    if (n.islem === "veya" || n.islem === "değil") return false; // modellenemez → atla
    const OPS = new Set(["<", "<=", ">", ">=", "=="]);
    if (!OPS.has(n.islem ?? "") || !n.sol || !n.sag) return true;
    const yolMu = (d: Deger): boolean => d.tur === "erişim" || d.tur === "kod" || d.tur === "anahtar";
    let yol: string | undefined;
    let op = n.islem!;
    let deger: number | undefined;
    if (yolMu(n.sol) && n.sag.tur === "sayı") { yol = n.sol.metin; deger = Number(n.sag.metin); }
    else if (n.sol.tur === "sayı" && yolMu(n.sag)) { yol = n.sag.metin; deger = Number(n.sol.metin); op = TERS_OP[op] ?? op; }
    if (yol === undefined || deger === undefined || Number.isNaN(deger)) return true;
    harita.set(yol, opUygula(harita.get(yol) ?? TUM_ARALIK(), op, deger));
    return true;
  };
  return gez(v) ? harita : undefined;
}

/** İki kuralın kapsamı kesişir mi (v1: eşit kapsam ya da biri joker — YAS-2.3). */
function kapsamKesisir(a?: string, b?: string): boolean {
  if (a === undefined || b === undefined) return false;
  return a === b || KAPSAM_JOKER.has(a) || KAPSAM_JOKER.has(b);
}

/**
 * İki kural çelişiyor mu? (M-2 · doğuş-rehberi turu DARALTMA modeli)
 *   ① aynı KOD + farklı imza → kural-çatışması (hata) — RBAC L5-çelişki dersi.
 *   ② kesişen kapsam + aynı yolda kısıt, AYNI otorite:
 *      ayrık aralıklar → kural-çatışması (hata — ikisi birden sağlanamaz);
 *      örtüşen → serbest (iki eş kural birlikte zorlanır).
 *   ③ kesişen kapsam + FARKLI otorite → CUE-tarzı DARALTMA (üst-ezer KALKTI —
 *      doğuş-rehberi turu · Pkl `amends` deseni): alt otoritenin aralığı üstünkinin
 *      ALT KÜMESİ olmak zorunda. Daraltan (daha katı) geçer; gevşeten ya da
 *      çelişen → kural-çatışması HATA — sessiz galibiyet yok, spec yalan
 *      söyleyemez (eskiden 'üst kazanır' bilgisiyle geçiliyordu).
 */
export function ciftCatismasi(a: KuralBilgi, b: KuralBilgi): Tani | undefined {
  if (a.kod === b.kod) {
    if (kuralImzasi(a) !== kuralImzasi(b)) {
      return eskiTani("kural-çatışması", "hata",
        { kod: a.kod, birinci: a.d.satir, ikinci: b.d.satir, kusur: "çift-tanım" },
        { satir: b.d.satir, sutun: b.d.sutun });
    }
    return undefined; // birebir kopya — çatışma değil (yine de kirlilik; ileride ayrı tanı olabilir)
  }

  if (!kapsamKesisir(a.kapsam, b.kapsam) || !a.kosul || !b.kosul) return undefined;
  const ka = kisitHaritasi(a.kosul);
  const kb = kisitHaritasi(b.kosul);
  if (!ka || !kb) return undefined;

  const esitOtorite = otoriteSira(a) === otoriteSira(b);
  for (const [yol, aa] of ka) {
    const bb = kb.get(yol);
    if (!bb || aralikBos(aa) || aralikBos(bb)) continue;
    if (esitOtorite) {
      if (aralikBos(aralikKesis(aa, bb))) {
        return eskiTani("kural-çatışması", "hata",
          { kod: a.kod, öteki: b.kod, yol, koşul: degerYaz(a.kosul), ötekiKoşul: degerYaz(b.kosul), kusur: "çelişki" },
          { satir: b.d.satir, sutun: b.d.sutun });
      }
      continue;
    }
    // ③ DARALTMA (doğuş-rehberi turu): alt otorite üstü yalnız DARALTABİLİR — alt ⊆ üst şart.
    const [üst, alt] = otoriteSira(a) > otoriteSira(b) ? [a, b] : [b, a];
    const üstAralik = üst === a ? aa : bb;
    const altAralik = alt === a ? aa : bb;
    if (!aralikAltKume(altAralik, üstAralik)) {
      return eskiTani("kural-çatışması", "hata",
        {
          alt: alt.kod, altOtorite: alt.otorite ?? "tercih", altKoşul: degerYaz(alt.kosul!),
          üst: üst.kod, üstOtorite: üst.otorite, üstKoşul: degerYaz(üst.kosul!),
          yol, kusur: "daraltmıyor",
        },
        { satir: alt.d.satir, sutun: alt.d.sutun });
    }
  }
  return undefined;
}

// ═══ YAS-2.4 · tip birleşimi — uygular-hedefli kısıt birleşimi (⊥ çatışma) ═════
//
//   YAS-2.4 hükmü: bir düğüm üstündeki kısıtlar birden çok katmandan gelip
//   çelişirse motor sessizce birine indirgemek yerine AÇIK çatışma hatası
//   (mantıksal taban ⊥) üretir. Mevcut ciftCatismasi KAPSAM kesişimiyle
//   çalışır — kapsam beyansız iki kural birbirine görünmezdi. Bu bekçi HEDEF
//   perspektifini ekler: aynı düğüme `uygular:` ile bağlanan kuralların
//   koşulları O DÜĞÜM üstünde fiilen birleşir (unification) — kapsam beyanından
//   bağımsız. Hüküm aynen YAS-2.3 daraltma modeli: eşit otorite → kesişim boş =
//   ⊥; farklı otorite → alt üstü daraltmıyorsa ⊥. Kapsamları ZATEN kesişen
//   çift atlanır — o çifti ciftCatismasi raporlar (②-B10: çift tanı basılmaz).
//   Sınır (YAS-2.4): tam biçimsel unification cebri değil — mevcut aralık modeli
//   (kisitHaritasi) neyi çözüyorsa onunla çelişki tespiti.
export function birlesimCatismaTanilari(
  programlar: ReadonlyMap<string, Program>,
): Array<{ dosya: string; tani: Tani }> {
  const kurallar = new Map<string, KuralBilgi>();
  for (const [, p] of programlar) {
    for (const k of kurallariCikar(p)) if (k.kod) kurallar.set(k.kod, k);
  }
  const out: Array<{ dosya: string; tani: Tani }> = [];
  for (const [dosya, p] of programlar) {
    const gez = (node: Dugum): void => {
      if (node.tur === "widget" && node.ad !== "Kural") {
        const hedefler: string[] = [];
        for (const par of [...node.parametreler, ...node.ozellikler]) {
          if (par.ad !== "uygular") continue;
          const topla = (d: Deger | undefined): void => {
            if (!d) return;
            if (d.tur === "liste") (d.ogeler ?? []).forEach(topla);
            else if (d.metin) hedefler.push(d.metin);
          };
          topla(par.deger);
        }
        const kbs = hedefler
          .map((h) => kurallar.get(h))
          .filter((k): k is KuralBilgi => !!k && !!k.kosul);
        const kodP = node.parametreler.find((x) => x.ad === "kod")?.deger.metin ?? node.ad;
        for (let i = 0; i < kbs.length; i++) {
          for (let j = i + 1; j < kbs.length; j++) {
            const a = kbs[i], b = kbs[j];
            if (kapsamKesisir(a.kapsam, b.kapsam)) continue;   // ciftCatismasi'nın alanı
            const ka = kisitHaritasi(a.kosul!);
            const kb = kisitHaritasi(b.kosul!);
            if (!ka || !kb) continue;
            for (const [yol, aa] of ka) {
              const bb = kb.get(yol);
              if (!bb || aralikBos(aa) || aralikBos(bb)) continue;
              // Kusurun TÜRÜ burada seçilir, CÜMLESİ tek kaynakta kurulur (CDL-A02).
              let kusur: string | undefined;
              let daraltma: { alt: string; altOtorite: string; üst: string; üstOtorite?: string } | undefined;
              if (otoriteSira(a) === otoriteSira(b)) {
                if (aralikBos(aralikKesis(aa, bb))) kusur = "ayrık";
              } else {
                const [ust, alt] = otoriteSira(a) > otoriteSira(b) ? [a, b] : [b, a];
                const ustAralik = ust === a ? aa : bb;
                const altAralik = alt === a ? aa : bb;
                if (!aralikAltKume(altAralik, ustAralik)) {
                  kusur = "daraltmıyor";
                  daraltma = { alt: alt.kod, altOtorite: alt.otorite ?? "tercih", üst: ust.kod, üstOtorite: ust.otorite };
                }
              }
              if (kusur) {
                out.push({ dosya, tani: eskiTani("birleşim-çatışması", "hata",
                  {
                    kimlik: kodP, kod: a.kod, öteki: b.kod, yol, kusur,
                    koşul: degerYaz(a.kosul!), ötekiKoşul: degerYaz(b.kosul!), ...daraltma,
                  },
                  { satir: node.satir, sutun: node.sutun }) });
              }
            }
          }
        }
      }
      for (const c of node.cocuklar) gez(c);
    };
    for (const b of p.bildirimler) gez(b);
  }
  return out;
}

// ═══ M-3 · Yapısal koşul değerlendirici (asıl motor — PLN-6) ═══════════════
//
//   `katman: yapısal` kuralların koşul:unu kapsam düğümleri üstünde koşturur.
//   ÜÇ-DEĞERLİ mantık (T/F/belirsiz): ihlal YALNIZ koşul KESİN false olunca
//   raporlanır — bilinmeyen alan yanlış-pozitif üretmez (M-2 disiplini).
//   Alan-anlamı PRESENCE: node.üretir → alan VAR mı? (var=true · yok=false);
//   node.yetki == L5 → alanın DEĞERİ karşılaştırılır (yoksa == false, != true).

export type Uc = true | false | "belirsiz";

const ve3 = (a: Uc, b: Uc): Uc => (a === false || b === false ? false : a === "belirsiz" || b === "belirsiz" ? "belirsiz" : true);
const veya3 = (a: Uc, b: Uc): Uc => (a === true || b === true ? true : a === "belirsiz" || b === "belirsiz" ? "belirsiz" : false);
const degil3 = (a: Uc): Uc => (a === "belirsiz" ? "belirsiz" : !a);

const DOGRU = new Set(["evet", "doğru", "var", "açık", "true"]);
const YANLIS = new Set(["hayır", "yanlış", "yok", "kapalı", "false"]);

/** Düğümün alanını (parametre∪özellik) çözer; nokta-yolun SON parçası alan adıdır.
 *  doğuş-rehberi turu: son parça `uzunluk` ise TÜRETİLMİŞ özellik — bir önceki parçanın
 *  metin uzunluğu (liste ise öğe sayısı) döner (DIL-3 `.uzunluk` reçetesi canlandı). */
function alanCoz(d: Dugum, yol: string): { tur: "yok" } | { tur: "deger"; v: string } | { tur: "var" } {
  const parcalar = yol.split(".");
  if (parcalar.length >= 2 && parcalar[parcalar.length - 1] === "uzunluk") {
    const alan = parcalar[parcalar.length - 2];
    const p = [...d.parametreler, ...d.ozellikler].find((x) => x.ad === alan);
    if (!p) return { tur: "yok" };
    if (p.deger.tur === "liste") return { tur: "deger", v: String((p.deger.ogeler ?? []).length) };
    if (p.deger.metin !== undefined) return { tur: "deger", v: String(p.deger.metin.length) };
    return { tur: "yok" }; // uzunluğu tanımsız değer (harita/widget) — belirsizliğe düşsün
  }
  const alan = parcalar.pop() ?? yol;
  const p = [...d.parametreler, ...d.ozellikler].find((x) => x.ad === alan);
  if (!p) return { tur: "yok" };
  const dv = p.deger;
  if (dv.tur === "sayı" || dv.tur === "metin" || dv.tur === "kod") return { tur: "deger", v: dv.metin ?? "" };
  return { tur: "var" }; // liste/harita/widget/kenar → mevcut (presence)
}

/** Boolean bağlamda alan/atom → Uc. (args: doğuş-rehberi turu argüman ikamesi — DIL-3) */
function boolCoz(v: Deger, d: Dugum, args?: Map<string, Deger>): Uc {
  if (v.tur === "erişim" || v.tur === "kod") {
    const arg = args?.get(v.metin ?? "");
    if (arg) return boolCoz(arg, d);   // argüman literal'i (Kural x( azami: 40 ) → koşulda azami)
    const r = alanCoz(d, v.metin ?? "");
    if (r.tur === "yok") return false;   // presence: alan yok = false
    if (r.tur === "var") return true;
    const s = r.v.toLocaleLowerCase("tr");
    if (DOGRU.has(s)) return true;
    if (YANLIS.has(s)) return false;
    return true; // değerli alan mevcut = truthy
  }
  if (v.tur === "sayı") return Number(v.metin) !== 0;
  if (v.tur === "metin") return (v.metin ?? "") !== "";
  return "belirsiz";
}

/** Karşılaştırma bağlamında operandı skalere çözer (yok = absent işareti).
 *  doğuş-rehberi turu: ① args ikamesi ÖNCE (Kural x( azami: 40 ) → koşulda `azami` = 40);
 *  ② çıplak ad (kod-türü) düğümde AYNI ADLA ALAN varsa öz-referanstır (Pkl `this`
 *  reçetesinin Sarmal hâli: `güven >= 0.7` — güven düğümün alanı); alan yoksa
 *  eski davranış korunur: çıplak sabit (örn. `yetki == L5`teki L5). */
function skaler(v: Deger, d: Dugum, args?: Map<string, Deger>): { yok: true } | { s: string } | { n: number } {
  if (v.tur === "sayı") return { n: Number(v.metin) };
  if (v.tur === "kod") {
    const arg = args?.get(v.metin ?? "");
    if (arg) return skaler(arg, d);
    const r = alanCoz(d, v.metin ?? "");
    if (r.tur === "deger") {
      const num = Number(r.v);
      return Number.isNaN(num) || r.v.trim() === "" ? { s: r.v } : { n: num };
    }
    return { s: v.metin ?? "" };   // alan yok → çıplak sabit (L5 deseni — geriye-uyum)
  }
  if (v.tur === "metin") return { s: v.metin ?? "" };
  if (v.tur === "erişim") {
    const arg = args?.get(v.metin ?? "");
    if (arg) return skaler(arg, d);
    const r = alanCoz(d, v.metin ?? "");
    if (r.tur === "yok") return { yok: true };
    if (r.tur === "var") return { s: "«var»" };
    const num = Number(r.v);
    return Number.isNaN(num) || r.v.trim() === "" ? { s: r.v } : { n: num };
  }
  return { yok: true };
}

function karsilastir(a: ReturnType<typeof skaler>, op: string, b: ReturnType<typeof skaler>): Uc {
  const esit = (): Uc => {
    if ("yok" in a && "yok" in b) return true;
    if ("yok" in a || "yok" in b) return false;
    if ("n" in a && "n" in b) return a.n === b.n;
    return String("s" in a ? a.s : a.n) === String("s" in b ? b.s : b.n);
  };
  if (op === "==") return esit();
  if (op === "!=") return degil3(esit());
  if ("yok" in a || "yok" in b || !("n" in a) || !("n" in b)) return "belirsiz"; // sıralama yalnız sayı
  switch (op) {
    case ">=": return a.n >= b.n;
    case ">":  return a.n > b.n;
    case "<=": return a.n <= b.n;
    case "<":  return a.n < b.n;
  }
  return "belirsiz";
}

const KARSILASTIRMA = new Set(["==", "!=", ">=", ">", "<=", "<"]);

/** Bir koşul ifadesini (Deger) bir kapsam düğümü (Dugum) üstünde değerlendirir → üç-değerli.
 *  Tetikleyici→Beceri aktivasyonu (sef.ts) da bunu kullanır: fire yalnız kesin `true`.
 *  args (doğuş-rehberi turu): Kural parametrelerinden argüman ikamesi (DIL-3 fonksiyon-biçimi). */
export function ifadeDegerlendir(v: Deger, d: Dugum, args?: Map<string, Deger>): Uc {
  if (v.tur === "ifade") {
    if (v.islem === "ve") return ve3(ifadeDegerlendir(v.sol!, d, args), ifadeDegerlendir(v.sag!, d, args));
    if (v.islem === "veya") return veya3(ifadeDegerlendir(v.sol!, d, args), ifadeDegerlendir(v.sag!, d, args));
    if (v.islem === "değil") return degil3(ifadeDegerlendir(v.sag!, d, args));
    if (KARSILASTIRMA.has(v.islem ?? "") && v.sol && v.sag) {
      return karsilastir(skaler(v.sol, d, args), v.islem!, skaler(v.sag, d, args));
    }
    return "belirsiz"; // aritmetik (+,-,*…) tek başına boolean değil
  }
  return boolCoz(v, d, args);
}

/** Bir kuralın kapsamındaki düğümleri döndürür (M-1 koni mantığı + M-3 ortak). */
function kapsamDugumleri(kapsam: string, widgetlar: Dugum[], aile: Map<string, string>): Dugum[] {
  return widgetlar.filter((d) => kapsamKapsar(kapsam, d, kodOf(d), aile));
}

/** TERS YÖN (VIT-GRAF · panel/ŞEF): bir düğüme kapsam yoluyla DÜŞEN kuralları
 *  döndürür — koni-taşması sayımının (kaç kural) liste karşılığıdır (hangi kurallar).
 *  Aynı `kapsamKapsar` predikatını sürer (TEK KAYNAK); kapsamsız kurallar dışlanır. */
export function dugumeDusenKurallar(d: Dugum, kurallar: KuralBilgi[], aile: Map<string, string>): KuralBilgi[] {
  const kod = kodOf(d);
  return kurallar.filter((k) => k.kapsam !== undefined && kapsamKapsar(k.kapsam, d, kod, aile));
}

/** Kuralın insan-yüzü açıklaması (`ne:` alanı) — panel/hover gösterimi için (boşsa ""). */
export function kuralNe(k: KuralBilgi): string {
  return paramVeyaOzellik(k.d, "ne")?.metin ?? "";
}

const DUZEY_GECERLI = new Set(["hata", "uyarı", "bilgi"]);

/** Kural argümanları (doğuş-rehberi turu · DIL-3 fonksiyon-biçimi): rezerve olmayan
 *  parametreler koşulda ada göre ikame edilir — `Kural adSınırı( azami: 40 )`. */
const REZERVE_PARAMLAR = new Set(["kod", "ad", "ne", "otorite", "katman", "kapsam", "ebedi", "koşul", "ihlal", "düzey", "uygular"]);

function kuralArgumanlari(k: KuralBilgi): Map<string, Deger> | undefined {
  const args = new Map<string, Deger>();
  for (const p of k.d.parametreler) {
    if (!REZERVE_PARAMLAR.has(p.ad) && (p.deger.tur === "sayı" || p.deger.tur === "metin" || p.deger.tur === "kod")) {
      args.set(p.ad, p.deger);
    }
  }
  return args.size ? args : undefined;
}

/** Tüm yapısal + eşik kuralları kapsam düğümleri üstünde koşturur (M-3 · doğuş-rehberi turu:
 *  eşik katmanı da DENETİMDE değerlendirilir — bildirimsel alanlar üstünde; runtime
 *  yürütme RAY-3'ün işi olarak ayrı kalır). */
function yapisalDegerlendir(kurallar: KuralBilgi[], widgetlar: Dugum[], snf: Siniflama, out: Tani[], dosyaYolu?: string): void {
  const aile = new Map<string, string>(snf.widgetTipleri.map((t) => [t.ad, t.aile]));

  for (const k of kurallar) {
    if ((k.katman !== "yapısal" && k.katman !== "eşik") || !k.kosul || k.kapsam === undefined) continue;
    if (k.kosul.tur === "metin") continue; // düzyazı koşul — makine değerlendiremez (M-1 kapsamı)
    // RF-T6-A04: ÖzelKural hedef: dizini DIŞINDAKİ dosyada değerlendirilmez —
    // tip farkı = KAPSAM farkı (vitrin tanımı). Yol bilinmiyorsa (tekil/eski
    // çağrılar) değerlendirilir: kuralın yaşadığı dosya zaten hedef bölgesidir.
    if (k.hedef && dosyaYolu) {
      const yol = dosyaYolu.replace(/\\/g, "/");
      const hedef = k.hedef.replace(/\\/g, "/").replace(/\/+$/, "") + "/";
      if (!yol.startsWith(hedef) && !yol.includes("/" + hedef)) continue;
    }

    const args = kuralArgumanlari(k);
    // `ihlal:` beyanı kullanıcının kendi cümlesidir; beyansızken kurulan
    // varsayılan cümle motorundur ve tek kaynakta (tani-metinleri) yaşar.
    const ihlalMetni = paramVeyaOzellik(k.d, "ihlal")?.metin;
    const dzy = paramVeyaOzellik(k.d, "düzey")?.metin;
    const duzey = (dzy && DUZEY_GECERLI.has(dzy) ? dzy : "hata") as Tani["duzey"];

    // KRR-MUT-3 sessizlik yasağı: koşul kapsamdaki HİÇBİR düğümde
    // değerlendirilemiyorsa (hep belirsiz) kural SESSİZCE ölmez — söylenir.
    let kapsamda = 0;
    let degerlendirildi = false;
    for (const d of kapsamDugumleri(k.kapsam, widgetlar, aile)) {
      if (d.tur !== "widget") continue;
      kapsamda++;
      const sonuc = ifadeDegerlendir(k.kosul, d, args);
      if (sonuc !== "belirsiz") degerlendirildi = true;
      if (sonuc === false) {
        out.push(eskiTani("kural-ihlali", duzey,
          { ad: d.ad, kimlik: kodOf(d), ihlal: ihlalMetni, kod: k.kod, koşul: degerYaz(k.kosul) },
          { satir: d.satir, sutun: d.sutun }));
      }
    }
    if (kapsamda > 0 && !degerlendirildi) {
      // doğuş-rehberi turu düzey ayrımı: yapısal koşul denetimin İŞİDİR — değerlendirilemiyorsa
      // uyarı (KRR-MUT-3 sessizlik yasağı). Eşik koşulu çoğunlukla RUNTIME alanına atıf
      // yapar (deneme sayısı, süre…) — denetimde belirsiz kalması doğaldır: bilgi düzeyi
      // (dürüst iz, yeşili bozmaz; zorlama RAY-3 koşucusunda).
      out.push(eskiTani("zorlanamayan-koşul", k.katman === "eşik" ? "bilgi" : "uyarı",
        { kod: k.kod, kapsamda, eşik: k.katman === "eşik" },
        { satir: k.d.satir, sutun: k.d.sutun }));
    }
  }
}

// ── ebedi mühür (diff hali) ──────────────────────────────────────────────────

/** ebedi.kilit.json biçimi — 'sarmal kilitle' yazar, elle DÜZENLENMEZ (FEL-4). */
export interface EbediKilit {
  not: string;
  muhurlenme: string;
  kurallar: Record<string, string>; // kod → imza
}

export const EBEDI_KILIT_ADI = "ebedi.kilit.json";

/** Dosyalar-arası ebedi envanteri: kod → {imza, dosya, satır}. */
export function ebediEnvanter(
  programlar: Map<string, Program>,
): Map<string, { imza: string; dosya: string; satir: number; sutun: number }> {
  const env = new Map<string, { imza: string; dosya: string; satir: number; sutun: number }>();
  for (const [dosya, p] of programlar) {
    for (const k of kurallariCikar(p)) {
      if (!k.ebedi) continue;
      env.set(k.kod, { imza: kuralImzasi(k), dosya, satir: k.d.satir, sutun: k.d.sutun });
    }
  }
  return env;
}

/**
 * Ebedi mühür denetimi (M-2):
 *   kilitte var + imza DEĞİŞMİŞ → ebedi-ihlal (hata — kurucu bile değiştiremez)
 *   kilitte var + kural SİLİNMİŞ → ebedi-ihlal (hata — silmek de değiştirmektir)
 *   kural ebedi + kilitte YOK    → mühürsüz-ebedi (uyarı — 'sarmal kilitle' ile mühürle)
 *   kilit dosyası hiç yok        → tüm ebediler mühürsüz-ebedi uyarısı alır
 */
export function ebediTanilar(
  envanter: ReturnType<typeof ebediEnvanter>,
  kilit: EbediKilit | undefined,
): Array<{ dosya: string; tani: Tani }> {
  const out: Array<{ dosya: string; tani: Tani }> = [];

  for (const [kod, e] of envanter) {
    const muhur = kilit?.kurallar[kod];
    if (muhur === undefined) {
      out.push({
        dosya: e.dosya,
        tani: eskiTani("mühürsüz-ebedi", "uyarı", { kod }, { satir: e.satir, sutun: e.sutun }),
      });
    } else if (muhur !== e.imza) {
      out.push({
        dosya: e.dosya,
        tani: eskiTani("ebedi-ihlal", "hata", { kod, kusur: "değişmiş" }, { satir: e.satir, sutun: e.sutun }),
      });
    }
  }

  for (const kod of Object.keys(kilit?.kurallar ?? {})) {
    if (!envanter.has(kod)) {
      out.push({
        dosya: EBEDI_KILIT_ADI,
        tani: eskiTani("ebedi-ihlal", "hata", { kod, kusur: "silinmiş" }, { satir: 0, sutun: 0 }),
      });
    }
  }

  return out;
}

// ═══ doğuş-rehberi turu · Mühürlü referans (Dhall sha256-import ödüncü) ══════════════
//
//   `çağır KOD @mühür:<hash>` — ebedi kural/karar referansını hedefin İÇERİK
//   hash'iyle pinler: hedef sessizce değişemez. Hash = hedef düğümün kanonik
//   yalın-JSON'unun (prizma düğümYalın — determinist) sha256 ilk 12 hex'i.
//   Ebedi mührüyle BÜTÜNLEŞME: ikisi de "içerik değişti mi?" sorusunu kanonik
//   imza üstünden sorar — ebedi.kilit.json kural-imzasını dosyada, @mühür pini
//   atıf-noktasında taşır (kilit=tanım tarafı · mühür=kullanım tarafı).

import { createHash } from "node:crypto";
import { düğümYalın } from "./prizma.ts";

/** Bir düğümün içerik mührü — kanonik yalın-JSON sha256'sının ilk 12 hex'i. */
export function dugumMuhru(d: Dugum): string {
  return createHash("sha256")
    .update(JSON.stringify(düğümYalın(d)).normalize("NFC"))
    .digest("hex")
    .slice(0, 12);
}

/**
 * Mühür denetimi (dosyalar-arası): tüm `çağır … @mühür:` pinleri hedefin güncel
 * mührüyle karşılaştırılır. Hedef YOKSA susar (kırık-referans bekçisi zaten
 * raporlar — çift tanı basılmaz, ②-B10 dersi).
 */
export function muhurTanilari(programlar: Map<string, Program>): Array<{ dosya: string; tani: Tani }> {
  // kod → tanım düğümü (ilk tanım kazanır; yinelenen-kod bekçisi çifti ayrıca raporlar)
  const tanimlar = new Map<string, Dugum>();
  const gezTanim = (d: Dugum): void => {
    const kod = paramVeyaOzellik(d, "kod")?.metin;
    if (kod && !tanimlar.has(kod)) tanimlar.set(kod, d);
    for (const c of d.cocuklar) gezTanim(c);
  };
  for (const p of programlar.values()) for (const b of p.bildirimler) gezTanim(b);

  const out: Array<{ dosya: string; tani: Tani }> = [];
  const gezCagir = (d: Dugum, dosya: string): void => {
    if (d.tur === "çağır") {
      const pin = d.parametreler.find((x) => x.ad === "mühür")?.deger.metin;
      if (pin) {
        const hedef = tanimlar.get(d.ad);
        if (hedef) {
          const guncel = dugumMuhru(hedef);
          if (guncel !== pin) {
            out.push({
              dosya,
              tani: eskiTani("mühür-kırık", "hata",
                { hedef: d.ad, güncel: guncel, pin }, { satir: d.satir, sutun: d.sutun }),
            });
          }
        }
      }
    }
    for (const c of d.cocuklar) gezCagir(c, dosya);
  };
  for (const [dosya, p] of programlar) for (const b of p.bildirimler) gezCagir(b, dosya);
  return out;
}

// ═══════════════════════════════════════════════════════════════════════════
// YENİ KANON · KURAL GÖVDESİ SÖZLEŞMESİ (motor turu ikinci halkası · üç tanı)
//
//   Bu üç hüküm kural gövdesinin KENDİ sözleşmesi hakkındadır: hükmün rolü ile
//   seçilen yasa tipinin uyumu, otorite-katman-kapsam üçlüsünün tamlığı ve
//   ilan edilen tanı düzeyinin kanıtsız yükseltilmemesi. Üçü de açık dosyadan
//   karara bağlanır; kapsamın gerçek hedefe çözülmesi ise proje kapısının işidir
//   ve orada kendi tanılarıyla konuşur — aynı kök ihlal iki kez basılmaz.
// ═══════════════════════════════════════════════════════════════════════════

/** Zorlama koşulu taşıyamayacak yasa tipleri — koşul yalnız Kural gövdesinde yaşar. */
const KOSULSUZ_YASA_TIPLERI: ReadonlySet<string> = new Set(["Karar", "Anayasa", "Politika", "Mevzuat", "Yasa"]);
/** Kanonik otorite sırası. */
const OTORITE_EVRENI: ReadonlySet<string> = new Set(["anayasa", "politika", "tercih"]);

/** Yeni kanonun kural kapsamlı üreticileri — dosya-içi kural denetimiyle birlikte koşar. */
export function yeniKuralTanilari(program: Program, snf: Siniflama): Tani[] {
  const out: Tani[] = [];
  const kanonKatman = snf.semalar?.["Kural"]?.enum?.["katman"];
  const katmanlar: ReadonlySet<string> = kanonKatman?.length ? new Set(kanonKatman) : VARSAYILAN_KATMANLAR;

  // Hüküm türü: rol ile seçilen yasa tipi uyuşmalı.
  const gez = (d: Dugum): void => {
    if (d.tur === "widget" && KOSULSUZ_YASA_TIPLERI.has(d.ad)) {
      const kosul = paramVeyaOzellik(d, "koşul");
      if (kosul) {
        out.push(yeniTani("hüküm-türü-uyumsuz",
          { kimlik: kodOf(d), kusur: `"${d.ad}" hükmü makine koşulu taşıyor, oysa zorlama koşulu Kural gövdesinde yaşar` },
          kosul));
      }
    }
    if (d.tur === "kuralTanım" || (d.tur === "widget" && (d.ad === "Kural" || d.ad === "GenelKural" || d.ad === "ÖzelKural"))) {
      const karar = paramVeyaOzellik(d, "karar");
      if (karar) {
        out.push(yeniTani("hüküm-türü-uyumsuz",
          { kimlik: kodOf(d), kusur: "Kural gövdesi kilitli hüküm metnini taşıyor, oysa hükmün niçini Karar tipinde yaşar" },
          d));
      }
    }
    for (const c of d.cocuklar) gez(c);
  };
  for (const b of program.bildirimler) gez(b);

  for (const k of kurallariCikar(program)) {
    const eksik: string[] = [];
    if (!k.otorite) eksik.push("otorite beyanı");
    else if (!OTORITE_EVRENI.has(k.otorite)) eksik.push(`geçerli otorite (yazılan değer "${k.otorite}")`);
    if (!k.katman) eksik.push("katman beyanı");
    else if (!katmanlar.has(k.katman)) eksik.push(`geçerli katman (yazılan değer "${k.katman}")`);
    if (!k.kapsam) eksik.push("kapsam beyanı");
    if (eksik.length) {
      out.push(yeniTani("kural-sözleşmesi-eksik",
        { kimlik: k.kod, kusur: `${eksik.join(" · ")} yok` }, k.d));
    }

    // Terfi kapısı: kuralın ilan ettiği düzey motorun bugünkü kademesini aşamaz.
    const duzey = paramVeyaOzellik(k.d, "düzey")?.metin;
    if (!duzey) continue;
    const sira: Record<string, number> = { bilgi: 1, "uyarı": 2, hata: 3 };
    const iddiaSira = sira[duzey] ?? 0;
    if (!iddiaSira) continue;
    for (const t of (paramVeyaOzellik(k.d, "tanı")?.ogeler ?? (paramVeyaOzellik(k.d, "tanı") ? [paramVeyaOzellik(k.d, "tanı")!] : []))) {
      const kod = t.metin;
      if (!kod) continue;
      const kayit = YENI_TANI_INDEKS.get(kod);
      if (!kayit) continue;
      const kademeSira = sira[kayit.kademe] ?? 1;
      if (iddiaSira > kademeSira) {
        out.push(yeniTani("tanı-terfi-kapısı-ihlali",
          { kimlik: k.kod, kusur: `kural "${kod}" tanısını "${duzey}" düzeyinde ilan ediyor, oysa bu hüküm motorda henüz "${kayit.kademe}" kademesinde gözleniyor` },
          t));
      }
    }
  }
  return out;
}

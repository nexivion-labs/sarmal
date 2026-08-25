// ═══════════════════════════════════════════════════════════════════════════
// muzakere.ts — 🗣️ DEBATE + RECOVERY
//
//   Bu dosya, ŞEF çekirdek döngüsünün bilinçle ertelenmiş üst-turunu taşır; mek-sef
//   gövdesi müzakere ile kurtarmanın ilk turda bilerek ertelendiğini yazar. İki
//   mekanizma birlikte yaşar:
//   ① DEBATE: denetçi bulgusuna üretici SAVUNMA verir → ŞEF hakem-kararı.
//      Tur limiti + aynı-iddia-tekrarı yasak (döngü kilidi). Üretici≠denetçi
//      izolasyonu (ORK-6.1) müzakerede de korunur — hakem yalnız İDDİA+KANIT görür.
//   ② RECOVERY: BLOCKED sonrası üç mekanik yol — yeniden-dene · böl · eskale.
//      Hangi yol GİZLİ enjekte (KurtarmaStratejisi); demo=basit sıra. 'böl' yalnız
//      ÖNERİ üretir (yazmaz — insan ya da ajan onaylar; motor karar vermez).
//   STR-3: müzakere/kurtarma MEKANİĞİ AÇIK; hakem/strateji POLİTİKASI GİZLİ.
// ═══════════════════════════════════════════════════════════════════════════

import type { Bulgu } from "./dongu.ts";

// ── DEBATE (A30) ─────────────────────────────────────────────────────────────

export interface MuzakereTuru {
  tur: number;
  taraf: "üretici" | "denetçi" | "hakem";
  iddia: string;
  kanıt?: string;
  hüküm?: "kabul" | "itiraz-haklı" | "bulgu-geçerli";
}

/** Bir bulgunun müzakere sonucu — hüküm nihai kararı, turlar iz bırakır. */
export interface MuzakereSonuç {
  bulgu: string;
  hüküm: "itiraz-haklı" | "bulgu-geçerli";
  turlar: MuzakereTuru[];
  /** tur limiti savunma sürerken doldu — koşu ESKALE edilmeli (A30 kabulü). */
  limitAşıldı?: boolean;
}

/** TAKILABİLİR hakem — iddia+kanıt görür (ORK-6.1: bellek/bağlam değil). GİZLİ politika enjekte. */
export type Hakem = (bulgu: string, savunma: { iddia: string; kanıt?: string }) => "itiraz-haklı" | "bulgu-geçerli";

/** Üretici savunması — bulguya karşı iddia + kanıt (yoksa savunma yok = bulgu geçerli). */
export type SavunmaÇağır = (bulgu: string) => { iddia: string; kanıt?: string } | undefined;

/**
 * Bir bulguyu müzakereye sokar (A30): üretici savunma verir → hakem hükme bağlar.
 * Tur limiti + aynı-iddia-tekrarı yasak (döngü kilidi — kısır itiraz eskale olmaz,
 * geçerli sayılır). Savunma yoksa bulgu doğrudan geçerli.
 */
export function muzakereEt(
  bulgu: Bulgu,
  savun: SavunmaÇağır,
  hakem: Hakem,
  maxTur = 3,
): MuzakereSonuç {
  const turlar: MuzakereTuru[] = [
    { tur: 0, taraf: "denetçi", iddia: bulgu.mesaj, kanıt: bulgu.kanıt },
  ];
  const görülenİddialar = new Set<string>();
  for (let t = 1; t <= maxTur; t++) {
    const savunma = savun(bulgu.mesaj);
    if (!savunma) break;                              // savunma yok → bulgu geçerli
    if (görülenİddialar.has(savunma.iddia)) break;    // aynı-iddia-tekrarı → döngü kilidi
    görülenİddialar.add(savunma.iddia);
    turlar.push({ tur: t, taraf: "üretici", iddia: savunma.iddia, kanıt: savunma.kanıt });
    const hüküm = hakem(bulgu.mesaj, savunma);
    turlar.push({ tur: t, taraf: "hakem", iddia: `hüküm: ${hüküm}`, hüküm });
    if (hüküm === "itiraz-haklı") return { bulgu: bulgu.mesaj, hüküm, turlar };
    // bulgu-geçerli → üretici YENİ iddiayla bir tur daha deneyebilir (çok-tur müzakere);
    // aynı-iddia kilidi kısır tekrarı keser. Limit savunma SÜRERKEN dolarsa → limitAşıldı
    // (A30 kabulü: tur limiti aşımı koşuyu eskale eder — sessiz kabule düşmez).
    if (t === maxTur) return { bulgu: bulgu.mesaj, hüküm: "bulgu-geçerli", turlar, limitAşıldı: true };
  }
  return { bulgu: bulgu.mesaj, hüküm: "bulgu-geçerli", turlar };
}

// ── RECOVERY (A31) ───────────────────────────────────────────────────────────

export type KurtarmaYolu = "yeniden-dene" | "böl" | "eskale";

export interface KurtarmaKarar {
  yol: KurtarmaYolu;
  /** böl → alt-parça ÖNERİLERİ (yazılmaz — insan ya da ajan onaylar; motor karar vermez). */
  bölmeÖnerisi?: string[];
  /** eskale → Hatırlatıcı kalemi + insan kararı sinyali. */
  hatırlatıcı?: string;
  gerekçe: string;
}

/** TAKILABİLİR kurtarma stratejisi (GİZLİ politika enjekte; demo=basit sıra). */
export type KurtarmaStratejisi = (adımKod: string, denemeNo: number, bulgular: Bulgu[]) => KurtarmaYolu;

/**
 * Basit demo strateji (A31 · AÇIK): 1. deneme→yeniden-dene, 2.→böl, 3+→eskale.
 * Gerçek strateji (bulgu ağırlığı · maliyet · geçmiş) GİZLİ ürün (STR-3).
 */
export const basitKurtarma: KurtarmaStratejisi = (_adımKod, denemeNo) =>
  denemeNo <= 1 ? "yeniden-dene" : denemeNo === 2 ? "böl" : "eskale";

/**
 * BLOCKED sonrası kurtarma kararı üretir (A31): strateji yolu seçer, mekanik
 * karşılığı kurulur. 'böl' yalnız ÖNERİ (bulgulardan alt-parça adayları); 'eskale'
 * Hatırlatıcı metni. 'yeniden-dene' aynı-yöntem-yasak notuyla (kısır tekrar önlenir).
 */
export function kurtar(
  adımKod: string,
  denemeNo: number,
  bulgular: Bulgu[],
  strateji: KurtarmaStratejisi = basitKurtarma,
): KurtarmaKarar {
  const yol = strateji(adımKod, denemeNo, bulgular);
  if (yol === "böl") {
    return {
      yol,
      bölmeÖnerisi: bulgular.map((b, i) => `${adımKod}-parça${i + 1}: ${b.mesaj}`),
      gerekçe: `${adımKod} tek turda kapanmadı — bulgular ayrı alt-Adımlara bölünebilir (ÖNERİDİR; insan ya da ajan onaylar)`,
    };
  }
  if (yol === "eskale") {
    return {
      yol,
      hatırlatıcı: `${adımKod} ${denemeNo} denemede kapanmadı — insan kararı gerek: ${bulgular.map((b) => b.mesaj).join(" · ")}`,
      gerekçe: `${adımKod} kurtarma denemeleri tükendi → Hatırlatıcı + insan eskalasyonu; ertelenen bulgu sahipsiz bırakılmaz`,
    };
  }
  return { yol, gerekçe: `${adımKod} yeniden denenir — aynı-yöntem-yasak (kısır tekrar döngü kilidiyle kesilir)` };
}

// ── ÇOK-ETMEN ÜRETİM (A32 · Adım-İÇİ işbirliği) ──────────────────────────────
//    Bir Adım'ın Görev'i birden çok atanan Etmen taşıyorsa üretim payları SIRALI
//    sürülür (her Etmen kendi koni+beceri bağlamıyla); çıktılar TEK üretim olarak
//    birleşir, denetçi BİRLEŞİK çıktıyı görür (ORK-6.1 izolasyonu Etmen-başına korunur).
//    SINIR: Adımlar-ARASI paralellik HALKA-ORK-A02'de — bu Adım-İÇİ işbirliği.
//    Kadro SEÇİMİ (hangi uzmanlar) GİZLİ; Görev.atanan beyanı tek-kaynak.

export interface EtmenPayı { kod: string; ad: string }

/**
 * Çok-Etmen üretimini birleştirir (A32): her Etmen payını sırayla üretir, çıktılar
 * `paylar` altında + üst-düzey birleşik alanlarda toplanır (üretilenDosyalar
 * birleşir, testSonucu son-payınki). Tek Etmen'de davranış birebir (paylar[0]).
 * Denetçi bu BİRLEŞİK çıktıyı görür (ORK-6.1 izolasyonu Etmen-başına korunur).
 */
export function cokEtmenÜret(
  etmenler: EtmenPayı[],
  üret: (etmen: EtmenPayı, sıra: number) => Record<string, unknown>,
): Record<string, unknown> {
  if (etmenler.length === 0) return {};
  const paylar = etmenler.map((e, i) => ({ etmen: e.kod, ad: e.ad, çıktı: üret(e, i) }));
  const dosyalar = paylar.flatMap((p) =>
    Array.isArray(p.çıktı.üretilenDosyalar) ? (p.çıktı.üretilenDosyalar as string[]) : []);
  const son = paylar[paylar.length - 1].çıktı;
  return {
    ...son,                                     // sözleşme alanları (adım·güven·…) son paydan miras — birleşik çıktı SZL-ETMEN-CIKTI'ya uyar
    rol: "üretici",
    etmen: etmenler.map((e) => e.kod).join(" + "),   // kadro imzası birleşik (trace kimliği)
    çokEtmen: etmenler.length > 1,
    paylar,
    üretilenDosyalar: [...new Set(dosyalar)],   // birleşik (dedupe)
    testSonucu: son.testSonucu,                 // son pay bütünü doğrular
    gerekçe: `çok-Etmen üretim: ${etmenler.map((e) => e.kod).join(" → ")}`,
  };
}

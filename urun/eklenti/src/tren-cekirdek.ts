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

import type { Dugum, Program } from "../../cekirdek/src/sozdizim.ts";
import { planAlani } from "./yolharitasi-cekirdek.ts";

/** Projede ilan edilmiş bir ajan (Etmen düğümü). */
export interface TrenEtmeni {
  kod: string;
  ad: string;
  /** Etmenin türü: apex · yönetici · uzman (boş olabilir). */
  tur: string;
  ne: string;
  dosya: string;
  satir: number;
}

/** `durum: geliştirmede` olan bir Adım. */
export interface TrenAdimi {
  kod: string;
  ad: string;
  dosya: string;
  satir: number;
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

/**
 * Program haritasından Tren özetini çıkarır. Sıra kararlıdır: etmenler ve adımlar
 * koda göre, aynı kodda dosya yoluna göre dizilir; böylece iki tur arasındaki
 * görünür fark yalnız veri farkıdır.
 */
export function trenOzetiCikar(programlar: Iterable<readonly [string, Program]>): TrenOzeti {
  const etmenler: TrenEtmeni[] = [];
  const adimlar: TrenAdimi[] = [];
  let sonMuhur: TrenMuhru | undefined;
  const gez = (d: Dugum, dosya: string): void => {
    if (d.ad === "Etmen") {
      const kod = metin(d, "kod");
      if (kod) etmenler.push({ kod, ad: metin(d, "ad"), tur: metin(d, "tür"), ne: metin(d, "ne"), dosya, satir: d.satir });
    } else if (d.ad === "Adım") {
      const kod = metin(d, "kod");
      if (kod && metin(d, "durum") === "geliştirmede") adimlar.push({ kod, ad: metin(d, "ad"), dosya, satir: d.satir });
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
    for (const c of d.cocuklar) gez(c, dosya);
  };
  for (const [dosya, program] of programlar) for (const d of program.bildirimler) gez(d, dosya);
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
  return JSON.stringify([
    o.etmenler.map((e) => [e.kod, e.ad, e.tur, e.dosya, e.satir]),
    o.adimlar.map((a) => [a.kod, a.ad, a.dosya, a.satir]),
    m ? [m.kod, m.adim, m.muhur, m.karar, m.tarih, m.dosya, m.satir] : null,
  ]);
}

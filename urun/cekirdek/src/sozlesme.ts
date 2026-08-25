// ═══════════════════════════════════════════════════════════════════════════
// sozlesme.ts — Sözleşme-güdümlü çıktı doğrulaması (RAY-3 · Aşama 2 · B.1/B.2)
//
//   Etmen çıktısını / ŞEF kararını, Sarmal'ın KENDİ L2 sözleşmelerine (mek_sef.sar:
//   SZL-ETMEN-CIKTI · SZL-GEREKCE) göre doğrular. Şema KODA GÖMÜLMEZ — .sar'dan
//   OKUNUR (dogfood/tek-kaynak; mek_sef.sar:24 "kaynak-gerçek burada yaşar").
//   SAF çekirdek (alanSemasi·sozlesmeSema·sozlesmeDenetle·kabulGate) ↔ etkili kabuk.
//   Kaynak desen: eski OS tpl-001(agent-output) · tpl-007(rationale) · pol-024(kabul).
// ═══════════════════════════════════════════════════════════════════════════

import { readFileSync } from "node:fs";
import type { Dugum } from "./sozdizim.ts";
import { degerMetni } from "./yolcoz.ts";
import { programHaritasi, sozlesmeBul } from "./sef.ts";

export type AlanTip = "metin" | "sayı" | "liste";

/** Tek bir sözleşme alanının çıkarılmış şeması. */
export interface AlanSema {
  tip: AlanTip;
  zorunlu: boolean;
  enum?: string[];
  aralık?: [number, number];
}

/** Bir doğrulama ihlali. */
export interface Ihlal {
  alan: string;
  tür: "eksik-alan" | "tip-hatası" | "geçersiz-enum" | "aralık-hatası";
  mesaj: string;
}

/**
 * Bir alan spec-string'ini tolerant ayrıştırır (saf).
 * Örn: "metin · zorunlu · üretici|denetçi" · "sayı · 0..1" · "liste · üretim-yeri (MIM-2.1)".
 * token[0] = tip; kalanlarda `zorunlu` · `a|b|c` (enum) · `lo..hi` (aralık) taranır, gerisi prose.
 */
export function alanSemasi(spec: string): AlanSema {
  const parcalar = spec.split("·").map((s) => s.trim()).filter(Boolean);
  const tipHam = parcalar[0] ?? "metin";
  const tip: AlanTip = tipHam === "sayı" ? "sayı" : tipHam === "liste" ? "liste" : "metin";
  const sema: AlanSema = { tip, zorunlu: false };
  for (const p of parcalar.slice(1)) {
    if (p === "zorunlu") { sema.zorunlu = true; continue; }
    if (p.includes("|")) { sema.enum = p.split("|").map((x) => x.trim()).filter(Boolean); continue; }
    const m = p.match(/^(-?\d+(?:\.\d+)?)\s*\.\.\s*(-?\d+(?:\.\d+)?)$/);
    if (m) sema.aralık = [Number(m[1]), Number(m[2])];
    // gerisi prose → yok say
  }
  return sema;
}

/** Bir Sözleşme düğümünün `alanlar` haritasından alan→şema çıkarır (saf). */
export function sozlesmeSema(node: Dugum): Map<string, AlanSema> {
  const sema = new Map<string, AlanSema>();
  const p = node.parametreler.find((x) => x.ad === "alanlar") ??
    node.ozellikler.find((x) => x.ad === "alanlar");
  for (const c of p?.deger.ciftler ?? []) {
    sema.set(c.ad, alanSemasi(degerMetni(c.deger)));
  }
  return sema;
}

/** Bir nesneyi sözleşme şemasına vurur (saf). Boş liste = geçerli. */
export function sozlesmeDenetle(sema: Map<string, AlanSema>, nesne: Record<string, unknown>): Ihlal[] {
  const ihlaller: Ihlal[] = [];
  for (const [alan, s] of sema) {
    const v = nesne[alan];
    // Yok / null / boş-dize = "sağlanmadı" (boş niyet alanı = eksik). Sayı 0 GEÇERLİ değer,
    // eksik sayılmaz — yalnız string'in boşluğu boşluk sayılır (falsy-0 tuzağı).
    if (v === undefined || v === null || (typeof v === "string" && v.trim() === "")) {
      if (s.zorunlu) ihlaller.push({ alan, tür: "eksik-alan", mesaj: `zorunlu alan eksik: ${alan}` });
      continue;
    }
    const tipOk = s.tip === "liste" ? Array.isArray(v) : s.tip === "sayı" ? typeof v === "number" : typeof v === "string";
    if (!tipOk) {
      ihlaller.push({ alan, tür: "tip-hatası", mesaj: `${alan}: ${s.tip} bekleniyordu (${typeof v} geldi)` });
      continue; // tip yanlışsa enum/aralık anlamsız
    }
    if (s.enum && typeof v === "string" && !s.enum.includes(v)) {
      ihlaller.push({ alan, tür: "geçersiz-enum", mesaj: `${alan}: "${v}" geçersiz — ${s.enum.join("|")}` });
    }
    if (s.aralık && typeof v === "number" && (v < s.aralık[0] || v > s.aralık[1])) {
      ihlaller.push({ alan, tür: "aralık-hatası", mesaj: `${alan}: ${v} aralık dışı [${s.aralık[0]}..${s.aralık[1]}]` });
    }
  }
  return ihlaller;
}

/** ŞEF kabul-kararı sonucu (çok-değerli kabul · YAS-4.2). */
export interface KabulSonuc {
  geçti: boolean;
  karar?: string;      // kabul|revizyon|red|kurtarma|eskalasyon
  durum?: string;      // GEÇTİ|PASS-WEAK|PARTIAL|CONDITIONAL (kabulDurumu)
  ihlaller: Ihlal[];
}

/**
 * SZL-GEREKCE kararını doğrular + çok-değerli kabul durumunu çıkarır (saf).
 * `geçti = ihlal yok && karar === "kabul"`. COMPLETED→VERIFIED (denetçi onayı) Aşama 3.
 */
export function kabulGate(gerekçe: Record<string, unknown>, sema: Map<string, AlanSema>): KabulSonuc {
  const ihlaller = sozlesmeDenetle(sema, gerekçe);
  const karar = typeof gerekçe.karar === "string" ? gerekçe.karar : undefined;
  const durum = typeof gerekçe.kabulDurumu === "string" ? gerekçe.kabulDurumu : undefined;
  return { geçti: ihlaller.length === 0 && karar === "kabul", karar, durum, ihlaller };
}

// ── ETKİLİ CLI KABUĞU ───────────────────────────────────────────────────────

/** `sarmal sef-dogrula <SOZLESME-KOD> <cikti.json> [dizin]` — çıktıyı sözleşmeye vurur. */
export function sefDogrulaKomutu(dizin: string, sozlesmeKod: string, ciktiYolu: string): number {
  const programlar = programHaritasi(dizin);
  const node = sozlesmeBul(programlar, sozlesmeKod);
  if (!node) {
    console.error(`✖ '${sozlesmeKod}' kodlu Sözleşme bulunamadı (${programlar.size} .sar tarandı).`);
    return 4;
  }
  let nesne: Record<string, unknown>;
  try {
    nesne = JSON.parse(readFileSync(ciktiYolu, "utf8"));
  } catch (e) {
    console.error(`✖ '${ciktiYolu}' okunamadı/JSON değil: ${(e as Error).message}`);
    return 2;
  }
  const sema = sozlesmeSema(node);
  if (sema.size === 0) {
    // `alanlar` haritası yok → şema boş. sozlesmeDenetle her nesneyi geçirirdi;
    // "GEÇTİ" demek YANILTICI olur (hiçbir şey doğrulanmadı). İstek/yanıt biçimli
    // uç-sözleşmeleri bu yola düşer — sef-dogrula yalnız `alanlar` şemasını doğrular.
    console.error(`✖ '${sozlesmeKod}' sözleşmesinde 'alanlar' şeması yok — doğrulanacak alan bulunamadı (istek/yanıt biçimli uç-sözleşmesi olabilir). Doğrulama YAPILMADI.`);
    return 3;
  }
  const ihlaller = sozlesmeDenetle(sema, nesne);
  if (ihlaller.length === 0) {
    console.log(`✅ GEÇTİ — çıktı ${sozlesmeKod} sözleşmesine uygun.`);
    return 0;
  }
  console.log(`✖ KALDI — ${ihlaller.length} ihlal (${sozlesmeKod}):`);
  for (const i of ihlaller) console.log(`   • [${i.tür}] ${i.mesaj}`);
  return 4;
}

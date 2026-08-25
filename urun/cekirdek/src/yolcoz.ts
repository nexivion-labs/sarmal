// ═══════════════════════════════════════════════════════════════════════════
// yolcoz.ts — Yol Çözücü (Faz D2 · PLN-1)
//
//   TEK YOL GERÇEĞİ: bir düğümün kanonik disk yolu BURADA hesaplanır.
//   İskeletçi (üret) ve Denetçi (denetle) aynı çözücüyü kullanır →
//   üret ↔ denetle simetrisi (FEL-3 deep-mirror: kod=KANUN, klasör=ayna).
//
//   Kurallar:
//     • ad (yoksa kod) → ASCII kebap-case (ad-ihlali kapısının beklediği biçim)
//     • kaplar (temel/plan ailesi) → dizin · Adım → .md dosya
// ═══════════════════════════════════════════════════════════════════════════

import type { Dugum, Deger, Param } from "./sozdizim.ts";

/** ad → dosya adı: Türkçe'yi ASCII'ye indir; ayraç ALT-ÇİZGİ (DIL-1.2 ②).
 *  (Fonksiyon adı tarihsel — üretim 2026-07-11'den beri alt-çizgilidir.) */
export function kebaba(s: string): string {
  let r = "";
  for (const ch of s) r += ASCII[ch] ?? ch;
  return r.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "adsiz";
}

const ASCII: Record<string, string> = {
  "ç": "c", "Ç": "c", "ğ": "g", "Ğ": "g", "ı": "i", "I": "i", "İ": "i",
  "ş": "s", "Ş": "s", "ö": "o", "Ö": "o", "ü": "u", "Ü": "u",
};

/** Düğümün kendi dosya/dizin adı (ad → kod → tip sırasıyla). */
export function dosyaAdi(node: Dugum): string {
  const ham = paramMetni(node, "ad") ?? paramMetni(node, "kod") ?? node.ad;
  return kebaba(ham);
}

/** İki göreli yolu birleştirir (POSIX). */
export function birles(a: string, b: string): string {
  return a ? a + "/" + b : b;
}

// ── param yardımcıları (iskeletçiyle ortak) ──────────────────────────────────

export function paramBul(node: Dugum, ad: string): Param | undefined {
  return node.parametreler.find((p) => p.ad === ad);
}

export function paramMetni(node: Dugum, ad: string): string | undefined {
  const p = paramBul(node, ad);
  return p ? degerMetni(p.deger) : undefined;
}

export function degerMetni(d: Deger): string {
  if (d.tur === "liste") return (d.ogeler ?? []).map(degerMetni).join(", ");
  if (d.tur === "widget") return d.dugum ? `${d.dugum.ad}(…)` : "";
  if (d.tur === "harita") return "{ " + (d.ciftler ?? []).map((c) => `${c.ad}: ${degerMetni(c.deger)}`).join(", ") + " }";
  if (d.tur === "anahtar") return "#" + (d.metin ?? "");
  if (d.tur === "ifade") {
    if (d.islem === "değil") return `değil ${d.sag ? degerMetni(d.sag) : ""}`;
    return `${d.sol ? degerMetni(d.sol) : ""} ${d.islem} ${d.sag ? degerMetni(d.sag) : ""}`;
  }
  return d.metin ?? ""; // metin · kod · sayı · erişim
}

// ═══════════════════════════════════════════════════════════════════════════
// tema.ts — Tema içerik denetimi (D2 · DESIGN.md CLI deseni)
//
//   SNF-0 semaDenetle "renkler var mı" bakar; BURASI içeriğe bakar:
//     • geçersiz-renk : hex değil (#RGB / #RRGGBB) → hata
//     • düşük-kontrast: ana↔nötr WCAG AA (4.5:1) altında → uyarı (metin-zemin okunması)
//   Desen kaynağı: Google Stitch DESIGN.md CLI (kırık-token + WCAG kontrast) — ARAÇ
//   değil DESEN alındı (açık standart; desen ödünç alınır, bağlam alınmaz).
// ═══════════════════════════════════════════════════════════════════════════

import type { Program, Dugum, Deger } from "./sozdizim.ts";
import type { Tani } from "./tani.ts";
import { eskiTani } from "./tani-metinleri.ts";   // tanı cümlesi tek kaynakta yaşar (CDL-A02)

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** Program içindeki tüm Tema düğümlerinin renk tokenlarını denetler.
 *  BKM-BUG-A04 (bug-avı B3): gezinti parametre-değerlerine de iner —
 *  eskiden yalnız özellik-gömülü widget'lar görülüyordu, `Tema( renkler: {…} )`
 *  paranteziçi yazım bekçiden kaçıyordu (geçersiz hex "Drift yok" geçiyordu). */
export function temaDenetle(program: Program): Tani[] {
  const out: Tani[] = [];
  const degerde = (v: Deger): void => {
    if (v.dugum) gez(v.dugum);
    for (const o of v.ogeler ?? []) degerde(o);
    for (const c of v.ciftler ?? []) degerde(c.deger);
  };
  const gez = (d: Dugum): void => {
    if (d.tur === "widget" && d.ad === "Tema") temaBir(d, out);
    for (const c of d.cocuklar) gez(c);
    for (const p of [...d.parametreler, ...d.ozellikler]) degerde(p.deger);
  };
  for (const b of program.bildirimler) gez(b);
  return out;
}

function temaBir(d: Dugum, out: Tani[]): void {
  // A04: renkler HEM parametre HEM özellik yazılabilir (iki geçerli sözdizim) —
  // dogrulayici.alanDeger dersinin ayna hali; yalnız-özellik arama körlüğü kapandı.
  const renklerP = d.parametreler.find((o) => o.ad === "renkler") ??
                   d.ozellikler.find((o) => o.ad === "renkler");
  if (!renklerP || renklerP.deger.tur !== "harita") return;

  const renk = new Map<string, string>();
  for (const c of renklerP.deger.ciftler ?? []) {
    const v = c.deger.metin;
    if (v === undefined) continue;
    if (!HEX.test(v)) {
      out.push(eskiTani("geçersiz-renk", "hata", { ad: c.ad, deger: v }, { satir: c.satir, sutun: c.sutun }));
    } else {
      renk.set(c.ad, v);
    }
  }

  // WCAG AA: ana (metin) ↔ nötr (zemin) kontrastı okunabilir mi?
  const ana = renk.get("ana");
  const notr = renk.get("nötr");
  if (ana && notr) {
    const oran = kontrast(ana, notr);
    if (oran < 4.5) {
      const cift = (renklerP.deger.ciftler ?? []).find((c) => c.ad === "ana");
      out.push(eskiTani("düşük-kontrast", "uyarı", { oran: oran.toFixed(2) },
        { satir: cift?.satir ?? d.satir, sutun: cift?.sutun ?? d.sutun }));
    }
  }
}

// ── WCAG 2.x bağıl parlaklık + kontrast oranı ────────────────────────────────

function kontrast(a: string, b: string): number {
  const la = parlaklik(a);
  const lb = parlaklik(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

function parlaklik(hex: string): number {
  const [r, g, b] = rgb(hex);
  const f = (c: number): number => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function rgb(hex: string): [number, number, number] {
  let h = hex.slice(1);
  if (h.length === 3) h = h.split("").map((x) => x + x).join("");
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

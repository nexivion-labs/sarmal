// ═══════════════════════════════════════════════════════════════════════════
// dallar-cekirdek.ts — 🌳 Ağaç kılavuz çizgilerinin SAF çekirdeği (KPS-SIR-A02)
//
//   dallar.ts'nin ızgara mantığı vscode'suz burada yaşar; Node sınamasında
//   koşulabilir (sinama/dallar-cekirdek.test.ts).
//
//   SÜTUN YAPIDAN GELİR. Bağlaç sütunu eskiden düğümün yazıldığı sütundan
//   (girintiden) hesaplanıyordu; girintisi bozuk bir dosyada Katman, AltKatman
//   ve Adım aynı sütunda yazıldığında ağaç onları kardeş gibi çiziyor ve yapıyı
//   yanlış gösteriyordu. Sütun artık ayrıştırıcının verdiği derinlikten gelir:
//   derinliği d olan düğümün bağlacı (d − 1) × GENISLIK sütunundadır. Doğru
//   girintili dosyada iki hesap birebir aynı sonucu verir; bozuk girintiyi
//   ayrıca `girinti-yapı-uyumsuz` bilgi notu söyler (çekirdek dil denetçisi).
// ═══════════════════════════════════════════════════════════════════════════

import type { Program, Dugum } from "../../cekirdek/src/sozdizim.ts";

/** Seviye başına sütun (.sar girintisi = 2 boşluk). */
export const GENISLIK = 2;

/** Glif ızgarası: ızgara[satır][sütun] = "│" | "├" | "└" (satır sıfır tabanlı). */
export type Izgara = Map<number, Map<number, string>>;

function koy(g: Izgara, satır: number, sütun: number, glif: string, ezme = false): void {
  let sr = g.get(satır);
  if (!sr) { sr = new Map(); g.set(satır, sr); }
  if (ezme || !sr.has(sütun)) sr.set(sütun, glif);
}

/** Bir düğümün başlangıç satırı (0-tabanlı). */
function satırNo(d: Dugum): number { return Math.max(0, d.satir - 1); }

interface Kardeş { satır: number; derinlik: number; dugum?: Dugum; }

/** Düğümün çocukları: YAPISAL çocuklar + `raflar:{}` harita kısayolu (dosya-analojisi).
 *  Referans temizliği: attribute'lar (kod/durum/ne/görev…) ağaca GİRMEZ — yalnız
 *  yapısal düğümler + raflar (klasör→dosya gibi). Çok-satırlı değer içi kirlenmez. */
function çocuklar(d: Dugum, derinlik: number): Kardeş[] {
  const liste: Kardeş[] = d.cocuklar.map((c) => ({ satır: satırNo(c), derinlik, dugum: c }));
  for (const p of [...d.parametreler, ...d.ozellikler]) {
    if (p.deger.tur === "harita" && p.ad === "raflar") {
      for (const c of p.deger.ciftler ?? []) liste.push({ satır: Math.max(0, c.satir - 1), derinlik });
    }
  }
  return liste.sort((a, b) => a.satır - b.satır);
}

/** Kardeş grubunu ızgaraya döşe: ├/└ dallar + aralarında sürekli │.
 *  Bağlaç sütunu = (derinlik − 1) × GENISLIK; kökler (derinlik 0) işaretlenmez,
 *  yalnız içlerine inilir. */
function döşe(g: Izgara, kardeşler: Kardeş[]): void {
  kardeşler.forEach((n, i) => {
    const son = i === kardeşler.length - 1;
    const bs = (n.derinlik - 1) * GENISLIK;   // bağlaç sütunu — girintiden değil yapıdan
    if (bs >= 0) {
      koy(g, n.satır, bs, son ? "└" : "├", true);              // dal (│ üstüne ezer)
      if (!son) for (let ℓ = n.satır + 1; ℓ < kardeşler[i + 1].satır; ℓ++) koy(g, ℓ, bs, "│");
    }
    if (n.dugum) döşe(g, çocuklar(n.dugum, n.derinlik + 1));
  });
}

/** Programın dal ızgarası (saf). */
export function dalIzgarasi(program: Program): Izgara {
  const g: Izgara = new Map();
  döşe(g, program.bildirimler.map((b) => ({ satır: satırNo(b), derinlik: 0, dugum: b })));
  return g;
}

// ═══════════════════════════════════════════════════════════════════════════
// ray-sinyalleri.ts — 🚦 RAY SATIRINDAKİ DUR VE DİKKAT İŞARETİ (PNL-A21 · OZK-14 İKİNCİSİ · SAF)
//
//   Founder 2026-10-28 (OZK-14 ikincisi): Ray sekmesinde tanı taşıyan düğümün
//   satırında Dur ya da Dikkat işareti görünür ve işarete tıklamak Sinyaller
//   sekmesindeki satırlara götürür. Bu modül tanıları Ray düğümlerine dağıtır;
//   çizim panelde, sayılar Sinyaller'in kendi kayıtlarındadır.
//
//   TANIM ARALIĞI. Söz dizim ağacı düğümün bitiş satırını taşımaz; aralık bu yüzden
//   kardeşlerden kurulur: bir düğüm kendi satırından bir sonraki kardeşinin satırından
//   bir önceki satıra kadar uzanır, son kardeş üstünün sonuna kadar, dosyanın son
//   kök düğümü dosyanın sonuna kadar. Aralık BÜTÜN düğümlerden kurulur (Ray'de satırı
//   olmayan Kural, Kod, Hatırlatıcı gibi düğümler de); böylece Ray düğümünden sonra
//   gelen başka bir düğümün tanısı Ray düğümüne yazılmaz. Tanı, satırını kapsayan en
//   derin düğümden yukarı yürünerek ilk Ray düğümüne yazılır; hiçbir Ray düğümünün
//   içinde değilse işaret üretmez.
//
//   YALNIZ DUR VE DİKKAT. Bilgi düzeyindeki tanılar Ray'da işaret üretmez (sınır);
//   bant ayrımını çağıran yapar, bu modül verilen kayıtları dağıtır.
//
//   SAF: bu modül `vscode` İTHAL ETMEZ; nöbetler onu doğrudan koşturur.
// ═══════════════════════════════════════════════════════════════════════════

import type { Dugum, Program } from "../../cekirdek/src/sozdizim.ts";

/** Bir düğümün tanım aralığı (1 tabanlı satırlar, iki uç dahil) ve üst düğümü. */
export interface DugumAraligi {
  readonly dugum: Dugum;
  readonly bas: number;
  readonly son: number;
  readonly ust: DugumAraligi | undefined;
  readonly cocuklar: readonly DugumAraligi[];
}

/** Programın düğüm aralıkları (kök düğümler, iç içe çocuklarıyla). */
export function dugumAraliklari(program: Program): DugumAraligi[] {
  const kur = (dugumler: readonly Dugum[], son: number, ust: DugumAraligi | undefined): DugumAraligi[] => {
    const sirali = [...dugumler].sort((a, b) => a.satir - b.satir);
    return sirali.map((d, i) => {
      const sonraki = sirali[i + 1];
      const aralik: { dugum: Dugum; bas: number; son: number; ust: DugumAraligi | undefined; cocuklar: DugumAraligi[] } =
        { dugum: d, bas: d.satir, son: sonraki ? Math.max(d.satir, sonraki.satir - 1) : son, ust, cocuklar: [] };
      aralik.cocuklar = kur(d.cocuklar, aralik.son, aralik);
      return aralik;
    });
  };
  return kur(program.bildirimler, Number.POSITIVE_INFINITY, undefined);
}

/** Satırı kapsayan en derin düğüm aralığı; satır hiçbir düğümün içinde değilse tanımsız. */
export function enDerinAralik(araliklar: readonly DugumAraligi[], satir: number): DugumAraligi | undefined {
  const kapsayan = araliklar.find((a) => a.bas <= satir && satir <= a.son);
  return kapsayan ? (enDerinAralik(kapsayan.cocuklar, satir) ?? kapsayan) : undefined;
}

/**
 * Kayıtları Ray düğümlerine dağıtır: her kaydın satırını kapsayan en derin düğümden yukarı yürünür
 * ve ilk Ray düğümüne yazılır. Programı olmayan dosyanın ya da hiçbir Ray düğümünün içinde olmayan
 * kaydın işareti yoktur. Hiçbir kayıt iki düğüme yazılmaz.
 */
export function sinyalleriDagit<K extends { readonly dosya: string; readonly satir: number }>(
  kayitlar: readonly K[], program: (dosya: string) => Program | undefined, rayDugumu: (d: Dugum) => boolean,
): Map<Dugum, K[]> {
  const sonuc = new Map<Dugum, K[]>();
  const onbellek = new Map<string, DugumAraligi[]>();
  for (const k of kayitlar) {
    let araliklar = onbellek.get(k.dosya);
    if (!araliklar) {
      const p = program(k.dosya);
      araliklar = p ? dugumAraliklari(p) : [];
      onbellek.set(k.dosya, araliklar);
    }
    let a = enDerinAralik(araliklar, k.satir);
    while (a && !rayDugumu(a.dugum)) a = a.ust;
    if (!a) continue;
    const liste = sonuc.get(a.dugum) ?? sonuc.set(a.dugum, []).get(a.dugum)!;
    liste.push(k);
  }
  return sonuc;
}

/** Bir satırın işaret sayıları: Dur ve Dikkat. */
export interface SinyalIsareti {
  readonly dur: number;
  readonly dikkat: number;
}

/** Kayıtların Dur ve Dikkat sayıları. */
export function isaretSay(kayitlar: readonly { readonly bant: string }[]): SinyalIsareti {
  return { dur: kayitlar.filter((k) => k.bant === "dur").length, dikkat: kayitlar.filter((k) => k.bant === "dikkat").length };
}

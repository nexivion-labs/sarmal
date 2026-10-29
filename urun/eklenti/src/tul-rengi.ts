// ═══════════════════════════════════════════════════════════════════════════
// tul-rengi.ts — 🟣 TÜL DERİNLİĞİN MOR TONU (tek kaynak · SAF, vscode importsuz)
//
//   Editörün tül derinlik girinti boyası (girinti.ts, Founder 2026-10-21) tek renkte,
//   mor bir tüldür. Founder 2026-10-27 tarihinde panel ağaçlarının girinti çizgilerinin
//   de bu mor tonda olmasına hükmetmiştir (PNL-A04). İki yüzey aynı tonu buradan okur;
//   ikinci bir mor tanımı yazılmaz, yoksa iki ton zamanla birbirinden ayrışır.
//
//   Ton iki temaya göre ayrıdır: koyu temada açık bir mor, açık temada beyaz zeminde
//   kaybolmayan koyu bir mor. Saydamlık tonun parçası değildir; her yüzey kendi
//   kullanımına göre verir (tül zemini çok saydam, ince çizgi daha belirgin).
// ═══════════════════════════════════════════════════════════════════════════

/** Tül morunun iki tema tonu (kırmızı, yeşil, mavi). */
export const TUL_MORU = {
  koyu: [199, 146, 234],
  acik: [124, 77, 180],
} as const;

export type TulTemasi = keyof typeof TUL_MORU;

/** Tül morunu verilen saydamlıkla CSS rengi olarak yazar: `rgba(199,146,234,0.1)`. */
export function tulRengi(tema: TulTemasi, alfa: number): string {
  return `rgba(${TUL_MORU[tema].join(",")},${alfa})`;
}

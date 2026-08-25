// ═══════════════════════════════════════════════════════════════════════════
// nabiz.ts — 💓 TEK KALP ATIŞI + geciktirme (EKL-F9-A07/A08)
//
//   750ms toggle deseni yildiz.ts + takdir.ts'te İKİ ayrı setInterval olarak
//   yaşıyordu (çift-kayıt'ın kod hali). Artık tek kalp: abone ol, aynı ritimle
//   at — ilk abone kalbi başlatır, son abone durdurur. VIT-K78-A01 (hata lensi
//   nabzı) da buradan atacak; üçüncü kopya imkânsız.
//   `geciktir` = yildiz.ts'in 350ms bekletici deseni tek yardımcıda: tuş vuruşu
//   başına TEK hesap (EKL-F9-A07).
// ═══════════════════════════════════════════════════════════════════════════

export const KALP_ATISI_MS = 750;
export const GECIKTIRME_MS = 350;

type NabizAbonesi = (atis: boolean) => void;
const aboneler = new Set<NabizAbonesi>();
let atis = true;
let kalp: ReturnType<typeof setInterval> | undefined;

/** Tek kalbe abone ol — ilk abone kalbi başlatır, son abone durdurur. */
export function nabizAbone(cb: NabizAbonesi): { dispose(): void } {
  aboneler.add(cb);
  if (!kalp) {
    kalp = setInterval(() => {
      atis = !atis;
      for (const a of aboneler) a(atis);
    }, KALP_ATISI_MS);
  }
  return {
    dispose: () => {
      aboneler.delete(cb);
      if (!aboneler.size && kalp) { clearInterval(kalp); kalp = undefined; }
    },
  };
}

/** 350ms geciktirici — art arda çağrılar tek koşuya iner (son çağrı kazanır). */
export function geciktir(fn: () => void, ms = GECIKTIRME_MS): { cagir(): void; dispose(): void } {
  let bekletici: ReturnType<typeof setTimeout> | undefined;
  return {
    cagir: () => {
      if (bekletici) clearTimeout(bekletici);
      bekletici = setTimeout(fn, ms);
    },
    dispose: () => { if (bekletici) clearTimeout(bekletici); },
  };
}

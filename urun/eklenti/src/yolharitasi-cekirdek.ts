// ═══════════════════════════════════════════════════════════════════════════
// yolharitasi-cekirdek.ts — 🪆 VARLIK KÜMESİ ÇEKİRDEĞİ (EKL-F7-A09)
//
//   Founder hükmü (2026-08-24): yol haritasında varlıklar birbirini kapsayan
//   kümeler gibi görünür — kökte yalnız kapsayıcı durur, kapsananlar onun
//   altına iner. Bu dosya o ilişkinin vscode'suz saf çekirdeğidir; panel
//   (yolharitasi.ts) yalnız buradan okur ve birim nöbeti bu dosyayı sınar
//   (yolharitasi-hiyerarsi.test.ts). Dosya AİDİYET çözümüne dokunmaz: bir
//   dosyanın hangi varlığa ait olduğu yukarı yürüme ile (varlikBul) bulunur,
//   burada yalnız varlıkların birbirini kapsaması modellenir.
// ═══════════════════════════════════════════════════════════════════════════

/** Kök dizini `ust` kökünün altında kalan varlık, o kümenin içindedir. */
function onekIcinde(yol: string, ustKok: string): boolean {
  const onek = ustKok.endsWith("/") ? ustKok : ustKok + "/";
  return yol === ustKok || yol.startsWith(onek);
}

/** Her varlığı, kök dizinini önek olarak kapsayan EN DERİN diğer varlığa
 *  bağlar; üstü olmayan varlık küme köküdür. */
export function varlikUstleri<T extends { kokDizin: string }>(varliklar: readonly T[]): Map<T, T | undefined> {
  const usteBagla = new Map<T, T | undefined>();
  for (const v of varliklar) {
    let ust: T | undefined;
    for (const aday of varliklar) {
      if (aday === v || aday.kokDizin === v.kokDizin) continue;
      if (!onekIcinde(v.kokDizin, aday.kokDizin)) continue;
      if (!ust || aday.kokDizin.length > ust.kokDizin.length) ust = aday;
    }
    usteBagla.set(v, ust);
  }
  return usteBagla;
}

/** Varlık satırının simgesi tipine göre ayrışır (Founder 2026-08-25): kapsayan
 *  çalışma alanı İSTASYONDUR, kapsanan proje ile uygulama SEFERDİR — tren
 *  dilinde lokomotifler istasyonun çatısı altında yaşar. */
export function varlikSimgesi(tip: string): "istasyon" | "sefer" {
  return tip === "ÇalışmaAlanı" ? "istasyon" : "sefer";
}

/** Bir dosya yolunun yaşadığı EN DERİN varlık — iç içe köklerde ilk eşleşen
 *  değil en uzun önek kazanır; aktiflik nabzı yanlış kümeye vurmaz. */
export function enDerinVarlik<T extends { kokDizin: string }>(varliklar: readonly T[], yol: string): T | undefined {
  let secim: T | undefined;
  for (const v of varliklar) {
    if (!onekIcinde(yol, v.kokDizin)) continue;
    if (!secim || v.kokDizin.length > secim.kokDizin.length) secim = v;
  }
  return secim;
}

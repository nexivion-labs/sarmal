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

/**
 * Bir yol, verilen kökün KAPSAMINDA mı? Kökün kendisi de kapsama dâhildir.
 *
 * Sınır klasör ayracıdır ve bu bilerek böyledir: çıplak `startsWith` kullanılsa
 * "…-arsiv" gibi ad benzerliği taşıyan kardeş bir kök yanlışlıkla kapsanan
 * sayılırdı. Yol ayırıcıları karşılaştırma öncesinde eşitlenir ve sondaki ayırıcı
 * düşer; aksi hâlde aynı dizin iki farklı yazımla iki farklı kök sayılırdı.
 *
 * BU İŞLEV KAPSAMA İLİŞKİSİNİN TEK EVİDİR. Yol haritasındaki varlık kümeleri de,
 * panellerin aktif varlık süzgeci de (eklenti.panelDeGorunur) buradan okur.
 * İkinci bir kapsama kuralı yazılmaz: iki kural olsaydı biri sessizce bayatlar ve
 * yol haritası bir varlığı çatının altında gösterirken paneller onu gizlerdi.
 */
export function kapsamIcinde(yol: string, ustKok: string): boolean {
  const duzle = (y: string): string => y.replace(/\\/g, "/").replace(/\/+$/, "");
  const k = duzle(yol);
  const u = duzle(ustKok);
  return k === u || k.startsWith(`${u}/`);
}


/** Her varlığı, kök dizinini önek olarak kapsayan EN DERİN diğer varlığa
 *  bağlar; üstü olmayan varlık küme köküdür. */
export function varlikUstleri<T extends { kokDizin: string }>(varliklar: readonly T[]): Map<T, T | undefined> {
  const usteBagla = new Map<T, T | undefined>();
  for (const v of varliklar) {
    let ust: T | undefined;
    for (const aday of varliklar) {
      if (aday === v || aday.kokDizin === v.kokDizin) continue;
      if (!kapsamIcinde(v.kokDizin, aday.kokDizin)) continue;
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
    if (!kapsamIcinde(yol, v.kokDizin)) continue;
    if (!secim || v.kokDizin.length > secim.kokDizin.length) secim = v;
  }
  return secim;
}

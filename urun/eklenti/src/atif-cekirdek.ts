// ═══════════════════════════════════════════════════════════════════════════
// atif-cekirdek.ts — 🔗 Çözülen atıf SAF çekirdeği (NTK-A01 kapanış kalemi)
//
//   Link görünümünün karar mantığı vscode'suz tek yerde yaşar: hangi sözce
//   link işareti alır? Kural üç koşuldur: ① sözce KOD biçimindedir (tireli
//   BÜYÜK-harf kimlik) ② kimlik indeksinde TANIMI vardır (kırık atıf link
//   değildir — baglanti.ts ilkesi) ③ sözce tanımın kendisi değildir (tanım
//   satırındaki kod atıf sayılmaz). Kapsam bütün belge gövdesidir: parametre
//   değerleri, yorum satırları ve belge blokları (-->| |<--) dahil — desen
//   satır ayrımı yapmaz. Fikstürlü sınama: sinama/atif-ipucu.test.ts.
// ═══════════════════════════════════════════════════════════════════════════

/** KOD sözcesi: tireli BÜYÜK-harf kimlik (gezinme/ipucu ile aynı aile). */
export const KOD_DESENI = /[\p{Lu}][\p{Lu}\p{N}]*(?:-[\p{Lu}\p{N}]+)+/gu;

export interface AtifAraligi {
  satir: number;       // 0-tabanlı
  baslangic: number;   // sütun (dahil)
  bitis: number;       // sütun (hariç)
  kod: string;
}

/**
 * Belge satırlarında link işareti alacak atıfları bulur.
 * @param satirlar   belge satırları (0-tabanlı)
 * @param kodlar     kimlik indeksindeki TANIMLI kodlar
 * @param buradakiTanimlar bu belgedeki tanımlar — "KOD@satir" biçiminde (tanımın kendisi atıf değildir)
 */
export function atifAraliklariTopla(
  satirlar: readonly string[],
  kodlar: ReadonlySet<string>,
  buradakiTanimlar: ReadonlySet<string>,
): AtifAraligi[] {
  const araliklar: AtifAraligi[] = [];
  for (let s = 0; s < satirlar.length; s++) {
    for (const es of satirlar[s].matchAll(KOD_DESENI)) {
      const kod = es[0];
      if (!kodlar.has(kod)) continue;                       // tanımsız → link değil
      if (buradakiTanimlar.has(`${kod}@${s}`)) continue;    // tanımın kendisi → atıf değil
      araliklar.push({ satir: s, baslangic: es.index, bitis: es.index + kod.length, kod });
    }
  }
  return araliklar;
}

// ── VIT-GRAF-A14 · Çapraz-varlık BAKIŞ kararı ────────────────────────────────
//   Ölçülmüş kusur: dekor 2576 tanımlı kodun hepsini çiziyor, F12 varlık
//   süzgeci yüzünden 1245'ini ÇÖZEMİYOR (_Sarmal'dan BLK-ZKA gibi _KapaliUrun
//   kodları) — sözce süslü ama tıklama ölü. Adım hükmü: gezinme varlık sınırını
//   OKUR-YALNIZ aşar; bu bağımlılık değildir, yalnız bakıştır (STR-3 kod
//   bağımlılığını yasaklar, insan bakışını değil).

/**
 * Bir atfın ÇAPRAZ-VARLIK bakış hedefini seçer. SAF.
 * Kaynağın kendi varlığında (ya da köksüz bir dosyada) tanım varsa undefined
 * döner — o iş F12'nindir ve F12'nin mevcut çözümü AYNEN kalır. Yalnız F12'nin
 * yapısal olarak KÖR olduğu durumda (tüm tanımlar başka varlıkta) hedef döner.
 * @param tanimlar   kodun tanım konumları (dekorla AYNI evrenden gelmeli)
 * @param kaynakKok  kaynak belgenin varlık kökü (köksüzse undefined)
 * @param varlikKoku dosya → varlık kökü çözücüsü
 */
export function caprazAtifSec<T extends { dosya: string }>(
  tanimlar: readonly T[],
  kaynakKok: string | undefined,
  varlikKoku: (yol: string) => string | undefined,
): T | undefined {
  if (!tanimlar.length) return undefined;              // çözülmeyen kod link almaz (dürüst yüzey)
  if (!kaynakKok) return undefined;                    // köksüz kaynak: F12 zaten sınır çizmez
  const f12Gorur = tanimlar.some((t) => {
    const k = varlikKoku(t.dosya);
    return !k || k === kaynakKok;                      // köksüz dosya da F12'de görünür (MIM-1.1 deseni)
  });
  if (f12Gorur) return undefined;                      // F12 çözüyor — ikinci kapı açılmaz
  return tanimlar[0];                                  // tüm tanımlar öbür varlıkta → salt-okunur bakış
}

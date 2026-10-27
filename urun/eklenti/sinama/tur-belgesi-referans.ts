// ═══════════════════════════════════════════════════════════════════════════
// tur-belgesi-referans.ts — ⏱️ TUR EŞİTLİĞİ NÖBETİNİN BAŞVURU MODÜLÜ (PNL-A14)
//
//   Eşitlik nöbeti (tur-esitligi.test.ts) eklentiyi iki kez paketler: biri
//   üretim kaynağıdır, öteki `src/tur-belgesi.ts` yerine BU modülü koyar. Bu
//   modül gerçek modülün her şeyini olduğu gibi verir ve yalnız PNL-A14'ün
//   değiştirdiği iki davranışı DEĞİŞİKLİKTEN ÖNCEKİ hâliyle yeniden yazar:
//
//     · `turBelgeleriniTopla` dosyaları SIRAYLA okur; her okuma bir öncekinin
//       bitmesini bekler. Gövde, 030bd86 tabanındaki döngünün kendisidir.
//     · `taniAgaci` hiçbir zaman ağaç vermez; tek-dosya tanısı her belgenin
//       metnini eskisi gibi kendisi yeniden ayrıştırır.
//
//   Böylece başvuru paketi "değişiklikten önceki tur"dur ve üretim paketiyle
//   aynı gerçek ağaçta aynı çıktıyı vermek zorundadır. Başvuru eski davranışı
//   üretim kodunu çağırarak değil, eski gövdeyi taşıyarak kurar: üretimdeki
//   bir sıralama kusuru başvuruya sızamaz.
// ═══════════════════════════════════════════════════════════════════════════

import type { Program } from "../../cekirdek/src/sozdizim.ts";
import type { BelgeKabugu, BelgeSayacı, BelgeYuzu } from "../src/tur-belgesi.ts";

export * from "../src/tur-belgesi.ts";

/** Değişiklik öncesi toplama: okumalar sırayla, her biri bir öncekini bekler. */
export async function turBelgeleriniTopla(
  yollar: readonly string[],
  kabuk: BelgeKabugu,
): Promise<{ belgeler: Map<string, BelgeYuzu>; sayaç: BelgeSayacı; okunanBayt: number; dilDışı: string[] }> {
  const belgeler = new Map<string, BelgeYuzu>();
  const sayaç: BelgeSayacı = { açıktan: 0, diskten: 0, atlanan: 0 };
  let okunanBayt = 0;
  const dilDışı: string[] = [];
  for (const yol of yollar) {
    const açık = kabuk.açıkBelge(yol);
    if (açık) {
      if (kabuk.dilKimliği(yol) !== "sarmal") { sayaç.atlanan += 1; dilDışı.push(yol); continue; }
      if (kabuk.kaydedilmemisMi(yol)) {
        belgeler.set(yol, açık);
        sayaç.açıktan += 1;
        continue;
      }
    }
    const okunan = await kabuk.oku(yol);
    if (okunan === undefined) {
      if (açık) { belgeler.set(yol, açık); sayaç.açıktan += 1; continue; }
      sayaç.atlanan += 1;
      continue;
    }
    belgeler.set(yol, okunan.belge);
    sayaç.diskten += 1;
    okunanBayt += okunan.bayt;
  }
  return { belgeler, sayaç, okunanBayt, dilDışı };
}

/** Değişiklik öncesi tanı: ağaç hiç verilmez, tanı metni kendisi ayrıştırır. */
export function taniAgaci(): Program | undefined {
  return undefined;
}

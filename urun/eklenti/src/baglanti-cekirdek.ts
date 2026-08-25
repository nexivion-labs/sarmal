// ═══════════════════════════════════════════════════════════════════════════
// baglanti-cekirdek.ts — 🔗 Tıklanır yolların SAF çekirdeği (VIT-GRAF-A14)
//
//   Belge bağlantısı KARARI vscode'suz tek yerde yaşar: hangi sözce hangi
//   dosyaya link olur? İki katman vardır ve ikisi de aynı dürüstlük kuralına
//   bağlıdır (OLMAYAN dosyaya link üretilmez — kırık yol link değildir):
//     ① ALAN katmanı: referans:/yol:/dosya: değerinin TAMAMI bir yoldur;
//       uzantısız dizin yolları da burada yaşar (eski baglanti.ts davranışı).
//     ② ANLATI katmanı (VIT-GRAF-A14 ölçümü: 371 anlatı-içi yol sözcesinin
//       268'i diskte çözülüyordu ve HİÇBİRİ link değildi): ne/koşu/görev gibi
//       metinlerin İÇİNDE geçen uzantılı yol sözceleri de link olur; isteğe
//       bağlı :satır eki hedef satıra iner (sozlesme.ts:106 gibi).
//   Model kimliği gibi yol GÖRÜNÜMLÜ ama diskte olmayan sözceler (örn.
//   deepseek-ai/deepseek-v4-pro) çözülemedikleri için kendiliğinden dışarıda
//   kalır — ayrı bir kara liste gerekmez.
//   Fikstürlü sınama: sinama/baglanti-atif.test.ts.
// ═══════════════════════════════════════════════════════════════════════════

import { existsSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import type { Deger, Dugum } from "../../cekirdek/src/sozdizim.ts";

/** Yol taşıyan alan adları — dar ve bilinçli (her metin alanı yol değildir). */
export const YOL_ALANLARI = new Set(["referans", "yol", "dosya"]);

/**
 * Beyan edilmiş bir yolu verilen köklerden çözer; OLMAYAN dosya çözülmez.
 * VIT-GRAF-A12 ile dışa açıldı (Mini Grafın boş camı aynı soruyu sorar);
 * VIT-GRAF-A14 ile saf çekirdeğe indi. Yeni tarama açmaz: yalnız varlık yoklar.
 */
export function yolCozumleyici(kokler: readonly string[]): (yol: string) => string | undefined {
  return (yol: string): string | undefined => {
    if (!yol || yol.includes("\n")) return undefined;
    if (isAbsolute(yol)) return existsSync(yol) ? yol : undefined;
    for (const kok of kokler) {
      const tam = join(kok, yol);
      if (existsSync(tam)) return tam;
    }
    return undefined;
  };
}

/** Anlatı-içi yol sözcesi: ≥2 bölütlü, UZANTILI, isteğe bağlı :satır ekli.
 *  Uzantı şartı bilinçlidir — düz yazıdaki "ve/veya" gibi bölü içeren sözceler
 *  ile tarih benzeri desenler yol sanılmasın; dizin yolları ① katmanının işidir. */
export const ANLATI_YOL_DESENI = /[\p{L}\p{N}_.@~-]+(?:\/[\p{L}\p{N}_.@~-]+)+\.[A-Za-z]{1,6}(?::\d+)?/gu;

/** Karar çıktısı: belge içinde tam konumlu, diskte VAR olan bir bağlantı. */
export interface YolLinki {
  satir: number;        // 0-tabanlı belge satırı
  baslangic: number;    // sütun (dahil)
  bitis: number;        // sütun (hariç)
  hedef: string;        // çözülmüş mutlak yol
  hedefSatiri?: number; // :satır ekinden gelen 1-tabanlı hedef satırı
  metin: string;        // belgede görünen sözce (ipucu metni için)
}

/**
 * Bir belgenin AST'sinden tıklanır yol bağlantılarını toplar. SAF.
 * @param bildirimler ayrıştırılmış belge
 * @param satirlar    belge satırları (0-tabanlı) — sözcenin tam sütunu buradan bulunur
 * @param cozumle     yol çözücü (yolCozumleyici ürünü) — undefined dönerse link YOK
 */
export function yolLinkleriTopla(
  bildirimler: readonly Dugum[],
  satirlar: readonly string[],
  cozumle: (yol: string) => string | undefined,
): YolLinki[] {
  const linkler: YolLinki[] = [];
  const kapli = new Set<string>();   // "satir:baslangic" — iki katman aynı sözceyi teklemesin

  const ekle = (satir0: number, baslangic: number, metin: string, hedef: string, hedefSatiri?: number): void => {
    const anahtar = `${satir0}:${baslangic}`;
    if (kapli.has(anahtar)) return;
    kapli.add(anahtar);
    linkler.push({ satir: satir0, baslangic, bitis: baslangic + metin.length, hedef, hedefSatiri, metin });
  };

  // ① ALAN katmanı: değerin tamamı yol (uzantısız dizinler dahil).
  const alanDegeri = (d: Deger): void => {
    if (d.tur === "metin" && d.metin) {
      const hedef = cozumle(d.metin);
      if (hedef) {
        // Değer konumu tırnağı gösterebilir — içeriğin tam yerini satırdan bul.
        const satirMetni = satirlar[d.satir - 1] ?? "";
        const idx = satirMetni.indexOf(d.metin, Math.max(0, d.sutun - 2));
        if (idx >= 0) ekle(d.satir - 1, idx, d.metin, hedef);
      }
    } else if (d.tur === "liste") {
      d.ogeler?.forEach(alanDegeri);
    }
  };

  // ② ANLATI katmanı: HER metin değerinin içindeki uzantılı yol sözceleri.
  //   Çok satırlı değerde sözcenin belge satırı, değerin kendi satır sayımından
  //   bulunur; belge satırında sözce yoksa (kaçış/katlama) dürüstçe atlanır.
  const anlatiDegeri = (d: Deger): void => {
    if (d.tur === "metin" && d.metin) {
      const parcalar = d.metin.split("\n");
      // Üç tırnaklı metinde açılış tırnağından sonraki satır sonu içerikten
      // DÜŞER: içeriğin ilk satırı, değer konumunun satırında bulunamıyorsa
      // içerik bir satır aşağıda başlıyordur (ayrıştırıcı davranışı — ölçüldü).
      const kayma = parcalar.length > 1 && parcalar[0]
        && (satirlar[d.satir - 1] ?? "").indexOf(parcalar[0], Math.max(0, d.sutun - 2)) < 0 ? 1 : 0;
      for (let i = 0; i < parcalar.length; i++) {
        const belgeSatiri = d.satir - 1 + kayma + i;
        const satirMetni = satirlar[belgeSatiri];
        if (satirMetni === undefined) continue;
        for (const es of parcalar[i].matchAll(ANLATI_YOL_DESENI)) {
          const ham = es[0];
          const ekIdx = ham.search(/:\d+$/);
          const yol = ekIdx >= 0 ? ham.slice(0, ekIdx) : ham;
          const hedef = cozumle(yol);
          if (!hedef) continue;   // çözülmeyen sözce link değildir (dürüst yüzey)
          const idx = satirMetni.indexOf(ham, i === 0 ? Math.max(0, d.sutun - 2) : 0);
          if (idx < 0) continue;
          const hedefSatiri = ekIdx >= 0 ? Number(ham.slice(ekIdx + 1)) : undefined;
          ekle(belgeSatiri, idx, ham, hedef, hedefSatiri);
        }
      }
    }
    d.ogeler?.forEach(anlatiDegeri);
    d.ciftler?.forEach((c) => anlatiDegeri(c.deger));
  };

  const gez = (n: Dugum): void => {
    for (const p of [...n.parametreler, ...n.ozellikler]) {
      if (YOL_ALANLARI.has(p.ad)) alanDegeri(p.deger);
      anlatiDegeri(p.deger);
      if (p.deger.dugum) gez(p.deger.dugum);
    }
    n.cocuklar.forEach(gez);
  };
  bildirimler.forEach(gez);
  return linkler;
}

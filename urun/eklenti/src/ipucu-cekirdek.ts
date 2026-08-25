// ═══════════════════════════════════════════════════════════════════════════

import { kararMetniIpucuEki } from "./yuzey-metinleri.ts";
// ipucu-cekirdek.ts — 💡 İpucu SAF çekirdeği (NTK-A01 kapanış kalemi)
//
//   Hover penceresinin veri mantığı vscode'suz tek yerde yaşar:
//   ① kodTanimlariTara — bir .sar metnindeki `kod: X` bildirimlerini bulur;
//     Karar düğümlerinde HÜKMÜ de yakalar (K-XX atfına gelen kullanıcı, hükmü
//     dosya açmadan ipucu penceresinde okur — Founder isteği).
//   ② kararMetniEki — hüküm ipucu metnine iner: etiket kendini açıklar,
//     başlıkla aynıysa yinelenmez, okunur uzunlukta kesilir.
//   ③ blokIcindeMi — imleç -->| |<-- belge bloğunun içinde mi (karakter
//     hassas): blok içinde parametre/tip ipuçları susar, KOD atfı istisnadır.
//   Fikstürlü sınama: sinama/atif-ipucu.test.ts.
// ═══════════════════════════════════════════════════════════════════════════

export interface KodTanimi { kod: string; satir: number; tip: string; ne: string; hukum?: string; ozet?: string }

/** Bir .sar metnindeki `kod: X` bildirimlerini satır satır tarar (ilk kazanan — dedup çağırandadır). */
export function kodTanimlariTara(metin: string): KodTanimi[] {
  const tanimlar: KodTanimi[] = [];
  const satirlar = metin.split("\n");
  for (let i = 0; i < satirlar.length; i++) {
    const es = /([\p{L}][\p{L}\p{N}_]*)\(\s*(?:[^)]*?\s)?kod:\s*([\p{Lu}][\p{Lu}\p{N}-]*)/u.exec(satirlar[i]);
    if (!es) continue;
    let ne = /\bne:\s*"([^"]*)"/u.exec(satirlar[i])?.[1] ?? "";
    for (let j = i + 1; !ne && j < Math.min(i + 8, satirlar.length); j++)
      ne = /\bne:\s*"([^"]*)"/u.exec(satirlar[j])?.[1] ?? "";
    // NTK-A01: Karar düğümünün HÜKMÜ de yakalanır — ipucu penceresi hükmü dosya açmadan gösterir.
    // NTK-A09: ÖZET de yakalanır — özet taşıyan kararın ipucusu ÖNCE özeti gösterir
    // (bağlamsız-okunur tek paragraf; ham hüküm tarihçe olarak altta kalır).
    let hukum: string | undefined;
    let ozet: string | undefined;
    if (es[1] === "Karar") {
      for (let j = i; j < Math.min(i + 16, satirlar.length); j++) {
        if (!hukum) hukum = /\bkarar:\s*"([^"]*)"/u.exec(satirlar[j])?.[1];
        // \b Türkçe harfte çalışmaz (ö kelime-dışı sayılır) — harf-öncesi lookbehind kullanılır
        if (!ozet) ozet = /(?<![\p{L}\p{N}_])özet:\s*"([^"]*)"/u.exec(satirlar[j])?.[1];
        if (hukum && ozet) break;
      }
    }
    tanimlar.push({ kod: es[2], satir: i, tip: es[1], ne, hukum, ozet });
  }
  return tanimlar;
}

/** Kararın hüküm metni ipucu penceresine iner — başlıkla aynıysa yinelenmez, 420 karakterde
 *  kesilir. NTK-A09: özet varsa ÖNCE özet gösterilir (bağlamsız-okunur paragraf); ham hüküm
 *  tarihçe olarak altında kalır. */
export function kararMetniEki(kayit: { ne: string; hukum?: string; ozet?: string }): string {
  const kes = (m: string): string => (m.length > 420 ? m.slice(0, 420) + "…" : m);
  return kararMetniIpucuEki(
    kayit.ozet ? kes(kayit.ozet) : undefined,
    kayit.hukum && kayit.hukum !== kayit.ne ? kes(kayit.hukum) : undefined,
  );
}

// ── VIT-GRAF-A14 · AST yedeği ────────────────────────────────────────────────
//   Ölçülmüş kusur: satır-regex'li kodTanimlariTara, widget açılışıyla `kod:`
//   AYRI satırlarda yazılmış 297 tanımı (2353 AST tanımının %13'ü) kaçırıyor —
//   Founder o kodların üstüne gelince ipucu penceresi BOŞ kalıyordu. Yedek,
//   ayrıştırıcının gördüğünü kullanır (dugumBaglami — kimlik.ts, DIL-2 tek
//   çekirdek); yalnız regex kaçırdığında devreye girer, davranış eklemesi
//   dışında hiçbir mevcut ipucu değişmez.

import { dugumBaglami } from "../../cekirdek/src/kimlik.ts";

/** Bir kaynak metinde kodun AST-tabanlı özeti: tip + ad + ne (kırıkta undefined). SAF. */
export function tanimOzetiCikar(metin: string, kod: string): { tip: string; ad?: string; ne?: string } | undefined {
  const baglam = dugumBaglami(metin, kod);
  if (!baglam) return undefined;
  const ne = baglam.alanlar.find(([alan]) => alan === "ne")?.[1];
  return { tip: baglam.dugum.tip, ad: baglam.dugum.ad, ne };
}

/** İmleç bir -->| ... |<-- belge bloğunun İÇİNDE mi? (karakter hassas) */
export function blokIcindeMi(satirlar: readonly string[], satir: number, sutun: number): boolean {
  let icerde = false;
  for (let s = 0; s <= satir && s < satirlar.length; s++) {
    const metin = satirlar[s];
    const sinir = s === satir ? sutun : metin.length;
    let j = 0;
    while (j < sinir) {
      if (!icerde) {
        const ac = metin.indexOf("-->|", j);
        if (ac === -1 || ac >= sinir) break;
        icerde = true; j = ac + 4;
      } else {
        const kapa = metin.indexOf("|<--", j);
        if (kapa === -1 || kapa >= sinir) break;
        icerde = false; j = kapa + 4;
      }
    }
  }
  return icerde;
}

// ═══════════════════════════════════════════════════════════════════════════
// emoji-yuz.ts — 🌍 Emoji yüzü SAF çekirdeği (EMJ-A03)
//
//   Editör yüzlerinin (tamamlama · ipucu · biçimlendirici) emoji sözdizimi
//   mantığı vscode'suz tek yerde yaşar; kaynak-kanon çekirdekteki
//   emoji-yazim.ts'dir (EMJ-A02) — burada tablo İCAT EDİLMEZ, ters yüzü kurulur:
//   ① AD_EMOJI — kanonik ad → emoji (yazım yüzü üretimi: tamamlama emoji
//     yüzlü belgeye emoji ekler, Türkçe belgeye eşdeğeri bilgi olarak gösterir);
//   ② emojiSozceCoz — bir emoji sözcesi kanonda mı, hangi bölümde (kademe ·
//     parametre · durum) — ipucu baloncuğu buradan konuşur;
//   ③ emojiYuzuMu — belge hangi yazım yüzüyle yazılmış (yüz algısı): kanon
//     emojisi YAZIM konumunda (kademe+"(" ya da parametre+":") geçiyorsa emoji
//     yüzü. Dizgi/yorum/belge bloğu İÇERİKTİR, yüz algısına karışmaz;
//   ④ yazimDisiMi — verilen konum dizgi/yorum/belge-bloğu içinde mi: içerik
//     emojisine kanon baloncuğu BASILMAZ (EMJ-A02: içerik korunur ilkesi).
//   Fikstürlü sınama: sinama/emoji-yuz.test.ts.
// ═══════════════════════════════════════════════════════════════════════════

import {
  EMOJI_TIPLER, EMOJI_PARAMETRELER, EMOJI_DURUMLAR,
} from "../../cekirdek/src/emoji-yazim.ts";

export type EmojiBolum = "kademe" | "parametre" | "durum";

/** Ters eşleme: kanonik Türkçe ad → kanon emojisi (varyasyon seçicili asıl yazım). */
export const AD_EMOJI: ReadonlyMap<string, string> = (() => {
  const m = new Map<string, string>();
  for (const tablo of [EMOJI_TIPLER, EMOJI_PARAMETRELER, EMOJI_DURUMLAR]) {
    for (const [emoji, ad] of Object.entries(tablo)) m.set(ad, emoji);
  }
  return m;
})();

/** Kanonik adın emoji eşdeğeri — kanonda yoksa undefined (her adın emojisi yok). */
export function emojiKarsiligi(ad: string): string | undefined {
  return AD_EMOJI.get(ad);
}

/** Emoji sözcesi kanonda mı? Varsa kanonik adı ve bölümünü döndürür (seçicisiz yazım tolere edilir). */
export function emojiSozceCoz(sozce: string): { ad: string; bolum: EmojiBolum } | undefined {
  const dene = (tablo: Record<string, string>, bolum: EmojiBolum) => {
    for (const [emoji, ad] of Object.entries(tablo)) {
      if (emoji === sozce || emoji.replace(/️/gu, "") === sozce) return { ad, bolum };
    }
    return undefined;
  };
  return dene(EMOJI_TIPLER, "kademe") ?? dene(EMOJI_PARAMETRELER, "parametre") ?? dene(EMOJI_DURUMLAR, "durum");
}

/** İpucu için emoji yakalama deseni: en uzun sözce önce (çok-kod-noktalı gölgelenmesin),
 *  seçicisiz biçimler dahil. getWordRangeAtPosition bu desenle emoji aralığını bulur. */
export function emojiDeseni(): RegExp {
  const sozceler = new Set<string>();
  for (const tablo of [EMOJI_TIPLER, EMOJI_PARAMETRELER, EMOJI_DURUMLAR]) {
    for (const emoji of Object.keys(tablo)) {
      sozceler.add(emoji);
      sozceler.add(emoji.replace(/️/gu, ""));
    }
  }
  const govde = [...sozceler].sort((a, b) => b.length - a.length).join("|");
  return new RegExp(`(?:${govde})`, "u");
}

/**
 * Belgenin YAZIM YÜZÜ emoji mi? — kanon emojisi yazım konumunda geçiyorsa evet:
 * kademe emojisi + "(" (🍃( …) ya da parametre emojisi + ":" (🆔: …).
 * Dizgi/yorum/belge-bloğu içerikleri soyulduktan sonra bakılır — içerikteki
 * emoji (bu repoda her ne: alanı emojiyle başlar) yüz algısını YANILTMAZ.
 */
export function emojiYuzuMu(metin: string): boolean {
  const soyulmus = yazimDisiSoy(metin);
  for (const emoji of Object.keys(EMOJI_TIPLER)) {
    if (new RegExp(`${desenKac(emoji)}️?\\s*\\(`, "u").test(soyulmus)) return true;
  }
  for (const emoji of Object.keys(EMOJI_PARAMETRELER)) {
    if (new RegExp(`${desenKac(emoji)}️?\\s*:`, "u").test(soyulmus)) return true;
  }
  return false;
}

/** Regex özel karakterlerini etkisizleştirir (emoji sözceleri güvenli olsa da ilkesel). */
function desenKac(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/️/gu, "");
}

/**
 * Yazım-dışı bölgelerin İÇERİĞİNİ soyar (dizgi · yorum · belge bloğu) — geriye
 * yalnız gerçek YAZIM kalır. emojiYuzuMu yüz algısını bu soyulmuş metinde yapar:
 * içerikteki emoji (bu repoda her ne: alanı emojiyle başlar) yüzü yanıltamaz.
 */
export function yazimDisiSoy(metin: string): string {
  let out = "";
  let i = 0, blokYorum = false, ucluDizgi = false, belgeBlok = false;
  while (i < metin.length) {
    if (belgeBlok) { const k = metin.indexOf("|<--", i); if (k === -1) break; belgeBlok = false; i = k + 4; continue; }
    if (blokYorum) { const k = metin.indexOf("*/", i); if (k === -1) break; blokYorum = false; i = k + 2; continue; }
    if (ucluDizgi) { const k = metin.indexOf('"""', i); if (k === -1) break; ucluDizgi = false; i = k + 3; continue; }
    if (metin.startsWith("-->|", i)) { belgeBlok = true; i += 4; continue; }
    if (metin.startsWith("/*", i)) { blokYorum = true; i += 2; continue; }
    if (metin.startsWith("//", i)) { const k = metin.indexOf("\n", i); if (k === -1) break; i = k; continue; }
    if (metin.startsWith('"""', i)) { ucluDizgi = true; i += 3; continue; }
    if (metin[i] === '"') {
      i++;
      while (i < metin.length && metin[i] !== '"') { if (metin[i] === "\\") i++; i++; }
      i++; continue;
    }
    out += metin[i]; i++;
  }
  return out;
}

/**
 * Verilen konum yazım-DIŞI bölgede mi: dizgi (tek ve üçlü) · yorum (satır ve blok) ·
 * belge bloğu (-->| … |<--). Bu bölgelerdeki emoji İÇERİKTİR — kanon anlamı taşımaz.
 * Tarama belirteçleyicinin kurallarını aynalar (dizgi kaçışı dahil), konuma dek yürür.
 */
export function yazimDisiMi(satirlar: readonly string[], satir: number, sutun: number): boolean {
  let blokYorum = false, ucluDizgi = false, belgeBlok = false;
  for (let s = 0; s <= satir && s < satirlar.length; s++) {
    const metin = satirlar[s];
    const sinir = s === satir ? sutun : metin.length;
    let j = 0;
    while (j < sinir) {
      if (belgeBlok) {
        const kapa = metin.indexOf("|<--", j);
        if (kapa === -1 || kapa >= sinir) { j = sinir; break; }
        belgeBlok = false; j = kapa + 4; continue;
      }
      if (blokYorum) {
        const kapa = metin.indexOf("*/", j);
        if (kapa === -1 || kapa >= sinir) { j = sinir; break; }
        blokYorum = false; j = kapa + 2; continue;
      }
      if (ucluDizgi) {
        const kapa = metin.indexOf('"""', j);
        if (kapa === -1 || kapa >= sinir) { j = sinir; break; }
        ucluDizgi = false; j = kapa + 3; continue;
      }
      if (metin.startsWith("-->|", j)) { belgeBlok = true; j += 4; continue; }
      if (metin.startsWith("/*", j)) { blokYorum = true; j += 2; continue; }
      if (metin.startsWith("//", j)) {                       // satır sonuna dek yorum
        if (s === satir) return true;                        // konum yorumun içinde (j < sutun garantili)
        break;                                               // sonraki satıra geç — durum sıfır
      }
      if (metin.startsWith('"""', j)) { ucluDizgi = true; j += 3; continue; }
      if (metin[j] === '"') {           // tek satır dizgi (kaçış destekli)
        let k = j + 1;
        while (k < metin.length && metin[k] !== '"') { if (metin[k] === "\\") k++; k++; }
        if (s === satir && sutun > j && sutun <= k) return true;
        j = k + 1; continue;
      }
      j++;
    }
  }
  return blokYorum || ucluDizgi || belgeBlok;
}

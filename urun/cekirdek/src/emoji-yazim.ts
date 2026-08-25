// ═══════════════════════════════════════════════════════════════════════════
// emoji-yazim.ts — 🌍 Emoji takma-adları (EMJ-A02)
//
//   Founder-onaylı emoji kanonu (nitelik/emoji_kanon_taslagi.sar · EMJ-A01):
//   her emoji, karşılık geldiği Türkçe yazımın EŞDEĞER takma adıdır. Belirteçleyici
//   bu tabloyla TEK YÖNLÜ normalleştirir (emoji → kanonik ad) — iki yüz (Türkçe
//   ve emoji) aynı düğüm grafını üretir; karışık yazım serbesttir.
//
//   Kaynak-gerçek KANON: oz/siniflama/kayit.json "emojiYazimi" bölümü. Buradaki
//   tablo onun çekirdek eşidir (belirteçleyici dosya okumaz — bağımlılıksız
//   kalır); eşitlik NÖBETLE korunur (durumGecisleri YEDEK deseni:
//   sinama/emoji-yazim.test.ts kanonla bire bir karşılaştırır).
//
//   Tek-anlam kuralı (DIL-4): bir emoji tek kavrama bağlıdır — ✅ yalnız kabul
//   (tamamlandı 🏁), ☘️ yalnız AltKatman yazımı (görünüm 🌿 kalır).
// ═══════════════════════════════════════════════════════════════════════════

/** Kanonun üç bölümü — kayit.json emojiYazimi ile bire bir (eşitlik nöbetli). */
export const EMOJI_TIPLER: Record<string, string> = {
  "🌀": "Faz", "🪵": "Blok", "🌿": "Katman", "☘️": "AltKatman",
  "🍃": "Adım", "🔁": "Döngü", "🚪": "Kapı",
};

export const EMOJI_PARAMETRELER: Record<string, string> = {
  "🆔": "kod", "🏷️": "ad", "❓": "ne", "🛠️": "görev", "✅": "kabul",
  "🚧": "sınır", "🔗": "bağımlı", "🍎": "üretir", "📖": "referans",
  "🏃": "koşu", "🚦": "durum", "🔔": "hatırlat", "📞": "çağır",
  "🧰": "kullanır", "🧭": "uygular", "💪": "sağlar",
};

export const EMOJI_DURUMLAR: Record<string, string> = {
  "⏳": "beklemede", "🔨": "geliştirmede", "🏁": "tamamlandı", "⛔": "bloklu",
};

/**
 * Düz arama tablosu: emoji sözcesi → kanonik ad. Üç bölüm tek-anlam kuralı
 * gereği çakışmasız birleşir. Varyasyon seçicili (U+FE0F) yazımların seçicisiz
 * biçimi de tanınır (klavye/işletim sistemi farkları emoji yüzünü kırmasın).
 */
export const EMOJI_TAKMA: ReadonlyMap<string, string> = (() => {
  const m = new Map<string, string>();
  for (const tablo of [EMOJI_TIPLER, EMOJI_PARAMETRELER, EMOJI_DURUMLAR]) {
    for (const [emoji, ad] of Object.entries(tablo)) {
      m.set(emoji, ad);
      const seciciSiz = emoji.replace(/️/gu, "");
      if (seciciSiz !== emoji && !m.has(seciciSiz)) m.set(seciciSiz, ad);
    }
  }
  return m;
})();

/** En uzun eşleşme önce denenir (çok-kod-noktalı emojiler tek-kod-noktalıları gölgelemesin). */
export const EMOJI_SOZCELER: readonly string[] =
  [...EMOJI_TAKMA.keys()].sort((a, b) => b.length - a.length);

/** Kaynakta i konumunda bir emoji takma-adı var mı? Varsa sözceyi ve kanonik adı döndürür. */
export function emojiEsle(kaynak: string, i: number): { sozce: string; ad: string } | undefined {
  for (const sozce of EMOJI_SOZCELER) {
    if (kaynak.startsWith(sozce, i)) return { sozce, ad: EMOJI_TAKMA.get(sozce)! };
  }
  return undefined;
}

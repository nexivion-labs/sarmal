// ═══════════════════════════════════════════════════════════════════════════
// icindekiler.ts — MD içindekiler bloğu çekirdeği (`sarmal icindekiler`)
//
//   Eski KARARLAR defteri md-yüzü üreticisinden (kararlar.ts) devralındı. Defter
//   bugün repo İÇİNDE, `arsiv/omurga-v0-yasa/kararlar/` rafında yaşar; arşive
//   inince üreticisi emekli oldu ve jenerik içindekiler çekirdeği burada yaşamaya
//   devam eder. `### ` başlık
//   satırlarından GitHub-uyumlu çapalarla içindekiler bloğu üretir; komut ve
//   her tüketici TEK algoritmayı paylaşır (iki yüz ayrışamaz).
// ═══════════════════════════════════════════════════════════════════════════

const TOC_BAS = "<!-- SARMAL:ICINDEKILER -->";
const TOC_SON = "<!-- /SARMAL:ICINDEKILER -->";

/** `### ` başlık metninden GitHub-uyumlu çapa (slug) üretir — İçindekiler ve
 *  tüketici yüzler TEK algoritmayı paylaşır (iki yüz ayrışamaz). */
export function kancaSlug(metin: string): string {
  return metin.toLowerCase()
    .replace(/[·]/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim().replace(/\s+/g, "-");
}

/** `### ` başlıklarından içindekiler bloğu üretir — `sarmal icindekiler`
 *  komutunun çekirdeği (kanca/slug birebir; iki yüz ayrışamaz). */
export function icindekilerBloku(icerik: string): string {
  const basliklar = icerik.split("\n").filter((s) => s.startsWith("### "));
  const madde = (b: string): string => {
    const metin = b.slice(4).trim();
    return `- [${metin}](#${kancaSlug(metin)})`;
  };
  return [
    TOC_BAS,
    `## 📑 İçindekiler (${basliklar.length} başlık — üretilir: \`sarmal icindekiler\`)`,
    "",
    ...basliklar.map(madde),
    TOC_SON,
  ].join("\n");
}

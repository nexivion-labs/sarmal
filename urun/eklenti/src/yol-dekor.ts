// ═══════════════════════════════════════════════════════════════════════════
// yol-dekor.ts — 🎨 YUZ-4 dekorasyon KARARI (SAF — vscode importsuz)
//
//   Yol Haritası satır renginin ve blokaj rozetinin TEK karar noktası.
//   yolharitasi.ts yalnız vscode kabuğunu sarar (giydir-ayar deseninin
//   panel ikizi); node:test bu modülü DOĞRUDAN koşar — Terra-RED onarımı:
//   nöbet metin-avcılığından davranış sınamasına terfi etti (TUR-1 kabulü).
//
//   PANEL RENGİ BURADA BİTER. Bildirimler yüzeyinin satır rozetleri de bu
//   dosyada yaşar; ikinci bir palet kurulmaz ve hiçbir yüzeye ham renk
//   değeri yazılmaz. Her rozet yalnız bir TEMA ROLÜ adı taşır, değeri
//   kullanıcının temasından gelir.
// ═══════════════════════════════════════════════════════════════════════════

import type { Tani } from "../../cekirdek/src/tani.ts";
import { bildirimRozetMetni, blokluAdimIpucu } from "./yuzey-metinleri.ts";
import type { AnlamRengi, SatirSimgesi } from "./simge-cizelgesi.ts";

/** Adım durum enum'u (kanon ortakEnum ikizi — cekirdek/durum.ts ile aynı dil ·
 *  YAS-4: doğrulanmamış = iş teslim, bağımsız kanıt yok). */
export type Durum = "beklemede" | "geliştirmede" | "tamamlandı" | "doğrulanmamış" | "bloklu";

// YUZ-4 ③: Adım ikonu ŞEKİL-durumlu (renk-körü yedeği) — boş daire → dönen
// sync → dolu kutu (tamamlandı'da ikon çizilmez, kutu yeter) → circle-slash.
// YAS-4: doğrulanmamış = BOŞ çek (pass) turuncu — dolu yeşil çekten şekil+renkle ayrılır.
// TreeItem ikonu hex alamaz (VS Code API kısıtı) → tema-token kullanılır.
export const DURUM_ROZET: Record<Durum, { emoji: string; ikon: string; renk: string }> = {
  "tamamlandı":    { emoji: "🟢", ikon: "pass-filled",          renk: "testing.iconPassed" },
  "geliştirmede":  { emoji: "🟡", ikon: "sync~spin",            renk: "charts.yellow" },
  "beklemede":     { emoji: "⚪", ikon: "circle-large-outline", renk: "disabledForeground" },
  "doğrulanmamış": { emoji: "🟠", ikon: "pass",                 renk: "charts.orange" },
  "bloklu":        { emoji: "⛔", ikon: "circle-slash",         renk: "errorForeground" },
};

/** Durum → satır simgesinin ANLAM rengi (VIT-KIMLIK-A05): Yol Haritası'nın
 *  kenar-düğüm noktaları geometrik aileye geçince DURUM_ROZET'in ThemeColor
 *  rolleri üreticinin anlam eksenine burada, TEK noktada çevrilir. Eşleme
 *  rozetin bugünkü renkleriyle birebirdir — anlam kaybı yasak (YUZ-4.1). */
export const DURUM_ANLAMI: Record<Durum, AnlamRengi> = {
  "tamamlandı":    "basari",    // testing.iconPassed
  "geliştirmede":  "uyari",     // charts.yellow
  "beklemede":     "notr",      // disabledForeground
  "doğrulanmamış": "turuncu",   // charts.orange
  "bloklu":        "hata",      // errorForeground / kırmızı aile
};

// YUZ-4 ② salience bütçesi: satır rengi yalnız UÇ ve SEYREK durumlarda —
// geliştirmede=TAM SARI · bloklu=kırmızı · bitmiş=soluk; bekleyen/kısmi/doğrulanmamış
// NÖTR satır (YAS-4 rozeti ikonda konuşur — satır boyası salience bütçesini aşmaz).
// URI biçimi: sarmal-yol:/<anahtar>/<blokluSayısı>.
export const DURUM_ANAHTAR: Record<Durum, string> = {
  "beklemede": "notr", "geliştirmede": "gelistirmede", "tamamlandı": "bitti",
  "doğrulanmamış": "dogrulanmamis", "bloklu": "bloklu",
};
const ANAHTAR_RENK: Record<string, string> = {
  "gelistirmede": "charts.yellow",         // TAM SARI satır — ağaçta 1-3 aktif iş anında bulunur
  "bloklu":       "errorForeground",       // kırmızı satır — yol kesildi
  "bitti":        "descriptionForeground", // soluk yazı — yeşil-dolu ikonla ÇİFT kanal
};

/** FileDecoration'ın vscode'suz karşılığı — davranış burada sınanır. */
export interface Dekor {
  rozet?: string;   // YUZ-4 ⑤: blokaj '!' — köke tırmanır, ikon rengi çalınmaz
  ipucu?: string;   // hover: "altında N bloklu adım"
  renk?: string;    // tema-token (satır yazısına uygulanır)
}

/** sarmal-yol:/<anahtar>/<bloklu> → dekor kararı. Nötr + blokajsız = dekorsuz. */
export function dekorCoz(anahtar: string, bloklu: number): Dekor | undefined {
  const renk = ANAHTAR_RENK[anahtar];
  if (!renk && bloklu <= 0) return undefined;
  return {
    rozet: bloklu > 0 ? "!" : undefined,
    ipucu: bloklu > 0 ? blokluAdimIpucu(bloklu) : undefined,
    renk,
  };
}

// ── 🛈 BİLDİRİMLER YÜZEYİ ROZETLERİ ──────────────────────────────────────────
//
//   göç terfi turu A06 kapanışı'dan itibaren rozetin türü de motorun taşıdığı GERÇEK düzeydir.
//   Yüzey kanon hedefinden ikinci bir “aday” düzeyi çıkarmaz; aynı Tani nesnesini
//   okur. Böylece panel rengi, ipucu ve Problems düzeyi tek kaynaktan konuşur.

/** Rozet türü, kanonik tanı nesnesindeki bugünkü düzeyin aynısıdır. */
export type BildirimTuru = Tani["duzey"];

/**
 * Tür → panel rozeti. `simge` ve `grupSimgesi` geometrik ailenin satır
 * çizelgesinden (simge-cizelgesi.ts), `anlam` üreticinin renk ekseninden
 * gelir; ham renk değeri burada da taşınmaz (VIT-KIMLIK-A05 · YUZ-4.1).
 *
 * İKİ EKSEN, İKİ TAŞIYICI — Founder canlı bulgusu 2026-07-28 ("bu ikonlar olacak
 * gözüm yaaa"). Panelde aynı anda iki bilgi verilir: satırın AĞAÇTAKİ KADEMESİ ve
 * kaydın TÜRÜ. Önceki düzen ikisini de simgeye yüklüyordu; sonuç, aynı kademede üç
 * ayrı şeklin yarıştığı ve grup satırının çocuklarıyla aynı simgeyi taşıdığı
 * gürültülü bir ağaçtı — yani ne kademe okunuyordu ne tür.
 *
 * Yeni düzen yükü paylaştırır: ŞEKİL kademeyi söyler, RENK türü söyler. Grup satırı
 * katman simgesi taşır ve altındaki kayıtlar tek tip küçük noktadır; üçünün rengi
 * türlerinden gelir. Böylece ağaç bakışta okunur, tür ise renkten ayırt edilir ve
 * hiçbir kayıt komşusuyla şekil yarışına girmez.
 */
export const BILDIRIM_ROZET: Record<BildirimTuru, { simge: SatirSimgesi; grupSimgesi: SatirSimgesi; anlam: AnlamRengi; ne: string }> = {
  bilgi:   { simge: "nokta", grupSimgesi: "katmanlar", anlam: "bilgi",
    get ne(): string { return bildirimRozetMetni("bilgi"); } },
  "uyarı": { simge: "nokta", grupSimgesi: "katmanlar", anlam: "uyari",
    get ne(): string { return bildirimRozetMetni("uyarı"); } },
  hata:    { simge: "nokta", grupSimgesi: "katmanlar", anlam: "hata",
    get ne(): string { return bildirimRozetMetni("hata"); } },
};

/** Yüzey düzey seçmez; üreticinin kanonik tanı nesnesini olduğu gibi okur. */
export function bildirimTuru(tani: Pick<Tani, "duzey">): BildirimTuru {
  return tani.duzey;
}

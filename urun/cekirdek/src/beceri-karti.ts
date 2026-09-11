// ═══════════════════════════════════════════════════════════════════════════
// beceri-karti.ts — 📚 KONU KARTI ARAMASI (tek kaynak · BKM-DNT-A16)
//
//   `ogret { konu }` çağrısı bir Beceri kartının TAM metnini döndürür. Arama
//   mantığı bugüne dek yalnız MCP aracının gövdesinde yaşıyordu; CLI ikizi ise
//   konu verildiğinde "konu kartları henüz yolda" diyip karşılama kartını
//   basıyordu. İki yüz aynı soruya iki farklı cevap veriyordu ve CLI'nin cevabı
//   yanlıştı (YUZ-1.2 çift-kaynak yasağı). Arama buraya taşındı; iki yüz de
//   buradan okur.
//
//   ANAHTAR SIKIŞTIRMASI — ölçülmüş kusurun onarımı (2026-09-10): eski anahtar
//   yalnız küçük harfe indirip alfanümerik olmayanı alt çizgiye çeviriyordu.
//   Bu yüzden "çalışma alanı" anahtarı `çalışma_alanı` oluyor, dosya adı ise
//   ASCII yazıldığı için `calisma_alani` kalıyor ve kart HİÇ bulunamıyordu;
//   aynı biçimde "ÇalışmaAlanı" yazımı ayırıcı taşımadığı için hiçbir dosya
//   adına denk düşmüyordu. Anahtar artık Türkçe harfleri ASCII karşılığına
//   indirir ve BÜTÜN ayırıcıları düşürür; böylece "çalışma alanı",
//   "ÇalışmaAlanı", "calisma-alani" ve "BCR-CALISMA-ALANI" aynı karta varır.
//
//   Raf, ÜRÜNÜN kendi `ogreti/ogrenme/` rafıdır ve adresi çağıranın çalışma
//   dizinine değil kurulumun kendi konumuna bağlıdır; kartlar bu yüzden BOŞ bir
//   dizinde de okunur — doğuş anının öğretisi bu sözleşmeye dayanır.
// ═══════════════════════════════════════════════════════════════════════════

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/** Ürünün kendi öğrenme rafı — kurulum köküne göre çözülür (çalışma dizininden bağımsız). */
export const OGRENME_RAFI = fileURLToPath(new URL("../../../ogreti/ogrenme/", import.meta.url));

/** Türkçe harfleri ASCII'ye indiren küçük-harf tablosu (arama anahtarı için). */
const ASCII_KARSILIK: Readonly<Record<string, string>> = {
  "ç": "c", "ğ": "g", "ı": "i", "i̇": "i", "ö": "o", "ş": "s", "ü": "u", "â": "a", "î": "i", "û": "u",
};

/**
 * Bir konuyu ya da kodu karşılaştırılabilir anahtara indirger: Türkçe küçük harf →
 * ASCII karşılık → alfanümerik olmayan her şeyin düşürülmesi. Saf işlev.
 */
export function kartAnahtari(metin: string): string {
  return metin
    .toLocaleLowerCase("tr")
    .replace(/[çğıi̇öşüâîû]/gu, (h) => ASCII_KARSILIK[h] ?? h)
    .replace(/[^a-z0-9]+/gu, "");
}

const KOD_DESENI = /Beceri\(\s*kod:\s*([A-ZÇĞİÖŞÜ0-9-]+(?:\.[0-9]+){0,2})/u;

export interface KartSonucu {
  readonly metin: string;
  readonly isError: boolean;
}

/**
 * Konuya karşılık gelen Beceri kartının tam metnini döndürür. Eşleşme iki yoldan
 * kurulur: kartın kendi `Beceri( kod: … )` kimliği ya da dosya adı. Bulunamayan
 * konu ham hataya düşmez; mevcut kartları sayan bir koridor iletisi döner (YAS-3.4).
 */
export function beceriKartiBul(konu: string, rafi: string = OGRENME_RAFI): KartSonucu {
  const anahtar = kartAnahtari(konu);
  if (!anahtar) {
    return { metin: "✖ ogret bir konu ister — kullanım: ogret { konu: \"calisma-alani\" }. Karşılama kartı için konusuz çağır.", isError: true };
  }
  let adaylar: string[];
  try {
    adaylar = readdirSync(rafi).filter((a) => a.endsWith(".sar")).sort();
  } catch (e) {
    return { metin: `✖ ogrenme rafı okunamadı: ${(e as Error).message}`, isError: true };
  }
  for (const dosya of adaylar) {
    let icerik: string;
    try {
      icerik = readFileSync(join(rafi, dosya), "utf8");
    } catch { continue; }
    const kodM = KOD_DESENI.exec(icerik);
    const kodEs = kodM !== null && kartAnahtari(kodM[1]) === anahtar;
    if (kodEs || kartAnahtari(dosya.replace(/\.sar$/u, "")).includes(anahtar)) {
      return { metin: `📚 ${dosya} (ogreti/ogrenme/ rafı — kartın tam metni):\n\n${icerik}`, isError: false };
    }
  }
  return {
    metin: `✖ '${konu}' ile eşleşen beceri kartı bulunamadı. Mevcut kartlar: ${adaylar.join(" · ")}\n\nKarşılama kartı için konusuz çağır.`,
    isError: true,
  };
}

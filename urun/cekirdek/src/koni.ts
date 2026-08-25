// ═══════════════════════════════════════════════════════════════════════════
// koni.ts — Bağlam-konisi çıkarımı (saf)
//
//   Bir Adım düğümünden SNF-0 adimSemasi koni alanlarını (görev·referans·kabul·
//   dokunulmaz·bağımlılık·sınır) çıkarır. SAF — fs/ağ/global'e dokunmaz.
//   Tüketiciler: iskeletci (adimIcerigi → markdown) · sef (RAY-3 bağlam montajı).
//
//   Koni HEM parametrede `Adım( görev: … )` HEM gövde-özelliğinde `Adım(){ görev: … }`
//   yazılabilir (iki geçerli sözdizim); bu yüzden `alanBul` ikisini de tarar —
//   motorun kenar denetimiyle (denetci: parametreler+ozellikler) hizalı.
// ═══════════════════════════════════════════════════════════════════════════

import type { Dugum } from "./sozdizim.ts";
import { degerMetni } from "./yolcoz.ts";

/** Adım'ın bağlam-konisi alanları (SNF-0 adimSemasi sırası).
 *  A09/C5 (bug-avı): 'bağımlılık' → 'bağımlı' hizası — ORK-1.2 `bağımlılık` alanını
 *  HATA ile yasakladı; koni artık doğrudan `bağımlı` KENARINI okur (üretilen
 *  .md başlıkları da kullanıcıyı yasak alana yönlendirmez). */
// SNF-0 adimSemasi koni alanları — .md başlıklarını sürer (iskeletci), ŞEMAYA KİLİTLİ.
export const KONI_ALANLARI = [
  "görev", "referans", "kabul", "dokunulmaz", "bağımlı", "sınır",
] as const;

/** Bir Adım'ın çıkarılmış bağlam-konisi (yapısal — sef/orkestratör için).
 *  NOT: runtime Koni nesnesi, KONI_ALANLARI'nın 6 şema-alanına EK olarak `üretir`i de
 *  taşır (MIM-1.6 · üretim-yeri). Sol kazısı: ŞEF prompt'u ajanın NE üreteceğini görmüyordu;
 *  üretir bir KENAR (şema koni-alanı değil) — bu yüzden .md başlığına değil, yalnız
 *  runtime konisine girer (KONI_ALANLARI 6'da kalır, şema/.md dokunulmaz). */
export interface Koni {
  görev: string;
  referans: string;
  kabul: string;
  dokunulmaz: string;
  bağımlı: string;
  sınır: string;
  üretir: string;   // KENAR — şema-dışı; ŞEF prompt'u için runtime konisine eklenir
}

/** Bir alanı Adım'ın HEM parametrelerinde HEM gövde-özelliklerinde arar. */
function alanBul(node: Dugum, ad: string) {
  return node.parametreler.find((p) => p.ad === ad) ??
    node.ozellikler.find((p) => p.ad === ad);
}

/** Maddeli alanlar: liste yazımında her öğe kendi madde işaretiyle çizilir
 *  (markdown "- "). Niyet alanları görev·kabul·sınır (MIM-1.6 ② · NTK-A04) +
 *  Adım-özgü kayıt alanları rapor·yama (STR-4 ① · NTK-A07 — koşu deseninde
 *  tarih + metin; birden çok kayıt liste olarak birikir). KOD listeleri
 *  (bağımlı · referans · dokunulmaz · üretir) satır-içi kalır: kısa kimlik
 *  dizileri maddeleşince kart/md gereksiz uzar. */
const MADDELI_ALANLAR = new Set(["görev", "kabul", "sınır", "rapor", "yama"]);

/**
 * Tek bir koni alanını Adım düğümünden çıkarır; yoksa `<!-- TODO -->` döner.
 * A09/C4 (bug-avı): eski "türetme" dalları kaldırıldı — 'referans' dalı ÖLÜ
 * koddu (aynı alanı ikinci kez arıyordu), 'bağımlılık' dalı ise artık gereksiz
 * (koni alanı doğrudan `bağımlı` kenarının kendisi — alanBul onu bulur).
 * MIM-1.6 ② (NTK-A04): niyet alanı liste yazılmışsa maddeli metin döner.
 */
export function koniAlani(node: Dugum, alan: string): string {
  const p = alanBul(node, alan);
  if (!p) return "<!-- TODO -->";
  if (p.deger.tur === "liste" && MADDELI_ALANLAR.has(alan)) {
    return (p.deger.ogeler ?? []).map((o) => `- ${degerMetni(o)}`).join("\n");
  }
  return degerMetni(p.deger);
}

/** Bir Adım'ın altı koni alanını yapısal nesne olarak çıkarır (saf). */
export function koniCikar(node: Dugum): Koni {
  return {
    görev: koniAlani(node, "görev"),
    referans: koniAlani(node, "referans"),
    kabul: koniAlani(node, "kabul"),
    üretir: koniAlani(node, "üretir"),
    dokunulmaz: koniAlani(node, "dokunulmaz"),
    bağımlı: koniAlani(node, "bağımlı"),
    sınır: koniAlani(node, "sınır"),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// cevir.ts — Sarmal çeviri katmanı (DÖRT sözlük, tek kapı)
//
//   ① dil-sozlugu.json → Sarmal keyword i18n (Ekran↔Screen) · view-layer (karar A)
//   ② bilgi/tasarim_sozlugu/kayit.json → TR kavram → Flutter/React/SwiftUI + arkayüz
//      (kapsayıcı→Container; TEK KANON — TIP-3 ②: eski ikiz stack-eslemesi.json emekli)
//   ③ tasarim-terimleri.md → TR↔EN tasarım kavramı (hover↔üzerine gelme)
//   ④ sarmal-kavramlari.json → Sarmal'IN KENDİ kavramı (koni · kavuşum) + kanonik dayanağı
//
//   DÖRDÜNCÜ SÖZLÜK NEDEN AÇILDI (V1B-KAVRAM-A01 · 2026-08-22): ilk üç sözlük
//   başka soruların evidir ve Sarmal'ın kendi mimari kavramları hiçbirine ait
//   değildir. Ölçüm bunu gösterdi: `koni` dört belgede geçiyordu ve hiçbirinde
//   tanımlı değildi, `kavuşum` ise motorca zorlanıyor olmasına karşın kavram
//   aracında hiç bulunamıyordu. Aracın kendi metni de bunu "kanonda böyle bir
//   kavram yaşamıyor" diye bildiriyordu, oysa kavram kanonda yaşıyordu; sorgu
//   yüzeyi ile kanon ayrışmıştı. Bu sözlük o ayrışmayı kapatır ve tanım yerine
//   kanonun özetini artı kaynağını taşır — hüküm yalnız kaynağında yaşar.
//
//   Kanonik = TR (Türkçe-öncelik); disk hep TR → drift yok, çıktı hedef dile.
//   İlk etap diller: tr, en (az/ar yapısı hazır — Founder doldurur). SIFIR bağımlılık (STR-3.1).
// ═══════════════════════════════════════════════════════════════════════════

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Eklenti gömülü sözlüğü `dilSozlugunuBagla` ile bağladığı için bu yol o
// çalışma zamanında hiç kurulmamalıdır. CLI/MCP disk yolunu yalnız ilk gerçek
// okumada çözer; böylece CJS bundle modül yüklenirken boş `import.meta.url`
// üzerinden URL kurmaya çalışmaz.
const oku = (ad: string): string => readFileSync(fileURLToPath(new URL(
  `../../../oz/ceviri/${ad}`,
  import.meta.url,
)), "utf8");

// ── ① dil sözlüğü (keyword i18n) ─────────────────────────────────────────────
export interface DilSozlugu {
  diller: string[];
  widget: Record<string, Record<string, string>>;
  kenar: Record<string, Record<string, string>>;
  parametre: Record<string, Record<string, string>>;
  deger: Record<string, Record<string, Record<string, string>>>;
  widgetNe: Record<string, Record<string, string>>;
  kenarNe: Record<string, Record<string, string>>;
  semaKural: Record<string, Record<string, string>>;
  aileNe: Record<string, Record<string, string>>;
  aileAdi: Record<string, Record<string, string>>;
  agacMetaforuNe: Record<string, Record<string, string>>;
  agacOrgani: Record<string, Record<string, string>>;
  karneDerece: Record<string, Record<string, string>>;
  karneBilesen: Record<string, Record<string, string>>;
}
let _dil: DilSozlugu | undefined;
function dilSozlugu(): DilSozlugu {
  return (_dil ??= JSON.parse(oku("dil-sozlugu.json")) as DilSozlugu);
}

/** Paketleyici sözlüğü gövdeye gömdüğünde disk okuması yerine aynı kanonu bağlar. */
export function dilSozlugunuBagla(sozluk: DilSozlugu): void {
  _dil = sozluk;
}

export type DuzYaziBolumu =
  | "widgetNe"
  | "kenarNe"
  | "semaKural"
  | "aileNe"
  | "aileAdi"
  | "agacMetaforuNe"
  | "agacOrgani"
  | "karneDerece"
  | "karneBilesen";

/** Kanonik Türkçe düzyazının seçilen okuma yüzünü döndürür. */
export function sozlukDuzYazisi(
  bolum: DuzYaziBolumu,
  anahtar: string,
  turkce: string,
  dil: CiktiDili,
): string {
  if (dil === "tr") return turkce;
  return dilSozlugu()[bolum]?.[anahtar]?.[dil] ?? turkce;
}

/** Widget, kenar ya da alan adının okuma yüzündeki karşılığı. */
export function sozlukAdi(
  bolum: "widget" | "kenar" | "parametre",
  anahtar: string,
  dil: CiktiDili,
): string {
  if (dil === "tr") return anahtar;
  return dilSozlugu()[bolum]?.[anahtar]?.[dil] ?? anahtar;
}

/** Alan-kapsamlı enum değerinin okuma yüzündeki karşılığı. `.sar` kaynağı yine Türkçedir. */
export function sozlukDegeri(
  alan: string,
  deger: string,
  dil: CiktiDili,
): string {
  if (dil === "tr") return deger;
  return dilSozlugu().deger?.[alan]?.[deger]?.[dil] ?? deger;
}

/**
 * `zorunluKenarlar` tanılarının İngilizce yüzünü veri ve sözlükten kurar.
 * Dokuz kimliğe ayrı cümle çizelgesi kurulmaz: tipin hazır İngilizce düzyazısı
 * ile kuralın zorunlu alan/kenar grubu birlikte okunur.
 */
export function zorunluKenarIngilizcesi(
  tip: string,
  kimlik: string,
  grup: readonly string[],
  turkceTipAciklamasi: string,
): { mesaj: string; oneri: string } {
  const tipAdi = sozlukAdi("widget", tip, "en");
  const secenekler = grup.map((ad) => {
    const kenar = sozlukAdi("kenar", ad, "en");
    return kenar === ad ? sozlukAdi("parametre", ad, "en") : kenar;
  });
  const aciklama = sozlukDuzYazisi("widgetNe", tip, turkceTipAciklamasi, "en");
  return {
    mesaj: `${tipAdi} "${kimlik}" is missing every member of its required ${secenekler.join(" · ")} group. ${aciklama}`,
    oneri: `Add at least one of these declared fields or edges: ${secenekler.map((ad) => `\`${ad}:\``).join(" · ")}.`,
  };
}

// ── ② stack sözlüğü (kavram → kod) — kanondan oku, iç içe ağacı düzleştir ────
let _stack: Record<string, Record<string, string>> | undefined;
function stackSozlugu(): Record<string, Record<string, string>> {
  if (_stack) return _stack;
  const kanonYol = fileURLToPath(new URL("../../../ogreti/bilgi/tasarim_sozlugu/kayit.json", import.meta.url));
  const ham = JSON.parse(readFileSync(kanonYol, "utf8")) as Record<string, unknown>;
  const duz: Record<string, Record<string, string>> = {};
  const daldan = (obj: Record<string, unknown>): void => {
    for (const k in obj) {
      const v = obj[k];
      if (v && typeof v === "object") {
        const o = v as Record<string, unknown>;
        // yaprak eşleme mi (flutter/python/react anahtarı taşıyor)?
        if ("flutter" in o || "python" in o || "react" in o) duz[k] = v as Record<string, string>;
        else daldan(o); // kategori → derine in
      }
    }
  };
  for (const dal of ["onyuz", "parametreler", "efektler", "animasyonlar", "arkayuz", "mantik", "matematik"]) {
    if (nesne(ham[dal])) daldan(ham[dal] as Record<string, unknown>);
  }
  return (_stack = duz);
}

// ── ③ terim sözlüğü (TR↔EN kavram, markdown tablo) ──────────────────────────
let _terim: Array<{ tr: string; en: string }> | undefined;
function terimSozlugu(): Array<{ tr: string; en: string }> {
  if (_terim) return _terim;
  const list: Array<{ tr: string; en: string }> = [];
  for (const satir of oku("tasarim-terimleri.md").split("\n")) {
    const s = satir.trim();
    if (!s.startsWith("|")) continue;
    const h = s.split("|").slice(1, -1).map((x) => x.trim());
    if (h.length < 2) continue;
    const [tr, en] = h;
    if (!tr || !en || tr === "Türkçe" || /^-+$/.test(tr)) continue;
    list.push({ tr, en });
  }
  return (_terim = list);
}

// ── ④ Sarmal'ın kendi kavramları ────────────────────────────────────────────
export interface SarmalKavrami {
  tanim: string;
  dayanak: string;
  nerede?: string;
  en?: string;
}
let _sarmalKavram: Record<string, SarmalKavrami> | undefined;
export function sarmalKavramSozlugu(): Record<string, SarmalKavrami> {
  if (_sarmalKavram) return _sarmalKavram;
  const ham = JSON.parse(oku("sarmal-kavramlari.json")) as { kavramlar?: Record<string, SarmalKavrami> };
  return (_sarmalKavram = ham.kavramlar ?? {});
}

function nesne(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

// ── yayın dili kapısı ───────────────────────────────────────────────────────
// Kanonik yüz Türkçedir; paralel dil haneleri aynı anahtarın yanında yaşar.
// Bugün ürün yüzünde dolu olan iki hane bunlardır. az/ar haneleri sözlükte
// hazırdır, fakat içerikleri tamamlanmadan bu seçim kapısına alınmaz.
export const CIKTI_DILLERI = ["tr", "en"] as const;
export type CiktiDili = (typeof CIKTI_DILLERI)[number];
export type DilHaneleri<T> = Readonly<Record<CiktiDili, T>>;

/** Kanonik Türkçe hane varsayılandır; çağıran açıkça başka bir dil seçebilir. */
export function dilHanesi<T>(haneler: DilHaneleri<T>, dil: CiktiDili = "tr"): T {
  return haneler[dil];
}

/**
 * Sunucu ve komut yüzlerinin tek yayın-dili kaynağı. MCP sürecinde VS Code
 * bağlamı bulunmadığı için dil yalnız bu ortam değişkeninden okunur; işletim
 * sistemi yereli ya da başka bir örtük kaynak ikinci karar kapısı kurmaz.
 */
export const CIKTI_DILI_ORTAM_DEGISKENI = "SARMAL_DIL";

/**
 * `SARMAL_DIL=tr|en`; boş ya da henüz yayımlanmayan bir değer kanonik Türkçe
 * haneye düşer. Çağıranın çevre demeti verebilmesi sınamayı süreç-mutasyonsuz
 * ve determinist tutar.
 */
export function etkinCiktiDili(
  cevre: Readonly<Record<string, string | undefined>> = process.env,
): CiktiDili {
  const aday = cevre[CIKTI_DILI_ORTAM_DEGISKENI]?.trim().toLocaleLowerCase("tr");
  return CIKTI_DILLERI.includes(aday as CiktiDili) ? aday as CiktiDili : "tr";
}

// ── birleşik çeviri ──────────────────────────────────────────────────────────
export interface Ceviri {
  kelime: string;
  bulundu: boolean;
  /** ① keyword i18n (Sarmal dili çok-dilli). */
  i18n?: { kanonik: string; tur: "widget" | "parametre"; diller: Record<string, string> };
  /** ② kavram → stack kodu. */
  stack?: { kavram: string; hedefler: Record<string, string> };
  /** ③ TR↔EN tasarım kavramı. */
  terim?: { tr: string; en: string };
  /** ④ Sarmal'ın kendi kavramı — tanım ve kanonik dayanak. */
  sarmal?: SarmalKavrami & { kavram: string };
}

/** Herhangi dildeki bir kelimeyi üç sözlükte arar; bulduğu her katmanı döndürür. */
export function cevir(kelime: string): Ceviri {
  const sonuc: Ceviri = { kelime, bulundu: false };
  const alt = kelime.toLocaleLowerCase("tr");

  // ① keyword i18n — iki yönlü (TR kanonik ↔ diğer diller)
  const d = dilSozlugu();
  for (const tur of ["widget", "parametre"] as const) {
    const tablo = d[tur];
    if (kelime in tablo) {
      sonuc.i18n = { kanonik: kelime, tur, diller: { tr: kelime, ...tablo[kelime] } };
      sonuc.bulundu = true;
    } else {
      for (const [kanonik, harita] of Object.entries(tablo)) {
        for (const dil in harita) {
          if (harita[dil] === kelime) {
            sonuc.i18n = { kanonik, tur, diller: { tr: kanonik, ...harita } };
            sonuc.bulundu = true;
          }
        }
      }
    }
  }

  // ② stack kodu (kavram küçük harf) — kapsayıcı → Container/<div>/ZStack
  const st = stackSozlugu();
  if (alt in st) {
    sonuc.stack = { kavram: alt, hedefler: st[alt] };
    sonuc.bulundu = true;
  }

  // ③ TR↔EN terim
  for (const t of terimSozlugu()) {
    if (t.tr.toLocaleLowerCase("tr") === alt || t.en.toLocaleLowerCase("tr") === alt) {
      sonuc.terim = { tr: t.tr, en: t.en };
      sonuc.bulundu = true;
      break;
    }
  }

  // ④ Sarmal'ın kendi kavramı — koni · kavuşum (tanım + kanonik dayanak)
  const sk = sarmalKavramSozlugu();
  for (const [ad, girdi] of Object.entries(sk)) {
    if (ad.toLocaleLowerCase("tr") === alt || girdi.en?.toLocaleLowerCase("tr") === alt) {
      sonuc.sarmal = { kavram: ad, ...girdi };
      sonuc.bulundu = true;
      break;
    }
  }

  return sonuc;
}

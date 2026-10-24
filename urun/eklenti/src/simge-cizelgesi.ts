// ═══════════════════════════════════════════════════════════════════════════
// simge-cizelgesi.ts — 🎨 TEK KAYNAK SİMGE ÇİZELGESİ (SAF — vscode importsuz)
//
//   VIT-KIMLIK-A03: altı eksen tipinin (Faz · Blok · Katman · AltKatman ·
//   Adım · Meyve) görsel kimliği TEK modülden okunur. İki yüz aynı KİMLİKTEN
//   türer, birbirinin yerine geçmez:
//
//     • EMOJİ — düz metin yüzeylerin karşılığı (hover baloncuğu, tamamlama,
//       koni kartı, Mini Graf'ın cam merceği). Değer KANONDAN okunur
//       (tipSimgeleri → aile kademesi); bu modül İKİNCİ BİR KOPYA KURMAZ.
//     • SVG — grafik yüzeylerin karşılığı (Yol Haritası ağacının iconPath'i,
//       .sar dosya ikonu). Kaynak dosyalar `medya/simgeler/` rafında yaşar;
//       Founder 2026-07-28 galeriden GEOMETRİK aileyi seçti.
//
//   Ölçülmüş ders (VIT-KIMLIK-A03 gerekçesi): Mini Graf ile Yol Haritası'nın
//   simgeleri birbirinden ayrıştı ve bunu hiçbir kapı yakalamadı — Founder
//   gözle buldu. İki tüketici de BU modülden okuduğu için ayrışma artık
//   yapısal olarak imkânsızdır; kapsam eşitliğini simge-cizelgesi.test.ts
//   nöbeti ölçer.
//
//   YUZ-4.1 (renk simgeye GÖMÜLMEZ): raf kaynakları currentColor konturludur.
//   TreeItem.iconPath currentColor ÇÖZMEZ (VS Code kısıtı); bu yüzden somut
//   renkli varyantlar `arac/simge-uret.mjs` üreticisiyle TEK kaynaktan türer
//   ve renk DEĞERLERİ yalnız o üreticinin çizelgesinde yaşar. Bu modül renk
//   taşımaz — yalnız yol üretir.
//
//   SAF'lık notu (VIT-KIMLIK-A06 sonrası): çalışma zamanında vscode importu
//   yine YOKTUR — dosyanın sonundaki EDİTÖR HANESİ vscode'u yalnız tip olarak
//   alır ve kabuğu parametreyle taşır (kabuğun dışarıdan verildiği saf modül
//   deseni); node:test bu modülü doğrudan koşmaya devam eder.
// ═══════════════════════════════════════════════════════════════════════════

import type * as vscode from "vscode";
import { GOMULU_KAYIT } from "./gomulu-kanon.ts";
import type { Program, Dugum } from "../../cekirdek/src/sozdizim.ts";
import {
  adimDurumu, durumTuret, adimDurumlariTopla, kapsayiciEvre,
  ADIM_YASAM_DURUMLARI, type AdimDurumu, type KapsayiciEvre,
} from "../../cekirdek/src/durum.ts";
import { programAl } from "./onbellek.ts";

/**
 * TİP SİMGESİ (emoji) İKİ KADEMELİ okunur ve iki kademenin de kaynağı KANONDUR
 * (TIP-0): önce tipin kendi simgesi denenir, yoksa tipin AİLE simgesine düşülür.
 * İkinci kademe meyve rolü için zorunludur — kanonda `Kod`, `Veri` ya da `Meyve`
 * tipinin kendi simgesi yoktur, ama ailesi (`urun` → 🍎, `teknoloji` → 🔌)
 * vardır. Aile haritası kanonun `widgetTipleri` listesinden BİR KEZ kurulur;
 * koda gömülü ikinci bir simge çizelgesi YOKTUR ve olmamalıdır (gömülen çizelge
 * kanonla sessizce ayrışır ve aynı kavram iki yüzde iki ayrı işaretle görünür).
 */
const tipSimgeleri: Record<string, string> =
  ((GOMULU_KAYIT as { tipSimgeleri?: Record<string, string> }).tipSimgeleri) ?? {};
const aileSimgeleri: Record<string, string> =
  ((GOMULU_KAYIT as { aileSimgeleri?: Record<string, string> }).aileSimgeleri) ?? {};
const TIP_AILESI: Record<string, string> = Object.fromEntries(
  ((GOMULU_KAYIT as { widgetTipleri?: ReadonlyArray<{ ad: string; aile: string }> }).widgetTipleri ?? [])
    .map((w) => [w.ad, w.aile]));

/** Bir tipin düz metin yüzlerdeki simgesi — tip kademesi, sonra aile kademesi. */
export function tipSimgesi(tip: string): string {
  return tipSimgeleri[tip] ?? aileSimgeleri[TIP_AILESI[tip] ?? ""] ?? "◦";
}

/** Plan omurgasının ALTI EKSEN TİPİ — geometrik SVG ailesinin kapsamı budur.
 *  Meyve bir tip değil ROLDÜR (minigraf-cekirdek dersi) ama görsel kimlik
 *  taşır; bu yüzden eksende sayılır. */
export const EKSEN_TIPLERI = ["Faz", "Blok", "Katman", "AltKatman", "Adım", "Meyve"] as const;
export type EksenTipi = (typeof EKSEN_TIPLERI)[number];

/** Eksen tipi → raf dosya adı (ASCII — dosya sistemi Türkçe karakter taşımaz). */
const EKSEN_SVG_AD: Record<EksenTipi, string> = {
  Faz: "faz", Blok: "blok", Katman: "katman",
  AltKatman: "altkatman", Adım: "adim", Meyve: "meyve",
};

/** Simge rafı — currentColor konturlu KAYNAK dosyaların eklenti-köküne göre yeri. */
export const SIMGE_RAFI = "medya/simgeler";
/** Üretilmiş varyant rafı — `arac/simge-uret.mjs` çıktıları (build'de doğar). */
export const URETILMIS_RAF = "medya/simgeler/uretilmis";

/** Bir eksen tipinin currentColor KAYNAK SVG'si (eklenti-köküne göreli yol). */
export function eksenSvgKaynagi(tip: EksenTipi): string {
  return `${SIMGE_RAFI}/${EKSEN_SVG_AD[tip]}.svg`;
}

/** Evre → üretilmiş dosya-adı parçası (ASCII). Evre kümesi kanonik
 *  KapsayiciEvre'dir (durum.ts) — ikinci bir evre listesi kurulmaz. */
const EVRE_AD: Record<KapsayiciEvre, string> = {
  "bitti": "bitti", "sürüyor": "suruyor", "bekliyor": "bekliyor",
};

/** Tema adları — VS Code'un iki ikon kanalı (TreeItem.iconPath.light/dark). */
export type SimgeTemasi = "acik" | "koyu";

/**
 * Bir eksen tipinin ÜRETİLMİŞ, evre-renkli varyantı (eklenti-köküne göreli yol).
 * YUZ-4 Founder kilidi (2026-07-12) burada da geçerlidir: ŞEKİL=TİP DAİMA
 * (dosya adının gövdesi), RENK=DURUM daima (evre eki). Renk değerinin kendisi
 * bu modülde YOKTUR — yalnız üreticinin çizelgesinde yaşar.
 */
export function eksenSvgVaryanti(tip: EksenTipi, evre: KapsayiciEvre, tema: SimgeTemasi): string {
  return `${URETILMIS_RAF}/${EKSEN_SVG_AD[tip]}-${EVRE_AD[evre]}-${tema}.svg`;
}

// ── PANEL HANESİ (VIT halka 1 · Founder 2026-08-04: panel ailesi GEOMETRİK) ──
//    Kenar çubuğu görünüşlerinin simgesi TEK kaynaktan okunur; iki görünüşün aynı
//    simgeyi taşıması Founder'ın 2026-07-28 canlı bulgusuydu ve o kusurun geri
//    gelmemesi simge-cizelgesi.test.ts nöbetiyle ölçülür. Anahtar, package.json'daki
//    görünüş KİMLİĞİDİR (kapsayıcı dahil değil). Founder 2026-10-21: Onaylar ·
//    Hatırlatıcılar · Gözlemler · Fikirler ayrı görünüş olmaktan çıktı, tek
//    `sarmalMakinist` ağacının üst düğümleri oldu; düğümler satır simgesi taşır.

/** Kenar çubuğu görünüşlerinin kimliği — package.json `views["sarmal-yol"]` kapsamı.
 *  🧩 VIT-K78-A10: dört bölüm yuvası da bu haneye girer; yuvalar
 *  kardeş eklentilerin kaydettiği bölümleri taşır ve her biri kendi simgesiyle
 *  ayrılır (bolum-cekirdek.ts `YUVA_GORUNUSLERI`). Kısıtlı modun karşılama
 *  görünüşü panel değildir ve aşağıda `KISITLI_KARSILAMA_GORUNUSU` olarak ayrı
 *  ilan edilir (MGZ-A08). */
export const PANEL_GORUNUSLERI = [
  "sarmalPanel",
  "sarmalBolumYuvasi1", "sarmalBolumYuvasi2", "sarmalBolumYuvasi3", "sarmalBolumYuvasi4",
] as const;
export type PanelGorunusu = (typeof PANEL_GORUNUSLERI)[number];

/** Görünüş kimliği → raf dosya adı gövdesi (ASCII; görünen adı izler). */
const PANEL_SVG_AD: Record<PanelGorunusu, string> = {
  sarmalPanel: "yolharitasi",
  sarmalBolumYuvasi1: "yuva-1",
  sarmalBolumYuvasi2: "yuva-2",
  sarmalBolumYuvasi3: "yuva-3",
  sarmalBolumYuvasi4: "yuva-4",
};

/** Bir panel görünüşünün currentColor KAYNAK SVG'si (eklenti-köküne göreli yol). */
export function panelSvgKaynagi(gorunus: PanelGorunusu): string {
  return `${SIMGE_RAFI}/panel-${PANEL_SVG_AD[gorunus]}.svg`;
}

/** Etkinlik çubuğu kapsayıcısının simgesi: kapsayıcı ayrı bir kimlik taşımaz ve
 *  kabın en üstündeki bölüm sırasının simgesini, yani Sarmal sarmalını paylaşır.
 *  🧩 VIT-K78-A10 (Founder hükmü 2026-09-28): etkinlik çubuğunda tek bir Sarmal
 *  simgesi durur; Ray, kabın içindeki bölümlerden biridir ve raylı Yol Haritası
 *  simgesi artık kabın değil Ray bölümünün işaretidir. */
export const KAPSAYICI_SIMGE = `${SIMGE_RAFI}/panel-sarmal.svg`;

/** 🛡️ MGZ-A08 · Kısıtlı modun karşılama görünüşü. Panel ailesine girmez: veri
 *  taşımaz, sağlayıcı istemez ve yalnız klasöre güvenilmediğinde görünür. O an
 *  kapta tek başına durduğu için kabın Sarmal sarmalını taşır (Founder hükmü
 *  2026-10-10: kısıtlı modda Sarmal simgesi kalır). Güvenilir klasörde hiç
 *  görünmediğinden bölüm sırasıyla aynı simgeyi paylaşması, iki panelin yan yana
 *  karışması kusurunu (Founder 2026-07-28) geri getiremez. */
export const KISITLI_KARSILAMA_GORUNUSU = "sarmalKisitliKarsilama";
export const KISITLI_KARSILAMA_SIMGESI = KAPSAYICI_SIMGE;

/** Bölüm sırasında Ray bölümünün işareti: Ray'in ilk paneli olan Yol Haritasının
 *  iki raylı simgesidir; ayrı bir çizim doğmaz. */
export const RAY_BOLUM_SIMGESI = panelSvgKaynagi("sarmalPanel");

/** Dört yerleşik bölümün başlık eylemi simgelerinin KAYNAKLARI (Founder 2026-10-21).
 *  Kaynaklar currentColor konturludur; başlık eylemi simgesi somut renk ister, bu
 *  yüzden `arac/simge-uret.mjs` her kaynaktan düz ve seçili, açık ve koyu tema
 *  varyantlarını `uretilmis/` rafına türetir (üretici aynı eşlemeyi taşır ve
 *  nöbet ikisinin ayrışmadığını ölçer). Graf, Tren ve Makinist ayrı bir çizim taşımaz; kendi
 *  görünüşlerinin panel simgesini okur, böylece aynı çizimin iki kopyası doğmaz. */
export const BOLUM_SIMGE_KAYNAKLARI = {
  ray: `${SIMGE_RAFI}/bolum/ray.svg`,
  graf: `${SIMGE_RAFI}/panel-minigraf.svg`,
  tren: `${SIMGE_RAFI}/bolum/tren-ajan.svg`,
  makinist: `${SIMGE_RAFI}/panel-makinist.svg`,
} as const;

/** Sarmal panelinin sekme şeridindeki üç simge (Founder 2026-10-21): şerit bu dosyaları satır içi SVG
 *  olarak gömer. Tren sekmesi, lokomotif ile yapay zekâ ajanını birleştiren `bolum/tren-ajan.svg`
 *  çizimini taşır; etkinlik çubuğu dışında hiçbir yerde başka bir Tren simgesi kullanılmaz. */
export const SEKME_SIMGE_KAYNAKLARI = {
  ray: BOLUM_SIMGE_KAYNAKLARI.ray,
  tren: BOLUM_SIMGE_KAYNAKLARI.tren,
  makinist: BOLUM_SIMGE_KAYNAKLARI.makinist,
} as const;

/** Başlık eylemi simgesinin üretilmiş varyantı (eklenti köküne göreli). Düz hâl tema
 *  ön plan rengindedir; seçili hâl daha kalın kontur, alt çizgi ve marka mavisidir. */
export function bolumKomutSimgesi(bolum: keyof typeof BOLUM_SIMGE_KAYNAKLARI, secili: boolean, tema: SimgeTemasi): string {
  return `${URETILMIS_RAF}/bolum-${bolum}-${secili ? "secili" : "duz"}-${tema}.svg`;
}

// ── SATIR HANESİ (VIT-KIMLIK-A05 · Founder hükmü 2026-08-04: IDE'nin içi ─────
//    baştan aşağı geometrik çizim dilinden konuşur — satır içi çan/katman/
//    nokta/roket gibi hazır codicon'lar da dahil). Dört panelin kayıt ve grup
//    satırlarına basılan her simge BU haneden okunur; paneller codicon kimliği
//    taşımaz. Kaynaklar `medya/simgeler/satir-*.svg` rafında currentColor
//    konturlu yaşar; TreeItem.iconPath currentColor çözmediği için somut
//    renkli varyantlar `arac/simge-uret.mjs` üreticisinin ANLAM_RENK
//    çizelgesiyle build'de türer. Bu modül renk taşımaz — yalnız yol üretir
//    (YUZ-4.1).

/** Satır simge ailesi — dört panelin kayıt ve grup satırlarının tüm şekilleri. */
export const SATIR_SIMGELERI = [
  "sefer",            // Yol Haritası varlık/proje satırı (eski rocket)
  "istasyon",         // Yol Haritası ÇALIŞMA ALANI satırı — çatı örtüsü altında kapsanan birimler (EKL-F7-A09 küme kimliği)
  "yerimi",           // Hatırlatıcılar proje satırı (eski bookmark)
  "can",              // Hatırlatıcılar kayıt satırı (eski bell)
  "kutu",             // Gözlemler proje satırı (eski inbox)
  "katmanlar",        // Gözlemler kök-özet grup satırı (eski layers)
  "nokta",            // tekil kayıt/düğüm noktası (eski circle-small-filled · circle-filled)
  "baglanti-geri",    // bağımlı kenar grubu (eski arrow-left)
  "baglanti-ileri",   // etki kenar grubu (eski arrow-right)
  "kabul",            // kabul ölçütleri satırı (eski checklist)
  "uyari",            // kırık dosya grubu (eski warning)
  "dosya",            // kırık dosya kaydı (eski file)
  "kosum",            // orkestrasyon koşum satırı (eski comment-discussion)
  "kapi",             // Onaylar kapı satırı (eski 💬 emoji — webview'de inline basılır)
  "kopya",            // Onaylar bağlam kopyalama eylemi (eski 📋 emoji — webview'de inline basılır)
  "onay",             // Onaylar karar düğmesi: kabul (eski ✅ emoji)
  "serh",             // Onaylar karar düğmesi: şerhle kabul (eski 📝 emoji)
  "ret",              // Onaylar karar düğmesi: ret (eski ⛔ emoji)
  "devam",            // taşan kenar listesinin '… +N daha' satırı
  "fikir",            // Fikirler panelinin kayıt satırı (KYN-YUZ-A01 · VIT-GRAF-A16)
  // ── VIT-KIMLIK-A07 · envanterin eksik ilan ettiği yirmi işaret ─────────────
  //    Founder 2026-08-05 hükmü: geliştirme ortamında görünen her işaret
  //    kilitli vektörel aileden gelir. Aşağıdaki yirmi ad, envanterin ARAYÜZ
  //    İŞARETİ sınıfına koyduğu ve ailede karşılığı BULUNMAYAN kalemlerdir;
  //    her satırın yorumu, işaretin bugün hangi emojiyle ve hangi yüzeyde
  //    çizildiğini söyler. Yüzeylere BAĞLANMA işi bu Adımın dördüncü görev
  //    maddesidir ve ayrı bir turda yapılır — bu hane şimdilik ailenin
  //    kapsamını ilan eder, tüketicisini değil.
  "gorev",            // koni kartının 'görev' başlığı (eski 🎯 · yolharitasi webview)
  "sinir",            // koni kartının 'sınır' başlığı (eski 🚧 · yolharitasi webview)
  "dokunulmaz",       // koni kartının 'dokunulmaz' başlığı (eski 🛑 · yolharitasi webview)
  "referans",         // koni kartının 'referans' başlığı (eski 📚 · yolharitasi webview)
  "yama",             // koni kartının 'yama' başlığı (eski 🩹 · yolharitasi webview)
  "kural",            // koni kartının 'bağlı kurallar' başlığı (eski 📏 · yolharitasi webview)
  "kart",             // koni kartının kendi başlığı (eski 🃏 · yolharitasi webview)
  "dogrudan",         // doğrudan kenar işareti (eski ⚡ · koni kartı etki listesi)
  "gecisli",          // geçişli kenar işareti (eski 🌊 · koni kartı etki listesi)
  "zaman",            // koşum dökümünün saati (eski 🕐 · konuşma kartı webview)
  "kisi",             // koşum dökümünün ajan/insan tarafı (eski 👤 · konuşma kartı webview)
  "jeton",            // koşumun token bütçesi (eski 🎫 · konuşma kartı webview)
  "giden",            // ŞEF'in ham istemi (eski 📤 · konuşma kartı webview)
  "gelen",            // etmenin ham yanıtı (eski 📥 · konuşma kartı webview)
  "terfi",            // terfi bekleyen bellek dersi (eski 🎓 · yildiz satır-içi dekoru)
  "kilit",            // ebedi/kilitli düğüm (eski 🔒 · Yol Haritası kural satırı)
  "planlanmamis",     // mevsime bağlanmamış Blok (eski 🧊 · Yol Haritası sayaç satırı)
  "tip",              // ipucu balonunun tip rozeti (eski 🧩 · hover markdown)
  "konum",            // imlecin durduğu aktif varlık (eski 📍 · Yol Haritası açıklaması)
  "beceri",           // etmenin beceri sayacı (eski ⚙️ · Yol Haritası etmen satırı)
  "anayasa",          // kural otoritesi: anayasa (eski ⚖️ · koni kartı kural satırı)
  "politika",         // kural otoritesi: politika (eski 📋 · koni kartı kural satırı)
  "tercih",           // kural otoritesi: tercih (eski 🔧 · koni kartı kural satırı)
  // ── VIT-KIMLIK-A07 · okuma modunun yapı başlığı ───────────────────────────
  //    Okuma modu bir webview'dir, yani ailenin FİZİKSEL olarak ulaştığı bir
  //    yüzeydir; başlığındaki işaret bu yüzden Founder kararına bırakılmaz,
  //    aileye çevrilir. Ailede yapı ağacını anlatan bir çizim yoktu ve bu Adım
  //    "eksik simgeleri ailenin kendi diliyle çiz" der.
  "agac",             // okuma modunun 'Yapı Ağacı' başlığı (eski 🌳 · onizleme webview)
  // ── VIT-KIMLIK-A07 · ipucu balonunun işaretleri ───────────────────────────
  //    Kontrolcü hükmü 2026-09-10: ipucu balonu Markdown olarak çizilir ve
  //    dosya adresli görsel kabul eder, yani ailenin ULAŞTIĞI bir yüzeydir.
  //    Balonun işaretlerinden ailede karşılığı bulunmayan dokuzu çizildi.
  "belge",            // belge bloğu açılışı ve kapanışı (eski 📖 · ipucu balonu)
  "etiket",           // belge bölüm etiketi (eski 🏷️ · ipucu balonu)
  "ajan",             // yapay zekâ etmeninin faydası (eski 🤖 · ipucu balonu)
  "varsayilan",       // tipin kanon varsayılanları (eski ✳️ · ipucu balonu)
  "kenar",            // kenar sözcüğünün kartı (eski 🔗 · ipucu balonu)
  "anahtar",          // anahtar sözcüğün kartı (eski 🔑 · ipucu balonu)
  "dil",              // i18n sözlük anahtarı (eski 🌐 · ipucu balonu)
  "islec",            // ifade işleci (eski 🧮 · ipucu balonu)
  "yildiz",           // Kuzey Yıldızı önerisi (eski 🌟 · ipucu balonu)
] as const;
export type SatirSimgesi = (typeof SATIR_SIMGELERI)[number];

/** Satır renklerinin ANLAM ekseni — bugüne dek ThemeColor rolleriyle verilen
 *  anlamların adları. Renk DEĞERLERİ burada yoktur; yalnız üreticinin
 *  ANLAM_RENK çizelgesinde yaşar (YUZ-4.1 — anlam korunur, ham renk gömülmez). */
export const ANLAM_RENKLERI = [
  "duz",       // renksiz ThemeIcon karşılığı (icon.foreground)
  "bilgi",     // charts.blue     — bilgi kaydı
  "uyari",     // charts.yellow   — uyarı kaydı · sürüyor/geliştirmede
  "hata",      // charts.red      — hata kaydı · bloklu
  "basari",    // yeşil aile      — tamamlandı · kabul
  "notr",      // disabledForeground — bekliyor
  "turuncu",   // charts.orange   — etki kenarı · doğrulanmamış
  "kenar",     // sarmal.kenar    — bağımlılık pembesi
  "aktif",     // focusBorder     — aktif seferin nabız vurgusu
] as const;
export type AnlamRengi = (typeof ANLAM_RENKLERI)[number];

/** Bir satır simgesinin currentColor KAYNAK SVG'si (eklenti-köküne göreli yol). */
export function satirSvgKaynagi(ad: SatirSimgesi): string {
  return `${SIMGE_RAFI}/satir-${ad}.svg`;
}

/** Bir satır simgesinin ÜRETİLMİŞ, anlam-renkli varyantı (eklenti-köküne göreli
 *  yol). YUZ-4 kilidi satırlarda da geçerlidir: ŞEKİL=KADEME/İŞ daima (dosya
 *  gövdesi), RENK=ANLAM daima (anlam eki). */
export function satirSvgVaryanti(ad: SatirSimgesi, anlam: AnlamRengi, tema: SimgeTemasi): string {
  return `${URETILMIS_RAF}/satir-${ad}-${anlam}-${tema}.svg`;
}

/** İPUCU HANESİ (VIT-KIMLIK-A07 · kontrolcü hükmü 2026-09-10): ipucu balonuna
 *  gömülen aile işaretinin Markdown yazımı. Balon işareti `<img>` ile çizer ve
 *  `<img>` currentColor çözmez; adres bu yüzden üretilmiş ANLAM-renkli
 *  varyanttır ve renk değeri bu modülde yazılmaz (YUZ-4.1). Alternatif metin
 *  BOŞTUR, çünkü işaret sunumdur ve yanındaki kelime etiketi zaten taşır
 *  (YUZ-4.2). Ölçü VS Code'un `|width=,height=` ekiyle sabitlenir. */
export const IPUCU_ISARET_PX = 14;
export function ipucuIsaretiMd(adres: string): string {
  return `![](${adres}|width=${IPUCU_ISARET_PX},height=${IPUCU_ISARET_PX})`;
}

// ── SATIR SONU HANESİ (VIT-KIMLIK-A07 · Founder sade hâli, 2026-09-13) ───────
//    Editördeki satır sonu notları, yani Founder onayı bekleyen kapı, terfi
//    bekleyen ders ve uyarı, editörün kendi çizim yüzeyindedir ve dekorasyonun
//    görsel ekiyle aile simgesi taşıyabilir. Founder'ın sade hâli kararı yeni
//    çizim ve yeni renk istemez: not, raftaki mevcut simgenin zaten üretilen
//    anlam-renkli varyantıyla çizilir ve kelimesi yanında kalır.
//
//    MEKANİZMA: simge `before`, kelime `after` ekidir. VS Code tek bir ekte hem
//    resim hem metin basamaz, çünkü ikisi aynı CSS `content` alanına yazılır.
//    İki ek aynı dekorun satır sonundaki BOŞ aralığına oturur; `before` önce
//    çizildiği için sıra her zaman simge ve ardından kelimedir. Simge `light`
//    ve `dark` kanallarından verilir, dolayısıyla tema değişince editör doğru
//    varyantı kendisi seçer (eksen hanesiyle aynı desen).
//
//    NABIZ KORUNUR (Founder 2026-07-06 ve 2026-07-17): parlak evre simge ile
//    kelimedir ve simge notun anlam rengini taşır; sönük evre aynı simgenin
//    ailedeki mat varyantıdır ve kelime taşımaz. Bu, eski emojinin soluk renkle
//    çizilen sönük evresinin aile içindeki karşılığıdır.

/** Üç satır sonu notunun simgesi ve parlak evredeki anlam rengi. Anlam, notun
 *  kelimesinin taşıdığı kanon rozet renginin ailedeki karşılığıdır: onay ve
 *  terfi sarı, uyarı turuncudur. */
export const SATIR_SONU_NOTLARI = {
  onayBekliyor:  { simge: "kapi",  anlam: "uyari" },     // Founder onayı bekleyen kapı (eski 📬, sönük evresi 📪)
  terfiBekliyor: { simge: "terfi", anlam: "uyari" },     // terfi bekleyen bellek dersi (eski 🎓)
  uyari:         { simge: "uyari", anlam: "turuncu" },   // uyarı satırı (eski ⚠️)
} as const satisfies Record<string, { simge: SatirSimgesi; anlam: AnlamRengi }>;
export type SatirSonuNotu = keyof typeof SATIR_SONU_NOTLARI;
export type NabizEvresi = "parlak" | "sonuk";
/** Sönük evrenin anlamı: ailenin mat rengi (bekliyor evresinin rengi). */
export const SONUK_ANLAM: AnlamRengi = "notr";

/** Bir satır sonu notunun üretilmiş varyantı (eklenti köküne göreli yol). */
export function satirSonuVaryanti(not: SatirSonuNotu, evre: NabizEvresi, tema: SimgeTemasi): string {
  const { simge, anlam } = SATIR_SONU_NOTLARI[not];
  return satirSvgVaryanti(simge, evre === "parlak" ? anlam : SONUK_ANLAM, tema);
}

/**
 * Satır sonu notunun dekorasyon seçenekleri. Simge `before`, kelime `after`
 * ekidir; kelime verilmezse (sönük evre) yalnız simge çizilir. Dekor aralığı
 * satırın sonunda BOŞ olmalıdır, yoksa `before` satırın başına düşer.
 */
export function satirSonuSecenekleri(
  kabuk: typeof vscode,
  extensionUri: vscode.Uri,
  not: SatirSonuNotu,
  evre: NabizEvresi,
  etiket?: { readonly metin: string; readonly renk: string },
): vscode.DecorationRenderOptions {
  const ek = (tema: SimgeTemasi): vscode.ThemableDecorationAttachmentRenderOptions => ({
    contentIconPath: kabuk.Uri.joinPath(extensionUri, satirSonuVaryanti(not, evre, tema)),
    // Üretilmiş SVG boyutsuzdur; em ölçüsü simgeyi yazı boyuna bağlar. Sol pay
    // eski notun iki boşluğunun, sağ pay simge ile kelime arasının yeridir.
    width: "1em", height: "1em", margin: "0 0.35em 0 1.2em",
  });
  return {
    light: { before: ek("acik") },
    dark: { before: ek("koyu") },
    ...(etiket ? { after: { contentText: etiket.metin, color: etiket.renk } } : {}),
  };
}

/** .sar dosya ikonu (Founder hükmü 2026-08-04): dosyaların kimliği MARKA
 *  ikonudur — Founder'ın kendi çizimi olan gradyanlı sarmal birebir kullanılır;
 *  geometrik aile IDE içindeki eksen satırlarının dilidir, dosya ikonunun değil. */
export const DOSYA_IKON_KAYNAGI = "ikonlar/sarmal.svg";
export const DOSYA_IKONU: Record<SimgeTemasi, string> = {
  acik: DOSYA_IKON_KAYNAGI,
  koyu: DOSYA_IKON_KAYNAGI,
};

// ── EDİTÖR HANESİ (VIT-KIMLIK-A06 · Founder hükmü 2026-08-04: "ide içerisinde ──
//    dosya, mesela blok/katman yazan yerlerde de görünmesi gerekiyor") —
//    geometrik aile kaynak dosyanın İÇİNDE de konuşur: açık bir .sar
//    editöründe altı eksen tipinin bildirim satırlarına, tip adının hemen
//    soluna ilgili simge dekorasyonla basılır.
//
//    MEKANİZMA SEÇİMİ (ölçülmüş gerekçe): TextEditorDecorationType +
//    satır-başına renderOptions.light/dark.before.contentIconPath.
//      • before eki simgeyi tip adının YANINA koyar — Founder'ın hükmü "yazan
//        yerde" der; gutterIconPath satırın dışına düşer ve kesme-noktası/
//        katla oklarıyla yarışır, inset/CodeLens ise satır yüksekliğini bozar.
//      • light/dark kanalları VS Code'un KENDİ tema anahtarına bağlıdır: aktif
//        tema değişince editör doğru varyantı kendisi seçer, ikinci bir
//        onDidChangeActiveColorTheme dinleyicisi kurulmaz.
//    Kaynak metne HİÇBİR düzenleme uygulanmaz: kaydetme, kopyalama, ayrıştırma
//    ve git yüzü baytı baytına aynı kalır (nöbet: sha256 önce=sonra).
//
//    PERFORMANS (Founder'ın kasma regresyonu tekrarlanamaz): parse maliyeti
//    SIFIRDIR — karar, öteki editör süsleriyle paylaşılan AST önbelleğinden
//    (onbellek.programAl · EKL-F9-A06) okur; belge değişimi gecikmeli
//    (debounce) tazelenir, tuş vuruşu başına boyama yapılmaz.

/** VS Code aralığına çevrilmeden önceki saf dekorasyon kararı (0-tabanlı konum). */
export interface EksenDekorKarari {
  readonly satir: number;
  readonly baslangic: number;
  readonly bitis: number;
  readonly tip: EksenTipi;
  readonly evre: KapsayiciEvre;
}

/**
 * Adım durumu → eksen evresi. Eksen ailesinin üretilmiş varyantları ÜÇ evre
 * taşır (bitti · sürüyor · bekliyor — arac/simge-uret.mjs kapsamı); beş Adım
 * durumu bu üç evreye dürüstçe iner: bitmemiş hiçbir durum "bitti" boyanmaz,
 * bloklu nötr kalır (kırmızıyı satır-içi tanı lensi ve rozetler konuşur —
 * ikinci bir kırmızı kanal salience bütçesini aşar, YUZ-4 ②).
 */
export const ADIM_EVRESI: Record<AdimDurumu, KapsayiciEvre> = {
  "tamamlandı":    "bitti",
  "geliştirmede":  "sürüyor",
  "doğrulanmamış": "sürüyor",
  "beklemede":     "bekliyor",
  "bloklu":        "bekliyor",
};

/** Bir eksen düğümünün RENK evresi — kaynağı kanonik durum.ts türetmesidir
 *  (YUZ-1.2 tek kaynak): kendi durumu olan düğüm onu konuşur, kapsayıcı alt
 *  ağacındaki Adımlardan türetir, durumsuz yaprak (Meyve) nötrdür. */
export function eksenEvresi(d: Dugum): KapsayiciEvre {
  const durum = adimDurumu(d);
  if (durum !== undefined && ADIM_YASAM_DURUMLARI.has(durum)) {
    return ADIM_EVRESI[durum as AdimDurumu];
  }
  if (d.cocuklar.length > 0) return kapsayiciEvre(durumTuret(adimDurumlariTopla(d)));
  return "bekliyor";
}

const EKSEN_KUMESI: ReadonlySet<string> = new Set<string>(EKSEN_TIPLERI);

/**
 * Belgedeki eksen bildirimlerinin dekorasyon kararlarını toplar. Program
 * paylaşılan önbellekten gelir (bu işlev parse ETMEZ); bozuk/geçici belgede
 * önbellek undefined verir ve o kare dekorsuzdur — editör akışı kesilmez.
 * Belirteçleyici emoji eşadını kanonik ada çevirir (🍃 → Adım); o satır ZATEN
 * bir simge taşıdığı için ham kaynak dilimi tip adıyla birebir değilse karar
 * verilmez (ham kaynak dilimi tip adıyla birebir olmalıdır). `tipler` kapısı
 * yalnız nöbetin mutasyon kanıtı içindir; üretimde daima çizelge kümesidir.
 */
export function eksenDekorKararlari(
  kaynak: string,
  program: Program | undefined,
  tipler: ReadonlySet<string> = EKSEN_KUMESI,
): EksenDekorKarari[] {
  if (!program) return [];
  const satirlar = kaynak.split("\n");
  const kararlar: EksenDekorKarari[] = [];
  const gez = (d: Dugum): void => {
    if (d.tur === "widget" && tipler.has(d.ad)) {
      const satir = d.satir - 1;
      const baslangic = d.sutun - 1;
      if (satirlar[satir]?.slice(baslangic, baslangic + d.ad.length) === d.ad) {
        kararlar.push({
          satir, baslangic, bitis: baslangic + d.ad.length,
          tip: d.ad as EksenTipi, evre: eksenEvresi(d),
        });
      }
    }
    for (const c of d.cocuklar) gez(c);
  };
  for (const b of program.bildirimler) gez(b);
  return kararlar;
}

/**
 * Eksen simge dekorasyonunun yaşam döngüsü. Tek dekorasyon türü açılışta
 * kurulur; simge farkı satır-başına renderOptions ile verilir (satirici
 * emsali). Belge değişimi `gecikmeMs` ile tazelenir — art arda tuş vuruşları
 * tek boyamaya iner ve Founder'ın kasma regresyonu geri gelemez.
 */
export function eksenDekorKaydi(
  context: vscode.ExtensionContext,
  kabuk: typeof vscode,
  gecikmeMs = 200,
): void {
  const tur = kabuk.window.createTextEditorDecorationType({
    rangeBehavior: kabuk.DecorationRangeBehavior.ClosedClosed,
  });

  // Simge URI'leri tembel kurulur ve anahtar başına BİR KEZ üretilir
  // (6 tip × 3 evre = en çok 18 çift) — boyama döngüsü nesne üretmez.
  const uriBellek = new Map<string, { light: vscode.Uri; dark: vscode.Uri }>();
  const simgeUri = (tip: EksenTipi, evre: KapsayiciEvre): { light: vscode.Uri; dark: vscode.Uri } => {
    const anahtar = `${tip}|${evre}`;
    let cift = uriBellek.get(anahtar);
    if (!cift) {
      cift = {
        light: kabuk.Uri.joinPath(context.extensionUri, eksenSvgVaryanti(tip, evre, "acik")),
        dark:  kabuk.Uri.joinPath(context.extensionUri, eksenSvgVaryanti(tip, evre, "koyu")),
      };
      uriBellek.set(anahtar, cift);
    }
    return cift;
  };

  const ek = (uri: vscode.Uri): vscode.ThemableDecorationAttachmentRenderOptions => ({
    contentIconPath: uri,
    // Üretilmiş SVG boyutsuzdur (yalnız viewBox); em ölçüsü simgeyi yazı
    // boyuna bağlar, sağ pay simgeyi tip adından ayırır.
    width: "1em", height: "1em", margin: "0 0.4em 0 0",
  });

  const boya = (editor: vscode.TextEditor): void => {
    if (editor.document.languageId !== "sarmal") return;
    const dekor: vscode.DecorationOptions[] = eksenDekorKararlari(
      editor.document.getText(), programAl(editor.document),
    ).map((k) => {
      const cift = simgeUri(k.tip, k.evre);
      return {
        range: new kabuk.Range(k.satir, k.baslangic, k.satir, k.bitis),
        renderOptions: { light: { before: ek(cift.light) }, dark: { before: ek(cift.dark) } },
      };
    });
    editor.setDecorations(tur, dekor);
  };

  const gorunenleriBoya = (): void => {
    for (const editor of kabuk.window.visibleTextEditors) boya(editor);
  };

  let zamanlayici: ReturnType<typeof setTimeout> | undefined;
  context.subscriptions.push(
    kabuk.window.onDidChangeVisibleTextEditors(gorunenleriBoya),
    kabuk.workspace.onDidChangeTextDocument((olay) => {
      if (olay.document.languageId !== "sarmal") return;
      if (zamanlayici !== undefined) clearTimeout(zamanlayici);
      zamanlayici = setTimeout(() => { zamanlayici = undefined; gorunenleriBoya(); }, gecikmeMs);
    }),
    { dispose: (): void => {
        if (zamanlayici !== undefined) clearTimeout(zamanlayici);
        tur.dispose();
      } },
  );
  gorunenleriBoya();
}

// ── PARAMETRE HANESİ (VIT-KIMLIK-A08 · Founder isteği 2026-08-30: aile ───────
//    simgeleri editörde, ilgili oldukları parametrelerin yanında görünür).
//    A06'nın eksen deseni parametre satırlarına uzatılır: bir gövdedeki
//    `görev`, `sınır`, `referans`, `kabul` ve kardeşleri SATIR BAŞINDA
//    yazıldığında parametre adının soluna raftaki aile simgesi basılır.
//
//    TEK KAYNAK: parametre adından simgeye eşleme yalnız aşağıdaki çizelgede
//    yaşar. Çizelge dışı ad simge almaz; dekorasyon kodu hiçbir parametre
//    adını kendisi yazmaz. Değerler `SatirSimgesi` tipindedir, dolayısıyla
//    çizelge aileyi GENİŞLETEMEZ, yalnız raftaki mevcut çizimleri yerleştirir.
//    Eşlemenin dayanağı koni kartının alan başlıklarıdır (ARAYUZ_ISARETI):
//    aynı alan editörde ve kartta aynı simgeyle görünür.
//
//    PERFORMANS (PRF-A06 kapısının üstüne biner): karar YALNIZ görünür aralık
//    ve onun bir ekran üstü ile bir ekran altı için verilir; satır metni
//    yalnız aday satırlar için okunur, belge bütünüyle bölünmez. Program
//    paylaşılan AST önbelleğinden gelir. Belge değişimi ve kaydırma gecikmeli
//    tazelenir; her boyamanın süresi ölçülür ve çağırana bildirilir (eklenti
//    bunu Sarmal Performans kanalına yazar).

/** Parametre adı → satır simgesi. Anahtarlar kanonik parametre adlarıdır
 *  (dilin yazdığı biçim); değerler raftaki aile üyeleridir. */
export const PARAMETRE_SIMGESI: Readonly<Record<string, SatirSimgesi>> = {
  "görev":      "gorev",          // koni alanı: görev
  "sınır":      "sinir",          // koni alanı: sınır
  "dokunulmaz": "dokunulmaz",     // koni alanı: dokunulmaz
  "referans":   "referans",       // koni alanı: referans
  "kabul":      "kabul",          // koni alanı: kabul
  "yama":       "yama",           // koni alanı: yama
  "rapor":      "dosya",          // koni alanı: rapor
  "bağımlı":    "baglanti-geri",  // koni kartı: bağımlı olduğu düğümler
  "koşu":       "kosum",          // Adımın koşum kaydı
  "tarih":      "zaman",          // koşum dökümünün saati
  "kurallar":   "kural",          // beceri kartının kural listesi
};

/** Parametre simgelerinin anlam rengi: renksiz ikon karşılığı. Parametre durum
 *  taşımaz; RENK=DURUM kilidi (YUZ-4) eksen satırlarına aittir ve parametre
 *  simgesi o kanalla yarışmamalıdır. Değer bu modülde yazılmaz (YUZ-4.1). */
export const PARAMETRE_ANLAMI: AnlamRengi = "duz";

/** Bir parametre simgesinin üretilmiş varyantı (eklenti köküne göreli yol). */
export function parametreSvgVaryanti(simge: SatirSimgesi, tema: SimgeTemasi): string {
  return satirSvgVaryanti(simge, PARAMETRE_ANLAMI, tema);
}

/** Satır aralığı — 0 tabanlı, iki uç dahil. */
export interface SatirAraligi {
  readonly bas: number;
  readonly son: number;
}

/** VS Code aralığına çevrilmeden önceki saf parametre dekor kararı (0 tabanlı). */
export interface ParametreDekorKarari {
  readonly satir: number;
  readonly baslangic: number;
  readonly bitis: number;
  readonly parametre: string;
  readonly simge: SatirSimgesi;
}

/**
 * Görünür aralıktaki parametre satırlarının dekor kararlarını toplar. Program
 * paylaşılan önbellekten gelir (bu işlev ayrıştırmaz). Bir parametre ancak
 * satırın İLK sözcüğüyse karar alır (satır başı), ham kaynak dilimi adla
 * birebirse karar alır (dizgi ya da yorum içindeki ad AST'de parametre
 * değildir; emoji eşadlı yazım ham dilimde tutmaz) ve ancak çizelgede varsa
 * karar alır. `cizelge` parametresi yalnız nöbetin mutasyon kanıtı içindir.
 */
export function parametreDekorKararlari(
  program: Program | undefined,
  satirOku: (satir: number) => string | undefined,
  araliklar: ReadonlyArray<SatirAraligi>,
  cizelge: Readonly<Record<string, SatirSimgesi>> = PARAMETRE_SIMGESI,
): ParametreDekorKarari[] {
  if (!program || araliklar.length === 0) return [];
  const gorunur = (s: number): boolean => araliklar.some((a) => s >= a.bas && s <= a.son);
  const kararlar: ParametreDekorKarari[] = [];
  const gorulen = new Set<number>();

  const paramBak = (p: { ad: string; satir: number; sutun: number; deger: Dugum["parametreler"][number]["deger"] }): void => {
    const simge = Object.hasOwn(cizelge, p.ad) ? cizelge[p.ad] : undefined;
    const satir = p.satir - 1;
    if (simge !== undefined && !gorulen.has(satir) && gorunur(satir)) {
      const metin = satirOku(satir);
      const baslangic = p.sutun - 1;
      if (metin !== undefined
        && metin.slice(0, baslangic).trim() === ""
        && metin.slice(baslangic, baslangic + p.ad.length) === p.ad) {
        gorulen.add(satir);
        kararlar.push({ satir, baslangic, bitis: baslangic + p.ad.length, parametre: p.ad, simge });
      }
    }
    degerGez(p.deger);
  };
  const degerGez = (d: Dugum["parametreler"][number]["deger"] | undefined): void => {
    if (!d) return;
    if (d.dugum) dugumGez(d.dugum);
    if (d.ogeler) for (const o of d.ogeler) degerGez(o);
  };
  const dugumGez = (d: Dugum): void => {
    for (const p of d.parametreler) paramBak(p);
    for (const p of d.ozellikler) paramBak(p);
    for (const c of d.cocuklar) dugumGez(c);
  };
  for (const b of program.bildirimler) dugumGez(b);
  return kararlar.sort((a, b) => a.satir - b.satir);
}

/** Görünür aralıkları bir ekran yukarı ve bir ekran aşağı genişletir; kısa
 *  kaydırmada simge sonradan belirmez. Sonuç belge sınırına kırpılır. */
export function payliAraliklar(
  gorunur: ReadonlyArray<SatirAraligi>,
  satirSayisi: number,
): SatirAraligi[] {
  return gorunur.map((a) => {
    const yukseklik = a.son - a.bas + 1;
    return { bas: Math.max(0, a.bas - yukseklik), son: Math.min(satirSayisi - 1, a.son + yukseklik) };
  });
}

/** Bir dekor boyamasının ölçümü — eklenti performans kanalına yazar. */
export interface DekorOlcumu {
  readonly sureMs: number;
  readonly simge: number;
  readonly satir: number;
  readonly tetik: "acilis" | "belge" | "kaydirma" | "editor";
}

/**
 * Parametre simge dekorasyonunun yaşam döngüsü (A06 kaydının ikizi). Tek
 * dekorasyon türü açılışta kurulur; simge farkı satır başına renderOptions
 * ile verilir. Belge değişimi `gecikmeMs`, kaydırma `kaydirmaGecikmeMs` ile
 * tazelenir. Her boyama ölçülür ve `olcum` verildiyse ona bildirilir.
 */
export function parametreDekorKaydi(
  context: vscode.ExtensionContext,
  kabuk: typeof vscode,
  olcum?: (o: DekorOlcumu) => void,
  gecikmeMs = 200,
  kaydirmaGecikmeMs = 60,
): void {
  const tur = kabuk.window.createTextEditorDecorationType({
    rangeBehavior: kabuk.DecorationRangeBehavior.ClosedClosed,
  });

  // Simge seçenekleri tembel kurulur ve simge başına BİR KEZ üretilir.
  const secenekBellek = new Map<SatirSimgesi, vscode.DecorationInstanceRenderOptions>();
  const secenek = (simge: SatirSimgesi): vscode.DecorationInstanceRenderOptions => {
    let s = secenekBellek.get(simge);
    if (!s) {
      const ek = (tema: SimgeTemasi): vscode.ThemableDecorationAttachmentRenderOptions => ({
        contentIconPath: kabuk.Uri.joinPath(context.extensionUri, parametreSvgVaryanti(simge, tema)),
        width: "1em", height: "1em", margin: "0 0.4em 0 0",
      });
      s = { light: { before: ek("acik") }, dark: { before: ek("koyu") } };
      secenekBellek.set(simge, s);
    }
    return s;
  };

  const boya = (editor: vscode.TextEditor, tetik: DekorOlcumu["tetik"]): void => {
    const belge = editor.document;
    if (belge.languageId !== "sarmal") return;
    const bas = performance.now();
    const araliklar = payliAraliklar(
      editor.visibleRanges.map((r) => ({ bas: r.start.line, son: r.end.line })),
      belge.lineCount,
    );
    const kararlar = parametreDekorKararlari(
      programAl(belge),
      (n) => (n >= 0 && n < belge.lineCount ? belge.lineAt(n).text : undefined),
      araliklar,
    );
    editor.setDecorations(tur, kararlar.map((k) => ({
      range: new kabuk.Range(k.satir, k.baslangic, k.satir, k.bitis),
      renderOptions: secenek(k.simge),
    })));
    olcum?.({
      sureMs: performance.now() - bas,
      simge: kararlar.length,
      satir: araliklar.reduce((t, a) => t + (a.son - a.bas + 1), 0),
      tetik,
    });
  };

  const gorunenleriBoya = (tetik: DekorOlcumu["tetik"]): void => {
    for (const editor of kabuk.window.visibleTextEditors) boya(editor, tetik);
  };

  let belgeZamanlayici: ReturnType<typeof setTimeout> | undefined;
  const kaydirmaZamanlayici = new Map<vscode.TextEditor, ReturnType<typeof setTimeout>>();
  context.subscriptions.push(
    kabuk.window.onDidChangeVisibleTextEditors(() => gorunenleriBoya("editor")),
    kabuk.window.onDidChangeTextEditorVisibleRanges((olay) => {
      if (olay.textEditor.document.languageId !== "sarmal") return;
      const onceki = kaydirmaZamanlayici.get(olay.textEditor);
      if (onceki !== undefined) clearTimeout(onceki);
      kaydirmaZamanlayici.set(olay.textEditor, setTimeout(() => {
        kaydirmaZamanlayici.delete(olay.textEditor);
        boya(olay.textEditor, "kaydirma");
      }, kaydirmaGecikmeMs));
    }),
    kabuk.workspace.onDidChangeTextDocument((olay) => {
      if (olay.document.languageId !== "sarmal") return;
      if (belgeZamanlayici !== undefined) clearTimeout(belgeZamanlayici);
      belgeZamanlayici = setTimeout(() => { belgeZamanlayici = undefined; gorunenleriBoya("belge"); }, gecikmeMs);
    }),
    { dispose: (): void => {
        if (belgeZamanlayici !== undefined) clearTimeout(belgeZamanlayici);
        for (const z of kaydirmaZamanlayici.values()) clearTimeout(z);
        kaydirmaZamanlayici.clear();
        tur.dispose();
      } },
  );
  gorunenleriBoya("acilis");
}

// ── WEBVIEW HANESİ (VIT-KIMLIK-A07 · dördüncü görev maddesinin ULAŞILABİLİR ──
//    yarısı). Founder 2026-08-05 hükmü arayüz işaretlerini kilitli vektörel
//    aileye bağlar. Ölçüm, hükmün uygulanabildiği yüzeyin dört tane olduğunu
//    gösterdi: ağaç öğesinin ikon alanı, panel ile etkinlik çubuğu ikonu,
//    editör dekorasyonunun ikon alanı ve WEBVIEW İÇİNDEKİ İŞARETLEME. İlk üçü
//    daha önceki hanelerde yaşar; bu hane dördüncüsünü kurar.
//
//    MEKANİZMA (ölçülmüş gerekçe): webview'e simge <img> ile değil GÖMÜLÜ SVG
//    olarak girer. Gerekçe YUZ-4.1'dir — <img> etiketi currentColor ÇÖZMEZ ve
//    simgeyi temadan kopuk sabit bir renge mahkûm eder; gömülü SVG ise
//    kapsayıcısının renk rolünü miras alır, dolayısıyla renk değeri hiçbir
//    yerde yazılmaz. Erişilebilirlik korunur: simge `aria-hidden` işaretlidir
//    ve METİN ETİKETİN YERİNE GEÇMEZ, yalnız yanında durur (YUZ-4.2).

/** Gömülü SVG önbelleği — aynı simge her boyamada diskten okunmaz. */
const govdeBellek = new Map<string, string>();

/**
 * Bir satır simgesinin webview'e GÖMÜLECEK ham SVG gövdesi. `oku` parametresi
 * dosya okuyucusudur ve çağıran tarafından verilir; bu modül `node:fs` bağımlısı
 * DEĞİLDİR ve saflığını (vscode'suz, yan etkisiz) korur.
 */
export function satirSvgGovdesi(
  ad: SatirSimgesi,
  oku: (goreliYol: string) => string,
): string {
  let govde = govdeBellek.get(ad);
  if (govde === undefined) {
    govde = oku(satirSvgKaynagi(ad))
      .replace(/^\s*<svg /, '<svg class="sr-simge" width="1em" height="1em" aria-hidden="true" focusable="false" ')
      .replace(/\n\s*/g, " ")
      .trim();
    govdeBellek.set(ad, govde);
  }
  return govde;
}

/**
 * Bir EKSEN simgesinin webview'e gömülecek ham SVG gövdesi — satır simgesinin
 * ikizidir ve aynı önbelleği paylaşır. Okuma modunun yapı ağacı plan
 * kademelerini (Faz · Blok · Katman · AltKatman · Adım · Meyve) kendi
 * simgeleriyle çizsin diye vardır; ikinci bir çizim yolu doğmaz, çünkü kaynak
 * yine `eksenSvgKaynagi` rafıdır. Önbellek anahtarı eksen adıyla önekli
 * tutulur, böylece satır çizelgesiyle çakışmaz.
 */
export function eksenSvgGovdesi(
  tip: EksenTipi,
  oku: (goreliYol: string) => string,
): string {
  const anahtar = `eksen:${tip}`;
  let govde = govdeBellek.get(anahtar);
  if (govde === undefined) {
    govde = oku(eksenSvgKaynagi(tip))
      .replace(/^\s*<svg /, '<svg class="sr-simge" width="1em" height="1em" aria-hidden="true" focusable="false" ')
      .replace(/\n\s*/g, " ")
      .trim();
    govdeBellek.set(anahtar, govde);
  }
  return govde;
}

/** Sınama kolaylığı: gömülü SVG önbelleğini boşaltır (mutasyon nöbeti kullanır). */
export function govdeBellegiBosalt(): void { govdeBellek.clear(); }

/**
 * ARAYÜZ İŞARETİ ÇİZELGESİ — bugün yüzeylerde emojiyle çizilen her işaretin
 * ailedeki karşılığı. Çizelge TEK KAYNAKTIR: bir yüzey "hangi simge" diye
 * sormaz, metnini `aileyeCevir` süzgecinden geçirir ve karşılık buradan gelir.
 * Böylece aynı emoji iki yüzeyde iki ayrı simgeye çevrilemez.
 *
 * Kapsam yalnız ULAŞILABİLİR yüzeylerdir. Ailenin fiziksel olarak ulaşamadığı
 * yüzeyler (komut paleti başlığı yalnız codicon alır, bildirim ve tanı iletisi
 * düz metindir, durum çubuğu yalnız codicon yazı tipi basar, ağaç öğesinin
 * etiketi ve açıklaması resim taşımaz) bu çizelgenin dışındadır. Founder'ın
 * sade hâli kararı (2026-09-13) oralardaki akıbeti bağladı: işaret düşer ve
 * yalnız kelime kalır.
 */
export const ARAYUZ_ISARETI: Readonly<Record<string, SatirSimgesi>> = {
  "🃏": "kart",             // koni kartının başlığı
  "🎯": "gorev",            // koni alanı: görev
  "✅": "kabul",            // koni alanı: kabul
  "🚧": "sinir",            // koni alanı: sınır
  "🛑": "dokunulmaz",       // koni alanı: dokunulmaz
  "📚": "referans",         // koni alanı: referans
  "📄": "dosya",            // koni alanı: rapor
  "🩹": "yama",             // koni alanı: yama
  "📏": "kural",            // koni kartı: bağlı kurallar
  "📂": "dosya",            // koni kartı: dosyada aç
  "⬅️": "baglanti-geri",    // koni kartı: bağımlı olduğu düğümler
  "➡️": "baglanti-ileri",   // koni kartı: etkilediği düğümler
  "⚡": "dogrudan",         // kenar notu: doğrudan
  "🌊": "gecisli",          // kenar notu: geçişli
  "🔒": "kilit",            // ebedi kural
  "⚖️": "anayasa",          // kural otoritesi: anayasa
  "📋": "politika",         // kural otoritesi: politika
  "🔧": "tercih",           // kural otoritesi: tercih
  "🔬": "kosum",            // konuşma kartının başlığı
  "🕐": "zaman",            // konuşma özeti: saat
  "👤": "kisi",             // konuşma özeti: ajan
  "🎫": "jeton",            // konuşma özeti: token
  "⚙️": "beceri",           // konuşma kartı: beceriler
  "📤": "giden",            // konuşma kartı: ham istem
  "📥": "gelen",            // konuşma kartı: ham yanıt
};

const ISARET_DESENI = new RegExp(
  Object.keys(ARAYUZ_ISARETI)
    .sort((a, b) => b.length - a.length)   // uzun eşleşme önce: "⚙️" (VS16'lı) "⚙"den önce denenir
    .map((e) => e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|"), "gu");

/**
 * Bir yüzey metnindeki her arayüz işaretini ailedeki karşılığıyla değiştirir.
 * Çizelgede karşılığı olmayan işaret DOKUNULMADAN geçer — sessizce silinmez,
 * çünkü kaybolan bir işaret nöbetten de kaçar; kalanı arayüz nöbeti sayar.
 */
export function aileyeCevir(metin: string, oku: (goreliYol: string) => string): string {
  return metin.replace(ISARET_DESENI, (e) => {
    const ad = ARAYUZ_ISARETI[e];
    return ad ? satirSvgGovdesi(ad, oku) : e;
  });
}

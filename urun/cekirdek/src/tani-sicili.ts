// ═══════════════════════════════════════════════════════════════════════════
// tani-sicili.ts — 🗂️ TANI SİCİLİ (RF-T6-A03 · tanı-kenarı altyapısı)
//
//   VARLIK DENETİMİNİN ürettiği tüm tanı kodlarının tek listesi. Kural
//   düğümündeki `tanı:` iddiası ("bu kuralı şu kapı zorlar") bu sicilde
//   DOĞRULANIR — sahte-motor-iddiası yapısal imkânsızlaşır, enforcement karnesi
//   elle rapor olmaktan çıkıp makineden türetilir olur (Founder tema bekçisi
//   bulgusu: "MOTORDA ✅" elle yazılmış cümleydi, makine okumuyordu).
//
//   SİCİLİN KAPSAMI VE İKİ AÇIK MUAFİYETİ. Sicil, kanonun `**Zorlama:**`
//   iddialarına ve VARLIK karnesine bağlı tanı evrenidir; buraya giren her
//   kimlik bir kanon maddesine, karne sayaçlarına ve türetilmiş yüzlerin
//   ölçümlerine katılır. Bu yüzden başlıktaki iddia "motorun üretebildiği her
//   kod" değil, "varlık denetiminin ürettiği her kod" olmalıdır; ikisini
//   karıştıran bir okuma, aşağıdaki muafiyetleri sicil kaçağı sanır.
//     ① Veri-güdümlü tanılar (kanon zorunluKenarlar "tanı" alanları) LİSTEDE
//        DEĞİL — taniSicili(snf) çalışma anında birleştirir (tek kaynak kanon).
//     ② ÇALIŞMA ALANI KÖKÜ KAPILARI da LİSTEDE DEĞİL (KYN-MTR-A02). Yönerge
//        ikizi nöbetinin kimlikleri (`ikizTanisi(...)` ile kurulanlar) iki
//        varlığın da ÜSTÜNDE, kökte çalışır ve hiçbir varlığın karnesine
//        yazılmaz; kimliklerini bu sicile yazmak onları ait olmadıkları bir
//        evrenin sayımına sokardı. Muafiyet varsayıma bırakılmaz: çift-kayıt
//        nöbeti kök kapısı kurucusunu da tarar ve muaf kimlikleri ADIYLA
//        beklediği için, yeni bir kök kapısı tanısı sessizce doğamaz.
//
//   ÇİFT-KAYIT NÖBETİ: bu liste kaynak taramasıyla BİREBİR tutulur —
//   motor-guven.test.ts kaynaktaki kod: "…" desenlerini tarar ve bu listeyle
//   deepEqual karşılaştırır (tamamlama YEDEK_ENUM/B5 emsali). Yeni tanı kodu
//   ekleyen, bu listeye de ekler — yoksa test kırmızı.
// ═══════════════════════════════════════════════════════════════════════════
import type { Siniflama } from "./siniflama.ts";

import type { Duzey } from "./tani.ts";

/**
 * Yeni omurga kanonunun ilan ettiği tanılar (motor turu ikinci halkası).
 *
 * Bir tanı ÜÇ yerde birden yaşar ve üçü birbirine eşit olmak zorundadır: bu
 * sicil kaydı, gerçek üretici işlev ve kanon maddesinin `**Zorlama:**` iddiası.
 * Bu çizelge o üçlünün sicil ayağıdır; her satır tanıyı maddesine, kanonun
 * yazdığı düzeye, kapsamına ve üretici dosyasına bağlar.
 *
 * KADEME ALANI — `kademe` tanının BUGÜN üretildiği düzeydir, `kanonDüzey` ise
 * kanonun hedeflediği düzeydir. Yönetişim kanonu yeni bir hükmün doğrudan hata
 * düzeyinde doğmasını yasaklar: hüküm önce gözlem düzeyinde izlenir, bulguları
 * temizlenip tekrar üretilebilirliği kanıtlandıkça yükselir ve düzey atlanamaz.
 * göç terfi turu A05 kapanışı sonunda Founder'ın 2026-08-03 tarihli açık hükmüyle, kanon
 * hedefi hata olan 46 sıfır-sayaçlı tanı uyarıdan hataya tek kademe çıkmıştır.
 * Kanon hedefi uyarı olan 16 tanı uyarıda, sayaç taşıyan sekiz tanı bilgi
 * kademesinde ve sahipli borçta kalır.
 */
export interface YeniTaniKaydi {
  kod: string;
  /** Kanon maddesinin kodu — iç kayıttır, kullanıcı metnine girmez. */
  madde: string;
  /** Kanonun `**Zorlama:**` satırında yazdığı hedef düzey. */
  kanonDüzey: Duzey;
  /** Tanının kararını verebildiği kapsam. */
  kapsam: "tek-dosya" | "proje" | "kural" | "orkestrasyon";
  /** Tanıyı üreten motor dosyası. */
  uretici: "dogrulayici.ts" | "denetci.ts" | "kuralci.ts" | "denetim.ts";
  /** Tanının bugün üretildiği düzey (terfi kademesi). */
  kademe: Duzey;
}

/** göç terfi turu A06 kapanışı'nın uygulama · doğrulama · kanon iddiası üçlüsü. */
export interface TerfiUcluKaniti {
  uygulama: string;
  dogrulama: string;
  kanon: string;
}

/** Tek-kademe terfinin dört kapısını birlikte ölçen saf girdi. */
export interface TerfiKapisiGirdisi {
  kod: string;
  onceki: Duzey;
  sonraki: Duzey;
  sayaclar: readonly number[];
  ucluKanit: TerfiUcluKaniti;
  acikKabul: string;
}

const SIRADAKI_TERFI_DUZEYI: Readonly<Record<Duzey, Duzey | undefined>> = {
  bilgi: "uyarı", "uyarı": "hata", hata: undefined,
};

/** Boş dizi, sıra+sayaç+üçlü kanıt+açık kabul kapılarının geçtiğini bildirir. */
export function terfiKapisiKusurlari(g: TerfiKapisiGirdisi): string[] {
  const kusurlar: string[] = [];
  if (SIRADAKI_TERFI_DUZEYI[g.onceki] !== g.sonraki)
    kusurlar.push(`${g.kod}: düzey atlama var (${g.onceki}→${g.sonraki}); yalnız bilgi→uyarı→hata sırası geçerlidir`);
  if (!g.sayaclar.length || g.sayaclar.some((s) => !Number.isFinite(s) || s !== 0))
    kusurlar.push(`${g.kod}: bütün canlı sayaçlar ayrı ayrı sıfır değildir`);
  const eksik = Object.entries(g.ucluKanit).filter(([, bag]) => !bag.trim()).map(([ad]) => ad);
  if (eksik.length) kusurlar.push(`${g.kod}: üçlü kanıt eksiktir (${eksik.join(" · ")})`);
  if (!g.acikKabul.trim()) kusurlar.push(`${g.kod}: yetkili açık kabul yoktur`);
  return kusurlar;
}

export const YENI_TANI_KANONU: readonly YeniTaniKaydi[] = [
  { kod: "kanonik-kaynak-biçimi", madde: "DIL-1", kanonDüzey: "hata", kapsam: "proje", uretici: "denetci.ts", kademe: "hata" },
  { kod: "orthografi-kaybı", madde: "DIL-1.1", kanonDüzey: "uyarı", kapsam: "proje", uretici: "denetci.ts", kademe: "uyarı" },
  { kod: "belge-şekil-drift", madde: "DIL-2", kanonDüzey: "hata", kapsam: "tek-dosya", uretici: "dogrulayici.ts", kademe: "hata" },
  { kod: "çok-satırlı-değer-drift", madde: "DIL-2.2", kanonDüzey: "uyarı", kapsam: "tek-dosya", uretici: "dogrulayici.ts", kademe: "uyarı" },
  { kod: "kenar-tip-uyuşmazlığı", madde: "DIL-3.1", kanonDüzey: "hata", kapsam: "proje", uretici: "denetci.ts", kademe: "hata" },
  { kod: "numara-grafı-uyumsuz", madde: "DIL-5", kanonDüzey: "hata", kapsam: "proje", uretici: "denetci.ts", kademe: "hata" },
  { kod: "madde-kodu-uyumsuz", madde: "DIL-5.1", kanonDüzey: "hata", kapsam: "proje", uretici: "denetci.ts", kademe: "hata" },
  { kod: "ilgili-önek-geçersiz", madde: "DIL-5.2", kanonDüzey: "hata", kapsam: "tek-dosya", uretici: "dogrulayici.ts", kademe: "hata" },
  { kod: "proje-köksüz-üretim", madde: "MIM-1.1", kanonDüzey: "hata", kapsam: "proje", uretici: "denetci.ts", kademe: "hata" },
  { kod: "çok-teknolojili-katman", madde: "MIM-1.4", kanonDüzey: "hata", kapsam: "proje", uretici: "denetci.ts", kademe: "hata" },
  { kod: "adım-atomikliği", madde: "MIM-1.6", kanonDüzey: "uyarı", kapsam: "proje", uretici: "denetci.ts", kademe: "bilgi" },
  { kod: "üretimsiz-meyve", madde: "MIM-2", kanonDüzey: "hata", kapsam: "proje", uretici: "denetci.ts", kademe: "hata" },
  { kod: "meyve-dosyası-eksik", madde: "MIM-2.1", kanonDüzey: "hata", kapsam: "proje", uretici: "denetci.ts", kademe: "hata" },
  { kod: "öğretim-kaynak-drifti", madde: "OGR-2", kanonDüzey: "hata", kapsam: "proje", uretici: "denetci.ts", kademe: "hata" },
  { kod: "öğretim-yüzü-uyumsuz", madde: "OGR-2.1", kanonDüzey: "uyarı", kapsam: "orkestrasyon", uretici: "denetim.ts", kademe: "uyarı" },
  { kod: "beceri-kartı-eksik", madde: "OGR-2.2", kanonDüzey: "uyarı", kapsam: "proje", uretici: "denetci.ts", kademe: "bilgi" },
  { kod: "başvuru-sicil-drifti", madde: "OGR-2.3", kanonDüzey: "hata", kapsam: "proje", uretici: "denetci.ts", kademe: "hata" },
  { kod: "öğretim-etki-eksik", madde: "OGR-3", kanonDüzey: "hata", kapsam: "proje", uretici: "denetci.ts", kademe: "hata" },
  { kod: "öğretim-bayat", madde: "OGR-3.1", kanonDüzey: "uyarı", kapsam: "proje", uretici: "denetci.ts", kademe: "uyarı" },
  { kod: "önceliksiz-adım", madde: "ORK-3.4", kanonDüzey: "bilgi", kapsam: "proje", uretici: "denetci.ts", kademe: "bilgi" },
  { kod: "ateşlemiş-hatırlatıcı", madde: "YUZ-3.4", kanonDüzey: "bilgi", kapsam: "proje", uretici: "denetci.ts", kademe: "bilgi" },
  { kod: "üretilmiş-öğretim-değiştirilmiş", madde: "OGR-3.2", kanonDüzey: "hata", kapsam: "proje", uretici: "denetci.ts", kademe: "hata" },
  { kod: "kanıtsız-beceri-terfisi", madde: "OGR-4", kanonDüzey: "uyarı", kapsam: "proje", uretici: "denetci.ts", kademe: "uyarı" },
  { kod: "ilişki-sınıfı-ihlali", madde: "ORK-1", kanonDüzey: "hata", kapsam: "proje", uretici: "denetci.ts", kademe: "hata" },
  { kod: "mimari-bağı-ihlali", madde: "ORK-1.1", kanonDüzey: "hata", kapsam: "proje", uretici: "denetci.ts", kademe: "hata" },
  { kod: "yürütme-kenarı-sözleşmesi", madde: "ORK-1.2", kanonDüzey: "hata", kapsam: "proje", uretici: "denetci.ts", kademe: "bilgi" },
  { kod: "üretim-kökeni-ihlali", madde: "ORK-1.3", kanonDüzey: "hata", kapsam: "proje", uretici: "denetci.ts", kademe: "bilgi" },
  { kod: "kullanır-kenarı-ihlali", madde: "ORK-2.4", kanonDüzey: "hata", kapsam: "proje", uretici: "denetci.ts", kademe: "bilgi" },
  { kod: "deterministik-sıra-ihlali", madde: "ORK-3", kanonDüzey: "hata", kapsam: "proje", uretici: "denetci.ts", kademe: "hata" },
  { kod: "seçilemez-adım-yürütümü", madde: "ORK-3.2", kanonDüzey: "uyarı", kapsam: "proje", uretici: "denetci.ts", kademe: "bilgi" },
  { kod: "döngü-sonlanması-eksik", madde: "ORK-3.3", kanonDüzey: "hata", kapsam: "proje", uretici: "denetci.ts", kademe: "hata" },
  { kod: "kapı-kabul-kanıtı-eksik", madde: "ORK-3.3", kanonDüzey: "hata", kapsam: "proje", uretici: "denetci.ts", kademe: "hata" },
  { kod: "çapraz-proje-ad-alanı", madde: "ORK-4", kanonDüzey: "hata", kapsam: "proje", uretici: "denetci.ts", kademe: "hata" },
  { kod: "auth-omurgası-ihlali", madde: "ORK-5", kanonDüzey: "hata", kapsam: "proje", uretici: "denetci.ts", kademe: "hata" },
  { kod: "founder-ortak-auth-eksik", madde: "ORK-5.2", kanonDüzey: "hata", kapsam: "proje", uretici: "denetci.ts", kademe: "hata" },
  { kod: "şef-akışı-ihlali", madde: "ORK-6", kanonDüzey: "hata", kapsam: "proje", uretici: "denetci.ts", kademe: "hata" },
  { kod: "üretici-denetçi-çakışması", madde: "ORK-6.1", kanonDüzey: "hata", kapsam: "proje", uretici: "denetci.ts", kademe: "hata" },
  { kod: "oturum-adım-sınırı", madde: "ORK-6.2", kanonDüzey: "uyarı", kapsam: "proje", uretici: "denetci.ts", kademe: "uyarı" },
  { kod: "unutma-kapısı-ihlali", madde: "STR-1", kanonDüzey: "hata", kapsam: "proje", uretici: "denetci.ts", kademe: "hata" },
  { kod: "kanon-kodu-uyumsuz", madde: "STR-1.1", kanonDüzey: "hata", kapsam: "proje", uretici: "denetci.ts", kademe: "hata" },
  { kod: "göç-sırası-ihlali", madde: "STR-2", kanonDüzey: "hata", kapsam: "proje", uretici: "denetci.ts", kademe: "hata" },
  { kod: "göç-kapısı-eksik", madde: "STR-2.1", kanonDüzey: "uyarı", kapsam: "proje", uretici: "denetci.ts", kademe: "uyarı" },
  { kod: "açık-gizli-sınır-ihlali", madde: "STR-3", kanonDüzey: "hata", kapsam: "proje", uretici: "denetci.ts", kademe: "hata" },
  { kod: "çekirdek-bağımlılık-drifti", madde: "STR-3.1", kanonDüzey: "uyarı", kapsam: "proje", uretici: "denetci.ts", kademe: "uyarı" },
  { kod: "yürütücü-bağımlılığı", madde: "STR-3.2", kanonDüzey: "hata", kapsam: "proje", uretici: "denetci.ts", kademe: "hata" },
  { kod: "etki-yayın-kapısı-eksik", madde: "STR-5", kanonDüzey: "uyarı", kapsam: "proje", uretici: "denetci.ts", kademe: "uyarı" },
  { kod: "ölü-iz", madde: "STR-5", kanonDüzey: "uyarı", kapsam: "proje", uretici: "denetci.ts", kademe: "uyarı" },
  { kod: "tip-evreni-eksik", madde: "TIP-1", kanonDüzey: "hata", kapsam: "proje", uretici: "denetci.ts", kademe: "hata" },
  { kod: "omurga-tipi-eksik", madde: "TIP-1.15", kanonDüzey: "hata", kapsam: "proje", uretici: "denetci.ts", kademe: "hata" },
  { kod: "şema-tanımı-eksik", madde: "TIP-2", kanonDüzey: "hata", kapsam: "proje", uretici: "denetci.ts", kademe: "hata" },
  { kod: "şema-dışı-alan", madde: "TIP-2.2", kanonDüzey: "uyarı", kapsam: "tek-dosya", uretici: "dogrulayici.ts", kademe: "bilgi" },
  { kod: "örtü-ihlali", madde: "TIP-2.5", kanonDüzey: "uyarı", kapsam: "proje", uretici: "denetci.ts", kademe: "uyarı" },
  { kod: "rejim-beyanı-eksik", madde: "YAS-1", kanonDüzey: "hata", kapsam: "proje", uretici: "denetci.ts", kademe: "hata" },
  { kod: "katı-rejim-altkatman-eksik", madde: "YAS-1.1", kanonDüzey: "hata", kapsam: "proje", uretici: "denetci.ts", kademe: "hata" },
  { kod: "rejim-geçiş-uyumsuzluğu", madde: "YAS-1.3", kanonDüzey: "uyarı", kapsam: "proje", uretici: "denetci.ts", kademe: "uyarı" },
  { kod: "hüküm-türü-uyumsuz", madde: "YAS-2", kanonDüzey: "hata", kapsam: "kural", uretici: "kuralci.ts", kademe: "hata" },
  { kod: "kural-sözleşmesi-eksik", madde: "YAS-2.3", kanonDüzey: "hata", kapsam: "kural", uretici: "kuralci.ts", kademe: "hata" },
  { kod: "tanı-sözleşmesi-uyumsuz", madde: "YAS-3", kanonDüzey: "hata", kapsam: "orkestrasyon", uretici: "denetim.ts", kademe: "hata" },
  { kod: "tanı-kapsamı-karışması", madde: "YAS-3.2", kanonDüzey: "hata", kapsam: "orkestrasyon", uretici: "denetim.ts", kademe: "hata" },
  { kod: "proje-tanı-kimliği-uyumsuz", madde: "YAS-3.3", kanonDüzey: "hata", kapsam: "orkestrasyon", uretici: "denetim.ts", kademe: "hata" },
  { kod: "tanı-terfi-kapısı-ihlali", madde: "YAS-4", kanonDüzey: "hata", kapsam: "kural", uretici: "kuralci.ts", kademe: "hata" },
  { kod: "sahte-tam-yeşil", madde: "YAS-4.1", kanonDüzey: "hata", kapsam: "orkestrasyon", uretici: "denetim.ts", kademe: "hata" },
  { kod: "terfi-kanıtı-eksik", madde: "YAS-4.2", kanonDüzey: "uyarı", kapsam: "proje", uretici: "denetci.ts", kademe: "bilgi" },
  { kod: "prizma-kaynak-ayrışması", madde: "YUZ-1", kanonDüzey: "hata", kapsam: "proje", uretici: "denetci.ts", kademe: "hata" },
  { kod: "eş-yetkili-yüz-ikizi", madde: "YUZ-1.2", kanonDüzey: "hata", kapsam: "proje", uretici: "denetci.ts", kademe: "hata" },
  { kod: "yüz-idempotans-drifti", madde: "YUZ-1.3", kanonDüzey: "uyarı", kapsam: "proje", uretici: "denetci.ts", kademe: "uyarı" },
  { kod: "geliştirme-yüzü-drifti", madde: "YUZ-3", kanonDüzey: "uyarı", kapsam: "proje", uretici: "denetci.ts", kademe: "uyarı" },
  { kod: "tanı-yüzü-uyumsuz", madde: "YUZ-3.1", kanonDüzey: "uyarı", kapsam: "orkestrasyon", uretici: "denetim.ts", kademe: "uyarı" },
  { kod: "yüzey-sözleşmesi-eksik", madde: "YUZ-4", kanonDüzey: "hata", kapsam: "proje", uretici: "denetci.ts", kademe: "hata" },
  { kod: "palet-yüz-drifti", madde: "YUZ-4.1", kanonDüzey: "hata", kapsam: "proje", uretici: "denetci.ts", kademe: "hata" },
  { kod: "görünürlük-sözleşmesi-eksik", madde: "YUZ-5", kanonDüzey: "hata", kapsam: "tek-dosya", uretici: "dogrulayici.ts", kademe: "hata" },
  // göç motor turu A08 kapanışı (2026-07-27 · devredilen bulgu D-4): kanonun YUZ-3.3 maddesi
  // yetmişinci bir yeni tanı ilan ediyordu; birinci halkanın envanteri onu
  // atlamıştı ve üçlü senkron tek yönlü ölçüldüğü için delik görünmemişti.
  // Kapsam orkestrasyondur: bir tanının doğasına uygun SUNUM YÜZEYİNE
  // yönlendirilip yönlendirilmediği, ancak bütün koşumun tanıları toplandıktan
  // sonra karara bağlanabilir (emsali `tanı-yüzü-uyumsuz` · YUZ-3.1).
  { kod: "tanı-yüzeyi-karışması", madde: "YUZ-3.3", kanonDüzey: "uyarı", kapsam: "orkestrasyon", uretici: "denetim.ts", kademe: "uyarı" },
  // Founder ölçümü (2026-08-27): ORK-8 mevsim ritüelini dört basamaklı bir kapanışa
  // bağlar ve gerekçesinde bizzat Temmuz mevsiminin bir yorum satırıyla kapatıldığını
  // yazar; madde bilgi düzeyindedir ve bugüne dek motorda hiçbir karşılığı yoktu.
  // Kapsam projedir: Faz kendi dosyasında, sardığı Bloklar başka dosyalardadır.
  { kod: "mevsim-vadesi-geçti", madde: "ORK-8", kanonDüzey: "bilgi", kapsam: "proje", uretici: "denetci.ts", kademe: "bilgi" },
];

/** Yeni tanı kimliğinden sicil kaydına erişim (üreticiler düzeyi buradan okur). */
export const YENI_TANI_INDEKS: ReadonlyMap<string, YeniTaniKaydi> =
  new Map(YENI_TANI_KANONU.map((k) => [k.kod, k]));

/** Yeni kanonun ilan ettiği tanı kimlikleri. */
export const YENI_TANI_KODLARI: readonly string[] = YENI_TANI_KANONU.map((k) => k.kod);

/** Yeni omurgadan önce yazılmış, kaynakta sabit duran tanı kodları (Türkçe sıra). */
export const ONCEKI_TANI_KODLARI: readonly string[] = [
  "ad-ayracı", "ad-biçimi", "aile-geçersiz", "anadizin-plan-karışması", "açık-adım", "açık-hatırlatıcı",
  "ağırlık-toplamı", "bağımlılık-mekanik", "beceri-drift", "beceri-terfisi", "beyansız-yapı",
  "belge-yanlış-düğüm", "bildirilmemiş-dosya", "bilinmeyen-kapsam", "bilinmeyen-tip", "birleşim-çatışması", "bloklu-çapa",
  "boş-kapsam", "derin-dal", "diakritik-kayıp", "doc-drift", "doğuş-eksik", "doğuş-sırası",
  "durum-tutarsızlığı", "durumsuz-adım", "durunca-sözlüğü",
  "doğrulanamayan-tanı-iddiası", "doğrulanmamış-çapa",
  "döngüsel-bağımlılık", "düzyazı-koşul", "düşük-kontrast", "ebedi-ihlal",
  "eksik-alan", "eşik-sırası", "fazsız-blok", "gateway-izin-biçim", "gayrimeşru-geçiş",
  "katmansız-adım",
  "geliştirmede-çapa", "geçersiz-durum", "geçersiz-enum", "geçersiz-renk",
  "geçersiz-tür", "gizli-bağımlılık", "halef-döngü", "halefsiz-revize", "kırık-halef", "ham-renk",
  "harf-farkı", "ilansız-gövde", "izinsiz-sarma", "kapsayıcı-kenar",
  "kararlaşmış-hatırlatıcı", "karşılıksız-metin-atfı", "katman-uyumsuz", "katmansız-teknoloji",
  "kavuşumsuz-dilim", "kavuşumsuz-paralellik", "kayıp-kenar", "kayıp-yapı", "kenar-metin",
  "kod-ilk-değil", "koni-taşması", "kopuk-zincir", "kullanımsız-tip", "kural-ihlali",
  "olgunluk-onayı",
  "kural-çatışması", "kırık-koşar", "kırık-referans", "mühür-kırık",
  "dayanaksız-kural",
  "mühürsüz-ebedi", "normalizasyon-uyumsuz", "planlanmamış-gövde", "planlanmamış-çelişki", "politika-dayanaksız", "rafsız-anadizin", "çift-mevsim-kaydı",
  "rbac-apex-tekil", "rbac-l5-paylaşık", "rbac-l6-kalıcı", "rbac-yönetici-üretir", "çıplak-adımlı-katman",
  "günsüz-tarih",
  "sahipsiz-belge", "silo-blok", "söz-dizim", "tarif-eksik",
  "tek-çocuk-kapsayıcı", "teknolojisiz-yüzey", "uygulanmamış-karar", "yanlış-alan",
  "yer-uyuşmazlığı", "yetim-meyve", "yinelenen-kod", "yinelenen-parametre",
  "zorlanamayan-koşul", "zorlanamayan-kural", "öneksiz-blok", "öz-bağımlılık",
];

/** Göçte emekli kararı verilen ve sabit ya da sınıflama-türevli canlı sicilde bulunmayan kimlikler. */
export const EMEKLI_TANI_KODLARI: readonly string[] = [
  "anadizin-yüzey-şişmesi", "ayakizi-bulunamadı", "dayanak-halef",
  "dayanak-hedef-tür", "defter-referansı", "durum-boyutu", "eski-giriş-adı", "faz-gecikti", "faz-tarihsiz",
  "faz-yaklasiyor", "hatırlatıcı-vade", "kırıntı-adım", "tek-cocuk-kapsayici", "uzak-vade", "öneksiz-anadizin",
];

/** Emeklilik kararı bulunmasına rağmen sabit ya da sınıflama-türevli sicilde hâlâ duran uyumluluk borcu. */
export const EMEKLILIK_BORCU_TANI_KODLARI: readonly string[] = [
  "ad-ayracı", "aile-geçersiz", "anadizin-plan-karışması", "ağırlık-toplamı", "bağımlılık-beyansız", "bağımlılık-mekanik",
  "derin-dal", "doğrulanmamış-çapa", "doğuş-eksik", "doğuş-sırası",
  "durumsuz-adım", "düzyazı-koşul", "eşik-sırası", "geçersiz-durum", "gizli-bağımlılık",
  "günsüz-tarih", "harf-farkı", "kararlaşmış-hatırlatıcı", "katmansız-adım",
  "kavuşumsuz-paralellik", "kayıp-kenar", "koni-taşması", "kopuk-zincir", "kullanımsız-tip",
  "kural-ihlali", "meyvesiz-geliştirme", "mühürsüz-ebedi", "niyet-drift", "olgunluk-onayı", "planlanmamış-gövde",
  "planlanmamış-çelişki", "tarif-eksik", "teknolojisiz-yüzey", "zorlanamayan-koşul",
  "referanssız-geliştirme", "çift-mevsim-kaydı", "çıplak-adımlı-katman", "öneksiz-blok",
];

/** Kaynak kodda sabit yazılan tanı kodlarının TAMAMI (önceki küme ∪ yeni kanon). */
export const SABIT_TANI_KODLARI: readonly string[] = [...ONCEKI_TANI_KODLARI, ...YENI_TANI_KODLARI];

/**
 * TAM tanı sicili: sabit kodlar ∪ kanonun veri-güdümlü tanıları
 * (zorunluKenarlar "tanı" alanları — konisiz-adım · öksüz-düğme · …).
 * Kural.tanı iddia-doğrulaması ve kural-karnesi yüzü buradan okur.
 */
export function taniSicili(snf?: Pick<Siniflama, "zorunluKenarlar">): Set<string> {
  const sicil = new Set(SABIT_TANI_KODLARI);
  for (const kurallar of Object.values(snf?.zorunluKenarlar ?? {})) {
    for (const k of kurallar) if (k.tanı) sicil.add(k.tanı);
  }
  return sicil;
}

// ═══ KATLANMIŞ ARAMA ADI (göç motor turu A02 kapanışı · Karar A ikinci parça) ══════════════
//
//   Kanonik tanı kimliği tam Türkçe orthografi taşır (DIL-1.1). Bu, ASCII
//   araç zincirinin (grep · yapılandırma · CI bayrağı) verdiği tek gerçek
//   faydayı — aranabilirliği — kaybettirmesin diye motor kanonik kimlikten
//   bir KATLANMIŞ AD türetir. Katlanmış ad bir KİMLİK DEĞİLDİR: sicilde
//   yaşamaz, takma ad olarak kaydedilmez, yedek enum kurmaz ve hiçbir motor
//   çıktısında basılmaz. Yalnız GİRDİ tarafında kabul edilir; çözüm sonucu
//   her zaman kanonik yazımdır. Orthografi kanonda, uyum indekstedir.

/** Türkçe diakritiği düşürülmüş, küçük harfe indirgenmiş arama biçimi. */
export function katlanmisAd(kod: string): string {
  return kod.normalize("NFC")
    .replace(/ç/g, "c").replace(/Ç/g, "C")
    .replace(/ğ/g, "g").replace(/Ğ/g, "G")
    .replace(/ı/g, "i").replace(/İ/g, "I")
    .replace(/ö/g, "o").replace(/Ö/g, "O")
    .replace(/ş/g, "s").replace(/Ş/g, "S")
    .replace(/ü/g, "u").replace(/Ü/g, "U")
    .replace(/â/g, "a").replace(/Â/g, "A")
    .toLowerCase();
}

/**
 * Girdiyi kanonik tanı kimliğine çözer. Hem kanonik yazım hem katlanmış
 * yazım kabul edilir; dönen değer HER ZAMAN kanonik kimliktir. Sicilde
 * karşılığı olmayan ya da iki ayrı kanonik kimliğe düşen belirsiz girdi
 * için `undefined` döner — uydurma kimlik basılmaz.
 */
export function taniKodCoz(
  girdi: string,
  snf?: Pick<Siniflama, "zorunluKenarlar">,
): string | undefined {
  const sicil = taniSicili(snf);
  const ham = girdi.normalize("NFC").trim();
  if (sicil.has(ham)) return ham;
  const aranan = katlanmisAd(ham);
  let bulunan: string | undefined;
  for (const kanonik of sicil) {
    if (katlanmisAd(kanonik) !== aranan) continue;
    if (bulunan !== undefined) return undefined;   // belirsiz katlama — kimlik seçilmez
    bulunan = kanonik;
  }
  return bulunan;
}

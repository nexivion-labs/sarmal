// ═══════════════════════════════════════════════════════════════════════════
// surum-tazeligi.ts — 📦 KURULU PAKET İLE DEPO SÜRÜMÜNÜN KARŞILAŞTIRILMASI
//                        (BKM-DNT-A12 · HTR-SURUM-DAMGASI-TUZAGI)
//
//   ÖLÇÜLMÜŞ TUZAK. 2026-08-08 tarihinde Founder'ın kurulu paketi 5 Ağustos
//   derlemesini taşırken depodaki derleme 8 Ağustos tarihliydi; iki paket de
//   aynı sürüm numarasını taşıdığı için yürütücü kurulu paketi hiç değiştirmedi
//   ve üç günlük iş kullanıcıya hiç ulaşmadı. Geliştirici özelliğin çalıştığını
//   sanarken kullanıcı özelliğin kaybolduğunu gördü.
//
//   İKİNCİ VAKA GEREKÇEYİ SERTLEŞTİRDİ (2026-08-28). Founder panelde
//   `doğrulanamayan-tanı-iddiası` uyarısı gördü; uyarı kaynakta GERÇEK DEĞİLDİ.
//   Belirtinin sebebi, kurulu eklentinin tanıyı henüz tanımayan bir motoru
//   çalıştırmasıydı. Yani asıl tuzak paketin üretilmemesi değil, üretilenin
//   KULLANICIYA ULAŞMAMASIDIR: bayat paket, ürünün kanonuyla çeliştiğini
//   söyleyerek aracın bütün iddiasını zayıflatır.
//
//   BU GÖVDE SAFTIR ve düzenleyiciye dokunmaz: sürümleri ve kipi argüman olarak
//   alır, kararı döndürür. Böylece nöbet gerçek bir düzenleyici indirmeden
//   koşabilir ve karar mantığı yüzeyden bağımsız sınanır.
//
//   MAĞAZA KURULUMUNDA SUSAR. Karşılaştırmanın anlamı yalnız GELİŞTİRME çalışma
//   alanında vardır, çünkü orada depo ile kurulu paket aynı makinede yaşar ve
//   ayrışmaları mümkündür. Mağazadan kurulan bir pakette depo yoktur;
//   karşılaştırılacak ikinci bir sürüm de yoktur ve uyarı üretmek kullanıcıya
//   anlamsız bir gürültü olurdu.
//
//   DERLEME DAMGASI (EKL-F6-A11). Sürüm numarası tek başına 2026-08-08 vakasını
//   göremez, çünkü o vakada iki paket de aynı numarayı taşıyordu. Damga, paketin
//   üretildiği İŞLEMENİN kimliğidir ve `arac/kur.mjs` onu geçici çalışma
//   ağacındaki paket bildirimine `sarmalDerleme.isleme` alanı olarak yazar; ana
//   ağaçtaki bildirim hiç değişmez. İçerik özeti seçilmedi, çünkü kurulu paketin
//   özetini depo tarafında karşılayacak bir değer yoktur; derleme anında gömülen
//   bir sabit de seçilmedi, çünkü o değer paket gövdesinin içinde kalır ve
//   kurulum betiği onu okumak için iki megabaytlık gövdeyi taramak zorunda kalırdı.
//
//   NÖBET İKİ YERDE KOŞAR VE İŞİ BÖLÜŞÜRLER. Kurulum betiği kurulumdan hemen
//   sonra kurulu paketi az önce üretilen paketle sürüm VE damga üzerinden
//   karşılaştırır; aynı numarayla yeniden paketleme tuzağını yalnız bu karşılaştırma
//   görür. Eklenti açılışı ise yalnız SÜRÜM karşılaştırır ve paketin hiç
//   kurulmadığı vakayı yakalar (2026-08-28 ve 2026-09-11); bu vakada kurulum betiği
//   hiç koşmadığı için onun nöbeti de koşmaz. Açılışta damga karşılaştırılmaz,
//   çünkü depo tarafındaki tek karşılık HEAD işlemesidir ve son iki yüz işlemenin
//   yetmiş dokuzu ürüne hiç dokunmamıştır; HEAD ile karşılaştırma her plan
//   işlemesinde sahte bir bayatlık uyarısı üretirdi.
// ═══════════════════════════════════════════════════════════════════════════

import { join } from "node:path";

/** Paket bildiriminde derleme damgasının yaşadığı alan (EKL-F6-A11). */
export const DERLEME_DAMGASI_ALANI = "sarmalDerleme";

/** Eklentinin mağaza kimliği: yayımcı ve ad, VS Code'un kayıt biçimiyle. */
export const EKLENTI_KIMLIGI = "nexivion-labs.sarmal";

/** Depo kökünden eklentinin paket bildirimine giden göreli yol. */
export const DEPO_PAKET_YOLU = join("urun", "eklenti", "package.json");

/** Karşılaştırmanın girdisi — hepsi çağıranın ölçtüğü olgulardır. */
export interface SurumOlgusu {
  /** Çalışan (kurulu) eklentinin kendi bildirdiği sürüm. */
  readonly kuruluSurum: string;
  /** Depodaki paket bildiriminin sürümü; depo yoksa tanımsızdır. */
  readonly depoSurumu?: string;
  /** Geliştirme çalışma alanı mı? Mağaza kurulumunda `false`. */
  readonly gelistirmeKipi: boolean;
  /** Kurulu paketin derleme damgası; damgasız pakette tanımsızdır. */
  readonly kuruluDamga?: string;
  /** Depo tarafındaki derlemenin damgası; yalnız kurulum betiği bilir. */
  readonly depoDamgasi?: string;
}

/** Karşılaştırmanın sonucu; `undefined` "söylenecek bir şey yok" demektir. */
export interface SurumAyrismasi {
  /** Panelde basılacak tek satır. */
  readonly satir: string;
  readonly kuruluSurum: string;
  readonly depoSurumu: string;
  /** Ayrışmanın türü: sürüm geride mi, yoksa aynı numarada başka bir derleme mi. */
  readonly neden: "eski-surum" | "ayni-surum-baska-derleme";
}

/** Bir paketin karşılaştırmaya giren kimliği. */
export interface PaketKimligi {
  readonly surum: string;
  readonly damga?: string;
}

/** Dosya okuyucusu — okunamayan dosya için `undefined` döner, fırlatmaz. */
export type Okuyucu = (yol: string) => string | undefined;

/** Bilinmeyen bir değerin alanını güvenle okur. */
function alan(deger: unknown, ad: string): unknown {
  return deger !== null && typeof deger === "object" ? (deger as Record<string, unknown>)[ad] : undefined;
}

/** Boş olmayan dizeyi kırpılmış hâliyle verir. */
function dolu(deger: unknown): string | undefined {
  return typeof deger === "string" && deger.trim() ? deger.trim() : undefined;
}

/** Damganın ilk yedi hanesi; iletide okunur kalsın diye. */
function kisa(damga: string): string {
  return damga.slice(0, 7);
}

/**
 * Paket bildirimi metninden kimlik çıkarır. Bildirim bu eklentiye ait değilse,
 * okunamıyorsa ya da sürüm taşımıyorsa sonuç yoktur; yabancı bir projenin aynı
 * yoldaki paket bildirimi bu yüzden hiçbir zaman karşılaştırmaya girmez.
 */
export function paketKimligiCoz(metin: string | undefined): PaketKimligi | undefined {
  if (!metin) return undefined;
  let p: unknown;
  try { p = JSON.parse(metin); } catch { return undefined; }
  const kimlik = `${String(alan(p, "publisher"))}.${String(alan(p, "name"))}`.toLowerCase();
  if (kimlik !== EKLENTI_KIMLIGI) return undefined;
  const surum = dolu(alan(p, "version"));
  if (!surum) return undefined;
  return { surum, damga: dolu(alan(alan(p, DERLEME_DAMGASI_ALANI), "isleme")) };
}

/**
 * Paket bildirimine derleme damgasını yazar ve yeni metni döndürür. Kurulum
 * betiği bunu yalnız geçici çalışma ağacındaki bildirim üstünde çağırır.
 */
export function damgaliBildirim(metin: string, isleme: string): string {
  const p = JSON.parse(metin) as Record<string, unknown>;
  p[DERLEME_DAMGASI_ALANI] = { isleme };
  return `${JSON.stringify(p, null, 2)}\n`;
}

/**
 * Kurulu paketi uzantı klasöründen okur. Klasörün yeri ve okuma işi dışarıdan
 * verilir; gövde yalnız VS Code'un kendi kayıt dosyasına (`extensions.json`) ve
 * oradan gösterilen tek paketin bildirimine bakar, klasörü taramaz. Aynı
 * klasörde silinmeyi bekleyen eski sürüm klasörleri durabilir ve onları ayırt
 * edebilen tek kaynak bu kayıttır.
 */
export function kuruluPaketiOku(uzantiKlasoru: string, oku: Okuyucu): (PaketKimligi & { readonly dizin: string }) | undefined {
  let kayit: unknown;
  try { kayit = JSON.parse(oku(join(uzantiKlasoru, "extensions.json")) ?? ""); } catch { return undefined; }
  if (!Array.isArray(kayit)) return undefined;
  let secilen: (PaketKimligi & { readonly dizin: string }) | undefined;
  for (const girdi of kayit) {
    if (dolu(alan(alan(girdi, "identifier"), "id"))?.toLowerCase() !== EKLENTI_KIMLIGI) continue;
    const goreli = dolu(alan(girdi, "relativeLocation"));
    const dizin = goreli ? join(uzantiKlasoru, goreli) : dolu(alan(alan(girdi, "location"), "fsPath"));
    if (!dizin) continue;
    const kimlik = paketKimligiCoz(oku(join(dizin, "package.json")));
    if (kimlik && (!secilen || surumIleriMi(kimlik.surum, secilen.surum))) secilen = { ...kimlik, dizin };
  }
  return secilen;
}

/** Depo keşfinin okuyucuları — ikisi de eşzamansızdır ve fırlatmaz. */
export interface DepoOkuyucu {
  oku(yol: string): Promise<string | undefined>;
  /** Kökün yalnız BİR kat altındaki klasör adları; gizli klasörler verilmez. */
  altKlasorler(kok: string): Promise<readonly string[]>;
}

/**
 * Çalışma alanında bu eklentinin deposunu arar. Önce her kökün kendisine,
 * bulunamazsa her kökün yalnız bir kat altındaki klasörlerine bakılır; çatı
 * penceresi depoyu tam olarak bu derinlikte taşır. Daha derine inilmez, çünkü
 * mağaza kullanıcısının çalışma alanında depo yoktur ve orada yapılacak her
 * fazladan okuma boşa harcanan açılış zamanıdır.
 */
export async function depoPaketiBul(
  kokler: readonly string[],
  g: DepoOkuyucu,
): Promise<{ readonly yol: string; readonly kimlik: PaketKimligi } | undefined> {
  for (const kok of kokler) {
    const yol = join(kok, DEPO_PAKET_YOLU);
    const kimlik = paketKimligiCoz(await g.oku(yol));
    if (kimlik) return { yol, kimlik };
  }
  for (const kok of kokler) {
    for (const alt of await g.altKlasorler(kok)) {
      const yol = join(kok, alt, DEPO_PAKET_YOLU);
      const kimlik = paketKimligiCoz(await g.oku(yol));
      if (kimlik) return { yol, kimlik };
    }
  }
  return undefined;
}

/** Kurulumun doğrulama hükmü. */
export type KurulumHukmu =
  | { readonly tur: "olculemedi" }
  | { readonly tur: "uyumlu"; readonly kurulu: PaketKimligi }
  | { readonly tur: "ayrisma"; readonly kurulu: PaketKimligi; readonly ayrisma: SurumAyrismasi };

/**
 * Kurulum betiğinin nöbeti: kurulu paketi az önce üretilen paketle karşılaştırır.
 * Klasörün yeri ve okuma işi dışarıdan verilir, böylece nöbet sahte bir uzantı
 * klasörüyle sınanır ve kullanıcının gerçek kurulumuna hiç dokunmaz.
 */
export function kurulumuDogrula(uzantiKlasoru: string, uretilen: PaketKimligi, oku: Okuyucu): KurulumHukmu {
  const kurulu = kuruluPaketiOku(uzantiKlasoru, oku);
  if (!kurulu) return { tur: "olculemedi" };
  const ayrisma = surumAyrismasi({
    kuruluSurum: kurulu.surum, kuruluDamga: kurulu.damga,
    depoSurumu: uretilen.surum, depoDamgasi: uretilen.damga,
    gelistirmeKipi: true,
  });
  return ayrisma ? { tur: "ayrisma", kurulu, ayrisma } : { tur: "uyumlu", kurulu };
}

/** `1.2.10` biçimini sayısal parçalara böler; sayı olmayan parça sıfır sayılır. */
function parcala(s: string): number[] {
  return s.split(/[.+-]/u).map((p) => {
    const n = Number.parseInt(p, 10);
    return Number.isFinite(n) ? n : 0;
  });
}

/**
 * Karşılaştırma: a, b'den ileri mi? Sözlük sırası KULLANILMAZ, çünkü `0.9.137`
 * ile `0.9.90` sözlükte yanlış sıralanır ve tuzağın tam da bu ölçekte doğduğu
 * ölçülmüştür (0.9.137 · 0.9.143 · 0.9.159 sürümleri).
 */
export function surumIleriMi(a: string, b: string): boolean {
  const x = parcala(a);
  const y = parcala(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const fark = (x[i] ?? 0) - (y[i] ?? 0);
    if (fark !== 0) return fark > 0;
  }
  return false;
}

/**
 * Ayrışmayı ölçer. Uyarı YALNIZ şu üç koşul birlikte sağlandığında doğar:
 * geliştirme kipindeyiz, depo sürümü okunabildi ve depo sürümü kurulu paketten
 * İLERİDE. Depo geride ise susulur, çünkü o hâl geliştiricinin bilerek eski bir
 * dala geçmesi olabilir ve uyarı yanlış yönlendirirdi.
 */
export function surumAyrismasi(olgu: SurumOlgusu): SurumAyrismasi | undefined {
  if (!olgu.gelistirmeKipi) return undefined;
  const depo = olgu.depoSurumu?.trim();
  if (!depo || !olgu.kuruluSurum.trim()) return undefined;
  if (surumIleriMi(depo, olgu.kuruluSurum)) {
    return {
      kuruluSurum: olgu.kuruluSurum,
      depoSurumu: depo,
      neden: "eski-surum",
      satir: `Kurulu eklenti ${olgu.kuruluSurum} sürümünü çalıştırıyor, depodaki paket bildirimi ise ${depo} sürümünde;`
        + " kurulu paket bayat olduğu için panelde gördüğün sonuç kaynağın bugünkü hâlini yansıtmayabilir."
        + " Paketi yeniden kurmadan panel çıktısını kaynak hükmü sayma.",
    };
  }
  if (surumIleriMi(olgu.kuruluSurum, depo)) return undefined;
  // Sürümler EŞİT. Damga ancak depo tarafı onu biliyorsa ölçülür; açılışta depo
  // damgası yoktur ve yarım ölçümle hüküm verilmez. Kurulum betiğinde ise üretilen
  // paketin damgası daima bilinir; kurulu paketin damgası farklıysa ya da hiç
  // yoksa düzenleyici aynı numaralı eski paketi yerinde bırakmış demektir.
  const depoDamgasi = olgu.depoDamgasi?.trim();
  if (!depoDamgasi) return undefined;
  const kuruluDamga = olgu.kuruluDamga?.trim();
  if (kuruluDamga === depoDamgasi) return undefined;
  const kaynak = kuruluDamga ? `${kisa(kuruluDamga)} işlemesinden` : "damgasız bir derlemeden";
  return {
    kuruluSurum: olgu.kuruluSurum,
    depoSurumu: depo,
    neden: "ayni-surum-baska-derleme",
    satir: `Kurulu eklenti ${olgu.kuruluSurum} sürümünü ${kaynak} çalıştırıyor, depodaki derleme ise aynı sürümü`
      + ` ${kisa(depoDamgasi)} işlemesinden üretiyor; aynı numarayla yeniden paketlenen eklenti düzenleyicide tazelenmez.`
      + " Sürümü ilerletip paketi yeniden kur.",
  };
}

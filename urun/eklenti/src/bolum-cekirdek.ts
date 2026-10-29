// ═══════════════════════════════════════════════════════════════════════════
// bolum-cekirdek.ts — 🧩 BÖLÜM YUVASININ SAF ÇEKİRDEĞİ (VIT-K78-A10)
//
//   Founder hükmü (2026-09-28, 2026-09-29'da yinelendi): Sarmal'ın VS Code'daki
//   simgesi tektir. Kabın içinde Ray açık eklentinin kendi bölümüdür, öteki
//   bölümleri kardeş eklentiler kaydeder. Açık eklenti tek başına kurulduğunda
//   yalnız Ray (ve Tren ile Makinist) vardır.
//
//   Founder 2026-10-21 (ikinci hüküm): bölüm şeridi bir WEBVIEW olamaz. VS Code
//   her webview görünümüne kendi başlık çubuğunu koyar ve gövdenin altında
//   yüz elli piksele yakın boşluk bırakır. Üç bölüm simgesi bu yüzden yerel
//   görünüm başlığı eylemleridir (`view/title`, group `navigation`): kabın o
//   an EN ÜSTÜNDE görünen görünümünün başlığında Ray · Tren · Makinist durur,
//   seçili olanın simgesi dolu/vurgulu sürümdür. Kardeş bölüm varken dördüncü
//   bir "Diğer bölümler" eylemi görünür ve QuickPick açar.
//
//   Seçilen bölümün görünümleri bağlam anahtarlarıyla görünür kılınır. Ray'in
//   ağaç panelleri olduğu gibi kalır; yalnız bir `when` koşulu kazanırlar.
//
//   Kardeş eklentinin bölümü açık eklentinin önceden ilan ettiği dört yuva
//   görünümünden birine yerleşir; yuvanın webview sağlayıcısı, kaydı yapan
//   eklentinin verdiği sağlayıcıya devredilir. Açık eklenti kardeşi TANIMAZ:
//   yalnız kimlik, ad, simge ve sağlayıcı alır.
//
//   Bu dosya VS Code'u tanımaz. Defter (kim kayıtlı, hangi yuvada, hangisi
//   seçili) ve başlık eylemlerinin modeli burada üretilir ve kabuksuz sınanır;
//   kabuk (bolum-yuvasi.ts) yalnız bu kararları editöre uygular.
// ═══════════════════════════════════════════════════════════════════════════

/** Açık eklentinin kendi bölümünün kimliği; hiçbir kardeş bu kimliği alamaz. */
export const RAY_BOLUMU = "ray";
/** Bağımlılık grafı bölümü (Founder 2026-10-21): Mini Graf artık Ray'in parçası değil kendi bölümüdür. */
export const GRAF_BOLUMU = "graf";
/** Yapay zekâ ajanları bölümü (Founder 2026-10-21); kardeşe ayrılmıştır. */
export const TREN_BOLUMU = "tren";
/** İnsan bölümü (Founder 2026-10-21); kardeşe ayrılmıştır. */
export const MAKINIST_BOLUMU = "makinist";
/** Şeritteki yerleşik sekmeler, soldan sağa. Hiçbiri kardeşe verilmez. */
export const YERLESIK_BOLUMLER = [RAY_BOLUMU, GRAF_BOLUMU, TREN_BOLUMU, MAKINIST_BOLUMU] as const;
export type YerlesikBolum = (typeof YERLESIK_BOLUMLER)[number];

export function yerlesikMi(kimlik: string): kimlik is YerlesikBolum {
  return (YERLESIK_BOLUMLER as readonly string[]).includes(kimlik);
}

/** Kardeş bölümlerinin yerleştiği yuva görünüşleri (package.json ile birebir). */
export const YUVA_GORUNUSLERI = [
  "sarmalBolumYuvasi1", "sarmalBolumYuvasi2", "sarmalBolumYuvasi3", "sarmalBolumYuvasi4",
] as const;

// Founder 2026-10-21 (dördüncü hüküm, bağlayıcı çizim): kapta her an YALNIZ BİR görünüm
// görünür. Dört yerleşik bölüm ayrı görünüm değildir; hepsi `sarmalPanel` webview
// görünümünün içindedir (sekme şeridi: Ray · Tren · Makinist; Mini Graf Ray sekmesinin
// parçasıdır). VS Code kapta birden çok görünüm varken her görünüme kendi başlığını
// koyar ve webview'in altında boşluk bırakır; tek görünüm olunca görünüm başlığı kap
// başlığıyla birleşir ve webview bütün yüksekliği kaplar. Bu bir nöbetle ölçülür.

/** Kabın tek görünür görünümü: yerleşik bölümlerin hepsi buradadır. */
export const PANEL_GORUNUSU = "sarmalPanel";

/**
 * Bağlam anahtarları. `rayGizli` bilerek OLUMSUZ yazılır: eklenti etkinleşmeden
 * önce anahtar tanımsızdır ve tanımsız bir anahtarın olumsuzu doğrudur, yani
 * Ray panelleri etkinleşme beklenirken de görünür kalır.
 */
export const BAGLAM = {
  /** Seçili bölümün yuvası: yerleşik bölümde kendi kimliği ("ray" · "tren" · "makinist"),
   *  kardeşte "yuva1".."yuva4". Yuva görünüşleri bunu okur. */
  seciliYuva: "sarmal.bolum.seciliYuva",
  /** Ray dışındaki bir bölüm seçiliyken doğru; Ray panelleri bunun olumsuzunu okur. */
  rayGizli: "sarmal.bolum.rayGizli",
  /** Seçili bölümün kimliği; Tren ve Makinist görünümleri `== tren` / `== makinist` koşuluyla
   *  buna bağlanır, kardeş eklenti de kendi ek görünümlerini bağlayabilir. */
  secili: "sarmal.bolum.secili",
  /** En az bir kardeş bölüm kayıtlıyken doğru; "Diğer bölümler" başlık eylemi bunu okur. */
  kardesVar: "sarmal.bolum.kardesVar",
  /**
   * Kapalı Tren eklentisi (kardeş) etkinleştiğinde KENDİ eklentisi doğru yapar: açık Tren
   * görünümü gizlenir ve kardeşin `sarmal-yol` kabına katkı verdiği görünüm Tren bölümünün
   * tek görünümü olur. Açık eklenti bu anahtarı yazmaz, yalnız okur.
   */
  trenKardes: "sarmal.tren.kardes",
  /** Sarmal panelinin seçili sekmesi ("ray" · "tren" · "makinist" · "sinyaller" · "ayarlar"); başlık eylemleri (Yenile · Ray değiştir · Mini Graf görünümü) Ray'e özgüdür ve bunu okur. */
  panelSekme: "sarmal.panel.sekme",
} as const;

/** Başlık eylemlerinin komut kimlikleri (package.json ile birebir). Seçili ve seçili
 *  olmayan durum AYRI komuttur: komut simgesi `when` ile değişmez, bu yüzden her
 *  bölümün düz ve seçili sürümü ayrı bir komut olarak ilan edilir; ikisi aynı
 *  işi görür (bölümü seçer). */
export const BOLUM_KOMUTLARI = {
  ray: { duz: "sarmal.bolum.ray", secili: "sarmal.bolum.raySecili" },
  graf: { duz: "sarmal.bolum.graf", secili: "sarmal.bolum.grafSecili" },
  tren: { duz: "sarmal.bolum.tren", secili: "sarmal.bolum.trenSecili" },
  makinist: { duz: "sarmal.bolum.makinist", secili: "sarmal.bolum.makinistSecili" },
} as const satisfies Record<YerlesikBolum, { duz: string; secili: string }>;

/** Kardeş bölümlerden birini seçtiren dördüncü başlık eylemi. */
export const BOLUM_DIGER_KOMUTU = "sarmal.bolum.diger";

/**
 * Seçili bölümün görünümü. Yerleşik bölümlerin hepsi `sarmalPanel` içindedir; kardeşin
 * bölümü kendi yuva görünümündedir (yuva görünümleri bugün kapta gösterilmez: Founder
 * 2026-10-21 kapta yalnız tek görünüm görünsün dedi, kardeş bölümün sekme olarak
 * panele girişi ayrı bir işin konusudur).
 */
export const BASLIK_GORUNUSLERI = {
  ray: PANEL_GORUNUSU,
  graf: PANEL_GORUNUSU,
  tren: PANEL_GORUNUSU,
  makinist: PANEL_GORUNUSU,
  yuva1: "sarmalBolumYuvasi1", yuva2: "sarmalBolumYuvasi2", yuva3: "sarmalBolumYuvasi3", yuva4: "sarmalBolumYuvasi4",
} as const;

/** Yuva sırasının bağlam değeri: 0 tabanlı yuva sırası → "yuva1".. */
export function yuvaBaglamDegeri(yuva: number): string {
  return `yuva${yuva + 1}`;
}

/** Kimlik ASCII'dir (H15): küçük harfle başlar, küçük harf, rakam ve tire taşır. */
export const BOLUM_KIMLIK_DESENI = /^[a-z][a-z0-9-]{1,39}$/;

// ── 🛡️ TAKLİT KORUMASI (VIT-K78-A10 güvenlik sıkılaştırması) ───────────────
//   Kardeş bölümü sırada açık eklentinin kendi yüzüyle karıştırılabilecek bir
//   adla duramaz: "Sarmal" ile dört yerleşik bölümün adları (Ray · Graf · Tren · Makinist ve İngilizce karşılıkları
//   Rail · Train · Driver) ayrılmıştır. Karşılaştırma büyük-küçük
//   harfe ve baştaki ya da sondaki boşluğa duyarsızdır; Türkçe İ, ı ve I aynı
//   harfe indirgenir, böylece "SARMAL", " ray " ya da "RAY" biçimleri de reddedilir.

/** Kardeş bölümlerinin alamayacağı adlar (normalize edilmiş biçimde). */
export const AYRILMIS_ADLAR = ["ray", "sarmal", "graf", "tren", "makinist", "rail", "graph", "train", "driver"] as const;

/** Adı karşılaştırma biçimine indirger: kırpılır, iki yerel ayarda küçültülür, ı/i birleşir. */
export function adNormalize(ad: string): string {
  // NFKD tek başına iki işi görür: tam genişlik ve uyumluluk biçimlerini düz
  // harfe indirir (NFKC'nin kapsadığı hâller) ve birleşik işaretleri ayırır.
  // NFKC ayrıca uygulanmaz; mutasyon onun bu zincirde etkisiz kaldığını ölçtü.
  return ad
    .normalize("NFKD")                       // tam genişlik, uyumluluk ve ayrıştırma
    .replace(/\p{Cf}/gu, "")                // sıfır genişlik, yumuşak tire, yön işaretleri
    .replace(/\p{M}/gu, "")                 // birleşik işaretler (â, İ'nin noktası gibi)
    .toLocaleLowerCase("tr").toLocaleLowerCase("en")
    .replace(/ı/g, "i")
    .trim();
}

export function ayrilmisAdMi(ad: string): boolean {
  const n = adNormalize(ad);
  return (AYRILMIS_ADLAR as readonly string[]).some((a) => adNormalize(a) === n);
}

// ── 🧭 KAYDEDEN EKLENTİNİN KİMLİĞİ ───────────────────────────────────────────
//   VS Code bir API çağrısını kimin yaptığını söylemez. Uzantı süreci bütün
//   eklentileri tek Node sürecinde koşturduğu için çağrı yığını çağıranın dosya
//   yolunu taşır; açık eklentinin kendi kökü dışındaki İLK kare, kurulu bir
//   eklentinin kökü altındaysa kaydı yapan eklentidir. Kök bulunamazsa kayıt
//   reddedilir: sahibi okunamayan bir bölüm sıraya giremez.

/**
 * Çağrı yığınının dosya yollarını HAM CallSite nesnelerinden okur. Yığın metni
 * okunmaz: kaynak eşleme kancaları (ör. source-map-support) `prepareStackTrace`
 * ile metni özgün kaynak yollarına yeniden yazar ve metinden ölçülen sahip
 * yanlış çıkardı. Kanca geçici olarak CallSite dizisini döndüren işlevle
 * değiştirilir ve `finally` içinde eski hâline konur.
 */
export function yiginDosyalari(sinir = 64): string[] {
  const eskiKanca = Error.prepareStackTrace;
  const eskiSinir = Error.stackTraceLimit;
  try {
    Error.stackTraceLimit = sinir;
    Error.prepareStackTrace = (_e, cs) => cs;
    const kareler = new Error().stack as unknown as NodeJS.CallSite[] | undefined;
    const out: string[] = [];
    for (const k of Array.isArray(kareler) ? kareler : []) {
      let ad = k.getFileName?.() ?? undefined;
      if (!ad) continue;
      if (ad.startsWith("file://")) { try { ad = decodeURIComponent(new URL(ad).pathname); } catch { continue; } }
      if (ad.startsWith("/") || /^[A-Za-z]:[\\/]/.test(ad)) out.push(ad);
    }
    return out;
  } finally {
    Error.prepareStackTrace = eskiKanca;
    Error.stackTraceLimit = eskiSinir;
  }
}

/** Yol `kok` altında mı (kökün kendisi dahil)? Ayırıcı sınırı gözetilir: /a/b, /a/bc'yi kapsamaz. */
export function altindaMi(yol: string, kok: string): boolean {
  const k = kok.replace(/[\\/]+$/, "");
  if (k === "") return false;
  return yol === k || yol.startsWith(k + "/") || yol.startsWith(k + "\\");
}

export interface EklentiKoku { kimlik: string; ad: string; kok: string }

/**
 * Kaydı yapan eklenti. Her kare, kökü o kareyi kapsayan EN UZUN köklü eklentiye
 * aittir (iç içe kurulmuş eklentilerde en dar sahip). Açık eklentinin kendi
 * kareleri atlanır; ondan sonraki ilk kare belirleyicidir. O karenin hiçbir
 * eklentiye ait olmaması (ör. editörün kendi kodu) sahibin okunamadığı demektir.
 */
export function sahibiBul(dosyalar: readonly string[], eklentiler: readonly EklentiKoku[], kendiKok: string): EklentiKoku | undefined {
  for (const d of dosyalar) {
    const aday = eklentiler.filter((e) => altindaMi(d, e.kok)).sort((a, b) => b.kok.length - a.kok.length)[0];
    const kendi = altindaMi(d, kendiKok) && (!aday || aday.kok.length <= kendiKok.replace(/[\\/]+$/, "").length);
    if (kendi) continue;
    return aday;
  }
  return undefined;
}

export type SimgeKarari = { tur: "tamam"; kok: string } | { tur: "ret"; sebep: "sema" | "yol" | "kok-disi" | "genis-kok" };

/**
 * Simge yalnız `file:` şemasında ve sahibin kendi eklenti kökü altında kabul edilir.
 * Webview'e eklenen yerel kaynak kökü simgenin KENDİ klasörüdür; sahibin kökünün
 * dışına ya da dosya sisteminin köküne açılan bir klasör reddedilir.
 */
export function simgeKarari(sema: string, hamYol: string, gercekYol: string | undefined, sahipKok: string): SimgeKarari {
  if (sema !== "file") return { tur: "ret", sebep: "sema" };
  // ".." taşıyan ya da gerçek yola çözülemeyen (yok, erişilemez) simge reddedilir.
  if (/(^|[\\/])\.\.([\\/]|$)/.test(hamYol) || gercekYol === undefined) return { tur: "ret", sebep: "yol" };
  const yol = gercekYol;
  if (!altindaMi(yol, sahipKok) || yol === sahipKok.replace(/[\\/]+$/, "")) return { tur: "ret", sebep: "kok-disi" };
  const klasor = yol.replace(/[\\/][^\\/]*$/, "");
  if (klasor === "" || /^[A-Za-z]:$/.test(klasor) || !altindaMi(klasor, sahipKok)) return { tur: "ret", sebep: "genis-kok" };
  return { tur: "tamam", kok: klasor };
}

/** Sahibi artık kurulu ve etkin olmayan bölümlerin kimlikleri. */
export function sahipsizBolumler(kayitlar: readonly { kimlik: string; sahip: string }[], canli: ReadonlySet<string>): string[] {
  return kayitlar.filter((k) => !canli.has(k.sahip)).map((k) => k.kimlik);
}

export type KayitReddi =
  | "kimlik-bicimi"
  | "kimlik-ayrilmis"
  | "kimlik-yinelenen"
  | "ad-bos"
  | "ad-ayrilmis"
  | "yuva-yok";

export type KayitSonucu =
  | { tur: "tamam"; yuva: number }
  | { tur: "ret"; sebep: KayitReddi };

/** Bölüm sırasında görünen tek bir öge. Yerleşik dörtlü (Ray · Graf · Tren · Makinist) daima ilk dört ögedir. */
export interface SiraOgesi {
  kimlik: string;
  ad: string;
  /** Yerleşik bölümler için tanımsızdır; kardeş bölümün oturduğu yuvanın sırası. */
  yuva?: number;
}

interface Kayit<T> {
  kimlik: string;
  ad: string;
  yuva: number;
  ek: T;
}

/**
 * Bölüm defteri. Kayıt sırası sıranın sırasıdır; Ray en baştadır. Yuva seçimi
 * önce HİÇ KULLANILMAMIŞ yuvayı verir: kalkan bir bölümün yuvası ancak başka
 * boş yuva kalmadığında yeniden verilir, böylece eski bölümün webview'i yeni
 * bölümün yuvasında yeniden doğmaz.
 */
export class BolumDefteri<T = undefined> {
  private readonly kayitlar: Kayit<T>[] = [];
  private readonly kullanilmis = new Set<number>();
  private seciliKimlik: string = RAY_BOLUMU;

  private readonly yuvaSayisi: number;

  constructor(yuvaSayisi: number = YUVA_GORUNUSLERI.length) {
    this.yuvaSayisi = yuvaSayisi;
  }

  kaydet(kimlik: string, ad: string, ek: T): KayitSonucu {
    if (typeof kimlik !== "string" || !BOLUM_KIMLIK_DESENI.test(kimlik)) return { tur: "ret", sebep: "kimlik-bicimi" };
    if (yerlesikMi(kimlik)) return { tur: "ret", sebep: "kimlik-ayrilmis" };
    if (this.kayitlar.some((k) => k.kimlik === kimlik)) return { tur: "ret", sebep: "kimlik-yinelenen" };
    if (typeof ad !== "string" || ad.trim() === "") return { tur: "ret", sebep: "ad-bos" };
    if (ayrilmisAdMi(ad)) return { tur: "ret", sebep: "ad-ayrilmis" };
    const yuva = this.bosYuva();
    if (yuva === undefined) return { tur: "ret", sebep: "yuva-yok" };
    this.kullanilmis.add(yuva);
    this.kayitlar.push({ kimlik, ad: ad.trim(), yuva, ek });
    return { tur: "tamam", yuva };
  }

  /** Bölümü düşürür. Seçili bölüm düşerse seçim Ray'e döner. */
  dusur(kimlik: string): { dustu: boolean; seciliDegisti: boolean } {
    const i = this.kayitlar.findIndex((k) => k.kimlik === kimlik);
    if (i < 0) return { dustu: false, seciliDegisti: false };
    this.kayitlar.splice(i, 1);
    if (this.seciliKimlik !== kimlik) return { dustu: true, seciliDegisti: false };
    this.seciliKimlik = RAY_BOLUMU;
    return { dustu: true, seciliDegisti: true };
  }

  /** Seçer; bilinmeyen kimlikte hiçbir şey değişmez ve yanlış döner. */
  sec(kimlik: string): boolean {
    if (!yerlesikMi(kimlik) && !this.kayitlar.some((k) => k.kimlik === kimlik)) return false;
    this.seciliKimlik = kimlik;
    return true;
  }

  get secili(): string {
    return this.seciliKimlik;
  }

  /** Seçili bölümün yuva bağlam değeri: yerleşikte kendi kimliği, kardeşte "yuvaN". */
  get seciliYuva(): string {
    const k = this.kayitlar.find((x) => x.kimlik === this.seciliKimlik);
    return k ? yuvaBaglamDegeri(k.yuva) : this.seciliKimlik;
  }

  /** Sıra: yerleşik üçlü başta, ardından kayıt sırasıyla kardeş bölümleri.
   *  `adlar` yerleşik bölümlerin görünen adlarıdır; verilmeyen kimliğin kendisidir. */
  sira(adlar: Readonly<Partial<Record<YerlesikBolum, string>>> = {}): SiraOgesi[] {
    return [
      ...YERLESIK_BOLUMLER.map((kimlik) => ({ kimlik: kimlik as string, ad: adlar[kimlik] ?? kimlik })),
      ...this.kayitlar.map((k) => ({ kimlik: k.kimlik, ad: k.ad, yuva: k.yuva })),
    ];
  }

  ek(kimlik: string): T | undefined {
    return this.kayitlar.find((k) => k.kimlik === kimlik)?.ek;
  }

  yuvaEki(yuva: number): T | undefined {
    return this.kayitlar.find((k) => k.yuva === yuva)?.ek;
  }

  get kayitSayisi(): number {
    return this.kayitlar.length;
  }

  private bosYuva(): number | undefined {
    const dolu = new Set(this.kayitlar.map((k) => k.yuva));
    for (let i = 0; i < this.yuvaSayisi; i++) if (!dolu.has(i) && !this.kullanilmis.has(i)) return i;
    for (let i = 0; i < this.yuvaSayisi; i++) if (!dolu.has(i)) return i;
    return undefined;
  }
}

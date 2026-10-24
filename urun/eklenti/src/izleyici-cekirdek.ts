// ═══════════════════════════════════════════════════════════════════════════
// izleyici-cekirdek.ts — 🧯 İZLEYİCİ ÇEKİRDEĞİ (PRF-A02 · VS Code'suz saf mantık)
//
//   SRN-IDE-KASMA-SOL-KOSUSU onarımının saf parçaları (Sol RED-1 P2/D1/R1
//   onarımlarıyla): kapsam TEK KAYNAKTAN gelir, olay hattı (süzgeç + geciktirme)
//   sınanabilir bir sınıftır, tek-uçuş kilidi çöken turu sessiz yutmaz.
//
//   Modül vscode'suzdur; davranış testi (sinama/izleyici.test.ts) host istemez
//   ve GERÇEK hattı sahte-zamanlayıcıyla koşturur (sentetik sınıflama değil).
// ═══════════════════════════════════════════════════════════════════════════

import { dosyaMuhru } from "../../cekirdek/src/kimlik.ts";   // MIM-3.4: dosya mührünü tek çözücü tanır
import { kapsamIcinde } from "./yolharitasi-cekirdek.ts";   // 🩹 BKM-DNT-A18: kapsama ilişkisinin tek evi

/**
 * 📐 KAPSAM TEK-KAYNAĞI (Sol RED-1 D1 onarımı): süzgeç ile tam taramanın
 * dışlama kümesi AYNI listeden türetilir — taramaya girebilen bir dosyanın
 * olayı asla süzülmez, süzülen bir yol asla taranmaz.
 *
 * Küme, çekirdek denetçinin disk-yürüyüş kanonuyla hizalıdır (denetci.ts
 * YOKSAY: nokta-önekli girdiler + node_modules · __pycache__ · dist · out
 * içine inilmez). Nokta-önekli kural .git · .sarmal · .vscode · .DS_Store
 * dâhil bütün gizli dizin/dosyaları kapsar.
 *
 * ⚖️ KPS-IND-A01 (Founder hükmü 2026-09-10): küme 2026-09-10 tarihine kadar
 * arşiv, fikstür, şablon ve örnek ADLARINI da taşıyordu ve o adlar denetlenen
 * her ağacın her yol parçasına uygulanıyordu; Türkçe bir üründe bunlar sıradan
 * klasör adları olduğu için kullanıcının kendi kitaplığı sessizce görünmez
 * kalıyordu. Ders dışlaması artık kendi evine, yani öğreti kitaplığına
 * demirlidir ve bu listede yalnız bağımlılık ile derleme çıktısı kalır.
 */
/** MIM-3.4 · DOSYA MÜHRÜ (KPS-MHR-A01 · Founder hükmü 2026-09-11): adının başında
 *  arşiv, eğitim ya da sonra mührü taşıyan `.sar` dosyası panelin tarama evrenine
 *  girmez. Arşiv ile sonra mühürlü dosyayı motor da okumaz; eğitim mühürlü dosya
 *  ders rafıyla aynı yoldan yürür. Mührü ÇEKİRDEĞİN TEK ÇÖZÜCÜSÜ tanır, eklenti
 *  ikinci bir desen yazmaz (YUZ-3.1: iki yüz aynı dosyaya aynı hükmü verir). Yalnız
 *  `.sar` adına bakılır; aynı biçimde adlandırılmış bir KLASÖR mühür sayılmaz,
 *  çünkü hüküm dosya adına yazılan beyanı tanır. */
export function muhurluSarMi(yol: string): boolean {
  return yol.endsWith(".sar") && dosyaMuhru(yol) !== undefined;
}

export const DISLANAN_ADLAR = [
  "node_modules", "__pycache__", "dist", "out",
] as const;
const DISLANAN_KUME: ReadonlySet<string> = new Set(DISLANAN_ADLAR);

/** Ders dünyası — öğreti kitaplığının ALTINDAKİ arşiv, örnek, fikstür ve şablon
 *  rafları, hangi derinlikte olurlarsa olsunlar. Çekirdekteki `DERS_DUNYASI`
 *  deseninin eklenti ikizidir; iki yüz aynı olguda aynı hükmü verir (YUZ-3.1).
 *  Ayraç hem `/` hem `\` olabilir, çünkü ölçüm Windows yollarında da koşar. */
export const DERS_RAFI = /(^|[\\/])ogreti[\\/](?:[^\\/]+[\\/])*(?:arsiv|ornek|fikstur|sablon)([\\/]|$)/;

/** Sınama fikstürü — bir sınama rafının ALTINDAKİ fikstür klasörü sentetik
 *  malzemedir ve tam .sar taramasına girmez. Çekirdeğin `AYRISTIRILMAZ_SENTETIK`
 *  deseninin eklenti ikizidir; iki yüz aynı dosyayı aynı hükümle eler (YUZ-3.1). */
export const SINAMA_FIKSTURU = /(^|[\\/])sinama[\\/](?:[^\\/]+[\\/])*fikstur([\\/]|$)/;

/** Sar evreninin AD tabanlı dışlama listesi. Ders rafları buraya girmez: onlar
 *  ada göre değil YERE göre elenir (`DERS_RAFI`). Glob BU listeden TÜRETİLİR
 *  (RED-2 D1 onarımı: elle yazılmış ikiz liste yok — bir ada eklenen dışlama
 *  her iki yüze birden iner, __pycache__ sınıfı ayrışma imkânsızlaşır). */
export const SAR_DISLANANLAR = [...DISLANAN_ADLAR] as const;

/** Tam .sar taramasının UCUZ ÖN SÜZGECİ — ad tabanlı dışlama + gizli dizinler.
 *  Glob yalnız ada bakabildiği için ders rafını ifade EDEMEZ; evrenin son
 *  hükmünü `sarKapsamDisi` verir ve tarama tarafı sonucu onunla süzer, böylece
 *  iki yüz yine tek işlevden türer (KPS-IND-A01). */
export const TARAMA_DISLAMA_GLOB =
  `**/{${[...SAR_DISLANANLAR, ".*"].join(",")}}/**`;

/** Yol parçalarına ayır (hem '/' hem '\'); baştaki boş parça (mutlak yol) düşer. */
const parcala = (yol: string): string[] => yol.split(/[\\/]/).filter((p) => p.length > 0);

/**
 * Disk-hattı gürültü süzgeci: yolun HERHANGİ bir parçası gizli (nokta-önekli)
 * ya da dışlanan ad ise olay denetim tetiklemeye değmez — çekirdek disk
 * yürüyüşü (proje-denetim) o yola zaten inmez. Yol ÇALIŞMA-ALANI-GÖRELİ
 * verilmelidir (Sol RED-2 dersi: mutlak yolda üst-dizin adları yanlış-pozitif
 * üretir); mutlak yol verilirse kök dizin adları da elenmeye katılır.
 */
export function gurultuMu(yol: string): boolean {
  return parcala(yol).some((p) =>
    (p.startsWith(".") && p !== "." && p !== "..") || DISLANAN_KUME.has(p));
}

/**
 * Sar-hattı gürültü süzgeci: ad tabanlı disk kümesine ek olarak ÖĞRETİ
 * KİTAPLIĞININ ALTINDAKİ ders rafları da süzülür — oradaki bir kaydetme tam DAG
 * turunu boşuna tetiklemesin (kapsam birebir hizası). Ders rafı ADIYLA değil
 * YERİYLE tanınır: kullanıcının kendi kökü altındaki `sablon/` bir ders rafı
 * değildir, ürün ağacıdır ve turu tetikler (KPS-IND-A01).
 */
export function sarGurultuMu(yol: string): boolean {
  return gurultuMu(yol) || DERS_RAFI.test(yol) || SINAMA_FIKSTURU.test(yol) || muhurluSarMi(yol);
}

/**
 * Tam .sar taramasının (TARAMA_DISLAMA_GLOB) DOSYA-tarafı eşi: verilen yol
 * taramaya girer mi, girmez mi? Glob yalnız DİZİN parçalarına bakar
 * (`**​/{…}/**`), dosya adına bakmaz; bu işlev de öyle yapar ve son parçayı
 * (dosya adını) ölçüme katmaz. Yol ÇALIŞMA-ALANI-GÖRELİ verilmelidir — mutlak
 * yolda çalışma alanının kendi üst dizin adları yanlış-pozitif üretir (Sol
 * RED-2 dersi; ajan kopyaları `.claude/worktrees/…` altında yaşadığında bütün
 * depo birden kapsam-dışı sayılırdı).
 *
 * NEDEN VAR: onay kuyruğu tarama tarafında globu, olay tarafında ELLE yazılmış
 * ayrı bir düzenli ifade kullanıyordu ve ikisi ayrışmıştı. Ölçülen fark şuydu —
 * `sablon/` (on altı .sar) ile `__pycache__/` globun dışlama evrenindeydi ama
 * elle yazılmış ifadenin evreninde değildi: o dosyalar taramaya hiç girmiyor,
 * buna karşılık açıldıklarında ya da diskte değiştiklerinde kapı pencereleri
 * açılıyordu. Kuyruk "boş" derken Comments paneli kapı gösteriyordu; bu, kayıtlı
 * SRN-ONAY-WORKTREE-SIZINTISI bulgusunun aynı sınıftan devamıdır. Artık iki yüz
 * de bu tek işlevden ve tek listeden (SAR_DISLANANLAR) türer.
 */
export function sarKapsamDisi(yol: string): boolean {
  if (muhurluSarMi(yol)) return true;   // MIM-3.4: mühürlü dosya dizini ne olursa olsun kapsam dışıdır
  const kesim = Math.max(yol.lastIndexOf("/"), yol.lastIndexOf("\\"));
  return kesim > 0 ? sarGurultuMu(yol.slice(0, kesim)) : false;
}

/** OlayHatti kurulumu — zamanlayıcılar sınanabilirlik için enjekte edilebilir. */
export interface OlayHattiAyar {
  /** Yol süzgeci (gurultuMu / sarGurultuMu) */
  gurultu: (yol: string) => boolean;
  /** Sel bittikten sonra tetiğe kadar beklenecek süre */
  gecikmeMs: number;
  /** Geciktirme dolunca çağrılır (tek-uçuş kilidine bağlanır). İkinci argüman
   *  geciktirme penceresinde süzgeçten geçen olayların değiştirdiği yollardır
   *  (BKM-DNT-A18): tur, darlığını odaktan değil bu yollardan türetir. */
  iste: (tetik: string, yollar: readonly string[]) => void;
  /** Mercek sayaçları (isteğe bağlı) */
  suzuldu?: () => void;
  olay?: () => void;
  ertelendi?: () => void;
  /** Zamanlayıcı enjeksiyonu (test sahte-zamanlayıcı verir; varsayılan gerçek) */
  kur?: (is: () => void, ms: number) => unknown;
  iptal?: (z: unknown) => void;
}

/**
 * 🚿 Olay hattı: izleyici olayı → süzgeç → geciktirme → istek. eklenti.ts'in
 * disk ve .sar hatları BU sınıfı kullanır; önce/sonra benzetimi de aynı sınıfı
 * koşturur — test edilen şey üretimdeki hattın ta kendisidir (RED-1 P2 onarımı:
 * "sentetik yol sınıflaması" yerine gerçek tetik sayımı).
 */
export class OlayHatti {
  private readonly ayar: OlayHattiAyar;
  private zaman: unknown;
  /** 🩹 BKM-DNT-A18: geciktirme penceresinde biriken değişen yollar. Pencere
   *  dolunca hepsi tek istekle tura taşınır ve küme boşalır; seldeki hiçbir
   *  olayın yolu, kendisinden sonra gelen olay tarafından ezilmez. */
  private readonly degisenler = new Set<string>();

  constructor(ayar: OlayHattiAyar) { this.ayar = ayar; }

  /**
   * @param yol      süzgecin ölçtüğü yol (çalışma-alanı-göreli; Sol RED-2 dersi)
   * @param tetik    turun tetik adı
   * @param degisen  tura taşınacak yol — verilmezse `yol` taşınır. Kabuk buraya
   *                 MUTLAK yolu verir, çünkü turun kapsam kararı odaktaki varlık
   *                 kökünü ve çalışma alanı köklerini mutlak yolla karşılaştırır.
   */
  olay(yol: string, tetik: string, degisen: string = yol): void {
    if (this.ayar.gurultu(yol)) { this.ayar.suzuldu?.(); return; }
    this.ayar.olay?.();
    this.degisenler.add(degisen);
    if (this.zaman !== undefined) {
      (this.ayar.iptal ?? clearTimeout)(this.zaman as Parameters<typeof clearTimeout>[0]);
      this.ayar.ertelendi?.();
    }
    this.zaman = (this.ayar.kur ?? setTimeout)(() => {
      this.zaman = undefined;
      const yollar = [...this.degisenler];
      this.degisenler.clear();
      this.ayar.iste(tetik, yollar);
    }, this.ayar.gecikmeMs);
  }
}

/**
 * 🩹 BKM-DNT-A18 · Tek-uçuş kilidinde bekleyen tur isteği. `yollar` turu
 * tetikleyen olayların değiştirdiği yollardır; `undefined` "değişen bilinmiyor"
 * demektir ve kapsam kararı onu TAM tura çevirir (`turKapsami`).
 */
export interface TurIstegi {
  readonly tetik: string;
  readonly yollar: readonly string[] | undefined;
}

/**
 * Koşu sürerken gelen iki isteği tek telafi isteğine indirir (saf karar).
 *
 * Eski kilit yalnız son tetiği saklıyordu ("son istek kazanır"). Değişen yollar
 * tura taşındığında bu kural iki ayrı bayatlık doğururdu ve ikisi de bu karar
 * tarafından kapatılır. Birincisi, kardeş kökteki bir değişikliğin ardından odak
 * içinde gelen ikinci bir değişiklik birinci olayın yolunu ezer ve telafi turu
 * yalnız odağa daralırdı; bu yüzden yollar BİRLEŞİR. İkincisi, tam tur isteyen
 * bir tetik (odak değişimi, ayar, el ile yenileme) ardından gelen dar bir olay
 * tetiğine yenilir ve tam resim hiç kurulmazdı; bu yüzden tam tur tetiği dar
 * tetiğe YENİLMEZ. Yollardan biri bilinmiyorsa birleşik istek de bilinmez sayılır.
 */
export function istekleriBirlestir(eski: TurIstegi | undefined, yeni: TurIstegi): TurIstegi {
  if (eski === undefined) return yeni;
  const tetik = TAM_TUR_TETIKLERI.has(eski.tetik) && !TAM_TUR_TETIKLERI.has(yeni.tetik)
    ? eski.tetik : yeni.tetik;
  const yollar = eski.yollar !== undefined && yeni.yollar !== undefined
    ? [...new Set([...eski.yollar, ...yeni.yollar])]
    : undefined;
  return { tetik, yollar };
}

/**
 * Tek-uçuş kilidi: `iste` koşu yokken koşuyu başlatır; koşu sürerken gelen
 * istekler tek bayrağa iner (en son tetik kazanır) ve tur bitince bir kez
 * telafi edilir. Böylece aynı anda en çok BİR denetim yaşar, en fazla BİR
 * tur beklemede olur — istek seli kaybolmadan iki tura sıkışır.
 */
export class TekUcusKilidi {
  private kosuyor = false;
  /** 🩹 BKM-DNT-A18: bekleyen istek tetiği ve değişen yolları birlikte taşır
   *  (`istekleriBirlestir`); eski kilit yalnız son tetiği saklıyordu. */
  private bekleyen: TurIstegi | undefined;
  /** Asıl işi koşan geri-çağrı (denetleHepsi) */
  private readonly kos: (tetik: string, yollar?: readonly string[]) => Promise<void>;
  /** Koşu sürerken atlanan istek bildirimi (mercek sayacı) */
  private readonly atlandi: (() => void) | undefined;
  /** Çöken tur bildirimi (RED-1 R1 onarımı: sessiz yutma yok — kanala düşer) */
  private readonly hata: ((h: unknown) => void) | undefined;

  constructor(kos: (tetik: string, yollar?: readonly string[]) => Promise<void>, atlandi?: () => void,
              hata?: (h: unknown) => void) {
    this.kos = kos;
    this.atlandi = atlandi;
    this.hata = hata;
  }

  iste(tetik: string, yollar?: readonly string[]): void {
    if (this.kosuyor) {
      // Tur bitince TEK telafi koşar; bekleyen istekler birleşir (son tetik
      // kazanır, fakat tam tur tetiği dar tetiğe yenilmez ve yollar birleşir).
      this.bekleyen = istekleriBirlestir(this.bekleyen, { tetik, yollar });
      this.atlandi?.();
      return;
    }
    this.kosuyor = true;
    void this.kos(tetik, yollar)
      .catch((h) => { this.hata?.(h); })   // kilit asılı kalmaz + çöküş raporlanır
      .finally(() => {
        this.kosuyor = false;
        const bekleyen = this.bekleyen;
        this.bekleyen = undefined;
        if (bekleyen !== undefined) this.iste(bekleyen.tetik, bekleyen.yollar);
      });
  }
}

// ── ⚡ PRF-A06: TAM TURUN KAPSAMI ────────────────────────────────────────────
//
//   Ölçülmüş kusur (2026-08-29, bu Adımın ölçüm merceği): eklenti her olay
//   dalgasında ÇAPRAZ-DOSYA denetimini çalışma alanının bütününe koşturuyordu.
//   Ölçüm şudur: çekirdek denetim gövdesi (`denetimKos`) yalnız sarmal kökünde
//   1828 milisaniye, dört projeyi kapsayan çatı kökünde 4229 milisaniye
//   sürmektedir. Bu süre bölünmez ve senkrondur; eklenti süreci o pencerede
//   başka hiçbir işi işleyemez, terminalde ya da editörde yazılan tuş o
//   pencerenin sonuna kadar bekler.
//
//   Onarımın dayanağı MIM-1.1'in kendi hükmüdür. Aktif varlık odağı açıkken
//   paneller ZATEN yalnız odaktaki varlığın kayıtlarını gösterir; odağın
//   dışında kalan varlıklar için hesaplanan çapraz tanılar üretildikleri anda
//   süzgeçte elenir. Yani bugün çatı ölçeğinde ödenen maliyetin bir bölümü,
//   sonucu hiçbir yüzeye basılmayan bir hesabın maliyetidir. Kapsamı odağa
//   daraltmak yeni bir kural icat etmez; hesabı, sonucunun zaten görüldüğü
//   sınıra çeker.
//
//   Daraltma YALNIZ olay-tetikli turlarda geçerlidir. Soğuk açılış, ayar, dil
//   ve odak değişimi turları TAM koşar, çünkü ilk resmin eksiksiz olması
//   gerekir (bu Adımın sınırı bunu açıkça hükme bağlar) ve odak değiştiğinde
//   yeni odağın resmi henüz hiç kurulmamıştır.

/** Tam turu daraltmayan, yani daima BÜTÜN çalışma alanını tarayan tetikler.
 *  Bunlar bir dosya olayı değil, dünyanın yeniden kurulduğu anlardır.
 *
 *  🗺️ PRF-TA-A03: 'el-ile' de bu kümededir. Yol haritasının yenileme düğmesi
 *  artık panelin kendi turunu değil bir denetim turunu ister; kullanıcı o düğmeye
 *  bastığında odaktaki varlığın değil BÜTÜN çalışma alanının yeniden kurulmasını
 *  bekler, dolayısıyla el ile istenen tur daraltılamaz. */
const TAM_TUR_TETIKLERI: ReadonlySet<string> = new Set([
  "başlangıç", "ayar", "dil", "odak", "klasör", "el-ile",
]);

//   🩹 BKM-DNT-A18 · DAR KÖK OLAYLARDAN TÜRER (2026-10-24 saha bulgusu,
//   HTR-EKLENTI-DAR-KAPSAM-BAYAT-PANEL): kapsam eskiden yalnız odaktaki varlıktan
//   seçiliyordu. Başka bir pencerede çalışan bir ajan kardeş projedeki bir
//   dosyayı değiştirdiğinde olay turu değişikliğin yapıldığı projeye değil odaktaki
//   projeye daralıyor, değişen projenin çapraz tanıları (kırık atıf, disk
//   mutabakatı, bağımlılık grafı) yeniden hesaplanmıyor ve bir önceki turdan
//   olduğu gibi taşınıyordu. Artık dar tur odağın YANINDA, turu tetikleyen
//   olayların değiştirdiği dosyaların varlık köklerini de denetler; bir kök
//   çözülemezse tur tam koşar. Odak içindeki değişiklikte darlık korunur, çünkü
//   PRF-A06'nın ölçtüğü maliyet (çatı kökünde dört saniyeyi aşan senkron blok)
//   tek dosyalık bir olayın bütün çalışma alanını yeniden denetlememesini ister.

/**
 * Bir turun ÇAPRAZ-DOSYA denetiminin koşacağı kökler — daraltma yoksa `undefined`.
 *
 * `undefined` dönmesi "tam tur" demektir ve çağıran taraf bütün çalışma alanı
 * köklerini denetler; bir liste dönmesi "yalnız bu köklerin altı yeniden
 * hesaplansın" demektir. Liste odaktaki varlıkla başlar ve odağın dışında
 * değişen dosyaların varlık köklerini sözlük sırasıyla izler; iç içe kökte
 * yalnız dıştaki kalır ki aynı dosyanın tanısı iki kez üretilmesin. İşlev
 * saftır ve vscode tanımaz: varlık kökü çözücüsü dışarıdan verilir, dolayısıyla
 * nöbeti host istemez.
 *
 * @param tetik            turu başlatan olayın adı
 * @param aktifVarlik      MIM-1.1 yapışkan odağı (varlık kök dizini)
 * @param odakAcik         `sarmal.aktifVarlikOdagi` ayarı
 * @param calismaKokleri   çalışma alanı klasörleri
 * @param degisenYollar    turu tetikleyen olayların değiştirdiği MUTLAK yollar;
 *                         `undefined` "değişen bilinmiyor" demektir ve tur tam koşar
 * @param varlikKokuBul    bir yolun varlık kökünü çözer (kabukta `varlikKoku`);
 *                         verilmezse odak dışındaki her değişiklik turu tama çevirir
 */
export function turKapsami(
  tetik: string,
  aktifVarlik: string | undefined,
  odakAcik: boolean,
  calismaKokleri: readonly string[],
  degisenYollar?: readonly string[],
  varlikKokuBul?: (yol: string) => string | undefined,
): string[] | undefined {
  // Odak kapalıysa bütün varlıkların tanıları panelde görünür; daraltma
  // görünen tanıyı düşürürdü ve bu bir performans kazancı değil kayıp olurdu.
  if (!odakAcik || !aktifVarlik) return undefined;
  if (TAM_TUR_TETIKLERI.has(tetik)) return undefined;
  // Odak bir çalışma alanı klasörünün TA KENDİSİ ise daraltacak bir şey yoktur;
  // kapsam zaten o kökün kapsamıdır ve daraltma sahte bir kazanç gösterirdi.
  // Odak çalışma alanının dışındaysa (kapsam-dışı bir dosya açıkken olur)
  // daraltma yapılmaz: tur o kökü hiç taramayacağı için resim boşalırdı.
  if (!darKokOlabilir(aktifVarlik, calismaKokleri)) return undefined;
  // 🩹 BKM-DNT-A18: neyin değiştiğini bilmeyen tur daraltılamaz; eskiden bu
  // hâlde odağa daralınıyordu ve değişen kardeş kök sessizce bayat kalıyordu.
  if (degisenYollar === undefined) return undefined;
  const kokler = [aktifVarlik];
  for (const yol of degisenYollar) {
    if (kapsamIcinde(yol, aktifVarlik)) continue;   // odak zaten denetlenir
    const kok = varlikKokuBul?.(yol);
    // Köksüz dosya, çalışma alanı kökünün kendisinde ya da dışında yaşayan
    // varlık dar bir kökle karşılanamaz; bu hâlde tur tam koşar.
    if (kok === undefined || !darKokOlabilir(kok, calismaKokleri)) return undefined;
    if (!kokler.some((k) => esitKok(k, kok))) kokler.push(kok);
  }
  const [odak, ...ekler] = kokler;
  const sirali = [odak!, ...ekler.sort()];
  // İç içe kökte dıştaki kalır: içteki kökün dosyaları dıştakinin denetiminde
  // zaten vardır ve iki ayrı denetim aynı tanıyı iki kez yayınlardı.
  return sirali.filter((k) => !sirali.some((u) => !esitKok(u, k) && kapsamIcinde(k, u)));
}

/**
 * 🩹 BKM-DNT-A18 · Bir dosyanın çapraz tanıları bu turda YENİDEN Mİ hesaplandı?
 * Tam turda her dosya için evet; dar turda yalnız denetlenen köklerden birinin
 * kapsamındaki dosya için evet. Hayır dönen dosyanın çapraz tanısı önceki turdan
 * korunur (eklenti.ts `caprazOnbellek`); bu yüzden değişen bir kökün bu kararla
 * hayır alması o kökü bayat bırakır ve nöbet tam bunu ölçer.
 */
export function caprazYenidenHesaplanir(yol: string, darKokler: readonly string[] | undefined): boolean {
  return darKokler === undefined || darKokler.some((k) => kapsamIcinde(yol, k));
}

/** Kök, dar bir tur kökü olabilir mi? Çalışma alanı klasörünün kendisi
 *  olmamalı ve bir çalışma alanı klasörünün ALTINDA yaşamalıdır. */
const darKokOlabilir = (kok: string, calismaKokleri: readonly string[]): boolean =>
  !calismaKokleri.some((k) => esitKok(k, kok))
  && calismaKokleri.some((k) => altKapsamda(kok, k));

const duzle = (y: string): string => y.replace(/\\/g, "/").replace(/\/+$/, "");
const esitKok = (a: string, b: string): boolean => duzle(a) === duzle(b);
/** `yol`, `ustKok`un altında mı (kökün kendisi HARİÇ)? */
const altKapsamda = (yol: string, ustKok: string): boolean =>
  duzle(yol).startsWith(`${duzle(ustKok)}/`);

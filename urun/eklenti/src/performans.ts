// ═══════════════════════════════════════════════════════════════════════════

import { IZ_METINLERI } from "./yuzey-metinleri.ts";
// performans.ts — 🔬 PERFORMANS MERCEĞİ (PRF-A01 · VS Code'suz saf sayaç)
//
//   SRN-IDE-KASMA-SOL-KOSUSU tanısının ölçüm ayağı: hangi izleyici kaç olay
//   üretiyor, bir tam-proje denetimi kaç ms sürüyor — bugüne dek hiçbir yerde
//   görünmüyordu. Mercek sayar, denetim TURU bittiğinde tek satır özet düşer;
//   kanal yazıcısı dışarıdan verilir (eklenti.ts 'Sarmal Performans' çıktı
//   kanalını bağlar) — modül vscode'suzdur, davranış testi host istemez.
//
//   Maliyet disiplini (PRF-A01 sınırı): sayaç artırımı sabit-zamanlıdır;
//   metin üretimi ve kanal yazımı YALNIZ denetim turlarında olur.
// ═══════════════════════════════════════════════════════════════════════════

/** Bir tam-proje denetim turunun kimliği — özet satırının girdisi. */
export interface TurBilgi {
  /** Turu ne tetikledi (başlangıç · sar-olayı · disk-olayı · ayar …) */
  tetik: string;
  /** Turun toplam süresi (ms) */
  süreMs: number;
  /** Turda taranan .sar dosya sayısı */
  dosyaSayısı: number;
  /**
   * ⚡ PRF-A06: turun çapraz-dosya denetiminin DARALTILDIĞI varlık kökleri; tam
   * turda verilmez. Değer tetik alanına iliştirilir, çünkü kanal satırının
   * biçimi yüzey metinlerinde tek kaynaktan yaşar ve bu Adım o kaynağa
   * dokunmaz. Founder kanalda dar turu tam turdan ayırt edebilmelidir: aksi
   * hâlde düşen süre, işin hızlanmasından mı yoksa kapsamın daralmasından mı
   * geldiği okunamaz bir sayı olurdu.
   *
   * 🩹 BKM-DNT-A18: alan artık tek bir kök değil, turun GERÇEKTEN denetlediği
   * köklerin mutlak yollarıdır (`turKapsami` çıktısı). 2026-10-24 günlüğünde
   * satır değişikliğin yapıldığı projeyi değil odaktaki projeyi gösteriyordu ve
   * bu, kusurun kanaldan okunabilen tek iziydi; satır şimdi denetlenen her kökü
   * adıyla basar.
   */
  kapsam?: readonly string[];
  /**
   * 📄 PRF-KP-A02: turun belgelerinin nereden geldiğinin sayımı ve diskten
   * okunan toplam bayt. Kanal satırının sonuna dikey çizgiyle ayrılmış bir
   * belge bölümü olarak düşer; bölümün biçimi yüzey metinlerinde yaşar. Bölüm
   * isteğe bağlıdır, çünkü mercek belge toplamayan bir turu da özetleyebilir
   * ve orada uydurma bir sıfır basmak ölçüm değil boşluk gösterirdi.
   */
  belgeler?: {
    /** Editörde zaten açık olduğu için okunmayan dosya sayısı. */
    açıktan: number;
    /** Diskten ham okunan dosya sayısı. */
    diskten: number;
    /** Okunamadığı ya da dili `sarmal` olmadığı için turun dışında kalan dosya sayısı. */
    atlanan: number;
    /** Diskten okunan ham bayt toplamı; kanalda yuvarlanmadan bayt olarak yazılır. */
    okunanBayt: number;
  };
  /**
   * ⏱️ PNL-A14: turun süresinin aşamalara bölünmüş hâli. Kanal satırının sonuna
   * dikey çizgiyle ayrılmış ayrı bir bölüm olarak düşer. Bölüm isteğe bağlıdır,
   * çünkü mercek aşama ölçmeyen bir turu da özetleyebilir ve orada uydurma
   * sıfırlar basmak ölçüm değil boşluk gösterirdi.
   */
  aşamalar?: TurAsamalari;
}

/**
 * ⏱️ PNL-A14 · turun aşama süreleri (ms, tamsayıya yuvarlanmış).
 *
 *   Founder 2026-10-27 tarihinde açılışın ve tepkinin yavaşladığını bildirdi;
 *   kanal o gün yalnız toplam süreyi basıyordu ve sürenin okumada mı,
 *   ayrıştırmada mı, çapraz denetimde mi yoksa panellerin yayınında mı
 *   harcandığı okunamıyordu. Hangi aşamanın onarılacağına toplamdan karar
 *   verilemez; bu kayıt kararın ölçüsüdür.
 *
 *   Aşamalar ayrıktır ve toplamları turun toplam süresine yaklaşık eşittir;
 *   aradaki küçük fark kapsam kararı ve defter işleri gibi hiçbir aşamaya
 *   düşmeyen kayıt işidir.
 */
export interface TurAsamalari {
  /** Dosya araması, erişim sınırı ve belge toplama (disk okuması dahil). */
  okumaMs: number;
  /** Program haritasının kurulması ve mevsim çevrimi. */
  ayrıştırmaMs: number;
  /** Kök başına `denetimKos` gövdesi ve panel süzgeci (çapraz-dosya denetim). */
  çaprazMs: number;
  /** Dosya başına tek-dosya tanıları (`dogrula` ve vade kapısı). */
  dosyaMs: number;
  /** Tanıların yüzeylere dağıtımı, panellerin tek yayını ve tur görüntüsünün dinleyicileri. */
  yayınMs: number;
  /**
   * Belge toplama bittikten turun sonuna dek ana iş parçacığında KESİNTİSİZ
   * koşan senkron blok. Toplamadan sonra turda bekleme noktası yoktur; bu
   * yüzden bu pencerede eklenti süreci başka hiçbir olayı işleyemez ve sayı,
   * OZK-12'nin "en uzun bölünmez blok" ölçütünün doğrudan karşılığıdır.
   */
  bölünmezMs: number;
}

/** Kronometrenin topladığı aşamalar; okuma ve bölünmez blok aralık olarak verilir. */
export type TurAsamasi = "okuma" | "ayrıştırma" | "çapraz" | "dosya" | "yayın";

/**
 * ⏱️ PNL-A14 · aşama kronometresi. Aynı aşamaya düşen aralıkları toplar: dosya
 * başına koşan işler yüzlerce kısa aralıktır ve her biri ayrı ölçülüp toplanır.
 * Saat yüksek çözünürlüklüdür (`performance.now`), çünkü milisaniye altı
 * aralıklar tam sayılı saatle ölçülseydi her biri sıfıra ya da bire yuvarlanır
 * ve toplam yüzlerce milisaniye sapardı. Saat dışarıdan verilebilir ki davranış
 * sınaması zamana bağlı olmasın.
 */
export class AsamaKronometresi {
  private readonly toplam: Record<TurAsamasi, number> = { okuma: 0, ayrıştırma: 0, çapraz: 0, dosya: 0, yayın: 0 };
  private readonly saat: () => number;

  constructor(saat: () => number = () => performance.now()) { this.saat = saat; }

  /** Kronometrenin saati — aralık ölçen çağıran aynı saati okur. */
  şimdi(): number { return this.saat(); }

  /** İşi koşturur ve süresini aşamaya ekler; iş çökse de süre eklenir. */
  ölç<T>(aşama: TurAsamasi, iş: () => T): T {
    const baş = this.saat();
    try { return iş(); }
    finally { this.toplam[aşama] += this.saat() - baş; }
  }

  /** Dışarıda ölçülmüş bir aralığı aşamaya ekler (beklemeli okuma gibi). */
  ekle(aşama: TurAsamasi, ms: number): void { this.toplam[aşama] += ms; }

  /** Toplanan süreleri tamsayıya yuvarlanmış kayıt olarak verir. */
  dök(bölünmezMs: number): TurAsamalari {
    const y = Math.round;
    return {
      okumaMs: y(this.toplam.okuma), ayrıştırmaMs: y(this.toplam.ayrıştırma),
      çaprazMs: y(this.toplam.çapraz), dosyaMs: y(this.toplam.dosya),
      yayınMs: y(this.toplam.yayın), bölünmezMs: y(bölünmezMs),
    };
  }
}

/** Tetik etiketini kapsam işaretiyle birleştirir — dar tur kanalda görünür
 *  olur ve süre karşılaştırması kapsamıyla birlikte okunur. Kökler varlık
 *  adlarıyla (dizin adı · `varlikEtiketi` emsali) ve verildikleri sırayla,
 *  artı işaretiyle bağlanarak basılır. */
export function tetikEtiketi(bilgi: TurBilgi): string {
  if (!bilgi.kapsam || bilgi.kapsam.length === 0) return bilgi.tetik;
  return `${bilgi.tetik} · dar kapsam=${bilgi.kapsam.map(kokAdi).join("+")}`;
}

/** Kök yolunun son parçası; iki ayraç da tanınır, çünkü mercek Windows yollarında da koşar. */
const kokAdi = (kok: string): string =>
  kok.replace(/[\\/]+$/, "").split(/[\\/]/).pop() ?? kok;

export class PerformansMercegi {
  /** İzleyici başına olay sayısı (son turdan beri) */
  private olaylar = new Map<string, number>();
  /** Süzgeçte elenen olay sayısı (PRF-A02 gürültü süzgeci doldurur) */
  private süzülen = 0;
  /** Koşan denetim varken atlanan istek sayısı (PRF-A02 kilidi doldurur) */
  private atlanan = 0;
  /** Geciktiriciye takılıp tek tura inen istek sayısı */
  private ertelenen = 0;

  /** Özet satırını yazan kanal (eklenti.ts çıktı kanalını bağlar). */
  private readonly yaz: (satır: string) => void;

  constructor(yaz: (satır: string) => void) { this.yaz = yaz; }

  /** İzleyiciden olay geldi — sabit-zamanlı sayım. */
  olayGeldi(kaynak: string): void {
    this.olaylar.set(kaynak, (this.olaylar.get(kaynak) ?? 0) + 1);
  }

  /** Gürültü süzgeci bir olayı eledi (denetim tetiklenmedi). */
  süzüldü(): void { this.süzülen += 1; }

  /** Koşan denetim varken gelen istek atlandı (tur sonunda telafi edilir). */
  atlandı(): void { this.atlanan += 1; }

  /** İstek geciktiriciye takıldı — sel tek tura iner. */
  ertelendi(): void { this.ertelenen += 1; }

  /**
   * Denetim turu bitti: birikimin özetini tek satırda yaz ve sayaçları sıfırla.
   * Satır geri de döner — davranış testi kanala bakmadan doğrular.
   */
  turBitti(bilgi: TurBilgi, zaman: Date = new Date()): string {
    const saat = zaman.toTimeString().slice(0, 8);
    const olayDökümü = [...this.olaylar.entries()]
      .map(([kaynak, sayı]) => `${kaynak} ${sayı}`)
      .join(" · ") || IZ_METINLERI.olayYok;
    // 📄 PRF-KP-A02: belge bölümü yalnız verildiğinde basılır. Bayt toplamı
    // yuvarlanmadan, ham bayt olarak yazılır; kilobayta yuvarlamak tek baytlık
    // okumayı bir kilobayt gösterir ve sayıyı ölçüm olmaktan çıkarırdı.
    const belgeler = bilgi.belgeler
      ? IZ_METINLERI.turBelgeleri({
          aciktan: bilgi.belgeler.açıktan, diskten: bilgi.belgeler.diskten,
          atlanan: bilgi.belgeler.atlanan, okunanBayt: bilgi.belgeler.okunanBayt,
        })
      : undefined;
    // ⏱️ PNL-A14: aşama bölümü yalnız verildiğinde basılır; denetim süresi
    // çapraz ve dosya paylarının toplamıdır ve iki pay da ayrıca yazılır.
    const a = bilgi.aşamalar;
    const asamalar = a
      ? IZ_METINLERI.turAsamalari({
          okuma: a.okumaMs, ayristirma: a.ayrıştırmaMs, denetim: a.çaprazMs + a.dosyaMs,
          capraz: a.çaprazMs, dosya: a.dosyaMs, yayin: a.yayınMs, bolunmez: a.bölünmezMs,
        })
      : undefined;
    const satır = IZ_METINLERI.performansTuru({
      saat, sure: bilgi.süreMs, dosya: bilgi.dosyaSayısı, tetik: tetikEtiketi(bilgi),
      olaylar: olayDökümü, suzulen: this.süzülen, atlanan: this.atlanan,
      ertelenen: this.ertelenen, belgeler, asamalar,
    });
    this.olaylar.clear();
    this.süzülen = 0;
    this.atlanan = 0;
    this.ertelenen = 0;
    this.yaz(satır);
    return satır;
  }
}

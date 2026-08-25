// ═══════════════════════════════════════════════════════════════════════════
// fikir-cekirdek.ts — 💡 FİKİR YÜZEYİNİN SAF ÇEKİRDEĞİ (vscode importsuz)
//
//   KANONİK DAYANAK. Sınıflama Fikir tipini "ham, taahhütsüz fikir; olgunlaşırsa
//   Karar'a yükselir" diye tanımlar ve zorunlu alanlarını kod, ne, durum ve
//   dönüşTetikleyici olarak sayar; aynı kayıt onu açıkça Hatırlatıcı'nın
//   söz-verilmemiş kardeşi ilan eder. Kardeşliğin yüzeydeki karşılığı şudur:
//   Fikir, Hatırlatıcılar panelinin desenini izler ve kendi mimarisini icat
//   etmez. Bu modül o desenin veri yarısıdır.
//
//   NEDEN AYRI BİR TOPLAYICI GEREKTİ. Hatırlatıcılar paneli motorun TANI
//   akışından beslenir: açık bir Hatırlatıcı düğümü için motor `açık-hatırlatıcı`
//   tanısı üretir ve kayıt yüzey defterine oradan iner. Fikir düğümü için
//   motorda böyle bir tanı YOKTUR; dolayısıyla bugün yazılan bir Fikir hiçbir
//   panele ulaşmaz ve kullanıcı onu kaybetmiş gibi olur. Bu modül eksik yolu
//   tanı üreterek değil, ayrışmış ağacı doğrudan okuyarak kapatır — Onaylar
//   panelinin kapı toplayıcısıyla (onay-cekirdek.ts) tıpatıp aynı desen. Tanı
//   üretmemek bilinçli bir sınırdır: Fikir bir sapma değildir ve kullanıcıdan
//   hiçbir düzeltme istemez, dolayısıyla motorun sapma diline hiç girmemelidir.
//
//   MODÜL SAF TUTULUR ki nöbet editör kabuğu kurmadan gerçek davranışı
//   koşturabilsin; panel sağlayıcısı (hatirlaticilar.ts) yalnız bu modelin
//   çıktısını editör kabuğuna çevirir ve hiçbir karar vermez. Kullanıcıya
//   görünen cümleler burada da YAŞAMAZ; onların tek evi metin kataloğudur
//   (yuzey-metinleri.ts), çünkü ikinci bir dil eklendiğinde çevrilecek dosya
//   tektir.
//
//   SINIR: Fikir tipinin ŞEMASI bu modülde değişmez ve Fikir'den Karar'a terfi
//   mekanizması bu modülün kapsamı dışındadır; burada yalnız var olan tipe bir
//   okuma yüzü verilir.
// ═══════════════════════════════════════════════════════════════════════════

import type { Dugum } from "../../cekirdek/src/sozdizim.ts";
import type { ProjeKimligi } from "./yuzey-cekirdek.ts";
// ORTAK BİÇİM İŞLEVİ ZATEN VARDIR VE NÖBETLİDİR (VIT-GRAF-A15). Fikir hanesi
// kendi etiket biçimini icat etmez; hatırlatıcı satırlarının kullandığı
// `kodluEtiket` işlevinin ta kendisini çağırır. İkinci bir biçim yazılsaydı iki
// hane zamanla ayrışır ve tek panelin içinde yine iki kural doğardı.
import { kodluEtiket } from "./yuzey-cekirdek.ts";
import {
  fikirEtiketi, fikirSatirKodu, fikirAciklamasi, fikirIpucu, panoFikirMetni,
} from "./yuzey-metinleri.ts";

/** Kanonik tip adı — toplayıcı bu adı TEK yerden okur, koda ikinci kez gömmez. */
export const FIKIR_TIPI = "Fikir";

/**
 * Ayrışmış ağaçtan okunan tek bir Fikir düğümü. Alan adları sınıflamanın
 * zorunlu alanlarıyla birebirdir; toplayıcı hiçbir alanı yeniden adlandırmaz ve
 * hiçbirine varsayılan uydurmaz. Kaynakta yazılmamış bir alan BOŞ DİZE olarak
 * taşınır, çünkü panelin "yazılmamış" ile "boş yazılmış" arasında ayrım yapması
 * gerekmez fakat var olmayan bir değeri uydurması kesinlikle yasaktır.
 */
export interface FikirDugumu {
  readonly kod: string;
  readonly ne: string;
  readonly durum: string;
  /** Fikrin hangi olayla canlanacağı — panelin yüzeye çıkardığı asıl bilgi. */
  readonly dönüşTetikleyici: string;
  /**
   * Bildirimin KAYNAK satırı, 1-tabanlı. Onay kapısı 0-tabanlı konum taşır,
   * çünkü orada konum bir editör düzenlemesine çevrilir; burada konum yalnız
   * `sarmal.dosyaAc` komutuna ve ipucu metnine gider ve ikisi de kaynak satır
   * numarasını bekler — Hatırlatıcı kaydının taşıdığı `Tani.satir` ile aynı
   * düzen. İki hane aynı panelde yaşadığı için düzenlerinin de aynı olması
   * şarttır, yoksa iki satır aynı tıklamaya bir satır kaymış cevap verir.
   */
  readonly satir: number;
  /** Bildirimin kaynak sütunu, 1-tabanlı (aynı gerekçe). */
  readonly sutun: number;
}

/**
 * Bir düğümün alanını parametre ve özellik hanelerinin ikisinden de arar.
 * Sözdizimi aynı alanı iki biçimde yazmaya izin verir; okuyucu ikisini de
 * tanımazsa kullanıcının yazdığı geçerli bir Fikir panelde eksik görünür.
 */
function alanMetni(d: Dugum, ad: string): string {
  const alan = d.parametreler.find((p) => p.ad === ad) ?? d.ozellikler.find((p) => p.ad === ad);
  return alan?.deger.metin ?? "";
}

/**
 * Ayrışmış ağaçtaki bütün Fikir düğümlerini kaynak sırasıyla toplar.
 *
 * TOPLAYICI SÜZMEZ. Hatırlatıcı yüzeyi yalnız AÇIK kayıtları gösterir, çünkü
 * Hatırlatıcı bir taahhüttür ve kapanışı vardır; Fikir'in ise taahhüdü yoktur
 * ve kanon ona kapanış durumu tanımlamaz. Bir durumu bugün elemek, yarın
 * kullanıcının yazdığı geçerli bir Fikri sessizce yutmak demektir; bu yüzden
 * panel bütün Fikirleri gösterir ve durum bilgisini yüzeyde okutur.
 */
export function fikirleriTopla(bildirimler: readonly Dugum[]): FikirDugumu[] {
  const fikirler: FikirDugumu[] = [];
  const gez = (d: Dugum): void => {
    if (d.ad === FIKIR_TIPI) {
      fikirler.push({
        kod: alanMetni(d, "kod"),
        ne: alanMetni(d, "ne"),
        durum: alanMetni(d, "durum"),
        dönüşTetikleyici: alanMetni(d, "dönüşTetikleyici"),
        satir: d.satir,
        sutun: d.sutun,
      });
    }
    for (const c of d.cocuklar) gez(c);
  };
  for (const b of bildirimler) gez(b);
  return fikirler;
}

/** Panelde tek bir satır: hangi dosyanın, hangi Projenin hangi Fikri. */
export interface FikirKaydi {
  readonly proje: ProjeKimligi;
  readonly dosya: string;
  readonly fikir: FikirDugumu;
}

/**
 * Bir Fikir kaydının panelde nasıl görüneceğinin SAF tarifi — Hatırlatıcı
 * kaydının `kayitGorunumu` tarifinin kardeşi. Sağlayıcı bu tarifi editör
 * kabuğuna çevirmekten başka bir şey yapmaz; böylece panelin BASTIĞI metin
 * nöbette birebir ölçülebilir hâle gelir.
 */
export interface FikirGorunumu {
  /** Panelde basılan etiket: önce kod, sonra amaç cümlesi (VIT-GRAF-A15). */
  readonly etiket: string;
  /**
   * Satırın kendi kodu — hatırlatıcı kaydındaki `satirKodu` hanesinin ikizi.
   * Hiçbir koşulda boş kalmaz; kimlik yazılmamışsa eksikliği söyleyen söz öbeği
   * gelir ve uydurma bir kod üretilmez. Nöbet iki hanenin aynı biçimi
   * kullandığını bu alan üzerinden ölçer.
   */
  readonly satirKodu: string;
  readonly aciklama: string;
  readonly ipucu: string;
  readonly dosya: string;
  readonly satir: number;
  readonly kod: string;
}

/**
 * Kaydı panel satırına çevirir — metin katalogdan, olgu düğümden gelir.
 *
 * ETİKET ORTAK BİÇİMİ KULLANIR (VIT-GRAF-A15). Satır kodla başlar ve kod ile
 * cümle arasındaki ayracı hatırlatıcı satırlarıyla AYNI işlev kurar; bu hane
 * artık kendi biçimini icat etmez. Founder'ın 2026-08-08 hükmünden önce Fikir
 * satırı yalnız amaç cümlesini basıyordu ve kimliğini düşürüyordu, dolayısıyla
 * tek panelin içinde iki ayrı satır biçimi yaşıyordu.
 *
 * AÇIKLAMA HANESİNE DÖNÜŞ TETİKLEYİCİSİ YAZILIR, dosya adı değil. Hatırlatıcı
 * kaydında o hane `dosya:satır` taşır; Fikir'de taşımaz ve bu bilinçli bir
 * ayrımdır. Fikrin bekleme sebebi dönüş tetikleyicisidir: kullanıcı panele
 * baktığında "bu fikir hangi olayı bekliyor" sorusunun cevabını fareyi
 * getirmeden okumalıdır. Kaynağın tam konumu kaybolmaz — ipucunda tam yol ve
 * satır numarasıyla durur, satıra tıklandığında da kaynak açılır.
 */
export function fikirGorunumu(kayit: FikirKaydi): FikirGorunumu {
  const f = kayit.fikir;
  const satirKodu = fikirSatirKodu(f.kod);
  return {
    satirKodu,
    etiket: kodluEtiket(satirKodu, fikirEtiketi(f.ne)),
    aciklama: fikirAciklamasi(f.dönüşTetikleyici),
    ipucu: fikirIpucu({
      kod: f.kod, ne: f.ne, durum: f.durum, dönüşTetikleyici: f.dönüşTetikleyici,
      proje: kayit.proje.ad, dosya: kayit.dosya, satir: f.satir,
    }),
    dosya: kayit.dosya,
    satir: f.satir,
    kod: f.kod,
  };
}

/**
 * 📋 Bir Fikir satırının panoya inecek metni (VIT-GRAF-A13).
 *
 * Ağaç görünüşlerinde metin seçilemez ve kopyalama ancak bir komutla olur;
 * Hatırlatıcı hanesindeki satırlar için kurulan bu yol Fikir hanesini de kapsar,
 * çünkü kullanıcı için ikisi de aynı panelde okuduğu birer satırdır. Blok kendi
 * kendine yeter: kimliği, cümlesi, bekleme sebebi ve TAM KAYNAK konumu birlikte
 * iner, dolayısıyla metin başka bir yere yapıştırıldığında bağlamını kaybetmez.
 */
export function fikirPanoMetni(kayit: FikirKaydi): string {
  const f = kayit.fikir;
  return panoFikirMetni({
    kod: f.kod, ne: f.ne, dönüşTetikleyici: f.dönüşTetikleyici,
    dosya: kayit.dosya, satir: f.satir,
  });
}

/**
 * Dosya başına Fikir kayıtlarını tutan ve paneli tek noktadan besleyen defter —
 * `YuzeyDefteri` sınıfının Fikir hanesindeki ikizi ve aynı iki sözleşmeyi taşır.
 *
 * Birincisi yayın sayısıdır: toplu tarama her belgede ayrı çizim yaptırmaz,
 * tur sonunda tek kez yayımlar. İkincisi kapsam süzgecidir: aynı motorun
 * çıktısını gösteren yüzeyler kapsam konusunda birbiriyle anlaşmak zorundadır,
 * yoksa kullanıcı çelişkili iki tablo görür. Süzgeç yapıcıya verilir ve YALNIZ
 * yayın anında uygulanır; defter bütün kayıtları tutmaya devam eder.
 */
export class FikirDefteri {
  private readonly kayitlar = new Map<string, readonly FikirKaydi[]>();
  private readonly yayinKapisi: (kayitlar: readonly FikirKaydi[]) => void;
  private readonly kapsamda: (dosya: string) => boolean;
  private sayac = 0;

  constructor(
    yayinKapisi: (kayitlar: readonly FikirKaydi[]) => void,
    kapsamda: (dosya: string) => boolean = () => true,
  ) {
    this.yayinKapisi = yayinKapisi;
    this.kapsamda = kapsamda;
  }

  /** Bugüne kadar kaç kez panel çizimi istendiği. Toplu tarama nöbeti bunu okur. */
  get yayinSayisi(): number {
    return this.sayac;
  }

  /** Fikir taşıyan dosya sayısı. */
  get dosyaSayisi(): number {
    return this.kayitlar.size;
  }

  /**
   * Bir dosyanın Fikir kayıtlarını deftere yazar; liste boşsa dosya defterden
   * düşer. `yayımlansın` yanlış verildiğinde çizim ertelenir ve çağıran taraf
   * turu bitirdiğinde `yayımla` işlevini bir kez çağırır.
   */
  yaz(dosya: string, kayitlar: readonly FikirKaydi[], yayımlansın = true): void {
    if (kayitlar.length) this.kayitlar.set(dosya, kayitlar);
    else this.kayitlar.delete(dosya);
    if (yayımlansın) this.yayımla();
  }

  /** Bir dosyanın kayıtlarını defterden düşürür; dosya defterde varsa doğru döner. */
  sil(dosya: string, yayımlansın = true): boolean {
    const vardı = this.kayitlar.delete(dosya);
    if (vardı && yayımlansın) this.yayımla();
    return vardı;
  }

  /** Defteri tümüyle boşaltır — denetim kapatıldığında yüzeyler birlikte susar. */
  temizle(yayımlansın = true): void {
    this.kayitlar.clear();
    if (yayımlansın) this.yayımla();
  }

  /**
   * Bu turda görülmeyen dosyaların bayat kayıtlarını düşürür. Budama tek başına
   * çizim yapmaz; tur sonundaki tek yayın onu da kapsar.
   */
  buda(yaşayanDosyalar: ReadonlySet<string>): void {
    for (const dosya of [...this.kayitlar.keys()]) {
      if (!yaşayanDosyalar.has(dosya)) this.kayitlar.delete(dosya);
    }
  }

  /**
   * Defterin bugün PANELDE görünen içeriği; çizim yapmaz ve sayacı artırmaz.
   * Kayıtlar dosya adına, bir dosyanın içinde de kaynak satırına göre dizilir:
   * panelde okunan sıra kaynakta okunan sırayla aynıdır.
   */
  gorunenler(): FikirKaydi[] {
    const kapsamdakiler: FikirKaydi[] = [];
    for (const [dosya, kayitlar] of this.kayitlar) {
      if (this.kapsamda(dosya)) kapsamdakiler.push(...kayitlar);
    }
    return kapsamdakiler.sort((a, b) =>
      a.dosya.localeCompare(b.dosya, "tr") || a.fikir.satir - b.fikir.satir);
  }

  /** Defterin bugünkü içeriğini kapsam süzgecinden geçirip panele basar. */
  yayımla(): void {
    const gorunen = this.gorunenler();
    this.sayac += 1;
    this.yayinKapisi(gorunen);
  }
}

/**
 * Görünür içeriğin kimliği — iki yerleşimin aynı olup olmadığını ölçer ve
 * yinelenen çizimi yapısal olarak sıfırda tutar. Panelin bastığı her alan ize
 * girer; bir alan ize girmezse o alandaki değişiklik ekrana hiç ulaşmaz.
 */
export function fikirParmakIzi(kayitlar: readonly FikirKaydi[]): string {
  return kayitlar
    .map((k) => [
      k.proje.kod, k.dosya, k.fikir.satir, k.fikir.kod,
      k.fikir.ne, k.fikir.durum, k.fikir.dönüşTetikleyici,
    ].join("|"))
    .join(";");
}

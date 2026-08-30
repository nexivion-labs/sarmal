// ═══════════════════════════════════════════════════════════════════════════
// tur-goruntusu.ts — 🗺️ TURUN GÖRÜNTÜSÜ VE TEK YAYINI (PRF-TA-A02 · VS Code'suz saf modül)
//
//   ÖLÇÜLEN KUSUR (2026-08-30 · SRN-IDE-KASMA-SOL-KOSUSU · OZK-12): denetim
//   turu çalışma alanının bütün `.sar` dosyalarını zaten topluyor, ayrıştırıyor
//   ve mevsim çevrimini uyguluyordu; buna rağmen yol haritası paneli kendi
//   taramasını koşturuyor, iki dosya araması ile iki yüz yetmiş altı belge açma
//   çağrısı yapıyor ve ayrı bir graf kuruyordu. Kanalda panel turu yirmi bin
//   dokuz milisaniye ölçüldü. Eksik olan şey hesabın kendisi değil, hesabın
//   SONUCUNUN tek bir kayıt olarak yayınlanmasıydı.
//
//   ONARIM: tur, ürettiği ağacı `TurGoruntusu` kaydı olarak toplar ve turun tek
//   yayın noktasında bir kez bildirir. Tüketiciler o kayda abone olur; kimse
//   ikinci bir tarama kurmaz ve ikinci bir bildirim yolu doğmaz. Onay
//   tarayıcısının ana görüntü bildirimi bugün bu yayının abonesidir
//   (onay-tarayici.ts); yol haritası paneli PRF-TA-A03 ile aynı kapıdan
//   beslenecektir ve bu modül o Adımı beklemeden bugünkü tek tüketiciyle
//   kilitlenir, çünkü yayın mekanizmasının nöbeti tüketici sayısına bağlı
//   değildir.
//
//   Modül vscode'u ne çalışma zamanında ne de tip olarak ithal eder
//   (tur-belgesi.ts emsalinin bir adım ötesi); böylece yayın mekanizması editör
//   kabuğu olmadan nöbete bağlanır ve "tur başına tek yayın" iddiası bir temenni
//   değil, sayılmış bir olgu olur. Sayaçlar üretimin içindedir ve dış yüzden
//   okunur (onay-tarayici.ts `tarayiciOlcumleri` deseni).
//
//   SÖZLEŞME (PRF-TA-A01 koşu kaydı ve PRF-TA-A02 denetim eki): kayıt sekiz alan
//   taşır ve alanların ikisi TÜRETİLİR. `kirik`, belge toplamayı geçip program
//   haritasına giremeyen yolların listesidir; `okunamayan` ise diskten okunamayıp
//   atlanan dosya sayısıdır ve dili elle değiştirilmiş açık belgeyi İÇERMEZ, o
//   belge `dilDışı` listesinde ayrı durur. Kümeler ayrı girdilerden çıktığı için KESİŞMELERİ YAPISAL OLARAK
//   BOŞTUR: okunamayan dosya belgeler haritasına hiç girmez ve dolayısıyla
//   kırık listesine de giremez. Sayıyı çağırandan almak yerine kümelerden
//   türetmek bilinçli bir seçimdir: iki sayaç elle taşınsaydı biri sessizce
//   bayatlar ve panel bir dosyayı hem kırık hem okunamayan sayardı.
// ═══════════════════════════════════════════════════════════════════════════

import type { Program } from "../../cekirdek/src/sozdizim.ts";

/**
 * Bir denetim turunun bütün sonucu — turun tüketicilerinin ORTAK gerçeği.
 *
 * Kayıt donmuş bir yüzdür; taşıdığı harita ile diziler turun kendi nesneleridir
 * ve salt okur tiplerle verilir. Tüketici onları kopyalamaz, çünkü kopya bir
 * sonraki turda bayatlayan ikinci bir gerçek doğurur.
 */
export interface TurGoruntusu {
  /**
   * Turun program haritası: mutlak `fsPath` → ağaç. `turProgramlariniKur`
   * çıktısıdır ve mevsim çevrimi uygulanmış hâliyle gelir (MIM-1.2 ③).
   */
  readonly programlar: ReadonlyMap<string, Program>;
  /** Erişim sınırından geçmiş, turun taradığı yol kümesi (`erisimSiniri` çıktısı). */
  readonly yollar: readonly string[];
  /**
   * Söz dizimi kırık olduğu için program haritasına GİRMEYEN yollar. Bu dosyalar
   * okunmuştur; hatalarını tek dosya yolu yakalar ve çapraz denetim ağacına
   * girmeleri gerekmez.
   */
  readonly kirik: readonly string[];
  /**
   * Diskten OKUNAMAYIP atlanan dosya sayısı (A01 sözleşmesi): silinmiş ya da
   * erişilemeyen dosya. Bu dosyalar ayrıştırmaya hiç girmediği için `kirik`
   * listesiyle kesişmezler. Dili elle değiştirilmiş açık belge buraya GİRMEZ;
   * o dosya okunabilirdir ve `dilDışı` listesinde ayrı durur (denetçi bulgusu,
   * PRF-TA-A02 ikinci tur).
   */
  readonly okunamayan: number;
  /**
   * Açık olduğu hâlde dili `sarmal` olmayan, bu yüzden turun dışında bırakılan
   * yollar. Kullanıcı bu belgeyi bilinçle başka dile almıştır; okunamayan
   * değildir ve kırık da değildir, üçüncü bir kümedir.
   */
  readonly dilDışı: readonly string[];
  /** Turu başlatan olayın adı (`başlangıç` · `sar-olayı` · `ayar` …). */
  readonly tetik: string;
  /**
   * Daraltılmış turun kökü; tam turda `undefined` (`turKapsami` sözleşmesi).
   * Alan yalnız ETİKETTİR: daraltma çapraz denetimin köklerini seçer, belge
   * toplama ile ayrıştırma her turda bütün yollar üzerinde koşar. Bu yüzden
   * görüntünün program haritası dar turda da tam turdaki hâliyle aynıdır.
   */
  readonly kapsam: string | undefined;
  /**
   * Tur başına bir artan yayın numarası. "Tur başına tek yayın" iddiası bu
   * sayıyla ölçülür; iddia ile değil.
   */
  readonly sıra: number;
}

/**
 * Yayına verilen taslak: kaydın türetilmeyen alanları ile türetmenin girdisi.
 * `sıra` burada yoktur, çünkü numarayı yayın verir; çağıranın numara ataması
 * ikinci bir sayaç doğururdu.
 */
export interface TurGoruntusuTaslagi {
  readonly programlar: ReadonlyMap<string, Program>;
  readonly yollar: readonly string[];
  /**
   * Turun topladığı belgeler. Kayıt yalnız ANAHTAR kümesini okur; değerin tipi
   * bilinçle serbesttir, çünkü belge yüzünü bilmek görüntüyü turun belge
   * yoluna bağlar ve bu modülün tek işi sonucu yayınlamaktır.
   */
  readonly belgeler: ReadonlyMap<string, unknown>;
  /** Belge toplamanın dili `sarmal` olmadığı için dışarıda bıraktığı açık belgeler. */
  readonly dilDışı: readonly string[];
  readonly tetik: string;
  readonly kapsam: string | undefined;
}

/** Yayının abonesi. Dönüş değeri yoktur: tüketici turu yönlendiremez. */
export type TurGoruntusuDinleyicisi = (goruntu: TurGoruntusu) => void;

const dinleyiciler = new Set<TurGoruntusuDinleyicisi>();

// ── 📏 YAYIN SAYAÇLARI ──────────────────────────────────────────────────────
//   Kabul ölçütü "tur başına tek görüntü yayını vardır" diyor. Bir iddia ancak
//   sayılabiliyorsa kanıtlanabilir; sayaçlar bu yüzden üretimin içindedir ve
//   nöbet onları dış yüzden okur (onay-tarayici.ts `tarayiciOlcumleri` deseni).
const sayaç = { yayın: 0, dinleyiciÇağrısı: 0, dinleyiciHatası: 0 };

let sonGoruntu: TurGoruntusu | undefined;

/**
 * Kaydı kurar — `kirik` ile `okunamayan` burada TÜRETİLİR.
 *
 * Kırık listesi belgeler ile programlar kümelerinin farkıdır: dosya okunmuş
 * fakat ağacı kurulamamıştır. Okunamayan sayısı ise yollar ile belgeler
 * kümelerinin farkından dil dışı bırakılanlar çıkarılınca kalandır: dosya turun
 * evrenindedir, belgesi doğmamıştır ve bunun nedeni dil seçimi değil okuma
 * başarısızlığıdır. Üç kümenin girdisi ayrı olduğu için kesişmeler yapısal
 * olarak boştur ve `okunamayan + dilDışı`, belge sayacının `atlanan` alanıyla
 * birebir aynı sayıya iner.
 */
function turGoruntusunuKur(taslak: TurGoruntusuTaslagi, sıra: number): TurGoruntusu {
  const kirik: string[] = [];
  for (const yol of taslak.belgeler.keys()) if (!taslak.programlar.has(yol)) kirik.push(yol);
  const dilDışıKüme = new Set(taslak.dilDışı);
  let okunamayan = 0;
  for (const yol of taslak.yollar) if (!taslak.belgeler.has(yol) && !dilDışıKüme.has(yol)) okunamayan += 1;
  return Object.freeze({
    programlar: taslak.programlar,
    yollar: taslak.yollar,
    kirik,
    okunamayan,
    dilDışı: [...taslak.dilDışı],
    tetik: taslak.tetik,
    kapsam: taslak.kapsam,
    sıra,
  });
}

/**
 * Turun TEK yayın noktası. Kaydı kurar, numarasını verir, son görüntü olarak
 * saklar ve abonelere bildirir; kaydı çağırana da döndürür ki tur onu merceğe
 * ya da kendi kanalına yazabilsin.
 *
 * Dinleyici çöküşü turu DÜŞÜRMEZ (`denetimKos` çevresindeki koruma emsali:
 * blast-radius sıfır). Bir tüketicinin çizim hatası turun geri kalanını —
 * mercek satırını ve kilit çevrimini — iptal edemez. Çöküş sessiz de değildir:
 * `dinleyiciHatası` sayacına düşer ve dış yüzden okunur. Abone kümesinin
 * kopyası gezilir, çünkü bir dinleyici bildirim sırasında aboneliğini
 * bırakabilir ve küme gezinirken değişirse bildirim yarım kalırdı.
 */
export function turGoruntusunuYayinla(taslak: TurGoruntusuTaslagi): TurGoruntusu {
  sayaç.yayın += 1;
  const goruntu = turGoruntusunuKur(taslak, sayaç.yayın);
  sonGoruntu = goruntu;
  for (const dinleyici of [...dinleyiciler]) {
    sayaç.dinleyiciÇağrısı += 1;
    try { dinleyici(goruntu); }
    catch { sayaç.dinleyiciHatası += 1; }
  }
  return goruntu;
}

/**
 * Yayına abone olur ve aboneliği bırakan işlevi döndürür. Abone, yayın anında
 * kaydın kendisini alır; kimse turu yeniden hesaplamaz.
 */
export function turGoruntusunuDinle(dinleyici: TurGoruntusuDinleyicisi): () => void {
  dinleyiciler.add(dinleyici);
  return () => { dinleyiciler.delete(dinleyici); };
}

/**
 * Bugün elde olan son görüntü — geç gelen tüketici ilk turu kaçırmasın diye.
 * Panel ya da yüzey ilk yayından sonra kurulursa buradan kendini doldurur.
 */
export function sonTurGoruntusu(): TurGoruntusu | undefined {
  return sonGoruntu;
}

/** Yayının bugünkü sayaçları — nöbet bu kapıdan okur. */
export function turGoruntusuOlcumleri(): Readonly<typeof sayaç> & { sıra: number; dinleyici: number } {
  return { ...sayaç, sıra: sonGoruntu?.sıra ?? 0, dinleyici: dinleyiciler.size };
}

/**
 * Nöbet için: son görüntüyü ve sayaçları unutur. Abonelikler korunur, çünkü
 * aboneliği kuran taraf onu kendi eliyle bırakır. Üretim yolu bunu çağırmaz.
 */
export function turGoruntusunuUnut(): void {
  sonGoruntu = undefined;
  sayaç.yayın = 0; sayaç.dinleyiciÇağrısı = 0; sayaç.dinleyiciHatası = 0;
}

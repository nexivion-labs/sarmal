// ═══════════════════════════════════════════════════════════════════════════
// kok-yuzeyi.ts — 🌍 Kök Yüzeyi Nöbeti (KYN-MTR-A04 · MIM-3 · YUZ-1.2 · STR-3)
//
//   NEDEN VAR. Deponun dünyaya bakan yüzü çalışma alanının KÖKÜNDE yaşar:
//   tanıtım dosyaları, katkı rehberi, güvenlik bildirimi, davranış kuralı ve
//   yürütücü yönergesi. Bu dosyalar metinlerinin içinde bizim kimliklerimize
//   atıf verir; okuyucuya "şu kural şurada, şu raf şuna ayrılmıştır" der. Motorun
//   metin atıf taraması ise denetim KÖKÜNÜN ALTINI tarar ve bu dosyalar hiçbir
//   varlığın altında olmadığı için taramanın görüş alanına hiç girmez.
//
//   KUSURUN ÖLÇÜLMÜŞ BEDELİ. Kök tanıtım dosyasında artık hiçbir `.sar` gövdesinde
//   tanımlı olmayan kimlikler aylarca fark edilmeden durdu; okuyucu bu adları
//   arayıp bulamaz ve belgeye olan güvenini kaybeder. Bu Adım o dosyaların
//   İÇERİĞİNİ tazelemez, yalnız onları motorun görüş alanına sokar; bayat metnin
//   düzeltilmesi ayrı bir işin konusudur ve nöbet bulguyu görünür kılmakla yetinir.
//
//   NEDEN AYRI MODÜL VE AYRI KAPI — VARLIK AYRILIĞI (STR-3). Denetçi bir VARLIK
//   ağacını denetler; `_Sarmal` ya da `_KapaliUrun` kökünden aşağı yürür ve
//   bulgularını yalnız o varlığın karnesine yazar. Kök yüzey dosyaları ise iki
//   varlığın da ÜSTÜNDE yaşar. Bu nöbet denetçinin içine konulsaydı kök bulgusu
//   tek bir varlığın sonucu gibi raporlanır ve iki varlığın karnesi birbirine
//   karışırdı; aynı bulgu iki varlık için de üretilseydi bu kez tek olgu iki kez
//   sayılırdı. Nöbetin kendi modülünde ve kendi kapı yüzünde yaşaması, kapsamının
//   çalışma alanı kökü olduğunu yapısal olarak beyan eder. Desen icat edilmemiştir:
//   yönerge ikizi nöbeti (`yonerge-ikizi.ts`) aynı gerekçeyle aynı yerde durur ve
//   tanı sicili başlığındaki ikinci muafiyet maddesi bu kapı ailesini adıyla anar.
//
//   ATIF EVRENİ AÇIK ARACINDIR (kapsam dürüstlüğü). Kök dosyalar ölçülmüş biçimde
//   yalnız açık aracın kimliklerine atıf verir. ÖLÇÜMÜN TANIMI ÖNCE YAZILIR, çünkü
//   neyin sayıldığı söylenmeden verilen sayı yeniden üretilemez: aşağıdaki sayılar
//   `KOK_YUZEYLERI` listesindeki YEDİ dosyanın, `sar` etiketli çit blokları
//   boşaltıldıktan sonraki kod adaylarını sayar; "anma" her geçişi, "ayrık kimlik"
//   ise yinelenmeyen kod adını sayar (2026-08-09 ölçümü).
//     • Kırk beş anma, yirmi dört ayrık kimlik bulunur.
//     • Bu yirmi dört kimliğin ON ALTISI açık aracın evreninde çözülür.
//     • Kapalı ürünün evreninde YALNIZ orada tanımlı olan kimlik SIFIRDIR ve iki
//       evrende birden tanımlı kimlik de SIFIRDIR — kök yüzeyi kapalı ürünün
//       kimliklerine hiç atıf vermemektedir.
//     • Çözülmeyen sekiz kimliğin altısı bu nöbetin bugün bildirdiği bayat
//       atıflardır; kalan ikisi kimlik şekli taşımadığı için düz yazı sayılıp elenir.
//   Bu yüzden nöbet atıfları YALNIZ açık aracın kod indeksine vurur; kapalı ürünün
//   indeksi hiç okunmaz ve iki varlığın kimlik evreni birleştirilmez. Evren
//   `KOK_ATIF_EVRENI` sabitiyle ilan edilir ve ilan diskte bulunamazsa nöbet
//   sessizce yeşil vermez, `kök-yüzeyi-evrensiz` hatasını basar.
//
//   İKİ SÜZGEÇ, BİRİ BİLİNÇLİ OLARAK GENİŞ (beyansız daralma da beyansız genişleme
//   de kabul edilmez). Varlık içindeki metin atıf taraması iki süzgeç taşır: adayın
//   ailesinin `.sar` tanımlarından türemesi ve adayın rakam taşıyan bir parçayla
//   bitmesi. Bu nöbet İKİNCİ süzgeci aynen alır, BİRİNCİSİNİ ise bilinçli olarak
//   almaz.
//     • Aile süzgeci varlık taramasında meşrudur, çünkü oranın evreni binlerce
//       dosyadır ve süzgeç olmadan yüzlerce sahte bulgu doğar. Kök yüzeyinin evreni
//       ise elle ilan edilmiş yedi dosyadır ve bu dosyaların var oluş amacı zaten
//       bizim kimliklerimize işaret etmektir.
//     • Aile süzgeci korunsaydı nöbet, ailesi TAMAMEN emekli olmuş kimlikleri hiç
//       göremezdi; oysa kök tanıtım dosyasında aylarca duran bayat atıflar tam
//       olarak bu cinstendir. Kendi doğuş gerekçesini göremeyen bir nöbet koruma
//       değil süstür.
//     • Genişlemenin bedeli ölçülmüştür: bugün diskte duran yedi kök yüzeyinde bu
//       kapsamla altı bulgu doğar ve altısı da gerçekten karşılıksız kimliklerdir;
//       gürültü sıfırdır.
//
//   VARLIK TARAFINDAKİ KÖR NOKTA — KAYDI BURAYA DÜŞÜLÜR, KAPATILMAZ (bağımsız
//   denetçi ölçümü, 2026-08-09). Aile süzgecinin varlık tarafında meşru sayılması
//   yalnız evrenin büyüklüğüne dayanmaz; ölçüm daha ağır bir sonuç göstermektedir
//   ve bu sonucun yazılı olmaması, kör noktanın kapatılmış sanılmasına yol açardı.
//     ① Varlık içi metin atıf taraması yalnız `.md` ve `.ts` uzantılarını tarar;
//       `.sar` dosyalarını hiç taramaz. Dolayısıyla bir bayat kimlik varlığın KENDİ
//       kanonik kaynağında geçiyorsa orada da görünmez kalır.
//       Bu Adımın somut vakası tam olarak budur: aynı emekli kimlikler kök tanıtım
//       dosyasının yanı sıra açık aracın anadizin ilanında da yaşamaktadır.
//     ② Aile süzgeci kendi kendini besleyen bir körlük üretir: açık aracın aile
//       kümesi bugün YÜZ OTUZ YEDİ aileden oluşur ve `PLN`, `H` ile `F` aileleri bu
//       kümede YOKTUR. Bir aile ne kadar tamamen emekliyse tanımı o kadar yoktur,
//       tanımı yoksa aile kümesine giremez, giremezse ona yapılan bütün bayat
//       atıflar sonsuza dek görünmez kalır. Yani süzgeç en çok, en çok gerekli
//       olduğu yerde susar.
//   Bu iki gözlem bu Adımın sınırının dışındadır ve burada yalnız KAYIT olarak
//   durur; kapatılması varlık içi taramanın kendi işidir.
//
//   ÖRNEK KAYNAK BLOKLARI KAPSAM DIŞIDIR. `sar` etiketli bir çit bloğu öğretim
//   malzemesidir: içindeki kodlar okuyucuya dilin biçimini gösterir, gerçek bir
//   kimliğe atıf vermez. Gerekçe varlık taramasının `*.test.ts` muafiyetiyle
//   aynıdır — sentetik malzeme kimlik evrenine karşı ölçülmez. Bu kural bugün
//   hiçbir bulguyu değiştirmez, çünkü kökteki örnek bloğunun kodları rakamsızdır
//   ve zaten ikinci süzgece takılır; kural yarın rakam taşıyan bir örnek kodu
//   yazıldığında doğacak öngörülebilir sahte bulguyu baştan keser.
//
//   LİSANS METNİ NEDEN LİSTEDE DEĞİL. Kök dosyaların hepsi bizim yüzümüz değildir:
//   lisans metni dış dünyaya ait standart bir belgedir ve bizim kimlik evrenimize
//   atıf vermez, dolayısıyla ona karşılıksız atıf aramak anlamsızdır. Muafiyet
//   sessiz bırakılmaz; `KOK_KAPSAM_DISI` listesinde gerekçesiyle yazılıdır ve
//   kökte ilan edilmemiş yeni bir dosya doğduğunda nöbet `kök-yüzeyi-beyansız`
//   bulgusuyla onu görünür kılar (MIM-3: ilansız yapı drifttir).
//
//   İKİ KATMAN AYRIK (iskeletçi, denetçi ve ikiz nöbeti deseni izlenir):
//     kokYuzeyiAtiflari(yüzler, içerikler, evren) → saf; diske dokunmaz, sınanır
//     kokYuzeyleriOku(kök, yüzler)                → etkili; diskten içerik toplar
//     kimlikEvreniniKur(evrenKökü)                → etkili; açık aracın indeksi
//     kokYuzeyiDenetle(kök, …)                    → ikisini birleştiren kapı yüzü
// ═══════════════════════════════════════════════════════════════════════════

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { KimlikIndeksi } from "./kimlik.ts";
import { programlariYukle, kodIndeksle, diskTara } from "./denetci.ts";
import { kokYuzeyiTanisi } from "./tani-metinleri.ts";   // kullanıcıya söylenen her cümle tek katalogda yaşar; üretici yalnız olguyu verir
import type { Tani } from "./tani.ts";

/**
 * Bir kök yüzeyi, çalışma alanının kökünde yaşayan ve dış dünyaya bizim
 * kimliklerimizi anlatan bir dosyadır. `ne` alanı dosyanın hangi yüzü taşıdığını
 * söyler; gerekçesiz bir liste altı ay sonra okuyana neyin niçin izlendiğini
 * anlatamaz ve sessizce büyür.
 */
export interface KokYuzeyi {
  /** Çalışma alanı köküne göreli yol (POSIX). */
  yol: string;
  /** Dosyanın taşıdığı yüz — listenin okunabilir gerekçesi. */
  ne: string;
}

/** Kökte duran fakat bilinçli olarak nöbet dışında bırakılan dosya. */
export interface KokKapsamDisi {
  /** Çalışma alanı köküne göreli yol (POSIX). */
  yol: string;
  /** Muafiyetin gerekçesi — sessiz muafiyet muafiyet değil kaçaktır. */
  gerekce: string;
}

/**
 * KÖK YÜZEYİ LİSTESİ — TEK KAYNAK. Nöbetin baktığı bütün dosyalar yalnız
 * buradadır; ne kanca betiği ne de sınama dosyası ikinci bir liste tutar. Kökte
 * yeni bir yüzey doğduğunda yapılacak iş bu diziye tek bir kayıt eklemektir.
 */
export const KOK_YUZEYLERI: readonly KokYuzeyi[] = [
  { yol: "README.md", ne: "Türkçe tanıtım yüzü — deponun ilk okunan sayfası ve raf haritası" },
  { yol: "README.en.md", ne: "İngilizce tanıtım yüzü — aynı karşılamanın ikinci dili" },
  { yol: "CONTRIBUTING.md", ne: "Katkı rehberi — kaynağın nerede yaşadığını ve hangi kapıdan geçildiğini anlatır" },
  { yol: "SECURITY.md", ne: "Güvenlik bildirimi — zafiyet bildirim yolu ve sorumluluk sınırı" },
  { yol: "CODE_OF_CONDUCT.md", ne: "Davranış kuralı — topluluk yüzü" },
  { yol: "CLAUDE.md", ne: "Yürütücü yönergesi — kalıcı kurallar ve adresler işaretçisi" },
  { yol: "AGENTS.md", ne: "Yürütücü yönergesinin ikinci adı — ikiz nöbeti ayrıca bayt özdeşliğini korur" },
  { yol: "PRIVACY.md", ne: "Gizlilik politikası — hangi verinin toplandığı ve nereye gittiği; dizin başvurusunun şart koştuğu yüz" },
  // Açık deponun tek kökü (GOC-A08 · 2026-08-25): açık aracın kökündeki beş üretilen belge de artık depo kökündedir.
  { yol: "NEDIR.md", ne: "Kavramsal açıklama yüzü — Sarmal nedir, ne değildir" },
  { yol: "KAVRAMLAR.md", ne: "Başvuru indeksi — kavramların kanonik adresleri" },
  { yol: "ROL-HARITASI.md", ne: "Açık ve kapalı rol sınırının haritası" },
  { yol: "NOTICE.md", ne: "Atıf bildirimi — gömülü üçüncü taraf kaynakların lisans kayıtları" },
];

/**
 * KÖKTE İLAN EDİLMİŞ MUAFİYETLER. Bir dosyanın nöbet dışında kalması meşru
 * olabilir, fakat bu karar görünür olmak zorundadır; aksi hâlde nöbetin kapsamı
 * zamanla kimsenin fark etmediği bir yerden daralır.
 */
export const KOK_KAPSAM_DISI: readonly KokKapsamDisi[] = [
  {
    yol: "LICENSE.md",
    gerekce:
      "Lisans metni dış dünyaya ait standart bir belgedir ve bizim kimlik evrenimize " +
      "atıf vermez; içinde karşılıksız kod atfı aramak anlamsız olurdu.",
  },
  {
    yol: "ebedi.kilit.json",
    gerekce: "Ebedî kuralın makine mührüdür; insan yüzü değildir ve kimlik atfı taşımaz.",
  },
  {
    yol: "sarmal_anadizin.sar",
    gerekce: "Deponun anadizinidir ve motorun kendi denetiminden geçer; kök yüzeyi nöbeti markdown yüzleri ölçer.",
  },
];

/**
 * ATIF EVRENİNİN SAHİBİ. Kök yüzeyleri açık aracın kimliklerine atıf verir, bu
 * yüzden çözüm yalnız açık aracın kod indeksine vurulur. Sabit bir addır fakat
 * varsayım değildir: sınama gerçek kökü okuyup bu dizinin var olduğunu ve
 * indeksin dolduğunu ölçer, kapı ise dizin yoksa hata basar.
 */
export const KOK_ATIF_EVRENI = ".";   // açık depoda kök ile evren aynı ağaçtır (GOC-A08 sekizinci küme kararı · 2026-08-25)

/**
 * SINIRIN KARŞI YAKASI. Kapalı ürün ağacının kök klasör adı burada BİR KEZ
 * ilan edilir; açık-gizli sınır nöbeti hem yol hem içerik biçiminde bu addan
 * türer. Ad koda gömülü kaldığı sürece klasör yeniden adlandırıldığında nöbet
 * sessizce körleşir: kapalı ürünü haksız yere suçlar ve gerçek ihlalleri hiç
 * görmez. Tek kaynak bu sessiz körlüğü kapatır.
 */
export const GIZLI_KOK_ADI = "_KapaliUrun";   // kapalı ürünün gerçek klasör adı açık depoda ilan edilmez; sınır nöbeti bu yer tutucuyla çalışır ve gerçek ad çatı düzeyinde bağlanır (GOC-A08 · 2026-08-25)

/** Kimlik şekli: en az bir parçası rakam taşıyan bir kuyrukla biter (ikinci süzgeç). */
const KOD_SEKLI = /-[A-ZÇĞİÖŞÜ_]*\d[A-Z0-9ÇĞİÖŞÜ_]*$/u;

/** `sar` etiketli çit bloğunun açılış satırı — örnek KAYNAK burada başlar. */
const ORNEK_CIT_ACILIS = /^\s*```+\s*sar\s*$/iu;

/** Herhangi bir çit satırı — kapanışı tanımak için açılıştan bağımsız aranır. */
const CIT_SATIRI = /^\s*```/u;

/**
 * `sar` etiketli çit bloklarının içini boşaltır (saf). Satır SAYISI korunur,
 * çünkü bulgunun adresi kullanıcının dosyada gideceği yerdir ve satırları kaydıran
 * bir temizlik adresi yalanlar. Blok kapanmadan dosya biterse kalan satırlar da
 * boşaltılır; kapanmamış bir örnek bloğunu düz metin saymak, o bloğun tamamını
 * sahte bulgu kaynağına çevirirdi.
 */
export function ornekCitleriniBosalt(metin: string): string {
  const satirlar = metin.split("\n");
  let ornekIcinde = false;
  const cikti = satirlar.map((satir) => {
    if (!ornekIcinde) {
      if (ORNEK_CIT_ACILIS.test(satir)) { ornekIcinde = true; return ""; }
      return satir;
    }
    if (CIT_SATIRI.test(satir)) { ornekIcinde = false; return ""; }
    return "";
  });
  return cikti.join("\n");
}

/**
 * Kök yüzeylerindeki KARŞILIKSIZ kod atıflarını bulur (SAF — diske dokunmaz;
 * hem dosya içerikleri hem kimlik evreni dışarıdan verilir).
 *
 * Dönen kayıt `{ dosya, tani }` biçimindedir, çünkü bu kapı çok dosyalıdır ve
 * `Tani` kendi başına dosya alanı taşımaz; aynı desen denetçinin çok dosyalı
 * kapılarında da kullanılır.
 *
 * @param yuzler   ölçülecek yüzeyler (varsayılan: ilan edilmiş kök yüzeyi listesi)
 * @param icerikler yol → içerik; değer `undefined` ise dosya diskte bulunamamıştır
 * @param evren    açık aracın kimlik evreni (kod indeksi + belge kimlikleri)
 */
export function kokYuzeyiAtiflari(
  yuzler: readonly KokYuzeyi[],
  icerikler: ReadonlyMap<string, string | undefined>,
  evren: ReadonlySet<string>,
): Array<{ dosya: string; tani: Tani }> {
  const out: Array<{ dosya: string; tani: Tani }> = [];
  for (const yuz of yuzler) {
    const icerik = icerikler.get(yuz.yol);
    if (icerik === undefined) {
      out.push({
        dosya: yuz.yol,
        tani: kokYuzeyiTanisi("kök-yüzeyi-eksik-dosya", "hata", { yol: yuz.yol, ne: yuz.ne }, { satir: 1, sutun: 1 }),
      });
      continue;
    }
    // Kimlik indeksi metin katmanını yürütür; `.sar` olmayan dosyada zaten yalnız
    // o katman çalışır, dolayısıyla söz dizimi ayrıştırılmaz ve bozuk metin de ölçülür.
    const indeks = new KimlikIndeksi();
    indeks.dosyaGuncelle(yuz.yol, ornekCitleriniBosalt(icerik));
    for (const aday of indeks.tumAdaylar()) {
      if (evren.has(aday.kod)) continue;      // çözülüyor — atıf sağlam
      if (!KOD_SEKLI.test(aday.kod)) continue; // ikinci süzgeç: kimlik şekli
      out.push({
        dosya: yuz.yol,
        tani: kokYuzeyiTanisi(
          "kök-yüzeyi-karşılıksız-atıf", "uyarı",
          { kod: aday.kod, yol: yuz.yol },
          { satir: aday.satir, sutun: aday.sutun },
        ),
      });
    }
  }
  return out;
}

/**
 * İlan edilmiş yüzeylerin içeriğini diskten okur (etkili katman). Okunamayan
 * dosya `undefined` döner ve saf katman bunu eksik dosya hatasına çevirir;
 * okunamayan bir yüzey sessizce yeşil vermez.
 */
export function kokYuzeyleriOku(
  kok: string,
  yuzler: readonly KokYuzeyi[] = KOK_YUZEYLERI,
): Map<string, string | undefined> {
  const harita = new Map<string, string | undefined>();
  for (const yuz of yuzler) {
    try { harita.set(yuz.yol, readFileSync(join(kok, yuz.yol), "utf8")); }
    catch { harita.set(yuz.yol, undefined); }
  }
  return harita;
}

/**
 * Açık aracın kimlik evrenini kurar (etkili katman): `.sar` gövdelerinden doğan
 * kod indeksi ile belge başlıklarından doğan artefakt kimlikleri birleşir. İki
 * kaynak da varlık denetiminin çözüm evreniyle aynıdır, dolayısıyla kök yüzeyi
 * bir kimliği denetçinin çözdüğü hâlde karşılıksız sayamaz.
 */
export function kimlikEvreniniKur(evrenKoku: string): ReadonlySet<string> {
  const { programlar } = programlariYukle(evrenKoku);
  const evren = new Set<string>(kodIndeksle(programlar).keys());
  for (const girdi of diskTara(evrenKoku).girdiler) if (girdi.kod) evren.add(girdi.kod);
  return evren;
}

/**
 * Kökte duran fakat ne yüzey ne de muaf olarak ilan edilmiş dosyaları bulur
 * (etkili katman). Gizli dosyalar ve dizinler kapsam dışıdır: nöbetin sorusu
 * "deponun dünyaya bakan yüzü tam mı ilan edilmiş?" sorusudur, kökün bütün
 * içeriğinin envanteri değildir.
 */
export function beyansizKokDosyalari(
  kok: string,
  yuzler: readonly KokYuzeyi[] = KOK_YUZEYLERI,
  kapsamDisi: readonly KokKapsamDisi[] = KOK_KAPSAM_DISI,
): string[] {
  const bilinen = new Set<string>([...yuzler.map((y) => y.yol), ...kapsamDisi.map((k) => k.yol)]);
  let girdiler;
  try { girdiler = readdirSync(kok, { withFileTypes: true }); }
  catch { return []; }
  return girdiler
    .filter((g) => g.isFile() && !g.name.startsWith(".") && !bilinen.has(g.name))
    .map((g) => g.name)
    .sort((a, b) => a.localeCompare(b, "tr"));
}

/**
 * Çalışma alanı kökünün yüzey nöbetini koşar ve bulguları döndürür (kapı yüzü).
 * Boş liste, ilan edilmiş bütün yüzeylerin diskte durduğu, hiçbirinde karşılıksız
 * kimlik kalmadığı ve kökte ilansız dosya bulunmadığı anlamına gelir.
 */
export function kokYuzeyiDenetle(
  kok: string,
  yuzler: readonly KokYuzeyi[] = KOK_YUZEYLERI,
  kapsamDisi: readonly KokKapsamDisi[] = KOK_KAPSAM_DISI,
  evrenAdi: string = KOK_ATIF_EVRENI,
): Array<{ dosya: string; tani: Tani }> {
  const evrenKoku = join(kok, evrenAdi);
  if (!existsSync(evrenKoku)) {
    return [{
      dosya: evrenAdi,
      tani: kokYuzeyiTanisi("kök-yüzeyi-evrensiz", "hata", { evren: evrenAdi }, { satir: 1, sutun: 1 }),
    }];
  }
  const bulgular = kokYuzeyiAtiflari(yuzler, kokYuzeyleriOku(kok, yuzler), kimlikEvreniniKur(evrenKoku));
  for (const ad of beyansizKokDosyalari(kok, yuzler, kapsamDisi)) {
    bulgular.push({
      dosya: ad,
      tani: kokYuzeyiTanisi("kök-yüzeyi-beyansız", "uyarı", { yol: ad }, { satir: 1, sutun: 1 }),
    });
  }
  return bulgular;
}

/**
 * Kapı çıktısının insan yüzü. Yeşil satır hangi dosyaların gerçekten ölçüldüğünü
 * adlarıyla söyler, çünkü rapor kendi ölçmediği bir listeyi anmamalıdır. Bulgu
 * satırları dosya adresiyle basılır; okuyucunun gideceği yer bellidir.
 */
export function kokYuzeyiRaporu(
  bulgular: ReadonlyArray<{ dosya: string; tani: Tani }>,
  yuzler: readonly KokYuzeyi[] = KOK_YUZEYLERI,
): string {
  if (bulgular.length === 0) {
    return `🌍✅ kök yüzeyi: karşılıksız atıf yok — ${yuzler.map((y) => y.yol).join(" · ")}`;
  }
  const hata = bulgular.filter((b) => b.tani.duzey === "hata").length;
  const satirlar = bulgular.map(({ dosya, tani }) => {
    const simge = tani.duzey === "hata" ? "⛔" : tani.duzey === "uyarı" ? "⚠️" : "ℹ️";
    const konum = tani.satir > 0 ? `${dosya}:${tani.satir}:${tani.sutun}` : dosya;
    const govde = `${simge} ${konum} — ${tani.mesaj}`;
    return tani.oneri ? `${govde}\n   → ${tani.oneri}` : govde;
  });
  const baslik = `🌍${hata > 0 ? "⛔" : "⚠️"} kök yüzeyi: ${bulgular.length} bulgu (${hata} hata) — ${yuzler.length} yüzey ölçüldü`;
  return [baslik, ...satirlar].join("\n");
}

// ═══════════════════════════════════════════════════════════════════════════
// tur-belgesi.ts — 📄 TURUN BELGE YÜZÜ (PRF-A06 · VS Code'suz saf çekirdek)
//
//   ÖLÇÜLEN KUSUR (2026-08-29, Founder'ın canlı penceresi): olay-tetikli tur
//   otuz dört buçuk saniye sürüyordu ve bu sürenin yalnız yaklaşık yedi
//   saniyesi saf çekirdekteydi — iki yüz yetmiş altı dosyanın ayrıştırılması
//   iki bin yüz kırk dört, çapraz denetim ise sarmal kökünde beş yüz yetmiş
//   dokuz milisaniye ölçüldü. Geri kalan yaklaşık yirmi yedi saniye tek bir
//   satırdaydı: tur her dosyayı `openTextDocument` ile AÇIYORDU. O çağrı bir
//   belge modeli kurar, dil hizmetlerini uyandırır ve belgeyi bellekte tutar;
//   oysa turun belgeden istediği yalnız metin, satırlar ve kimliktir.
//
//   ONARIM: tur hiçbir dosyayı açmaz. Zaten açık olan editörler bellektedir ve
//   kabuk onları I/O'suz verir; açık olmayan dosya ham okunur. KAYDEDİLMEMİŞ
//   DEĞİŞİKLİK TAŞIYAN AÇIK BELGE önceliklidir, çünkü kaydedilmemiş bir
//   düzenlemenin tanısı diskteki eski metinden üretilirse panel kullanıcının
//   GÖRDÜĞÜ metni anlatmaz ve kullanıcı bunu kendi hatası sanar.
//
//   🩹 BKM-DNT-A18 (2026-10-24 saha bulgusu · HTR-EKLENTI-DAR-KAPSAM-BAYAT-PANEL):
//   öncelik eskiden koşulsuzdu. Bir dosya editörün DIŞINDAN değiştiğinde (başka
//   bir penceredeki ajan, git, komut satırı) VS Code modeli diski kendi tazeleme
//   döngüsünde okur; o döngüden önce koşan tur modeldeki ESKİ metni okuyor,
//   model sonradan tazelendiğinde yalnız tek dosya yolu koşuyor ve görüntü
//   yayını koşmadığı için yol haritası pencere yeniden yüklenene dek eski Adım
//   sayısında kalıyordu. Kaydedilmemiş değişiklik taşımayan açık belgenin
//   gerçeği disktir; artık o belge diskten okunur ve bellekteki önceliği yalnız
//   kaydedilmemiş düzenleme korur.
//
//   Modül vscode'u YALNIZ TİP olarak ithal eder (onbellek.ts emsali) ve hiçbir
//   çalışma zamanı çağrısı yapmaz; kabuk dışarıdan verilir (onay-tarayici.ts
//   `TaramaKabugu` deseninin ikizi). Böylece davranış editör kabuğu olmadan
//   nöbete bağlanır. Kimlik gerçek `Uri` olarak taşınır, çünkü tanı yayını
//   dosyayı ona göre adresler; yoldan yeniden kurulan bir kimlik adsız
//   tamponlarda başka bir dosyayı gösterirdi.
//
//   PRF-KP-A02: program haritasının kurulumu da bu modüle indi. Çekirdeğin
//   sözcükleyicisi ile ayrıştırıcısı saf TypeScript'tir ve editör bilmez;
//   onları ithal etmek modülün vscode'suz kalma sözünü bozmaz.
// ═══════════════════════════════════════════════════════════════════════════

import type * as vscode from "vscode";
import type { Program } from "../../cekirdek/src/sozdizim.ts";
import { belirtecle } from "../../cekirdek/src/belirtec.ts";
import { ayristir } from "../../cekirdek/src/ayristirici.ts";
import { posix } from "node:path";
import { kapsamIcinde } from "./yolharitasi-cekirdek.ts";   // 🛡️ PRF-KP-A05: kapsama ilişkisinin tek evi
import { sarKapsamDisi } from "./izleyici-cekirdek.ts";      // 🛡️ PRF-KP-A05: tarama globuyla aynı dışlama evreni

/**
 * Tanı yolunun belgeden istediği EN AZ yüz. Hem `vscode.TextDocument` hem de
 * diskten kurulan kayıt bu yüzü karşılar; tanı üreten hiçbir işlev bundan
 * fazlasını istememelidir, çünkü fazlası turu editör kabuğuna geri bağlar.
 */
export interface BelgeYuzu {
  readonly uri: vscode.Uri;
  getText(): string;
  readonly lineCount: number;
  lineAt(satır: number): { readonly text: string };
}

/** Turun kabuğu — hiçbir üyesi belge AÇMAZ. */
export interface BelgeKabugu {
  /** Editörde zaten açık belge (varsa); I/O yapılmaz. */
  açıkBelge(fsPath: string): BelgeYuzu | undefined;
  /** Açık belgenin dil kimliği; `sarmal` değilse dosya turun dışındadır. */
  dilKimliği(fsPath: string): string | undefined;
  /**
   * 🩹 BKM-DNT-A18: açık belge kaydedilmemiş değişiklik taşıyor mu (`isDirty`)?
   * Yalnız evet ise belge bellekten okunur; hayır ise gerçeği disktir ve tur onu
   * diskten okur. Üye zorunludur, çünkü kararı vermeyen bir kabuk açık belgeyi
   * yeniden koşulsuz öncelikli kılardı.
   */
  kaydedilmemisMi(fsPath: string): boolean;
  /**
   * Açık OLMAYAN dosyanın belge yüzü ve diskten okunan HAM bayt sayısı;
   * okunamıyorsa `undefined`. Bayt sayısı çözmeden önce ham tampondan alınır
   * (PRF-KP-A01 üçüncü kararı: merceğe düşen sayı turun okuduğu bayttır).
   */
  oku(fsPath: string): Promise<{ belge: BelgeYuzu; bayt: number } | undefined>;
}

/**
 * Diskten okunan metnin belge yüzü — satırlar ilk istendiğinde bir kez bölünür.
 *
 * SATIR SÖZLEŞMESİ (PRF-KP-A01 birinci kararı): satırlar `\r?\n` ile bölünür ki
 * disk kaydı VS Code belge modeliyle aynı satır sınırlarını görsün. Yalnız
 * `\n` ile bölen eski sözleşme CRLF dosyada her satırın sonunda taşıyıcı
 * dönüşü bırakıyordu; tanı aralığı rastlantıyla doğru çıkıyordu, çünkü sözcük
 * deseni taşıyıcı dönüşte durur, fakat satır uzunluğu bir fazlaydı. Yalnız
 * taşıyıcı dönüşle biten dosya bilinçle kapsam dışıdır: VS Code onu çok satır,
 * bu kayıt tek satır sayar ve sözcükleyici de yalnız yeni satırı saydığı için
 * disk kaydı motorla uyumludur; bu uç beyan edilir, onarılmaz.
 *
 * Boş dosya tek satırdır, çünkü boş dizeyi bölmek tek boş dize döner; sıfır
 * dönseydi tanı üretimi konumu eksi bire kırpardı. Bayt sırası imi (BOM)
 * burada soyulmaz, çünkü kabuğun `TextDecoder` çözücüsü onu varsayılan
 * ayarıyla zaten soymaktadır; metin buraya imsiz gelir.
 */
export function diskBelgesi(uri: vscode.Uri, metin: string): BelgeYuzu {
  let satırlar: string[] | undefined;
  const böl = (): string[] => (satırlar ??= metin.split(/\r?\n/));
  return {
    uri,
    getText: () => metin,
    get lineCount() { return böl().length; },
    lineAt: (satır: number) => ({ text: böl()[satır] ?? "" }),
  };
}

/**
 * Açık belgelerin yol haritası. YALNIZ `file` şemasındaki belgeler girer ve bu
 * süzgeç kusurun ta kendisinden doğmuştur: `textDocuments` dizisi dosyaların
 * yanında git karşılaştırma görünümlerini, çıktı kanallarını ve arama
 * sonuçlarını da taşır; bunların `fsPath` değeri aynı yolu gösterdiği için
 * şemaya bakmadan kurulan bir harita, bir dosyanın tanısını onun git'teki ESKİ
 * sürümünden üretebilir. Kullanıcı o zaman kaynağında olmayan bir hatayı
 * panelde görür ve hatayı kendi dosyasında arar.
 *
 * Çakışmada dosya şemalı belge kazanır; aynı yolda ikinci bir dosya belgesi
 * olamaz, çünkü VS Code bir dosyayı tek belge olarak açar.
 */
export function açıkBelgeHaritası<T extends { uri: vscode.Uri }>(
  belgeler: readonly T[],
): Map<string, T> {
  const harita = new Map<string, T>();
  for (const belge of belgeler) {
    if (belge.uri.scheme !== "file") continue;
    harita.set(belge.uri.fsPath, belge);
  }
  return harita;
}

/**
 * ⏱️ PNL-A14 · turun aynı anda bekleyebileceği en çok disk okuması.
 *
 *   ÖLÇÜLEN KUSUR (2026-10-27): tur dosyaları SIRAYLA okuyordu; her okuma bir
 *   öncekinin bitmesini bekliyordu. Açılışta kimlik indeksi taraması binlerce
 *   okumayı aynı anda kuyruğa koyduğu için turun her okuması o kuyruğun arkasına
 *   düşüyor ve okuma aşaması tek başına saniyeler sürüyordu. Okumalar artık
 *   birlikte yürür; sınır, bir turun dosya sistemini ve bellek tamponlarını
 *   yüzlerce eşzamanlı okumayla boğmamasını sağlar. Değer ölçüm düzeneğiyle
 *   (arac/tur-olcum.ts) seçilmiştir; Node'un dosya iş havuzu dört iş parçacığıdır
 *   ve bu sınır havuzu sürekli dolu tutmaya yeter.
 */
export const TUR_OKUMA_ESZAMANLILIGI = 16;

/**
 * Seçili yolları en çok `eşzamanlılık` okuma aynı anda bekleyecek biçimde okur;
 * sonuç dizisi yol dizisiyle AYNI SIRADADIR (okunmayan ya da okunamayan yolun
 * gözü `undefined`). Okumaların bitiş sırası sonucun sırasını etkilemez.
 * Bir okuma fırlatırsa toplu okuma reddedilir ve yeni okuma başlatılmaz;
 * bu, sıralı okumanın ilk hatada durmasının ikizidir (eklentinin kabuğu
 * okuma hatasını zaten `undefined` döndürerek yutar).
 */
async function sinirliOku(
  yollar: readonly string[],
  okunacak: readonly boolean[],
  kabuk: BelgeKabugu,
  eşzamanlılık: number,
): Promise<({ belge: BelgeYuzu; bayt: number } | undefined)[]> {
  const sonuçlar: ({ belge: BelgeYuzu; bayt: number } | undefined)[] = new Array(yollar.length).fill(undefined);
  let sıradaki = 0;
  let düştü = false;
  const işçi = async (): Promise<void> => {
    while (!düştü && sıradaki < yollar.length) {
      const i = sıradaki++;
      if (!okunacak[i]) continue;
      try { sonuçlar[i] = await kabuk.oku(yollar[i]!); }
      catch (hata) { düştü = true; throw hata; }
    }
  };
  const sınır = Math.max(1, Math.min(Math.floor(eşzamanlılık), yollar.length));
  await Promise.all(Array.from({ length: sınır }, işçi));
  return sonuçlar;
}

/** Bir turda hangi dosyanın hangi kaynaktan geldiğinin sayımı — nöbetin ölçüsü. */
export interface BelgeSayacı {
  /** Editörde açık ve kaydedilmemiş değişiklik taşıdığı için bellekten alınan,
   *  dolayısıyla okunmayan dosya sayısı (BKM-DNT-A18). */
  açıktan: number;
  /** Diskten ham okunan dosya sayısı. */
  diskten: number;
  /** Okunamadığı ya da dili `sarmal` olmadığı için turun dışında kalan dosya sayısı. */
  atlanan: number;
}

/**
 * Turun belgelerini toplar. Hiçbir dosya AÇILMAZ: kaydedilmemiş değişiklik
 * taşıyan açık belge bellekten alınır, öteki her dosya diskten okunur. Bu karar
 * (BKM-DNT-A18) burada, editör kabuğu olmadan sınanan saf gövdede verilir:
 * kaydedilmemiş değişiklik taşımayan açık belgenin gerçeği disktir, çünkü editör
 * dışından yapılan bir yazımı model henüz okumamış olabilir ve bellekteki metin
 * o anda eskidir. Okunamayan dosya sessizce atlanır ve turu düşürmez, çünkü
 * silinmiş ya da erişilemeyen tek bir dosya yüzünden bütün panelin boşalması
 * ölçülen kusurdan daha ağır bir davranıştır. Kaydedilmemiş değişiklik taşımayan
 * açık belge diskten okunamazsa bellekteki metne düşülür; dosyanın elde kalan
 * tek gerçeği odur ve eski davranış o hâlde de belgeyi turda tutuyordu.
 *
 * `okunanBayt` turun diskten okuduğu HAM bayt toplamıdır (PRF-KP-A01 üçüncü
 * kararı): boyut sınırı konmaz, fakat toplam merceğe düşer ki anormal büyüme
 * görünür olsun. Sayı kabuğun ham tamponundan, çözmeden önce gelir; çözülmüş
 * metnin uzunluğu bunun yerini tutmaz, çünkü bayt sırası imi çözümde soyulur
 * ve geçersiz bir bayt üç baytlık yer tutucuya dönüşür. Açık belge
 * okunmadığından sayıma girmez.
 *
 * ⏱️ PNL-A14: disk okumaları sırayla değil, en çok `eşzamanlılık` okuma aynı
 * anda bekleyecek biçimde birlikte yürür; çıktı (harita sırası, sayaçlar ve
 * bayt toplamı) sıralı okumanınkiyle birebir aynıdır.
 */
export async function turBelgeleriniTopla(
  yollar: readonly string[],
  kabuk: BelgeKabugu,
  eşzamanlılık: number = TUR_OKUMA_ESZAMANLILIGI,
): Promise<{ belgeler: Map<string, BelgeYuzu>; sayaç: BelgeSayacı; okunanBayt: number; dilDışı: string[] }> {
  const belgeler = new Map<string, BelgeYuzu>();
  const sayaç: BelgeSayacı = { açıktan: 0, diskten: 0, atlanan: 0 };
  let okunanBayt = 0;
  // PRF-TA-A02 denetimi: dili elle değiştirilmiş açık belge OKUNABİLİR bir dosyadır,
  // yalnız kullanıcı onu bilinçle başka dile almıştır. Sayaçta `atlanan` içinde
  // kalır (kanal özdeşliği: açıktan + diskten + atlanan = taranan), fakat yolu
  // ayrıca döner ki tur görüntüsü onu okunamayanla karıştırmasın.
  const dilDışı: string[] = [];
  // ⏱️ PNL-A14 · ÖNCE KARAR, SONRA OKUMA, EN SON SIRALI TOPLAMA. Açık belge
  // kararı (dil dışı · kaydedilmemiş değişiklik · diskten okunacak) her yol için
  // önce verilir; okunacak yollar sınırlı eşzamanlılıkla birlikte okunur
  // (`sinirliOku`); sonuçlar en sonda YOL SIRASIYLA toplanır. Haritanın ekleme
  // sırası, sayaçlar ve okunan bayt toplamı bu yüzden sıralı okumanınkiyle
  // birebir aynıdır: okumaların hangi sırayla BİTTİĞİ çıktıya sızamaz.
  const açıklar = yollar.map((yol) => kabuk.açıkBelge(yol));
  const kararlar = yollar.map((yol, i): "oku" | "dilDışı" | "bellek" => {
    if (!açıklar[i]) return "oku";
    // Açık belgenin dili elle değiştirilmişse dosya turun dışındadır; bu,
    // eski `openTextDocument` yolundaki `languageId !== "sarmal"` süzgecinin ikizidir.
    if (kabuk.dilKimliği(yol) !== "sarmal") return "dilDışı";
    // 🩹 BKM-DNT-A18: kaydedilmemiş değişiklik yoksa gerçek disktir ve okunur.
    return kabuk.kaydedilmemisMi(yol) ? "bellek" : "oku";
  });
  const okunanlar = await sinirliOku(yollar, kararlar.map((k) => k === "oku"), kabuk, eşzamanlılık);
  for (let i = 0; i < yollar.length; i++) {
    const yol = yollar[i]!;
    const açık = açıklar[i];
    if (kararlar[i] === "dilDışı") { sayaç.atlanan += 1; dilDışı.push(yol); continue; }
    if (kararlar[i] === "bellek") {
      belgeler.set(yol, açık!);
      sayaç.açıktan += 1;
      continue;
    }
    const okunan = okunanlar[i];
    if (okunan === undefined) {
      if (açık) { belgeler.set(yol, açık); sayaç.açıktan += 1; continue; }   // diski okunamayan açık belge turda kalır
      sayaç.atlanan += 1;
      continue;
    }
    belgeler.set(yol, okunan.belge);
    sayaç.diskten += 1;
    okunanBayt += okunan.bayt;
  }
  return { belgeler, sayaç, okunanBayt, dilDışı };
}

/**
 * Turun program haritasını kurar — kabuk değil, saf modül (PRF-KP-A02).
 *
 * Belge iki kaynaktan gelir ve ikisinin ayrıştırma yolu farklıdır. Turun
 * belgesi açık belgenin KENDİSİ ise paylaşılan sürüm anahtarlı önbellekten
 * okunur (`programAl` · onbellek.ts), çünkü editör süsleri aynı belgeyi zaten
 * ayrıştırmıştır ve ikinci bir ayrıştırma boşuna maliyettir. Disk kaydı ise
 * doğrudan ayrıştırılır ve önbelleğe ASLA yazılmaz: önbellek belge SÜRÜMÜNE
 * anahtarlıdır, diskten okunan kaydın sürümü yoktur ve sürümsüz bir kayıt bir
 * kez yazıldığında dosya diskte değişse bile sonsuza dek taze sayılırdı. Söz
 * dizimi kırık belge haritaya girmez; onun hatasını tek dosya yolu yakalar ve
 * çapraz denetim ağacına girmesi gerekmez.
 *
 * 🩹 BKM-DNT-A18: önbelleğin ölçütü "yol açık belge haritasında mı" değil,
 * "turun belgesi açık belgenin kendisi mi" sorusudur. Kaydedilmemiş değişiklik
 * taşımayan açık belge artık diskten okunur; harita yalnız yola baksaydı o
 * dosyanın ağacı yine modeldeki ESKİ metinden gelir ve panel, belge diskten
 * okunduğu hâlde eski Adım sayısını gösterirdi.
 *
 * Önbellek çağrısı dışarıdan verilir ki bu işlev editör kabuğu olmadan nöbete
 * bağlansın; `denetleHepsi` gerçek `programAl` işlevini geçirir. Açık belge
 * haritasının değer tipi serbesttir, çünkü işlev o değeri yalnız `programAl`
 * işlevine taşır ve kendisi belgeden hiçbir şey okumaz.
 */
export function turProgramlariniKur<A>(
  belgeler: ReadonlyMap<string, BelgeYuzu>,
  açıkBelgeler: ReadonlyMap<string, A>,
  programAl: (açık: A) => Program | undefined,
): Map<string, Program> {
  const programlar = new Map<string, Program>();
  for (const [fsPath, belge] of belgeler) {
    const açık = açıkBelgeler.get(fsPath);
    let program: Program | undefined;
    if (açık !== undefined && (açık as unknown) === belge) program = programAl(açık);
    else {
      try { program = ayristir(belirtecle(belge.getText())); }
      catch { program = undefined; }
    }
    if (program) programlar.set(fsPath, program);
  }
  return programlar;
}

/**
 * ⏱️ PNL-A14 · tek-dosya tanısının yeniden kullanacağı ağaç; `undefined` ise
 * çağıran metni kendisi ayrıştırır.
 *
 *   ÖLÇÜLEN KUSUR (2026-10-27): tur her dosyayı program haritası için bir kez
 *   ayrıştırıyor, ardından tek-dosya tanısı (`tanilaCekirdek`) AYNI metni ikinci
 *   kez belirteçleyip ayrıştırıyordu. Turun ağacı artık tanıya verilir.
 *
 *   İki koşul eşitliği korur. Birincisi ZAMANDIR: ağaç tanıya mevsim çevriminden
 *   ÖNCE verilmelidir, çünkü `mevsimNormalize` Faz düğümlerine sanal `çağır`
 *   kenarları ekleyerek ağacı yerinde değiştirir ve eski yolun taze ayrıştırması
 *   o kenarları hiç görmezdi; bu koşul çağıranın sırasıdır (eklenti.ts). İkincisi
 *   KAYNAKTIR ve burada verilir: turun belgesi açık belgenin KENDİSİ ise ağaç
 *   paylaşılan önbellekten gelmiştir (`turProgramlariniKur`); o ağaç önceki
 *   turların mevsim çevrimini taşıyabilir ve taze ayrıştırmanın ikizi değildir,
 *   bu yüzden yeniden kullanılmaz. Kaydedilmemiş değişiklik taşıyan açık belge
 *   bir turda en çok birkaç tanedir; bedeli ihmal edilebilir.
 *
 *   Söz dizimi kırık belgenin ağacı haritada yoktur; çağıran metni ayrıştırır ve
 *   söz dizimi tanısını eskisi gibi üretir.
 */
export function taniAgaci<A>(
  fsPath: string,
  belge: BelgeYuzu,
  açıkBelgeler: ReadonlyMap<string, A>,
  programlar: ReadonlyMap<string, Program>,
): Program | undefined {
  const açık = açıkBelgeler.get(fsPath);
  if (açık !== undefined && (açık as unknown) === belge) return undefined;
  return programlar.get(fsPath);
}

/**
 * Turun erişim sınırı (PRF-KP-A05). Tur diski kendisi okuduğu için okuduğu
 * evrenin sınırı bir güvenlik sorusudur; bu süzgeç kabuğa ulaşan yol listesini
 * iki koşulla keser ve geçenleri OLDUĞU GİBİ döndürür, çünkü dönen yol açık
 * belge haritasının anahtarıdır ve yeniden yazılmış bir yol o haritada bulunmaz.
 *
 * Birinci koşul kök sınırıdır: yol, çalışma alanı köklerinden birinin
 * kapsamında olmalıdır (`kapsamIcinde` · yolharitasi-cekirdek.ts, kapsama
 * ilişkisinin tek evi). Karşılaştırma önce üst dizin parçalarını çözer; aksi
 * hâlde `<kök>/../disari.sar` biçimindeki bir yol kökün önekini taşıdığı için
 * kapsam içinde sayılırdı ve sınır bir dize karşılaştırmasından ibaret kalırdı.
 *
 * İkinci koşul dışlama evrenidir: kök-göreli yolun dizin parçaları gizli ya da
 * dışlanan bir ad taşıyorsa dosya okunmaz (`sarKapsamDisi` · izleyici-cekirdek.ts,
 * tarama globuyla aynı listeden türer). Ölçüm kök-göreli yapılır, çünkü mutlak
 * yolda çalışma alanının kendi üst dizinleri elenmeye katılır ve `.claude/worktrees`
 * altındaki bir depo bütünüyle kapsam dışı sayılırdı (Sol RED-2 dersi).
 *
 * İki koşul AYNI köke göre ölçülür ve bütün kökler gezilir: yol, köklerden
 * herhangi birine göre hem kapsam içindeyse hem de o köke göreli hâliyle dışlama
 * süzgecinden geçiyorsa geçer. Yalnız ilk kapsayan kök seçilseydi iç içe köklerde
 * `/ws/dist/depo/plan/a.sar` yolu `/ws` köküne göre `dist/` altında sayılıp
 * düşerdi, oysa `/ws/dist/depo` köküne göre meşrudur (denetçi bulgusu, PRF-KP-A05).
 *
 * Bu süzgeç okuma evrenini genişletmez ya da daraltmaz: dosya araması zaten
 * köklerin içinde ve aynı globla koşar. Süzgeç yalnız sınırı kilitler ki arama
 * evreni bir gün değişse bile kabuğun `oku` üyesine kök dışı yol ulaşmasın.
 */
export function erisimSiniri(yollar: readonly string[], kökler: readonly string[]): string[] {
  const düzle = (y: string): string => posix.normalize(y.replace(/\\/g, "/")).replace(/\/+$/, "");
  const düzKökler = kökler.map(düzle);
  const geçenler: string[] = [];
  for (const yol of yollar) {
    const düz = düzle(yol);
    const geçer = düzKökler.some((kök) =>
      kapsamIcinde(düz, kök) && !sarKapsamDisi(düz.slice(kök.length + 1)));
    if (geçer) geçenler.push(yol);
  }
  return geçenler;
}

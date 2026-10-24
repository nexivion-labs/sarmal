// ═══════════════════════════════════════════════════════════════════════════
// yonerge-ikizi.ts — 👯 Yönerge İkizi Nöbeti (KYN-MTR-A02 · YUZ-1.2)
//
//   NEDEN VAR. Çalışma alanının kökünde yürütücü yönergesi iki ayrı dosya adıyla
//   yaşar: `CLAUDE.md` ile `AGENTS.md`. İki dosya bugün bayt bayt aynıdır, fakat
//   bu aynılığı koruyan hiçbir mekanizma yoktur. Biri değişip öteki olduğu gibi
//   kalırsa tek bir yönerge ikiye bölünür; o andan sonra iki ayrı yürütücü iki
//   ayrı kurala uyar ve hangi metnin bağlayıcı olduğu okunamaz hâle gelir. Nöbet
//   bu ayrışmayı doğduğu anda görünür kılmak için vardır.
//
//   SINIR — NÖBET SESSİZCE KOPYALAMAZ. Motor iki dosyadan hangisinin doğru
//   olduğunu bilemez, çünkü doğruluk ölçütü metnin kendisinde değil onu yazan
//   insanın niyetindedir. Bu yüzden nöbet yalnız ayrışmayı bildirir, ayrışan
//   satırları adres vererek gösterir ve düzeltmeyi insana bırakır. Otomatik
//   eşitleme bilinçli olarak kapsam dışıdır: yanlış yöne kopyalayan bir motor,
//   ayrışmayı çözmek yerine yanlış metni kalıcılaştırır.
//
//   İKİ KATMAN AYRIK (iskeletçi ve denetçi deseni izlenir):
//     ikizAyrismasi(küme, içerikler)  → saf; diske dokunmaz, dolayısıyla test edilir
//     ikizleriOku(kök, küme)          → etkili; diski okuyup içerikleri toplar
//     ikizleriOkuSahnelenmis(kök, küme) → etkili; deponun index yüzünü okur
//     yonergeIkiziDenetle(kök, küme, kip) → ikisini birleştiren kapı yüzü
//
//   İKİ KİP, İKİ AYRI SORU — BİRİ ÖTEKİNİN YERİNE GEÇMEZ (denetçi bulgusu · KYN-MTR-A02).
//   Nöbet doğduğunda yalnız çalışma ağacını okuyordu ve bu, kapının en kritik anında
//   kör kalmasına yol açıyordu. Bağımsız denetçi kusuru varsayımla değil gerçek bir
//   işlemeyle gösterdi: iki ikize aynı satır eklenir, fakat yalnız biri sahnelenir —
//   `git add -f` her dosya için ayrı gerektiğinden bu kolayca olur. Kanca çalışma
//   ağacını okuduğu için iki dosyayı ÖZDEŞ görür, işleme geçer ve depoya ayrışmış
//   bir ikiz girer. Daha kötüsü, çalışma ağacı özdeş kaldığı sürece nöbet bir daha
//   hiç uyanmaz; ayrışma tarihe girer ve sessizce yaşar.
//     • sahnelenmiş kip (`git show :DOSYA`) şunu sorar: BU İŞLEME depoya ayrışmış bir
//       ikiz yazacak mı? Kanca yalnız bu soruyu sormalıdır, çünkü kancanın koruduğu
//       şey deponun tarihidir, geliştiricinin yarım kalmış çalışma ağacı değildir.
//     • çalışma ağacı kipi şunu sorar: ŞU AN elimdeki iki dosya ayrışmış mı? Canlı
//       sınama ve CLI bu soruyu sorar, çünkü henüz sahnelenmemiş bir ayrışmayı da
//       yazarına anında göstermek gerekir; kancayı beklemek geç kalmaktır.
//   İki soru da meşrudur ve ikisi de gereklidir: yalnız sahnelenmiş kip ölçülseydi
//   sahnelenmemiş ayrışma sessiz kalırdı, yalnız çalışma ağacı ölçülseydi yukarıdaki
//   tuzak açık kalırdı. Tanı metni hangi yüzün ölçüldüğünü açıkça söyler, çünkü
//   sahnelenmiş yüzde ayrışan bir satır `diff` ile bakan kullanıcıya görünmez.
//
//   NEDEN AYRI MODÜL, NEDEN `denetci.ts` İÇİNDE DEĞİL. Denetçi bir VARLIK ağacını
//   denetler; `_Sarmal` ya da `_KapaliUrun` kökünden aşağı yürür ve bulgularını o
//   varlığın karnesine yazar. Yönerge ikizleri ise iki varlığın da ÜSTÜNDE, çalışma
//   alanının kökünde yaşar. Bu nöbet denetçinin içine konulsaydı kök bulgusu tek bir
//   varlığın sonucu gibi raporlanır ve STR-3 varlık ayrılığı bulanırdı; aynı bulgu
//   iki varlık için de üretilseydi bu kez tek olgu iki kez sayılırdı. Nöbetin kendi
//   modülünde ve kendi kapı yüzünde yaşaması, kapsamının çalışma alanı kökü olduğunu
//   yapısal olarak beyan eder.
//
//   ⚠️ KURULUM TUZAĞI — YÜRÜTÜCÜ YÖNERGESİ VE `.sar` KAYNAĞI KÜRESEL YOK SAYMA
//   KURALINDADIR. Kullanıcının `~/.gitignore_global` dosyası `CLAUDE.md` ve
//   `AGENTS.md` adlarını yok saydığı için bu iki dosya depoya ancak
//   `git add -f CLAUDE.md AGENTS.md` ile eklenir. Sıradan `git add` sessizce
//   hiçbir şey yapmaz ve dosya izlenmeden kalır. Tuzağın eski hâli şuydu: nöbet
//   çalışır, diskteki dosyaları okur ve yeşil verir; oysa depoda o dosyanın eski
//   sürümü ya da hiçbir sürümü durur. Sahnelenmiş kip bu deliği kapatır, çünkü
//   depoya hiç girmemiş bir ikiz index yüzünde YOKTUR ve nöbet onu
//   `ikiz-eksik-dosya` hatasıyla bildirir. Yine de yeni bir yürütücü adı ikiz
//   listesine eklenirken zorlama adımı unutulmamalıdır; nöbet artık unutmayı
//   yakalar, fakat yakalamak ile baştan doğru yapmak aynı şey değildir.
//
//   TUZAĞIN ÜÇÜNCÜ VE EN AĞIR DESENİ `*.sar` (2026-09-05 ölçümü · BKM-DNT-A15).
//   Aynı küresel dosya `*.sar` desenini de yok saymaktadır ve bu, iki yürütücü
//   yönergesinden çok daha geniş bir yarayı açar: o makinede doğan bir projenin
//   BÜTÜN hafızası depoya hiç girmez. Ölçüm kuramsal değildir. Nexivion'un üç
//   deposu tuzağı kendi `.gitignore` dosyalarındaki `!*.sar` istisnasıyla aşmakta
//   ve dört yüz on dokuz kaynak dosyasını izlemektedir; istisnası olmayan bir
//   müşteri deposunda ise on yedi kaynak dosyasının SIFIRI izleniyordu ve ürünü
//   ilk kez kullanan dış ajan bunu "proje hafızası tek diskte kalıyor" diye
//   bildirmiştir. Bu yüzden desen listesi ile istisna ölçümü artık bu modülde
//   yaşar (`KURESEL_YOK_SAYMA_DESENLERI` · `yokSaymaIstisnasiEksikleri`) ve tek
//   kaynaktır: doğuş paketi doğan köke yazacağı istisnayı buradan alır, kök
//   kapısı ise aynı listeyi ölçüp eksik istisnayı adresiyle bildirir. İki yerde
//   iki liste tutulsaydı biri bayatlar ve hangisinin bağlayıcı olduğu okunamazdı.
//
//   KARIŞTIRILMAMASI GEREKEN İKİNCİ `AGENTS.md`. Motorun `doğuş` komutu, YENİ
//   DOĞAN bir projenin köküne ayrı bir `AGENTS.md` yazar ve onun içeriği dil
//   bağlamı üreticisinden gelir. O dosya bu çalışma alanının kökündeki yönerge
//   değildir ve bu nöbetin kapsamına girmez; nöbet yalnız kendi çalışma alanı
//   kökünde, ikiz listesinde adı geçen dosyalara bakar.
// ═══════════════════════════════════════════════════════════════════════════

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import type { Tani } from "./tani.ts";
import { ikizTanisi } from "./tani-metinleri.ts";   // kullanıcıya söylenen her cümle tek katalogda yaşar (CDL-A02); üretici yalnız olguyu verir

/**
 * Bir ikiz kümesi, aynı metni taşımak zorunda olan dosyaların birlikte anıldığı
 * kayıttır. Kümenin `gerekce` alanı, bu dosyaların NEDEN aynı kalması gerektiğini
 * söyler; gerekçe kayda girmezse altı ay sonra okuyan kişi kuralı kaldırıp
 * kaldıramayacağını bilemez.
 */
export interface IkizKumesi {
  /** Kümenin insan tarafından okunan adı (tanı metninde geçer). */
  ad: string;
  /** Çalışma alanı köküne göreli dosya yolları (POSIX). En az iki dosya beklenir. */
  dosyalar: readonly string[];
  /** Kümenin var oluş gerekçesi — hükmün nedeni kayıtta yaşar. */
  gerekce: string;
}

/**
 * İKİZ LİSTESİ — TEK KAYNAK. Nöbetin baktığı bütün dosyalar yalnız buradadır;
 * ne kanca betiği ne de sınama dosyası ikinci bir liste tutar. Üçüncü bir yürütücü
 * adı doğduğunda (örneğin başka bir aracın kök yönergesi) yapılacak iş, aşağıdaki
 * `dosyalar` dizisine tek bir dize eklemekten ibarettir; kod, kanca ve sınama
 * değişmeden yeni dosyayı kapsar.
 *
 * Yeni dosya eklendiğinde tek bir dış adım gerekir: dosya küresel yok sayma
 * kuralına takılıyorsa `git add -f <dosya>` ile depoya zorla eklenmelidir.
 */
export const YONERGE_IKIZLERI: readonly IkizKumesi[] = [
  {
    ad: "yürütücü yönergesi",
    dosyalar: ["CLAUDE.md", "AGENTS.md"],
    gerekce:
      "Aynı yönerge metni iki yürütücü adıyla okunur; metinler ayrışırsa iki ajan " +
      "iki ayrı kurala uyar ve hangi metnin bağlayıcı olduğu belirsizleşir (YUZ-1.2).",
  },
];

// ── KÜRESEL YOK SAYMA TUZAĞININ ÖLÇÜMÜ (BKM-DNT-A15) ────────────────────────

/**
 * KÜRESEL YOK SAYMA DESENLERİ — TEK KAYNAK. Kullanıcı düzeyindeki yok sayma
 * kuralının bu ürünün kaynaklarını vurabilecek desenleri burada, tek listede
 * yaşar. Liste iki tüketiciye hizmet eder ve ikisi de kendi kopyasını tutmaz:
 * doğuş paketi doğan köke yazacağı istisna satırlarını buradan üretir, kök
 * kapısı ise var olan yok sayma dosyasında eksik istisnayı buradan ölçer.
 *
 * Sıra anlamlıdır ve korunur: en geniş desen (`*.sar`) başta durur, çünkü eksik
 * istisna raporu okunurken en ağır kaybın ilk satırda görünmesi gerekir.
 */
export const KURESEL_YOK_SAYMA_DESENLERI: readonly string[] = ["*.sar", "CLAUDE.md", "AGENTS.md"];

/** Desenlerin `.gitignore` istisna satırı hâli: `*.sar` → `!*.sar`. */
export function yokSaymaIstisnaSatirlari(
  desenler: readonly string[] = KURESEL_YOK_SAYMA_DESENLERI,
): string[] {
  return desenler.map((d) => `!${d}`);
}

/**
 * Bir yok sayma dosyasının metninde EKSİK olan istisna satırlarını döndürür (SAF).
 *
 * Karşılaştırma satır bazlıdır ve yorum satırları elenir, çünkü `# !*.sar` yazan
 * bir yorum istisnayı KURMAZ; yalnız anar. Baştaki ve sondaki boşluk kırpılır,
 * çünkü git de kırpar ve nöbetin gerçeği git'in gördüğü gerçektir. Dosya hiç
 * yoksa (`undefined`) bütün istisnalar eksiktir: yok sayma dosyası olmayan bir
 * kökte küresel kural tek başına hüküm sürer.
 */
export function yokSaymaIstisnasiEksikleri(
  icerik: string | undefined,
  desenler: readonly string[] = KURESEL_YOK_SAYMA_DESENLERI,
): string[] {
  const gerekli = yokSaymaIstisnaSatirlari(desenler);
  if (icerik === undefined) return gerekli;
  const satirlar = new Set(
    icerik.split("\n").map((s) => s.trim()).filter((s) => s.length > 0 && !s.startsWith("#")),
  );
  return gerekli.filter((g) => !satirlar.has(g));
}

/**
 * MOTORUN İZ KLASÖRÜ (HST-MTR-A14). Motor koşu artıklarını kökün `.sarmal/`
 * klasörüne yazar: döngünün kendi izi ham istemi ve ham yanıtı kısaltmadan
 * taşır, yürütücü izi dış bir yürütücünün temaslarını, kontrol noktası ise
 * koşunun ara hâlini. Hiçbiri kaynak değildir ve ilki gizli olabilecek bir metin
 * taşıdığı için depoya girmemelidir. Satırın başında eğik çizgi yoktur, çünkü
 * motor izi kendisine verilen dizine yazar ve çalışma alanında bu dizin çatı da
 * olabilir ilk proje de; satır klasörü her derinlikte kapsar. Klasörün adı beş
 * yazıcıda ayrı ayrı yazılıdır ve `dogus.test.ts` nöbetleri bunlardan yalnız
 * ikisini gerçek yollarından koşturup doğan kökün git durumunda ölçer: yürütücü
 * izini yazan `kopru/iz.ts` ile döngü izinin yolunu `--iz` bayrağında kuran
 * `sarmal.ts`. Makro döngünün izi (`makro-dongu.ts`), kontrol noktası
 * (`dongu.ts`) ve lig kaydı (`kopru/lig.ts`) nöbetin dışındadır; bu üçünden
 * birinin klasörü değişirse bu satır onu sessizce kapsamaz olur.
 */
export const IZ_KLASORU_SATIRI = ".sarmal/";

/**
 * Var olan bir yok sayma dosyasında iz klasörü satırı EKSİK mi (SAF)? Dosya
 * klasör hakkında bir karar zaten taşıyorsa satır eksik sayılmaz. `.sarmal`,
 * `/.sarmal/` ya da `.sarmal/**` gibi eşdeğer bir yazım klasörü zaten yok sayar
 * ve ikinci bir satır gereksizdir. Klasörü ya da içinden bir yolu geri alan bir
 * olumsuzlama (`!.sarmal/`) ise kullanıcının izleme kararıdır; git'te son
 * eşleşen desen kazandığı için sona eklenecek bir satır o kararı sessizce geri
 * çevirirdi. Yorum satırı karar kurmaz, çünkü `#` ile başlayan bir satır bu
 * biçimlerin hiçbirine uymaz; yalnız bir alt klasörü yok saymak da
 * (`.sarmal/trace/`) klasörün tamamını kapsamaz. Dosya hiç yoksa satır eksiktir.
 * Doğuş paketi var olan bir dosyayı genişletirken, kök kapısı ise eski bir kökü
 * ölçerken bu ölçümü kullanır (HST-MTR-A16); iki tüketici tek ölçümden okur.
 */
export function izKlasoruSatiriEksigi(icerik: string | undefined): string[] {
  if (icerik === undefined) return [IZ_KLASORU_SATIRI];
  const klasor = IZ_KLASORU_SATIRI.slice(0, -1);
  const kararVar = icerik.split("\n").some((ham) => {
    const satir = ham.trim();
    const olumsuz = satir.startsWith("!");
    const yol = (olumsuz ? satir.slice(1) : satir).replace(/^\//u, "").replace(/^\*\*\//u, "");
    if (olumsuz) return yol === klasor || yol.startsWith(`${klasor}/`);
    return yol.replace(/\/(\*\*?)?$/u, "") === klasor;
  });
  return kararVar ? [] : [IZ_KLASORU_SATIRI];
}

/**
 * Kökün yok sayma dosyasını okuyup eksik istisnaları raporlar (etkili katman).
 * Rapor tek satırdır ve ölçtüğü dosyayı adıyla söyler; eksik varsa onarımın
 * ne olduğunu da yazar, çünkü bu kusurun onarımı üç satır eklemekten ibarettir
 * ve kullanıcıyı belgeye göndermek gereksiz bir turdur.
 */
export function yokSaymaRaporu(kok: string, desenler: readonly string[] = KURESEL_YOK_SAYMA_DESENLERI): string {
  const yol = join(kok, ".gitignore");
  const icerik = existsSync(yol) ? readFileSync(yol, "utf8") : undefined;
  const eksikler = yokSaymaIstisnasiEksikleri(icerik, desenler);
  const nerede = icerik === undefined ? ".gitignore dosyası yok" : ".gitignore eksik";
  const istisna = eksikler.length === 0
    ? [`🛡️✅ küresel yok sayma istisnası: tam — .gitignore ${yokSaymaIstisnaSatirlari(desenler).join(" · ")} satırlarını taşıyor`]
    : [
      `🛡️⛔ küresel yok sayma istisnası: ${eksikler.length} eksik — ${nerede} (${kok})`,
      `   → şu satırları ${kok}/.gitignore dosyasının sonuna ekle: ${eksikler.join(" · ")}`,
      "   → ölçmek için: git check-ignore -v <dosya> — hangi kuralın yok saydığını söyler",
    ];
  return [...istisna, ...izKlasoruBulgusu(kok, icerik, nerede)].join("\n");
}

/**
 * İZ KLASÖRÜ BULGUSU (HST-MTR-A16). Doğuş şablonu `.sarmal/` satırını HST-MTR-A14
 * ile kazandı; o düzeltmeden önce doğmuş bir kökün dosyası bu satırı taşımaz ve
 * motorun ham istem taşıyan izi git durumunda izlenmeyen dosya olarak görünür.
 * Kapı bunu adlı bir bulguyla bildirir ve onarımı söyler. Dosyaya kendisi yazmaz,
 * çünkü yok sayma dosyası kullanıcınındır ve satırı ekleme kararı ona aittir.
 * Satırı taşıyan ya da klasörü bilinçle olumsuzlayan bir kök hiçbir satır almaz;
 * bu yüzden onarılmış bir kökün raporu öncekiyle bayt bayt aynı kalır.
 */
function izKlasoruBulgusu(kok: string, icerik: string | undefined, nerede: string): string[] {
  const eksik = izKlasoruSatiriEksigi(icerik);
  if (eksik.length === 0) return [];
  return [
    `🛡️⛔ motorun iz klasörü yok sayılmıyor [iz-klasoru-eksik] — ${nerede} (${kok})`,
    `   → şu satırı ${kok}/.gitignore dosyasının sonuna ekle: ${eksik.join(" · ")} — motorun koşu izi ham istem taşır ve satır yoksa toplu bir ekleme onu depoya sokar`,
    `   → ölçmek için: git status --short ${IZ_KLASORU_SATIRI} — satır eklendikten sonra hiçbir dosya göstermemeli`,
  ];
}

/**
 * Nöbetin ölçtüğü YÜZ. Kip yalnız içeriğin nereden okunduğunu değil, tanının
 * hangi soruya cevap verdiğini de belirler; bu yüzden bağlama yazılır ve
 * kullanıcıya söylenen cümlede geçer.
 *
 *   "çalışma-ağacı" — diskteki dosyalar. CLI ve canlı sınama bu kipi kullanır.
 *   "sahnelenmiş"   — deponun index yüzü (`git show :DOSYA`). Kanca bu kipi kullanır.
 */
export type IkizKipi = "çalışma-ağacı" | "sahnelenmiş";

/** Nöbetin okuduğu tek dosyanın anlık görüntüsü. İçerik yoksa dosya o yüzde yoktur. */
export interface IkizIcerik {
  /** Çalışma alanı köküne göreli yol. */
  yol: string;
  /** Dosyanın ham içeriği; `undefined` ise dosya ölçülen yüzde bulunamamıştır. */
  icerik?: string;
}

/** Tanı seli üretmemek için tek küme başına raporlanan en çok ayrışan satır sayısı. */
export const AYRISMA_GOSTERIM_SINIRI = 12;

/** Tanı metninde satır içeriği bu uzunluğu aşarsa kısaltılır; adres yine tamdır. */
const SATIR_KIRPMA = 100;

function kirp(metin: string): string {
  if (metin.length <= SATIR_KIRPMA) return metin;
  return metin.slice(0, SATIR_KIRPMA) + "…";
}

/**
 * Ayrışan satırın bir yüzünü tanı bağlamına çevirir. Yokluk ile boşluk ayrı
 * bayraklarla taşınır, çünkü ikisini de kullanıcıya anlatan CÜMLE katalogda
 * yaşar ve üretici cümle kurmaz; üretici yalnız olguyu bildirir.
 */
function satirBaglami(onek: string, satir: string | undefined): Record<string, string | boolean> {
  return {
    [`${onek}Yok`]: satir === undefined,
    [`${onek}Boş`]: satir === "",
    [`${onek}Metin`]: satir === undefined ? "" : kirp(satir),
  };
}

/**
 * Bir ikiz kümesinde ayrışan satırların adreslerini ve iki yüzünü döndürür.
 * Karşılaştırma bayt düzeyindedir ve hiçbir normalleştirme yapılmaz: satır sonu
 * biçimi, sondaki boşluk ve dosya sonundaki satır atlaması da metnin parçasıdır,
 * çünkü ikizlik iddiası "aynı anlama gelir" değil "aynı dosyadır" iddiasıdır.
 */
export interface SatirFarki {
  /** Bir tabanlı satır numarası. */
  satir: number;
  /** Çıpa dosyadaki satır; dosya o satırdan önce bittiyse `undefined`. */
  cipa?: string;
  /** Karşılaştırılan dosyadaki satır; dosya o satırdan önce bittiyse `undefined`. */
  karsi?: string;
}

/**
 * İki metnin ayrışan satırlarını sırayla döndürür (saf yardımcı). Satır eşlemesi
 * konum tabanlıdır; bilinçli olarak bir en-uzun-ortak-altdizi araması yapılmaz,
 * çünkü nöbetin işi farkı onarmak değil ilk ayrışmayı adresiyle göstermektir ve
 * konum tabanlı eşleme bu iş için hem yeterli hem de öngörülebilirdir.
 */
export function satirFarklari(cipaMetin: string, karsiMetin: string): SatirFarki[] {
  const a = cipaMetin.split("\n");
  const b = karsiMetin.split("\n");
  const farklar: SatirFarki[] = [];
  const uzunluk = Math.max(a.length, b.length);
  for (let i = 0; i < uzunluk; i++) {
    if (a[i] !== b[i]) farklar.push({ satir: i + 1, cipa: a[i], karsi: b[i] });
  }
  return farklar;
}

/**
 * Kümenin SAF nöbeti: verilen içeriklerden tanı listesi üretir, diske dokunmaz.
 *
 * Karşılaştırma çıpası kümenin İLK dosyasıdır. Çıpa "doğru olan" anlamına GELMEZ;
 * yalnız farkın iki yüzünü hizalayabilmek için seçilmiş sabit bir referanstır ve
 * tanı metni bunu açıkça söyler, çünkü okuyucunun çıpayı otorite sanması bu
 * Adımın sınırının ihlali olurdu.
 */
export function ikizAyrismasi(
  kume: IkizKumesi,
  icerikler: readonly IkizIcerik[],
  kip: IkizKipi = "çalışma-ağacı",
): Tani[] {
  const tanilar: Tani[] = [];
  // Kip her tanı bağlamına aynı bayrakla iner; cümlenin hangi yüzü anlattığını
  // katalog karara bağlar, üretici yalnız olguyu bildirir (CDL-A02).
  const sahne = kip === "sahnelenmiş";

  if (kume.dosyalar.length < 2) {
    tanilar.push(ikizTanisi("ikiz-tekil", "uyarı", { kümeAdı: kume.ad, sahne }, { satir: 1, sutun: 1 }));
    return tanilar;
  }

  const harita = new Map(icerikler.map((i) => [i.yol, i.icerik]));

  const eksikler = kume.dosyalar.filter((y) => harita.get(y) === undefined);
  if (eksikler.length > 0) {
    for (const yol of eksikler) {
      tanilar.push(ikizTanisi("ikiz-eksik-dosya", "hata", { kümeAdı: kume.ad, yol, sahne }, { satir: 1, sutun: 1 }));
    }
    // Eksik dosya varken satır karşılaştırması yapılmaz: olmayan metnin satırı olmaz.
    return tanilar;
  }

  const cipaYol = kume.dosyalar[0]!;
  const cipaMetin = harita.get(cipaYol)!;

  for (const karsiYol of kume.dosyalar.slice(1)) {
    const karsiMetin = harita.get(karsiYol)!;
    if (karsiMetin === cipaMetin) continue;

    const farklar = satirFarklari(cipaMetin, karsiMetin);
    const gosterilen = farklar.slice(0, AYRISMA_GOSTERIM_SINIRI);
    for (const f of gosterilen) {
      tanilar.push(ikizTanisi(
        "ikiz-ayrışması",
        "hata",
        {
          çıpaYol: cipaYol,
          karşıYol: karsiYol,
          satırNo: f.satir,
          gerekçe: kume.gerekce,
          sahne,
          ...satirBaglami("çıpa", f.cipa),
          ...satirBaglami("karşı", f.karsi),
        },
        { satir: f.satir, sutun: 1 },
      ));
    }
    if (farklar.length > gosterilen.length) {
      tanilar.push({
        ...ikizTanisi(
          "ikiz-ayrışması",
          "hata",
          { çıpaYol: cipaYol, karşıYol: karsiYol, özet: true, sahne, toplam: farklar.length, gösterilen: gosterilen.length },
          { satir: gosterilen[gosterilen.length - 1]?.satir ?? 1, sutun: 1 },
        ),
        ozetlenen: farklar.length - gosterilen.length,
      });
    }
  }

  return tanilar;
}

/** Kümenin dosyalarını kökten okur (etkili katman). Okunamayan dosya `icerik: undefined` döner. */
export function ikizleriOku(kok: string, kume: IkizKumesi): IkizIcerik[] {
  return kume.dosyalar.map((yol) => {
    const tam = join(kok, yol);
    if (!existsSync(tam)) return { yol };
    try {
      return { yol, icerik: readFileSync(tam, "utf8") };
    } catch {
      return { yol };
    }
  });
}

/**
 * Kümenin dosyalarını deponun SAHNELENMİŞ yüzünden okur (etkili katman).
 *
 * NEDEN `git show :DOSYA`. İşleme nesnesi çalışma ağacından değil index'ten kurulur;
 * `git show :<yol>` tam olarak o index girdisinin blob içeriğini basar. Dolayısıyla
 * bu okuma "işleme şu anda yapılsaydı depoya ne yazılırdı?" sorusunun birebir
 * cevabıdır ve kancanın sorması gereken soru budur.
 *
 * YOL BİÇİMİ. `:./<yol>` biçimi kasıtlıdır: çıplak `:<yol>` deponun tepesine göreli
 * çözülür, `:./<yol>` ise çalışılan dizine göreli çözülür. Nöbetin yolları çalışma
 * alanı KÖKÜNE görelidir; `git -C <kök>` ile birlikte nokta biçimi kullanıldığında
 * çalışma alanı kökü deponun tepesi olmasa bile adres doğru yere düşer.
 *
 * OKUNAMAYAN DOSYA SESSİZCE YEŞİL VERMEZ. Komut hata verirse (dosya index'te hiç
 * yoksa, yani depoya hiç eklenmemişse ya da bu dizin bir depo değilse) içerik
 * `undefined` döner ve saf katman bunu `ikiz-eksik-dosya` hatasına çevirir. Bu
 * davranış kurulum tuzağının tam karşılığıdır: diskte duran fakat küresel yok sayma
 * kuralı yüzünden depoya hiç girmemiş bir ikiz, sahnelenmiş yüzde YOKTUR ve nöbet
 * artık bunu görür.
 */
export function ikizleriOkuSahnelenmis(kok: string, kume: IkizKumesi): IkizIcerik[] {
  return kume.dosyalar.map((yol) => {
    try {
      const icerik = execFileSync("git", ["-C", kok, "show", `:./${yol}`], {
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
        stdio: ["ignore", "pipe", "ignore"],
      });
      return { yol, icerik };
    } catch {
      return { yol };
    }
  });
}

/**
 * Çalışma alanı kökündeki bütün ikiz kümelerini denetler ve tanıları döndürür.
 * Boş liste, ölçülen YÜZDE bütün ikizlerin özdeş olduğu anlamına gelir.
 *
 * `kip` argümanı hangi yüzün ölçüleceğini seçer ve varsayılanı çalışma ağacıdır,
 * çünkü kipsiz çağıran (CLI, canlı sınama) insanın elindeki dosyaları sorar. Kanca
 * kipi açıkça "sahnelenmiş" verir; ikisi ayrı sorulardır ve biri ötekinin yerine
 * geçmez (dosya başlığındaki İKİ KİP bölümü).
 */
export function yonergeIkiziDenetle(
  kok: string,
  kumeler: readonly IkizKumesi[] = YONERGE_IKIZLERI,
  kip: IkizKipi = "çalışma-ağacı",
): Tani[] {
  const oku = kip === "sahnelenmiş" ? ikizleriOkuSahnelenmis : ikizleriOku;
  const tanilar: Tani[] = [];
  for (const kume of kumeler) tanilar.push(...ikizAyrismasi(kume, oku(kok, kume), kip));
  return tanilar;
}

/** Kipin insan yüzü — rapor başlığında hangi yüzün ölçüldüğü yazılı durur. */
const KIP_ADI: Readonly<Record<IkizKipi, string>> = {
  "çalışma-ağacı": "çalışma ağacı yüzü",
  "sahnelenmiş": "sahnelenmiş yüz",
};

/**
 * Kapı çıktısının insan yüzü: tanılar tek bir metne dizilir. Yeşil satır hangi
 * kümelerin gerçekten ölçüldüğünü adlarıyla söyler; `kumeler` argümanı bilinçli
 * olarak açıktır, çünkü rapor kendi ölçmediği bir listeyi anmamalıdır.
 *
 * Başlık ayrıca ölçülen YÜZÜ söyler. Bu ek bilgi süs değildir: sahnelenmiş yüzde
 * ayrışma bildiren bir raporu okuyup diskteki iki dosyayı karşılaştıran kullanıcı
 * hiçbir fark göremez ve raporu yanlış sanır. Yüz adı yazılı olduğunda hangi
 * karşılaştırmayı yapması gerektiğini de bilir.
 */
export function ikizRaporu(
  tanilar: readonly Tani[],
  kumeler: readonly IkizKumesi[] = YONERGE_IKIZLERI,
  kip: IkizKipi = "çalışma-ağacı",
): string {
  if (tanilar.length === 0) {
    const adlar = kumeler.map((k) => k.dosyalar.join(" ≡ ")).join(" · ");
    return `👯✅ yönerge ikizi: ayrışma yok — ${KIP_ADI[kip]} (${adlar})`;
  }
  const satirlar = tanilar.map((t) => {
    const simge = t.duzey === "hata" ? "⛔" : t.duzey === "uyarı" ? "⚠️" : "ℹ️";
    return t.oneri ? `${simge} ${t.mesaj}\n   → ${t.oneri}` : `${simge} ${t.mesaj}`;
  });
  return [`👯⛔ yönerge ikizi: ${tanilar.length} bulgu — ${KIP_ADI[kip]} ölçüldü`, ...satirlar].join("\n");
}

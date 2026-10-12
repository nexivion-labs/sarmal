// ═══════════════════════════════════════════════════════════════════════════
// kanon-tutarlilik.ts — göç belge turu A03 kapanışı resmi kanon türevini üret
//
// Kaynak yalnız yasa/kanon sekizlisi, canlı tanı sicili ve canlı sınıflamadır.
// geneldurum/ okunmaz. Çıktı bir kanon değildir; kaynak mühürlü ölçüm yüzüdür.
// ═══════════════════════════════════════════════════════════════════════════

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { ayristir } from "./ayristirici.ts";
import { belirtecle } from "./belirtec.ts";
import { siniflamaOrtuMerge, siniflamaOrtuYukle, siniflamaYukle, type Siniflama } from "./siniflama.ts";
import {
  EMEKLI_TANI_HALEFI,
  EMEKLI_TANI_KODLARI,
  EMEKLILIK_BORCU_TANI_KODLARI,
  ONCEKI_TANI_KODLARI,
  YENI_TANI_KANONU,
  YENI_TANI_KODLARI,
  type YeniTaniKaydi,
} from "./tani-sicili.ts";
import type { Deger, Dugum } from "./sozdizim.ts";

// ── Kanon sayımının tek kaydı (HST-MTR-A02) ─────────────────────────────────
//
// Kanonun dosya, Karar ve Kural sayısı bilinçle dondurulmuştur ve bu bir insan
// kapısıdır: kanon sessizce büyümez, sessizce de küçülmez. Sayı yalnız aşağıdaki
// KANON_SAYIMI kaydında yaşar. Ölçüm üreticileri (bu dosyadaki kanon tutarlılık
// yüzü ile belge-yuzleri.ts içindeki kalıcı belge yüzleri) kanonu diskten sayar ve
// kayıttan ayrışmayı hata fırlatmadan bulgu olarak bildirir; kanonu kayda karşı
// ölçen nöbet tektir ve çekirdek süitindedir (sinama/kanon-tutarlilik.test.ts,
// "kanon sayımı nöbeti"). Kanona madde eklendiğinde sayı nöbetlerinden yalnız o
// kırmızıya döner ve aşağıdaki artırma adımını adıyla söyler.
//
// Değer elle yazılmış bir dondurma olmak zorundadır, çünkü nöbetin görevi kanonun
// sayısı meşru biçimde değiştiğinde bunu bilinçli bir insan onayına bağlamaktır;
// sayı canlı ölçümün kendisinden türetilseydi nöbet hiçbir zaman tetiklenemez ve
// kapı işlevini yitirirdi. Sayı eskiden motorda, üreticide ve dört ayrı nöbette
// elle yazılıydı; bir keresinde nöbet yüz on üçe taşınırken tablo satırı yüz on
// ikide unutulmuş ve tip denetimi bu sapmayı "113 ile 112'nin kesişimi yok"
// hatasıyla yakalamıştı. Dağınıklığın bedeli 2026-09-10 tarihinde ölçülmüştür: bir
// madde eklemek yedi ile dokuz nöbeti birden kırmızıya çeviriyor ve türetilmiş
// yüzlerin yeniden üretimini kilitliyordu (HTR-KANON-SAYISI-BUYUMEYI-KILITLIYOR).
//
// Geçmiş (kanon meşru biçimde büyüdükçe):
//   2026-08-30: Founder dört ortak çalışma kuralını hükme bağladı ve kanon meşru
//   biçimde büyüdü. ORK-9 (Blok Teslim Halkası) bir Karar olarak doğdu ve Karar
//   sayısı otuz yediden otuz sekize çıktı; DIL-1.6 (Plan Kademelerinin Adı),
//   MIM-3.3 (Blok Durum Kaydı), ORK-3.5 (Blok Sırası) ile YUZ-3.5 (Durum Yüzeyi)
//   Kural olarak doğdu ve kural sayısı yüz on dörtten yüz on sekize çıktı.
//   2026-09-11 (KPS-MHR-A01 · Founder hükmü): MIM-3.4 (Dosya Mühürleri) Kural
//   olarak doğdu ve kural sayısı yüz yirmi ikiden yüz yirmi üçe, kanon yüz
//   altmıştan yüz altmış bire çıktı; Karar sayısı değişmedi.
//   2026-09-19 (KPS-CEL-A01 · birinci ayrışma · Founder hükmü 2026-09-09):
//   MIM-3.5 anadizin ile plan ayrılığı maddesi doğdu ve Kural kümesi yüz yirmi
//   üçten yüz yirmi dörde, kanon yüz altmış birden yüz altmış ikiye çıktı.
//   2026-10-10 (HST-MTR-A02): sayı motordaki, üreticideki ve sınamalardaki
//   dağınık dondurmalardan bu tek kayda taşındı; değer değişmedi.

/** Kanonun dondurulmuş sayımı: `yasa/kanon/` altındaki bölüm dosyası, Karar ve Kural sayısı. */
export interface KanonSayimi {
  readonly dosya: number;
  readonly karar: number;
  readonly kural: number;
}

/** Diskten ölçülen sayım; `tekil`, yinelenmeyen madde kodlarının sayısıdır. */
export interface OlculenKanonSayimi extends KanonSayimi {
  readonly tekil: number;
}

/** TEK KAYIT. Kanon meşru biçimde büyüdüğünde ya da küçüldüğünde yalnız burası değişir. */
export const KANON_SAYIMI: KanonSayimi = { dosya: 8, karar: 38, kural: 124 };

/** Kaydın depo köküne göre yeri; bulgu ve belge metinleri bu adresi verir. */
export const KANON_SAYIMI_KAYDI = "urun/cekirdek/src/kanon-tutarlilik.ts";

/** Madde sayısı ayrıca dondurulmaz; Karar ile Kuralın toplamıdır. */
export const kanonMaddeSayisi = (sayim: KanonSayimi): number => sayim.karar + sayim.kural;

/** Sayı ayrıştığında atılacak bilinçli adımın adı ve tarifi. */
export const KANON_ARTIRMA_ADIMI =
  `${KANON_SAYIMI_KAYDI} dosyasındaki KANON_SAYIMI kaydını ölçülen sayıya bilinçle çek ve `
  + "geçmiş satırına tarihi, Adım kodunu ve doğan ya da kalkan maddeyi yaz; aynı adımda kanon "
  + "mühürlerini (urun/cekirdek/sinama/kanon-tutarlilik.test.ts içindeki KANON_SHA ile "
  + "is/nitelik/goc/turetilmis_yuz_nobetleri.sar nöbet kaydı) tazele ve türetilmiş yüzleri "
  + "resmî üreticileriyle yeniden üret";

const sayimMetni = (s: KanonSayimi): string =>
  `${s.dosya} dosyada ${kanonMaddeSayisi(s)} madde (${s.karar} Karar ve ${s.kural} Kural)`;

/**
 * Ölçülen kanonu kayıtla karşılaştırır. Eşitse `undefined` döner; ayrışmışsa
 * insanın okuyacağı bir bulgu döndürür ve bulgu artırma adımını adıyla söyler.
 * Yinelenen madde kodu sayıdan ayrı bir kusurdur ve ayrıca bildirilir.
 */
export function kanonSayimiBulgusu(olculen: OlculenKanonSayimi, kayit: KanonSayimi = KANON_SAYIMI): string | undefined {
  const bulgular: string[] = [];
  if (olculen.dosya !== kayit.dosya || olculen.karar !== kayit.karar || olculen.kural !== kayit.kural) {
    bulgular.push(
      `Kanon sayımı kayıttan ayrıştı: yasa/kanon ${sayimMetni(olculen)} taşıyor, kanon sayımı kaydı ise ${sayimMetni(kayit)} diyor. `
      + `Kanon sessizce büyümez ve sessizce küçülmez; artırma adımı: ${KANON_ARTIRMA_ADIMI}.`,
    );
  }
  const madde = kanonMaddeSayisi(olculen);
  if (olculen.tekil !== madde) {
    bulgular.push(`Kanonda yinelenen madde kodu var: ${madde} maddenin yalnız ${olculen.tekil} tanesinin kodu tekildir; yinelenen kod düzeltilmeden sayım kaydı değiştirilmez.`);
  }
  return bulgular.length > 0 ? bulgular.join(" ") : undefined;
}

// ── Tanı kümesi sayımının tek kaydı (HST-MTR-A12) ───────────────────────────
//
// Tanı sicilinin kümeleri de kanon gibi bilinçle dondurulmuştur ve bu da bir insan
// kapısıdır: sicil sessizce büyümez, sessizce de küçülmez. Kümelerin sayısı yalnız
// aşağıdaki TANI_KUMESI_SAYIMI kaydında yaşar. Ölçüm üreticileri (bu dosyadaki kanon
// tutarlılık yüzü ile belge-yuzleri.ts içindeki kalıcı belge yüzleri) kümeleri canlı
// sicilden sayar ve kayıttan ayrışmayı hata fırlatmadan, ayrışan kümeyi adıyla
// söyleyen bir bulgu olarak bildirir. Sicili kayda karşı ölçen nöbet tektir ve
// çekirdek süitindedir (sinama/kanon-tutarlilik.test.ts, "tanı kümesi sayım nöbeti").
// Sicile bir tanı eklendiğinde sayı nöbetlerinden yalnız o kırmızıya döner ve
// aşağıdaki artırma adımını adıyla söyler.
//
// Sayılar eskiden bu üreticide hata fırlatan bir koşulda, belge yüzü üreticisinde
// ikinci bir koşulda ve iki paketin sınamalarında elle yazılıydı. Sicile tek bir
// tanı eklemek üreticiyi "değişmezler uyuşmuyor" iletisiyle durduruyor, hangi
// değişmezin tutmadığını söylemiyor ve aynı üreticiyi kullanan fikstürleri de aynı
// hatayla düşürüyordu (ölçüm 2026-10-10).
//
// Geçmiş (sicil meşru biçimde değiştikçe; dağılım hata/uyarı/bilgi sırasıyladır):
//   2026-08-24: durum-boyutu tanısı Founder hükmüyle emekliye ayrıldı; önceki sabit
//   küme yüz ikiden yüz bire indi, emekli küme on dörtten on beşe çıktı, emeklilik
//   borcu otuz dokuzdan otuz sekize indi. Sabit karakter sınırı yeni kanonda norm değildir.
//   2026-08-27 (Founder ölçümü): ORK-8 mevsim ritüelinin ilk motor karşılığı
//   `mevsim-vadesi-geçti` bilgi düzeyinde doğdu.
//   2026-08-28 (Founder hükmü): MIM-1.7 AltKatman tekilliği `altkatman-tekilliği-ihlali`
//   terfi turundan gelmeden, doğrudan hata düzeyinde doğdu ve kırk yedinci hata oldu.
//   2026-09-10 (KPS-MVS-A01 ikinci teslim): ORK-8 mühür dürüstlüğü bekçisi
//   `mevsim-mührü-çelişkili` bilgi düzeyinde doğdu ve yeni küme yetmiş dörtten yetmiş
//   beşe çıktı.
//   2026-09-11 (KPS-MHR-A01 · Founder hükmü): MIM-3.4 dosya mühürlerinin üç tanısı doğdu;
//   `geçersiz-dosya-adı` uyarıda, iki gözlem bilgide durur ve dağılım 47/17/14 oldu.
//   2026-09-19 (KPS-FAZ-A02 · Founder hükmü): MIM-1.2 projesiz Faz gözlemi
//   `projesiz-faz` bilgi düzeyinde doğdu; yeni küme yetmiş sekizden yetmiş dokuza
//   çıktı ve dağılım 47/17/15 oldu.
//   2026-09-19 (KPS-CEL-A01 · Founder hükmü 2026-09-09): MIM-3.2 Kitaplık kademesini
//   zorunlu kıldı ve `kitaplıksız-kök` uyarısı doğdu; yeni küme yetmiş dokuzdan seksene
//   çıktı ve dağılım 47/18/15 oldu.
//   2026-09-29 (KPS-SIR-A01 · Founder hükmü): Faz sırası ile Blok yapısının altı tanısı
//   doğdu (MIM-1.2 `ters-faz-bağımlılığı` hatası, üç uyarı ve iki yapı gözlemi) ve
//   `seçilemez-adım-yürütümü` bilgiden uyarıya geçti; yeni küme seksenden seksen altıya
//   çıktı ve dağılım 48/22/16 oldu. `planlanmamış` kaçışı kapandığı için
//   `planlanmamış-gövde` emeklilik borcundan uygulanmış emekliye geçti (önceki sabit
//   küme 101→100, emekli 15→16, emeklilik borcu 38→37).
//   2026-09-29 (KPS-SIR-A03 · Founder hükmü): Faz dosyası düzeninin dört gözlemi bilgi
//   düzeyinde doğdu; yeni küme seksen altıdan doksana çıktı ve dağılım 48/22/20 oldu.
//   2026-09-29 (KPS-SIR-A02): `girinti-yapı-uyumsuz` gözlemi DIL-2.2 zorlama satırına
//   bilgi düzeyinde ilan edildi; yeni küme doksandan doksan bire çıktı ve dağılım
//   48/22/21 oldu.
//   2026-10-02 (BKM-OLG-A11): MIM-1.4 kaçış sınırı `yersiz-teknoloji-kaçışı` uyarısıyla
//   doğdu; kanon metni Founder onayı beklediği için kimlik önceki sabit kümeye girdi ve
//   bu küme yüzden yüz bire çıktı. Yeni kümenin dağılımı değişmedi.
//   2026-10-10 (HST-MTR-A12): sayılar dağınık dondurmalardan bu tek kayda taşındı;
//   değerler değişmedi. Canlı sicilin büyüklüğü (iki yüz bir) ayrıca dondurulmaz, üç
//   canlı kümenin toplamıdır. Aynı gün belge yüzü üreticisinin yönlendirme dağılımını
//   ikinci kez donduran koşulu da kaldırıldı ve artırma adımı insanın izleyeceği bütün
//   basamaklarıyla yazıldı.
//   2026-10-10 (RFM-MOTOR-A02 · Founder onayı): DIL-1.8 düğüm kodu standardının iki tanısı,
//   `ilansız-önek` ile `kod-biçimi-uyumsuz`, kanonun yazdığı uyarı düzeyinde doğdu; yeni küme
//   doksan birden doksan üçe çıktı ve dağılım 48/24/21 oldu. Öteki kümeler değişmedi.

/** Tanı kümelerinin dondurulmuş sayımı. Yeni kümenin büyüklüğü üç düzeyin toplamıdır. */
export interface TaniKumesiSayimi {
  /** Yeni kanon kümesinin, tanıların bugün üretildiği düzeye göre dağılımı. */
  readonly yeni: { readonly hata: number; readonly uyari: number; readonly bilgi: number };
  /** Yeni kümeden önce yazılmış ve canlı sicilde korunan sabit küme. */
  readonly onceki: number;
  /** Sınıflamanın `zorunluKenarlar` verisinden türeyen ve sabit kümelerde olmayan canlı kimlikler. */
  readonly siniflamaTurevli: number;
  /** Emekli kararı uygulanmış ve canlı sicilden çıkmış küme. */
  readonly emekli: number;
  /** Emekli kararı bulunduğu hâlde canlı sicilde yaşamayı sürdüren uyumluluk borcu. */
  readonly emeklilikBorcu: number;
}

/** Canlı sicilden ölçülen sayım ile küme değişmezlerini bozan kimlikler; değişmez listeleri boş olmalıdır. */
export interface OlculenTaniKumesi extends TaniKumesiSayimi {
  /** Canlı sicilin büyüklüğü; kümeler ayrık ve tekilse üç canlı kümenin toplamına eşittir. */
  readonly canli: number;
  /** Canlı sicilde yeniden görünen uygulanmış emekli kimlikler. */
  readonly emekliCanli: readonly string[];
  /** Canlı sicilde bulunmayan emeklilik borcu kimlikleri. */
  readonly borcCanliDegil: readonly string[];
  /** Halefi kırık emekli kimlikler, `eski → halef` biçiminde. */
  readonly kirikHalef: readonly string[];
  /** YUZ-3.3 maddesinin `tanı-yüzeyi-karışması` kaydının yeni kümede kaç kez geçtiği; tam bir olmalıdır. */
  readonly yuz33: number;
}

/** TEK KAYIT. Sicil meşru biçimde büyüdüğünde, küçüldüğünde ya da bir tanının düzeyi değiştiğinde yalnız burası değişir. */
export const TANI_KUMESI_SAYIMI: TaniKumesiSayimi = {
  yeni: { hata: 48, uyari: 24, bilgi: 21 },
  onceki: 101,
  siniflamaTurevli: 9,
  emekli: 16,
  emeklilikBorcu: 37,
};

/** Yeni kümenin büyüklüğü ayrıca dondurulmaz; üç düzeyin toplamıdır. */
export const yeniKumeSayisi = (s: TaniKumesiSayimi): number => s.yeni.hata + s.yeni.uyari + s.yeni.bilgi;

/** Canlı sicilin büyüklüğü ayrıca dondurulmaz; önceki, yeni ve sınıflamadan türeyen kümelerin toplamıdır. */
export const canliSicilSayisi = (s: TaniKumesiSayimi): number => s.onceki + yeniKumeSayisi(s) + s.siniflamaTurevli;

/** Yönlendirme matrisi kaydının depo köküne göre yeri; belge yüzleri yüzey sayılarını bu kayıttan okur. */
export const TANI_YONLENDIRME_MATRISI_KAYDI = "is/nitelik/goc/tani_yuzeyi_yonlendirme_matrisi.sar";

/**
 * Sicil kayıttan ayrıştığında atılacak bilinçli adımın tarifi. Basamaklar insanın izleyeceği
 * sırayla ve eksiksiz sayılır; kırmızı fikstür (sinama/kanon-tutarlilik.test.ts) sicile tanı
 * eklenmiş bir kopyada bu basamakları izler ve iki üreticinin bulgusuz geçtiğini ölçer. Son
 * cümle, doğan tanının sayıdan bağımsız tutarlılık nöbetlerini adlandırır.
 */
export const TANI_KUMESI_ARTIRMA_ADIMI =
  `(1) ${KANON_SAYIMI_KAYDI} dosyasındaki TANI_KUMESI_SAYIMI kaydını ölçülen sayıya bilinçle çek ve geçmiş `
  + "satırına tarihi, Adım kodunu ve doğan, emekliye ayrılan ya da düzeyi değişen tanıyı yaz; "
  + "(2) doğan tanının Türkçe ve İngilizce metnini urun/cekirdek/src/tani-metinleri.ts kataloglarına ekle (Türkçe "
  + "öneri, `Örnek:` sözcüğünden sonra ters tırnak içinde yapıştırılabilir bir iskelet taşır) ve emekliye ayrılan "
  + "tanının metnini kataloglardan çıkar; "
  + `(3) ${TANI_YONLENDIRME_MATRISI_KAYDI} kaydının çizelgesini, düzyazısını ve Çıkarım düğümünü canlı ölçüme göre tazele; `
  + "(4) is/nitelik/goc/turetilmis_yuz_nobetleri.sar nöbet kaydında urun/cekirdek/src/tani-sicili.ts mührünü ve "
  + `${TANI_YONLENDIRME_MATRISI_KAYDI} mührünü tazele; `
  + "(5) türetilmiş yüzleri `kanon-tutarlilik-uret` ve `belge-yuzleri-uret` komutlarıyla yeniden üret. "
  + "Doğan bir tanı bu sayı ve kayıt basamaklarından ayrı olarak tutarlılık nöbetlerini de bekler: üreticisi onu "
  + "kapı kapsamında ilan edilmiş bir modülde gerçekten basmalı, kanon maddesinin Zorlama satırı onu adıyla anmalı "
  + "(kanon değişikliği insan onayı ister), bilgi düzeyindeyse terfi kararı ya da gözlem sınıflaması yazılmalı ve "
  + "tanı fikstürle kanıtlanmalıdır";

/** Kümelerin bulguda geçen adı ve sayı metni; ayrışma iki sayımın bu metinleri farklıysa vardır. */
const TANI_KUMELERI: ReadonlyArray<{ readonly ad: string; readonly metin: (s: TaniKumesiSayimi) => string }> = [
  { ad: "yeni küme", metin: (s) => `${yeniKumeSayisi(s)} kimlik (${s.yeni.hata} hata, ${s.yeni.uyari} uyarı ve ${s.yeni.bilgi} bilgi)` },
  { ad: "önceki sabit küme", metin: (s) => `${s.onceki} kimlik` },
  { ad: "sınıflamadan türeyen küme", metin: (s) => `${s.siniflamaTurevli} kimlik` },
  { ad: "uygulanmış emekli küme", metin: (s) => `${s.emekli} kimlik` },
  { ad: "emeklilik borcu", metin: (s) => `${s.emeklilikBorcu} kimlik` },
];

const kodListesi = (kodlar: readonly string[]): string => kodlar.map((kod) => `\`${kod}\``).join(", ");

/**
 * Ölçülen tanı kümelerini kayıtla ve küme değişmezleriyle karşılaştırır. Her şey
 * tutuyorsa `undefined` döner; tutmayan her ölçü insanın okuyacağı bir cümleyle,
 * adıyla bildirilir ve sayı ayrışması artırma adımını söyler.
 */
export function taniKumesiSayimiBulgusu(olculen: OlculenTaniKumesi, kayit: TaniKumesiSayimi = TANI_KUMESI_SAYIMI): string | undefined {
  const bulgular: string[] = [];
  const ayrisan = TANI_KUMELERI.filter((kume) => kume.metin(olculen) !== kume.metin(kayit));
  if (ayrisan.length > 0) {
    bulgular.push(
      `Tanı kümesi sayımı kayıttan ayrıştı: ${ayrisan.map((kume) => `${kume.ad} ${kume.metin(olculen)} taşıyor, kayıt ise ${kume.metin(kayit)} diyor`).join("; ")}. `
      + `Tanı sicili sessizce büyümez ve sessizce küçülmez; artırma adımı: ${TANI_KUMESI_ARTIRMA_ADIMI}.`,
    );
  }
  const toplam = canliSicilSayisi(olculen);
  if (olculen.canli !== toplam) {
    bulgular.push(`Tanı kümeleri ayrık değil: canlı sicil ${olculen.canli} kimlik taşıyor, üç canlı kümenin toplamı ise ${toplam}; bir kimlik iki kümede birden duruyor ya da bir kümede yineleniyor.`);
  }
  if (olculen.emekliCanli.length > 0) {
    bulgular.push(`Uygulanmış emekli kimlik canlı sicilde duruyor: ${kodListesi(olculen.emekliCanli)}; emekliye ayrılan kimlik canlı sicile geri dönmez.`);
  }
  if (olculen.borcCanliDegil.length > 0) {
    bulgular.push(`Emeklilik borcundaki kimlik canlı sicilde bulunmuyor: ${kodListesi(olculen.borcCanliDegil)}; borcu kapanan kimlik uygulanmış emekli kümesine taşınır.`);
  }
  if (olculen.kirikHalef.length > 0) {
    bulgular.push(`Emekli kimliğin halefi kırık: ${kodListesi(olculen.kirikHalef)}; eski kimlik emekli kümesinde, halefi canlı sicilde durmalıdır.`);
  }
  if (olculen.yuz33 !== 1) {
    bulgular.push(`YUZ-3.3 maddesinin \`tanı-yüzeyi-karışması\` kaydı yeni kümede ${olculen.yuz33} kez geçiyor; tam bir kez geçmelidir.`);
  }
  return bulgular.length > 0 ? bulgular.join(" ") : undefined;
}

/** Tanı kümelerini canlı sicilden ölçer; sınıflama, sicilin veri güdümlü kimliklerini verir. */
export function taniKumesiniOlc(snf: Pick<Siniflama, "zorunluKenarlar">): {
  sayim: OlculenTaniKumesi;
  dinamik: readonly string[];
  canli: ReadonlySet<string>;
} {
  const sabit = new Set([...ONCEKI_TANI_KODLARI, ...YENI_TANI_KODLARI]);
  const dinamik = dinamikTaniKodlari(snf, sabit);
  const canli = new Set([...sabit, ...dinamik]);
  const duzeyde = (duzey: YeniTaniKaydi["kademe"]): number => YENI_TANI_KANONU.filter((t) => t.kademe === duzey).length;
  const sayim: OlculenTaniKumesi = {
    yeni: { hata: duzeyde("hata"), uyari: duzeyde("uyarı"), bilgi: duzeyde("bilgi") },
    onceki: ONCEKI_TANI_KODLARI.length,
    siniflamaTurevli: dinamik.length,
    emekli: EMEKLI_TANI_KODLARI.length,
    emeklilikBorcu: EMEKLILIK_BORCU_TANI_KODLARI.length,
    canli: canli.size,
    emekliCanli: EMEKLI_TANI_KODLARI.filter((kod) => canli.has(kod)),
    borcCanliDegil: EMEKLILIK_BORCU_TANI_KODLARI.filter((kod) => !canli.has(kod)),
    kirikHalef: [...EMEKLI_TANI_HALEFI]
      .filter(([eski, halef]) => !EMEKLI_TANI_KODLARI.includes(eski) || !canli.has(halef))
      .map(([eski, halef]) => `${eski} → ${halef}`),
    yuz33: YENI_TANI_KANONU.filter((t) => t.madde === "YUZ-3.3" && t.kod === "tanı-yüzeyi-karışması").length,
  };
  return { sayim, dinamik, canli };
}

/**
 * Bir taşıyıcı alanın belge bloğundaki karşılığıyla eşitlik ölçümü (HST-MTR-A01).
 *
 * Kanon dosyalarının başlığı, Karar düğümündeki `karar` ve `gerekçe` alanlarının
 * belge bloğundaki Hüküm ile Gerekçe metninin makine-okur taşıyıcısı olduğunu ilan
 * eder; her maddenin `ne` alanı da belge başlığını taşır. Dört parça denetimi yalnız
 * bölüm başlıklarının varlığına baktığı için taşıyıcıdan sessizce düşen bir cümle
 * kapıdan geçebiliyordu (HTR-TASIYICI-MUTABAKAT-KORLUGU). Ölçüm eşitliğe bakar:
 * boşluk ve satır kırılımı fark sayılmaz, harf, noktalama ve sözcük farkı sayılır.
 */
export interface TasiyiciOlcumu {
  /** Düğümdeki makine-okur alan. */
  readonly alan: "ne" | "karar" | "gerekçe";
  /** Belge bloğunda aynı metni taşıyan bölüm. */
  readonly bolum: "Başlık" | "Hüküm" | "Gerekçe";
  readonly esit: boolean;
  /** Boşluğu daraltılmış taşıyıcı metnin karakter sayısı. */
  readonly tasiyiciUzunluk: number;
  /** Boşluğu daraltılmış belge metninin karakter sayısı. */
  readonly belgeUzunluk: number;
  /** Boşluğu daraltılmış iki metnin ilk ayrıştığı karakter sırası; metinler eşitse -1. */
  readonly ilkFark: number;
}

export interface KanonMaddesiOlcumu {
  readonly dosya: string;
  readonly kod: string;
  readonly rol: "Karar" | "Kural";
  readonly ornek: string;
  readonly tanilar: readonly string[];
  readonly dayanaklar: readonly string[];
  readonly dortParcaTam: boolean;
  readonly tasiyicilar: readonly TasiyiciOlcumu[];
}

export interface KanonTutarlilikSonucu {
  readonly degisti: boolean;
  readonly dosya: string;
  readonly madde: number;
  readonly yeni: number;
  readonly onceki: number;
  readonly emekli: number;
  readonly emeklilikBorcu: number;
  /** Taşıyıcısı belge metninden ayrışan maddelerin kodları (HST-MTR-A01). */
  readonly tasiyiciAyrisan: readonly string[];
  /** Ölçülen kanon sayım kaydından ayrışmışsa bulgu; eşitse yok (HST-MTR-A02). */
  readonly kanonSayimiBulgusu: string | undefined;
  /** Tanı kümeleri sayım kaydından ya da küme değişmezlerinden ayrışmışsa bulgu; tutuyorsa yok (HST-MTR-A12). */
  readonly taniKumesiBulgusu: string | undefined;
}

const sha256 = (metin: string): string => createHash("sha256").update(metin).digest("hex");
const hucre = (metin: string): string => metin.replace(/\r?\n/g, " ").replace(/\|/g, "\\|").trim();

function degerKodlari(deger: Deger | undefined): string[] {
  if (!deger) return [];
  if (deger.tur === "liste") return (deger.ogeler ?? []).flatMap(degerKodlari);
  return deger.metin ? [deger.metin] : [];
}

function alanKodlari(dugum: Dugum, ad: string): string[] {
  const alan = [...dugum.parametreler, ...dugum.ozellikler].find((p) => p.ad === ad);
  return degerKodlari(alan?.deger);
}

function dugumleriGez(dugumler: readonly Dugum[], ziyaret: (dugum: Dugum) => void): void {
  for (const dugum of dugumler) {
    ziyaret(dugum);
    dugumleriGez(dugum.cocuklar, ziyaret);
  }
}

function ornekBolumu(belge: string): string {
  return belge.match(/\*\*Örnek:\*\*\s*([\s\S]*?)(?=\n\*\*Zorlama:\*\*)/)?.[1]?.trim() ?? "—";
}

const BELGE_BOLUMLERI = ["Hüküm", "Gerekçe", "Örnek", "Zorlama"] as const;

/** Belge bloğundaki bir bölümün metni: bölüm başlığından bir sonraki bölüm başlığına kadar. */
function belgeBolumu(belge: string, ad: "Hüküm" | "Gerekçe"): string {
  const satirlar = belge.split("\n");
  const bas = satirlar.findIndex((s) => s.startsWith(`**${ad}:**`));
  if (bas < 0) return "";
  const son = satirlar.findIndex((s, i) => i > bas && BELGE_BOLUMLERI.some((b) => s.startsWith(`**${b}:**`)));
  return satirlar.slice(bas, son < 0 ? undefined : son).join("\n").slice(`**${ad}:**`.length).trim();
}

/** Belge bloğunun `### ` ile başlayan madde başlığı. */
function belgeBasligi(belge: string): string {
  return belge.split("\n").find((s) => s.startsWith("### "))?.slice(4).trim() ?? "";
}

const bosluguDaralt = (metin: string): string => metin.replace(/\s+/g, " ").trim();

function tasiyiciOlc(alan: TasiyiciOlcumu["alan"], bolum: TasiyiciOlcumu["bolum"], tasiyici: string, belge: string): TasiyiciOlcumu {
  const t = bosluguDaralt(tasiyici);
  const b = bosluguDaralt(belge);
  let ilkFark = -1;
  if (t !== b) {
    ilkFark = 0;
    while (ilkFark < t.length && ilkFark < b.length && t[ilkFark] === b[ilkFark]) ilkFark++;
  }
  return { alan, bolum, esit: t === b, tasiyiciUzunluk: t.length, belgeUzunluk: b.length, ilkFark };
}

/** Bir maddenin bütün taşıyıcılarını ölçer: her maddede `ne` ↔ başlık, Kararda ek olarak `karar` ↔ Hüküm ve `gerekçe` ↔ Gerekçe. */
function tasiyicilariOlc(dugum: Dugum, rol: KanonMaddesiOlcumu["rol"], belge: string): TasiyiciOlcumu[] {
  const metin = (ad: string): string => alanKodlari(dugum, ad)[0] ?? "";
  const olcumler = [tasiyiciOlc("ne", "Başlık", metin("ne"), belgeBasligi(belge))];
  if (rol === "Karar") {
    olcumler.push(tasiyiciOlc("karar", "Hüküm", metin("karar"), belgeBolumu(belge, "Hüküm")));
    olcumler.push(tasiyiciOlc("gerekçe", "Gerekçe", metin("gerekçe"), belgeBolumu(belge, "Gerekçe")));
  }
  return olcumler;
}

export function kanonMaddeleriniOlc(kokYolu: string): {
  maddeler: readonly KanonMaddesiOlcumu[];
  muhurler: readonly string[];
  demet: string;
  sayim: OlculenKanonSayimi;
} {
  const kok = resolve(kokYolu);
  const dizin = join(kok, "yasa", "kanon");
  const dosyalar = readdirSync(dizin).filter((ad) => ad.endsWith(".sar")).sort();
  const maddeler: KanonMaddesiOlcumu[] = [];
  const muhurler: string[] = [];
  for (const dosya of dosyalar) {
    const kaynak = readFileSync(join(dizin, dosya), "utf8");
    muhurler.push(`${dosya}:${sha256(kaynak)}`);
    const program = ayristir(belirtecle(kaynak));
    dugumleriGez(program.bildirimler, (dugum) => {
      const rol = dugum.tur === "kuralTanım" ? "Kural" : dugum.tur === "widget" && dugum.ad === "Karar" ? "Karar" : undefined;
      if (!rol) return;
      const kod = alanKodlari(dugum, "kod")[0];
      if (!kod) throw new Error(`${dosya}:${dugum.satir} maddesinde kod yok.`);
      const belge = dugum.belge ?? "";
      maddeler.push({
        dosya,
        kod,
        rol,
        ornek: ornekBolumu(belge),
        tanilar: alanKodlari(dugum, "tanı"),
        dayanaklar: alanKodlari(dugum, "dayanak").filter((deger) => deger !== "aksiyom"),
        dortParcaTam: ["Hüküm", "Gerekçe", "Örnek", "Zorlama"].every((bolum) => belge.includes(`**${bolum}:**`)),
        tasiyicilar: tasiyicilariOlc(dugum, rol, belge),
      });
    });
  }
  // HST-MTR-A02: ölçüm sayıyı dondurmaz ve ayrışmada hata fırlatmaz; sayım kayda
  // karşı yalnız kanon sayımı nöbetinde ölçülür (KANON_SAYIMI, bu dosyanın başı).
  const sayim: OlculenKanonSayimi = {
    dosya: dosyalar.length,
    karar: maddeler.filter((m) => m.rol === "Karar").length,
    kural: maddeler.filter((m) => m.rol === "Kural").length,
    tekil: new Set(maddeler.map((m) => m.kod)).size,
  };
  return { maddeler, muhurler, demet: sha256(`${muhurler.join("\n")}\n`), sayim };
}

function dinamikTaniKodlari(snf: Pick<Siniflama, "zorunluKenarlar">, sabit: ReadonlySet<string>): string[] {
  const sonuc = new Set<string>();
  for (const kurallar of Object.values(snf.zorunluKenarlar ?? {})) {
    for (const kural of kurallar) if (kural.tanı && !sabit.has(kural.tanı)) sonuc.add(kural.tanı);
  }
  return [...sonuc].sort((a, b) => a.localeCompare(b, "tr"));
}

function maddeTaniIndeksi(maddeler: readonly KanonMaddesiOlcumu[]): Map<string, string[]> {
  const indeks = new Map<string, string[]>();
  for (const madde of maddeler) {
    for (const tani of madde.tanilar) {
      const liste = indeks.get(tani) ?? [];
      if (!liste.includes(madde.kod)) liste.push(madde.kod);
      indeks.set(tani, liste);
    }
  }
  return indeks;
}

export function kanonTutarlilikMetni(kokYolu: string): string {
  const kok = resolve(kokYolu);
  const olcum = kanonMaddeleriniOlc(kok);
  const snfYolu = join(kok, "oz", "siniflama", "kayit.json");
  const ortuYolu = join(kok, "oz", "siniflama", "ortu.json");
  const sicilYolu = join(kok, "urun", "cekirdek", "src", "tani-sicili.ts");
  const snfKaynak = readFileSync(snfYolu, "utf8");
  const ortuKaynak = existsSync(ortuYolu) ? readFileSync(ortuYolu, "utf8") : undefined;
  const sicilKaynak = readFileSync(sicilYolu, "utf8");
  const snf = siniflamaOrtuMerge(siniflamaYukle(snfYolu), siniflamaOrtuYukle(kok));
  const tani = taniKumesiniOlc(snf);
  const { dinamik, canli } = tani;
  const maddeKodlari = new Set(olcum.maddeler.map((m) => m.kod));
  const taniIndeks = maddeTaniIndeksi(olcum.maddeler);
  const karar = olcum.maddeler.filter((m) => m.rol === "Karar").length;
  const kural = olcum.maddeler.filter((m) => m.rol === "Kural").length;
  const eksikOrnek = olcum.maddeler.filter((m) => m.ornek === "—");
  const eksikDortParca = olcum.maddeler.filter((m) => !m.dortParcaTam);
  // HST-MTR-A01: taşıyıcı eşitliği madde sayısına göre raporlanır; payda ölçülen
  // madde sayısıdır, çünkü maddelerin sayısını "Kanon maddesi" satırı ayrıca bekler.
  const tasiyiciAyrisan = olcum.maddeler.filter((m) => m.tasiyicilar.some((t) => !t.esit));
  const tasiyiciAlani = olcum.maddeler.reduce((toplam, m) => toplam + m.tasiyicilar.length, 0);
  const tasiyiciSatirlari = olcum.maddeler.flatMap((m) => m.tasiyicilar.filter((t) => !t.esit).map((t) =>
    `| \`${m.kod}\` | \`${t.alan}\` | ${t.bolum} | ${t.tasiyiciUzunluk} | ${t.belgeUzunluk} | ${t.ilkFark} |`));
  const kirikDayanak = olcum.maddeler.flatMap((m) => m.dayanaklar.filter((d) => !maddeKodlari.has(d)).map((d) => `${m.kod}→${d}`));
  const eslesmeyenYeni = YENI_TANI_KANONU.filter((t) => !maddeKodlari.has(t.madde));
  const emekliCanli = tani.sayim.emekliCanli;
  const borcCanli = EMEKLILIK_BORCU_TANI_KODLARI.filter((kod) => canli.has(kod));

  // Kanonun dosya, Karar ve Kural sayısı TEK kayıtta yaşar (KANON_SAYIMI ·
  // HST-MTR-A02); bu üretici kaydı okur ve ölçülen kanonla ayrışmayı hata
  // fırlatmadan ölçüm tablosuna ve çelişki raporuna bulgu olarak yazar. Kaydı
  // canlı kanona karşı ölçen tek nöbet sinama/kanon-tutarlilik.test.ts içindedir.
  const kayitMadde = kanonMaddeSayisi(KANON_SAYIMI);
  const sayimBulgusu = kanonSayimiBulgusu(olcum.sayim);
  const olculenMadde = olcum.maddeler.length;

  // Tanı kümelerinin sayısı da TEK kayıtta yaşar (TANI_KUMESI_SAYIMI · HST-MTR-A12)
  // ve kanon madde sayısından ayrıdır. Üretici kümeleri canlı sicilden sayar; sicil
  // kayıttan ya da küme değişmezlerinden ayrıştığında hata fırlatmaz, ayrışan ölçüyü
  // ölçüm tablosuna, çelişki raporuna ve bulgu metnine adıyla yazar.
  const taniKayit = TANI_KUMESI_SAYIMI;
  const taniBulgusu = taniKumesiSayimiBulgusu(tani.sayim);
  const taniSayimSatiri = (ad: string, kume: (s: TaniKumesiSayimi) => number): [string, string, number, boolean] =>
    [ad, `${kume(taniKayit)}`, kume(tani.sayim), kume(tani.sayim) === kume(taniKayit)];
  const yeniDagilim = (s: TaniKumesiSayimi): string =>
    `${yeniKumeSayisi(s)} (${s.yeni.hata} hata + ${s.yeni.uyari} uyarı + ${s.yeni.bilgi} bilgi)`;

  const muhurSatirlari = olcum.muhurler.map((muhur) => {
    const [dosya, sha] = muhur.split(":");
    return `| \`yasa/kanon/${dosya}\` | \`${sha}\` |`;
  });
  const ornekSatirlari = olcum.maddeler.map((m) => `| \`${m.kod}\` | ${m.rol} | \`${m.dosya}\` | ${hucre(m.ornek)} |`);
  const yeniSatirlari = YENI_TANI_KANONU.map((t) =>
    `| \`${t.kod}\` | \`${t.madde}\` | ${t.kademe} | ${t.kapsam} | \`${t.uretici}\` |`);
  const oncekiSatirlari = [...ONCEKI_TANI_KODLARI].sort((a, b) => a.localeCompare(b, "tr")).map((kod) =>
    `| \`${kod}\` | ${taniIndeks.get(kod)?.map((m) => `\`${m}\``).join(" · ") ?? "doğrudan madde iddiası yok"} | canlı-sabit |`);
  const dinamikSatirlari = dinamik.map((kod) => `| \`${kod}\` | \`oz/siniflama/kayit.json.zorunluKenarlar\` | canlı-dinamik |`);

  const tutarlilik: Array<[string, string, string | number, boolean]> = [
    ["Resmi kaynak dosyası", `${KANON_SAYIMI.dosya}`, olcum.muhurler.length, olcum.muhurler.length === KANON_SAYIMI.dosya],
    ["Kanon maddesi", `${kayitMadde} tekil`, olcum.sayim.tekil, olcum.sayim.tekil === kayitMadde && olculenMadde === kayitMadde],
    ["Rol dağılımı", `${KANON_SAYIMI.karar} Karar + ${KANON_SAYIMI.kural} Kural`, `${karar} Karar + ${kural} Kural`,
      karar === KANON_SAYIMI.karar && kural === KANON_SAYIMI.kural],
    ["Dört parçalı madde", `${olculenMadde}/${olculenMadde}`, `${olculenMadde - eksikDortParca.length}/${olculenMadde}`, eksikDortParca.length === 0],
    ["Kanonik örnek", `${olculenMadde}/${olculenMadde}`, `${olculenMadde - eksikOrnek.length}/${olculenMadde}`, eksikOrnek.length === 0],
    ["Taşıyıcı ile belge metni eşitliği", `${olcum.maddeler.length}/${olcum.maddeler.length}`,
      `${olcum.maddeler.length - tasiyiciAyrisan.length}/${olcum.maddeler.length}`, tasiyiciAyrisan.length === 0],
    ["Çözülemeyen dayanak", "0", kirikDayanak.length, kirikDayanak.length === 0],
    ["Yeni tanı→madde eşleşme eksiği", "0", eslesmeyenYeni.length, eslesmeyenYeni.length === 0],
    ["Canlı-emekli kesişimi", "0", emekliCanli.length, emekliCanli.length === 0],
    ["Yeni tanı kümesi", yeniDagilim(taniKayit), yeniDagilim(tani.sayim), yeniDagilim(tani.sayim) === yeniDagilim(taniKayit)],
    taniSayimSatiri("Önceki sabit tanı kümesi", (s) => s.onceki),
    taniSayimSatiri("Sınıflamadan türeyen tanı kümesi", (s) => s.siniflamaTurevli),
    taniSayimSatiri("Uygulanmış emekli tanı kümesi", (s) => s.emekli),
    taniSayimSatiri("Emeklilik borcu", (s) => s.emeklilikBorcu),
  ];
  const tutarlilikSatirlari = tutarlilik.map(([olcu, beklenen, gercek, gecti]) =>
    `| ${olcu} | ${beklenen} | ${gercek} | ${gecti ? "GEÇTİ" : "SAPMA"} |`);

  return [
    "// is/nitelik/goc/kanon_tutarlilik.sar — göç belge turu A03 kapanışı",
    "// Bu dosya türetilmiş ölçüm yüzüdür; kanon değildir ve hüküm değiştiremez.",
    `// KAYNAK-MUHRU kanon-demeti-sha256:${olcum.demet}`,
    "",
    "-->|",
    "# Kanon tutarlılık yüzü",
    "",
    "Bu türev yalnız `yasa/kanon/` altındaki sekiz resmi hüküm dosyasını, canlı tanı sicilini ve canlı sınıflamayı okur. `geneldurum/` kaynak değildir ve bu üreticide tüketilmez.",
    "",
    "## Kaynak mühürleri",
    "",
    "| Kaynak | SHA-256 |",
    "|---|---|",
    ...muhurSatirlari,
    `| kanon demeti | \`${olcum.demet}\` |`,
    `| \`urun/cekirdek/src/tani-sicili.ts\` | \`${sha256(sicilKaynak)}\` |`,
    `| \`oz/siniflama/kayit.json\` | \`${sha256(snfKaynak)}\` |`,
    ...(ortuKaynak ? [`| \`oz/siniflama/ortu.json\` | \`${sha256(ortuKaynak)}\` |`] : []),
    "",
    "## Resmi kanon ölçümü ve değişmezler",
    "",
    "| Ölçü | Beklenen | Gerçek | Sonuç |",
    "|---|---:|---:|---|",
    ...tutarlilikSatirlari,
    "",
    `Resmi sonuç ${olcum.maddeler.length}/${olcum.maddeler.length} maddedir. Tek adres \`yasa/kanon/\`; bu türev hüküm metni kurmaz.`,
    "",
    "## Taşıyıcı ile belge metni",
    "",
    `Kanon dosyalarının başlığı, Karar düğümündeki \`karar\` ve \`gerekçe\` alanlarını belge bloğundaki Hüküm ile Gerekçe metninin makine-okur taşıyıcısı olarak ilan eder; her maddenin \`ne\` alanı da belge başlığını taşır. Bu ölçüm ${tasiyiciAlani} taşıyıcı alanı belge metniyle eşitlik üzerinden karşılaştırır; boşluk ve satır kırılımı fark sayılmaz, harf, noktalama ve sözcük farkı sayılır.`,
    "",
    ...(tasiyiciSatirlari.length === 0 ? ["Belge metninden ayrışan taşıyıcı alan yoktur."] : [
      `Belge metninden ayrışan ${tasiyiciSatirlari.length} taşıyıcı alan ${tasiyiciAyrisan.length} maddededir. Ayrışma burada adıyla kayda geçer; kanon metninin düzeltilmesi Founder kapısıdır ve bu türev kanona yazmaz. Karakter sayıları boşluğu daraltılmış metinlerindir ve ilk fark iki metnin ayrıştığı karakter sırasıdır.`,
      "",
      "| Madde | Taşıyıcı alan | Belge bölümü | Taşıyıcı karakter | Belge karakter | İlk fark |",
      "|---|---|---|---:|---:|---:|",
      ...tasiyiciSatirlari,
    ]),
    "",
    `## Kanonik örnekler — ${olculenMadde}/${olculenMadde}`,
    "",
    "| Madde | Rol | Resmi dosya | Kanondan ölçülen Örnek bölümü |",
    "|---|---|---|---|",
    ...ornekSatirlari,
    "",
    "## Tanı ↔ madde haritası — yeni küme",
    "",
    `Plan konisindeki 69 yeni tanı tabanı canlı sicilde korunur; YUZ-3.3 maddesinin \`tanı-yüzeyi-karışması\` kaydı buna eklenen yetmişinci kimliktir. Güncel küme ${YENI_TANI_KANONU.length} tanıdır ve düzey dağılımı ${YENI_TANI_KANONU.filter((t) => t.kademe === "hata").length} hata + ${YENI_TANI_KANONU.filter((t) => t.kademe === "uyarı").length} uyarı + ${YENI_TANI_KANONU.filter((t) => t.kademe === "bilgi").length} bilgidir.`,
    "",
    "| Tanı | Kanon maddesi | Canlı düzey | Kapsam | Üretici |",
    "|---|---|---|---|---|",
    ...yeniSatirlari,
    "",
    "## Canlı korunan sabit küme",
    "",
    `Yeni kümeden önceki ${ONCEKI_TANI_KODLARI.length} sabit kimlik canlı sicilde korunur. Kanonun yapısal \`tanı:\` alanında açıkça geçen maddeler ikinci sütunda gösterilir; “doğrudan madde iddiası yok” ifadesi yeni bir eşleme icat edilmediğini bildirir.`,
    "",
    "| Korunan kimlik | Yapısal kanon iddiası | Durum |",
    "|---|---|---|",
    ...oncekiSatirlari,
    "",
    "## Sınıflamadan türeyen canlı kimlikler",
    "",
    `Sabit ${canli.size - dinamik.length} kimliğe ek olarak ${dinamik.length} kimlik canlı \`zorunluKenarlar\` verisinden türetilir. Bunlar sabit yönlendirme sayısına veya yeni-küme düzey dağılımına eklenmez.`,
    "",
    "| Kimlik | Kaynak | Durum |",
    "|---|---|---|",
    ...dinamikSatirlari,
    "",
    "## Güncel emekli kümesi ve emeklilik borcu",
    "",
    `Emekli kararı uygulanmış ve canlı sicilden çıkmış küme ${EMEKLI_TANI_KODLARI.length} kimliktir: ${EMEKLI_TANI_KODLARI.map((kod) => `\`${kod}\``).join(" · ")}.`,
    "",
    `Halefi ilan edilen emekli kimlikler (KPS-MVS-A01 · 2026-09-10): ${[...EMEKLI_TANI_HALEFI].map(([eski, yeni]) => `\`${eski}\` → \`${yeni}\``).join(" · ")}. Emeklinin tarihsel kaydı yerinde durur; halef, emekliliğin gerekçesi olan "ölçüm anında sıfır bulgu" varsayımının yanlış çıktığı dersi devralan canlı tanıdır ve canlı sicilde bulunması bu üreticide sınanır.`,
    "",
    `Emekli kararı bulunduğu hâlde uyumluluk için sabit veya sınıflama-türevli sicilde yaşamayı sürdüren açık borç ${EMEKLILIK_BORCU_TANI_KODLARI.length} kimliktir: ${EMEKLILIK_BORCU_TANI_KODLARI.map((kod) => `\`${kod}\``).join(" · ")}. Bu küme “emekli” diye yanlış sayılmaz; çelişki raporunda açık kalır.`,
    "",
    "## Çelişki raporu",
    "",
    "| Bulgu | Ölçüm | Hüküm |",
    "|---|---:|---|",
    `| Kanon sayımı kaydından ayrışma | ${olculenMadde} / ${kayitMadde} | ${sayimBulgusu ? `AÇIK · artırma adımı \`${KANON_SAYIMI_KAYDI}\` kaydındadır` : "YOK"} |`,
    `| Tanı kümesi sayımı kaydından ayrışma | ${tani.sayim.canli} / ${canliSicilSayisi(taniKayit)} | ${taniBulgusu ? `AÇIK · artırma adımı \`${KANON_SAYIMI_KAYDI}\` kaydındadır` : "YOK"} |`,
    `| Planın 69 yeni tanı damgası ile canlı sicil | 69 taban + ${YENI_TANI_KANONU.length - 69} sonradan doğan kimlik = ${YENI_TANI_KANONU.length} | ÇÖZÜLDÜ · güncel sayı ${YENI_TANI_KANONU.length} |`,
    `| Yeni tanının resmi maddesi eksik | ${eslesmeyenYeni.length} | ${eslesmeyenYeni.length === 0 ? "YOK" : "AÇIK"} |`,
    `| Kanonik örnek eksiği | ${eksikOrnek.length} | ${eksikOrnek.length === 0 ? "YOK" : "AÇIK"} |`,
    `| Dört parçalı madde eksiği | ${eksikDortParca.length} | ${eksikDortParca.length === 0 ? "YOK" : "AÇIK"} |`,
    `| Taşıyıcısı belge metninden ayrışan madde | ${tasiyiciAyrisan.length} | ${tasiyiciAyrisan.length === 0 ? "YOK" : `AÇIK · ${tasiyiciAyrisan.map((m) => `\`${m.kod}\``).join(" · ")} · kanon metni Founder kapısıdır`} |`,
    `| Çözülemeyen kanon dayanağı | ${kirikDayanak.length} | ${kirikDayanak.length === 0 ? "YOK" : "AÇIK"} |`,
    `| Uygulanmış emekli kümesinin canlı sicille kesişimi | ${emekliCanli.length} | ${emekliCanli.length === 0 ? "YOK" : "AÇIK"} |`,
    `| Emeklilik kararı uygulanmamış canlı kimlik | ${borcCanli.length} | AÇIK · Founder sahipliği gerekir |`,
    `| Eski \`geneldurum/\` türevi | ${existsSync(join(kok, "geneldurum")) ? "dizin var" : "0"} | ${existsSync(join(kok, "geneldurum")) ? "AÇIK · nihai arşive taşı" : "YOK · arşiv işlemi gerekmiyor"} |`,
    "",
    ...(sayimBulgusu ? [sayimBulgusu, ""] : []),
    ...(taniBulgusu ? [taniBulgusu, ""] : []),
    "Kanon dosyalarının hiçbir baytı bu üretimde değiştirilmez. Kaynak mühürleri yukarıdaki sekiz SHA-256 değeriyle yeniden üretilebilir.",
    "|<--",
    "",
    "Veri( kod: VR-GOC-KANON-TUTARLILIK-MUHRU,",
    `      ne: "Resmi yasa/kanon sekizlisinin ${olcum.maddeler.length}/${olcum.maddeler.length} maddesi, ${karar} Karar ve ${kural} Kural rolüyle ölçüldü; sekiz kaynak SHA-256 değeri ve demet mührü bu türevde kayıtlıdır." )`,
    "",
    "Veri( kod: VR-GOC-TANI-MADDE-HARITASI,",
    `      ne: "Planın 69 yeni tanı tabanı YUZ-3.3 tanısıyla, iki gözlemle, ORK-8 mevsim vadesi ile mühür dürüstlüğüyle, MIM-1.7 AltKatman tekilliğiyle, MIM-3.4 dosya mühürlerinin üç tanısıyla, MIM-1.2 projesiz Faz gözlemiyle, MIM-3.2 Kitaplık kademesiyle, Faz sırası ile Blok yapısının altı tanısıyla, Faz dosyası düzeninin dört gözlemiyle, DIL-2.2 girinti gözlemiyle ve DIL-1.8 düğüm kodu standardının iki uyarısıyla ${YENI_TANI_KANONU.length} canlı yeni kimliğe ulaşır; önceki ${ONCEKI_TANI_KODLARI.length} sabit kimlik, ${dinamik.length} sınıflama-türevli kimlik, ${EMEKLI_TANI_KODLARI.length} uygulanmış emekli kimlik ve ${EMEKLILIK_BORCU_TANI_KODLARI.length} açık emeklilik borcu ayrı kümeler olarak ölçülür." )`,
    "",
    "Veri( kod: VR-GOC-KANON-TUTARLILIK-SONUCU,",
    `      ne: "Kanonik örnek eksiği ${eksikOrnek.length}, dört-parça eksiği ${eksikDortParca.length}, taşıyıcı ayrışması ${tasiyiciAyrisan.length}, çözülemeyen dayanak ${kirikDayanak.length}, yeni tanı madde eksiği ${eslesmeyenYeni.length} ve canlı-emekli kesişimi ${emekliCanli.length}; açık tek sınıfsal çelişki ${borcCanli.length} uygulanmamış emeklilik kararıdır${tasiyiciAyrisan.length === 0 ? "" : ` ve taşıyıcısı belge metninden ayrışan ${tasiyiciAyrisan.length} madde ayrıca açıktır (${tasiyiciAyrisan.map((m) => m.kod).join(", ")})`}." )`,
    "",
  ].join("\n");
}

export function kanonTutarlilikUret(kokYolu: string): KanonTutarlilikSonucu {
  const kok = resolve(kokYolu);
  const hedef = join(kok, "is", "nitelik", "goc", "kanon_tutarlilik.sar");
  const yeni = kanonTutarlilikMetni(kok);
  const mevcut = existsSync(hedef) ? readFileSync(hedef, "utf8") : undefined;
  if (yeni !== mevcut) writeFileSync(hedef, yeni, "utf8");
  const olcum = kanonMaddeleriniOlc(kok);
  const snf = siniflamaOrtuMerge(siniflamaYukle(join(kok, "oz", "siniflama", "kayit.json")), siniflamaOrtuYukle(kok));
  return {
    degisti: yeni !== mevcut,
    dosya: hedef,
    madde: olcum.maddeler.length,
    yeni: YENI_TANI_KANONU.length,
    onceki: ONCEKI_TANI_KODLARI.length,
    emekli: EMEKLI_TANI_KODLARI.length,
    emeklilikBorcu: EMEKLILIK_BORCU_TANI_KODLARI.length,
    tasiyiciAyrisan: olcum.maddeler.filter((m) => m.tasiyicilar.some((t) => !t.esit)).map((m) => m.kod),
    kanonSayimiBulgusu: kanonSayimiBulgusu(olcum.sayim),
    taniKumesiBulgusu: taniKumesiSayimiBulgusu(taniKumesiniOlc(snf).sayim),
  };
}

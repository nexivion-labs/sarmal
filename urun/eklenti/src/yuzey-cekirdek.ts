// ═══════════════════════════════════════════════════════════════════════════
// yuzey-cekirdek.ts — 🧭 SUNUM YÜZEYİ ÇEKİRDEĞİ (SAF — vscode importsuz)
//
//   Kanonun üç sunum yüzeyi hükmünün eklenti tarafındaki taşıyıcısıdır:
//   düzeltilecek sapma Problems yüzeyine, kullanıcının bilinçli olarak açık
//   bıraktığı işaretler Hatırlatıcılar yüzeyine, düzeltme istemeyen ölçüm ve
//   durum satırları Bildirimler yüzeyine gider.
//
//   YÖNLENDİRME KARARI BURADA VERİLMEZ. Karar tek bir yerde, motorun
//   `beklenenSunumYuzeyi` işlevinde yaşar; bu modül o kararı çağırır ve yalnız
//   taşıma, gruplama ve özetleme yapar. İkinci bir eşleme çizelgesi bilerek
//   yazılmamıştır: iki çizelge olsaydı biri sessizce bayatlar ve tanı yanlış
//   yüzeye düşerdi. Yüzey nöbeti bu tek kaynağı fikstürle ölçer.
//
//   Modül vscode'suzdur; davranış sınaması (sinama/tani-yuzeyleri.test.ts)
//   editör kabuğu istemez ve GERÇEK dağıtım işlevini koşturur.
// ═══════════════════════════════════════════════════════════════════════════

import { beklenenSunumYuzeyi, type SunumYuzeyi } from "../../cekirdek/src/denetim.ts";
import type { Tani } from "../../cekirdek/src/tani.ts";
import { YENI_TANI_INDEKS } from "../../cekirdek/src/tani-sicili.ts";
import {
  kayitEtiketi, kayitAciklamasi, kayitIpucu, panoKaydiMetni, panoKumeMetni,
} from "./yuzey-metinleri.ts";
import { bildirimTuru, type BildirimTuru } from "./yol-dekor.ts";
// YALNIZ TİP alınır; çalışma zamanında hiçbir bağ kurulmaz ve modül SAF kalır
// (yol-dekor.ts aynı deseni taşır). Simge çizelgesi vscode kabuğunu içeri alır,
// bu yüzden ondan yalnız ad kümelerinin TİPİ ödünç alınabilir.
import type { AnlamRengi, SatirSimgesi, EksenTipi } from "./simge-cizelgesi.ts";
import type { KapsayiciEvre } from "../../cekirdek/src/durum.ts";

export type { SunumYuzeyi };

/**
 * Görünüş kimlikleri. Sağlayıcı kaydı bu iki sabitten okur; paket bildirimi
 * (`package.json`) ise aynı kimlikleri KENDİ metninde ayrıca yazar. Tek kaynak
 * kurulamaz, çünkü `package.json` bir JSON dosyasıdır ve bir TypeScript
 * sabitini içeri alamaz. Kimlik bu yüzden iki yerde ayrı ayrı yaşar; eşitliği
 * koruyan şey tek kaynak değil, yüzey nöbetindeki iki sınamadır. Nöbet paket
 * bildirimini okuyup bu iki sabitle karşılaştırır ve yinelenen görünüş kimliği
 * bulunmadığını ölçer; ikisi ayrışırsa süit kırmızıya döner.
 */
export const GORUNUS_HATIRLATICILAR = "sarmalHatirlaticilar";
export const GORUNUS_BILDIRIMLER = "sarmalBildirimler";
/**
 * Fikirler — henüz taahhüde dönüşmemiş ham düşüncelerin kendi paneli
 * (VIT-GRAF-A16). Kayıtları motorun tanı akışından değil ayrışmış ağaçtan alır,
 * çünkü Fikir bir sapma değildir ve motor onun için hiçbir tanı üretmez; bu
 * yüzden yüzey defterine bağlanmaz ve kendi defterinden beslenir. Founder
 * 2026-08-08 tarihinde Fikrin kendi başına bir düşünce evresi olduğuna ve başka
 * bir tipin penceresine misafir edilemeyeceğine hükmetti; hükmün doğruluğu
 * 2026-08-09 tarihinde canlı görünümde ölçüldü, çünkü canlı rafa yazılan iki
 * gerçek Fikir yirmi dokuz hatırlatıcı kaydının altında kaldığı için panelde
 * bulunamadı.
 */
export const GORUNUS_FIKIRLER = "sarmalFikirler";
/**
 * Onaylar — Founder onayı bekleyen kapıların paneli. Kayıtları motorun
 * tanı akışından değil onay tarayıcısından alır, bu yüzden yüzey defterine
 * bağlanmaz; kimliği yine de burada durur, çünkü paket bildirimiyle eşitliği
 * ölçen nöbet bütün görünüş kimliklerini tek yerden okur.
 */
export const GORUNUS_POSTA_KUTUSU = "sarmalPostaKutusu";

/**
 * 📬 ONAY YÜZEYİNİN DEĞİŞMEZ KİMLİKLERİ (VIT-POSTA-A03).
 *
 * Bu üç dize kullanıcının kişisel yerleşimini taşır: VS Code panel konumunu
 * görünüş kimliğiyle, klavye kısayolunu komut kimliğiyle, Açıklamalar menü
 * koşullarını denetleyici kimliğiyle hatırlar. Kimlik değişirse kullanıcının
 * yerleşimi sessizce sıfırlanır; bu yüzden yüzeylerin ROLÜ değişirken bile
 * kimlikleri sabit kalır ve yalnız görünen adlar yeni rolü anlatır. Sabitler
 * burada durur ki nöbet paket bildirimiyle eşitliği tek kaynaktan ölçebilsin.
 */
export const DENETLEYICI_ONAY = "sarmal-onay";
export const KOMUT_POSTA_KUTUSU = "sarmal.onayKuyrugu";

/** Kaydın geldiği Proje kimliği — panel gruplaması bu kimlikten kurulur. */
export interface ProjeKimligi {
  /** Proje kökünün kodu (`ana.sar` kök düğümünden). */
  readonly kod: string;
  /** Projenin insan adı — panelde görünen etiket. */
  readonly ad: string;
}

/**
 * Bir sunum yüzeyine taşınan tek kayıt. Kanonik tanı nesnesi olduğu gibi
 * taşınır: yüzey ne kodu, ne düzeyi, ne mesajı, ne konumu, ne de öneriyi
 * değiştirir. Yüzeyin eklediği tek şey kaydın hangi dosyadan ve hangi
 * Projeden geldiğidir.
 */
export interface YuzeyKaydi {
  readonly proje: ProjeKimligi;
  /** Kaydın geldiği dosyanın tam yolu. */
  readonly dosya: string;
  /** Motorun ürettiği kanonik tanı — hiçbir alanı değiştirilmez. */
  readonly tani: Tani;
}

/** Üç kanonik yüzeye ayrılmış kayıtlar. */
export interface YuzeyDagilimi {
  readonly problems: readonly YuzeyKaydi[];
  readonly hatırlatıcılar: readonly YuzeyKaydi[];
  readonly bildirimler: readonly YuzeyKaydi[];
}

/**
 * Bir kaydın ait olduğu yüzeyi söyler. Kararı motordan alır; bu modül kendi
 * doğa tanımını kurmaz.
 */
export function kaydinYuzeyi(kayit: YuzeyKaydi): SunumYuzeyi {
  return beklenenSunumYuzeyi(kayit.tani);
}

/**
 * Kayıtları üç yüzeye dağıtır. Sözleşmesi iki cümledir: her kayıt tam olarak
 * bir yüzeye gider (çift yayın yok) ve hiçbir kayıt düşmez (kayıp yayın yok).
 * Kayıtların kaynak sırası her yüzeyde korunur.
 */
export function yuzeyeAyir(kayitlar: readonly YuzeyKaydi[]): YuzeyDagilimi {
  const problems: YuzeyKaydi[] = [];
  const hatırlatıcılar: YuzeyKaydi[] = [];
  const bildirimler: YuzeyKaydi[] = [];
  for (const kayit of kayitlar) {
    switch (kaydinYuzeyi(kayit)) {
      case "hatırlatıcılar": hatırlatıcılar.push(kayit); break;
      case "bildirimler": bildirimler.push(kayit); break;
      default: problems.push(kayit); break;
    }
  }
  return { problems, hatırlatıcılar, bildirimler };
}

/**
 * Yönlendirme matrisi: verilen tanı kimlikleri için hangi kimliğin hangi
 * yüzeye gittiğini söyler. Doğa türetmesi kimliğin YANINDA bir düzey ister;
 * düzey, tanının BUGÜN üretildiği kademeden gelir — kanonun hedeflediği
 * düzeyden değil. Bu ayrım kayıtlıdır ve önemlidir: yeni kanonun tanıları
 * bugün gözlem kademesinde doğar, terfileri ayrı bir turun işidir.
 */
export function yuzeyMatrisi(
  kimlikler: Iterable<{ kod: string; duzey: Tani["duzey"] }>,
): Map<string, SunumYuzeyi> {
  const matris = new Map<string, SunumYuzeyi>();
  for (const { kod, duzey } of kimlikler) {
    matris.set(kod, beklenenSunumYuzeyi({ duzey, kod, mesaj: "", satir: 1, sutun: 1 }));
  }
  return matris;
}

/** Bir Proje altında toplanan kayıtlar. */
export interface ProjeKumesi {
  readonly proje: ProjeKimligi;
  readonly kayitlar: readonly YuzeyKaydi[];
}

/**
 * Kayıtları Proje koduna göre gruplar. Farklı Projelerin kayıtları asla aynı
 * kümede birleşmez; Projeler insan adına göre Türkçe sırayla dizilir.
 */
export function projeyeGrupla(kayitlar: readonly YuzeyKaydi[]): ProjeKumesi[] {
  const harita = new Map<string, { proje: ProjeKimligi; kayitlar: YuzeyKaydi[] }>();
  for (const kayit of kayitlar) {
    const kume = harita.get(kayit.proje.kod);
    if (kume) kume.kayitlar.push(kayit);
    else harita.set(kayit.proje.kod, { proje: kayit.proje, kayitlar: [kayit] });
  }
  return [...harita.values()].sort((a, b) => a.proje.ad.localeCompare(b.proje.ad, "tr"));
}

/**
 * Aynı kökten gelen kayıtların özeti. Kök, tanı kimliğidir: bir Projede aynı
 * kimlikten birden çok kayıt varsa hepsi tek bir özet satırının altına iner.
 * Özet hiçbir kaydı elemez; yalnız bir kademe ekler ve sayıyı etikette söyler.
 */
export interface KokKumesi {
  readonly kod: string;
  readonly kayitlar: readonly YuzeyKaydi[];
}

/**
 * Kayıtları tanı kimliğine göre özetler. Tek kayıtlık kimlikler de kendi
 * kümesinde döner; sunum katmanı tek kayıtlık kümeyi ara satır açmadan
 * doğrudan gösterebilir. Kimlikler Türkçe sırayla dizilir ve küme içindeki
 * kaynak sırası korunur.
 */
export function kokeGoreOzetle(kayitlar: readonly YuzeyKaydi[]): KokKumesi[] {
  const harita = new Map<string, YuzeyKaydi[]>();
  for (const kayit of kayitlar) {
    const liste = harita.get(kayit.tani.kod);
    if (liste) liste.push(kayit);
    else harita.set(kayit.tani.kod, [kayit]);
  }
  return [...harita.entries()]
    .map(([kod, liste]) => ({ kod, kayitlar: liste }))
    .sort((a, b) => a.kod.localeCompare(b.kod, "tr"));
}

// ── 📊 TÜR ÖZETİ — proje satırının dağılım cümlesi (VIT-GRAF-A15 · SAF) ─────
//
//   HÜKMÜN DOĞUŞU. VIT-GRAF-A13 ağacın üç kademeli olmasını ve kademelerin
//   Proje, Dosya ve kayıt olmasını şart koşuyordu; o ölçütü uygularken tanı
//   kimliğine göre yığan eski kademe dosya kademesiyle DEĞİŞTİRİLMEK zorunda
//   kaldı, çünkü ikisini birlikte tutmak dört kademe demekti. Değişimin kazancı
//   da bedeli de ölçülmüştür: kullanıcı artık bir dosyanın nesi olduğunu bakışta
//   görür, buna karşılık hangi tür sorunun baskın olduğunu ancak bütün dosyaları
//   açıp sayarak öğrenir. Founder 2026-08-08 tarihinde kaybolan görünümü geri
//   istedi fakat dördüncü kademeyi reddetti, çünkü fazladan kademe her kayda
//   ulaşmak için fazladan tıklama demektir. Bu yüzden geri gelen şey bir kademe
//   değil, proje satırına yazılan bir ÖZETTİR.
//
//   İKİNCİ SAYAÇ KURULMAZ. Dağılım kendi tarama ya da sayma döngüsünü açmaz;
//   panelin zaten taşıdığı kayıt kümesini `kokeGoreOzetle` gruplayıcısından
//   geçirir ve yalnız sıralar. Aynı gerçeğin iki sayacı zamanla ayrışır ve bu
//   depo o ayrışmayı bugüne kadar üç kez ölçtü (iki simge çizelgesi · iki
//   dışlama evreni · panel ile durum çubuğu). Türetme, kopyalamanın panzehiridir.

/** Tek bir tanı kimliğinin panelde kaç kez göründüğü. */
export interface TurPayi {
  /** Kanonik tanı kimliği — yüzey onu yeniden adlandırmaz. */
  readonly kod: string;
  readonly adet: number;
}

/** Bir panelin bugünkü tür dağılımı: baskın türler önde, tamamı arkada. */
export interface TurDagilimi {
  /** Dağılıma giren kayıt sayısı; gruplamadan türetilir, ayrıca sayılmaz. */
  readonly toplam: number;
  /** Panelde bugün kaç ayrı tanı kimliği yaşıyor. */
  readonly turSayisi: number;
  /** Üst satırda gösterilecek baskın türler, çoktan aza doğru. */
  readonly baskinlar: readonly TurPayi[];
  /** Dağılımın tamamı — ipucu penceresi bunu okur, hiçbir tür elenmez. */
  readonly tumu: readonly TurPayi[];
}

/**
 * ÜST SATIRDA KAÇ TÜR GÖSTERİLİR — gürültü kararı ve gerekçesi.
 *
 * Sayı üçtür ve üç gerekçeyle seçilmiştir. Birincisi sorunun kendisidir:
 * Founder'ın sorduğu şey "hangi tür baskın" sorusudur ve baskınlık bir
 * karşılaştırmadır; tek sayı hiçbir şeyle karşılaştırılamaz, iki sayı ise
 * düşüşün dik mi yatay mı olduğunu söyleyemez. İkincisi bugünkü ölçümdür
 * (2026-08-09 · deponun tam denetimi, tanılar sunum yüzeyine ayrılarak
 * sayılmıştır): Gözlemler yüzeyinde on sekiz tür ve yüz on bir kayıt yaşıyor,
 * ilk üç tür (31 · 19 · 12) yığının yüzde elli altısını taşıyor ve dördüncü tür
 * üçüncünün iki bulgu altında (10) kaldığı için yeni bir yargı üretmiyor.
 * Üçüncüsü kırpılmanın yönüdür: satır çoktan aza dizildiği için dar bir kenar
 * çubuğunda önce SON öğe kesilir ve kullanıcının en çok önemsediği baskın tür
 * her koşulda görünür kalır.
 *
 * Gösterilmeyen türler saklanmaz: satırın gri açıklaması kaç ayrı tür
 * bulunduğunu söyler, ipucu penceresi ise dağılımın tamamını sayılarıyla basar.
 */
export const OZET_TUR_SAYISI = 3;

/**
 * Bir panelin tür dağılımını, panelin KENDİ kayıt kümesinden türetir.
 *
 * Sıra çoktan aza doğrudur; eşit sayılı türler Türkçe kimlik sırasıyla dizilir,
 * böylece aynı küme her koşumda aynı satırı üretir ve panel gereksiz yere
 * yeniden çizilmez.
 */
export function turDagilimi(
  kayitlar: readonly YuzeyKaydi[],
  ustSinir: number = OZET_TUR_SAYISI,
): TurDagilimi {
  // TEK KAYNAK: gruplama işi panelin zaten kullandığı özetleyiciye bırakılır.
  const tumu: TurPayi[] = kokeGoreOzetle(kayitlar)
    .map((kume) => ({ kod: kume.kod, adet: kume.kayitlar.length }))
    .sort((a, b) => b.adet - a.adet || a.kod.localeCompare(b.kod, "tr"));
  return {
    // Toplam da dağılımdan türetilir; kayıt dizisi ikinci kez sayılmaz.
    toplam: tumu.reduce((s, t) => s + t.adet, 0),
    turSayisi: tumu.length,
    baskinlar: tumu.slice(0, Math.max(0, ustSinir)),
    tumu,
  };
}

/**
 * Bir dosyanın altında toplanan kayıtlar — ağacın DOSYA kademesi (VIT-GRAF-A13).
 *
 * NEDEN BU KADEME VAR. Founder canlı görünümde altmış iki kaydın tek yığın
 * hâlinde gezilemediğini bildirdi (2026-07-28) ve ölçüm onu doğruladı: bugünkü
 * Gözlemler düzeninde tek bir özet satırının altında yüz otuz altı kayıt
 * yığılıyor. Dosya kademesi o yığını böler; ikinci kazancı da teknoloji
 * simgesine doğal bir ev açmasıdır — simge dosya satırına iner ve yaprakların
 * TÜR RENGİNE hiç dokunmaz.
 */
export interface YuzeyDosyaKumesi {
  readonly dosya: string;
  readonly dosyaAdi: string;
  readonly kayitlar: readonly YuzeyKaydi[];
}

/** Yolun son parçası — hem '/' hem '\' ayracı tanınır. */
export function yuzeyDosyaAdiniAl(dosya: string): string {
  const kesim = Math.max(dosya.lastIndexOf("/"), dosya.lastIndexOf("\\"));
  return kesim >= 0 ? dosya.slice(kesim + 1) : dosya;
}

/**
 * Kayıtları dosyaya göre gruplar. Dosyalar insan adına göre Türkçe sırayla,
 * bir dosyanın kayıtları da kaynak konumuna göre dizilir: panelde okunan sıra
 * dosyada okunan sırayla aynıdır. Hiçbir kayıt elenmez ve tek kayıtlık dosya da
 * kendi satırını alır — tek kayıtlık kök için verilen kararın ikizi budur
 * (bir tık kazanmak, ağacın okunur olmasından ve her kaydın teknoloji simgesini
 * görmesinden daha ucuzdur).
 */
export function dosyayaGrupla(kayitlar: readonly YuzeyKaydi[]): YuzeyDosyaKumesi[] {
  const harita = new Map<string, YuzeyKaydi[]>();
  for (const kayit of kayitlar) {
    const liste = harita.get(kayit.dosya);
    if (liste) liste.push(kayit);
    else harita.set(kayit.dosya, [kayit]);
  }
  return [...harita.entries()]
    .map(([dosya, liste]) => ({
      dosya,
      dosyaAdi: yuzeyDosyaAdiniAl(dosya),
      kayitlar: [...liste].sort((a, b) => a.tani.satir - b.tani.satir || a.tani.sutun - b.tani.sutun),
    }))
    .sort((a, b) => a.dosyaAdi.localeCompare(b.dosyaAdi, "tr") || a.dosya.localeCompare(b.dosya, "tr"));
}

// ── 🔎 SATIRIN KENDİ KODU (VIT-GRAF-A13) ───────────────────────────────────
//
//   Founder canlı incelemede şunu bildirdi (2026-07-29): "bazıları tıklandığında
//   adımlara gidiyor, bazıları da tıklandığında hatırlatıcıya gidiyor, anlamadım."
//   Ölçüm davranışın DOĞRU olduğunu gösterdi — tıklama her zaman satırı doğuran
//   kayda gider — fakat okunaklılığın kusurlu olduğunu da gösterdi: bütün satırlar
//   aynı çanı taşıyordu ve hiçbiri hedefini söylemiyordu.
//
//   ÇÖZÜM İKİ KATLIDIR VE İKİSİ DE BURADA, TEK YERDE YAŞAR. Birinci kat şudur:
//   satır kendi KODUNU söyler. İkinci kat, kaydın türüne göre işaretinin
//   ayrışmasıdır (aşağıdaki işaret çizelgesi). İki panel de bu tek kaynağı
//   çağırır; ikinci bir desen doğarsa kusur ad değiştirerek yaşamaya devam eder.
//
//   KOD İKİ AYRI EVRENDEN GELEBİLİR VE İKİSİ BAKIŞTA AYRILIR. Motorun mesajı bir
//   DÜĞÜM kodu adlandırıyorsa (HTR-… · VIT-… gibi BÜYÜK harfli, tireli kimlik) o
//   kod okunur ve kullanıcı tıklamadan hangi düğüme gideceğini bilir. Mesaj tek
//   bir düğüm adlandırmıyorsa — özet satırları böyledir, çünkü bir satır onlarca
//   düğümün yerine geçer — satır kendi TANI kimliğini taşır ve o kimlik küçük
//   harflidir (açık-hatırlatıcı gibi). Uydurma yapılmaz: adlandırılmamış bir
//   düğümün kodu icat edilemez, ama satır da kodsuz bırakılmaz.

/** BÜYÜK harfli, tireli düğüm kimliğinin gövdesi (Türkçe büyük harfler dâhil). */
const DUGUM_KODU_GOVDESI = "[A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜ0-9]*(?:-[A-ZÇĞİÖŞÜ0-9]+)+";

/**
 * Mesajın adlandırdığı düğüm kimliği: motor kimliği ya tırnak içinde ("KOD")
 * ya da parantez içinde (KOD) yazar. İlk eşleşme alınır, çünkü cümlenin BAŞINDA
 * duran kimlik satırı doğuran düğümdür; sonraki kimlikler o düğümün anlattığı
 * başka düğümlerdir (zincirdeki Adım gibi).
 */
const DUGUM_KODU_DESENI = new RegExp(
  `"(${DUGUM_KODU_GOVDESI})"|\\((${DUGUM_KODU_GOVDESI})\\)`, "u");

/** Mesajın adlandırdığı düğüm kodu; mesaj tek bir düğüm adlandırmıyorsa yok. */
export function dugumKodu(mesaj: string): string | undefined {
  const eslesme = DUGUM_KODU_DESENI.exec(mesaj.split("\n")[0] ?? "");
  return eslesme ? (eslesme[1] ?? eslesme[2]) : undefined;
}

/**
 * Satırın taşıyacağı kod. ASLA boş dönmez: düğüm kodu okunamazsa kaydın kanonik
 * tanı kimliği kullanılır. Kodsuz satır üretilemez olması yapısal bir güvencedir,
 * çünkü kullanıcı tıklamadan önce nereye gideceğini ancak koddan bilir.
 */
export function satirKodu(tani: Pick<Tani, "kod" | "mesaj">): string {
  return dugumKodu(tani.mesaj) ?? tani.kod;
}

/**
 * Kodlu satır etiketi: önce kod, sonra asıl cümle.
 *
 * BU, 2026-07-28 KARARININ İPTALİ DEĞİL, SINIRLANDIRILMASIDIR. O gün ölçülen
 * kusur bir satırda ÜST ÜSTE iki simge, bir tür adı, bir kod ve bir zincir
 * kimliği okunduktan sonra ancak asıl bilginin gelmesiydi; etiket kuralı o
 * yığını söktü ve sökük kalır. Bugün geri gelen tek şey TEK bir koddur ve
 * gerekçesi başkadır: kod süs değil, satırın hedef adresidir.
 */
export function kodluEtiket(kod: string, cumle: string): string {
  return `${kod} · ${cumle}`;
}

// ── 🎨 KAYIT TÜRÜNE GÖRE İŞARET (VIT-GRAF-A13) ─────────────────────────────
//
//   Founder hükmü: "hatırlatıcı düğümü çanını korusun, açık Adım kendi eksen
//   simgesini taşısın." İşaret kararı SAF tutulur; kabuk yalnız onu iki-tema
//   dosya yoluna çevirir ve hiçbir karar vermez.

/** Bir satırın taşıyacağı işaret — ya satır ailesinden ya eksen ailesinden. */
export type SatirIsareti =
  | { readonly aile: "satır"; readonly simge: SatirSimgesi; readonly anlam: AnlamRengi }
  | { readonly aile: "eksen"; readonly tip: EksenTipi; readonly evre: KapsayiciEvre };

/**
 * Hatırlatıcılar yüzeyine düşen dört kayıt türünün işaretleri.
 *
 * DÖRDÜ DE BAKIŞTA AYRILIR VE AYRIM ANLAMDAN GELİR. Hatırlatıcı düğümü çanını
 * korur, çünkü kullanıcının bilerek astığı işaret odur. Açık Adım ile
 * geliştirmedeki çapa Adım eksen simgesini taşır — Founder'ın hükmü budur — ve
 * ikisi kendi EVRESİYLE ayrılır: biri henüz başlamamıştır, öteki sürüyordur.
 * Bloklu çapa ise uyarı üçgeniyle ve hata rengiyle konuşur, çünkü o bir bekleme
 * değil bir DURMA hâlidir ve eksen ailesinin evre dili bunu söyleyemez (eksen
 * varyantları bilerek üç evre taşır ve bloklu olanı nötr boyar).
 */
export const HATIRLATICI_ISARETLERI: Readonly<Record<string, SatirIsareti>> = {
  "açık-hatırlatıcı":  { aile: "satır", simge: "can", anlam: "uyari" },
  "açık-adım":         { aile: "eksen", tip: "Adım", evre: "bekliyor" },
  "geliştirmede-çapa": { aile: "eksen", tip: "Adım", evre: "sürüyor" },
  "bloklu-çapa":       { aile: "satır", simge: "uyari", anlam: "hata" },
};

/**
 * Bir Hatırlatıcı kaydının işareti. Çizelgede karşılığı olmayan bir kimlik
 * bugünkü görünüşü korur (çan) — yeni bir kimlik yüzeye düştüğünde satır
 * işaretsiz kalmaz; çizelgenin eksikliğini ise nöbet yakalar.
 */
export function hatirlaticiIsareti(taniKodu: string): SatirIsareti {
  return HATIRLATICI_ISARETLERI[taniKodu] ?? HATIRLATICI_ISARETLERI["açık-hatırlatıcı"]!;
}

/**
 * Bir kaydın panelde nasıl görüneceğinin SAF tarifi. İki sağlayıcı da bu
 * tarifi kullanır ve yalnız editör kabuğuna çevirir; etiket, açıklama ve ipucu
 * cümlesi tek yerde kurulur. Kanonik tanı alanlarının hiçbiri düşmez.
 */
export interface KayitGorunumu {
  readonly etiket: string;
  /**
   * Satırın kendi kodu — kullanıcı tıklamadan nereye gideceğini bundan bilir.
   * Mesaj bir düğüm adlandırıyorsa o düğümün kimliği, adlandırmıyorsa kaydın
   * kanonik tanı kimliğidir; hiçbir koşulda boş kalmaz.
   */
  readonly satirKodu: string;
  /** Panelde basılan etiket: önce kod, sonra asıl cümle. */
  readonly kodluEtiket: string;
  readonly aciklama: string;
  readonly ipucu: string;
  readonly dosya: string;
  readonly satir: number;
  readonly sutun: number;
  readonly kod: string;
  readonly duzey: Tani["duzey"];
  /**
   * Kaydın TÜRÜ, kanonik tanının bugünkü düzeyiyle birebirdir. Yüzey ikinci bir
   * aday/hedef düzeyi türetmez.
   */
  readonly tur: BildirimTuru;
}

/** Kaydı panel satırına çevirir — metin katalogdan, olgu tanıdan gelir. */
export function kayitGorunumu(kayit: YuzeyKaydi): KayitGorunumu {
  const t = kayit.tani;
  const dosyaAdi = kayit.dosya.slice(kayit.dosya.lastIndexOf("/") + 1);
  const etiket = kayitEtiketi(t.mesaj);
  const kod = satirKodu(t);
  return {
    tur: bildirimTuru(t),
    etiket,
    satirKodu: kod,
    kodluEtiket: kodluEtiket(kod, etiket),
    aciklama: kayitAciklamasi(dosyaAdi, t.satir),
    ipucu: kayitIpucu({
      kod: t.kod, duzey: t.duzey, mesaj: t.mesaj,
      dosya: kayit.dosya, satir: t.satir, sutun: t.sutun, oneri: t.oneri,
    }),
    dosya: kayit.dosya,
    satir: t.satir,
    sutun: t.sutun,
    kod: t.kod,
    duzey: t.duzey,
  };
}

// ── 📋 PANOYA KOPYALAMA (VIT-GRAF-A13 · SAF) ───────────────────────────────
//
//   Founder'ın cümlesi şudur: "hatırlatıcı ve bildirim metinlerini
//   kopyalayamıyorum." Ağaç görünüşlerinde metin seçilemez, çünkü VS Code ağaç
//   satırlarını seçilebilir metin olarak çizmez; kopyalama ancak bir KOMUTLA
//   olur. Kararı burada, saf çekirdekte veriyoruz ki nöbet panoya yazılan metnin
//   tamlığını editör kabuğu kurmadan ölçebilsin; kabuk yalnız panoya yazar.
//
//   KOPYALANAN METİN SATIRDAN FAZLASINI TAŞIR. Kullanıcı metni başka bir yere
//   yapıştırdığında bağlamını kaybetmemelidir: blok kaydın kodunu, düzeyini, tam
//   gövdesini, düzeltme önerisini ve TAM DOSYA YOLUNU satır numarasıyla birlikte
//   taşır. Bir grup satırı kopyalandığında altındaki her kayıt tek seferde iner
//   ve hiçbiri elenmez — panelde görülen ile panoya inen aynı kümedir.

/** Panoya kopyalanabilen bir ağaç düğümü: ya tek kayıt ya da bir kayıt kümesi. */
export type PanoDugumu =
  | { readonly tur: "kayıt"; readonly kayit: YuzeyKaydi }
  | { readonly tur: "küme"; readonly baslik: string; readonly kayitlar: readonly YuzeyKaydi[] };

/** Tek bir kaydın pano bloğu — etiket kodla başlar, son satır tam kaynaktır. */
export function panoKaydi(kayit: YuzeyKaydi): string {
  const g = kayitGorunumu(kayit);
  return panoKaydiMetni({
    etiket: g.kodluEtiket, aciklama: g.aciklama, kod: g.kod, duzey: g.duzey,
    mesaj: kayit.tani.mesaj, dosya: g.dosya, satir: g.satir, sutun: g.sutun,
    oneri: kayit.tani.oneri,
  });
}

/** Bir ağaç düğümünün pano metni. Küme düğümü hiçbir kaydı düşürmez. */
export function panoMetni(dugum: PanoDugumu): string {
  return dugum.tur === "kayıt"
    ? panoKaydi(dugum.kayit)
    : panoKumeMetni(dugum.baslik, dugum.kayitlar.map(panoKaydi));
}

/**
 * Panoya inen KAYIT sayısı. Kullanıcıya "kaç satır kopyalandı" denirken bu sayı
 * kullanılır; metni boş satırdan bölerek saymak küme başlığını da bir kayıt gibi
 * sayardı ve kullanıcıya bir fazla söylerdi.
 */
export function panoAdedi(dugum: PanoDugumu): number {
  return dugum.tur === "kayıt" ? 1 : dugum.kayitlar.length;
}

/**
 * Bir panel ağacı düğümünü panoya kopyalanabilir kümeye çevirir.
 *
 * ÇEVİRİ TEK YERDE YAŞAR. İki panelin düğümleri aynı çekirdek tiplerini taşır
 * (Proje kümesi · dosya kümesi · kayıt), dolayısıyla iki ayrı çevirici yazmak
 * aynı satırın iki panelde farklı metin üretmesine yol açardı. Tanınmayan düğüm
 * için `undefined` döner ve çağıran sessizce hiçbir şey kopyalamaz; uydurma bir
 * blok panoya yazılmaz.
 */
export function panoDugumu(oge: unknown): PanoDugumu | undefined {
  if (typeof oge !== "object" || oge === null || !("tur" in oge)) return undefined;
  const d = oge as {
    tur: string;
    kume?: { proje?: ProjeKimligi; dosya?: string; kayitlar?: readonly YuzeyKaydi[] };
    kayit?: YuzeyKaydi;
  };
  if (d.tur === "kayıt" && d.kayit?.tani) return { tur: "kayıt", kayit: d.kayit };
  if (d.tur === "proje" && d.kume?.proje && d.kume.kayitlar) {
    return { tur: "küme", baslik: d.kume.proje.ad, kayitlar: d.kume.kayitlar };
  }
  if (d.tur === "dosya" && d.kume?.dosya && d.kume.kayitlar) {
    return { tur: "küme", baslik: d.kume.dosya, kayitlar: d.kume.kayitlar };
  }
  return undefined;
}

/**
 * Dosya başına Problems DIŞINDAKİ kayıtları tutan ve iki yeni yüzeye basan
 * defter. Eklenti bu sınıfı canlı yolda kullanır; sınıf vscode istemediği için
 * nöbet gerçek davranışı koşturabilir.
 *
 * İKİ SÖZLEŞME BURADA YAŞAR VE İKİSİ DE ÖLÇÜLEBİLİRDİR.
 *
 * Birincisi yayın sayısıdır. Deftere yazan taraf çizimi erteleyebilir; toplu
 * tarama her belge için ayrı ayrı çizim yaptırmaz, tur sonunda tek kez
 * yayımlar. Bu erteleme bir davranış onarımıdır: eskiden dağıtım işlevi
 * koşulsuz olarak yayımlıyordu ve yüz yetmiş iki dosyalık tam taramada
 * Bildirimler paneli yetmiş bir kez yeniden çiziliyordu. Sağlayıcıdaki parmak
 * izi güvencesi bunu engelleyemez, çünkü defter her belgede büyüdüğü için
 * parmak izi her seferinde gerçekten değişir.
 *
 * İkincisi kapsam süzgecidir. Aynı motorun çıktısını gösteren üç yüzey kapsam
 * konusunda birbiriyle anlaşmak zorundadır; biri bir varlığı gizlerken öteki
 * ikisi göstermeye devam ederse kullanıcı çelişkili iki tablo görür. Süzgeç
 * yapıcıya verilir ve YALNIZ yayın anında uygulanır: defter bütün kayıtları
 * tutmaya devam eder, panele yalnız kapsamdakiler basılır. Odak değişince
 * yeniden yayımlamak kayıtları geri getirir.
 */
export class YuzeyDefteri {
  private readonly kayitlar = new Map<string, readonly YuzeyKaydi[]>();
  private readonly yayinKapisi: (dagilim: YuzeyDagilimi) => void;
  private readonly kapsamda: (dosya: string) => boolean;
  private sayac = 0;

  /**
   * @param yayinKapisi Panele basma işi — defter yalnız ne basılacağını hesaplar.
   * @param kapsamda Bir dosyanın bugün panelde görünüp görünmeyeceğini söyler;
   *                 verilmezse bütün dosyalar kapsamdadır.
   */
  constructor(
    yayinKapisi: (dagilim: YuzeyDagilimi) => void,
    kapsamda: (dosya: string) => boolean = () => true,
  ) {
    this.yayinKapisi = yayinKapisi;
    this.kapsamda = kapsamda;
  }

  /** Bugüne kadar kaç kez panel çizimi istendiği. Toplu tarama nöbeti bunu okur. */
  get yayinSayisi(): number {
    return this.sayac;
  }

  /** Defterde kaydı bulunan dosya sayısı. */
  get dosyaSayisi(): number {
    return this.kayitlar.size;
  }

  /**
   * Bir dosyanın Problems dışı kayıtlarını deftere yazar. Kayıt listesi boşsa
   * dosya defterden düşer. `yayımlansın` yanlış verildiğinde çizim ertelenir ve
   * çağıran taraf turu bitirdiğinde `yayımla` işlevini bir kez çağırır.
   */
  yaz(dosya: string, kayitlar: readonly YuzeyKaydi[], yayımlansın = true): void {
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

  /** Defteri tümüyle boşaltır — denetim kapatıldığında üç yüzey birlikte susar. */
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
   * Defterin bugün PANELDE görünen içeriğini hesaplar; çizim yapmaz ve sayacı
   * artırmaz. Gerçek VS Code koşumundaki nöbet iki yeni yüzeyin içeriğini bu
   * salt-okunur kapıdan ölçer.
   */
  gorunenler(): YuzeyDagilimi {
    const kapsamdakiler: YuzeyKaydi[] = [];
    for (const [dosya, kayitlar] of this.kayitlar) {
      if (this.kapsamda(dosya)) kapsamdakiler.push(...kayitlar);
    }
    return yuzeyeAyir(kapsamdakiler);
  }

  /**
   * Defterin bugünkü içeriğini kapsam süzgecinden geçirip iki yüzeye basar ve
   * yayın sayacını bir artırır.
   */
  yayımla(): void {
    const gorunen = this.gorunenler();
    this.sayac += 1;
    this.yayinKapisi(gorunen);
  }
}

/**
 * Bir dağıtımın sözleşmeye uyup uymadığını ölçer ve bozulan sözleşmeleri
 * cümleyle döndürür. Boş liste "dağıtım temizdir" demektir. Üç şeyi ölçer:
 * kaydın sayısı korunmuş mu, aynı kayıt iki yüzeye birden gitmiş mi, ve her
 * kayıt kendi doğasının yüzeyinde mi.
 */
export function dagitimKusurlari(
  girdi: readonly YuzeyKaydi[],
  dagilim: YuzeyDagilimi,
): string[] {
  const kusurlar: string[] = [];
  for (const kayit of girdi) {
    const kanonik = YENI_TANI_INDEKS.get(kayit.tani.kod);
    if (kanonik && kayit.tani.duzey !== kanonik.kademe) {
      kusurlar.push(
        `"${kayit.tani.kod}" yüzeyde ${kayit.tani.duzey} düzeyinde, sicilde ${kanonik.kademe}; ` +
        "sunum kanonik düzeyi yeniden derecelendirmiştir.",
      );
    }
  }
  const cikti = [
    ...dagilim.problems.map((k) => ({ k, yuzey: "problems" as SunumYuzeyi })),
    ...dagilim.hatırlatıcılar.map((k) => ({ k, yuzey: "hatırlatıcılar" as SunumYuzeyi })),
    ...dagilim.bildirimler.map((k) => ({ k, yuzey: "bildirimler" as SunumYuzeyi })),
  ];
  if (cikti.length !== girdi.length) {
    kusurlar.push(
      `Yayına giren kayıt sayısı ${girdi.length}, yüzeylerden çıkan kayıt sayısı ${cikti.length}; ` +
      "bir kayıt ya düşmüş ya da iki kez yayınlanmış.",
    );
  }
  const gorulen = new Set<YuzeyKaydi>();
  for (const { k, yuzey } of cikti) {
    if (gorulen.has(k)) {
      kusurlar.push(`"${k.tani.kod}" kaydı birden çok yüzeyde birden görünüyor; çift yayın vardır.`);
    }
    gorulen.add(k);
    const beklenen = kaydinYuzeyi(k);
    if (yuzey !== beklenen) {
      kusurlar.push(
        `"${k.tani.kod}" kaydı ${yuzey} yüzeyinde gösterildi, oysa doğası gereği ${beklenen} yüzeyine aittir.`,
      );
    }
  }
  for (const k of girdi) {
    if (!gorulen.has(k)) kusurlar.push(`"${k.tani.kod}" kaydı hiçbir yüzeye ulaşmadı; kayıp yayın vardır.`);
  }
  return kusurlar;
}

// ── 📊 DURUM ÇUBUĞU GİRDİLERİ (VIT-GRAF-A13 · SAF) ─────────────────────────
//
//   Girdi çizelgesi vscode kabuğu İSTEMEZ ve bu bilinçlidir: nöbet onu gerçekten
//   koşturabilsin diye saf çekirdekte yaşar. Kabuk (durum-cubugu.ts) yalnız bu
//   çizelgeyi editör girdilerine çevirir ve hiçbir karar vermez.

/** Sayıları okunacak dört kaynak. Modül bunları ÇAĞIRIR, kopyalamaz. */
export interface SayacKaynagi {
  /** Motorun tanı koleksiyonundaki hata sayısı. */
  readonly hata: () => number;
  /** Motorun tanı koleksiyonundaki uyarı sayısı. */
  readonly uyarı: () => number;
  /** Gözlemler panelindeki kayıt sayısı. */
  readonly gözlem: () => number;
  /** Hatırlatıcılar panelindeki kayıt sayısı. */
  readonly hatırlatıcı: () => number;
  /**
   * Fikirler panelindeki kayıt sayısı (VIT-GRAF-A16). Fikir hanesi Hatırlatıcılar
   * panelinin içinde yaşadığı sürece durum çubuğunda hiç görünmüyordu, çünkü
   * oradaki girdinin adı "Hatırlatıcılar"dır ve o etiketin altına sessizce
   * ikinci bir kavramın sayısını eklemek kullanıcıya açıklamasız büyüyen bir
   * sayı gösterirdi. Hane kendi paneline taşınınca sayı da kendi adıyla
   * konuşabilir hâle geldi.
   */
  readonly fikir: () => number;
  /** Onaylar panelindeki bekleyen kapı sayısı. */
  readonly kapı: () => number;
}

/** Tek bir durum çubuğu girdisinin tarifi. */
interface Girdi {
  readonly simge: string;
  /** Metin kataloğundaki yüzey anahtarı. Katalog kabukta okunur; saf çekirdek
   *  ona bağımlı olmaz, yalnız anahtarın kendisini taşır. */
  readonly metin: "sorunlar" | "gözlemler" | "hatırlatıcılar" | "fikirler" | "postaKutusu";
  readonly komut: string;
  readonly say: (k: SayacKaynagi) => number;
}

/**
 * Girdiler SOLDAN SAĞA aciliyet sırasındadır: düzeltme isteyen sorun önce,
 * karar bekleyen kapı sonra, yalnız haber veren gözlem en sonda. Sıra bir
 * tercih değil, yüzeylerin doğasının sırasıdır (YUZ-3.3).
 *
 * FİKİR GİRDİSİ HATIRLATICI İLE GÖZLEM ARASINDA DURUR (VIT-GRAF-A16). Gerekçe
 * aciliyet ekseninin kendisidir: Hatırlatıcı kullanıcının verdiği bir sözdür ve
 * bir gün dönüş bekler, Fikir hiçbir söz vermez, Gözlem ise kullanıcının değil
 * motorun cümlesidir. Kullanıcının kendi yazdığı iki hane bu yüzden yan yana
 * durur ve motorun haber satırı en sonda kalır.
 */
export const DURUM_CUBUGU_GIRDILERI: readonly Girdi[] = [
  // ⚠️ HATA VE UYARI GİRDİSİ YOKTUR — Founder canlı bulgusu 2026-07-29: "x ve ! iki tane var".
  //
  // VS Code hata ve uyarı sayacını ZATEN kendi durum çubuğunda basar. Onu ikinci kez
  // basmak kullanıcıya aynı sayıyı iki yerde gösterdi ve hangisinin hangisi olduğu
  // belirsizleşti. Platformun kendi yaptığı işi tekrarlamak, bu deponun tek-kaynak
  // ilkesinin arayüz karşılığıdır: aynı gerçeğin iki gösterimi zamanla ayrışır ve
  // ayrışmasa bile okuyanı yorar. Sarmal yalnız KENDİ üç yüzeyini basar; sorunları
  // platformun sayacına bırakır.
  { simge: "$(mail)",          metin: "postaKutusu",   komut: `${GORUNUS_POSTA_KUTUSU}.focus`,   say: (k) => k.kapı() },
  { simge: "$(bell)",          metin: "hatırlatıcılar", komut: `${GORUNUS_HATIRLATICILAR}.focus`, say: (k) => k.hatırlatıcı() },
  { simge: "$(lightbulb)",     metin: "fikirler",      komut: `${GORUNUS_FIKIRLER}.focus`,       say: (k) => k.fikir() },
  { simge: "$(eye)",           metin: "gözlemler",     komut: `${GORUNUS_BILDIRIMLER}.focus`,    say: (k) => k.gözlem() },
];

// ── 🔗 AYNI OLAY — panel ile durum çubuğu ayrı anlarda tazelenmez ────────────
//
//   Ölçülmüş kusur (KUSUR-DURUM-ÇUBUĞU): Onaylar değişince durum çubuğu tazelenmiyordu;
//   panelde on dört kapı varken durum çubuğunda sıfır görünebiliyordu. Bu depo
//   aynı ayrışmayı bugün üç kez ölçtü (iki simge çizelgesi · iki dışlama evreni ·
//   panel–durum çubuğu). Onarım İKİNCİ BİR SAYAÇ KURMAZ: sayı yine panelin kendi
//   defterinden türer, yalnız tazeleme AYNI olaya bağlanır.

/** Bir olay kaynağı: dinleyiciyi alır, aboneliği geri verir. */
export type OlayKaynagi = (dinleyici: () => void) => { dispose(): void };

/**
 * Bir sayaç tazelemesini bir olaya bağlar.
 *
 * Köprü SAF tutulur ki nöbet onu editör kabuğu kurmadan gerçekten koşturabilsin:
 * olay N kez atınca tazeleme N kez koşmalı, abonelik bırakıldıktan sonra bir daha
 * koşmamalıdır. Köprünün kendisi hiçbir sayı tutmaz ve hiçbir tarama yapmaz.
 */
export function sayaclariOlayaBagla(
  olay: OlayKaynagi, tazele: () => void,
): { dispose(): void } {
  return olay(() => { tazele(); });
}

/**
 * 🍎 MEYVE KÖKLERİ — beyan edilen bir teslim yolunun aranacağı kök listesi.
 *
 * ÖLÇÜLMÜŞ KUSUR (2026-07-29 · bağımsız denetim): meyve kapısı kökünü CANLI
 * editörden türetiyordu, oysa grafın hangi varlığı gösterdiğini söyleyen kaynak
 * YAPIŞKAN odaktır ve köksüz dosyada bilinçle değişmez. İki kapı aynı soruya iki
 * ayrı bağlamdan cevap veriyordu. Sonucu ölçüldü: varlık kökü listede olduğunda
 * 454 beyanın 449'u bulunuyor, listede yalnız çalışma alanı klasörü kaldığında
 * 454'ünün TAMAMI "diskte yok" ilan ediliyordu — çünkü depo kökünde
 * `*_anadizin.sar` yoktur. Graf beyan ile gerçeğin farkını TERSİNE gösteriyordu.
 *
 * SIRA ANLAM TAŞIR: yapışkan odak önce gelir, çünkü graf onu çizer. Canlı editör
 * kökü ikincidir ve odak kapalıyken tek ipucudur. Çalışma alanı klasörleri en
 * sonda durur ve yalnız son çare olarak denenir.
 *
 * Bu fonksiyon SAF tutulur ki nöbeti kapıyı taklit etmek zorunda kalmasın; kusur
 * tam olarak kapının kendisinin hiç sınanmamasından doğmuştu.
 */
export function meyveKokleri(
  yapiskanOdak: string | undefined,
  aktifDosyaKoku: string | undefined,
  calismaAlaniKlasorleri: readonly string[],
): string[] {
  const sirali = [yapiskanOdak, aktifDosyaKoku, ...calismaAlaniKlasorleri];
  const gorulen = new Set<string>();
  const kokler: string[] = [];
  for (const k of sirali) {
    if (!k || gorulen.has(k)) continue;   // yinelenen kök iki kez denenmez
    gorulen.add(k);
    kokler.push(k);
  }
  return kokler;
}

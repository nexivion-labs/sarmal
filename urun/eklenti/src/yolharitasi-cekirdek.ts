// ═══════════════════════════════════════════════════════════════════════════
// yolharitasi-cekirdek.ts — 🪆 VARLIK KÜMESİ ÇEKİRDEĞİ (EKL-F7-A09)
//
//   Founder hükmü (2026-08-24): yol haritasında varlıklar birbirini kapsayan
//   kümeler gibi görünür — kökte yalnız kapsayıcı durur, kapsananlar onun
//   altına iner. Bu dosya o ilişkinin vscode'suz saf çekirdeğidir; panel
//   (yolharitasi.ts) yalnız buradan okur ve birim nöbeti bu dosyayı sınar
//   (yolharitasi-hiyerarsi.test.ts). Dosya AİDİYET çözümüne dokunmaz: bir
//   dosyanın hangi varlığa ait olduğu yukarı yürüme ile (varlikBul) bulunur,
//   burada yalnız varlıkların birbirini kapsaması modellenir.
//
//   PRF-TA-A03 ile dosya büyüdü: panelin plan ögelerini toplaması ve varlık
//   köklerini kurması da buraya indi (aşağıdaki üçüncü bölüm). Modül vscode'u ne
//   çalışma zamanında ne de tip olarak ithal eder; kimlik türü dışarıdan gelir.
// ═══════════════════════════════════════════════════════════════════════════

import type { Dugum, Param, Program } from "../../cekirdek/src/sozdizim.ts";
import { durumTuret } from "../../cekirdek/src/durum.ts";   // YUZ-4: Adım sayaçları kanonik türetmeden
import type { Durum } from "./yol-dekor.ts";                // tip-yalnız ithal: çalışma zamanında iz bırakmaz
import { basename, dirname } from "node:path";

/**
 * Bir yol, verilen kökün KAPSAMINDA mı? Kökün kendisi de kapsama dâhildir.
 *
 * Sınır klasör ayracıdır ve bu bilerek böyledir: çıplak `startsWith` kullanılsa
 * "…-arsiv" gibi ad benzerliği taşıyan kardeş bir kök yanlışlıkla kapsanan
 * sayılırdı. Yol ayırıcıları karşılaştırma öncesinde eşitlenir ve sondaki ayırıcı
 * düşer; aksi hâlde aynı dizin iki farklı yazımla iki farklı kök sayılırdı.
 *
 * BU İŞLEV KAPSAMA İLİŞKİSİNİN TEK EVİDİR. Yol haritasındaki varlık kümeleri de,
 * panellerin aktif varlık süzgeci de (eklenti.panelDeGorunur) buradan okur.
 * İkinci bir kapsama kuralı yazılmaz: iki kural olsaydı biri sessizce bayatlar ve
 * yol haritası bir varlığı çatının altında gösterirken paneller onu gizlerdi.
 */
export function kapsamIcinde(yol: string, ustKok: string): boolean {
  const duzle = (y: string): string => y.replace(/\\/g, "/").replace(/\/+$/, "");
  const k = duzle(yol);
  const u = duzle(ustKok);
  return k === u || k.startsWith(`${u}/`);
}


/** Her varlığı, kök dizinini önek olarak kapsayan EN DERİN diğer varlığa
 *  bağlar; üstü olmayan varlık küme köküdür. */
export function varlikUstleri<T extends { kokDizin: string }>(varliklar: readonly T[]): Map<T, T | undefined> {
  const usteBagla = new Map<T, T | undefined>();
  for (const v of varliklar) {
    let ust: T | undefined;
    for (const aday of varliklar) {
      if (aday === v || aday.kokDizin === v.kokDizin) continue;
      if (!kapsamIcinde(v.kokDizin, aday.kokDizin)) continue;
      if (!ust || aday.kokDizin.length > ust.kokDizin.length) ust = aday;
    }
    usteBagla.set(v, ust);
  }
  return usteBagla;
}

/** Varlık satırının simgesi tipine göre ayrışır (Founder 2026-08-25): kapsayan
 *  çalışma alanı İSTASYONDUR, kapsanan proje ile uygulama SEFERDİR — tren
 *  dilinde lokomotifler istasyonun çatısı altında yaşar. */
export function varlikSimgesi(tip: string): "istasyon" | "sefer" {
  return tip === "ÇalışmaAlanı" ? "istasyon" : "sefer";
}

/** Bir dosya yolunun yaşadığı EN DERİN varlık — iç içe köklerde ilk eşleşen
 *  değil en uzun önek kazanır; aktiflik nabzı yanlış kümeye vurmaz. */
export function enDerinVarlik<T extends { kokDizin: string }>(varliklar: readonly T[], yol: string): T | undefined {
  let secim: T | undefined;
  for (const v of varliklar) {
    if (!kapsamIcinde(yol, v.kokDizin)) continue;
    if (!secim || v.kokDizin.length > secim.kokDizin.length) secim = v;
  }
  return secim;
}

// ── ⚡ PRF-A06: KENAR YAPISI İMZASI VE TOPOLOJİK SIRA BELLEĞİ ────────────────
//
//   Ölçülmüş kusur (2026-08-29, bu Adımın ölçüm merceği): panel tazelemesi her
//   turda `topolojikSira` işlevini bütün grafa yeniden koşturuyordu. İşlevin
//   maliyeti düğüm sayısıyla karesel büyür, çünkü sırada bir sonraki düğümü
//   seçen yardımcısı her adımda bütün anahtar listesini yeniden kurup
//   sıralamaktadır. Ölçüm şudur: sarmal kökünde bin üç yüz altmış iki düğüm için
//   üç yüz yetmiş altı milisaniye, dört projeyi kapsayan çatı kökünde iki bin
//   dokuz yüz otuz iki düğüm için iki bin doksan üç milisaniye. Bu süre, tur
//   koşarken eklenti sürecinin bölünmeden bloke olduğu süredir ve Founder'ın
//   yazarken duyduğu takılmanın ölçülmüş kaynağıdır.
//
//   Onarımın dayanağı şudur: sıra, kenar yapısının SAF bir işlevidir. Bir `.sar`
//   kaydının büyük çoğunluğu düz yazıya (`ne:`, `koşu:`, `rapor:`) ya da duruma
//   dokunur ve kenar yapısına hiç dokunmaz; böyle bir turda önceki sıra hâlâ
//   birebir doğrudur ve yeniden hesaplanması saf israftır. İmza kenar yapısının
//   kanonik özetidir ve iki milisaniyenin altında kurulur; imza değişmediyse
//   hesap hiç koşmaz, değiştiyse eskisi gibi tam hesap koşar. Böylece hiçbir
//   turda bayat sıra gösterilmez ve kenar değiştiren turda gerileme olmaz.
//
//   Motorun kendisine (cekirdek/dag.ts) DOKUNULMAMIŞTIR: bu Adımın sınırı
//   çekirdeği artımlı hâle getirmeyi dışarıda bırakır. Karesel maliyet orada
//   durmaya devam eder ve ayrı bir Adımın konusudur; burada yalnız o maliyetin
//   kaç kez ödendiği düşürülür.

/** İmzanın okuduğu en dar düğüm yüzü — çekirdeğin `Dag` tipine bağlanmadan
 *  yapısal olarak eşleşir, böylece çekirdek imzası değişse de bu dosya
 *  vscode'suz ve motor-bağımsız kalır. */
export interface KenarliDugum {
  readonly oncekiler: readonly string[];
  readonly sonrakiler: readonly string[];
}

/**
 * Kenar yapısının kanonik özeti — topolojik sıranın ve etki kapanışının
 * bağlı olduğu TEK girdi.
 *
 * Özet, düğüm anahtarlarına göre SIRALANIR: `dagKur` haritasını dosya keşif
 * sırasıyla kurar ve aynı graf iki turda farklı ekleme sırasıyla doğabilir.
 * Sıralama olmasaydı yapı hiç değişmediği hâlde imza değişir, önbellek ıskalar
 * ve kazanç sessizce kaybolurdu. Kenar listeleri de sıralanır: aynı gerekçe
 * onlar için de geçerlidir.
 *
 * Ayraçlar (`<`, `>`, `;`) kod ile kenar listesi arasındaki sınırı belirsiz
 * bırakmaz; ayraçsız birleştirmede iki ayrı grafın aynı dizeye çökmesi
 * mümkündür ve o durumda değişen bir yapı değişmemiş sayılırdı.
 */
export function grafImzasi(dugumler: ReadonlyMap<string, KenarliDugum>): string {
  const parcalar: string[] = [];
  for (const kod of [...dugumler.keys()].sort()) {
    const d = dugumler.get(kod)!;
    parcalar.push(kod, "<", [...d.oncekiler].sort().join(","),
                  ">", [...d.sonrakiler].sort().join(","), ";");
  }
  return parcalar.join("");
}

/**
 * Topolojik sıra belleği: aynı kenar yapısı için hesabı bir kez koşar.
 *
 * Bellek YALNIZ imzaya bakar ve başka hiçbir şeye bakmaz; bu yüzden bayat sıra
 * döndürmesi imkânsızdır — yapı değiştiği anda imza da değişir ve hesap koşar.
 * `yenidenHesaplandi` alanı nöbetin ölçtüğü kanıttır: hesabın koşup koşmadığı
 * süre ölçümüne değil bu bayrağa bakılarak sınanır, çünkü süre ölçümü makinenin
 * anlık yüküne göre dalgalanır ve nöbeti kırılgan yapardı.
 */
export class SiraBellegi {
  private imza: string | undefined;
  private sira: readonly string[] = [];

  al(imza: string, hesapla: () => readonly string[]): { sira: readonly string[]; yenidenHesaplandi: boolean } {
    if (this.imza === imza) return { sira: this.sira, yenidenHesaplandi: false };
    this.imza = imza;
    this.sira = hesapla();
    return { sira: this.sira, yenidenHesaplandi: true };
  }

  /** Belleği boşaltır — bir sonraki istek hesabı koşturur. */
  unut(): void { this.imza = undefined; this.sira = []; }
}

// ── 🌳 PRF-TA-A03: PLAN ÖĞELERİNİN TOPLANMASI VE VARLIK KURULUMU ─────────────
//
//   ÖLÇÜLMÜŞ KUSUR (2026-08-30 · SRN-IDE-KASMA-SOL-KOSUSU · OZK-12): yol
//   haritası paneli kendi ayrı taramasını koşturuyordu. Tur başına iki dosya
//   araması yapıyor, taranan her dosya için bir belge açma çağrısı gönderiyor ve
//   denetim turunun ZATEN kurduğu ağacın ikizini yeniden kuruyordu; kanalda
//   panel turu yirmi bin dokuz milisaniye ölçüldü. Panelin tek veri kaynağı
//   bundan sonra turun yayınladığı görüntüdür (tur-goruntusu.ts).
//
//   Bu bölüm o kurulumun SAF yarısıdır ve editör kabuğu tanımaz. Buraya
//   çekilmesinin gerekçesi ölçülebilirliktir: eski yol (dosya araması ile
//   ayrıştırma) ile yeni yolun (görüntüden) AYNI kod kümesini ve aynı sayaçları
//   verdiği ancak iki yolun ortak hesabı kabuktan ayrıldığında sınanabilir.
//   Kimlik türü dışarıdan gelir (`K`): panel gerçek `vscode.Uri` taşır, çünkü
//   tanı yayını ile satıra atlama dosyayı ona göre adresler; nöbet düz yol
//   dizesi taşır ve host istemez. Çekirdek kimliği ne kurar ne okur, yalnız
//   taşır — bu yüzden vscode'suz kalır (tur-belgesi.ts emsalinin ikizi).

/** Panelin ağaca bastığı plan tipleri — kapsayıcı kademeler ile Adım. */
export const PLAN_TIPLERI: ReadonlySet<string> = new Set([
  "Blok", "Faz", "Katman", "AltKatman", "Adım",
]);

/** Varlık girişinin kök düğüm tipleri (MIM-1: panel kökü gerçek varlıktır). */
export const VARLIK_TIPLERI: ReadonlySet<string> = new Set([
  "ÇalışmaAlanı", "Proje", "Uygulama",
]);

/**
 * Bir alanın değeri. Alan HEM parametre HEM gövde özelliği olarak yazılabilir
 * (motorun `alanDeger` dersi); yalnız parametreye bakan bir okuma, durumunu
 * gövdesinde bildiren Adımı panelde yanlış rozetliyordu.
 */
export function planAlani(d: Dugum, ad: string): Param | undefined {
  return d.parametreler.find((p) => p.ad === ad) ?? d.ozellikler.find((p) => p.ad === ad);
}

/** Panelin plan satırı. Kimlik (`dosya`) türü dışarıdan gelir; çekirdek onu taşır. */
export interface PlanOgesi<K> {
  tur: "oge";
  tip: string;                 // Blok | Faz | Katman | AltKatman | Adım
  kod: string;
  ad?: string;                 // insan yüzü; yoksa etiket koda düşer
  ne: string;
  durum: Durum;                // Adım için dosyadan; kapsayıcıda türetilir
  dosya: K;
  satir: number;               // düğüm başlangıcı (durum yazıcısı buradan arar)
  durumSatir?: number;         // mevcut durum DEĞERİNİN konumu (varsa)
  durumSutun?: number;
  durumUzunluk?: number;
  cocuklar: PlanOgesi<K>[];
  tamam: number;               // türetilmiş sayaç (Adım: 0|1)
  toplam: number;
  gelistirmede: number;
  bloklu: number;
  dugum: Dugum;                // AST düğümü — koni kartı TEK kaynaktan çıkarır
  kabulSayisi: number;
  hedefTarih?: string;
  cagirlar?: string[];         // gövdedeki `çağır KOD` hedefleri
}

/**
 * Bir programın plan ögelerini süzer: kök Blok ya da Faz düğümleri ve onların
 * altındaki plan kademeleri. Sayaçlar kanonik `durumTuret` çıktısından gelir ki
 * panelde üçüncü bir durum tanımı doğmasın (YUZ-4).
 */
export function ogeleriTopla<K>(bildirimler: readonly Dugum[], dosya: K): PlanOgesi<K>[] {
  const kokler: PlanOgesi<K>[] = [];
  const yap = (d: Dugum): PlanOgesi<K> => {
    const durumP = planAlani(d, "durum");
    const durum = (durumP?.deger.metin as Durum) || "beklemede";
    const kabulP = [...d.parametreler, ...d.ozellikler].find((p) => p.ad === "kabul");
    const oge: PlanOgesi<K> = {
      tur: "oge",
      tip: d.ad,
      kod: planAlani(d, "kod")?.deger.metin ?? d.ad,
      ad: planAlani(d, "ad")?.deger.metin,
      ne: planAlani(d, "ne")?.deger.metin ?? "",
      durum,
      dosya,
      satir: d.satir,
      durumSatir: durumP?.deger.satir,
      durumSutun: durumP?.deger.sutun,
      durumUzunluk: durumP?.deger.metin?.length,
      cocuklar: [],
      tamam: 0,
      toplam: 0,
      gelistirmede: 0,
      bloklu: 0,
      dugum: d,
      kabulSayisi: kabulP ? (kabulP.deger.tur === "liste" ? (kabulP.deger.ogeler?.length ?? 0) : 1) : 0,
      hedefTarih: planAlani(d, "hedefTarih")?.deger.metin,
      cagirlar: d.cocuklar.filter((c) => c.tur === "çağır").map((c) => c.ad),
    };
    for (const c of d.cocuklar) if (PLAN_TIPLERI.has(c.ad)) oge.cocuklar.push(yap(c));
    if (d.ad === "Adım") {
      const t = durumTuret([durum]);
      oge.toplam = t.toplam; oge.tamam = t.tamam;
      oge.gelistirmede = t.gelistirmede; oge.bloklu = t.bloklu;
    } else {
      for (const c of oge.cocuklar) {
        oge.tamam += c.tamam; oge.toplam += c.toplam;
        oge.gelistirmede += c.gelistirmede; oge.bloklu += c.bloklu;
      }
      // Kapsayıcının KENDİ `durum: bloklu` beyanı sayaçtan kaçamaz; bloklu bir
      // kapsayıcı rozetsiz kalırsa kullanıcı engeli hiç görmez.
      if (durum === "bloklu") oge.bloklu += 1;
    }
    return oge;
  };
  const gez = (d: Dugum): void => {
    // Kök Blok VEYA Faz olabilir: Faz zaman eksenidir ve Blok'u sarar; alt
    // kademeler `yap` içinde PLAN_TIPLERI süzgecinden geçer.
    if (d.ad === "Blok" || d.ad === "Faz") { kokler.push(yap(d)); return; }
    for (const c of d.cocuklar) gez(c);
  };
  for (const b of bildirimler) gez(b);
  return kokler;
}

/** Bir varlığın kimliği: giriş dosyasının KÖK düğümünden okunur, icat edilmez. */
export interface VarlikKimligi {
  tur: "varlık";
  tip: string;                 // ÇalışmaAlanı | Proje | Uygulama
  kod: string;
  ad: string;
  kokDizin: string;            // varlık girişinin dizini
  anaSar: string;              // varlık girişinin tam yolu ("" = giriş bulunamadı)
}

/** Panel kökü: varlık kimliği artı ona binen plan ögeleri ve türetilmiş sayaçlar. */
export interface PlanVarligi<K> extends VarlikKimligi {
  cocuklar: PlanOgesi<K>[];
  tamam: number;
  toplam: number;
  gelistirmede: number;
  bloklu: number;
}

/** Varlık girişinin ad ölçütü (DIL-1.2 göçü): yeni ad `*_anadizin.sar`, eski ad `ana.sar`. */
export function anadizinYoluMu(yol: string): boolean {
  const ad = basename(yol);
  return ad === "ana.sar" || ad.endsWith("_anadizin.sar");
}

/**
 * Taranan yol kümesinden dizin → varlık girişi haritası.
 *
 * Seçim kuralı motorun `anadizinBul` işleviyle BİREBİR aynıdır: bir dizinde
 * birden çok giriş varsa sıralamada önce gelen `*_anadizin.sar` kazanır ve eski
 * `ana.sar` yalnız yeni ad hiç yoksa seçilir. İki kural olsaydı panel ile
 * çekirdek aynı klasörü iki ayrı varlığa bağlayabilirdi.
 *
 * Harita turun KENDİ yol kümesinden kurulur; panelin ikinci bir dosya araması
 * yoktur. Bunun ölçülmüş bir sonucu vardır ve bilinçle kabul edilir: taranan
 * evrenin DIŞINDA kalan bir giriş dosyası (çalışma alanı kökünün üstündeki bir
 * anadizin gibi) panelde kök olmaz, çünkü panel yalnız gördüğü evreni anlatır.
 */
export function anadizinHaritasi(yollar: Iterable<string>): Map<string, string> {
  const harita = new Map<string, string>();
  for (const yol of yollar) {
    if (!anadizinYoluMu(yol)) continue;
    const dizin = dirname(yol);
    const eski = harita.get(dizin);
    if (eski === undefined) { harita.set(dizin, yol); continue; }
    const yeniAd = basename(yol), eskiAd = basename(eski);
    if (eskiAd === "ana.sar" && yeniAd !== "ana.sar") { harita.set(dizin, yol); continue; }
    if (eskiAd !== "ana.sar" && yeniAd !== "ana.sar" && yeniAd < eskiAd) harita.set(dizin, yol);
  }
  return harita;
}

/**
 * Varlık kimliğini giriş dosyasının AĞACINDAN okur — panel icat etmez, dili
 * aynalar (MIM-1). Kök düğüm bulunamazsa ya da alanları eksikse klasör adı
 * yeter; uydurma bir kimlik göstermek hiç göstermemekten kötüdür.
 *
 * Kimlik YALNIZ kök düğümün kendi alanlarından okunur. Eski okuma ham metinde
 * kök eşleşmesinden SONRAKİ ilk `kod:` ile `ad:` alanlarını arıyordu ve kökün
 * alanı eksikse dosyadaki başka bir düğümün alanını varlığa yazabiliyordu.
 */
export function varlikKimligi(
  program: Program | undefined, kokDizin: string, anaSar: string,
): VarlikKimligi {
  let tip = "Proje";
  let kod = basename(kokDizin);
  let ad = kod;
  const kok = program?.bildirimler.find((d) => VARLIK_TIPLERI.has(d.ad));
  if (kok) {
    tip = kok.ad;
    kod = planAlani(kok, "kod")?.deger.metin ?? kod;
    ad = planAlani(kok, "ad")?.deger.metin ?? ad;
  }
  return { tur: "varlık", tip, kod, ad, kokDizin, anaSar };
}

/** Dosyadan yukarı yürürken taranan en çok dizin sayısı (eski çözümün sınırı). */
export const VARLIK_YUKARI_SINIRI = 12;

/**
 * Bir tur ömürlü varlık çözücüsü: dosyadan yukarı yürür ve girişi olan ilk
 * dizini varlık kökü sayar. Bulunan kimlik dizin başına bir kez kurulur, çünkü
 * aynı varlığın altındaki yüzlerce dosya aynı cevabı ister.
 *
 * Çözücü tur başına yeniden kurulur; modül ömürlü bir bellek, bir varlığın
 * girişi değiştiğinde bayat kimliği sonsuza dek taşırdı.
 */
export function varlikCozucu(
  anadizinler: ReadonlyMap<string, string>,
  agacAl: (anaSar: string) => Program | undefined,
): (dosyaYolu: string) => VarlikKimligi {
  const bellek = new Map<string, VarlikKimligi>();
  return (dosyaYolu: string): VarlikKimligi => {
    let dizin = dirname(dosyaYolu);
    for (let i = 0; i < VARLIK_YUKARI_SINIRI; i++) {
      const hazir = bellek.get(dizin);
      if (hazir) return hazir;
      const anaSar = anadizinler.get(dizin);
      if (anaSar !== undefined) {
        const kimlik = varlikKimligi(agacAl(anaSar), dizin, anaSar);
        bellek.set(dizin, kimlik);
        return kimlik;
      }
      const ust = dirname(dizin);
      if (ust === dizin) break;
      dizin = ust;
    }
    const kok = dirname(dosyaYolu);
    return { tur: "varlık", tip: "Proje", kod: basename(kok), ad: basename(kok), kokDizin: kok, anaSar: "" };
  };
}

/**
 * Aidiyet çözücüsü: turun görüntüsünün EVRENİNDEKİ dosya panelle aynı çözücüyle
 * cevaplanır; evren dışı dosya (kapsam dışı, dışlanmış bir dizindeki ya da henüz
 * taranmamış bir dosya) verilen yedeğe düşer. Üyelik görüntünün YOL KÜMESİYLE
 * ölçülür, üst dizinle değil: dışlanmış iç içe bir kök (`ornek/…` altındaki kendi
 * girişini taşıyan bir bahçe) yukarı yürüyüşte dıştaki görüntü kökünü bulur ve
 * üyelik üst dizinle ölçülseydi ona bağlanırdı (PRF-TA-A03 üçüncü tur, denetçi
 * bulgusu). Kararı bu işlev verir, kabuk vermez; nöbet de burada ölçer.
 */
export function evrenCozucu(
  yollar: readonly string[],
  agacAl: (anaSar: string) => Program | undefined,
  yedek: (dosyaYolu: string) => VarlikKimligi,
): (dosyaYolu: string) => VarlikKimligi {
  const evren: ReadonlySet<string> = new Set(yollar);
  const coz = varlikCozucu(anadizinHaritasi(yollar), agacAl);
  return (dosyaYolu: string): VarlikKimligi => (evren.has(dosyaYolu) ? coz(dosyaYolu) : yedek(dosyaYolu));
}

/**
 * Plan ögelerini varlık köklerine bindirir ve sayaçları köke kabartır.
 *
 * Girişi olup Blok'u olmayan dizin de bir RAY'dır ve panelde görünür: henüz
 * blok dikilmemiş bahçe de istasyondadır (Founder 2026-07-06). Sayaçlar
 * ögelerden toplanır, dosyaya YAZILMAZ (çift kayıt yasağı — DIL-2).
 */
export function varliklariKur<K>(
  ogeler: readonly PlanOgesi<K>[],
  anadizinler: ReadonlyMap<string, string>,
  coz: (dosyaYolu: string) => VarlikKimligi,
  yolAl: (kimlik: K) => string,
): Map<string, PlanVarligi<K>> {
  const harita = new Map<string, PlanVarligi<K>>();
  const kokAl = (kimlik: VarlikKimligi): PlanVarligi<K> => {
    let v = harita.get(kimlik.kokDizin);
    if (!v) {
      v = { ...kimlik, cocuklar: [], tamam: 0, toplam: 0, gelistirmede: 0, bloklu: 0 };
      harita.set(kimlik.kokDizin, v);
    }
    return v;
  };
  for (const oge of ogeler) {
    const v = kokAl(coz(yolAl(oge.dosya)));
    v.cocuklar.push(oge);
    v.tamam += oge.tamam;
    v.toplam += oge.toplam;
    v.gelistirmede += oge.gelistirmede;
    v.bloklu += oge.bloklu;   // blokaj rozeti köke kadar tırmanır (YUZ-4)
  }
  for (const anaSar of anadizinler.values()) kokAl(coz(anaSar));
  return harita;
}

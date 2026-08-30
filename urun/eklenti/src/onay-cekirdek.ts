// ═══════════════════════════════════════════════════════════════════════════

import { ONAY_CEKIRDEK_METINLERI } from "./yuzey-metinleri.ts";
// onay-cekirdek.ts — 📬 Onay kapısı SAF çekirdeği (NTK-A08 kapanış kalemi)
//
//   Onay kuyruğunun karar mantığı vscode'suz tek yerde yaşar: bir ayrışmış
//   ağaçta hangi Adımların Founder onayı beklediğini bulur. Kural üç koşuldur:
//   ① durum açık (beklemede ya da geliştirmede) ② kabul ölçütlerinden en az
//   biri Founder onayını şart koşuyor (ONAY_DESENI imzası) ③ onay: kaydı
//   henüz yazılmamış. Konumlar 0-tabanlıdır (editör satır düzeni) — yol-dekor
//   deseni: karar saf modülde, vscode yalnız görünüm yüzeyidir. Fikstürlü
//   sınama: sinama/onay-kuyrugu.test.ts.
// ═══════════════════════════════════════════════════════════════════════════

import type { Dugum } from "../../cekirdek/src/sozdizim.ts";
import { degerBicimle } from "../../cekirdek/src/deger-yaz.ts";

/** Onay kapısı imzası: kabul ölçütü Founder onayını şart koşuyor. */
export const ONAY_DESENI = /founder[^"]{0,40}onay/iu;

/** Mekanik kapı beyanının alan adı — tek yerde yaşar, iki yüzey onu okur. */
export const BEKLER_ALANI = "onayBekler";

/**
 * `onayBekler` alanının AYRIŞTIRICI KAYDI — konum tahmini burada yasaktır.
 *
 * Kayıt yalnız ayrıştırıcının bildirdiği başlangıçları taşır: alan adının
 * belirteç konumu ile değerin belirteç konumu. Değerin BİTİŞİ ayrıştırıcı
 * kaydında yoktur ve uydurulmaz; silme aralığı yazım anında kaynak metinle
 * bayt düzeyinde doğrulanarak KANITLANIR (`beklerSilmeAraligi`).
 */
export interface BeklerKaydi {
  readonly satir: number;        // alan adının satırı (0-tabanlı)
  readonly adSutun: number;      // alan adının sütunu (0-tabanlı)
  readonly degerSatir: number;   // değerin satırı (0-tabanlı)
  readonly degerSutun: number;   // değerin sütunu (0-tabanlı)
  readonly metin: string;        // ayrıştırılmış değer (şema enum'u: "founder")
}

/** Bir kapının karar bağlamı — pencere Adım satırını örttüğü için amaç ve ölçüt burada taşınır. */
export interface OnayKapisi {
  satir: number;          // Adım açılış satırı (0-tabanlı)
  kod: string;
  ne: string;             // Adım'ın amacı (320 karakterde kırpılır)
  olcut: string;          // onay isteyen kabul ölçütü (160 karakterde kırpılır)
  durumSatir: number;     // ekleme noktası: durum değerinin sonu (0-tabanlı)
  durumSutun: number;
  /**
   * `durum` değerinin AYRIŞTIRILMIŞ metni. Ekleme noktası bir HESAPTIR
   * (sütun − 1 + uzunluk) ve o hesap yalnız tırnaksız değerde doğrudur; yazıcı
   * bu metni kaynaktan geri okuyup noktayı bayt düzeyinde doğrular. Metin
   * uyuşmuyorsa yazım yapılmaz — tahmine yazmak dosyayı sessizce bozar.
   */
  durumMetin: string;
  /**
   * Kapı MEKANİK alanla beyan edilmişse o alanın ayrıştırıcı kaydı; kapı yalnız
   * kabul cümlesinden tanınmışsa yoktur. Founder hükmü (2026-08-29) bu alanın
   * `onay` yazımıyla birlikte kalkmasını şart koşar: `onayBekler` kapının HENÜZ
   * BEKLEDİĞİNİ, `onay` ise kararın VERİLDİĞİNİ söyler ve ikisi aynı düğümde
   * durursa aynı olgu iki yerden okunur (ORK-1 ihlali).
   */
  bekler?: BeklerKaydi;
}

/** Ayrışmış ağaçta onay bekleyen Adımları bulur: durum açık + kabul'de onay imzası + onay: henüz yok. */
export function onayKapilariTopla(bildirimler: readonly Dugum[]): OnayKapisi[] {
  const kapilar: OnayKapisi[] = [];

  const gez = (d: Dugum): void => {
    if (d.ad === "Adım") {
      const alan = (ad: string) =>
        d.parametreler.find((p) => p.ad === ad) ?? d.ozellikler.find((p) => p.ad === ad);
      const durum = alan("durum");
      const acik = durum?.deger.metin === "beklemede" || durum?.deger.metin === "geliştirmede";
      const kararVerilmis = alan("onay") !== undefined;
      const kabul = alan("kabul");
      const olcut = (kabul?.deger.ogeler ?? []).find((o) => o.metin && ONAY_DESENI.test(o.metin));
      // MEKANİK KAPI BEYANI (VIT-POSTA-A02 kalıcı onarımı): `onayBekler: founder`
      // alanı kapıyı şemadan bildirir ve düz metin tahmini biter. Ölçülen kusur
      // şuydu: Founder'ın şart koştuğu on kapının beşi, kabul cümlesi desene
      // uymadığı için kuyruğa hiç görünmüyordu — düz metinden kapı çıkarmak bir
      // sonraki farklı cümlede yine kaçırır. Desen yalnız geçiş dönemi yedeğidir.
      const beklerAlani = alan(BEKLER_ALANI);
      const mekanikBeyan = beklerAlani?.deger.metin === "founder";
      if (acik && !kararVerilmis && (olcut || mekanikBeyan) && durum) {
        const ne = alan("ne")?.deger.metin ?? "";
        kapilar.push({
          satir: d.satir - 1,
          kod: alan("kod")?.deger.metin ?? "?",
          ne: ne.length > 320 ? ne.slice(0, 320) + "…" : ne,
          olcut: olcut
            ? (olcut.metin!.length > 160 ? olcut.metin!.slice(0, 160) + "…" : olcut.metin!)
            : ONAY_CEKIRDEK_METINLERI.mekanikOlcut,
          durumSatir: durum.deger.satir - 1,
          durumSutun: durum.deger.sutun - 1 + (durum.deger.metin?.length ?? 0),
          durumMetin: durum.deger.metin ?? "",
          bekler: beklerAlani && beklerAlani.deger.metin !== undefined
            ? {
                satir: beklerAlani.satir - 1,
                adSutun: beklerAlani.sutun - 1,
                degerSatir: beklerAlani.deger.satir - 1,
                degerSutun: beklerAlani.deger.sutun - 1,
                metin: beklerAlani.deger.metin,
              }
            : undefined,
        });
      }
    }
    for (const c of d.cocuklar) gez(c);
  };
  for (const b of bildirimler) gez(b);
  return kapilar;
}

/**
 * Bir Adımın `onay` değerini kodla bulur.
 *
 * Doğrulama bugüne kadar yanlış soruyu soruyordu: "kapı açık kapılar arasından
 * düştü mü?" Ekleme belgenin sözdizimini bozarsa ayrıştırma da kapı da düşer ve
 * BOZUK BELGE başarı sayılırdı. Doğru soru şudur: doğru Adımda BEKLENEN onay
 * değeri var mı? Bu işlev o sorunun tek cevabıdır ve hem bellek hem disk
 * doğrulamasında aynen kullanılır.
 *
 * Aynı kod birden çok Adımda geçiyorsa `undefined` döner: belirsiz kimlikte
 * "doğrulandı" demek, yanlış Adımı doğrulamak olurdu.
 */
export function adimOnayDegeri(
  bildirimler: readonly Dugum[], kod: string,
): string | undefined {
  return adimAlanDegeri(bildirimler, kod, "onay");
}

/**
 * Bir Adımın `onayBekler` değerini kodla bulur — Founder hükmünün (2026-08-29)
 * ölçüsü budur. Karar yazıldıktan sonra bu değer TANIMSIZ olmak zorundadır;
 * hâlâ duruyorsa alan kaldırılamamış demektir ve yazım başarı bildiremez.
 */
export function adimBeklerDegeri(
  bildirimler: readonly Dugum[], kod: string,
): string | undefined {
  return adimAlanDegeri(bildirimler, kod, BEKLER_ALANI);
}

/** İki yüzeyin paylaştığı dar çekirdek: kodla bulunan TEK Adımın bir alanı. */
function adimAlanDegeri(
  bildirimler: readonly Dugum[], kod: string, aranan: string,
): string | undefined {
  const bulunanlar: (string | undefined)[] = [];
  const gez = (d: Dugum): void => {
    if (d.ad === "Adım") {
      const alan = (ad: string) =>
        d.parametreler.find((p) => p.ad === ad) ?? d.ozellikler.find((p) => p.ad === ad);
      if (alan("kod")?.deger.metin === kod) bulunanlar.push(alan(aranan)?.deger.metin);
    }
    for (const c of d.cocuklar) gez(c);
  };
  for (const b of bildirimler) gez(b);
  return bulunanlar.length === 1 ? bulunanlar[0] : undefined;
}

/**
 * Verilen kodun ağaçta KAÇ Adımda geçtiğini sayar — açık ya da kapalı fark etmez.
 *
 * Çapa tekilliğinin ölçüsü budur. `kapiCoz` yalnız AÇIK kapılar arasında sayar;
 * oysa depoda ADM ailesinin 01, 02, SINA ve X son ekli örneklerinde yinelenen
 * Adım kodları ölçülmüştür ve aynı kod kapalı bir ikizde de geçiyorsa
 * "dosya+kod" çapası artık tek bir Adımı göstermez. Belirsiz çapada yazım
 * DURUR; açık olanı seçmek de bir tahmindir ve tahmine yazmak sessiz yanlış
 * yazımın ta kendisidir. Sayım TEK BELGENİN evreninde koşar; farklı dosyadaki
 * aynı kod ayrı bir kapıdır, çünkü panel kimliği dosya+kod çiftidir ve komut
 * hedef dosyayı adıyla açar — depo-geneli tekillik bu katmanın iddiası değildir.
 */
export function adimKodAdedi(bildirimler: readonly Dugum[], kod: string): number {
  let adet = 0;
  const gez = (d: Dugum): void => {
    if (d.ad === "Adım") {
      const kodAlani = d.parametreler.find((p) => p.ad === "kod")
        ?? d.ozellikler.find((p) => p.ad === "kod");
      if (kodAlani?.deger.metin === kod) adet += 1;
    }
    for (const c of d.cocuklar) gez(c);
  };
  for (const b of bildirimler) gez(b);
  return adet;
}

// ═══════════════════════════════════════════════════════════════════════════
// 📐 EKLEME NOKTASI TAHMİN DEĞİL, KANITTIR (VIT-POSTA-A02 · Kusur 1)
//
//   Ölçüm 2026-07-30 (bağımsız denetim + bu turda yeniden koşuldu): ekleme
//   noktası `sütun − 1 + metin.uzunluk` diye hesaplanıyor ve bu yalnız
//   TIRNAKSIZ değerde doğrudur. Tırnaklı `durum: "beklemede"` değerinde
//   belirteç açılış tırnağını gösterir, metin ise tırnaksızdır; hesap iki
//   karakter erken düşer, `, onay: …` eki dizginin İÇİNE yazılır ve dosya söz
//   dizimini kaybeder (ölçülen sonuç: ayrıştırıcı "Beklenmeyen karakter"
//   hatasıyla durur, belge okunamaz olur).
//
//   Onarım noktayı DÜZELTMEYE çalışmaz — tırnak sayarak düzeltmek üçüncü bir
//   tahmindir ve kaçırılmış bir biçim yine bozar. Onarım noktayı DOĞRULAR:
//   yazılacak noktanın hemen önünde durum değerinin kendisi UTF-16 kod birimi
//   düzeyinde duruyor olmalıdır (belirteçleyici, String uzunluğu ve VS Code
//   Position.character aynı birimi konuşur — birim karışıklığı yoktur, bunu
//   bağımsız denetim ayrıca ölçtü). Durmuyorsa yazım yapılmaz, dürüst hata verilir.
//
//   İKİNCİ KAT: NORMALIZASYON NÖBETİ (bağımsız denetim bulgusu · 2026-07-30).
//   Belirteçleyici kaynağı NFC'ye çevirir ve sütunu o metinden hesaplar; oysa
//   doğrulama ile yazım HAM editör satırında koşar. NFD kaydedilmiş bir dosyada
//   (macOS'ta gerçek bir olasılık) iki metin farklı uzunluktadır, konum kayar ve
//   denetçinin kurduğu geçerli bir fikstürde kaymış nokta, satırın başka bir
//   "beklemede" dilimine denk gelerek dilim denetimini SAHTE-GEÇİRDİ: dosya önce
//   bozuldu, hata sonra geldi. Bu yüzden ham satır NFC değilse hiç yazılmaz —
//   kanon zaten kaynağı NFC sayar (DIL-1), NFC olmayan satıra yazmak konum
//   sistemleri arasında çeviri yapmadan mümkün değildir ve çeviri bir tahmindir.
// ═══════════════════════════════════════════════════════════════════════════

export type EklemeDenetimi =
  | { readonly tur: "doğru" }
  | { readonly tur: "uyuşmuyor"; readonly beklenen: string; readonly bulunan: string };

/**
 * Ekleme noktasını kaynak metinle doğrular: noktanın hemen önündeki dilim,
 * ayrıştırıcının bildirdiği durum değerine BİREBİR eşit olmalıdır. Tırnaksız
 * değerde eşittir; tırnaklı ya da alışılmadık biçimli değerde eşit değildir ve
 * yazım durur. Satır metni yoksa (satır kaymış, belge kısalmış) yine durur.
 */
export function eklemeNoktasiniDogrula(
  satirMetni: string | undefined, kapi: OnayKapisi,
): EklemeDenetimi {
  return eklemeNoktasiDenetimi(satirMetni, kapi.durumMetin, kapi.durumSutun);
}

/**
 * Doğrulamanın dar çekirdeği — kapı nesnesi istemez, herhangi bir durum-sonu
 * ekleme noktası için çalışır. İKİ YÜZEY BUNU PAYLAŞIR: karar yazımı (onay:)
 * ve geribildirim yazımı (takdir.ts, tamamlandı damgasının ardına ekler).
 * Bağımsız denetim aynı kör aritmetiğin iki kopyasını ölçtü; doğrulamanın tek
 * evde yaşaması, üçüncü bir kopyanın doğrulamasız doğmasını yapısal kılmaz ama
 * en azından iki yüzeyin ayrışmasını bitirir.
 */
export function eklemeNoktasiDenetimi(
  satirMetni: string | undefined, beklenen: string, sutun: number,
): EklemeDenetimi {
  if (satirMetni === undefined || !beklenen) {
    return { tur: "uyuşmuyor", beklenen, bulunan: satirMetni === undefined ? ONAY_CEKIRDEK_METINLERI.satirYok : "" };
  }
  // Normalizasyon nöbeti: sütun NFC metinden hesaplandı, yazım ham satıra
  // gidecek. Ham satır NFC değilse iki konum sistemi ayrışmıştır ve dilim
  // denetimi kaymış noktada sahte-geçebilir (bağımsız denetim bunu geçerli bir
  // NFD fikstürüyle kanıtladı). Böyle satıra yazılmaz.
  if (satirMetni.normalize("NFC") !== satirMetni) {
    return { tur: "uyuşmuyor", beklenen, bulunan: ONAY_CEKIRDEK_METINLERI.nfcUyusmazligi };
  }
  const bulunan = satirMetni.slice(Math.max(0, sutun - beklenen.length), sutun);
  return bulunan === beklenen ? { tur: "doğru" } : { tur: "uyuşmuyor", beklenen, bulunan };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🧹 `onayBekler` ALANININ KALDIRILMASI (Founder hükmü · 2026-08-29)
//
//   HÜKÜM: onay yazıldığında `onayBekler` alanı kalkar. GEREKÇE: `onayBekler`
//   kapının HENÜZ karar beklediğini, `onay` ise kararın VERİLDİĞİNİ ilan eder;
//   ikisi aynı düğümde durursa aynı olgu iki yerden okunur ve hangisinin canlı
//   olduğu ancak ikisi karşılaştırılarak anlaşılır, oysa ORK-1 bir olgunun tek
//   yerde yazılmasını şart koşar. Kuyruk davranışta zaten doğrudur; kusur
//   KAYNAĞIN DÜRÜSTLÜĞÜNDEDİR ve sapmayı panelin kendi onay eylemi üretir.
//
//   KALDIRMA, EKLEMENİN DÜŞTÜĞÜ TUZAĞA AÇIKTIR ve aynı disiplinle kapatılır.
//   Ayrıştırıcının değer kaydında BİTİŞ konumu yoktur (`Deger` yalnız satır ve
//   sütun taşır); bitişi `sütun + metin.uzunluk` diye hesaplamak tırnaklı ya da
//   alışılmadık biçimli bir değerde iki karakter şaşar ve silme, komşu alanın
//   içine taşar. Bu yüzden bitiş HESAPLANMAZ, KANITLANIR: kaydedilen iki gerçek
//   başlangıç (ad ve değer) kaynak metinde bayt düzeyinde sınanır, değerin ham
//   biçimi (tırnaksız ya da tırnaklı) kaynağa sorulur ve ayırıcı virgül yine
//   kaynaktan okunur. Hipotezlerden hiçbiri tutmuyorsa aralık üretilmez ve
//   yazım hattı hiçbir şey yazmaz — tahmine silmek, tahmine yazmakla aynı
//   sessiz veri bozmadır.
//
//   Normalizasyon nöbeti burada da koşar: sütunlar NFC'ye normalleştirilmiş
//   metinden hesaplanır, silme ise ham editör satırına gider (bkz. yukarıdaki
//   NFD bulgusu). Ham satır NFC değilse iki konum sistemi ayrışmıştır ve silme
//   yapılmaz.
// ═══════════════════════════════════════════════════════════════════════════

/** Tek satır üstünde kanıtlanmış bir kaynak aralığı (0-tabanlı, yarı açık). */
export interface SatirAraligi {
  readonly satir: number;
  readonly baslangic: number;
  readonly bitis: number;
}

export type BeklerSilmesi =
  | { readonly tur: "yok" }
  | { readonly tur: "aralık"; readonly aralik: SatirAraligi; readonly silinecek: string }
  | { readonly tur: "doğrulanamadı"; readonly beklenen: string; readonly bulunan: string };

/** Ad içi karakter (belirteçleyicideki AD_IC ile aynı sınıf) — sınır kanıtı. */
const AD_ICI = /[\p{L}\p{N}_]/u;

/**
 * `onayBekler` alanının kaldırılacağı aralığı KANITLAR.
 *
 * Kanıt zinciri şudur ve her halkası kaynak metinle sınanır: ① alan adı,
 * ayrıştırıcının bildirdiği sütunda birebir durur; ② ad ile değer arasında
 * yalnız iki nokta ve boşluk vardır; ③ değerin ham biçimi, ayrıştırılmış
 * metinle tırnaksız ya da tırnaklı olarak birebir örtüşür ve bir ad
 * karakteriyle devam etmez; ④ alanı listeden ayıran virgül ya değerden sonra
 * ya addan önce kaynakta gerçekten durur. Halkalardan biri kopuyorsa aralık
 * üretilmez.
 */
export function beklerSilmeAraligi(
  satirMetni: string | undefined, bekler: BeklerKaydi | undefined,
): BeklerSilmesi {
  if (!bekler) return { tur: "yok" };
  const bek = (bulunan: string): BeklerSilmesi =>
    ({ tur: "doğrulanamadı", beklenen: `${BEKLER_ALANI}: ${bekler.metin}`, bulunan });

  // Çok satıra yayılmış alan bu katmanın iddiası değildir; tek satır kanıtlanır.
  if (bekler.satir !== bekler.degerSatir) return bek(ONAY_CEKIRDEK_METINLERI.cokSatirliAlan);
  if (satirMetni === undefined) return bek(ONAY_CEKIRDEK_METINLERI.satirYok);
  if (satirMetni.normalize("NFC") !== satirMetni) return bek(ONAY_CEKIRDEK_METINLERI.nfcUyusmazligi);
  if (!bekler.metin) return bek("");

  // ① Alan adı kayıtlı sütunda birebir durmalı.
  const adSonu = bekler.adSutun + BEKLER_ALANI.length;
  if (satirMetni.slice(bekler.adSutun, adSonu) !== BEKLER_ALANI) {
    return bek(satirMetni.slice(bekler.adSutun, adSonu));
  }
  // ② Ad ile değer arasında yalnız iki nokta ve boşluk olmalı.
  const ara = satirMetni.slice(adSonu, bekler.degerSutun);
  if (!/^[ \t]*:[ \t]*$/.test(ara)) return bek(ara);

  // ③ Değerin HAM biçimi kaynaktan okunur; bitiş hesaplanmaz, sınanır.
  const tirnakli = `"${bekler.metin}"`;
  let degerSonu: number;
  if (satirMetni.startsWith(tirnakli, bekler.degerSutun)) {
    degerSonu = bekler.degerSutun + tirnakli.length;
  } else if (
    satirMetni.startsWith(bekler.metin, bekler.degerSutun)
    && !AD_ICI.test(satirMetni[bekler.degerSutun + bekler.metin.length] ?? "")
  ) {
    degerSonu = bekler.degerSutun + bekler.metin.length;
  } else {
    return bek(satirMetni.slice(bekler.degerSutun, bekler.degerSutun + tirnakli.length));
  }

  // ④ Ayırıcı virgül: önce değerden SONRAKİNE, yoksa addan ÖNCEKİNE bakılır.
  //    Alan listeden çıkarken yanında TEK ayırıcı götürür; ikisini birden
  //    götürmek komşu alanları birleştirir, hiçbirini götürmemek çift virgül
  //    bırakır ve dosya ayrıştırılamaz olur.
  let baslangic = bekler.adSutun;
  let bitis = degerSonu;
  const sonraki = /^[ \t]*,[ \t]*/.exec(satirMetni.slice(degerSonu));
  if (sonraki) {
    bitis = degerSonu + sonraki[0].length;
    // Alan satırın kuyruğundaysa geride boşluk artığı kalmasın: silme satır
    // sonuna kadar uzar ve alandan önceki ayırıcı boşluk da yutulur.
    if (satirMetni.slice(bitis).trim() === "") {
      bitis = satirMetni.length;
      const onceki = /[ \t]+$/.exec(satirMetni.slice(0, bekler.adSutun));
      if (onceki) baslangic = bekler.adSutun - onceki[0].length;
    }
  } else {
    const onceki = /,[ \t]*$/.exec(satirMetni.slice(0, bekler.adSutun));
    if (!onceki) return bek(ONAY_CEKIRDEK_METINLERI.ayiriciYok);
    baslangic = bekler.adSutun - onceki[0].length;
  }
  return {
    tur: "aralık",
    aralik: { satir: bekler.satir, baslangic, bitis },
    silinecek: satirMetni.slice(baslangic, bitis),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 📬 POSTA KUTUSU VERİ MODELİ (VIT-POSTA-A01 · KOD-POSTA-PANEL'in saf yarısı)
//
//   Panelin ağacı burada kurulur: hangi kapı hangi dosyanın altında yaşar, kaç
//   kapı bekliyor, iki yerleşim aynı mı. Model BU DOSYADA yaşar çünkü vscode
//   istemeyen tek onay modülü budur; nöbet (sinama/posta-kutusu.test.ts) editör
//   kabuğu kurmadan gerçek davranışı koşturabilsin diye saf kalması şarttır.
//   Panel sağlayıcısı (posta-kutusu.ts) yalnız bu modelin çıktısını editör
//   kabuğuna çevirir ve hiçbir karar vermez.
//
//   DEFTER TEK KAYNAKTAN DOLAR. Kapı listesini üreten tek göz onay-tarayici.ts
//   modülüdür (KOD-ONAY-TARAYICI); defter yalnız o gözün gördüğünü tutar. Tam
//   tarama defteri toptan tazeler, tek belge düzenlemesi yalnız kendi satırını
//   değiştirir — bir tuş vuruşunda öteki dosyaların kapıları kaybolmaz.
// ═══════════════════════════════════════════════════════════════════════════

/** Panelde tek bir satır: hangi dosyanın hangi kapısı. */
export interface KapiKaydi {
  readonly dosya: string;
  readonly kapi: OnayKapisi;
}

/** Bir dosyanın altında toplanan kapılar — ağacın üst kademesi. */
export interface DosyaKumesi {
  readonly dosya: string;
  readonly dosyaAdi: string;
  readonly kayitlar: readonly KapiKaydi[];
}

/** Yolun son parçası — hem '/' hem '\' ayracı tanınır. */
export function dosyaAdiniAl(dosya: string): string {
  const kesim = Math.max(dosya.lastIndexOf("/"), dosya.lastIndexOf("\\"));
  return kesim >= 0 ? dosya.slice(kesim + 1) : dosya;
}

/**
 * Kapıları dosyaya göre gruplar. Dosyalar insan adına göre Türkçe sırayla,
 * bir dosyanın kapıları da kaynak satırına göre dizilir: panelde okunan sıra
 * dosyada okunan sırayla aynıdır. Hiçbir kayıt elenmez.
 */
export function dosyayaGrupla(kayitlar: readonly KapiKaydi[]): DosyaKumesi[] {
  const harita = new Map<string, KapiKaydi[]>();
  for (const kayit of kayitlar) {
    const liste = harita.get(kayit.dosya);
    if (liste) liste.push(kayit);
    else harita.set(kayit.dosya, [kayit]);
  }
  return [...harita.entries()]
    .map(([dosya, liste]) => ({
      dosya,
      dosyaAdi: dosyaAdiniAl(dosya),
      kayitlar: [...liste].sort((a, b) => a.kapi.satir - b.kapi.satir),
    }))
    .sort((a, b) => a.dosyaAdi.localeCompare(b.dosyaAdi, "tr") || a.dosya.localeCompare(b.dosya, "tr"));
}

/**
 * Dosya başına açık kapıları tutan defter. Panel bunun üstünde yaşar.
 *
 * HER YAZMA "DEĞİŞTİ Mİ" SORUSUNU CEVAPLAR. Yazma işlemleri içerik gerçekten
 * değiştiyse doğru döner; sağlayıcı yenileme olayını yalnız o zaman ateşler ve
 * yinelenen çizim sayısı yapısal olarak sıfır kalır. Aynı güvence Hatırlatıcılar
 * ile Bildirimler panellerinde parmak izi karşılaştırmasıyla kuruludur.
 */
export class OnayDefteri {
  private readonly defter = new Map<string, readonly OnayKapisi[]>();

  /** Bir dosyanın kapılarını yazar; liste boşsa dosya defterden düşer. */
  yaz(dosya: string, kapilar: readonly OnayKapisi[]): boolean {
    const oncekiIz = this.dosyaIzi(this.defter.get(dosya));
    if (kapilar.length) this.defter.set(dosya, [...kapilar]);
    else this.defter.delete(dosya);
    return oncekiIz !== this.dosyaIzi(this.defter.get(dosya));
  }

  /** Bir dosyayı defterden düşürür; dosya defterde varsa doğru döner. */
  sil(dosya: string): boolean {
    return this.defter.delete(dosya);
  }

  /** Defteri bir taramanın sonucuyla TOPTAN tazeler. */
  tazele(kayitlar: readonly KapiKaydi[]): boolean {
    const onceki = this.parmakIzi();
    this.defter.clear();
    for (const kume of dosyayaGrupla(kayitlar)) {
      this.defter.set(kume.dosya, kume.kayitlar.map((k) => k.kapi));
    }
    return onceki !== this.parmakIzi();
  }

  /** Defteri tümüyle boşaltır. */
  bosalt(): boolean {
    if (!this.defter.size) return false;
    this.defter.clear();
    return true;
  }

  /** Bekleyen kapı sayısı — panel başlığındaki rozet bu sayıyı gösterir. */
  get kapiSayisi(): number {
    let toplam = 0;
    for (const kapilar of this.defter.values()) toplam += kapilar.length;
    return toplam;
  }

  /** Kapısı bulunan dosya sayısı. */
  get dosyaSayisi(): number {
    return this.defter.size;
  }

  /** Defterdeki bütün kapılar, düz liste hâlinde. */
  kayitlar(): KapiKaydi[] {
    const hepsi: KapiKaydi[] = [];
    for (const [dosya, kapilar] of this.defter) {
      for (const kapi of kapilar) hepsi.push({ dosya, kapi });
    }
    return hepsi;
  }

  /** Panelin çizeceği ağaç. */
  kumeler(): DosyaKumesi[] {
    return dosyayaGrupla(this.kayitlar());
  }

  /** Görünür içeriğin kimliği — iki yerleşimin aynı olup olmadığını ölçer. */
  parmakIzi(): string {
    return [...this.defter.keys()].sort()
      .map((dosya) => `${dosya}|${this.dosyaIzi(this.defter.get(dosya))}`)
      .join(";");
  }

  private dosyaIzi(kapilar: readonly OnayKapisi[] | undefined): string {
    return (kapilar ?? []).map((k) => `${k.satir}:${k.kod}:${k.ne}:${k.olcut}`).join(",");
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🧭 ETKİN KARAR DEFTERİ (VIT-POSTA-A03 · dördüncü uygulama kalemi)
//
//   Onaylar bütün kapıların kuyruğudur; Comments iş parçacığı ise yalnız
//   SEÇİLEN tek kapının karar yüzeyidir. "Aynı anda en fazla bir iş parçacığı
//   yaşar" cümlesi bir temenni değil, bu defterin sözleşmesidir ve defter
//   vscode istemediği için nöbet onu gerçekten koşturur.
//
//   Eskiden bu iş bir `Map<anahtar, CommentThread>` ile yapılıyordu ve açılışta
//   her kapı için bir giriş açılıyordu; ölçülen sayı on bir iş parçacığıydı.
//   Defter tek yuvalıdır: ikinci kapı kurulduğunda birincinin kapatıcısı
//   ÇAĞRILIR, dolayısıyla elden çıkarmayı unutmak yapısal olarak imkânsızdır.
// ═══════════════════════════════════════════════════════════════════════════

/** Etkin karar yüzeyinin bağlı olduğu kapı. */
export interface EtkinKapi {
  readonly dosya: string;
  readonly kod: string;
  readonly satir: number;
}

export class EtkinKararDefteri {
  private kayit?: { kapi: EtkinKapi; kapat: () => void };

  /**
   * 📏 YAŞAM DÖNGÜSÜ SAYAÇLARI — asıl kazanç YARATMA sayacıdır.
   *
   * Ölçülmüş kusur (2026-08-08, bu turda): canlı yüzey sayısı üretimde
   * `olcum.canliIsParcacigi = 0` diye ATANIYORDU ve yaratma ile elden çıkarma
   * sayaçları hiç artmıyor, hiçbir nöbet tarafından da okunmuyordu. Sabite
   * bakan bir ölçü hiçbir zaman kırmızıya dönemez; "canlı iş parçacığı sayısı
   * sıfırdır" cümlesi böylece bir ölçüm değil bir temenni oluyordu.
   *
   * SAYAÇLARIN NEDEN ÜÇÜ BİRDEN GEREKLİ. VIT-POSTA-A03 ölçütü YARATMAYI
   * yasaklar ("açılışta hiçbir iş parçacığı yaratılmasın"), oysa canlı sayı bir
   * YAŞAMA ölçüsüdür ve "hiç yaratılmadı" ile "on bir tane yaratılıp toplandı"
   * durumlarını AYIRAMAZ — ikisinde de sıfırdır. Ayrımı yalnız `yaratilan`
   * verir; ölçütün gerçek nöbeti odur. `canliSayi` ise ikisinin farkı olarak
   * tutulur, böylece üç sayı birbiriyle tanım gereği tutarlı kalır ve dış yüze
   * çelişkili bir üçlü yayımlanamaz.
   *
   * DÜRÜST SINIR: fark ifadesi, defterin kendi kaydına bakan `kayit ? 1 : 0`
   * ifadesinden DAHA FAZLA sızıntı yakalamaz — `kur` her çağrıda öncekini
   * kapattığı için ikisi bu API üstünde denktir ve bu mutasyonla ölçüldü.
   * Fark biçimi, sayıların tutarlılığı için seçilmiştir; sızıntı iddiası
   * taşımaz.
   */
  private yaratilan = 0;
  private eldenCikarilan = 0;

  /** Bugüne dek yaratılan karar yüzeyi sayısı. */
  get yaratilanSayi(): number {
    return this.yaratilan;
  }

  /** Bugüne dek elden çıkarılan karar yüzeyi sayısı. */
  get eldenCikarilanSayi(): number {
    return this.eldenCikarilan;
  }

  /**
   * Bugün canlı olan karar yüzeyi sayısı — sözleşme gereği sıfır ya da bir.
   * Değer TÜRETİLİR: yaratılan eksi elden çıkarılan. Defterin kendi kaydına
   * (`kayit ? 1 : 0`) bakmaz, çünkü o ifade defter yanılsa bile daima sıfır ya
   * da bir döner ve sızıntıyı yapısal olarak gizler.
   */
  get canliSayi(): number {
    return this.yaratilan - this.eldenCikarilan;
  }

  /** Bugün açık olan kapı; hiçbiri açık değilse tanımsız. */
  get acikKapi(): EtkinKapi | undefined {
    return this.kayit?.kapi;
  }

  /**
   * Yeni kapıyı etkin yapar. Öncekinin kapatıcısı ÖNCE çağrılır: iki yüzey aynı
   * anda yaşayamaz.
   */
  kur(kapi: EtkinKapi, kapat: () => void): void {
    this.kapat();
    this.kayit = { kapi, kapat };
    this.yaratilan += 1;
  }

  /** Etkin yüzeyi kapatır; açık yüzey varsa doğru döner. */
  kapat(): boolean {
    if (!this.kayit) return false;
    this.kayit.kapat();
    this.kayit = undefined;
    this.eldenCikarilan += 1;
    return true;
  }

  /** Verilen kapı zaten açık olan kapı mı? Geçiş onayı bu ölçüye göre istenir. */
  ayniKapiMi(dosya: string, kod: string): boolean {
    return this.kayit?.kapi.dosya === dosya && this.kayit?.kapi.kod === kod;
  }

  /**
   * Bir dosyanın kapıları tazelendi. Etkin kapı o dosyadaysa ve artık yaşayan
   * kapılar arasında değilse yüzey kendiliğinden kapanır: kararı verilen kapının
   * yüzeyi açık kalamaz.
   */
  dosyaTazelendi(dosya: string, yasayanKodlar: readonly string[]): boolean {
    if (!this.kayit || this.kayit.kapi.dosya !== dosya) return false;
    if (yasayanKodlar.includes(this.kayit.kapi.kod)) return false;
    return this.kapat();
  }

  /** Dosya silindi: o dosyaya bağlı etkin yüzey elden çıkarılır. */
  dosyaSilindi(dosya: string): boolean {
    if (!this.kayit || this.kayit.kapi.dosya !== dosya) return false;
    return this.kapat();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔭 TARAMA YÖNETİMİ (VIT-POSTA-A03 · birinci uygulama kalemi)
//
//   Kapı listesinin nereden geldiğine karar veren mantık burada, saf katmanda
//   yaşar; vscode kabuğu (onay-tarayici.ts) yalnız üç işlevi sağlar. Ayrım
//   ölçülebilirlik içindir: nöbet sahte bir kabuk verip ÇAĞRI SAYAR ve "ana
//   görüntü verildiğinde sıfır dosya okundu" cümlesini gerçekten kanıtlar.
//
//   İKİ YOL VARDIR VE İKİSİ AYNI KURALI KULLANIR. Birinci yol ana tanı hattının
//   ürettiği URI–bildirim anlık görüntüsüdür; onay yüzeyi orada hazır duran
//   ağaçtan kapıları çıkarır ve hiçbir dosyaya dokunmaz. İkinci yol yalnız ana
//   hattın görüntüsü HENÜZ GELMEDİYSE koşar (PRF-TA-A03: hat susmaz, görüntü
//   gecikebilir): her kapsam içi dosya EN ÇOK BİR KEZ okunur, saf
//   ayrıştırıcıdan geçirilir ve tam ağaç paylaşımlı belge önbelleğine
//   KONULMAZ. Eskiden tek yol vardı ve o yol her dosyayı `openTextDocument`
//   ile açıp paylaşımlı önbelleğe yazıyordu; ölçülen maliyet açılışta iki yüz
//   doksan sekiz belgeydi.
// ═══════════════════════════════════════════════════════════════════════════

/** Ana tanı hattının anlık görüntüsü: dosya yolu → o dosyanın bildirimleri. */
export type ProgramGoruntusu = ReadonlyMap<string, readonly Dugum[]>;

/**
 * Tarayıcının kabuk bağımlılıkları. Üç işlevin de vscode isteyen gerçeği
 * onay-tarayici.ts dosyasındadır; nöbet aynı arayüzü sahte olarak verir ve
 * çağrıları sayar.
 */
export interface TaramaKabugu {
  /** Kapsam içindeki `.sar` yollarını bulur. Ana görüntü varken HİÇ çağrılmaz. */
  yollariBul(): Promise<readonly string[]>;
  /** Dosyayı bir kez okur — belge açmaz, paylaşımlı AST önbelleğine yazmaz. */
  metniOku(yol: string): Promise<string>;
  /** Ham metni saf ayrıştırıcıdan geçirir; sözdizimi kırıksa undefined döner. */
  bildirimleriCoz(metin: string): readonly Dugum[] | undefined;
}

/** Kapıları dosya adına, aynı dosyada kaynak satırına göre dizer. */
function kapilariSirala(kayitlar: KapiKaydi[]): KapiKaydi[] {
  return kayitlar.sort((a, b) =>
    a.dosya.localeCompare(b.dosya, "tr") || a.kapi.satir - b.kapi.satir);
}

/**
 * Çalışma alanındaki açık kapıları toplar.
 *
 * @param goruntu Ana tanı hattının anlık görüntüsü. Verilmişse kabuğun hiçbir
 *   işlevi çağrılmaz: ne dosya aranır, ne dosya okunur, ne ayrıştırma yapılır.
 *   `undefined` "ana hat görüntü üretmedi" demektir ve yedek tur koşar.
 * @param kabuk Yedek turun kullanacağı üç işlev.
 */
export async function kapilariTopla(
  goruntu: ProgramGoruntusu | undefined,
  kabuk: TaramaKabugu,
): Promise<KapiKaydi[]> {
  const bulgular: KapiKaydi[] = [];
  if (goruntu) {
    for (const [dosya, bildirimler] of goruntu) {
      for (const kapi of onayKapilariTopla(bildirimler)) bulgular.push({ dosya, kapi });
    }
    return kapilariSirala(bulgular);
  }
  const yollar = await kabuk.yollariBul();
  // Aynı yol iki kez gelirse ikinci okuma YAPILMAZ: "her dosya en çok bir kez
  // okunur" cümlesi nöbette sayılan bir sözleşmedir, iyi niyet temennisi değil.
  const okunan = new Set<string>();
  for (const yol of yollar) {
    if (okunan.has(yol)) continue;
    okunan.add(yol);
    let metin: string;
    try { metin = await kabuk.metniOku(yol); }
    catch { continue; }   // okunamayan dosya kuyruğa girmez
    const bildirimler = kabuk.bildirimleriCoz(metin);
    if (!bildirimler) continue;   // sözdizimi kırık: kapı da üretmez
    for (const kapi of onayKapilariTopla(bildirimler)) bulgular.push({ dosya: yol, kapi });
  }
  return kapilariSirala(bulgular);
}

// ═══════════════════════════════════════════════════════════════════════════
// 🕰️ BAYAT ANLIK GÖRÜNTÜ KARARA BAĞLANMIŞ KAPIYI DİRİLTEMEZ
//
//   Founder canlı bulgusu 2026-07-29 (0.9.130): "bir tane kapıyı onaylıyorum,
//   onaylanan kutucuk tekrar gelip onay istiyor." Ardından ikinci tıklamada
//   "kapı bu dosyada bulunamadı" hatası. İkinci hata bir kusur DEĞİLDİR; kanıtlı
//   yazım hattının doğru çalıştığının kanıtıdır — Adım artık `onay:` damgası
//   taşıdığı için açık kapı olmaktan çıkmıştır ve yazıcı yanlış yere yazmaktansa
//   durmuştur. Asıl kusur kapının PANELE GERİ GELMESİDİR.
//
//   ÖLÇÜLEN ZİNCİR: panel kapı listesini iki kaynaktan alır. Birincisi tek
//   dosyanın CANLI belgesidir (karar yazıldıktan hemen sonra koşar ve kapıyı
//   doğru biçimde düşürür). İkincisi ana tanı hattının ANLIK GÖRÜNTÜSÜDÜR ve o
//   görüntü tam tur başlarken üretilir. Tam tur kullanıcının kararından ÖNCE
//   başlayıp SONRA biterse, taşıdığı ağaç kararı hiç görmemiştir ve toptan
//   yerleştirme kapıyı geri koyar.
//
//   Eski kural yalnız KİRLİ belgeleri görüntünün üstüne yazıyordu. Karar
//   yazıcısı belgeyi kaydettiği için belge karardan hemen sonra TEMİZDİR;
//   dolayısıyla tam olarak korunması gereken durumda koruma devre dışı kalıyordu.
//
//   YENİ KURAL: AÇIK olan her kapsam içi belge görüntünün üstüne yazar, kirli
//   olsun olmasın. Gerekçesi tek cümledir ve genelidir — açık bir belge, diskin
//   ve görüntünün taşıdığı her şeyi zaten içerir (kaydedilmiş içerik artı
//   kaydedilmemiş düzenleme), yani hiçbir durumda anlık görüntüden BAYAT olamaz.
//   Kural kararlara özel değildir; her bayat-dirilme ailesini birlikte kapatır.
// ═══════════════════════════════════════════════════════════════════════════

/** Açık bir belgenin panele bildirdiği gerçek. */
export interface AcikBelgeKapilari {
  readonly dosya: string;
  readonly kapilar: readonly OnayKapisi[];
}

/**
 * Anlık görüntünün bulgularını AÇIK belgelerin gerçeğiyle birleştirir.
 *
 * Açık belgesi olan her dosya için görüntünün söyledikleri tümüyle ATILIR ve
 * yerine belgenin kendi kapıları konur — boş liste de meşru bir cevaptır ve
 * "bu dosyada artık açık kapı yok" demektir. Açık belgesi olmayan dosyalar
 * görüntüden aynen geçer.
 *
 * SAF: nöbet bunu editör kabuğu kurmadan koşturur ve bayat görüntüyü gerçekten
 * verir; kaynak metnine bakarak tahmin etmez.
 */
export function acikBelgeleriUstuneYaz(
  bulgular: readonly KapiKaydi[],
  acikBelgeler: readonly AcikBelgeKapilari[],
): KapiKaydi[] {
  if (!acikBelgeler.length) return [...bulgular];
  const acikYollar = new Set(acikBelgeler.map((b) => b.dosya));
  const sonuc = bulgular.filter((b) => !acikYollar.has(b.dosya));
  for (const belge of acikBelgeler) {
    for (const kapi of belge.kapilar) sonuc.push({ dosya: belge.dosya, kapi });
  }
  return sonuc;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🪪 PANEL SATIRLARININ KARARLI KİMLİĞİ (ölçülmüş Kusur 4'ün onarımı)
//
//   Ölçüm 2026-07-29: Founder bir kapı satırını açıyor, arka planda bir `.sar`
//   dosyası kaydediliyor (bu çalışma alanında `files.autoSave: afterDelay`
//   1000 ms ile AÇIKTIR), ağaç tazeleniyor ve açık satır kapanıyor. Kontrol ile
//   deney arasındaki tek fark tazelemeydi; kontrolde akış tamamlandı, deneyde
//   tıklama boşa düştü.
//
//   KÖK NEDEN VS Code 1.130.0 kaynağından okundu: `TreeItem.id` verilmezse öğe
//   tutamağı `${ataTutamağı}/${sıra}:${etiket}` biçiminde üretilir. Yani tutamak
//   hem KARDEŞ SIRASINA hem ETİKETE bağlıdır: bir kapı listeden düşünce kalan
//   satırların tutamağı kayar, bir Adımın `ne` metni düzenlenince de aynı kapı
//   yeni bir satır sanılır. Açıklık ve seçim durumu bu yüzden korunamaz.
//
//   Onarım kimliği İÇERİKTEN değil KAYNAKTAN türetir: kimlik yalnız dosya yolu,
//   kapı kodu ve satırın rolünden doğar. Etiket değişse de, kardeş sırası
//   kayşa da kimlik aynı kalır. Kimlik şeması saf çekirdektedir çünkü nöbet onu
//   editör kabuğu kurmadan gerçekten koşturabilmelidir.
// ═══════════════════════════════════════════════════════════════════════════

/** Panel ağacındaki bir satırın kaynak kimliği — görünen metinden bağımsızdır. */
export type PostaDugumu =
  | { readonly tur: "dosya"; readonly dosya: string }
  | { readonly tur: "kapı"; readonly dosya: string; readonly kod: string }
  | { readonly tur: "karar"; readonly dosya: string; readonly kod: string; readonly rol: string };

/**
 * Bir satırın kararlı kimliği.
 *
 * Dosya kimliği tam yoldan doğar; kapı kimliği tam yol ile kapı kodunun
 * çiftinden; karar satırının kimliği kapı kimliği ile kendi rolünden. Aynı kısa
 * ada sahip iki dosya bu yüzden asla aynı kimliği taşımaz ve iki ayrı dosyadaki
 * aynı kodlu kapı tek kapı sanılmaz.
 */
export function postaKimligi(dugum: PostaDugumu): string {
  if (dugum.tur === "dosya") return `posta·dosya·${dugum.dosya}`;
  const kapi = `posta·kapı·${dugum.dosya}·${dugum.kod}`;
  return dugum.tur === "kapı" ? kapi : `${kapi}·${dugum.rol}`;
}

/**
 * Bir satırın GERÇEK ebeveyni. Sağlayıcı bugüne kadar her satırı kök öğe ilan
 * ediyordu; bu, `TreeView.reveal` çağrısını kullanılamaz kılıyordu ve kod
 * merceğinin doğru kapıyı panelde göstermesi bu zincire bağlıdır.
 */
export function postaEbeveyni(dugum: PostaDugumu): PostaDugumu | undefined {
  if (dugum.tur === "dosya") return undefined;
  if (dugum.tur === "karar") return { tur: "kapı", dosya: dugum.dosya, kod: dugum.kod };
  return { tur: "dosya", dosya: dugum.dosya };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 KAPI ÇÖZÜMÜ — KARAR KODA GÖRE YAZILIR, SATIRA GÖRE DEĞİL
//
//   Ölçüm 2026-07-29 (prob 1 · P4): `kaydiIsle` kapıyı önce SATIRA göre arıyordu
//   ve iki kapılı bir dosyada `PRB-A01` istendiği hâlde `PRB-A02` onaylandı.
//   Bayat satır çapası kararı yanlış Adıma yazabiliyordu. Kardeş işlev
//   `postaKapisiAc` bunu zaten doğru yapıyordu; fark tam olarak buradaydı.
//
//   YENİ SÖZLEŞME: kod bağlayıcıdır. Satır yalnız ek doğrulama ve gezinme
//   bilgisidir; tek başına hiçbir zaman karar hedefi seçemez. Aynı dosyada aynı
//   kod birden çok kez bulunursa yazım DURUR — kimlik belirsizken hangi Adıma
//   yazılacağını tahmin etmek, sessiz yanlış yazımın ta kendisidir.
// ═══════════════════════════════════════════════════════════════════════════

export type KapiCozumu =
  | { readonly tur: "bulundu"; readonly kapi: OnayKapisi; readonly satirUyuyor: boolean }
  | { readonly tur: "yok" }
  | { readonly tur: "çoklu"; readonly adet: number };

/**
 * Belgedeki kapılar arasından hedefi KODA göre bulur.
 *
 * @param satir Panelin elindeki çapa satırı. Yalnız `satirUyuyor` bilgisini
 *   üretir; hedef seçimine hiçbir etkisi yoktur.
 */
export function kapiCoz(
  kapilar: readonly OnayKapisi[], kod: string, satir?: number,
): KapiCozumu {
  const eslesenler = kapilar.filter((k) => k.kod === kod);
  if (!eslesenler.length) return { tur: "yok" };
  if (eslesenler.length > 1) return { tur: "çoklu", adet: eslesenler.length };
  const kapi = eslesenler[0]!;
  return { tur: "bulundu", kapi, satirUyuyor: satir === undefined || kapi.satir === satir };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔒 UÇUŞ DEFTERİ — aynı kapıya iki kez yazılmaz
//
//   Hızlı çift tıklamada iki `postaKararVer` çağrısı da başlıyor ve sonuç
//   komutların zamanlamasına kalıyordu: ya ikinci çağrı kapıyı bulamıyor, ya
//   ikinci düzenleme reddediliyor, ya da aynı konuma İKİNCİ bir `onay:` alanı
//   ekleniyordu. Kusur sonucun kendisi değil, sonucun tıklama hızına
//   bırakılmasıdır. Defter dosya+kod anahtarında tek uçuş garanti eder.
// ═══════════════════════════════════════════════════════════════════════════

export class UcusDefteri {
  private readonly ucanlar = new Set<string>();

  /**
   * Dosya ile kodun birleşik anahtarı — iki ayrı dosyadaki aynı kod çakışmaz.
   *
   * AYRAÇ NUL'DUR ÇÜNKÜ HİÇBİR DOSYA YOLUNDA VE HİÇBİR KODDA GEÇEMEZ; ayracın
   * veriye karışması yapısal olarak imkânsızdır ve seçim bu yüzden doğrudur.
   *
   * ⚠️ AMA KAÇIŞ DİZİSİYLE YAZILIR, HAM BAYT OLARAK ASLA. Bu satır bir zamanlar ham
   * NUL baytı taşıyordu ve ölçülen bedeli şuydu: tek bir ham NUL, `grep`in dosyayı
   * ikili sayması için yeterlidir. Yedi yüz elli dokuz satırlık bu dosyanın TAMAMI
   * arama sonuçlarından sessizce düşüyordu; `file` komutu onu "data" diye bildiriyor
   * ve içinde bir kimlik arayan her tarama boş dönüyordu.
   *
   * Kusurun sınıfı deponun kendi dersidir: hata vermeyen, yalnız SESSİZCE eksik cevap
   * veren araç, yanlış cevap veren araçtan tehlikelidir. Kaçış dizisi çalışma zamanında
   * birebir aynı karakteri üretir, dolayısıyla davranış değişmez; değişen tek şey
   * dosyanın kendi denetim araçlarımıza görünür kalmasıdır. Bir nöbet bunu korur:
   * kaynak ağacında ham NUL taşıyan dosya bulunmaz.
   */
  static anahtar(dosya: string, kod: string): string {
    return `${dosya}\u0000${kod}`;
  }

  /** Uçuşa girer; anahtar zaten uçuyorsa yanlış döner ve ikinci çağrı işlenmez. */
  giris(dosya: string, kod: string): boolean {
    const a = UcusDefteri.anahtar(dosya, kod);
    if (this.ucanlar.has(a)) return false;
    this.ucanlar.add(a);
    return true;
  }

  /** Uçuştan çıkar. Çağrı `finally` içinde yapılır: hata da kilidi açar. */
  cikis(dosya: string, kod: string): void {
    this.ucanlar.delete(UcusDefteri.anahtar(dosya, kod));
  }

  /** Şu an uçan karar sayısı — nöbet bunu okur. */
  get ucusSayisi(): number {
    return this.ucanlar.size;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ⏸️ BİÇİM ASKISI — karar yazmak biçim işi değildir
//
//   Ölçüm 2026-07-29 (prob 5): dosya editörde kapalıyken karar bir satır
//   değiştiriyor, açıkken on satırın dokuzu değişiyordu. Fark, eklentinin kendi
//   `editor.formatOnSave` varsayılanı ile karar yazıcısının `doc.save()`
//   çağrısının kesişmesidir. Defter, yazıcının kendi kaydetmesi süresince YALNIZ
//   o belgeyi askıya alır; kullanıcının kendi kaydetmesi hiç etkilenmez.
//
//   Defter SAYAÇLIDIR: aynı belgede iç içe iki askı olursa dıştaki bittiğinde
//   içteki hâlâ sürüyorsa askı açılmaz. Sayaç olmasaydı iç içe yazımın erken
//   biteni, sürmekte olan yazımın kalkanını kaldırırdı.
// ═══════════════════════════════════════════════════════════════════════════

export class BicimAskisi {
  private readonly sayac = new Map<string, number>();

  askiyaAl(dosya: string): void {
    this.sayac.set(dosya, (this.sayac.get(dosya) ?? 0) + 1);
  }

  serbestBirak(dosya: string): void {
    const kalan = (this.sayac.get(dosya) ?? 0) - 1;
    if (kalan > 0) this.sayac.set(dosya, kalan);
    else this.sayac.delete(dosya);
  }

  askidaMi(dosya: string): boolean {
    return (this.sayac.get(dosya) ?? 0) > 0;
  }

  /** Askıda olan belge sayısı — nöbet sızıntıyı bu sayıdan görür. */
  get askiSayisi(): number {
    return this.sayac.size;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ✍️ KANITLI YAZIM İŞLEMİ — başarı üç kanıttan sonra bildirilir
//
//   Bugüne kadar `doc.save()` dönüşü hiç denetlenmiyordu ve doğrulama "kapı
//   listeden düştü mü" sorusunu soruyordu. O soru yanlış sorudur: ekleme
//   belgenin sözdizimini bozarsa ayrıştırma da kapı da düşer ve bozuk belge
//   BAŞARI sayılır. Yeni sözleşme üç kanıt ister:
//     ① `applyEdit` doğru döndü,
//     ② `save` doğru döndü,
//     ③ hedef Adımın `onay` değeri BEKLENEN metne birebir eşit — hem bellekte
//        hem de aynı dosyanın hedefli disk okumasında.
//   Bu tek dosyalık doğrulama ikinci bir çalışma alanı taraması DEĞİLDİR.
//
//   Mantık saf tutulur ve editör kabuğu dışarıdan verilir; nöbet böylece
//   `save=false`, reddedilen söz, kirli belge ve disk uyuşmazlığı yollarını
//   gerçekten koşturur — kaynak metnine bakarak değil.
// ═══════════════════════════════════════════════════════════════════════════

/** Kararın yazım isteği. Tarih ÇAĞIRANIN yerel takviminden gelir. */
export interface KararIstegi {
  readonly dosya: string;
  readonly kod: string;
  /** Panelin elindeki çapa satırı; yalnız doğrulama ve gezinme bilgisidir. */
  readonly satir: number;
  readonly damga: string;
  readonly not: string;
  readonly gun: string;
}

/** Kirli belge çatışmasında kullanıcının üç seçeneği. */
export type CatismaSecimi = "kaydet" | "kapıyaGit" | "iptal";

export type KararSonucu =
  | { readonly tur: "başarı"; readonly kod: string; readonly kayit: string }
  | { readonly tur: "uçuşta"; readonly kod: string }
  | { readonly tur: "kapıYok"; readonly kod: string }
  | { readonly tur: "kimlikÇakışması"; readonly kod: string; readonly adet: number }
  | { readonly tur: "iptal"; readonly kod: string }
  | { readonly tur: "kapıyaGit"; readonly kod: string; readonly satir: number }
  | { readonly tur: "uygulanamadı"; readonly kod: string; readonly neden: string }
  | {
      readonly tur: "kaydedilemedi"; readonly kod: string; readonly neden: string;
      readonly geriAlindi: boolean;
    }
  | {
      readonly tur: "bellekUyuşmazlığı"; readonly kod: string;
      readonly beklenen: string; readonly bulunan: string;
    }
  | {
      readonly tur: "diskUyuşmazlığı"; readonly kod: string;
      readonly beklenen: string; readonly bulunan: string;
    }
  /**
   * Belge ya da diskteki dosya AYRIŞTIRILAMIYOR. Bu, "kapı listede yok" ile aynı
   * şey DEĞİLDİR: ayrıştırma hatasında kapı listesi zaten boşalır ve eski
   * doğrulama bozulan dosya için başarı bildiriyordu. Evre nerede kırıldığını
   * söyler: yazım öncesi (hiçbir şey yazılmadı), bellek ya da disk (yazım
   * yapıldı ve dosya bozulmuş olabilir — kullanıcıya açıkça söylenir).
   */
  | {
      readonly tur: "belgeAyrıştırılamadı"; readonly kod: string;
      readonly evre: "yazımÖncesi" | "bellek" | "disk";
    }
  /** Ekleme noktası kaynak metinle doğrulanamadı; hiçbir şey yazılmadı. */
  | {
      readonly tur: "eklemeNoktasıDoğrulanamadı"; readonly kod: string;
      readonly beklenen: string; readonly bulunan: string;
    }
  /**
   * `onayBekler` alanının silme aralığı kaynakla doğrulanamadı ya da yazımdan
   * sonra alan hâlâ duruyor. Founder hükmü (2026-08-29) alanın onayla birlikte
   * kalkmasını şart koştuğu için karar YARIM yazılamaz: doğrulama yazımdan önce
   * düşerse hiçbir şey yazılmaz, sonra düşerse başarı bildirilmez.
   */
  | {
      readonly tur: "beklerAlanıKaldırılamadı"; readonly kod: string;
      readonly beklenen: string; readonly bulunan: string;
    };

/**
 * Bir onay değeri okumasının kanıtı. "Değer yok" ile "belge okunamıyor" iki ayrı
 * gerçektir ve doğrulama ikisini AYIRMAK zorundadır — ikisini tek `undefined`e
 * indirmek, bozulan dosyayı sessizce başarı sayan zincirin ilk halkasıydı.
 */
export type OnayKaniti =
  | {
      readonly tur: "değer"; readonly onay: string | undefined;
      /**
       * Aynı Adımın `onayBekler` değeri. Founder hükmünün (2026-08-29) ölçüsü
       * budur ve kanıt burada taşınır, çünkü "onay yazıldı" ile "bekleme ilanı
       * kalktı" İKİ AYRI olgudur; ikisini tek okumada sormamak, sapmayı yeniden
       * doğuran yolun ta kendisiydi.
       */
      readonly bekler?: string | undefined;
    }
  | { readonly tur: "ayrıştırılamadı" };

/**
 * Yazıcının editör kabuğu. Gerçeği onay-kuyrugu.ts bağlar; nöbet aynı arayüzü
 * sahte olarak verir ve her çıkış yolunu gerçekten koşturur.
 */
export interface YazimKabugu {
  /** Belge şu anda kaydedilmemiş kullanıcı düzenlemesi taşıyor mu? */
  kirliMi(): boolean;
  /** Kirli belge çatışmasını YALNIZ kirliyken sorar. Temiz belgede hiç çağrılmaz. */
  catismaSor(kod: string): Promise<CatismaSecimi>;
  /**
   * Belgenin O ANKİ kapıları — her çağrıda yeniden ayrıştırılmış gerçek.
   * Belge AYRIŞTIRILAMIYORSA `undefined` döner; boş liste ("hiç kapı yok") ile
   * karışamaz, çünkü ikisi kullanıcıya iki ayrı cümle söyletir.
   */
  kapilar(): readonly OnayKapisi[] | undefined;
  /** Kodun belgede kaç Adımda geçtiği (açık ya da kapalı) — çapa tekilliği ölçüsü. */
  kodluAdimSayisi(kod: string): number;
  /** Hedef satırın kaynak metni — ekleme noktası yazılmadan ÖNCE bununla doğrulanır. */
  satirMetni(satir: number): string | undefined;
  /**
   * `onay:` ekini kapının durum değerinin sonuna yazar ve — verilmişse —
   * KANITLANMIŞ aralığı siler (applyEdit). İki iş TEK düzenlemededir: karar
   * yazılıp bekleme ilanı ayrı bir turda kaldırılsaydı arada bir çökme ya da
   * reddedilen söz, düğümü tam da hükmün yasakladığı çift beyanlı hâlde
   * bırakırdı.
   */
  ekle(kapi: OnayKapisi, ek: string, silme?: SatirAraligi): Promise<boolean>;
  /** Belgeyi diske indirir; başarısız kayıtta yanlış döner. */
  kaydet(): Promise<boolean>;
  /** Kaydetme başarısızsa bellekteki düzenlemeyi güvenle geri alır. */
  ekiGeriAl(): Promise<boolean>;
  /** Bellekteki ayrıştırılmış Adımın onay kanıtı. */
  bellektekiOnay(kod: string): OnayKaniti;
  /** Aynı dosyanın HEDEFLİ disk okumasındaki onay kanıtı. */
  disktekiOnay(kod: string): Promise<OnayKaniti>;
}

/** `onay:` kaydının metni — damga, tarih ve isteğe bağlı not. Biçim DEĞİŞMEZ. */
export function onayKaydiMetni(damga: string, gun: string, not: string): string {
  return `${damga} — ${gun}${not ? ` · ${not}` : ""}`;
}

/** Adım satırına eklenen ek — motorun kendi değer biçimlendirmesiyle. */
export function onayEkiMetni(kayit: string): string {
  return `, onay: ${degerBicimle(kayit)}`;
}

/**
 * Kararın TEK yazım hattı. Sıra §6.5 sözleşmesidir ve her adım bir çıkış yolu
 * üretir; hiçbir yol sessiz değildir.
 */
export async function kararIsle(
  defter: UcusDefteri, kabuk: YazimKabugu, istek: KararIstegi,
): Promise<KararSonucu> {
  const { dosya, kod } = istek;
  // ① Aynı kapı zaten uçuyorsa ikinci çağrı hiçbir şey yazmaz.
  if (!defter.giris(dosya, kod)) return { tur: "uçuşta", kod };
  try {
    // ② Hedef YALNIZ dosya+kod ile bulunur; satır hedef seçmez. Üç bekçi vardır:
    //    belge ayrıştırılamıyorsa "kapı yok" DENMEZ (iki durum iki ayrı cümledir);
    //    açık kapılar arasında yinelenen kod yazım durdurur; kod KAPALI bir
    //    ikizde de geçiyorsa çapa yine belirsizdir ve yazım yine durur.
    const hedefCoz = (): { kapi: OnayKapisi } | { hata: KararSonucu } => {
      const belgedekiler = kabuk.kapilar();
      if (belgedekiler === undefined) {
        return { hata: { tur: "belgeAyrıştırılamadı", kod, evre: "yazımÖncesi" } };
      }
      const cozum = kapiCoz(belgedekiler, kod, istek.satir);
      if (cozum.tur === "yok") return { hata: { tur: "kapıYok", kod } };
      if (cozum.tur === "çoklu") return { hata: { tur: "kimlikÇakışması", kod, adet: cozum.adet } };
      const adet = kabuk.kodluAdimSayisi(kod);
      if (adet > 1) return { hata: { tur: "kimlikÇakışması", kod, adet } };
      return { kapi: cozum.kapi };
    };
    const ilk = hedefCoz();
    if ("hata" in ilk) return ilk.hata;

    // ③ Kirli belge çatışması YALNIZ gerçekten kirliyken sorulur. Temiz belgede
    //    bu soru hiç çıkmaz — her geçişte çıkan onay, onay olmaktan çıkar.
    if (kabuk.kirliMi()) {
      const secim = await kabuk.catismaSor(kod);
      if (secim === "iptal") return { tur: "iptal", kod };
      if (secim === "kapıyaGit") return { tur: "kapıyaGit", kod, satir: ilk.kapi.satir };
      const tasladiIndi = await kabuk.kaydet();
      if (!tasladiIndi) {
        return { tur: "kaydedilemedi", kod, neden: "taslak", geriAlindi: false };
      }
    }

    // ④ Taslak indiyse konumlar kaymış olabilir: hedef YENİDEN çözülür.
    const yeniden = hedefCoz();
    if ("hata" in yeniden) return yeniden.hata;
    const kapi = yeniden.kapi;

    // ⑤ EKLEME NOKTASI YAZILMADAN ÖNCE KAYNAKTAN DOĞRULANIR. Nokta bir hesaptır
    //    ve hesap yalnız tırnaksız değerde doğrudur; noktanın hemen önünde durum
    //    değerinin kendisi bayt düzeyinde durmuyorsa yazmak dosyayı bozar.
    //    Ölçülen zincir (2026-07-30): tırnaklı `durum:` değerinde ek dizginin
    //    içine düşüyor ve belge ayrıştırılamaz hâle geliyordu. Uymayan noktaya
    //    YAZILMAZ; tırnak sayarak "düzeltmek" üçüncü bir tahmindir ve yasaktır.
    const denetim = eklemeNoktasiniDogrula(kabuk.satirMetni(kapi.durumSatir), kapi);
    if (denetim.tur === "uyuşmuyor") {
      return {
        tur: "eklemeNoktasıDoğrulanamadı", kod,
        beklenen: denetim.beklenen, bulunan: denetim.bulunan,
      };
    }

    // ⑤b `onayBekler` ALANININ SİLME ARALIĞI DA KANITLANIR (Founder · 2026-08-29).
    //    Alan yoksa (kapı yalnız kabul cümlesinden tanınmışsa) silinecek bir şey
    //    yoktur ve yazım olduğu gibi sürer. Alan varsa aralık kaynakla bayt
    //    düzeyinde kanıtlanır; kanıtlanamıyorsa HİÇBİR ŞEY yazılmaz. Yarım yazım
    //    yasaktır, çünkü `onay` yazılıp `onayBekler` kalırsa hükmün yasakladığı
    //    çift beyan tam da panelin kendi eylemiyle yeniden doğar.
    const silme = beklerSilmeAraligi(
      kapi.bekler ? kabuk.satirMetni(kapi.bekler.satir) : undefined, kapi.bekler);
    if (silme.tur === "doğrulanamadı") {
      return {
        tur: "beklerAlanıKaldırılamadı", kod,
        beklenen: silme.beklenen, bulunan: silme.bulunan,
      };
    }

    const kayit = onayKaydiMetni(istek.damga, istek.gun, istek.not);
    // ⑥ Tek düzenleme; reddedilen söz de açık hatadır.
    //
    //    İKİ İŞLEM BİRBİRİNE DEĞEBİLİR. `onayBekler` alanı `durum` alanının hemen
    //    ardından geliyor ve listenin SON alanıysa, silme kendinden önceki
    //    virgülü alır ve o virgül tam da eklemenin yapılacağı noktada başlar.
    //    Editör aynı belgede kesişen iki düzenlemeyi reddedebilir ve sıraları da
    //    belirsizdir. Ekleme noktası bu durumda silmenin BİTİŞİNE taşınır: iki
    //    nokta arasındaki metnin tamamı zaten siliniyor, dolayısıyla üretilen
    //    belge bayt birebir aynıdır ve her iki nokta da kanıtlanmıştır.
    const araliktaMi = silme.tur === "aralık"
      && silme.aralik.satir === kapi.durumSatir
      && silme.aralik.baslangic <= kapi.durumSutun
      && kapi.durumSutun <= silme.aralik.bitis;
    const yazimKapisi = araliktaMi && silme.tur === "aralık"
      ? { ...kapi, durumSutun: silme.aralik.bitis } : kapi;
    let uygulandi: boolean;
    try {
      uygulandi = await kabuk.ekle(
        yazimKapisi, onayEkiMetni(kayit), silme.tur === "aralık" ? silme.aralik : undefined);
    }
    catch (e) { return { tur: "uygulanamadı", kod, neden: hataMetni(e) }; }
    if (!uygulandi) return { tur: "uygulanamadı", kod, neden: "reddedildi" };

    // ⑦ Kaydetme sonucu MUTLAKA doğru olmalıdır; değilse ek bellekten geri alınır.
    let kaydedildi: boolean;
    let kayitNedeni = "reddedildi";
    try { kaydedildi = await kabuk.kaydet(); }
    catch (e) { kaydedildi = false; kayitNedeni = hataMetni(e); }
    if (!kaydedildi) {
      let geriAlindi = false;
      try { geriAlindi = await kabuk.ekiGeriAl(); } catch { geriAlindi = false; }
      return { tur: "kaydedilemedi", kod, neden: kayitNedeni, geriAlindi };
    }

    // ⑧ Bellekteki değer beklenen karar metnine BİREBİR eşit olmalıdır.
    //    "Belge ayrıştırılamıyor" ile "değer uyuşmuyor" AYRI cevaplardır:
    //    birincisinde dosya bozulmuş olabilir ve kullanıcıya bu açıkça söylenir.
    //    Kabuk yine de patlarsa patlama sessiz bir komut reddine dönüşemez,
    //    uyuşmazlığa çevrilir ve kullanıcıya söylenir.
    let bellek: OnayKaniti;
    try { bellek = kabuk.bellektekiOnay(kod); }
    catch (e) {
      return { tur: "bellekUyuşmazlığı", kod, beklenen: kayit, bulunan: hataMetni(e) };
    }
    if (bellek.tur === "ayrıştırılamadı") {
      return { tur: "belgeAyrıştırılamadı", kod, evre: "bellek" };
    }
    if (bellek.onay !== kayit) {
      return { tur: "bellekUyuşmazlığı", kod, beklenen: kayit, bulunan: bellek.onay ?? "" };
    }
    if (bellek.bekler !== undefined) {
      return {
        tur: "beklerAlanıKaldırılamadı", kod,
        beklenen: ONAY_CEKIRDEK_METINLERI.beklerKalkmali,
        bulunan: `${BEKLER_ALANI}: ${bellek.bekler}`,
      };
    }

    // ⑨ Aynı dosya HEDEFLİ olarak geri okunur — ikinci bir tarama değildir.
    let disk: OnayKaniti;
    try { disk = await kabuk.disktekiOnay(kod); }
    catch (e) { return { tur: "diskUyuşmazlığı", kod, beklenen: kayit, bulunan: hataMetni(e) }; }
    if (disk.tur === "ayrıştırılamadı") {
      return { tur: "belgeAyrıştırılamadı", kod, evre: "disk" };
    }
    if (disk.onay !== kayit) {
      return { tur: "diskUyuşmazlığı", kod, beklenen: kayit, bulunan: disk.onay ?? "" };
    }
    if (disk.bekler !== undefined) {
      return {
        tur: "beklerAlanıKaldırılamadı", kod,
        beklenen: ONAY_CEKIRDEK_METINLERI.beklerKalkmali,
        bulunan: `${BEKLER_ALANI}: ${disk.bekler}`,
      };
    }
    return { tur: "başarı", kod, kayit };
  } finally {
    // ⑩ Kilit her çıkışta açılır: hata da, iptal de kapıyı kilitli bırakamaz.
    defter.cikis(dosya, kod);
  }
}

function hataMetni(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

// ═══════════════════════════════════════════════════════════════════════════
// yuzey-metinleri.ts — 🗣️ SUNUM YÜZEYİ ARAYÜZ METİNLERİ (mesaj anahtarı katmanı)
//
//   Bu dosya, Hatırlatıcılar ve Bildirimler yüzeylerinin kullanıcıya görünen
//   bütün metinlerini tutar: görünüş başlıkları, ağaç düğümü etiketleri, grup
//   satırları, boş-durum cümleleri ve ipuçları. Hiçbiri sağlayıcı koduna
//   gömülmez; sağlayıcı yalnız olguyu geçirir ve cümleyi buradan alır.
//
//   GEREKÇESİ DİL DESTEĞİDİR: ikinci bir dil eklendiğinde çevrilecek tek dosya
//   budur, iki sağlayıcıya dağılmış şablon dizesi değildir. Çekirdek tarafında
//   emsali `cekirdek/src/tani-metinleri.ts` dosyasıdır ve aynı deseni izler.
//
//   SINIRI DÜRÜSTÇE YAZIYORUZ: eklentinin ESKİ metinleri hâlâ kendi
//   modüllerinin içinde yaşar ve oradan taşınmaları ayrı bir Adımın işidir.
//   Bu katalog yalnız yüzey turunda yazılan YENİ metinleri besler.
//
//   YAZIM ÖLÇÜTÜ: Sarmal'ı ilk kez açan bir geliştirici, gördüğü satırda ne
//   yapacağını anlamalıdır. Bu yüzden her cümle tam cümledir, kısaltma
//   sözlüğü istemez ve iç karar numarası taşımaz.
// ═══════════════════════════════════════════════════════════════════════════

// Yalnız TİP alınır; çalışma zamanında hiçbir bağ kurulmaz (derlemede silinir).
// Katalog gövdeyi tanımaz, gövdenin İSTEDİĞİ demetin şeklini tanır.
import type { GovdeMetinleri } from "./posta-govde.ts";
import { dilHanesi, sozlukAdi, sozlukDuzYazisi, type CiktiDili } from "../../cekirdek/src/cevir.ts";

let yuzeyDili: CiktiDili | undefined;

/** Etkin dil yalnız `dil.ts` kapısından türetilir ve kataloğa buradan verilir. */
export function yuzeyDiliniAyarla(dil: CiktiDili): void {
  yuzeyDili = dil;
}

function yuzeyMetni(tr: string, en: string): string {
  if (!yuzeyDili) throw new Error("Yüzey dili etkin dil kapısından bağlanmadı.");
  return dilHanesi({ tr, en }, yuzeyDili);
}

// ── 📍 ÇALIŞMA ALANI KÖKLERİ — kaynak satırının okunur yazımı (VIT-GRAF-A18) ──
//
//   Founder 2026-08-16 tarihli canlı turda ipucu penceresinin kaynak satırında
//   upuzun bir mutlak yol bastığını bildirdi. Kullanıcının okuduğu satır kendi
//   çalışma alanının içindedir ve o alanın dışını anlatan yüz karakterlik önek
//   hiçbir şey öğretmez; okunur olan, kökten sonraki parçadır.
//
//   KÖK BURAYA KAPIDAN VERİLİR, TÜRETİLMEZ. Katalog saf kalmalıdır ve editör
//   kabuğunu tanımaz; kökleri yalnız `eklenti.ts` bilir ve etkin dille aynı
//   desende buraya bağlar. Kök bağlanmamışsa yol OLDUĞU GİBİ basılır, çünkü
//   bilinmeyen bir kökü tahmin etmek kullanıcıya var olmayan bir yol gösterir.
let yuzeyKokleri: readonly string[] = [];

/** Çalışma alanı kökleri yalnız `eklenti.ts` kabuğundan türetilir ve kataloğa buradan verilir. */
export function yuzeyKokleriniAyarla(kokler: readonly string[]): void {
  yuzeyKokleri = [...kokler];
}

/**
 * Mutlak yolu çalışma alanı köküne göreli yazar. Birden çok kök varsa yolu
 * gerçekten kapsayan EN UZUN kök seçilir, çünkü iç içe geçmiş iki kökten kısa
 * olanı seçmek kullanıcıya kendi projesinin adını ikinci kez okutur. Hiçbir kök
 * yolu kapsamıyorsa yol olduğu gibi döner ve kayıt yerini kaybetmez.
 */
export function calismaAlaninaGoreli(yol: string): string {
  let enUzunOnek = "";
  for (const kok of yuzeyKokleri) {
    const onek = kok.endsWith("/") ? kok : `${kok}/`;
    if (yol.startsWith(onek) && onek.length > enUzunOnek.length) enUzunOnek = onek;
  }
  return enUzunOnek ? yol.slice(enUzunOnek.length) : yol;
}

/** Kaynaktaki Türkçe `ne` yalnız okuma yüzünde etkin sözlük hanesine iner. */
export function kanonikWidgetDuzYazisi(tip: string, turkce: string): string {
  if (!yuzeyDili) throw new Error("Yüzey dili etkin dil kapısından bağlanmadı.");
  return sozlukDuzYazisi("widgetNe", tip, turkce, yuzeyDili);
}

export function kanonikWidgetAdi(tip: string, turkce: string): string {
  if (!yuzeyDili) throw new Error("Yüzey dili etkin dil kapısından bağlanmadı.");
  if (yuzeyDili === "tr") return turkce;
  return sozlukAdi("widget", tip, yuzeyDili);
}

/**
 * Kenar çubuğundaki kapsayıcının adı. Görünüş başlıkları bu adı TEKRAR ETMEZ:
 * kapsayıcı zaten "Sarmal" yazdığı için görünüş de "Sarmal …" derse kullanıcı
 * aynı sözcüğü iki kez okur ve ikinci okuma hiçbir şey öğretmez (Founder canlı
 * bulgusu 2026-07-28). Paket bildirimi bu değeri aynalar ve nöbet eşitliği
 * ölçer; ayrıca hiçbir görünüş başlığının bu adı içermediğini de ölçer.
 */
// Beş görünüşün adı yalnız package.nls*.json dosyalarında yaşar. Sağlayıcılar
// çalışma anında `TreeView.title` yazmaz; VS Code bildirimin yerelleştirilmiş
// adını kullanır. Böylece görünüş adı TypeScript içinde ikinci kez doğmaz.

/**
 * Görünüş başlığının yanında duran kısa açıklama. Kullanıcı panelin ne işe
 * yaradığını, tek bir kayıt bile görmeden okur.
 */
export const YUZEY_ACIKLAMALARI = {
  get hatırlatıcılar(): string {
    return yuzeyMetni("sonraya bıraktığınız işler", "work you deliberately left for later");
  },
  get fikirler(): string {
    return yuzeyMetni("taahhüde dönüşmemiş ham düşünceler", "raw thoughts that are not yet commitments");
  },
  get bildirimler(): string {
    return yuzeyMetni("düzeltme istemeyen ölçümler", "measurements that do not require a fix");
  },
  get postaKutusu(): string {
    return yuzeyMetni("kararınızı bekleyen kapılar", "gates awaiting your decision");
  },
} as const;

/**
 * Boş-durum cümleleri. Boş bir panel tek başına hiçbir şey öğretmez; bu yüzden
 * boşluk, panelin ne zaman dolacağını ve kullanıcının ne yazması gerektiğini
 * anlatır.
 */
export const YUZEY_BOS_DURUM = {
  get hatırlatıcılar(): string {
    return yuzeyMetni(
      "Bekleyen bir hatırlatıcınız yok. Bir işi bilerek sonraya bırakacağınız " +
        "zaman onu kaynağın içine bir Hatırlatıcı düğümü olarak yazın; " +
        "yazdığınız an bu panelde belirir ve siz kapatana kadar burada durur.",
      "You have no pending reminders. When you deliberately leave work for later, " +
        "write it into the source as a reminder node; it appears in this panel " +
        "the moment you write it and stays here until you close it.",
    );
  },
  /**
   * Fikirler panelinin kendi boşluk cümlesi (VIT-GRAF-A16).
   *
   * Cümle KENDİ HANESİNİ anlatır ve komşusundan hiçbir şey ödünç almaz. Hane
   * Hatırlatıcılar panelinin içinde yaşarken boşluk ölçüsü iki haneyi birlikte
   * sayıyordu ve tek bir Fikir yazmış kullanıcı fikrini listede görürken üstünde
   * hatırlatıcıdan söz eden bir cümle okuyordu. Hane kendi evine taşınınca o
   * ödünç cümle de yerini bu cümleye bıraktı; burada Fikrin ne olduğu, dönüş
   * tetikleyicisinin ne işe yaradığı ve olgunlaşan bir Fikrin Karar'a
   * yükseldiği söylenir. Bu üç bilgi daha önce bölüm başlığının ipucunda
   * yaşıyordu ve bölüm kalkınca kaybolmasın diye buraya taşındı.
   */
  get fikirler(): string {
    return yuzeyMetni(
      "Kayıtlı bir fikriniz yok. Fikir, henüz taahhüde dönüşmemiş ham " +
        "düşüncedir; kaybetmek istemediğiniz bir düşünceyi kaynağın içine bir " +
        "Fikir düğümü olarak yazın, yazdığınız an bu panelde belirir. " +
        "Olgunlaşan bir fikri Karar'a yükseltmek size aittir; panel bunu " +
        "kendiliğinden yapmaz.",
      "You have no recorded ideas. An idea is a raw thought that has not yet " +
        "become a commitment; write a thought you do not want to lose into the " +
        "source as an idea node, and it appears in this panel the moment you " +
        "write it. Promoting a matured idea to a Decision is up to you; the " +
        "panel never does it on its own.",
    );
  },
  get bildirimler(): string {
    return yuzeyMetni(
      "Gösterilecek bir gözlem yok. Motorun sizden düzeltme istemediği, yalnız " +
        "haber verdiği ölçüm ve durum satırları burada toplanır; düzeltme " +
        "gerektiren sapmalar ise Sorunlar sekmesine düşer.",
      "There are no observations to show. This panel collects measurement and " +
        "status rows the engine reports without asking you to fix them; drift " +
        "that requires a fix lands in the Problems tab instead.",
    );
  },
  get postaKutusu(): string {
    return yuzeyMetni(
      "Kararınızı bekleyen bir kapı yok. Bir Adımın kabul ölçütü sizin " +
        "onayınızı şart koştuğunda kapısı buraya kendiliğinden düşer; " +
        "verdiğiniz karar Adımın kendi kaydına yazılır.",
      "No gate is awaiting your decision. When a Step's acceptance criteria " +
        "require your approval, its gate lands here automatically; the decision " +
        "you make is written back to the Step's own record.",
    );
  },
} as const;

/**
 * Panel ağacının en üst kademesi Proje satırıdır. Etiket Projenin insan adını ve
 * tür özetini, açıklama ise kaç kayıt ile kaç tür bulunduğunu söyler.
 */
export function projeSatiriAciklamasi(adet: number, turSayisi?: number): string {
  const kayit = adet === 1
    ? yuzeyMetni("1 kayıt", "1 record")
    : yuzeyMetni(`${adet} kayıt`, `${adet} records`);
  // TÜR SAYISI NEDEN BURADA. Etiketteki özet yalnız baskın türleri basar ve
  // kullanıcı, gördüğü üç türün tamamı sanabilir. Kaç ayrı tür bulunduğunu
  // söylemek o yanılgıyı sekiz karakterle kapatır: sayı, satırın bir SEÇKİ
  // olduğunu ilan eder ve tamamının ipucunda beklediğini ima eder.
  if (turSayisi === undefined || turSayisi <= 0) return kayit;
  const tur = turSayisi === 1
    ? yuzeyMetni("1 tür", "1 type")
    : yuzeyMetni(`${turSayisi} tür`, `${turSayisi} types`);
  return `${kayit} · ${tur}`;
}

/**
 * TANI KİMLİĞİNİN KISA ADI — özet satırının taşıyabildiği tek biçim.
 *
 * `taniBasligi` bir kimliği tam bir CÜMLEYE çevirir ve o cümle bir grup
 * başlığı için doğrudur; bir satırda üç türü yan yana basmak isteyen özet için
 * ise fazla uzundur. Burada kimliğin kendisi kullanılır ve yalnız tireleri
 * çözülür: ikinci bir ad çizelgesi kurulmaz, çünkü iki ad çizelgesi zamanla
 * ayrışır ve aynı tür iki satırda iki adla görünür. Kimlik kanoniktir ve
 * yüzeyler arasında değişmez (YUZ-3.1), dolayısıyla dile göre de çevrilmez.
 */
export function taniKisaAdi(taniKodu: string): string {
  return taniKodu.replace(/-/g, " ").trim();
}

/**
 * Proje satırının etiketi: önce Projenin adı, sonra baskın türlerin özeti.
 *
 * BİÇİM DEPONUN KENDİ EMSALİNDEN GELİR. Sayı ile ad arasındaki çarpı işareti
 * denetim çıktısının tür dökümünde zaten kullanılıyor ("31 × şema-dışı-alan");
 * aynı veriyi iki yüzde iki ayrı biçimde yazmak kullanıcıya iki kural öğretir.
 * Sayının önde durması ayrıca bir okuma kolaylığıdır: baskınlık bir sayı
 * karşılaştırmasıdır ve göz sayıları hizalı okur.
 *
 * Dağılım boşsa etiket yalnız Projenin adıdır; boş bir tire ile biten satır
 * kullanıcıya hiçbir şey öğretmez.
 */
export function projeSatiriEtiketi(
  projeAdi: string,
  baskinlar: ReadonlyArray<{ kod: string; adet: number }>,
): string {
  if (!baskinlar.length) return projeAdi;
  return `${projeAdi} — ${baskinlar.map((t) => `${t.adet} × ${taniKisaAdi(t.kod)}`).join(" · ")}`;
}

/**
 * Proje satırının ipucu metni — hangi kimliğin altında toplandığını ve
 * dağılımın TAMAMINI söyler.
 *
 * Etiketteki özet bilerek kısadır ve yalnız baskın türleri basar; elenen türler
 * kaybolmaz, burada tek tek sayılarıyla durur. Kullanıcı bakışta baskını, fareyi
 * getirdiğinde tabloyu görür.
 */
export function projeSatiriIpucu(
  projeAdi: string,
  projeKodu: string,
  adet: number,
  tumu: ReadonlyArray<{ kod: string; adet: number }> = [],
): string {
  const bas = yuzeyMetni(
    `"${projeAdi}" Projesinde ${adet === 1 ? "bir" : adet} kayıt toplandı. ` +
      `Bu satırın altındaki her kayıt ${projeKodu} kimliğine bağlıdır ve başka bir Projeyle karışmaz.`,
    `${adet === 1 ? "One record was" : `${adet} records were`} collected in Project "${projeAdi}". ` +
      `Every record under this row belongs to ${projeKodu} and cannot be mixed with another Project.`,
  );
  if (!tumu.length) return bas;
  const baslik = yuzeyMetni(
    `Tür dağılımının tamamı (${tumu.length === 1 ? "tek tür" : `${tumu.length} tür`}):`,
    `The complete type distribution (${tumu.length === 1 ? "one type" : `${tumu.length} types`}):`,
  );
  const satirlar = tumu.map((t) => `- ${t.adet} × ${taniKisaAdi(t.kod)}`);
  return [bas, "", baslik, "", ...satirlar].join("\n");
}

/**
 * GRUP BAŞLIKLARI — tanı kimliğinin okunur karşılığı.
 *
 * Bir tanı kimliği makine adıdır: tekildir, aranabilir ve kararlıdır. Başlık
 * değildir. Yüz yetmiş iki kayıt kod adlarıyla gruplanınca panel gezilebilir
 * olmaktan çıkar; kullanıcı "şema-dışı-alan" satırını açmadan ne olduğunu
 * bilemez (Founder canlı bulgusu 2026-07-28). Bu çizelge her kimliğe, ne
 * bulunduğunu tek cümlede söyleyen bir başlık verir. Kimlik kaybolmaz: satırın
 * açıklamasında ve ipucunda aynen durur, arama yine kimlikle yapılır.
 *
 * ÇİZELGEDE OLMAYAN KİMLİK BAŞLIKSIZ KALMAZ: `taniBasligi` kimliği okunur bir
 * söz öbeğine çevirir. Bu, yeni bir tanı eklendiğinde panelin çıplak koda
 * düşmesini yapısal olarak imkânsız kılar; çizelge bayatlarsa yüz bozulmaz,
 * yalnız o satır daha az öğretici olur.
 */
const GRUP_BASLIKLARI: Readonly<Record<string, string>> = {
  // ── Dil, tip ve şema ──────────────────────────────────────────────────────
  "şema-dışı-alan": "Bir alan kullanılmış ama tipin şemasında ilan edilmemiş",
  "çok-satırlı-değer-drift": "Çok satırlı bir değer biçimlendirmede içerik kaybediyor",
  "belge-şekil-drift": "Belge bloğunun satır düzeni biçimli yüzde değişiyor",
  "kanonik-kaynak-biçimi": "Bir metin dosyası kanonik hükmü kaynak gibi taşıyor",
  "orthografi-kaybı": "Bir ad Türkçe orthografiyi eksik yazıyor",
  "geçersiz-enum": "Bir alana sözlükte bulunmayan bir değer yazılmış",
  "yanlış-alan": "Alan adı bu tipe ait değil",
  "eksik-alan": "Zorunlu bir alan yazılmamış",
  "bilinmeyen-tip": "Kanonda bulunmayan bir tip adı yazılmış",
  "ad-ayracı": "Dosya adında tire var; ayraç alt çizgi olmalı",
  "kullanımsız-tip": "Kanonda ilan edilmiş bir tip hiçbir yerde kullanılmıyor",
  "ilgili-önek-geçersiz": "İlgili listesi kanonik önek kümesinin dışına çıkıyor",
  "madde-kodu-uyumsuz": "Madde kodu numara grafıyla uyuşmuyor",
  "kanon-kodu-uyumsuz": "Kanon kodu beklenen numara düzenine oturmuyor",

  // ── Yapı ve plan omurgası ─────────────────────────────────────────────────
  "çıplak-adımlı-katman": "Bir Katman Adımlarını doğrudan taşıyor, ara kademe yok",
  "tek-çocuk-kapsayıcı": "Bir kapsayıcının altında tek çocuk var",
  "adım-atomikliği": "Bir Adım tek bir işten fazlasını üstleniyor",
  "meyvesiz-geliştirme": "Geliştirmedeki Adım hangi dosyayı üreteceğini yazmamış",
  "yetim-meyve": "İlan edilmiş meyve diskte bulunamıyor",
  "proje-köksüz-üretim": "Üretim bir Proje köküne bağlanmadan yapılıyor",
  "katmansız-teknoloji": "Teknoloji hiçbir Katmana bağlanmamış",
  "kopuk-zincir": "Zincir kopmuş; düğüm hiçbir öncüle bağlanmıyor",
  "kayıp-kenar": "Beklenen bir bağ hiç kurulmamış",
  "durum-tutarsızlığı": "Durum, öncüllerin durumuyla çelişiyor",
  "silo-blok": "Bir Blok kavuşum gövdesine hiç bağlanmıyor",
  "kavuşumsuz-paralellik": "Paralel yürüyen işlerin buluşma noktası yok",
  "kavuşumsuz-dilim": "Bir dilim kavuşuma bağlanmadan duruyor",

  // ── Yasa, karar ve yönetişim ──────────────────────────────────────────────
  "kural-sözleşmesi-eksik": "Bir kural otorite, katman ve kapsam üçlüsünü tamamlamıyor",
  "düzyazı-koşul": "Kural koşulu düzyazı yazılmış; makine bunu zorlayamaz",
  "zorlanamayan-koşul": "Koşul yazılmış ama hiçbir motor onu ölçemiyor",
  "dayanaksız-kural": "Bir kural hiçbir karara yaslanmıyor",
  "politika-dayanaksız": "Bir politika hangi karardan doğduğunu söylemiyor",
  "uygulanmamış-karar": "Kilitli bir karar henüz hiçbir yerde uygulanmamış",
  "yürütücü-bağımlılığı": "Bir hüküm belirli bir dış yürütücüye bağlanıyor",
  "üretim-kökeni-ihlali": "Üretilmiş bir yüz kaynak gibi düzenlenmiş",
  "yürütme-kenarı-sözleşmesi": "Yürütme kenarı sözleşmesini tamamlamıyor",
  "rejim-beyanı-eksik": "Proje zorlama rejimini beyan etmemiş",
  "açık-gizli-sınır-ihlali": "Açık çekirdek gizli ürün tarafına doğrudan bağ kuruyor",
  "yüz-idempotans-drifti": "Üretilen yüz aynı kaynaktan farklı sonuç veriyor",
  "görünürlük-sözleşmesi-eksik": "Bir yüzey görünürlüğünü beyan etmemiş",
  "beceri-kartı-eksik": "Bir beceri kendi kartını taşımıyor",

  // ── Bilerek açık bırakılan işaretler ──────────────────────────────────────
  "açık-hatırlatıcı": "Sonraya bırakılmış, henüz karara bağlanmamış iş",
  "kararlaşmış-hatırlatıcı": "Kararı verilmiş hatırlatıcı; zincirdeki yerini bekliyor",
  "açık-adım": "Henüz kapanmamış Adım",
  "geliştirmede-çapa": "Geliştirme evresinde duran çapa",
  "bloklu-çapa": "Yolu kesilmiş çapa",
  "doğrulanmamış-çapa": "İş teslim edilmiş ama bağımsız kanıtı yok",

  // ── Belge ve atıf ─────────────────────────────────────────────────────────
  "karşılıksız-metin-atfı": "Belge, hiçbir kaynakta tanımlı olmayan bir kimliğe atıf yapıyor",
  "doc-drift": "Belge ile kaynak birbirinden ayrışmış",
  "sahipsiz-belge": "Belge hiçbir düğüme bağlanmamış",
} as const;

const GRUP_BASLIKLARI_EN: Readonly<Record<string, string>> = {
  "şema-dışı-alan": "A field is used but was not declared in the type schema",
  "çok-satırlı-değer-drift": "A multiline value loses content during formatting",
  "belge-şekil-drift": "Document-block line layout changes in the formatted view",
  "kanonik-kaynak-biçimi": "A text file carries a canonical ruling as though it were source",
  "orthografi-kaybı": "A name is missing its canonical Turkish orthography",
  "geçersiz-enum": "A field contains a value that is absent from its vocabulary",
  "yanlış-alan": "The field name does not belong to this type",
  "eksik-alan": "A required field is missing",
  "bilinmeyen-tip": "A type name absent from the canon is used",
  "ad-ayracı": "The filename uses a hyphen where an underscore is required",
  "kullanımsız-tip": "A type declared in the canon is not used anywhere",
  "ilgili-önek-geçersiz": "The related list leaves the canonical prefix set",
  "madde-kodu-uyumsuz": "The clause code does not match the numbering graph",
  "kanon-kodu-uyumsuz": "The canon code does not match the expected numbering pattern",
  "çıplak-adımlı-katman": "A Layer holds Steps directly with no intermediate level",
  "tek-çocuk-kapsayıcı": "A container has only one child",
  "adım-atomikliği": "A Step takes responsibility for more than one task",
  "meyvesiz-geliştirme": "An in-progress Step does not say which file it will produce",
  "yetim-meyve": "A declared fruit cannot be found on disk",
  "proje-köksüz-üretim": "Production occurs without a Project root",
  "katmansız-teknoloji": "A technology is not bound to any Layer",
  "kopuk-zincir": "The chain is broken; a node has no resolvable predecessor",
  "kayıp-kenar": "An expected relationship was never established",
  "durum-tutarsızlığı": "Status conflicts with predecessor status",
  "silo-blok": "A Block never connects to a convergence trunk",
  "kavuşumsuz-paralellik": "Parallel work has no meeting point",
  "kavuşumsuz-dilim": "A slice remains disconnected from convergence",
  "kural-sözleşmesi-eksik": "A rule does not complete its authority, layer and scope contract",
  "düzyazı-koşul": "A rule condition is prose and cannot be enforced by the engine",
  "zorlanamayan-koşul": "A condition is written but no engine measures it",
  "dayanaksız-kural": "A rule is not grounded in any decision",
  "politika-dayanaksız": "A policy does not identify the decision it came from",
  "uygulanmamış-karar": "A locked decision has not been applied anywhere",
  "yürütücü-bağımlılığı": "A ruling is tied to a specific external executor",
  "üretim-kökeni-ihlali": "A generated surface is edited as source",
  "yürütme-kenarı-sözleşmesi": "An execution edge does not complete its contract",
  "rejim-beyanı-eksik": "The Project does not declare its enforcement regime",
  "açık-gizli-sınır-ihlali": "The open core binds directly to the private product side",
  "yüz-idempotans-drifti": "The generated surface differs across runs from the same source",
  "görünürlük-sözleşmesi-eksik": "A surface does not declare its visibility",
  "beceri-kartı-eksik": "A skill does not carry its own card",
  "açık-hatırlatıcı": "Work deliberately left for later and not yet decided",
  "kararlaşmış-hatırlatıcı": "A decided reminder waiting for its place in the chain",
  "açık-adım": "A Step that is not yet closed",
  "geliştirmede-çapa": "An anchor currently in development",
  "bloklu-çapa": "An anchor whose path is blocked",
  "doğrulanmamış-çapa": "Work delivered without independent evidence",
  "karşılıksız-metin-atfı": "A document refers to an identity defined by no source",
  "doc-drift": "The document and source have diverged",
  "sahipsiz-belge": "A document is not bound to any node",
} as const;

/** Türkçe ilk-harf büyütmesi — "ı" ile "i" ayrımı korunur. */
function bastanBuyut(s: string): string {
  const dil = yuzeyDili === "en" ? "en" : "tr";
  return s.length ? s[0].toLocaleUpperCase(dil) + s.slice(1) : s;
}

/**
 * Tanı kimliğinin panelde görünen başlığı. Çizelgede karşılığı varsa cümle,
 * yoksa kimliğin okunur söz öbeği hâli döner; hiçbir durumda çıplak kimlik
 * (tire ile yazılmış makine adı) başlık olarak basılmaz.
 */
export function taniBasligi(taniKodu: string): string {
  const yazili = (yuzeyDili === "en" ? GRUP_BASLIKLARI_EN : GRUP_BASLIKLARI)[taniKodu];
  if (yazili) return yazili;
  return yuzeyMetni(
    bastanBuyut(taniKodu.replace(/-/g, " ").trim()),
    `Diagnostic · ${taniKodu}`,
  );
}

/**
 * Aynı kökten gelen kayıtlar tek bir grup satırının altında toplanır. Başlık
 * ne bulunduğunu söyler; sayı ile kimlik satırın açıklamasında ve ipucunda
 * durur, yani gizlenmez, yalnız geri çekilir.
 */
export function ozetSatiriEtiketi(taniKodu: string, _adet: number): string {
  return taniBasligi(taniKodu);
}

/** Grup satırının yanındaki gri açıklama — kaç kayıt ve hangi kimlik. */
export function ozetSatiriAciklamasi(taniKodu: string, adet: number): string {
  return yuzeyMetni(`${adet} kayıt · ${taniKodu}`, `${adet} ${adet === 1 ? "record" : "records"} · ${taniKodu}`);
}

/** Özet satırının ipucu metni — özetin neyi gizlemediğini açıkça söyler. */
export function ozetSatiriIpucu(taniKodu: string, adet: number): string {
  return yuzeyMetni(
    `**${taniBasligi(taniKodu)}**\n\n` +
      `Aynı kökten gelen ${adet} kayıt "${taniKodu}" kimliği altında toplandı. ` +
      "Hiçbiri elenmedi; satırı açtığında hepsini tek tek görürsün.",
    `**${taniBasligi(taniKodu)}**\n\n` +
      `${adet} ${adet === 1 ? "record" : "records"} from the same root were grouped under the "${taniKodu}" identity. ` +
      "None were removed; expand the row to see each one.",
  );
}

/**
 * MUTLAK YOL: kök eğik çizgiyle ya da sürücü harfiyle başlayan, en az iki
 * parçalı yol. Kullanıcıya görünen metinde tam yol basmak okumayı bitirir:
 * satır zaten kesilir ve kesilen kısım her zaman anlamlı olan sondur.
 */
const MUTLAK_YOL = /(?:[A-Za-z]:)?(?:\/[^\s"'`)]+){2,}/g;

/** KOD imzası: BÜYÜK harfli, tireli makine kimliği (göç terfi turu A99 kapanışı gibi). */
const KOD_GOVDESI = "[A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜ0-9]*(?:-[A-ZÇĞİÖŞÜ0-9]+)+";

/** Segmentin TAMAMI bir kimlikten ibaret mi (zincir kimliği gibi). */
const TEK_KOD = new RegExp(`^${KOD_GOVDESI}$`, "u");

/**
 * "Tür adı (KİMLİK)" başlangıcı. Bu desen bilerek DAR tutulmuştur: yalnız
 * harfle başlayan bir tür adının ardından parantez içinde bir kimlik gelen
 * baş segmentler düşer. Cümlenin kendisi tırnakla ya da bir olguyla başlıyorsa
 * (…"DIL-1.1" hükmü … : …) hiçbir şey atılmaz, çünkü orada baş segment asıl
 * bilgiyi taşır ve atmak cümleyi sakatlar.
 */
const KIMLIK_BASI = new RegExp(`^\\p{Lu}[\\p{L} ]{0,40}\\(${KOD_GOVDESI}\\)`, "u");

/** Baştaki simge/işaret kümesi — harf ya da rakam gelene kadar. */
const BAS_SIMGELERI = /^[^\p{L}\p{N}"'(]+/u;

/** Mutlak yolları dosya adına indirir; göreli yollara ve metne dokunmaz. */
export function yolusuzlastir(metin: string): string {
  return metin.replace(MUTLAK_YOL, (y) => y.slice(y.lastIndexOf("/") + 1));
}

/**
 * Tek bir kaydın ağaç etiketi. Kullanıcı ASIL CÜMLEYİ önce okur; kimlik ve tür
 * bilgisi geriye çekilir (Founder canlı bulgusu 2026-07-28: bir satırda önce
 * iki simge, sonra bir tür adı, sonra bir kod, sonra bir zincir kimliği ve
 * ancak ondan sonra asıl bilgi geliyordu).
 *
 * ÜÇ SADELEŞTİRME, ÜÇÜ DE DİL BİLGİSİNİ BOZMAZ:
 *   ① Mutlak dosya yolları dosya adına iner.
 *   ② "Tür adı (KİMLİK): gövde" biçimindeki mesajlarda kimlik taşıyan BAŞ
 *      segmentleri düşer — iki nokta üst üste zaten "etiket: içerik" demektir,
 *      dolayısıyla başı atmak cümleyi kırmaz. Son segment her zaman korunur.
 *   ③ Baştaki simge kümesi düşer.
 * Cümlenin ortasındaki hiçbir şey kırpılmaz: parantez içindeki kimlik cümlenin
 * dil bilgisel parçasıysa (…"Adım" (KOD) düğümünde…) yerinde bırakılır.
 */
export function kayitEtiketi(mesaj: string): string {
  const ham = yolusuzlastir(mesaj.split("\n")[0].trim());
  const parcalar = ham.split(": ");
  while (parcalar.length > 1) {
    const bas = parcalar[0].replace(BAS_SIMGELERI, "").trim();
    if (!KIMLIK_BASI.test(bas) && !TEK_KOD.test(bas)) break;
    parcalar.shift();
  }
  const tekSatir = (parcalar.join(": ").replace(BAS_SIMGELERI, "").trim() || ham);
  return tekSatir.length > 120 ? `${tekSatir.slice(0, 117)}…` : tekSatir;
}

/** Kaydın etiketinin yanındaki gri açıklama — dosya adı ve satır numarası. */
export function kayitAciklamasi(dosyaAdi: string, satir: number): string {
  return `${dosyaAdi}:${satir}`;
}

/**
 * Kaydın ipucu metni. Kanonik tanı nesnesinin hiçbir alanı kaybolmaz: kimlik,
 * düzey, tam mesaj, kaynak konumu ve düzeltme önerisi birlikte görünür.
 *
 * KIRPILMAMIŞ GÖVDE (VIT-GRAF-A18). Motor, ağaç satırına ve komut satırına sığsın
 * diye düğümün gövdesini kısaltarak tanı mesajına gömer; pencere ise kaydın
 * tamamını taşımak üzere açılır. Bu yüzden tanı, kırpılmamış gövdeyle kurulmuş
 * ikinci bir cümleyi `tamMesaj` alanında ayrıca taşır ve pencere varsa onu
 * gösterir. Alan yoksa davranış değişmez ve kısa cümle basılır; böylece bu
 * alanı taşımayan tanılar da eskisi gibi çalışır.
 */
export function kayitIpucu(p: {
  kod: string;
  duzey: string;
  mesaj: string;
  dosya: string;
  satir: number;
  sutun: number;
  oneri?: string;
  tamMesaj?: string;
}): string {
  const duzey = yuzeyDili === "en"
    ? ({ hata: "error", uyarı: "warning", bilgi: "information" } as Record<string, string>)[p.duzey] ?? p.duzey
    : p.duzey;
  // 📍 İpucu penceresinde kaynak satırı çalışma alanına GÖRELİ yazılır; tam yol
  //    pano kopyasında yaşamaya devam eder (panoKaydiMetni bu değişimden etkilenmez).
  const govde = p.tamMesaj?.trim() ? p.tamMesaj : p.mesaj;
  const kaynak = `${calismaAlaninaGoreli(p.dosya)}:${p.satir}:${p.sutun}`;
  const satirlar = yuzeyDili === "en"
    ? [`**${p.kod}** · ${duzey} severity`, "", govde, "", `Source: ${kaynak}`]
    : [`**${p.kod}** · ${p.duzey} düzeyi`, "", govde, "", `Kaynak: ${kaynak}`];
  if (p.oneri?.trim()) satirlar.push("", yuzeyMetni(`Ne yapmalı: ${p.oneri.trim()}`, `What to do: ${p.oneri.trim()}`));
  satirlar.push("", yuzeyMetni(
    "Satıra gitmek için bu kaydın üzerine tıklayın.",
    "Select this record to go to its source line.",
  ));
  return satirlar.join("\n");
}

/** Kayda tıklandığında koşan komutun kullanıcıya görünen adı. */
export function kaydaGitBasligi(): string {
  return yuzeyMetni("Kaydın geldiği satıra git", "Go to the record's source line");
}

// ═══════════════════════════════════════════════════════════════════════════
// 💡 FİKİR SATIRI — Fikirler panelinin metinleri (KYN-YUZ-A01 · VIT-GRAF-A16)
//
//   Sınıflama Fikir tipini "ham, taahhütsüz fikir; olgunlaşırsa Karar'a
//   yükselir" diye tanımlar. Satır bu yüzden Hatırlatıcı satırıyla aynı dille ve
//   aynı kısalıkta konuşur; yalnız bir şeyi başka türlü söyler — Hatırlatıcı
//   "ne zaman hatırlatılacağını" bildirir, Fikir "hangi olayla canlanacağını".
//   Bu yüzden dönüş tetikleyicisi satırın gri açıklamasına yazılır ve okumak
//   için fare gerekmez.
//
//   BÖLÜM BAŞLIĞININ METİNLERİ EMEKLİ EDİLDİ (VIT-GRAF-A16). Hane Hatırlatıcılar
//   panelinin içinde bir bölüm olarak yaşarken bölüm satırının kendi başlığı,
//   gri açıklaması ve ipucu vardı. Hane kendi paneline taşınınca bölüm satırı da
//   ortadan kalktı; başlık artık paket bildiriminin yerelleştirilmiş görünüş adı
//   olarak yaşar, sayı durum çubuğundaki kendi girdisinde okunur ve bölüm
//   ipucunun öğrettiği üç şey panelin boş durum cümlesine taşındı. Aynı cümlenin
//   iki evi olsaydı biri sessizce bayatlardı.
// ═══════════════════════════════════════════════════════════════════════════

/** Kullanıcıya görünen metinlerin kırpma sınırları — ağaç satırı zaten kesilir. */
const FIKIR_ETIKET_SINIRI = 120;
const FIKIR_ACIKLAMA_SINIRI = 72;

/** Bir metni sınıra kırpar ve kırpıldığını üç noktayla söyler. */
function kirp(metin: string, sinir: number): string {
  return metin.length > sinir ? `${metin.slice(0, sinir - 1)}…` : metin;
}

/**
 * FİKİR SATIRININ KOD HANESİ (VIT-GRAF-A15 · Founder hükmü 2026-08-08).
 *
 * Fikir satırı da ortak biçime çevrildi ve kodunu başında taşır. Founder'ın
 * gerekçesi üç maddedir. Birincisi tutarlılıktır, çünkü tek panelin içinde iki
 * biçim kullanıcıya iki kural öğretir ve bu, iki panelde iki biçimden daha
 * kötüdür. İkincisi izlenebilirliktir, çünkü kanon Fikir'in olgunlaşınca Karar'a
 * yükseleceğini söyler ve terfi eden fikrin hangi kayıttan doğduğu ancak kimliği
 * baştan görünürse izlenir. Üçüncüsü bedelin küçüklüğüdür, çünkü kırpılma
 * bedelini zaten bütün öteki satırlar ödemektedir.
 *
 * HANE ASLA BOŞ DÖNMEZ, çünkü ortak biçim bir kod bekler ve kodsuz bir önek
 * satırı çıplak bir ayraçla başlatırdı. Kimlik kaynakta yazılmamışsa uydurma
 * bir kod ÜRETİLMEZ; hanenin yerini eksikliği söyleyen bir söz öbeği alır ve
 * kullanıcı kaydın kimliksiz olduğunu bakışta okur.
 */
export function fikirSatirKodu(kod: string): string {
  return kod.trim() || yuzeyMetni("kimliksiz Fikir", "idea without identity");
}

/**
 * Tek bir Fikrin ağaç etiketindeki CÜMLE hanesi. Kod hanesi ayrıdır ve etiketin
 * başına ortak biçim işleviyle geçirilir (`kodluEtiket`); burada yalnız fikrin
 * amaç cümlesi yaşar. Amaç kaynakta yazılmamışsa cümle eksikliği AÇIKÇA söyler —
 * boş cümle basmak satırı okunmaz kılar ve kimliği yalnız başta bırakırdı.
 */
export function fikirEtiketi(ne: string): string {
  const amac = yolusuzlastir(ne).trim();
  return amac
    ? kirp(amac, FIKIR_ETIKET_SINIRI)
    : yuzeyMetni("amacı kaynakta yazılmamış", "purpose not stated in the source");
}

/**
 * Fikir satırının gri açıklaması: DÖNÜŞ TETİKLEYİCİSİ. Hatırlatıcı kaydında bu
 * hane `dosya:satır` taşır; burada taşımaz ve ayrım bilinçlidir. Fikrin bekleme
 * sebebi tetikleyicisidir ve kullanıcı onu fare getirmeden okumalıdır; kaynağın
 * tam konumu ipucunda ve tıklama davranışında korunur. Tetikleyici yazılmamışsa
 * eksiklik sessizce geçilmez, çünkü tetikleyicisiz bir Fikir hiçbir zaman
 * canlanmayacak bir fikirdir.
 */
export function fikirAciklamasi(dönüşTetikleyici: string): string {
  const tetik = dönüşTetikleyici.trim();
  if (!tetik) {
    return yuzeyMetni("dönüş tetikleyicisi yazılmamış", "no return trigger written");
  }
  return yuzeyMetni(
    `dönüş: ${kirp(tetik, FIKIR_ACIKLAMA_SINIRI)}`,
    `returns when: ${kirp(tetik, FIKIR_ACIKLAMA_SINIRI)}`,
  );
}

/**
 * Fikrin ipucu metni. Sınıflamanın dört zorunlu alanının hiçbiri kaybolmaz:
 * kimlik, amaç, durum ve dönüş tetikleyicisi tam hâlleriyle görünür, altlarında
 * Projenin adı ile kaynağın tam konumu durur. Yazılmamış bir alan uydurulmaz;
 * eksik olduğu söylenir.
 */
export function fikirIpucu(p: {
  kod: string;
  ne: string;
  durum: string;
  dönüşTetikleyici: string;
  proje: string;
  dosya: string;
  satir: number;
}): string {
  const kimlik = p.kod.trim() || yuzeyMetni("kimliksiz Fikir", "idea without identity");
  const amac = p.ne.trim();
  const durum = p.durum.trim();
  const tetik = p.dönüşTetikleyici.trim();
  const satirlar = yuzeyDili === "en"
    ? [
      `**${kimlik}** · idea`,
      "",
      amac ? amac : "_Its purpose is not stated in the source._",
      "",
      `**Status:** ${durum || "not written"}`,
      `**Return trigger:** ${tetik || "not written; this idea will never be revived on its own"}`,
      "",
      `Project: ${p.proje}`,
      `Source: ${p.dosya}:${p.satir}`,
      "",
      "Select this row to open the idea at its source line.",
    ]
    : [
      `**${kimlik}** · fikir`,
      "",
      amac ? amac : "_Amacı kaynakta yazılmamış._",
      "",
      `**Durum:** ${durum || "yazılmamış"}`,
      `**Dönüş tetikleyicisi:** ${tetik || "yazılmamış; bu fikir kendiliğinden canlanmayacak"}`,
      "",
      `Proje: ${p.proje}`,
      `Kaynak: ${p.dosya}:${p.satir}`,
      "",
      "Fikri kaynağındaki satırda açmak için bu satıra tıklayın.",
    ];
  return satirlar.join("\n");
}

// ═══════════════════════════════════════════════════════════════════════════
// 🗂️ DOSYA KADEMESİ — Proje ile kayıt arasındaki ara satır (VIT-GRAF-A13)
//
//   Founder canlı görünümde altmış iki kaydın tek yığın hâlinde gezilemediğini
//   bildirdi (2026-07-28). Ölçüm onu doğruladı: Gözlemler panelinde tek bir
//   özet satırının altında yüz otuz altı kayıt yığılıyordu. Dosya satırı o
//   yığını böler ve teknoloji simgesine bir ev açar.
// ═══════════════════════════════════════════════════════════════════════════

/** Dosya satırının yanındaki gri açıklama — o dosyada kaç kayıt bulunduğu. */
export function dosyaSatiriAciklamasi(adet: number): string {
  return adet === 1
    ? yuzeyMetni("1 kayıt", "1 record")
    : yuzeyMetni(`${adet} kayıt`, `${adet} records`);
}

/**
 * Dosya satırının ipucu metni. MUTLAK YOL BURADA YAŞAR: etikette dosyanın
 * yalnız adı görünür, çünkü ağaç satırı kesildiğinde her zaman anlamlı olan son
 * kısım kaybolur. Yolun tamamına ihtiyaç duyan kullanıcı onu ipucunda bulur —
 * Onaylar panelinin dosya satırıyla aynı sözleşme.
 */
export function dosyaSatiriIpucu(dosya: string, adet: number): string {
  return yuzeyMetni(
    `Bu dosyada ${adet === 1 ? "bir" : adet} kayıt toplandı.\n\nKaynak: ${dosya}`,
    `${adet === 1 ? "One record was" : `${adet} records were`} collected in this file.\n\nSource: ${dosya}`,
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 📋 PANOYA KOPYALAMA — satırın TAM metni (VIT-GRAF-A13)
//
//   Founder'ın cümlesi şudur: "hatırlatıcı bildirim metinlerini
//   kopyalayamıyorum." Ağaç görünüşlerinde metin seçilemez; kopyalama ancak bir
//   komutla olur. Kopyalanan metin satırın kendisinden daha fazlasını taşır:
//   etiket, gri açıklama, tam gövde, düzeltme önerisi ve TAM DOSYA YOLU satır
//   numarasıyla birlikte iner. Kullanıcı metni başka bir yere yapıştırdığında
//   bağlamı kaybetmez; kaydın nereden geldiği metnin içinde yaşar.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Tek bir kaydın pano bloğu. Blok kendi kendine yeter: ilk satır kullanıcının
 * panelde okuduğu cümledir, son satır kaydın tam kaynağıdır. Aradaki satırlar
 * kanonik tanının hiçbir alanını düşürmez.
 */
export function panoKaydiMetni(p: {
  etiket: string;
  aciklama: string;
  kod: string;
  duzey: string;
  mesaj: string;
  dosya: string;
  satir: number;
  sutun: number;
  oneri?: string;
}): string {
  const satirlar = [
    `${p.etiket} — ${p.aciklama}`,
    yuzeyMetni(`${p.kod} · ${p.duzey} düzeyi`, `${p.kod} · ${p.duzey} severity`),
    p.mesaj.trim(),
  ];
  if (p.oneri?.trim()) satirlar.push(yuzeyMetni(`Ne yapmalı: ${p.oneri.trim()}`, `What to do: ${p.oneri.trim()}`));
  satirlar.push(yuzeyMetni(`Kaynak: ${p.dosya}:${p.satir}:${p.sutun}`, `Source: ${p.dosya}:${p.satir}:${p.sutun}`));
  return satirlar.join("\n");
}

/**
 * Bir Fikir satırının pano bloğu. Fikir bir tanı DEĞİLDİR: düzeyi, sütunu ve
 * düzeltme önerisi yoktur, çünkü kimseden düzeltme istemez. Blok bu yüzden
 * kaydın kendi alanlarını taşır — kimlik, cümle, bekleme sebebi ve tam kaynak.
 */
export function panoFikirMetni(p: {
  kod: string;
  ne: string;
  dönüşTetikleyici: string;
  dosya: string;
  satir: number;
}): string {
  const satirlar = yuzeyDili === "en"
    ? [`${p.kod} — ${p.ne}`, `Awaiting: ${p.dönüşTetikleyici}`, `Source: ${p.dosya}:${p.satir}`]
    : [`${p.kod} — ${p.ne}`, `Dönüş tetikleyicisi: ${p.dönüşTetikleyici}`, `Kaynak: ${p.dosya}:${p.satir}`];
  return satirlar.join("\n");
}

/**
 * Bir grup satırının pano metni: başlık, ardından altındaki her kaydın bloğu.
 * Grup satırı kopyalanınca kullanıcı bütün alt kayıtları tek seferde alır;
 * bloklar boş satırla ayrılır ve hiçbir kayıt elenmez.
 */
export function panoKumeMetni(baslik: string, bloklar: readonly string[]): string {
  return [baslik, "", ...bloklar].join("\n\n").trimEnd();
}

/**
 * Kopyalama komutunun kullanıcıya görünen adı — sağ tık menüsünde okunur.
 *
 * EMOJİ TAŞIMAZ (YUZ-4.2): görüntü yüzleri kaynak düzeyindeki Unicode emoji
 * sözlüğünden bağımsız, kilitli bir işaret setiyle konuşur ve işaret metinsel
 * etiketi ikame edemez. Menü girdisinin simgesini paket bildirimi verir; cümle
 * yalnız ne yapıldığını söyler.
 */
export function panoyaKopyalaBasligi(): string {
  return yuzeyMetni("Satırı panoya kopyala", "Copy row to clipboard");
}

/** Kopyalama başarıyla bittiğinde durum çubuğunda bir süre duran cümle. */
export function panoyaYazildi(satirSayisi: number): string {
  return satirSayisi === 1
    ? yuzeyMetni("Satır panoya kopyalandı.", "Row copied to the clipboard.")
    : yuzeyMetni(`${satirSayisi} satır panoya kopyalandı.`, `${satirSayisi} rows copied to the clipboard.`);
}

/** Kopyalanacak bir satır bulunamadığında gösterilen cümle. */
export function panoyaKopyalanacakSatirYok(): string {
  return yuzeyMetni(
    "Kopyalanacak satır bulunamadı. Kopyalamak istediğiniz satıra sağ tıklayın ve menüden seçin.",
    "No row was found to copy. Right-click the row you want and choose the command from the menu.",
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 📊 DURUM ÇUBUĞU — dört yüzeyin sayısı (VIT-GRAF-A13)
//
//   Founder hükmü 2026-07-28: dört yüzey de durum çubuğunda görünsün, girdi
//   tıklanınca ilgili panel açılsın ve SAYI SIFIRKEN DE KAYBOLMASIN — çünkü
//   sıfır da bir bilgidir ve kullanıcı sayacın çalıştığını görmelidir.
//
//   Metinler burada yaşar, sayılar burada YAŞAMAZ: durum çubuğu kendi taramasını
//   kurmaz ve kendi sayacını tutmaz, panellerin zaten tuttuğu sayıları okur.
// ═══════════════════════════════════════════════════════════════════════════

/** Durum çubuğu girdisinin ipucu cümlesi — hangi yüzey, kaç kayıt, tıklayınca ne olur. */
export function durumCubuguIpucu(yuzeyAdi: string, adet: number, eylem: string): string {
  const sayi = adet === 0
    ? yuzeyMetni(`Sarmal · ${yuzeyAdi}: şu anda hiçbir kayıt yok.`, `Sarmal · ${yuzeyAdi}: no records right now.`)
    : yuzeyMetni(`Sarmal · ${yuzeyAdi}: ${adet === 1 ? "bir" : adet} kayıt.`, `Sarmal · ${yuzeyAdi}: ${adet === 1 ? "one record" : `${adet} records`}.`);
  return `${sayi}\n${eylem}`;
}

/** Durum çubuğunda görünen yüzeylerin adları ve tıklama vaadi. */
export const DURUM_CUBUGU_METINLERI = {
  get sorunlar(): { ad: string; eylem: string } { return { ad: yuzeyMetni("Sorunlar", "Problems"), eylem: yuzeyMetni("Tıklayınca Problems paneli açılır.", "Select to open the Problems panel.") }; },
  get gözlemler(): { ad: string; eylem: string } { return { ad: yuzeyMetni("Gözlemler", "Observations"), eylem: yuzeyMetni("Tıklayınca Gözlemler paneli açılır.", "Select to open the Observations panel.") }; },
  get hatırlatıcılar(): { ad: string; eylem: string } { return { ad: yuzeyMetni("Hatırlatıcılar", "Reminders"), eylem: yuzeyMetni("Tıklayınca Hatırlatıcılar paneli açılır.", "Select to open the Reminders panel.") }; },
  get fikirler(): { ad: string; eylem: string } { return { ad: yuzeyMetni("Fikirler", "Ideas"), eylem: yuzeyMetni("Tıklayınca Fikirler paneli açılır.", "Select to open the Ideas panel.") }; },
  get postaKutusu(): { ad: string; eylem: string } { return { ad: yuzeyMetni("Onaylar", "Approvals"), eylem: yuzeyMetni("Tıklayınca Onaylar paneli açılır.", "Select to open the Approvals panel.") }; },
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// 🪧 TABAN KANON İŞARETİ (EKL-F6-A04) — sessiz düşüşün sonu
//
//   Kanon kaydı bulunamadığında eklenti gömülü taban kanonla çalışır. Bu durum
//   kullanıcıdan gizlenemez, çünkü renkler ve ipuçları çalışmaya devam ettiği
//   için kullanıcı gördüğü tip sisteminin kendi projesine ait olduğunu sanır.
//   İşaret durum çubuğunda yaşar: görünür fakat işi kesmez ve kanon bulunduğu
//   anda kendiliğinden kaybolur.
// ═══════════════════════════════════════════════════════════════════════════

export const TABAN_KANON_METINLERI = {
  /** Durum çubuğu girdisinin kendisi — ikon codicon ailesindendir. */
  get cubukMetni(): string {
    return `$(warning) ${yuzeyMetni("Sarmal: taban kanon", "Sarmal: built-in canon")}`;
  },
  /** İpucu sebebi ve çözümü tam cümlelerle söyler. */
  cubukIpucu(belgeYolu?: string): string {
    const baslik = yuzeyMetni(
      "Bu çalışma alanında bir tip sistemi kaydı bulunamadı; Sarmal gömülü taban kanonla çalışıyor.",
      "No type system record was found in this workspace, so Sarmal is running on its built-in canon.");
    const cozum = yuzeyMetni(
      "Projenizin kendi tipleri görünsün istiyorsanız varlık kökünüzde bir *_anadizin.sar ilanı ile oz/siniflama/kayit.json dosyasının bulunması yeterlidir.",
      "To see your own project types, declare an entity root with a *_anadizin.sar file that carries oz/siniflama/kayit.json.");
    const belge = belgeYolu
      ? yuzeyMetni(`Son ölçüm şu belge için yapıldı: ${belgeYolu}`, `The latest measurement was taken for this document: ${belgeYolu}`)
      : undefined;
    return [baslik, cozum, belge].filter((s): s is string => Boolean(s)).join("\n");
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// 📬 POSTA KUTUSU — Founder onayı bekleyen kapıların panel metinleri
//
//   Kapı kayıtları motorun tanı akışından gelmez; onay tarayıcısından gelir.
//   Metinleri yine de bu katalogda yaşar, çünkü çevrilecek tek dosya budur ve
//   panel sağlayıcısına gömülen bir şablon dizesi ikinci bir metin evreni açar.
//
//   AŞAĞIDAKİ İKİ SINIR İŞARETİ BİR NÖBETİN ERİŞİMİDİR, süs değildir. Emoji
//   nöbeti (`onay-yuzeyleri.test.ts`) bu iki işaret arasındaki HER dizgiyi
//   süpürür; elle seçilmiş bir liste tutmaz. Gerekçe ölçülmüştür: adı yüzeyin
//   tamamını iddia eden fakat erişimi elle sayılmış birkaç metinle sınırlı olan
//   bir nöbet, ertesi gün eklenen metni yeşilden geçirir ve iddiasını yalanlar.
//   Buraya yeni bir onay metni eklendiğinde nöbet onu kendiliğinden kapsar.
// ═══════════════════════════════════════════════════════════════════════════
// NÖBET-SINIRI: ONAY-YÜZEYİ-METİNLERİ BAŞLANGIÇ

/** Dosya satırının yanındaki gri açıklama — o dosyada kaç kapı beklediği. */
export function postaDosyaAciklamasi(adet: number, proje?: string): string {
  const sayi = adet === 1
    ? yuzeyMetni("1 kapı", "1 gate")
    : yuzeyMetni(`${adet} kapı`, `${adet} gates`);
  // PROJE ADI SAYININ ÖNÜNDE DURUR ve bu bilinçlidir: satır kesildiğinde önce
  // sonu kaybolur, dolayısıyla dar panelde kaybolması gereken sayı, kalması
  // gereken ise aidiyettir. Proje çözülemezse satır yalnız sayıyı söyler;
  // uydurma bir ad basılmaz.
  return proje ? `${proje} · ${sayi}` : sayi;
}

/**
 * Dosya satırının ipucu metni. MUTLAK YOL BURADA YAŞAR: etikette dosyanın
 * yalnız adı görünür, çünkü ağaç satırı kesildiğinde her zaman anlamlı olan
 * son kısım kaybolur (Founder canlı bulgusu 2026-07-28, Bildirimler panelinde
 * ölçüldü). Yolun tamamına ihtiyaç duyan kullanıcı onu ipucunda bulur.
 */
export function postaDosyaIpucu(dosya: string, adet: number): string {
  return yuzeyMetni(
    `Bu dosyada ${adet === 1 ? "bir" : adet} kapı kararını bekliyor.\n\nKaynak: ${dosya}`,
    `${adet === 1 ? "One gate is" : `${adet} gates are`} awaiting a decision in this file.\n\nSource: ${dosya}`,
  );
}

/**
 * Tek bir kapının ağaç etiketi: önce kapının kimliği, sonra Adımın amacı.
 * Kimlik burada öne alınır, çünkü kullanıcı kararı kimliğe göre arar ve
 * kimliği kararın kaydında yeniden görür; amaç cümlesi kimliği tamamlar.
 */
export function postaKapiEtiketi(kod: string, ne: string): string {
  const amac = yolusuzlastir(ne).trim();
  const tam = amac ? `${kod} — ${amac}` : yuzeyMetni(`${kod} — amacı yazılmamış Adım`, `${kod} — Step with no stated purpose`);
  return tam.length > 120 ? `${tam.slice(0, 117)}…` : tam;
}

/** Kapı satırının yanındaki gri açıklama — dosya adı ve satır numarası. */
export function postaKapiAciklamasi(dosyaAdi: string, satir: number): string {
  return `${dosyaAdi}:${satir}`;
}

/**
 * Kapının ipucu metni. Kararı vermek için gereken her şey burada durur: kapının
 * kimliği, Adımın amacı, onayı şart koşan kabul ölçütü ve kaynağın tam konumu.
 * Kullanıcı dosyayı açmadan neye karar vereceğini okur.
 */
export function postaKapiIpucu(p: {
  kod: string;
  ne: string;
  olcut: string;
  dosya: string;
  satir: number;
}): string {
  return yuzeyMetni(
    [`**${p.kod}** kararınızı bekliyor.`, "", p.ne ? `**Adımın amacı:** ${p.ne}` : "**Adımın amacı:** yazılmamış.", "", `**Onay isteyen ölçüt:**\n> ${p.olcut}`, "", `Kaynak: ${p.dosya}:${p.satir}`, "", "Tek tıkla bu satır açılır ve Adım kaynağında önizleme sekmesinde gösterilir; odak panelde kalır. Hemen altında panelin kendi gerekçe kutusu açılır, onun altında da üç karar satırı durur: onayla, şerhle onayla ya da reddet."].join("\n"),
    [`**${p.kod}** is awaiting a decision.`, "", p.ne ? `**Step purpose:** ${p.ne}` : "**Step purpose:** not stated.", "", `**Criterion requiring approval:**\n> ${p.olcut}`, "", `Source: ${p.dosya}:${p.satir}`, "", "Select this row to open it and show the Step source in a preview tab while focus remains in the panel. The panel's rationale box appears directly below it, followed by three decision rows: approve, approve with note, or reject."].join("\n"),
  );
}

/**
 * Karar satırının ipucu metni. Bu satırların bugüne kadar HİÇ ipucu yoktu:
 * kullanıcı kapı satırının "kararın sorulur" vaadini okuyup tıklıyor, altında
 * ipucusuz satırlar buluyordu (ölçülmüş Kusur 5). Her satır artık ne yapacağını,
 * not isteyip istemediğini ve kaydın nereye yazıldığını kendisi söyler.
 *
 * METİN YENİ YERLEŞİMİ ANLATIR (Founder ekran görüntüsü 2026-07-29): gerekçe
 * kutusu kapının hemen altında, ÜÇ SEÇENEĞİN ÜSTÜNDE durur ve üçünün ORTAK
 * girdisidir. Artık hiçbir aşamada pencerenin tepesinde bir giriş kutusu açılmaz.
 */
export function postaKararIpucu(p: {
  kod: string; damga: string; notIster: boolean;
}): string {
  const notTr = p.notIster
    ? "Gerekçeyi bu satırın hemen ÜSTÜNDEKİ kutuya, panelin içinde yazarsın ve " +
      "gerekçe zorunludur; kutu boşken bu satır hiçbir şey yazmaz. Kapı açılınca " +
      "imleç kutuya kendiliğinden gelir; Escape ya da Shift+Tab seni kutudan " +
      "çıkarıp kapı satırına döndürür (kapı açık kalır, yazdığın durur), kapı " +
      "satırındaki ikinci Escape ise kapıyı kapatır. Hiçbiri kayıt yazmaz. "
    : "Ek bir soru sorulmaz. Üstteki kutuda yazılmış bir gerekçe varsa bu satır " +
      "yine de yazmaz ve seni uyarır; gerekçeli onay için şerh satırını seç. ";
  const notEn = p.notIster
    ? "Write the required rationale in the box immediately ABOVE this row, inside the panel. This row writes nothing while the box is empty. When the gate opens, focus moves to the box. Escape or Shift+Tab returns to the gate row without writing or discarding text; a second Escape on the gate row closes it. "
    : "No additional question is asked. If the box above contains a rationale, this row writes nothing and warns you; choose the noted-approval row instead. ";
  return yuzeyMetni(
    `**${p.kod}** kapısına "${p.damga}" hükmünü yazar. ${notTr}Karar, Adımın kendi satırına \`onay: "${p.damga} — tarih"\` kaydı olarak işlenir ve ancak kayıt diskten geri okunduktan sonra başarı bildirilir.`,
    `Writes the "${p.damga}" ruling to gate **${p.kod}**. ${notEn}The decision is written to the Step's own row as \`onay: "${p.damga} — date"\` and success is reported only after the record is read back from disk.`,
  );
}

/**
 * Bağlam kopyalama satırının etiketi ve ipucu (VIT-POSTA-A04). Founder canlı
 * bulgusu 2026-08-04: kapı satırları düğme öğesiyle basıldığı için panel metni
 * seçilemiyor ve Kopyala boş seçim üzerinde sessizce hiçbir şey yapmıyordu.
 * Asıl niyet kapının bağlamını karar için asistan sohbetine taşımaktı; her kapı
 * bu yüzden açık bir kopyalama eylemi taşır.
 */
export function postaKopyaEtiketi(): string {
  return yuzeyMetni("Bağlamı kopyala", "Copy context");
}

export function postaKopyaIpucu(kod: string): string {
  return yuzeyMetni(
    `**${kod}** kapısının tam bağlamını (kimlik, kaynak konumu, Adımın durumu, amacı ve onay isteyen ölçüt) panoya kopyalar. Hiçbir karar yazmaz; kopyaladığın bloğu karar vermek için asistan sohbetine ya da başka bir yere yapıştırabilirsin.`,
    `Copies the full context of gate **${kod}** (identity, source location, Step status, purpose and the criterion requiring approval) to the clipboard. It writes no decision; paste the copied block into an assistant chat or anywhere else to reason about it.`,
  );
}

/**
 * Panoya yazılan bağlam bloğu. Blok okunurdur ve tam cümlelidir: kapının
 * kimliği, kaynak konumu, Adımın durumu, amacı ve onay isteyen ölçüt. Koşu ve
 * onay tarihçesi panelin defterinde YAŞAMAZ (onay kaydı yazılmış Adım kuyruğa
 * hiç girmez); blok bu yüzden var olmayan bir tarihçe uydurmaz.
 */
export function postaKapiBaglami(p: {
  kod: string; ne: string; olcut: string; dosya: string; satir: number; durum: string;
}): string {
  return yuzeyMetni(
    [
      `${p.kod} kapısı Founder kararını bekliyor.`,
      `Kaynak konumu: ${p.dosya}:${p.satir}`,
      `Adımın durumu: ${p.durum}`,
      p.ne ? `Adımın amacı: ${p.ne}` : "Adımın amacı kaynakta yazılmamış.",
      `Onay isteyen kabul ölçütü: ${p.olcut}`,
    ].join("\n"),
    [
      `Gate ${p.kod} is awaiting the Founder's decision.`,
      `Source location: ${p.dosya}:${p.satir}`,
      `Step status: ${p.durum}`,
      p.ne ? `Step purpose: ${p.ne}` : "The Step's purpose is not stated in the source.",
      `Acceptance criterion requiring approval: ${p.olcut}`,
    ].join("\n"),
  );
}

/** Kopyalama bildirimi. Kapının KODU geçer: kullanıcı hangi kapıyı taşıdığını görür. */
export function postaBaglamKopyalandi(kod: string): string {
  return yuzeyMetni(
    `${kod} kapısının bağlamı panoya kopyalandı.`,
    `The context of gate ${kod} was copied to the clipboard.`,
  );
}

/** Kapı defterden düşmüşse panoya hiçbir şey yazılmaz ve sebep açıkça söylenir. */
export function postaBaglamKapiYok(kod: string): string {
  return yuzeyMetni(
    `${kod} kapısının bağlamı kopyalanamadı, çünkü kapı panelin defterinde artık bulunmuyor; bu arada karara bağlanmış olabilir. Panoya hiçbir şey yazılmadı.`,
    `The context of gate ${kod} could not be copied because the gate is no longer in the panel's ledger; it may have been decided meanwhile. Nothing was written to the clipboard.`,
  );
}

/** Panel başlığındaki sayı rozetinin ipucu cümlesi. */
/**
 * Hatırlatıcılar panelinin sayı rozetindeki ipucu.
 *
 * Rozetler bilerek AYNI biçimde konuşur: sayı ile o sayının neyi saydığı. Founder
 * dört panelin sayısını bir arada okur ve dördü farklı cümle kurarsa okuma her
 * seferinde yeniden öğrenilir.
 */
export function hatirlaticiRozetIpucu(adet: number): string {
  return adet === 1
    ? yuzeyMetni("Bir açık hatırlatıcı var.", "One open reminder.")
    : yuzeyMetni(`${adet} açık hatırlatıcı var.`, `${adet} open reminders.`);
}

/** Gözlemler panelinin sayı rozetindeki ipucu. */
export function gozlemRozetIpucu(adet: number): string {
  return adet === 1
    ? yuzeyMetni("Bir gözlem var.", "One observation.")
    : yuzeyMetni(`${adet} gözlem var.`, `${adet} observations.`);
}

/** Fikirler panelinin sayı rozetindeki ipucu. */
export function fikirRozetIpucu(adet: number): string {
  return adet === 1
    ? yuzeyMetni("Bir fikir var.", "One idea.")
    : yuzeyMetni(`${adet} fikir var.`, `${adet} ideas.`);
}

/** Fikirler panelindeki proje satırının gri açıklaması. */
export function fikirProjeAciklamasi(adet: number): string {
  return adet === 1
    ? yuzeyMetni("1 fikir", "1 idea")
    : yuzeyMetni(`${adet} fikir`, `${adet} ideas`);
}

/** Fikirler panelindeki proje satırının ipucu metni. */
export function fikirProjeIpucu(ad: string, kod: string, adet: number): string {
  const sayi = adet === 1
    ? yuzeyMetni("1 fikir", "1 idea")
    : yuzeyMetni(`${adet} fikir`, `${adet} ideas`);
  return yuzeyMetni(
    `**${ad}** · \`${kod}\`\n\nBu projede ${sayi} bekliyor.`,
    `**${ad}** · \`${kod}\`\n\nThis project holds ${sayi}.`,
  );
}

export function postaRozetIpucu(adet: number): string {
  return adet === 1
    ? yuzeyMetni("Bir kapı kararını bekliyor.", "One gate is awaiting a decision.")
    : yuzeyMetni(`${adet} kapı kararını bekliyor.`, `${adet} gates are awaiting a decision.`);
}

/**
 * KAPI SATIRININ komutunun kullanıcıya görünen adı (Founder hükmü 2026-07-29:
 * ayrı bir "Kapıya git" çocuğu yoktur, işi kapı satırının kendisi yapar).
 *
 * Eski ad "Kapıya git ve kararını ver" idi ve YALAN SÖYLÜYORDU: o satır yalnız
 * dosyayı açıyor, hiçbir karar sormuyordu. Vaadi tutulmayan bir arayüz, doğru
 * çalışsa bile "bozuk" hükmünü alır.
 */
export function kapiyaGitBasligi(): string {
  return yuzeyMetni("Adımı kaynakta aç", "Open Step in source");
}

// ═══════════════════════════════════════════════════════════════════════════
// 🧭 KARAR YAZICISININ METİNLERİ (panel içi karar · 2026-07-29 onarım turu)
//
//   COMMENTS KARAR PENCERESİ GÖRÜNÜR AKIŞTAN EMEKLİYE AYRILDI. Ölçüm (prob 5)
//   şunu gösterdi: "Kapıya git" satırı çizilmeyen bir Comments iş parçacığı
//   kuruyor (`canlı yüzey: 1`), kullanıcı dosyaya gidiyor ve orada boşluk
//   buluyor. Denetleyici KİMLİĞİ (`sarmal-onay`) korunur — kullanıcının menü
//   koşulları ona bağlıdır — fakat görünür karar nesnesi üretilmez. Karar
//   yüzeyine ait karşılama, etiket ve kurulum hatası metinleri bu yüzden
//   katalogdan düştü: kullanıcıya görünmeyen metin katalogda yaşamaz.
//
//   Yerlerine yazıcının GERÇEKTEN gösterdiği metinler geldi. Her çıkış yolu ya
//   kanıtlı başarıdır ya açık hatadır; hiçbiri sessiz değildir.
// ═══════════════════════════════════════════════════════════════════════════

/** Comments denetleyicisinin KULLANICIYA GÖRÜNEN adı — kuyruk çağrıştırmaz. */
export function etkinKararAdi(): string {
  return yuzeyMetni("Sarmal Etkin Karar", "Sarmal Active Decision");
}

/** Onaylar panelini açan komutun kullanıcıya görünen adı. */
export function postaKutusunuAcBasligi(): string {
  return yuzeyMetni(
    "Onaylar panelini aç (Founder kararını bekleyen kapılar)",
    "Open the Approvals panel (gates awaiting the Founder's decision)",
  );
}

/** Kirli belge çatışmasının üç seçeneği — metinler tek kaynakta yaşar. */
export const CATISMA_SECENEKLERI = {
  get kaydet(): string { return yuzeyMetni("Taslağı kaydet ve kararı işle", "Save the draft and apply the decision"); },
  get kapıyaGit(): string { return yuzeyMetni("Kapıya git", "Go to gate"); },
  get iptal(): string { return yuzeyMetni("İptal", "Cancel"); },
} as const;

/**
 * Kirli belge çatışması. Bu soru YALNIZ hedef belge gerçekten kaydedilmemiş
 * düzenleme taşıdığında çıkar. Temiz belgede hiç çıkmaz — her geçişte çıkan bir
 * onay, onay olmaktan çıkar (Founder hükmü 2026-07-28).
 */
export function kirliBelgeSorusu(kod: string, dosyaAdi: string): string {
  return yuzeyMetni(
    `"${dosyaAdi}" dosyasında kaydedilmemiş değişikliklerin var. ${kod} kapısının kararını işlemek için bu dosyanın kaydedilmesi gerekir ve kaydetme senin taslağını da diske indirir. Ne yapmak istersin?`,
    `"${dosyaAdi}" has unsaved changes. Applying the decision for gate ${kod} requires saving the file, which will also write your draft to disk. What would you like to do?`,
  );
}

/** Aynı kapı hâlâ işlenirken gelen ikinci tıklama. */
export function kararUcusta(kod: string): string {
  return yuzeyMetni(
    `${kod} kapısının kararı zaten işleniyor. İkinci tıklama işleme alınmadı; sonucu bekle, kapı ya listeden düşecek ya da açık bir hata göreceksin.`,
    `The decision for gate ${kod} is already being applied. The second selection was ignored; wait for the result and the gate will either leave the list or show an explicit error.`,
  );
}

/**
 * Hedef kapı dosya+kod ile bulunamadı — çoğu zaman KAPI ÇOKTAN KARARA BAĞLANMIŞTIR.
 *
 * Eski cümle teknikti ve kullanıcıyı suçlar gibiydi ("Karar İŞLENEMEDİ").
 * Founder bu cümleyi 2026-07-29'da canlı gördü ve haklı olarak kusur saydı:
 * kullanıcı yanlış bir şey yapmamıştı, panel ona BAYAT bir satır göstermişti ve
 * o satıra tıklamıştı. Yeni cümle üç şeyi söyler ve hiçbiri suçlayıcı değildir:
 * ① büyük olasılıkla kararın zaten verilmiştir, ② hiçbir şey bozulmadı ve ikinci
 * bir kayıt yazılmadı, ③ panel kendini tazeledi, satır kendiliğinden düşecek.
 */
export function kararKapiYok(kod: string): string {
  return yuzeyMetni(
    `${kod} artık kararını beklemiyor — bu kapı büyük olasılıkla zaten karara bağlanmıştı ve Adım'ın kendi satırında onay kaydı duruyor. Hiçbir şey bozulmadı, ikinci bir kayıt yazılmadı; yanlış yere yazmaktansa durduk. Panel tazelendi, satır kendiliğinden düşüyor.`,
    `${kod} is no longer awaiting a decision. This gate was probably already decided and its approval record is on the Step's own row. Nothing was damaged and no duplicate record was written; writing to the wrong place was refused. The panel has refreshed and the row will disappear.`,
  );
}

/**
 * Aynı dosyada aynı kod birden çok kez bulundu. Yazım DURUR: kimlik belirsizken
 * hangi Adıma yazılacağını tahmin etmek, sessiz yanlış yazımın ta kendisidir.
 */
export function kararKimlikCakismasi(kod: string, adet: number, dosyaAdi: string): string {
  return yuzeyMetni(
    `Karar YAZILMADI — "${dosyaAdi}" dosyasında ${kod} kodu ${adet} kez geçiyor ve hangi Adıma yazılacağı belirsiz. Kodlardan birini benzersiz yapıp yeniden dene; belirsiz kimlikte tahmin yürütmek yanlış Adıma karar yazardı.`,
    `Decision NOT WRITTEN — code ${kod} occurs ${adet} times in "${dosyaAdi}", so the target Step is ambiguous. Make one code unique and try again; guessing could write the decision to the wrong Step.`,
  );
}

/** `applyEdit` reddedildi ya da bir sözle patladı. */
export function kararUygulanamadi(kod: string, neden: string): string {
  return yuzeyMetni(
    `Karar İŞLENEMEDİ — ${kod}: düzenleme uygulanamadı (${neden}). Dosya bu sırada değişmiş olabilir. Kapı Onaylar panelinde duruyor; yeniden dene.`,
    `Decision COULD NOT BE APPLIED — ${kod}: the edit failed (${neden}). The file may have changed meanwhile. The gate remains in the Approvals panel; try again.`,
  );
}

/** `doc.save()` doğru dönmedi. Başarı bildirilmez; kapı listede kalır. */
export function kararKaydedilemedi(kod: string, neden: string, geriAlindi: boolean): string {
  return yuzeyMetni(
    `Karar DİSKE YAZILAMADI — ${kod}: kaydetme başarısız oldu (${neden}). ${geriAlindi ? "Bellekteki ek geri alındı, dosyan karar öncesindeki hâlinde. " : "Bellekteki ek geri ALINAMADI; dosyayı aç ve durum satırını gözle kontrol et. "}Kapı Onaylar panelinde kararını beklemeye devam ediyor.`,
    `Decision NOT WRITTEN TO DISK — ${kod}: save failed (${neden}). ${geriAlindi ? "The in-memory addition was reverted and the file is back to its pre-decision state. " : "The in-memory addition COULD NOT be reverted; open the file and inspect the status row. "}The gate remains in the Approvals panel.`,
  );
}

/** Bellekteki değer beklenen karar metnine eşit değil. */
export function kararBellekUyusmazligi(kod: string, beklenen: string, bulunan: string): string {
  return yuzeyMetni(
    `Karar DOĞRULANAMADI — ${kod}: yazımdan sonra bellekte beklenen kayıt yok. Beklenen: "${beklenen}" · bulunan: "${bulunan || "hiçbir onay kaydı"}". Dosyayı aç, durum satırını gözle kontrol et; başarı bildirilmedi.`,
    `Decision COULD NOT BE VERIFIED — ${kod}: the expected record is absent from memory after writing. Expected: "${beklenen}" · found: "${bulunan || "no approval record"}". Open the file and inspect the status row; success was not reported.`,
  );
}

/** Hedefli disk okuması beklenen değeri vermedi. */
export function kararDiskUyusmazligi(kod: string, beklenen: string, bulunan: string): string {
  return yuzeyMetni(
    `Karar DİSKTE DOĞRULANAMADI — ${kod}: aynı dosya geri okundu ve beklenen kayıt bulunamadı. Beklenen: "${beklenen}" · diskte: "${bulunan || "hiçbir onay kaydı"}". Karar başarılı sayılmadı; kapı listede duruyor.`,
    `Decision COULD NOT BE VERIFIED ON DISK — ${kod}: the file was read back and the expected record was absent. Expected: "${beklenen}" · on disk: "${bulunan || "no approval record"}". The decision was not considered successful and the gate remains listed.`,
  );
}

/**
 * Belge ya da diskteki dosya ayrıştırılamıyor. "Kapı listede yok" ile AYNI ŞEY
 * DEĞİLDİR (VIT-POSTA-A02 · Kusur 2): ayrıştırma hatasında kapı listesi zaten
 * boşalır ve eski doğrulama bozulan dosya için başarı bildiriyordu. Yazım
 * sonrası evrelerde kullanıcıya dosyanın bozulmuş olabileceği AÇIKÇA söylenir.
 */
export function kararBelgeAyrisilamadi(
  kod: string, evre: "yazımÖncesi" | "bellek" | "disk",
): string {
  if (evre === "yazımÖncesi") {
    return yuzeyMetni(
      `${kod} işlenemedi — dosya şu anda ayrıştırılamıyor, söz dizimi kırık görünüyor. Bu, kapının kapandığı anlamına gelmez; hiçbir karar yazılmadı. Dosyayı açıp söz dizimini onardıktan sonra yeniden dene.`,
      `${kod} could not be applied because the file cannot currently be parsed and its syntax appears broken. This does not mean the gate closed; no decision was written. Repair the syntax and try again.`,
    );
  }
  const yerTr = evre === "bellek" ? "editördeki belge" : "diskteki dosya";
  const yerEn = evre === "bellek" ? "the document in the editor" : "the file on disk";
  return yuzeyMetni(
    `Karar DOĞRULANAMADI — ${kod}: yazımdan sonra ${yerTr} ayrıştırılamıyor ve dosya BOZULMUŞ OLABİLİR. Bu bir başarı değildir: kapının listeden düşmesi kararın işlendiğini değil, belgenin okunamadığını gösterir. Dosyayı aç, durum satırını gözle kontrol et ve gerekirse son değişikliği geri al.`,
    `Decision COULD NOT BE VERIFIED — ${kod}: after writing, ${yerEn} cannot be parsed and the file MAY BE DAMAGED. This is not success: the gate leaving the list can mean the document became unreadable. Open the file, inspect the status row and undo the last change if necessary.`,
  );
}

/**
 * Ekleme noktası kaynak metinle bayt düzeyinde doğrulanamadı (Kusur 1). Nokta bir
 * hesaptır ve hesap yalnız tırnaksız durum değerinde doğrudur; uymayan noktaya
 * yazmak dosyayı sessizce bozardı. Hiçbir şey yazılmaz ve nedeni söylenir.
 */
export function kararEklemeNoktasiDogrulanamadi(
  kod: string, beklenen: string, bulunan: string,
): string {
  return yuzeyMetni(
    `Karar YAZILMADI — ${kod}: ekleme noktası kaynak metinle doğrulanamadı. Noktanın hemen önünde "${beklenen}" metni beklenirdi; "${bulunan}" bulundu. Bu noktaya yazmak dosyayı bozabilirdi, bu yüzden hiçbir şey değiştirilmedi. Durum değeri tırnaklı ya da alışılmadık biçimde olabilir; kaydı Adım satırına elle işleyebilir ya da durum değerini tırnaksız yazıp yeniden deneyebilirsin.`,
    `Decision NOT WRITTEN — ${kod}: the insertion point could not be verified against source text. "${beklenen}" was expected immediately before it; "${bulunan}" was found. Writing there could damage the file, so nothing changed. The status value may be quoted or unusually formatted; write the record on the Step row manually or use an unquoted status and try again.`,
  );
}

/**
 * `onayBekler` alanı kaldırılamadı (Founder hükmü · 2026-08-29). İki yol bu
 * mesaja çıkar: silme aralığı yazımdan ÖNCE kaynakla doğrulanamadı (o hâlde
 * hiçbir şey yazılmamıştır) ya da yazımdan SONRA alan hâlâ duruyor (o hâlde
 * kayıt diske inmiştir ve alan elle kaldırılmalıdır). Metin ikisini de karşılar,
 * çünkü kullanıcıya söylenmesi gereken tek şey aynıdır: düğüm bugün iki beyanı
 * birden taşıyabilir ve kaynağın dürüstlüğü elle geri kurulmalıdır.
 */
export function kararBeklerKaldirilamadi(
  kod: string, beklenen: string, bulunan: string,
): string {
  return yuzeyMetni(
    `${kod}: onayBekler alanı kaldırılamadı. Beklenen "${beklenen}"; bulunan "${bulunan}". Onay yazıldığında bu alanın kalkması gerekir, çünkü bekleme ilanı ile verilmiş karar aynı düğümde birlikte duramaz. Alanı Adım satırından elle kaldır ve kaynağı bir kez daha denetle.`,
    `${kod}: the onayBekler field could not be removed. Expected "${beklenen}"; found "${bulunan}". The field must disappear when an approval is written, because a pending declaration and a recorded decision cannot coexist on one node. Remove the field from the Step row by hand and audit the source once more.`,
  );
}

/** Kanıtlı başarı: üç kanıt da alındıktan sonra basılır. Metin işaretsizdir
 *  (YUZ-4.2): arayüz işareti emojiyle değil, yüzeyin kendi ikon ailesiyle
 *  verilir ve bildirim kutusunda zaten ikon yeri yoktur. */
export function kararBasarili(kod: string, damga: string): string {
  return yuzeyMetni(
    `Karar işlendi ve diskte doğrulandı — ${kod}: ${damga}`,
    `Decision applied and verified on disk — ${kod}: ${damga}`,
  );
}

/** Gerekçe kutusu Escape ile kapatıldı — sessizlik yasaktır, durum çubuğunda söylenir. */
export function kararIptalEdildi(kod: string): string {
  return yuzeyMetni(
    `${kod} için karar verilmedi — kapı Onaylar panelinde duruyor.`,
    `No decision was made for ${kod}; the gate remains in the Approvals panel.`,
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ✍️ PANEL İÇİ GEREKÇE KUTUSUNUN METİNLERİ (Founder yerleşimi 2026-07-29)
//
//   Kutu kapı satırının hemen altında, üç seçeneğin ÜSTÜNDE durur ve üçünün
//   ortak girdisidir. Metinler burada yaşar, çünkü çevrilecek tek dosya budur ve
//   gövdeye gömülen bir şablon dizesi ikinci bir metin evreni açardı.
// ═══════════════════════════════════════════════════════════════════════════

/** Kutunun üstündeki etiket — ne için yazıldığını söyler. */
export function notBasligi(): string {
  return yuzeyMetni("Gerekçe (şerh ve ret için zorunlu):", "Rationale (required for noted approval and rejection):");
}

/** Boş kutunun içindeki yol gösterici cümle. */
export function notYerTutucu(): string {
  return yuzeyMetni(
    "Kısa bir cümle yeter. Düz onay için boş bırakabilirsin.",
    "A short sentence is enough. Leave blank for a plain approval.",
  );
}

/**
 * Şerh ve ret gerekçesi boş bırakılamaz. Aynı kural bugüne kadar `validateInput`
 * ile işliyordu; panel içi kutuda da aynen işler ve hata kullanıcının gözünün
 * önünde, kutunun hemen yanında görünür.
 */
export function gerekceZorunlu(): string {
  return yuzeyMetni(
    "Gerekçe zorunludur: yukarıdaki kutuya kısa bir cümle yaz. Kutu boşken şerh ve ret yazılmaz; gerekçesiz onaylamak istiyorsan Onayla satırını seç.",
    "A rationale is required: write a short sentence in the box above. Noted approval and rejection are not written while it is empty; choose Approve for an approval without rationale.",
  );
}

/**
 * Kutuda gerekçe varken düz onay seçildi.
 *
 * SESSİZ KAYIP YASAKTIR. Yazılmış metni atmak bu depoda bu hafta ölçülmüş bir
 * kusur ailesidir; düz onayı sessizce şerhe çevirmek ise daha kötüdür, çünkü
 * kullanıcının SEÇMEDİĞİ bir damgayı diske yazar ve yazılmış kayıt geriye dönük
 * yalanlanamaz. Üçüncü yol seçildi: yazım durur, metin yerinde kalır, ne
 * yapılacağı söylenir.
 */
export function gerekceArtik(): string {
  return yuzeyMetni(
    "Kutuda bir gerekçe yazılı. Düz onay gerekçe taşımaz ve yazdığın metni sessizce atmayız: gerekçeli onay istiyorsan Şerhle onayla satırını seç, gerekçesiz onaylamak istiyorsan kutuyu boşalt.",
    "The box contains a rationale. A plain approval carries no rationale and your text will not be discarded silently: choose Approve with note to keep it, or clear the box for an approval without rationale.",
  );
}

/**
 * Emekli Comments karar komutları çağrılırsa basılan uyumluluk cümlesi. Komut
 * kimlikleri korunur (kullanıcının menü koşulları onlara bağlıdır) fakat karar
 * artık panelde verilir.
 */
export function commentsEmekli(): string {
  return yuzeyMetni(
    "Karar artık Onaylar panelinde veriliyor: kapı satırını aç ve altındaki karar satırlarından birini seç. Açıklamalar panelindeki eski karar yüzeyi emekliye ayrıldı.",
    "Decisions are now made in the Approvals panel: expand the gate row and choose a decision below it. The former decision surface in Comments has been retired.",
  );
}

export const ONAY_YUZEY_METINLERI = {
  get bekliyorSus(): string { return yuzeyMetni("  📬  Founder onayını bekliyor", "  📬  awaiting Founder approval"); },
  hover: (kod: string, olcut: string): string => yuzeyMetni(
    `**${kod}** Founder onayını bekliyor — üstündeki lense tıklayın, bu kapı Onaylar panelinde seçili gelir; kararınızı orada Onayla, Şerhle onayla ya da Reddet satırlarından verirsiniz.\n\n**Onay isteyen ölçüt:**\n> ${olcut}`,
    `**${kod}** is awaiting Founder approval. Select the lens above to reveal this gate in the Approvals panel, then choose Approve, Approve with note, or Reject.\n\n**Criterion requiring approval:**\n> ${olcut}`,
  ),
  lensBasligi: (kod: string): string => yuzeyMetni(`${kod} — Founder onayı bekliyor · Onaylar panelinde aç`, `${kod} — awaiting Founder approval · open in Approvals`),
  get lensIpucu(): string { return yuzeyMetni("Bu kapı Onaylar panelinde seçili gelir ve satırı açılır; kararınızı orada verirsiniz (Onayla · Şerhle onayla · Reddet) ve kayıt Adım'a onay: olarak işlenir", "This gate is selected and expanded in the Approvals panel. Decide there (Approve · Approve with note · Reject); the record is written to the Step as onay:."); },
  paneldeBulunamadi: (kod: string): string => yuzeyMetni(`${kod} panelde bulunamadı — kuyruk henüz tazelenmemiş olabilir. Onaylar açıldı; kapı bir sonraki tazelemede görünür.`, `${kod} was not found in the panel; the queue may not have refreshed yet. Approvals was opened and the gate will appear on the next refresh.`),
  kararDosyasiOkunamiyor: (dosya: string): string => yuzeyMetni(`Karar işlenemedi — "${dosya}" okunamıyor. Dosya taşınmış ya da silinmiş olabilir.`, `The decision could not be applied because "${dosya}" cannot be read. The file may have been moved or deleted.`),
  kapiDosyasiOkunamiyor: (dosya: string): string => yuzeyMetni(`Kapı açılamadı — "${dosya}" okunamıyor. Dosya taşınmış ya da silinmiş olabilir; panel bir sonraki tazelemede düzelir.`, `The gate could not be opened because "${dosya}" cannot be read. The file may have been moved or deleted; the panel will correct itself on the next refresh.`),
  artikBeklemiyor: (kod: string): string => yuzeyMetni(`${kod} artık kararını beklemiyor — kapı bu arada kapanmış olabilir. Panel tazelendi.`, `${kod} is no longer awaiting a decision; the gate may have closed meanwhile. The panel has refreshed.`),
} as const;

// NÖBET-SINIRI: ONAY-YÜZEYİ-METİNLERİ BİTİŞ
// ═══════════════════════════════════════════════════════════════════════════
// ORTAK EKLENTİ KABUĞU — ileti, kanal ve kısa eylem metinleri
// ═══════════════════════════════════════════════════════════════════════════

export const EKLENTI_KABUK_METINLERI = {
  get performansKanali(): string { return yuzeyMetni("Sarmal Performans", "Sarmal Performance"); },
  get kararYuzeyiKanali(): string { return yuzeyMetni("Sarmal Karar Yüzeyi", "Sarmal Decision Surface"); },
  get geribildirimDenetleyicisi(): string { return yuzeyMetni("Sarmal Geribildirim", "Sarmal Feedback"); },
  get iskeletIcinBelgeGerekli(): string {
    return yuzeyMetni(
      "Sarmal: iskelet kurmak icin bir .sar dosyasi acik olmali.",
      "Sarmal: open a .sar file before building its scaffold.",
    );
  },
  get siniflamaBulunamadi(): string {
    return yuzeyMetni(
      "Sarmal: SNF-0 bulunamadi — iskelet kurulamadi.",
      "Sarmal: SNF-0 was not found, so the scaffold could not be built.",
    );
  },
  get giydirKlasorGerekli(): string {
    return yuzeyMetni(
      "🌀 Giydir çalışma alanı ister — önce bir klasör aç (ayarlar Workspace hedefine yazılır, kullanıcı ayarına değil).",
      "🌀 Dressing requires a workspace — open a folder first (settings are written to the Workspace target, not user settings).",
    );
  },
  get giydirildi(): string {
    return yuzeyMetni(
      "🎨 Çalışma alanı giydirildi — Sarmal görünümü bu çalışma alanında etkin (kullanıcı ayarına dokunulmadı).",
      "🎨 Workspace dressed — the Sarmal appearance is active in this workspace (user settings were not changed).",
    );
  },
  get eskiKopyaSaltOkunur(): string {
    return yuzeyMetni(
      "⚠️ Bu görünüm salt-okunur bir ESKİ kopya (git/zaman tüneli) — karar yalnız gerçek dosyada verilir. Dosyanın kendisini açıp yeniden dene.",
      "⚠️ This is a read-only HISTORICAL copy. Decisions can only be made in the current file; open that file and try again.",
    );
  },
} as const;

export const IZ_METINLERI = {
  denetimCoktu: (hata: string): string => yuzeyMetni(`⛔ denetim turu çöktü: ${hata}`, `⛔ validation run failed: ${hata}`),
  get eklentiEtkin(): string { return yuzeyMetni("🌀 Sarmal eklentisi etkin — .sar canlı denetim + tamamlama.", "🌀 Sarmal extension active — live .sar validation and completion."); },
  performansTuru: (p: { saat: string; sure: number; dosya: number; tetik: string; olaylar: string; suzulen: number; atlanan: number; ertelenen: number; belgeler?: string }): string => yuzeyMetni(
    `🔬 ${p.saat} denetim turu: ${p.sure} ms · ${p.dosya} dosya · tetik=${p.tetik} | aradaki olaylar: ${p.olaylar} · süzülen ${p.suzulen} · atlanan ${p.atlanan} · ertelenen ${p.ertelenen}${p.belgeler ? ` | ${p.belgeler}` : ""}`,
    `🔬 ${p.saat} validation run: ${p.sure} ms · ${p.dosya} files · trigger=${p.tetik} | intervening events: ${p.olaylar} · filtered ${p.suzulen} · skipped ${p.atlanan} · deferred ${p.ertelenen}${p.belgeler ? ` | ${p.belgeler}` : ""}`,
  ),
  // 📄 PRF-KP-A02: denetim turu satırının belge bölümü. Açma sayısı sabit
  // sıfırdır ve açıkça yazılır, çünkü turun belge açmadığı iddiası ancak gözle
  // okunur bir sayıyla doğrulanır; sayı sabittir, çünkü turun kabuğunda belge
  // açan bir üye yoktur ve olmaması tip düzeyinde zorlanır (tur-belgesi.ts).
  turBelgeleri: (p: { aciktan: number; diskten: number; atlanan: number; okunanBayt: number }): string => yuzeyMetni(
    `belgeler: açıktan ${p.aciktan} · diskten ${p.diskten} · atlanan ${p.atlanan} · açma 0 · okunan ${p.okunanBayt} bayt`,
    `documents: from editor ${p.aciktan} · from disk ${p.diskten} · skipped ${p.atlanan} · opened 0 · read ${p.okunanBayt} bytes`,
  ),
  get olayYok(): string { return yuzeyMetni("olay yok", "no events"); },
  izTuru: (saat: string, sure: number, tetik: string): string => yuzeyMetni(
    `🛰️ ${saat} iz turu: ${sure} ms · tetik=${tetik}`,
    `🛰️ ${saat} trace run: ${sure} ms · trigger=${tetik}`,
  ),
  panelTuru: (saat: string, sure: number, dosya: number, tetik: string): string => yuzeyMetni(
    `🗺️ ${saat} panel turu: ${sure} ms · ${dosya} dosya · tetik=${tetik}`,
    `🗺️ ${saat} panel run: ${sure} ms · ${dosya} files · trigger=${tetik}`,
  ),
  yavasGenisletme: (saat: string, detay: string): string => yuzeyMetni(
    `🐢 ${saat} yavaş genişletme: ${detay}`,
    `🐢 ${saat} slow expansion: ${detay}`,
  ),
  turCoktu: (tur: "panel" | "iz", hata: string): string => tur === "panel"
    ? yuzeyMetni(`⛔ panel turu çöktü: ${hata}`, `⛔ panel run failed: ${hata}`)
    : yuzeyMetni(`⛔ iz turu çöktü: ${hata}`, `⛔ trace run failed: ${hata}`),
  get onayKuruldu(): string { return yuzeyMetni("onay yüzeyi kuruldu · karar komutları kaydediliyor", "approval surface initialized · registering decision commands"); },
  kararSonucu: (kod: string, sonuc: string): string => yuzeyMetni(`karar sonucu · ${kod} · ${sonuc}`, `decision result · ${kod} · ${sonuc}`),
  get commentsEmekliYonlendirme(): string { return yuzeyMetni("emekli Comments karar komutu çağrıldı · Onaylar paneline yönlendiriliyor", "retired Comments decision command invoked · redirecting to Approvals"); },
  mercek: (kod: string): string => yuzeyMetni(`mercek · ${kod} · Onaylar panelinde gösteriliyor`, `lens · ${kod} · revealing in Approvals`),
  panelKarari: (kod: string, damga: string): string => yuzeyMetni(`panelden karar · ${kod} · ${damga}`, `decision from panel · ${kod} · ${damga}`),
  kararYazilmadi: (kod: string, neden: string): string => yuzeyMetni(`karar YAZILMADI · ${kod} · ${neden}`, `decision NOT WRITTEN · ${kod} · ${neden}`),
  kararIptal: (kod: string): string => yuzeyMetni(`karar İPTAL · ${kod}`, `decision CANCELLED · ${kod}`),
  kapiAyrisilamadi: (kod: string): string => yuzeyMetni(`kapı açılamadı · ${kod} · belge ayrıştırılamıyor`, `gate could not be opened · ${kod} · document cannot be parsed`),
  kapiAraniyor: (kod: string, adet: number): string => yuzeyMetni(`kapı aranıyor · ${kod} · belgede ${adet} kapı var`, `searching for gate · ${kod} · document contains ${adet} gates`),
  kapiBulunamadi: (kod: string): string => yuzeyMetni(`kapı BULUNAMADI · ${kod}`, `gate NOT FOUND · ${kod}`),
  komutlarKayitli: (panelBagli: boolean): string => yuzeyMetni(
    `komutlar kayıtlı · panel bağlı: ${panelBagli ? "evet" : "HAYIR"}`,
    `commands registered · panel connected: ${panelBagli ? "yes" : "NO"}`,
  ),
} as const;

export const ONAY_CEKIRDEK_METINLERI = {
  get mekanikOlcut(): string {
    return yuzeyMetni(
      "Adım kapanışını Founder onayına mekanik alanla bağlıyor (onayBekler: founder).",
      "This Step binds closure to Founder approval through the mechanical field `onayBekler: founder`.",
    );
  },
  get satirYok(): string { return yuzeyMetni("(satır yok)", "(line missing)"); },
  get nfcUyusmazligi(): string {
    return yuzeyMetni(
      "(satır NFC değil — normalizasyon uyuşmazlığı, yazım güvenli değil)",
      "(line is not NFC — normalization mismatch; writing is unsafe)",
    );
  },
  get cokSatirliAlan(): string {
    return yuzeyMetni(
      "(alan birden çok satıra yayılmış — silme aralığı kanıtlanamaz)",
      "(the field spans several lines — the deletion range cannot be proven)",
    );
  },
  get beklerKalkmali(): string {
    return yuzeyMetni(
      "(onay yazıldı — onayBekler alanı kalkmış olmalıydı)",
      "(the approval was written — the onayBekler field should have been removed)",
    );
  },
  get ayiriciYok(): string {
    return yuzeyMetni(
      "(alanın virgül ayırıcısı kaynakta bulunamadı)",
      "(the field's comma separator was not found in the source)",
    );
  },
} as const;

export function baglantiAcIpucu(metin: string): string {
  return yuzeyMetni(`Aç: ${metin}`, `Open: ${metin}`);
}

/** VIT-GRAF-A14 · çapraz-varlık bakış linki: hedef öbür varlıkta yaşar, dosya
 *  salt okunur açılır — bağımlılık değil, yalnız bakış (STR-3). */
export function caprazBakisIpucu(kod: string): string {
  return yuzeyMetni(
    `👁️ ${kod} öbür varlıkta yaşıyor — salt okunur bakış olarak açılır`,
    `👁️ ${kod} lives in the other entity — opens as a read-only view`,
  );
}

export function panelOdakMesaji(proje: string): string {
  return yuzeyMetni(`🔭 Sarmal panel odağı: ${proje}`, `🔭 Sarmal panel focus: ${proje}`);
}

export function iskeletSozDizimHatasi(satir: number, sutun: number): string {
  return yuzeyMetni(
    `Sarmal: soz dizim hatasi (${satir}:${sutun}) — iskelet kurulamadi.`,
    `Sarmal: syntax error (${satir}:${sutun}) — the scaffold could not be built.`,
  );
}

export function iskeletKuruldu(olusan: number, atlanan: number): string {
  return yuzeyMetni(
    `🌱 Iskelet kuruldu — ${olusan} olusturuldu · ${atlanan} atlandi`,
    `🌱 Scaffold built — ${olusan} created · ${atlanan} skipped`,
  );
}

export const DUZELTME_METINLERI = {
  get beceriTerfisi(): string {
    return yuzeyMetni(
      "🎓 Beceri iskeleti oluştur ve olgunlaşan kaydı ona bağla",
      "🎓 Create a Skill scaffold and bind the matured record to it",
    );
  },
  get tabloyuHizala(): string {
    return yuzeyMetni("📊 Tabloyu hizala (sütunlar nizami)", "📊 Align table (orderly columns)");
  },
  get uzunNiyetiKatla(): string {
    return yuzeyMetni(
      "📏 Uzun niyeti üç tırnaklı çok satırlı biçime katla",
      "📏 Fold long intent into triple-quoted multiline form",
    );
  },
  get kosuyaBasla(): string {
    return yuzeyMetni(
      "🔨 Koşuya başla — durumu geliştirmede yap (işe başlarken işaretlenir)",
      "🔨 Start the run — set status to in progress",
    );
  },
  get adimiTamamla(): string {
    return yuzeyMetni(
      "🏁 Adımı tamamla — durum: tamamlandı (üretir: meyvesini yazmayı unutma)",
      "🏁 Complete the Step — set status to done (remember to declare its fruit with üretir:)",
    );
  },
  get kararOzetiEkle(): string {
    return yuzeyMetni(
      "💡 Karar'a özet alanı ekle — bağlamı bilmeyen de okuyabilsin",
      "💡 Add a summary field to the Decision so it is readable without prior context",
    );
  },
} as const;

export function alaniMaddeleBasligi(alan: string): string {
  return yuzeyMetni(
    `📝 ${alan} alanını madde listesine çevir — her iş kendi maddesinde dursun`,
    `📝 Convert the ${alan} field to a list — keep each task in its own item`,
  );
}

export function onerilenYazimaDuzelt(oneri: string): string {
  return yuzeyMetni(`🔧 "${oneri}" olarak düzelt`, `🔧 Change to "${oneri}"`);
}

// ═══════════════════════════════════════════════════════════════════════════
// GEZİNME · GİYDİRME · İMZA · KUZEY YILDIZI
// ═══════════════════════════════════════════════════════════════════════════

export const GEZINME_METINLERI = {
  get yenidenAdlandirilacakKodYok(): string { return yuzeyMetni("Burada yeniden adlandırılacak bir kod yok.", "There is no code to rename here."); },
  indeksteYok: (kod: string): string => yuzeyMetni(`'${kod}' indekste yok — yeniden adlandırılamaz.`, `'${kod}' is absent from the index and cannot be renamed.`),
  gecersizKod: (kod: string): string => yuzeyMetni(`Geçersiz kod biçimi: '${kod}' — harf/rakam/alt-çizgi/tire kullanın (boşluk yok).`, `Invalid code format: '${kod}'. Use letters, digits, underscores or hyphens, with no spaces.`),
  dosyaAdlari: (kod: string, adet: number): string => yuzeyMetni(
    `'${kod}' kimliği ${adet} dosyanın adında da geçiyor. Metin atıfları güncellendi; dosyaların yeniden adlandırılmasını sen yapmalısın.`,
    `Identity '${kod}' also occurs in ${adet} filename${adet === 1 ? "" : "s"}. Text references were updated; you must rename the files yourself.`,
  ),
} as const;

export const GIYDIR_METINLERI = {
  get soru(): string { return yuzeyMetni("🌀 Bu çalışma alanında Sarmal görünümü giydirilmemiş — kanondaki renk/dekor ayarları uygulansın mı? (yalnız bu çalışma alanına yazılır)", "🌀 This workspace does not have the Sarmal appearance applied. Apply the canonical color and decoration settings? (Only this workspace is changed.)"); },
  get giydir(): string { return yuzeyMetni("Giydir", "Apply appearance"); },
  get birDahaSorma(): string { return yuzeyMetni("Bu projede sorma", "Don't ask in this project"); },
} as const;

export function imzaAlanBelgesi(zorunlu: boolean, tur?: string, degerler?: readonly string[]): string {
  const parcalar = [zorunlu ? yuzeyMetni("zorunlu", "required") : yuzeyMetni("isteğe bağlı", "optional")];
  if (tur) parcalar.push(yuzeyMetni(`tür: ${tur}`, `type: ${tur}`));
  if (degerler) parcalar.push(yuzeyMetni(`değerler: ${degerler.join(" · ")}`, `values: ${degerler.join(" · ")}`));
  return parcalar.join(" — ");
}

export function imzaBelgesi(): string {
  return yuzeyMetni("Kanondan (SNF-0) — `[ad]` = isteğe bağlı.", "From the canon (SNF-0) — `[name]` = optional.");
}

export const YILDIZ_METINLERI = {
  get uzunNiyet(): string { return yuzeyMetni("Uzun niyet metnini üç tırnaklı çok satırlı biçime katlayabilirim; uzun satır bölününce okunurluk artar.", "I can fold the long intent into triple-quoted multiline form; splitting the long line improves readability."); },
  get tablo(): string { return yuzeyMetni("Tablonun sütunlarını hizalayabilirim — dikey çizgiler aynı hizaya gelir.", "I can align the table columns so their vertical bars line up."); },
  get terfi(): string { return yuzeyMetni("Olgunlaşan bellek kaydı beceriye terfi etmeye hazır — dönüşümü başlatabilirim.", "The mature memory record is ready for promotion to a skill; I can start the conversion."); },
  get bilinmeyenTip(): string { return yuzeyMetni("Bilinmeyen tip için düzeltme önerim var — en yakın kanonlu tipe çevirebilirim.", "I have a fix for the unknown type and can change it to the nearest canonical type."); },
  ipucu: (neden: string): string => yuzeyMetni(
    `🌟 **Kuzey Yıldızı** — bu satırda uygulanabilir bir öneri var:\n\n${neden}\n\nUygulamak için satıra gel ve **⌘.** (kod aksiyonları) menüsünü aç.`,
    `🌟 **North Star** — this row has an applicable suggestion:\n\n${neden}\n\nMove to the row and open the **⌘.** (code actions) menu to apply it.`,
  ),
  get terfiBekliyor(): string { return yuzeyMetni("  🎓 terfi bekliyor", "  🎓 promotion pending"); },
  get uyari(): string { return yuzeyMetni("  ⚠️ uyarı", "  ⚠️ warning"); },
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// GERİBİLDİRİM / TAKDİR YÜZEYİ
// ═══════════════════════════════════════════════════════════════════════════

export function takdirKanallari(): ReadonlyArray<{ param: string; emoji: string; ad: string; ipucu: string }> {
  return [
    { param: "teşekkür", emoji: "🙏", ad: yuzeyMetni("Teşekkür", "Thanks"), ipucu: yuzeyMetni("minnet — emeğe selam", "gratitude — recognition for the work") },
    { param: "takdir", emoji: "❤️", ad: yuzeyMetni("Takdir", "Appreciation"), ipucu: yuzeyMetni("memnuniyet — tam isabet", "satisfaction — exactly right") },
    { param: "onur", emoji: "🏅", ad: yuzeyMetni("Onur", "Honor"), ipucu: yuzeyMetni("üstün başarı — onurlandırma", "outstanding achievement — recognition") },
    { param: "öneri", emoji: "💡", ad: yuzeyMetni("Öneri", "Suggestion"), ipucu: yuzeyMetni("yapıcı geribildirim — daha iyisi için", "constructive feedback — toward something better") },
  ];
}

export const TAKDIR_METINLERI = {
  get yerTutucu(): string { return yuzeyMetni("Kadroya notun... yazıp aşağıdan kanalını seç: 🙏 ❤️ 🏅 💡", "Your note to the team... then choose its channel below: 🙏 ❤️ 🏅 💡"); },
  get istem(): string { return yuzeyMetni("Yazdığın geribildirim dile işlenir ve ajanın hafızasına geçer", "Your feedback is recorded in the language and enters the agent's memory"); },
  karsilama: (kod: string): string => yuzeyMetni(`**${kod}** tamamlandı 🕊️ Notunu aşağıya yaz, kanalını alttaki düğmeyle seç: 🙏 teşekkür · ❤️ takdir · 🏅 onur · 💡 öneri`, `**${kod}** is complete 🕊️ Write your note below, then choose its channel: 🙏 thanks · ❤️ appreciation · 🏅 honor · 💡 suggestion`),
  etiket: (kod: string): string => yuzeyMetni(`${kod} — kadroya geribildirim`, `${kod} — feedback to the team`),
  eklemeNoktasi: (kod: string, bulunan: string): string => yuzeyMetni(
    `Geribildirim yazılamadı — ${kod} satırındaki ekleme noktası doğrulanamadı (beklenen "tamamlandı", bulunan "${bulunan}"). Dosya bozulmasın diye yazım durdu; değeri elle işleyebilirsin.`,
    `Feedback could not be written because the insertion point on ${kod} was not verified (expected "tamamlandı", found "${bulunan}"). Writing stopped to protect the file; you can apply the value manually.`,
  ),
  islendi: (emoji: string, kod: string): string => yuzeyMetni(`${emoji} Geribildirim kadroya işlendi — ${kod}`, `${emoji} Feedback recorded for the team — ${kod}`),
  get bekliyorSus(): string { return yuzeyMetni("  ❤️  geribildirimini bekliyor", "  ❤️  awaiting your feedback"); },
  get bosDavetIpucu(): string { return yuzeyMetni("💓 Bu adım tamamlandı — üstündeki lense tıklayın: 🙏 teşekkür · ❤️ takdir · 🏅 onur · 💡 öneri", "💓 This Step is complete — select the lens above: 🙏 thanks · ❤️ appreciation · 🏅 honor · 💡 suggestion"); },
  lensBasligi: (dolu: boolean, emojiler: string): string => dolu
    ? yuzeyMetni(`${emojiler}  geribildirim (ekle/düzenle)`, `${emojiler}  feedback (add/edit)`)
    : yuzeyMetni("🤍 geribildirim — teşekkür · takdir · onur · öneri", "🤍 feedback — thanks · appreciation · honor · suggestion"),
  lensIpucu: (kod: string): string => yuzeyMetni(`${kod} tamamlandı — kadro kalbini bekliyor`, `${kod} is complete — the team awaits your response`),
  mevcutNot: (not: string): string => yuzeyMetni(`Mevcut not: ${not}`, `Current note: ${not}`),
  kanalSec: (kod: string): string => yuzeyMetni(`${kod} için bir kanal seçin — notunuz bu etmenin siciline işlenir ve zamanla hafızasına aktarılır.`, `Choose a channel for ${kod}. Your note is recorded in this agent's history and carried into its memory over time.`),
  notIstemi: (emoji: string, ad: string): string => yuzeyMetni(`${emoji} ${ad} — kadroya notun`, `${emoji} ${ad} — your note to the team`),
  get hasatBos(): string { return yuzeyMetni("🌾 Hasat boş — henüz geribildirim notu yazılmamış.", "🌾 Harvest is empty; no feedback note has been written yet."); },
  hasat: (adet: number): string => yuzeyMetni(`🌾 Hasat tamam: ${adet} geribildirim → ogrenme/geribildirim.sar (STR-4)`, `🌾 Harvest finished: ${adet} feedback records → ogrenme/geribildirim.sar (STR-4)`),
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// YOL HARİTASI VE KONİ KARTI
// ═══════════════════════════════════════════════════════════════════════════

export const YOL_METINLERI = {
  daha: (adet: number): string => yuzeyMetni(`… +${adet} daha`, `… +${adet} more`),
  get grafinTamami(): string { return yuzeyMetni("tamamı: sarmal graf / etki", "all: Sarmal graph / impact"); },
  get bagimli(): string { return yuzeyMetni("bağımlı", "depends on"); },
  get etkiler(): string { return yuzeyMetni("etkiler", "affects"); },
  get gecisli(): string { return yuzeyMetni("🌊 geçişli", "🌊 transitive"); },
  get dogrudan(): string { return yuzeyMetni("⚡ doğrudan", "⚡ direct"); },
  kabul: (adet: number): string => yuzeyMetni(`↳ kabul · ${adet} madde`, `↳ acceptance · ${adet} item${adet === 1 ? "" : "s"}`),
  get koniDetayi(): string { return yuzeyMetni("detay: koni kartı", "details: cone card"); },
  yavasGenisletme: (sure: number, kim: string, adet: number): string => yuzeyMetni(`${sure} ms · ${kim} · ${adet} çocuk`, `${sure} ms · ${kim} · ${adet} children`),
  kirikDosya: (adet: number): string => yuzeyMetni(`⚠ ${adet} dosya ayrıştırılamadı`, `⚠ ${adet} file${adet === 1 ? "" : "s"} could not be parsed`),
  get kirikDosyaAciklamasi(): string { return yuzeyMetni("sözdizimi kırık — harita bu dosyaları göremiyor", "syntax is broken — the map cannot see these files"); },
  // 🗺️ PRF-TA-A03: okunamayan dosya ayrı sayılır. Turun görüntüsü kırık ile
  // okunamayanı iki ayrı kümede taşır ve panel de onları ayırmak zorundadır:
  // sözdizimi kırık dosya YAZILARAK onarılır, okunamayan dosya ise silinmiş ya
  // da erişilemez durumdadır ve kullanıcı ikisine aynı şeyi yapamaz. Sayı
  // görüntüden gelir, ad listesi gelmez; panel bilmediği adı uydurmaz.
  okunamayanDosya: (adet: number): string => yuzeyMetni(`⚠ ${adet} dosya okunamadı`, `⚠ ${adet} file${adet === 1 ? "" : "s"} could not be read`),
  get okunamayanDosyaAciklamasi(): string { return yuzeyMetni("diskten okunamadı — silinmiş ya da erişilemeyen dosya", "could not be read from disk — a deleted or inaccessible file"); },
  bilgiGrubuIpucu: (etiket: string, aciklama: string): string => yuzeyMetni(`${etiket}${aciklama ? `\n${aciklama}` : ""}\ngenişlet → hedefe tıklayın: düğüme atla`, `${etiket}${aciklama ? `\n${aciklama}` : ""}\nexpand → select a target to jump to its node`),
  bilgiIpucu: (etiket: string, aciklama: string, hedef: boolean): string => yuzeyMetni(`${etiket}${aciklama ? `\n${aciklama}` : ""}${hedef ? "\ntıklayın: düğüme atla" : ""}`, `${etiket}${aciklama ? `\n${aciklama}` : ""}${hedef ? "\nselect to jump to the node" : ""}`),
  get dugumeAtla(): string { return yuzeyMetni("Düğüme atla", "Jump to node"); },
  kosumIpucu: (etiket: string, zaman: string): string => yuzeyMetni(`${etiket}\n${zaman}\ntıklayın: tam konuşma (ham prompt + ham yanıt)`, `${etiket}\n${zaman}\nselect for the full conversation (raw prompt + raw response)`),
  get konusmaDetayi(): string { return yuzeyMetni("Konuşma Detayı", "Conversation Details"); },
  get bosRay(): string { return yuzeyMetni("ray döşendi — vagon bekleniyor", "track laid — awaiting a car"); },
  // 🪆 EKL-F7-A09: kapsayıcı varlık satırı kaç projeyi sardığını söyler (küme kimliği).
  kumeAciklama: (sayi: number): string => yuzeyMetni(`🪆 ${sayi} proje`, `🪆 ${sayi} project${sayi === 1 ? "" : "s"}`),
  varlikIpucu: (tip: string, kod: string, kok: string, blok: number, bloklu: number): string => {
    const gorunenTip = kanonikWidgetAdi(tip, tip);
    return yuzeyMetni(`${gorunenTip} · ${kod}\n${kok}\nBlok: ${blok}${bloklu ? `\n⛔ altında ${bloklu} bloklu adım` : ""}`, `${gorunenTip} · ${kod}\n${kok}\nBlocks: ${blok}${bloklu ? `\n⛔ ${bloklu} blocked Step${bloklu === 1 ? "" : "s"} below` : ""}`);
  },
  aktifAciklama: (aciklama: string): string => yuzeyMetni(`📍 aktif · ${aciklama}`, `📍 active · ${aciklama}`),
  aktifIpucu: (ipucu: string): string => yuzeyMetni(`📍 AKTİF VARLIK — imleç bu projede\n${ipucu}`, `📍 ACTIVE ENTITY — the cursor is in this project\n${ipucu}`),
  get varligaOdaklan(): string { return yuzeyMetni("Varlığa odaklan", "Focus entity"); },
  get gelistiriliyor(): string { return yuzeyMetni("🟡 geliştiriliyor", "🟡 in progress"); },
  tarife: (tarih: string): string => yuzeyMetni(`\n\n🚄 tarife: **${tarih}** (motor nöbeti: rötar/yaklaşıyor — faz-vade)`, `\n\n🚄 schedule: **${tarih}** (engine check: overdue/approaching — phase deadline)`),
  planlanmamis: (neden: string): string => yuzeyMetni(`\n\n🧊 **planlanmamış** — ${neden}\n\n_Önceliklendirildiğinde bir zaman dilimine bağlanır._`, `\n\n🧊 **unscheduled** — ${neden}\n\n_It is bound to a time slice when prioritized._`),
  blokluAlt: (adet: number): string => yuzeyMetni(` · ⛔ altında ${adet} bloklu`, ` · ⛔ ${adet} blocked below`),
  get ac(): string { return yuzeyMetni("Aç", "Open"); },
  yasakGecis: (turkce: string, kod: string, eski: string, yeni: string): string => yuzeyMetni(`🚫 ${turkce}`, `🚫 Transition ${eski} → ${yeni} is not allowed for ${kod}.`),
  geriAlma: (kod: string, eski: string, yeni: string): string => yuzeyMetni(`ℹ️ ${kod}: ${eski} → ${yeni} (geri-alma — denetim bilgi notu düşer)`, `ℹ️ ${kod}: ${eski} → ${yeni} (rollback — an audit note will be recorded)`),
  kartBasligi: (kod: string): string => `🃏 ${kod}`,
  rayBloklari: (tamam: number, toplam: number, adet: number): string => yuzeyMetni(`[${tamam}/${toplam}] · ${adet} blok`, `[${tamam}/${toplam}] · ${adet} block${adet === 1 ? "" : "s"}`),
  get raySec(): string { return yuzeyMetni("🚆 Hangi rayın makinisti olalım?", "🚆 Which track should we drive?"); },
  get webDili(): string { return yuzeyDili === "en" ? "en" : "tr"; },
  get yok(): string { return yuzeyMetni("— yok —", "— none —"); },
  kuralKapsami: (katman: string, kapsam: string): string => yuzeyMetni(`${katman ? ` · ${katman}` : ""} · kapsam: ${kapsam}`, `${katman ? ` · ${katman}` : ""} · scope: ${kapsam}`),
  genelYasa: (adet: number): string => yuzeyMetni(`+ ${adet} genel yasa (tüm düğümlere düşer — kapsam: genel/tümü)`, `+ ${adet} general law${adet === 1 ? "" : "s"} (applies to every node — scope: general/all)`),
  bagliKurallar: (adet?: number): string => yuzeyMetni(`📏 bağlı kurallar${adet === undefined ? "" : ` (${adet})`}`, `📏 bound rules${adet === undefined ? "" : ` (${adet})`}`),
  get ozelKuralYok(): string { return yuzeyMetni("— bu düğüme ÖZEL kural yok —", "— no rule specific to this node —"); },
  get dosyadaAc(): string { return yuzeyMetni("📂 dosyada aç", "📂 open in file"); },
  alan: (alan: "görev" | "kabul" | "sınır" | "dokunulmaz" | "referans" | "rapor" | "yama"): string => ({
    görev: yuzeyMetni("🎯 görev", "🎯 task"), kabul: yuzeyMetni("✅ kabul", "✅ acceptance"),
    sınır: yuzeyMetni("🚧 sınır", "🚧 boundary"), dokunulmaz: yuzeyMetni("🛑 dokunulmaz", "🛑 off limits"),
    referans: yuzeyMetni("📚 referans", "📚 reference"), rapor: yuzeyMetni("📄 rapor", "📄 report"),
    yama: yuzeyMetni("🩹 yama", "🩹 patch"),
  })[alan],
  get bagimliDugumler(): string { return yuzeyMetni("⬅️ bağımlı olduğu düğümler", "⬅️ nodes it depends on"); },
  get etkiledigiDugumler(): string { return yuzeyMetni("➡️ etkilediği düğümler", "➡️ nodes it affects"); },
  konusmaBasligi: (rol: unknown, adim: unknown): string => yuzeyMetni(`🔬 Konuşma — ${String(rol ?? "?")} · ${String(adim ?? "")}`, `🔬 Conversation — ${String(rol ?? "?")} · ${String(adim ?? "")}`),
  konusmaOzeti: (zaman: string, ajan: string, giris: string, cikis: string, sira: string): string => yuzeyMetni(`🕐 ${zaman} · 👤 ajan: <b>${ajan}</b> · 🎫 token: <b>${giris}</b> → <b>${cikis}</b> · sıra #${sira}`, `🕐 ${zaman} · 👤 agent: <b>${ajan}</b> · 🎫 tokens: <b>${giris}</b> → <b>${cikis}</b> · sequence #${sira}`),
  beceriler: (beceriler: string): string => yuzeyMetni(`⚙️ beceriler: ${beceriler}`, `⚙️ skills: ${beceriler}`),
  get hamPrompt(): string { return yuzeyMetni("📤 ŞEF'in ham prompt'u", "📤 Raw lead prompt"); },
  get hamYanit(): string { return yuzeyMetni("📥 Etmenin ham yanıtı", "📥 Raw agent response"); },
} as const;

export const MINI_GRAF_METINLERI = {
  get dil(): string { return yuzeyDili === "en" ? "en" : "tr"; },
  durum: (durum: string): string => ({
    beklemede: yuzeyMetni("beklemede", "pending"),
    geliştirmede: yuzeyMetni("geliştirmede", "in progress"),
    tamamlandı: yuzeyMetni("tamamlandı", "complete"),
    bloklu: yuzeyMetni("bloklu", "blocked"),
    doğrulanmamış: yuzeyMetni("doğrulanmamış", "unverified"),
  }[durum] ?? durum),
  eksikMeyve: (adet: number): string => yuzeyMetni(`${adet} diskte yok`, `${adet} missing from disk`),
  beyanYolu: (bos: boolean, yol: string): string => yuzeyMetni(`${bos ? "beyan edildi, diskte yok" : "diskte var"}: ${yol}`, `${bos ? "declared, missing from disk" : "present on disk"}: ${yol}`),
  kaynakIpucu: (baslik: string): string => yuzeyMetni(`${baslik}\ntıklayın: kaynağa atla`, `${baslik}\nselect to jump to source`),
  get ariaGraf(): string { return yuzeyMetni("tüm proje mini grafı", "whole-project mini graph"); },
  get bosGraf(): string { return yuzeyMetni("henüz Faz, Blok, Katman, AltKatman veya Adım yok", "there is no Phase, Block, Layer, Sub-layer or Step yet"); },
  get dugum(): string { return yuzeyMetni("düğüm", "node"); },
  get bag(): string { return yuzeyMetni("bağ", "edge"); },
  get kuruluyor(): string { return yuzeyMetni("harita kuruluyor…", "building map…"); },
} as const;

const AILE_ADLARI_EN: Readonly<Record<string, string>> = {
  temel: "foundation", plan: "plan", bilgi: "knowledge", orkestrasyon: "orchestration",
  etmen: "agent", yuzey: "surface", yasa: "law", teknoloji: "technology",
  urun: "product", surec: "process", nitelik: "quality", oz: "core",
  davranis: "behavior", arkayuz: "backend",
};

export function aileAdi(aile: string): string {
  return yuzeyDili === "en" ? (AILE_ADLARI_EN[aile] ?? aile) : aile;
}

export const TAMAMLAMA_ORTAK_PARAMETRELERI: Readonly<Record<string, () => string>> = {
  kod: () => yuzeyMetni("benzersiz kimlik — her düğümün ilk parametresidir", "unique identity — the first parameter of every node"),
  ad: () => yuzeyMetni("insan-okur ad (snake_case)", "human-readable name (snake_case)"),
  ne: () => yuzeyMetni("bu düğüm ne? (kısa açıklama)", "what is this node? (short description)"),
  aile: () => yuzeyMetni("tip tanımında düğümün ait olduğu aile", "the family a node belongs to in a type declaration"),
  içerir: () => yuzeyMetni("izinli çocuk tipleri (liste)", "allowed child types (list)"),
  renk: () => yuzeyMetni("aile/tip rengi (#RRGGBB)", "family/type color (#RRGGBB)"),
  her: () => yuzeyMetni("koleksiyondan üret — döngünün bildirimsel karşılığıdır", "produce from a collection — the declarative counterpart of a loop"),
  görünür: () => yuzeyMetni("koşullu göster — örnek: `görünür: yaş >= 18`", "show conditionally — example: `görünür: yaş >= 18`"),
  boşsa: () => yuzeyMetni("liste boşken ne gösterileceğinin niyeti", "intent for what to show when the list is empty"),
  rota: () => yuzeyMetni("adlandırılmış gezinme yolu", "named navigation path"),
  yetki: () => yuzeyMetni("erişim ilanı (herkese · girişli · rol) — D5 ortak sözlük", "access declaration (public · signed-in · role) — shared D5 vocabulary"),
  yol: () => yuzeyMetni("ucun HTTP yolu", "the endpoint's HTTP path"),
  metod: () => yuzeyMetni("istek yöntemi (GET · POST …) — kanonla aynı tek kelime yazılır", "request method (GET · POST …) — written with the canonical token"),
};

export const TAMAMLAMA_METINLERI = {
  get belgeKodu(): string { return yuzeyMetni("belgedeki KOD — akış hedefi (--> = besler)", "CODE in this document — flow target (--> = feeds)"); },
  get yetkiKademesi(): string { return yuzeyMetni("yetki kademesi", "clearance tier"); },
  get tipografiRolu(): string {
    return yuzeyMetni(
      "🎨 tipografi ROLÜ (Tema sözleşmesi — sayısal değer teknoloji temasında yaşar)",
      "🎨 typography ROLE (Theme contract — the numeric value lives in the technology theme)",
    );
  },
} as const;

export function tipTamamlamaBelgesi(simge: string, ad: string, aile: string, ne: string): string {
  return `${simge ? simge + " " : ""}**${ad}** — _${aileAdi(aile)}_ ${yuzeyMetni("ailesi", "family")}\n\n${ne}`;
}

export function enumDegeriDetayi(param: string, tip?: string): string {
  const gorunenTip = tip ? kanonikWidgetAdi(tip, tip) : undefined;
  return yuzeyMetni(
    `${param} değeri${gorunenTip ? ` (${gorunenTip})` : ""}`,
    `${param} value${gorunenTip ? ` (${gorunenTip})` : ""}`,
  );
}

export function ifadePaletiDetayi(kategori: string, es?: string): string {
  return yuzeyMetni(
    `🎨 ifade paleti · ${kategori}${es ? ` · kanonik eşleme: ${es}` : ""}`,
    `🎨 expression palette · ${kategori}${es ? ` · canonical mapping: ${es}` : ""}`,
  );
}

export function ifadePaletiBelgesi(kavram: string, kategori: string): string {
  return yuzeyMetni(
    `**${kavram}** — tasarım sözlüğü (_${kategori}_)\n\nİfade paleti önerisi: niyeti DETAYLI yazmaya yardım eder — rijit enum değil, doğrulanmaz.`,
    `**${kavram}** — design vocabulary (_${kategori}_)\n\nExpression-palette suggestion: helps describe intent in detail; it is not a rigid enum and is not validated.`,
  );
}

export function semaAlaniDetayi(rozet: string, tip: string, ham: string): string {
  const gorunenTip = kanonikWidgetAdi(tip, tip);
  return yuzeyMetni(`${rozet} ${gorunenTip} şeması — ${ham}`, `${rozet} ${gorunenTip} schema — ${ham}`);
}

export function kenarTamamlamaDetayi(ne: string): string {
  return yuzeyMetni(`kenar · ${ne}`, `edge · ${ne}`);
}

export function kenarTamamlamaBelgesi(ad: string, ne: string): string {
  return yuzeyMetni(`**${ad}** (kenar)\n\n${ne}`, `**${ad}** (edge)\n\n${ne}`);
}

export function emojiEsdegerDetayi(mevcut: string | undefined, emoji: string): string {
  return `${mevcut ? `${mevcut} · ` : ""}🌍 ${emoji}`;
}

export function tipTamamlamaDetayi(simge: string, aile: string, ne: string): string {
  return `${simge ? `${simge} ` : ""}${aileAdi(aile)} · ${ne}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// ÜZERİNE-GELME / ÖĞRENİM YÜZEYİ
//
// İpucu sağlayıcısı yalnız olguyu çözer. Kullanıcının okuduğu cümleler burada
// iki haneli yaşar; böylece sağlayıcı içinde ikinci bir Türkçe metin evreni
// doğmaz ve dil değişikliği sonraki hover çağrısında doğrudan görünür.
// ═══════════════════════════════════════════════════════════════════════════

const IPUCU_PARAM_TR: Readonly<Record<string, string>> = {
  kod: "benzersiz kimlik (KOD) — ilk parametre, global benzersiz",
  ad: "insan-okur ad (snake_case)",
  ne: "bu düğüm ne? — kısa açıklama",
  aile: "tip tanımında ait olduğu aile",
  içerir: "izinli çocuk tipleri",
  renk: "aile/tip rengi (#RRGGBB)",
  görev: "Adım'ın yapacağı iş — bağlam-konisi (orkestratör prompt üretir)",
  kabul: "kabul kriterleri — Sınama bunları meyveye karşı doğrular",
  dokunulmaz: "değiştirilemeyecekler (locked)",
  sınır: "bu adımın nerede durduğu",
  her: "koleksiyondan üret: `her: sepet.ürünler` — for döngüsünün bildirimsel karşılığı; çeviriyi ajan yapar",
  görünür: "koşullu göster: `görünür: yaş >= 18 ve değil kilitli` — if'in bildirimsel karşılığı",
  boşsa: "boş-durum niyeti: koleksiyon boşken ne gösterilir (`boşsa: MSJ-BOS`)",
  rota: "adlandırılmış gezinme yolu (`rota: \"/giris\"`)",
  koruma: "erişim bekçisi: `girişli` · `girişsiz` (auth-guard niyeti)",
  tema: "görsel anayasa referansı (Tema KOD'u)",
  bağla: "iki-yönlü durum bağı (erişim): `bağla: DRM-OTURUM.hatırla`",
  tür: "çeşit seçimi (bağlama göre: canlandırma türü · alan türü · düğme türü)",
  süre: "zaman niyeti (`\"300ms\"` · `\"5dk\"`)",
  eğri: "canlandırma eğrisi (`hızlıÇıkışYavaşGiriş` — Curves karşılığı)",
  yol: "ucun HTTP yolu (`yol: \"/giris\"` — tabanYol'a eklenir)",
  metod: "HTTP metodu: GET · POST · PUT · DELETE (kanonla tek kelime)",
  istek: "istek gövdesi sözleşmesi (Sözleşme KOD'u)",
  yanıt: "yanıt sözleşmesi (Sözleşme KOD'u)",
  yetki: "erişim ilanı — Uç'ta: `herkese` · `girişli` · rol; Etmen'de: RBAC kademesi (L1–L6, kanon yetkiSozlugu — tek kaynak)",
  şema: "tablo şeması — Sözleşme'den türetilir (tek gerçek)",
  otorite: "kural önceliği: `anayasa` › `politika` › `tercih` — çakışmada üst alttakini ezer (varsayılan: tercih)",
  ebedi: "dokunulmazlık bayrağı: `ebedi: evet` — yalnız anayasa kuralında; diff gelirse `ebedi-ihlal` (kurucu bile değiştiremez)",
  katman: "kuralı KİM zorlar: `yapısal` (graf/Denetçi) · `eşik` (koşul motoru) · `niyet` (zorlanamaz — ne: metni prompt'a gider)",
  kapsam: "kural-konisi seçicisi: aile (`etmen`) · tip (`Adım`) · tek KOD · `tümü` — kural kapsadığına otomatik bağlanır",
  uzmanlık: "Etmen'in alanı: `önyüz · arkayüz · güvenlik · yapay-zekâ · test · altyapı · yönetişim`",
  bellek: "Etmen bellek kapsamı: `izole | paylaşık` — denetçi = izole (EBEDİ); L5 + paylaşık = HATA",
  model: "model önerisi: varsayılan tercih — nihai seçim ORKESTRATÖRÜN (etmen model seçemez)",
  tetik: "Etmen'in devreye girme koşulu",
  önce: "koşum-öncesi Kanca kimlikleri: yönetişim denetiminden SONRA çalışır, atlanamaz",
  sonra: "koşum-sonrası Kanca KOD'ları: çıktı doğrulama/audit/bildirim",
  hataDa: "hata Kanca KOD'ları: fallback/eskalasyon",
  araçlar: "izinli MCP/Araç KOD listesi: yazılmayan YASAK — en-az-yetki",
  sağlar: "Beceri'nin sağladığı Yetenek KOD'u: stack-agnostik yapabilirlik — `sağlar: YTN-DURUM-YONETIMI`",
  yığın: "Beceri'nin teknoloji yığını: `flutter · react · fastapi · evrensel` — aynı Yetenek'in yığın-uygulamaları ayrı Beceriler",
  neZaman: "Beceri tetiklenme tarifi (zorunlu): hangi durumda kullanılır",
  kurallar: "Beceri uygulama kuralları (zorunlu): liste ya da üç tırnaklı blok",
  antiDesen: "kaçınılacaklar (zorunlu): numaralı anti-desen listesi",
  neden: "kural gerekçeleri — güvenlik/KVKK becerisinde ZORUNLU",
  kullanır: "tüketici-beyan kenarı: Adım `kullanır: BCR-…` — koni beceriyi otomatik getirir (çift-kaynak yasak)",
  alanlar: "veri sözleşmesinin şeması: kompakt harita — `eposta: \"metin · zorunlu · eposta-biçimi\"`",
  hatalar: "uç sözleşmesinin hata haritası: `401: \"#hata.kimlik-geçersiz\"`",
  sürüm: "sözleşme sürümü: kırıcı değişiklikte artırılır — kırıcı değişiklik denetimi çalışma anında yapılacaktır (beklemede)",
  nasılUygula: "ders belleğinde zorunlu: adım adım uygulama tarifi — gerekçesiz ders ezberdir",
  aşama: "bellek terfi hattı: `pratik → bellek → karar → yasa-taslağı → yasa` — bekleyen-terfi Denetçi ölçer",
  alan: "Politika'nın alanı: `öğrenme · maliyet · güvenlik · hız · içerik`",
  yargıAlanı: "Mevzuat'ın hukuk alanı: `TR · AB · ABD · küresel`",
  yaptırım: "Mevzuat ihlal sonucu: ceza/SLA özeti (`\"72 saat VERBİS bildirimi\"`)",
  zorunluKılar: "Mevzuat kenarı: hangi Adım/Kapı/Politika'yı bağlıyor — bağsız Mevzuat = öksüz",
  hatırlat: "Hatırlatıcı kenarı: hedef aktifleşince koniyle GELİR; açıkken hedef kapatılırsa `kaçırılmış-hatırlatıcı`",
  çapa: "Hatırlatıcı sınıfı: `mimari ≫ adım > yasa/nitelik > gelecek` — backlog önceliği",
  dönüşTetikleyici: "park edilen Fikir/Hatırlatıcı'nın dönüş koşulu",
  boyutlar: "Değerlendirme ağırlık haritası: toplam 1.0 — Denetçi doğrular",
  eşikler: "Değerlendirme skor→aksiyon: `kabul · kabulNotlu · izlemeyle · revizyon` — altı red-eskalasyon",
  hedef: "Değerlendirme'nin puanladığı şey: `etmen-çıktısı · meyve · adım`",
  gerekçe: "Karar'ın zorunlu alanı: GEREKÇESİZ KARAR GEÇERSİZ",
  teşekkür: "🙏 Founder minneti — geribildirim kanalı; hasatla ajan hafızasına akar",
  onur: "🏅 Founder onurlandırması — üstün başarı kaydı",
  öneri: "💡 Founder yapıcı geribildirimi — daha iyisi için",
  takdir: "❤️ Founder'ın kadroya kalp notu — tamamlanan Adım'a yazılır; orkestratör koni üretirken ajanlara TAŞIR",
};

const IPUCU_PARAM_EN: Readonly<Record<string, string>> = {
  kod: "unique identity (CODE) — the first parameter and globally unique",
  ad: "human-readable name (snake_case)",
  ne: "what is this node? — a short description",
  aile: "the family declared for a type",
  içerir: "allowed child types",
  renk: "family/type color (#RRGGBB)",
  görev: "the Step's task — part of the context cone used to build the orchestrator prompt",
  kabul: "acceptance criteria — Tests verify the fruit against these",
  dokunulmaz: "areas that must not be changed (locked)",
  sınır: "where this Step stops",
  her: "produce from a collection: `her: sepet.ürünler` — the declarative counterpart of a loop; the agent translates it",
  görünür: "show conditionally: `görünür: yaş >= 18 ve değil kilitli` — the declarative counterpart of an if statement",
  boşsa: "empty-state intent: what is shown when the collection is empty (`boşsa: MSJ-BOS`)",
  rota: "named navigation path (`rota: \"/giris\"`)",
  koruma: "access guard: `girişli` · `girişsiz`",
  tema: "visual-constitution reference (Theme CODE)",
  bağla: "two-way state binding: `bağla: DRM-OTURUM.hatırla`",
  tür: "variant selection, depending on context: animation, field or button kind",
  süre: "time intent (`\"300ms\"` · `\"5dk\"`)",
  eğri: "animation curve (`hızlıÇıkışYavaşGiriş` — the Curves counterpart)",
  yol: "the endpoint's HTTP path (`yol: \"/giris\"`, appended to tabanYol)",
  metod: "HTTP method: GET · POST · PUT · DELETE (the canonical token is used)",
  istek: "request-body contract (Contract CODE)",
  yanıt: "response contract (Contract CODE)",
  yetki: "access declaration — `herkese` · `girişli` · role for Endpoints; RBAC tier L1–L6 for Agents",
  şema: "table schema — derived from a Contract (single source of truth)",
  otorite: "rule precedence: `anayasa` › `politika` › `tercih`; a higher authority overrides a lower one",
  ebedi: "immutability flag: `ebedi: evet`; constitutional rules only, with `ebedi-ihlal` on drift",
  katman: "who enforces the rule: `yapısal` (graph/checker) · `eşik` (threshold engine) · `niyet` (intent passed through ne:)",
  kapsam: "rule-cone selector: family (`etmen`) · type (`Adım`) · one CODE · `tümü`; the rule binds automatically",
  uzmanlık: "Agent specialty: `önyüz · arkayüz · güvenlik · yapay-zekâ · test · altyapı · yönetişim`",
  bellek: "Agent memory scope: `izole | paylaşık`; inspectors are isolated and L5 + shared is an error",
  model: "model preference — the final choice belongs to the orchestrator, not the Agent",
  tetik: "condition that activates the Agent",
  önce: "pre-run Hook identities; run after validation checks and cannot be skipped",
  sonra: "post-run Hook CODEs for output validation, audit and notification",
  hataDa: "error Hook CODEs for fallback and escalation",
  araçlar: "allowed MCP/tool CODE list; anything not declared is forbidden (least privilege)",
  sağlar: "Capability CODE provided by a Skill: stack-agnostic ability — `sağlar: YTN-DURUM-YONETIMI`",
  yığın: "Skill technology stack: `flutter · react · fastapi · evrensel`; stack implementations are separate Skills",
  neZaman: "required Skill trigger: when it should be used",
  kurallar: "required Skill application rules: a list or triple-quoted block",
  antiDesen: "required numbered list of patterns to avoid",
  neden: "rule rationale — required for security/privacy Skills",
  kullanır: "consumer-declared edge: `kullanır: BCR-…`; the cone brings the Skill automatically",
  alanlar: "data-contract schema: compact map — `eposta: \"metin · zorunlu · eposta-biçimi\"`",
  hatalar: "endpoint contract error map: `401: \"#hata.kimlik-geçersiz\"`",
  sürüm: "contract version; increment on a breaking change (live checking is pending)",
  nasılUygula: "required in lesson memory: step-by-step application instructions",
  aşama: "memory promotion path: `pratik → bellek → karar → yasa-taslağı → yasa`",
  alan: "Policy dimension: `öğrenme · maliyet · güvenlik · hız · içerik`",
  yargıAlanı: "legal jurisdiction: `TR · AB · ABD · küresel`",
  yaptırım: "regulatory consequence: penalty/SLA summary (`\"72 saat VERBİS bildirimi\"`)",
  zorunluKılar: "Regulation edge: the Step, Gate or Policy it binds; an unbound Regulation is orphaned",
  hatırlat: "Reminder edge: enters the cone when its target activates; closing the target while open raises `kaçırılmış-hatırlatıcı`",
  çapa: "Reminder class: `mimari ≫ adım > yasa/nitelik > gelecek` — backlog priority",
  dönüşTetikleyici: "return condition for a parked Idea or Reminder",
  boyutlar: "Evaluation weight map; the checker verifies that the total is 1.0",
  eşikler: "Evaluation score-to-action map: `kabul · kabulNotlu · izlemeyle · revizyon`",
  hedef: "what the Evaluation scores: `etmen-çıktısı · meyve · adım`",
  gerekçe: "required Decision rationale; a decision without rationale is invalid",
  teşekkür: "🙏 Founder gratitude — a feedback channel carried into agent memory at harvest",
  onur: "🏅 Founder recognition — a record of outstanding achievement",
  öneri: "💡 constructive Founder feedback — toward a better result",
  takdir: "❤️ Founder's note to the team — written to the completed Step and carried into agent cones",
};

export function ipucuParamMetni(ad: string): string | undefined {
  const hane = yuzeyDili === "en" ? IPUCU_PARAM_EN : IPUCU_PARAM_TR;
  return hane[ad];
}

const IPUCU_ANAHTAR_TR: Readonly<Record<string, string>> = {
  çağır: "kod-tabanlı içe-aktarma: `çağır KOD` — yol değil, drift-bağışık",
  Tip: "kullanıcı-tanımlı tip: `Tip Ad( aile:, içerir:, renk: ){ ne: }`",
  Kural: "kullanıcı-tanımlı kural: fonksiyon-benzeri · alanları: otorite · ebedi · katman · kapsam",
  ve: "mantıksal VE: iki koşul da doğruysa doğru — `girişli ve yönetici`",
  veya: "mantıksal VEYA: en az biri doğruysa doğru",
  değil: "mantıksal DEĞİL (tekli): `değil kilitli` — koşulu tersine çevirir",
};
const IPUCU_ANAHTAR_EN: Readonly<Record<string, string>> = {
  çağır: "CODE-based import: `çağır KOD`; it uses identity rather than a drift-prone path",
  Tip: "user-defined type: `Tip Ad( aile:, içerir:, renk: ){ ne: }`",
  Kural: "user-defined, function-like rule with authority, permanence, enforcement layer and scope fields",
  ve: "logical AND: true when both conditions are true — `girişli ve yönetici`",
  veya: "logical OR: true when at least one condition is true",
  değil: "logical NOT (unary): `değil kilitli`; reverses the condition",
};
export function ipucuAnahtarMetni(ad: string): string | undefined {
  return (yuzeyDili === "en" ? IPUCU_ANAHTAR_EN : IPUCU_ANAHTAR_TR)[ad];
}

const IPUCU_ISLEC_TR: Readonly<Record<string, string>> = {
  "==": "eşitlik — tek `=` geçersizdir, ayrıştırıcı uyarır", "!=": "eşitsizlik",
  "<=": "küçük-eşit", ">=": "büyük-eşit — `görünür: yaş >= 18`", "<": "küçüktür", ">": "büyüktür",
  "+": "toplama", "-": "çıkarma — **boşluk ister**: `puan - 10`; boşluksuz tire KOD birleşimidir (`BLK-KIMLIK`)",
  "*": "çarpma", "/": "bölme", "%": "kalan",
};
const IPUCU_ISLEC_EN: Readonly<Record<string, string>> = {
  "==": "equality — a single `=` is invalid and the parser reports it", "!=": "inequality",
  "<=": "less than or equal", ">=": "greater than or equal — `görünür: yaş >= 18`", "<": "less than", ">": "greater than",
  "+": "addition", "-": "subtraction — **requires spaces**: `puan - 10`; an unspaced hyphen joins a CODE (`BLK-KIMLIK`)",
  "*": "multiplication", "/": "division", "%": "remainder",
};
export function ipucuIslecMetni(ad: string): string | undefined {
  return (yuzeyDili === "en" ? IPUCU_ISLEC_EN : IPUCU_ISLEC_TR)[ad];
}

const IPUCU_BOLUM_TR: Readonly<Record<string, string>> = {
  "ne-zaman": "Bu referansın **ne zaman** devreye gireceği — ajanın koni tetikleyicisi. Yanlış bağlamda yüklenmesin diye sınırı da yazılır (\"DEĞİL: ...\").",
  desenler: "Kaynağın damıtılmış **desenleri** — bilginin gövdesi. Markdown serbest; şekiller `<şekil>` ile iç içe girebilir.",
  "anti-desenler": "**Kaçınılacak hatalar** (❌ maddeler) — ajan çıktısını bunlara karşı yoklar; insan hızla tarar.",
  neden: "Bu bilginin **varlık gerekçesi** — neden önemli, neye temel oluyor.",
  şekil: "**Şekil/şema taşıyıcı**: `ad=` başlık · `kaynak=` sayfa/atıf. İçerik karaktere karakter korunur; önizlemede çerçevelenir.",
};
const IPUCU_BOLUM_EN: Readonly<Record<string, string>> = {
  "ne-zaman": "**When** this reference becomes relevant — the agent's cone trigger. Include a boundary (`DEĞİL: ...`) so it is not loaded in the wrong context.",
  desenler: "The source's distilled **patterns** — the body of the knowledge. Markdown is free-form and figures may be nested with `<şekil>`.",
  "anti-desenler": "**Patterns to avoid** (❌ items) — agents check their output against them and people can scan them quickly.",
  neden: "The knowledge's **reason for existing** — why it matters and what it supports.",
  şekil: "**Figure/diagram carrier**: `ad=` title · `kaynak=` page/citation. Content is preserved character for character and framed in Preview.",
};
export function ipucuBolumMetni(ad: string): string | undefined {
  return (yuzeyDili === "en" ? IPUCU_BOLUM_EN : IPUCU_BOLUM_TR)[ad];
}
export function ipucuBolumAdlari(): string[] { return Object.keys(IPUCU_BOLUM_TR); }

export function emojiIpucuSatiri(emoji: string): string {
  return yuzeyMetni(
    `\n\n🌍 Emoji eşdeğeri: \`${emoji}\` — iki yazım aynı grafı üretir`,
    `\n\n🌍 Emoji equivalent: \`${emoji}\` — both spellings produce the same graph`,
  );
}

export const IPUCU_BELGE_METINLERI = {
  get acilis(): string { return yuzeyMetni(
    "📖 **`-->|`** — belge bloğu açılışı *(söz dizimi kuralı)*\n\nBuradan `|<--` kapanışına dek her şey **belge metnidir**: markdown, bölüm etiketleri ve ASCII şekiller ham akar — kod olarak yorumlanmaz. Blok, altındaki widget'ın belgesi olur.\n\n**Resmî belge iskeleti** (başlık formatları):\n```\n# Başlık            ← belgenin adı (okuma modunda büyük başlık)\n> Kaynak: ...       ← alıntı satırı (kitap/sayfa atfı)\n‹ne-zaman›          ← bu bilgi ne zaman devreye girer + \"DEĞİL:\" sınırı\n‹desenler›          ← bilginin gövdesi (## alt başlıklar serbest)\n  ‹şekil ad=\"...\" kaynak=\"...\"›  ← şekil/şema (aynen korunur)\n‹anti-desenler›     ← kaçınılacak hatalar (❌ liste)\n‹neden›             ← bu bilginin varlık gerekçesi\n```\n\n**Kime ne fayda sağlar:** 👤 insan dosyayı okuma modunda kitap gibi okur · 🤖 AI ajanı bölümleri tanıyıp doğru bağlamda yüklenir · ⚙️ makine belgeyi koddan ayırır, asla karıştırmaz.\n\n⚠️ Akış oku `-->` ile karıştırma: ok'a **bitişik** `|` bloğu açar; `--> KOD` ise besleme kenarıdır.",
    "📖 **`-->|`** — document-block opening *(syntax rule)*\n\nEverything up to `|<--` is **document text**: Markdown, section tags and ASCII figures pass through unchanged and are not interpreted as code. The block documents the widget below it.\n\n**Official document skeleton** (heading forms):\n```\n# Title             ← document title (large in reading mode)\n> Source: ...       ← quotation/citation line\n‹ne-zaman›          ← when this knowledge applies + its `DEĞİL:` boundary\n‹desenler›          ← the body (## subheadings are free-form)\n  ‹şekil ad=\"...\" kaynak=\"...\"›  ← figure/diagram, preserved exactly\n‹anti-desenler›     ← mistakes to avoid (❌ list)\n‹neden›             ← why this knowledge exists\n```\n\n**Who benefits:** 👤 people read the file like a book · 🤖 agents load the right sections in context · ⚙️ the machine never confuses documentation with code.\n\n⚠️ Do not confuse it with the flow arrow: a `|` immediately after `-->` opens a block, while `--> KOD` is a feeds edge.",
  ); },
  get kapanis(): string { return yuzeyMetni(
    "📖 **`|<--`** — belge bloğu kapanışı *(söz dizimi kuralı)*\n\nBelge burada biter, koda dönülür.\n\n**Neden tek `|` değil?** Belgelerdeki şekiller `|` işaretiyle doludur; tek `|` kapanış olsaydı blok ilk şekilde yanlışlıkla kapanırdı. **Ayna dizisi** `|<--` şekillerde geçmez.\n\n**Faydası:** şekil ve şemalar karakteri karakterine korunur — insan da makine de aynı çizimi görür.",
    "📖 **`|<--`** — document-block closing *(syntax rule)*\n\nThe document ends here and code resumes.\n\n**Why not one `|`?** Figures often contain vertical bars; a single-bar delimiter would close at the first figure. The mirrored `|<--` sequence does not occur in figures.\n\n**Benefit:** figures and diagrams are preserved character for character, so people and machines see the same drawing.",
  ); },
} as const;

export function bolumEtiketiIpucu(ad: string, aciklama?: string): string {
  if (aciklama) return yuzeyMetni(
    `🏷️ **\`‹${ad}›\`** — belge bölüm etiketi *(söz dizimi kuralı)*\n\n${aciklama}\n\n**Faydası:** 👤 insan bölümü başlığından tarar · 🤖 AI ajanı bilgiyi doğru yerde kullanır.`,
    `🏷️ **\`‹${ad}›\`** — document section tag *(syntax rule)*\n\n${aciklama}\n\n**Benefit:** 👤 people scan by section heading · 🤖 agents use the knowledge in the right place.`,
  );
  const kume = ipucuBolumAdlari().map((t) => `\`‹${t}›\``).join(" · ");
  return yuzeyMetni(
    `🏷️ **\`‹${ad}›\`** — serbest bölüm etiketi *(söz dizimi kuralı)*\n\nBelgeyi bölümlere ayırır; adı size kalmış. İnsan ile AI için ortak okuma yapısı kurar.\n\nÖnerilen çekirdek küme: ${kume}.`,
    `🏷️ **\`‹${ad}›\`** — free-form section tag *(syntax rule)*\n\nIt divides the document into sections; you choose the name. It creates a shared reading structure for people and agents.\n\nSuggested core set: ${kume}.`,
  );
}

export function emojiYazimiIpucu(emoji: string, ad: string, bolum: string, aciklama?: string): string {
  return yuzeyMetni(
    `🌍 **${emoji}** — **${ad}** yazımının emoji eşdeğeri (${bolum} · emoji kanonu)` +
      (aciklama ? `\n\n${aciklama}` : "") +
      "\n\nİki yüz aynı grafı üretir: emoji yazımı ile Türkçe yazım eşdeğerdir, karışık yazım serbesttir; Türkçe yazım birinci sınıf kalır.",
    `🌍 **${emoji}** — emoji equivalent of **${ad}** (${bolum} · emoji canon)` +
      (aciklama ? `\n\n${aciklama}` : "") +
      "\n\nBoth faces produce the same graph. Emoji and Turkish source spelling are equivalent and may be mixed; Turkish spelling remains first-class.",
  );
}

export function emojiBolumAdi(bolum: "kademe" | "parametre" | "durum"): string {
  return ({
    kademe: yuzeyMetni("kademe", "tier"),
    parametre: yuzeyMetni("parametre", "parameter"),
    durum: yuzeyMetni("durum değeri", "status value"),
  })[bolum];
}

export function varsayilanlarIpucu(vars: Readonly<Record<string, unknown>>): string {
  const satirlar = Object.entries(vars).map(([a, d]) => `- \`${a}: ${String(d)}\``).join("\n");
  return yuzeyMetni(
    `\n\n**✳️ Varsayılanlar** (yazılmadığında)\n${satirlar}`,
    `\n\n**✳️ Defaults** (when omitted)\n${satirlar}`,
  );
}

export function kenarIpucu(ad: string, gorunenAd: string, yon: string, ne: string, emojiEk: string): string {
  return yuzeyMetni(
    `🔗 **${ad}** — kenar (${yon})\n\n${ne}${emojiEk}`,
    `🔗 **${ad} · ${gorunenAd}** — edge (${yon})\n\n${ne}${emojiEk}`,
  );
}

export function anahtarIpucu(ad: string, aciklama: string, emojiEk: string): string {
  return `🔑 **${ad}**\n\n${aciklama}${emojiEk}`;
}
export function parametreIpucu(ad: string, aciklama: string, emojiEk: string): string {
  return yuzeyMetni(
    `⚙️ **${ad}** — parametre\n\n${aciklama}${emojiEk}`,
    `⚙️ **${ad}** — parameter\n\n${aciklama}${emojiEk}`,
  );
}
export function yetkiIpucu(aciklama: string, kademeler: string): string {
  return yuzeyMetni(
    `⚙️ **yetki** — parametre\n\n${aciklama}\n\n**RBAC kademeleri (kanon · yetkiSozlugu):**\n${kademeler}`,
    `⚙️ **yetki** — parameter\n\n${aciklama}\n\n**RBAC tiers (canon · yetkiSozlugu):**\n${kademeler}`,
  );
}

export const IPUCU_SOZCE_METINLERI = {
  get akisOku(): string { return yuzeyMetni(
    "➡️ **`-->`** — akış oku *(söz dizimi kuralı)*\n\n`--> KOD` yazmak \"bu düğüm hedefi **besler**\" demektir (`besler: KOD`un kısa yolu) — verinin/etkinin hangi yöne aktığını gösterir. Birden çok ok, birden çok beslemedir.\n\n**Kime ne fayda sağlar:** 👤 insan akış yönünü görür · 🤖 AI ajanı bağlam ağını bu oklardan örer · ⚙️ makine hedef yoksa `kırık-referans` ile uyarır.",
    "➡️ **`-->`** — flow arrow *(syntax rule)*\n\n`--> KOD` means this node **feeds** the target (short for `besler: KOD`) and shows the direction of data or effect. Multiple arrows declare multiple feeds.\n\n**Who benefits:** 👤 people see flow direction · 🤖 agents build the context graph from these arrows · ⚙️ the machine reports `kırık-referans` when the target is missing.",
  ); },
  i18n: (anahtar: string): string => yuzeyMetni(
    `🌐 **\`${anahtar}\`** — i18n sözlük anahtarı\n\nMetin buraya YAZILMAZ; anahtar, \`dil:\` ile ilan edilen sözlükten çözülür. Kanonik içerik Türkçe önceliklidir ve çeviri deterministiktir.`,
    `🌐 **\`${anahtar}\`** — i18n dictionary key\n\nText is not written here. The key resolves through the dictionary declared with \`dil:\`. Canonical content remains Turkish-first and translation is deterministic.`,
  ),
  islec: (im: string, aciklama: string): string => yuzeyMetni(
    `🧮 **\`${im}\`** — ifade işleci\n\n${aciklama}`,
    `🧮 **\`${im}\`** — expression operator\n\n${aciklama}`,
  ),
} as const;

export function tipIpucuMetni(
  ad: string, aile: string, ne: string,
  r: { tanim: string; yeri?: string; gorev?: string; ajan?: string; insan?: string } | undefined,
  simge = "🧩", dil: CiktiDili = "tr",
): string {
  if (!r) return `${simge} **${ad}** — _${aileAdi(aile)}_ ${dil === "en" ? "family" : "ailesi"}\n\n${ne}`;
  let md = `${simge} **${ad}** — _${aile}_ ailesi\n\n${r.tanim}`;
  if (r.yeri) md += `\n\n**🌳 Ağaçtaki yeri**\n${r.yeri}`;
  if (r.gorev) md += `\n\n**🎯 Görevi**\n${r.gorev}`;
  if (r.ajan) md += `\n\n**🤖 Ajana faydası**\n${r.ajan}`;
  if (r.insan) md += `\n\n**👤 İnsana faydası**\n${r.insan}`;
  return md;
}

export function kararMetniIpucuEki(ozet: string | undefined, hukum: string | undefined): string {
  return (ozet ? yuzeyMetni(`\n\n💡 **Özet:** ${ozet}`, `\n\n💡 **Summary:** ${ozet}`) : "") +
    (hukum ? yuzeyMetni(`\n\n⚖️ **Karar metni:** ${hukum}`, `\n\n⚖️ **Decision text:** ${hukum}`) : "");
}

export const ONIZLEME_METINLERI = {
  get htmlDili(): string { return yuzeyDili === "tr" ? "tr" : "en"; },
  get agacBasligi(): string { return yuzeyMetni("🌳 Yapı Ağacı", "🌳 Structure Tree"); },
  get sozDizimBasligi(): string { return yuzeyMetni("Söz dizimi hatası", "Syntax error"); },
  get duzelinceYenilenir(): string {
    return yuzeyMetni(
      "Okuma modu, dosya düzelince kendini yeniler.",
      "Reading mode refreshes itself after the file is corrected.",
    );
  },
  get beklenmeyenHata(): string { return yuzeyMetni("Beklenmeyen hata.", "Unexpected error."); },
} as const;

export function blokluAdimIpucu(adet: number): string {
  return yuzeyMetni(`altında ${adet} bloklu adım`, `${adet} blocked Steps below`);
}

export function bildirimRozetMetni(tur: "bilgi" | "uyarı" | "hata"): string {
  return {
    bilgi: yuzeyMetni(
      "Bu kayıt bilgi düzeyindedir: motor yalnız haber veriyor, sizden bir düzeltme beklemiyor.",
      "This record has information severity: the engine is only informing you and expects no correction.",
    ),
    "uyarı": yuzeyMetni(
      "Bu kayıt uyarı düzeyindedir; düzeyi motorun kanonik tanı nesnesinden gelir.",
      "This record has warning severity, read from the engine's canonical diagnostic object.",
    ),
    hata: yuzeyMetni(
      "Bu kayıt hata düzeyindedir; düzeyi motorun kanonik tanı nesnesinden gelir.",
      "This record has error severity, read from the engine's canonical diagnostic object.",
    ),
  }[tur];
}

// ═══════════════════════════════════════════════════════════════════════════
// 📦 GÖVDENİN METİN DEMETİ — panel ile nöbet AYNI demeti okur
//
//   Saf gövde (posta-govde.ts) kullanıcıya görünen hiçbir cümleyi kendisi
//   üretmez; hepsini bu demetten alır. Demet burada, katalogda yaşar ve hem
//   üretim (posta-kutusu.ts) hem nöbet aynı nesneyi kullanır. İkinci bir demet
//   yazılsaydı nöbet, kullanıcının GÖRMEDİĞİ metinleri ölçer ve hiçbir şey
//   kanıtlamamış olurdu — bu depoda daha önce yakalanmış sahte nöbet deseni.
// ═══════════════════════════════════════════════════════════════════════════

export const POSTA_GOVDE_METINLERI: GovdeMetinleri = {
  get htmlDili(): string { return yuzeyDili === "tr" ? "tr" : "en"; },
  get ariaOnaylar(): string { return yuzeyMetni("Onaylar", "Approvals"); },
  get notBasligi(): string { return notBasligi(); },
  get notYerTutucu(): string { return notYerTutucu(); },
  get gerekceZorunlu(): string { return gerekceZorunlu(); },
  get gerekceArtik(): string { return gerekceArtik(); },
  dosyaAdedi: postaDosyaAciklamasi,
  kapiEtiketi: postaKapiEtiketi,
  kapiAciklamasi: postaKapiAciklamasi,
  kapiIpucu: postaKapiIpucu,
  dosyaIpucu: postaDosyaIpucu,
  kararIpucu: postaKararIpucu,
  kararEtiketi: (rol: string): string => ({
    onay: yuzeyMetni("Onayla", "Approve"),
    şerh: yuzeyMetni("Şerhle onayla", "Approve with note"),
    ret: yuzeyMetni("Reddet", "Reject"),
  })[rol] ?? rol,
  get kopyaEtiketi(): string { return postaKopyaEtiketi(); },
  kopyaIpucu: postaKopyaIpucu,
};

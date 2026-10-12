// ═══════════════════════════════════════════════════════════════════════════
// tani-metinleri.ts — 🗣️ YENİ KANON TANI METİNLERİ (mesaj anahtarı katmanı)
//
//   Bu dosya, yeni omurga kanonunun ilan ettiği tanıların tamamının kullanıcı
//   metnini tutar; kümenin güncel sayısı ve kademe kırılımı canlı sicilden
//   (`tani-sicili.ts` içindeki `YENI_TANI_KANONU`) okunur ve buraya yazılmaz,
//   çünkü buraya yazılan her sabit sayı sicil büyüdüğünde bayatlar. Metin
//   üretici işlevin içine gömülmez; üretici yalnız parametreleri verir ve
//   cümleyi buradan alır. Gerekçesi dil desteğidir: ikinci bir dil
//   eklendiğinde çevrilecek tek dosya budur, elli yerde dağılmış şablon
//   dizesi değildir.
//
//   ÖNERİ SÖZLEŞMESİ: her `oneri` metni ihlali tarif etmekle yetinmez,
//   yapıştırılabilir bir düzeltme örneği taşır. Gerekçesi saha bulgusudur: dış
//   bir projede ajan uyarıyı gördü fakat ne yazacağını bilemedi. Tarif eden
//   değil, düzelten cümle yazılır.
//
//   DİL HİJYENİ: kullanıcı metni iç karar, plan ya da madde numarası taşımaz.
//   Numara sicilde yaşar; kullanıcı jargonsuz, öğreten bir cümle görür.
//
//   İKİ KATALOG, TEK KAYNAK: `TANI_METINLERI` yeni omurga kanonunun tanılarını
//   besler ve düzeyini sicilin terfi kademesinden alır; `ONCEKI_TANI_METINLERI`
//   yeni omurgadan önce yazılmış tanıların cümlelerini taşır ve düzeyini çağıran
//   üretici seçer, çünkü o tanıların terfi kademesi sicilde yaşamaz. İkisi de bu
//   dosyadadır, dolayısıyla motorun konuştuğu her cümle tek dosyada okunur ve
//   çevirmen nereye bakacağını arayarak bulmak zorunda kalmaz.
// ═══════════════════════════════════════════════════════════════════════════

import type { Duzey, Tani, TaniDilMetni } from "./tani.ts";
import type { SozDizimHatasi } from "./belirtec.ts";
import { YENI_TANI_INDEKS } from "./tani-sicili.ts";
import { dilHanesi, type CiktiDili } from "./cevir.ts";

/** Metin üreticilerine verilen bağlam — üretici yalnız olguyu geçirir. */
export interface TaniBaglami {
  readonly [alan: string]: string | number | boolean | readonly string[] | undefined;
}

export interface TaniMetni {
  mesaj: (p: TaniBaglami) => string;
  oneri: (p: TaniBaglami) => string;
}

/**
 * Önceki kanonun metin girdisi. `oneri` isteğe bağlıdır, çünkü bu kümede
 * öneri taşımayan tanılar vardır ve olmayan bir öneriyi uydurmak bu turun
 * işi değildir; tur metinleri TAŞIR, yazmaz.
 */
export interface OncekiTaniMetni {
  mesaj: (p: TaniBaglami) => string;
  /** Öneri kurucusu; bağlama göre öneri doğmuyorsa `undefined` döndürebilir. */
  oneri?: (p: TaniBaglami) => string | undefined;
}

/** Bağlam alanını güvenli okur — eksik alan cümleyi bozmaz. */
const a = (p: TaniBaglami, ad: string, yedek = "?"): string => {
  const v = p[ad];
  return v === undefined || v === "" ? yedek : String(v);
};

/** Bağlam alanını sayı olarak okur — sayısal dallanma metnin içinde kalsın diye. */
const s = (p: TaniBaglami, ad: string, yedek = 0): number => {
  const v = p[ad];
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : yedek;
};

/** Bağlam alanını liste olarak okur — ayraç ve sıralama metnin içinde yaşasın diye. */
const d = (p: TaniBaglami, ad: string): readonly string[] => {
  const v = p[ad];
  if (Array.isArray(v)) return v as readonly string[];
  return v === undefined || v === "" ? [] : [String(v)];
};

/**
 * Kırpılmamış ikiz cümleyi yalnız GERÇEKTEN kazanç varsa alana koyar.
 *
 * Gövde zaten kırpma eşiğinin altındaysa iki cümle birebir aynı çıkar; aynı
 * metni ikinci bir alanda taşımak hem kaydı şişirir hem de okuyucuya var olmayan
 * bir fark olduğunu düşündürür. Bu yüzden ikiz, kısa cümleden farklı olduğunda
 * yazılır ve aksi hâlde alan hiç doğmaz.
 */
function tamMesajEki(tamMesaj: string | undefined, mesaj: string): { tamMesaj?: string } {
  return tamMesaj && tamMesaj !== mesaj ? { tamMesaj } : {};
}

/** Bağlam alanını mantıksal bayrak olarak okur — koşullu cümle burada kurulur. */
const b = (p: TaniBaglami, ad: string): boolean => {
  const v = p[ad];
  return v === true || v === "1" || v === 1;
};

/**
 * Üreticinin hiç geçmediği alanın adı (MGZ-A09): yolu bilinmeyen dosya ya da adı
 * bilinmeyen alan için cümle kendi yer tutucusunu basar. Geçilen boş değer ise
 * eski üretici davranışıyla aynı biçimde `a` yedeğine düşer.
 */
const varsayilanli = (p: TaniBaglami, ad: string, yerTutucu: string): string => (p[ad] == null ? yerTutucu : a(p, ad));

/** `erken-faz-işi` listesi: üretici ilk sekiz işi ve toplam sayıyı geçer, kuyruk burada kurulur. */
const isListesi = (p: TaniBaglami, dil: "tr" | "en"): string => {
  const isler = d(p, "isler");
  if (!isler.length) return a(p, "isler");
  const fazla = s(p, "islerSayi") - isler.length;
  if (fazla <= 0) return isler.join(", ");
  return isler.join(", ") + (dil === "tr" ? ` ve ${fazla} Adım daha` : ` and ${fazla} more ${ekEn(fazla, "Adım", "Adım nodes")}`);
};

// ── KUSUR YAN CÜMLELERİ (MGZ-A09 · Founder hükmü 2026-10-10) ─────────────────
//   Bir kısım tanı olgunun ayrıntısını bir yan cümleyle anlatır ("kapsam beyanı
//   yok"). Bu yan cümleyi eskiden üretici Türkçe olarak kurup `kusur` alanına
//   yazıyordu ve iki dilin cümlesi aynı Türkçe ifadeyi basıyordu; İngilizce bir
//   tanının ortasında Türkçe bir yan cümle kalıyordu. Yan cümle de kullanıcı
//   metnidir ve öteki cümleler gibi bu dosyada iki dilde yaşar: üretici `kusur`
//   alanına yan cümlenin kimliğini, öteki alanlara olgunun değerlerini yazar.
//   Türkçe yan cümle önceki hâliyle birebirdir; İngilizce yan cümle İngilizce
//   konuşur ve dosyadaki adları aynen anar. Kimliği bu çizelgede bulunmayan bir
//   `kusur` değeri olduğu gibi basılır, çünkü kimi tanı o alana yalnız bir dal
//   kimliği yazar ve cümlenin dalını o kimlik seçer.

interface KusurYanCumlesi {
  readonly tr: (p: TaniBaglami) => string;
  readonly en: (p: TaniBaglami) => string;
}

/** İki dilli küçük ad çizelgesinden seçilen dildeki adı okur; bilinmeyen ad olduğu gibi kalır. */
const adlar = (cizelge: Readonly<Record<string, readonly [string, string]>>, dil: "tr" | "en") =>
  (kimlik: string): string => cizelge[kimlik]?.[dil === "tr" ? 0 : 1] ?? kimlik;

/** Sayıya göre İngilizce yüklem: tek öğe için tekil, çok öğe için çoğul. */
const ekEn = (adet: number, tekil: string, cogul: string): string => (adet === 1 ? tekil : cogul);

const BECERI_EKSIKLERI: Readonly<Record<string, readonly [string, string]>> = {
  hedef: ["hedef bağı", "the target binding (`uygular`)"],
  tetik: ["tetikleyici tarifi", "the trigger description (`neZaman`)"],
  ornek: ["uygulama örneği", "the application example (`örnek`)"],
  kabul: ["kabul kanıtı", "the acceptance evidence (`kabul` or `doğrulama`)"],
};
const KAPANIS_PARCALARI: Readonly<Record<string, readonly [string, string]>> = {
  kapsam: ["kapsam envanteri", "the scope inventory"],
  dogrulama: ["doğrulama sonucu", "the verification result"],
  borc: ["sahipli borç kaydı", "the owned debt record"],
  etki: ["devredilen etki kümesi", "the transferred impact set"],
};
const OMURGA_KAYITLARI: Readonly<Record<string, readonly [string, string]>> = {
  tip: ["tip kaydı", "the type record"],
  sema: ["şema kaydı", "the schema record"],
  sarma: ["izinli sarma kaydı", "the permitted-containment record"],
};
const TERFI_KANITLARI: Readonly<Record<string, readonly [string, string]>> = {
  uygulama: ["çalışan uygulama bağı", "the working implementation binding (`uygulama` or `tanı`)"],
  dogrulama: ["tekrar üretilebilir doğrulama bağı", "the repeatable verification binding (`doğrulama`)"],
  kabul: ["yetkili açık kabul kaydı", "the authorized explicit acceptance record (`kabul`)"],
};
const TANI_ALANLARI: Readonly<Record<string, readonly [string, string]>> = {
  duzey: ["düzey", "a level"],
  kod: ["tekil kod", "a unique code"],
  mesaj: ["eyleme dönük mesaj", "an actionable message"],
  konum: ["kaynak konumu", "a source location"],
  oneri: ["düzeltme önerisi", "a correction recommendation"],
  sicil: ["kanonik sicil kaydı", "a canonical registry record"],
};
const ESIK_IZLERI: Readonly<Record<string, readonly [string, string]>> = {
  "guven-esikleri": ["karar motoru güven eşikleri", "the decision-engine confidence thresholds"],
  "strateji-kumesi": ["strateji seçici kümesi", "the strategy selector set"],
  "tetik-koreografisi": ["tetikleyici koreografisi", "the trigger choreography"],
  "risk-ozellik-sayisi": ["risk özellik sayısı", "the risk feature count"],
  "deneme-limitleri": ["yeniden deneme ve eskalasyon limitleri", "the retry and escalation limits"],
  "kanca-tavani": ["kanca tavanı ve zaman aşımı", "the hook ceiling and timeout"],
};
const UCLU_KANIT_EN: Readonly<Record<string, string>> = { uygulama: "implementation", doğrulama: "verification", kanon: "canon" };

/** Kural sözleşmesinin eksik parçaları — sıra, cümlenin önceki sırasıdır. */
function kuralSozlesmeEksikleri(p: TaniBaglami, dil: "tr" | "en"): string[] {
  const tr = dil === "tr";
  const parca = (alan: string, yok: boolean, gecersiz: string): string[] => {
    if (yok) return [tr ? `${alan} beyanı` : `the \`${alan}\` declaration`];
    if (gecersiz) return [tr ? `geçerli ${alan} (yazılan değer "${gecersiz}")` : `a valid \`${alan}\` (the written value is "${gecersiz}")`];
    return [];
  };
  return [
    ...parca("otorite", b(p, "otoriteYok"), a(p, "otoriteGecersiz", "")),
    ...parca("katman", b(p, "katmanYok"), a(p, "katmanGecersiz", "")),
    ...(b(p, "kapsamYok") ? [tr ? "kapsam beyanı" : "the `kapsam` declaration"] : []),
  ];
}

/** Terfi kapısı bulgusunun İngilizce gerekçesi (kodlar `terfiKapisiBulgulari` çıktısıdır). */
function terfiBulgusuEn(kod: string): string {
  const [tur, ...parca] = kod.split(":");
  if (tur === "atlama") return `a level is skipped (from ${parca[0]} to ${parca[1]}); only the bilgi, uyarı, hata order is valid`;
  if (tur === "sayac") return "not every live counter is zero";
  if (tur === "kanit") return `the triple evidence is incomplete (${(parca[0] ?? "").split(",").map((x) => UCLU_KANIT_EN[x] ?? x).join(" · ")})`;
  if (tur === "kabul") return "there is no authorized explicit acceptance";
  return kod;
}

export const KUSUR_YAN_CUMLELERI: Readonly<Record<string, KusurYanCumlesi>> = {
  // ── Adım, Meyve ve dosya beyanı ──
  "coklu-kabul-kapisi": {
    tr: (p) => `${a(p, "sayi")} ayrı kabul kapısı taşıyor`,
    en: (p) => `it carries ${a(p, "sayi")} separate Kapı nodes`,
  },
  "meyvesiz-kapanis": {
    tr: () => "tamamlandı ilan edilmiş ama hiçbir Meyve teslim etmemiş",
    en: () => "it is declared tamamlandı but delivers no Meyve",
  },
  "dosya-beyani-yok": { tr: () => "dosya beyanı yazılmamış", en: () => "no `dosya` declaration is written" },
  "yol-kok-disinda": {
    tr: (p) => `beyan edilen yol proje kökünün dışına taşıyor ("${a(p, "yol")}")`,
    en: (p) => `the declared path leaves the project root ("${a(p, "yol")}")`,
  },
  "yol-diskte-yok": {
    tr: (p) => `beyan edilen yol diskte çözülmüyor ("${a(p, "yol")}")`,
    en: (p) => `the declared path does not resolve on disk ("${a(p, "yol")}")`,
  },
  // ── İlişki sınıfı, mimari kapsama, yürütme ve üretim kökeni ──
  "hedef-uretim-ve-sira": {
    tr: (p) => `"${a(p, "hedef")}" hedefi hem üretim kökeni hem yürütme sırası kenarında yazılmış`,
    en: (p) => `target "${a(p, "hedef")}" is written on both a production-provenance edge and an execution-order edge`,
  },
  "hedef-kapsama-ve-sira": {
    tr: (p) => `"${a(p, "hedef")}" hedefi hem kapsama hem yürütme sırası kenarında yazılmış`,
    en: (p) => `target "${a(p, "hedef")}" is written on both a containment edge and an execution-order edge`,
  },
  "kademe-esini-sarar": {
    tr: (p) => `"${a(p, "kademe")}" kademesi kendi eşini sarıyor`,
    en: (p) => `the "${a(p, "kademe")}" level wraps a node of its own level`,
  },
  "ara-kademe-atlandi": {
    tr: (p) => `"${a(p, "ust")}" kademesinden "${a(p, "alt")}" kademesine geçilirken ara kademe atlanmış`,
    en: (p) => `an intermediate level is skipped between the "${a(p, "ust")}" level and the "${a(p, "alt")}" level`,
  },
  "kaynak-kademe-sira": {
    tr: (p) => `kenarın kaynağı "${a(p, "kaynakTip")}" kademesi, oysa yürütme sırası yalnız Adımlar arasında kurulur`,
    en: (p) => `the edge's source is the "${a(p, "kaynakTip")}" level, whereas execution order is formed only between Adım nodes`,
  },
  "hedef-yineleniyor": {
    tr: (p) => `"${a(p, "hedef")}" hedefi aynı kenarda ikinci kez yazılmış`,
    en: (p) => `target "${a(p, "hedef")}" is written twice on the same edge`,
  },
  "hedef-adim-degil": {
    tr: (p) => `"${a(p, "hedef")}" hedefi "${a(p, "hedefTip")}" tipinde, oysa yürütme kenarı yalnız Adıma yönelir`,
    en: (p) => `target "${a(p, "hedef")}" is of type "${a(p, "hedefTip")}", whereas an execution edge points only to an Adım`,
  },
  "uretim-kaynagi-adim-degil": {
    tr: (p) => `kenarın kaynağı "${a(p, "kaynakTip")}" tipinde, oysa üretim kökeni yalnız Adımdan doğar`,
    en: (p) => `the edge's source is of type "${a(p, "kaynakTip")}", whereas production provenance originates only from an Adım`,
  },
  "uretim-hedefi-teslim-degil": {
    tr: (p) => `hedefi "${a(p, "hedefTip")}" tipinde; teslim olmayan bir düğüme yönelen bu kenar yürütme sırası kurar`,
    en: (p) => `its target is of type "${a(p, "hedefTip")}"; pointing at a node that is not a delivery, this edge forms an execution order`,
  },
  "kenar-kaynagi-tipi": {
    tr: (p) => `kenarın kaynağı "${a(p, "kaynakTip")}" tipinde`,
    en: (p) => `the edge's source is of type "${a(p, "kaynakTip")}"`,
  },
  "kenar-cok-hedef": {
    tr: (p) => `kenar ${a(p, "sayi")} hedefe yöneliyor, oysa tekil olmak zorundadır`,
    en: (p) => `the edge points to ${a(p, "sayi")} targets, whereas it must be singular`,
  },
  "hedef-tipi-beklenmedik": {
    tr: (p) => `hedef "${a(p, "hedefTip")}" tipinde, oysa "${a(p, "beklenen")}" bekleniyordu` +
      (a(p, "yonlendir", "") === "takim" ? " — Takım bağı `takım:` kenarıyla yazılır"
        : a(p, "yonlendir", "") === "kullanir" ? " — Teknoloji bağı `kullanır:` kenarıyla yazılır" : ""),
    en: (p) => `the target is of type "${a(p, "hedefTip")}", whereas "${a(p, "beklenen")}" was expected` +
      (a(p, "yonlendir", "") === "takim" ? " — a Takım binding is written with the `takım:` edge"
        : a(p, "yonlendir", "") === "kullanir" ? " — a Teknoloji binding is written with the `kullanır:` edge" : ""),
  },
  "takim-kaynagi-katman-degil": {
    tr: (p) => `kenarın kaynağı "${a(p, "kaynakTip")}" tipinde, oysa sahiplik bağı yalnız Katmandan doğar`,
    en: (p) => `the edge's source is of type "${a(p, "kaynakTip")}", whereas the ownership binding originates only from a Katman`,
  },
  "kademe-sira-alani": {
    tr: (p) => `"${a(p, "kademe")}" kademesi kendi üstünde bir sıra alanı taşıyor`,
    en: (p) => `the "${a(p, "kademe")}" level carries a \`sıra\` field on itself`,
  },
  // ── Döngü ve Kapı ──
  "dongu-eksikleri": {
    tr: (p) => [
      ...(b(p, "hedefYok") ? ["işletim hedefi yazılmamış"] : d(p, "cozulmeyen").map((h) => `işletim hedefi "${h}" hiçbir kaynakta tanımlı değil`)),
      ...(b(p, "sonlanmaYok") ? ["sonlanma koşulu yazılmamış"] : []),
    ].join("; "),
    en: (p) => [
      ...(b(p, "hedefYok") ? ["no execution target (`koşar`) is written"] : d(p, "cozulmeyen").map((h) => `execution target "${h}" is not defined in any source`)),
      ...(b(p, "sonlanmaYok") ? ["no termination condition (`durunca` or `turLimiti`) is written"] : []),
    ].join("; "),
  },
  "kabul-yok": { tr: () => "kabul ölçütü yazılmamış", en: () => "no `kabul` criterion is written" },
  "kapi-kanitsiz": {
    tr: () => "kapı geçildi işaretli ama doğrulanmış kanıt bağı yok",
    en: () => "the Kapı is marked `durum: geçildi` but has no verified evidence binding",
  },
  // ── Kimlik omurgası ──
  "saglayici-koksuz": {
    tr: () => "kimlik sağlayıcısı hiçbir kimlik kökünün altında yaşamıyor",
    en: () => "the KimlikSağlayıcısı does not live under any KimlikKökü",
  },
  "politika-kok-disinda": {
    tr: () => "kimlik politikası kök dışında ilan edilmiş",
    en: () => "the KimlikPolitikası is declared outside a KimlikKökü",
  },
  "proje-cok-kimlik-koku": {
    tr: (p) => `Proje ${a(p, "sayi")} ayrı kimlik köküne bağlanmış`,
    en: (p) => `the Proje is bound to ${a(p, "sayi")} separate KimlikKökü nodes`,
  },
  "ortak-kok-bagi-yok": {
    tr: () => "ortak kimlik köküne giden bağ hiç yazılmamış",
    en: () => "no binding to the shared KimlikKökü is written",
  },
  "cok-ortak-kok": {
    tr: (p) => `çalışma alanında ${a(p, "sayi")} kimlik kökü var, oysa ortak kök tekil olmalıdır`,
    en: (p) => `the workspace has ${a(p, "sayi")} KimlikKökü nodes, whereas the shared root must be unique`,
  },
  // ── İş bölümü ve oturum ──
  "ayni-etmen-iki-rol": {
    tr: (p) => `aynı etmen ("${a(p, "etmen")}") hem üretici hem denetçi olarak yazılmış`,
    en: (p) => `the same Etmen ("${a(p, "etmen")}") is written as both \`üretici\` and \`denetçi\``,
  },
  "kosum-kanitsiz": {
    tr: () => "koşum doğrulandı mührü taşıyor ama bağımsız kanıt bağı yazılmamış",
    en: () => "the Koşum carries the VERIFIED seal, but no independent evidence binding is written",
  },
  "kosum-cok-is": {
    tr: (p) => `koşum kaydı ${a(p, "sayi")} ayrı işi birlikte gösteriyor`,
    en: (p) => `the run record shows ${a(p, "sayi")} separate jobs together`,
  },
  // ── Madde grafı ve kanon kodu ──
  "madde-kodu-yineleniyor": {
    tr: () => "aynı madde kodu ikinci kez ilan edilmiş",
    en: () => "the same item code is declared a second time",
  },
  "sifirinci-madde-yok": {
    tr: (p) => `"${a(p, "bolum")}" bölümü sıfırıncı maddesini ilan etmemiş`,
    en: (p) => `the "${a(p, "bolum")}" section has not declared its zeroth item`,
  },
  "ana-madde-yok": {
    tr: (p) => `noktalı alt numaranın ana maddesi ("${a(p, "anaMadde")}") ilan edilmemiş`,
    en: (p) => `the main item of the dotted subnumber ("${a(p, "anaMadde")}") is not declared`,
  },
  "ardisiklik-koptu": {
    tr: (p) => `ardışıklık kopmuş; "${a(p, "atlanan")}" atlanmış`,
    en: (p) => `the sequence is broken; "${a(p, "atlanan")}" is skipped`,
  },
  "dayanak-onek-disi": {
    tr: (p) => `dayanağı "${a(p, "dayanak")}" kanonun sekiz bölüm önekinin dışında bir kod evrenine yöneliyor`,
    en: (p) => `its basis "${a(p, "dayanak")}" points to a code universe outside the canon's eight section prefixes`,
  },
  "dayanak-yok": { tr: () => "dayanak bağı hiç yazılmamış", en: () => "no `dayanak` binding is written" },
  "dayanak-cozulmuyor": {
    tr: (p) => `dayanağı "${a(p, "dayanak")}" hiçbir kaynakta çözülmüyor`,
    en: (p) => `its basis "${a(p, "dayanak")}" does not resolve in any source`,
  },
  "dayanak-dongusu": { tr: () => "dayanak zinciri kendine dönüyor", en: () => "the basis chain loops back to itself" },
  "dayanak-koke-ulasmiyor": {
    tr: () => "dayanak zinciri kendi bölümünün dayanaksız köküne ulaşmıyor",
    en: () => "the basis chain does not reach the basis-free root of its own section",
  },
  // ── Öğretim ──
  "kaynaksiz-baglayici": {
    tr: () => "metin bağlayıcı cümle taşıyor ama hangi kanonik kaynaktan türediğini söylemiyor",
    en: () => "the text carries a binding sentence but does not say which canonical source it derives from",
  },
  "kunye-kaynagi-cozulmuyor": {
    tr: (p) => `künyedeki kaynak ("${a(p, "kaynakYol")}") çözülmüyor`,
    en: (p) => `the source named in its provenance header ("${a(p, "kaynakYol")}") does not resolve`,
  },
  "kunye-muhru-uyusmuyor": {
    tr: () => "künyedeki mühür kaynağın bugünkü içeriğiyle uyuşmuyor",
    en: () => "the seal in its provenance header does not match the current content of the source",
  },
  "bolge-disi-baglayici": {
    tr: () => "üretim bölgesinin dışında bağlayıcı cümle yazılmış",
    en: () => "a binding sentence is written outside the generation region",
  },
  "basvuru-bolgesi-farkli": {
    tr: () => "başvuru bölgesi kanonik sicilden üretilen içerikle birebir değil",
    en: () => "the reference region does not match the content generated from the canonical registry",
  },
  "beceri-eksikleri": {
    tr: (p) => `${d(p, "eksik").map(adlar(BECERI_EKSIKLERI, "tr")).join(" · ")} yazılmamış`,
    en: (p) => `${d(p, "eksik").map(adlar(BECERI_EKSIKLERI, "en")).join(" · ")} ${ekEn(d(p, "eksik").length, "is", "are")} not written`,
  },
  "terfi-dogrulamasiz": {
    tr: () => "terfi tamamlandı görünüyor ama yinelenebilir doğrulama bağı yok",
    en: () => "`terfi: tamamlandı` is written, but there is no repeatable `doğrulama` binding",
  },
  "ogrenim-kanitsiz": {
    tr: () => "öğrenim terfi ettirilmiş ama yinelenebilir doğrulama kanıtı bağlanmamış",
    en: () => "the lesson has been promoted, but no repeatable verification evidence is bound",
  },
  "ogretim-etkisi-islenmedi": {
    tr: () => "kanonik kaynağı değiştirmiş ama öğretim etkisi ne işlenmiş ne de etkisizliği beyan edilmiş",
    en: () => "it changed the canonical source, but its teaching impact is neither processed (`etkiler`) nor declared absent (`etkisiz`)",
  },
  // ── Göç ──
  "asama-sirasi": {
    tr: (p) => `"${a(p, "acikAsama")}" aşaması hâlâ açıkken "${a(p, "asama")}" aşaması başlatılmış`,
    en: (p) => `the "${a(p, "asama")}" stage was started while the "${a(p, "acikAsama")}" stage is still open`,
  },
  "kapanis-eksikleri": {
    tr: (p) => `kapanış kaydında ${d(p, "eksik").map(adlar(KAPANIS_PARCALARI, "tr")).join(" · ")} yok`,
    en: (p) => `the closure record lacks ${d(p, "eksik").map(adlar(KAPANIS_PARCALARI, "en")).join(" · ")}`,
  },
  // ── Açık ve kapalı sınır, bağımlılık, yayın ──
  "gizli-yol": {
    tr: () => "açık taraftaki kaynak gizli ürün ağacına doğrudan yol veriyor",
    en: () => "the open-side source gives a direct path into the closed product tree",
  },
  "esik-izi": {
    tr: (p) => `kapalı üründeki eşik envanterinin ${a(p, "bolum")} bölümünden türeyen ${adlar(ESIK_IZLERI, "tr")(a(p, "iz"))} açık tarafta düz metin duruyor`,
    en: (p) => `plain text on the open side carries ${adlar(ESIK_IZLERI, "en")(a(p, "iz"))}, derived from section ${a(p, "bolum")} of the closed product's threshold inventory`,
  },
  "calisma-zamani-bagimliligi": {
    tr: (p) => `çalışma-zamanı bağımlılığı ilan edilmiş (${d(p, "adlar").join(" · ")})`,
    en: (p) => `a dependency needed while the program runs is declared (${d(p, "adlar").join(" · ")})`,
  },
  "yayin-kaydi-eksik": {
    tr: () => "yayın beyanı var ama geçişli etki kümesi ve kapı sonucu kayda geçmemiş",
    en: () => "a `yayın` declaration exists, but the transitive impact set and the gate result are not recorded",
  },
  // ── Tip evreni, omurga ve şema ──
  "tip-tanimsiz": {
    tr: (p) => `"${a(p, "tip")}" tipi sarma ya da kenar kaydında anılıyor ama tip evreninde tanımlı değil`,
    en: (p) => `type "${a(p, "tip")}" is named in a containment or edge record but is not defined in the type universe`,
  },
  "aile-katalogda-yok": {
    tr: (p) => `"${a(p, "tip")}" tipinin ailesi ("${a(p, "aile")}") aile kataloğunda yok`,
    en: (p) => `the family of type "${a(p, "tip")}" ("${a(p, "aile")}") is not in the family catalogue`,
  },
  "omurga-eksikleri": {
    tr: (p) => `${d(p, "eksik").map(adlar(OMURGA_KAYITLARI, "tr")).join(" · ")} bulunmuyor`,
    en: (p) => `${d(p, "eksik").map(adlar(OMURGA_KAYITLARI, "en")).join(" · ")} ${ekEn(d(p, "eksik").length, "is", "are")} missing`,
  },
  "sema-kaydi-yok": { tr: () => "tipin şema kaydı hiç yazılmamış", en: () => "no schema record is written for the type" },
  "ortu-izinsiz-alan": {
    tr: (p) => `"${a(p, "tip")}" şemasında örtü izinli enum birleşimi dışında alan yazıyor (${d(p, "alanlar").join(" · ")})`,
    en: (p) => `in the "${a(p, "tip")}" schema the overlay writes fields outside the permitted enum union (${d(p, "alanlar").join(" · ")})`,
  },
  "terfi-kanitlari-eksik": {
    tr: (p) => `${d(p, "eksik").map(adlar(TERFI_KANITLARI, "tr")).join(" · ")} bağlanmamış`,
    en: (p) => `${d(p, "eksik").map(adlar(TERFI_KANITLARI, "en")).join(" · ")} ${ekEn(d(p, "eksik").length, "is", "are")} not bound`,
  },
  // ── Yüzeyler ve prizma ──
  "kunyesiz-yapisal-yuz": {
    tr: () => "kaynağıyla aynı adı taşıyan yapısal yüz üretim künyesi göstermiyor",
    en: () => "a structural surface carrying the same name as its source shows no production header",
  },
  "es-yetkili-ikiz": {
    tr: () => "kanonik kaynakla aynı adı taşıyor, bağlayıcı cümle kuruyor ve üretim künyesi yok",
    en: () => "it carries the same name as the canonical source, makes binding statements and has no production header",
  },
  "bolge-dengesiz": {
    tr: (p) => `"${a(p, "bolge")}" üretim bölgesi ${a(p, "acilis")} kez açılmış, ${a(p, "kapanis")} kez kapanmış`,
    en: (p) => `the "${a(p, "bolge")}" generation region is opened ${a(p, "acilis")} time(s) and closed ${a(p, "kapanis")} time(s)`,
  },
  "bolge-yineleniyor": {
    tr: (p) => `"${a(p, "bolge")}" üretim bölgesi aynı dosyada ${a(p, "sayi")} kez tanımlanmış; üretici hangisini yenileyeceğini seçemez`,
    en: (p) => `the "${a(p, "bolge")}" generation region is defined ${a(p, "sayi")} times in the same file; the generator cannot choose which one to refresh`,
  },
  "sicilsiz-tani-kimligi": {
    tr: (p) => `sunum katmanı sicilde bulunmayan "${a(p, "taniKodu")}" tanı kimliğini kendisi üretiyor`,
    en: (p) => `the presentation layer itself produces the diagnostic identity "${a(p, "taniKodu")}", which is not in the registry`,
  },
  "kararli-kimlik-yok": {
    tr: () => "yüzeyin kararlı kimliği yazılmamış; taşındığında geçmişi kopar",
    en: () => "the surface's stable identity (`kod`) is not written; its history breaks when it is moved",
  },
  "rol-palette-yok": { tr: () => "bu rol kanonik palette tanımlı değil", en: () => "this role is not defined in the canonical palette" },
  // ── Rejim ──
  "rejim-cok-beyan": {
    tr: (p) => ` ve beyanı ${a(p, "sayi")} kez yazmış`,
    en: (p) => ` correctly: the \`rejim\` declaration is written ${a(p, "sayi")} times`,
  },
  "rejim-gecersiz-deger": {
    tr: (p) => `; beyan "${a(p, "deger", "")}" değerini taşıyor`,
    en: (p) => ` correctly: the \`rejim\` declaration carries the value "${a(p, "deger", "")}"`,
  },
  "departmansiz-kademe": {
    tr: (p) => `${a(p, "sayi")} departman kademesi hangi sorumluluğu taşıdığını beyan etmiyor`,
    en: (p) => s(p, "sayi") === 1
      ? "1 AltKatman does not declare the responsibility it carries with `departman`"
      : `${a(p, "sayi")} AltKatman nodes do not declare the responsibility they carry with \`departman\``,
  },
  // ── Seçilebilirlik ──
  "acik-oncul": {
    tr: (p) => `${a(p, "sayi")} öncülü tamamlanmamış: ${d(p, "oncul").join(", ")}` +
      (s(p, "sayi") > 3 ? ` ve ${s(p, "sayi") - 3} öncül daha` : "") +
      (s(p, "fazdan") ? ` — bunların ${s(p, "fazdan")} tanesi önceki Fazdan Faz sırasıyla gelir` : ""),
    en: (p) => `${a(p, "sayi")} ${ekEn(s(p, "sayi"), "predecessor is", "predecessors are")} not complete: ${d(p, "oncul").join(", ")}` +
      (s(p, "sayi") > 3 ? ` and ${s(p, "sayi") - 3} more` : "") +
      (s(p, "fazdan") ? ` — ${s(p, "fazdan")} of them come from an earlier Faz through the Faz order` : ""),
  },
  // ── Kural ──
  "hukum-makine-kosulu": {
    tr: (p) => `"${a(p, "tip")}" hükmü makine koşulu taşıyor, oysa zorlama koşulu Kural gövdesinde yaşar`,
    en: (p) => `the "${a(p, "tip")}" ruling carries a machine condition (\`koşul\`), whereas an enforcement condition lives in a Kural body`,
  },
  "kural-hukum-metni": {
    tr: () => "Kural gövdesi kilitli hüküm metnini taşıyor, oysa hükmün niçini Karar tipinde yaşar",
    en: () => "the Kural body carries the locked ruling text (`karar`), whereas the reason for a ruling lives in the Karar type",
  },
  "kural-sozlesme-eksikleri": {
    tr: (p) => `${kuralSozlesmeEksikleri(p, "tr").join(" · ")} yok`,
    en: (p) => `${kuralSozlesmeEksikleri(p, "en").join(" · ")} ${ekEn(kuralSozlesmeEksikleri(p, "en").length, "is", "are")} missing`,
  },
  "terfi-kapisi": {
    tr: (p) => `kural "${a(p, "taniKodu")}" tanısını "${a(p, "duzey")}" düzeyinde ilan ediyor, oysa bu hüküm motorda henüz "${a(p, "kademe")}" kademesinde gözleniyor`,
    en: (p) => `the rule declares the "${a(p, "taniKodu")}" diagnostic at level "${a(p, "duzey")}", whereas the engine still observes this ruling at level "${a(p, "kademe")}"`,
  },
  // ── Tek-dosya bekçileri ──
  "ciplak-bolum-oneki": {
    tr: (p) => `çıplak bölüm öneki bir kimlik değildir, bölüm kök kimliği \`${a(p, "uye")}-0\` yazılmalı`,
    en: (p) => `a bare section prefix is not an identifier; write the section root identifier \`${a(p, "uye")}-0\``,
  },
  "kok-kimlik-disi": {
    tr: () => "bu üyelik sekiz bölüm kök kimliğinin dışında",
    en: () => "this membership is outside the eight section root identifiers",
  },
  "uyelik-yineleniyor": {
    tr: () => "aynı üyelik listede ikinci kez yazılmış",
    en: () => "the same membership is written twice in the list",
  },
  "gorunurluk-yok": { tr: () => "görünürlük beyanı hiç yazılmamış", en: () => "no `görünürlük` declaration is written" },
  "gorunurluk-cok": {
    tr: (p) => `görünürlük beyanı ${a(p, "sayi")} kez yazılmış, oysa tam bir kez yazılır`,
    en: (p) => `the \`görünürlük\` declaration is written ${a(p, "sayi")} times, whereas it is written exactly once`,
  },
  "gizli-kosulsuz": {
    tr: () => "yüzey gizli beyan edilmiş ama açılma koşulu yazılmamış",
    en: () => "the surface is declared `gizli` but no `açılmaKoşulu` is written",
  },
  "tam-sayi": { tr: () => "tam sayı olmalı", en: () => "must be a whole number" },
  "sayi-olmali": { tr: () => "sayı olmalı", en: () => "must be a number" },
  "tarih-bicimi": {
    tr: () => "Tarih ISO 8601 biçiminde yazılır: gün belliyse YYYY-AA-GG, yalnız ay belliyse YYYY-AA; henüz bilinmiyorsa 'belirsiz' yazılabilir.",
    en: () => "must be an ISO 8601 date: YYYY-MM-DD when the day is known, YYYY-MM when only the month is known, or `belirsiz` while it is still unknown",
  },
  "olmayan-ay": {
    tr: (p) => `takvimde olmayan ay taşıyor (${a(p, "ay")} — ay 01-12 aralığındadır)`,
    en: (p) => `carries a month that is not on the calendar (${a(p, "ay")}; months run from 01 to 12)`,
  },
  "olmayan-gun": {
    tr: (p) => `takvimde olmayan gün taşıyor (${a(p, "yil")}-${a(p, "ay")} ayı ${a(p, "sonGun")} gün çeker, ${a(p, "gun")} yazılmış)`,
    en: (p) => `carries a day that is not on the calendar (${a(p, "yil")}-${a(p, "ay")} has ${a(p, "sonGun")} days, ${a(p, "gun")} is written)`,
  },
  "mantiksal": { tr: () => "mantıksal olmalı (evet·hayır)", en: () => "must be a boolean (`evet` or `hayır`)" },
  "eposta": { tr: () => "e-posta biçiminde olmalı", en: () => "must be an e-mail address" },
  // ── Orkestrasyon hükümleri ──
  "tani-alanlari-eksik": {
    tr: (p) => `${d(p, "eksik").map(adlar(TANI_ALANLARI, "tr")).join(" · ")} yok`,
    en: (p) => `${d(p, "eksik").map(adlar(TANI_ALANLARI, "en")).join(" · ")} ${ekEn(d(p, "eksik").length, "is", "are")} missing`,
  },
  "kapsam-proje-kapisinda": {
    tr: (p) => `"${a(p, "kapsam")}" kapsamındaki tanı Proje kapısında üretilmiş`,
    en: (p) => `a diagnostic with scope "${a(p, "kapsam")}" was produced at the Proje gate`,
  },
  "cok-kok-tek-dizin": {
    tr: (p) => `çalışma alanında ${a(p, "sayi")} Proje kökü var (${d(p, "projeler").join(" · ")}) ama bulgular tek bir dizin kimliği altında toplanıyor`,
    en: (p) => `the workspace has ${a(p, "sayi")} Proje roots (${d(p, "projeler").join(" · ")}), but findings are collected under a single directory identity`,
  },
  "evsiz-bulgular": {
    tr: (p) => `çalışma alanında ${a(p, "sayi")} Proje kökü var (${d(p, "projeler").join(" · ")}) ama ${a(p, "evsizSayi")} dosyanın bulgusu hiçbir Proje koduna bağlanamadı (${d(p, "evsiz").join(" · ")}${s(p, "evsizSayi") > 3 ? " · …" : ""})`,
    en: (p) => `the workspace has ${a(p, "sayi")} Proje roots (${d(p, "projeler").join(" · ")}), but findings from ${a(p, "evsizSayi")} ${ekEn(s(p, "evsizSayi"), "file", "files")} could not be bound to any Proje code (${d(p, "evsiz").join(" · ")}${s(p, "evsizSayi") > 3 ? " · …" : ""})`,
  },
  "yuz-kademe-sapmasi": {
    tr: (p) => `sicil bugünkü kademeyi "${a(p, "kademe")}" ilan ediyor, yüzey "${d(p, "duzeyler").join(" ve ")}" gösteriyor` +
      (a(p, "terfiGerekce", "") ? `; bu yükseltme bir terfidir ve terfi kapısından geçmemiştir (${a(p, "terfiGerekce", "")})` : ""),
    en: (p) => `the registry declares today's level as "${a(p, "kademe")}", but the surface shows "${d(p, "duzeyler").join(" and ")}"` +
      (d(p, "terfiBulgulari").length
        ? `; this raise is a promotion and has not passed the promotion gate (${d(p, "terfiBulgulari").map(terfiBulgusuEn).join(" · ")})` : ""),
  },
  "coklu-duzey": {
    tr: (p) => `aynı koşumda ${d(p, "duzeyler").join(" ve ")} düzeylerinde birden gösterilmiş`,
    en: (p) => `it is shown at the ${d(p, "duzeyler").join(" and ")} levels at once in the same run`,
  },
  "iskeletsiz-oneri": {
    tr: () => "tanının önerisi ne yapılacağını gösteren yapıştırılabilir bir iskelet taşımıyor; düzeltmeyi tarif ediyor ama göstermiyor",
    en: () => "the diagnostic's recommendation carries no paste-ready skeleton showing what to do; it describes the fix but does not show it",
  },
  "atlanan-kapilar": {
    tr: (p) => `zorunlu denetim kapılarından ${a(p, "sayi")} tanesi çalıştırılamadı (${d(p, "kapilar").join(" · ")})`,
    en: (p) => `${a(p, "sayi")} of the required audit gates could not be run (${d(p, "kapilar").map((k) => `\`${k}\``).join(" · ")})`,
  },
};

/**
 * Bağlamdaki kusurun seçilen dildeki yan cümlesi. Kimliği çizelgede bulunmayan
 * değer olduğu gibi basılır; alan hiç yoksa `yedek` döner (önceki `a(p, "kusur")`
 * davranışı).
 */
const yc = (p: TaniBaglami, dil: "tr" | "en", yedek = "?"): string => {
  const cumle = KUSUR_YAN_CUMLELERI[a(p, "kusur", "")];
  return cumle ? cumle[dil](p) : a(p, "kusur", yedek);
};

/**
 * Eksik-alan listesinin bir girdisini seçilen dilde adlandırır. Alan adları
 * dosyadaki adlardır ve olduğu gibi kalır; belge borçları `@` önekli bir
 * kimlikle gelir, çünkü onların adı bir alan adı değil bir tariftir.
 */
const eksikAdi = (p: TaniBaglami, dil: "tr" | "en") => (oge: string): string => {
  const ortak = dil === "tr" ? ORTAK_TANI_METINLERI : ORTAK_TANI_METINLERI_EN;
  if (oge === "@belge") return ortak.belgeEksikAdi({});
  if (oge === "@anlati") return ortak.anlatiBelgesiEksikAdi({ bölümler: d(p, "bolumler") });
  if (oge.startsWith("@bolum:")) return ortak.belgeBolumuEksikAdi({ bölüm: oge.slice("@bolum:".length) });
  return oge;
};

export const TANI_METINLERI: Readonly<Record<string, TaniMetni>> = {
  "altkatman-tekilliği-ihlali": {
    mesaj: (p) => (a(p, "kusur") === "ad"
      ? `Katman "${a(p, "katman")}" altında "${a(p, "deger")}" adı ikinci kez kullanılmış; ilk taşıyıcı "${a(p, "onceki")}" düğümüdür. Aynı adı taşıyan iki kademe yol haritasında art arda iki özdeş satır olarak görünür ve bir Adıma giden yol adlarıyla tarif edilemez.`
      : `Katman "${a(p, "katman")}" altında "${a(p, "deger")}" departmanı ikinci kez açılmış; ilk kademe "${a(p, "onceki")}" düğümüdür. AltKatman bir konu başlığı değil sorumluluk kademesidir ve aynı departman ikiye bölündüğünde kabulün sahibi okunamaz hâle gelir (MIM-1.7).`),
    oneri: (p) => (a(p, "kusur") === "ad"
      ? `Bu kademeye kendi işini anlatan ayrı bir ad yaz, ya da iki kademe gerçekten aynı işi taşıyorsa birleştir. Örnek: \`AltKatman( kod: ${a(p, "onceki")}, ... )\` düğümünün altına taşı.`
      : `Bu kademenin Adımlarını var olan kademenin altına taşı ve kademeyi kaldır. Örnek: \`AltKatman( kod: ${a(p, "onceki")}, departman: ${a(p, "deger")} ) { ... buradaki Adımlar ... }\`. Konu ayrımı Adım kademesinde yapılır; ikinci bir departman kademesi hiçbir şey kazandırmaz.`),
  },
  // ── Mevsim ritüeli (ORK-8) ────────────────────────────────────────────────
  "mevsim-vadesi-geçti": {
    mesaj: (p) => `"${a(p, "kimlik")}" mevsiminin hedef tarihi ${a(p, "vade")} günü geçmiştir, buna karşılık sardığı ${a(p, "gövde")} gövdenin altında ${a(p, "açık")} Adım hâlâ açıktır. Mevsim beyanı ile grafın söylediği ayrışmıştır: kapanmış görünen bir dönem açık iş taşıyamaz.`,
    oneri: (p) => `Açık işi yürürlükteki mevsime devret ya da mevsimin hedef tarihini gerçeğe çek; kapanmayacak iş varsa gerekçesiyle düşür, sessiz bırakma (ORK-8 kapanış basamakları). Örnek: \`Blok( kod: BLK-…, mevsim: FAZ-<yürürlükteki> )\` yaz ve "${a(p, "kimlik")}" mevsiminin gövdesindeki \`çağır BLK-…\` satırını kaldır; bir bağ tek yerde yazılır.`,
  },
  "mevsim-mührü-çelişkili": {
    mesaj: (p) => `"${a(p, "kimlik")}" mevsimi metninde ${a(p, "iddia") === "mühür" ? "mühürlendiğini" : "açık işini devrettiğini"} yazmaktadır, buna karşılık sardığı ${a(p, "gövde")} gövdenin altında ${a(p, "açık")} Adım hâlâ açıktır. Mührün ölçütü metnin iddiası değil grafın sayısıdır: kapandığını söyleyen bir mevsim açık iş taşıyamaz (ORK-8 kapanış basamakları).`,
    oneri: (p) => `Açık işi yürürlükteki mevsime devret ve bağı tek yerde yaz, ya da mevsim gerçekten kapanmadıysa mühür cümlesini kaldır; kapanmayacak iş varsa gerekçesiyle düşür, sessiz bırakma. Örnek: \`Blok( kod: BLK-…, mevsim: FAZ-<yürürlükteki> )\` yaz ve "${a(p, "kimlik")}" mevsiminin gövdesindeki \`çağır BLK-…\` satırını kaldır.`,
  },
  // ── Dosya mühürleri (MIM-3.4 · KPS-MHR-A01) ──────────────────────────────
  "dosya-mührü": {
    mesaj: (p) => a(p, "tür") === "eğitim"
      ? `"${a(p, "yol")}" dosyası eğitim mührü (@${a(p, "etiket")}@_) taşıyor: motor dosyayı okur ve sözleşmelerine göre doğrular, fakat onu ürün karnesine ve açık iş gündemine saymaz, çünkü eğitim malzemesi ürün işi değildir.`
      : `"${a(p, "yol")}" dosyası arşiv mührü (@${a(p, "etiket")}@_) taşıyor ve graf dışında: motor dosyayı okumaz; graf, kod dizini, karne ve açık iş gündemi onu saymaz. Mührün türü ve dosyanın adı her denetimde bu satırla listelenir.`,
    oneri: (p) => `Mühür, dosyanın sahibinin açık beyanıdır ve bir bulguyu susturmak için kullanılamaz; dosya yeniden canlı kaynak olacaksa mührü addan kaldır. Örnek: \`git mv "${a(p, "yol")}" "${a(p, "canlı")}"\`.`,
  },
  "sonraya-bırakılmış-dosya": {
    mesaj: (p) => {
      const kaynak = a(p, "kaynak");
      const olcum = kaynak === "git"
        ? `Süre, mührün depoya işlendiği ${a(p, "tarih")} gününden ölçülür.`
        : kaynak === "dosya"
          ? `Mühür henüz depoya işlenmediği için süre, dosyanın yeniden adlandırıldığı ${a(p, "tarih")} gününden, yani dosyanın durum değişikliği tarihinden ölçülür.`
          : "Bekleme süresi ölçülemedi, çünkü ne depo kaydı ne de dosya tarihi okunabildi.";
      return `"${a(p, "yol")}" dosyası sonraya bırakılmış (@${a(p, "etiket")}@_) ve ${a(p, "gün")} gündür bekliyor; motor içeriğini okumaz ve dosyayı yalnız bu hatırlatmayla görünür tutar. ${olcum}`;
    },
    oneri: (p) => `İşe dönme zamanı geldiyse mührü kaldır ve dosyayı canlı kaynağa geri al; iş düşürüldüyse sonra mührünü arşiv mührüne çevir. Örnek: \`git mv "${a(p, "yol")}" "${a(p, "canlı")}"\`.`,
  },
  "geçersiz-dosya-adı": {
    mesaj: (p) => {
      switch (a(p, "kusur")) {
        case "bilinmeyen-etiket":
          return `"${a(p, "yol")}" adı "@${a(p, "etiket")}@_" biçiminde başlıyor fakat bu etiket kapalı mühür kümesinde (${a(p, "küme")}) değil; dosya mühürsüz sayılır ve canlı kaynak olarak okunur.`;
        case "bozuk-biçim":
          return `"${a(p, "yol")}" adı @ işaretiyle başlıyor fakat mühür biçimine uymuyor; mühür \`@ETİKET@_\` biçiminde ve büyük harfli bir etiketle yazılır (${a(p, "küme")}). Dosya mühürsüz sayılır ve canlı kaynak olarak okunur.`;
        case "mühür-sonrası-büyük-harf":
          return `"${a(p, "yol")}" geçerli bir mühür taşıyor fakat mührü izleyen ad büyük harf taşıyor; mührün ardından ad küçük harfle sürer.`;
        default:
          return `"${a(p, "yol")}" dosya adı büyük harf taşıyor fakat geçerli bir dosya mührü değil; dosya adında büyük harf yalnız mühüre ayrılmıştır.`;
      }
    },
    oneri: (p) => `Adı küçük harfle yaz ya da kapalı kümeden (${a(p, "küme")}) bir mühür kullan. Örnek: \`git mv "${a(p, "yol")}" "${a(p, "öneri")}"\`.`,
  },
  // ── Düğüm kodu standardı (DIL-1.8 · RFM-MOTOR-A02) ──────────────────────
  "ilansız-önek": {
    mesaj: (p) => `"${a(p, "kimlik")}" kodu (${a(p, "tip")}) projenin önek sicilinde ilanı olmayan "${a(p, "önek")}" önekiyle doğmuş. Her önek tek bir yerde, anadizindeki Proje düğümünün \`önekler\` listesinde ilan edilir ve ilansız bir önekle yeni kod doğmaz (DIL-1.8).`,
    oneri: (p) => `Önek yeni bir iş konusunu adlandırıyorsa onu anadizindeki sicile ekle; konu zaten ilanlı bir önekle anılıyorsa kodu o önekle yaz. Örnek: \`Proje( kod: PRJ-ORNEK, önekler: [ PRJ, ${a(p, "önek")} ] )\`.`,
  },
  "kod-biçimi-uyumsuz": {
    mesaj: (p) => {
      const kod = a(p, "kimlik");
      switch (a(p, "kusur")) {
        case "tek-parça":
          return `"${kod}" kodu (${a(p, "tip")}) tek parçadan oluşuyor; bir düğüm kodu tireyle ayrılan en az iki parça taşır ve ilk parçası önektir (DIL-1.8).`;
        case "önek":
          return `"${kod}" kodunun (${a(p, "tip")}) öneki iki ile dört harf arasında değil ya da harf dışı bir karakter taşıyor; önek, işin konusunu bildiren kısa bir harf dizisidir (DIL-1.8).`;
        case "adım-sırası":
          return `"${kod}" Adım kodunun son parçası tek bir seri harfi ile iki basamaklı bir sıra sayısından oluşmuyor; sıra kapsayıcısı içinde birden başlar (DIL-1.8).`;
        default:
          return `"${kod}" kodu (${a(p, "tip")}) yalnız büyük ASCII harfleri, rakamlar ve tek tirelerden kurulmamış ya da harfle başlamıyor; küçük harf, alt çizgi, nokta, boşluk ve Türkçe diakritik kodda yaşayamaz, çünkü kodun anlamını \`ne\` ile \`ad\` alanları taşır (DIL-1.8).`;
      }
    },
    oneri: (p) => `Yeni kodu standarda uygun yaz; kod standarttan önce doğmuşsa yeniden adlandırma, anadizindeki \`biçimMuafları\` listesine adıyla ekle. Örnek: \`Adım( kod: RFM-KANON-A01 )\` ya da \`biçimMuafları: [ ${a(p, "kimlik")} ]\`.`,
  },
  // ── Projesiz Faz (MIM-1.2 · KPS-FAZ-A02) ─────────────────────────────────
  "kitaplıksız-kök": {
    mesaj: (p) => `'${a(p, "kök")}' kökünün altında hiç Kitaplık yok ve Raf doğrudan kökün altına yazılmış — dallanan her klasör bir Kitaplıktır ve Raflar Kitaplıkların İÇİNDE yaşar (MIM-3.2).`,
    oneri: () => 'Rafları bir Kitaplığın içine al; kök, ağaç büyüdükçe okunamaz bir raf listesine dönmesin diye kademeyi bekler. Örnek: `Kitaplık( kod: KTP-IS, yol: "is/" ) { Raf( kod: RAF-PLAN, yol: "plan/" ) }`',
  },
  "projesiz-faz": {
    mesaj: (p) => `"${a(p, "kimlik")}" Fazı hiçbir Proje köküne çözülemiyor: ${a(p, "sebep") === "ayrışık" ? "dosyasını aynı derinlikte birden çok Proje kodu kapsıyor ve bağ tekil olmadığı için kurulmadı" : "dosyası hiçbir Proje kökünün altında yaşamıyor ve Faz iç içe bir Proje gövdesinde de yazılmamış"}. Zaman diliminin kimin olduğu graftan okunamaz (MIM-1.2).`,
    oneri: (p) => `Plan dosyasını ait olduğu Proje kökünün altına taşı ya da Fazı Proje gövdesinin içine yaz; ayrışık kökte iki giriş ilanından birini kaldır. Örnek: \`<proje-kökü>/is/plan/faz/faz.sar\` içinde \`Faz( kod: ${a(p, "kimlik")}, … )\` ve kökte tek bir \`<ad>_anadizin.sar\` girişi.`,
  },
  // ── Faz sırası ve Blok yapısı (MIM-1.2 · MIM-1.3 · MIM-1.6 · KPS-SIR-A01) ──
  "ters-faz-bağımlılığı": {
    mesaj: (p) => `"${a(p, "kimlik")}" düğümündeki \`${a(p, "kenar")}\` kenarı ("${a(p, "hedef")}") Faz sırasıyla çelişiyor: öncül "${a(p, "oncul")}" sonraki "${a(p, "onculFazi")}" Fazında, ardıl ise daha önceki "${a(p, "ardilFazi")}" Fazında duruyor. Bir iş kendinden sonraki bir zaman dilimindeki işi bekleyemez; kenar sıra hesabına alınmadı (MIM-1.2).${b(p, "tarihsel") ? " İki uç da tamamlanmış olduğu için çelişki tarihseldir: Blok gövdesi biten Adımlarıyla birlikte sonraki bir Faza devredilmiş görünür." : ""}`,
    oneri: (p) => `Ya ardılı öncülün Fazına ya da ondan sonraki bir Faza taşı, ya da öncülü daha önceki bir Faza al; bağımlılık gerçek değilse kenarı kaldır. Örnek: ardıl Blokunu \`Faz( kod: ${a(p, "onculFazi")} ) { … }\` gövdesine taşı ve \`bağımlı: [ ${a(p, "oncul")} ]\` kenarını koru.`,
  },
  "erken-faz-işi": {
    mesaj: (p) => `"${a(p, "kimlik")}" Fazında başlamış ya da bitmiş iş var (${isListesi(p, "tr")}), oysa önceki "${a(p, "onceki")}" Fazı hâlâ ${a(p, "acik")} açık Adım taşıyor. Faz sırası katıdır: önceki Faz kapanmadan sonraki Fazda iş başlamaz (MIM-1.2).`,
    oneri: (p) => `Önce önceki Fazın açık işini kapat ya da işi başlamış Adımı geri al; iş zaten bitmişse sıranın yanlış olduğu yer planıdır; iş gerçekten önce gelmeliyse Blokunu önceki Faza taşı. Örnek: sonraki Fazdaki Adımı \`durum: beklemede\` konumuna çek ya da Blokunu \`Faz( kod: ${a(p, "onceki")} ) { … }\` gövdesine al.`,
  },
  "yabancı-faz-bağı": {
    mesaj: (p) => `Blok "${a(p, "kimlik")}" zamanını başka bir Projenin Fazına bağlıyor (\`mevsim: ${a(p, "mevsim")}\` · "${a(p, "proje")}")${a(p, "kendi") ? `, oysa kendi Projesi "${a(p, "kendi")}"` : ""}. Blok kendi Projesinin zaman diliminde yer alır; ${a(p, "acik") === "0" ? "işi tamamlanmış olduğu için bağ tarihsel bir kayıt olarak görünür kalır" : `altında ${a(p, "acik")} açık Adım var ve kardeş projenin Faz sırası bu işi yönetemez`} (MIM-1.2).`,
    oneri: (p) => `Bloku kendi Projesindeki bir Faza bağla; iş gerçekten kardeş projeye aitse Bloku o projenin planına taşı. Örnek: \`Blok( kod: ${a(p, "kimlik")}, mevsim: FAZ-KENDI )\` ya da kendi Fazının \`çağır ${a(p, "kimlik")}\` satırı.`,
  },
  "katmansız-blok": {
    mesaj: (p) => `Blok "${a(p, "kimlik")}" hiçbir Katman taşımıyor. Blok bir iş sonucunu farklı teknolojilere bağlı Katmanları aynı dikey gövdede kavuşturarak üretir; Katmansız Blok bir gövde değil boş bir kaptır (MIM-1.3).`,
    oneri: (p) => `Bloka işin teknoloji dilimlerini Katman olarak ekle ya da Blok henüz tasarlanmadıysa planı Katmanları yazılınca aç. Örnek: \`Blok( kod: ${a(p, "kimlik")} ) { Katman( kod: KAT-ORNEK, kullanır: TEK-ORNEK ) { AltKatman( kod: ALT-ORNEK, departman: kodlama ) { Adım( kod: ADM-ORNEK, durum: beklemede ) } } }\``,
  },
  "adımsız-kapsayıcı": {
    mesaj: (p) => `${a(p, "tip")} "${a(p, "kimlik")}" hiçbir Adım taşımıyor. Adım en küçük yürütme birimidir; Adımı olmayan kapsayıcı yol haritasında ilerleme gösteremez ve iş olarak ölçülemez (MIM-1.6).`,
    oneri: (p) => `Kapsayıcıya işini anlatan en az bir Adım yaz ya da henüz iş taşımıyorsa kapsayıcıyı plandan kaldır. Örnek: \`${a(p, "tip")}( kod: ${a(p, "kimlik")} ) { … Adım( kod: ADM-ORNEK, durum: beklemede, ne: "işin kendisi" ) }\``,
  },
  "tek-adımlı-blok": {
    mesaj: (p) => `Blok "${a(p, "kimlik")}" yalnız tek bir Adım taşıyor ("${a(p, "adim")}"). Blok birden çok Katmanı kavuşturan bir iş gövdesidir; tek Adımlık iş çoğu zaman var olan bir Blokun içinde bir Adım olarak yaşar (MIM-1.3).`,
    oneri: (p) => `Adımı ilgili bir Blokun uygun Katmanına taşı ya da Blokun kavuşturduğu öteki Katmanların Adımlarını yaz. Örnek: \`Blok( kod: BLK-ILGILI ) { Katman( kod: KAT-ILGILI ) { AltKatman( kod: ALT-ILGILI ) { Adım( kod: ${a(p, "adim")}, durum: beklemede ) } } }\``,
  },
  // ── Girinti ile yapının uyumu (DIL-2.2 · KPS-SIR-A02) ──
  "girinti-yapı-uyumsuz": {
    mesaj: (p) => `Dosyanın ${a(p, "sayi")} yapısal satırının girintisi yapının derinliğiyle uyuşmuyor; ilki bu satırdır: yapı ${a(p, "beklenen")} boşluk bekliyor, satır ${a(p, "bulunan")} boşlukla yazılmış. Motor yapıyı girintiden değil ayrıştırmadan okur; bozuk girinti yalnız okuru yanlış bir hiyerarşiye götürür.`,
    oneri: (p) => `Dosyayı biçimlendir (eklentide ⇧⌥F ya da MCP bicimle aracı): biçimlendirici yapısal girintiyi her kat için iki boşlukla yeniden yazar, metne ve hizalamaya dokunmaz. Örnek: satır ${a(p, "beklenen")} boşlukla başlar, \`Blok( kod: BLK-… ) {\` gövdesindeki \`Katman( kod: KAT-… ) {\` bir kat içeride yazılır.`,
  },
  // ── Faz dosyası düzeni (MIM-1.2 · KPS-SIR-A03 · Founder hükmü 2026-09-29) ──
  "çok-fazlı-dosya": {
    mesaj: (p) => `Bu dosya ${a(p, "sayi")} Faz taşıyor; "${a(p, "kimlik")}" Fazı "${a(p, "ilk")}" Fazıyla aynı dosyada ilan edilmiş. Her Faz plan rafının faz klasöründe sıra önekli kendi dosyasında yaşar ve sonraki Faz yeni bir dosyada doğar (MIM-1.2).`,
    oneri: (p) => `"${a(p, "kimlik")}" Fazını gövdesindeki Bloklarla birlikte kendi dosyasına taşı; dosyanın adı Faz sırasını önekle taşır. Örnek: \`is/plan/faz/2_surum.sar\` dosyasının tepesinde \`Faz( kod: ${a(p, "kimlik")} ) { Blok( … ) { … } }\`.`,
  },
  "faz-dışı-blok": {
    mesaj: (p) => `Blok "${a(p, "kimlik")}" Faz gövdesinin dışında duruyor ve "${a(p, "faz")}" Fazına ${a(p, "bag") === "çağır" ? "Fazın `çağır` listesiyle" : "kendi `mevsim:` alanıyla"} bağlanmış. Blok Faza yalnız Faz gövdesine sarılarak bağlanır; dosyayı açan kişi Blokun hangi zaman diliminde yaşadığını ancak böyle görür (MIM-1.2).`,
    oneri: (p) => `Bloku gövdesiyle birlikte "${a(p, "faz")}" Fazının dosyasına taşı ve Faz gövdesinin içine yaz; ${a(p, "bag") === "çağır" ? "`çağır` satırını" : "`mevsim:` alanını"} kaldır. Örnek: \`Faz( kod: ${a(p, "faz")} ) { Blok( kod: ${a(p, "kimlik")} ) { … } }\`.`,
  },
  "faz-ilanı-tepede-değil": {
    mesaj: (p) => `"${a(p, "kimlik")}" Faz ilanı dosyanın tepesinde durmuyor: ${b(p, "gomulu") ? `Faz başka bir düğümün (${a(p, "onceki")}) gövdesine yazılmış` : `kendisinden önce ${a(p, "onceki")} ilan edilmiş`}. Faz dosyası Faz ilanıyla başlar; Bloklar onun gövdesinde büyür (MIM-1.2).`,
    oneri: (p) => `Faz ilanını dosyanın ilk bildirimi yap ve öteki ilanları ya Faz gövdesine ya da kendi raflarındaki dosyalara taşı. Örnek: dosya \`Faz( kod: ${a(p, "kimlik")} ) { Blok( … ) { … } }\` ile başlar.`,
  },
  "yersiz-faz-dosyası": {
    mesaj: (p) => `"${a(p, "kimlik")}" Fazı "${a(p, "dosyaAdi")}" dosyasında yaşıyor; ${b(p, "klasor") ? "dosya faz klasöründe fakat adı sıra önekli değil" : "dosya plan rafının faz klasöründe değil"}. Her Faz \`faz/\` klasöründe sıra önekli (\`0_\`, \`1_\`, …) kendi dosyasında yaşar; Fazların sırası dosya adından okunur (MIM-1.2).`,
    oneri: (p) => `${b(p, "klasor") ? "Dosyanın adına Faz sırasını önek olarak yaz" : "Dosyayı plan rafının faz klasörüne taşı ve adına Faz sırasını önek olarak yaz"}. Örnek: \`is/plan/faz/1_${a(p, "dosyaAdi").replace(/^\d+_/, "")}\` dosyasının tepesinde \`Faz( kod: ${a(p, "kimlik")} ) { … }\`.`,
  },
  // ── Dil ve söz dizimi ─────────────────────────────────────────────────────
  "kanonik-kaynak-biçimi": {
    mesaj: (p) => `"${a(p, "dosya")}" dosyası kanonik hüküm metnini kaynak-gerçek gibi taşıyor, oysa kaynak-gerçek yalnız .sar biçiminde yaşar. Türetilmiş bir metin yüzü kaynakla eş yetkili sayılamaz.`,
    oneri: () => `Hükmü kanonik kaynağa taşı ve metin dosyasını üretilmiş yüz olarak işaretle. Örnek: hükmü \`yasa/kanon/<bölüm>.sar\` içine \`Karar( kod: <KOD>, durum: kilitli, karar: "…" )\` olarak yaz, metin dosyasının başına \`<!-- üretilmiştir: <kaynak>.sar -->\` satırını koy.`,
  },
  "orthografi-kaybı": {
    mesaj: (p) => `"${a(p, "ad")}" adı Türkçe orthografiyi eksik yazıyor; kanonik yazımı "${a(p, "kanonik")}" olmalıydı. Şapkası düşürülmüş ad kanonik kimlikten sessizce ayrılır.`,
    oneri: (p) => `Adı tam orthografiyle yaz. Örnek: \`${a(p, "ad")}:\` yerine \`${a(p, "kanonik")}:\` yaz; arama ve yapılandırma girdisi şapkasız yazımı zaten kabul eder, kaynak kanonik yazımı taşır.`,
  },
  "belge-şekil-drift": {
    mesaj: (p) => `"${varsayilanli(p, "dosya", "bu dosya")}" dosyasındaki belge bloğunun satır düzeni, aynı kaynaktan türetilen biçimli yüzde değişiyor (ilk fark ${a(p, "fark")}. satırda). Belge bloğunun metni, satır sırası ve şekil karakterleri kayıpsız korunmak zorundadır.`,
    oneri: () => `Belge bloğunu kanonik açılış ve ayna kapanış imleri arasında, satır sırasını ve girintisini bozmadan yaz. Örnek: \`-->|\\n# Başlık\\n| sütun | değer |\\n|<--\` iskeletini kullan; çizelge satırlarının başındaki boşlukları silme ve blok içine yapısal girinti ekleme.`,
  },
  "çok-satırlı-değer-drift": {
    mesaj: (p) => `"${varsayilanli(p, "alan", "çok satırlı değer")}" alanının çok satırlı değeri biçimlendirmede içerik kaybediyor (ilk fark ${a(p, "fark")}. satırda). Biçimlendirme yalnız yapısal girintiyi düzenler, kullanıcının anlam taşıyan hizasını değiştiremez.`,
    oneri: (p) => `Çok satırlı değeri üç tırnaklı biçimde yaz ve içerik satırlarını olduğu gibi bırak. Örnek: \`${varsayilanli(p, "alan", "çok satırlı değer")}: """\` satırından sonra metni yaz, hizalamayı koru ve \`"""\` ile kapat.`,
  },
  "kenar-tip-uyuşmazlığı": {
    mesaj: (p) => `"${a(p, "kaynak")}" düğümündeki \`${a(p, "kenar")}\` kenarı "${a(p, "hedef")}" hedefine yöneliyor, oysa bu kenarın hedefi "${a(p, "beklenen")}" tipinde olmalıydı. Kenarın kaynak ve hedef tipi kanonik sözleşmeyle uyuşmuyor.`,
    oneri: (p) => `Kenarı ilanlı kaynak-hedef çiftine göre kur. Örnek: \`${a(p, "kenar")}: <${a(p, "beklenen")} kodu>\` yaz; hedef başka bir role aitse o rolün kendi kenar adını kullan.`,
  },
  "numara-grafı-uyumsuz": {
    mesaj: (p) => `Madde kodu "${a(p, "kod")}" tek numara grafına katılmıyor: ${yc(p, "tr")}. Kanon yalnız sekiz bölümün hiyerarşik madde kodlarından oluşan tek bir numara grafı kullanır.`,
    oneri: () => `Kodu kendi bölüm önekiyle ve çözülebilir bir üst dayanakla yaz. Örnek: \`Kural <ad>( kod: STR-1.1, dayanak: STR-1 )\` — dayanak zinciri kendi bölümünün sıfırıncı maddesine ulaşmalı ve döngü kurmamalıdır.`,
  },
  "madde-kodu-uyumsuz": {
    mesaj: (p) => `Madde kodu "${a(p, "kod")}" hiyerarşik kod sözleşmesini bozuyor: ${yc(p, "tr")}. Her bölüm kendi önekiyle yazılan sıfırıncı maddeden başlar, ana maddeler boşluksuz ardışık sayılarla ilerler ve özelleşmeler var olan ana maddenin koduna noktalı alt numara ekler.`,
    oneri: (p) => `Kodu ardışık ve ebeveynli yaz. Örnek: \`Kural <ad>( kod: ${a(p, "onerilen")}, ne: "<madde başlığı>", dayanak: <ana madde kodu> )\` biçiminde yaz; bir alt numara yazacaksan önce ana maddesini ilan et.`,
  },
  "ilgili-önek-geçersiz": {
    mesaj: (p) => `\`ilgili\` listesi "${a(p, "uye")}" üyesini taşıyor: ${yc(p, "tr")}. Üyelikler açık, tekil ve kanonik yazılır.`,
    oneri: () => `Listeyi yalnız sekiz bölümün kök madde kimliğinden kur ve yinelemeyi temizle; çıplak bölüm öneki kimlik değildir. Örnek: \`ilgili: [ MIM-0, DIL-0, TIP-0, YAS-0, YUZ-0, STR-0, OGR-0, ORK-0 ]\` kümesinden gerekli olanları seç.`,
  },

  // ── Mimari omurga ─────────────────────────────────────────────────────────
  "proje-köksüz-üretim": {
    mesaj: (p) => `"${a(p, "ad")}" (${a(p, "kimlik")}) üretken bir düğüm ama hiçbir Proje kökünün altında yaşamıyor. Kimlik, sahiplik ve tanı grubu Proje düğümünden türer; köksüz üretim bu üçünü de türetemez.`,
    oneri: () => `Üretken ağacı bir Proje kökünün altına al. Örnek: \`ÇalışmaAlanı( kod: CAL-ANA ) { Proje( kod: PRJ-ANA, rejim: katı ) { Faz( kod: FAZ-ILK ) { … } } }\` yerleşimini kur.`,
  },
  "çok-teknolojili-katman": {
    mesaj: (p) => `Katman "${a(p, "kimlik")}" birden çok Teknolojiye bağlanıyor (${a(p, "hedefler")}). Katman tam olarak bir teknoloji dalının mimari sınırıdır.`,
    oneri: (p) => `Her teknoloji için ayrı Katman kur. Örnek: \`Katman( kod: ${a(p, "kimlik")}-ONYUZ, ad: "önyüz", kullanır: <birinci teknoloji> )\` ve \`Katman( kod: ${a(p, "kimlik")}-ARKAYUZ, ad: "arkayüz", kullanır: <ikinci teknoloji> )\` biçiminde böl.`,
  },
  "adım-atomikliği": {
    mesaj: (p) => `Adım "${a(p, "kimlik")}" atomiklik sözleşmesini sağlamıyor: ${yc(p, "tr")}. Her Adım tek oturumda yürütülen, tek kabul kapısıyla sonuçlanan ve en az bir Meyve teslim eden en küçük yürütme birimidir.`,
    oneri: () => `İşi böl ya da eksik teslimi beyan et. Örnek: \`Adım( kod: <KOD>, durum: beklemede ) { ne: "tek cümlelik iş" kabul: [ "tek kabul ölçütü" ] üretir: [ Meyve( kod: MYV-<KOD>, tür: Kod, dosya: "src/<dosya>" ) ] }\` biçiminde yaz.`,
  },
  "üretimsiz-meyve": {
    mesaj: (p) => `Meyve "${a(p, "kimlik")}" hiçbir Adımın \`üretir\` bağına bağlı değil; teslimin üretim yeri izlenemiyor. Her Meyve tam olarak bir üreten Adıma bağlanır.`,
    oneri: (p) => `Meyveyi üreten Adımın gövdesine bağla. Örnek: \`Adım( kod: <ADIM> ) { üretir: [ Meyve( kod: ${a(p, "kimlik")}, tür: Kod, dosya: "src/<dosya>" ) ] }\` yaz.`,
  },
  "meyve-dosyası-eksik": {
    // `tip` hanesi düğümün widget adını taşır (varsayılan Meyve): aynı MIM-2.1
    // doğrulaması Kod düğümünün dosya beyanını da ölçer (V1B-KODMEYVE-A01) ve
    // cümle düğümü kendi adıyla anar — Kod düğümüne "Meyve" denmez.
    mesaj: (p) => a(p, "tip", "Meyve") === "Kod"
      ? `Kod "${a(p, "kimlik")}" somut bir kaynak-dosya teslimi ama ${yc(p, "tr")}. Beyan edilen dosya yolu proje kökü içinde çözülen somut ve tekil bir yol olmak zorundadır.`
      : `Meyve "${a(p, "kimlik")}" (tür: ${a(p, "tur")}) dosya-zorunlu bir teslim ama ${yc(p, "tr")}. Bu türlerde proje kökü içinde çözülen somut bir yol beyan edilmek zorundadır.`,
    oneri: (p) => a(p, "tip", "Meyve") === "Kod"
      ? `Proje kökü içinde çözülen bir yol yaz. Örnek: \`Kod( kod: ${a(p, "kimlik")}, dosya: "src/<klasör>/<dosya>" )\` — yol proje dışına taşmamalı ve diskte karşılığı bulunmalıdır.`
      : `Proje kökü içinde çözülen bir yol yaz. Örnek: \`Meyve( kod: ${a(p, "kimlik")}, tür: ${a(p, "tur")}, dosya: "src/<klasör>/<dosya>" )\` — yol proje dışına taşmamalı ve diskte karşılığı bulunmalıdır.`,
  },

  // ── Öğretim ───────────────────────────────────────────────────────────────
  "öğretim-kaynak-drifti": {
    mesaj: (p) => `"${a(p, "dosya")}" öğretim metni kanonik kaynaktan türemiyor: ${yc(p, "tr")}. Öğretim metinlerinin normatif içeriği elle yazılamaz, kanonik düğüm ya da sicilden üretilir.`,
    oneri: () => `Metni üretim zincirine bağla. Örnek: dosyanın başına \`<!-- üretilmiştir: <kaynak>.sar · üretici: <komut> -->\` satırını koy ve normatif cümleyi kaynak düğüme taşı.`,
  },
  "öğretim-yüzü-uyumsuz": {
    mesaj: (p) => `"${a(p, "kod")}" tanısının öğretim yüzleri birbiriyle çelişiyor: ${yc(p, "tr")}. İhlal öncesindeki açıklama ile ihlal anındaki mesaj ve öneri aynı kavramı, gerekçeyi ve düzeltme yönünü öğretmelidir.`,
    oneri: (p) => `Tanının mesajını ve önerisini tek metin kaynağından besle; öneri düzeltmeyi yapıştırılabilir bir iskeletle göstersin. Örnek: katalog girdisini \`"${a(p, "kod")}": { mesaj: (p) => \\\`<ne bulundu ve neden sorun>\\\`, oneri: () => \\\`<nasıl düzeltilir> Örnek: \\\\\\\`<yapıştırılabilir iskelet>\\\\\\\`\\\` }\` biçiminde yaz.`,
  },
  "beceri-kartı-eksik": {
    mesaj: (p) => `Beceri "${a(p, "kimlik")}" öğretim sözleşmesini tamamlamıyor: ${yc(p, "tr")}. Her Beceri kartı hedefini, tetikleyicisini, uygulama adımlarını ve kabul kanıtını birlikte taşır.`,
    oneri: (p) => `Eksik bağı ekle. Örnek: \`Beceri( kod: ${a(p, "kimlik")}, uygular: <hedef kodu>, neZaman: "hangi durumda tetiklenir", örnek: "nasıl uygulanır", kabul: "hangi kanıtla doğrulanır" )\` yaz.`,
  },
  "başvuru-sicil-drifti": {
    mesaj: (p) => `"${a(p, "dosya")}" başvuru yüzü kanonik sicilden ayrışıyor: ${yc(p, "tr")}. Başvuru satırları ilgili sicillerden eksiksiz ve deterministik olarak üretilir.`,
    oneri: () => `Elle tutulan ikiz tabloyu üretime devret. Örnek: tabloyu \`<!-- SARMAL:BAŞVURU -->\` ve \`<!-- /SARMAL:BAŞVURU -->\` işaretleri arasına al, içeriği üreticiye yazdır.`,
  },
  "öğretim-etki-eksik": {
    mesaj: (p) => `"${a(p, "kimlik")}" kanonik yeniliği öğretim etkisini işlememiş: ${yc(p, "tr")}. Her yenilik aynı değişiklikte ajan bağlamına, öğretim yüzlerine ve hedeflediği Beceri kartlarına bağlanır.`,
    oneri: (p) => `Etki bağını aynı değişiklikte kur. Örnek: \`Adım( kod: ${a(p, "kimlik")} ) { etkiler: [ <öğretim yüzü kodu>, <beceri kodu> ] }\` yaz; etkilenmeyen yüz varsa gerekçesini \`etkisiz: "neden"\` alanıyla beyan et.`,
  },
  "önceliksiz-adım": {
    mesaj: (p) => `${a(p, "kapsayıcı")} kapsayıcısında ${a(p, "sayı")} açık Adım öncelik beyanı taşımıyor: ${a(p, "örnek")}. Beyansız açık Adımın sıralamadaki yeri okunamaz.`,
    oneri: () => `Her açık Adıma bir kademe yaz. Örnek: \`Adım( kod: ADM-X, durum: beklemede, öncelik: p2 )\` — kademe seçimi insan hükmüdür ve motor onu önermez; yalnız beyanın yokluğunu görür.`,
  },
  "ateşlemiş-hatırlatıcı": {
    mesaj: (p) => `"${a(p, "kimlik")}" hatırlatıcısının beklediği "${a(p, "hedef")}" Adımı tamamlandı; hatırlatıcı hâlâ ${a(p, "durum")} durumunda, yani ateşlemiş ve kapatılmayı bekliyor.`,
    oneri: (p) => `Hatırlatıcıyı kapat ya da yeni hedefine bağla. Örnek: iş gerçekten bittiyse \`Hatırlatıcı( kod: ${a(p, "kimlik")}, durum: tamamlandı )\` yaz; iş sürüyorsa \`hatırlat:\` kenarını devam eden Adıma taşı.`,
  },
  "öğretim-bayat": {
    mesaj: (p) => `"${a(p, "dosya")}" öğretim çıktısı güncel sayılamaz: ${yc(p, "tr")}. Çıktı, üretildiği kaynağın kimliğini ve girdi mührünü izlemek zorundadır.`,
    oneri: () => `Çıktıyı yeniden üret ve mührü tazele. Örnek: dosyanın başına \`<!-- üretilmiştir: <kaynak>.sar · mühür: <özet> -->\` satırını yaz ve kaynak değişince üreticiyi yeniden koştur.`,
  },
  "üretilmiş-öğretim-değiştirilmiş": {
    mesaj: (p) => `"${a(p, "dosya")}" üretilmiş öğretim metni izinli üretim bölgesinin dışında elle değiştirilmiş: ${yc(p, "tr")}. Kalıcı içerik değişikliği kanonik kaynağa yapılır.`,
    oneri: () => `Değişikliği kaynağa taşı ve çıktıyı yeniden üret. Örnek: elle yazılan cümleyi kaynak düğüme \`ne: "<cümle>"\` olarak al, üretilecek bölgeyi \`<!-- SARMAL:BÖLGE -->\` ile \`<!-- /SARMAL:BÖLGE -->\` arasına kapat ve üreticiyi yeniden koştur.`,
  },
  "kanıtsız-beceri-terfisi": {
    mesaj: (p) => `"${a(p, "kimlik")}" öğrenimi kanıtsız terfi etmiş: ${yc(p, "tr")}. Bir ders ancak hedef davranış üzerinde yinelenebilir kanıt sağlandıktan sonra Beceriye yükselir.`,
    oneri: (p) => `Terfiyi kanıta bağla. Örnek: \`Bellek( kod: ${a(p, "kimlik")}, terfi: tamamlandı, doğrulama: <sınama kodu> )\` yaz ve terfi eden Beceriyi \`uygular: <hedef kodu>\` ile bağla.`,
  },

  // ── Orkestrasyon ve ilişki sınıfları ──────────────────────────────────────
  "ilişki-sınıfı-ihlali": {
    mesaj: (p) => `"${a(p, "kimlik")}" düğümündeki \`${a(p, "kenar")}\` kenarı yanlış ilişki sınıfında kullanılmış: ${yc(p, "tr")}. Mimari görünürlük, Adım sırası ve üretim kökeni birbirinin anlamını üstlenemez.`,
    oneri: () => `Kenarı ilanlı sınıfına taşı. Örnek: kapsama ilişkisi için düğümü ebeveynin gövdesine al, yürütme sırası için \`bağımlı: [ <Adım kodu> ]\`, üretim kökeni için \`üretir: [ Meyve( … ) ]\` yaz.`,
  },
  "mimari-bağı-ihlali": {
    mesaj: (p) => `"${a(p, "kimlik")}" düğümünün mimari kapsama bağı kademe sözleşmesini bozuyor: ${yc(p, "tr")}. Mimari görünürlük yalnız ardışık gövde, dal, modül ve iş kademeleri arasında kurulur.`,
    oneri: () => `Kademeyi atlamadan sar. Örnek: \`Blok( … ) { Katman( … ) { AltKatman( … ) { Adım( … ) } } }\` sırasını kur; eş kademeler arasında kapsama bağı yazma.`,
  },
  "yürütme-kenarı-sözleşmesi": {
    mesaj: (p) => `"${a(p, "kimlik")}" düğümündeki \`${a(p, "kenar")}\` kenarı yürütme sözleşmesini bozuyor: ${yc(p, "tr")}. Yürütme kenarları yalnız Adım kaynakları ile Adım hedefleri arasında tek yönlü, döngüsüz graf kurar.`,
    oneri: () => `Kenarı Adımdan Adıma kur ve ters yazımı tekrarlama. Örnek: \`Adım( kod: ADM-ARDIL, bağımlı: [ ADM-ONCUL ] )\` yeterlidir; aynı çifti ayrıca \`besler\` ile yazma.`,
  },
  "üretim-kökeni-ihlali": {
    mesaj: (p) => `"${a(p, "kimlik")}" düğümündeki \`üretir\` kenarı üretim kökeni sözleşmesini bozuyor: ${yc(p, "tr")}. Bu kenar yalnız bir Adımdan bir Meyveye yönelir ve yürütme sırası kurmaz.`,
    oneri: (p) => `Kenarı Adımdan Meyveye kur. Örnek: \`Adım( kod: ${a(p, "kimlik")} ) { üretir: [ Meyve( kod: MYV-KAYNAK, tür: Kod, dosya: "src/<dosya>" ) ] }\` yaz; sıra gerekiyorsa ayrıca \`bağımlı:\` kenarı ekle.`,
  },
  "kullanır-kenarı-ihlali": {
    mesaj: (p) => `"${a(p, "kimlik")}" düğümündeki \`${p.kenar ? a(p, "kenar") : "kullanır"}\` kenarı izinli çift dışında: ${yc(p, "tr")}. Zemin iki tip-saf kenarla yazılır: \`kullanır\` Projeyi ortak kimlik köküne ya da Katmanı tek bir somut Teknolojiye, \`takım\` ise Katmanı onu yürüten bir ya da birden çok Takıma bağlar; iki kenar birbirinin yerine geçmez.`,
    oneri: () => `Kenarı izinli çifte indir. Örnek: \`Katman( kod: KAT-ONYUZ, takım: TAKIM-ONYUZ, kullanır: TEK-FLUTTER )\` ya da \`Proje( kod: PRJ-ANA, kullanır: KMK-ORTAK )\` yaz; başka bir bağ için kendi kenar adını kullan.`,
  },
  "deterministik-sıra-ihlali": {
    mesaj: (p) => `"${a(p, "kimlik")}" düğümü yürütme sırasını Adım grafının dışından türetiyor: ${yc(p, "tr")}. Sıra yalnız Adımlar arasındaki yürütme kenarlarından, kararlı topolojik sıralamayla çıkar.`,
    oneri: () => `Sırayı Adım kenarlarıyla yaz. Örnek: kapsayıcıdaki \`bağımlı:\` alanını kaldır, sırayı \`Adım( kod: ADM-ARDIL, bağımlı: [ ADM-ONCUL ] )\` biçiminde Adımın kendisine taşı.`,
  },
  "seçilemez-adım-yürütümü": {
    mesaj: (p) => `Adım "${a(p, "kimlik")}" seçilebilir değilken yürütülmüş görünüyor: ${yc(p, "tr")}. Yalnız açık durumdaki ve bütün öncülleri tamamlanmış işler seçilebilir.`,
    oneri: () => `Önce öncülü kapat, sonra bu Adımı başlat. Örnek: öncül Adımı \`durum: tamamlandı\` yap ya da bu Adımı \`durum: beklemede\` konumuna geri al.`,
  },
  "döngü-sonlanması-eksik": {
    mesaj: (p) => `Döngü "${a(p, "kimlik")}" sonlanma güvencesini taşımıyor: ${yc(p, "tr")}. Her Döngü en az bir çözülebilir işletim hedefi ve en az bir sonlanma koşulu ilan eder.`,
    oneri: (p) => `Hedefi ve sonlanmayı birlikte yaz. Örnek: \`Döngü( kod: ${a(p, "kimlik")}, tetik: koşul, koşar: <hedef kodu>, durunca: "kapı temiz", turLimiti: 5 )\` biçiminde tamamla.`,
  },
  "kapı-kabul-kanıtı-eksik": {
    mesaj: (p) => `Kapı "${a(p, "kimlik")}" kabul kanıtı olmadan geçilmiş görünüyor: ${yc(p, "tr")}. Bir kapı yalnız ilanlı kabul ölçütlerinin tamamını karşılayan, çözülebilir ve doğrulanmış kanıtla geçilir.`,
    oneri: (p) => `Kabul ölçütünü ve kanıtını birlikte yaz. Örnek: \`Kapı( kod: ${a(p, "kimlik")}, kabul: [ "sıfır hata ve sıfır uyarı" ], kanıt: <sınama kodu> )\` yaz.`,
  },
  "çapraz-proje-ad-alanı": {
    mesaj: (p) => `"${a(p, "kimlik")}" düğümündeki \`${a(p, "kenar")}\` kenarı başka bir Projedeki "${a(p, "hedef")}" hedefine niteliksiz yöneliyor. Niteliksiz kimlik yalnız kendi Projesi içinde çözülür; tesadüfî küresel eşleşme geçerli bağ sayılmaz.`,
    oneri: (p) => `Hedefi açık Proje ad-alanıyla yaz. Örnek: \`${a(p, "kenar")}: ${a(p, "onerilen", "PRJ-DIGER::" + a(p, "hedef"))}\` biçiminde nitele.`,
  },
  "auth-omurgası-ihlali": {
    mesaj: (p) => `"${a(p, "kimlik")}" kimlik omurgası sözleşmesini bozuyor: ${yc(p, "tr")}. Kimlik sağlayıcıları yalnız bir kimlik kökünün altında yaşar ve ortak kimlik kullanımı Proje kimliklerini birleştirmez.`,
    oneri: () => `Sağlayıcıyı kökün altına al. Örnek: \`KimlikKökü( kod: KMK-ORTAK ) { KimlikSağlayıcısı( kod: KMS-GOOGLE, tür: google ) }\` yerleşimini kur, Projeyi \`kullanır: KMK-ORTAK\` ile bağla.`,
  },
  "founder-ortak-auth-eksik": {
    mesaj: (p) => `Kurucu Projesi "${a(p, "kimlik")}" çalışma alanının ortak kimlik kökünü göstermiyor: ${yc(p, "tr")}. Bu bağ isteğe bağlı bırakılamaz ve yerel bir kökle ikame edilemez.`,
    oneri: (p) => `Ortak kökü zorunlu bağla. Örnek: \`Proje( kod: ${a(p, "kimlik")}, rejim: katı, kullanır: KMK-ORTAK )\` yaz; çalışma alanında tam olarak bir ortak kök bulunmalıdır.`,
  },
  "şef-akışı-ihlali": {
    mesaj: (p) => `"${a(p, "kimlik")}" işinde orkestrasyon akışı bozulmuş: ${yc(p, "tr")}. Yürütme yalnız seçilebilir işten bağlam kurar ve durumu yalnız doğrulanmış kabul kanıtına göre değiştirir.`,
    oneri: () => `Durum değişikliğini kanıta bağla. Örnek: koşum kaydını \`koşu: Koşum( karar: VERIFIED, kanıt: <sınama kodu> )\` biçiminde yaz, ancak ondan sonra \`durum: tamamlandı\` yap.`,
  },
  "üretici-denetçi-çakışması": {
    mesaj: (p) => `"${a(p, "kimlik")}" teslimi için üretici ve denetçi rolleri ayrılmamış: ${yc(p, "tr")}. Aynı teslimi üreten oturum kendi işine kabul hükmü veremez.`,
    oneri: () => `Denetimi ayrı bir oturuma ver. Örnek: \`Adım( kod: <KOD>, üretici: <üretici etmen kodu>, denetçi: <başka etmen kodu> )\` yaz; iki alan aynı kimliği taşıyamaz.`,
  },
  "oturum-adım-sınırı": {
    mesaj: (p) => `"${a(p, "kimlik")}" oturumu birden çok işi birlikte yürütüyor: ${yc(p, "tr")}. Bir oturum tam olarak bir işi yürütür ve o işin kabul, teslim, kanıt ve durum kapanışı tamamlanmadan başkasına geçmez.`,
    oneri: () => `İşi ayrı ve sıralı oturumlara böl. Örnek: \`Koşum( kod: <KOD>, adım: <tek Adım kodu> )\` yaz; ikinci iş için ayrı bir koşum kaydı aç.`,
  },

  // ── Strateji, göç ve sınırlar ─────────────────────────────────────────────
  "unutma-kapısı-ihlali": {
    mesaj: (p) => `"${a(p, "dosya")}" kanonik kaynağı geçmiş bir kimliğe atıf taşıyor: "${a(p, "atif")}". Geçmiş kimlikler kanonik dosyaya açıklama ya da izlenebilirlik gerekçesiyle dahi geri sokulamaz.`,
    oneri: () => `Atfı kaldır ve dayanağı yeni madde grafında kur. Örnek: \`dayanak: <eski kimlik>\` satırını \`dayanak: STR-1\` gibi yürürlükteki bir madde koduyla değiştir; kimliği yorum içinde de saklama.`,
  },
  "kanon-kodu-uyumsuz": {
    mesaj: (p) => `"${a(p, "kod")}" maddesinin dayanak bağı tek kod grafına katılmıyor: ${yc(p, "tr")}. Sıfırıncı madde dışındaki her dayanak çözülebilir olmalı ve kendi bölümünün kökine ulaşan döngüsüz bir zincire katılmalıdır.`,
    oneri: (p) => `Dayanağı çözülebilir bir üst maddeye bağla. Örnek: \`Kural <ad>( kod: ${a(p, "kod")}, dayanak: ${a(p, "onerilen", "<üst madde kodu>")} )\` yaz.`,
  },
  "göç-sırası-ihlali": {
    mesaj: (p) => `"${a(p, "kimlik")}" göç aşaması, zorunlu öncülünün temiz kapısı kapanmadan başlamış: ${yc(p, "tr")}. Göç aşamaları sırasını eksiksiz izler, atlanamaz ve tersine çevrilemez.`,
    oneri: () => `Eksik aşamaya dön ve kapısını kapat. Örnek: öncül Adımı \`durum: tamamlandı\` yapıp koşu kaydını yaz, ancak sonra ardıl aşamayı \`durum: geliştirmede\` yap.`,
  },
  "göç-kapısı-eksik": {
    mesaj: (p) => `"${a(p, "kimlik")}" göç aşaması eksik kapanış kaydıyla kapatılıyor: ${yc(p, "tr")}. Bir aşama kapsam envanteri, doğrulama sonucu, sahipli borç kaydı ve devredilen etki kümesi birlikte yazılmadan kapanamaz.`,
    oneri: (p) => `Kapanış kaydını dört parçasıyla yaz. Örnek: \`Adım( kod: ${a(p, "kimlik")} ) { koşu: "kapsam envanteri tamdır; doğrulama sıfır hata ve sıfır uyarı verdi; kalan borç sahibiyle kayıtlıdır; devredilen etki kümesi açıktır." }\` biçiminde tamamla.`,
  },
  "açık-gizli-sınır-ihlali": {
    mesaj: (p) => `"${a(p, "dosya")}" açık çekirdek dosyası gizli ürün tarafına zorunlu bağ kuruyor: ${yc(p, "tr")}. Açık dil ve motor, gizli orkestrasyon ürününden bağımsız olarak kullanılabilir ve sınanabilir kalmalıdır.`,
    oneri: () => `Bağı ilanlı bir sözleşme sınırına taşı. Örnek: doğrudan yol yerine açık tarafta \`Sözleşme( kod: SZL-SINIR, ne: "<hangi yetenek>", alanlar: { … } )\` ilan et; gizli ürün bu sözleşmeyi kendi tarafında uygulasın ve açık çekirdek gizli ağaca hiç bakmasın.`,
  },
  "çekirdek-bağımlılık-drifti": {
    mesaj: (p) => `"${a(p, "dosya")}" bağımlılık sadeliğinden ayrılıyor: ${yc(p, "tr")}. Açık çekirdek yalnız temel işlev için zorunlu, ilanlı ve ikame edilebilir bağımlılıkları taşır.`,
    oneri: () => `Bağımlılığı ilan et ya da kaldır. Örnek: gerçekten zorunluysa paket bildiriminde \`"dependencies": { "<paket>": "^<sürüm>" }\` girdisini gerekçesiyle bırak; değilse girdiyi sil ve kullanımı çekirdek dışına taşı.`,
  },
  "yürütücü-bağımlılığı": {
    mesaj: (p) => `"${a(p, "kimlik")}" hükmü belirli bir dış yürütücüye bağlanıyor: "${a(p, "iz")}". Kanonik hüküm, öğretim ve orkestrasyon sözleşmesi yürütücü kimliğinden bağımsız anlaşılabilir olmalıdır.`,
    oneri: () => `Sözleşmeyi yetenekten bağımsız yaz. Örnek: yürütücü adı yerine \`gereken yetenek: "uzun bağlamda yapısal çıkarım"\` gibi bir koşul yaz; kabul ölçütünü çıktıya bağla, araca değil.`,
  },
  "etki-yayın-kapısı-eksik": {
    mesaj: (p) => `"${a(p, "kimlik")}" değişikliği yayın kapısı kapanmadan yürürlüğe alınıyor: ${yc(p, "tr")}. Her kanonik değişiklik, geçişli etki kümesi doğrulanıp kapı tam yeşil olmadan yürürlük başlatamaz.`,
    oneri: (p) => `Etki kümesini ve kapı sonucunu kayda geçir. Örnek: \`Adım( kod: ${a(p, "kimlik")} ) { koşu: "geçişli etki kümesi çıkarıldı ve doğrulandı; kapı sıfır hata ve sıfır uyarı verdi." }\` yaz.`,
  },
  "ölü-iz": {
    mesaj: (p) => `"${a(p, "iz")}" artık kanonik anlam taşımıyor fakat etkin kapsamda duruyor (${p.dugum == null ? a(p, "yer") : `${a(p, "dugum")} düğümünün "${a(p, "kenar")}" kenarı`}). Ölü izin korunması, yürürlükten kalkmış seçeneği canlıymış gibi gösterir.`,
    oneri: () => `İzi sahipli biçimde emekliye ayır. Örnek: kaydı kaldır ya da \`emekli: "hangi hükümle ve ne zaman kalktı"\` alanıyla gerekçesini beyan et.`,
  },

  // ── Tip sistemi ───────────────────────────────────────────────────────────
  "tip-evreni-eksik": {
    mesaj: (p) => `Kanonik tip evreninde eksik kayıt var: ${yc(p, "tr")}. Hiçbir düğüm tipi yeni omurga dışında bırakılamaz, yeniden adlandırılamaz ya da sessizce emekli edilemez.`,
    oneri: (p) => `Eksik kaydı tip kanonuna geri koy. Örnek: sınıflama kaydına \`{ "ad": "${a(p, "tip")}", "aile": "<aile>", "ne": "<tek cümlelik tarif>" }\` girdisini ekle.`,
  },
  "omurga-tipi-eksik": {
    mesaj: (p) => `Yeni omurga tipi "${a(p, "tip")}" kanonik kayıtta eksik: ${yc(p, "tr")}. Bu roller genel ürün ya da servis tipleriyle ikame edilemez.`,
    oneri: (p) => `Tipi ailesi, şeması ve sarma kaydıyla birlikte ilan et. Örnek: sınıflama kaydına \`{ "ad": "${a(p, "tip")}", "aile": "<aile>", "ne": "<tek cümlelik tarif>" }\` girdisini, \`"semalar": { "${a(p, "tip")}": { "zorunlu": [ "kod" ] } }\` şemasını ve \`"izinliSarma": { "<ebeveyn>": [ "${a(p, "tip")}" ] }\` satırını birlikte yaz.`,
  },
  "şema-tanımı-eksik": {
    mesaj: (p) => `"${a(p, "tip")}" tipinin yapısal sözleşmesi makine-okur biçimde beyan edilmemiş: ${yc(p, "tr")}. Düğüm doğrulaması yalnız kanonik şemadan türetilir.`,
    oneri: (p) => `Şemayı kanona yaz. Örnek: sınıflama kaydına \`"${a(p, "tip")}": { "zorunlu": [ "kod" ], "opsiyonel": [ "ne" ] }\` girdisini ekle.`,
  },
  "şema-dışı-alan": {
    mesaj: (p) => `"${a(p, "ad")}" (${a(p, "kimlik")}) düğümünde "${a(p, "alan")}" alanı kullanılıyor, oysa bu alan tipin kanonik şemasında ve ortak alan sözlüğünde yok. Şema dışındaki alan veri olarak durabilir ama doğrulanmış sayılmaz.`,
    oneri: (p) => `Geçerli bir alan kullan ya da şemayı kanonik olarak genişlet. Örnek: alan gerçekten gerekliyse sınıflama kaydına \`"${a(p, "ad")}": { "opsiyonel": [ "${a(p, "alan")}" ] }\` girdisini ekle; gerekli değilse satırı kaldır.`,
  },
  "örtü-ihlali": {
    mesaj: (p) => `Çalışma alanı örtüsü taban kanonu değiştiriyor: ${yc(p, "tr")}. Örtü yalnız izin verilen kümelere birleşim yoluyla değer ekler, taban değerlerini koruyamadığı yerde geçersizdir.`,
    oneri: () => `Örtüyü katkılı birleşime indir. Örnek: örtü dosyasında yalnız \`{ "semalar": { "<tip>": { "enum": { "<alan>": [ "<yeni değer>" ] } } } }\` biçiminde yeni değer ekle; taban değerleri tekrarlama, silme ve şema gövdesini yeniden tanımlama.`,
  },

  // ── Yönetişim ve rejim ────────────────────────────────────────────────────
  "rejim-beyanı-eksik": {
    mesaj: (p) => `Proje "${a(p, "kimlik")}" zorlama rejimini beyan etmiyor${yc(p, "tr", "")}. Rejim tam bir kez ve yalnız katı ya da esnek değeriyle yazılır; hiçbir motor, yüzey ya da koşum sessiz varsayım üretemez.`,
    oneri: (p) => `Beyanı Proje bildirimine ekle. Örnek: \`Proje( kod: ${a(p, "kimlik")}, rejim: katı )\` — küçük ya da deneysel bir iş yürütüyorsan \`rejim: esnek\` yaz.`,
  },
  "katı-rejim-altkatman-eksik": {
    mesaj: (p) => `Katman "${a(p, "kimlik")}" katı rejimde doğrudan Adım taşıyor. Katı rejimde her Katman ile Adım arasındaki yol en az bir departman kademesinden geçer.`,
    oneri: (p) => `Araya departman kademesi koy. Örnek: \`Katman( kod: ${a(p, "kimlik")} ) { AltKatman( kod: ALT-KODLAMA, ad: "Kodlama", departman: kodlama ) { Adım( kod: <ADIM> ) } }\` yerleşimini kur.`,
  },
  "rejim-geçiş-uyumsuzluğu": {
    mesaj: (p) => `Proje "${a(p, "kimlik")}" rejimini "${a(p, "rejim")}" olarak beyan ediyor ama yapı bu rejimi sağlamıyor (${yc(p, "tr")}). Motor mevcut yapıyı kendiliğinden sarmaz, taşımaz ya da silmez.`,
    oneri: () => `Aykırı düğümleri elle düzelt ya da rejimi geri al. Örnek: eksik departman kademelerini \`AltKatman( kod: ALT-KODLAMA, ad: "Kodlama", departman: kodlama )\` ile ekle; hazır değilsen \`rejim: esnek\` yazıp geçişi sonraya bırak.`,
  },
  "hüküm-türü-uyumsuz": {
    mesaj: (p) => `"${a(p, "kimlik")}" hükmünün rolü seçilen yasa tipiyle uyuşmuyor: ${yc(p, "tr")}. Niyet, zorlama, üst sınır, işletim ve dış yükümlülük rolleri birbirinin otoritesini üstlenemez.`,
    oneri: () => `Hükmü rolüne uygun tipe taşı. Örnek: makinenin zorlayacağı koşulu \`Kural <ad>( kod: <KOD>, katman: yapısal, koşul: <ifade> )\` olarak yaz; yalnız yön kilitleyen hükmü \`Karar( kod: <KOD>, durum: kilitli, karar: "…" )\` olarak bırak.`,
  },
  "kural-sözleşmesi-eksik": {
    mesaj: (p) => `Kural "${a(p, "kimlik")}" otorite, katman ve çözülebilir kapsam üçlüsünü taşımıyor: ${yc(p, "tr")}. Bu üçlü eksikken kuralın kimin üstünde olduğu, kimin zorlayacağı ve nereye uygulanacağı bilinemez.`,
    oneri: (p) => `Üçlüyü tamamla. Örnek: \`Kural <ad>( kod: ${a(p, "kimlik")}, otorite: anayasa, katman: yapısal, kapsam: Adım, koşul: <ifade> )\` biçiminde yaz.`,
  },
  "tanı-sözleşmesi-uyumsuz": {
    mesaj: (p) => `"${a(p, "kod", "adsız tanı")}" tanısı sözleşmesini tamamlamıyor: ${yc(p, "tr")}. Her tanı düzey, tekil kod, eyleme dönük mesaj, kaynak konumu ve uygulanabilir düzeltme önerisi taşır ve kodu kanonik sicilde bulunur.`,
    oneri: () => `Eksik alanı doldur ve kodu sicile kaydet. Örnek: tanıyı \`{ duzey: "hata", kod: "<kimlik>", mesaj: "<ne bulundu ve neden sorun>", satir: <satır>, sutun: <sütun>, oneri: "<nasıl düzeltilir>" }\` biçiminde tamamla.`,
  },
  "tanı-kapsamı-karışması": {
    mesaj: (p) => `"${a(p, "kod")}" tanısı yanlış kapıda çalıştırıldı: ${yc(p, "tr")}. Tek-dosya kapısı ile Proje kapısı birbirinin kapsamını taklit edemez ve tek-dosya temizliği Proje temizliği diye sunulamaz.`,
    oneri: (p) => `Tanıyı kendi kapısına taşı. Örnek: sicil kaydını \`{ kod: "${a(p, "kod")}", kapsam: "tek-dosya", uretici: "dogrulayici.ts" }\` olarak okuyup üretimi o üreticiye al; bütün Proje indeksini ya da diski gerektiren bulguyu Proje kapısında bırak.`,
  },
  "proje-tanı-kimliği-uyumsuz": {
    mesaj: (p) => `Tanı kümesinin kimliği Proje kodundan türemiyor: ${yc(p, "tr")}. Bulgu grupları, graf ve karne kimliği fiziksel dizin yolundan değil, tekil Proje kodundan doğar.`,
    oneri: () => `Kimliği Proje koduna bağla. Örnek: çalışma alanındaki her üretken ağacı \`Proje( kod: PRJ-<AD> )\` altına al; aynı dizindeki ayrı Projelerin bulguları birleşmemelidir.`,
  },
  "tanı-terfi-kapısı-ihlali": {
    mesaj: (p) => `"${a(p, "kimlik")}" hükmünün tanı düzeyi kapısız yükseltilmiş: ${yc(p, "tr")}. Yeni bir hüküm önce gözlem düzeyinde izlenir, bulguları temizlendikçe yükselir ve düzey atlanamaz.`,
    oneri: (p) => `Düzeyi bir kademe geri al ve terfiyi kanıta bağla. Örnek: \`Kural <ad>( kod: ${a(p, "kimlik")}, düzey: bilgi )\` ile başlat; bulgular sıfırlanınca \`düzey: uyarı\`, kabul kaydı alınınca \`düzey: hata\` yaz.`,
  },
  "sahte-tam-yeşil": {
    mesaj: (p) => `Tam yeşil ilanı geçerli değil: ${yc(p, "tr")}. Bir kapı yalnız kapsamındaki hata ve uyarı sayısı sıfırken tam yeşildir; atlanan denetim ya da yalnız tek-dosya temizliği tam yeşil sayılamaz.`,
    oneri: () => `Kalan bulguları kapat ya da iddiayı düzelt. Örnek: kapanış kaydını \`koşu: "kapı sıfır hata ve sıfır uyarı verdi; atlanan denetim yoktur; <n> bilgi kaydı görünür kalmaktadır."\` biçiminde yaz; bilgi kayıtları sonucu bozmaz, atlanan kapı bozar.`,
  },
  "terfi-kanıtı-eksik": {
    mesaj: (p) => `"${a(p, "kimlik")}" hükmünün düzeyi eksik kanıtla yükseltilmiş: ${yc(p, "tr")}. Terfi ancak çalışan uygulama bağı, tekrar üretilebilir doğrulama ve yetkili açık kabul kaydı birlikte bulunduğunda yapılır.`,
    oneri: (p) => `Üç kanıtı da bağla. Örnek: \`Kural <ad>( kod: ${a(p, "kimlik")}, uygulama: <tanı kodu>, doğrulama: <sınama kodu>, kabul: <onay kodu> )\` yaz.`,
  },

  // ── Yüzeyler ve prizma ────────────────────────────────────────────────────
  "prizma-kaynak-ayrışması": {
    mesaj: (p) => `"${a(p, "dosya")}" türetilmiş yüzü tek nötr ağaçtan ayrışıyor: ${yc(p, "tr")}. Hiçbir yüz kaynağı yeniden yorumlayamaz, alan ekleyemez ya da çocuk sırasını değiştiremez.`,
    oneri: (p) => `Yüzü ortak ağaçtan üret ve künyesini yaz. Örnek: çıktının başına \`<!-- üretilmiştir: ${a(p, "dosya", "<kaynak>.sar")} · yüz: json -->\` satırını koy, yüzeye özgü dönüşümü kaldır; alan eklemek gerekiyorsa alanı kaynak düğüme \`<alan>: <değer>\` olarak yaz.`,
  },
  "eş-yetkili-yüz-ikizi": {
    mesaj: (p) => `"${a(p, "dosya")}" elle yazılan bir yüz dosyası, kanonik kaynağın eş-yetkili ikizi gibi kullanılıyor (${yc(p, "tr")}). Türetilmiş yüz yalnız yeniden üretilebilir çıktıdır.`,
    oneri: () => `Dosyayı ya üretime bağla ya insan yüzüne indir. Örnek: başına \`<!-- üretilmiştir: <kaynak>.sar -->\` satırını koyup üreticiye devret, ya da normatif cümleleri kaldırıp yalnız karşılama ve yönlendirme bırak.`,
  },
  "yüz-idempotans-drifti": {
    mesaj: (p) => `"${a(p, "dosya")}" yüzü aynı kaynak ve aynı seçeneklerle farklı sonuç veriyor: ${yc(p, "tr")}. Üretici yalnız kendisine ayrılmış bölgeyi yenileyebilir.`,
    oneri: () => `Üretim bölgesini işaretle ve dışına dokunma. Örnek: üretilecek alanı \`<!-- SARMAL:BÖLGE -->\` ve \`<!-- /SARMAL:BÖLGE -->\` arasına al; elle korunan bölümleri bu işaretlerin dışında bırak.`,
  },
  "geliştirme-yüzü-drifti": {
    mesaj: (p) => `Geliştirme yüzü kanonik anlamdan ayrışıyor: ${yc(p, "tr")}. Geliştirme yüzleri aynı kimlikleri, metinleri ve tanı nesnelerini paylaşır; sunum katmanı yorumlama ve zorlama yapamaz.`,
    oneri: () => `Anlamı çekirdekte tut, yüzeyde yalnız taşı. Örnek: yüzeydeki yerel metni silip \`const tani = cekirdek.dogrula(program, snf); yuzeyeBas({ kod: tani.kod, duzey: tani.duzey, mesaj: tani.mesaj, oneri: tani.oneri })\` biçiminde çekirdeğin ürettiği nesneyi olduğu gibi bas.`,
  },
  "tanı-yüzü-uyumsuz": {
    mesaj: (p) => `"${a(p, "kod")}" tanısı yüzler arasında bozuluyor: ${yc(p, "tr")}. Aynı ihlal her yüzde aynı kod, düzey, mesaj özü, konum ve düzeltme yönlendirmesiyle görünür.`,
    oneri: () => `Tanıyı tek nesne olarak taşı; yüzey kendi cümlesini kurmasın. Örnek: her yüzeyde \`{ duzey: tani.duzey, kod: tani.kod, mesaj: tani.mesaj, satir: tani.satir, sutun: tani.sutun, oneri: tani.oneri }\` alanlarını olduğu gibi bas ve düzeyi yerel olarak yeniden derecelendirme.`,
  },
  "tanı-yüzeyi-karışması": {
    mesaj: (p) => `"${a(p, "kod")}" tanısı doğasına uymayan bir sunum yüzeyinde gösteriliyor: "${a(p, "atanan")}" yüzeyine yönlendirilmiş, oysa "${a(p, "beklenen")}" yüzeyine aittir. Düzeltilecek sapma, bilinçli ileri-bağlam ve salt bilgilendirme tek panelde yığılınca "düzelt / hatırla / bil" ayrımı silinir.`,
    oneri: (p) => `Tanıyı doğasının yüzeyine yönlendir; kimliğini ve düzeyini değiştirme. Örnek: yönlendirme kaydını \`{ kod: "${a(p, "kod")}", yüzey: "${a(p, "beklenen")}" }\` olarak yaz — hata ve uyarı düzeyli drift Problems'a, açık Hatırlatıcı düğümleri Hatırlatıcılar'a, bilgi düzeyli ölçüm ve durum işaretleri Bildirimler'e gider.`,
  },
  "yüzey-sözleşmesi-eksik": {
    mesaj: (p) => `Yüzey "${a(p, "kimlik")}" tamamlanmış ürün sözleşmesini taşımıyor: ${yc(p, "tr")}. Her yüzey kararlı kimliğini, üretim kökenini, görünürlük durumunu, tema rolünü ve erişilebilirlik koşulunu birlikte taşır.`,
    oneri: (p) => `Eksik sözleşmeyi tamamla. Örnek: \`Ekran( kod: ${a(p, "kimlik")}, görünürlük: açık, tema: TEM-ANA, referans: <üreten Adım kodu>, erişilebilirlik: "ekran okuyucu etiketi" )\` yaz.`,
  },
  "palet-yüz-drifti": {
    mesaj: (p) => `"${a(p, "rol")}" tema rolü kanonik paletten türemiyor: ${yc(p, "tr")}. Bütün görüntü yüzleri gerçek değerleri aynı üretilmiş paletten alır ve yerel palet kopyası kuramaz.`,
    oneri: (p) => `Rolü tek palete bağla. Örnek: yüzey düğümünde yalnız \`renk: ${a(p, "rol", "birincil")}\` yaz, değeri Tema düğümünün \`dosya:\` beyanındaki teknoloji temasına taşı.`,
  },
  "görünürlük-sözleşmesi-eksik": {
    mesaj: (p) => `Yüzey "${a(p, "kimlik")}" görünürlük sözleşmesini taşımıyor: ${yc(p, "tr")}. Her yüzey görünürlüğünü tam bir kez beyan eder ve gizli yüzey makinece çözülebilen bir açılma koşulu taşır.`,
    oneri: (p) => `Beyanı tamamla. Örnek: \`${a(p, "ad", "Ekran")}( kod: ${a(p, "kimlik")}, görünürlük: açık )\` yaz; gizli tutacaksan \`görünürlük: gizli, açılmaKoşulu: <çözülebilir koşul>\` biçiminde koşulu da yaz.`,
  },
};

/**
 * İngilizce tanı hanesi. Türkçe kurucular yukarıdaki kanonik katalogda bayt
 * değiştirmeden kalır; bu paralel hane aynı kimlikleri ikinci dilde taşır.
 * Önerilerdeki yapıştırılabilir `.sar` örnekleri bilinçli olarak Türkçedir:
 * kaynak dili Türkçe kaldığı için örnek kodu çevirmek geçersiz kaynak üretirdi.
 */
export const TANI_METINLERI_EN: Readonly<Record<string, TaniMetni>> = {
  "altkatman-tekilliği-ihlali": {
    mesaj: (p) => (a(p, "kusur") === "ad"
      ? `Under Katman "${a(p, "katman")}" the name "${a(p, "deger")}" is used a second time; the first holder is "${a(p, "onceki")}". Two levels sharing a name appear as two identical rows in the roadmap, and the path to an Adım can no longer be described by names.`
      : `Under Katman "${a(p, "katman")}" the department "${a(p, "deger")}" is opened a second time; the first level is "${a(p, "onceki")}". An AltKatman is a responsibility level, not a topic heading, and splitting one department in two makes the owner of acceptance unreadable (MIM-1.7).`),
    oneri: (p) => (a(p, "kusur") === "ad"
      ? `Give this level its own name describing its work, or merge the two if they truly carry the same work. Example: move it under \`AltKatman( kod: ${a(p, "onceki")}, ... )\`.`
      : `Move this level's Adım nodes under the existing level and remove it. Example: \`AltKatman( kod: ${a(p, "onceki")}, departman: ${a(p, "deger")} ) { ... the Adım nodes ... }\`. Topic separation belongs to the Adım level; a second department level adds nothing.`),
  },
  // ── Season ritual (ORK-8) ─────────────────────────────────────────────────
  "mevsim-vadesi-geçti": {
    mesaj: (p) => `Faz "${a(p, "kimlik")}" passed its target date on ${a(p, "vade")}, yet ${a(p, "açık")} Adım nodes remain open under the ${a(p, "gövde")} bodies it wraps. The season's own claim and the graph disagree: a period that looks closed cannot carry open work.`,
    oneri: (p) => `Hand the open work to the current season, or move the season's target date to match reality; work that will not close must be dropped with a stated reason, never left silent (ORK-8 closing steps). Example: write \`Blok( kod: BLK-…, mevsim: FAZ-<current> )\` and remove the \`çağır BLK-…\` line from the body of "${a(p, "kimlik")}"; a link is written in one place only.`,
  },
  "mevsim-mührü-çelişkili": {
    mesaj: (p) => `Faz "${a(p, "kimlik")}" states in its own text that it ${a(p, "iddia") === "mühür" ? "has been sealed" : "has handed its open work over"}, yet ${a(p, "açık")} Adım nodes remain open under the ${a(p, "gövde")} bodies it wraps. The measure of a seal is the graph's count, not the text's claim: a season that says it is closed cannot carry open work (ORK-8 closing steps).`,
    oneri: (p) => `Hand the open work to the current season and write the link in one place, or remove the seal sentence if the season has not really closed; work that will not close must be dropped with a stated reason, never left silent. Example: write \`Blok( kod: BLK-…, mevsim: FAZ-<current> )\` and remove the \`çağır BLK-…\` line from the body of "${a(p, "kimlik")}".`,
  },
  // ── File seals (MIM-3.4 · KPS-MHR-A01) ───────────────────────────────────
  "dosya-mührü": {
    mesaj: (p) => a(p, "tür") === "eğitim"
      ? `The file "${a(p, "yol")}" carries the teaching seal (@${a(p, "etiket")}@_): the engine reads and validates it against its contracts, but does not count it in the product scorecard or the open-work agenda, because teaching material is not product work.`
      : `The file "${a(p, "yol")}" carries the archive seal (@${a(p, "etiket")}@_) and is outside the graph: the engine does not read it, and the graph, the code index, the scorecard and the open-work agenda do not count it. Every check lists the seal type and the file name on this line.`,
    oneri: (p) => `A seal is an explicit declaration by the file's owner and cannot be used to silence a finding; if the file becomes a live source again, remove the seal from its name. Example: \`git mv "${a(p, "yol")}" "${a(p, "canlı")}"\`.`,
  },
  "sonraya-bırakılmış-dosya": {
    mesaj: (p) => {
      const kaynak = a(p, "kaynak");
      const olcum = kaynak === "git"
        ? `The wait is measured from ${a(p, "tarih")}, the day the seal was committed to the repository.`
        : kaynak === "dosya"
          ? `Because the seal has not been committed yet, the wait is measured from ${a(p, "tarih")}, the day the file was renamed, that is, from the file's status-change date.`
          : "The waiting time could not be measured, because neither a repository record nor a file date could be read.";
      return `The file "${a(p, "yol")}" has been deferred (@${a(p, "etiket")}@_) and has been waiting for ${a(p, "gün")} days; the engine does not read its content and keeps the file visible only through this reminder. ${olcum}`;
    },
    oneri: (p) => `If it is time to resume the work, remove the seal and return the file to the live source; if the work was dropped, change the deferral seal into the archive seal. Example: \`git mv "${a(p, "yol")}" "${a(p, "canlı")}"\`.`,
  },
  "geçersiz-dosya-adı": {
    mesaj: (p) => {
      switch (a(p, "kusur")) {
        case "bilinmeyen-etiket":
          return `The name "${a(p, "yol")}" starts in the "@${a(p, "etiket")}@_" form, but this tag is not in the closed seal set (${a(p, "küme")}); the file counts as unsealed and is read as a live source.`;
        case "bozuk-biçim":
          return `The name "${a(p, "yol")}" starts with @ but does not follow the seal form; a seal is written as \`@ETİKET@_\` with an upper-case tag (${a(p, "küme")}). The file counts as unsealed and is read as a live source.`;
        case "mühür-sonrası-büyük-harf":
          return `"${a(p, "yol")}" carries a valid seal, but the name after the seal contains upper-case letters; after the seal the name continues in lower case.`;
        default:
          return `The file name "${a(p, "yol")}" contains upper-case letters but is not a valid file seal; upper case in a file name is reserved for seals.`;
      }
    },
    oneri: (p) => `Write the name in lower case or use a seal from the closed set (${a(p, "küme")}). Example: \`git mv "${a(p, "yol")}" "${a(p, "öneri")}"\`.`,
  },
  // ── Node code standard (DIL-1.8 · RFM-MOTOR-A02) ─────────────────────────
  "ilansız-önek": {
    mesaj: (p) => `Code "${a(p, "kimlik")}" (${a(p, "tip")}) was born with the prefix "${a(p, "önek")}", which is not declared in the project's prefix registry. Every prefix is declared in a single place, the \`önekler\` list of the Proje node in the root declaration, and no new code is born with an undeclared prefix (DIL-1.8).`,
    oneri: (p) => `If the prefix names a new subject of work, add it to the registry in the root declaration; if the subject already has a declared prefix, write the code with that prefix. Example: \`Proje( kod: PRJ-ORNEK, önekler: [ PRJ, ${a(p, "önek")} ] )\`.`,
  },
  "kod-biçimi-uyumsuz": {
    mesaj: (p) => {
      const kod = a(p, "kimlik");
      switch (a(p, "kusur")) {
        case "tek-parça":
          return `Code "${kod}" (${a(p, "tip")}) consists of a single part; a node code carries at least two parts separated by hyphens, and its first part is the prefix (DIL-1.8).`;
        case "önek":
          return `The prefix of code "${kod}" (${a(p, "tip")}) is not two to four letters long or contains a non-letter character; a prefix is a short run of letters that names the subject of the work (DIL-1.8).`;
        case "adım-sırası":
          return `The last part of the Adım code "${kod}" is not a single series letter followed by a two-digit sequence number; the sequence starts at one within its container (DIL-1.8).`;
        default:
          return `Code "${kod}" (${a(p, "tip")}) is not built only from upper-case ASCII letters, digits and single hyphens, or does not start with a letter; lower case, underscores, dots, spaces and Turkish diacritics cannot live in a code, because the code's meaning is carried by the \`ne\` and \`ad\` fields (DIL-1.8).`;
      }
    },
    oneri: (p) => `Write a new code according to the standard; if the code was born before the standard, do not rename it, add it by name to the \`biçimMuafları\` list in the root declaration. Example: \`Adım( kod: RFM-KANON-A01 )\` or \`biçimMuafları: [ ${a(p, "kimlik")} ]\`.`,
  },
  // ── Project-less Phase (MIM-1.2 · KPS-FAZ-A02) ───────────────────────────
  "kitaplıksız-kök": {
    mesaj: (p) => `Root '${a(p, "kök")}' declares no Kitaplık and places a Raf directly beneath itself — every branching folder is a Kitaplık and Raf nodes live INSIDE one (MIM-3.2).`,
    oneri: () => 'Move the shelves inside a library; the tier keeps the root from decaying into an unreadable list of shelves as the tree grows. Example: `Kitaplık( kod: KTP-IS, yol: "is/" ) { Raf( kod: RAF-PLAN, yol: "plan/" ) }`',
  },
  "projesiz-faz": {
    mesaj: (p) => `Faz "${a(p, "kimlik")}" cannot be resolved to any Proje root: ${a(p, "sebep") === "ayrışık" ? "more than one Proje code covers its file at the same depth, so the link was not made because it is not unique" : "its file does not live under any Proje root and the Faz is not written inside a Proje body either"}. Whose time slice it is cannot be read from the graph (MIM-1.2).`,
    oneri: (p) => `Move the plan file under the Proje root it belongs to, or write the Faz inside the Proje body; in an ambiguous root remove one of the two entry declarations. Example: \`<project-root>/is/plan/faz/faz.sar\` containing \`Faz( kod: ${a(p, "kimlik")}, … )\` with a single \`<project>_anadizin.sar\` entry at the root.`,
  },
  // ── Phase order and Blok structure (MIM-1.2 · MIM-1.3 · MIM-1.6 · KPS-SIR-A01) ──
  "ters-faz-bağımlılığı": {
    mesaj: (p) => `The \`${a(p, "kenar")}\` edge ("${a(p, "hedef")}") on node "${a(p, "kimlik")}" contradicts the Faz order: the predecessor "${a(p, "oncul")}" sits in the later Faz "${a(p, "onculFazi")}", while the successor sits in the earlier Faz "${a(p, "ardilFazi")}". Work cannot wait for work in a later time slice; the edge was left out of the order calculation (MIM-1.2).${b(p, "tarihsel") ? " Both ends are complete, so the conflict is historical: the Blok body appears to have been handed over to a later Faz together with its finished Adım nodes." : ""}`,
    oneri: (p) => `Move the successor into the predecessor's Faz or a later one, or move the predecessor into an earlier Faz; if the dependency is not real, remove the edge. Example: move the successor's Blok into the \`Faz( kod: ${a(p, "onculFazi")} ) { … }\` body and keep the \`bağımlı: [ ${a(p, "oncul")} ]\` edge.`,
  },
  "erken-faz-işi": {
    mesaj: (p) => `Faz "${a(p, "kimlik")}" has started or finished work (${isListesi(p, "en")}), while the earlier Faz "${a(p, "onceki")}" still carries ${a(p, "acik")} open ${ekEn(s(p, "acik"), "Adım", "Adım nodes")}. The Faz order is strict: work does not start in a later Faz before the earlier Faz is closed (MIM-1.2).`,
    oneri: (p) => `First close the open work of the earlier Faz or roll back the started Adım; if the work is already finished, the plan's order is what is wrong; if the work really belongs earlier, move its Blok into the earlier Faz. Example: set the Adım in the later Faz to \`durum: beklemede\` or move its Blok into the \`Faz( kod: ${a(p, "onceki")} ) { … }\` body.`,
  },
  "yabancı-faz-bağı": {
    mesaj: (p) => `Blok "${a(p, "kimlik")}" binds its time to another Proje's Faz (\`mevsim: ${a(p, "mevsim")}\` · "${a(p, "proje")}")${a(p, "kendi") ? `, while its own Proje is "${a(p, "kendi")}"` : ""}. A Blok lives in its own Proje's time slice; ${a(p, "acik") === "0" ? "its work is complete, so the binding remains visible as a historical record" : `it carries ${a(p, "acik")} open Adım(s) and the sibling project's Faz order cannot govern that work`} (MIM-1.2).`,
    oneri: (p) => `Bind the Blok to a Faz in its own Proje; if the work truly belongs to the sibling project, move the Blok into that project's plan. Example: \`Blok( kod: ${a(p, "kimlik")}, mevsim: FAZ-KENDI )\` or a \`çağır ${a(p, "kimlik")}\` line in its own Faz.`,
  },
  "katmansız-blok": {
    mesaj: (p) => `Blok "${a(p, "kimlik")}" carries no Katman. A Blok produces a work outcome by joining Katman nodes bound to different technologies in one vertical body; a Blok without Katman nodes is an empty container, not a body (MIM-1.3).`,
    oneri: (p) => `Add the work's technology slices to the Blok as Katman nodes, or open the plan once its Katman nodes are written. Example: \`Blok( kod: ${a(p, "kimlik")} ) { Katman( kod: KAT-ORNEK, kullanır: TEK-ORNEK ) { AltKatman( kod: ALT-ORNEK, departman: kodlama ) { Adım( kod: ADM-ORNEK, durum: beklemede ) } } }\``,
  },
  "adımsız-kapsayıcı": {
    mesaj: (p) => `${a(p, "tip")} "${a(p, "kimlik")}" carries no Adım. The Adım is the smallest execution unit; a container without Adım nodes cannot show progress on the roadmap and cannot be measured as work (MIM-1.6).`,
    oneri: (p) => `Write at least one Adım that describes the container's work, or remove the container from the plan while it carries no work. Example: \`${a(p, "tip")}( kod: ${a(p, "kimlik")} ) { … Adım( kod: ADM-ORNEK, durum: beklemede, ne: "the work itself" ) }\``,
  },
  "tek-adımlı-blok": {
    mesaj: (p) => `Blok "${a(p, "kimlik")}" carries only one Adım ("${a(p, "adim")}"). A Blok is a work body that joins several Katman nodes; single-Adım work usually lives as an Adım inside an existing Blok (MIM-1.3).`,
    oneri: (p) => `Move the Adım into a fitting Katman of a related Blok, or write the Adım nodes of the other Katman nodes the Blok joins. Example: \`Blok( kod: BLK-ILGILI ) { Katman( kod: KAT-ILGILI ) { AltKatman( kod: ALT-ILGILI ) { Adım( kod: ${a(p, "adim")}, durum: beklemede ) } } }\``,
  },
  // ── Indentation and structure (DIL-2.2 · KPS-SIR-A02) ──
  "girinti-yapı-uyumsuz": {
    mesaj: (p) => `The indentation of ${a(p, "sayi")} structural lines in this file does not match the depth of the structure; this is the first: the structure expects ${a(p, "beklenen")} spaces, the line is written with ${a(p, "bulunan")}. The engine reads structure from parsing, not from indentation; broken indentation only leads the reader to a wrong hierarchy.`,
    oneri: (p) => `Format the file (⇧⌥F in the extension or the MCP bicimle tool): the formatter rewrites structural indentation with two spaces per level and does not touch text or alignment. Example: the line starts with ${a(p, "beklenen")} spaces, and \`Katman( kod: KAT-… ) {\` inside a \`Blok( kod: BLK-… ) {\` body is written one level deeper.`,
  },
  // ── Phase file layout (MIM-1.2 · KPS-SIR-A03 · Founder ruling 2026-09-29) ──
  "çok-fazlı-dosya": {
    mesaj: (p) => `This file carries ${a(p, "sayi")} Faz nodes; Faz "${a(p, "kimlik")}" is declared in the same file as Faz "${a(p, "ilk")}". Every Faz lives in its own prefix-numbered file in the plan shelf's phase folder, and the next Faz is born in a new file (MIM-1.2).`,
    oneri: (p) => `Move Faz "${a(p, "kimlik")}" together with the Blok nodes in its body into its own file; the file name carries the Faz order as a prefix. Example: \`is/plan/faz/2_surum.sar\` starting with \`Faz( kod: ${a(p, "kimlik")} ) { Blok( … ) { … } }\`.`,
  },
  "faz-dışı-blok": {
    mesaj: (p) => `Blok "${a(p, "kimlik")}" stands outside a Faz body and is bound to Faz "${a(p, "faz")}" ${a(p, "bag") === "çağır" ? "through the Faz's `çağır` list" : "through its own `mevsim:` field"}. A Blok is bound to a Faz only by being wrapped in the Faz body; only then can a reader opening the file see which time slice the Blok lives in (MIM-1.2).`,
    oneri: (p) => `Move the Blok with its body into the file of Faz "${a(p, "faz")}" and write it inside the Faz body; remove the ${a(p, "bag") === "çağır" ? "`çağır` line" : "`mevsim:` field"}. Example: \`Faz( kod: ${a(p, "faz")} ) { Blok( kod: ${a(p, "kimlik")} ) { … } }\`.`,
  },
  "faz-ilanı-tepede-değil": {
    mesaj: (p) => `The declaration of Faz "${a(p, "kimlik")}" is not at the top of its file: ${b(p, "gomulu") ? `the Faz is written inside the body of another node (${a(p, "onceki")})` : `${a(p, "onceki")} is declared before it`}. A Faz file begins with the Faz declaration, and the Blok nodes grow in its body (MIM-1.2).`,
    oneri: (p) => `Make the Faz declaration the first statement of the file and move the other declarations either into the Faz body or into files on their own shelves. Example: the file begins with \`Faz( kod: ${a(p, "kimlik")} ) { Blok( … ) { … } }\`.`,
  },
  "yersiz-faz-dosyası": {
    mesaj: (p) => `Faz "${a(p, "kimlik")}" lives in file "${a(p, "dosyaAdi")}"; ${b(p, "klasor") ? "the file is in the phase folder but its name carries no order prefix" : "the file is not in the plan shelf's phase folder"}. Every Faz lives in its own prefix-numbered file (\`0_\`, \`1_\`, …) in the \`faz/\` folder, so the Faz order can be read from the file name (MIM-1.2).`,
    oneri: (p) => `${b(p, "klasor") ? "Write the Faz order as a prefix in the file name" : "Move the file into the plan shelf's phase folder and write the Faz order as a prefix in its name"}. Example: \`is/plan/faz/1_${a(p, "dosyaAdi").replace(/^\d+_/, "")}\` starting with \`Faz( kod: ${a(p, "kimlik")} ) { … }\`.`,
  },
  // ── Language, architecture, teaching and orchestration (1–35) ───────────
  "kanonik-kaynak-biçimi": {
    mesaj: (p) => `"${a(p, "dosya")}" carries canonical ruling text as though it were the source of truth, but the source of truth lives only in .sar form. A derived text surface cannot have authority equal to its source.`,
    oneri: () => `Move the ruling to the canonical source and mark the text file as a generated surface. Example: write the ruling in \`yasa/kanon/<section>.sar\` as \`Karar( kod: <CODE>, durum: kilitli, karar: "…" )\`, then put \`<!-- üretilmiştir: <source>.sar -->\` at the start of the text file.`,
  },
  "orthografi-kaybı": {
    mesaj: (p) => `The name "${a(p, "ad")}" omits part of its Turkish orthography; its canonical spelling should be "${a(p, "kanonik")}". A name without its circumflex silently diverges from the canonical identity.`,
    oneri: (p) => `Write the name with its full orthography. Example: replace \`${a(p, "ad")}:\` with \`${a(p, "kanonik")}:\`; search and configuration input already accept the spelling without the circumflex, while the source retains the canonical spelling.`,
  },
  "belge-şekil-drift": {
    mesaj: (p) => `The line layout of the document block in ${p.dosya == null ? "this file" : `"${a(p, "dosya")}"`} changes in the formatted surface derived from the same source (the first difference is on line ${a(p, "fark")}). The block's text, line order and shape characters must be preserved without loss.`,
    oneri: () => `Write the document block between the canonical opening and mirrored closing markers without changing line order or indentation. Example: use the \`-->|\\n# Title\\n| column | value |\\n|<--\` skeleton; do not remove leading spaces from table rows or add structural indentation inside the block.`,
  },
  "çok-satırlı-değer-drift": {
    mesaj: (p) => `${p.alan == null ? "A multiline value" : `The multiline value of "${a(p, "alan")}"`} loses content during formatting (the first difference is on line ${a(p, "fark")}). Formatting may adjust structural indentation, but it cannot change the user's meaningful alignment.`,
    oneri: (p) => `Write the multiline value in triple-quoted form and leave its content lines unchanged. Example: write the text after the \`${varsayilanli(p, "alan", "<field>")}: """\` line, preserve its alignment and close it with \`"""\`.`,
  },
  "kenar-tip-uyuşmazlığı": {
    mesaj: (p) => `The \`${a(p, "kenar")}\` edge on node "${a(p, "kaynak")}" points to "${a(p, "hedef")}", but this edge should target a node of type "${a(p, "beklenen")}". The edge's source and target types do not match the canonical contract.`,
    oneri: (p) => `Build the edge according to its declared source-target pair. Example: write \`${a(p, "kenar")}: <${a(p, "beklenen")} kodu>\`; if the target has another role, use the edge name assigned to that role.`,
  },
  "numara-grafı-uyumsuz": {
    mesaj: (p) => `Item code "${a(p, "kod")}" does not join the single numbering graph: ${yc(p, "en")}. The canon uses one numbering graph made solely from the hierarchical item codes of its eight sections.`,
    oneri: () => `Write the code with its own section prefix and a resolvable parent basis. Example: \`Kural <ad>( kod: STR-1.1, dayanak: STR-1 )\` — the basis chain must reach its section's zeroth item without forming a cycle.`,
  },
  "madde-kodu-uyumsuz": {
    mesaj: (p) => `Item code "${a(p, "kod")}" violates the hierarchical code contract: ${yc(p, "en")}. Each section starts with a zeroth item written with its own prefix, main items advance consecutively without gaps, and specializations append a dotted subnumber to an existing main-item code.`,
    oneri: (p) => `Write a consecutive code with a parent. Example: use \`Kural <name>( kod: ${a(p, "onerilen")}, ne: "<item title>", dayanak: <main item code> )\`; declare the main item before adding a subnumber.`,
  },
  "ilgili-önek-geçersiz": {
    mesaj: (p) => `The \`ilgili\` list contains member "${a(p, "uye")}": ${yc(p, "en")}. Memberships are written explicitly, uniquely and canonically.`,
    oneri: () => `Build the list only from the root item identifiers of the eight sections and remove duplicates; a bare section prefix is not an identifier. Example: select the required entries from \`ilgili: [ MIM-0, DIL-0, TIP-0, YAS-0, YUZ-0, STR-0, OGR-0, ORK-0 ]\`.`,
  },
  "proje-köksüz-üretim": {
    mesaj: (p) => `"${a(p, "ad")}" (${a(p, "kimlik")}) is a productive node, but it does not live under any Proje root. Identity, ownership and diagnostic grouping derive from the Proje node; rootless production cannot derive any of the three.`,
    oneri: () => `Place the productive tree under a Proje root. Example: create the \`ÇalışmaAlanı( kod: CAL-ANA ) { Proje( kod: PRJ-ANA, rejim: katı ) { Faz( kod: FAZ-ILK ) { … } } }\` structure.`,
  },
  "çok-teknolojili-katman": {
    mesaj: (p) => `Katman "${a(p, "kimlik")}" binds to multiple Teknoloji nodes (${a(p, "hedefler")}). A Katman is the architectural boundary of exactly one technology branch.`,
    oneri: (p) => `Create a separate Katman for each technology. Example: split it into \`Katman( kod: ${a(p, "kimlik")}-ONYUZ, ad: "Front End", kullanır: <first technology> )\` and \`Katman( kod: ${a(p, "kimlik")}-ARKAYUZ, ad: "Back End", kullanır: <second technology> )\`.`,
  },
  "adım-atomikliği": {
    mesaj: (p) => `Adım "${a(p, "kimlik")}" does not satisfy the atomicity contract: ${yc(p, "en")}. Each Adım is the smallest execution unit that runs in one session, concludes at one acceptance gate and delivers at least one Meyve.`,
    oneri: () => `Split the work or declare the missing delivery. Example: write \`Adım( kod: <CODE>, durum: beklemede ) { ne: "<one-sentence job>" kabul: [ "<single acceptance criterion>" ] üretir: [ Meyve( kod: MYV-<CODE>, tür: Kod, dosya: "src/<file>" ) ] }\`.`,
  },
  "üretimsiz-meyve": {
    mesaj: (p) => `Meyve "${a(p, "kimlik")}" is not connected to any Adım through an \`üretir\` edge, so its production site cannot be traced. Every Meyve connects to exactly one producing Adım.`,
    oneri: (p) => `Attach the Meyve to the body of the Adım that produces it. Example: write \`Adım( kod: <ADIM> ) { üretir: [ Meyve( kod: ${a(p, "kimlik")}, tür: Kod, dosya: "src/<dosya>" ) ] }\`.`,
  },
  "meyve-dosyası-eksik": {
    // The `tip` slot carries the node's widget name (default Meyve): the same
    // MIM-2.1 validation also measures the dosya declaration of a Kod node
    // (V1B-KODMEYVE-A01), and the sentence names the node by its own type.
    mesaj: (p) => a(p, "tip", "Meyve") === "Kod"
      ? `Kod "${a(p, "kimlik")}" is a concrete source-file delivery, but ${yc(p, "en")}. The declared dosya path must be a concrete, singular path that resolves inside the project root.`
      : `Meyve "${a(p, "kimlik")}" (tür: ${a(p, "tur")}) is a delivery that requires a file, but ${yc(p, "en")}. These types must declare a concrete path that resolves inside the project root.`,
    oneri: (p) => a(p, "tip", "Meyve") === "Kod"
      ? `Write a path that resolves inside the project root. Example: \`Kod( kod: ${a(p, "kimlik")}, dosya: "src/<folder>/<file>" )\` — the path must not leave the project and must resolve on disk.`
      : `Write a path that resolves inside the project root. Example: \`Meyve( kod: ${a(p, "kimlik")}, tür: ${a(p, "tur")}, dosya: "src/<folder>/<file>" )\` — the path must not leave the project and must resolve on disk.`,
  },
  "öğretim-kaynak-drifti": {
    mesaj: (p) => `The teaching text in "${a(p, "dosya")}" is not derived from the canonical source: ${yc(p, "en")}. Normative teaching content cannot be written by hand; it is generated from a canonical node or registry.`,
    oneri: () => `Connect the text to the generation chain. Example: put \`<!-- üretilmiştir: <kaynak>.sar · üretici: <komut> -->\` at the start of the file and move the normative sentence to the source node.`,
  },
  "öğretim-yüzü-uyumsuz": {
    mesaj: (p) => `The teaching surfaces for diagnostic "${a(p, "kod")}" contradict one another: ${yc(p, "en")}. The explanation before a violation and the message and recommendation at the time of violation must teach the same concept, rationale and correction direction.`,
    oneri: (p) => `Feed the diagnostic message and recommendation from one text source, and show the correction with a paste-ready skeleton. Example: write the catalogue entry as \`"${a(p, "kod")}": { mesaj: (p) => "<what was found and why it is a problem>", oneri: () => "<how to fix it> Example: <paste-ready skeleton>" }\`.`,
  },
  "beceri-kartı-eksik": {
    mesaj: (p) => `Beceri "${a(p, "kimlik")}" does not complete its teaching contract: ${yc(p, "en")}. Every Beceri card carries its target, trigger, application steps and acceptance evidence together.`,
    oneri: (p) => `Add the missing binding. Example: write \`Beceri( kod: ${a(p, "kimlik")}, uygular: <target code>, neZaman: "<when it triggers>", örnek: "<how it is applied>", kabul: "<which evidence verifies it>" )\`.`,
  },
  "başvuru-sicil-drifti": {
    mesaj: (p) => `The reference surface "${a(p, "dosya")}" diverges from the canonical registry: ${yc(p, "en")}. Reference rows are generated completely and deterministically from their respective registries.`,
    oneri: () => `Hand the manually maintained twin table over to generation. Example: place the table between \`<!-- SARMAL:REFERENCE -->\` and \`<!-- /SARMAL:REFERENCE -->\`, then let the generator write its contents.`,
  },
  "öğretim-etki-eksik": {
    mesaj: (p) => `Canonical change "${a(p, "kimlik")}" has not processed its teaching impact: ${yc(p, "en")}. Every change binds to the agent context, teaching surfaces and targeted Beceri cards in the same change set.`,
    oneri: (p) => `Create the impact binding in the same change. Example: write \`Adım( kod: ${a(p, "kimlik")} ) { etkiler: [ <teaching surface code>, <Beceri code> ] }\`; if a surface is unaffected, declare why with \`etkisiz: "<reason>"\`.`,
  },
  "önceliksiz-adım": {
    mesaj: (p) => `${a(p, "sayı")} open Adım nodes under ${a(p, "kapsayıcı")} carry no priority declaration: ${a(p, "örnek")}. Without it, an open Adım's place in the ordering cannot be read.`,
    oneri: () => `Declare a tier on every open Adım. Example: \`Adım( kod: ADM-X, durum: beklemede, öncelik: p2 )\` — choosing the tier is a human judgement and the engine never suggests one; it only observes the missing declaration.`,
  },
  "ateşlemiş-hatırlatıcı": {
    mesaj: (p) => `The Adım "${a(p, "hedef")}" awaited by reminder "${a(p, "kimlik")}" is complete, yet the reminder is still ${a(p, "durum")}: it has fired and is waiting to be closed.`,
    oneri: (p) => `Close the reminder or rebind it. Example: if the work is genuinely finished write \`Hatırlatıcı( kod: ${a(p, "kimlik")}, durum: tamamlandı )\`; if it continues, move the \`hatırlat:\` edge to the Adım that carries it on.`,
  },
  "öğretim-bayat": {
    mesaj: (p) => `The teaching output "${a(p, "dosya")}" cannot be considered current: ${yc(p, "en")}. The output must track the identity and input seal of the source from which it was generated.`,
    oneri: () => `Regenerate the output and refresh its seal. Example: write \`<!-- üretilmiştir: <kaynak>.sar · mühür: <özet> -->\` at the start of the file and rerun the generator whenever the source changes.`,
  },
  "üretilmiş-öğretim-değiştirilmiş": {
    mesaj: (p) => `Generated teaching text "${a(p, "dosya")}" was changed by hand outside its permitted generation region: ${yc(p, "en")}. Persistent content changes are made in the canonical source.`,
    oneri: () => `Move the change to the source and regenerate the output. Example: add the handwritten sentence to the source node as \`ne: "<sentence>"\`, enclose the generated region between \`<!-- SARMAL:REGION -->\` and \`<!-- /SARMAL:REGION -->\`, then rerun the generator.`,
  },
  "kanıtsız-beceri-terfisi": {
    mesaj: (p) => `Learning record "${a(p, "kimlik")}" was promoted without evidence: ${yc(p, "en")}. A lesson is promoted to Beceri only after it provides repeatable evidence on the target behavior.`,
    oneri: (p) => `Bind the promotion to evidence. Example: write \`Bellek( kod: ${a(p, "kimlik")}, terfi: tamamlandı, doğrulama: <sınama kodu> )\` and connect the promoted Beceri with \`uygular: <hedef kodu>\`.`,
  },
  "ilişki-sınıfı-ihlali": {
    mesaj: (p) => `The \`${a(p, "kenar")}\` edge on node "${a(p, "kimlik")}" is used in the wrong relationship class: ${yc(p, "en")}. Architectural visibility, Adım order and production provenance cannot take over one another's meaning.`,
    oneri: () => `Move the edge to its declared class. Example: put a node in its parent's body for containment, write \`bağımlı: [ <Adım kodu> ]\` for execution order, and write \`üretir: [ Meyve( … ) ]\` for production provenance.`,
  },
  "mimari-bağı-ihlali": {
    mesaj: (p) => `The architectural containment binding of node "${a(p, "kimlik")}" violates the level contract: ${yc(p, "en")}. Architectural visibility is formed only between consecutive trunk, branch, module and work levels.`,
    oneri: () => `Wrap without skipping a level. Example: establish the \`Blok( … ) { Katman( … ) { AltKatman( … ) { Adım( … ) } } }\` order; do not write containment bindings between peer levels.`,
  },
  "yürütme-kenarı-sözleşmesi": {
    mesaj: (p) => `The \`${a(p, "kenar")}\` edge on node "${a(p, "kimlik")}" violates the execution contract: ${yc(p, "en")}. Execution edges form a directed, acyclic graph only between Adım sources and Adım targets.`,
    oneri: () => `Connect the edge from one Adım to another and do not repeat the reverse spelling. Example: \`Adım( kod: ADM-ARDIL, bağımlı: [ ADM-ONCUL ] )\` is sufficient; do not also write the same pair with \`besler\`.`,
  },
  "üretim-kökeni-ihlali": {
    mesaj: (p) => `The \`üretir\` edge on node "${a(p, "kimlik")}" violates the production-provenance contract: ${yc(p, "en")}. This edge points only from an Adım to a Meyve and does not establish execution order.`,
    oneri: (p) => `Connect the edge from Adım to Meyve. Example: write \`Adım( kod: ${a(p, "kimlik")} ) { üretir: [ Meyve( kod: MYV-KAYNAK, tür: Kod, dosya: "src/<dosya>" ) ] }\`; if order is needed, add a separate \`bağımlı:\` edge.`,
  },
  "kullanır-kenarı-ihlali": {
    mesaj: (p) => `The \`${p.kenar ? a(p, "kenar") : "kullanır"}\` edge on node "${a(p, "kimlik")}" falls outside the permitted pair: ${yc(p, "en")}. The ground is written with two type-pure edges: \`kullanır\` connects a Proje to the shared identity root or a Katman to one concrete Teknoloji, while \`takım\` connects a Katman to the one or more Takım nodes that run it; neither edge may stand in for the other.`,
    oneri: () => `Reduce the edge to a permitted pair. Example: write \`Katman( kod: KAT-ONYUZ, takım: TAKIM-ONYUZ, kullanır: TEK-FLUTTER )\` or \`Proje( kod: PRJ-ANA, kullanır: KMK-ORTAK )\`; use the appropriate edge name for any other binding.`,
  },
  "deterministik-sıra-ihlali": {
    mesaj: (p) => `Node "${a(p, "kimlik")}" derives execution order from outside the Adım graph: ${yc(p, "en")}. Order is derived only from execution edges between Adım nodes, using a stable topological sort.`,
    oneri: () => `Express the order with Adım edges. Example: remove the container's \`bağımlı:\` field and move the order onto the Adım itself as \`Adım( kod: ADM-ARDIL, bağımlı: [ ADM-ONCUL ] )\`.`,
  },
  "seçilemez-adım-yürütümü": {
    mesaj: (p) => `Adım "${a(p, "kimlik")}" appears to have run while it was not selectable: ${yc(p, "en")}. Only open work whose every predecessor is complete can be selected.`,
    oneri: () => `Close the predecessor before starting this Adım. Example: set the predecessor Adım to \`durum: tamamlandı\` or return this Adım to \`durum: beklemede\`.`,
  },
  "döngü-sonlanması-eksik": {
    mesaj: (p) => `Döngü "${a(p, "kimlik")}" lacks a termination guarantee: ${yc(p, "en")}. Every Döngü declares at least one resolvable execution target and at least one termination condition.`,
    oneri: (p) => `Write the target and termination together. Example: complete it as \`Döngü( kod: ${a(p, "kimlik")}, tetik: koşul, koşar: <target code>, durunca: "karne.hata == 0", turLimiti: 5 )\`.`,
  },
  "kapı-kabul-kanıtı-eksik": {
    mesaj: (p) => `Kapı "${a(p, "kimlik")}" appears to have passed without acceptance evidence: ${yc(p, "en")}. A gate passes only with resolvable, verified evidence that satisfies every declared acceptance criterion.`,
    oneri: (p) => `Write the acceptance criterion and its evidence together. Example: write \`Kapı( kod: ${a(p, "kimlik")}, kabul: [ "<the audit reports 0 hata and 0 uyarı>" ], kanıt: <test code> )\`.`,
  },
  "çapraz-proje-ad-alanı": {
    mesaj: (p) => `The \`${a(p, "kenar")}\` edge on node "${a(p, "kimlik")}" points without qualification to target "${a(p, "hedef")}" in another Proje. An unqualified identity resolves only within its own Proje; an accidental global match is not a valid binding.`,
    oneri: (p) => `Write the target with an explicit Proje namespace. Example: qualify it as \`${a(p, "kenar")}: ${a(p, "onerilen", "PRJ-DIGER::" + a(p, "hedef"))}\`.`,
  },
  "auth-omurgası-ihlali": {
    mesaj: (p) => `Identity node "${a(p, "kimlik")}" violates the identity-backbone contract: ${yc(p, "en")}. Identity providers live only under one identity root, and shared identity use does not merge Proje identities.`,
    oneri: () => `Place the provider under the root. Example: create \`KimlikKökü( kod: KMK-ORTAK ) { KimlikSağlayıcısı( kod: KMS-GOOGLE, tür: google ) }\` and connect the Proje with \`kullanır: KMK-ORTAK\`.`,
  },
  "founder-ortak-auth-eksik": {
    mesaj: (p) => `Founder Proje "${a(p, "kimlik")}" does not point to the workspace's shared identity root: ${yc(p, "en")}. This binding cannot be optional or replaced with a local root.`,
    oneri: (p) => `Bind the shared root as required. Example: write \`Proje( kod: ${a(p, "kimlik")}, rejim: katı, kullanır: KMK-ORTAK )\`; the workspace must contain exactly one shared root.`,
  },
  "şef-akışı-ihlali": {
    mesaj: (p) => `The orchestration flow for "${a(p, "kimlik")}" is broken: ${yc(p, "en")}. Execution builds context only from selectable work and changes status only in response to verified acceptance evidence.`,
    oneri: () => `Bind the status change to evidence. Example: write the run record as \`koşu: Koşum( karar: VERIFIED, kanıt: <sınama kodu> )\` and only then set \`durum: tamamlandı\`.`,
  },
  "üretici-denetçi-çakışması": {
    mesaj: (p) => `The producer and auditor roles for delivery "${a(p, "kimlik")}" are not separated: ${yc(p, "en")}. The session that produces a delivery cannot issue the acceptance ruling on its own work.`,
    oneri: () => `Assign the audit to a separate session. Example: write \`Adım( kod: <CODE>, üretici: <producer agent code>, denetçi: <another agent code> )\`; the two fields cannot carry the same identity.`,
  },
  // ── Strategy, type system, governance and surfaces (36–70) ───────────────
  "oturum-adım-sınırı": {
    mesaj: (p) => `Session "${a(p, "kimlik")}" is executing multiple jobs together: ${yc(p, "en")}. A session executes exactly one job and does not move to another until that job's acceptance, delivery, evidence and status closure are complete.`,
    oneri: () => `Split the work into separate, ordered sessions. Example: write \`Koşum( kod: <KOD>, adım: <tek Adım kodu> )\`; open a separate run record for the second job.`,
  },
  "unutma-kapısı-ihlali": {
    mesaj: (p) => `Canonical source "${a(p, "dosya")}" refers to a historical identity: "${a(p, "atif")}". Historical identities cannot be reintroduced into a canonical file, even as explanation or traceability.`,
    oneri: () => `Remove the reference and establish its basis in the new item graph. Example: replace \`dayanak: <eski kimlik>\` with a current item code such as \`dayanak: STR-1\`; do not preserve the identity in a comment either.`,
  },
  "kanon-kodu-uyumsuz": {
    mesaj: (p) => `The basis edge of item "${a(p, "kod")}" does not join the single code graph: ${yc(p, "en")}. Every basis other than the zeroth item must resolve and join an acyclic chain that reaches its own section root.`,
    oneri: (p) => `Connect the basis to a resolvable parent item. Example: write \`Kural <name>( kod: ${a(p, "kod")}, dayanak: ${a(p, "onerilen", "<parent item code>")} )\`.`,
  },
  "göç-sırası-ihlali": {
    mesaj: (p) => `Migration stage "${a(p, "kimlik")}" started before its required predecessor closed with a clean gate: ${yc(p, "en")}. Migration stages follow their full order; they cannot be skipped or reversed.`,
    oneri: () => `Return to the missing stage and close its gate. Example: set the predecessor Adım to \`durum: tamamlandı\` and write its run record before setting the successor stage to \`durum: geliştirmede\`.`,
  },
  "göç-kapısı-eksik": {
    mesaj: (p) => `Migration stage "${a(p, "kimlik")}" is being closed with an incomplete closure record: ${yc(p, "en")}. A stage cannot close until its scope inventory, verification result, owned debt record and transferred impact set are written together.`,
    oneri: (p) => `Write all four parts of the closure record; the engine recognizes them by the words kapsam, hata, borç and etki in the koşu text. Example: complete it as \`Adım( kod: ${a(p, "kimlik")} ) { koşu: "kapsam: the scope inventory is complete; the gate reported 0 hata and 0 uyarı; borç: the remaining work is recorded with its owner; etki: the transferred impact set is listed." }\`.`,
  },
  "açık-gizli-sınır-ihlali": {
    mesaj: (p) => `Open-core file "${a(p, "dosya")}" establishes a required dependency on the closed product side: ${yc(p, "en")}. The open language and engine must remain independently usable and testable without the closed orchestration product.`,
    oneri: () => `Move the dependency to a declared contract boundary. Example: instead of a direct path, declare \`Sözleşme( kod: SZL-SINIR, ne: "<which capability>", alanlar: { … } )\` on the open side; let the closed product implement that contract on its side while the open core never reads the closed tree.`,
  },
  "çekirdek-bağımlılık-drifti": {
    mesaj: (p) => `File "${a(p, "dosya")}" diverges from dependency simplicity: ${yc(p, "en")}. The open core carries only declared, replaceable dependencies required for its essential function.`,
    oneri: () => `Declare or remove the dependency. Example: if it is truly required, retain \`"dependencies": { "<paket>": "^<sürüm>" }\` in the package manifest with its rationale; otherwise remove the entry and move its use outside the core.`,
  },
  "yürütücü-bağımlılığı": {
    mesaj: (p) => `Ruling "${a(p, "kimlik")}" binds to a particular external executor: "${a(p, "iz")}". The canonical ruling, teaching and orchestration contract must be understandable independently of an executor identity.`,
    oneri: () => `Write the contract independently of a specific capability provider. Example: replace the executor name with a condition such as \`required capability: "structured inference over a long context"\`; bind acceptance criteria to the output, not the tool.`,
  },
  "etki-yayın-kapısı-eksik": {
    mesaj: (p) => `Change "${a(p, "kimlik")}" is taking effect before its publication gate closes: ${yc(p, "en")}. No canonical change may take effect until its transitive impact set is verified and the gate is fully green.`,
    oneri: (p) => `Record the impact set and gate result; the engine recognizes them by the words etki and hata or uyarı in the koşu text. Example: write \`Adım( kod: ${a(p, "kimlik")} ) { koşu: "etki: the transitive impact set was derived and verified; the gate reported 0 hata and 0 uyarı." }\`.`,
  },
  "ölü-iz": {
    mesaj: (p) => `Trace "${a(p, "iz")}" no longer carries canonical meaning but remains in active scope (${p.dugum == null ? a(p, "yer") : `the "${a(p, "kenar")}" edge of node ${a(p, "dugum")}`}). Keeping a dead trace makes a retired option appear active.`,
    oneri: () => `Retire the trace with clear ownership. Example: remove the record or state its rationale with \`emekli: "<which ruling retired it and when>"\`.`,
  },
  "tip-evreni-eksik": {
    mesaj: (p) => `The canonical type universe has a missing record: ${yc(p, "en")}. No node type may be left outside the new backbone, renamed or silently retired.`,
    oneri: (p) => `Restore the missing record to the type canon. Example: add \`{ "ad": "${a(p, "tip")}", "aile": "<family>", "ne": "<one-sentence description>" }\` to the taxonomy registry.`,
  },
  "omurga-tipi-eksik": {
    mesaj: (p) => `New backbone type "${a(p, "tip")}" is missing from the canonical registry: ${yc(p, "en")}. General product or service types cannot substitute for these roles.`,
    oneri: (p) => `Declare the type together with its family, schema and containment record. Example: add \`{ "ad": "${a(p, "tip")}", "aile": "<family>", "ne": "<one-sentence description>" }\`, the schema \`"semalar": { "${a(p, "tip")}": { "zorunlu": [ "kod" ] } }\` and the row \`"izinliSarma": { "<parent>": [ "${a(p, "tip")}" ] }\` to the taxonomy registry.`,
  },
  "şema-tanımı-eksik": {
    mesaj: (p) => `The structural contract for type "${a(p, "tip")}" is not declared in machine-readable form: ${yc(p, "en")}. Node validation is derived only from the canonical schema.`,
    oneri: (p) => `Write the schema into the canon. Example: add \`"${a(p, "tip")}": { "zorunlu": [ "kod" ], "opsiyonel": [ "ne" ] }\` to the taxonomy registry.`,
  },
  "şema-dışı-alan": {
    mesaj: (p) => `Node "${a(p, "ad")}" (${a(p, "kimlik")}) uses field "${a(p, "alan")}", but that field is absent from both the type's canonical schema and the shared field dictionary. An out-of-schema field may remain as data, but it is not considered validated.`,
    oneri: (p) => `Use a valid field or extend the schema canonically. Example: if the field is truly required, add \`"${a(p, "ad")}": { "opsiyonel": [ "${a(p, "alan")}" ] }\` to the taxonomy registry; otherwise remove the row.`,
  },
  "örtü-ihlali": {
    mesaj: (p) => `The workspace overlay changes the base canon: ${yc(p, "en")}. An overlay may only add values to permitted sets through union; it is invalid wherever it fails to preserve base values.`,
    oneri: () => `Reduce the overlay to an additive union. Example: add only new values in the overlay file as \`{ "semalar": { "<type>": { "enum": { "<field>": [ "<new value>" ] } } } }\`; do not repeat or delete base values, and do not redefine the schema body.`,
  },
  "rejim-beyanı-eksik": {
    mesaj: (p) => `Proje "${a(p, "kimlik")}" does not declare its enforcement regime (\`rejim\`)${yc(p, "en", "")}. The regime is written exactly once, with only the value \`katı\` or \`esnek\`; no engine, surface or run may invent a silent default.`,
    oneri: (p) => `Add the declaration to the Proje statement. Example: write \`Proje( kod: ${a(p, "kimlik")}, rejim: katı )\` — if you are running a small or experimental effort, write \`rejim: esnek\`.`,
  },
  "katı-rejim-altkatman-eksik": {
    mesaj: (p) => `Katman "${a(p, "kimlik")}" directly contains an Adım under the strict regime. In that regime, every path from Katman to Adım passes through at least one department level.`,
    oneri: (p) => `Insert a department level. Example: create \`Katman( kod: ${a(p, "kimlik")} ) { AltKatman( kod: ALT-KODLAMA, ad: "Kodlama", departman: kodlama ) { Adım( kod: <ADIM> ) } }\`.`,
  },
  "rejim-geçiş-uyumsuzluğu": {
    mesaj: (p) => `Proje "${a(p, "kimlik")}" declares regime "${a(p, "rejim")}", but its structure does not satisfy that regime (${yc(p, "en")}). The engine does not automatically wrap, move or delete the existing structure.`,
    oneri: () => `Correct the nonconforming nodes by hand or restore the previous regime. Example: add missing department levels with \`AltKatman( kod: ALT-KODLAMA, ad: "Kodlama", departman: kodlama )\`; if you are not ready, write \`rejim: esnek\` and defer the transition.`,
  },
  "hüküm-türü-uyumsuz": {
    mesaj: (p) => `The role of ruling "${a(p, "kimlik")}" does not match the selected law type: ${yc(p, "en")}. Intent, enforcement, upper-bound, operational and external-obligation roles cannot assume one another's authority.`,
    oneri: () => `Move the ruling to the type appropriate to its role. Example: write a machine-enforced condition as \`Kural <ad>( kod: <KOD>, katman: yapısal, koşul: <ifade> )\`; retain a ruling that only locks direction as \`Karar( kod: <KOD>, durum: kilitli, karar: "…" )\`.`,
  },
  "kural-sözleşmesi-eksik": {
    mesaj: (p) => `Kural "${a(p, "kimlik")}" does not carry the full trio of authority, layer and resolvable scope: ${yc(p, "en")}. Without all three, it is impossible to know whom the rule governs, who enforces it and where it applies.`,
    oneri: (p) => `Complete the trio. Example: write \`Kural <ad>( kod: ${a(p, "kimlik")}, otorite: anayasa, katman: yapısal, kapsam: Adım, koşul: <ifade> )\`.`,
  },
  "tanı-sözleşmesi-uyumsuz": {
    mesaj: (p) => `${a(p, "kod", "") ? `Diagnostic "${a(p, "kod")}"` : "An unnamed diagnostic"} does not complete its contract: ${yc(p, "en")}. Every diagnostic carries a level, unique code, actionable message, source location and applicable correction recommendation, and its code exists in the canonical registry.`,
    oneri: () => `Fill the missing field and register the code. Example: complete the diagnostic as \`{ duzey: "hata", kod: "<identifier>", mesaj: "<what was found and why it is a problem>", satir: <line>, sutun: <column>, oneri: "<how to fix it>" }\`.`,
  },
  "tanı-kapsamı-karışması": {
    mesaj: (p) => `Diagnostic "${a(p, "kod")}" ran at the wrong gate: ${yc(p, "en")}. The single-file and Proje gates cannot imitate each other's scope, and single-file cleanliness cannot be presented as Proje cleanliness.`,
    oneri: (p) => `Move the diagnostic to its own gate. Example: read its registry record as \`{ kod: "${a(p, "kod")}", kapsam: "tek-dosya", uretici: "dogrulayici.ts" }\` and move production to that producer; keep findings that require the full Proje index or disk at the Proje gate.`,
  },
  "proje-tanı-kimliği-uyumsuz": {
    mesaj: (p) => `The diagnostic set's identity is not derived from the Proje code: ${yc(p, "en")}. Finding groups, graph identity and report-card identity originate from the unique Proje code, not from a physical directory path.`,
    oneri: () => `Bind identity to the Proje code. Example: place every productive tree in the workspace under \`Proje( kod: PRJ-<NAME> )\`; findings from separate Proje roots in the same directory must not merge.`,
  },
  "tanı-terfi-kapısı-ihlali": {
    mesaj: (p) => `The diagnostic level of ruling "${a(p, "kimlik")}" was promoted without its gate: ${yc(p, "en")}. A new ruling is first observed at information level, rises as its findings are cleared, and cannot skip a level.`,
    oneri: (p) => `Move the level back one stage and bind promotion to evidence. Example: start with \`Kural <ad>( kod: ${a(p, "kimlik")}, düzey: bilgi )\`; once findings reach zero write \`düzey: uyarı\`, and after an acceptance record write \`düzey: hata\`.`,
  },
  "sahte-tam-yeşil": {
    mesaj: (p) => `The fully-green claim is invalid: ${yc(p, "en")}. A gate is fully green only when both error and warning counts in its scope are zero; a skipped audit or single-file cleanliness alone cannot count as fully green.`,
    oneri: () => `Resolve the remaining findings or correct the claim. Example: write the closure record as \`koşu: "the gate reported 0 hata and 0 uyarı; no audit was skipped; <n> bilgi records remain visible."\`; information records do not change the outcome, but a skipped gate does.`,
  },
  "terfi-kanıtı-eksik": {
    mesaj: (p) => `The level of ruling "${a(p, "kimlik")}" was promoted with incomplete evidence: ${yc(p, "en")}. Promotion requires a working implementation binding, repeatable verification and an explicit authorized acceptance record together.`,
    oneri: (p) => `Bind all three pieces of evidence. Example: write \`Kural <ad>( kod: ${a(p, "kimlik")}, uygulama: <tanı kodu>, doğrulama: <sınama kodu>, kabul: <onay kodu> )\`.`,
  },
  "prizma-kaynak-ayrışması": {
    mesaj: (p) => `Derived surface "${a(p, "dosya")}" diverges from the single neutral tree: ${yc(p, "en")}. No surface may reinterpret the source, add fields or change child order.`,
    oneri: (p) => `Generate the surface from the shared tree and write its provenance. Example: put \`<!-- üretilmiştir: ${a(p, "dosya", "<source>.sar")} · yüz: json -->\` at the start of the output and remove the surface-specific transformation; if a field is needed, write it on the source node as \`<field>: <value>\`.`,
  },
  "eş-yetkili-yüz-ikizi": {
    mesaj: (p) => `Handwritten surface file "${a(p, "dosya")}" is being used as a twin with authority equal to the canonical source (${yc(p, "en")}). A derived surface is only reproducible output.`,
    oneri: () => `Either connect the file to generation or reduce it to a human-facing introduction. Example: put \`<!-- üretilmiştir: <kaynak>.sar -->\` at its start and hand it to the generator, or remove normative sentences and retain only welcome and navigation content.`,
  },
  "yüz-idempotans-drifti": {
    mesaj: (p) => `Surface "${a(p, "dosya")}" produces a different result from the same source and options: ${yc(p, "en")}. A generator may update only the region assigned to it.`,
    oneri: () => `Mark the generated region and do not touch anything outside it. Example: enclose the generated area between \`<!-- SARMAL:REGION -->\` and \`<!-- /SARMAL:REGION -->\`; keep hand-maintained sections outside those markers.`,
  },
  "geliştirme-yüzü-drifti": {
    mesaj: (p) => `A development surface diverges from canonical meaning: ${yc(p, "en")}. Development surfaces share the same identities, texts and diagnostic objects; the presentation layer cannot interpret or enforce them.`,
    oneri: () => `Keep meaning in the core and only carry it through the surface. Example: remove the local surface text and print the object produced by the core unchanged with \`const tani = cekirdek.dogrula(program, snf); yuzeyeBas({ kod: tani.kod, duzey: tani.duzey, mesaj: tani.mesaj, oneri: tani.oneri })\`.`,
  },
  "tanı-yüzü-uyumsuz": {
    mesaj: (p) => `Diagnostic "${a(p, "kod")}" is distorted across surfaces: ${yc(p, "en")}. The same violation appears on every surface with the same code, level, message essence, location and correction guidance.`,
    oneri: () => `Carry the diagnostic as one object; the surface must not compose its own sentence. Example: print \`{ duzey: tani.duzey, kod: tani.kod, mesaj: tani.mesaj, satir: tani.satir, sutun: tani.sutun, oneri: tani.oneri }\` unchanged on every surface and do not regrade its level locally.`,
  },
  "tanı-yüzeyi-karışması": {
    mesaj: (p) => `Diagnostic "${a(p, "kod")}" is shown on a presentation surface that does not match its nature: it was routed to "${a(p, "atanan")}" but belongs on "${a(p, "beklenen")}". When correctable drift, intentional forward binding and information-only notices accumulate on one panel, the distinction between “fix,” “remember” and “know” disappears.`,
    oneri: (p) => `Route the diagnostic to the surface that matches its nature without changing its identity or level. Example: write the routing record as \`{ kod: "${a(p, "kod")}", yüzey: "${a(p, "beklenen")}" }\` — error- and warning-level drift goes to Problems, open Hatırlatıcı nodes go to the Reminders panel, and information-level measurements and status markers go to the Observations panel.`,
  },
  "yüzey-sözleşmesi-eksik": {
    mesaj: (p) => `Surface "${a(p, "kimlik")}" does not carry a complete product contract: ${yc(p, "en")}. Every surface carries its stable identity, production provenance, visibility status, theme role and accessibility condition together.`,
    oneri: (p) => `Complete the missing contract. Example: write \`Ekran( kod: ${a(p, "kimlik")}, görünürlük: açık, tema: TEM-ANA, referans: <producing Adım code>, erişilebilirlik: "<screen reader label>" )\`.`,
  },
  "palet-yüz-drifti": {
    mesaj: (p) => `Theme role "${a(p, "rol")}" is not derived from the canonical palette: ${yc(p, "en")}. Every visual surface obtains concrete values from the same generated palette and cannot create a local palette copy.`,
    oneri: (p) => `Bind the role to the single palette. Example: write only \`renk: ${a(p, "rol", "birincil")}\` on the surface node and move its value to the technology theme declared by the Tema node's \`dosya:\` field.`,
  },
  "görünürlük-sözleşmesi-eksik": {
    mesaj: (p) => `Surface "${a(p, "kimlik")}" does not carry its visibility contract: ${yc(p, "en")}. Every surface declares visibility exactly once, and a hidden surface carries a machine-resolvable opening condition.`,
    oneri: (p) => `Complete the declaration. Example: write \`${a(p, "ad", "Ekran")}( kod: ${a(p, "kimlik")}, görünürlük: açık )\`; to keep it hidden, also write the condition as \`görünürlük: gizli, açılmaKoşulu: <resolvable condition>\`.`,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// ÖNCEKİ KANONUN TANI METİNLERİ
//
//   Yeni omurgadan önce yazılmış tanıların cümleleri buraya TAŞINDI; hiçbirinin
//   metni değişmedi, yalnız yeri değişti. Düzey burada yazılmaz, çünkü bu kümede
//   aynı tanı farklı kapılarda farklı düzeyle üretilebilir ve düzeyi üreticinin
//   kendisi bilir; katalog cümleyi verir, üretici düzeyi ve konumu verir.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ayrışan satırın bir yüzünü okunur kılar. Satır hiç yoksa ya da boşsa çıplak
 * tırnak kullanıcıya hiçbir şey söylemez; bu yüzden yokluk ve boşluk açıkça
 * cümleye yazılır. Metin katalogda yaşar, çünkü kullanıcı onu okur ve çevrilir.
 */
const ikizSatirYuzu = (p: TaniBaglami, onek: string, yok: string, bos: string): string => {
  if (b(p, `${onek}Yok`)) return yok;
  if (b(p, `${onek}Boş`)) return bos;
  return `«${a(p, `${onek}Metin`)}»`;
};

export const ONCEKI_TANI_METINLERI: Readonly<Record<string, OncekiTaniMetni>> = {
  // ── Bağımlılık grafı ──────────────────────────────────────────────────────
  "öz-bağımlılık": {
    mesaj: (p) => b(p, "dolaylı")
      ? `'${a(p, "kaynak")}', ${a(p, "kenar")} hedefi '${a(p, "hedef")}' kendi kapsayıcısı — genişleme kendini içeriyor (dolaylı öz-bağımlılık).`
      : `'${a(p, "kaynak")}' kendine ${a(p, "kenar")} — bir iş kendinden önce gelemez; sıra hesabı bu kenarı kuramaz.`,
    oneri: (p) => `Kenarı kaldır ya da gerçek öncülün KOD'unu yaz; kök iş ise bilinçli-bağımsız beyanı kullan: ${a(p, "kenar")}: [].`,
  },
  "kayıp-kenar": {
    mesaj: (p) => `'${a(p, "adım")}', '${a(p, "sahibi")}' Adımının meyvesini (${a(p, "hedef")}) referans alıyor ama ona bağımlı DEĞİL — kenar mı unuttun? Sıra hesabı bu bağı göremiyor.`,
    oneri: (p) => `Gerçek bir üretim-sırası bağıysa 'bağımlı: [ ${a(p, "sahibi")} ]' ekle; yalnız bilgi-bağıysa bu uyarıyı 'bağımlı: []' bilinçli-bağımsız beyanı susturmaz — referans'ı koru, kenarı bilinçli değerlendir.`,
  },
  "durum-tutarsızlığı": {
    mesaj: (p) => `'${a(p, "kod")}' tamamlandı ama öncülü '${a(p, "öncül")}' ${a(p, "öncülDurumu")} — öncül bitmeden iş bitmiş olamaz.`,
    oneri: (p) => `Ya '${a(p, "öncül")}' gerçekten bitmişse durumunu tamamlandı yap, ya '${a(p, "kod")}' durumunu geliştirmede'ye indir — plan gerçeği yansıtsın.`,
  },
  "kopuk-zincir": {
    mesaj: (p) => `'${a(p, "kaynak")}' düğümünün '${a(p, "kenar")}: ${a(p, "hedef")}' kenarı ÇÖZÜLMÜYOR — hedef hiçbir .sar'da tanımlı değil, zincir kopuk (sıra hesabı bu bağı göremez).`,
    oneri: (p) => `Hedefi düzelt: '${a(p, "hedef")}' bir yazım hatasıysa doğru KOD'u yaz; düğüm henüz doğmadıysa önce onu ilan et — kopuk kenar = yanlış yürütme sırası.`,
  },
  "döngüsel-bağımlılık": {
    mesaj: (p) => `'${a(p, "kod")}' bir bağımlılık döngüsünde — zincir sıralanamıyor (döngüyü kır).`,
    oneri: (p) => `Döngüyü kır: '${a(p, "kod")}' halkasındaki bağımlı/besler kenarlarından birini kaldır.`,
  },

  // ── Tema ve renk ──────────────────────────────────────────────────────────
  "geçersiz-renk": {
    mesaj: (p) => `Tema renk "${a(p, "ad")}" geçerli bir hex değil: "${a(p, "deger")}".`,
    oneri: () => `Hex renk bekleniyor: #RGB ya da #RRGGBB (örn. #1A1C1E).`,
  },
  "düşük-kontrast": {
    mesaj: (p) => `Tema "ana" ↔ "nötr" kontrast oranı ${a(p, "oran")}:1 — WCAG AA eşiği (4.5:1) altında.`,
    oneri: () => `Metin-zemin okunabilirliği için kontrastı ≥ 4.5:1 yap (koyu/açık farkını artır).`,
  },

  // ── Etmen yetki omurgası ──────────────────────────────────────────────────
  "rbac-yönetici-üretir": {
    mesaj: (p) => `Etmen "${a(p, "etmen")}": tür:yönetici 'üretir' kenarı taşıyamaz (akışı yönetir, üretmez)`,
    oneri: () => "üretimi bir uzman Etmen'e devret; yönetici yalnız koordine eder.",
  },
  "rbac-l5-paylaşık": {
    mesaj: (p) => `Etmen "${a(p, "etmen")}": yetki:L5 + bellek:paylaşık = HATA — denetçi izole olmalı (EBEDİ)`,
    oneri: () => "bellek: izole yap (L5 denetçi bağımsızlığı EBEDİ mühür).",
  },
  "rbac-l6-kalıcı": {
    mesaj: (p) => `Etmen "${a(p, "etmen")}": yetki:L6 kalıcı atanamaz (kurucu-vekili istisnai/geçici)`,
    oneri: () => "kalıcı Etmen için L1-L5 kullan; L6 yalnız geçici yükseltme.",
  },
  "rbac-apex-tekil": {
    mesaj: (p) => `${a(p, "sayı")} apex Etmen — apex TEKİL olmalı (ikinci apex = hata)`,
    oneri: () => "Tek apex orkestratör bırak; diğerlerini tür:yönetici/uzman yap.",
  },

  // ── Araç geçidi izinleri ──────────────────────────────────────────────────
  "gateway-izin-biçim": {
    mesaj: (p) => {
      if (a(p, "kusur") === "biçim") return `Etmen "${a(p, "etmen")}": mcpİzinleri girdisi '${a(p, "ham")}' biçimsiz — 'MCP-KOD:mod' bekleniyor`;
      if (a(p, "kusur") === "mod") return `Etmen "${a(p, "etmen")}": mcpİzinleri '${a(p, "ham")}' geçersiz mod taşıyor. Mod yalnız oku, yaz ya da çağır olabilir; '${a(p, "mod")}' bu üçünden biri değildir.`;
      return `Etmen "${a(p, "etmen")}": mcpİzinleri tanımsız araç '${a(p, "araç")}' — MCP/Araç düğümü yok`;
    },
    oneri: (p) => {
      if (a(p, "kusur") === "biçim") return "Her izni 'ARAÇ-KOD:mod' biçiminde yaz ve mod yerine oku, yaz ya da çağır kiplerinden birini koy.";
      if (a(p, "kusur") === "mod") return "Mod'u oku/yaz/çağır'dan seç.";
      return "Aracı bir MCP/Araç widget'ı olarak ilan et ya da KOD'u düzelt.";
    },
  },

  // ── Kural gövdesi, çatışma ve mühür ───────────────────────────────────────
  "katman-uyumsuz": {
    mesaj: (p) => {
      if (a(p, "kusur") === "niyet-koşullu") return `Kural "${a(p, "kod")}" niyet katmanında ama koşul: yazılmış — niyet katmanı ZORLANAMAZ (koşul yalnız zorlanan katmanlarda anlamlı).`;
      if (a(p, "kusur") === "katmansız") return `Kural "${a(p, "kod")}" koşul taşıyor ama katman beyanı yok — bu kuralı KİM zorlayacak belirsiz.`;
      return `Kural "${a(p, "kod")}" bilinmeyen katman: "${a(p, "katman")}".`;
    },
    oneri: (p) => {
      if (a(p, "kusur") === "niyet-koşullu") return "Koşul makinece zorlanacaksa katmanı değiştir: eşik ya da yapısal. Zorlanmayacaksa koşul'u kaldır — ne: metni prompt'a gider.";
      if (a(p, "kusur") === "katmansız") return "katman: ekle — yapısal (Denetçi, graf üstünde) · eşik (koşul çalışma anında değerlendirilir).";
      return "Geçerli katmanlar: yapısal (graf/Denetçi zorlar) · eşik (koşul motoru) · niyet (zorlanamaz — prompt'a gider).";
    },
  },
  "zorlanamayan-kural": {
    mesaj: (p) => `Kural "${a(p, "kod")}" ${a(p, "katman")} katmanı beyan etmiş ama koşul: yok — makine bu kuralı ZORLAYAMAZ.`,
    oneri: () => "Koşul ekle (örn. koşul: güven >= 0.7) ya da katmanı niyet yap (dürüstlük: kim zorluyor?).",
  },
  "düzyazı-koşul": {
    mesaj: (p) => `Kural "${a(p, "kod")}" makine-zorlamalı katman (${a(p, "katman")}) beyan etmiş ama koşulu serbest cümleyle yazılmış — motor serbest cümleyi değerlendiremez, bu koşul kendiliğinden ZORLANMAZ.`,
    oneri: () => `Bu kuralı motorun başka bir denetimi zaten zorluyorsa sorun yok — cümle o denetimi tarif eden meşru bir açıklamadır. Zorlayan yoksa iki seçenek var: koşulu motorun anlayacağı ifade diline çevir (örnek: karne.hata == 0) ya da katmanı niyet yap — niyet katmanı "bu kuralı makine değil insan/ajan gözetir" demektir.`,
  },
  "ebedi-ihlal": {
    mesaj: (p) => {
      if (a(p, "kusur") === "otorite") return `Kural "${a(p, "kod")}" ebedi: evet taşıyor ama otoritesi "${a(p, "otorite")}" — ebedi bayrağı YALNIZ anayasa kuralında olabilir.`;
      if (a(p, "kusur") === "arşiv") return `EBEDİ kural "${a(p, "kod")}" arşiv mühürlü "${a(p, "yol")}" dosyasında yaşıyor — ebedî kural taşıyan bir dosya arşiv mührü alamaz, çünkü ebedî kuralı graftan çıkarmak onu silmektir.`;
      if (a(p, "kusur") === "silinmiş") return `EBEDİ kural "${a(p, "kod")}" SİLİNMİŞ — mühürde var, hiçbir .sar'da yok (silmek de değiştirmektir).`;
      return `EBEDİ kural "${a(p, "kod")}" DEĞİŞTİRİLMİŞ — mühürlenen tanımdan sapmış (bu kural kilitli, kurucu bile değiştiremez).`;
    },
    oneri: (p) => {
      if (a(p, "kusur") === "otorite") return "Ya otorite: anayasa yap (ve Anayasa gövdesine taşı) ya da ebedi bayrağını kaldır.";
      if (a(p, "kusur") === "arşiv") return `Arşiv mührünü kaldır ya da ebedî kuralı canlı bir kaynak dosyasına taşıdıktan sonra dosyayı mühürle. Örnek: \`git mv "${a(p, "yol")}" "${a(p, "canlı")}"\`.`;
      if (a(p, "kusur") === "silinmiş") return "Kuralı geri getir; bilinçli kaldırıysa KARARLAR'a yaz + 'sarmal kilitle' ile mührü yenile.";
      return "Değişikliği geri al. Gerçekten değişecekse: bu bilinçli bir anayasa işlemidir — kuralı geri al, kararı KARARLAR'a yaz, sonra 'sarmal kilitle' ile YENİDEN mühürle (loglu override — FEL-4).";
    },
  },
  "koni-taşması": {
    mesaj: (p) => `"${a(p, "ad")}" (${a(p, "kimlik")}) düğümüne ${a(p, "sayı")} kural düşüyor (eşik: ${a(p, "eşik")}) — bağlam boğulması (çok fazla kural tek düğüme yığılmış).`,
    oneri: (p) => `Kuralları birleştir ya da kapsamları daralt — ajan ${a(p, "sayı")} kuralı aynı anda taşıyamaz (koni şişer).`,
  },
  "ağırlık-toplamı": {
    mesaj: (p) => `Değerlendirme "${a(p, "kimlik")}" boyut ağırlıkları ${a(p, "toplam")} — toplam 1.00 olmalı.`,
    oneri: () => "Ağırlıkları 1.00'a tamamla — eksik/fazla ağırlık skoru sessizce çarpıtır.",
  },
  "eşik-sırası": {
    mesaj: (p) => a(p, "kusur") === "sıra"
      ? `Değerlendirme "${a(p, "kimlik")}" eşik bandı bozuk: "${a(p, "ad")}: ${a(p, "deger")}" öncekinden (${a(p, "onceki")}) küçük değil — bant azalan-monoton olmalı (her eşik bir öncekinden küçük).`
      : `Değerlendirme "${a(p, "kimlik")}" eşiği "${a(p, "ad")}: ${a(p, "deger")}" (0,1] aralığı dışında.`,
    oneri: (p) => a(p, "kusur") === "sıra"
      ? "Eşikleri büyükten küçüğe sırala (örn. kabul: 0.90 › kabulNotlu: 0.75 › …) — örtüşen/boşluklu bant aksiyonu belirsizleştirir."
      : "Skor eşikleri 0'dan büyük, en çok 1 olur.",
  },
  "kural-çatışması": {
    mesaj: (p) => {
      if (a(p, "kusur") === "çelişki") return `"${a(p, "kod")}" ile "${a(p, "öteki")}" çelişiyor: "${a(p, "yol")}" için ${a(p, "koşul")} ve ${a(p, "ötekiKoşul")} AYNI ANDA sağlanamaz (kapsam kesişiyor, otorite eşit).`;
      if (a(p, "kusur") === "daraltmıyor") {
        return `"${a(p, "alt")}" (${a(p, "altOtorite")}) "${a(p, "yol")}" üzerinde "${a(p, "üst")}" (${a(p, "üstOtorite")}) kuralını DARALTMIYOR — ` +
          `${a(p, "altKoşul")} aralığı ${a(p, "üstKoşul")} içinde kalmıyor (gevşetme/çelişki). ` +
          `Alt otorite üst kuralı yalnız daraltabilir: alt kural üst kuralın aralığı içinde kalır, genişletemez.`;
      }
      return `"${a(p, "kod")}" İKİ KEZ farklı tanımlanmış (satır ${a(p, "birinci")} ve ${a(p, "ikinci")}) — aynı kavram iki gövde, makine hangisine uysun?`;
    },
    oneri: (p) => {
      if (a(p, "kusur") === "çelişki") return "Birini düzelt ya da otoritelerini ayır (anayasa > politika > tercih) — eşit otoritede çelişki çözülemez.";
      if (a(p, "kusur") === "daraltmıyor") return `"${a(p, "alt")}" koşulunu üst kuralın içinde kalacak şekilde KATILAŞTIR (daraltma serbest) ya da üst kuralı değiştir — sessiz galibiyet yok.`;
      return "Tek tanım bırak — kopyayı sil ya da farklıysa KOD'unu ayır. (Eski sistemde RBAC iki modülde farklı tanımlıydı, kimse görmedi.)";
    },
  },
  "birleşim-çatışması": {
    mesaj: (p) => {
      const detay = a(p, "kusur") === "daraltmıyor"
        ? `alt otorite "${a(p, "alt")}" (${a(p, "altOtorite")}) üst kuralı "${a(p, "üst")}" (${a(p, "üstOtorite")}) daraltmıyor`
        : "otorite eşit, aralıklar ayrık — ikisi birden sağlanamaz";
      return `⊥ "${a(p, "kimlik")}" düğümüne uygulanan "${a(p, "kod")}" ile "${a(p, "öteki")}" kısıtları "${a(p, "yol")}" üzerinde BİRLEŞMİYOR (${detay}): ${a(p, "koşul")} ∧ ${a(p, "ötekiKoşul")} = mantıksal taban.`;
    },
    oneri: () => "İki kuraldan birinin koşulunu uyumlu aralığa çek ya da uygular bağlarından birini kaldır — çelişki sessizce çözülmez, spec yalan söyleyemez.",
  },
  "kural-ihlali": {
    mesaj: (p) => {
      switch (a(p, "kusur")) {
        case "giriş-ayrıştırılamıyor":
          return `Giriş dosyası (${a(p, "dosya")}) bilerek-hatalı işaretli ve AYRIŞTIRILAMIYOR — denetim yapılamaz (giriş dosyası projenin kaynağı-gerçeğidir, bozuk kalamaz).`;
        case "ad-kuralı":
          return `'${a(p, "yol")}' adı kurala aykırı — küçük ASCII olmalı (boşluk, diakritik, büyük harf yasak; ayraç alt-çizgi).`;
        case "girişsiz-dizin":
          // Cümle yalnız ÖLÇÜLEN durumu iddia eder: yolun bir kap olduğu
          // varsayımı, o yol gerçekten bir dizin olarak ölçülmedikçe kurulmaz.
          // BKM-DNT-A13: yol `--ana` bayrağından geldiğinde cümle de bayrağın
          // ne beklediğini söyler — "dizininde giriş dosyası yok" demek burada
          // yanlış olurdu, çünkü kullanıcı dizin değil bir DOSYA vermek istemişti.
          if (b(p, "disBeyan") && a(p, "hedef", "dizin") === "dizin") {
            return `'${a(p, "dizin")}' bir dizindir; \`--ana\` ise giriş ilanının kendisini, yani tek bir DOSYA yolunu bekler ve verilen yol dosya olmadığı için okuma hiç başlayamadı.`;
          }
          switch (a(p, "hedef", "dizin")) {
            case "dosya":
              return `'${a(p, "dizin")}' bir dosyadır, dizin değildir; proje denetimi ise giriş dosyasını bir dizinin içinde arar ve verilen yol dizin olmadığı için arama hiç başlayamadı.`;
            case "yok":
              return `'${a(p, "dizin")}' yolu diskte bulunamadı; denetim, var olmayan bir yolun içinde giriş dosyası arayamadığı için durdu.`;
            default:
              return `'${a(p, "dizin")}' dizininde giriş dosyası yok — her proje bir giriş dosyasıyla başlar. Beklenen ad: <varlık>_anadizin.sar (eski ana.sar da tanınır).`;
          }
        default:
          return `"${a(p, "ad")}" (${a(p, "kimlik")}) düğümünde şu kural ihlal edildi: ${a(p, "ihlal", `Kural "${a(p, "kod")}" ihlal edildi`)} [kural: ${a(p, "kod")}]`;
      }
    },
    oneri: (p) => {
      switch (a(p, "kusur")) {
        case "giriş-ayrıştırılamıyor":
          return "Giriş dosyasının söz-dizimini düzelt ya da bilerek-hatalı pragmasını kaldır — muafiyet fikstürler içindir, giriş için değil.";
        case "ad-kuralı":
          return `'${a(p, "ad")}' adını '${a(p, "onerilen")}' olarak değiştir.`;
        case "girişsiz-dizin":
          // BKM-DNT-A13: öneri, kullanıcının FİİLEN kullandığı bayrağı anar.
          // Ölçülen kusur şuydu: `--ana` ile var olmayan bir spec dosyası
          // verildiğinde öneri "var olan bir proje dizini ver" diyordu, oysa
          // kullanıcı dizin değil bir GİRİŞ DOSYASI vermişti ve bayrağın adı
          // önerinin hiçbir yerinde geçmiyordu; kullanıcı kendi komutunu
          // önerinin içinde bulamıyordu.
          if (b(p, "disBeyan")) {
            switch (a(p, "hedef", "dizin")) {
              case "dizin":
                return "`--ana` bir DOSYA bekler, dizin değil: giriş ilanının kendi yolunu ver (`--ana <varlık>_anadizin.sar`). Dizin üzerinde koşmak istiyorsan bayrağı hiç verme; denetim giriş dosyasını dizinin içinde kendisi arar.";
              case "yok":
                return "`--ana` ile verdiğin yol diskte yok: yazımını düzelt ya da bayrağı kaldır. Bayrak verilmediğinde denetim giriş dosyasını dizinin içinde desenle arar (`<varlık>_anadizin.sar`).";
              default:
                return "`--ana` ile verdiğin dosya bir giriş ilanı değil; ilanın hiyerarşi, raf ve teknoloji beyanlarını taşıdığından emin ol ya da bayrağı kaldır.";
            }
          }
          switch (a(p, "hedef", "dizin")) {
            case "dosya":
              return "Proje denetimini dosyanın bulunduğu dizine koş (`sarmal denetle <dizin>`); yalnız bu tek dosyayı denetlemek istiyorsan dosyayı doğrudan motora ver (`sarmal <dosya.sar>`), çünkü tek-dosya denetimi ayrı bir kiptir.";
            case "yok":
              return "Yolu düzelt ya da var olan bir proje dizini ver; denetim ancak diskte bulunan bir dizin üzerinde koşabilir.";
            default:
              return "Önce giriş dosyanı yaz (ör. projem_anadizin.sar): hiyerarşi + raflar + teknolojiler orada ilan edilir (Yapı-Önce).";
          }
        default:
          return `Kural koşulu: ${a(p, "koşul")} — bu düğümde sağlanmıyor.`;
      }
    },
  },
  "zorlanamayan-koşul": {
    mesaj: (p) => `Kural "${a(p, "kod")}" koşulu kapsamdaki ${a(p, "kapsamda")} düğümün HİÇBİRİNDE değerlendirilemedi (belirsiz)${b(p, "eşik") ? " — eşik koşulu; çalışma anında zorlanır" : " — sessizce geçilemez"}.`,
    oneri: () => "Koşuldaki alan yolunu kontrol et (düğüm.alan; türetilmiş .uzunluk ve Kural-argümanı ikamesi desteklenir).",
  },
  "mühürsüz-ebedi": {
    mesaj: (p) => `Ebedi kural "${a(p, "kod")}" mühürsüz — değişirse kimse fark edemez.`,
    oneri: () => "Mühürle: sarmal kilitle <dizin> — mühür sonrası her değişiklik ebedi-ihlal olur.",
  },
  "çıplak-adımlı-katman": {
    mesaj: (p) => b(p, "özet")
      ? `${a(p, "sayı")} Katman, Adımlarını doğrudan taşıyor; önerilen düzen bunları konu modüllerine (AltKatman) toplamak ve her Katmanın altına önce bir AltKatman, o kademenin altına da Adımları yerleştirmektir. Örnek: ${a(p, "örnekler")}${s(p, "sayı") > 3 ? " …" : ""}`
      : "Bu Katman, Adımları doğrudan taşıyor; önerilen düzen, iş parçalarını konu modüllerine (AltKatman) toplamak ve Katmanın altına önce bir AltKatman, o kademenin altına da Adımları yerleştirmektir.",
    oneri: (p) => b(p, "özet")
      ? "Adımları konularına göre AltKatman modüllerine gruplayabilirsin; ayrıntı dosya başına tekil denetimde görünür."
      : "Adımları konularına göre AltKatman() modüllerine gruplayabilirsin; her AltKatman bir konu dalıdır ve Adımlar onun altında yaşar.",
  },
  "mühür-kırık": {
    mesaj: (p) => `"çağır ${a(p, "hedef")}" mühürlü referansı KIRIK — hedefin güncel mührü ${a(p, "güncel")}, pinlenen ${a(p, "pin")} (hedef sessizce değişmiş).`,
    oneri: (p) => `Hedefteki değişiklik BİLİNÇLİYSE pini güncelle: @mühür:${a(p, "güncel")} (karar iziyle — FEL-4); değilse hedefi mühürlenen hâline geri al.`,
  },

  // ── Tek-dosya doğrulaması: belge, kimlik ve alan hijyeni ──────────────────
  "sahipsiz-belge": {
    mesaj: () => '"///" belge-yorumu altında bir düğüm yok — belge bloğu hemen altındaki düğüme bağlanır; altında düğüm olmayınca belge sahipsiz kalır ve hiçbir yüzeyde görünmez.',
    oneri: () => 'Bloğu, ait olduğu düğümün açılış satırının hemen üstüne taşı; bir düğüme ait olmayan serbest notsa "//" satır yorumuna çevir.',
  },
  "halefsiz-revize": {
    mesaj: (p) => `Karar "${a(p, "kod")}" revize damgalı ama halef göstermiyor — hükmü KİM güncelledi?`,
    oneri: () => "halef: K-nn ekle (hükmü güncelleyen karar) — damga+halef modeli (HZL-B01); halefsiz revize kör damgadır.",
  },
  "öneksiz-blok": {
    mesaj: (p) => `Blok kodu "${a(p, "kod")}" BLK içermiyor — tip, addan okunmuyor (panel/defter kimliği).`,
    oneri: () => "Kodu BLK- önekiyle kur (ör. BLK-SEF) — atıflar birlikte göçer; kimlik ilk bakışta okunur.",
  },
  "yinelenen-parametre": {
    mesaj: (p) => `"${a(p, "alan")}" bu düğümde ikinci kez yazılmış — motor İLK değeri okur, bu satırdaki değer sessizce yok sayılır.`,
    oneri: (p) => `İki "${a(p, "alan")}" satırından birini sil (ilki ${a(p, "ilkSatır")}. satırda) — aynı alan tek evde yaşar, ikinci yazım drift tohumudur.`,
  },
  "gayrimeşru-geçiş": {
    mesaj: (p) => a(p, "kusur") === "kanıtsız"
      ? `Son koşu COMPLETED (kanıtsız teslim) mühürlü ama durum "tamamlandı" — kanıtsız iş bitmiş ilan edilemez; bu terfi motorun arkasından elle yazılmış görünüyor.`
      : `Son koşu BLOCKED mühürlü ama durum "tamamlandı" — bloklu iş bitmiş İLAN EDİLEMEZ; bu geçiş motorun arkasından elle yazılmış görünüyor.`,
    oneri: (p) => a(p, "kusur") === "kanıtsız"
      ? "Koşuyu kanıt üretecek şekilde yeniden koştur — sicil kanıtlı VERIFIED mühür hem koşu kaydını hem 'tamamlandı'yı kendisi yazar; kanıt yoksa durumu doğrulanmamış'a geri al."
      : "Blokaj gerçekten çözüldüyse önce yeni bir koşu/karar kaydı düş (koşu: güncellensin), sonra tamamlandı yaz; çözülmediyse durumu bloklu'ya geri al.",
  },
  "doğrulanamayan-tanı-iddiası": {
    mesaj: (p) => `Kural "tanı: ${a(p, "kod")}" iddia ediyor ama motorun tanı sicilinde böyle bir kapı YOK — "motorda" iddiası doğrulanamıyor.`,
    oneri: () => "Kapı gerçekten varsa sicile ekle (cekirdek/src/tani-sicili.ts — nöbet testi kaynak taramasıyla tutar); yoksa iddiayı kaldır — kural katman:niyet olarak dürüst yaşar.",
  },
  "dayanaksız-kural": {
    mesaj: (p) => b(p, "özet")
      ? `⚖️ Bu dosyada ${a(p, "sayı")} kural dayanak: kenarı taşımıyor (${d(p, "adlar").slice(0, 4).join(" · ")}${d(p, "adlar").length > 4 ? ` · +${d(p, "adlar").length - 4} daha` : ""}) — metin anması yapısal bağ değildir, kenar küme-eşleme oturumunda yazılır`
      : `⚖️ Kural "${a(p, "kod")}", onu doğuran Karar'a henüz makinenin okuyabildiği bir dayanak: bağıyla bağlanmamış — metindeki K-XX yalnız bir anmadır.`,
    oneri: (p) => b(p, "özet")
      ? "Her kurala dayanak: K-nn ekle (kuralı hangi kararın doğurduğunu söyler); bilinçli dayanaksızlık ise gerekçesiyle beyan edilir."
      : `Doğuran Karar'ı doğrula ("bu kuralı ben doğurdum" demeli), sonra tekse dayanak: K-XX, birden çoksa dayanak: [ K-XX, … ] yaz; doğuran karar yoksa bilinçli beyan: dayanaksız: "gerekçe metni".`,
  },
  "aile-geçersiz": {
    mesaj: (p) => `"Tip ${a(p, "ad")}" bilinmeyen bir aileye konmuş: "${a(p, "aile")}".`,
    oneri: (p) => `Geçerli aileler: ${d(p, "aileler").join(" · ")}.`,
  },
  "tarif-eksik": {
    mesaj: (p) => `"${a(p, "ad")}" tipinin açıklaması yok — 'ne:' alanı boş; kodu yazacak AI bu kavramı anlayamaz.`,
    oneri: () => 'Gövdeye ekle: ne: "bu kavram nedir, tek cümle".',
  },
  "ad-biçimi": {
    mesaj: (p) => a(p, "kusur") === "parametre"
      ? `Parametre adı küçük harfle başlamalı: "${a(p, "ad")}".`
      : `Tip adı büyük harfle başlamalı: "${a(p, "ad")}".`,
    oneri: (p) => a(p, "kusur") === "parametre"
      ? `"${a(p, "onerilen")}" yaz — parametre adları küçükHarfle başlar.`
      : `"${a(p, "onerilen")}" yaz — tip adları BüyükHarfle, parametre adları küçükHarfle başlar.`,
  },
  "kod-ilk-değil": {
    mesaj: (p) => `"${a(p, "ad")}" için 'kod' ${a(p, "sıra")}. sırada — 'kod' her zaman İLK parametre olmalı ki kimlik ilk bakışta okunsun.`,
    oneri: () => "'kod:' parametresini parantezin başına taşı.",
  },
  "belge-yanlış-düğüm": {
    mesaj: (p) => `"${a(p, "ad")}" (${a(p, "kimlik")}) belge-eksik görünüyor AMA içindeki "${a(p, "çocukAd")}" (${a(p, "çocukKimlik")}) bir belge bloğu taşıyor — belge YANLIŞ düğüme bağlanmış (belge, ait olduğu düğümden hemen önce gelir; içine konursa ilk çocuğa bağlanır).`,
    oneri: (p) => `Belge bloğunu "${a(p, "ad")}"in açılış satırından HEMEN ÖNCEsine taşı (-->| ## ${d(p, "bölümler").join(" · ## ")} |<-- sonra ${a(p, "ad")}( … )) — gövdenin { } içine değil.`,
  },
  "geçersiz-enum": {
    mesaj: (p) => `"${a(p, "ad")}" (${a(p, "kimlik")}) — "${a(p, "alan")}" için bilinmeyen değer: "${a(p, "deger")}".`,
    oneri: (p) => `Geçerli değerler: ${d(p, "izinli").join(" · ")}.`,
  },
  "geçersiz-tür": {
    mesaj: (p) => `"${a(p, "ad")}" (${a(p, "kimlik")}) — field "${a(p, "alan")}" has ${yc(p, "tr")}: "${a(p, "deger")}".`,
    oneri: (p) => `Bu alan ${a(p, "tür")} türünde olmalı.`,
  },
  "eksik-alan": {
    mesaj: (p) => b(p, "enAzBiri")
      ? `"${a(p, "ad")}" (${a(p, "kimlik")}) en az bir yüz taşımalı: ${a(p, "secenekler")}.`
      : `"${a(p, "ad")}" (${a(p, "kimlik")}) zorunlu alan eksik: ${d(p, "eksikler").map(eksikAdi(p, "tr")).join(" · ")}.`,
    oneri: (p) => b(p, "enAzBiri")
      ? "Bu gruplardan birini tam ver."
      : `${a(p, "ad")} için bu alanlar zorunludur.`,
  },
  "ham-renk": {
    mesaj: (p) => `"${a(p, "ad")}" (${a(p, "kimlik")}) — "${a(p, "alan")}" ham hex taşıyor: "${a(p, "deger")}". Renk niyeti ROL ile ifade edilir, DEĞER teknoloji temasında yaşar.`,
    oneri: () => "Tema rolü kullan (birincil · ikincil · vurgu · hata · yüzey · arkaplan · nötr — kanon: temaRolleri.renk); hex değeri Tema'nın 'dosya:' beyanındaki teknoloji temasına taşı.",
  },
  "açık-hatırlatıcı": {
    mesaj: (p) => b(p, "özet")
      ? `🔔 ${a(p, "sayı")} açık/kararlaşmış hatırlatıcı (❗${a(p, "açık")} açık · ➡️${a(p, "kararlaşmış")} kararlaşmış) — hepsi görünür, tek özet. Örnek: ${a(p, "örnek")}${s(p, "sayı") > 3 ? " …" : ""}`
      : `❗ Açık hatırlatıcı (${a(p, "kimlik")}): ${a(p, "ne", "")}`,
    oneri: (p) => b(p, "özet")
      ? "Hedef aktifleştiğinde hatırlatıcı koniyle birlikte 🔔 Bağlı Hatırlatıcılar panelinde kendiliğinden görünür. Kararı verdiğinde durum alanına kararlaştı yaz ve hatırlat: ADIM-KOD alanıyla kaydı zincire bağla; iş bittiğinde durumu tamamlandı yap. Kayıtlara tek tek bakmak için sarmal gezin <hatırlatıcının kodu> komutunu koştur."
      : "Hedef aktifleştiğinde hatırlatıcı koniyle birlikte kendiliğinden gelir. Kararı verdiğinde durum alanına kararlaştı yaz ve hatırlat: ADIM-KOD alanını ekle; kayıt böylece zincire girer. İş bittiğinde durumu tamamlandı yap.",
  },
  "kararlaşmış-hatırlatıcı": {
    mesaj: (p) => `❗➡️ Kararlaşmış hatırlatıcı (${a(p, "kimlik")})${p["hedef"] ? ` — zincirdeki Adım: ${a(p, "hedef")}` : " — HEDEFSİZ (zincire girmemiş!)"}: ${a(p, "ne", "")}`,
    oneri: () => "Üç geçerli yol vardır. Birincisi, işi mevcut bir Adıma eklemektir. İkincisi, araya yeni bir Adım açmaktır. Üçüncüsü, hedef zaten tamamlandıysa hatırlatıcının kodunu ANINDA güncellemektir ve Sarmal zinciri kendisi hizalar. İş zincirde bittiğinde durum alanına tamamlandı yaz.",
  },
  "politika-dayanaksız": {
    mesaj: (p) => `⚓ Politika (${a(p, "kimlik")}) hiçbir karara yaslanmıyor — hangi KARAR bu politikayı doğurdu?`,
    oneri: () => 'dayanak: "K-nn" ekle (KARARLAR kaydına bağ) — yönetişim izi izlenebilir olsun.',
  },
  "beceri-terfisi": {
    mesaj: (p) => `🟡 Bellek dersi terfi bekliyor (${a(p, "kimlik")}): ${a(p, "ne", "")}`,
    oneri: () => "Bu dersi Beceri'ye (skill) dönüştür ve bir kenara bağla (Etmen/Adım) — sonra terfi: tamamlandı.",
  },
  "geliştirmede-çapa": {
    mesaj: (p) => `🚧 Geliştirmede (${a(p, "kimlik")}): ${a(p, "ne", "")}`,
    oneri: () => "Bu satır bir hata değil, aktif işin işaretidir — şu an bu Adım üzerinde çalışılıyor. İş bitince durum: tamamlandı yap (yol haritası panelindeki kutucuktan ya da bu dosyadan).",
  },
  "bloklu-çapa": {
    mesaj: (p) => `⛔ Bloklu (${a(p, "kimlik")}): ${a(p, "ne", "")} — orkestratör koşusu bu Adımı bloklu mühürledi (kabul ölçütü karşılanmadı).`,
    oneri: () => "koşu: kaydındaki bulguları gider ve Adımı yeniden koştur; koşu kabul edilince durum: tamamlandı olur.",
  },
  "doğrulanmamış-çapa": {
    mesaj: (p) => `🟠 Doğrulanmamış (${a(p, "kimlik")}): ${a(p, "ne", "")} — iş teslim edildi ama bağımsız kanıt (koşum sicili) henüz yok.`,
    oneri: () => "Koşuyu kanıt üretecek şekilde yeniden koştur — sicil kanıtlı VERIFIED mühür 'tamamlandı'yı kendisi yazar; elle 'tamamlandı' yazımı yaz-anında reddedilir.",
  },
  "geçersiz-durum": {
    mesaj: (p) => `"Adım" (${a(p, "kimlik")}) bilinmeyen durum: "${a(p, "deger")}".`,
    oneri: () => "Geçerli değerler: beklemede · geliştirmede · tamamlandı · doğrulanmamış · bloklu.",
  },
  "bilinmeyen-tip": {
    mesaj: (p) => `"${a(p, "ad")}" diye bir tip yok.`,
    oneri: (p) => p["yakin"]
      ? `Bunu mu demek istedin: "${a(p, "yakin")}"? (Geçerli tipleri gör: sarmal siniflama. Kendi tipini tanımla: Tip ${a(p, "ad")}( ... ).)`
      : `Geçerli tipleri gör: sarmal siniflama. Kendi tipini tanımla: Tip ${a(p, "ad")}( ... ).`,
  },
  "derin-dal": {
    mesaj: () => "AltKatman zinciri üç kademeyi aştı — dal 4+ seviye derinleşti. Bu derinlik gerekli mi?",
    oneri: () => "Gerekliyse böyle kalsın (bilgi cezasızdır); değilse en içteki AltKatman'ın Adımlarını üste al — yapı yalınlaşır.",
  },
  "izinsiz-sarma": {
    mesaj: (p) => {
      const e = a(p, "ebeveyn"), c = a(p, "çocuk");
      switch (a(p, "kusur")) {
        case "ilan-dışı":
          return `İzin verilmeyen yerleşim: "${e}" (Tip ilanına göre) içinde "${c}" olamaz. İlan edilen çocuklar: ${d(p, "izinli").join(" · ")}.`;
        case "ilansız-yaprak":
          return `İzin verilmeyen yerleşim: "${e}" içerir: ilan etmemiş — yaprak sayılır, çocuk saramaz. (İlana «içerir: [${c}]» ekle.)`;
        case "yüzey-dışı":
          return `İzin verilmeyen yerleşim: Yüzey düzen widget'ı ("${e}") yalnız yüzey widget'ı sarar; "${c}" yüzey değil.`;
        case "yaprak":
          return `İzin verilmeyen yerleşim: "${e}" bir yaprak (Metin/Düğme/Görsel/İkon) — çocuk widget saramaz.`;
        case "sarmaz":
          return `İzin verilmeyen yerleşim: "${e}" çocuk widget sarmaz.`;
        default:
          return `İzin verilmeyen yerleşim: "${e}" içinde "${c}" olamaz. İzinli çocuklar: ${d(p, "izinli").join(" · ")}.`;
      }
    },
    oneri: (p) => {
      if (a(p, "çocuk") === "Mekanizma") {
        return "Mekanizma plana gömülmez — üst-düzeye (ortak/mekanizma rafına) taşı; kullanan Adım 'bağımlı: MEK-…' ile REFERANS versin (bir kez ilan, her yerden bağ).";
      }
      const ebeveynler = [...d(p, "ebeveynler"), ...(b(p, "yuzeyDuzeni") ? [ORTAK_TANI_METINLERI.yuzeyDuzeniEbeveyni({})] : [])];
      return ebeveynler.length ? `"${a(p, "çocuk")}" şuraya konur: ${ebeveynler.join(" · ")}.` : undefined;
    },
  },

  // ── Proje kapısı: disk, omurga ve kuruluş ─────────────────────────────────
  "beyansız-yapı": {
    mesaj: (p) => `'${a(p, "ad")}/' diskte var ama ${a(p, "giriş")}'da ilan edilmemiş — açılan her klasör giriş dosyasında bildirilmelidir; ilansız yapı zamanla plandan kopar.`,
    oneri: (p) => `${a(p, "giriş")}'a ekle: Kitaplık( kod: KTP-…, yol: "${a(p, "ad")}/", ne: "…" ) — ya da klasörü kaldır.`,
  },
  "ilansız-gövde": {
    mesaj: (p) => {
      const ornek = d(p, "örnekler").join(", ");
      const artan = s(p, "artan") > 0 ? ` ve ${s(p, "artan")} dosya daha` : "";
      return b(p, "kök")
        ? `Çalışma alanının kökünde ilanı bulunmayan ${a(p, "sayı")} kaynak dosyası yaşıyor (${ornek}${artan}). Kök klasör ağacını beyan eder, gövde toplamaz; bu yüzden bu dosyaların varlığını ${a(p, "giriş")} hiç bilmiyor ve zamanla plandan kopuyorlar.`
        : `'${a(p, "yer")}/' bir kitaplıktır ve kitaplıkta raflar durur; buna karşılık burada ilanı bulunmayan ${a(p, "sayı")} kaynak dosyası doğrudan yaşıyor (${ornek}${artan}). Kitaplığın ilanı bu gövdeleri kapsamaz, çünkü kitaplık yalnız raf taşımaya beyan edilmiştir.`;
    },
    oneri: (p) => b(p, "kök")
      ? `Bu gövdeleri toplayacak rafı ${a(p, "giriş")} dosyasında ilan et ve dosyaları oraya taşı; kökün altına çıplak Raf yazılmaz, çünkü raf Kitaplığın İÇİNDE yaşar. Örnek: \`Kitaplık( kod: KTP-…, yol: "…/", ne: "bu kitaplığın neyi topladığı" ) { Raf( kod: RAF-…, yol: "…/", ne: "bu rafın neyi topladığı" ) }\`. Gövde bu ağaca ait değilse dışına çıkar; ilanı senin yerine motor yazmaz, çünkü bir gövdenin hangi rafa ait olduğu bir niyet kararıdır.`
      : `Kitaplığın İÇİNE gövdeyi toplayacak bir raf ilan et ve dosyaları oraya taşı; rafın yolu kitaplığa GÖREDİR, kitaplığın adını rafa yeniden yazma. Örnek: \`Kitaplık( kod: KTP-…, yol: "${a(p, "yer")}/" ) { Raf( kod: RAF-…, yol: "…/", ne: "bu rafın neyi topladığı" ) }\`. Gövde başka bir yere aitse kitaplığın dışına çıkar; ilanı senin yerine motor yazmaz, çünkü bir gövdenin hangi rafa ait olduğu bir niyet kararıdır.`,
  },
  "teknolojisiz-yüzey": {
    mesaj: (p) => `${a(p, "yüzey")} ilan edilmiş ama proje hiçbir teknoloji seçmemiş — teknoloji seçilmeden ekran/uç doğamaz.`,
    oneri: () => 'Önce köke bir Takım kur (ör. Takım( kod: TAKIM-ONYUZ, ne: "önyüz yığını", bağımlı: [ FLUTTER ] )) — şablon: sarmal başla proje.',
  },
  "yer-uyuşmazlığı": {
    mesaj: (p) => `'${a(p, "kod")}' kanonik yerinde değil: '${a(p, "beklenen")}' olmalı, diskte '${a(p, "gerçek")}'.`,
    oneri: (p) => `Dosyayı '${a(p, "gerçek")}' konumundan kanonik yeri olan '${a(p, "beklenen")}' konumuna taşı; kod kanundur ve klasör onun aynasıdır (FEL-3: dosya yapısı beyandan türer).`,
  },
  "harf-farkı": {
    mesaj: (p) => `'${a(p, "yol")}' ilan edilmiş; diskte yalnız BÜYÜK/küçük harf farkıyla eşleşen bir ${a(p, "tür")} var — macOS bunu aynı sayar, Linux "dosya yok" der (çapraz-platform kırılması).`,
    oneri: () => "Diskteki adı ilana birebir eşitle (git mv ile — büyük/küçük harf değişikliği macOS'ta iki adımlı olabilir).",
  },
  "kayıp-yapı": {
    mesaj: (p) => p["diskte"] === undefined
      ? `'${a(p, "yol")}' ana.sar'da ilan edilmiş ama diskte yok.`
      : `'${a(p, "yol")}' ${a(p, "tür")} olarak ilan edilmiş ama diskte ${a(p, "diskte")}.`,
    oneri: (p) => p["diskte"] === undefined
      ? "İskeletçiyle üret: sarmal <ana.sar> --iskelet <hedef> — ya da ilanı kaldır."
      : "Diskteki türü ilana uydur (ya da ilanı düzelt).",
  },
  "bildirilmemiş-dosya": {
    mesaj: (p) => `'${a(p, "yol")}' diskte var ama ana.sar'da ilan edilmemiş (yetim ${a(p, "tür")}).`,
    oneri: () => "Giriş dosyasına ilan et; standart araç-zinciri iziyse (config/scaffold/üretilen) sahibi teknolojiye `ayakizi:` beyan et; omurgaya ait değilse dışına taşı ya da sil.",
  },
  "doğuş-eksik": {
    mesaj: (p) => `"${a(p, "plan")}" plan düğümü var ama dosyada projenin kuruluş iskeleti (doğuş omurgası) görünmüyor — ne giriş dosyasına çağır köprüsü ne bir Teknoloji/Takım bağı var; plan, temeli atılmamış bir projeye yazılıyor olabilir.`,
    oneri: () => "Önce <varlık>_anadizin.sar + Teknoloji/Takım ilan et (şablon: sarmal başla) ve plan Adımlarını Takım'a `bağımlı:` ile bağla; anadizinli projedeysen bütünü `sarmal denetle <dizin>` ile denetle.",
  },
  "doğuş-sırası": {
    mesaj: (p) => `Projede plan düğümü ('${a(p, "plan")}') var ama hiçbir dosyada TEKNOLOJİ omurgası yok: ne bir Teknoloji ya da Takım ilanı ne de onlara giden bir çağır köprüsü bulunuyor. Anadizindeki Proje kökü tek başına omurga sayılmaz, çünkü teknolojisi ilan edilmemiş bir projede plan hangi yığın üzerinde yürüyeceğini söyleyemez. Kuruluş sırası şudur: önce teknoloji ilanı, sonra plan.`,
    oneri: () => "Önce <varlık>_anadizin.sar + Teknoloji/Takım ilan et (şablon: sarmal başla); plan Adımlarını Takım'a bağla. Anadizinli projedeysen bütünü `sarmal denetle <kök>` ile denetle (fragman tek başına değil).",
  },
  "olgunluk-onayı": {
    mesaj: (p) => `🔒 Plan olgun görünüyor (${a(p, "adımSayısı")} Adım koni-dolu, kod HENÜZ başlamamış) — planlamadan kodlamaya geçiş anı. Kodlamaya başlamadan İNSAN OLGUNLUK ONAYI al ("plan hazır, koda geçebiliriz"). Motor hatırlatır, KESMEZ.`,
    oneri: () => "Planı son kez gözden geçir ve üç soruyu yanıtla: koni tam mı, denetim temiz mi, Teknoloji sürümleri kilitli mi? Üçü de evetlendikten sonra insan onayını al ve ilk Adımı ŞEF'e vererek kodlamaya geç. Olgunlaşmamış plan üstüne yazılan kod, plandan kopuşla biter.",
  },
  "ad-ayracı": {
    mesaj: (p) => `Dosya adında tire var ('${a(p, "ad")}') — Sarmal dosya adlarında ayraç alt-çizgidir.`,
    oneri: (p) => `Yeniden adlandır: ${a(p, "onerilen")} (atıflarıyla birlikte).`,
  },
  "kenar-metin": {
    mesaj: (p) => a(p, "kusur") === "kapsayıcı-alan"
      ? `'${a(p, "kenar")}' bir KENARDIR — KOD ister, metin bulundu: "${a(p, "metin", "")}". Bağımlı olduğun düğümün KOD'u ne?`
      : `'${a(p, "kenar")}' bir KENARDIR — KOD ister, metin bulundu: "${a(p, "metin", "")}". Tırnaklı hedef çözülmez, bağ kurulmaz.`,
    oneri: (p) => a(p, "kusur") === "kapsayıcı-alan"
      ? `${a(p, "kenar")}: [KOD] yaz — motor DAG'da takip etsin; anlatı sınır/görev'e. Yapıştır-düzelt: hedef henüz ilansızsa önce düğümünü ilan et (örn. Kod( kod: KOD-X, dosya: "yol/dosya.ts", ne: "🍎 …" )), sonra ${a(p, "kenar")}: [ KOD-X ]. ayrıntı: sarmal ogret uretir-kenari.`
      : `Tırnakları kaldır (${a(p, "kenar")}: ${a(p, "onerilenHedef")}) — hedef gerçek bir düğüm KOD'u olsun; anlatı sınır/görev alanlarına. Yapıştır-düzelt (dosya yolu vakası): önce Kod( kod: KOD-X, dosya: "yol/dosya.ts", ne: "🍎 …" ) ilan et, sonra ${a(p, "kenar")}: [ KOD-X ] yaz. ayrıntı: sarmal ogret uretir-kenari.`,
  },
  "kırık-referans": {
    mesaj: (p) => {
      switch (a(p, "kusur")) {
        case "meyve": return `'üretir: ${a(p, "hedef")}' meyvesi hiçbir yerde ilan edilmemiş.`;
        case "ileri-bağlama": return `'hatırlat: ${a(p, "hedef")}' hedefi henüz doğmamış (ileri-bağlama).`;
        case "çağır": return `'çağır ${a(p, "hedef")}' çözülmüyor — bu KOD hiçbir .sar'da tanımlı değil.`;
        // ORK-4 üç durumlu okunuş (KPS-ADA-A01): ad alanı ölçülebiliyorsa hedef
        // gerçekten kırıktır; ölçülemiyorsa atıf kırık değil MUAFTIR ve muafiyet
        // burada adıyla söylenir — sessiz yeşil geçiş yoktur.
        case "ad-alanı-kırık": return `'${p.kenar ? `${a(p, "kenar")}: ` : "çağır "}${a(p, "hedef")}' hedefi GERÇEKTEN kırık — ad alanı '${a(p, "adAlani")}' çözüldü, fakat yerel KOD o Projenin kapsamında ilan edilmemiş.`;
        case "ad-alanı-ölçülemez": return `'${p.kenar ? `${a(p, "kenar")}: ` : "çağır "}${a(p, "hedef")}' hedefi bu kökten ÖLÇÜLEMEZ — ad alanı '${a(p, "adAlani")}' ne yüklü evrende bir Proje kodu ne de çatı ilanında duyurulmuş bir kardeş kök; atıf kırık sayılmadı, MUAF bırakıldı.`;
        default: return `'${a(p, "kenar")}: ${a(p, "hedef")}' hedefi çözülmüyor — bu KOD hiçbir .sar'da tanımlı değil.`;
      }
    },
    oneri: (p) => {
      switch (a(p, "kusur")) {
        case "meyve": return `İstersen '${a(p, "hedef")}' için bir Ürün 🍎 widget'ı ilan et (izlenebilirlik).`;
        case "ileri-bağlama": return "Hedef Adım doğunca kendiliğinden bağlanır; istersen şimdi ilan et.";
        case "ad-alanı-kırık": return `Kardeş kökte '${a(p, "hedef")}' yazımını doğrula: KOD'u düzelt ya da hedefi o Projede ilan et; arşiv ve sonra mühürlü dosyalardaki tanımlar okunmaz (MIM-3.4).`;
        case "ad-alanı-ölçülemez": return `Muafiyet sessiz kalmasın diye bildirildi: denetimi çatı kökünden koştur ya da '${a(p, "adAlani")}' kökünü çatı ilanına Kitaplık olarak ekle; o zaman hedef gerçekten doğrulanır.`;
        default: return `'${a(p, "hedef")}' tanımını içeren .sar'ı projeye ekle — ya da KOD'u düzelt.`;
      }
    },
  },
  "karşılıksız-metin-atfı": {
    mesaj: (p) => `'${a(p, "kod")}' bir kod gibi yazılmış ama hiçbir .sar'da tanımlı değil — ${b(p, "belgede") ? "belge" : "kod yorumu"} çözülmeyen bir kimliğe atıf yapıyor.`,
    oneri: (p) => `'${a(p, "kod")}' hâlâ yaşıyorsa tanımını ilan et; adı değiştiyse metni güncelle; geçmişi anlatıyorsa (bayat atıf) bu bilgi doğaldır.`,
  },
  "kırık-halef": {
    mesaj: (p) => `Karar "${a(p, "kod")}" revize damgası taşıyor ve halefi olarak "${a(p, "halef")}" kararını gösteriyor, fakat böyle bir Karar tanımlı DEĞİLDİR; atıf karşılıksız kalmıştır.`,
    oneri: () => "halef: değerini hükmü güncelleyen gerçek bir Karar KOD'una düzelt (ya da revize damgasını kaldır).",
  },
  "halef-döngü": {
    mesaj: (p) => `Karar "${a(p, "kod")}" halef zinciri DÖNGÜ oluşturuyor; zincir şu kararları sırayla izleyip başladığı yere dönüyor: ${d(p, "zincir").join(", ")}. Bu yüzden güncel hüküm belirsizdir.`,
    oneri: () => "Zincir yürürlükteki (revize-olmayan) bir kararda BİTMELİ; fazla halef damgasını kaldır ya da doğru halefi göster.",
  },
  "yinelenen-kod": {
    mesaj: (p) => `KOD "${a(p, "kod")}" aynı varlığın içinde ${a(p, "sayı")} kez tanımlı (${d(p, "dosyalar").join(" · ")}) — kimlik bir varlığın içinde TEKİL olmalı.`,
    oneri: () => "Tek sahibi bırak; diğer kullanım yerleri `çağır KOD` ile bağlansın. Ayrı bir varlığın aynı adı taşıması çakışma değildir; sınır varlıktır, tarama kapsamı değil.",
  },
  "kırık-koşar": {
    mesaj: (p) => `"Döngü" (${a(p, "kimlik")}) koşar hedefi '${a(p, "hedef")}' hiçbir yerde ilan edilmemiş — bu döngü koşulamaz.`,
    oneri: (p) => `Hedef Adım'ı ilan et (kod: ${a(p, "hedef")}) ya da listeden çıkar — koşucu şu an yalnızca Adım'ları çalıştırır.`,
  },
  "durunca-sözlüğü": {
    mesaj: (p) => `"Döngü" (${a(p, "kimlik")}) durunca koşulu koşucunun tanıdığı sözlükte değil: "${a(p, "koşul")}" — koşucu bunu değerlendiremez.`,
    oneri: () => "Tanınan kalıplar: karne.hata == 0 · karne.uyari <= N · durum(KOD) == tamamlandı.",
  },
  "kapsayıcı-kenar": {
    mesaj: (p) => `'${a(p, "ad")}' bir KAPSAYICIDIR — kenar (${a(p, "kenar")}) yalnız Adım'da beyan edilir; kapsayıcının sırası çocuklarından hesaplanır.`,
    oneri: () => "Kenarı ilgili Adıma indir. Kenarın hedefi bir kapsayıcı olabilir; bağımlı: [BLOK-KODU] yazdığında motor bağı yapraklara kendisi genişletir. Bu kademede yalnız Katmanın Takım ve Teknoloji bağı serbesttir.",
  },
  "yanlış-alan": {
    mesaj: () => "KOD listesi taşıyan kenarın adı 'bağımlı'dır — 'bağımlılık' diye bir alan yok (sıra, bağımlı kenarından hesaplanır).",
    oneri: () => "Alan adını `bağımlı:` yap — liste o kenarda DAG'a girer.",
  },
  "gizli-bağımlılık": {
    mesaj: (p) => `Düzyazı 'bağımlılık' metninin içinde çözülür KOD gizli: ${d(p, "gizli").join(", ")} — motor bu bağı bağımlılık grafında TAKİP EDEMEZ; bağımlılık mekaniktir, kenarla beyan edilir.`,
    oneri: (p) => `bağımlı: [${d(p, "gizli").join(", ")}] kenarına çevir; kalan anlatıyı sınır/görev'e taşı.`,
  },
  "bağımlılık-mekanik": {
    mesaj: () => "Bağımlılıkta niyet ifade edilmez — mekaniktir: bağlı olduğun düğümün kodu ne?",
    oneri: () => "bağımlı: [KOD] yaz; KOD yoksa bu bir bağımlılık değildir — anlatıyı sınır/görev'e taşı.",
  },
  "tek-çocuk-kapsayıcı": {
    mesaj: (p) => a(p, "kusur") === "tek-katman"
      ? "Bu Faz tek bir Katman taşıyor ve Katman bir Blok gövdesine sarılmamış. Katman bir iş gövdesinin teknoloji dilimidir; Faz ile Katman arasındaki Blok kademesi atlanamaz (MIM-1)."
      : "Bu Faz (zaman dilimi) tek bir Blok taşıyor. Bu bir kusur değildir ve Faz atlanamaz, çünkü hiçbir Blok Fazsız yaşamaz (MIM-1.2); gözlem yalnız Fazın kapsamını gözden geçirmen için yazılır.",
    oneri: (p) => a(p, "kusur") === "tek-katman"
      ? "Katmanı bir Blokun gövdesine sar. Örnek: `Faz( kod: FAZ-… ) { Blok( kod: BLK-… ) { Katman( kod: KAT-… ) { … } } }`."
      : "Faz gerçekten tek bir iş gövdesi taşıyorsa olduğu gibi bırak; dönemin öteki işleri varsa onları aynı Fazın gövdesine yeni Bloklar olarak yaz. Fazı kaldırıp Bloku köke alma: Fazsız Blok `fazsız-blok` hatası verir.",
  },
  "rafsız-anadizin": {
    mesaj: (p) => `'${a(p, "kök")}' kökü hiçbir klasör yapısı İLAN ETMİYOR (raflar/Kitaplık/Raf yok) — yapı önce ilan edilir; ilansız yapıda üretilen her dosyanın yeri TAHMİN olur.`,
    oneri: () => 'Köke raf ilanı ekle (raflar: { belge: "açıklama" } ya da Kitaplık/Raf düğümleri) — şablon: sarmal başla proje; plan-yalnız erken evredeysen bile hedef yapıyı şimdi ilan et.',
  },
  "anadizin-plan-karışması": {
    mesaj: (p) => `'${a(p, "kök")}' anadizin kökü doğrudan '${a(p, "bulunan")}' plan düğümünü içeriyor. Anadizin MİMARİ çizer ve Kitaplık, Raf ile yol ilanlarını taşır; Faz kademesinden Blok, Katman ve Adım kademelerine inen plan ise işin Kitaplığı içindeki plan rafında, yani is/plan/ altında, AYRI bir .sar dosyasında yaşar. Kuruluş kuralı şudur: önce anadizin mimariyi çizer, plan sonra ayrı dosyada büyür.`,
    oneri: () => 'Plan düğümlerini is/plan/ altında ayrı .sar\'a taşı; rafı Kitaplığın İÇİNDE ilan et, çünkü kökün altına çıplak Raf yazılmaz (Kitaplık( kod: KTP-IS, yol: "is/" ) { Raf( kod: RAF-PLAN, yol: "plan/" ) }). Şablon: sarmal başla proje.',
  },
  "kavuşumsuz-paralellik": {
    mesaj: (p) => `'${a(p, "kod")}' (${d(p, "takımlar").join("+")}) farklı takımın Adımına ('${a(p, "hedef")}' · ${d(p, "hedefTakımları").join("+")}) DOĞRUDAN bağımlı — ön/arka birbirine zincirlendi, paralel koşamaz; kavuşum Sözleşme üzerinden olmalı.`,
    oneri: (p) => `Ortak bir Sözleşme ilan et (SZL-…); '${a(p, "hedef")}' onu üretir/referans versin, '${a(p, "kod")}' ona bağlansın — doğrudan Adım kenarı kalkar, iki taraf paralel koşar (önce sözleşme yaklaşımı).`,
  },
  "silo-blok": {
    mesaj: (p) => `'${a(p, "kod")}' Blok yalnız ${b(p, "önyüz") ? "önyüz (yuzey)" : "arkayüz (arkayuz)"} düğümü taşıyor, karşı yüz ve güvenlik yok — dikey dilim değil, silo (önyüz+arkayüz+güvenlik bir Blok'ta kavuşmalı).`,
    oneri: (p) => b(p, "önyüz")
      ? "Bloka bir arkayüz düğümü (Uç ya da Servis) ve bir güvenlik düğümü (Güvenlik ya da Mekanizma) ekle, sonra Ekran ile Uç arasındaki kavuşumu Sözleşme üzerinden kur; Blok böylece dikey bir dilim olur. Bu Blok bilinçli olarak tek yüzlüyse ayrı bir Katman notu ya da proje-soul notu düş."
      : "Bloka bir önyüz düğümü (Ekran ya da Form) ve bir güvenlik düğümü (Güvenlik ya da Mekanizma) ekle, sonra Ekran ile Uç arasındaki kavuşumu Sözleşme üzerinden kur; Blok böylece dikey bir dilim olur. Bu Blok bilinçli olarak tek yüzlüyse bir proje-soul notu düş.",
  },
  "kavuşumsuz-dilim": {
    mesaj: (p) => `'${a(p, "kod")}' Blok hem yüzey ('${a(p, "önyüz")}') hem arkayüz ('${a(p, "arkayüz")}') düğümü taşıyor ama aralarında KAVUŞUM yok — önyüz ve arkayüz var, birbirine bağlanmamış (dikey dilim ama kavuşumsuz).`,
    oneri: (p) => `Yüzey ile arkayüzü kavuştur. Birinci yol doğrudan bağdır: '${a(p, "önyüz")}' düğümünü çağırır ya da kullanır kenarıyla '${a(p, "arkayüz")}' düğümüne bağla. İkinci yol önce sözleşme yaklaşımıdır: ortak bir Sözleşme ilan et, '${a(p, "arkayüz")}' onu SZL-… koduyla üretsin ve '${a(p, "önyüz")}' ona referans versin. İki yüz Sözleşmede buluşsun.`,
  },
  "bilinmeyen-kapsam": {
    mesaj: (p) => `Kural "${a(p, "kod")}" kapsamı çözülmüyor: "${a(p, "kapsam")}" ne aile, ne tip, ne tanımlı KOD — bu kuralın kapsamı BOŞ KÜME (hiçbir düğüme uygulanmaz).`,
    oneri: (p) => `Geçerli seçiciler: joker (genel) · aile adı (örn. yuzey · plan · etmen) · tip adı (örn. Tema) · tek KOD. Aile listesi: ${d(p, "aileler").join(" · ")}.`,
  },
  "boş-kapsam": {
    mesaj: (p) => `Kural "${a(p, "kod")}" yapısal koşul taşıyor ama kapsamı ("${a(p, "kapsam")}") çalışma alanında HİÇBİR düğümle eşleşmiyor — koşul hiçbir yerde koşmayacak (sessiz ölüm).`,
    oneri: () => "Kapsamı gerçek bir hedefe çevir ya da hedef düğümler doğana dek kuralı katman: niyet'e çek (dürüstlük: kim zorluyor?).",
  },
  "kullanımsız-tip": {
    mesaj: (p) => `Tip "${a(p, "ad")}" (${a(p, "aile")}) kanonda tanımlı ama CANLI bahçede hiç kullanılmıyor ve muafiyeti beyan edilmemiş — "format yazıp uygulamama" adayı.`,
    oneri: () => "Ya kendi bahçende ≥1 gerçek düğümle kullan, ya kayit.json 'tipMuafiyetleri'ne gerekçesiyle ekle (dış-proje / OS-vadeli / A04-bekleyen). Sessiz doğum yasaktır: tanımlanan tip ya canlı kullanılır ya da muafiyeti gerekçesiyle beyan edilir.",
  },
  "fazsız-blok": {
    mesaj: (p) => `Blok "${a(p, "kod")}" bir Faz altında DEĞİL — Blok, Faz ile aynı hiyerarşide olamaz (Faz zaman dilimidir; Blok o dilimin içinde büyür).${p.neden ? ` \`planlanmamış\` beyanı ("${a(p, "neden")}") bir zaman bağı değildir ve hatayı kaldırmaz (MIM-1.2).` : ""}`,
    oneri: (p) => `İki meşru yol var: ① Blok'u yürürlükteki Faz'a bağla — Blok'a 'mevsim: FAZ-…' yaz YA DA Faz'ın dosyasına 'çağır ${a(p, "kod", "BLK-…")}' satırı ekle (bir bağ tek yerde yazılır); ② kendi Faz'ını aç ve Blok'u içine yaz — tarih verirsen (hedefTarih: "YYYY-AA-GG" ya da "YYYY-AA") vade takibi çalışır, veremiyorsan motor yalnız hatırlatır. Önceliklendirme bekleyen iş de bir Faza bağlanır; sıra Fazın tarihiyle ve Blok bağımlılığıyla ifade edilir.`,
  },
  "çift-mevsim-kaydı": {
    mesaj: (p) => `Blok "${a(p, "kod")}" mevsim bağını İKİ yerde yazıyor: hem ${b(p, "fazAltında") ? "bir Faz gövdesinin içinde" : "Faz'ın çağır listesinde"} hem kendi mevsim: alanında — bir bağ tek yerde yazılır.`,
    oneri: () => "Birini kaldır: Blok'un mevsim: alanı tercih edilir, faz.sar çağır listesi tarihli geçmiş dönemlere kalır.",
  },
  "planlanmamış-çelişki": {
    mesaj: (p) => `Blok "${a(p, "kod")}" planlanmamış beyanı taşıyor AMA altında geliştirmede Adım var ("${a(p, "başlayan")}") — iş başlamış, gövde hâlâ 'önceliklendirme bekliyor' diyor.`,
    oneri: () => "İkisinden biri doğru: iş gerçekten başladıysa planlanmamış: alanını kaldırıp Blok'u mevsime bağla (mevsim: FAZ-…); başlamadıysa Adım'ın durumunu beklemede'ye çek.",
  },
  "katmansız-adım": {
    mesaj: (p) => `Adım "${a(p, "adım")}" doğrudan Blok "${a(p, "blok")}" altında — arada Katman YOK. Blok, Katman olmadan Adım saramaz (Blok işi, Katman teknolojiyi söyler; Adım bir kademe altta yaşar).`,
    oneri: () => "Adım'ı bir Katman (ya da AltKatman) içine al: Blok { Katman(...) { Adım... } }.",
  },
  "yetim-meyve": {
    mesaj: (p) => `"${a(p, "yol")}" diskte yaşıyor ama hiçbir dosya:/üretir beyanına bağlı değil — kod plandan önde (planda karşılığı ilan edilmemiş).`,
    oneri: (p) => `Yapıştır-düzelt: Kod( kod: KOD-X, dosya: "${a(p, "yol")}", ne: "🍎 …" ) ilan et ve üreten Adım'a üretir: [ KOD-X ] kenarıyla bağla — ya da dosya gerçekten araçsa beyan haritasına (meyve-haritasi) ekle. ayrıntı: sarmal ogret uretir-kenari.`,
  },
  "doc-drift": {
    mesaj: (p) => `'${a(p, "adım")}' tamamlandı diyor ama meyvesi '${a(p, "meyve")}' (${a(p, "beyan")}) DİSKTE YOK — plan gerçeğin önünde: 'tamamlandı' diyor ama ürün ortada yok.`,
    oneri: (p) => `Ya meyveyi üret (${a(p, "beyan")}), ya Adım durumunu geriye çek, ya da meyve ilanının dosya: yolunu düzelt — plan gerçeği yansıtsın.`,
  },
  "katmansız-teknoloji": {
    mesaj: (p) => `Katman "${a(p, "kod")}" zemin bağı taşımıyor — Katman teknoloji dilimidir ve zeminini iki tip-saf kenardan en az biriyle beyan eder: takım: kenarı onu yürüten Takıma, kullanır: kenarı tek bir somut Teknolojiye yönelir.`,
    oneri: () => 'Önce takım: TAKIM-X yaz: Katmanı yürüten Takım kendi Teknolojilerine bağlıdır ve iki ekip ortaksa takım: [ TAKIM-X, TAKIM-Y ] yazılır. Takım yoksa kullanır: TEK-X ile tek bir somut Teknolojiye bağlan. Takım bağı kullanır: ile, Teknoloji bağı takım: ile yazılmaz. teknolojiBağımsız: "gerekçe" kaçışı yalnız projede henüz hiçbir Teknoloji ve Takım ilan edilmemişken, yani doğuş anında meşrudur ve zemin ilan edilince kaldırılır. İşin türü (karar, süreç, inceleme) Katmanın zemininde değil AltKatmanın departman: alanında yazılır.',
  },
  "yersiz-teknoloji-kaçışı": {
    mesaj: (p) => a(p, "hal") === "bağlı"
      ? `Katman "${a(p, "kod")}" zemin bağı taşıdığı hâlde teknolojiBağımsız kaçışını da taşıyor — kaçış gereksizdir ve okuyana Katmanın zeminsiz olduğunu söyleyerek yanıltır.`
      : `Katman "${a(p, "kod")}" teknolojiBağımsız kaçışı taşıyor, oysa projesi en az bir Teknoloji ya da Takım ilan etmiştir — kaçış yalnız doğuş anında, proje henüz hiçbir zemin ilan etmemişken meşrudur.`,
    oneri: (p) => a(p, "hal") === "bağlı"
      ? `teknolojiBağımsız satırını "${a(p, "kod")}" Katmanından kaldır; zemin bağı zaten takım: ya da kullanır: kenarıyla beyan edilmiştir.`
      : `"${a(p, "kod")}" Katmanını önce takım: TAKIM-X ile onu yürüten Takıma, Takım yoksa kullanır: TEK-X ile tek bir Teknolojiye bağla ve teknolojiBağımsız satırını kaldır. İşin türü (karar, süreç, inceleme) AltKatmanın departman: alanında yazılır. Katmanı susturmak için gerçekte onu yürütmeyen bir Takım uydurma; gerçek sahip belli değilse uyarı açık iş olarak kalsın.`,
  },
  "uygulanmamış-karar": {
    mesaj: (p) => `⚖️ Karar "${a(p, "kod")}" kilitli ve 'uygulama: gerekli' beyanlı AMA onu uygulayan hiçbir bağ yok — karar verilmiş, plana inmemiş; kilitli karar plana inmelidir.`,
    oneri: (p) => `Bir plan Adımı/Bloğu bu karara referans: [ ${a(p, "kod")} ] (ya da dayanak:/uygular:) ile bağlansın; uygulama gerçekten ertelendiyse uygulama: ertelendi + ertelemeGerekçesi: "neden" beyan et.`,
  },
  "diakritik-kayıp": {
    mesaj: (p) => `'${a(p, "ad")}' şapkasız yazılmış — Sarmal alanı '${a(p, "dogru")}'dur; şapkasız ad şema gözünde bilinmeyen alandır (değeri okunmaz, niyet sessizce kaybolur).`,
    oneri: (p) => `Alan adını '${a(p, "dogru")}:' olarak düzelt — alan adları Türkçe yazılır.`,
  },
  "normalizasyon-uyumsuz": {
    mesaj: () => "Dosya diskte NFD (ayrışık) Türkçe karakter içeriyor — motor girişte NFC'ye çevirir ama ham metin dış araçlarla (grep · diff · editör araması) uyuşmaz.",
    oneri: () => "Dosyayı NFC olarak yeniden kaydet — macOS kopyala-yapıştır ve bazı editörler NFD sızdırabilir.",
  },
  "beceri-drift": {
    mesaj: (p) => `Beceri "${a(p, "kod")}" anlattığı hedefe bağlanamıyor: '${a(p, "hedef")}' ${b(p, "kodHedefi") ? "hiçbir düğüme çözülmüyor" : "tanı sicilinde yok"} — öğreten kart, öğrettiği kuraldan kopmuş (bayat içerik riski).`,
    oneri: () => "Hedef yeniden adlandırıldıysa beyanı güncelle; kural/tanı kaldırıldıysa beceri kartını gözden geçir (öğretisi hâlâ geçerli mi?) — kopuk beyan silinmez, düzeltilir.",
  },
  "durumsuz-adım": {
    mesaj: (p) => `Adım "${a(p, "kod")}" durum: taşımıyor — motor onu açık-iş gündeminde GÖREMEZ (şema varsayılanı beklemede'dir ama tarayıcı örtük varsayılanı uygulamaz, iş sessizce kaybolur).`,
    oneri: () => "Adıma bir durum yaz ve değeri beklemede, geliştirmede ya da tamamlandı kiplerinden biri olsun; örtük varsayılana güvenme, çünkü durumu yazılmayan bir Adım gözden kolayca kaçar.",
  },
  "açık-adım": {
    mesaj: (p) => b(p, "özet")
      ? `🔵 ${a(p, "sayı")} adım BEKLEMEDE — planlamada normal (motor susmaz: tamamlandıkça sayı düşer). Örnek: ${a(p, "örnek")}${a(p, "artan", "")}`
      : `${a(p, "emoji")} AÇIK ADIM ('${a(p, "durum")}') "${a(p, "kod")}"${a(p, "neden", "") ? ` — neden rayda: ${a(p, "neden")}` : ""}. Motor bunu unutmuyor: tamamlandı olana dek gündemde kalır (motor susmaz).`,
    oneri: (p) => {
      if (b(p, "özet")) return "Sıradakini başlat (durum: geliştirmede) ya da gereksizi kaldır — beklemede yazıp unutmak plan yalanıdır. Aktif cephe (geliştirmede) ayrıntılı listede; tümü denetle-proje/panelde görünür.";
      return a(p, "durum") === "geliştirmede"
        ? "İşi BİTİR ve durum: tamamlandı yap (koni-dolu üretir/kabul ile) — ya da bilinçli beklemede'ye al; yarım bırakılan geliştirmede en sık unutulan drift'tir."
        : "Sıraya girince başlat (durum: geliştirmede) ya da gereksizse kaldır — beklemede etiketi yazıp unutmak plan yalanıdır; ertelenen iş sahipsiz borca dönüşemez.";
    },
  },
  "günsüz-tarih": {
    mesaj: (p) => `🗓️ AY BELİRTTİN: "${a(p, "kod")}" için hedefTarih "${a(p, "ayTarihi")}" — gün de belirtmek ister misin? Vade takibi şimdilik ayın son gününü (${a(p, "vade")}) esas alıyor.`,
    oneri: (p) => `İstersen hedefTarih: "${a(p, "ayTarihi")}-GG" biçimine tamamla; ay hassasiyeti de geçerli bir taahhüttür, gün zorunlu değildir.`,
  },
};

/** Önceki kanon tanılarının İngilizce ikinci hanesi. */
export const ONCEKI_TANI_METINLERI_EN: Readonly<Record<string, OncekiTaniMetni>> = {
  // ── Graph, rules and single-file validation (1–34) ───────────────────────
  "öz-bağımlılık": {
    mesaj: (p) => b(p, "dolaylı")
      ? `'${a(p, "kaynak")}' has ${a(p, "kenar")} target '${a(p, "hedef")}', which is its own container — expansion contains itself (indirect self-dependency).`
      : `'${a(p, "kaynak")}' points ${a(p, "kenar")} to itself — a job cannot precede itself, so ordering cannot construct this edge.`,
    oneri: (p) => `Remove the edge or write the actual predecessor's CODE; for a root job, use the explicit independent declaration: ${a(p, "kenar")}: [].`,
  },
  "kayıp-kenar": {
    mesaj: (p) => `'${a(p, "adım")}' references the fruit (${a(p, "hedef")}) of Adım '${a(p, "sahibi")}', but does NOT depend on it — was an edge omitted? Ordering cannot see this dependency.`,
    oneri: (p) => `If this is a real production-order dependency, add 'bağımlı: [ ${a(p, "sahibi")} ]'; if it is information-only, the explicit-independent declaration 'bağımlı: []' does not silence this warning — keep referans and evaluate the edge deliberately.`,
  },
  "durum-tutarsızlığı": {
    mesaj: (p) => `'${a(p, "kod")}' is complete, but predecessor '${a(p, "öncül")}' is ${a(p, "öncülDurumu")} — the job cannot finish before its predecessor.`,
    oneri: (p) => `If '${a(p, "öncül")}' is truly finished, set its status to tamamlandı; otherwise move '${a(p, "kod")}' back to geliştirmede so the plan reflects reality.`,
  },
  "kopuk-zincir": {
    mesaj: (p) => `The '${a(p, "kenar")}: ${a(p, "hedef")}' edge of node '${a(p, "kaynak")}' does NOT RESOLVE — the target is not defined in any .sar file, so the chain is broken and ordering cannot see this dependency.`,
    oneri: (p) => `Correct the target: if '${a(p, "hedef")}' is a typo, write the correct CODE; if the node does not yet exist, declare it first — a broken edge produces incorrect execution order.`,
  },
  "döngüsel-bağımlılık": {
    mesaj: (p) => `'${a(p, "kod")}' is in a dependency cycle — the chain cannot be ordered until the cycle is broken.`,
    oneri: (p) => `Break the cycle by removing one bağımlı/besler edge from the loop containing '${a(p, "kod")}'.`,
  },
  "geçersiz-renk": {
    mesaj: (p) => `Tema color "${a(p, "ad")}" is not valid hex: "${a(p, "deger")}".`,
    oneri: () => `A hex color is expected: #RGB or #RRGGBB (for example #1A1C1E).`,
  },
  "düşük-kontrast": {
    mesaj: (p) => `The contrast ratio between Tema colors "ana" and "nötr" is ${a(p, "oran")}:1 — below the WCAG AA threshold of 4.5:1.`,
    oneri: () => `Raise the contrast to at least 4.5:1 for readable text against its background by increasing the light-dark difference.`,
  },
  "rbac-yönetici-üretir": {
    mesaj: (p) => `Etmen "${a(p, "etmen")}": tür:yönetici cannot carry an 'üretir' edge; it manages the flow rather than producing work.`,
    oneri: () => "Delegate production to an expert Etmen; the manager only coordinates.",
  },
  "rbac-l5-paylaşık": {
    mesaj: (p) => `Etmen "${a(p, "etmen")}": yetki:L5 + bellek:paylaşık is an ERROR — the auditor must be isolated (ETERNAL).`,
    oneri: () => "Set bellek: izole to preserve the ETERNAL seal on L5 auditor independence.",
  },
  "rbac-l6-kalıcı": {
    mesaj: (p) => `Etmen "${a(p, "etmen")}": yetki:L6 cannot be assigned permanently; founder-proxy authority is exceptional and temporary.`,
    oneri: () => "Use L1–L5 for a permanent Etmen; L6 is only a temporary elevation.",
  },
  "rbac-apex-tekil": {
    mesaj: (p) => `${a(p, "sayı")} apex Etmen nodes were found — the apex must be UNIQUE, so a second apex is an error.`,
    oneri: () => "Keep one apex orchestrator and change the others to tür:yönetici or tür:uzman.",
  },
  "gateway-izin-biçim": {
    mesaj: (p) => {
      if (a(p, "kusur") === "biçim") return `Etmen "${a(p, "etmen")}": mcpİzinleri entry '${a(p, "ham")}' is malformed — 'MCP-KOD:mod' is expected.`;
      if (a(p, "kusur") === "mod") return `Etmen "${a(p, "etmen")}": mcpİzinleri entry '${a(p, "ham")}' has invalid mode '${a(p, "mod")}' — it must be \`oku\`, \`yaz\` or \`çağır\`.`;
      return `Etmen "${a(p, "etmen")}": mcpİzinleri names undefined tool '${a(p, "araç")}' — there is no matching MCP/Araç node.`;
    },
    oneri: (p) => {
      if (a(p, "kusur") === "biçim") return "Write each permission in the 'ARAÇ-KOD:mod' form, where the mode is one of `oku`, `yaz` and `çağır`.";
      if (a(p, "kusur") === "mod") return "Choose the mode from `oku`, `yaz` and `çağır`.";
      return "Declare the tool as an MCP/Araç widget or correct its CODE.";
    },
  },
  "katman-uyumsuz": {
    mesaj: (p) => {
      if (a(p, "kusur") === "niyet-koşullu") return `Kural "${a(p, "kod")}" is in the niyet layer but has a koşul — the intent layer CANNOT BE ENFORCED, and a condition is meaningful only in enforced layers.`;
      if (a(p, "kusur") === "katmansız") return `Kural "${a(p, "kod")}" has a condition but no layer declaration — who will enforce this rule is unclear.`;
      return `Kural "${a(p, "kod")}" has unknown layer "${a(p, "katman")}".`;
    },
    oneri: (p) => {
      if (a(p, "kusur") === "niyet-koşullu") return "If the condition is machine-enforced, change the layer to eşik or yapısal. Otherwise remove koşul; the ne text goes into the prompt.";
      if (a(p, "kusur") === "katmansız") return "Add `katman: yapısal` for graph enforcement by the checker, or `katman: eşik` for execution-time condition evaluation.";
      return "Valid layers are `yapısal` for graph enforcement by the checker, `eşik` for the condition engine, and `niyet` for unenforced prompt guidance.";
    },
  },
  "zorlanamayan-kural": {
    mesaj: (p) => `Kural "${a(p, "kod")}" declares the ${a(p, "katman")} layer but has no koşul, so the machine CANNOT ENFORCE it.`,
    oneri: () => "Add a condition (for example, `koşul: güven >= 0.7`) or make the layer niyet so the record honestly states who enforces it.",
  },
  "düzyazı-koşul": {
    mesaj: (p) => `Kural "${a(p, "kod")}" declares a machine-enforced layer (${a(p, "katman")}), but its condition is a free-form sentence — the engine cannot evaluate free-form prose, so the condition is not automatically ENFORCED.`,
    oneri: () => `If another engine audit already enforces this rule, the sentence may remain as a legitimate explanation of that audit. Otherwise, either convert the condition to the engine's expression language (for example karne.hata == 0) or set the layer to niyet, which means the rule is overseen by a human or agent rather than the machine.`,
  },
  "ebedi-ihlal": {
    mesaj: (p) => {
      if (a(p, "kusur") === "otorite") return `Kural "${a(p, "kod")}" carries ebedi: evet but its authority is "${a(p, "otorite")}" — the eternal flag is allowed ONLY on a constitutional rule.`;
      if (a(p, "kusur") === "arşiv") return `ETERNAL rule "${a(p, "kod")}" lives in the archive-sealed file "${a(p, "yol")}" — a file carrying an eternal rule cannot take the archive seal, because removing an eternal rule from the graph deletes it.`;
      if (a(p, "kusur") === "silinmiş") return `ETERNAL rule "${a(p, "kod")}" was DELETED — it exists in the seal but in no .sar file; deletion is also a change.`;
      return `ETERNAL rule "${a(p, "kod")}" was CHANGED — it diverges from the sealed definition; this rule is locked, even against its founder.`;
    },
    oneri: (p) => {
      if (a(p, "kusur") === "otorite") return "Either set otorite: anayasa and move the rule into the Anayasa body, or remove the ebedi flag.";
      if (a(p, "kusur") === "arşiv") return `Remove the archive seal, or move the eternal rule into a live source file before sealing this file. Example: \`git mv "${a(p, "yol")}" "${a(p, "canlı")}"\`.`;
      if (a(p, "kusur") === "silinmiş") return "Restore the rule; if removal is intentional, record the decision as a Karar and refresh the seal with 'sarmal kilitle'.";
      return "Revert the change. If it truly must change, restore the rule, record the constitutional decision as a Karar, and then reseal with 'sarmal kilitle' using the logged override required by FEL-4.";
    },
  },
  "koni-taşması": {
    mesaj: (p) => `Node "${a(p, "ad")}" (${a(p, "kimlik")}) receives ${a(p, "sayı")} rules (threshold: ${a(p, "eşik")}) — its context is overloaded because too many rules accumulate on one node.`,
    oneri: (p) => `Combine rules or narrow their scopes; the agent cannot carry ${a(p, "sayı")} rules at once without inflating its cone.`,
  },
  "ağırlık-toplamı": {
    mesaj: (p) => `The dimension weights of Değerlendirme "${a(p, "kimlik")}" total ${a(p, "toplam")}; they must total 1.00.`,
    oneri: () => "Adjust the weights to total 1.00; missing or excess weight silently distorts the score.",
  },
  "eşik-sırası": {
    mesaj: (p) => a(p, "kusur") === "sıra"
      ? `Değerlendirme "${a(p, "kimlik")}" has a broken threshold band: "${a(p, "ad")}: ${a(p, "deger")}" is not less than the previous value (${a(p, "onceki")}) — the band must decrease monotonically.`
      : `Değerlendirme "${a(p, "kimlik")}" threshold "${a(p, "ad")}: ${a(p, "deger")}" is outside the interval (0,1].`,
    oneri: (p) => a(p, "kusur") === "sıra"
      ? "Order the thresholds from largest to smallest (e.g. `kabul: 0.90` › `kabulNotlu: 0.75` › …); overlapping or gapped bands make the action ambiguous."
      : "Score thresholds must be greater than 0 and at most 1.",
  },
  "kural-çatışması": {
    mesaj: (p) => {
      if (a(p, "kusur") === "çelişki") return `"${a(p, "kod")}" conflicts with "${a(p, "öteki")}": ${a(p, "koşul")} and ${a(p, "ötekiKoşul")} CANNOT BOTH hold for "${a(p, "yol")}" because their scopes overlap at equal authority.`;
      if (a(p, "kusur") === "daraltmıyor") {
        return `"${a(p, "alt")}" (${a(p, "altOtorite")}) does NOT NARROW rule "${a(p, "üst")}" (${a(p, "üstOtorite")}) on "${a(p, "yol")}" — ` +
          `range ${a(p, "altKoşul")} does not remain inside ${a(p, "üstKoşul")}, so it loosens or contradicts it. ` +
          `Lower authority may only narrow an upper rule: its range stays within the upper range and cannot widen it.`;
      }
      return `"${a(p, "kod")}" is defined TWICE with different bodies (lines ${a(p, "birinci")} and ${a(p, "ikinci")}) — one concept now has two bodies, so the machine cannot know which to follow.`;
    },
    oneri: (p) => {
      if (a(p, "kusur") === "çelişki") return "Correct one rule or separate their authority levels (anayasa > politika > tercih); a conflict at equal authority cannot be resolved.";
      if (a(p, "kusur") === "daraltmıyor") return `TIGHTEN the condition of "${a(p, "alt")}" so it stays inside the upper rule, or change the upper rule; there is no silent winner.`;
      return "Keep one definition; remove the duplicate or assign it a different CODE if it represents a different concept. The old system once defined RBAC differently in two modules without revealing the conflict.";
    },
  },
  "birleşim-çatışması": {
    mesaj: (p) => {
      const detay = a(p, "kusur") === "daraltmıyor"
        ? `lower authority "${a(p, "alt")}" (${a(p, "altOtorite")}) does not narrow upper rule "${a(p, "üst")}" (${a(p, "üstOtorite")})`
        : "authority is equal and the ranges are disjoint, so both cannot hold";
      return `⊥ Constraints "${a(p, "kod")}" and "${a(p, "öteki")}" applied to node "${a(p, "kimlik")}" do NOT INTERSECT on "${a(p, "yol")}" (${detay}): ${a(p, "koşul")} ∧ ${a(p, "ötekiKoşul")} = logical bottom.`;
    },
    oneri: () => "Move one rule's condition into a compatible range or remove one uygular binding; a conflict cannot be resolved silently, and the specification cannot lie.",
  },
  "kural-ihlali": {
    mesaj: (p) => {
      switch (a(p, "kusur")) {
        case "giriş-ayrıştırılamıyor":
          return `The entry file (${a(p, "dosya")}) is marked intentionally invalid and CANNOT BE PARSED, so it cannot be audited; the entry file is the project's source of truth and cannot remain broken.`;
        case "ad-kuralı":
          return `'${a(p, "yol")}' violates the naming rule — it must use lowercase ASCII with no spaces, diacritics or uppercase letters, and underscores as separators.`;
        case "girişsiz-dizin":
          // BKM-DNT-A13: İngilizce yüz de yalnız ÖLÇÜLENİ iddia eder ve `--ana`
          // bayrağını anar; çeviri nöbeti artık cümlenin NE İDDİA ETTİĞİNİ ölçer,
          // dolayısıyla bu daldan kap iddiasına dönmek kapıdan geçemez.
          if (b(p, "disBeyan") && a(p, "hedef", "dizin") === "dizin") {
            return `'${a(p, "dizin")}' is a directory, whereas \`--ana\` expects the entry declaration itself, that is a single FILE path, so with a non-file path the read never began.`;
          }
          switch (a(p, "hedef", "dizin")) {
            case "dosya":
              return `'${a(p, "dizin")}' is a file rather than a directory; a project audit looks for the entry file inside a directory, so with a non-directory path the search never began.`;
            case "yok":
              return `'${a(p, "dizin")}' was not found on disk, so the audit stopped: it cannot look for an entry file inside a path that does not exist.`;
            default:
              return `The directory '${a(p, "dizin")}' has no entry file — every project begins with one. The expected name is \`<project>_anadizin.sar\`; the legacy \`ana.sar\` is also recognized.`;
          }
        default:
          return `The node "${a(p, "ad")}" (${a(p, "kimlik")}) violates a rule: ${a(p, "ihlal", `Kural "${a(p, "kod")}" was violated`)} [Kural: ${a(p, "kod")}]`;
      }
    },
    oneri: (p) => {
      switch (a(p, "kusur")) {
        case "giriş-ayrıştırılamıyor":
          return "Correct the entry file's syntax or remove its intentionally-invalid pragma; that exemption is for fixtures, not entry files.";
        case "ad-kuralı":
          return `Rename '${a(p, "ad")}' to '${a(p, "onerilen")}'.`;
        case "girişsiz-dizin":
          if (b(p, "disBeyan")) {
            switch (a(p, "hedef", "dizin")) {
              case "dizin":
                return "`--ana` expects a FILE, not a directory: give the entry declaration's own path (`--ana <project>_anadizin.sar`). To run over a directory, omit the flag entirely; the audit then finds the entry file inside the directory itself.";
              case "yok":
                return "The path you gave to `--ana` is not on disk: correct the spelling or drop the flag. Without the flag the audit looks for the entry file inside the directory by pattern (`<project>_anadizin.sar`).";
              default:
                return "The file you gave to `--ana` is not an entry declaration; make sure it carries the hierarchy, shelf and technology declarations, or drop the flag.";
            }
          }
          switch (a(p, "hedef", "dizin")) {
            case "dosya":
              return "Run the project audit on the directory that contains the file (`sarmal denetle <directory>`); to audit that single file instead, hand it straight to the engine (`sarmal <input.sar>`), because single-file auditing is a separate mode.";
            case "yok":
              return "Correct the path or supply an existing project directory; the audit can only run over a directory that is present on disk.";
            default:
              return "Write the entry file first (e.g. `myproject_anadizin.sar`); hierarchy, shelves and technologies are declared there under Structure First.";
          }
        default:
          return `The koşul of the Kural does not hold on this node: ${a(p, "koşul")}.`;
      }
    },
  },
  "zorlanamayan-koşul": {
    mesaj: (p) => `The condition of Kural "${a(p, "kod")}" could not be evaluated on ANY of the ${a(p, "kapsamda")} nodes in scope (indeterminate)${b(p, "eşik") ? " — it is a threshold condition enforced during execution" : " — it cannot pass silently"}.`,
    oneri: () => "Check the field path in the condition; `düğüm.alan`, the derived `.uzunluk` and Kural-argument substitution are supported.",
  },
  "mühürsüz-ebedi": {
    mesaj: (p) => `Eternal rule "${a(p, "kod")}" is unsealed, so a change to it would go unnoticed.`,
    oneri: () => "Seal it with sarmal kilitle <dizin>; every later change becomes an ebedi-ihlal.",
  },
  "çıplak-adımlı-katman": {
    mesaj: (p) => b(p, "özet")
      ? `${a(p, "sayı")} Katman nodes directly contain their Adım nodes; the recommended structure groups them into topic modules (AltKatman), so that every Katman holds an AltKatman and every AltKatman holds its own Adım nodes. Example: ${a(p, "örnekler")}${s(p, "sayı") > 3 ? " …" : ""}`
      : "This Katman directly contains Adım nodes; the recommended structure groups work items into topic modules (AltKatman), so that the Katman holds an AltKatman and the AltKatman holds its own Adım nodes.",
    oneri: (p) => b(p, "özet")
      ? "You can group Adım nodes into AltKatman modules by topic; per-file auditing shows the individual detail."
      : "You can group Adım nodes by topic into AltKatman() modules; each AltKatman is a topic branch, and its Adım nodes live beneath it.",
  },
  "mühür-kırık": {
    mesaj: (p) => `Sealed reference "çağır ${a(p, "hedef")}" is BROKEN — the target's current seal is ${a(p, "güncel")} while the pinned seal is ${a(p, "pin")}; the target changed silently.`,
    oneri: (p) => `If the target change is INTENTIONAL, update the pin to @mühür:${a(p, "güncel")} with its FEL-4 decision trail; otherwise restore the target to its sealed state.`,
  },
  "sahipsiz-belge": {
    mesaj: () => 'There is no node below the "///" document comment — a document block attaches to the node immediately below it; without that node the document is orphaned and appears on no surface.',
    oneri: () => 'Move the block immediately above the opening line of the node it belongs to; if it is a free note with no owner node, turn it into a "//" line comment.',
  },
  "halefsiz-revize": {
    mesaj: (p) => `Karar "${a(p, "kod")}" is stamped revize but names no successor — who updated the ruling?`,
    oneri: () => "Add halef: K-nn for the decision that updates the ruling; under the HZL-B01 stamp-plus-successor model, a revision without a successor is a blind stamp.",
  },
  "öneksiz-blok": {
    mesaj: (p) => `Blok code "${a(p, "kod")}" does not contain BLK, so its type cannot be read from its panel or ledger identity.`,
    oneri: () => "Give the code a BLK- prefix (e.g. BLK-SEF); migrate references with it so the identity is readable at a glance.",
  },
  "yinelenen-parametre": {
    mesaj: (p) => `"${a(p, "alan")}" is written a second time on this node — the engine reads the FIRST value and silently ignores this row.`,
    oneri: (p) => `Remove one of the two "${a(p, "alan")}" rows; the first is on line ${a(p, "ilkSatır")}. A field has one home, and a second spelling plants future drift.`,
  },
  "gayrimeşru-geçiş": {
    mesaj: (p) => a(p, "kusur") === "kanıtsız"
      ? `The latest run is sealed COMPLETED without evidence, but durum is "tamamlandı" — work without evidence cannot be declared finished, so this promotion appears to have been written behind the engine.`
      : `The latest run is sealed BLOCKED, but durum is "tamamlandı" — blocked work CANNOT BE DECLARED finished, so this transition appears to have been written behind the engine.`,
    oneri: (p) => a(p, "kusur") === "kanıtsız"
      ? "Rerun the work so it produces evidence; an evidence-backed VERIFIED seal writes both the run record and 'tamamlandı' itself. Without evidence, return the status to doğrulanmamış."
      : "If the blockage is truly resolved, first add a new run/decision record so koşu is current, then write tamamlandı; otherwise return the status to bloklu.",
  },
  "doğrulanamayan-tanı-iddiası": {
    mesaj: (p) => `Kural claims "tanı: ${a(p, "kod")}", but no such gate exists in the engine's diagnostic registry, so its “in the engine” claim cannot be verified.`,
    oneri: () => "If the gate really exists, add it to cekirdek/src/tani-sicili.ts, whose guard scans the source; otherwise remove the claim and let the rule live honestly at katman:niyet.",
  },
  "dayanaksız-kural": {
    mesaj: (p) => b(p, "özet")
      ? `⚖️ ${a(p, "sayı")} rules in this file lack a \`dayanak:\` edge (${d(p, "adlar").slice(0, 4).join(" · ")}${d(p, "adlar").length > 4 ? ` · +${d(p, "adlar").length - 4} more` : ""}) — mentioning a decision in prose is not a structural binding; the edge is written during set-matching.`
      : `⚖️ Kural "${a(p, "kod")}" is not yet connected to the Karar that created it through a machine-readable \`dayanak:\` edge — K-XX in prose is only a mention.`,
    oneri: (p) => b(p, "özet")
      ? "Add `dayanak: K-nn` to every rule to state which decision created it; if the lack of a basis is intentional, declare it with its rationale."
      : `Verify the originating Karar, which must say it created this rule; then write \`dayanak: K-XX\` for one decision or \`dayanak: [ K-XX, … ]\` for several. If no originating decision exists, declare it explicitly as \`dayanaksız: "<reason>"\`.`,
  },
  "aile-geçersiz": {
    mesaj: (p) => `"Tip ${a(p, "ad")}" was placed in unknown family "${a(p, "aile")}".`,
    oneri: (p) => `Valid families are: ${d(p, "aileler").join(" · ")}.`,
  },
  // ── Fields, reminders, structure and references (35–67) ─────────────────
  "tarif-eksik": {
    mesaj: (p) => `Type "${a(p, "ad")}" has no description — its 'ne:' field is empty, so the AI writing the code cannot understand this concept.`,
    oneri: () => 'Add this to the body: ne: "<what this concept is, in one sentence>".',
  },
  "ad-biçimi": {
    mesaj: (p) => a(p, "kusur") === "parametre"
      ? `A parameter name must start with a lowercase letter: "${a(p, "ad")}".`
      : `A type name must start with an uppercase letter: "${a(p, "ad")}".`,
    oneri: (p) => a(p, "kusur") === "parametre"
      ? `Write "${a(p, "onerilen")}" — parameter names start with a lowercase letter.`
      : `Write "${a(p, "onerilen")}" — type names start with an uppercase letter and parameter names start with a lowercase letter.`,
  },
  "kod-ilk-değil": {
    mesaj: (p) => `For "${a(p, "ad")}", 'kod' is parameter ${a(p, "sıra")} — 'kod' must always come FIRST so identity is immediately readable.`,
    oneri: () => "Move the 'kod:' parameter to the beginning of the parentheses.",
  },
  "belge-yanlış-düğüm": {
    mesaj: (p) => `"${a(p, "ad")}" (${a(p, "kimlik")}) appears to lack documentation, BUT its child "${a(p, "çocukAd")}" (${a(p, "çocukKimlik")}) carries a document block — the document is attached to the WRONG node. A document comes immediately before its node; placing it inside attaches it to the first child.`,
    oneri: (p) => `Move the document block IMMEDIATELY BEFORE the opening line of "${a(p, "ad")}" (-->| ## ${d(p, "bölümler").join(" · ## ")} |<-- then ${a(p, "ad")}( … )), not inside its { } body.`,
  },
  "geçersiz-enum": {
    mesaj: (p) => `"${a(p, "ad")}" (${a(p, "kimlik")}) — unknown value for "${a(p, "alan")}": "${a(p, "deger")}".`,
    oneri: (p) => `Valid values are: ${d(p, "izinli").join(" · ")}.`,
  },
  "geçersiz-tür": {
    mesaj: (p) => `"${a(p, "ad")}" (${a(p, "kimlik")}) — field "${a(p, "alan")}" ${yc(p, "en")}: "${a(p, "deger")}".`,
    oneri: (p) => `This field must have the \`${a(p, "tür")}\` type.`,
  },
  "eksik-alan": {
    mesaj: (p) => b(p, "enAzBiri")
      ? `"${a(p, "ad")}" (${a(p, "kimlik")}) must carry at least one surface: ${a(p, "secenekler")}.`
      : `"${a(p, "ad")}" (${a(p, "kimlik")}) is missing required fields: ${d(p, "eksikler").map(eksikAdi(p, "en")).join(" · ")}.`,
    oneri: (p) => b(p, "enAzBiri")
      ? "Provide one of these groups in full."
      : `These fields are required for ${a(p, "ad")}.`,
  },
  "ham-renk": {
    mesaj: (p) => `"${a(p, "ad")}" (${a(p, "kimlik")}) — "${a(p, "alan")}" contains raw hex "${a(p, "deger")}". Color intent is expressed by ROLE, while its VALUE lives in the technology theme.`,
    oneri: () => "Use a Tema role (`birincil` · `ikincil` · `vurgu` · `hata` · `yüzey` · `arkaplan` · `nötr`; canon: `temaRolleri.renk`), and move the hex value to the technology theme named by the Tema's `dosya:` declaration.",
  },
  "açık-hatırlatıcı": {
    mesaj: (p) => b(p, "özet")
      ? `🔔 ${a(p, "sayı")} open/decided reminders (❗${a(p, "açık")} open · ➡️${a(p, "kararlaşmış")} decided) — all are visible in one summary. Example: ${a(p, "örnek")}${s(p, "sayı") > 3 ? " …" : ""}`
      : `❗ Open reminder (${a(p, "kimlik")}): ${a(p, "ne", "")}`,
    oneri: (p) => b(p, "özet")
      ? "When a target activates, the reminder arrives automatically with its cone in the 🔔 Reminders panel; after a decision write `durum: kararlaştı` and `hatırlat: ADIM-KOD`, and when finished write `tamamlandı`. Inspect one with `sarmal gezin <HTR-…>`."
      : "When the target activates, the reminder arrives automatically with its cone. After a decision write durum: kararlaştı + hatırlat: ADIM-KOD so it enters the chain; when finished write tamamlandı.",
  },
  "kararlaşmış-hatırlatıcı": {
    mesaj: (p) => `❗➡️ Decided reminder (${a(p, "kimlik")})${p["hedef"] ? ` — Adım in the chain: ${a(p, "hedef")}` : " — NO TARGET (not in the chain!)"}: ${a(p, "ne", "")}`,
    oneri: () => "There are three valid paths. First, add the work to an existing Adım. Second, open a new Adım between existing work. Third, if the target is already complete, update the code IMMEDIATELY so that Sarmal realigns the chain. When the work finishes in the chain, write durum: tamamlandı.",
  },
  "politika-dayanaksız": {
    mesaj: (p) => `⚓ Politika (${a(p, "kimlik")}) rests on no decision — which Karar created this policy?`,
    oneri: () => 'Add dayanak: "K-nn" to connect it to the Karar record and keep the decision trail traceable.',
  },
  "beceri-terfisi": {
    mesaj: (p) => `🟡 Bellek lesson awaiting promotion (${a(p, "kimlik")}): ${a(p, "ne", "")}`,
    oneri: () => "Turn this lesson into a Beceri (skill), connect it to an edge (Etmen/Adım), then write terfi: tamamlandı.",
  },
  "geliştirmede-çapa": {
    mesaj: (p) => `🚧 In development (${a(p, "kimlik")}): ${a(p, "ne", "")}`,
    oneri: () => "This row is not an error; it marks active work on this Adım. When the work is finished, set durum: tamamlandı from the roadmap checkbox or this file.",
  },
  "bloklu-çapa": {
    mesaj: (p) => `⛔ Blocked (${a(p, "kimlik")}): ${a(p, "ne", "")} — the orchestrator run sealed this Adım as bloklu because its acceptance criterion was not met.`,
    oneri: () => "Resolve the findings in the koşu: record and rerun the Adım; when the run is accepted, its status becomes tamamlandı.",
  },
  "doğrulanmamış-çapa": {
    mesaj: (p) => `🟠 Unverified (${a(p, "kimlik")}): ${a(p, "ne", "")} — the work was delivered, but independent evidence in the run registry does not yet exist.`,
    oneri: () => "Rerun it so the run produces evidence; a registry-backed VERIFIED seal writes 'tamamlandı' itself, while a handwritten 'tamamlandı' is rejected immediately.",
  },
  "geçersiz-durum": {
    mesaj: (p) => `"Adım" (${a(p, "kimlik")}) has unknown durum "${a(p, "deger")}".`,
    oneri: () => "Valid values are: beklemede · geliştirmede · tamamlandı · doğrulanmamış · bloklu.",
  },
  "bilinmeyen-tip": {
    mesaj: (p) => `There is no type named "${a(p, "ad")}".`,
    oneri: (p) => p["yakin"]
      ? `Did you mean "${a(p, "yakin")}"? (See valid types with sarmal siniflama. Define your own type with Tip ${a(p, "ad")}( ... ).)`
      : `See valid types with sarmal siniflama. Define your own type with Tip ${a(p, "ad")}( ... ).`,
  },
  "derin-dal": {
    mesaj: () => "The AltKatman chain exceeds three levels — this branch is at least four levels deep. Is that depth necessary?",
    oneri: () => "If it is necessary, keep it; information carries no penalty. Otherwise move the innermost AltKatman's Adım nodes upward to simplify the structure.",
  },
  "izinsiz-sarma": {
    mesaj: (p) => {
      const e = a(p, "ebeveyn"), c = a(p, "çocuk");
      switch (a(p, "kusur")) {
        case "ilan-dışı":
          return `Placement is not permitted: "${c}" cannot be inside "${e}" according to the Tip declaration. Declared children are: ${d(p, "izinli").join(" · ")}.`;
        case "ilansız-yaprak":
          return `Placement is not permitted: "${e}" declares no içerir, so it is treated as a leaf and cannot wrap a child. Add «içerir: [${c}]» to its declaration.`;
        case "yüzey-dışı":
          return `Placement is not permitted: surface-layout widget "${e}" wraps only surface widgets, and "${c}" is not a surface.`;
        case "yaprak":
          return `Placement is not permitted: "${e}" is a leaf (Metin/Düğme/Görsel/İkon) and cannot wrap a child widget.`;
        case "sarmaz":
          return `Placement is not permitted: "${e}" does not wrap child widgets.`;
        default:
          return `Placement is not permitted: "${c}" cannot be inside "${e}". Permitted children are: ${d(p, "izinli").join(" · ")}.`;
      }
    },
    oneri: (p) => {
      if (a(p, "çocuk") === "Mekanizma") {
        return "Do not embed Mekanizma in a plan — move it to the top-level ortak/mekanizma shelf; an Adım that uses it references it with 'bağımlı: MEK-…', so it is declared once and bound from anywhere.";
      }
      const ebeveynler = [...d(p, "ebeveynler"), ...(b(p, "yuzeyDuzeni") ? [ORTAK_TANI_METINLERI_EN.yuzeyDuzeniEbeveyni({})] : [])];
      return ebeveynler.length ? `"${a(p, "çocuk")}" belongs under: ${ebeveynler.join(" · ")}.` : undefined;
    },
  },
  "beyansız-yapı": {
    mesaj: (p) => `'${a(p, "ad")}/' exists on disk but is not declared in ${a(p, "giriş")} — every created directory must be declared in the entry file, because undeclared structure drifts away from the plan over time.`,
    oneri: (p) => `Add this to ${a(p, "giriş")}: Kitaplık( kod: KTP-…, yol: "${a(p, "ad")}/", ne: "…" ) — or remove the directory.`,
  },
  "ilansız-gövde": {
    mesaj: (p) => {
      const ornek = d(p, "örnekler").join(", ");
      const artan = s(p, "artan") > 0 ? ` and ${s(p, "artan")} more file(s)` : "";
      return b(p, "kök")
        ? `${a(p, "sayı")} undeclared source file(s) live directly at the workspace root (${ornek}${artan}). The root declares the directory tree; it does not hold bodies, so ${a(p, "giriş")} knows nothing about these files and they drift away from the plan over time.`
        : `'${a(p, "yer")}/' is a library, and a library holds shelves; yet ${a(p, "sayı")} undeclared source file(s) live directly inside it (${ornek}${artan}). The library's declaration does not cover these bodies, because a library is declared to hold shelves only.`;
    },
    oneri: (p) => b(p, "kök")
      ? `Declare a shelf in ${a(p, "giriş")} to hold these bodies and move the files there; a bare Raf is never written directly under the root, because a shelf lives INSIDE a Kitaplık. Example: \`Kitaplık( kod: KTP-…, yol: "…/", ne: "<what this library collects>" ) { Raf( kod: RAF-…, yol: "…/", ne: "<what this shelf collects>" ) }\`. If a body does not belong to this tree, move it outside; the engine will not write the declaration for you, because deciding which shelf a body belongs to is a statement of intent.`
      : `Declare a shelf INSIDE the library to hold these bodies and move the files there; a shelf path is RELATIVE to its library, so do not repeat the library name in it. Example: \`Kitaplık( kod: KTP-…, yol: "${a(p, "yer")}/" ) { Raf( kod: RAF-…, yol: "…/", ne: "<what this shelf collects>" ) }\`. If a body belongs elsewhere, move it out of the library; the engine will not write the declaration for you, because deciding which shelf a body belongs to is a statement of intent.`,
  },
  "teknolojisiz-yüzey": {
    mesaj: (p) => `${a(p, "yüzey")} is declared, but the project has selected no technology — a screen or endpoint cannot be born before technology is selected.`,
    oneri: () => 'First create a Takım at the root (e.g. `Takım( kod: TAKIM-ONYUZ, ne: "front-end stack", bağımlı: [ FLUTTER ] )`); the template is `sarmal başla proje`.',
  },
  "yer-uyuşmazlığı": {
    mesaj: (p) => `'${a(p, "kod")}' is not in its canonical location: it should be '${a(p, "beklenen")}', but on disk it is '${a(p, "gerçek")}'.`,
    oneri: (p) => `Move the file from '${a(p, "gerçek")}' to its canonical location '${a(p, "beklenen")}'. The code is law and the directory mirrors it; under FEL-3, file structure derives from the declaration.`,
  },
  "harf-farkı": {
    mesaj: (p) => `'${a(p, "yol")}' is declared, but the only matching ${a(p, "tür")} on disk differs in letter case — macOS treats them as equal while Linux reports “file not found,” causing a cross-platform break.`,
    oneri: () => "Make the on-disk name exactly match the declaration with git mv; on macOS a case-only rename may require two steps.",
  },
  "kayıp-yapı": {
    mesaj: (p) => p["diskte"] === undefined
      ? `'${a(p, "yol")}' is declared in ana.sar but does not exist on disk.`
      : `'${a(p, "yol")}' is declared as ${a(p, "tür")}, but on disk it is ${a(p, "diskte")}.`,
    oneri: (p) => p["diskte"] === undefined
      ? "Generate it with the scaffolder: sarmal <ana.sar> --iskelet <hedef> — or remove the declaration."
      : "Make the on-disk type match the declaration, or correct the declaration.",
  },
  "bildirilmemiş-dosya": {
    mesaj: (p) => `'${a(p, "yol")}' exists on disk but is not declared in ana.sar; it is an orphan ${a(p, "tür")}.`,
    oneri: () => "Declare it in the entry file; if it is a standard toolchain trace such as config, scaffold or generated output, declare it under its owning technology with `ayakizi:`; if it is not part of the backbone, move it outside or remove it.",
  },
  "doğuş-eksik": {
    mesaj: (p) => `Plan node "${a(p, "plan")}" exists, but the project's founding skeleton is not visible in this file — there is neither a çağır bridge to an entry file nor a Teknoloji/Takım binding, so the plan may be written against a project whose foundation has not been laid.`,
    oneri: () => "First declare `<project>_anadizin.sar` together with a Teknoloji or Takım (template: `sarmal başla`) and connect the plan's Adım nodes to the Takım with `bağımlı:`; in a project with an anadizin, audit the whole with `sarmal denetle <directory>`.",
  },
  "doğuş-sırası": {
    mesaj: (p) => `The project contains plan node '${a(p, "plan")}', but no file declares a TECHNOLOGY backbone: there is neither a Teknoloji or Takım declaration nor a çağır bridge reaching one. A bare Proje root in the anadizin does not count as a backbone, because a project whose technology is undeclared cannot say which stack its plan will run on. The founding order is technology first, plan second.`,
    oneri: () => "First declare `<project>_anadizin.sar` together with a Teknoloji or Takım (template: `sarmal başla`), then bind the plan's Adım nodes to the Takım. In a project with an anadizin, audit the whole with `sarmal denetle <root>`, not the fragment alone.",
  },
  "olgunluk-onayı": {
    mesaj: (p) => `🔒 The plan appears mature (${a(p, "adımSayısı")} cone-complete Adım nodes and coding has NOT started) — this is the transition from planning to coding. Obtain HUMAN MATURITY APPROVAL (“the plan is ready, we can start coding”) before coding. The engine reminds you; it does not block you.`,
    oneri: () => "Review the plan one last time: is the cone complete, is the audit clean, and are Teknoloji versions locked? Then obtain human approval and begin coding by giving the first Adım to ŞEF. Coding on an immature plan ends in divergence from that plan.",
  },
  "ad-ayracı": {
    mesaj: (p) => `The filename contains a hyphen ('${a(p, "ad")}'); Sarmal filenames use underscores as separators.`,
    oneri: (p) => `Rename it to ${a(p, "onerilen")} together with its references.`,
  },
  "kenar-metin": {
    mesaj: (p) => a(p, "kusur") === "kapsayıcı-alan"
      ? `'${a(p, "kenar")}' is an EDGE and requires a CODE, but text was found: "${a(p, "metin", "")}". What is the CODE of the node you depend on?`
      : `'${a(p, "kenar")}' is an EDGE and requires a CODE, but text was found: "${a(p, "metin", "")}". A quoted target does not resolve, so no binding is formed.`,
    oneri: (p) => a(p, "kusur") === "kapsayıcı-alan"
      ? `Write ${a(p, "kenar")}: [CODE] so the engine can follow it in the DAG; move narrative to sınır/görev. Paste-fix: if the target is not yet declared, first declare its node (e.g. \`Kod( kod: KOD-X, dosya: "path/to/file.ts", ne: "🍎 …" )\`), then write ${a(p, "kenar")}: [ KOD-X ]. Details: sarmal ogret uretir-kenari.`
      : `Remove the quotation marks (${a(p, "kenar")}: ${a(p, "onerilenHedef")}) so the target is a real node CODE; move narrative to sınır/görev. Paste-fix for a file path: first declare Kod( kod: KOD-X, dosya: "path/to/file.ts", ne: "🍎 …" ), then write ${a(p, "kenar")}: [ KOD-X ]. Details: sarmal ogret uretir-kenari.`,
  },
  "kırık-referans": {
    mesaj: (p) => {
      switch (a(p, "kusur")) {
        case "meyve": return `The fruit '${"üretir"}: ${a(p, "hedef")}' is not declared anywhere.`;
        case "ileri-bağlama": return `Target 'hatırlat: ${a(p, "hedef")}' has not yet been born; this is a forward binding.`;
        case "çağır": return `'çağır ${a(p, "hedef")}' does not resolve — this CODE is not defined in any .sar file.`;
        case "ad-alanı-kırık": return `Target '${p.kenar ? `${a(p, "kenar")}: ` : "çağır "}${a(p, "hedef")}' is GENUINELY broken — the namespace '${a(p, "adAlani")}' resolved, but the local CODE is not declared within that Proje.`;
        case "ad-alanı-ölçülemez": return `Target '${p.kenar ? `${a(p, "kenar")}: ` : "çağır "}${a(p, "hedef")}' CANNOT BE MEASURED from this root — the namespace '${a(p, "adAlani")}' is neither a loaded Proje code nor a sibling root declared by the workspace; the reference was not counted as broken, it was left EXEMPT.`;
        default: return `Target '${a(p, "kenar")}: ${a(p, "hedef")}' does not resolve — this CODE is not defined in any .sar file.`;
      }
    },
    oneri: (p) => {
      switch (a(p, "kusur")) {
        case "meyve": return `You may declare a Meyve 🍎 node for '${a(p, "hedef")}' to make it traceable.`;
        case "ileri-bağlama": return "It will connect automatically when the target Adım is born; you may declare it now instead.";
        case "ad-alanı-kırık": return `Verify '${a(p, "hedef")}' in the sibling root: correct the CODE or declare the target in that Proje; definitions in archive- or later-sealed files are not read (MIM-3.4).`;
        case "ad-alanı-ölçülemez": return `The exemption is reported so it does not stay silent: run the audit from the workspace root, or declare the '${a(p, "adAlani")}' root as a Kitaplık in the workspace declaration; the target is then genuinely verified.`;
        default: return `Add the .sar containing the definition of '${a(p, "hedef")}' to the project, or correct the CODE.`;
      }
    },
  },
  "karşılıksız-metin-atfı": {
    mesaj: (p) => `'${a(p, "kod")}' is written like a code but is not defined in any .sar file — the ${b(p, "belgede") ? "document" : "code comment"} refers to an unresolved identity.`,
    oneri: (p) => `If '${a(p, "kod")}' is still active, declare its definition; if it was renamed, update the text; if the text describes history, this stale reference is natural.`,
  },
  // ── Execution graph, planning and remaining guards (68–100) ─────────────
  "kırık-halef": {
    mesaj: (p) => `Karar "${a(p, "kod")}" is marked revize and names "${a(p, "halef")}" as its halef, but no such Karar is defined; the reference is unresolved.`,
    oneri: () => "Correct the halef: value to the real Karar CODE that updates the ruling, or remove the revize stamp.",
  },
  "halef-döngü": {
    mesaj: (p) => `The successor chain of Karar "${a(p, "kod")}" forms a CYCLE, because it walks through ${d(p, "zincir").join(", ")} and returns to where it began, so the current ruling is ambiguous.`,
    oneri: () => "The chain must END at a decision that remains in force and is not revize; remove the extra halef stamp or point it to the correct successor.",
  },
  "yinelenen-kod": {
    mesaj: (p) => `CODE "${a(p, "kod")}" is defined ${a(p, "sayı")} times within the same entity (${d(p, "dosyalar").join(" · ")}) — identity must be UNIQUE inside an entity.`,
    oneri: () => "Keep one owner and connect other use sites with `çağır KOD`. The same name in a separate entity is not a collision; the boundary is the entity, not the scan scope.",
  },
  "kırık-koşar": {
    mesaj: (p) => `The koşar target '${a(p, "hedef")}' of "Döngü" (${a(p, "kimlik")}) is not declared anywhere, so this loop cannot run.`,
    oneri: (p) => `Declare the target Adım (kod: ${a(p, "hedef")}) or remove it from the list; the runner currently runs only Adım nodes.`,
  },
  "durunca-sözlüğü": {
    mesaj: (p) => `The durunca condition of "Döngü" (${a(p, "kimlik")}) is not in the runner's recognized dictionary: "${a(p, "koşul")}" — the runner cannot evaluate it.`,
    oneri: () => "Recognized patterns are: karne.hata == 0 · karne.uyari <= N · durum(CODE) == tamamlandı.",
  },
  "kapsayıcı-kenar": {
    mesaj: (p) => `'${a(p, "ad")}' is a CONTAINER — edge ${a(p, "kenar")} is declared only on an Adım; container order is calculated from its children.`,
    oneri: () => "Move the edge down to the relevant Adım; its target may be a container, as bağımlı: [BLOK-KODU] expands to leaves. Only a Katman's Takım/Teknoloji binding is permitted here.",
  },
  "yanlış-alan": {
    mesaj: () => "The edge that carries a CODE list is named 'bağımlı'; there is no field named 'bağımlılık', because order is calculated from the bağımlı edge.",
    oneri: () => "Rename the field to `bağımlı:` so the list enters the DAG through that edge.",
  },
  "gizli-bağımlılık": {
    mesaj: (p) => `Resolvable CODEs are hidden inside the prose field 'bağımlılık': ${d(p, "gizli").join(", ")} — the engine CANNOT FOLLOW this binding in the dependency graph. Dependencies are mechanical and declared as edges.`,
    oneri: (p) => `Convert them into the bağımlı: [${d(p, "gizli").join(", ")}] edge and move the remaining narrative to sınır/görev.`,
  },
  "bağımlılık-mekanik": {
    mesaj: () => "A dependency does not express intent; it is mechanical. What is the code of the node you depend on?",
    oneri: () => "Write bağımlı: [CODE]. If there is no code, this is not a dependency; move the narrative to sınır or görev.",
  },
  "tek-çocuk-kapsayıcı": {
    mesaj: (p) => a(p, "kusur") === "tek-katman"
      ? "This Faz carries a single Katman that is not wrapped in a Blok body. A Katman is the technology slice of a work body; the Blok level between Faz and Katman cannot be skipped (MIM-1)."
      : "This Faz, a time slice, carries a single Blok. This is not a defect and the Faz cannot be skipped, because no Blok lives without a Faz (MIM-1.2); the observation only invites you to review the Faz scope.",
    oneri: (p) => a(p, "kusur") === "tek-katman"
      ? "Wrap the Katman in a Blok body. Example: `Faz( kod: FAZ-… ) { Blok( kod: BLK-… ) { Katman( kod: KAT-… ) { … } } }`."
      : "If the Faz really carries a single work body, leave it as it is; if the period has other work, write it as new Blok nodes inside the same Faz body. Do not remove the Faz and lift the Blok to the root: a Blok without a Faz raises the `fazsız-blok` error.",
  },
  "rafsız-anadizin": {
    mesaj: (p) => `Root '${a(p, "kök")}' DECLARES NO directory structure; it has no \`raflar:\` map and no Kitaplık or Raf node. Structure is declared first, otherwise the location of every generated file becomes a GUESS.`,
    oneri: () => 'Add a shelf declaration to the root (`raflar: { docs: "<description>" }` or Kitaplık and Raf nodes); the template is `sarmal başla proje`. Declare the target structure now even during an early plan-only stage.',
  },
  "anadizin-plan-karışması": {
    mesaj: (p) => `Anadizin root '${a(p, "kök")}' directly contains plan node '${a(p, "bulunan")}'. An anadizin draws ARCHITECTURE and carries the Kitaplık, Raf and yol declarations, while the plan, which descends from Faz through Blok and Katman down to Adım, lives in a SEPARATE .sar file on the plan shelf inside the \`is/\` Kitaplık, that is under \`is/plan/\`. The founding rule draws architecture first and grows the plan separately.`,
    oneri: () => 'Move plan nodes into a separate .sar under is/plan/; declare the shelf INSIDE a Kitaplık, because a bare Raf is never written directly under the root (Kitaplık( kod: KTP-IS, yol: "is/" ) { Raf( kod: RAF-PLAN, yol: "plan/" ) }). The template is `sarmal başla proje`.',
  },
  "kavuşumsuz-paralellik": {
    mesaj: (p) => `'${a(p, "kod")}' (${d(p, "takımlar").join("+")}) DIRECTLY depends on Adım '${a(p, "hedef")}' from another team (${d(p, "hedefTakımları").join("+")}) — front and back are chained and cannot run in parallel; convergence must occur through Sözleşme.`,
    oneri: (p) => `Declare a shared Sözleşme (SZL-…); let '${a(p, "hedef")}' produce/reference it and bind '${a(p, "kod")}' to it. This removes the direct Adım edge so both sides can run in parallel under the contract-first approach.`,
  },
  "silo-blok": {
    mesaj: (p) => `Blok '${a(p, "kod")}' contains only a ${b(p, "önyüz") ? "front-end (yuzey)" : "back-end (arkayuz)"} node, without its opposite face or security — this is a silo, not a vertical slice. Front end, back end and security converge in one Blok.`,
    oneri: (p) => b(p, "önyüz")
      ? "Add a back-end node (Uç or Servis) and a security node (Güvenlik or Mekanizma) to the Blok, then establish the convergence between Ekran and Uç through Sözleşme so that the Blok becomes a vertical slice. If the Blok is intentionally single-faced, add a separate Katman note or a proje-soul note."
      : "Add a front-end node (Ekran or Form) and a security node (Güvenlik or Mekanizma) to the Blok, then establish the convergence between Ekran and Uç through Sözleşme so that the Blok becomes a vertical slice. If the Blok is intentionally single-faced, add a proje-soul note.",
  },
  "kavuşumsuz-dilim": {
    mesaj: (p) => `Blok '${a(p, "kod")}' contains both surface '${a(p, "önyüz")}' and back-end '${a(p, "arkayüz")}', but there is NO CONVERGENCE between them — this vertical slice has both faces, but they are not connected.`,
    oneri: (p) => `Converge the surface and the back end. The first path is a direct binding: connect '${a(p, "önyüz")}' to '${a(p, "arkayüz")}' with a çağırır or kullanır edge. The second path is contract-first: declare a shared Sözleşme, let '${a(p, "arkayüz")}' produce it as SZL-… and let '${a(p, "önyüz")}' reference it. Let both faces meet at Sözleşme.`,
  },
  "bilinmeyen-kapsam": {
    mesaj: (p) => `The scope of Kural "${a(p, "kod")}" does not resolve: "${a(p, "kapsam")}" is neither a family, a type nor a defined CODE — this rule has the EMPTY SET as its scope and applies to no node.`,
    oneri: (p) => `Valid selectors are the wildcard genel, a family name (e.g. \`yuzey\` · \`plan\` · \`etmen\`), a type name (e.g. \`Tema\`), or one CODE. Families are: ${d(p, "aileler").join(" · ")}.`,
  },
  "boş-kapsam": {
    mesaj: (p) => `Kural "${a(p, "kod")}" has a structural condition, but its scope "${a(p, "kapsam")}" matches NO node in the workspace — the condition will never run and dies silently.`,
    oneri: () => "Point the scope at a real target, or move the rule to katman: niyet until the target nodes are born so the record stays honest about who enforces it.",
  },
  "kullanımsız-tip": {
    mesaj: (p) => `Tip "${a(p, "ad")}" (${a(p, "aile")}) is defined in the canon but never used in the LIVE garden, and no exemption is declared — it may be a format that was written but never applied.`,
    oneri: () => "Either use it with at least one real node in your garden or add it to kayit.json 'tipMuafiyetleri' with a rationale (dış-proje / OS-vadeli / A04-bekleyen). Silent birth is forbidden: a defined type is used live or carries a reasoned exemption.",
  },
  "fazsız-blok": {
    mesaj: (p) => `Blok "${a(p, "kod")}" is NOT under a Faz — a Blok cannot share the same hierarchy level as a Faz, because the Faz is a time slice within which the Blok grows.${p.neden ? ` The \`planlanmamış\` declaration ("${a(p, "neden")}") is not a time binding and does not lift the error (MIM-1.2).` : ""}`,
    oneri: (p) => `There are two valid paths: ① bind the Blok to the current Faz by writing 'mevsim: FAZ-…' on the Blok OR adding 'çağır ${a(p, "kod", "BLK-…")}' to the Faz file, with one binding written in one place; ② open its own Faz and place the Blok inside — if you provide hedefTarih: "YYYY-AA-GG" or "YYYY-AA", deadline tracking runs, and otherwise the engine only reminds you. Work awaiting prioritization is bound to a Faz as well; its order is expressed through the Faz date and Blok dependencies.`,
  },
  "çift-mevsim-kaydı": {
    mesaj: (p) => `Blok "${a(p, "kod")}" writes its mevsim binding in TWO places: both ${b(p, "fazAltında") ? "inside a Faz body" : "in the Faz's çağır list"} and in its own mevsim: field. One binding is written in one place.`,
    oneri: () => "Remove one. Prefer the Blok's mevsim: field, while the faz.sar çağır list remains for dated historical periods.",
  },
  "planlanmamış-çelişki": {
    mesaj: (p) => `Blok "${a(p, "kod")}" carries a planlanmamış declaration BUT contains Adım "${a(p, "başlayan")}" in geliştirmede — work has started while the trunk still says it awaits prioritization.`,
    oneri: () => "Choose the true state: if work has started, remove planlanmamış: and bind the Blok to a season with mevsim: FAZ-…; otherwise move the Adım back to beklemede.",
  },
  "katmansız-adım": {
    mesaj: (p) => `Adım "${a(p, "adım")}" sits directly under Blok "${a(p, "blok")}" with NO Katman between them. A Blok cannot wrap an Adım without a Katman: the Blok states the work, the Katman states the technology, and the Adım lives one level below.`,
    oneri: () => "Place the Adım inside a Katman or AltKatman: Blok { Katman(...) { Adım... } }.",
  },
  "yetim-meyve": {
    mesaj: (p) => `"${a(p, "yol")}" exists on disk but is connected to no dosya:/üretir declaration — code is ahead of the plan because its counterpart was never declared.`,
    oneri: (p) => `Paste-fix: declare Kod( kod: KOD-X, dosya: "${a(p, "yol")}", ne: "🍎 …" ) and bind it to the producing Adım with üretir: [ KOD-X ]; if the file is truly tooling, add it to the declaration map (meyve-haritasi). Details: sarmal ogret uretir-kenari.`,
  },
  "doc-drift": {
    mesaj: (p) => `'${a(p, "adım")}' says tamamlandı, but its fruit '${a(p, "meyve")}' (${a(p, "beyan")}) is NOT ON DISK — the plan is ahead of reality, claiming completion without a product.`,
    oneri: (p) => `Either produce the fruit (${a(p, "beyan")}), move the Adım status backward, or correct the fruit declaration's dosya: path so the plan reflects reality.`,
  },
  "katmansız-teknoloji": {
    mesaj: (p) => `Katman "${a(p, "kod")}" has no ground binding — a Katman is a technology slice and declares its ground with at least one of two type-pure edges: takım: points at the Takım that runs it, kullanır: points at one concrete Teknoloji.`,
    oneri: () => 'First write takım: TAKIM-X: the Takım that runs the layer depends on its own Teknoloji nodes, and when two teams share the work write takım: [ TAKIM-X, TAKIM-Y ]. If there is no Takım, bind to one concrete Teknoloji with kullanır: TEK-X. A Takım is never bound with kullanır: and a Teknoloji is never bound with takım:. The teknolojiBağımsız: "<rationale>" escape is valid only while the project has not yet declared any Teknoloji or Takım, that is at the moment of birth, and it is removed once a ground is declared. The kind of work (decision, process, review) is written in the departman: field of the AltKatman, not in the ground of the Katman.',
  },
  "yersiz-teknoloji-kaçışı": {
    mesaj: (p) => a(p, "hal") === "bağlı"
      ? `Katman "${a(p, "kod")}" carries a ground binding and still carries the teknolojiBağımsız escape — the escape is redundant and misleads the reader into thinking the layer has no ground.`
      : `Katman "${a(p, "kod")}" carries the teknolojiBağımsız escape, but its project has declared at least one Teknoloji or Takım — the escape is valid only at the moment of birth, while the project has not yet declared any ground.`,
    oneri: (p) => a(p, "hal") === "bağlı"
      ? `Remove the teknolojiBağımsız line from the "${a(p, "kod")}" layer; its ground is already declared with a takım: or kullanır: edge.`
      : `Bind the "${a(p, "kod")}" layer first with takım: TAKIM-X to the Takım that runs it, or, if there is no Takım, with kullanır: TEK-X to one Teknoloji, and remove the teknolojiBağımsız line. The kind of work (decision, process, review) is written in the departman: field of the AltKatman. Do not invent a Takım that does not actually run the layer just to silence it; if the real owner is not known, let the warning stay as open work.`,
  },
  "uygulanmamış-karar": {
    mesaj: (p) => `⚖️ Karar "${a(p, "kod")}" is locked and declares 'uygulama: gerekli', BUT no binding implements it — the decision was made but never reached the plan; a locked decision must flow into the plan.`,
    oneri: (p) => `Connect a plan Adım/Blok to this decision with referans: [ ${a(p, "kod")} ] or dayanak:/uygular:. If implementation is truly deferred, declare uygulama: ertelendi + ertelemeGerekçesi: "neden".`,
  },
  "diakritik-kayıp": {
    mesaj: (p) => `'${a(p, "ad")}' is written without its circumflex — the Sarmal field is '${a(p, "dogru")}'; without the mark, the schema sees an unknown field, does not read its value, and silently loses the intent.`,
    oneri: (p) => `Correct the field name to '${a(p, "dogru")}:' — field names are written in Turkish.`,
  },
  "normalizasyon-uyumsuz": {
    mesaj: () => "The file contains decomposed NFD Turkish characters on disk — the engine converts them to NFC on input, but raw text does not match in external tools such as grep, diff and editor search.",
    oneri: () => "Save the file again as NFC; macOS copy-paste and some editors can introduce NFD.",
  },
  "beceri-drift": {
    mesaj: (p) => `Beceri "${a(p, "kod")}" cannot bind to the target it teaches: '${a(p, "hedef")}' ${b(p, "kodHedefi") ? "does not resolve to any node" : "is absent from the diagnostic registry"} — the teaching card has detached from its rule and may be stale.`,
    oneri: () => "If the target was renamed, update the declaration; if the rule or diagnostic was removed, review whether the Beceri's teaching remains valid. A broken declaration is corrected, not silently deleted.",
  },
  "durumsuz-adım": {
    mesaj: (p) => `Adım "${a(p, "kod")}" carries no durum: field, so the engine CANNOT SEE it in the open-work agenda. The schema default is beklemede, but the scanner does not apply an implicit default, and the work silently disappears.`,
    oneri: () => "Declare a durum on the Adım and let its value be one of beklemede, geliştirmede and tamamlandı. Do not rely on an implicit default, because an Adım with no written status is easily overlooked.",
  },
  "açık-adım": {
    mesaj: (p) => b(p, "özet")
      ? `🔵 ${a(p, "sayı")} Adım nodes are in \`beklemede\` — normal during planning; the engine does not fall silent, and the count drops as they complete. Example: ${a(p, "örnek")}${a(p, "artan", "")}`
      : `${a(p, "emoji")} Open Adım ('${a(p, "durum")}') "${a(p, "kod")}"${a(p, "neden", "") ? ` — why it remains on track: ${a(p, "neden")}` : ""}. The engine does not forget it: it remains on the agenda until tamamlandı.`,
    oneri: (p) => {
      if (b(p, "özet")) return "Start the next item with durum: geliştirmede or remove work that is no longer needed; writing beklemede and forgetting it makes the plan untrue. The active front is shown in the detailed list, and all items appear in denetle-proje/panel.";
      return a(p, "durum") === "geliştirmede"
        ? "FINISH the work and set durum: tamamlandı with cone-complete üretir/kabul, or deliberately return it to beklemede. Half-finished work left in geliştirmede is the most frequently forgotten drift."
        : "When it reaches the front of the queue, start it with durum: geliştirmede; if it is unnecessary, remove it. A forgotten beklemede label makes the plan untrue, and deferred work cannot become ownerless debt.";
    },
  },
  "günsüz-tarih": {
    mesaj: (p) => `🗓️ YOU SPECIFIED A MONTH: hedefTarih for "${a(p, "kod")}" is "${a(p, "ayTarihi")}" — would you like to specify a day as well? Deadline tracking currently uses the last day of the month (${a(p, "vade")}).`,
    oneri: (p) => `If you wish, complete it as hedefTarih: "${a(p, "ayTarihi")}-GG"; month precision is also a valid commitment, so the day is optional.`,
  },
};


// ═══════════════════════════════════════════════════════════════════════════
// ÇALIŞMA ALANI KÖKÜ KAPILARININ METİNLERİ (ikiz nöbeti)
//
//   Bu katalog, varlık denetiminin DIŞINDA duran kök kapılarının cümlelerini
//   taşır. Metinler burada yaşar çünkü kullanıcı onları okur ve çevrilmeleri
//   gerekir; tek çeviri kaynağı bu dosyadır ve kural cümlenin nerede yaşadığı
//   üzerinedir, hangi kapının bastığı üzerine değildir.
//
//   ÖLÇÜLEN YÜZ CÜMLEYE YAZILIR. Nöbet iki kipte çalışır: çalışma ağacı yüzü ile
//   deponun sahnelenmiş yüzü. Aynı kimlik iki yüzü de bildirebildiği için cümle
//   hangi yüzün ölçüldüğünü açıkça söylemek zorundadır; söylemeseydi sahnelenmiş
//   yüzdeki bir ayrışmayı okuyan kullanıcı diskteki dosyaları karşılaştırır, hiçbir
//   fark bulamaz ve raporu yanlış sanardı. Dallanma `sahne` bayrağıyla yapılır.
// ═══════════════════════════════════════════════════════════════════════════

/** Ölçülen yüzün adı — cümlenin hangi soruya cevap verdiğini okuyucuya söyler. */
const ikizYuzAdi = (p: TaniBaglami): string => (b(p, "sahne") ? "sahnelenmiş yüz" : "çalışma ağacı");

export const IKIZ_NOBET_METINLERI: Readonly<Record<string, OncekiTaniMetni>> = {
  "ikiz-ayrışması": {
    mesaj: (p) => b(p, "özet")
      ? `İkiz ayrışması (${ikizYuzAdi(p)}) — '${a(p, "çıpaYol")}' ile '${a(p, "karşıYol")}' arasında toplam ${s(p, "toplam")} satır ayrışıyor; ilk ${s(p, "gösterilen")} tanesi yukarıda adresiyle listelendi, kalan ${s(p, "toplam") - s(p, "gösterilen")} satır bu özet satırının arkasında saklıdır.`
      : `İkiz ayrışması (${ikizYuzAdi(p)}) — '${a(p, "çıpaYol")}' ile '${a(p, "karşıYol")}' ${s(p, "satırNo")}. satırda ayrılıyor: '${a(p, "çıpaYol")}' dosyası ${ikizSatirYuzu(p, "çıpa", "(satır yok — dosya burada bitiyor)", "(boş satır)")} taşırken '${a(p, "karşıYol")}' dosyası ${ikizSatirYuzu(p, "karşı", "(satır yok — dosya burada bitiyor)", "(boş satır)")} taşıyor.`,
    oneri: (p) => b(p, "özet")
      ? (b(p, "sahne")
        ? `Farkın tamamını deponun sahnelenmiş yüzünde karşılaştır; diskteki dosyalar özdeş görünebilir. Örnek: \`diff <(git show :./'${a(p, "çıpaYol")}') <(git show :./'${a(p, "karşıYol")}')\``
        : `Farkın tamamını görmek için iki dosyayı karşılaştır. Örnek: \`diff '${a(p, "çıpaYol")}' '${a(p, "karşıYol")}'\``)
      : (b(p, "sahne")
        ? `Ayrışma deponun SAHNELENMİŞ yüzündedir; diskteki iki dosya özdeş olsa bile bu işleme depoya ayrışmış bir ikiz yazar. En sık nedeni, iki dosyaya da yapılan değişikliğin yalnız birinin sahnelenmesidir — küresel yok sayma kuralı yüzünden her ikiz ayrı ayrı \`git add -f\` ister. İki yüzü elle eşitle, sonra ikisini birden sahnele. Örnek: \`git add -f '${a(p, "çıpaYol")}' '${a(p, "karşıYol")}'\`. Küme gerekçesi: ${a(p, "gerekçe")}`
        : `Motor hangi yüzün doğru olduğunu bilemez ve kopyalamaz; iki dosyayı elle eşitle. Doğru olan yüzü seçtikten sonra örnek: \`cp '${a(p, "çıpaYol")}' '${a(p, "karşıYol")}'\` ya da ters yön. Küme gerekçesi: ${a(p, "gerekçe")}`),
  },
  "ikiz-eksik-dosya": {
    mesaj: (p) => b(p, "sahne")
      ? `İkiz kümesi '${a(p, "kümeAdı")}' üyesi '${a(p, "yol")}' deponun sahnelenmiş yüzünde bulunamadı; dosya diskte duruyor olabilir, fakat bu işleme onu depoya yazmayacaktır ve ikizin bir yüzü tarihte hiç doğmayacaktır.`
      : `İkiz kümesi '${a(p, "kümeAdı")}' üyesi '${a(p, "yol")}' diskte bulunamadı; eksik ikiz, ayrışmanın en uç hâlidir çünkü metnin bir yüzü hiç yoktur.`,
    oneri: (p) => b(p, "sahne")
      ? `Dosyayı depoya ekle ya da kaydını ikiz listesinden düşür. Küresel yok sayma kuralı en olası nedendir. Örnek: \`git check-ignore -v '${a(p, "yol")}'\` çalıştır, dosya yok sayılıyorsa \`git add -f '${a(p, "yol")}'\` ile zorla sahnele.`
      : `Dosyayı yerine koy ya da kaydını ikiz listesinden düşür. Dosya diskte duruyor fakat depoda görünmüyorsa küresel yok sayma kuralını denetle. Örnek: \`git check-ignore -v '${a(p, "yol")}'\` çalıştır, dosya yok sayılıyorsa \`git add -f '${a(p, "yol")}'\` ile zorla ekle.`,
  },
  "ikiz-tekil": {
    mesaj: (p) => `İkiz kümesi '${a(p, "kümeAdı")}' tek dosya taşıyor; bir dosya kendisiyle ayrışamayacağı için nöbet bu kümede hiçbir şey korumuyor.`,
    oneri: (p) => `Kümeye ikinci dosyayı ekle ya da kümeyi ikiz listesinden düşür. Örnek: '${a(p, "kümeAdı")}' kümesinin dosya listesine ikizin adını yaz.`,
  },

};

/** English face name — same branch, so both languages tell which face was measured. */
const ikizYuzAdiEn = (p: TaniBaglami): string => (b(p, "sahne") ? "staged face" : "working tree");

export const IKIZ_NOBET_METINLERI_EN: Readonly<Record<string, OncekiTaniMetni>> = {
  "ikiz-ayrışması": {
    mesaj: (p) => b(p, "özet")
      ? `Twin divergence (${ikizYuzAdiEn(p)}) — '${a(p, "çıpaYol")}' and '${a(p, "karşıYol")}' differ on ${s(p, "toplam")} lines in total; the first ${s(p, "gösterilen")} are listed above with their addresses, and the remaining ${s(p, "toplam") - s(p, "gösterilen")} lines stand behind this summary line.`
      : `Twin divergence (${ikizYuzAdiEn(p)}) — '${a(p, "çıpaYol")}' and '${a(p, "karşıYol")}' differ on line ${s(p, "satırNo")}: '${a(p, "çıpaYol")}' carries ${ikizSatirYuzu(p, "çıpa", "(no such line — the file ends here)", "(empty line)")} while '${a(p, "karşıYol")}' carries ${ikizSatirYuzu(p, "karşı", "(no such line — the file ends here)", "(empty line)")}.`,
    oneri: (p) => b(p, "özet")
      ? (b(p, "sahne")
        ? `Compare the whole difference on the staged face; the files on disk may look identical. Example: \`diff <(git show :./'${a(p, "çıpaYol")}') <(git show :./'${a(p, "karşıYol")}')\``
        : `Compare the two files to see the whole difference. Example: \`diff '${a(p, "çıpaYol")}' '${a(p, "karşıYol")}'\``)
      : (b(p, "sahne")
        ? `The divergence lives on the STAGED face; even if the two files on disk are identical, this commit would write a diverged twin into the repository. The most frequent cause is staging only one of two edited twins — the global ignore rule forces a separate \`git add -f\` per twin. Synchronise the two faces by hand, then stage both together. Example: \`git add -f '${a(p, "çıpaYol")}' '${a(p, "karşıYol")}'\`. Set rationale: ${a(p, "gerekçe")}`
        : `The engine cannot know which face is correct and will not copy; synchronise the two files by hand. Once you have chosen the correct face, example: \`cp '${a(p, "çıpaYol")}' '${a(p, "karşıYol")}'\` or the reverse direction. Set rationale: ${a(p, "gerekçe")}`),
  },
  "ikiz-eksik-dosya": {
    mesaj: (p) => b(p, "sahne")
      ? `Member '${a(p, "yol")}' of twin set '${a(p, "kümeAdı")}' was not found on the staged face of the repository; the file may well sit on disk, yet this commit will not write it, so one face of the twin would never be born in history.`
      : `Member '${a(p, "yol")}' of twin set '${a(p, "kümeAdı")}' was not found on disk; a missing twin is the most extreme form of divergence, because one face of the text does not exist at all.`,
    oneri: (p) => b(p, "sahne")
      ? `Add the file to the repository or drop its entry from the twin list. The global ignore rule is the likeliest cause. Example: run \`git check-ignore -v '${a(p, "yol")}'\`, and if it is ignored stage it forcibly with \`git add -f '${a(p, "yol")}'\`.`
      : `Restore the file or drop its entry from the twin list. If the file is on disk but invisible to the repository, inspect the global ignore rule. Example: run \`git check-ignore -v '${a(p, "yol")}'\`, and if it is ignored add it forcibly with \`git add -f '${a(p, "yol")}'\`.`,
  },
  "ikiz-tekil": {
    mesaj: (p) => `Twin set '${a(p, "kümeAdı")}' carries a single file; since a file cannot diverge from itself, the guard protects nothing in this set.`,
    oneri: (p) => `Add the second file to the set or drop the set from the twin list. Example: write the twin's name into the file list of set '${a(p, "kümeAdı")}'.`,
  },

};

/**
 * Kök kapısının bulgusunu kurar: cümleyi ikiz nöbeti kataloğundan alır, düzeyi
 * çağıran kapı seçer. Üretici yalnız olguyu ve konumu verir; cümle kurmaz.
 * Kimliği olmayan bir metin sessizce boş cümleye düşmesin diye katalogsuz kimlik
 * hata fırlatır — motor uydurma metin basmaz.
 */
export function ikizTanisi(
  kod: string,
  duzey: Duzey,
  baglam: TaniBaglami,
  konum: { satir?: number; sutun?: number },
  dil: CiktiDili = "tr",
): Tani {
  const haneler = {
    tr: { mesaj: IKIZ_NOBET_METINLERI[kod]?.mesaj(baglam), oneri: IKIZ_NOBET_METINLERI[kod]?.oneri?.(baglam) },
    en: { mesaj: IKIZ_NOBET_METINLERI_EN[kod]?.mesaj(baglam), oneri: IKIZ_NOBET_METINLERI_EN[kod]?.oneri?.(baglam) },
  };
  if (!haneler.tr.mesaj || !haneler.en.mesaj) throw new Error(`Tanı metni yok: ${kod}`);
  const metin = dilHanesi(haneler, dil);
  return {
    duzey,
    kod,
    mesaj: metin.mesaj,
    satir: konum.satir ?? 0,
    sutun: konum.sutun ?? 0,
    ...(metin.oneri === undefined ? {} : { oneri: metin.oneri }),
    dilMetinleri: {
      tr: { mesaj: haneler.tr.mesaj, ...(haneler.tr.oneri === undefined ? {} : { oneri: haneler.tr.oneri }) },
      en: { mesaj: haneler.en.mesaj, ...(haneler.en.oneri === undefined ? {} : { oneri: haneler.en.oneri }) },
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// KÖK YÜZEYİ NÖBETİNİN METİNLERİ (KYN-MTR-A04)
//
//   Kök yüzeyi nöbeti de çalışma alanı kökünde çalışan bir kapıdır ve bulguları
//   hiçbir varlığın karnesine yazılmaz; bu yüzden kimlikleri varlık siciline
//   girmez ve cümleleri ikiz nöbetinin yanında, kendi kataloğunda yaşar. Katalog
//   ayrı tutulur çünkü iki kapı ayrı sorular sorar: ikiz nöbeti iki dosyanın
//   özdeşliğini, kök yüzeyi nöbeti ise bir dosyanın dış dünyaya söylediği
//   kimliklerin hâlâ karşılığı olup olmadığını ölçer.
//
//   ÖNERİ CÜMLESİ DÜZELTMEYİ DAYATMAZ. Karşılıksız bir atfın üç meşru sebebi
//   olabilir: kimlik hâlâ yaşıyordur ve ilanı eksiktir, adı değişmiştir, ya da
//   metin bilinçli olarak geçmişi anlatmaktadır. Cümle üç ihtimali de söyler ve
//   kararı okuyana bırakır, çünkü nöbetin işi metni onarmak değil bulguyu
//   görünür kılmaktır.
// ═══════════════════════════════════════════════════════════════════════════

export const KOK_YUZEYI_METINLERI: Readonly<Record<string, OncekiTaniMetni>> = {
  "kök-yüzeyi-karşılıksız-atıf": {
    mesaj: (p) => `Kök yüzeyi '${a(p, "yol")}' içinde '${a(p, "kod")}' bir kimlik gibi yazılmış, fakat bu kimlik açık aracın hiçbir kaynağında tanımlı değil; deponun dünyaya bakan yüzü okuyucuyu bulunmayan bir adrese gönderiyor.`,
    oneri: (p) => `'${a(p, "kod")}' hâlâ yaşıyorsa tanımını ilan et; adı değiştiyse kök yüzeyindeki metni yeni adla güncelle; metin bilinçli olarak geçmişi anlatıyorsa kimliği anmak yerine olayı anlat, çünkü kök yüzeyi bir tarihçe değil bugünün tanıtımıdır.`,
  },
  "kök-yüzeyi-eksik-dosya": {
    mesaj: (p) => `İlan edilmiş kök yüzeyi '${a(p, "yol")}' diskte bulunamadı; ilan ile disk ayrıştığı için bu yüzey hiç ölçülemiyor.`,
    oneri: (p) => `Dosyayı yerine koy ya da kaydını kök yüzeyi listesinden düşür. Listedeki gerekçesi şudur: ${a(p, "ne")}.`,
  },
  "kök-yüzeyi-beyansız": {
    mesaj: (p) => `Çalışma alanı kökünde '${a(p, "yol")}' dosyası duruyor, fakat bu dosya ne kök yüzeyi olarak ne de kapsam dışı olarak ilan edilmiş; ilansız yapı zamanla nöbetin görüş alanından sessizce düşer.`,
    oneri: (p) => `'${a(p, "yol")}' dosyası bizim kimliklerimizi anlatıyorsa kök yüzeyi listesine ekle; dış dünyaya ait standart bir belgeyse kapsam dışı listesine gerekçesiyle yaz.`,
  },
  "kök-yüzeyi-evrensiz": {
    mesaj: (p) => `Kök yüzeyi nöbetinin atıf evreni olarak ilan edilen '${a(p, "evren")}' dizini bulunamadı; evren okunamadığı için hiçbir kimlik çözülemez ve nöbet yeşil veremez.`,
    oneri: (p) => `Nöbeti çalışma alanının kökünden koştur ya da '${a(p, "evren")}' dizininin yerinde olduğunu doğrula. Evren adı kaynakta ilan edilir; yerleşim gerçekten değiştiyse ilan da bilinçli olarak güncellenmelidir.`,
  },
};

export const KOK_YUZEYI_METINLERI_EN: Readonly<Record<string, OncekiTaniMetni>> = {
  "kök-yüzeyi-karşılıksız-atıf": {
    mesaj: (p) => `In root surface '${a(p, "yol")}', '${a(p, "kod")}' is written like an identity, yet no source of the open tool defines it; the face the repository shows to the world sends its reader to an address that does not exist.`,
    oneri: (p) => `If '${a(p, "kod")}' is still alive, declare its definition; if it was renamed, update the root surface text with the new name; if the sentence deliberately describes history, narrate the event instead of naming the identity, because a root surface is today's introduction rather than a chronicle.`,
  },
  "kök-yüzeyi-eksik-dosya": {
    mesaj: (p) => `Declared root surface '${a(p, "yol")}' was not found on disk; declaration and disk have diverged, so this surface cannot be measured at all.`,
    oneri: (p) => `Restore the file or drop its entry from the root surface list. The rationale recorded in the list is: ${a(p, "ne")}.`,
  },
  "kök-yüzeyi-beyansız": {
    mesaj: (p) => `File '${a(p, "yol")}' sits at the workspace root, yet it is declared neither as a root surface nor as being out of scope; undeclared structure quietly falls out of the guard's view over time.`,
    oneri: (p) => `If '${a(p, "yol")}' speaks about our identities, add it to the root surface list; if it is a standard document belonging to the outside world, record it in the out-of-scope list together with its rationale.`,
  },
  "kök-yüzeyi-evrensiz": {
    mesaj: (p) => `The directory '${a(p, "evren")}', declared as the reference universe of the root surface guard, was not found; no identity can be resolved while the universe is unreadable, so the guard cannot report green.`,
    oneri: (p) => `Run the guard from the workspace root, or verify that the '${a(p, "evren")}' directory is in place. The name of the universe is declared in the source; if the layout has genuinely changed, the declaration must be updated deliberately as well.`,
  },
};

/**
 * Kök yüzeyi kapısının bulgusunu kurar: cümleyi kendi kataloğundan alır, düzeyi
 * çağıran kapı seçer. İkiz nöbetinin kurucusuyla aynı sözleşmeyi taşır ve aynı
 * gerekçeyle katalogsuz kimlikte hata fırlatır — motor uydurma metin basmaz.
 */
export function kokYuzeyiTanisi(
  kod: string,
  duzey: Duzey,
  baglam: TaniBaglami,
  konum: { satir?: number; sutun?: number },
  dil: CiktiDili = "tr",
): Tani {
  const haneler = {
    tr: { mesaj: KOK_YUZEYI_METINLERI[kod]?.mesaj(baglam), oneri: KOK_YUZEYI_METINLERI[kod]?.oneri?.(baglam) },
    en: { mesaj: KOK_YUZEYI_METINLERI_EN[kod]?.mesaj(baglam), oneri: KOK_YUZEYI_METINLERI_EN[kod]?.oneri?.(baglam) },
  };
  if (!haneler.tr.mesaj || !haneler.en.mesaj) throw new Error(`Tanı metni yok: ${kod}`);
  const metin = dilHanesi(haneler, dil);
  return {
    duzey,
    kod,
    mesaj: metin.mesaj,
    satir: konum.satir ?? 0,
    sutun: konum.sutun ?? 0,
    ...(metin.oneri === undefined ? {} : { oneri: metin.oneri }),
    dilMetinleri: {
      tr: { mesaj: haneler.tr.mesaj, ...(haneler.tr.oneri === undefined ? {} : { oneri: haneler.tr.oneri }) },
      en: { mesaj: haneler.en.mesaj, ...(haneler.en.oneri === undefined ? {} : { oneri: haneler.en.oneri }) },
    },
  };
}

/**
 * KOD ÜSTÜ ORTAK CÜMLELER — tek bir tanı kimliğine ait olmayan, gösterim
 * katmanının konuştuğu metinler. Bir tanı seli tek satıra indirildiğinde
 * kullanıcının okuduğu özet cümlesi bunlardandır: kimliği ve düzeyi özetlenen
 * tanıdan devralır, cümlesi ise buradan gelir. Kaynağa gömülmezler, çünkü
 * kullanıcı onları da okur ve çevrilmeleri gerekir.
 */
export const ORTAK_TANI_METINLERI: Readonly<Record<string, (p: TaniBaglami) => string>> = {
  /**
   * Bir dosyada aynı tanıdan çok sayıda bulgu varken basılan özet satırı.
   * Cümle iki şeyi açıkça söyler, çünkü ikisi de karıştırıldı: saklanan sayı
   * YALNIZ bu dosyaya aittir ve türün koşum geneli ağırlığı bu satırda değil,
   * çıktının sonundaki tür dökümündedir.
   */
  dosyaBulguOzeti: (p) =>
    `Yalnız bu dosyada aynı türden ${a(p, "toplam")} bulgu var; ilk ${a(p, "sınır")} tanesi yukarıda tek tek listelendi, kalan ${s(p, "toplam") - s(p, "sınır")} tanesi bu satıra katlandı. Buradaki sayı tek bir dosyanın sayısıdır, türün toplamı değildir; bu türün çalışma alanı genelindeki gerçek toplamını çıktının sonundaki tür dökümü bölümünde okursun (tam listeyi görmek istersen denetimi \`--tam-liste\` ile koştur).`,
  /** Aynı özetin Proje kapısındaki hali — kapsam dosya değil Projedir. */
  projeBulguOzeti: (p) =>
    `Yalnız bu Proje kapısında aynı türden ${a(p, "toplam")} bulgu var; ilk ${a(p, "sınır")} tanesi yukarıda tek tek listelendi, kalan ${s(p, "toplam") - s(p, "sınır")} tanesi bu satıra katlandı. Buradaki sayı tek bir kapının sayısıdır, türün toplamı değildir; bu türün çalışma alanı genelindeki gerçek toplamını çıktının sonundaki tür dökümü bölümünde okursun (tam listeyi görmek istersen denetimi \`--tam-liste\` ile koştur).`,
  /**
   * Zorunlu kenar cümlesinin gövdesi kanondan gelir; motorun eklediği şey
   * yalnız hangi düğümün konuşulduğudur. İki parça burada birleşir ki kanon
   * cümlesi ile motor önekinin arası hiçbir dosyada ayrışmasın.
   */
  zorunluKenarCumlesi: (p) => `"${a(p, "ad")}" (${a(p, "kimlik")}) ${a(p, "kanonCumlesi", "")}`,
  /** Yüzey yapraklarının meşru ebeveyni — liste değil, insanca yazılmış bir yer. */
  yuzeyDuzeniEbeveyni: () => "bir yüzey düzeni (Ekran/Sütun/Satır…)",
  /** Eksik alan listesinde görünen belge borçlarının adları. */
  belgeEksikAdi: () => "belge açıklaması (-->| … |<--)",
  anlatiBelgesiEksikAdi: (p) => `anlatı belgesi (-->| ## ${d(p, "bölümler").join(" · ## ")} |<--)`,
  belgeBolumuEksikAdi: (p) => `belge bölümü "## ${a(p, "bölüm")}"`,
  /** Planlama evresinde yumuşatılan tanıların önerisine eklenen açıklama. */
  planlamaEvresiEki: () => "(planlama evresinde ilan meşru — `sarmal <giriş> --iskelet <hedef>` ile üret; kod başlayınca / 'bitti'de bu HATA olur.)",
};

/** Katalog üstü gösterim cümlelerinin İngilizce okuma yüzü. */
export const ORTAK_TANI_METINLERI_EN: Readonly<Record<string, (p: TaniBaglami) => string>> = {
  // MGZ-A09: eksik-alan ve izinsiz-sarma listelerine giren adların İngilizce yüzü;
  // belge imleri dilin kendi söz dizimidir ve çevrilmez.
  yuzeyDuzeniEbeveyni: () => "a surface layout (Ekran/Sütun/Satır…)",
  belgeEksikAdi: () => "a document block (-->| … |<--)",
  anlatiBelgesiEksikAdi: (p) => `a narrative document (-->| ## ${d(p, "bölümler").join(" · ## ")} |<--)`,
  belgeBolumuEksikAdi: (p) => `the document section "## ${a(p, "bölüm")}"`,
  dosyaBulguOzeti: (p) =>
    `This file alone contains ${a(p, "toplam")} findings of the same kind. The first ${a(p, "sınır")} are listed individually above; the remaining ${s(p, "toplam") - s(p, "sınır")} are folded into this row. This is the count for one file, not the total for this diagnostic kind; see the per-kind breakdown at the end of the output for the workspace-wide total (run the check with \`--tam-liste\` to see the complete list).`,
  projeBulguOzeti: (p) =>
    `This Proje gate alone contains ${a(p, "toplam")} findings of the same kind. The first ${a(p, "sınır")} are listed individually above; the remaining ${s(p, "toplam") - s(p, "sınır")} are folded into this row. This is the count for one gate, not the total for this diagnostic kind; see the per-kind breakdown at the end of the output for the workspace-wide total (run the check with \`--tam-liste\` to see the complete list).`,
};

/** Bir tanının kimlik/konum/düzeyini koruyup yalnız okuma yüzünü seçer. */
export function taniDilineCevir(tani: Tani, dil: CiktiDili): Tani {
  const metin = tani.dilMetinleri?.[dil];
  if (!metin) return tani;
  // Kırpılmamış ikiz de haneyle birlikte döner; yoksa üst alan da düşer, çünkü
  // seçilen dilin ikizi yokken önceki dilin ikizini bırakmak iki dili karıştırır.
  const { tamMesaj: _eski, ...kalan } = tani;
  return { ...kalan, mesaj: metin.mesaj, oneri: metin.oneri, ...tamMesajEki(metin.tamMesaj, metin.mesaj) };
}

/**
 * Ayrıştırılamayan kaynağın tanı kimliği (kanonun DİL bölümü · sicilin önceki
 * kodları). MGZ-A03: komut satırı ve eklenti kimliği bu sabitten okur; kimlik
 * iki yerde ayrı ayrı yazılırsa iki yüz aynı kaydı farklı adla anlatabilir.
 * Kimlik bir kayıt alanı olarak yazılır, çünkü tanı sicilinin kaynak taraması
 * (motor-guven.test.ts) sicildeki her kimliğin üreticisini `kod: "…"` biçiminden tanır.
 */
const SOZ_DIZIM_KIMLIGI = { kod: "söz-dizim" } as const;
export const SOZ_DIZIM_KODU: string = SOZ_DIZIM_KIMLIGI.kod;

/** Ayrıştırıcının dinamik söz-dizim cümlesini iki paralel tanı hanesine bağlar. */
export function sozDizimTanisi(hata: SozDizimHatasi): Tani {
  return {
    duzey: "hata",
    kod: SOZ_DIZIM_KODU,
    mesaj: hata.message,
    satir: hata.satir,
    sutun: hata.sutun,
    dilMetinleri: {
      tr: { mesaj: hata.message },
      en: { mesaj: hata.ingilizceMesaj },
    },
  };
}

/**
 * Önceki kanonun tanısını kurar: cümleyi katalogdan alır, düzeyi ve konumu
 * çağırandan. Katalogda karşılığı olmayan bir kimlik sessizce geçmez — motor
 * kendi sicilinde bulunmayan bir cümleyi uydurmaktansa durur.
 */
export function eskiTani(
  kod: string,
  duzey: Duzey,
  baglam: TaniBaglami,
  konum: { satir?: number; sutun?: number },
  dil: CiktiDili = "tr",
  tamBaglam?: TaniBaglami,
): Tani {
  const kataloglar = { tr: ONCEKI_TANI_METINLERI, en: ONCEKI_TANI_METINLERI_EN } as const;
  const haneler = {
    tr: {
      mesaj: kataloglar.tr[kod]?.mesaj(baglam),
      oneri: kataloglar.tr[kod]?.oneri?.(baglam),
      tamMesaj: tamBaglam && kataloglar.tr[kod]?.mesaj(tamBaglam),
    },
    en: {
      mesaj: kataloglar.en[kod]?.mesaj(baglam),
      oneri: kataloglar.en[kod]?.oneri?.(baglam),
      tamMesaj: tamBaglam && kataloglar.en[kod]?.mesaj(tamBaglam),
    },
  };
  if (!haneler.tr.mesaj || !haneler.en.mesaj) throw new Error(`Tanı metni yok: ${kod}`);
  const metin = dilHanesi(haneler, dil);
  return {
    duzey,
    kod,
    mesaj: metin.mesaj,
    satir: konum.satir ?? 0,
    sutun: konum.sutun ?? 0,
    ...(metin.oneri === undefined ? {} : { oneri: metin.oneri }),
    ...tamMesajEki(metin.tamMesaj, metin.mesaj),
    dilMetinleri: {
      tr: {
        mesaj: haneler.tr.mesaj,
        ...(haneler.tr.oneri === undefined ? {} : { oneri: haneler.tr.oneri }),
        ...tamMesajEki(haneler.tr.tamMesaj, haneler.tr.mesaj),
      },
      en: {
        mesaj: haneler.en.mesaj,
        ...(haneler.en.oneri === undefined ? {} : { oneri: haneler.en.oneri }),
        ...tamMesajEki(haneler.en.tamMesaj, haneler.en.mesaj),
      },
    },
  };
}

/**
 * Yeni kanon tanısını kurar: metni katalogdan alır, düzeyi sicilin terfi
 * kademesinden okur. Üretici işlev yalnız olguyu ve konumu verir; cümleyi
 * kurmaz, düzeyi seçmez.
 */
export function yeniTani(
  kod: string,
  baglam: TaniBaglami,
  konum: { satir?: number; sutun?: number },
  dil: CiktiDili = "tr",
  tamBaglam?: TaniBaglami,
): Tani {
  const kataloglar = { tr: TANI_METINLERI, en: TANI_METINLERI_EN } as const;
  const tr = kataloglar.tr[kod];
  const en = kataloglar.en[kod];
  const kayit = YENI_TANI_INDEKS.get(kod);
  if (!tr || !en || !kayit) {
    throw new Error(`Tanı metni ya da sicil kaydı yok: ${kod}`);
  }
  // Cümle her dil için bir kez kurulur; kırpılmamış ikiz istendiğinde aynı şablon
  // ikinci kez, bu kez tam gövdeyle koşturulur. Metin elle kesilip yapıştırılmaz,
  // çünkü iki yüz tek şablondan doğmazsa zamanla birbirinden ayrışır.
  const hane = (katalog: TaniMetni): TaniDilMetni => {
    const mesaj = katalog.mesaj(baglam);
    return { mesaj, oneri: katalog.oneri(baglam), ...tamMesajEki(tamBaglam && katalog.mesaj(tamBaglam), mesaj) };
  };
  const haneler = { tr: hane(tr), en: hane(en) };
  const metin = dilHanesi(haneler, dil);
  return {
    duzey: kayit.kademe,
    kod,
    mesaj: metin.mesaj,
    satir: konum.satir ?? 0,
    sutun: konum.sutun ?? 0,
    oneri: metin.oneri,
    ...tamMesajEki(metin.tamMesaj, metin.mesaj),
    dilMetinleri: haneler,
  };
}

/**
 * KPS-SIR-A01 · Yeni kanon tanısını sicilin TARİHSEL KAYIT düzeyine indirir. Kanon
 * bazı tanıların, ihlal edilen iş tamamen bittiğinde tarihsel bir kayıt olarak
 * daha alçak düzeyde konuştuğunu yazar; düzey üreticide seçilmez, sicilin
 * `tarihselKademe` alanından okunur. Alanı olmayan tanı için çağrı fırlatır, çünkü
 * sicilin izin vermediği bir düzey sessizce basılmamalıdır.
 */
export function tarihselTani(t: Tani): Tani {
  const duzey = YENI_TANI_INDEKS.get(t.kod)?.tarihselKademe;
  if (!duzey) throw new Error(`Tanının tarihsel kayıt düzeyi sicilde yok: ${t.kod}`);
  return { ...t, duzey };
}

/**
 * Öneri metninin YAPIŞTIRILABİLİR bir düzeltme iskeleti taşıyıp taşımadığını ölçer.
 *
 * Şart üç parçalıdır ve üçü birden aranır, çünkü yalnız "Örnek:" sözcüğünü aramak
 * şartı beyan eder ama ölçmez: saf düzyazı bir "Örnek:" cümlesi nöbetten geçerdi.
 *   ① metin bir örnek işareti taşır (Türkçe yüzde "Örnek:", İngilizce yüzde
 *      "Example:" · MGZ-A09),
 *   ② örnek, ters tırnakla ayrılmış bir kod parçası içinde verilir,
 *   ③ o parça gerçekten bir iskelettir: alan ataması, çağrı imzası ya da işaret
 *      satırı biçiminde en az bir `:` veya `=` bağı kurar.
 * Böylece kullanıcı metni okuyup anlamak zorunda kalmadan doğrudan yapıştırabilir.
 */
export function yapistirilabilirOrnekVar(oneri: string | undefined): boolean {
  if (!oneri || !/(?:Örnek|Example):/.test(oneri)) return false;
  const parcalar = oneri.match(/`[^`]+`/g) ?? [];
  return parcalar.some((p) => {
    const govde = p.slice(1, -1).trim();
    // göç motor turu A08 kapanışı (devredilen bulgu D-8): belgesi ile davranışı ayrışıyordu —
    // belge `-->|` ve `|<--` belge imlerini izinli sayıyor, fakat altı karakterlik
    // uzunluk eşiği bu dört karakterlik imleri jeton denetimine varmadan
    // reddediyordu. DAVRANIŞ belgeye uyduruldu: belge imleri kendi başlarına
    // yapıştırılabilir bir iskelet parçasıdır ve uzunluk eşiğinden muaftır.
    // Öteki jetonlar için altı karakterlik alt sınır sürüyor.
    if (BELGE_IMLERI.some((im) => govde.includes(im))) return true;
    // KPS-MHR-A01 (MIM-3.4): düzeltmesi bir dosyanın ADINI değiştirmek olan tanıda
    // yapıştırılabilir iskelet tek bir taşıma komutudur; komut iki yol taşır ve
    // olduğu gibi kabuğa yapıştırılır. Yalnız iki bağımsız değişkenli taşıma tanınır.
    if (/^(?:git\s+mv|mv)\s+(?:--\s+)?"[^"]+"\s+"[^"]+"$/.test(govde)) return true;
    if (govde.length < 6) return false;
    // Yapısal jeton: alan ataması, çağrı imzası, kapsam ayracı,
    // çok satırlı değer ya da üretim bölgesi işareti.
    return /[:=]|[({[]|"""|<!--/.test(govde);
  });
}

/** Belge bloğu imleri — kısa oldukları için uzunluk eşiğinden muaftır (D-8). */
const BELGE_IMLERI: readonly string[] = ["-->|", "|<--"];

/**
 * Kataloğun sicille birebir olup olmadığını söyler.
 *
 * göç motor turu A08 kapanışı (devredilen bulgu D-5): bu işlev halka 2'de "katalog bütünlük
 * ölçeri" diye tanıtılmış fakat hiçbir çağıranı yazılmamıştı — ölü koddu ve
 * hiçbir şey ölçmüyordu. Kaldırmak yerine GERÇEK BİR NÖBETE bağlandı: üçlü
 * senkron nöbeti (motor-guven.test.ts) bu işlevi çağırır ve dönen listenin boş
 * olmasını şart koşar. Böylece sicile eklenip metni yazılmayan bir tanı kapıda
 * görünür; ayrıca `yeniTani()` kurucusunun çalışma anında fırlattığı hata,
 * fikstürü olmayan kimliklerde sessizce beklenmek zorunda kalmaz.
 */
export function metinsizYeniTanilar(): string[] {
  return [...YENI_TANI_INDEKS.keys()].filter((k) => !TANI_METINLERI[k]);
}

/** Ters yön: metni yazılmış fakat sicilde karşılığı olmayan kimlikler (D-5 ikizi). */
export function sicilsizTaniMetinleri(): string[] {
  return Object.keys(TANI_METINLERI).filter((k) => !YENI_TANI_INDEKS.has(k));
}

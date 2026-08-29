// ═══════════════════════════════════════════════════════════════════════════
// dag.ts — Bağımlılık Grafiği: DAG-denetim + ters-bağ türetme + topolojik sıra (ORK-3)
//
//   `bağımlı`/`besler` kenarlarından yönlü graf kurar; döngü (cycle) tespit eder
//   (döngüsel-bağımlılık = hata), ters-kenarları (ardıl) TÜRETİR (ORK-1.2 tek-kaynak:
//   yalnız `bağımlı`/`besler` yazılır, ardıl hesaplanır — `.sar`'a iki kez yazılmaz)
//   ve Kahn ile KARARLI topolojik sıra üretir. Saf — I/O yok (STR-3.1 soru-①:
//   deterministik graf işlemi → AÇIK). RAY-3'ten öne çekildi (ray1: "DAG-denetim +
//   ters-bağ-türetme yok"). Çok-bağımlı adım (ör. doğuş rehberi) kendiliğinden en sona düşer.
// ═══════════════════════════════════════════════════════════════════════════

import type { Dugum, Program, Deger } from "./sozdizim.ts";
import type { Tani } from "./tani.ts";
import { eskiTani } from "./tani-metinleri.ts";   // tanı cümlesi tek kaynakta yaşar (CDL-A02)
import { durumTuret, adimDurumlariTopla, ADIM_YASAM_DURUMLARI } from "./durum.ts";   // kapsayıcı sayaçları tek tanımdan gelir (durum ikizi yazılmaz)
import { INDEKS_DISI, adAlaniAyir, projeKapsamlari, onekKapsar, type ProjeKapsami } from "./kimlik.ts";   // OGR-5: karne ürün kapsamı — ders dünyası tek kaynaktan ayrılır · ORK-4: ad alanı çözümü TEK kaynaktan (KPS-ADA-A01)

/** Graf düğümü — `kod` taşıyan bir widget (çoğunlukla Adım). */
export interface DagDugum {
  kod: string;
  tip: string;            // Adım · Faz · Blok …
  dosya: string;
  satir: number;
  sutun: number;
  durum?: string;         // Adım durumu (beklemede·geliştirmede·tamamlandı·bloklu) — durum-tutarlılığı için
  ad?: string;            // insan-adı (HTR-YOLHARITASI-INSAN-ADI · Mini Graf etiketi; yoksa koda düşer)
  ne?: string;            // düğümün niyeti (Adım-seçici/ŞEF panel özeti için — ilk cümle alınır)
  kapsayan?: string;      // en yakın KOD'lu kapsayıcının kodu (içerme kenarı — TÜRETİLİR, ORK-1.2)
  oncekiler: string[];    // bu düğümden ÖNCE gelmeliler (`bağımlı` + `besler`den)
  sonrakiler: string[];   // TÜRETİLMİŞ ardıl: bu düğümden SONRA gelenler (ORK-1.2 — yazılmaz)
  /** hatırlatıcı-rayı turu (IDA dogfood oturum-2 · BUG-2): `hatırlat` YUMUŞAK kenar — topolojik
   *  sıraya (oncekiler/sonrakiler) GİRMEZ (ileri-bağlam, sıra kısıtı değil).
   *  hatırlatanlar = bu düğüme `hatırlat` eden Hatırlatıcı KOD'ları (gelen);
   *  hatırlatıyor = bu düğümün `hatırlat` hedefleri (giden — düğüm Hatırlatıcı'ysa). */
  hatırlatanlar?: string[];
  hatırlatıyor?: string[];
  /** RF-T6-A02 + Sol denetimi (2026-07-19 KISMİ KABUL ①): `dayanak` da YUMUŞAK
   *  kenardır — topolojik sıraya GİRMEZ (yasa bağı, iş sırası değil); graf/gezin
   *  yapısal bağ olarak serer. dayanıyor = bu Kural'ın dayandığı Karar KOD'ları
   *  (giden); dayananlar = bu Karar'a dayanan Kural KOD'ları (gelen — türetilir). */
  dayanıyor?: string[];
  dayananlar?: string[];
  /** VIT-GRAF-A12: `üretir` de YUMUŞAK kenardır — `hatırlat`/`dayanak` deseninin
   *  TESLİM ikizi. Topolojik sıraya (oncekiler/sonrakiler) GİRMEZ: meyve bir iş
   *  sırası kısıtı değil, bir Adım'ın ne teslim ettiğinin beyanıdır. üretiyor =
   *  bu Adım'ın `üretir` hedefleri (giden — hedef çözülmese de beyan kaydolur);
   *  üretenler = bu meyveyi üreten Adım KOD'ları (gelen — türetilir). */
  üretiyor?: string[];
  üretenler?: string[];
  /** VIT-GRAF-A12 · ZEMİN: kapsayıcının (Faz·Blok·Katman·AltKatman) Takım ya da
   *  Teknoloji hedefli zemin kenarı. Asıl yazım `kullanır:` kenarıdır (MIM-1.4 ·
   *  V1B-KANON-A01); Takım/Teknoloji hedefli `bağımlı` yazımı geçiş yedeği olarak
   *  aynı kayda iner. Bu kenar yürütme sırası KURMAZ, zemin kurar ("bu katman şu
   *  takımın ve şu teknolojinin üstünde durur"). genislet() bağımlı kenarını
   *  yaprak Adımlara açtığı için kapsayıcının kendisinde hiçbir iz kalmıyordu
   *  (ölçüm: 149 Katman düğümünün SIFIRI oncekiler/sonrakiler taşıyor); graf yüzü
   *  kapsayıcının zeminini gösterebilsin diye burada ayrıca korunur.
   *  `oncekiler`/`sonrakiler` bundan etkilenmez. */
  zemin?: string[];
  /** VIT-GRAF-A12 · MEVSİM: Blok'un bağlı olduğu Faz'ın kodu (zaman-ekseni
   *  aidiyeti — MIM-1.2). Kaynak, Faz'ın `çağır` çocuklarıdır: gerçek `çağır`
   *  yazımı da Blok'un `mevsim:` alanından mevsimNormalize'ın kurduğu SANAL
   *  kenar da aynı çocukta buluşur; bu yüzden burada `mevsim:` alanı yeniden
   *  okunmaz ve çevrim tek noktada kalır. Fiziksel iç içe geçen Blok'un bağı
   *  zaten `kapsayan` alanındadır. Ölçülmüş kusur (Founder 2026-08-10): bağını
   *  mevsim alanıyla kuran Blok grafta köksüz görünüyordu, çünkü kenar listesi
   *  yalnız bağımlı, besler ile üretir tanıyordu ve 18 canlı çağır kenarının
   *  sıfırı Dag'a iniyordu. */
  mevsim?: string;
  /** VIT-GRAF-A12: düğümün BEYAN ettiği teslim yolu (`dosya:` parametresi).
   *  DİKKAT — yukarıdaki `dosya` alanından FARKLIDIR: `dosya` düğümün yaşadığı
   *  `.sar` KAYNAĞIDIR, bu ise düğümün diskte ürettiğini söylediği yerdir.
   *  Beyan ile gerçeği karşılaştıran yüzeyler (Mini Graf boş camı) bunu okur. */
  beyanYolu?: string;
  /** MIM-1.2 · ZAMAN: Faz'ın `hedefTarih` beyanı ("YYYY-AA-GG" ya da "YYYY-AA"). Kardeş
   *  Faz sırası bu alandan türer (fazKarsilastir); yalnız Faz düğümünde dolar. */
  hedefTarih?: string;
}

export interface Dag {
  dugumler: Map<string, DagDugum>;
  /** Çözülmeyen kenar uçları (ORK-1.2 ① kopuk-zincir): `bağımlı`/`besler` hedefi hiçbir
   *  KOD'lu düğüme bağlanamadı — kenar SESSİZCE düşerdi (yanlış sıra üretirdi),
   *  artık kaydedilir ve `kopukZincirTanilari` uyarır. */
  kopuk: Array<{ kaynak: string; hedef: string; kenar: "bağımlı" | "besler"; dosya: string; satir: number; sutun: number }>;
  /** Öz-bağımlılık beyanları (TUR-2 · Terra kanıtı: `bağımlı: [KENDİSİ]` ne kenar
   *  ne tanı üretiyordu — sessiz atlanıyordu). Doğrudan (hedef=kendisi) VE dolaylı
   *  (hedef kendi kapsayıcısı → genişleme kendini içerir) hâlleri kaydedilir;
   *  `ozBagimlilikTanilari` HATA üretir — bir iş kendinden önce gelemez. */
  oz: Array<{ kaynak: string; hedef: string; kenar: "bağımlı" | "besler"; dosya: string; satir: number; sutun: number }>;
  /** ORK-4 · ÇAPRAZ-PROJE YÜRÜTME KENARI (KPS-ADA-A01): ad alanlı hedefi bu grafın
   *  evreninde değil KARDEŞ bir projede çözülen `bağımlı`/`besler` kenarları. Kenar
   *  kopuk DEĞİLDİR — hedefi gerçekten vardır, yalnız başka bir deponun kökünde
   *  yaşadığı için bu grafta bir düğüme karşılık gelmez ve yerel sıra hesabına
   *  giremez. ORK-1.2 ① hükmü gereği yine de sessiz düşmez: kenar burada kaydolur,
   *  böylece "yedi kenar nereye gitti" sorusunun ölçülebilir bir cevabı olur. */
  disProje: Array<{ kaynak: string; hedef: string; kenar: "bağımlı" | "besler"; dosya: string; satir: number; sutun: number }>;
}

/**
 * `dagKur` seçenekleri. Bugün tek kalemi ORK-4 kardeş kök kapısıdır ve bilinçli
 * olarak ENJEKTE edilir: `dagKur` saf kalır (STR-3.1), disk okuması çağıranın
 * elindedir ve sınama yüzü kapıyı bir dize kümesiyle taklit edebilir.
 */
export interface DagSecenegi {
  /**
   * ORK-4 · ad alanlı bir hedef kardeş projenin kökünde çözülüyor mu? Yalnız ad
   * alanı YÜKLÜ EVRENDE bulunamadığında sorulur; verilmezse kardeş kök hiç
   * okunmaz ve çözülmeyen ad alanlı hedef kopuk sayılır (bugünkü davranış).
   */
  adAlaniCozulur?: (hedef: string, kaynakDosya: string) => boolean;
}

export interface SiraSonuc {
  /** topolojik sıra (döngüde OLMAYAN düğümler, kararlı). */
  sira: string[];
  /** döngüde kalan düğümler (in-derece hiç 0'a inmeyen) — kararlı. */
  dongu: string[];
}

// ── Yardımcılar (saf) ─────────────────────────────────────────────────────────

function param(node: Dugum, ad: string): Deger | undefined {
  return [...node.parametreler, ...node.ozellikler].find((p) => p.ad === ad)?.deger;
}

function kodDeger(node: Dugum): string | undefined {
  const d = param(node, "kod");
  return d && (d.tur === "kod" || d.tur === "metin") ? d.metin : undefined;
}

/** VIT-GRAF-A12 · ZEMİN kenarının iki ucu. Kaynak plan kapsayıcısıdır, hedef
 *  ZEMİN tipidir; ölçüm bu kenarın Katman→Katman hâlinin çalışma alanında hiç
 *  bulunmadığını, tamamının Takım (116) ve Teknoloji (35) hedefli olduğunu
 *  gösterdi — yani bu kenar yürütme sırası değil ZEMİN kurar. */
const KAPSAYICI_TIPLERI = new Set(["Faz", "Blok", "Katman", "AltKatman"]);
/** Graf yüzü de bu kümeyi okur (mini graf kenar sınıfını kaynağın tipinden
 *  türetir); İKİNCİ BİR ÇİZELGE yazılmasın diye dışa açıktır. */
export const ZEMIN_TIPLERI: ReadonlySet<string> = new Set(["Takım", "Teknoloji"]);

/** Bir kenar değerinden KOD hedeflerini çıkarır (tek `kod` ya da `liste`). */
function kenarHedefleri(deger: Deger): string[] {
  if (deger.tur === "liste") return (deger.ogeler ?? []).flatMap(kenarHedefleri);
  if (deger.tur === "kod" && deger.metin) return [deger.metin];
  return [];
}

/** MIM-1.2 · KARDEŞ FAZ SIRASI (Founder hükmü 2026-08-25): zaman ekseni kaynak
 *  sırasından değil TARİHTEN türer. Anahtar sözlük sırasıyla karşılaştırılır:
 *  günlü tarih olduğu gibi, ay hassasiyetli beyan ay sonu sayılarak ("YYYY-AA-99" —
 *  aynı ayın günlü tarihlerinden sonra, vade nöbetinin ay-sonu okumasıyla uyumlu),
 *  tarihsiz Faz dizilişin SONUNA ("9999-99-99") düşer; eşit anahtarı kaynak sırası
 *  çözer. Panel bu anahtarı buradan okur — ikinci bir çeviri yazılmaz (DIL-2). */
export function fazTarihAnahtari(hedefTarih?: string): string {
  const ham = hedefTarih?.trim() ?? "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(ham)) return ham;
  if (/^\d{4}-\d{2}$/.test(ham)) return `${ham}-99`;
  return "9999-99-99";
}

/** Kardeş Faz karşılaştırıcısı: tarih anahtarı, ardından kaynak satırı (deterministik). */
export function fazKarsilastir(a: { hedefTarih?: string; satir: number }, b: { hedefTarih?: string; satir: number }): number {
  const ka = fazTarihAnahtari(a.hedefTarih), kb = fazTarihAnahtari(b.hedefTarih);
  if (ka !== kb) return ka < kb ? -1 : 1;
  return a.satir - b.satir;
}

// ── Graf kurma (saf) ──────────────────────────────────────────────────────────

/**
 * Tüm programlardaki `kod`'lu widget'lardan bağımlılık grafiği kurar.
 *   `A bağımlı B` → B, A'dan ÖNCE (B ∈ A.oncekiler · A ∈ B.sonrakiler — türetilir).
 *   `A besler  B` → A, B'den ÖNCE (A ∈ B.oncekiler · B ∈ A.sonrakiler — türetilir).
 * Yalnız İKİ ucu da tanımlı kenarlar bağlanır (çözülmeyen hedef = referansTanilari işi).
 *
 * ORK-4 · ÇAPRAZ-PROJE AD ALANI (KPS-ADA-A01 · ikinci tur). Yürütme kenarının
 * hedefi `PRJ-A::KOD-X` yazımını taşıyabilir ve bu yazım bu modülde ÇÖZÜLMEDİĞİ
 * için kenar sessizce kopuyordu. Kusur canlı ölçülmüştür: laboratuvarın yedi
 * yürütme kenarının tamamı ad alanlı hedefe yönelmekte ve yedisinin de hedefi
 * açık deponun kökünde gerçekten tanımlı bulunmakta, buna karşılık `dugumler`
 * haritası çıplak KOD ile anahtarlandığı için ad alanlı anahtarın aranması daima
 * boş dönmekteydi. Aynı ad alanı referans, uygular ve kullanır kenarlarında dört
 * modülde tanındığı hâlde yürütme kenarında tanınmıyordu; onarım o boşluğu
 * kapatır ve hükmü GEVŞETMEZ: ad alanlı hedef yalnız kendi projesinin kapsamında
 * aranır, niteliksiz KOD'un çözümüne hiç dokunulmaz ve tesadüfî küresel eşleşme
 * hiçbir yeni yol kazanmaz.
 */
export function dagKur(programlar: ReadonlyMap<string, Program>, secenek?: DagSecenegi): Dag {
  const dugumler = new Map<string, DagDugum>();
  // kapsayıcı KOD → altındaki yaprak Adım KOD'ları (kapsayıcı-hedef genişlemesi için)
  const yapraklar = new Map<string, string[]>();

  // ① düğümleri topla (ilk tanım kazanır — kodIndeksle ile tutarlı) + yaprak haritası
  //    kapsayan = en yakın KOD'lu ata (içerme kenarı graf yüzüne türetilir — ORK-1.2)
  const toplaGez = (node: Dugum, dosya: string, kapsayan?: string): string[] => {
    const kod = kodDeger(node);
    if (kod && node.tur === "widget" && !dugumler.has(kod)) {
      const durumP = param(node, "durum");
      const neP = param(node, "ne");
      const adP = param(node, "ad");
      // VIT-GRAF-A12: `dosya:` BEYAN edilen teslim yoludur — düğümün kaynağı olan
      // `dosya` alanıyla karıştırılmamalıdır (ikisi ayrı gerçeği söyler).
      const dosyaP = param(node, "dosya");
      // MIM-1.2: Faz'ın zaman beyanı düğüme iner — kardeş sırası buradan türer.
      const tarihP = node.ad === "Faz" ? param(node, "hedefTarih") : undefined;
      dugumler.set(kod, { kod, tip: node.ad, dosya, satir: node.satir, sutun: node.sutun,
        durum: durumP?.tur === "metin" || durumP?.tur === "kod" ? durumP.metin : undefined,
        ad: adP?.tur === "metin" ? adP.metin : undefined,
        ne: neP?.tur === "metin" ? neP.metin : undefined,
        beyanYolu: dosyaP?.tur === "metin" ? dosyaP.metin : undefined,
        hedefTarih: tarihP?.metin,
        kapsayan, oncekiler: [], sonrakiler: [] });
    }
    // RF-T6-A02 sertleştirme (Sol ⑤): Kural BİLDİRİMLERİ (kuralTanım — `Kural ad(...)`)
    // de grafa kaydolur: dayanak kenarının kural ucu düğümsüz kalmasın, graf/gezin
    // kural→karar yönünü iki uçlu yürüyebilsin. Kimlik: kod parametresi varsa o,
    // yoksa kural adı (DIL-3 adıyla çağrılır).
    if (node.tur === "kuralTanım") {
      const kkod = kod ?? node.ad;
      if (kkod && !dugumler.has(kkod)) {
        dugumler.set(kkod, { kod: kkod, tip: "Kural", dosya, satir: node.satir, sutun: node.sutun,
          durum: undefined, kapsayan, oncekiler: [], sonrakiler: [] });
      }
    }
    const altKapsayan = kod && node.tur === "widget" ? kod : kapsayan;
    const altYapraklar: string[] = [];
    for (const c of node.cocuklar) altYapraklar.push(...toplaGez(c, dosya, altKapsayan));
    if (kod && node.tur === "widget") {
      if (node.ad === "Adım") altYapraklar.push(kod);           // yaprak = kendisi
      if (!yapraklar.has(kod)) yapraklar.set(kod, altYapraklar);
    }
    return altYapraklar;
  };
  for (const [dosya, program] of programlar) for (const b of program.bildirimler) toplaGez(b, dosya);

  // Hedef bir plan-kapsayıcısıysa (Blok/Faz/Katman) MEKANİK genişler: "kapsayıcıya
  // bağımlı" = "onun TÜM yaprak Adımlarına bağımlı" (ORK-1.2 — beyan Adım'da, tek kez).
  const genislet = (kod: string): string[] => {
    const d = dugumler.get(kod);
    if (d && (d.tip === "Blok" || d.tip === "Faz" || d.tip === "Katman" || d.tip === "AltKatman")) {
      const y = yapraklar.get(kod) ?? [];
      if (y.length) return y;
    }
    return [kod];
  };

  // ② kenarları çöz — `once` düğümü `sonra` düğümünden ÖNCE gelir
  const kenarEkle = (onceHam: string, sonraHam: string): void => {
    for (const once of genislet(onceHam)) for (const sonra of genislet(sonraHam)) {
      if (once === sonra) continue;                     // öz-döngü: sessiz atla (v1)
      const o = dugumler.get(once), s = dugumler.get(sonra);
      if (!o || !s) continue;                           // çözülmeyen uç → referansTanilari işi
      if (!s.oncekiler.includes(once)) s.oncekiler.push(once);
      if (!o.sonrakiler.includes(sonra)) o.sonrakiler.push(sonra);   // ters-türetme (ORK-1.2)
    }
  };
  // ②a MIM-1.2 FAZ-SIRASI TÜRETME (zaman ekseni makinede): kardeş Fazlar TARİH sırasında
  //    zincirlenir (Founder hükmü 2026-08-25 — önceki kaynak-sırası kuralı emekli; tarihsiz
  //    Faz dizilişin sonunda ve kendi arasında kaynak sırasında kalır, fazKarsilastir) —
  //    Faz-N+1, Faz-N'in Kapısına (varsa; yoksa Faz-N'in kendisine)
  //    örtük bağımlı olur; genislet() bunu yaprak Adımlara açar (ORK-1.2 mekaniği).
  //    NOT (TERFİ 2026-07-12): Blok{Faz} artık izinsiz-sarma HATASIDIR — aşağıdaki
  //    kapsayan-Blok atlaması bozuk-girdide zincir kurmamak için SAVUNMACI kalır.
  {
    const fazGruplari = new Map<string, DagDugum[]>();
    for (const d of dugumler.values()) {
      if (d.tip !== "Faz") continue;
      const kapsayanTip = d.kapsayan ? dugumler.get(d.kapsayan)?.tip : undefined;
      if (kapsayanTip === "Blok") continue;   // savunmacı: bozuk girdi (TERFİ sonrası hata zaten)
      const grup = `${d.dosya}::${d.kapsayan ?? ""}`;
      (fazGruplari.get(grup) ?? fazGruplari.set(grup, []).get(grup)!).push(d);
    }
    const kapilar = [...dugumler.values()].filter((d) => d.tip === "Kapı");
    for (const grup of fazGruplari.values()) {
      grup.sort(fazKarsilastir);   // tarih sırası = zaman sırası; tarihsizde kaynak sırası (deterministik)
      for (let i = 1; i < grup.length; i++) {
        const onceki = grup[i - 1];
        const kapi = kapilar
          .filter((k) => k.kapsayan === onceki.kod)
          .sort((a, b) => a.satir - b.satir)[0];
        if (kapi) {
          // Kapı gerçek geçittir: Faz-N'in yaprakları → Kapı → Faz-N+1'in yaprakları
          kenarEkle(onceki.kod, kapi.kod);
          kenarEkle(kapi.kod, grup[i].kod);
        } else {
          kenarEkle(onceki.kod, grup[i].kod);
        }
      }
    }
  }

  const kopuk: Dag["kopuk"] = [];
  const oz: Dag["oz"] = [];
  const disProje: Dag["disProje"] = [];

  // ── ORK-4 · ad alanlı yürütme hedefinin çözümü (KPS-ADA-A01 · ikinci tur) ──
  //   Proje kapsamları TEMBEL hesaplanır: `::` taşıyan bir hedefe gerçekten
  //   rastlanmadıkça tek bir ağaç bile dolaşılmaz, dolayısıyla ad alanı
  //   kullanmayan bir deponun grafı hiçbir ek bedel ödemez. Bu, kimlik
  //   çözümündeki kardeş kök okumasının tembelliğiyle aynı hükmün ikizidir.
  let kapsamOnbellegi: readonly ProjeKapsami[] | undefined;
  const kapsamlar = (): readonly ProjeKapsami[] => (kapsamOnbellegi ??= projeKapsamlari(programlar));

  /** Bir yürütme kenarı hedefinin bu graftaki karşılığı. */
  type HedefCozum =
    | { tur: "yerel"; kod: string }   // bu grafta bir düğüme çözüldü — kenar kurulur
    | { tur: "dış" }                  // kardeş projede çözüldü — bu grafın dışında, kopuk değil
    | { tur: "kopuk" };               // hiçbir yerde çözülmedi — ORK-1.2 ① uyarısı

  const hedefiCoz = (hedef: string, kaynakDosya: string): HedefCozum => {
    const { adAlani, yerel } = adAlaniAyir(hedef);
    // Niteliksiz hedef: bugünkü davranış birebir korunur (hüküm gevşetilmez de,
    // sıkılaştırılmaz da — bu Adımın işi ad alanlı hedefi grafa indirmektir).
    if (adAlani === undefined) return dugumler.has(hedef) ? { tur: "yerel", kod: hedef } : { tur: "kopuk" };
    // ① Ad alanı YÜKLÜ evrende bir Proje kapsamıysa (çatı penceresi) hedef yalnız
    //    o kapsamın altında aranır; küresel eşleşme burada da bağ değildir.
    const hedefKapsamlar = kapsamlar().filter((k) => k.kod === adAlani);
    if (hedefKapsamlar.length) {
      const d = dugumler.get(yerel);
      return d && hedefKapsamlar.some((k) => onekKapsar(k.onek, d.dosya))
        ? { tur: "yerel", kod: yerel }
        : { tur: "kopuk" };
    }
    // ② Ad alanı yüklü değilse (deponun kendi kökünden koşulan denetim) kararı
    //    kardeş kök kapısı verir. Kapı yoksa hedef çözülemez ve kopuk sayılır.
    return secenek?.adAlaniCozulur?.(hedef, kaynakDosya) ? { tur: "dış" } : { tur: "kopuk" };
  };

  const kenarGez = (node: Dugum, dosya: string): void => {
    // RF-T6-A02 sertleştirme: kuralTanım da kenar beyan edebilir (dayanak: K-nn) —
    // kimliği adı (DIL-3); widget'larla aynı kenar mantığından geçer.
    const kod = kodDeger(node) ?? (node.tur === "kuralTanım" ? node.ad : undefined);
    if (kod && (node.tur === "widget" || node.tur === "kuralTanım")) {
      const isle = (kenar: "bağımlı" | "besler", t: string): void => {
        // ÖZ-BAĞIMLILIK (TUR-2): kendine kenar sessizce atlanmaz — HATA sicili.
        if (t === kod) {
          oz.push({ kaynak: kod, hedef: t, kenar, dosya, satir: node.satir, sutun: node.sutun });
          return;
        }
        // ORK-4: hedef ad alanlıysa kendi projesinin kapsamında çözülür; kardeş
        // depoda çözülen hedef bu grafın dışındadır ve kopuk sayılmaz.
        const cozum = hedefiCoz(t, dosya);
        if (cozum.tur === "dış") {
          disProje.push({ kaynak: kod, hedef: t, kenar, dosya, satir: node.satir, sutun: node.sutun });
          return;
        }
        if (cozum.tur === "kopuk") {   // çözülmeyen uç: kenar düşer ama artık SESSİZ değil (ORK-1.2 ①)
          kopuk.push({ kaynak: kod, hedef: t, kenar, dosya, satir: node.satir, sutun: node.sutun });
          return;
        }
        // Bundan sonrası ÇÖZÜLMÜŞ yerel kod üzerinden yürür: ad alanlı yazım
        // (`PRJ-A::KOD-X`) burada çıplak KOD'a inmiştir ve graf tek anahtar tanır.
        const h = cozum.kod;
        // Öz-bağımlılığın ad alanlı hâli: `PRJ-A::KENDİSİ` de kendine kenardır.
        if (h === kod) {
          oz.push({ kaynak: kod, hedef: t, kenar, dosya, satir: node.satir, sutun: node.sutun });
          return;
        }
        // Dolaylı öz: hedef kendi kapsayıcısı — genişleme kendini içerir (ORK-3.1 yan etkisi).
        if (genislet(h).includes(kod)) {
          oz.push({ kaynak: kod, hedef: t, kenar, dosya, satir: node.satir, sutun: node.sutun });
        }
        // VIT-GRAF-A12 · ZEMİN KAYDI: kapsayıcının Takım/Teknoloji hedefli `bağımlı`
        // kenarı kapsayıcının KENDİSİNDE de saklanır. genislet() aşağıdaki kenarEkle
        // çağrısında hedefi yaprak Adımlara açtığı için kapsayıcıda hiçbir iz
        // kalmıyordu; bu YALNIZ EK bir kayıttır — kenarEkle davranışı değişmez.
        if (kenar === "bağımlı") {
          const kaynakD = dugumler.get(kod), hedefD = dugumler.get(h);
          if (kaynakD && hedefD && KAPSAYICI_TIPLERI.has(kaynakD.tip) && ZEMIN_TIPLERI.has(hedefD.tip)) {
            if (!(kaynakD.zemin ??= []).includes(h)) kaynakD.zemin.push(h);
          }
        }
        kenar === "bağımlı" ? kenarEkle(h, kod) : kenarEkle(kod, h);
      };
      const bag = param(node, "bağımlı");
      if (bag) for (const t of kenarHedefleri(bag)) isle("bağımlı", t);   // A bağımlı B → B önce
      const bes = param(node, "besler");
      if (bes) for (const t of kenarHedefleri(bes)) isle("besler", t);    // A besler B → A önce
      // V1B-KANON-A01: `kullanır` MIM-1.4/ORK-2.4 zemin kenarıdır — yürütme sırası
      // KURMAZ (kenarEkle'ye girmez, ORK-1.2 tek yetkili), yalnız kapsayıcının
      // zemin kaydına iner ki graf yüzü Katman→Teknoloji bağını çizmeyi sürdürsün.
      const kul = param(node, "kullanır");
      if (kul) {
        const kaynakD = dugumler.get(kod);
        for (const t of kenarHedefleri(kul)) {
          const hedefD = dugumler.get(t);
          if (kaynakD && hedefD && KAPSAYICI_TIPLERI.has(kaynakD.tip) && ZEMIN_TIPLERI.has(hedefD.tip)) {
            if (!(kaynakD.zemin ??= []).includes(t)) kaynakD.zemin.push(t);
          }
        }
      }
      // hatırlatıcı-rayı turu: `hatırlat` YUMUŞAK kenar — kenarEkle'ye (topolojik sıra) GİRMEZ, yalnız
      // düğümlere gelen/giden olarak işaretlenir (graf/etki serer; sıra/döngü etkilenmez).
      const htr = param(node, "hatırlat");
      if (htr) {
        const kaynak = dugumler.get(kod);
        for (const t of kenarHedefleri(htr)) {
          if (kaynak) (kaynak.hatırlatıyor ??= []).push(t);   // kaynağın gideni (beyan — hedef çözülmese de)
          const hedef = dugumler.get(t);
          if (hedef && !(hedef.hatırlatanlar ??= []).includes(kod)) hedef.hatırlatanlar.push(kod);   // hedefe gelen
        }
      }
      // RF-T6-A02 + Sol ①: `dayanak` yumuşak kenarı — hatırlat deseninin yasa ikizi.
      const dyn = param(node, "dayanak");
      if (dyn) {
        const kaynak = dugumler.get(kod);
        for (const t of kenarHedefleri(dyn)) {
          if (kaynak) (kaynak.dayanıyor ??= []).push(t);
          const hedef = dugumler.get(t);
          if (hedef && !(hedef.dayananlar ??= []).includes(kod)) hedef.dayananlar.push(kod);
        }
      }
      // VIT-GRAF-A12: `üretir` yumuşak kenarı — hatırlat/dayanak deseninin TESLİM
      // ikizi. kenarEkle ÇAĞRILMAZ: meyve topolojik sıraya girmez, yalnız düğümlere
      // giden/gelen olarak işaretlenir (graf yüzü serer; sıra/döngü etkilenmez).
      const urt = param(node, "üretir");
      if (urt) {
        const kaynak = dugumler.get(kod);
        for (const t of kenarHedefleri(urt)) {
          if (kaynak && !(kaynak.üretiyor ??= []).includes(t)) kaynak.üretiyor.push(t);   // beyan — hedef çözülmese de
          const hedef = dugumler.get(t);
          if (hedef && !(hedef.üretenler ??= []).includes(kod)) hedef.üretenler.push(kod);
        }
      }
      // VIT-GRAF-A12 · MEVSİM KAYDI: Faz'ın `çağır` çocuğu, hedef Blok'un zaman
      // aidiyetidir (MIM-1.2). Gerçek `çağır` yazımı da Blok'un `mevsim:`
      // alanından mevsimNormalize'ın kurduğu sanal kenar da aynı çocukta
      // buluştuğu için `mevsim:` alanı burada yeniden okunmaz — çevrim tek
      // noktada kalır. Kenar yürütme sırası KURMAZ (kenarEkle çağrılmaz; sırayı
      // zaten ②a Faz-sırası türetmesi kurar); graf yüzü Blok'un hangi mevsimde
      // büyüdüğünü buradan okur. İlk Faz kazanır (deterministik).
      if (node.tur === "widget" && node.ad === "Faz") {
        for (const c of node.cocuklar) {
          if (c.tur !== "çağır") continue;
          const hedef = dugumler.get(c.ad);
          if (hedef && hedef.tip === "Blok" && !hedef.mevsim) hedef.mevsim = kod;
        }
      }
    }
    for (const c of node.cocuklar) kenarGez(c, dosya);
  };
  for (const [dosya, program] of programlar) for (const b of program.bildirimler) kenarGez(b, dosya);

  return { dugumler, kopuk, oz, disProje };
}

/**
 * Öz-bağımlılık tanıları (TUR-2 · RF-T2-A01 — Terra canlı kanıtı): `bağımlı:
 * [KENDİSİ]` ne kenar ne tanı üretiyordu; artık HATA — bir iş kendinden önce
 * gelemez, sıra hesabı kilitlenir. Dolaylı hâl (kendi kapsayıcısına bağımlılık)
 * da yakalanır: genişleme kendini içerir. Saf.
 */
export function ozBagimlilikTanilari(dag: Dag): Array<{ dosya: string; tani: Tani }> {
  return dag.oz.map((k) => ({
    dosya: k.dosya,
    tani: eskiTani("öz-bağımlılık", "hata",
      { kaynak: k.kaynak, kenar: k.kenar, hedef: k.hedef, dolaylı: k.hedef !== k.kaynak },
      { satir: k.satir, sutun: k.sutun }),
  }));
}

// ── Topolojik sıra + döngü (Kahn, kararlı) ────────────────────────────────────

/**
 * Kahn topolojik sıralaması — KARARLI (in-derece 0 olanlar arasında `kod`'a göre
 * seçilir → deterministik, `Math.random`/zaman yok). Döngüde kalanlar `dongu`'da.
 */
export function topolojikSira(dag: Dag): SiraSonuc {
  const inDeg = new Map<string, number>();
  for (const [kod, d] of dag.dugumler) inDeg.set(kod, d.oncekiler.length);

  const yerlesti = new Set<string>();
  const sira: string[] = [];
  const sonraki = (): string | undefined =>
    [...dag.dugumler.keys()]
      .filter((k) => !yerlesti.has(k) && (inDeg.get(k) ?? 0) === 0)
      .sort()[0];

  for (let k = sonraki(); k !== undefined; k = sonraki()) {
    yerlesti.add(k);
    sira.push(k);
    for (const s of dag.dugumler.get(k)!.sonrakiler) inDeg.set(s, (inDeg.get(s) ?? 1) - 1);
  }

  const dongu = [...dag.dugumler.keys()].filter((k) => !yerlesti.has(k)).sort();
  return { sira, dongu };
}

/**
 * Verilen Adım listesini MOTOR sırasına dizer (ORK-3 · ZINCIR-A03): elle
 * argüman-sırası yerine Kahn topolojik rütbesi. Grafikte olmayan kodlar sona
 * (aralarında verilen sıra korunur — kararlı sort).
 */
export function motorSirala(adimlar: readonly string[], dag: Dag): string[] {
  const { sira } = topolojikSira(dag);
  const rutbe = new Map(sira.map((k, i) => [k, i]));
  return [...adimlar].sort(
    (a, b) => (rutbe.get(a) ?? Number.MAX_SAFE_INTEGER) - (rutbe.get(b) ?? Number.MAX_SAFE_INTEGER));
}

// ── ADIM-SEÇİCİ (RAY-3 · ŞEF runtime envanteri) ──────────────────────────────
//   Bu bölüm, ŞEF runtime çalışmasının Adım-seçici kaleminden doğmuştur. O kalemin
//   plan kaydı bugün repo İÇİNDE, `arsiv/omurga-v0-plan-kapali/orkestrasyon/sef_plani.sar`
//   gövdesinde yaşar. Arşiv gövdesi CANLI bir `.sar` ilanı olmadığı için taşıdığı
//   Adım kodu motorun çözebileceği bir tanım vermez; bu yüzden köken burada kodla
//   değil anlatıyla anılır.
//   ŞEF döngüsünün "sıradaki koşulabilir işi seç" ucu. STR-3 AÇIK mekanizma:
//   motor HANGİ Adımların KOŞULABİLİR olduğunu deterministik hesaplar (DAG'dan);
//   koşulabilirler arasından HANGİSİNİN seçileceği/kime atanacağı ZEKÂ'nın işidir
//   (Apex politikası — GİZLİ, STR-3). Panel yol-haritası ve ŞEF traversal bunu
//   okur; "makine takip eder, insan elle wire etmez" (blokRayi'nin Adım ikizi).

/** Bir kodun Adım yaşam-döngüsü açısından "bitmiş" sayılıp sayılmadığı. Öncül
 *  kapısı: yalnız tamamlandı bir öncül ardılın önünü açar (ORK-3.1 durum-tutarlılığı
 *  ile aynı ölçüt). Durumsuz öncül (Teknoloji/Takım) ve Adım-dışı düğüm nötrdür —
 *  iş ilerlemesi taşımaz, önü kapatmaz (ADIM_YASAM_DURUMLARI süzgeci). */
function onculAcik(kod: string, dag: Dag): boolean {
  const d = dag.dugumler.get(kod);
  if (!d) return true;                                   // çözülmeyen öncül sıra hesabına girmez (kopuk-zincir işi)
  if (!d.durum || !ADIM_YASAM_DURUMLARI.has(d.durum)) return true;   // durumsuz/Adım-dışı = nötr
  return d.durum === "tamamlandı";
}

export interface SecilebilirAdim {
  kod: string;
  ne: string;                 // Adım'ın niyeti (ilk cümle — panel/ŞEF için)
  durum: string;              // beklemede · geliştirmede
  dosya: string;
  satir: number;
  aktif: boolean;             // geliştirmede mi (aktif cephe — ORK-3.2: önce bunu bitir)
  bekleyenOncul: string[];    // henüz tamamlanmamış Adım öncülleri (boşsa koşulabilir)
}

/**
 * Koşulabilir (hazır) Adımları topolojik sırada döndürür — ŞEF'in "şimdi ne
 * koşulabilir?" sorusunun deterministik cevabı. Ölçüt:
 *   • durum ∈ { beklemede, geliştirmede }  (tamamlandı/bloklu/doğrulanmamış hariç)
 *   • bütün Adım öncülleri tamamlandı (öncül bitmeden ardıl koşamaz — ORK-3.1)
 * Ders dünyası (INDEKS_DISI) ürün gündemine girmez (OGR-5). geliştirmede olanlar
 * ÖNE alınır (aktif cephe — ORK-3.2: yarım işi bitir, yeni açma), ardından beklemede
 * hazırlar; her küme kendi içinde topolojik rütbede (kararlı).
 */
export function secilebilirAdimlar(dag: Dag): SecilebilirAdim[] {
  const { sira } = topolojikSira(dag);
  const rutbe = new Map(sira.map((k, i) => [k, i]));
  const aday: SecilebilirAdim[] = [];
  for (const [kod, d] of dag.dugumler) {
    if (d.tip !== "Adım") continue;
    if (INDEKS_DISI.test(d.dosya)) continue;                       // OGR-5: ders dünyası gündeme girmez
    if (d.durum !== "beklemede" && d.durum !== "geliştirmede") continue;
    // Adım öncülleri: durumsuz/Adım-dışı kenarlar (Teknoloji bağımlılığı) elenir.
    const bekleyen = d.oncekiler.filter((o) => !onculAcik(o, dag));
    if (bekleyen.length) continue;                                 // henüz hazır değil
    aday.push({ kod, ne: (d.ne ?? "").split(/[.\n]/)[0].trim(), durum: d.durum!,
                dosya: d.dosya, satir: d.satir, aktif: d.durum === "geliştirmede",
                bekleyenOncul: [] });
  }
  return aday.sort((a, b) => {
    if (a.aktif !== b.aktif) return a.aktif ? -1 : 1;              // geliştirmede önce (ORK-3.2)
    return (rutbe.get(a.kod) ?? 0) - (rutbe.get(b.kod) ?? 0);      // sonra topolojik rütbe
  });
}

/** Sıradaki TEK Adım — koşulabilirlerin ilki (aktif cephe önce). ŞEF bir sonraki
 *  işi bundan alır; hiç koşulabilir yoksa undefined (ray boşaldı ya da hepsi
 *  bekleyen-öncüllü/bloklu — motor-susmaz gündemi bunu ayrıca raporlar). */
export function siradakiAdim(dag: Dag): SecilebilirAdim | undefined {
  return secilebilirAdimlar(dag)[0];
}

export interface RayBlok {
  kod: string;
  ad: string;
  dosya: string;
  satir: number;
  sutun: number;
  durum: "beklemede" | "geliştirmede" | "tamamlandı";   // Adımlardan TÜRETİLİR (tek tanım)
  oncekiler: string[];   // topolojik önce gelmesi gereken Blok'lar (bağımlı DAG'ından)
  sira: number;          // 1-tabanlı ray sırası
}

/**
 * Blok→ray OTOMATİK iniş (E1-A07 · Founder 2026-07-13 · anadizin-takip mekanizması):
 * "bir blok açıldığında ray'a otomatik inmeli — makine takip eder, insan elle wire
 * etmez." Tüm ilan edilmiş Blok'ları toplar, bağımlı DAG'ının topolojik sırasına
 * OTOMATİK oturtur (elle koşar-listesi YOK) ve durumlarını Adımlardan TÜRETİR.
 * Deterministik MEKANİZMA (STR-3 AÇIK tarafı); "hangi Blok önce/hangi ajan koşar" =
 * ZEKÂ, kapsam dışı (STR-3 gizli). Panel yol-haritası + ŞEF traversal bunu okur —
 * yeni Blok ilanı elle-bağlamasız rayda görünür.
 */
export function blokRayi(programlar: ReadonlyMap<string, Program>, dag: Dag): RayBlok[] {
  // ① Blok Dugum'larını + her Blok'un yaprak Adım kodlarını topla (durum + Blok-düzeyi öncelik türetimi).
  const blokDugum = new Map<string, Dugum>();
  const blokAdimlari = new Map<string, Set<string>>();   // Blok kodu → içindeki Adım kodları
  const gez = (n: Dugum, sahipBlok?: string): void => {
    let blok = sahipBlok;
    if (n.tur === "widget" && n.ad === "Blok") {
      const kod = kodDeger(n);
      if (kod) { blok = kod; if (!blokDugum.has(kod)) { blokDugum.set(kod, n); blokAdimlari.set(kod, new Set()); } }
    } else if (n.tur === "widget" && n.ad === "Adım" && blok) {
      const kod = kodDeger(n);
      if (kod) blokAdimlari.get(blok)?.add(kod);
    }
    n.cocuklar.forEach((c) => gez(c, blok));
  };
  for (const [, p] of programlar) p.bildirimler.forEach((b) => gez(b));

  const kodlar = new Set<string>([...blokDugum.keys()]);
  // ② Adım → sahip Blok tersi (Blok-düzeyi öncelik için).
  const adimBlok = new Map<string, string>();
  for (const [blok, adimlar] of blokAdimlari) for (const a of adimlar) adimBlok.set(a, blok);

  // ③ Blok-düzeyi öncelik: Blok X'in bir Adımı, Blok Y'nin bir Adımına (Y≠X) bağımlıysa Y, X'ten ÖNCE.
  //    (Blok→Blok bağımlı kenarı ORK-1.2'de yaprak Adımlara genişler — öncelik Adım kenarlarından TÜRETİLİR.)
  const blokOncekiler = new Map<string, Set<string>>([...kodlar].map((k) => [k, new Set<string>()]));
  for (const [blok, adimlar] of blokAdimlari) {
    for (const a of adimlar) {
      for (const onceki of dag.dugumler.get(a)?.oncekiler ?? []) {
        const sahip = adimBlok.get(onceki);
        if (sahip && sahip !== blok) blokOncekiler.get(blok)!.add(sahip);
      }
    }
  }

  // ④ Blok-DAG'ı üstünde KARARLI Kahn topolojik sıralaması (bağımsızlar alfabetik — deterministik).
  const inDeg = new Map<string, number>([...kodlar].map((k) => [k, blokOncekiler.get(k)!.size]));
  const sonrakiBlok = new Map<string, string[]>([...kodlar].map((k) => [k, []]));
  for (const [blok, onc] of blokOncekiler) for (const o of onc) sonrakiBlok.get(o)!.push(blok);
  const yerlesti = new Set<string>();
  const sirali: string[] = [];
  const sonraki = () => [...kodlar].filter((k) => !yerlesti.has(k) && (inDeg.get(k) ?? 0) === 0).sort((a, b) => a.localeCompare(b, "tr"))[0];
  for (let k = sonraki(); k !== undefined; k = sonraki()) {
    yerlesti.add(k); sirali.push(k);
    for (const s of sonrakiBlok.get(k) ?? []) inDeg.set(s, (inDeg.get(s) ?? 1) - 1);
  }
  for (const k of [...kodlar].filter((k) => !yerlesti.has(k)).sort((a, b) => a.localeCompare(b, "tr"))) sirali.push(k);   // döngüde kalan (savunmacı)

  return sirali.map((kod, i) => {
    const dug = blokDugum.get(kod)!;
    const dd = dag.dugumler.get(kod);
    const t = durumTuret(adimDurumlariTopla(dug));
    const durum: RayBlok["durum"] = t.bitti ? "tamamlandı" : t.gelistirmede > 0 ? "geliştirmede" : "beklemede";
    const adDeger = [...dug.parametreler, ...dug.ozellikler].find((p) => p.ad === "ad" || p.ad === "ne")?.deger.metin;
    return {
      kod, ad: adDeger ?? kod, dosya: dd?.dosya ?? "?", satir: dug.satir, sutun: dug.sutun,
      durum, oncekiler: [...blokOncekiler.get(kod)!].sort((a, b) => a.localeCompare(b, "tr")), sira: i + 1,
    };
  });
}

/**
 * Kayıp-kenar türetme (ORK-1.2 · ZINCIR-A04 · saf): bir Adım'ın `referans` hedefi,
 * BAŞKA bir Adım'ın `üretir` meyvesiyse ama aralarında (geçişli) bağımlılık yoksa
 * "kenar mı unuttun?" uyarısı. Zorunlu-beyan SESSİZLİĞİ yakalar; bu kural YANLIŞ
 * bağımsızlık beyanını yakalar. Yalnız ADAY önerir — otomatik kenar YAZMAZ (kenar beyanı insanın ya da ajanın kalemidir).
 */
export function kayipKenarTanilari(
  dag: Dag,
  programlar: ReadonlyMap<string, Program>,
): Array<{ dosya: string; tani: Tani }> {
  // ① meyve haritası: KOD → üreten Adım (üretir kenarından)
  const ureten = new Map<string, string>();
  // ② Adım → referans hedefleri
  const referanslar = new Map<string, string[]>();
  const gez = (node: Dugum): void => {
    const kod = kodDeger(node);
    if (kod && node.tur === "widget" && node.ad === "Adım") {
      const u = param(node, "üretir");
      if (u) for (const t of kenarHedefleri(u)) if (!ureten.has(t)) ureten.set(t, kod);
      const r = param(node, "referans");
      if (r) referanslar.set(kod, kenarHedefleri(r));
    }
    for (const c of node.cocuklar) gez(c);
  };
  for (const [, p] of programlar) for (const b of p.bildirimler) gez(b);

  // geçişli öncül kümesi (yanlış-pozitif önleme: zincir zaten sıralıyorsa susar)
  const oncullerTum = (kod: string): Set<string> => {
    const kume = new Set<string>();
    const yigin = [...(dag.dugumler.get(kod)?.oncekiler ?? [])];
    while (yigin.length) {
      const k = yigin.pop()!;
      if (kume.has(k)) continue;
      kume.add(k);
      yigin.push(...(dag.dugumler.get(k)?.oncekiler ?? []));
    }
    return kume;
  };

  const out: Array<{ dosya: string; tani: Tani }> = [];
  for (const [adim, hedefler] of referanslar) {
    const d = dag.dugumler.get(adim);
    if (!d) continue;
    if (d.durum === "tamamlandı") continue;   // ORK-3.2·B-05: bitmiş işte üretim-sırası moot — kayıp-kenar susar (konisiz-adım "olgun denetle" ilkesi)
    const onculler = oncullerTum(adim);
    for (const hedef of hedefler) {
      const sahibi = ureten.get(hedef);
      if (!sahibi || sahibi === adim) continue;          // meyve değil ya da kendi meyvesi
      if (onculler.has(sahibi)) continue;                 // zincir zaten kurulu (geçişli dahil)
      out.push({
        dosya: d.dosya,
        tani: eskiTani("kayıp-kenar", "uyarı",
          { adım: adim, sahibi, hedef },
          { satir: d.satir, sutun: d.sutun }),
      });
    }
  }
  return out;
}

// ── Karne özeti (YUZ-3 · VIT-K77-A02 · saf) ────────────────────────────────────

export interface KarneOzeti {
  dugum: number;                      // KOD'lu düğüm toplamı
  adim: number;                       // Adım sayısı
  durumlar: Record<string, number>;   // durum → Adım adedi (yalnız durum taşıyanlar)
}

/** Plan sağlığının tek-bakış özeti — mevcut graf üzerinden, yeni tarama yok.
 *  Adım sayacı kanonik durumTuret'ten (tek tanım: histogram burada,
 *  "bitti/açık-iş" hükmü cekirdek/durum.ts'te — üçüncü tanım doğamaz). */
export function karneOzeti(dag: Dag): KarneOzeti {
  const durumlar: Record<string, number> = {};
  const adimDurumlari: (string | undefined)[] = [];
  for (const [, d] of dag.dugumler) {
    if (d.tip !== "Adım") continue;
    // OGR-5 · ÖRNEK-DÜNYASI MUAFİYETİ: ders kapsamındaki (INDEKS_DISI) Adımlar
    // ürün karnesine girmez — karne satırı ürün ağacının gerçeğini söyler.
    // Ders dünyası gizlenmez: sayısı denetim çıktısında ayrı satırla raporlanır.
    if (INDEKS_DISI.test(d.dosya)) continue;
    adimDurumlari.push(d.durum);
    if (d.durum) durumlar[d.durum] = (durumlar[d.durum] ?? 0) + 1;
  }
  return { dugum: dag.dugumler.size, adim: durumTuret(adimDurumlari).toplam, durumlar };
}

// ── Denetim tanıları (döngü = hata) ───────────────────────────────────────────

/**
 * Durum-tutarlılığı (ORK-3.1 · GLM lig bulgusu 2026-07-10): bir Adım `tamamlandı`
 * ise, `durum` taşıyan TÜM öncülleri de `tamamlandı` olmalı — öncül bitmeden iş
 * bitmiş olamaz (topolojik durum-denetimi; sahte-yeşilin zincir hali). Durumsuz
 * öncüller (Teknoloji vb.) atlanır. Düzey: HATA — STR-4 kademe deseni tamamlandı:
 * uyarıyla yaşadı (oturum 28, gerçek ihlal DGS-09↔DGS-06 bulundu+düzeltildi),
 * repo yeşilken terfi etti (oturum 29 · DURUM-TUTARLILIK-HATA-TERFI). Saf.
 */
export function durumTutarlilikTanilari(dag: Dag): Array<{ dosya: string; tani: Tani }> {
  const out: Array<{ dosya: string; tani: Tani }> = [];
  for (const [, d] of dag.dugumler) {
    if (d.tip !== "Adım" || d.durum !== "tamamlandı") continue;
    for (const onceKod of d.oncekiler) {
      const once = dag.dugumler.get(onceKod);
      if (!once?.durum || once.durum === "tamamlandı") continue;   // durumsuz öncül nötr
      // Adım yaşam-döngüsü DIŞI durum taşıyan öncül (Teknoloji durum:aktif gibi)
      // "bitmemiş iş" değil, seçim/yaşam-döngüsü beyanıdır — nötr sayılır
      // (OS kataloğu bulgusu 2026-07-20: bağımlı [SARMAL] sahte durum-tutarsızlığı).
      if (!ADIM_YASAM_DURUMLARI.has(once.durum)) continue;
      out.push({
        dosya: d.dosya,
        tani: eskiTani("durum-tutarsızlığı", "hata",
          { kod: d.kod, öncül: onceKod, öncülDurumu: once.durum },
          { satir: d.satir, sutun: d.sutun }),
      });
    }
  }
  return out;
}

/**
 * Kopuk-zincir tanıları (ORK-1.2 ① ikinci yarı · saf): `bağımlı`/`besler` hedefi hiçbir
 * KOD'lu düğüme çözülmediyse kenar grafiğe GİRMEMİŞTİR — motor o Adım'ı yanlış sırada
 * koşabilir. Eskiden sessizce düşüyordu (referansTanilari yalnız ana.sar'a bakar);
 * artık uyarı: zincir kopuk, hedef ya yazım hatası ya doğmamış düğüm.
 */
export function kopukZincirTanilari(dag: Dag): Array<{ dosya: string; tani: Tani }> {
  return dag.kopuk.map((k) => ({
    dosya: k.dosya,
    tani: eskiTani("kopuk-zincir", "uyarı",
      { kaynak: k.kaynak, kenar: k.kenar, hedef: k.hedef },
      { satir: k.satir, sutun: k.sutun }),
  }));
}

/** DAG döngü tanıları — döngüdeki her düğüm için `döngüsel-bağımlılık` HATASI (saf).
 *  Dosya-bazlı döner (denetleKomutu `raporla(dosya, tani)` deseniyle uyumlu). */
export function dagTanilari(dag: Dag): Array<{ dosya: string; tani: Tani }> {
  const { dongu } = topolojikSira(dag);
  return dongu.map((kod) => {
    const d = dag.dugumler.get(kod)!;
    return {
      dosya: d.dosya,
      tani: eskiTani("döngüsel-bağımlılık", "hata", { kod }, { satir: d.satir, sutun: d.sutun }),
    };
  });
}

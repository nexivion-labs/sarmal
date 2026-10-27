// ═══════════════════════════════════════════════════════════════════════════
// minigraf-cekirdek.ts — 🕸️ MİNİ GRAF çekirdeği (SAF — vscode importsuz)
//
//   Tek, dikey ve okunur bir proje yüzü: düzenli ağaç. Saklı Dag'daki
//   Faz → Blok → Katman → AltKatman → Adım kapsama bağları girinti ve ince L
//   biçimli çizgilerle, her düğüm kendi satırında gösterilir. Seçim grafı
//   daraltmaz; tüm proje görünür kalır. Tip simgesi TIP-0 kanonundan, durum
//   noktasının rengi YUZ-4 durum kanonundan gelir. Betik ve yeni tarama yoktur.
// ═══════════════════════════════════════════════════════════════════════════

import { ZEMIN_TIPLERI, type Dag, type DagDugum } from "../../cekirdek/src/dag.ts";
import { durumTuret, kapsayiciEvre } from "../../cekirdek/src/durum.ts";
import { DURUM_ROZET, type Durum } from "./yol-dekor.ts";
import { MINI_GRAF_METINLERI, kanonikWidgetAdi } from "./yuzey-metinleri.ts";
import { tipSimgesi } from "./simge-cizelgesi.ts";

/**
 * TİP SİMGESİ artık TEK KAYNAK ÇİZELGEDEN okunur (VIT-KIMLIK-A03 ·
 * simge-cizelgesi.ts): iki kademeli kanon okuması (tip → aile) oraya taşındı,
 * çünkü ölçülmüş kusur şuydu — Mini Graf ile Yol Haritası simgeleri ayrı
 * yerlerden okuyordu ve ayrışmayı hiçbir kapı yakalamadı. Cam merceğin simgesi
 * EMOJİ kalır (kanon `tipSimgeleriNot` hükmü: emoji Mini Graf merceğinde
 * yaşar); geometrik SVG'ler grafik ağaç yüzeylerinin karşılığıdır.
 * Dışa aktarım eski tüketiciler için korunur.
 */
export { tipSimgesi } from "./simge-cizelgesi.ts";

/** Kendi rayı olan plan tipleri. Teknoloji ve Takım da KÖKTÜR: kapsayıcıların
 *  üstünde durduğu zemin bunlardır, dolayısıyla hiçbir şeyin altında değillerdir. */
export type MiniGrafTipi = "Faz" | "Blok" | "Katman" | "AltKatman" | "Adım" | "Teknoloji" | "Takım";

/** MEYVE BİR TİP DEĞİL ROLDÜR: bir düğüm meyve olarak çizilir çünkü bir Adım onu
 *  `üretir` demiştir, kendi tipi ne olursa olsun (Kod · Veri · Ekran · Beceri …).
 *  Bu yüzden graf düğümünün tipi kapalı bir birleşim değildir. */
export type GrafTipi = MiniGrafTipi | (string & {});

const TIP_DERINLIK: Record<MiniGrafTipi, number> = {
  Faz: 0,
  Blok: 1,
  Katman: 2,
  AltKatman: 3,
  Adım: 4,
  Teknoloji: 0,
  Takım: 0,
};

/** Meyve rolünün rayı — Adım'ın bir altında ayrı kademe. Satır kapsama rayına
 *  ASILMAZ: onu üreten Adım'a `üretir` kenarıyla bağlanır, çünkü üretim kökeni
 *  mimari sarmanın dilinde çizilemez (ORK-1.3 · YUZ-3.2). */
export const MEYVE_DERINLIK = 5;

const GORUNEN_TIPLER = new Set<string>(Object.keys(TIP_DERINLIK));

export interface ProjeGrafDugumu {
  kod: string;
  ad: string;
  tip: GrafTipi;
  durum?: Durum;
  dosya: string;
  satir: number;
  derinlik: number;
  /** Satırın ÜSTÜNDE duran satır — yerleşim alanıdır, kenar sınıfı değildir.
   *  Plan satırlarında mimari kapsayandır (ORK-1.1) ve kapsama rayıyla çizilir;
   *  meyve satırında ise onu ÜRETEN Adımdır ve kapsama rayıyla ÇİZİLMEZ, çünkü
   *  üretim kökeni kendi `üretir` kenarını taşır (ORK-1.3 · YUZ-3.2). */
  ustKod?: string;
  secili: boolean;
  /** Meyve rolündeki düğümün BEYAN ettiği teslim yolu (`dosya:`). */
  beyanYolu?: string;
  /** Meyve rolü: beyan edilen yolun diskte karşılığı var mı? Beyansız meyvede
   *  tanımsız kalır — beyan edilmemiş bir teslim "diskte yok" diye suçlanamaz. */
  diskte?: boolean;
  /** Adım: bu Adım'ın `üretir` ile beyan ettiği meyve sayısı (SEÇİMDEN BAĞIMSIZ). */
  meyveSayisi?: number;
  /** Adım: beyan edilmiş ama diskte bulunamayan meyve sayısı (SEÇİMDEN BAĞIMSIZ). */
  eksikMeyve?: number;
}

export interface ProjeGrafBagi {
  once: string;
  sonra: string;
  /**
   * Kenarın SINIFI veride taşınır, çizimde tahmin edilmez. Dört sınıf dört ayrı
   * anlam taşır ve hiçbiri ötekinin dilinde çizilemez (ORK-1 · YUZ-3.2):
   *   `adım`   → Adımlar arası yürütme sırası (`bağımlı|besler` · ORK-1.2), eğri;
   *   `zemin`  → kapsayıcının Takım/Teknoloji bağı, kesikli dirsek;
   *   `üretir` → Adım→Meyve üretim kökeni (ORK-1.3), noktalı düz iniş.
   * Kapsama (mimari görünürlük · ORK-1.1) kenarı bu listede DEĞİLDİR: o, satırın
   * `ustKod` alanından türer ve grafın iskeletini çizer.
   */
  tur: "adım" | "zemin" | "üretir";
}

export interface ProjeGrafi {
  dugumler: ProjeGrafDugumu[];
  baglar: ProjeGrafBagi[];
}

/** YUZ-4 tema-token'ını webview CSS değişkenine çevirir. */
export function temaDegiskeni(token?: string): string {
  return token
    ? `var(--vscode-${token.replace(/\./g, "-")})`
    : "var(--vscode-descriptionForeground)";
}

export function durumRengi(durum?: Durum): string {
  return temaDegiskeni(durum ? DURUM_ROZET[durum]?.renk : undefined);
}

function meşruDurum(durum?: string): Durum | undefined {
  return durum && durum in DURUM_ROZET ? durum as Durum : undefined;
}

/** Düğümün en yakın GÖRÜNEN atasını bulur; aradaki gösterilmeyen tipler rayı koparmaz. */
function gorunenAta(dag: Dag, kod: string, gorunen: ReadonlySet<string>): string | undefined {
  let cur = dag.dugumler.get(kod)?.kapsayan;
  const gorulen = new Set<string>();
  while (cur && !gorulen.has(cur)) {
    gorulen.add(cur);
    if (gorunen.has(cur)) return cur;
    cur = dag.dugumler.get(cur)?.kapsayan;
  }
  return undefined;
}

/** Kapsayıcının durumunu altındaki Adımlardan YUZ-4'nın kanonik türetmesiyle okur. */
function kapsayiciDurumu(kod: string,
                         ham: ReadonlyMap<string, DagDugum>,
                         cocuklar: ReadonlyMap<string, string[]>): Durum | undefined {
  const durumlar: Array<string | undefined> = [];
  const yigin = [...(cocuklar.get(kod) ?? [])];
  const gorulen = new Set<string>();
  while (yigin.length) {
    const altKod = yigin.pop()!;
    if (gorulen.has(altKod)) continue;
    gorulen.add(altKod);
    const alt = ham.get(altKod);
    if (!alt) continue;
    if (alt.tip === "Adım") durumlar.push(alt.durum);
    else yigin.push(...(cocuklar.get(altKod) ?? []));
  }
  if (!durumlar.length) return undefined;
  const evre = kapsayiciEvre(durumTuret(durumlar));
  return evre === "bitti" ? "tamamlandı" : evre === "sürüyor" ? "geliştirmede" : "beklemede";
}

/**
 * Saklı Dag'ı tek proje grafına sadeleştirir. Kapsama sırası kaynak sırasını
 * koruyan derinlik-öncelikli bir yürüyüştür; seçim yalnız işaretlenir, veri
 * kırpılmaz. AltKatman ayrı bir raydır.
 *
 * KAPSAM SÜZGECİ (Founder hükmü 2026-07-28): graf YALNIZ ODAKTAKİ VARLIĞI
 * gösterir. Süzgeç düğümün geldiği DOSYAYA sorulur ve üç tanı yüzeyinin
 * kullandığı süzgeçle AYNI kapıdır; ikinci bir kapsam mekanizması kurulmaz.
 * Kapsam dışı düğüm grafa hiç girmez, dolayısıyla ne rayda ne bağımlılık
 * ağında görünür; kapsam dışı bir ata yüzünden çocuk düğüm kaybolmaz, çünkü
 * kapsayan çözümü yalnız GÖRÜNEN düğümler arasında yürür.
 *
 * MEYVE KAPISI (VIT-GRAF-A12): dördüncü parametre bir meyvenin BEYAN ettiği
 * yolun diskte karşılığı olup olmadığını söyler. Çekirdek dosya sistemine
 * bakmaz — kapı kabuktan gelir, tıpkı kapsam süzgecinin gelişi gibi. Meyve
 * SAYACI her Adım için hesaplanır (kullanıcı beyan ile gerçek arasındaki farkı
 * seçim yapmadan görür), meyve SATIRI ise yalnız seçili Adım'ın altında açılır
 * (aksi hâlde graf beş yüz satır meyveyle okunmaz hâle gelirdi).
 */
export function projeGrafiCikar(dag: Dag, seciliKod = "",
                                kapsamda: (dosya: string) => boolean = () => true,
                                meyveVar: (beyanYolu: string) => boolean = () => true): ProjeGrafi {
  const ham = new Map<string, DagDugum>();
  for (const [kod, d] of dag.dugumler) {
    if (!GORUNEN_TIPLER.has(d.tip)) continue;
    if (!kapsamda(d.dosya)) continue;
    ham.set(kod, d);
  }
  const gorunen = new Set(ham.keys());

  const ustler = new Map<string, string | undefined>();
  const cocuklar = new Map<string, string[]>();
  for (const kod of gorunen) {
    // MEVSİM AİDİYETİ (VIT-GRAF-A12 · Founder bildirimi 2026-08-10): bağını
    // `mevsim:` alanıyla ya da Faz'ın `çağır` listesiyle kuran Blok fiziksel
    // olarak hiçbir kapsayıcının içinde yaşamadığından grafta köksüz görünüyordu
    // ve Faz satırları çocuksuz düz bir liste gibi duruyordu (ölçüm: canlı
    // korpusta 18 çağır kenarının sıfırı grafa iniyordu, 23 Blok köktü). Motor
    // bağı düğümün `mevsim` alanına indirir (dag.ts); yerleşim onu fiziksel
    // atası olmayan Blok için kapsayan sayar, dolayısıyla Blok kendi Fazının
    // altında gruplanır ve kapsama rayı bağı çizer. Bağ AYRI bir kenar sınıfı
    // olarak ÇİZİLMEZ: motor üç yazımı (iç içe geçme · çağır · mevsim:) tek
    // kapsama kenarına normalize eder ve aynı olgu iki görsel dille anlatılamaz
    // (ORK-1); mevsim bağı da kapsama rayının dilinde okunur. Fazı kapsam
    // dışında kalan Blok köksüz kalır — bağ gizlenmez, yalnız çizilemez.
    const d = ham.get(kod)!;
    const ust = gorunenAta(dag, kod, gorunen)
      ?? (d.tip === "Blok" && d.mevsim && gorunen.has(d.mevsim) ? d.mevsim : undefined);
    ustler.set(kod, ust);
    if (ust) (cocuklar.get(ust) ?? cocuklar.set(ust, []).get(ust)!).push(kod);
  }

  const sirali: string[] = [];
  const ziyaret = new Set<string>();
  const gez = (kod: string): void => {
    if (ziyaret.has(kod)) return;
    ziyaret.add(kod);
    sirali.push(kod);
    for (const alt of cocuklar.get(kod) ?? []) gez(alt);
  };
  for (const kod of gorunen) if (!ustler.get(kod)) gez(kod);
  for (const kod of gorunen) gez(kod); // savunmacı: bozuk kapsayan döngüsünde düğüm kaybolmaz

  // Bir Adım'ın meyveleri: `üretir` beyanı çözülmüş, kapsamda ve henüz rayda
  // OLMAYAN hedefler. Kendisi zaten bir plan rayında yaşayan bir hedef meyve
  // satırı olarak İKİNCİ kez basılmaz — aynı kod iki satırda görünemez.
  const meyveleri = (adimKod: string): DagDugum[] => {
    const out: DagDugum[] = [];
    const gorulenMeyve = new Set<string>();
    for (const hedef of dag.dugumler.get(adimKod)?.üretiyor ?? []) {
      if (gorulenMeyve.has(hedef) || gorunen.has(hedef)) continue;
      const m = dag.dugumler.get(hedef);
      if (!m || !kapsamda(m.dosya)) continue;
      gorulenMeyve.add(hedef);
      out.push(m);
    }
    return out;
  };
  /** Beyansız meyve "diskte yok" diye suçlanamaz — hükümsüz kalır (tanımsız). */
  const diskteMi = (m: DagDugum): boolean | undefined =>
    m.beyanYolu ? meyveVar(m.beyanYolu) : undefined;

  // KENAR SİCİLİ düğüm döngüsünden ÖNCE açılır, çünkü meyve satırı doğduğu anda
  // kendi `üretir` kenarını da doğurur; satır ile kenar tek yerde tutulmazsa bir
  // meyve grafta bağsız asılı kalabilir.
  const baglar: ProjeGrafBagi[] = [];
  const gorulenBag = new Set<string>();
  const bagEkle = (once: string, sonra: string, tur: ProjeGrafBagi["tur"]): void => {
    if (!gorunen.has(once) || once === sonra) return;   // görünmeyen uç süzgeci HER kenar sınıfında geçerlidir
    const anahtar = `${once}\u0000${sonra}`;
    if (gorulenBag.has(anahtar)) return;
    gorulenBag.add(anahtar);
    baglar.push({ once, sonra, tur });
  };

  const dugumler: ProjeGrafDugumu[] = [];
  for (const kod of sirali) {
    const d = ham.get(kod)!;
    const tip = d.tip as MiniGrafTipi;
    const durum = meşruDurum(d.durum) ?? (tip === "Adım" ? undefined : kapsayiciDurumu(kod, ham, cocuklar));
    const satirDugumu: ProjeGrafDugumu = {
      kod,
      ad: d.ad ?? kod,
      tip,
      durum,
      dosya: d.dosya,
      satir: d.satir,
      derinlik: TIP_DERINLIK[tip],
      ustKod: ustler.get(kod),
      secili: kod === seciliKod,
    };
    dugumler.push(satirDugumu);
    if (tip !== "Adım") continue;

    const meyve = meyveleri(kod);
    if (!meyve.length) continue;
    // SAYAÇ HER ADIM İÇİN: kullanıcı beyan ile gerçek arasındaki farkı hiçbir
    // seçim yapmadan görür; eksik meyve seçime saklanmaz.
    satirDugumu.meyveSayisi = meyve.length;
    satirDugumu.eksikMeyve = meyve.filter((m) => diskteMi(m) === false).length;

    // SATIR YALNIZ SEÇİLİ ADIM İÇİN: bütün meyveler hep birden basılsaydı graf
    // canlı korpusta 609 satırdan 873 satıra çıkar ve okunmaz hâle gelirdi (Adımın
    // sınır maddesi okunabilirliği önceliklendirir). Seçilmeyen Adımın meyvesi
    // yine de görünmez olmaz: sayacı ve eksik bildirimi alt yazıda durur.
    if (kod !== seciliKod) continue;
    for (const m of meyve) {
      dugumler.push({
        kod: m.kod,
        ad: m.ad ?? m.kod,
        tip: m.tip,
        durum: meşruDurum(m.durum),
        dosya: m.dosya,
        satir: m.satir,
        derinlik: MEYVE_DERINLIK,
        ustKod: kod,
        secili: m.kod === seciliKod,
        beyanYolu: m.beyanYolu,
        diskte: diskteMi(m),
      });
      // ÜRETİM KÖKENİ KENDİ SINIFINDA DOĞAR (ORK-1.3 · YUZ-3.2). Bu satır bir
      // kusuru kapatır: meyve daha önce yalnız `ustKod` ile kapsama rayına
      // asılıyordu, yani üretim kökeni MİMARİ SARMA dilinde çiziliyordu. YUZ-3.2
      // maddesinin örneği bunu adıyla yasaklar — `üretir` bağı "mimari sarma bağı
      // diye yeniden etiketlenmez". Artık kenar veriye kendi sınıfıyla girer ve
      // çizim onu ayrı bir görsel dille söyler.
      bagEkle(kod, m.kod, "üretir");
    }
  }

  // KENARIN SINIFI HEDEFTEN DEĞİL KAYNAĞIN TİPİNDEN doğar. Ölçülmüş kusur
  // (2026-07-29, üretici bildirimi): Teknoloji ve Takım grafa girdiğinde
  // `oncekiler` üzerinden gelen 571 kenar `adım` sınıfında yumuşak eğri olarak
  // çizildi. Sebebi genislet()'tir — kapsayıcının Takım/Teknoloji bağını yaprak
  // Adımlara açar, dolayısıyla her yaprak Adımın `oncekiler` listesinde bir
  // zemin düğümü durur. Sonuç, AYNI ilişkinin iki farklı cümleyle anlatılmasıydı:
  // 151 kez kesikli dirsek (zemin), 571 kez yumuşak eğri (yürütme sırası). Oysa
  // ölçüm bu kenarın hiç sıra taşımadığını söylüyor: kapsayıcı hedeflerinin
  // tamamı Takım ya da Teknoloji, Katman→Katman hedefi sıfırdır.
  for (const d of dugumler) for (const once of ham.get(d.kod)?.oncekiler ?? []) {
    const kaynakTipi = ham.get(once)?.tip;
    bagEkle(once, d.kod, kaynakTipi !== undefined && ZEMIN_TIPLERI.has(kaynakTipi) ? "zemin" : "adım");
  }
  // ZEMİN kenarı: kapsayıcının Takım/Teknoloji bağı. `oncekiler` bunu TAŞIMAZ —
  // genislet() kenarı yaprak Adımlara açtığı için kapsayıcının kendisinde iz
  // kalmaz; dag.ts kenarı bu yüzden ayrıca `zemin` alanında korur ve graf yüzü
  // onu buradan okur. Kenarın sınıfı VERİDE taşınır, çizimde tahmin edilmez.
  for (const d of dugumler) for (const z of ham.get(d.kod)?.zemin ?? []) bagEkle(z, d.kod, "zemin");

  // ── ZEMİN YİNELEMESİNİN KIRPILMASI ────────────────────────────────────────
  // ÖLÇÜLMÜŞ KUSUR (2026-08-08 · bu tur): canlı korpusta (_Sarmal odağı) 423
  // zemin kenarı çiziliyordu ve bunların 331'i bir ATANIN zaten çizdiği cümleyi
  // yineliyordu. Sebebi yine genislet()'tir: bir Katman "şu teknolojinin üstünde
  // duruyorum" dediğinde motor bu kenarı Katmanın BÜTÜN yaprak Adımlarına açar,
  // dolayısıyla graf aynı cümleyi bir kez Katmanda, sonra o Katmandaki her Adımda
  // yeniden söylüyordu. Sonuç iki yönden zararlıydı: birincisi Adımın kabul metni
  // Katman kenarının "Adım kenarlarından ayırt edilmesini" ister, oysa zemin
  // kenarlarının 335'i bir ADIM satırında bitiyordu ve Katmanın cümlesi yaprak
  // kopyalarının altında kayboluyordu; ikincisi ORK-1 aynı bağlantının yinelenmesini
  // yasaklar. Kırpma KAYIPSIZDIR ve bu yüzden meşrudur — ata kenarı yerinde kalır,
  // yaprak da kapsama rayıyla zaten o ataya bağlıdır, dolayısıyla "bu Adım şu
  // teknolojinin üstünde duruyor" bilgisi grafta okunmaya devam eder. Beyanın
  // yapıldığı kademede duran kenar kırpılmaz: Adım düzeyinde ilan edilmiş bir
  // Takım/Teknoloji bağının atasında ikizi yoktur ve olduğu gibi çizilir (ölçüm:
  // 92 kenar bu sebeple yerinde kaldı).
  const zeminHedefleri = new Map<string, Set<string>>();
  for (const b of baglar) {
    if (b.tur !== "zemin") continue;
    (zeminHedefleri.get(b.once) ?? zeminHedefleri.set(b.once, new Set()).get(b.once)!).add(b.sonra);
  }
  const atadaZeminVar = (kaynak: string, hedef: string): boolean => {
    const hedefler = zeminHedefleri.get(kaynak);
    if (!hedefler) return false;
    let ata = ustler.get(hedef);
    const gorulenAta = new Set<string>();
    while (ata && !gorulenAta.has(ata)) {
      gorulenAta.add(ata);
      if (hedefler.has(ata)) return true;
      ata = ustler.get(ata);
    }
    return false;
  };
  return {
    dugumler,
    baglar: baglar.filter((b) => b.tur !== "zemin" || !atadaZeminVar(b.once, b.sonra)),
  };
}

/**
 * İki graf modeli aynı mı (PNL-A14)? Her denetim turu grafı yeniden kurar; Mini Graf ancak model
 * gerçekten değiştiyse yeniden çizilir. Düğümler ve bağlar sırasıyla, her alanıyla karşılaştırılır
 * ve alan listesi elle yazılmaz, böylece modele eklenen yeni bir alan da kendiliğinden ölçülür.
 * Nesne değerli bir alan kimlikle karşılaştırılır ve farklı sayılır; bu yanılgı yalnız fazladan bir
 * çizime yol açar, eksik bir çizime yol açmaz. Ölçüm (Sarmal deposunun kendi planı, 917 düğüm ve
 * 18 613 bağ): karşılaştırma yaklaşık iki milisaniye sürer; modelin JSON özeti on milisaniyeyi,
 * grafın kendisini çizmek ise ağaç görünümünde altı milisaniyeyi bulur.
 */
export function grafEsit(a: ProjeGrafi, b: ProjeGrafi): boolean {
  return kayitlarEsit(a.dugumler, b.dugumler) && kayitlarEsit(a.baglar, b.baglar);
}

function kayitlarEsit(a: readonly object[], b: readonly object[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i] as Record<string, unknown>, y = b[i] as Record<string, unknown>;
    let alan = 0;
    for (const k in x) { if (x[k] !== y[k]) return false; alan += 1; }
    for (const _ in y) alan -= 1;
    if (alan !== 0) return false;
  }
  return true;
}

// ── Düzenli ağaç çizimi ──────────────────────────────────────────────────────
//
//   Founder ekran görüntüsü bulgusu: dar kenar çubuğunda etiketler yedi punto
//   civarında küçülüyor, üst üste biniyor ve kalın renkli bir gövde çizgisi
//   okumayı engelliyordu. Kök sebep SVG'nin `viewBox` ile panele SIĞDIRILMASIYDI:
//   376 birimlik tuval dar panele ölçeklenince yazı da ölçekleniyordu ve satır
//   yüksekliği yazıdan bağımsız kalıyordu. Onarım çizim katmanındadır: her düğüm
//   KENDİ satırındadır, satır yüksekliği sabittir ve yazı gerçek piksel boyundadır.
//   Hiyerarşiyi girinti ile ince L biçimli bağ çizgileri taşır; durum solda
//   küçük bir noktadır; tip adı sağa yaslı soluk bir sütundur ve panel daralınca
//   o sütun ilk gizlenir. Uzun ad üç nokta ile kesilir, tam ad ipucundadır.
//   Çekirdek veri mantığı (projeGrafiCikar) bu değişiklikten etkilenmez.

/** Bir düğüm satırının sabit yüksekliği (px). Yerleşim ve CSS bu tek sabitten beslenir. */
export const SATIR_YUKSEKLIGI = 26;
/** Kademe başına girinti (px). */
export const KADEME_GIRINTISI = 18;

/**
 * Bağ kolu: satırın girinti hücrelerinden birinde çizilen çizgi parçası.
 *   `i` → dikey çizgi sürer (atanın sonraki kardeşi var),
 *   `b` → boş (atanın sonraki kardeşi yok),
 *   `t` → T dirseği (düğümün kendisi, sonraki kardeşi var),
 *   `l` → L dirseği (düğümün kendisi, son kardeş).
 */
export type BagKolu = "i" | "b" | "t" | "l";

export interface AgacSatiri {
  kod: string;
  /** Düğümün graf içindeki sırası (= satır numarası). */
  sira: number;
  /** Satırın üst kenarı (px) — satırlar boşluksuz dizilir, aralıklar örtüşmez. */
  y: number;
  yukseklik: number;
  /** Ata zincirinden türeyen gerçek girinti kademesi (kök = 0). */
  girinti: number;
  /** `girinti` kadar hücre: son hücre düğümün kendi dirseğidir. */
  kollar: BagKolu[];
  /** Altında en az bir satır var mı (durum noktasından aşağı kısa kök çizgisi iner). */
  cocuklu: boolean;
}

/**
 * Grafın satır yerleşimini hesaplar. Girinti `derinlik` alanından DEĞİL ata
 * zincirinden türer: kapsayanı görünmeyen düğüm kökleşir ve boşuna girintili
 * kalmaz. Sıra, `projeGrafiCikar`ın derinlik-öncelikli sırasıdır; bir alt ağaç
 * ardışıktır, dolayısıyla "son kardeş" bilgisi bağ çizgilerini kesintisiz tutar.
 */
export function agacYerlesimi(graf: ProjeGrafi): AgacSatiri[] {
  const ust = new Map(graf.dugumler.map((d) => [d.kod, d.ustKod] as const));
  const sonCocuk = new Map<string, string>();
  const cocukluKodlar = new Set<string>();
  for (const d of graf.dugumler) {
    sonCocuk.set(d.ustKod ?? "", d.kod);
    if (d.ustKod) cocukluKodlar.add(d.ustKod);
  }
  const sonMu = (d: { kod: string; ustKod?: string }): boolean => sonCocuk.get(d.ustKod ?? "") === d.kod;
  /** Kökten düğüme ata zinciri; bozuk döngüde sonsuza gitmez. */
  const zincir = (kod: string): string[] => {
    const z = [kod];
    const gorulen = new Set(z);
    let u = ust.get(kod);
    while (u && ust.has(u) && !gorulen.has(u)) { z.unshift(u); gorulen.add(u); u = ust.get(u); }
    return z;
  };
  const dugumByKod = new Map(graf.dugumler.map((d) => [d.kod, d] as const));
  return graf.dugumler.map((d, sira) => {
    const z = zincir(d.kod);
    const girinti = z.length - 1;
    const kollar: BagKolu[] = [];
    for (let k = 0; k < girinti; k++) {
      const hedef = dugumByKod.get(z[k + 1])!;
      kollar.push(k === girinti - 1 ? (sonMu(hedef) ? "l" : "t") : (sonMu(hedef) ? "b" : "i"));
    }
    return {
      kod: d.kod, sira, y: sira * SATIR_YUKSEKLIGI, yukseklik: SATIR_YUKSEKLIGI,
      girinti, kollar, cocuklu: cocukluKodlar.has(d.kod),
    };
  });
}

/**
 * ÇİZİLECEK BAĞLAR: yalnız SEÇİLİ düğümün bağları; seçili düğüm yoksa hiçbiri.
 * ÖLÇÜLMÜŞ KUSUR (2026-10-22 · Sarmal deposunun gerçek planı): 713 düğümlük
 * grafta 13.380 bağ vardı; hepsini çizen görünüm 1,8-2,0 MB HTML üretiyor, şerit
 * tek bir renkli duvara dönüyor ve panel kasıyordu. Bütün ağ okunmaz; okunan şey
 * "seçtiğim düğüm kime bağlı" sorusunun cevabıdır. Veri (`graf.baglar`) kırpılmaz,
 * yalnız çizim kırpılır; başlıktaki bağ sayısı bütün ağı söylemeye devam eder.
 */
export function cizilecekBaglar(graf: ProjeGrafi): ProjeGrafBagi[] {
  const sec = graf.dugumler.find((d) => d.secili)?.kod;
  if (!sec) return [];
  return graf.baglar.filter((b) => b.once === sec || b.sonra === sec);
}

/** Bundan çok satırlı graf BÜYÜK sayılır: tamamlanmış alt ağaçlar daraltılır. */
export const BUYUK_GRAF_ESIGI = 300;

export interface GorunurGraf {
  graf: ProjeGrafi;
  /** Daraltılan düğüm → altında gizlenen satır sayısı. */
  gizli: Map<string, number>;
}

/**
 * BÜYÜK GRAF DARALTMASI (2026-10-22): gerçek planda 713 düğüm vardı ve her satırı
 * basan görünümler 420-740 KB HTML üretiyordu. Okunmaya değer olan, biten işin
 * dökümü değil sürenin ve bekleyenin yeridir; bu yüzden eşiği aşan grafta bütün
 * Adımları TAMAMLANMIŞ alt ağaçlar (en üst kademede) tek satıra iner ve satırın
 * rozeti kaç satırın gizlendiğini söyler. SEÇİLİ düğümü taşıyan alt ağaç hiç
 * daralmaz. Veri kırpılmaz; yalnız çizilen satırlar azalır.
 */
export function gorunurGraf(graf: ProjeGrafi): GorunurGraf {
  const gizli = new Map<string, number>();
  if (graf.dugumler.length <= BUYUK_GRAF_ESIGI) return { graf, gizli };
  const cocuklar = new Map<string, string[]>();
  for (const d of graf.dugumler) if (d.ustKod) (cocuklar.get(d.ustKod) ?? cocuklar.set(d.ustKod, []).get(d.ustKod)!).push(d.kod);
  const dugum = new Map(graf.dugumler.map((d) => [d.kod, d] as const));
  // Alt ağaç özeti (aşağıdan yukarı): kaç Adım, kaçı tamamlandı, seçili var mı, kaç satır, kaç meyve (ve eksiği).
  const ozet = new Map<string, { adim: number; tamam: number; secili: boolean; satir: number; meyve: number; eksik: number }>();
  const ozetle = (kod: string, derinlik = 0): { adim: number; tamam: number; secili: boolean; satir: number; meyve: number; eksik: number } => {
    const onceki = ozet.get(kod);
    if (onceki) return onceki;
    const d = dugum.get(kod)!;
    const o = { adim: d.tip === "Adım" ? 1 : 0, tamam: d.tip === "Adım" && d.durum === "tamamlandı" ? 1 : 0, secili: d.secili, satir: 1,
      meyve: d.meyveSayisi ?? 0, eksik: d.eksikMeyve ?? 0 };
    ozet.set(kod, o);   // döngüye karşı önce yaz
    if (derinlik < 64) for (const c of cocuklar.get(kod) ?? []) {
      const k = ozetle(c, derinlik + 1);
      o.adim += k.adim; o.tamam += k.tamam; o.secili ||= k.secili; o.satir += k.satir; o.meyve += k.meyve; o.eksik += k.eksik;
    }
    return o;
  };
  const gizlenen = new Set<string>();
  const gez = (kod: string): void => {
    const o = ozetle(kod);
    const alt = cocuklar.get(kod) ?? [];
    if (alt.length && !o.secili && o.adim > 0 && o.tamam === o.adim) {
      gizli.set(kod, o.satir - 1);
      const sil = (k: string): void => { for (const c of cocuklar.get(k) ?? []) { gizlenen.add(c); sil(c); } };
      sil(kod);
      return;
    }
    for (const c of alt) gez(c);
  };
  for (const d of graf.dugumler) if (!d.ustKod) gez(d.kod);
  if (!gizli.size) return { graf, gizli };
  // MEYVE SAYACI DARALMAYLA KAYBOLMAZ: daralan satır gizlediği Adımların meyve sayacını ve eksik
  // bildirimini taşır (sayaç seçimden bağımsızdır, eksik teslim kırpılmaz). Satıra tıklamak onu seçer
  // ve alt ağacı açar; Adımın kendi sayacı ve seçilince meyve satırları oradan okunur.
  const tasi = (d: ProjeGrafDugumu): ProjeGrafDugumu => {
    const o = gizli.has(d.kod) ? ozet.get(d.kod) : undefined;
    return o && o.meyve > 0 ? { ...d, meyveSayisi: o.meyve, eksikMeyve: o.eksik } : d;
  };
  return { graf: { dugumler: graf.dugumler.filter((d) => !gizlenen.has(d.kod)).map(tasi), baglar: graf.baglar }, gizli };
}

/** Bağ şeridinde en çok kaç sütun açılır; fazlası EN DIŞ sütunu paylaşır. */
export const SERIT_EN_COK_SUTUN = 5;
/** Şerit sütunları arası mesafe (px). */
export const SERIT_SUTUN_ARALIGI = 5;

export interface BagYolu {
  once: string;
  sonra: string;
  tur: ProjeGrafiBagiTuru;
  /** Uç satırların merkez y'si (px) — satır yerleşimiyle aynı ölçüden türer. */
  ya: number;
  yb: number;
  /** 0 = ağaca en yakın sütun. */
  sutun: number;
}
type ProjeGrafiBagiTuru = ProjeGrafBagi["tur"];

/**
 * Bağları şerit sütunlarına dağıtır (git log grafiği gibi). Kısa bağlar iç
 * sütunlara girer, aralıkları örtüşen bağlar ayrı sütun alır; sütun sayısı
 * SERIT_EN_COK_SUTUN'u aşarsa kalanlar en dış sütunu paylaşır.
 */
export function bagYerlesimi(graf: ProjeGrafi): { yollar: BagYolu[]; sutunSayisi: number } {
  const sira = new Map(graf.dugumler.map((d, i) => [d.kod, i] as const));
  const adaylar = cizilecekBaglar(graf).flatMap((b) => {
    const a = sira.get(b.once), z = sira.get(b.sonra);
    return a === undefined || z === undefined || a === z ? [] : [{ b, a, z, ust: Math.min(a, z), alt: Math.max(a, z) }];
  }).sort((x, y) => (x.alt - x.ust) - (y.alt - y.ust) || x.ust - y.ust);
  const sutunSonlari: Array<Array<[number, number]>> = [];
  const yollar: BagYolu[] = adaylar.map((c) => {
    let k = sutunSonlari.findIndex((aralik) => aralik.every(([u, a]) => c.alt < u || c.ust > a));
    if (k < 0) k = sutunSonlari.length < SERIT_EN_COK_SUTUN ? sutunSonlari.length : SERIT_EN_COK_SUTUN - 1;
    (sutunSonlari[k] ??= []).push([c.ust, c.alt]);
    return {
      once: c.b.once, sonra: c.b.sonra, tur: c.b.tur,
      ya: c.a * SATIR_YUKSEKLIGI + SATIR_YUKSEKLIGI / 2, yb: c.z * SATIR_YUKSEKLIGI + SATIR_YUKSEKLIGI / 2, sutun: k,
    };
  });
  return { yollar, sutunSayisi: sutunSonlari.length };
}

/** Şeridin genişliği (px); bağ yoksa sıfırdır. */
function seritGenisligi(sutunSayisi: number): number {
  return sutunSayisi ? sutunSayisi * SERIT_SUTUN_ARALIGI + 8 : 0;
}

/** Webview HTML kaçışı (saf modül kendi güvenlik sınırını taşır). */
export function kacir(s: unknown): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function atlaHref(d: Pick<ProjeGrafDugumu, "dosya" | "satir">): string {
  return d.dosya
    ? `command:sarmal.dosyaAc?${encodeURIComponent(JSON.stringify([d.dosya, d.satir]))}`
    : "";
}

/** Satır meyve ROLÜNDE mi çiziliyor — rolün tek görsel gerçeği kendi rayıdır. */
export function meyveRolu(d: ProjeGrafDugumu): boolean {
  return d.derinlik === MEYVE_DERINLIK;
}

function tipAdi(d: ProjeGrafDugumu): string {
  return kanonikWidgetAdi(d.tip, d.tip === "AltKatman" ? "Alt katman" : d.tip);
}

/** Adım satırının meyve sayacı ve eksik bildirimi (SEÇİMDEN BAĞIMSIZ). */
/**
 * Meyve sayacının simgesi: geometrik ailenin Meyve işareti (medya/simgeler/meyve.svg ile
 * aynı şekiller; eşitliği minigraf.test.ts ölçer). Founder 2026-10-22: arayüzde emoji
 * kalmaz; sayaç 🍎 yerine bu işaretle çizilir. Metin bağlamlarında (ipucu, Klasik SVG alt
 * yazısı) işaret basılamadığı için sayaç sözcükle yazılır.
 */
export const MEYVE_SIMGESI_SVG = `<svg class=ms viewBox="0 0 24 24" aria-hidden="true">` +
  `<circle cx="12" cy="13" r="6.2"/><path d="M12 6.8 L12 3.5"/><path d="M9.4 3.5 H14.6"/><circle cx="12" cy="13" r="1.5"/></svg>`;

function meyveRozetleri(d: ProjeGrafDugumu): { sayac?: string; adet?: number; eksik?: string } {
  // Eksik teslim sinyali ASLA kırpılmaz; grafın söylemesi gereken dürüstlük cümlesidir.
  return {
    sayac: d.meyveSayisi ? MINI_GRAF_METINLERI.meyveSayaci(d.meyveSayisi) : undefined,
    adet: d.meyveSayisi || undefined,
    eksik: d.eksikMeyve && d.eksikMeyve > 0 ? MINI_GRAF_METINLERI.eksikMeyve(d.eksikMeyve) : undefined,
  };
}

export function dugumAltYazisi(d: ProjeGrafDugumu): string {
  const tip = tipAdi(d);
  // Meyve rolü: kendi tipini ve BEYAN ettiği teslim yolunu söyler; kullanıcı
  // grafta "bu Adım neyi nereye teslim ediyor" sorusunu okuyabilsin diye.
  if (meyveRolu(d)) return d.beyanYolu ? `${tip} · ${d.beyanYolu}` : tip;
  let s = d.durum ? `${tip} · ${MINI_GRAF_METINLERI.durum(d.durum)}` : tip;
  const r = meyveRozetleri(d);
  if (r.sayac) s += ` · ${r.sayac}`;
  if (r.eksik) s += ` · ${r.eksik}`;
  return s;
}

/** Durum → kısa CSS sınıfı (satır başına satır-içi stil yerine; HTML boyutu için). */
const DURUM_SINIFI: Record<Durum, string> = {
  "tamamlandı": "dt", "geliştirmede": "dg", "beklemede": "db", "doğrulanmamış": "dd", "bloklu": "dk",
};

function satirHtml(d: ProjeGrafDugumu, s: AgacSatiri, gizli = 0): string {
  const bos = d.diskte === false;   // beyan edilmiş ama diskte yok: içi boş nokta
  const kimlik = d.ad === d.kod ? d.kod : `${d.ad} · ${d.kod}`;
  const ipucu = `${kimlik}\n${dugumAltYazisi(d)}` +
    (meyveRolu(d) && d.beyanYolu ? `\n${MINI_GRAF_METINLERI.beyanYolu(bos, d.beyanYolu)}` : "") +
    (gizli ? `\n${MINI_GRAF_METINLERI.gizliSatir(gizli)}` : "");
  const r = meyveRolu(d) ? {} : meyveRozetleri(d);
  // HTML boyutu (ölçülmüş): gerçek planda 713 satır; her satırdaki bayt çarpılır, bu
  // yüzden sınıflar tırnaksızdır ve dolgu öznitelikleri yazılmaz.
  const icerik =
    s.kollar.map((k) => `<i class=g${k}></i>`).join("") +
    `<b class="nokta${d.durum ? " " + DURUM_SINIFI[d.durum] : ""}${bos ? " bos" : ""}${s.cocuklu ? " ac" : ""}"></b>` +
    `<span class=simge>${tipSimgesi(d.tip)}</span>` +
    `<span class=ad>${kacir(d.ad)}</span>` +
    (r.sayac ? `<span class=rozet title="${kacir(r.sayac)}">${MEYVE_SIMGESI_SVG}${r.adet}</span>` : "") +
    (r.eksik ? `<span class="rozet eksik">${kacir(r.eksik)}</span>` : "") +
    (gizli ? `<span class="rozet gz">${kacir(MINI_GRAF_METINLERI.gizliSatir(gizli))}</span>` : "") +
    `<span class=tip>${kacir(meyveRolu(d) ? dugumAltYazisi(d) : tipAdi(d))}</span>`;
  const nitelik = `class="dugum${d.secili ? " secili" : ""}"${d.secili ? ' aria-current="true"' : ""} ` +
    `title="${kacir(MINI_GRAF_METINLERI.kaynakIpucu(ipucu))}"`;
  const href = atlaHref(d);
  return href ? `<a ${nitelik} href="${href}">${icerik}</a>` : `<div ${nitelik}>${icerik}</div>`;
}

/**
 * Bağ şeridi: satırların solunda, SVG'si ağacın ARKASINDAN değil yanından geçer
 * (satırlar şerit genişliği kadar içeriden başlar). Her bağ, kaynak satırın
 * merkezinden hedef satırın merkezine tek bir yumuşak kübik yaydır; sınıfı
 * veriden okunur (adım düz, zemin kesikli, üretir noktalı).
 */
function seritSvg(graf: ProjeGrafi, yerlesim: AgacSatiri[]): string {
  const { yollar, sutunSayisi } = bagYerlesimi(graf);
  if (!yollar.length) return "";
  const G = seritGenisligi(sutunSayisi), R = G - 3;
  const sira = new Map(graf.dugumler.map((d, i) => [d.kod, i] as const));
  const yol = yollar.map((b) => {
    const xc = R - 3 - b.sutun * SERIT_SUTUN_ARALIGI;
    const cx = Math.round((R - (R - xc) * 4 / 3) * 100) / 100;
    const a = sira.get(b.once)!, z = sira.get(b.sonra)!;
    const sinif = b.tur === "adım" ? "bag" : b.tur === "zemin" ? "zemin" : "uretir";
    return `<path class="${sinif}" data-a="${a}" data-b="${z}" ` +
      `d="M ${R} ${b.ya} C ${cx} ${b.ya}, ${cx} ${b.yb}, ${R} ${b.yb}"/>`;
  }).join("");
  return `<svg class="serit" aria-hidden="true" width="${G}" height="${yerlesim.length * SATIR_YUKSEKLIGI}" ` +
    `xmlns="http://www.w3.org/2000/svg">${yol}</svg>`;
}

/** Tek proje grafını düzenli ağaç olarak (satır başına bir düğüm) HTML'e çizer. */
export function projeGrafiAgaci(tamGraf: ProjeGrafi): string {
  if (!tamGraf.dugumler.length) return "";
  const { graf, gizli } = gorunurGraf(tamGraf);
  const yerlesim = agacYerlesimi(graf);
  const G = seritGenisligi(bagYerlesimi(graf).sutunSayisi);
  return `<div class="graf" role="group" aria-label="${MINI_GRAF_METINLERI.ariaGraf}" style="--serit:${G}px">` +
    graf.dugumler.map((d, i) => satirHtml(d, yerlesim[i], gizli.get(d.kod))).join("") + seritSvg(graf, yerlesim) + `</div>`;
}

// ── HTML kabuğu ──────────────────────────────────────────────────────────────

const DURUM_RENKLERI = (Object.keys(DURUM_SINIFI) as Durum[])
  .map((d) => `.${DURUM_SINIFI[d]}{--r:${durumRengi(d)}}`).join("");

const STIL = `<style>
:root{--sat:${SATIR_YUKSEKLIGI}px;--g:${KADEME_GIRINTISI}px;--iz:var(--vscode-tree-indentGuidesStroke,var(--vscode-panel-border))}
body{font-family:var(--vscode-font-family);font-size:12px;color:var(--vscode-foreground);padding:0;margin:0;background:transparent}
.ust{display:flex;justify-content:flex-end;align-items:center;height:22px;padding:0 8px;border-bottom:1px solid var(--vscode-widget-border)}
.ozet{display:flex;align-items:center;gap:5px;white-space:nowrap;font-size:10px;color:var(--vscode-descriptionForeground)}
.sayac-simge{font-size:9px;color:var(--vscode-foreground);opacity:.72}.ayrac{opacity:.55}
a{text-decoration:none}
.graf{position:relative;padding:2px 0 6px;--serit:0px}
/* SATIR: sabit yükseklik, tek satır. İki düğüm aynı satırı paylaşamaz, dolayısıyla
   etiketler birbirine BİNEMEZ. content-visibility ekran dışı satırların yerleşim ve
   boyama maliyetini atlar (çok düğümlü projede sanal kaydırma yerine geçer). */
.dugum{display:flex;align-items:center;box-sizing:border-box;height:var(--sat);padding:0 8px 0 calc(var(--serit) + 6px);color:inherit;white-space:nowrap;cursor:pointer;content-visibility:auto;contain-intrinsic-block-size:var(--sat)}
.dugum:hover{background:var(--vscode-list-hoverBackground)}
.dugum:focus-visible{outline:1px solid var(--vscode-focusBorder);outline-offset:-1px}
.dugum.secili{background:var(--vscode-list-inactiveSelectionBackground);color:var(--vscode-list-inactiveSelectionForeground,var(--vscode-foreground))}
.dugum.secili .ad{font-weight:600}
.dugum.secili .tip,.dugum.secili .rozet{color:inherit;opacity:.8}
/* BAĞ ÇİZGİLERİ: ince ve soluk (tema kılavuz rengi); kalın renkli gövde çizgisi yoktur.
   Hücre x=8 çizgisi atanın durum noktasının merkezine denk gelir. */
.gi,.gb,.gt,.gl{flex:0 0 var(--g);align-self:stretch;position:relative}
.gi::before,.gt::before,.gt::after,.gl::before,.gl::after{content:"";position:absolute;pointer-events:none}
.gi::before,.gt::before,.gl::before{left:8px;top:0;bottom:0;border-left:1px solid var(--iz)}
.gl::before{bottom:50%}
.gt::after,.gl::after{left:8px;right:0;top:50%;border-top:1px solid var(--iz)}
/* DURUM NOKTASI: renk yalnız durumdan (YUZ-4) ve kanonik tema rolünden gelir. Nokta
   satır yüksekliğinde 16px'lik bir kutudur; yuvarlak ::before, kök çizgisi ::after'dır. */
.nokta{flex:0 0 16px;align-self:stretch;position:relative;--r:var(--vscode-descriptionForeground)}
.nokta::before{content:"";position:absolute;left:4px;top:50%;width:8px;height:8px;margin-top:-4px;box-sizing:border-box;border-radius:50%;background:var(--r);z-index:1}
.nokta.bos::before{background:transparent;border:1px dashed var(--r)}
.nokta.ac::after{content:"";position:absolute;left:8px;top:calc(50% + 5px);bottom:0;border-left:1px solid var(--iz);pointer-events:none}
${DURUM_RENKLERI}
.simge{flex:0 0 16px;margin-left:2px;text-align:center;font-size:11px;pointer-events:none}
.ad{flex:1 1 auto;min-width:0;margin-left:4px;overflow:hidden;text-overflow:ellipsis}
.rozet{flex:0 0 auto;margin-left:6px;font-size:10px;color:var(--vscode-descriptionForeground)}
.ms{width:12px;height:12px;margin-right:2px;vertical-align:-2px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
.rozet.eksik{color:var(--vscode-editorWarning-foreground,var(--vscode-descriptionForeground))}
/* Daralan satırın "gizli satır" yazısı dar panelde ilk kısalır: ad ve meyve sayacı yerinde kalır. */
.rozet.gz{flex-shrink:1000;min-width:3ch;overflow:hidden;text-overflow:ellipsis}
.tip{flex:0 0 auto;max-width:45%;min-width:0;margin-left:10px;overflow:hidden;text-overflow:ellipsis;text-align:right;font-size:10px;color:var(--vscode-descriptionForeground)}
/* DAR PANEL: tip sütunu ilk gizlenir; ad ve durum noktası kalır. */
@media (max-width:239px){.tip{display:none}}
.k{color:var(--vscode-descriptionForeground);padding:6px}
/* BAĞ ŞERİDİ (git log grafiği gibi): üç sınıf üç çizgi dilidir ve yarı saydamdır.
   adım düz, zemin kesikli, üretir noktalı; renk kanonik tema rolünden gelir. */
.serit{position:absolute;left:0;top:2px;pointer-events:none;overflow:visible}
.serit path{fill:none;stroke-linecap:round}
.bag{stroke:var(--vscode-sarmal-kenar,var(--vscode-descriptionForeground));stroke-width:1.3;stroke-opacity:.7}
.zemin{stroke:var(--vscode-descriptionForeground);stroke-width:1.3;stroke-opacity:.7;stroke-dasharray:3 3}
.uretir{stroke:var(--vscode-descriptionForeground);stroke-width:1.3;stroke-opacity:.8;stroke-dasharray:1 2.6}
</style>`;

/** Tek doğru görünüm: tüm proje grafı. Kip/anahtar yoktur. */
export function miniGrafHtml(graf: ProjeGrafi): string {
  if (!graf.dugumler.length) return bosHtml(MINI_GRAF_METINLERI.bosGraf);
  return `<!DOCTYPE html><html lang="${MINI_GRAF_METINLERI.dil}"><meta charset="UTF-8">${STIL}<body>
<div class="ust"><span class="ozet"><span class="sayac-simge" title="${MINI_GRAF_METINLERI.dugum}" aria-label="${MINI_GRAF_METINLERI.dugum}">●</span>${graf.dugumler.length}<span class="ayrac">·</span><span class="sayac-simge" title="${MINI_GRAF_METINLERI.bag}" aria-label="${MINI_GRAF_METINLERI.bag}">⎇</span>${graf.baglar.length}</span></div>
${projeGrafiAgaci(graf)}
</body></html>`;
}

/** Veri yokken dürüst boş hâl.
 *
 *  VIT-KIMLIK-A07: buradaki 🕸️ işareti KALDIRILDI ve yerine ailenin bir üyesi
 *  KONMADI. Gerekçe ölçümdür: bu modül SAF'tır (vscode ve node:fs bağımlısı
 *  değildir) ve gömülü SVG bir dosya okuyucusu ister; okuyucuyu buraya taşımak
 *  saflığı kırar, imzayı değiştirir ve mini grafın çekirdeğini kabuğa bağlar.
 *  YUZ-4.2 zaten ikonun metinsel etiketi İKAME EDEMEYECEĞİNİ söyler; işaret
 *  düştüğünde cümle tek başına aynı şeyi söyler. Ailenin bu yüzeye ulaşması
 *  istenirse doğru yol, `bosHtml` çağıranının işareti dışarıdan vermesidir. */
export function bosHtml(mesaj: string): string {
  return `<!DOCTYPE html><html lang="${MINI_GRAF_METINLERI.dil}"><meta charset="UTF-8">${STIL}<body>
<p class="k">${kacir(mesaj)}</p></body></html>`;
}

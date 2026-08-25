// ═══════════════════════════════════════════════════════════════════════════
// minigraf-cekirdek.ts — 🕸️ MİNİ GRAF çekirdeği (SAF — vscode importsuz)
//
//   GitLens grafı gibi tek, dikey ve okunur bir proje yüzü. Saklı Dag'daki
//   Faz → Blok → Katman → AltKatman → Adım kapsama bağlarını ince raylarda,
//   gerçek bağımlılıkları yumuşak eğrilerde gösterir. Seçim grafı daraltmaz;
//   tüm proje görünür kalır. Düğüm camının içindeki simge TIP-0 kanonundan,
//   rengi YUZ-4 durum kanonundan gelir. Betik ve yeni tarama yoktur.
// ═══════════════════════════════════════════════════════════════════════════

import { ZEMIN_TIPLERI, type Dag, type DagDugum } from "../../cekirdek/src/dag.ts";
import { durumTuret, kapsayiciEvre } from "../../cekirdek/src/durum.ts";
import { DURUM_ROZET, type Durum } from "./yol-dekor.ts";
import { GOMULU_KAYIT } from "./gomulu-kanon.ts";
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
const MEYVE_DERINLIK = 5;

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

function durumRengi(durum?: Durum): string {
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

// ── SVG çizimi ───────────────────────────────────────────────────────────────

const SVG_G = 376;
const SATIR_Y = 34;
const ILK_Y = 18;
const KOK_X = 12;
// Altıncı ray meyve rolünündür; yarıçap kademesi de onunla birlikte incelir.
const RAY_X = [28, 48, 68, 88, 108, 126] as const;
const YARICAP = [8.2, 7.8, 7.3, 6.9, 6.5, 5.8] as const;

/**
 * ETİKET MERDİVENİ — yazı da mercek gibi kademelenir (Founder hükmü 2026-07-30).
 *
 * Ölçülmüş kusur: mercekler altı ayrı rayda kademeleniyordu fakat bütün etiketler
 * TEK sütundan (x=146) başlıyordu. Göz merdiveni dairelerde görüyor, yazıda
 * kaybediyordu; alt alta dizilen Blok, Katman, Adım ve meyve adları düz bir liste
 * gibi okunuyor ve hangi adın hangi kademeye ait olduğu karışıyordu. Girinti,
 * ağaç yüzeyinin en temel görsel ipucudur.
 *
 * SIĞ KADEMELER YER KAZANIR, DERİN KADEME AYNI KALIR: en derin etiket bugünkü
 * 146 değerinde durur, üstündeki her kademe sola kayar ve yazıya daha çok alan
 * bulur. Dolayısıyla değişiklik hiçbir kademede gerileme üretmez.
 */
const ETIKET_BOSLUGU = 20;   // mercek merkezinden yazının başına — en büyük yarıçap 8.2
function etiketX(derinlik: number): number {
  const ray = RAY_X[Math.min(derinlik, RAY_X.length - 1)];
  return ray + ETIKET_BOSLUGU;
}

/**
 * Etiketin sığabileceği karakter sayısı da girintiden TÜREİR — sabit bir üst sınır
 * derin kademede taşmaya, sığ kademede boşuna kırpmaya yol açardı. Kırpma yalnız
 * görüntüdedir; tam ad üzerine gelme baloncuğunda durur.
 */
const KARAKTER_G = 7.9;   // ölçülen ortalama karakter genişliği (etiket punto'sunda)
function etiketUstSiniri(derinlik: number): number {
  return Math.max(16, Math.floor((SVG_G - etiketX(derinlik) - 10) / KARAKTER_G));
}

/** Webview HTML kaçışı (saf modül kendi güvenlik sınırını taşır). */
function kacir(s: unknown): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function kisalt(s: string, ust: number): string {
  return s.length > ust ? s.slice(0, ust - 1) + "…" : s;
}

function atlaHref(d: Pick<ProjeGrafDugumu, "dosya" | "satir">): string {
  return d.dosya
    ? `command:sarmal.dosyaAc?${encodeURIComponent(JSON.stringify([d.dosya, d.satir]))}`
    : "";
}

/** Satır meyve ROLÜNDE mi çiziliyor — rolün tek görsel gerçeği kendi rayıdır. */
function meyveRolu(d: ProjeGrafDugumu): boolean {
  return d.derinlik === MEYVE_DERINLIK;
}

function dugumAltYazisi(d: ProjeGrafDugumu): string {
  const tip = kanonikWidgetAdi(d.tip, d.tip === "AltKatman" ? "Alt katman" : d.tip);
  // Meyve rolü: kendi tipini ve BEYAN ettiği teslim yolunu söyler; kullanıcı
  // grafta "bu Adım neyi nereye teslim ediyor" sorusunu okuyabilsin diye.
  if (meyveRolu(d)) return d.beyanYolu ? `${tip} · ${d.beyanYolu}` : tip;
  let s = d.durum ? `${tip} · ${MINI_GRAF_METINLERI.durum(d.durum)}` : tip;
  // Meyve sayacı SEÇİMDEN BAĞIMSIZDIR: eksik teslim kullanıcıya hiçbir seçim
  // yapmadan bildirilir, aksi hâlde beyan ile gerçeğin farkı saklı kalırdı.
  // Sayacın simgesi de KANONDAN okunur. Ölçülmüş kusur (2026-07-29 · bağımsız
  // denetim): bu satır simgeyi koda gömüyordu. Kanondaki `aileSimgeleri.urun`
  // değeri değiştirildiğinde mercek yeni simgeye geçiyor, sayaç eskisinde
  // kalıyordu — yani AYNI SATIR aynı kavramı iki ayrı işaretle anlatıyordu ve
  // eklenti süitinin tamamı yeşil kalıyordu (N8 yalnız mercek damgalarına bakar).
  // VIT-KIMLIK-A03: okuma artık tek kaynak çizelgeden — Meyve rolünün simgesi
  // tipSimgesi("Meyve") ile ailesinden (urun) çözülür; ikinci okuma yolu kalmadı.
  if (d.meyveSayisi) s += ` · ${tipSimgesi("Meyve")} ${d.meyveSayisi}`;
  if (d.eksikMeyve && d.eksikMeyve > 0) s += ` · ${MINI_GRAF_METINLERI.eksikMeyve(d.eksikMeyve)}`;
  return s;
}

/** GitLens-benzeri tek proje grafını satır-içi SVG'ye çizer. */
export function projeGrafiSvg(graf: ProjeGrafi): string {
  if (!graf.dugumler.length) return "";
  const H = ILK_Y * 2 + (graf.dugumler.length - 1) * SATIR_Y;
  const konum = new Map(graf.dugumler.map((d, i) => [d.kod, {
    x: RAY_X[d.derinlik], y: ILK_Y + i * SATIR_Y, i,
  }]));
  const parcalar: string[] = [];

  // Gerçek kenarlar: bütün ağ görünür, düğümlerin altında kalır. ÜÇ SINIF ÜÇ
  // ÇİZGİDİR — yürütme sırası yumuşak bir eğridir, zemin bağı kesikli düz bir
  // dirsektir, üretim kökeni ise noktalı düz bir iniştir; kullanıcı "bu iş şundan
  // sonra gelir", "bu katman şunun üstünde durur" ve "bu Adım şunu teslim eder"
  // cümlelerini bakışta ayırır. Sınıf veriden okunur, tahmin edilmez.
  for (const bag of graf.baglar) {
    const a = konum.get(bag.once), b = konum.get(bag.sonra);
    if (!a || !b) continue;
    // ÜRETİM KÖKENİ DÜZ İNER (ORK-1.3): Adımın merceğinden meyvenin merceğine tek
    // bir doğru parçası gider. Geometri bilinçli olarak kavis hesabına GİRMEZ,
    // çünkü iki uç yalnız bir ray (108 → 126) uzaktadır ve doğru parçası en geniş
    // hâlinde bile x=126'da kalır; Adım etiket sütunu x=128'de başladığından bu
    // kenar hiçbir yazıyı kesemez. Kapsama rayının kavisli dilinden de böylece
    // kesin olarak ayrılır — YUZ-3.2 üretim kökeninin mimari sarma diye yeniden
    // etiketlenmesini yasaklar.
    if (bag.tur === "üretir") {
      parcalar.push(`<path class="uretir" data-a="${a.i}" data-b="${b.i}" ` +
        `d="M ${a.x} ${a.y} L ${b.x} ${b.y}"/>`);
      continue;
    }
    // KAVİS TAVANI EN KALABALIK ETİKET SÜTUNUNUN SOLUNDA DURUR. Founder canlı
    // bulgusu 2026-07-30: bağımlılık eğrileri yazılarla çakışıyordu. Ölçüldü —
    // eğriler x=28..140 arasında akıyordu, Adım etiketleri ise x=128'den
    // başlıyordu, dolayısıyla en kalabalık sütunun (523 etiket) üstünden
    // geçiyorlardı. Tavan Adım sütununun soluna çekildi; eğri on dört piksel
    // dar salınıyor fakat kendi kademesinin adını hiç kesmiyor.
    const kavisX = Math.min(etiketX(4) - 2, Math.max(a.x, b.x) + 12 + Math.abs(b.y - a.y) * 0.07);
    if (bag.tur === "zemin") {
      parcalar.push(`<path class="zemin" data-a="${a.i}" data-b="${b.i}" ` +
        `d="M ${a.x} ${a.y} H ${kavisX} V ${b.y} H ${b.x}"/>`);
      continue;
    }
    parcalar.push(`<path class="bag" data-a="${a.i}" data-b="${b.i}" ` +
      `d="M ${a.x} ${a.y} C ${kavisX} ${a.y}, ${kavisX} ${b.y}, ${b.x} ${b.y}"/>`);
  }

  // Kapsama rayları: kökler ortak proje rayına bağlanır; tüm yüz tek bütün görünür.
  //
  // KAPSAMA YALNIZ MİMARİ GÖRÜNÜRLÜĞÜ ÇİZER (ORK-1.1). Bir satırın bağlayıcısı
  // veriden okunan başka bir sınıfa aitse burada İKİNCİ kez çizilmez; aksi hâlde
  // aynı ilişki iki sınıfın dilinde birden anlatılır ve ORK-1 bunu yasaklar.
  // Bugünkü tek örnek meyvedir: onun bağlayıcısı `üretir` sınıfındadır.
  const kokler = graf.dugumler.filter((d) => !d.ustKod).map((d) => konum.get(d.kod)!);
  if (kokler.length > 1) {
    parcalar.push(`<path class="kapsama" d="M ${KOK_X} ${kokler[0].y} V ${kokler[kokler.length - 1].y}"/>`);
  }
  const kendiSinifiVar = new Set(
    graf.baglar.filter((b) => b.tur === "üretir").map((b) => b.sonra));
  for (const d of graf.dugumler) {
    const p = konum.get(d.kod)!;
    if (!d.ustKod) {
      parcalar.push(`<path class="kapsama" d="M ${KOK_X} ${p.y} H ${p.x}"/>`);
      continue;
    }
    if (kendiSinifiVar.has(d.kod)) continue;
    const ust = konum.get(d.ustKod);
    if (!ust) continue;
    const donusY = Math.max(ust.y + 6, p.y - 10);
    parcalar.push(`<path class="kapsama" d="M ${ust.x} ${ust.y} V ${donusY} Q ${ust.x} ${p.y} ${p.x} ${p.y}"/>`);
  }

  // Cam mercekler + kanon ikonları. Renk yalnız durumdan (YUZ-4).
  graf.dugumler.forEach((d, i) => {
    const p = konum.get(d.kod)!;
    const r = YARICAP[d.derinlik];
    const renk = durumRengi(d.durum);
    const simge = tipSimgesi(d.tip);
    const kimlik = d.ad === d.kod ? d.kod : `${d.ad} · ${d.kod}`;
    // BOŞ CAM: beyan edilmiş ama diskte bulunamayan meyve DOLDURULMAZ. Işıma,
    // buzlu gövde ve parlama çizilmez; geriye yalnız boş mercek ile kesikli
    // çemberi kalır. Boşluk bir renk değil, bir YOKLUK olarak anlatılır.
    const bos = d.diskte === false;
    const bosCam = bos ? " boş" : "";
    const dolgu = bos ? ""
      : `<circle class="isima" cx="${p.x}" cy="${p.y}" r="${r + 7}" fill="${renk}"/>` +
        `<circle cx="${p.x}" cy="${p.y}" r="${r - 1}" fill="${renk}" fill-opacity=".76" filter="url(#buz)"/>`;
    const parlama = bos ? ""
      : `<ellipse class="parlama" cx="${p.x - 1.5}" cy="${p.y - r / 2.5}" rx="${Math.max(2, r - 3)}" ry="${Math.max(1, (r - 3) / 2)}"/>`;
    const baslik = `${kanonikWidgetAdi(d.tip, d.tip)} · ${kimlik}${d.durum ? ` · ${MINI_GRAF_METINLERI.durum(d.durum)}` : ""}` +
      (meyveRolu(d) && d.beyanYolu ? `\n${MINI_GRAF_METINLERI.beyanYolu(bos, d.beyanYolu)}` : "");
    // Etiket merdiveni: yazı da mercek gibi kademelenir; kırpma sınırı girintiden türer.
    const ex = etiketX(d.derinlik);
    const ust = etiketUstSiniri(d.derinlik);
    const govde = `<g class="dugum${d.secili ? " secili" : ""}" data-i="${i}">` +
      `<title>${kacir(MINI_GRAF_METINLERI.kaynakIpucu(baslik))}</title>` +
      `<rect class="satir" x="0" y="${p.y - SATIR_Y / 2}" width="${SVG_G}" height="${SATIR_Y}" rx="7"/>` +
      dolgu +
      `<circle class="mercek${bosCam}" cx="${p.x}" cy="${p.y}" r="${r}"/>` +
      parlama +
      `<circle class="cember${bosCam}" cx="${p.x}" cy="${p.y}" r="${r}" stroke="${renk}"/>` +
      `<text class="simge" x="${p.x}" y="${p.y + 3.2}" font-size="${d.derinlik < 2 ? 9.5 : 8.5}">${simge}</text>` +
      `<text class="etiket" x="${ex}" y="${p.y - 1}">${kacir(kisalt(d.ad, ust))}</text>` +
      // ALT YAZI KIRPILMAZ. Denendi ve geri alındı (2026-07-30): girintiden türeyen
      // sınır Adım alt yazısının kuyruğunu kesiyordu ve kesilen tam da "N diskte yok"
      // uyarısıydı. Eksik teslim sinyalini kırpmak, grafın söylemesi gereken tek
      // dürüstlük cümlesini susturmak olurdu; genişlik kaygısı bunun önüne geçemez.
      `<text class="alt" x="${ex}" y="${p.y + 10.5}">${kacir(dugumAltYazisi(d))}</text>` +
      `</g>`;
    const href = atlaHref(d);
    parcalar.push(href ? `<a href="${href}">${govde}</a>` : govde);
  });

  return `<svg class="graf" viewBox="0 0 ${SVG_G} ${H}" width="100%" ` +
    `xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${MINI_GRAF_METINLERI.ariaGraf}">` +
    `<defs><filter id="buz" x="-80%" y="-80%" width="260%" height="260%">` +
    `<feGaussianBlur stdDeviation="1.6"/></filter></defs>${parcalar.join("")}</svg>`;
}

/**
 * Hover edilen düğümün yalnız doğrudan bağımlılık bağlarını hafifçe güçlendirir.
 *
 * YALNIZ `adım` KENARI SAYILIR. Ölçülmüş kusur (2026-07-30 · Founder canlı
 * bulgusu "IDE'de kasma var"): bağlılık denetimi BÜTÜN kenarlara bakıyordu, oysa
 * ürettiği kural yalnız `.bag` sınıfını boyar. Zemin kenarı `.zemin` sınıfındadır,
 * dolayısıyla yalnız zemine bağlı bir düğüm için hiçbir zaman EŞLEŞEMEYECEK iki
 * seçici üretiliyordu. Zemin kenarları A12 turunda 151'den 722'ye çıkınca bu ölü
 * maliyet grafın tamamına yayıldı ve `:has()` seçici sayısı 1366'ya ulaştı;
 * `:has()` en pahalı seçicidir ve tarayıcı onu her fare hareketinde yeniden
 * değerlendirir. Zemin zaten ortam bilgisidir — izlenecek olan yürütme bağıdır.
 */
function bagHoverStili(graf: ProjeGrafi): string {
  return graf.dugumler.map((d, i) => {
    const bagli = graf.baglar.some((b) => b.tur === "adım" && (b.once === d.kod || b.sonra === d.kod));
    if (!bagli) return "";
    return `.graf:has(.dugum[data-i="${i}"]:hover) .bag[data-a="${i}"],` +
      `.graf:has(.dugum[data-i="${i}"]:hover) .bag[data-b="${i}"]{stroke-opacity:.72;stroke-width:1.5}`;
  }).join("");
}

// ── HTML kabuğu ──────────────────────────────────────────────────────────────

const STIL = `<style>
body{font-family:var(--vscode-font-family);font-size:11px;color:var(--vscode-foreground);padding:0 6px;margin:0;background:transparent}
.ust{display:flex;justify-content:flex-end;align-items:center;height:22px;padding:0 6px;border-bottom:1px solid var(--vscode-widget-border)}
.ozet{display:flex;align-items:center;gap:5px;white-space:nowrap;font-size:10px;color:var(--vscode-descriptionForeground)}
.sayac-simge{font-size:9px;color:var(--vscode-foreground);opacity:.72}.ayrac{opacity:.55}
a{text-decoration:none}.bag{fill:none;stroke:var(--vscode-sarmal-kenar);stroke-width:1.05;stroke-opacity:.20}
.zemin{fill:none;stroke:var(--vscode-panel-border);stroke-width:.85;stroke-opacity:.42;stroke-dasharray:2 3}
/* ÜRETİM KÖKENİ (ORK-1.3) — kendi görsel dili. Kapsama sürekli ve kavislidir,
   zemin kesikli ve dik açılıdır, yürütme kenarı yumuşak bir eğridir; üretir ise
   NOKTALI ve düz iner. Dört sınıf dört ayrı (biçim × desen) çiftidir, dolayısıyla
   hiçbiri ötekiyle karışmaz. Renk yine kanonik tema rolünden gelir (YUZ-4.1) ve
   durum renkleriyle ORTAK DEĞİLDİR — kenar sınıfı bir durum değildir. */
.uretir{fill:none;stroke:var(--vscode-descriptionForeground);stroke-width:1;stroke-opacity:.55;stroke-dasharray:1 2.6;stroke-linecap:round}
.kapsama{fill:none;stroke:var(--vscode-panel-border);stroke-width:1.1;stroke-opacity:.58}
.satir{fill:transparent}.isima{opacity:0;filter:blur(5px);transition:opacity .16s ease}
.mercek{fill:var(--vscode-editorWidget-background);fill-opacity:.78}
.parlama{fill:var(--vscode-foreground);fill-opacity:.16;pointer-events:none}
.cember{fill:none;stroke-opacity:.60;stroke-width:.9}
.cember.boş{stroke-dasharray:2.5 2}
.mercek.boş{fill-opacity:.10}
.simge{font-family:var(--vscode-font-family);text-anchor:middle;pointer-events:none}
/* YAZI HALESİ — bağımlılık eğrisi harfin ARKASINDA kesilir (Founder bulgusu
   2026-07-30). Kavis tavanını çekmek tek başına yetmez: bir eğri satırlar boyunca
   uzanır ve yolu üstündeki SIĞ kademelerin adlarını da keser. Hale, her harfe
   panel arka planı renginde ince bir dış çizgi verir; çizgi harfe değdiği yerde
   görünmez olur, yazı okunur kalır. Saf CSS'tir, betik ya da kütüphane istemez.
   Renk yine kanonik tema rolünden gelir (YUZ-4.1) — ham değer gömülmez. */
.etiket,.alt{paint-order:stroke fill;stroke:var(--vscode-sideBar-background,var(--vscode-editor-background));stroke-width:3px;stroke-linejoin:round}
.etiket{fill:var(--vscode-foreground);font-size:11px}.alt{fill:var(--vscode-descriptionForeground);font-size:9px}
.dugum{cursor:pointer}.dugum:hover .satir{fill:var(--vscode-list-hoverBackground)}
.dugum:hover .isima{opacity:.30}.dugum:hover .etiket{font-weight:600}
.dugum.secili .isima{opacity:.16}.dugum.secili .cember{stroke-opacity:.95;stroke-width:1.2}
.k{color:var(--vscode-descriptionForeground);padding:6px}
</style>`;

/** Tek doğru görünüm: tüm proje grafı. Kip/anahtar yoktur. */
export function miniGrafHtml(graf: ProjeGrafi): string {
  if (!graf.dugumler.length) return bosHtml(MINI_GRAF_METINLERI.bosGraf);
  return `<!DOCTYPE html><html lang="${MINI_GRAF_METINLERI.dil}"><meta charset="UTF-8">${STIL}<style>${bagHoverStili(graf)}</style><body>
<div class="ust"><span class="ozet"><span class="sayac-simge" title="${MINI_GRAF_METINLERI.dugum}" aria-label="${MINI_GRAF_METINLERI.dugum}">●</span>${graf.dugumler.length}<span class="ayrac">·</span><span class="sayac-simge" title="${MINI_GRAF_METINLERI.bag}" aria-label="${MINI_GRAF_METINLERI.bag}">⎇</span>${graf.baglar.length}</span></div>
${projeGrafiSvg(graf)}
</body></html>`;
}

/** Veri yokken dürüst boş hâl. */
export function bosHtml(mesaj: string): string {
  return `<!DOCTYPE html><html lang="${MINI_GRAF_METINLERI.dil}"><meta charset="UTF-8">${STIL}<body>
<p class="k">🕸️ ${kacir(mesaj)}</p></body></html>`;
}

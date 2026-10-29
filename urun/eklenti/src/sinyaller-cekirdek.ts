// ═══════════════════════════════════════════════════════════════════════════
// sinyaller-cekirdek.ts — 🚦 SİNYALLER SEKMESİNİN SAF ÇEKİRDEĞİ (PNL-A09 · OZK-14)
//
//   Founder 2026-10-28: Sarmal'ın tanıları VS Code'un genel Sorunlar panelinde
//   öteki araçların bulgularına karışıyordu ve kullanıcı bir tanının işini durdurup
//   durdurmadığını okuyamıyordu. Panelin dördüncü sekmesi Sinyaller'dir ve tanıları
//   YAS-3.1'in üç düzeyine karşılık gelen üç bantta gösterir: Dur HATA, Dikkat UYARI,
//   Bilgi BİLGİ düzeyini taşır. Bant adları YALNIZ SUNUMDUR: düzey motorun kararıdır,
//   burada hiçbir tanı yeniden derecelendirilmez ve hiçbir tanı başka bir düzeyin
//   bandına düşemez (eşleme birebir ve tamdır).
//
//   KANON MADDESİ İKİ BAĞDAN OKUNUR VE UYDURULMAZ. Birincisi tanı sicilinin kural
//   bağıdır (cekirdek/src/tani-sicili.ts `madde` alanı). İkincisi motorun kural↔kapı
//   haritasıdır: kanonun Kural düğümleri `tanı:` kenarıyla hangi tanının onları
//   zorladığını söyler; harita `kurallar` aracının (cekirdek/src/mcp.ts) okuduğu
//   kenarın aynısından, turun ayrıştırdığı kanon dosyalarından kurulur. Kanon
//   dosyaları çalışma alanında yoksa yalnız sicil bağı kalır. Bağı olmayan tanının
//   madde alanı boştur.
//
//   HER TANI PANELDE YALNIZ BİR KEZ GÖRÜNÜR (YUZ-3.3 · Founder hükmü 2026-10-28,
//   iki kez görünme ölçüldükten sonra). Sinyaller Sarmal'ın sesidir: düzeltilecek
//   (Dur, Dikkat) ve bilinecek (Bilgi) işaretleri taşır. Hatırlanacak iş, yani
//   motorun Hatırlatıcılar yüzeyine yönlendirdiği tanı, kullanıcının defteridir ve
//   yalnız Makinist'in Hatırlatıcılar grubunda görünür; Sinyaller'e hiç girmez.
//   Yönlendirme burada yeniden yazılmaz: karar motorun `beklenenSunumYuzeyi`
//   işlevidir ve buraya `kaydinYuzeyi` üzerinden tek kaynaktan gelir. Ayrı bir
//   Gözlemler bölümü yoktur; Bilgi bandı eski Gözlemler grubunun yerini alır.
//
//   TÜRE GÖRE TOPLAMA (PNL-A28 · YAS-3.4). Founder 2026-10-28 tarihinde bir projenin
//   Bilgi bandında altı yüzü aşkın kaydın alt alta dizildiğini ve tek bir türün
//   (beceri-kartı-eksik) yüzlerce satır tuttuğunu gösterdi. Proje içinde kayıtlar
//   önce tanı türüne göre toplanır: türler kayıt sayısına göre çoktan aza dizilir,
//   tür içinde kayıtlar dosyaya göre kalır. Toplama yalnız sunumdur; hiçbir tanının
//   düzeyi, sayısı ya da metni değişmez ve hiçbir kayıt düşmez. Türün ortak önerisi
//   uydurulmaz: türün bütün kayıtlarının öneri metninde aynen geçen cümlelerdir.
//
//   SAF: bu modül `vscode` İTHAL ETMEZ; nöbetler onu doğrudan koşturur.
// ═══════════════════════════════════════════════════════════════════════════

import type { Duzey } from "../../cekirdek/src/tani.ts";
import type { Dugum, Program } from "../../cekirdek/src/sozdizim.ts";
import { YENI_TANI_INDEKS } from "../../cekirdek/src/tani-sicili.ts";
import { panoKumeMetni } from "./yuzey-metinleri.ts";
import { kaydinYuzeyi, kokeGoreOzetle, panoKaydi, turDagilimi, type ProjeKimligi, type YuzeyKaydi } from "./yuzey-cekirdek.ts";

/** Üç bant, şeritteki sırasıyla. */
export const SINYAL_BANTLARI = ["dur", "dikkat", "bilgi"] as const;
export type SinyalBandi = (typeof SINYAL_BANTLARI)[number];

/** Bandın taşıdığı YAS-3.1 düzeyi (OZK-14). Eşleme birebirdir; nöbeti sicilin bütün düzeyleri üzerinden koşar. */
export const BANT_DUZEYI: Readonly<Record<SinyalBandi, Duzey>> = { dur: "hata", dikkat: "uyarı", bilgi: "bilgi" };

const DUZEY_BANDI: Readonly<Record<string, SinyalBandi>> = Object.fromEntries(
  SINYAL_BANTLARI.map((b) => [BANT_DUZEYI[b], b]),
);

/** Düzeyin bandı; bilinmeyen bir düzey hiçbir banda yerleştirilmez (`undefined`). */
export function duzeyBandi(duzey: string): SinyalBandi | undefined {
  return Object.hasOwn(DUZEY_BANDI, duzey) ? DUZEY_BANDI[duzey] : undefined;
}

// ── KANON MADDESİ ───────────────────────────────────────────────────────────

/**
 * Motorun kural↔kapı haritası: tanı kodu → onu zorlayan kanon maddeleri. Kanonun
 * Kural tanımlarının (`kuralTanım`) `tanı:` kenarı okunur; okuma `kurallar` aracının
 * haritasıyla birebir aynıdır (cekirdek/src/mcp.ts). Kanon dosyası olmayan programlar
 * haritaya hiçbir şey eklemez.
 */
export function kanonTaniHaritasi(programlar: Iterable<Program>): Map<string, string[]> {
  const harita = new Map<string, string[]>();
  const gez = (n: Dugum): void => {
    if (n.tur === "kuralTanım") {
      const alan = (ad: string) => [...n.parametreler, ...n.ozellikler].find((x) => x.ad === ad)?.deger;
      const madde = alan("kod")?.metin ?? n.ad;
      const tani = alan("tanı");
      if (madde && tani) {
        for (const d of tani.tur === "liste" ? (tani.ogeler ?? []) : [tani]) {
          const kod = d.metin;
          if (!kod) continue;
          const liste = harita.get(kod) ?? harita.set(kod, []).get(kod)!;
          if (!liste.includes(madde)) liste.push(madde);
        }
      }
    }
    for (const c of n.cocuklar) gez(c);
  };
  for (const p of programlar) for (const b of p.bildirimler) gez(b);
  return harita;
}

/**
 * Bir tanının dayandığı kanon maddeleri: önce sicilin kural bağı, sonra kural↔kapı
 * haritası; ikisi de yoksa boş liste. Madde uydurulmaz.
 */
export function kanonMaddeleri(kod: string, harita?: ReadonlyMap<string, readonly string[]>): string[] {
  const maddeler: string[] = [];
  const sicil = YENI_TANI_INDEKS.get(kod)?.madde;
  if (sicil) maddeler.push(sicil);
  for (const m of harita?.get(kod) ?? []) if (!maddeler.includes(m)) maddeler.push(m);
  return maddeler;
}

// ── MODEL ───────────────────────────────────────────────────────────────────

export interface SinyalSatiri {
  readonly kayit: YuzeyKaydi;
  readonly bant: SinyalBandi;
  readonly maddeler: readonly string[];
}

/**
 * Bir projenin bir banttaki tanılarından aynı türü taşıyanlar (PNL-A28). Ağaç türü tek satırda
 * toplar; tek kayıtlık tür ara satır açmadan doğrudan kaydını gösterir.
 */
export interface SinyalTuru {
  readonly kod: string;
  /** Türün kayıtları, dosyaya, sonra satır ve sütuna göre dizili. */
  readonly satirlar: readonly SinyalSatiri[];
  /** Türün bütün kayıtlarının öneri metninde aynen geçen cümleler; böyle bir cümle yoksa tanımsız. */
  readonly ortakOneri: string | undefined;
  /** Türün bütün kayıtlarının iletisinde aynen geçen son cümle; çizelgede anlamı yazılı olmayan türe anlam verir. */
  readonly ortakAnlam: string | undefined;
}

export interface ProjeSinyalleri {
  readonly proje: ProjeKimligi;
  /** Odaktaki proje: bandın en üstünde durur ve açık başlar. */
  readonly odakta: boolean;
  /** Bütün kayıtlar, dosyaya göre dizili (türlerin birleşimi). */
  readonly satirlar: readonly SinyalSatiri[];
  /** Kayıtların türlere toplanmış hâli; kayıt sayısına göre çoktan aza, eşit sayıda tür kimliğine göre dizili. */
  readonly turler: readonly SinyalTuru[];
}

export interface BantSinyalleri {
  readonly bant: SinyalBandi;
  readonly duzey: Duzey;
  readonly sayi: number;
  readonly projeler: readonly ProjeSinyalleri[];
}

export interface SinyalModeli {
  readonly bantlar: readonly BantSinyalleri[];
  /** Bantlara yerleşen tanı sayısı: girdiden Hatırlatıcılar yüzeyine yönlenenler çıkınca kalanın tamamıdır. */
  readonly toplam: number;
  /** Düzeyi hiçbir banda karşılık gelmeyen kayıt sayısı; sıfırdan farklıysa nöbet düşer. */
  readonly bantsiz: number;
  /** Hatırlatıcılar yüzeyine yönlendiği için Sinyaller'e girmeyen kayıt sayısı (Makinist'te görünürler). */
  readonly hatirlatici: number;
}

/**
 * Kayıt Sinyaller'de görünür mü? Hatırlatıcılar yüzeyine yönlenen tanı görünmez (YUZ-3.3);
 * karar motorun sunum kararıdır (`kaydinYuzeyi` → `beklenenSunumYuzeyi`), burada ikinci bir tanım kurulmaz.
 */
export function sinyaldeGorunur(kayit: YuzeyKaydi): boolean {
  return kaydinYuzeyi(kayit) !== "hatırlatıcılar";
}

const karsilastir = (a: string, b: string): number => a.localeCompare(b, "tr");

/** Metni cümlelerine böler: nokta, ünlem ya da soru işaretinden sonra boşluk ve büyük harfle (ya da sayı, tırnak, ayraç) başlayan yer cümle sınırıdır. */
function cumlelereBol(metin: string): string[] {
  return metin.split(/(?<=[.!?])\s+(?=[\p{Lu}\p{N}`"'(])/u).map((c) => c.trim()).filter(Boolean);
}

/**
 * Bütün metinlerde AYNEN geçen cümleler, ilk metindeki sırasıyla. Hiçbir cümle yazılmaz ya da
 * kısaltılmaz; kayda özgü bir ad taşıyan cümle (ör. örnek satırındaki kimlik) ortak sayılmaz.
 * Metinlerden biri boşsa ortak cümle yoktur.
 */
export function ortakCumleler(metinler: readonly (string | undefined)[]): string[] {
  if (!metinler.length || metinler.some((m) => !m)) return [];
  const [ilk, ...oteki] = metinler.map((m) => cumlelereBol(m!));
  const kumeler = oteki.map((c) => new Set(c));
  return [...new Set(ilk)].filter((c) => kumeler.every((k) => k.has(c)));
}

/**
 * Bir projenin kayıtlarını türlere toplar (PNL-A28). Gruplama ile sıra, öteki yüzeylerin tür özetini
 * kuran çekirdekten gelir: `kokeGoreOzetle` türleri toplar ve tür içinde gelen sırayı korur,
 * `turDagilimi` türleri çoktan aza ve eşitlikte kimlik sırasıyla dizer. Kayıtlar dosyaya göre dizili
 * gelir; tür içinde de öyle kalır.
 */
export function tureGoreTopla(satirlar: readonly SinyalSatiri[]): SinyalTuru[] {
  const satiri = new Map(satirlar.map((s) => [s.kayit, s] as const));
  const kayitlar = satirlar.map((s) => s.kayit);
  const kumeler = new Map(kokeGoreOzetle(kayitlar).map((k) => [k.kod, k.kayitlar] as const));
  return turDagilimi(kayitlar, Infinity).tumu.map(({ kod }): SinyalTuru => {
    const turSatirlari = kumeler.get(kod)!.map((k) => satiri.get(k)!);
    const anlam = ortakCumleler(turSatirlari.map((s) => s.kayit.tani.mesaj));
    const oneri = ortakCumleler(turSatirlari.map((s) => s.kayit.tani.oneri));
    return {
      kod, satirlar: turSatirlari,
      ortakOneri: oneri.length ? oneri.join(" ") : undefined,
      ortakAnlam: anlam.at(-1),
    };
  });
}

/**
 * Kayıtları üç banda yerleştirir. Hatırlatıcılar yüzeyine yönlenen kayıt yerleşmez ve
 * yalnız sayılır (YUZ-3.3). Bant içinde kayıtlar Proje kimliğine göre gruplanır
 * (YAS-3.3); odaktaki proje en üsttedir, ötekiler adlarına göre dizilir. Proje içinde
 * kayıtlar dosyaya, sonra satır ve sütuna göre dizilir ve türlere toplanır (PNL-A28).
 * Öteki hiçbir kayıt düşmez ve hiçbiri iki kez yerleşmez.
 */
export function sinyalModeli(
  kayitlar: readonly YuzeyKaydi[], odakProje: string | undefined,
  maddeler: (kod: string) => readonly string[],
): SinyalModeli {
  const kovalar = new Map<SinyalBandi, Map<string, { proje: ProjeKimligi; satirlar: SinyalSatiri[] }>>(
    SINYAL_BANTLARI.map((b) => [b, new Map()]),
  );
  let bantsiz = 0;
  let hatirlatici = 0;
  for (const kayit of kayitlar) {
    if (!sinyaldeGorunur(kayit)) { hatirlatici += 1; continue; }
    const bant = duzeyBandi(kayit.tani.duzey);
    if (!bant) { bantsiz += 1; continue; }
    const projeler = kovalar.get(bant)!;
    const grup = projeler.get(kayit.proje.kod) ?? projeler.set(kayit.proje.kod, { proje: kayit.proje, satirlar: [] }).get(kayit.proje.kod)!;
    grup.satirlar.push({ kayit, bant, maddeler: maddeler(kayit.tani.kod) });
  }
  const bantlar = SINYAL_BANTLARI.map((bant): BantSinyalleri => {
    const projeler = [...kovalar.get(bant)!.values()]
      .sort((a, b) => Number(b.proje.kod === odakProje) - Number(a.proje.kod === odakProje) || karsilastir(a.proje.ad, b.proje.ad))
      .map((g): ProjeSinyalleri => {
        const satirlar = g.satirlar.sort((x, y) => karsilastir(x.kayit.dosya, y.kayit.dosya)
          || x.kayit.tani.satir - y.kayit.tani.satir || x.kayit.tani.sutun - y.kayit.tani.sutun
          || karsilastir(x.kayit.tani.kod, y.kayit.tani.kod));
        return { proje: g.proje, odakta: g.proje.kod === odakProje, satirlar, turler: tureGoreTopla(satirlar) };
      });
    return { bant, duzey: BANT_DUZEYI[bant], sayi: projeler.reduce((t, p) => t + p.satirlar.length, 0), projeler };
  });
  return { bantlar, toplam: bantlar.reduce((t, b) => t + b.sayi, 0), bantsiz, hatirlatici };
}

// ── DEFTER ──────────────────────────────────────────────────────────────────

/**
 * Dosya başına kayıt defteri: turun her dosya için ürettiği tanıların TAMAMI burada
 * durur (Sorunlar paneline, Hatırlatıcılara ya da Bildirimlere ayrılmadan önceki hâli; Sinyaller
 * modeli Hatırlatıcılar yüzeyine yönlenenleri kendisi ayırır).
 * Kapsam süzgeci öteki yüzeylerinkiyle aynıdır; yayın tur başına bir kez yapılır.
 */
export class KayitDefteri<T> {
  private readonly kayitlar = new Map<string, readonly T[]>();
  private readonly yayinKapisi: (kayitlar: T[]) => void;
  private readonly kapsamda: (dosya: string) => boolean;

  constructor(yayinKapisi: (kayitlar: T[]) => void, kapsamda: (dosya: string) => boolean = () => true) {
    this.yayinKapisi = yayinKapisi;
    this.kapsamda = kapsamda;
  }

  yaz(dosya: string, kayitlar: readonly T[], yayımlansın = true): void {
    if (kayitlar.length) this.kayitlar.set(dosya, kayitlar);
    else this.kayitlar.delete(dosya);
    if (yayımlansın) this.yayımla();
  }

  sil(dosya: string, yayımlansın = true): void {
    if (this.kayitlar.delete(dosya) && yayımlansın) this.yayımla();
  }

  temizle(yayımlansın = true): void {
    this.kayitlar.clear();
    if (yayımlansın) this.yayımla();
  }

  /** Bu turda görülmeyen dosyaların kayıtlarını düşürür; çizim yapmaz. */
  buda(yasayanDosyalar: ReadonlySet<string>): void {
    for (const dosya of [...this.kayitlar.keys()]) if (!yasayanDosyalar.has(dosya)) this.kayitlar.delete(dosya);
  }

  /** Bugün panelde görünen kayıtlar (kapsam süzgecinden geçmiş). */
  gorunenler(): T[] {
    const out: T[] = [];
    for (const [dosya, kayitlar] of this.kayitlar) if (this.kapsamda(dosya)) out.push(...kayitlar);
    return out;
  }

  yayımla(): void {
    this.yayinKapisi(this.gorunenler());
  }
}

// ── PANO (PNL-A31) ──────────────────────────────────────────────────────────

/**
 * Sinyaller satırlarının pano metni: Makinist'in kopyalama komutuyla AYNI blok biçimi (`panoKaydi`) ve AYNI
 * küme birleştiricisi (`panoKumeMetni`); yalnız tanının kanon maddesi bloğa eklenir. Başlıksız tek kayıt
 * bloğun kendisidir; başlıklı grup hiçbir kaydı düşürmeden alt alta dizilir.
 */
export function sinyalPanosu(satirlar: readonly SinyalSatiri[], baslik?: string): { metin: string; adet: number } | undefined {
  if (satirlar.length === 0) return undefined;
  const bloklar = satirlar.map((s) => panoKaydi(s.kayit, s.maddeler));
  return { metin: baslik === undefined ? bloklar[0]! : panoKumeMetni(baslik, bloklar), adet: satirlar.length };
}

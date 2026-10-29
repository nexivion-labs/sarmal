// ═══════════════════════════════════════════════════════════════════════════
// tur-olcum.ts — ⏱️ DENETİM TURUNUN ÖLÇÜM DÜZENEĞİ (PNL-A14)
//
//   Founder 2026-10-27 tarihinde eklentinin açılışının ve tepkisinin
//   yavaşladığını bildirdi. Bu betik eklentinin GERÇEK girişini
//   (`src/eklenti.ts`) sahte editörde (sinama/etkinlesme-kabugu.ts) verilen bir
//   çalışma alanı kökü üzerinde etkinleştirir, başlangıç (tam) turunu ve tek
//   dosyalık olay turunu koşturur ve iki turun süresini "Sarmal Performans"
//   kanalının aşama bölümünden okur: okuma, ayrıştırma, denetim (çapraz ve
//   dosya payı), yayın ve bölünmez blok.
//
//   Her koşu AYRI bir Node sürecinde yapılır; böylece her başlangıç turu VS
//   Code'un soğuk açılışı gibi ısınmamış bir motorla koşar ve bir koşunun
//   önbelleği ötekine taşınmaz. Sonuç her alanın ortancasıdır.
//
//   Olay turu, olay dosyasının izleyici olayı ateşlenerek tetiklenir; tur
//   eklentinin kendi hattından (300 ms geciktirme) geçer. "Kaydetten panele"
//   süresi olayın ateşlenmesinden turun kanal satırına kadardır ve bu
//   geciktirmeyi içerir. Olay döngüsünün en uzun duraksaması ayrıca ölçülür:
//   bir milisaniyelik bir zamanlayıcının ardışık iki tıkı arasındaki en büyük
//   aralık, o pencerede ana iş parçacığının en uzun süre kesintisiz meşgul
//   kaldığı bloğun kanaldan bağımsız bir tahminidir.
//
//   Kimlik indeksi taraması açılışta turla aynı anda koşar ve turun okuma
//   süresini şişirir; `--indeks-yok` onu devreden çıkarır ki turun kendi
//   maliyeti yarıştan ayrı okunabilsin.
//
//   Kullanım (urun/eklenti dizininden):
//     node arac/tur-olcum.ts --kok <çalışma_alanı> [--olay <dosya.sar>]
//          [--etkin <dosya.sar>] [--kosu 3] [--indeks-yok] [--dok <çıktı.json>] [--json]
//
//   `--olay` verilmezse olay turu koşmaz. `--etkin` verilmezse olay dosyası
//   etkin editörde açık sayılır (odak onun varlığına kurulur). `--dok` ilk
//   koşunun turlarının ürettiği tanıları, yüzey kayıtlarını ve tur görüntüsünü
//   (ağaçlarla birlikte) kanonik JSON olarak yazar; iki kod sürümünün çıktısı
//   bununla birebir karşılaştırılır. Dökümün içinde çalışma alanının yolları
//   ve içeriği bulunur; onu depoya değil geçici bir dizine yaz.
// ═══════════════════════════════════════════════════════════════════════════

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { etkinlestir, kabukTemizle, paketKur, sonTurGoruntusu, type EtkinEklenti } from "../sinama/etkinlesme-kabugu.ts";

const BETIK = fileURLToPath(import.meta.url);
const COCUK_ANAHTARI = "SARMAL_TUR_OLCUM_COCUK";
const SONUC_ONEKI = "TUR-OLCUM-SONUC ";

interface Secenek {
  kok: string;
  olay?: string;
  etkin?: string;
  kosu: number;
  indeksYok: boolean;
  dok?: string;
  json: boolean;
}

/** Bir turun kanal satırından okunan sayılar (ms). */
interface TurOlcumu {
  toplam: number;
  dosya: number;
  tetik: string;
  diskten?: number;
  okunanBayt?: number;
  okuma?: number;
  ayristirma?: number;
  denetim?: number;
  capraz?: number;
  dosyaPayi?: number;
  yayin?: number;
  bolunmez?: number;
  /** Bağımsız tahmin: ölçüm penceresinde olay döngüsünün en uzun duraksaması (ms). */
  donguMax: number;
  /** Yalnız olay turu: olayın ateşlenmesinden kanal satırına (300 ms geciktirme dahil). */
  kaydettenPanele?: number;
}

interface KosuSonucu {
  etkinlesme: number;
  baslangic: TurOlcumu;
  olay?: TurOlcumu;
  ozet?: { baslangic: Record<string, string>; olay?: Record<string, string> };
}

// ── Argümanlar ──────────────────────────────────────────────────────────────

function argumanlar(argv: readonly string[]): Secenek {
  const al = (ad: string): string | undefined => {
    const i = argv.indexOf(ad);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const kok = al("--kok");
  if (!kok) {
    console.error("kullanım: node arac/tur-olcum.ts --kok <çalışma_alanı> [--olay <dosya.sar>] [--etkin <dosya.sar>] [--kosu 3] [--indeks-yok] [--dok <çıktı.json>] [--json]");
    process.exit(2);
  }
  const olay = al("--olay");
  const etkin = al("--etkin") ?? olay;
  return {
    kok: resolve(kok),
    olay: olay ? resolve(olay) : undefined,
    etkin: etkin ? resolve(etkin) : undefined,
    kosu: Math.max(1, Number(al("--kosu") ?? 3)),
    indeksYok: argv.includes("--indeks-yok"),
    dok: al("--dok") ? resolve(al("--dok")!) : undefined,
    json: argv.includes("--json"),
  };
}

// ── Kanal satırı ────────────────────────────────────────────────────────────

const TUR_SATIRI = /denetim turu: (\d+) ms · (\d+) dosya · tetik=([^|]*?) \|/u;
const BELGE_BOLUMU = /belgeler: açıktan \d+ · diskten (\d+) · atlanan \d+ · açma 0 · okunan (\d+) bayt/u;
const ASAMA_BOLUMU = /aşamalar: okuma (\d+) · ayrıştırma (\d+) · denetim (\d+) \(çapraz (\d+) · dosya (\d+)\) · yayın (\d+) ms · bölünmez blok (\d+) ms/u;

function turSatirlari(e: EtkinEklenti): string[] {
  const satirlar: string[] = [];
  for (const kanal of e.kayit.kanallar.values()) for (const s of kanal) if (TUR_SATIRI.test(s)) satirlar.push(s);
  return satirlar;
}

function satirOku(satir: string, donguMax: number): TurOlcumu {
  const t = TUR_SATIRI.exec(satir)!;
  const b = BELGE_BOLUMU.exec(satir);
  const a = ASAMA_BOLUMU.exec(satir);
  const n = (x: string | undefined): number | undefined => (x === undefined ? undefined : Number(x));
  return {
    toplam: Number(t[1]), dosya: Number(t[2]), tetik: t[3]!.trim(),
    diskten: n(b?.[1]), okunanBayt: n(b?.[2]),
    okuma: n(a?.[1]), ayristirma: n(a?.[2]), denetim: n(a?.[3]), capraz: n(a?.[4]),
    dosyaPayi: n(a?.[5]), yayin: n(a?.[6]), bolunmez: n(a?.[7]),
    donguMax: Math.round(donguMax),
  };
}

const bekle = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/**
 * Olay döngüsü gözcüsü: bir milisaniyelik zamanlayıcının ardışık tıkları
 * arasındaki en büyük aralığı tutar. Döngü bir blokla meşgulken zamanlayıcı
 * tıklayamaz; blok bitince ölçülen aralık bloğun süresine (artı en çok bir
 * milisaniyeye) eşittir.
 */
class DonguGozcusu {
  private son = performance.now();
  private enBuyuk = 0;
  private readonly zamanlayici = setInterval(() => {
    const simdi = performance.now();
    this.enBuyuk = Math.max(this.enBuyuk, simdi - this.son);
    this.son = simdi;
  }, 1);
  /** En büyük aralığı verir ve sıfırlar. */
  al(): number {
    const simdi = performance.now();
    const sonuc = Math.max(this.enBuyuk, simdi - this.son);
    this.enBuyuk = 0;
    this.son = simdi;
    return sonuc;
  }
  durdur(): void { clearInterval(this.zamanlayici); }
}

/** `adet` sayıda tur satırı birikene dek bekler; son satırı döndürür. */
async function satirBekle(e: EtkinEklenti, adet: number, zamanAsimiMs: number): Promise<string> {
  const bitis = Date.now() + zamanAsimiMs;
  for (;;) {
    const satirlar = turSatirlari(e);
    if (satirlar.length >= adet) return satirlar[adet - 1]!;
    if (Date.now() > bitis) throw new Error(`tur satırı zaman aşımında gelmedi (beklenen ${adet}, gelen ${satirlar.length})`);
    await bekle(2);
  }
}

/** Kanallar en az `sessizMs` boyunca yeni satır almayana dek bekler (açılışın arka plan işleri). */
async function durulmaBekle(e: EtkinEklenti, enAzMs: number, sessizMs: number): Promise<void> {
  const say = (): number => [...e.kayit.kanallar.values()].reduce((t, k) => t + k.length, 0);
  const bas = Date.now();
  let son = say();
  let degisti = Date.now();
  while (Date.now() - bas < enAzMs || Date.now() - degisti < sessizMs) {
    await bekle(50);
    const simdi = say();
    if (simdi !== son) { son = simdi; degisti = Date.now(); }
  }
}

// ── Döküm ───────────────────────────────────────────────────────────────────

/**
 * Turun bütün çıktısı: Sorunlar koleksiyonu (ekleme sırasıyla), yüzey
 * kayıtları, tur görüntüsü (ağaçlarla) ve panellerin gösterdiği kodlar.
 */
function dokum(e: EtkinEklenti): Record<string, unknown> {
  const g = sonTurGoruntusu();
  return {
    tanilar: [...e.kayit.tanilar],
    yuzey: e.yuz?.yuzeyKayitlari?.(),
    goruntu: g && {
      programlar: [...g.programlar], yollar: g.yollar, kirik: g.kirik, okunamayan: g.okunamayan,
      dilDışı: g.dilDışı, tetik: g.tetik, kapsam: g.kapsam,
    },
    paneller: { onayKapilari: e.yuz?.onayKapilari?.(), yolHaritasiKodlari: e.yuz?.yolHaritasiKodlari?.() },
  };
}

const ozetle = (parcalar: Record<string, unknown>): Record<string, string> =>
  Object.fromEntries(Object.entries(parcalar).map(([k, v]) =>
    [k, createHash("sha256").update(JSON.stringify(v) ?? "").digest("hex").slice(0, 16)]));

// ── Tek koşu (çocuk süreç) ──────────────────────────────────────────────────

async function tekKosu(s: Secenek, paket: string, dokYaz: boolean): Promise<KosuSonucu> {
  const gozcu = new DonguGozcusu();
  const t0 = performance.now();
  const e = etkinlestir({
    klasorler: [s.kok], etkinDosya: s.etkin, paket,
    bosArama: s.indeksYok ? ["**/*.{sar,md,ts}"] : undefined,
  });
  const etkinlesme = performance.now() - t0;
  const ilk = await satirBekle(e, 1, 300_000);
  const baslangic = satirOku(ilk, gozcu.al());
  const dokumler: Record<string, Record<string, unknown>> = {};
  if (dokYaz) dokumler.baslangic = dokum(e);
  let olay: TurOlcumu | undefined;
  if (s.olay) {
    await durulmaBekle(e, 3000, 1000);
    const onceki = turSatirlari(e).length;
    gozcu.al();
    const ates = performance.now();
    if (e.dosyaDegisti(s.olay) === 0) throw new Error("olay dosyasını kapsayan izleyici yok");
    const satir = await satirBekle(e, onceki + 1, 120_000);
    const kaydettenPanele = performance.now() - ates;
    olay = { ...satirOku(satir, gozcu.al()), kaydettenPanele: Math.round(kaydettenPanele) };
    if (dokYaz) dokumler.olay = dokum(e);
  }
  gozcu.durdur();
  e.kapat();
  const sonuc: KosuSonucu = { etkinlesme: Math.round(etkinlesme), baslangic, olay };
  if (dokYaz && s.dok) {
    writeFileSync(s.dok, JSON.stringify(dokumler));
    sonuc.ozet = { baslangic: ozetle(dokumler.baslangic!), olay: dokumler.olay ? ozetle(dokumler.olay) : undefined };
  }
  return sonuc;
}

// ── Ortanca ve tablo ────────────────────────────────────────────────────────

function ortanca(sayilar: readonly number[]): number {
  const s = [...sayilar].sort((a, b) => a - b);
  const o = Math.floor(s.length / 2);
  return s.length % 2 ? s[o]! : Math.round((s[o - 1]! + s[o]!) / 2);
}

const ALANLAR: readonly [keyof TurOlcumu, string][] = [
  ["toplam", "toplam"], ["okuma", "okuma"], ["ayristirma", "ayrıştırma"], ["denetim", "denetim"],
  ["capraz", "  çapraz"], ["dosyaPayi", "  dosya"], ["yayin", "yayın"], ["bolunmez", "bölünmez blok"],
  ["donguMax", "döngünün en uzun duraksaması"], ["kaydettenPanele", "kaydetten panele"],
];

function tablo(kosular: readonly KosuSonucu[]): string {
  const turlar: [string, (k: KosuSonucu) => TurOlcumu | undefined][] = [
    ["başlangıç", (k) => k.baslangic], ["olay", (k) => k.olay],
  ];
  const satirlar = ["| alan (ms, ortanca) | " + turlar.map(([ad]) => ad).join(" | ") + " |", "|---|" + turlar.map(() => "---:").join("|") + "|"];
  for (const [alan, etiket] of ALANLAR) {
    const hucreler = turlar.map(([, sec]) => {
      const degerler = kosular.map(sec).map((t) => t?.[alan]).filter((d): d is number => typeof d === "number");
      return degerler.length ? String(ortanca(degerler)) : "—";
    });
    if (hucreler.every((h) => h === "—")) continue;
    satirlar.push(`| ${etiket} | ${hucreler.join(" | ")} |`);
  }
  const ilk = kosular[0]!;
  satirlar.push(`| dosya sayısı | ${ilk.baslangic.dosya} | ${ilk.olay?.dosya ?? "—"} |`);
  satirlar.push(`| tetik | ${ilk.baslangic.tetik} | ${ilk.olay?.tetik ?? "—"} |`);
  satirlar.push("", `etkinleşme (activate, senkron): ortanca ${ortanca(kosular.map((k) => k.etkinlesme))} ms · koşu sayısı ${kosular.length}`);
  return satirlar.join("\n");
}

// ── Giriş ───────────────────────────────────────────────────────────────────

async function ana(): Promise<void> {
  const cocuk = process.env[COCUK_ANAHTARI];
  if (cocuk) {
    const { secenek, paket, dokYaz } = JSON.parse(cocuk) as { secenek: Secenek; paket: string; dokYaz: boolean };
    const sonuc = await tekKosu(secenek, paket, dokYaz);
    process.stdout.write(SONUC_ONEKI + JSON.stringify(sonuc) + "\n");
    process.exit(0);
  }
  const secenek = argumanlar(process.argv.slice(2));
  const paket = await paketKur();
  const kosular: KosuSonucu[] = [];
  try {
    for (let i = 0; i < secenek.kosu; i++) {
      const c = spawnSync(process.execPath, [BETIK], {
        env: { ...process.env, [COCUK_ANAHTARI]: JSON.stringify({ secenek, paket, dokYaz: i === 0 && secenek.dok !== undefined }) },
        encoding: "utf8", maxBuffer: 64 * 1024 * 1024,
      });
      const satir = c.stdout.split("\n").find((s) => s.startsWith(SONUC_ONEKI));
      if (c.status !== 0 || !satir) throw new Error(`koşu ${i + 1} düştü (çıkış ${c.status}):\n${c.stderr.slice(-4000)}`);
      kosular.push(JSON.parse(satir.slice(SONUC_ONEKI.length)) as KosuSonucu);
      process.stderr.write(`koşu ${i + 1}/${secenek.kosu}: başlangıç ${kosular.at(-1)!.baslangic.toplam} ms`
        + (kosular.at(-1)!.olay ? ` · olay ${kosular.at(-1)!.olay!.toplam} ms` : "") + "\n");
    }
  } finally {
    kabukTemizle();
  }
  if (secenek.json) console.log(JSON.stringify(kosular, null, 2));
  else console.log(tablo(kosular));
  if (kosular[0]!.ozet) console.log("\ndöküm özeti (sha256/16):", JSON.stringify(kosular[0]!.ozet));
}

await ana();

// ═══════════════════════════════════════════════════════════════════════════
// giydirmesiz-renk.test.ts — VIT-KIMLIK-A04 nöbetleri
//
//   Founder sorusu (2026-07-29): bir Sarmal projesi açıldığında geliştirici
//   renkler için "giydir" demek zorunda mı? Cevap hayırdır. Teklif, rengin
//   ancak kullanıcının ayar dosyasına yazılarak ulaşabildiği bir tasarım
//   kusurunun belirtisiydi. Renk artık pakette İLAN EDİLEREK ulaşıyor; bu
//   dosya iki şeyi birden ölçer: ilanın gerçekten TAM olduğunu ve aktivasyonun
//   gerçekten SESSİZ olduğunu.
//
//   Nöbetler metin avı değil DAVRANIŞ ölçer: giydir.ts sahte bir yürütücüyle
//   paketlenip GERÇEKTEN koşturulur, yürütücüye giden her ayar yazımı ve her
//   ileti sayılır.
// ═══════════════════════════════════════════════════════════════════════════
import { test } from "node:test";
import assert from "node:assert/strict";
import { copyFileSync, existsSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import esbuild from "esbuild";
import { uret, VARSAYILAN, anlamsalKurallar, acikAnlamsalKurallar } from "../arac/renk-uret.mjs";
import { giydirAyarlari } from "../src/giydir-ayar.ts";

const yol = (u: string): string => fileURLToPath(new URL(u, import.meta.url));
const oku = (u: string): string => readFileSync(yol(u), "utf8");
const KOK = dirname(yol("../package.json"));

const paket = JSON.parse(oku("../package.json"));
const palet = JSON.parse(oku("../../../oz/siniflama/kayit.json")).renkPaleti;
const ILAN_TIPLERI: string[] = (paket.contributes.semanticTokenTypes ?? []).map((t: { id: string }) => t.id);
const KAPSAM_ILANI = paket.contributes.semanticTokenScopes?.[0];

// ── 1) İLAN TAMLIĞI: kullanıcının kendi teması Sarmal'ı boyayabilsin ─────────

test("A04: ilan edilen HER anlamsal simge tipinin TextMate kapsam karşılığı vardır", () => {
  assert.ok(KAPSAM_ILANI, "contributes.semanticTokenScopes ilanı yok — kullanıcının kendi teması Sarmal kaynağını renklendiremez");
  assert.equal(KAPSAM_ILANI.language, "sarmal", "kapsam ilanı sarmal diline bağlanmalı");
  assert.deepEqual(
    Object.keys(KAPSAM_ILANI.scopes).sort(),
    [...ILAN_TIPLERI].sort(),
    "kapsamsız anlamsal simge tipi var — arac/renk-uret.mjs içindeki SIMGE_KAPSAM çizelgesine ekle; kapsamsız tip, kullanıcının temasında renksiz kalır",
  );
  for (const [tip, kapsamlar] of Object.entries(KAPSAM_ILANI.scopes as Record<string, string[]>) ) {
    assert.ok(Array.isArray(kapsamlar) && kapsamlar.length > 0, `${tip} kapsam listesi boş`);
    for (const k of kapsamlar)
      assert.match(k, /^[a-z][\w.-]*$/, `${tip} için geçersiz TextMate kapsamı: ${k}`);
  }
});

test("A04: kanondan üretilen her anlamsal kural ilan edilmiş bir tipe düşer (ilansız renk sessiz kalır)", () => {
  // Kaynak artık paket ilanı değildir (renk dayatılmaz — renk-yolu.test.ts);
  // kanon paletinin ürün yüzeyi iki Sarmal temasıdır ve nöbet oradan okur.
  const kurallar = Object.keys(
    JSON.parse(oku("../temalar/sarmal-koyu.json")).semanticTokenColors as Record<string, string>,
  );
  assert.deepEqual(
    kurallar.sort(), [...ILAN_TIPLERI].sort(),
    "kanondan renk alan bir simge tipi package.json'da ilan edilmemiş (ya da tersi) — ilansız tip kullanıcının temasına hiç ulaşmaz",
  );
});

// ── 2) TEMA KATKISI: tezgâh rengi ayar yazmadan gelir ───────────────────────

test("A04: iki renk teması ilan edilir ve dosyaları kanondan üretilmiştir", () => {
  const temalar = paket.contributes.themes ?? [];
  assert.equal(temalar.length, 2, "koyu ve açık Sarmal teması ilan edilmeli — tezgâh renkleri ayar yazmadan yalnız tema yoluyla gelir");
  const koyu = JSON.parse(oku("../temalar/sarmal-koyu.json"));
  const acik = JSON.parse(oku("../temalar/sarmal-acik.json"));
  assert.equal(koyu.type, "dark");
  assert.equal(acik.type, "light");
  assert.equal(koyu.semanticHighlighting, true, "tema anlamsal renklendirmeyi açmazsa Sarmal renkleri temada ölür");
  assert.equal(acik.semanticHighlighting, true);

  // Beklenen tablo üreticinin gerçek fonksiyonundan alınır (testin kendi
  // kopyası yoktur); temanın diskteki hâli elle oynanırsa burada kırmızı yanar.
  assert.deepEqual(koyu.semanticTokenColors, anlamsalKurallar(palet),
    "koyu temanın anlamsal renkleri kanon tablosundan sapmış");
  assert.deepEqual(acik.semanticTokenColors, { ...anlamsalKurallar(palet), ...acikAnlamsalKurallar(palet) },
    "açık temanın anlamsal renkleri kanonun açık eşlerinden sapmış");

  const rozet = palet.driftRozetleri;
  for (const tema of [koyu, acik]) {
    assert.equal(tema.colors["editorError.foreground"], rozet.hata);
    assert.equal(tema.colors["editorWarning.foreground"], rozet.uyari);
    assert.equal(tema.colors["editorInfo.foreground"], rozet.bilgi);
    assert.equal(tema.colors["checkbox.foreground"], palet.agacRenkleri["Adım"]);
  }
});

test("A04/YUZ-4.1: temaların taşıdığı HER renk kanon paletinden gelir — üretici hex uyduramaz", () => {
  const kanonRenkleri = new Set<string>();
  for (const alan of ["sadeRenkler", "sadeRenklerAcik", "aileler", "agacRenkleri", "kodOnekleri", "kodOnekleriAcik", "driftRozetleri"])
    for (const [ad, deger] of Object.entries(palet[alan] ?? {}))
      if (ad !== "not" && typeof deger === "string") kanonRenkleri.add(deger.toLowerCase());

  for (const dosya of ["../temalar/sarmal-koyu.json", "../temalar/sarmal-acik.json"]) {
    const tema = JSON.parse(oku(dosya));
    const adaylar: string[] = [
      ...Object.values(tema.colors as Record<string, string>),
      ...Object.values(tema.semanticTokenColors as Record<string, string>),
      ...(tema.tokenColors as Array<{ settings: { foreground?: string } }>)
        .map((k) => k.settings.foreground).filter((r): r is string => typeof r === "string"),
    ];
    for (const renk of adaylar)
      assert.ok(kanonRenkleri.has(renk.toLowerCase()),
        `${dosya} içinde kanonda bulunmayan renk var: ${renk} — tema yalnız SNF-0 paletinden boyanır (YUZ-4.1)`);
  }
});

test("A04/STR-3.1: ilan ve tema katkısı tek bir çalışma-zamanı bağımlılığı eklememiştir", () => {
  assert.deepEqual(Object.keys(paket.dependencies ?? {}), [],
    "eklenti çalışma-zamanı bağımlılığı kazanmış — sıfır bağımlılık ilkesi (STR-3.1) bozuldu");
});

// ── 3) AKTİVASYON SESSİZLİĞİ: teklif yok, yazım yok (gerçek kod koşturulur) ──

const gerek = createRequire(import.meta.url);
const yeniTur = (): Promise<void> => new Promise((c) => setTimeout(c, 0));

/** giydir.ts'i sahte bir yürütücüye bağlayarak paketler — kaynak metni değil
 *  ÇALIŞAN kod ölçülür. "vscode" ithali, testin her koşumda tazelediği bir
 *  global kayıt nesnesine yönlendirilir. */
const PAKETLENMIS = (() => {
  const dizin = mkdtempSync(join(tmpdir(), "sarmal-giydir-"));
  const sahteYol = join(dizin, "sahte-vscode.cjs");
  writeFileSync(sahteYol, "module.exports = globalThis.__SARMAL_SAHTE_VSCODE__;\n");
  // Giriş, giydir kaydının yanında dil kapısını da dışa açar: paketlenmiş kopya
  // kendi yüzey-metni örneğini taşır ve dili testin ön-yüklemesinden miras almaz.
  const giris = join(dizin, "giris.ts");
  writeFileSync(giris,
    `export { giydirKaydi } from ${JSON.stringify(join(KOK, "src", "giydir.ts"))};\n` +
    `export { yuzeyDiliniAyarla } from ${JSON.stringify(join(KOK, "src", "yuzey-metinleri.ts"))};\n`);
  const cikti = join(dizin, "giydir.cjs");
  esbuild.buildSync({
    entryPoints: [giris],
    bundle: true, format: "cjs", platform: "node", outfile: cikti,
    alias: { vscode: sahteYol }, logLevel: "silent",
  });
  // Önbellek anahtarı ÇÖZÜLMÜŞ yoldur (macOS'ta /var → /private/var); ham yolla
  // silmeye çalışmak modülü bayat bırakır ve ikinci nöbet birincinin kaydını ölçer.
  return realpathSync(cikti);
})();

interface Yazim { anahtar: string; deger: unknown; hedef: number }
interface Kayit { yazim: Yazim[]; ileti: string[]; komut: Array<{ ad: string; geri: () => void }> }

function sahteYurutucu(secenek: { kurulu?: string[]; ayarlar?: Record<string, unknown> } = {}): { kayit: Kayit; vscode: unknown } {
  const kayit: Kayit = { yazim: [], ileti: [], komut: [] };
  const ayarlar = secenek.ayarlar ?? {};
  const vscode = {
    ConfigurationTarget: { Global: 1, Workspace: 2, WorkspaceFolder: 3 },
    commands: {
      registerCommand: (ad: string, geri: () => void) => { kayit.komut.push({ ad, geri }); return { dispose(): void {} }; },
    },
    window: {
      showInformationMessage: (metin: string) => { kayit.ileti.push(metin); return Promise.resolve(undefined); },
      showWarningMessage: (metin: string) => { kayit.ileti.push(metin); return Promise.resolve(undefined); },
    },
    workspace: {
      workspaceFolders: [{ name: "bos-proje", index: 0, uri: { fsPath: join(tmpdir(), "bos-proje") } }],
      getConfiguration: () => ({
        get: (anahtar: string, varsayilan?: unknown) => ayarlar[anahtar] ?? varsayilan,
        inspect: () => undefined,
        update: (anahtar: string, deger: unknown, hedef: number) => { kayit.yazim.push({ anahtar, deger, hedef }); return Promise.resolve(); },
      }),
    },
    extensions: {
      getExtension: (kimlik: string) => ((secenek.kurulu ?? []).includes(kimlik) ? { id: kimlik } : undefined),
    },
  };
  return { kayit, vscode };
}

function giydirModulu(vscode: unknown): { giydirKaydi: (c: { subscriptions: unknown[] }) => void } {
  (globalThis as Record<string, unknown>).__SARMAL_SAHTE_VSCODE__ = vscode;
  delete gerek.cache[PAKETLENMIS];
  const modul = gerek(PAKETLENMIS);
  modul.yuzeyDiliniAyarla("tr");
  return modul;
}

test("A04 DAVRANIŞ: aktivasyonda HİÇBİR teklif çıkmaz ve TEK BİR ayar anahtarı yazılmaz", async () => {
  const { kayit, vscode } = sahteYurutucu();
  giydirModulu(vscode).giydirKaydi({ subscriptions: [] });
  await yeniTur();
  assert.deepEqual(kayit.ileti, [],
    "açılışta kullanıcıya ileti gösterildi — ürünle ilk karşılaşma bir izin sorusu olmamalıdır (Founder 2026-07-29)");
  assert.equal(kayit.yazim.length, 0,
    `açılışta kullanıcının ayarına ${kayit.yazim.length} anahtar yazıldı — kendiliğinden yazılan anahtar sayısı SIFIR olmalıdır`);
  assert.deepEqual(kayit.komut.map((k) => k.ad), ["sarmal.giydir"],
    "giydir komutu elle çalışan kolaylık olarak kayıtlı kalmalı");
  const ayarlar = paket.contributes.configuration.properties ?? {};
  assert.ok(!("sarmal.otoGiydir" in ayarlar),
    "teklif kalktığına göre onu susturan ayar da kalkmalı — ölü düğme kalırsa kullanıcı olmayan bir davranışı kapatmaya çalışır");
});

test("A04 DAVRANIŞ: giydir komutu elle çağrıldığında YALNIZ çalışma alanı hedefine yazar", async () => {
  const { kayit, vscode } = sahteYurutucu();
  const modul = giydirModulu(vscode);
  modul.giydirKaydi({ subscriptions: [] });
  kayit.komut[0].geri();
  await yeniTur();
  assert.deepEqual(kayit.yazim.map((y) => y.anahtar), Object.keys(giydirAyarlari()),
    "komut kanon tablosunun tamamını yazmalı — eksik yazım yarı-giyinik çalışma alanı bırakır");
  for (const y of kayit.yazim)
    assert.equal(y.hedef, 2,
      `"${y.anahtar}" çalışma alanı yerine ${y.hedef} hedefine yazıldı — kullanıcı ayarı hiçbir koşulda ezilmez`);
});

test("A04 DAVRANIŞ: rakip susturma kullanıcının mevcut listesini korur, kurulu olmayana dokunmaz", async () => {
  const { kayit, vscode } = sahteYurutucu({
    kurulu: ["oderwat.indent-rainbow"],
    ayarlar: { "indentRainbow.excludedLanguages": ["markdown"] },
  });
  const modul = giydirModulu(vscode);
  modul.giydirKaydi({ subscriptions: [] });
  kayit.komut[0].geri();
  await yeniTur();
  const susturma = kayit.yazim.find((y) => y.anahtar === "indentRainbow.excludedLanguages");
  assert.deepEqual(susturma?.deger, ["markdown", "sarmal"],
    "kullanıcının mevcut susturma listesi korunmalı — üzerine yazmak kullanıcının kararını siler");
  assert.equal(susturma?.hedef, 2, "susturma da yalnız çalışma alanına yazılır");
  assert.ok(!kayit.yazim.some((y) => y.anahtar === "errorLens.excludePatterns"),
    "kurulu olmayan eklentinin ayarına dokunulmamalı");
});

// ── 4) ÜRETİCİ İDEMPOTANSI (YUZ-1.3) ────────────────────────────────────────

test("A04/YUZ-1.3: üretici ikinci koşuda TEK BAYT fark üretmez", () => {
  const dizin = mkdtempSync(join(tmpdir(), "sarmal-idempotans-"));
  const yollar = {
    PAKET: join(dizin, "package.json"),
    AYAR: join(dizin, "settings.json"),
    GOMULU: join(dizin, "gomulu-kanon.ts"),
    TEMA_KOYU: join(dizin, "sarmal-koyu.json"),
    TEMA_ACIK: join(dizin, "sarmal-acik.json"),
  };
  copyFileSync(yol("../package.json"), yollar.PAKET);
  copyFileSync(VARSAYILAN.AYAR!, yollar.AYAR);
  uret(yollar);
  const ilk = Object.fromEntries(Object.entries(yollar).map(([ad, y]) => [ad, readFileSync(y, "utf8")]));
  uret(yollar);
  for (const [ad, y] of Object.entries(yollar))
    assert.equal(readFileSync(y, "utf8"), ilk[ad],
      `${ad} ikinci koşuda değişti — üretim deterministik değil (YUZ-1.3 idempotent yüz üretimi)`);
});

// ── 5) DEPO SINIRI (GOC-A05) ────────────────────────────────────────────────
//   Üreteç, çalışma-alanı ayarına üç seviye yukarı çıkan sabit bir yolla
//   ulaşıyordu. O yazım bu tek depoda doğru sonuç veriyordu, buna karşılık
//   açık araç kendi deposuna ayrıldığı gün deponun DIŞINA uzanacaktı. Hedef
//   artık ölçülüyor: `.git` işaretini taşıyan ilk üst dizin sınır sayılır.

test("A05: üretecin yazdığı ayar dosyası depo sınırının İÇİNDEDİR", () => {
  assert.ok(VARSAYILAN.AYAR, "çalışma-alanı ayarının yeri çözülemedi — betik bir git deposunun içinde koşmuyor olabilir");
  let kok = KOK;
  while (!existsSync(join(kok, ".git"))) {
    const ust = dirname(kok);
    assert.notEqual(ust, kok, "ölçüm fikstürü bozuk: eklentinin üstünde hiç depo kökü yok");
    kok = ust;
  }
  assert.equal(VARSAYILAN.AYAR, join(kok, ".vscode", "settings.json"),
    "üreteç deponun dışına ya da başka bir yere yazıyor — ayrılık gününde komşu ağaca yazan bir betik sessizce yanlış iş yapar");
  assert.ok(!VARSAYILAN.AYAR!.includes(".."),
    "çözülen yol hâlâ göreli sıçrama taşıyor — sınır ölçülmemiş, tahmin edilmiş demektir");
});

test("A05: hedef bulunamadığında üreteç SESSİZ KALMAZ, dürüst hata basar", () => {
  const dizin = mkdtempSync(join(tmpdir(), "sarmal-sinir-"));
  const yollar = {
    PAKET: join(dizin, "package.json"),
    AYAR: join(dizin, "olmayan", "settings.json"),
    GOMULU: join(dizin, "gomulu-kanon.ts"),
    TEMA_KOYU: join(dizin, "sarmal-koyu.json"),
    TEMA_ACIK: join(dizin, "sarmal-acik.json"),
  };
  copyFileSync(yol("../package.json"), yollar.PAKET);
  assert.throws(() => uret(yollar), /çalışma-alanı ayarı beklenen yerde yok/,
    "hedefi olmayan koşum sessizce geçti — sessiz düşüş, yanlış yere yazmakla aynı sınıftadır");
});

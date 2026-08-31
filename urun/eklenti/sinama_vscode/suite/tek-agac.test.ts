// ═══════════════════════════════════════════════════════════════════════════
// tek-agac.test.ts — 🗺️ TEK AĞACIN GERÇEK EDİTÖR KABUĞUNDAKİ ALTI NÖBETİ
//                     (PRF-TA-A04 · Faz "2026 Performans Mevsimi" › Blok "Tek
//                      Ağaç" › Katman "Eklenti Tek Ağaç Katmanı" › AltKatman
//                      "Tek Ağaç Nöbetleri")
//
//   ÖLÇÜLEN KUSUR (2026-08-30 · SRN-IDE-KASMA-SOL-KOSUSU · OZK-12): yol haritası
//   paneli denetim turunun ZATEN kurduğu ağacı ikinci kez kuruyordu — tur başına
//   iki dosya araması, iki yüz yetmiş altı belge açma çağrısı ve ayrı bir graf;
//   kanalda panel turu yirmi bin dokuz milisaniye ölçüldü. PRF-TA-A02 turun tek
//   yayınını, PRF-TA-A03 panelin o yayına abone olmasını getirdi. Bu dosya o
//   onarımın GERÇEK VS Code kabuğundaki nöbetidir.
//
//   NEDEN GERÇEK KABUK: birim süiti (sinama/performans.test.ts ile
//   sinama/tur-goruntusu.test.ts) mekanizmayı saf modüller üzerinde ve kaynak
//   metniyle ölçer; ikisi de doğrudur ve ikisi de canlı eklentiyi koşturmaz.
//   Adımın birinci görev maddesi ölçümün gerçek kabukta yapılmasını ister, çünkü
//   panelin dosya aramadığı ve belge açmadığı iddiası ancak canlı bir turda
//   sayılabilir: saf modül zaten dosya sistemi tanımaz, dolayısıyla orada sıfır
//   görmek hiçbir şey kanıtlamaz.
//
//   ⚠️ SAHTE YEŞİL TUZAĞI VE ONDAN KAÇIŞ. Bu süit esbuild ile `bundle: true`
//   paketlenir: bir test dosyası `../../src/yolharitasi.ts` modülünü ithal
//   ederse o modülün bir KOPYASI test paketine girer ve canlı eklenti kendi
//   örneğini koşturur. İki örnek ayrıdır; modül düzeyindeki sayaçlar
//   PAYLAŞILMAZ. Sayacı kendi ithalinden okuyan bir nöbet, canlı panel yüz kere
//   dosya arasa bile SIFIR görür ve sahte yeşil yanar — yani Adımın ölçmek
//   istediği şeyin tam tersini kanıtlar. Bu yüzden aşağıdaki altı nöbetin
//   HİÇBİRİ üretim sayacını kendi ithalinden okumaz: hepsi eklentinin dış
//   yüzünden (`activate` dönüşü · eklenti.ts `SarmalEklentiYuzu`) okur. Emsal
//   `onayOlcumleri` kapısıdır ve gerekçesi orada yazılıdır.
//
//   Çekirdeğin sözcükleyicisi ile ayrıştırıcısı (`belirtecle` · `ayristir`) bu
//   yasağın DIŞINDADIR ve bilinçle ithal edilir: onlar sayaç taşımayan saf
//   işlevlerdir ve altıncı nöbetin bağımsız kolu dili ayrıştırmak zorundadır.
//   Ayrıştırıcının ikinci bir örneği aynı metinden aynı ağacı kurar.
//
//   ALTI NÖBET (Adımın ikinci görev maddesiyle birebir):
//     ① SIFIR      — bir panel turunda `goruntuTuru` bir artarken panelin dosya
//                    araması ile belge açma sayacı KIPIRDAMAZ.
//     ② DARALTMA   — daraltılmış turda görüntü boyutu tam turla AYNIDIR.
//     ③ AYRIM      — `kirik` ile okunamayan kümeleri KESİŞMEZ; dört küme taranan
//                    yol kümesini bölüşür.
//     ④ TEK DEĞİŞİM— bir tur panelde TAM BİR değişim olayı üretir; tur sayısı,
//                    yayın sayısı ve çizim sayısı birbirine eşittir.
//     ⑤ ÖNBELLEK   — turdan sonra paylaşılan AST önbelleğinde YALNIZ açık
//                    belgeler vardır; diskten okunan dosya oraya girmez.
//     ⑥ EŞDEĞERLİK — görüntüden kurulan ağaç, bağımsız bir eski tarama ile AYNI
//                    kod kümesini verir.
//
//   Koşum: cd urun/eklenti && npm run test:vscode
//
//   ⚠️ SÜİTİN BUGÜNKÜ KIRMIZILARI BU DOSYAYA AİT DEĞİLDİR. `sinama_vscode/`
//   dizini deponun doğduğu 2026-08-25 gecesinden beri değişmemiştir, oysa
//   ölçtüğü üretim gövdesi o tarihten sonra üç kez değişti; ölçülen taban
//   yirmi iki geçen, on beş kalandır (2026-08-31; kontrolcü ile denetçinin
//   birbirinden bağımsız koşularında aynı çıkmıştır). Bir sınama kararsızdır
//   ve tabanı yirmi bire düşürebilir: 'PANEL SATIRI: Kapıya git' nöbeti bazı
//   koşularda bir yerine iki belge açıldığını ölçer.
//   Bu dosyanın nöbetleri o tabanın DIŞINDADIR ve kendi adlarıyla görünür.
// ═══════════════════════════════════════════════════════════════════════════

import * as assert from "node:assert";
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import type { Dugum, Param } from "../../../cekirdek/src/sozdizim.ts";
import { belirtecle } from "../../../cekirdek/src/belirtec.ts";
import { ayristir } from "../../../cekirdek/src/ayristirici.ts";

const EKLENTI = "nexivion-labs.sarmal";

// ── 📏 ÖLÇÜM KAPISI: EKLENTİNİN DIŞ YÜZÜ ─────────────────────────────────────
//   Yüzün tipi burada YENİDEN bildirilir, üretimden ithal edilmez: ithal, tipi
//   getirirken modülün kendisini de test paketine sokmaz fakat nöbeti üretimin
//   iç yapısına bağlar. Yapısal uyum yeter; bir alan üretimde ölürse çağrı
//   burada `undefined` döner ve nöbet onu adıyla söyler.

interface PanelOlcumu {
  goruntuTuru: number;
  tamDegisim: number;
  izTuru: number;
  dosyaAramasi: number;
  belgeAcma: number;
}

interface TurOlcumu {
  yayın: number;
  dinleyiciÇağrısı: number;
  dinleyiciHatası: number;
  sıra: number;
  dinleyici: number;
  tur: number;
}

interface GoruntuOzeti {
  sıra: number;
  tetik: string;
  kapsam: string | undefined;
  programlar: string[];
  yollar: string[];
  kirik: string[];
  okunamayan: number;
  dilDışı: string[];
}

interface TekAgacYuzu {
  panelOlcumleri(): PanelOlcumu;
  turOlcumleri(): TurOlcumu;
  sonGoruntuOzeti(): GoruntuOzeti | undefined;
  onbellekAnahtarlari(): string[];
  yolHaritasiKodlari(): string[];
}

/** Canlı eklentinin dış yüzü. Kapılar yoksa nöbet sessizce yeşil yanmaz, durur. */
async function yuz(): Promise<TekAgacYuzu> {
  const ext = vscode.extensions.getExtension(EKLENTI);
  assert.ok(ext, `${EKLENTI} bulunamadı`);
  const disYuz = (await ext!.activate()) as TekAgacYuzu;
  for (const kapı of ["panelOlcumleri", "turOlcumleri", "sonGoruntuOzeti",
                      "onbellekAnahtarlari", "yolHaritasiKodlari"] as const) {
    assert.strictEqual(typeof disYuz?.[kapı], "function",
      `eklenti dış yüzü ${kapı} kapısını vermiyor; nöbet kendi ithalinden okusaydı ` +
      "canlı eklentinin değil kendi kopyasının sayaçlarını görür ve sahte yeşil yanardı");
  }
  return disYuz;
}

const kok = (): string => vscode.workspace.workspaceFolders![0]!.uri.fsPath;
const uyu = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Bir koşul sağlanana dek kısa aralıklarla bekler (onay-yuzeyi.test.ts deseni). */
async function bekle(kosul: () => boolean, msSon = 20_000): Promise<boolean> {
  const bitis = Date.now() + msSon;
  while (Date.now() < bitis) {
    if (kosul()) return true;
    await uyu(150);
  }
  return kosul();
}

// ── ⏳ DURGUNLUK: ÖLÇÜM ANCAK HAREKETSİZ BİR PENCEREDE ANLAMLIDIR ────────────
//   Kabukta iki geciktirici hat vardır: `.sar` olayları üç yüz, disk olayları
//   bin beş yüz milisaniye bekler. Ölçüm bu hatlar boşalmadan alınırsa bir
//   sonraki tur pencerenin ortasında düşer ve fark yanlış tura yazılır. Bu
//   yüzden her ölçüm önce durgunluk bekler: sayaçlar üst üste iki bin beş yüz
//   milisaniye hiç kıpırdamazsa pencere temizdir.

interface Anlik { panel: PanelOlcumu; tur: TurOlcumu }

const anlik = (y: TekAgacYuzu): Anlik => ({ panel: y.panelOlcumleri(), tur: y.turOlcumleri() });
const imza = (a: Anlik): string => JSON.stringify([a.panel, a.tur]);

async function durgunlas(y: TekAgacYuzu, durgunMs = 2_500, enFazlaMs = 20_000): Promise<void> {
  const bitis = Date.now() + enFazlaMs;
  let son = imza(anlik(y));
  let sabitten = Date.now();
  while (Date.now() < bitis) {
    await uyu(200);
    const yeni = imza(anlik(y));
    if (yeni !== son) { son = yeni; sabitten = Date.now(); continue; }
    if (Date.now() - sabitten >= durgunMs) return;
  }
}

/**
 * Bir turu tetikler ve turun öncesi ile sonrasını döndürür. Pencere ÖNCE
 * durgunlaştırılır, tur sayacının arttığı görülür, sonra pencere yeniden
 * durgunlaştırılır; böylece fark tek bir turun tamamına aittir.
 */
async function turPenceresi(
  y: TekAgacYuzu, tetikle: () => void | Thenable<unknown>,
): Promise<{ once: Anlik; sonra: Anlik }> {
  await durgunlas(y);
  const once = anlik(y);
  await tetikle();
  const kostu = await bekle(() => y.turOlcumleri().tur > once.tur.tur, 20_000);
  assert.ok(kostu, "tetiklenen tur hiç koşmadı; nöbet ölçecek bir olay bulamadı");
  await durgunlas(y);
  return { once, sonra: anlik(y) };
}

/** El ile yenileme düğmesinin komutu: 'el-ile' tetikli TAM tur ister. */
const tamTurIste = (): Thenable<unknown> =>
  vscode.commands.executeCommand("sarmal.yolHaritasiYenile");

// ── 🧪 GEÇİCİ DOSYALAR ───────────────────────────────────────────────────────
//   Nöbetin kendi malzemesi çalışma alanının altında yaşar ve süit bitince
//   silinir. Dar tur nöbeti dosyanın `altin_yol/` varlığının altında olmasını
//   ister, çünkü daraltma ancak odaktaki varlık çalışma alanı kökünün ALTINDA
//   bir kökse yapılır (izleyici-cekirdek `turKapsami`).

const gecicilerSil: string[] = [];

function geciciSar(goreli: string, icerik: string): vscode.Uri {
  const tam = path.join(kok(), goreli);
  fs.mkdirSync(path.dirname(tam), { recursive: true });
  fs.writeFileSync(tam, icerik, "utf8");
  if (!gecicilerSil.includes(tam)) gecicilerSil.push(tam);
  return vscode.Uri.file(tam);
}

const ODAK_VARLIK = "altin_yol";
const NOBET_SAR = path.join(ODAK_VARLIK, "_ta04-nobet.sar");
const ODAK_ACAN_SAR = path.join(ODAK_VARLIK, "ortak", "tema.sar");

const NOBET_GOVDESI = (tur: number): string =>
  `// PRF-TA-A04 nöbet malzemesi — tur ${tur}\n` +
  `Faz( kod: TA04-FAZ, ad: "nöbet mevsimi" ) {\n` +
  `  Blok( kod: TA04-BLOK, ad: "nöbet bloku" ) {\n` +
  `    Katman( kod: TA04-KATMAN, ad: "nöbet katmanı" ) {\n` +
  `      AltKatman( kod: TA04-ALT, ad: "nöbet dalı" ) {\n` +
  `        Adım( kod: TA04-A01, durum: beklemede, ne: "🧪 nöbet malzemesi" )\n` +
  `      }\n` +
  `    }\n` +
  `  }\n` +
  `}\n`;

// ── 🌳 BAĞIMSIZ REFERANS KOL (⑥ EŞDEĞERLİK nöbetinin ikinci gözü) ────────────
//   Kol üretimin HİÇBİR yardımcısını kullanmaz: dışlama listesi, plan tipleri
//   kümesi ve ağaç gezinmesi burada yeniden yazılmıştır (PRF-TA-A03 denetçisinin
//   üçüncü tur şartı: referans kolu üretimle yardımcı paylaşırsa ortak bir
//   mutasyon iki koldan birden geçer ve eşdeğerlik nöbeti hiçbir şey ölçmez).
//   Kol yalnız dili ayrıştırmak için çekirdeğin sözcükleyicisi ile
//   ayrıştırıcısını kullanır; ikisi de sayaçsız saf işlevlerdir.
//
//   Kol ESKİ taramanın davranışını taşır: dosyaları kendisi bulur (disk
//   yürüyüşü), metni açık belgeden ya da diskten okur ve ağacı kendisi kurar.
//   Açık belgeye öncelik vermesi eski `openTextDocument` yolunun ikizidir:
//   kaydedilmemiş bir düzenleme varsa panelin gördüğü metin odur.

const REFERANS_DISLANAN: ReadonlySet<string> = new Set([
  "node_modules", "__pycache__", "dist", "out", "arsiv", "fikstur", "sablon", "ornek",
]);

const REFERANS_PLAN_TIPLERI: ReadonlySet<string> = new Set([
  "Blok", "Faz", "Katman", "AltKatman", "Adım",
]);

/** Çalışma alanı kökünün altındaki `.sar` dosyaları — dışlama DİZİN adlarına bakar. */
function referansDosyalar(kokDizin: string): string[] {
  const bulunan: string[] = [];
  const gez = (dizin: string): void => {
    let girdiler: fs.Dirent[];
    try { girdiler = fs.readdirSync(dizin, { withFileTypes: true }); }
    catch { return; }
    for (const g of girdiler) {
      const tam = path.join(dizin, g.name);
      if (g.isDirectory()) {
        if (g.name.startsWith(".") || REFERANS_DISLANAN.has(g.name)) continue;
        gez(tam);
      } else if (g.isFile() && g.name.endsWith(".sar")) {
        bulunan.push(tam);
      }
    }
  };
  gez(kokDizin);
  return bulunan.sort();
}

/** Bir düğümün alanı: önce parametre, sonra gövde özelliği (motorun `alanDeger` dersi). */
function referansAlan(d: Dugum, ad: string): Param | undefined {
  return d.parametreler.find((p) => p.ad === ad) ?? d.ozellikler.find((p) => p.ad === ad);
}

/** Bir programın plan kodları: kök `Blok`/`Faz` ve altındaki plan kademeleri. */
function referansKodlari(bildirimler: readonly Dugum[]): string[] {
  const kodlar: string[] = [];
  const yap = (d: Dugum): void => {
    kodlar.push(referansAlan(d, "kod")?.deger.metin ?? d.ad);
    for (const c of d.cocuklar) if (REFERANS_PLAN_TIPLERI.has(c.ad)) yap(c);
  };
  const gez = (d: Dugum): void => {
    if (d.ad === "Blok" || d.ad === "Faz") { yap(d); return; }
    for (const c of d.cocuklar) gez(c);
  };
  for (const b of bildirimler) gez(b);
  return kodlar;
}

/** Eski taramanın kod kümesi. Ayrıştırılamayan dosya sessizce atlanır (kırık dosya). */
function referansTarama(kokDizin: string, dilDisi: readonly string[]): Set<string> {
  const atla = new Set(dilDisi);
  const acikMetin = new Map<string, string>();
  for (const doc of vscode.workspace.textDocuments) {
    if (doc.uri.scheme !== "file") continue;
    acikMetin.set(doc.uri.fsPath, doc.getText());
  }
  const kumesi = new Set<string>();
  for (const yol of referansDosyalar(kokDizin)) {
    if (atla.has(yol)) continue;
    let metin: string | undefined = acikMetin.get(yol);
    if (metin === undefined) {
      try { metin = fs.readFileSync(yol, "utf8"); } catch { continue; }
    }
    try {
      for (const kod of referansKodlari(ayristir(belirtecle(metin)).bildirimler)) kumesi.add(kod);
    } catch { /* söz dizimi kırık dosya haritaya girmez — üretimle aynı davranış */ }
  }
  return kumesi;
}

const sirali = (k: Iterable<string>): string[] => [...new Set(k)].sort();

describe("Sarmal tek ağaç — panelin turun yayınına bağlanmasının canlı ölçümü (PRF-TA-A04)", () => {
  before(async () => {
    await yuz();
    geciciSar(NOBET_SAR, NOBET_GOVDESI(1));
  });

  after(() => {
    for (const y of gecicilerSil) try { fs.unlinkSync(y); } catch { /* zaten yok */ }
  });

  // ── ① SIFIR ───────────────────────────────────────────────────────────────
  it("SIFIR: bir panel turunda dosya araması ve belge açma sayacı KIPIRDAMAZ", async () => {
    const y = await yuz();
    const { once, sonra } = await turPenceresi(y, () => tamTurIste());

    const turFarki = sonra.panel.goruntuTuru - once.panel.goruntuTuru;
    assert.ok(turFarki >= 1,
      `panel bu pencerede hiç tur koşmadı (goruntuTuru farkı ${turFarki}); ` +
      "nöbet hareketsiz bir pencerede sıfır ölçüp sahte yeşil yanamaz");

    // İz hattı panelde kalan TEK dosya aramasının sahibidir (Adımın sınırı: iz
    // hattı değişmez). Kıpırdarsa aşağıdaki sıfır ölçümü panele değil ona ait
    // olurdu; bu yüzden önce onun durduğu gösterilir.
    assert.strictEqual(sonra.panel.izTuru - once.panel.izTuru, 0,
      "ölçüm penceresinde izlerin kendi turu koştu; dosya araması sayacı panele ait değil");

    assert.strictEqual(sonra.panel.dosyaAramasi - once.panel.dosyaAramasi, 0,
      `panel turu ${sonra.panel.dosyaAramasi - once.panel.dosyaAramasi} dosya araması yaptı; ` +
      "turun ZATEN taradığı evren ikinci kez taranıyor (A01 tabanının iki aramalı kalemi geri geldi)");
    assert.strictEqual(sonra.panel.belgeAcma - once.panel.belgeAcma, 0,
      `panel turu ${sonra.panel.belgeAcma - once.panel.belgeAcma} belge açtı; ` +
      "A01 tabanının yaklaşık yirmi yedi saniyelik iki yüz yetmiş altı açma çağrısı geri geldi");
  });

  // ── ② DARALTMA ────────────────────────────────────────────────────────────
  it("DARALTMA: daraltılmış turda görüntü boyutu tam turla AYNIDIR", async () => {
    const y = await yuz();

    // Odak, çalışma alanı kökünün ALTINDAKİ bir varlığa çekilir; daraltma ancak
    // o zaman yapılır (turKapsami: kökün kendisi ya da kök dışı odak daraltılmaz).
    const odakDosya = vscode.Uri.file(path.join(kok(), ODAK_ACAN_SAR));
    assert.ok(fs.existsSync(odakDosya.fsPath),
      `korpusun odak dosyası yok: ${odakDosya.fsPath}; nöbet dar tur kuramaz`);
    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(odakDosya));

    // ① TAM tur: 'el-ile' tetiği daraltılmaz (TAM_TUR_TETIKLERI).
    await turPenceresi(y, () => tamTurIste());
    const tam = y.sonGoruntuOzeti();
    assert.ok(tam, "tam turdan sonra ortada görüntü yok");
    assert.strictEqual(tam!.kapsam, undefined,
      `el ile istenen tur daraltılmış (kapsam ${tam!.kapsam}); kullanıcı bütün çalışma alanını bekler`);

    // ② DAR tur: dosya diskten değiştirilir → 'sar-olayı' tetiği daraltılır.
    await turPenceresi(y, () => { geciciSar(NOBET_SAR, NOBET_GOVDESI(2)); });
    const dar = y.sonGoruntuOzeti();
    assert.ok(dar, "dar turdan sonra ortada görüntü yok");
    assert.ok(dar!.sıra > tam!.sıra, "ikinci ölçüm hâlâ ilk görüntüyü okuyor; iki tur ayrışmadı");

    // Nöbet ancak GERÇEKTEN daraltılmış bir turda bir şey ölçer.
    assert.ok(dar!.kapsam !== undefined,
      `tur daralmadı (tetik ${dar!.tetik}); odak kurulmamış olabilir — nöbet boş pencerede koşuyor`);
    assert.strictEqual(dar!.kapsam, path.join(kok(), ODAK_VARLIK),
      `tur beklenen varlığa değil ${dar!.kapsam} köküne daraldı`);

    // ÖLÇÜLEN HÜKÜM: daraltma yalnız çapraz denetimin köklerini seçer; belge
    // toplama ile ayrıştırma her turda BÜTÜN yollar üzerinde koşar.
    assert.strictEqual(dar!.programlar.length, tam!.programlar.length,
      `dar turda program haritası ${dar!.programlar.length}, tam turda ${tam!.programlar.length}; ` +
      "kapsam etiketi haritayı süzmeye başlamış ve panel odak dışındaki rayları kaybeder");
    assert.strictEqual(dar!.yollar.length, tam!.yollar.length,
      "dar turda taranan yol kümesi küçüldü; daraltma dosya aramasına sızmış");
    assert.deepStrictEqual(sirali(dar!.programlar), sirali(tam!.programlar),
      "dar tur ile tam turun program haritaları aynı boyutta fakat farklı dosyaları taşıyor");
  });

  // ── ③ AYRIM ───────────────────────────────────────────────────────────────
  it("AYRIM: kırık ile okunamayan kesişmez; dört küme taranan yolu bölüşür", async () => {
    const y = await yuz();
    const bozukYol = path.join(kok(), ODAK_VARLIK, "_ta04-bozuk.sar");
    try {
      await turPenceresi(y, () => { geciciSar(path.join(ODAK_VARLIK, "_ta04-bozuk.sar"), "Faz( kod: "); });
      const g = y.sonGoruntuOzeti();
      assert.ok(g, "turdan sonra ortada görüntü yok");

      // Nöbet boş küme üstünde koşmaz: kırık listesi gerçekten dolmalıdır.
      assert.ok(g!.kirik.includes(bozukYol),
        `söz dizimi kırık dosya kırık listesinde değil (liste: ${g!.kirik.length} öğe); ` +
        "nöbet boş küme üstünde koşuyor");
      assert.ok(!g!.programlar.includes(bozukYol), "kırık dosya program haritasına girdi");

      // KESİŞMEZLİK: kırık dosya OKUNMUŞTUR, okunamayan sayılamaz. Kırık dosya
      // dururken okunamayan sayısı sıfır kalmalıdır; artıyorsa iki küme aynı
      // kaynaktan türetilmiş ve panel bir dosyayı hem kırık hem kayıp gösterir.
      assert.strictEqual(g!.okunamayan, 0,
        `kırık dosya dururken okunamayan sayısı ${g!.okunamayan}; ` +
        "okunamayan yalnız diskten okunamayıp atlananı sayar (A01 sözleşmesi)");
      for (const yol of g!.kirik) {
        assert.ok(!g!.dilDışı.includes(yol), `dosya hem kırık hem dil dışı sayıldı: ${yol}`);
        assert.ok(g!.yollar.includes(yol), `kırık dosya taranan yol kümesinde yok: ${yol}`);
      }

      // BÖLÜŞME: dört kümenin toplamı taranan yol sayısına eşittir. Bir dosya
      // iki kez ya da hiç sayılırsa bu özdeşlik bozulur.
      assert.strictEqual(
        g!.programlar.length + g!.kirik.length + g!.okunamayan + g!.dilDışı.length,
        g!.yollar.length,
        `taranan ${g!.yollar.length} yol dört kümeye bölünmüyor ` +
        `(harita ${g!.programlar.length} · kırık ${g!.kirik.length} · ` +
        `okunamayan ${g!.okunamayan} · dil dışı ${g!.dilDışı.length})`);
    } finally {
      try { fs.unlinkSync(bozukYol); } catch { /* zaten yok */ }
      await durgunlas(y);
    }
  });

  // ── ④ TEK DEĞİŞİM ─────────────────────────────────────────────────────────
  it("TEK DEĞİŞİM: tur, yayın ve panel çizimi BİRE BİR eşleşir", async () => {
    const y = await yuz();
    const { once, sonra } = await turPenceresi(y, () => tamTurIste());

    const tur = sonra.tur.tur - once.tur.tur;
    const yayın = sonra.tur.yayın - once.tur.yayın;
    const cizim = sonra.panel.tamDegisim - once.panel.tamDegisim;
    const panelTuru = sonra.panel.goruntuTuru - once.panel.goruntuTuru;

    assert.ok(tur >= 1, `pencerede hiç tur koşmadı (${tur}); nöbet ölçecek olay bulamadı`);
    assert.strictEqual(yayın, tur,
      `${tur} tur ${yayın} görüntü yayınladı; tur başına tek yayın hükmü bozuldu ` +
      "(ikinci bir yayın noktası panelin ağacını aynı turda iki kez kurar)");
    assert.strictEqual(panelTuru, tur,
      `${tur} tur panelde ${panelTuru} kez işlendi; panel yayının abonesi olmaktan çıkmış`);
    assert.strictEqual(cizim, tur,
      `${tur} tur panelde ${cizim} tam değişim olayı üretti; ağaç tur başına bir kezden ` +
      "farklı sayıda çizilir ve kullanıcı yanıp sönen bir panel görür");
    assert.strictEqual(sonra.tur.dinleyiciHatası - once.tur.dinleyiciHatası, 0,
      "yayın sırasında bir abone çöktü; tur ayakta kaldı fakat bir tüketici bayat kaldı");
  });

  // ── ⑤ ÖNBELLEK ────────────────────────────────────────────────────────────
  it("ÖNBELLEK: tur diskten okuduğu hiçbir dosyayı paylaşılan belleğe YAZMAZ", async () => {
    const y = await yuz();

    // Açık bir `.sar` şarttır: bellek her zaman boşsa nöbet hiçbir şey ölçmez.
    const acikUri = vscode.Uri.file(path.join(kok(), NOBET_SAR));
    const acikDoc = await vscode.workspace.openTextDocument(acikUri);
    await vscode.window.showTextDocument(acikDoc);
    await turPenceresi(y, () => tamTurIste());

    const g = y.sonGoruntuOzeti();
    assert.ok(g, "turdan sonra ortada görüntü yok");
    const anahtarlar = y.onbellekAnahtarlari();
    const acikKume = new Set(vscode.workspace.textDocuments.map((d) => d.uri.toString()));

    assert.ok(anahtarlar.includes(acikUri.toString()),
      "açık belge paylaşılan bellekte yok; bellek hiç kullanılmıyor ve nöbet boş küme ölçüyor");

    // ① Bellekteki HER anahtar açık bir belgeye karşılık gelir.
    //
    //    KAPSAM SINIRI (ölçülmüş, 2026-08-31): diskte ARTIK OLMAYAN bir dosyanın
    //    kaydı bu ölçümün dışındadır ve bu bilinçli bir sınırdır. Bu sınır tek
    //    başına bırakılamaz, çünkü bu korpusta kapanan tek belge sınıfı tam da
    //    silinmiş dosyalardır ve daraltma kanıtın var olduğu tek popülasyonu
    //    eler; bağımsız denetim bunu mutasyonla göstermiştir (`belgeKapandi`
    //    tamamen boşaltıldığı hâlde bu iddia yeşil kalmıştır). Kapanış yolunun
    //    gerçekten çalıştığını üçüncü iddia kendi canlı adayıyla ölçer.
    //    Ölçüm şudur:
    //    panel turuna belge açtıran bir sonda koşturulduğunda, komşu süitin silmiş
    //    olduğu dört geçici dosyanın kaydı bellekte kalıyordu; sebep turun bu
    //    dosyaları yazması DEĞİL, kapanış olayı ile turun açık belge anlık
    //    görüntüsü arasındaki yarıştır (tur haritasını olaydan ÖNCE alır ve
    //    ayrıştırmayı SONRA yapar, dolayısıyla kapanmış bir belgeyi belleğe geri
    //    yazabilir). O kusurun adı ayrıdır ve bu Adımın ölçtüğü şey değildir;
    //    nöbete katılsaydı nöbet ölçmediği bir kusuru kendi adıyla raporlardı.
    //    Kusur devredilen risk olarak kayda geçirilmiştir.
    const yasayan = (anahtar: string): boolean => {
      try { return fs.existsSync(vscode.Uri.parse(anahtar).fsPath); } catch { return true; }
    };
    const sahipsiz = anahtarlar.filter((a) => !acikKume.has(a) && yasayan(a));
    assert.deepStrictEqual(sahipsiz, [],
      `paylaşılan bellekte açık olmayan ${sahipsiz.length} kayıt var; ` +
      "önbellek belge SÜRÜMÜNE anahtarlıdır ve sürümsüz bir kayıt sonsuza dek taze sayılır");

    // ② Turun DİSKTEN okuduğu dosyalar oraya hiç girmemiştir. Bu, ①'in tersinden
    //    ölçüsüdür ve asıl kusuru adlandırır: tur yüzlerce dosyayı ayrıştırır,
    //    hiçbirini paylaşılan belleğe yazmaz.
    const kapaliYollar = g!.programlar.filter((p) => !acikKume.has(vscode.Uri.file(p).toString()));
    assert.ok(kapaliYollar.length >= 5,
      `turda yalnız ${kapaliYollar.length} kapalı dosya var; nöbet anlamlı bir küme üstünde koşmuyor`);
    for (const yol of kapaliYollar) {
      assert.ok(!anahtarlar.includes(vscode.Uri.file(yol).toString()),
        `diskten okunan dosya paylaşılan belleğe yazılmış: ${yol}`);
    }

    // ③ KAPANIŞ YOLU BU NÖBETİN KAPSAMI DIŞINDADIR — gerekçesi ölçülmüştür.
    //
    //    Bağımsız denetim 2026-08-31 tarihinde ①'in boş küme üstünde koştuğunu
    //    mutasyonla göstermiştir: `belgeKapandi` işlevi tamamen boşaltıldığı
    //    hâlde bu nöbet yeşil kalmıştır. Sebep, ①'in diskte artık olmayan
    //    kayıtları elemesidir ve bu korpusta kapanan tek belge sınıfı tam da
    //    onlardır. Kapanış yolunu canlı bir adayla ölçmek üç kez denenmiş ve
    //    kurulamamıştır: nöbetin kendi açtığı belgenin sekmesi hedefli olarak
    //    kapatılmakta (kalan sekme sayısı sıfır ölçülmüştür), buna karşılık
    //    kabuk belgeyi `workspace.textDocuments` listesinden düşürmemektedir.
    //    Aynı ölçümde komşu süitin açık bıraktığı onlarca `_dolgu-*.sar`
    //    belgesi de listede durmaktadır; yani bu kabukta belge yaşam döngüsü
    //    nöbetin denetleyebileceği bir şey değildir.
    //
    //    Bunun sonucu dürüstçe yazılır: `belgeKapandi` yolu bugün HİÇBİR
    //    nöbetle korunmamaktadır ve bu, devredilen bir borçtur. Nöbetin adı bu
    //    yüzden fiilen ölçtüğü şeyi söyler; ölçmediği bir değişmezi kendi
    //    adıyla taşımaz.
  });

  // ── ⑥ EŞDEĞERLİK ──────────────────────────────────────────────────────────
  it("EŞDEĞERLİK: görüntüden kurulan panel ağacı eski taramayla AYNI kod kümesini verir", async () => {
    const y = await yuz();
    await durgunlas(y);

    // Kaydedilmemiş bir düzenleme panelin gördüğü metni diskten ayırır; referans
    // kol açık belgenin metnini okuduğu için ikisi yine aynı kaynağa bakar,
    // fakat kirli belge yine de beyan edilir (ölçümün kapsam dürüstlüğü).
    const kirli = vscode.workspace.textDocuments.filter((d) => d.isDirty && d.uri.fsPath.endsWith(".sar"));
    assert.deepStrictEqual(kirli.map((d) => d.uri.fsPath), [],
      "kaydedilmemiş .sar belgesi var; eşdeğerlik ölçümü iki farklı metin üstünde koşardı");

    const oncekiTarama = referansTarama(kok(), y.sonGoruntuOzeti()?.dilDışı ?? []);
    await turPenceresi(y, () => tamTurIste());
    const g = y.sonGoruntuOzeti();
    assert.ok(g, "turdan sonra ortada görüntü yok");
    const panel = new Set(y.yolHaritasiKodlari());
    const sonrakiTarama = referansTarama(kok(), g!.dilDışı);

    // Pencere boyunca disk değişmedi: iki bağımsız tarama aynı kümeyi verdi.
    assert.deepStrictEqual(sirali(sonrakiTarama), sirali(oncekiTarama),
      "ölçüm penceresinde çalışma alanı değişti; karşılaştırma iki farklı evren arasında yapılırdı");

    assert.ok(panel.size >= 20,
      `panel yalnız ${panel.size} kod gösteriyor; nöbet neredeyse boş bir ağaç üstünde koşuyor`);
    assert.ok(panel.has("TA04-A01"),
      "nöbetin kendi malzemesi panelde yok; ağaç bu turun görüntüsünden kurulmamış olabilir");

    const panelde = sirali(panel);
    const taramada = sirali(sonrakiTarama);
    assert.deepStrictEqual(panelde, taramada,
      "panelin gösterdiği kod kümesi bağımsız taramanınkinden ayrıştı; " +
      `panelde olup taramada olmayan: ${panelde.filter((k) => !sonrakiTarama.has(k)).join(", ") || "—"}; ` +
      `taramada olup panelde olmayan: ${taramada.filter((k) => !panel.has(k)).join(", ") || "—"}`);
  });
});

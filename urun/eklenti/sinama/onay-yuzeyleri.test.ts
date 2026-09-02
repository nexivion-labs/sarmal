// ═══════════════════════════════════════════════════════════════════════════
// onay-yuzeyleri.test.ts — 🧭 ÇİFT YÜZEY KUSURUNUN NÖBETİ (VIT-POSTA-A03)
//
//   Founder canlı görünümde iki paneli yan yana gördü ve şunu bildirdi:
//   Açıklamalar paneli ile Posta Kutusu AYNI on bir kapıyı gösteriyor. Bu nöbet
//   o kusurun kapandığını ve bir daha açılamayacağını ölçer.
//
//   ÖLÇÜM İKİ CİNSTENDİR VE İKİSİ DE AÇIKÇA SÖYLENİR.
//
//   Birincisi DAVRANIŞ ölçümüdür: tarama düzeni ve etkin karar defteri saf
//   çekirdekte yaşadığı için nöbet onları gerçekten koşturur. Sahte kabuk çağrı
//   sayar, dolayısıyla "ana görüntü verildiğinde sıfır dosya okundu" cümlesi bir
//   temenni değil, sayılmış bir olgudur.
//
//   İkincisi KAYNAK ölçümüdür: komut gövdesi, kod merceği ve panel satırı vscode
//   kabuğu ister ve birim süiti o kabuğu yükleyemez. Bu yüzden o kalemlerde
//   ölçülen şey kaynağın kendisidir — bir seçim listesinin ya da ikinci bir
//   karar arayüzünün VARLIĞI metinde görünür ve o yeter. Ölçülemeyen şeye
//   "ölçtüm" demek yasak olduğundan hangi sınamanın hangi cinsten olduğu
//   başlığında yazılıdır. Canlı sayıların gerçek editör kabuğundaki ölçümü ayrı
//   bir nöbettedir: sinama_vscode/suite/onay-yuzeyi.test.ts.
//
//   Koşum: cd eklenti && npm test
// ═══════════════════════════════════════════════════════════════════════════

// Yüzey dili kapısını bu dosya kendi kurar: `npm test` ön-yüklemesi olmadan tek
// başına koşturulduğunda sahte kırmızı vermesin (ön-yükleme ile aynı bağ, ESM
// önbelleği yüzünden iki kez koşmaz).
import "./dil-kur.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { belirtecle } from "../../cekirdek/src/belirtec.ts";
import { ayristir } from "../../cekirdek/src/ayristirici.ts";
import { degerBicimle } from "../../cekirdek/src/deger-yaz.ts";
import type { Dugum } from "../../cekirdek/src/sozdizim.ts";
import { bicimle } from "../../cekirdek/src/bicimle.ts";
import {
  onayKapilariTopla, kapilariTopla, EtkinKararDefteri,
  kapiCoz, kararIsle, UcusDefteri, BicimAskisi, adimOnayDegeri,
  onayKaydiMetni, onayEkiMetni, adimKodAdedi, eklemeNoktasiniDogrula,
  adimBeklerDegeri, beklerSilmeAraligi, BEKLER_ALANI,
  type OnayKapisi, type KapiKaydi, type TaramaKabugu, type ProgramGoruntusu,
  type YazimKabugu, type CatismaSecimi, type OnayKaniti, type BeklerKaydi,
  type BeklerSilmesi,
} from "../src/onay-cekirdek.ts";
import {
  GORUNUS_POSTA_KUTUSU, GORUNUS_HATIRLATICILAR, GORUNUS_BILDIRIMLER,
  DENETLEYICI_ONAY, KOMUT_POSTA_KUTUSU, sayaclariOlayaBagla,
} from "../src/yuzey-cekirdek.ts";
// Emoji nöbeti artık tek tek metin ÇAĞIRMAZ: erişimini kaynaktaki sınır
// işaretlerinden okur ve bölgenin tamamını süpürür, dolayısıyla elle içe
// aktarılmış bir metin listesi tutmaya gerek kalmadı.
import { etkinKararAdi, postaKutusunuAcBasligi } from "../src/yuzey-metinleri.ts";
import { sarKapsamDisi } from "../src/izleyici-cekirdek.ts";

const oku = (u: string): string => readFileSync(fileURLToPath(new URL(u, import.meta.url)), "utf8");
const yol = (u: string): string => fileURLToPath(new URL(u, import.meta.url));
const PAKET = JSON.parse(oku("../package.json")) as {
  contributes: {
    commands: Array<{ command: string; title: string }>;
    menus: Record<string, Array<{ command: string; when?: string }>>;
    views: Record<string, Array<{ id: string; name: string }>>;
  };
};
const PAKET_NLS_TR = JSON.parse(oku("../package.nls.tr.json")) as Record<string, string>;
const PAKET_NLS_EN = JSON.parse(oku("../package.nls.json")) as Record<string, string>;
const ETKIN_KARAR_ADI = etkinKararAdi();
const POSTA_KUTUSUNU_AC_BASLIGI = postaKutusunuAcBasligi();

/**
 * OZK-09 ile emekliye ayrılan üç karar komutu. Kimlikleri KORUNUR — kullanıcının
 * Açıklamalar menü koşulları onlara bağlıdır ve kimlik değişirse yerleşim
 * sıfırlanır — fakat artık hüküm yazmazlar.
 */
const EMEKLI_KARAR_KOMUTLARI = ["sarmal.onayVer", "sarmal.onaySerhle", "sarmal.onayReddet"] as const;

const ONAYLI_OLCUT = `"Tasarım Founder tarafından onaylanmıştır — onaysız uygulanmaz"`;

/** Tam-zincirli gerçek Sarmal kaynağı — Adım gövdeleri parametreyle beslenir. */
const zincir = (...adimlar: string[]): string =>
  `Faz( kod: F1, ad: "deneme dönemi" ) {\n` +
  `  Blok( kod: B1, ad: "deneme işi" ) {\n` +
  `    Katman( kod: KT1, ad: "deneme teknolojisi" ) {\n` +
  adimlar.map((a) => `      ${a}\n`).join("") +
  `    }\n` +
  `  }\n` +
  `}\n`;

const bildirimler = (kaynak: string): readonly Dugum[] => ayristir(belirtecle(kaynak)).bildirimler;
const kapilar = (kaynak: string): OnayKapisi[] => onayKapilariTopla(bildirimler(kaynak));

const IKI_KAPILI = zincir(
  `Adım( kod: A1, durum: beklemede, ne: "🧪 Birinci karar bekleyen iş", kabul: [ ${ONAYLI_OLCUT} ] )`,
  `Adım( kod: A2, durum: geliştirmede, ne: "🧪 İkinci karar bekleyen iş", kabul: [ ${ONAYLI_OLCUT} ] )`);
const TEK_KAPILI = zincir(
  `Adım( kod: B9, durum: beklemede, ne: "🧪 Başka dosyadaki iş", kabul: [ ${ONAYLI_OLCUT} ] )`);

/** Çağrı sayan sahte kabuk — "sıfır okuma" iddiasını olguya çeviren şey budur. */
function sayanKabuk(dosyalar: ReadonlyMap<string, string>, yollar?: readonly string[]): {
  kabuk: TaramaKabugu; sayac: { arama: number; okuma: number; cozme: number };
  okunanlar: string[];
} {
  const sayac = { arama: 0, okuma: 0, cozme: 0 };
  const okunanlar: string[] = [];
  const kabuk: TaramaKabugu = {
    async yollariBul() { sayac.arama += 1; return yollar ?? [...dosyalar.keys()]; },
    async metniOku(y) {
      sayac.okuma += 1; okunanlar.push(y);
      const metin = dosyalar.get(y);
      if (metin === undefined) throw new Error(`okunamaz: ${y}`);
      return metin;
    },
    bildirimleriCoz(metin) {
      sayac.cozme += 1;
      try { return bildirimler(metin); } catch { return undefined; }
    },
  };
  return { kabuk, sayac, okunanlar };
}

// ── ① KALEM 1 — TARAYICININ İKİ YOLU (davranış ölçümü) ──────────────────────

test("ana görüntü verildiğinde kabuğa HİÇ dokunulmaz: sıfır arama, sıfır okuma, sıfır ayrıştırma", async () => {
  const goruntu: ProgramGoruntusu = new Map([
    ["/depo/plan/goc_plani.sar", bildirimler(IKI_KAPILI)],
    ["/depo/plan/vitrin_ui.sar", bildirimler(TEK_KAPILI)],
  ]);
  const { kabuk, sayac } = sayanKabuk(new Map());

  const bulgular = await kapilariTopla(goruntu, kabuk);

  assert.equal(sayac.arama, 0, "ana görüntü varken yine de dosya araması yapıldı");
  assert.equal(sayac.okuma, 0, "ana görüntü varken yine de dosya okundu; ikinci tam tur yaşıyor");
  assert.equal(sayac.cozme, 0, "ana görüntü varken metin yeniden ayrıştırıldı");
  assert.deepEqual(bulgular.map((b) => b.kapi.kod), ["A1", "A2", "B9"],
    "ana görüntüden çıkan kapı listesi eksik ya da sırasız");
});

test("ana hat susunca YEDEK yol koşar ve her dosya EN ÇOK BİR KEZ okunur", async () => {
  const dosyalar = new Map([
    ["/depo/plan/goc_plani.sar", IKI_KAPILI],
    ["/depo/plan/vitrin_ui.sar", TEK_KAPILI],
  ]);
  // Aynı yol listede iki kez geçse bile ikinci okuma YAPILMAMALIDIR.
  const { kabuk, sayac, okunanlar } = sayanKabuk(
    dosyalar, ["/depo/plan/goc_plani.sar", "/depo/plan/vitrin_ui.sar", "/depo/plan/goc_plani.sar"]);

  const bulgular = await kapilariTopla(undefined, kabuk);

  assert.equal(sayac.arama, 1, "yedek tur birden fazla kez dosya aradı");
  assert.equal(sayac.okuma, 2, `dosya birden çok kez okundu: ${okunanlar.join(" · ")}`);
  assert.equal(new Set(okunanlar).size, okunanlar.length, "aynı dosya iki kez okunmuş");
  assert.deepEqual(bulgular.map((b) => b.kapi.kod), ["A1", "A2", "B9"]);
});

test("iki yol AYNI kapıları döndürür: görüntü yolu ile yedek yol ayrışamaz", async () => {
  const dosyalar = new Map([
    ["/depo/plan/goc_plani.sar", IKI_KAPILI],
    ["/depo/plan/vitrin_ui.sar", TEK_KAPILI],
  ]);
  const goruntu: ProgramGoruntusu = new Map(
    [...dosyalar].map(([y, metin]) => [y, bildirimler(metin)]));

  const { kabuk } = sayanKabuk(dosyalar);
  const yedekten = await kapilariTopla(undefined, kabuk);
  const goruntuden = await kapilariTopla(goruntu, sayanKabuk(new Map()).kabuk);

  const iz = (k: readonly KapiKaydi[]): string[] =>
    k.map((b) => `${b.dosya}:${b.kapi.satir}:${b.kapi.kod}:${b.kapi.olcut}`);
  // BKM-DNT-A10: derin eşitlik tek başına boş kümeyi de kabul eder; iki yol da boş
  // dizi döndürürse iddia geçer ve nöbet hiçbir şey ölçmemiş olur. Fikstür iki
  // dosyada üç kapı taşır; doluluk önce ölçülür, eşitlik sonra.
  assert.equal(iz(yedekten).length, 3,
    `yedek yol fikstürün üç kapısını bulmadı (${iz(yedekten).length}); boş küme üstünde eşitlik ölçüm değildir`);
  assert.deepEqual(iz(yedekten), iz(goruntuden),
    "iki yol farklı kapı üretti; kullanıcı ana hat açık ve kapalıyken iki gerçek görür");
});

test("yedek yol kırık ve okunamaz dosyada çökmez, öteki kapıları düşürmez", async () => {
  const dosyalar = new Map([
    ["/depo/plan/kirik.sar", "Bloo( kod: X"],          // sözdizimi kırık
    ["/depo/plan/goc_plani.sar", IKI_KAPILI],
  ]);
  const { kabuk } = sayanKabuk(
    dosyalar, ["/depo/plan/kirik.sar", "/depo/plan/yok.sar", "/depo/plan/goc_plani.sar"]);

  const bulgular = await kapilariTopla(undefined, kabuk);

  assert.deepEqual(bulgular.map((b) => b.kapi.kod), ["A1", "A2"],
    "kırık ya da okunamaz dosya turu düşürdü; sağlam dosyanın kapıları kayboldu");
});

test("GERÇEK depo üstünde iki yol birebir aynı kapı kümesini verir", async (t) => {
  // Fikstür değil, çalışma ağacının kendisi: `_Sarmal/plan/` altındaki gerçek
  // dosyalar. Sayı burada SABİTLENMEZ — Founder bir kapıyı onayladığında düşer ve
  // sabitlenmiş bir sayı o gün yanlış alarm verirdi.
  //
  // 🔻 BOŞ KÜME ARTIK ÇÖKERTMEZ, ÇÜNKÜ BOŞ KÜME MEŞRU BİR DEPO DURUMUDUR.
  // Bu nöbet eskiden kümenin boş olmamasını da şart koşuyordu ve gerekçesi
  // sağlamdı: boş küme üstünde koşan bir eşitlik ölçümü hiçbir şey kanıtlamaz,
  // yani sahte yeşildir. Fakat şart yanlış yere kondu. 2026-07-30'da Founder
  // bekleyen kapıların TAMAMINI onayladı; depoda sıfır kapı kalması bir gerileme
  // değil, sistemin amacına ulaşmasıdır. O gün bu nöbet kırmızıya döndü ve
  // kırmızılığın sebebi kodda bir kusur değildi.
  //
  // Ayrım şudur: "iki yol ayrışmaz" bir KOD ÖZELLİĞİDİR ve her zaman ölçülebilir;
  // "depoda kapı var" bir DEPO DURUMUDUR ve meşru olarak değişir. İkisini tek
  // assert'e bağlamak, durum değiştiğinde özelliği ölçen nöbeti öldürür. Bu yüzden
  // özellik boş kümeden bağımsız ölçülür, kümenin doluluğu ise TEŞHİS olarak
  // bildirilir — susturulmaz ama kapıyı da kilitlemez. Eşitliğin dolu küme
  // üstünde gerçekten koştuğunu bu dosyadaki fikstür nöbetleri kanıtlar
  // (IKI_KAPILI kümesi iki kapı üretir ve iki yolu da oradan geçirir).
  const planDizini = yol("../../../is/plan");
  const dosyalar = new Map<string, string>();
  for (const ad of readdirSync(planDizini)) {
    if (!ad.endsWith(".sar")) continue;
    if (sarKapsamDisi(`plan/${ad}`)) continue;
    dosyalar.set(join(planDizini, ad), readFileSync(join(planDizini, ad), "utf8"));
  }
  assert.ok(dosyalar.size >= 3, `plan dizininde ölçülecek dosya yok: ${dosyalar.size}`);

  const { kabuk } = sayanKabuk(dosyalar);
  const yedekten = await kapilariTopla(undefined, kabuk);
  const goruntu: ProgramGoruntusu = new Map(
    [...dosyalar].map(([y, metin]) => [y, bildirimler(metin)]));
  const goruntuden = await kapilariTopla(goruntu, sayanKabuk(new Map()).kabuk);

  assert.deepEqual(
    yedekten.map((b) => `${b.dosya}:${b.kapi.kod}`),
    goruntuden.map((b) => `${b.dosya}:${b.kapi.kod}`),
    "gerçek depoda iki yol ayrıştı");

  // Kaç kapı ölçüldüğü KAYDA GEÇER. Sıfır olması kusur değildir fakat gizlenmez:
  // okuyan kişi bu turda eşitliğin kaç kapı üstünde doğrulandığını bilmelidir,
  // yoksa yeşil ışık ölçülenden fazlasını ima eder.
  t.diagnostic(yedekten.length > 0
    ? `gerçek depoda ${yedekten.length} kapı üstünde eşitlik doğrulandı`
    : "gerçek depoda bekleyen kapı yok — eşitlik boş küme üstünde doğrulandı ve " +
      "özelliğin dolu küme kanıtı fikstür nöbetlerindedir");
});

// ── ② KALEM 4 — AYNI ANDA EN FAZLA BİR KARAR YÜZEYİ (davranış ölçümü) ───────

test("etkin karar defteri: ilk seçimde canlı sayı bir, ikinci seçimden sonra YİNE bir", () => {
  const defter = new EtkinKararDefteri();
  const kapatilanlar: string[] = [];
  assert.equal(defter.canliSayi, 0, "hiçbir kapı seçilmeden yüzey yaşıyor");

  defter.kur({ dosya: "/depo/a.sar", kod: "A1", satir: 3 }, () => kapatilanlar.push("A1"));
  assert.equal(defter.canliSayi, 1);
  // Boş dizi değişmezi TÜR OLARAK yazılır. Gerekçesi ince: `node:assert/strict`
  // içindeki `deepEqual` bir daraltma imzası taşır (`asserts actual is T`) ve
  // çıplak `[]` değişmezi `never[]` diye çıkarsanır. Tür yazılmazsa bu satır
  // `kapatilanlar` değişkenini `never[]`e daraltır ve İKİ SATIR SONRAKİ `push`
  // çağrısı derlenmez — hata "B9" satırında görünür, oysa kaynağı buradadır.
  assert.deepEqual(kapatilanlar, [] as string[], "ilk kurulumda bir şey kapatıldı");

  defter.kur({ dosya: "/depo/b.sar", kod: "B9", satir: 7 }, () => kapatilanlar.push("B9"));
  assert.equal(defter.canliSayi, 1, "ikinci kapı açılınca iki yüzey birden yaşıyor");
  assert.deepEqual(kapatilanlar, ["A1"],
    "eski nesne elden ÇIKARILMADI; ölü iş parçacığı Açıklamalar panelinde kalır");
  assert.equal(defter.acikKapi?.kod, "B9");
});

test("etkin karar defteri: kararı verilen kapının yüzeyi kendiliğinden kapanır", () => {
  const defter = new EtkinKararDefteri();
  let kapandi = 0;
  defter.kur({ dosya: "/depo/a.sar", kod: "A1", satir: 3 }, () => { kapandi += 1; });

  // Aynı dosya tazelendi ve kapı hâlâ açık: yüzey yaşamaya devam eder.
  assert.equal(defter.dosyaTazelendi("/depo/a.sar", ["A1", "A2"]), false);
  assert.equal(defter.canliSayi, 1);
  // Başka dosyanın tazelenmesi bu yüzeye dokunmaz.
  assert.equal(defter.dosyaTazelendi("/depo/b.sar", []), false);
  assert.equal(defter.canliSayi, 1);
  // Kapı kapandı (onay: yazıldı): yüzey düşer.
  assert.equal(defter.dosyaTazelendi("/depo/a.sar", ["A2"]), true);
  assert.equal(defter.canliSayi, 0);
  assert.equal(kapandi, 1, "kapatıcı çağrılmadı; iş parçacığı sızdı");
});

test("etkin karar defteri: silinen dosyanın yüzeyi düşer, başka dosyanınki durur", () => {
  const defter = new EtkinKararDefteri();
  let kapandi = 0;
  defter.kur({ dosya: "/depo/a.sar", kod: "A1", satir: 3 }, () => { kapandi += 1; });
  assert.equal(defter.dosyaSilindi("/depo/b.sar"), false);
  assert.equal(defter.canliSayi, 1);
  assert.equal(defter.dosyaSilindi("/depo/a.sar"), true);
  assert.equal(defter.canliSayi, 0);
  assert.equal(kapandi, 1);
});

// Kapının kimliği DOSYA + KOD çiftidir, tek başına kod değildir. Depoda yinelenen
// Adım kodları gerçekten vardır; yalnız koda bakan bir kimlik, iki ayrı dosyadaki
// aynı kodlu kapıyı tek kapı sanar ve kullanıcı yanlış kapıda karar verir.
// (Geçiş onayı 2026-07-28'de kaldırıldı — her geçişte çıkıyordu ve yanlış alarm
// oranı yüzde yüzdü. Kimlik ölçümü kalır, çünkü kapıyı kapatma kararı ona bağlıdır.)
test("etkin karar defteri: kapı kimliği DOSYA ve KOD çiftinden doğar", () => {
  const defter = new EtkinKararDefteri();
  defter.kur({ dosya: "/depo/a.sar", kod: "A1", satir: 3 }, () => { /* boş */ });
  assert.equal(defter.ayniKapiMi("/depo/a.sar", "A1"), true,
    "aynı dosyadaki aynı kapı farklı sanılıyor");
  assert.equal(defter.ayniKapiMi("/depo/a.sar", "A2"), false);
  assert.equal(defter.ayniKapiMi("/depo/b.sar", "A1"), false,
    "yinelenen Adım kodları farklı dosyalarda aynı kapı sanılıyor");
});

// ── ③ KALEM 3 ve 5 — AÇILIŞTA SIFIR, KOMUT YALNIZ KISAYOL (kaynak ölçümü) ───

test("açılışta hiçbir iş parçacığı yaratılmaz: modül sonunda koşulsuz tarama yoktur", () => {
  const kaynak = oku("../src/onay-kuyrugu.ts");
  assert.ok(!kaynak.includes("void tumunuTara().then(() => { susle(); degisti.fire(); });\n}"),
    "modül sonunda hâlâ koşulsuz bir açılış taraması var");
  assert.ok(kaynak.includes("anaGoruntuDegisti("),
    "kuyruk ana tanı hattının görüntüsünü beklemiyor; kendi turunu kurar");
  assert.ok(kaynak.includes("anaGoruntuHazirMi()"),
    "ana hattın görüntüsü gelmeden yedek tarama başlatılabiliyor; iki tur yarışır");
  // Üçüncü tur (denetçi bulgusu): hazırlık yüklemi TEK dışa açık ad taşır.
  assert.ok(!/anaHatKarariVerildiMi/.test(oku("../src/onay-tarayici.ts") + kaynak),
    "aynı yüklemin ikinci dışa açık adı geri geldi; iki ad bir gün ayrışır");
  assert.ok(!/\bkutuAc\b/.test(kaynak),
    "her bulgu için pencere açan eski işlev (kutuAc) hâlâ yaşıyor");
});

test("komut ikinci bir kuyruk YARATMAZ: yalnız Posta Kutusu görünüşüne odaklanır", () => {
  const kaynak = oku("../src/onay-kuyrugu.ts");
  assert.ok(!kaynak.includes("showQuickPick"),
    "onay yüzeyi hâlâ bir seçim listesi açıyor; ikinci bir karar arayüzü yaşıyor");
  // Ölçü ÇAĞRI ve TANIM biçimine bakar; tarihsel kaydın adı anmasına değil.
  assert.ok(!/\bkararSor\s*[(=]/.test(kaynak),
    "emekli edilen kararSor akışı hâlâ kaynakta; iki karar yolu vardır");
  assert.ok(kaynak.includes("`${GORUNUS_POSTA_KUTUSU}.focus`"),
    "komut Posta Kutusu görünüşüne odaklanmıyor");
  const basi = kaynak.indexOf("const postaKutusunaOdaklan");
  const sonu = kaynak.indexOf("// ⚡ ANLIK KUYRUK");
  assert.ok(basi > 0 && sonu > basi, "komut gövdesi kaynakta bulunamadı");
  const govde = kaynak.slice(basi, sonu);
  assert.ok(!/calismaAlaniniTara|kaydiIsle|showQuickPick/.test(govde),
    "komut hâlâ tam tarama yapıyor ya da doğrudan karar yazıyor");
});

// ⚠️ BU HÜKÜM 2026-07-29'DA YENİ MİMARİYE GEÇİRİLDİ.
//
//   Eski hâli şunu ölçüyordu: "kod merceği ve panel satırı AYNI etkin Comments
//   karar kapısına gider". O hüküm artık YANLIŞ ŞEYİ koruyordu. Gerçek editör
//   kabuğunda yapılan ölçüm (prob 5) şunu gösterdi: "Kapıya git" satırından hemen
//   sonra `canlı yüzey: 1` — yani çizilmediği bilinen Comments penceresi
//   gerçekten kuruluyor, kullanıcı dosyaya gidiyor ve orada boşluk buluyordu.
//   Nöbet o davranışı YEŞİL TUTUYORDU; kusuru koruyan bir nöbet, kusurun kendisi
//   kadar zararlıdır. Hüküm silinmedi, doğru şeyi ölçer hâle getirildi.
test("hiçbir giriş noktası Comments karar penceresi YARATMAZ; kimlik korunur", () => {
  const kaynak = oku("../src/onay-kuyrugu.ts");
  // ① Görünür Comments nesnesi üreten tek çağrı tümüyle kalkmıştır.
  assert.ok(!/createCommentThread\s*\(/.test(kaynak),
    "kaynak hâlâ Comments iş parçacığı yaratıyor; kullanıcı çizilmeyen bir yüzeye gönderilir");
  // Ölçü ÇAĞRI ve TANIM biçimine bakar; tarihsel kaydın adı anmasına değil.
  assert.ok(!/\betkinKarariAc\s*[(=]/.test(kaynak),
    "çizilmeyen karar penceresini kuran işlev hâlâ yaşıyor");
  // ② DENETLEYİCİ KİMLİĞİ KORUNUR: kullanıcının menü koşulları ona bağlıdır.
  assert.ok(kaynak.includes("createCommentController(DENETLEYICI_ONAY, etkinKararAdi())"),
    "denetleyici kimliği kaldırılmış; kullanıcının Açıklamalar menü koşulları kırılır");
  // ③ Kod merceği artık Posta Kutusunu açar ve doğru kapıyı gösterir.
  const b = kaynak.indexOf("const onayKarar = async");
  const s = kaynak.indexOf("* 📬 PANEL İÇİ KARAR");
  assert.ok(b > 0 && s > b, "onayKarar gövdesi kaynakta bulunamadı");
  const mercek = kaynak.slice(b, s);
  assert.ok(mercek.includes("postaKutusunaOdaklan()") && mercek.includes("gosterVeAc("),
    "kod merceği Posta Kutusunda doğru kapıyı göstermiyor");
  assert.ok(!/showQuickPick|kaydiIsle\(/.test(mercek),
    "kod merceği kendi karar arayüzünü açıyor ya da doğrudan yazıyor");
  // ④ "Kapıya git" YALNIZ kaynağı açar.
  const kb = kaynak.indexOf("const postaKapisiAc = async");
  const ks = kaynak.indexOf("baglam.subscriptions.push(");
  assert.ok(kb > 0 && ks > kb, "postaKapisiAc gövdesi kaynakta bulunamadı");
  const git = kaynak.slice(kb, ks);
  assert.ok(git.includes("kapiyaGit("), "kapıya git satırı kaynağı açmıyor");
  assert.ok(!/showQuickPick|kaydiIsle\(/.test(git),
    "kapıya git satırı karar arayüzü açıyor ya da doğrudan yazıyor");
  // ⑤ Panel yine AYNI İKİ KOMUTA bağlıdır ve kendi karar arayüzünü kurmaz.
  //    Yüzey ağaçtan panel içi karar yüzeyine geçti, fakat hüküm yazan el
  //    değişmedi: panel yalnız komutu çağırır, hükmü `kararIsle` yazar.
  const panel = oku("../src/posta-kutusu.ts");
  assert.ok(panel.includes('"sarmal.postaKapisiAc"'),
    "panel kapı satırını Adıma götüren komuta bağlı değil");
  assert.ok(panel.includes('"sarmal.postaKararVer"'),
    "panel kararı tek yazıcı komutuna indirmiyor");
  assert.ok(!panel.includes("showQuickPick") && !panel.includes("kaydiIsle("),
    "panel kendi karar arayüzünü açıyor ya da doğrudan yazıyor");
  assert.ok(!panel.includes("applyEdit") && !panel.includes("WorkspaceEdit"),
    "panel diske kendisi yazıyor; karar yazan tek el kalmamış");
});

// ── ④ KALEM 1 ve 2 — AÇILIŞ MALİYETİ (kaynak ölçümü) ────────────────────────

test("onay yüzeyi açılışta belge AÇMAZ: openTextDocument yalnız kullanıcı eyleminde", () => {
  const tarayici = oku("../src/onay-tarayici.ts");
  // Ölçü ÇAĞRIYA bakar; tarihsel kaydın eski davranışı anmasına değil.
  const acmaSayisi = (tarayici.match(/openTextDocument\s*\(/g) ?? []).length;
  assert.equal(acmaSayisi, 0,
    "tarayıcı hâlâ belge açıyor; açılışta kapsam içi her .sar VS Code belge yaşam döngüsüne girer");
  assert.ok(tarayici.includes("workspace.fs.readFile"),
    "yedek yol ham okuma yapmıyor");
  // Yedek yolun gövdesi paylaşımlı belge önbelleğine (programAl) DOKUNMAZ:
  // dosya ham okunur, saf ayrıştırıcıdan geçer ve ağaç atılır.
  const yedekGovde = tarayici.slice(tarayici.indexOf("export function vscodeKabugu"));
  assert.ok(yedekGovde.length > 100, "yedek kabuk gövdesi kaynakta bulunamadı");
  assert.ok(!yedekGovde.includes("programAl"),
    "tam tarama paylaşımlı AST önbelleğini besliyor");
  assert.ok(tarayici.includes("export function belgeKapilari"),
    "açık belgeye özgü yol kaldırılmış; kaydedilmemiş metin panelden düşer");
});

test("ana tanı hattı kapı TANIMAZ: yalnız ortak ağacı taşır", () => {
  // 🗺️ PRF-TA-A02: aktarım yolu değişti, hüküm değişmedi. Ana hat ürettiği ağacı
  // artık tarayıcıya doğrudan çağrıyla değil, turun TEK yayınıyla iletir; tarayıcı
  // o yayının abonesidir. Ölçü bu yüzden iki yüzden bakar: kabuk yayınlıyor mu ve
  // tarayıcı kendini yayından mı besliyor.
  const eklenti = oku("../src/eklenti.ts");
  const tarayici = oku("../src/onay-tarayici.ts");
  assert.ok(eklenti.includes("turGoruntusunuYayinla({ programlar,"),
    "tam tanı turu ürettiği görüntüyü yayınlamıyor; onay yüzeyi turun ağacını göremez");
  assert.ok(tarayici.includes("turGoruntusunuDinle("),
    "tarayıcı ana görüntüsünü turun yayınından almıyor; besleme yolu koptu");
  assert.equal((eklenti.match(/anaGoruntuyuBildir\s*\(/g) ?? []).length, 0,
    "kabuk tarayıcıyı doğrudan besliyor; turun tek yayınının yanında ikinci bir bildirim yolu var");
  // PRF-TA-A03 ikinci tur (denetçi bulgusu): denetim kapalıyken hat SUSMAZ; tur
  // yine koşar ve görüntüsünü yayınlar, yalnız tanı üretmez. Kapalı dal erken
  // dönmez ve susuş bildirimi çağrılmaz; yoksa Yol Haritası ile Onaylar boş kalır.
  const kapaliBasi = eklenti.indexOf("const taniKapali = !denetimAcik();");
  const kapaliSonu = eklenti.indexOf("const turBasi = Date.now();", kapaliBasi);
  assert.ok(kapaliBasi >= 0 && kapaliSonu > kapaliBasi, "denetim kapalı dalı bulunamadı");
  assert.ok(!eklenti.slice(kapaliBasi, kapaliSonu).includes("return;"),
    "denetim kapalıyken tur erken dönüyor; görüntü yayınlanmaz ve okuma yüzeyleri boş kalır");
  assert.equal((eklenti.match(/anaHattiSustur\s*\(/g) ?? []).length, 0,
    "kabuk hâlâ hat susuşu bildiriyor; kapalı denetimde görüntü yayınlanmalı, hat susmamalı");
  // Üçüncü tur (denetçi bulgusu): susuş kapısı tarayıcıda dışa açık ÖLÜ API olarak da
  // yaşayamaz; dışa açık kalsaydı bir gün çağrılır ve görüntüsüz ikinci yol geri dönerdi.
  const tarayiciKaynagi = oku("../src/onay-tarayici.ts");
  assert.ok(!/anaHattiSustur|anaHatSustu/.test(tarayiciKaynagi),
    "tarayıcıda hat susuşu API'si ya da bayrağı hâlâ yaşıyor; ölü kapı ikinci yol olarak geri dönebilir");
  assert.ok(/if \(!taniKapali\) \{/.test(eklenti), "tanı üretimi denetim ayarına bağlanmamış");
  assert.ok(!/onayKapilariTopla|OnayKapisi/.test(eklenti),
    "eklenti.ts kapı tanımaya başlamış; kapı kuralı iki yerde yaşıyor");
});

// ── ⑤ KALEM 7 — KİMLİKLER DEĞİŞMEZ, YALNIZ ADLAR ROLÜ ANLATIR ───────────────

test("kimlikler sabittir: görünüş, komut ve denetleyici kimliği birebir korunur", () => {
  assert.equal(GORUNUS_POSTA_KUTUSU, "sarmalPostaKutusu",
    "görünüş kimliği değişti; kullanıcının panel yerleşimi sıfırlanır");
  assert.equal(KOMUT_POSTA_KUTUSU, "sarmal.onayKuyrugu",
    "komut kimliği değişti; kullanıcının kısayolu kopar");
  assert.equal(DENETLEYICI_ONAY, "sarmal-onay",
    "denetleyici kimliği değişti; Açıklamalar menü koşulları düğmeleri bulamaz");

  const gorunusler = PAKET.contributes.views["sarmal-yol"].map((g) => g.id);
  assert.ok(gorunusler.includes(GORUNUS_POSTA_KUTUSU),
    "paket bildirimindeki görünüş kimliği sabitten ayrıştı");
  const komut = PAKET.contributes.commands.find((k) => k.command === KOMUT_POSTA_KUTUSU);
  assert.ok(komut, "paket bildiriminde komut kimliği yok");

  const menuler = PAKET.contributes.menus["comments/commentThread/context"]
    .filter((m) => m.when === `commentController == ${DENETLEYICI_ONAY}`);
  assert.equal(menuler.length, 3,
    "üç karar düğmesinin menü koşulu denetleyici kimliğine bakmıyor");
  assert.deepEqual(menuler.map((m) => m.command).sort(),
    ["sarmal.onayReddet", "sarmal.onaySerhle", "sarmal.onayVer"],
    "karar düğmeleri değişmiş; üç hüküm yüzeyi eksik");
});

test("kullanıcıya görünen adlar rolü anlatır: hiçbiri ikinci bir KUYRUK adı taşımaz", () => {
  const komut = PAKET.contributes.commands.find((k) => k.command === KOMUT_POSTA_KUTUSU)!;
  const komutAnahtari = /^%([^%]+)%$/.exec(komut.title)?.[1];
  assert.equal(komutAnahtari ? PAKET_NLS_TR[komutAnahtari] : komut.title, POSTA_KUTUSUNU_AC_BASLIGI,
    "komutun görünen adı katalogdan gelmiyor");
  assert.ok(!/kuyru/i.test(komut.title),
    `komut hâlâ kendini bir kuyruk gibi adlandırıyor: ${komut.title}`);
  assert.ok(!/[Kk]uyru/.test(ETKIN_KARAR_ADI),
    `Comments denetleyicisi hâlâ kuyruk adı taşıyor: ${ETKIN_KARAR_ADI}`);
  const kaynak = oku("../src/onay-kuyrugu.ts");
  assert.ok(kaynak.includes("createCommentController(DENETLEYICI_ONAY, etkinKararAdi())"),
    "denetleyici kimliği ve adı tek kaynaktan okunmuyor");
});

/**
 * Emekli üç karar komutunun görünen adı, artık YAPMADIĞI işi vaat edemez.
 *
 * Ölçülen kusur şuydu: komutların katalog adları "✅ Onayla", "📝 Şerhle onayla"
 * ve "⛔ Reddet" biçimindeydi. OZK-09 hükmünden sonra bu komutlar hiçbir karar
 * yazmaz; yalnız bir bilgilendirme basıp Onaylar paneline odaklanırlar. Vaadi
 * tutulmayan bir ad, doğru çalışan bir arayüzü bile "bozuk" hükmüne uğratır ve
 * çift yüzey kusurunu adında yaşatır.
 */
test("emekli karar komutları KARAR VAAT ETMEZ: adları hükmün nerede verildiğini söyler", () => {
  const cozumle = (komutKimligi: string, katalog: Record<string, string>): string => {
    const komut = PAKET.contributes.commands.find((k) => k.command === komutKimligi);
    assert.ok(komut, `paket bildiriminde ${komutKimligi} komutu yok`);
    const anahtar = /^%([^%]+)%$/.exec(komut!.title)?.[1];
    assert.ok(anahtar, `${komutKimligi} adı yerelleştirme kataloğundan gelmiyor: ${komut!.title}`);
    const metin = katalog[anahtar!];
    assert.ok(metin, `${anahtar} anahtarı katalogda yok`);
    return metin;
  };
  for (const kimlik of EMEKLI_KARAR_KOMUTLARI) {
    const tr = cozumle(kimlik, PAKET_NLS_TR);
    assert.match(tr, /Onaylar panelinde verilir/,
      `${kimlik} adı kararın nerede verildiğini söylemiyor: ${tr}`);
    const en = cozumle(kimlik, PAKET_NLS_EN);
    assert.match(en, /Approvals panel/,
      `${kimlik} İngilizce adı kararın nerede verildiğini söylemiyor: ${en}`);
  }
});

/**
 * Komut paleti, karar yazmayan bir "Onayla" girdisi sunamaz.
 *
 * Görev hükmü şudur: dört giriş noktası KISAYOLA döner ve hiçbiri ikinci bir
 * karar arayüzü açmaz. Emekli üç komut, Açıklamalar iş parçacığındaki menü
 * koşulları için KİMLİĞİYLE yaşamaya devam eder; buna karşılık palette ayrı bir
 * karar girişi gibi listelenemez, çünkü orada tıklanınca hiçbir hüküm yazılmaz.
 */
test("emekli karar komutları KOMUT PALETİNDE görünmez: ikinci bir karar girişi kalmadı", () => {
  const palet = PAKET.contributes.menus.commandPalette ?? [];
  for (const kimlik of EMEKLI_KARAR_KOMUTLARI) {
    const girdi = palet.find((m) => m.command === kimlik);
    assert.ok(girdi, `${kimlik} komut paletinde hâlâ karar vaat eden bir girdi olarak duruyor`);
    assert.equal(girdi!.when, "false",
      `${kimlik} paletten gizlenmemiş; koşulu: ${girdi!.when}`);
  }
  const kuyrukGirdisi = palet.find((m) => m.command === KOMUT_POSTA_KUTUSU);
  assert.equal(kuyrukGirdisi, undefined,
    "Onaylar panelini açan komut da paletten gizlenmiş; kullanıcının TEK kısayolu kayboldu");
  const menuler = PAKET.contributes.menus["comments/commentThread/context"]
    .filter((m) => m.when === `commentController == ${DENETLEYICI_ONAY}`);
  assert.equal(menuler.length, 3,
    "paletten gizleme, satır içi denetleyici menüsünü de söküp atmış; Founder'ın beğendiği satır içi yol yok edilemez");
});

const EMOJI = /\p{Extended_Pictographic}/u;

/**
 * Onay yüzeyinin metin kataloğundaki HER kod satırı, sahibiyle birlikte.
 *
 * Erişim elle sayılmaz; kaynaktaki iki sınır işaretinden okunur. Nöbetin ADI
 * yüzeyin tamamını iddia ediyorsa ERİŞİMİ de tamamı olmalıdır — elle seçilmiş
 * bir liste, ertesi gün eklenen metni yeşilden geçirir ve iddiayı yalanlar.
 * Yorumlar düşürülür, çünkü ölçülen şey KULLANICIYA BASILAN metindir; kalan
 * kod satırının tamamı taranır, dolayısıyla hiçbir dizgi biçimi ağdan kaçamaz.
 */
function onayMetinSatirlari(): { sahip: string; satir: number; kod: string }[] {
  const ham = oku("../src/yuzey-metinleri.ts").split("\n");
  const bas = ham.findIndex((l) => l.includes("NÖBET-SINIRI: ONAY-YÜZEYİ-METİNLERİ BAŞLANGIÇ"));
  const son = ham.findIndex((l) => l.includes("NÖBET-SINIRI: ONAY-YÜZEYİ-METİNLERİ BİTİŞ"));
  assert.ok(bas >= 0 && son > bas,
    "onay metin bölgesinin sınır işaretleri kaynaktan silinmiş; nöbetin erişimi çöktü");
  const cikti: { sahip: string; satir: number; kod: string }[] = [];
  let blokYorum = false;
  let sahip = "(bölge başı)";
  for (let i = bas + 1; i < son; i++) {
    const satir = ham[i];
    const kirp = satir.trim();
    if (blokYorum) { if (kirp.includes("*/")) blokYorum = false; continue; }
    if (kirp.startsWith("/*")) { if (!kirp.includes("*/")) blokYorum = true; continue; }
    if (kirp.startsWith("//") || kirp.startsWith("*")) continue;
    const ad = /export (?:function|const) (\w+)/.exec(satir)?.[1]
      ?? /^\s*get (\w+)\s*\(/.exec(satir)?.[1]
      ?? /^\s*(\w+):\s*\(/.exec(satir)?.[1];
    if (ad) sahip = ad;
    const kod = satir.split("//")[0];
    if (kod.trim()) cikti.push({ sahip, satir: i + 1, kod });
  }
  assert.ok(cikti.length > 100,
    `onay metin bölgesi beklenmedik biçimde küçük (${cikti.length} satır); sınır işaretleri kaymış olabilir`);
  return cikti;
}

/**
 * TEK MUAF: satır sonundaki yanıp sönen onay süsü. Muafiyet adıyla yazılıdır ve
 * gerekçesi şudur — o süs, geribildirim yüzeyindeki ikiziyle (`takdir.ts`) aynı
 * desenin iki yarısıdır ve `takdir.ts` bu Adımın şeridi dışındadır; yalnız birini
 * değiştirmek iki yüzeyi ayrıştırırdı ve ikiz ayrışması bu deponun RED-2 dersidir.
 */
const EMOJI_MUAFLARI = new Set(["bekliyorSus"]);

/**
 * Arayüz işaretleri vektörel aileden gelir (Founder hükmü 2026-08-05).
 *
 * İki cins kusuru birlikte kapatır. Birincisi hükmün kendisidir: emoji
 * yürütücüden yürütücüye farklı çizilir ve yüz tutarsız görünür. İkincisi bir
 * DOĞRULUK kusurudur — metinler kullanıcıya karar satırlarını emojileriyle tarif
 * ediyordu, oysa panelin karar satırları 0.9.138 sürümünde vektörel simge
 * ailesine geçmişti; yani yardım metni artık var olmayan bir arayüzü anlatıyordu.
 */
test("onay yüzeyinin metin kataloğunda HİÇBİR metin emoji taşımaz — erişim bölgenin TAMAMI", () => {
  const suclular = onayMetinSatirlari()
    .filter((s) => EMOJI.test(s.kod) && !EMOJI_MUAFLARI.has(s.sahip));
  assert.deepEqual(suclular.map((s) => `${s.sahip} (satır ${s.satir})`), [],
    "onay metin bölgesinde emoji taşıyan metin var; arayüz işaretleri yalnız vektörel aileden gelir");
});

/**
 * MUAFİYET ÖLÜ KALAMAZ. Bir muafiyet, koruduğu şey ortadan kalktıktan sonra
 * kaynakta durmaya devam ederse sessiz bir delik olur: adı bir şeyi koruduğunu
 * söyler, oysa yalnız gelecekteki bir ihlale kapı açar. Bu nöbet muafiyetin hem
 * TEK olduğunu hem de hâlâ CANLI olduğunu ölçer; süs emojiden arındığı gün bu
 * nöbet kırmızıya döner ve muafiyeti silmeye zorlar.
 */
test("emoji muafiyeti TEKTİR ve CANLIDIR: ölü muafiyet kaynakta duramaz", () => {
  assert.deepEqual([...EMOJI_MUAFLARI], ["bekliyorSus"],
    "emoji muafiyet listesi büyümüş; her yeni muafiyet hükmü biraz daha aşındırır");
  const muaf = onayMetinSatirlari().filter((s) => EMOJI_MUAFLARI.has(s.sahip));
  assert.ok(muaf.length > 0, "muaf sahip bölgede bulunamadı; muafiyet adı bayatlamış");
  assert.ok(muaf.some((s) => EMOJI.test(s.kod)),
    "muafiyet ÖLÜ: 'bekliyorSus' artık emoji taşımıyor, dolayısıyla muafiyet kaynaktan silinmelidir");
});

/**
 * Kullanıcı metni katalogda yaşar; onay modüllerine gömülen bir dizge ikinci bir
 * metin evreni açar ve katalog süpürgesinin erişiminden kaçar. Bu nöbet o kaçış
 * yolunu kapatır: beş onay modülünde kalan TEK emoji dizgesi, yukarıda adıyla
 * muaf tutulan nabız süsünün sönük yarısıdır.
 */
test("onay modüllerine gömülü emoji yoktur: tek istisna nabız süsünün sönük yarısıdır", () => {
  const modul = [
    "onay-kuyrugu.ts", "onay-cekirdek.ts", "onay-tarayici.ts",
    "posta-govde.ts", "posta-kutusu.ts",
  ];
  const bulunan: string[] = [];
  for (const ad of modul) {
    let blokYorum = false;
    oku(`../src/${ad}`).split("\n").forEach((satir, i) => {
      const kirp = satir.trim();
      if (blokYorum) { if (kirp.includes("*/")) blokYorum = false; return; }
      if (kirp.startsWith("/*")) { if (!kirp.includes("*/")) blokYorum = true; return; }
      if (kirp.startsWith("//") || kirp.startsWith("*")) return;
      const kod = satir.split("//")[0];
      if (EMOJI.test(kod)) bulunan.push(`${ad}:${i + 1} → ${kod.trim()}`);
    });
  }
  assert.equal(bulunan.length, 1,
    `onay modüllerinde beklenmedik emoji dizgesi var:\n${bulunan.join("\n")}`);
  assert.match(bulunan[0], /onay-kuyrugu\.ts.*davetBos|onay-kuyrugu\.ts.*contentText/,
    `kalan tek emoji nabız süsünün sönük yarısı DEĞİL: ${bulunan[0]}`);
});

/** Emekli üç komutun katalog adı da aynı hükme tabidir — iki dilde birden. */
test("emekli karar komutlarının katalog adları iki dilde de emoji taşımaz", () => {
  for (const kimlik of EMEKLI_KARAR_KOMUTLARI) {
    const komut = PAKET.contributes.commands.find((k) => k.command === kimlik)!;
    const anahtar = /^%([^%]+)%$/.exec(komut.title)![1];
    for (const [dil, katalog] of [["tr", PAKET_NLS_TR], ["en", PAKET_NLS_EN]] as const) {
      assert.equal(EMOJI.exec(katalog[anahtar]), null,
        `[${dil}] ${kimlik} komutunun adı emoji taşıyor: ${katalog[anahtar]}`);
    }
  }
});

// ── ⑥ KALEM 8 — KARAR MANTIĞI VE onay: KAYIT BİÇİMİ DEĞİŞMEZ ───────────────

test("kapı tanıma üç koşulu korur: açık durum + onay imzalı ölçüt + onay yazılmamış", () => {
  assert.equal(kapilar(zincir(
    `Adım( kod: A1, durum: beklemede, ne: "iş", kabul: [ ${ONAYLI_OLCUT} ] )`)).length, 1,
    "beklemede + onay ölçütü kapı üretmedi");
  assert.equal(kapilar(zincir(
    `Adım( kod: A1, durum: bitti, ne: "iş", kabul: [ ${ONAYLI_OLCUT} ] )`)).length, 0,
    "kapanmış durum kapı üretti");
  assert.equal(kapilar(zincir(
    `Adım( kod: A1, durum: beklemede, ne: "iş", kabul: [ "Sıradan bir ölçüt" ] )`)).length, 0,
    "onay imzası taşımayan ölçüt kapı üretti");
  assert.equal(kapilar(zincir(
    `Adım( kod: A1, durum: beklemede, onay: "onaylandı — 2026-07-17", ne: "iş", kabul: [ ${ONAYLI_OLCUT} ] )`)).length, 0,
    "kararı verilmiş kapı yeniden açıldı; DİSKTE YAZILI ESKİ KAYIT okunmuyor");
});

test("gidiş-dönüş: kaydiIsle'nin yazdığı onay: kaydı kapıyı KAPATIR ve biçimi aynıdır", () => {
  const kaynak = zincir(
    `Adım( kod: A1, durum: beklemede, ne: "🧪 karar bekleyen iş", kabul: [ ${ONAYLI_OLCUT} ] )`);
  const [kapi] = kapilar(kaynak);
  assert.ok(kapi, "fikstür kapı üretmedi; nöbet boş küme üstünde koşuyor");

  // Üretimdeki yazıcının BİREBİR aynı hesabı: damga — tarih · not, değer
  // biçimlendirmesi motorun degerBicimle işleviyle, ekleme noktası durum
  // değerinin sonunda (0-tabanlı satır/sütun editör düzenindedir).
  for (const { damga, not } of [
    { damga: "onaylandı", not: "" },
    { damga: "şerhle onaylandı", not: "kapsam daraltıldı" },
    { damga: "reddedildi", not: "gerekçe: ölçüm eksik" },
  ]) {
    const gun = "2026-07-28";
    const kayit = `${damga} — ${gun}${not ? ` · ${not}` : ""}`;
    const satirlar = kaynak.split("\n");
    const hedef = satirlar[kapi.durumSatir];
    satirlar[kapi.durumSatir] =
      hedef.slice(0, kapi.durumSutun) + `, onay: ${degerBicimle(kayit)}` + hedef.slice(kapi.durumSutun);
    const yazilmis = satirlar.join("\n");

    assert.ok(yazilmis.includes(`, onay: ${degerBicimle(kayit)}`),
      "kayıt beklenen biçimde yazılmadı");
    assert.equal(kapilar(yazilmis).length, 0,
      `"${kayit}" yazıldıktan sonra kapı hâlâ açık görünüyor`);
    // Kaydın kendisi geri okunabilir olmalı: değer Adım'ın altında yaşar (STR-4).
    const adim = bildirimler(yazilmis)[0].cocuklar[0].cocuklar[0].cocuklar[0];
    const onay = adim.parametreler.find((p) => p.ad === "onay")
      ?? adim.ozellikler.find((p) => p.ad === "onay");
    assert.ok(onay, "yazılan onay: kaydı ayrıştırılamıyor");
    assert.equal(onay!.deger.metin, kayit, "kaydın metni gidiş-dönüşte değişti");
  }
});

// ⚠️ BU HÜKÜM DE YENİ MİMARİYE GEÇİRİLDİ. Eski hâli `applyEdit` çağrılarını
//   SAYIYORDU ve sayı ikiye sabitlenmişti; yazım hattı saf çekirdeğe indiğinde
//   ve kaydetme başarısızlığında güvenli geri alma eklendiğinde o sayı doğal
//   olarak değişir. Korunması gereken şey çağrı sayısı değil, SÖZLEŞMEDİR:
//   `onay:` metnini üreten tek yer ve karar hattını koşturan tek çağrı.
test("tek yazıcı korunur: onay: metnini üreten tek yer çekirdektir", () => {
  const kaynak = oku("../src/onay-kuyrugu.ts");
  // ① Kayıt metni artık yalnız çekirdekte üretilir; kabuk onu kopyalayamaz.
  assert.ok(!/onay: \$\{degerBicimle/.test(kaynak),
    "kabuk `onay:` metnini kendisi kuruyor; kayıt biçimi iki yerde yaşar");
  assert.equal((kaynak.match(/kararIsle\(/g) ?? []).length, 1,
    "karar hattını koşturan ikinci bir çağrı doğmuş; tek yazıcı ilkesi kırıldı");
  // ② Kabuğun `ekle` işlevi ekten BAŞKA bir şey yazamaz: metin dışarıdan gelir.
  const basi = kaynak.indexOf("async ekle(kapi: OnayKapisi");
  const sonu = kaynak.indexOf("async kaydet()");
  assert.ok(basi > 0 && sonu > basi, "kabuğun ekleme gövdesi kaynakta bulunamadı");
  const govde = kaynak.slice(basi, sonu);
  assert.ok(govde.includes("duzenleme.insert(") && govde.includes("applyEdit("),
    "yazma işi kabuğun ekleme sınırının dışına çıkmış");
  assert.ok(!/onay|damga/.test(govde),
    "kabuk ekleme gövdesinde karar metnini biliyor; metin tek kaynakta kalmalı");
});

// ── ⑦ KALEM 11 — KOMŞU İKİ PANELE DOKUNULMADI ──────────────────────────────
//   "Değişmedi" cümlesi ancak ölçülürse doğrudur. Üç ölçü kullanılır: iki dosya
//   onay yüzeyinden hiçbir şey içeri almaz, kimlikleri sabittir ve yinelenen
//   çizimi önleyen parmak izi güvencesi yerindedir. Dördüncü ölçü BAYT
//   ÖZETİDİR: bu tur o iki dosyaya dokunmadığını sayıyla söyler. Özet, komşu
//   panellerde meşru bir iş yapıldığında BİLEREK güncellenir; kazayla değişmeyi
//   yakalamak tam olarak onun görevidir.

test("komşu paneller onay yüzeyinden hiçbir şey içeri almaz", () => {
  for (const dosya of ["../src/hatirlaticilar.ts", "../src/bildirimler.ts"]) {
    const kaynak = oku(dosya);
    for (const yasak of ["onay-cekirdek", "onay-tarayici", "onay-kuyrugu", "posta-kutusu",
      "createCommentController", "CommentThread"]) {
      assert.ok(!kaynak.includes(yasak),
        `${dosya} onay yüzeyine bağlanmış: ${yasak}`);
    }
    assert.ok(kaynak.includes("parmakIzi("),
      `${dosya} yinelenen çizimi önleyen parmak izi güvencesini kaybetmiş`);
    for (const ritim of ["setInterval", "setTimeout", "createFileSystemWatcher"]) {
      assert.ok(!kaynak.includes(ritim),
        `${dosya} ikinci bir tazeleme ritmi kurmuş: ${ritim}`);
    }
  }
  assert.ok(oku("../src/hatirlaticilar.ts").includes(`GORUNUS_HATIRLATICILAR`));
  assert.ok(oku("../src/bildirimler.ts").includes(`GORUNUS_BILDIRIMLER`));
  const gorunusler = PAKET.contributes.views["sarmal-yol"].map((g) => g.id);
  for (const kimlik of [GORUNUS_HATIRLATICILAR, GORUNUS_BILDIRIMLER]) {
    assert.ok(gorunusler.includes(kimlik),
      `komşu panelin görünüş kimliği paket bildiriminden düşmüş: ${kimlik}`);
  }
});

test("komşu iki panelin BAYTI bu turda değişmedi", async () => {
  const { createHash } = await import("node:crypto");
  const ozet = (dosya: string): string =>
    createHash("sha256").update(oku(dosya), "utf8").digest("hex").slice(0, 16);
  // ÖZETLER BİLEREK GÜNCELLENDİ — VIT-GRAF-A13 (2026-07-29).
  //
  // Bu nöbet VIT-POSTA-A03 turunda "komşu panellere dokunulmadı" sözleşmesini
  // korumak için kuruldu ve İŞİNİ YAPTI: bir sonraki tur iki panele de dokununca
  // anında kırmızıya döndü. Değişiklik meşrudur ve kapsamı bellidir — her iki
  // panele yalnız `kayitSayisi` okuyucusu eklendi, çünkü durum çubuğu sayıları
  // panellerin KENDİ kümelerinden türetir ve ikinci bir sayaç tutmaz.
  //
  // Özet güncellemek nöbeti zayıflatmaz, çünkü güncelleme SESSİZ OLAMAZ: sayı
  // değişince süit kırmızıya döner ve değiştiren kişi buraya gelip neyi neden
  // değiştirdiğini yazmak zorunda kalır. Nöbetin değeri sayının kendisinde değil,
  // bu zorunlulukta yaşar.
  // ÖZET İKİNCİ KEZ BİLEREK GÜNCELLENDİ — kanon göçü (2026-07-29 akşamı).
  //
  // Nöbet aynı gün İKİNCİ KEZ işini yaptı ve yine haklıydı. Bu kez değişen şey
  // davranış değil ATIF: `bildirimler.ts` yorumunda eski renk kararının defter kodu
  // yazılıydı ve halefi `YUZ-4` ile değiştirildi. Founder kusuru IDE'de gözüyle buldu, çünkü
  // günün göç turu yalnız mekanik kenarları (`referans:` · `dayanak:`) taşımış,
  // YORUM ve DÜZYAZI içindeki atıflara hiç dokunmamıştı. Ölçüm: eklenti kaynağında
  // yüz elli iki, çekirdekte on atıf; yüz kırk üçünün halefi vardı ve taşındı.
  // Panellerin davranışı, kimliği ve sayaç türetimi DEĞİŞMEDİ — yalnız bir yorum
  // satırı güncel kanona işaret eder oldu.
  // ÖZET ÜÇÜNCÜ KEZ BİLEREK GÜNCELLENDİ — CDL-A04 dil katmanı göçü (2026-08-02).
  //
  // İki paneldeki kullanıcıya görünen metinler iki dilli yüzey sözlüğüne
  // taşındı. Onay yüzeyi davranışı, panel kimlikleri, yenileme
  // ritmi ve sayaç türetimi DEĞİŞMEDİ; yalnız metinlerin geldiği dil katmanı
  // değişti. Nöbet bu meşru bayt değişikliğini görünür kılmaya devam eder.
  // ÖZET DÖRDÜNCÜ KEZ BİLEREK GÜNCELLENDİ — GOC-TERFI-A06 (2026-08-03).
  //
  // Bildirim özetinin rozeti artık ayrı bir yüzey hedefinden değil, grubun ilk
  // tanısındaki sicil düzeyinden türetilir. Panel kimliği, yenileme ritmi ve
  // sayaç türetimi değişmedi; yalnız yüzeyde yeniden derecelendirme yolu kapandı.
  // ÖZET BEŞİNCİ KEZ BİLEREK GÜNCELLENDİ — VIT-KIMLIK-A05 (2026-08-04).
  //
  // Founder hükmü: IDE'nin içi baştan aşağı geometrik çizim dilinden konuşur.
  // İki panelin proje ve kayıt satırlarındaki hazır codicon kimlikleri
  // (bookmark · bell · inbox · layers · circle-small-filled) satır çizelgesinin
  // (simge-cizelgesi.ts) geometrik simgelerine çevrildi; renk anlamları üretici
  // varyantlarıyla aynen korunur. Panel davranışı, kayıt içeriği, yenileme
  // ritmi ve sayaç türetimi DEĞİŞMEDİ — yalnız görsel katman değişti.
  // Yedinci meşru güncelleme (2026-08-04 · Founder canlı bulgusu): düz gri
  // basılan satır ikonları metinden ayrışmıyordu; çan uyarı sarısına, iki
  // proje satırı bilgi mavisine bağlandı — yalnız varyant seçimi değişti.
  // ÖZET SEKİZİNCİ KEZ BİLEREK GÜNCELLENDİ — KYN-YUZ-A01 (2026-08-08).
  //
  // Ölçülmüş kusur şuydu: sınıflama Fikir tipini Hatırlatıcı'nın söz-verilmemiş
  // kardeşi ilan ettiği hâlde yazılan bir Fikir hiçbir panele ulaşmıyordu, çünkü
  // motor Fikir için hiçbir tanı üretmez ve bu panel yalnız tanı akışından
  // beslenirdi. Onarım Hatırlatıcılar panelinin İÇİNE bir Fikir bölümü açtı;
  // kayıtlar ayrışmış ağaçtan okunur ve bölüm satırı ile Fikir satırları
  // geometrik ailenin işaretlerini taşır. Hatırlatıcı hanesinin davranışı,
  // kaynağı, panel kimliği, yenileme ritmi ve `kayitSayisi` türetimi DEĞİŞMEDİ;
  // yalnız aynı panele ikinci bir hane eklendi. `bildirimler.ts` bu turda hiç
  // açılmadı ve özeti bilerek olduğu gibi bırakıldı.
  // ÖZET DOKUZUNCU KEZ BİLEREK GÜNCELLENDİ — VIT-GRAF-A13 (2026-08-08).
  //
  // İki panel de bu turda GEZİLEBİLİR ve KOPYALANABİLİR kılındı; değişiklik
  // ikisine de dokunur ve kapsamı bellidir. Ağaca Proje ile kayıt arasına DOSYA
  // kademesi girdi ve dosya satırı teknoloji simgesini `teknoloji-simgesi.ts`
  // tek kaynağından okur; kayıt satırı kendi kodunu söyler ve Hatırlatıcılar
  // hanesinde işaret kayıt türüne göre ayrışır; her satır sağ tık menüsünden
  // panoya inebilir. Onay yüzeyine hiçbir bağ kurulmadı: iki panel hâlâ
  // `onay-cekirdek` · `onay-tarayici` · `onay-kuyrugu` · `posta-kutusu`
  // adlarının hiçbirini içermez ve bunu yukarıdaki nöbet ayrıca ölçer. Panel
  // kimlikleri, yenileme ritmi ve sayaç türetimi DEĞİŞMEDİ.
  // ÖZET ONUNCU KEZ BİLEREK GÜNCELLENDİ — VIT-GRAF-A15 (2026-08-08).
  //
  // Founder hükmü tür özetinin en üstteki proje satırına yazılmasıdır. Hükmün
  // doğuşu ölçülmüştür: VIT-GRAF-A13 ağacı üç kademeye indirirken tanı kimliğine
  // göre yığan eski kademeyi dosya kademesiyle değiştirmek zorunda kaldı ve
  // kullanıcı hangi tür sorunun baskın olduğunu ancak bütün dosyaları açıp
  // sayarak öğrenir hâle geldi. Founder kaybolan görünümü geri istedi fakat
  // dördüncü kademeyi reddetti, dolayısıyla geri gelen şey bir kademe değil bir
  // özet satırıdır. İki panelde de değişen tek şey Proje satırının etiketi,
  // gri açıklaması ve ipucudur; dağılım panellerin KENDİ kayıt kümesinden
  // `turDagilimi` ile türetilir ve ikinci bir tarama ya da ikinci bir sayaç
  // kurulmaz. Ağacın kademe sayısı, kayıt içeriği, panel kimlikleri, yenileme
  // ritmi ve `kayitSayisi` türetimi DEĞİŞMEDİ; onay yüzeyine hiçbir bağ
  // kurulmadı ve bunu yukarıdaki nöbet ayrıca ölçer.
  // ÖZET ON BİRİNCİ KEZ BİLEREK GÜNCELLENDİ — VIT-GRAF-A15 düzeltme turu (2026-08-09).
  //
  // Bağımsız denetim, `hatirlaticilar.ts` içindeki Fikir hanesi yorumunun
  // YÜRÜRLÜKTEKİ HÜKMÜN TERSİNİ söylediğini ölçtü: yorum, Fikir satırının kodlu
  // etiket hükmünün dışında bırakıldığını yazıyordu, oysa aynı turda o sınır
  // kaldırılmış ve iki hane ortak biçime bağlanmıştı. Kaydı okuyan kişi kilitli
  // hükmün tersine yönlendiriliyordu. Bu turda değişen tek şey o yorumun
  // metnidir; davranış, veri kaynağı, panel kimliği, yenileme ritmi ve sayaç
  // türetimi DEĞİŞMEDİ. `bildirimler.ts` bu düzeltme turunda hiç açılmadı ve
  // özeti bilerek olduğu gibi bırakıldı.
  // ÖZET ON İKİNCİ KEZ BİLEREK GÜNCELLENDİ — VIT-GRAF-A16 (2026-08-09).
  //
  // Founder 2026-08-08 tarihinde Fikirlerin kendi panelini hak ettiğine hükmetti
  // ve hükmün doğruluğu 2026-08-09 tarihinde canlı görünümde ölçüldü: canlı rafa
  // yazılan iki gerçek Fikir panelde bulunamadı, çünkü ikisi de yirmi dokuz
  // hatırlatıcı kaydının altında kalmıştı. Bu turda `hatirlaticilar.ts`
  // dosyasından Fikir hanesinin tamamı söküldü; `fikirBölümü` ile `fikir` kök
  // türleri, `fikirleriYerlestir` kapısı, `fikirSayisi` okuyucusu, iki Fikir
  // simgesi, saf çekirdeğe kurulan bağ ve pano dalındaki Fikir kolu kalktı.
  // Boşluk ölçüsü de yalnız hatırlatıcıları sayar hâle döndü. Hatırlatıcı
  // hanesinin davranışı, veri kaynağı, panel kimliği, yenileme ritmi ve
  // `kayitSayisi` türetimi DEĞİŞMEDİ; onay yüzeyine hiçbir bağ kurulmadı ve bunu
  // yukarıdaki nöbet ayrıca ölçer. `bildirimler.ts` bu turda hiç açılmadı ve
  // özeti bilerek olduğu gibi bırakıldı.
  // ÖZET ON ÜÇÜNCÜ KEZ BİLEREK GÜNCELLENDİ — VIT-POSTA-A06 (2026-08-27).
  //
  // Founder hükmü dört panelin de kendi sayı rozetini taşımasıdır. Hükmün doğuşu
  // ölçülmüştür: rozet bugüne dek yalnız Onaylar panelinde vardı ve komşu üç
  // panel sayısını yalnız durum çubuğunda söylüyordu, dolayısıyla kullanıcı bir
  // panelin dolu mu boş mu olduğunu ancak onu açarak öğreniyordu. Bu turda iki
  // panelde de değişen tek şey boş durum güncelleyicisine eklenen tek satırlık
  // rozet atamasıdır. Rozetin KARARI saf çekirdekte tek bir yerde yaşar
  // (yuzey-cekirdek.panelRozeti) ve sayı yine panelin KENDİ listesinden, durum
  // çubuğunun okuduğu aynı `kayitSayisi` kaynağından türer; ikinci bir sayaç
  // kurulmadı ve bu yüzden rozet ile durum çubuğu çelişemez. Ağacın kademe
  // sayısı, kayıt içeriği, panel kimlikleri, yenileme ritmi ve sayaç türetimi
  // DEĞİŞMEDİ; onay yüzeyine hiçbir bağ kurulmadı ve bunu yukarıdaki nöbet
  // ayrıca ölçer.
  const BEKLENEN: Record<string, string> = {
    "../src/hatirlaticilar.ts": "fd692560f8c81e69",
    "../src/bildirimler.ts": "adeaa39549882d72",
  };
  for (const [dosya, beklenen] of Object.entries(BEKLENEN)) {
    assert.equal(ozet(dosya), beklenen,
      `${dosya} değişmiş. Bu değişiklik onay yüzeyi turunun kapsamı dışıdır; ` +
      "meşruysa buradaki özet BİLEREK güncellenmelidir.");
  }
});

// ── 📊 DURUM ÇUBUĞU: SAYI TÜRETİLİR, TUTULMAZ (VIT-GRAF-A13) ────────────────
//
//   Founder hükmü 2026-07-28: dört yüzey de durum çubuğunda görünsün. Bu nöbet
//   o girdilerin varlığını değil, SÖZLEŞMESİNİ korur: her sayı bir KAYNAK
//   ÇAĞRISIDIR, gömülü bir değer değildir. İkinci bir sayaç doğarsa panel ile
//   durum çubuğu ayrışır ve kullanıcı hangisine inanacağını bilemez — bu depo
//   aynı kusuru bir günde iki kez ölçtü (iki simge çizelgesi · iki dışlama evreni).

test("durum çubuğu Sarmal'ın kendi yüzeylerini gösterir ve her sayı kaynaktan TÜRETİLİR", async () => {
  const { DURUM_CUBUGU_GIRDILERI } = await import("../src/yuzey-cekirdek.ts");
  const yuzeyler = new Set(DURUM_CUBUGU_GIRDILERI.map((g) => g.metin));
  // Sarmal YALNIZ kendi yüzeylerini basar. Hata ve uyarı sayacı VS Code'un kendi
  // durum çubuğundadır; ikinci kez basmak aynı sayıyı iki yerde gösteriyordu
  // (Founder canlı bulgusu 2026-07-29: "x ve ! iki tane var").
  //
  // FİKİRLER GİRDİSİ VIT-GRAF-A16 İLE DOĞDU. Hane Hatırlatıcılar panelinin
  // içinde bir bölüm olarak yaşarken durum çubuğunda hiç görünmüyordu, çünkü
  // oradaki girdinin adı "Hatırlatıcılar"dır ve o etiketin altına sessizce
  // ikinci bir kavramın sayısını eklemek kullanıcıya açıklamasız büyüyen bir
  // sayı gösterirdi. Hane kendi paneline taşınınca sayı da kendi adıyla
  // konuşabilir hâle geldi ve yine ikinci bir sayaç kurulmadı.
  for (const beklenen of ["gözlemler", "hatırlatıcılar", "fikirler", "postaKutusu"]) {
    assert.ok(yuzeyler.has(beklenen as never), `durum çubuğunda "${beklenen}" yüzeyi yok`);
  }
  assert.ok(!yuzeyler.has("sorunlar" as never),
    "durum çubuğu VS Code'un kendi hata/uyarı sayacını tekrar ediyor");
  // Sayı gömülü olamaz: her girdi kaynağı ÇAĞIRIR. Sahte kaynak ayırt edici
  // değerler verir; girdi o değerleri aynen döndürmelidir.
  const kaynak = {
    hata: () => 11, uyarı: () => 22, gözlem: () => 33,
    hatırlatıcı: () => 44, fikir: () => 66, kapı: () => 55,
  };
  const okunan = DURUM_CUBUGU_GIRDILERI.map((g) => g.say(kaynak));
  assert.deepEqual(okunan, [55, 44, 66, 33],
    "durum çubuğu sayısı kaynaktan gelmiyor; ikinci bir sayaç tutuluyor olabilir");
});

test("durum çubuğu KENDİ taramasını kurmaz ve KENDİ zamanlayıcısını açmaz", () => {
  const kaynak = oku("../src/durum-cubugu.ts");
  for (const yasak of ["findFiles", "openTextDocument", "setInterval", "setTimeout",
                       "createFileSystemWatcher", "readFile"]) {
    assert.ok(!kaynak.includes(yasak),
      `durum çubuğu ikinci bir veri yolu kuruyor: ${yasak}`);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 🧪 KULLANICI SONUCUNU ÖLÇEN NÖBETLER (2026-07-29 onarım turu)
//
//   Depo bugün 275 nöbetle yeşildi ve gerçek VS Code kabuğunda ölçülen dokuz
//   kusurun HİÇBİRİNİ görmüyordu. Sebep şudur: eski nöbetler SAYAÇ ölçüyordu
//   (kaç iş parçacığı yaşıyor, kaç belge açıldı) ama kullanıcının gördüğü sonucu
//   ölçmüyordu — ne diskteki satırın ne olduğunu, ne kaç satırın değiştiğini, ne
//   de kararın doğru Adıma yazıldığını.
//
//   Aşağıdaki nöbetler o boşluğu kapatır. Hepsi ÜRETİMİN KENDİ işlevlerini
//   koşturur: gerçek belirteçleyici, gerçek ayrıştırıcı, gerçek kapı tanıma,
//   gerçek biçimlendirme çekirdeği ve üretimdeki karar hattının kendisi.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Bellekteki sahte belge — üretimin YazimKabugu sözleşmesini gerçekten uygular.
 *
 * `kaydetmedeBicimle` seçeneği eklentinin kendi paket bildirimindeki
 * `[sarmal] → editor.formatOnSave: true` varsayılanını taklit eder ve gerçek
 * `bicimle()` çekirdeğini koşturur; askı defteri de üretimdekinin aynısıdır.
 * Böylece "karar kaç satır değiştirdi" sorusu ölçülebilir hâle gelir.
 */
function sahteBelge(dosya: string, metin: string, secenek: {
  kaydetmedeBicimle?: boolean;
  kaydetBasarili?: boolean;
  catisma?: CatismaSecimi;
  askiDefteri?: BicimAskisi;
  askiyiKur?: boolean;
} = {}) {
  const durum = {
    bellek: metin,
    disk: metin,
    kirli: false,
    catismaSorusu: 0,
    kaydetmeSayisi: 0,
    eklemeSayisi: 0,
    // Geri alma artık ÖNCEKİ SATIR METİNLERİNİ tutar: aynı turda hem ekleme hem
    // silme yapılabildiği için kaydedilmiş konumlar iki işlemden sonra kayar.
    geriYukleme: undefined as { satir: number; metin: string }[] | undefined,
  };
  const askı = secenek.askiDefteri ?? new BicimAskisi();
  const coz = (kaynak: string) => ayristir(belirtecle(kaynak)).bildirimler;
  const kabuk: YazimKabugu = {
    kirliMi: () => durum.kirli,
    async catismaSor() {
      durum.catismaSorusu += 1;
      return secenek.catisma ?? "iptal";
    },
    // Üretimdeki sözleşmenin aynısı: ayrıştırılamayan belge boş liste değil
    // `undefined` bildirir — yazım hattı iki durumu ayırmak zorundadır.
    kapilar: () => {
      try { return onayKapilariTopla(coz(durum.bellek)); }
      catch { return undefined; }
    },
    kodluAdimSayisi: (kod) => {
      try { return adimKodAdedi(coz(durum.bellek), kod); }
      catch { return 0; }
    },
    satirMetni: (satir) => durum.bellek.split("\n")[satir],
    async ekle(kapi, ek, silme) {
      durum.eklemeSayisi += 1;
      const satirlar = durum.bellek.split("\n");
      // ⚠️ SÖZLEŞME: ekleme noktası SİLİNEN bölgenin içine düşemez. Bir editör aynı
      // belgede kesişen iki düzenlemeyi reddedebilir ve reddetmese bile sıraları
      // belirsizdir; nokta silinen metnin içindeyse üretilen belge uygulama
      // sırasına göre değişir. Fikstür kabuğu bu belirsizliği ÜSTLENMEZ, hata
      // verir — üretim, noktayı silmenin bitişine taşıyarak belirsizliği hiç
      // doğurmamakla yükümlüdür.
      if (silme && silme.satir === kapi.durumSatir
        && silme.baslangic <= kapi.durumSutun && kapi.durumSutun < silme.bitis) {
        throw new Error("ekleme noktası silinen bölgenin içine düşüyor; düzenleme belirsiz");
      }
      const dokunulan = [...new Set(silme ? [kapi.durumSatir, silme.satir] : [kapi.durumSatir])];
      const yedek = dokunulan.map((s) => ({ satir: s, metin: satirlar[s]! }));
      // Üretimdeki sözleşmenin aynısı: ekleme ile silme TEK düzenlemededir ve
      // ikisi de ÖZGÜN konumlara uygulanır — sıra bir işlemin ötekinin konumunu
      // kaydırmasına izin veremez, bu yüzden silme önce alınır.
      if (silme) {
        const s = satirlar[silme.satir]!;
        satirlar[silme.satir] = s.slice(0, silme.baslangic) + s.slice(silme.bitis);
      }
      const hedef = satirlar[kapi.durumSatir]!;
      const kayma = silme && silme.satir === kapi.durumSatir && silme.bitis <= kapi.durumSutun
        ? silme.bitis - silme.baslangic : 0;
      const nokta = kapi.durumSutun - kayma;
      satirlar[kapi.durumSatir] = hedef.slice(0, nokta) + ek + hedef.slice(nokta);
      durum.bellek = satirlar.join("\n");
      durum.kirli = true;
      durum.geriYukleme = yedek;
      return true;
    },
    async kaydet() {
      durum.kaydetmeSayisi += 1;
      if (secenek.kaydetBasarili === false) return false;
      // ÜRETİMDEKİ SIRANIN AYNISI (onay-kuyrugu.ts · yazimKabugu.kaydet):
      // askıya al → kaydet → `finally` içinde serbest bırak. `askiyiKur` yanlış
      // verilirse eski KUSURLU davranış koşar; kontrol–deney çifti budur.
      if (secenek.askiyiKur) askı.askiyaAl(dosya);
      try {
        // Kaydetmede-biçimle katılımcısı: biçimlendirici sağlayıcının kendi
        // hükmüyle (bicimlendir.ts) askıdaysa HİÇBİR düzenleme üretmez.
        if (secenek.kaydetmedeBicimle && !askı.askidaMi(dosya)) {
          durum.bellek = bicimle(durum.bellek, "\n");
        }
        durum.disk = durum.bellek;
        durum.kirli = false;
        return true;
      } finally {
        if (secenek.askiyiKur) askı.serbestBirak(dosya);
      }
    },
    async ekiGeriAl() {
      if (!durum.geriYukleme) return false;
      const satirlar = durum.bellek.split("\n");
      for (const y of durum.geriYukleme) satirlar[y.satir] = y.metin;
      durum.bellek = satirlar.join("\n");
      durum.geriYukleme = undefined;
      return true;
    },
    bellektekiOnay: (kod): OnayKaniti => {
      try {
        const b = coz(durum.bellek);
        return { tur: "değer", onay: adimOnayDegeri(b, kod), bekler: adimBeklerDegeri(b, kod) };
      } catch { return { tur: "ayrıştırılamadı" }; }
    },
    async disktekiOnay(kod): Promise<OnayKaniti> {
      try {
        const b = coz(durum.disk);
        return { tur: "değer", onay: adimOnayDegeri(b, kod), bekler: adimBeklerDegeri(b, kod) };
      } catch { return { tur: "ayrıştırılamadı" }; }
    },
  };
  return { durum, kabuk, askı };
}

/** İki metin arasında değişen satır sayısı — "karar kaç satır değiştirdi" ölçüsü. */
function degisenSatir(once: string, sonra: string): number {
  const a = once.split("\n");
  const b = sonra.split("\n");
  let fark = Math.abs(a.length - b.length);
  for (let i = 0; i < Math.min(a.length, b.length); i += 1) if (a[i] !== b[i]) fark += 1;
  return fark;
}

const KAPILI_KAYNAK = zincir(
  `Adım( kod: PRB-A01, durum: beklemede, ne: "🧪 birinci kapı", kabul: [ ${ONAYLI_OLCUT} ] )`,
  `Adım( kod: PRB-A02, durum: beklemede, ne: "🧪 ikinci kapı", kabul: [ ${ONAYLI_OLCUT} ] )`);

const ISTEK = {
  dosya: "/depo/plan/prob.sar", kod: "PRB-A01", satir: 3,
  damga: "onaylandı", not: "", gun: "2026-07-29",
};

// ── B · DOĞRU KAPI: karar KODA göre yazılır ─────────────────────────────────

test("KAPI ÇÖZÜMÜ: bayat satır başka kapıyı gösterse bile GÖNDERİLEN KOD bağlayıcıdır", () => {
  const kapilar = onayKapilariTopla(ayristir(belirtecle(KAPILI_KAYNAK)).bildirimler);
  assert.equal(kapilar.length, 2, "fikstür iki kapı üretmedi; nöbet ölçmüyor");
  const [a01, a02] = kapilar;
  // Ölçülen kusur (prob 1 · P4): A01 istendiği hâlde A02'nin SATIRIYLA çağrıldı
  // ve karar A02'ye yazıldı. Kod verilmişse kod bağlayıcıdır.
  const cozum = kapiCoz(kapilar, "PRB-A01", a02!.satir);
  assert.equal(cozum.tur, "bulundu");
  assert.equal(cozum.tur === "bulundu" && cozum.kapi.kod, "PRB-A01",
    "bayat satır kararı YANLIŞ kapıya yönlendirdi");
  assert.equal(cozum.tur === "bulundu" && cozum.satirUyuyor, false,
    "satır uyuşmazlığı görülmüyor; gezinme bilgisi kayboldu");
  // Satır doğruyken de aynı kapı bulunur ve uyum bildirilir.
  const dogru = kapiCoz(kapilar, "PRB-A01", a01!.satir);
  assert.equal(dogru.tur === "bulundu" && dogru.satirUyuyor, true);
});

test("KAPI ÇÖZÜMÜ: aynı dosyada yinelenen kod yazılabilir hedef ÜRETMEZ", () => {
  const ikiz = zincir(
    `Adım( kod: IKIZ, durum: beklemede, ne: "🧪 birinci", kabul: [ ${ONAYLI_OLCUT} ] )`,
    `Adım( kod: IKIZ, durum: beklemede, ne: "🧪 ikinci", kabul: [ ${ONAYLI_OLCUT} ] )`);
  const kapilar = onayKapilariTopla(ayristir(belirtecle(ikiz)).bildirimler);
  assert.equal(kapilar.length, 2, "fikstür iki ikiz kapı üretmedi");
  const cozum = kapiCoz(kapilar, "IKIZ", kapilar[0]!.satir);
  assert.equal(cozum.tur, "çoklu",
    "belirsiz kimlikte bir hedef seçildi; karar yanlış Adıma yazılabilir");
  assert.equal(cozum.tur === "çoklu" && cozum.adet, 2);
});

test("YAZIM: karar SATIRA değil KODA yazılır — bayat satırla çağrı bile doğru Adımı bulur", async () => {
  const kapilar = onayKapilariTopla(ayristir(belirtecle(KAPILI_KAYNAK)).bildirimler);
  const bayatSatir = kapilar[1]!.satir;                       // A02'nin satırı
  const { durum, kabuk } = sahteBelge(ISTEK.dosya, KAPILI_KAYNAK);
  const sonuc = await kararIsle(new UcusDefteri(), kabuk, { ...ISTEK, satir: bayatSatir });

  assert.equal(sonuc.tur, "başarı", `karar işlenmedi: ${sonuc.tur}`);
  assert.equal(adimOnayDegeri(ayristir(belirtecle(durum.disk)).bildirimler, "PRB-A01"),
    "onaylandı — 2026-07-29", "karar istenen kapıya yazılmadı");
  assert.equal(adimOnayDegeri(ayristir(belirtecle(durum.disk)).bildirimler, "PRB-A02"),
    undefined, "karar YANLIŞ kapıya yazıldı; ölçülmüş Kusur 3 geri açıldı");
});

test("YAZIM: yinelenen kodda yazım DURUR ve hiçbir düzenleme uygulanmaz", async () => {
  const ikiz = zincir(
    `Adım( kod: IKIZ, durum: beklemede, ne: "🧪 birinci", kabul: [ ${ONAYLI_OLCUT} ] )`,
    `Adım( kod: IKIZ, durum: beklemede, ne: "🧪 ikinci", kabul: [ ${ONAYLI_OLCUT} ] )`);
  const { durum, kabuk } = sahteBelge(ISTEK.dosya, ikiz);
  const sonuc = await kararIsle(new UcusDefteri(), kabuk, { ...ISTEK, kod: "IKIZ" });

  assert.equal(sonuc.tur, "kimlikÇakışması");
  assert.equal(durum.eklemeSayisi, 0, "belirsiz kimlikte yine de yazıldı");
  assert.equal(durum.disk, ikiz, "diskteki metin değişti");
});

test("YAZIM: kod KAPALI bir ikizde de geçiyorsa çapa belirsizdir ve yazım DURUR", async () => {
  // Ölçülen zemin (Kusur 3): depoda yinelenen Adım kodları vardır (ADM-01 ·
  // ADM-02 · ADM-SINA · ADM-X). Açık kapılar arasında kod tek olsa da, aynı kod
  // KAPALI bir Adımda da geçiyorsa "dosya+kod" çapası tek bir Adımı göstermez;
  // açık olanı seçmek de bir tahmindir ve tahmine yazmak sessiz yanlış yazımdır.
  const ikizliBelge = zincir(
    `Adım( kod: IKIZ, durum: tamamlandı, ne: "🧪 kapanmış ikiz", kabul: [ ${ONAYLI_OLCUT} ] )`,
    `Adım( kod: IKIZ, durum: beklemede, ne: "🧪 açık kapı", kabul: [ ${ONAYLI_OLCUT} ] )`);
  // Fikstür elverişlidir: açık kapılar arasında IKIZ TEK'tir, yani eski bekçi
  // (yalnız açık kapıları sayan kapiCoz) bu yazımı GEÇİRİRDİ.
  assert.equal(onayKapilariTopla(bildirimler(ikizliBelge)).filter((k) => k.kod === "IKIZ").length, 1,
    "fikstürde açık IKIZ kapısı tek değil; nöbet genişletilen bekçiyi ölçemiyor");
  assert.equal(adimKodAdedi(bildirimler(ikizliBelge), "IKIZ"), 2,
    "fikstürde kapalı ikiz yok; nöbet boş küme üstünde koşuyor");
  const { durum, kabuk } = sahteBelge(ISTEK.dosya, ikizliBelge);
  const sonuc = await kararIsle(new UcusDefteri(), kabuk, { ...ISTEK, kod: "IKIZ" });
  assert.equal(sonuc.tur, "kimlikÇakışması",
    "kapalı ikize rağmen yazıldı; çapa tekilliği yalnız açık kapılar üstünde ölçülüyor");
  assert.equal(durum.eklemeSayisi, 0, "belirsiz çapada yine de yazıldı");
  assert.equal(durum.disk, ikizliBelge, "diskteki metin değişti");
});

// ── B2 · EKLEME NOKTASI TAHMİN DEĞİL KANITTIR (Kusur 1 · en ağır bulgu) ──────
//   Bağımsız denetim ölçümü: ekleme noktası `sütun − 1 + uzunluk` hesabıdır ve
//   yalnız TIRNAKSIZ durum değerinde doğrudur. Bu tur aynı ölçümü yeniden koştu
//   (2026-07-30): tırnaklı değerde ek dizginin içine düşüyor ve ayrıştırıcı
//   "Beklenmeyen karakter" hatasıyla duruyor — dosya söz dizimini kaybediyor.

const TIRNAKLI_KAYNAK = zincir(
  `Adım( kod: TRN-A01, durum: "beklemede", ne: "🧪 tırnaklı durum", kabul: [ ${ONAYLI_OLCUT} ] )`);

test("EKLEME NOKTASI: tırnaklı değerde hesap kaynağa uymaz ve KÖR yazım dosyayı bozar (tehlike kanıtı)", () => {
  // Fikstür elverişlidir: tırnaklı durum değeri de meşru bir açık kapı üretir.
  const [kapi] = onayKapilariTopla(bildirimler(TIRNAKLI_KAYNAK));
  assert.ok(kapi, "tırnaklı durum kapı üretmedi; nöbet boş küme üstünde koşuyor");
  const satir = TIRNAKLI_KAYNAK.split("\n")[kapi.durumSatir]!;
  // ① Bayt doğrulaması uyuşmazlığı görür: noktanın önündeki dilim durum değeri değildir.
  const denetim = eklemeNoktasiniDogrula(satir, kapi);
  assert.equal(denetim.tur, "uyuşmuyor",
    "tırnaklı değerde hesap doğru sanıldı; bayt doğrulaması ölçmüyor");
  // ② Kör yazım (onarım öncesi davranış) belgeyi GERÇEKTEN bozar: ek dizginin
  //    içine düşer ve dosya ayrıştırılamaz olur. Onarımın gerekçesi bu ölçümdür.
  const bozukSatir = satir.slice(0, kapi.durumSutun)
    + onayEkiMetni(onayKaydiMetni("onaylandı", "2026-07-30", ""))
    + satir.slice(kapi.durumSutun);
  const bozukKaynak = TIRNAKLI_KAYNAK.split("\n")
    .map((s, i) => (i === kapi.durumSatir ? bozukSatir : s)).join("\n");
  assert.throws(() => bildirimler(bozukKaynak),
    "kör yazım tırnaklı değerde belgeyi bozmadı; tehlike modeli değişmiş, nöbeti güncelle");
  // ③ Tırnaksız değerde aynı hesap kaynağa UYAR: doğrulama meşru yazımı engellemez.
  const [duz] = onayKapilariTopla(bildirimler(KAPILI_KAYNAK));
  assert.equal(eklemeNoktasiniDogrula(KAPILI_KAYNAK.split("\n")[duz!.durumSatir], duz!).tur,
    "doğru", "tırnaksız değerde doğrulama yanlış alarm veriyor; hiçbir karar yazılamaz");
});

test("EKLEME NOKTASI: yazım hattı doğrulanamayan noktaya YAZMAZ ve dürüst hata verir", async () => {
  const { durum, kabuk } = sahteBelge("/depo/plan/tirnak.sar", TIRNAKLI_KAYNAK);
  const sonuc = await kararIsle(new UcusDefteri(), kabuk,
    { ...ISTEK, dosya: "/depo/plan/tirnak.sar", kod: "TRN-A01" });
  assert.equal(sonuc.tur, "eklemeNoktasıDoğrulanamadı",
    `tırnaklı durumda yazım "${sonuc.tur}" ile bitti; ya dosya bozuldu ya hata yanlış konuştu`);
  assert.equal(durum.eklemeSayisi, 0, "doğrulanamayan noktaya yine de yazıldı");
  assert.equal(durum.bellek, TIRNAKLI_KAYNAK, "bellekteki metin değişti; sessiz bozma yaşıyor");
  assert.equal(durum.disk, TIRNAKLI_KAYNAK, "diskteki metin değişti; sessiz bozma yaşıyor");
  // Belge sağlam kaldı: kapı hâlâ açıktır ve kullanıcı kaydı elle işleyebilir.
  assert.equal(onayKapilariTopla(bildirimler(durum.disk)).length, 1,
    "kapı kayboldu; dosya değişmemişken kapı düşemez");
});

test("EKLEME NOKTASI: hedef satır kaynakta yoksa (satır kayması) yazım durur", async () => {
  const { durum, kabuk } = sahteBelge(ISTEK.dosya, KAPILI_KAYNAK);
  const satirsiz: YazimKabugu = { ...kabuk, satirMetni: () => undefined };
  const sonuc = await kararIsle(new UcusDefteri(), satirsiz, ISTEK);
  assert.equal(sonuc.tur, "eklemeNoktasıDoğrulanamadı",
    "kaynakta olmayan satıra yazım denendi");
  assert.equal(durum.eklemeSayisi, 0, "olmayan satıra yine de yazıldı");
});

test("EKLEME NOKTASI: NFC olmayan (NFD) satıra yazım DURUR — kaymış nokta sahte-geçemez", () => {
  // Bağımsız denetim bulgusu (2026-07-30): sütun NFC'ye normalleştirilmiş
  // metinden hesaplanır, yazım ise ham editör satırına gider. NFD kaydedilmiş
  // satırda iki konum sistemi ayrışır; denetçinin kurduğu geçerli bir fikstürde
  // kaymış nokta, satırın başka bir "beklemede" dilimine denk gelerek dilim
  // denetimini SAHTE-GEÇİRDİ ve dosya önce bozulup hata sonra geldi. Bu nöbet,
  // dilim denetiminin geçtiği ama satırın NFD olduğu vakayı kurar: normalizasyon
  // nöbeti sökülürse bu sınama "doğru" görür ve kırmızıya döner.
  const [kapi] = onayKapilariTopla(bildirimler(KAPILI_KAYNAK));
  assert.ok(kapi, "fikstür kapı üretmedi; nöbet boş küme üstünde koşuyor");
  const nfcSatir = KAPILI_KAYNAK.split("\n")[kapi.durumSatir]!;
  // Ekleme noktasından SONRAKİ bölgeye NFD bir hece eklenir: noktanın önündeki
  // dilim değişmez (dilim denetimi tek başına GEÇERDİ), satır artık NFC değildir.
  const nfdEk = " " + "geliştirmede".normalize("NFD");
  assert.notEqual((nfcSatir + nfdEk).normalize("NFC"), nfcSatir + nfdEk,
    "fikstür NFD üretmedi; nöbet hiçbir şey ölçmüyor");
  // Kontrol kolu: aynı ekin NFC hâli meşru yazımı engellemez.
  assert.equal(eklemeNoktasiniDogrula(nfcSatir + " geliştirmede", kapi).tur, "doğru",
    "NFC satırda doğrulama yanlış alarm veriyor; nöbet yanlış şeyi ölçüyor");
  assert.equal(eklemeNoktasiniDogrula(nfcSatir + nfdEk, kapi).tur, "uyuşmuyor",
    "NFD satıra yazım geçti; normalizasyon nöbeti sökülmüş — kaymış nokta dosyayı bozabilir");
});

test("EKLEME NOKTASI: geribildirim yüzeyi (takdir) AYNI doğrulamadan geçer — kör kopya yaşayamaz", () => {
  // Bağımsız denetim aynı kör aritmetiğin (sütun − 1 + uzunluk) takdir.ts içinde
  // ikinci bir kopyasını ölçtü. Kopyanın doğrulamasız kalması, karar yazımında
  // kapatılan bozma zincirinin geribildirim yüzeyinde açık kalması demektir.
  // Nöbet kaynak şeklini ölçer: takdir.ts doğrulamayı TEK evden (onay-cekirdek)
  // alır ve ekleme, denetim "doğru" demeden çağrılamaz.
  const kaynak = readFileSync(fileURLToPath(new URL("../src/takdir.ts", import.meta.url)), "utf8");
  assert.ok(kaynak.includes('import { eklemeNoktasiDenetimi } from "./onay-cekirdek.ts"'),
    "takdir doğrulamayı ortak evden almıyor; kör aritmetik kopyası korumasız");
  const ekleBlogu = /const denetim = eklemeNoktasiDenetimi\([\s\S]{0,160}?"tamamlandı"[\s\S]{0,80}?\);[\s\S]{0,700}?duzenleme\.insert\(/.exec(kaynak);
  assert.ok(ekleBlogu, "takdir'in ekleme yolu doğrulamadan geçmiyor; tırnaklı tamamlandı değeri dosyayı bozar");
  assert.ok(/if \(denetim\.tur !== "doğru"\)[\s\S]{0,400}?return;/.test(ekleBlogu[0]),
    "doğrulama var ama sonucu yazımı DURDURMUYOR; denetim süs olmuş");
});

test("MEKANİK KAPI: onayBekler alanı kabul deseni OLMADAN kapı üretir; yedek desen de yaşar", () => {
  // Kalıcı onarımın nöbeti (VIT-POSTA-A02): kapı artık düz metin tahmini değil
  // şema alanıdır. Ölçülen kusur, desene uymayan beş meşru kapının kuyruğa hiç
  // görünmemesiydi. Bu nöbet üç kolu ölçer: alan tek başına kapı üretir, karar
  // verilmiş Adımda üretmez, desenli eski yol da yaşamaya devam eder.
  const kaynak = zincir(
    `Adım( kod: MEK-A01, durum: beklemede, onayBekler: founder, ne: "🧪 mekanik beyan", kabul: [ "sıradan ölçüt — onay cümlesi YOK" ] )`);
  const [kapi] = onayKapilariTopla(bildirimler(kaynak));
  assert.ok(kapi, "onayBekler alanı kapı üretmedi; mekanik beyan okunmuyor");
  assert.equal(kapi.kod, "MEK-A01");
  assert.ok(kapi.olcut.includes("onayBekler"),
    "mekanik kapının ölçüt metni kaynağını söylemiyor; kullanıcı kapının nereden geldiğini bilemez");
  const kararli = zincir(
    `Adım( kod: MEK-A02, durum: beklemede, onayBekler: founder, onay: "onaylandı — 2026-07-30", ne: "🧪 kararı verilmiş", kabul: [ "ölçüt" ] )`);
  assert.equal(onayKapilariTopla(bildirimler(kararli)).length, 0,
    "kararı verilmiş mekanik kapı hâlâ kuyrukta; kapı kapanmıyor");
  const desenli = zincir(
    `Adım( kod: MEK-A03, durum: beklemede, ne: "🧪 eski desen", kabul: [ ${ONAYLI_OLCUT} ] )`);
  assert.equal(onayKapilariTopla(bildirimler(desenli)).length, 1,
    "desen yedeği öldü; geçiş dönemindeki mevcut kapılar kuyruktan düşer");
});

// ── C · KULLANICININ TASLAĞI VE DOSYANIN BİÇİMİ ─────────────────────────────

test("KİRLİ BELGE: temiz belgede çatışma sorusu HİÇ çıkmaz", async () => {
  const { durum, kabuk } = sahteBelge(ISTEK.dosya, KAPILI_KAYNAK);
  const sonuc = await kararIsle(new UcusDefteri(), kabuk, ISTEK);
  assert.equal(sonuc.tur, "başarı");
  assert.equal(durum.catismaSorusu, 0,
    "temiz belgede kullanıcıya soru soruldu; her geçişte çıkan onay geri geldi");
});

test("KİRLİ BELGE: kullanıcının taslağı ONAYI OLMADAN diske inmez", async () => {
  const { durum, kabuk } = sahteBelge(ISTEK.dosya, KAPILI_KAYNAK, { catisma: "iptal" });
  durum.bellek = `${KAPILI_KAYNAK}// kullanıcının kaydedilmemiş denemesi\n`;
  durum.kirli = true;

  const sonuc = await kararIsle(new UcusDefteri(), kabuk, ISTEK);

  assert.equal(sonuc.tur, "iptal");
  assert.equal(durum.catismaSorusu, 1, "kirli belgede çatışma sorulmadı");
  assert.equal(durum.kaydetmeSayisi, 0, "kullanıcının taslağı zorla diske indirildi");
  assert.ok(!durum.disk.includes("kaydedilmemiş denemesi"),
    "kullanıcının istemediği kaydetme gerçekleşti; ölçülmüş Kusur 2 geri açıldı");
  assert.equal(durum.eklemeSayisi, 0, "iptal edilen karar yine de yazıldı");
});

test("KİRLİ BELGE: kullanıcı 'kapıya git' derse hiçbir karar yazılmaz", async () => {
  const { durum, kabuk } = sahteBelge(ISTEK.dosya, KAPILI_KAYNAK, { catisma: "kapıyaGit" });
  durum.kirli = true;
  const sonuc = await kararIsle(new UcusDefteri(), kabuk, ISTEK);
  assert.equal(sonuc.tur, "kapıyaGit");
  assert.equal(sonuc.tur === "kapıyaGit" && sonuc.satir >= 0, true,
    "gezinme için satır bilgisi verilmedi");
  assert.equal(durum.eklemeSayisi, 0, "kapıya gitmek istenen kararda yazım yapıldı");
  assert.equal(durum.kaydetmeSayisi, 0, "kapıya gitmek istenen kararda kaydetme yapıldı");
});

/** Girintileri kanonik olmayan gerçek kaynak — biçimlendiricinin işi var. */
const HIZASIZ_KAYNAK = KAPILI_KAYNAK.split("\n")
  .map((s, i) => (i > 0 && s.trim() ? s.trimStart() : s)).join("\n");

test("BİÇİM: karar TEK BİR SATIR değiştirir, dosyanın tamamını yeniden biçimlemez", async () => {
  // Fikstürün ölçüme elverişli olduğu ÖNCE kanıtlanır: biçimlendirici bu kaynakta
  // gerçekten çok satır değiştiriyor olmalı, yoksa nöbet bedava yeşil olurdu.
  assert.ok(degisenSatir(HIZASIZ_KAYNAK, bicimle(HIZASIZ_KAYNAK, "\n")) > 1,
    "fikstür zaten kanonik biçimde; nöbet biçimleme kusurunu ölçemez");

  // DENEY — üretimdeki sıra: kaydetme biçim askısıyla sarılır.
  const askı = new BicimAskisi();
  const deney = sahteBelge(ISTEK.dosya, HIZASIZ_KAYNAK, {
    kaydetmedeBicimle: true, askiDefteri: askı, askiyiKur: true,
  });
  const oncekiDisk = deney.durum.disk;
  const sonuc = await kararIsle(new UcusDefteri(), deney.kabuk, ISTEK);

  assert.equal(sonuc.tur, "başarı", `karar işlenmedi: ${sonuc.tur}`);
  const degisen = degisenSatir(oncekiDisk, deney.durum.disk);
  assert.equal(degisen, 1,
    `karar ${degisen} satır değiştirdi; tek alan eklemesi olması gereken yazım ` +
    "dosyayı yeniden biçimledi (ölçülmüş Kusur 1)");
  assert.equal(askı.askiSayisi, 0,
    "biçim askısı açılmadı; kullanıcının kendi kaydetmesi de biçimsiz kalır");

  // KONTROL — askı KURULMAZSA aynı karar dosyanın tamamını yeniden biçimler.
  // Kontrol olmadan deneyin yeşili hiçbir şey kanıtlamazdı.
  const kontrol = sahteBelge(ISTEK.dosya, HIZASIZ_KAYNAK, {
    kaydetmedeBicimle: true, askiyiKur: false,
  });
  const kontrolOnce = kontrol.durum.disk;
  await kararIsle(new UcusDefteri(), kontrol.kabuk, ISTEK);
  assert.ok(degisenSatir(kontrolOnce, kontrol.durum.disk) > 1,
    "kontrol kolunda da tek satır değişti; kurulum biçimlemeyi hiç tetiklemiyor " +
    "ve deneyin yeşili hiçbir şey kanıtlamıyor");
});

test("BİÇİM ASKISI: kullanıcının KENDİ kaydetmesi biçimlenmeye devam eder", () => {
  // Onarım biçimlemeyi kaldırmaz, yalnız karar yazımının yan etkisini keser.
  const askı = new BicimAskisi();
  assert.equal(askı.askidaMi("/depo/a.sar"), false,
    "hiçbir karar yazılmıyorken biçimlendirici susuyor; kullanıcı hizalamayı kaybeder");
  askı.askiyaAl("/depo/a.sar");
  assert.equal(askı.askidaMi("/depo/a.sar"), true);
  assert.equal(askı.askidaMi("/depo/b.sar"), false,
    "askı BAŞKA dosyaları da susturuyor; kapsam tek belge olmalı");
  askı.serbestBirak("/depo/a.sar");
  assert.equal(askı.askidaMi("/depo/a.sar"), false, "askı açılmadı");
  assert.equal(askı.askiSayisi, 0, "defter sızdırdı");
});

test("BİÇİM ASKISI: iç içe askıda erken biten dış kalkanı kaldırmaz", () => {
  const askı = new BicimAskisi();
  askı.askiyaAl("/depo/a.sar");
  askı.askiyaAl("/depo/a.sar");
  askı.serbestBirak("/depo/a.sar");
  assert.equal(askı.askidaMi("/depo/a.sar"), true,
    "iç içe iki askıdan biri bitince kalkan kalktı; süren yazım dosyayı biçimletir");
  askı.serbestBirak("/depo/a.sar");
  assert.equal(askı.askidaMi("/depo/a.sar"), false);
});

test("BİÇİM ASKISI: üretim yolu askıyı GERÇEKTEN kurar ve biçimlendirici onu okur", () => {
  const yazici = oku("../src/onay-kuyrugu.ts");
  const bicim = oku("../src/bicimlendir.ts");
  assert.ok(/bicimAskisi\.askiyaAl\(/.test(yazici) && /bicimAskisi\.serbestBirak\(/.test(yazici),
    "karar yazıcısı kaydetmesini biçim askısıyla sarmıyor");
  assert.ok(/finally \{ bicimAskisi\.serbestBirak\(/.test(yazici),
    "askı `finally` içinde açılmıyor; yazım patlarsa biçimlendirici kalıcı olarak susar");
  assert.ok(/if \(bicimAskisi\.askidaMi\(doc\.uri\.fsPath\)\) return \[\];/.test(bicim),
    "biçimlendirici askıyı okumuyor; karar yazımı dosyayı yeniden biçimlemeye devam eder");
});

// ── D · KANITLI BAŞARI ──────────────────────────────────────────────────────

test("KANIT: kaydetme başarısızsa BAŞARI BİLDİRİLMEZ ve bellekteki ek geri alınır", async () => {
  const { durum, kabuk } = sahteBelge(ISTEK.dosya, KAPILI_KAYNAK, { kaydetBasarili: false });
  const sonuc = await kararIsle(new UcusDefteri(), kabuk, ISTEK);

  assert.equal(sonuc.tur, "kaydedilemedi",
    "kaydedilmemiş bir karar başarı diye bildirildi");
  assert.equal(sonuc.tur === "kaydedilemedi" && sonuc.geriAlindi, true,
    "bellekteki ek geri alınmadı; kullanıcının dosyası kararlı bir hâlde değil");
  assert.equal(durum.disk, KAPILI_KAYNAK, "diske hiçbir şey yazılmadığı hâlde disk değişti");
  assert.equal(durum.bellek, KAPILI_KAYNAK, "bellekteki ek duruyor; dosya yarım kaldı");
  // Kapı listede KALIR: kullanıcı yeniden deneyebilmelidir.
  assert.ok((kabuk.kapilar() ?? []).some((k) => k.kod === "PRB-A01"),
    "kaydedilmemiş karardan sonra kapı listeden düştü");
});

test("KANIT: disk beklenen kaydı vermezse başarı bildirilmez", async () => {
  const { durum, kabuk } = sahteBelge(ISTEK.dosya, KAPILI_KAYNAK);
  // Kaydetme "başarılı" der ama diske BAŞKA bir şey iner (izin · katılımcı · dış araç).
  const bozuk: YazimKabugu = { ...kabuk, async kaydet() { durum.kirli = false; return true; } };
  const sonuc = await kararIsle(new UcusDefteri(), bozuk, ISTEK);

  assert.equal(sonuc.tur, "diskUyuşmazlığı",
    "yalnız bellekte var olan bir kayıt başarı diye bildirildi");
  assert.equal(durum.disk, KAPILI_KAYNAK);
});

test("KANIT: ayrıştırma kırılırsa 'kapı düştü' başarı sayılmaz", async () => {
  const { durum, kabuk } = sahteBelge(ISTEK.dosya, KAPILI_KAYNAK);
  // Ekleme belgeyi bozuyor: eski doğrulama "kapı açık kapılar arasında yok" diyerek
  // BOZUK BELGEYİ başarı sayıyordu (KUSUR-BOZUK-BELGE-BAŞARISI).
  const bozan: YazimKabugu = {
    ...kabuk,
    async ekle(kapi) {
      const satirlar = durum.bellek.split("\n");
      satirlar[kapi.durumSatir] = `${satirlar[kapi.durumSatir]!.slice(0, kapi.durumSutun)}, onay: "yarım`;
      durum.bellek = satirlar.join("\n");
      return true;
    },
  };
  const sonuc = await kararIsle(new UcusDefteri(), bozan, ISTEK);
  assert.notEqual(sonuc.tur, "başarı", "bozuk belge başarı diye kabul edildi");
  // Kusur 2'nin ikinci yarısı: "kapı listede yok" ile "belge ayrıştırılamıyor"
  // AYRI cevaplardır. Bozulan belge uyuşmazlık kılığına da giremez — kullanıcıya
  // dosyanın bozulmuş olabileceği açıkça söylenir.
  assert.equal(sonuc.tur, "belgeAyrıştırılamadı",
    "bozulan belge ayrıştırılamama olarak bildirilmedi; kullanıcı dosyanın bozulduğunu öğrenemez");
  assert.equal(sonuc.tur === "belgeAyrıştırılamadı" && sonuc.evre, "bellek",
    "bozulmanın evresi yanlış bildirildi");
});

test("KANIT: yazım ÖNCESİ ayrıştırılamayan belgede 'kapı yok' DENMEZ ve hiçbir şey yazılmaz", async () => {
  // Ölçülen zincir (Kusur 2): ayrıştırma hatasında kapı listesi boşalır ve eski
  // hat bunu "kapıYok" sanırdı — kullanıcıya "kapın büyük olasılıkla karara
  // bağlanmıştı" denirdi, oysa dosya okunamıyordu.
  const { durum, kabuk } = sahteBelge(ISTEK.dosya, "Bloo( kod: X");   // söz dizimi kırık
  const sonuc = await kararIsle(new UcusDefteri(), kabuk, ISTEK);
  assert.equal(sonuc.tur, "belgeAyrıştırılamadı",
    `kırık belge "${sonuc.tur}" diye bildirildi; iki durum yine tek cevaba indi`);
  assert.equal(sonuc.tur === "belgeAyrıştırılamadı" && sonuc.evre, "yazımÖncesi");
  assert.equal(durum.eklemeSayisi, 0, "ayrıştırılamayan belgeye yine de yazıldı");
});

test("KANIT: disk geri okuması ayrıştırılamıyorsa dosyanın bozulmuş olabileceği söylenir", async () => {
  const { kabuk } = sahteBelge(ISTEK.dosya, KAPILI_KAYNAK);
  const diskiBozuk: YazimKabugu = {
    ...kabuk,
    async disktekiOnay(): Promise<OnayKaniti> { return { tur: "ayrıştırılamadı" }; },
  };
  const sonuc = await kararIsle(new UcusDefteri(), diskiBozuk, ISTEK);
  assert.equal(sonuc.tur, "belgeAyrıştırılamadı",
    "disk ayrıştırılamazken sonuç bozulma olasılığını söylemiyor");
  assert.equal(sonuc.tur === "belgeAyrıştırılamadı" && sonuc.evre, "disk");
});

test("KANIT: bellek doğrulanamıyorsa disk doğru olsa bile başarı bildirilmez", async () => {
  // Bellek ile disk AYRI iki kanıttır ve ikisi de şarttır. Bu kurulumda disk
  // beklenen kaydı taşır, fakat bellekteki belge ayrıştırılamıyor: kullanıcının
  // açık editörü bozuk bir hâlde ve bunu ona söylemek zorundayız.
  const { kabuk } = sahteBelge(ISTEK.dosya, KAPILI_KAYNAK);
  const bellegiBozuk: YazimKabugu = {
    ...kabuk,
    bellektekiOnay(): OnayKaniti { throw new Error("bellekteki belge ayrıştırılamıyor"); },
    async disktekiOnay(): Promise<OnayKaniti> {
      return { tur: "değer", onay: onayKaydiMetni(ISTEK.damga, ISTEK.gun, ISTEK.not) };
    },
  };
  const sonuc = await kararIsle(new UcusDefteri(), bellegiBozuk, ISTEK);
  assert.equal(sonuc.tur, "bellekUyuşmazlığı",
    "bellek kanıtı atlandı; yalnız disk kanıtına dayanan başarı bildirildi");

  // Bellek sessizce YANLIŞ bir değer verse de aynı hüküm geçerlidir.
  // Belge TAZE kurulur: birinci koşum kapıyı zaten yazmış olurdu.
  const { kabuk: taze } = sahteBelge(ISTEK.dosya, KAPILI_KAYNAK);
  const bellegiBayat: YazimKabugu = {
    ...taze,
    bellektekiOnay(): OnayKaniti { return { tur: "değer", onay: "onaylandı — 2020-01-01" }; },
    async disktekiOnay(): Promise<OnayKaniti> {
      return { tur: "değer", onay: onayKaydiMetni(ISTEK.damga, ISTEK.gun, ISTEK.not) };
    },
  };
  const ikinci = await kararIsle(new UcusDefteri(), bellegiBayat, ISTEK);
  assert.equal(ikinci.tur, "bellekUyuşmazlığı",
    "bellekteki değer beklenen karar metnine eşit değilken başarı bildirildi");
});

test("KANIT: applyEdit reddedilirse açık hata doğar ve kaydetme HİÇ denenmez", async () => {
  const { durum, kabuk } = sahteBelge(ISTEK.dosya, KAPILI_KAYNAK);
  const reddeden: YazimKabugu = { ...kabuk, async ekle() { return false; } };
  const sonuc = await kararIsle(new UcusDefteri(), reddeden, ISTEK);
  assert.equal(sonuc.tur, "uygulanamadı");
  assert.equal(durum.kaydetmeSayisi, 0, "reddedilen düzenlemeden sonra yine kaydedildi");
});

test("KANIT: reddedilen söz sessiz kalmaz, açık hataya çevrilir", async () => {
  const { kabuk } = sahteBelge(ISTEK.dosya, KAPILI_KAYNAK);
  const patlayan: YazimKabugu = {
    ...kabuk, async ekle() { throw new Error("dosya kilitli"); },
  };
  const sonuc = await kararIsle(new UcusDefteri(), patlayan, ISTEK);
  assert.equal(sonuc.tur, "uygulanamadı");
  assert.equal(sonuc.tur === "uygulanamadı" && sonuc.neden, "dosya kilitli",
    "reddedilen sözün nedeni kullanıcıya taşınmadı");
});

test("KANIT: başarı yolu BİR uygulama, BİR kaydetme ve BİR hedefli disk okuması yapar", async () => {
  const { durum, kabuk } = sahteBelge(ISTEK.dosya, KAPILI_KAYNAK);
  let diskOkuma = 0;
  const sayan: YazimKabugu = {
    ...kabuk,
    async disktekiOnay(kod) { diskOkuma += 1; return kabuk.disktekiOnay(kod); },
  };
  const sonuc = await kararIsle(new UcusDefteri(), sayan, ISTEK);
  assert.equal(sonuc.tur, "başarı");
  assert.equal(durum.eklemeSayisi, 1, "tek karar için birden çok düzenleme uygulandı");
  assert.equal(durum.kaydetmeSayisi, 1, "tek karar için birden çok kaydetme yapıldı");
  assert.equal(diskOkuma, 1,
    "doğrulama ikinci bir çalışma alanı taramasına dönüşmüş; tek dosya okunmalıydı");
});

// ── E · YARIŞ ÖLÇÜMÜ (Kusur 4): doğrulama bayat önbellekten okuyamaz ────────
//   İddia şuydu: karar yazıldıktan sonraki doğrulama, kaydetme ile önbellek
//   geçersizleşmesi arasında yarışıyor olabilir. Ölçüm iddiayı ÇÜRÜTTÜ: bellek
//   doğrulaması `programAl` üstünden okur ve o önbellek OLAYLA değil belge
//   SÜRÜMÜYLE anahtarlıdır (uri + version). `applyEdit` sürümü eşzamanlı
//   artırır; doğrulama yeni sürümle geldiğinde anahtar tutmaz ve taze ayrıştırma
//   zorunlu olur. Yarışın girebileceği bir pencere yapısal olarak yoktur. Disk
//   ayağı ise önbelleksizdir: `save` çözüldükten sonra dosya ham okunur.

test("YARIŞ: sürüm anahtarlı önbellek, yazım sonrası doğrulamaya bayat ağaç veremez", async () => {
  const { programAl } = await import("../src/onbellek.ts");
  const once = zincir(`Adım( kod: YRS-A01, durum: beklemede, kabul: [ ${ONAYLI_OLCUT} ] )`);
  const kayit = "onaylandı — 2026-07-30";
  const sonra = once.replace("durum: beklemede", `durum: beklemede, onay: ${degerBicimle(kayit)}`);
  const belge = {
    uri: { toString: () => "dosya:///depo/yaris.sar" },
    version: 1,
    getText: () => once,
  };
  type Belge = Parameters<typeof programAl>[0];
  // Isıtma: karar yazılmadan önce önbellek KARARSIZ ağacı taşır.
  assert.equal(adimOnayDegeri(programAl(belge as unknown as Belge)!.bildirimler, "YRS-A01"),
    undefined, "fikstür kararlı başladı; nöbet bayatlığı ölçemez");
  // applyEdit belge sürümünü EŞZAMANLI artırır (VS Code sözleşmesi). Doğrulama
  // yeni sürümle okur: anahtar tutmaz, taze ayrıştırma zorunludur.
  belge.version = 2;
  belge.getText = () => sonra;
  assert.equal(adimOnayDegeri(programAl(belge as unknown as Belge)!.bildirimler, "YRS-A01"),
    kayit, "sürüm arttığı hâlde önbellek bayat ağacı döndürdü; doğrulama yarışı GERÇEK");
  // KONTROL: bayatlığın tek kapısı sürümün artmamış olmasıdır — aynı sürümle
  // metin değişse bile önbellek eski ağacı verir. Yani geçersizleşme bir olaya
  // ya da zamanlayıcıya değil, sürümün kendisine bağlıdır; kaydetme ile
  // yarışacak ikinci bir mekanizma yoktur.
  belge.getText = () => once;
  assert.equal(adimOnayDegeri(programAl(belge as unknown as Belge)!.bildirimler, "YRS-A01"),
    kayit, "önbellek sürüm anahtarlı değil; bu nöbetin çürüttüğü iddia yeniden ölçülmeli");
});

test("UÇUŞ KİLİDİ: hızlı çift tıklamada YALNIZ BİR yazım olur, kilit sonunda açılır", async () => {
  const { durum, kabuk } = sahteBelge(ISTEK.dosya, KAPILI_KAYNAK);
  const defter = new UcusDefteri();
  const [bir, iki] = await Promise.all([
    kararIsle(defter, kabuk, ISTEK),
    kararIsle(defter, kabuk, ISTEK),
  ]);
  const turler = [bir.tur, iki.tur].sort();
  assert.deepEqual(turler, ["başarı", "uçuşta"],
    `iki eşzamanlı çağrı da yazma kapısına ulaştı: ${turler.join(" · ")}`);
  assert.equal(durum.eklemeSayisi, 1, "aynı kapıya iki kez yazıldı");
  assert.equal(defter.ucusSayisi, 0, "kilit açılmadı; kapı bir daha karara bağlanamaz");
});

test("UÇUŞ KİLİDİ: hata yolunda da kilit `finally` ile açılır", async () => {
  const { kabuk } = sahteBelge(ISTEK.dosya, KAPILI_KAYNAK);
  const defter = new UcusDefteri();
  const patlayan: YazimKabugu = { ...kabuk, async ekle() { throw new Error("kilitli"); } };
  await kararIsle(defter, patlayan, ISTEK);
  assert.equal(defter.ucusSayisi, 0, "hatadan sonra kapı kilitli kaldı");
  // Aynı kapı yeniden denenebilmelidir.
  const ikinci = await kararIsle(defter, kabuk, ISTEK);
  assert.equal(ikinci.tur, "başarı", "hatadan sonra kapı bir daha karara bağlanamıyor");
});

test("UÇUŞ KİLİDİ: iki AYRI kapı birbirini bloke etmez", async () => {
  const { durum, kabuk } = sahteBelge(ISTEK.dosya, KAPILI_KAYNAK);
  const defter = new UcusDefteri();
  assert.equal((await kararIsle(defter, kabuk, ISTEK)).tur, "başarı");
  assert.equal((await kararIsle(defter, kabuk, { ...ISTEK, kod: "PRB-A02" })).tur, "başarı");
  assert.ok(durum.disk.includes(`kod: PRB-A01, durum: beklemede, onay:`)
    || durum.disk.includes(`PRB-A01`), "birinci karar kayboldu");
  assert.equal(durum.eklemeSayisi, 2, "iki ayrı kapı için iki yazım beklenirdi");
});

test("KAYIT BİÇİMİ DEĞİŞMEDİ: üç damga ve onay: eki birebir korunur", () => {
  for (const damga of ["onaylandı", "şerhle onaylandı", "reddedildi"]) {
    assert.equal(onayKaydiMetni(damga, "2026-07-29", ""), `${damga} — 2026-07-29`);
    assert.equal(onayKaydiMetni(damga, "2026-07-29", "kısa not"),
      `${damga} — 2026-07-29 · kısa not`);
  }
  assert.equal(onayEkiMetni("onaylandı — 2026-07-29"),
    `, onay: ${degerBicimle("onaylandı — 2026-07-29")}`,
    "onay: eki biçimi değişmiş; diskte yazılı kayıtlarla uyum kaybolur");
});

// ── F · PANEL İLE DURUM ÇUBUĞU AYNI OLAYA BAĞLI ─────────────────────────────

test("SAYAÇ KÖPRÜSÜ: olay her attığında sayaçlar tazelenir, bırakıldıktan sonra atmaz", () => {
  const dinleyiciler: (() => void)[] = [];
  const olay = (d: () => void) => {
    dinleyiciler.push(d);
    return { dispose(): void { dinleyiciler.length = 0; } };
  };
  let tazelendi = 0;
  const abone = sayaclariOlayaBagla(olay, () => { tazelendi += 1; });
  assert.equal(tazelendi, 0, "köprü kurulur kurulmaz tazeleme koştu");
  for (const d of dinleyiciler) d();
  for (const d of dinleyiciler) d();
  assert.equal(tazelendi, 2, "olay attı ama sayaçlar tazelenmedi");
  abone.dispose();
  assert.equal(dinleyiciler.length, 0, "abonelik bırakılmadı; kapanışta ölü dinleyici kalır");
});

test("SAYAÇ KÖPRÜSÜ: üretim panel olayını durum çubuğuna GERÇEKTEN bağlar", () => {
  const kaynak = oku("../src/eklenti.ts");
  assert.ok(/sayaclariOlayaBagla\(/.test(kaynak),
    "panel olayı ile durum çubuğu arasında abonelik yok; panel on dört derken durum çubuğu sıfır kalır");
  assert.ok(/postaKutusu!\.onDegisti\(dinleyici\)/.test(kaynak),
    "köprü Posta Kutusunun değişim olayına bağlanmıyor");
  assert.ok(/durumCubugu\?\.tazele\(\)/.test(kaynak),
    "köprü durum çubuğunu tazelemiyor");
  // İKİNCİ SAYAÇ YASAĞI: sayı yine panelin kendi defterinden türer.
  assert.ok(/kapı: \(\) => postaKutusu\?\.kapiSayisi \?\? 0/.test(kaynak),
    "durum çubuğu kapı sayısını panelin defterinden türetmiyor; ikinci bir sayaç doğmuş");
});

// ── G · ÖLÇÜM SABİT OLAMAZ: canlı yüzey sayısı TÜRETİLİR (2026-08-08 bulgusu) ─
//
//   ÖLÇÜLMÜŞ KUSUR. VIT-POSTA-A03 kabul metni "etkinleşmeden sonra canlı
//   Comments iş parçacığı sayısı SIFIRDIR ve bu bir nöbetle ölçülür" diyor ve
//   `onay-kuyrugu.ts` dosyası kendi yorumunda şu sözleşmeyi ilan ediyordu:
//   "yaratılan eksi elden çıkarılan, her an canlı sayıya eşittir; sızan bir iş
//   parçacığı ancak bu farkta görünür." Ölçüm o sözleşmenin kodda hiç
//   kurulmadığını gösterdi. Üretimdeki tek satır şuydu:
//
//       const olcumuEsitle = (): void => { olcum.canliIsParcacigi = 0; };
//
//   Yani canlı sayı ölçülmüyor, ATANIYORDU; `yaratilanYuzey` ile
//   `eldenCikarilanYuzey` sayaçları ise hiçbir yerde artmıyor ve hiçbir nöbet
//   tarafından okunmuyordu. Üçü de eklentinin dış yüzünden (`onayOlcumleri()`)
//   yayımlandığı hâlde birer sabitti. Sabite bakan bir ölçü hiçbir zaman
//   kırmızıya dönemez; kod bir yüzey sızdırsa bile sayı sıfır kalır ve nöbet
//   yeşil gülümser. Bu, kusuru koruyan nöbetin en sinsi biçimidir: ölçüm
//   yapılmış GİBİ görünür.
//
//   ONARIM. Sayaçlar saf deftere (EtkinKararDefteri) indi ve canlı sayı artık
//   TÜRETİLİR: yaratılan eksi elden çıkarılan. Üretim üç sayacı da o defterden
//   okur. Böylece bir yüzey kapatılmadan ikincisi açılırsa fark büyür ve ihlal
//   sayının kendisinde görünür.

test("ÖLÇÜM: canlı yüzey sayısı TÜRETİLİR — yaratılan eksi elden çıkarılan", () => {
  const defter = new EtkinKararDefteri();
  assert.equal(defter.yaratilanSayi, 0, "defter doğar doğmaz yüzey yaratmış");
  assert.equal(defter.eldenCikarilanSayi, 0);
  assert.equal(defter.canliSayi, 0);

  defter.kur({ dosya: "/depo/a.sar", kod: "A1", satir: 3 }, () => { /* boş */ });
  assert.equal(defter.yaratilanSayi, 1,
    "yaratma sayacı KIMILDAMIYOR; sayaç sabit demektir ve sabit hiçbir şey ölçmez");
  assert.equal(defter.eldenCikarilanSayi, 0);
  assert.equal(defter.canliSayi, 1);

  // İkinci kapı: eski yüzey elden çıkarılır, canlı sayı YİNE bir olur. Kritik
  // olan şudur — canlı sayı bir kalırken YARATMA sayacı ikiye çıkar. Sabit bir
  // ölçüde bu ayrım görünmezdi.
  defter.kur({ dosya: "/depo/b.sar", kod: "B9", satir: 7 }, () => { /* boş */ });
  assert.equal(defter.yaratilanSayi, 2, "ikinci yüzey yaratma sayacına yazılmadı");
  assert.equal(defter.eldenCikarilanSayi, 1, "birinci yüzey elden çıkarılmadı; iş parçacığı sızdı");
  assert.equal(defter.canliSayi, 1, "iki yüzey aynı anda yaşıyor");

  defter.kapat();
  assert.equal(defter.canliSayi, 0);

  // 🎯 AYIRT EDİCİ ÖLÇÜ — bu nöbetin ASIL hükmü budur.
  //
  //   VIT-POSTA-A03 ölçütü YARATMAYI yasaklar, oysa canlı sayı bir YAŞAMA
  //   ölçüsüdür ve iki bambaşka geçmişi aynı sayıyla gösterir: hiç yüzey
  //   yaratmamış bir defter de, iki yüzey yaratıp ikisini de toplamış bir
  //   defter de sıfır canlı yüzey bildirir. Ölçülen tarihsel kusur tam olarak
  //   ikinci cinstendi (açılışta on bir nesne yaratılıyor, sonra toplanıyordu).
  //   Yasağı ölçebilen tek sayı `yaratilanSayi`'dır; bu yüzden vardır.
  const hicYaratmayan = new EtkinKararDefteri();
  assert.equal(hicYaratmayan.canliSayi, defter.canliSayi,
    "iki defterin canlı sayısı ayrıştı; ayırt edici ölçü kurulamaz");
  assert.equal(hicYaratmayan.yaratilanSayi, 0);
  assert.equal(defter.yaratilanSayi, 2,
    "aynı canlı sayıya rağmen geçmişler AYRIŞMIYOR; yaratma yasağı ölçülemez " +
    "hâle gelir ve 'hiç yaratılmadı' ile 'yaratılıp toplandı' aynı görünür");
});

test("ÖLÇÜM: her açılan yüzey kapanır — fark hiçbir dizide biri aşmaz", () => {
  const defter = new EtkinKararDefteri();
  const izlence: number[] = [];
  // Kullanıcının gerçek gezinme dizisi: aç, aç, tazele, sil, aç, kapat.
  defter.kur({ dosya: "/depo/a.sar", kod: "A1", satir: 1 }, () => { /* boş */ });
  izlence.push(defter.canliSayi);
  defter.kur({ dosya: "/depo/a.sar", kod: "A2", satir: 2 }, () => { /* boş */ });
  izlence.push(defter.canliSayi);
  defter.dosyaTazelendi("/depo/a.sar", ["A2"]);        // kapı hâlâ açık
  izlence.push(defter.canliSayi);
  defter.dosyaTazelendi("/depo/a.sar", []);            // kapı karara bağlandı
  izlence.push(defter.canliSayi);
  defter.kur({ dosya: "/depo/b.sar", kod: "B1", satir: 5 }, () => { /* boş */ });
  izlence.push(defter.canliSayi);
  defter.dosyaSilindi("/depo/b.sar");
  izlence.push(defter.canliSayi);

  assert.deepEqual(izlence, [1, 1, 1, 0, 1, 0],
    "gezinme dizisinde canlı sayı sözleşmeden saptı");
  assert.ok(izlence.every((n) => n <= 1),
    "bir an için bile iki yüzey birden yaşadı; Açıklamalar panelinde ölü nesne kalır");
  assert.equal(defter.yaratilanSayi, 3, "üç yüzey açıldı ama sayaç saymadı");
  assert.equal(defter.eldenCikarilanSayi, 3, "açılan her yüzey elden çıkarılmadı");
});

test("ÖLÇÜM: üretim sayaçları SABİT ATAMAZ, saf defterden okur", () => {
  // Ölçü KODA bakar, yoruma değil. Bu dosyanın yerleşik kuralıdır: tarihsel
  // kayıt kusuru ADIYLA anmak zorundadır (yoksa gelecekteki okuyucu neyin neden
  // değiştiğini bilemez), oysa yasak olan şey kusurun KODDA yaşamasıdır. Yorum
  // satırları ayıklanmazsa nöbet kendi açıklamasını suçlu sayar.
  const koduAyikla = (metin: string): string => metin
    .split("\n")
    .filter((s) => {
      const t = s.trimStart();
      return !t.startsWith("//") && !t.startsWith("*") && !t.startsWith("/*");
    })
    .join("\n");
  const kaynak = koduAyikla(oku("../src/onay-kuyrugu.ts"));
  // ① Kusurun kendisi: canlı sayıya sabit atamak.
  assert.ok(!/canliIsParcacigi\s*=\s*\d/.test(kaynak),
    "canlı iş parçacığı sayısı hâlâ bir SABİTE atanıyor; ölçü kırmızıya dönemez " +
    "ve sızan bir yüzey sonsuza dek görünmez kalır");
  // ② Onarımın kendisi: üç sayaç da defterden türer.
  assert.ok(/canliIsParcacigi\s*=\s*etkinYuzey\.canliSayi/.test(kaynak),
    "canlı sayı saf defterden türetilmiyor");
  assert.ok(/yaratilanYuzey\s*=\s*etkinYuzey\.yaratilanSayi/.test(kaynak),
    "yaratma sayacı saf defterden türetilmiyor; dış yüzde yayımlanan sayı sabit kalır");
  assert.ok(/eldenCikarilanYuzey\s*=\s*etkinYuzey\.eldenCikarilanSayi/.test(kaynak),
    "elden çıkarma sayacı saf defterden türetilmiyor");
  // ③ Defter üretimde GERÇEKTEN yaşar: tazeleme ve silme ona uğrar. Uğramazsa
  //    defter bir süs olur ve sayaçlar yine hiç kımıldamaz.
  assert.ok(/etkinYuzey\.dosyaTazelendi\(/.test(kaynak),
    "tazeleme defteri haberdar etmiyor; karara bağlanan kapının yüzeyi açık kalır");
  assert.ok(/etkinYuzey\.dosyaSilindi\(/.test(kaynak),
    "silme defteri haberdar etmiyor; silinen dosyanın yüzeyi sızar");
});

// ── H · GÖRÜNÜR KARAR NESNESİ YASAĞI BÜTÜN ONAY YÜZEYİNİ BAĞLAR ──────────────
//
//   Var olan nöbet `createCommentThread` çağrısını YALNIZ `onay-kuyrugu.ts`
//   içinde arıyordu. Oysa onay yüzeyi beş dosyaya yayılmıştır ve yasak bir
//   dosyanın değil, YÜZEYİN yasağıdır: panel ya da gövde kendi iş parçacığını
//   yaratsaydı ölçülen kusur (açılışta on bir nesne) aynen geri gelir, üstelik
//   nöbet ona hiç bakmadığı için yeşil kalırdı. Kapsam yüzeyin tamamına açıldı.

test("YÜZEY YASAĞI: onay yüzeyinin HİÇBİR dosyası görünür karar nesnesi yaratmaz", () => {
  const dosyalar = [
    "../src/onay-kuyrugu.ts", "../src/onay-cekirdek.ts", "../src/onay-tarayici.ts",
    "../src/posta-kutusu.ts", "../src/posta-govde.ts",
  ];
  const suclular = dosyalar.filter((d) => /createCommentThread\s*\(/.test(oku(d)));
  assert.deepEqual(suclular, [] as string[],
    `onay yüzeyi görünür bir Comments nesnesi yaratıyor: ${suclular.join(", ")} — ` +
    "kullanıcı çizilmediği ÖLÇÜLMÜŞ bir yüzeye gönderilir");
  // Denetleyicinin KENDİSİ yaşamaya devam eder: kimlik kaldırılırsa kullanıcının
  // Açıklamalar menü koşulları düğmeleri bulamaz (kabul ölçütü: kimlik değişmez).
  assert.ok(oku("../src/onay-kuyrugu.ts").includes("createCommentController("),
    "denetleyici tümüyle kaldırılmış; menü koşulları kırılır ve panel yerleşimi sıfırlanır");
});

// ── I · KAPI TANIMA FARKI SIFIRDA TUTULUR (VIT-POSTA-A02 · OZK-02 · OZK-08) ──
//
//   ÖLÇÜLMÜŞ TARİHÇE. OZK-02 şunu kaydetti: kuyruk bir kapıyı ancak kabul
//   ölçütünde `founder` sözcüğünden sonraki kırk karakter içinde `onay` sözcüğü
//   de geçiyorsa görüyordu; Founder'ın şart koştuğu on açık kapının yalnız beşi
//   kuyruğa düşüyordu. Görünmeyenler VIT-GRAF-A10, A11, A12 ile VIT-KIMLIK-A01
//   ve A02 idi — yani Founder'ın kararını bekleyen iş, Founder'ın kararı
//   topladığı panelde yoktu. OZK-08 kalıcı yolu seçti: kapı `onayBekler: founder`
//   alanıyla MEKANİK beyan edilir, kabul cümlesi deseni yalnız geçiş yedeğidir.
//
//   BU NÖBET NEYİ TUTAR. Adımın kabul ölçütü "kuyruğun gördüğü kapı sayısı ile
//   Founder'ın şart koştuğu kapı sayısı birebir eşittir; fark sıfırdır" diyor.
//   Farkı bugün açan tek yol, bir kapının YALNIZ düz metin desenine yaslanıp
//   mekanik alanı taşımamasıdır: desen bir gün daha dar bir cümleyle karşılaşır
//   ve kapı sessizce düşer. Bu yüzden ölçü şudur — kuyruğun gördüğü her kapı
//   mekanik beyanını da taşır ve desene BAĞIMLI kapı sayısı sıfırdır.
//
//   VARLIK SINIRI (STR-3). Ölçüm YALNIZ açık araç `_Sarmal` ağacında koşar.
//   Kapalı ürün `_KapaliUrun` bu süitin konusu değildir ve açık aracın nöbeti
//   kapalı ürünün içeriğine bağlanamaz; oradaki ölçüm kendi varlığının işidir.

test("KAPI TANIMA: _Sarmal ağacında desene BAĞIMLI kapı yoktur — fark sıfırdır", (t) => {
  const kok = yol("../../..");                       // _Sarmal
  const sarDosyalari = (dizin: string, gorece: string): string[] => {
    const bulunan: string[] = [];
    for (const ad of readdirSync(dizin, { withFileTypes: true })) {
      const altGorece = gorece ? `${gorece}/${ad.name}` : ad.name;
      if (sarKapsamDisi(altGorece)) continue;
      if (ad.isDirectory()) bulunan.push(...sarDosyalari(join(dizin, ad.name), altGorece));
      else if (ad.name.endsWith(".sar")) bulunan.push(join(dizin, ad.name));
    }
    return bulunan;
  };

  const alan = (d: Dugum, ad: string) =>
    d.parametreler.find((p) => p.ad === ad) ?? d.ozellikler.find((p) => p.ad === ad);

  let kuyrukSayisi = 0;
  const deseneBagimli: string[] = [];   // kuyruk görüyor ama mekanik beyanı YOK
  const okunamayan: string[] = [];

  for (const dosya of sarDosyalari(kok, "")) {
    let bildirimler: readonly Dugum[];
    try { bildirimler = ayristir(belirtecle(readFileSync(dosya, "utf8"))).bildirimler; }
    catch { okunamayan.push(dosya); continue; }

    // ① Kuyruğun BUGÜN gördüğü kapılar — üretimdeki tek gözden, ikinci bir
    //    kural evreni kurulmadan.
    const kapilar = onayKapilariTopla(bildirimler);
    kuyrukSayisi += kapilar.length;
    const gorulenKodlar = new Set(kapilar.map((k) => k.kod));

    // ② Aynı Adımlar mekanik beyanı da taşıyor mu?
    const gez = (d: Dugum): void => {
      if (d.ad === "Adım") {
        const kod = alan(d, "kod")?.deger.metin ?? "?";
        if (gorulenKodlar.has(kod)
          && alan(d, "onayBekler")?.deger.metin !== "founder") {
          deseneBagimli.push(`${relative(kok, dosya)}#${kod}`);
        }
      }
      for (const c of d.cocuklar) gez(c);
    };
    for (const b of bildirimler) gez(b);
  }

  assert.deepEqual(okunamayan, [] as string[],
    `_Sarmal ağacında ayrıştırılamayan .sar var; kapı ölçümü eksik koşar: ${okunamayan.join(", ")}`);

  assert.deepEqual(deseneBagimli, [] as string[],
    "Bu kapılar kuyruğa YALNIZ kabul cümlesi deseniyle giriyor ve mekanik " +
    "`onayBekler: founder` beyanını taşımıyor: " + deseneBagimli.join(", ") +
    " — desen bir geçiş yedeğidir (OZK-08); daha dar bir cümle yazıldığı gün bu " +
    "kapı sessizce kuyruktan düşer ve OZK-02'de ölçülen kusur geri gelir.");

  // Küme boşsa bu bir kusur DEĞİLDİR (Founder kapıları onayladıkça sayı düşer),
  // fakat gizlenmez de: okuyan kişi eşitliğin kaç kapı üstünde doğrulandığını
  // bilmelidir, yoksa yeşil ışık ölçülenden fazlasını ima eder.
  t.diagnostic(kuyrukSayisi > 0
    ? `_Sarmal ağacında ${kuyrukSayisi} açık kapı ölçüldü; hepsi mekanik beyanlıdır`
    : "_Sarmal ağacında bekleyen kapı yok — özellik boş küme üstünde doğrulandı");
});

// ═══════════════════════════════════════════════════════════════════════════
// J · `onayBekler` ONAYLA BİRLİKTE KALKAR (Founder hükmü · 2026-08-29)
//
//   ÖLÇÜLMÜŞ KUSUR. Founder canlı pencerede Onaylar panelinden iki kapıyı
//   onayladı, ardından kaynağa döndü ve onaylanmış Adımın hâlâ
//   `onayBekler: founder` alanını taşıdığını gördü. Kuyruk davranışta doğrudur
//   ve onaylanmış kapıyı listeden düşürür; kusur KAYNAĞIN DÜRÜSTLÜĞÜNDEDİR,
//   çünkü `onayBekler` kapının HENÜZ karar beklediğini, `onay` ise kararın
//   VERİLDİĞİNİ ilan eder ve ikisi aynı düğümde durunca aynı olgu iki yerden
//   okunur (ORK-1 ihlali). Sapmayı panelin KENDİ onay eylemi üretiyordu.
//
//   NÖBETİN ERİŞİMİ ÜÇ KATLIDIR. Birinci kat silme aralığının kanıtını ölçer:
//   aralık kaynak metinle örtüşmüyorsa hiç üretilmez. İkinci kat yazım hattını
//   uçtan uca koşturur ve karardan sonra alanın gerçekten kalktığını, dosyanın
//   ayrıştırılabilir kaldığını ve kapının düştüğünü ölçer. Üçüncü kat gerçek
//   `_Sarmal` ağacını tarar ve iki alanı birlikte taşıyan Adım kalmadığını
//   ölçer — hükmün kapsam ölçümü bu kattadır.
// ═══════════════════════════════════════════════════════════════════════════


/** Kanıtlanmış aralığı kaynağa uygular — nöbetler sonucu ağaçla ölçebilsin diye. */
const uygula = (kaynak: string, sonuc: BeklerSilmesi): string => {
  assert.equal(sonuc.tur, "aralık", "silme aralığı üretilmemişken uygulanmaya çalışıldı");
  if (sonuc.tur !== "aralık") return kaynak;
  const satirlar = kaynak.split("\n");
  const s = satirlar[sonuc.aralik.satir]!;
  satirlar[sonuc.aralik.satir] = s.slice(0, sonuc.aralik.baslangic) + s.slice(sonuc.aralik.bitis);
  return satirlar.join("\n");
};

/** Fikstür: mekanik beyanlı kapı; alan satırın ORTASINDA, ardından başka alan var. */
const BEKLEYEN_ORTA = zincir(
  `Adım( kod: MEK-A01, durum: beklemede, onayBekler: founder, öncelik: p1, ne: "🧪 mekanik kapı" )`);
/** Fikstür: alan satırın KUYRUĞUNDA — ardından yalnız satır sonu gelir. */
const BEKLEYEN_KUYRUK = zincir(
  `Adım( kod: MEK-A02, durum: beklemede, ne: "🧪 kuyrukta beyan", onayBekler: founder,`,
  `        öncelik: p1 )`);
/** Fikstür: alan listenin SONUNDA — ardından virgül değil kapanış geliyor. */
const BEKLEYEN_SON = zincir(
  `Adım( kod: MEK-A03, durum: beklemede, ne: "🧪 son alan", onayBekler: founder )`);
/** Fikstür: alan `durum`un HEMEN ARDINDAN geliyor ve listenin son alanı — silme,
 *  eklemenin yapılacağı noktadan başlar ve iki düzenleme birbirine değer. */
const BEKLEYEN_BITISIK = zincir(
  `Adım( kod: MEK-A05, ne: "🧪 bitişik alan", durum: beklemede, onayBekler: founder )`);
/** Fikstür: değer TIRNAKLI yazılmış — bitiş hesaplanırsa iki karakter şaşar. */
const BEKLEYEN_TIRNAKLI = zincir(
  `Adım( kod: MEK-A04, durum: beklemede, ne: "🧪 tırnaklı beyan", onayBekler: "founder", öncelik: p1 )`);

/** Bir kaynaktaki tek kapının bekler kaydı ve o kaydın yaşadığı satır metni. */
function beklerDeneyi(kaynak: string): { kapi: OnayKapisi; satir: string } {
  const [kapi] = kapilar(kaynak);
  assert.ok(kapi, "fikstür kapı üretmedi; nöbet boş küme üstünde koşuyor");
  assert.ok(kapi.bekler, "kapı mekanik beyanın ayrıştırıcı kaydını taşımıyor");
  return { kapi: kapi!, satir: kaynak.split("\n")[kapi!.bekler!.satir]! };
}

test("BEKLER SİLME: satır ortasındaki alan, ayırıcı virgülüyle birlikte kanıtlanır", () => {
  const { kapi, satir } = beklerDeneyi(BEKLEYEN_ORTA);
  const sonuc = beklerSilmeAraligi(satir, kapi.bekler);
  assert.equal(sonuc.tur, "aralık", "meşru bir alanda silme aralığı üretilmedi");
  assert.equal(sonuc.tur === "aralık" && sonuc.silinecek, "onayBekler: founder, ",
    "silinecek dilim alanın kendisi ve TEK ayırıcısı değil; komşu alanlara taşıyor");
  // Silme uygulandığında dosya hâlâ ayrıştırılır ve komşu alanlar yerindedir.
  const sonrasi = uygula(BEKLEYEN_ORTA, sonuc);
  assert.ok(sonrasi.includes("durum: beklemede, öncelik: p1"),
    "komşu alanlar birleşmedi ya da ayırıcı kayboldu");
  assert.equal(adimBeklerDegeri(bildirimler(sonrasi), "MEK-A01"), undefined,
    "alan silindiği hâlde ağaçta hâlâ okunuyor");
});

test("BEKLER SİLME: satır kuyruğundaki alan geride boşluk artığı bırakmaz", () => {
  const { kapi, satir } = beklerDeneyi(BEKLEYEN_KUYRUK);
  const sonuc = beklerSilmeAraligi(satir, kapi.bekler);
  assert.equal(sonuc.tur, "aralık");
  assert.equal(sonuc.tur === "aralık" && sonuc.silinecek, " onayBekler: founder,",
    "kuyruktaki alan silinirken önündeki ayırıcı boşluk geride kaldı");
  const sonrasi = uygula(BEKLEYEN_KUYRUK, sonuc);
  assert.ok(!/[ \t]+$/m.test(sonrasi), "silme geride sondaki boşluk bıraktı");
  assert.equal(adimBeklerDegeri(bildirimler(sonrasi), "MEK-A02"), undefined);
});

test("BEKLER SİLME: listenin SON alanında ayırıcı önden alınır", () => {
  const { kapi, satir } = beklerDeneyi(BEKLEYEN_SON);
  const sonuc = beklerSilmeAraligi(satir, kapi.bekler);
  assert.equal(sonuc.tur, "aralık");
  assert.equal(sonuc.tur === "aralık" && sonuc.silinecek, ", onayBekler: founder",
    "son alan silinirken kendinden ÖNCEKİ ayırıcı alınmadı; çift virgül ya da " +
    "eksik virgül dosyayı ayrıştırılamaz hâle getirir");
  const sonrasi = uygula(BEKLEYEN_SON, sonuc);
  assert.equal(adimBeklerDegeri(bildirimler(sonrasi), "MEK-A03"), undefined);
});

test("BEKLER SİLME: TIRNAKLI değerde bitiş hesaplanmaz, kaynaktan kanıtlanır", () => {
  // Bu, ekleme noktasını bozan tuzağın kaldırma yüzündeki ikizidir: bitiş
  // `sütun + metin.uzunluk` diye hesaplansaydı kapanış tırnağı geride kalır ve
  // dosya söz dizimini kaybederdi. Nöbet bunu hem dilimle hem ayrıştırmayla ölçer.
  const { kapi, satir } = beklerDeneyi(BEKLEYEN_TIRNAKLI);
  const sonuc = beklerSilmeAraligi(satir, kapi.bekler);
  assert.equal(sonuc.tur, "aralık", "tırnaklı değerde silme aralığı üretilmedi");
  assert.equal(sonuc.tur === "aralık" && sonuc.silinecek, `onayBekler: "founder", `,
    "tırnaklı değerin kapanış tırnağı silme aralığının dışında kaldı");
  const sonrasi = uygula(BEKLEYEN_TIRNAKLI, sonuc);
  assert.doesNotThrow(() => bildirimler(sonrasi),
    "tırnaklı değerin silinmesi belgeyi bozdu");
  assert.equal(adimBeklerDegeri(bildirimler(sonrasi), "MEK-A04"), undefined);
});

test("BEKLER SİLME: kayan kayıt kaynağa uymuyorsa aralık ÜRETİLMEZ", () => {
  const { kapi, satir } = beklerDeneyi(BEKLEYEN_ORTA);
  const kaymis: BeklerKaydi = { ...kapi.bekler!, adSutun: kapi.bekler!.adSutun + 2 };
  const sonuc = beklerSilmeAraligi(satir, kaymis);
  assert.equal(sonuc.tur, "doğrulanamadı",
    "kayan kayıt için silme aralığı üretildi; silme komşu alanın içine taşardı");
});

test("BEKLER SİLME: NFC olmayan (NFD) satırda silme DURUR", () => {
  const { kapi, satir } = beklerDeneyi(BEKLEYEN_ORTA);
  const nfd = satir.normalize("NFD");
  assert.notEqual(nfd, satir, "fikstür NFD'de farklılaşmıyor; nöbet ölçmüyor");
  assert.equal(beklerSilmeAraligi(nfd, kapi.bekler).tur, "doğrulanamadı",
    "iki konum sistemi ayrışmışken silme yapıldı; kaymış aralık sahte-geçti");
});

test("BEKLER SİLME: alan yoksa silinecek de yoktur — desenle tanınan kapı yazılabilir", () => {
  const [kapi] = kapilar(KAPILI_KAYNAK);
  assert.equal(kapi!.bekler, undefined, "desenle tanınan kapıda mekanik kayıt doğmuş");
  assert.equal(beklerSilmeAraligi("her neyse", undefined).tur, "yok");
});

test("YAZIM: karar yazılınca `onayBekler` alanı KALKAR ve dosya ayrıştırılabilir kalır", async () => {
  const { durum, kabuk } = sahteBelge("/depo/plan/mek.sar", BEKLEYEN_ORTA);
  const sonuc = await kararIsle(new UcusDefteri(), kabuk,
    { ...ISTEK, dosya: "/depo/plan/mek.sar", kod: "MEK-A01" });

  assert.equal(sonuc.tur, "başarı", `karar "${sonuc.tur}" ile bitti`);
  const kayit = onayKaydiMetni(ISTEK.damga, ISTEK.gun, ISTEK.not);
  assert.equal(adimOnayDegeri(bildirimler(durum.disk), "MEK-A01"), kayit,
    "karar diske inmedi");
  // HÜKMÜN KENDİSİ: bekleme ilanı kalkmış olmalıdır.
  assert.equal(adimBeklerDegeri(bildirimler(durum.disk), "MEK-A01"), undefined,
    "onay yazıldı fakat `onayBekler` alanı duruyor; sapmayı panelin kendi eylemi üretiyor");
  assert.equal(durum.bellek, durum.disk, "bellek ile disk ayrıştı");
  // Kapı düştü: ne mekanik beyan ne de yazılmamış karar kaldı.
  assert.equal(kapilar(durum.disk).length, 0, "karar verilen kapı kuyrukta duruyor");
  // Karar TEK satıra dokundu; silme ikinci bir satırı kirletmedi.
  assert.equal(degisenSatir(BEKLEYEN_ORTA, durum.disk), 1,
    "karar bir satırdan fazlasını değiştirdi");
});

test("YAZIM: TIRNAKLI beyanda da alan kalkar ve belge bozulmaz", async () => {
  const { durum, kabuk } = sahteBelge("/depo/plan/tirnakli-beyan.sar", BEKLEYEN_TIRNAKLI);
  const sonuc = await kararIsle(new UcusDefteri(), kabuk,
    { ...ISTEK, dosya: "/depo/plan/tirnakli-beyan.sar", kod: "MEK-A04" });
  assert.equal(sonuc.tur, "başarı", `tırnaklı beyanda karar "${sonuc.tur}" ile bitti`);
  assert.doesNotThrow(() => bildirimler(durum.disk), "tırnaklı beyan belgeyi bozdu");
  assert.equal(adimBeklerDegeri(bildirimler(durum.disk), "MEK-A04"), undefined);
});

test("YAZIM: silme ekleme noktasına DEĞSE bile tek düzenleme doğru belge üretir", async () => {
  // `durum`un hemen ardından gelen son alanda silme, kendinden önceki virgülü
  // alır ve o virgül tam da eklemenin yapılacağı noktadadır. İki düzenleme aynı
  // konumda başlarsa sıraları belirsizdir; nöbet üretilen belgeyi ölçer.
  const { durum, kabuk } = sahteBelge("/depo/plan/bitisik.sar", BEKLEYEN_BITISIK);
  const sonuc = await kararIsle(new UcusDefteri(), kabuk,
    { ...ISTEK, dosya: "/depo/plan/bitisik.sar", kod: "MEK-A05" });
  assert.equal(sonuc.tur, "başarı", `bitişik düzenlemede karar "${sonuc.tur}" ile bitti`);
  assert.doesNotThrow(() => bildirimler(durum.disk), "bitişik düzenleme belgeyi bozdu");
  const agac = bildirimler(durum.disk);
  assert.equal(adimOnayDegeri(agac, "MEK-A05"),
    onayKaydiMetni(ISTEK.damga, ISTEK.gun, ISTEK.not), "karar yazılmadı");
  assert.equal(adimBeklerDegeri(agac, "MEK-A05"), undefined, "bekleme ilanı duruyor");
  // `durum` değeri kararın altında kalmadı: kayıt onun YANINA yazıldı.
  assert.ok(durum.disk.includes(`durum: beklemede, onay: `),
    `karar durum değerinin yanına yazılmadı: ${durum.disk.split("\n")[3]}`);
});

test("YAZIM: silme aralığı kanıtlanamıyorsa HİÇBİR ŞEY yazılmaz", async () => {
  const { durum, kabuk } = sahteBelge("/depo/plan/mek.sar", BEKLEYEN_ORTA);
  // Kaynak satırı ayrıştırıcının bildirdiği konumdan iki karakter kaydırılmış
  // gibi okutulur: kanıt zinciri kopar ve yazım hattı durmak zorundadır.
  const kaydiran: YazimKabugu = {
    ...kabuk,
    satirMetni: (satir) => {
      const ham = durum.bellek.split("\n")[satir];
      return ham === undefined ? undefined : ham.replace("onayBekler: founder", "onayBeKLer= founder");
    },
  };
  const sonuc = await kararIsle(new UcusDefteri(), kaydiran,
    { ...ISTEK, dosya: "/depo/plan/mek.sar", kod: "MEK-A01" });
  assert.equal(sonuc.tur, "beklerAlanıKaldırılamadı",
    `kanıtsız silme "${sonuc.tur}" ile bitti; ya dosya bozuldu ya hata yanlış konuştu`);
  assert.equal(durum.eklemeSayisi, 0, "kanıtlanamayan silmeye rağmen yazıldı");
  assert.equal(durum.bellek, BEKLEYEN_ORTA, "bellekteki metin değişti");
  assert.equal(durum.disk, BEKLEYEN_ORTA, "diskteki metin değişti");
});

test("YAZIM: alan yazımdan SONRA hâlâ duruyorsa BAŞARI bildirilmez", async () => {
  // Kabuk kararı yazar fakat bekleme ilanını bırakır — onarım sökülürse üretimin
  // kendisi tam olarak böyle davranır. Kanıt zinciri bunu yakalamak zorundadır.
  const { durum, kabuk } = sahteBelge("/depo/plan/mek.sar", BEKLEYEN_ORTA);
  const yarim: YazimKabugu = {
    ...kabuk,
    ekle: (kapi, ek) => kabuk.ekle(kapi, ek),      // silme aralığı bilerek DÜŞÜRÜLÜR
  };
  const sonuc = await kararIsle(new UcusDefteri(), yarim,
    { ...ISTEK, dosya: "/depo/plan/mek.sar", kod: "MEK-A01" });
  assert.equal(sonuc.tur, "beklerAlanıKaldırılamadı",
    "karar yazılıp bekleme ilanı kalmışken başarı bildirildi; hüküm ölçülmüyor");
  assert.equal(adimBeklerDegeri(bildirimler(durum.bellek), "MEK-A01"), "founder",
    "deney kurulumu tutmadı; nöbet ölçmek istediği hâli üretmedi");
});

test("GERİ ALMA: kaydetme başarısızsa ekleme DE silme DE geri alınır", async () => {
  const { durum, kabuk } = sahteBelge("/depo/plan/mek.sar", BEKLEYEN_ORTA, { kaydetBasarili: false });
  const sonuc = await kararIsle(new UcusDefteri(), kabuk,
    { ...ISTEK, dosya: "/depo/plan/mek.sar", kod: "MEK-A01" });
  assert.equal(sonuc.tur, "kaydedilemedi");
  assert.equal(sonuc.tur === "kaydedilemedi" && sonuc.geriAlindi, true);
  assert.equal(durum.bellek, BEKLEYEN_ORTA,
    "geri alma yalnız eklemeyi kaldırdı; silinen alan geri gelmedi ve kullanıcının " +
    "dosyası kararsız bir hâlde bırakıldı");
  assert.equal(durum.disk, BEKLEYEN_ORTA);
});

test("ÇİFT BEYAN: _Sarmal ağacında `onay` ile `onayBekler` birlikte taşıyan Adım yoktur", (t) => {
  const kok = yol("../../..");                       // _Sarmal
  const sarDosyalari = (dizin: string, gorece: string): string[] => {
    const bulunan: string[] = [];
    for (const ad of readdirSync(dizin, { withFileTypes: true })) {
      const altGorece = gorece ? `${gorece}/${ad.name}` : ad.name;
      if (sarKapsamDisi(altGorece)) continue;
      if (ad.isDirectory()) bulunan.push(...sarDosyalari(join(dizin, ad.name), altGorece));
      else if (ad.name.endsWith(".sar")) bulunan.push(join(dizin, ad.name));
    }
    return bulunan;
  };
  const alan = (d: Dugum, ad: string) =>
    d.parametreler.find((p) => p.ad === ad) ?? d.ozellikler.find((p) => p.ad === ad);

  const ciftBeyanli: string[] = [];
  let adimSayisi = 0;
  for (const dosya of sarDosyalari(kok, "")) {
    let agac: readonly Dugum[];
    try { agac = ayristir(belirtecle(readFileSync(dosya, "utf8"))).bildirimler; }
    catch { continue; }        // bilerek-hatalı örnekler ayrı nöbetin konusudur
    const gez = (d: Dugum): void => {
      if (d.ad === "Adım") {
        adimSayisi += 1;
        if (alan(d, "onay") && alan(d, BEKLER_ALANI)) {
          ciftBeyanli.push(`${relative(kok, dosya)}#${alan(d, "kod")?.deger.metin ?? "?"}`);
        }
      }
      for (const c of d.cocuklar) gez(c);
    };
    for (const b of agac) gez(b);
  }

  assert.deepEqual(ciftBeyanli, [] as string[],
    "Bu Adımlar hem verilmiş kararı hem bekleme ilanını taşıyor: " + ciftBeyanli.join(", ") +
    " — `onayBekler` kapının HENÜZ beklediğini, `onay` ise kararın VERİLDİĞİNİ söyler; " +
    "ikisi birlikte durunca aynı olgu iki yerden okunur ve kaynağa bakan bir insan ya da " +
    "ajan, kararı verilmiş bir kapıyı bekliyor sanır (ORK-1 · Founder hükmü 2026-08-29).");
  t.diagnostic(`_Sarmal ağacında ${adimSayisi} Adım ölçüldü; çift beyanlı yok`);
});

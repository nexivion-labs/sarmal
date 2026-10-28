// ═══════════════════════════════════════════════════════════════════════════
// kabuk-davranis.test.ts — 🛡️ EDİTÖRE BAKAN YARININ DAVRANIŞ NÖBETİ (BKM-DNT-A09)
//
//   Onaylar paneli, onay kuyruğu, Hatırlatıcılar ve Bildirimler dosyaları
//   editör kabuğunu içeri aldığı için birim süiti onları bugüne dek modül olarak
//   hiç yüklememişti; nöbetler kaynak metnini düzenli ifadeyle okuyordu ve dört
//   gerçek davranış hatası bu sınırdan geçerek süiti yeşil bırakıyordu. Bu dosya
//   o dört dosyayı kabuk sahtesiyle (`vscode-sahtesi.ts`) GERÇEKTEN yükler ve
//   davranışlarını kabuğa yaptıkları çağrılardan ölçer.
//
//   İLK DÖRT FİKSTÜR ADIMIN ÖLÇTÜĞÜ DÖRT MUTASYONDUR ve her biri ayrı bir
//   nöbetle öldürülür:
//     ① Onaylar paneli boş gerekçeli kararı durduran dalı kaybederse karar
//        komutu çağrılır → "boş gerekçe" nöbeti kırmızı.
//     ② Kapıya gitme satırı sıfıra inerse komut yanlış satırla çağrılır →
//        "kapıya git satırı" nöbeti kırmızı.
//     ③ Rozet koşulu tersine dönerse dolu panelin rozeti sıfır gösterir →
//        "rozet" nöbeti kırmızı.
//     ④ Hatırlatıcı sayacı kayıt sayısından saparsa rozet ve sayaç ağaçtaki
//        satır sayısından ayrışır → "hatırlatıcı sayacı" nöbeti kırmızı.
//
//   Bu nöbetler kaynak metnini okuyan iddiaların yerini ALMAZ; onlar bilinçli
//   bir sınırdır ve yerinde kalır (Adımın sınır hükmü).
// ═══════════════════════════════════════════════════════════════════════════

import "./dil-kur.ts";
import { kabuk, kabukSifirla, belgeKoy, Uri } from "./kabuk-kur.ts";
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { belirtecle } from "../../cekirdek/src/belirtec.ts";
import { ayristir } from "../../cekirdek/src/ayristirici.ts";
import { onayKapilariTopla, onayKimligi, type OnayKapisi, type KapiKaydi } from "../src/onay-cekirdek.ts";
import type { YuzeyKaydi } from "../src/yuzey-cekirdek.ts";
import { planYolu } from "../../cekirdek/sinama/dogus-agaci.ts";
import { kacisla, notKimligi } from "../src/onay-govde.ts";
import {
  gerekceZorunlu, gerekceArtik, YUZEY_BOS_DURUM, onayBaglamKapiYok,
} from "../src/yuzey-metinleri.ts";

// Kabuğu içeri alan modüller kanca kurulduktan SONRA yüklenir (kabuk-kur.ts).
const { OnayPaneli, onayPaneliKaydi } = await import("../src/onay-paneli.ts");
const { Hatirlaticilar, hatirlaticilarKaydi } = await import("../src/hatirlaticilar.ts");
const { Bildirimler, bildirimlerKaydi } = await import("../src/bildirimler.ts");
const { onayKuyruguKaydi } = await import("../src/onay-kuyrugu.ts");
const { makinistKaydi } = await import("../src/makinist.ts");
const { fikirlerKaydi } = await import("../src/fikirler.ts");
const { GORUNUS_ONAYLAR, GORUNUS_HATIRLATICILAR, GORUNUS_BILDIRIMLER } = await import("../src/yuzey-cekirdek.ts");

const EKLENTI_KOKU = fileURLToPath(new URL("..", import.meta.url));

type SahteBaglam = { subscriptions: { dispose(): unknown }[]; extensionUri: Uri; extension: { packageJSON: unknown } };
const kurulanBaglamlar: SahteBaglam[] = [];

/** Kayıt işlevlerinin istediği en küçük eklenti bağlamı. */
function baglamKur(): SahteBaglam {
  const b: SahteBaglam = { subscriptions: [], extensionUri: Uri.file(EKLENTI_KOKU), extension: { packageJSON: {} } };
  kurulanBaglamlar.push(b);
  return b;
}

beforeEach(() => kabukSifirla());
// Kayıt işlevleri nabız ve geciktirici kurar; eklenti kapanışındaki gibi her
// senaryonun sonunda atılır, yoksa açık kalan zamanlayıcı süreci bekletir.
afterEach(() => {
  for (const b of kurulanBaglamlar.splice(0)) for (const d of b.subscriptions) d.dispose();
});

// ── Fikstür: gerçek Sarmal kaynağından ayrıştırılmış kapılar ────────────────

const ONAYLI_OLCUT = `"Tasarım Founder tarafından onaylanmıştır — onaysız uygulanmaz"`;
const zincir = (...adimlar: string[]): string =>
  `Faz( kod: F1, ad: "deneme dönemi" ) {\n` +
  `  Blok( kod: B1, ad: "deneme işi" ) {\n` +
  `    Katman( kod: KT1, ad: "deneme teknolojisi" ) {\n` +
  adimlar.map((a) => `      ${a}\n`).join("") +
  `    }\n` +
  `  }\n` +
  `}\n`;
const kapilar = (kaynak: string): OnayKapisi[] => onayKapilariTopla(ayristir(belirtecle(kaynak)).bildirimler);
const adim = (kod: string): string =>
  `Adım( kod: ${kod}, onayBekler: founder, durum: beklemede, ne: "🧪 ${kod} karar bekliyor", kabul: [ ${ONAYLI_OLCUT} ] )`;

const DOSYA = "/sahte/proje/is/plan/deneme.sar";
const IKI_KAPI = zincir(adim("A1"), adim("A2"));
const kayitlar = (dosya: string, kaynak: string): KapiKaydi[] => kapilar(kaynak).map((kapi) => ({ dosya, kapi }));

/**
 * Kararın çizildiği yüzeyin sahtesi (PNL-A07 · OZK-13). Onay defteri artık webview kurmaz; karar
 * kademesini Sarmal paneli çizer ve defter yüzeye yalnız "tazele" ile "göster" der. Sahte yüzey bu
 * iki çağrıyı kaydeder; kademenin kendisi defterin `kademeHtml` çıktısından okunur.
 */
interface SahteYuzey { tazelemeler: Array<string | undefined>; gosterimler: number; tazele(o?: string): void; goster(): Promise<void> }
function yuzeyKur(): SahteYuzey {
  return {
    tazelemeler: [], gosterimler: 0,
    tazele(o?: string) { this.tazelemeler.push(o); },
    async goster() { this.gosterimler += 1; },
  };
}

/** Yüzeyine bağlanmış bir Onaylar defteri. */
function panelKur(): { panel: InstanceType<typeof OnayPaneli>; yuzey: SahteYuzey } {
  const panel = new OnayPaneli();
  const yuzey = yuzeyKur();
  panel.yuzeyBagla(yuzey);
  return { panel, yuzey };
}

/** Panel mesaj işleyicisi eşzamansızdır; bütün sözlerin oturmasını bekler. */
const otur = (): Promise<void> => new Promise((r) => setImmediate(r));

/** Kullanıcının bir kapı satırını açması — kutu ve hata satırı yalnız açık kapıda basılır. */
function kapiyiAc(panel: InstanceType<typeof OnayPaneli>, dosya: string, kod: string): void {
  void panel.mesaj({ tur: "aç", kimlik: onayKimligi({ tur: "kapı", dosya, kod }), acik: true, dosya, kod });
}

/**
 * Kutunun yanındaki hata satırının GÖRÜNÜR metni. Satır kademede her zaman durur
 * ve hata yokken `hidden` taşır; bu yüzden metnin varlığı değil görünürlüğü ölçülür.
 */
function gorunurHata(panel: InstanceType<typeof OnayPaneli>, dosya: string, kod: string): string | undefined {
  const kimlik = kacisla(`hata-${notKimligi(dosya, kod)}`);
  const kademe = panel.kademeHtml(dosya, kod);
  assert.ok(kademe, "kapının karar kademesi açık değil; ölçüm boş küme üstünde koşuyor");
  const satir = new RegExp(`<p class="not-hata" id="${kimlik.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}" role="alert"( hidden)?>([^<]*)</p>`, "u")
    .exec(kademe!);
  assert.ok(satir, "açık kapının hata satırı kademede yok; kapı açılmamış olabilir");
  return satir[1] ? undefined : satir[2];
}

// ═══════════════════════════════════════════════════════════════════════════
// ① ONAYLAR PANELİ — BOŞ GEREKÇE KARARI YAZILMAZ
// ═══════════════════════════════════════════════════════════════════════════

test("① boş gerekçe: gerekçe isteyen karar boş ya da yalnız boşluklu kutuyla gelirse karar komutu ÇAĞRILMAZ ve hata kutunun yanında görünür", async () => {
  const { panel } = panelKur();
  panel.yerlestirHepsi(kayitlar(DOSYA, IKI_KAPI));
  const [a1] = kapilar(IKI_KAPI);
  kapiyiAc(panel, DOSYA, a1.kod);
  await otur();
  assert.equal(gorunurHata(panel, DOSYA, a1.kod), undefined, "karar verilmeden hata satırı görünüyor");
  for (const [rol, not] of [["şerh", ""], ["ret", "   "], ["şerh", undefined]] as const) {
    await panel.mesaj({ tur: "kararVer", dosya: DOSYA, kod: a1.kod, satir: a1.satir, rol, not: not as string });
    await otur();
    assert.deepEqual(kabuk.komutCagrilari.filter((c) => c.komut === "sarmal.onayKararVer"), [],
      `${rol} kararı ${JSON.stringify(not)} gerekçeyle karar komutuna ulaştı; boş gerekçe dalı kaybolmuş`);
    assert.equal(gorunurHata(panel, DOSYA, a1.kod), kacisla(gerekceZorunlu()),
      `${rol} kararında gerekçe hatası kutunun yanında görünmedi`);
  }
  // Karşı kanıt: dolu gerekçe AYNI yoldan geçip komuta ulaşır; nöbet her kararı
  // durduran bir panel üstünde yeşil kalamaz.
  await panel.mesaj({ tur: "kararVer", dosya: DOSYA, kod: a1.kod, satir: a1.satir, rol: "şerh", not: "  ölçüm eksik  " });
  await otur();
  const cagri = kabuk.komutCagrilari.filter((c) => c.komut === "sarmal.onayKararVer");
  assert.equal(cagri.length, 1, "geçerli gerekçe karar komutuna ulaşmadı");
  assert.deepEqual(cagri[0].argumanlar, [DOSYA, a1.satir, "A1", "şerhle onaylandı", true, "ölçüm eksik"],
    "karar komutu beklenen argümanlarla çağrılmadı (gerekçe kırpılmış olmalı)");
});

test("① artık gerekçe: düz onayda kutu doluysa yazım durur ve gerekçe atılmaz", async () => {
  const { panel } = panelKur();
  panel.yerlestirHepsi(kayitlar(DOSYA, IKI_KAPI));
  kapiyiAc(panel, DOSYA, "A1");
  await panel.mesaj({ tur: "kararVer", dosya: DOSYA, kod: "A1", satir: 3, rol: "onay", not: "yazdığım gerekçe" });
  await otur();
  assert.equal(kabuk.komutCagrilari.length, 0, "artık gerekçeli düz onay karar komutuna ulaştı");
  assert.equal(gorunurHata(panel, DOSYA, "A1"), kacisla(gerekceArtik()), "artık gerekçe hatası gösterilmedi");
});

test("① başarılı karardan sonra taslak düşer, başarısız karardan sonra yerinde kalır", async () => {
  const { panel } = panelKur();
  panel.yerlestirHepsi(kayitlar(DOSYA, IKI_KAPI));
  const notId = notKimligi(DOSYA, "A1");
  await panel.mesaj({ tur: "taslak", kimlik: notId, metin: "gerekçem" });
  assert.equal(panel.taslakSayisi, 1, "taslak deftere düşmedi");
  kabuk.komutCevaplari.set("sarmal.onayKararVer", () => ({ tur: "hata" }));
  await panel.mesaj({ tur: "kararVer", dosya: DOSYA, kod: "A1", satir: 3, rol: "ret", not: "gerekçem" });
  await otur();
  assert.equal(panel.taslakSayisi, 1, "kanıtlanmamış karar taslağı sildi; kullanıcının metni kayboldu");
  kabuk.komutCevaplari.set("sarmal.onayKararVer", () => ({ tur: "başarı" }));
  await panel.mesaj({ tur: "kararVer", dosya: DOSYA, kod: "A1", satir: 3, rol: "ret", not: "gerekçem" });
  await otur();
  assert.equal(panel.taslakSayisi, 0, "kanıtlı karardan sonra taslak defterde kaldı");
});

// ═══════════════════════════════════════════════════════════════════════════
// ② ONAYLAR PANELİ — KAPIYA GİT SATIRI DEFTERDEN ÇÖZÜLÜR
// ═══════════════════════════════════════════════════════════════════════════

test("② kapıya git: satır seçimi kaynağı kapının GERÇEK satırıyla açtırır", async () => {
  const { panel } = panelKur();
  panel.yerlestirHepsi(kayitlar(DOSYA, IKI_KAPI));
  const [a1, a2] = kapilar(IKI_KAPI);
  assert.ok(a1.satir > 0 && a2.satir > a1.satir,
    "fikstür kapıları sıfırdan büyük ve ayrı satırlarda durmuyor; nöbet sıfır mutasyonunu ayırt edemez");
  for (const k of [a1, a2]) {
    await panel.mesaj({ tur: "kapıSeç", dosya: DOSYA, kod: k.kod });
    await otur();
  }
  assert.deepEqual(
    kabuk.komutCagrilari.filter((c) => c.komut === "sarmal.onayKapisiAc").map((c) => c.argumanlar),
    [[DOSYA, a1.satir, "A1"], [DOSYA, a2.satir, "A2"]],
    "kapıya git satırı kapının defterdeki satırını taşımıyor");
});

test("② kapıya git: defterde olmayan kapı sıfır satırla gider (kod bağlayıcıdır), bağlam kopyası ise susmadan reddedilir", async () => {
  const { panel } = panelKur();
  panel.yerlestirHepsi(kayitlar(DOSYA, IKI_KAPI));
  await panel.mesaj({ tur: "kapıSeç", dosya: DOSYA, kod: "YOK-A9" });
  await panel.mesaj({ tur: "bağlamKopyala", dosya: DOSYA, kod: "YOK-A9" });
  await otur();
  assert.deepEqual(kabuk.komutCagrilari.map((c) => c.argumanlar), [[DOSYA, 0, "YOK-A9"]]);
  assert.deepEqual(kabuk.pano, [], "defterde olmayan kapının bağlamı panoya yazıldı");
  assert.deepEqual(kabuk.uyarilar, [onayBaglamKapiYok("YOK-A9")], "reddin sebebi kullanıcıya söylenmedi");
  await panel.mesaj({ tur: "bağlamKopyala", dosya: DOSYA, kod: "A2" });
  await otur();
  assert.equal(kabuk.pano.length, 1, "var olan kapının bağlamı panoya inmedi");
  const pano: readonly string[] = kabuk.pano;   // deepEqual daraltmasını çözer
  assert.ok(pano[0].includes("A2"), "pano bağlamı kapının kodunu taşımıyor");
});

// ═══════════════════════════════════════════════════════════════════════════
// ③ ONAYLAR PANELİ — ROZET DEFTERİN SAYISINI SÖYLER
// ═══════════════════════════════════════════════════════════════════════════

test("③ sayı: kapı sayısı defterin sayısını söyler, boşalan defter sıfıra iner ve eski sayıda asılı kalmaz", () => {
  // Rozet artık Makinist ağacında yaşar (MakinistAgaci.rozetSayisi); kaynağı bu sayıdır.
  const { panel } = panelKur();
  panel.yerlestirHepsi(kayitlar(DOSYA, IKI_KAPI));
  assert.equal(panel.kapiSayisi, 2, "fikstür iki kapı üretmedi");
  panel.yerlestirDosya("/sahte/ikinci.sar", kapilar(zincir(adim("C1"))));
  assert.equal(panel.kapiSayisi, 3, "ikinci dosyanın kapısı sayıya yansımadı");
  assert.equal(panel.kapilar().length, 3, "ağaç satırları ile sayı ayrıştı");
  panel.yerlestirHepsi([]);
  assert.equal(panel.kapiSayisi, 0);
  assert.equal(panel.kapilar().length, 0, "boşalan defterin ağaç satırları kalktı mı");
});

test("③ kademe defterden beslenir: yüzey sonradan bağlansa da açık kapının kademesi defterdeki kapıyı basar", () => {
  const panel = new OnayPaneli();
  panel.yerlestirHepsi(kayitlar(DOSYA, IKI_KAPI));      // yüzey henüz yok
  assert.equal(panel.kapiyiAc(DOSYA, "A2"), true);
  const kademe = panel.kademeHtml(DOSYA, "A2");
  assert.ok(kademe && kademe.includes(`data-kod="A2"`) && kademe.includes('class="not-metin"'),
    "kademe defterdeki kapıyı basmadı");
  assert.equal(panel.kapiyiAc(DOSYA, "YOK-A9"), false, "defterde olmayan kapı açıldı");
});

test("③ kayıt (OZK-13 · PNL-A07): Onaylar ayrı görünüm kaydetmez ve hiçbir koşulda editörde kart açmaz", async () => {
  const baglam = baglamKur();
  const panel = onayPaneliKaydi(baglam as never);
  assert.equal(kabuk.webviewSaglayicilari.has(GORUNUS_ONAYLAR), false,
    "Onaylar hâlâ kenar çubuğu görünümü kaydediyor");
  assert.ok(panel instanceof OnayPaneli);
  const yuzey = yuzeyKur();
  panel.yuzeyBagla(yuzey);
  panel.yerlestirHepsi(kayitlar(DOSYA, IKI_KAPI));
  assert.equal(await panel.gosterVeAc(DOSYA, "A1"), true);
  assert.equal(kabuk.paneller.length, 0, "kapıyı göstermek editörde bir webview paneli (kart) açtı");
  assert.equal(yuzey.gosterimler, 1, "kapıyı göstermek Sarmal panelini öne almadı");
  assert.deepEqual(yuzey.tazelemeler, [notKimligi(DOSYA, "A1")], "kapı gösterilince odak gerekçe kutusuna gitmiyor");
});

test("③ tek kapı (Founder 2026-10-27): aynı anda yalnız bir kapının karar kademesi açıktır; karara bağlanıp düşen kapının kademesi kapanır", async () => {
  const { panel, yuzey } = panelKur();
  panel.yerlestirHepsi(kayitlar(DOSYA, IKI_KAPI));
  kapiyiAc(panel, DOSYA, "A1");
  assert.ok(panel.kademeHtml(DOSYA, "A1"), "birinci kapının kademesi açılmadı");
  kapiyiAc(panel, DOSYA, "A2");
  assert.equal(panel.kademeHtml(DOSYA, "A1"), undefined, "ikinci kapı açılınca birincinin kademesi açık kaldı");
  assert.ok(panel.kademeHtml(DOSYA, "A2"), "ikinci kapının kademesi açılmadı");
  assert.deepEqual(panel.acikKapi(), { dosya: DOSYA, kod: "A2" });
  // Vazgeçmek kademeyi kapatır ve taslağı silmez.
  await panel.mesaj({ tur: "taslak", kimlik: notKimligi(DOSYA, "A2"), metin: "yarım gerekçe" });
  await panel.mesaj({ tur: "iptal", dosya: DOSYA, kod: "A2" });
  assert.equal(panel.acikKapi(), undefined, "vazgeçiş kademeyi kapatmadı");
  assert.equal(panel.taslakSayisi, 1, "vazgeçiş taslağı sildi");
  assert.deepEqual(kabuk.komutCagrilari.map((c) => c.komut), ["sarmal.onayKararIptal"], "vazgeçiş bildirilmedi");
  // Açık kapı karara bağlanıp defterden düşerse kademe de kapanır.
  kapiyiAc(panel, DOSYA, "A1");
  panel.yerlestirHepsi(kayitlar(DOSYA, zincir(adim("A2"))));
  assert.equal(panel.acikKapi(), undefined, "defterden düşen kapının kademesi açık kaldı");
  assert.ok(yuzey.tazelemeler.length >= 3, "kademe değişimleri yüzeye bildirilmedi");
});

// ═══════════════════════════════════════════════════════════════════════════
// ④ HATIRLATICILAR — SAYAÇ AĞAÇTAKİ SATIRLARDAN TÜRER
// ═══════════════════════════════════════════════════════════════════════════

const PROJE = { kod: "SRM", ad: "Sarmal" };
function kayit(kod: string, dosya: string, satir = 12): YuzeyKaydi {
  return {
    proje: PROJE,
    dosya,
    tani: { duzey: "bilgi", kod, mesaj: `${kod} kaydı`, satir, sutun: 3 },
  } as YuzeyKaydi;
}
const UC_KAYIT = [
  kayit("açık-hatırlatıcı", `/p/${planYolu("a.sar")}`, 4),
  kayit("açık-hatırlatıcı", `/p/${planYolu("a.sar")}`, 9),
  kayit("açık-hatırlatıcı", `/p/${planYolu("b.sar")}`, 2),
];

/** Ağaçtaki yaprak (kayıt) satırlarının sayısı — sağlayıcının kendi gezintisiyle. */
function yaprakSayisi(s: { getChildren(o?: never): unknown[] }): number {
  let n = 0;
  const gez = (o?: unknown): void => {
    const cocuk = s.getChildren(o as never);
    if (o && cocuk.length === 0) n += 1;
    for (const c of cocuk) gez(c);
  };
  gez();
  return n;
}

for (const [ad, Sinif, kaydet, kimlik, bos] of [
  ["Hatırlatıcılar", Hatirlaticilar, hatirlaticilarKaydi, GORUNUS_HATIRLATICILAR, YUZEY_BOS_DURUM.hatırlatıcılar],
  ["Bildirimler", Bildirimler, bildirimlerKaydi, GORUNUS_BILDIRIMLER, YUZEY_BOS_DURUM.bildirimler],
] as const) {
  test(`④ ${ad} sayacı: kayitSayisi, rozet ve ağaçtaki kayıt satırları AYNI sayıyı söyler`, () => {
    const s = new Sinif();
    const gorunum = { badge: undefined as { value: number } | undefined, message: undefined as string | undefined };
    s.gorunum = gorunum as never;
    s.yerlestir(UC_KAYIT);
    assert.equal(yaprakSayisi(s as never), 3, "fikstür ağaçta üç kayıt satırı üretmedi");
    assert.equal(s.kayitSayisi, 3, `${ad} sayacı ${s.kayitSayisi}; ağaçta üç kayıt var`);
    assert.equal(gorunum.badge?.value, 3, `${ad} rozeti sayaçtan ayrıştı`);
    assert.equal(gorunum.message, undefined, "dolu panel boş durum cümlesi gösteriyor");
    s.yerlestir([]);
    assert.equal(s.kayitSayisi, 0);
    assert.equal(gorunum.badge, undefined, "boş panelin rozeti kalkmadı");
    assert.equal(gorunum.message, bos, "boş panel boş durum cümlesini göstermiyor");
  });

  test(`④ ${ad} yinelenen çizim yok: aynı içerik ikinci kez yerleşince ağaç yeniden çizilmez`, () => {
    const s = new Sinif();
    let cizim = 0;
    s.onDidChangeTreeData(() => { cizim += 1; });
    s.yerlestir(UC_KAYIT);
    s.yerlestir(UC_KAYIT.map((k) => ({ ...k })));
    assert.equal(cizim, 1, `aynı içerik ${cizim} çizim üretti; parmak izi güvencesi kaybolmuş`);
    s.yerlestir(UC_KAYIT.slice(1));
    assert.equal(cizim, 2, "değişen içerik çizim üretmedi; parmak izi bir alanı görmüyor");
  });

  test(`④ ${ad} kaydı: ayrı görünüm kurulmaz, boş-durum cümlesi hafif yüz durumunda başlar`, () => {
    const baglam = baglamKur();
    const s = kaydet(baglam as never);
    assert.equal(kabuk.agaclar.length, 0, "kayıt ayrı bir ağaç görünümü kurdu; görünümü yalnız Makinist ağacı kurar");
    assert.equal(s.gorunum?.message, bos, "açılışta boş durum cümlesi yok");
    assert.equal(baglam.subscriptions.length, 0);
    void kimlik;
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// ⑤ MAKİNİST AĞACI — ÜÇ ÜST DÜĞÜM, TEK GÖRÜNÜM (Founder 2026-10-21 · Gözlemler PNL-A09'dan beri Sinyaller'de)
// ═══════════════════════════════════════════════════════════════════════════

test("⑤ Makinist ağacı: tek görünüm, üç üst düğüm (Gözlemler yok); sayılar kaynakların kendi sayacından, alt düğümler kaynağın kendi nesneleridir", () => {
  const baglam = baglamKur();
  const onay = onayPaneliKaydi(baglam as never);
  onay.yerlestirHepsi(kayitlar(DOSYA, IKI_KAPI));
  const htr = hatirlaticilarKaydi(baglam as never);
  const fkr = fikirlerKaydi(baglam as never);
  htr.yerlestir(UC_KAYIT);
  const agac = makinistKaydi(baglam as never, { onayPaneli: onay, hatirlaticilar: htr, fikirler: fkr });
  // Founder 2026-10-21 (dördüncü hüküm): ağaçların kendi TreeView'ü yoktur; Sarmal paneli sağlayıcıyı webview'inde okur.
  assert.equal(kabuk.agaclar.length, 0, "Makinist (ya da başka bir kaynak) kapta kendi ağaç görünümünü kurmamalı: kapta tek görünüm görünür");
  const kokler = agac.getChildren() as Array<{ grup: string }>;
  // PNL-A09 (OZK-14): gözlem kayıtları Makinist'te görünmez; Sinyaller sekmesinin ayrı bölümündedir.
  assert.deepEqual(kokler.map((k) => k.grup), ["onaylar", "hatirlaticilar", "fikirler"], "üst düğümler ya da sıraları değişmiş");
  const aciklama = (k: unknown) => agac.getTreeItem(k).description;
  assert.equal(aciklama(kokler[0]), "2", "Onaylar düğümünün sayısı defterin kapı sayısı değil");
  assert.equal(aciklama(kokler[1]), String(htr.kayitSayisi), "Hatırlatıcılar düğümünün sayısı kaynağın sayacından ayrışmış");
  assert.equal(aciklama(kokler[2]), undefined, "boş Fikirler düğümü sayı basıyor");
  // Onaylar: iki kapı satırı, tıklayınca kapıyı açan komutla.
  const kapilar = agac.getChildren(kokler[0]);
  assert.equal(kapilar.length, 2);
  const kapiOgesi = agac.getTreeItem(kapilar[0]);
  assert.equal(kapiOgesi.command?.command, "sarmal.onayKapisiAc");
  // Hatırlatıcılar: alt düğümler kaynağın kendi nesneleridir (sarmalanmaz) ve satırı kaynak çizer.
  const proje = agac.getChildren(kokler[1])[0]!;
  assert.equal(agac.getTreeItem(proje).contextValue, "sarmalHatirlaticiProjesi");
  assert.ok(agac.getChildren(proje).length > 0, "proje düğümünün çocukları kaynağa devredilmedi");
  // Rozet = kapılar + hatırlatıcılar.
  assert.equal(agac.rozetSayisi, 2 + htr.kayitSayisi);
  // Rozet Sarmal panelinin görünümüne yazılır (panel.ts, panel.test.ts ölçer); ağaç yalnız sayıyı verir.
});

// ═══════════════════════════════════════════════════════════════════════════
// ONAY KUYRUĞU — KOMUT SINIRININ DAVRANIŞI
// ═══════════════════════════════════════════════════════════════════════════

/** Kuyruğu sahte kabukta kurar; komutlar kabuk kaydına düşer. */
function kuyrukKur(): { panel: InstanceType<typeof OnayPaneli>; yuzey: SahteYuzey; komut: (ad: string, ...a: unknown[]) => Promise<unknown> } {
  const { panel, yuzey } = panelKur();
  onayKuyruguKaydi(baglamKur() as never, panel);
  const komut = async (ad: string, ...a: unknown[]): Promise<unknown> => {
    const f = kabuk.komutlar.get(ad);
    assert.ok(f, `${ad} komutu kayda girmedi`);
    return f!(...a);
  };
  return { panel, yuzey, komut };
}

test("kuyruk sınırı: panelden GELMEYEN boş gerekçeli karar da diske dokunmaz ve kullanıcı uyarılır", async () => {
  const { komut } = kuyrukKur();
  belgeKoy(DOSYA, IKI_KAPI);
  const sonuc = await komut("sarmal.onayKararVer", DOSYA, 3, "A1", "reddedildi", true, "  ");
  assert.equal(sonuc, undefined, "boş gerekçeli karar bir sonuç üretti");
  assert.deepEqual(kabuk.duzenlemeler, [], "boş gerekçeli karar düzenleme istedi");
  assert.deepEqual(kabuk.uyarilar, [gerekceZorunlu()], "boş gerekçe uyarısı gösterilmedi");
  // İptal ayrı karşılanır: uyarı değil durum çubuğu notu.
  await komut("sarmal.onayKararVer", DOSYA, 3, "A1", "reddedildi", true, undefined);
  assert.equal(kabuk.uyarilar.length, 1, "iptal bir uyarı penceresi açtı");
  assert.equal(kabuk.durumMesajlari.length, 1, "iptal durum çubuğunda söylenmedi");
  assert.deepEqual(kabuk.duzenlemeler, []);
});

test("kuyruk kapıya git: kapı KODLA çözülür, kaynak kapının satırında önizleme kipinde açılır ve panel satırı açar", async () => {
  const { yuzey, komut } = kuyrukKur();
  belgeKoy(DOSYA, IKI_KAPI);
  const [, a2] = kapilar(IKI_KAPI);
  // Panelden bayat satır gelir (sıfır); kapı yine de kendi satırında bulunur.
  await komut("sarmal.onayKapisiAc", DOSYA, 0, "A2");
  assert.equal(kabuk.gosterilen.length, 1, "kaynak açılmadı");
  assert.deepEqual(kabuk.gosterilen[0], { dosya: DOSYA, secenek: { preview: true, preserveFocus: true } },
    "kaynak önizleme kipinde ve odak panelde kalarak açılmadı");
  assert.equal(kabuk.etkinEditor?.selection.active.line, a2.satir,
    `imleç ${kabuk.etkinEditor?.selection.active.line}. satırda; kapı ${a2.satir}. satırda`);
  assert.equal(yuzey.gosterimler, 0, "panel defterinde olmayan kapı için panel gösterildi");
  assert.equal(kabuk.paneller.length, 0, "kapıya gitmek editörde kart açtı");
});

test("kuyruk kapıya git: kararı verilmiş kapıda kaynak açılmaz ve kullanıcıya söylenir", async () => {
  const { komut } = kuyrukKur();
  // Ayrı yol: açık belgenin kapı okuması belge sürümüyle önbelleklenir ve aynı
  // yoldaki önceki senaryonun kapıları burada okunmamalıdır.
  const karara = "/sahte/proje/is/plan/karara-baglanmis.sar";
  belgeKoy(karara, zincir(
    `Adım( kod: A1, onayBekler: founder, durum: beklemede, onay: "onaylandı — 2026-10-01", ne: "iş", kabul: [ ${ONAYLI_OLCUT} ] )`));
  assert.equal(kapilar(kabuk.belgeler.get(karara)!.metin).length, 0, "fikstür hâlâ kapı üretiyor");
  await komut("sarmal.onayKapisiAc", karara, 3, "A1");
  assert.equal(kabuk.gosterilen.length, 0, "artık beklemeyen kapı için kaynak açıldı");
  assert.equal(kabuk.bilgiler.length, 1, "kapının artık beklemediği söylenmedi");
});

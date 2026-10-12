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
import { kabuk, kabukSifirla, belgeKoy, SahteWebviewGorunusu, Uri } from "./kabuk-kur.ts";
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

/** Çözülmüş bir Onaylar paneli ve onun sahte görünüşü. */
function panelKur(): { panel: InstanceType<typeof OnayPaneli>; gorunum: SahteWebviewGorunusu } {
  const panel = new OnayPaneli();
  const gorunum = new SahteWebviewGorunusu();
  panel.resolveWebviewView(gorunum as never);
  return { panel, gorunum };
}

/** Panel mesaj işleyicisi eşzamansızdır; bütün sözlerin oturmasını bekler. */
const otur = (): Promise<void> => new Promise((r) => setImmediate(r));

/** Panele gönderilen son iç gövdenin HTML metni. */
function sonGovde(gorunum: SahteWebviewGorunusu): string {
  const govdeler = gorunum.gonderilen.filter((m) => (m as { tur?: string }).tur === "gövde");
  assert.ok(govdeler.length > 0, "panel hiç gövde göndermedi; ölçüm boş küme üstünde koşuyor");
  return (govdeler.at(-1) as { html: string }).html;
}

/** Kullanıcının bir kapı satırını açması — kutu ve hata satırı yalnız açık kapıda basılır. */
function kapiyiAc(gorunum: SahteWebviewGorunusu, dosya: string, kod: string): void {
  gorunum.mesajGonder({ tur: "aç", kimlik: onayKimligi({ tur: "kapı", dosya, kod }), acik: true, dosya, kod });
}

/**
 * Kutunun yanındaki hata satırının GÖRÜNÜR metni. Satır gövdede her zaman durur
 * ve hata yokken `hidden` taşır; bu yüzden metnin varlığı değil görünürlüğü ölçülür.
 */
function gorunurHata(gorunum: SahteWebviewGorunusu, dosya: string, kod: string): string | undefined {
  const kimlik = kacisla(`hata-${notKimligi(dosya, kod)}`);
  const satir = new RegExp(`<p class="not-hata" id="${kimlik.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}" role="alert"( hidden)?>([^<]*)</p>`, "u")
    .exec(sonGovde(gorunum));
  assert.ok(satir, "açık kapının hata satırı gövdede yok; kapı açılmamış olabilir");
  return satir[1] ? undefined : satir[2];
}

// ═══════════════════════════════════════════════════════════════════════════
// ① ONAYLAR PANELİ — BOŞ GEREKÇE KARARI YAZILMAZ
// ═══════════════════════════════════════════════════════════════════════════

test("① boş gerekçe: gerekçe isteyen karar boş ya da yalnız boşluklu kutuyla gelirse karar komutu ÇAĞRILMAZ ve hata kutunun yanında görünür", async () => {
  const { panel, gorunum } = panelKur();
  panel.yerlestirHepsi(kayitlar(DOSYA, IKI_KAPI));
  const [a1] = kapilar(IKI_KAPI);
  kapiyiAc(gorunum, DOSYA, a1.kod);
  await otur();
  assert.equal(gorunurHata(gorunum, DOSYA, a1.kod), undefined, "karar verilmeden hata satırı görünüyor");
  for (const [rol, not] of [["şerh", ""], ["ret", "   "], ["şerh", undefined]] as const) {
    gorunum.gonderilen.length = 0;
    gorunum.mesajGonder({ tur: "kararVer", dosya: DOSYA, kod: a1.kod, satir: a1.satir, rol, not });
    await otur();
    assert.deepEqual(kabuk.komutCagrilari.filter((c) => c.komut === "sarmal.onayKararVer"), [],
      `${rol} kararı ${JSON.stringify(not)} gerekçeyle karar komutuna ulaştı; boş gerekçe dalı kaybolmuş`);
    assert.equal(gorunurHata(gorunum, DOSYA, a1.kod), kacisla(gerekceZorunlu()),
      `${rol} kararında gerekçe hatası kutunun yanında görünmedi`);
  }
  // Karşı kanıt: dolu gerekçe AYNI yoldan geçip komuta ulaşır; nöbet her kararı
  // durduran bir panel üstünde yeşil kalamaz.
  gorunum.mesajGonder({ tur: "kararVer", dosya: DOSYA, kod: a1.kod, satir: a1.satir, rol: "şerh", not: "  ölçüm eksik  " });
  await otur();
  const cagri = kabuk.komutCagrilari.filter((c) => c.komut === "sarmal.onayKararVer");
  assert.equal(cagri.length, 1, "geçerli gerekçe karar komutuna ulaşmadı");
  assert.deepEqual(cagri[0].argumanlar, [DOSYA, a1.satir, "A1", "şerhle onaylandı", true, "ölçüm eksik"],
    "karar komutu beklenen argümanlarla çağrılmadı (gerekçe kırpılmış olmalı)");
});

test("① artık gerekçe: düz onayda kutu doluysa yazım durur ve gerekçe atılmaz", async () => {
  const { panel, gorunum } = panelKur();
  panel.yerlestirHepsi(kayitlar(DOSYA, IKI_KAPI));
  kapiyiAc(gorunum, DOSYA, "A1");
  gorunum.mesajGonder({ tur: "kararVer", dosya: DOSYA, kod: "A1", satir: 3, rol: "onay", not: "yazdığım gerekçe" });
  await otur();
  assert.equal(kabuk.komutCagrilari.length, 0, "artık gerekçeli düz onay karar komutuna ulaştı");
  assert.equal(gorunurHata(gorunum, DOSYA, "A1"), kacisla(gerekceArtik()), "artık gerekçe hatası gösterilmedi");
});

test("① başarılı karardan sonra taslak düşer, başarısız karardan sonra yerinde kalır", async () => {
  const { panel, gorunum } = panelKur();
  panel.yerlestirHepsi(kayitlar(DOSYA, IKI_KAPI));
  const notId = notKimligi(DOSYA, "A1");
  gorunum.mesajGonder({ tur: "taslak", kimlik: notId, metin: "gerekçem" });
  assert.equal(panel.taslakSayisi, 1, "taslak deftere düşmedi");
  kabuk.komutCevaplari.set("sarmal.onayKararVer", () => ({ tur: "hata" }));
  gorunum.mesajGonder({ tur: "kararVer", dosya: DOSYA, kod: "A1", satir: 3, rol: "ret", not: "gerekçem" });
  await otur();
  assert.equal(panel.taslakSayisi, 1, "kanıtlanmamış karar taslağı sildi; kullanıcının metni kayboldu");
  kabuk.komutCevaplari.set("sarmal.onayKararVer", () => ({ tur: "başarı" }));
  gorunum.mesajGonder({ tur: "kararVer", dosya: DOSYA, kod: "A1", satir: 3, rol: "ret", not: "gerekçem" });
  await otur();
  assert.equal(panel.taslakSayisi, 0, "kanıtlı karardan sonra taslak defterde kaldı");
});

// ═══════════════════════════════════════════════════════════════════════════
// ② ONAYLAR PANELİ — KAPIYA GİT SATIRI DEFTERDEN ÇÖZÜLÜR
// ═══════════════════════════════════════════════════════════════════════════

test("② kapıya git: satır seçimi kaynağı kapının GERÇEK satırıyla açtırır", async () => {
  const { panel, gorunum } = panelKur();
  panel.yerlestirHepsi(kayitlar(DOSYA, IKI_KAPI));
  const [a1, a2] = kapilar(IKI_KAPI);
  assert.ok(a1.satir > 0 && a2.satir > a1.satir,
    "fikstür kapıları sıfırdan büyük ve ayrı satırlarda durmuyor; nöbet sıfır mutasyonunu ayırt edemez");
  for (const k of [a1, a2]) {
    gorunum.mesajGonder({ tur: "kapıSeç", dosya: DOSYA, kod: k.kod });
    await otur();
  }
  assert.deepEqual(
    kabuk.komutCagrilari.filter((c) => c.komut === "sarmal.onayKapisiAc").map((c) => c.argumanlar),
    [[DOSYA, a1.satir, "A1"], [DOSYA, a2.satir, "A2"]],
    "kapıya git satırı kapının defterdeki satırını taşımıyor");
});

test("② kapıya git: defterde olmayan kapı sıfır satırla gider (kod bağlayıcıdır), bağlam kopyası ise susmadan reddedilir", async () => {
  const { panel, gorunum } = panelKur();
  panel.yerlestirHepsi(kayitlar(DOSYA, IKI_KAPI));
  gorunum.mesajGonder({ tur: "kapıSeç", dosya: DOSYA, kod: "YOK-A9" });
  gorunum.mesajGonder({ tur: "bağlamKopyala", dosya: DOSYA, kod: "YOK-A9" });
  await otur();
  assert.deepEqual(kabuk.komutCagrilari.map((c) => c.argumanlar), [[DOSYA, 0, "YOK-A9"]]);
  assert.deepEqual(kabuk.pano, [], "defterde olmayan kapının bağlamı panoya yazıldı");
  assert.deepEqual(kabuk.uyarilar, [onayBaglamKapiYok("YOK-A9")], "reddin sebebi kullanıcıya söylenmedi");
  gorunum.mesajGonder({ tur: "bağlamKopyala", dosya: DOSYA, kod: "A2" });
  await otur();
  assert.equal(kabuk.pano.length, 1, "var olan kapının bağlamı panoya inmedi");
  const pano: readonly string[] = kabuk.pano;   // deepEqual daraltmasını çözer
  assert.ok(pano[0].includes("A2"), "pano bağlamı kapının kodunu taşımıyor");
});

// ═══════════════════════════════════════════════════════════════════════════
// ③ ONAYLAR PANELİ — ROZET DEFTERİN SAYISINI SÖYLER
// ═══════════════════════════════════════════════════════════════════════════

test("③ rozet: dolu panel kapı sayısını gösterir, boşalan panel sıfıra iner ve eski sayıda asılı kalmaz", () => {
  const { panel, gorunum } = panelKur();
  panel.yerlestirHepsi(kayitlar(DOSYA, IKI_KAPI));
  assert.equal(panel.kapiSayisi, 2, "fikstür iki kapı üretmedi");
  assert.equal(gorunum.badge?.value, 2, `dolu panelin rozeti ${gorunum.badge?.value}; iki olmalıydı`);
  panel.yerlestirDosya("/sahte/ikinci.sar", kapilar(zincir(adim("C1"))));
  assert.equal(gorunum.badge?.value, 3, "ikinci dosyanın kapısı rozete yansımadı");
  panel.yerlestirHepsi([]);
  assert.equal(panel.kapiSayisi, 0);
  assert.equal(gorunum.badge?.value, 0,
    "boşalan panelin rozeti sıfıra çekilmedi; eski sayı ekranda asılı kalır");
});

test("③ rozet ve gövde aynı defterden beslenir: görünüş yeniden çözüldüğünde ikisi birlikte kurulur", () => {
  const panel = new OnayPaneli();
  panel.yerlestirHepsi(kayitlar(DOSYA, IKI_KAPI));      // görünüş henüz yok
  const gorunum = new SahteWebviewGorunusu();
  panel.resolveWebviewView(gorunum as never);
  assert.equal(gorunum.badge?.value, 2, "görünüş çözülürken rozet kurulmadı");
  assert.ok(gorunum.webview.html.includes("A1") && gorunum.webview.html.includes("A2"),
    "görünüş çözülürken gövde defterdeki kapıları basmadı");
});

test("③ kayıt: Onaylar görünüşü kendi kimliğiyle kayda girer ve sağlayıcı o kimlikten çözülür", () => {
  const baglam = baglamKur();
  const panel = onayPaneliKaydi(baglam as never);
  assert.equal(kabuk.webviewSaglayicilari.get(GORUNUS_ONAYLAR), panel,
    "Onaylar paneli kendi görünüş kimliğiyle kayda girmedi");
  assert.equal(baglam.subscriptions.length, 1, "kayıt bağlamın atılabilirlerine eklenmedi");
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

  test(`④ ${ad} kaydı: görünüş kendi kimliğiyle kurulur ve boş başlar`, () => {
    const baglam = baglamKur();
    const s = kaydet(baglam as never);
    assert.equal(kabuk.agaclar.length, 1, "kayıt ağaç görünüşü kurmadı ya da birden fazla kurdu");
    const [g] = kabuk.agaclar;
    assert.equal(g.kimlik, kimlik, `${ad} görünüşü başka bir kimlikle kuruldu`);
    assert.equal((g.secenek as { treeDataProvider: unknown }).treeDataProvider, s);
    assert.equal(g.message, bos, "açılışta boş durum cümlesi yok");
    assert.equal(baglam.subscriptions.length, 1);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// ONAY KUYRUĞU — KOMUT SINIRININ DAVRANIŞI
// ═══════════════════════════════════════════════════════════════════════════

/** Kuyruğu sahte kabukta kurar; komutlar kabuk kaydına düşer. */
function kuyrukKur(): { panel: InstanceType<typeof OnayPaneli>; gorunum: SahteWebviewGorunusu; komut: (ad: string, ...a: unknown[]) => Promise<unknown> } {
  const { panel, gorunum } = panelKur();
  onayKuyruguKaydi(baglamKur() as never, panel);
  const komut = async (ad: string, ...a: unknown[]): Promise<unknown> => {
    const f = kabuk.komutlar.get(ad);
    assert.ok(f, `${ad} komutu kayda girmedi`);
    return f!(...a);
  };
  return { panel, gorunum, komut };
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
  const { gorunum, komut } = kuyrukKur();
  belgeKoy(DOSYA, IKI_KAPI);
  const [, a2] = kapilar(IKI_KAPI);
  // Panelden bayat satır gelir (sıfır); kapı yine de kendi satırında bulunur.
  await komut("sarmal.onayKapisiAc", DOSYA, 0, "A2");
  assert.equal(kabuk.gosterilen.length, 1, "kaynak açılmadı");
  assert.deepEqual(kabuk.gosterilen[0], { dosya: DOSYA, secenek: { preview: true, preserveFocus: true } },
    "kaynak önizleme kipinde ve odak panelde kalarak açılmadı");
  assert.equal(kabuk.etkinEditor?.selection.active.line, a2.satir,
    `imleç ${kabuk.etkinEditor?.selection.active.line}. satırda; kapı ${a2.satir}. satırda`);
  assert.equal(gorunum.gosterimler, 0, "panel defterinde olmayan kapı için panel gösterildi");
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

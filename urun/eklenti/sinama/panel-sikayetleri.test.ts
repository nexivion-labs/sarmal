// ═══════════════════════════════════════════════════════════════════════════
// panel-sikayetleri.test.ts — 🧭 PANELİN KABUL KAPISI (PNL-A02 · Founder 2026-10-27)
//
//   Founder 2026-10-27 tarihinde Sarmal panelinde üç kusur bildirdi. Bu dosya her
//   birini ölçen nöbeti taşır ve nöbetin adı hangi şikâyeti ölçtüğünü söyler:
//     ① Ağaç çizgisi: girinti kılavuzları yalnız fare ağacın üzerine gelince görünür.
//     ② Mini Graf: düğüme tıklamak dosyaya götürmez.
//     ③ Onay (OZK-13): onaya tıklamak kartı editörün etkin sütununda açar, odağı
//        alır ve dosyanın üstünü örter. Hüküm: dosya editörde ilgili satırda açılır,
//        odak panelde kalır, panel hiçbir şeyi editörün yerine ya da yan sütuna açmaz.
//
//   NEDEN `todo`. Nöbetler bugünkü panelde KIRMIZIDIR, çünkü kusurları ölçerler;
//   işlemeden önce koşan `npm test` kancası ise kırmızı sınamayı kabul etmez. Bu
//   yüzden her nöbet node:test'in `todo` seçeneğiyle işaretlidir ve gerekçesi onu
//   yeşile çevirecek Adımın kodunu taşır: ① PNL-A04, ② PNL-A05, ③ PNL-A07. Kırmızı
//   bir `todo` süiti düşürmez fakat çıktıda ✖ ve "# TODO" ile görünür kalır. Kodu
//   onaran Adım nöbetin yeşile döndüğünü gösterir ve işareti aynı işlemede kaldırır;
//   işaret kalırsa nöbet bir sonraki gerilemeyi yakalamaz.
//
//   Görsel kontrol (arac/gorsel-kontrol.mjs) aynı üç şikâyeti gerçek tarayıcıda ölçer
//   ve karşılıklarını aynı Adım kodlarıyla "beklenen kırmızı" olarak işaretler.
// ═══════════════════════════════════════════════════════════════════════════

import "./dil-kur.ts";
import { kabuk, kabukSifirla, belgeKoy, Uri } from "./kabuk-kur.ts";
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { belirtecle } from "../../cekirdek/src/belirtec.ts";
import { ayristir } from "../../cekirdek/src/ayristirici.ts";
import type { Dag, DagDugum } from "../../cekirdek/src/dag.ts";
import { planYolu } from "../../cekirdek/sinama/dogus-agaci.ts";
import { onayKapilariTopla, type OnayKapisi, type KapiKaydi } from "../src/onay-cekirdek.ts";
import { PANEL_BETIGI, PANEL_STILI } from "../src/panel-betik.ts";
import { grafKomutu, grafParcasi } from "../src/panel-cekirdek.ts";
import { projeGrafiCikar } from "../src/minigraf-cekirdek.ts";
import { GORUNUMLER, gorunumHtml } from "../src/minigraf-gorunum.ts";

// Kabuğu içeri alan modüller kanca kurulduktan SONRA yüklenir (kabuk-kur.ts).
const { OnayPaneli } = await import("../src/onay-paneli.ts");
const { onayKuyruguKaydi } = await import("../src/onay-kuyrugu.ts");

/** Bugün bilerek kırmızı olan nöbetin işareti: gerekçe, onu yeşile çevirecek Adımdır. */
const bekliyor = (adim: string, ne: string): { todo: string } => ({ todo: `${adim} yeşile çevirecek: ${ne}` });

const EKLENTI_KOKU = fileURLToPath(new URL("..", import.meta.url));
type SahteBaglam = { subscriptions: { dispose(): unknown }[]; extensionUri: Uri; extension: { packageJSON: unknown } };
const kurulanBaglamlar: SahteBaglam[] = [];
function baglamKur(): SahteBaglam {
  const b: SahteBaglam = { subscriptions: [], extensionUri: Uri.file(EKLENTI_KOKU), extension: { packageJSON: {} } };
  kurulanBaglamlar.push(b);
  return b;
}
beforeEach(() => kabukSifirla());
// Kuyruk kaydı nabız ve geciktirici kurar; eklenti kapanışındaki gibi her senaryonun sonunda atılır.
afterEach(() => {
  for (const b of kurulanBaglamlar.splice(0)) for (const d of b.subscriptions) d.dispose();
});

// ═══════════════════════════════════════════════════════════════════════════
// ① AĞAÇ ÇİZGİSİ — FARE ÜZERİNE GELMEDEN GÖRÜNÜR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Bir seçicinin fare üzerinde DEĞİLKEN geçerli opaklığı. `:hover` ve `:focus`
 * taşımayan kuralların sonuncusu kazanır; opaklık hiç yazılmamışsa değer 1'dir.
 * Özgüllük hesabı yapılmaz: bu ölçüm kuralın metnini okur, boyanan sonucu görsel
 * kontrol gerçek tarayıcıda `getComputedStyle` ile ölçer.
 */
function faresizOpaklik(stil: string, secici: string): number {
  let deger = 1;
  for (const m of stil.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const seciciler = m[1]!.split(",").map((s) => s.trim());
    if (!seciciler.some((s) => s.endsWith(secici) && !/:hover|:focus/.test(s))) continue;
    const o = /(?:^|;)\s*opacity\s*:\s*([^;]+)/.exec(m[2]!);
    if (o) deger = Number.parseFloat(o[1]!);
  }
  return deger;
}

test("Ağaç çizgisi şikâyeti: Ray ağacının girinti kılavuzları fare ağacın üzerine gelmeden görünür (CSS kuralı)",
  bekliyor("PNL-A04", "kılavuz çizgisi fare ağacın üzerine gelmeden de çizilir"), () => {
    // Ölçümün kendisi sınanır: hover kuralı ölçüme karışmaz, yazılmamış opaklık görünür sayılır.
    assert.equal(faresizOpaklik(".x::before{opacity:0}[role=\"tree\"]:hover .x::before{opacity:1}", ".x::before"), 0);
    assert.equal(faresizOpaklik(".x::before{width:1px}", ".x::before"), 1);
    assert.match(PANEL_STILI, /\.sat::before\{/, "girinti kılavuzu kuralı (.sat::before) stilde yok; ölçüm boş küme üstünde koşar");
    const opaklik = faresizOpaklik(PANEL_STILI, ".sat::before");
    assert.ok(opaklik > 0,
      `fare ağacın üzerinde değilken kılavuz opaklığı ${opaklik}; çizgiler yalnız ağacın üzerine gelince görünüyor (Founder 2026-10-27)`);
  });

// ═══════════════════════════════════════════════════════════════════════════
// ② MİNİ GRAF — DÜĞÜME TIKLAMAK DOSYAYI AÇAR (Ağaç · İlerleme · Klasik)
// ═══════════════════════════════════════════════════════════════════════════

function dagYap(dugumler: Array<Partial<DagDugum> & { kod: string }>): Dag {
  const m = new Map<string, DagDugum>();
  for (const [i, d] of dugumler.entries()) {
    m.set(d.kod, {
      tip: "Adım", dosya: `/p/${planYolu("a.sar")}`, satir: i + 2, sutun: 1,
      oncekiler: [], sonrakiler: [], ...d,
    } as DagDugum);
  }
  return { dugumler: m, kopuk: [], oz: [], disProje: [], catisiz: [], ortakKod: [], ayrisamayan: [] };
}

/** Üç görünümün üçü de dosyalı düğüm çizer: İlerleme Katman kartı, Klasik ile Ağaç satır. */
const GRAF_DAGI = dagYap([
  { kod: "F", tip: "Faz", ad: "faz" },
  { kod: "B1", tip: "Blok", kapsayan: "F", ad: "blok" },
  { kod: "K1", tip: "Katman", kapsayan: "B1", ad: "katman" },
  { kod: "A1", kapsayan: "K1", ad: "a1", durum: "tamamlandı" },
  { kod: "A2", kapsayan: "K1", ad: "a2", durum: "beklemede", oncekiler: ["A1"] },
]);

interface Oge { ad: string; svg: boolean; nitelik: string }
const BOS_OGELER = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);

/**
 * Gölge köke basılan çizimde ilk dosya bağının (`command:sarmal.dosyaAc`) ata
 * zinciri ve bağın ilk çocuğu. Ad alanı tarayıcının kuralıyla çözülür: `<svg>`
 * altındaki öğe SVG ad alanındadır (foreignObject hariç).
 */
function dosyaBagi(govde: string): { zincir: Oge[]; bag: Oge; href: string } | undefined {
  const yigin: Oge[] = [];
  let bag: Oge | undefined;
  const sonuc = (z: Oge[]) => ({ zincir: z, bag: bag!, href: /href="([^"]*)"/.exec(bag!.nitelik)![1]! });
  const temiz = govde.replace(/<style>[\s\S]*?<\/style>/g, "");
  for (const m of temiz.matchAll(/<(\/?)([A-Za-z][\w-]*)([^>]*?)(\/?)>/g)) {
    const [, kapanis, ad, nitelik, kendindenKapali] = m as unknown as [string, string, string, string, string];
    if (kapanis) {
      if (bag && yigin.at(-1) === bag) return sonuc([...yigin]);   // çocuksuz bağ: tıklanan öğe bağın kendisidir
      const i = yigin.map((x) => x.ad.toLowerCase()).lastIndexOf(ad.toLowerCase());
      if (i >= 0) yigin.length = i;
      continue;
    }
    const ust = yigin.at(-1);
    const oge: Oge = { ad, svg: ad === "svg" || (!!ust && ust.svg && ust.ad !== "foreignObject"), nitelik };
    if (bag) return sonuc([...yigin, oge]);
    if (ad.toLowerCase() === "a" && /href="command:sarmal\.dosyaAc/.test(nitelik)) bag = oge;
    if (!kendindenKapali && !(!oge.svg && BOS_OGELER.has(ad.toLowerCase()))) yigin.push(oge);
  }
  return undefined;
}

/**
 * Panelin istemci betiğini en küçük sahte belgede koşturur ve tıklama dinleyicisini
 * verir. Betiğin kendisi değiştirilmez; yalnız `acquireVsCodeApi`, `document` ve
 * `window` sağlanır. Gönderilen iletiler bu dünyanın nesnelerine kopyalanır.
 */
function betikKur(): { tikla(olay: unknown): void; iletiler: Array<Record<string, unknown>> } {
  const iletiler: Array<Record<string, unknown>> = [];
  const dinleyiciler = new Map<string, Array<(o: unknown) => void>>();
  const document = {
    activeElement: null,
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: (tur: string, f: (o: unknown) => void) => { dinleyiciler.set(tur, [...(dinleyiciler.get(tur) ?? []), f]); },
  };
  const window = { addEventListener: () => undefined };
  vm.runInNewContext(PANEL_BETIGI, {
    document, window,
    acquireVsCodeApi: () => ({ postMessage: (m: unknown) => { iletiler.push(JSON.parse(JSON.stringify(m)) as Record<string, unknown>); } }),
  });
  return {
    iletiler,
    tikla: (olay) => { for (const f of dinleyiciler.get("click") ?? []) f(olay); },
  };
}

/**
 * Düğüme tıklama olayı. Yol (`composedPath`) gölge kökteki öğeden belgeye kadar
 * gerçek tarayıcının kurduğu sıradadır: bağın çocuğu, bağ, bağın ataları, gölge
 * kök, `#graf` sunucusu, belge. `tagName` tarayıcının kuralını izler: HTML öğesinin
 * adı BÜYÜK harftir, SVG öğesinin adı yazıldığı gibi kalır. Belgedeki dinleyici için
 * olayın hedefi gölge kökün sunucusudur.
 */
function dugumTiklamasi(zincir: Oge[]): { olay: unknown; engellendi: () => boolean } {
  const belge = { nodeType: 9 };
  const golgeKok = { nodeType: 11 };
  const ogeYap = (o: Oge): unknown => ({
    nodeType: 1,
    tagName: o.svg ? o.ad : o.ad.toUpperCase(),
    getAttribute: (n: string) => new RegExp(`(?:^|\\s)${n}="([^"]*)"`).exec(o.nitelik)?.[1] ?? null,
    getRootNode: () => golgeKok,
    closest: () => null,
  });
  const sunucu = { nodeType: 1, tagName: "DIV", getAttribute: () => null, getRootNode: () => belge, closest: () => null };
  const yol = [...zincir.map(ogeYap).reverse(), golgeKok, sunucu, belge];
  let engel = false;
  const olay = {
    composedPath: () => yol, target: sunucu,
    preventDefault: () => { engel = true; }, stopPropagation: () => undefined,
  };
  return { olay, engellendi: () => engel };
}

test("Mini Graf şikâyeti: Ağaç, İlerleme ve Klasik görünümlerinin üçünde de düğüme tıklamak dosyayı açan komutu doğurur",
  bekliyor("PNL-A05", "üç görünümde de düğüm tıklaması sarmal.dosyaAc komutuna ulaşır"), () => {
    const graf = projeGrafiCikar(GRAF_DAGI);
    const sonuclar = GORUNUMLER.map((g) => {
      // Panel çizimi gölge köke tam olarak bu biçimde basar (panel-cekirdek.ts · grafParcasi).
      const bag = dosyaBagi(grafParcasi(gorunumHtml(graf, g)));
      assert.ok(bag, `${g}: çizimde dosya bağı yok; ölçüm boş küme üstünde koşar`);
      // Panelin komut köprüsü bu bağı dosya açma komutuna çevirir (bugün de doğru; panel.test.ts uçtan uca ölçer).
      const komut = grafKomutu(bag.href);
      assert.ok(komut && komut.komut === "sarmal.dosyaAc", `${g}: bağ izinli dosya açma komutuna çözülmüyor`);
      assert.ok(typeof komut.argumanlar[0] === "string" && typeof komut.argumanlar[1] === "number", `${g}: bağın argümanları dosya ve satır değil`);
      const betik = betikKur();
      const { olay, engellendi } = dugumTiklamasi(bag.zincir);
      betik.tikla(olay);
      const ileti = betik.iletiler.find((m) => m.tip === "komut");
      return { g, ad: bag.bag.svg ? "SVG a" : "HTML A", ulasti: ileti?.href === bag.href, engellendi: engellendi() };
    });
    const ulasmayan = sonuclar.filter((s) => !s.ulasti || !s.engellendi);
    assert.deepEqual(ulasmayan.map((s) => s.g), [],
      `düğüm tıklaması dosyayı açan iletiyi doğurmuyor: ${ulasmayan.map((s) => `${s.g} (${s.ad})`).join(", ")} (Founder 2026-10-27)`);
  });

// ═══════════════════════════════════════════════════════════════════════════
// ③ ONAY (OZK-13) — KART EDİTÖRÜ ÖRTMEZ, ODAK PANELDE KALIR
// ═══════════════════════════════════════════════════════════════════════════

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

test("Onay şikâyeti (OZK-13): onay kapısı açılınca editörün etkin sütununda kart açılmaz, odak panelde kalır ve dosya ilgili satırda açılır",
  bekliyor("PNL-A07", "onay kararı panelin içinde verilir; editörde kart açılmaz ve odak panelden kaçmaz"), async () => {
    // Kullanıcı Makinist ağacındaki onay satırına tıklar; satırın komutu sarmal.onayKapisiAc'tır (makinist.ts).
    const panel = new OnayPaneli();
    panel.yerlestirHepsi(kayitlar(DOSYA, IKI_KAPI));
    onayKuyruguKaydi(baglamKur() as never, panel);
    belgeKoy(DOSYA, IKI_KAPI);
    const [, a2] = kapilar(IKI_KAPI);
    assert.ok(a2 && a2.satir > 0, "fikstür kapısı sıfırdan büyük bir satırda durmuyor; satır ölçümü ayırt edici değil");
    assert.equal(kabuk.paneller.length, 0, "fikstür: kart kullanıcı eylemi olmadan açılmış");
    const komut = kabuk.komutlar.get("sarmal.onayKapisiAc");
    assert.ok(komut, "sarmal.onayKapisiAc komutu kayda girmedi");
    await komut(DOSYA, a2.satir, "A2");
    // Dosya editörde ilgili satırda, odağı panelden almadan açılır (bugün de doğru).
    assert.deepEqual(kabuk.gosterilen, [{ dosya: DOSYA, secenek: { preview: true, preserveFocus: true } }],
      "kaynak önizleme kipinde ve odak panelde kalarak açılmadı");
    assert.equal(kabuk.etkinEditor?.selection.active.line, a2.satir, "kaynak kapının satırında açılmadı");
    // Panel editörün yerine ya da yan sütuna hiçbir şey açmaz; odak alan bir gösterim de yoktur.
    const kartlar = kabuk.paneller.map((p) => ({ baslik: p.title, acilis: p.acilis, onaGetirme: p.onaGetirmeler }));
    assert.deepEqual(kartlar, [],
      `onay kapısı editörde kart açtı ve dosyanın üstünü örttü: ${JSON.stringify(kartlar)} ` +
      "(ViewColumn.Active = -1; preserveFocus:false odağı panelden alır)");
  });

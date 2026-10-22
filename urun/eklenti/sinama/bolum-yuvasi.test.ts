// ═══════════════════════════════════════════════════════════════════════════
// bolum-yuvasi.test.ts — 🧩 TEK SARMAL SİMGESİ VE BÖLÜM YUVASI (VIT-K78-A10)
//
//   Founder hükmü (2026-09-28): etkinlik çubuğunda tek bir Sarmal simgesi
//   durur; kabın en üstünde yatay bir bölüm sırası vardır, Ray açık eklentinin
//   kendi bölümüdür ve kardeş eklentiler kendi bölümlerini kaydeder.
//
//   Founder 2026-10-21 (dördüncü hüküm, bağlayıcı çizim): kap TEK webview görünümü
//   taşır (`sarmalPanel`); Ray · Tren · Makinist sekme şeridi o webview'in içindedir
//   (panel-cekirdek.test.ts ve panel.test.ts). Bu süit defteri, kardeş arayüzünü ve
//   kabın tek görünümlü bildirimini kilitler.
//
//   Bu süit kabuksuz ölçülebilen üç şeyi kilitler: bölüm defterinin kararları
//   (kayıt, ret, seçim, düşme, yuva seçimi), bölüm sırasının HTML'i (içerik
//   güvenliği, sekme rolü, kaçış, tema değişkenleri) ve paket bildiriminin
//   yuvayla birebirliği (tek kap, sıranın başta durması, Ray panellerinin ve
//   yuvaların görünürlük koşulları). Gerçek editör kabuğundaki davranış
//   sinama_vscode/suite/bolum-yuvasi.test.ts dosyasında sahte bir kardeş
//   eklentiyle ölçülür.
// ═══════════════════════════════════════════════════════════════════════════

import "./dil-kur.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  BAGLAM, BASLIK_GORUNUSLERI, BOLUM_DIGER_KOMUTU, GRAF_BOLUMU, BOLUM_KOMUTLARI, BolumDefteri, MAKINIST_BOLUMU, PANEL_GORUNUSU, RAY_BOLUMU,
  TREN_BOLUMU, YERLESIK_BOLUMLER, YUVA_GORUNUSLERI, yerlesikMi,
  altindaMi, ayrilmisAdMi, sahibiBul, sahipsizBolumler, simgeKarari,
  yiginDosyalari, yuvaBaglamDegeri,
} from "../src/bolum-cekirdek.ts";
import { BOLUM_SIMGE_KAYNAKLARI, KAPSAYICI_SIMGE, bolumKomutSimgesi } from "../src/simge-cizelgesi.ts";
import { BOLUM_SIRASI_METINLERI, yuzeyDiliniAyarla } from "../src/yuzey-metinleri.ts";

const KOK = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const oku = (yol: string): string => readFileSync(join(KOK, yol), "utf8");
const PAKET = JSON.parse(oku("package.json")) as {
  contributes: {
    viewsContainers: Record<string, Array<{ id: string; icon: string }>>;
    views: Record<string, Array<{ id: string; type?: string; icon: string; when?: string; initialSize?: number }>>;
  };
};

// ── ① DEFTER ────────────────────────────────────────────────────────────────

test("kardeş yokken sıra yalnız yerleşik dörtlüdür (Ray · Graf · Tren · Makinist) ve seçim Ray'dedir", () => {
  const d = new BolumDefteri();
  assert.deepEqual(d.sira({ ray: "Ray", graf: "Graf", tren: "Tren", makinist: "Makinist" }), [
    { kimlik: RAY_BOLUMU, ad: "Ray" }, { kimlik: GRAF_BOLUMU, ad: "Graf" }, { kimlik: TREN_BOLUMU, ad: "Tren" }, { kimlik: MAKINIST_BOLUMU, ad: "Makinist" },
  ]);
  assert.deepEqual([...YERLESIK_BOLUMLER], ["ray", "graf", "tren", "makinist"]);
  assert.equal(d.secili, RAY_BOLUMU);
  assert.equal(d.seciliYuva, RAY_BOLUMU);
  assert.equal(d.kayitSayisi, 0);
});

test("iki bölüm kayıt sırasıyla yerleşik üçlünün ardına dizilir ve ayrı yuvalara oturur", () => {
  const d = new BolumDefteri();
  assert.deepEqual(d.kaydet("birinci", "Birinci", undefined), { tur: "tamam", yuva: 0 });
  assert.deepEqual(d.kaydet("ikinci", " İkinci ", undefined), { tur: "tamam", yuva: 1 });
  assert.deepEqual(d.sira({ ray: "Ray", graf: "Graf", tren: "Tren", makinist: "Makinist" }).map((o) => [o.kimlik, o.ad, o.yuva]), [
    [RAY_BOLUMU, "Ray", undefined], [GRAF_BOLUMU, "Graf", undefined], [TREN_BOLUMU, "Tren", undefined], [MAKINIST_BOLUMU, "Makinist", undefined],
    ["birinci", "Birinci", 0], ["ikinci", "İkinci", 1],
  ]);
});

test("geçersiz kayıt sebebiyle reddedilir ve defter değişmez", () => {
  const d = new BolumDefteri(2);
  assert.deepEqual(d.kaydet("Buyuk", "x", undefined), { tur: "ret", sebep: "kimlik-bicimi" });
  assert.deepEqual(d.kaydet("çağ", "x", undefined), { tur: "ret", sebep: "kimlik-bicimi" });
  assert.deepEqual(d.kaydet("ray", "x", undefined), { tur: "ret", sebep: "kimlik-ayrilmis" });
  assert.deepEqual(d.kaydet("tren", "x", undefined), { tur: "ret", sebep: "kimlik-ayrilmis" });
  assert.deepEqual(d.kaydet("makinist", "x", undefined), { tur: "ret", sebep: "kimlik-ayrilmis" });
  assert.deepEqual(d.kaydet("bir", "   ", undefined), { tur: "ret", sebep: "ad-bos" });
  assert.equal(d.kaydet("bir", "Bir", undefined).tur, "tamam");
  assert.deepEqual(d.kaydet("bir", "Yine", undefined), { tur: "ret", sebep: "kimlik-yinelenen" });
  assert.equal(d.kaydet("iki", "İki", undefined).tur, "tamam");
  assert.deepEqual(d.kaydet("uc", "Üç", undefined), { tur: "ret", sebep: "yuva-yok" });
  assert.equal(d.kayitSayisi, 2);
});

test("seçim bağlam değerini yuvadan türetir; bilinmeyen kimlik seçimi değiştirmez", () => {
  const d = new BolumDefteri<string>();
  d.kaydet("birinci", "Birinci", "ek-1");
  d.kaydet("ikinci", "İkinci", "ek-2");
  assert.equal(d.sec("yok"), false);
  assert.equal(d.secili, RAY_BOLUMU);
  assert.equal(d.sec("ikinci"), true);
  assert.equal(d.seciliYuva, "yuva2");
  assert.equal(d.ek("ikinci"), "ek-2");
  assert.equal(d.yuvaEki(0), "ek-1");
  assert.equal(yuvaBaglamDegeri(3), "yuva4");
});

test("seçili bölüm kalkınca seçim Ray'e döner; seçili olmayanın kalkışı seçimi bozmaz", () => {
  const d = new BolumDefteri();
  d.kaydet("birinci", "Birinci", undefined);
  d.kaydet("ikinci", "İkinci", undefined);
  d.sec("ikinci");
  assert.deepEqual(d.dusur("birinci"), { dustu: true, seciliDegisti: false });
  assert.equal(d.secili, "ikinci");
  assert.deepEqual(d.dusur("ikinci"), { dustu: true, seciliDegisti: true });
  assert.equal(d.secili, RAY_BOLUMU);
  assert.equal(d.seciliYuva, RAY_BOLUMU);
  assert.deepEqual(d.dusur("ikinci"), { dustu: false, seciliDegisti: false });
  assert.deepEqual(d.sira().map((o) => o.kimlik), [...YERLESIK_BOLUMLER]);
});

test("yerleşik bölümler seçilebilir: seçim bağlam değerini kendi kimliğine çevirir ve kardeş düşse de Ray'e dönmez", () => {
  const d = new BolumDefteri<string>();
  d.kaydet("kardes", "Kardeş", "ek");
  for (const k of YERLESIK_BOLUMLER) {
    assert.equal(d.sec(k), true, `${k} seçilemedi`);
    assert.equal(d.secili, k);
    assert.equal(d.seciliYuva, k, "yerleşik bölümde yuva değeri bölümün kendi kimliğidir");
  }
  d.sec(TREN_BOLUMU);
  assert.deepEqual(d.dusur("kardes"), { dustu: true, seciliDegisti: false }, "yerleşik seçim kardeşin düşmesinden etkilenmemeli");
  assert.equal(d.secili, TREN_BOLUMU);
  d.kaydet("yeni", "Yeni", "ek2");
  d.sec("yeni");
  d.dusur("yeni");
  assert.equal(d.secili, RAY_BOLUMU, "seçili kardeş düşünce seçim Ray'e dönmeli");
});

test("yuva seçimi önce hiç kullanılmamış yuvayı verir; boş yuva kalmayınca boşalanı yeniden verir", () => {
  const d = new BolumDefteri(3);
  d.kaydet("a1", "A", undefined);   // 0
  d.kaydet("b1", "B", undefined);   // 1
  d.dusur("a1");
  assert.deepEqual(d.kaydet("c1", "C", undefined), { tur: "tamam", yuva: 2 },
    "kalkan bölümün yuvası hemen yeniden verilmemeli");
  assert.deepEqual(d.kaydet("d1", "D", undefined), { tur: "tamam", yuva: 0 },
    "boş yuva kalmayınca boşalan yuva verilmeli");
});

// ── ② METİNLER ──────────────────────────────────────────────────────────────

test("metinler iki dilde de dolu: QuickPick yer tutucusu ve kayıt reddi sebepleri", () => {
  for (const dil of ["tr", "en"] as const) {
    yuzeyDiliniAyarla(dil);
    const m = BOLUM_SIRASI_METINLERI;
    assert.ok(m.digerYerTutucu.length > 0);
    assert.ok(m.kayitReddi("yuva-yok", "ornek").includes("ornek"));
  }
  yuzeyDiliniAyarla("tr");
  assert.notEqual((yuzeyDiliniAyarla("en"), BOLUM_SIRASI_METINLERI.digerYerTutucu), (yuzeyDiliniAyarla("tr"), BOLUM_SIRASI_METINLERI.digerYerTutucu));
});

// ── ③ PAKET BİLDİRİMİ ───────────────────────────────────────────────────────

test("etkinlik çubuğunda tek kap vardır ve simgesi Sarmal sarmalıdır", () => {
  const kaplar = Object.values(PAKET.contributes.viewsContainers).flat();
  assert.equal(kaplar.length, 1, `birden çok görünüm kabı ilan edilmiş: ${kaplar.map((k) => k.id).join(" · ")}`);
  assert.equal(kaplar[0].icon, KAPSAYICI_SIMGE);
  assert.ok(oku(KAPSAYICI_SIMGE).includes("sarmal"), "kap simgesi marka sarmalının izini taşımalı");
  assert.deepEqual(Object.keys(PAKET.contributes.views), ["sarmal-yol"], "görünüşler tek kaba iner");
});

test("bölüm şeridi webview değildir: sarmalBolumSirasi görünümü, adı ve sağlayıcı kaydı kalkmıştır", () => {
  const g = PAKET.contributes.views["sarmal-yol"];
  assert.ok(!g.some((x) => x.id === "sarmalBolumSirasi"), "şerit görünümü bildirimde duruyor");
  for (const nls of ["package.nls.json", "package.nls.tr.json"])
    assert.ok(!("view.sections" in JSON.parse(oku(nls))), `${nls} ölü view.sections anahtarını taşıyor`);
  const yuva = oku("src/bolum-yuvasi.ts");
  assert.ok(!yuva.includes("sarmalBolumSirasi") && !yuva.includes("siraHtml"), "kabuk şerit kalıntısı taşıyor");
});

test("kabın tek görünümü sarmalPanel'dir: webview, ilk sırada, yalnız çalışma alanı güvenilirken görünür", () => {
  const g = PAKET.contributes.views["sarmal-yol"];
  assert.equal(g[0]!.id, PANEL_GORUNUSU);
  assert.equal(g[0]!.type, "webview");
  assert.equal(g[0]!.when, "isWorkspaceTrusted", "güven koşulu tek koşuldur (MGZ-A02)");
  for (const eski of ["sarmalYolHaritasi", "sarmalMiniGraf", "sarmalTren", "sarmalMakinist"])
    assert.ok(!g.some((x) => x.id === eski), `${eski} kapta görünür bir görünüm olarak kalmış: tek görünüm kuralı bozulur`);
});

test("görünüm eşlemesi: dört yerleşik bölümün hepsi kabın tek görünümündedir; kardeşin bölümü kendi yuva görünümündedir", () => {
  for (const [bolum, gorunum] of Object.entries(BASLIK_GORUNUSLERI)) {
    if (yerlesikMi(bolum)) assert.equal(gorunum, PANEL_GORUNUSU, `${bolum} sarmalPanel dışında bir görünümde`);
    else assert.ok((YUVA_GORUNUSLERI as readonly string[]).includes(gorunum), `${bolum} bir yuva görünümünde değil`);
  }
  assert.deepEqual(Object.keys(BASLIK_GORUNUSLERI).filter((k) => yerlesikMi(k)), [...YERLESIK_BOLUMLER]);
});

test("dört yuva çekirdekteki sırayla ilan edilir ve kapta HİÇ görünmez (kapta tek görünüm kuralı)", () => {
  const g = PAKET.contributes.views["sarmal-yol"];
  const yuvalar = g.filter((x) => x.id.startsWith("sarmalBolumYuvasi"));
  assert.deepEqual(yuvalar.map((x) => x.id), [...YUVA_GORUNUSLERI]);
  for (const v of yuvalar) {
    assert.equal(v.type, "webview");
    assert.equal(v.when, "false", `${v.id}: kardeş yuvası kapta görünürse kapta iki görünüm olur`);
  }
});

// ── ④ GÜVENLİK SIKILAŞTIRMASI (VIT-K78-A10 bağımsız inceleme) ─────────────────

test("taklit: Ray ve Sarmal adları harf, boşluk ve Türkçe İ/ı biçimlerinden bağımsız ayrılmıştır", () => {
  for (const ad of ["Ray", "ray", " RAY ", "rAy", "Sarmal", "SARMAL", "  sarmal\t", "SarmaL"])
    assert.equal(ayrilmisAdMi(ad), true, `${JSON.stringify(ad)} ayrılmış sayılmadı`);
  // Founder 2026-10-21: üç yerleşik bölümün adları iki dilde ayrılmıştır.
  for (const ad of ["Tren", "TREN", "Makinist", "makinist", "Rail", "RAIL", "Train", "Driver", " driver "])
    assert.equal(ayrilmisAdMi(ad), true, `${JSON.stringify(ad)} ayrılmış sayılmadı`);
  for (const ad of ["Rayli", "Ray 2", "Sarmallar", "Trenler", "Birinci", "İkinci"])
    assert.equal(ayrilmisAdMi(ad), false, `${JSON.stringify(ad)} haksız yere ayrıldı`);
  const d = new BolumDefteri();
  assert.deepEqual(d.kaydet("taklit", " SARMAL ", undefined), { tur: "ret", sebep: "ad-ayrilmis" });
  assert.deepEqual(d.kaydet("taklit", "RAY", undefined), { tur: "ret", sebep: "ad-ayrilmis" });
  assert.deepEqual(d.kaydet("taklit", "Makinist", undefined), { tur: "ret", sebep: "ad-ayrilmis" });
  assert.deepEqual(d.kaydet("taklit", "Train", undefined), { tur: "ret", sebep: "ad-ayrilmis" });
  assert.equal(d.kayitSayisi, 0);
});

test("sahip: kareler ham CallSite nesnelerinden okunur; kaynak eşleme kancası sahipliği bozmaz", () => {
  const buDosya = fileURLToPath(import.meta.url);
  const kok = join(KOK, "sinama");
  const eklentiler = [{ kimlik: "sinama.bu", ad: "Bu", kok }];
  const eskiKanca = Error.prepareStackTrace;
  // source-map-support benzeri kanca: yığın METNİNİ tümüyle başka yollara yazar.
  const kanca = (): string => "Error\n    at eslenmis (/baska/yer/ozgun.ts:1:1)";
  Error.prepareStackTrace = kanca;
  try {
    const dosyalar = yiginDosyalari();
    assert.ok(dosyalar.includes(buDosya), `ham kareler bu dosyayı içermeli: ${dosyalar.slice(0, 3).join(" · ")}`);
    assert.ok(!dosyalar.includes("/baska/yer/ozgun.ts"), "kancanın yazdığı metin okunmuş");
    assert.equal(sahibiBul(dosyalar, eklentiler, join(KOK, "src"))?.kimlik, "sinama.bu", "kanca kuruluyken sahip okunamadı");
    assert.equal(Error.prepareStackTrace, kanca, "kanca eski hâline geri konmadı");
  } finally {
    Error.prepareStackTrace = eskiKanca;
  }
});

test("sahip: açık eklentinin kareleri atlanır, ilk yabancı karenin en dar kökü sahiptir", () => {
  const kendi = "/ext/sarmal";
  const eklentiler = [
    { kimlik: "nexivion-labs.sarmal", ad: "Sarmal", kok: kendi },
    { kimlik: "a.kardes", ad: "Kardeş", kok: "/ext/kardes" },
    { kimlik: "a.ic", ad: "İç", kok: "/ext/sarmal/sinama/ic" },
  ];
  assert.equal(sahibiBul(["/ext/sarmal/dist/e.js", "/ext/kardes/k.js"], eklentiler, kendi)?.kimlik, "a.kardes");
  assert.equal(sahibiBul(["/ext/sarmal/dist/e.js", "/ext/sarmal/sinama/ic/k.js"], eklentiler, kendi)?.kimlik, "a.ic",
    "açık eklentinin içine kurulmuş eklenti kendi sahibidir");
  assert.equal(sahibiBul(["/ext/sarmal/dist/e.js", "/ext/kardesler/k.js"], eklentiler, kendi), undefined,
    "/ext/kardes kökü /ext/kardesler yolunu kapsamamalı");
  assert.equal(sahibiBul(["/ext/sarmal/dist/e.js", "/app/editor.js", "/ext/kardes/k.js"], eklentiler, kendi), undefined,
    "ilk yabancı kare sahipsizse sonraki karelere bakılmaz");
  assert.equal(sahibiBul(["/ext/sarmal/dist/e.js"], eklentiler, kendi), undefined);
  assert.equal(altindaMi("/a/bc", "/a/b"), false);
  assert.equal(altindaMi("/x", "/"), false, "dosya sistemi kökü hiçbir yolu kapsamaz");
});

test("simge kökü: yalnız file şeması, çözülebilen ve .. taşımayan yol, sahibin kökü altı ve simgenin kendi klasörü", () => {
  const kok = "/ext/kardes";
  const k = (ham: string, ...gercek: [string | undefined] | []) =>
    simgeKarari("file", ham, gercek.length ? gercek[0] : ham, kok);
  assert.deepEqual(k("/ext/kardes/medya/simge.svg"), { tur: "tamam", kok: "/ext/kardes/medya" });
  assert.deepEqual(k("/ext/kardes/simge.svg"), { tur: "tamam", kok: "/ext/kardes" });
  assert.deepEqual(simgeKarari("https", "/ext/kardes/simge.svg", "/ext/kardes/simge.svg", kok), { tur: "ret", sebep: "sema" });
  assert.deepEqual(k("/ext/kardes/../kardes/simge.svg", "/ext/kardes/simge.svg"), { tur: "ret", sebep: "yol" }, ".. taşıyan yol kabul edildi");
  assert.deepEqual(k("/ext/kardes/yok.svg", undefined), { tur: "ret", sebep: "yol" }, "çözülemeyen yol kabul edildi");
  assert.deepEqual(k("/ext/kardes/bag.svg", "/etc/hosts"), { tur: "ret", sebep: "kok-disi" }, "gerçek yolu kök dışına çıkan bağ kabul edildi");
  assert.deepEqual(k("/etc/hosts"), { tur: "ret", sebep: "kok-disi" });
  assert.deepEqual(k("/ext/kardes"), { tur: "ret", sebep: "kok-disi" });
  assert.deepEqual(simgeKarari("file", "/simge.svg", "/simge.svg", "/"), { tur: "ret", sebep: "kok-disi" }, "geniş kök reddedilmeli");
  assert.deepEqual(k("/ext/kardesler/simge.svg"), { tur: "ret", sebep: "kok-disi" });
});

test("taklit: tam genişlik, sıfır genişlik, yön işareti, yumuşak tire ve birleşik işaret biçimleri de ayrılmıştır", () => {
  for (const ad of ["Ｓａｒｍａｌ", "ＲＡＹ", "Sar\u200Bmal", "R\u200Day", "\u200ERay\u200F", "\u202ESarmal\u202C", "Sar\u00ADmal",
    "\u2066Ray\u2069", "Râŷ", "Sarmál", "\uFEFFRay"])
    assert.equal(ayrilmisAdMi(ad), true, `${JSON.stringify(ad)} ayrılmış sayılmadı`);
  assert.equal(ayrilmisAdMi("Rayli"), false);
});

test("uç hâl: sahibi etkin olmayan bölümler düşürülecekler listesindedir", () => {
  const kayitlar = [{ kimlik: "a", sahip: "x.bir" }, { kimlik: "b", sahip: "x.iki" }];
  assert.deepEqual(sahipsizBolumler(kayitlar, new Set(["x.bir", "x.iki"])), []);
  assert.deepEqual(sahipsizBolumler(kayitlar, new Set(["x.bir"])), ["b"]);
});

test("arayüz: programla seçim yoktur; nöbet kapısı yalnız sınama kipinde verilir", () => {
  const yuva = oku("src/bolum-yuvasi.ts");
  const al = yuva.slice(yuva.indexOf("  al(surum: number)"), yuva.indexOf("  sinamaKapisi(): BolumSinamaKapisi {"));
  assert.ok(al.includes("bolumKaydet:") && !al.includes("bolumSec") && !al.includes("kabuk.sec("),
    "kardeşe verilen yüz programla seçim taşıyor");
  const eklenti = oku("src/eklenti.ts");
  const donus = eklenti.slice(eklenti.lastIndexOf("  return {\n    yuzeyKayitlari"), eklenti.indexOf("export function deactivate"));
  assert.ok(!/\bbolumOlcumleri:|\byolHaritasiGorunurMu:\s*\(\)/.test(donus.replace(/bolumSinamaKapisi: \{[^}]*\}/, "")),
    "ölçüm kapıları herkese açık yüzde duruyor");
  assert.ok(/context\.extensionMode === vscode\.ExtensionMode\.Test && bolumYuvasi\s*\n?\s*\? \{ bolumSinamaKapisi:/.test(donus),
    "nöbet kapısı sınama kipine bağlı değil");
});

test("uç hâl: etkinleşme bağlamı Ray'e sıfırlar, kapanış Ray panellerini gizli bırakmaz", () => {
  const yuva = oku("src/bolum-yuvasi.ts");
  const kurucu = yuva.slice(yuva.indexOf("  constructor(context: vscode.ExtensionContext) {"), yuva.indexOf("  sahipsizleriDusur("));
  assert.ok(/void this\.baglamiYaz\(\);\s*\n\s*\}$/.test(kurucu.trimEnd()), "etkinleşme bağlamı yazmıyor");
  assert.ok(kurucu.includes('executeCommand("setContext", BAGLAM.rayGizli, false)'), "kapanış rayGizli'yi sıfırlamıyor");
  assert.ok(kurucu.includes("vscode.extensions.onDidChange(() => this.sahipsizleriDusur())"), "sahibi kaybolan bölüm düşmüyor");
});

// ── ⑤ KABIN TEK GÖRÜNÜMLÜ BİLDİRİMİ (Founder 2026-10-21: kapta her an yalnız bir görünüm görünür) ─────────

interface MenuOgesi { command: string; when?: string; group?: string }
interface KomutBildirimi { command: string; title: string; icon?: string | { light: string; dark: string } }
const BAGLAM_SEKME = BAGLAM.panelSekme;
const MANIFEST = JSON.parse(oku("package.json")) as {
  contributes: {
    commands: KomutBildirimi[];
    menus: { "view/title": MenuOgesi[]; commandPalette: MenuOgesi[]; "view/item/context"?: MenuOgesi[] };
    views: Record<string, Array<{ id: string; when?: string }>>;
  };
};

/** Bildirimdeki `when` koşullarını değerlendirir: ==, !=, olumsuz ve çıplak anahtar, && ile bağlı. */
function kosulTutarla(kosul: string | undefined, baglam: Readonly<Record<string, unknown>>): boolean {
  if (!kosul) return true;
  if (kosul === "false") return false;
  return kosul.split("&&").map((t) => t.trim()).every((terim) => {
    const m = /^([\w.]+)\s*(==|!=)\s*([\w.-]+)$/u.exec(terim);
    if (m) return (String(baglam[m[1]!]) === m[3]) === (m[2] === "==");
    const o = /^!([\w.]+)$/u.exec(terim);
    if (o) return !baglam[o[1]!];
    if (/^[\w.]+$/u.test(terim)) return Boolean(baglam[terim]);
    throw new Error(`koşul değerlendiricisi bu terimi tanımıyor: ${terim}`);
  });
}

function gorunenGorunumler(baglam: Readonly<Record<string, unknown>>): string[] {
  return MANIFEST.contributes.views["sarmal-yol"]!.filter((g) => kosulTutarla(g.when, baglam)).map((g) => g.id);
}

test("kapta her an TAM BİR görünüm görünür: güvenilir klasörde sarmalPanel, kısıtlı modda karşılama; hiçbir bağlam bunu bozmaz", () => {
  const baglamlar: Array<Record<string, unknown>> = [{}, { [BAGLAM.secili]: "ray" }, { [BAGLAM.secili]: "tren" }, { [BAGLAM.secili]: "makinist" }, { [BAGLAM.secili]: "kardes" },
    { [BAGLAM.seciliYuva]: "yuva1" }, { [BAGLAM.seciliYuva]: "yuva2" }, { [BAGLAM.seciliYuva]: "yuva3" }, { [BAGLAM.seciliYuva]: "yuva4" },
    { [BAGLAM.kardesVar]: true }, { [BAGLAM.trenKardes]: true, [BAGLAM.secili]: "tren" }, { "config.sarmal.miniGraf": false }];
  for (const b of baglamlar) {
    assert.deepEqual(gorunenGorunumler({ ...b, isWorkspaceTrusted: true }), [PANEL_GORUNUSU], `güvenilir klasör, bağlam ${JSON.stringify(b)}`);
    assert.deepEqual(gorunenGorunumler({ ...b, isWorkspaceTrusted: false }), ["sarmalKisitliKarsilama"], `kısıtlı mod, bağlam ${JSON.stringify(b)}`);
  }
});

test("görünüm başlığı eylemleri yalnız sarmalPanel'dedir ve yalnız Ray sekmesindeyken görünür; bölüm düğmeleri ve bağlam menüsü kalmamıştır", () => {
  const baslik = MANIFEST.contributes.menus["view/title"];
  assert.ok(baslik.length > 0);
  for (const m of baslik) {
    assert.ok(/(^|&&\s*)view == sarmalPanel(\s*&&|$)/.test(m.when ?? ""), `${m.command}: başlık eylemi sarmalPanel dışında bir görünümde`);
    assert.ok(!m.command.startsWith("sarmal.bolum."), `${m.command}: bölüm düğmesi başlıkta kalmış (bölümler panelin sekmeleridir)`);
    assert.ok((m.when ?? "").includes(`${BAGLAM_SEKME} == ray`), `${m.command}: Ray'e özgü eylem her sekmede görünüyor`);
  }
  assert.deepEqual(baslik.map((m) => m.command), ["sarmal.miniGraf.gorunumDegistir", "sarmal.rayDegistir", "sarmal.yolHaritasiYenile"]);
  assert.equal(MANIFEST.contributes.menus["view/item/context"], undefined, "satır eylemleri artık webview'in içindedir; ağaç bağlam menüsü kalmamalı");
});

test("başlık komutları: simgeler üretilmiş açık/koyu çifttir, seçili sürüm seçili dosyaya bağlıdır; komut paleti gizlidir", () => {
  const komutlar = new Map(MANIFEST.contributes.commands.map((c) => [c.command, c]));
  for (const b of YERLESIK_BOLUMLER) {
    for (const secili of [false, true]) {
      const c = komutlar.get(secili ? BOLUM_KOMUTLARI[b].secili : BOLUM_KOMUTLARI[b].duz);
      assert.ok(c, `${b} komutu bildirimde yok`);
      assert.deepEqual(c!.icon, { light: bolumKomutSimgesi(b, secili, "acik"), dark: bolumKomutSimgesi(b, secili, "koyu") });
      for (const yol of [bolumKomutSimgesi(b, secili, "acik"), bolumKomutSimgesi(b, secili, "koyu")]) {
        const svg = oku(yol);
        assert.ok(!svg.includes("currentColor"), `${yol} boyanmamış (komut simgesi currentColor çözmez)`);
      }
    }
    assert.notEqual(oku(bolumKomutSimgesi(b, true, "acik")), oku(bolumKomutSimgesi(b, false, "acik")), `${b}: seçili simge düzden ayrışmalı`);
    assert.equal(komutlar.get(BOLUM_KOMUTLARI[b].duz)!.title, komutlar.get(BOLUM_KOMUTLARI[b].secili)!.title, `${b}: iki sürümün başlığı aynı olmalı`);
  }
  assert.equal(komutlar.get(BOLUM_DIGER_KOMUTU)!.icon, "$(layers)");
  const gizli = new Set(MANIFEST.contributes.menus.commandPalette.filter((m) => m.when === "false").map((m) => m.command));
  for (const k of [BOLUM_DIGER_KOMUTU, ...Object.values(BOLUM_KOMUTLARI).flatMap((v) => [v.duz, v.secili])])
    assert.ok(gizli.has(k), `${k} komut paletinde görünüyor`);
});

test("başlık komutları: ipuçları iki dilde yazılıdır (Ray — Plan · Graf · Tren — Ajanlar · Makinist — Kararını bekleyenler)", () => {
  const nls = (dosya: string): Record<string, string> => JSON.parse(oku(dosya)) as Record<string, string>;
  const tr = nls("package.nls.tr.json");
  const en = nls("package.nls.json");
  const beklenen: Record<string, [string, string]> = {
    "command.sectionRail": ["Ray — Plan", "Rail — Plan"],
    "command.sectionGraph": ["Graf — Bağımlılıklar", "Graph — Dependencies"],
    "command.sectionTrain": ["Tren — Ajanlar", "Train — Agents"],
    "command.sectionDriver": ["Makinist — Kararını bekleyenler", "Driver — Waiting for you"],
  };
  for (const [anahtar, [t, e]] of Object.entries(beklenen)) {
    assert.equal(tr[anahtar], t);
    assert.equal(en[anahtar], e);
  }
  assert.ok(tr["command.sectionOther"] && en["command.sectionOther"]);
});

test("başlık simgeleri: üretici ile çizelge aynı kaynakları okur", async () => {
  const { BOLUM_KAYNAKLARI } = await import("../arac/simge-uret.mjs") as { BOLUM_KAYNAKLARI: Record<string, string> };
  const goreli = (y: string): string => y.replace(/^medya\/simgeler\//, "");
  for (const [b, yol] of Object.entries(BOLUM_SIMGE_KAYNAKLARI)) assert.equal(goreli(yol), BOLUM_KAYNAKLARI[b], `${b}: kaynak ayrışmış`);
  assert.deepEqual(Object.keys(BOLUM_KAYNAKLARI), [...YERLESIK_BOLUMLER]);
});

test("Mini Graf görünüm düğmesi yalnız Mini Graf ayarı açıkken görünür (ayar kapalıysa düğme de bölüm de yoktur)", () => {
  const m = MANIFEST.contributes.menus["view/title"].find((x) => x.command === "sarmal.miniGraf.gorunumDegistir")!;
  assert.ok(m.when!.includes("config.sarmal.miniGraf"), m.when);
  assert.ok(kosulTutarla(m.when, { view: PANEL_GORUNUSU, [BAGLAM_SEKME]: "ray", "config.sarmal.miniGraf": true }));
  assert.ok(!kosulTutarla(m.when, { view: PANEL_GORUNUSU, [BAGLAM_SEKME]: "ray", "config.sarmal.miniGraf": false }));
  assert.ok(!kosulTutarla(m.when, { view: PANEL_GORUNUSU, [BAGLAM_SEKME]: "tren", "config.sarmal.miniGraf": true }));
});

test("Tren kardeşi: kanca belgelenmiştir; kardeşin varlığı komutundan ölçülür ve açık eklenti anahtarı yazmaz, yalnız okur", () => {
  const yuva = oku("src/bolum-yuvasi.ts");
  assert.ok(yuva.includes("sarmal.tren.kardes") && yuva.includes("TREN KARDEŞİ"), "kardeş arayüzü belgesi Tren kancasını anlatmıyor");
  assert.ok(yuva.includes("sarmal.tren.kardesAc"), "kardeşin kaydedeceği komut belgelenmemiş");
  assert.equal(BAGLAM.trenKardes, "sarmal.tren.kardes");
  for (const dosya of ["src/bolum-yuvasi.ts", "src/eklenti.ts", "src/makinist.ts", "src/panel.ts"])
    assert.ok(!/setContext[^;]*trenKardes/.test(oku(dosya)), `${dosya} Tren kardeşi anahtarını yazıyor; anahtar kardeşindir`);
});

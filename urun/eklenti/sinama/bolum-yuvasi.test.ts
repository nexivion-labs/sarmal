// ═══════════════════════════════════════════════════════════════════════════
// bolum-yuvasi.test.ts — 🧩 TEK SARMAL SİMGESİ VE BÖLÜM YUVASI (VIT-K78-A10)
//
//   Founder hükmü (2026-09-28): etkinlik çubuğunda tek bir Sarmal simgesi
//   durur; kabın en üstünde yatay bir bölüm sırası vardır, Ray açık eklentinin
//   kendi bölümüdür ve kardeş eklentiler kendi bölümlerini kaydeder.
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
  BAGLAM, BOLUM_SIRASI_GORUNUSU, BolumDefteri, RAY_BOLUMU, RAY_GORUNUSLERI, YUVA_GORUNUSLERI,
  altindaMi, ayrilmisAdMi, guvenliSvg, sahibiBul, sahipsizBolumler, simgeKarari, siraHtml,
  yiginDosyalari, yuvaBaglamDegeri, type SiraCizimOgesi,
} from "../src/bolum-cekirdek.ts";
import { KAPSAYICI_SIMGE, RAY_BOLUM_SIMGESI, panelSvgKaynagi } from "../src/simge-cizelgesi.ts";
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

test("kardeş yokken sıra yalnız Ray'dir ve seçim Ray'dedir", () => {
  const d = new BolumDefteri();
  assert.deepEqual(d.sira("Ray"), [{ kimlik: RAY_BOLUMU, ad: "Ray" }]);
  assert.equal(d.secili, RAY_BOLUMU);
  assert.equal(d.seciliYuva, RAY_BOLUMU);
  assert.equal(d.kayitSayisi, 0);
});

test("iki bölüm kayıt sırasıyla Ray'in ardına dizilir ve ayrı yuvalara oturur", () => {
  const d = new BolumDefteri();
  assert.deepEqual(d.kaydet("birinci", "Birinci", undefined), { tur: "tamam", yuva: 0 });
  assert.deepEqual(d.kaydet("ikinci", " İkinci ", undefined), { tur: "tamam", yuva: 1 });
  assert.deepEqual(d.sira("Ray").map((o) => [o.kimlik, o.ad, o.yuva]), [
    [RAY_BOLUMU, "Ray", undefined], ["birinci", "Birinci", 0], ["ikinci", "İkinci", 1],
  ]);
});

test("geçersiz kayıt sebebiyle reddedilir ve defter değişmez", () => {
  const d = new BolumDefteri(2);
  assert.deepEqual(d.kaydet("Buyuk", "x", undefined), { tur: "ret", sebep: "kimlik-bicimi" });
  assert.deepEqual(d.kaydet("çağ", "x", undefined), { tur: "ret", sebep: "kimlik-bicimi" });
  assert.deepEqual(d.kaydet("ray", "x", undefined), { tur: "ret", sebep: "kimlik-ayrilmis" });
  assert.deepEqual(d.kaydet("bir", "   ", undefined), { tur: "ret", sebep: "ad-bos" });
  assert.equal(d.kaydet("bir", "Bir", undefined).tur, "tamam");
  assert.deepEqual(d.kaydet("bir", "Yine", undefined), { tur: "ret", sebep: "kimlik-yinelenen" });
  assert.equal(d.kaydet("iki", "İki", undefined).tur, "tamam");
  assert.deepEqual(d.kaydet("uc", "Üç", undefined), { tur: "ret", sebep: "yuva-yok" });
  assert.equal(d.kayitSayisi, 2);
});

test("seçim bağlam değerini yuvadan türetir; bilinmeyen kimlik seçimi değiştirmez", () => {
  const d = new BolumDefteri();
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
  assert.deepEqual(d.sira("Ray").map((o) => o.kimlik), [RAY_BOLUMU]);
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

// ── ② BÖLÜM SIRASININ HTML'İ ───────────────────────────────────────────────

const RAY_OGESI: SiraCizimOgesi = {
  kimlik: RAY_BOLUMU, ad: "Ray", ipucu: "Ray ipucu", secili: true,
  svg: oku(RAY_BOLUM_SIMGESI),
};

function cizim(ogeler: SiraCizimOgesi[]): string {
  return siraHtml({ nonce: "n0nce", cspKaynak: "vscode-webview://x", dil: "tr", listeEtiketi: "Sarmal bölümleri", ogeler });
}

test("içerik güvenliği politikası yalnız kendi nonce'unu ve webview kaynağını açar", () => {
  const html = cizim([RAY_OGESI]);
  const csp = /Content-Security-Policy" content="([^"]+)"/.exec(html)?.[1] ?? "";
  assert.ok(csp.startsWith("default-src 'none';"), `politika kapalı başlamıyor: ${csp}`);
  assert.ok(csp.includes("script-src 'nonce-n0nce'") && csp.includes("style-src 'nonce-n0nce'"), csp);
  assert.ok(csp.includes("img-src vscode-webview://x"), csp);
  assert.ok(!/unsafe-inline|unsafe-eval|\*/.test(csp), `politika gevşek: ${csp}`);
  assert.equal((html.match(/<script /g) ?? []).length, 1);
  assert.ok(html.includes('<script nonce="n0nce">') && html.includes('<style nonce="n0nce">'));
});

test("sıra bir sekme listesidir: yalnız Ray varken tek sekme, seçili ve odaklanabilir", () => {
  const html = cizim([RAY_OGESI]);
  assert.equal((html.match(/role="tab"/g) ?? []).length, 1);
  assert.ok(html.includes('role="tablist"') && html.includes('aria-label="Sarmal bölümleri"'));
  assert.ok(/data-kimlik="ray" aria-selected="true" tabindex="0"/.test(html));
  assert.ok(html.includes("<svg"), "Ray simgesi satır içi çizilmeli ki tema rengini alsın");
});

test("kardeş bölümü logosunu açık ve koyu adresle taşır; seçili olmayan sekme sekme sırasının dışındadır", () => {
  const html = cizim([
    { ...RAY_OGESI, secili: false },
    { kimlik: "birinci", ad: "Birinci", ipucu: "Birinci ipucu", secili: true, simgeAcik: "https://a/acik.svg", simgeKoyu: "https://a/koyu.svg" },
  ]);
  assert.equal((html.match(/role="tab"/g) ?? []).length, 2);
  assert.ok(/data-kimlik="ray" aria-selected="false" tabindex="-1"/.test(html));
  assert.ok(/data-kimlik="birinci" aria-selected="true" tabindex="0"/.test(html));
  assert.ok(html.includes('<img class="acik" src="https://a/acik.svg"') && html.includes('<img class="koyu" src="https://a/koyu.svg"'));
});

test("dışarıdan gelen ad ve ipucu işaretleme olarak yorumlanmaz", () => {
  const html = cizim([{ kimlik: "birinci", ad: "<img src=x onerror=alert(1)>", ipucu: '"><script>x()</script>', secili: false, simgeAcik: "a" }]);
  assert.ok(!html.includes("<img src=x") && html.includes("&lt;img src=x onerror=alert(1)&gt;"));
  assert.ok(!html.includes("<script>x()"));
  assert.equal(guvenliSvg('<svg onload="x()"></svg>'), "");
  assert.equal(guvenliSvg("<svg><script>x()</script></svg>"), "");
  assert.equal(guvenliSvg("<div></div>"), "");
});

test("sayfa hiçbir somut renk taşımaz; renkler tema değişkenlerinden gelir", () => {
  const html = cizim([RAY_OGESI]);
  const bicem = /<style[^>]*>([\s\S]*?)<\/style>/.exec(html)?.[1] ?? "";
  assert.ok(!/#[0-9A-Fa-f]{3,8}\b|rgba?\(|hsla?\(/.test(html), "sayfaya somut renk gömülmüş");
  for (const degisken of ["--vscode-foreground", "--vscode-focusBorder", "--vscode-panelTitle-activeBorder", "--vscode-contrastActiveBorder"])
    assert.ok(bicem.includes(degisken), `${degisken} kullanılmıyor`);
  // Dar genişlikte sıra tek satırda kalır ve öğeler daralır: ikinci satır kısa
  // başlayan bölmenin altında kesiliyordu (gerçek VS Code ekran görüntüsü).
  assert.ok(bicem.includes("flex-wrap: nowrap"), "sıra alt satıra kırılmamalı");
  assert.ok(/\.bolum \{[^}]*min-width: 0;/.test(bicem), "öğeler dar genişlikte daralabilmeli");
  assert.ok(/\.ad \{[^}]*text-overflow: ellipsis;/.test(bicem), "uzun ad üç noktayla kısalmalı");
});

test("klavye: oklar, Home ve End odak taşır; seçim tıklama ya da Enter/Boşluk ile olur", () => {
  const html = cizim([RAY_OGESI]);
  for (const tus of ["ArrowRight", "ArrowLeft", "Home", "End"]) assert.ok(html.includes(`"${tus}"`), `${tus} işlenmiyor`);
  assert.ok(html.includes('type="button"'), "sekme bir düğmedir; Enter ve Boşluk tıklama doğurur");
  assert.ok(html.includes('postMessage({ tur: "sec"'), "seçim ev sahibine iletilmiyor");
});

test("metinler iki dilde de dolu; Ray adı markadır ve çevrilmez", () => {
  for (const dil of ["tr", "en"] as const) {
    yuzeyDiliniAyarla(dil);
    assert.equal(BOLUM_SIRASI_METINLERI.rayAdi, "Ray");
    assert.equal(BOLUM_SIRASI_METINLERI.htmlDili, dil);
    assert.ok(BOLUM_SIRASI_METINLERI.listeEtiketi.length > 0 && BOLUM_SIRASI_METINLERI.rayIpucu.startsWith("Ray"));
    assert.ok(BOLUM_SIRASI_METINLERI.kayitReddi("yuva-yok", "ornek").includes("ornek"));
  }
  yuzeyDiliniAyarla("tr");
});

// ── ③ PAKET BİLDİRİMİ ───────────────────────────────────────────────────────

test("etkinlik çubuğunda tek kap vardır ve simgesi Sarmal sarmalıdır", () => {
  const kaplar = Object.values(PAKET.contributes.viewsContainers).flat();
  assert.equal(kaplar.length, 1, `birden çok görünüm kabı ilan edilmiş: ${kaplar.map((k) => k.id).join(" · ")}`);
  assert.equal(kaplar[0].icon, KAPSAYICI_SIMGE);
  assert.equal(KAPSAYICI_SIMGE, panelSvgKaynagi("sarmalBolumSirasi"));
  assert.ok(oku(KAPSAYICI_SIMGE).includes("sarmal"), "kap simgesi marka sarmalının izini taşımalı");
  assert.deepEqual(Object.keys(PAKET.contributes.views), ["sarmal-yol"], "görünüşler tek kaba iner");
});

test("bölüm sırası kabın ilk görünüşüdür, webview'dir ve küçük başlar", () => {
  const g = PAKET.contributes.views["sarmal-yol"];
  assert.equal(g[0].id, BOLUM_SIRASI_GORUNUSU);
  assert.equal(g[0].type, "webview");
  assert.equal(g[0].when, undefined, "sıra hiçbir koşula bağlı değildir; kardeş yokken de Ray'i gösterir");
  assert.equal(g[0].initialSize, 1);
});

test("Ray'in altı paneli yalnız Ray seçiliyken görünür; koşul olumsuzdur, etkinleşmeden önce de görünürler", () => {
  const g = PAKET.contributes.views["sarmal-yol"];
  for (const kimlik of RAY_GORUNUSLERI) {
    const v = g.find((x) => x.id === kimlik);
    assert.ok(v, `${kimlik} paket bildiriminden düşmüş`);
    assert.ok(v!.when?.split("&&").map((p) => p.trim()).includes(`!${BAGLAM.rayGizli}`),
      `${kimlik} Ray koşulunu taşımıyor: ${v!.when}`);
  }
  assert.equal(g.find((x) => x.id === "sarmalMiniGraf")!.when, `config.sarmal.miniGraf && !${BAGLAM.rayGizli}`,
    "Mini Graf ayar koşulunu kaybetmiş");
});

test("dört yuva çekirdekteki sırayla ilan edilir ve yalnız kendi yuvası seçiliyken görünür", () => {
  const g = PAKET.contributes.views["sarmal-yol"];
  const yuvalar = g.filter((x) => x.id.startsWith("sarmalBolumYuvasi"));
  assert.deepEqual(yuvalar.map((x) => x.id), [...YUVA_GORUNUSLERI]);
  yuvalar.forEach((v, i) => {
    assert.equal(v.type, "webview");
    assert.equal(v.when, `${BAGLAM.seciliYuva} == ${yuvaBaglamDegeri(i)}`);
  });
});

// ── ④ GÜVENLİK SIKILAŞTIRMASI (VIT-K78-A10 bağımsız inceleme) ─────────────────

test("taklit: Ray ve Sarmal adları harf, boşluk ve Türkçe İ/ı biçimlerinden bağımsız ayrılmıştır", () => {
  for (const ad of ["Ray", "ray", " RAY ", "rAy", "Sarmal", "SARMAL", "  sarmal\t", "SarmaL"])
    assert.equal(ayrilmisAdMi(ad), true, `${JSON.stringify(ad)} ayrılmış sayılmadı`);
  for (const ad of ["Rayli", "Ray 2", "Sarmallar", "Tren", "Birinci", "İkinci"])
    assert.equal(ayrilmisAdMi(ad), false, `${JSON.stringify(ad)} haksız yere ayrıldı`);
  const d = new BolumDefteri();
  assert.deepEqual(d.kaydet("taklit", " SARMAL ", undefined), { tur: "ret", sebep: "ad-ayrilmis" });
  assert.deepEqual(d.kaydet("taklit", "RAY", undefined), { tur: "ret", sebep: "ad-ayrilmis" });
  assert.equal(d.kayitSayisi, 0);
});

test("sahip: çağrı yığınındaki kareler dosya yoluyla okunur", () => {
  const yigin = [
    "Error",
    "    at BolumYuvasiKabugu.sahipOku (/ext/sarmal/dist/eklenti.js:10:5)",
    "    at Object.bolumKaydet (/ext/sarmal/dist/eklenti.js:20:7)",
    "    at kur (/ext/kardes-1.0.0/kardes.js:30:9)",
    "    at file:///ext/esm%20kardes/giris.mjs:4:2",
    "    at node:internal/process/task_queues:95:5",
  ].join("\n");
  assert.deepEqual(yiginDosyalari(yigin), [
    "/ext/sarmal/dist/eklenti.js", "/ext/sarmal/dist/eklenti.js", "/ext/kardes-1.0.0/kardes.js", "/ext/esm kardes/giris.mjs",
  ]);
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

test("simge kökü: yalnız file şeması, sahibin kökü altı ve simgenin kendi klasörü", () => {
  const kok = "/ext/kardes";
  assert.deepEqual(simgeKarari("file", "/ext/kardes/medya/simge.svg", kok), { tur: "tamam", kok: "/ext/kardes/medya" });
  assert.deepEqual(simgeKarari("file", "/ext/kardes/simge.svg", kok), { tur: "tamam", kok: "/ext/kardes" });
  assert.deepEqual(simgeKarari("https", "/ext/kardes/simge.svg", kok), { tur: "ret", sebep: "sema" });
  assert.deepEqual(simgeKarari("file", "/etc/hosts", kok), { tur: "ret", sebep: "kok-disi" });
  assert.deepEqual(simgeKarari("file", "/ext/kardes", kok), { tur: "ret", sebep: "kok-disi" });
  assert.deepEqual(simgeKarari("file", "/simge.svg", "/"), { tur: "ret", sebep: "kok-disi" }, "geniş kök reddedilmeli");
  assert.deepEqual(simgeKarari("file", "/ext/kardesler/simge.svg", kok), { tur: "ret", sebep: "kok-disi" });
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

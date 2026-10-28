#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// gorsel-kontrol.mjs — Sarmal panelinin kurulum öncesi GÖRSEL KONTROLÜ
//
//   Founder 2026-10-22: "yaparken ne bozuluyor bakılmadı." Birim sınamaları HTML
//   metnini ölçer, tarayıcının onu nasıl boyadığını ölçmez; Mini Graf'ın gölge kökte
//   tanımsız kalan değişkeni ve kaybolan girinti kılavuzları ancak gerçek bir
//   tarayıcıda görünür. Bu komut her kurulumdan önce koşar:
//
//     1. Verilen proje kökünün gerçek verisiyle panelin tam HTML'ini üretir
//        (arac/gorsel-kontrol-uret.ts; Ray · Tren · Makinist · Sinyaller · Ayarlar ·
//        Mini Graf'ın üç görünümü seçili ve seçimsiz · görünüm seçici).
//     2. Her değişkeyi başsız Chromium'da üç ölçüde açar, koyu VS Code teması
//        değişkenlerini tanımlar ve ekran görüntülerini yazar.
//     3. DOM ölçümüyle kontrol listesini koşar ve sonucu sonuc.txt ile sonuc.json
//        dosyalarına yazar. Bir kontrol düşerse çıkış kodu 1'dir.
//     4. --onceki <dizin> verilirse iki koşunun görüntülerini karsilastirma.html
//        dosyasında yan yana koyar.
//
//   Kullanım:
//     node arac/gorsel-kontrol.mjs <proje_dizini> <cikti_dizini>
//          [--secili KOD] [--acik 3] [--dil tr|en] [--onceki <onceki_cikti_dizini>]
//
//   Boyutlar: 300×720 ve 460×720 (kenar çubuğu), 1400×400 (Founder'ın kullandığı
//   alt panel: editörün altında, sola yaslı, geniş ve alçak · 2026-10-27).
//   Kontrol listesi: betik hatası · sekme şeridi başta ve en alta kaydırınca üstte ·
//   AĞAÇ ÇİZGİLERİ (PNL-A04): Ray, Tren ve Makinist ağaçlarında girinti kılavuzu fare
//   ağacın dışındayken de çizili, ince (1 px) ve tül morunda · fare bir satırın üzerine
//   gelince o dalın çizgisi, satırın gri açıklaması ve simgesi renklenir, fare çıkınca söner ·
//   YERLEŞİM (PNL-A03): sekme yazısı 11 px ve şerit 26 px · sekme sırası Ray, Tren,
//   Makinist, Gözlemler, Ayarlar · içerik alanı şeridin altından panelin dibine uzanır ·
//   Ray başlıkları 10 px · geniş panelde (1400×400) Yol Haritası ile Mini Graf yan yana
//   ve dibe kadar, dar panelde alt alta · başlıklar sütunlarının üstünde (katlanan
//   Mini Graf başlığı dibe yapışmaz) · Gözlemler ve Ayarlar boş durum cümlesi ·
//   Ray girinti kılavuzları (fare ağacın üzerindeyken ve DEĞİLKEN) ve etkin kılavuz ·
//   Ray başlıklarının tıklama, Enter ve Space ile katlanması · Makinist üst
//   düğümlerinin katlanabilirliği · ana yazı boyutu 11–14 px · Mini Graf yazılarının
//   görünürlüğü, taşmazlığı, satır boyu ve bağ çizgisi sayısı · Mini Graf düğümüne
//   gerçek fare tıklamasının dosya açma iletisi doğurması (üç görünüm) · satır seçiminin
//   Mini Grafı yeniden yazmadan işareti taşıması (PNL-A05) · ONAY KARARI PANELDE
//   (PNL-A07): açık kapının karar kademesi kapı satırının hemen altında, tek, gerekçe
//   kutusu ve üç eylemle; kutuya yazmak taslak, Escape kutudan çıkış, ikinci Escape
//   vazgeçiş, şerh düğmesi ile Ctrl+Enter karar iletisi doğurur · onay
//   kapısının editörde kart açmaması (OZK-13) · SEKME GEÇİŞİ EKLENTİYİ BEKLEMEZ (PNL-A18):
//   sahte eklenti hiçbir iletiye yanıt vermezken (iş parçacığı kilitliymiş gibi) her sekmeye
//   gerçek fare tıklaması o sekmenin içeriğini hemen gösterir, seçili sekme ile görünen kap
//   ayrışmaz, eklentinin gecikmiş bölümü ve gecikmiş seçimi görünen içeriği değiştirmez; her
//   adımın ekran görüntüsü sekme-gecisi-<boyut>-<sekme>.png olarak yazılır · SEKMELERİN SÜRÜKLENEREK
//   SIRALANMASI (PNL-A23): gerçek fare sürüklemesi sekmeyi bırakıldığı yere taşır, yeni sıra eklentiye
//   tek iletiyle gider, seçim ve görünen içerik değişmez, rozet sekmesiyle taşınır; Alt+Sol/Sağ odaktaki
//   sekmeyi taşır ve VS Code'a geçmez; eklentinin bildirdiği sıra şeride uygulanır; sıra ayarı taşıyan
//   değişke ilk sekmeyle açılır; görüntüler sekme-sirasi-<boyut>-<an>.png · ESKİ/YENİ ETKİLEŞİM ENVANTERİ
//   (git HEAD'deki package.json'ın görünüm ve menü katkıları ile panelin karşılığı;
//   kaybolan etkileşim DÜŞTÜ, yolu değişen etkileşim UYARI olarak yazılır).
//
//   BEKLENEN KIRMIZI (PNL-A02 · Founder 2026-10-27 şikâyetleri). Bazı kontroller
//   bugünkü panelde bilerek kırmızıdır, çünkü onaracak Adım henüz koşmamıştır; böyle
//   bir kontrol onu yeşile çevirecek Adımın koduyla işaretlenir. PNL-A04 ağaç çizgisi,
//   PNL-A05 Mini Graf tıklaması ve PNL-A07 onay kartı yeşile döndü ve işaretleri
//   kaldırıldı; bugün işaretli kontrol yoktur. İşaretli kontrolün
//   kırmızısı çıkış kodunu bozmaz ve "BEKLENEN" diye yazılır. İşaretli kontrol yeşile
//   dönerse "YEŞİLE DÖNDÜ" yazılır ve çıkış kodu 1 olur: onaran Adım işareti aynı
//   işlemede kaldırır, yoksa kontrol bir sonraki gerilemeyi yakalamaz.
//
//   Playwright eklentinin bağımlılığı değildir. Komut onu sırasıyla SARMAL_PLAYWRIGHT
//   ortam değişkeninden (playwright paketinin dizini ya da index.mjs yolu), eklenti
//   dizininden ve çalışma dizininden arar; Chromium'un kurulu olması gerekir
//   (`npx playwright install chromium`).
// ═══════════════════════════════════════════════════════════════════════════

import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const EKLENTI = resolve(fileURLToPath(new URL("..", import.meta.url)));
/** Kenar çubuğu (dar ve geniş) ve alt panel (geniş ve alçak; Founder'ın panelinin ölçüsü) boyutları. */
const BOYUTLAR = [{ ad: "300", w: 300, h: 720 }, { ad: "460", w: 460, h: 720 }, { ad: "alt", w: 1400, h: 400 }];
/** Ana yazıların (ağaç satırı, düğüm adı) izinli boyutu: VS Code ağaç ölçeği. */
const YAZI_EN_AZ = 11, YAZI_EN_COK = 14;
/** PNL-A03 · Founder 2026-10-27: küçük sekme şeridi ve çok küçük puntolu bölüm başlıkları. */
const SEKME_YAZI = "11px", SERIT_PX = 26, BASLIK_YAZI = "10px";
/** Paketin varsayılan sekme sırası (PNL-A23): package.json katkısındaki `sarmal.sekmeSirasi` varsayılanı. */
const SEKME_SIRASI = JSON.parse(readFileSync(join(EKLENTI, "package.json"), "utf8"))
  .contributes.configuration.properties["sarmal.sekmeSirasi"].default;
/** Ray bölümlerinin yan yana dizildiği en küçük genişlik (src/panel-betik.ts GENIS_PANEL_PX ile aynı). */
const GENIS_PANEL_PX = 640;

// ── Argümanlar ──────────────────────────────────────────────────────────────
const arg = process.argv.slice(2);
const secenek = (ad, varsayilan) => {
  const i = arg.indexOf(`--${ad}`);
  if (i < 0) return varsayilan;
  const v = arg[i + 1];
  arg.splice(i, 2);
  return v;
};
const SECILI = secenek("secili", "-");
const ACIK = secenek("acik", "3");
const DIL = secenek("dil", "tr");
const ONCEKI = secenek("onceki", undefined);
const [PROJE_ARG, CIKTI_ARG] = arg;
if (!PROJE_ARG || !CIKTI_ARG) {
  console.error("kullanım: node arac/gorsel-kontrol.mjs <proje_dizini> <cikti_dizini> [--secili KOD] [--acik 3] [--dil tr|en] [--onceki <dizin>]");
  process.exit(2);
}
const PROJE = resolve(PROJE_ARG);
const CIKTI = resolve(CIKTI_ARG);
mkdirSync(CIKTI, { recursive: true });
const HTML_DIZIN = join(CIKTI, "html");
rmSync(HTML_DIZIN, { recursive: true, force: true });

// ── 1. Panel HTML'ini üret ──────────────────────────────────────────────────
const { default: esbuild } = await import(pathToFileURL(createRequire(join(EKLENTI, "package.json")).resolve("esbuild")).href);
const paket = join(tmpdir(), `sarmal-gorsel-kontrol-${process.pid}.mjs`);
esbuild.buildSync({
  entryPoints: [join(EKLENTI, "arac", "gorsel-kontrol-uret.ts")], bundle: true, format: "esm", platform: "node", target: "node22",
  outfile: paket, logLevel: "error",
  alias: { vscode: join(EKLENTI, "sinama", "vscode-sahtesi.ts") },
  banner: { js: "import {createRequire as __cr} from 'node:module'; const require = __cr(import.meta.url);" },
  // Paket geçici dizinde koşar; import.meta.url eklenti kökünü göstermeli (simge dosyaları oradan okunur).
  define: { "import.meta.url": JSON.stringify(pathToFileURL(join(EKLENTI, "arac", "gorsel-kontrol-uret.ts")).href) },
});
let uretim;
try {
  uretim = JSON.parse(execFileSync(process.execPath, [paket, PROJE, HTML_DIZIN, SECILI, ACIK, DIL], { encoding: "utf8", maxBuffer: 64 << 20 }));
} finally { rmSync(paket, { force: true }); }
console.log(`proje: ${PROJE} · ${uretim.sar} .sar · kırık ${uretim.kirik} · seçili düğüm: ${uretim.secili || "(yok)"}`);

// ── 2. Playwright ───────────────────────────────────────────────────────────
async function playwrightYukle() {
  const adaylar = [];
  if (process.env.SARMAL_PLAYWRIGHT) {
    const y = resolve(process.env.SARMAL_PLAYWRIGHT);
    adaylar.push(y.endsWith(".mjs") || y.endsWith(".js") ? y : join(y, "index.mjs"));
  }
  for (const kok of [EKLENTI, process.cwd()]) {
    try { adaylar.push(createRequire(join(kok, "package.json")).resolve("playwright")); } catch { /* yok */ }
  }
  for (const a of adaylar) {
    if (!existsSync(a)) continue;
    const m = await import(pathToFileURL(a).href);
    return m.chromium ?? m.default?.chromium;
  }
  console.error("playwright bulunamadı: SARMAL_PLAYWRIGHT=<playwright paketinin dizini> verin ya da çalışma dizininde kurulu olsun.");
  process.exit(2);
}
const chromium = await playwrightYukle();

/** Koyu VS Code temasının (Dark Modern) panelde kullanılan renkleri. */
const KOYU = {
  "--vscode-sideBar-background": "#181818", "--vscode-foreground": "#cccccc", "--vscode-descriptionForeground": "#9d9d9d",
  "--vscode-list-hoverBackground": "#2a2d2e", "--vscode-list-activeSelectionBackground": "#04395e", "--vscode-list-activeSelectionForeground": "#ffffff",
  "--vscode-list-inactiveSelectionBackground": "#37373d", "--vscode-list-inactiveSelectionForeground": "#cccccc", "--vscode-focusBorder": "#0078d4",
  "--vscode-charts-yellow": "#cca700", "--vscode-charts-blue": "#3794ff", "--vscode-charts-orange": "#d18616", "--vscode-charts-green": "#89d185",
  "--vscode-charts-red": "#f14c4c", "--vscode-charts-purple": "#b180d7", "--vscode-errorForeground": "#f85149", "--vscode-testing-iconPassed": "#73c991",
  "--vscode-disabledForeground": "#868686", "--vscode-panel-border": "#2b2b2b", "--vscode-sideBarSectionHeader-border": "#2b2b2b",
  "--vscode-badge-background": "#616161", "--vscode-badge-foreground": "#f8f8f8", "--vscode-textLink-foreground": "#4daafc",
  "--vscode-toolbar-hoverBackground": "rgba(90,93,94,.31)", "--vscode-icon-foreground": "#cccccc", "--vscode-editorWidget-background": "#202020",
  "--vscode-editor-background": "#1f1f1f", "--vscode-widget-border": "#313131", "--vscode-tree-indentGuidesStroke": "#585858",
  "--vscode-tree-inactiveIndentGuidesStroke": "rgba(88,88,88,.4)", "--vscode-editorWarning-foreground": "#cca700", "--vscode-sarmal-kenar": "#ff79c6",
  // Karar kademesinin gerekçe kutusu ve düğmeleri (PNL-A07): Dark Modern'in giriş ve ikincil düğme renkleri.
  "--vscode-input-background": "#313131", "--vscode-input-foreground": "#cccccc", "--vscode-input-border": "#3c3c3c",
  "--vscode-input-placeholderForeground": "#989898", "--vscode-button-secondaryBackground": "#313131",
  "--vscode-button-secondaryForeground": "#cccccc", "--vscode-button-secondaryHoverBackground": "#3c3c3c",
  "--vscode-button-border": "rgba(255,255,255,.07)", "--vscode-inputValidation-errorBackground": "#5a1d1d",
  "--vscode-inputValidation-errorBorder": "#be1100",
  "--vscode-font-family": "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

// ── 3. Tarayıcı ölçümleri (sayfa içinde koşan işlevler) ─────────────────────
function seritOlc() {
  const s = document.querySelector(".seritler");
  if (!s) return { var: false };
  const r = s.getBoundingClientRect();
  const ust = document.elementFromPoint(Math.min(innerWidth - 2, r.left + 20), r.top + r.height / 2);
  return { var: true, top: r.top, yukseklik: r.height, ustte: !!ust && s.contains(ust), scrollY };
}
/**
 * Sekme geçişinin anlık durumu (PNL-A18): seçili sekme, görünen kaplar, görünen içeriğin hangi sekmeye
 * ait olduğu (içeriğin kendi işaretinden okunur, kabın etiketinden değil) ve görünen kabın boyu.
 */
function sekmeDurumu() {
  const secili = [...document.querySelectorAll(".sekme")].filter((b) => b.getAttribute("aria-selected") === "true").map((b) => b.dataset.sekme);
  const gorunen = [...document.querySelectorAll(".sekme-paneli")].filter((p) => !p.hidden && p.getBoundingClientRect().height > 0);
  const sahibi = (p) => p.querySelector("#agac") ? "ray" : p.querySelector("#tren-agac") ? "tren" : p.querySelector("#makinist-agac") ? "makinist"
    : p.querySelector("#sinyaller-agac") ? "sinyaller"
    : p.querySelector("[data-bos-sekme]")?.getAttribute("data-bos-sekme") ?? "?";
  return { secili: secili.join(), gorunen: gorunen.map((p) => p.dataset.sekme), icerik: gorunen.map(sahibi), yukseklik: gorunen.map((p) => Math.round(p.getBoundingClientRect().height)) };
}
function kaydir(kip) {
  const host = document.getElementById("graf");
  const kok = host?.shadowRoot;
  // Kayan alanlar (PNL-A03): belge kaymaz; içerik alanı ve geniş paneldeki sütun gövdeleri kendi içinde kayar.
  // PNL-A18'den beri kayan alan görünen sekmenin kabıdır (.sekme-paneli).
  const alanlar = [document.scrollingElement, document.getElementById("icerik"), ...document.querySelectorAll(".sekme-paneli"), ...document.querySelectorAll(".kol>.bolum")].filter(Boolean);
  if (kip === "ust") for (const a of alanlar) a.scrollTop = 0;
  else if (kip === "dip") for (const a of alanlar) a.scrollTop = a.scrollHeight;
  else if (kip === "graf") {
    const h = document.querySelector("h2.araya");
    if (h) h.scrollIntoView({ block: "start" });
  } else if (kip === "secili") {
    const e = kok?.querySelector(".secili");
    if (e) e.scrollIntoView({ block: "center" });
  }
}
/**
 * Panel yerleşiminin ölçüsü (PNL-A03): şerit, sekmeler, içerik alanı ve Ray sütunları. Sütun, bir
 * bölümün başlığı ile gövdesini taşıyan kutudur; başlığın sütunun üstünde durması, hiçbir başlığın
 * bir kutunun dibinde kalmadığı demektir.
 */
function duzenOlc() {
  const serit = document.querySelector(".seritler");
  const sr = serit?.getBoundingClientRect();
  const sekmeYazi = [...new Set([...document.querySelectorAll(".sekme .sk-ad")].map((e) => getComputedStyle(e).fontSize))];
  const sira = [...document.querySelectorAll(".sekme")].map((b) => b.dataset.sekme);
  // Görünen sekme adı kesilmez (üç nokta yok); dar şeritte yalnız simgeyle duran sekmenin adı 1 pikseldir ve sayılmaz.
  const kesik = [...document.querySelectorAll(".sekme .sk-ad")].filter((e) => e.offsetWidth > 1 && e.scrollWidth > e.clientWidth)
    .map((e) => e.textContent);
  const sekmeGen = [...document.querySelectorAll(".sekme")].reduce((t, b) => t + b.getBoundingClientRect().width, 0);
  const ir = document.getElementById("icerik")?.getBoundingClientRect();
  const yuvarla = (x) => (x === undefined ? undefined : Math.round(x * 10) / 10);
  const kollar = [...document.querySelectorAll(".ray-duzen > .kol")].map((k) => {
    const r = k.getBoundingClientRect();
    const bas = k.querySelector(":scope > .bas");
    const br = bas?.getBoundingClientRect();
    const govde = k.querySelector(":scope > .bolum");
    return {
      kol: k.dataset.kol, sol: yuvarla(r.left), ust: yuvarla(r.top), alt: yuvarla(r.bottom), gen: yuvarla(r.width),
      basUst: yuvarla(br?.top), basYazi: bas ? getComputedStyle(bas.querySelector(".bb") ?? bas).fontSize : null,
      govdeYuk: govde && !govde.hidden ? yuvarla(govde.getBoundingClientRect().height) : 0,
    };
  });
  // Beş sekmenin kabı da belgededir (PNL-A18); ölçülen boş durum cümlesi görünen kabınkidir.
  const bos = document.querySelector(".sekme-paneli:not([hidden]) .bos[data-bos-sekme]");
  return {
    W: innerWidth, H: innerHeight, seritYuk: yuvarla(sr?.height ?? 0), seritAlt: yuvarla(sr?.bottom ?? 0), sekmeYazi, sira, kesik,
    seritTasma: yuvarla(sekmeGen - (sr?.width ?? 0)),
    icerikUst: yuvarla(ir?.top), icerikAlt: yuvarla(ir?.bottom), yatayTasma: document.documentElement.scrollWidth - innerWidth, kollar,
    bosSekme: bos ? { metin: bos.textContent.trim(), gen: bos.getBoundingClientRect().width } : null,
  };
}
/** Bir Ray bölümünün başlığına tıklar (katlar ya da açar). */
function basligaTikla(bolum) {
  document.querySelector(`.bb[data-bolum="${bolum}"]`)?.click();
}
function grafOlc() {
  const host = document.getElementById("graf");
  const kok = host?.shadowRoot;
  if (!kok) return { golge: false };
  const hr = host.getBoundingClientRect();
  const hepsi = [...kok.querySelectorAll("*")].filter((e) => !e.closest("style"));
  let taskin = 0;
  for (const e of hepsi) { const r = e.getBoundingClientRect(); if (r.height > 0 && r.bottom > hr.bottom + 1) taskin = Math.max(taskin, r.bottom - hr.bottom); }
  // SVG <title> ipucudur, boyanmaz; ölçülmez.
  const yazili = hepsi.filter((e) => !e.closest("title") && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()));
  const yazisiz = yazili.filter((e) => {
    const r = e.getBoundingClientRect();
    const cs = getComputedStyle(e);
    if (cs.display === "none" || e.closest("[hidden]")) return false;   // bilinçli gizli (dar panelde tip sütunu)
    return !(r.width > 0 && r.height > 0 && r.left >= -1 && r.left < innerWidth && cs.visibility !== "hidden" && cs.opacity !== "0");
  });
  const dugumler = [...kok.querySelectorAll(".dugum")].filter((e) => !(e instanceof SVGElement));   // Klasik görünümün düğümleri SVG çizimidir, satır değildir
  const sat = parseFloat(getComputedStyle(dugumler[0] ?? host).getPropertyValue("--sat")) || 0;
  const yanlisBoy = dugumler.filter((e) => Math.abs(e.getBoundingClientRect().height - sat) > 0.5).length;
  const serit = kok.querySelector("svg.serit");
  const graf = kok.querySelector(".graf");
  const secili = kok.querySelector(".secili");
  return {
    golge: true, yaziliOge: yazili.length, yazisiz: yazisiz.length, yazisizOrnek: yazisiz.slice(0, 3).map((e) => e.textContent.trim().slice(0, 30)),
    taskinPx: Math.round(taskin), dugum: dugumler.length, satPx: sat, yanlisBoy,
    seritBag: serit ? serit.querySelectorAll("path").length : null,
    seritTaskin: serit && graf ? Math.round(serit.getBoundingClientRect().bottom - graf.getBoundingClientRect().bottom) : null,
    secili: !!secili, agacGorunumu: dugumler.length > 0,
  };
}
/** Ana yazıların ekranda boyanan boyutu (SVG içinde ölçekle çarpılır). */
function yaziBoyutu({ secici, kokSecici }) {
  const kok = kokSecici ? document.getElementById(kokSecici)?.shadowRoot : document;
  if (!kok) return { adet: 0 };
  const boy = [...kok.querySelectorAll(secici)].filter((e) => e.getClientRects().length).map((e) => {
    let px = parseFloat(getComputedStyle(e).fontSize);
    const svg = e.ownerSVGElement;
    if (svg && svg.viewBox.baseVal && svg.viewBox.baseVal.width) px *= svg.getBoundingClientRect().width / svg.viewBox.baseVal.width;
    return Math.round(px * 10) / 10;
  });
  return { adet: boy.length, enAz: boy.length ? Math.min(...boy) : 0, enCok: boy.length ? Math.max(...boy) : 0 };
}
function seciliGorunurMu() {
  const kok = document.getElementById("graf")?.shadowRoot;
  const e = kok?.querySelector(".secili");
  if (!e) return { var: false };
  const r = e.getBoundingClientRect();
  const ad = e.querySelector(".ad") ?? e;
  const ar = ad.getBoundingClientRect();
  const nokta = kok.elementFromPoint(Math.min(innerWidth - 2, ar.left + 4), ar.top + ar.height / 2);
  return { var: true, ekranda: r.top >= 0 && r.bottom <= innerHeight, yaziGenislik: ar.width, ustte: !!nokta && e.contains(nokta) };
}
function kilavuzOlc({ agac = "#agac", tul } = {}) {
  const satirlar = [...document.querySelectorAll(`${agac} .sat`)];
  const derin = satirlar.filter((s) => Number(s.dataset.d) > 0);
  const cizili = derin.filter((s) => {
    const b = getComputedStyle(s, "::before");
    return b.content !== "none" && b.backgroundImage !== "none" && parseFloat(b.width) > 0 && Number(b.opacity) > 0;
  });
  // Çizgi ince (10 ile 11 piksel arası, 1 piksel) ve tül morunun ince çizgi tonundadır (PNL-A04).
  const norm = (c) => String(c).replace(/\s+/g, "").replace(/rgba\((\d+,\d+,\d+),1\)/g, "rgb($1)");
  const morInce = tul ? cizili.filter((s) => {
    const g = norm(getComputedStyle(s, "::before").backgroundImage);
    return g.includes(`${norm(tul.cizgi)}10px`) && g.includes(`${norm(tul.cizgi)}11px`);
  }).length : null;
  const etkin = [...document.querySelectorAll(`${agac} .sat.kl`)].filter((s) => parseFloat(getComputedStyle(s, "::after").borderLeftWidth) > 0);
  return { satir: satirlar.length, derinSatir: derin.length, kilavuzlu: cizili.length, morInce, etkin: etkin.length,
    agacUzerinde: !!document.querySelector('[role="tree"]:hover') };
}
/**
 * Fare vurgusunun hedefi (PNL-A04): ekranda görünen, açıklaması ve simgesi olan, seçili olmayan
 * en derin satır; fare satırın adının ortasına götürülür.
 */
function vurguHedefi(agac) {
  const altSinir = document.querySelector(".seritler")?.getBoundingClientRect().bottom ?? 0;
  const adaylar = [...document.querySelectorAll(`${agac} .sat`)].filter((s) => {
    const r = s.getBoundingClientRect();
    return Number(s.dataset.d) > 0 && !s.classList.contains("sec") && r.top >= altSinir + 24 && r.bottom <= innerHeight - 4 && r.width > 0;
  });
  const puan = (s) => Number(s.dataset.d) * 4 + (s.querySelector(".ac") ? 2 : 0) + (s.querySelector(".ik") ? 1 : 0);
  const s = adaylar.reduce((a, x) => (!a || puan(x) > puan(a) ? x : a), undefined);
  if (!s) return { var: false };
  const r = (s.querySelector(".et") ?? s).getBoundingClientRect();
  return { var: true, id: s.dataset.id, x: r.left + Math.min(r.width / 2, 30), y: r.top + r.height / 2 };
}
/** Bir satırın vurgu ölçüsü: dalın işaretli satırları ve tonları, satırın açıklama rengi ve simge süzgeci. */
function vurguOlc({ agac, id, tul }) {
  const norm = (c) => String(c).replace(/\s+/g, "").replace(/rgba\((\d+,\d+,\d+),1\)/g, "rgb($1)");
  const kok = document.querySelector(agac);
  const s = [...(kok?.querySelectorAll(".sat") ?? [])].find((x) => x.dataset.id === id);
  if (!s) return { var: false };
  const dv = [...kok.querySelectorAll(".sat.dv")];
  const ac = s.querySelector(".ac");
  const ik = s.querySelector(".ik");
  return {
    var: true, ustunde: s.matches(":hover"), dv: dv.length,
    dvTamTon: dv.filter((x) => norm(getComputedStyle(x, "::before").backgroundImage).includes(norm(tul.vurgu))).length,
    // Vurgu katmanı seçimin etkin çizgisinin (kl::after) üstünde boyanır; yoksa seçili dalda örtülür.
    dvUstte: dv.filter((x) => getComputedStyle(x, "::before").zIndex !== "auto").length,
    seciliDalda: dv.some((x) => x.classList.contains("kl")),
    satirDalda: s.classList.contains("dv") || s.getAttribute("aria-expanded") === "true",
    acRenk: ac ? norm(getComputedStyle(ac).color) : null, vurgu: norm(tul.vurgu),
    ikFiltre: ik ? getComputedStyle(ik).filter : null,
  };
}
/**
 * Mini Graf'ta dosyaya götüren ilk düğüm bağı ve kullanıcının tıklayacağı nokta (düğümün adı).
 * Bağ HTML `<a>` (Ağaç, İlerleme) ya da SVG `<a>` (Klasik) olabilir; ikisi de `a` seçicisine uyar.
 */
function grafBagHedefi() {
  const kok = document.getElementById("graf")?.shadowRoot;
  const bag = kok && [...kok.querySelectorAll("a")].find((a) => (a.getAttribute("href") ?? "").startsWith("command:sarmal.dosyaAc"));
  if (!bag) return { var: false };
  bag.scrollIntoView({ block: "center", inline: "start" });
  const ad = bag.querySelector(".ad, text.etiket") ?? bag;
  const r = ad.getBoundingClientRect();
  const x = Math.min(innerWidth - 2, r.left + Math.min(r.width / 2, 20)), y = r.top + r.height / 2;
  const ust = kok.elementFromPoint(x, y);
  return { var: true, x, y, href: bag.getAttribute("href"), ad: bag.namespaceURI === "http://www.w3.org/2000/svg" ? "SVG a" : "HTML A",
    tagName: bag.tagName, ustte: !!ust && bag.contains(ust) };
}
/** `command:sarmal.dosyaAc?[dosya, satır]` bağının argümanları dosya ve satır mı (panelin komut köprüsünün kuralı)? */
function dosyaAcBagiGecerli(href) {
  const i = href.indexOf("?");
  if (!href.startsWith("command:sarmal.dosyaAc?") || i < 0) return false;
  try {
    const a = JSON.parse(decodeURIComponent(href.slice(i + 1)));
    return Array.isArray(a) && typeof a[0] === "string" && typeof a[1] === "number";
  } catch { return false; }
}

// ── 4. Koşu ─────────────────────────────────────────────────────────────────
const kontroller = [];
/** `bekleyen`: kontrol bugün bilerek kırmızıdır; değer onu yeşile çevirecek Adımın kodudur (başlıktaki BEKLENEN KIRMIZI). */
const kontrol = (ad, gecti, ayrinti, bekleyen) => { kontroller.push({ ad, gecti: !!gecti, ayrinti, ...(bekleyen ? { bekleyen } : {}) }); };
const goruntuler = [];
const tarayici = await chromium.launch();
try {
  for (const d of uretim.degiskeler) {
    for (const B of BOYUTLAR) {
      const W = B.ad;
      const p = await tarayici.newPage({ viewport: { width: B.w, height: B.h } });
      const hatalar = [];
      p.on("pageerror", (e) => hatalar.push(e.message));
      await p.addInitScript(() => {
        window.__iletiler = [];
        window.acquireVsCodeApi = () => ({ postMessage(m) { window.__iletiler.push(m); }, setState() {}, getState() {} });
      });
      await p.goto(pathToFileURL(join(HTML_DIZIN, `${d.ad}.html`)).href, { waitUntil: "load" });
      await p.evaluate((renkler) => {
        const r = document.documentElement;
        for (const [k, v] of Object.entries(renkler)) r.style.setProperty(k, v);
        r.style.background = renkler["--vscode-sideBar-background"];
        document.body.className = "vscode-dark";
      }, KOYU);
      const etiket = `${d.ad} @${W}`;
      /**
       * Ağaç çizgileri ve fare vurgusu (PNL-A04 · Founder 2026-10-27), üç ağaçta aynı ölçü: fare ağacın
       * dışındayken çizgiler ince ve tül morunda çizilidir; fare bir satırın üzerine gelince o dalın
       * çizgisi tam tona geçer, satırın gri açıklaması o tona boyanır ve simgesi ışır; fare çıkınca söner.
       */
      const agacCizgisiOlc = async (agac, ad) => {
        await p.evaluate(kaydir, "ust");
        await p.mouse.move(2, 2);
        await p.waitForTimeout(120);
        const f = await p.evaluate(kilavuzOlc, { agac, tul: uretim.tul });
        kontrol(`${etiket}: ${ad} ağacında girinti çizgileri fare dışındayken çizili, ince (1 px) ve tül morunda`,
          !f.agacUzerinde && f.derinSatir > 0 && f.kilavuzlu === f.derinSatir && f.morInce === f.derinSatir, JSON.stringify(f));
        const h = await p.evaluate(vurguHedefi, agac);
        if (!h.var) { kontrol(`${etiket}: ${ad} ağacında fare vurgusu ölçülebilir`, false, "ekranda vurgulanacak derin satır yok"); return; }
        await p.mouse.move(h.x, h.y);
        await p.waitForTimeout(120);
        const v = await p.evaluate(vurguOlc, { agac, id: h.id, tul: uretim.tul });
        kontrol(`${etiket}: ${ad} ağacında fare üzerindeki satırın dalının çizgisi tül morunun tam tonuna geçer`,
          v.ustunde && v.dv > 0 && v.dvTamTon === v.dv && v.dvUstte === v.dv && v.satirDalda, JSON.stringify({ ...v, id: h.id }));
        kontrol(`${etiket}: ${ad} ağacında fare üzerindeki satırın gri açıklaması ve simgesi renklenir`,
          v.ustunde && (v.acRenk === null || v.acRenk === v.vurgu) && (v.ikFiltre === null || /drop-shadow/.test(v.ikFiltre))
            && (v.acRenk !== null || v.ikFiltre !== null),
          JSON.stringify({ acRenk: v.acRenk, vurgu: v.vurgu, ikFiltre: v.ikFiltre }));
        const vurgu = `${d.ad}-${W}-vurgu.png`;
        await p.screenshot({ path: join(CIKTI, vurgu) });
        goruntuler.push(vurgu);
        await p.mouse.move(2, 2);
        await p.waitForTimeout(120);
        const s = await p.evaluate(vurguOlc, { agac, id: h.id, tul: uretim.tul });
        kontrol(`${etiket}: ${ad} ağacında fare satırdan çıkınca vurgu söner`,
          s.var && !s.ustunde && s.dv === 0 && s.acRenk !== s.vurgu && (s.ikFiltre === null || s.ikFiltre === "none"),
          JSON.stringify(s));
      };
      const cek = async (kip) => {
        await p.evaluate(kaydir, kip);
        await p.waitForTimeout(150);
        const dosya = `${d.ad}-${W}-${kip}.png`;
        await p.screenshot({ path: join(CIKTI, dosya) });
        goruntuler.push(dosya);
      };
      kontrol(`${etiket}: betik hatasız`, hatalar.length === 0, hatalar.join(" | "));
      // ── Yerleşim (PNL-A03): ölçüm açılış hâlinde, hiçbir şey kaydırılmadan yapılır. ──
      const dz = await p.evaluate(duzenOlc);
      const yakin = (a, b) => a !== undefined && b !== undefined && Math.abs(a - b) <= 1;
      kontrol(`${etiket}: sekme şeridi yazısı ${SEKME_YAZI} ve şerit ${SERIT_PX} px`,
        dz.sekmeYazi.length === 1 && dz.sekmeYazi[0] === SEKME_YAZI && Math.abs(dz.seritYuk - SERIT_PX) < 0.5,
        JSON.stringify({ sekmeYazi: dz.sekmeYazi, seritYuk: dz.seritYuk }));
      const beklenenSira = d.sira ?? SEKME_SIRASI;
      kontrol(`${etiket}: sekmeler ${d.sira ? "kullanıcının sırasıyla" : "paketin varsayılan sırasıyla"} (${beklenenSira.join(" · ")})`,
        dz.sira.join(",") === beklenenSira.join(","), dz.sira.join(","));
      if (d.sira) {
        // PNL-A23: panel sıranın ilk sekmesiyle açılır; rozetler sekmeleriyle birlikte taşınır.
        const ac = await p.evaluate(sekmeDurumu);
        const rz = await p.evaluate(() => [...document.querySelectorAll(".sekme")].map((b) => [b.dataset.sekme, [...b.querySelectorAll(".rozet")].map((r) => r.className).join("+")]));
        kontrol(`${etiket}: panel sıranın ilk sekmesiyle (${d.sira[0]}) açılır ve o sekmenin içeriği görünür`,
          ac.secili === d.sira[0] && ac.gorunen.join() === d.sira[0] && ac.icerik.join() === d.sira[0], JSON.stringify(ac));
        kontrol(`${etiket}: rozetler kendi sekmeleriyle birlikte taşınır (Makinist sayısı Makinist'te, Dur ve Dikkat Sinyaller'de)`,
          rz.every(([s, r]) => r === (s === "makinist" ? "rozet" : s === "sinyaller" ? "rozet dur+rozet dikkat" : "")), JSON.stringify(rz));
      }
      kontrol(`${etiket}: sekme şeridi taşmaz ve görünen hiçbir sekme adı kesilmez`,
        dz.seritTasma <= 0.5 && dz.kesik.length === 0, JSON.stringify({ seritTasma: dz.seritTasma, kesik: dz.kesik }));
      kontrol(`${etiket}: içerik alanı şeridin hemen altından panelin dibine uzanır (küçük kutu ya da boş alt yok)`,
        yakin(dz.icerikUst, dz.seritAlt) && yakin(dz.icerikAlt, dz.H) && dz.yatayTasma <= 0,
        JSON.stringify({ seritAlt: dz.seritAlt, icerikUst: dz.icerikUst, icerikAlt: dz.icerikAlt, H: dz.H, yatayTasma: dz.yatayTasma }));
      if (d.sekme === "ray") {
        const [ag, gr] = dz.kollar;
        kontrol(`${etiket}: Yol Haritası ve Mini Graf başlıkları ${BASLIK_YAZI}`,
          dz.kollar.length === 2 && dz.kollar.every((k) => k.basYazi === BASLIK_YAZI), JSON.stringify(dz.kollar.map((k) => [k.kol, k.basYazi])));
        kontrol(`${etiket}: başlıklar sütunlarının üstündedir; hiçbir başlık bir kutunun dibinde kalmaz`,
          dz.kollar.length === 2 && dz.kollar.every((k) => yakin(k.basUst, k.ust)), JSON.stringify(dz.kollar));
        if (B.w >= GENIS_PANEL_PX) {
          const alan = dz.icerikAlt - dz.icerikUst;
          kontrol(`${etiket}: geniş panelde Yol Haritası ile Mini Graf yan yana iki sütundur ve panelin dibine uzanır (boşluk yok)`,
            ag && gr && yakin(ag.ust, gr.ust) && ag.sol < gr.sol && ag.gen >= 0.3 * dz.W && gr.gen >= 0.3 * dz.W
              && ag.gen + gr.gen >= dz.W - 2 && yakin(ag.alt, dz.H) && yakin(gr.alt, dz.H),
            JSON.stringify(dz.kollar));
          kontrol(`${etiket}: geniş panelde sıkışma yok: her sütunun gövdesi içerik alanının en az %80'i boyundadır`,
            ag && gr && ag.govdeYuk >= 0.8 * alan && gr.govdeYuk >= 0.8 * alan,
            JSON.stringify({ alan, govde: dz.kollar.map((k) => [k.kol, k.govdeYuk]) }));
        } else {
          kontrol(`${etiket}: dar panelde Yol Haritası ile Mini Graf alt alta durur`,
            ag && gr && yakin(ag.sol, gr.sol) && gr.ust >= ag.alt - 1, JSON.stringify(dz.kollar));
        }
      }
      if (d.sekme === "ayarlar") {
        kontrol(`${etiket}: ${d.sekme} sekmesi boş bölüm olarak doğar ve boş durum cümlesi görünür`,
          !!dz.bosSekme && dz.bosSekme.metin.length > 0 && dz.bosSekme.gen > 0, JSON.stringify(dz.bosSekme));
      }
      // Sekme şeridi: üstte ve kaydırınca da üstte.
      for (const kip of ["ust", "dip"]) {
        await p.evaluate(kaydir, kip);
        await p.waitForTimeout(60);
        const s = await p.evaluate(seritOlc);
        kontrol(`${etiket}: sekme şeridi görünür ve üstte (${kip === "ust" ? "başta" : "en alta kaydırınca"})`,
          s.var && Math.abs(s.top) < 1 && s.yukseklik > 0 && s.ustte, JSON.stringify(s));
      }
      if (d.sekme !== "ray" || d.ad === "ray") await cek("ust");
      if (d.sekme !== "ray" || d.ad === "ray") {
        const y = await p.evaluate(yaziBoyutu, { secici: ".sat .et", kokSecici: null });
        kontrol(`${etiket}: ağaç satırı yazı boyutu ${YAZI_EN_AZ}–${YAZI_EN_COK} px`, y.adet === 0 || (y.enAz >= YAZI_EN_AZ && y.enCok <= YAZI_EN_COK), JSON.stringify(y));
      }
      if (d.ad === "tren") await agacCizgisiOlc("#tren-agac", "Tren");
      if (d.ad === "makinist") await agacCizgisiOlc("#makinist-agac", "Makinist");
      if (d.ad === "makinist") {
        // PNL-A09 (OZK-14): gözlem kayıtları Makinist'te görünmez.
        const g = await p.evaluate(() => [...document.querySelectorAll("#makinist-agac .sat .et")].map((e) => e.textContent));
        kontrol(`${etiket}: Makinist'te Gözlemler grubu yoktur (Sinyaller sekmesine taşındı)`, !g.includes("Gözlemler") && !g.includes("Observations"), JSON.stringify(g));
      }
      if (d.ad === "sinyaller" || d.ad === "sinyaller-acik") {
        // SİNYALLER (PNL-A09 · OZK-14 · YUZ-3.3): yalnız üç bant, ayrı Gözlemler bölümü yok; Bilgi kapalı başlar;
        // satır gerçek fare tıklamasıyla dosyayı tanının yerinde açan iletiyi doğurur.
        const s = await p.evaluate(() => {
          const satirlar = [...document.querySelectorAll("#sinyaller-agac .sat")];
          const oku = (x) => ({ id: x.dataset.id, d: Number(x.dataset.d), et: x.querySelector(".et")?.textContent ?? "",
            ac: x.querySelector(".ac")?.textContent ?? "", acik: x.getAttribute("aria-expanded"), komut: x.dataset.komut === "1",
            gorunur: x.getBoundingClientRect().height > 0 });
          return satirlar.map(oku);
        });
        const kokler = s.filter((x) => x.d === 0);
        kontrol(`${etiket}: Sinyaller yalnız üç bant (Dur · Dikkat · Bilgi) taşır, ayrı Gözlemler bölümü yoktur; başlık sayıyı ve düzeyin anlamını söyler`,
          kokler.map((x) => x.et).join() === "Dur,Dikkat,Bilgi" && kokler.every((x) => /^\d+ · .+\.$/.test(x.ac)), JSON.stringify(kokler));
        // Her tanı panelde bir kez (YUZ-3.3): Sinyaller = denetim sonucu eksi Hatırlatıcılar yüzeyine yönlenenler;
        // Bilgi bandı durum çubuğundaki Gözlemler sayacına eşittir; Hatırlatıcılar yüzeyine yönlenen hiçbir kod çizilmez.
        const sy = uretim.sinyal;
        const bantSayisi = kokler.map((x) => Number(x.ac.split(" · ")[0]));
        kontrol(`${etiket}: Sinyaller sayısı denetim sonucu eksi Hatırlatıcılar yüzeyine yönlenenlerdir; Bilgi bandı durum çubuğundaki Gözlemler sayacına eşittir`,
          sy.toplam === sy.denetim - sy.hatirlatici && bantSayisi.reduce((t, n) => t + n, 0) === sy.toplam && bantSayisi[2] === sy.durumCubuguGozlem,
          JSON.stringify({ denetim: sy.denetim, hatirlatici: sy.hatirlatici, toplam: sy.toplam, bantSayisi, durumCubuguGozlem: sy.durumCubuguGozlem }));
        const hatirlaticiSatiri = s.filter((x) => x.d === 2 && sy.hatirlaticiKodlari.includes(x.ac.split(" · ")[0]));
        kontrol(`${etiket}: Hatırlatıcılar yüzeyine yönlenen tanı Sinyaller'de çizilmez`, hatirlaticiSatiri.length === 0, JSON.stringify(hatirlaticiSatiri.slice(0, 3)));
        if (d.ad === "sinyaller-acik") {
          const tanilar = s.filter((x) => x.d === 2);
          kontrol(`${etiket}: bütün bantlar açıkken çizilen tanı satırı tekil kayıt sayısına eşittir (hiçbir tanı iki kez çizilmez)`,
            tanilar.length === sy.toplam && new Set(s.map((x) => x.id)).size === s.length, JSON.stringify({ cizilen: tanilar.length, toplam: sy.toplam, satir: s.length }));
        }
        if (d.ad === "sinyaller") kontrol(`${etiket}: Bilgi bandı kapalı başlar`, kokler[2]?.acik !== "true", JSON.stringify(kokler[2]));
        // Bant simgesi sayı sıfır olsa da düzeyinin rengini taşır (Founder 2026-10-28): Dur kırmızı, Dikkat sarı,
        // Bilgi mavi; tanı satırının işareti bandıyla aynı renktir. Renk, sayfanın gerçekten çizdiği simgeden okunur.
        const simgeRengi = await p.evaluate(() => [...document.querySelectorAll("#sinyaller-agac .sat")].map((x) => {
          const ik = x.querySelector(".ik");
          const m = ik ? /url\("data:image\/svg\+xml,(.*)"\)/.exec(getComputedStyle(ik).backgroundImage) : null;
          const svg = m ? decodeURIComponent(m[1]) : "";
          return { d: Number(x.dataset.d), renk: [...new Set((svg.match(/#[0-9a-fA-F]{6}\b/g) ?? []).map((r) => r.toUpperCase()))].sort().join() };
        }));
        const bantRengi = ["hata", "uyari", "bilgi"].map((a) => [...new Set((readFileSync(join(EKLENTI, "medya", "simgeler", "uretilmis", `satir-sinyal-${a}-koyu.svg`), "utf8")
          .match(/#[0-9a-fA-F]{6}\b/g) ?? []).map((r) => r.toUpperCase()))].sort().join());
        const bantSimgeleri = simgeRengi.filter((x) => x.d === 0).slice(0, 3).map((x) => x.renk);
        kontrol(`${etiket}: bant simgesi sayı sıfır olsa da düzeyinin rengini taşır (Dur kırmızı · Dikkat sarı · Bilgi mavi)`,
          bantSimgeleri.join("|") === bantRengi.join("|") && new Set(bantRengi).size === 3, JSON.stringify({ bantSimgeleri, bantRengi, sayilar: kokler.slice(0, 3).map((x) => x.ac.split(" · ")[0]) }));
        let bantNo = -1;
        const ayriRenk = [];
        for (const x of simgeRengi) {
          if (x.d === 0) bantNo++;
          else if (x.d === 2 && bantNo < 3 && x.renk !== bantRengi[bantNo]) ayriRenk.push({ bant: bantNo, renk: x.renk });
        }
        if (d.ad === "sinyaller-acik") kontrol(`${etiket}: tanı satırının işareti bandının simgesiyle aynı renktir`, ayriRenk.length === 0, JSON.stringify(ayriRenk.slice(0, 5)));
        // Bant adı dar panelde de kısalmaz; tanı satırında kod, dosya ve satır görünür kalır (uzun ileti kısalır).
        const kesik = await p.evaluate(() => ({
          bant: [...document.querySelectorAll('#sinyaller-agac .sat[data-d="0"] .et')].filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent),
          yer: [...document.querySelectorAll('#sinyaller-agac .sat[data-d="2"] .ac')].filter((e) => e.offsetWidth > 0 && e.scrollWidth > e.clientWidth + 1).length,
        }));
        kontrol(`${etiket}: Sinyaller bant adı kısalmaz`, kesik.bant.length === 0, JSON.stringify(kesik));
        const tani = d.ad === "sinyaller-acik" ? s.find((x) => x.d === 2 && x.komut && x.gorunur) : undefined;
        if (d.ad === "sinyaller") { /* açık değişke tıklamayı ölçer */ }
        else if (!tani) kontrol(`${etiket}: Sinyaller satırı ölçülebilir`, false, "görünür tanı satırı yok");
        if (tani) {
          await p.evaluate(() => { window.__iletiler.length = 0; });
          await p.click(`#sinyaller-agac .sat[data-id="${tani.id.replace(/(["\\])/g, "\\$1")}"] .et`);
          const ileti = await p.evaluate(() => window.__iletiler.filter((m) => m.tip === "ac"));
          // Satırın kimliği tanının yerini taşır (sinyaller.ts: kod@dosya:satır:sütun) ve açıklaması aynı dosya:satırı gösterir.
          const yer = /@([^@/]+):(\d+):\d+(?:#\d+)?$/.exec(tani.id);
          const dosyaAdi = yer ? yer[1] : "";
          kontrol(`${etiket}: Sinyal satırına gerçek tıklama dosyayı tanının yerinde açan iletiyi doğurur (satırın gösterdiği dosya:satır)`,
            ileti.length === 1 && ileti[0].id === tani.id && !!yer && tani.ac.includes(`${dosyaAdi}:${yer[2]}`),
            JSON.stringify({ tani, ileti }));
        }
      }
      if (d.ad === "makinist-onay") {
        // Karar kademesi (OZK-13 · PNL-A07): panelin içinde, açık kapının satırının hemen altında ve tektir.
        const k = await p.evaluate(() => {
          const kademeler = [...document.querySelectorAll("#makinist-agac .kademe")];
          const kademe = kademeler[0];
          const satir = kademe?.previousElementSibling;
          const alan = kademe?.querySelector("textarea.not-metin");
          const dugmeler = kademe ? [...kademe.querySelectorAll(".karar-satiri")] : [];
          const ar = alan?.getBoundingClientRect();
          const kr = kademe?.getBoundingClientRect();
          return {
            kademe: kademeler.length, satirHemenUstte: !!satir && satir.classList.contains("sat") && satir.getAttribute("aria-expanded") === "true",
            satirKimligi: satir?.dataset.id, alanGen: ar ? Math.round(ar.width) : 0, alanGorunur: !!ar && ar.height > 0 && ar.top < innerHeight,
            dugme: dugmeler.length, roller: dugmeler.map((b) => b.dataset.rol), dugmeGorunur: dugmeler.every((b) => b.getBoundingClientRect().height > 0),
            kademeAlti: kr ? Math.round(kr.bottom) : 0, H: innerHeight, editorKarti: !!document.querySelector("iframe"),
          };
        });
        kontrol(`${etiket}: onay kararı panelde: açık kapının karar kademesi satırın hemen altında ve tektir; gerekçe kutusu ile üç eylem görünür`,
          k.kademe === 1 && k.satirHemenUstte && k.alanGorunur && k.alanGen > 120 && k.alanGen <= 780 && k.dugme === 3 && k.dugmeGorunur
            && k.roller.join(",") === "onay,şerh,ret" && !k.editorKarti, JSON.stringify(k));
        // Klavye ve iletiler: yazmak taslak, Escape kutudan çıkış (iptal yok), ikinci Escape vazgeçiş, Ctrl+Enter şerh.
        await p.evaluate(() => { window.__iletiler.length = 0; });
        await p.click(".kademe textarea.not-metin");
        await p.keyboard.type("ölçüm eksik");
        await p.keyboard.press("Escape");
        const cikis = await p.evaluate(() => ({
          odakSatirda: document.activeElement?.classList.contains("sat") && document.activeElement === document.querySelector(".kademe")?.previousElementSibling,
          iletiler: window.__iletiler.filter((m) => m.tip === "onay").map((m) => m.ileti.tur),
        }));
        kontrol(`${etiket}: gerekçe kutusuna yazmak taslak iletir; Escape kutudan çıkar, odağı kapı satırına verir ve vazgeçmez`,
          cikis.odakSatirda && cikis.iletiler.includes("taslak") && !cikis.iletiler.includes("iptal"), JSON.stringify(cikis));
        await p.keyboard.press("Escape");
        const vazgec = await p.evaluate(() => window.__iletiler.filter((m) => m.tip === "onay").map((m) => m.ileti));
        kontrol(`${etiket}: kapı satırında ikinci Escape vazgeçiştir (iptal iletisi)`,
          vazgec.some((m) => m.tur === "iptal" && m.kod === "ORNEK-A02"), JSON.stringify(vazgec.map((m) => m.tur)));
        await p.evaluate(() => { window.__iletiler.length = 0; });
        await p.click('.kademe .karar-satiri[data-rol="şerh"]');
        await p.click(".kademe textarea.not-metin");
        await p.keyboard.press("ControlOrMeta+Enter");
        const kararlar = await p.evaluate(() => window.__iletiler.filter((m) => m.tip === "onay" && m.ileti.tur === "kararVer").map((m) => m.ileti));
        kontrol(`${etiket}: şerh düğmesi ve Ctrl+Enter karar iletisini kutunun metniyle doğurur`,
          kararlar.length === 2 && kararlar.every((m) => m.rol === "şerh" && m.kod === "ORNEK-A02" && m.not === "ölçüm eksik" && Number.isInteger(m.satir)),
          JSON.stringify(kararlar));
      }
      if (d.ad === "makinist") {
        const m = await p.evaluate(() => {
          const ust = [...document.querySelectorAll("#makinist-agac .sat")].filter((s) => s.dataset.d === "0");
          // Kaydı olmayan grup yapraktır (açılacak çocuğu yoktur); kaydı olan her grup katlanmalıdır.
          const dolu = ust.filter((s) => s.hasAttribute("aria-expanded"));
          return { ust: ust.length, dolu: dolu.length, katlanir: dolu.filter((s) => s.querySelector(".ok svg")).length,
            bos: ust.filter((s) => !s.hasAttribute("aria-expanded")).map((s) => s.dataset.id) };
        });
        kontrol(`${etiket}: Makinist üst düğümleri katlanabilir (kaydı olan her grup ok ve aria-expanded taşır)`, m.dolu > 0 && m.katlanir === m.dolu, JSON.stringify(m));
      }
      if (d.ad === "ray") {
        // Katlanan başlıklar: tıklama, Enter ve Space gövdeyi gizler/gösterir ve durumu eklentiye bildirir.
        const k = await p.evaluate(() => {
          const sonuc = {};
          for (const b of document.querySelectorAll(".bb")) {
            const ad = b.dataset.bolum;
            const g = document.getElementById(b.getAttribute("aria-controls"));
            const durum = () => `${b.getAttribute("aria-expanded")}/${g?.hidden ? "gizli" : "acik"}`;
            const adimlar = [durum()];
            b.click(); adimlar.push(durum());
            b.click(); adimlar.push(durum());
            sonuc[ad] = { adimlar, ok: !!b.querySelector(".ok svg"), ileti: window.__iletiler.filter((m) => m.tip === "bolumGec" && m.bolum === ad).length };
          }
          return sonuc;
        });
        for (const ad of ["agac", "graf"]) {
          const x = k[ad];
          kontrol(`${etiket}: "${ad}" başlığı tıklamayla katlanır, ok taşır ve durumu bildirir`,
            x && x.ok && x.adimlar.join(" ") === "true/acik false/gizli true/acik" && x.ileti === 2, JSON.stringify(x ?? "başlık yok"));
        }
        for (const tus of ["Enter", "Space"]) {
          if (!(await p.$('.bb[data-bolum="agac"]'))) { kontrol(`${etiket}: başlık ${tus} tuşuyla katlanır ve açılır`, false, "katlanan başlık yok"); continue; }
          await p.focus('.bb[data-bolum="agac"]');
          await p.keyboard.press(tus);
          const kapali = await p.evaluate(() => document.getElementById("bolum-agac").hidden);
          await p.keyboard.press(tus);
          const acik = await p.evaluate(() => !document.getElementById("bolum-agac").hidden);
          kontrol(`${etiket}: başlık ${tus} tuşuyla katlanır ve açılır`, kapali && acik, `katlandı=${kapali} açıldı=${acik}`);
        }
        // Girinti kılavuzları: ağacın üzerine gelince her derin satırda; derin bir satır seçilince etkin kılavuz.
        const agac = await p.locator("#agac").boundingBox();
        if (agac) {
          await p.evaluate(() => {
            const s = [...document.querySelectorAll("#agac .sat")].filter((x) => x.getBoundingClientRect().top < innerHeight - 30);
            const d = s.reduce((a, x) => (Number(x.dataset.d) > Number(a.dataset.d) ? x : a), s[0]);
            d?.querySelector(".et")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
          });
          // Ağaç çizgisi şikâyeti (Founder 2026-10-27 · PNL-A04 ile kapandı): çizgiler fare ağacın üzerine
          // GELMEDEN görünür. Fare önce sekme şeridine (ağacın dışına) götürülür ve ağacın :hover durumunda
          // olmadığı ölçülür.
          await p.mouse.move(2, 2);
          await p.waitForTimeout(150);
          const f = await p.evaluate(kilavuzOlc);
          kontrol(`${etiket}: ağaç çizgisi şikâyeti: Ray ağacında girinti kılavuzları fare ağacın üzerine gelmeden çizili`,
            !f.agacUzerinde && f.derinSatir > 0 && f.kilavuzlu === f.derinSatir, JSON.stringify(f));
          const faresiz = `${d.ad}-${W}-kilavuz-faresiz.png`;
          await p.screenshot({ path: join(CIKTI, faresiz) });
          goruntuler.push(faresiz);
          await p.mouse.move(agac.x + agac.width - 30, agac.y + 40);
          await p.waitForTimeout(150);
          const k = await p.evaluate(kilavuzOlc);
          kontrol(`${etiket}: Ray ağacında girinti kılavuzları çizili (fare ağacın üzerindeyken)`, k.derinSatir > 0 && k.kilavuzlu === k.derinSatir, JSON.stringify(k));
          kontrol(`${etiket}: Ray ağacında seçimin etkin kılavuzu çizili`, k.etkin > 0, JSON.stringify(k));
          const dosya = `${d.ad}-${W}-kilavuz.png`;
          await p.screenshot({ path: join(CIKTI, dosya) });
          goruntuler.push(dosya);
        }
        await agacCizgisiOlc("#agac", "Ray");
        // Katlanan Mini Graf (PNL-A03): başlık sütununun üstünde kalır, alanın dibine yapıştırılmaz; geniş
        // panelde Yol Haritası boşalan genişliği alır, dar panelde başlık Yol Haritasının hemen altındadır.
        await p.evaluate(kaydir, "ust");
        await p.evaluate(basligaTikla, "graf");
        await p.waitForTimeout(60);
        const kz = await p.evaluate(duzenOlc);
        const [kag, kgr] = kz.kollar;
        const yakin2 = (a, b) => a !== undefined && b !== undefined && Math.abs(a - b) <= 1;
        const genis = B.w >= GENIS_PANEL_PX;
        kontrol(genis
          ? `${etiket}: katlanan Mini Graf başlığı sütununun üstünde kalır ve Yol Haritası boşalan genişliği alır`
          : `${etiket}: katlanan Mini Graf başlığı Yol Haritasının hemen altında durur, alanın dibine yapışmaz`,
        kag && kgr && kgr.govdeYuk === 0 && yakin2(kgr.basUst, kgr.ust) && (genis
          ? yakin2(kgr.ust, kz.icerikUst) && kag.gen >= 0.75 * kz.W && yakin2(kag.alt, kz.H)
          : yakin2(kgr.ust, kag.alt)),
        JSON.stringify(kz.kollar));
        const katli = `${d.ad}-${W}-graf-katli.png`;
        await p.screenshot({ path: join(CIKTI, katli) });
        goruntuler.push(katli);
        await p.evaluate(basligaTikla, "graf");
      }
      if (d.ad.startsWith("graf-")) {
        await p.evaluate(kaydir, "graf");
        const g = await p.evaluate(grafOlc);
        kontrol(`${etiket}: Mini Graf gölge kökte çizildi`, g.golge, JSON.stringify(g));
        kontrol(`${etiket}: Mini Graf yazıları görünür (genişlik ve yükseklik > 0, panel içinde)`, g.yaziliOge > 0 && g.yazisiz === 0, JSON.stringify(g));
        kontrol(`${etiket}: Mini Graf içeriği kendi kutusundan taşmaz`, g.taskinPx <= 1, `taşma ${g.taskinPx}px`);
        if (g.agacGorunumu && g.dugum > 0) {
          kontrol(`${etiket}: Mini Graf satır yüksekliği --sat ile aynı`, g.satPx > 0 && g.yanlisBoy === 0, `--sat ${g.satPx}px · yanlış boy ${g.yanlisBoy}/${g.dugum}`);
        }
        if (g.seritBag !== null) {
          kontrol(`${etiket}: bağ şeridi satırların altına taşmaz`, g.seritTaskin <= 1, `taşma ${g.seritTaskin}px · çizilen bağ ${g.seritBag}`);
        }
        const yb = await p.evaluate(yaziBoyutu, { secici: ".ad, text.etiket", kokSecici: "graf" });
        if (yb.adet) kontrol(`${etiket}: Mini Graf ana yazı boyutu ${YAZI_EN_AZ}–${YAZI_EN_COK} px (panel genişliğinden bağımsız)`, yb.enAz >= YAZI_EN_AZ && yb.enCok <= YAZI_EN_COK, JSON.stringify(yb));
        console.log(`  ${etiket}: düğüm ${g.dugum} · çizilen bağ ${g.seritBag ?? "-"} · yazılı öğe ${g.yaziliOge}`);
        await cek("graf");
        if (d.secili && g.secili) {   // seçimi işaretleyen görünümlerde (İlerleme Katman kartlarıdır, satır seçmez)
          await p.evaluate(kaydir, "secili");
          await p.waitForTimeout(100);
          const s = await p.evaluate(seciliGorunurMu);
          kontrol(`${etiket}: seçili düğüm satırı ekranda ve yazısı görünür`, s.var && s.ekranda && s.yaziGenislik > 0 && s.ustte, JSON.stringify(s));
          await cek("secili");
        }
        await cek("dip");
        // Satır seçimi (PNL-A05): Ray satırına tıklayınca eklenti 'grafSec' iletisi gönderir; betik grafı yeniden
        // yazmadan seçim işaretini bağı verilen düğüme taşır ve önceki seçimin bağ çizgilerini gizler.
        if (d.secili && (d.gorunum === "agac" || d.gorunum === "klasik")) {
          const s = await p.evaluate(async () => {
            const kok = document.getElementById("graf")?.shadowRoot;
            const ilk = kok?.firstElementChild;
            const bag = kok && [...kok.querySelectorAll("a")].find((a) => (a.getAttribute("href") ?? "").startsWith("command:sarmal.dosyaAc")
              && !(a.classList.contains("dugum") ? a : a.querySelector(".dugum"))?.classList.contains("secili"));
            if (!bag) return { var: false };
            const href = bag.getAttribute("href");
            window.postMessage({ tip: "grafSec", href }, "*");
            await new Promise((r) => setTimeout(r, 80));
            const secililer = [...kok.querySelectorAll(".dugum.secili")];
            const hedef = bag.classList.contains("dugum") ? bag : bag.querySelector(".dugum");
            const cizgi = [...kok.querySelectorAll("svg.serit, .bag, .zemin, .uretir")];
            return { var: true, ayniCizim: kok.firstElementChild === ilk && bag.isConnected, secili: secililer.length,
              hedefSecili: secililer.length === 1 && secililer[0] === hedef, gorunenBagCizgisi: cizgi.filter((x) => getComputedStyle(x).display !== "none").length };
          });
          kontrol(`${etiket}: satır seçimi Mini Grafı yeniden yazmadan işareti düğüme taşır ve önceki seçimin bağ çizgilerini gizler`,
            s.var && s.ayniCizim && s.hedefSecili && s.gorunenBagCizgisi === 0, JSON.stringify(s));
        }
        // Mini Graf şikâyeti (Founder 2026-10-27): düğüme GERÇEK fare tıklaması dosyayı açan komut
        // iletisini doğurur. Tıklama en sonda yapılır; bağ sayfayı gezdirirse öteki ölçümler bozulmaz.
        if (d.gorunum) {
          const h = await p.evaluate(grafBagHedefi);
          let iletiler = [];
          let hata = "";
          if (h.var) {
            try {
              await p.evaluate(() => { window.__iletiler.length = 0; });
              await p.mouse.click(h.x, h.y);
              await p.waitForTimeout(100);
              iletiler = await p.evaluate(() => window.__iletiler.filter((m) => m.tip === "komut"));
            } catch (e) { hata = String(e?.message ?? e).split("\n")[0]; }
          }
          const ulasti = iletiler.some((m) => m.href === h.href) && dosyaAcBagiGecerli(h.href ?? "");
          kontrol(`${etiket}: Mini Graf şikâyeti: ${d.gorunum} görünümünde düğüme gerçek tıklama dosyayı açan komut iletisini doğurur`,
            h.var && h.ustte && ulasti,
            JSON.stringify({ bag: h.var, ad: h.ad, tagName: h.tagName, ustte: h.ustte, komutIletisi: iletiler.length, hata: hata || undefined }),
          );
        }
      }
      await p.close();
    }
  }

  // ── SEKME GEÇİŞİ EKLENTİYİ BEKLEMEZ (PNL-A18 · Founder 2026-10-28 ekran kaydı) ──────────────
  // Sahte eklenti hiçbir iletiye yanıt vermez; eklentinin iş parçacığı bölünmez bir denetim turunda
  // kilitliymiş gibidir. Her sekmeye gerçek fare tıklaması yapılır ve hiç beklenmeden ölçülür.
  for (const B of BOYUTLAR) {
    const W = B.ad;
    const p = await tarayici.newPage({ viewport: { width: B.w, height: B.h } });
    const hatalar = [];
    p.on("pageerror", (e) => hatalar.push(e.message));
    await p.addInitScript(() => {
      window.__iletiler = [];
      window.acquireVsCodeApi = () => ({ postMessage(m) { window.__iletiler.push(m); }, setState() {}, getState() {} });
    });
    await p.goto(pathToFileURL(join(HTML_DIZIN, "ray.html")).href, { waitUntil: "load" });
    await p.evaluate((renkler) => {
      const r = document.documentElement;
      for (const [k, v] of Object.entries(renkler)) r.style.setProperty(k, v);
      r.style.background = renkler["--vscode-sideBar-background"];
      document.body.className = "vscode-dark";
    }, KOYU);
    const etiket = `sekme geçişi @${W}`;
    const sira = ["tren", "makinist", "sinyaller", "ayarlar", "ray"];
    for (const ad of sira) {
      await p.click(`.sekme[data-sekme="${ad}"]`);
      const g = await p.evaluate(sekmeDurumu);
      kontrol(`${etiket}: eklenti yanıt vermezken ${ad} sekmesine tıklamak o sekmenin içeriğini hemen gösterir`,
        g.secili === ad && g.gorunen.join() === ad && g.icerik.join() === ad, JSON.stringify(g));
      const dosya = `sekme-gecisi-${W}-${ad}.png`;
      await p.screenshot({ path: join(CIKTI, dosya) });
      goruntuler.push(dosya);
    }
    const haberler = await p.evaluate(() => window.__iletiler.filter((m) => m.tip === "sekme").map((m) => `${m.ad}:${m.n}`));
    kontrol(`${etiket}: her geçiş eklentiye yalnız haber olarak gider (sırası ve sayacıyla)`,
      haberler.join() === sira.map((ad, i) => `${ad}:${i + 1}`).join(), haberler.join());
    // Founder'ın kaydındaki durum: Makinist seçiliyken eklentinin gecikmiş Ray bölümü ve gecikmiş seçimi gelir.
    await p.click('.sekme[data-sekme="makinist"]');
    await p.evaluate(() => {
      window.postMessage({ tip: "bolum", sekme: "ray", html: "<p class=\"bos\">gecikmiş Yol Haritası</p>", ikonStili: "" }, "*");
      window.postMessage({ tip: "sekmeSec", ad: "tren", n: 0 }, "*");
    });
    await p.waitForTimeout(150);
    const g = await p.evaluate(sekmeDurumu);
    kontrol(`${etiket}: eklentinin gecikmiş bölümü ve gecikmiş seçimi Makinist seçiliyken görünen içeriği değiştirmez`,
      g.secili === "makinist" && g.gorunen.join() === "makinist" && g.icerik.join() === "makinist", JSON.stringify(g));
    const dosya = `sekme-gecisi-${W}-gecikmis-ileti.png`;
    await p.screenshot({ path: join(CIKTI, dosya) });
    goruntuler.push(dosya);
    kontrol(`${etiket}: betik hatasız`, hatalar.length === 0, hatalar.join(" | "));
    await p.close();
  }

  // ── SEKMELERİN SÜRÜKLENEREK SIRALANMASI (PNL-A23 · OZK-14 DÖRDÜNCÜSÜ) ────────────────────────
  // Gerçek fare sürüklemesi (Playwright'ın HTML5 sürükle-bırak yolu) ve gerçek klavye. Sıra ile seçim
  // ayrıdır: sürükleme seçili sekmeyi ve görünen içeriği değiştirmez, yeni sıra eklentiye ileti olarak
  // gider, rozet kendi sekmesiyle taşınır; sıradan sonra sekme geçişi yine anındadır (PNL-A18).
  for (const B of BOYUTLAR) {
    const W = B.ad;
    const p = await tarayici.newPage({ viewport: { width: B.w, height: B.h } });
    const hatalar = [];
    p.on("pageerror", (e) => hatalar.push(e.message));
    await p.addInitScript(() => {
      window.__iletiler = [];
      window.__pencereAltOk = 0;
      window.acquireVsCodeApi = () => ({ postMessage(m) { window.__iletiler.push(m); }, setState() {}, getState() {} });
      // Alt+ok VS Code'a geçerse pencere düzeyinde görünürdü (VS Code'da Alt+Sol "geri git"tir).
      window.addEventListener("keydown", (e) => { if (e.altKey && e.key.startsWith("Arrow")) window.__pencereAltOk += 1; });
    });
    await p.goto(pathToFileURL(join(HTML_DIZIN, "ray.html")).href, { waitUntil: "load" });
    await p.evaluate((renkler) => {
      const r = document.documentElement;
      for (const [k, v] of Object.entries(renkler)) r.style.setProperty(k, v);
      r.style.background = renkler["--vscode-sideBar-background"];
      document.body.className = "vscode-dark";
    }, KOYU);
    const etiket = `sekme sırası @${W}`;
    const serit = () => p.evaluate(() => ({
      sira: [...document.querySelectorAll(".sekme")].map((b) => b.dataset.sekme),
      iletiler: window.__iletiler.filter((m) => m.tip === "sekmeSirasi").map((m) => m.sira.join(",")),
      secimIletisi: window.__iletiler.filter((m) => m.tip === "sekme").length,
      odak: document.activeElement?.dataset?.sekme ?? null,
      pencereAltOk: window.__pencereAltOk,
      rozet: (() => {
        const b = document.querySelector('.sekme[data-sekme="makinist"]');
        const r = b?.querySelector(".rozet");
        if (!b || !r) return null;
        const br = b.getBoundingClientRect(), rr = r.getBoundingClientRect();
        return { metin: r.textContent, icinde: rr.left >= br.left - 0.5 && rr.right <= br.right + 0.5, gorunur: !r.hidden };
      })(),
      izKaldi: document.querySelectorAll(".sekme.suruklenen,.sekme.birak-once,.sekme.birak-sonra").length,
    }));
    const goruntu = async (ad) => {
      const dosya = `sekme-sirasi-${W}-${ad}.png`;
      await p.screenshot({ path: join(CIKTI, dosya), clip: { x: 0, y: 0, width: B.w, height: Math.min(B.h, 160) } });
      goruntuler.push(dosya);
    };
    const s0 = await serit();
    const gizliRozet = await p.evaluate(() => [...document.querySelectorAll(".sekme .rozet[hidden]")].map((r) => Math.round(r.getBoundingClientRect().width)));
    kontrol(`${etiket}: sıfır olan rozet gizlidir ve şeritte yer kaplamaz`, gizliRozet.every((w) => w === 0), JSON.stringify(gizliRozet));
    kontrol(`${etiket}: sürüklemeden önce şerit paketin varsayılan sırasındadır ve sekmeler sürüklenebilir`,
      s0.sira.join() === SEKME_SIRASI.join() && await p.evaluate(() => [...document.querySelectorAll(".sekme")].every((b) => b.draggable)),
      JSON.stringify(s0.sira));
    await goruntu("once");
    // ① Sıranın son sekmesi sürüklenip ilk sekmenin önüne (sol yarısına) bırakılır. Ölçüm paketin
    //    varsayılan sırasından türer; Founder kendi sırasını varsayılan yaptığında da geçerli kalır.
    const suruklenen = SEKME_SIRASI.at(-1);
    const hedefSira = [suruklenen, ...SEKME_SIRASI.filter((s) => s !== suruklenen)];
    await p.dragAndDrop(`.sekme[data-sekme="${suruklenen}"]`, `.sekme[data-sekme="${SEKME_SIRASI[0]}"]`, { targetPosition: { x: 3, y: 13 } });
    await p.waitForTimeout(80);
    const s1 = await serit();
    const g1 = await p.evaluate(sekmeDurumu);
    kontrol(`${etiket}: sürüklenen sekme bırakıldığı yere geçer ve yeni sıra eklentiye tek iletiyle gider`,
      s1.sira.join() === hedefSira.join() && s1.iletiler.length === 1 && s1.iletiler[0] === hedefSira.join() && s1.izKaldi === 0,
      JSON.stringify(s1));
    kontrol(`${etiket}: sürükleme seçili sekmeyi ve görünen içeriği değiştirmez; seçim iletisi gitmez`,
      g1.secili === "ray" && g1.gorunen.join() === "ray" && g1.icerik.join() === "ray" && s1.secimIletisi === 0, JSON.stringify({ g1, secimIletisi: s1.secimIletisi }));
    kontrol(`${etiket}: Makinist'in rozeti sekmesinin düğmesinde kalır (düğmenin içinde, aynı sayı)`,
      !!s1.rozet && s1.rozet.icinde && s1.rozet.metin === s0.rozet?.metin && s1.rozet.gorunur === s0.rozet?.gorunur, JSON.stringify({ once: s0.rozet, sonra: s1.rozet }));
    await goruntu("surukle-sonra");
    // ② Klavye: odaktaki ilk sekme Alt+Sağ ile bir sağa geçer; odak sekmede kalır, olay VS Code'a geçmez.
    const tasinan = hedefSira[0];
    await p.focus(`.sekme[data-sekme="${tasinan}"]`);
    await p.keyboard.press("Alt+ArrowRight");
    await p.waitForTimeout(50);
    const s2 = await serit();
    const beklenen2 = [hedefSira[1], hedefSira[0], ...hedefSira.slice(2)];
    kontrol(`${etiket}: Alt+Sağ odaktaki sekmeyi bir sağa taşır, odak sekmede kalır ve yeni sıra eklentiye gider`,
      s2.sira.join() === beklenen2.join() && s2.odak === tasinan && s2.iletiler.at(-1) === beklenen2.join() && s2.iletiler.length === 2,
      JSON.stringify(s2));
    kontrol(`${etiket}: Alt+ok olayı VS Code'a geçmez (pencere düzeyine ulaşmaz) ve seçim iletisi doğurmaz`,
      s2.pencereAltOk === 0 && s2.secimIletisi === 0, JSON.stringify({ pencereAltOk: s2.pencereAltOk, secimIletisi: s2.secimIletisi }));
    await p.focus(`.sekme[data-sekme="${beklenen2[0]}"]`);
    await p.keyboard.press("Alt+ArrowLeft");
    await p.waitForTimeout(50);
    const s3 = await serit();
    kontrol(`${etiket}: en soldaki sekmede Alt+Sol sırayı değiştirmez ve ileti göndermez`,
      s3.sira.join() === beklenen2.join() && s3.iletiler.length === 2, JSON.stringify(s3));
    await goruntu("klavye-sonra");
    // ③ Sıradan sonra sekme geçişi yine anındadır (PNL-A18): tıklama içeriği hemen gösterir.
    await p.click('.sekme[data-sekme="sinyaller"]');
    const g4 = await p.evaluate(sekmeDurumu);
    kontrol(`${etiket}: sıra değiştikten sonra sekmeye tıklamak içeriğini hemen gösterir (PNL-A18 korunur)`,
      g4.secili === "sinyaller" && g4.gorunen.join() === "sinyaller" && g4.icerik.join() === "sinyaller", JSON.stringify(g4));
    // Sıra geri yazılınca da şerit varsayılana döner: bunun ölçülebilmesi için şimdiki sıra varsayılandan farklı olmalıdır.
    kontrol(`${etiket}: ölçüm anlamlıdır (sürükleme ve klavyeden sonra sıra varsayılandan farklıdır)`, (await serit()).sira.join() !== SEKME_SIRASI.join(), "");
    // ④ Eklentinin bildirdiği sıra (varsayılana döndürme komutu ya da ayar dosyası) şeride uygulanır; seçim değişmez, geri ileti yok.
    await p.evaluate((sira) => { window.postMessage({ tip: "sekmeSirasi", sira }, "*"); }, SEKME_SIRASI);
    await p.waitForTimeout(80);
    const s5 = await serit();
    const g5 = await p.evaluate(sekmeDurumu);
    kontrol(`${etiket}: eklentinin bildirdiği sıra (varsayılana dönüş) şeride uygulanır; seçim değişmez ve sıra geri yazılmaz`,
      s5.sira.join() === SEKME_SIRASI.join() && g5.secili === "sinyaller" && g5.gorunen.join() === "sinyaller" && s5.iletiler.length === 2,
      JSON.stringify({ s5, g5 }));
    await goruntu("varsayilana-donus");
    kontrol(`${etiket}: betik hatasız`, hatalar.length === 0, hatalar.join(" | "));
    await p.close();
  }
} finally { await tarayici.close(); }

// Onay şikâyeti (OZK-13 · Founder 2026-10-27): dosya editörde ilgili satırda açılır, odak panelde
// kalır, panel hiçbir şeyi editörün yerine ya da yan sütuna açmaz; karar panelin içinde verilir.
// Bu kontrol eskiden kartın etkin sütunda (ViewColumn.Active) açılmasını doğru sayıyordu. Onay yolu
// editör kabuğunda koştuğu için tarayıcıda ölçülemez; ölçüm yolun kaynağını okur. Davranışın kendisini
// sinama/panel-sikayetleri.test.ts kabuk sahtesiyle ölçer.
const onayYolu = ["onay-paneli.ts", "onay-kuyrugu.ts", "makinist.ts"].filter((f) => existsSync(join(EKLENTI, "src", f)));
const onayIhlali = onayYolu.flatMap((f) => {
  const k = readFileSync(join(EKLENTI, "src", f), "utf8");
  return [...k.matchAll(/createWebviewPanel|ViewColumn\.\w+|preserveFocus: false/g)].map((m) => `${f}: ${m[0]}`);
});
kontrol("onay şikâyeti (OZK-13): onay kapısı açılınca editörde kart açılmaz ve odak panelde kalır (onay yolunda createWebviewPanel, ViewColumn ve preserveFocus: false yok)",
  onayYolu.length > 0 && onayIhlali.length === 0, onayIhlali.join(" · ") || `okunan: ${onayYolu.join(", ")}`);

// ── 5. Etkileşim envanteri: eski panel (git HEAD) ↔ yeni panel ─────────────
//    Eski panel ayrı VS Code görünümlerinden kuruluydu; her görünüm, başlık düğmesi,
//    satır düğmesi ve sağ tık eylemi package.json katkısında yazılıdır. Her birinin yeni
//    paneldeki karşılığı aranır: karşılığı olmayan DÜŞTÜ, yolu değişen UYARI olur.
const uyarilar = [];
const uyari = (ad, ayrinti) => { uyarilar.push({ ad, ayrinti }); };
function gitHead(goreli) {
  try {
    const onek = execFileSync("git", ["-C", EKLENTI, "rev-parse", "--show-prefix"], { encoding: "utf8" }).trim();
    return execFileSync("git", ["-C", EKLENTI, "show", `HEAD:${onek}${goreli}`], { encoding: "utf8", maxBuffer: 64 << 20, stdio: ["ignore", "pipe", "ignore"] });
  } catch { return undefined; }
}
/** Eski görünüm → yeni paneldeki karşılığı (yeni görünüm eklendikçe bu tablo büyür; tanımsız görünüm DÜŞTÜ olur). */
const ESKI_GORUNUM = {
  sarmalYolHaritasi: { ad: "Ray sekmesi · YOL HARİTASI (katlanan başlık)", dosya: "ray", iz: 'data-bolum="agac"' },
  sarmalMiniGraf: { ad: "Ray sekmesi · MİNİ GRAF (katlanan başlık)", dosya: "graf-agac-secimsiz", iz: 'data-bolum="graf"' },
  sarmalOnaylar: { ad: "Makinist · Onaylar grubu", dosya: "makinist", iz: "makinist.onaylar" },
  sarmalHatirlaticilar: { ad: "Makinist · Hatırlatıcılar grubu", dosya: "makinist", iz: "makinist.hatirlaticilar" },
  // PNL-A09 (OZK-14 · YUZ-3.3): Gözlemler Makinist'ten çıktı; Sinyaller sekmesinin Bilgi bandı onun yerini alır.
  sarmalBildirimler: { ad: "Sinyaller · Bilgi bandı", dosya: "sinyaller", iz: 'data-id="sinyaller/bant.bilgi"' },
  sarmalFikirler: { ad: "Makinist · Fikirler grubu", dosya: "makinist", iz: "makinist.fikirler" },
  sarmalBolumSirasi: { bilincli: "Founder 2026-10-21: kapta tek görünüm; bölüm sırası yerine sekme şeridi" },
  sarmalBolumYuvasi1: { bilincli: "Founder 2026-10-21: bölüm yuvaları kapandı" },
  sarmalBolumYuvasi2: { bilincli: "Founder 2026-10-21: bölüm yuvaları kapandı" },
  sarmalBolumYuvasi3: { bilincli: "Founder 2026-10-21: bölüm yuvaları kapandı" },
  sarmalBolumYuvasi4: { bilincli: "Founder 2026-10-21: bölüm yuvaları kapandı" },
  sarmalKisitliKarsilama: { yerinde: true },
  // 0.9.194 işlendiğinden beri git HEAD'deki paket tek panelin kendisini de taşır.
  sarmalPanel: { yerinde: true },
};
const eskiPaket = gitHead("package.json");
if (!eskiPaket) {
  uyari("etkileşim envanteri koşmadı", "git HEAD'deki package.json okunamadı (git yok ya da dizin depo değil)");
} else {
  const eski = JSON.parse(eskiPaket).contributes ?? {};
  const yeni = JSON.parse(readFileSync(join(EKLENTI, "package.json"), "utf8")).contributes ?? {};
  const htmlOku = (ad) => { try { return readFileSync(join(HTML_DIZIN, `${ad}.html`), "utf8"); } catch { return ""; } };
  const yeniGorunumler = new Set(Object.values(yeni.views ?? {}).flat().map((v) => v.id));
  for (const v of Object.values(eski.views ?? {}).flat()) {
    const k = ESKI_GORUNUM[v.id];
    if (!k) { kontrol(`envanter: eski görünüm ${v.id} yeni panelde karşılığı tanımlı`, false, "ESKI_GORUNUM tablosunda yok"); continue; }
    if (k.bilincli) { uyari(`envanter: eski görünüm ${v.id} kaldırıldı`, k.bilincli); continue; }
    if (k.yerinde) { kontrol(`envanter: eski görünüm ${v.id} yerinde`, yeniGorunumler.has(v.id), ""); continue; }
    kontrol(`envanter: eski görünüm ${v.id} → ${k.ad}`, htmlOku(k.dosya).includes(k.iz), `${k.dosya}.html içinde ${k.iz} aranır`);
  }
  const panelKaynagi = readFileSync(join(EKLENTI, "src", "panel-cekirdek.ts"), "utf8");
  const satirDugmesi = new Set([...(/EYLEM_KOMUTLARI[^=]*=\s*new Set\(\[([^\]]*)\]/.exec(panelKaynagi)?.[1] ?? "").matchAll(/"([^"]+)"/g)].map((m) => m[1]));
  const yeniBaslik = new Set((yeni.menus?.["view/title"] ?? []).filter((m) => /sarmalPanel/.test(m.when ?? "")).map((m) => m.command));
  const yeniSagTik = new Set((yeni.menus?.["webview/context"] ?? []).map((m) => m.command));
  const gorulen = new Set();
  for (const m of eski.menus?.["view/title"] ?? []) {
    if (gorulen.has(`b:${m.command}`)) continue; gorulen.add(`b:${m.command}`);
    kontrol(`envanter: başlık düğmesi ${m.command} panel başlığında`, yeniBaslik.has(m.command), m.when);
  }
  for (const m of eski.menus?.["view/item/context"] ?? []) {
    const satirIci = String(m.group ?? "").startsWith("inline");
    const anahtar = `${satirIci ? "i" : "s"}:${m.command}`;
    if (gorulen.has(anahtar)) continue; gorulen.add(anahtar);
    if (satirIci) {
      kontrol(`envanter: satır düğmesi ${m.command} panel satırında`, satirDugmesi.has(m.command), m.when);
    } else if (yeniSagTik.has(m.command)) {
      kontrol(`envanter: sağ tık eylemi ${m.command} panelde`, true, m.when);
    } else if (satirDugmesi.has(m.command)) {
      uyari(`envanter: sağ tık eylemi ${m.command} yalnız satır düğmesiyle erişilebilir (panelde sağ tık menüsü yok)`, m.when);
    } else {
      kontrol(`envanter: sağ tık eylemi ${m.command} panelde`, false, `${m.when} · ne sağ tık ne satır düğmesi`);
    }
  }
  // Yerel ağaç görünümünün kendiliğinden verdiği etkileşimler.
  const ray = htmlOku("ray");
  const raySatir = (ray.match(/class="sat"/g) ?? []).length;
  kontrol("envanter: ağaç satırlarında ipucu (title) var", raySatir > 0 && (ray.match(/class="sat"[^>]*title="[^"]+"/g) ?? []).length === raySatir, `${raySatir} satır`);
  if (/manageCheckboxStateManually/.test(gitHead("src/yolharitasi.ts") ?? "")) {
    kontrol("envanter: Adım kutucuğu (checkbox) panelde", /class="kt"/.test(ray), "ray.html içinde input.kt");
  }
  kontrol("envanter: Makinist sayı rozeti sekmede", /class="rozet"/.test(htmlOku("makinist")), "");
  uyari("envanter: VS Code ağacının yazarak bulma (type to filter) özelliği panelde yok", "yerel TreeView'den gelirdi");
  uyari("envanter: satır ipucu düz metindir", "yerel TreeView MarkdownString ipucunu biçimli gösterirdi");
}

// ── 6. Sonuç ────────────────────────────────────────────────────────────────
// İşaretli (beklenen kırmızı) kontrolün kırmızısı çıkış kodunu bozmaz; yeşile dönmesi bozar (başlık).
const beklenen = kontroller.filter((k) => k.bekleyen && !k.gecti);
const yesileDonen = kontroller.filter((k) => k.bekleyen && k.gecti);
const dusen = [...kontroller.filter((k) => !k.bekleyen && !k.gecti), ...yesileDonen];
const satir = (k) => {
  if (!k.bekleyen) return `${k.gecti ? "GEÇTİ" : "DÜŞTÜ"}  ${k.ad}${k.gecti ? "" : `\n        ${k.ayrinti}`}`;
  return k.gecti
    ? `DÜŞTÜ  YEŞİLE DÖNDÜ (${k.bekleyen}): ${k.ad}\n        beklenen kırmızı yeşile döndü; ${k.bekleyen} işareti kaldırılmalı`
    : `BEKLENEN KIRMIZI (${k.bekleyen})  ${k.ad}\n        ${k.ayrinti}`;
};
const metin = kontroller.map(satir).join("\n")
  + (uyarilar.length ? `\n\n${uyarilar.map((u) => `UYARI  ${u.ad}\n        ${u.ayrinti}`).join("\n")}` : "")
  + `\n\n${kontroller.length - dusen.length - beklenen.length}/${kontroller.length} kontrol geçti · ${beklenen.length} beklenen kırmızı`
  + ` (${[...new Set(beklenen.map((k) => k.bekleyen))].join(", ") || "yok"}) · ${dusen.length} düştü · ${uyarilar.length} uyarı.\n`;
writeFileSync(join(CIKTI, "sonuc.txt"), metin);
writeFileSync(join(CIKTI, "sonuc.json"), JSON.stringify({ proje: PROJE, secili: uretim.secili, kontroller, uyarilar, goruntuler }, null, 2));

if (ONCEKI) {
  const onceki = resolve(ONCEKI);
  const kacir = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  const tum = [...new Set([...goruntuler, ...(existsSync(onceki) ? readdirSync(onceki).filter((f) => f.endsWith(".png")) : [])])].sort();
  const hucre = (dizin, f) => existsSync(join(dizin, f))
    ? `<img src="${kacir(pathToFileURL(join(dizin, f)).href)}" loading="lazy">` : `<span class="yok">yok</span>`;
  const satirlar = tum.map((f) => `<tr><th>${kacir(f)}</th><td>${hucre(onceki, f)}</td><td>${hucre(CIKTI, f)}</td></tr>`).join("");
  writeFileSync(join(CIKTI, "karsilastirma.html"), `<!DOCTYPE html><meta charset="utf-8"><title>Görsel karşılaştırma</title>
<style>body{font:13px system-ui;background:#111;color:#ddd;margin:16px}table{border-collapse:collapse}th,td{border:1px solid #333;padding:6px;vertical-align:top}
th{text-align:left;font-weight:500;max-width:180px;word-break:break-all}img{max-width:470px;display:block}.yok{color:#888}</style>
<h1>Görsel karşılaştırma</h1><p>Önce: ${kacir(onceki)} · Sonra: ${kacir(CIKTI)}</p>
<table><tr><th>görüntü</th><th>önce (${kacir(basename(onceki))})</th><th>sonra (${kacir(basename(CIKTI))})</th></tr>${satirlar}</table>`);
  console.log(`karşılaştırma: ${join(CIKTI, "karsilastirma.html")}`);
}

console.log(metin.split("\n").filter((l) => l.startsWith("DÜŞTÜ") || l.startsWith("BEKLENEN") || l.startsWith("UYARI") || l.startsWith("        ") || /kontrol geçti/.test(l)).join("\n"));
console.log(`çıktı: ${CIKTI}`);
process.exit(dusen.length ? 1 : 0);

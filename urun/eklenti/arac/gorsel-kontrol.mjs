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
//        (arac/gorsel-kontrol-uret.ts; Ray · Tren · Makinist · Mini Graf'ın üç
//        görünümü seçili ve seçimsiz · görünüm seçici).
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
//   Ray girinti kılavuzları (fare ağacın üzerindeyken ve DEĞİLKEN) ve etkin kılavuz ·
//   Ray başlıklarının tıklama, Enter ve Space ile katlanması · Makinist üst
//   düğümlerinin katlanabilirliği · ana yazı boyutu 11–14 px · Mini Graf yazılarının
//   görünürlüğü, taşmazlığı, satır boyu ve bağ çizgisi sayısı · Mini Graf düğümüne
//   gerçek fare tıklamasının dosya açma iletisi doğurması (üç görünüm) · onay
//   kapısının editörde kart açmaması (OZK-13) · ESKİ/YENİ ETKİLEŞİM ENVANTERİ
//   (git HEAD'deki package.json'ın görünüm ve menü katkıları ile panelin karşılığı;
//   kaybolan etkileşim DÜŞTÜ, yolu değişen etkileşim UYARI olarak yazılır).
//
//   BEKLENEN KIRMIZI (PNL-A02 · Founder 2026-10-27 şikâyetleri). Bazı kontroller
//   bugünkü panelde bilerek kırmızıdır, çünkü onaracak Adım henüz koşmamıştır; böyle
//   bir kontrol onu yeşile çevirecek Adımın koduyla işaretlenir (PNL-A04 ağaç
//   çizgisi, PNL-A05 Mini Graf tıklaması, PNL-A07 onay kartı). İşaretli kontrolün
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
function kaydir(kip) {
  const host = document.getElementById("graf");
  const kok = host?.shadowRoot;
  if (kip === "ust") window.scrollTo(0, 0);
  else if (kip === "dip") window.scrollTo(0, document.documentElement.scrollHeight);
  else if (kip === "graf") {
    const h = document.querySelector("h2.araya");
    if (h) window.scrollTo(0, h.getBoundingClientRect().top + scrollY - 40);
  } else if (kip === "secili") {
    const e = kok?.querySelector(".secili");
    if (e) e.scrollIntoView({ block: "center" });
  }
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
function kilavuzOlc() {
  const satirlar = [...document.querySelectorAll("#agac .sat")];
  const derin = satirlar.filter((s) => Number(s.dataset.d) > 0);
  const cizili = derin.filter((s) => {
    const b = getComputedStyle(s, "::before");
    return b.content !== "none" && b.backgroundImage !== "none" && parseFloat(b.width) > 0 && Number(b.opacity) > 0;
  });
  const etkin = [...document.querySelectorAll("#agac .sat.kl")].filter((s) => parseFloat(getComputedStyle(s, "::after").borderLeftWidth) > 0);
  return { satir: satirlar.length, derinSatir: derin.length, kilavuzlu: cizili.length, etkin: etkin.length,
    agacUzerinde: !!document.querySelector('[role="tree"]:hover') };
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
      const cek = async (kip) => {
        await p.evaluate(kaydir, kip);
        await p.waitForTimeout(150);
        const dosya = `${d.ad}-${W}-${kip}.png`;
        await p.screenshot({ path: join(CIKTI, dosya) });
        goruntuler.push(dosya);
      };
      kontrol(`${etiket}: betik hatasız`, hatalar.length === 0, hatalar.join(" | "));
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
          // Ağaç çizgisi şikâyeti (Founder 2026-10-27): çizgiler fare ağacın üzerine GELMEDEN görünür.
          // Fare önce sekme şeridine (ağacın dışına) götürülür ve ağacın :hover durumunda olmadığı ölçülür.
          await p.mouse.move(2, 2);
          await p.waitForTimeout(150);
          const f = await p.evaluate(kilavuzOlc);
          kontrol(`${etiket}: ağaç çizgisi şikâyeti: Ray ağacında girinti kılavuzları fare ağacın üzerine gelmeden çizili`,
            !f.agacUzerinde && f.derinSatir > 0 && f.kilavuzlu === f.derinSatir, JSON.stringify(f), "PNL-A04");
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
            d.gorunum === "klasik" ? "PNL-A05" : undefined);
        }
      }
      await p.close();
    }
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
  onayYolu.length > 0 && onayIhlali.length === 0, onayIhlali.join(" · ") || `okunan: ${onayYolu.join(", ")}`, "PNL-A07");

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
  sarmalBildirimler: { ad: "Makinist · Gözlemler grubu", dosya: "makinist", iz: "makinist.gozlemler" },
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

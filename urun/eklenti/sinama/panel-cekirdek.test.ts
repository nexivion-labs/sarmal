// ═══════════════════════════════════════════════════════════════════════════
// panel-cekirdek.test.ts — 🧭 SARMAL PANELİNİN SAF ÇEKİRDEĞİ (Founder 2026-10-21)
//
//   Kap TEK webview görünümüdür; Ray · Tren · Makinist · Gözlemler · Ayarlar sekme
//   şeridi o görünümün içindedir (OZK-13). Bu süit VS Code'suz ölçülebilen her şeyi kilitler: sekme kimlikleri
//   ve klavye komşuluğu, sağlayıcı ağacının satırlara açılması (yalnız AÇIK
//   düğümlerin çocukları üretilir), yüzlerce düğümde çıktının boyutu, HTML
//   güvenliği (kaçış, nonce'lu tek betik, satır içi olay yok), Mini Graf gövdesinin
//   gölge köke hazırlanması ve "Bölümler" metninin hiçbir yerde üretilmemesi.
//   Kabuğun (iletiler, kalıcılık, kardeş bağlantısı) davranışı panel.test.ts'tedir.
// ═══════════════════════════════════════════════════════════════════════════

import "./dil-kur.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  IkonDefteri, SEKMELER, bosSekmeHtml, grafKomutu, grafParcasi, kacir, komsuSekme, makinistBolumuHtml, panelHtml, rayBolumuHtml, satirEylemleri,
  satirHtml, satirKur, satirlarHtml, satirlariUret, sekmeNormalle, sekmeSeridiHtml, trenBolumuHtml,
  type AgacKaynagi, type AgacOgesi, type SekmeBolumu, type SekmeKimligi, type SekmeSimgeleri, type UretimSecenekleri,
} from "../src/panel-cekirdek.ts";
import { SEKME_SIMGE_KAYNAKLARI } from "../src/simge-cizelgesi.ts";
import { bosHtml } from "../src/minigraf-cekirdek.ts";
import { seciciHtml } from "../src/minigraf-gorunum.ts";
import { CIZGI_ALFA, DAR_SERIT_PX, GENIS_PANEL_PX, PANEL_BETIGI, PANEL_STILI } from "../src/panel-betik.ts";
import { TUL_MORU, tulRengi } from "../src/tul-rengi.ts";
import { readdirSync } from "node:fs";
import { PANEL_METINLERI, yuzeyDiliniAyarla } from "../src/yuzey-metinleri.ts";

const KOK = fileURLToPath(new URL("..", import.meta.url));
const oku = (g: string): string => readFileSync(`${KOK}${g}`, "utf8");
const SIMGELER = Object.fromEntries(SEKMELER.map((s) => [s, oku(SEKME_SIMGE_KAYNAKLARI[s])])) as SekmeSimgeleri;
/** Seçili sekmenin içerik HTML'i (her sekmenin kendi bölüm üreticisi). */
const sekmeIcerigi = (sekme: (typeof SEKMELER)[number]): string =>
  sekme === "ray" ? rayBolumuHtml({ agac: "", graf: "<html><body></body></html>" })
    : sekme === "tren" ? trenBolumuHtml("", true, true)
      : sekme === "makinist" ? makinistBolumuHtml("") : bosSekmeHtml(sekme);
/** Beş sekmenin bölümü (PNL-A18: belge hepsini taşır). */
const hepsi = (icerik: (s: SekmeKimligi) => string): Record<SekmeKimligi, SekmeBolumu> =>
  Object.fromEntries(SEKMELER.map((s) => [s, { html: icerik(s), ikonStili: "" }])) as Record<SekmeKimligi, SekmeBolumu>;
/** Yalnız bir sekmenin bölümü dolu belge; ötekiler boş kaptır. */
const tekBolum = (sekme: SekmeKimligi, html: string, ikonStili = ""): Record<SekmeKimligi, SekmeBolumu> =>
  Object.fromEntries(SEKMELER.map((s) => [s, s === sekme ? { html, ikonStili } : { html: "", ikonStili: "" }])) as Record<SekmeKimligi, SekmeBolumu>;

// ── Sahte ağaç ──────────────────────────────────────────────────────────────

interface Dugum { ad: string; cocuklar?: Dugum[]; varsayilanAcik?: boolean; komut?: boolean }

/** Çağrı sayan sahte sağlayıcı: hangi düğümün çocuklarının istendiği ölçülür. */
function sahteAgac(kok: Dugum[]): AgacKaynagi & { istenen: string[] } {
  const istenen: string[] = [];
  return {
    istenen,
    getChildren(oge?: unknown): readonly unknown[] {
      istenen.push(oge === undefined ? "<kök>" : (oge as Dugum).ad);
      return oge === undefined ? kok : (oge as Dugum).cocuklar ?? [];
    },
    getTreeItem(oge: unknown): AgacOgesi {
      const d = oge as Dugum;
      const cocuklu = (d.cocuklar?.length ?? 0) > 0;
      return {
        label: d.ad, collapsibleState: cocuklu ? (d.varsayilanAcik ? 2 : 1) : 0,
        command: d.komut ? { command: "vscode.open", arguments: [d.ad] } : undefined,
      };
    },
  };
}

function secenek(acik: Record<string, boolean> = {}, onek = "ray"): UretimSecenekleri {
  return {
    acikMi: (id, v) => (id in acik ? acik[id]! : v),
    ikonCoz: () => undefined, dekor: () => undefined, eylemler: satirEylemleri, defter: new IkonDefteri(), onek,
  };
}

/** Bir kök, yirmi çocuk, her çocukta otuz dört torun: 21 + 680 = 701 düğüm. */
function yediYuzDugum(): Dugum[] {
  const cocuklar: Dugum[] = Array.from({ length: 20 }, (_, i) => ({
    ad: `Faz ${i}`, komut: true,
    cocuklar: Array.from({ length: 34 }, (_, j) => ({ ad: `ADM-${i}-${j}`, komut: true })),
  }));
  return [{ ad: "Sarmal", varsayilanAcik: true, komut: true, cocuklar }];
}

// ── ① SEKMELER ──────────────────────────────────────────────────────────────

test("sekmeler: beş sekme soldan sağa Ray · Tren · Makinist · Gözlemler · Ayarlar (OZK-13); bozuk değer Ray'e düşer", () => {
  assert.deepEqual([...SEKMELER], ["ray", "tren", "makinist", "gozlemler", "ayarlar"]);
  assert.equal(sekmeNormalle("tren"), "tren");
  assert.equal(sekmeNormalle("ayarlar"), "ayarlar");
  for (const kotu of [undefined, null, 3, "graf", "", "RAY", {}]) assert.equal(sekmeNormalle(kotu), "ray", String(kotu));
});

test("klavye komşuluğu: oklar sarar, Home ve End uçlara gider, başka tuş seçimi değiştirmez", () => {
  assert.equal(komsuSekme("ray", "ArrowRight"), "tren");
  assert.equal(komsuSekme("makinist", "ArrowRight"), "gozlemler");
  assert.equal(komsuSekme("ayarlar", "ArrowRight"), "ray", "sağ ok sondan başa sarmalı");
  assert.equal(komsuSekme("ray", "ArrowLeft"), "ayarlar", "sol ok baştan sona sarmalı");
  assert.equal(komsuSekme("tren", "Home"), "ray");
  assert.equal(komsuSekme("tren", "End"), "ayarlar");
  assert.equal(komsuSekme("tren", "Enter"), "tren");
});

test("sekme şeridi: beş sekme, seçili olan aria-selected ve tek tabulu, simge ve ad taşır; Makinist sayı rozeti yalnız doluyken görünür", () => {
  for (const secili of SEKMELER) {
    const h = sekmeSeridiHtml(secili, SIMGELER, 0);
    assert.equal((h.match(/role="tab"/g) ?? []).length, 5);
    assert.deepEqual([...h.matchAll(/data-sekme="([a-z]+)"/g)].map((m) => m[1]), [...SEKMELER], "şeritteki sıra SEKMELER sırası değil");
    assert.equal((h.match(/aria-selected="true"/g) ?? []).length, 1, "tam bir sekme seçili");
    assert.ok(h.includes(`data-sekme="${secili}" aria-selected="true" tabindex="0"`), `${secili}: seçili sekme tabulu değil`);
    assert.equal((h.match(/tabindex="-1"/g) ?? []).length, 4, "seçili olmayan dört sekme tabu dışıdır (ok tuşlarıyla gezilir)");
    assert.equal((h.match(/<svg width="14" height="14" /g) ?? []).length, 5, "her sekmede 14 piksellik küçük simge");
    assert.ok(/role="tablist"/.test(h));
  }
  assert.ok(/class="rozet" hidden>/.test(sekmeSeridiHtml("ray", SIMGELER, 0)), "boş rozet görünüyor");
  assert.ok(/class="rozet">5</.test(sekmeSeridiHtml("ray", SIMGELER, 5)), "dolu rozet sayıyı taşımıyor");
});

test("TR ve EN sekme adları: Ray · Tren · Makinist · Gözlemler · Ayarlar ve Rail · Train · Driver · Observations · Settings", () => {
  const ad = (): string[] => SEKMELER.map((s) => PANEL_METINLERI.sekmeAdi(s));
  yuzeyDiliniAyarla("tr");
  assert.deepEqual(ad(), ["Ray", "Tren", "Makinist", "Gözlemler", "Ayarlar"]);
  const tr = sekmeSeridiHtml("ray", SIMGELER, 0);
  assert.ok(["Ray", "Tren", "Makinist", "Gözlemler", "Ayarlar"].every((a) => tr.includes(`>${a}<`)));
  yuzeyDiliniAyarla("en");
  try {
    assert.deepEqual(ad(), ["Rail", "Train", "Driver", "Observations", "Settings"]);
    const en = sekmeSeridiHtml("ray", SIMGELER, 0);
    assert.ok(["Rail", "Train", "Driver", "Observations", "Settings"].every((a) => en.includes(`>${a}<`)));
    assert.ok(!en.includes(">Ray<") && !en.includes(">Makinist<") && !en.includes(">Ayarlar<"), "İngilizce şerit Türkçe sekme adı taşıyor");
    for (const s of ["gozlemler", "ayarlar"] as const) assert.ok(!/[çğıöşüİ]/.test(PANEL_METINLERI.bosSekme(s)), `${s}: İngilizce boş durum cümlesi Türkçe harf taşıyor`);
    assert.equal(PANEL_METINLERI.yolHaritasiBasligi, "Roadmap");
    assert.equal(PANEL_METINLERI.dil, "en");
  } finally {
    yuzeyDiliniAyarla("tr");
  }
});

test("'Bölümler' ne bir kutu ne bir ad ne bir etiket olarak hiçbir yerde üretilmez (iki dil, beş sekme)", () => {
  for (const dil of ["tr", "en"] as const) {
    yuzeyDiliniAyarla(dil);
    try {
      for (const sekme of SEKMELER) {
        const h = panelHtml({ sekme, bolumler: hepsi((s) => sekmeIcerigi(s)), simgeler: SIMGELER, nonce: "n", cspSource: "csp", rozet: 2 });
        assert.ok(!/Bölümler|Bolumler|Sections\b|Bölüm\b/iu.test(h), `${dil}/${sekme}: 'Bölümler' metni üretilmiş`);
      }
    } finally {
      yuzeyDiliniAyarla("tr");
    }
  }
  for (const nls of ["package.nls.json", "package.nls.tr.json"]) {
    const m = JSON.parse(oku(nls)) as Record<string, string>;
    for (const anahtar of ["view.panel", "view.container"]) assert.ok(!/Bölümler|Sections/iu.test(m[anahtar] ?? ""), `${nls}: ${anahtar}`);
  }
});

// ── ② AĞAÇ → SATIR ─────────────────────────────────────────────────────────

test("yalnız AÇIK düğümlerin çocukları üretilir: kapalı varsayılanla satır sayısı görünen düğüm sayısıdır ve kapalı düğümün çocukları hiç istenmez", () => {
  const agac = sahteAgac(yediYuzDugum());
  const kapali = satirlariUret(agac, secenek());
  // Kök varsayılan olarak AÇIK (varlık satırı gibi); yirmi Faz kapalı.
  assert.equal(kapali.length, 21, "kök + yirmi kapalı Faz");
  assert.deepEqual(agac.istenen, ["<kök>", "Sarmal"], "kapalı Fazların çocukları istenmiş: 700 düğümlü ağaç boşuna kurulur");
  assert.ok(kapali.slice(1).every((u) => u.satir.durum === "kapali" && u.satir.derinlik === 1));
  assert.equal(kapali[0]!.satir.durum, "acik");
});

test("bir düğümü açmak yalnız onun çocuklarını ekler; hepsini açmak 701 satır üretir", () => {
  const kok = yediYuzDugum();
  const agac = sahteAgac(kok);
  const bir = satirlariUret(agac, secenek({ "ray/Sarmal/Faz 3": true }));
  assert.equal(bir.length, 21 + 34, "açılan Fazın otuz dört çocuğu eklenmeli");
  const hepsi: Record<string, boolean> = {};
  for (let i = 0; i < 20; i++) hepsi[`ray/Sarmal/Faz ${i}`] = true;
  assert.equal(satirlariUret(sahteAgac(kok), secenek(hepsi)).length, 701);
  // Kapatma, varsayılan açık olan kökü de kapatabilir.
  assert.equal(satirlariUret(sahteAgac(kok), secenek({ "ray/Sarmal": false })).length, 1);
});

test("700 düğümde kapalı varsayılanla HTML makul boyutta kalır (< 300 KB) ve hepsi açıkken bile ölçülü büyür", () => {
  const defter = new IkonDefteri();
  const kapali = satirlariUret(sahteAgac(yediYuzDugum()), { ...secenek(), defter });
  const html = panelHtml({
    sekme: "ray", bolumler: tekBolum("ray", rayBolumuHtml({ agac: satirlarHtml(kapali.map((u) => u.satir)) }), defter.stil()),
    simgeler: SIMGELER, nonce: "n", cspSource: "csp", rozet: 0,
  });
  assert.ok(html.length < 300 * 1024, `kapalı varsayılanla belge ${html.length} bayt`);
  assert.equal((html.match(/class="sat"/g) ?? []).length, 21, "DOM'da yalnız görünen satırlar var");
  const hepsi: Record<string, boolean> = {};
  for (let i = 0; i < 20; i++) hepsi[`ray/Sarmal/Faz ${i}`] = true;
  const acik = satirlariUret(sahteAgac(yediYuzDugum()), secenek(hepsi));
  assert.ok(satirlarHtml(acik.map((u) => u.satir)).length < 300 * 1024, "701 satırın tamamı açıkken bile 300 KB'ı geçmemeli");
});

test("kardeş etiketler çakışırsa kimlik sıra sayısıyla ayrılır ve kimlikler tekildir", () => {
  const agac = sahteAgac([{ ad: "Aynı" }, { ad: "Aynı" }, { ad: "Aynı", cocuklar: [{ ad: "Aynı" }], varsayilanAcik: true }]);
  const ids = satirlariUret(agac, secenek()).map((u) => u.satir.id);
  assert.equal(new Set(ids).size, ids.length, ids.join(" | "));
  assert.deepEqual(ids, ["ray/Aynı", "ray/Aynı#1", "ray/Aynı#2", "ray/Aynı#2/Aynı"]);
});

test("satır: etiket, açıklama, ipucu, kutucuk, komut, simge ve yazı rengi sağlayıcının TreeItem'ından okunur", () => {
  const item: AgacOgesi = {
    label: { label: "ADM-1" }, description: "[1/2]", tooltip: { value: "**ADM-1** ipucu" }, collapsibleState: 1,
    command: { command: "vscode.open" }, contextValue: "adim", checkboxState: { state: 1 },
    iconPath: { light: { fsPath: "a" }, dark: { fsPath: "b" } }, resourceUri: { path: "/gelistirmede/0" },
  };
  const kaynak: AgacKaynagi = { getChildren: () => [], getTreeItem: () => item };
  const sec: UretimSecenekleri = {
    ...secenek(), ikonCoz: () => ({ tur: "dosya", acik: "<svg a/>", koyu: "<svg k/>" }),
    dekor: () => ({ renk: "charts.yellow", rozet: "!" }),
  };
  const u = satirKur(kaynak, {}, "ray/x", 2, sec);
  assert.equal(u.satir.etiket, "ADM-1");
  assert.equal(u.satir.aciklama, "[1/2]");
  assert.equal(u.satir.ipucu, "**ADM-1** ipucu");
  assert.equal(u.satir.isaret, true);
  assert.equal(u.satir.komutlu, true);
  assert.equal(u.satir.durum, "kapali");
  assert.equal(u.satir.renk, "charts.yellow");
  assert.equal(u.satir.rozet, "!");
  assert.ok(u.satir.ikonSinifi?.startsWith("i"));
  assert.deepEqual(u.satir.eylemler.map((e) => e.komut), ["sarmal.koniKart"]);
  const h = satirHtml(u.satir);
  assert.ok(h.includes('aria-expanded="false"') && h.includes('data-d="2"') && h.includes('aria-level="3"') && h.includes("checked"));
  assert.ok(h.includes("color:var(--vscode-charts-yellow)"), "yazı rengi tema değişkeninden gelmeli");
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(h), "satıra ham renk gömülmüş");
});

test("ikon defteri: aynı çizim tek kural olur, koyu çizim yalnız koyu temada geçerlidir", () => {
  const d = new IkonDefteri();
  const a = d.ekle("<svg id='a'><!-- yorum --></svg>", "<svg id='k'/>");
  const b = d.ekle("<svg id='a'><!-- yorum --></svg>", "<svg id='k'/>");
  assert.equal(a, b, "aynı çizim ikinci sınıf doğurmuş");
  assert.equal(d.boyut, 1);
  const stil = d.stil();
  assert.ok(stil.includes(`.${a}{background-image:url("data:image/svg+xml,`));
  assert.ok(stil.includes(`body.vscode-dark .${a}`) && stil.includes("body.vscode-high-contrast:not(.vscode-high-contrast-light)"));
  assert.ok(!stil.includes("yorum") && !stil.includes("%3C!--"), "SVG yorumu stile sızmış");
  const e = new IkonDefteri();
  e.ekle("<svg id='x'/>", "<svg id='x'/>");
  assert.equal(e.stil().split("\n").length, 1, "iki tema aynıysa tek kural yeter");
});

// ── ③ HTML GÜVENLİĞİ ────────────────────────────────────────────────────────

test("güvenlik: kullanıcı verisi kaçırılır; belge nonce'lu TEK betik taşır, satır içi olay ve dış kaynak yoktur", () => {
  const kotu = `"><img src=x onerror=alert(1)>'<script>alert(2)</script>`;
  const h = satirHtml({
    id: kotu, derinlik: 0, etiket: kotu, aciklama: kotu, ipucu: kotu, durum: "yaprak", komutlu: false,
    eylemler: [{ komut: kotu, ad: kotu, ikon: "kopya" }],
  });
  assert.ok(!h.includes("<img") && !h.includes("<script"), "ham etiket gövdeye girmiş");
  // Çıplak `"` kalmamalı: nitelik değerinden kaçılamaz (kaçırılmış hâli &quot; olarak metinde kalır).
  assert.ok(!/="[^"]*"[^ >]*"/.test(h.replace(/<svg[\s\S]*?<\/svg>/g, "")), "nitelikten kaçılabilmiş");
  assert.equal(kacir(`<&>"'`), "&lt;&amp;&gt;&quot;&#39;");
  const belge = panelHtml({ sekme: "ray", bolumler: tekBolum("ray", h), simgeler: SIMGELER, nonce: "NONCE123", cspSource: "vscode-resource", rozet: 0 });
  assert.equal((belge.match(/<script/g) ?? []).length, 1, "tam bir betik bloğu olmalı");
  assert.ok(belge.includes('<script nonce="NONCE123">'));
  assert.ok(/script-src 'nonce-NONCE123'/.test(belge) && /default-src 'none'/.test(belge));
  assert.ok(!/script-src[^;]*unsafe/.test(belge), "betik kaynağı gevşetilmiş");
  assert.ok(!/<(link|iframe|object|embed)\b|<script[^>]*src=|\son[a-z]+=["']/i.test(belge), "dış kaynak ya da satır içi olay işleyicisi var");
});

test("istemci betiği: acquireVsCodeApi tek kez, ileti tipleri sınırlı ve hiçbir yerde eval ya da Function yok", () => {
  const belge = panelHtml({ sekme: "ray", bolumler: tekBolum("ray", ""), simgeler: SIMGELER, nonce: "n", cspSource: "c", rozet: 0 });
  const betik = /<script nonce="n">([\s\S]*)<\/script>/.exec(belge)![1]!;
  assert.equal((betik.match(/acquireVsCodeApi\(\)/g) ?? []).length, 1);
  assert.ok(!/\beval\(|new Function|document\.write|insertAdjacentHTML/.test(betik));
  // Büyük harf taşıyan tipler de sayılır (bolumGec eskiden bu süzgeçten kaçıyordu).
  const gonderilen = [...betik.matchAll(/tip: '([a-zA-Z]+)'/g)].map((m) => m[1]).sort();
  assert.deepEqual([...new Set(gonderilen)], ["ac", "bolumGec", "eylem", "gec", "hazir", "isaretle", "kardes", "komut", "onay", "sekme", "sinamaRapor"], "betiğin gönderdiği ileti tipleri değişmiş");
  // Betik sözdizimi geçerlidir.
  assert.doesNotThrow(() => new Function(betik.replace("acquireVsCodeApi()", "({postMessage(){}})")), "betik derlenmiyor");
});

// ── ④ MİNİ GRAF GÖVDESİ ────────────────────────────────────────────────────

test("Mini Graf gölge köke hazırlanır: body seçicisi :host olur, belge sarmalayıcıları atılır, çizime dokunulmaz", () => {
  const belge = `<!DOCTYPE html><html lang="tr"><meta charset="UTF-8"><style>
:root{--g:18px}
body{font-size:12px;padding:0}
.a body{x:y}
.k{color:red}</style><style>.hover-1:hover{opacity:1}</style><body>
<p class="k">merhaba <a href="command:sarmal.dosyaAc?%5B%22a%22%2C1%5D">kaynak</a></p></body></html>`;
  const p = grafParcasi(belge);
  assert.ok(p.includes(":host{font-size:12px;padding:0}"), "body seçicisi :host olmalı");
  assert.ok(p.includes(".a body{x:y}"), "başka seçicinin içindeki body'ye dokunulmaz");
  assert.ok(p.includes(".k{color:red}") && p.includes(".hover-1:hover{opacity:1}"), "stiller korunmalı");
  assert.ok(p.includes('<p class="k">merhaba <a href="command:sarmal.dosyaAc?%5B%22a%22%2C1%5D">kaynak</a></p>'), "gövde değişmemeli");
  assert.ok(!/<html|<body|<!DOCTYPE|<meta/.test(p), "belge sarmalayıcıları gölge köke girmemeli");
});

test("Mini Graf gölge kökünde :root kuralı :host olur; satır yüksekliği, girinti ve kılavuz değişkenleri tanımlı kalır (Founder ekranı 2026-10-22)", () => {
  // Kusur: gölge kökte :root eşleşmez; --sat tanımsız kalınca satırlar 26 yerine ~17 px çizildi,
  // 26 px düzene göre çizilen bağ şeridi satırların altından taştı, aşağı kaydıranda yazısız
  // pembe çizgiler kaldı ve yapışkan sekme şeridi gövdenin sonunda ekrandan çıktı.
  const ornek = grafParcasi(`<html><style>
:root{--g:18px}
body{padding:0}</style><body></body></html>`);
  assert.ok(ornek.includes(":host{--g:18px}"), ":root seçicisi :host olmalı");
  for (const [ad, belge] of [["ağaç ve boş hâl", bosHtml("x")], ["görünüm seçici", seciciHtml("agac")]] as const) {
    const p = grafParcasi(belge);
    const stil = [...p.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join("");
    assert.ok(!/(^|\})\s*(:root|body|html)\s*\{/.test(stil), `${ad}: gölge kökte eşleşmeyen belge seçicisi kalmamalı`);
    const kullanilan = new Set([...stil.matchAll(/var\((--(?!vscode-)[\w-]+)/g)].map((m) => m[1]));
    for (const d of kullanilan) {
      assert.ok(new RegExp(`${d}\\s*:`).test(p), `${ad}: ${d} gölge kökte tanımlı olmalı`);
    }
  }
  assert.ok(/:host\{--sat:\d+px/.test(grafParcasi(bosHtml("x"))), "--sat :host üzerinde tanımlanmalı");
});

test("Ray bölümü: 'YOL HARİTASI' başlığı, ağaç, ardından Mini Graf; ayar kapalıysa Mini Graf hiç çizilmez; boşken cümle", () => {
  yuzeyDiliniAyarla("tr");
  const dolu = rayBolumuHtml({ agac: "<div class='sat'></div>", graf: "<html><style>body{x:y}</style><body><p>g</p></body></html>" });
  assert.ok(dolu.indexOf("YOL HARİTASI") >= 0 && dolu.indexOf("YOL HARİTASI") < dolu.indexOf('id="agac"'), "başlık ağacın üstünde değil");
  assert.ok(dolu.indexOf('id="agac"') < dolu.indexOf('id="graf"'), "Mini Graf ağacın altında değil");
  assert.ok(dolu.includes("MİNİ GRAF") && dolu.includes('<template id="graf-sablon">'));
  assert.ok(/<template id="graf-sablon"><style>:host\{x:y\}<\/style><p>g<\/p><\/template>/.test(dolu));
  // Her bölüm başlığıyla birlikte kendi sütunundadır; sütunlar tek dizilimin içindedir (PNL-A03).
  assert.match(dolu, /^<div class="ray-duzen"><div class="kol" data-kol="agac"><h2 class="bas">[\s\S]*<div id="bolum-agac" class="bolum">[\s\S]*<\/div><div class="kol" data-kol="graf"><h2 class="bas araya">[\s\S]*<div id="bolum-graf" class="bolum">[\s\S]*<\/div><\/div><\/div>$/);
  const grafsiz = rayBolumuHtml({ agac: "<div class='sat'></div>" });
  assert.ok(!grafsiz.includes('id="graf"') && !grafsiz.includes("MİNİ GRAF"), "ayar kapalıyken Mini Graf çizilmiş");
  assert.equal((grafsiz.match(/class="kol"/g) ?? []).length, 1, "ayar kapalıyken tek sütun kalmalı");
  const bos = rayBolumuHtml({ agac: "", bosMesaj: "Henüz plan yok." });
  assert.ok(bos.includes("Henüz plan yok.") && !/role="tree" aria-label/.test(bos), "boş durumda cümle ağacın yerini almalı");
  yuzeyDiliniAyarla("en");
  try { assert.ok(rayBolumuHtml({ agac: "", graf: "<body></body>" }).includes("ROADMAP")); } finally { yuzeyDiliniAyarla("tr"); }
});

test("Tren bölümü: kardeş yokken bağlantı yoktur, varken 'Koşular paneli kardeş eklentide' bağlantısı çizilir; boşken cümle", () => {
  yuzeyDiliniAyarla("tr");
  assert.ok(!trenBolumuHtml("<div></div>", false, false).includes("data-kardes"));
  const k = trenBolumuHtml("<div></div>", false, true);
  assert.ok(k.includes("data-kardes") && k.includes("Koşular paneli kardeş eklentide"));
  assert.ok(trenBolumuHtml("", true, false).includes("ajan"), "boş Tren cümlesi yok");
});

// ── ⑤ KOMUT KÖPRÜSÜ ────────────────────────────────────────────────────────

test("komut köprüsü: yalnız üç komut geçer; bozuk ya da izinsiz bağ reddedilir", () => {
  const a = encodeURIComponent(JSON.stringify(["/x/a.sar", 7]));
  assert.deepEqual(grafKomutu(`command:sarmal.dosyaAc?${a}`), { komut: "sarmal.dosyaAc", argumanlar: ["/x/a.sar", 7] });
  assert.deepEqual(grafKomutu(`command:sarmal.miniGraf.gorunumSec?${encodeURIComponent(JSON.stringify(["klasik"]))}`),
    { komut: "sarmal.miniGraf.gorunumSec", argumanlar: ["klasik"] });
  assert.deepEqual(grafKomutu("command:sarmal.miniGraf.gorunumKapat"), { komut: "sarmal.miniGraf.gorunumKapat", argumanlar: [] });
  for (const kotu of ["command:workbench.action.reloadWindow", "command:sarmal.rayDegistir", "https://example.com", "javascript:alert(1)", "command:",
    "command:sarmal.dosyaAc", `command:sarmal.dosyaAc?${encodeURIComponent(JSON.stringify([1, "a"]))}`, "command:sarmal.dosyaAc?%7Bkotu",
    `command:sarmal.miniGraf.gorunumSec?${encodeURIComponent(JSON.stringify([5]))}`])
    assert.equal(grafKomutu(kotu), undefined, kotu);
});

test("satır eylemleri: Adım koni kartı alır; ateşlemiş hatırlatıcı önce kapatma sonra kopyalama; bilinmeyen bağlam eylemsizdir", () => {
  assert.deepEqual(satirEylemleri("adim").map((e) => e.komut), ["sarmal.koniKart"]);
  assert.deepEqual(satirEylemleri("sarmalHatirlaticiAtesledi").map((e) => e.komut), ["sarmal.hatirlaticiKapat", "sarmal.satiriKopyala"]);
  for (const c of ["sarmalHatirlatici", "sarmalBildirim", "sarmalFikir"]) assert.deepEqual(satirEylemleri(c).map((e) => e.komut), ["sarmal.satiriKopyala"], c);
  for (const c of [undefined, "", "sarmalOnayKapisi", "sarmalMakinistGrubu.onaylar", "baska"]) assert.deepEqual(satirEylemleri(c), [], String(c));
});

test("ağaç kılavuzları her zaman çizilir: ince, tül morunda, fare ağacın üzerine gelmesini beklemez; seçimin etkin kılavuzu korunur (PNL-A04)", () => {
  // Kusur (Founder 2026-10-26 ve 2026-10-27): çizgiler yalnız fare ağacın üzerindeyken görünüyor,
  // fare ayrılınca kayboluyordu. Hüküm: çizgiler her zaman görünür, incedir ve rengi editördeki tül
  // derinliğin mor tonudur.
  const temiz = PANEL_STILI.replace(/\/\*[\s\S]*?\*\//g, "");
  const once = /\n\.sat::before\{([^}]*)\}/.exec(temiz)?.[1] ?? "";
  assert.match(once, /width:calc\(var\(--d,0\) \* 12px\)/, "her ata kademesi için 12 px aralıklı kılavuz");
  assert.doesNotMatch(once, /opacity\s*:\s*0(?![.\d])/, "kılavuz dinlenikken saydam: yalnız fare üzerindeyken görünür");
  assert.doesNotMatch(temiz, /:hover[^{]*\.sat::before\{[^}]*opacity/, "kılavuzun görünürlüğü fareye bağlı");
  // İnce: 10 ile 11 piksel arasında, yani 1 piksellik çizgi; renk tül morunun ince çizgi değişkeni.
  assert.match(once, /transparent 10px,var\(--tul-cizgi\) 10px,var\(--tul-cizgi\) 11px,transparent 11px/);
  assert.match(temiz, new RegExp(`:root\\{--tul-cizgi:${esc(tulRengi("acik", CIZGI_ALFA))};--tul-vurgu:${esc(tulRengi("acik", 1))}\\}`), "açık tema tonu tül kaynağından gelmiyor");
  assert.match(temiz, new RegExp(`body\\.vscode-dark,body\\.vscode-high-contrast:not\\(\\.vscode-high-contrast-light\\)\\{--tul-cizgi:${esc(tulRengi("koyu", CIZGI_ALFA))};--tul-vurgu:${esc(tulRengi("koyu", 1))}\\}`), "koyu tema tonu tül kaynağından gelmiyor");
  // Seçimin etkin kılavuzu yerinde ve seçimle yeniden kurulur.
  assert.match(PANEL_STILI, /\.sat\.kl::after\{[^}]*border-left:1px solid var\(--vscode-tree-indentGuidesStroke/, "etkin kılavuz tema renginden gelir");
  const kilavuzCagrisi = PANEL_BETIGI.match(/kilavuzYaz\(\);/g)?.length ?? 0;
  assert.ok(/function kilavuzYaz\(\)/.test(PANEL_BETIGI) && kilavuzCagrisi >= 3, "seçim, parça yazımı ve satır yamasında etkin kılavuz yeniden kurulur");
});

/** Düzenli ifade için kaçırma. */
function esc(s: string): string { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

test("fare vurgusu: üzerine gelinen satırın dalının çizgisi, gri açıklaması ve simgesi tül morunda renklenir; üç ağaçta aynıdır (PNL-A04)", () => {
  const temiz = PANEL_STILI.replace(/\/\*[\s\S]*?\*\//g, "");
  // Dalın çizgisi: işaretli satırın ::before katmanı dalın kademesinde tam tonu taşır, öteki kademeler ince kalır.
  const dv = /\n\.sat\.dv::before\{z-index:1;background:([^}]*)\}/.exec(temiz)?.[1] ?? "";
  assert.ok(dv, "vurgulu dalın katmanı seçimin etkin çizgisinin (kl::after) üstünde değil: seçili dalda vurgu örtülür");
  assert.match(dv, /var\(--tul-vurgu\) 10px,var\(--tul-vurgu\) 11px,transparent 11px\) calc\(var\(--va,0\) \* 12px\) 0\/12px 100% no-repeat/, "dalın kademesi vurgulanmıyor");
  assert.match(dv, /var\(--tul-cizgi\)[^,]*,var\(--tul-cizgi\) 11px,transparent 11px\) 0 0\/12px 100% repeat-x/, "vurgulu satırda öteki kademeler kayboluyor");
  // Aynı satırın gri açıklaması ve simgesi; seçili satırın yazısı seçim renginde kalır.
  assert.match(temiz, /\n\.sat:hover:not\(\.sec\) \.ac\{color:var\(--tul-vurgu\)\}/);
  assert.match(temiz, /\n\.sat:hover \.ik\{filter:[^}]*drop-shadow\([^)]*var\(--tul-vurgu\)\)\}/);
  // Seçici hiçbir ağaca özgü değildir: Ray, Tren ve Makinist aynı .sat satırını paylaşır.
  assert.doesNotMatch(temiz, /#(agac|tren-agac|makinist-agac)[^{]*\.(dv|ac|ik)\b/, "vurgu bir ağaca özgü yazılmış");
  // Betik: dal kuralı seçim ve fare için tektir; fare satıra gelince kurulur, panelden çıkınca söner,
  // içerik yenilenince fare altındaki satırdan yeniden kurulur.
  assert.match(PANEL_BETIGI, /function kilavuzYaz\(\) \{ dalIsaretle\(satirBul\(seciliSatir\), 'kl', '--ka'\); \}/);
  assert.match(PANEL_BETIGI, /dalIsaretle\(s, 'dv', '--va'\)/);
  assert.match(PANEL_BETIGI, /addEventListener\('mouseover', function \(e\) \{\s*var t = e\.target;\s*vurguYaz\(t && t\.closest \? t\.closest\('\.sat'\) : null\);/);
  assert.match(PANEL_BETIGI, /addEventListener\('mouseout', function \(e\) \{ if \(!e\.relatedTarget\) vurguYaz\(null\); \}\)/);
  assert.ok((PANEL_BETIGI.match(/vurguTazele\(\);/g) ?? []).length >= 2, "parça yazımı ve satır yamasında vurgu yeniden kurulmuyor");
});

test("tül moru tek kaynaktır: editörün tül derinliği ile panel çizgileri aynı tonu tul-rengi.ts'ten okur; ton iki temada okunur", () => {
  const ham = (rgb: readonly number[]): RegExp => new RegExp(rgb.map(String).join("\\s*,\\s*"));
  const tanimlayan = readdirSync(`${KOK}src`).filter((f) => f.endsWith(".ts"))
    .filter((f) => [TUL_MORU.koyu, TUL_MORU.acik].some((rgb) => ham(rgb).test(oku(`src/${f}`))));
  assert.deepEqual(tanimlayan, ["tul-rengi.ts"], "tül morunun ikinci bir tanımı var");
  assert.match(oku("src/girinti.ts"), /import \{ tulRengi \} from "\.\/tul-rengi\.ts";/);
  assert.match(oku("src/girinti.ts"), /backgroundColor: tulRengi\("koyu", a\),\s*\n\s*light: \{ backgroundColor: tulRengi\("acik", a \* 0\.8\) \}/);
  assert.equal(tulRengi("koyu", 0.035), "rgba(199,146,234,0.035)", "editörün tül zemini bugünkü tonundan ayrıştı");
  // Vurgu yazısı iki temanın kenar çubuğu zemininde okunur (WCAG AA, 4,5:1).
  const parlaklik = (rgb: readonly number[]): number => {
    const [r, g, b] = rgb.map((c) => { const x = c / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
  };
  const karsitlik = (a: readonly number[], b: readonly number[]): number => {
    const [x, y] = [parlaklik(a), parlaklik(b)].sort((m, n) => n - m);
    return (x! + 0.05) / (y! + 0.05);
  };
  assert.ok(karsitlik(TUL_MORU.koyu, [24, 24, 24]) >= 4.5, "koyu temada vurgu yazısı okunmuyor");
  assert.ok(karsitlik(TUL_MORU.acik, [248, 248, 248]) >= 4.5, "açık temada vurgu yazısı okunmuyor");
});

test("Mini Graf kendi kutusundan taşamaz ve sekme şeridi kaydırmayla ekrandan çıkamaz (Founder ekranı 2026-10-22)", () => {
  // Kusur: satırlardan uzun çizilen bağ şeridi gövdenin dışına taştı; belge gövdeden uzun olunca
  // o günkü yapışkan şerit gövdenin sonunda ekrandan çıktı. Kutu taşmayı kendi içinde tutar.
  assert.match(PANEL_STILI, /#graf\{display:block;overflow-x:auto\}/);
  // PNL-A03'ten beri şerit kayan alanın DIŞINDADIR: belge kaymaz, içerik alanı kendi içinde kayar.
  assert.match(PANEL_STILI, /\nbody\{display:flex;flex-direction:column;overflow:hidden;/);
  assert.match(PANEL_STILI, /\.seritler\{flex:none;/);
  // PNL-A18: içerik alanı beş sekmenin bölüm kabını taşır; görünen kap kendi içinde kayar.
  assert.match(PANEL_STILI, /#icerik\{flex:1 1 auto;min-height:0;display:flex;flex-direction:column\}/);
  assert.match(PANEL_STILI, /\.sekme-paneli\{flex:1 1 auto;min-height:0;overflow:auto;/);
  assert.match(PANEL_STILI, /\.sekme-paneli\[hidden\]\{display:none!important\}/);
});

// ── ⑥ YERLEŞİM (PNL-A03 · Founder 2026-10-27: geniş ve alçak alt panel) ─────────

/** Stil metninden yorumları atar; ölçüm kural metnini okur, boyanan sonucu görsel kontrol ölçer. */
const stilKurali = (secici: string): string => {
  const temiz = PANEL_STILI.replace(/\/\*[\s\S]*?\*\//g, "");
  const i = temiz.indexOf(`\n${secici}{`);
  assert.ok(i >= 0, `${secici} kuralı stilde yok`);
  return temiz.slice(i + secici.length + 2, temiz.indexOf("}", i));
};

test("sekme şeridi küçüktür: sekme yazısı 11 piksel, şerit 26 piksel, simge 14 piksel (Founder 2026-10-27)", () => {
  assert.match(stilKurali(".seritler"), /(^|;)height:26px(;|$)/);
  assert.match(stilKurali(".sekme"), /(^|;)font-size:11px(;|$)/);
  assert.match(stilKurali(".sekme svg"), /width:14px;height:14px/);
});

test(`dar şeritte (${DAR_SERIT_PX} pikselden dar) seçili olmayan sekme yalnız simgedir; adı ekran okuyucu için yerinde kalır`, () => {
  assert.ok(DAR_SERIT_PX > 300 && DAR_SERIT_PX <= 460, "eşik 300 piksellik kenar çubuğunu kapsamalı, 460'ta adlar sığar");
  const temiz = PANEL_STILI.replace(/\/\*[\s\S]*?\*\//g, "");
  const m = new RegExp(`@media \\(max-width:${DAR_SERIT_PX - 1}px\\)\\{([\\s\\S]*?)\\n\\}`).exec(temiz);
  assert.ok(m, "dar şerit kuralı yok");
  assert.match(m![1]!, /\.sekme:not\(\[aria-selected="true"\]\) \.sk-ad\{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset\(50%\)/);
  assert.doesNotMatch(m![1]!, /display:none|visibility:hidden/, "gizlenen ad erişilebilirlik ağacından da düşer");
  // Ad her sekmede yazılıdır ve ipucu sekmenin adını taşır.
  const h = sekmeSeridiHtml("ray", SIMGELER, 0);
  for (const s of SEKMELER) assert.ok(h.includes(`<span class="sk-ad">${kacir(PANEL_METINLERI.sekmeAdi(s))}</span>`), s);
});

test("Yol Haritası ve Mini Graf başlıkları çok küçük puntoludur: 10 piksel (Founder 2026-10-27)", () => {
  assert.match(stilKurali(".bas"), /(^|;)font-size:10px(;|$)/);
  // Düğme yazısı başlıktan miras alır; kendi boyutunu yazmaz.
  assert.match(stilKurali(".bb"), /font:inherit/);
  assert.doesNotMatch(stilKurali(".bb"), /font-size/);
});

test("pencere boyuna dayanan kural yoktur: stilde vh birimi ve sabit şerit ölçüsüyle hesap yok; hiçbir başlık dibe yapıştırılmaz", () => {
  const temiz = PANEL_STILI.replace(/\/\*[\s\S]*?\*\//g, "");
  assert.doesNotMatch(temiz, /\d(\.\d+)?d?vh\b/, "stilde vh birimi var: yerleşim pencere boyuna dayanıyor");
  assert.doesNotMatch(temiz, /calc\([^)]*\b(26|32)px/, "şeridin ölçüsü bir hesapta varsayılmış");
  assert.doesNotMatch(temiz, /position:sticky;bottom/, "bir başlık alanın dibine yapıştırılıyor");
  assert.match(temiz, /html,body\{margin:0;padding:0;height:100%\}/, "gövde panelin verdiği alanı doldurmuyor");
});

test(`geniş panelde (en az ${GENIS_PANEL_PX} piksel) Ray'in iki bölümü yan yana sütundur, her sütun kendi içinde kayar; dar panelde alt alta akar`, () => {
  const temiz = PANEL_STILI.replace(/\/\*[\s\S]*?\*\//g, "");
  assert.ok(GENIS_PANEL_PX > 460 && GENIS_PANEL_PX < 1400, "eşik dar kenar çubuğu (300 ve 460) ile Founder'ın alt paneli (1400) arasında olmalı");
  const m = new RegExp(`@media \\(min-width:${GENIS_PANEL_PX}px\\)\\{([\\s\\S]*?)\\n\\}`).exec(temiz);
  assert.ok(m, "geniş panel kuralı yok");
  const genis = m![1]!;
  assert.match(genis, /\.ray-duzen\{[^}]*display:flex;align-items:stretch/, "sütunlar yan yana dizilmiyor");
  assert.match(genis, /\.kol\{flex:1 1 0;min-width:0;min-height:0;display:flex;flex-direction:column\}/, "sütun alanı eşit paylaşmıyor");
  assert.match(genis, /\.kol>\.bolum\{[^}]*overflow:auto/, "sütun gövdesi kendi içinde kaymıyor");
  assert.match(genis, /\.kol:has\(>\.bolum\[hidden\]\)\{flex:0 0 auto\}/, "katlanan bölüm boşalan genişliği bırakmıyor");
  // Geniş kural dışında sütunlar düzenlenmez: dar panelde blok akışı (alt alta) geçerlidir.
  const disari = temiz.replace(m![0], "");
  assert.doesNotMatch(disari, /\.(ray-duzen|kol)\{/, "dar panel için sütun kuralı yazılmış");
});

test("Gözlemler ve Ayarlar sekmeleri boş bölüm olarak doğar: yalnız kısa boş durum cümlesi, ağaç yok (PNL-A03 sınırı)", () => {
  yuzeyDiliniAyarla("tr");
  for (const s of ["gozlemler", "ayarlar"] as const) {
    const h = bosSekmeHtml(s);
    assert.equal(h, `<p class="bos" data-bos-sekme="${s}">${kacir(PANEL_METINLERI.bosSekme(s))}</p>`);
    assert.ok(PANEL_METINLERI.bosSekme(s).length > 0 && !/role="tree"/.test(h));
    const belge = panelHtml({ sekme: s, bolumler: tekBolum(s, h), simgeler: SIMGELER, nonce: "n", cspSource: "c", rozet: 0 });
    assert.ok(belge.includes(`data-sekme="${s}" aria-selected="true"`));
  }
  assert.match(bosSekmeHtml("gozlemler"), /Gözlemler/);
  assert.match(bosSekmeHtml("ayarlar"), /ayarları/);
});

test("istemci betiği ikinci bir sekme listesi tutmaz: seçilebilir sekmeler şeridin kendisidir", () => {
  assert.doesNotMatch(PANEL_BETIGI, /var SEKMELER\s*=/, "betik sekme listesini kopyalıyor; yeni sekme eklenince ayrışır");
  assert.match(PANEL_BETIGI, /function sekmeSec\(ad, odakla\) \{\s*\n\s*if \(!sekmeler\(\)\.some\(/);
});

test("Mini Graf köprüsü tektir: HTML ve SVG bağı harf büyüklüğünden bağımsız yakalanır, olay VS Code'un bağ işleyicisine bırakılmaz; satır seçimi grafı yeniden çizmeden işareti taşır (PNL-A05)", () => {
  // Kusur (gerçek VS Code ölçümü 2026-10-27): Klasik görünümün SVG <a> öğesinin adı küçük harf geldiği için köprü onu
  // tanımıyordu; tıklama VS Code'un bağ işleyicisine düşüyor, panel komut bağına izin vermediği için gezinti engelleniyordu.
  assert.match(PANEL_BETIGI, /String\(n\.tagName \|\| ''\)\.toLowerCase\(\) === 'a' && n\.getRootNode/);
  assert.doesNotMatch(PANEL_BETIGI, /n\.tagName === 'A'/, "köprü yalnız büyük harfli HTML bağını arıyor");
  assert.match(PANEL_BETIGI, /e\.preventDefault\(\);\s*\n\s*e\.stopPropagation\(\);\s*\n\s*var h = n\.getAttribute\('href'\) \|\| n\.getAttribute\('xlink:href'\)/);
  // Satır seçimi: önceki işaret kalkar, önceki seçimin bağ çizgileri gizlenir, işaret bağı verilen düğüme geçer; innerHTML yazılmaz.
  const sec = /function grafSec\(href\) \{([\s\S]*?)\n  \}/.exec(PANEL_BETIGI)?.[1] ?? "";
  assert.ok(sec, "betikte grafSec yok");
  assert.match(sec, /classList\.remove\('secili'\)/);
  assert.match(sec, /svg\.serit, \.bag, \.zemin, \.uretir/);
  assert.match(sec, /a\.getAttribute\('href'\) === href/);
  assert.doesNotMatch(sec, /innerHTML/, "seçim grafı yeniden yazıyor");
  assert.match(PANEL_BETIGI, /m\.tip === 'grafSec'\) \{\s*grafSec\(m\.href\);/);
});

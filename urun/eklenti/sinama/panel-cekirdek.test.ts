// ═══════════════════════════════════════════════════════════════════════════
// panel-cekirdek.test.ts — 🧭 SARMAL PANELİNİN SAF ÇEKİRDEĞİ (Founder 2026-10-21)
//
//   Kap TEK webview görünümüdür; Ray · Tren · Makinist sekme şeridi o görünümün
//   içindedir. Bu süit VS Code'suz ölçülebilen her şeyi kilitler: sekme kimlikleri
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
  IkonDefteri, SEKMELER, grafKomutu, grafParcasi, kacir, komsuSekme, makinistBolumuHtml, panelHtml, rayBolumuHtml, satirEylemleri,
  satirHtml, satirKur, satirlarHtml, satirlariUret, sekmeNormalle, sekmeSeridiHtml, trenBolumuHtml,
  type AgacKaynagi, type AgacOgesi, type SekmeSimgeleri, type UretimSecenekleri,
} from "../src/panel-cekirdek.ts";
import { SEKME_SIMGE_KAYNAKLARI } from "../src/simge-cizelgesi.ts";
import { bosHtml } from "../src/minigraf-cekirdek.ts";
import { seciciHtml } from "../src/minigraf-gorunum.ts";
import { PANEL_BETIGI, PANEL_STILI } from "../src/panel-betik.ts";
import { PANEL_METINLERI, yuzeyDiliniAyarla } from "../src/yuzey-metinleri.ts";

const KOK = fileURLToPath(new URL("..", import.meta.url));
const oku = (g: string): string => readFileSync(`${KOK}${g}`, "utf8");
const SIMGELER: SekmeSimgeleri = {
  ray: oku(SEKME_SIMGE_KAYNAKLARI.ray), tren: oku(SEKME_SIMGE_KAYNAKLARI.tren), makinist: oku(SEKME_SIMGE_KAYNAKLARI.makinist),
};

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

test("sekmeler: üç sekme soldan sağa Ray · Tren · Makinist; bozuk değer Ray'e düşer", () => {
  assert.deepEqual([...SEKMELER], ["ray", "tren", "makinist"]);
  assert.equal(sekmeNormalle("tren"), "tren");
  for (const kotu of [undefined, null, 3, "graf", "", "RAY", {}]) assert.equal(sekmeNormalle(kotu), "ray", String(kotu));
});

test("klavye komşuluğu: oklar sarar, Home ve End uçlara gider, başka tuş seçimi değiştirmez", () => {
  assert.equal(komsuSekme("ray", "ArrowRight"), "tren");
  assert.equal(komsuSekme("makinist", "ArrowRight"), "ray", "sağ ok sondan başa sarmalı");
  assert.equal(komsuSekme("ray", "ArrowLeft"), "makinist", "sol ok baştan sona sarmalı");
  assert.equal(komsuSekme("tren", "Home"), "ray");
  assert.equal(komsuSekme("tren", "End"), "makinist");
  assert.equal(komsuSekme("tren", "Enter"), "tren");
});

test("sekme şeridi: üç sekme, seçili olan aria-selected ve tek tabulu, simge ve ad taşır; Makinist sayı rozeti yalnız doluyken görünür", () => {
  for (const secili of SEKMELER) {
    const h = sekmeSeridiHtml(secili, SIMGELER, 0);
    assert.equal((h.match(/role="tab"/g) ?? []).length, 3);
    assert.equal((h.match(/aria-selected="true"/g) ?? []).length, 1, "tam bir sekme seçili");
    assert.ok(h.includes(`data-sekme="${secili}" aria-selected="true" tabindex="0"`), `${secili}: seçili sekme tabulu değil`);
    assert.equal((h.match(/tabindex="-1"/g) ?? []).length, 2, "seçili olmayan iki sekme tabu dışıdır (ok tuşlarıyla gezilir)");
    assert.equal((h.match(/<svg /g) ?? []).length, 3, "her sekmede küçük simge");
    assert.ok(/role="tablist"/.test(h));
  }
  assert.ok(/class="rozet" hidden>/.test(sekmeSeridiHtml("ray", SIMGELER, 0)), "boş rozet görünüyor");
  assert.ok(/class="rozet">5</.test(sekmeSeridiHtml("ray", SIMGELER, 5)), "dolu rozet sayıyı taşımıyor");
});

test("TR ve EN sekme adları: Ray · Tren · Makinist ve Rail · Train · Driver", () => {
  const ad = (): string[] => SEKMELER.map((s) => PANEL_METINLERI.sekmeAdi(s));
  yuzeyDiliniAyarla("tr");
  assert.deepEqual(ad(), ["Ray", "Tren", "Makinist"]);
  const tr = sekmeSeridiHtml("ray", SIMGELER, 0);
  assert.ok(tr.includes(">Ray<") && tr.includes(">Tren<") && tr.includes(">Makinist<"));
  yuzeyDiliniAyarla("en");
  try {
    assert.deepEqual(ad(), ["Rail", "Train", "Driver"]);
    const en = sekmeSeridiHtml("ray", SIMGELER, 0);
    assert.ok(en.includes(">Rail<") && en.includes(">Train<") && en.includes(">Driver<"));
    assert.ok(!en.includes(">Ray<") && !en.includes(">Makinist<"), "İngilizce şerit Türkçe sekme adı taşıyor");
    assert.equal(PANEL_METINLERI.yolHaritasiBasligi, "Roadmap");
    assert.equal(PANEL_METINLERI.dil, "en");
  } finally {
    yuzeyDiliniAyarla("tr");
  }
});

test("'Bölümler' ne bir kutu ne bir ad ne bir etiket olarak hiçbir yerde üretilmez (iki dil, üç sekme)", () => {
  for (const dil of ["tr", "en"] as const) {
    yuzeyDiliniAyarla(dil);
    try {
      for (const sekme of SEKMELER) {
        const icerik = sekme === "ray" ? rayBolumuHtml({ agac: "", graf: "<html><body></body></html>" })
          : sekme === "tren" ? trenBolumuHtml("", true, true) : makinistBolumuHtml("");
        const h = panelHtml({ sekme, icerik, ikonStili: "", simgeler: SIMGELER, nonce: "n", cspSource: "csp", rozet: 2 });
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
    sekme: "ray", icerik: rayBolumuHtml({ agac: satirlarHtml(kapali.map((u) => u.satir)) }),
    ikonStili: defter.stil(), simgeler: SIMGELER, nonce: "n", cspSource: "csp", rozet: 0,
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
  const belge = panelHtml({ sekme: "ray", icerik: h, ikonStili: "", simgeler: SIMGELER, nonce: "NONCE123", cspSource: "vscode-resource", rozet: 0 });
  assert.equal((belge.match(/<script/g) ?? []).length, 1, "tam bir betik bloğu olmalı");
  assert.ok(belge.includes('<script nonce="NONCE123">'));
  assert.ok(/script-src 'nonce-NONCE123'/.test(belge) && /default-src 'none'/.test(belge));
  assert.ok(!/script-src[^;]*unsafe/.test(belge), "betik kaynağı gevşetilmiş");
  assert.ok(!/<(link|iframe|object|embed)\b|<script[^>]*src=|\son[a-z]+=["']/i.test(belge), "dış kaynak ya da satır içi olay işleyicisi var");
});

test("istemci betiği: acquireVsCodeApi tek kez, ileti tipleri sınırlı ve hiçbir yerde eval ya da Function yok", () => {
  const belge = panelHtml({ sekme: "ray", icerik: "", ikonStili: "", simgeler: SIMGELER, nonce: "n", cspSource: "c", rozet: 0 });
  const betik = /<script nonce="n">([\s\S]*)<\/script>/.exec(belge)![1]!;
  assert.equal((betik.match(/acquireVsCodeApi\(\)/g) ?? []).length, 1);
  assert.ok(!/\beval\(|new Function|document\.write|insertAdjacentHTML/.test(betik));
  const gonderilen = [...betik.matchAll(/tip: '([a-z]+)'/g)].map((m) => m[1]).sort();
  assert.deepEqual([...new Set(gonderilen)], ["ac", "eylem", "gec", "hazir", "isaretle", "kardes", "komut", "sekme"], "betiğin gönderdiği ileti tipleri değişmiş");
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
  const grafsiz = rayBolumuHtml({ agac: "<div class='sat'></div>" });
  assert.ok(!grafsiz.includes('id="graf"') && !grafsiz.includes("MİNİ GRAF"), "ayar kapalıyken Mini Graf çizilmiş");
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

test("Ray ağacı girinti kılavuzlarını eski yerel ağaç gibi çizer: üzerine gelince her kademe, seçimde etkin kademe (Founder ekranı 2026-10-22)", () => {
  // Kusur: Ray yerel TreeView iken VS Code girinti kılavuzlarını kendisi çiziyordu; tek webview
  // paneline geçişte bu çizgiler hiç çizilmedi.
  assert.match(PANEL_STILI, /\.sat::before\{[^}]*width:calc\(var\(--d,0\) \* 12px\)/, "her ata kademesi için 12 px aralıklı kılavuz");
  assert.match(PANEL_STILI, /--vscode-tree-inactiveIndentGuidesStroke/, "soluk kılavuz tema renginden gelir");
  assert.match(PANEL_STILI, /\[role="tree"\]:hover \.sat::before\{opacity:1\}/, "ağacın üzerine gelince kılavuzlar görünür");
  assert.match(PANEL_STILI, /\.sat\.kl::after\{[^}]*border-left:1px solid var\(--vscode-tree-indentGuidesStroke/, "etkin kılavuz tema renginden gelir");
  const kilavuzCagrisi = PANEL_BETIGI.match(/kilavuzYaz\(\);/g)?.length ?? 0;
  assert.ok(/function kilavuzYaz\(\)/.test(PANEL_BETIGI) && kilavuzCagrisi >= 3, "seçim, parça yazımı ve satır yamasında etkin kılavuz yeniden kurulur");
});

test("Mini Graf kendi kutusundan taşamaz: gölge kökteki taşma gövdeyi uzatıp yapışkan sekme şeridini ekrandan çıkaramaz (Founder ekranı 2026-10-22)", () => {
  // Kusur: satırlardan uzun çizilen bağ şeridi gövdenin dışına taştı; belge gövdeden uzun olunca
  // yapışkan şerit gövdenin sonunda ekrandan çıktı. Kutu taşmayı kendi içinde tutar.
  assert.match(PANEL_STILI, /#graf\{display:block;overflow-x:auto\}/);
  assert.match(PANEL_STILI, /\.seritler\{position:sticky;top:0;/);
});

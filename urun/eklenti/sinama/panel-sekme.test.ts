// ═══════════════════════════════════════════════════════════════════════════
// panel-sekme.test.ts — ⏱️ SEKME GEÇİŞİ EKLENTİYİ BEKLEMEZ (PNL-A18)
//
//   Founder 2026-10-28 ekran kaydı (0.9.195): sekmeye tıklayınca vurgu hemen yeni
//   sekmeye geçiyor, içerik ise eski sekmede kalıyor ya da başka bir sekmenin içeriği
//   görünüyordu. Neden, içeriğin eklentiye gidip gelen bir iletiye bağlı olmasıydı.
//
//   Bu süit panelin istemci betiğini (panel-betik.ts) en küçük sahte belgede koşturur
//   ve eklentiden HİÇBİR yanıt gelmezken ölçer: tıklama seçili sekmeyi ve görünen kabı
//   anında birlikte değiştirir; eklentinin gecikmiş seçimi daha yeni bir kullanıcı
//   geçişini ezemez; bölüm ve parça güncellemeleri yalnız kendi sekmesinin kabına
//   yazılır ve seçimi değiştirmez. Gerçek tarayıcıdaki ölçüm görsel kontroldedir
//   (arac/gorsel-kontrol.mjs), gerçek VS Code ölçümü eklentinin iş parçacığı kilitliyken
//   sinama_vscode/suite/sekme-gecisi.test.ts dosyasındadır.
// ═══════════════════════════════════════════════════════════════════════════

import "./dil-kur.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { PANEL_BETIGI } from "../src/panel-betik.ts";
import { SEKMELER } from "../src/panel-cekirdek.ts";

/** Seçicinin desteklenen biçimleri: `.a.b`, `#kimlik`, `[ad="d"]` ve bunların birleşimi; başka biçim eşleşmez. */
function eslesir(o: Oge, secici: string): boolean {
  if (secici.includes(":") || secici.includes(" ")) return false;
  for (const p of secici.match(/[#.][\w-]+/g) ?? []) {
    if (p[0] === "#" && o.id !== p.slice(1)) return false;
    if (p[0] === "." && !o.siniflar.has(p.slice(1))) return false;
  }
  for (const [, ad, deger] of secici.matchAll(/\[([\w-]+)="([^"]*)"\]/g)) if (o.getAttribute(ad!) !== deger) return false;
  return true;
}

class Oge {
  readonly nitelik = new Map<string, string>();
  readonly siniflar = new Set<string>();
  readonly cocuklar: Oge[] = [];
  ust?: Oge;
  hidden = false;
  icerik = "";
  readonly belge: Belge;
  readonly id: string;
  constructor(belge: Belge, id = "", sinif = "", nitelikler: Record<string, string> = {}) {
    this.belge = belge;
    this.id = id;
    for (const s of sinif.split(" ").filter(Boolean)) this.siniflar.add(s);
    for (const [k, v] of Object.entries(nitelikler)) this.nitelik.set(k, v);
  }
  get classList() { return { contains: (s: string) => this.siniflar.has(s), add: (s: string) => this.siniflar.add(s), remove: (s: string) => this.siniflar.delete(s) }; }
  get innerHTML(): string { return this.icerik; }
  set innerHTML(h: string) { this.icerik = h; this.cocuklar.length = 0; }
  get textContent(): string { return this.icerik; }
  set textContent(t: string) { this.icerik = t; }
  get isConnected(): boolean { return true; }
  ekle(c: Oge): Oge { c.ust = this; this.cocuklar.push(c); return c; }
  getAttribute(ad: string): string | null { return ad === "id" ? this.id || null : this.nitelik.get(ad) ?? null; }
  setAttribute(ad: string, d: string): void { this.nitelik.set(ad, d); }
  removeAttribute(ad: string): void { this.nitelik.delete(ad); }
  hepsi(): Oge[] { return this.cocuklar.flatMap((c) => [c, ...c.hepsi()]); }
  querySelectorAll(s: string): Oge[] { return this.hepsi().filter((o) => eslesir(o, s)); }
  querySelector(s: string): Oge | null { return this.querySelectorAll(s)[0] ?? null; }
  closest(s: string): Oge | null { return eslesir(this, s) ? this : this.ust?.closest(s) ?? null; }
  focus(): void { this.belge.activeElement = this; }
  click(): void { this.belge.tikla(this); }
  get style() { return { setProperty: () => undefined, display: "" }; }
}

class Belge {
  activeElement: Oge | null = null;
  readonly kok: Oge;
  readonly dinleyiciler = new Map<string, Array<(o: unknown) => void>>();
  constructor() { this.kok = new Oge(this); }
  getElementById(id: string): Oge | null { return this.kok.hepsi().find((o) => o.id === id) ?? null; }
  querySelectorAll(s: string): Oge[] { return this.kok.querySelectorAll(s); }
  querySelector(s: string): Oge | null { return this.kok.querySelector(s); }
  addEventListener(tur: string, f: (o: unknown) => void): void { this.dinleyiciler.set(tur, [...(this.dinleyiciler.get(tur) ?? []), f]); }
  tikla(hedef: Oge): void {
    for (const f of this.dinleyiciler.get("click") ?? []) f({ target: hedef, composedPath: () => [], preventDefault() {}, stopPropagation() {} });
  }
}

/** Panelin belgesi: beş sekme düğmesi, her sekmenin kabı ve kabın içindeki ağaç (Ray'de Mini Graf da). */
function kur(secili = "ray") {
  const belge = new Belge();
  const window = { listeler: [] as Array<(e: unknown) => void>, addEventListener(tur: string, f: (e: unknown) => void) { if (tur === "message") this.listeler.push(f); } };
  for (const s of SEKMELER) {
    belge.kok.ekle(new Oge(belge, `sekme-${s}`, "sekme", { "data-sekme": s, "aria-selected": String(s === secili) }));
    belge.kok.ekle(new Oge(belge, `ikon-stil-${s}`));
  }
  const icerik = belge.kok.ekle(new Oge(belge, "icerik"));
  const kimlik: Record<string, string> = { ray: "agac", tren: "tren-agac", makinist: "makinist-agac" };
  for (const s of SEKMELER) {
    const p = icerik.ekle(new Oge(belge, `panel-${s}`, "sekme-paneli", { "data-sekme": s }));
    p.hidden = s !== secili;
    if (kimlik[s]) p.ekle(new Oge(belge, kimlik[s], "", { role: "tree" }));
    if (s === "ray") p.ekle(new Oge(belge, "graf"));
  }
  const iletiler: Array<Record<string, unknown>> = [];
  vm.runInNewContext(PANEL_BETIGI, {
    document: belge, window, performance: { now: () => 0 }, setTimeout: () => 0,
    acquireVsCodeApi: () => ({ postMessage: (m: unknown) => { iletiler.push(JSON.parse(JSON.stringify(m)) as Record<string, unknown>); } }),
  });
  const durum = () => ({
    secili: belge.querySelectorAll(".sekme").filter((b) => b.getAttribute("aria-selected") === "true").map((b) => b.getAttribute("data-sekme")),
    gorunen: belge.querySelectorAll(".sekme-paneli").filter((p) => !p.hidden).map((p) => p.getAttribute("data-sekme")),
  });
  return {
    belge, iletiler, durum,
    tikla: (s: string) => belge.getElementById(`sekme-${s}`)!.click(),
    gelen: (m: Record<string, unknown>) => { for (const f of window.listeler) f({ data: m }); },
    kap: (s: string) => belge.getElementById(`panel-${s}`)!,
  };
}

test("PNL-A18 · tıklama eklentiden yanıt beklemeden seçili sekmeyi ve görünen kabı birlikte değiştirir; eklentiye yalnız haber gider", () => {
  const b = kur();
  assert.deepEqual(b.durum(), { secili: ["ray"], gorunen: ["ray"] });
  // Eklenti hiç yanıt vermez (iş parçacığı kilitli): her geçiş yine de anında ve tutarlıdır.
  for (const s of ["tren", "makinist", "gozlemler", "ayarlar", "ray", "makinist"]) {
    b.tikla(s);
    assert.deepEqual(b.durum(), { secili: [s], gorunen: [s] }, `${s}: seçili sekme ile görünen kap ayrıştı ya da geçiş eklentiyi bekledi`);
  }
  assert.deepEqual(b.iletiler.filter((m) => m.tip === "sekme").map((m) => [m.ad, m.n]),
    [["tren", 1], ["makinist", 2], ["gozlemler", 3], ["ayarlar", 4], ["ray", 5], ["makinist", 6]]);
});

test("PNL-A18 · eklentinin gecikmiş seçimi eklentiye henüz ulaşmamış daha yeni bir kullanıcı geçişini ezemez; ulaştıktan sonraki seçim uygulanır", () => {
  const b = kur();
  b.tikla("tren");                                     // n = 1, eklenti henüz görmedi
  b.gelen({ tip: "sekmeSec", ad: "makinist", n: 0 });  // eklenti tıklamadan önce verdiği seçimi gönderir
  assert.deepEqual(b.durum(), { secili: ["tren"], gorunen: ["tren"] }, "gecikmiş seçim kullanıcının yeni geçişini ezdi");
  b.gelen({ tip: "sekmeSec", ad: "makinist", n: 1 });  // eklenti geçişi gördükten sonra seçtirdi
  assert.deepEqual(b.durum(), { secili: ["makinist"], gorunen: ["makinist"] });
  b.gelen({ tip: "sekmeSec", ad: "yok", n: 9 });       // bilinmeyen sekme hiçbir şeyi gizlemez
  assert.deepEqual(b.durum(), { secili: ["makinist"], gorunen: ["makinist"] });
});

test("PNL-A18 · bölüm ve parça güncellemesi yalnız kendi sekmesinin kabına yazılır ve seçili sekmeyi değiştirmez", () => {
  const b = kur("makinist");
  const agac = b.belge.getElementById("agac")!;
  // Founder'ın kaydı: Makinist seçiliyken Yol Haritası, ardından Mini Grafın satırları görünmüştü.
  b.gelen({ tip: "bolum", sekme: "ray", html: "<p>yol haritası</p>", ikonStili: ".i1{}" });
  assert.deepEqual(b.durum(), { secili: ["makinist"], gorunen: ["makinist"] }, "gecikmiş Ray bölümü seçimi değiştirdi");
  assert.equal(b.kap("ray").innerHTML, "<p>yol haritası</p>");
  assert.equal(b.kap("makinist").cocuklar.length, 1, "Ray bölümü Makinist kabına yazıldı");
  assert.equal(b.belge.getElementById("ikon-stil-ray")!.textContent, ".i1{}");
  // Parça yalnız kendi sekmesinin kabında aranır: başka sekmeye adreslenmiş parça hedef bulamaz.
  const b2 = kur("makinist");
  const rayAgaci = b2.belge.getElementById("agac")!;
  b2.gelen({ tip: "parca", sekme: "makinist", kimlik: "agac", html: "<div>yanlış</div>" });
  assert.equal(rayAgaci.innerHTML, "", "başka sekmeye adreslenmiş parça Ray ağacına yazıldı");
  b2.gelen({ tip: "parca", sekme: "ray", kimlik: "agac", html: "<div>doğru</div>" });
  assert.equal(rayAgaci.innerHTML, "<div>doğru</div>");
  b2.gelen({ tip: "parca", kimlik: "agac", html: "<div>adressiz</div>" });
  assert.equal(rayAgaci.innerHTML, "<div>doğru</div>", "sekmesi belirtilmemiş parça yazıldı");
  assert.deepEqual(b2.durum(), { secili: ["makinist"], gorunen: ["makinist"] });
  assert.equal(agac.innerHTML, "");
});

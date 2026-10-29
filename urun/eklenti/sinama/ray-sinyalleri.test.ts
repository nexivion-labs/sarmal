// ═══════════════════════════════════════════════════════════════════════════
// ray-sinyalleri.test.ts — 🚦 RAY SATIRINDA DUR VE DİKKAT İŞARETİ (PNL-A21 · OZK-14 ikincisi)
//
//   Kabulün nöbet ayağı:
//     · Bir tanının yeri bir düğümün tanım aralığındaysa o düğümün Ray satırında
//       işaret görünür; kapalı dal alt ağacının toplamını taşır; tanı giderilince
//       işaret kalkar. Bilgi düzeyi işaret üretmez.
//     · İşarete tıklamak Sinyaller sekmesini seçer, tanı satırlarının atalarını açar ve
//       düğümün tanı satırlarını seçer (görsel kontrol aynı zinciri sayfada ölçer).
//   Ölçüm çatı biçimli örnek çalışma alanının (ogreti/ornek/calisma_alani) gerçek
//   ayrıştırılmış ağacıyla, gerçek Yol Haritası ve gerçek Sinyaller ağacıyla yapılır.
// ═══════════════════════════════════════════════════════════════════════════

import "./dil-kur.ts";
import { kabuk, kabukSifirla, SahteWebviewGorunusu, Uri } from "./kabuk-kur.ts";
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { ayristir } from "../../cekirdek/src/ayristirici.ts";
import { belirtecle } from "../../cekirdek/src/belirtec.ts";
import type { Program } from "../../cekirdek/src/sozdizim.ts";
import type { YuzeyKaydi } from "../src/yuzey-cekirdek.ts";
import { dugumAraliklari, enDerinAralik, sinyalleriDagit } from "../src/ray-sinyalleri.ts";

const { YolHaritasi, projeKimligi } = await import("../src/yolharitasi.ts");
const { MiniGrafGorunumu } = await import("../src/minigraf.ts");
const { Tren } = await import("../src/tren.ts");
const { MakinistAgaci } = await import("../src/makinist.ts");
const { panelKaydi, GORUNUS_PANEL } = await import("../src/panel.ts");
const { SinyallerAgaci } = await import("../src/sinyaller.ts");
const { turGoruntusunuYayinla } = await import("../src/tur-goruntusu.ts");

const EKLENTI_KOKU = fileURLToPath(new URL("..", import.meta.url));
const CATI = fileURLToPath(new URL("../../../ogreti/ornek/calisma_alani", import.meta.url));
const PLAN = join(CATI, "acik_arac", "plan", "yayin_plani.sar");

// ── SAF: TANIM ARALIĞI VE DAĞITIM ───────────────────────────────────────────

test("PNL-A21 · tanım aralığı: düğüm kendi satırından sonraki kardeşine dek uzanır; tanı en derin düğümden ilk Ray düğümüne yazılır, Ray düğümünün dışındaki düğümün tanısı yazılmaz", () => {
  const kaynak = [
    `Faz( kod: F1 ) {`,            // 1
    `  Blok( kod: B1 ) {`,          // 2
    `    Adım( kod: A1 )`,          // 3
    `    Adım( kod: A2,`,           // 4
    `          ne: "iki satır" )`,  // 5
    `  }`,                          // 6
    `}`,                            // 7
    `Hatırlatıcı( kod: H1 )`,       // 8
    ``,
  ].join("\n");
  const program = ayristir(belirtecle(kaynak));
  const araliklar = dugumAraliklari(program);
  const kod = (satir: number): string | undefined => {
    const a = enDerinAralik(araliklar, satir);
    return a?.dugum.parametreler.find((p) => p.ad === "kod")?.deger.metin;
  };
  assert.deepEqual([1, 2, 3, 4, 5, 8].map(kod), ["F1", "B1", "A1", "A2", "A2", "H1"]);
  // Ray düğümleri Faz, Blok ve Adım'dır; Hatırlatıcı Ray'de yoktur ve tanısı hiçbir Ray düğümüne yazılmaz.
  const ray = new Set(araliklar.flatMap(function gez(a): typeof araliklar { return a.dugum.ad === "Hatırlatıcı" ? [] : [a, ...a.cocuklar.flatMap(gez)]; }).map((a) => a.dugum));
  const kayitlar = [3, 5, 2, 8].map((satir) => ({ dosya: "/x.sar", satir }));
  const dagilim = sinyalleriDagit(kayitlar, () => program, (d) => ray.has(d));
  const ozet = [...dagilim].map(([d, l]) => [d.parametreler.find((p) => p.ad === "kod")?.deger.metin, l.map((k) => k.satir)]);
  assert.deepEqual(ozet, [["A1", [3]], ["A2", [5]], ["B1", [2]]], "tanılar en derin Ray düğümüne yazılmadı");
  assert.equal(sinyalleriDagit([{ dosya: "/yok.sar", satir: 3 }], () => undefined, () => true).size, 0, "programı olmayan dosyanın tanısı yazıldı");
});

// ── PANEL: RAY SATIRINDA İŞARET VE TIKLAMA ──────────────────────────────────

function sarlar(dizin: string, out: string[] = []): string[] {
  for (const ad of readdirSync(dizin)) {
    const y = join(dizin, ad);
    if (statSync(y).isDirectory()) sarlar(y, out);
    else if (ad.endsWith(".sar")) out.push(y);
  }
  return out;
}

interface Baglam { subscriptions: { dispose(): unknown }[] }
const baglamlar: Baglam[] = [];
beforeEach(() => kabukSifirla());
afterEach(() => { for (const b of baglamlar.splice(0)) for (const d of b.subscriptions) d.dispose(); });
const bekle = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Gerçek Yol Haritası (örnek çatı), gerçek Sinyaller ağacı ve panel; Ray'in bütün dalları açık. */
function panelKur() {
  const yollar = sarlar(CATI);
  const programlar = new Map<string, Program>(yollar.map((y) => [y, ayristir(belirtecle(readFileSync(y, "utf8")))]));
  const goruntu = { programlar, yollar, kirik: [], okunamayan: 0, dilDışı: [], tetik: "sinama", kapsam: undefined, belgeler: new Map() };
  turGoruntusunuYayinla(goruntu as never);
  const kok = Uri.file(EKLENTI_KOKU);
  const yol = new YolHaritasi();
  yol.eklentiKoku = kok as never;
  yol.yenile({ ...goruntu, sıra: 1 } as never);
  const sinyaller = new SinyallerAgaci(kok as never);
  const bos = { kayitSayisi: 0, onDidChangeTreeData: () => ({ dispose() {} }), getChildren: () => [], getTreeItem: () => ({}) };
  const makinist = new MakinistAgaci({ onaylar: bos, hatirlaticilar: bos, fikirler: bos } as never, kok as never);
  const baglam = { subscriptions: [] as { dispose(): unknown }[], extensionUri: kok, extensionPath: EKLENTI_KOKU, extension: { packageJSON: {} },
    workspaceState: { get: () => undefined, update: async () => {} } };
  baglamlar.push(baglam);
  const yuz = { saglayici: yol, miniGraf: new MiniGrafGorunumu(() => undefined), panelBagla() { /* yok */ }, diliTazele() { /* yok */ }, kodlar: () => [], gorunurMu: () => true };
  const panel = panelKaydi(baglam as never, { yol: yuz as never, tren: new Tren(), makinist, sinyaller });
  // Ray'in bütün dalları açık (görsel kontrolün açık kademe deseni); Sinyaller'in kapalı başlangıcı korunur.
  (panel as unknown as { acik: unknown }).acik = new Proxy({} as Record<string | symbol, unknown>, {
    has: (t, k) => String(k).startsWith("ray/") || k in t, get: (t, k) => (String(k).startsWith("ray/") ? true : t[k]),
  });
  const gorunum = new SahteWebviewGorunusu();
  (kabuk.webviewSaglayicilari.get(GORUNUS_PANEL) as { resolveWebviewView(g: unknown): void }).resolveWebviewView(gorunum);
  return { panel, gorunum, sinyaller };
}
const kayit = (kod: string, duzey: string, satir: number): YuzeyKaydi =>
  ({ proje: projeKimligi(PLAN), dosya: PLAN, tani: { kod, duzey, mesaj: `${kod} iletisi`, satir, sutun: 3 } }) as YuzeyKaydi;
const sonKod = (id: string): string => id.split("/").at(-1)!;
/** Ray satır kimlikleri etiketlerden kurulur; örnek çatıda açık aracın dalı (Faz → Blok → Katman → AltKatman → Adım). */
const DAL = "ray/Ornek Cati/Acik Arac/Yayin Donemi";
const RAY = {
  faz: DAL, katman: `${DAL}/BLK-ORNEK-ACIK-YAYIN/Cekirdek`,
  altKatman: `${DAL}/BLK-ORNEK-ACIK-YAYIN/Cekirdek/Kodlama`, adim: `${DAL}/BLK-ORNEK-ACIK-YAYIN/Cekirdek/Kodlama/ADM-ORNEK-ACIK-A01`,
};

test("PNL-A21 · tanı taşıyan düğümün Ray satırında Dur ya da Dikkat işareti ve sayısı görünür; kapalı dal alt ağacının toplamını taşır; Bilgi işaret üretmez; tanı giderilince işaret kalkar", async () => {
  const o = panelKur();
  // Dur: Adım'ın ikinci satırı (tanım aralığının içinde) · Dikkat: Katman satırı · Bilgi: AltKatman satırı.
  o.sinyaller.yerlestir([kayit("x-hata", "hata", 15), kayit("x-uyari", "uyarı", 12), kayit("x-bilgi", "bilgi", 13)], undefined);
  await bekle(150);
  const isaret = () => o.panel.olcumler().raySinyalleri;
  const i = isaret();
  assert.deepEqual(i[RAY.adim], { kendi: { dur: 1, dikkat: 0 }, toplam: { dur: 1, dikkat: 0 } }, `Adım satırında Dur işareti yok: ${JSON.stringify(i)}`);
  assert.deepEqual(i[RAY.katman], { kendi: { dur: 0, dikkat: 1 }, toplam: { dur: 1, dikkat: 1 } }, "Katman satırı kendi Dikkat'ini ve alt ağacının toplamını taşımıyor");
  assert.deepEqual(i[RAY.altKatman], { kendi: { dur: 0, dikkat: 0 }, toplam: { dur: 1, dikkat: 0 } }, "Bilgi tanısı işaret üretti ya da toplam yanlış");
  assert.deepEqual(i[RAY.faz]?.toplam, { dur: 1, dikkat: 1 }, "Faz satırı alt ağacının toplamını taşımıyor");
  // Çatının satırı kapsadığı projelerin toplamını taşır; tanısı olmayan proje satırı işaret taşımaz.
  assert.deepEqual(i["ray/Ornek Cati"]?.toplam, { dur: 1, dikkat: 1 }, "çatının satırı projelerinin toplamını taşımıyor");
  assert.equal(i["ray/Ornek Cati/Site"], undefined, "tanısı olmayan projenin satırında işaret var");
  // Çizim: açık dal kendi sayısını, kapalı dal toplamı gösteren iki küme taşır; satırın içeriği değişmez.
  const html = String((o.gorunum.gonderilen.filter((m) => (m as { tip?: string }).tip === "parca" && (m as { kimlik?: string }).kimlik === "agac").at(-1) as { html?: string } | undefined)?.html ?? o.gorunum.webview.html);
  const satir = (id: string): string => new RegExp(`<div class="sat"[^>]*data-id="${id}"[\\s\\S]*?</div>`).exec(html)?.[0] ?? "";
  assert.match(satir(RAY.katman), /<span class="sny-acik"[^>]*><span class="rozet dikkat">1<\/span><\/span><span class="sny-kapali"[^>]*><span class="rozet dur">1<\/span><span class="rozet dikkat">1<\/span><\/span>/);
  assert.match(satir(RAY.adim), /<span class="sny-acik"[^>]*><span class="rozet dur">1<\/span><\/span>/);
  // Tanı giderilir: Dur kaydı düşer; Ray yeniden çizilir ve Adım'ın işareti kalkar.
  const parcaOnce = o.gorunum.gonderilen.filter((m) => (m as { kimlik?: string }).kimlik === "agac").length;
  o.sinyaller.yerlestir([kayit("x-uyari", "uyarı", 12), kayit("x-bilgi", "bilgi", 13)], undefined);
  await bekle(250);
  assert.ok(o.gorunum.gonderilen.filter((m) => (m as { kimlik?: string }).kimlik === "agac").length > parcaOnce, "işaret değişti ama Ray yeniden çizilmedi");
  const sonra = isaret();
  assert.equal(sonra[RAY.adim], undefined, "tanı giderildi ama Adım satırının işareti kalkmadı");
  assert.deepEqual(sonra[RAY.katman], { kendi: { dur: 0, dikkat: 1 }, toplam: { dur: 0, dikkat: 1 } });
  // İşaret değişmeyen bir Sinyaller tazelemesi Ray'i yeniden çizmez.
  const parcaSonra = o.gorunum.gonderilen.filter((m) => (m as { kimlik?: string }).kimlik === "agac").length;
  o.sinyaller.yerlestir([kayit("x-uyari", "uyarı", 12), kayit("x-bilgi", "bilgi", 13), kayit("x-bilgi", "bilgi", 16)], undefined);
  await bekle(250);
  assert.equal(o.gorunum.gonderilen.filter((m) => (m as { kimlik?: string }).kimlik === "agac").length, parcaSonra, "işaret değişmediği hâlde Ray yeniden çizildi");
});

test("PNL-A21 · işarete tıklamak Sinyaller sekmesini seçer, tanı satırlarının atalarını açar ve düğümün tanı satırlarını seçer; açık dal kendi tanılarını, kapalı dal alt ağacınınkileri seçer", async () => {
  const o = panelKur();
  o.sinyaller.yerlestir([kayit("x-hata", "hata", 15), kayit("x-uyari", "uyarı", 12), kayit("x-uyari", "uyarı", 16), kayit("x-bilgi", "bilgi", 13)], undefined);
  await bekle(150);
  const katman = RAY.katman;
  assert.ok(o.panel.olcumler().raySinyalleri[katman], "Katman satırında işaret yok");
  const sec = async (acik: boolean): Promise<{ idler: string[]; html: string }> => {
    o.gorunum.mesajGonder({ tip: "sinyalGit", id: katman, acik });
    await bekle(50);
    const m = o.gorunum.gonderilen.filter((x) => (x as { tip?: string }).tip === "sinyalSec").at(-1) as { idler: string[] };
    const bolum = o.gorunum.gonderilen.filter((x) => (x as { tip?: string; sekme?: string }).tip === "bolum" && (x as { sekme?: string }).sekme === "sinyaller").at(-1) as { html: string };
    return { idler: m.idler, html: bolum.html };
  };
  // Kapalı Katman: alt ağacın üç tanısı (Dur 15, Dikkat 12 ve 16); Bilgi seçilmez.
  const kapali = await sec(false);
  assert.equal(o.panel.olcumler().sekme, "sinyaller", "işaret Sinyaller sekmesini seçmedi");
  assert.deepEqual(kapali.idler.map((id) => sonKod(id).replace(/^.*@/, "")).sort(), ["yayin_plani.sar:12:3", "yayin_plani.sar:15:3", "yayin_plani.sar:16:3"]);
  assert.deepEqual(o.panel.olcumler().sinyalSecimi, kapali.idler);
  // Seçilen satırlar görünürdür: ataları açılmış, hiçbiri kapalı dalın şablonunda değildir.
  let gorunen = kapali.html;
  for (let eski = ""; eski !== gorunen;) { eski = gorunen; gorunen = gorunen.replace(/<template data-ust="[^"]*">(?:(?!<template)[\s\S])*?<\/template>/g, ""); }
  for (const id of kapali.idler) assert.ok(gorunen.includes(`data-id="${id}"`), `${id} seçildi ama görünür değil`);
  // Açık Katman: yalnız kendi tanısı (Dikkat 12).
  const acik = await sec(true);
  assert.deepEqual(acik.idler.map((id) => sonKod(id).replace(/^.*@/, "")), ["yayin_plani.sar:12:3"]);
});

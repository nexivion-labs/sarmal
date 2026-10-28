// ═══════════════════════════════════════════════════════════════════════════
// panel.test.ts — 🧭 SARMAL PANELİNİN KABUĞU (Founder 2026-10-21 · bağlayıcı çizim)
//
//   Kap TEK webview görünümüdür (`sarmalPanel`). Bu süit kabuğu kabuk sahtesiyle
//   GERÇEKTEN koşturur ve Sarmal deposunun KENDİ planını (is/plan/faz/*.sar ve
//   bütün depo) gerçek Yol Haritası sağlayıcısına yükler: sekme seçimine göre
//   doğru bölümün çizildiği, kapta ağaç görünümü kurulmadığı, açık-kapalı
//   düğümde doğru satır sayısı üretildiği, çok düğümlü projede çıktının makul
//   boyutta kaldığı, iletilerin (tıklama, kutucuk, eylem, komut köprüsü) yalnız
//   izinli işleri yaptığı, görünmeyen panelin hiçbir şey çizmediği, açık-kapalı
//   tercihinin workspaceState'e gittiği ve her açılışın Ray'le başladığı ölçülür.
// ═══════════════════════════════════════════════════════════════════════════

import "./dil-kur.ts";
import { kabuk, kabukSifirla, belgeKoy, SahteWebviewGorunusu, Uri } from "./kabuk-kur.ts";
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { ayristir } from "../../cekirdek/src/ayristirici.ts";
import { belirtecle } from "../../cekirdek/src/belirtec.ts";
import { mevsimNormalize } from "../../cekirdek/src/denetci.ts";
import type { Program } from "../../cekirdek/src/sozdizim.ts";
import * as sahte from "./vscode-sahtesi.ts";

const { YolHaritasi } = await import("../src/yolharitasi.ts");
const { MiniGrafGorunumu } = await import("../src/minigraf.ts");
const { Tren } = await import("../src/tren.ts");
const { MakinistAgaci } = await import("../src/makinist.ts");
const { panelKaydi, odakPaneldeArgumanlar, GORUNUS_PANEL, BAGLAM_SEKME, TREN_KARDES_KOMUTU, SEKME_SIRASI_SIFIRLA_KOMUTU } = await import("../src/panel.ts");
const { OnayPaneli } = await import("../src/onay-paneli.ts");
const { onayKuyruguKaydi } = await import("../src/onay-kuyrugu.ts");
const { makinistKaydi } = await import("../src/makinist.ts");
const { onayKapilariTopla } = await import("../src/onay-cekirdek.ts");
const { notKimligi } = await import("../src/onay-govde.ts");
const { yolHaritasiKaydi } = await import("../src/yolharitasi.ts");
const { atlaHref } = await import("../src/minigraf-cekirdek.ts");
const { SEKMELER } = await import("../src/panel-cekirdek.ts");
const { bolumYuvasiKaydi } = await import("../src/bolum-yuvasi.ts");
const { SinyallerAgaci } = await import("../src/sinyaller.ts");
const { YENI_TANI_KANONU } = await import("../../cekirdek/src/tani-sicili.ts");
const { ILERI_BAGLAM_KIMLIKLERI } = await import("../../cekirdek/src/denetim.ts");
const { BAGLAM } = await import("../src/bolum-cekirdek.ts");

const EKLENTI_KOKU = fileURLToPath(new URL("..", import.meta.url));
const SARMAL_KOKU = fileURLToPath(new URL("../../..", import.meta.url));

// ── Fikstür: Sarmal deposunun gerçek planı ───────────────────────────────────

function sarDosyalari(dizin: string, cikti: string[] = []): string[] {
  for (const ad of readdirSync(dizin)) {
    if (ad.startsWith(".") || ["node_modules", "dist", "dist-sinama"].includes(ad)) continue;
    const yol = join(dizin, ad);
    if (statSync(yol).isDirectory()) sarDosyalari(yol, cikti);
    else if (ad.endsWith(".sar")) cikti.push(yol);
  }
  return cikti;
}

let goruntuOnbellegi: ReturnType<typeof goruntuKur> | undefined;
function goruntuKur() {
  const yollar = sarDosyalari(SARMAL_KOKU);
  const programlar = new Map<string, Program>();
  const kirik: string[] = [];
  for (const y of yollar) {
    try { programlar.set(y, ayristir(belirtecle(readFileSync(y, "utf8")))); } catch { kirik.push(y); }
  }
  mevsimNormalize(programlar);
  return { programlar, yollar, kirik, okunamayan: 0, dilDışı: [] as string[], tetik: "sinama", kapsam: undefined, sıra: 1 };
}

interface Ortam {
  yol: InstanceType<typeof YolHaritasi>;
  tren: InstanceType<typeof Tren>;
  makinist: InstanceType<typeof MakinistAgaci>;
  graf: InstanceType<typeof MiniGrafGorunumu>;
  panel: ReturnType<typeof panelKaydi>;
  gorunum: SahteWebviewGorunusu;
  baglam: { subscriptions: { dispose(): unknown }[]; extensionUri: Uri; extensionPath: string; extension: { packageJSON: unknown }; workspaceState: { get: (k: string) => unknown; update: (k: string, v: unknown) => Promise<void> } };
  durum: Map<string, unknown>;
  makinistKaynaklari: Record<string, ReturnType<typeof kaynakKur>>;
  kutuCagrilari: Array<[unknown, boolean]>;
  sinyaller: InstanceType<typeof SinyallerAgaci>;
}

// ── Sinyaller fikstürü (PNL-A09): iki Proje, üç düzey; kural bağı olan ve olmayan tanılar ──
const SINYAL_DOSYASI = join(SARMAL_KOKU, "is/plan/faz/5_eylul_lansman.sar");
const BASKA_DOSYA = join(SARMAL_KOKU, "ogreti/ornek/gercek/buyuk_bahce.sar");
/** Sicilde kural bağı olan bir tanı ve bağı olmayan bir tanı kodu (madde uydurulmaz). */
const BAGLI = YENI_TANI_KANONU.find((k) => k.kanonDüzey === "hata")!;
const BAGSIZ_KOD = "örnek-bağsız-tanı";
/** Motorun Hatırlatıcılar yüzeyine yönlendirdiği iki kod: Sinyaller'de hiç görünmezler, yalnız Makinist'tedirler (YUZ-3.3). */
const [ILERI_KOD, ILERI_KOD_2] = [...ILERI_BAGLAM_KIMLIKLERI] as [string, string];
const SARMAL_PROJE = { kod: "SARMAL", ad: "Sarmal" };
const ORNEK_PROJE = { kod: "ORNEK", ad: "Örnek" };
const sinyalKaydi = (kod: string, duzey: string, satir: number, dosya = SINYAL_DOSYASI, proje = SARMAL_PROJE, oneri?: string) =>
  ({ proje, dosya, tani: { kod, duzey, mesaj: `${kod} iletisi`, satir, sutun: 3, ...(oneri ? { oneri } : {}) } }) as never;
const SINYAL_KAYITLARI = [
  sinyalKaydi(BAGLI.kod, "hata", 40, SINYAL_DOSYASI, SARMAL_PROJE, "şöyle düzelt"),
  sinyalKaydi(BAGSIZ_KOD, "hata", 12),
  sinyalKaydi(BAGLI.kod, "hata", 7, BASKA_DOSYA, ORNEK_PROJE),
  sinyalKaydi(BAGSIZ_KOD, "uyarı", 5),
  sinyalKaydi(BAGSIZ_KOD, "bilgi", 9),
  sinyalKaydi(BAGSIZ_KOD, "bilgi", 2, BASKA_DOSYA, ORNEK_PROJE),
  // Hatırlatıcılar yüzeyine yönlenen kayıtlar: yönlendirme düzeye değil koda bağlıdır, biri uyarı düzeyindedir.
  sinyalKaydi(ILERI_KOD, "bilgi", 15),
  sinyalKaydi(ILERI_KOD_2, "uyarı", 18, BASKA_DOSYA, ORNEK_PROJE),
];
/** Sinyaller'de görünmesi gereken kayıtlar: girdiden Hatırlatıcılar yüzeyine yönlenen ikisi çıkar. */
const SINYALDE = SINYAL_KAYITLARI.slice(0, -2);
const ortamlar: Ortam[] = [];

/** Makinist için sahte kaynak: sayı, satırlar ve değişim olayı sınama elindedir. */
function kaynakKur(satirlar: Array<{ ad: string; baglam: string }>) {
  const olay = new sahte.EventEmitter<unknown>();
  return {
    kayitSayisi: satirlar.length, satirlar, olay,
    onDidChangeTreeData: olay.event,
    getChildren: () => satirlar.map((s) => ({ ...s })),
    getTreeItem: (o: { ad: string; baglam: string }) => {
      const t = new sahte.TreeItem(o.ad, sahte.TreeItemCollapsibleState.None);
      t.contextValue = o.baglam;
      t.command = { command: "sarmal.makinistSatiri", title: "", arguments: [o.ad] };
      return t;
    },
  };
}

/**
 * Panelin tamamını sahte kabukta kurar. Panel her açılışta Ray'le başlar (PNL-A03); `sekme` verilirse
 * görünüm çözülmeden önce kullanıcının seçimi gibi seçilir. `kalici` workspaceState'e önceden konan
 * değerlerdir (önceki oturumdan kalan durum).
 */
function ortamKur(sekme?: string, acik?: Record<string, boolean>, kalici: Record<string, unknown> = {},
  makinistKur?: (baglam: Ortam["baglam"]) => InstanceType<typeof MakinistAgaci>): Ortam {
  goruntuOnbellegi ??= goruntuKur();
  const yol = new YolHaritasi();
  yol.eklentiKoku = Uri.file(EKLENTI_KOKU) as never;
  yol.yenile(goruntuOnbellegi as never);
  const graf = new MiniGrafGorunumu(() => yol.dagAl());
  const tren = new Tren();
  tren.eklentiKoku = Uri.file(EKLENTI_KOKU) as never;
  tren.goruntudenYerlestir(goruntuOnbellegi as never);
  const kaynaklar = {
    onaylar: kaynakKur([{ ad: "ONY-1", baglam: "sarmalOnayKapisi" }, { ad: "ONY-2", baglam: "sarmalOnayKapisi" }]),
    hatirlaticilar: kaynakKur([{ ad: "Hatırlatıcı 1", baglam: "sarmalHatirlaticiAtesledi" }]),
    fikirler: kaynakKur([{ ad: "Fikir 1", baglam: "sarmalFikir" }]),
  };
  // PNL-A09: gözlem kayıtları Makinist'te değil, Sinyaller sekmesinin Bilgi bandındadır (YUZ-3.3).
  const sinyaller = new SinyallerAgaci(Uri.file(EKLENTI_KOKU) as never);
  sinyaller.yerlestir(SINYAL_KAYITLARI, "SARMAL");
  const durum = new Map<string, unknown>(Object.entries(kalici));
  if (acik) durum.set("sarmal.panel.acik", acik);
  const baglam = {
    subscriptions: [] as { dispose(): unknown }[], extensionUri: Uri.file(EKLENTI_KOKU), extensionPath: EKLENTI_KOKU,
    extension: { packageJSON: {} },
    workspaceState: { get: (k: string) => durum.get(k), update: async (k: string, v: unknown) => { durum.set(k, v); } },
  };
  const makinist = makinistKur ? makinistKur(baglam) : new MakinistAgaci(kaynaklar as never, Uri.file(EKLENTI_KOKU) as never);
  // Kaynak değişimi tek yenilemeye bağlanır (makinistKaydi'nin kurduğu bağ).
  if (!makinistKur) for (const k of Object.values(kaynaklar)) k.onDidChangeTreeData(() => makinist.yenile());
  const kutuCagrilari: Array<[unknown, boolean]> = [];
  yol.kutuIsaretle = async (o: unknown, b: boolean) => { kutuCagrilari.push([o, b]); };
  const yuz = { saglayici: yol, miniGraf: graf, panelBagla() { /* sınama bağı gerekmez */ }, diliTazele() { /* sınama */ }, kodlar: () => [], gorunurMu: () => true };
  const panel = panelKaydi(baglam as never, { yol: yuz as never, tren, makinist, sinyaller });
  // Seçim eşzamanlı yazılır; ilk belge aşağıda bu sekmeyle üretilir.
  if (sekme) void panel.sekmeSec(sekme as never);
  const saglayici = kabuk.webviewSaglayicilari.get(GORUNUS_PANEL) as { resolveWebviewView(g: unknown): void };
  const gorunum = new SahteWebviewGorunusu();
  saglayici.resolveWebviewView(gorunum);
  const o: Ortam = { yol, tren, makinist, graf, panel, gorunum, baglam, durum, makinistKaynaklari: kaynaklar, kutuCagrilari, sinyaller };
  ortamlar.push(o);
  return o;
}

beforeEach(() => kabukSifirla());
afterEach(() => {
  for (const o of ortamlar.splice(0)) for (const d of o.baglam.subscriptions) d.dispose();
  sahte.workspace.getConfiguration = acikAyar;
  sahte.workspace.onDidChangeConfiguration = ayarOlayi;
});

const acikAyar = sahte.workspace.getConfiguration;
const ayarOlayi = sahte.workspace.onDidChangeConfiguration;
/** Paketin varsayılan sekme sırası (package.json katkısı): sahte kabuk onu `inspect().defaultValue` olarak verir. */
const PAKET_SIRASI = (JSON.parse(readFileSync(join(EKLENTI_KOKU, "package.json"), "utf8")) as {
  contributes: { configuration: { properties: Record<string, { default?: unknown }> } };
}).contributes.configuration.properties["sarmal.sekmeSirasi"]!.default as string[];

/**
 * Sekme sırası ayarının sahtesi (PNL-A23): kullanıcı ayarı `deger`, varsayılan paketinki. Yazımlar
 * kaydedilir ve ayar değişim olayı sınamanın elindedir (gerçek VS Code gibi yazım olayı ateşler).
 */
function siraAyari(deger: unknown): { yazimlar: Array<[string, unknown, unknown]>; degistir(yeni: unknown): void } {
  const olay = new sahte.EventEmitter<{ affectsConfiguration(b: string): boolean }>();
  const durum = { deger };
  const yazimlar: Array<[string, unknown, unknown]> = [];
  const degistir = (yeni: unknown): void => {
    durum.deger = yeni;
    olay.fire({ affectsConfiguration: (b: string) => b === "sarmal.sekmeSirasi" || b === "sarmal" });
  };
  sahte.workspace.onDidChangeConfiguration = olay.event as never;
  sahte.workspace.getConfiguration = (() => ({
    get: <T>(_: string, v?: T) => v,
    has: () => false,
    inspect: (k: string) => (k === "sekmeSirasi" ? { key: `sarmal.${k}`, defaultValue: PAKET_SIRASI, globalValue: durum.deger } : undefined),
    update: async (k: string, v: unknown, hedef: unknown) => { yazimlar.push([k, v, hedef]); if (k === "sekmeSirasi") degistir(v); },
  })) as never;
  return { yazimlar, degistir };
}
const seritSirasi = (html: string): string[] => [...html.matchAll(/role="tab" id="sekme-([a-z]+)"/g)].map((m) => m[1]!);
function miniGrafAyari(acik: boolean): void {
  sahte.workspace.getConfiguration = (() => ({ get: <T>(ad: string, v?: T) => (ad === "miniGraf" ? (acik as T) : v), has: () => false, inspect: () => undefined, update: async () => {} })) as never;
}

const otur = (): Promise<void> => new Promise((r) => setImmediate(r));
const bekle = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
/**
 * 🌳 PNL-A27: kapalı dalın önden gelen çocukları çizilmeyen `<template data-ust>` içindedir; ekranda
 * görünen satırlar şablonlar çıkarılınca kalanlardır (iç içe şablonlar içten dışa sökülür).
 */
function sablonsuz(html: string): string {
  let h = html;
  for (let eski = ""; eski !== h;) { eski = h; h = h.replace(/<template data-ust="[^"]*">(?:(?!<template)[\s\S])*?<\/template>/g, ""); }
  return h;
}
const satirSayisi = (html: string): number => (sablonsuz(html).match(/class="sat"/g) ?? []).length;
const mesajlar = (o: Ortam, tip: string): Array<Record<string, unknown>> =>
  o.gorunum.gonderilen.filter((m) => (m as { tip?: string }).tip === tip) as Array<Record<string, unknown>>;
/** Belgedeki bir sekmenin bölüm kabının içeriği (PNL-A18: beş sekmenin bölümü de belgededir). */
function panelIcerigi(html: string, sekme: string): string {
  const bas = html.indexOf(`<div id="panel-${sekme}"`);
  assert.ok(bas >= 0, `${sekme} sekmesinin bölüm kabı yok`);
  const ic = html.indexOf(">", bas) + 1;
  const sonraki = html.indexOf(`<div id="panel-`, ic);
  const son = sonraki >= 0 ? sonraki : html.indexOf("</div><script", ic);
  return html.slice(ic, son - "</div>".length);
}
const gizliMi = (html: string, sekme: string): boolean => new RegExp(`<div id="panel-${sekme}"[^>]*\\shidden>`).test(html);

const kapaliSatirlar = (html: string): string[] =>
  [...html.matchAll(/data-id="([^"]+)"[^>]*aria-expanded="false"/g)].map((m) => m[1]!.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'"));

// ── ① KURULUM: KAPTA TEK GÖRÜNÜM, AĞAÇ GÖRÜNÜMÜ YOK ──────────────────────────

test("kurulum: kapta TEK webview görünümü kaydolur (sarmalPanel); hiçbir ağaç görünümü kurulmaz; sekme bağlama yazılır", async () => {
  const o = ortamKur();
  await otur();
  assert.equal(GORUNUS_PANEL, "sarmalPanel");
  assert.deepEqual([...kabuk.webviewSaglayicilari.keys()], ["sarmalPanel"], "tam bir webview sağlayıcısı kayıtlı olmalı");
  assert.equal(kabuk.agaclar.length, 0, "Yol Haritası, Tren ya da Makinist kendi TreeView'ünü kurmuş");
  const baglam = kabuk.komutCagrilari.filter((c) => c.komut === "setContext" && c.argumanlar[0] === BAGLAM_SEKME);
  assert.deepEqual(baglam.at(-1)?.argumanlar, [BAGLAM_SEKME, "ray"], "başlık eylemleri için sekme bağlamı yazılmamış");
  assert.equal((o.gorunum.webview.options as { enableScripts?: boolean }).enableScripts, true);
});

// ── ② SEKME SEÇİMİNE GÖRE DOĞRU BÖLÜM ÇİZİLİR ───────────────────────────────

test("beş sekmenin bölümü belgede hazırdır ve her içerik kendi sekmesinin kabındadır; yalnız seçili sekmeninki (Ray) görünür (PNL-A18)", () => {
  const o = ortamKur();
  const h = o.gorunum.webview.html;
  assert.equal((h.match(/role="tab"/g) ?? []).length, 5);
  assert.equal((h.match(/role="tabpanel"/g) ?? []).length, 5, "beş sekmenin bölüm kabı belgede olmalı");
  assert.ok(h.includes('data-sekme="ray" aria-selected="true"'));
  for (const s of SEKMELER) assert.equal(gizliMi(h, s), s !== "ray", `${s}: bölümün görünürlüğü seçili sekmeye uymuyor`);
  const ray = panelIcerigi(h, "ray");
  assert.ok(ray.includes("YOL HARİTASI") && ray.includes('id="agac"'));
  assert.ok(ray.includes('<template id="graf-sablon">') && ray.includes("MİNİ GRAF"), "Mini Graf Ray sekmesinde çizilmeli");
  assert.ok(!ray.includes('id="tren-agac"') && !ray.includes('id="makinist-agac"'), "başka sekmenin içeriği Ray kabına girmiş");
  const tren = panelIcerigi(h, "tren");
  assert.ok(tren.includes('id="tren-agac"') && !tren.includes('id="agac"') && !tren.includes("graf-sablon"), "Tren kabı kendi içeriğini taşımıyor");
  assert.ok(panelIcerigi(h, "makinist").includes('id="makinist-agac"'));
  assert.match(panelIcerigi(h, "ayarlar"), /^<p class="bos" data-bos-sekme="ayarlar">[^<]+<\/p>$/);
  assert.match(panelIcerigi(h, "sinyaller"), /^<div id="sinyaller-agac" role="tree"/, "Sinyaller kabı kendi ağacını taşımıyor");
  assert.equal(o.panel.olcumler().satirSayisi, satirSayisi(ray), "ölçülen satır sayısı Ray kabına basılan satırlarla aynı değil");
  assert.ok(ray.includes("Sarmal"), "çalışma alanı satırı yok");
  assert.ok(!/Bölümler/.test(h), "'Bölümler' üretilmiş");
});

test("Tren seçiliyken Tren bölümü görünür (ajanlar, geliştirmedeki Adımlar); Makinist seçiliyken dört açılır grup ve sayıları görünür", async () => {
  const t = ortamKur("tren");
  const ht = t.gorunum.webview.html;
  assert.ok(ht.includes('data-sekme="tren" aria-selected="true"') && !gizliMi(ht, "tren") && gizliMi(ht, "ray"));
  const tren = panelIcerigi(ht, "tren");
  assert.ok(tren.includes('id="tren-agac"') && !tren.includes('id="agac"') && !tren.includes("YOL HARİTASI"), "Ray içeriği Tren kabına girmiş");
  assert.ok(tren.includes("Ajanlar") && tren.includes("Geliştirmedeki Adımlar"), "Tren özeti çizilmemiş");
  const m = ortamKur("makinist");
  const hm = m.gorunum.webview.html;
  assert.ok(hm.includes('data-sekme="makinist" aria-selected="true"') && !gizliMi(hm, "makinist"));
  const mk = panelIcerigi(hm, "makinist");
  for (const ad of ["Onaylar", "Hatırlatıcılar", "Fikirler"]) assert.ok(mk.includes(`>${ad}<`), `${ad} grubu yok`);
  // PNL-A09 (OZK-14): gözlem kayıtları Makinist'te görünmez.
  assert.ok(!mk.includes(">Gözlemler<") && !mk.includes(BAGSIZ_KOD), "gözlem kayıtları hâlâ Makinist'te");
  assert.equal(satirSayisi(mk), 3, "Makinist kapalı varsayılanla üç grup satırıdır");
  // Sayı üst düğümün yanında, kaynağın kendi sayacından.
  assert.ok(/Onaylar<\/span><span class="ac">2</.test(hm) && /Hatırlatıcılar<\/span><span class="ac">1</.test(hm) && /Fikirler<\/span><span class="ac">1</.test(hm));
  assert.ok(/class="rozet">3</.test(hm), "rozet onaylar + hatırlatıcılar toplamını göstermeli");
  await otur();
});

test("sekme iletisi: webview'in geçişi eklentide yalnız kaydedilir; hiçbir içerik gönderilmez, bağlam güncellenir ve seçim workspaceState'e YAZILMAZ (PNL-A18)", async () => {
  // Founder 2026-10-28 ekran kaydı: içerik eklentinin yanıtına bağlıydı ve eklenti meşgulken eski sekmede
  // kalıyor ya da gecikmiş bölüm başka sekmenin yerine çiziliyordu. İçerik webview'de hazırdır; yanıt yoktur.
  const o = ortamKur();
  const icerikIletisi = (): number => o.gorunum.gonderilen.filter((m) => ["bolum", "parca", "satir", "sekmeSec"].includes(String((m as { tip?: string }).tip))).length;
  const once = icerikIletisi();
  o.gorunum.mesajGonder({ tip: "sekme", ad: "tren", n: 1 });
  await otur();
  assert.equal(icerikIletisi(), once, "sekme geçişi eklentiden içerik bekliyor: geçiş eklenti meşgulken donar");
  assert.equal(o.panel.olcumler().sekme, "tren");
  assert.equal(o.durum.has("sarmal.panel.sekme"), false, "sekme seçimi kalıcı yazılmış: bir sonraki açılış Ray yerine bu sekmeyle başlar");
  assert.deepEqual(kabuk.komutCagrilari.filter((c) => c.komut === "setContext" && c.argumanlar[0] === BAGLAM_SEKME).at(-1)?.argumanlar, [BAGLAM_SEKME, "tren"]);
  o.gorunum.mesajGonder({ tip: "sekme", ad: "makinist", n: 2 });
  o.gorunum.mesajGonder({ tip: "sekme", ad: "graf", n: 3 });     // bilinmeyen sekme
  o.gorunum.mesajGonder({ tip: "sekme", ad: 3, n: 4 });
  await otur();
  assert.equal(o.panel.olcumler().sekme, "makinist", "bilinmeyen sekme seçimi değiştirmiş");
  // Sinyaller ve Ayarlar da seçilebilir; Sinyaller satır taşır, Ayarlar bugün yalnız boş durum cümlesidir.
  for (const [i, s] of ["sinyaller", "ayarlar"].entries()) {
    o.gorunum.mesajGonder({ tip: "sekme", ad: s, n: 5 + i });
    await otur();
    assert.equal(o.panel.olcumler().sekme, s);
    assert.equal(o.panel.olcumler().satirSayisi > 0, s === "sinyaller", `${s}: satır sayısı sekmenin içeriğine uymuyor`);
    assert.deepEqual(kabuk.komutCagrilari.filter((c) => c.komut === "setContext" && c.argumanlar[0] === BAGLAM_SEKME).at(-1)?.argumanlar, [BAGLAM_SEKME, s]);
  }
  assert.equal(icerikIletisi(), once, "sekme geçişleri içerik iletisi doğurmuş");
});

test("eklentinin seçtirdiği sekme webview'e yalnız seçim olarak gider ve eklentinin işlediği son geçişin sayacını taşır (PNL-A18)", async () => {
  const o = ortamKur();
  await o.panel.sekmeSec("makinist");
  assert.deepEqual(mesajlar(o, "sekmeSec").at(-1), { tip: "sekmeSec", ad: "makinist", n: 0 });
  assert.equal(mesajlar(o, "bolum").length, 0, "seçim için bölüm yeniden gönderilmiş");
  // Kullanıcının üç geçişi eklentiye ulaştıktan sonra eklentinin seçimi o sayacı taşır; webview daha yeni
  // bir geçiş görmüşse seçimi uygulamaz (panel-betik.ts), görmemişse uygular.
  o.gorunum.mesajGonder({ tip: "sekme", ad: "tren", n: 3 });
  await otur();
  await o.panel.sekmeSec("ray");
  assert.deepEqual(mesajlar(o, "sekmeSec").at(-1), { tip: "sekmeSec", ad: "ray", n: 3 });
  assert.equal(o.panel.olcumler().sekme, "ray");
  // Yeni belge (dil değişimi, yeniden çözüm) geçiş sayacını sıfırdan başlatır.
  const yeniden = new SahteWebviewGorunusu();
  (kabuk.webviewSaglayicilari.get(GORUNUS_PANEL) as { resolveWebviewView(g: unknown): void }).resolveWebviewView(yeniden);
  await o.panel.sekmeSec("tren");
  assert.deepEqual(yeniden.gonderilen.filter((m) => (m as { tip?: string }).tip === "sekmeSec").at(-1), { tip: "sekmeSec", ad: "tren", n: 0 });
});

test("TEK KAYNAK: webview geçişi, eklentinin seçtirdiği sekme ve bölüm yuvasının seçimi her adımda aynı yeri gösterir (PNL-A18)", async () => {
  // PNL-A03 koşusunun notu: webview'deki geçiş yalnız panelin sekmesini değiştiriyordu, bölüm yuvası Ray'de
  // kalıyordu. Yuva artık yerleşik seçimi saklamaz, panelin sekmesinden okur (eklenti.ts ile aynı bağlantı).
  const o = ortamKur();
  const yuva = bolumYuvasiKaydi(o.baglam as never);
  yuva.sekmeBagla((b) => o.panel.sekmeSecVeOdakla(b === "graf" ? "ray" : b), o.panel);
  const kapi = yuva.sinamaKapisi();
  const kardesYuzu = yuva.al(1)!;
  const duyurulan: string[] = [];
  kardesYuzu.seciliBolumDegisti((b) => duyurulan.push(b));
  const baglamSecili = (): unknown => kabuk.komutCagrilari.filter((c) => c.komut === "setContext" && c.argumanlar[0] === BAGLAM.secili).at(-1)?.argumanlar[1];
  const ayni = async (ne: string): Promise<void> => {
    await bekle(20);
    const sekme = o.panel.olcumler().sekme;
    assert.equal(kapi.olcumler().secili, sekme, `${ne}: bölüm yuvası panelin sekmesinden ayrıştı`);
    assert.equal(kapi.olcumler().seciliYuva, sekme, `${ne}: yuva bağlam değeri ayrıştı`);
    assert.equal(kardesYuzu.seciliBolum, sekme, `${ne}: kardeşe verilen seçim ayrıştı`);
    assert.equal(baglamSecili(), sekme, `${ne}: bağlam anahtarı ayrıştı`);
  };
  await ayni("açılış");
  let n = 0;
  const tikla = async (ad: string): Promise<void> => { o.gorunum.mesajGonder({ tip: "sekme", ad, n: ++n }); await ayni(`webview ${ad}`); };
  const komut = async (b: string): Promise<void> => { await kabuk.komutlar.get(`sarmal.bolum.${b}`)!(); await ayni(`komut ${b}`); };
  await tikla("tren");
  await komut("makinist");
  assert.deepEqual(mesajlar(o, "sekmeSec").at(-1), { tip: "sekmeSec", ad: "makinist", n: 1 }, "komutun seçimi webview'e gitmedi");
  await tikla("sinyaller");
  await komut("graf");
  assert.equal(o.panel.olcumler().sekme, "ray", "Graf komutu Ray sekmesini seçmeli");
  await tikla("ayarlar");
  await komut("tren");
  await tikla("ray");
  assert.deepEqual(duyurulan, ["tren", "makinist", "sinyaller", "ray", "ayarlar", "tren", "ray"], "seçim değişimi kardeşe sırasıyla ve yinelenmeden duyurulmadı");
});

test("açılış Ray'le başlar: önceki oturumdan kalan sekme (workspaceState) seçimi ezemez ve Yol Haritası açık başlar (PNL-A03)", async () => {
  // Kusur: panel eskiden son sekmeyi workspaceState'ten okuyordu; pencere yeniden yüklenince Makinist'te
  // açılıyor, oysa bölüm yuvası her açılışı Ray'le başlatıyordu ve iki seçim birbirini tutmuyordu.
  for (const eski of ["makinist", "tren", "gozlemler", "silinmis-sekme"]) {
    const o = ortamKur(undefined, undefined, { "sarmal.panel.sekme": eski });
    await otur();
    assert.ok(o.gorunum.webview.html.includes('data-sekme="ray" aria-selected="true"'), `${eski}: önceki oturumun sekmesi açılışı ezdi`);
    assert.equal(o.panel.olcumler().sekme, "ray");
    assert.deepEqual(kabuk.komutCagrilari.filter((c) => c.komut === "setContext" && c.argumanlar[0] === BAGLAM_SEKME).at(-1)?.argumanlar, [BAGLAM_SEKME, "ray"]);
  }
  // Yol Haritası önceki oturumda katlanmış olsa da açık başlar; Mini Graf katlaması kalıcıdır.
  const k = ortamKur(undefined, { "bolum:agac": false, "bolum:graf": false });
  assert.match(k.gorunum.webview.html, /data-bolum="agac" aria-expanded="true"/);
  assert.match(k.gorunum.webview.html, /<div id="bolum-agac" class="bolum">/);
  assert.match(k.gorunum.webview.html, /data-bolum="graf" aria-expanded="false"/);
  // Oturum içindeki seçim bellekte korunur: görünüm yeniden çözülünce aynı sekmeyle çizilir.
  const o = ortamKur("tren");
  const yeniden = new SahteWebviewGorunusu();
  (kabuk.webviewSaglayicilari.get(GORUNUS_PANEL) as { resolveWebviewView(g: unknown): void }).resolveWebviewView(yeniden);
  assert.ok(yeniden.webview.html.includes('data-sekme="tren" aria-selected="true"'), "oturum içindeki seçim kayboldu");
  assert.equal(o.panel.olcumler().sekme, "tren");
});

// ── ③ AÇIK / KAPALI DÜĞÜM ───────────────────────────────────────────────────

test("açık düğümde doğru satır sayısı: 'gec' iletisi yalnız o düğümün çocuklarını ekler, kapatınca geri alır ve tercih kalıcıdır", async () => {
  const o = ortamKur();
  const ray = panelIcerigi(o.gorunum.webview.html, "ray");
  const once = satirSayisi(ray);
  const hedef = kapaliSatirlar(ray).find((id) => id.split("/").length >= 3)!;
  assert.ok(hedef, "açılacak kapalı düğüm yok");
  o.gorunum.mesajGonder({ tip: "gec", id: hedef, ac: true });
  await otur();
  const acik = mesajlar(o, "parca").at(-1)!;
  assert.equal(acik.kimlik, "agac");
  assert.equal(acik.sekme, "ray", "parça kendi sekmesine adreslenmemiş");
  const cocuk = satirSayisi(String(acik.html)) - once;
  assert.ok(cocuk > 0, "düğüm açıldı fakat çocuk satır eklenmedi");
  assert.equal(o.panel.olcumler().satirSayisi, satirSayisi(String(acik.html)));
  assert.deepEqual((o.durum.get("sarmal.panel.acik") as Record<string, boolean>)[hedef], true, "açık tercih kalıcı değil");
  // Yalnız o düğümün kapsamı değişir: açılan satır aria-expanded="true" olur, öteki kapalı satırlar kapalı kalır.
  assert.ok(String(acik.html).includes('aria-expanded="true"'));
  o.gorunum.mesajGonder({ tip: "gec", id: hedef, ac: false });
  await otur();
  assert.equal(satirSayisi(String(mesajlar(o, "parca").at(-1)!.html)), once, "kapatınca satır sayısı başlangıca dönmeli");
  // Bilinmeyen kimlik ya da bozuk ileti hiçbir şeyi değiştirmez.
  const n = mesajlar(o, "parca").length;
  o.gorunum.mesajGonder({ tip: "gec", id: "yok/yok", ac: true });
  o.gorunum.mesajGonder({ tip: "gec", id: hedef, ac: "evet" });
  await otur();
  assert.equal(mesajlar(o, "parca").length, n);
});

test("PNL-A27 · webview'in yerel dal haberi: eklenti durumu kalıcı yazar ve yanıt beklenmez; önden veri gecikmeli tazelenir ve iletiler eklentinin gördüğü dal sayacını taşır", async () => {
  const o = ortamKur();
  const ray = panelIcerigi(o.gorunum.webview.html, "ray");
  const kacirId = (id: string): string => id.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  // Görünen ve önden çocukları şablonda duran bir kapalı dal.
  const hedef = kapaliSatirlar(sablonsuz(ray)).find((id) => ray.includes(`<template data-ust="${kacirId(id)}">`))!;
  assert.ok(hedef, "görünen ve şablonu olan kapalı dal yok");
  const cocuklar = (ray.slice(ray.indexOf(`<template data-ust="${kacirId(hedef)}">`)).match(/class="sat"/g) ?? []).length;
  assert.ok(cocuklar > 0);
  const once = o.panel.olcumler().satirSayisi;
  const parcaOnce = mesajlar(o, "parca").length;
  o.gorunum.mesajGonder({ tip: "gec", id: hedef, ac: true, n: 1, yerel: true });
  await otur();
  assert.equal(mesajlar(o, "parca").length, parcaOnce, "yerel dal haberi eklentiden hemen çizim istedi");
  assert.equal((o.durum.get("sarmal.panel.acik") as Record<string, boolean>)[hedef], true, "yerel dal durumu kalıcı yazılmadı");
  assert.ok(o.panel.olcumler().satirSayisi > once, "eklentinin görünen satır sayısı yerel açılışı izlemiyor");
  // Önden veri: kısa bir gecikmeden sonra ağaç bir kez yeniden çizilir; ileti haberin sayacını taşır.
  await bekle(250);
  const yeni = mesajlar(o, "parca").at(-1)!;
  assert.equal(mesajlar(o, "parca").length, parcaOnce + 1, "önden veri tazelenmedi ya da birden çok kez çizildi");
  assert.equal(yeni.gec, 1, "çizim eklentinin gördüğü dal sayacını taşımıyor");
  assert.match(String(yeni.html), new RegExp(`data-id="${kacirId(hedef).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*aria-expanded="true"`), "çizimde dal açık değil");
  assert.equal(o.panel.olcumler().satirSayisi, satirSayisi(String(yeni.html)));
  // Kapatma haberi de yalnız kaydedilir; kapanınca önden tazeleme gerekmez.
  o.gorunum.mesajGonder({ tip: "gec", id: hedef, ac: false, n: 2, yerel: true });
  await bekle(250);
  assert.equal(mesajlar(o, "parca").length, parcaOnce + 1, "yerel kapatma çizim istedi");
  assert.equal((o.durum.get("sarmal.panel.acik") as Record<string, boolean>)[hedef], false);
  assert.equal(o.panel.olcumler().satirSayisi, once);
  // Bilinmeyen kimlik ve bozuk ileti hiçbir şeyi değiştirmez.
  o.gorunum.mesajGonder({ tip: "gec", id: "yok/yok", ac: true, n: 3, yerel: true });
  o.gorunum.mesajGonder({ tip: "gec", id: hedef, ac: "evet", n: 4, yerel: true });
  await bekle(250);
  assert.equal(mesajlar(o, "parca").length, parcaOnce + 1);
});

test("kalıcı açık tercih: önceden açık işaretli düğüm panel kurulur kurulmaz açıktır", () => {
  const ilk = ortamKur();
  const hedef = kapaliSatirlar(ilk.gorunum.webview.html).find((id) => id.split("/").length >= 3)!;
  const yeni = ortamKur("ray", { [hedef]: true });
  assert.ok(satirSayisi(yeni.gorunum.webview.html) > satirSayisi(ilk.gorunum.webview.html), "kalıcı açık tercih uygulanmamış");
});

// ── ④ ÇOK DÜĞÜMLÜ PROJE: SARMAL DEPOSUNUN KENDİSİ ───────────────────────────

test("Sarmal deposunun kendi planı: yüzlerce düğüm var, kapalı varsayılanla belge < 300 KB (Mini Graf hariç) ve yalnız açık düğümler DOM'dadır", () => {
  miniGrafAyari(false);
  const o = ortamKur();
  const kodlar = o.yol.panelKodlari();
  assert.ok(kodlar.length > 400, `fikstür küçük: ${kodlar.length} düğüm`);
  const h = o.gorunum.webview.html;
  assert.ok(h.length < 300 * 1024, `kapalı varsayılanla belge ${h.length} bayt (${kodlar.length} düğüm)`);
  const satirlar = satirSayisi(h);
  assert.ok(satirlar < kodlar.length / 4, `DOM'da ${satirlar} satır var; yalnız açık düğümler basılmalıydı (${kodlar.length} düğüm)`);
  assert.ok(!h.includes('<template id="graf-sablon">'), "Mini Graf ayarı kapalıyken Mini Graf çizilmiş");
  assert.ok(h.includes("ADM-") === false || satirlar > 0);
});

// ── ⑤ İLETİLER: YALNIZ İZİNLİ İŞLER ─────────────────────────────────────────

test("tıklama: komutlu satır komutunu çalıştırır; komutsuz satırda aç-kapa yoktur çünkü komut yoktur; bilinmeyen kimlik sessizdir", async () => {
  const o = ortamKur();
  const komutluId = [...o.gorunum.webview.html.matchAll(/data-id="([^"]+)"[^>]*data-komut="1"/g)].map((m) => m[1]!)[0]!;
  assert.ok(komutluId);
  const once = kabuk.komutCagrilari.length;
  o.gorunum.mesajGonder({ tip: "ac", id: komutluId.replace(/&amp;/g, "&") });
  await otur();
  const yeni = kabuk.komutCagrilari.slice(once).filter((c) => c.komut !== "setContext");
  assert.equal(yeni.length, 1, "tıklama tam bir komut çalıştırmalı");
  assert.ok(["vscode.open", "sarmal.varligaOdaklan"].includes(yeni[0]!.komut), yeni[0]!.komut);
  o.gorunum.mesajGonder({ tip: "ac", id: "olmayan/satir" });
  await otur();
  assert.equal(kabuk.komutCagrilari.slice(once).filter((c) => c.komut !== "setContext").length, 1, "bilinmeyen kimlik komut çalıştırmış");
});

test("kutucuk: işaretleme Yol Haritası sağlayıcısının kutuIsaretle kapısına gider; boolean olmayan değer ve Makinist satırı reddedilir", async () => {
  const o = ortamKur();
  const id = [...o.gorunum.webview.html.matchAll(/data-id="([^"]+)"/g)].map((m) => m[1]!.replace(/&amp;/g, "&"))[0]!;
  o.gorunum.mesajGonder({ tip: "isaretle", id, deger: true });
  await otur();
  assert.equal(o.kutuCagrilari.length, 1);
  assert.equal(o.kutuCagrilari[0]![1], true);
  o.gorunum.mesajGonder({ tip: "isaretle", id, deger: "evet" });
  o.gorunum.mesajGonder({ tip: "isaretle", id: "olmayan", deger: true });
  await otur();
  assert.equal(o.kutuCagrilari.length, 1, "bozuk ileti kutucuğu işaretlemiş");
  const m = ortamKur("makinist");
  m.gorunum.mesajGonder({ tip: "isaretle", id: "makinist/makinist.onaylar", deger: true });
  await otur();
  assert.equal(m.kutuCagrilari.length, 0, "Makinist satırı Yol Haritası kutucuğunu çalıştırmış");
});

test("satır eylemi: yalnız izinli komut ve yalnız satırın KENDİ eylem listesindeki komut çalışır; öğe olarak satırın nesnesi verilir", async () => {
  const o = ortamKur("makinist");
  // Fikirler grubunu aç.
  const grupId = "makinist/makinist.fikirler";
  assert.ok(o.gorunum.webview.html.includes(`data-id="${grupId}"`), "Fikirler grubunun kimliği beklenen biçimde değil");
  o.gorunum.mesajGonder({ tip: "gec", id: grupId, ac: true });
  await otur();
  const html = String(mesajlar(o, "parca").at(-1)!.html);
  const satirId = `${grupId}/Fikir 1`;
  assert.ok(html.includes(`data-id="${satirId}"`) && html.includes('data-komut="sarmal.satiriKopyala"'), "Fikir satırı kopyalama düğmesini taşımalı");
  const once = kabuk.komutCagrilari.length;
  o.gorunum.mesajGonder({ tip: "eylem", id: satirId, komut: "sarmal.satiriKopyala" });
  await otur();
  const c = kabuk.komutCagrilari.slice(once);
  assert.equal(c.length, 1);
  assert.equal(c[0]!.komut, "sarmal.satiriKopyala");
  assert.equal((c[0]!.argumanlar[0] as { ad: string }).ad, "Fikir 1", "komuta satırın kendi nesnesi verilmeli");
  // Kapatma Fikir satırının eylemi değildir; izinli komut olsa bile reddedilir. İzinsiz komut hiç çalışmaz.
  o.gorunum.mesajGonder({ tip: "eylem", id: satirId, komut: "sarmal.hatirlaticiKapat" });
  o.gorunum.mesajGonder({ tip: "eylem", id: satirId, komut: "workbench.action.reloadWindow" });
  o.gorunum.mesajGonder({ tip: "eylem", id: "makinist/makinist.onaylar", komut: "sarmal.satiriKopyala" });
  await otur();
  assert.equal(kabuk.komutCagrilari.slice(once).length, 1, "izinsiz eylem komut çalıştırmış");
});

test("Mini Graf komut köprüsü: izinli bağ çalışır, izinsiz bağ ve bozuk argüman çalışmaz", async () => {
  const o = ortamKur();
  const once = kabuk.komutCagrilari.length;
  const bag = (komut: string, arg?: unknown): string => `command:${komut}${arg === undefined ? "" : `?${encodeURIComponent(JSON.stringify(arg))}`}`;
  o.gorunum.mesajGonder({ tip: "komut", href: bag("sarmal.dosyaAc", ["/x/a.sar", 4]) });
  o.gorunum.mesajGonder({ tip: "komut", href: bag("sarmal.miniGraf.gorunumSec", ["klasik"]) });
  await otur();
  assert.deepEqual(kabuk.komutCagrilari.slice(once).map((c) => c.komut), ["sarmal.dosyaAc", "sarmal.miniGraf.gorunumSec"]);
  // PNL-A05 · OZK-13: dosya bağı dosyayı satırında açar ve odağı panelde bırakma seçeneğini taşır; öteki komut taşımaz.
  assert.deepEqual(kabuk.komutCagrilari.slice(once).map((c) => c.argumanlar),
    [["/x/a.sar", 4, { odakPanelde: true }], ["klasik"]]);
  o.gorunum.mesajGonder({ tip: "komut", href: bag("workbench.action.reloadWindow") });
  o.gorunum.mesajGonder({ tip: "komut", href: bag("sarmal.dosyaAc", [1, 2]) });
  o.gorunum.mesajGonder({ tip: "komut", href: "https://example.com" });
  o.gorunum.mesajGonder({ tip: "komut", href: 5 });
  await otur();
  assert.equal(kabuk.komutCagrilari.slice(once).length, 2, "izinsiz ya da bozuk bağ komut çalıştırmış");
});

// ── ⑥ VERİ DEĞİŞİNCE YALNIZ İLGİLİ PARÇA ───────────────────────────────────

test("Makinist verisi değişince yalnız Makinist parçası yeniden çizilir ve kendi sekmesine adreslenir; Ray seçiliyken de çizilir ki sekme geçişi hazır içerik bulsun (PNL-A18)", async () => {
  const o = ortamKur("makinist");
  const k = o.makinistKaynaklari;
  k.fikirler!.satirlar.push({ ad: "Fikir 2", baglam: "sarmalFikir" });
  (k.fikirler as { kayitSayisi: number }).kayitSayisi = 2;
  k.fikirler!.olay.fire(undefined);
  await bekle(250);
  const p = mesajlar(o, "parca");
  assert.equal(p.length, 1, "tek değişim tek parça üretmeli");
  assert.equal(p[0]!.kimlik, "makinist-agac");
  assert.equal(p[0]!.sekme, "makinist");
  assert.ok(/Fikirler<\/span><span class="ac">2</.test(String(p[0]!.html)), "sayı kaynağın yeni sayacını göstermeli");
  assert.equal(mesajlar(o, "bolum").length, 0);
  assert.equal(mesajlar(o, "rozet").at(-1)!.sayi, 3, "rozet onaylar + hatırlatıcılar toplamı");
  // Ray seçiliyken de Makinist bölümü güncel tutulur; parça yalnız Makinist kabına gider ve seçimi değiştirmez.
  const r = ortamKur("ray");
  r.makinistKaynaklari.hatirlaticilar!.olay.fire(undefined);
  await bekle(250);
  const rp = mesajlar(r, "parca");
  assert.deepEqual(rp.map((m) => [m.sekme, m.kimlik]), [["makinist", "makinist-agac"]], "gizli sekmenin bölümü güncel tutulmamış ya da başka sekmeye yazılmış");
  assert.equal(r.panel.olcumler().sekme, "ray");
  assert.ok(mesajlar(r, "rozet").length >= 1);
});

test("Yol Haritası öğesiz değişimi ağaç parçasını yeniler; öğe hedefli değişim (aktif varlık nabzı) TEK SATIR yamasıdır", async () => {
  const o = ortamKur();
  o.yol.yenile(goruntuOnbellegi as never);      // öğesiz tam değişim
  await bekle(250);
  const parcalar = mesajlar(o, "parca").filter((m) => m.kimlik === "agac");
  assert.equal(parcalar.length, 1, "tam değişim tek ağaç parçası üretmeli");
  assert.equal(o.panel.olcumler().parca, 1);
  // Aktif varlık: Sarmal planının bir dosyası aktif editör olur; nabız yalnız o varlığın satırını yamalar.
  o.yol.aktifligiGuncelle({ document: { uri: Uri.file(join(SARMAL_KOKU, "is/plan/faz/5_eylul_lansman.sar")) } } as never);
  await otur();
  const yamaOnce = mesajlar(o, "satir").length;
  o.yol.nabizAt(false);
  o.yol.nabizAt(true);
  await otur();
  const yamalar = mesajlar(o, "satir");
  assert.ok(yamalar.length >= yamaOnce + 2, "nabız satır yaması üretmemiş");
  assert.equal(mesajlar(o, "parca").filter((m) => m.kimlik === "agac").length, 1, "nabız bütün ağacı yeniden çizmiş");
  assert.ok(/^<div class="sat"/.test(String(yamalar.at(-1)!.html)) && !String(yamalar.at(-1)!.html).includes("</div><div"), "yama tek satır olmalı");
});

test("görünmeyen panel hiçbir şey çizmez; yeniden görününce beş sekmenin bölümü baştan gönderilir ve seçim değişmez", async () => {
  const o = ortamKur("makinist");
  o.gorunum.visible = false;
  o.makinistKaynaklari.fikirler!.olay.fire(undefined);
  await bekle(250);
  assert.equal(o.gorunum.gonderilen.filter((m) => ["parca", "bolum", "satir"].includes((m as { tip: string }).tip)).length, 0, "görünmeyen panel için çizim yapılmış");
  o.gorunum.visible = true;
  (o.gorunum as unknown as { gorunurluk: { fire(): void } }).gorunurluk.fire();
  await otur();
  assert.deepEqual(mesajlar(o, "bolum").map((m) => m.sekme), [...SEKMELER], "yeniden görününce beş bölüm de baştan gönderilmeli");
  assert.equal(mesajlar(o, "sekmeSec").length, 0, "yeniden görünme seçimi değiştirmiş");
  assert.equal(o.panel.olcumler().sekme, "makinist");
});

// ── ⑦ KARDEŞ TREN EKLENTİSİ ────────────────────────────────────────────────

test("kardeş Tren eklentisi: komutu kayıtlıysa Tren sekmesi 'Koşular paneli kardeş eklentide' bağlantısını gösterir ve tıklama komutu çalıştırır; yoksa bağlantı da komut da yoktur", async () => {
  const yok = ortamKur("tren");
  await otur();
  assert.ok(!yok.gorunum.webview.html.includes('data-kardes="1"'));
  yok.gorunum.mesajGonder({ tip: "kardes" });
  await otur();
  assert.ok(!kabuk.komutCagrilari.some((c) => c.komut === TREN_KARDES_KOMUTU), "kardeş yokken komut çalıştırılmış");
  let acildi = 0;
  kabuk.komutlar.set(TREN_KARDES_KOMUTU, () => { acildi += 1; });
  const var_ = ortamKur("tren");
  await otur();
  await bekle(250);                                   // kardeş yoklaması eşzamansızdır
  var_.gorunum.mesajGonder({ tip: "sekme", ad: "tren" });
  await otur();
  assert.ok(String(mesajlar(var_, "bolum").at(-1)?.html).includes('data-kardes="1"'), "kardeş varken bağlantı çizilmemiş");
  assert.equal(var_.panel.olcumler().kardesVar, true);
  var_.gorunum.mesajGonder({ tip: "kardes" });
  await otur();
  assert.equal(acildi, 1, "bağlantı kardeşin komutunu çalıştırmamış");
});

// ── ⑧ RAY DEĞİŞTİRME VE BÖLÜM KOMUTLARI ───────────────────────────────────

test("Ray değiştirme: varlık satırının atalarını açar, Ray sekmesine döner ve 'git' iletisiyle satırı seçtirir", async () => {
  const o = ortamKur("tren");
  const varlik = o.yol.varlikListesi().find((v) => v.ad === "Sarmal" || v.kod.includes("SARMAL"));
  assert.ok(varlik, "Sarmal varlığı yok");
  (o.panel as unknown as { varligaGit(v: unknown): void }).varligaGit(varlik);
  await bekle(50);
  assert.equal(o.panel.olcumler().sekme, "ray", "Ray değiştirme Ray sekmesine dönmeli");
  const git = mesajlar(o, "git").at(-1);
  assert.ok(git && typeof git.id === "string", "satırı seçtiren 'git' iletisi yok");
  assert.ok(mesajlar(o, "bolum").some((m) => m.sekme === "ray"));
});

// ── ⑨ DİL VE KAPANIŞ ──────────────────────────────────────────────────────

test("dil değişince şerit ve metinler yeniden yazılır; kapanışta zamanlayıcılar bırakılır", async () => {
  const { yuzeyDiliniAyarla } = await import("../src/yuzey-metinleri.ts");
  const o = ortamKur();
  assert.ok(o.gorunum.webview.html.includes(">Ray<"));
  yuzeyDiliniAyarla("en");
  try {
    o.panel.diliTazele();
    assert.ok(o.gorunum.webview.html.includes(">Rail<") && o.gorunum.webview.html.includes(">Driver<") && o.gorunum.webview.html.includes("ROADMAP"));
    assert.ok(o.gorunum.webview.html.includes('lang="en"'));
  } finally {
    yuzeyDiliniAyarla("tr");
  }
  o.makinistKaynaklari.fikirler!.olay.fire(undefined);          // bekleyen zamanlayıcı
  for (const d of o.baglam.subscriptions) d.dispose();
  const n = o.gorunum.gonderilen.length;
  await bekle(250);
  assert.equal(o.gorunum.gonderilen.length, n, "kapanıştan sonra çizim sürmüş");
});

// ── KATLANAN BAŞLIKLAR (Founder 2026-10-22: eski ayrı görünümler başlığından katlanıyordu) ──

test("Ray başlıkları katlanır: YOL HARİTASI ve MİNİ GRAF düğmedir, ok ve aria-expanded taşır; katlama kalıcıdır ve sekme değişiminde, yeniden kurulumda korunur", async () => {
  const o = ortamKur("ray");
  const ilk = o.gorunum.webview.html;
  assert.match(ilk, /<button type="button" class="bb" data-bolum="agac" aria-expanded="true" aria-controls="bolum-agac"><span class="ok"><svg/);
  assert.match(ilk, /<button type="button" class="bb" data-bolum="graf" aria-expanded="true" aria-controls="bolum-graf">/);
  assert.match(ilk, /<div id="bolum-graf" class="bolum">/);
  o.gorunum.mesajGonder({ tip: "bolumGec", bolum: "graf", ac: false });
  o.gorunum.mesajGonder({ tip: "bolumGec", bolum: "yok", ac: false });     // bilinmeyen bölüm sessizdir
  o.gorunum.mesajGonder({ tip: "bolumGec", bolum: "agac", ac: "hayir" });  // boolean olmayan değer reddedilir
  await otur();
  assert.deepEqual(o.durum.get("sarmal.panel.acik"), { "bolum:graf": false });
  // Sekme değişimi Ray bölümünü yeniden çizmez (webview katlı bölümü olduğu gibi korur); bölüm bir
  // sonraki çizimde (ör. panel yeniden görününce) katlı gelir.
  o.gorunum.mesajGonder({ tip: "sekme", ad: "tren", n: 1 });
  o.gorunum.mesajGonder({ tip: "sekme", ad: "ray", n: 2 });
  await otur();
  assert.equal(mesajlar(o, "bolum").length, 0, "sekme değişimi bölümü yeniden çizmiş");
  o.gorunum.visible = false;
  o.makinistKaynaklari.fikirler!.olay.fire(undefined);   // gizliyken gelen değişim paneli kirletir
  await bekle(250);
  o.gorunum.visible = true;
  (o.gorunum as unknown as { gorunurluk: { fire(): void } }).gorunurluk.fire();
  await otur();
  const son = mesajlar(o, "bolum").find((m) => m.sekme === "ray")!;
  assert.ok(son, "Ray bölümü yeniden çizilmedi");
  assert.match(String(son.html), /data-bolum="graf" aria-expanded="false"/);
  assert.match(String(son.html), /<div id="bolum-graf" class="bolum" hidden>/);
  assert.match(String(son.html), /data-bolum="agac" aria-expanded="true"/);
  // Yeniden kurulum (pencere yeniden yükleme): kalıcı tercih ilk belgede uygulanır.
  const yeni = ortamKur("ray", { "bolum:graf": false });
  assert.match(yeni.gorunum.webview.html, /data-bolum="graf" aria-expanded="false"/);
});

// ── ⑩ MİNİ GRAF TIKLAMASI VE SATIR SEÇİMİ (PNL-A05 · Founder 2026-10-27) ─────────

type PanelIci = { harita: Map<string, { kaynak: string; u: { oge: unknown } }>; sonGraf: string };
const ic = (o: Ortam): PanelIci => o.panel as unknown as PanelIci;
/** Ray ağacının şu an çizili, kodu olan satırları ve düğümlerinin Mini Graf bağı. */
function raySatirlari(o: Ortam): Array<{ id: string; kod: string; href: string }> {
  const dag = o.yol.dagAl();
  return [...ic(o).harita].filter(([, v]) => v.kaynak === "ray").flatMap(([id, v]) => {
    const kod = o.yol.ogeKodu(v.u.oge);
    const d = kod ? dag?.dugumler.get(kod) : undefined;
    return kod && d ? [{ id, kod, href: atlaHref(d) }] : [];
  });
}

test("Ray satırına tıklamak Mini Grafı yeniden üretmez ve göndermez; yalnız seçim işareti düğümün bağıyla taşınır (PNL-A05)", async () => {
  const o = ortamKur();
  const cizili = ic(o).sonGraf;
  const hedef = raySatirlari(o).find((r) => cizili.includes(`href="${r.href}"`));
  assert.ok(hedef, "Mini Graf çiziminde düğümü bulunan bir Ray satırı yok; ölçüm boş küme üstünde koşar");
  const cizim = o.graf.cizimSayisi;
  const gonderim = mesajlar(o, "parca").filter((m) => m.kimlik === "graf").length;
  o.gorunum.mesajGonder({ tip: "ac", id: hedef!.id });
  await bekle(250);   // panelin birleştirme gecikmesi (120 ms) geçer
  assert.equal(o.graf.cizimSayisi - cizim, 0, "satır tıklaması Mini Grafı yeniden üretti");
  assert.equal(mesajlar(o, "parca").filter((m) => m.kimlik === "graf").length - gonderim, 0, "satır tıklaması Mini Grafı yeniden gönderdi");
  assert.deepEqual(mesajlar(o, "grafSec").map((m) => m.href), [hedef!.href], "seçim işareti düğümün bağıyla taşınmadı");
  assert.ok(kabuk.komutCagrilari.some((c) => c.komut === "vscode.open"), "satır yine dosyayı açmalı");
  // İmleç izleme aynı düğümü seçer (yolharitasi.ts imlecTakip → dugumSec): çizim yine yapılmaz.
  o.graf.dugumSec(hedef!.kod);
  // Aynı satıra ikinci tıklama hiçbir şey göndermez.
  o.gorunum.mesajGonder({ tip: "ac", id: hedef!.id });
  await bekle(250);
  assert.equal(o.graf.cizimSayisi - cizim, 0, "imleç izleme ya da ikinci tıklama Mini Grafı yeniden üretti");
  assert.equal(mesajlar(o, "grafSec").length, 1);
  // Seçim Mini Grafın kendi durumuna yazılmıştır: bir sonraki çizim (ör. dil değişimi) bu düğümü seçili çizer ve mutlaka gönderilir.
  o.graf.yenidenCiz("dil");
  await bekle(250);
  const son = mesajlar(o, "parca").filter((m) => m.kimlik === "graf").at(-1);
  assert.ok(son && /class="dugum secili" aria-current="true"/.test(String(son.html)), "sonraki çizim seçimi taşımıyor");
});

test("Art arda iki Ray satırı tıklaması Mini Grafı yeniden üretmez; ikinci tıklama düğümün bağını son gönderilen çizimde bulur (PNL-A14)", async () => {
  // Ölçülmüş kusur (gerçek VS Code, 2026-10-28): birinci hafif seçim son gönderilen çizimi siliyordu ve
  // ikinci tıklama bağı boş metinde arayıp grafı yeniden çiziyordu. Arada bir tur çizim yaptığında kusur görünmüyordu.
  const o = ortamKur();
  const cizili = ic(o).sonGraf;
  const [a, b] = raySatirlari(o).filter((r) => cizili.includes(`href="${r.href}"`));
  assert.ok(a && b && a.href !== b.href, "Mini Graf çiziminde düğümü bulunan iki Ray satırı yok");
  const cizim = o.graf.cizimSayisi;
  o.gorunum.mesajGonder({ tip: "ac", id: a!.id });
  await bekle(250);
  o.gorunum.mesajGonder({ tip: "ac", id: b!.id });
  await bekle(250);
  assert.equal(o.graf.cizimSayisi - cizim, 0, `ikinci satır tıklaması Mini Grafı yeniden üretti (sebepler: ${o.graf.cizimSebepleri.join(", ")})`);
  assert.deepEqual(mesajlar(o, "grafSec").map((m) => m.href), [a!.href, b!.href], "iki seçim de işaretle taşınmalıydı");
  // İşaret webview'deki çizimi son gönderilenden ayırır: son gönderilenle aynı metni üreten çizim de gönderilmelidir.
  const grafGonderimi = (): Array<Record<string, unknown>> => mesajlar(o, "parca").filter((m) => m.kimlik === "graf");
  o.graf.yenidenCiz("dil");   // b seçili çizilir ve gönderilir
  await bekle(250);
  o.gorunum.mesajGonder({ tip: "ac", id: a!.id });   // işaret a'ya taşınır; çizim yapılmaz
  await bekle(250);
  const gonderim = grafGonderimi().length;
  o.graf.dugumSec(b!.kod);   // imleç izleme b'ye döner: çizim son gönderilenle aynıdır, webview ise a'yı işaretli gösterir
  await bekle(250);
  assert.equal(grafGonderimi().length - gonderim, 1, "webview'deki işaret son çizimden ayrıyken aynı çizim gönderilmedi");
  assert.equal(/<a class="dugum secili" aria-current="true" title="[^"]*" href="([^"]*)"/.exec(String(grafGonderimi().at(-1)?.html))?.[1], b!.href,
    "son gönderilen çizim imleç izlemenin seçimini taşımıyor");
});

test("Tur yayını Mini Grafın modelini değiştirmediyse graf yeniden üretilmez ve gönderilmez; değiştirdiyse bir kez üretilir ve seçimi taşır (PNL-A14)", async () => {
  const o = ortamKur();
  const grafGonderimi = (): string[] => mesajlar(o, "parca").filter((m) => m.kimlik === "graf").map((m) => String(m.html));
  const cizili = ic(o).sonGraf;
  const hedef = raySatirlari(o).find((r) => cizili.includes(`href="${r.href}"`));
  assert.ok(hedef, "Mini Graf çiziminde düğümü bulunan bir Ray satırı yok; ölçüm boş küme üstünde koşar");
  // Satır tıklaması seçimi çizmeden taşır; webview'deki çizim artık son gönderilenle aynı değildir.
  o.gorunum.mesajGonder({ tip: "ac", id: hedef!.id });
  await bekle(250);
  const cizim = o.graf.cizimSayisi;
  const gonderim = grafGonderimi().length;
  // Gövdenin turu (yolharitasi.ts goruntuyuIsle): dosyalar yeniden ayrıştırılır, Dag yeniden kurulur, graf haber alır.
  // Nesnelerin hepsi yenidir ama içerik aynıdır. Turun dosya araması yolları her turda başka sırayla verir
  // (gerçek VS Code ölçümü); aynı dosyalar burada ters sırayla gelir.
  const tur = (g: ReturnType<typeof goruntuKur>): void => { o.yol.yenile(g as never); o.graf.tazele(); };
  const ters = goruntuKur();
  ters.programlar = new Map([...ters.programlar].reverse());
  tur(ters);
  await bekle(250);
  assert.equal(o.graf.cizimSayisi - cizim, 0, `grafı değiştirmeyen tur Mini Grafı yeniden üretti (sebepler: ${o.graf.cizimSebepleri.join(", ")})`);
  assert.equal(grafGonderimi().length - gonderim, 0, "grafı değiştirmeyen tur Mini Grafı yeniden gönderdi");
  // Grafa yeni bir Faz ekleyen tur: yeniden üretim meşrudur ve tam bir kez olur.
  const degisen = goruntuKur();
  const yeniYol = join(SARMAL_KOKU, "_pnl-a14-nobet.sar");
  degisen.programlar.set(yeniYol, ayristir(belirtecle(`Faz( kod: PNLA14-F1, ad: "Mini Graf Nöbeti" ) {\n}\n`)));
  degisen.yollar.push(yeniYol);
  tur(degisen);
  await bekle(250);
  assert.equal(o.graf.cizimSayisi - cizim, 1, "grafı değiştiren tur Mini Grafı tam bir kez üretmeli");
  assert.equal(grafGonderimi().length - gonderim, 1, "grafı değiştiren turun çizimi webview'e gitmeli");
  const son = grafGonderimi().at(-1)!;
  assert.ok(son.includes("Mini Graf Nöbeti"), "yeni çizim turun eklediği düğümü taşımıyor");
  assert.equal(/<a class="dugum secili" aria-current="true" title="[^"]*" href="([^"]*)"/.exec(son)?.[1], hedef!.href,
    "yeni çizim satır tıklamasının seçimini taşımıyor");
  // Aynı turun ikinci yayını artık bir şey değiştirmez.
  tur(degisen);
  await bekle(250);
  assert.equal(o.graf.cizimSayisi - cizim, 1, "aynı grafın ikinci yayını Mini Grafı yeniden üretti");
});

test("Ray satırının düğümü Mini Grafın daraltılmış bir dalındaysa graf o dalı açmak için bir kez çizilir (PNL-A05 istisnası)", async () => {
  const o = ortamKur();
  // Tamamlanmış Fazlar büyük grafta tek satıra iner; birini Ray ağacında açıp çocuğuna tıklamak gizli düğümü seçer.
  let gizli: { id: string; kod: string; href: string } | undefined;
  for (const faz of raySatirlari(o)) {
    if (gizli) break;
    o.gorunum.mesajGonder({ tip: "gec", id: faz.id, ac: true });
    await otur();
    gizli = raySatirlari(o).find((r) => r.id.startsWith(`${faz.id}/`) && !ic(o).sonGraf.includes(`href="${r.href}"`));
  }
  assert.ok(gizli, "Mini Grafta gizli düğümü olan bir Ray satırı bulunamadı");
  const cizim = o.graf.cizimSayisi;
  o.gorunum.mesajGonder({ tip: "ac", id: gizli!.id });
  await bekle(250);
  assert.equal(o.graf.cizimSayisi - cizim, 1, "gizli düğüm için graf tam bir kez çizilmeli");
  assert.equal(mesajlar(o, "grafSec").length, 0);
  assert.ok(String(mesajlar(o, "parca").filter((m) => m.kimlik === "graf").at(-1)?.html).includes(`href="${gizli!.href}"`), "çizim gizli düğümü açmadı");
});

test("sarmal.dosyaAc: panelden gelen seçenekle dosyayı satırında açar ve odağı bırakmaz; seçeneksiz çağrı eskisi gibi odağı editöre verir (OZK-13)", async () => {
  const baglam = { subscriptions: [] as { dispose(): unknown }[], extensionUri: Uri.file(EKLENTI_KOKU), extensionPath: EKLENTI_KOKU,
    workspaceState: { get: () => undefined, update: async () => {} }, globalState: { get: () => undefined, update: async () => {} } };
  ortamlar.push({ baglam } as unknown as Ortam);
  yolHaritasiKaydi(baglam as never);
  belgeKoy("/p/plan.sar", "a\nb\nc\nd\ne\n");
  const ac = kabuk.komutlar.get("sarmal.dosyaAc") as (...a: unknown[]) => Promise<void>;
  await ac("/p/plan.sar", 4, { odakPanelde: true });
  await ac("/p/plan.sar", 2);
  const secenek = kabuk.gosterilen.map((g) => g.secenek as { selection: { start: { line: number } }; preserveFocus: boolean });
  assert.deepEqual(secenek.map((s) => [s.selection.start.line, s.preserveFocus]), [[3, true], [1, false]]);
});

// ── ⑫ SİNYALLER SEKMESİ (PNL-A09 · OZK-14 · Founder 2026-10-28) ───────────────────

/** Satırın kimliği, etiketi, açıklaması ve açık-kapalı durumu (panel satır biçiminden okunur). */
function satirlariOku(html: string): Array<{ id: string; etiket: string; aciklama: string; durum: string; derinlik: number; komutlu: boolean }> {
  const coz = (x: string): string => x.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  return [...sablonsuz(html).matchAll(/<div class="sat" role="treeitem" data-id="([^"]*)" data-d="(\d+)"[^>]*?(data-komut="1")?(?: aria-expanded="(true|false)")?>[\s\S]*?<span class="et"[^>]*>([^<]*)<\/span>(?:<span class="ac">([^<]*)<\/span>)?/g)]
    .map((m) => ({ id: coz(m[1]!), derinlik: Number(m[2]), komutlu: !!m[3], durum: m[4] ?? "yaprak", etiket: coz(m[5]!), aciklama: coz(m[6] ?? "") }));
}

test("Sinyaller sekmesi: yalnız Dur, Dikkat ve Bilgi bantları YAS-3.1 anlamlarıyla; Bilgi kapalı, odaktaki proje üstte ve açık; ayrı Gözlemler bölümü yok, Makinist'te Gözlemler yok; şeritte Dur ve Dikkat rozeti (PNL-A09)", () => {
  const o = ortamKur("sinyaller");
  const h = o.gorunum.webview.html;
  const satirlar = satirlariOku(panelIcerigi(h, "sinyaller"));
  const kokler = satirlar.filter((x) => x.derinlik === 0);
  // YUZ-3.3 (Founder hükmü 2026-10-28): üst düğümler yalnız üç banttır; Bilgi bandı eski Gözlemler grubunun yerini alır.
  assert.deepEqual(kokler.map((x) => x.etiket), ["Dur", "Dikkat", "Bilgi"], "üst düğümler yalnız üç bant olmalı");
  assert.deepEqual(kokler.map((x) => x.aciklama), [
    "3 · Kapıyı kapatan yapısal ihlal; Sarmal bunu kabul etmez.",
    "1 · Tam yeşilden önce giderilmesi gereken drift riski.",
    "2 · Kapıyı kapatmayan ölçüm, istisna ya da yönlendirme işareti.",
  ], "bant başlığı sayıyı ve YAS-3.1 anlamını söylemiyor");
  assert.deepEqual(kokler.map((x) => x.durum), ["true", "true", "false"], "Dur ve Dikkat açık, Bilgi kapalı başlamalı");
  // Dur bandı: odaktaki proje (Sarmal) üstte ve açık, öteki proje kapalı; bant içinde dosya ve satır sırası.
  const dur = satirlar.slice(satirlar.indexOf(kokler[0]!) + 1, satirlar.indexOf(kokler[1]!));
  const projeler = dur.filter((x) => x.derinlik === 1);
  assert.deepEqual(projeler.map((x) => [x.etiket, x.aciklama, x.durum]), [["Sarmal", "2", "true"], ["Örnek", "1", "false"]]);
  const tanilar = dur.filter((x) => x.derinlik === 2);
  assert.deepEqual(tanilar.map((x) => x.aciklama), [
    `${BAGSIZ_KOD} · 5_eylul_lansman.sar:12`,
    `${BAGLI.kod} · 5_eylul_lansman.sar:40 · ${BAGLI.madde}`,
  ], "satır kodu, dosyayı ve satırı göstermeli; kanon maddesi yalnız bağı olan tanıda görünür");
  assert.ok(tanilar.every((x) => x.komutlu), "tanı satırı dosyayı açan komutu taşımıyor");
  // Makinist'te Gözlemler grubu yoktur.
  assert.ok(!panelIcerigi(h, "makinist").includes("Gözlem"), "Makinist'te Gözlemler görünüyor");
  // Şeritte Dur ve Dikkat sayıları; Bilgi sayılmaz.
  assert.match(h, /data-sekme="sinyaller"[^>]*>[\s\S]*?<span class="rozet dur">3<\/span><span class="rozet dikkat">1<\/span>/);
  assert.deepEqual(o.panel.olcumler().sinyaller && { dur: o.panel.olcumler().sinyaller!.dur, dikkat: o.panel.olcumler().sinyaller!.dikkat, bilgi: o.panel.olcumler().sinyaller!.bilgi }, { dur: 3, dikkat: 1, bilgi: 2 });
});

test("Sinyaller bant simgesi sayı sıfır olsa da düzeyinin rengini taşır: Dur kırmızı, Dikkat sarı, Bilgi mavi; satır işaretiyle aynı renk (PNL-A09 · Founder 2026-10-28)", () => {
  const o = ortamKur("sinyaller");
  const renk = (oge: unknown): string => String((o.sinyaller.getTreeItem(oge).iconPath as { light?: { fsPath?: string } } | undefined)?.light?.fsPath ?? "");
  /** Simge dosyasının anlam rengi: `satir-<ad>-<anlam>-acik.svg` adının anlam parçası. */
  const anlam = (oge: unknown): string | undefined => /satir-[a-z]+-([a-z]+)-acik\.svg$/.exec(renk(oge))?.[1];
  const bantlar = (): unknown[] => o.sinyaller.getChildren() as unknown[];
  assert.deepEqual(bantlar().map(anlam), ["hata", "uyari", "bilgi"], `bant simgesi düzey rengini taşımıyor: ${bantlar().map(renk).join(", ")}`);
  // Satır işareti aynı renkte: her bandın ilk tanı satırının simgesi bandın rengindedir.
  for (const bant of bantlar()) {
    const proje = (o.sinyaller.getChildren(bant) as unknown[])[0];
    const tani = proje ? (o.sinyaller.getChildren(proje) as unknown[])[0] : undefined;
    assert.ok(tani, "fikstürde her bandın en az bir tanısı olmalı");
    assert.equal(anlam(tani), anlam(bant), "bant simgesi ile satır işareti ayrı renkte");
  }
  // Sayı sıfır: üç bant da boşken simge gri olmaz, yine düzeyin rengindedir.
  o.sinyaller.yerlestir([], "SARMAL");
  assert.deepEqual(bantlar().map(anlam), ["hata", "uyari", "bilgi"], "boş bant gri simgeye dönmüş");
});

test("Sinyaller sayısı denetim sonucu eksi Hatırlatıcılar yüzeyine yönlenenlerdir; bütün bantlar açıkken her kayıt tam bir satırdır ve hiçbiri iki kez çizilmez; rozet yeni turla tazelenir (PNL-A09 · YUZ-3.3)", async () => {
  const o = ortamKur("sinyaller", { "sinyaller/bant.bilgi": true, "sinyaller/bant.dur/proje.ORNEK": true, "sinyaller/bant.bilgi/proje.ORNEK": true });
  const olcu = o.panel.olcumler().sinyaller!;
  assert.equal(olcu.toplam, SINYALDE.length, "sekmenin sayısı denetim sonucu eksi Hatırlatıcılar yüzeyine yönlenenlerden ayrıştı");
  assert.equal(olcu.hatirlatici, SINYAL_KAYITLARI.length - SINYALDE.length, "Hatırlatıcılar yüzeyine yönlenen kayıt sayısı yanlış");
  assert.equal(olcu.bantsiz, 0);
  assert.equal(olcu.cizilenSatir, SINYALDE.length, "bütün bantlar açıkken her kayıt tam bir satır olmalı");
  assert.equal(olcu.tekilKayit, olcu.cizilenSatir, "bir kayıt Sinyaller'de iki kez çizildi");
  // Hatırlatıcılar yüzeyine yönlenen tanılar Sinyaller'de hiç yoktur (yalnız Makinist'tedirler).
  const satirlar = satirlariOku(panelIcerigi(o.gorunum.webview.html, "sinyaller"));
  const kimlikler = satirlar.map((x) => x.id);
  assert.equal(new Set(kimlikler).size, kimlikler.length, "aynı satır iki kez çizildi");
  assert.deepEqual(satirlar.filter((x) => [ILERI_KOD, ILERI_KOD_2].includes(x.aciklama.split(" · ")[0]!)).map((x) => x.aciklama), [],
    "Hatırlatıcılar yüzeyine yönlenen tanı Sinyaller'de çizildi");
  // Yeni tur: bir Dur kaydı düşer; rozet ve bölüm aynı yayında tazelenir.
  o.sinyaller.yerlestir(SINYAL_KAYITLARI.slice(1), "SARMAL");
  await bekle(250);
  assert.deepEqual(mesajlar(o, "sinyalRozet").at(-1), { tip: "sinyalRozet", dur: 2, dikkat: 1 });
  assert.ok(mesajlar(o, "bolum").some((m) => m.sekme === "sinyaller"), "Sinyaller bölümü yeni turla tazelenmedi");
  assert.equal(o.panel.olcumler().sinyaller!.toplam, SINYALDE.length - 1);
});

test("Sinyal satırına tıklamak dosyayı tanının satırında açar ve odak panelde kalır; kanon maddesi satırı maddenin tanımını açan komutu çalıştırır (PNL-A09 · OZK-13)", async () => {
  const o = ortamKur("sinyaller");
  const satirlar = await sinyalSatirlariniOku(o);
  const bagli = satirlar.find((x) => x.aciklama.startsWith(`${BAGLI.kod} · 5_eylul_lansman.sar:40`))!;
  assert.ok(bagli, "kural bağlı tanı satırı yok");
  o.gorunum.mesajGonder({ tip: "ac", id: bagli.id });
  await otur();
  assert.deepEqual(kabuk.komutCagrilari.filter((c) => c.komut === "sarmal.dosyaAc").at(-1)?.argumanlar, [SINYAL_DOSYASI, 40, { odakPanelde: true }],
    "satır dosyayı tanının satırında ve odağı panelde bırakarak açmıyor");
  // Satır açılınca öneri ve kanon maddesi alt satırları görünür; madde satırı tanımı açan komutu çalıştırır.
  o.gorunum.mesajGonder({ tip: "gec", id: bagli.id, ac: true });
  await otur();
  const cocuklar = satirlariOku(String(mesajlar(o, "bolum").filter((m) => m.sekme === "sinyaller").at(-1)?.html ?? ""))
    .filter((x) => x.id.startsWith(`${bagli.id}/`));
  assert.deepEqual(cocuklar.map((x) => [x.etiket, x.aciklama]), [["Öneri", "şöyle düzelt"], [BAGLI.madde, "Kanon maddesi"]]);
  o.gorunum.mesajGonder({ tip: "ac", id: cocuklar[1]!.id });
  await otur();
  assert.deepEqual(kabuk.komutCagrilari.at(-1), { komut: "sarmal.kanonMaddesiAc", argumanlar: [BAGLI.madde] });
  // Bağı olmayan tanının alt satırı yoktur: madde uydurulmaz.
  const bagsiz = satirlar.find((x) => x.aciklama === `${BAGSIZ_KOD} · 5_eylul_lansman.sar:12`)!;
  assert.equal(bagsiz.durum, "yaprak", "bağı ve önerisi olmayan tanı açılır satır olmuş");
});

/** Sinyaller kabının satırları (ilk belgeden). */
async function sinyalSatirlariniOku(o: Ortam): Promise<ReturnType<typeof satirlariOku>> {
  await otur();
  return satirlariOku(panelIcerigi(o.gorunum.webview.html, "sinyaller"));
}

// ── ⑪ ONAY KARARI PANELİN İÇİNDE (OZK-13 · PNL-A07 · Founder 2026-10-27) ─────────

const ONAY_DOSYASI = "/sahte/proje/is/plan/onay.sar";
const ONAY_KAYNAGI =
  `Faz( kod: F1, ad: "deneme dönemi" ) {\n  Blok( kod: B1, ad: "deneme işi" ) {\n    Katman( kod: KT1, ad: "deneme teknolojisi" ) {\n` +
  ["A1", "A2"].map((k) => `      Adım( kod: ${k}, onayBekler: founder, durum: beklemede, ne: "${k} karar bekliyor", ` +
    `kabul: [ "Tasarım Founder tarafından onaylanmıştır — onaysız uygulanmaz" ] )\n`).join("") +
  `    }\n  }\n}\n`;

/** Gerçek onay defteri, gerçek onay kuyruğu ve gerçek Makinist ağacıyla kurulan panel; Makinist sekmesi ve Onaylar düğümü açık. */
function onayOrtami(): { o: Ortam; onay: InstanceType<typeof OnayPaneli>; kapilar: ReturnType<typeof onayKapilariTopla> } {
  const onay = new OnayPaneli();
  const kapilar = onayKapilariTopla(ayristir(belirtecle(ONAY_KAYNAGI)).bildirimler);
  onay.yerlestirHepsi(kapilar.map((kapi) => ({ dosya: ONAY_DOSYASI, kapi })));
  belgeKoy(ONAY_DOSYASI, ONAY_KAYNAGI);
  const o = ortamKur("makinist", { "makinist/makinist.onaylar": true }, {}, (baglam) => {
    onayKuyruguKaydi(baglam as never, onay);
    return makinistKaydi(baglam as never, { onayPaneli: onay, hatirlaticilar: kaynakKur([]) as never, fikirler: kaynakKur([]) as never });
  });
  return { o, onay, kapilar };
}
/** Makinist ağacının son çizimi (bölüm ya da parça). */
function sonMakinist(o: Ortam): string {
  const son = o.gorunum.gonderilen.filter((m) => ["bolum", "parca"].includes(String((m as { tip?: string }).tip))).at(-1) as { html?: string } | undefined;
  return String(son?.html ?? o.gorunum.webview.html);
}
const kademeler = (html: string): string[] => [...html.matchAll(/<div class="kademe"[^>]*data-kapi="([^"]+)"/g)].map((m) => m[1]!);

test("onay kapısına tıklamak dosyayı satırında, önizleme kipinde ve odak panelde kalarak açar; karar kademesi kapı satırının hemen altında panelin içinde çizilir, editörde kart açılmaz (OZK-13)", async () => {
  const { o, kapilar } = onayOrtami();
  const a1 = "makinist/makinist.onaylar/A1";
  assert.ok(o.gorunum.webview.html.includes(`data-id="${a1}"`), "Onaylar düğümünde kapı satırı yok");
  assert.match(o.gorunum.webview.html, new RegExp(`data-id="${a1}"[^>]*aria-expanded="false"`), "kapı satırı açılıp kapanan bir satır olarak çizilmiyor");
  o.gorunum.mesajGonder({ tip: "ac", id: a1 });
  await bekle(60);
  // Dosya: tek belge, Adımın satırında, önizleme kipinde, odak panelde.
  assert.deepEqual(kabuk.gosterilen, [{ dosya: ONAY_DOSYASI, secenek: { preview: true, preserveFocus: true } }], "kapı tıklaması tek belgeyi önizleme kipinde ve odağı bırakmadan açmadı");
  assert.equal(kabuk.etkinEditor?.selection.active.line, kapilar[0]!.satir, "dosya kapının satırında açılmadı");
  assert.equal(kabuk.paneller.length, 0, "editörde bir webview paneli (onay kartı) açıldı");
  // Kademe: kapı satırının hemen altında, tek, gerekçe kutusu ve üç eylemle; odak kutuya gider.
  const html = sonMakinist(o);
  assert.deepEqual(kademeler(html), [a1], "karar kademesi açılan kapının altında tek başına çizilmedi");
  assert.match(html, new RegExp(`data-id="${a1}"[^>]*aria-expanded="true"[\\s\\S]*?</div><div class="kademe"`), "kademe kapı satırının hemen altında değil");
  assert.ok(html.indexOf('class="kademe"') < html.indexOf('data-id="makinist/makinist.onaylar/A2"'), "kademe kardeş kapının altına düşmüş");
  const kademe = html.slice(html.indexOf('class="kademe"'));
  assert.ok(/<textarea[^>]*class="not-metin"/.test(kademe), "gerekçe kutusu yok");
  assert.deepEqual([...kademe.matchAll(/data-rol="([^"]+)"/g)].slice(0, 3).map((m) => m[1]), ["onay", "şerh", "ret"], "üç eylem kutunun altında değil");
  assert.deepEqual(mesajlar(o, "onayOdak").map((m) => m.kimlik), [notKimligi(ONAY_DOSYASI, "A1")], "odak gerekçe kutusuna gitmedi");
  assert.equal(o.panel.olcumler().sekme, "makinist");
});

test("aynı anda yalnız bir kapının karar kademesi açıktır; açık kapıya yeniden tıklamak kademeyi kapatır ve dosyayı yeniden açmaz (Founder 2026-10-27)", async () => {
  const { o, onay } = onayOrtami();
  const [a1, a2] = ["makinist/makinist.onaylar/A1", "makinist/makinist.onaylar/A2"];
  o.gorunum.mesajGonder({ tip: "ac", id: a1 });
  await bekle(60);
  o.gorunum.mesajGonder({ tip: "ac", id: a2 });
  await bekle(60);
  assert.deepEqual(kademeler(sonMakinist(o)), [a2], "ikinci kapı açılınca birincinin kademesi açık kaldı");
  assert.deepEqual(onay.acikKapi(), { dosya: ONAY_DOSYASI, kod: "A2" });
  const acilan = kabuk.gosterilen.length;
  o.gorunum.mesajGonder({ tip: "ac", id: a2 });
  await bekle(60);
  assert.deepEqual(kademeler(sonMakinist(o)), [], "açık kapıya tıklamak kademeyi kapatmadı");
  assert.equal(kabuk.gosterilen.length, acilan, "kademeyi kapatmak dosyayı yeniden açtı");
  // Ok tuşu (gec iletisi) aynı yolu kullanır.
  o.gorunum.mesajGonder({ tip: "gec", id: a1, ac: true });
  await bekle(60);
  assert.deepEqual(kademeler(sonMakinist(o)), [a1], "kapının oku kademeyi açmadı");
});

test("kademedeki eylemler bugünkü yazım yolundan geçer: şerh karar komutunu kırpılmış gerekçeyle çağırır; boş gerekçe ve tanınmayan ileti çağırmaz", async () => {
  // Diske tek satır indiği gerçek dosyada gerçek VS Code süitinde ölçülür (onay-yuzeyi.test.ts · panel yolu);
  // kabuk sahtesi kanıtlı yazımı (yaz, kaydet, geri oku) koşturamaz. Burada ölçülen, panelin kademe iletisini
  // onay defterinin karar hattına ve oradan tek yazıcıya (`sarmal.onayKararVer`) doğru argümanlarla indirmesidir.
  const { o, kapilar } = onayOrtami();
  o.gorunum.mesajGonder({ tip: "ac", id: "makinist/makinist.onaylar/A2" });
  await bekle(60);
  const a2 = kapilar[1]!;
  const kararlar = (): unknown[][] => kabuk.komutCagrilari.filter((c) => c.komut === "sarmal.onayKararVer").map((c) => c.argumanlar);
  // Tanınmayan onay iletisi ve boş gerekçe: yazım yok, hata kutunun yanında görünür.
  o.gorunum.mesajGonder({ tip: "onay", ileti: { tur: "aç", dosya: ONAY_DOSYASI, kod: "A1", acik: true, kimlik: "x" } });
  o.gorunum.mesajGonder({ tip: "onay", ileti: { tur: "kararVer", dosya: ONAY_DOSYASI, kod: "A2", satir: a2.satir, rol: "şerh", not: "   " } });
  await bekle(60);
  assert.deepEqual(kararlar(), [], "boş gerekçe ya da tanınmayan ileti karar komutuna ulaştı");
  assert.match(sonMakinist(o), /<p class="not-hata"[^>]*role="alert">[^<]+<\/p>/, "boş gerekçe hatası kutunun yanında görünmedi");
  assert.deepEqual(kademeler(sonMakinist(o)), ["makinist/makinist.onaylar/A2"], "tanınmayan ileti kademeyi değiştirdi");
  // Taslak deftere düşer; şerh kırpılmış gerekçeyle tek yazıcıya iner.
  o.gorunum.mesajGonder({ tip: "onay", ileti: { tur: "taslak", kimlik: notKimligi(ONAY_DOSYASI, "A2"), metin: "ölçüm eksik" } });
  o.gorunum.mesajGonder({ tip: "onay", ileti: { tur: "kararVer", dosya: ONAY_DOSYASI, kod: "A2", satir: a2.satir, rol: "şerh", not: "  ölçüm eksik  " } });
  await bekle(120);
  assert.deepEqual(kararlar(), [[ONAY_DOSYASI, a2.satir, "A2", "şerhle onaylandı", true, "ölçüm eksik"]],
    "kademenin şerh eylemi karar komutuna beklenen argümanlarla ulaşmadı");
  assert.equal(kabuk.paneller.length, 0);
});

test("panelden tıklanan her satır dosyayı odak panelde kalarak açar (OZK-13): sarmal.dosyaAc seçenekle, vscode.open preserveFocus ile; öteki komutlar değişmez", async () => {
  assert.deepEqual(odakPaneldeArgumanlar("sarmal.dosyaAc", ["/a.sar", 3]), ["/a.sar", 3, { odakPanelde: true }]);
  const u = Uri.file("/a.sar");
  assert.deepEqual(odakPaneldeArgumanlar("vscode.open", [u, { selection: 1 }]), [u, { selection: 1, preserveFocus: true }]);
  assert.deepEqual(odakPaneldeArgumanlar("vscode.open", [u]), [u, { preserveFocus: true }]);
  assert.deepEqual(odakPaneldeArgumanlar("sarmal.varligaOdaklan", ["x"]), ["x"]);
  // Ray satırı uçtan uca: dosya açan satır odağı bırakmadan açar.
  const o = ortamKur();
  const id = [...o.gorunum.webview.html.matchAll(/data-id="([^"]+)"[^>]*data-komut="1"/g)].map((m) => m[1]!.replace(/&amp;/g, "&"))
    .find((x) => (ic(o).harita.get(x)?.u as { item?: { command?: { command: string } } })?.item?.command?.command === "vscode.open");
  assert.ok(id, "dosya açan Ray satırı yok");
  const once = kabuk.komutCagrilari.length;
  o.gorunum.mesajGonder({ tip: "ac", id: id! });
  await otur();
  const cagri = kabuk.komutCagrilari.slice(once).find((c) => c.komut === "vscode.open");
  assert.ok(cagri && (cagri.argumanlar[1] as { preserveFocus?: boolean }).preserveFocus === true, "Ray satırı odağı editöre veriyor");
});

// ── ⑬ SEKMELERİN SÜRÜKLENEREK SIRALANMASI (PNL-A23 · OZK-14 DÖRDÜNCÜSÜ) ───────────────

test("sekme sırası kullanıcı ayarından okunur: şerit o sırayla dizilir, panel sıranın ilk sekmesiyle açılır ve rozetler sekmeleriyle taşınır (PNL-A23)", () => {
  const ozel = ["sinyaller", "makinist", "ray", "tren", "ayarlar"];
  siraAyari(ozel);
  const o = ortamKur();
  const h = o.gorunum.webview.html;
  assert.deepEqual(seritSirasi(h), ozel, "şerit kullanıcının sırasında değil");
  assert.equal(o.panel.olcumler().sekme, "sinyaller", "panel sıranın ilk sekmesiyle açılmalı");
  assert.ok(h.includes('data-sekme="sinyaller" aria-selected="true"') && !gizliMi(h, "sinyaller") && gizliMi(h, "ray"));
  assert.deepEqual(o.panel.olcumler().sekmeSirasi, ozel);
  // Makinist rozeti (3) Makinist düğmesinin, Dur ve Dikkat rozetleri Sinyaller düğmesinin içindedir.
  const dugme = (s: string): string => new RegExp(`<button[^>]*data-sekme="${s}"[\\s\\S]*?</button>`).exec(h)![0];
  assert.match(dugme("makinist"), /<span class="rozet">3<\/span>/);
  assert.match(dugme("sinyaller"), /<span class="rozet dur">3<\/span><span class="rozet dikkat">1<\/span>/);
  assert.deepEqual(kabuk.komutCagrilari.filter((c) => c.komut === "setContext" && c.argumanlar[0] === BAGLAM_SEKME).at(-1)?.argumanlar, [BAGLAM_SEKME, "sinyaller"]);
});

test("bozuk ya da eksik sıra ayarı paneli bozmaz: dizi olmayan değer paketin varsayılanına düşer, bilinmeyen kimlik atılır, eksik kimlik sona eklenir (PNL-A23)", () => {
  const durumlar: Array<[unknown, string[]]> = [
    [undefined, PAKET_SIRASI], [null, PAKET_SIRASI], ["ray", PAKET_SIRASI], [42, PAKET_SIRASI], [{ ray: 1 }, PAKET_SIRASI],
    [[], PAKET_SIRASI], [["yok", 3], PAKET_SIRASI],
    [["ayarlar", "graf", "ayarlar"], ["ayarlar", ...PAKET_SIRASI.filter((s) => s !== "ayarlar")]],
    [["tren", "makinist"], ["tren", "makinist", ...PAKET_SIRASI.filter((s) => s !== "tren" && s !== "makinist")]],
  ];
  for (const [deger, beklenen] of durumlar) {
    siraAyari(deger);
    const o = ortamKur();
    const h = o.gorunum.webview.html;
    assert.deepEqual(seritSirasi(h), beklenen, `${JSON.stringify(deger)}: şerit sırası`);
    assert.equal(o.panel.olcumler().sekme, beklenen[0], `${JSON.stringify(deger)}: açılış sekmesi sıranın ilki değil`);
    assert.equal((h.match(/role="tab"/g) ?? []).length, 5);
    for (const s of PAKET_SIRASI) assert.ok(h.includes(`id="panel-${s}"`), `${JSON.stringify(deger)}: ${s} kabı yok`);
    for (const d of o.baglam.subscriptions.splice(0)) d.dispose();
  }
});

test("webview'de kurulan sıra kullanıcı (Global) ayarına yazılır; seçim değişmez, içerik gönderilmez; aynı ya da bozuk sıra yazılmaz (PNL-A23)", async () => {
  const ayar = siraAyari(undefined);
  const o = ortamKur();
  await otur();
  const once = o.gorunum.gonderilen.length;
  const yeni = ["makinist", "ray", "tren", "sinyaller", "ayarlar"];
  o.gorunum.mesajGonder({ tip: "sekmeSirasi", sira: yeni });
  await otur();
  assert.deepEqual(ayar.yazimlar, [["sekmeSirasi", yeni, sahte.ConfigurationTarget.Global]], "sıra kullanıcı ayarına yazılmadı");
  assert.equal(o.panel.olcumler().sekme, "ray", "sıra seçimi değiştirmemeli");
  assert.deepEqual(o.panel.olcumler().sekmeSirasi, yeni);
  const sonra = o.gorunum.gonderilen.slice(once).map((m) => (m as { tip?: string }).tip);
  assert.ok(!sonra.some((t) => ["bolum", "parca", "satir", "sekmeSec"].includes(String(t))), `sıra iletisi içerik ya da seçim doğurdu: ${sonra.join(",")}`);
  assert.equal(o.durum.has("sarmal.panel.sekmeSirasi"), false, "sıra workspaceState'e yazılmış");
  // Aynı sıra ikinci kez yazılmaz; dizi olmayan ileti yazılmaz; eksik sıra tamamlanarak yazılır.
  o.gorunum.mesajGonder({ tip: "sekmeSirasi", sira: yeni });
  o.gorunum.mesajGonder({ tip: "sekmeSirasi", sira: "ray" });
  o.gorunum.mesajGonder({ tip: "sekmeSirasi" });
  await otur();
  assert.equal(ayar.yazimlar.length, 1, "değişmeyen ya da bozuk sıra yazıldı");
  o.gorunum.mesajGonder({ tip: "sekmeSirasi", sira: ["ayarlar", "x"] });
  await otur();
  assert.deepEqual(ayar.yazimlar.at(-1)?.[1], ["ayarlar", "makinist", "ray", "tren", "sinyaller"], "eksik sıra şimdiki sıranın kalanıyla tamamlanmalı");
  assert.equal(o.panel.olcumler().siraYazimi, 2);
});

test("ayar başka yoldan değişince yeni sıra webview'e iletilir ve belge yeniden yazılmaz; varsayılana döndürme komutu kullanıcı ayarını siler (PNL-A23)", async () => {
  const ayar = siraAyari(["tren", "ray", "makinist", "sinyaller", "ayarlar"]);
  const o = ortamKur();
  await otur();
  const belge = o.panel.olcumler().belge;
  ayar.degistir(["ayarlar", "sinyaller", "makinist", "tren", "ray"]);
  await otur();
  assert.deepEqual(mesajlar(o, "sekmeSirasi").at(-1), { tip: "sekmeSirasi", sira: ["ayarlar", "sinyaller", "makinist", "tren", "ray"] });
  assert.equal(o.panel.olcumler().belge, belge, "sıra değişimi belgeyi yeniden yazdı");
  assert.equal(o.panel.olcumler().sekme, "tren", "sıra değişimi seçimi değiştirmemeli");
  // Komut paletindeki varsayılana döndürme: kullanıcı ayarı silinir, şerit paketin sırasına döner.
  const sifirla = kabuk.komutlar.get(SEKME_SIRASI_SIFIRLA_KOMUTU);
  assert.ok(sifirla, "varsayılana döndürme komutu kayıtlı değil");
  await sifirla!();
  await otur();
  assert.deepEqual(ayar.yazimlar.at(-1), ["sekmeSirasi", undefined, sahte.ConfigurationTarget.Global]);
  assert.deepEqual(mesajlar(o, "sekmeSirasi").at(-1), { tip: "sekmeSirasi", sira: PAKET_SIRASI });
  assert.deepEqual(o.panel.olcumler().sekmeSirasi, PAKET_SIRASI);
});

test("paket katkısı: sekme sırası kullanıcı (application) ayarıdır, varsayılanı beş kimliğin tam bir sırasıdır; varsayılana döndürme komutu komut paletindedir (PNL-A23)", () => {
  const paket = JSON.parse(readFileSync(join(EKLENTI_KOKU, "package.json"), "utf8")) as {
    contributes: {
      configuration: { properties: Record<string, { scope?: string; type?: string; default?: unknown; items?: { enum?: string[] } }> };
      commands: Array<{ command: string; title: string }>;
      menus: { commandPalette?: Array<{ command: string; when?: string }> };
    };
  };
  const ayar = paket.contributes.configuration.properties["sarmal.sekmeSirasi"]!;
  assert.equal(ayar.scope, "application", "sıra kullanıcı ayarı olmalı (çalışma alanı ayarına yazılmaz)");
  assert.equal(ayar.type, "array");
  assert.deepEqual([...(ayar.items?.enum ?? [])].sort(), [...SEKMELER].sort());
  assert.deepEqual(ayar.default, [...(ayar.default as string[])].filter((s, i, a) => SEKMELER.includes(s as never) && a.indexOf(s) === i), "varsayılanda bilinmeyen ya da yinelenen kimlik var");
  assert.equal((ayar.default as string[]).length, SEKMELER.length, "varsayılan beş sekmenin hepsini taşımalı");
  assert.ok(/^[\x20-\x7e]+$/.test("sarmal.sekmeSirasi") && /^[\x20-\x7e]+$/.test(SEKME_SIRASI_SIFIRLA_KOMUTU), "ayar ve komut adı ASCII olmalı (H15)");
  assert.ok(paket.contributes.commands.some((k) => k.command === SEKME_SIRASI_SIFIRLA_KOMUTU), "komut katkıda yok");
  assert.ok(!(paket.contributes.menus.commandPalette ?? []).some((m) => m.command === SEKME_SIRASI_SIFIRLA_KOMUTU && m.when === "false"), "komut paletten gizlenmiş");
});

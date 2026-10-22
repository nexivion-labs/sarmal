// ═══════════════════════════════════════════════════════════════════════════
// panel.test.ts — 🧭 SARMAL PANELİNİN KABUĞU (Founder 2026-10-21 · bağlayıcı çizim)
//
//   Kap TEK webview görünümüdür (`sarmalPanel`). Bu süit kabuğu kabuk sahtesiyle
//   GERÇEKTEN koşturur ve Sarmal deposunun KENDİ planını (is/plan/faz/*.sar ve
//   bütün depo) gerçek Yol Haritası sağlayıcısına yükler: sekme seçimine göre
//   doğru bölümün çizildiği, kapta ağaç görünümü kurulmadığı, açık-kapalı
//   düğümde doğru satır sayısı üretildiği, çok düğümlü projede çıktının makul
//   boyutta kaldığı, iletilerin (tıklama, kutucuk, eylem, komut köprüsü) yalnız
//   izinli işleri yaptığı, görünmeyen panelin hiçbir şey çizmediği ve kalıcılığın
//   workspaceState'e gittiği ölçülür.
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
import { mevsimNormalize } from "../../cekirdek/src/denetci.ts";
import type { Program } from "../../cekirdek/src/sozdizim.ts";
import * as sahte from "./vscode-sahtesi.ts";

const { YolHaritasi } = await import("../src/yolharitasi.ts");
const { MiniGrafGorunumu } = await import("../src/minigraf.ts");
const { Tren } = await import("../src/tren.ts");
const { MakinistAgaci } = await import("../src/makinist.ts");
const { panelKaydi, GORUNUS_PANEL, BAGLAM_SEKME, TREN_KARDES_KOMUTU } = await import("../src/panel.ts");

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
  baglam: { subscriptions: { dispose(): unknown }[]; extensionUri: Uri; extensionPath: string; workspaceState: { get: (k: string) => unknown; update: (k: string, v: unknown) => Promise<void> } };
  durum: Map<string, unknown>;
  makinistKaynaklari: Record<string, ReturnType<typeof kaynakKur>>;
  kutuCagrilari: Array<[unknown, boolean]>;
}
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

/** Panelin tamamını sahte kabukta kurar; `sekme` workspaceState'te önceden verilebilir. */
function ortamKur(sekme?: string, acik?: Record<string, boolean>): Ortam {
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
    gozlemler: kaynakKur([]),
    fikirler: kaynakKur([{ ad: "Fikir 1", baglam: "sarmalFikir" }]),
  };
  const makinist = new MakinistAgaci(kaynaklar as never, Uri.file(EKLENTI_KOKU) as never);
  // Kaynak değişimi tek yenilemeye bağlanır (makinistKaydi'nin kurduğu bağ).
  for (const k of Object.values(kaynaklar)) k.onDidChangeTreeData(() => makinist.yenile());
  const durum = new Map<string, unknown>();
  if (sekme) durum.set("sarmal.panel.sekme", sekme);
  if (acik) durum.set("sarmal.panel.acik", acik);
  const baglam = {
    subscriptions: [] as { dispose(): unknown }[], extensionUri: Uri.file(EKLENTI_KOKU), extensionPath: EKLENTI_KOKU,
    workspaceState: { get: (k: string) => durum.get(k), update: async (k: string, v: unknown) => { durum.set(k, v); } },
  };
  const kutuCagrilari: Array<[unknown, boolean]> = [];
  yol.kutuIsaretle = async (o: unknown, b: boolean) => { kutuCagrilari.push([o, b]); };
  const yuz = { saglayici: yol, miniGraf: graf, panelBagla() { /* sınama bağı gerekmez */ }, diliTazele() { /* sınama */ }, kodlar: () => [], gorunurMu: () => true };
  const panel = panelKaydi(baglam as never, { yol: yuz as never, tren, makinist });
  const saglayici = kabuk.webviewSaglayicilari.get(GORUNUS_PANEL) as { resolveWebviewView(g: unknown): void };
  const gorunum = new SahteWebviewGorunusu();
  saglayici.resolveWebviewView(gorunum);
  const o: Ortam = { yol, tren, makinist, graf, panel, gorunum, baglam, durum, makinistKaynaklari: kaynaklar, kutuCagrilari };
  ortamlar.push(o);
  return o;
}

beforeEach(() => kabukSifirla());
afterEach(() => { for (const o of ortamlar.splice(0)) for (const d of o.baglam.subscriptions) d.dispose(); sahte.workspace.getConfiguration = acikAyar; });

const acikAyar = sahte.workspace.getConfiguration;
function miniGrafAyari(acik: boolean): void {
  sahte.workspace.getConfiguration = (() => ({ get: <T>(ad: string, v?: T) => (ad === "miniGraf" ? (acik as T) : v), has: () => false, inspect: () => undefined, update: async () => {} })) as never;
}

const otur = (): Promise<void> => new Promise((r) => setImmediate(r));
const bekle = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const satirSayisi = (html: string): number => (html.match(/class="sat"/g) ?? []).length;
const mesajlar = (o: Ortam, tip: string): Array<Record<string, unknown>> =>
  o.gorunum.gonderilen.filter((m) => (m as { tip?: string }).tip === tip) as Array<Record<string, unknown>>;
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

test("Ray seçiliyken yalnız Ray çizilir: şerit, YOL HARİTASI başlığı, kapalı varsayılanlı ağaç, Mini Graf; Tren ve Makinist çizilmez", () => {
  const o = ortamKur();
  const h = o.gorunum.webview.html;
  assert.equal((h.match(/role="tab"/g) ?? []).length, 3);
  assert.ok(h.includes('data-sekme="ray" aria-selected="true"'));
  assert.ok(h.includes("YOL HARİTASI") && h.includes('id="agac"'));
  assert.ok(h.includes('<template id="graf-sablon">') && h.includes("MİNİ GRAF"), "Mini Graf Ray sekmesinde çizilmeli");
  assert.ok(!h.includes('id="tren-agac"') && !h.includes('id="makinist-agac"'), "seçili olmayan sekme çizilmiş");
  assert.equal(o.panel.olcumler().satirSayisi, satirSayisi(h), "ölçülen satır sayısı DOM'a basılan satırlarla aynı değil");
  assert.ok(h.includes("Sarmal"), "çalışma alanı satırı yok");
  assert.ok(!/Bölümler/.test(h), "'Bölümler' üretilmiş");
});

test("Tren seçiliyken yalnız Tren çizilir (ajanlar, geliştirmedeki Adımlar); Makinist seçiliyken yalnız dört açılır grup ve sayıları", async () => {
  const t = ortamKur("tren");
  const ht = t.gorunum.webview.html;
  assert.ok(ht.includes('data-sekme="tren" aria-selected="true"') && ht.includes('id="tren-agac"'));
  assert.ok(!ht.includes('id="agac"') && !ht.includes("YOL HARİTASI") && !ht.includes('<template id="graf-sablon">'), "Ray içeriği Tren sekmesinde çizilmiş");
  assert.ok(ht.includes("Ajanlar") && ht.includes("Geliştirmedeki Adımlar"), "Tren özeti çizilmemiş");
  const m = ortamKur("makinist");
  const hm = m.gorunum.webview.html;
  assert.ok(hm.includes('data-sekme="makinist" aria-selected="true"') && hm.includes('id="makinist-agac"'));
  for (const ad of ["Onaylar", "Hatırlatıcılar", "Gözlemler", "Fikirler"]) assert.ok(hm.includes(`>${ad}<`), `${ad} grubu yok`);
  assert.equal(satirSayisi(hm), 4, "Makinist kapalı varsayılanla dört grup satırıdır");
  // Sayı üst düğümün yanında, kaynağın kendi sayacından.
  assert.ok(/Onaylar<\/span><span class="ac">2</.test(hm) && /Hatırlatıcılar<\/span><span class="ac">1</.test(hm) && /Fikirler<\/span><span class="ac">1</.test(hm));
  assert.ok(/class="rozet">3</.test(hm), "rozet onaylar + hatırlatıcılar toplamını göstermeli");
  await otur();
});

test("sekme iletisi: doğru bölüm bir 'bolum' iletisiyle gelir, seçim workspaceState'e yazılır ve bağlam güncellenir", async () => {
  const o = ortamKur();
  o.gorunum.mesajGonder({ tip: "sekme", ad: "tren" });
  await otur();
  const b = mesajlar(o, "bolum").at(-1)!;
  assert.equal(b.sekme, "tren");
  assert.ok(String(b.html).includes('id="tren-agac"') && !String(b.html).includes('id="agac"'));
  assert.equal(o.durum.get("sarmal.panel.sekme"), "tren", "seçim kalıcı değil");
  assert.deepEqual(kabuk.komutCagrilari.filter((c) => c.komut === "setContext" && c.argumanlar[0] === BAGLAM_SEKME).at(-1)?.argumanlar, [BAGLAM_SEKME, "tren"]);
  o.gorunum.mesajGonder({ tip: "sekme", ad: "makinist" });
  await otur();
  assert.equal(mesajlar(o, "bolum").at(-1)!.sekme, "makinist");
  const sayi = mesajlar(o, "bolum").length;
  o.gorunum.mesajGonder({ tip: "sekme", ad: "graf" });     // bilinmeyen sekme
  o.gorunum.mesajGonder({ tip: "sekme", ad: 3 });
  await otur();
  assert.equal(mesajlar(o, "bolum").length, sayi, "bilinmeyen sekme seçimi değiştirmiş");
  assert.equal(o.durum.get("sarmal.panel.sekme"), "makinist");
});

test("kalıcılık: yeniden kurulan panel son seçili sekmeyle açılır; bozuk kalıcı değer Ray'e düşer", () => {
  assert.ok(ortamKur("makinist").gorunum.webview.html.includes('data-sekme="makinist" aria-selected="true"'));
  assert.ok(ortamKur("tren").gorunum.webview.html.includes('data-sekme="tren" aria-selected="true"'));
  assert.ok(ortamKur("silinmis-sekme").gorunum.webview.html.includes('data-sekme="ray" aria-selected="true"'));
});

// ── ③ AÇIK / KAPALI DÜĞÜM ───────────────────────────────────────────────────

test("açık düğümde doğru satır sayısı: 'gec' iletisi yalnız o düğümün çocuklarını ekler, kapatınca geri alır ve tercih kalıcıdır", async () => {
  const o = ortamKur();
  const once = satirSayisi(o.gorunum.webview.html);
  const hedef = kapaliSatirlar(o.gorunum.webview.html).find((id) => id.split("/").length >= 3)!;
  assert.ok(hedef, "açılacak kapalı düğüm yok");
  o.gorunum.mesajGonder({ tip: "gec", id: hedef, ac: true });
  await otur();
  const acik = mesajlar(o, "parca").at(-1)!;
  assert.equal(acik.kimlik, "agac");
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
  o.gorunum.mesajGonder({ tip: "komut", href: bag("workbench.action.reloadWindow") });
  o.gorunum.mesajGonder({ tip: "komut", href: bag("sarmal.dosyaAc", [1, 2]) });
  o.gorunum.mesajGonder({ tip: "komut", href: "https://example.com" });
  o.gorunum.mesajGonder({ tip: "komut", href: 5 });
  await otur();
  assert.equal(kabuk.komutCagrilari.slice(once).length, 2, "izinsiz ya da bozuk bağ komut çalıştırmış");
});

// ── ⑥ VERİ DEĞİŞİNCE YALNIZ İLGİLİ PARÇA ───────────────────────────────────

test("Makinist verisi değişince yalnız Makinist parçası yeniden çizilir; Ray sekmesindeyken Makinist değişimi hiçbir parça göndermez ama rozeti günceller", async () => {
  const o = ortamKur("makinist");
  const k = o.makinistKaynaklari;
  k.fikirler!.satirlar.push({ ad: "Fikir 2", baglam: "sarmalFikir" });
  (k.fikirler as { kayitSayisi: number }).kayitSayisi = 2;
  k.fikirler!.olay.fire(undefined);
  await bekle(250);
  const p = mesajlar(o, "parca");
  assert.equal(p.length, 1, "tek değişim tek parça üretmeli");
  assert.equal(p[0]!.kimlik, "makinist-agac");
  assert.ok(/Fikirler<\/span><span class="ac">2</.test(String(p[0]!.html)), "sayı kaynağın yeni sayacını göstermeli");
  assert.equal(mesajlar(o, "bolum").length, 0);
  assert.equal(mesajlar(o, "rozet").at(-1)!.sayi, 3, "rozet onaylar + hatırlatıcılar toplamı");
  // Ray sekmesindeyken: parça yok, rozet var.
  const r = ortamKur("ray");
  r.makinistKaynaklari.hatirlaticilar!.olay.fire(undefined);
  await bekle(250);
  assert.equal(mesajlar(r, "parca").length, 0, "görünmeyen sekme için parça çizilmiş");
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

test("görünmeyen panel hiçbir şey çizmez; yeniden görününce seçili sekme baştan çizilir", async () => {
  const o = ortamKur("makinist");
  o.gorunum.visible = false;
  o.makinistKaynaklari.fikirler!.olay.fire(undefined);
  await bekle(250);
  assert.equal(o.gorunum.gonderilen.filter((m) => ["parca", "bolum", "satir"].includes((m as { tip: string }).tip)).length, 0, "görünmeyen panel için çizim yapılmış");
  o.gorunum.visible = true;
  (o.gorunum as unknown as { gorunurluk: { fire(): void } }).gorunurluk.fire();
  await otur();
  assert.equal(mesajlar(o, "bolum").length, 1, "yeniden görününce bölüm baştan gönderilmeli");
  assert.equal(mesajlar(o, "bolum")[0]!.sekme, "makinist");
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
  // Sekme değişip Ray'e dönülünce bölüm katlı gelir.
  o.gorunum.mesajGonder({ tip: "sekme", ad: "tren" });
  o.gorunum.mesajGonder({ tip: "sekme", ad: "ray" });
  await otur();
  const son = mesajlar(o, "bolum").at(-1)!;
  assert.equal(son.sekme, "ray");
  assert.match(String(son.html), /data-bolum="graf" aria-expanded="false"/);
  assert.match(String(son.html), /<div id="bolum-graf" class="bolum" hidden>/);
  assert.match(String(son.html), /data-bolum="agac" aria-expanded="true"/);
  // Yeniden kurulum (pencere yeniden yükleme): kalıcı tercih ilk belgede uygulanır.
  const yeni = ortamKur("ray", { "bolum:graf": false });
  assert.match(yeni.gorunum.webview.html, /data-bolum="graf" aria-expanded="false"/);
});

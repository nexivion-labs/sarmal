// ═══════════════════════════════════════════════════════════════════════════
// gorsel-kontrol-uret.ts — Sarmal panelinin GERÇEK HTML'ini üretir (görsel kontrol)
//
//   arac/gorsel-kontrol.mjs bu dosyayı esbuild ile paketler (`vscode` → sinama/vscode-sahtesi.ts)
//   ve ayrı bir süreçte koşturur. Verilen proje kökündeki bütün .sar dosyaları okunur,
//   eklentinin kendi sağlayıcıları (Yol Haritası, Mini Graf, Tren, Makinist) kurulur ve
//   panelin `resolveWebviewView` ile ürettiği belge her değişke için diske yazılır.
//   Makinist kaynakları yerine yansız örnek satırlar kullanılır; geri kalan her şey gerçektir.
//
//   Argümanlar: <proje_dizini> <cikti_dizini> <secili_kod|-> <acik_kademe> <dil>
//   Çıktı: <cikti_dizini>/<ad>.html dosyaları ve stdout'a JSON değişke listesi.
// ═══════════════════════════════════════════════════════════════════════════

import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as vs from "vscode";
import { ayristir } from "../../cekirdek/src/ayristirici.ts";
import { belirtecle } from "../../cekirdek/src/belirtec.ts";
import { mevsimNormalize } from "../../cekirdek/src/denetci.ts";
import { kabuk, Uri, TreeItem, TreeItemCollapsibleState, EventEmitter, extensions, commands, SahteWebviewGorunusu } from "../sinama/vscode-sahtesi.ts";
import { YolHaritasi } from "../src/yolharitasi.ts";
import { MiniGrafGorunumu } from "../src/minigraf.ts";
import { projeGrafiCikar } from "../src/minigraf-cekirdek.ts";
import { Tren } from "../src/tren.ts";
import { MakinistAgaci } from "../src/makinist.ts";
import { panelKaydi } from "../src/panel.ts";
import type { SekmeKimligi } from "../src/panel-cekirdek.ts";
import { satirIkonu } from "../src/ortak.ts";
import { yuzeyDiliniAyarla } from "../src/yuzey-metinleri.ts";
import { erisimSiniri } from "../src/tur-belgesi.ts";
import { tulRengi } from "../src/tul-rengi.ts";
import { CIZGI_ALFA } from "../src/panel-betik.ts";

const [PROJE, CIKTI, SECILI_ARG = "-", ACIK_ARG = "3", DIL = "tr"] = process.argv.slice(2);
if (!PROJE || !CIKTI) { console.error("kullanım: <proje_dizini> <cikti_dizini> [secili_kod|-] [acik_kademe] [tr|en]"); process.exit(2); }
yuzeyDiliniAyarla(DIL === "en" ? "en" : "tr");
const EKLENTI = join(dirname(fileURLToPath(import.meta.url)), "..");
mkdirSync(CIKTI, { recursive: true });

// ── Proje okuma ─────────────────────────────────────────────────────────────
function topla(dir: string, out: string[]): void {
  for (const ad of readdirSync(dir)) {
    if (ad.startsWith(".") || ad === "node_modules" || ad === "dist" || ad === "dist-sinama") continue;
    const yol = join(dir, ad);
    const st = statSync(yol);
    if (st.isDirectory()) topla(yol, out);
    else if (ad.endsWith(".sar")) out.push(yol);
  }
}
const hamYollar: string[] = [];
topla(PROJE, hamYollar);
// Dosya evreni eklentinin denetim turuyla AYNI işlevden gelir (eklenti.ts: `erisimSiniri` · `sarKapsamDisi`):
// öğreti kitaplığının ders rafları, sınama fikstürü ve mühürlü dosyalar gerçek panelde olduğu gibi burada da yoktur.
const yollar = erisimSiniri(hamYollar, [PROJE]);
const programlar = new Map<string, ReturnType<typeof ayristir>>();
const kirik: string[] = [];
for (const y of yollar) { try { programlar.set(y, ayristir(belirtecle(readFileSync(y, "utf8")))); } catch { kirik.push(y); } }
mevsimNormalize(programlar as never);
const goruntu = { programlar, yollar, kirik, okunamayan: 0, dilDışı: [], tetik: "gorsel-kontrol", kapsam: undefined, sıra: 1 };

const koku = Uri.file(EKLENTI);
const yol = new YolHaritasi();
yol.eklentiKoku = koku as never;
yol.yenile(goruntu as never);
const tren = new Tren();
tren.eklentiKoku = koku as never;
tren.goruntudenYerlestir(goruntu as never);

// ── Makinist: yansız örnek satırlar (gerçek onay/hatırlatıcı verisi okunmaz) ──
function ornek(n: number, ikon: string, anlam: string, etiketler: [string, string][]) {
  const ev = new EventEmitter<unknown>();
  return {
    kayitSayisi: n, onDidChangeTreeData: ev.event,
    getChildren: () => etiketler.map(([e, a]) => ({ e, a })),
    getTreeItem: (o: { e: string; a: string }) => {
      const t = new TreeItem(o.e, TreeItemCollapsibleState.None);
      t.description = o.a;
      t.iconPath = satirIkonu(koku as never, ikon as never, anlam as never);
      t.command = { command: "x" } as never;
      return t;
    },
  };
}
const makinist = new MakinistAgaci({
  onaylar: ornek(2, "kapi", "uyari", [["ORNEK-A01", "ornek.sar"], ["ORNEK-A02", "ornek.sar"]]),
  hatirlaticilar: ornek(1, "yerimi", "uyari", [["Örnek hatırlatıcı", "ORNEK-FAZ"]]),
  gozlemler: ornek(0, "kutu", "bilgi", []),
  fikirler: ornek(1, "fikir", "bilgi", [["Örnek fikir", "ORNEK-FKR"]]),
} as never, koku as never);

// ── Kabuk ayarları: görünüm ve açık kademe değişke başına değişir ─────────────
let gorunumAyari = "agac";
(extensions as Record<string, unknown>).onDidChange = new EventEmitter<unknown>().event;
(commands as Record<string, unknown>).getCommands = async () => [];
(vs.workspace as Record<string, unknown>).getConfiguration = () => ({
  get: (k: string, v: unknown) => (k === "miniGrafGorunum" ? gorunumAyari : v),
  update: async () => undefined,
});

// Seçili düğüm verilmediyse en çok bağı olan düğüm seçilir (belirlenimci).
function seciliBul(): string {
  if (SECILI_ARG && SECILI_ARG !== "-") return SECILI_ARG;
  const dag = yol.dagAl();
  if (!dag) return "";
  const g = projeGrafiCikar(dag, "", () => true, () => true);
  const derece = new Map<string, number>();
  for (const b of g.baglar) for (const k of [b.once, b.sonra]) derece.set(k, (derece.get(k) ?? 0) + 1);
  return [...derece].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? "";
}
const SECILI = seciliBul();
const ACIK = Number(ACIK_ARG) || 0;

interface Degiske { ad: string; sekme: SekmeKimligi; gorunum?: string; secili?: string; secici?: boolean; acik?: number }

function uret(d: Degiske): string {
  gorunumAyari = d.gorunum ?? "agac";
  const graf = new MiniGrafGorunumu(() => yol.dagAl());
  if (d.secili) graf.dugumSec(d.secili);
  if (d.secici) graf.seciciDegistir();
  const ctx = {
    subscriptions: [] as unknown[], extensionUri: koku, extensionPath: EKLENTI, extensionMode: 1,
    workspaceState: { get: () => undefined, update: async () => undefined },
  };
  const yuz = { saglayici: yol, miniGraf: graf, panelBagla() { /* görünürlük ölçümü yok */ }, diliTazele() { /* yok */ }, kodlar: () => [], gorunurMu: () => true };
  const panel = panelKaydi(ctx as never, { yol: yuz as never, tren, makinist });
  // Panel her açılışta Ray'le başlar (PNL-A03); değişkenin sekmesi kullanıcının seçimi gibi verilir.
  // Seçim eşzamanlı yazılır; belge aşağıda görünüm çözülünce bu sekmeyle üretilir.
  void panel.sekmeSec(d.sekme);
  // Ray ağacı: kök altında `acik` kademeye kadar her düğüm açık (girinti kılavuzları ölçülebilsin).
  if (d.acik) {
    const derinlik = d.acik;
    (panel as unknown as { acik: unknown }).acik = new Proxy({}, {
      has: (_t, k) => !String(k).includes("#") && String(k).split("/").length <= derinlik + 1,
      get: () => true,
    });
  }
  const saglayici = kabuk.webviewSaglayicilari.get("sarmalPanel") as { resolveWebviewView(g: unknown): void };
  const gorunum = new SahteWebviewGorunusu();
  saglayici.resolveWebviewView(gorunum);
  for (const s of ctx.subscriptions) (s as { dispose?: () => void }).dispose?.();
  return gorunum.webview.html;
}

const degiskeler: Degiske[] = [
  { ad: "ray", sekme: "ray", acik: ACIK },
  // Tren ve Makinist de açık üretilir: girinti çizgisi ve fare vurgusu üç ağaçta ölçülür (PNL-A04).
  { ad: "tren", sekme: "tren", acik: ACIK },
  { ad: "makinist", sekme: "makinist", acik: ACIK },
  { ad: "gozlemler", sekme: "gozlemler" },
  { ad: "ayarlar", sekme: "ayarlar" },
  { ad: "graf-secici", sekme: "ray", secici: true },
];
for (const g of ["klasik", "agac", "ilerleme"]) {
  degiskeler.push({ ad: `graf-${g}-secimsiz`, sekme: "ray", gorunum: g });
  if (SECILI) degiskeler.push({ ad: `graf-${g}-secili`, sekme: "ray", gorunum: g, secili: SECILI });
}
const liste = degiskeler.map((d) => {
  const html = uret(d);
  writeFileSync(join(CIKTI, `${d.ad}.html`), html);
  return { ...d, bayt: html.length };
});
// Görsel kontrol koyu temada koşar; beklenen çizgi ve vurgu renkleri tül kaynağından verilir (PNL-A04).
const tul = { cizgi: tulRengi("koyu", CIZGI_ALFA), vurgu: tulRengi("koyu", 1) };
process.stdout.write(JSON.stringify({ secili: SECILI, kirik: kirik.length, sar: yollar.length, tul, degiskeler: liste }));
process.exit(0);

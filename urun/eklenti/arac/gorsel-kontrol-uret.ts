// ═══════════════════════════════════════════════════════════════════════════
// gorsel-kontrol-uret.ts — Sarmal panelinin GERÇEK HTML'ini üretir (görsel kontrol)
//
//   arac/gorsel-kontrol.mjs bu dosyayı esbuild ile paketler (`vscode` → sinama/vscode-sahtesi.ts)
//   ve ayrı bir süreçte koşturur. Verilen proje kökündeki bütün .sar dosyaları okunur,
//   eklentinin kendi sağlayıcıları (Yol Haritası, Mini Graf, Tren, Makinist, Sinyaller) kurulur ve
//   panelin `resolveWebviewView` ile ürettiği belge her değişke için diske yazılır.
//   Makinist kaynakları yerine yansız örnek satırlar kullanılır; geri kalan her şey gerçektir.
//   Sinyaller sekmesi motorun projedeki GERÇEK tek-dosya tanılarını gösterir (PNL-A09): tanılar
//   doğrulayıcıdan, Proje kimliği Yol Haritasının kuralından, kanon maddesi sicil ile kanonun
//   `tanı:` kenarlarından gelir. Ayrı Gözlemler bölümü yoktur; Hatırlatıcılar yüzeyine yönlenen
//   tanılar Sinyaller'e girmez (YUZ-3.3). Bildirimler sağlayıcısı yalnız durum çubuğundaki
//   Gözlemler sayacının kaynağı olarak kurulur ve sayısı Bilgi bandıyla karşılaştırılır.
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
import { makinistKaydi } from "../src/makinist.ts";
import { OnayPaneli } from "../src/onay-paneli.ts";
import { onayKapilariTopla } from "../src/onay-cekirdek.ts";
import { panelKaydi } from "../src/panel.ts";
import type { SekmeKimligi } from "../src/panel-cekirdek.ts";
import { satirIkonu, GOMULU_SNF } from "../src/ortak.ts";
import { yuzeyDiliniAyarla } from "../src/yuzey-metinleri.ts";
import { erisimSiniri } from "../src/tur-belgesi.ts";
import { dogrula } from "../../cekirdek/src/dogrulayici.ts";
import { siniflamaYukle } from "../../cekirdek/src/siniflama.ts";
import { existsSync } from "node:fs";
import { projeKimligi } from "../src/yolharitasi.ts";
import { SinyallerAgaci } from "../src/sinyaller.ts";
import { ILERI_BAGLAM_KIMLIKLERI } from "../../cekirdek/src/denetim.ts";
import { bildirimlerKaydi } from "../src/bildirimler.ts";
import { kaydinYuzeyi, yuzeyeAyir, type YuzeyKaydi } from "../src/yuzey-cekirdek.ts";
import { turGoruntusunuYayinla } from "../src/tur-goruntusu.ts";
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
// Onaylar gerçek onay defterinden gelir (PNL-A07): kapı satırları ve karar kademesi üründeki yoldan çizilir.
// Kapılar yansız bir örnek plandan ayrıştırılır; gerçek onay verisi okunmaz.
const ONAY_DOSYASI = join(PROJE, "is", "plan", "ornek.sar");
const ONAY_ORNEGI =
  `Faz( kod: ORNEK-FAZ, ad: "örnek dönem" ) {\n  Blok( kod: ORNEK-BLK, ad: "örnek iş" ) {\n    Katman( kod: ORNEK-KAT, ad: "örnek katman" ) {\n` +
  // PNL-A08: kararı bugün verilebilecek iki kapı (Onaylar) ve Adımı beklemede olan bir kapı (İleride onay isteyecek).
  [["ORNEK-A01", "geliştirmede"], ["ORNEK-A02", "doğrulanmamış"], ["ORNEK-A03", "beklemede"]].map(([k, durum]) => `      Adım( kod: ${k}, onayBekler: founder, durum: ${durum}, ne: "${k} örnek karar", ` +
    `kabul: [ "Tasarım Founder tarafından onaylanmıştır — onaysız uygulanmaz" ] )\n`).join("") + `    }\n  }\n}\n`;
const onayDefteri = new OnayPaneli();
onayDefteri.simgeKaynaginiBagla(koku as never);
onayDefteri.yerlestirHepsi(onayKapilariTopla(ayristir(belirtecle(ONAY_ORNEGI)).bildirimler).map((kapi) => ({ dosya: ONAY_DOSYASI, kapi })));
const makinist = makinistKaydi({ subscriptions: [], extensionUri: koku } as never, {
  onayPaneli: onayDefteri,
  hatirlaticilar: ornek(1, "yerimi", "uyari", [["Örnek hatırlatıcı", "ORNEK-FAZ"]]) as never,
  fikirler: ornek(1, "fikir", "bilgi", [["Örnek fikir", "ORNEK-FKR"]]) as never,
});

// ── Sinyaller (PNL-A09): projenin gerçek tek-dosya tanıları ─────────────────
// Kanon maddesi haritası son tur görüntüsünden kurulur; görüntü burada da yayınlanır.
turGoruntusunuYayinla({ programlar, yollar, belgeler: new Map(), dilDışı: [], tetik: "gorsel-kontrol", kapsam: undefined } as never);
const kayitYolu = join(PROJE, "oz", "siniflama", "kayit.json");
// Projenin kendi tip kaydı yoksa eklentinin gömülü kaydına düşülür (eklentinin kendi davranışı).
const snf = existsSync(kayitYolu) ? siniflamaYukle(kayitYolu) : GOMULU_SNF;
const sinyalKayitlari: YuzeyKaydi[] = [];
for (const [dosya, program] of programlar) {
  for (const t of dogrula(program as never, snf, dosya, readFileSync(dosya, "utf8"))) sinyalKayitlari.push({ proje: projeKimligi(dosya), dosya, tani: t });
}
// Durum çubuğundaki Gözlemler sayacının kaynağı (eklenti.ts: `gözlem: () => bildirimler.kayitSayisi`).
const gozlemler = bildirimlerKaydi({ subscriptions: [], extensionUri: koku, extension: { packageJSON: {} } } as never);
gozlemler.yerlestir(yuzeyeAyir(sinyalKayitlari).bildirimler);
const sinyaller = new SinyallerAgaci(koku as never);
const odakProje = projeKimligi(join(PROJE, "_")).kod;
sinyaller.yerlestir(sinyalKayitlari, odakProje);
// PNL-A28 nöbetinin beklenen değeri ağaçtan değil, kayıtlardan sayılır: her bant ve proje için tür başına kayıt sayısı.
// Hatırlatıcılar yüzeyine yönlenen kayıt Sinyaller'e girmez (yönlendirme motorun kararıdır).
const BANT_ADI: Readonly<Record<string, string>> = { hata: "dur", uyarı: "dikkat", bilgi: "bilgi" };
const turBeklenen: Record<string, Record<string, number>> = {};
for (const k of sinyalKayitlari) {
  if (kaydinYuzeyi(k) === "hatırlatıcılar") continue;
  const turler = (turBeklenen[`sinyaller/bant.${BANT_ADI[k.tani.duzey]}/proje.${k.proje.kod}`] ??= {});
  turler[k.tani.kod] = (turler[k.tani.kod] ?? 0) + 1;
}

// ── Kabuk ayarları: görünüm, açık kademe ve sekme sırası değişke başına değişir ──
let gorunumAyari = "agac";
/** Sekme sırasının paket varsayılanı (package.json katkısı) ve değişkenin kullanıcı ayarı (PNL-A23). */
const PAKET_SIRASI: unknown = (JSON.parse(readFileSync(join(EKLENTI, "package.json"), "utf8")) as {
  contributes: { configuration: { properties: Record<string, { default?: unknown }> } };
}).contributes.configuration.properties["sarmal.sekmeSirasi"]?.default;
let siraAyari: unknown;
(extensions as Record<string, unknown>).onDidChange = new EventEmitter<unknown>().event;
(commands as Record<string, unknown>).getCommands = async () => [];
(vs.workspace as Record<string, unknown>).getConfiguration = () => ({
  get: (k: string, v: unknown) => (k === "miniGrafGorunum" ? gorunumAyari : v),
  inspect: (k: string) => (k === "sekmeSirasi" ? { key: `sarmal.${k}`, defaultValue: PAKET_SIRASI, globalValue: siraAyari } : undefined),
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

interface Degiske {
  ad: string; sekme: SekmeKimligi; gorunum?: string; secili?: string; secici?: boolean; acik?: number; onayAcik?: string;
  /** Kullanıcının sekme sırası ayarı (PNL-A23); verilirse panel seçtirilmeden açılır ve sıranın ilk sekmesiyle başlamalıdır. */
  sira?: readonly string[];
  /**
   * PNL-A21: Ray satırındaki işarete tıklamanın eklenti tarafı üründeki yoldan koşar (webview'in gönderdiği
   * `sinyalGit` iletisi); belge eklentinin vardığı durumla (Sinyaller sekmesi, ataları açık satırlar) yeniden
   * üretilir ve eklentinin webview'e gönderdiği `sinyalSec` iletisi görsel kontrolde sayfaya verilir.
   */
  sinyalGit?: boolean;
}

/** İşaretin gösterdiği sayı: açık dal kendi tanılarını, kapalı dal alt ağacınınkileri sayar. */
type IsaretliSatir = { satir: { id: string; durum: string; sinyal?: { kendi: { dur: number; dikkat: number }; toplam: { dur: number; dikkat: number } } } };
const isaretSayisi = (u: IsaretliSatir): number => {
  const s = u.satir.durum === "acik" ? u.satir.sinyal!.kendi : u.satir.sinyal!.toplam;
  return s.dur + s.dikkat;
};

async function uret(d: Degiske): Promise<{ html: string; ek?: Record<string, unknown> }> {
  gorunumAyari = d.gorunum ?? "agac";
  siraAyari = d.sira;
  // Karar kademesi açık kapı (PNL-A07): yalnız istenen değişkede bir kapı açıktır.
  if (d.onayAcik) onayDefteri.kapiyiAc(ONAY_DOSYASI, d.onayAcik);
  else onayDefteri.kapiyiKapat();
  const graf = new MiniGrafGorunumu(() => yol.dagAl());
  if (d.secili) graf.dugumSec(d.secili);
  if (d.secici) graf.seciciDegistir();
  const ctx = {
    subscriptions: [] as unknown[], extensionUri: koku, extensionPath: EKLENTI, extensionMode: 1,
    workspaceState: { get: () => undefined, update: async () => undefined },
  };
  const yuz = { saglayici: yol, miniGraf: graf, panelBagla() { /* görünürlük ölçümü yok */ }, diliTazele() { /* yok */ }, kodlar: () => [], gorunurMu: () => true };
  const panel = panelKaydi(ctx as never, { yol: yuz as never, tren, makinist, sinyaller });
  // Panel her açılışta sıranın ilk sekmesiyle başlar (PNL-A03 · PNL-A23); değişkenin sekmesi kullanıcının
  // seçimi gibi verilir. Sıra ayarı taşıyan değişke seçtirilmez: açılış sekmesini panel kendisi bulur.
  // Seçim eşzamanlı yazılır; belge aşağıda görünüm çözülünce bu sekmeyle üretilir.
  if (!d.sira) void panel.sekmeSec(d.sekme);
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
  let html = gorunum.webview.html;
  let ek: Record<string, unknown> | undefined;
  if (d.sinyalGit) {
    const ic = panel as unknown as { sonSatirlar: { ray: IsaretliSatir[] }; tamHtml(csp: string): string; olcumler(): { sinyalSecimi: readonly string[] } };
    // Görünen ve işaret taşıyan satırlardan en az tanılısı seçilir: seçilen satırlar ekranda okunur kalır.
    const aday = ic.sonSatirlar.ray.filter((u) => u.satir.sinyal && isaretSayisi(u) > 0).sort((a, b) => isaretSayisi(a) - isaretSayisi(b))[0];
    if (aday) {
      gorunum.mesajGonder({ tip: "sinyalGit", id: aday.satir.id, acik: aday.satir.durum === "acik" });
      await new Promise((r) => setTimeout(r, 50));
      html = ic.tamHtml("gorsel-kontrol");
      // Belge eklentinin vardığı durumdadır: seçili sekme Sinyaller'dir (görsel kontrol bu sekmeyi ölçer).
      ek = { sekme: "sinyaller", sinyalSec: { tip: "sinyalSec", idler: ic.olcumler().sinyalSecimi }, isaretSatiri: aday.satir.id,
        isaretAcik: aday.satir.durum === "acik", isaretSayisi: isaretSayisi(aday) };
    }
  }
  for (const s of ctx.subscriptions) (s as { dispose?: () => void }).dispose?.();
  return { html, ek };
}

const degiskeler: Degiske[] = [
  { ad: "ray", sekme: "ray", acik: ACIK },
  // Tren ve Makinist de açık üretilir: girinti çizgisi ve fare vurgusu üç ağaçta ölçülür (PNL-A04).
  { ad: "tren", sekme: "tren", acik: ACIK },
  { ad: "makinist", sekme: "makinist", acik: ACIK },
  { ad: "makinist-onay", sekme: "makinist", acik: ACIK, onayAcik: "ORNEK-A02" },
  { ad: "sinyaller", sekme: "sinyaller" },
  // Bantlar ve projeler açık: satırların kodu, yeri, önerisi ve kanon maddesi görünür (PNL-A09).
  { ad: "sinyaller-acik", sekme: "sinyaller", acik: ACIK },
  { ad: "ayarlar", sekme: "ayarlar" },
  // Kullanıcının kurduğu sıra (PNL-A23): panel ilk sekmeyle (Sinyaller) açılır, rozetler sekmeleriyle taşınır.
  { ad: "sira-ozel", sekme: "sinyaller", sira: ["sinyaller", "makinist", "ray", "tren", "ayarlar"] },
  { ad: "graf-secici", sekme: "ray", secici: true },
  // PNL-A21: Ray'daki Dur ve Dikkat işaretine tıklama: Sinyaller sekmesi düğümün tanı satırlarını seçili gösterir.
  { ad: "sinyal-git", sekme: "ray", sinyalGit: true },
];
for (const g of ["klasik", "agac", "ilerleme"]) {
  degiskeler.push({ ad: `graf-${g}-secimsiz`, sekme: "ray", gorunum: g });
  if (SECILI) degiskeler.push({ ad: `graf-${g}-secili`, sekme: "ray", gorunum: g, secili: SECILI });
}
const liste: Array<Degiske & { bayt: number }> = [];
for (const d of degiskeler) {
  const { html, ek } = await uret(d);
  writeFileSync(join(CIKTI, `${d.ad}.html`), html);
  liste.push({ ...d, ...ek, bayt: html.length });
}
// Görsel kontrol koyu temada koşar; beklenen çizgi ve vurgu renkleri tül kaynağından verilir (PNL-A04).
const tul = { cizgi: tulRengi("koyu", CIZGI_ALFA), vurgu: tulRengi("koyu", 1) };
process.stdout.write(JSON.stringify({ secili: SECILI, kirik: kirik.length, sar: yollar.length, tul, sinyal: {
  ...sinyaller.sayilar, denetim: sinyalKayitlari.length, durumCubuguGozlem: gozlemler.kayitSayisi,
  hatirlaticiKodlari: [...ILERI_BAGLAM_KIMLIKLERI], turler: turBeklenen,
  // PNL-A25: çatının kendi satırı (yalnız o) çatı simgesini taşır; kök bir çatı değilse tanımsız.
  catiKodu: projeKimligi(join(PROJE, "_")).tip === "ÇalışmaAlanı" ? projeKimligi(join(PROJE, "_")).kod : undefined,
}, degiskeler: liste }));
process.exit(0);

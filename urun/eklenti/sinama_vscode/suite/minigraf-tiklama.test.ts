// ═══════════════════════════════════════════════════════════════════════════
// minigraf-tiklama.test.ts — 🖱️ MİNİ GRAF TIKLAMASI GERÇEK VS Code'DA (PNL-A05)
//
//   Founder 2026-10-27: "Mini Grafa tıkladığımız zaman dosyada ilgili yere
//   gidebiliyordum, bu bozulmuş." Birim süiti ve tarayıcı modeli tıklamanın panel
//   betiğine kadarki yolunu ölçer; VS Code'un webview kabuğunu (çerçeve betiği,
//   bağ işleyicisi, komut bağı izni) ve eklenti tarafını birlikte yalnız bu süit
//   görür.
//
//   ÖLÇÜMÜN SINIRI. Sınama, webview'in içindeki belgeye doğrudan ulaşamaz. Panel
//   sınama kipinde bir komut kaydeder (panel.ts SINAMA_KOMUTU); komut panelin
//   betiğine Mini Graf'ta dosyaya götüren ilk bağın içindeki yazıya bir tıklama
//   olayı göndertir. Olay gerçek webview'de, gerçek gölge kökte doğar ve gerçek
//   işleyicilerden (panelin betiği ve VS Code'un çerçeve betiği) geçer; eksik olan
//   yalnız işletim sisteminin fare isabet hesabıdır. Dosyanın açıldığı satır
//   eklentinin gerçek `sarmal.dosyaAc` yolundan ölçülür.
// ═══════════════════════════════════════════════════════════════════════════

import * as assert from "node:assert";
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";

const EKLENTI = "nexivion-labs.sarmal";
const SINAMA_KOMUTU = "sarmal.sinama.panel";

interface PanelOlcumu {
  sekme: string;
  grafCizim: number;
  grafSebepler: readonly string[];
  grafGorunum: string;
  grafIlkBag?: { dosya: string; satir: number };
  hazir: number;
  parca: number;
}
interface Kapi { panelOlcumleri(): PanelOlcumu | undefined }
interface DisYuz { bolumSinamaKapisi?: Kapi; turOlcumleri(): { tur: number } }
interface RaySatiri { id: string; kod?: string; komutlu: boolean; dosya: string; durum: string }

async function bekle(kosul: () => boolean, ne: string, sure = 20_000): Promise<void> {
  const son = Date.now() + sure;
  while (!kosul()) {
    if (Date.now() > son) throw new Error(`beklenen durum gelmedi: ${ne}`);
    await new Promise((r) => setTimeout(r, 50));
  }
}
const dur = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/**
 * Dosyanın açık editörü ve imlecin satırı. Odak panelde kaldığı için (OZK-13) etkin editöre değil
 * görünen editörlere bakılır. Uzantı sürecine önce editörün açıldığı, ardından seçimin yerleştiği
 * haber verilebilir; satır bu yüzden yerleşene kadar beklenir.
 */
async function satirdaAcik(dosya: string, satir: number, ne: string): Promise<void> {
  const editor = (): vscode.TextEditor | undefined => vscode.window.visibleTextEditors.find((e) => e.document.uri.fsPath === dosya);
  await bekle(() => editor() !== undefined, `${ne}: ${dosya} dosyası açılmadı (Founder 2026-10-27)`, 8_000);
  const beklenen = Math.max(0, satir - 1);
  try {
    await bekle(() => editor()?.selection.active.line === beklenen, "", 3_000);
  } catch {
    assert.strictEqual(editor()?.selection.active.line, beklenen, `${ne}: dosya düğümün satırında açılmadı`);
  }
}

describe("PNL-A05 — Mini Graf düğümüne tıklama dosyayı ilgili satırda açar (gerçek VS Code)", () => {
  let kapi: Kapi;
  let disYuz: DisYuz;
  const o = (): PanelOlcumu => kapi.panelOlcumleri()!;
  const ayar = (): vscode.WorkspaceConfiguration => vscode.workspace.getConfiguration("sarmal");
  let eskiGorunum: unknown;

  before(async () => {
    disYuz = (await vscode.extensions.getExtension(EKLENTI)!.activate()) as DisYuz;
    assert.ok(disYuz.bolumSinamaKapisi, "sınama kipinde nöbet kapısı verilmeliydi");
    kapi = disYuz.bolumSinamaKapisi!;
    eskiGorunum = ayar().inspect("miniGrafGorunum")?.globalValue;
    // Panel Ray sekmesinde ve görünür: Mini Graf bu sekmede çizilir.
    await vscode.commands.executeCommand("sarmal.bolum.ray");
    await bekle(() => (o()?.hazir ?? 0) > 0, "panelin betiği yüklenmedi");
  });

  after(async () => {
    await ayar().update("miniGrafGorunum", eskiGorunum, vscode.ConfigurationTarget.Global);
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
  });

  /**
   * Kabuğun iki geciktirici hattı vardır (`.sar` olayları 300, disk olayları 1500 ms). Önceki süitin
   * sildiği geçici dosyaların turu bu süitin ortasına düşer (PNL-A14 ölçümü: silme olayları süit
   * başladıktan yaklaşık bir saniye sonra geldi, disk turu ölçüm penceresine düştü). Ölçüm, tur ve
   * çizim sayaçları 2,5 saniye kıpırdamayana dek bekler (tek-agac.test.ts durgunluk deseni).
   */
  async function durgunlas(): Promise<void> {
    const imza = (): string => `${disYuz.turOlcumleri().tur}/${o().grafCizim}`;
    const bitis = Date.now() + 20_000;
    let son = imza();
    let sabitten = Date.now();
    while (Date.now() < bitis) {
      await dur(200);
      const yeni = imza();
      if (yeni !== son) { son = yeni; sabitten = Date.now(); continue; }
      if (Date.now() - sabitten >= 2_500) return;
    }
  }

  /** El ile yenileme düğmesinin TAM turunu ister ve turun koştuğunu görene dek bekler. */
  async function tamTur(ne: string): Promise<void> {
    const once = disYuz.turOlcumleri().tur;
    await vscode.commands.executeCommand("sarmal.yolHaritasiYenile");
    await bekle(() => disYuz.turOlcumleri().tur > once, `${ne}: istenen tur koşmadı`);
  }

  /** Ray ağacında aynı dosyada yaşayan iki düğüm satırı (odaktaki varlık tıklamayla değişmez). */
  async function ayniDosyadaIkiSatir(): Promise<[RaySatiri, RaySatiri]> {
    const satirlar = (await vscode.commands.executeCommand(SINAMA_KOMUTU, { eylem: "raySatirlari" })) as RaySatiri[];
    const adaylar = satirlar.filter((s) => s.kod && s.komutlu && s.dosya);
    for (const a of adaylar) {
      const b = adaylar.find((x) => x.dosya === a.dosya && x.kod !== a.kod);
      if (b) return [a, b];
    }
    throw new Error(`Ray ağacında aynı dosyada iki düğüm satırı yok: ${JSON.stringify(adaylar.slice(0, 6))}`);
  }

  for (const gorunum of ["agac", "ilerleme", "klasik"] as const) {
    it(`${gorunum} görünümünde düğüme tıklamak dosyayı düğümün satırında açar`, async () => {
      await ayar().update("miniGrafGorunum", gorunum, vscode.ConfigurationTarget.Global);
      await vscode.commands.executeCommand("sarmal.bolum.ray");
      await bekle(() => o().grafGorunum === gorunum && o().grafIlkBag !== undefined,
        `Mini Graf ${gorunum} görünümünde dosya bağıyla çizilmedi (${JSON.stringify(o())})`);
      await vscode.commands.executeCommand("workbench.action.closeAllEditors");
      await bekle(() => vscode.window.visibleTextEditors.length === 0, "editörler kapanmadı");
      const hedef = (await vscode.commands.executeCommand(SINAMA_KOMUTU, { eylem: "grafTikla" })) as PanelOlcumu["grafIlkBag"];
      assert.ok(hedef, "tıklanacak dosya bağı yok");
      await satirdaAcik(hedef!.dosya, hedef!.satir, `${gorunum}: düğüm tıklaması`);
    });
  }

  it("webview'den gelen dosya bağı iletisi eklentide sarmal.dosyaAc'ı çalıştırır ve dosyayı satırında açar (uçtan uca ileti yolu)", async () => {
    await ayar().update("miniGrafGorunum", "agac", vscode.ConfigurationTarget.Global);
    await bekle(() => o().grafGorunum === "agac" && o().grafIlkBag !== undefined, "Mini Graf ağaç görünümünde çizilmedi");
    const { dosya, satir } = o().grafIlkBag!;
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    const href = `command:sarmal.dosyaAc?${encodeURIComponent(JSON.stringify([dosya, satir]))}`;
    await vscode.commands.executeCommand(SINAMA_KOMUTU, { eylem: "ileti", ileti: { tip: "komut", href } });
    await satirdaAcik(dosya, satir, "komut iletisi");
  });

  it("Ray ağacında satıra tıklamak Mini Grafı yeniden üretmez; yalnız seçim değişir (imleç izleme dâhil)", async () => {
    await ayar().update("miniGrafGorunum", "agac", vscode.ConfigurationTarget.Global);
    await bekle(() => o().grafGorunum === "agac" && o().grafIlkBag !== undefined, "Mini Graf ağaç görünümünde çizilmedi");
    // Aynı dosyadaki iki ayrı düğüm: odaktaki varlık değişmez, dolayısıyla grafı yeniden üretecek tek sebep seçimdir.
    const [a, b] = await ayniDosyadaIkiSatir();
    await durgunlas();
    await vscode.commands.executeCommand(SINAMA_KOMUTU, { eylem: "ileti", ileti: { tip: "ac", id: a.id } });
    await dur(1_200);   // birinci tıklamanın etkisi (dosya açılışı, odak, imleç izleme) yatışır
    const once = o().grafCizim;
    await vscode.commands.executeCommand(SINAMA_KOMUTU, { eylem: "ileti", ileti: { tip: "ac", id: b.id } });
    // Pencereye bilerek bir denetim turu düşürülür (PNL-A14): turun yayını grafı değiştirmediği için
    // Mini Graf yeniden üretilmemelidir. Önceden pencereye tur yalnız rastlantıyla düşüyordu.
    await tamTur("satır tıklaması");
    await dur(1_200);   // imleç izlemenin gecikmesi (350 ms) ve panelin birleştirme gecikmesi (120 ms) geçer
    const fark = o().grafCizim - once;
    assert.strictEqual(fark, 0, `satır tıklaması ya da grafı değiştirmeyen tur Mini Grafı ${fark} kez yeniden üretti (${a.kod} → ${b.kod}; sebepler: ${o().grafSebepler.slice(-Math.max(fark, 1)).join(", ")})`);
  });

  it("denetim turu grafı değiştirdiyse Mini Graf tam bir kez yeniden üretilir; aynı grafın sonraki turları üretmez (PNL-A14)", async () => {
    await ayar().update("miniGrafGorunum", "agac", vscode.ConfigurationTarget.Global);
    await bekle(() => o().grafGorunum === "agac" && o().grafIlkBag !== undefined, "Mini Graf ağaç görünümünde çizilmedi");
    const [a] = await ayniDosyadaIkiSatir();
    await vscode.commands.executeCommand(SINAMA_KOMUTU, { eylem: "ileti", ileti: { tip: "ac", id: a.id } });
    // Geçici Faz tıklanan düğümün klasörüne yazılır: odaktaki varlığın içindedir, dolayısıyla grafa girer.
    const yol = path.join(path.dirname(a.dosya), "_pnl-a14-nobet.sar");
    const ad = "Mini Graf Nöbeti PNL-A14";
    const icerir = async (): Promise<boolean> => (await vscode.commands.executeCommand(SINAMA_KOMUTU, { eylem: "grafIcerir", metin: ad })) === true;
    try {
      await durgunlas();
      assert.strictEqual(await icerir(), false, "geçici düğüm daha yazılmadan grafta görünüyor");
      let once = { cizim: o().grafCizim, tur: disYuz.turOlcumleri().tur };
      fs.writeFileSync(yol, `Faz( kod: PNLA14-F1, ad: "${ad}" ) {\n}\n`, "utf8");
      await tamTur("dosya yazımı");
      await durgunlas();   // izleyicinin .sar ve disk turları da koşar; hepsi aynı grafı yayınlar
      let tur = disYuz.turOlcumleri().tur - once.tur;
      assert.strictEqual(o().grafCizim - once.cizim, 1, `grafa düğüm ekleyen ${tur} tur Mini Grafı tam bir kez üretmeliydi (sebepler: ${o().grafSebepler.join(", ")})`);
      assert.ok(await icerir(), "yeni çizim turun eklediği düğümü taşımıyor");
      once = { cizim: o().grafCizim, tur: disYuz.turOlcumleri().tur };
      fs.unlinkSync(yol);
      await tamTur("dosya silme");
      await durgunlas();
      tur = disYuz.turOlcumleri().tur - once.tur;
      assert.strictEqual(o().grafCizim - once.cizim, 1, `graftan düğüm silen ${tur} tur Mini Grafı tam bir kez üretmeliydi (sebepler: ${o().grafSebepler.join(", ")})`);
      assert.strictEqual(await icerir(), false, "silinen düğüm grafta asılı kaldı");
    } finally {
      try { fs.unlinkSync(yol); } catch { /* zaten silindi */ }
    }
  });
});

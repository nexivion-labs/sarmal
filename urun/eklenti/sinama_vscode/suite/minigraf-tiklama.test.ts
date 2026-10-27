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
import * as vscode from "vscode";

const EKLENTI = "nexivion-labs.sarmal";
const SINAMA_KOMUTU = "sarmal.sinama.panel";

interface PanelOlcumu {
  sekme: string;
  grafCizim: number;
  grafGorunum: string;
  grafIlkBag?: { dosya: string; satir: number };
  hazir: number;
  parca: number;
}
interface Kapi { panelOlcumleri(): PanelOlcumu | undefined }
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
  const o = (): PanelOlcumu => kapi.panelOlcumleri()!;
  const ayar = (): vscode.WorkspaceConfiguration => vscode.workspace.getConfiguration("sarmal");
  let eskiGorunum: unknown;

  before(async () => {
    const yuz = (await vscode.extensions.getExtension(EKLENTI)!.activate()) as { bolumSinamaKapisi?: Kapi };
    assert.ok(yuz.bolumSinamaKapisi, "sınama kipinde nöbet kapısı verilmeliydi");
    kapi = yuz.bolumSinamaKapisi!;
    eskiGorunum = ayar().inspect("miniGrafGorunum")?.globalValue;
    // Panel Ray sekmesinde ve görünür: Mini Graf bu sekmede çizilir.
    await vscode.commands.executeCommand("sarmal.bolum.ray");
    await bekle(() => (o()?.hazir ?? 0) > 0, "panelin betiği yüklenmedi");
  });

  after(async () => {
    await ayar().update("miniGrafGorunum", eskiGorunum, vscode.ConfigurationTarget.Global);
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
  });

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
    const satirlar = (await vscode.commands.executeCommand(SINAMA_KOMUTU, { eylem: "raySatirlari" })) as RaySatiri[];
    // Aynı dosyadaki iki ayrı düğüm: odaktaki varlık değişmez, dolayısıyla grafı yeniden üretecek tek sebep seçimdir.
    let cift: [RaySatiri, RaySatiri] | undefined;
    const adaylar = satirlar.filter((s) => s.kod && s.komutlu && s.dosya);
    for (const a of adaylar) {
      const b = adaylar.find((x) => x.dosya === a.dosya && x.kod !== a.kod);
      if (b) { cift = [a, b]; break; }
    }
    assert.ok(cift, `Ray ağacında aynı dosyada iki düğüm satırı yok: ${JSON.stringify(adaylar.slice(0, 6))}`);
    const [a, b] = cift!;
    await vscode.commands.executeCommand(SINAMA_KOMUTU, { eylem: "ileti", ileti: { tip: "ac", id: a.id } });
    await dur(1_200);   // birinci tıklamanın etkisi (dosya açılışı, odak, imleç izleme) yatışır
    const once = o().grafCizim;
    await vscode.commands.executeCommand(SINAMA_KOMUTU, { eylem: "ileti", ileti: { tip: "ac", id: b.id } });
    await dur(1_200);   // imleç izlemenin gecikmesi (350 ms) ve panelin birleştirme gecikmesi (120 ms) geçer
    assert.strictEqual(o().grafCizim - once, 0, `satır tıklaması Mini Grafı ${o().grafCizim - once} kez yeniden üretti (${a.kod} → ${b.kod})`);
  });
});

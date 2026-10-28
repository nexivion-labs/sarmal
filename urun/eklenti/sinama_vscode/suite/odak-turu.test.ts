// ═══════════════════════════════════════════════════════════════════════════
// odak-turu.test.ts — 🎯 ODAK DEĞİŞİMİNİN TUR ÖLÇÜMÜ (PNL-A26 · gerçek VS Code)
//
//   Çalışma alanındaki çatı biçimli örnek (`calisma_alani`: çatı ilanı ve dört Proje
//   kökü) kullanılır; dosyalar yalnız açılır, değiştirilmez. Açık araç projesinden site
//   projesine editörle geçilir ve ölçülür:
//     · geçişin başlattığı denetim turu sayısı (eklentinin tur sayacı),
//     · panelin yeni odağın kayıtlarını göstermesine kadar geçen süre,
//     · eklentinin geçişten sonra yeniden boşa düşmesine kadar geçen süre (tur varsa
//       onun yayınına kadar).
//   Kabul: taze projeye geçiş tur başlatmaz. Ölçüm her koşuda kanala yazılır; PNL-A26'dan
//   önceki davranışın ölçüsü raporda bu sınamanın eski davranışa döndürülmüş koşusundan gelir.
// ═══════════════════════════════════════════════════════════════════════════

import * as assert from "node:assert";
import * as path from "node:path";
import * as vscode from "vscode";

const EKLENTI = "nexivion-labs.sarmal";

interface DisYuz {
  sinyalKayitlari(): Array<{ dosya: string }>;
  turOlcumleri(): { yayın: number; tur: number };
  sonGoruntuOzeti(): { sıra: number; tetik: string; kapsam: string[] | undefined } | undefined;
}

async function bekle(kosul: () => boolean, ne: string, sure = 20_000): Promise<void> {
  const son = Date.now() + sure;
  while (!kosul()) {
    if (Date.now() > son) throw new Error(`beklenen durum gelmedi: ${ne}`);
    await new Promise((r) => setTimeout(r, 10));
  }
}

describe("PNL-A26 — odak değişimi tam tur başlatmaz (gerçek VS Code ölçümü)", () => {
  let yuz: DisYuz;
  let alan = "";

  before(async () => {
    yuz = (await vscode.extensions.getExtension(EKLENTI)!.activate()) as DisYuz;
    alan = path.join(vscode.workspace.workspaceFolders![0]!.uri.fsPath, "calisma_alani");
  });

  after(async () => {
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
  });

  it("açık araç projesinden site projesine editörle geçiş: taze projede denetim turu başlamaz, panel yeni odağı hemen gösterir", async () => {
    const arac = path.join(alan, "acik_arac", "plan", "yayin_plani.sar");
    const site = path.join(alan, "site", "plan", "anlatim_plani.sar");
    const altinda = (k: string) => (y: string) => y.startsWith(path.join(alan, k) + path.sep);
    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(arac));
    await bekle(() => yuz.sinyalKayitlari().some((k) => altinda("acik_arac")(k.dosya)), "odak açık araca geçmedi");
    // Açılış, önceki geçişler ve önceki süitlerin dosya olaylarının turları durulsun: sayaç üç saniye
    // kıpırdamayana dek beklenir (disk olay hattının geciktirmesi bir buçuk saniyedir).
    let son = yuz.turOlcumleri().tur;
    for (let sabit = 0; sabit < 30;) {
      await new Promise((r) => setTimeout(r, 100));
      const simdi = yuz.turOlcumleri().tur;
      sabit = simdi === son ? sabit + 1 : 0;
      son = simdi;
    }
    const turOnce = yuz.turOlcumleri().tur;
    const yayinOnce = yuz.turOlcumleri().yayın;
    const t0 = performance.now();
    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(site));
    await bekle(() => yuz.sinyalKayitlari().some((k) => altinda("site")(k.dosya)) && !yuz.sinyalKayitlari().some((k) => altinda("acik_arac")(k.dosya)),
      "panel yeni odağın kayıtlarını göstermedi");
    const gosterim = performance.now() - t0;
    // Geçişten sonra 1,5 sn izlenir: tur başlarsa yayınlanana (eklenti boşa düşene) dek beklenir.
    let turBitti: number | undefined;
    const tetikler: string[] = [];
    let sira = yuz.sonGoruntuOzeti()?.sıra ?? 0;
    for (;;) {
      const g = yuz.sonGoruntuOzeti();
      if (g && g.sıra !== sira) { sira = g.sıra; tetikler.push(g.tetik); }
      const o = yuz.turOlcumleri();
      if (o.yayın > yayinOnce && turBitti === undefined) turBitti = performance.now() - t0;
      const gecen = performance.now() - t0;
      if (gecen > 1500 && o.yayın - yayinOnce >= o.tur - turOnce) break;
      if (gecen > 60_000) break;
      await new Promise((r) => setTimeout(r, 10));
    }
    const turlar = yuz.turOlcumleri().tur - turOnce;
    const odakTurlari = tetikler.filter((t) => t.startsWith("odak")).length;
    console.log(`      PNL-A26 ölçüsü: odak geçişi açık araç → site · başlatılan tur ${turlar} (odak tetikli ${odakTurlari}; tetikler: ${tetikler.join(", ") || "yok"}) · `
      + `panel gösterimi ${gosterim.toFixed(0)} ms · eklentinin boşa düşmesi ${(turBitti ?? gosterim).toFixed(0)} ms`);
    assert.strictEqual(odakTurlari, 0, `taze projeye odak geçişi ${odakTurlari} denetim turu başlattı (tetikler: ${tetikler.join(", ")})`);
    assert.strictEqual(turlar, tetikler.length, "sayılan tur ile yayınlanan tur ayrıştı");
  });
});

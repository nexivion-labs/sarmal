// ═══════════════════════════════════════════════════════════════════════════
// kapsam-sayaci.test.ts — 🔢 DIŞ ROZET VE KAPSAM ADI GERÇEK VS Code'DA (PNL-A08)
//
//   Örnek çalışma alanının çatısında (ogreti/ornek/calisma_alani) ölçülür; ipucu etkin dilde yazılır (Türkçe ya da İngilizce):
//     · Dış Sarmal rozeti onay, Dur ve ateşlemiş hatırlatıcı sayılarının toplamıdır
//       ve ipucu kapsamı adıyla yazar: projenin dosyası açıkken projenin, çatının
//       dosyası açıkken çatının adı; çatıda sayı proje proje dökülür ve tutar.
//     · Beklemedeki bir Adımın kapısı onay sayacını ve dış rozeti artırmaz; Adım
//       diskte geliştirmeye geçince artırır.
// ═══════════════════════════════════════════════════════════════════════════

import * as assert from "node:assert";
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";

const EKLENTI = "nexivion-labs.sarmal";
interface Rozet { deger: number; ipucu: string; onay: number; dur: number; atesmis: number }
interface Kapi { panelOlcumleri(): { hazir: number; rozet?: Rozet } | undefined }

async function bekle(kosul: () => boolean, ne: string, sure = 20_000): Promise<void> {
  const son = Date.now() + sure;
  while (!kosul()) {
    if (Date.now() > son) throw new Error(`beklenen durum gelmedi: ${ne}`);
    await new Promise((r) => setTimeout(r, 100));
  }
}

const plan = (durum: string): string => [
  `Faz( kod: KPS-F1, ad: "Kapsam nöbeti" ) {`,
  `  Blok( kod: KPS-B1, ad: "Kapsam işi" ) {`,
  `    Katman( kod: KPS-K1, ad: "Kapsam katmanı" ) {`,
  `      Adım( kod: KPS-A01, onayBekler: founder, durum: ${durum}, ne: "Kapsam nöbetinin kapısı", kabul: [ "Tasarım Founder tarafından onaylanmıştır" ] )`,
  `    }`,
  `  }`,
  `}`,
  ``,
].join("\n");

describe("PNL-A08 — dış rozet ve sayının kapsamı (gerçek VS Code)", () => {
  let kapi: Kapi;
  let cati = "";
  let yol = "";
  const rozet = (): Rozet | undefined => kapi.panelOlcumleri()?.rozet;

  before(async () => {
    const yuz = (await vscode.extensions.getExtension(EKLENTI)!.activate()) as { bolumSinamaKapisi?: Kapi };
    assert.ok(yuz.bolumSinamaKapisi, "sınama kipinde nöbet kapısı verilmeliydi");
    kapi = yuz.bolumSinamaKapisi!;
    await vscode.commands.executeCommand("sarmal.bolum.ray");
    await bekle(() => (kapi.panelOlcumleri()?.hazir ?? 0) > 0, "panelin betiği yüklenmedi");
    cati = path.join(vscode.workspace.workspaceFolders![0]!.uri.fsPath, "calisma_alani");
    yol = path.join(cati, "site", "plan", "_pnl_a08_nobet.sar");
    fs.writeFileSync(yol, plan("beklemede"), "utf8");
  });

  after(async () => {
    try { fs.unlinkSync(yol); } catch { /* zaten silindi */ }
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
  });

  it("projenin dosyası açıkken rozet acil toplamıdır ve ipucu projenin adını yazar; beklemedeki kapı saymaz, Adım geliştirmeye geçince sayar; çatıda ipucu çatının adını ve tutan proje dökümünü yazar", async () => {
    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(path.join(cati, "site", "plan", "anlatim_plani.sar")));
    await bekle(() => /^site (projesi|project):/.test(rozet()?.ipucu ?? ""), `rozetin ipucu projenin adını yazmadı: ${rozet()?.ipucu}`);
    await new Promise((r) => setTimeout(r, 2_000));
    const once = rozet()!;
    assert.strictEqual(once.deger, once.onay + once.dur + once.atesmis, "dış rozet acil parçaların toplamı değil");
    // Beklemedeki kapı sayılmaz; Adım diskte geliştirmeye geçince onay sayacı ve rozet bir artar.
    fs.writeFileSync(yol, plan("geliştirmede"), "utf8");
    await bekle(() => (rozet()?.onay ?? 0) === once.onay + 1, `geliştirmedeki kapı onay sayacını artırmadı (${JSON.stringify(rozet())})`);
    // Dur sayısı turla birlikte değişebilir; rozet her an üç parçanın toplamıdır ve onay parçası bir artmıştır.
    const sonra = rozet()!;
    assert.strictEqual(sonra.deger, sonra.onay + sonra.dur + sonra.atesmis, `dış rozet acil parçaların toplamı değil: ${JSON.stringify(sonra)}`);
    assert.strictEqual(sonra.deger - sonra.dur - sonra.atesmis, once.deger - once.dur - once.atesmis + 1, `geliştirmedeki kapı dış rozeti artırmadı: ${JSON.stringify({ once, sonra })}`);
    fs.writeFileSync(yol, plan("beklemede"), "utf8");
    await bekle(() => rozet()?.onay === once.onay, `beklemeye dönen kapı sayaçtan düşmedi (${JSON.stringify(rozet())})`);
    // Çatının dosyası: ipucu çatının adını yazar ve proje dökümü rozetin sayısıyla tutar.
    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(path.join(cati, "calisma_alani_anadizin.sar")));
    await bekle(() => /^ornek_cati (çatısı|root):/.test(rozet()?.ipucu ?? ""), `rozetin ipucu çatının adını yazmadı: ${rozet()?.ipucu}`);
    const r = rozet()!;
    const dokum = [...r.ipucu.matchAll(/^ {2}(.+): (\d+)$/gm)].reduce((t, m) => t + Number(m[2]), 0);
    assert.strictEqual(dokum, r.deger, `çatı rozetinin proje dökümü sayıyla tutmuyor: ${r.ipucu}`);
  });
});

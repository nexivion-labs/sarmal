// ═══════════════════════════════════════════════════════════════════════════
// davranis-nobeti.test.ts — 🛡️ EN BÜYÜK ÜÇ YÜZEY DOSYASININ CANLI DAVRANIŞI
//                            (BKM-DNT-A09)
//
//   Birim süiti bu üç dosyayı artık kabuk sahtesiyle yükler (`sinama/
//   kabuk-davranis.test.ts`); sahte kabuk ise gerçek kabuğun olay sırasını,
//   dosya izleyicisini ve görünüş yaşam döngüsünü taklit etmez. Bu dosya her
//   biri için EN AZ BİR senaryoyu gerçek editör kabuğunda koşar:
//
//     · Yol Haritası (`yolharitasi.ts`): diske düşen bir plan Adımı panelin
//       gösterdiği kodlara girer, dosya silinince çıkar.
//     · Onay kuyruğu (`onay-kuyrugu.ts`): karar komutu komut sınırında boş
//       gerekçeyi reddeder ve diske dokunmaz; geçerli gerekçe tek satır yazar.
//     · Onaylar paneli (`onay-paneli.ts`): kapı panelin defterine girer ve
//       karardan sonra defterden düşer.
//
//   Ölçüm eklentinin dış yüzündeki salt okur kapılardan yapılır; kaynak bu
//   dosyaya ayrıca içeri alınsaydı ikinci bir modül örneği okunurdu.
// ═══════════════════════════════════════════════════════════════════════════

import * as assert from "node:assert";
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";

const EKLENTI = "nexivion-labs.sarmal";

interface DisYuz {
  onayKapilari(): { dosya: string; kod: string }[];
  yolHaritasiKodlari(): string[];
}

const gecicilerSil: string[] = [];

function geciciSar(ad: string, icerik: string): string {
  const kok = vscode.workspace.workspaceFolders![0].uri.fsPath;
  const tam = path.join(kok, ad);
  fs.writeFileSync(tam, icerik, "utf8");
  gecicilerSil.push(tam);
  return tam;
}

async function bekle(kosul: () => boolean, msSon = 15_000): Promise<boolean> {
  const bitis = Date.now() + msSon;
  while (Date.now() < bitis) {
    if (kosul()) return true;
    await new Promise((r) => setTimeout(r, 200));
  }
  return kosul();
}

async function yuz(): Promise<DisYuz> {
  const ext = vscode.extensions.getExtension(EKLENTI);
  assert.ok(ext, `${EKLENTI} bulunamadı`);
  const d = (await ext!.activate()) as DisYuz;
  assert.ok(typeof d?.onayKapilari === "function" && typeof d?.yolHaritasiKodlari === "function",
    "eklenti dış yüzü ölçüm kapılarını vermiyor; nöbet hiçbir şey ölçemez");
  return d;
}

const ONAYLI = `"Tasarım Founder tarafından onaylanmıştır — onaysız uygulanmaz"`;
const kaynak = (kod: string, ekAlan = ""): string =>
  `Faz( kod: DVN-F1, ad: "Davranış Nöbeti Dönemi" ) {\n` +
  `  Blok( kod: DVN-B1, ad: "Davranış Nöbeti İşi" ) {\n` +
  `    Katman( kod: DVN-KT1, ad: "Davranış Nöbeti Teknolojisi" ) {\n` +
  `      Adım( kod: ${kod}, durum: beklemede, onayBekler: founder${ekAlan}, ne: "🧪 canlı davranış nöbeti",\n` +
  `        kabul: [ ${ONAYLI} ] )\n` +
  `    }\n` +
  `  }\n` +
  `}\n`;

describe("Davranış nöbeti — en büyük üç yüzey dosyası gerçek kabukta (BKM-DNT-A09)", () => {
  after(() => {
    for (const y of gecicilerSil) try { fs.unlinkSync(y); } catch { /* zaten yok */ }
  });

  it("YOL HARİTASI: diske düşen Adım panelin kodlarına girer, dosya silinince çıkar", async () => {
    const y = await yuz();
    const yol = geciciSar("_dvn-yol.sar", kaynak("DVN-YOL-A01"));
    await vscode.commands.executeCommand("sarmal.yolHaritasiYenile");
    assert.ok(await bekle(() => y.yolHaritasiKodlari().includes("DVN-YOL-A01")),
      "diske yazılan Adım Yol Haritası paneline ulaşmadı");
    assert.ok(y.yolHaritasiKodlari().includes("DVN-B1"),
      "Adım panelde ama kapsayıcı Blok yok; ağaç kademesiz kurulmuş");
    fs.unlinkSync(yol);
    await vscode.commands.executeCommand("sarmal.yolHaritasiYenile");
    assert.ok(await bekle(() => !y.yolHaritasiKodlari().includes("DVN-YOL-A01")),
      "silinen dosyanın Adımı Yol Haritası panelinde asılı kaldı");
  });

  it("ONAY KUYRUĞU: karar komutu boş gerekçeyi sınırda reddeder, geçerli gerekçe TEK satır yazar", async () => {
    await yuz();
    const metin = kaynak("DVN-ONAY-A01");
    const yol = geciciSar("_dvn-kuyruk.sar", metin);
    // Komutun imzası: dosya · satır · kod · damga · gerekçe ister mi · gerekçe.
    const karar = (not: string | undefined) => vscode.commands.executeCommand<{ tur: string } | undefined>(
      "sarmal.onayKararVer", yol, 3, "DVN-ONAY-A01", "reddedildi", true, not);
    for (const not of ["", "   ", undefined]) {
      assert.strictEqual(await karar(not), undefined, `${JSON.stringify(not)} gerekçeli ret bir sonuç üretti`);
      assert.strictEqual(fs.readFileSync(yol, "utf8"), metin, `${JSON.stringify(not)} gerekçeli ret diske dokundu`);
    }
    const sonuc = await karar("canlı nöbet gerekçesi");
    assert.strictEqual(sonuc?.tur, "başarı", `geçerli gerekçe kanıtlanamadı: ${JSON.stringify(sonuc)}`);
    const once = metin.split("\n");
    const sonra = fs.readFileSync(yol, "utf8").split("\n");
    const degisen = sonra.filter((s, i) => s !== once[i]).length + Math.abs(once.length - sonra.length);
    assert.strictEqual(degisen, 1, `karar ${degisen} satır değiştirdi; tek satır beklenirdi`);
    assert.ok(sonra.join("\n").includes("canlı nöbet gerekçesi"), "gerekçe kayda geçmedi");
  });

  it("ONAYLAR PANELİ: kapı panelin defterine girer ve karardan sonra defterden düşer", async () => {
    const y = await yuz();
    const yol = geciciSar("_dvn-panel.sar", kaynak("DVN-PANEL-A01"));
    const panelde = (): boolean => y.onayKapilari().some((k) => k.kod === "DVN-PANEL-A01" && k.dosya === yol);
    // Kullanıcı dosyayı editörde açar: etkin editör olayı belgenin kapılarını
    // panele yerleştiren yoldur (onay-kuyrugu.ts · tazele → yerlestirDosya).
    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(yol));
    assert.ok(await bekle(panelde, 25_000),
      `diske düşen kapı Onaylar paneline ulaşmadı; panelde: ${JSON.stringify(y.onayKapilari())}`);
    const sonuc = await vscode.commands.executeCommand<{ tur: string } | undefined>(
      "sarmal.onayKararVer", yol, 3, "DVN-PANEL-A01", "onaylandı", false, "");
    assert.strictEqual(sonuc?.tur, "başarı", `karar kanıtlanamadı: ${JSON.stringify(sonuc)}`);
    assert.ok(await bekle(() => !panelde()), "karara bağlanan kapı Onaylar panelinde kaldı");
  });
});

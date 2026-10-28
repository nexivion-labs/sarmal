// ═══════════════════════════════════════════════════════════════════════════
// sekme-sirasi.test.ts — ↔️ SEKMELERİN SÜRÜKLENEREK SIRALANMASI (PNL-A23 · gerçek VS Code)
//
//   OZK-14 DÖRDÜNCÜSÜ (Founder 2026-10-28): beş sekmenin hepsi sürüklenerek sıralanır ve
//   kullanıcının kurduğu sıra eklentinin varsayılanı olabilir. Kabulün gerçek VS Code ayağı:
//     · Sürüklenen sekme bırakıldığı yere geçer. Sürükleme gerçek webview'de, şeridin kendi
//       sürükleme işleyicilerinden geçen DOM olaylarıyla yapılır (panel.ts SINAMA_KOMUTU
//       "sekmeSurukle" · panel-betik.ts). Seçili sekme ve görünen içerik değişmez, rozetler
//       sekmeleriyle birlikte taşınır.
//     · Sıra pencere yeniden yüklendikten sonra korunur: yeni sıra VS Code'un kullanıcı ayar
//       dosyasına (User/settings.json) diskte yazılmıştır ve panelin açılış yolu ("yenidenAc")
//       o ayardan şeridi kurar ve sıranın ilk sekmesiyle açılır.
//     · Bozuk ya da eksik bir sıra ayarı paneli bozmaz: dizi olmayan değer varsayılana düşer,
//       bilinmeyen kimlik atılır, eksik kimlik sona eklenir; şerit ayar değişince yeniden dizilir.
//     · Komut paletindeki varsayılana döndürme komutu kullanıcı ayarını siler.
//   Sınama, kullanıcı ayarını başta ve sonda siler; öteki süitler paketin varsayılanıyla koşar.
// ═══════════════════════════════════════════════════════════════════════════

import * as assert from "node:assert";
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";

const EKLENTI = "nexivion-labs.sarmal";
const SINAMA_KOMUTU = "sarmal.sinama.panel";
const SIFIRLA_KOMUTU = "sarmal.sekmeSirasiniSifirla";
const AYAR = "sekmeSirasi";

interface Kapi { panelOlcumleri(): { sekme: string; hazir: number; sekmeSirasi: string[]; siraYazimi: number } | undefined }
interface SeritDurumu {
  sira: string[]; secili: string; gorunen: string[]; icerik: string[];
  rozetler: Array<{ sekme: string; rozet: string[] }>;
}

async function bekle(kosul: () => boolean | Promise<boolean>, ne: string, sure = 15_000): Promise<void> {
  const son = Date.now() + sure;
  while (!(await kosul())) {
    if (Date.now() > son) throw new Error(`beklenen durum gelmedi: ${ne}`);
    await new Promise((r) => setTimeout(r, 50));
  }
}

const ayar = (): vscode.WorkspaceConfiguration => vscode.workspace.getConfiguration("sarmal");
const paketSirasi = (): string[] => ayar().inspect<string[]>(AYAR)!.defaultValue!;
const kullaniciDegeri = (): unknown => ayar().inspect<unknown>(AYAR)?.globalValue;
/** VS Code'un kullanıcı ayar dosyasındaki değer (diskten okunur; pencere yeniden yüklenince okunan dosya budur). */
function dosyadakiDeger(): unknown {
  const kok = process.env.SARMAL_SINAMA_KULLANICI_DIZINI;
  assert.ok(kok, "kullanıcı dizini sınamaya verilmedi (calistir.ts)");
  const yol = path.join(kok, "User", "settings.json");
  if (!fs.existsSync(yol)) return undefined;
  const metin = fs.readFileSync(yol, "utf8").replace(/^\s*\/\/.*$/gm, "");
  return (JSON.parse(metin.trim() || "{}") as Record<string, unknown>)[`sarmal.${AYAR}`];
}

describe("PNL-A23 — sekmelerin sürüklenerek sıralanması (gerçek VS Code)", () => {
  let kapi: Kapi;
  const o = () => kapi.panelOlcumleri()!;
  const sinama = (e: Record<string, unknown>): Thenable<unknown> => vscode.commands.executeCommand(SINAMA_KOMUTU, e);
  /** Webview'in şerit durumunu ister ve raporu bekler. */
  async function seritOku(eylem: Record<string, unknown> = { eylem: "seritDurumu" }): Promise<SeritDurumu> {
    const gitti = await sinama(eylem);
    assert.strictEqual(gitti, true, `${String(eylem.eylem)} webview'e iletilemedi`);
    await bekle(async () => (await sinama({ eylem: "sekmeRaporu" })) !== undefined, "webview şerit raporu gelmedi");
    return (await sinama({ eylem: "sekmeRaporu" })) as SeritDurumu;
  }

  before(async () => {
    const yuz = (await vscode.extensions.getExtension(EKLENTI)!.activate()) as { bolumSinamaKapisi?: Kapi };
    assert.ok(yuz.bolumSinamaKapisi, "sınama kipinde nöbet kapısı verilmeliydi");
    kapi = yuz.bolumSinamaKapisi!;
    // Önceki bir koşudan kalmış olabilecek kullanıcı sırası silinir.
    await ayar().update(AYAR, undefined, vscode.ConfigurationTarget.Global);
    await vscode.commands.executeCommand("sarmal.bolum.ray");
    await bekle(() => (o()?.hazir ?? 0) > 0, "panelin betiği yüklenmedi");
    await bekle(() => o().sekmeSirasi.join() === paketSirasi().join(), "şerit paketin sırasına dönmedi");
  });

  after(async () => {
    await ayar().update(AYAR, undefined, vscode.ConfigurationTarget.Global);
    await sinama({ eylem: "yenidenAc" });
    await vscode.commands.executeCommand("sarmal.bolum.ray");
  });

  it("sürüklenen sekme bırakıldığı yere geçer; seçim, görünen içerik ve rozetler sekmeleriyle doğru kalır; yeni sıra kullanıcı ayar dosyasına yazılır ve yeniden açılışta korunur", async () => {
    await vscode.commands.executeCommand("sarmal.bolum.ray");
    await bekle(() => o().sekme === "ray", "panel Ray'de değil");
    const varsayilan = paketSirasi();
    const once = await seritOku();
    assert.deepStrictEqual(once.sira, varsayilan, "şerit paketin varsayılan sırasında başlamadı");
    // Sıranın son sekmesi sürüklenip ilk sekmenin önüne bırakılır (ölçüm paketin varsayılanından türer;
    // Founder kendi sırasını varsayılan yaptığında da geçerlidir).
    const hedef = varsayilan[0]!;
    const suruklenen = varsayilan.at(-1)!;
    const beklenen = [suruklenen, ...varsayilan.filter((s) => s !== suruklenen)];
    const r = await seritOku({ eylem: "sekmeSurukle", ad: suruklenen, hedef, once: true });
    assert.deepStrictEqual(r.sira, beklenen, "sürüklenen sekme bırakıldığı yere geçmedi");
    assert.strictEqual(r.secili, "ray", "sürükleme seçili sekmeyi değiştirdi");
    assert.deepStrictEqual(r.gorunen, ["ray"], "sürükleme görünen kabı değiştirdi");
    assert.deepStrictEqual(r.icerik, ["ray"], "sürüklemeden sonra başka sekmenin içeriği görünüyor");
    // Rozetler kendi sekmesinin düğmesindedir; düğmeyle taşınır.
    const rozet = Object.fromEntries(r.rozetler.map((x) => [x.sekme, x.rozet.join("+")]));
    assert.deepStrictEqual(r.rozetler.map((x) => x.sekme), beklenen);
    assert.deepStrictEqual(rozet, { ray: "", tren: "", makinist: "rozet", sinyaller: "rozet dur+rozet dikkat", ayarlar: "" }, "rozetler sekmeleriyle taşınmadı");
    // Sıra eklentiye ulaşır ve kullanıcı ayarına yazılır; diskteki ayar dosyası yeni sırayı taşır.
    await bekle(() => o().sekmeSirasi.join() === beklenen.join(), "eklenti yeni sırayı almadı");
    await bekle(() => JSON.stringify(kullaniciDegeri()) === JSON.stringify(beklenen), "sıra kullanıcı ayarına yazılmadı");
    await bekle(() => JSON.stringify(dosyadakiDeger()) === JSON.stringify(beklenen), "sıra kullanıcı ayar dosyasına (diskte) yazılmadı");
    assert.strictEqual(o().sekme, "ray", "sıra yazımı seçimi değiştirdi");
    // Yeniden açılış: panel sırayı ayardan kurar ve sıranın ilk sekmesiyle başlar.
    const hazir = o().hazir;
    const acilis = await sinama({ eylem: "yenidenAc" });
    assert.strictEqual(acilis, suruklenen, "yeniden açılış sıranın ilk sekmesiyle başlamadı");
    await bekle(() => o().hazir > hazir, "panel yeniden yüklenmedi");
    const sonra = await seritOku();
    assert.deepStrictEqual(sonra.sira, beklenen, "sıra yeniden açılışta korunmadı");
    assert.strictEqual(sonra.secili, suruklenen);
    assert.deepStrictEqual(sonra.gorunen, [suruklenen]);
    assert.deepStrictEqual(sonra.icerik, [suruklenen], "açılışta sıranın ilk sekmesinin içeriği görünmüyor");
  });

  it("bozuk ya da eksik sıra ayarı paneli bozmaz: eksik kimlik sona eklenir, bilinmeyen atılır, dizi olmayan değer varsayılana düşer; şerit ayar değişince yeniden dizilir", async () => {
    const varsayilan = paketSirasi();
    const durumlar: Array<[unknown, string[]]> = [
      [["tren", "graf", "tren"], ["tren", ...varsayilan.filter((s) => s !== "tren")]],
      ["ray", varsayilan],
      [[], varsayilan],
    ];
    for (const [deger, beklenen] of durumlar) {
      await ayar().update(AYAR, deger, vscode.ConfigurationTarget.Global);
      await bekle(() => o().sekmeSirasi.join() === beklenen.join(), `${JSON.stringify(deger)}: eklentinin sırası ${o().sekmeSirasi.join()}`);
      await bekle(async () => (await seritOku()).sira.join() === beklenen.join(), `${JSON.stringify(deger)}: şerit yeniden dizilmedi`);
      const r = await seritOku();
      assert.strictEqual(r.sira.length, 5, `${JSON.stringify(deger)}: şeritte beş sekme yok`);
      assert.strictEqual(r.gorunen.length, 1, `${JSON.stringify(deger)}: görünen kap sayısı bozuldu`);
      assert.deepStrictEqual(r.icerik, r.gorunen, `${JSON.stringify(deger)}: görünen içerik kabından ayrıştı`);
    }
    // Bozuk ayarla yeniden açılış da bozulmaz ve ilk sekmeyle başlar.
    await ayar().update(AYAR, { ray: 1 }, vscode.ConfigurationTarget.Global);
    const hazir = o().hazir;
    assert.strictEqual(await sinama({ eylem: "yenidenAc" }), varsayilan[0]);
    await bekle(() => o().hazir > hazir, "panel yeniden yüklenmedi");
    assert.deepStrictEqual((await seritOku()).sira, varsayilan);
  });

  it("komut paletindeki varsayılana döndürme komutu kullanıcı ayarını siler ve şeridi paketin sırasına döndürür", async () => {
    await ayar().update(AYAR, ["ayarlar", "makinist", "tren", "sinyaller", "ray"], vscode.ConfigurationTarget.Global);
    await bekle(async () => (await seritOku()).sira[0] === "ayarlar", "şerit kullanıcının sırasını almadı");
    await vscode.commands.executeCommand(SIFIRLA_KOMUTU);
    await bekle(() => kullaniciDegeri() === undefined, "kullanıcı ayarı silinmedi");
    await bekle(async () => (await seritOku()).sira.join() === paketSirasi().join(), "şerit paketin sırasına dönmedi");
    assert.strictEqual(dosyadakiDeger(), undefined, "ayar dosyasında sıra kaldı");
  });
});

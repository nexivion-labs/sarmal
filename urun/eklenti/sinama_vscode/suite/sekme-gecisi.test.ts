// ═══════════════════════════════════════════════════════════════════════════
// sekme-gecisi.test.ts — ⏱️ SEKME GEÇİŞİ EKLENTİYİ BEKLEMEZ (PNL-A18 · gerçek VS Code)
//
//   Founder 2026-10-28 ekran kaydı (0.9.195): eklenti denetim turunun bölünmez senkron
//   bloğundayken sekmeye tıklamak vurguyu hemen geçiriyor, içerik ise eski sekmede
//   kalıyor ya da başka bir sekmenin içeriği görünüyordu.
//
//   ÖLÇÜM. Sınama eklentiyle aynı uzantı sürecinde koşar; bu süreci birkaç saniye
//   meşgul bir döngüyle KİLİTLER, tıpkı bölünmez bir denetim turu gibi. Kilitten hemen
//   önce panelin betiğine sekmelere sırayla tıklatan bir sınama iletisi gönderilir; betik kısa bir
//   gecikmeden sonra altı tıklamayı art arda yapar (arka plandaki webview'in zamanlayıcıları saniyeye
//   yuvarlanabildiği için tıklamaların arasına zamanlayıcı konmaz)
//   (panel.ts SINAMA_KOMUTU · panel-betik.ts). Tıklamalar gerçek webview'de, gerçek
//   sekme düğmelerinde doğar ve eklenti kilitliyken işlenir; betik her tıklamanın hemen
//   ardından seçili sekmeyi, görünen kabı ve görünen içeriğin hangi sekmeye ait olduğunu
//   kaydeder. Kilit açılınca rapor ile sıradaki sekme iletileri eklentiye ulaşır ve
//   panelin sekmesi ile bölüm yuvasının seçimi son tıklamaya yetişir.
// ═══════════════════════════════════════════════════════════════════════════

import * as assert from "node:assert";
import * as vscode from "vscode";

const EKLENTI = "nexivion-labs.sarmal";
const SINAMA_KOMUTU = "sarmal.sinama.panel";
const KILIT_MS = 3_000;
const ARALIK_MS = 300;
const SIRA = ["tren", "makinist", "sinyaller", "ayarlar", "ray", "makinist"];

interface Kayit { ad: string; zaman: number; sure: number; secili: string; gorunen: string[]; icerik: string[] }
interface Kapi {
  panelOlcumleri(): { sekme: string; hazir: number } | undefined;
  olcumler(): { secili: string; seciliYuva: string };
}

async function bekle(kosul: () => boolean | Promise<boolean>, ne: string, sure = 15_000): Promise<void> {
  const son = Date.now() + sure;
  while (!(await kosul())) {
    if (Date.now() > son) throw new Error(`beklenen durum gelmedi: ${ne}`);
    await new Promise((r) => setTimeout(r, 50));
  }
}

describe("PNL-A18 — sekme geçişi eklentiyi beklemez (gerçek VS Code, eklenti kilitliyken)", () => {
  let kapi: Kapi;

  before(async () => {
    const yuz = (await vscode.extensions.getExtension(EKLENTI)!.activate()) as { bolumSinamaKapisi?: Kapi };
    assert.ok(yuz.bolumSinamaKapisi, "sınama kipinde nöbet kapısı verilmeliydi");
    kapi = yuz.bolumSinamaKapisi!;
    await vscode.commands.executeCommand("sarmal.bolum.ray");
    await bekle(() => (kapi.panelOlcumleri()?.hazir ?? 0) > 0, "panelin betiği yüklenmedi");
  });

  after(async () => {
    await vscode.commands.executeCommand("sarmal.bolum.ray");
  });

  it("eklentinin iş parçacığı üç saniye kilitliyken her sekme geçişi webview'de anında olur ve seçili sekme ile görünen içerik her adımda aynıdır; kilit açılınca eklenti ve bölüm yuvası son geçişe yetişir", async () => {
    await vscode.commands.executeCommand("sarmal.bolum.ray");
    await bekle(() => kapi.panelOlcumleri()?.sekme === "ray", "panel Ray'de değil");
    const gitti = await vscode.commands.executeCommand(SINAMA_KOMUTU, { eylem: "sekmeDizisi", sira: SIRA, aralik: ARALIK_MS });
    assert.strictEqual(gitti, true, "sınama dizisi webview'e iletilemedi");
    // Bölünmez senkron iş: eklentinin süreci kilitlenir, hiçbir ileti işlenmez.
    const bas = Date.now();
    while (Date.now() - bas < KILIT_MS) { /* kilit */ }
    const bitis = Date.now();
    await bekle(async () => (await vscode.commands.executeCommand(SINAMA_KOMUTU, { eylem: "sekmeRaporu" })) !== undefined, "webview raporu gelmedi");
    const kayitlar = (await vscode.commands.executeCommand(SINAMA_KOMUTU, { eylem: "sekmeRaporu" })) as Kayit[];
    assert.deepStrictEqual(kayitlar.map((k) => k.ad), SIRA, "webview bütün geçişleri yapmadı");
    for (const k of kayitlar) {
      assert.strictEqual(k.secili, k.ad, `${k.ad}: tıklanan sekme seçili olmadı`);
      assert.deepStrictEqual(k.gorunen, [k.ad], `${k.ad}: görünen kap seçili sekmeden ayrıştı (${k.gorunen.join(", ")})`);
      assert.deepStrictEqual(k.icerik, [k.ad], `${k.ad}: başka sekmenin içeriği görünüyor (${k.icerik.join(", ")})`);
      assert.ok(k.sure < 100, `${k.ad}: geçiş ${k.sure.toFixed(1)} ms sürdü`);
    }
    // Geçişler eklenti kilitliyken oldu: eklentiye gidip gelen hiçbir yanıt beklenmedi.
    const kilitte = kayitlar.filter((k) => k.zaman >= bas && k.zaman <= bitis).length;
    assert.strictEqual(kilitte, SIRA.length, `geçişlerin yalnız ${kilitte}/${SIRA.length} tanesi eklenti kilitliyken oldu (kilit ${bas}–${bitis}, geçişler ${kayitlar.map((k) => k.zaman).join(", ")})`);
    // Kilit açılınca sıradaki sekme iletileri işlenir: panelin sekmesi ve bölüm yuvası son geçiştedir.
    const son = SIRA.at(-1)!;
    await bekle(() => kapi.panelOlcumleri()?.sekme === son, `panelin sekmesi son geçişe (${son}) yetişmedi`);
    assert.strictEqual(kapi.olcumler().secili, son, "bölüm yuvasının seçimi panelin sekmesinden ayrıştı");
    assert.strictEqual(kapi.olcumler().seciliYuva, son);
  });
});

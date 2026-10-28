// ═══════════════════════════════════════════════════════════════════════════
// dal-acma.test.ts — 🌳 DAL AÇMA EKLENTİYİ BEKLEMEZ (PNL-A27 · gerçek VS Code)
//
//   PNL-A18'in sekme ölçümünün dal karşılığı. Ray ağacında görünen ve önden çocukları
//   webview'de duran bir kapalı dal seçilir. Panelin betiğine o dalın açma okuna kısa bir
//   gecikmeden sonra gerçek tıklama gönderilir ve eklentinin süreci üç saniye meşgul bir
//   döngüyle kilitlenir (bölünmez bir denetim turu gibi). Betik tıklamanın hemen ardından
//   dalın durumunu ve görünen çocuklarını kaydeder. Kilit açılınca eklenti haberi alır, durumu
//   kalıcı yazar ve önden veriyi tazeler; dal açık kalır.
// ═══════════════════════════════════════════════════════════════════════════

import * as assert from "node:assert";
import * as vscode from "vscode";

const EKLENTI = "nexivion-labs.sarmal";
const SINAMA_KOMUTU = "sarmal.sinama.panel";
const KILIT_MS = 3_000;

interface Kapi { panelOlcumleri(): { sekme: string; hazir: number } | undefined }
interface Rapor { id: string; zaman: number; sure: number; acik: string | null; cocuk: number }
interface Gorunen { id: string; derinlik: number; durum: string; onden: number }

async function bekle(kosul: () => boolean | Promise<boolean>, ne: string, sure = 15_000): Promise<void> {
  const son = Date.now() + sure;
  while (!(await kosul())) {
    if (Date.now() > son) throw new Error(`beklenen durum gelmedi: ${ne}`);
    await new Promise((r) => setTimeout(r, 50));
  }
}
const sinama = <T>(e: Record<string, unknown>): Thenable<T> => vscode.commands.executeCommand<T>(SINAMA_KOMUTU, e);

describe("PNL-A27 — dal açma eklentiyi beklemez (gerçek VS Code, eklenti kilitliyken)", () => {
  let kapi: Kapi;
  let hedef = "";

  before(async () => {
    const yuz = (await vscode.extensions.getExtension(EKLENTI)!.activate()) as { bolumSinamaKapisi?: Kapi };
    assert.ok(yuz.bolumSinamaKapisi, "sınama kipinde nöbet kapısı verilmeliydi");
    kapi = yuz.bolumSinamaKapisi!;
    await vscode.commands.executeCommand("sarmal.bolum.ray");
    await bekle(() => (kapi.panelOlcumleri()?.hazir ?? 0) > 0, "panelin betiği yüklenmedi");
  });

  after(async () => {
    // Açılan dal eski hâline döner (eklenti yolu: durum yazılır ve ağaç yeniden çizilir).
    if (hedef) await sinama({ eylem: "ileti", ileti: { tip: "gec", id: hedef, ac: false } });
    await vscode.commands.executeCommand("sarmal.bolum.ray");
  });

  it("eklentinin iş parçacığı üç saniye kilitliyken görünen kapalı dal tıklamayla webview'de anında açılır ve çocukları görünür; kilit açılınca durum kalıcı yazılır ve dal açık kalır", async () => {
    await bekle(async () => (await sinama<Gorunen[]>({ eylem: "gorunenSatirlar", kaynak: "ray" })).some((x) => x.durum === "kapali" && x.onden > 0),
      "Ray ağacında önden çocukları gelmiş kapalı dal yok");
    const aday = (await sinama<Gorunen[]>({ eylem: "gorunenSatirlar", kaynak: "ray" })).find((x) => x.durum === "kapali" && x.onden > 0)!;
    hedef = aday.id;
    const gitti = await sinama<boolean>({ eylem: "dalAc", id: hedef, aralik: 300 });
    assert.strictEqual(gitti, true, "sınama iletisi webview'e gidemedi");
    // Bölünmez senkron iş: eklentinin süreci kilitlenir, hiçbir ileti işlenmez.
    const bas = Date.now();
    while (Date.now() - bas < KILIT_MS) { /* kilit */ }
    const bitis = Date.now();
    await bekle(async () => (await sinama({ eylem: "sekmeRaporu" })) !== undefined, "webview raporu gelmedi");
    const r = (await sinama<Rapor>({ eylem: "sekmeRaporu" }));
    assert.strictEqual(r.id, hedef);
    assert.strictEqual(r.acik, "true", "dal tıklamayla açılmadı");
    assert.strictEqual(r.cocuk, aday.onden, `dalın çocukları görünmedi (${r.cocuk}/${aday.onden})`);
    assert.ok(r.zaman >= bas && r.zaman <= bitis, `dal eklenti kilitliyken açılmadı (kilit ${bas}–${bitis}, açılış ${r.zaman})`);
    assert.ok(r.sure < 100, `dal açma ${r.sure.toFixed(1)} ms sürdü`);
    // Kilit açılınca: haber işlenir, durum kalıcı yazılır; önden veri tazelenince dal hâlâ açıktır.
    await bekle(async () => (await sinama<{ acik?: boolean; gorulenGec: number }>({ eylem: "dalDurumu", id: hedef })).acik === true, "eklenti dalın açık durumunu kaydetmedi");
    await new Promise((r2) => setTimeout(r2, 600));
    const sonra = await sinama<Gorunen[]>({ eylem: "gorunenSatirlar", kaynak: "ray" });
    assert.ok(sonra.find((x) => x.id === hedef)?.durum === "acik", "eklentinin sonraki çizimi dalı kapattı");
    assert.strictEqual(sonra.filter((x) => x.id.startsWith(`${hedef}/`) && x.derinlik === aday.derinlik + 1).length, aday.onden, "dalın çocukları eklentinin görünen satırlarında değil");
    console.log(`      PNL-A27 ölçüsü: eklenti ${KILIT_MS} ms kilitliyken dal açma ${r.sure.toFixed(1)} ms · ${r.cocuk} çocuk görünür`);
  });
});

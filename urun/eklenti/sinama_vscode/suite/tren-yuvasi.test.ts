// ═══════════════════════════════════════════════════════════════════════════
// tren-yuvasi.test.ts — PNL-A13 · KARDEŞ EKLENTİ YUVASI GERÇEK VS Code'DA
//
//   Sürücü (calistir.ts) açık eklentiyle birlikte sinama_vscode/sahte-kardes
//   fikstürünü yükler. Fikstür Tren'in Canlı yuvasının birinci sürümünü alır ve
//   gövdesini yalnız sınama isteyince kaydeder (öteki süitler Tren'i yalın görür).
//   Nöbet şunu ölçer: kayıtla Tren'de Plan · Canlı seçicisi belirir ve Canlı
//   kendiliğinden seçilmez; seçicinin düğmesine gerçek tıklama Canlı'yı açar,
//   gövde gölge kökte görünür ve kardeşe görünürlük bildirilir; gövde güncellemesi
//   belgeyi yeniden yazmaz; gövdedeki data-eylem tıklaması kardeşe ulaşır; ikinci
//   kayıt reddedilir; kayıt bırakılınca seçici kalkar ve Tren Plan'a döner.
//
//   ÖLÇÜMÜN SINIRI: VS Code bir eklentiyi sınama içinden kapatmaya izin vermez;
//   fikstürün `canliKapat` işlevi kapanışta VS Code'un yaptığını, yani kaydın
//   serbest bırakılmasını yapar.
// ═══════════════════════════════════════════════════════════════════════════

import * as assert from "node:assert";
import * as vscode from "vscode";

const EKLENTI = "nexivion-labs.sarmal";
const KARDES = "sinama.sahte-kardes";
const SINAMA_KOMUTU = "sarmal.sinama.panel";

interface CanliDurumu { secici: boolean; gorunum: string; canliGorunur: boolean; metin: string; planGorunur: boolean }
interface Olcum { sekme: string; hazir: number; belge: number; trenCanli: { var: boolean; gorunum: string; gorunur: boolean } }
interface Kapi { panelOlcumleri(): Olcum | undefined }
interface Kardes {
  trenYuvasiVar: boolean;
  canliEylemleri: Array<{ eylem: string; deger?: string }>;
  canliGorunurluk: boolean[];
  canliKur(html: string): string;
  canliGuncelle(html: string): void;
  canliGorunurMu(): boolean;
  canliKapat(): void;
  canliDene(html: string): string;
}

async function bekle(kosul: () => boolean | Promise<boolean>, ne: string, sure = 15_000): Promise<void> {
  const son = Date.now() + sure;
  while (!(await kosul())) {
    if (Date.now() > son) throw new Error(`beklenen durum gelmedi: ${ne}`);
    await new Promise((r) => setTimeout(r, 50));
  }
}
const sinama = <T>(e: Record<string, unknown>): Thenable<T> => vscode.commands.executeCommand<T>(SINAMA_KOMUTU, e);

/** Webview'den bir rapor ister ve gelene kadar bekler. */
async function rapor(e: Record<string, unknown>): Promise<CanliDurumu> {
  assert.strictEqual(await sinama<boolean>(e), true, "sınama iletisi webview'e gidemedi");
  let r: CanliDurumu | undefined;
  await bekle(async () => (r = await sinama<CanliDurumu | undefined>({ eylem: "sekmeRaporu" })) !== undefined, "webview raporu gelmedi");
  return r!;
}
const durum = (): Promise<CanliDurumu> => rapor({ eylem: "trenCanliDurumu" });

describe("PNL-A13 — Tren Canlı yuvası (gerçek VS Code, sahte kardeşle)", () => {
  let kapi: Kapi;
  let kardes: Kardes;

  before(async () => {
    const yuz = (await vscode.extensions.getExtension(EKLENTI)!.activate()) as { bolumSinamaKapisi?: Kapi };
    assert.ok(yuz.bolumSinamaKapisi, "sınama kipinde nöbet kapısı verilmeliydi");
    kapi = yuz.bolumSinamaKapisi!;
    kardes = (await vscode.extensions.getExtension(KARDES)!.activate()) as Kardes;
    assert.ok(kardes.trenYuvasiVar, "açık eklentinin dış yüzü Tren yuvasının birinci sürümünü vermedi");
    await vscode.commands.executeCommand("sarmal.bolum.tren");
    await bekle(() => (kapi.panelOlcumleri()?.hazir ?? 0) > 0 && kapi.panelOlcumleri()?.sekme === "tren", "Tren sekmesi açılmadı");
  });

  after(async () => {
    kardes?.canliKapat();
    await vscode.commands.executeCommand("sarmal.bolum.ray");
  });

  it("kayıtla Plan · Canlı seçicisi belirir ve Canlı kendiliğinden seçilmez; seçicinin düğmesine tıklama Canlı'yı açar, gövde gölge kökte görünür ve kardeşe görünürlük bildirilir", async () => {
    assert.strictEqual((await durum()).secici, false, "kardeş kaydolmadan seçici çizilmemeli");
    assert.strictEqual(kardes.canliKur('<p>Sahte canlı gövde</p><button data-eylem="dokun" data-deger="bir">Dokun</button>'), "kabul");
    await bekle(async () => (await durum()).secici, "kayıttan sonra Plan · Canlı seçicisi belirmedi");
    let d = await durum();
    assert.deepStrictEqual([d.gorunum, d.planGorunur, d.canliGorunur], ["plan", true, false], JSON.stringify(d));
    assert.ok(d.metin.includes("Sahte canlı gövde"), `gövde gölge köke yazılmadı: ${d.metin}`);
    assert.strictEqual(kardes.canliGorunurMu(), false, "Canlı seçilmeden kardeş görünür sayılmamalı");
    d = await rapor({ eylem: "trenGorunumSec", ad: "canli" });
    assert.deepStrictEqual([d.gorunum, d.canliGorunur, d.planGorunur], ["canli", true, false], JSON.stringify(d));
    await bekle(() => kardes.canliGorunurMu(), "kardeşe görünürlük bildirilmedi");
    assert.deepStrictEqual(kardes.canliGorunurluk, [true]);
    assert.deepStrictEqual(kapi.panelOlcumleri()!.trenCanli, { var: true, gorunum: "canli", gorunur: true });
  });

  it("gövde güncellemesi belgeyi yeniden yazmaz; gövdedeki data-eylem tıklaması kardeşe ulaşır; ikinci kayıt reddedilir", async () => {
    const belge = kapi.panelOlcumleri()!.belge;
    kardes.canliGuncelle('<p>İkinci gövde</p><button data-eylem="dokun" data-deger="iki">Dokun</button>');
    await bekle(async () => (await durum()).metin.includes("İkinci gövde"), "gövde güncellemesi Canlı kabına yazılmadı");
    assert.strictEqual(kapi.panelOlcumleri()!.belge, belge, "gövde güncellemesi belgeyi yeniden yazdı");
    await rapor({ eylem: "trenCanliTikla" });
    await bekle(() => kardes.canliEylemleri.length > 0, "gövdedeki tıklama kardeşe ulaşmadı");
    assert.deepStrictEqual(kardes.canliEylemleri, [{ eylem: "dokun", deger: "iki" }]);
    const ret = kardes.canliDene("<p>ikinci kayıt</p>");
    assert.notStrictEqual(ret, "kabul", "dolu yuvaya ikinci kayıt kabul edildi");
    assert.ok((await durum()).metin.includes("İkinci gövde"), "reddedilen kayıt var olan gövdeyi değiştirdi");
  });

  it("kayıt bırakılınca seçici kalkar, Tren Plan'a döner ve kardeşe görünürlüğün bittiği bildirilmez (kayıt artık yoktur)", async () => {
    kardes.canliKapat();
    await bekle(async () => !(await durum()).secici, "bırakılan kaydın seçicisi kalkmadı");
    const d = await durum();
    assert.deepStrictEqual([d.planGorunur, d.canliGorunur], [true, false], JSON.stringify(d));
    assert.deepStrictEqual(kapi.panelOlcumleri()!.trenCanli, { var: false, gorunum: "plan", gorunur: false });
    assert.deepStrictEqual(kardes.canliGorunurluk, [true]);
  });
});

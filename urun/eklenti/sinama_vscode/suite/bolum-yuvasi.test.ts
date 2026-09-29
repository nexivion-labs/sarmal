// ═══════════════════════════════════════════════════════════════════════════
// bolum-yuvasi.test.ts — 🧩 BÖLÜM YUVASI GERÇEK VS Code'DA (VIT-K78-A10)
//
//   Sürücü (calistir.ts) açık eklentiyle birlikte sinama_vscode/sahte-kardes
//   fikstürünü de geliştirme kipinde yükler. Fikstür gerçek bir kardeş
//   eklentinin yapacağını yapar: açık eklentinin dış yüzünden arayüzün birinci
//   sürümünü alır ve iki bölüm kaydeder. Nöbet kabul ölçütünü ölçer: bölümler
//   sırada görünür, seçilen bölüm açılır (yuvanın sağlayıcısı VS Code'un kendi
//   çağrısıyla çözülür), Ray panelleri seçimle gizlenip geri gelir, kardeş
//   kayıtlarını bıraktığında sıra yalnız Ray'e döner ve hiçbir hata doğmaz.
//
//   ÖLÇÜMÜN SINIRI: VS Code bir eklentiyi sınama içinden kapatmaya izin vermez.
//   Fikstürün `kapat` işlevi kapanışta VS Code'un yaptığını, yani kendi
//   `context.subscriptions` kümesindeki kayıtları serbest bırakmayı yapar; yol
//   aynıdır, tetik sınamadır.
// ═══════════════════════════════════════════════════════════════════════════

import * as assert from "node:assert";
import * as vscode from "vscode";

const EKLENTI = "nexivion-labs.sarmal";
const KARDES = "sinama.sahte-kardes";

interface Olcum {
  sira: string[];
  secili: string;
  seciliYuva: string;
  siraCozuldu: boolean;
  siraCizimi: number;
  yuvaCozumu: Record<string, number>;
}
interface Yuva {
  surum: number;
  bolumKaydet(t: unknown): vscode.Disposable;
  bolumSec(k: string): Promise<boolean>;
  readonly seciliBolum: string;
}
interface Yuz {
  bolumYuvasiAl(s: number): Yuva | undefined;
  bolumOlcumleri(): Olcum | undefined;
  yolHaritasiGorunurMu(): boolean;
}
interface Kardes {
  yuvaVar: boolean;
  cozulen: Record<string, number>;
  kapat(): void;
}

async function bekle(kosul: () => boolean, ne: string, sure = 15_000): Promise<void> {
  const son = Date.now() + sure;
  while (!kosul()) {
    if (Date.now() > son) throw new Error(`beklenen durum gelmedi: ${ne}`);
    await new Promise((r) => setTimeout(r, 50));
  }
}

describe("VIT-K78-A10 — tek Sarmal simgesi ve bölüm yuvası (gerçek VS Code)", () => {
  let yuz: Yuz;
  let kardes: Kardes;
  let yuva: Yuva;

  before(async () => {
    yuz = (await vscode.extensions.getExtension(EKLENTI)!.activate()) as Yuz;
    const k = vscode.extensions.getExtension(KARDES);
    assert.ok(k, "sahte kardeş eklenti yüklenmemiş; sürücü onu geliştirme kipinde açmalıydı");
    kardes = (await k!.activate()) as Kardes;
    yuva = yuz.bolumYuvasiAl(1)!;
    await vscode.commands.executeCommand("workbench.view.extension.sarmal-yol");
  });

  it("arayüz sürümlüdür: birinci sürüm verilir, bilinmeyen sürüm verilmez", () => {
    assert.ok(kardes.yuvaVar, "kardeş eklenti arayüzü alamadı");
    assert.strictEqual(yuva.surum, 1);
    assert.strictEqual(yuz.bolumYuvasiAl(2), undefined);
    assert.strictEqual(yuz.bolumYuvasiAl(0), undefined);
  });

  it("kardeşin iki bölümü Ray'in ardından sırada görünür ve sıra çizilmiştir", async () => {
    assert.deepStrictEqual(yuz.bolumOlcumleri()!.sira, ["ray", "birinci", "ikinci"]);
    assert.strictEqual(yuz.bolumOlcumleri()!.secili, "ray");
    await bekle(() => yuz.bolumOlcumleri()!.siraCozuldu && yuz.bolumOlcumleri()!.siraCizimi > 0,
      "bölüm sırası webview'i çözülmedi");
    await bekle(() => yuz.yolHaritasiGorunurMu(), "Ray seçiliyken Yol Haritası görünmüyor");
  });

  it("geçersiz kayıt anlaşılır bir hatayla reddedilir ve sıra değişmez", () => {
    const simge = vscode.Uri.file("/yok/simge.svg");
    const saglayici = { resolveWebviewView() { /* boş */ } };
    assert.throws(() => yuva.bolumKaydet({ kimlik: "birinci", ad: "Yine", simge, saglayici }), /birinci/);
    assert.throws(() => yuva.bolumKaydet({ kimlik: "ray", ad: "Ray", simge, saglayici }), /ray/);
    assert.throws(() => yuva.bolumKaydet({ kimlik: "ucuncu", ad: "Üç", simge, saglayici: undefined }), /ucuncu/);
    assert.deepStrictEqual(yuz.bolumOlcumleri()!.sira, ["ray", "birinci", "ikinci"]);
  });

  it("bölüm seçilince açılır: yuvası görünür, sağlayıcısı çözülür ve Ray panelleri gizlenir", async () => {
    assert.strictEqual(await yuva.bolumSec("birinci"), true);
    assert.strictEqual(yuva.seciliBolum, "birinci");
    assert.strictEqual(yuz.bolumOlcumleri()!.seciliYuva, "yuva1");
    await bekle(() => (kardes.cozulen.birinci ?? 0) > 0, "birinci bölümün webview'i çözülmedi");
    await bekle(() => !yuz.yolHaritasiGorunurMu(), "başka bölüm seçiliyken Yol Haritası görünür kaldı");
    assert.strictEqual(await yuva.bolumSec("yok"), false);
    assert.strictEqual(yuva.seciliBolum, "birinci");
  });

  it("Ray'e dönülünce bugünkü paneller geri gelir", async () => {
    assert.strictEqual(await yuva.bolumSec("ray"), true);
    await bekle(() => yuz.yolHaritasiGorunurMu(), "Ray'e dönüldüğünde Yol Haritası geri gelmedi");
  });

  it("kardeş kayıtlarını bırakınca bölümler kalkar, seçim Ray'e döner ve hata doğmaz", async () => {
    assert.strictEqual(await yuva.bolumSec("ikinci"), true);
    await bekle(() => (kardes.cozulen.ikinci ?? 0) > 0, "ikinci bölümün webview'i çözülmedi");
    const cizimOnce = yuz.bolumOlcumleri()!.siraCizimi;
    kardes.kapat();
    const o = yuz.bolumOlcumleri()!;
    assert.deepStrictEqual(o.sira, ["ray"], "kalkan bölümler sırada kaldı");
    assert.strictEqual(o.secili, "ray");
    assert.strictEqual(o.seciliYuva, "ray");
    assert.ok(o.siraCizimi > cizimOnce, "sıra kalkıştan sonra yeniden çizilmedi");
    await bekle(() => yuz.yolHaritasiGorunurMu(), "kardeş kalkınca Ray panelleri geri gelmedi");
    kardes.kapat();   // ikinci bırakma sessizdir
    assert.deepStrictEqual(yuz.bolumOlcumleri()!.sira, ["ray"]);
  });
});

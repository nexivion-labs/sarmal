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
import * as fs from "node:fs";
import * as path from "node:path";
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
  ipuclari: Record<string, string>;
  kokler: string[];
}
interface Yuva {
  surum: number;
  bolumKaydet(t: unknown): vscode.Disposable;
  readonly seciliBolum: string;
}
interface Kapi {
  olcumler(): Olcum;
  kullaniciSecimi(k: string): Promise<boolean>;
  sahipKaybi(id: string): string[];
  yolHaritasiGorunurMu(): boolean;
}
interface Yuz {
  bolumYuvasiAl(s: number): Yuva | undefined;
  bolumSinamaKapisi?: Kapi;
}
interface Kardes {
  yuvaVar: boolean;
  bolumSecVar: boolean;
  cozulen: Record<string, number>;
  kur(): void;
  kapat(): void;
  bozukKaydet(): void;
  dene(kimlik: string, ad: string, simge: string): string;
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
  let kapi: Kapi;
  let kardesKok: string;
  const o = (): Olcum => kapi.olcumler();

  before(async () => {
    yuz = (await vscode.extensions.getExtension(EKLENTI)!.activate()) as Yuz;
    const k = vscode.extensions.getExtension(KARDES);
    assert.ok(k, "sahte kardeş eklenti yüklenmemiş; sürücü onu geliştirme kipinde açmalıydı");
    kardesKok = k!.extensionPath;
    kardes = (await k!.activate()) as Kardes;
    yuva = yuz.bolumYuvasiAl(1)!;
    assert.ok(yuz.bolumSinamaKapisi, "sınama kipinde nöbet kapısı verilmeliydi");
    kapi = yuz.bolumSinamaKapisi!;
    await vscode.commands.executeCommand("workbench.view.extension.sarmal-yol");
  });

  it("arayüz sürümlüdür, programla seçim vermez ve ölçüm kapıları herkese açık yüzde yoktur", () => {
    assert.ok(kardes.yuvaVar, "kardeş eklenti arayüzü alamadı");
    assert.strictEqual(yuva.surum, 1);
    assert.strictEqual(yuz.bolumYuvasiAl(2), undefined);
    assert.strictEqual(yuz.bolumYuvasiAl(0), undefined);
    assert.strictEqual(kardes.bolumSecVar, false, "kardeş kendini programla seçebiliyor");
    const acik = yuz as unknown as Record<string, unknown>;
    assert.strictEqual(acik.bolumOlcumleri, undefined);
    assert.strictEqual(acik.yolHaritasiGorunurMu, undefined);
  });

  it("kardeşin iki bölümü Ray'in ardından sırada görünür, seçim Ray'dedir ve sıra çizilmiştir", async () => {
    assert.deepStrictEqual(o().sira, ["ray", "birinci", "ikinci"]);
    assert.strictEqual(o().secili, "ray");
    await bekle(() => o().siraCozuldu && o().siraCizimi > 0, "bölüm sırası webview'i çözülmedi");
    await bekle(() => kapi.yolHaritasiGorunurMu(), "Ray seçiliyken Yol Haritası görünmüyor");
  });

  it("ipucu kaydeden eklentinin görünen adını taşır; kaynak kökleri simge klasörüyle sınırlıdır", () => {
    const ad = String(vscode.extensions.getExtension(KARDES)!.packageJSON.displayName);
    assert.strictEqual(o().ipuclari.birinci, `Birinci sahte bölüm · ${ad}`);
    assert.strictEqual(o().ipuclari.ikinci, `İkinci · ${ad}`);
    const kendi = vscode.extensions.getExtension(EKLENTI)!.extensionPath;
    const yabanci = o().kokler.filter((k) => k !== kendi);
    assert.ok(yabanci.length > 0, "kardeş simgesinin kökü eklenmedi");
    for (const k of yabanci) {
      assert.ok(k.startsWith(fs.realpathSync(kardesKok)), `kardeşin kökü dışına açılan kaynak kökü: ${k}`);
      assert.notStrictEqual(k, path.parse(k).root, "dosya sistemi kökü eklenmiş");
    }
  });

  it("geçersiz kayıt anlaşılır bir hatayla reddedilir ve sıra değişmez", () => {
    const simge = vscode.Uri.file("/yok/simge.svg");
    const saglayici = { resolveWebviewView() { /* boş */ } };
    // Sınama dosyası açık eklentinin kökünde yaşar: kaydın sahibi okunamaz.
    assert.throws(() => yuva.bolumKaydet({ kimlik: "sinamadan", ad: "Sınama", simge, saglayici }), /sinamadan/);
    const kardesSimge = vscode.Uri.joinPath(vscode.Uri.file(kardesKok), "simge-bir.svg").toString();
    assert.match(kardes.dene("birinci", "Yine", kardesSimge), /birinci/);
    assert.match(kardes.dene("ray", "Başka", kardesSimge), /ray/);
    assert.match(kardes.dene("taklit-a", "  SARMAL ", kardesSimge), /taklit-a/, "Sarmal adı taklit edilebildi");
    assert.match(kardes.dene("taklit-b", "RAY", kardesSimge), /taklit-b/, "Ray adı taklit edilebildi");
    const sarmalSimge = vscode.Uri.joinPath(vscode.extensions.getExtension(EKLENTI)!.extensionUri, "ikonlar", "sarmal.svg").toString();
    assert.match(kardes.dene("disari-a", "Dışarı", sarmalSimge), /disari-a/, "başka eklentinin simgesi kabul edildi");
    assert.match(kardes.dene("disari-b", "Dışarı", "file:///etc/hosts"), /disari-b/, "kök dışı simge kabul edildi");
    assert.match(kardes.dene("disari-c", "Dışarı", "https://ornek.invalid/simge.svg"), /disari-c/, "file dışı şema kabul edildi");
    assert.match(kardes.dene("taklit-c", "Ｓａｒ\u200Bｍａｌ", kardesSimge), /taklit-c/, "biçim karakterli Sarmal adı kabul edildi");
    assert.match(kardes.dene("noktali", "Noktalı", `file://${kardesKok}/../sahte-kardes/simge-bir.svg`), /noktali/, ".. taşıyan simge kabul edildi");
    assert.match(kardes.dene("yok-simge", "Yok", `file://${kardesKok}/yok.svg`), /yok-simge/, "var olmayan simge kabul edildi");
    assert.strictEqual(kardes.dene("gecerli", "Geçerli", kardesSimge), "kabul", "geçerli kayıt reddedildi");
    // Kaynak eşleme kancası (source-map-support benzeri) yığın metnini yeniden yazsa da
    // sahip ham karelerden okunur ve geçerli kayıt kabul edilir.
    const eskiKanca = Error.prepareStackTrace;
    Error.prepareStackTrace = () => "Error\n    at eslenmis (/baska/yer/ozgun.ts:1:1)";
    try {
      assert.strictEqual(kardes.dene("eslemeli", "Eşlemeli", kardesSimge), "kabul", "kaynak eşleme kancası kuruluyken kayıt reddedildi");
    } finally {
      Error.prepareStackTrace = eskiKanca;
    }
    assert.deepStrictEqual(o().sira, ["ray", "birinci", "ikinci"]);
  });

  it("kullanıcı bölümü seçince açılır: yuvası görünür, sağlayıcısı çözülür ve Ray panelleri gizlenir", async () => {
    assert.strictEqual(await kapi.kullaniciSecimi("birinci"), true);
    assert.strictEqual(yuva.seciliBolum, "birinci");
    assert.strictEqual(o().seciliYuva, "yuva1");
    await bekle(() => (kardes.cozulen.birinci ?? 0) > 0, "birinci bölümün webview'i çözülmedi");
    await bekle(() => !kapi.yolHaritasiGorunurMu(), "başka bölüm seçiliyken Yol Haritası görünür kaldı");
    assert.strictEqual(await kapi.kullaniciSecimi("yok"), false);
    assert.strictEqual(yuva.seciliBolum, "birinci");
  });

  it("Ray'e dönülünce bugünkü paneller geri gelir", async () => {
    assert.strictEqual(await kapi.kullaniciSecimi("ray"), true);
    await bekle(() => kapi.yolHaritasiGorunurMu(), "Ray'e dönüldüğünde Yol Haritası geri gelmedi");
  });

  it("sağlayıcısı çözülemeyen bölüm düşer ve seçim Ray'e döner", async () => {
    kardes.bozukKaydet();
    assert.deepStrictEqual(o().sira, ["ray", "birinci", "ikinci", "bozuk"]);
    assert.strictEqual(await kapi.kullaniciSecimi("bozuk"), true);
    await bekle(() => !o().sira.includes("bozuk"), "çözülemeyen bölüm sırada kaldı");
    assert.strictEqual(o().secili, "ray");
    await bekle(() => kapi.yolHaritasiGorunurMu(), "çözülemeyen bölümden sonra Ray panelleri geri gelmedi");
  });

  it("kardeş kayıtlarını bırakınca bölümler kalkar, seçim Ray'e döner ve hata doğmaz", async () => {
    assert.strictEqual(await kapi.kullaniciSecimi("ikinci"), true);
    await bekle(() => (kardes.cozulen.ikinci ?? 0) > 0, "ikinci bölümün webview'i çözülmedi");
    const cizimOnce = o().siraCizimi;
    kardes.kapat();
    assert.deepStrictEqual(o().sira, ["ray"], "kalkan bölümler sırada kaldı");
    assert.strictEqual(o().secili, "ray");
    assert.strictEqual(o().seciliYuva, "ray");
    assert.ok(o().siraCizimi > cizimOnce, "sıra kalkıştan sonra yeniden çizilmedi");
    await bekle(() => kapi.yolHaritasiGorunurMu(), "kardeş kalkınca Ray panelleri geri gelmedi");
    kardes.kapat();   // ikinci bırakma sessizdir
    assert.deepStrictEqual(o().sira, ["ray"]);
  });

  it("kaydını bırakmadan etkinliğini yitiren kardeşin bölümleri düşer ve Ray'e dönülür", async () => {
    kardes.kur();
    assert.deepStrictEqual(o().sira, ["ray", "birinci", "ikinci"]);
    assert.strictEqual(await kapi.kullaniciSecimi("birinci"), true);
    assert.deepStrictEqual(kapi.sahipKaybi(KARDES).sort(), ["birinci", "ikinci"]);
    assert.deepStrictEqual(o().sira, ["ray"]);
    assert.strictEqual(o().secili, "ray");
    await bekle(() => kapi.yolHaritasiGorunurMu(), "sahibi kaybolan bölümden sonra Ray panelleri geri gelmedi");
  });
});

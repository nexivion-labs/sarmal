// ═══════════════════════════════════════════════════════════════════════════
// bolum-yuvasi.test.ts — 🧩 BÖLÜM YUVASI GERÇEK VS Code'DA (VIT-K78-A10)
//
//   Sürücü (calistir.ts) açık eklentiyle birlikte sinama_vscode/sahte-kardes
//   fikstürünü de geliştirme kipinde yükler. Fikstür gerçek bir kardeş
//   eklentinin yapacağını yapar: açık eklentinin dış yüzünden arayüzün birinci
//   sürümünü alır ve iki bölüm kaydeder. Nöbet kabul ölçütünü ölçer: bölümler
//   sıralanır, seçilen bölüm açılır (yuvanın sağlayıcısı VS Code'un kendi
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
  yuvaCozumu: Record<string, number>;
  kardesVar: boolean;
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
  panelOlcumleri(): { sekme: string } | undefined;
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

  it("kardeşin iki bölümü yerleşik dörtlünün (Ray · Graf · Tren · Makinist) ardından sıralanır, seçim Ray'dedir ve 'Diğer bölümler' eylemi açılır", async () => {
    assert.deepStrictEqual(o().sira, ["ray", "graf", "tren", "makinist", "birinci", "ikinci"]);
    // Bölüm seçimi ile panelin sekmesi aynı yeri gösterir: ikisi de Ray'dedir.
    assert.strictEqual(o().secili, "ray");
    assert.strictEqual(kapi.panelOlcumleri()?.sekme, "ray", "panelin sekmesi bölüm seçimiyle aynı yerde değil");
    await bekle(() => o().kardesVar, "kardeş varken kardesVar anahtarı doğru olmadı");
    await bekle(() => kapi.yolHaritasiGorunurMu(), "Ray seçiliyken Yol Haritası görünmüyor");
  });

  it("geçersiz kayıt anlaşılır bir hatayla reddedilir ve sıra değişmez", () => {
    const simge = vscode.Uri.file("/yok/simge.svg");
    const saglayici = { resolveWebviewView() { /* boş */ } };
    // Sınama dosyası açık eklentinin kökünde yaşar: kaydın sahibi okunamaz.
    assert.throws(() => yuva.bolumKaydet({ kimlik: "sinamadan", ad: "Sınama", simge, saglayici }), /sinamadan/);
    const kardesSimge = vscode.Uri.joinPath(vscode.Uri.file(kardesKok), "simge-bir.svg").toString();
    assert.match(kardes.dene("birinci", "Yine", kardesSimge), /birinci/);
    assert.match(kardes.dene("ray", "Başka", kardesSimge), /ray/);
    // Founder 2026-10-21: Tren ve Makinist de ayrılmış kimlik ve ad olur (İngilizce karşılıklarıyla).
    assert.match(kardes.dene("tren", "Başka", kardesSimge), /tren/, "tren kimliği alınabildi");
    assert.match(kardes.dene("makinist", "Başka", kardesSimge), /makinist/, "makinist kimliği alınabildi");
    assert.match(kardes.dene("taklit-d", "Makinist", kardesSimge), /taklit-d/, "Makinist adı taklit edilebildi");
    assert.match(kardes.dene("taklit-e", "Train", kardesSimge), /taklit-e/, "Train adı taklit edilebildi");
    assert.match(kardes.dene("taklit-f", "Driver", kardesSimge), /taklit-f/, "Driver adı taklit edilebildi");
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
    assert.deepStrictEqual(o().sira, ["ray", "graf", "tren", "makinist", "birinci", "ikinci"]);
  });

  it("kullanıcı kardeş bölümü seçince seçim değişir ama kapta ikinci görünüm AÇILMAZ: yuva görünümleri gösterilmez, panel görünür kalır", async () => {
    // Founder 2026-10-21 (dördüncü hüküm): kapta her an yalnız bir görünüm görünür (sarmalPanel). Kardeş yuva
    // görünümleri `when: false` ile kapalıdır; bu yüzden VS Code yuvanın sağlayıcısını çözmez.
    assert.strictEqual(await kapi.kullaniciSecimi("birinci"), true);
    assert.strictEqual(yuva.seciliBolum, "birinci");
    assert.strictEqual(o().seciliYuva, "yuva1");
    await new Promise((r) => setTimeout(r, 300));
    assert.strictEqual(kardes.cozulen.birinci ?? 0, 0, "kardeşin yuva görünümü kapta açıldı: kapta iki görünüm görünür");
    assert.ok(kapi.yolHaritasiGorunurMu(), "kardeş seçiliyken kabın tek görünümü (sarmalPanel) görünmez oldu");
    assert.strictEqual(await kapi.kullaniciSecimi("yok"), false);
    assert.strictEqual(yuva.seciliBolum, "birinci");
  });

  it("Ray'e dönülünce bugünkü paneller geri gelir", async () => {
    assert.strictEqual(await kapi.kullaniciSecimi("ray"), true);
    await bekle(() => kapi.yolHaritasiGorunurMu(), "Ray'e dönüldüğünde Yol Haritası geri gelmedi");
  });

  it("kardeş kayıtlarını bırakınca bölümler kalkar, seçim Ray'e döner ve hata doğmaz", async () => {
    assert.strictEqual(await kapi.kullaniciSecimi("ikinci"), true);
    kardes.kapat();
    assert.deepStrictEqual(o().sira, ["ray", "graf", "tren", "makinist"], "kalkan bölümler sırada kaldı");
    assert.strictEqual(o().secili, "ray");
    assert.strictEqual(o().seciliYuva, "ray");
    await bekle(() => !o().kardesVar, "kardeş kalkınca 'Diğer bölümler' eylemi gizlenmedi");
    await bekle(() => kapi.yolHaritasiGorunurMu(), "kardeş kalkınca Ray panelleri geri gelmedi");
    kardes.kapat();   // ikinci bırakma sessizdir
    assert.deepStrictEqual(o().sira, ["ray", "graf", "tren", "makinist"]);
  });

  it("kaydını bırakmadan etkinliğini yitiren kardeşin bölümleri düşer ve Ray'e dönülür", async () => {
    kardes.kur();
    assert.deepStrictEqual(o().sira, ["ray", "graf", "tren", "makinist", "birinci", "ikinci"]);
    assert.strictEqual(await kapi.kullaniciSecimi("birinci"), true);
    assert.deepStrictEqual(kapi.sahipKaybi(KARDES).sort(), ["birinci", "ikinci"]);
    assert.deepStrictEqual(o().sira, ["ray", "graf", "tren", "makinist"]);
    assert.strictEqual(o().secili, "ray");
    await bekle(() => kapi.yolHaritasiGorunurMu(), "sahibi kaybolan bölümden sonra Ray panelleri geri gelmedi");
  });
});

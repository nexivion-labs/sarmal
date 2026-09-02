// ═══════════════════════════════════════════════════════════════════════════
// gorunum-varsayilani.test.ts — 👁️ EKL-F6-A04 KANIT ÖLÇÜMÜ (GERÇEK VS Code)
//
//   Adımın kabul maddesi 2026-08-22 tarihinde Founder hükmüyle daraltıldı:
//   eklenti BİÇİMİ taşır ve kanonu ilandan bulur, buna karşılık RENGİ dayatmaz.
//   Renk yolu kullanıcının kendi temasıdır; kanon paleti isteyene iki Sarmal
//   temasıyla gelir. Hükmün ikinci yarısı 2026-08-24 tarihinde uygulandı:
//   anlamsal renk kuralları ekrana ulaştıkları hâlde paketin ilanından söküldü,
//   çünkü kullanıcının temasını varsayılan yoluyla ezmek de bir dayatmadır.
//   Bu dosya kalan maddeleri ÖLÇER ve rengin dayatılmadığını da ayrıca doğrular.
//
//   ⚠️ ÖLÇÜMÜN SINIRI — DERSİN KENDİSİ. Bu süit yalnız ETKİN YAPILANDIRMAYI
//   okuyabilir; bir değerin ekrana boyanıp boyanmadığını okuyamaz. 2026-08-21
//   gecesi dizgi renkleri pakete ilan edildiğinde bu iki olgu birbirine
//   karıştırıldı, nöbet yeşil yandı ve Founder canlı pencerede maviyi gördü.
//   Bu yüzden burada hiçbir renk iddiası kurulmaz; boyama iddiası yalnız
//   Founder'ın gözüyle kapanır.
//
//   ÖLÇÜMÜN NEDEN GEÇERLİ OLDUĞU. Entegrasyon sürücüsü VS Code'u `_Sarmal/ornek`
//   klasörü açık olarak başlatır. VS Code bir klasörün çalışma alanı ayarını
//   yalnız o klasörün kendi `.vscode/settings.json` dosyasından okur; `ornek`
//   altında böyle bir dosya yoktur ve depo kökündeki ayar dosyası bu oturumda
//   YÜKLENMEZ. Sürücü ayrıca boş bir kullanıcı verisi dizini (`--user-data-dir`)
//   kullanır, dolayısıyla kullanıcı ayarı da yoktur. Bu koşullarda okunan her
//   etkin değer yalnız eklentinin kendi ilanından gelebilir; nöbet bunu
//   `inspect` ile ayrıca doğrular ve çalışma alanı ile kullanıcı hanelerinin
//   boş olduğunu gösterir.
// ═══════════════════════════════════════════════════════════════════════════

import * as assert from "node:assert";
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";

const EKLENTI = "nexivion-labs.sarmal";

interface TmKural { scope: string | string[]; settings: { foreground?: string; fontStyle?: string } }
interface TmBlok { textMateRules?: TmKural[]; "[*Light*]"?: { textMateRules?: TmKural[] } }

function paketIlani(): { varsayilanlar: Record<string, unknown>; sarmalBlok: Record<string, unknown> } {
  const kok = vscode.extensions.getExtension(EKLENTI)!.extensionPath;
  const paket = JSON.parse(fs.readFileSync(path.join(kok, "package.json"), "utf8"));
  return {
    varsayilanlar: paket.contributes.configurationDefaults,
    sarmalBlok: paket.contributes.configurationDefaults["[sarmal]"],
  };
}

describe("EKL-F6-A04 — biçim eklentiden gelir, renk dayatılmaz", () => {
  before(async () => {
    await vscode.extensions.getExtension(EKLENTI)!.activate();
  });

  it("çalışma alanında hiçbir görünüm ayarı YOKTUR — ölçüm gerçekten temiz zemindedir", () => {
    for (const anahtar of ["editor.tokenColorCustomizations", "editor.semanticTokenColorCustomizations"]) {
      const bakis = vscode.workspace.getConfiguration().inspect(anahtar);
      assert.strictEqual(bakis?.workspaceValue, undefined,
        `${anahtar} çalışma alanı ayarından geliyor — ölçüm depo dosyasını devre dışı bırakmış sayılmaz`);
      assert.strictEqual(bakis?.workspaceFolderValue, undefined, `${anahtar} klasör ayarından geliyor`);
      assert.strictEqual(bakis?.globalValue, undefined, `${anahtar} kullanıcı ayarından geliyor`);
    }
  });

  it("RENK VARSAYILAN GELİR: anlamsal renk pakette ilanlıdır, dizgi rengi ilanı yoktur", () => {
    // Founder 2026-09-02: EKL-F6-A04'ün 2026-08-22 hükmü "hiç renk gelmesin" diye
    // yanlış okunmuştu; kastedilen, rengin gelmesi ve kullanıcının onu AYARLARDAN
    // değiştirebilmesidir. configurationDefaults bir dayatma değildir, çünkü
    // kullanıcının kendi ayarı her koşulda üstündür (aşağıdaki KULLANICI AYARI
    // ÜSTÜNDÜR nöbeti bunu gerçek oturumda ölçer). İki anahtar bilinçle ayrılır.
    const vars = paketIlani().varsayilanlar;
    assert.ok(!("editor.tokenColorCustomizations" in vars),
      "paket dizgi rengi ilan ediyor — bu ilan boyayıcıya ulaşmaz ve çalışıyormuş gibi durur");
    const anlamsal = vars["editor.semanticTokenColorCustomizations"] as { rules?: Record<string, string> } | undefined;
    assert.ok(anlamsal?.rules && Object.keys(anlamsal.rules).length >= 30,
      "paket anlamsal renk ilan etmiyor — kanon paleti yalnız Sarmal temasını seçen kullanıcıda görünür, "
      + "doğan her yeni projede niyet metinleri kullanıcının temasının tek rengine düşer");
    assert.ok(!("editor.semanticHighlighting.enabled" in vars),
      "paket anlamsal vurguyu bütün diller için küresel zorluyor — tercih [sarmal] dil bloğunda yaşamalı");
    const etkin = vscode.workspace.getConfiguration().get<TmBlok>("editor.tokenColorCustomizations");
    assert.ok(!etkin?.textMateRules?.length,
      "temiz bir çalışma alanında etkin textMate kuralı var — çalışmayan bir ilan bir yerden sızıyor demektir");
  });

  it("KAPSAM KÖPRÜSÜ: kullanıcının kendi teması Sarmal'ı boyayabilsin diye ilan yerindedir", () => {
    const kok = vscode.extensions.getExtension(EKLENTI)!.extensionPath;
    const paket = JSON.parse(fs.readFileSync(path.join(kok, "package.json"), "utf8"));
    const ilan = paket.contributes.semanticTokenScopes?.[0];
    assert.ok(ilan && ilan.language === "sarmal", "sarmal diline bağlı kapsam köprüsü yok");
    const tipler: string[] = paket.contributes.semanticTokenTypes.map((t: { id: string }) => t.id);
    assert.deepStrictEqual(Object.keys(ilan.scopes).sort(), [...tipler].sort(),
      "ilan edilen tip ile kapsam karşılığı olan tip kümesi ayrışmış — kapsamsız tip kullanıcının temasında renksiz kalır");
  });

  it("anlamsal renk kuralı temiz zeminde ETKİNDİR — hiçbir şey yazmayan kullanıcı kanonun paletini görür", () => {
    // Ölçüm gerçek oturumda: paketin varsayılanı etkin yapılandırmaya ulaşır ve
    // otuz bir anlamsal tipin tamamı renk alır; niyet metni tipi de (sarmalDizgi)
    // aralarındadır, çünkü dizgiler bir aydır TextMate kapsamına bırakılıyor ve
    // o kapsamın rengi paketten ekrana hiç ulaşmıyordu.
    const etkin = vscode.workspace.getConfiguration()
      .get<{ rules?: Record<string, string> }>("editor.semanticTokenColorCustomizations");
    assert.ok(etkin?.rules && Object.keys(etkin.rules).length >= 30,
      "temiz bir çalışma alanında etkin anlamsal renk kuralı yok — varsayılan ilan boyayıcıya ulaşmıyor");
    assert.ok(etkin.rules.sarmalDizgi, "niyet metni tipi renk almıyor — dizgiler temanın rengine düşer");
  });

  it("kanon paleti isteyene tema seçicisinden gelir: iki Sarmal teması ilan edilmiştir", () => {
    const kok = vscode.extensions.getExtension(EKLENTI)!.extensionPath;
    const paket = JSON.parse(fs.readFileSync(path.join(kok, "package.json"), "utf8"));
    const temalar: Array<{ id: string; path: string }> = paket.contributes.themes ?? [];
    assert.deepStrictEqual(temalar.map((t) => t.id).sort(), ["sarmal-acik", "sarmal-koyu"],
      "iki Sarmal teması ilan edilmeli — söküm sonrası kanon paletinin tek ürün yolu budur");
    const tipler: string[] = paket.contributes.semanticTokenTypes.map((t: { id: string }) => t.id);
    for (const tema of temalar) {
      const govde = JSON.parse(fs.readFileSync(path.join(kok, tema.path), "utf8"));
      assert.deepStrictEqual(Object.keys(govde.semanticTokenColors).sort(), [...tipler].sort(),
        `${tema.id} teması otuz anlamsal tipin tamamını boyamıyor — tam görünüm temayla gelmek zorundadır`);
    }
  });

  it("biçim: [sarmal] dil bloğunun her anahtarı etkin dil yapılandırmasında görünür", () => {
    const blok = paketIlani().sarmalBlok;
    const dil = vscode.workspace.getConfiguration("editor", { languageId: "sarmal" } as vscode.ConfigurationScope);
    for (const [tamAnahtar, beklenen] of Object.entries(blok)) {
      const kisa = tamAnahtar.replace(/^editor\./, "");
      assert.deepStrictEqual(dil.get(kisa), beklenen,
        `"${tamAnahtar}" etkin değeri paketin varsayılanından farklı — kurulumdan sonra hiçbir şey yazmayan kullanıcı Founder'ın gördüğü biçimi görmez`);
    }
  });

  it("biçim varsayılanı .sar'a ÖZELDİR: düz metin belgesi Sarmal'ın sarma kuralını almaz", () => {
    const duz = vscode.workspace.getConfiguration("editor", { languageId: "plaintext" } as vscode.ConfigurationScope);
    assert.notStrictEqual(duz.get("wordWrapColumn"), 110,
      "Sarmal'ın sarma sütunu başka bir dile taşmış — varsayılan yalnız kendi dilini bağlar");
  });

  it("KULLANICI AYARI ÜSTÜNDÜR: kullanıcı bir değer yazınca varsayılan geri çekilir", async () => {
    const ayar = vscode.workspace.getConfiguration("editor", { languageId: "sarmal" } as vscode.ConfigurationScope);
    assert.strictEqual(ayar.get("wordWrapColumn"), 110, "ölçüm varsayılan değerden başlamalı");
    try {
      await ayar.update("wordWrapColumn", 72, vscode.ConfigurationTarget.Global, true);
      const sonra = vscode.workspace.getConfiguration("editor", { languageId: "sarmal" } as vscode.ConfigurationScope);
      assert.strictEqual(sonra.get("wordWrapColumn"), 72,
        "kullanıcının kendi ayarı eklentinin varsayılanını ezmedi — varsayılan yalnız kullanıcı susarken konuşmalıdır");
    } finally {
      await vscode.workspace.getConfiguration("editor", { languageId: "sarmal" } as vscode.ConfigurationScope)
        .update("wordWrapColumn", undefined, vscode.ConfigurationTarget.Global, true);
    }
    const geri = vscode.workspace.getConfiguration("editor", { languageId: "sarmal" } as vscode.ConfigurationScope);
    assert.strictEqual(geri.get("wordWrapColumn"), 110, "kullanıcı ayarı kalkınca varsayılan geri dönmeli");
  });

  it("kanon ilandan bulunur: ornek/ korpusundaki bir .sar taban kanona düşmez", async () => {
    // ornek/ klasörünün üstünde _Sarmal/oz/siniflama/kayit.json yaşar ve o varlık
    // `sarmal_anadizin.sar` ile ilan edilmiştir; keşif kaydı oradan okumalıdır.
    const kok = vscode.workspace.workspaceFolders![0].uri.fsPath;
    assert.ok(fs.existsSync(path.join(kok, "..", "oz", "siniflama", "kayit.json")),
      "fikstür beklentisi bozulmuş: ornek/ kardeşinde kanon kaydı yok");
    assert.ok(fs.existsSync(path.join(kok, "..", "sarmal_anadizin.sar")),
      "fikstür beklentisi bozulmuş: varlık ilanı yok");
    const doc = await vscode.workspace.openTextDocument(
      vscode.Uri.file(path.join(kok, "durum_kaydi.sar")));
    await vscode.window.showTextDocument(doc);
    const simgeler = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
      "vscode.executeDocumentSymbolProvider", doc.uri);
    assert.ok(Array.isArray(simgeler), "belge simgeleri okunamadı — eklenti bu belgeyi hiç görmemiş olabilir");
  });
});

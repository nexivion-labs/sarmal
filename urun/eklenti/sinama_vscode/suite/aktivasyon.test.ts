// ═══════════════════════════════════════════════════════════════════════════
// aktivasyon.test.ts — 🧪 GERÇEK VS Code'da eklenti doğrulaması
//
//   Birim testlerin GÖREMEDİĞİ: eklenti aktifleşiyor mu · 14 komut kayıtlı mı ·
//   bozuk .sar'a CANLI tanı düşüyor mu · hover Türkçe (metod diacritikli) mi ·
//   üç sunum yüzeyinin ikisi gerçekten kayıtlı mı ve bir hatırlatıcı kaydı
//   kendi yüzeyinde tam bir kez mi görünüyor.
// ═══════════════════════════════════════════════════════════════════════════

import * as assert from "node:assert";
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import type { YuzeyDagilimi } from "../../src/yuzey-cekirdek.ts";

const EKLENTI = "nexivion-labs.sarmal";

/** Eklentinin dış yüzü — iki yeni yüzeyin panel içeriği buradan okunur. */
interface EklentiYuzu {
  yuzeyKayitlari(): YuzeyDagilimi;
}

// Geçici .sar'lar workspace (ornek/) ALTINDA yazılır — eklenti snfBul ile yukarı
// yürüyüp _Sarmal/oz/siniflama/kayit.json'u bulsun (untitled belgede yol yok → kanon yok).
const gecicilerSil: string[] = [];
function geciciSar(ad: string, icerik: string): vscode.Uri {
  const kok = vscode.workspace.workspaceFolders![0].uri.fsPath;
  const tam = path.join(kok, ad);
  fs.writeFileSync(tam, icerik, "utf8");
  gecicilerSil.push(tam);
  return vscode.Uri.file(tam);
}

/** Bir koşul sağlanana dek kısa aralıklarla bekler (tanı/aktivasyon asenkron). */
async function bekle(kosul: () => boolean, msSon = 10_000): Promise<boolean> {
  const bitis = Date.now() + msSon;
  while (Date.now() < bitis) {
    if (kosul()) return true;
    await new Promise((r) => setTimeout(r, 200));
  }
  return kosul();
}

describe("Sarmal eklenti — gerçek VS Code entegrasyonu", () => {
  after(() => {
    for (const y of gecicilerSil) try { fs.unlinkSync(y); } catch { /* zaten yok */ }
  });

  it("eklenti bulunur ve aktifleşir", async () => {
    const ext = vscode.extensions.getExtension(EKLENTI);
    assert.ok(ext, `${EKLENTI} bulunamadı`);
    await ext!.activate();
    assert.ok(ext!.isActive, "eklenti aktifleşmedi");
  });

  it("14 sarmal.* komutu kayıtlı", async () => {
    const hepsi = await vscode.commands.getCommands(true);
    const sarmal = hepsi.filter((k) => k.startsWith("sarmal."));
    assert.ok(sarmal.length >= 14, `beklenen ≥14 komut, bulunan ${sarmal.length}: ${sarmal.join(", ")}`);
    // çekirdek komutlar isimden doğrulanır (giydir: BKM-SNV2-A03 görünüm paritesi)
    for (const k of ["sarmal.onizleme", "sarmal.kaynagaDon", "sarmal.giydir"]) {
      assert.ok(sarmal.includes(k), `komut kayıtlı değil: ${k}`);
    }
  });

  it("bozuk .sar'a CANLI tanı düşer (bilinmeyen-tip + öneri)", async () => {
    const uri = geciciSar("_gecici-bozuk.sar", "Bloo( kod: X )\n");
    const doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc);
    // Soğuk ilk koşu payı (Sol RED-2): tekil hızlı yol tanıyı ~anında düşürür;
    // 20 sn yalnız fresh-VS Code başlangıç yükü için emniyet payıdır.
    await bekle(() => vscode.languages.getDiagnostics(uri).length > 0, 20_000);
    const tanilar = vscode.languages.getDiagnostics(uri);
    assert.ok(tanilar.length > 0, "bozuk .sar'a tanı düşmedi");
    assert.ok(
      tanilar.some((t) => /Blok/.test(t.message)),
      `'Bunu mu demek istedin: Blok?' önerisi beklenirdi; gelen: ${tanilar.map((t) => t.message).join(" | ")}`,
    );
    // varlık-etiketi regresyon nöbeti (Founder canlı yakaladı): kaynak "Sarmal · <varlık>"
    // etiketli olsa da satır-içi süzgeç (sarmalKaynakli) onu BİZDEN saymalı —
    // yoksa satır-içi mesajlar sessizce kaybolur ("sadece uyarı yazıyor" hatası).
    const { sarmalKaynakli } = await import("../../src/satirici.ts");
    for (const t of tanilar) {
      assert.ok(sarmalKaynakli(t.source),
        `satır-içi süzgeç bu kaynağı kaçırıyor: "${t.source}" — varlık-etiketi regresyonu`);
    }
  });

  it("temiz .sar (Blok) hata-tanısız geçer", async () => {
    const uri = geciciSar("_gecici-temiz.sar", 'Blok( kod: BLK-OK, ne: "temiz düğüm" )\n');
    const doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc);
    await new Promise((r) => setTimeout(r, 1500)); // tanı hesabına zaman tanı
    const hatalar = vscode.languages
      .getDiagnostics(uri)
      .filter((t) => t.severity === vscode.DiagnosticSeverity.Error);
    assert.equal(hatalar.length, 0, `temiz Blok hata vermemeli; gelen: ${hatalar.map((t) => t.message).join(" | ")}`);
  });

  it("hover Türkçe açıklama verir · metod DİACRİTİKLİ (mutabakat düzeltmesi canlı)", async () => {
    const uri = geciciSar("_gecici-uc.sar", 'Uç( kod: UC-X, metod: GET, yol: "/giris" )\n');
    const doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc);
    const pos = new vscode.Position(0, doc.getText().indexOf("metod") + 1);
    const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
      "vscode.executeHoverProvider",
      uri,
      pos,
    );
    assert.ok(hovers && hovers.length > 0, "metod parametresine hover gelmedi (diacritik eşleşmesi?)");
    const metin = hovers
      .flatMap((h) => h.contents.map((c) => (typeof c === "string" ? c : c.value)))
      .join(" ");
    assert.ok(/metod|HTTP/i.test(metin), `hover metni beklenen içeriği taşımıyor: ${metin.slice(0, 120)}`);
  });

  it("F12 tanıma gider + ⇧F12 atıfları bulur — kimlik gezinme (EKL-F11-A02 · YUZ-3.2)", async () => {
    const uri = geciciSar(
      "_gecici-gezinme.sar",
      'Faz( kod: GZN-FAZ, ad: "gezinme" ) {\n' +
        '  Adım( kod: GZN-A01, durum: beklemede, ne: "hedef" )\n' +
        '  Adım( kod: GZN-A02, durum: beklemede, bağımlı: [ GZN-A01 ], ne: "GZN-A01 üstüne gelir" )\n' +
        "}\n",
    );
    const doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc);
    await new Promise((r) => setTimeout(r, 800)); // indeks beslemesi (watcher) yetişsin

    // F12: bağımlı: [ GZN-A01 ] atıfından tanım satırına (satır 1, 0-tabanlı)
    const atifPoz = new vscode.Position(2, doc.lineAt(2).text.indexOf("GZN-A01") + 2);
    const tanimlar = await vscode.commands.executeCommand<vscode.Location[]>(
      "vscode.executeDefinitionProvider", uri, atifPoz);
    assert.ok(tanimlar && tanimlar.length >= 1, "F12: bağımlı atıfından tanım dönmedi");
    assert.equal(tanimlar[0].range.start.line, 1,
      `F12 yanlış satıra gitti: ${tanimlar[0].range.start.line} (beklenen 1)`);

    // ⇧F12: tanımın üstünde referanslar — bağımlı listesi + ne: metni (≥2 atıf)
    const tanimPoz = new vscode.Position(1, doc.lineAt(1).text.indexOf("GZN-A01") + 2);
    const atiflar = await vscode.commands.executeCommand<vscode.Location[]>(
      "vscode.executeReferenceProvider", uri, tanimPoz);
    assert.ok(atiflar && atiflar.length >= 2,
      `⇧F12: ≥2 konum beklenirdi (bağımlı + metin [+ tanım]), gelen: ${atiflar?.length ?? 0}`);
    // executeReferenceProvider tanımı da (satır 1) listeler; asıl atıflar satır 2'de.
    const satirlar = atiflar.map((a) => a.range.start.line);
    assert.equal(satirlar.filter((s) => s === 2).length, 2,
      `3. satırda TAM 2 atıf (bağımlı+ne) beklenirdi; gelen satırlar: [${satirlar.join(", ")}]`);
    assert.ok(satirlar.every((s) => s === 1 || s === 2),
      `beklenmeyen satırda atıf: [${satirlar.join(", ")}]`);
  });

  it("F2 yeniden-adlandırır (tanım+atıflar tek edit) + Ctrl+T sembol bulur (EKL-F11-A03)", async () => {
    const uri = geciciSar(
      "_gecici-f2.sar",
      'Faz( kod: RNM-FAZ, ad: "renklendirme-ozel" ) {\n' +
        '  Adım( kod: RNM-A01, durum: beklemede, ne: "hedef" )\n' +
        '  Adım( kod: RNM-A02, durum: beklemede, bağımlı: [ RNM-A01 ], ne: "RNM-A01 sonrası" )\n' +
        "}\n",
    );
    const doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc);
    await new Promise((r) => setTimeout(r, 500));

    // F2: RNM-A01 → RNM-B99; tanım (satır 1) + bağımlı + ne metni (satır 2) = 3 konum
    const poz = new vscode.Position(1, doc.lineAt(1).text.indexOf("RNM-A01") + 2);
    const edit = await vscode.commands.executeCommand<vscode.WorkspaceEdit>(
      "vscode.executeDocumentRenameProvider", uri, poz, "RNM-B99");
    assert.ok(edit, "F2: WorkspaceEdit dönmedi");
    const girisler = edit.entries();
    const toplam = girisler.reduce((n, [, edits]) => n + edits.length, 0);
    assert.equal(toplam, 3, `F2: 3 konum beklenirdi (tanım+bağımlı+metin), gelen ${toplam}`);
    assert.ok(girisler.every(([, edits]) => edits.every((e) => e.newText === "RNM-B99")));

    // Ctrl+T: kod VE ad araması aynı tanımı bulur
    const kodla = await vscode.commands.executeCommand<vscode.SymbolInformation[]>(
      "vscode.executeWorkspaceSymbolProvider", "RNM-FAZ");
    assert.ok(kodla?.some((s) => s.name === "RNM-FAZ"), "Ctrl+T: kod araması bulamadı");
    const adla = await vscode.commands.executeCommand<vscode.SymbolInformation[]>(
      "vscode.executeWorkspaceSymbolProvider", "renklendirme-ozel");
    assert.ok(adla?.some((s) => s.name === "RNM-FAZ"), "Ctrl+T: ad araması bulamadı");
  });

  it("( imzası kanondan açılır + referans: yolu tıklanır link olur (EKL-F11-A04)", async () => {
    // İmza: Adım( sonrası — kanondaki Adım şeması parametreleriyle
    const uriImza = geciciSar("_gecici-imza.sar", "Adım( ");
    const docImza = await vscode.workspace.openTextDocument(uriImza);
    await vscode.window.showTextDocument(docImza);
    const yardim = await vscode.commands.executeCommand<vscode.SignatureHelp>(
      "vscode.executeSignatureHelpProvider", uriImza, new vscode.Position(0, 6), "(");
    assert.ok(yardim && yardim.signatures.length > 0, "imza yardımı açılmadı");
    assert.ok(yardim.signatures[0].label.startsWith("Adım("),
      `imza etiketi beklenmedik: ${yardim.signatures[0].label}`);
    assert.ok(yardim.signatures[0].parameters.length >= 2, "parametre listesi boş");

    // Link: var olan dosyaya link ÜRETİLİR, olmayana ÜRETİLMEZ
    geciciSar("_gecici-hedef.md", "# hedef\n");
    const uriLink = geciciSar(
      "_gecici-link.sar",
      'Adım( kod: LNK-A01, durum: beklemede, referans: [ "_gecici-hedef.md", "yok_boyle_dosya.md" ], ne: "link testi" )\n');
    await vscode.workspace.openTextDocument(uriLink);
    const linkler = await vscode.commands.executeCommand<vscode.DocumentLink[]>(
      "vscode.executeLinkProvider", uriLink);
    const bizim = (linkler ?? []).filter((l) => l.target?.fsPath.endsWith("_gecici-hedef.md"));
    assert.equal(bizim.length, 1, `var olan dosyaya 1 link beklenirdi, gelen ${bizim.length}`);
    assert.ok(!(linkler ?? []).some((l) => l.target?.fsPath.includes("yok_boyle_dosya")),
      "olmayan dosyaya link üretilmemeliydi");
  });

  // ── 🧭 ÜÇ SUNUM YÜZEYİ — gerçek editör kabuğunda ─────────────────────────
  //   Birim süiti dağıtım işlevini koşturur ama görünüşlerin gerçekten kayıtlı
  //   olduğunu ve canlı yolda bir kaydın kendi panelinde TAM BİR KEZ göründüğünü
  //   göremez; o ölçüm yalnız burada yapılabilir.

  it("iki yeni görünüş gerçek VS Code'da kayıtlı: Hatırlatıcılar ve Bildirimler açılabiliyor", async () => {
    const ext = vscode.extensions.getExtension(EKLENTI);
    assert.ok(ext, `${EKLENTI} bulunamadı`);
    await ext!.activate();
    const komutlar = await vscode.commands.getCommands(true);
    for (const gorunus of ["sarmalHatirlaticilar", "sarmalBildirimler"]) {
      assert.ok(
        komutlar.includes(`${gorunus}.focus`),
        `"${gorunus}" görünüşü gerçek VS Code'da kayıtlı değil; odak komutu üretilmemiş`,
      );
    }
    // Kayıt bildirimde kalmış olamaz: görünüşler gerçekten açılabilmelidir.
    await vscode.commands.executeCommand("sarmalHatirlaticilar.focus");
    await vscode.commands.executeCommand("sarmalBildirimler.focus");
  });

  it("hatırlatıcı taşıyan .sar açılınca kayıt Hatırlatıcılar yüzeyinde TAM BİR KEZ görünür", async () => {
    const ext = vscode.extensions.getExtension(EKLENTI);
    assert.ok(ext, `${EKLENTI} bulunamadı`);
    const yuz = (await ext!.activate()) as EklentiYuzu;
    assert.ok(typeof yuz?.yuzeyKayitlari === "function",
      "eklenti yüzey okuma kapısını dışarı vermiyor; gerçek görünüş ölçülemez");

    const uri = geciciSar(
      "_gecici-hatirlatici.sar",
      "Hatırlatıcı( kod: SONRAYA-BIRAKILAN-IS, durum: açık, çapa: gelecek, " +
        'ne: "sonra dönülecek iş", dönüşTetikleyici: "bu iş hangi olay olunca canlanır" )\n',
    );
    const doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc);

    const bizimkiler = (): readonly unknown[] =>
      yuz.yuzeyKayitlari().hatırlatıcılar
        .filter((k) => k.dosya === uri.fsPath && k.tani.kod === "açık-hatırlatıcı");
    // Soğuk ilk koşu payı — tekil hızlı yol kaydı ~anında düşürür.
    await bekle(() => bizimkiler().length > 0, 20_000);

    assert.equal(bizimkiler().length, 1,
      `Hatırlatıcılar yüzeyinde tam bir kayıt beklenirdi, bulunan ${bizimkiler().length}`);

    // Aynı kayıt Problems'a DÜŞMEZ: doğası düzeltilecek bir sapma değildir.
    const problemsta = vscode.languages.getDiagnostics(uri)
      .filter((t) => String(t.code) === "açık-hatırlatıcı");
    assert.equal(problemsta.length, 0,
      `bilinçli hatırlatıcı Problems'a sızdı (${problemsta.length} kayıt); yüzey ayrımı bozulmuş`);

    // Bildirimler yüzeyine de sızmaz: bir kayıt tam olarak bir yüzeye gider.
    const bildirimlerde = yuz.yuzeyKayitlari().bildirimler
      .filter((k) => k.dosya === uri.fsPath && k.tani.kod === "açık-hatırlatıcı");
    assert.equal(bildirimlerde.length, 0,
      "bilinçli hatırlatıcı Bildirimler yüzeyinde de görünüyor; çift yayın vardır");
  });

  it("DAG döngüsü Problems'e düşer — cross-file döngü-denetimi (ORK-1.2)", async () => {
    // X↔Y karşılıklı bağımlı: tek-dosya `tanila` (şema) bunu GÖREMEZ; yalnız
    // denetleHepsi'nin cross-file DAG motoru yakalar → gerçek Problems kanıtı.
    const uri = geciciSar(
      "_gecici-dongu.sar",
      'Blok( kod: GBLK, ne: "döngü testi" ) {\n' +
        '  Faz( kod: GFZ, ad: "f" ) {\n' +
        '    Katman( kod: GKT, ad: "k" ) {\n' +
        '      Adım( kod: GX, bağımlı: GY, ne: "x" )\n' +
        '      Adım( kod: GY, bağımlı: GX, ne: "y — DÖNGÜ" )\n' +
        "    }\n  }\n}\n",
    );
    // geciciSar diske yazdı → FileSystemWatcher denetleHepsi'yi tetikler (cross-file).
    await vscode.workspace.openTextDocument(uri);
    const dustu = await bekle(
      () => vscode.languages.getDiagnostics(uri).some((t) => String(t.code) === "döngüsel-bağımlılık"),
      15_000,
    );
    const kodlar = vscode.languages.getDiagnostics(uri).map((t) => String(t.code));
    assert.ok(dustu, `döngüsel-bağımlılık tanısı Problems'e düşmedi; gelen kodlar: [${kodlar.join(", ")}]`);
  });
});

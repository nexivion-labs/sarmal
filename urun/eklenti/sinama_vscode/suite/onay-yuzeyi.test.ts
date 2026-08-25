// ═══════════════════════════════════════════════════════════════════════════
// onay-yuzeyi.test.ts — 🧭 ONAY YÜZEYİNİN GERÇEK EDİTÖR KABUĞUNDAKİ ÖLÇÜMÜ
//
//   Birim süiti tarama düzenini ve etkin karar defterini koşturabilir; canlı
//   Comments iş parçacığı sayısını ve etkinleşmede açılan belge sayısını
//   ölçemez, çünkü ikisi de yalnız gerçek VS Code kabuğunda vardır. Founder'ın
//   2026-07-28 tarihli canlı bulgusu tam olarak orada yaşıyordu: Açıklamalar
//   paneli ile Posta Kutusu aynı on bir kapıyı gösteriyordu.
//
//   ÖLÇÜM ÜRETİMİN KENDİ SAYAÇLARINDAN OKUNUR. Eklenti dış yüzü (`activate`
//   dönüşü) `onayOlcumleri()` kapısını verir; nöbet kaynağı ayrıca içeri alsaydı
//   ikinci bir modül örneği okur ve hep sıfır görürdü — yani hiçbir şey ölçmemiş
//   olurdu. Kapı salt-okunurdur ve hiçbir davranış değiştirmez.
//
//   Ölçülen beş olay: etkinleşme · yazma · kaydetme · dış dosya değişikliği ·
//   silme. Kabul ölçüsü her olayda ayrı ayrı söylenir.
// ═══════════════════════════════════════════════════════════════════════════

import * as assert from "node:assert";
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";

const EKLENTI = "nexivion-labs.sarmal";

/** Eklentinin dış yüzü — onay yüzeyinin sayaçları buradan okunur. */
interface OnayYuzu {
  onayOlcumleri(): {
    canliIsParcacigi: number;
    acilanBelge: number;
    olaydanAcilanBelge: number;
    acilistaAcilanBelge: number;
    acilistaOlaydanAcilanBelge: number;
    yerlestirmeTuru: number;
    sonYerlesenKapi: number;
    kapiGorulduMu: boolean;
    yaratilanYuzey: number;
    eldenCikarilanYuzey: number;
    yedekTur: number;
    goruntudenTur: number;
    okunanDosya: number;
    dosyaAramasi: number;
    anaGoruntuHazir: boolean;
  };
  postaKapilari(): { dosya: string; kod: string }[];
}

const gecicilerSil: string[] = [];

/** Onay bekleyen bir kapı taşıyan gerçek Sarmal kaynağı. */
const KAPILI_KAYNAK =
  `Faz( kod: F1, ad: "geçici deneme" ) {\n` +
  `  Blok( kod: B1, ad: "geçici iş" ) {\n` +
  `    Katman( kod: KT1, ad: "geçici teknoloji" ) {\n` +
  `      Adım( kod: GECICI-A01, durum: beklemede, ne: "🧪 karar bekleyen geçici iş",\n` +
  `        kabul: [ "Tasarım Founder tarafından onaylanmıştır — onaysız uygulanmaz" ] )\n` +
  `    }\n` +
  `  }\n` +
  `}\n`;

function geciciSar(ad: string, icerik: string): vscode.Uri {
  const kok = vscode.workspace.workspaceFolders![0].uri.fsPath;
  const tam = path.join(kok, ad);
  fs.writeFileSync(tam, icerik, "utf8");
  gecicilerSil.push(tam);
  return vscode.Uri.file(tam);
}

async function bekle(kosul: () => boolean, msSon = 15_000): Promise<boolean> {
  const bitis = Date.now() + msSon;
  while (Date.now() < bitis) {
    if (kosul()) return true;
    await new Promise((r) => setTimeout(r, 200));
  }
  return kosul();
}

/** Canlı Sarmal onay iş parçacıklarının GERÇEK sayısı — üretim sayacından. */
async function yuz(): Promise<OnayYuzu> {
  const ext = vscode.extensions.getExtension(EKLENTI);
  assert.ok(ext, `${EKLENTI} bulunamadı`);
  const disYuz = (await ext!.activate()) as OnayYuzu;
  assert.ok(typeof disYuz?.onayOlcumleri === "function",
    "eklenti dış yüzü onay ölçümlerini vermiyor; nöbet hiçbir şey ölçemez");
  return disYuz;
}

describe("Sarmal onay yüzeyi — çift yüzey kusurunun canlı ölçümü (VIT-POSTA-A03)", () => {
  after(() => {
    for (const y of gecicilerSil) try { fs.unlinkSync(y); } catch { /* zaten yok */ }
  });

  it("ETKİNLEŞME: canlı Comments iş parçacığı sayısı SIFIRDIR", async () => {
    const y = await yuz();
    // Kuyruğun dolması ana tanı turunun bitmesine bağlıdır; bekleme onun içindir.
    await bekle(() => y.onayOlcumleri().yerlestirmeTuru > 0);
    const o = y.onayOlcumleri();
    assert.strictEqual(o.canliIsParcacigi, 0,
      `etkinleşmeden sonra ${o.canliIsParcacigi} iş parçacığı yaşıyor; ` +
      "Açıklamalar paneli ikinci bir kuyruk olarak geri gelmiş");
  });

  it("ETKİNLEŞME: onay yüzeyinin açtığı HİÇBİR belge etkinleşmenin kendisine bağlı değildir", async () => {
    const y = await yuz();
    await bekle(() => y.onayOlcumleri().yerlestirmeTuru > 0);
    const o = y.onayOlcumleri();
    // Ölçü NEDENSELDİR, zamansal değil. Zamansal pencere yanıltırdı: bu nöbetten
    // önce koşan komşu nöbetler geçici `.sar` dosyaları yaratıyor ve disk
    // izleyicisinin O DOSYALARI okuması meşru davranış. Ölçülen şey şudur:
    // açılış penceresinde açılan her belgenin somut bir dosya olayı ya da
    // kullanıcı eylemi vardır; hiçbiri taramanın ya da yerleşimin kendisinden
    // doğmaz. Eskiden doğuyordu — kapsam içi her `.sar` açılıyordu (298 belge).
    assert.strictEqual(o.acilistaAcilanBelge, o.acilistaOlaydanAcilanBelge,
      `açılışta ${o.acilistaAcilanBelge} belge açıldı, bunların yalnız ` +
      `${o.acilistaOlaydanAcilanBelge} tanesinin somut bir sebebi var; ` +
      "aradaki fark taramanın kendisinin açtığı belgelerdir");
    assert.strictEqual(o.acilanBelge, o.olaydanAcilanBelge,
      "bu modül sebepsiz belge açıyor; tam tarama yolu yine belge açmaya başlamış");
  });

  it("ETKİNLEŞME: onaya ÖZEL tam tarama turu ve dosya okuması sıfırdır", async () => {
    const y = await yuz();
    await bekle(() => y.onayOlcumleri().yerlestirmeTuru > 0);
    const o = y.onayOlcumleri();
    assert.strictEqual(o.anaGoruntuHazir, true,
      "ana tanı hattının görüntüsü onay tarayıcısına ulaşmamış");
    assert.strictEqual(o.yedekTur, 0,
      `onaya ait ${o.yedekTur} bağımsız tam tarama turu koştu; iki tur yarışıyor`);
    assert.strictEqual(o.dosyaAramasi, 0, "onay yüzeyi kendi findFiles turunu açtı");
    assert.strictEqual(o.okunanDosya, 0, "onay yüzeyi ayrıca dosya okudu");
    assert.ok(o.goruntudenTur > 0,
      "kapılar ana görüntüden hiç üretilmemiş; panel boş kalır");
  });

  it("KUYRUK: Posta Kutusu görünüşü kayıtlıdır ve komut ikinci bir liste açmaz", async () => {
    await yuz();
    const komutlar = await vscode.commands.getCommands(true);
    assert.ok(komutlar.includes("sarmal.onayKuyrugu"),
      "komut kimliği değişmiş; kullanıcının kısayolu kopar");
    // Komut yalnız görünüşe odaklanır: çağrı bir seçim listesi açmadan döner.
    // Açılan bir Quick Pick olsaydı çağrı kullanıcı girdisini bekler ve zaman aşımına uğrardı.
    await vscode.commands.executeCommand("sarmal.onayKuyrugu");
    const y = await yuz();
    assert.strictEqual(y.onayOlcumleri().canliIsParcacigi, 0,
      "komut çağrısı bir karar yüzeyi yarattı; komut kısayol olmaktan çıkmış");
  });

  it("YAZMA · KAYDETME · DIŞ DEĞİŞİKLİK · SİLME: hiçbir olay iş parçacığı doğurmaz", async () => {
    const y = await yuz();
    const uri = geciciSar("_gecici-kapi.sar", KAPILI_KAYNAK);
    const doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc);

    // ① Yazma seli: tek geciktirilmiş tur koşar, yüzey yaratılmaz.
    const editor = vscode.window.activeTextEditor!;
    for (let i = 0; i < 3; i += 1) {
      await editor.edit((d) => d.insert(new vscode.Position(0, 0), `// ${i}\n`));
    }
    await new Promise((r) => setTimeout(r, 1_200));
    assert.strictEqual(y.onayOlcumleri().canliIsParcacigi, 0,
      "yazarken karar yüzeyi kendiliğinden açıldı");

    // ② Kaydetme.
    await doc.save();
    await new Promise((r) => setTimeout(r, 500));
    assert.strictEqual(y.onayOlcumleri().canliIsParcacigi, 0,
      "kaydetme karar yüzeyi doğurdu");

    // ③ Dış değişiklik: dosya VS Code dışından yazılır.
    fs.writeFileSync(uri.fsPath, KAPILI_KAYNAK, "utf8");
    await new Promise((r) => setTimeout(r, 1_500));
    assert.strictEqual(y.onayOlcumleri().canliIsParcacigi, 0,
      "dış dosya değişikliği karar yüzeyi doğurdu");

    // ④ Silme.
    fs.unlinkSync(uri.fsPath);
    await new Promise((r) => setTimeout(r, 1_500));
    assert.strictEqual(y.onayOlcumleri().canliIsParcacigi, 0,
      "silme sonrası ölü bir karar yüzeyi kaldı");

    // ⑤ Bütün bu olaylardan sonra maliyet sözleşmesi HÂLÂ geçerlidir. Bu ölçüm
    // burada durur çünkü artık kuyruk GERÇEKTEN doldu: yukarıdaki geçici dosya
    // bir kapı taşıyordu ve nöbet boş küme üstünde koşmuyor.
    const son = y.onayOlcumleri();
    assert.ok(son.kapiGorulduMu,
      "bütün tur boyunca Posta Kutusuna bir tek kapı bile inmedi; nöbet boş küme üstünde koştu");
    assert.strictEqual(son.acilanBelge, son.olaydanAcilanBelge,
      `bu modül ${son.acilanBelge - son.olaydanAcilanBelge} belgeyi sebepsiz açtı; ` +
      "tam tarama yolu yine belge açmaya başlamış");
    assert.strictEqual(son.yedekTur, 0,
      "olay selinde onaya ait bağımsız tam tarama turu koştu");
    assert.strictEqual(son.okunanDosya, 0,
      "olay selinde onay yüzeyi çalışma alanını ayrıca okudu");
  });

  // ⚠️ BU HÜKÜM 2026-07-29'DA YENİ MİMARİYE GEÇİRİLDİ.
  //
  //   Eski hâli şunu bekliyordu: "bir tıklama TAM BİR karar yüzeyi açar" ve
  //   `canliIsParcacigi === 1` ölçüyordu. O beklenti bugün KUSURU KORUYORDU:
  //   aynı oturumda yapılan ölçüm, "Kapıya git" satırının çizilmeyen bir Comments
  //   penceresi kurduğunu (`canlı yüzey: 1`) ve kullanıcının dosyaya gidip orada
  //   boşluk bulduğunu gösterdi. Comments karar penceresi görünür akıştan emekliye
  //   ayrıldı; nöbet artık ters hükmü korur: HİÇBİR giriş noktası görünür karar
  //   nesnesi üretmez ve "Kapıya git" yalnız kaynağı doğru satırda açar.
  it("PANEL SATIRI: 'Kapıya git' kaynağı açar ve HİÇBİR karar penceresi yaratmaz", async () => {
    const y = await yuz();
    const uri = geciciSar("_gecici-secim.sar", KAPILI_KAYNAK);
    await bekle(() => y.onayOlcumleri().sonYerlesenKapi > 0, 8_000);

    // Adım açılış satırı kaynakta dördüncü satırdır (0-tabanlı üç).
    const oncekiAcilan = y.onayOlcumleri().acilanBelge;
    await vscode.commands.executeCommand("sarmal.postaKapisiAc", uri.fsPath, 3, "GECICI-A01");
    let o = y.onayOlcumleri();
    assert.strictEqual(o.canliIsParcacigi, 0,
      `"Kapıya git" ${o.canliIsParcacigi} karar penceresi kurdu; kullanıcı çizilmeyen bir yüzeye gönderiliyor`);
    assert.strictEqual(o.yaratilanYuzey, 0,
      `${o.yaratilanYuzey} Comments nesnesi yaratıldı; emekli yüzey geri gelmiş`);
    assert.strictEqual(o.acilanBelge - oncekiAcilan, 1,
      `bir satır tıklaması ${o.acilanBelge - oncekiAcilan} belge açtı; yalnız bir tane açmalıydı`);

    // KULLANICI SONUCU: doğru dosya, doğru satır. Ölçülen şey sayaç değil, imleçtir.
    const editor = vscode.window.activeTextEditor;
    assert.ok(editor, "kaynak hiç açılmadı; kapıya git satırı boşa düştü");
    assert.strictEqual(editor!.document.uri.fsPath, uri.fsPath,
      "başka bir dosya açıldı");
    assert.strictEqual(editor!.selection.active.line, 3,
      `imleç ${editor!.selection.active.line}. satırda; kapı 3. satırdaydı`);

    // İkinci tıklama da hiçbir yüzey doğurmaz.
    await vscode.commands.executeCommand("sarmal.postaKapisiAc", uri.fsPath, 3, "GECICI-A01");
    o = y.onayOlcumleri();
    assert.strictEqual(o.yaratilanYuzey, 0, "ikinci tıklama Comments nesnesi doğurdu");
    assert.strictEqual(o.canliIsParcacigi, 0, "ikinci tıklamadan sonra canlı yüzey var");

    fs.unlinkSync(uri.fsPath);
    await bekle(() => y.onayOlcumleri().sonYerlesenKapi === 0, 8_000);
    const kapanis = y.onayOlcumleri();
    assert.strictEqual(kapanis.yaratilanYuzey, kapanis.eldenCikarilanYuzey,
      "kapanışta yaratılan ve elden çıkarılan yüzey sayıları eşit değil; nesne sızdı");
  });

  // ═════════════════════════════════════════════════════════════════════════
  // ✍️ PANEL İÇİ GEREKÇE — gerçek kabukta ölçülebilen ve ÖLÇÜLEMEYEN kısım
  //
  //   Bu nöbetin eski hâli ağacı gerçek liste komutlarıyla geziyordu
  //   (`list.focusFirst` · `list.focusDown` · `list.select`). Posta Kutusu
  //   2026-07-29'da panel içi karar yüzeyine (webview) çevrildi, çünkü ağaç
  //   satırı metin alanı barındıramaz ve QuickInput yüzeylerinin konumu
  //   değiştirilemez — Founder'ın üç kez bildirdiği şikâyetin tek çözümü buydu.
  //
  //   ⚠️ ÖLÇÜLEMEYEN ŞEY DÜRÜSTÇE YAZILIR: eklenti sunucusu bir webview'in DOM
  //   olaylarını süremez. "Kullanıcı kutuya yazıp Şerhle onayla düğmesine bastı"
  //   dizisi bu süitte SİMÜLE EDİLEMEZ ve edilmedi. Panelin o düğmeye bastığında
  //   gönderdiği mesajın karşılığı olan KOMUT burada gerçek dosya üstünde
  //   koşturulur; gövdenin yerleşimi ise birim süitinde gerçek gövde basılarak
  //   ölçülür. İkisinin arasında kalan tek halka, tarayıcı olayının kendisidir.
  //
  //   BURADA ÖLÇÜLEN ŞEY GERÇEKTİR VE ÖNEMLİDİR: ① gerekçe komut sınırından
  //   geçerek DİSKE iniyor ve tek satır değiştiriyor, ② çağrı hiçbir yerde
  //   kullanıcı girdisi BEKLEMİYOR — eski hâlinde `showInputBox` açılırdı ve bu
  //   çağrı zaman aşımına uğrardı, ③ boş gerekçe, iptal ve artık gerekçe
  //   yollarının hiçbiri diske dokunmuyor.
  // ═════════════════════════════════════════════════════════════════════════
  it("PANEL İÇİ GEREKÇE: şerh diske iner, TEK satır değiştirir ve hiçbir giriş kutusu BEKLETMEZ", async () => {
    const y = await yuz();
    const uri = geciciSar("_gecici-serh.sar", KAPILI_KAYNAK);
    await bekle(() => y.onayOlcumleri().sonYerlesenKapi > 0, 10_000);

    // Panelin "Şerhle onayla" düğmesine basınca gönderdiği isteğin ta kendisi.
    // Çağrı ÇÖZÜLMEK ZORUNDADIR: bir QuickInput açılsaydı burada asılı kalırdı.
    const basla = Date.now();
    const sonuc = await Promise.race([
      vscode.commands.executeCommand<{ tur: string } | undefined>(
        "sarmal.postaKararVer", uri.fsPath, 3, "GECICI-A01",
        "şerhle onaylandı", "📝", true, "panel içi gerekçe denemesi"),
      new Promise((r) => setTimeout(() => r("ZAMAN_AŞIMI"), 12_000)),
    ]);
    assert.notStrictEqual(sonuc, "ZAMAN_AŞIMI",
      "karar çağrısı çözülmedi; bir yerde kullanıcı girdisi bekleniyor — " +
      "pencerenin tepesindeki giriş kutusu geri gelmiş olabilir");
    assert.ok(Date.now() - basla < 12_000, "karar çağrısı beklemede kaldı");
    assert.strictEqual((sonuc as { tur: string }).tur, "başarı",
      `karar kanıtlanamadı: ${JSON.stringify(sonuc)}`);

    const diskte = fs.readFileSync(uri.fsPath, "utf8");
    assert.ok(/onay:\s*"şerhle onaylandı/.test(diskte),
      "şerh kararı diske inmedi; kanıtlı yazım hattı kırılmış");
    assert.ok(diskte.includes("panel içi gerekçe denemesi"),
      "panelde yazılan gerekçe kayda geçmemiş; kullanıcının metni yolda düşmüş");

    // Karar TEK SATIR değiştirir; kaydetmede-biçimle dosyayı yeniden yazmaz.
    const once = KAPILI_KAYNAK.split("\n");
    const sonra = diskte.split("\n");
    let degisen = Math.abs(once.length - sonra.length);
    for (let i = 0; i < Math.min(once.length, sonra.length); i += 1) {
      if (once[i] !== sonra[i]) degisen += 1;
    }
    assert.strictEqual(degisen, 1,
      `karar ${degisen} satır değiştirdi; tek alan eklemesi dosyayı yeniden biçimledi`);
    assert.strictEqual(y.onayOlcumleri().yaratilanYuzey, 0,
      "karar hâlâ çizilmeyen bir Comments penceresi kuruyor");

    fs.unlinkSync(uri.fsPath);
  });

  it("BOŞ GEREKÇE · İPTAL · ARTIK GEREKÇE: üçü de diske DOKUNMAZ", async () => {
    await yuz();
    const uri = geciciSar("_gecici-bosgerekce.sar", KAPILI_KAYNAK);
    await new Promise((r) => setTimeout(r, 800));

    const denemeler: readonly [string, boolean, string | undefined][] = [
      // ① Kutu boş bırakıldı: şerh yazılmaz (bugünkü validateInput hükmü).
      ["şerhle onaylandı", true, ""],
      ["reddedildi", true, "   "],
      // ② Kutu hiç doldurulmadan vazgeçildi: iptal, boş kutudan AYRI karşılanır.
      ["reddedildi", true, undefined],
      // ③ Kutuda gerekçe varken düz onay: sessiz kayıp yasak, yazım durur.
      ["onaylandı", false, "yazdığım gerekçe atılmamalı"],
    ];
    for (const [damga, notIster, not] of denemeler) {
      const sonuc = await vscode.commands.executeCommand<{ tur: string } | undefined>(
        "sarmal.postaKararVer", uri.fsPath, 3, "GECICI-A01", damga, "🧪", notIster, not);
      assert.strictEqual(sonuc, undefined,
        `"${damga}" (${JSON.stringify(not)}) yazım hattına geçti; karar yazılmamalıydı`);
      const diskte = fs.readFileSync(uri.fsPath, "utf8");
      assert.strictEqual(diskte, KAPILI_KAYNAK,
        `"${damga}" (${JSON.stringify(not)}) dosyayı değiştirdi; hiçbir kayıt yazılmamalıydı`);
    }

    // Aynı kapı hâlâ açıktır: hiçbir deneme onu kapatmadı.
    const bitis = fs.readFileSync(uri.fsPath, "utf8");
    assert.ok(!/onay:/.test(bitis), "reddedilen yollardan biri yine de onay kaydı yazmış");

    fs.unlinkSync(uri.fsPath);
  });

  it("GEÇERLİ GEREKÇE HÂLÂ YAZAR: reddetme kararı diske iner ve kanıtlanır", async () => {
    await yuz();
    const uri = geciciSar("_gecici-ret.sar", KAPILI_KAYNAK);
    await new Promise((r) => setTimeout(r, 800));

    const sonuc = await vscode.commands.executeCommand<{ tur: string } | undefined>(
      "sarmal.postaKararVer", uri.fsPath, 3, "GECICI-A01", "reddedildi", "⛔", true,
      "  bu tasarım kabul edilmedi  ");
    assert.strictEqual(sonuc?.tur, "başarı", `ret kararı kanıtlanamadı: ${JSON.stringify(sonuc)}`);
    const diskte = fs.readFileSync(uri.fsPath, "utf8");
    assert.ok(/onay:\s*"reddedildi/.test(diskte), "ret kararı diske inmedi");
    // Gerekçe KIRPILARAK yazılır: baştaki ve sondaki boşluk diske sızmaz.
    assert.ok(diskte.includes("· bu tasarım kabul edilmedi"),
      "gerekçe kayda kırpılmadan ya da hiç girmemiş");
    assert.ok(!diskte.includes("·   bu tasarım"), "gerekçe kırpılmadan yazılmış");

    fs.unlinkSync(uri.fsPath);
  });

  // ═════════════════════════════════════════════════════════════════════════
  // 🔁 KARARDAN SONRA KAPI DÜŞER — Founder canlı regresyonu 2026-07-29
  //
  //   Founder 0.9.130'da şunu gördü: "bir tane kapıyı onaylıyorum, onaylanan
  //   kutucuk tekrar gelip onay istiyor." Karar diske iniyor, fakat kapı
  //   panelden düşmüyor; ikinci tıklama ise "kapı bu dosyada bulunamadı"
  //   hatasını doğuruyor — çünkü Adım artık onay damgası taşıyor ve AÇIK KAPI
  //   olmaktan çıktı. O hata kusur değil, kanıtlı yazım hattının doğru
  //   çalıştığının kanıtıdır; asıl kusur panelin tazelenmemesidir.
  //
  //   Yirmi beş nöbet mutasyonla kanıtlandığı hâlde bunu hiçbiri yakalamadı,
  //   çünkü hepsi PARÇALARI ölçüyordu: gövde doğru mu, ölçü doğru mu, mesaj
  //   doğru mu. Kullanıcının gördüğü SONUCU — "karar verdim, kapı gitti" —
  //   ölçen tek bir nöbet yoktu. Bu nöbet o boşluktur.
  // ═════════════════════════════════════════════════════════════════════════
  it("KARARDAN SONRA: kapı panelden DÜŞER ve BİR DAHA geri gelmez", async () => {
    const y = await yuz();

    // ⚠️ KUSURUN KOŞULU YENİDEN KURULUR. Bu nöbetin ilk hâli YEŞİL KALIYORDU ve
    //   sebebi ölçüldü: küçük çalışma alanında tam tanı turu saniyenin altında
    //   biter, dolayısıyla kullanıcının kararından SONRA başlayıp taze içerik
    //   okur ve her şeyi kendiliğinden düzeltir. Founder'ın çalışma alanında ise
    //   yüzlerce .sar vardır; tur kararı ÇEVRELER — karardan önce başlar, sonra
    //   biter — ve kararı hiç görmemiş ağacını panele yerleştirir.
    //   Burada o koşul dolgu dosyalarıyla GERÇEKTEN kurulur; yoksa nöbet kusuru
    //   göremez ve hiçbir şey ölçmemiş olur.
    const dolgular: vscode.Uri[] = [];
    for (let i = 0; i < 120; i += 1) {
      dolgular.push(geciciSar(`_dolgu-${i}.sar`,
        `Faz( kod: FZD${i}, ad: "dolgu ${i}" ) {\n}\n`));
    }

    const uri = geciciSar("_gecici-dusme.sar", KAPILI_KAYNAK);
    const kapidaMi = () =>
      y.postaKapilari().some((k) => k.kod === "GECICI-A01" && k.dosya === uri.fsPath);
    const vardi = await bekle(() => kapidaMi(), 25_000);
    assert.ok(vardi, "kapı panele hiç inmedi; nöbet boş küme üstünde koşuyor");

    // FOUNDER'IN GERÇEK DİZİSİ: kapı satırına tıklanır (dosya editörde AÇILIR),
    // sonra karar verilir. Dosyanın açık olması kusurun koşuludur: karar
    // yazıcısı belgeyi kendisi kaydettiği için belge TEMİZ kalır ve yalnız
    // KİRLİ belgeleri koruyan eski süzgeç tam gerektiği anda devre dışı kalırdı.
    await vscode.commands.executeCommand("sarmal.postaKapisiAc", uri.fsPath, 3, "GECICI-A01");
    await new Promise((r) => setTimeout(r, 300));

    // TURU BAŞLAT ve turu BEKLEMEDEN kararı ver: tur kararı çevreler.
    const tetik = dolgular[0]!;
    const tdoc = await vscode.workspace.openTextDocument(tetik);
    await tdoc.save();

    const sonuc = await vscode.commands.executeCommand<{ tur: string } | undefined>(
      "sarmal.postaKararVer", uri.fsPath, 3, "GECICI-A01", "onaylandı", "✅", false, "");
    assert.strictEqual(sonuc?.tur, "başarı", `karar kanıtlanamadı: ${JSON.stringify(sonuc)}`);
    assert.ok(/onay:\s*"onaylandı/.test(fs.readFileSync(uri.fsPath, "utf8")),
      "karar diske inmedi; ölçüm yanlış yeri gösteriyor");

    // KULLANICI SONUCU: kapı DÜŞER ve BİR DAHA GÖRÜNMEZ. Yazıcı kapıyı komut
    // dönmeden önce düşürdüğü için bu andan sonra kapının panelde BİR KEZ bile
    // görünmesi dirilmedir — Founder'ın gördüğü şey tam olarak buydu.
    assert.ok(!kapidaMi(),
      "karar döndüğü anda kapı hâlâ panelde; tek dosya tazelemesi hiç koşmamış");
    let dirildi: string | undefined;
    for (let i = 0; i < 100; i += 1) {
      await new Promise((r) => setTimeout(r, 150));
      if (kapidaMi()) { dirildi = `${i * 150} ms sonra`; break; }
    }
    assert.strictEqual(dirildi, undefined,
      `karara bağlanmış kapı panele GERİ GELDİ (${dirildi}); bayat anlık görüntü ` +
      "kararı yok saydı ve kullanıcı aynı kapı için ikinci kez karar isteniyor " +
      "(Founder canlı bulgusu 2026-07-29 · 0.9.130)");

    fs.unlinkSync(uri.fsPath);
    for (const d of dolgular) try { fs.unlinkSync(d.fsPath); } catch { /* zaten yok */ }
  });

  it("KOD MERCEĞİ: kapıyı Posta Kutusunda açar, Comments nesnesi yaratmaz", async () => {
    const y = await yuz();
    const uri = geciciSar("_gecici-mercek.sar", KAPILI_KAYNAK);
    const doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc);
    await bekle(() => y.onayOlcumleri().sonYerlesenKapi > 0, 8_000);

    const merceklar = await vscode.commands.executeCommand<vscode.CodeLens[]>(
      "vscode.executeCodeLensProvider", uri);
    const bizimki = (merceklar ?? []).filter((l) => l.command?.command === "sarmal.onayKarar");
    assert.ok(bizimki.length > 0, "kapının üstünde Sarmal kod merceği yok");
    // Mercek başlığı artık karar VAAT ETMEZ; paneli açacağını dürüstçe söyler.
    assert.ok(/Posta Kutusunda aç/.test(bizimki[0]!.command!.title),
      `mercek hâlâ olmayan bir karar penceresi vaat ediyor: ${bizimki[0]!.command!.title}`);

    await vscode.commands.executeCommand("sarmal.onayKarar", bizimki[0]!.command!.arguments![0]);
    const o = y.onayOlcumleri();
    assert.strictEqual(o.yaratilanYuzey, 0,
      "kod merceği hâlâ çizilmeyen bir Comments penceresi kuruyor");
    assert.strictEqual(o.canliIsParcacigi, 0, "mercek sonrası canlı karar yüzeyi var");

    fs.unlinkSync(uri.fsPath);
  });

  it("KOMŞU PANELLER: Hatırlatıcılar ve Gözlemler görünüşleri yerinde durur", async () => {
    await yuz();
    // Kimlikler paket bildiriminden okunur; görünüşün kayıtlı olduğunu odak
    // komutunun HATA VERMEMESİ gösterir (kayıtsız görünüşe odaklanılamaz).
    for (const kimlik of ["sarmalHatirlaticilar", "sarmalBildirimler", "sarmalPostaKutusu"]) {
      await vscode.commands.executeCommand(`${kimlik}.focus`);
    }
  });
});

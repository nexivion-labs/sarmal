// ═══════════════════════════════════════════════════════════════════════════
// renk-uret.mjs — Renk ÜRETİCİSİ (EKL-F3-A01 · tek doğruluk kaynağı ilkesi)
//
//   Amaç:   Eklentinin tüm renkleri SNF-0'dan (oz/siniflama/kayit.json →
//           renkPaleti) türetilir; package.json'a elle boya YAZILMAZ.
//   Kapsam: anlamsal simge → TextMate kapsam ilanı, iki renk teması, paketin
//           anlamsal renk varsayılanı ve deponun kendi çalışma-alanı tercihi.
//           configurationDefaults anlamsal rengi VARSAYILAN olarak taşır
//           (Founder 2026-09-02: renk gelir, kullanıcı ayarlardan değiştirir);
//           tokenColorCustomizations taşımaz, çünkü o ilan boyayıcıya ulaşmaz.
//   Sonuç:  SNF değişir → build → yüzey kendiliğinden uyar; sapma imkânsız
//           (eski OS "palette_drift" dersinin yapısal çözümü).
//   Çalıştıran: npm run build (esbuild'den ÖNCE — bkz. package.json scripts).
//
//   TERRA-RED ONARIMI (TUR-1 kabul denetimi, 2026-07-12): üretim mantığı
//   dışa-açık `uret(yollar)` fonksiyonuna alındı — nöbet testi üreticiyi
//   GEÇİCİ kopyalara karşı GERÇEKTEN KOŞTURUR; üreticiye ray-üretimi geri
//   eklenirse test build beklemeden kırmızı yanar (üretici-kilidi).
//
//   VIT-KIMLIK-A04 (2026-08-08): renk artık kullanıcının ayar dosyasına
//   YAZILARAK değil, pakette İLAN EDİLEREK ulaşır. Üretici bu yüzden iki yeni
//   yüzey daha döker: `contributes.semanticTokenScopes` (kullanıcının KENDİ
//   teması Sarmal kaynağını renklendirsin diye anlamsal simge → TextMate
//   kapsam köprüsü) ve `temalar/sarmal-*.json` (tezgâh renkleri ayar yazmadan
//   yalnız tema yoluyla gelir). İkisi de kullanıcının hiçbir dosyasına
//   dokunmaz; tema seçicisinden tek tıkla açılır ve tek tıkla kapanır.
// ═══════════════════════════════════════════════════════════════════════════
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/**
 * DEPO SINIRI (GOC-A05). Çalışma-alanı ayarının yeri bugüne kadar üç seviye
 * yukarı çıkan sabit bir yolla yazılıydı. O yazım bu tek depoda doğru sonucu
 * veriyordu, buna karşılık açık araç kendi deposuna ayrıldığı gün aynı yol
 * deponun DIŞINA uzanacak ve betik ya komşu bir ağaca yazacak ya da sessizce
 * duracaktı. Hedef bu yüzden sabit sayılmaz, ÖLÇÜLÜR: betiğin bulunduğu yerden
 * yukarı yürünür ve `.git` işaretini taşıyan ilk dizin deponun sınırı sayılır.
 * Sınır bulunamazsa hiçbir tahmin yapılmaz, çünkü yanlış yere yazmak yazmamaktan
 * kötüdür. `.git` bir dizin ya da bir dosya olabilir (çalışma ağacı yazımı),
 * bu yüzden varlık denetimi türü sormaz.
 */
function depoKokuBul(baslangic) {
  let dizin = baslangic;
  for (;;) {
    if (existsSync(join(dizin, ".git"))) return dizin;
    const ust = dirname(dizin);
    if (ust === dizin) return undefined;          // dosya sisteminin tepesi
    dizin = ust;
  }
}

/** Depo sınırının içindeki çalışma-alanı ayarı; sınır yoksa tanımsız döner ve
 *  çağıran dürüst bir hata basar (sessiz düşüş yasağı). */
function ayarYolu() {
  const kok = depoKokuBul(dirname(fileURLToPath(import.meta.url)));
  return kok === undefined ? undefined : join(kok, ".vscode", "settings.json");
}

export const VARSAYILAN = {
  KAYIT:  fileURLToPath(new URL("../../../oz/siniflama/kayit.json", import.meta.url)),
  REHBER: fileURLToPath(new URL("../../../oz/siniflama/rehber.json", import.meta.url)),
  PAKET:  fileURLToPath(new URL("../package.json", import.meta.url)),
  AYAR:   ayarYolu(),
  GOMULU: fileURLToPath(new URL("../src/gomulu-kanon.ts", import.meta.url)),
  TEMA_KOYU: fileURLToPath(new URL("../temalar/sarmal-koyu.json", import.meta.url)),
  TEMA_ACIK: fileURLToPath(new URL("../temalar/sarmal-acik.json", import.meta.url)),
};

// K2 imza renkleri (EKL-F3-A03): kodOnekleri anahtarı → token (renk.ts ile BİREBİR)
const ONEK_TOKEN = {
  "ETM|ORK|ANY": "sarmalKodEtmen",  "BCR|YTN": "sarmalKodBeceri",
  "BLK|TTK|KNC": "sarmalKodBellek", "HTR": "sarmalKodHatir",
  "K|SD|GK|FEL": "sarmalKodYasa",   "EKR|TEM|KRT": "sarmalKodYuzey",
  "PLN|ADM|FZ|KTM|EKL": "sarmalKodPlan", "SNF|DRM|RAY": "sarmalKodOz",
};

// ── VIT-KIMLIK-A04 · ANLAMSAL SİMGE → TEXTMATE KAPSAMI ─────────────────────
//   Bu çizelge renk taşımaz, ROL taşır (YUZ-4.1). Sarmal'ın anlamsal simgesi
//   burada yerleşik bir TextMate kapsamına bağlanınca, kullanıcının kendi
//   teması Sarmal kaynağını hiçbir ayar yazılmadan renklendirir. Listedeki ilk
//   kapsam bizim dilbilgimizin gerçekten ürettiği `.sar` kapsamıdır; sonrakiler
//   her temanın tanıdığı genel karşılıklardır ve tema ilkini bilmiyorsa sırayla
//   denenir.
const KAPSAM_TIP   = ["entity.name.type.sar", "entity.name.type", "entity.name.class", "support.type"];
const KAPSAM_PARAM = ["variable.parameter.sar", "variable.parameter", "variable.other.property"];
const KAPSAM_KOD   = ["constant.other.kod.sar", "constant.other", "entity.name.constant", "variable.other.constant"];
// Kenar alanları (bağımlı·besler) planın akışını kurar; bu yüzden genel karşılıkları
// akış anahtarıdır — kullanıcının teması onları kendi kontrol-akışı rengiyle boyar.
const KAPSAM_KENAR = ["keyword.control.flow.sar", "keyword.control.flow", "keyword.control"];
const KAPSAM_DIZGI = ["string.quoted.double.sar", "string.quoted.double", "string.quoted", "string"];

/** İlan edilen her anlamsal simge tipinin TextMate karşılığı — kapsamsız tip
 *  bırakılamaz; nöbet (giydirmesiz-renk.test.ts) ilan ile bu çizelgeyi küme
 *  eşitliğiyle karşılaştırır ve eksik kalan tipte kırmızı yanar. */
const SIMGE_KAPSAM = {
  // Ağaç omurgası ve aileler: kaynakta hepsi bir yapı bildiriminin TİP adıdır.
  sarmalBahce: KAPSAM_TIP,   sarmalAgac: KAPSAM_TIP,
  sarmalKok: KAPSAM_TIP,     sarmalGovde: KAPSAM_TIP,
  sarmalDal: KAPSAM_TIP,     sarmalAltDal: KAPSAM_TIP,
  sarmalYaprak: KAPSAM_TIP,  sarmalMeyve: KAPSAM_TIP,
  sarmalBilgi: KAPSAM_TIP,   sarmalOrkestrasyon: KAPSAM_TIP,
  sarmalEtmen: KAPSAM_TIP,   sarmalYuzey: KAPSAM_TIP,
  sarmalYasa: KAPSAM_TIP,    sarmalTeknoloji: KAPSAM_TIP,
  sarmalSurec: KAPSAM_TIP,   sarmalNitelik: KAPSAM_TIP,
  sarmalOz: KAPSAM_TIP,      sarmalDavranis: KAPSAM_TIP,
  sarmalArkayuz: KAPSAM_TIP,
  // Parametre adı ve KOD kimliği: kendi rolleri var.
  sarmalParam: KAPSAM_PARAM,
  sarmalKod: KAPSAM_KOD,
  sarmalKenar: KAPSAM_KENAR,
  sarmalDizgi: KAPSAM_DIZGI,   // 📝 niyet metni — kullanıcının KENDİ teması da boyayabilsin
  // K2 imza önekleri: hepsi KOD'dur, yalnız imza rengi ayrışır.
  sarmalKodEtmen: KAPSAM_KOD,  sarmalKodBeceri: KAPSAM_KOD,
  sarmalKodBellek: KAPSAM_KOD, sarmalKodHatir: KAPSAM_KOD,
  sarmalKodYasa: KAPSAM_KOD,   sarmalKodYuzey: KAPSAM_KOD,
  sarmalKodPlan: KAPSAM_KOD,   sarmalKodOz: KAPSAM_KOD,
};

/** Anlamsal token kuralları — kanon tek kaynak (renk.ts token adlarıyla birebir). */
function anlamsalKurallar(palet) {
  const { agacRenkleri: agac, aileler, sadeRenkler: sade } = palet;
  const kurallar = {
    sarmalBahce: agac["ÇalışmaAlanı"], sarmalAgac: agac["Uygulama"],
    sarmalKok: agac["Proje"],          sarmalGovde: agac["Blok"],
    sarmalDal: agac["Faz"],            sarmalAltDal: agac["Katman"],
    sarmalYaprak: agac["Adım"],        sarmalMeyve: agac["meyve"],
    sarmalBilgi: aileler.bilgi,        sarmalOrkestrasyon: aileler.orkestrasyon,
    sarmalEtmen: aileler.etmen,        sarmalYuzey: aileler.yuzey,
    sarmalYasa: aileler.yasa,          sarmalTeknoloji: aileler.teknoloji,
    sarmalSurec: aileler.surec,        sarmalNitelik: aileler.nitelik,
    sarmalOz: aileler.oz,
    sarmalDavranis: aileler.davranis, sarmalArkayuz: aileler.arkayuz,
    sarmalParam: sade.parametre,       sarmalKod: sade.kod,
    sarmalKenar: sade.kenar,           // 🔗 bağımlı·besler — bağımlılık iskeleti özgü renk (YUZ-4.1)
    sarmalDizgi: sade.dizgi,           // 📝 niyet metni — kanonun beyazı (Founder 2026-09-02)
  };
  for (const [grup, token] of Object.entries(ONEK_TOKEN)) {
    const renk = (palet.kodOnekleri ?? {})[grup];
    if (renk) kurallar[token] = renk;
  }
  return kurallar;
}

/** AÇIK-TEMA eşleri (ADM-MUT-B5): '[*Light*]' bloğu da KANONDAN üretilir. */
function acikAnlamsalKurallar(palet) {
  const acikSade = palet.sadeRenklerAcik ?? {};
  const acikOnek = palet.kodOnekleriAcik ?? {};
  const acik = { sarmalParam: acikSade.parametre, sarmalKod: acikSade.kod };
  for (const [grup, token] of Object.entries(ONEK_TOKEN)) {
    if (acikOnek[grup]) acik[token] = acikOnek[grup];
  }
  return acik;
}

// ── textMate kuralları (.sar dilbilgisi) ──────────────────────────────────
// ⚖️ FOUNDER HÜKMÜ (2026-08-22 · EKL-F6-A04): dizgi renkleri kullanıcıya
// ZORLA ulaştırılmaz. Ürünün renk yolu iki yüzeyden ibarettir: dilbilgisi
// yerleşik TextMate kapsam adlarını üretir ve `contributes.semanticTokenScopes`
// anlamsal simgeleri o adlara bağlar, böylece kullanıcının KENDİ teması Sarmal
// kaynağını kurulum anında kendiliğinden boyar. Kanonun kendi paleti isteyene
// iki tıkla açılan Sarmal temalarıyla gelir; kimseden taviz istenmez.
//
// BU BLOK BU YÜZDEN PAKETE İLAN EDİLMEZ. Gerekçesi ölçümdür ve iki kez
// alınmıştır: Founder 2026-07-06 tarihinde VS Code'un `configurationDefaults`
// içindeki `editor.tokenColorCustomizations` değerini boyayıcıya hiç
// geçirmediğini ölçmüştü; 2026-08-21 gecesi aynı ilan kaynak okumasına
// dayanılarak pakete geri kondu ve Founder canlı pencerede bütün görev ile
// kabul metinlerini beyaz yerine mavi gördü, yani ölçüm ikinci kez aynı sonucu
// verdi. Ayarın ETKİN yapılandırmaya ulaşması ile ekrana BOYANMASI iki ayrı
// olgudur ve yalnız ikincisi kabul maddesidir.
//
// Aşağıdaki tablo iki yerde tüketilir: deponun kendi çalışma-alanı tercihinde
// ve iki Sarmal temasının `tokenColors` dizisinde. Kapsamların hepsi `.sar` ile
// biter, dolayısıyla başka hiçbir dilin rengine dokunulmaz.
const tmKurallar = (p) => [
  { scope: "entity.name.tag.sar",
    settings: { foreground: p.belgeEtiket, fontStyle: "bold" } },
  { scope: "markup.heading.sar",
    settings: { foreground: p.belgeBaslik, fontStyle: "bold" } },
  { scope: ["punctuation.definition.comment.begin.sar", "punctuation.definition.comment.end.sar"],
    settings: { foreground: p.belgeCit, fontStyle: "bold" } },
  { scope: ["string.quoted.double.sar", "string.quoted.triple.sar"],
    settings: { foreground: p.dizgi } },                       // 🤍 niyet beyazı / 🖋️ mürekkep (açık)
  { scope: "constant.other.kod.sar",  settings: { foreground: p.kod } },
  { scope: "constant.numeric.sar",    settings: { foreground: p.sayi } },
  { scope: "markup.table.sar",        settings: { foreground: p.tablo } },   // 📊 belge tabloları
  { scope: "keyword.control.sar",     settings: { foreground: p.anahtar } }, // Kural·Tip·çağır (mor)
  { scope: "entity.name.function.sar", settings: { foreground: p.kuralAd } }, // kural ADI (fonksiyon sarısı)
  { scope: "keyword.control.flow.sar", settings: { foreground: p.kenar, fontStyle: "bold" } }, // 🔗 --> akış oku = besler kenarı (ORK-1.2)
];

/** Tezgâh (workbench) renkleri — TEK tablo: hem çalışma-alanı ayarı hem tema
 *  buradan beslenir, ikisinin ayrışması yapısal olarak imkânsızdır. */
function tezgahRenkleri(palet) {
  const rozet = palet.driftRozetleri ?? {};
  return {
    "editorError.foreground":   rozet.hata,
    "editorWarning.foreground": rozet.uyari,   // 🟠 uyarı çizgisi TURUNCU (Founder 2026-07-06)
    "editorInfo.foreground":    rozet.bilgi,   // 🔵 hatırlatıcı/çapa mavisi (parlak — Founder 2026-07-12)
    "editorInfo.background":    rozet.bilgiZemin,              // bilgi aralığı zemin tintı (soluk-ⓘ dersi)
    "editorOverviewRuler.infoForeground": rozet.bilgi,         // sağ cetvelde bilgi izi
    "list.errorForeground":     rozet.hata,
    "list.warningForeground":   rozet.uyari,   // Problems paneli uyarı metni turuncu
    "list.infoForeground":      rozet.bilgi,
    "checkbox.foreground":      palet.agacRenkleri["Adım"],   // ✅ kutucuk Adım-yeşili (Founder 2026-07-12)
  };
}

/** 🤍 KUZEY YILDIZI ampulü — saf beyaz (Founder 14:33). Yalnız KOYU zeminde
 *  okunur, bu yüzden açık temaya taşınmaz; açık temada VS Code'un kendi
 *  ampul rengi kalır ve ampul görünmez olmaz. */
const AMPUL_KOYU = {
  "editorLightBulb.foreground":        "#FFFFFF",
  "editorLightBulbAutoFix.foreground": "#FFFFFF",
};

/** Tema rolleri — genel dillerin kapsamları da KANON değerleriyle boyanır;
 *  üretici hiçbir yeni hex uydurmaz, yalnız kanonun hangi rolünün hangi genel
 *  kapsama düştüğüne karar verir. Açık tema, kanonun açık eşlerini kullanır
 *  (sadeRenklerAcik + kodOnekleriAcik); böylece iki temada da kontrast korunur. */
function temaRolleri(palet, acik) {
  const sade = acik ? { ...palet.sadeRenkler, ...(palet.sadeRenklerAcik ?? {}) } : palet.sadeRenkler;
  const onek = acik ? { ...palet.kodOnekleri, ...(palet.kodOnekleriAcik ?? {}) } : palet.kodOnekleri;
  return {
    sade,
    sessiz:     onek["SNF|DRM|RAY"],   // omurga imzası: kanonun en sessiz rengi → yorum satırı
    dizgiGenel: onek["EKR|TEM|KRT"],   // yüzey imzası → genel dillerde dizgi
    tipRengi:   onek["BCR|YTN"],       // beceri imzası → genel dillerde tip ve sınıf adı
    dilMavisi:  onek["HTR"],           // hatırlatıcı mavisi → dil sabiti, saklama sözcüğü, etiket
    hata:       (palet.driftRozetleri ?? {}).hata,
  };
}

/** Genel dillerin kapsam kuralları — Sarmal teması seçildiğinde .sar dışındaki
 *  dosyalar renksiz kalmasın diye. VS Code bir temanın tokenColors dizisini
 *  varsayılan temayla BİRLEŞTİRMEZ (ölçüldü: workbench getTokenColors yalnız
 *  temanın kendi kurallarını ve dört `token.*-token` yedeğini taşır); eksik
 *  bırakılan kapsam düz metin rengine düşer. Bu yüzden genel küme kanondan
 *  üretilir ve temaya girer. */
const genelKurallar = (r) => [
  { scope: ["comment", "punctuation.definition.comment"], settings: { foreground: r.sessiz } },
  { scope: ["string", "string.quoted", "meta.embedded.assembly"], settings: { foreground: r.dizgiGenel } },
  { scope: ["constant.numeric"], settings: { foreground: r.sade.sayi } },
  { scope: ["constant.language", "constant.character", "support.constant", "storage", "storage.type", "storage.modifier", "entity.name.tag"],
    settings: { foreground: r.dilMavisi } },
  { scope: ["keyword", "keyword.control"], settings: { foreground: r.sade.anahtar } },
  { scope: ["entity.name.function", "support.function", "meta.function-call"], settings: { foreground: r.sade.kuralAd } },
  { scope: ["entity.name.type", "entity.name.class", "support.type", "support.class"], settings: { foreground: r.tipRengi } },
  { scope: ["variable", "variable.other", "variable.parameter", "entity.name.variable", "support.variable", "entity.other.attribute-name"],
    settings: { foreground: r.sade.parametre } },
  { scope: ["constant.other"], settings: { foreground: r.sade.kod } },
  { scope: ["markup.heading"], settings: { foreground: r.sade.belgeBaslik, fontStyle: "bold" } },
  { scope: ["markup.bold"], settings: { fontStyle: "bold" } },
  { scope: ["markup.italic"], settings: { fontStyle: "italic" } },
  { scope: ["invalid"], settings: { foreground: r.hata } },
];

/** Bir Sarmal renk teması — kullanıcının ayar dosyasına tek anahtar yazmadan
 *  tezgâh rengini, anlamsal rengi ve biçim rengini taşıyan tek kap. Tema
 *  seçicisinden bir tıkla açılır, bir tıkla eski temaya dönülür. */
function temaUret(palet, acik) {
  const rol = temaRolleri(palet, acik);
  const anlamsal = acik
    ? { ...anlamsalKurallar(palet), ...acikAnlamsalKurallar(palet) }
    : anlamsalKurallar(palet);
  return {
    _uretim: "ÜRETİLDİ — arac/renk-uret.mjs (kaynak: oz/siniflama/kayit.json · renkPaleti). Elle düzenlenmez; üreteci değiştir ve yeniden koştur.",
    name: acik ? "Sarmal Acik" : "Sarmal Koyu",
    type: acik ? "light" : "dark",
    semanticHighlighting: true,
    colors: acik ? tezgahRenkleri(palet) : { ...AMPUL_KOYU, ...tezgahRenkleri(palet) },
    semanticTokenColors: anlamsal,
    tokenColors: [...genelKurallar(rol), ...tmKurallar(rol.sade)],
  };
}

/** Kanondan tüm renk yüzeylerini üretir — yollar geçersiz kılınabilir (nöbet testi
 *  geçici kopyalara koşturur; build varsayılan yollara yazar). */
export function uret(yollar = {}) {
  const { KAYIT, REHBER, PAKET, AYAR, GOMULU, TEMA_KOYU, TEMA_ACIK } = { ...VARSAYILAN, ...yollar };

  const palet = JSON.parse(readFileSync(KAYIT, "utf8")).renkPaleti;
  const paket = JSON.parse(readFileSync(PAKET, "utf8"));
  const { sadeRenkler: sade } = palet;

  // ── RENK VARSAYILAN OLARAK GELİR, DAYATILMAZ (Founder hükmü · 2026-09-02) ──
  // HÜKMÜN DÜZELTİLMESİ: EKL-F6-A04 kaydındaki 2026-08-22 hükmü "renk kullanıcıya
  // dayatılmaz" cümlesiyle yazılmış ve uygulamada "hiçbir renk ilan edilmez" diye
  // okunmuştu. Founder 2026-09-02 tarihinde bu okumayı düzeltmiştir: kastedilen
  // şey rengin hiç gelmemesi değil, KULLANICININ AYARLARDAN DEĞİŞTİREBİLMESİDİR.
  // `configurationDefaults` tam olarak bunu yapar ve bir dayatma değildir, çünkü
  // kullanıcının kendi ayarı her koşulda üstündür; bu üstünlük gerçek düzenleyici
  // oturumunda ölçülmüştür (kullanıcı hanesine değer yazılınca varsayılan geri
  // çekilir, değer silinince geri gelir). Eski okumanın bedeli ölçülmüştür: kanon
  // paletini yalnız Sarmal temasını seçen görüyordu, dolayısıyla doğan her yeni
  // projede otuz anlamsal tip kullanıcının kendi temasının tek rengine düşüyor ve
  // ayrım kayboluyordu.
  //
  // İKİ ANAHTAR AYRILIR VE SEBEPLERİ FARKLIDIR. `tokenColorCustomizations` ilan
  // edilmez, çünkü bu ilan boyayıcıya hiç ulaşmaz ve iki bağımsız ölçümle böyle
  // saptanmıştır; çalışmadığı hâlde duran bir beyan kapıya yalan söyletir. Buna
  // karşılık `semanticTokenColorCustomizations` ekrana ULAŞIR ve hükmün konusu
  // odur. Anlamsal vurgu ise küresel olarak zorlanmaz; yalnız `[sarmal]` dil
  // bloğunda açılır, böylece başka hiçbir dilin ve temanın kararı ezilmez.
  delete paket.contributes.configurationDefaults["editor.tokenColorCustomizations"];
  delete paket.contributes.configurationDefaults["editor.semanticHighlighting.enabled"];
  paket.contributes.configurationDefaults["editor.semanticTokenColorCustomizations"] = {
    enabled: true,
    rules: anlamsalKurallar(palet),
    "[*Light*]": { rules: acikAnlamsalKurallar(palet) },
  };
  paket.contributes.configurationDefaults["[sarmal]"]["editor.semanticHighlighting.enabled"] = true;

  // ── Deponun KENDİ çalışma-alanı tercihi ───────────────────────────────────
  // Bu dosya ürünün bir yüzeyi değildir; yalnız bu deponun tercihidir ve
  // kullanıcıya hiç gitmez. Founder'ın alıştığı görünüm burada yaşar, buna
  // karşılık tek kaynak korunur: değerler kanondan üretilir, elle yazılmaz.
  if (AYAR === undefined)
    throw new Error(
      "renk-uret: çalışma-alanı ayarının yeri çözülemedi, çünkü betiğin üstünde `.git` işareti "
      + "taşıyan bir depo kökü bulunamadı. Hedef tahmin edilmez ve komşu bir ağaca yazılmaz; "
      + "betiği bir git deposunun içinden koştur ya da uret({ AYAR: '<yol>' }) ile hedefi açıkça ver.");
  if (!existsSync(AYAR))
    throw new Error(
      `renk-uret: çalışma-alanı ayarı beklenen yerde yok: ${AYAR}. Depo sınırı bulundu fakat `
      + "içinde `.vscode/settings.json` yok; dosyayı oluştur ya da hedefi açıkça ver. "
      + "Sessizce yeni bir dosya doğurmak, hangi ayarın nereden geldiğini bir daha okunamaz kılar.");
  const ayar = JSON.parse(readFileSync(AYAR, "utf8"));
  ayar["editor.tokenColorCustomizations"] = {
    textMateRules: tmKurallar(sade),
    "[*Light*]": { textMateRules: tmKurallar({ ...sade, ...(palet.sadeRenklerAcik ?? {}) }) },
  };
  // Anlamsal kurallar deponun KENDİ tercihine yazılır: paket bu ilanı artık
  // taşımadığı için burası ikiz değil tek kaynaktır ve Founder'ın alıştığı
  // görünüm hangi tema seçili olursa olsun bu depoda korunur.
  ayar["editor.semanticTokenColorCustomizations"] = {
    enabled: true,
    rules: anlamsalKurallar(palet),
    "[*Light*]": { rules: acikAnlamsalKurallar(palet) },
  };
  delete ayar["[sarmal]"];   // biçim tercihleri de pakete indi (contributes."[sarmal]")
  ayar["workbench.productIconTheme"] = "sarmal-kuzey-yildizi";   // 🌟 Kuzey Yıldızı (Founder 2026-07-06)
  // Tezgâh renkleri BİLEREK burada kalır: `workbench.colorCustomizations` tek bir
  // dile bağlanamaz ve varsayılan olarak ilan edilseydi HER kullanıcının seçtiği
  // temanın hata, uyarı ve bilgi renklerini ezerdi. Adımın sınırı bunu yasaklar;
  // bu renkler isteyene Sarmal temasıyla ulaşır (temalar/sarmal-*.json).
  ayar["workbench.colorCustomizations"] = { ...AMPUL_KOYU, ...tezgahRenkleri(palet) };
  writeFileSync(AYAR, JSON.stringify(ayar, null, 2) + "\n");

  // ── YUZ-4.1 RENK KANUNU (Founder 2026-07-12): eski ray tip-paleti SÖKÜLDÜ —
  // panel yazı rengi artık DURUMUN (yolharitasi FileDecoration tema-token'ları:
  // charts.yellow · errorForeground · descriptionForeground); tip kimliği ikon
  // ŞEKLİ + kod önekinde yaşar. sarmal.ray.* tema-renkleri ÜRETİLMEZ; kanonda
  // rayRenkleri yok (S3 kilidi — tarihçe git'te). Tek katkı-rengi: kenar pembesi.
  // 🔗 kenar pembesi (ORK-1.2 bağımlılık iskeleti — panel bağımlı-oku editördeki
  // bağımlı: parametresiyle AYNI dili konuşur)
  paket.contributes.colors = [{
    id: "sarmal.kenar",
    description: "%color.edge%",
    defaults: { dark: sade.kenar, light: sade.kenar, highContrast: sade.kenar, highContrastLight: sade.kenar },
  }];

  // ── VIT-KIMLIK-A04 · KAPSAM İLANI: kullanıcının KENDİ teması Sarmal'ı boyasın ──
  // İlan, ilan edilmiş her anlamsal simge tipi için üretilir; çizelgede karşılığı
  // olmayan tip kapsamsız kalır ve nöbet küme eşitliğinde kırmızı yanar.
  const ilanliTipler = (paket.contributes.semanticTokenTypes ?? []).map((t) => t.id);
  const kapsamlar = {};
  for (const tip of ilanliTipler) {
    if (SIMGE_KAPSAM[tip]) kapsamlar[tip] = SIMGE_KAPSAM[tip];
  }
  paket.contributes.semanticTokenScopes = [{ language: "sarmal", scopes: kapsamlar }];

  // ── VIT-KIMLIK-A04 · TEMA KATKISI: tezgâh rengi ayar yazmadan yalnız temayla gelir ──
  writeFileSync(TEMA_KOYU, JSON.stringify(temaUret(palet, false), null, 2) + "\n");
  writeFileSync(TEMA_ACIK, JSON.stringify(temaUret(palet, true), null, 2) + "\n");
  paket.contributes.themes = [
    { id: "sarmal-koyu", label: "%theme.dark%", uiTheme: "vs-dark", path: "./temalar/sarmal-koyu.json" },
    { id: "sarmal-acik", label: "%theme.light%", uiTheme: "vs", path: "./temalar/sarmal-acik.json" },
  ];

  writeFileSync(PAKET, JSON.stringify(paket, null, 2) + "\n");

  // ── GÖMÜLÜ KANON (U4 · YUZ-3): dış projeler KÖR kalmasın ───────────────────
  // snfBul/rehberBul yukarı-yürüyüp oz/siniflama/*.json BULAMAZSA (dış proje, _Sarmal
  // erişilemez) buna düşer → HER projede tam renk+dekor+hover. esbuild bu .ts'i
  // dist/eklenti.js'e bundle'lar → .vsix kanonu KENDİ İÇİNDE taşır (MCP mutlak-yolu gibi).
  // Tek-kaynak korunur: kaynak hâlâ oz/siniflama/*.json; bu dosya her build'de yeniden döker.
  writeFileSync(GOMULU,
    "// ⚙️ ÜRETİLDİ — arac/renk-uret.mjs · ELLE DÜZENLEME (kaynak: oz/siniflama/*.json · U4 · YUZ-3).\n" +
    "/* eslint-disable */\n" +
    "export const GOMULU_KAYIT: Record<string, unknown> = " + readFileSync(KAYIT, "utf8").trim() + ";\n" +
    "export const GOMULU_REHBER: Record<string, unknown> = " + readFileSync(REHBER, "utf8").trim() + ";\n"
  );
  return { PAKET, AYAR, GOMULU, TEMA_KOYU, TEMA_ACIK };
}

/** Nöbetin okuyabilmesi için çizelge ve kural üreticileri dışa açıktır —
 *  testin kendi kopyası yoktur, üreticinin gerçek çizelgesi ölçülür. */
export { SIMGE_KAPSAM, anlamsalKurallar, acikAnlamsalKurallar };

// Doğrudan çalıştırma (npm run build): varsayılan yollara üret.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  uret();
  console.log("🎨 kanondan üretildi → package.json (kapsam ilanı + tema katkısı + anlamsal renk varsayılanı) + .vscode/settings.json (depo tercihi: textMate + anlamsal) + temalar/sarmal-koyu·acik.json + gomulu-kanon.ts (U4)");
}

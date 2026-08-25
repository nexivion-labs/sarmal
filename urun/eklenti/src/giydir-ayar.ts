// ═══════════════════════════════════════════════════════════════════════════
// giydir-ayar.ts — 🎨 GİYDİR ayar üretimi (SAF çekirdek · BKM-SNV2-A03)
//
//   Dış çalışma-alanına yazılacak renk/dekor ayarlarını GÖMÜLÜ KANONDAN türetir.
//   renk-uret.mjs'in RUNTIME ikizi — aynı tablo, aynı eşleme: üretici bizim
//   repoya build'de yazar, giydir dış projeye komutla yazar. Sapma palette-drift
//   nöbetiyle kilitli (giydir çıktısı ↔ .vscode/settings.json + package.json
//   birebir karşılaştırılır — F3 görünüm-paritesi).
//
//   SAF: vscode İTHAL ETMEZ (bicimle/bicimlendir ayrımının aynısı) —
//   node:test doğrudan koşar; vscode kabuğu giydir.ts'te.
// ═══════════════════════════════════════════════════════════════════════════
import { GOMULU_KAYIT } from "./gomulu-kanon.ts";

interface RenkPaleti {
  kodOnekleri?: Record<string, string>;
  sadeRenkler?: Record<string, string>;
  aileler?: Record<string, string>;
  agacRenkleri?: Record<string, string>;
  driftRozetleri?: Record<string, string>;
  sadeRenklerAcik?: Record<string, string>;
  kodOnekleriAcik?: Record<string, string>;
}

// K2 önek → token (renk.ts / renk-uret.mjs ile BİREBİR — nöbet: palette-drift).
const ONEK_TOKEN: Record<string, string> = {
  "ETM|ORK|ANY": "sarmalKodEtmen",  "BCR|YTN": "sarmalKodBeceri",
  "BLK|TTK|KNC": "sarmalKodBellek", "HTR": "sarmalKodHatir",
  "K|SD|GK|FEL": "sarmalKodYasa",   "EKR|TEM|KRT": "sarmalKodYuzey",
  "PLN|ADM|FZ|KTM|EKL": "sarmalKodPlan", "SNF|DRM|RAY": "sarmalKodOz",
};

/**
 * Giydirilecek ayarların tamamı — anahtar: Configuration API'ye verilecek ayar
 * adı, değer: Workspace hedefine yazılacak nesne. Kanon tek kaynak (DIL-2):
 * kayit verilmezse gömülü kanon (dış projede erişilebilir tek kopya · U4/YUZ-3).
 */
export function giydirAyarlari(kayit: Record<string, unknown> = GOMULU_KAYIT): Record<string, unknown> {
  const palet = (kayit as { renkPaleti?: RenkPaleti }).renkPaleti ?? {};
  const sade = palet.sadeRenkler ?? {};
  const aileler = palet.aileler ?? {};
  const agac = palet.agacRenkleri ?? {};
  const rozet = palet.driftRozetleri ?? {};

  // ── anlamsal tokenlar (renk-uret.mjs eşlemesinin birebiri) ──────────────────
  const kurallar: Record<string, string> = {
    sarmalBahce: agac["ÇalışmaAlanı"], sarmalAgac: agac["Uygulama"],
    sarmalKok: agac["Proje"],          sarmalGovde: agac["Blok"],
    sarmalDal: agac["Faz"],            sarmalAltDal: agac["Katman"],
    sarmalYaprak: agac["Adım"],        sarmalMeyve: agac["meyve"],
    sarmalBilgi: aileler.bilgi,        sarmalOrkestrasyon: aileler.orkestrasyon,
    sarmalEtmen: aileler.etmen,        sarmalYuzey: aileler.yuzey,
    sarmalYasa: aileler.yasa,          sarmalTeknoloji: aileler.teknoloji,
    sarmalSurec: aileler.surec,        sarmalNitelik: aileler.nitelik,
    sarmalOz: aileler.oz,
    sarmalDavranis: aileler.davranis,  sarmalArkayuz: aileler.arkayuz,
    sarmalParam: sade.parametre,       sarmalKod: sade.kod,
    sarmalKenar: sade.kenar,
  };
  for (const [grup, token] of Object.entries(ONEK_TOKEN)) {
    const renk = (palet.kodOnekleri ?? {})[grup];
    if (renk) kurallar[token] = renk;
  }
  const acikSade = palet.sadeRenklerAcik ?? {};
  const acikOnek = palet.kodOnekleriAcik ?? {};
  const acikKurallar: Record<string, string> = { sarmalParam: acikSade.parametre, sarmalKod: acikSade.kod };
  for (const [grup, token] of Object.entries(ONEK_TOKEN)) {
    if (acikOnek[grup]) acikKurallar[token] = acikOnek[grup];
  }

  // RF-T1-A02: textMate kuralları TEK üreteçten iki temaya (renk-uret ikizi) —
  // '[*Light*]' seçicisi settings.json'da çalışır; açık eşler kanondan.
  const tmKurallar = (p: Record<string, string>): Array<Record<string, unknown>> => [
    { scope: "entity.name.tag.sar",
      settings: { foreground: p.belgeEtiket, fontStyle: "bold" } },
    { scope: "markup.heading.sar",
      settings: { foreground: p.belgeBaslik, fontStyle: "bold" } },
    { scope: ["punctuation.definition.comment.begin.sar", "punctuation.definition.comment.end.sar"],
      settings: { foreground: p.belgeCit, fontStyle: "bold" } },
    { scope: ["string.quoted.double.sar", "string.quoted.triple.sar"],
      settings: { foreground: p.dizgi } },
    { scope: "constant.other.kod.sar",  settings: { foreground: p.kod } },
    { scope: "constant.numeric.sar",    settings: { foreground: p.sayi } },
    { scope: "markup.table.sar",        settings: { foreground: p.tablo } },
    { scope: "keyword.control.sar",     settings: { foreground: p.anahtar } },
    { scope: "entity.name.function.sar", settings: { foreground: p.kuralAd } },
    { scope: "keyword.control.flow.sar", settings: { foreground: p.kenar, fontStyle: "bold" } },
  ];

  return {
    // textMate biçim kuralları. EKL-F6-A04'ten sonra bunlar paketin kendi
    // `configurationDefaults` ilanından ZATEN gelir; komut yine de yazabilir,
    // çünkü kullanıcı renkleri kendi deposuna sabitlemek isteyebilir ve komut
    // elle çalışan bir kolaylık olarak korunmuştur (VIT-KIMLIK-A04 hükmü).
    "editor.tokenColorCustomizations": {
      textMateRules: tmKurallar(sade),
      "[*Light*]": { textMateRules: tmKurallar({ ...sade, ...acikSade }) },
    },
    // Anlamsal kurallar pakette İLAN EDİLMEZ (EKL-F6-A04 hükmü: renk dayatılmaz,
    // tam görünüm temayla gelir); kanon paletini kendi çalışma alanına sabitlemek
    // isteyen kullanıcının iki açık yolu vardır — Sarmal teması ya da bu komut.
    "editor.semanticTokenColorCustomizations": {
      enabled: true,
      rules: kurallar,
      "[*Light*]": { rules: acikKurallar },
    },
    "workbench.colorCustomizations": {
      "editorLightBulb.foreground":        "#FFFFFF",
      "editorLightBulbAutoFix.foreground": "#FFFFFF",
      "editorError.foreground":   rozet.hata,
      "editorWarning.foreground": rozet.uyari,
      "editorInfo.foreground":    rozet.bilgi,
      "editorInfo.background":    rozet.bilgiZemin,
      "editorOverviewRuler.infoForeground": rozet.bilgi,
      "list.errorForeground":     rozet.hata,
      "list.warningForeground":   rozet.uyari,
      "list.infoForeground":      rozet.bilgi,
      "checkbox.foreground":      agac["Adım"] ?? "#8CC152",   // ✅ kutucuk Adım-yeşili (Founder 2026-07-12)
    },
    "workbench.productIconTheme": "sarmal-kuzey-yildizi",
    // [sarmal] dil-özel editör bloğu (A03 gözle-teyit bulgusu, Founder 2026-07-12:
    // "çizgiler aynı değil") — VS Code'un KENDİ girinti/bracket kılavuzları kapatılır
    // (Sarmal dalları + girinti boyacısı native çizer; ikisi üst üste = çift çizgi),
    // sarma/öneri ayarları paketin kendi varsayılanıyla birebir. Kaynak artık
    // package.json `contributes.configurationDefaults["[sarmal]"]` bloğudur
    // (EKL-F6-A04: biçim tercihi depodan pakete indi) — nöbet kapsamayı kilitler.
    "[sarmal]": {
      "editor.wordWrap": "bounded",
      "editor.wordWrapColumn": 110,
      "editor.wrappingIndent": "deepIndent",
      "editor.inlineSuggest.enabled": false,
      "editor.guides.indentation": false,
      "editor.guides.bracketPairs": false,
      "editor.guides.bracketPairsHorizontal": false,
    },
  };
}

/** Rakip-susturma anahtarları — yalnız eklenti KURULUYSA ve yalnız bu anahtarlarla
 *  dokunulur (sınır: kullanıcı ayarı ezilmez; native karşılıklar girinti.ts+satirici.ts). */
export const RAKIP_SUSTURMA: Array<{ eklenti: string; anahtar: string; deger: string }> = [
  { eklenti: "oderwat.indent-rainbow", anahtar: "indentRainbow.excludedLanguages", deger: "sarmal" },
  { eklenti: "usernamehw.errorlens",   anahtar: "errorLens.excludePatterns",       deger: "**/*.sar" },
];

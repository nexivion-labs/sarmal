// ═══════════════════════════════════════════════════════════════════════════
// ingilizce-yuz.ts — 🌐 İNGİLİZCE YÜZÜN TEK İLKESİ ÖLÇERİ (MGZ-A09)
//
//   Founder 2026-10-10 tarihinde İngilizce yüzün tek ilkesine hükmetmiştir:
//   dosya her dilde olduğu gibi Türkçe görünür; arayüz, tanılar ve ipucu
//   balonları İngilizce konuşur ve dosyadaki gerçek Türkçe adları anar. Bu
//   modül bir İngilizce yüz metninde ilkeyi bozan iki kusuru bulur:
//
//     ① TÜRKÇE DÜZYAZI. Cümlenin kendisinde Türkçe kalmış sözcük. Dosyada
//        yazılan adlar (tip, kenar, alan, enum değeri, aile, anahtar sözcük) bu
//        sayıma girmez, çünkü ilke onların aynen anılmasını ister.
//     ② İNGİLİZCE AD. Dosyada bulunmayan bir adın öğretilmesi: kod aralığında
//        `dependsOn:` gibi bir alan karşılığı ya da düzyazının ortasında büyük
//        harfle yazılmış `Step` gibi bir tip karşılığı. Kullanıcı bu adı dosyada
//        arar ve bulamaz; 17 Eylül'deki karışıklığın ikinci kaynağı buydu.
//
//   AD EVRENİ İKİNCİ BİR ÇİZELGEDEN KURULMAZ. Türkçe adlar da İngilizce
//   karşılıkları da dil sözlüğünden okunur (cevir.ts); kanona yeni bir tip ya da
//   alan eklendiğinde ölçer onu kendiliğinden tanır.
//
//   ÖLÇER BİR ÜRÜN DAVRANIŞI DEĞİL, BİR NÖBET ARACIDIR. Hiçbir yüzey onu
//   çalışma anında çağırmaz; iki paketin sınamaları İngilizce yüzü onunla
//   ölçer. Bulgu bir sezgidir ve sezginin sınırı dürüstçe yazılır: Türkçe harf
//   taşımayan tek bir Türkçe sözcük ancak durak sözcük listesindeyse yakalanır.
// ═══════════════════════════════════════════════════════════════════════════

import { dilSozluguAl } from "./cevir.ts";

export interface IngilizceYuzKusuru {
  /** `turkce-duzyazi`: cümlede kalan Türkçe · `ingilizce-ad`: dosyada bulunmayan ad karşılığı. */
  readonly tur: "turkce-duzyazi" | "ingilizce-ad";
  readonly sozce: string;
}

/** Türkçeye özgü harfler; dosyada yazılan bir ad değilse düzyazı sayılır. */
const TURKCE_HARF = /[çğıöşüÇĞİÖŞÜâîû]/u;

/**
 * Türkçe harf taşımayan sık Türkçe sözcükler. Liste bilerek dardır ve hiçbir
 * İngilizce sözcüğü içermez; aksi hâlde ölçer doğru bir İngilizce cümleyi
 * kırmızıya düşürürdü.
 */
const DURAK_SOZCUKLER = new Set(("ve veya ile bir bu bunu buna bunun onu ona onun icin gibi ama fakat daha kadar " +
  "yok var olarak olan olur oldu ise mi mu da ki yani diye hem kendi yalniz sadece burada orada simdi " +
  "satir dosya kayit deger sayac yaz ekle sil eder edilir yazilir yazilmaz olmaz olmali hangi nasil tum").split(/\s+/u));

/** Dosyada yazılmayan fakat İngilizce yüzde adıyla anılan özel adlar. */
const OZEL_ADLAR = ["Sarmal", "Founder", "ŞEF"];

/**
 * Dosyaya yazılan fakat sözlükte enum olarak yaşamayan değerler: bir Uç'un
 * `yetki:` ve `koruma:` alanlarının ortak D5 sözlüğü (`herkese` · `girişli` ·
 * `girişsiz`). Kanon bu değerleri bir enum çizelgesinde tutmaz; ölçer onları
 * burada adıyla tanır.
 */
const DOSYA_DEGERLERI = ["herkese", "girişli", "girişsiz"];

/**
 * Düzyazının ortasında büyük harfle yazıldığında bile sıradan bir İngilizce
 * sözcük olan tip karşılıkları. Bunlar ikinci kusur sayımına girmez; aksi hâlde
 * "Run the check" ya da "Text references" gibi doğru cümleler kırmızı yanardı.
 */
const SIRADAN_INGILIZCE = new Set(["Run", "Runs", "Text", "Texts", "Row", "Rows", "Test", "Tests", "Model", "Models", "Data",
  "Log", "Logs", "Command", "Commands", "Event", "Events", "Form", "Forms", "Body", "Page", "Pages", "List", "Lists", "Card",
  "Cards", "Image", "Images", "Icon", "Icons", "Button", "Buttons", "Column", "Columns", "Stack", "Container", "Table",
  "Tables", "Cache", "Queue", "Secret", "Secrets", "Service", "Services", "State", "States", "Code", "Codes", "Config",
  "Environment", "Tool", "Tools", "Security", "Coverage", "Issue", "Issues", "Metric", "Metrics", "Git", "MCP", "Mockup",
  "Template", "Templates", "Formula", "Trace", "Traces", "Law", "Laws", "Philosophy", "Glossary", "Requirement",
  "Insight", "Experiment", "Orchestration", "Loop", "Workflow", "Mechanism", "Screen", "Screens", "Component",
  "Components", "Infrastructure", "Migration", "Task", "Tasks", "Eval", "Taxonomy", "AppBar", "TextField",
  "Checkbox", "Dropdown", "Toast", "Animation", "Scheduler", "Constitution", "Technology", "Technologies", "Data",
  "Trigger", "Triggers", "Hook", "Hooks", "Theme", "Themes", "Contract", "Contracts", "Endpoint", "Endpoints", "Fruit",
  "Workspace", "Workspaces"]);

interface AdEvreni {
  readonly turkce: ReadonlySet<string>;
  readonly ingilizceKarsilik: ReadonlySet<string>;
  /** Kenar ve alan adlarının İngilizce karşılıkları (`dependsOn`); tip adları girmez. */
  readonly alanKarsilik: ReadonlySet<string>;
  readonly ingilizceTip: ReadonlySet<string>;
}
let _evren: AdEvreni | undefined;

/** Dosyada yazılabilen Türkçe adlar ve onların İngilizce karşılıkları — sözlükten. */
function adEvreni(): AdEvreni {
  if (_evren) return _evren;
  const s = dilSozluguAl();
  const turkce = new Set<string>([
    ...Object.keys(s.widget), ...Object.keys(s.kenar), ...Object.keys(s.parametre), ...Object.keys(s.aileAdi ?? {}),
    ...Object.values(s.deger).flatMap((m) => Object.keys(m).map((k) => k.replace(/^\*/u, ""))),
    "çağır", "Tip", "Kural", "ne-zaman", "desenler", "anti-desenler", "şekil", ...OZEL_ADLAR, ...DOSYA_DEGERLERI,
  ]);
  const ingilizceKarsilik = new Set<string>();
  const alanKarsilik = new Set<string>();
  for (const bolum of [s.widget, s.kenar, s.parametre]) {
    for (const [tr, hane] of Object.entries(bolum)) {
      const en = hane.en;
      if (!en || en === tr || turkce.has(en)) continue;
      ingilizceKarsilik.add(en);
      if (bolum !== s.widget) alanKarsilik.add(en);
    }
  }
  const ingilizceTip = new Set<string>();
  for (const [tr, hane] of Object.entries(s.widget)) {
    const en = hane.en;
    if (!en || en === tr || turkce.has(en)) continue;
    const cogul = en.endsWith("y") ? `${en.slice(0, -1)}ies` : /(?:s|sh|ch|x)$/u.test(en) ? `${en}es` : `${en}s`;
    for (const bicim of [en, cogul]) if (!SIRADAN_INGILIZCE.has(bicim)) ingilizceTip.add(bicim);
  }
  for (const ek of ["Shelves", "Sub-layer", "Sub-layers", "Season", "Seasons"]) ingilizceTip.add(ek);
  return (_evren = { turkce, ingilizceKarsilik, alanKarsilik, ingilizceTip });
}

const kacir = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");

/**
 * Ölçülecek düzyazıyı çıkarır: kod blokları ve aralıkları, tırnaklı içerik,
 * bölüm etiketleri, yollar, makine kimlikleri ve tire bağlı tanı kimlikleri
 * düşer. İzinli metinler (fikstürün kendi içeriği, imlecin altındaki sözcük)
 * önce çıkarılır.
 */
function duzyaziyaIndir(metin: string, izinli: readonly string[]): string {
  let govde = metin;
  // İzinli metin yalnız sözcük sınırında düşer: tek harflik bir izinli değer
  // ("A") başka bir sözcüğün içinden ("Araç") harf koparmamalıdır.
  for (const parca of izinli) {
    if (parca) govde = govde.replace(new RegExp(`(?<![\\p{L}\\p{N}_])${kacir(parca)}(?![\\p{L}\\p{N}_])`, "gu"), " ");
  }
  return govde
    .replace(/```[\s\S]*?```/gu, " ")
    .replace(/`[^`\n]*`/gu, " ")
    .replace(/"[^"\n]*"/gu, " ")
    .replace(/“[^”\n]*”/gu, " ")
    .replace(/(?<![\p{L}])'[^'\n]*'(?![\p{L}])/gu, " ")
    .replace(/‹[^›\n]*›/gu, " ")
    .replace(/(?:https?|file):\/\/\S+/gu, " ")
    .replace(/\S*\/\S*/gu, " ")
    .replace(/\S+\.(?:sar|ts|json|md)\b/gu, " ")
    .replace(/[A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜ0-9]*(?:-[A-ZÇĞİÖŞÜ0-9…]+)+(?:\.\d+)*/gu, " ")
    .replace(/[\p{L}\p{N}_]+(?:-[\p{L}\p{N}_]+)+/gu, " ");
}

/**
 * Bir İngilizce yüz metninin ilkeyi bozan kusurları; boş liste temiz demektir.
 * `izinli`, metne bilerek giren içeriktir (dosyanın kendi Türkçe cümleleri,
 * imlecin altındaki ad) ve ölçümden önce düşer.
 */
export function ingilizceYuzKusurlari(metin: string, izinli: Iterable<string> = []): IngilizceYuzKusuru[] {
  const evren = adEvreni();
  const izin = [...izinli].filter((p) => p.trim().length > 0).sort((a, b) => b.length - a.length);
  const kusurlar: IngilizceYuzKusuru[] = [];
  const govde = duzyaziyaIndir(metin, izin);
  for (const sozce of govde.match(/\p{L}+/gu) ?? []) {
    if (evren.turkce.has(sozce)) continue;
    // Deve hörgücüyle yazılmış bir kenar ya da alan karşılığı (`dependsOn`)
    // düzyazıda da sıradan bir İngilizce sözcük olamaz; kod aralığı dışında da
    // sayılır. Tip karşılıkları bu kurala girmez, çünkü `AppBar` gibi çatı
    // adları açıklamada parantez içinde bilerek anılır.
    if (/\p{Ll}\p{Lu}/u.test(sozce) && evren.alanKarsilik.has(sozce)) {
      kusurlar.push({ tur: "ingilizce-ad", sozce });
      continue;
    }
    const kucuk = sozce.toLocaleLowerCase("tr").normalize("NFD").replace(/\p{M}/gu, "").replace(/ı/gu, "i");
    if (TURKCE_HARF.test(sozce) || DURAK_SOZCUKLER.has(kucuk)) kusurlar.push({ tur: "turkce-duzyazi", sozce });
  }
  // Kod aralığında dosyada bulunmayan ad karşılığı (`dependsOn:`). Kod blokları
  // açıklamalı iskelet çizimi taşıyabildiği için bu taramaya girmez.
  const kodlu = metin.replace(/```[\s\S]*?```/gu, " ");
  for (const aralik of kodlu.match(/`[^`\n]*`/gu) ?? []) {
    for (const sozce of aralik.match(/[\p{L}_][\p{L}\p{N}_]*/gu) ?? []) {
      if (evren.ingilizceKarsilik.has(sozce) && !evren.turkce.has(sozce)) kusurlar.push({ tur: "ingilizce-ad", sozce });
    }
  }
  // Düzyazının ortasında büyük harfle yazılmış tip karşılığı (`a Step`). Cümle
  // başındaki büyük harf dil bilgisidir ve sayılmaz. Ardından "panel" gelen ad
  // bir arayüz panelinin adıdır (Reminders panel), dosyadaki bir tipi anmaz.
  const tipDeseni = /[\p{L}-]+/gu;
  for (let m = tipDeseni.exec(govde); m; m = tipDeseni.exec(govde)) {
    const sozce = m[0];
    if (!/^\p{Lu}/u.test(sozce) || !evren.ingilizceTip.has(sozce)) continue;
    const once = govde.slice(0, m.index).trimEnd();
    if (once === "" || /[.!?:;\n—•·*_#(]$/u.test(once)) continue;
    if (/^\s+panel\b/u.test(govde.slice(m.index + sozce.length))) continue;
    kusurlar.push({ tur: "ingilizce-ad", sozce });
  }
  return kusurlar;
}

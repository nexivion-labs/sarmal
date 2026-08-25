// ═══════════════════════════════════════════════════════════════════════════
// mcp-metinleri.ts — MCP araç kimlikleri ve okuma-yüzü metinleri
//
//   MCP araç listesi yabancı bir ajanın Sarmal'ı öğrendiği ilk yüzdür. Araç
//   adları ile parametre adları protokol kimliğidir; çevrilmez. Kullanıcıya
//   görünen araç ve parametre açıklamaları ise aynı kimliğin tr/en hanelerinde
//   burada yaşar. mcp.ts davranışı yürütür, cümle kurmaz.
//
//   Kaynak .sar Türkçe kalır. Bu katalog yalnız tools/list okuma yüzünü seçilen
//   yayın diline taşır; şema tipleri, enumlar, zorunlu alanlar ve araç dönüşleri
//   üzerinde söz sahibi değildir.
// ═══════════════════════════════════════════════════════════════════════════

import {
  CIKTI_DILLERI,
  dilHanesi,
  type CiktiDili,
  type DilHaneleri,
} from "./cevir.ts";

/** Araç adları protokol kimliğidir; çağrı uyumluluğu için sabit kalır. */
export const MCP_ARAC_ADI = {
  sef: "sef",
  ogret: "ogret",
  kavram: "kavram",
  karne: "karne",
  basla: "basla",
  dogus: "dogus",
  graf: "graf",
  gezin: "gezin",
  denetle: "denetle",
  kurallar: "kurallar",
  siniflama: "siniflama",
  denetleProje: "denetle-proje",
  iskelet: "iskelet",
  etki: "etki",
  bul: "bul",
  bicimle: "bicimle",
  prizma: "prizma",
  durumGuncelle: "durum-guncelle",
} as const;

export type McpAracAdi = (typeof MCP_ARAC_ADI)[keyof typeof MCP_ARAC_ADI];

/** Dinamik enum ve açıklama parçaları kanonik kaynaklarından bağlamla gelir. */
export interface McpMetinBaglami {
  readonly kuralBolumleri: readonly string[];
  readonly sablonTurleri: readonly string[];
  readonly adimDurumlari: readonly string[];
}

type AciklamaKurucu = (baglam: McpMetinBaglami) => string;
type ParametreTuru = "string" | "boolean";

export interface McpParametreMetni {
  readonly type: ParametreTuru;
  readonly enum?: readonly string[] | ((baglam: McpMetinBaglami) => readonly string[]);
  readonly description: DilHaneleri<string>;
}

/**
 * MCP `Tool` ek açıklaması — alan adları protokol şemasından alınmıştır
 * (schema 2025-06-18: `Tool.title`, `Tool.annotations` → `ToolAnnotations`
 * içinde `title` · `readOnlyHint` · `destructiveHint`).
 *
 * `readOnlyHint` ZORUNLUDUR: her araç "diske dokunur muyum" sorusunu açıkça
 * yanıtlar; beyansız araç sessiz varsayılana düşerdi ve sessiz varsayılan
 * yanlış güven üretir. `destructiveHint` ise YALNIZ yazan araçta anlamlıdır —
 * protokolün kendi cümlesi "meaningful only when `readOnlyHint == false`"
 * der — bu yüzden okur ilan edilmiş araca yazılması nöbetle yasaklanır.
 *
 * Beyan dekoratif değildir: mcp-ek-aciklama nöbeti her aracı geçici bir
 * çalışma alanında GERÇEKTEN koşturur ve dosya ağacını önce/sonra karşılaştırır;
 * beyan ile ölçüm ayrışırsa süit kırmızıya döner.
 */
export interface McpEkAciklama {
  readonly title: DilHaneleri<string>;
  readonly readOnlyHint: boolean;
  readonly destructiveHint?: boolean;
}

export interface McpAracMetni {
  readonly ekAciklama: McpEkAciklama;
  readonly description: DilHaneleri<AciklamaKurucu>;
  readonly inputSchema: {
    readonly type: "object";
    readonly properties: Readonly<Record<string, McpParametreMetni>>;
    readonly required?: readonly string[];
  };
}

const aciklama = (
  tr: AciklamaKurucu,
  en: AciklamaKurucu,
): DilHaneleri<AciklamaKurucu> => ({ tr, en });

/** Okur araç: diske dokunmaz, bu yüzden yıkıcılık ipucu bilinçli olarak yazılmaz. */
const okur = (tr: string, en: string): McpEkAciklama => ({
  title: { tr, en },
  readOnlyHint: true,
});

/** Yazar araç: yıkıcılık ipucu ZORUNLU olarak beyan edilir — sessiz varsayılan
 *  (protokolde `destructiveHint` varsayılanı `true`) yanlış korku üretir. */
const yazar = (tr: string, en: string, destructiveHint: boolean): McpEkAciklama => ({
  title: { tr, en },
  readOnlyHint: false,
  destructiveHint,
});

const parametre = (
  type: ParametreTuru,
  tr: string,
  en: string,
  secenekler?: readonly string[] | ((baglam: McpMetinBaglami) => readonly string[]),
): McpParametreMetni => ({
  type,
  ...(secenekler ? { enum: secenekler } : {}),
  description: { tr, en },
});

/**
 * tools/list yüzünün tek kaynağı. Nesne sırası mevcut araç sırasını korur;
 * araç adı nesne anahtarıdır ve şema üreticisi `name` alanını buradan türetir.
 */
export const MCP_ARAC_METINLERI: Readonly<Record<McpAracAdi, McpAracMetni>> = {
  [MCP_ARAC_ADI.sef]: {
    ekAciklama: okur("Adım brifingi üret", "Build Adım briefing"),
    description: aciklama(
      () =>
        "Bir Adım KOD'u için ŞEF'in koni + beceri + kısıt-dolu prompt'unu üretir " +
        "(bağlam montajı). Ajan bu istemi okuyup Adım'ı disiplinle yapar — " +
        "Görev'le atanan Etmen'in becerileri de enjekte edilir. `dizin` bir çalışma-alanı (.sar ağacı kökü)." +
        " NE ZAMAN: bir Adım'ı işlemeye başlamadan önce — görevi koni+beceri disipliniyle almak için.",
      () =>
        "Builds ŞEF's cone-, skill-, and constraint-filled prompt for an Adım KOD " +
        "(context assembly). The agent reads this prompt and carries out the Adım with discipline; " +
        "the skills of the Etmen assigned through the Görev are also injected. `dizin` is a workspace (the .sar tree root)." +
        " WHEN: before starting work on an Adım—to receive the task with cone and skill guidance.",
    ),
    inputSchema: {
      type: "object",
      properties: {
        adim: parametre("string", "Adım KOD'u (ör. SEF-ATF-A01)", "Adım KOD (for example, SEF-ATF-A01)"),
        dizin: parametre("string", "çalışma-alanı dizini — .sar ağacı kökü (mutlak yol önerilir)", "workspace directory—the .sar tree root (an absolute path is recommended)"),
      },
      required: ["adim", "dizin"],
    },
  },

  [MCP_ARAC_ADI.ogret]: {
    ekAciklama: okur("Sarmal'ı öğret", "Teach Sarmal"),
    description: aciklama(
      () =>
        "Sarmal öğretim kapısı: konusuz çağrı KANONDAN üretilen karşılama kartını döndürür " +
        "(kopyalanabilir minimal proje + tam omurga + koni alanları + zorunlu kenarlar — CLI `sarmal ogret` ile AYNI kaynaktan üretilir); " +
        "`konu` verilirse ogrenme/ rafındaki eşleşen Beceri kartının TAM metni döner (ör. 'uretir-kenari', 'BCR-DURUM-AKISI'). " +
        "NE ZAMAN: Sarmal'la ilk temasında; bir tanı 'bkz: BCR-…' işaretçisi gösterdiğinde; bir kuralın nasıl uygulanacağını sormak istediğinde.",
      () =>
        "Sarmal's learning gateway: a call without `konu` returns the welcome card generated FROM THE CANON " +
        "(a copyable minimal project, the complete backbone, cone fields, and required edges—from the SAME source as CLI `sarmal ogret`); " +
        "when `konu` is provided, it returns the FULL matching Beceri card from the ogrenme/ shelf (for example, 'uretir-kenari' or 'BCR-DURUM-AKISI'). " +
        "WHEN: on your first contact with Sarmal; when a diagnostic shows a 'bkz: BCR-…' marker; or when you want to learn how to apply a rule.",
    ),
    inputSchema: {
      type: "object",
      properties: {
        konu: parametre("string", "beceri konusu ya da kodu (ör. 'uretir-kenari' · 'BCR-ADIM-YAZIMI'); boş = karşılama kartı", "Beceri topic or code (for example, 'uretir-kenari' or 'BCR-ADIM-YAZIMI'); empty returns the welcome card"),
      },
    },
  },

  [MCP_ARAC_ADI.kavram]: {
    ekAciklama: okur("Kavram sorgula", "Look up a concept"),
    description: aciklama(
      () =>
        "Tasarım/yazılım kavramı sorgusu — niyet diyaloğunun kapısı (BCR-NIYET-DIYALOGU). " +
        "NE ZAMAN: kullanıcı bir öğeyi adını bilmeden tarif ettiğinde ya da koniye kavram yazmadan önce. " +
        "`kelime` ver → kanon yolu + Flutter/React/SwiftUI + arkayüz eşlemesi + TR↔EN terim döner; " +
        "`baglam` ver (ör. 'Ekran', 'Adım.görev') → o bağlamın aday kavram aileleri (soru + üyeler, tam eşlemeli) döner. " +
        "Veri DİSKTEN okunur, böylece kanon her zaman günceldir (bilgi/tasarim_sozlugu). " +
        "SINIR: araç ÖNERİ sunar, seçim yapmaz — seçeneği kullanıcıya Türkçe adı ve tanımıyla sun, " +
        "seçilen kavramı koniye KANON YOLUYLA yaz, terimi bir kez öğret ve dayatma.",
      () =>
        "Looks up a design or software concept—the gateway to the intent dialogue (BCR-NIYET-DIYALOGU). " +
        "WHEN: when the user describes an element without knowing its name, or before writing a concept into the cone. " +
        "Provide `kelime` to receive the canon path, Flutter/React/SwiftUI and backend mappings, and the TR↔EN term; " +
        "provide `baglam` (for example, 'Ekran' or 'Adım.görev') to receive candidate concept families for that context (question plus fully mapped members). " +
        "Data is read FROM DISK so the canon stays current (bilgi/tasarim_sozlugu). " +
        "BOUNDARY: the tool offers OPTIONS; it does not choose. Present each option with its Turkish name and definition, " +
        "write the selected concept into the cone BY ITS CANON PATH, teach the term once, and do not impose it.",
    ),
    inputSchema: {
      type: "object",
      properties: {
        kelime: parametre("string", "aranacak Türkçe/İngilizce terim (ör. 'kapsayıcı', 'hover')", "Turkish or English term to look up (for example, 'kapsayıcı' or 'hover')"),
        baglam: parametre("string", "harita bağlam anahtarı (ör. 'Ekran', 'Adım.görev')", "map context key (for example, 'Ekran' or 'Adım.görev')"),
      },
    },
  },

  [MCP_ARAC_ADI.karne]: {
    ekAciklama: okur("Etmen karnesini oku", "Read the Etmen report card"),
    description: aciklama(
      () =>
        "Etmen karne raporu — Founder-onaylı ⭐ beş-derece skalası ve kadrodaki Etmen dökümü. " +
        "NE ZAMAN: kadroyu ya da bir etmenin başarım yüzünü görmek istediğinde. " +
        "DÜRÜSTLÜK: sicil verisi henüz toplanmadığından hiçbir etmene derece BASILMAZ — 'henüz sicil yok' denir; " +
        "uydurma puan üretme, bu raporu olduğu gibi aktar. Ağırlık ve formül örtü tarafının gizli politikasıdır, bu araçta yaşamaz.",
      () =>
        "Etmen report card—the Founder-approved five-grade ⭐ scale and a roster of Etmen records. " +
        "WHEN: when you need to inspect the roster or an Etmen's performance surface. " +
        "INTEGRITY: because registry data has not been collected yet, no Etmen receives a grade; the report says 'henüz sicil yok' (no registry yet). " +
        "Do not invent a score; relay the report as returned. Weighting and formulas are private overlay policy and do not live in this tool.",
    ),
    inputSchema: {
      type: "object",
      properties: {
        dizin: parametre("string", "çalışma alanı kökü (varsayılan: '.')", "workspace root (default: '.')"),
      },
    },
  },

  [MCP_ARAC_ADI.basla]: {
    ekAciklama: okur("Doğuş rehberi ve şablon iste", "Request the birth guide and a template"),
    description: aciklama(
      (b) =>
        "DOĞUŞ REHBERİ: bir Sarmal projesini ya da düğümünü DOĞRU SIRADA yazsın diye " +
        "yönlendirir — anadizin ve Teknoloji, sonra Faz, Blok ve Katman ekseni, sonra Adım KONİSİ, sonra KAVUŞUM " +
        "omurgası. Tür verilirse KONİ-DOLU şablon döner; yalın iskelet TUZAKTIR. " +
        "Ajan yazmadan ÖNCE çağırır. Türler: " + b.sablonTurleri.join(" · ") + ". " +
        "Bu araç REHBER ve şablon verir; dosyayı AJAN yazar — burası yönetişim katmanıdır, derleyici değil." +
        " NE ZAMAN: yeni proje ya da düğüm yazımına başlarken doğru sıra ve şablon gerektiğinde.",
      (b) =>
        "BIRTH GUIDE: guides the agent to write a Sarmal project or node IN THE RIGHT ORDER—" +
        "anadizin and Teknoloji first; then the Faz, Blok, and Katman axis; then the Adım CONE; then the KAVUŞUM backbone. " +
        "When a type is supplied, it returns a CONE-FILLED template; a bare skeleton is a trap. " +
        "Call it BEFORE writing. Types: " + b.sablonTurleri.join(" · ") + ". " +
        "This tool provides GUIDANCE and a template; the AGENT writes the file. It is a guidance surface, not a compiler." +
        " WHEN: when starting a new project or node and you need the correct sequence and template.",
    ),
    inputSchema: {
      type: "object",
      properties: {
        tur: parametre("string", "Doğurulacak düğüm türü (verilmezse omurga + tür listesi döner)", "node type to create (when omitted, returns the backbone and type list)", (b) => b.sablonTurleri),
      },
    },
  },

  [MCP_ARAC_ADI.dogus]: {
    // Ölçüm: dogus.ts var olan dosyayı existsSync ile atlar ve raporlar; yazım
    // yalnız EKLEYİCİDİR, bu yüzden yıkıcılık ipucu dürüstçe yanlış beyan edilir.
    ekAciklama: yazar("Doğuş paketini diske yaz", "Write the birth package to disk", false),
    description: aciklama(
      () =>
        "DOĞUŞ PAKETİ (DPK-A02 · flutter-create paritesi): hedef dizinde ÇALIŞIR proje doğurur — " +
        "anadizin + durum/durum_devir + ogrenme/dersler+geribildirim + plan/ilk_plan (katı rejimde " +
        "tam-zincir, koni-dolu ilk Adım). ÖNCE SORAR: tur alanı proje ise hedef doğrudan Proje kökü olur; " +
        "calisma-alani ise hedef ÇalışmaAlanı kökü olur ve ilk proje onun altında kendi köküyle doğar (MIM-1.1); " +
        "tur verilmezse araç yazmadan soruyu döndürür. Doğan proje denetle'den sıfır hata ile çıkar; her dosya " +
        "kendi doldurma öğretisini taşır. Var olan dosya ASLA ezilmez — atlanır ve raporlanır. " +
        "`basla` REHBER verir (yazmaz), bu araç PAKETİ YAZAR; ikisi kardeştir." +
        " NE ZAMAN: boş dizinde çalışır bir Sarmal projesi doğurman istendiğinde.",
      () =>
        "BIRTH PACKAGE (DPK-A02, flutter-create parity): creates a WORKING project in the target directory—" +
        "anadizin; durum/durum_devir; ogrenme/dersler plus geribildirim; and plan/ilk_plan " +
        "(a complete strict-mode backbone with a cone-filled first Adım). IT ASKS FIRST: with tur = proje the target becomes the Proje root; " +
        "with tur = calisma-alani the target becomes the ÇalışmaAlanı root and the first project is born beneath it with its own root (MIM-1.1); " +
        "when tur is omitted the tool returns the question without writing. The new project passes denetle with zero errors, " +
        "and each file carries guidance for filling it in. Existing files are NEVER overwritten; they are skipped and reported. " +
        "`basla` provides the GUIDE without writing, while this tool WRITES THE PACKAGE; they are companion tools." +
        " WHEN: when you need a working Sarmal project created in an empty directory.",
    ),
    inputSchema: {
      type: "object",
      properties: {
        hedef: parametre("string", "Projenin ya da çalışma alanının doğacağı dizin (yoksa oluşturulur)", "directory where the project or workspace will be created (created if absent)"),
        tur: parametre("string", "Ne doğacak: proje (hedef doğrudan Proje kökü olur) ya da calisma-alani (hedef ÇalışmaAlanı kökü olur, ilk proje altında kendi köküyle doğar); verilmezse araç hiçbir dosya yazmadan bu soruyu sorar", "what is born: proje (the target becomes the Proje root) or calisma-alani (the target becomes the ÇalışmaAlanı root and the first project is born beneath it with its own root); when omitted the tool asks this question without writing any file", ["proje", "calisma-alani"]),
        ad: parametre("string", "Proje ya da çalışma alanı adı (verilmezse hedef dizinin adı kullanılır)", "project or workspace name (when omitted, uses the target directory name)"),
        proje: parametre("string", "Çalışma alanı seçildiğinde altında doğacak ilk projenin adı (verilmezse ilk_proje)", "name of the first project born under the workspace (defaults to ilk_proje)"),
      },
      required: ["hedef"],
    },
  },

  [MCP_ARAC_ADI.graf]: {
    ekAciklama: okur("Proje grafını oku", "Read the project graph"),
    description: aciklama(
      () =>
        "Projenin kanonik grafını döndürür — derleyicinin DAG çıktısı determinist JSON: " +
        "düğümler (kod·tip·durum·kapsayan içerme-kenarı·öncekiler/sonrakiler bağımlılık-kenarları) " +
        "+ kopuk uçlar + karne özeti. Ajan 'bu değişiklik neyi etkiler / plan nerede?' sorusunu " +
        "dosya taramadan grafa sorar. `kok` verilirse alt-graf (kapsananlar+atalar+ileri kapanış). " +
        "YALNIZ okuma — yazım koniYaz kapısından geçer." +
        " NE ZAMAN: projenin bütününü (bağımlılık · ilerleme · kopuk uç) programatik okuman gerektiğinde.",
      () =>
        "Returns the project's canonical graph as deterministic JSON from the compiler DAG: " +
        "nodes (kod, type, status, containing edge, and predecessor/successor dependency edges), dangling ends, and a report-card summary. " +
        "Ask the graph 'what does this change affect?' or 'where is the plan?' instead of scanning files. " +
        "When `kok` is provided, returns a subgraph of contained nodes, ancestors, and the forward closure. " +
        "READ ONLY—writes pass through the koniYaz gateway." +
        " WHEN: when you need to read the whole project programmatically (dependencies, progress, or dangling ends).",
    ),
    inputSchema: {
      type: "object",
      properties: {
        dizin: parametre("string", "çalışma-alanı dizini — .sar ağacı kökü (mutlak yol önerilir)", "workspace directory—the .sar tree root (an absolute path is recommended)"),
        kok: parametre("string", "isteğe bağlı odak KOD — alt-graf filtresi (ör. BLK-VITRIN)", "optional focus KOD used as a subgraph filter (for example, BLK-VITRIN)"),
      },
      required: ["dizin"],
    },
  },

  [MCP_ARAC_ADI.gezin]: {
    ekAciklama: okur("Tanıma ve atıflara git", "Go to definition and references"),
    description: aciklama(
      () =>
        "⚡ ALIŞKANLIK: bir .sar ya da plan içinde tanımadığın bir KOD gördüğünde dosya " +
        "taramak YERİNE önce bunu çağır — insanın ⌘+tık/F12 refleksinin ajan hâli. " +
        "Bir KOD'un TANIMINI ve TÜM ATIFLARINI dosya:satır:sütun konumlarıyla döndürür — " +
        "geliştiricinin F12 (tanıma-git) + ⇧F12 (referans-bul) kısayollarının ajan ikizi. " +
        "Ajan 'bu Adım nerede tanımlı, kimler bağımlı?' sorusunu dosya taramadan (grep'siz) " +
        "kimlik indeksine sorar: bağımlı:/uygular:/çağır yapısal atıfları + string/yorum içi " +
        "metin atıfları dahil; atıf evreni .sar, .md ve .ts dosyalarını kapsar (KARARLAR/CHANGELOG/" +
        "kod-yorumu dokunuşları da görünür). Kırık atıf (tanımı yok) ve yinelenen tanım dürüstçe " +
        "raporlanır. Etki analizi için graf aracını tamamlar: graf KENARLARI verir, gezin KONUMLARI." +
        " NE ZAMAN: tanımadığın bir KOD gördüğün an — grep/dosya taraması yerine ilk refleks.",
      () =>
        "⚡ HABIT: when you encounter an unfamiliar KOD in a .sar file or plan, call this FIRST instead of scanning files—the agent counterpart of ⌘+click/F12. " +
        "Returns a KOD's DEFINITION and ALL REFERENCES with file:line:column locations, mirroring a developer's F12 (go to definition) and ⇧F12 (find references). " +
        "Ask the identity index 'where is this Adım defined, and what depends on it?' without grep or file scanning. " +
        "Results include structural references through bağımlı:/uygular:/çağır and textual references in strings or comments; " +
        "the reference universe covers .sar, .md, and .ts files, including KARARLAR, CHANGELOG, and code-comment touchpoints. " +
        "Broken references and duplicate definitions are reported plainly. It complements graf for impact analysis: graf gives EDGES; gezin gives LOCATIONS." +
        " WHEN: the moment you see an unfamiliar KOD—make this your first step instead of grep or file scanning.",
    ),
    inputSchema: {
      type: "object",
      properties: {
        kod: parametre("string", "Aranan KOD (düğüm, karar ya da akış kimliği)", "KOD to locate (a node, decision, or flow identity)"),
        dizin: parametre("string", "çalışma-alanı dizini — .sar ağacı kökü (mutlak yol önerilir)", "workspace directory—the .sar tree root (an absolute path is recommended)"),
      },
      required: ["kod", "dizin"],
    },
  },

  [MCP_ARAC_ADI.denetle]: {
    ekAciklama: okur("Tek .sar kaynağını denetle", "Check a single .sar source"),
    description: aciklama(
      () =>
        "Bir .sar kaynağını Sarmal motoruyla denetler; Türkçe, konumlu drift " +
        "tanılarını (SNF-0 şema + sarma uyumu) döndürür. Ajan " +
        "'yazdığım .sar doğru mu?' diye sorar, tanıları geri alır. " +
        "ÇalışmaAlanı örtüsü (ortu.json enum genişletmesi) `yol` verilirse dosyanın " +
        "dizininden, yoksa `dizin` argümanından find-up ile çözülür (A11/E2). " +
        "⚠️ SINIR (A7): bu araç TEK DOSYA/KAYNAK denetler — dosyalar-arası kapılar " +
        "(kırık-referans · kayıp-yapı/disk-mutabakat · DAG/döngü · kural-motoru) " +
        "BURADA KOŞMAZ. Tek-dosya yeşili PROJE yeşili DEĞİLDİR; bütünü ilan etmeden " +
        "önce MUTLAKA `denetle-proje { dizin }` MCP aracını koş (ya da CLI `sarmal " +
        "denetle <dizin>`) — TAM-yeşil demek sıfır hata ve sıfır uyarı demektir." +
        " NE ZAMAN: bir .sar yazdıktan/değiştirdikten hemen sonra — kaydetmeden önce doğruluk turu.",
      () =>
        "Checks one .sar source with the Sarmal engine and returns Turkish, location-aware drift diagnostics for SNF-0 schema and containment conformance. " +
        "Use it to ask 'is the .sar I wrote valid?' and receive the diagnostics. " +
        "The ÇalışmaAlanı overlay (ortu.json enum extension) is resolved by find-up from the file directory when `yol` is provided, or from the `dizin` argument otherwise (A11/E2). " +
        "⚠️ BOUNDARY (A7): this tool checks ONE FILE OR SOURCE. Cross-file gates—broken references, missing structure/disk agreement, DAG/cycles, and the rule engine—DO NOT RUN HERE. " +
        "A green single-file result IS NOT a green project. Before declaring the whole project clean, ALWAYS run the `denetle-proje { dizin }` MCP tool " +
        "(or CLI `sarmal denetle <dizin>`). FULL GREEN means zero errors and zero warnings." +
        " WHEN: immediately after writing or changing a .sar file, as a correctness pass before saving.",
    ),
    inputSchema: {
      type: "object",
      properties: {
        kaynak: parametre("string", ".sar kaynak metni (doğrudan denetlenir)", ".sar source text to check directly"),
        yol: parametre("string", ".sar dosya yolu (kaynak verilmezse dosyadan okunur; örtü bu dizinden çözülür)", ".sar file path (read when `kaynak` is omitted; the overlay is resolved from this directory)"),
        dizin: parametre("string", "çalışma-alanı dizini — kaynak-metin denetlenirken örtü (ortu.json) buradan çözülür (opsiyonel)", "workspace directory used to resolve the overlay (ortu.json) when checking source text (optional)"),
        agac: parametre("boolean", "true → yanıta yapı ağacı da eklenir (CLI --agac ile birebir aynı çekirdek)", "true adds the structure tree to the response (the exact same core as CLI --agac)"),
      },
    },
  },

  [MCP_ARAC_ADI.kurallar]: {
    ekAciklama: okur("Kanon kurallarını oku", "Read the canon rules"),
    description: aciklama(
      (b) =>
        "Sarmal kanon kurallarını (yasa/kanon) döndürür — ajan yazmadan ÖNCE " +
        "anayasayı okur. Kategorisiz çağrı: bölüm listesi + kural↔kapı haritası. " +
        "Bölümler: " + b.kuralBolumleri.join(" · ") + ". " +
        "Kurallar .sar kaynağıyla gelir (dil kendini kendi diliyle anlatır)." +
        " NE ZAMAN: yazmaya başlamadan önce ve bir kural tanısının dayanağını anlamak istediğinde.",
      (b) =>
        "Returns Sarmal's canonical rules from yasa/kanon so the agent can read the constitution BEFORE writing. " +
        "A call without `kategori` returns the section list and the rule-to-gate map. " +
        "Sections: " + b.kuralBolumleri.join(" · ") + ". " +
        "Rules are returned as their Turkish .sar source; the canonical source is not translated." +
        " WHEN: before you start writing, and when you need to understand the basis of a rule diagnostic.",
    ),
    inputSchema: {
      type: "object",
      properties: {
        kategori: parametre("string", "Kanon bölümü (verilmezse bölüm listesi + harita döner)", "canon section (when omitted, returns the section list and map)", (b) => b.kuralBolumleri),
      },
    },
  },

  [MCP_ARAC_ADI.siniflama]: {
    ekAciklama: okur("Tip kanonunu oku", "Read the type canon"),
    description: aciklama(
      () =>
        "SNF-0 tip kanonunu döndürür — ajan hangi tip/kenar/sarma geçerli bilsin. " +
        "Tipsiz çağrı: genel bakış (aileler · tipler · kenarlar · yüzey kuralı). " +
        "Tip verilirse: o tipin ailesi, şeması (zorunlu/enum/tür), sarma ilişkileri." +
        " NE ZAMAN: hangi tip/kenar/sarma geçerli emin değilken — uydurma tip yazmadan önce.",
      () =>
        "Returns the SNF-0 type canon so the agent can see which types, edges, and containment relationships are valid. " +
        "A call without `tip` returns an overview of families, types, edges, and the surface rule. " +
        "When `tip` is provided, it returns that type's family, schema (required fields, enums, and field types), and containment relationships." +
        " WHEN: when you are unsure which type, edge, or containment is valid—before writing an invented type.",
    ),
    inputSchema: {
      type: "object",
      properties: {
        tip: parametre("string", "Widget tip adı (örn. Adım, Etmen, Takım)", "Widget type name (for example, Adım, Etmen, or Takım)"),
      },
    },
  },

  [MCP_ARAC_ADI.denetleProje]: {
    // Ölçüm: alt-süreç CLI `sarmal denetle <dizin>` yolunda tek bir yazım çağrısı
    // yoktur (mühürleme `kilitle` komutunun işidir), bu yüzden köprü de okurdur.
    ekAciklama: okur("Projeyi baştan sona denetle", "Check the whole project"),
    description: aciklama(
      () =>
        "PROJE TAM-denetimi: CLI `sarmal denetle <dizin>` alt-süreç olarak koşulur, çıktı " +
        "AYNEN döner (tek-kaynak — MCP ayrı denetim mantığı taşımaz). MCP `denetle` aracının " +
        "TEK-DOSYA sınırını (A7) aşar: kırık-referans · disk-mutabakat · DAG/döngü · " +
        "kural motoru dahil TÜM bekçiler koşar. ⚡ ALIŞKANLIK: 'bütün proje yeşil mi?' " +
        "sorusunda tek dosya denetlemekle yetinme — TAM hüküm BU araçtan ya da CLI'den alınır." +
        " NE ZAMAN: proje BÜTÜNÜNÜN drift hükmü gerektiğinde — tek-dosya denetle yetmediğinde.",
      () =>
        "FULL PROJECT check: runs CLI `sarmal denetle <dizin>` as a child process and returns its output EXACTLY " +
        "(one source; MCP carries no separate checking logic). It goes beyond the MCP `denetle` tool's ONE-FILE boundary (A7): " +
        "all guards run, including broken references, disk agreement, DAG/cycles, and the rule engine. " +
        "⚡ HABIT: when asking 'is the whole project green?', do not stop at one file; obtain the FULL verdict from this tool or the CLI." +
        " WHEN: when you need the drift verdict for the WHOLE project and single-file denetle is not enough.",
    ),
    inputSchema: {
      type: "object",
      properties: {
        dizin: parametre("string", "proje/çalışma-alanı dizini — .sar ağacı kökü (mutlak yol önerilir)", "project or workspace directory—the .sar tree root (an absolute path is recommended)"),
      },
      required: ["dizin"],
    },
  },

  [MCP_ARAC_ADI.iskelet]: {
    // Ölçüm: `uret: true` verildiğinde iskeletYaz diske klasör ve dosya üretir,
    // dolayısıyla araç bir bütün olarak YAZARDIR — önizleme kipinin diske
    // dokunmaması aracı okur yapmaz, ipucu en geniş davranışı beyan etmelidir.
    // Var olan yapı ezilmez (existsSync ile atlanır) → yazım yalnız ekleyicidir.
    ekAciklama: yazar("İlan edilen iskeleti üret", "Generate the declared skeleton", false),
    description: aciklama(
      () =>
        "İSKELET ÜRET (ilan→scaffold→doldur döngüsünü MCP'de kapatır · GBR-A04/#7): giriş " +
        "dosyasında (<varlık>_anadizin.sar) İLAN EDİLEN ama diskte OLMAYAN klasör/dosyaları " +
        "materyalize eder — `kayıp-yapı` tanısının doğrudan çözümü. Çekirdek CLI `--iskelet` " +
        "ile TEK kaynak (iskeletYaz · kopya mantık yok). GÜVENLİ VARSAYILAN: `uret` verilmezse " +
        "ÖNİZLEME (ne üretileceğini yazar, diske DOKUNMAZ). Gerçek üretim için `uret: true`. " +
        "Mevcut dosya/klasörleri EZMEZ (yalnız eksikleri ekler). ⚡ Akış: iskelet{dizin} önizle → " +
        "iskelet{dizin,uret:true} üret → denetle-proje{dizin} ile kayıp-yapı temizliğini doğrula." +
        " NE ZAMAN: denetle kayıp-yapı bildirdiğinde — ilan edilen yapıyı diske üretmek için.",
      () =>
        "GENERATE SKELETON (closes the declare→scaffold→fill loop in MCP, GBR-A04/#7): materializes directories and files " +
        "DECLARED in the entry file (<entity>_anadizin.sar) but MISSING on disk—the direct remedy for a `kayıp-yapı` diagnostic. " +
        "It shares ONE source with core CLI `--iskelet` (iskeletYaz, no copied logic). SAFE DEFAULT: when `uret` is omitted, it PREVIEWS what would be created and DOES NOT touch disk. " +
        "Use `uret: true` for actual generation. Existing files and directories are NEVER overwritten; only missing items are added. " +
        "⚡ Flow: preview with iskelet{dizin} → generate with iskelet{dizin,uret:true} → verify `kayıp-yapı` is clear with denetle-proje{dizin}." +
        " WHEN: when denetle reports `kayıp-yapı` and you need to materialize the declared structure on disk.",
    ),
    inputSchema: {
      type: "object",
      properties: {
        dizin: parametre("string", "proje dizini — giriş dosyasının (<varlık>_anadizin.sar) kökü (mutlak yol önerilir)", "project directory—the root containing the entry file (<entity>_anadizin.sar); an absolute path is recommended"),
        uret: parametre("boolean", "true → eksik yapıyı DİSKE üret; verilmez/false → yalnız önizleme (güvenli varsayılan)", "true creates missing structure ON DISK; omitted or false only previews (safe default)"),
      },
      required: ["dizin"],
    },
  },

  [MCP_ARAC_ADI.etki]: {
    ekAciklama: okur("Etki analizini oku", "Read the impact analysis"),
    description: aciklama(
      () =>
        "💥 Etki analizi: 'bu düğüme dokunursam NE etkilenir?' — verilen KOD'u bekleyen " +
        "doğrudan + geçişli tüm ardıllar, topolojik sırada, durum rozetleriyle (CLI etki " +
        "yüzüyle aynı çekirdek). graf KENARLARI, gezin KONUMLARI, etki SONUÇLARI verir. " +
        "⚡ ALIŞKANLIK: bir Adımı ya da kuralı değiştirmeden ÖNCE çağır; kör dokunuş sapmaya yol açar." +
        " NE ZAMAN: bir düğüme dokunmadan ÖNCE — 'kim etkilenir' sorusunun cevabı için.",
      () =>
        "💥 Impact analysis: answers 'what will be affected if I touch this node?' by returning every direct and transitive successor waiting on the given KOD, " +
        "in topological order with status badges, using the same core as the CLI impact surface. graf gives EDGES, gezin gives LOCATIONS, and etki gives CONSEQUENCES. " +
        "⚡ HABIT: call it BEFORE changing an Adım or rule so the affected surface is visible." +
        " WHEN: BEFORE touching a node—to answer 'who will be affected?'.",
    ),
    inputSchema: {
      type: "object",
      properties: {
        kod: parametre("string", "etkisi sorulan KOD (ör. SEF-ATF-A01, MEK-SEF)", "KOD whose impact is requested (for example, SEF-ATF-A01 or MEK-SEF)"),
        dizin: parametre("string", "çalışma-alanı dizini — .sar ağacı kökü (mutlak yol önerilir)", "workspace directory—the .sar tree root (an absolute path is recommended)"),
      },
      required: ["kod", "dizin"],
    },
  },

  [MCP_ARAC_ADI.bul]: {
    ekAciklama: okur("Düğüm metninde ara", "Search node text"),
    description: aciklama(
      () =>
        "🔎 Metin arama (⌘T'nin ajan hâli): düğümlerin KOD'unda, adında (ne/ad) ve niyetinde " +
        "(görev + /// belge) geçen metni arar; dosya:satır:sütun konumlarıyla döndürür. " +
        "KOD'u TAM biliyorsan gezin daha keskindir (tanım+atıflar); bul, KOD'u BİLMEDİĞİN " +
        "('şu konuyu hangi düğüm anlatıyordu?') durumların aracıdır. " +
        "⚡ ALIŞKANLIK: dosyaları elle taramak yerine önce bul'a sor." +
        " NE ZAMAN: KOD'unu bilmediğin bir kavramı metinle ararken (KOD biliniyorsa gezin).",
      () =>
        "🔎 Text search (the agent counterpart of ⌘T): searches text in node KODs, names (ne/ad), and intent (görev plus /// document blocks), " +
        "then returns file:line:column locations. If you know the exact KOD, gezin is more precise because it returns the definition and references; " +
        "bul is for cases where you DO NOT KNOW the KOD, such as 'which node described this topic?'. " +
        "⚡ HABIT: ask bul before scanning files manually." +
        " WHEN: when searching by text for a concept whose KOD you do not know; use gezin when the KOD is known.",
    ),
    inputSchema: {
      type: "object",
      properties: {
        metin: parametre("string", "aranan metin (büyük/küçük harf duyarsız, Türkçe-normalize)", "text to search for (case-insensitive with Turkish normalization)"),
        dizin: parametre("string", "çalışma-alanı dizini — .sar ağacı kökü (mutlak yol önerilir)", "workspace directory—the .sar tree root (an absolute path is recommended)"),
      },
      required: ["metin", "dizin"],
    },
  },

  [MCP_ARAC_ADI.bicimle]: {
    // Ölçüm: araç biçimlenmiş METNİ döndürür; dosyayı yazmak çağıranın işidir.
    ekAciklama: okur("Kaynağı biçimlendir", "Format the source"),
    description: aciklama(
      () =>
        "🪞 BÇ-standart biçimlendirme: .sar kaynağını Sarmal biçim kuralına (2 boşluk/kat · " +
        "sağ-boşluk kırp · boş-satır teke) getirir ve METNİ DÖNDÜRÜR — dosya YAZMAZ, yazmak " +
        "ajanın ve editörün işidir. Eklentideki ⇧⌥F ile AYNI çekirdeği kullanır (bicimle.ts) ve tekrar koşturmak sonucu değiştirmez. " +
        "Yorum, dizgi ve belge bloğu içine DOKUNMAZ. ⚡ ALIŞKANLIK: girintiyi elle düzeltme, bicimle'ye ver." +
        " NE ZAMAN: bir .sar'ı kaydetmeden önce biçimi standarda çekmek için.",
      () =>
        "🪞 BÇ-standard formatting: brings .sar source to Sarmal's format—two spaces per level, trailing whitespace removed, and repeated blank lines collapsed—and RETURNS THE TEXT. " +
        "It DOES NOT write the file; writing remains the agent's or editor's job. It uses the SAME bicimle.ts core as ⇧⌥F in the extension and is idempotent. " +
        "It DOES NOT alter content inside comments, strings, or document blocks. ⚡ HABIT: give indentation work to bicimle instead of fixing it by hand." +
        " WHEN: before saving a .sar file, to bring its format to the standard.",
    ),
    inputSchema: {
      type: "object",
      properties: {
        kaynak: parametre("string", "biçimlendirilecek .sar kaynak metni", ".sar source text to format"),
      },
      required: ["kaynak"],
    },
  },

  [MCP_ARAC_ADI.prizma]: {
    ekAciklama: okur("Kaynağı başka yüze yansıt", "Project the source to another surface"),
    description: aciklama(
      () =>
        "🔺 Prizma yüzleri: tek .sar kaynağını istenen yüze yansıtır — json · yaml · xml " +
        "(yapısal ikizler) · md (belge yüzü). CLI prizma ile AYNI çekirdeği kullanır; kaynak " +
        "TEK, yüzler türetilir — elle ikiz tutma yasak. Ajan yapısal işleme için json'u, " +
        "insan-okur özet için md'yi ister." +
        " NE ZAMAN: .sar içeriğini başka formatta (json · yaml · md) tüketmen gerektiğinde.",
      () =>
        "🔺 Prizma surfaces: projects one .sar source into the requested surface—json, yaml, or xml structural twins, or the md document surface. " +
        "It uses the SAME core as CLI prizma. The source stays SINGLE and the surfaces are derived; do not maintain manual twins. " +
        "Use json for structural processing and md for a human-readable summary." +
        " WHEN: when you need to consume .sar content in another format (json, yaml, xml, or md).",
    ),
    inputSchema: {
      type: "object",
      properties: {
        kaynak: parametre("string", "yansıtılacak .sar kaynak metni", ".sar source text to project"),
        yuz: parametre("string", "istenen yüz", "requested surface", ["json", "yaml", "xml", "md"]),
      },
      required: ["kaynak", "yuz"],
    },
  },

  [MCP_ARAC_ADI.durumGuncelle]: {
    // Ölçüm: adimDurumYaz var olan `durum:` değerinin ÜSTÜNE yazar; eski değer
    // kaybolur. Yazım eklemeli değil değiştirmelidir, bu yüzden yıkıcıdır.
    ekAciklama: yazar("Adım durumunu yaz", "Write an Adım's status", true),
    description: aciklama(
      () =>
        "✍️ İLK YAZAN ARAÇ (Founder onayı 2026-07-12 · DAR SINIR): bir Adım'ın YALNIZ " +
        "`durum:` alanını, YALNIZ geçerli enum değerine günceller — başka alan/tip yazamaz. " +
        "Yazım tek mekanizmadan geçer (satirdaDegerDegistir + yazma-kilidi + re-parse guard, " +
        "SENK-A05 TEK-YAZAR): geçersiz değerde ya da en küçük şüphede dosyaya DOKUNULMAZ, " +
        "dürüst hata döner. ⚡ ALIŞKANLIK: bir Adım'a başlarken geliştirmede, " +
        "kabul kanıtlanınca tamamlandı yaz; böylece plan CANLI kalır." +
        " NE ZAMAN: bir Adım'ın durumunu değiştirirken — elle dosya düzenleme YERİNE tek yazım kapısı.",
      () =>
        "✍️ FIRST WRITING TOOL (Founder approval 2026-07-12, NARROW BOUNDARY): updates ONLY an Adım's `durum:` field and ONLY to a valid enum value; it cannot write another field or type. " +
        "Writing passes through one mechanism—satirdaDegerDegistir, write lock, and re-parse guard under the SENK-A05 SINGLE-WRITER rule. " +
        "For an invalid value or the smallest uncertainty, the file is NOT touched and a clear error is returned. " +
        "⚡ HABIT: write geliştirmede when starting an Adım and tamamlandı when acceptance is proven so the plan stays LIVE." +
        " WHEN: when changing an Adım's status—use the single write gateway instead of editing the file by hand.",
    ),
    inputSchema: {
      type: "object",
      properties: {
        dizin: parametre("string", "çalışma-alanı dizini — .sar ağacı kökü (mutlak yol önerilir)", "workspace directory—the .sar tree root (an absolute path is recommended)"),
        kod: parametre("string", "durumu güncellenecek Adım KOD'u", "Adım KOD whose status will be updated"),
        durum: parametre("string", "yeni durum (kanon enum)", "new status (canonical enum)", (b) => b.adimDurumlari),
      },
      required: ["dizin", "kod", "durum"],
    },
  },
} as const;

/** `ToolAnnotations` yüzü — protokol şemasındaki alan adlarıyla birebir. */
export interface McpAracEkAciklamaSemasi {
  readonly title: string;
  readonly readOnlyHint: boolean;
  readonly destructiveHint?: boolean;
}

export interface McpAracSemasi {
  readonly name: McpAracAdi;
  /** `Tool.title` — 2025-06-18 şemasında görünen ad burada yaşar. */
  readonly title: string;
  readonly description: string;
  /** `Tool.annotations` — eski istemciler görünen adı buradan okur (öncelik
   *  sırası protokolde `title` → `annotations.title` → `name` biçimindedir). */
  readonly annotations: McpAracEkAciklamaSemasi;
  readonly inputSchema: {
    readonly type: "object";
    readonly properties: Readonly<Record<string, {
      readonly type: ParametreTuru;
      readonly enum?: readonly string[];
      readonly description: string;
    }>>;
    readonly required?: readonly string[];
  };
}

/** Katalogdan seçilen dilde, davranış şemasını değiştirmeden tools/list üretir. */
export function mcpAracSemalari(
  dil: CiktiDili,
  baglam: McpMetinBaglami,
): readonly McpAracSemasi[] {
  return (Object.entries(MCP_ARAC_METINLERI) as Array<[McpAracAdi, McpAracMetni]>).map(([name, metin]) => {
    const properties = Object.fromEntries(Object.entries(metin.inputSchema.properties).map(([ad, p]) => [
      ad,
      {
        type: p.type,
        ...(p.enum ? { enum: typeof p.enum === "function" ? p.enum(baglam) : p.enum } : {}),
        description: dilHanesi(p.description, dil),
      },
    ]));
    const baslik = dilHanesi(metin.ekAciklama.title, dil);
    return {
      name,
      title: baslik,
      description: dilHanesi(metin.description, dil)(baglam),
      annotations: {
        title: baslik,
        readOnlyHint: metin.ekAciklama.readOnlyHint,
        ...(metin.ekAciklama.destructiveHint === undefined
          ? {}
          : { destructiveHint: metin.ekAciklama.destructiveHint }),
      },
      inputSchema: {
        type: "object",
        properties,
        ...(metin.inputSchema.required ? { required: metin.inputSchema.required } : {}),
      },
    };
  });
}

/** Nöbetin mutasyonlu katalog da alabilmesi için bilinçli olarak gevşek okuma şekli. */
export type McpMetinKatalogu = Readonly<Record<string, {
  readonly ekAciklama?: {
    readonly title?: Partial<Record<CiktiDili, unknown>>;
    readonly readOnlyHint?: unknown;
    readonly destructiveHint?: unknown;
  };
  readonly description?: Partial<Record<CiktiDili, unknown>>;
  readonly inputSchema?: {
    readonly properties?: Readonly<Record<string, {
      readonly description?: Partial<Record<CiktiDili, unknown>>;
    }>>;
  };
}>>;

/**
 * Her araç ve her parametre tarifinde yayımlanan iki dil hanesi dolu mu?
 * Eksik yol listesi boş değilse çeviri kapsama nöbeti süiti kırmızıya çevirir.
 */
export function mcpMetinKapsamaEksikleri(
  katalog: McpMetinKatalogu = MCP_ARAC_METINLERI,
): readonly string[] {
  const eksikler: string[] = [];
  for (const ad of Object.values(MCP_ARAC_ADI)) {
    const arac = katalog[ad];
    if (!arac) {
      eksikler.push(`${ad}`);
      continue;
    }
    for (const dil of CIKTI_DILLERI) {
      if (!arac.description?.[dil]) eksikler.push(`${ad}.description.${dil}`);
    }
    for (const [parametreAdi, p] of Object.entries(arac.inputSchema?.properties ?? {})) {
      for (const dil of CIKTI_DILLERI) {
        const deger = p.description?.[dil];
        if (typeof deger !== "string" || !deger.trim()) {
          eksikler.push(`${ad}.inputSchema.properties.${parametreAdi}.description.${dil}`);
        }
      }
    }
  }
  return eksikler;
}

/**
 * Ek açıklama beyanı eksiksiz ve protokole uygun mu? Dönen liste boş değilse
 * mcp-ek-aciklama nöbeti süiti kırmızıya çevirir. Üç kusur aranır: görünen adın
 * bir dil hanesi boş kalması, okur/yazar beyanının hiç yazılmaması ve okur ilan
 * edilmiş bir araca yıkıcılık ipucu iliştirilmesi. Sonuncusu protokolün kendi
 * sınırıdır: `destructiveHint` yalnız `readOnlyHint == false` iken anlamlıdır.
 */
export function mcpEkAciklamaEksikleri(
  katalog: McpMetinKatalogu = MCP_ARAC_METINLERI,
): readonly string[] {
  const eksikler: string[] = [];
  for (const ad of Object.values(MCP_ARAC_ADI)) {
    const ek = katalog[ad]?.ekAciklama;
    if (!ek) {
      eksikler.push(`${ad}.ekAciklama`);
      continue;
    }
    for (const dil of CIKTI_DILLERI) {
      const baslik = ek.title?.[dil];
      if (typeof baslik !== "string" || !baslik.trim()) eksikler.push(`${ad}.ekAciklama.title.${dil}`);
    }
    if (typeof ek.readOnlyHint !== "boolean") {
      eksikler.push(`${ad}.ekAciklama.readOnlyHint`);
      continue;
    }
    if (ek.readOnlyHint === false && typeof ek.destructiveHint !== "boolean") {
      eksikler.push(`${ad}.ekAciklama.destructiveHint`);
    }
    if (ek.readOnlyHint === true && ek.destructiveHint !== undefined) {
      eksikler.push(`${ad}.ekAciklama.destructiveHint(okur-araca-yazilamaz)`);
    }
  }
  return eksikler;
}

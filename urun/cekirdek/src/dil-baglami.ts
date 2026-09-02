// ═══════════════════════════════════════════════════════════════════════════
// dil-baglami.ts — 🧠 AJAN DİL BAĞLAMI ÜRETİCİSİ (DPK-A03 · Founder 2026-07-17)
//
//   "Ajan tüm sar dilini bağlam olarak almalı ki başarıya ulaşabilelim."
//   Doğan projeye kurulan AGENTS.md'yi ÜRETİR: projeye giren herhangi bir AI
//   ajanı Sarmal'ın metaforunu, tam omurgasını, tip/kenar kanonunu, sarma
//   gramerini ve araç haritasını İLK TURDAN öğrenir.
//
//   TEK KAYNAK İLKESİ (elle kopya yasak): tip kanonu · kenar kanonu · sarma
//   grameri · ağaç metaforu kayit.json'dan, koni alanları koni.ts'ten DERLENİR;
//   kanon değişince dosya yeniden üretilir, ikinci bir gerçek doğmaz. Aradaki
//   öğretici düzyazı (eksenler · akış · niyet dili) bu üreticinin şablonudur.
//
//   SINIR (STR-3): yalnız AÇIK dil, kanon ve araç haritası anlatılır —
//   orkestrasyon ZEKÂSI (ŞEF politikası) bağlama SIZMAZ.
// ═══════════════════════════════════════════════════════════════════════════

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { KONI_ALANLARI } from "./koni.ts";
import {
  dilHanesi,
  etkinCiktiDili,
  sozlukAdi,
  sozlukDuzYazisi,
  type CiktiDili,
  type DuzYaziBolumu,
} from "./cevir.ts";
// EMJ-A03 (OGR-3.1 geriye-bağlantısı): emoji yazımı ajan bağlamına kanondan derlenir —
// tablolar kayit.json emojiYazimi ile nöbetli çekirdek eşidir, kopya taşınmaz.
import { EMOJI_TIPLER, EMOJI_PARAMETRELER, EMOJI_DURUMLAR } from "./emoji-yazim.ts";

// Bu üç yol modül yüklenirken değil, ilk gerçek okumada çözülür. Sebebi
// ölçülmüştür: eklenti esbuild ile CommonJS paketine çevrildiğinde `import.meta.url`
// boşalır ve URL kurucusu modül yüklenirken hata atar; paket hiç açılamadığı için
// eklentinin duman nöbeti düşer. Kardeş çözüm `cevir.ts` içinde aynı gerekçeyle
// yaşıyor ve burada o desen birebir izlenmiştir. Yol değerinin kendisi değişmedi,
// yalnız hesaplandığı an ertelendi.
const yolCoz = (gorece: string): string => fileURLToPath(new URL(gorece, import.meta.url));
const KAYIT_YOL = () => yolCoz("../../../oz/siniflama/kayit.json");
const TASARIM_KANON_YOL = () => yolCoz("../../../ogreti/bilgi/tasarim_sozlugu/kayit.json");
const HARITA_YOL = () => yolCoz("../../../ogreti/bilgi/tasarim_sozlugu/baglam-haritasi.json");

interface Kayit {
  surum: string;
  aileler: Record<string, string>;
  widgetTipleri: Array<{ ad: string; aile: string; ne: string }>;
  kenarTipleri: Array<{ ad: string; yon?: string; ne: string }>;
  izinliSarma: Record<string, string[]>;
  agacMetaforu: Record<string, string>;
  karneSkalasi?: { birim: string; dereceler: Record<string, string>; bilesenler: Record<string, string> };
  semalar?: Record<string, { kural?: string }>;
}

/** Doğan projenin AGENTS.md içeriğini kanondan derler (saf — diske dokunmaz). */
export function dilBaglami(tarih: string, dil: CiktiDili = etkinCiktiDili()): string {
  const k = JSON.parse(readFileSync(KAYIT_YOL(), "utf8")) as Kayit;
  const b: string[] = [];
  const y = (tr: string, en: string): string => dilHanesi({ tr, en }, dil);
  const ekle = (tr: readonly string[], en: readonly string[]): void => {
    b.push(...dilHanesi({ tr, en }, dil));
  };
  const sozlukMetni = (bolum: DuzYaziBolumu, anahtar: string, turkce: string): string =>
    sozlukDuzYazisi(bolum, anahtar, turkce, dil);
  const kaynakAdi = (bolum: "widget" | "kenar" | "parametre", ad: string): string => {
    const cevrilmis = sozlukAdi(bolum, ad, dil);
    return dil === "tr" || cevrilmis === ad ? ad : `${cevrilmis} (\`${ad}\`)`;
  };
  const yonOkumaYuzu = (yon: string): string => dil === "tr"
    ? yon
    : yon.replace(/[A-Za-zÇĞİÖŞÜçğıöşü]+/gu, (ad) => sozlukAdi("widget", ad, dil));

  ekle([
    "# Sarmal Dil Bağlamı — bu projede çalışan her AI ajanı için",
    "",
    `> ⚙️ ÜRETİLEN DOSYA — elle DÜZENLENMEZ. Üretici: \`sarmal doğuş\` (dil-baglami.ts) · ` +
    `tip kanonu ${k.surum} · üretim: ${tarih}. Kanon değişince yeniden üretilir; ` +
    `düzeltme gerekiyorsa kaynağı (oz/siniflama/kayit.json ya da üretici şablonu) düzelt.`,
    "",
    "Bu proje **Sarmal** ile yönetilir: klasör/dosya hiyerarşisi ve kuralları, iç içe",
    "geçen bildirimsel `.sar` dosyalarında bir ağaç olarak tanımlanır. Sarmal kod üretmez,",
    "**niyet** üretir — kodu senin gibi bir AI ajanı yazar; motor (denetçi) plan ile disk",
    "arasındaki sapmayı (drift) yakalar ve Türkçe tanılarla yol gösterir. Bu dosya dilin",
    "HARİTASIDIR, kesin cevabın kendisi değildir: canlı hüküm her zaman araçtadır —",
    "yazmadan önce MCP `basla` rehberine, bir Adımı işlemeye başlamadan önce `sef`",
    "aracına danış, yazdıktan sonra `denetle` ile doğrula; hedef her zaman sıfır hatadır.",
    "",
  ], [
    "# Sarmal Language Context — for every AI agent working in this project",
    "",
    `> ⚙️ GENERATED FILE — DO NOT EDIT by hand. Producer: \`sarmal doğuş\` (dil-baglami.ts) · ` +
    `type canon ${k.surum} · generated: ${tarih}. Regenerate it when canon changes; ` +
    `if a correction is needed, fix the source (oz/siniflama/kayit.json or the producer template).`,
    "",
    "This project is managed with **Sarmal**: folder/file hierarchy and rules are declared as",
    "a nested tree in declarative `.sar` files. Sarmal does not produce code;",
    "it produces **intent** — an AI agent like you writes the code, while the engine (checker)",
    "detects drift between plan and disk and guides you with diagnostics. This file is the",
    "MAP of the language, not the final answer: the live ruling is always in the tools — consult",
    "the MCP `basla` guide before writing, call `sef` before working on a Step, and verify with",
    "`denetle` after writing; the target is always zero errors.",
    "",
  ]);

  b.push(y("## Çekirdek metafor — ağaç", "## Core metaphor — the tree"), "");
  for (const [organ, anlam] of Object.entries(k.agacMetaforu)) {
    b.push(`- **${sozlukMetni("agacOrgani", organ, organ)}**: ${sozlukMetni("agacMetaforuNe", organ, anlam)}`);
  }
  ekle(["",
    "İki yüz aynı gerçeği anlatır: teknik yüzde *her şey bir widget*, anlatım yüzünde",
    "*kök→gövde→dal→yaprak→meyve* ağacı. Sağlam kök (kurallar) düzenli dal (drift yok)",
    "ve bol meyve (ürün) getirir.",
    "",
  ], ["",
    "Two faces describe the same truth: on the technical face, *everything is a widget*; on the",
    "narrative face, it is a *root→trunk→branch→leaf→fruit* tree. Strong roots (rules) yield",
    "orderly branches (no drift) and abundant fruit (product).",
    "",
  ]);

  ekle([
    "## Plan eksenleri, departman ve tam zincir",
    "",
    "Katı rejimde zincir eksiksiz olmalıdır — **Faz › Blok › Katman › AltKatman › Adım**:",
    "",
    "- **Faz = ZAMAN** — büyüme dönemi (yıl halkası). Klasör açmaz; kardeş fazlar sıralıdır.",
    "- **Blok = İŞ** — dikey dilim (önyüz+arkayüz+güvenlik birlikte, silo değil). Fazlar boyunca AYNI Blok büyür.",
    "- **Katman = TEKNOLOJİ** — `bağımlı:` içinde bir Takım/Teknoloji bağı bekler.",
    "- **AltKatman = DEPARTMAN** — işi ilanlı departman modülünde toplar; katkılı örtüyle genişler.",
    "- **Adım = AKIŞ** — işin yaprağı; bir Adım bir ajan oturumudur (kırıntı Adım anti-desendir).",
    "",
    "Her Blok bir Faz altında, her Adım bir AltKatman altında yaşar; motor kırık zinciri tanıyla söyler.",
    "",
    "### Zaman bağı — nazik rejim",
    "",
    "Tarih GÜÇLÜ TAVSİYEDİR, dayatma değil: Faz'a hedefTarih verirsen (\"YYYY-AA-GG\";",
    "gün bilinmiyorsa \"YYYY-AA\" da geçerlidir — motor nazikçe gün sorar) vade nöbeti",
    "rötarı ve yaklaşan durağı senin yerine takip eder; vermezsen Faz YİNE açılır, motor",
    "bilgi düzeyinde hatırlatır, hiçbir iş akışı kesilmez. Yetişmeyen tarih ertelenebilir",
    "(tarihi güncelle — taahhüt tarihçesi git'te kalır). Bir Blok'u zamana bağlamanın üç",
    "eşdeğer yolu vardır ve bir bağ TEK yerde yazılır: ① Faz gövdesine fiziksel iç",
    "içe yazım (hiyerarşi görünürlüğü değerlidir), ② mevsim Faz'ının `çağır BLK-…` listesi,",
    "③ Blok'un kendi dosyasındaki `mevsim: FAZ-…` alanı (yükleme çevrimi ikisini aynı",
    "kenara normalize eder; ikisi birden yazılırsa `çift-mevsim-kaydı` uyarısı). Tarih",
    "taahhüdü verilmemiş, önceliklendirme bekleyen iş için dürüst beyan: `planlanmamış:",
    "\"neden metni\"` (neden zorunlu, boş yazılamaz) — motor fazsız-blok hatası yerine 🧊",
    "`planlanmamış-gövde` bilgi satırı basar; altında `geliştirmede` Adım başlarsa",
    "`planlanmamış-çelişki` uyarısı doğar.",
    "",
  ], [
    "## Plan axes, discipline, and the complete chain",
    "",
    "In strict mode the chain must be complete — **Phase › Block › Layer › Sublayer › Step**",
    "(canonical source: **Faz › Blok › Katman › AltKatman › Adım**):",
    "",
    "- **Phase = TIME** — a growth period (year-ring). It opens no folder; sibling phases are ordered.",
    "- **Block = WORK** — a vertical slice (frontend+backend+security together, not silos). The SAME Block grows across phases.",
    "- **Layer = TECHNOLOGY** — expects a TechStack/Technology binding inside the canonical `bağımlı:` field.",
    "- **Sublayer = DISCIPLINE** — groups work in a declared discipline module and can grow through an additive overlay.",
    "- **Step = FLOW** — the leaf of work; one Step is one agent session (a crumb-sized Step is an anti-pattern).",
    "",
    "Every Block lives under a Phase and every Step under a Sublayer; the engine reports a broken chain with a diagnostic.",
    "",
    "### Time binding — gentle regime",
    "",
    "A date is STRONGLY RECOMMENDED, not imposed: if you give a Phase `hedefTarih` (\"YYYY-AA-GG\";",
    "when the day is unknown, \"YYYY-AA\" is also valid and the engine gently asks for a day), the deadline",
    "guard tracks overdue and approaching milestones for you. Without a date the Phase STILL opens; the engine",
    "reminds at information level and blocks no workflow. A date that cannot be met may be postponed",
    "(update the date — commitment history remains in git). There are three equivalent ways to bind a Block",
    "to time, and one binding is written in ONE place: ① physically nest it in the Phase body (hierarchy",
    "visibility is valuable), ② list it with `çağır BLK-…` on the season Phase, or ③ use the `mevsim: FAZ-…`",
    "field in the Block's own file (the load cycle normalizes both into the same edge; writing both raises the",
    "`çift-mevsim-kaydı` warning). For work with no date commitment that awaits prioritization, make the honest",
    "declaration `planlanmamış: \"neden metni\"` (the reason is mandatory and cannot be empty). Instead of the",
    "phase-less-block error, the engine prints the 🧊 `planlanmamış-gövde` information row; if a",
    "`geliştirmede` Step starts underneath it, the `planlanmamış-çelişki` warning appears.",
    "",
  ]);

  const koniAlanlari = KONI_ALANLARI.map((ad) => {
    const kenar = sozlukAdi("kenar", ad, dil);
    return kaynakAdi(kenar === ad ? "parametre" : "kenar", ad);
  });
  ekle([
    "## Adım'ın bağlam konisi",
    "",
    `Adım zengin düğümdür; koni alanları: **${koniAlanlari.join(" · ")}** (+ \`üretir\` meyve kenarı).`,
    "Boş-ama-geçerli kabuk yasaktır (kör drift): `geliştirmede` bir Adım koni-dolu olmalıdır —",
    "`bağımlı:` zorunlu, `görev`/`kabul` dolu, kapanışta `üretir:` meyvesi yazılır.",
    "",
    "### Adım yaşam döngüsü",
    "",
    "`beklemede → geliştirmede → tamamlandı` — atlama YASAK. Başlarken `durum: geliştirmede`",
    "işaretle (hafif *başladı* commit'i); kapatırken kanıtı `koşu:` alanına, ürünü `üretir:`",
    "kenarına yaz. `bloklu → tamamlandı` yazımı motor tarafından REDDEDİLİR. Beşinci değer",
    "`doğrulanmamış`: orkestratör koşusu işi teslim etti ama",
    "bağımsız kanıt (koşum sicili) yok — `doğrulanmamış → tamamlandı` elle YAZILAMAZ; kanıtlı",
    "terfi yalnız sicil-kanıtlı VERIFIED koşusundan gelir.",
    "",
    "### Niyet dili",
    "",
    "Niyet alanları kod değil İNSAN DİLİDİR: tam cümleler, Türkçe dilbilgisine eksiksiz uyum,",
    "akademik-saygılı ton. Alan ayrımı: `ne`=amaç+problem · `görev`=işlemler · `kabul`=sınanabilir",
    "koşullar · `sınır`=kapsam dışı+değişmezler · `koşu`=tarih/onay/test kayıtları. Bilgi silinmez,",
    "doğru alana ayrılır; \"çalışıyor\" tek başına kabul ölçütü olamaz.",
    "",
  ], [
    "## The Step's context cone",
    "",
    `A Step is a rich node; its cone fields are: **${koniAlanlari.join(" · ")}** (+ the canonical \`üretir\` fruit edge).`,
    "An empty-but-valid shell is forbidden (blind drift): a `geliştirmede` Step must have a full cone —",
    "canonical `bağımlı:` is mandatory, `görev`/`kabul` are filled, and an `üretir:` fruit is written at closure.",
    "",
    "### Step lifecycle",
    "",
    "`beklemede → geliştirmede → tamamlandı` — skipping is FORBIDDEN. At the start, mark",
    "`durum: geliştirmede` (a light *started* commit); at closure, write evidence to `koşu:` and the",
    "product to the `üretir:` edge. The engine REJECTS `bloklu → tamamlandı`. The fifth value is",
    "`doğrulanmamış`: the orchestrator run delivered the work but independent evidence (run registry)",
    "is absent — `doğrulanmamış → tamamlandı` CANNOT be written by hand; evidence-backed promotion",
    "comes only from a registry-backed VERIFIED run.",
    "",
    "### Intent language",
    "",
    "Intent fields are HUMAN LANGUAGE, not code: complete sentences with complete grammar and an",
    "academic, respectful tone. Field boundaries: `ne`=purpose+problem · `görev`=operations ·",
    "`kabul`=testable conditions · `sınır`=out-of-scope+invariants · `koşu`=date/approval/test records.",
    "Information is not deleted; it is separated into the correct field. \"It works\" alone cannot be an",
    "acceptance criterion.",
    "",
  ]);

  b.push(
    y("## Sözdizim örneği — koni-dolu Adım", "## Syntax example — a Step with a full cone"),
    "",
    "```sar",
    "Faz( kod: FAZ-MVP, ad: \"mvp\", hedefTarih: \"2026-09-30\",   // tarih güçlü tavsiyedir — verirsen vade nöbeti çalışır (\"YYYY-AA\" ay hassasiyeti de geçerli); vermezsen Faz yine açılır, motor yalnız hatırlatır",
    "  ne: \"🌀 İlk büyüme dönemi\" ) {",
    "  // ⚠️ Belge bloğu KENDİNDEN SONRAKİ düğüme bağlanır — aşağıdaki belge Blok'undur, Faz'ın DEĞİL.",
    "  //    Her Blok kendi belge bloğunu taşır; ikinci bir Blok açarsan ona da yazmalısın.",
    "  -->|",
    "    ## Amaç",
    "    🎯 Giriş dikey dilimini uçtan uca kurmak — kullanıcı güvenle oturum açar.",
    "    ## Kapsam",
    "    📦 Kapsar: giriş ekranı ve oturum ucu. Kapsamaz: parola sıfırlama.",
    "    ## Sonuç",
    "    ✅ Kabul: geçerli kimlikle giriş çalışır, geçersiz kimlik açık hata alır.",
    "  |<--",
    "  Blok( kod: BLK-GIRIS, ad: \"giris\", ne: \"🪵 Giriş dikey dilimi\" ) {",
    "    Katman( kod: KAT-ONYUZ, ad: \"onyuz\", kullanır: TAKIM-ONYUZ,",
    "      ne: \"🌿 Önyüz teknolojisi\" ) {",
    "      // Katman → AltKatman → Adım: Adımlar departman modüllerinde toplanır.",
    "      AltKatman( kod: ALT-ONYUZ-KOD, ad: \"kodlama\", departman: kodlama,",
    "        ne: \"☘️ Önyüz kodlama modülü\" ) {",
    // Örnek kod adı bölünmüş — GEREKÇE 2026-09-01'de DEĞİŞTİ. Eski gerekçe atıf
    // bekçisiydi ve o gerekçe düştü: bekçi artık kod çiti içini öğretim örneği
    // sayıyor (kimlik.ts · ornekCitleriniBosalt), dolayısıyla doğan proje sahte
    // uyarı almıyor. Bölme yine de duruyor, çünkü İKİNCİ bir nöbet onu istiyor:
    // tanı-metni hijyeni, bu üreticinin kullanıcıya giden dizelerinde çıplak Adım
    // kodu deseni görmek istemez ve o nöbetin muafiyeti yalnız YORUMLARI kapsar,
    // dizeleri değil. İki nöbet iki ayrı şey ölçüyor; hile ikincisinin kapısıdır.
    "        Adım( kod: ADM-GIR" + "IS-01, durum: beklemede, bağımlı: [],",
    "          ne: \"🍃 Giriş ekranını kurmak — kullanıcı e-posta+parola ile oturum açar\" ) {",
    "          görev: \"Giriş ekranı bileşenini yaz; form doğrulamasını ekle; oturum ucuna bağla\"",
    "          kabul: [ \"boş form gönderilemiyor (testli)\", \"başarılı girişte ana ekrana geçiliyor\" ]",
    "          sınır: \"parola sıfırlama bu Adımın dışında — ayrı Adım açılır\"",
    "        }",
    "      }",
    "    }",
    "  }",
    "}",
    "```",
    "");
  ekle([
    "AltKatman'ın `departman:` alanı KAPALI bir kümedir. İşin bu kümeye girmiyorsa yakın bir",
    "değeri seçme: motor yanlış etiketi yakalayamaz, kapı yeşil kalır ve planın sessizce yalan",
    "söyler. Doğrusu katkılı örtüdür — ÇalışmaAlanı kökünde `oz/siniflama/ortu.json` yazıp",
    "kümeye kendi değerini eklersin; ayrıntıyı `ogret` kartı anlatır.",
    "",
    "Kimlik `kod:` parametresindedir ve tekildir; başka düğümler bu koda kenarlarla bağlanır.",
    "Anlatı belgesi yukarıdaki gibi ÇOK SATIRLI yazılır — `## Amaç`, `## Kapsam` ve `## Sonuç`",
    "başlıklarının her biri kendi satırında, altında gerçek cümlelerle. Belge, ait olduğu",
    "düğümden HEMEN önce durur; Blok ve Proje için anlatı belgesi zorunludur.",
    "",
  ], [
    "The Sublayer's canonical `departman:` field is a CLOSED set. If the work does not fit this set,",
    "do not choose a nearby value: the engine cannot detect the false label, the gate stays green,",
    "and the plan silently becomes false. The correct solution is an additive overlay: write",
    "`oz/siniflama/ortu.json` at the Workspace root and add your value to the set; the `ogret` card",
    "explains the details.",
    "",
    "Identity lives in the canonical `kod:` parameter and is unique; other nodes bind to that code",
    "through edges. Write the narrative document as MULTILINE text exactly as above — each of",
    "`## Amaç`, `## Kapsam`, and `## Sonuç` stands on its own line with real sentences underneath.",
    "The document stands IMMEDIATELY before the node it belongs to; Block and Project require one.",
    "",
  ]);

  b.push(y(
    `## Tip kanonu — ${k.widgetTipleri.length} widget tipi (aile aile)`,
    `## Type canon — ${k.widgetTipleri.length} widget types (grouped by family)`,
  ), "");
  const ailePlani = new Map<string, Array<{ ad: string; ne: string }>>();
  for (const t of k.widgetTipleri) {
    if (!ailePlani.has(t.aile)) ailePlani.set(t.aile, []);
    ailePlani.get(t.aile)!.push({ ad: t.ad, ne: t.ne });
  }
  for (const [aile, tipler] of ailePlani) {
    const aileOkumaAdi = sozlukMetni("aileAdi", aile, aile);
    const aileBasligi = dil === "tr" || aileOkumaAdi === aile
      ? aileOkumaAdi
      : `${aileOkumaAdi} (\`${aile}\`)`;
    const aileAciklamasi = sozlukMetni("aileNe", aile, k.aileler[aile] ?? "");
    b.push(`### ${aileBasligi} — ${aileAciklamasi}`, "");
    for (const t of tipler) {
      b.push(`- **${kaynakAdi("widget", t.ad)}** — ${sozlukMetni("widgetNe", t.ad, t.ne)}`);
    }
    // OGR-3.1 geriye-bağlantısı (GBR-A11 · MIM-1.4 ③): ayakizi konvansiyonu kanondaki
    // şema kuralından okunur (tek kaynak) — teknoloji ailesinin dip notu.
    if (aile === "teknoloji" && k.semalar?.["Teknoloji"]?.kural) {
      b.push("", y(
        `> **\`ayakizi:\` konvansiyonu** — ${k.semalar["Teknoloji"].kural}`,
        `> **Canonical \`ayakizi:\` convention** — ${sozlukMetni("semaKural", "Teknoloji", k.semalar["Teknoloji"].kural)}`,
      ));
    }
    b.push("");
  }

  b.push(y(
    `## Kenar kanonu — ${k.kenarTipleri.length} kenar tipi`,
    `## Edge canon — ${k.kenarTipleri.length} edge types`,
  ), "");
  for (const kn of k.kenarTipleri) {
    b.push(`- **${kaynakAdi("kenar", kn.ad)}**${kn.yon ? ` (${yonOkumaYuzu(kn.yon)})` : ""} — ${sozlukMetni("kenarNe", kn.ad, kn.ne)}`);
  }
  ekle(["",
    "Kenarlar Adım'da beyan edilir; kapsayıcılar (Faz/Blok/Katman) kenar taşımaz — tek istisna",
    "Katman'ın Takım/Teknoloji eksen bağıdır. İlansız koda atıf KIRIK REFERANSTIR.",
    "",
  ], ["",
    "Edges are declared on a Step; containers (Phase/Block/Layer) carry no edges — the only",
    "exception is the Layer's TechStack/Technology axis binding. A reference to an undeclared code",
    "is a BROKEN REFERENCE.",
    "",
  ]);

  b.push(y(
    "## Sarma grameri — hangi tip hangi tipi sarabilir",
    "## Wrapping grammar — which type may wrap which",
  ), "");
  for (const [ebeveyn, cocuklar] of Object.entries(k.izinliSarma)) {
    b.push(`- **${kaynakAdi("widget", ebeveyn)}** → ${cocuklar.map((ad) => kaynakAdi("widget", ad)).join(" · ")}`);
  }
  b.push("");

  // OGR-3.1 geriye-bağlantısı (EMJ-A03): emoji yazımı — ikinci yüz kanondan derlenir.
  const esle = (tablo: Record<string, string>): string =>
    Object.entries(tablo).map(([emoji, ad]) => `${emoji}=\`${ad}\``).join(" · ");
  ekle([
    "## Emoji yazımı — dilden bağımsız ikinci yüz",
    "",
    "Anahtar kelimelerin Founder-onaylı emoji takma-adları vardır: emoji yazımı ile Türkçe",
    "yazım **aynı grafı üretir**, karışık yazım serbesttir (kanon: `oz/siniflama/kayit.json`",
    "`emojiYazimi`). Emoji yüzüyle yazılmış bir dosyayla karşılaşırsan şaşırma — şu tablolarla oku:",
    "",
    `- **Kademeler**: ${esle(EMOJI_TIPLER)}`,
    `- **Parametreler**: ${esle(EMOJI_PARAMETRELER)}`,
    `- **Durum değerleri**: ${esle(EMOJI_DURUMLAR)}`,
    "",
    "Dizgi, yorum ve belge bloğundaki emoji İÇERİKTİR — kanon anlamı taşımaz. Kanon dışı",
    "çıplak emoji söz dizimi hatasıdır. Türkçe yazım birinci sınıf kalır; bir dosyayı",
    "düzenlerken dosyanın SEÇTİĞİ yazım yüzünü koru (emoji yazan emoji kalır, Türkçe yazan Türkçe).",
    "",
  ], [
    "## Emoji notation — the language-independent second face",
    "",
    "Keywords have Founder-approved emoji aliases: emoji notation and canonical Turkish notation",
    "**produce the same graph**, and mixed notation is allowed (canon: `oz/siniflama/kayit.json`,",
    "`emojiYazimi`). Do not be surprised by a file written through the emoji face — read it with these tables:",
    "",
    `- **Tiers**: ${esle(EMOJI_TIPLER)}`,
    `- **Parameters**: ${esle(EMOJI_PARAMETRELER)}`,
    `- **Status values**: ${esle(EMOJI_DURUMLAR)}`,
    "",
    "Emoji inside strings, comments, and document blocks is CONTENT and carries no canonical meaning.",
    "A bare emoji outside canon is a syntax error. Turkish notation remains first-class; when editing",
    "a file, preserve the notation face CHOSEN by that file (emoji stays emoji, Turkish stays Turkish).",
    "",
  ]);

  // OGR-3.1 geriye-bağlantısı (EMJ-A05): karne skalası kanondan derlenir — ajan uydurma puan basamaz.
  if (k.karneSkalasi) {
    const ks = k.karneSkalasi;
    ekle([
      "## Etmen karne skalası (Founder onaylı)",
      "",
      `Etmen başarımı dilden bağımsız ${ks.birim} derecesiyle okunur (${ks.birim} dilin`,
      "yüzeylerinde YALNIZ derece birimidir):",
      "",
      ...Object.entries(ks.dereceler).map(([d, anlam]) =>
        `- ${ks.birim.repeat(Number(d))} — ${sozlukMetni("karneDerece", d, anlam)}`),
      "",
      `Derece şu sicil bileşenlerinden türer: ${Object.keys(ks.bilesenler).map((a) => `\`${a}\``).join(" · ")}.`,
      "Ağırlık ve çevrim formülü bu bağlamda YAŞAMAZ; örtü tarafının gizli politikasıdır. DÜRÜSTLÜK: sicil verisi",
      "boşsa derece BASILMAZ — 'henüz sicil yok' denir; hiçbir yüzeyde puan uydurulmaz (`karne` aracı).",
      "",
    ], [
      "## Agent scorecard scale (Founder-approved)",
      "",
      `Agent performance is read through the language-independent ${ks.birim} grade (${ks.birim} is used ONLY`,
      "as a grade unit on language surfaces):",
      "",
      ...Object.entries(ks.dereceler).map(([d, anlam]) =>
        `- ${ks.birim.repeat(Number(d))} — ${sozlukMetni("karneDerece", d, anlam)}`),
      "",
      `The grade is derived from these registry components: ${Object.entries(ks.bilesenler).map(([ad, anlam]) =>
        `\`${ad}\` (${sozlukMetni("karneBilesen", ad, anlam)})`).join(" · ")}.`,
      "Weights and the conversion formula DO NOT LIVE in this context; they are hidden overlay policy.",
      "HONESTY: when registry data is empty, no grade is printed — say 'no registry yet'; no surface",
      "invents a score (the `karne` tool).",
      "",
    ]);
  }

  // OGR-3.1 geriye-bağlantısı (KVR-A07): kavram kanonu ve bağlam haritası KANONDAN
  // derlenir — bölüm adları/sayıları ve aile adları diskten okunur, kopya taşınmaz.
  const tasarim = JSON.parse(readFileSync(TASARIM_KANON_YOL(), "utf8")) as Record<string, unknown>;
  const harita = JSON.parse(readFileSync(HARITA_YOL(), "utf8")) as {
    aileler: Record<string, { soru: string }>;
  };
  const kavramSay = (dugum: unknown): number => {
    if (!dugum || typeof dugum !== "object") return 0;
    const degerler = Object.values(dugum as Record<string, unknown>);
    if (degerler.every((v) => typeof v === "string")) return 1; // yaprak kavram (stack eşlemesi)
    return degerler.reduce<number>((toplam, v) => toplam + kavramSay(v), 0);
  };
  const bolumOzeti = Object.entries(tasarim)
    .filter(([ad]) => ad !== "_meta")
    .map(([ad, govde]) => `\`${ad}\` (${kavramSay(govde)})`)
    .join(" · ");
  ekle([
    "## Kavram sözlüğü ve bağlam haritası",
    "",
    "Tasarım/yazılım kavramlarının makine kanonu **TEKTİR**: `bilgi/tasarim_sozlugu/kayit.json`.",
    "Bir kavramın kimliği kanondaki **yoludur** (örnek: `onyuz.bilesen.menü`) — kavram adı uydurma,",
    `önce kanona bak. Bölümler ve kavram sayıları: ${bolumOzeti}.`,
    "Her kavram Türkçe nötr ad taşır ve yanında birden çok yığın için karşılık sunar. Bu eşleme",
    "yalnız bir KARŞILIK TABLOSUDUR ve projenin teknolojisini BELİRLEMEZ: teknoloji, anadizinde",
    "`Teknoloji` düğümüyle ilan edilendir. Sözlükte bir yığının adını görmen o yığının seçildiği",
    "anlamına gelmez — teknoloji kararı insanındır ve ilan edilmeden hiçbir yığın varsayılmaz.",
    "",
    "Kullanıcının niyeti belirsizse (\"üstte bir menü olsun\" gibi) `bilgi/tasarim_sozlugu/baglam-haritasi.json`",
    "rehberindir: bağlam (düğüm tipi ya da `tip.alan`, en özel anahtar kazanır) → aday kavram aileleri" +
    ` (bugün: ${Object.keys(harita.aileler).map((a) => `**${a}**`).join(" · ")}).`,
    "Harita **ÖNERİR, zorlamaz** — tanı ya da kural üretmez. Ailenin sorusunu kullanıcıya Türkçe",
    "seçeneklerle sor, seçilen kavramı koniye **kanonik yoluyla** yaz, terimi bir kez öğret — dayatma.",
    "",
  ], [
    "## Concept dictionary and context map",
    "",
    "There is exactly **ONE** machine canon for design/software concepts:",
    "`bilgi/tasarim_sozlugu/kayit.json`. A concept's identity is its **path** in canon (for example,",
    `\`onyuz.bilesen.menü\`) — do not invent a concept name; consult canon first. Sections and concept counts: ${bolumOzeti}.`,
    "Each concept carries a neutral Turkish name plus counterparts for several stacks. That mapping is",
    "a LOOKUP TABLE only and does NOT set the project's technology: the technology is whatever the",
    "anadizin declares with a `Teknoloji` node. Seeing a stack name in the dictionary does not mean",
    "that stack was chosen — the technology decision is the human's, and none is assumed until declared.",
    "",
    "When the user's intent is ambiguous (such as \"put a menu at the top\"), use",
    "`bilgi/tasarim_sozlugu/baglam-haritasi.json` as your guide: context (node type or `tip.alan`; the most",
    "specific key wins) → candidate concept families" +
    ` (today: ${Object.keys(harita.aileler).map((a) => `**${a}**`).join(" · ")}).`,
    "The map **SUGGESTS; it does not impose** — it produces no diagnostic or rule. Ask the family's",
    "question using Turkish options, write the selected concept into the cone by its **canonical path**;",
    "and teach the term once — never force it.",
    "",
  ]);

  ekle([
    "## Araç haritası — MCP `sarmal` sunucusu",
    "",
    "| Araç | Ne zaman |",
    "|---|---|",
    "| `basla` | YAZMADAN ÖNCE — doğuş rehberi + mimari diyalog + koni-dolu şablonlar |",
    "| `sef` | Bir Adımı İŞLEMEYE BAŞLAMADAN ÖNCE — koni, kritik kısıtlar ve ateşleyen beceri kartları hazır prompt olarak |",
    "| `kavram` | Kavram sorgusu — kelime → kanon yolu+eşlemeler; bağlam → aday aileler (öneri, dayatma değil) |",
    "| `karne` | Etmen karne raporu — ⭐ skalası + kadro dökümü (boş sicilde derece basılmaz, puan uydurulmaz) |",
    "| `dogus` | Boş dizinde çalışır proje doğurmak (bu paketin kendisi) |",
    "| `denetle` | Tek dosyayı doğrulamak (yazınca hemen) |",
    "| `denetle-proje` | BÜTÜN projenin tam hükmü — \"her şey yeşil mi?\" sorusunun tek cevabı |",
    "| `kurallar` | Yürürlükteki kuralları dökmek |",
    "| `siniflama` | Tip kanonunu sorgulamak (uydurma tip yazma — önce sor) |",
    "| `gezin` | Bir KOD'un tanımı + atıfları (dosya taramak yerine BUNU kullan) |",
    "| `graf` / `etki` | Bağımlılık grafiği / bir düğümün etki alanı |",
    "| `bul` / `bicimle` | Metin arama / biçimlendirme |",
    "| `iskelet` | İlan edilen yapıyı diske scaffold'lamak |",
    "| `durum-guncelle` | Adım durumunu güvenli yazmak (durum makinesi korumalı) |",
    "",
    "Bir Adımı işlemeye başlamadan önce `sef` çağrılır; koni, kısıtlar ve o Adımda ateşleyen",
    "beceri kartları oradan gelir. Kartlar `ogrenme/` rafında yaşar; bütçe payına sığmayıp",
    "✂️ damgasıyla kırpılan bir kartın tam metnini `gezin <KART-KODU>` ile açarsın.",
    "",
    "## Çalışma düzeni",
    "",
    "1. **Önce karar → plan → adım**: büyük işte önce plan yazılır ve onaylatılır; plan `.sar`dır.",
    "2. **Denetle-temiz çalış**: her anlamlı değişiklikten sonra `denetle` — hedef sıfır hata.",
    "3. **Üretilen dosyalar elle düzenlenmez** (bu dosya dahil) — kaynağı düzelt, yeniden üret.",
    "4. **Emin olmadığın kuralı uydurma**: `kurallar` ve `siniflama` araçlarına sor; yoksa insana danış.",
    "",
  ], [
    "## Tool map — MCP `sarmal` server",
    "",
    "| Tool | When to use it |",
    "|---|---|",
    "| `basla` | BEFORE WRITING — birth guide + architecture dialogue + full-cone templates |",
    "| `sef` | BEFORE WORKING ON A STEP — cone, critical constraints, and triggered skill cards as a ready prompt |",
    "| `kavram` | Concept query — word → canon path+mappings; context → candidate families (suggestion, not imposition) |",
    "| `karne` | Agent scorecard — ⭐ scale + roster breakdown (no grade for an empty registry; no invented score) |",
    "| `dogus` | Create a working project in an empty directory (this package itself) |",
    "| `denetle` | Validate one file (immediately after writing) |",
    "| `denetle-proje` | Complete ruling for the WHOLE project — the only answer to \"is everything green?\" |",
    "| `kurallar` | List the rules in force |",
    "| `siniflama` | Query the type canon (do not invent a type — ask first) |",
    "| `gezin` | Definition + references for a CODE (use THIS instead of scanning files) |",
    "| `graf` / `etki` | Dependency graph / a node's impact area |",
    "| `bul` / `bicimle` | Text search / formatting |",
    "| `iskelet` | Scaffold the declared structure on disk |",
    "| `durum-guncelle` | Update Step status safely (state-machine guarded) |",
    "",
    "Call `sef` before working on a Step; its cone, constraints, and the skill cards triggered for that",
    "Step come from there. Cards live on the `ogrenme/` shelf; if a card is trimmed with a ✂️ mark",
    "because it does not fit its budget share, open the full text with `gezin <KART-KODU>`.",
    "",
    "## Working routine",
    "",
    "1. **Decision → plan → step first**: for substantial work, write and approve the plan first; the plan is `.sar`.",
    "2. **Work check-clean**: run `denetle` after every meaningful change — target zero errors.",
    "3. **Generated files are not edited by hand** (including this one) — fix the source and regenerate.",
    "4. **Do not invent a rule you are unsure about**: ask `kurallar` and `siniflama`; if absent, ask a human.",
    "",
  ]);

  return b.join("\n");
}

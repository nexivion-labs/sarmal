// ═══════════════════════════════════════════════════════════════════════════
// dongu.ts — ŞEF çekirdek döngüsü (RAY-3 · Aşama 3)
//
//   Bu döngü, ŞEF runtime çalışmasının üçüncü aşama kalemlerinden doğmuştur. O
//   kalemlerin
//   plan kaydı bugün repo İÇİNDE, `arsiv/omurga-v0-plan-kapali/orkestrasyon/sef_plani.sar`
//   gövdesinde yaşar. Arşiv gövdesi CANLI bir `.sar` ilanı olmadığı için taşıdığı
//   Adım kodu motorun çözebileceği bir tanım vermez; bu yüzden köken burada kodla
//   değil anlatıyla anılır.
//
//   üret → denetle → yama → yeniden-doğrula → karar. Üretici ve DENETÇİ AYRI
//   izole çağrılardır (ORK-6.1: yazan kendini yargılayamaz); denetçi YALNIZ üreticinin
//   ÇIKTISINI görür, bağlamını/belleğini değil. Yama-döngüsü GAP→NOT-RESOLVED→RESOLVED
//   (ORK-6.1: 0 bulguda bile denetim ateşler). Denetçi VARLIK≠DOĞRULUK: her kabul
//   davranışsal kanıt (file:line) ister; kanıtsız "geçti" reddedilir (YAS-4.1 sahte-yeşil).
//   Çok-değerli kabul kabulGate ile; VERIFIED mührünü YALNIZ denetçi + SİCİL kanıtı
//   koyar (YAS-4.2 · kanıt-ekseni turu: mühür modelin YAZAMADIĞI alandan alınır — koşum sicili
//   `araçTurları`, testSonucu BEYANI değil; beyan-beyan uzlaşması en çok COMPLETED).
//
//   STR-3.2/STR-3: gerçek LLM YOK. ŞEF↔Etmen sınırı ENJEKTE edilen `EtmenÇağır` arayüzü
//   arkasında (testte mock · CLI'de demo-stub · üründe GİZLİ politika). Döngü SAF —
//   dosya YAZMAZ; yan etki yalnız enjekte edilen Etmen'de. Yaprak modül (sef+sozlesme tüketir).
//   kanıt-ekseni turu MİMARİ KİLİT: bu dosyaya `node:fs` GİRMEZ — döngü diske bakmaz, KÖPRÜ
//   SİCİLİ diske bakar, döngü SİCİLİ okur; kabuk I/O'su (kontrol noktası) enjekte edilir.
// ═══════════════════════════════════════════════════════════════════════════

import type { BaglamPaket, DurakÖzet, KancaÖzet, KancaEvre } from "./sef.ts";
import { promptUret, baglamMontajla, atananEtmenler, sozlesmeBul, programHaritasi } from "./sef.ts";
import type { Program } from "./sozdizim.ts";
import type { AlanSema, Ihlal } from "./sozlesme.ts";
import { sozlesmeSema, sozlesmeDenetle, kabulGate } from "./sozlesme.ts";
import type { RolProfil } from "./rbac.ts";
import { rbacÇağrıDenetle, VARSAYILAN_ROL_PROFIL } from "./rbac.ts";
// Müzakere, kurtarma ve çok-Etmen mekanikleri buradan bağlanır; muzakere.ts bize
// yalnız TİP-importuyla bağlı olduğu için çevrim doğmaz ve politika STR-3 uyarınca
// GİZLİ olarak dışarıdan enjekte edilir.
import type { Hakem, SavunmaÇağır, MuzakereSonuç, KurtarmaKarar, KurtarmaStratejisi } from "./muzakere.ts";
import { muzakereEt, kurtar, cokEtmenÜret } from "./muzakere.ts";
import { dagKur } from "./dag.ts";
import { paralelYurut, paralelKumeler } from "./orkestra.ts";
import { join } from "node:path";

// ── Tipler ───────────────────────────────────────────────────────────────────

export type Rol = "üretici" | "denetçi" | "güvenlik";   // güvenlik: HALKA-GUV üçüncü rol (L5·izole)

/** Etmen'in döndürdüğü çıktı (SZL-ETMEN-CIKTI ile doğrulanır — serbest sözlük). */
export type EtmenÇıktı = Record<string, unknown>;

/** ŞEF'in Etmen'e yaptığı çağrı. Denetçi çağrısında `denetlenecek` = üretici çıktısı
 *  (İZOLASYON: üreticinin prompt'u/bağlamı GEÇMEZ — yalnız çıktı). */
export interface EtmenÇağrı {
  adımKod: string;
  rol: Rol;
  prompt: string;
  denetlenecek?: EtmenÇıktı;
  /** HALKA-ORK-A01: çözülen kadro kimliği (Görev.atanan → Etmen kod·ad) — trace/panel
   *  "hangi ajan çalışıyor" gösterir. Yalnız üretici çağrısında (denetim rolleri izole). */
  etmen?: { kod: string; ad: string };
  /** HALKA-ORK-A04: devreye giren Beceri kodları (⚠️ öneki = çözülmedi) — trace izler. */
  beceriler?: string[];
}

/** TAKILABİLİR ŞEF↔Etmen sınırı (STR-3.2: gerçek LLM yok — mock/stub/gizli-politika enjekte). */
export type EtmenÇağır = (çağrı: EtmenÇağrı) => EtmenÇıktı;

/** Bir Kanca ateşlemesinin bağlamı (K9 · A24) — hangi Adım, hangi evre, o anki karar. */
export interface KancaBağlam {
  adımKod: string;
  evre: KancaEvre;
  mühür?: DonguSonuç["mühür"];   // sonra/hata evresinde mevcut ŞEF kararı bağlamı
}

/** Bir Kanca ateşlemesinin sonucu (K9 · A24). durum=hata + evre=önce → döngü BLOCKED (fail-closed). */
export interface KancaSonuç {
  kod: string;
  evre: KancaEvre;
  durum: "tamam" | "hata" | "atlandı";
  mesaj?: string;
}

/** TAKILABİLİR hook-yürütücü (K9 · A24 · EtmenÇağır deseni · STR-3.2 mock/stub/GİZLİ-politika).
 *  Yoksa Kanca'lar UYKUDA kalır (toplanır ama ateşlenmez — geriye-uyumlu). STR-3.1: ateşleme
 *  MEKANİZMASI AÇIK · hook'un NE yaptığı (araç/kurtarma) bu arayüz arkasında GİZLİ. */
export type KancaÇağır = (kanca: KancaÖzet, bağlam: KancaBağlam) => KancaSonuç;

/** Denetçi bulgusu — `kanıt` = davranışsal file:line (C.3 · VARLIK≠DOĞRULUK). */
export interface Bulgu {
  mesaj: string;
  kanıt?: string;
}

/** Bir yama-döngüsü iterasyonu (izlenebilirlik + test için). */
export interface DonguIterasyon {
  no: number;
  üreticiÇıktı: EtmenÇıktı;
  üreticiIhlaller: Ihlal[];
  denetçiÇıktı: EtmenÇıktı;
  bulgular: Bulgu[];
  durum: "GAP" | "NOT-RESOLVED" | "RESOLVED";
  /** A30: bu iterasyonda koşan müzakereler (itiraz-haklı → bulgu düşmüştür). */
  muzakereler?: MuzakereSonuç[];
}

/** Döngünün ŞEF-kararı sonucu (SZL-GEREKCE + mühür). */
export interface DonguSonuç {
  adımKod: string;
  karar: string;              // kabul|revizyon|red|kurtarma|eskalasyon
  kabulDurumu?: string;       // GEÇTİ|PASS-WEAK|PARTIAL|CONDITIONAL
  mühür: "COMPLETED" | "VERIFIED" | "BLOCKED";
  iterasyonlar: DonguIterasyon[];
  gerekçe: Record<string, unknown>;   // SZL-GEREKCE nesnesi
  ertelenenler: string[];             // STR-2.1 carry-forward adayları
  kancaSonuçları?: KancaSonuç[];      // K9 · A24 · ateşlenen hook'lar (evre-sıralı · yoksa uykuda)
  guvenlikBulgular?: GuvenlikBulgu[]; // HALKA-GUV-A03 · güvenlik halkası koştuysa taramanın tamamı
  /** kanıt-ekseni turu (B4) · STR-4 v1 ÖLÇÜM: denetçi bulgularının kanıt disiplini — kanıtsız
   *  'KALDI' bulgusu v1'de SAYILMAYA devam eder (mevcut davranış kırılmaz) ama oranı
   *  ölçülür; temizlenince HATA'ya terfi bu veriyle kararlaştırılır. Güvenlik
   *  halkasının ciddiMi deseni (kanıt ZORUNLU) değişmez — o zaten doğru. */
  kanitDisiplini?: { kanitsiz: number; toplam: number };
  kurtarma?: KurtarmaKarar;           // A31 · BLOCKED sonrası kurtarma kararı (donguKurtarmali bağlar)
  tasarim?: EtmenÇıktı;               // A33 · AŞ-2 tasarım-önce çıktısı (tasarimAsamasi açıksa)
  testler?: EtmenÇıktı;               // A35 · AŞ-6 test-üretim çıktısı (testAsamasi açıksa)
  sonKontrol?: EtmenÇıktı;            // A36 · AŞ-10 son-kontrol denetçi çıktısı (sonKontrolAsamasi açıksa)
}

export interface DonguSeçenek {
  maxIterasyon?: number;      // varsayılan 2 (kanıt-ekseni turu GEÇİCİ token kalkanı; eski 10 = WF-ORCH)
  /** rol→yetki profili. FAIL-CLOSED: verilmezse VARSAYILAN_ROL_PROFIL (RBAC hep aktif). */
  rolProfil?: Record<string, RolProfil>;
  /** enjekte hook-yürütücü (K9 · A24). Verilmezse Kanca'lar uykuda (ateşlenmez · geriye-uyumlu). */
  kancaÇağır?: KancaÇağır;
  /** HALKA-GUV-A03: üçüncü halka — üretici→denetçi→GÜVENLİK. Opt-in (geriye-uyumlu):
   *  true ise kabul edilen üretim savunma-taramasından geçer; CİDDİ bulgu = BLOCKED. */
  guvenlikAktif?: boolean;
  /** A30 · DEBATE (opt-in — verilmezse itirazsız akış BİREBİR eski davranış):
   *  denetçi bulgusuna üretici SAVUNMA verir, hakem hükme bağlar. Hakem POLİTİKASI
   *  GİZLİ enjekte (STR-3). sema: SZL-MÜZAKERE (mek_sef.sar'dan OKUNUR — dogfood);
   *  verilirse her tur şemayla doğrulanır, ihlal bulguya döner. Tur limiti savunma
   *  sürerken dolarsa koşu ESKALE edilir. */
  muzakere?: { savun: SavunmaÇağır; hakem: Hakem; maxTur?: number; sema?: Map<string, AlanSema> };
  /** A32 · Adım-İÇİ çok-Etmen (opt-in): pay-başına BaglamPaket (her Etmen kendi
   *  koni+beceri bağlamıyla — baglamMontajla(seçilenEtmen)). ≥2 paket: üretim payları
   *  SIRALI sürülür, çıktılar birleşir, denetçi BİRLEŞİK çıktıyı görür. */
  cokEtmen?: { paketler: BaglamPaket[] };
  /** TAS-D01 · YÜZEY-CHECKLIST modu (opt-in): niyet/kabul maddeleri verilirse denetçi
   *  prompt'u denetciChecklistPrompt olur — her madde TEK TEK var/yok/kısmi işaretlenir,
   *  bütünsel 'iyi mi' yargısı YASAK (denendi · niyet kaçtı · YAS-4.1 dersi). Verilmezse
   *  denetciPrompt birebir eski davranış (geriye-uyumlu). */
  checklistMaddeler?: string[];
  /** AŞ-2 ÖNCE TASARIM (opt-in — verilmezse akış BİREBİR eski davranış):
   *  true ise iter-0'dan ÖNCE bir üretici TASARIM çağrısı koşar (kod yasak; seçenek·
   *  değişmez≥2·edge·test stratejisi). Çıktı AŞ-3 kod prompt'una önek bağlam akar
   *  (DonguSonuç.tasarim'de taşınır). Halüsinasyon kalkanı: ≥2 değişmez ZORUNLU,
   *  eksikse koşu GAP→BLOCKED (sessizce geçmez · kodlama_akisi AŞ-2 · YAS-4.1). */
  /** AŞ-0 BAĞLAM KİLİDİ (opt-in — verilmezse akış BİREBİR eski davranış):
   *  true ise HER ŞEYDEN ÖNCE bağlam tamlığı denetlenir (çözülmeyen referans/beceri ·
   *  <2 değişmez kaynağı). Eksik varsa koşu HİÇ başlamaz → DUR/BLOCKED (kodlama_akisi
   *  AŞ-0 · "eksik referansla koda girme"). Kilitliyse akış normal sürer. */
  baglamKilidi?: boolean;
  tasarimAsamasi?: boolean;
  /** AŞ-6 TEST ÜRETİMİ (opt-in — verilmezse akış BİREBİR eski davranış):
   *  true ise kod KABULÜNDEN SONRA üretici AYRI bir test-üretim çağrısı yapar (AŞ-2 test
   *  stratejisi + edge'ler köprü). Test üretilmezse VERIFIED DÜŞER (→COMPLETED) + GAP
   *  ertelenenlere: kanıt yoksa yeşil değil (VARLIK≠DOĞRULUK · YAS-4.1). */
  testAsamasi?: boolean;
  /** SZL-TASARIM şeması (mek_sef.sar'dan OKUNUR — dogfood). Verilirse tasarım çıktısı
   *  her koşuda sozlesmeDenetle'ye vurulur; verilmezse yalnız ≥2-değişmez kalkanı işler. */
  tasarimSema?: Map<string, AlanSema>;
  /** AŞ-10 SON KONTROL (opt-in — verilmezse akış BİREBİR eski davranış):
   *  true ise TÜM aşamalardan sonra İZOLE denetçi kapanış yargısı — kabul karşılandı mı ·
   *  dokunulmaz'a dokunuldu mu (HAYIR) · tutarlı mı. Herhangi biri başarısızsa (denetçi
   *  kırılganNoktalar dolu) karar RED → mühür BLOCKED (kodlama_akisi AŞ-10 · YAS-4.1). */
  sonKontrolAsamasi?: boolean;
}

/** Güvenlik bulgusu (HALKA-GUV-A02): kategori taşır — CİDDİ tanımı buradan işler. */
export interface GuvenlikBulgu extends Bulgu {
  kategori?: string;   // injection · authz · secret · diğer
}

/** CİDDİ-BULGU tanımı (lig uzlaşısı — 'ciddi' tanımsız kalamaz):
 *  injection/authz/secret kategorisinden KANITLI bulgu = BLOCKED; gerisi uyarı→Hatırlatıcı. */
const CIDDI_KATEGORILER = new Set(["injection", "authz", "secret"]);
export function ciddiMi(b: GuvenlikBulgu): boolean {
  return !!b.kategori && CIDDI_KATEGORILER.has(b.kategori) && !!b.kanıt;
}

// kanıt-ekseni turu · yama tavanı GEÇİCİ 2 (token kalkanı — kanıtsızlık YAMAYLA çözülmez;
// sicilsiz koşuyu 10 tur yamaya sürüklemek yalnız token yakar). Eski değer 10 (WF-ORCH);
// kalıcı değer kapı doğrultma turunda (kanıt-ekseni kapı-doğrultma turu) yeniden değerlendirilir.
const VARSAYILAN_MAX = 2;

// ── SAF ÇEKİRDEK ────────────────────────────────────────────────────────────

/**
 * Güvenlik-denetçi prompt'u (HALKA-GUV-A02): üretici çıktısına karşı SAVUNMA amaçlı
 * tehdit modelleme — injection · authz · secret üç kategori TARANIR; her bulgu
 * kanıtlı (dosya:satır) + savunma önerili. YAS-5'in ebedî güvenlik hükmü koni'ye
 * ZORUNLU iner: bulgu+savunma EVET, silahlaştırılmış istismar yükü HAYIR.
 */
export function guvenlikPrompt(üreticiÇıktı: EtmenÇıktı): string {
  return [
    "## 🛡️ GÜVENLİK DENETİMİ (savunma amaçlı tehdit modelleme)",
    "",
    "⚖️ ANAYASA (EBEDÎ GÜVENLİK HÜKMÜ): Güvenlik bilgisi yalnız koruma amacıyla",
    "kullanılır. Amaç kendi kodumuzu SAVUNMAKTIR —",
    "zafiyet BUL ve KAPAT; silahlaştırılmış istismar aracı/yükü ÜRETME.",
    "",
    "Aşağıdaki üretici çıktısını ÜÇ kategoride tara (her kategori için ya kanıtlı",
    "senaryo ya GEREKÇELİ 'temiz' raporu — sessiz geçmek yasak):",
    "1. injection — SQL/komut/prompt enjeksiyonu",
    "2. authz — yetkilendirme atlatma / eksik erişim denetimi",
    "3. secret — sır/anahtar sızıntısı, düz-metin kimlik bilgisi",
    "",
    "Her bulgu için: kategori + davranışsal kanıt (dosya:satır) + savunma önerisi.",
    "Çıktı alanları: bulgular[{mesaj, kanıt, kategori}] · kategoriRaporu · rol: güvenlik.",
    "",
    "── ÜRETİCİ ÇIKTISI ──",
    JSON.stringify(üreticiÇıktı, null, 2),
  ].join("\n");
}

/** Güvenlik çıktısından kategorili bulguları çıkarır (saf — biçim toleranslı). */
export function guvenlikBulgulariCikar(çıktı: EtmenÇıktı): GuvenlikBulgu[] {
  if (!Array.isArray(çıktı.bulgular)) return [];
  return (çıktı.bulgular as Array<Record<string, unknown>>).map((b) => ({
    mesaj: typeof b.mesaj === "string" ? b.mesaj : JSON.stringify(b),
    kanıt: typeof b.kanıt === "string" ? b.kanıt : undefined,
    kategori: typeof b.kategori === "string" ? b.kategori : undefined,
  }));
}

/** Denetçi çağrısının prompt'u — YALNIZ üretici çıktısı (izolasyon: bağlam/bellek yok). */
export function denetciPrompt(üreticiÇıktı: EtmenÇıktı): string {
  return [
    "# 🕵️ Denetçi görevi (İZOLE — yalnız çıktıyı incele; VARLIK≠DOĞRULUK)",
    "Üreticinin belleğini/bağlamını görmüyorsun — sadece aşağıdaki çıktıyı yargıla; üretici ile denetçi bellekçe izoledir.",
    "Her bulguyu file:line ile KANITLA. Artefaktın var olması yetmez; kanıtsız 'geçti' =",
    "sahte-yeşil, REDDET — artefaktın varlığı doğruluğun kanıtı değildir. Bulguları `kırılganNoktalar`a, kanıtı `testSonucu`ya yaz.",
    "",
    "## İncelenecek üretici çıktısı",
    JSON.stringify(üreticiÇıktı, null, 2),
  ].join("\n");
}

/**
 * TAS-D01 · Yüzey-checklist denetçi prompt'u (opt-in — DonguSeçenek.checklistMaddeler):
 * niyet/kabul maddeleri MADDE MADDE işaretlenir (var/yok/kısmi + kanıt). Gömülü ders
 * (HTR-TASARIM-DISIPLINI · YAS-4.1): bütünsel "iyi mi/güzel mi" yargısı YASAK — denendi,
 * özet kayıplı çıktı, yargı gevşedi, niyet kaçtı. Her madde = ayrı kabul ölçütü;
 * "yok/kısmi" işaretlenen HER madde kırılganNoktalar'a file:line kanıtıyla düşer.
 */
export function denetciChecklistPrompt(üreticiÇıktı: EtmenÇıktı, maddeler: string[]): string {
  return [
    "# 🕵️ Denetçi görevi — YÜZEY-CHECKLIST modu (izole bakış; bir şeyin var olması doğru olduğunu kanıtlamaz)",
    "Üreticinin belleğini/bağlamını görmüyorsun — sadece aşağıdaki çıktıyı yargıla; üretici ile denetçi bellekçe izoledir.",
    "",
    "## Kurallar",
    "1. Aşağıdaki niyet-maddelerini TEK TEK işaretle: her madde için `var` / `yok` / `kısmi`.",
    "2. Her işaret file:line KANIT ister — kanıtsız `var` = sahte-yeşil, geçersiz; varlık doğruluk değildir.",
    "3. ⛔ BÜTÜNSEL YARGI YASAK: 'genel olarak iyi/güzel/uyumlu' DEME — yalnız madde madde",
    "   konuş (bütünsel bakış denendi, niyet kaçtı — gömülü ders).",
    "4. `yok`/`kısmi` çıkan HER maddeyi `kırılganNoktalar`a yaz (madde + file:line);",
    "   kanıtları `testSonucu`ya yaz. Tüm maddeler `var`+kanıtlı ise kırılganNoktalar boş kalır.",
    "",
    "## Niyet-maddeleri (her biri AYRI kabul ölçütü)",
    ...maddeler.map((m, i) => `- [ ] madde ${i + 1}: ${m}`),
    "",
    "## İncelenecek üretici çıktısı",
    JSON.stringify(üreticiÇıktı, null, 2),
  ].join("\n");
}

/** Yama iterasyonu prompt'u — koni prompt'u + denetçi bulguları (GAP→RESOLVED). */
export function yamaPrompt(paket: BaglamPaket, bulgular: Bulgu[]): string {
  return [
    promptUret(paket),
    "",
    "---",
    "## 🔧 Yama gerekli — denetçi bulgularını KAPAT (GAP→RESOLVED)",
    ...bulgular.map((b) => `- ${b.mesaj}${b.kanıt ? ` (${b.kanıt})` : ""}`),
    "",
    "ÖNCEKİ çözümü aynen tekrarlama (aynı-yöntem-yasak) — yaklaşımı değiştir.",
  ].join("\n");
}

const YER_TUTUCU = "<!-- TODO -->";
const doluMu = (s: string | undefined): boolean => !!s && s.trim() !== "" && s !== YER_TUTUCU;

/** AŞ-0 Bağlam Kilidi (kodlama akışının sıfırıncı aşaması): kod ÜRETİMİNDEN ÖNCE bağlam
 *  tamlığını denetler — çözülmeyen referans/bağımlılık · çözülmeyen beceri · <2 değişmez
 *  kaynağı (dokunulmaz + sınır). Boş dönerse bağlam KİLİTLİ (geçilir); dolu dönerse
 *  eksik var → DUR (donguÇalıştır BLOCKED üretir). Saf — yan etkisiz. */
export function baglamKilidi(paket: BaglamPaket): Bulgu[] {
  const bulgular: Bulgu[] = [];
  for (const r of paket.referanslar) {
    if (!r.çözüldü) bulgular.push({ mesaj: `AŞ-0 bağlam eksik: ${r.tür} '${r.kod}' çözülmedi (eksik→DUR)` });
  }
  for (const b of paket.beceriler) {
    if (!b.çözüldü) bulgular.push({ mesaj: `AŞ-0 bağlam eksik: beceri '${b.kod}' yüklenemedi (eksik→DUR)` });
  }
  const değişmezKaynak = [paket.koni.dokunulmaz, paket.koni.sınır].filter(doluMu).length;
  if (değişmezKaynak < 2) {
    bulgular.push({ mesaj: `AŞ-0 bağlam eksik: ≥2 değişmez kaynağı gerekli (dokunulmaz + sınır) — ${değişmezKaynak} tanımlı (eksik→DUR)` });
  }
  return bulgular;
}

/** AŞ-2 Önce Tasarım prompt'u (kodlama akışının ikinci aşaması): üretici KOD YAZMADAN
 *  önce tasarım üretir — seçenek·değişmez(≥2)·edge·test stratejisi. promptUret koni
 *  bağlamı üstüne "kod yasak" kısıtı biner (WF-ORCH parantezleme korunur). */
export function tasarimPrompt(paket: BaglamPaket): string {
  return [
    promptUret(paket),
    "",
    "---",
    "## 📐 AŞ-2 · ÖNCE TASARIM (KOD YAZMA — bu aşama tasarım-önce)",
    "Henüz kod ÜRETME. Önce çözümü TASARLA ve şu alanları doldur:",
    "- `seçenekler`: değerlendirdiğin en az bir yaklaşım (tercih + neden)",
    "- `değişmezler`: korunacak EN AZ İKİ değişmez (dokunulmaz/sınırdan türet)",
    "- `edgeler`: sınır/edge durumları (boş girdi · hata yolu · eşzamanlılık…)",
    "- `testStratejisi`: bunu NASIL test edeceğin (AŞ-6 test üretimine köprü)",
    "",
    "Kanıtsız tasarım yasak; değişmezler dokunulmaz+sınıra dayanmalı (VARLIK≠DOĞRULUK).",
  ].join("\n");
}

/** AŞ-2 tasarım çıktısını AŞ-3 kod prompt'una ÖNEK bağlam olarak biçimler (saf · biçim-toleranslı). */
export function tasarimBaglami(tasarımÇıktı: EtmenÇıktı): string {
  const dizi = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);
  const s: string[] = ["## 📐 AŞ-2 Tasarım (bunu UYGULA — AŞ-3 kodlama)"];
  const seç = dizi(tasarımÇıktı.seçenekler);
  const değ = dizi(tasarımÇıktı.değişmezler);
  const edg = dizi(tasarımÇıktı.edgeler);
  if (seç.length) s.push("- Seçilen yaklaşım(lar): " + seç.join(" · "));
  if (değ.length) s.push("- Korunacak değişmezler: " + değ.join(" · "));
  if (edg.length) s.push("- Kapsanacak edge'ler: " + edg.join(" · "));
  if (typeof tasarımÇıktı.testStratejisi === "string" && tasarımÇıktı.testStratejisi) {
    s.push("- Test stratejisi: " + tasarımÇıktı.testStratejisi);
  }
  return s.join("\n");
}

/** AŞ-6 Test Üretimi prompt'u (kodlama akışının altıncı aşaması): kod KABUL EDİLDİKTEN
 *  sonra üretici testleri AYRI üretir — AŞ-2 test stratejisi + edge'ler köprü; davranışsal
 *  kanıt (VARLIK≠DOĞRULUK). Çıktı: testDosyalar[] (üretilen test dosyaları). */
export function testPrompt(paket: BaglamPaket, kodÇıktı: EtmenÇıktı, tasarım?: EtmenÇıktı): string {
  const s: string[] = [
    `# 🧪 AŞ-6 · TEST ÜRETİMİ — ${paket.adimKod}`,
    "Kod KABUL edildi. Şimdi bu kodu KANITLAYAN testleri üret — kanıt yoksa yeşil değildir.",
    "",
  ];
  if (tasarım && typeof tasarım.testStratejisi === "string" && tasarım.testStratejisi) {
    s.push("## 📐 Test stratejisi (AŞ-2'den)", String(tasarım.testStratejisi), "");
  }
  const edg = tasarım && Array.isArray(tasarım.edgeler) ? tasarım.edgeler.map(String) : [];
  if (edg.length) s.push("## 🔲 Kapsanacak edge'ler", ...edg.map((e) => `- ${e}`), "");
  s.push(
    "## Test edilecek üretim (kod çıktısı)",
    JSON.stringify(kodÇıktı, null, 2),
    "",
    "Çıktı alanları: testDosyalar[] (üretilen test dosyalarının adları) · rol: üretici.",
    "Her kabul ölçütü + edge için EN AZ BİR test; testDosyalar boş bırakılamaz.",
  );
  return s.join("\n");
}

/** Test çıktısından üretilen test dosyalarını çıkarır (testDosyalar öncelikli; yoksa
 *  üretilenDosyalar içinden test-desenli adlar · saf · biçim-toleranslı). */
export function testDosyalariCikar(çıktı: EtmenÇıktı): string[] {
  if (Array.isArray(çıktı.testDosyalar)) return (çıktı.testDosyalar as unknown[]).map(String);
  if (Array.isArray(çıktı.üretilenDosyalar)) {
    return (çıktı.üretilenDosyalar as unknown[]).map(String).filter((f) => /(\.|_|\b)(test|spec)(\.|_|\b)/i.test(f));
  }
  return [];
}

/** AŞ-10 Son Kontrol prompt'u (kodlama akışının onuncu aşaması): İZOLE denetçi kapanış
 *  yargısı — kabul karşılandı mı · dokunulmaz'a dokunuldu mu (HAYIR olmalı) · üretim tutarlı
 *  mı. Başarısız kontrol kırılganNoktalar'a file:line kanıtıyla düşer (boş=tümü geçti · ORK-6.1). */
export function sonKontrolPrompt(paket: BaglamPaket, sonÜretici: EtmenÇıktı, kabulDurumu?: string): string {
  const k = paket.koni;
  const göster = (s: string): string => (doluMu(s) ? s : "—");
  return [
    `# ✅ AŞ-10 · SON KONTROL — ${paket.adimKod} (İZOLE denetçi · VARLIK≠DOĞRULUK)`,
    "Üretimin KAPANIŞ yargısı. ÜÇ soruyu KANITLA; başarısızları kırılganNoktalar'a file:line ile yaz:",
    `1. Kabul ölçütü karşılandı mı? (kabul: ${göster(k.kabul)})${kabulDurumu ? `  [durum: ${kabulDurumu}]` : ""}`,
    `2. Dokunulmaz'a dokunuldu mu? (dokunulmaz: ${göster(k.dokunulmaz)}) — HAYIR olmalı; dokunulduysa İHLAL`,
    "3. Üretim iç-tutarlı mı? (çelişkili / yarım artefakt = İHLAL)",
    "",
    "Tümü geçtiyse kırılganNoktalar BOŞ bırak. Kanıtsız 'geçti' = sahte-yeşil, REDDET.",
    "## İncelenecek üretim",
    JSON.stringify(sonÜretici, null, 2),
  ].join("\n");
}

/** Denetçi çıktısındaki bulguları (kırılganNoktalar) file:line kanıtıyla çıkarır. */
export function bulgulariCikar(denetçiÇıktı: EtmenÇıktı): Bulgu[] {
  const ham = denetçiÇıktı.kırılganNoktalar;
  if (!Array.isArray(ham)) return [];
  return ham.map((x) => {
    const s = String(x);
    const m = s.match(/(\S+:\d+)/);   // file:line kanıt jetonu
    return m ? { mesaj: s, kanıt: m[1] } : { mesaj: s };
  });
}

/** Denetçi BEYANININ iç tutarlılığı — testSonucu "geçti" + file:line + kanıt-dosyası
 *  üreticinin `üretilenDosyalar` beyanında (C.3 · YAS-4.1 kabul-yolu süzgeci).
 *  ⚠️ BU, KANIT DEĞİLDİR (kanıt-ekseni turu): her iki alan da LLM-YAZIMLI — aynı modelin iki
 *  rolde aynı string üzerinde anlaşması BEDAVA. Bu süzgeç yalnız KABUL yolundaki
 *  bariz sahte-yeşili keser; MÜHÜR (VERIFIED) buradan ASLA türemez → sicildeKanitVar.
 *  13 Temmuz dersi: eski `üreticiÇıktı === undefined → true` dalı (bedava-VERIFIED)
 *  SİLİNDİ — "sicil verilmedi → eski denetim" geriye-uyumluluğu deliğin ta kendisiydi;
 *  üreticiÇıktı artık ZORUNLU parametre. */
export function beyanTutarli(denetçiÇıktı: EtmenÇıktı, üreticiÇıktı: EtmenÇıktı): boolean {
  const t = denetçiÇıktı.testSonucu;
  if (typeof t !== "string" || !/geçti/.test(t)) return false;
  const jeton = t.match(/([\p{L}\p{N}_./-]+):(\d+)/u);   // dosya:satır (Türkçe ad güvenli)
  if (!jeton) return false;
  const üretilenler = Array.isArray(üreticiÇıktı.üretilenDosyalar)
    ? üreticiÇıktı.üretilenDosyalar.map(String) : [];
  if (üretilenler.length === 0) return false;
  const kanıtDosya = jeton[1];
  return üretilenler.some((d) => d === kanıtDosya || d.endsWith("/" + kanıtDosya) || kanıtDosya.endsWith("/" + d));
}

/** MEKANİK KANIT — mühür kapısı (kanıt-ekseni turu · B1): koşum SİCİLİNDE (`araçTurları`)
 *  `durum:"izinli"` + `araç:"test-koş"` + `sonuç.çıkışKodu === 0` arar; denetçi ve
 *  üretici çıktılarının HER İKİ sicili taranır (üretim matrisi ikisine de test-koş verir).
 *  `testSonucu` METNİNE BAKMAZ — o alan LLM-yazımlı; hangi regex yazılırsa yazılsın,
 *  alanın yazarı model olduğu sürece kapı modelin insafında kalırdı. Sicil ise
 *  KÖPRÜNÜN yazdığı alandır (kanıt-ekseni turu: araçSiciliYaz KOŞULSUZ sahiplenir — model
 *  uydursa da ezilir) ve çıkışKodu, gerçek `node --test` koşusunun işletim sistemine
 *  söylediği sayıdır (kanıt-ekseni turu: kalkan tetiklenirse uydurma 0 asla verilmez).
 *  SAF: girdi iki EtmenÇıktı — döngü diske BAKMAZ (13 Temmuz dersi: kanıt kapısını
 *  diske bağlamak tiyatroyu inandırıcı yapar, VARLIK≠DOĞRULUK); köprü sicili diske
 *  bakar, döngü sicili okur. */
export function sicildeKanitVar(denetçiÇıktı: EtmenÇıktı, üreticiÇıktı: EtmenÇıktı): boolean {
  const turlar = (ç: EtmenÇıktı): unknown[] => (Array.isArray(ç.araçTurları) ? ç.araçTurları : []);
  return [...turlar(denetçiÇıktı), ...turlar(üreticiÇıktı)].some((tur) => {
    if (typeof tur !== "object" || tur === null) return false;
    const t = tur as Record<string, unknown>;
    if (t.durum !== "izinli" || t.araç !== "test-koş") return false;
    const sonuç = t.sonuç;
    return typeof sonuç === "object" && sonuç !== null &&
      (sonuç as Record<string, unknown>).çıkışKodu === 0;
  });
}

/** Üretici yönteminin imzası (aynı-yöntem-yasak tespiti — kısır döngü kalkanı). */
function yontemImzasi(üreticiÇıktı: EtmenÇıktı): string {
  return JSON.stringify([üreticiÇıktı.üretilenDosyalar ?? null, üreticiÇıktı.gerekçe ?? null]);
}

/** Döngü sonundan bir SZL-GEREKCE nesnesi kurar (A05 · çok-değerli kabul). */
export function gerekceKur(
  adımKod: string,
  karar: string,
  bulgular: Bulgu[],
  sonDenetçi: EtmenÇıktı | undefined,
): Record<string, unknown> {
  const kabulDurumu = karar === "kabul" ? "GEÇTİ" : karar === "eskalasyon" ? "PARTIAL" : "CONDITIONAL";
  return {
    adım: adımKod,
    karar,
    ne: karar === "kabul"
      ? "Adım denetçi onayı + davranışsal kanıtla kabul edildi."
      : `Döngü '${karar}' ile sonlandı — ${bulgular.length} açık bulgu.`,
    neden: karar === "kabul"
      ? "Denetçi izole incelemede davranışsal kanıt doğruladı; açık bulgu yok."
      : (bulgular.map((b) => b.mesaj).join(" · ") || "iterasyon limiti aşıldı"),
    kanıt: typeof sonDenetçi?.testSonucu === "string" ? sonDenetçi.testSonucu : "",
    kabulDurumu,
    ertelenenler: bulgular.map((b) => b.mesaj),   // STR-2.1: açık kalemler Hatırlatıcı adayı
  };
}

/** Döngü sonucunu bir DURAK'a özetler (D.3 · saf — SZL-DURAK şekli). Çok-adımlı akışta
 *  sonraki Adım'ın `öncekiDurak` bağlamına akar; kontrol noktasına serileşir. */
export function durakOzetle(sonuç: DonguSonuç): DurakÖzet {
  const g = sonuç.gerekçe;
  const özet = typeof g.ne === "string" && g.ne ? g.ne : `${sonuç.karar} (${sonuç.iterasyonlar.length} iterasyon)`;
  const kanıt = typeof g.kanıt === "string" && g.kanıt ? g.kanıt : undefined;
  return {
    adım: sonuç.adımKod,
    karar: sonuç.karar,
    mühür: sonuç.mühür,
    özet,
    ertelenenler: sonuç.ertelenenler,
    kanıt,
    // A31: kurtarma durumu durak/kontrol noktasına TAŞINIR — sonraki koşu yolu bilir.
    kurtarma: sonuç.kurtarma ? { yol: sonuç.kurtarma.yol, gerekçe: sonuç.kurtarma.gerekçe } : undefined,
  };
}

/** Metni tek-satır güvenli .sar dizgisine indirger (iç " → ' · satır kırığı → ·). */
function sarDizgi(metin: string): string {
  return `"${metin.replace(/\n+/g, " · ").replace(/"/g, "'").trim()}"`;
}

/**
 * Koşu geri-yazım kaydını render eder (STR-4 · SAF): son ŞEF koşusu, Adım'a
 * `koşu: Koşum(...)` parametresi olarak yazılacak .sar PARÇASI olur — harita değil
 * WIDGET (şema-doğrulanır: kayit.json Koşum mühür/karar enum'ları). Tarih/model
 * dışarıdan enjekte edilir (saf kalır — çekirdekte Date.now yok, STR-3.2 ruhu).
 * Dosyaya YAZMAZ — yazım HALKA-SENK-A05'in işi (adimGeriYaz).
 */
export function kosumYaz(sonuç: DonguSonuç, ek?: { tarih?: string; model?: string }): string {
  const d = durakOzetle(sonuç);
  const parcalar = [
    `kod: KSM-${d.adım}`,
    `ne: ${sarDizgi(`ŞEF koşusu: ${d.özet}`)}`,
    `mühür: ${d.mühür}`,
    `karar: ${d.karar}`,
    `iterasyon: ${sonuç.iterasyonlar.length}`,
  ];
  if (d.kanıt) parcalar.push(`kanıt: ${sarDizgi(d.kanıt)}`);
  if (ek?.tarih) parcalar.push(`tarih: ${sarDizgi(ek.tarih)}`);
  if (ek?.model) parcalar.push(`model: ${sarDizgi(ek.model)}`);
  return `koşu: Koşum( ${parcalar.join(", ")} )`;
}

/**
 * ŞEF çekirdek döngüsü (saf — yan etki yalnız enjekte `etmenÇağır`da).
 * üret→denetle(izole)→yama→yeniden-doğrula; kabul/eskalasyon ile sonlanır.
 */
export function donguÇalıştır(
  paket: BaglamPaket,
  ciktiSema: Map<string, AlanSema>,
  gerekceSema: Map<string, AlanSema>,
  etmenÇağır: EtmenÇağır,
  seç: DonguSeçenek = {},
): DonguSonuç {
  const maxIterasyon = seç.maxIterasyon ?? VARSAYILAN_MAX;
  // FAIL-CLOSED (eski OS s09): rolProfil yoksa kanonik varsayılan — RBAC sessizce kapanmaz.
  const profiller = seç.rolProfil ?? VARSAYILAN_ROL_PROFIL;
  const üreticiProfil = profiller["üretici"] ?? VARSAYILAN_ROL_PROFIL["üretici"];
  const denetçiProfil = profiller["denetçi"] ?? VARSAYILAN_ROL_PROFIL["denetçi"];
  // Çağrı-anı yetki kapısı (D.1): yetkisiz kadro ile döngü BAŞLAMAZ (red/BLOCKED).
  const rbacİhlaller = [
    ...rbacÇağrıDenetle("üretici", üreticiProfil),
    ...rbacÇağrıDenetle("denetçi", denetçiProfil),
  ];
  if (rbacİhlaller.length) {
    const bulgular: Bulgu[] = rbacİhlaller.map((i) => ({ mesaj: `RBAC (${i.kural}): ${i.mesaj}` }));
    const gerekçe = gerekceKur(paket.adimKod, "red", bulgular, undefined);
    return {
      adımKod: paket.adimKod, karar: "red",
      kabulDurumu: typeof gerekçe.kabulDurumu === "string" ? gerekçe.kabulDurumu : undefined,
      mühür: "BLOCKED", iterasyonlar: [], gerekçe, ertelenenler: bulgular.map((b) => b.mesaj),
    };
  }

  // ── Kanca ateşleme kurulumu (K9 · A24) ──
  // Yürütücü yoksa Kanca'lar UYKUDA (toplanmış ama ateşlenmez) — geriye-uyumlu.
  const kancaÇağır = seç.kancaÇağır;
  const kancalar = paket.kancalar ?? [];
  const kancaSonuçları: KancaSonuç[] = [];
  const kancaAteşle = (evre: KancaEvre, mühür?: DonguSonuç["mühür"]): KancaSonuç[] => {
    if (!kancaÇağır) return [];
    const çıktı: KancaSonuç[] = [];
    for (const k of kancalar) {
      if (k.evre !== evre) continue;
      çıktı.push(kancaÇağır(k, { adımKod: paket.adimKod, evre, mühür }));
    }
    return çıktı;
  };

  // ① önce-hook'lar — döngü BAŞLAMADAN ateşlenir (FAIL-CLOSED governance-gate: on-plan
  //    gibi kaynak-teyit kapıları). Biri 'hata' dönerse üretici HİÇ çağrılmaz → BLOCKED.
  const öncekiSonuçlar = kancaAteşle("önce");
  kancaSonuçları.push(...öncekiSonuçlar);
  const öncekiHata = öncekiSonuçlar.find((r) => r.durum === "hata");
  if (öncekiHata) {
    const bulgular: Bulgu[] = [{ mesaj: `önce-hook engeli (${öncekiHata.kod}): ${öncekiHata.mesaj ?? "kanca 'hata' döndü"}` }];
    const gerekçe = gerekceKur(paket.adimKod, "red", bulgular, undefined);
    return {
      adımKod: paket.adimKod, karar: "red",
      kabulDurumu: typeof gerekçe.kabulDurumu === "string" ? gerekçe.kabulDurumu : undefined,
      mühür: "BLOCKED", iterasyonlar: [], gerekçe, ertelenenler: bulgular.map((b) => b.mesaj),
      kancaSonuçları,
    };
  }

  // ── AŞ-0 · BAĞLAM KİLİDİ (A34 · opt-in) — HER ŞEYDEN ÖNCE bağlam tamlığı kapısı.
  //    Çözülmeyen referans/beceri ya da <2 değişmez kaynağı varsa koşu HİÇ başlamaz
  //    (eksik referansla koda girme · kodlama_akisi AŞ-0). Kapalıysa akış birebir eski.
  if (seç.baglamKilidi) {
    const eksikler = baglamKilidi(paket);
    if (eksikler.length) {
      const gerekçe = gerekceKur(paket.adimKod, "red", eksikler, undefined);
      return {
        adımKod: paket.adimKod, karar: "red",
        kabulDurumu: typeof gerekçe.kabulDurumu === "string" ? gerekçe.kabulDurumu : undefined,
        mühür: "BLOCKED", iterasyonlar: [], gerekçe, ertelenenler: eksikler.map((b) => b.mesaj),
        kancaSonuçları,
      };
    }
  }

  // ── AŞ-2 · ÖNCE TASARIM (A33 · opt-in) — kod ÜRETİMİNDEN ÖNCE tasarım aşaması.
  //    Üretici kod-suz tasarım verir (seçenek·değişmez≥2·edge·test stratejisi); çıktı
  //    AŞ-3 iter-0 prompt'una önek bağlam akar. Halüsinasyon kalkanı: ≥2 değişmez
  //    ZORUNLU + (şema verildiyse) SZL-TASARIM denetimi — eksikse GAP→BLOCKED (YAS-4.1,
  //    sessizce geçilmez). Kapalıysa tasarim undefined kalır, akış birebir eski.
  let tasarim: EtmenÇıktı | undefined;
  if (seç.tasarimAsamasi) {
    tasarim = etmenÇağır({
      adımKod: paket.adimKod, rol: "üretici", prompt: tasarimPrompt(paket), etmen: paket.etmen,
    });
    const değişmezSayı = Array.isArray(tasarim.değişmezler) ? tasarim.değişmezler.length : 0;
    const semaIhlaller = seç.tasarimSema ? sozlesmeDenetle(seç.tasarimSema, tasarim) : [];
    if (değişmezSayı < 2 || semaIhlaller.length) {
      const bulgular: Bulgu[] = [];
      if (değişmezSayı < 2) {
        bulgular.push({ mesaj: `AŞ-2 tasarım eksik: ≥2 değişmez gerekli (${değişmezSayı} verildi) — bağlam kilidi kanıtsız kapanamaz` });
      }
      for (const i of semaIhlaller) bulgular.push({ mesaj: `AŞ-2 SZL-TASARIM ihlali (${i.alan}): ${i.mesaj}` });
      const gerekçe = gerekceKur(paket.adimKod, "red", bulgular, undefined);
      return {
        adımKod: paket.adimKod, karar: "red",
        kabulDurumu: typeof gerekçe.kabulDurumu === "string" ? gerekçe.kabulDurumu : undefined,
        mühür: "BLOCKED", iterasyonlar: [], gerekçe, ertelenenler: bulgular.map((b) => b.mesaj),
        kancaSonuçları, tasarim,
      };
    }
  }
  // AŞ-3 iter-0 kod prompt'una eklenecek tasarım öneki (yalnız tasarım varsa).
  const tasarimEk = tasarim ? "\n\n---\n" + tasarimBaglami(tasarim) : "";

  const iterasyonlar: DonguIterasyon[] = [];
  let karar = "eskalasyon";   // limit/max aşılırsa varsayılan
  let öncekiImza: string | undefined;
  let ardArdaHata = 0;        // iki ard-arda üretici şema-ihlali → 2-hata eskale
  let sonÜretici: EtmenÇıktı | undefined;
  let sonDenetçi: EtmenÇıktı | undefined;
  let sonBulgular: Bulgu[] = [];

  let muzakereEskalasyonu = false;   // A30: tur limiti savunma sürerken doldu → eskale
  let kanitToplam = 0;               // kanıt-ekseni turu · STR-4 v1: denetçi bulgusu kanıt-disiplini ölçümü
  let kanitsizSayisi = 0;
  for (let no = 0; no < maxIterasyon; no++) {
    // ① Üretici (AŞ-2/3) — iter-0 koni prompt'u, sonra yama-prompt'u.
    //    Kadro kimliği (HALKA-ORK-A01): çözülen atanan Etmen çağrıya biner (trace/panel görür).
    //    A32 · çok-Etmen: ≥2 pay varsa üretim payları SIRALI sürülür (her pay kendi
    //    koni+beceri paketiyle — ORK-6.1 izolasyonu Etmen-başına), çıktılar BİRLEŞİR;
    //    tek paket / verilmemişse davranış birebir eskisi.
    const payPaketleri = seç.cokEtmen?.paketler?.length ? seç.cokEtmen.paketler : undefined;
    let üreticiÇıktı: EtmenÇıktı;
    if (payPaketleri && payPaketleri.length > 1) {
      üreticiÇıktı = cokEtmenÜret(
        payPaketleri.map((p) => ({ kod: p.etmen?.kod ?? "?", ad: p.etmen?.ad ?? "?" })),
        (_e, sıra) => {
          const payPaket = payPaketleri[sıra];
          const payPrompt = no === 0 ? promptUret(payPaket) + tasarimEk : yamaPrompt(payPaket, sonBulgular);
          return etmenÇağır({
            adımKod: payPaket.adimKod, rol: "üretici", prompt: payPrompt, etmen: payPaket.etmen,
            beceriler: payPaket.beceriler.length
              ? payPaket.beceriler.map((b) => (b.çözüldü ? "" : "⚠️") + b.kod)
              : undefined,
          });
        });
    } else {
      const prompt = no === 0 ? promptUret(paket) + tasarimEk : yamaPrompt(paket, sonBulgular);
      üreticiÇıktı = etmenÇağır({
        adımKod: paket.adimKod, rol: "üretici", prompt, etmen: paket.etmen,
        beceriler: paket.beceriler.length
          ? paket.beceriler.map((b) => (b.çözüldü ? "" : "⚠️") + b.kod)   // HALKA-ORK-A04: ateşlenen beceriler trace'e
          : undefined,
      });
    }
    const üreticiIhlaller = sozlesmeDenetle(ciktiSema, üreticiÇıktı);

    // ② Denetçi (AŞ-4/8) — İZOLE: yalnız üretici ÇIKTISI geçer (ORK-6.1). 0 bulguda bile ateşler.
    //    A32: çok-Etmen'de bu, BİRLEŞİK çıktıdır — denetçi payları tek üretim olarak görür.
    //    TAS-D01: checklist maddeleri verildiyse denetçi MADDE MADDE moduna geçer
    //    (bütünsel yargı yasak); verilmediyse birebir eski prompt (geriye-uyumlu).
    const denetçiÇıktı = etmenÇağır({
      adımKod: paket.adimKod, rol: "denetçi",
      prompt: seç.checklistMaddeler?.length
        ? denetciChecklistPrompt(üreticiÇıktı, seç.checklistMaddeler)
        : denetciPrompt(üreticiÇıktı),
      denetlenecek: üreticiÇıktı,
    });

    // ③a Denetçi bulguları — A30 · DEBATE (opt-in): üretici savunur, hakem hükme bağlar.
    //    YALNIZ denetçi bulguları müzakere edilir — şema-ihlali/YAS-4.1/RBAC sentetikleri
    //    ŞEF kuralıdır, pazarlık edilmez. itiraz-haklı → bulgu düşer (iz muzakereler'de).
    let denetciBulgular = bulgulariCikar(denetçiÇıktı);
    let muzakereler: MuzakereSonuç[] | undefined;
    const muzakereIhlalleri: Bulgu[] = [];
    if (seç.muzakere && denetciBulgular.length) {
      const m = seç.muzakere;
      muzakereler = denetciBulgular.map((b) => muzakereEt(b, m.savun, m.hakem, m.maxTur));
      // SZL-MÜZAKERE dogfood: şema mek_sef.sar'dan OKUNUR — her tur sözleşmeye vurulur.
      if (m.sema) {
        for (const mz of muzakereler) {
          for (const tur of mz.turlar) {
            for (const ih of sozlesmeDenetle(m.sema, tur as unknown as Record<string, unknown>)) {
              muzakereIhlalleri.push({ mesaj: `SZL-MÜZAKERE ihlali: ${ih.mesaj}` });
            }
          }
        }
      }
      const düşen = new Set(muzakereler.filter((x) => x.hüküm === "itiraz-haklı").map((x) => x.bulgu));
      denetciBulgular = denetciBulgular.filter((b) => !düşen.has(b.mesaj));
      if (muzakereler.some((x) => x.limitAşıldı)) muzakereEskalasyonu = true;
    }
    // kanıt-ekseni turu (B4) · STR-4 v1: kanıt disiplini ÖLÇÜMÜ — kanıtsız denetçi bulgusu
    // DÜŞÜRÜLMEZ (sayılmaya devam eder, mevcut davranış kırılmaz) ama oranı sayılır;
    // 'kanıtsız GEÇTİ' reddedilirken (kanitVar) 'kanıtsız KALDI'nın serbestliği artık
    // görünürdür. Sentetik bulgular (şema/YAS-4.1/RBAC) ŞEF kuralıdır, ölçüme girmez.
    kanitToplam += denetciBulgular.length;
    kanitsizSayisi += denetciBulgular.filter((b) => !b.kanıt).length;

    // ③b Bulgular = (müzakere-sonrası) denetçi bulguları + üretici şema-ihlalleri + müzakere-şema ihlalleri
    const bulgular: Bulgu[] = [
      ...denetciBulgular,
      ...üreticiIhlaller.map((ih) => ({ mesaj: `sözleşme ihlali (üretici): ${ih.mesaj}` })),
      ...muzakereIhlalleri,
    ];
    // ④ Sahte-yeşil (YAS-4.1): temiz görünüyor ama ne beyan-tutarlı iddia ne SİCİL kanıtı
    //    var → reddet (Sol teftişi). kanıt-ekseni turu ayrımı: beyanTutarli = zayıf kabul-yolu
    //    süzgeci (mühür VEREMEZ) · sicildeKanitVar = mekanik kanıt (VERIFIED'ın tek kaynağı).
    if (bulgular.length === 0 && !beyanTutarli(denetçiÇıktı, üreticiÇıktı) && !sicildeKanitVar(denetçiÇıktı, üreticiÇıktı)) {
      bulgular.push({ mesaj: "sahte-yeşil: denetçi davranışsal kanıt sunmadı ya da kanıt üretilen bir dosyayı göstermiyor (file:line ∈ üretilenDosyalar şart) — VARLIK≠DOĞRULUK" });
    }
    // ④b RBAC (D.1): denetçi üretim taşıyamaz (yönetici/denetçi üretmez, yargılar — kural 2 ruhu)
    if (Array.isArray(denetçiÇıktı.üretilenDosyalar) && denetçiÇıktı.üretilenDosyalar.length > 0) {
      bulgular.push({ mesaj: "RBAC: denetçi çıktısı 'üretilenDosyalar' taşıyamaz — denetçi üretmez" });
    }

    const durum: DonguIterasyon["durum"] = bulgular.length === 0 ? "RESOLVED" : no === 0 ? "GAP" : "NOT-RESOLVED";
    iterasyonlar.push({ no, üreticiÇıktı, üreticiIhlaller, denetçiÇıktı, bulgular, durum, muzakereler });
    sonÜretici = üreticiÇıktı; sonDenetçi = denetçiÇıktı; sonBulgular = bulgular;

    if (muzakereEskalasyonu) { karar = "eskalasyon"; break; }   // A30: tur limiti doldu — sessiz kabule düşülmez
    if (bulgular.length === 0) { karar = "kabul"; break; }   // RESOLVED — kanıtlı + bulgusuz

    // ── Güvenli sınırlar (WF-ORCH + WF-ROLLBACK) ──
    // 2-hata → eskale: üretici iki ard-arda şema-uyumlu çıktı bile üretemiyorsa
    ardArdaHata = üreticiIhlaller.length > 0 ? ardArdaHata + 1 : 0;
    if (ardArdaHata >= 2) { karar = "eskalasyon"; break; }
    // aynı-yöntem-yasak: üretici hiçbir şeyi değiştirmedi (kısır döngü)
    const imza = yontemImzasi(üreticiÇıktı);
    if (imza === öncekiImza) { karar = "eskalasyon"; break; }
    öncekiImza = imza;
    // aksi halde sonraki iterasyona (yama) — max'a ulaşırsa karar 'eskalasyon' kalır
  }

  // ── Güvenlik halkası (HALKA-GUV-A03 · opt-in): üretici→denetçi→GÜVENLİK ──
  //    Kabul edilen üretim, mühürden ÖNCE savunma-taramasından geçer. CİDDİ bulgu
  //    (injection/authz/secret + kanıt) = karar red → BLOCKED; gerisi ertelenene
  //    (STR-2.1 → Hatırlatıcı) düşer. STR-3: tarama İSKELETİ açık, tehdit-zekâsı etmende.
  let guvenlikBulgular: GuvenlikBulgu[] | undefined;
  // ── AŞ-6 · TEST ÜRETİMİ (A35 · opt-in) — kod KABULÜNDEN sonra testler AYRI üretilir.
  //    Üretici koddan bağımsız test-üretim çağrısı yapar (AŞ-2 test stratejisi + edge'ler
  //    köprü). Test üretilmezse testEksik → VERIFIED düşer (aşağıda mühür) + GAP ertelenenlere:
  //    kanıt yoksa yeşil değil (VARLIK≠DOĞRULUK). Kapalıysa akış birebir eski.
  let testler: EtmenÇıktı | undefined;
  let testEksik = false;
  if (seç.testAsamasi && karar === "kabul" && sonÜretici) {
    testler = etmenÇağır({
      adımKod: paket.adimKod, rol: "üretici",
      prompt: testPrompt(paket, sonÜretici, tasarim), etmen: paket.etmen,
    });
    testEksik = testDosyalariCikar(testler).length === 0;
  }

  const guvenlikErtelenen: string[] = [];
  if (seç.guvenlikAktif && karar === "kabul" && sonÜretici) {
    const guvProfil = profiller["güvenlik"] ?? VARSAYILAN_ROL_PROFIL["güvenlik"];
    const guvIhlal = rbacÇağrıDenetle("güvenlik", guvProfil);
    if (guvIhlal.length) {
      karar = "red";
      sonBulgular = [...sonBulgular, ...guvIhlal.map((i) => ({ mesaj: `RBAC (${i.kural}): ${i.mesaj}` }))];
    } else {
      const guvÇıktı = etmenÇağır({
        adımKod: paket.adimKod, rol: "güvenlik",
        prompt: guvenlikPrompt(sonÜretici), denetlenecek: sonÜretici,   // izole: yalnız üretici ÇIKTISI
      });
      guvenlikBulgular = guvenlikBulgulariCikar(guvÇıktı);
      const ciddiler = guvenlikBulgular.filter(ciddiMi);
      if (ciddiler.length) {
        karar = "red";   // ciddi bulgu = BLOCKED (aşağıda mühür karardan türer)
        sonBulgular = [...sonBulgular, ...ciddiler.map((b) => ({ mesaj: `🛡️ CİDDİ (${b.kategori}): ${b.mesaj}`, kanıt: b.kanıt }))];
      }
      for (const b of guvenlikBulgular.filter((x) => !ciddiMi(x))) {
        guvenlikErtelenen.push(`🛡️ güvenlik (${b.kategori ?? "diğer"}): ${b.mesaj}`);
      }
    }
  }

  // ── AŞ-10 · SON KONTROL (A36 · opt-in) — TÜM aşamalardan sonra kapanış denetçi yargısı.
  //    İZOLE denetçi: kabul karşılandı mı · dokunulmaz'a dokunuldu mu (HAYIR) · tutarlı mı.
  //    Başarısız kontrol (kırılganNoktalar dolu) → karar RED → mühür BLOCKED. Kapalı=eski.
  let sonKontrol: EtmenÇıktı | undefined;
  if (seç.sonKontrolAsamasi && karar === "kabul" && sonÜretici) {
    sonKontrol = etmenÇağır({
      adımKod: paket.adimKod, rol: "denetçi",
      prompt: sonKontrolPrompt(paket, sonÜretici), denetlenecek: sonÜretici,   // izole: yalnız üretici ÇIKTISI
    });
    const sonBulg = bulgulariCikar(sonKontrol);
    kanitToplam += sonBulg.length;   // kanıt-ekseni turu: AŞ-10 da denetçi yargısıdır — aynı disiplin ölçülür
    kanitsizSayisi += sonBulg.filter((b) => !b.kanıt).length;
    if (sonBulg.length) {
      karar = "red";
      sonBulgular = [...sonBulgular, ...sonBulg.map((b) => ({ mesaj: `✅ AŞ-10 son kontrol: ${b.mesaj}`, kanıt: b.kanıt }))];
    }
  }

  // ── Karar + mühür (A05) ──
  const gerekçe = gerekceKur(paket.adimKod, karar, sonBulgular, sonDenetçi);
  const kabul = kabulGate(gerekçe, gerekceSema);
  const denetçiOnayı = sonDenetçi?.rol === "denetçi";
  // kanıt-ekseni turu (B1): VERIFIED'ın TEK kanıt kaynağı koşum SİCİLİ (sicildeKanitVar) —
  // testSonucu BEYANI değil. Beyan-beyan uzlaşması (aynı modelin iki rolde aynı
  // string üzerinde anlaşması) en çok COMPLETED üretir.
  const kanıtlıSon = sonDenetçi && sonÜretici ? sicildeKanitVar(sonDenetçi, sonÜretici) : false;
  const denetçiL5 = denetçiProfil.yetki === "L5";   // D.1: VERIFIED yalnız L5-denetçi (ön-denetim garantiler)
  // VERIFIED mührünü YALNIZ L5-denetçi + SİCİL kanıtı koyar; üretici tek başına en çok COMPLETED.
  // A35: AŞ-6 test üretilemedi (testEksik) → VERIFIED DÜŞER (kanıt yok = yeşil değil).
  // kanıt-ekseni turu (B7): kabulGate artık TÜKETİLİR — SZL-GEREKCE şema ihlali taşıyan gerekçe
  // VERIFIED üretemez (kabul.geçti = ihlalsiz + karar-kabul). Güven eşiği (SZL-ETMEN-CIKTI
  // `güven: 0..1`) mühre GEREKÇELİ olarak BAĞLANMAZ: güven etmenin ÖZ-BEYANIDIR; mühür
  // kanıttan türer (kanıt-ekseni turu sicil ilkesi, YAS-4.1 varlık≠doğruluk) — beyan-temelli eşik,
  // sicil kapısının kapattığı "bedava yeşil"i yan kapıdan geri getirir.
  const mühür: DonguSonuç["mühür"] =
    karar === "kabul" && kabul.geçti && denetçiOnayı && kanıtlıSon && denetçiL5 && !testEksik ? "VERIFIED"
      : karar === "kabul" ? "COMPLETED"
        : "BLOCKED";
  const ertelenenler = Array.isArray(gerekçe.ertelenenler) ? (gerekçe.ertelenenler as string[]) : [];
  const testErtelenen = testEksik
    ? ["AŞ-6 test üretilemedi — VERIFIED düştü (kanıt yok · VARLIK≠DOĞRULUK)"]
    : [];
  // kanıt-ekseni turu: şema ihlali mührü düşürdüyse iz bırak (sessiz düşüş yasak — KRR-MUT-3 ruhu).
  const semaErtelenen = karar === "kabul" && !kabul.geçti
    ? [`SZL-GEREKCE şema ihlali (${kabul.ihlaller.length}) — VERIFIED düştü: ${kabul.ihlaller.map((i) => `${i.alan}/${i.tür}`).join(" · ")}`]
    : [];

  // ②/③ sonra/hata-hook'lar — karar SONRASI ateşlenir (BEST-EFFORT · raporlanır, bloklamaz).
  //     mühür=BLOCKED → hata-hook (kurtarma-noktası); aksi → sonra-hook (kabul-sonrası iş).
  kancaSonuçları.push(...kancaAteşle(mühür === "BLOCKED" ? "hata" : "sonra", mühür));

  return {
    adımKod: paket.adimKod,
    // kanıt-ekseni turu: eski `kabul.karar ?? karar` fallback'i DÖNGÜSEL okumaydı — gerekceKur
    // karar'ı gerekçeye kendisi yazar, kabulGate aynı değeri geri okur; fallback hiç
    // tetiklenemezdi. Doğrudan karar döner (kabulGate'in gerçek tüketimi mühürdedir).
    karar,
    kabulDurumu: kabul.durum,
    mühür,
    iterasyonlar,
    gerekçe,
    ertelenenler: [...ertelenenler, ...guvenlikErtelenen, ...testErtelenen, ...semaErtelenen],
    kancaSonuçları: kancaSonuçları.length ? kancaSonuçları : undefined,
    guvenlikBulgular,
    kanitDisiplini: kanitToplam > 0 ? { kanitsiz: kanitsizSayisi, toplam: kanitToplam } : undefined,
    tasarim,
    testler,
    sonKontrol,
  };
}

// ── A31 · KURTARMALI DÖNGÜ (BLOCKED → yeniden-dene | böl | eskale) ────────────

export interface KurtarmaSeçenek {
  /** GİZLİ enjekte (STR-3); verilmezse demo basit sıra (muzakere.basitKurtarma). */
  strateji?: KurtarmaStratejisi;
  /** azami kurtarma çevrimi (yeniden-dene zinciri sonsuz dönmesin — güvenli sınır). */
  maxDeneme?: number;
}

/**
 * BLOCKED-sonrası kurtarma halkası: donguÇalıştır'ı sarar. Mühür
 * BLOCKED değilse sonuç AYNEN döner (regresyon yok). BLOCKED'da strateji yolu seçer:
 *   yeniden-dene → yeni çevrim (aynı-yöntem-yasak iç döngüde zaten korunur);
 *   böl          → yalnız ÖNERİ (dosya YAZILMAZ — motor öneriyi üretir, kararı insan ya da ajan verir);
 *   eskale       → Hatırlatıcı metni + insan kararı (STR-2.1) — ertelenenlere düşer.
 * Karar 'kurtarma' olur, kurtarma kararı sonuçta + durakta taşınır (kontrol noktası dahil).
 */
export function donguKurtarmali(
  paket: BaglamPaket,
  ciktiSema: Map<string, AlanSema>,
  gerekceSema: Map<string, AlanSema>,
  etmenÇağır: EtmenÇağır,
  seç: DonguSeçenek = {},
  kurtarmaSeç: KurtarmaSeçenek = {},
): DonguSonuç {
  const maxDeneme = kurtarmaSeç.maxDeneme ?? 3;
  let sonuç = donguÇalıştır(paket, ciktiSema, gerekceSema, etmenÇağır, seç);
  for (let deneme = 1; deneme <= maxDeneme; deneme++) {
    if (sonuç.mühür !== "BLOCKED") return sonuç;
    const karar = kurtar(paket.adimKod, deneme, sonuç.iterasyonlar.at(-1)?.bulgular ?? [], kurtarmaSeç.strateji);
    if (karar.yol === "yeniden-dene") {
      // yeni çevrim — kurtarma izi bir sonraki sonuca da taşınır ki iz kaybolmasın
      sonuç = donguÇalıştır(paket, ciktiSema, gerekceSema, etmenÇağır, seç);
      sonuç.kurtarma = karar;
      continue;
    }
    // böl/eskale: koşu burada durur — karar sahibine (insan/üst katman) devredilir.
    return {
      ...sonuç,
      karar: "kurtarma",
      kurtarma: karar,
      ertelenenler: [
        ...sonuç.ertelenenler,
        ...(karar.yol === "eskale" && karar.hatırlatıcı ? [karar.hatırlatıcı] : []),
        ...(karar.yol === "böl" ? (karar.bölmeÖnerisi ?? []) : []),
      ],
    };
  }
  return sonuç;
}

// ── KONTROL NOKTASI (D.3 · saf serileştirme + etkili dosya I/O ayrık) ──────────────

/** Bir çok-adımlı akışın kalıcı durumu — kontrol noktasına serileşen gövde. */
export interface KontrolNoktasiDurum {
  akış: string[];            // adım kodları sırası (akış kimliği)
  tamamlanan: DurakÖzet[];   // kabul edilmiş Adımların durakları (sırayla)
}

/** Kontrol noktası durumunu JSON'a serileştirir (saf · round-trip kontrolNoktasiOku ile). */
export function kontrolNoktasiYaz(durum: KontrolNoktasiDurum): string {
  return JSON.stringify(durum, null, 2);
}

/** JSON'dan kontrol noktası durumunu okur (saf · biçim bozuksa boş-akış döndürür). */
export function kontrolNoktasiOku(json: string): KontrolNoktasiDurum {
  try {
    const h = JSON.parse(json) as Partial<KontrolNoktasiDurum>;
    const akış = Array.isArray(h.akış) ? h.akış.map(String) : [];
    const tamamlanan = Array.isArray(h.tamamlanan) ? (h.tamamlanan as DurakÖzet[]) : [];
    return { akış, tamamlanan };
  } catch {
    return { akış: [], tamamlanan: [] };
  }
}

// ── ETKİLİ CLI KABUĞU ───────────────────────────────────────────────────────

const ETMEN_CIKTI_KOD = "SZL-ETMEN-CIKTI";
const GEREKCE_KOD = "SZL-GEREKCE";

/**
 * İki dizinin program haritalarını birleştirir (A26 · SAF · SEF-DONGU-SOZLESME-YOL):
 * `dizin` = graf/Adım kaynağı (ör. _KapaliUrun) · `sozlesmeDizin` = ŞEF sözleşme kaynağı
 * (SZL-ETMEN-CIKTI/SZL-GEREKCE · ör. _Sarmal). Cross-entity döngü/hook bunu gerektirir
 * (STR-3: sözleşmeler _Sarmal'da yaşar). Aynı dosya-adı çakışırsa sözleşme-kaynağı «sözleşme»/
 * önekiyle korunur (graf kaynağı öncelikli). KOD-tabanlı arama tüm programları gezer.
 * `sozlesmeDizin` yoksa/eşitse tek harita döner (mevcut davranış birebir · geriye-uyumlu).
 */
export function programlariTopla(dizin: string, sozlesmeDizin?: string): ReadonlyMap<string, Program> {
  const ana = programHaritasi(dizin);
  if (!sozlesmeDizin || sozlesmeDizin === dizin) return ana;
  const birlesik = new Map<string, Program>(ana);
  for (const [k, v] of programHaritasi(sozlesmeDizin)) {
    birlesik.set(birlesik.has(k) ? `«sözleşme»/${k}` : k, v);
  }
  return birlesik;
}

/**
 * `sarmal sef-dongu <ADIM-KOD> [dizin]` — bir Adım için izole üret→denetle→yama
 * döngüsünü koşar (enjekte `etmenÇağır` ile) ve karar+mühür raporu basar.
 */
/** TAKILABİLİR geri-yazım kancası (STR-4 · EtmenÇağır deseni): koşu bitince kararı
 *  plana yazar. dongu → koniYaz importu YOK (döngüsel-import kalkanı) — sarmal.ts bağlar. */
export type SonYaz = (adımKod: string, sonuç: DonguSonuç) => void;

/** Bir Adım'ı barındıran program etiketini bulur (geri-yazım hedef dosyası; «sözleşme»/ atlanır). */
export function adimEtiketiBul(programlar: ReadonlyMap<string, Program>, adımKod: string): string | undefined {
  for (const [etiket, p] of programlar) {
    if (etiket.startsWith("«sözleşme»/")) continue;
    let bulundu = false;
    const gez = (d: { tur: string; ad: string; parametreler: Array<{ ad: string; deger: { metin?: string } }>; cocuklar: unknown[] }): void => {
      if (bulundu) return;
      if (d.tur === "widget" && d.ad === "Adım" &&
          d.parametreler.find((x) => x.ad === "kod")?.deger.metin === adımKod) { bulundu = true; return; }
      for (const c of d.cocuklar as typeof d[]) gez(c);
    };
    for (const b of p.bildirimler) gez(b as never);
    if (bulundu) return etiket;
  }
  return undefined;
}

/** TAKILABİLİR kontrol-noktası deposu (kanıt-ekseni turu · SonYaz/EtmenÇağır deseni): dongu.ts'e
 *  `node:fs` GİRMEZ — disk I/O'yu kabuk (sarmal.ts) enjekte eder. Verilmezse kontrol
 *  noktası KAPALI (akış her koşuda baştan — sessiz kayıp yok, tek tüketici sarmal.ts verir). */
export interface KontrolNoktasiDeposu {
  oku: (yol: string) => string | undefined;   // yoksa undefined (dosya-yok = temiz başlangıç)
  yaz: (yol: string, içerik: string) => void;
}

/** Kabuk ek seçenekleri (Dalga 3): güvenlik halkası + canlı durum-yayını başlangıcı. */
export interface KomutEk {
  guvenlikAktif?: boolean;                    // HALKA-GUV-A03 · --guvenlik
  onBasla?: (adımKod: string) => void;        // HALKA-IZLE-A02 · koşu başında durum: geliştirmede
  knDeposu?: KontrolNoktasiDeposu;            // kanıt-ekseni turu · sef-akis kontrol noktası I/O'su (enjekte)
}

export function sefDonguKomutu(dizin: string, adımKod: string, etmenÇağır: EtmenÇağır, sozlesmeDizin?: string, sonYaz?: SonYaz, ek?: KomutEk): number {
  const programlar = programlariTopla(dizin, sozlesmeDizin);
  const paket = baglamMontajla(programlar, adımKod);
  if (!paket) {
    console.error(`✖ '${adımKod}' kodlu Adım bulunamadı (${programlar.size} .sar tarandı). Kodu doğrula (sarmal gezin ${adımKod}) ya da doğru çalışma dizinini ver — açık Adımlar denetle çıktısının motor-susmaz listesindedir.`);
    return 4;
  }
  const ciktiNode = sozlesmeBul(programlar, ETMEN_CIKTI_KOD);
  const gerekceNode = sozlesmeBul(programlar, GEREKCE_KOD);
  if (!ciktiNode || !gerekceNode) {
    console.error(`✖ ŞEF sözleşmeleri bulunamadı (${ETMEN_CIKTI_KOD} / ${GEREKCE_KOD}) — mek_sef.sar dizinde mi?`);
    return 4;
  }
  // HALKA-ORK-A04: kayıp beceri = uyarı (beyan edilen ama çözülemeyen beceri sessiz kalamaz)
  for (const b of paket.beceriler.filter((x) => !x.çözüldü)) {
    console.warn(`⚠️ kayıp beceri: '${b.kod}' beyan edilmiş ama hiçbir .sar'da çözülemedi — koni eksik gidiyor (HALKA-ORK-A04).`);
  }
  ek?.onBasla?.(adımKod);   // IZLE-A02: panel koşuyu ANLIK görür (durum: geliştirmede)
  // A32: birden çok atanan Etmen → pay-başına paket (her pay kendi koni+beceri bağlamıyla).
  const etmenler = atananEtmenler(programlar, adımKod);
  const payPaketleri = etmenler.length > 1
    ? etmenler.map((e) => baglamMontajla(programlar, adımKod, undefined, e.kod)).filter((p): p is BaglamPaket => !!p)
    : [];
  if (payPaketleri.length > 1) {
    console.log(`👥 çok-Etmen üretim (A32): ${etmenler.map((e) => e.kod).join(" → ")} — paylar sıralı, denetçi birleşik çıktıyı görür.`);
  }
  const sonuç = donguÇalıştır(paket, sozlesmeSema(ciktiNode), sozlesmeSema(gerekceNode), etmenÇağır, {
    kancaÇağır: demoKancaYap(),   // K9 · A25 · demo hook-yürütücü (mekanizmayı görünür kılar)
    guvenlikAktif: ek?.guvenlikAktif,
    cokEtmen: payPaketleri.length > 1 ? { paketler: payPaketleri } : undefined,
  });
  raporBas(sonuç);
  sonYaz?.(adımKod, sonuç);   // STR-4: karar plana geri yazılır (yalnız --yaz enjekte ederse)
  // YAS-4.2 (kanıt-ekseni turu · B3): çıkış kodu KARARA değil MÜHRE bağlıdır — COMPLETED artık
  // exit 0 veremez (CI, kanıtsız teslimi yeşil göremez): VERIFIED→0 · COMPLETED
  // (doğrulanmamış)→3 · BLOCKED/red→4.
  return sonuç.mühür === "VERIFIED" ? 0 : sonuç.mühür === "COMPLETED" ? 3 : 4;
}

const KONTROL_NOKTASI_DIR = ".sarmal/kontrol_noktasi";

/** Akış kimliğinden deterministik kontrol noktası dosya yolu (adım dizisi = kimlik). */
function kontrolNoktasiYolu(dizin: string, adımKodları: string[]): string {
  const ad = adımKodları.join("-").replace(/[^A-Za-z0-9_-]/g, "_");
  return join(dizin, KONTROL_NOKTASI_DIR, `${ad}.json`);
}

/**
 * `sarmal sef-akis <ADIM1> <ADIM2> ... [dizin]` — çok-adımlı ŞEF zinciri (D.3).
 * Her Adım izole döngüde koşar; kararı sonraki Adım'ın `öncekiDurak` bağlamına akar (handoff).
 * Durum kontrol noktasına serileşir; yeniden koşulursa kabul edilmiş Adımlar atlanır (kaldığı yerden).
 * Yan etki (kontrol-noktası I/O'su) ENJEKTE `ek.knDeposu` üzerinden — kanıt-ekseni turu: dongu.ts
 * `node:fs`siz kalır; depo verilmezse kontrol noktası kapalıdır (her koşu baştan).
 */
export function sefAkisKomutu(dizin: string, adımKodları: string[], etmenÇağır: EtmenÇağır, sozlesmeDizin?: string, sonYaz?: SonYaz, ek?: KomutEk): number {
  if (adımKodları.length === 0) {
    console.error("✖ sef-akis: en az bir Adım KOD'u gerekir.");
    return 4;
  }
  const programlar = programlariTopla(dizin, sozlesmeDizin);
  const ciktiNode = sozlesmeBul(programlar, ETMEN_CIKTI_KOD);
  const gerekceNode = sozlesmeBul(programlar, GEREKCE_KOD);
  if (!ciktiNode || !gerekceNode) {
    console.error(`✖ ŞEF sözleşmeleri bulunamadı (${ETMEN_CIKTI_KOD} / ${GEREKCE_KOD}) — mek_sef.sar dizinde mi?`);
    return 4;
  }
  const ciktiSema = sozlesmeSema(ciktiNode);
  const gerekceSema = sozlesmeSema(gerekceNode);

  // kontrol noktasından devam (varsa): kabul edilmiş Adımları atla.
  // kanıt-ekseni turu: disk I/O enjekte depo üzerinden — dongu.ts diske DOKUNMAZ.
  const knYol = kontrolNoktasiYolu(dizin, adımKodları);
  const knİçerik = ek?.knDeposu?.oku(knYol);
  let durum: KontrolNoktasiDurum = knİçerik !== undefined
    ? kontrolNoktasiOku(knİçerik)
    : { akış: adımKodları, tamamlanan: [] };
  // Akış değiştiyse (farklı adım dizisi) kontrol noktasını sıfırla — yanlış devralma önlenir.
  if (durum.akış.join("-") !== adımKodları.join("-")) durum = { akış: adımKodları, tamamlanan: [] };

  const başla = durum.tamamlanan.length;
  if (başla > 0) console.log(`↻ Kontrol noktası bulundu — ilk ${başla} Adım atlanıyor (${knYol}).`);
  console.log(`═══ ŞEF AKIŞI (${adımKodları.length} Adım) ═══`);

  for (let i = başla; i < adımKodları.length; i++) {
    const adımKod = adımKodları[i];
    const öncekiDurak = durum.tamamlanan.length ? durum.tamamlanan[durum.tamamlanan.length - 1] : undefined;
    const paket = baglamMontajla(programlar, adımKod, öncekiDurak);
    if (!paket) {
      console.error(`✖ '${adımKod}' kodlu Adım bulunamadı — akış durdu (Adım ${i + 1}/${adımKodları.length}).`);
      return 4;
    }
    ek?.onBasla?.(adımKod);   // IZLE-A02: her durakta panel koşuyu anlık görür
    const sonuç = donguÇalıştır(paket, ciktiSema, gerekceSema, etmenÇağır, {
      kancaÇağır: demoKancaYap(), guvenlikAktif: ek?.guvenlikAktif,
    });
    raporBas(sonuç);
    sonYaz?.(adımKod, sonuç);   // STR-4: her durağın kararı plana yazılır (--yaz)
    if (sonuç.karar !== "kabul") {
      console.log(`\n⛔ Akış '${adımKod}' (${i + 1}/${adımKodları.length}) '${sonuç.karar}' ile durdu — kontrol noktası korunuyor, düzeltip yeniden koşun.`);
      return 4;
    }
    durum.tamamlanan.push(durakOzetle(sonuç));
    // Kontrol noktası yaz (kabul edilen her Adım sonrası; kesinti-kurtarma).
    // Etki enjekte depoda (kanıt-ekseni turu) — depo yoksa kontrol noktası tutulmaz.
    ek?.knDeposu?.yaz(knYol, kontrolNoktasiYaz(durum));
  }

  console.log(`\n✅ AKIŞ TAMAM — ${adımKodları.length}/${adımKodları.length} Adım kabul. Duraklar: ${durum.tamamlanan.map((d) => `${d.adım}(${d.mühür})`).join(" → ")}`);
  return 0;
}

/** Döngü sonucunu insan-okur rapora döker. */
function raporBas(s: DonguSonuç): void {
  console.log(`── ŞEF DÖNGÜSÜ → ${s.adımKod} ──`);
  for (const it of s.iterasyonlar) {
    const rol = `üretici✎ → denetçi🕵️`;
    console.log(`  iter ${it.no}: ${rol} · ${it.durum}${it.bulgular.length ? ` · ${it.bulgular.length} bulgu` : ""}`);
    for (const b of it.bulgular) {
      const kanıtEk = b.kanıt && !b.mesaj.includes(b.kanıt) ? ` (${b.kanıt})` : "";
      console.log(`      • ${b.mesaj}${kanıtEk}`);
    }
  }
  if (s.kancaSonuçları?.length) {
    console.log(`🪝 Kanca ateşlemeleri (${s.kancaSonuçları.length}):`);
    for (const k of s.kancaSonuçları) {
      const im = k.durum === "tamam" ? "✓" : k.durum === "hata" ? "✖" : "·";
      console.log(`   ${im} [${k.evre}] ${k.kod}${k.mesaj ? ` — ${k.mesaj}` : ""}`);
    }
  }
  if (s.guvenlikBulgular) {
    const ciddi = s.guvenlikBulgular.filter(ciddiMi).length;
    console.log(`🛡️ Güvenlik halkası: ${s.guvenlikBulgular.length} bulgu (${ciddi} CİDDİ)${ciddi ? " → BLOCKED" : " — temiz"}`);
    for (const b of s.guvenlikBulgular) console.log(`   ${ciddiMi(b) ? "⛔" : "•"} [${b.kategori ?? "diğer"}] ${b.mesaj}${b.kanıt ? ` (${b.kanıt})` : ""}`);
  }
  // kanıt-ekseni turu · STR-4 v1 uyarı: kanıtsız denetçi bulgusu sayılmaya devam eder ama artık
  // görünür — oran, HATA'ya terfi kararının verisidir (kanıtsız GEÇTİ ↔ KALDI simetrisi).
  if (s.kanitDisiplini && s.kanitDisiplini.kanitsiz > 0) {
    console.log(`⚠️ kanıt disiplini: ${s.kanitDisiplini.kanitsiz}/${s.kanitDisiplini.toplam} denetçi bulgusu kanıtsız (file:line yok) — bulgular sayıldı, oran terfi verisi olarak ölçülüyor`);
  }
  const simge = s.mühür === "VERIFIED" ? "✅" : s.mühür === "COMPLETED" ? "🟡" : "⛔";
  console.log(`\n${simge} KARAR: ${s.karar} · kabulDurumu: ${s.kabulDurumu ?? "—"} · mühür: ${s.mühür} · ${s.iterasyonlar.length} iterasyon`);
  if (s.ertelenenler.length) console.log(`⏭️  ertelenen (sahiplenmek için Hatırlatıcıya geçer): ${s.ertelenenler.join(" · ")}`);
}

/**
 * Demo-stub hook-yürütücü (KURU-ÇALIŞTIRMA — gerçek hook-politikası _KapaliUrun'ta GİZLİ, STR-3).
 * Mekanizmayı GÖRÜNÜR kılar: her evre'de 'tamam' döner (mutlu yol — geçit açık, döngü akar).
 * FAIL-CLOSED önce-hata yolu birim-testlerde kanıtlanır (demo'da bloklamaz — CLI koşulabilir kalsın).
 */
export function demoKancaYap(): KancaÇağır {
  return (kanca) => ({
    kod: kanca.kod, evre: kanca.evre, durum: "tamam",
    mesaj: `${kanca.evre}-hook çalıştı (demo · ${kanca.ne || kanca.kod})`,
  });
}

/**
 * Demo-stub etmen (KURU-ÇALIŞTIRMA — gerçek üretim politikası _KapaliUrun'ta GİZLİ, STR-3).
 * Döngü mekanizmasını GÖRÜNÜR kılar: iter-0 kanıtsız → denetçi GAP → iter-1 kanıtlı → kabul.
 * kanıt-ekseni turu: mühür COMPLETED kalır — demo SİCİLSİZDİR ve sicil UYDURMAZ (uydursaydı,
 * kapattığımız sahteciliğin ta kendisi olurdu); VERIFIED yalnız gerçek köprü sicilinden.
 */
export function demoEtmenYap(): EtmenÇağır {
  let üretimNo = 0;
  return (çağrı) => {
    if (çağrı.rol === "üretici") {
      üretimNo++;
      const ilk = üretimNo === 1;
      return {
        adım: çağrı.adımKod, etmen: "DEMO-URETICI", rol: "üretici",
        güven: ilk ? 0.6 : 0.9,
        gerekçe: ilk ? "ilk taslak — testsiz" : "yama: davranışsal test eklendi",
        üretilenDosyalar: ilk ? ["taslak.ts"] : ["taslak.ts", "taslak.test.ts"],
        testSonucu: ilk ? "kaldı — test yok" : "geçti — kapsam tam",
        kırılganNoktalar: [],
      };
    }
    // güvenlik (HALKA-GUV · demo): üç kategoriyi tarar, temiz raporu döner (savunma iskeleti).
    if (çağrı.rol === "güvenlik") {
      return {
        adım: çağrı.adımKod, etmen: "DEMO-GUVENLIK", rol: "güvenlik",
        güven: 0.9,
        gerekçe: "savunma taraması (demo): üç kategori tarandı, senaryo bulunamadı",
        bulgular: [],
        kategoriRaporu: { injection: "temiz — girdi yüzeyi yok (demo)", authz: "temiz — yetki yüzeyi yok (demo)", secret: "temiz — sır kullanımı yok (demo)" },
        testSonucu: "geçti — güvenlik taraması temiz (demo)",
        kırılganNoktalar: [],
      };
    }
    // denetçi: üreticinin ÇIKTISINA bakar (izole) — "geçti" + kanıt varsa temiz onaylar
    const ür = çağrı.denetlenecek;
    const kanıtlı = typeof ür?.testSonucu === "string" && ür.testSonucu.startsWith("geçti");
    return {
      adım: çağrı.adımKod, etmen: "DEMO-DENETCI", rol: "denetçi",
      güven: kanıtlı ? 0.95 : 0.5,
      gerekçe: kanıtlı ? "davranışsal kanıt doğrulandı" : "kanıt eksik — sahte-yeşil riski",
      testSonucu: kanıtlı ? "geçti — davranışsal kanıt: taslak.test.ts:12" : "kaldı — kanıt sunulmadı",
      kırılganNoktalar: kanıtlı ? [] : ["davranışsal test/kanıt yok (taslak.ts:1)"],
    };
  };
}

// ── PARALEL AKIŞ (HALKA-ORK-A02 · orkestra katmanı) ──────────────────────────

/**
 * `sarmal sef-paralel <ADIM...>` — bağımsız Adımları eşzamanlı sürer: paralel
 * kümeler DAG'dan (Kahn seviyeleri) türetilir, seviye içi eşzamanlı (limitli),
 * seviyeler arası bariyer (öncül bitmeden ardıl başlamaz). Çekirdek döngü SAF
 * ve senkron kalır — paralellik yalnız bu kabukta. Bir Adım çökerse/reddedilirse
 * kardeşleri tamamlanır (allSettled ruhu); özet tabloda görünür.
 */
export async function sefParalelKomutu(
  dizin: string,
  adımKodları: string[],
  etmenÇağır: EtmenÇağır,
  sozlesmeDizin?: string,
  sonYaz?: SonYaz,
  ek?: KomutEk & { esZamanLimit?: number },
): Promise<number> {
  const programlar = programlariTopla(dizin, sozlesmeDizin);
  const ciktiNode = sozlesmeBul(programlar, ETMEN_CIKTI_KOD);
  const gerekceNode = sozlesmeBul(programlar, GEREKCE_KOD);
  if (!ciktiNode || !gerekceNode) {
    console.error(`✖ ŞEF sözleşmeleri bulunamadı (${ETMEN_CIKTI_KOD} / ${GEREKCE_KOD}) — mek_sef.sar dizinde mi?`);
    return 4;
  }
  const ciktiSema = sozlesmeSema(ciktiNode);
  const gerekceSema = sozlesmeSema(gerekceNode);
  const dag = dagKur(programlar);
  const kumeler = paralelKumeler(dag, adımKodları);
  console.log(`═══ ŞEF PARALEL (${adımKodları.length} Adım · ${kumeler.length} seviye · limit ${ek?.esZamanLimit ?? 4}) ═══`);
  kumeler.forEach((k, i) => console.log(`  seviye ${i}: ${k.join(" ∥ ")}`));

  const kayitlar = await paralelYurut(dag, adımKodları, async (adımKod) => {
    const paket = baglamMontajla(programlar, adımKod);
    // MDR-A03: üçlü tam — gözlem + gerekçe + düzeltme yolu (envanter R4 kapanışı).
    if (!paket) throw new Error(`'${adımKod}' kodlu Adım bulunamadı — verilen kod, taranan plan dosyalarındaki hiçbir Adım'la eşleşmiyor. Kodu doğrula (sarmal gezin ${adımKod}) ya da doğru çalışma dizinini ver.`);
    ek?.onBasla?.(adımKod);
    const sonuç = donguÇalıştır(paket, ciktiSema, gerekceSema, etmenÇağır, {
      kancaÇağır: demoKancaYap(), guvenlikAktif: ek?.guvenlikAktif,
    });
    raporBas(sonuç);
    sonYaz?.(adımKod, sonuç);
    return sonuç;
  }, { esZamanLimit: ek?.esZamanLimit });

  console.log(`\n═══ PARALEL ÖZET ═══`);
  let kirmizi = 0;
  for (const k of kayitlar) {
    const im = k.hata ? "✖" : k.sonuç?.karar === "kabul" ? "✅" : "⛔";
    if (k.hata || k.sonuç?.karar !== "kabul") kirmizi++;
    console.log(`  ${im} [sev ${k.seviye}] ${k.adımKod} · ${k.bitis - k.baslangic}ms${k.hata ? ` · HATA: ${k.hata}` : k.sonuç ? ` · ${k.sonuç.mühür}` : ""}`);
  }
  console.log(kirmizi ? `⛔ ${kirmizi}/${kayitlar.length} Adım kabul edilmedi.` : `✅ ${kayitlar.length}/${kayitlar.length} Adım kabul.`);
  return kirmizi ? 4 : 0;
}

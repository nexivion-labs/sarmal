// ═══════════════════════════════════════════════════════════════════════════
// sablon.ts — 📐 ŞABLON KÜTÜPHANESİ (tek kaynak · SABLON-KUTUPHANE-TOPARLAMA)
//
//   Kanonik `.sar` şablonları `ogreti/sablon/` altında GERÇEK dosyalar olarak
//   yaşar (insan gözle açar, düzenler, dogfood). `başla` üreteci — hem MCP hem
//   CLI — buradan okur; şablon metni İKİ yerde tutulmaz (YUZ-1.2 tek-kaynak).
//   Metadata (başlık + bekçi notu) burada; ŞABLON METNİ dosyada. Dağınıklık
//   biter: dil öğrenen tek yere bakar (Founder 2026-07-10 "hepsi dağınık").
// ═══════════════════════════════════════════════════════════════════════════

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { CiktiDili } from "./cevir.ts";

const SABLON_KOK = fileURLToPath(new URL("../../../ogreti/sablon/", import.meta.url));

/** Bir şablonun kimliği: dosya + başlık + doğrulayıcının o tipte yakaladığı bekçi. */
interface SablonKimlik {
  dosya: string;      // sablon/ altındaki dosya adı
  baslik: string;     // tek satır tanıtım
  bekci: string;      // yazınca `denetle`nin uyaracağı kapılar
}

/**
 * MGZ-A11 · İngilizce yüzün tek ilkesi: başlık ve bekçi notunun İngilizce hanesi.
 * Şablonun kendisi (.sar dosyası) her dilde aynı Türkçe kaynaktır; yalnız onu
 * tanıtan düzyazı çevrilir ve dosyadaki adları (tip, alan, tanı kimliği) aynen anar.
 */
const SABLON_INGILIZCE: Record<string, { baslik: string; bekci: string }> = {
  "proje": {
    baslik: "🌱 Proje BIRTH — <varlık>_anadizin.sar (the ROOT). ONE application. Technology first, then the plan with its axes.",
    bekci: "ana-yok (the entry file is required) · konisiz-adım (an Adım in geliştirmede must carry a cone). ⚖️ If there will later be several apps or shared auth → choose `çalışmaalanı` (the garden)." },
  "çalışmaalanı": {
    baslik: "🏡 ÇalışmaAlanı (GARDEN) BIRTH — a multi-application setup on a single identity base. Every Uygulama carries its own Teknoloji and binds to the shared base and identity with çağır.",
    bekci: "ana-yok · rafsız-anadizin · anadizin-plan-karışması. The long-term shape (the garden) decides the container — today's single app goes INSIDE it as an Uygulama." },
  "blok": {
    baslik: "🪵 Blok BIRTH — the plan body: Faz(time) → Blok(work) → Katman(technology, bound to a Takım; the technology escape only at the moment of birth) → Adım; a Blok lives only in a Faz body, the Faz is mandatory and every Faz is in its own prefix-numbered file under is/plan/faz/ (MIM-1.2); the mevsim field and the çağır list do not form a Blok binding.",
    bekci: "konisiz-adım — an Adım in durum: geliştirmede must carry a cone (görev·kabul·bağımlı)." },
  "adım": {
    baslik: "🎯 Adım BIRTH — CONE-filled (a bare Adım is blind drift; the player guesses).",
    bekci: "konisiz-adım — once it moves to durum: geliştirmede the cone is REQUIRED (görev/kabul/üretir/bağımlı/referans)." },
  "sözleşme": {
    baslik: "📜 Sözleşme BIRTH — the MEETING POINT (contract-first). Ekran and Uç derive from it.",
    bekci: "sözleşmesiz-uç — every Uç must bind to a Sözleşme. Write the Sözleşme FIRST." },
  "arkayüz": {
    baslik: "🔌 BACKEND BIRTH (`arkayüz`) — the backend leg: the Uç IMPLEMENTS the contract and declares its production place.",
    bekci: "sözleşmesiz-uç (Uç→Sözleşme) · production place (dosya: where the code lands — the artefact declares its own place)." },
  "ekran": {
    baslik: "🖼️ Ekran BIRTH — the Sözleşme comes FIRST; the Ekran and the Uç derive from that contract.",
    bekci: "öksüz-düğme · kavuşumsuz-ekran · sözleşmesiz-uç. Write the Sözleşme FIRST (contract-first)." },
  "beceri": {
    baslik: "🎓 Beceri BIRTH — a capability promoted from a lesson (a Yetenek plus stack Beceri pair).",
    bekci: "eksik-alan — a Beceri has 9 required fields: kod·sağlar·yığın·ne·neZaman·kurallar·örnek·antiDesen·uygular. ≤300 lines; an Adım binds it with kullanır:." },
  "etmen": {
    baslik: "🤖 Etmen BIRTH — 7 required fields (identity + capability + isolated memory + constitution).",
    bekci: "eksik-alan — an Etmen has 7 required fields: kod·tür·uzmanlık·yetki·bellek·ne·uygular. tür∈{apex,yönetici,uzman}." },
  "mekanizma": {
    baslik: "🔩 Mekanizma BIRTH — cross-cutting infrastructure is declared ONCE; an Adım takes a REFERENCE and does NOT CONTAIN it.",
    bekci: "faz is a free label · order between modules is the bağımlı DAG · if an Adım CONTAINS the mechanism, the single-declaration rule is broken." },
  "döngü": {
    baslik: "🔁 Döngü BIRTH — the home of repeating work: it turns with its tetik and STOPS on durunca or turLimiti.",
    bekci: "eksik-alan — durunca and/or turLimiti is REQUIRED (a loop without an exit cannot be written); the runner stops a no-progress loop early; every turn is written to the trace." },
};

// Doğuş sırasına göre (MIM-4 omurgası): kök → sözleşme → yüzey/arkayüz → etmen/mekanizma.
const SABLONLAR: Record<string, SablonKimlik> = {
  "proje": { dosya: "proje.sar",
    baslik: "🌱 PROJE DOĞUŞU — <varlık>_anadizin.sar (KÖK). TEK uygulama. Önce teknoloji, sonra eksenli plan.",
    bekci: "ana-yok (giriş dosyası şart) · konisiz-adım (geliştirmede Adım koni taşımalı). ⚖️ İleride çok-app/ortak-auth olacaksa → çalışmaalanı seç (bahçe)." },
  "çalışmaalanı": { dosya: "calisma_alani.sar",
    baslik: "🏡 ÇALIŞMAALANI (BAHÇE) DOĞUŞU — çok uygulamalı, tek kimlik tabanlı kurulum. Her Uygulama kendi Teknoloji'sini taşır; ortak tabana ve kimliğe çağır ile bağlanır.",
    bekci: "ana-yok · rafsız-anadizin · anadizin-plan-karışması. Uzun-vadeli şekil (bahçe) kapsayıcıyı belirler — bugünkü tek app onun İÇİNE Uygulama olarak girer." },
  "blok": { dosya: "blok.sar",
    baslik: "🪵 BLOK DOĞUŞU — plan gövdesi: Faz(zaman) → Blok(iş) → Katman(teknoloji, Takım bağlı; teknoloji kaçışı yalnız doğuş anında) → Adım; Blok yalnız Faz gövdesinde yaşar, Faz zorunludur ve her Faz is/plan/faz/ altında sıra önekli kendi dosyasındadır (MIM-1.2); mevsim alanı ve çağır listesi Blok bağı kurmaz.",
    bekci: "konisiz-adım — durum:geliştirmede Adım koni taşımalı (görev·kabul·bağımlı)." },
  "adım": { dosya: "adim.sar",
    baslik: "🎯 ADIM DOĞUŞU — KONİ-dolu (yalın Adım = kör drift; çalgıcı tahmin eder).",
    bekci: "konisiz-adım — durum:geliştirmede'ye alınca koni ŞART (görev/kabul/üretir/bağımlı/referans)." },
  "sözleşme": { dosya: "sozlesme.sar",
    baslik: "📜 SÖZLEŞME DOĞUŞU — KAVUŞUM NOKTASI (contract-first). Ekran+Uç ondan türer.",
    bekci: "sözleşmesiz-uç — her Uç bir sözleşmeye bağlanmalı. Sözleşme İLK yaz." },
  "arkayüz": { dosya: "arkayuz.sar",
    baslik: "🔌 ARKAYÜZ DOĞUŞU — backend ayağı: Uç sözleşmeyi UYGULAR + üretim-yeri beyan.",
    bekci: "sözleşmesiz-uç (Uç→sözleşme) · üretim-yeri (dosya: kodun düşeceği yer — artefakt yerini kendisi beyan eder)." },
  "ekran": { dosya: "ekran.sar",
    baslik: "🖼️ EKRAN DOĞUŞU — SÖZLEŞME ÖNCE gelir; Ekran ile Uç o sözleşmeden türer.",
    bekci: "öksüz-düğme · kavuşumsuz-ekran · sözleşmesiz-uç. Sözleşme İLK yaz (contract-first)." },
  "beceri": { dosya: "beceri.sar",
    baslik: "🎓 BECERİ DOĞUŞU — dersten terfi eden yapabilirlik (Yetenek + yığın-Becerisi çifti).",
    bekci: "eksik-alan — Beceri 9 zorunlu: kod·sağlar·yığın·ne·neZaman·kurallar·örnek·antiDesen·uygular. ≤300 satır; Adım 'kullanır:' ile bağlar." },
  "etmen": { dosya: "etmen.sar",
    baslik: "🤖 ETMEN DOĞUŞU — 7 zorunlu alan (kimlik+yetenek+izole hafıza+anayasa).",
    bekci: "eksik-alan — Etmen 7 zorunlu: kod·tür·uzmanlık·yetki·bellek·ne·uygular. tür∈{apex,yönetici,uzman}." },
  "mekanizma": { dosya: "mekanizma.sar",
    baslik: "🔩 MEKANİZMA DOĞUŞU — kesişen altyapı BİR KEZ ilan edilir; Adım REFERANS alır, İÇERMEZ.",
    bekci: "faz serbest etiket · modüller arası sıra bağımlı-DAG · Adım mekanizmayı İÇERİRSE tek-ilan kuralı çiğnenir." },
  "döngü": { dosya: "dongu.sar",
    baslik: "🔁 DÖNGÜ DOĞUŞU — tekrarlayan işin evidir: tetik ile döner, durunca ya da turLimiti ile DURUR.",
    bekci: "eksik-alan — durunca ve/veya turLimiti ŞART (çıkışsız döngü yazılamaz); koşucu ilerlemesiz-döngüyü erken durdurur; her tur trace'e yazılır." },
};

/** Şablon türleri (doğuş sırasında). */
export function sablonTurleri(): string[] {
  return Object.keys(SABLONLAR);
}

/**
 * 🏛️ MİMARİ DİYALOG (E1-A06 · Founder 2026-07-13 · EVRE-0 öğretimi): `başla`, plan-yazan
 * ajana yazmadan ÖNCE doğru sırayı ÖĞRETİR — kurulu ŞEF'in kod-ajanına yaptığı
 * beceri-enjeksiyonun EVRE-1 (plan) karşılığı. Üç mimari soru + ALTIN KURAL (anadizin=mimari).
 * Tek kaynak: hem MCP başla hem CLI başla buradan okur (YUZ-1.2). IDA dogfood dersinin özü.
 */
export function mimariDiyalog(dil: CiktiDili = "tr"): string {
  if (dil === "en") return MIMARI_DIYALOG_EN.join("\n");
  return [
    "🏛️ MİMARİ DİYALOG (EVRE-0 · yazmadan ÖNCE, bir kez — KAPSAYICI doğar):",
    "   Mimar SENSİN; makine ne yazarsan ONU takip eder. ÖNCE KAPSAYICIYI seç, SONRA içini doldur.",
    "",
    "   ⓪ 🧭 KAPSAYICI TİPİ — bu TEK uygulama mı, çok uygulamalı BAHÇE mi? (varlık ekseni ·",
    "      kanon: siniflama { tip: \"ÇalışmaAlanı\" | \"Uygulama\" | \"Proje\" }):",
    "        • 🌱 Proje       = tek app, tek ağaç (küçük iş) — auth kendi içinde.",
    "        • 🌳 Uygulama    = bir app; bir ÇalışmaAlanı İÇİNDE yaşar (bahçedeki ağaç).",
    "        • 🏡 ÇalışmaAlanı = BAHÇE: tek taban · TEK-AUTH · ortak yasa; İÇİNDE çok Uygulama paralel",
    "          (her app kendi Teknoloji'sini taşır — FARKLI stack serbest; hepsi ortak taban/kimlik'e çağır).",
    "      ⚖️ KARAR KURALI: \"ileride BAŞKA app/teknoloji gelecek mi? ortak auth?\" → EVET ise ÇalışmaAlanı",
    "      seç, bugünkü app'i onun İÇİNE Uygulama koy. ⚠️ UZUN-VADELİ ŞEKİL kapsayıcıyı belirler —",
    "      bugünkü tek teslimat DEĞİL (IDA dersi 2026-07-14: tek-app hedefi tüm mimariyi ÇÖKERTMESİN).",
    "      Şablon: başla { tür: \"proje\" | \"çalışmaalanı\" }. Emin değilsen siniflama'ya SOR (uydurma).",
    "",
    "   Kapsayıcıyı seçtikten SONRA:",
    "   ① 🌀 FAZLAR neler? — büyüme dönemleri; zaman eksenini kurar.",
    "   ② 🔑 TEK-AUTH tabanı nerede? — çok-uygulamada kimlik TEK noktada (taban/kimlik · SZL-AUTH);",
    "      tüm uygulamalar `çağır` ile bağlanır (Bahçe deseni motorda birinci-sınıf: ÇalışmaAlanı).",
    "   ③ 🌿 TEKNOLOJİ → KLASÖR mimarisi? — teknoloji hangi klasörleri doğurur (Kitaplık/Raf + yol:)?",
    "   ④ 🎨 TASARIM SİSTEMİ — projede bir ÖNYÜZ varsa bu soru atlanamaz. Tasarım sistemi BİR KEZ",
    "      ilan edilir ve her ekran ona bağlanır; ekranlar yazıldıktan sonra kurulan bir sistem,",
    "      yazılmış her ekranı ikinci kez elden geçirmeyi gerektirir. İlanı `Tema` düğümüdür ve rol",
    "      ADLARINI taşır (renkler · tipografi · boşluk · yuvarlaklık); renk ve ölçü DEĞERLERİ .sar'a",
    "      yazılmaz, `dosya:` beyanındaki teknoloji dosyasında yaşar. Sistemin kendisi bir iştir:",
    "      önyüz Blokunun ilk Adımı Temayı üretsin (üretir: [ TEM-… ]) ve ekran Adımları ona bağımlı",
    "      olsun — o Adım planda yoksa sistem unutulur ve her ekran kendi rengini uydurur.",
    "      Tasarım ELEMENTLERİ de plana iner: yeniden kullanılan parçalar `Bileşen`, hareket",
    "      `Canlandırma`, simge kümesi `İkon` düğümleriyle ilan edilir ve ekranlar onlara başvurur.",
    "      Kavramın adını uydurma; `kavram` aracına sor ve koniye kanonik yoluyla yaz.",
    "",
    "⚠️ ALTIN KURAL: Anadizin MİMARİ çizer (Kitaplık/Raf/yol = klasör ağacı). Plan",
    "   (Faz→Blok→Katman→Adım) anadizine GÖMÜLMEZ — is/plan/ altında AYRI .sar'da yaşar",
    "   (bekçi: anadizin-plan-karışması). Blok = DİKEY DİLİM: ön+arka+güvenlik BİRLİKTE,",
    "   silo değil; Blok bunları KAVUŞTURUR (bekçi: silo-blok · kavuşumsuz-paralellik).",
  ].join("\n");
}

/** MGZ-A11: mimari diyaloğun İngilizce hanesi — aynı sorular aynı sırayla, dosyadaki adlarla. */
const MIMARI_DIYALOG_EN: readonly string[] = [
  "🏛️ ARCHITECTURE DIALOGUE (EVRE-0 · BEFORE writing, once — the CONTAINER is born first):",
  "   YOU are the architect; the machine follows whatever you write. Choose the CONTAINER FIRST, THEN fill it in.",
  "",
  "   ⓪ 🧭 CONTAINER TYPE — is this ONE application or a multi-application GARDEN? (the entity axis ·",
  "      canon: siniflama { tip: \"ÇalışmaAlanı\" | \"Uygulama\" | \"Proje\" }):",
  "        • 🌱 Proje        = one app, one tree (small work) — auth lives inside it.",
  "        • 🌳 Uygulama     = one app; it lives INSIDE a ÇalışmaAlanı (a tree in the garden).",
  "        • 🏡 ÇalışmaAlanı = the GARDEN: one base · ONE AUTH · shared law; many Uygulama nodes in parallel INSIDE it",
  "          (each app carries its own Teknoloji — a DIFFERENT stack is allowed; all bind to the shared base and identity with çağır).",
  "      ⚖️ DECISION RULE: \"will ANOTHER app or technology come later? shared auth?\" → if YES, choose",
  "      ÇalışmaAlanı and put today's app INSIDE it as an Uygulama. ⚠️ The LONG-TERM SHAPE decides the container —",
  "      NOT today's single delivery (lesson of 2026-07-14: a single-app target must not COLLAPSE the whole architecture).",
  "      Template: basla { tur: \"proje\" | \"çalışmaalanı\" }. If you are not sure, ASK siniflama (do not invent).",
  "",
  "   AFTER choosing the container:",
  "   ① 🌀 WHAT ARE THE Faz NODES? — growth periods; they build the time axis.",
  "   ② 🔑 WHERE IS THE SINGLE-AUTH BASE? — in a multi-app setup identity lives at ONE point (taban/kimlik · SZL-AUTH);",
  "      every application binds with `çağır` (the garden pattern is first-class in the engine: ÇalışmaAlanı).",
  "   ③ 🌿 TECHNOLOGY → FOLDER architecture? — which folders does the technology give birth to (Kitaplık/Raf + yol:)?",
  "   ④ 🎨 DESIGN SYSTEM — if the project has a FRONTEND this question cannot be skipped. The design system is declared",
  "      ONCE and every screen binds to it; a system built after the screens are written forces every written screen",
  "      to be reworked. Its declaration is the `Tema` node and it carries the role NAMES (renkler · tipografi · boşluk",
  "      · yuvarlaklık); colour and size VALUES are not written into the .sar file, they live in the technology file of the",
  "      `dosya:` declaration. The system itself is a piece of work: let the first Adım of the frontend Blok produce the",
  "      Tema (üretir: [ TEM-… ]) and let the screen Adım nodes depend on it — if that Adım is missing from the plan the",
  "      system is forgotten and every screen invents its own colour.",
  "      Design ELEMENTS go into the plan too: reusable parts are declared with `Bileşen`, motion with",
  "      `Canlandırma` and the icon set with `İkon` nodes, and the screens refer to them.",
  "      Do not invent the concept's name; ask the `kavram` tool and write it into the cone by its canonical path.",
  "",
  "⚠️ GOLDEN RULE: the anadizin draws the ARCHITECTURE (Kitaplık/Raf/yol = the folder tree). The plan",
  "   (Faz→Blok→Katman→Adım) is NOT EMBEDDED in the anadizin — it lives in a SEPARATE .sar under is/plan/",
  "   (guard: anadizin-plan-karışması). A Blok is a VERTICAL SLICE: front + back + security TOGETHER,",
  "   not a silo; the Blok MAKES THEM MEET (guards: silo-blok · kavuşumsuz-paralellik).",
];

/**
 * Bir tür için başlık + şablon metni + bekçi notu döner (tek kaynak: sablon/*.sar).
 * Bilinmeyen tür → undefined. Dosya okunamazsa fırlatmaz, açıklayıcı metin döner.
 */
export function sablonMetni(tur: string, dil: CiktiDili = "tr"): { baslik: string; sablon: string; bekci: string } | undefined {
  const anahtar = tur.toLocaleLowerCase("tr");
  const k = SABLONLAR[anahtar];
  if (!k) return undefined;
  let sablon: string;
  try {
    sablon = readFileSync(SABLON_KOK + k.dosya, "utf8").trimEnd();
  } catch (e) {
    sablon = `// ✖ Şablon dosyası okunamadı (${k.dosya}): ${(e as Error).message}`;
  }
  const en = dil === "en" ? SABLON_INGILIZCE[anahtar] : undefined;
  return { baslik: en?.baslik ?? k.baslik, sablon, bekci: en?.bekci ?? k.bekci };
}

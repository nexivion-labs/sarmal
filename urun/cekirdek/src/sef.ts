// ═══════════════════════════════════════════════════════════════════════════
// sef.ts — ŞEF ilk nefes (RAY-3 · AÇIK jenerik mekanizma)
//
//   Bu dosya, ŞEF runtime çalışmasının bağlam montajı kaleminden doğmuştur. O kalemin
//   plan kaydı bugün bu deponun dışında, laboratuvar arşivindeki eski omurga
//   planında yaşar. Arşiv gövdesi CANLI bir `.sar` ilanı olmadığı için taşıdığı
//   Adım kodu motorun çözebileceği bir tanım vermez; bu yüzden köken burada kodla
//   değil anlatıyla anılır.
//
//   Bir Adım KOD'u verilince: koni oku → bağlam montajla → token say → prompt üret.
//   SALT-OKUMA — Etmen ÇAĞIRMAZ, dosya YAZMAZ (ilk nefes sınırı).
//   Saf çekirdek (baglamMontajla·promptUret·tokenSay) ↔ etkili kabuk (sefKomutu) AYRIK.
//   STR-3: bu jenerik mekanizma AÇIK; ajan-seçim/karar POLİTİKASI gizli üründür.
//   Kaynak desen: eski OS wf-context (montaj sırası + ~20k bütçe) · wf-orch §6
//   (parantezleme: kritik kısıt baş+son) · tpl-023 (halüsinasyon-guard).
// ═══════════════════════════════════════════════════════════════════════════

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Program, Dugum, Deger } from "./sozdizim.ts";
import { kodIndeksle, programlariYukle } from "./denetci.ts";
import { koniCikar } from "./koni.ts";
import { GERIBILDIRIM_KANALLARI } from "./kimlik.ts";   // EKL-F10-A12: Founder geribildirim kanalları
import type { Koni } from "./koni.ts";
import { paramMetni, degerMetni } from "./yolcoz.ts";
import { ifadeDegerlendir } from "./kuralci.ts";

/** Bir Adım'ın bir kenar-referansının çözüm durumu VE hedefin kendi metni.
 *
 *  BİRİNCİ KUSUR (Founder ölçümü 2026-07-29): ŞEF eskiden yalnız hedefin VARLIĞINI
 *  doğruluyordu; prompt'a giren şey `referans: STR-2 → ✓ yasa/kanon/str.sar`
 *  satırıydı ve ajan bağlayıcı hükmü hiç görmüyordu. Koni bağlam vaat edip
 *  kaynakça teslim ediyordu. Artık çözülen her hedefin HÜKÜM cümlesi (bütçe
 *  elverirse gerekçesi de) pakete taşınır ve prompt'a basılır. */
export interface RefCozum {
  kod: string;
  tür: "referans" | "bağımlılık";
  çözüldü: boolean;
  dosya?: string;
  /** Hedef düğümün tipi — `Karar` · `Adım` · `Kural aşamaTemizlikKapıları` … */
  tip?: string;
  /** Hedefin BAĞLAYICI cümlesi. Kanon düğümlerinde `-->|` belge bloğunun
   *  `**Hüküm:**` satırı; yoksa `karar:`/`hüküm:`/`ne:` alanı. Bağımlılık
   *  kenarlarında hedef Adım'ın `ne:` cümlesidir (aşağıdaki gerekçeye bak). */
  hüküm?: string;
  /** Hedefin gerekçesi — bütçe elverirse basılır, darlıkta İLK feda edilen. */
  gerekçe?: string;
}

/** Bir Adım'ın `üretir:` meyvesinin prompt-özeti (ikinci kusur · MIM-2.1).
 *
 *  Founder ölçümü 2026-07-29: prompt "🍎 Üretir (BUNU üret · üretim-yeri)"
 *  başlığının altına satır-içi meyvenin `Veri(…)` gösterimini basıyordu; ajan
 *  "bunu üret" emrini alıyor fakat NEREYE üreteceğini görmüyordu. Meyvenin
 *  kodu, türü ve hedef yolu artık ayrı ayrı çözülür. */
export interface MeyveÖzet {
  kod: string;
  /** Meyve düğümünün tipi — Kod · Veri · Sınama · Göç · Ayar · Karar · Onay … */
  tür: string;
  /** Hedef dosya yolu. Kanonik kaynağı meyvenin `dosya:` beyanıdır (MIM-2.1);
   *  beyan yoksa `ne:` cümlesindeki ters-tırnaklı yol ikinci kaynaktır. */
  yol?: string;
  /** Yolun nereden okunduğu — beyandan mı, `ne:` düzyazısından mı. */
  yolKaynağı?: "dosya" | "ne";
  /** Yol YOKSA boş bırakılmaz: türün ne anlama geldiği ya da eksik beyanın adı. */
  anlam?: string;
  /** Meyvenin kendi `ne:` cümlesi (token-ekonomik kısaltılır). */
  ne?: string;
  /** KOD atfı gerçek bir düğüme çözüldü mü (satır-içi meyvede daima doğru). */
  çözüldü: boolean;
}

/** Bir Adım'ın kullandığı Beceri'nin prompt-enjeksiyon özeti (D.2). */
export interface BeceriÖzet {
  kod: string;
  ne: string;
  kurallar: string;
  antiDesen: string;
  örnek: string;
  çözüldü: boolean;
  tetikleyici?: string;   // ateşleyen Tetikleyici KOD'u (A10 · yoksa statik kullanır:)
  etmen?: string;         // gömülü olduğu atanan Etmen KOD'u (K7 · Görev köprüsü)
}

/** davranış-katmanı turu (OGR-2.2): prompt'taki beceri bölmesinin karakter tavanı — deterministik
 *  token yaklaşığı. Tavan DEĞİŞMEZ; ateşleyen kartlar tavanı ADİL PAY ile bölüşür
 *  (adilPaylarHesapla), payına sığmayan kart kırpılır ama susturulmaz. */
export const BECERI_BOLME_TAVANI = 4000;

/** Kanca ateşleme evresi (A15 · Kanca.evre enum): döngü-öncesi · kabul-sonrası · hata. */
export type KancaEvre = "önce" | "sonra" | "hata";

/** Bir Kanca'nın (evre-tetikli hook) özeti. Toplama, Beceri köprüsüyle aynı yolu
 *  izler (Görev.atanan Etmen'in Kanca çocukları) ve runtime kancayı evresine göre
 *  ateşler. STR-3.1 uyarınca toplama AÇIK'tır; kancanın İÇERİĞİ ise GİZLİ olarak
 *  KancaÇağır ile enjekte edilir. */
export interface KancaÖzet {
  kod: string;
  evre: KancaEvre;
  ne: string;
  etmen?: string;   // gömülü olduğu atanan Etmen KOD'u (kaynak-işareti)
}

/** Bir önceki Adım'ın durum-devri özeti (SZL-DURAK · D.3 · çok-adımlı handoff).
 *  ŞEF bir Adım'ı kapatınca kararını buna özetler; sonraki Adım'ın bağlamına akar. */
export interface DurakÖzet {
  adım: string;
  karar: string;              // kabul|revizyon|red|kurtarma|eskalasyon
  mühür: string;              // COMPLETED|VERIFIED|BLOCKED
  özet: string;               // sonraki Adım'a taşınan kısa durum (ne yapıldı + durum)
  ertelenenler: string[];     // açık kalemler (STR-2.1 carry-forward)
  kanıt?: string;             // denetçi davranışsal kanıtı (file:line)
  /** Kurtarma durumu durak ile kontrol noktasında TAŞINIR — sonraki koşu
   *  hangi yoldan gelindiğini bilir (yeniden-dene sayacı · böl önerisi · eskalasyon). */
  kurtarma?: { yol: string; gerekçe: string };
}

/** hatırlatıcı-rayı turu (IDA dogfood oturum-2 · BUG-1 · TIP-1.12): hedef Adım'a `hatırlat` eden
 *  açık/kararlaştı Hatırlatıcı'nın koniye enjekte edilen özeti (token-ekonomik). */
export interface HatırlatıcıÖzet {
  kod: string;
  öncelik: string;
  çapa: string;
  ne: string;   // kısaltılmış (token bütçesi — ham ne ~2k token olabilir)
}

/** ŞEF'in bir Adım için montajladığı bağlam paketi (statik graf). */
export interface BaglamPaket {
  adimKod: string;
  koni: Koni;
  referanslar: RefCozum[];
  meyveler: MeyveÖzet[];     // üretir: kenarının çözülmüş meyveleri (ikinci kusur · kod+tür+yol)
  beceriler: BeceriÖzet[];   // kullanır: BCR-… çözümleri (D.2 · prompt beceri-farkında)
  kancalar: KancaÖzet[];     // K9 · atanan Etmen'in evre-tetikli hook'ları (önce/sonra/hata · A23)
  hatırlatıcılar: HatırlatıcıÖzet[];   // hatırlatıcı-rayı turu: hedefe `hatırlat` eden açık/kararlaştı Hatırlatıcılar (ileri-bağlama · TIP-1.12)
  öncekiDurak?: DurakÖzet;   // D.3 · çok-adımlı akışta bir önceki Adım'ın durum-devri (SZL-DURAK)
  /** HALKA-ORK-A01: Görev.atanan'dan ÇÖZÜLEN Etmen kimliği (kod·ad) — çağrıya ve
   *  trace'e taşınır ("hangi ajan çalışıyor"). STR-3: seçim ZEKÂSI gizli; burada
   *  yalnız BEYAN edilen atama çözülür (demo-politika). */
  etmen?: { kod: string; ad: string };
  /** KVR-A08: bağlam→kavram haritasından çözülen ÖNERİLER (dayatma değil) —
   *  kavramVeri verilmezse bileşen doğmaz (geriye uyumlu). Token kırpmasının
   *  ilk adayıdır; STR-3: anahtar çözümü deterministik AÇIK, anlamsal seçim GİZLİ. */
  kavramÖnerileri?: KavramÖneri[];
  /** EKL-F10-A12 (STR-4): Founder'ın hedef Adıma ve onun bağımlı olduğu Adımlara
   *  yazdığı dört kanal (teşekkür · takdir · onur · öneri). Ajan hangi davranışın
   *  takdir edildiğini kaynaktan öğrenir; kanal yoksa bileşen doğmaz. */
  geribildirim?: GeribildirimÖzet[];
  // Gelecek (runtime-state · sonraki aşamalar): anayasa · bellek · profil · kontrol noktası.
}

/** Bir Adıma yazılmış tek kanal notu (EKL-F10-A12). */
export interface GeribildirimÖzet { adım: string; kanal: string; not: string }

/** Bir Adım düğümündeki dört kanalı sırayla toplar; parametre ve gövde özelliği
 *  ikisi de okunur, boş not atlanır. Saf işlevdir ve prompt'tan bağımsız sınanır. */
export function geribildirimTopla(node: Dugum, adımKod: string): GeribildirimÖzet[] {
  const out: GeribildirimÖzet[] = [];
  for (const kanal of GERIBILDIRIM_KANALLARI) {
    const p = node.parametreler.find((x) => x.ad === kanal) ?? node.ozellikler.find((x) => x.ad === kanal);
    const not = p?.deger.metin?.trim();
    if (not) out.push({ adım: adımKod, kanal, not });
  }
  return out;
}

/** KVR-A08: bağlam haritasının ŞEF'e taşıdığı tek öneri kaydı (TIP-3: üye = kanon yolu). */
export interface KavramÖneri {
  bağlam: string;   // eşleşen harita anahtarı (tip ya da tip.alan)
  aile: string;
  soru: string;     // ajanın diyalog açılış sorusu
  üyeler: Array<{ yol: string; flutter: string }>;   // token disiplini: yalnız yol+flutter (kalanı MCP kavram sorgusu)
}

/** Kavram verisi: bağlam haritası + kavram kanonu (JSON içerikleri — yükleme etkili kabuğun işi). */
export interface KavramVeri {
  harita: {
    aileler?: Record<string, { soru?: string; üyeler?: string[] }>;
    bağlamlar?: Record<string, { öner?: string[] }>;
  };
  kanon: Record<string, unknown>;
}

const YER_TUTUCU = "<!-- TODO -->";
const bos = (s: string): boolean => !s || s === YER_TUTUCU;

// ── SAF ÇEKİRDEK ────────────────────────────────────────────────────────────

/** Program haritasında verilen tip+KOD'lu ilk düğümü bulur (saf). */
export function dugumBul(programlar: ReadonlyMap<string, Program>, tipAd: string, kod: string): Dugum | undefined {
  let bulunan: Dugum | undefined;
  const gez = (node: Dugum): void => {
    if (bulunan) return;
    if (node.ad === tipAd && paramMetni(node, "kod") === kod) { bulunan = node; return; }
    for (const c of node.cocuklar) gez(c);
  };
  for (const p of programlar.values()) { for (const b of p.bildirimler) { gez(b); if (bulunan) break; } if (bulunan) break; }
  return bulunan;
}

/** Verilen KOD'lu ilk Adım düğümünü bulur (saf). */
export function adimBul(programlar: ReadonlyMap<string, Program>, adimKod: string): Dugum | undefined {
  return dugumBul(programlar, "Adım", adimKod);
}

/** Bir düğümün bir alanını HEM parametrelerde HEM gövde-özelliklerinde arar (saf). */
function alanBulGenel(node: Dugum, ad: string) {
  return node.parametreler.find((p) => p.ad === ad) ?? node.ozellikler.find((p) => p.ad === ad);
}

/** Bir düğümün bir alanının metin karşılığını verir; alan yoksa boş dize (saf). */
function alanMetni(node: Dugum, ad: string): string {
  const p = alanBulGenel(node, ad);
  return p ? degerMetni(p.deger).replace(/\s+/g, " ").trim() : "";
}

/** TİPİ BİLİNMEYEN bir KOD'u düğüme çözer (saf). `dugumBul` çağıranın tipi bilmesini
 *  ister; referans ve meyve hedeflerinin tipi ise ÖNCEDEN bilinmez (STR-2 bir Karar,
 *  STR-2.1 bir Kural, RF-T4-A01 bir Adım'dır). Satır-içi widget değerlerine de
 *  iner: meyve çoğu zaman `üretir: [ Veri( kod: …, ne: … ) ]` diye gövdesiz yazılır.
 *  Kaynak sırası deterministiktir — ilk eşleşen kazanır. */
export function kodluDugumBul(programlar: ReadonlyMap<string, Program>, kod: string): Dugum | undefined {
  let bulunan: Dugum | undefined;
  const gez = (node: Dugum): void => {
    if (bulunan) return;
    if (paramMetni(node, "kod") === kod || alanMetni(node, "kod") === kod) { bulunan = node; return; }
    for (const c of node.cocuklar) { gez(c); if (bulunan) return; }
    for (const p of [...node.parametreler, ...node.ozellikler]) {
      const ogeler = p.deger.tur === "liste" ? (p.deger.ogeler ?? []) : [p.deger];
      for (const o of ogeler) if (o.tur === "widget" && o.dugum) { gez(o.dugum); if (bulunan) return; }
    }
  };
  for (const p of programlar.values()) { for (const b of p.bildirimler) { gez(b); if (bulunan) break; } if (bulunan) break; }
  return bulunan;
}

// ── REFERANS METNİ: HÜKMÜ PROMPT'A TAŞI (birinci kusur) ────────────────────────
//
//   Kanon düğümlerinin bağlayıcı cümlesi düğümün ALANINDA değil, düğümün üstündeki
//   `-->| … |<--` belge bloğunda yaşar ve blok ayrıştırıcı tarafından düğüme
//   `belge` olarak bağlanmıştır. Bloğun biçimi kanon boyunca aynıdır:
//   `### KOD · Ad [DÜZEY]` · `**Hüküm:** …` · `**Gerekçe:** …` · `**Örnek:** …`.
//   Karar düğümlerinde aynı cümle ayrıca `karar:` alanında da durur; Kural
//   düğümlerinde DURMAZ — bu yüzden belge bloğu birinci kaynaktır, alanlar ikinci.
//   ŞEF kanon METNİNİ yeniden yazmaz, olduğu gibi taşır.

const HUKUM_DESENI = /^\s*\*\*Hüküm:\*\*\s*(.+)$/mu;
const GEREKCE_DESENI = /^\s*\*\*Gerekçe:\*\*\s*(.+)$/mu;

/** Bir referans/bağımlılık hedefinin tipini ve bağlayıcı metnini çıkarır (saf).
 *
 *  BAĞIMLILIK KENARI NEDEN `ne:` ALIR — ve neden yalnız o: bağımlı Adım'ın kodu
 *  tek başına hiçbir şey söylemez ("RF-T4-A01" bir ajana ne anlatır?), oysa
 *  `ne:` alanı tam olarak "bu iş neyi çözer" cümlesidir ve üzerine inşa edeceği
 *  zemini bir cümlede verir. Buna karşılık bağımlı Adım'ın `görev:`/`kabul:`
 *  alanları O ADIMIN yürütücüsüne yazılmıştır; onları taşımak prompt'u ikiye
 *  katlar ve ajanı kendi işi olmayan bir kabul listesiyle karıştırır. Bu yüzden
 *  bağımlılıkta tek cümle (`ne:`) girer, referansta hüküm + (bütçe elverirse)
 *  gerekçe girer: referans BAĞLAYICIDIR, bağımlılık yalnız ZEMİNDİR. */
function refMetniCikar(node: Dugum): { tip: string; hüküm: string; gerekçe: string } {
  const belge = node.belge ?? "";
  const belgeden = (desen: RegExp): string => (desen.exec(belge)?.[1] ?? "").replace(/\s+/g, " ").trim();
  const ilkDolu = (...adlar: string[]): string => {
    for (const ad of adlar) { const v = alanMetni(node, ad); if (v) return v; }
    return "";
  };
  return {
    tip: node.tur === "kuralTanım" ? `Kural ${node.ad}` : node.ad,
    hüküm: belgeden(HUKUM_DESENI) || ilkDolu("karar", "hüküm", "ne", "görev"),
    gerekçe: belgeden(GEREKCE_DESENI) || ilkDolu("gerekçe", "neden"),
  };
}

// ── MEYVE ÇÖZÜMÜ: NE ÜRETİLECEK, NEREYE ÜRETİLECEK (ikinci kusur) ────────────

/** Meyvenin `ne:` cümlesinden hedef yolu çeker: ters-tırnak içindeki İLK bölü
 *  içeren belirteç. Kanonik kaynak meyvenin `dosya:` beyanıdır (MIM-2.1); bu desen
 *  yalnız beyan henüz yazılmamışken düzyazıya gömülü yolu kurtarır (deterministik —
 *  ilk eşleşme kazanır, ikinci bir yol aranmaz). */
const NE_ICI_YOL_DESENI = /`([^`\s]*\/[^`\s]+)`/u;

/** Dosya beyan ETMEYEN meyve tiplerinin anlamı — yol yerine bu basılır, alan
 *  boş bırakılmaz. Bu tipler diskte bir artefakt değil, grafta bir düğüm üretir. */
const DOSYASIZ_MEYVE_ANLAMI: ReadonlyMap<string, string> = new Map([
  ["Karar", "dosya değil — kanona/plana yazılan Karar düğümü; hükmü, gerekçesi ve yürürlük durumu kendi kimliğinde yaşar"],
  ["Onay", "dosya değil — kapı onayı kaydı; hükmü veren merci ve tarih düğümün kendisine yazılır"],
  ["dış-çıktı", "dosya değil — depo dışında doğan çıktı (etiket · yayın · dış sistem kaydı); kanıtı Adım'ın koşu alanına yazılır"],
  ["Mekanizma", "dosya değil — kesişen altyapı ilanı; tek kaynakta durur, Adımlara dağıtılmaz"],
  ["Uç", "dosya değil — API ucu sözleşmesi (yol + yöntem + istek/yanıt + yetki)"],
]);

/** Meyve `ne:` metninin prompt tavanı — Hatırlatıcı özetiyle (HTR_NE_MAX) aynı
 *  desen: kimlik ve yol tam basılır, anlatı kısaltılır. */
const MEYVE_NE_MAX = 160;

/** Bir meyve düğümünü prompt özetine indirir (saf). */
function meyveÖzetle(kod: string, node: Dugum): MeyveÖzet {
  const tür = node.tur === "kuralTanım" ? `Kural ${node.ad}` : node.ad;
  const hamNe = alanMetni(node, "ne");
  const ne = hamNe.length > MEYVE_NE_MAX ? hamNe.slice(0, MEYVE_NE_MAX - 1) + "…" : hamNe;
  const beyan = alanMetni(node, "dosya");
  if (beyan) return { kod, tür, yol: beyan, yolKaynağı: "dosya", ne, çözüldü: true };
  const gömülü = NE_ICI_YOL_DESENI.exec(hamNe)?.[1];
  if (gömülü) return { kod, tür, yol: gömülü, yolKaynağı: "ne", ne, çözüldü: true };
  const anlam = DOSYASIZ_MEYVE_ANLAMI.get(tür)
    ?? "hedef yol beyan edilmemiş — üretmeden önce meyvenin `dosya:` alanına yaz (MIM-2.1)";
  return { kod, tür, anlam, ne, çözüldü: true };
}

/** Bir Adım'ın `üretir:` kenarındaki meyveleri çözer (saf). İki yazım da desteklenir:
 *  KOD atfı (`üretir: [ KOD-X ]` — yol hedef düğümün `dosya:`sındadır) ve satır-içi
 *  bildirim (`üretir: [ Veri( kod: …, ne: … ) ]`). */
export function meyveleriCoz(programlar: ReadonlyMap<string, Program>, node: Dugum): MeyveÖzet[] {
  const p = alanBulGenel(node, "üretir");
  if (!p) return [];
  const ogeler = p.deger.tur === "liste" ? (p.deger.ogeler ?? []) : [p.deger];
  const out: MeyveÖzet[] = [];
  for (const o of ogeler) {
    if (o.tur === "widget" && o.dugum) {
      out.push(meyveÖzetle(paramMetni(o.dugum, "kod") ?? o.dugum.ad, o.dugum));
      continue;
    }
    if ((o.tur !== "kod" && o.tur !== "metin") || !o.metin) continue;
    const hedef = kodluDugumBul(programlar, o.metin);
    out.push(hedef ? meyveÖzetle(o.metin, hedef) : {
      kod: o.metin, tür: "—", çözüldü: false,
      anlam: "meyve düğümü hiçbir `.sar` kaynağında bulunamadı — üretim yeri bilinmiyor",
    });
  }
  return out;
}

/** Verilen KOD'lu ilk Sözleşme düğümünü bulur (saf). */
export function sozlesmeBul(programlar: ReadonlyMap<string, Program>, kod: string): Dugum | undefined {
  return dugumBul(programlar, "Sözleşme", kod);
}

/** Bir Değer'deki KOD/metin token'larını düzleştirir (liste içi dahil, saf). */
function kodlariCikar(d: Deger): string[] {
  if (d.tur === "liste") return (d.ogeler ?? []).flatMap(kodlariCikar);
  if (d.tur === "kod" || d.tur === "metin") return d.metin ? [d.metin] : [];
  return [];
}

/** Bir Adım'ın referans + bağımlılık kenarlarındaki KOD'ları toplar (saf). */
function refKodlari(node: Dugum): Array<{ kod: string; tür: "referans" | "bağımlılık" }> {
  const out: Array<{ kod: string; tür: "referans" | "bağımlılık" }> = [];
  const alan = (ad: string) => node.parametreler.find((p) => p.ad === ad) ?? node.ozellikler.find((p) => p.ad === ad);
  const topla = (ad: string, tür: "referans" | "bağımlılık") => {
    const p = alan(ad);
    if (p) for (const kod of kodlariCikar(p.deger)) out.push({ kod, tür });
  };
  topla("referans", "referans");
  topla("bağımlı", "bağımlılık"); // kenar adı 'bağımlı'; RefCozum etiketi kavram adı (A09: yasak 'bağımlılık' ALANI artık okunmaz — ORK-1.2)
  return out;
}

/** Bir Adım'ın kullandığı Beceri KOD'larını toplar (kullanır: BCR-… · liste dahil, saf). */
function beceriKodlari(node: Dugum): string[] {
  const p = node.parametreler.find((x) => x.ad === "kullanır") ?? node.ozellikler.find((x) => x.ad === "kullanır");
  return p ? kodlariCikar(p.deger) : [];
}

/** Bir Beceri düğümünden prompt-enjeksiyon özeti çıkarır (param+özellik tarar, saf). */
function beceriÖzetle(kod: string, beceriNode: Dugum): BeceriÖzet {
  const al = (ad: string): string => {
    const p = beceriNode.parametreler.find((x) => x.ad === ad) ?? beceriNode.ozellikler.find((x) => x.ad === ad);
    return p ? degerMetni(p.deger) : "";
  };
  return { kod, ne: al("ne"), kurallar: al("kurallar"), antiDesen: al("antiDesen"), örnek: al("örnek"), çözüldü: true };
}

// ── TETİKLEYİCİ KOŞULU: AYIRT EDİCİLİK KAPISI (üçüncü kusur) ──────────────────
//
//   ÖLÇÜLEN KUSUR (2026-07-29): bir göç kapısı kapatma Adımına "doğrulamalı form
//   kurma reçetesi" kartı düşüyordu. Kök neden beceri seçiminde değil, koşulun
//   kendisindedir: `Tetikleyici( koşul: görev, tetikler: VTR-BCR-FORM )` çıplak bir
//   ATOMDUR; `boolCoz` onu "bu düğümde `görev` alanı var mı" varlık testine indirger
//   ve cevap çalışan her Adım için doğrudur. Ölçüm: depodaki 524 Adım'ın 412'si bu
//   kartı ateşliyordu — enjekte edilen 534 kartın 412'si, yani dörtte üçü gürültüydü.
//   Tetikleyicinin `ne:` alanı niyeti açıkça yazıyor ("form içeren Adım gelince"),
//   yani yazar ANLAMSAL bir eşleşme istemiş, dil ise ona varlık testi vermiştir.
//
//   HÜKÜM: bir koşul ancak AYIRT EDİCİ ise ateşler. Çıplak varlık testi hiçbir Adım'ı
//   bir başkasından ayırmaz; bir kartın kime gideceğini seçemez, dolayısıyla seçim
//   değildir. Motorun bu sınıfa verdiği cevap zaten kuruluydu: düzyazı koşul da
//   ateşlemez, çünkü anlamsal eşleştirme GİZLİ ürünün alanıdır (STR-3.1). Çıplak
//   varlık koşulu aynı sınıftadır ve aynı cevabı alır. Ayırt edici koşul YAPISAL
//   olarak yazılır: `koşul: adım.durum == geliştirmede` gibi bir karşılaştırma ya da
//   bunların mantıksal birleşimi. Bir alanın yalnız VARLIĞINI sınamak isteyen yazar
//   bunu da açıkça yazabilir (`adım.tür == form`); dilin ifade gücü daralmaz, örtük
//   tautoloji kapanır.
//
//   NOT (kartı SUSTURMUYORUZ): VTR-BCR-FORM gerçek form Adımına Görev köprüsünden
//   girmeye devam eder — VTR-ADM-ADRES-FORMU, VTR-GRV-ADRES ile VTR-ETM-FORM
//   uzmanına atanmıştır ve kart o uzmanın gömülü becerisidir. Kapanan şey kartın
//   sesi değil, hedefi tutmayan ateşlemesidir.

/** Bir Tetikleyici koşulunun AYIRT EDİCİ olup olmadığını söyler (saf).
 *  Yalnız yapısal ifadeler (karşılaştırma ve mantıksal birleşimleri) ayırt edicidir;
 *  çıplak atom bir varlık testine indirgenir ve o testin cevabı tipin her örneğinde
 *  aynı olabilir — böyle bir koşul kimseyi seçmez. Düzyazı koşul zaten ayrı elenir. */
export function kosulAyirtEdici(koşul: Deger): boolean {
  return koşul.tur === "ifade";
}

/** Geçerli Kanca evre'leri (A15 enum ile hizalı) — sef linter değil, tanımsız evre atlanır. */
const KANCA_EVRELERI: ReadonlySet<string> = new Set<KancaEvre>(["önce", "sonra", "hata"]);

/** Bir Kanca düğümünden özet çıkarır; evre tanımsız/geçersizse undefined (atla, saf). */
function kancaÖzetle(kancaNode: Dugum, etmenKod: string): KancaÖzet | undefined {
  const al = (ad: string): string => {
    const p = kancaNode.parametreler.find((x) => x.ad === ad) ?? kancaNode.ozellikler.find((x) => x.ad === ad);
    return p ? degerMetni(p.deger) : "";
  };
  const evre = al("evre");
  if (!KANCA_EVRELERI.has(evre)) return undefined;   // A15 enum dışı → toplama
  return { kod: al("kod") || kancaNode.ad, evre: evre as KancaEvre, ne: al("ne"), etmen: etmenKod };
}

/** Program haritasındaki tüm Tetikleyici düğümlerini toplar (A10 · collect-all, saf). */
function tetikleyicileriTopla(programlar: ReadonlyMap<string, Program>): Dugum[] {
  const out: Dugum[] = [];
  const gez = (node: Dugum): void => {
    if (node.ad === "Tetikleyici") out.push(node);
    for (const c of node.cocuklar) gez(c);
  };
  for (const p of programlar.values()) for (const b of p.bildirimler) gez(b);
  return out;
}

/** Program haritasındaki tüm Hatırlatıcı düğümlerini toplar (hatırlatıcı-rayı turu · collect-all, saf). */
function hatirlaticilariTopla(programlar: ReadonlyMap<string, Program>): Dugum[] {
  const out: Dugum[] = [];
  const gez = (node: Dugum): void => {
    if (node.ad === "Hatırlatıcı") out.push(node);
    for (const c of node.cocuklar) gez(c);
  };
  for (const p of programlar.values()) for (const b of p.bildirimler) gez(b);
  return out;
}

/** hatırlatıcı-rayı turu (BUG-1 · TIP-1.12): hedef Adım'a `hatırlat` eden açık/kararlaştı Hatırlatıcıları
 *  koni-özetine indirir — "hedef aktifleşince otomatik gelir". Seçim zekâsı YOK (STR-3),
 *  yalnız BEYAN edilen kenar okunur; tamamlandı/gereksiz elenir; `ne` token-ekonomik kısaltılır. */
const HTR_AKTIF_DURUM: ReadonlySet<string> = new Set(["açık", "kararlaştı"]);
const HTR_NE_MAX = 120;
export function bagliHatirlaticilar(programlar: ReadonlyMap<string, Program>, adimKod: string): HatırlatıcıÖzet[] {
  const out: HatırlatıcıÖzet[] = [];
  for (const h of hatirlaticilariTopla(programlar)) {
    const hedefP = h.parametreler.find((p) => p.ad === "hatırlat") ?? h.ozellikler.find((p) => p.ad === "hatırlat");
    if (!hedefP || !kodlariCikar(hedefP.deger).includes(adimKod)) continue;
    const durum = paramMetni(h, "durum") ?? "açık";
    if (!HTR_AKTIF_DURUM.has(durum)) continue;   // tamamlandı/gereksiz koniye girmez
    const ham = (paramMetni(h, "ne") ?? "").replace(/\s+/g, " ").trim();
    out.push({
      kod: paramMetni(h, "kod") ?? h.ad,
      öncelik: paramMetni(h, "öncelik") ?? "—",
      çapa: paramMetni(h, "çapa") ?? "—",
      ne: ham.length > HTR_NE_MAX ? ham.slice(0, HTR_NE_MAX - 1) + "…" : ham,
    });
  }
  return out;
}

/** Bir Adım'a atanmış Görev'i bulur (Görev.gerçekleştirir == adimKod · K7 köprü, saf). */
function görevBul(programlar: ReadonlyMap<string, Program>, adimKod: string): Dugum | undefined {
  let bulunan: Dugum | undefined;
  const gez = (node: Dugum): void => {
    if (bulunan) return;
    if (node.ad === "Görev") {
      const gp = node.parametreler.find((p) => p.ad === "gerçekleştirir") ?? node.ozellikler.find((p) => p.ad === "gerçekleştirir");
      if (gp && degerMetni(gp.deger) === adimKod) { bulunan = node; return; }
    }
    for (const c of node.cocuklar) gez(c);
  };
  for (const p of programlar.values()) { for (const b of p.bildirimler) { gez(b); if (bulunan) break; } if (bulunan) break; }
  return bulunan;
}

/** Bir Adım için bağlam paketini montajlar (saf). Adım yoksa undefined.
 *  `öncekiDurak` verilirse (D.3 · çok-adımlı akış) bağlama handoff olarak eklenir. */
/** Adım'a atanan TÜM Etmenler (Görev.gerçekleştirir==adimKod → atanan;
 *  liste desteklenir, birden çok Görev toplanır, sıra kaynak-deterministik).
 *  Kadro SEÇİMİ (hangi uzmanlar) GİZLİ politika — burada yalnız BEYAN okunur. */
export function atananEtmenler(
  programlar: ReadonlyMap<string, Program>,
  adimKod: string,
): Array<{ kod: string; ad: string }> {
  const out: Array<{ kod: string; ad: string }> = [];
  const görülen = new Set<string>();
  const gez = (node: Dugum): void => {
    if (node.ad === "Görev") {
      const gp = node.parametreler.find((p) => p.ad === "gerçekleştirir") ?? node.ozellikler.find((p) => p.ad === "gerçekleştirir");
      if (gp && degerMetni(gp.deger) === adimKod) {
        const ap = node.parametreler.find((p) => p.ad === "atanan") ?? node.ozellikler.find((p) => p.ad === "atanan");
        if (ap) {
          for (const kod of kodlariCikar(ap.deger)) {
            if (görülen.has(kod)) continue;
            görülen.add(kod);
            const etmenNode = dugumBul(programlar, "Etmen", kod);
            out.push({ kod, ad: etmenNode ? (paramMetni(etmenNode, "ad") ?? kod) : kod });
          }
        }
      }
    }
    for (const c of node.cocuklar) gez(c);
  };
  for (const p of programlar.values()) for (const b of p.bildirimler) gez(b);
  return out;
}

export function baglamMontajla(
  programlar: ReadonlyMap<string, Program>,
  adimKod: string,
  öncekiDurak?: DurakÖzet,
  /** Çok-Etmen koşusunda payın Etmen'i — verilirse Görev-köprüsü BU Etmen'le
   *  kurulur (her pay kendi koni+beceri bağlamını alır; ORK-6.1 izolasyonu Etmen-başına). */
  seçilenEtmen?: string,
  /** KVR-A08: bağlam→kavram haritası + kanon — verilirse öneriler pakete girer;
   *  verilmezse bileşen doğmaz (geriye uyumlu — mevcut çağıranlar değişmez). */
  kavramVeri?: KavramVeri,
): BaglamPaket | undefined {
  const node = adimBul(programlar, adimKod);
  if (!node) return undefined;
  const indeks = kodIndeksle(programlar);
  // Birinci kusur: kenar yalnız ÇÖZÜLMEZ, hedefin metni de okunur — ajan hükmü görür.
  const referanslar: RefCozum[] = refKodlari(node).map(({ kod, tür }) => {
    const t = indeks.get(kod);
    if (!t) return { kod, tür, çözüldü: false };
    const hedef = kodluDugumBul(programlar, kod);
    if (!hedef) return { kod, tür, çözüldü: true, dosya: t.dosya };
    const { tip, hüküm, gerekçe } = refMetniCikar(hedef);
    return {
      kod, tür, çözüldü: true, dosya: t.dosya, tip,
      ...(hüküm ? { hüküm } : {}),
      // Bağımlılıkta zemin cümlesi yeter; gerekçe REFERANSIN (bağlayıcı hükmün) ekidir.
      ...(gerekçe && tür === "referans" ? { gerekçe } : {}),
    };
  });
  const beceriler: BeceriÖzet[] = beceriKodlari(node).map((kod) => {
    const bn = dugumBul(programlar, "Beceri", kod);
    return bn ? beceriÖzetle(kod, bn) : { kod, ne: "", kurallar: "", antiDesen: "", örnek: "", çözüldü: false };
  });
  // Tetikleyici-tabanlı beceriler (A10): YAPISAL koşul Adım'da kesin `true` → Beceri fire.
  // Üç-değerli güvenlik: belirsiz/false/prose koşul → fire etmez (bulanık eşleştirme GİZLİ).
  const kodSet = new Set(beceriler.map((b) => b.kod));
  const alanBul = (n: Dugum, ad: string) => n.parametreler.find((p) => p.ad === ad) ?? n.ozellikler.find((p) => p.ad === ad);
  for (const trg of tetikleyicileriTopla(programlar)) {
    const koşulP = alanBul(trg, "koşul");
    const hedefP = alanBul(trg, "tetikler");
    if (!koşulP || !hedefP) continue;
    if (koşulP.deger.tur === "metin") continue;          // prose koşul = GİZLİ eşleştirme, atla
    if (!kosulAyirtEdici(koşulP.deger)) continue;        // ayırt-edicilik kapısı: çıplak varlık testi kimseyi seçmez
    if (ifadeDegerlendir(koşulP.deger, node) !== true) continue;   // yalnız kesin true fire
    const trgKod = paramMetni(trg, "kod") ?? trg.ad;
    for (const bcrKod of kodlariCikar(hedefP.deger)) {
      if (kodSet.has(bcrKod)) continue;                  // dedupe (statik kullanır'da var)
      const bn = dugumBul(programlar, "Beceri", bcrKod);
      const özet = bn ? beceriÖzetle(bcrKod, bn) : { kod: bcrKod, ne: "", kurallar: "", antiDesen: "", örnek: "", çözüldü: false };
      beceriler.push({ ...özet, tetikleyici: trgKod });
      kodSet.add(bcrKod);
    }
  }
  // Görev-dolaylı beceriler (K7 köprü): Adım bir Görev'e atanmışsa (Görev.gerçekleştirir==adimKod),
  // atanan Etmen'in GÖMÜLÜ Beceri'leri enjekte edilir (ölü kadro becerisi canlanır). STR-3.1: statik
  // atama (Görev.atanan beyanı) AÇIK; dinamik etmen-seçimi GİZLİ. beceriKonisi → least-context kısıt.
  // Kanca'lar (K9 · A23): atanan Etmen'in evre-tetikli hook çocukları (önce/sonra/hata).
  // Toplama beceriyle AYNI atanan-Etmen düğümünden; runtime evre'ye göre ateşler (A24).
  const kancalar: KancaÖzet[] = [];
  const kancaKodSet = new Set<string>();
  let etmen: BaglamPaket["etmen"];
  // Etmen düğümünden gömülü Beceri/Kanca toplama — Görev-ataması ve tetik-ateşlemesi
  // AYNI yolu kullanır (HALKA-ORK-A04: devreye giren ajanın becerileri EKSİKSİZ koni'ye girer).
  const etmendenTopla = (etmenNode: Dugum, etmenKod: string, koniSet?: Set<string>): void => {
    for (const c of etmenNode.cocuklar) {
      if (c.ad === "Beceri") {
        const bcrKod = paramMetni(c, "kod") ?? c.ad;
        if (kodSet.has(bcrKod)) continue;                // dedupe (kullanır:/tetik ile çakışma yok)
        if (koniSet && !koniSet.has(bcrKod)) continue;   // beceriKonisi verilmişse alt-kümeye kısıt
        beceriler.push({ ...beceriÖzetle(bcrKod, c), etmen: etmenKod });
        kodSet.add(bcrKod);
      } else if (c.ad === "Kanca") {
        const özet = kancaÖzetle(c, etmenKod);
        if (!özet || kancaKodSet.has(özet.kod)) continue; // enum-dışı evre atlanır · dedupe
        kancalar.push(özet);
        kancaKodSet.add(özet.kod);
      }
    }
  };

  const görev = görevBul(programlar, adimKod);
  if (görev) {
    const atananP = alanBul(görev, "atanan");
    // A32: seçilenEtmen verilmişse pay o Etmen'le kurulur; yoksa ilk atanan (mevcut davranış).
    const etmenKod = seçilenEtmen ?? (atananP ? degerMetni(atananP.deger) : "");
    const koniP = alanBul(görev, "beceriKonisi");
    const koniSet = koniP ? new Set(kodlariCikar(koniP.deger)) : undefined;
    const etmenNode = etmenKod ? dugumBul(programlar, "Etmen", etmenKod) : undefined;
    if (etmenNode) {
      // HALKA-ORK-A01: kadro çözümü — kimlik (kod·ad) çağrıya/trace'e taşınır.
      etmen = { kod: etmenKod, ad: paramMetni(etmenNode, "ad") ?? etmenKod };
      etmendenTopla(etmenNode, etmenKod, koniSet);
    }
  }

  // HALKA-ORK-A03: ETMEN-düzeyi Tetikleyici — Görev ataması YOKSA, koşulu Adım'da
  // kesin true olan bir Tetikleyici'nin `tetikler:` hedefi ETMEN ise o ajan ateşlenir
  // (kimliği + gömülü becerileri/kancaları devreye girer). Yapısal koşul AÇIK (STR-3);
  // bulanık/anlamsal eşleştirme GİZLİ. İlk eşleşen kazanır (kaynak sırası — deterministik).
  if (!etmen) {
    for (const trg of tetikleyicileriTopla(programlar)) {
      const koşulP = alanBul(trg, "koşul");
      const hedefP = alanBul(trg, "tetikler");
      if (!koşulP || !hedefP) continue;
      if (koşulP.deger.tur === "metin") continue;                    // prose koşul → GİZLİ, atla
      if (!kosulAyirtEdici(koşulP.deger)) continue;                  // ayırt-edicilik kapısı: çıplak varlık testi kimseyi seçmez
      if (ifadeDegerlendir(koşulP.deger, node) !== true) continue;   // yalnız kesin true fire
      for (const hedefKod of kodlariCikar(hedefP.deger)) {
        const etmenNode = dugumBul(programlar, "Etmen", hedefKod);
        if (!etmenNode) continue;                                    // BCR hedefleri A10'un işi
        etmen = { kod: hedefKod, ad: paramMetni(etmenNode, "ad") ?? hedefKod };
        etmendenTopla(etmenNode, hedefKod);
        break;
      }
      if (etmen) break;
    }
  }
  // KVR-A08: kavram önerileri — anahtar düğümün tipi + mevcut alan adlarından
  // deterministik türetilir (en-özel-kazanır); harita ÖNERİR, dayatmaz.
  const kavramÖnerileri = kavramVeri
    ? kavramOnerileriCoz(kavramVeri, node.ad,
        [...node.parametreler, ...node.ozellikler].map((p) => p.ad))
    : undefined;
  // EKL-F10-A12: geribildirim önce hedef Adımdan, sonra üstüne inşa edilen bağımlı
  // Adımlardan toplanır; sıra kaynak sırasıdır ve aynı paket aynı prompt'u üretir.
  const geribildirim: GeribildirimÖzet[] = geribildirimTopla(node, adimKod);
  for (const r of referanslar) {
    if (r.tür !== "bağımlılık" || !r.çözüldü) continue;
    const hedef = kodluDugumBul(programlar, r.kod);
    if (hedef && hedef.ad === "Adım") geribildirim.push(...geribildirimTopla(hedef, r.kod));
  }
  return { adimKod, koni: koniCikar(node), referanslar, meyveler: meyveleriCoz(programlar, node),
           beceriler, kancalar,
           hatırlatıcılar: bagliHatirlaticilar(programlar, adimKod), öncekiDurak, etmen,
           ...(kavramÖnerileri && kavramÖnerileri.length ? { kavramÖnerileri } : {}),
           ...(geribildirim.length ? { geribildirim } : {}) };
}

/** Kanon yolunu ("onyuz.bilesen.menü") kanonda çözüp Flutter eşlemesini döndürür (saf).
 *  Çözülmeyen yol boş döner — nöbet KVR-A07 sınamasındadır, ŞEF tanı üretmez. */
function kanonFlutter(kanon: Record<string, unknown>, yol: string): string {
  const dugum = yol.split(".").reduce<unknown>(
    (o, parca) => (o && typeof o === "object" ? (o as Record<string, unknown>)[parca] : undefined), kanon);
  if (!dugum || typeof dugum !== "object") return "";
  const f = (dugum as Record<string, unknown>)["flutter"] ?? (dugum as Record<string, unknown>)["dart"];
  return typeof f === "string" ? f : "";
}

/** KVR-A08 (saf): bağlam haritasından düğüm için kavram önerilerini çözer.
 *  Mekanik DETERMİNİSTİKTİR (STR-3 açık yüz): anahtar `tip.alan` (düğümde o alan
 *  varsa) ya da çıplak `tip`tir; EN-ÖZEL-KAZANIR — tip.alan eşleşmesi varken
 *  çıplak tipe düşülmez. Anlamsal seçim YOKTUR: haritada beyan edilen taşınır. */
export function kavramOnerileriCoz(veri: KavramVeri, dugumTipi: string, alanAdlari: readonly string[]): KavramÖneri[] {
  const bağlamlar = veri.harita.bağlamlar ?? {};
  const anahtarlar = Object.keys(bağlamlar);
  const özel = anahtarlar.filter((a) => alanAdlari.some((alan) => a === `${dugumTipi}.${alan}`));
  const seçilen = özel.length ? özel : anahtarlar.filter((a) => a === dugumTipi);
  const out: KavramÖneri[] = [];
  for (const b of seçilen) {
    for (const aileAd of bağlamlar[b].öner ?? []) {
      const aile = veri.harita.aileler?.[aileAd];
      if (!aile) continue;   // tanımsız aile atfı — nöbet KVR-A07 sınamasında, burada sessizce atlanır
      out.push({
        bağlam: b, aile: aileAd, soru: aile.soru ?? "",
        üyeler: (aile.üyeler ?? []).map((yol) => ({ yol, flutter: kanonFlutter(veri.kanon, yol) })),
      });
    }
  }
  return out;
}

// Bu iki yol modül yüklenirken değil, ilk gerçek okumada çözülür. Sebebi ölçülmüştür:
// eklenti esbuild ile CommonJS paketine çevrildiğinde `import.meta.url` boşalır ve URL
// kurucusu modül yüklenirken hata atar; paket hiç açılamadığı için eklentinin duman
// nöbeti düşer. Kardeş çözüm `cevir.ts` ile `dil-baglami.ts` içinde aynı gerekçeyle
// yaşıyor. Yol değerleri değişmedi, yalnız hesaplandıkları an ertelendi.
const KAVRAM_HARITA_YOL = (): string => fileURLToPath(new URL("../../../ogreti/bilgi/tasarim_sozlugu/baglam-haritasi.json", import.meta.url));
const KAVRAM_KANON_YOL = (): string => fileURLToPath(new URL("../../../ogreti/bilgi/tasarim_sozlugu/kayit.json", import.meta.url));

/** Kavram verisini diskten yükler (etkili — YUZ-1.2 ②: her çağrıda güncel veri, kopya taşınmaz).
 *  Dosya yok/bozuksa undefined döner — ŞEF prompt üretimi kavramsız devam eder (öneri verisi kritik değildir). */
export function kavramVerisiYukle(): KavramVeri | undefined {
  try {
    return {
      harita: JSON.parse(readFileSync(KAVRAM_HARITA_YOL(), "utf8")) as KavramVeri["harita"],
      kanon: JSON.parse(readFileSync(KAVRAM_KANON_YOL(), "utf8")) as Record<string, unknown>,
    };
  } catch {
    return undefined;
  }
}

/** Yaklaşık token sayısı — sıfır-bağımlılık (STR-3.1): ~4 karakter/token (saf). */
export function tokenSay(metin: string): number {
  return Math.ceil(metin.length / 4);
}

const GUARD = [
  "## ⚠️ Kanıt & Halüsinasyon Koruması",
  "- Emin değilsen açıkça söyle; varsayımlarını listele.",
  "- Uydurma API/imza/config KULLANMA; belirsizliği işaretle.",
  "- Her iddiayı kanıtla (dosya:satır); kanıtsız iddia = halüsinasyon.",
].join("\n");

// ── BECERİ BÖLMESİ: ADİL PAY KIRPMASI (davranış-katmanı turu · OGR-2.2) ─────────────────────
//
//   Eski davranış ilk-gelen-alırdı: paket sırasında öndeki kart tavanı tüketiyor,
//   arkadaki kartlar tek satır işaretçiye iniyordu. Aynı koşulla ateşleyen yedi
//   kartın dördü böylece okunmadan düşüyordu ve sıra fiilen keyfîydi. Yeni
//   davranış üç şarta uyar:
//
//   ① TAVAN AŞILMAZ — kart başlığı dahil hiçbir şey bütçenin dışında değildir.
//      Pay bir kartın başlığını bile taşımıyorsa başlığın kendisi kırpılır; böylece
//      "tavan aşılmaz" iddiası kart sayısından bağımsız olarak doğru kalır.
//   ② ATEŞLEYEN KART SUSTURULMAZ — kart adı, özü ve ANTİ-DESENİ payın elverdiği
//      son ana kadar yaşar. Anti-desen kartın davranış değiştiren parçasıdır:
//      önce örnek düşer, sonra kurallar, en son anti-desen. Pay daraldıkça kart
//      önce damgasını, sonra kaynak eklerini (⚙️ Etmen · ⚡ Tetikleyici), sonra
//      etiket uzunluğunu bırakır — içerik en son bırakılır.
//      ÖLÇÜLMÜŞ SINIR (gerçek kart adlarıyla, tavan dört bin): elli kada­r kartta
//      üçü de (ad · öz · anti-desen) tam yaşar; altmışta öz, seksen beşte anti-desen
//      seyrelmeye başlar; yüz yirmide yalnız ad kalır. Bugün gerçek bir Adımda yedi
//      kart ateşliyor, yani çalışma bölgesi bu sınırın çok altındadır.
//   ③ KIRPMA SESSİZ DEĞİLDİR — kırpılan kart ✂️ damgasıyla kırpıldığını söyler ve
//      tam metnin adresini verir. Adres `gezin <KOD>`tur; bu yol HEM CLI'da HEM
//      MCP'de çalışır (`ogret` konulu çağrısı yalnız MCP'de çalışıyordu).

/** Kırpılan kartın başlığına düşen uzun damga: kesildiğini ve tam metnin adresini
 *  söyler. `gezin` kartın tanımını dosya:satır ile açar — CLI ve MCP'de aynı yol. */
const uzunKirpmaDamgasi = (kod: string): string => ` ✂️(kırpıldı — tamamı: \`gezin ${kod}\`)`;

/** Pay darken kullanılan kısa damga: uzun damga içeriğin yerini yiyecekse yerini
 *  ona bırakır; anlamını ve adresi bölme notu taşır. */
const KISA_KIRPMA_DAMGASI = " ✂️";

/** Kırpma bölümünün tek seferlik açıklaması (bölme başlığının altında, bütçe dışı). */
const KART_KIRPMA_NOTU =
  "> ✂️ damgalı kartlar beceri bütçesinin adil payına sığmadığı için kırpıldı; " +
  "kartın tam metnini `gezin <KART-KODU>` ile ogrenme rafından açabilirsin.";

/** Kalem etiketleri. Bol payda tam yazılır; pay daraldığında anlamı koruyan sıkışık
 *  biçime düşülür (etiket uzunluğu, içerikten önce feda edilir). */
const TAM_ETIKET = { antiDesen: "\n- Anti-desen (KAÇIN): ", ne: ": ", kurallar: "\n- Kurallar: " } as const;
const SIKISIK_ETIKET = { antiDesen: "\n- KAÇIN: ", ne: ": ", kurallar: "\n- Kural: " } as const;

/** Kalemlerin metin bütçesindeki ağırlıkları — bol payda kim ne kadar yer kaplar. */
const KART_AGIRLIK = { antiDesen: 0.45, kurallar: 0.3, ne: 0.25 } as const;

/** Kalemlerin YAŞAMA önceliği: dar payda önce anti-desen, sonra öz, en son kurallar
 *  yer bulur. Rezervasyon ve artan-akıtma bu sırayı izler. */
const KART_ONCELIK = ["antiDesen", "ne", "kurallar"] as const;
type KartKalem = (typeof KART_ONCELIK)[number];

/** Bir kaleme, basılmaya değmesi için verilmesi gereken asgari metin payı. Bunun
 *  altında kalan bir kalem okunabilir hiçbir şey söylemez; payı havuza döner. */
const KALEM_ASGARI_METIN = 12;

/** Daha zengin bir yazım kipine geçebilmek için üç kaleme bırakılması gereken toplam metin. */
const KART_ASGARI_METIN = 3 * KALEM_ASGARI_METIN;

/** Metni verilen karakter sınırına indirir; kesilen metin üç noktayla biter (saf). */
function kirp(metin: string, sınır: number): string {
  if (sınır <= 0) return "";
  if (metin.length <= sınır) return metin;
  return metin.slice(0, Math.max(0, sınır - 1)).trimEnd() + "…";
}

/** Kart başlığını kurar (saf). `sade` verilince kaynak ekleri (⚙️ Etmen · ⚡ Tetikleyici)
 *  düşer — bunlar köken bilgisidir ve dar payda içeriğe yer açmak için ilk bırakılır. */
function beceriBasligi(b: BeceriÖzet, damga: string, ne: string, sade = false): string {
  const ek = sade ? "" : `${b.etmen ? ` ⚙️${b.etmen}` : ""}${b.tetikleyici ? ` ⚡${b.tetikleyici}` : ""}`;
  return `### ${b.kod}${ek}${b.çözüldü ? "" : " (⚠️ çözülmedi)"}${damga}${ne ? `: ${ne}` : ""}`;
}

/** Kartın kırpılmamış tam gövdesini satır satır üretir (saf). */
function beceriKartiTam(b: BeceriÖzet): string[] {
  const kart: string[] = [beceriBasligi(b, "", b.ne)];
  if (b.kurallar) kart.push(`- Kurallar: ${b.kurallar}`);
  if (b.antiDesen) kart.push(`- Anti-desen (KAÇIN): ${b.antiDesen}`);
  if (b.örnek) kart.push(`- Örnek: ${b.örnek}`);
  return kart;
}

/** Kartın kırpılmamış tam gövdesinin karakter boyu — adil pay hesabının girdisi (saf). */
export function beceriKartiTamBoyu(b: BeceriÖzet): number {
  return beceriKartiTam(b).join("\n").length;
}

/**
 * Kartların tavanı nasıl bölüşeceğini hesaplar (saf · max-min adil pay).
 * Kartlar ihtiyaçlarına göre küçükten büyüğe sıralanır; her kart ya tam boyunu ya
 * da kalan bütçenin kalan kart sayısına bölümünü alır. Küçük kartın harcamadığı
 * bütçe büyük kartlara akar, fakat hiçbir kart bir başkasının payını yiyemez.
 * Dönen dizi girdi sırasıyla hizalıdır ve toplamı tavanı aşmaz (determinizm).
 *
 * TEK BÜTÇE MEKANİZMASI: bu hesap beceri bölmesine özel değildir; referans bölmesi
 * de AYNI işlevi kendi tavanıyla çağırır. Prompt'ta ikinci bir bütçe
 * aritmetiği yoktur — bölmeye giren şey değişir, adil pay kuralı değişmez.
 */
export function adilPaylarHesapla(
  boylar: readonly number[],
  tavan: number = BECERI_BOLME_TAVANI,
): number[] {
  const paylar = new Array<number>(boylar.length).fill(0);
  if (!boylar.length) return paylar;
  const sıra = boylar.map((boy, sıraNo) => ({ boy, sıraNo }))
                     .sort((a, b) => a.boy - b.boy || a.sıraNo - b.sıraNo);
  let kalanBütçe = Math.max(0, tavan);
  let kalanKart = boylar.length;
  for (const { boy, sıraNo } of sıra) {
    const eşitPay = Math.floor(kalanBütçe / kalanKart);
    const verilen = Math.min(boy, eşitPay);
    paylar[sıraNo] = verilen;
    kalanBütçe -= verilen;
    kalanKart -= 1;
  }
  return paylar;
}

/**
 * Bir beceri kartını payına sığdırır (saf). Payı yetiyorsa kart TAM basılır.
 *
 * Yetmiyorsa kart, ucuzdan pahalıya doğru feda eder: ① `örnek` tümüyle düşer,
 * ② uzun damga kısa ✂️ işaretine iner, ③ başlıktaki kaynak ekleri (⚙️ Etmen ·
 * ⚡ Tetikleyici) düşer, ④ etiketler sıkışık biçime iner, ⑤ kalan metin bütçesi
 * kalemlere dağıtılır. Dağıtımda önce her kalemin ETİKET MALİYETİ ödenir, sonra
 * kalan metin ağırlıkça bölüşülür: böylece uzun etiketli anti-desen, kısa etiketli
 * kurallardan önce ölmez. Etiketini bile karşılayamayan kalem hiç basılmaz ve payı
 * havuza geri döner — bütçe boşa gitmez. Yaşama sırası: anti-desen → öz → kurallar.
 *
 * Pay bir başlığı bile taşımıyorsa başlığın kendisi kırpılır; kart gövdesi hiçbir
 * koşulda payı aşmaz (tavan iddiası kart sayısından bağımsız doğrudur).
 */
export function beceriKartiUret(b: BeceriÖzet, pay: number): { satırlar: string[]; kırpıldı: boolean } {
  const tam = beceriKartiTam(b);
  if (tam.join("\n").length <= pay) return { satırlar: tam, kırpıldı: false };

  const dolular = KART_ONCELIK.filter((ad) => b[ad].length > 0);
  // Yazım kipleri zenginden yalına: ilk SIĞAN kip seçilir (deterministik).
  const kipler = [
    { sade: false, damga: uzunKirpmaDamgasi(b.kod), etiket: TAM_ETIKET },
    { sade: false, damga: KISA_KIRPMA_DAMGASI, etiket: TAM_ETIKET },
    { sade: true, damga: KISA_KIRPMA_DAMGASI, etiket: TAM_ETIKET },
    { sade: true, damga: KISA_KIRPMA_DAMGASI, etiket: SIKISIK_ETIKET },
  ];
  const sığar = (kip: (typeof kipler)[number]): boolean =>
    beceriBasligi(b, kip.damga, "", kip.sade).length +
    dolular.reduce((t, ad) => t + kip.etiket[ad].length, 0) + KART_ASGARI_METIN <= pay;
  const kip = kipler.find(sığar) ?? kipler[kipler.length - 1];

  const başlık = beceriBasligi(b, kip.damga, "", kip.sade);
  if (başlık.length >= pay) return { satırlar: [kirp(başlık, pay)], kırpıldı: true };
  let kalan = pay - başlık.length;

  // ① Etiket + asgari metin, YAŞAMA sırasına göre rezerve edilir. Karşılayamayan
  //    kalem hiç seçilmez; payı havuzda kalır ve sonraki kalemlere/artana akar.
  const verilen = new Map<KartKalem, number>();
  for (const ad of dolular) {
    const gerek = kip.etiket[ad].length + Math.min(KALEM_ASGARI_METIN, b[ad].length);
    if (kalan < gerek) continue;
    verilen.set(ad, gerek);
    kalan -= gerek;
  }
  const seçilen = [...verilen.keys()];
  // ② Kalan metin ağırlıkça bölüşülür (etiket maliyeti zaten ödendi) · ③ artan
  //    yaşama sırasına akar. Tamsayı aritmetiği: aynı paket aynı kartı üretir.
  const ağırlıkToplamı = seçilen.reduce((t, ad) => t + KART_AGIRLIK[ad], 0) || 1;
  const havuz = kalan;
  const ihtiyaç = (ad: KartKalem): number => kip.etiket[ad].length + b[ad].length;
  for (const ad of seçilen) {
    const ek = Math.min(ihtiyaç(ad) - verilen.get(ad)!, Math.floor((havuz * KART_AGIRLIK[ad]) / ağırlıkToplamı));
    if (ek > 0) { verilen.set(ad, verilen.get(ad)! + ek); kalan -= ek; }
  }
  for (const ad of seçilen) {
    if (kalan <= 0) break;
    const ek = Math.min(ihtiyaç(ad) - verilen.get(ad)!, kalan);
    if (ek > 0) { verilen.set(ad, verilen.get(ad)! + ek); kalan -= ek; }
  }
  const metinPayı = (ad: KartKalem): number => (verilen.get(ad) ?? 0) - kip.etiket[ad].length;

  const satırlar: string[] = [
    beceriBasligi(b, kip.damga, verilen.has("ne") ? kirp(b.ne, metinPayı("ne")) : "", kip.sade),
  ];
  if (verilen.has("kurallar")) {
    satırlar.push(kip.etiket.kurallar.slice(1) + kirp(b.kurallar, metinPayı("kurallar")));
  }
  if (verilen.has("antiDesen")) {
    satırlar.push(kip.etiket.antiDesen.slice(1) + kirp(b.antiDesen, metinPayı("antiDesen")));
  }
  return { satırlar, kırpıldı: true };
}

// ── REFERANS BÖLMESİ: HÜKMÜ TAŞI, BÜTÇEYİ BECERİYLE AYNI KURALLA BÖL ─────────
//
//   Bölme, beceri bölmesinin üç şartını AYNEN uygular ve pay hesabı için AYNI
//   `adilPaylarHesapla` işlevini çağırır (ikinci bir bütçe aritmetiği yoktur):
//   ① tavan aşılmaz — başlık dahil hiçbir şey payın dışında değildir;
//   ② hedef susturulmaz — HÜKÜM en son bırakılır, gerekçe ilk feda edilir;
//   ③ kırpma sessiz değildir — kırpılan hedef ✂️ damgasıyla kırpıldığını söyler
//      ve tam metni `gezin <KOD>` ile açılır (beceri kartındaki adresin aynısı).
//   Referans ve bağımlılık kenarları TEK havuzu paylaşır: ikisi de aynı Adım'ın
//   bağlam bütçesinden yer alır, ayrı tavan ikisini de yanlış ölçerdi.

/** Referans bölmesinin karakter tavanı — beceri tavanıyla aynı büyüklükte tutulur:
 *  bir Adım'ın bağlayıcı hükümleri, o Adıma enjekte edilen reçetelerden daha az
 *  değerli değildir. Tavan DEĞİŞMEZ; kenarlar adil payla bölüşür. */
export const REFERANS_BOLME_TAVANI = 4000;

/** Kırpma bölümünün tek seferlik açıklaması (bölme başlığının altında, bütçe dışı). */
const REFERANS_KIRPMA_NOTU =
  "> ✂️ damgalı hedefler referans bütçesinin adil payına sığmadığı için kırpıldı; " +
  "hedefin tam metnini `gezin <KOD>` ile açabilirsin.";

/** Bağlayıcı metnin etiketi kenarın türüne göre değişir: referans HÜKÜM taşır
 *  (bağlayıcıdır), bağımlılık ise zemin cümlesini taşır (`ne:`). */
const refKalemEtiketi = (r: RefCozum): string => (r.tür === "bağımlılık" ? "\n- Ne: " : "\n- Hüküm: ");
const REF_GEREKCE_ETIKETI = "\n- Gerekçe: ";

/** Referans kartının başlığı: kimlik · tip · kaynak dosya (+ kırpma damgası). */
function referansBasligi(r: RefCozum, damga: string): string {
  const tip = r.tip ? ` · ${r.tip}` : "";
  const yer = r.dosya ? ` · ${r.dosya}` : "";
  const durum = r.çözüldü ? "" : " (⚠️ çözülmedi — hedef hiçbir `.sar` kaynağında yok)";
  return `### ${r.kod}${tip}${yer}${durum}${damga}`;
}

/** Kırpılmamış tam referans kartı (saf). */
function referansKartiTam(r: RefCozum): string[] {
  const kart: string[] = [referansBasligi(r, "")];
  if (r.hüküm) kart.push(refKalemEtiketi(r).slice(1) + r.hüküm);
  if (r.gerekçe) kart.push(REF_GEREKCE_ETIKETI.slice(1) + r.gerekçe);
  return kart;
}

/** Kartın tam gövdesinin karakter boyu — adil pay hesabının girdisi (saf). */
export function referansKartiTamBoyu(r: RefCozum): number {
  return referansKartiTam(r).join("\n").length;
}

/**
 * Bir referans kartını payına sığdırır (saf). Payı yetiyorsa kart TAM basılır.
 *
 * Yetmiyorsa feda sırası ucuzdan pahalıya: ① uzun kırpma damgası kısa ✂️ işaretine
 * iner, ② gerekçe payın artanına düşer (hiç yer kalmazsa hiç basılmaz), ③ en son
 * hüküm kırpılır. Hüküm SUSTURULMAZ: pay bir başlığı taşıyabildiği sürece hükmün
 * en az bir okunur parçası basılır. Pay başlığı bile taşımıyorsa başlık kırpılır ve
 * kart gövdesi hiçbir koşulda payı aşmaz (tavan iddiası kenar sayısından bağımsızdır).
 */
export function referansKartiUret(r: RefCozum, pay: number): { satırlar: string[]; kırpıldı: boolean } {
  const tam = referansKartiTam(r);
  if (tam.join("\n").length <= pay) return { satırlar: tam, kırpıldı: false };

  const etiketH = refKalemEtiketi(r);
  const uzun = uzunKirpmaDamgasi(r.kod);
  // ① Uzun damga ancak hükmün okunur bir parçasını da bırakabiliyorsa yaşar.
  const damga = referansBasligi(r, uzun).length + etiketH.length + KALEM_ASGARI_METIN <= pay
    ? uzun : KISA_KIRPMA_DAMGASI;
  const başlık = referansBasligi(r, damga);
  if (başlık.length >= pay) return { satırlar: [kirp(başlık, pay)], kırpıldı: true };

  let kalan = pay - başlık.length;
  const satırlar = [başlık];
  // ③ Hüküm önce doyar — bağlayıcı cümle kartın var oluş sebebidir.
  if (r.hüküm && kalan >= etiketH.length + Math.min(KALEM_ASGARI_METIN, r.hüküm.length)) {
    const yer = Math.min(r.hüküm.length, kalan - etiketH.length);
    satırlar.push(etiketH.slice(1) + kirp(r.hüküm, yer));
    kalan -= etiketH.length + yer;
  }
  // ② Gerekçe yalnız ARTAN paya yerleşir.
  if (r.gerekçe && kalan >= REF_GEREKCE_ETIKETI.length + KALEM_ASGARI_METIN) {
    satırlar.push(REF_GEREKCE_ETIKETI.slice(1) + kirp(r.gerekçe, kalan - REF_GEREKCE_ETIKETI.length));
  }
  return { satırlar, kırpıldı: true };
}

/** Meyve satırı: kod · tür → hedef yol (ya da türün anlamı) + kısaltılmış `ne` (saf).
 *  Yol ASLA kırpılmaz — bölmenin bütün varlık sebebi odur. */
function meyveSatiri(m: MeyveÖzet): string {
  const hedef = m.yol
    ? `\`${m.yol}\`${m.yolKaynağı === "ne" ? " (yol `ne:` cümlesinden okundu — `dosya:` beyanı eksik)" : ""}`
    : (m.anlam ?? "—");
  return `- **${m.kod}** · ${m.tür} → ${hedef}${m.ne ? `\n  - ${m.ne}` : ""}`;
}

/**
 * Bağlam paketinden prompt üretir (saf).
 * WF-ORCH §6 parantezleme: kritik kısıtlar (dokunulmaz+sınır) BAŞTA, görev ortada,
 * kısa kabul/dokunulmaz özeti SONDA ("lost in the middle" karşı). TPL-023 guard gömülü.
 */
export function promptUret(paket: BaglamPaket): string {
  const k = paket.koni;
  const s: string[] = [];
  // BAŞ — parantezin açılışı: kritik kısıtlar + guard
  s.push(`# 🍂 Adım: ${paket.adimKod}`, "");
  s.push("## 🚧 Kritik Kısıtlar (ÖNCE OKU)");
  s.push(`- Dokunulmaz: ${bos(k.dokunulmaz) ? "—" : k.dokunulmaz}`);
  s.push(`- Sınır: ${bos(k.sınır) ? "—" : k.sınır}`, "");
  s.push(GUARD, "");
  // ORTA — görev + koni gövdesi
  s.push("## 🎯 Görev", bos(k.görev) ? "(tanımsız)" : k.görev, "");
  // İkinci kusur: meyvenin kodu, türü ve HEDEF YOLU ayrı ayrı basılır. Eskiden bu
  // başlığın altına koninin ham `üretir` metni düşüyordu ve satır-içi meyve orada
  // `Veri(…)` diye görünüyordu: ajan "bunu üret" emrini alıp nereye üreteceğini
  // göremiyordu. Meyve çözülemezse ham metne düşülür (geriye uyum).
  if (paket.meyveler?.length) {
    s.push("## 🍎 Üretir (BUNU üret · üretim-yeri)");
    for (const m of paket.meyveler) s.push(meyveSatiri(m));
    s.push("");
  } else if (!bos(k.üretir)) {
    s.push("## 🍎 Üretir (BUNU üret · üretim-yeri)", k.üretir, "");
  }
  if (!bos(k.kabul)) s.push("## ✅ Kabul Ölçütü", k.kabul, "");
  // Birinci kusur: referans ve bağımlılık bölmeleri artık KOD LİSTESİ değil, hedefin
  // kendi metnidir. İki bölme TEK bütçe havuzunu paylaşır ve pay hesabı beceri
  // bölmesiyle aynı işlevden gelir; kırpılan hedef ✂️ damgasıyla adresini söyler.
  // Pay vektörü BİR KEZ, iki bölmenin kenarları üzerinden hesaplanır: referans ile
  // bağımlılık aynı Adım'ın aynı bütçesinden yer alır, ayrı tavan ikisini de yanlış ölçerdi.
  const kenarPaylari = adilPaylarHesapla(paket.referanslar.map(referansKartiTamBoyu), REFERANS_BOLME_TAVANI);
  const kenarBölmesi = (tür: RefCozum["tür"], başlık: string, ham: string): void => {
    const seçili = paket.referanslar.filter((r) => r.tür === tür);
    if (!seçili.length) { if (!bos(ham)) s.push(başlık, ham, ""); return; }
    const paylar = kenarPaylari;
    const gövde: string[] = [];
    let kırpılanVar = false;
    paket.referanslar.forEach((r, i) => {
      if (r.tür !== tür) return;
      const { satırlar, kırpıldı } = referansKartiUret(r, paylar[i]);
      kırpılanVar = kırpılanVar || kırpıldı;
      gövde.push(...satırlar);
    });
    s.push(başlık);
    if (kırpılanVar) s.push(REFERANS_KIRPMA_NOTU);
    s.push(...gövde, "");
  };
  kenarBölmesi("referans", "## 📎 Referans (hedefin HÜKMÜ — bağlayıcıdır, kod değil metin okunur)", k.referans);
  kenarBölmesi("bağımlılık", "## 🔗 Bağımlılık (üstüne inşa ettiğin zemin)", k.bağımlı);
  // EKL-F10-A12 (STR-4): Founder'ın hedefe ve zeminine yazdığı kanallar. Bölüm yalnız
  // kanal varken doğar; ajan hangi davranışın takdir edildiğini ya da neyin daha
  // iyi yapılması istendiğini kaynaktan okur, iddiadan değil.
  if (paket.geribildirim?.length) {
    s.push("## ❤️ Founder Geribildirimi (STR-4 — takdir edilen davranışı sürdür, öneriyi uygula)");
    for (const g of paket.geribildirim) s.push(`- ${g.adım} · ${g.kanal}: ${g.not}`);
    s.push("");
  }
  // Önceki Durak (D.3): çok-adımlı akışta bir önceki Adım'ın durum-devri (handoff)
  if (paket.öncekiDurak) {
    const d = paket.öncekiDurak;
    s.push("## ⏮️ Önceki Durak (bağlam — devralınan durum)");
    s.push(`- ${d.adım}: ${d.karar} · mühür: ${d.mühür}`);
    if (!bos(d.özet)) s.push(`- Durum: ${d.özet}`);
    if (d.kanıt && !bos(d.kanıt)) s.push(`- Kanıt: ${d.kanıt}`);
    if (d.ertelenenler.length) s.push(`- ⏭️ Devralınan açık kalemler: ${d.ertelenenler.join(" · ")}`);
    s.push("");
  }
  // Beceriler (D.2): kullanır: BCR-… çözümleri — kurallar + anti-desen prompt'a.
  // davranış-katmanı turu (OGR-2.2): bölme TAVANLIDIR ve tavan ADİL PAYLA bölüşülür. Her ateşleyen
  // kart kendi payını alır; payına sığmayan kart kırpılır fakat susturulmaz —
  // adı, özü, kuralının özeti ve anti-deseni her koşulda geçer, başlığındaki ✂️
  // damgası kırpıldığını ve tam metnin adresini söyler. Sıralama paket sırasıdır
  // ve pay hesabı tamsayıdır: aynı paket aynı prompt'u üretir (determinizm).
  if (paket.beceriler.length) {
    s.push("## 🛠️ Beceriler (kurallara UY · anti-deseni KAÇIN)");
    const paylar = adilPaylarHesapla(paket.beceriler.map(beceriKartiTamBoyu), BECERI_BOLME_TAVANI);
    const gövde: string[] = [];
    let kırpılanVar = false;
    paket.beceriler.forEach((b, i) => {
      const { satırlar, kırpıldı } = beceriKartiUret(b, paylar[i]);
      kırpılanVar = kırpılanVar || kırpıldı;
      gövde.push(...satırlar);
    });
    if (kırpılanVar) s.push(KART_KIRPMA_NOTU);
    s.push(...gövde, "");
  }
  // KVR-A08: kavram rehberi — ÖNERİ bölümü (dayatma değil); boş bileşende hiç basılmaz.
  // Token disiplini: üyeler yalnız yol+flutter; bütçe aşımında ilk kırpılacak aday budur.
  if (paket.kavramÖnerileri?.length) {
    s.push("## 🗺️ Kavram Rehberi (öneri — dayatma değil)");
    s.push("Kullanıcının niyeti belirsizse aşağıdaki aile sorularını kullan ve seçilen kavramı koniye KANON YOLUYLA yaz. Tam eşlemeler için MCP `kavram` sorgusunu kullan.");
    for (const ö of paket.kavramÖnerileri) {
      s.push(`### ${ö.aile} [${ö.bağlam}]${ö.soru ? ` — ${ö.soru}` : ""}`);
      if (ö.üyeler.length) s.push(`- ${ö.üyeler.map((u) => `${u.yol}${u.flutter ? ` (${u.flutter})` : ""}`).join(" · ")}`);
    }
    s.push("");
  }
  if (paket.referanslar.length) {
    s.push("## 🧭 Çözülen bağlar");
    for (const r of paket.referanslar) s.push(`- ${r.tür}: ${r.kod} → ${r.çözüldü ? `✓ ${r.dosya}` : "✗ çözülmedi"}`);
    s.push("");
  }
  // hatırlatıcı-rayı turu (BUG-1 · TIP-1.12): hedefe `hatırlat` eden Hatırlatıcılar — kapanıştan HEMEN
  // önce (yüksek-dikkat bölge): "hedef aktif oldu, bağlam koniye düştü". İleri-bağlamanın
  // asıl teslim noktası; global Problems listesinde kalmıyor artık.
  if (paket.hatırlatıcılar.length) {
    s.push("## 🔔 Bağlı Hatırlatıcılar (hedef aktif — bağlam düştü)");
    for (const h of paket.hatırlatıcılar) s.push(`- ${h.kod} [${h.öncelik}·${h.çapa}]: ${bos(h.ne) ? "—" : h.ne}`);
    s.push("");
  }
  // SON — parantezin kapanışı: kritik-kısıt özeti (görevden hemen önce, yüksek dikkat)
  s.push("---", "## 🔁 Kritik-kısıt özeti (son)");
  s.push(`- Kabul: ${bos(k.kabul) ? "—" : k.kabul}`);
  s.push(`- Dokunulmaza dokunma: ${bos(k.dokunulmaz) ? "—" : k.dokunulmaz}`);
  return s.join("\n");
}

// ── ETKİLİ CLI KABUĞU ───────────────────────────────────────────────────────

const TOKEN_BUTCE = 20000; // wf-context: bileşen bütçesi toplamı ~20k

/** Bir dizindeki tüm .sar'ları parse edip program haritası kurar (etkili; parse-olmayanı atlar).
 *  denetci.programlariYukle ile TEK ortak yükleyici (Ö.1 DRY); sef linter değil —
 *  sözdizim hatalarını (hatalar) yok sayar, yalnız parse-olanları döndürür. */
export function programHaritasi(dizin: string): ReadonlyMap<string, Program> {
  return programlariYukle(dizin).programlar;
}

/** programHaritasi'nın muafiyet kümesini de veren kardeşi (V1B-RBAC-A01).
 *  Kapsam süzgeci uygulayacak çağıranın muaf ("bilerek-hatalı") listesine de
 *  ihtiyacı vardır; programHaritasi onu düşürdüğü için ayrı bir yüz gerekir. */
export function programVeMuaflar(
  dizin: string,
): { programlar: ReadonlyMap<string, Program>; muaflar: ReadonlySet<string> } {
  const { programlar, muaflar } = programlariYukle(dizin);
  return { programlar, muaflar };
}

/** `sarmal sef <ADIM-KOD> [dizin]` — dizindeki .sar'ları parse edip Adım'ın prompt+token raporunu basar. */
export function sefKomutu(dizin: string, adimKod: string): number {
  const programlar = programHaritasi(dizin);
  const paket = baglamMontajla(programlar, adimKod, undefined, undefined, kavramVerisiYukle());
  if (!paket) {
    console.error(`✖ '${adimKod}' kodlu Adım bulunamadı (${programlar.size} .sar tarandı).`);
    return 4;
  }
  const prompt = promptUret(paket);
  const toplam = tokenSay(prompt);
  console.log(prompt);
  console.log("\n" + "─".repeat(60));
  console.log(`📊 Token (yaklaşık ~4kr/token): görev ${tokenSay(paket.koni.görev)} · prompt-toplam ${toplam} · bütçe ~${TOKEN_BUTCE}`);
  // Öncelik-kırpma (görev>koni>referans) büyük bileşenler (anayasa/bellek/profil)
  // eklenince aktifleşir — sonraki aşama. Şimdilik yalnız uyarı.
  if (toplam > TOKEN_BUTCE) console.log("⚠️ Bütçe aşıldı — öncelik-kırpma gerekir (sonraki aşama).");
  return 0;
}

// ═══════════════════════════════════════════════════════════════════════════
// prizma-md.ts — 🔺 PRİZMANIN MARKDOWN YÜZÜ (KYN-KYN-A05 · YUZ-1 · YUZ-1.3)
//
//   Prizmanın dördüncü yüzü insana bakar. JSON, YAML ve XML yüzleri gibi bu yüz
//   de kaynağı yeniden yorumlamaz: tek parse → tek nötr ağaç (`yalınla`) → bu
//   kodlayıcı. Ham kaynak kod bloğuna sarılmaz; düğüm alanları okunur bir yapıya
//   çevrilir ve belge blokları düz Markdown olarak akar.
//
//   KAPSAM KARARI (düğüm → Markdown):
//     düğüm başlığı      → `#…` başlık: `Tip · KOD · ad` (ad yoksa kısa `ne`);
//                          derinlik kök sayısına göre başlar, 6'yı aşınca kalın satır.
//                          Belge bloğu kendi başlığını taşıyorsa (ilk satır `#`
//                          ve KOD'u içerir) sentetik başlık basılmaz.
//     kimlik çapası      → başlıktan önce `<a id="KOD"></a>` (bağlantı hedefi).
//     belge bloğu        → düz Markdown (belgele.ts `belgeGovdesiMd`: <şekil>
//                          kod çitine, bölüm etiketleri alt başlığa iner).
//     kısa alanlar       → `| Alan | Değer |` tablosu (kaynak sırası korunur).
//     uzun metin alanı   → kalın etiket + paragraf; uzun metin listesi → madde listesi.
//     kimlik değeri      → aynı dosyada tanımlıysa `[KOD](#KOD)` bağlantısı,
//                          değilse satır içi `KOD` kodu.
//     belgede aynen geçen metin alanı → tabloda `*(belge bloğunda)*` (iki kez basılmaz).
//     kodlu çocuklar ≥2  → çocuk dizini tablosu (Kod · Tip · Ad · Durum), sonra
//                          her çocuk kendi bölümünde bir kademe derin başlıkla.
//     `çağır` düğümü     → madde satırı: **çağır** → hedef bağlantısı.
//     iç içe widget değeri → satır içi `Tip KOD` özeti.
//     `//` yorumları     → yüze girmez (yorum kaynağın kendi notudur, düğüm değildir).
//
//   İDEMPOTENS (YUZ-1.3): çıktı yalnız kaynağın saf fonksiyonudur; saat, rastgele
//   sayı, ortam ya da dosya yolu okunmaz. Nöbet: sinama/prizma-md.test.ts (altın
//   çıktı + iki ayrı süreçte bayt bayt eşitlik).
// ═══════════════════════════════════════════════════════════════════════════

import { belirtecle } from "./belirtec.ts";
import { ayristir } from "./ayristirici.ts";
import { belgeGovdesiMd } from "./belgele.ts";
import { yalınla, type YalınDeğer, type YalınDüğüm } from "./prizma.ts";

/** Tabloya sığan değerin üst sınırı (kod noktası); üstü paragraf olarak akar. */
const KISA_SINIR = 120;
/** Çocuk dizinindeki özet sütununun üst sınırı (kod noktası). */
const OZET_SINIR = 80;
const KOD_DESENI = /^[A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜ0-9]*(-[A-ZÇĞİÖŞÜ0-9]+)*(\.[0-9]+){0,2}$/u;

interface Baglam {
  /** Bu kaynakta tanımlı kimlikler — bağlantı yalnız bunlara verilir. */
  readonly kodlar: ReadonlySet<string>;
}

function uzunluk(s: string): number {
  return Array.from(s).length;
}

function kisalt(s: string, sinir: number): string {
  const harfler = Array.from(s);
  return harfler.length <= sinir ? s : harfler.slice(0, sinir - 1).join("").trimEnd() + "…";
}

/** Alan adının ilk harfini Türkçe kurala göre büyütür (görüntü etiketi). */
function etiket(ad: string): string {
  const [ilk, ...kalan] = Array.from(ad);
  return ilk ? ilk.toLocaleUpperCase("tr") + kalan.join("") : ad;
}

function hucreKacis(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>");
}

function satirTek(s: string): string {
  return s.replace(/\s*\r?\n\s*/g, " ");
}

/** Kimlik değeri: tanımlıysa bağlantı, kod biçimindeyse satır içi kod, değilse düz. */
function kodYaz(s: string, b: Baglam): string {
  if (b.kodlar.has(s)) return `[${s}](#${s})`;
  if (KOD_DESENI.test(s) && uzunluk(s) >= 2) return `\`${s}\``;
  return s;
}

function widgetMi(v: YalınDeğer): v is YalınDeğer & { tip: string; alanlar: Record<string, YalınDeğer> } {
  return typeof v === "object" && v !== null && !Array.isArray(v)
    && typeof (v as Record<string, YalınDeğer>).tip === "string"
    && typeof (v as Record<string, YalınDeğer>).alanlar === "object";
}

/** Değerin tek satırlık (tablo hücresi) gösterimi. */
function satirIci(v: YalınDeğer, b: Baglam): string {
  if (v === null) return "—";
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (typeof v === "string") return v === "" ? "—" : kodYaz(satirTek(v), b);
  if (Array.isArray(v)) return v.length === 0 ? "—" : v.map((e) => satirIci(e, b)).join(", ");
  if (widgetMi(v)) {
    const kod = typeof (v as Record<string, YalınDeğer>).kod === "string" ? (v as Record<string, YalınDeğer>).kod as string : "";
    return kod ? `${v.tip} ${kodYaz(kod, b)}` : v.tip;
  }
  const ciftler = Object.keys(v).map((k) => `${k}: ${satirIci(v[k], b)}`);
  return ciftler.length ? ciftler.join(" · ") : "—";
}

/** Değer tabloya mı sığar, yoksa paragraf/liste olarak mı akmalı? */
function kisaMi(v: YalınDeğer): boolean {
  if (typeof v === "string") return !v.includes("\n") && uzunluk(v) <= KISA_SINIR;
  // Liste tabloya yalnız kimlik benzeri (boşluksuz) öğeler taşıyorsa girer;
  // cümle taşıyan liste (görev, kabul) madde listesi olarak akar.
  if (Array.isArray(v)) return v.every((e) => typeof e !== "string" || !/\s/.test(e))
    && uzunluk(v.map((e) => (typeof e === "string" ? e : JSON.stringify(e))).join(", ")) <= KISA_SINIR * 2;
  return true;
}

function baslikSatiri(duzey: number, metin: string): string {
  return duzey <= 6 ? `${"#".repeat(duzey)} ${metin}` : `**${metin}**`;
}

/** Başlık için kullanılacak alan: önce `ad` (widget'ta), yoksa kısa ve tek satırlık `ne`. */
function baslikAlani(n: YalınDüğüm): string | undefined {
  const ad = n.alanlar["ad"];
  if (n.tip !== "çağır" && typeof ad === "string" && ad !== "" && !ad.includes("\n")) return "ad";
  const ne = n.alanlar["ne"];
  if (typeof ne === "string" && ne !== "" && !ne.includes("\n") && uzunluk(ne) <= KISA_SINIR) return "ne";
  return undefined;
}

/** Belge bloğu kendi başlığını taşıyor mu (ilk dolu satır `#` ile başlar ve KOD'u içerir)? */
function belgeBaslikli(n: YalınDüğüm): boolean {
  if (!n.belge || n.kod === undefined) return false;
  const ilk = n.belge.split("\n").find((s) => s.trim() !== "")?.trim() ?? "";
  return /^#{1,6}\s/.test(ilk) && ilk.includes(n.kod);
}

/** Düğümün kısa özeti (çocuk dizini için). */
function ozet(n: YalınDüğüm): string {
  const ad = n.alanlar["ad"];
  if (typeof ad === "string" && ad !== "") return kisalt(satirTek(ad), OZET_SINIR);
  const ne = n.alanlar["ne"];
  if (typeof ne === "string" && ne !== "") return kisalt(satirTek(ne), OZET_SINIR);
  return "—";
}

function cocukDizini(cocuklar: readonly YalınDüğüm[], b: Baglam): string | undefined {
  const kodlu = cocuklar.filter((c) => c.kod !== undefined);
  if (kodlu.length < 2) return undefined;
  const durumlu = kodlu.some((c) => typeof c.alanlar["durum"] === "string");
  const bas = durumlu ? "| Kod | Tip | Ad | Durum |\n|---|---|---|---|" : "| Kod | Tip | Ad |\n|---|---|---|";
  const satirlar = kodlu.map((c) => {
    const hucreler = [kodYaz(c.kod as string, b), c.tip, ozet(c)];
    if (durumlu) hucreler.push(typeof c.alanlar["durum"] === "string" ? c.alanlar["durum"] as string : "—");
    return `| ${hucreler.map(hucreKacis).join(" | ")} |`;
  });
  return `${bas}\n${satirlar.join("\n")}`;
}

/** Uzun alan: kalın etiket + paragraf ya da madde listesi. */
function uzunAlan(ad: string, v: YalınDeğer, b: Baglam): string {
  if (Array.isArray(v)) {
    const maddeler = v.map((e) => {
      const metin = typeof e === "string" ? e : satirIci(e, b);
      // Çok satırlı madde: sonraki satırlar madde girintisiyle hizalanır.
      return `- ${metin.split("\n").map((s, i) => (i === 0 || s === "" ? s : `  ${s}`)).join("\n")}`;
    });
    return `**${etiket(ad)}**\n\n${maddeler.join("\n")}`;
  }
  return `**${etiket(ad)}**\n\n${typeof v === "string" ? v : satirIci(v, b)}`;
}

/** Çit dışındaki `#` başlıklarını en sığı `hedef` kademesine düşecek biçimde kaydırır. */
function basliklariKaydir(md: string, hedef: number): string {
  const satirlar = md.split("\n");
  let cit: string | undefined;
  const baslikSatiri: boolean[] = satirlar.map((s) => {
    const c = /^(`{3,}|~{3,})/.exec(s);
    if (c) {
      if (cit === undefined) cit = c[1];
      else if (s.startsWith(cit)) cit = undefined;
      return false;
    }
    return cit === undefined && /^#{1,6}\s/.test(s);
  });
  let enSig = 7;
  satirlar.forEach((s, i) => { if (baslikSatiri[i]) enSig = Math.min(enSig, /^#+/.exec(s)![0].length); });
  if (enSig === 7) return md;
  const fark = hedef - enSig;
  if (fark === 0) return md;
  return satirlar.map((s, i) => {
    if (!baslikSatiri[i]) return s;
    const eski = /^#+/.exec(s)![0].length;
    const yeni = Math.max(1, eski + fark);
    const metin = s.slice(eski).trimStart();
    return yeni <= 6 ? `${"#".repeat(yeni)} ${metin}` : `**${metin}**`;
  }).join("\n");
}

function dugumMd(n: YalınDüğüm, duzey: number, b: Baglam): string {
  if (n.tip === "çağır") {
    const hedef = typeof n.alanlar["ad"] === "string" ? n.alanlar["ad"] as string : "";
    return `- **çağır** → ${hedef ? kodYaz(hedef, b) : "—"}`;
  }

  const bloklar: string[] = [];
  const belgeBasligi = belgeBaslikli(n);
  const baslikAd = belgeBasligi ? undefined : baslikAlani(n);

  // Çapa yalnız başlık satırının hemen üstünde durur; ayrı satır olarak kalır.
  const capa = n.kod !== undefined ? `<a id="${n.kod}"></a>` : "";
  if (!belgeBasligi) {
    const parcalar = [n.tip];
    if (n.kod !== undefined) parcalar.push(n.kod);
    if (baslikAd) parcalar.push(satirTek(n.alanlar[baslikAd] as string));
    bloklar.push(`${capa ? capa + "\n\n" : ""}${baslikSatiri(duzey, parcalar.join(" · "))}`);
  } else if (capa) {
    bloklar.push(capa);
  }

  if (n.belge) {
    // Belgenin kendi başlıkları düğümün kademesine kaydırılır: başlıklı belge
    // düğüm kademesinden, başlıksız belge bir kademe derinden başlar.
    const govde = basliklariKaydir(belgeGovdesiMd(n.belge), belgeBasligi ? duzey : duzey + 1);
    if (govde.trim()) bloklar.push(govde);
  }

  const tablo: string[] = [];
  const uzunlar: string[] = [];
  for (const ad of Object.keys(n.alanlar)) {
    if (ad === baslikAd) continue;
    const v = n.alanlar[ad];
    // Yalnız düzyazı (boşluk taşıyan ve kimlikten uzun) metin tekilleştirilir;
    // `YUZ-1` ya da `anayasa` gibi kısa değerler belgede geçse de tabloda kalır.
    if (typeof v === "string" && n.belge && /\s/.test(v) && uzunluk(v) >= 24 && n.belge.includes(v)) {
      tablo.push(`| ${hucreKacis(ad)} | *(belge bloğunda)* |`);
      continue;
    }
    if (kisaMi(v)) tablo.push(`| ${hucreKacis(ad)} | ${hucreKacis(satirIci(v, b))} |`);
    else uzunlar.push(uzunAlan(ad, v, b));
  }
  if (tablo.length) bloklar.push(`| Alan | Değer |\n|---|---|\n${tablo.join("\n")}`);
  bloklar.push(...uzunlar);

  const cocuklar = n.çocuklar ?? [];
  const dizin = cocukDizini(cocuklar, b);
  if (dizin) bloklar.push(dizin);
  // Ardışık `çağır` satırları tek madde listesi olur (araya boş satır girmez).
  let i = 0;
  while (i < cocuklar.length) {
    if (cocuklar[i].tip === "çağır") {
      const liste: string[] = [];
      while (i < cocuklar.length && cocuklar[i].tip === "çağır") liste.push(dugumMd(cocuklar[i++], duzey + 1, b));
      bloklar.push(liste.join("\n"));
      continue;
    }
    bloklar.push(dugumMd(cocuklar[i++], duzey + 1, b));
  }
  return bloklar.join("\n\n");
}

function kodlariTopla(n: YalınDüğüm, hedef: Set<string>): void {
  if (n.kod !== undefined) hedef.add(n.kod);
  for (const c of n.çocuklar ?? []) kodlariTopla(c, hedef);
}

/**
 * `.sar` kaynağını okunur Markdown yüzüne yansıtır (saf — söz dizimi hatası
 * fırlatabilir). Aynı kaynak her koşuda bayt bayt aynı çıktıyı verir (YUZ-1.3).
 */
export function prizmaMd(kaynak: string): string {
  const kok = yalınla(ayristir(belirtecle(kaynak)));
  const kokler = Array.isArray(kok) ? kok : [kok];
  if (kokler.length === 0) return "*Boş .sar — henüz düğüm yok.*\n";
  const kodlar = new Set<string>();
  for (const k of kokler) kodlariTopla(k, kodlar);
  const b: Baglam = { kodlar };
  // Tek kök (ör. bir Faz dosyası) belgenin başlığıdır; çok kök (ör. kanon) eşit kardeştir.
  const ilkDuzey = kokler.length === 1 ? 1 : 2;
  const bloklar: string[] = [];
  let i = 0;
  while (i < kokler.length) {
    if (kokler[i].tip === "çağır") {
      const liste: string[] = [];
      while (i < kokler.length && kokler[i].tip === "çağır") liste.push(dugumMd(kokler[i++], ilkDuzey, b));
      bloklar.push(liste.join("\n"));
      continue;
    }
    bloklar.push(dugumMd(kokler[i++], ilkDuzey, b));
  }
  return bloklar.join("\n\n") + "\n";
}

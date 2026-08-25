// ═══════════════════════════════════════════════════════════════════════════
// dogus.ts — 🎁 DOĞUŞ PAKETİ YAZICISI (DPK-A02 · Founder 2026-07-17 · GOC-A10 · Founder 2026-08-23)
//
//   "flutter create" paritesi: boş dizinde tek komutla ÇALIŞIR proje doğar —
//   anadizin (MIM-3) + durum devri + öğrenme rafı + ilk plan (MIM-1 tam-zincir).
//   Şablonlar TEK kaynaktan okunur: ogreti/sablon/dogus/ (insan gözle açar,
//   düzenler; burada metin tutulmaz — YUZ-1.2). Yer-tutucular: {{AD}} ad ·
//   {{KOD}} koddan türetilmiş BÜYÜK kısaltma · {{TARIH}} doğum günü ·
//   {{PROJE}} / {{PROJEKOD}} çalışma alanının ilk projesi.
//
//   İKİ TÜR (GOC-A10 · Founder 2026-08-23): doğuş komutu artık "tek proje mi,
//   çalışma alanı mı" diye sorar. `proje` türünde hedef dizin doğrudan Proje
//   kökü olur; `calisma-alani` türünde hedef dizin ÇalışmaAlanı kökü olur ve
//   ilk proje onun altında kendi köküyle doğar (MIM-1.1: çalışma alanı en az
//   bir bağımsız Proje kökünü sarar). Soru metni CLI ile MCP'de aynı sestir.
//
//   Governance≠Compiler korunur: motor İSKELETİ yazar, NİYETİ insan/ajan
//   doldurur — doğan her dosya kendi doldurma öğretisini içinde taşır (YAS-3.4).
//   Dolu-dizin sözleşmesi (YUZ-1.3 ruhu): var olan dosya ASLA ezilmez, atlanır
//   ve rapor ne yapılmadığını açıkça söyler.
//
//   İki katman AYRIK (iskeletci.ts deseni):
//     dogusManifesti()  → saf; diske dokunmaz (test edilebilir)
//     dogusYaz()        → etkili; manifesti diske yazar (ezmez → atlar)
// ═══════════════════════════════════════════════════════════════════════════

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dilBaglami } from "./dil-baglami.ts";   // DPK-A03: ajan dil bağlamı — kanondan üretilir

const DOGUS_SABLON_KOK = fileURLToPath(new URL("../../../ogreti/sablon/dogus/", import.meta.url));

/** Doğuş türü: hedef dizin doğrudan Proje kökü mü, yoksa ÇalışmaAlanı kökü mü olur. */
export type DogusTuru = "proje" | "calisma-alani";
export const DOGUS_TURLERI: readonly DogusTuru[] = ["proje", "calisma-alani"];
/** Çalışma alanı seçilip proje adı verilmediğinde ilk projenin adı. */
export const VARSAYILAN_ILK_PROJE = "ilk_proje";

export interface DogusDosya {
  /** hedef köke göreli yol (POSIX). */
  yol: string;
  icerik: string;
}

export interface DogusSonuc {
  tur: DogusTuru;
  ad: string;
  kod: string;
  /** çalışma alanı türünde altında doğan ilk projenin adı; proje türünde tanımsız. */
  proje?: string;
  yazilan: string[];
  atlanan: string[];
}

/** Proje adından BÜYÜK kod kısaltması türetir: "bahçe projem" → "BAHCE-PROJEM". */
export function dogusKodu(ad: string): string {
  const ascii = ad
    .toLocaleLowerCase("tr")
    .replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ı/g, "i")
    .replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return (ascii || "proje").toUpperCase();
}

/** Addan dosya/klasör adı türetir: "Bahçe Projem" → "bahçe_projem" (DIL-1.2 alt çizgi ayracı). */
export function dogusDosyaAdi(ad: string): string {
  return ad
    .toLocaleLowerCase("tr")
    .replace(/[^a-zçğıöşü0-9]+/gu, "_")
    .replace(/^_+|_+$/g, "") || "proje";
}

/**
 * Serbest yazılmış tür cevabını çözer: "1", "proje", "tek" → proje; "2", "alan",
 * "çalışma alanı", "calisma-alani", "çatı" → calisma-alani; tanınmayan cevap tanımsız döner.
 */
export function dogusTuruCoz(ham: string | undefined): DogusTuru | undefined {
  if (ham === undefined) return undefined;
  const t = ham.trim().toLocaleLowerCase("tr").replace(/\s+/g, " ");
  if (["proje", "1", "tek", "tek proje", "tek-proje"].includes(t)) return "proje";
  if (["calisma-alani", "calisma alani", "çalışma alanı", "çalışma-alanı", "alan", "2", "çatı", "cati"].includes(t)) return "calisma-alani";
  return undefined;
}

/** Tür sorusunun metni — CLI ile MCP aynı sesi verir (YUZ-1.2 tek kaynak). */
export function dogusSorusu(): string {
  return [
    "❓ Ne doğsun? Doğuş komutu iki kademe bilir:",
    "   ① tek proje      — hedef dizin doğrudan Proje kökü olur: anadizin, durum devri, öğrenme rafı ve ilk plan.",
    "   ② çalışma alanı  — hedef dizin ÇalışmaAlanı kökü olur; ilk proje onun altında kendi köküyle doğar",
    "                      (MIM-1.1: çalışma alanı en az bir bağımsız Proje kökünü sarar, kimlikleri birleştirmez).",
    "   Seçim komut satırında --tur proje | --tur calisma-alani, MCP çağrısında tur alanıyla verilir;",
    "   çalışma alanında ilk projenin adı --proje <ad> (MCP: proje) ile seçilir, verilmezse " + VARSAYILAN_ILK_PROJE + " olur.",
  ].join("\n");
}

/** Şablon dosyasını okuyup yer-tutucuları doldurur. Dosya yoksa fırlatır (kurulum kusuru). */
function sablonDoldur(dosya: string, degerler: Readonly<Record<string, string>>): string {
  let metin = readFileSync(join(DOGUS_SABLON_KOK, dosya), "utf8");
  for (const [anahtar, deger] of Object.entries(degerler)) {
    metin = metin.replace(new RegExp(`\\{\\{${anahtar}\\}\\}`, "g"), deger);
  }
  return metin;
}

/** Tek projenin paketi (saf). Manifest DPK-A01 Founder onaylıdır. */
function projePaketi(ad: string, tarih: string): DogusDosya[] {
  const kod = dogusKodu(ad);
  const dosyaAdi = dogusDosyaAdi(ad);
  const d = { AD: ad, KOD: kod, TARIH: tarih };
  return [
    { yol: `${dosyaAdi}_anadizin.sar`,   icerik: sablonDoldur("anadizin.sar", d) },
    { yol: "durum/durum_devir.sar",      icerik: sablonDoldur("durum_devir.sar", d) },
    { yol: "ogrenme/dersler.sar",        icerik: sablonDoldur("dersler.sar", d) },
    { yol: "ogrenme/geribildirim.sar",   icerik: sablonDoldur("geribildirim.sar", d) },
    { yol: "plan/ilk_plan.sar",          icerik: sablonDoldur("ilk_plan.sar", d) },
    // DPK-A03: ajan dil bağlamı — AGENTS.md çok-ajan konvansiyonudur (Codex/Cursor/Claude
    // ailesi okur); içerik kanondan DERLENİR, projeye giren ajan dili ilk turdan öğrenir.
    { yol: "AGENTS.md",                  icerik: dilBaglami(tarih) },
  ];
}

/**
 * Doğuş paketinin dosya manifesti (saf — diske dokunmaz).
 * `proje` türü tek projenin paketidir; `calisma-alani` türü çatı ilanı + dil bağlamı +
 * ilk projenin kendi klasöründe doğan tam paketidir (her proje bağımsız kök · MIM-3).
 */
export function dogusManifesti(ad: string, tarih: string, tur: DogusTuru = "proje", projeAdi?: string): DogusDosya[] {
  if (tur === "proje") return projePaketi(ad, tarih);
  const proje = (projeAdi ?? VARSAYILAN_ILK_PROJE).trim() || VARSAYILAN_ILK_PROJE;
  const projeDosya = dogusDosyaAdi(proje);
  const alan = { AD: ad, KOD: dogusKodu(ad), TARIH: tarih, PROJE: projeDosya, PROJEKOD: dogusKodu(proje) };
  return [
    { yol: `${dogusDosyaAdi(ad)}_anadizin.sar`, icerik: sablonDoldur("calisma_alani_anadizin.sar", alan) },
    { yol: "AGENTS.md",                          icerik: dilBaglami(tarih) },
    ...projePaketi(proje, tarih).map((d) => ({ yol: `${projeDosya}/${d.yol}`, icerik: d.icerik })),
  ];
}

/**
 * Paketi hedef dizine yazar. Var olan dosyayı EZMEZ — atlar ve raporlar
 * (dolu-dizin sözleşmesi: mevcut kayıt sahibinindir, komut ne yapmadığını söyler).
 */
export function dogusYaz(hedefKok: string, ad?: string, tarih?: string, tur: DogusTuru = "proje", projeAdi?: string): DogusSonuc {
  const kok = resolve(hedefKok);
  const isim = (ad ?? basename(kok)).trim() || "proje";
  const gun = tarih ?? new Date().toISOString().slice(0, 10);
  const proje = tur === "calisma-alani" ? ((projeAdi ?? VARSAYILAN_ILK_PROJE).trim() || VARSAYILAN_ILK_PROJE) : undefined;
  const sonuc: DogusSonuc = { tur, ad: isim, kod: dogusKodu(isim), ...(proje ? { proje } : {}), yazilan: [], atlanan: [] };
  for (const d of dogusManifesti(isim, gun, tur, proje)) {
    const tam = join(kok, d.yol);
    if (existsSync(tam)) {
      sonuc.atlanan.push(d.yol);   // kullanıcının emeğini ezme (iskeletci ile aynı söz)
      continue;
    }
    mkdirSync(dirname(tam), { recursive: true });
    writeFileSync(tam, d.icerik, "utf8");
    sonuc.yazilan.push(d.yol);
  }
  return sonuc;
}

/** İnsan/ajan-yüzlü doğuş raporu — CLI ve MCP aynı sesi verir (YUZ-1.2 tek kaynak). */
export function dogusRaporu(s: DogusSonuc, hedef: string): string {
  const satirlar: string[] = [];
  if (s.tur === "calisma-alani") {
    satirlar.push(`🎁 DOĞUŞ PAKETİ — çalışma alanı "${s.ad}" (kod kısaltması: CAL-${s.kod}) ve altında ilk proje "${s.proje}" → ${hedef}`);
  } else {
    satirlar.push(`🎁 DOĞUŞ PAKETİ — "${s.ad}" (kod kısaltması: ${s.kod}) → ${hedef}`);
  }
  if (s.yazilan.length) {
    satirlar.push("", "🌱 Doğan dosyalar:");
    for (const y of s.yazilan) satirlar.push(`   + ${y}`);
  }
  if (s.atlanan.length) {
    satirlar.push("", "🛡️ Dokunulmayanlar (zaten vardı — mevcut kayıt sahibinindir, ezilmez):");
    for (const y of s.atlanan) satirlar.push(`   = ${y}`);
  }
  const planYolu = s.tur === "calisma-alani" ? `${dogusDosyaAdi(s.proje ?? VARSAYILAN_ILK_PROJE)}/plan/ilk_plan.sar` : "plan/ilk_plan.sar";
  satirlar.push(
    "",
    s.yazilan.length
      ? `🧭 Sıradaki iş: ${planYolu} içindeki kuruluş Adımı (mimari diyalog). Doğrulama: sarmal denetle <dizin> — sıfır hata beklenir.`
      : "📪 Yazılacak yeni dosya yoktu — paket daha önce kurulmuş görünüyor.");
  return satirlar.join("\n");
}

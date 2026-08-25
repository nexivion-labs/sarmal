// ═══════════════════════════════════════════════════════════════════════════
// karne.ts — 🏅 KARNE RAPORU saf çekirdeği (EMJ-A05)
//
//   Founder-onaylı ⭐ beş-derece skalasının (EMJ-A04 · nitelik/
//   karne_skalasi_taslagi.sar) yüzey çekirdeği. Kanonu İCAT ETMEZ — kayit.json
//   `karneSkalasi` bölümünden (Siniflama.karneSkalasi) okur; CLI ve MCP aynı
//   çekirdeği çağırır (YUZ-1.2 tek ses).
//
//   DÜRÜSTLÜK SÖZLEŞMESİ (EMJ-A05 kabulü): sicil verisi henüz üretilmediğinden
//   hiçbir etmene derece BASILMAZ — her etmen "henüz sicil yok" ile listelenir.
//   Sicil MADENCİLİĞİ (geçmiş kapanışlardan veri çıkarma) ayrı raydır; bileşen
//   AĞIRLIKLARI ve dereceye çevrim formülü STR-3 gereği gizli politikadadır.
// ═══════════════════════════════════════════════════════════════════════════

import type { Program, Dugum } from "./sozdizim.ts";
import type { Siniflama } from "./siniflama.ts";

export interface EtmenKaydi {
  kod: string;
  ad?: string;
  ne?: string;
  dosya: string;
}

/** Düğüm ağacını derin gezip Etmen bildirimlerini toplar (parametre metinleriyle). */
export function etmenleriTopla(programlar: ReadonlyMap<string, Program>): EtmenKaydi[] {
  const kayitlar: EtmenKaydi[] = [];
  const paramMetni = (d: Dugum, ad: string): string | undefined => {
    const p = d.parametreler.find((x) => x.ad === ad) ?? d.ozellikler.find((x) => x.ad === ad);
    return p?.deger.metin;
  };
  const gez = (d: Dugum, dosya: string): void => {
    if (d.tur === "widget" && d.ad === "Etmen") {
      kayitlar.push({
        kod: paramMetni(d, "kod") ?? "(kodsuz)",
        ad: paramMetni(d, "ad"),
        ne: paramMetni(d, "ne"),
        dosya,
      });
    }
    for (const c of d.cocuklar) gez(c, dosya);
    for (const p of [...d.parametreler, ...d.ozellikler]) {
      if (p.deger.dugum) gez(p.deger.dugum, dosya);
    }
  };
  for (const [dosya, prg] of programlar) for (const b of prg.bildirimler) gez(b, dosya);
  return kayitlar.sort((a, b) => a.kod.localeCompare(b.kod, "tr"));
}

/** Etmen ipucu/panel satırı: sicil yokken dürüst tek cümle (eklenti hover buradan okur). */
export function karneSatiri(snf: Siniflama): string | undefined {
  const k = snf.karneSkalasi;
  if (!k) return undefined;
  return `🏅 Karne: henüz sicil yok — derece basılmaz (skala kanonu: ${k.birim} 1–${Object.keys(k.dereceler).length}, kayit.json karneSkalasi)`;
}

/** Kadro karne raporu — insan/ajan yüzü (CLI `sarmal karne` ve MCP `karne` aynı sesi verir). */
export function karneRaporu(snf: Siniflama, programlar: ReadonlyMap<string, Program>): string {
  const k = snf.karneSkalasi;
  if (!k) {
    return "✖ Karne skalası kanonu bulunamadı — kayit.json 'karneSkalasi' bölümü bekleniyor; skala kanondan okunur, rapordan uydurulmaz.";
  }
  const s: string[] = [];
  s.push("🏅 ETMEN KARNESİ — dilden bağımsız derece dili (Founder onayı 2026-07-18)");
  s.push("");
  s.push(`Skala (${k.birim} — bu işaret dilin yüzeylerinde YALNIZ derece birimidir):`);
  for (const [derece, anlam] of Object.entries(k.dereceler)) {
    s.push(`  ${k.birim.repeat(Number(derece))} — ${anlam}`);
  }
  s.push("");
  s.push("Derecenin türediği sicil bileşenleri (ağırlık ve formül örtü tarafının gizli politikasındadır):");
  for (const [ad, anlam] of Object.entries(k.bilesenler)) s.push(`  • ${ad}: ${anlam}`);
  s.push("");

  const etmenler = etmenleriTopla(programlar);
  if (!etmenler.length) {
    s.push("📪 Bu çalışma alanında ilan edilmiş Etmen yok — karne listesi boş.");
    return s.join("\n");
  }
  s.push(`Kadro (${etmenler.length} etmen):`);
  for (const e of etmenler) {
    s.push(`  🤖 ${e.kod}${e.ad ? ` (${e.ad})` : ""} — henüz sicil yok, derece basılmaz`);
    if (e.ne) s.push(`     ${e.ne}`);
    s.push(`     📍 ${e.dosya}`);
  }
  s.push("");
  s.push("ℹ Sicil verisi (kabul isabeti · denetim temizliği · sınama yeşilliği · Founder sinyalleri) henüz toplanmıyor — toplama ayrı rayda açılır; bu yüzey uydurma puan basmaz.");
  return s.join("\n");
}

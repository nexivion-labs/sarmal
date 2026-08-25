// ═══════════════════════════════════════════════════════════════════════════
// yazdir.ts — Ağacı Türkçe yazdır (geçici gösterim)
//
//   Söz dizim ağacını okunur bir ağaç-çizimine döker. "Çalışıyor mu?"
//   kapısını gözle görmek için. (Doğrulama/tanı sonraki fazlarda.)
// ═══════════════════════════════════════════════════════════════════════════

import type { Program, Dugum, Deger } from "./sozdizim.ts";

/** Bir Program'ı ağaç-çizimi metnine çevirir. */
export function agaciYaz(program: Program): string {
  const satirlar: string[] = [];
  satirlar.push(`🌀 Program — ${program.bildirimler.length} bildirim`);
  const n = program.bildirimler.length;
  program.bildirimler.forEach((d, idx) => yazDugum(d, "", idx === n - 1, satirlar));
  return satirlar.join("\n");
}

function degerYazi(d: Deger): string {
  switch (d.tur) {
    case "metin": return `"${d.metin}"`;
    case "kod": return d.metin ?? "";
    case "sayı": return d.metin ?? "";
    case "liste": return "[" + (d.ogeler ?? []).map(degerYazi).join(", ") + "]";
    case "widget": return d.dugum ? `${d.dugum.ad}(…)` : "widget";
    case "harita": return "{ " + (d.ciftler ?? []).map((c) => `${c.ad}: ${degerYazi(c.deger)}`).join(", ") + " }";
    case "anahtar": return "#" + (d.metin ?? "");
    case "erişim": return d.metin ?? "";
    case "ifade":
      if (d.islem === "değil") return `değil ${sarmali(d.sag)}`;
      return `${sarmali(d.sol)} ${d.islem} ${sarmali(d.sag)}`;
  }
}

/** İç içe ifadeleri parantezler (okunur öncelik); atomlar çıplak kalır. */
function sarmali(d: Deger | undefined): string {
  if (!d) return "";
  const y = degerYazi(d);
  return d.tur === "ifade" ? `(${y})` : y;
}

function dugumBaslik(d: Dugum): string {
  const etiket =
    d.tur === "çağır" ? `çağır ${d.ad}` :
    d.tur === "tipTanım" ? `Tip ${d.ad}` :
    d.tur === "kuralTanım" ? `Kural ${d.ad}` :
    d.ad;
  const p = d.parametreler.map((x) => `${x.ad}: ${degerYazi(x.deger)}`).join("  ");
  return p ? `${etiket}  (${p})` : etiket;
}

function yazDugum(d: Dugum, on: string, son: boolean, out: string[]): void {
  out.push(on + (son ? "└─ " : "├─ ") + dugumBaslik(d));
  const altOn = on + (son ? "   " : "│  ");
  if (d.belge !== undefined) out.push(altOn + "· belge: " + d.belge.replace(/\n/g, " ⏎ "));
  d.ozellikler.forEach((o) => out.push(altOn + `· ${o.ad}: ${degerYazi(o.deger)}`));
  const n = d.cocuklar.length;
  d.cocuklar.forEach((c, i) => yazDugum(c, altOn, i === n - 1, out));
}

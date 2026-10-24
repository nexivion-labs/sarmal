// ═══════════════════════════════════════════════════════════════════════════
// minigraf-ilerleme.ts — 🕸️ MİNİ GRAF "İlerleme" görünümü (SAF — vscode importsuz)
//
//   Her Katman bir karttır: ad, sağda "n/m Adım" (Katman altındaki bütün
//   Adımlardan tamamlanan/toplam) ve altında ince ilerleme çubuğu. Katmanı
//   olmayan Blok aynı kartı Blok düzeyinde alır. Sayılar graftan türer; ikinci
//   bir sayım yolu yoktur.
// ═══════════════════════════════════════════════════════════════════════════

import { type ProjeGrafi, bosHtml, kacir, atlaHref } from "./minigraf-cekirdek.ts";
import { MINI_GRAF_METINLERI } from "./yuzey-metinleri.ts";

export interface IlerlemeKarti {
  kod: string;
  ad: string;
  tip: "Katman" | "Blok";
  tamam: number;
  toplam: number;
  dosya: string;
  satir: number;
}

/** Graftaki Katman ve (Katmansız) Blok kartlarını sayılarıyla çıkarır. */
export function ilerlemeKartlari(graf: ProjeGrafi): IlerlemeKarti[] {
  const ust = new Map(graf.dugumler.map((d) => [d.kod, d.ustKod] as const));
  const dugum = new Map(graf.dugumler.map((d) => [d.kod, d] as const));
  const sayac = new Map<string, { tamam: number; toplam: number }>();
  const katmanliBlok = new Set<string>();
  const atalar = (kod: string): string[] => {
    const z: string[] = [];
    const gorulen = new Set([kod]);
    let u = ust.get(kod);
    while (u && !gorulen.has(u)) { z.push(u); gorulen.add(u); u = ust.get(u); }
    return z;
  };
  for (const d of graf.dugumler) {
    if (d.tip === "Katman") for (const a of atalar(d.kod)) if (dugum.get(a)?.tip === "Blok") katmanliBlok.add(a);
  }
  for (const d of graf.dugumler) {
    if (d.tip !== "Adım") continue;
    const zincir = atalar(d.kod).map((k) => dugum.get(k)!).filter(Boolean);
    const katmanVar = zincir.some((a) => a.tip === "Katman");
    for (const a of zincir) {
      const sayilir = a.tip === "Katman" || (a.tip === "Blok" && !katmanliBlok.has(a.kod) && !katmanVar);
      if (!sayilir) continue;
      const s = sayac.get(a.kod) ?? sayac.set(a.kod, { tamam: 0, toplam: 0 }).get(a.kod)!;
      s.toplam += 1;
      if (d.durum === "tamamlandı") s.tamam += 1;
    }
  }
  return graf.dugumler
    .filter((d) => d.tip === "Katman" || (d.tip === "Blok" && !katmanliBlok.has(d.kod)))
    .map((d) => ({
      kod: d.kod, ad: d.ad, tip: d.tip as "Katman" | "Blok",
      tamam: sayac.get(d.kod)?.tamam ?? 0, toplam: sayac.get(d.kod)?.toplam ?? 0,
      dosya: d.dosya, satir: d.satir,
    }));
}

const ILERLEME_STIL = `<style>
body{font-family:var(--vscode-font-family);font-size:12px;color:var(--vscode-foreground);padding:6px 8px;margin:0;background:transparent}
.kartlar{display:flex;flex-direction:column;gap:6px}
.kart{display:block;box-sizing:border-box;padding:7px 9px 8px;color:inherit;text-decoration:none;border:1px solid var(--vscode-widget-border,var(--vscode-panel-border));border-radius:5px}
.kart:hover{background:var(--vscode-list-hoverBackground)}
.kart:focus-visible{outline:1px solid var(--vscode-focusBorder);outline-offset:-1px}
.satir{display:flex;align-items:baseline;gap:8px}
.ad{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.say{flex:0 0 auto;font-size:10px;color:var(--vscode-descriptionForeground);white-space:nowrap}
.cubuk{height:3px;margin-top:6px;border-radius:2px;background:var(--vscode-widget-border,var(--vscode-panel-border));overflow:hidden}
.dolu{display:block;height:100%;border-radius:2px;background:var(--vscode-charts-blue)}
.dolu.bitti{background:var(--vscode-testing-iconPassed)}
.k{color:var(--vscode-descriptionForeground);padding:6px}
</style>`;

export function kartHtml(k: IlerlemeKarti): string {
  const yuzde = k.toplam ? Math.round((k.tamam / k.toplam) * 100) : 0;
  const bitti = k.toplam > 0 && k.tamam === k.toplam;
  const sayi = `${k.tamam}/${k.toplam} Adım`;
  const href = atlaHref(k);
  const govde = `<div class="satir"><span class="ad">${kacir(k.ad)}</span><span class="say">${sayi}</span></div>` +
    `<div class="cubuk" role="progressbar" aria-valuemin="0" aria-valuemax="${k.toplam}" aria-valuenow="${k.tamam}">` +
    `<i class="dolu${bitti ? " bitti" : ""}" style="width:${yuzde}%"></i></div>`;
  const ipucu = kacir(MINI_GRAF_METINLERI.kaynakIpucu(`${k.tip} · ${k.ad} · ${k.kod}\n${sayi}`));
  return href ? `<a class="kart" href="${href}" title="${ipucu}">${govde}</a>`
    : `<div class="kart" title="${ipucu}">${govde}</div>`;
}

export function ilerlemeHtml(graf: ProjeGrafi): string {
  const kartlar = ilerlemeKartlari(graf);
  if (!kartlar.length) return bosHtml(MINI_GRAF_METINLERI.bosGraf);
  return `<!DOCTYPE html><html lang="${MINI_GRAF_METINLERI.dil}"><meta charset="UTF-8">${ILERLEME_STIL}<body>` +
    `<div class="kartlar">${kartlar.map(kartHtml).join("")}</div></body></html>`;
}

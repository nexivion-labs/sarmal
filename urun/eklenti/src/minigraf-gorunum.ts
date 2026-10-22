// ═══════════════════════════════════════════════════════════════════════════
// minigraf-gorunum.ts — 🕸️ MİNİ GRAF görünüm seçimi (SAF — vscode importsuz)
//
//   Üç görünüm: Klasik (cam mercekli SVG), Ağaç (düzenli ağaç + bağ şeridi,
//   varsayılan) ve İlerleme (Katman kartları). Seçim `sarmal.miniGrafGorunum`
//   ayarında yaşar; seçici kart panelin içinde çizilir ve karta tıklama betiksiz,
//   `command:` bağıyla çalışır.
// ═══════════════════════════════════════════════════════════════════════════

import { type ProjeGrafi, miniGrafHtml, bosHtml } from "./minigraf-cekirdek.ts";
import { klasikHtml } from "./minigraf-klasik.ts";
import { ilerlemeHtml } from "./minigraf-ilerleme.ts";
import { MINI_GRAF_METINLERI } from "./yuzey-metinleri.ts";

export const GORUNUMLER = ["klasik", "agac", "ilerleme"] as const;
export type GrafGorunumu = typeof GORUNUMLER[number];
export const VARSAYILAN_GORUNUM: GrafGorunumu = "agac";
export const GORUNUM_AYARI = "miniGrafGorunum";
export const GORUNUM_SEC_KOMUTU = "sarmal.miniGraf.gorunumSec";
export const GORUNUM_KAPAT_KOMUTU = "sarmal.miniGraf.gorunumKapat";

/** Bilinmeyen ya da bozuk ayar değeri varsayılana düşer. */
export function gorunumNormalle(v: unknown): GrafGorunumu {
  return (GORUNUMLER as readonly unknown[]).includes(v) ? v as GrafGorunumu : VARSAYILAN_GORUNUM;
}

/** Ayar değerine göre DOĞRU çiziciyi seçer. */
export function gorunumHtml(graf: ProjeGrafi, gorunum: unknown): string {
  if (!graf.dugumler.length) return bosHtml(MINI_GRAF_METINLERI.bosGraf);
  switch (gorunumNormalle(gorunum)) {
    case "klasik": return klasikHtml(graf);
    case "ilerleme": return ilerlemeHtml(graf);
    default: return miniGrafHtml(graf);
  }
}

/** Sabit şematik önizlemeler (tema renklerinden beslenir; ham renk yoktur). */
const ONIZLEME: Record<GrafGorunumu, string> = {
  klasik:
    `<path d="M8 8V48" class="o-c"/><path d="M8 14H30M8 28H30M8 42H30" class="o-c"/>` +
    `<path d="M30 14C46 14 46 42 30 42" class="o-c o-e"/>` +
    `<circle cx="30" cy="14" r="5" class="o-n"/><circle cx="30" cy="28" r="5" class="o-n"/><circle cx="30" cy="42" r="5" class="o-n"/>` +
    `<rect x="42" y="12" width="46" height="4" rx="2" class="o-b"/><rect x="42" y="26" width="58" height="4" rx="2" class="o-b"/><rect x="42" y="40" width="38" height="4" rx="2" class="o-b"/>`,
  agac:
    `<path d="M10 12V42M10 28H18M10 42H18M22 12V28" class="o-c"/>` +
    `<circle cx="10" cy="12" r="3" class="o-d o-y"/><circle cx="22" cy="28" r="3" class="o-d o-g"/><circle cx="22" cy="42" r="3" class="o-d o-m"/>` +
    `<rect x="30" y="10" width="50" height="4" rx="2" class="o-b"/><rect x="30" y="26" width="42" height="4" rx="2" class="o-b"/><rect x="30" y="40" width="56" height="4" rx="2" class="o-b"/>` +
    `<path d="M4 12C-2 12 -2 42 4 42" class="o-c o-e"/>`,
  ilerleme:
    `<rect x="6" y="6" width="108" height="14" rx="3" class="o-k"/><rect x="10" y="15" width="100" height="2" rx="1" class="o-t"/><rect x="10" y="15" width="64" height="2" rx="1" class="o-m"/>` +
    `<rect x="6" y="24" width="108" height="14" rx="3" class="o-k"/><rect x="10" y="33" width="100" height="2" rx="1" class="o-t"/><rect x="10" y="33" width="100" height="2" rx="1" class="o-g"/>` +
    `<rect x="6" y="42" width="108" height="10" rx="3" class="o-k"/><rect x="10" y="48" width="100" height="2" rx="1" class="o-t"/>`,
};

/** Seçici: üç kart yan yana (dar panelde alt alta); seçili kart vurgulu kenarlıdır. */
export function seciciHtml(secili: unknown): string {
  const sec = gorunumNormalle(secili);
  const kartlar = GORUNUMLER.map((g) => {
    const href = `command:${GORUNUM_SEC_KOMUTU}?${encodeURIComponent(JSON.stringify([g]))}`;
    return `<a class="gk${g === sec ? " secili" : ""}" href="${href}"${g === sec ? ' aria-current="true"' : ""}>` +
      `<svg viewBox="0 0 120 56" aria-hidden="true">${ONIZLEME[g]}</svg>` +
      `<b>${MINI_GRAF_METINLERI.gorunumAdi(g)}</b><span>${MINI_GRAF_METINLERI.gorunumTarifi(g)}</span></a>`;
  }).join("");
  return `<!DOCTYPE html><html lang="${MINI_GRAF_METINLERI.dil}"><meta charset="UTF-8"><style>
body{font-family:var(--vscode-font-family);font-size:12px;color:var(--vscode-foreground);padding:8px;margin:0;background:transparent}
.bas{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
.bas b{font-size:11px;color:var(--vscode-descriptionForeground)}
.kapat{color:var(--vscode-textLink-foreground);text-decoration:none;font-size:11px}
.kartlar{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px}
.gk{display:flex;flex-direction:column;gap:4px;box-sizing:border-box;padding:8px;color:inherit;text-decoration:none;border:1px solid var(--vscode-widget-border,var(--vscode-panel-border));border-radius:6px}
.gk:hover{background:var(--vscode-list-hoverBackground)}
.gk:focus-visible{outline:1px solid var(--vscode-focusBorder);outline-offset:-1px}
.gk.secili{border:2px solid var(--vscode-focusBorder);padding:7px}
.gk svg{width:100%;height:auto;max-height:64px}
.gk span{font-size:10px;color:var(--vscode-descriptionForeground)}
.o-c{fill:none;stroke:var(--vscode-descriptionForeground);stroke-width:1;stroke-opacity:.5}
.o-e{stroke-dasharray:2 2}
.o-n{fill:var(--vscode-editorWidget-background);stroke:var(--vscode-charts-yellow);stroke-width:1.2}
.o-b{fill:var(--vscode-descriptionForeground);fill-opacity:.45}
.o-d{stroke:none}.o-y{fill:var(--vscode-charts-yellow)}.o-g{fill:var(--vscode-testing-iconPassed)}.o-m{fill:var(--vscode-charts-blue)}
.o-k{fill:none;stroke:var(--vscode-descriptionForeground);stroke-opacity:.5}
.o-t{fill:var(--vscode-descriptionForeground);fill-opacity:.3}
svg .o-m,svg .o-g{fill-opacity:1}
</style><body><div class="bas"><b>${MINI_GRAF_METINLERI.gorunumBasligi}</b>` +
    `<a class="kapat" href="command:${GORUNUM_KAPAT_KOMUTU}">${MINI_GRAF_METINLERI.gorunumKapat}</a></div>` +
    `<div class="kartlar">${kartlar}</div></body></html>`;
}

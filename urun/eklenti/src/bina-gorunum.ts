// ═══════════════════════════════════════════════════════════════════════════
// bina-gorunum.ts — 🏢 BİNANIN TEPESİ VE BANTLARIN STİLİ (PNL-A31 · SAF)
//
//   Founder 2026-11-04: çok ofisli çalışma alanı panelde bir bina gibi görünür ve
//   logo en tepede durur. Bu dosya iki yüzeyin (Ray sekmesinin yol haritası ile
//   Tren sekmesinin şirket şeması) ortak parçasıdır: binanın tepesindeki ad ve
//   logo çizimi ile kat bantlarının stili. VS Code'u tanımaz.
//
//   GÜVENLİK: logo yalnız `data:image/svg+xml;base64,` adresi olarak çizilir. Adresi
//   üreten kabuk dosyayı çekirdeğin `logoCoz` kararından geçirmiştir (kök dışı, SVG
//   olmayan, betik ya da dış kaynak taşıyan logo reddedilir); burada adres bir kez
//   daha biçimce ölçülür ve `<img>` içinde basılır, tarayıcı o bağlamda SVG'nin
//   betiğini koşturmaz ve dış kaynak yüklemez. Panelin CSP'si `img-src data:` izni
//   verir, başka kaynağa izin vermez.
// ═══════════════════════════════════════════════════════════════════════════

import { BINA_METINLERI } from "./yuzey-metinleri.ts";
import { TREN_DAR_PX } from "./tren-betik.ts";

/**
 * Bina ağacının simgeleri (Founder onayı 2026-11-04): türe göre tek simge ve her biri bir VS Code
 * codicon kimliğidir. Panel webview'i codicon yazı tipi taşımadığı için her kimliğin çizimi
 * panel-cekirdek.ts `TEMA_IKONLARI` tablosundadır. Kökte logo gösterilebiliyorsa logo kullanılır;
 * eklentinin kendi deposu roket yerine marka simgesini taşır (yolharitasi.ts `MARKA_SIMGESI`).
 */
export const BINA_SIMGESI = {
  kok: "organization",
  yonetim: "law",
  ofis: "briefcase",
  proje: "rocket",
  musteri: "person",
  disari: "archive",
} as const;

/**
 * Binanın tepesi: çalışma alanının adı, (gösterilebilirse) logonun veri adresi ve Ray sekmesinde kök
 * satırından taşınan açıklama (etkinlik ve proje sayısı gibi). Tren sekmesi açıklama vermez.
 */
export interface BinaBasligi { ad: string; logo?: string; aciklama?: string }

/** Logo adresinin kabul edilen tek biçimi. */
const LOGO_ADRESI = /^data:image\/svg\+xml;base64,[A-Za-z0-9+/=]+$/;

function kac(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/**
 * Binanın tepesinin HTML'i; bina yoksa boş. Biçim dışı logo adresi çizilmez, ad yine yazılır. `ek`,
 * çağıranın kaçırarak kurduğu ek çizimdir (Ray sekmesinde kök satırının Dur ve Dikkat sayıları).
 */
export function binaBasligiHtml(b: BinaBasligi | undefined, ek = ""): string {
  if (!b) return "";
  const logo = b.logo && LOGO_ADRESI.test(b.logo)
    ? `<img class="bina-logo" src="${b.logo}" alt="${kac(BINA_METINLERI.logoAlt(b.ad))}">` : "";
  const aciklama = b.aciklama ? `<span class="bina-ac">${kac(b.aciklama)}</span>` : "";
  return `<div class="bina-bas">${logo}<span class="bina-ad">${kac(b.ad)}</span>${aciklama}${ek}</div>`;
}

/** Binanın tepesi ile Tren şemasının kat bantlarının stili. */
export const BINA_STILI = `
.bina-bas{display:flex;align-items:center;gap:8px;padding:6px 12px 4px;min-width:0}
.bina-logo{flex:none;display:block;height:22px;width:auto;max-width:120px;object-fit:contain}
.bina-ad{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;font-weight:600;letter-spacing:.02em}
.bina-ac{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;color:var(--vscode-descriptionForeground)}
.bina-bas .sny{flex:none}
.tr-bina{position:relative;z-index:1;display:flex;flex-direction:column;gap:6px}
.tr-kat{border:1px solid var(--vscode-widget-border,rgba(128,128,128,.35));border-radius:5px;padding:4px 8px 6px;
  background:color-mix(in srgb,var(--vscode-editorWidget-background,transparent) 60%,transparent)}
.tr-kat.tr-katsiz{border-style:dashed}
.tr-kat-bas{display:flex;align-items:baseline;gap:6px;margin:0 0 4px;font-size:10px;line-height:14px;font-weight:600;letter-spacing:.06em;
  text-transform:uppercase;color:var(--vscode-descriptionForeground)}
.tr-kat-bas .tr-kat-ac{font-weight:400;letter-spacing:0;text-transform:none}
.tr-yonetim{display:flex;flex-wrap:wrap;align-items:stretch;justify-content:center;gap:10px;padding:2px 0 6px}
.tr-yonetim .tr-apex{padding:0}
.tr-kanon{display:flex;flex-direction:column;justify-content:center;gap:1px;min-width:180px;padding:3px 10px;border-radius:4px;
  border:1px solid var(--vscode-textLink-foreground);border-left-width:3px;font-size:10px;color:var(--vscode-descriptionForeground)}
.tr-kanon b{font-size:12px;color:var(--vscode-foreground)}
.tr-kanon.bos{border-style:dashed}
.tr-akis{display:flex;align-items:flex-start;gap:12px;padding:6px 0 4px;border-top:1px solid var(--vscode-widget-border,rgba(128,128,128,.25))}
.tr-akis-bas{flex:0 0 170px;font-size:10px;line-height:14px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--vscode-descriptionForeground)}
.tr-akis-yuvalar{flex:1 1 auto;min-width:0;display:flex;flex-wrap:wrap;gap:6px 10px}
.tr-akis-yuvalar>.tr-grup,.tr-akis-yuva{width:210px}
.tr-akis-yuva{display:flex;align-items:center;height:36px;padding:0 10px;border:1px dashed var(--vscode-descriptionForeground);border-radius:4px;
  font-size:11px;color:var(--vscode-descriptionForeground)}
.tr-kat .tr-depler{padding-top:2px}
@media (max-width:${TREN_DAR_PX - 1}px){
  .tr-akis{flex-direction:column;gap:4px}
  .tr-akis-bas{flex:none}
}
`;

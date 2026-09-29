// ═══════════════════════════════════════════════════════════════════════════
// bolum-cekirdek.ts — 🧩 BÖLÜM YUVASININ SAF ÇEKİRDEĞİ (VIT-K78-A10)
//
//   Founder hükmü (2026-09-28, 2026-09-29'da yinelendi): Sarmal'ın VS Code'daki
//   simgesi tektir. Simgeye tıklanınca kabın en üstünde yatay bir bölüm sırası
//   açılır; Ray açık eklentinin kendi bölümüdür, öteki bölümleri kardeş
//   eklentiler kaydeder. Açık eklenti tek başına kurulduğunda sıra yalnız
//   Ray'i gösterir.
//
//   VS Code bir görünüm kabının içindeki görünümleri dikey yığar ve yerel bir
//   yatay sekme şeridi tanımaz. Yuva bu yüzden iki parçadan kurulur: kabın en
//   üstünde küçük bir webview (bölüm sırası) durur ve seçilen bölümün
//   görünümleri bağlam anahtarlarıyla görünür kılınır. Ray'in ağaç panelleri
//   olduğu gibi kalır; yalnız bir `when` koşulu kazanırlar.
//
//   Kardeş eklentinin bölümü açık eklentinin önceden ilan ettiği dört yuva
//   görünümünden birine yerleşir; yuvanın webview sağlayıcısı, kaydı yapan
//   eklentinin verdiği sağlayıcıya devredilir. Açık eklenti kardeşi TANIMAZ:
//   yalnız kimlik, ad, simge ve sağlayıcı alır.
//
//   Bu dosya VS Code'u tanımaz. Defter (kim kayıtlı, hangi yuvada, hangisi
//   seçili) ve bölüm sırasının HTML'i burada üretilir ve kabuksuz sınanır;
//   kabuk (bolum-yuvasi.ts) yalnız bu kararları editöre uygular.
// ═══════════════════════════════════════════════════════════════════════════

/** Açık eklentinin kendi bölümünün kimliği; hiçbir kardeş bu kimliği alamaz. */
export const RAY_BOLUMU = "ray";

/** Kabın en üstündeki bölüm sırasının görünüş kimliği. */
export const BOLUM_SIRASI_GORUNUSU = "sarmalBolumSirasi";

/** Kardeş bölümlerinin yerleştiği yuva görünüşleri (package.json ile birebir). */
export const YUVA_GORUNUSLERI = [
  "sarmalBolumYuvasi1", "sarmalBolumYuvasi2", "sarmalBolumYuvasi3", "sarmalBolumYuvasi4",
] as const;

/** Ray'in bugünkü panelleri: bölüm sırası Ray'deyken görünürler. */
export const RAY_GORUNUSLERI = [
  "sarmalYolHaritasi", "sarmalHatirlaticilar", "sarmalFikirler", "sarmalBildirimler",
  "sarmalOnaylar", "sarmalMiniGraf",
] as const;

/**
 * Bağlam anahtarları. `rayGizli` bilerek OLUMSUZ yazılır: eklenti etkinleşmeden
 * önce anahtar tanımsızdır ve tanımsız bir anahtarın olumsuzu doğrudur, yani
 * Ray panelleri etkinleşme beklenirken de görünür kalır.
 */
export const BAGLAM = {
  /** Seçili bölümün yuvası: "ray" ya da "yuva1".."yuva4". Yuva görünüşleri bunu okur. */
  seciliYuva: "sarmal.bolum.seciliYuva",
  /** Ray dışındaki bir bölüm seçiliyken doğru; Ray panelleri bunun olumsuzunu okur. */
  rayGizli: "sarmal.bolum.rayGizli",
  /** Seçili bölümün kimliği; kardeş eklenti kendi ek görünümlerini buna bağlayabilir. */
  secili: "sarmal.bolum.secili",
} as const;

/** Yuva sırasının bağlam değeri: 0 tabanlı yuva sırası → "yuva1".. */
export function yuvaBaglamDegeri(yuva: number): string {
  return `yuva${yuva + 1}`;
}

/** Kimlik ASCII'dir (H15): küçük harfle başlar, küçük harf, rakam ve tire taşır. */
export const BOLUM_KIMLIK_DESENI = /^[a-z][a-z0-9-]{1,39}$/;

export type KayitReddi =
  | "kimlik-bicimi"
  | "kimlik-ayrilmis"
  | "kimlik-yinelenen"
  | "ad-bos"
  | "yuva-yok";

export type KayitSonucu =
  | { tur: "tamam"; yuva: number }
  | { tur: "ret"; sebep: KayitReddi };

/** Bölüm sırasında görünen tek bir öge. Ray daima ilk ögedir. */
export interface SiraOgesi {
  kimlik: string;
  ad: string;
  /** Ray için tanımsızdır; kardeş bölümün oturduğu yuvanın sırası. */
  yuva?: number;
}

interface Kayit<T> {
  kimlik: string;
  ad: string;
  yuva: number;
  ek: T;
}

/**
 * Bölüm defteri. Kayıt sırası sıranın sırasıdır; Ray en baştadır. Yuva seçimi
 * önce HİÇ KULLANILMAMIŞ yuvayı verir: kalkan bir bölümün yuvası ancak başka
 * boş yuva kalmadığında yeniden verilir, böylece eski bölümün webview'i yeni
 * bölümün yuvasında yeniden doğmaz.
 */
export class BolumDefteri<T = undefined> {
  private readonly kayitlar: Kayit<T>[] = [];
  private readonly kullanilmis = new Set<number>();
  private seciliKimlik: string = RAY_BOLUMU;

  private readonly yuvaSayisi: number;

  constructor(yuvaSayisi: number = YUVA_GORUNUSLERI.length) {
    this.yuvaSayisi = yuvaSayisi;
  }

  kaydet(kimlik: string, ad: string, ek: T): KayitSonucu {
    if (typeof kimlik !== "string" || !BOLUM_KIMLIK_DESENI.test(kimlik)) return { tur: "ret", sebep: "kimlik-bicimi" };
    if (kimlik === RAY_BOLUMU) return { tur: "ret", sebep: "kimlik-ayrilmis" };
    if (this.kayitlar.some((k) => k.kimlik === kimlik)) return { tur: "ret", sebep: "kimlik-yinelenen" };
    if (typeof ad !== "string" || ad.trim() === "") return { tur: "ret", sebep: "ad-bos" };
    const yuva = this.bosYuva();
    if (yuva === undefined) return { tur: "ret", sebep: "yuva-yok" };
    this.kullanilmis.add(yuva);
    this.kayitlar.push({ kimlik, ad: ad.trim(), yuva, ek });
    return { tur: "tamam", yuva };
  }

  /** Bölümü düşürür. Seçili bölüm düşerse seçim Ray'e döner. */
  dusur(kimlik: string): { dustu: boolean; seciliDegisti: boolean } {
    const i = this.kayitlar.findIndex((k) => k.kimlik === kimlik);
    if (i < 0) return { dustu: false, seciliDegisti: false };
    this.kayitlar.splice(i, 1);
    if (this.seciliKimlik !== kimlik) return { dustu: true, seciliDegisti: false };
    this.seciliKimlik = RAY_BOLUMU;
    return { dustu: true, seciliDegisti: true };
  }

  /** Seçer; bilinmeyen kimlikte hiçbir şey değişmez ve yanlış döner. */
  sec(kimlik: string): boolean {
    if (kimlik !== RAY_BOLUMU && !this.kayitlar.some((k) => k.kimlik === kimlik)) return false;
    this.seciliKimlik = kimlik;
    return true;
  }

  get secili(): string {
    return this.seciliKimlik;
  }

  /** Seçili bölümün yuva bağlam değeri: "ray" ya da "yuvaN". */
  get seciliYuva(): string {
    const k = this.kayitlar.find((x) => x.kimlik === this.seciliKimlik);
    return k ? yuvaBaglamDegeri(k.yuva) : RAY_BOLUMU;
  }

  /** Sıra: Ray başta, ardından kayıt sırasıyla kardeş bölümleri. */
  sira(rayAdi: string): SiraOgesi[] {
    return [
      { kimlik: RAY_BOLUMU, ad: rayAdi },
      ...this.kayitlar.map((k) => ({ kimlik: k.kimlik, ad: k.ad, yuva: k.yuva })),
    ];
  }

  ek(kimlik: string): T | undefined {
    return this.kayitlar.find((k) => k.kimlik === kimlik)?.ek;
  }

  yuvaEki(yuva: number): T | undefined {
    return this.kayitlar.find((k) => k.yuva === yuva)?.ek;
  }

  get kayitSayisi(): number {
    return this.kayitlar.length;
  }

  private bosYuva(): number | undefined {
    const dolu = new Set(this.kayitlar.map((k) => k.yuva));
    for (let i = 0; i < this.yuvaSayisi; i++) if (!dolu.has(i) && !this.kullanilmis.has(i)) return i;
    for (let i = 0; i < this.yuvaSayisi; i++) if (!dolu.has(i)) return i;
    return undefined;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🖼️ BÖLÜM SIRASININ HTML'İ
//
//   Sıra bir sekme listesidir: her bölüm simgesi ve adıyla bir düğmedir, seçili
//   olan `aria-selected` taşır ve vurgulanır. Klavye: sol ve sağ ok odak taşır,
//   Home ile End uçlara gider, Enter ile Boşluk seçer (el ile etkinleştirme;
//   odak gezinirken görünümler yerinden oynamaz). Sıra tek satırdır ve dar
//   genişlikte öğeler daralır, adlar üç noktayla kısalır; alt satıra kırılmaz,
//   çünkü görünüm bölmesi kısa başlar ve ikinci satır bölmenin altında kesilirdi
//   (dar genişlikteki gerçek VS Code ekran görüntüsünde ölçüldü). Bütün renkler VS Code tema değişkenlerinden gelir; sayfa
//   hiçbir somut renk taşımaz. İçerik güvenliği politikası `default-src 'none'`
//   ile başlar, yalnız kendi nonce'unu ve webview kaynağından simge yüklemeyi açar.
// ═══════════════════════════════════════════════════════════════════════════

/** Bölüm sırasının bir ögesi, HTML'e hazır biçimde. */
export interface SiraCizimOgesi {
  kimlik: string;
  ad: string;
  ipucu: string;
  secili: boolean;
  /** Satır içi SVG (güvenilir kaynak: açık eklentinin kendi rafı). */
  svg?: string;
  /** Açık ve koyu temalar için webview adresleri (kardeş eklentinin logosu). */
  simgeAcik?: string;
  simgeKoyu?: string;
}

export interface SiraCizimGirdisi {
  nonce: string;
  cspKaynak: string;
  dil: string;
  listeEtiketi: string;
  ogeler: readonly SiraCizimOgesi[];
}

/** HTML metin kaçışı: bölüm adı ve ipucu dışarıdan gelir, işaretleme olarak yorumlanmaz. */
export function kacis(metin: string): string {
  return metin
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Satır içi SVG yalnız açık eklentinin kendi rafından gelir; yine de betik ve olay
 *  niteliği taşıyan bir çizim reddedilir, çünkü sayfaya işaretleme olarak girer. */
export function guvenliSvg(svg: string | undefined): string {
  if (!svg) return "";
  const t = svg.trim();
  if (!t.startsWith("<svg") || /<script|\son[a-z]+\s*=|javascript:/i.test(t)) return "";
  return t.replace(/<!--[\s\S]*?-->/g, "");
}

export const SIRA_BICEMI = `
body { margin: 0; padding: 8px 8px 6px; font-family: var(--vscode-font-family); font-size: var(--vscode-font-size);
  color: var(--vscode-foreground); background: transparent; }
.sira { display: flex; flex-wrap: nowrap; gap: 6px; margin: 0; padding: 0; }
.bolum { flex: 0 1 88px; min-width: 0; display: flex; flex-direction: column; align-items: center;
  gap: 4px; padding: 8px 10px 6px; border: 1px solid transparent; border-radius: 6px; background: transparent;
  color: var(--vscode-panelTitle-inactiveForeground, var(--vscode-descriptionForeground)); font: inherit; cursor: pointer; }
.bolum:hover { background: var(--vscode-toolbar-hoverBackground, var(--vscode-list-hoverBackground)); color: var(--vscode-foreground); }
.bolum:focus-visible { outline: 1px solid var(--vscode-focusBorder); outline-offset: 1px; }
.bolum[aria-selected="true"] { color: var(--vscode-panelTitle-activeForeground, var(--vscode-foreground));
  background: var(--vscode-list-inactiveSelectionBackground, transparent);
  border-color: var(--vscode-contrastActiveBorder, transparent);
  box-shadow: inset 0 -2px 0 var(--vscode-panelTitle-activeBorder, var(--vscode-focusBorder)); }
.simge { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; }
.simge svg, .simge img { width: 28px; height: 28px; }
.ad { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; line-height: 16px; }
.bolum[aria-selected="true"] .ad { font-weight: 600; }
@media (max-width: 240px) {
  body { padding: 6px 4px 4px; }
  .sira { gap: 2px; }
  .bolum { padding: 6px 2px 4px; }
  .ad { font-size: 11px; }
}
img.koyu { display: none; }
body.vscode-dark img.acik, body.vscode-high-contrast:not(.vscode-high-contrast-light) img.acik { display: none; }
body.vscode-dark img.koyu, body.vscode-high-contrast:not(.vscode-high-contrast-light) img.koyu { display: inline; }
`;

/** Betik: tıklama ve klavye. Seçim ev sahibine iletilir; ev sahibi `secili` iletisiyle
 *  vurguyu doğrular. Odak gezintisi seçmez, Enter ya da Boşluk seçer. */
export const SIRA_BETIGI = `
(function () {
  const vscode = acquireVsCodeApi();
  const dugmeler = Array.from(document.querySelectorAll(".bolum"));
  function vurgula(kimlik) {
    for (const d of dugmeler) {
      const secili = d.dataset.kimlik === kimlik;
      d.setAttribute("aria-selected", secili ? "true" : "false");
      d.tabIndex = secili ? 0 : -1;
    }
  }
  function sec(d) { vurgula(d.dataset.kimlik); vscode.postMessage({ tur: "sec", kimlik: d.dataset.kimlik }); }
  for (const d of dugmeler) {
    d.addEventListener("click", () => sec(d));
    d.addEventListener("keydown", (e) => {
      const i = dugmeler.indexOf(d);
      let hedef;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") hedef = dugmeler[(i + 1) % dugmeler.length];
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") hedef = dugmeler[(i - 1 + dugmeler.length) % dugmeler.length];
      else if (e.key === "Home") hedef = dugmeler[0];
      else if (e.key === "End") hedef = dugmeler[dugmeler.length - 1];
      if (hedef) { e.preventDefault(); for (const x of dugmeler) x.tabIndex = -1; hedef.tabIndex = 0; hedef.focus(); }
    });
  }
  window.addEventListener("message", (e) => {
    const m = e.data;
    if (m && m.tur === "secili" && typeof m.kimlik === "string") vurgula(m.kimlik);
  });
})();
`;

function ogeHtml(o: SiraCizimOgesi): string {
  let simge = guvenliSvg(o.svg);
  if (!simge && o.simgeAcik) {
    const koyu = o.simgeKoyu ?? o.simgeAcik;
    simge = `<img class="acik" src="${kacis(o.simgeAcik)}" alt="" /><img class="koyu" src="${kacis(koyu)}" alt="" />`;
  }
  return `<button type="button" class="bolum" role="tab" id="bolum-${kacis(o.kimlik)}" data-kimlik="${kacis(o.kimlik)}"` +
    ` aria-selected="${o.secili ? "true" : "false"}" tabindex="${o.secili ? "0" : "-1"}" title="${kacis(o.ipucu)}">` +
    `<span class="simge" aria-hidden="true">${simge}</span><span class="ad">${kacis(o.ad)}</span></button>`;
}

/** Bölüm sırasının tam sayfası. */
export function siraHtml(g: SiraCizimGirdisi): string {
  const nonce = kacis(g.nonce);
  return `<!DOCTYPE html>
<html lang="${kacis(g.dil)}">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${g.cspKaynak}; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style nonce="${nonce}">${SIRA_BICEMI}</style>
</head>
<body>
<div class="sira" role="tablist" aria-label="${kacis(g.listeEtiketi)}">${g.ogeler.map(ogeHtml).join("")}</div>
<script nonce="${nonce}">${SIRA_BETIGI}</script>
</body>
</html>`;
}

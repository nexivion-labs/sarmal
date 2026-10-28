// ═══════════════════════════════════════════════════════════════════════════
// panel-cekirdek.ts — 🧭 SARMAL PANELİNİN SAF ÇEKİRDEĞİ (vscode importsuz)
//
//   Founder 2026-10-21 (bağlayıcı çizim): Sarmal etkinlik çubuğu kabı TEK bir
//   webview görünümüdür (`sarmalPanel`). Kabın başlığının hemen altında sekme
//   şeridi durur; şeridin altından seçili sekmenin içeriği başlar. Kapta her an
//   yalnız bir görünüm görünür, böylece VS Code görünüm başlığını kap başlığıyla
//   birleştirir ve webview bütün yüksekliği kaplar. Founder 2026-10-27 (OZK-13):
//   sekmeler sırasıyla Ray · Tren · Makinist · Gözlemler · Ayarlar'dır.
//
//   Bu dosya üç iş yapar ve hiçbirinde VS Code'u tanımaz:
//     1. Mevcut AĞAÇ SAĞLAYICILARINI (Yol Haritası · Tren · Makinist) olduğu
//        gibi okur: `getChildren` ve `getTreeItem` çağrılır, yeni ayrıştırıcı ya
//        da tarama yoktur. Yalnız AÇIK düğümlerin çocukları üretilir; 700+
//        düğümlü bir projede kapalı varsayılanla çıktı küçük kalır.
//     2. Satırları, sekme şeridini ve bölümleri HTML'e çevirir (bütün metinler
//        kaçırılır; istemci betiğine hiçbir veri yorumlanacak metin olarak girmez).
//     3. Sekme kimliklerini, klavye komşuluğunu ve Mini Graf gövdesinin gölge
//        köke taşınmasını (stil seçicileri) saf işlevlerle karara bağlar.
// ═══════════════════════════════════════════════════════════════════════════

import { PANEL_METINLERI, SINYAL_METINLERI, TREN_METINLERI } from "./yuzey-metinleri.ts";
import { GORUNUM_KAPAT_KOMUTU, GORUNUM_SEC_KOMUTU } from "./minigraf-gorunum.ts";
import { PANEL_BETIGI, PANEL_STILI } from "./panel-betik.ts";

// ── SEKMELER ────────────────────────────────────────────────────────────────

/** Şeritteki sekmeler, soldan sağa (OZK-13; dördüncü sekme OZK-14'ten beri Sinyaller'dir). */
export const SEKMELER = ["ray", "tren", "makinist", "sinyaller", "ayarlar"] as const;
export type SekmeKimligi = (typeof SEKMELER)[number];
/** İçeriği henüz kurulmamış sekme: yalnız boş durum cümlesi taşır (PNL-A03 sınırı). */
export type BosSekme = Extract<SekmeKimligi, "ayarlar">;

/**
 * SEKME SIRASI (PNL-A23 · OZK-14 DÖRDÜNCÜSÜ · Founder 2026-10-28). Beş sekmenin hepsi sürüklenerek
 * yeniden sıralanabilir; sıra kullanıcı ayarında (`sarmal.sekmeSirasi`) durur ve ayar yoksa paketin
 * varsayılan sırası uygulanır. Sıra ile seçim ayrı şeylerdir: sırayı değiştirmek seçili sekmeyi
 * değiştirmez. Ayardan okunan değer güvenilmez ve bu işlevden geçer: dizi değilse varsayılana düşer;
 * bilinmeyen ve yinelenen kimlikler atılır; eksik kimlikler varsayılandaki sırasıyla sona eklenir.
 * Varsayılan da aynı kurala göre `SEKMELER`e karşı tamamlanır; bozuk bir paket varsayılanı da paneli
 * bozamaz. Sonuç her zaman beş kimliğin her birini tam bir kez taşır.
 */
export function sekmeSirasiNormalle(deger: unknown, varsayilan: unknown = SEKMELER): SekmeKimligi[] {
  const taban = Array.isArray(varsayilan) ? siraTamamla(varsayilan, SEKMELER) : [...SEKMELER];
  return Array.isArray(deger) ? siraTamamla(deger, taban) : taban;
}

function siraTamamla(dizi: readonly unknown[], eksikSirasi: readonly SekmeKimligi[]): SekmeKimligi[] {
  const sonuc: SekmeKimligi[] = [];
  for (const x of dizi) {
    if ((SEKMELER as readonly unknown[]).includes(x) && !sonuc.includes(x as SekmeKimligi)) sonuc.push(x as SekmeKimligi);
  }
  for (const s of eksikSirasi) if (!sonuc.includes(s)) sonuc.push(s);
  return sonuc;
}

/** İki sıra aynı mı (kimlikler aynı yerde mi)? */
export function ayniSira(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

/** Bilinmeyen ya da bozuk değer Ray'e düşer (kalıcı durumdan okunan değer güvenilmez). */
export function sekmeNormalle(v: unknown): SekmeKimligi {
  return (SEKMELER as readonly unknown[]).includes(v) ? (v as SekmeKimligi) : "ray";
}

/** Klavye komşuluğu: oklar sarar, Home ve End uçlara gider; başka tuş seçimi değiştirmez. */
export function komsuSekme(secili: SekmeKimligi, tus: string): SekmeKimligi {
  const i = SEKMELER.indexOf(secili);
  switch (tus) {
    case "ArrowRight": return SEKMELER[(i + 1) % SEKMELER.length]!;
    case "ArrowLeft": return SEKMELER[(i - 1 + SEKMELER.length) % SEKMELER.length]!;
    case "Home": return SEKMELER[0]!;
    case "End": return SEKMELER[SEKMELER.length - 1]!;
    default: return secili;
  }
}

// ── KAÇIRMA VE KÜÇÜK YARDIMCILAR ─────────────────────────────────────────────

/** HTML metni ve nitelik değeri için kaçırma. */
export function kacir(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** SVG'yi tek satıra indirir: yorumlar atılır, boşluklar daralır (CSS veri adresi ve satır içi kullanım). */
export function svgKucult(svg: string): string {
  return svg.replace(/<!--[\s\S]*?-->/g, "").replace(/\s+/g, " ").replace(/>\s+</g, "><").trim();
}

/** Kararlı kısa özet (FNV-1a, 32 bit): ikon sınıf adı içeriğe bağlıdır, sıraya değil. */
function ozet(metin: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < metin.length; i++) { h ^= metin.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36);
}

// ── İKON DEFTERİ ─────────────────────────────────────────────────────────────

/**
 * Satır ikonlarının defteri. Ağaç ikonları açık ve koyu tema için AYRI dosyalardır
 * (somut renkli, `iconPath` deseni); webview'de her satıra gömülmek yerine bir kez
 * CSS kuralı olarak yazılır, satır yalnız sınıf adı taşır. Böylece yüzlerce satırda
 * aynı çizim tekrar etmez.
 */
export class IkonDefteri {
  private readonly kayit = new Map<string, { a: string; k: string }>();

  /** Açık ve koyu çizimi kaydeder, satırın taşıyacağı sınıf adını verir. */
  ekle(acik: string, koyu: string): string {
    const a = svgKucult(acik);
    const k = svgKucult(koyu);
    const sinif = `i${ozet(a + "\u0001" + k)}`;
    this.kayit.set(sinif, { a, k });
    return sinif;
  }

  /** Kayıtlı bütün ikonların CSS kuralları (varsayılan açık, koyu temada koyu çizim). */
  stil(): string {
    const uri = (s: string): string => `url("data:image/svg+xml,${encodeURIComponent(s)}")`;
    const kurallar: string[] = [];
    for (const [sinif, { a, k }] of this.kayit) {
      kurallar.push(`.${sinif}{background-image:${uri(a)}}`);
      if (a !== k) {
        kurallar.push(`body.vscode-dark .${sinif},body.vscode-high-contrast:not(.vscode-high-contrast-light) .${sinif}{background-image:${uri(k)}}`);
      }
    }
    return kurallar.join("\n");
  }

  get boyut(): number { return this.kayit.size; }
}

// ── TEMA İKONLARI (codicon karşılıkları; webview'de codicon yazı tipi yoktur) ──

const TEMA_IKONLARI: Readonly<Record<string, string>> = {
  "pass-filled": `<circle cx="8" cy="8" r="6" fill="currentColor"/><path d="M5.2 8.2l1.9 1.9 3.7-3.9" fill="none" stroke="var(--vscode-sideBar-background,#fff)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>`,
  "pass": `<circle cx="8" cy="8" r="5.6" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M5.4 8.2l1.8 1.8 3.5-3.7" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>`,
  "circle-large-outline": `<circle cx="8" cy="8" r="5.6" fill="none" stroke="currentColor" stroke-width="1.3"/>`,
  "circle-slash": `<circle cx="8" cy="8" r="5.6" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M4.2 11.8l7.6-7.6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>`,
  "sync": `<g class="don"><path d="M13 8a5 5 0 0 1-8.6 3.5M3 8a5 5 0 0 1 8.6-3.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M12.4 2.4l0 2.5H9.9M3.6 13.6v-2.5h2.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></g>`,
};

/** `sync~spin` gibi değiştiricili kimliğin gövdesi; bilinmeyen kimlik boş döner. */
function temaGovdesi(kimlik: string): string {
  const ad = kimlik.split("~")[0]!;
  return TEMA_IKONLARI[ad] ?? "";
}

/** Tema rengi kimliği (`charts.yellow`) → CSS değişkeni (`--vscode-charts-yellow`). */
export function temaRengiDegiskeni(kimlik: string): string {
  return `--vscode-${kimlik.replace(/\./g, "-")}`;
}

// ── AĞAÇ SAĞLAYICISINI SATIRLARA ÇEVİRME ────────────────────────────────────

/** `vscode.TreeItem` yüzünün bu çekirdeğin okuduğu en küçük hâli. */
export interface AgacOgesi {
  id?: string;
  label?: string | { label: string };
  description?: string | boolean;
  tooltip?: string | { value: string };
  iconPath?: unknown;
  /** 0 yaprak · 1 kapalı · 2 açık (`vscode.TreeItemCollapsibleState`). */
  collapsibleState?: number;
  command?: { command: string; arguments?: unknown[] };
  contextValue?: string;
  resourceUri?: { path: string };
  /** 0 işaretsiz · 1 işaretli (`vscode.TreeItemCheckboxState`); ayrıntılı biçimde `{ state }`. */
  checkboxState?: number | { state: number };
}

/** Ağaç sağlayıcısının bu çekirdeğin kullandığı yüzü. */
export interface AgacKaynagi {
  getChildren(oge?: unknown): readonly unknown[];
  getTreeItem(oge: unknown): AgacOgesi;
}

/** Satır eylemi (üzerine gelince beliren küçük düğme). */
export interface PanelEylemi {
  komut: string;
  ad: string;
  ikon: "kart" | "kopya" | "onay";
}

/** İkon çözümünün sonucu: dosyadan gelen çizim çifti ya da tema ikonu. */
export type IkonSonucu =
  | { tur: "dosya"; acik: string; koyu: string }
  | { tur: "tema"; ad: string; renk?: string };

export interface PanelSatiri {
  id: string;
  derinlik: number;
  etiket: string;
  aciklama: string;
  ipucu: string;
  ikonSinifi?: string;
  temaIkonu?: { ad: string; renk?: string };
  /** Yazı rengi için tema değişkeni adı (`--vscode-...`). */
  renk?: string;
  rozet?: string;
  /** Kutucuk durumu; tanımsızsa satırda kutucuk yoktur. */
  isaret?: boolean;
  /** "yaprak" · "kapali" · "acik". */
  durum: "yaprak" | "kapali" | "acik";
  /** Satırın bir komutu var (tıklayınca çalışır); yoksa tıklama aç-kapa yapar. */
  komutlu: boolean;
  eylemler: PanelEylemi[];
}

export interface UretilenSatir {
  satir: PanelSatiri;
  oge: unknown;
  item: AgacOgesi;
}

export interface UretimSecenekleri {
  /** Kullanıcının açık-kapalı tercihi; tercih yoksa düğümün kendi varsayılanı kullanılır. */
  acikMi(id: string, varsayilan: boolean): boolean;
  ikonCoz(iconPath: unknown): IkonSonucu | undefined;
  /** `resourceUri` karar yolu: yazı rengi ve rozet (yol-dekor.ts `dekorCoz` çağıran kabuk). */
  dekor(resourceUri: { path: string } | undefined): { renk?: string; rozet?: string } | undefined;
  eylemler(contextValue: string | undefined): PanelEylemi[];
  defter: IkonDefteri;
  /** Kimlik önekü (kaynaklar arası çakışmayı önler). */
  onek: string;
}

const etiketMetni = (l: AgacOgesi["label"]): string => (typeof l === "string" ? l : l?.label ?? "");
const ipucuMetni = (t: AgacOgesi["tooltip"]): string => (typeof t === "string" ? t : t?.value ?? "");

function durumunuBul(item: AgacOgesi, id: string, sec: UretimSecenekleri): "yaprak" | "kapali" | "acik" {
  const cs = item.collapsibleState ?? 0;
  if (cs === 0) return "yaprak";
  return sec.acikMi(id, cs === 2) ? "acik" : "kapali";
}

/** Bir öğeden satır kurar (ağaç gezisinden bağımsız: tek satır yamasında da kullanılır). */
export function satirKur(kaynak: AgacKaynagi, oge: unknown, id: string, derinlik: number, sec: UretimSecenekleri): UretilenSatir {
  const item = kaynak.getTreeItem(oge);
  const etiket = etiketMetni(item.label);
  const dekor = sec.dekor(item.resourceUri);
  const ikon = sec.ikonCoz(item.iconPath);
  const aciklama = typeof item.description === "string" ? item.description : "";
  const satir: PanelSatiri = {
    id, derinlik, etiket, aciklama,
    ipucu: ipucuMetni(item.tooltip) || [etiket, aciklama].filter(Boolean).join("  "),
    durum: durumunuBul(item, id, sec),
    komutlu: Boolean(item.command),
    eylemler: sec.eylemler(item.contextValue),
  };
  if (ikon?.tur === "dosya") satir.ikonSinifi = sec.defter.ekle(ikon.acik, ikon.koyu);
  else if (ikon?.tur === "tema") satir.temaIkonu = { ad: ikon.ad, renk: ikon.renk };
  if (dekor?.renk) satir.renk = dekor.renk;
  if (dekor?.rozet) satir.rozet = dekor.rozet;
  if (item.checkboxState !== undefined) {
    satir.isaret = (typeof item.checkboxState === "number" ? item.checkboxState : item.checkboxState.state) === 1;
  }
  return { satir, oge, item };
}

/**
 * Sağlayıcının düğümlerini derinlik öncelikli düz satır listesine açar. Açık düğümlerin
 * altı her zaman listededir; kapalı düğümlerin altı ÖNDEN `onden` kapalı kademe kadar
 * listeye girer (PNL-A27). Webview böylece görünen her kapalı dalın çocuklarını elinde
 * tutar ve dalı eklentiye sormadan anında açar. Bütün ağacı göndermek ölçüldü ve
 * reddedildi: Sarmal deposunun planında 11 608 satır, 6,2 MB ve 761 ms'lik üretim her
 * turda eklentinin iş parçacığını tutuyordu. Görünen satırlar `gorunurSatirlar`, çizim
 * kapalı dalın çocuklarını çizilmeyen bir `<template>` içine koyan `satirlarHtml` ile
 * ayrılır. Önden üretilmemiş bir kapalı dalın şablonu yoktur ve o dal eklentiye sorulur.
 * Kardeşler arasında aynı etiket tekrarlanırsa kimlik sıra sayısıyla ayrılır.
 */
export function satirlariUret(kaynak: AgacKaynagi, sec: UretimSecenekleri, onden = 1): UretilenSatir[] {
  const cikti: UretilenSatir[] = [];
  const gez = (ust: unknown | undefined, ustId: string, derinlik: number, kalan: number): void => {
    const cocuklar = kaynak.getChildren(ust);
    const sayac = new Map<string, number>();
    for (const c of cocuklar) {
      const item0 = kaynak.getTreeItem(c);
      const taban = item0.id ?? (etiketMetni(item0.label) || "?");
      const n = sayac.get(taban) ?? 0;
      sayac.set(taban, n + 1);
      const id = `${ustId}/${n ? `${taban}#${n}` : taban}`;
      const u = satirKur(kaynak, c, id, derinlik, sec);
      cikti.push(u);
      // Açık dalın altı aynı payla, kapalı dalın altı pay kalmışsa bir eksik payla üretilir.
      if (u.satir.durum === "acik") gez(c, id, derinlik + 1, kalan);
      else if (u.satir.durum === "kapali" && kalan > 0) gez(c, id, derinlik + 1, kalan - 1);
    }
  };
  gez(undefined, sec.onek, 0, onden);
  return cikti;
}

/**
 * Derinlik öncelikli bütün satır listesinden görünenler (PNL-A27): bütün ataları açık
 * olan satırlar. Kapalı bir satırın altındaki her satır, o satırın derinliğine dönene
 * dek gizlidir.
 */
export function gorunurSatirlar<T extends { satir: Pick<PanelSatiri, "derinlik" | "durum"> }>(tum: readonly T[]): T[] {
  const cikti: T[] = [];
  let kapaliDerinlik = Infinity;
  for (const u of tum) {
    if (u.satir.derinlik > kapaliDerinlik) continue;
    kapaliDerinlik = u.satir.durum === "acik" ? Infinity : u.satir.derinlik;
    cikti.push(u);
  }
  return cikti;
}

/**
 * Hedef öğenin kimliğini bulur. `gez` verilen öğenin altına inilip inilmeyeceğini
 * söyler (Ray değiştirme yalnız varlık düğümlerinin içinde arar, bütün ağacı gezmez).
 * Kimlik, `satirlariUret` ile birebir aynı kuralla kurulur. Bulunamazsa `undefined`.
 */
export function ogeKimligiBul(
  kaynak: AgacKaynagi, hedef: unknown, onek: string, gez: (oge: unknown) => boolean,
): { id: string; atalar: string[] } | undefined {
  const ara = (ust: unknown | undefined, ustId: string, atalar: string[]): { id: string; atalar: string[] } | undefined => {
    const sayac = new Map<string, number>();
    for (const c of kaynak.getChildren(ust)) {
      const item = kaynak.getTreeItem(c);
      const taban = item.id ?? (etiketMetni(item.label) || "?");
      const n = sayac.get(taban) ?? 0;
      sayac.set(taban, n + 1);
      const id = `${ustId}/${n ? `${taban}#${n}` : taban}`;
      if (c === hedef) return { id, atalar };
      if (gez(c)) {
        const bulunan = ara(c, id, [...atalar, id]);
        if (bulunan) return bulunan;
      }
    }
    return undefined;
  };
  return ara(undefined, onek, []);
}

// ── SATIR VE AĞAÇ HTML'İ ─────────────────────────────────────────────────────

const OK_SVG = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const EYLEM_SVG: Readonly<Record<PanelEylemi["ikon"], string>> = {
  kart: `<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2.5" y="3" width="11" height="10" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M5 6.2h6M5 8.6h6M5 11h3.4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>`,
  kopya: `<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="5.4" y="5.4" width="7.6" height="8.1" rx="1.4" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M10.6 3.3L10.6 3.1a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1l0 6.3a1 1 0 0 0 1 1h.2" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>`,
  onay: `<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="5.6" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M5.4 8.2l1.8 1.8 3.5-3.7" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
};

/** Tek satırın HTML'i. */
export function satirHtml(s: PanelSatiri): string {
  const oznitelik = [
    `class="sat"`, `role="treeitem"`, `data-id="${kacir(s.id)}"`, `data-d="${s.derinlik}"`,
    `aria-level="${s.derinlik + 1}"`, `tabindex="-1"`, `style="--d:${s.derinlik}"`,
    `title="${kacir(s.ipucu)}"`,
  ];
  if (s.komutlu) oznitelik.push(`data-komut="1"`);
  if (s.durum !== "yaprak") oznitelik.push(`aria-expanded="${s.durum === "acik"}"`);
  const ok = `<span class="ok">${s.durum === "yaprak" ? "" : OK_SVG}</span>`;
  const kutu = s.isaret === undefined ? ""
    : `<input type="checkbox" class="kt"${s.isaret ? " checked" : ""} aria-label="${kacir(s.etiket)}">`;
  let ikon = "";
  if (s.temaIkonu) {
    const stil = s.temaIkonu.renk ? ` style="color:var(${temaRengiDegiskeni(s.temaIkonu.renk)})"` : "";
    ikon = `<svg class="ik" viewBox="0 0 16 16" aria-hidden="true"${stil}>${temaGovdesi(s.temaIkonu.ad)}</svg>`;
  } else if (s.ikonSinifi) {
    ikon = `<span class="ik ${s.ikonSinifi}" aria-hidden="true"></span>`;
  }
  const renk = s.renk ? ` style="color:var(${temaRengiDegiskeni(s.renk)})"` : "";
  const rozet = s.rozet ? `<span class="rz"${renk} aria-hidden="true">${kacir(s.rozet)}</span>` : "";
  const eylemler = s.eylemler.length
    ? `<span class="eyler">${s.eylemler.map((e) =>
        `<button type="button" class="ey" data-komut="${kacir(e.komut)}" title="${kacir(e.ad)}" aria-label="${kacir(e.ad)}">${EYLEM_SVG[e.ikon]}</button>`).join("")}</span>`
    : "";
  return `<div ${oznitelik.join(" ")}>${ok}${kutu}${ikon}<span class="et"${renk}>${kacir(s.etiket)}</span>`
    + (s.aciklama ? `<span class="ac">${kacir(s.aciklama)}</span>` : "") + rozet + eylemler + `</div>`;
}

/** Satır listesinin HTML'i. */
/**
 * Satır listesinin çizimi. Kapalı satırın altındaki satırlar (liste derinlik öncelikli
 * olduğu için hemen ardından gelenler) çizilmeyen bir `<template data-ust="<kimlik>">`
 * içine konur (PNL-A27): veri webview'dedir, düzen ve boyama dal ilk açılana dek
 * yapılmaz. Şablonun içinde açık dallar düz, kapalı dallar yine şablon olarak durur.
 * `sonra` bir satırın hemen ardına basılacak ek çizimi verir (Makinist'te kapının
 * karar kademesi). Yalnız görünen satırlar verilirse çizim eskisinin aynısıdır.
 */
export function satirlarHtml(satirlar: readonly PanelSatiri[], sonra?: (s: PanelSatiri) => string): string {
  let i = 0;
  const parca = (ustId: string | undefined): string => {
    let html = "";
    while (i < satirlar.length && (ustId === undefined || satirlar[i]!.id.startsWith(`${ustId}/`))) {
      const s = satirlar[i++]!;
      html += satirHtml(s) + (sonra?.(s) ?? "");
      if (s.durum === "kapali") {
        const ic = parca(s.id);
        if (ic) html += `<template data-ust="${kacir(s.id)}">${ic}</template>`;
      }
    }
    return html;
  };
  return parca(undefined);
}

// ── MİNİ GRAF GÖVDESİNİ GÖLGE KÖKE HAZIRLAMA ────────────────────────────────

/**
 * Mini Graf çizicileri tam belge döndürür (`<html><meta><style>…<body>…`). Gölge
 * kökte `body` ve `:root` seçicileri eşleşmez; bu yüzden stil bloklarındaki `body{`
 * ve `:root{` seçicileri `:host{` olur, belge sarmalayıcıları atılır ve gövde ile
 * stiller tek parça verilir. `:root` çevrilmezse satır yüksekliği (`--sat`), kademe
 * girintisi (`--g`) ve kılavuz rengi (`--iz`) tanımsız kalır: satırlar 22 yerine
 * yaklaşık 17 piksel çizilir, 22 piksellik düzene göre çizilen bağ şeridi satırların
 * altından taşar ve gövdeyi uzatır; aşağı kaydıran kullanıcı yazısız çizgiler görür
 * ve yapışkan sekme şeridi gövdenin sonunda ekrandan çıkar.
 * Çizimin kendisine DOKUNULMAZ (Founder: Mini Graf görünüşü aynen kalır).
 */
export function grafParcasi(belge: string): string {
  const stiller = [...belge.matchAll(/<style>([\s\S]*?)<\/style>/g)]
    .map((m) => `<style>${m[1]!.replace(/(^|\})(\s*)(?:body|:root)\s*\{/g, "$1$2:host{")}</style>`).join("");
  const govde = /<body[^>]*>([\s\S]*?)<\/body>/.exec(belge)?.[1] ?? "";
  return `${stiller}${govde}`;
}

// ── BÖLÜMLER ─────────────────────────────────────────────────────────────────

export interface RayBolumu {
  agac: string;
  /** Yol Haritası boşken ağaç yerine gösterilen cümle. */
  bosMesaj?: string;
  /** Mini Graf tam belgesi; tanımsızsa Mini Graf bölümü hiç çizilmez (ayar kapalı). */
  graf?: string;
  /** Katlanmış bölümler (eski ayrı görünümlerin başlığına tıklayınca kapanması gibi). */
  kapali?: Readonly<Partial<Record<BolumKimligi, boolean>>>;
}

/** Ray sekmesinin katlanabilen bölümleri. */
export const BOLUMLER = ["agac", "graf"] as const;
export type BolumKimligi = typeof BOLUMLER[number];
/** Bölümün katlanma durumunun açık-kapalı haritasındaki anahtarı (satır kimlikleriyle çakışmaz). */
export const bolumAnahtari = (b: BolumKimligi): string => `bolum:${b}`;

/**
 * Katlanan bölüm başlığı. Eski panelde Yol Haritası ve Mini Graf ayrı VS Code görünümleriydi ve
 * başlıklarına tıklayınca katlanıyordu (Founder 2026-10-22); başlık düğmedir, ok taşır ve
 * `aria-expanded` bildirir. Gövde `hidden` ile gizlenir; içindeki parça kimlikleri değişmez.
 */
function bolumBasligi(b: BolumKimligi, ad: string, kapali: boolean, araya: boolean): string {
  return `<h2 class="bas${araya ? " araya" : ""}"><button type="button" class="bb" data-bolum="${b}" aria-expanded="${!kapali}"`
    + ` aria-controls="bolum-${b}"><span class="ok">${OK_SVG}</span>${kacir(ad)}</button></h2>`;
}

/**
 * Ray sekmesi: "YOL HARİTASI" başlığı ve ağaç, ardından Mini Graf. Her bölüm başlığıyla birlikte
 * kendi sütununda (`.kol`) durur ve sütunlar `.ray-duzen` içinde dizilir. Geniş ve alçak panelde
 * (Founder'ın alt paneli, PNL-A03) sütunlar yan yana yayılır, dar panelde alt alta akar; bu karar
 * yalnız stildedir (panel-betik.ts), HTML iki ölçüde de aynıdır.
 */
export function rayBolumuHtml(b: RayBolumu): string {
  const baslik = PANEL_METINLERI.yolHaritasiBasligi.toLocaleUpperCase(PANEL_METINLERI.dil);
  const kapali = (k: BolumKimligi): boolean => b.kapali?.[k] === true;
  const govde = (k: BolumKimligi, ic: string): string => `<div id="bolum-${k}" class="bolum"${kapali(k) ? " hidden" : ""}>${ic}</div>`;
  const kolon = (k: BolumKimligi, ic: string): string => `<div class="kol" data-kol="${k}">${ic}</div>`;
  const ag = b.bosMesaj
    ? `<p class="bos">${kacir(b.bosMesaj)}</p>`
    : `<div id="agac" role="tree" aria-label="${kacir(baslik)}">${b.agac}</div>`;
  const bos = b.bosMesaj ? `<div id="agac" role="tree" hidden></div>` : "";
  const graf = b.graf === undefined ? ""
    : kolon("graf", bolumBasligi("graf", PANEL_METINLERI.miniGrafBasligi.toLocaleUpperCase(PANEL_METINLERI.dil), kapali("graf"), true)
      + govde("graf", `<div id="graf"></div><template id="graf-sablon">${grafParcasi(b.graf)}</template>`));
  return `<div class="ray-duzen">${kolon("agac", bolumBasligi("agac", baslik, kapali("agac"), false) + govde("agac", `${ag}${bos}`))}${graf}</div>`;
}

/** Tren sekmesi: tren-cekirdek özetinin sade listesi; kardeş varsa Koşular bağlantısı. */
export function trenBolumuHtml(agac: string, bos: boolean, kardesVar: boolean): string {
  const govde = bos
    ? `<p class="bos">${kacir(TREN_METINLERI.bosDurum)}</p><div id="tren-agac" role="tree" hidden></div>`
    : `<div id="tren-agac" role="tree" aria-label="${kacir(PANEL_METINLERI.sekmeAdi("tren"))}">${agac}</div>`;
  const kardes = kardesVar
    ? `<p class="kardes"><a href="#" data-kardes="1" role="button">${kacir(PANEL_METINLERI.kardesBaglantisi)}</a></p>`
    : "";
  return `${govde}${kardes}`;
}

/** Makinist sekmesi: dört açılır grup. */
export function makinistBolumuHtml(agac: string): string {
  return `<div id="makinist-agac" role="tree" aria-label="${kacir(PANEL_METINLERI.sekmeAdi("makinist"))}">${agac}</div>`;
}

/**
 * Sinyaller sekmesi (PNL-A09 · OZK-14): Dur, Dikkat ve Bilgi bantları ile ayrı Gözlemler
 * bölümü tek ağaçtadır; ağaç sinyaller.ts sağlayıcısından gelir. Kapsamda hiç kayıt
 * yoksa kısa bir boş durum cümlesi gösterilir ve ağacın kabı yine yerinde durur.
 */
export function sinyallerBolumuHtml(agac: string, bos: boolean): string {
  const etiket = kacir(PANEL_METINLERI.sekmeAdi("sinyaller"));
  return bos
    ? `<p class="bos">${kacir(SINYAL_METINLERI.bos)}</p><div id="sinyaller-agac" role="tree" aria-label="${etiket}" hidden></div>`
    : `<div id="sinyaller-agac" role="tree" aria-label="${etiket}">${agac}</div>`;
}

/** Ayarlar sekmesi bu Adımda yalnız boş bölüm olarak doğar; içeriği sonraki Adımların işidir. */
export function bosSekmeHtml(s: BosSekme): string {
  return `<p class="bos" data-bos-sekme="${s}">${kacir(PANEL_METINLERI.bosSekme(s))}</p>`;
}

// ── TAM BELGE ────────────────────────────────────────────────────────────────

export type SekmeSimgeleri = Record<SekmeKimligi, string>;

/** Bir sekmenin bölümü: içerik HTML'i ve satır ikonlarının CSS kuralları. */
export interface SekmeBolumu { html: string; ikonStili: string }

export interface PanelBelgesi {
  /** Seçili sekme: şeritte işaretlidir ve yalnız onun bölümü görünür. */
  sekme: SekmeKimligi;
  /**
   * Beş sekmenin bölümü (PNL-A18). Hepsi webview'de hazır durur; sekme geçişi eklentiye
   * gidip gelen bir yanıt beklemez, yalnız hangi bölümün görüneceğini değiştirir.
   */
  bolumler: Readonly<Record<SekmeKimligi, SekmeBolumu>>;
  simgeler: SekmeSimgeleri;
  nonce: string;
  /** `webview.cspSource` (sınamada boş verilebilir). */
  cspSource: string;
  /** Makinist sekmesinin yanındaki sayı (bekleyen kayıt); 0 ise gizli. */
  rozet: number;
  /** Sinyaller sekmesinin yanındaki Dur ve Dikkat sayıları (PNL-A09); 0 olan gizlidir. */
  sinyalRozeti?: { dur: number; dikkat: number };
  /** Şeritteki sekme sırası (PNL-A23); verilmezse `SEKMELER`. Normallenmiş olmalıdır (`sekmeSirasiNormalle`). */
  sira?: readonly SekmeKimligi[];
}

/** Satır içi SVG simgesi: yalnız kaynak dosyanın kendi svg'si; küçük şeride göre 14 piksele indirilir (PNL-A03). */
function simgeSvg(svg: string): string {
  return svgKucult(svg).replace(/^<svg /, `<svg width="14" height="14" aria-hidden="true" focusable="false" `);
}

/** Sinyaller sekmesinin iki rozeti: Dur ve Dikkat sayıları; sıfır olan gizlidir. */
function sinyalRozetleriHtml(r: { dur: number; dikkat: number }): string {
  const tek = (sinif: "dur" | "dikkat", n: number): string =>
    `<span class="rozet ${sinif}"${n > 0 ? "" : " hidden"}>${n > 0 ? n : ""}</span>`;
  return `<span class="sinyal-rozetleri" title="${kacir(SINYAL_METINLERI.rozetIpucu(r.dur, r.dikkat))}">${tek("dur", r.dur)}${tek("dikkat", r.dikkat)}</span>`;
}

/**
 * Sekme şeridi. Düğmeler verilen sırayla dizilir ve sürüklenebilir (PNL-A23); rozetler kendi düğmesinin
 * içinde durduğu için sırayla birlikte taşınır. Sıra ne olursa olsun seçili sekme `secili`dir.
 */
export function sekmeSeridiHtml(secili: SekmeKimligi, simgeler: SekmeSimgeleri, rozet: number,
  sinyalRozeti: { dur: number; dikkat: number } = { dur: 0, dikkat: 0 }, sira: readonly SekmeKimligi[] = SEKMELER): string {
  const dugmeler = sekmeSirasiNormalle(sira).map((s) => {
    const sec = s === secili;
    const sayi = s === "makinist"
      ? `<span class="rozet"${rozet > 0 ? "" : " hidden"}>${rozet > 0 ? rozet : ""}</span>`
      : s === "sinyaller" ? sinyalRozetleriHtml(sinyalRozeti) : "";
    return `<button type="button" class="sekme" role="tab" id="sekme-${s}" aria-controls="panel-${s}" data-sekme="${s}" aria-selected="${sec}" tabindex="${sec ? 0 : -1}"`
      + ` draggable="true" title="${kacir(`${PANEL_METINLERI.sekmeIpucu(s)}\n${PANEL_METINLERI.sekmeTasimaIpucu}`)}">${simgeSvg(simgeler[s])}<span class="sk-ad">${kacir(PANEL_METINLERI.sekmeAdi(s))}</span>${sayi}</button>`;
  }).join("");
  return `<nav class="seritler" role="tablist" aria-label="${kacir(PANEL_METINLERI.seritEtiketi)}">${dugmeler}</nav>`;
}

/**
 * Sekmenin bölüm kabı (PNL-A18): sekme kimliğini taşır ve yalnız seçili sekmeninki görünür. Eklentiden
 * gelen her güncelleme hedefini kendi sekmesinin kabının içinde arar; bir sekmenin içeriği başka bir
 * sekmenin kabına yazılamaz.
 */
export function sekmePaneliHtml(s: SekmeKimligi, secili: SekmeKimligi, icerik: string): string {
  return `<div id="panel-${s}" class="sekme-paneli" role="tabpanel" data-sekme="${s}" aria-labelledby="sekme-${s}"${s === secili ? "" : " hidden"}>${icerik}</div>`;
}

/** Webview'in tam belgesi: şerit, beş sekmenin bölümü, betik. Bölümler ilk çizimle birlikte gelir. */
export function panelHtml(b: PanelBelgesi): string {
  const csp = [
    "default-src 'none'",
    "style-src 'unsafe-inline'",
    `script-src 'nonce-${b.nonce}'`,
    `img-src data: ${b.cspSource}`.trim(),
    `font-src ${b.cspSource}`.trim(),
  ].join("; ");
  return `<!DOCTYPE html><html lang="${PANEL_METINLERI.dil}"><head><meta charset="UTF-8">`
    + `<meta http-equiv="Content-Security-Policy" content="${csp}">`
    + `<meta name="viewport" content="width=device-width, initial-scale=1.0">`
    + `<title>${kacir(PANEL_METINLERI.panelAdi)}</title>`
    + `<style>${PANEL_STILI}</style>`
    // Her sekmenin satır ikonları kendi stil öğesindedir: bir sekmenin güncellemesi ötekinin ikonlarını silmez.
    + SEKMELER.map((s) => `<style id="ikon-stil-${s}">${b.bolumler[s].ikonStili}</style>`).join("")
    + `</head><body>`
    + sekmeSeridiHtml(b.sekme, b.simgeler, b.rozet, b.sinyalRozeti, b.sira)
    + `<div id="icerik">${SEKMELER.map((s) => sekmePaneliHtml(s, b.sekme, b.bolumler[s].html)).join("")}</div>`
    + `<script nonce="${b.nonce}">${PANEL_BETIGI}</script></body></html>`;
}

// ── KOMUT KÖPRÜSÜ ───────────────────────────────────────────────────────────

/** İzinli komut köprüsü: Mini Graf bağları yalnız bu üç komutu çalıştırabilir. */
export const GRAF_KOMUTLARI: ReadonlySet<string> = new Set(["sarmal.dosyaAc", GORUNUM_SEC_KOMUTU, GORUNUM_KAPAT_KOMUTU]);
/** Satır eylemi olarak çalıştırılabilen komutlar (satırın kendi eylem listesinde de bulunmalıdır). */
export const EYLEM_KOMUTLARI: ReadonlySet<string> = new Set(["sarmal.koniKart", "sarmal.satiriKopyala", "sarmal.hatirlaticiKapat"]);

/** Satırın bağlam değerinden eylem düğmeleri (üzerine gelince beliren küçük düğmeler). */
export function satirEylemleri(contextValue: string | undefined): PanelEylemi[] {
  if (!contextValue) return [];
  const kopya: PanelEylemi = { komut: "sarmal.satiriKopyala", ad: PANEL_METINLERI.satiriKopyala, ikon: "kopya" };
  if (contextValue === "adim") return [{ komut: "sarmal.koniKart", ad: PANEL_METINLERI.koniKarti, ikon: "kart" }];
  if (contextValue === "sarmalHatirlaticiAtesledi") {
    return [{ komut: "sarmal.hatirlaticiKapat", ad: PANEL_METINLERI.hatirlaticiKapat, ikon: "onay" }, kopya];
  }
  if (/^sarmal(Hatirlatici|Bildirim|Fikir)/.test(contextValue)) return [kopya];
  return [];
}

/** `command:kimlik?[argümanlar]` bağını ayrıştırır; izinsiz komut ya da bozuk argüman `undefined` döner. */
export function grafKomutu(href: string): { komut: string; argumanlar: unknown[] } | undefined {
  if (!href.startsWith("command:")) return undefined;
  const govde = href.slice("command:".length);
  const i = govde.indexOf("?");
  const komut = i < 0 ? govde : govde.slice(0, i);
  if (!GRAF_KOMUTLARI.has(komut)) return undefined;
  let argumanlar: unknown[] = [];
  if (i >= 0) {
    try {
      const ham = JSON.parse(decodeURIComponent(govde.slice(i + 1))) as unknown;
      argumanlar = Array.isArray(ham) ? ham : [ham];
    } catch { return undefined; }
  }
  if (komut === "sarmal.dosyaAc" && !(typeof argumanlar[0] === "string" && typeof argumanlar[1] === "number")) return undefined;
  if (komut === GORUNUM_SEC_KOMUTU && typeof argumanlar[0] !== "string") return undefined;
  return { komut, argumanlar };
}


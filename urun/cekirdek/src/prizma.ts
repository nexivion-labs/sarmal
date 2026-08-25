// ═══════════════════════════════════════════════════════════════════════════
// prizma.ts — 🔺 PRİZMA PROJEKTÖRÜ (FEL-5 · tek kaynak → dört yüz)
//
//   Manifestonun kodda karşılığı: tek `.sar` parse edilir → tek NÖTR ağaç
//   ("beyaz ışık", yalınla()) → üç kodlayıcı ("üç renk"): jsonYüz · yamlYüz ·
//   xmlYüz. Dördüncü yüz (MD, insan) belgele.ts'te yaşar. Hepsi TEK parse'tan
//   doğduğu için birbirinden KOPAMAZ (drift imkânsız — Prizma'nın tüm iddiası).
//
//   Yüz → tüketici:  JSON ⚙️ makine · YAML 🔧 config · XML 🤖 ajan · MD 👤 insan.
//   v1 = YAPISAL projeksiyon (aynı ağaç, dört sadık kodlama). Hedefli artefakt
//   (üretir/meyve) runtime işidir (RAY-3), buraya girmez.
//
//   SIFIR çalışma-zamanı bağımlılığı (STR-3.1): YAML/XML elle kodlanır.
// ═══════════════════════════════════════════════════════════════════════════

import { belirtecle } from "./belirtec.ts";
import { ayristir } from "./ayristirici.ts";
import type { Program, Dugum, Deger } from "./sozdizim.ts";

// ── Nötr ara-temsil ("beyaz ışık") ──────────────────────────────────────────
//    Parse ağacından süzülen, formata-bağımsız yalın JS. Her yüz bunu kodlar.

export type YalınDeğer = string | number | boolean | null | YalınDeğer[] | { [k: string]: YalınDeğer };

export interface YalınDüğüm {
  tip: string;                        // widget tip adı · "çağır" · tip/kural tanımı
  kod?: string;                       // kimlik (kod alanı) — varsa öne çıkarılır
  alanlar: Record<string, YalınDeğer>; // parametreler + gövde özellikleri (kod hariç)
  belge?: string;                     // /// veya -->| anlatısı (çok-satırlı olabilir)
  çocuklar?: YalınDüğüm[];            // gövde içi alt-widget'lar
}

/** Bir Deger'i nötr JS değerine indirger (formata bağımsız). */
function değerYalın(d: Deger): YalınDeğer {
  switch (d.tur) {
    case "metin":
      return d.metin ?? "";
    case "sayı":
      return Number(d.metin);
    case "kod":
    case "anahtar":   // #küme.ad
    case "erişim":    // kullanıcı.ad
      return d.metin ?? "";
    case "liste":
      return (d.ogeler ?? []).map(değerYalın);
    case "harita": {
      const o: Record<string, YalınDeğer> = {};
      for (const c of d.ciftler ?? []) o[c.ad] = değerYalın(c.deger);
      return o;
    }
    case "widget":
      return d.dugum ? düğümYalın(d.dugum) as unknown as YalınDeğer : null;
    case "ifade": {
      // sol İŞLEM sağ (tekli `değil sağ`) — metin biçimine geri dök.
      const sağ = d.sag ? değerMetni(d.sag) : "";
      const sol = d.sol ? değerMetni(d.sol) : "";
      return d.sol ? `${sol} ${d.islem} ${sağ}` : `${d.islem} ${sağ}`;
    }
    default:
      return d.metin ?? null;
  }
}

/** İfade işleneni için sade metin (yalnız ifade yeniden-kurulumunda kullanılır). */
function değerMetni(d: Deger): string {
  const v = değerYalın(d);
  return typeof v === "object" ? JSON.stringify(v) : String(v);
}

/** Bir Dugum'u YalınDüğüm'e çevirir (özyineli). */
export function düğümYalın(d: Dugum): YalınDüğüm {
  const alanlar: Record<string, YalınDeğer> = {};
  let kod: string | undefined;
  for (const p of [...d.parametreler, ...d.ozellikler]) {
    // A11/E4 (bug-avı): tırnaklı kod: "X" da kimliktir — kodIndeksle ile tutarlı
    // (eskiden yalnız çıplak kod öne çıkıyor, tırnaklı kimlik alanlara düşüyordu).
    if (p.ad === "kod" && (p.deger.tur === "kod" || p.deger.tur === "metin") && p.deger.metin) {
      kod = p.deger.metin; continue;
    }
    alanlar[p.ad] = değerYalın(p.deger);
  }
  const y: YalınDüğüm = { tip: d.tur === "widget" ? d.ad : d.tur, alanlar };
  if (d.tur !== "widget") y.alanlar["ad"] = d.ad;   // çağır/tanım: hedef adı korunur
  if (kod !== undefined) y.kod = kod;
  if (d.belge) y.belge = d.belge;
  if (d.cocuklar.length) y.çocuklar = d.cocuklar.map(düğümYalın);
  return y;
}

/** Program'ı nötr ağaca çevirir: tek kök → düğüm, çok kök → dizi. */
export function yalınla(program: Program): YalınDüğüm | YalınDüğüm[] {
  const kökler = program.bildirimler.map(düğümYalın);
  return kökler.length === 1 ? kökler[0] : kökler;
}

// ── ⚙️ JSON yüzü (makine) — determinizm, JSON.stringify yerleşik ─────────────

export function jsonYüz(kaynak: string): string {
  const program = ayristir(belirtecle(kaynak));
  return JSON.stringify(yalınla(program), null, 2) + "\n";
}

// ── 🔧 YAML yüzü (config) — elle, sıfır bağımlılık ──────────────────────────

const YAML_GÜVENSİZ = /[:#\[\]{}&*!|>'"%@`,]|^[\s-]|[\s]$|^$/;
// Tırnaksız bırakılırsa YAML'ın BAŞKA TİPE okuyacağı dizgiler (tip-drifti önlenir):
// sayı-görünümlü ("007", "1.0", "1e3") + bool/null sözcükleri (YAML 1.1 dahil).
const YAML_TIP_CALAN = /^(?:[-+]?(?:\d[\d_]*\.?[\d_]*(?:[eE][-+]?\d+)?|\.\d+)|true|false|yes|no|on|off|null|~|True|False|Yes|No|On|Off|Null|NULL|TRUE|FALSE)$/;

function yamlDizgi(s: string): string {
  if (s.includes("\n")) return s;              // çok-satır: çağıran blok-skalarla işler
  return YAML_GÜVENSİZ.test(s) || YAML_TIP_CALAN.test(s)
    ? `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`
    : s;
}

/** Çok-satırlı metni YAML literal blok-skaları olarak yazar (`|`). */
function yamlBlok(metin: string, girinti: string): string {
  const satırlar = metin.replace(/\n+$/, "").split("\n");
  return "|\n" + satırlar.map((s) => (s === "" ? "" : girinti + s)).join("\n");
}

function yamlDeğer(v: YalınDeğer, girinti: string): string {
  if (v === null) return "~";
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (typeof v === "string") {
    return v.includes("\n") ? yamlBlok(v, girinti + "  ") : yamlDizgi(v);
  }
  if (Array.isArray(v)) {
    if (v.length === 0) return "[]";
    return "\n" + v.map((e) => {
      const r = yamlDeğer(e, girinti);
      if (r.startsWith("\n")) {
        // kapsayıcı öğe (nesne): ilk anahtarı "- "in yanına çek; sonraki satırlar
        // içGirinti ile hizalı kalır (aynı uzunluk → kanonik, geçerli YAML).
        const içGirinti = girinti + "  ";
        return girinti + "- " + r.slice(1).slice(içGirinti.length);
      }
      return `${girinti}- ${r}`;              // skalar öğe
    }).join("\n");
  }
  // nesne
  const anahtarlar = Object.keys(v);
  if (anahtarlar.length === 0) return "{}";
  return "\n" + anahtarlar.map((k) => yamlAlan(k, v[k], girinti + "  ")).join("\n");
}

function yamlAlan(anahtar: string, v: YalınDeğer, girinti: string): string {
  const k = YAML_GÜVENSİZ.test(anahtar) ? `"${anahtar}"` : anahtar;
  const r = yamlDeğer(v, girinti);
  return `${girinti}${k}:${r.startsWith("\n") ? r : " " + r}`;
}

export function yamlYüz(kaynak: string): string {
  const program = ayristir(belirtecle(kaynak));
  const kök = yalınla(program);
  const ağaç = Array.isArray(kök) ? kök : [kök];
  return ağaç.map((n) => yamlAlan(n.tip, yalınGövde(n), "")).join("\n") + "\n";
}

// ── 🤖 XML yüzü (ajan) — elle; ağaç ↔ XML ağacı izomorfizmi ──────────────────

function xmlKaçış(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function xmlNitelikKaçış(s: string): string {
  return xmlKaçış(s).replace(/"/g, "&quot;");
}
/** CDATA-güvenli sarma: içerikte "]]>" geçerse bölünerek kaçılır (XML standardı). */
function cdata(s: string): string {
  return `<![CDATA[${s.split("]]>").join("]]]]><![CDATA[>")}]]>`;
}

function xmlDeğer(anahtar: string, v: YalınDeğer, girinti: string): string {
  const et = anahtar;
  if (v === null) return `${girinti}<${et}/>`;
  if (Array.isArray(v)) {
    if (v.length === 0) return `${girinti}<${et}/>`;
    const iç = v.map((e) => xmlDeğer("öğe", e, girinti + "  ")).join("\n");
    return `${girinti}<${et}>\n${iç}\n${girinti}</${et}>`;   // alan adı sarmalayıcı olur
  }
  if (typeof v === "object") {
    const iç = Object.keys(v).map((k) => xmlDeğer(k, v[k], girinti + "  ")).join("\n");
    return `${girinti}<${et}>\n${iç}\n${girinti}</${et}>`;
  }
  const metin = typeof v === "string" ? xmlKaçış(v) : String(v);
  return metin.includes("\n")
    ? `${girinti}<${et}>${cdata(typeof v === "string" ? v : metin)}</${et}>`
    : `${girinti}<${et}>${metin}</${et}>`;
}

function xmlDüğüm(n: YalınDüğüm, girinti: string): string {
  const nitelik = n.kod !== undefined ? ` kod="${xmlNitelikKaçış(n.kod)}"` : "";
  const içler: string[] = [];
  for (const k of Object.keys(n.alanlar)) içler.push(xmlDeğer(k, n.alanlar[k], girinti + "  "));
  if (n.belge) içler.push(`${girinti}  <belge>${cdata(n.belge)}</belge>`);
  for (const c of n.çocuklar ?? []) içler.push(xmlDüğüm(c, girinti + "  "));
  if (içler.length === 0) return `${girinti}<${n.tip}${nitelik}/>`;
  return `${girinti}<${n.tip}${nitelik}>\n${içler.join("\n")}\n${girinti}</${n.tip}>`;
}

export function xmlYüz(kaynak: string): string {
  const program = ayristir(belirtecle(kaynak));
  const kök = yalınla(program);
  const ağaç = Array.isArray(kök) ? kök : [kök];
  const gövde = ağaç.map((n) => xmlDüğüm(n, "")).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n${gövde}\n`;
}

// ── ortak: bir düğümün gövdesini (kod/belge/çocuklar dahil) nesneye düzler ───
//    YAML/XML kök yazımı için düğümü tek nesne gibi görür.

function yalınGövde(n: YalınDüğüm): Record<string, YalınDeğer> {
  const o: Record<string, YalınDeğer> = {};
  if (n.kod !== undefined) o["kod"] = n.kod;
  for (const k of Object.keys(n.alanlar)) o[k] = n.alanlar[k];
  if (n.belge) o["belge"] = n.belge;
  if (n.çocuklar?.length) o["çocuklar"] = n.çocuklar.map((c) => ({ [c.tip]: yalınGövde(c) }));
  return o;
}

// ── tek kapı: yüz seç ────────────────────────────────────────────────────────

export type Yüz = "json" | "yaml" | "xml";

/** .sar kaynağını seçilen yüze yansıtır (saf — söz-dizim hatası fırlatabilir). */
export function yansıt(kaynak: string, yüz: Yüz): string {
  switch (yüz) {
    case "json": return jsonYüz(kaynak);
    case "yaml": return yamlYüz(kaynak);
    case "xml":  return xmlYüz(kaynak);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// tema-designmd.ts — Tema ↔ DESIGN.md dönüştürücü (D3 import + D4 export)
//
//   DESIGN.md (Google Labs, Apache-2.0 AÇIK standart) ↔ Sarmal Tema.
//   Stitch ARACINA değil AÇIK STANDARDA bağlan (YUZ-1.1) → tüm DESIGN.md
//   araçlarıyla konuş, hiçbirine mahkûm olma.
//   SIFIR bağımlılık (STR-3.1): YAML mini-parser elle (DESIGN.md subset).
//
//   Eşleme (EN ↔ TR):  primary↔ana · secondary↔ikincil · tertiary↔üçüncül ·
//   neutral↔nötr · h1↔h1 · body-md↔gövde · label-caps↔etiket ·
//   colors↔renkler · typography↔tipografi · rounded↔yuvarlaklık · spacing↔boşluk.
// ═══════════════════════════════════════════════════════════════════════════

import type { Program, Dugum } from "./sozdizim.ts";

// ── eşleme tabloları (DESIGN.md EN ↔ Sarmal TR) ──────────────────────────────
const RENK: Record<string, string> = { primary: "ana", secondary: "ikincil", tertiary: "üçüncül", neutral: "nötr" };
const TIPO: Record<string, string> = { "h1": "h1", "body-md": "gövde", "label-caps": "etiket" };

function ters(m: Record<string, string>): Record<string, string> {
  const o: Record<string, string> = {};
  for (const k in m) o[m[k]] = k;
  return o;
}
const RENK_TERS = ters(RENK);
const TIPO_TERS = ters(TIPO);

// ═══ D3: DESIGN.md → Tema .sar ═══════════════════════════════════════════════
export function designmdTema(md: string): string {
  const kok = yamlAyristir(frontmatterCek(md));
  const overview = bolumCek(md, "Overview");
  const ad = String((kok as Record<string, unknown>).name ?? "Tema");
  const kod = "TEM-" + ad.replace(/\s+/g, "");
  const ne = overview || `${ad} teması`;

  const satirlar: string[] = [`Tema( kod: ${kod}, ne: ${JSON.stringify(ne)} ) {`];
  const k = kok as Record<string, unknown>;
  if (nesne(k.colors))     satirlar.push(`  renkler: { ${harita(k.colors, (x) => RENK[x] ?? x, (v) => String(v))} }`);
  if (nesne(k.typography)) satirlar.push(`  tipografi: { ${harita(k.typography, (x) => TIPO[x] ?? x, tipoDuz)} }`);
  if (nesne(k.rounded))    satirlar.push(`  yuvarlaklık: { ${harita(k.rounded, (x) => x, (v) => String(v))} }`);
  if (nesne(k.spacing))    satirlar.push(`  boşluk: { ${harita(k.spacing, (x) => x, (v) => String(v))} }`);
  satirlar.push("}");
  return satirlar.join("\n") + "\n";
}

function nesne(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function harita(obj: unknown, anahtar: (k: string) => string, deger: (v: unknown) => string): string {
  const o = obj as Record<string, unknown>;
  return Object.keys(o).map((k) => `${anahtar(k)}: ${JSON.stringify(deger(o[k]))}`).join(", ");
}

/** DESIGN.md typography {fontFamily, fontSize} → Sarmal "fontFamily fontSize". */
function tipoDuz(v: unknown): string {
  if (nesne(v)) return `${v.fontFamily ?? ""} ${v.fontSize ?? ""}`.trim();
  return String(v);
}

// ═══ D4: Tema .sar → DESIGN.md ═══════════════════════════════════════════════
export function temaDesignmd(program: Program): string {
  const tema = temaBul(program);
  if (!tema) return "";
  const ne = param(tema, "ne") ?? ozellik(tema, "ne") ?? "";
  const ad = (param(tema, "kod") ?? "Tema").replace(/^TEM-/, "");

  const yaml: string[] = [`name: ${ad}`];
  if (ne) yaml.push(`description: ${ne}`);

  const renkler = haritaOku(tema, "renkler");
  if (renkler.length) { yaml.push("colors:"); for (const [k, v] of renkler) yaml.push(`  ${RENK_TERS[k] ?? k}: "${v}"`); }

  const tipo = haritaOku(tema, "tipografi");
  if (tipo.length) {
    yaml.push("typography:");
    for (const [k, v] of tipo) {
      yaml.push(`  ${TIPO_TERS[k] ?? k}:`);
      const [ff, fs] = tipoBol(v);
      if (ff) yaml.push(`    fontFamily: ${ff}`);
      if (fs) yaml.push(`    fontSize: ${fs}`);
    }
  }
  const yuv = haritaOku(tema, "yuvarlaklık");
  if (yuv.length) { yaml.push("rounded:"); for (const [k, v] of yuv) yaml.push(`  ${k}: ${v}`); }
  const bos = haritaOku(tema, "boşluk");
  if (bos.length) { yaml.push("spacing:"); for (const [k, v] of bos) yaml.push(`  ${k}: ${v}`); }

  return `---\n${yaml.join("\n")}\n---\n\n## Overview\n\n${ne}\n`;
}

/** "Public Sans 3rem" → ["Public Sans", "3rem"] (son boşluktan böl). */
function tipoBol(v: string): [string, string] {
  const i = v.lastIndexOf(" ");
  return i < 0 ? [v, ""] : [v.slice(0, i), v.slice(i + 1)];
}

// ── AST yardımcıları ─────────────────────────────────────────────────────────
function temaBul(program: Program): Dugum | undefined {
  let bulunan: Dugum | undefined;
  const gez = (d: Dugum): void => {
    if (d.tur === "widget" && d.ad === "Tema" && !bulunan) bulunan = d;
    for (const c of d.cocuklar) gez(c);
  };
  for (const b of program.bildirimler) gez(b);
  return bulunan;
}
function param(d: Dugum, ad: string): string | undefined {
  return d.parametreler.find((p) => p.ad === ad)?.deger.metin;
}
function ozellik(d: Dugum, ad: string): string | undefined {
  return d.ozellikler.find((o) => o.ad === ad)?.deger.metin;
}
function haritaOku(d: Dugum, ad: string): Array<[string, string]> {
  const o = d.ozellikler.find((x) => x.ad === ad);
  if (!o || o.deger.tur !== "harita") return [];
  return (o.deger.ciftler ?? []).map((c) => [c.ad, c.deger.metin ?? ""] as [string, string]);
}

// ── DESIGN.md ayrıştırma (frontmatter + bölüm + mini-YAML) ────────────────────
function frontmatterCek(md: string): string {
  const m = md.match(/^---\n([\s\S]*?)\n---/);
  return m ? m[1] : "";
}
function bolumCek(md: string, baslik: string): string {
  const m = md.match(new RegExp(`##\\s+${baslik}\\s*\\n+([^\\n]+)`, "i"));
  return m ? m[1].trim() : "";
}

/** Mini-YAML: DESIGN.md subset — 2-boşluk girintili nested (genel YAML DEĞİL). */
function yamlAyristir(fm: string): unknown {
  const kok: Record<string, unknown> = {};
  const stack: Array<{ indent: number; obj: Record<string, unknown> }> = [{ indent: -1, obj: kok }];
  for (const ham of fm.split("\n")) {
    if (!ham.trim() || ham.trim().startsWith("#")) continue;
    const indent = ham.length - ham.trimStart().length;
    const satir = ham.trim();
    const iki = satir.indexOf(":");
    if (iki < 0) continue;
    const anahtar = satir.slice(0, iki).trim();
    const deger = satir.slice(iki + 1).trim();
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop();
    const ust = stack[stack.length - 1].obj;
    if (deger === "") {
      const yeni: Record<string, unknown> = {};
      ust[anahtar] = yeni;
      stack.push({ indent, obj: yeni });
    } else {
      ust[anahtar] = tirnakSil(deger);
    }
  }
  return kok;
}
function tirnakSil(s: string): string {
  return s.replace(/^["']|["']$/g, "");
}

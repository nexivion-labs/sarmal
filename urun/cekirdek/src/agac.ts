// ═══════════════════════════════════════════════════════════════════════════
// agac.ts — 🌳 AĞAÇ YÜZÜ (Prizma 5. yüz · YUZ-1.1 · plan/agac_yuzu.sar)
//
//   Nötr ağaçtan (prizma.ts · YalınDüğüm) klasik ├──/└── klasör-ağacı çizimini
//   render eder. Kaynak `.sar` ASLA değişmez — bu türetilen bir YÜZ'dür (FEL-5).
//   Her satır = girinti-öneki + isim (yol⇒klasör · kod⇒yaprak) + "# " + ne.
//   Kapsam ①: kök zorunlu değil — herhangi bir düğümden alt-ağaç render edilir.
//   Kesim (STR-3.1 soru-①): deterministik düğüm→çizim (I/O şekli) → 🔓 AÇIK.
// ═══════════════════════════════════════════════════════════════════════════

import { belirtecle } from "./belirtec.ts";
import { ayristir } from "./ayristirici.ts";
import { yalınla, type YalınDüğüm, type YalınDeğer } from "./prizma.ts";

export interface AgacSecenek {
  kod?: boolean;      // her satıra [KOD] kimlik etiketi ekle (kimlik-varyantı)
  kokAd?: string;     // kök satırının adı (verilmezse düğümden türetilir)
  kokYorum?: boolean; // kök satırına da yorum bas (varsayılan: hayır — sade)
}

interface Satır { onek: string; isim: string; yorum: string; }

// ── görüntü genişliği: emoji/geniş imler 2 kolon, diğerleri 1 (hizalama için) ──
//    Ad kolonu genelde emoji'sizdir; yine de sağlam olması için köşe durumu sayılır.
function genişlik(s: string): number {
  let g = 0;
  for (const ch of s) {                       // for..of → kod-noktası (surrogate çifti tek)
    const cp = ch.codePointAt(0)!;
    g += (cp >= 0x1100 && (
      cp <= 0x115f ||                          // Hangul Jamo
      (cp >= 0x2600 && cp <= 0x27bf) ||        // simgeler/dingbat
      (cp >= 0x1f000 && cp <= 0x1faff) ||      // emoji düzlemleri
      (cp >= 0x2e80 && cp <= 0xa4cf) ||        // CJK
      (cp >= 0xff00 && cp <= 0xff60)           // tam-genişlik
    )) ? 2 : 1;
  }
  return g;
}

// ── bir düğümün adı: yol (klasör) > kod (yaprak) > tip ───────────────────────
function isimBul(n: YalınDüğüm): string {
  const yol = n.alanlar["yol"];
  if (typeof yol === "string" && yol) return yol;
  if (n.kod) return n.kod;
  return n.tip;
}

// ── bir düğümün yorumu: `ne` alanı (+ opsiyonel kod/kararlılık etiketleri) ────
function yorumBul(n: YalınDüğüm, _sec: AgacSecenek): string {
  const ne = n.alanlar["ne"];
  let y = typeof ne === "string" ? ne.replace(/\s*⏎\s*/g, " ").trim() : "";
  const kar = n.alanlar["kararlılık"];
  if (typeof kar === "string" && kar === "değişmez") y += (y ? "  " : "") + "[değişmez]";
  return y;
}

// ── çocukları topla: gerçek çocuklar + `raflar: {}` kısayolu (yaprak raflar) ──
type Çocuk = { dugum?: YalınDüğüm; isim: string; yorum: string };
function çocuklarıTopla(n: YalınDüğüm, sec: AgacSecenek): Çocuk[] {
  const liste: Çocuk[] = [];
  for (const c of n.çocuklar ?? []) {
    liste.push({ dugum: c, isim: isimBul(c), yorum: yorumBul(c, sec) });
  }
  const raflar = n.alanlar["raflar"];
  if (raflar && typeof raflar === "object" && !Array.isArray(raflar)) {
    for (const anahtar of Object.keys(raflar as Record<string, YalınDeğer>)) {
      const v = (raflar as Record<string, YalınDeğer>)[anahtar];
      liste.push({ isim: anahtar + "/", yorum: typeof v === "string" ? v : "" });
    }
  }
  return liste;
}

// ── özyineli gezinti: her düğüm için satır + dal-önekleri ────────────────────
function gez(çocuklar: Çocuk[], öntakı: string, satırlar: Satır[], sec: AgacSecenek): void {
  çocuklar.forEach((k, i) => {
    const son = i === çocuklar.length - 1;
    const isim = sec.kod && k.dugum?.kod ? `${k.isim}  [${k.dugum.kod}]` : k.isim;
    satırlar.push({ onek: öntakı + (son ? "└── " : "├── "), isim, yorum: k.yorum });
    if (k.dugum) {
      gez(çocuklarıTopla(k.dugum, sec), öntakı + (son ? "    " : "│   "), satırlar, sec);
    }
  });
}

// ── hizalama: '# yorum' hepsi ortak sütuna; yorumsuz satır çıplak kalır ──────
function hizala(satırlar: Satır[]): string {
  const enGeniş = Math.max(0, ...satırlar.filter((s) => s.yorum).map((s) => genişlik(s.onek + s.isim)));
  return satırlar.map((s) => {
    const sol = s.onek + s.isim;
    if (!s.yorum) return sol;
    return sol + " ".repeat(enGeniş - genişlik(sol) + 1) + "# " + s.yorum;
  }).join("\n");
}

/** Bir nötr düğümü ├──/└── ağaç çizimine render eder (kök + alt-ağaç). */
export function agacUret(kök: YalınDüğüm, sec: AgacSecenek = {}): string {
  const satırlar: Satır[] = [];
  const kokIsim = sec.kokAd ?? (kök.alanlar["ad"] as string) ?? isimBul(kök);
  satırlar.push({ onek: "", isim: kokIsim, yorum: sec.kokYorum ? yorumBul(kök, sec) : "" });
  gez(çocuklarıTopla(kök, sec), "", satırlar, sec);
  return hizala(satırlar);
}

/** Yalın ağaçta verilen KOD'lu düğümü bulur (ağaç-yüzü turu · alt-ağaç kökü). */
export function dugumBul(kök: YalınDüğüm, kod: string): YalınDüğüm | undefined {
  if (kök.kod === kod) return kök;
  for (const c of kök.çocuklar ?? []) {
    const b = dugumBul(c, kod);
    if (b) return b;
  }
  return undefined;
}

/** `.sar` kaynağını doğrudan ağaç yüzüne yansıtır (tek kök beklenir).
 *  `altKok` verilirse yalnız o KOD'lu düğümün alt-ağacı basılır (L2). */
export function agacYüz(kaynak: string, sec: AgacSecenek & { altKok?: string } = {}): string {
  const kök = yalınla(ayristir(belirtecle(kaynak)));
  let köke = Array.isArray(kök) ? kök : [kök];
  if (sec.altKok) {
    const bulunanlar = köke.map((n) => dugumBul(n, sec.altKok!)).filter((n): n is YalınDüğüm => !!n);
    if (!bulunanlar.length) {
      throw new Error(`'${sec.altKok}' kodlu düğüm bu kaynakta yok — alt ağacın kökü çözülemediği için ağaç üretilemedi.`);
    }
    köke = bulunanlar;
  }
  return köke.map((n) => agacUret(n, sec)).join("\n\n") + "\n";
}

// ── README oto-blok (ağaç-yüzü turu) ─────────────────────────────────────────────
//    İşaretli bölge her üretimde agacUret çıktısıyla yenilenir; işaret dışındaki
//    README metni KORUNUR. İdempotent: aynı kaynak → bit-birebir aynı blok.

export const AGAC_BAS = "<!-- SARMAL:AGAC -->";
export const AGAC_SON = "<!-- /SARMAL:AGAC -->";

export function agacBlokUygula(mevcut: string, agac: string): string {
  const blok = [
    AGAC_BAS,
    "<!-- Bu ağaç .sar kaynağından ÜRETİLİR — elle yapılan düzenleme bir sonraki üretimde silinir (YUZ-2.3). Tazele: sarmal agac <kaynak.sar> --readme <bu dosya> -->",
    "```",
    agac.trimEnd(),
    "```",
    AGAC_SON,
  ].join("\n");
  const bas = mevcut.indexOf(AGAC_BAS);
  const son = mevcut.indexOf(AGAC_SON);
  if (bas >= 0 && son > bas) {
    return mevcut.slice(0, bas) + blok + mevcut.slice(son + AGAC_SON.length);
  }
  return mevcut.replace(/\n*$/, "\n\n") + blok + "\n";
}

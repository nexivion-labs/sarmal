// ═══════════════════════════════════════════════════════════════════════════
// belgele.ts — .sar → Markdown üretici (DIL-2 ⑥ "sarmal belge" — saf çekirdek)
//
//   Tek kaynak `.sar`; MD YALNIZ ÜRETİLİR (elle MD-ikiz = drift fabrikası).
//   İki tüketici:
//     • CLI: `sarmal belge <dosya.sar>` → stdout (README/belge dökümü)
//     • Eklenti: önizleme — üretilen MD, VS Code'un YERLİ markdown
//       önizlemesinde açılır (Founder 2026-07-03: webview değil, gerçek MD).
//
//   Çeviri haritası:
//     belge blokları (DIL-2.2 /// + DIL-2 -->|)  → MD gövdesi (zaten markdown)
//       <şekil ad=".." kaynak="..">iç</şekil>  → **◈ ad** · *kaynak* + kod-çiti (DIL-2.2: iç AYNEN)
//       <bölüm-tag>iç</bölüm-tag>              → #### ‹tag› başlığı + iç (özyineli)
//     düğüm                                     → ## Tip · `KOD` + ne + alanlar + kenar okları
//     çocuklar                                  → bir seviye derin başlıkla özyineli
// ═══════════════════════════════════════════════════════════════════════════

import { belirtecle } from "./belirtec.ts";
import { ayristir } from "./ayristirici.ts";

// ── belge gövdesi: XML bölüm tag'lerini MD'ye indir ─────────────────────────

const TAG_RE = /<([\p{L}\p{N}_-]+)((?:\s[^>]*)?)>([\s\S]*?)<\/\1>/gu;

function oznitelikler(ham: string): Map<string, string> {
  const m = new Map<string, string>();
  const re = /([\p{L}\p{N}_-]+)="([^"]*)"/gu;
  for (let e = re.exec(ham); e; e = re.exec(ham)) m.set(e[1], e[2]);
  return m;
}

/** İçeriği kod-çitine sarar — içerikte ``` varsa çit uzatılır. */
function citle(icerik: string, dil = ""): string {
  let cit = "```";
  while (icerik.includes(cit)) cit += "`";
  return `${cit}${dil}\n${icerik}\n${cit}`;
}

/**
 * ORTAK girintiyi söker (nizami-girinti biçim kuralı — Founder 2026-07-03):
 * kaynakta blok içi hiyerarşik girintilenir; markdown 4+ boşluğu kod sanmasın
 * diye render öncesi ortak girinti düşer. GÖRELİ hiza korunur (DIL-2.2: şeklin
 * iç düzeni bozulmaz — yalnız hep birlikte sola kayar).
 */
function ortakGirintiKirp(metin: string): string {
  const satirlar = metin.split("\n");
  let ortak = Infinity;
  for (const s of satirlar) {
    if (s.trim() === "") continue;
    const g = /^[ \t]*/.exec(s)![0].length;
    if (g < ortak) ortak = g;
  }
  if (!isFinite(ortak) || ortak === 0) return metin;
  return satirlar.map((s) => (s.trim() === "" ? "" : s.slice(ortak))).join("\n");
}

/** Belge metnindeki XML bölüm tag'lerini markdown'a indirger (özyineli).
 *  Nizami-girinti kuralı gereği her katmanda ortak girinti sökülür. */
export function belgeGovdesiMd(belge: string, derinlik = 4): string {
  belge = ortakGirintiKirp(belge);
  const cikti: string[] = [];
  let son = 0;
  const kopya = new RegExp(TAG_RE.source, TAG_RE.flags);
  for (let e = kopya.exec(belge); e; e = kopya.exec(belge)) {
    const once = belge.slice(son, e.index).trim();
    if (once) cikti.push(ortakGirintiKirp(once));
    const [, tag, oznHam, govde] = e;
    if (tag === "şekil" || tag === "sekil") {
      const o = oznitelikler(oznHam);
      const baslik = o.get("ad") ?? "Şekil";
      const kaynak = o.get("kaynak");
      // class'lı HTML: eklenti önizleme CSS'i boyar; GitHub/düz MD'de metin yine görünür.
      cikti.push(`<p class="sarmal-sekil"><strong>◈ ${baslik}</strong>${kaynak ? ` · <em>${kaynak}</em>` : ""}</p>\n\n${citle(ortakGirintiKirp(govde.replace(/^\n+|\s+$/g, "")))}`);
    } else {
      const h = Math.min(derinlik, 6);
      cikti.push(`<h${h} class="sarmal-tag">‹${tag}›</h${h}>\n\n${belgeGovdesiMd(govde.replace(/^\n+|\s+$/g, ""), derinlik + 1)}`);
    }
    son = e.index + e[0].length;
  }
  const kalan = belge.slice(son).trim();
  if (kalan) cikti.push(kalan);
  return cikti.join("\n\n");
}

// ── kod boyama: .sar parçası → renk-sınıflı HTML (önizleme editör-paritesi) ──
//    MD önizlemesi semantik token bilmez; kendi lexer mantığımızla boyarız.
//    Sınıflar (sk-*) eklentinin onizleme.css'inde editör paletiyle eşlenir.

const ANAHTAR_SOZ = new Set(["çağır", "Tip", "Kural", "ve", "veya", "değil"]);
const KOD_DESENI = /^[A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜ0-9]*(-[A-ZÇĞİÖŞÜ0-9]+)*(\.[0-9]+){0,2}$/u;

function span(sinif: string, metin: string): string {
  return `<span class="sk-${sinif}">${kacisla(metin)}</span>`;
}
function kacisla(m: string): string {
  return m.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * .sar kod parçasını renkli HTML'e çevirir (saf). `tipRenk` verilirse widget
 * tip adları o hex ile (aile rengi) boyanır — editörle birebir parite.
 */
export function kodBoya(kod: string, tipRenk?: (ad: string) => string | undefined): string {
  let out = "";
  let i = 0;
  const n = kod.length;
  while (i < n) {
    const c = kod[i];
    if (c === "/" && kod[i + 1] === "/") {                       // // /// yorum-belge
      let j = i; while (j < n && kod[j] !== "\n") j++;
      out += span("yorum", kod.slice(i, j)); i = j; continue;
    }
    if (c === "/" && kod[i + 1] === "*") {                       // /* ... */
      let j = i + 2; while (j < n && !(kod[j] === "*" && kod[j + 1] === "/")) j++;
      j = Math.min(j + 2, n);
      out += span("yorum", kod.slice(i, j)); i = j; continue;
    }
    if (c === '"') {                                             // "..." ve """..."""
      const uclu = kod[i + 1] === '"' && kod[i + 2] === '"';
      let j = i + (uclu ? 3 : 1);
      if (uclu) { while (j < n && !(kod[j] === '"' && kod[j + 1] === '"' && kod[j + 2] === '"')) j++; j = Math.min(j + 3, n); }
      else { while (j < n && kod[j] !== '"') { if (kod[j] === "\\") j++; j++; } j = Math.min(j + 1, n); }
      out += span("dizgi", kod.slice(i, j)); i = j; continue;
    }
    if (c === "-" && kod.slice(i, i + 3) === "-->") {            // akış oku
      out += span("ok", "-->"); i += 3; continue;
    }
    if (/[0-9]/.test(c)) {
      let j = i; while (j < n && /[0-9.]/.test(kod[j])) j++;
      out += span("sayi", kod.slice(i, j)); i = j; continue;
    }
    if (/[\p{L}_]/u.test(c)) {                                   // tanımlayıcı / KOD
      let j = i;
      while (j < n && (/[\p{L}\p{N}_]/u.test(kod[j]) || (kod[j] === "-" && /[\p{L}\p{N}_]/u.test(kod[j + 1] ?? "")))) j++;
      const soz = kod.slice(i, j);
      let k = j; while (k < n && (kod[k] === " " || kod[k] === "\t")) k++;
      if (ANAHTAR_SOZ.has(soz)) out += span("anahtar", soz);
      else if (KOD_DESENI.test(soz) && soz.length >= 2) out += span("kod", soz);
      else if (kod[k] === "(") {
        const renk = tipRenk?.(soz);
        out += renk ? `<span class="sk-tip" style="color:${renk}">${kacisla(soz)}</span>` : span("tip", soz);
      } else if (kod[k] === ":") out += span("param", soz);
      else out += kacisla(soz);
      i = j; continue;
    }
    out += kacisla(c); i++;
  }
  return out;
}

// ── ana giriş ────────────────────────────────────────────────────────────────

/** Kod parçasının baş/son boş satırlarını atar (içi aynen kalır). */
function kenarKirp(m: string): string {
  return m.replace(/^[ \t]*\n+/, "").replace(/\s+$/, "");
}

/** belgeMd seçenekleri: `boya` verilirse kod parçaları renk-sınıflı HTML olur
 *  (önizleme — editör paritesi); verilmezse `sarmal` kod çiti (CLI/GitHub). */
export interface BelgeSecenek {
  boya?: boolean;
  /** widget tip adı → hex renk (aile rengi — eklenti SNF'den besler). */
  tipRenk?: (ad: string) => string | undefined;
}

/**
 * .sar kaynağını Markdown belgesine çevirir (saf — hata fırlatabilir).
 *
 * FATİH KURALI (2026-07-03): YALNIZ `-->| ... |<--` blok içleri MD olarak
 * render edilir; geri kalan HER ŞEY (bildirimler, parametreler, yorumlar)
 * DOSYADAKİ HALİYLE kod olarak durur — düz metinle asla karışmaz; kod kendi
 * RENKLERİYLE çıkar (makine+AI+insan tek noktada — tek dosya vizyonu).
 * Sentetik başlık üretilmez; başlık belgenin kendi `#`'idir.
 */
export function belgeMd(kaynak: string, secenek?: BelgeSecenek): string {
  // Söz dizimi doğrulaması: bozuk dosya kibar hataya dönsün (çağıran yakalar).
  ayristir(belirtecle(kaynak));

  // Lexer'la tutarlı tarama: yorum (// · /* */) ve dizgi (" · \"\"\") İÇİNDEKİ
  // -->| blok AÇMAZ — lexer bunları belge saymaz, biz de saymayız.
  const parcalar: string[] = [];
  let bas = 0;
  let i = 0;
  const kodBas = (son: number): void => {
    const kod = kenarKirp(kaynak.slice(bas, son));
    if (!kod) return;
    parcalar.push(secenek?.boya
      ? `<pre class="sarmal-kod">${kodBoya(kod, secenek.tipRenk)}</pre>`
      : citle(kod, "sarmal"));
  };
  while (i < kaynak.length) {
    const c = kaynak[i];
    if (c === "/" && kaynak[i + 1] === "/") {                       // // ve /// — satır sonuna dek
      while (i < kaynak.length && kaynak[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && kaynak[i + 1] === "*") {                       // /* ... */
      i += 2;
      while (i < kaynak.length && !(kaynak[i] === "*" && kaynak[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    if (c === '"') {
      if (kaynak[i + 1] === '"' && kaynak[i + 2] === '"') {         // """..."""
        i += 3;
        while (i < kaynak.length && !(kaynak[i] === '"' && kaynak[i + 1] === '"' && kaynak[i + 2] === '"')) i++;
        i += 3;
      } else {                                                       // "..."
        i++;
        while (i < kaynak.length && kaynak[i] !== '"') { if (kaynak[i] === "\\") i++; i++; }
        i++;
      }
      continue;
    }
    if (c === "-" && kaynak.slice(i, i + 4) === "-->|") {           // belge bloğu
      kodBas(i);
      const kapa = kaynak.indexOf("|<--", i + 4);
      const son = kapa === -1 ? kaynak.length : kapa;               // kapanmamışsa lexer zaten hata verdi
      const icerik = kaynak.slice(i + 4, son).replace(/^[ \t]*\n/, "").replace(/\n[ \t]*$/, "");
      parcalar.push(belgeGovdesiMd(icerik));
      i = son + 4;
      bas = i;
      continue;
    }
    i++;
  }
  if (bas < kaynak.length) kodBas(kaynak.length);
  return parcalar.length ? `${parcalar.join("\n\n")}\n` : "*Boş .sar — henüz düğüm yok.*\n";
}

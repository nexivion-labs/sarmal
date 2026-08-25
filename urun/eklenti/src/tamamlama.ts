// ═══════════════════════════════════════════════════════════════════════════
// tamamlama.ts — Otomatik tamamlama (IntelliSense)
//
//   Yazarken bağlama göre öneri:
//     • gövde/kök bağlamı → geçerli widget TİPLERİ (izinli çocuklar öncelikli)
//     • parametre bağlamı  → parametre adları + kenar tipleri
//   Kaynak: SNF-0 (kayit.json). Türkçe-önce, tahmin-sıfır.
// ═══════════════════════════════════════════════════════════════════════════

import * as vscode from "vscode";
import type { Siniflama } from "../../cekirdek/src/siniflama.ts";
import { snfBul, simgeSec, sozlukBul } from "./ortak.ts";
import { ifadePaletiCikar } from "./palet.ts";
// EMJ-A03: emoji yüzü — belge emoji yazımıyla yazılmışsa öneriler emoji ekler
// (yazım yüzü korunur); Türkçe yüzde emoji eşdeğeri bilgi olarak görünür.
import { emojiKarsiligi, emojiYuzuMu } from "./emoji-yuz.ts";
import {
  sozlukAdi,
  sozlukDuzYazisi,
  type CiktiDili,
} from "../../cekirdek/src/cevir.ts";
import {
  TAMAMLAMA_METINLERI,
  TAMAMLAMA_ORTAK_PARAMETRELERI,
  aileAdi,
  enumDegeriDetayi,
  emojiEsdegerDetayi,
  ifadePaletiBelgesi,
  ifadePaletiDetayi,
  kenarTamamlamaBelgesi,
  kenarTamamlamaDetayi,
  semaAlaniDetayi,
  tipTamamlamaBelgesi,
  tipTamamlamaDetayi,
} from "./yuzey-metinleri.ts";

export function tamamlamaSaglayici(dil: () => CiktiDili): vscode.CompletionItemProvider {
  return {
    provideCompletionItems(doc, pos) {
      const snf = snfBul(doc);
      if (!snf) return undefined;
      const etkinDil = dil();

      // `--> ` sonrası: belgedeki KOD'ları öner (akış hedefi — DIL-1.4)
      const satirOnu = doc.lineAt(pos.line).text.slice(0, pos.character);
      if (/-->\s*[\p{L}\p{N}-]*$/u.test(satirOnu)) return kodOnerileri(doc);

      const once = doc.getText(new vscode.Range(new vscode.Position(0, 0), pos));
      const baglam = kapsamCoz(once);

      // EMJ-A03: yüz algısı — belge emoji yüzüyle mi yazılmış (bir kez, belge başına)
      const emojiYuz = emojiYuzuMu(doc.getText());

      // F5-A01: `param: █` → bilinen DEĞERLERİ öner (şema-farkında)
      const degerEs = /([\p{L}_][\p{L}\p{N}_]*):\s*[\p{L}]*$/u.exec(satirOnu);
      if (degerEs && baglam.tur === "parametre") {
        const oneriler = degerOnerileri(snf, degerEs[1], baglam.ebeveyn, emojiYuz, etkinDil);
        // TAS-C01 · İFADE PALETİ: yüzey bağlamında tasarım sözlüğü kavramları
        // ÖNERİ olarak eklenir (rijit enum DEĞİL — doğrulanmaz, yalnız yardım).
        oneriler.push(...paletOnerileri(snf, doc, degerEs[1], baglam.ebeveyn));
        if (oneriler.length) return oneriler;
      }
      return baglam.tur === "parametre"
        ? paramOnerileri(snf, baglam.ebeveyn, emojiYuz, etkinDil)
        : tipOnerileri(snf, baglam.ebeveyn, emojiYuz, etkinDil);
    },
  };
}

// ── bağlam çözümü: imleç parametre listesinde mi ("(") gövdede mi ("{")? ──────
function kapsamCoz(metin: string): { tur: "parametre" | "gövde"; ebeveyn?: string } {
  const yigin: Array<{ tip: "(" | "{"; ad?: string }> = [];
  // "(" öncesindeki tanımlayıcı = imza sahibi tip (F5-A01 şema-farkındalık)
  const acilisSahibi = (m: string, parIdx: number): string | undefined => {
    let j = parIdx - 1;
    while (j >= 0 && /\s/.test(m[j])) j--;
    const son = j;
    while (j >= 0 && /[\p{L}\p{N}_]/u.test(m[j])) j--;
    const ad = m.slice(j + 1, son + 1);
    return ad || undefined;
  };
  let i = 0;
  while (i < metin.length) {
    const c = metin[i];
    if (c === '"') { // dizgi atla
      i++;
      while (i < metin.length && metin[i] !== '"') { if (metin[i] === "\\") i++; i++; }
      i++;
      continue;
    }
    if (c === "/" && metin[i + 1] === "/") { while (i < metin.length && metin[i] !== "\n") i++; continue; }
    if (c === "/" && metin[i + 1] === "*") { i += 2; while (i < metin.length && !(metin[i] === "*" && metin[i + 1] === "/")) i++; i += 2; continue; }
    if (c === "(") { yigin.push({ tip: "(", ad: acilisSahibi(metin, i) }); i++; continue; }
    if (c === "{") { yigin.push({ tip: "{", ad: sahipTipAdi(metin, i) }); i++; continue; }
    if (c === ")" || c === "}") { yigin.pop(); i++; continue; }
    i++;
  }
  const ust = yigin[yigin.length - 1];
  if (!ust) return { tur: "gövde" };
  if (ust.tip === "(") return { tur: "parametre", ebeveyn: ust.ad };
  return { tur: "gövde", ebeveyn: ust.ad };
}

// "{" den önce "Ad( ... )" varsa gövdenin sahip tip adını bulur (harita ise undefined).
function sahipTipAdi(metin: string, susIdx: number): string | undefined {
  let j = susIdx - 1;
  while (j >= 0 && /\s/.test(metin[j])) j--;
  if (metin[j] !== ")") return undefined; // widget gövdesi değil (harita vb.)
  let derinlik = 0;
  while (j >= 0) {
    if (metin[j] === ")") derinlik++;
    else if (metin[j] === "(") { derinlik--; if (derinlik === 0) break; }
    j--;
  }
  j--; // "(" öncesi
  while (j >= 0 && /\s/.test(metin[j])) j--;
  const son = j;
  while (j >= 0 && /[\p{L}\p{N}_]/u.test(metin[j])) j--;
  const ad = metin.slice(j + 1, son + 1);
  return ad || undefined;
}

// ── öneri üreticiler ─────────────────────────────────────────────────────────

/** EMJ-A03: önerinin emoji eşdeğerini işler — detay her yüzde görünür (öğretir);
 *  belge emoji yüzündeyse EKLENEN metin de emoji olur (yazım yüzü korunur). */
function emojiEsdegerIsle(it: vscode.CompletionItem, ad: string, emojiYuz: boolean, emojiEkleme?: string): void {
  const emoji = emojiKarsiligi(ad);
  if (!emoji) return;
  it.detail = emojiEsdegerDetayi(it.detail, emoji);
  if (emojiYuz && emojiEkleme !== undefined) it.insertText = new vscode.SnippetString(emojiEkleme);
}

function tipOnerileri(
  snf: Siniflama, ebeveyn?: string, emojiYuz = false, dil: CiktiDili = "tr",
): vscode.CompletionItem[] {
  let izinli: string[] = [];
  if (ebeveyn) {
    izinli = snf.izinliSarma[ebeveyn] ?? [];
    if (snf.yuzeyKurali.duzen.includes(ebeveyn)) izinli = [...snf.yuzeyKurali.duzen, ...snf.yuzeyKurali.yaprak];
  }
  const izinliSet = new Set(izinli);
  const items: vscode.CompletionItem[] = [];

  for (const t of snf.widgetTipleri) {
    const gorunenAd = sozlukAdi("widget", t.ad, dil);
    const it = new vscode.CompletionItem(gorunenAd, vscode.CompletionItemKind.Class);
    const simge = simgeSec(snf, t.ad, t.aile);
    const ne = sozlukDuzYazisi("widgetNe", t.ad, t.ne, dil);
    it.detail = tipTamamlamaDetayi(simge ?? "", t.aile, ne);
    it.documentation = new vscode.MarkdownString(tipTamamlamaBelgesi(simge ?? "", gorunenAd, t.aile, ne));
    it.insertText = new vscode.SnippetString(`${t.ad}( kod: \${1:KOD} )`);
    emojiEsdegerIsle(it, t.ad, emojiYuz, `${emojiKarsiligi(t.ad)}( ${emojiKarsiligi("kod")}: \${1:KOD} )`);
    if (izinliSet.has(t.ad)) { it.sortText = "0_" + t.ad; it.preselect = true; }
    else { it.sortText = "1_" + t.ad; }
    items.push(it);
  }
  for (const k of ["çağır", "Tip", "Kural"]) {
    const it = new vscode.CompletionItem(k, vscode.CompletionItemKind.Keyword);
    it.sortText = "2_" + k;
    items.push(it);
  }
  return items;
}

const ORTAK_PARAM_ADLARI = [
  "kod", "ad", "ne", "aile", "içerir", "renk", "her", "görünür", "boşsa",
  "rota", "yetki", "yol", "metod",
] as const;

/** Belgedeki tüm `kod: X` bildirimlerini akış hedefi olarak önerir (DIL-1.4). */
function kodOnerileri(doc: vscode.TextDocument): vscode.CompletionItem[] {
  const kodlar = new Set<string>();
  for (const es of doc.getText().matchAll(/\bkod:\s*([\p{Lu}][\p{Lu}\p{N}-]*)/gu)) {
    kodlar.add(es[1]);
  }
  return [...kodlar].sort().map((k) => {
    const it = new vscode.CompletionItem(k, vscode.CompletionItemKind.Reference);
    it.detail = TAMAMLAMA_METINLERI.belgeKodu;
    return it;
  });
}

// ── F9-A04 · değer önerileri KANONDAN (çift-kayıt bitti): enum'lar artık
// kayit.json semalar[tip].enum + ortakEnum'da yaşar; tamamlama oradan okur.
// İnce yedek: anahtar KANONLA AYNI olmak zorunda (④-B9: farklı anahtar = ikinci
// gerçek). KRR-MUT-6: metod (kanon semalar.Uç.enum.metod ile birebir).
const YEDEK_ENUM: Record<string, string[]> = {
  "metod": ["GET", "POST", "PUT", "DELETE"],
};

function degerOnerileri(
  snf: Siniflama, param: string, tip?: string, emojiYuz = false, dil: CiktiDili = "tr",
): vscode.CompletionItem[] {
  const kume =
    (tip ? snf.semalar?.[tip]?.enum?.[param] : undefined) ??   // tip-özel kanon
    snf.ortakEnum?.[param] ??                                   // herhangi-düğüm kanonu
    YEDEK_ENUM[param] ?? [];
  return kume.map((d, i) => {
    const it = new vscode.CompletionItem(d, vscode.CompletionItemKind.EnumMember);
    it.sortText = String(i).padStart(2, "0");
    if (param === "yetki") it.detail = dil === "tr"
      ? (snf.yetkiSozlugu?.[d] ?? TAMAMLAMA_METINLERI.yetkiKademesi)
      : TAMAMLAMA_METINLERI.yetkiKademesi;
    else it.detail = enumDegeriDetayi(param, tip);
    emojiEsdegerIsle(it, d, emojiYuz, emojiKarsiligi(d) ?? d);   // durum değerleri: ⏳ 🔨 🏁 ⛔
    it.preselect = i === 0;
    return it;
  });
}

/**
 * TAS-A01/C01 · İFADE PALETİ önerileri (rijit enum DEĞİL — motor doğrulamaz):
 *   • `stil:` → Tema tipografi ROLLERİ (kanon temaRolleri.tipografi — token-rol sözleşmesi);
 *   • yüzey-ailesi widget bağlamında HERHANGİ değer → tasarım sözlüğü kavramları
 *     (272 kavram · kategori + kanonik flutter eşlemesiyle, düşük öncelik).
 * Sözlük yoksa (dış proje) palet sessizce kapanır.
 */
function paletOnerileri(snf: Siniflama, doc: vscode.TextDocument, param: string, tip?: string): vscode.CompletionItem[] {
  const items: vscode.CompletionItem[] = [];
  const yuzeyMi = !!tip && (snf.widgetTipleri.some((t) => t.ad === tip && t.aile === "yuzey") ||
    snf.yuzeyKurali.duzen.includes(tip) || snf.yuzeyKurali.yaprak.includes(tip));

  // ① Tema rolleri — stil: (tipografi) · renk-rolü paletleri (temaRolleri kanonu)
  if (yuzeyMi && param === "stil") {
    const roller = snf.temaRolleri?.["tipografi"];
    if (Array.isArray(roller)) {
      roller.forEach((rol, i) => {
        const it = new vscode.CompletionItem(rol, vscode.CompletionItemKind.Value);
        it.detail = TAMAMLAMA_METINLERI.tipografiRolu;
        it.sortText = "03_" + String(i).padStart(2, "0");
        items.push(it);
      });
    }
  }

  // ② Tasarım sözlüğü — İFADE PALETİ (öneri listesi; kayıplı özet/kafes değil)
  if (yuzeyMi) {
    for (const o of ifadePaletiCikar(sozlukBul(doc))) {
      const it = new vscode.CompletionItem(o.kavram, vscode.CompletionItemKind.Text);
      it.detail = ifadePaletiDetayi(o.kategori, o.es);
      it.documentation = new vscode.MarkdownString(ifadePaletiBelgesi(o.kavram, o.kategori));
      it.sortText = "9_" + o.kavram;
      items.push(it);
    }
  }
  return items;
}

/** Şema alan adını temizler: "tür (apex|yönetici|uzman)" → "tür". */
function alanAdi(ham: string): string {
  return ham.split(" ")[0].split("(")[0];
}

function paramOnerileri(
  snf: Siniflama, tip?: string, emojiYuz = false, dil: CiktiDili = "tr",
): vscode.CompletionItem[] {
  const items: vscode.CompletionItem[] = [];

  // F5-A01: içinde bulunulan TİPİN şeması ÖNCE — ★ zorunlu, ◇ birindenBiri, opsiyonel
  const sema: any = tip ? (snf as any).semalar?.[tip] : undefined;
  if (sema) {
    const eklenen = new Set<string>();
    const ekle = (ham: string, rozet: string, sira: string): void => {
      const ad = alanAdi(ham);
      if (!ad || eklenen.has(ad)) return;
      eklenen.add(ad);
      const it = new vscode.CompletionItem(ad, vscode.CompletionItemKind.Field);
      it.detail = semaAlaniDetayi(rozet, tip ?? "", ham);
      it.insertText = new vscode.SnippetString(`${ad}: `);
      emojiEsdegerIsle(it, ad, emojiYuz, `${emojiKarsiligi(ad)}: `);
      it.sortText = sira + ad;
      it.preselect = rozet === "★";
      items.push(it);
    };
    for (const z of sema.zorunlu ?? []) ekle(z, "★", "00_");
    for (const grup of sema.birindenBiri ?? []) for (const a of grup) ekle(a, "◇", "01_");
    for (const o of sema.opsiyonel ?? []) ekle(o, "·", "02_");
  }
  for (const ad of ORTAK_PARAM_ADLARI) {
    if (items.some((x) => x.label === ad)) continue;   // şema önerisi öncelikli
    const it = new vscode.CompletionItem(ad, vscode.CompletionItemKind.Field);
    it.detail = TAMAMLAMA_ORTAK_PARAMETRELERI[ad]();
    it.insertText = new vscode.SnippetString(`${ad}: `);
    emojiEsdegerIsle(it, ad, emojiYuz, `${emojiKarsiligi(ad)}: `);
    it.sortText = "1_" + ad;
    items.push(it);
  }
  for (const k of snf.kenarTipleri) {
    const it = new vscode.CompletionItem(k.ad, vscode.CompletionItemKind.Property);
    const ne = sozlukDuzYazisi("kenarNe", k.ad, k.ne, dil);
    it.detail = kenarTamamlamaDetayi(ne);
    it.documentation = new vscode.MarkdownString(kenarTamamlamaBelgesi(k.ad, ne));
    it.insertText = new vscode.SnippetString(`${k.ad}: `);
    emojiEsdegerIsle(it, k.ad, emojiYuz, `${emojiKarsiligi(k.ad)}: `);
    it.sortText = "2_" + k.ad;
    items.push(it);
  }
  return items;
}

// ═══════════════════════════════════════════════════════════════════════════
// anahat.ts — Anahat / Outline (DocumentSymbolProvider)
//
//   Widget ağacını Outline panelinde + breadcrumb'da gösterir → Faz › Blok ›
//   Katman › AltKatman › Adım gezinme (MIM-1 dizilişi). İkon: Proje=paket ·
//   Blok=sınıf · Faz/Katman/AltKatman=ad-alanı · Adım=alan. Ayrıştırılamayan belge → anahat yok.
// ═══════════════════════════════════════════════════════════════════════════

import * as vscode from "vscode";
import { programAl } from "./onbellek.ts";   // EKL-F9-A06: paylaşımlı AST önbelleği
import type { Dugum, Deger } from "../../cekirdek/src/sozdizim.ts";
import { kanonikWidgetAdi } from "./yuzey-metinleri.ts";

export function anahatSaglayici(): vscode.DocumentSymbolProvider {
  return {
    provideDocumentSymbols(doc) {
      const bildirimler = programAl(doc)?.bildirimler;
      if (!bildirimler) return undefined; // ayrıştırılamıyorsa anahat yok
      return bildirimler.map(sembol);
    },
  };
}

function sembol(d: Dugum): vscode.DocumentSymbol {
  const kaps = kapsam(d);
  const tamAralik = new vscode.Range(kaps.bS, kaps.bC, kaps.sS, kaps.sC);
  const secim = new vscode.Range(d.satir - 1, d.sutun - 1, d.satir - 1, d.sutun - 1 + d.ad.length);
  const sym = new vscode.DocumentSymbol(isim(d), detay(d), tur(d), tamAralik, secim);
  // ağaç-yüzü turu: outline = agacUret ağaç-yapısı — gerçek çocuklar ÖNCE, `raflar: {}`
  // kısayol yaprakları SONRA (çocuklarıTopla ile aynı sıra; girinti anlamı bir).
  sym.children = [...d.cocuklar.map(sembol), ...rafSembolleri(d)];
  return sym;
}

// `raflar: { src: "…", sinama: "…" }` kısayolu agacUret'te çocuk satırlardır (agac.ts
// çocuklarıTopla) — outline aynı düğümleri Folder olarak gösterir ki iki yüz bir konuşsun.
function rafSembolleri(d: Dugum): vscode.DocumentSymbol[] {
  const raflar = d.parametreler.find((x) => x.ad === "raflar") ?? d.ozellikler.find((x) => x.ad === "raflar");
  if (!raflar || raflar.deger.tur !== "harita") return [];
  return (raflar.deger.ciftler ?? []).map((c) => {
    const s = (c.deger.satir ?? raflar.satir) - 1;
    const b = (c.deger.sutun ?? raflar.sutun) - 1;
    const aralik = new vscode.Range(s, Math.max(0, b), s, Math.max(0, b) + (c.deger.metin?.length ?? 0));
    const sym = new vscode.DocumentSymbol(c.ad + "/", c.deger.metin ?? "", vscode.SymbolKind.Package, aralik, aralik);
    return sym;
  });
}

// Düğümün kapsadığı aralık: adından son torununun aralık-sonuna kadar
// (parser henüz kapanış konumu tutmuyor → torunlardan türetilir; nesting doğru).
function kapsam(d: Dugum): { bS: number; bC: number; sS: number; sC: number } {
  const bS = d.satir - 1;
  const bC = d.sutun - 1;
  let sS = bS;
  let sC = bC + d.ad.length;
  for (const c of d.cocuklar) {
    const k = kapsam(c);
    if (k.sS > sS || (k.sS === sS && k.sC > sC)) { sS = k.sS; sC = k.sC; }
  }
  return { bS, bC, sS, sC };
}

function isim(d: Dugum): string {
  if (d.tur === "çağır") return `çağır ${d.ad}`;
  if (d.tur === "tipTanım") return `Tip ${d.ad}`;
  if (d.tur === "kuralTanım") return `Kural ${d.ad}`;
  const kod = paramMetni(d, "kod");
  const gorunenTip = kanonikWidgetAdi(d.ad, d.ad);
  return kod ? `${gorunenTip} · ${kod}` : gorunenTip;
}

function detay(d: Dugum): string {
  if (d.tur !== "widget") return "";
  return paramMetni(d, "ad") ?? "";
}

function tur(d: Dugum): vscode.SymbolKind {
  if (d.tur === "çağır") return vscode.SymbolKind.Module;
  if (d.tur === "tipTanım") return vscode.SymbolKind.Interface;
  if (d.tur === "kuralTanım") return vscode.SymbolKind.Function;
  switch (d.ad) {
    case "Proje":
    case "Uygulama":
    case "ÇalışmaAlanı":
      return vscode.SymbolKind.Package;
    case "Blok":
      return vscode.SymbolKind.Class;
    case "Faz":
    case "Katman":
    case "AltKatman":
      return vscode.SymbolKind.Namespace;
    case "Adım":
      return vscode.SymbolKind.Field;
    default:
      return vscode.SymbolKind.Object;
  }
}

function paramMetni(d: Dugum, ad: string): string | undefined {
  // A11/E1: gövde-özellikli alan (ne: gövdede) anahatta boş kalmasın — motorla aynı ikili arama.
  const p = d.parametreler.find((x) => x.ad === ad) ?? d.ozellikler.find((x) => x.ad === ad);
  if (!p) return undefined;
  return degerMetni(p.deger);
}

function degerMetni(v: Deger): string {
  if (v.tur === "liste") return (v.ogeler ?? []).map(degerMetni).join(", ");
  return v.metin ?? "";
}

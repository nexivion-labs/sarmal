// ═══════════════════════════════════════════════════════════════════════════
// tren.ts — 🚆 TREN GÖRÜNÜMÜ (Founder 2026-10-21)
//
//   Tren, yapay zekâ ajanlarının bölümüdür: projede ilan edilmiş Etmen düğümleri,
//   `geliştirmede` durumundaki Adımlar ve varsa son Koşum mührü. Görünümün TEK
//   veri kaynağı denetim turunun yayınıdır (tur-goruntusu.ts); kendi taraması,
//   kendi izleyicisi ve kendi ayrıştırıcısı yoktur. Süzgeci saf çekirdek
//   (tren-cekirdek.ts) koşturur; bu kabuk sonucu ağaç satırlarına çevirir. Kendi
//   TreeView'ü yoktur (Founder 2026-10-21): Sarmal paneli (Tren sekmesi) bu
//   sağlayıcıyı olduğu gibi okur ve satırları kendi webview'ünde çizer.
// ═══════════════════════════════════════════════════════════════════════════

import * as vscode from "vscode";
import { sonTurGoruntusu, turGoruntusunuDinle, type TurGoruntusu } from "./tur-goruntusu.ts";
import {
  trenBosMu, trenOzetiCikar, trenParmakIzi, type TrenAdimi, type TrenEtmeni, type TrenMuhru, type TrenOzeti,
} from "./tren-cekirdek.ts";
import { TREN_METINLERI } from "./yuzey-metinleri.ts";
import { satirIkonu } from "./ortak.ts";

type PanelOge =
  | { tur: "grup"; grup: "ajanlar" | "adimlar" }
  | { tur: "etmen"; etmen: TrenEtmeni }
  | { tur: "adim"; adim: TrenAdimi }
  | { tur: "muhur"; muhur: TrenMuhru };

export class Tren implements vscode.TreeDataProvider<PanelOge> {
  private degisti = new vscode.EventEmitter<PanelOge | void>();
  readonly onDidChangeTreeData = this.degisti.event;
  private ozet: TrenOzeti = { etmenler: [], adimlar: [] };
  eklentiKoku?: vscode.Uri;

  /** Görünümün şu an gösterdiği özetin sayıları — salt okur ölçüm. */
  sayilar(): { etmen: number; adim: number; muhur: boolean } {
    return { etmen: this.ozet.etmenler.length, adim: this.ozet.adimlar.length, muhur: this.ozet.sonMuhur !== undefined };
  }

  /** Turun yayınından özeti yeniler; içerik değişmediyse ağaç yeniden çizilmez. */
  goruntudenYerlestir(g: TurGoruntusu): void {
    const yeni = trenOzetiCikar(g.programlar);
    if (trenParmakIzi(yeni) === trenParmakIzi(this.ozet)) return;
    this.ozet = yeni;
    this.degisti.fire();
  }

  diliTazele(): void {
    this.degisti.fire();
  }

  /** Özet boş mu: ne ajan ilanı ne geliştirmede Adım ne de Koşum mührü var. */
  bos(): boolean { return trenBosMu(this.ozet); }

  getChildren(oge?: PanelOge): PanelOge[] {
    if (!oge) {
      const k: PanelOge[] = [];
      if (this.ozet.sonMuhur) k.push({ tur: "muhur", muhur: this.ozet.sonMuhur });
      if (this.ozet.etmenler.length) k.push({ tur: "grup", grup: "ajanlar" });
      if (this.ozet.adimlar.length) k.push({ tur: "grup", grup: "adimlar" });
      return k;
    }
    if (oge.tur !== "grup") return [];
    return oge.grup === "ajanlar"
      ? this.ozet.etmenler.map((etmen) => ({ tur: "etmen" as const, etmen }))
      : this.ozet.adimlar.map((adim) => ({ tur: "adim" as const, adim }));
  }

  getTreeItem(oge: PanelOge): vscode.TreeItem {
    const ac = (dosya: string, satir: number): vscode.Command =>
      ({ command: "sarmal.dosyaAc", title: "", arguments: [dosya, satir] });
    if (oge.tur === "grup") {
      const ajan = oge.grup === "ajanlar";
      const n = ajan ? this.ozet.etmenler.length : this.ozet.adimlar.length;
      const item = new vscode.TreeItem(ajan ? TREN_METINLERI.ajanlarBasligi : TREN_METINLERI.adimlarBasligi,
        vscode.TreeItemCollapsibleState.Expanded);
      item.description = String(n);
      item.iconPath = satirIkonu(this.eklentiKoku, ajan ? "ajan" : "gorev", "bilgi");
      return item;
    }
    if (oge.tur === "etmen") {
      const e = oge.etmen;
      const item = new vscode.TreeItem(e.ad ? `${e.kod} · ${e.ad}` : e.kod, vscode.TreeItemCollapsibleState.None);
      item.description = e.tur || undefined;
      item.tooltip = e.ne || undefined;
      item.iconPath = satirIkonu(this.eklentiKoku, "ajan", "duz");
      item.command = ac(e.dosya, e.satir);
      return item;
    }
    if (oge.tur === "adim") {
      const a = oge.adim;
      const item = new vscode.TreeItem(a.ad ? `${a.kod} · ${a.ad}` : a.kod, vscode.TreeItemCollapsibleState.None);
      item.iconPath = satirIkonu(this.eklentiKoku, "gorev", "uyari");
      item.command = ac(a.dosya, a.satir);
      return item;
    }
    const m = oge.muhur;
    const item = new vscode.TreeItem(TREN_METINLERI.muhurBasligi, vscode.TreeItemCollapsibleState.None);
    item.description = TREN_METINLERI.muhurAciklamasi(m.muhur, m.karar);
    item.tooltip = TREN_METINLERI.muhurIpucu(m.kod, m.adim, m.tarih, m.ne);
    item.iconPath = satirIkonu(this.eklentiKoku, "kosum", "duz");
    item.command = ac(m.dosya, m.satir);
    return item;
  }
}

/** Sağlayıcıyı kurar ve tur yayınına abone eder (kendi taraması yoktur). */
export function trenKaydi(context: vscode.ExtensionContext): Tren {
  const saglayici = new Tren();
  saglayici.eklentiKoku = context.extensionUri;
  context.subscriptions.push({ dispose: turGoruntusunuDinle((g) => saglayici.goruntudenYerlestir(g)) });
  // Geç kurulan tüketici ilk turu kaçırmasın: bu bir tur isteği değildir.
  const ilk = sonTurGoruntusu();
  if (ilk) saglayici.goruntudenYerlestir(ilk);
  return saglayici;
}

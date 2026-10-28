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
  trenBosMu, trenOzetiCikar, trenParmakIzi, type TrenAdimi, type TrenEtmeni, type TrenHedef, type TrenMuhru, type TrenOzeti,
} from "./tren-cekirdek.ts";
import { TREN_METINLERI } from "./yuzey-metinleri.ts";
import { satirIkonu } from "./ortak.ts";

/** Geliştirmedeki işin zincirinin bir parçası (PNL-A12): ajan, zemin ya da departman satırı. */
type ZincirParcasi = "ajan" | "zemin" | "departman";

type PanelOge =
  | { tur: "grup"; grup: "ajanlar" | "adimlar" }
  | { tur: "etmen"; etmen: TrenEtmeni }
  | { tur: "adim"; adim: TrenAdimi }
  | { tur: "parca"; parca: ZincirParcasi; adim: TrenAdimi; hedef?: TrenHedef }
  | { tur: "muhur"; muhur: TrenMuhru };

/** Halkanın görünen adı: ilan edilmiş adı, yoksa kodu. */
const halkaAdi = (h: TrenHedef): string => h.ad || h.kod;

/**
 * Zincirin üç parçasının satırdaki metni (Adımın kendisi satırın adıdır). Parça beyan edilmemişse
 * yokluğun sebebi yazılır: ajan atanmamış, Katman ya da zemin beyanı yok, AltKatman ya da departman
 * beyanı yok. Hiçbir parça tahmin edilmez.
 */
export function zincirMetinleri(a: TrenAdimi): { ajan: string; zemin: string; departman: string } {
  const z = a.zincir;
  return {
    ajan: z.ajanlar.length ? z.ajanlar.map(halkaAdi).join(", ") : TREN_METINLERI.atanmamis,
    zemin: !z.katman ? TREN_METINLERI.katmansiz : z.zemin.length ? z.zemin.map(halkaAdi).join(", ") : TREN_METINLERI.zeminsiz,
    departman: z.departman?.deger ?? (z.altKatman ? TREN_METINLERI.departmansiz : TREN_METINLERI.altKatmansiz),
  };
}

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

  /** Görünümün şu an gösterdiği özet (salt okur): ajan şeması ve gezinme anahtarları bundan çözülür (PNL-A11). */
  ozetAl(): TrenOzeti { return this.ozet; }

  getChildren(oge?: PanelOge): PanelOge[] {
    if (!oge) {
      const k: PanelOge[] = [];
      // Ajanlar ağaçta değil, şirket şemasında görünür (PNL-A11 · tren-gorunum.ts); ağaç işi taşır.
      if (this.ozet.sonMuhur) k.push({ tur: "muhur", muhur: this.ozet.sonMuhur });
      if (this.ozet.adimlar.length) k.push({ tur: "grup", grup: "adimlar" });
      return k;
    }
    if (oge.tur === "adim") return this.zincirParcalari(oge.adim);
    if (oge.tur !== "grup") return [];
    return oge.grup === "ajanlar"
      ? this.ozet.etmenler.map((etmen) => ({ tur: "etmen" as const, etmen }))
      : this.ozet.adimlar.map((adim) => ({ tur: "adim" as const, adim }));
  }

  /**
   * Adım satırının çocukları (PNL-A12): her atanmış ajan, Katmanın her zemin hedefi ve AltKatmanın
   * departmanı ayrı bir satırdır ve tanımına götürür. Parça beyan edilmemişse yokluğunu söyleyen tek
   * satır durur; o satır varsa yokluğun yerine (Katman ya da AltKatman) götürür.
   */
  private zincirParcalari(adim: TrenAdimi): PanelOge[] {
    const z = adim.zincir;
    const p = (parca: ZincirParcasi, hedef?: TrenHedef): PanelOge => ({ tur: "parca", parca, adim, hedef });
    return [
      ...(z.ajanlar.length ? z.ajanlar.map((h) => p("ajan", h)) : [p("ajan")]),
      ...(z.zemin.length ? z.zemin.map((h) => p("zemin", h)) : [p("zemin")]),
      p("departman"),
    ];
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
      // Tek satırda dört parça (PNL-A12): satırın adı Adımdır, açıklaması ajan → zemin → departman.
      const a = oge.adim;
      const m = zincirMetinleri(a);
      const adi = a.ad ? `${a.kod} · ${a.ad}` : a.kod;
      const item = new vscode.TreeItem(adi, vscode.TreeItemCollapsibleState.Collapsed);
      item.description = TREN_METINLERI.zincirAciklamasi(m.ajan, m.zemin, m.departman);
      const z = a.zincir;
      item.tooltip = TREN_METINLERI.zincirIpucu(adi, m.ajan, m.zemin, m.departman,
        z.katman ? halkaAdi(z.katman) : "", z.altKatman ? halkaAdi(z.altKatman) : "");
      item.iconPath = satirIkonu(this.eklentiKoku, "gorev", "uyari");
      item.command = ac(a.dosya, a.satir);
      return item;
    }
    if (oge.tur === "parca") return this.parcaSatiri(oge.parca, oge.adim, oge.hedef, ac);
    const m = oge.muhur;
    const item = new vscode.TreeItem(TREN_METINLERI.muhurBasligi, vscode.TreeItemCollapsibleState.None);
    item.description = TREN_METINLERI.muhurAciklamasi(m.muhur, m.karar);
    item.tooltip = TREN_METINLERI.muhurIpucu(m.kod, m.adim, m.tarih, m.ne);
    item.iconPath = satirIkonu(this.eklentiKoku, "kosum", "duz");
    item.command = ac(m.dosya, m.satir);
    return item;
  }

  /**
   * Zincir parçasının satırı. Hedefin tanımı biliniyorsa satır oraya götürür; hedef kod indeksinde
   * yoksa (başka projede ya da hiç ilan edilmemiş) satır kodu gösterir ve hiçbir yere götürmez.
   * Departman satırı AltKatmanın `departman:` alanının kendi satırına götürür.
   */
  private parcaSatiri(parca: ZincirParcasi, a: TrenAdimi, h: TrenHedef | undefined,
    ac: (dosya: string, satir: number) => vscode.Command): vscode.TreeItem {
    const z = a.zincir;
    const m = zincirMetinleri(a);
    const yok = (metin: string, yer: TrenHedef | undefined, ikon: "ajan" | "katmanlar" | "etiket", parcaAdi: string): vscode.TreeItem => {
      const item = new vscode.TreeItem(metin, vscode.TreeItemCollapsibleState.None);
      item.description = parcaAdi;
      item.iconPath = satirIkonu(this.eklentiKoku, ikon, "notr");
      if (yer?.dosya !== undefined && yer.satir !== undefined) item.command = ac(yer.dosya, yer.satir);
      return item;
    };
    const var_ = (hedef: TrenHedef, ikon: "ajan" | "katmanlar", parcaAdi: string): vscode.TreeItem => {
      const item = new vscode.TreeItem(halkaAdi(hedef), vscode.TreeItemCollapsibleState.None);
      item.description = hedef.ad ? `${parcaAdi} · ${hedef.kod}` : parcaAdi;
      item.tooltip = [hedef.kod, hedef.tip].filter(Boolean).join(" · ");
      item.iconPath = satirIkonu(this.eklentiKoku, ikon, "duz");
      if (hedef.dosya !== undefined && hedef.satir !== undefined) item.command = ac(hedef.dosya, hedef.satir);
      return item;
    };
    if (parca === "ajan") return h ? var_(h, "ajan", TREN_METINLERI.parcaAdi("ajan")) : yok(m.ajan, undefined, "ajan", TREN_METINLERI.parcaAdi("ajan"));
    if (parca === "zemin") {
      if (!h) return yok(m.zemin, z.katman, "katmanlar", TREN_METINLERI.parcaAdi("zemin"));
      const tur = h.tip === "Takım" ? "takım" : h.tip === "Teknoloji" ? "teknoloji" : "zemin";
      return var_(h, "katmanlar", z.katman ? `${TREN_METINLERI.parcaAdi(tur)} · ${halkaAdi(z.katman)}` : TREN_METINLERI.parcaAdi(tur));
    }
    const d = z.departman;
    if (!d) return yok(m.departman, z.altKatman, "etiket", TREN_METINLERI.parcaAdi("departman"));
    const item = new vscode.TreeItem(d.deger, vscode.TreeItemCollapsibleState.None);
    item.description = z.altKatman ? `${TREN_METINLERI.parcaAdi("departman")} · ${halkaAdi(z.altKatman)}` : TREN_METINLERI.parcaAdi("departman");
    item.tooltip = z.altKatman ? `AltKatman ${z.altKatman.kod}` : undefined;
    item.iconPath = satirIkonu(this.eklentiKoku, "etiket", "duz");
    item.command = ac(d.dosya, d.satir);
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

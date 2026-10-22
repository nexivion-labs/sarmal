// ═══════════════════════════════════════════════════════════════════════════
// makinist.ts — 🧑‍✈️ MAKINIST AĞACI (Founder 2026-10-21 · üçüncü hüküm)
//
//   Makinist (insan) bölümü TEK bir ağaçtır: Onaylar, Hatırlatıcılar,
//   Gözlemler ve Fikirler bu ağacın dört üst düğümüdür. Ağacın kendi TreeView'ü
//   yoktur (Founder 2026-10-21, dördüncü hüküm): Sarmal paneli (Makinist sekmesi)
//   sağlayıcıyı olduğu gibi okur ve satırları kendi webview'ünde çizer; bekleyen
//   kayıt sayısı panelin rozetine gider.
//
//   AĞAÇ KARAR VERMEZ VE VERİ ÜRETMEZ. Dört kaynağın verisi ve satır çizimi
//   mevcut sağlayıcılardan gelir (hatirlaticilar.ts · bildirimler.ts · fikirler.ts
//   ve Onaylar defteri); burada yeni ayrıştırıcı ya da tarama yoktur. Alt düğümler
//   kaynağın KENDİ nesneleridir (sarmalaşmaz), böylece "satırı kopyala" gibi komutlar
//   kaynağın düğümünü olduğu gibi alır; sahip kaynak, nesneden bir `WeakMap` ile
//   bulunur.
// ═══════════════════════════════════════════════════════════════════════════

import * as vscode from "vscode";
import { GORUNUS_MAKINIST, MAKINIST_GRUPLARI, type MakinistGrubu } from "./yuzey-cekirdek.ts";
import { MAKINIST_METINLERI } from "./yuzey-metinleri.ts";
import { satirIkonu } from "./ortak.ts";
import type { SatirSimgesi } from "./simge-cizelgesi.ts";
import type { OnayPaneli } from "./onay-paneli.ts";
import type { YuzDurumu } from "./ortak.ts";


/** Ağacın dört üst düğümü; kimlikleri sabittir. */
export interface MakinistGrupOgesi { readonly tur: "makinist-grup"; readonly grup: MakinistGrubu }

/** Mevcut bir ağaç sağlayıcısının ağaca verdiği yüz. */
export interface MakinistKaynagi {
  /** Satır sayısı; üst düğümün yanındaki sayı bunun kendisidir (ikinci bir sayaç yoktur). */
  kayitSayisi: number;
  /** Boşken ne yapılacağını söyleyen cümle; doluyken tanımsız (sağlayıcının kendi yüz durumundan). */
  gorunum?: YuzDurumu;
  readonly onDidChangeTreeData: vscode.Event<unknown>;
  getChildren(oge?: never): unknown[];
  getTreeItem(oge: never): vscode.TreeItem;
}

/** Onaylar defteri için ağaç yüzü: satırlar kapılardır. */
class OnayKaynagi implements MakinistKaynagi {
  readonly onDidChangeTreeData: vscode.Event<unknown>;
  gorunum: YuzDurumu = {};
  private readonly panel: OnayPaneli;
  private readonly kok: vscode.Uri | undefined;
  constructor(panel: OnayPaneli, kok: vscode.Uri | undefined) {
    this.panel = panel;
    this.kok = kok;
    this.onDidChangeTreeData = panel.onDegisti;
  }
  get kayitSayisi(): number { return this.panel.kapiSayisi; }
  getChildren(): unknown[] {
    return this.panel.kapilar().map((k) => ({ tur: "kapi", kayit: k }));
  }
  getTreeItem(oge: { tur: "kapi"; kayit: ReturnType<OnayPaneli["kapilar"]>[number] }): vscode.TreeItem {
    const { dosya, kapi } = oge.kayit;
    const item = new vscode.TreeItem(kapi.kod, vscode.TreeItemCollapsibleState.None);
    item.description = dosya.split(/[\\/]/).pop();
    item.tooltip = new vscode.MarkdownString(`${kapi.ne}\n\n${kapi.olcut}\n\n${MAKINIST_METINLERI.kapiIpucu}`);
    item.iconPath = satirIkonu(this.kok, "kapi", "uyari");
    item.contextValue = "sarmalOnayKapisi";
    item.command = { command: "sarmal.onayKapisiAc", title: MAKINIST_METINLERI.kapiIpucu, arguments: [dosya, kapi.satir, kapi.kod] };
    return item;
  }
}

const GRUP_SIMGESI: Readonly<Record<MakinistGrubu, SatirSimgesi>> = {
  onaylar: "kapi", hatirlaticilar: "yerimi", gozlemler: "kutu", fikirler: "fikir",
};

export { GORUNUS_MAKINIST, MAKINIST_GRUPLARI, type MakinistGrubu };

export class MakinistAgaci implements vscode.TreeDataProvider<unknown> {
  private readonly degisti = new vscode.EventEmitter<unknown>();
  readonly onDidChangeTreeData = this.degisti.event;
  private readonly gruplar: ReadonlyMap<MakinistGrubu, MakinistGrupOgesi> =
    new Map(MAKINIST_GRUPLARI.map((g) => [g, { tur: "makinist-grup" as const, grup: g }]));
  private readonly sahipler = new WeakMap<object, MakinistKaynagi>();

  private readonly kaynaklar: Readonly<Record<MakinistGrubu, MakinistKaynagi>>;
  private readonly kok: vscode.Uri | undefined;

  constructor(kaynaklar: Readonly<Record<MakinistGrubu, MakinistKaynagi>>, kok: vscode.Uri | undefined) {
    this.kaynaklar = kaynaklar;
    this.kok = kok;
  }

  /** Kaynak değiştiğinde ağacı bir kez tazeler; panel rozeti `rozetSayisi`ndan okur. */
  yenile(): void {
    this.degisti.fire(undefined);
  }

  private grupBaslik(g: MakinistGrubu): string {
    return { onaylar: MAKINIST_METINLERI.onaylar, hatirlaticilar: MAKINIST_METINLERI.hatirlaticilar,
      gozlemler: MAKINIST_METINLERI.gozlemler, fikirler: MAKINIST_METINLERI.fikirler }[g];
  }

  /** Görünümün köşe sayısı: karar bekleyen kapılar + hatırlatıcılar (eski Makinist rozetiyle aynı). */
  get rozetSayisi(): number {
    return this.kaynaklar.onaylar.kayitSayisi + this.kaynaklar.hatirlaticilar.kayitSayisi;
  }

  getChildren(oge?: unknown): unknown[] {
    if (!oge) return MAKINIST_GRUPLARI.map((g) => this.gruplar.get(g)!);
    const grup = (oge as Partial<MakinistGrupOgesi>).tur === "makinist-grup" ? (oge as MakinistGrupOgesi) : undefined;
    const kaynak = grup ? this.kaynaklar[grup.grup] : this.sahipler.get(oge as object);
    if (!kaynak) return [];
    const cocuklar = (kaynak.getChildren as (o?: unknown) => unknown[])(grup ? undefined : oge);
    for (const c of cocuklar) if (c && typeof c === "object") this.sahipler.set(c, kaynak);
    return cocuklar;
  }

  getTreeItem(oge: unknown): vscode.TreeItem {
    if ((oge as Partial<MakinistGrupOgesi>).tur === "makinist-grup") {
      const g = (oge as MakinistGrupOgesi).grup;
      const k = this.kaynaklar[g];
      const n = k.kayitSayisi;
      const item = new vscode.TreeItem(this.grupBaslik(g),
        n > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);
      item.id = `makinist.${g}`;
      item.description = n > 0 ? String(n) : undefined;
      item.tooltip = n > 0 ? undefined : k.gorunum?.message;
      item.iconPath = satirIkonu(this.kok, GRUP_SIMGESI[g], n > 0 ? "bilgi" : "notr");
      item.contextValue = `sarmalMakinistGrubu.${g}`;
      return item;
    }
    const sahip = this.sahipler.get(oge as object);
    return sahip ? (sahip.getTreeItem as (o: unknown) => vscode.TreeItem)(oge) : new vscode.TreeItem("");
  }

  getParent(): undefined { return undefined; }
}

export interface MakinistGirdileri {
  onayPaneli: OnayPaneli;
  hatirlaticilar: MakinistKaynagi;
  bildirimler: MakinistKaynagi;
  fikirler: MakinistKaynagi;
}

/** Ağacı kurar: dört kaynağın değişimi tek yenilemeye bağlanır; kendi görünümü yoktur. */
export function makinistKaydi(context: vscode.ExtensionContext, g: MakinistGirdileri): MakinistAgaci {
  const onay = new OnayKaynagi(g.onayPaneli, context.extensionUri);
  const agac = new MakinistAgaci(
    { onaylar: onay, hatirlaticilar: g.hatirlaticilar, gozlemler: g.bildirimler, fikirler: g.fikirler },
    context.extensionUri,
  );
  context.subscriptions.push(
    g.hatirlaticilar.onDidChangeTreeData(() => agac.yenile()),
    g.bildirimler.onDidChangeTreeData(() => agac.yenile()),
    g.fikirler.onDidChangeTreeData(() => agac.yenile()),
    onay.onDidChangeTreeData(() => agac.yenile()),
  );
  agac.yenile();
  return agac;
}

// ═══════════════════════════════════════════════════════════════════════════
// panel.ts — 🧭 SARMAL PANELİ (vscode kabuğu · Founder 2026-10-21 bağlayıcı çizim)
//
//   Etkinlik çubuğundaki Sarmal kabı TEK bir webview görünümü taşır
//   (`sarmalPanel`). VS Code kapta birden çok görünüm varken her görünüme kendi
//   başlığını koyar ve webview'in altında boşluk bırakır; Founder bunu iki kez
//   reddetti. Kapta her an yalnız bir görünüm görünür, böylece görünüm başlığı kap
//   başlığıyla birleşir ve webview bütün yüksekliği kaplar.
//
//   Bu kabuk karar vermez ve veri üretmez. Veri, mevcut sağlayıcılardan gelir:
//   Yol Haritası ağacı, Mini Graf çizicileri, Tren özeti ve Makinist ağacı (onay,
//   hatırlatıcı, gözlem, fikir). Gözlemler ve Ayarlar sekmeleri (OZK-13) bugün yalnız
//   boş durum cümlesi taşır; içerikleri sonraki Adımların işidir. Sağlayıcıların
//   `getChildren` ve `getTreeItem` yüzleri olduğu gibi okunur (panel-cekirdek.ts); kabuk
//   yalnız ileti köprüsüdür:
//   sekme seçimi, aç-kapa, tıklama, kutucuk ve satır eylemleri.
//
//   Çizim kuralları:
//     · Yalnız SEÇİLİ sekmenin içeriği çizilir; diğerleri kullanıcı seçene kadar
//       hesaplanmaz.
//     · Veri değişince yalnız ilgili parça yeniden çizilir (ağaç · Mini Graf · Tren ·
//       Makinist); yalnız bir satırı ilgilendiren değişim (aktif varlık nabzı)
//       tek satır yamasıdır. Görünmeyen panel hiçbir şey çizmez, görününce yetişir.
//     · Yalnız AÇIK düğümlerin çocukları DOM'a basılır.
//     · Açık-kapalı tercihleri workspaceState'te kalıcıdır. Sekme seçimi KALICI
//       DEĞİLDİR: her açılış Ray'le başlar (PNL-A03). Önceki sürümler seçimi
//       workspaceState'e yazıp açılışta okuyordu; pencere yeniden yüklenince panel son
//       sekmeyle (ör. Makinist) açılıyor, oysa bölüm yuvası (bolum-yuvasi.ts) her
//       açılışı Ray'le başlatıyordu ve iki seçim birbirini tutmuyordu. Seçim oturum
//       boyunca bellekte korunur, çünkü görünüm gizlenince de sağlayıcı yaşar.
//     · Yol Haritası bölümü her açılışta açık başlar; kullanıcının Mini Graf katlaması
//       kalıcıdır.
//     · Panelden tıklanan her satır dosyayı editörde ilgili satırda açar ve odak panelde
//       kalır (OZK-13): dosya açan satır komutları odağı bırakma seçeneğiyle çağrılır.
//     · ONAY KARARI PANELİN İÇİNDE VERİLİR (OZK-13 · PNL-A07): Onaylar düğümündeki kapı
//       satırına tıklayınca kaynak açılır ve kapının karar kademesi (gerekçe kutusu, üç
//       eylem) satırın hemen altında çizilir. Aynı anda yalnız bir kapı açıktır. Kademe
//       onay defterinden (onay-paneli.ts) gelir; eylemler aynı deftere iletilir ve diske
//       yazan yol değişmez.
// ═══════════════════════════════════════════════════════════════════════════

import * as vscode from "vscode";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  BOLUMLER, EYLEM_KOMUTLARI, IkonDefteri, SEKMELER, bolumAnahtari, bosSekmeHtml, grafKomutu, grafParcasi, makinistBolumuHtml, ogeKimligiBul, panelHtml, rayBolumuHtml, satirEylemleri, satirHtml,
  kacir, satirKur, satirlarHtml, satirlariUret, sekmeNormalle, trenBolumuHtml,
  type AgacKaynagi, type AgacOgesi, type BolumKimligi, type IkonSonucu, type SekmeKimligi, type SekmeSimgeleri,
  type UretilenSatir, type UretimSecenekleri,
} from "./panel-cekirdek.ts";
import { BAGLAM } from "./bolum-cekirdek.ts";
import { dekorCoz } from "./yol-dekor.ts";
import { SEKME_SIMGE_KAYNAKLARI } from "./simge-cizelgesi.ts";
import { MAKINIST_METINLERI } from "./yuzey-metinleri.ts";
import { ONAY_ILETILERI } from "./onay-paneli.ts";
import type { PanelMesaji } from "./onay-govde.ts";
import { panelRozeti } from "./yuzey-cekirdek.ts";
import type { DosyaAcSecenegi, PanelBagi, YolHaritasiYuzu } from "./yolharitasi.ts";
import type { Tren } from "./tren.ts";
import type { MakinistAgaci } from "./makinist.ts";

/** Kabın tek görünümü. */
export const GORUNUS_PANEL = "sarmalPanel";
/** `sarmal.dosyaAc` seçeneği: panelden açılan dosya editörde açılır, odak panelde kalır (OZK-13). */
const ODAK_PANELDE: DosyaAcSecenegi = { odakPanelde: true };

/**
 * Panelden tıklanan satırın komut argümanları (OZK-13: "panelden tıklanan her satır dosyayı editörde
 * ilgili satırda açar ve odak panelde kalır"). Dosya açan iki komut odağı bırakma seçeneğini alır:
 * `sarmal.dosyaAc` üçüncü argümanla, `vscode.open` seçenek nesnesindeki `preserveFocus` ile. Öteki
 * komutlar olduğu gibi çalışır.
 */
export function odakPaneldeArgumanlar(komut: string, argumanlar: readonly unknown[]): unknown[] {
  if (komut === "sarmal.dosyaAc" && argumanlar.length === 2) return [...argumanlar, ODAK_PANELDE];
  if (komut === "vscode.open" && argumanlar.length >= 1) {
    const secenek = argumanlar[1] && typeof argumanlar[1] === "object" ? argumanlar[1] : {};
    return [argumanlar[0], { ...secenek, preserveFocus: true }, ...argumanlar.slice(2)];
  }
  return [...argumanlar];
}
/** Seçili sekmenin bağlam anahtarı: başlık eylemleri (Yenile · Ray değiştir · Mini Graf görünümü) bunu okur. */
export const BAGLAM_SEKME = BAGLAM.panelSekme;
/** Kardeş Tren eklentisi bu komutu kaydeder; varlığı kardeşin varlığıdır. */
export const TREN_KARDES_KOMUTU = "sarmal.tren.kardesAc";

const ACIK_ANAHTARI = "sarmal.panel.acik";
const ACIK_USTU = 800;
/** Veri değişimlerinin birleştirildiği bekleme; nabız ve tur yayını art arda gelebilir. */
const GECIKME_MS = 120;

type Kaynak = "ray" | "tren" | "makinist";
/** Makinist ağacının Onaylar düğümünün satır kimliği (kapılar bu düğümün altında durur). */
const ONAYLAR_DUGUMU = "makinist/makinist.onaylar";
const KIMLIK_PARCASI: Readonly<Record<Kaynak, string>> = { ray: "agac", tren: "tren-agac", makinist: "makinist-agac" };
/** Ağaç kaynağı olan sekme mi? Gözlemler ve Ayarlar bugün ağaç taşımaz. */
const kaynakMi = (s: SekmeKimligi): s is Kaynak => s in KIMLIK_PARCASI;

export interface PanelGirdileri {
  yol: YolHaritasiYuzu;
  tren: Tren;
  makinist: MakinistAgaci;
}

/** Nöbetin okuduğu salt okur ölçüm. */
export interface PanelOlcumleri {
  sekme: SekmeKimligi;
  /** Son çizimde DOM'a basılan satır sayısı (seçili sekme). */
  satirSayisi: number;
  /** Tam belge ve parça iletisi sayısı. */
  belge: number;
  parca: number;
  yama: number;
  kardesVar: boolean;
  /** Mini Graf'ın kaç kez üretildiği, son üretimlerin sebepleri ve son üretimin görünümü (PNL-A05 nöbeti). */
  grafCizim: number;
  grafSebepler: readonly string[];
  grafGorunum: string;
  /** Webview'e en son gönderilen Mini Graf çiziminde dosyaya götüren ilk bağın hedefi. */
  grafIlkBag?: { dosya: string; satir: number };
  /** Webview betiğinin kaç kez yüklendiğini bildirdiği ('hazir' iletisi). */
  hazir: number;
  /** Son Makinist çiziminde karar kademesinin altına basıldığı kapı satırının kimliği (PNL-A07). */
  onayKademesi?: string;
  /** Onay defterinde karar kademesi açık kapı (PNL-A07). */
  onayAcik?: { dosya: string; kod: string };
}

/**
 * Yalnız sınama kipinde (`ExtensionMode.Test`) kaydedilen komut. Gerçek VS Code süiti webview'in
 * içine ulaşamaz; bu komut panelin betiğine Mini Graf düğümüne tıklatır, webview'den gelmiş gibi
 * bir iletiyi işler ya da Ray ağacının satırlarını verir. Kurulu eklentide kayıtlı değildir.
 */
export const SINAMA_KOMUTU = "sarmal.sinama.panel";

export interface SarmalPaneliYuzu {
  sekmeSec(s: SekmeKimligi): Promise<void>;
  gorunurMu(): boolean;
  diliTazele(): void;
  olcumler(): PanelOlcumleri;
}

class SarmalPaneli implements vscode.WebviewViewProvider, PanelBagi, SarmalPaneliYuzu {
  private gorunum?: vscode.WebviewView;
  private sekme: SekmeKimligi;
  private acik: Record<string, boolean>;
  private kirli = false;
  private kardesVar = false;
  private sonBos = false;
  private sonGraf = "";
  /**
   * Webview'deki Mini Graf son gönderilen çizimden yalnız betiğin taşıdığı seçim işaretiyle mi ayrılıyor
   * (PNL-A05)? Öyleyse bir sonraki çizim aynı olsa da gönderilir. Son gönderilen çizim bunun için
   * silinmez, çünkü bir sonraki satır tıklaması düğümün bağını o çizimde arar (PNL-A14 ölçümü).
   */
  private grafIsaretli = false;
  private readonly harita = new Map<string, { kaynak: Kaynak; u: UretilenSatir }>();
  private readonly ogeKimligi = new Map<unknown, string>();
  private readonly sonSatirlar: Record<Kaynak, UretilenSatir[]> = { ray: [], tren: [], makinist: [] };
  private readonly zamanlayicilar = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly dosyaOnbellegi = new Map<string, string | undefined>();
  private sayac = { belge: 0, parca: 0, yama: 0 };
  private hazirSayisi = 0;
  private sonKademe?: string;

  constructor(private readonly context: vscode.ExtensionContext, private readonly g: PanelGirdileri) {
    // Her açılış Ray'le başlar; önceki oturumun sekmesi okunmaz (başlıktaki çizim kuralı).
    this.sekme = "ray";
    this.acik = { ...(context.workspaceState.get<Record<string, boolean>>(ACIK_ANAHTARI) ?? {}) };
    // Yol Haritası açık başlar (PNL-A03); oturum içindeki katlama yine korunur.
    delete this.acik[bolumAnahtari("agac")];
    const abone = (d: vscode.Disposable | { dispose(): unknown }): void => { context.subscriptions.push(d as vscode.Disposable); };
    // Yol Haritası: öğe hedefli olay (nabız) tek satır yamasıdır, öğesiz olay ağacın tazelenmesidir.
    abone(g.yol.saglayici.onDidChangeTreeData((e) => {
      if (e === undefined || e === null) this.zamanla("ray", () => this.agacTazele("ray"));
      else this.satirYama("ray", e);
    }));
    abone(g.yol.miniGraf.onDegisti(() => this.zamanla("graf", () => this.grafCiz())));
    abone(g.tren.onDidChangeTreeData(() => { this.kardesiYokla(); this.zamanla("tren", () => this.agacTazele("tren")); }));
    abone(g.makinist.onDidChangeTreeData(() => {
      this.rozetiYaz();
      this.zamanla("makinist", () => this.agacTazele("makinist"));
    }));
    abone(vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("sarmal.miniGraf")) this.zamanla("bolum", () => this.bolumGonder());
    }));
    abone(vscode.extensions.onDidChange(() => this.kardesiYokla()));
    abone({ dispose: () => { for (const z of this.zamanlayicilar.values()) clearTimeout(z); this.zamanlayicilar.clear(); } });
    void this.sekmeBaglami();
    this.kardesiYokla();
    g.yol.panelBagla(this);
    // Onay kararının yüzeyi bu paneldir (PNL-A07); defter kademe değişince ya da bir kapı gösterilince buraya döner.
    g.makinist.onay?.yuzeyBagla({ tazele: (odakNot) => this.onayTazele(odakNot), goster: () => this.onayGoster() });
    if (context.extensionMode === vscode.ExtensionMode.Test) {
      abone(vscode.commands.registerCommand(SINAMA_KOMUTU, (e: unknown) => this.sinamaEylemi(e)));
    }
  }

  // ── Görünüm ────────────────────────────────────────────────────────────────

  resolveWebviewView(gorunum: vscode.WebviewView): void {
    this.gorunum = gorunum;
    gorunum.webview.options = { enableScripts: true };
    gorunum.webview.html = this.tamHtml(gorunum.webview.cspSource);
    this.sayac.belge += 1;
    this.rozetiYaz();
    gorunum.webview.onDidReceiveMessage((m: unknown) => { void this.iletiyiIsle(m); });
    gorunum.onDidChangeVisibility(() => {
      if (!gorunum.visible || !this.kirli) return;
      this.kirli = false;
      this.bolumGonder();
    });
  }

  gorunurMu(): boolean { return this.gorunum?.visible ?? false; }

  olcumler(): PanelOlcumleri {
    const satirSayisi = kaynakMi(this.sekme) ? this.sonSatirlar[this.sekme].length : 0;
    const bag = /href="(command:sarmal\.dosyaAc\?[^"]*)"/.exec(this.sonGraf)?.[1];
    const k = bag ? grafKomutu(bag.replace(/&amp;/g, "&")) : undefined;
    return {
      sekme: this.sekme, satirSayisi, ...this.sayac, kardesVar: this.kardesVar,
      grafCizim: this.g.yol.miniGraf.cizimSayisi, grafSebepler: [...this.g.yol.miniGraf.cizimSebepleri], grafGorunum: this.g.yol.miniGraf.cizilenGorunum,
      grafIlkBag: k ? { dosya: String(k.argumanlar[0]), satir: Number(k.argumanlar[1]) } : undefined,
      hazir: this.hazirSayisi,
      onayKademesi: this.sonKademe,
      onayAcik: this.g.makinist.onay?.acikKapi(),
    };
  }

  /** Sınama kipinin eylemleri (SINAMA_KOMUTU). */
  private async sinamaEylemi(ham: unknown): Promise<unknown> {
    const e = (ham ?? {}) as { eylem?: unknown; ileti?: unknown; metin?: unknown };
    if (e.eylem === "grafTikla") { this.yaz({ tip: "sinamaTikla" }); return this.olcumler().grafIlkBag; }
    // Webview'e en son gönderilen Mini Graf çizimi verilen metni taşıyor mu (PNL-A14 nöbeti).
    if (e.eylem === "grafIcerir") return typeof e.metin === "string" && this.sonGraf.includes(e.metin);
    if (e.eylem === "ileti") { await this.iletiyiIsle(e.ileti); return true; }
    if (e.eylem === "raySatirlari") {
      return [...this.harita].filter(([, v]) => v.kaynak === "ray").map(([id, v]) => ({
        id, kod: this.g.yol.saglayici.ogeKodu(v.u.oge), komutlu: v.u.satir.komutlu,
        dosya: String((v.u.item.command?.arguments?.[0] as { fsPath?: string } | undefined)?.fsPath ?? v.u.item.command?.arguments?.[0] ?? ""),
        durum: v.u.satir.durum,
      }));
    }
    return undefined;
  }

  /** Dil değişince tab şeridi ve bütün metinler yeniden yazılır. */
  diliTazele(): void {
    this.dosyaOnbellegi.clear();
    if (!this.gorunum) return;
    this.gorunum.webview.html = this.tamHtml(this.gorunum.webview.cspSource);
    this.sayac.belge += 1;
  }

  async sekmeSec(s: SekmeKimligi): Promise<void> {
    const yeni = sekmeNormalle(s);
    const degisti = yeni !== this.sekme;
    this.sekme = yeni;
    if (yeni === "tren") this.kardesiYokla();
    // Çizim bağlam yazımını beklemez: görünüm henüz çözülmemişse ilk belge zaten bu sekmeyle üretilir
    // ve ikinci bir bölüm iletisi gönderilmez.
    if (degisti || this.gorunum) this.bolumGonder();
    await this.sekmeBaglami();
  }

  /** Bölüm komutlarının (sarmal.bolum.*) panel karşılığı: sekmeyi seçer ve kabı öne alır. */
  async sekmeSecVeOdakla(s: SekmeKimligi): Promise<void> {
    await this.sekmeSec(s);
    try { await vscode.commands.executeCommand(`${GORUNUS_PANEL}.focus`); } catch { /* görünüm henüz yoksa odak beklenmez */ }
  }

  private async sekmeBaglami(): Promise<void> {
    await vscode.commands.executeCommand("setContext", BAGLAM_SEKME, this.sekme);
  }

  private rozetiYaz(): void {
    const sayi = this.g.makinist.rozetSayisi;
    if (this.gorunum) this.gorunum.badge = panelRozeti(sayi, MAKINIST_METINLERI.rozetIpucu);
    this.yaz({ tip: "rozet", sayi });
  }

  // ── Kardeş Tren eklentisi ───────────────────────────────────────────────────

  /** Kardeş Tren eklentisi `sarmal.tren.kardesAc` komutunu kaydeder; varlığı kardeşin varlığıdır. */
  private kardesiYokla(): void {
    void Promise.resolve(vscode.commands.getCommands?.(true)).then((komutlar) => {
      const var_ = Array.isArray(komutlar) && komutlar.includes(TREN_KARDES_KOMUTU);
      if (var_ === this.kardesVar) return;
      this.kardesVar = var_;
      if (this.sekme === "tren") this.zamanla("tren", () => this.agacTazele("tren"));
    }, () => undefined);
  }

  // ── Çizim ──────────────────────────────────────────────────────────────────

  private simgeler(): SekmeSimgeleri {
    const oku = (rel: string): string => {
      if (!this.dosyaOnbellegi.has(rel)) {
        let metin: string | undefined;
        try { metin = readFileSync(join(this.context.extensionUri.fsPath, rel), "utf8"); } catch { metin = undefined; }
        this.dosyaOnbellegi.set(rel, metin);
      }
      return this.dosyaOnbellegi.get(rel) ?? "";
    };
    return Object.fromEntries(SEKMELER.map((s) => [s, oku(SEKME_SIMGE_KAYNAKLARI[s])])) as SekmeSimgeleri;
  }

  private tamHtml(cspSource: string): string {
    const b = this.bolumUret(this.sekme);
    return panelHtml({
      sekme: this.sekme, icerik: b.html, ikonStili: b.ikonStili, simgeler: this.simgeler(),
      nonce: randomBytes(16).toString("base64"), cspSource, rozet: this.g.makinist.rozetSayisi,
    });
  }

  private kaynak(k: Kaynak): AgacKaynagi {
    return (k === "ray" ? this.g.yol.saglayici : k === "tren" ? this.g.tren : this.g.makinist) as unknown as AgacKaynagi;
  }

  private ikonOku(yol: string): string | undefined {
    if (!this.dosyaOnbellegi.has(yol)) {
      let metin: string | undefined;
      try { metin = readFileSync(yol, "utf8"); } catch { metin = undefined; }
      this.dosyaOnbellegi.set(yol, metin);
    }
    return this.dosyaOnbellegi.get(yol);
  }

  private ikonCoz = (p: unknown): IkonSonucu | undefined => {
    if (!p || typeof p !== "object") return undefined;
    const o = p as { id?: unknown; color?: { id?: unknown }; light?: { fsPath?: string }; dark?: { fsPath?: string }; fsPath?: string };
    if (typeof o.id === "string" && o.light === undefined) {
      return { tur: "tema", ad: o.id, renk: typeof o.color?.id === "string" ? o.color.id : undefined };
    }
    const acikYol = o.light?.fsPath ?? o.fsPath;
    const koyuYol = o.dark?.fsPath ?? o.fsPath;
    if (!acikYol || !koyuYol) return undefined;
    const a = this.ikonOku(acikYol);
    const k = this.ikonOku(koyuYol);
    return a && k ? { tur: "dosya", acik: a, koyu: k } : undefined;
  };

  private secenekler(onek: Kaynak, defter: IkonDefteri): UretimSecenekleri {
    return {
      acikMi: (id, varsayilan) => (id in this.acik ? this.acik[id]! : varsayilan),
      ikonCoz: this.ikonCoz,
      dekor: (uri) => {
        if (!uri || !uri.path) return undefined;
        const [anahtar, bloklu] = uri.path.replace(/^\//, "").split("/");
        const d = dekorCoz(anahtar ?? "", Number(bloklu ?? "0") || 0);
        return d ? { renk: d.renk, rozet: d.rozet } : undefined;
      },
      eylemler: satirEylemleri,
      defter,
      onek,
    };
  }

  /** Bir kaynağın açık satırlarını üretir ve kimlik haritasını yeniler. */
  private agacUret(k: Kaynak): { satirlar: UretilenSatir[]; html: string; ikonStili: string } {
    const defter = new IkonDefteri();
    const satirlar = satirlariUret(this.kaynak(k), this.secenekler(k, defter));
    for (const [id, v] of [...this.harita]) if (v.kaynak === k) this.harita.delete(id);
    for (const o of [...this.ogeKimligi]) if (o[1].startsWith(`${k}/`)) this.ogeKimligi.delete(o[0]);
    for (const u of satirlar) { this.harita.set(u.satir.id, { kaynak: k, u }); this.ogeKimligi.set(u.oge, u.satir.id); }
    this.sonSatirlar[k] = satirlar;
    if (k !== "makinist") return { satirlar, html: satirlarHtml(satirlar.map((x) => x.satir)), ikonStili: defter.stil() };
    // Makinist: kapı satırı açılıp kapanan bir satır gibi çizilir; açık kapının karar kademesi hemen altına basılır.
    this.sonKademe = undefined;
    const html = satirlar.map((u) => {
      const kapi = this.kapiArgumanlari(u.item);
      if (!kapi) return satirHtml(u.satir);
      const kademe = this.g.makinist.onay?.kademeHtml(kapi.dosya, kapi.kod);
      u.satir.durum = kademe ? "acik" : "kapali";
      if (kademe) this.sonKademe = u.satir.id;
      return satirHtml(u.satir) + (kademe
        ? `<div class="kademe" role="group" aria-label="${kacir(u.satir.etiket)}" style="--d:${u.satir.derinlik}" data-kapi="${kacir(u.satir.id)}">${kademe}</div>`
        : "");
    }).join("");
    return { satirlar, html, ikonStili: defter.stil() };
  }

  // ── Onay kararı (PNL-A07 · OZK-13) ─────────────────────────────────────────

  /** Makinist'teki kapı satırının komut argümanları (dosya, satır, kod); kapı satırı değilse tanımsız. */
  private kapiArgumanlari(item: AgacOgesi): { dosya: string; satir: number; kod: string } | undefined {
    if (item.contextValue !== "sarmalOnayKapisi" || item.command?.command !== "sarmal.onayKapisiAc") return undefined;
    const [dosya, satir, kod] = item.command.arguments ?? [];
    return typeof dosya === "string" && typeof kod === "string" ? { dosya, satir: Number(satir) || 0, kod } : undefined;
  }

  /**
   * Kapı satırına tıklama (ya da okuna basma): kapı açıksa kademesi kapanır; kapalıysa kapının
   * komutu kaynağı satırında açar ve kademeyi açar (`sarmal.onayKapisiAc` → `gosterVeAc`).
   * Kapı satırı değilse yanlış döner.
   */
  private async onayKapisiGec(kayit: { kaynak: Kaynak; u: UretilenSatir }): Promise<boolean> {
    const onay = this.g.makinist.onay;
    const kapi = kayit.kaynak === "makinist" ? this.kapiArgumanlari(kayit.u.item) : undefined;
    if (!onay || !kapi) return false;
    if (onay.acikMi(kapi.dosya, kapi.kod)) {
      onay.kapiyiKapat();
      this.onayTazele();
      return true;
    }
    await vscode.commands.executeCommand("sarmal.onayKapisiAc", kapi.dosya, kapi.satir, kapi.kod);
    return true;
  }

  /** Onay yüzeyinin tazelemesi: Makinist ağacı hemen yeniden çizilir; istenirse gerekçe kutusuna odaklanılır. */
  private onayTazele(odakNot?: string): void {
    if (!this.gorunum || this.sekme !== "makinist") return;
    if (!this.gorunum.visible) { this.kirli = true; return; }
    this.agacTazele("makinist");
    if (odakNot) this.yaz({ tip: "onayOdak", kimlik: odakNot });
  }

  /** Onay yüzeyinin gösterimi: Makinist sekmesi seçilir, Onaylar düğümü açılır ve panel öne gelir. */
  private async onayGoster(): Promise<void> {
    if (this.acik[ONAYLAR_DUGUMU] !== true) { this.acik[ONAYLAR_DUGUMU] = true; this.acikKaydet(); }
    await this.sekmeSecVeOdakla("makinist");
  }

  private grafAcik(): boolean {
    return vscode.workspace.getConfiguration("sarmal").get<boolean>("miniGraf", true);
  }

  /** Katlanmış Ray bölümleri; durum satırların açık-kapalı haritasında kalıcıdır. */
  private kapaliBolumler(): Partial<Record<BolumKimligi, boolean>> {
    const k: Partial<Record<BolumKimligi, boolean>> = {};
    for (const b of BOLUMLER) if (this.acik[bolumAnahtari(b)] === false) k[b] = true;
    return k;
  }

  /** Seçili sekmenin tam içeriği. */
  private bolumUret(s: SekmeKimligi): { html: string; ikonStili: string } {
    if (s === "ray") {
      const a = this.agacUret("ray");
      const bos = this.g.yol.saglayici.bosMesaj();
      this.sonBos = bos !== undefined;
      const graf = this.grafAcik() ? this.g.yol.miniGraf.html() : undefined;
      this.sonGraf = graf === undefined ? "" : grafParcasi(graf);
      this.grafIsaretli = false;
      return {
        html: rayBolumuHtml({ agac: a.html, bosMesaj: bos, graf, kapali: this.kapaliBolumler() }),
        ikonStili: a.ikonStili,
      };
    }
    if (s === "tren") {
      const a = this.agacUret("tren");
      return { html: trenBolumuHtml(a.html, this.g.tren.bos(), this.kardesVar), ikonStili: a.ikonStili };
    }
    if (!kaynakMi(s)) return { html: bosSekmeHtml(s), ikonStili: "" };
    const a = this.agacUret("makinist");
    return { html: makinistBolumuHtml(a.html), ikonStili: a.ikonStili };
  }

  private yaz(m: unknown): void {
    if (!this.gorunum) return;
    void Promise.resolve(this.gorunum.webview.postMessage(m)).catch(() => undefined);
  }

  /** Seçili sekmenin içeriğini baştan gönderir (sekme değişimi, ayar değişimi, yeniden görünme). */
  private bolumGonder(): void {
    if (!this.gorunum) return;
    if (!this.gorunum.visible) { this.kirli = true; return; }
    const b = this.bolumUret(this.sekme);
    this.sayac.parca += 1;
    this.yaz({ tip: "bolum", sekme: this.sekme, html: b.html, ikonStili: b.ikonStili });
  }

  /** Ağaç parçasını yeniden çizer; Yol Haritası boş-durum geçişinde bölümün tamamı gönderilir. */
  private agacTazele(k: Kaynak): void {
    if (!this.gorunum || this.sekme !== k) return;
    if (!this.gorunum.visible) { this.kirli = true; return; }
    if (k === "ray" && (this.g.yol.saglayici.bosMesaj() !== undefined) !== this.sonBos) { this.bolumGonder(); return; }
    if (k === "tren") { this.bolumGonder(); return; }   // boş durum ve kardeş bağlantısı aynı bölümdedir
    const a = this.agacUret(k);
    this.sayac.parca += 1;
    this.yaz({ tip: "parca", kimlik: KIMLIK_PARCASI[k], html: a.html, ikonStili: a.ikonStili });
  }

  private grafCiz(): void {
    if (!this.gorunum || this.sekme !== "ray" || !this.grafAcik()) return;
    if (!this.gorunum.visible) { this.kirli = true; return; }
    // Tur yayını grafın modelini değiştirmediyse çizim yapılmaz (PNL-A14). Mini Graf büyük olabilir
    // (Sarmal deposunun kendisinde megabayta yakın); aynı çizim ikinci kez de gönderilmez.
    const yeni = this.g.yol.miniGraf.guncelHtml();
    if (yeni === undefined) return;
    const html = grafParcasi(yeni);
    if (html === this.sonGraf && !this.grafIsaretli) return;
    this.sonGraf = html;
    this.grafIsaretli = false;
    this.sayac.parca += 1;
    this.yaz({ tip: "parca", kimlik: "graf", html });
  }

  /** Yalnız bir satırı ilgilendiren değişim: satır yeniden kurulur ve yamalanır. */
  private satirYama(k: Kaynak, oge: unknown): void {
    if (!this.gorunum || this.sekme !== k || !this.gorunum.visible) return;
    const id = this.ogeKimligi.get(oge);
    if (!id) return;
    const eski = this.harita.get(id);
    if (!eski) return;
    const defter = new IkonDefteri();
    const yeni = satirKur(this.kaynak(k), oge, id, eski.u.satir.derinlik, this.secenekler(k, defter));
    this.harita.set(id, { kaynak: k, u: yeni });
    const dizi = this.sonSatirlar[k];
    const i = dizi.findIndex((x) => x.satir.id === id);
    if (i >= 0) dizi[i] = yeni;
    this.sayac.yama += 1;
    this.yaz({ tip: "satir", id, html: satirHtml(yeni.satir), ikonStili: defter.stil() });
  }

  /**
   * Ray satırına tıklama Mini Grafta yalnız seçimi taşır (PNL-A05): graf yeniden üretilmez ve
   * webview'e gönderilmez; seçim işareti betikte düğümün bağıyla bulunur. Düğüm son çizimde yoksa
   * (daraltılmış, tamamlanmış bir dalın içindeyse) graf o dalı açmak için bir kez çizilir.
   * Seçim Mini Grafın kendi durumuna da yazılır; imleç izleme aynı düğümü seçince çizim yapılmaz.
   */
  private grafIsaretle(kod: string): void {
    if (!this.grafAcik()) return;
    const href = this.g.yol.miniGraf.isaretle(kod);
    if (href === undefined) return;
    if (href && this.sonGraf.includes(`href="${href}"`)) {
      // Webview'deki çizim artık son gönderilenle aynı değildir; bir sonraki çizim mutlaka gönderilir.
      this.grafIsaretli = true;
      this.yaz({ tip: "grafSec", href });
      return;
    }
    this.g.yol.miniGraf.yenidenCiz("secim");
  }

  /** Aynı anahtar için art arda gelen olaylar tek çizime iner. */
  private zamanla(anahtar: string, f: () => void): void {
    const eski = this.zamanlayicilar.get(anahtar);
    if (eski) clearTimeout(eski);
    this.zamanlayicilar.set(anahtar, setTimeout(() => { this.zamanlayicilar.delete(anahtar); f(); }, GECIKME_MS));
  }

  // ── Ray değiştirme ─────────────────────────────────────────────────────────

  varligaGit(varlik: unknown): void {
    const bulunan = ogeKimligiBul(this.kaynak("ray"), varlik, "ray", (o) => this.g.yol.saglayici.varlikMi(o));
    if (!bulunan) return;
    for (const ata of bulunan.atalar) this.acik[ata] = true;
    this.acik[bulunan.id] = true;
    this.acikKaydet();
    void (async () => {
      await this.sekmeSecVeOdakla("ray");
      this.bolumGonder();
      this.yaz({ tip: "git", id: bulunan.id });
    })();
  }

  // ── İletiler ───────────────────────────────────────────────────────────────

  private acikKaydet(): void {
    const anahtarlar = Object.keys(this.acik);
    if (anahtarlar.length > ACIK_USTU) for (const a of anahtarlar.slice(0, anahtarlar.length - ACIK_USTU)) delete this.acik[a];
    void this.context.workspaceState.update(ACIK_ANAHTARI, this.acik);
  }

  private async iletiyiIsle(ham: unknown): Promise<void> {
    const m = (ham ?? {}) as Record<string, unknown>;
    const id = typeof m.id === "string" ? m.id : "";
    const kayit = id ? this.harita.get(id) : undefined;
    switch (m.tip) {
      case "sekme": {
        if ((SEKMELER as readonly unknown[]).includes(m.ad)) await this.sekmeSec(m.ad as SekmeKimligi);
        return;
      }
      case "gec": {
        if (!kayit || typeof m.ac !== "boolean") return;
        if (await this.onayKapisiGec(kayit)) return;
        this.acik[id] = m.ac;
        this.acikKaydet();
        this.agacTazele(kayit.kaynak);
        return;
      }
      case "bolumGec": {
        // İstemci gövdeyi zaten gizledi ya da açtı; burada yalnız durum kalıcı yazılır.
        if (!(BOLUMLER as readonly unknown[]).includes(m.bolum) || typeof m.ac !== "boolean") return;
        this.acik[bolumAnahtari(m.bolum as BolumKimligi)] = m.ac;
        this.acikKaydet();
        return;
      }
      case "ac": {
        if (!kayit) return;
        if (kayit.kaynak === "ray") {
          const kod = this.g.yol.saglayici.ogeKodu(kayit.u.oge);
          if (kod) this.grafIsaretle(kod);
        }
        if (await this.onayKapisiGec(kayit)) return;
        const k = kayit.u.item.command;
        if (k) await vscode.commands.executeCommand(k.command, ...odakPaneldeArgumanlar(k.command, k.arguments ?? []));
        return;
      }
      case "onay": {
        // Karar kademesinin eylemleri (gerekçe taslağı, karar, vazgeçiş, bağlam kopyası) onay defterine iner.
        const ileti = m.ileti as { tur?: unknown } | undefined;
        const onay = this.g.makinist.onay;
        if (!onay || !ileti || typeof ileti !== "object" || !ONAY_ILETILERI.has(String(ileti.tur))) return;
        await onay.mesaj(ileti as PanelMesaji);
        return;
      }
      case "isaretle": {
        if (!kayit || kayit.kaynak !== "ray" || typeof m.deger !== "boolean") return;
        await this.g.yol.saglayici.kutuIsaretle(kayit.u.oge, m.deger);
        return;
      }
      case "eylem": {
        const komut = typeof m.komut === "string" ? m.komut : "";
        if (!kayit || !EYLEM_KOMUTLARI.has(komut) || !kayit.u.satir.eylemler.some((e) => e.komut === komut)) return;
        await vscode.commands.executeCommand(komut, kayit.u.oge);
        return;
      }
      case "komut": {
        const k = typeof m.href === "string" ? grafKomutu(m.href) : undefined;
        if (!k) return;
        // Mini Graf düğümü dosyayı editörde ilgili satırda açar ve odak panelde kalır (OZK-13).
        const ek = k.komut === "sarmal.dosyaAc" ? [ODAK_PANELDE] : [];
        await vscode.commands.executeCommand(k.komut, ...k.argumanlar, ...ek);
        return;
      }
      case "hazir": { this.hazirSayisi += 1; return; }
      case "kardes": {
        if (!this.kardesVar) return;
        try { await vscode.commands.executeCommand(TREN_KARDES_KOMUTU); } catch { /* kardeş kapanmış olabilir */ }
        return;
      }
      default: return;
    }
  }
}

/** Görünümü kaydeder (kapta tek görünüm). */
export function panelKaydi(context: vscode.ExtensionContext, g: PanelGirdileri): SarmalPaneliYuzu & { sekmeSecVeOdakla(s: SekmeKimligi): Promise<void> } {
  const panel = new SarmalPaneli(context, g);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(GORUNUS_PANEL, panel, { webviewOptions: { retainContextWhenHidden: true } }),
  );
  return panel;
}

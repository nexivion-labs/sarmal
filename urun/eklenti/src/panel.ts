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
// ═══════════════════════════════════════════════════════════════════════════

import * as vscode from "vscode";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  BOLUMLER, EYLEM_KOMUTLARI, IkonDefteri, SEKMELER, bolumAnahtari, bosSekmeHtml, grafKomutu, grafParcasi, makinistBolumuHtml, ogeKimligiBul, panelHtml, rayBolumuHtml, satirEylemleri, satirHtml,
  satirKur, satirlarHtml, satirlariUret, sekmeNormalle, trenBolumuHtml,
  type AgacKaynagi, type BolumKimligi, type IkonSonucu, type SekmeKimligi, type SekmeSimgeleri,
  type UretilenSatir, type UretimSecenekleri,
} from "./panel-cekirdek.ts";
import { BAGLAM } from "./bolum-cekirdek.ts";
import { dekorCoz } from "./yol-dekor.ts";
import { SEKME_SIMGE_KAYNAKLARI } from "./simge-cizelgesi.ts";
import { MAKINIST_METINLERI } from "./yuzey-metinleri.ts";
import { panelRozeti } from "./yuzey-cekirdek.ts";
import type { DosyaAcSecenegi, PanelBagi, YolHaritasiYuzu } from "./yolharitasi.ts";
import type { Tren } from "./tren.ts";
import type { MakinistAgaci } from "./makinist.ts";

/** Kabın tek görünümü. */
export const GORUNUS_PANEL = "sarmalPanel";
/** `sarmal.dosyaAc` seçeneği: panelden açılan dosya editörde açılır, odak panelde kalır (OZK-13). */
const ODAK_PANELDE: DosyaAcSecenegi = { odakPanelde: true };
/** Seçili sekmenin bağlam anahtarı: başlık eylemleri (Yenile · Ray değiştir · Mini Graf görünümü) bunu okur. */
export const BAGLAM_SEKME = BAGLAM.panelSekme;
/** Kardeş Tren eklentisi bu komutu kaydeder; varlığı kardeşin varlığıdır. */
export const TREN_KARDES_KOMUTU = "sarmal.tren.kardesAc";

const ACIK_ANAHTARI = "sarmal.panel.acik";
const ACIK_USTU = 800;
/** Veri değişimlerinin birleştirildiği bekleme; nabız ve tur yayını art arda gelebilir. */
const GECIKME_MS = 120;

type Kaynak = "ray" | "tren" | "makinist";
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
  /** Mini Graf'ın kaç kez üretildiği ve son üretimin görünümü (PNL-A05 nöbeti). */
  grafCizim: number;
  grafGorunum: string;
  /** Webview'e en son gönderilen Mini Graf çiziminde dosyaya götüren ilk bağın hedefi. */
  grafIlkBag?: { dosya: string; satir: number };
  /** Webview betiğinin kaç kez yüklendiğini bildirdiği ('hazir' iletisi). */
  hazir: number;
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
  private readonly harita = new Map<string, { kaynak: Kaynak; u: UretilenSatir }>();
  private readonly ogeKimligi = new Map<unknown, string>();
  private readonly sonSatirlar: Record<Kaynak, UretilenSatir[]> = { ray: [], tren: [], makinist: [] };
  private readonly zamanlayicilar = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly dosyaOnbellegi = new Map<string, string | undefined>();
  private sayac = { belge: 0, parca: 0, yama: 0 };
  private hazirSayisi = 0;

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
      grafCizim: this.g.yol.miniGraf.cizimSayisi, grafGorunum: this.g.yol.miniGraf.cizilenGorunum,
      grafIlkBag: k ? { dosya: String(k.argumanlar[0]), satir: Number(k.argumanlar[1]) } : undefined,
      hazir: this.hazirSayisi,
    };
  }

  /** Sınama kipinin eylemleri (SINAMA_KOMUTU). */
  private async sinamaEylemi(ham: unknown): Promise<unknown> {
    const e = (ham ?? {}) as { eylem?: unknown; ileti?: unknown };
    if (e.eylem === "grafTikla") { this.yaz({ tip: "sinamaTikla" }); return this.olcumler().grafIlkBag; }
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
    return { satirlar, html: satirlarHtml(satirlar.map((x) => x.satir)), ikonStili: defter.stil() };
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
    // Mini Graf büyük olabilir (Sarmal deposunun kendisinde megabayta yakın); aynı çizim ikinci kez gönderilmez.
    const html = grafParcasi(this.g.yol.miniGraf.html());
    if (html === this.sonGraf) return;
    this.sonGraf = html;
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
      this.sonGraf = "";
      this.yaz({ tip: "grafSec", href });
      return;
    }
    this.g.yol.miniGraf.tazele();
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
        const k = kayit.u.item.command;
        if (k) await vscode.commands.executeCommand(k.command, ...(k.arguments ?? []));
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

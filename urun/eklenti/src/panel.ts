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
//     · BEŞ SEKMENİN BÖLÜMÜ WEBVIEW'DE HAZIR DURUR (PNL-A18 · Founder 2026-10-28 ekran
//       kaydı). Sekme geçişi webview'in kendi içinde, eklentiye gidip gelen bir yanıt
//       beklemeden yapılır; eklenti seçimi yalnız haber olarak alır. Eskiden yalnız seçili
//       sekmenin içeriği çiziliyor ve sekme değişince eklentiden yeni bölüm isteniyordu;
//       eklenti denetim turunun bölünmez bloğundayken vurgu yeni sekmeye geçiyor, içerik
//       eski sekmede kalıyor ya da gecikmiş bir bölüm iletisi başka sekmenin yerine
//       çiziliyordu. Bugün her güncelleme kendi sekmesinin kabına yazılır ve seçili sekme
//       ne olursa olsun bütün bölümler güncel tutulur.
//     · SEÇİLİ SEKMENİN TEK KAYNAĞI bu paneldeki `sekme` alanıdır ve tek yazım yolu
//       `sekmeyiYaz`dır. Bölüm yuvası (bolum-yuvasi.ts) yerleşik seçimi kendi saklamaz,
//       buradan okur; webview ise eklentinin seçtirdiği sekmeyi, eklentiye henüz ulaşmamış
//       daha yeni bir kullanıcı geçişi yoksa uygular (panel-betik.ts geçiş sayacı).
//     · Veri değişince yalnız ilgili parça yeniden çizilir (ağaç · Mini Graf · Tren ·
//       Makinist); yalnız bir satırı ilgilendiren değişim (aktif varlık nabzı)
//       tek satır yamasıdır. Görünmeyen panel hiçbir şey çizmez, görününce yetişir.
//     · DAL AÇMA EKLENTİYİ BEKLEMEZ (PNL-A27). Kapalı dalların çocukları da üretilir ve
//       webview'e çizilmeyen bir şablon içinde gider; dal webview'de anında açılıp kapanır
//       ve eklentiye yalnız haber gider (sayaçlı, PNL-A18'in sekme deseni). Eklentinin
//       sonraki güncellemesi o haberi henüz görmemişse webview kullanıcının açtığı ya da
//       kapattığı dalı yeniden uygular. Yalnız görünen satırlar DOM'da düzen alır.
//     · Açık-kapalı tercihleri workspaceState'te kalıcıdır. Sekme seçimi KALICI
//       DEĞİLDİR: her açılış sıranın İLK sekmesiyle başlar (PNL-A03; PNL-A23'ten önce
//       bu sekme her zaman Ray'di). Önceki sürümler seçimi
//       workspaceState'e yazıp açılışta okuyordu; pencere yeniden yüklenince panel son
//       sekmeyle (ör. Makinist) açılıyor, oysa bölüm yuvası (bolum-yuvasi.ts) her
//       açılışı Ray'le başlatıyordu ve iki seçim birbirini tutmuyordu. Seçim oturum
//       boyunca bellekte korunur, çünkü görünüm gizlenince de sağlayıcı yaşar.
//     · SEKME SIRASI KULLANICI AYARINDADIR (PNL-A23 · OZK-14 DÖRDÜNCÜSÜ). Beş sekme
//       sürüklenerek ya da Alt+Sol/Sağ ile yeniden sıralanır; webview yeni sırayı
//       iletir ve eklenti onu `sarmal.sekmeSirasi` kullanıcı ayarına yazar. Sıra
//       seçimden ayrıdır: sırayı değiştirmek seçili sekmeyi değiştirmez. Ayar yoksa
//       paketin varsayılan sırası (package.json) uygulanır; bozuk ya da eksik değer
//       `sekmeSirasiNormalle` ile varsayılana tamamlanır. Ayar başka bir yoldan
//       değişirse (varsayılana döndürme komutu, ayar dosyası, başka pencere) yeni sıra
//       webview'e iletilir ve şerit yeniden dizilir; belge yeniden yazılmaz.
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
  type SekmeBolumu,
  BOLUMLER, EYLEM_KOMUTLARI, IkonDefteri, SEKMELER, bolumAnahtari, bosSekmeHtml, grafKomutu, grafParcasi, makinistBolumuHtml, ogeKimligiBul, panelHtml, rayBolumuHtml, satirEylemleri, satirHtml,
  ayniSira, gorunurSatirlar, kacir, satirKur, satirlarHtml, satirlariUret, sekmeNormalle, sekmeSirasiNormalle, sinyallerBolumuHtml, trenBolumuHtml,
  type AgacKaynagi, type AgacOgesi, type BolumKimligi, type IkonSonucu, type SekmeKimligi, type SekmeSimgeleri,
  type UretilenSatir, type UretimSecenekleri,
} from "./panel-cekirdek.ts";
import { BAGLAM } from "./bolum-cekirdek.ts";
import { dekorCoz } from "./yol-dekor.ts";
import { SEKME_SIMGE_KAYNAKLARI } from "./simge-cizelgesi.ts";
import { MAKINIST_METINLERI } from "./yuzey-metinleri.ts";
import { ONAY_ILETILERI } from "./onay-paneli.ts";
import type { PanelMesaji } from "./onay-govde.ts";
import { panelRozeti, SINYALLER_ODAK_KOMUTU } from "./yuzey-cekirdek.ts";
import type { DosyaAcSecenegi, PanelBagi, YolHaritasiYuzu } from "./yolharitasi.ts";
import type { Tren } from "./tren.ts";
import type { MakinistAgaci } from "./makinist.ts";
import type { SinyallerAgaci } from "./sinyaller.ts";

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

type Kaynak = "ray" | "tren" | "makinist" | "sinyaller";
/** Makinist ağacının Onaylar düğümünün satır kimliği (kapılar bu düğümün altında durur). */
const ONAYLAR_DUGUMU = "makinist/makinist.onaylar";
const KIMLIK_PARCASI: Readonly<Record<Kaynak, string>> = { ray: "agac", tren: "tren-agac", makinist: "makinist-agac", sinyaller: "sinyaller-agac" };
/** Sinyaller sağlayıcısı verilmediğinde (sınama ve görsel kontrol kurulumu) sekme boş ağaç çizer. */
const BOS_KAYNAK: AgacKaynagi = { getChildren: () => [], getTreeItem: () => new vscode.TreeItem("") } as unknown as AgacKaynagi;
/** Ağaç kaynağı olan sekme mi? Gözlemler ve Ayarlar bugün ağaç taşımaz. */
const kaynakMi = (s: SekmeKimligi): s is Kaynak => s in KIMLIK_PARCASI;

export interface PanelGirdileri {
  yol: YolHaritasiYuzu;
  tren: Tren;
  makinist: MakinistAgaci;
  /** Sinyaller sekmesinin ağacı (PNL-A09); verilmezse sekme boş durum cümlesini gösterir. */
  sinyaller?: SinyallerAgaci;
}

/** Nöbetin okuduğu salt okur ölçüm. */
export interface PanelOlcumleri {
  sekme: SekmeKimligi;
  /** Şeridin sekme sırası (PNL-A23): son belgenin ve son sıra iletisinin kullandığı sıra. */
  sekmeSirasi: readonly SekmeKimligi[];
  /** Webview'den gelen sıra iletilerinden kaç tanesinin ayara yazıldığı (değişmeyen sıra yazılmaz). */
  siraYazimi: number;
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
  /** Sinyaller sekmesinin bant sayıları ve son çizimde DOM'a basılan tanı satırı sayısı (PNL-A09). */
  sinyaller?: {
    dur: number; dikkat: number; bilgi: number; toplam: number; bantsiz: number;
    /** Hatırlatıcılar yüzeyine yönlendiği için Sinyaller'e girmeyen kayıt sayısı (YUZ-3.3). */
    hatirlatici: number;
    /** Çizilen tanı satırı sayısı; bütün bantlar açıkken `toplam`a eşittir. */
    cizilenSatir: number;
    /** Çizilen tanı satırlarının işaret ettiği farklı kayıt sayısı; bir kayıt iki kez çizilirse `cizilenSatir`dan küçük kalır. */
    tekilKayit: number;
  };
}

/**
 * Yalnız sınama kipinde (`ExtensionMode.Test`) kaydedilen komut. Gerçek VS Code süiti webview'in
 * içine ulaşamaz; bu komut panelin betiğine Mini Graf düğümüne tıklatır, webview'den gelmiş gibi
 * bir iletiyi işler ya da Ray ağacının satırlarını verir. Kurulu eklentide kayıtlı değildir.
 */
export const SINAMA_KOMUTU = "sarmal.sinama.panel";

/** Sekme sırasının kullanıcı ayarı (PNL-A23); `sarmal` bölümünün altındaki adı. */
export const SEKME_SIRASI_AYARI = "sekmeSirasi";
/** Sekme sırasını paketin varsayılanına döndüren komut (komut paletinde). */
export const SEKME_SIRASI_SIFIRLA_KOMUTU = "sarmal.sekmeSirasiniSifirla";

/**
 * Kullanıcının sekme sırası: kullanıcı ayarı, yoksa paketin varsayılanı; ikisi de `sekmeSirasiNormalle`
 * süzgecinden geçer. Paketin varsayılanı package.json katkısındaki `default` değeridir (tek kaynak).
 */
export function sekmeSirasiOku(): SekmeKimligi[] {
  const ayar = vscode.workspace.getConfiguration("sarmal");
  const i = typeof ayar.inspect === "function" ? ayar.inspect<unknown>(SEKME_SIRASI_AYARI) : undefined;
  return sekmeSirasiNormalle(i?.globalValue ?? i?.defaultValue, i?.defaultValue);
}

export interface SarmalPaneliYuzu {
  sekmeSec(s: SekmeKimligi): Promise<void>;
  /** Seçili sekme: yerleşik bölüm seçiminin tek kaynağı (PNL-A18). */
  readonly seciliSekme: SekmeKimligi;
  /** Seçili sekme her yazıldığında (değişmese de) ateşlenir; bölüm yuvası seçimini buradan yansıtır. */
  readonly onSekmeSecildi: vscode.Event<SekmeKimligi>;
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
  /** Son çizimde görünen satırlar (bütün ataları açık olanlar). */
  private readonly sonSatirlar: Record<Kaynak, UretilenSatir[]> = { ray: [], tren: [], makinist: [], sinyaller: [] };
  /** 🌳 PNL-A27: son çizimin bütün satırları (kapalı dalların altı dahil), derinlik öncelikli. */
  private readonly tumSatirlar: Record<Kaynak, UretilenSatir[]> = { ray: [], tren: [], makinist: [], sinyaller: [] };
  /** 🌳 PNL-A27: eklentinin işlediği son yerel dal geçişinin sayacı (webview'deki dal sayacının karşılığı). */
  private gorulenGec = 0;
  private readonly zamanlayicilar = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly dosyaOnbellegi = new Map<string, string | undefined>();
  private sayac = { belge: 0, parca: 0, yama: 0 };
  private hazirSayisi = 0;
  private sonKademe?: string;
  /** Eklentinin işlediği son kullanıcı sekme geçişinin sayacı (webview'deki geçiş sayacının karşılığı). */
  private gorulenGecis = 0;
  private readonly sekmeSecildi = new vscode.EventEmitter<SekmeKimligi>();
  readonly onSekmeSecildi = this.sekmeSecildi.event;
  /** Sınama kipinde webview'in sekme dizisi raporu (PNL-A18 nöbeti). */
  private sinamaRaporu?: unknown;
  /** Şeridin bugünkü sekme sırası (PNL-A23); ayardan okunur ve ayar değişince tazelenir. */
  private sira: SekmeKimligi[];
  private siraYazimi = 0;

  constructor(private readonly context: vscode.ExtensionContext, private readonly g: PanelGirdileri) {
    // Her açılış sıranın ilk sekmesiyle başlar; önceki oturumun sekmesi okunmaz (başlıktaki çizim kuralı).
    this.sira = sekmeSirasiOku();
    this.sekme = this.sira[0]!;
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
    abone(this.sekmeSecildi);
    if (g.sinyaller) abone(g.sinyaller.onDidChangeTreeData(() => {
      this.rozetiYaz();
      this.zamanla("sinyaller", () => this.agacTazele("sinyaller"));
    }));
    abone(g.makinist.onDidChangeTreeData(() => {
      this.rozetiYaz();
      this.zamanla("makinist", () => this.agacTazele("makinist"));
    }));
    abone(vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("sarmal.miniGraf")) this.zamanla("bolum", () => this.bolumGonder("ray"));
      if (e.affectsConfiguration(`sarmal.${SEKME_SIRASI_AYARI}`)) this.siraTazele();
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

  get seciliSekme(): SekmeKimligi { return this.sekme; }

  /** Ayar değişti: yeni sıra şeride iletilir; seçili sekme ve içerik değişmez. */
  private siraTazele(): void {
    const yeni = sekmeSirasiOku();
    if (ayniSira(yeni, this.sira)) return;
    this.sira = yeni;
    this.yaz({ tip: "sekmeSirasi", sira: this.sira });
  }

  /** Webview'de kurulan sıra kullanıcı ayarına yazılır; değişmeyen sıra yazılmaz. */
  private async siraYaz(ham: unknown): Promise<void> {
    if (!Array.isArray(ham)) return;
    const yeni = sekmeSirasiNormalle(ham, this.sira);
    if (ayniSira(yeni, this.sira)) return;
    this.sira = yeni;
    this.siraYazimi += 1;
    try {
      await vscode.workspace.getConfiguration("sarmal").update(SEKME_SIRASI_AYARI, yeni, vscode.ConfigurationTarget.Global);
    } catch { /* ayar yazılamazsa sıra yalnız bu oturumda kalır */ }
  }

  /** Sırayı paketin varsayılanına döndürür: kullanıcı ayarı silinir, şerit ayar olayıyla yeniden dizilir. */
  async siraSifirla(): Promise<void> {
    await vscode.workspace.getConfiguration("sarmal").update(SEKME_SIRASI_AYARI, undefined, vscode.ConfigurationTarget.Global);
    this.siraTazele();
  }

  olcumler(): PanelOlcumleri {
    const satirSayisi = kaynakMi(this.sekme) ? this.sonSatirlar[this.sekme].length : 0;
    const bag = /href="(command:sarmal\.dosyaAc\?[^"]*)"/.exec(this.sonGraf)?.[1];
    const k = bag ? grafKomutu(bag.replace(/&amp;/g, "&")) : undefined;
    return {
      sekme: this.sekme, sekmeSirasi: [...this.sira], siraYazimi: this.siraYazimi, satirSayisi, ...this.sayac, kardesVar: this.kardesVar,
      grafCizim: this.g.yol.miniGraf.cizimSayisi, grafSebepler: [...this.g.yol.miniGraf.cizimSebepleri], grafGorunum: this.g.yol.miniGraf.cizilenGorunum,
      grafIlkBag: k ? { dosya: String(k.argumanlar[0]), satir: Number(k.argumanlar[1]) } : undefined,
      hazir: this.hazirSayisi,
      onayKademesi: this.sonKademe,
      onayAcik: this.g.makinist.onay?.acikKapi(),
      sinyaller: this.g.sinyaller ? this.sinyalOlcumu(this.g.sinyaller) : undefined,
    };
  }

  /** Sinyaller ağacının çizim ölçüsü: sayılar ile "her tanı bir kez" nöbetinin girdisi. */
  private sinyalOlcumu(a: SinyallerAgaci): NonNullable<PanelOlcumleri["sinyaller"]> {
    const cizilen = this.sonSatirlar.sinyaller.flatMap((u) => a.sinyalKaydi(u.oge) ?? []);
    return { ...a.sayilar, cizilenSatir: cizilen.length, tekilKayit: new Set(cizilen.map((s) => s.kayit)).size };
  }

  /** Sınama kipinin eylemleri (SINAMA_KOMUTU). */
  private async sinamaEylemi(ham: unknown): Promise<unknown> {
    const e = (ham ?? {}) as { eylem?: unknown; ileti?: unknown; metin?: unknown };
    if (e.eylem === "grafTikla") { this.yaz({ tip: "sinamaTikla" }); return this.olcumler().grafIlkBag; }
    // Webview'e en son gönderilen Mini Graf çizimi verilen metni taşıyor mu (PNL-A14 nöbeti).
    if (e.eylem === "grafIcerir") return typeof e.metin === "string" && this.sonGraf.includes(e.metin);
    if (e.eylem === "ileti") { await this.iletiyiIsle(e.ileti); return true; }
    // PNL-A18: webview şeritteki sekmelere sırayla tıklar ve her geçişi kaydeder; rapor sonra okunur.
    if (e.eylem === "sekmeDizisi") {
      const d = ham as { sira?: unknown; aralik?: unknown };
      this.sinamaRaporu = undefined;
      if (!this.gorunum) return false;
      return this.gorunum.webview.postMessage({ tip: "sinamaSekmeDizisi", sira: d.sira, aralik: d.aralik });
    }
    if (e.eylem === "sekmeRaporu") return this.sinamaRaporu;
    // 🌳 PNL-A27: webview verilen satırın açma okuna kısa bir gecikmeden sonra gerçek tıklama gönderir ve
    // hemen ardından satırın durumunu ve dalın görünen çocuklarını raporlar (eklenti o sırada kilitli olabilir).
    if (e.eylem === "dalAc") {
      const d = ham as { id?: unknown; aralik?: unknown };
      this.sinamaRaporu = undefined;
      if (!this.gorunum) return false;
      return this.gorunum.webview.postMessage({ tip: "sinamaDalAc", id: d.id, aralik: d.aralik });
    }
    // 🌳 PNL-A27: bir ağacın görünen satırları ve her birinin önden gelen çocuk sayısı (nöbet ölçüsü).
    if (e.eylem === "gorunenSatirlar") {
      const k = (ham as { kaynak?: unknown }).kaynak;
      if (k !== "ray" && k !== "tren" && k !== "makinist" && k !== "sinyaller") return [];
      const tum = this.tumSatirlar[k];
      return this.sonSatirlar[k].map((u) => ({
        id: u.satir.id, derinlik: u.satir.derinlik, durum: u.satir.durum,
        onden: tum.filter((x) => x.satir.id.startsWith(`${u.satir.id}/`) && x.satir.derinlik === u.satir.derinlik + 1).length,
      }));
    }
    // 🌳 PNL-A27: bir dalın eklentideki durumu ve son çizimin bütün satır sayısı (nöbet ölçüsü).
    if (e.eylem === "dalDurumu") {
      const d = ham as { id?: unknown };
      const id = typeof d.id === "string" ? d.id : "";
      const k = this.harita.get(id)?.kaynak;
      return { acik: this.acik[id], kaynak: k, gorulenGec: this.gorulenGec, tum: k ? this.tumSatirlar[k].length : 0, gorunen: k ? this.sonSatirlar[k].length : 0 };
    }
    // PNL-A23: webview şeritte bir sekmeyi gerçek sürükleme olaylarıyla başka bir sekmenin önüne ya da
    // arkasına bırakır; şeridin durumu (sıra, seçili sekme, görünen kap, rozetler) rapor olarak döner.
    if (e.eylem === "sekmeSurukle") {
      const d = ham as { ad?: unknown; hedef?: unknown; once?: unknown };
      this.sinamaRaporu = undefined;
      if (!this.gorunum) return false;
      return this.gorunum.webview.postMessage({ tip: "sinamaSurukle", ad: d.ad, hedef: d.hedef, once: d.once === true });
    }
    if (e.eylem === "seritDurumu") {
      this.sinamaRaporu = undefined;
      if (!this.gorunum) return false;
      return this.gorunum.webview.postMessage({ tip: "sinamaSerit" });
    }
    // Pencerenin yeniden yüklenmesinin panel ayağı: sıra ayardan okunur, seçim sıranın ilk sekmesine
    // döner ve belge baştan yazılır (yapıcının açılış yolunun aynısı).
    if (e.eylem === "yenidenAc") {
      this.sira = sekmeSirasiOku();
      this.sekmeyiYaz(this.sira[0]!);
      await this.sekmeBaglami();
      if (this.gorunum) { this.gorunum.webview.html = this.tamHtml(this.gorunum.webview.cspSource); this.sayac.belge += 1; }
      return this.sekme;
    }
    // PNL-A09: Sinyaller ağacının bütün çizili satırları (kimlik, kademe, açık-kapalı) ve tanı satırlarının dosya bağları.
    if (e.eylem === "sinyalAgaci") {
      return this.sonSatirlar.sinyaller.map((u) => ({ id: u.satir.id, derinlik: u.satir.derinlik, durum: u.satir.durum, etiket: u.satir.etiket }));
    }
    if (e.eylem === "sinyalSatirlari") {
      return [...this.harita].filter(([, v]) => v.kaynak === "sinyaller").flatMap(([id, v]) => {
        const k = this.g.sinyaller?.sinyalKaydi(v.u.oge);
        return k ? [{ id, kod: k.kayit.tani.kod, dosya: k.kayit.dosya, satir: k.kayit.tani.satir, bant: k.bant, maddeler: [...k.maddeler], komutlu: v.u.satir.komutlu }] : [];
      });
    }
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

  /**
   * Eklentinin seçtirdiği sekme (bölüm komutu, onay kapısı, durum çubuğu sayacı). İçerik webview'de
   * hazırdır; webview'e yalnız seçim gider. İleti eklentinin o ana kadar işlediği kullanıcı geçişinin
   * sayacını taşır: webview'de eklentiye henüz ulaşmamış daha yeni bir geçiş varsa seçim uygulanmaz ve
   * o geçiş eklentiye ulaşınca son söz onun olur. Görünüm henüz çözülmemişse ilk belge bu sekmeyle üretilir.
   */
  async sekmeSec(s: SekmeKimligi): Promise<void> {
    this.sekmeyiYaz(sekmeNormalle(s));
    this.yaz({ tip: "sekmeSec", ad: this.sekme, n: this.gorulenGecis });
    await this.sekmeBaglami();
  }

  /** Seçili sekmenin TEK yazım yolu (PNL-A18): webview geçişi de eklentinin seçimi de buradan geçer. */
  private sekmeyiYaz(s: SekmeKimligi): void {
    this.sekme = s;
    if (s === "tren") this.kardesiYokla();
    this.sekmeSecildi.fire(s);
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
    // Sinyaller sekmesinin yanında Dur ve Dikkat sayıları (PNL-A09).
    this.yaz({ tip: "sinyalRozet", ...this.sinyalRozeti() });
  }

  private sinyalRozeti(): { dur: number; dikkat: number } {
    const s = this.g.sinyaller?.sayilar;
    return { dur: s?.dur ?? 0, dikkat: s?.dikkat ?? 0 };
  }

  // ── Kardeş Tren eklentisi ───────────────────────────────────────────────────

  /** Kardeş Tren eklentisi `sarmal.tren.kardesAc` komutunu kaydeder; varlığı kardeşin varlığıdır. */
  private kardesiYokla(): void {
    void Promise.resolve(vscode.commands.getCommands?.(true)).then((komutlar) => {
      const var_ = Array.isArray(komutlar) && komutlar.includes(TREN_KARDES_KOMUTU);
      if (var_ === this.kardesVar) return;
      this.kardesVar = var_;
      this.zamanla("tren", () => this.agacTazele("tren"));
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
    // Yeni belgenin geçiş sayacı sıfırdan başlar; beş sekmenin bölümü birlikte üretilir (PNL-A18).
    this.gorulenGecis = 0;
    this.gorulenGec = 0;
    const bolumler = Object.fromEntries(SEKMELER.map((s) => [s, this.bolumUret(s)])) as Record<SekmeKimligi, SekmeBolumu>;
    return panelHtml({
      sekme: this.sekme, bolumler, simgeler: this.simgeler(), sira: this.sira,
      nonce: randomBytes(16).toString("base64"), cspSource, rozet: this.g.makinist.rozetSayisi, sinyalRozeti: this.sinyalRozeti(),
    });
  }

  private kaynak(k: Kaynak): AgacKaynagi {
    if (k === "sinyaller") return (this.g.sinyaller as unknown as AgacKaynagi | undefined) ?? BOS_KAYNAK;
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

  /**
   * Bir kaynağın satırlarını üretir ve kimlik haritasını yeniler. Kapalı dalların altı da üretilir ve
   * haritaya girer (PNL-A27): webview'de anında açılan dalın satırına tıklama da çözülür. Dönen
   * `satirlar` görünen satırlardır; çizim kapalı dalların altını şablona koyar.
   */
  private agacUret(k: Kaynak): { satirlar: UretilenSatir[]; html: string; ikonStili: string } {
    const defter = new IkonDefteri();
    const tum = satirlariUret(this.kaynak(k), this.secenekler(k, defter));
    for (const [id, v] of [...this.harita]) if (v.kaynak === k) this.harita.delete(id);
    for (const o of [...this.ogeKimligi]) if (o[1].startsWith(`${k}/`)) this.ogeKimligi.delete(o[0]);
    for (const u of tum) { this.harita.set(u.satir.id, { kaynak: k, u }); this.ogeKimligi.set(u.oge, u.satir.id); }
    // Makinist: kapı satırı açılıp kapanan bir satır gibi çizilir; açık kapının karar kademesi hemen altına basılır.
    const kademeler = new Map<string, string>();
    if (k === "makinist") {
      this.sonKademe = undefined;
      for (const u of tum) {
        const kapi = this.kapiArgumanlari(u.item);
        if (!kapi) continue;
        const kademe = this.g.makinist.onay?.kademeHtml(kapi.dosya, kapi.kod);
        u.satir.durum = kademe ? "acik" : "kapali";
        if (!kademe) continue;
        this.sonKademe = u.satir.id;
        kademeler.set(u.satir.id,
          `<div class="kademe" role="group" aria-label="${kacir(u.satir.etiket)}" style="--d:${u.satir.derinlik}" data-kapi="${kacir(u.satir.id)}">${kademe}</div>`);
      }
    }
    this.tumSatirlar[k] = tum;
    const satirlar = gorunurSatirlar(tum);
    this.sonSatirlar[k] = satirlar;
    const html = satirlarHtml(tum.map((x) => x.satir), kademeler.size ? (s) => kademeler.get(s.id) ?? "" : undefined);
    return { satirlar, html, ikonStili: defter.stil() };
  }

  /**
   * 🌳 PNL-A27 · webview dalı kendisi açtı ya da kapattı: durum kaydedilir, son çizimin satırı ve
   * görünen satırlar güncellenir; hiçbir çizim gönderilmez.
   */
  private yerelDalGecisi(k: Kaynak, id: string, ac: boolean): void {
    this.acik[id] = ac;
    this.acikKaydet();
    const u = this.tumSatirlar[k].find((x) => x.satir.id === id);
    if (u && u.satir.durum !== "yaprak") u.satir.durum = ac ? "acik" : "kapali";
    this.sonSatirlar[k] = gorunurSatirlar(this.tumSatirlar[k]);
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
    if (!this.gorunum) return;
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

  /** Bir sekmenin tam içeriği. */
  private bolumUret(s: SekmeKimligi): SekmeBolumu {
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
    if (s === "sinyaller") {
      const a = this.agacUret("sinyaller");
      return { html: sinyallerBolumuHtml(a.html, this.g.sinyaller?.bos ?? true), ikonStili: a.ikonStili };
    }
    if (!kaynakMi(s)) return { html: bosSekmeHtml(s), ikonStili: "" };
    const a = this.agacUret("makinist");
    return { html: makinistBolumuHtml(a.html), ikonStili: a.ikonStili };
  }

  private yaz(m: unknown): void {
    if (!this.gorunum) return;
    void Promise.resolve(this.gorunum.webview.postMessage(m)).catch(() => undefined);
  }

  /**
   * Bir sekmenin bölümünü baştan gönderir; sekme verilmezse beşini de (yeniden görünme). İleti
   * webview'de yalnız kendi sekmesinin kabını yazar ve seçili sekmeyi değiştirmez (PNL-A18).
   */
  private bolumGonder(s?: SekmeKimligi): void {
    if (!this.gorunum) return;
    if (!this.gorunum.visible) { this.kirli = true; return; }
    for (const sekme of s ? [s] : SEKMELER) {
      const b = this.bolumUret(sekme);
      this.sayac.parca += 1;
      this.yaz({ tip: "bolum", sekme, html: b.html, ikonStili: b.ikonStili, gec: this.gorulenGec });
    }
  }

  /**
   * Ağaç parçasını yeniden çizer; Yol Haritası boş-durum geçişinde bölümün tamamı gönderilir. Seçili
   * sekme ne olursa olsun çizilir: bütün bölümler webview'de güncel durur (PNL-A18).
   */
  private agacTazele(k: Kaynak): void {
    if (!this.gorunum) return;
    if (!this.gorunum.visible) { this.kirli = true; return; }
    if (k === "ray" && (this.g.yol.saglayici.bosMesaj() !== undefined) !== this.sonBos) { this.bolumGonder("ray"); return; }
    if (k === "tren") { this.bolumGonder("tren"); return; }   // boş durum ve kardeş bağlantısı aynı bölümdedir
    if (k === "sinyaller") { this.bolumGonder("sinyaller"); return; }   // boş durum cümlesi aynı bölümdedir
    const a = this.agacUret(k);
    this.sayac.parca += 1;
    this.yaz({ tip: "parca", sekme: k, kimlik: KIMLIK_PARCASI[k], html: a.html, ikonStili: a.ikonStili, gec: this.gorulenGec });
  }

  private grafCiz(): void {
    if (!this.gorunum || !this.grafAcik()) return;
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
    this.yaz({ tip: "parca", sekme: "ray", kimlik: "graf", html });
  }

  /** Yalnız bir satırı ilgilendiren değişim: satır yeniden kurulur ve yamalanır. */
  private satirYama(k: Kaynak, oge: unknown): void {
    if (!this.gorunum || !this.gorunum.visible) return;
    const id = this.ogeKimligi.get(oge);
    if (!id) return;
    const eski = this.harita.get(id);
    if (!eski) return;
    const defter = new IkonDefteri();
    const yeni = satirKur(this.kaynak(k), oge, id, eski.u.satir.derinlik, this.secenekler(k, defter));
    this.harita.set(id, { kaynak: k, u: yeni });
    for (const dizi of [this.sonSatirlar[k], this.tumSatirlar[k]]) {
      const i = dizi.findIndex((x) => x.satir.id === id);
      if (i >= 0) dizi[i] = yeni;
    }
    this.sayac.yama += 1;
    this.yaz({ tip: "satir", sekme: k, id, html: satirHtml(yeni.satir), ikonStili: defter.stil(), gec: this.gorulenGec });
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
      this.bolumGonder("ray");
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
        // Kullanıcı sekmeyi webview'de değiştirdi ve içerik orada zaten görünüyor (PNL-A18). Eklenti
        // seçimi yalnız kaydeder; hiçbir içerik göndermez ve yanıt beklenmez.
        if (!(SEKMELER as readonly unknown[]).includes(m.ad)) return;
        if (typeof m.n === "number" && m.n > this.gorulenGecis) this.gorulenGecis = m.n;
        this.sekmeyiYaz(m.ad as SekmeKimligi);
        await this.sekmeBaglami();
        return;
      }
      case "gec": {
        if (!kayit || typeof m.ac !== "boolean") return;
        // 🌳 PNL-A27: dal webview'de zaten açıldı ya da kapandı; eklenti yalnız kaydeder ve yanıt göndermez.
        if (m.yerel === true) {
          if (typeof m.n === "number" && m.n > this.gorulenGec) this.gorulenGec = m.n;
          this.yerelDalGecisi(kayit.kaynak, id, m.ac);
          // Açılan dalın kapalı çocukları için bir kademe daha önden veri gider; çizim geciktirilir ve
          // kullanıcının açtığı dal webview'de zaten açık olduğundan beklenmez.
          if (m.ac) this.zamanla(kayit.kaynak, () => this.agacTazele(kayit.kaynak));
          return;
        }
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
      case "sekmeSirasi": { await this.siraYaz(m.sira); return; }
      case "hazir": { this.hazirSayisi += 1; return; }
      case "sinamaRapor": { this.sinamaRaporu = m.kayitlar; return; }
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
    // Sekme sırasını paketin varsayılanına döndürür (PNL-A23).
    vscode.commands.registerCommand(SEKME_SIRASI_SIFIRLA_KOMUTU, () => panel.siraSifirla()),
    vscode.window.registerWebviewViewProvider(GORUNUS_PANEL, panel, { webviewOptions: { retainContextWhenHidden: true } }),
    // Gözlemler sayacı (durum çubuğu) ve öteki yollar Sinyaller sekmesine buradan gider (PNL-A09).
    vscode.commands.registerCommand(SINYALLER_ODAK_KOMUTU, () => panel.sekmeSecVeOdakla("sinyaller")),
  );
  return panel;
}

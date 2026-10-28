// ═══════════════════════════════════════════════════════════════════════════
// tren-yuvasi.ts — 🔌 TREN SEKMESİNİN CANLI YUVASI (PNL-A13 · OZK-13 DÖRDÜNCÜSÜ)
//
//   Founder 2026-10-27: canlı ajan şeması, ajanlar arası mesaj akışı ve
//   geliştiriciler arası mesajlaşma kapalı kardeş eklentide yaşar ve bu depoya
//   yazılmaz. Açık eklentinin Tren sekmesi yalnız planda ilan edilmiş olanı
//   gösterir ve kardeş eklentinin takılacağı YUVAYI sunar. Bu dosya o yuvadır:
//   kardeş eklentinin ne göstereceğini bilmez, yalnız gösterilecek yeri, iletinin
//   biçimini ve sahipliği yönetir.
//
//   ── SÖZLEŞME (sürüm 1) ────────────────────────────────────────────────────
//
//   Açık eklenti `activate` dönüşünde `trenYuvasiAl(surum)` işlevini verir.
//   Kardeş eklenti şöyle kullanır:
//
//     const sarmal = vscode.extensions.getExtension("nexivion-labs.sarmal");
//     const yuz = await sarmal?.activate();
//     const yuva = yuz?.trenYuvasiAl?.(1);           // bilinmeyen sürümde undefined
//     if (yuva) {
//       const canli = yuva.canliKaydet({
//         html: "<p>…</p>",                          // ilk gövde (isteğe bağlı)
//         eylem: (e) => { … e.eylem, e.deger … },    // gövdedeki data-eylem tıklamaları
//       });
//       context.subscriptions.push(canli);           // eklenti kapanınca yuva boşalır
//       canli.guncelle("<p>…</p>");                  // gövdeyi istediği an yeniler
//       canli.gorunurlukDegisti((acik) => { … });    // görünürken akıt, gizliyken dur
//     }
//
//   Kayıt olunca Tren sekmesinin üstünde "Plan | Canlı" seçicisi belirir; Canlı
//   görünümü kardeşin gövdesini gösterir. Kardeş yoksa seçici hiç çizilmez ve
//   sekme açık yüzüyle (ajan şeması, profil kartı, geliştirmedeki iş) çalışır.
//   Kayıt serbest bırakılınca seçici kalkar ve sekme Plan görünümüne döner.
//
//   GÖVDE KURALLARI. Gövde düz HTML metnidir; panelin belgesine HAM yazılmaz:
//   kaçırılmış metin olarak taşınır ve Canlı kabının kendi gölge kökünde açılır.
//   Bu yüzden gövdenin kimlikleri ve stilleri paneli etkilemez, panelin stilleri
//   de gövdeye sızmaz; gövde tema değişkenlerini (`var(--vscode-…)`) kullanabilir.
//   Gövdedeki betikler çalışmaz (gölge köke yazılan betik çalıştırılmaz ve panelin
//   içerik güvenlik ilkesi satır içi olay işleyicilerini engeller). Etkileşim tek
//   yoldan yürür: `data-eylem` niteliği taşıyan bir öğeye tıklanınca kardeşin
//   `eylem` işlevi `{ eylem, deger }` ile çağrılır (`deger`, öğenin `data-deger`
//   niteliğidir); kardeş yeni gövdeyi `guncelle` ile gönderir. Gövde en çok
//   CANLI_GOVDE_SINIRI karakterdir; aşan gövde `Error` fırlatır.
//
//   GÖRÜNÜRLÜK. `gorunurMu`, panel görünür, Tren sekmesi seçili ve Canlı görünümü
//   seçiliyken doğrudur; değişince `gorunurlukDegisti` ateşlenir. Kardeş görünür
//   değilken akışı durdurabilir.
//
//   🛡️ GÜVENLİK VE SAHİPLİK (bölüm yuvasıyla aynı ilkeler · bolum-yuvasi.ts):
//   · Görünümü yalnız kullanıcı seçer. Kardeş Canlı görünümünü öne alamaz ve
//     paneli seçtiremez; kayıt yalnız seçeneği ekler.
//   · Aynı anda tek kayıt vardır; ikinci kayıt anlaşılır bir `Error` fırlatır.
//   · Kaydı yapan eklenti çağrı yığınından ölçülür (bolum-cekirdek.ts
//     `sahibiBul`); sahibi okunamayan kayıt reddedilir. Seçicinin ipucu sahibin
//     görünen adını taşır. Sahibi devre dışı kalan kayıt düşer.
//   · Bütün eklentiler aynı süreçte tam yetkiyle koşar; sahiplik ölçümü dürüst
//     sahiplik içindir, kötü niyetli bir eklentiye karşı güvenlik sınırı değildir.
//
//   Bu dosya kapalı tarafın hiçbir adını, mimarisini ya da iletisini taşımaz:
//   sözleşme genel bir "HTML gövde + eylem" yuvasıdır.
// ═══════════════════════════════════════════════════════════════════════════

import * as vscode from "vscode";
import { realpathSync } from "node:fs";
import { sahibiBul, yiginDosyalari, type EklentiKoku } from "./bolum-cekirdek.ts";
import { TREN_METINLERI } from "./yuzey-metinleri.ts";

/** Arayüzün bugünkü sürümü. Kırıcı değişiklik yeni bir sürüm numarası doğurur. */
export const TREN_YUVASI_SURUMU = 1;
/** Canlı gövdenin en büyük boyu (karakter). */
export const CANLI_GOVDE_SINIRI = 1_000_000;
/** Eylem iletisinin alanlarının en büyük boyu (karakter); webview'den gelen değer güvenilmez. */
const EYLEM_SINIRI = 200;
const DEGER_SINIRI = 2_000;

/** Gövdedeki `data-eylem` tıklaması. */
export interface CanliEylemi { eylem: string; deger?: string }

/** Kardeşin Canlı görünümü tanımı (sürüm 1). */
export interface CanliTanimi {
  /** İlk gövde (düz HTML metni). */
  html?: string;
  /** Gövdedeki `data-eylem` tıklamalarının alıcısı. */
  eylem?(e: CanliEylemi): void;
}

/** Kayıt: serbest bırakılınca yuva boşalır. */
export interface CanliKaydi extends vscode.Disposable {
  /** Gövdeyi yeniler; yalnız Canlı kabı yeniden yazılır. */
  guncelle(html: string): void;
  /** Panel görünür, Tren seçili ve Canlı görünümü seçili mi? */
  readonly gorunurMu: boolean;
  readonly gorunurlukDegisti: vscode.Event<boolean>;
}

/** Kardeş eklentiye verilen yüz (sürüm 1). */
export interface TrenYuvasiV1 {
  readonly surum: 1;
  canliKaydet(tanim: CanliTanimi): CanliKaydi;
}

/** Nöbetin okuduğu salt okur ölçüm. */
export interface TrenYuvasiOlcumleri {
  var: boolean;
  sahip?: string;
  gorunur: boolean;
  guncelleme: number;
  eylem: number;
}

interface Kayit {
  tanim: CanliTanimi;
  sahip: EklentiKoku;
  html: string;
  gorunur: boolean;
  olay: vscode.EventEmitter<boolean>;
  dusur: () => void;
}

function gercekYol(yol: string): string {
  try { return realpathSync.native(yol); } catch { return yol; }
}

function gorunenAd(e: vscode.Extension<unknown>): string {
  const pj = e.packageJSON as { displayName?: unknown } | undefined;
  return typeof pj?.displayName === "string" && !/^%.*%$/.test(pj.displayName) ? pj.displayName : e.id;
}

/** Gövde denetimi: metin olmalı ve sınırı aşmamalı. */
function govdeDenetle(html: unknown): string {
  if (html === undefined) return "";
  if (typeof html !== "string") throw new Error(TREN_METINLERI.canliReddi("govde-tur"));
  if (html.length > CANLI_GOVDE_SINIRI) throw new Error(TREN_METINLERI.canliReddi("govde-buyuk"));
  return html;
}

/**
 * Tren yuvasının kabuğu. Panel `degisti` olayını dinler: "kayit" olayında Tren bölümünü yeniden
 * çizer, "govde" olayında yalnız Canlı kabına yeni gövdeyi gönderir.
 */
export class TrenYuvasi implements vscode.Disposable {
  private kayit?: Kayit;
  private readonly olay = new vscode.EventEmitter<"kayit" | "govde">();
  readonly degisti = this.olay.event;
  private sayac = { guncelleme: 0, eylem: 0 };
  private readonly kendiKok: string;

  private readonly sahipOku: () => EklentiKoku | undefined;

  constructor(kendiKok: string, sahipOku?: () => EklentiKoku | undefined) {
    this.kendiKok = gercekYol(kendiKok);
    this.sahipOku = sahipOku ?? (() => this.yigindanSahip());
  }

  private yigindanSahip(): EklentiKoku | undefined {
    const eklentiler = vscode.extensions.all.map((e) => ({ kimlik: e.id, ad: gorunenAd(e), kok: gercekYol(e.extensionPath) }));
    return sahibiBul(yiginDosyalari().map(gercekYol), eklentiler, this.kendiKok);
  }

  /** Kayıtlı bir Canlı görünümü var mı? */
  canliVar(): boolean { return this.kayit !== undefined; }
  /** Canlı görünümünün gövdesi (yoksa boş). */
  canliHtml(): string { return this.kayit?.html ?? ""; }
  /** Seçicinin ipucu: sahibin görünen adı. */
  canliIpucu(): string { return this.kayit ? TREN_METINLERI.canliIpucu(this.kayit.sahip.ad) : ""; }

  /** Panelin hesapladığı görünürlüğü yazar; değişince kardeşe bildirilir. */
  gorunurlukYaz(gorunur: boolean): void {
    const k = this.kayit;
    if (!k || k.gorunur === gorunur) return;
    k.gorunur = gorunur;
    k.olay.fire(gorunur);
  }

  /** Webview'deki `data-eylem` tıklaması kardeşe iletilir; kardeşin hatası panelin sınırında kalır. */
  eylem(ham: unknown): void {
    const k = this.kayit;
    const m = (ham ?? {}) as { eylem?: unknown; deger?: unknown };
    if (!k || typeof m.eylem !== "string" || !m.eylem || m.eylem.length > EYLEM_SINIRI) return;
    const e: CanliEylemi = { eylem: m.eylem };
    if (typeof m.deger === "string") e.deger = m.deger.slice(0, DEGER_SINIRI);
    this.sayac.eylem += 1;
    try { k.tanim.eylem?.(e); } catch { /* kardeşin hatası panelin işleyişini bozmaz */ }
  }

  /** Sahibi devre dışı kalan kayıt düşer (eklenti listesi değişince çağrılır). */
  sahipsiziDusur(canli: ReadonlySet<string> = new Set(vscode.extensions.all.map((e) => e.id))): boolean {
    if (!this.kayit || canli.has(this.kayit.sahip.kimlik)) return false;
    this.kayit.dusur();
    return true;
  }

  private kaydet(tanim: CanliTanimi): CanliKaydi {
    if (this.kayit) throw new Error(TREN_METINLERI.canliReddi("dolu"));
    const html = govdeDenetle(tanim?.html);
    const sahip = this.sahipOku();
    if (!sahip) throw new Error(TREN_METINLERI.canliReddi("sahip-yok"));
    const olay = new vscode.EventEmitter<boolean>();
    const k: Kayit = { tanim: tanim ?? {}, sahip, html, gorunur: false, olay, dusur: () => undefined };
    this.kayit = k;
    let birakildi = false;
    k.dusur = () => {
      if (birakildi) return;
      birakildi = true;
      if (this.kayit === k) this.kayit = undefined;
      olay.dispose();
      this.olay.fire("kayit");
    };
    this.olay.fire("kayit");
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const yuva = this;
    return {
      guncelle(yeni: string) {
        if (birakildi) return;
        k.html = govdeDenetle(yeni);
        yuva.sayac.guncelleme += 1;
        yuva.olay.fire("govde");
      },
      get gorunurMu() { return !birakildi && k.gorunur; },
      gorunurlukDegisti: olay.event,
      dispose: () => k.dusur(),
    };
  }

  al(surum: number): TrenYuvasiV1 | undefined {
    if (surum !== TREN_YUVASI_SURUMU) return undefined;
    return { surum: 1, canliKaydet: (tanim) => this.kaydet(tanim) };
  }

  olcumler(): TrenYuvasiOlcumleri {
    return { var: this.canliVar(), sahip: this.kayit?.sahip.kimlik, gorunur: this.kayit?.gorunur ?? false, ...this.sayac };
  }

  dispose(): void {
    this.kayit?.dusur();
    this.olay.dispose();
  }
}

/** Yuvayı kurar; sahibi devre dışı kalan kayıt düşer. */
export function trenYuvasiKaydi(context: vscode.ExtensionContext): TrenYuvasi {
  const yuva = new TrenYuvasi(context.extensionPath);
  context.subscriptions.push(yuva, vscode.extensions.onDidChange(() => yuva.sahipsiziDusur()));
  return yuva;
}

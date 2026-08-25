// ═══════════════════════════════════════════════════════════════════════════
// minigraf.ts — 🕸️ MİNİ GRAF görünümü (vscode kabuğu)
//
//   Yol Haritasının altında yaşayan tek proje grafı. Saklı Dag'ı saf çekirdeğe
//   verir; panel/editör seçimi yalnız ilgili satırı işaretler, grafı daraltmaz.
//   Betik yoktur; düğüm tıklaması mevcut sarmal.dosyaAc kapısından kaynağa atlar.
//
//   GRAF ODAKTAKİ VARLIĞI GÖSTERİR (Founder hükmü 2026-07-28). Bugüne kadar
//   iki kusur vardı ve ikisi de kullanıcının gördüğü şeyle ilgiliydi: görünüm
//   aldığı grafı süzmüyordu, dolayısıyla bir Sarmal dosyasına bakarken
//   kapalı ürün düğümleri de basılıyordu; ve odak değişimini dinlemiyordu,
//   dolayısıyla başka bir varlığa geçilince donmuş kalıyordu. Onarım ikinci bir
//   mekanizma icat etmez: Hatırlatıcılar ile Bildirimler yüzeylerinin kullandığı
//   ODAK KAPISI buraya da bağlanır, süzgeç aynı süzgeçtir ve tazeleme aynı
//   olaydan doğar. Üç yüzey ile graf böylece kapsam konusunda birbiriyle
//   anlaşır; biri bir varlığı gizlerken öteki onu göstermeye devam edemez.
// ═══════════════════════════════════════════════════════════════════════════

import * as vscode from "vscode";
import type { Dag } from "../../cekirdek/src/dag.ts";
import { projeGrafiCikar, miniGrafHtml, bosHtml } from "./minigraf-cekirdek.ts";
import { MINI_GRAF_METINLERI } from "./yuzey-metinleri.ts";

/**
 * Aktif varlık odağının tek kapısı. Eklenti gövdesi bu kapıyı kurar ve üç tanı
 * yüzeyiyle PAYLAŞIR; kapsam kararı da odak olayı da orada tek yerde yaşar.
 */
export interface OdakKapisi {
  /** Bir dosyanın bugünkü odakta panelde görünüp görünmediği. */
  kapsamda(dosya: string): boolean;
  /** Odak (ya da odak ayarı) değiştiğinde çağrılacak dinleyiciyi kaydeder. */
  degisince(dinleyici: () => void): void;
}

/** Odak kapısı verilmediğinde her şey kapsamdadır — davranış bugünküyle aynı kalır. */
const TUM_KAPSAM: OdakKapisi = { kapsamda: () => true, degisince: () => { /* olay yok */ } };

/**
 * MEYVE KAPISI (VIT-GRAF-A12) — odak kapısının kardeşi. Bir Adım'ın `üretir` ile
 * BEYAN ettiği teslim yolunun diskte gerçekten var olup olmadığını söyler; graf
 * beyan ile gerçeğin farkını buradan öğrenir. Kabuk YENİ TARAMA AÇMAZ: kapının
 * arkasında tıklanır yolların bugünkü çözümü (`baglanti.ts` · yolCozumleyici)
 * yaşar, ikinci bir yol çözümü kurulmaz — iki çözüm olsaydı aynı yol için iki
 * yüzey çelişkili cevap verebilirdi.
 */
export interface MeyveKapisi {
  /** Beyan edilen teslim yolunun diskte karşılığı var mı? */
  var(beyanYolu: string): boolean;
}

/** Meyve kapısı verilmediğinde her beyan doğru sayılır — boş cam çizilmez. */
const TUM_MEYVE: MeyveKapisi = { var: () => true };

export class MiniGrafGorunumu implements vscode.WebviewViewProvider {
  static readonly GORUNUM_ID = "sarmalMiniGraf";
  private gorunum?: vscode.WebviewView;
  private kod = "";
  /** Kaç kez çizildiği — odak nöbeti tazelemeyi buradan ölçer. */
  private cizimSayaci = 0;

  constructor(private dagAl: () => Dag | undefined,
              private odak: OdakKapisi = TUM_KAPSAM,
              private meyve: MeyveKapisi = TUM_MEYVE) {
    // Odak değişimi grafı TAZELER: aynı olay üç tanı yüzeyini de yeniden basar.
    this.odak.degisince(() => this.ciz());
  }

  resolveWebviewView(gorunum: vscode.WebviewView): void {
    this.gorunum = gorunum;
    gorunum.webview.options = { enableScripts: false, enableCommandUris: true };
    gorunum.onDidChangeVisibility(() => { if (gorunum.visible) this.ciz(); });
    this.ciz();
  }

  /** Seçim yalnız odağı değiştirir; odaktaki varlığın tamamı görünür kalır. */
  dugumSec(kod: string): void {
    if (!kod || kod === this.kod) return;
    this.kod = kod;
    this.ciz();
  }

  /** Graf yeniden kuruldu — saklı yeni veriyle tek görünümü tazele. */
  tazele(): void { this.ciz(); }

  /** Bugüne kadar kaç çizim yapıldığı (nöbet ölçüsü; davranışa etkisi yoktur). */
  get cizimSayisi(): number { return this.cizimSayaci; }

  private ciz(): void {
    if (!this.gorunum || !this.gorunum.visible) return;
    const dag = this.dagAl();
    this.cizimSayaci += 1;
    this.gorunum.webview.html = dag
      ? miniGrafHtml(projeGrafiCikar(dag, this.kod,
          (dosya) => this.odak.kapsamda(dosya),
          (beyanYolu) => this.meyve.var(beyanYolu)))
      : bosHtml(MINI_GRAF_METINLERI.kuruluyor);
  }
}

/** Görünümü kaydeder; ayrı kip/komut yoktur. */
export function miniGrafKaydi(context: vscode.ExtensionContext,
                              dagAl: () => Dag | undefined,
                              odak: OdakKapisi = TUM_KAPSAM,
                              meyve: MeyveKapisi = TUM_MEYVE): MiniGrafGorunumu {
  const g = new MiniGrafGorunumu(dagAl, odak, meyve);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(MiniGrafGorunumu.GORUNUM_ID, g),
  );
  return g;
}

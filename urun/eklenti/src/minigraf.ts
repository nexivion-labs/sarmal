// ═══════════════════════════════════════════════════════════════════════════
// minigraf.ts — 🕸️ MİNİ GRAF görünümü (vscode kabuğu)
//
//   Sarmal panelinin Ray sekmesinde Yol Haritasının altında yaşayan tek proje grafı. Saklı Dag'ı saf çekirdeğe
//   verir; panel/editör seçimi yalnız ilgili satırı işaretler, grafı daraltmaz.
//   Çizici betiksizdir; düğüm tıklaması panelin komut köprüsünden sarmal.dosyaAc kapısına gider.
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
//
//   TUR GRAFI DEĞİŞTİRMEDİYSE ÇİZİM YOKTUR (PNL-A14). Her denetim turunun yayını
//   grafı yeniden kurar ve `tazele` ile buraya haber verir. Çizim ancak grafın
//   modeli son çizilen modelden farklıysa yapılır; aynıysa panel ne HTML üretir
//   ne de webview'e gönderir. Seçim, odak, görünüm ve dil değişimleri bu
//   karşılaştırmaya girmez, çünkü onlar çizimin kendisini değiştirir.
// ═══════════════════════════════════════════════════════════════════════════

import * as vscode from "vscode";
import type { Dag } from "../../cekirdek/src/dag.ts";
import { atlaHref, projeGrafiCikar, grafEsit, bosHtml, type ProjeGrafi } from "./minigraf-cekirdek.ts";
import {
  gorunumHtml, seciciHtml, gorunumNormalle, GORUNUM_AYARI, GORUNUM_SEC_KOMUTU, GORUNUM_KAPAT_KOMUTU,
  type GrafGorunumu,
} from "./minigraf-gorunum.ts";
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

export class MiniGrafGorunumu {
  private kod = "";
  /** Görünüm seçici kartları açık mı (başlık düğmesi açar, kart ya da Kapat kapatır). */
  private secici = false;
  /** Kaç kez çizildiği — odak nöbeti tazelemeyi buradan ölçer. */
  private cizimSayac = 0;
  /** Son çizimin görünümü (seçici açıkken "secici"); nöbet ölçüsüdür. */
  private sonGorunum = "";
  /** Son çizimlerin sebepleri (nöbet ölçüsü): çizimi isteyen olay; panelin kendi bölüm çizimi "panel"dir. */
  private bekleyenSebep = "";
  private readonly sebepler: string[] = [];
  /**
   * Son çizimin girdisi: çizilen model, o çizimdeki seçim ve görünüm (PNL-A14). Seçici kartları ya da
   * boş hâl çizildiyse tanımsızdır. Panel tur yayınından sonra yeni modeli buna karşı ölçer.
   */
  private cizilen?: { graf: ProjeGrafi; kod: string; gorunum: GrafGorunumu };
  /** Son çizimden beri tur yayınından başka bir değişim (seçim, odak, görünüm, dil) geldi mi. */
  private zorunlu = true;
  private readonly degistiOlayi = new vscode.EventEmitter<void>();
  /** Çizilecek içerik değiştiğinde ateşlenir; Sarmal paneli Ray sekmesindeyken HTML'i buradan ister. */
  readonly onDegisti = this.degistiOlayi.event;

  constructor(private dagAl: () => Dag | undefined,
              private odak: OdakKapisi = TUM_KAPSAM,
              private meyve: MeyveKapisi = TUM_MEYVE) {
    // Odak değişimi grafı TAZELER: aynı olay üç tanı yüzeyini de yeniden basar.
    this.odak.degisince(() => this.ciz("odak"));
  }

  /**
   * Seçimi çizmeden taşır (PNL-A05 · Ray satırına tıklama): grafı yeniden üretmez, düğümün
   * dosya bağını verir; panel işareti webview'de bu bağla taşır. Düğüm zaten seçiliyse ya da
   * grafta yoksa `undefined` döner. Sonraki her çizim bu seçimle yapılır.
   */
  isaretle(kod: string): string | undefined {
    if (!kod || kod === this.kod) return undefined;
    const d = this.dagAl()?.dugumler.get(kod);
    if (!d) return undefined;
    this.kod = kod;
    return atlaHref(d);
  }

  /** Seçim yalnız odağı değiştirir; odaktaki varlığın tamamı görünür kalır. */
  dugumSec(kod: string): void {
    if (!kod || kod === this.kod) return;
    this.kod = kod;
    this.ciz("secim");
  }

  /** Ayardaki görünüm; bozuk değer varsayılana (Ağaç) düşer. */
  private gorunumAyari(): GrafGorunumu {
    return gorunumNormalle(vscode.workspace.getConfiguration("sarmal").get(GORUNUM_AYARI));
  }

  /** Başlık düğmesi: seçici kartları açar, ikinci basış kapatır. */
  seciciDegistir(): void { this.secici = !this.secici; this.ciz("gorunum"); }

  /** Karta tıklama: ayarı yazar, seçiciyi kapatır, paneli o görünümle çizer. */
  async gorunumSec(deger: unknown): Promise<void> {
    this.secici = false;
    await vscode.workspace.getConfiguration("sarmal")
      .update(GORUNUM_AYARI, gorunumNormalle(deger), vscode.ConfigurationTarget.Global);
    this.ciz("gorunum");
  }

  seciciKapat(): void { if (this.secici) { this.secici = false; this.ciz("gorunum"); } }

  /**
   * Graf yeniden kuruldu (tur yayını). Abone haberdar edilir; çizim ise ancak grafın modeli son
   * çizilen modelden farklıysa yapılır (`guncelHtml` · PNL-A14).
   */
  tazele(): void { this.ciz("tazele"); }

  /** Çizimi koşulsuz yeniler: dil, görünüm ayarı ya da son çizimde görünmeyen bir düğümün seçimi. */
  yenidenCiz(sebep: string): void { this.ciz(sebep); }

  /** Bugüne kadar kaç çizim yapıldığı (nöbet ölçüsü; davranışa etkisi yoktur). */
  get cizimSayisi(): number { return this.cizimSayac; }
  /** Son çizimin görünümü (nöbet ölçüsü). */
  get cizilenGorunum(): string { return this.sonGorunum; }
  /** Son on çizimin sebepleri, eskiden yeniye (nöbet ölçüsü). */
  get cizimSebepleri(): readonly string[] { return this.sebepler; }

  /** Şu anki görünümün tam belgesi (seçici açıksa seçici). Çizim bu çağrıda hesaplanır. */
  html(): string { return this.cizimYap(this.dagAl()); }

  /**
   * Panelin artımlı çizimi (PNL-A14). Son çizimden beri yalnız tur yayını geldiyse yeni model son
   * çizilen modelle karşılaştırılır; aynıysa çizim yapılmaz ve `undefined` döner. Model son çizimin
   * seçimiyle kurulur, çünkü Ray satırı seçimi grafı çizmeden taşır (PNL-A05) ve webview'deki çizim
   * o seçimle yapılmıştır. Model değiştiyse ve seçim aynıysa aynı model çizimde de kullanılır.
   */
  guncelHtml(): string | undefined {
    if (!this.zorunlu) {
      if (this.secici) return this.atla();   // seçici grafı göstermez; kapanınca güncel grafla çizilir
      const dag = this.dagAl();
      const c = this.cizilen;
      if (dag && c && c.gorunum === this.gorunumAyari()) {
        const graf = this.grafCikar(dag, c.kod);
        if (grafEsit(graf, c.graf)) return this.atla();
        if (c.kod === this.kod) return this.cizimYap(dag, graf);
      }
    }
    return this.html();
  }

  dispose(): void { this.degistiOlayi.dispose(); }

  /**
   * İçerik değişti: hesap yapılmaz, yalnız abone (panel) haberdar edilir. Tur yayını bekleyen
   * zorunlu bir sebebin yerine yazılmaz; sebep nöbet ölçüsüdür.
   */
  private ciz(sebep: string): void {
    if (sebep !== "tazele") { this.zorunlu = true; this.bekleyenSebep = sebep; }
    else if (!this.bekleyenSebep) this.bekleyenSebep = sebep;
    this.degistiOlayi.fire();
  }

  /** Tur grafı değiştirmedi: çizim yapılmaz, bekleyen sebep düşer. */
  private atla(): undefined { this.bekleyenSebep = ""; return undefined; }

  private grafCikar(dag: Dag, kod: string): ProjeGrafi {
    return projeGrafiCikar(dag, kod, (dosya) => this.odak.kapsamda(dosya), (beyanYolu) => this.meyve.var(beyanYolu));
  }

  /** Çizimi yapar ve girdisini saklar; `hazir` aynı seçimle önceden kurulmuş modeldir. */
  private cizimYap(dag: Dag | undefined, hazir?: ProjeGrafi): string {
    this.cizimSayac += 1;
    this.sebepler.push(this.bekleyenSebep || "panel");
    if (this.sebepler.length > 10) this.sebepler.shift();
    this.bekleyenSebep = "";
    this.zorunlu = false;
    this.cizilen = undefined;
    const gorunum = this.gorunumAyari();
    this.sonGorunum = this.secici ? "secici" : gorunum;
    if (this.secici) return seciciHtml(gorunum);
    if (!dag) return bosHtml(MINI_GRAF_METINLERI.kuruluyor);
    const graf = hazir ?? this.grafCikar(dag, this.kod);
    this.cizilen = { graf, kod: this.kod, gorunum };
    return gorunumHtml(graf, gorunum);
  }
}

/** Mini Graf'ı kurar; çizim Sarmal panelinin Ray sekmesinde yapılır. */
export function miniGrafKaydi(context: vscode.ExtensionContext,
                              dagAl: () => Dag | undefined,
                              odak: OdakKapisi = TUM_KAPSAM,
                              meyve: MeyveKapisi = TUM_MEYVE): MiniGrafGorunumu {
  const g = new MiniGrafGorunumu(dagAl, odak, meyve);
  context.subscriptions.push(
    { dispose: () => g.dispose() },
    vscode.commands.registerCommand("sarmal.miniGraf.gorunumDegistir", () => g.seciciDegistir()),
    vscode.commands.registerCommand(GORUNUM_SEC_KOMUTU, (deger: unknown) => g.gorunumSec(deger)),
    vscode.commands.registerCommand(GORUNUM_KAPAT_KOMUTU, () => g.seciciKapat()),
    // Ayar dışarıdan (settings.json) değişse de panel yeni görünümle çizilir.
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration(`sarmal.${GORUNUM_AYARI}`)) g.yenidenCiz("gorunum");
    }),
  );
  return g;
}

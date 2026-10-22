// ═══════════════════════════════════════════════════════════════════════════
// bolum-yuvasi.ts — 🧩 BÖLÜM YUVASI KABUĞU VE KARDEŞ EKLENTİ ARAYÜZÜ (VIT-K78-A10)
//
//   Kararlar saf çekirdektedir (bolum-cekirdek.ts). Bu kabuk yalnız üç şey
//   yapar: bölüm komutlarını kaydeder, seçimi bağlam anahtarlarına yazar ve
//   kardeş eklentinin sağlayıcısını boş bir yuva görünüşüne bağlar.
//
//   Founder 2026-10-21 (dördüncü hüküm, bağlayıcı çizim): Sarmal kabı TEK bir webview
//   görünümü taşır (`sarmalPanel`, panel.ts) ve Ray · Tren · Makinist sekme şeridi o
//   webview'in içindedir; Mini Graf Ray sekmesinin parçasıdır. VS Code kapta birden çok
//   görünüm varken her görünüme kendi başlığını koyar ve webview'in altında boşluk
//   bırakır; bu yüzden kapta her an YALNIZ BİR görünüm görünür. Dört yerleşik bölüm
//   komutu (`sarmal.bolum.ray|graf|tren|makinist`) menüde yer almaz, fakat komut olarak
//   yaşar: çağrıldığında panelin ilgili sekmesini seçer ve kabı öne alır (Graf, Ray
//   sekmesinin parçası olduğundan Ray'i seçer). Kardeş bölümlerin dört yuva görünümü
//   şimdilik kapta GÖSTERİLMEZ (`when: false`); kayıt arayüzü korunur, sekme olarak
//   panele girişi ayrı bir işin konusudur.
//
//   ── TREN KARDEŞİ (kapalı Tren eklentisi) ────────────────────────────────────
//
//   Kapalı Tren eklentisinin Koşular paneli Sarmal'ın Tren sekmesine BAĞLANTIYLA bağlanır:
//   kapta ikinci bir görünüm açılmaz (kapta yalnız bir görünüm görünür). Kancayı iki
//   adım oluşturur ve yuva arayüzünden (webview) BAĞIMSIZdır:
//     1. Kardeş, etkinleşince `sarmal.tren.kardesAc` komutunu KAYDEDER (kapanınca kaydı
//        düşer). Açık eklenti kardeşin varlığını bu komutun varlığından ölçer
//        (`commands.getCommands`); Tren sekmesinde "Koşular paneli kardeş eklentide"
//        bağlantısı yalnız komut varken görünür ve tıklanınca komut çalışır. Komut,
//        kardeşin kendi Koşular görünümünü (kendi kabında) açar.
//     2. Kardeş ayrıca eski kancayı (`setContext sarmal.tren.kardes true`) yazmaya devam
//        edebilir; açık eklenti o anahtarı YAZMAZ, kardeşin kendi menüleri okur. Kardeşin
//        görünümü `sarmal-yol` kabına katkı VERMEZ.
//   Kapalı depo bu belgeye göre ayrı bir işte düzenlenir.
//
//   ── KARDEŞ EKLENTİ ARAYÜZÜ (sürüm 1) ──────────────────────────────────────
//
//   Açık eklenti `activate` dönüşünde `bolumYuvasiAl(surum)` işlevini verir.
//   Kardeş eklenti şöyle kullanır:
//
//     const sarmal = vscode.extensions.getExtension("nexivion-labs.sarmal");
//     const yuz = await sarmal?.activate();
//     const yuva = yuz?.bolumYuvasiAl?.(1);        // bilinmeyen sürümde undefined
//     if (yuva) context.subscriptions.push(yuva.bolumKaydet({
//       kimlik: "ornek",                           // ^[a-z][a-z0-9-]{1,39}$ · "ray" ayrılmıştır
//       ad: "Örnek",                               // sırada görünür · "Ray" ve "Sarmal" ayrılmıştır
//       ipucu: "Örnek bölümü",                     // isteğe bağlı
//       simge: vscode.Uri.joinPath(context.extensionUri, "simge.svg"),
//                                                  // ya da { acik: Uri, koyu: Uri }
//       saglayici: new OrnekSaglayici(),           // vscode.WebviewViewProvider
//       webviewSecenekleri: { retainContextWhenHidden: false },   // isteğe bağlı
//     }));
//
//   "Diğer bölümler" komutu (`sarmal.bolum.diger`) kayıtlı kardeşleri QuickPick'te
//   listeler; menüde yer almaz. Bölüm ikonu `simge`, QuickPick satırında ve yuvanın
//   başlığında ad ile birlikte yer alır. Yuva yalnız webview sağlayıcısı alır.
//
//   Kayıt bir `Disposable` döndürür. Kardeş onu kendi `context.subscriptions`
//   kümesine koyduğunda, eklenti kapandığında VS Code kaydı serbest bırakır ve
//   bölüm sıradan kalkar; seçili bölüm kalkarsa seçim Ray'e döner. Geçersiz
//   kayıt (biçimsiz ya da yinelenen kimlik, boş ad, dolu yuvalar) anlaşılır bir
//   `Error` fırlatır. Kardeş eklenti hiç yoksa hiçbir şey çağrılmaz ve sıra
//   yalnız Ray'i gösterir.
//
//   🛡️ GÜVENLİK (VIT-K78-A10 sıkılaştırması):
//   · Seçim yalnız kullanıcının başlık eylemiyle ya da QuickPick seçimiyle değişir. Arayüz
//     programla seçim vermez; bir kardeş kendini öne alamaz ve her açılış
//     Ray'le başlar. Kardeş seçimi yalnız okuyabilir ve olayını dinleyebilir.
//   · Kaydı yapan eklenti çağrı yığınından ölçülür (bolum-cekirdek.ts
//     `sahibiBul`); sahibi okunamayan kayıt reddedilir. Bölümün ipucu sahibin
//     görünen adını taşır ("… · <eklenti adı>"), böylece kim olduğu gizlenemez.
//   · Simge yalnız `file:` şemasında ve sahibin kendi eklenti kökü altında
//     kabul edilir (QuickPick satırında simge olarak kullanılır).
//   · Sağlayıcısı çözümde hata veren ya da sahibi artık etkin olmayan bölüm
//     sıradan düşer ve seçim Ray'e döner.
//   · `bolumKaydet` kardeşin KENDİ kodundan doğrudan çağrılmalıdır, ör.
//     `.then((y) => y.bolumKaydet({...}))`. `.then(yuva.bolumKaydet)` gibi
//     yığında kardeşe ait kare bırakmayan çağrı sahipsiz sayılır ve reddedilir.
//
//   ⚠️ BİLİNEN SINIRLAR. Bütün eklentiler aynı uzantı sürecinde ve tam yetkiyle
//   koşar. Herhangi bir eklenti `setContext` ile bu dosyanın bağlam anahtarlarını
//   yazabilir ve başka bir eklentinin görünüm kabına kendi görünümünü ekleyebilir;
//   bunlar VS Code'un izin verdiği şeylerdir ve bu yuva onları engelleyemez.
//   Çağrı yığınından yapılan sahip ölçümü DÜRÜST SAHİPLİK içindir: bir eklentinin
//   yanlışlıkla başka birinin adıyla ya da simgesiyle görünmesini önler, fakat
//   kötü niyetli bir eklentiye karşı bir güvenlik sınırı DEĞİLDİR.
//
//   Sağlayıcı, yuvanın `WebviewView` nesnesini VS Code'un kendi çağrısıyla
//   alır; görünüşün başlığı bölümün adıdır. Koyu ve açık temalar için `simge`
//   yerine `{ acik, koyu }` çifti verilebilir.
//
//   Bağlam anahtarları (bolum-cekirdek.ts `BAGLAM`) herkese açıktır: kardeş
//   eklenti kendi ek görünümlerini `sarmal.bolum.secili == <kimlik>` koşuluyla
//   aynı kaba koyabilir. Bu isteğe bağlıdır; yuva tek başına yeterlidir.
// ═══════════════════════════════════════════════════════════════════════════

import * as vscode from "vscode";
import { realpathSync } from "node:fs";
import {
  BAGLAM, BASLIK_GORUNUSLERI, BOLUM_DIGER_KOMUTU, GRAF_BOLUMU, BOLUM_KOMUTLARI, BolumDefteri, RAY_BOLUMU, YERLESIK_BOLUMLER, YUVA_GORUNUSLERI,
  type YerlesikBolum,
  sahibiBul, sahipsizBolumler, simgeKarari, yerlesikMi, yiginDosyalari,
  type EklentiKoku,
} from "./bolum-cekirdek.ts";
import { BOLUM_SIRASI_METINLERI } from "./yuzey-metinleri.ts";

/** Arayüzün bugünkü sürümü. Kırıcı değişiklik yeni bir sürüm numarası doğurur. */
export const BOLUM_YUVASI_SURUMU = 1;

/** Kardeş eklentinin kaydettiği bölüm (sürüm 1). */
export interface BolumTanimi {
  kimlik: string;
  ad: string;
  ipucu?: string;
  simge: vscode.Uri | { acik: vscode.Uri; koyu: vscode.Uri };
  saglayici: vscode.WebviewViewProvider;
  webviewSecenekleri?: { retainContextWhenHidden?: boolean };
}

/** Kardeş eklentiye verilen yüz (sürüm 1). */
export interface BolumYuvasiV1 {
  readonly surum: 1;
  /** Bölümü kaydeder; dönen nesne serbest bırakılınca bölüm sıradan kalkar.
   *  Seçim arayüzden yapılamaz; yalnız kullanıcı başlık eylemleriyle seçer. */
  bolumKaydet(tanim: BolumTanimi): vscode.Disposable;
  /** Seçili bölümün kimliği. */
  readonly seciliBolum: string;
  /** Seçim değiştiğinde yeni kimlikle ateşlenir. */
  readonly seciliBolumDegisti: vscode.Event<string>;
}

interface YuvaKaydi {
  tanim: BolumTanimi;
  sahip: EklentiKoku;
  simge: { acik: vscode.Uri; koyu: vscode.Uri };
  kokler: vscode.Uri[];
  kayit?: vscode.Disposable;
  cozulen: number;
  dusur: () => void;
}

/** Nöbetin okuduğu salt okur ölçüm. */
export interface BolumOlcumleri {
  sira: string[];
  secili: string;
  seciliYuva: string;
  yuvaCozumu: Record<string, number>;
  /** `sarmal.bolum.kardesVar` bağlam anahtarına en son yazılan değer. */
  kardesVar: boolean;
}

/** Yalnız sınama kipinde (`ExtensionMode.Test`) verilen kapı; herkese açık arayüzde yoktur. */
export interface BolumSinamaKapisi {
  olcumler(): BolumOlcumleri;
  /** Kullanıcının başlık eylemindeki tıklamasının eşdeğeri. */
  kullaniciSecimi(kimlik: string): Promise<boolean>;
  /** Verilen eklenti artık etkin değilmiş gibi sahipsiz bölümleri düşürür; düşenleri döner. */
  sahipKaybi(eklentiKimligi: string): string[];
}

/** Yerleşik bölüm seçildiğinde panelin ilgili sekmesini seçen kanca (panel.ts). */
export type SekmeKancasi = (bolum: YerlesikBolum) => void | Promise<void>;

export interface BolumYuvasiYuzu {
  al(surum: number): BolumYuvasiV1 | undefined;
  sinamaKapisi(): BolumSinamaKapisi;
  /** Sarmal paneli kurulunca yerleşik bölüm komutları ona bağlanır. */
  sekmeBagla(kanca: SekmeKancasi): void;
}

function gercekYol(yol: string): string {
  try { return realpathSync.native(yol); } catch { return yol; }
}

/** Gerçek yol; çözülemezse undefined (simge için "yok" demektir ve reddedilir). */
function cozulenYol(yol: string): string | undefined {
  try { return realpathSync.native(yol); } catch { return undefined; }
}

function gorunenAd(e: vscode.Extension<unknown>): string {
  const pj = e.packageJSON as { displayName?: unknown; name?: unknown } | undefined;
  const ad = typeof pj?.displayName === "string" && !/^%.*%$/.test(pj.displayName) ? pj.displayName : undefined;
  return ad ?? e.id;
}

/** Adres denetimi biçime bakar: kardeş eklentinin `Uri` nesnesi başka bir API
 *  örneğinden gelebilir, bu yüzden `instanceof` yerine bileşenlerden yeniden kurulur. */
function uriMi(x: unknown): x is vscode.Uri {
  const u = x as { scheme?: unknown; path?: unknown } | undefined;
  return typeof u?.scheme === "string" && u.scheme !== "" && typeof u?.path === "string";
}

function simgeUrileri(simge: BolumTanimi["simge"] | undefined): { acik: vscode.Uri; koyu: vscode.Uri } | undefined {
  if (uriMi(simge)) { const u = vscode.Uri.from(simge); return { acik: u, koyu: u }; }
  const cift = simge as { acik?: unknown; koyu?: unknown } | undefined;
  if (uriMi(cift?.acik) && uriMi(cift?.koyu)) return { acik: vscode.Uri.from(cift.acik), koyu: vscode.Uri.from(cift.koyu) };
  return undefined;
}

class BolumYuvasiKabugu implements BolumYuvasiYuzu {
  readonly defter = new BolumDefteri<YuvaKaydi>();
  private readonly degisti = new vscode.EventEmitter<string>();
  private readonly yuvaCozumu: Record<string, number> = {};
  private kardesVarYazildi = false;
  private sekmeKancasi?: SekmeKancasi;

  private readonly kendiKok: string;

  constructor(context: vscode.ExtensionContext) {
    this.kendiKok = gercekYol(context.extensionPath);
    context.subscriptions.push(
      this.degisti,
      // Başlık eylemleri: üç yerleşik bölümün düz ve seçili komutu aynı işi görür.
      ...YERLESIK_BOLUMLER.flatMap((b) => [BOLUM_KOMUTLARI[b].duz, BOLUM_KOMUTLARI[b].secili]
        .map((komut) => vscode.commands.registerCommand(komut, () => this.sec(b, true)))),
      vscode.commands.registerCommand(BOLUM_DIGER_KOMUTU, () => this.digerSec()),
      // Mini Graf ayarı kapanırsa Graf bölümü sunacak görünümü kalmaz; seçim Ray'e döner.
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration("sarmal.miniGraf") && this.defter.secili === GRAF_BOLUMU
          && !vscode.workspace.getConfiguration("sarmal").get<boolean>("miniGraf", true)) void this.sec(RAY_BOLUMU);
      }),
      // Kaydını bırakmadan devre dışı kalan ya da kaldırılan kardeşin bölümü düşer.
      vscode.extensions.onDidChange(() => this.sahipsizleriDusur()),
      // Açık eklenti kapanırken kardeş kayıtlarının yuva sağlayıcıları bırakılır ve
      // bağlam Ray'e döner: Sarmal bir kardeş seçiliyken devre dışı kalırsa Ray
      // panelleri gizli bir bağlamda takılı kalmaz.
      { dispose: () => {
        for (const o of this.defter.sira()) this.defter.ek(o.kimlik)?.kayit?.dispose();
        void vscode.commands.executeCommand("setContext", BAGLAM.rayGizli, false);
        void vscode.commands.executeCommand("setContext", BAGLAM.kardesVar, false);
        void vscode.commands.executeCommand("setContext", BAGLAM.seciliYuva, RAY_BOLUMU);
        void vscode.commands.executeCommand("setContext", BAGLAM.secili, RAY_BOLUMU);
      } },
    );
    // Her etkinleşme Ray'le başlar ve bağlamı sıfırlar (önceki oturumdan kalan
    // rayGizli değeri Ray panellerini gizleyemez).
    void this.baglamiYaz();
  }

  sahipsizleriDusur(canli: ReadonlySet<string> = new Set(vscode.extensions.all.map((e) => e.id))): string[] {
    const kayitlar = this.defter.sira().filter((o) => !yerlesikMi(o.kimlik))
      .map((o) => ({ kimlik: o.kimlik, sahip: this.defter.ek(o.kimlik)!.sahip.kimlik }));
    const dusen = sahipsizBolumler(kayitlar, canli);
    for (const k of dusen) this.defter.ek(k)?.dusur();
    return dusen;
  }

  private sahipOku(): EklentiKoku | undefined {
    const dosyalar = yiginDosyalari();
    const eklentiler = vscode.extensions.all.map((e) => ({ kimlik: e.id, ad: gorunenAd(e), kok: gercekYol(e.extensionPath) }));
    return sahibiBul(dosyalar.map(gercekYol), eklentiler, this.kendiKok);
  }

  private async baglamiYaz(): Promise<void> {
    const secili = this.defter.secili;
    await vscode.commands.executeCommand("setContext", BAGLAM.seciliYuva, this.defter.seciliYuva);
    await vscode.commands.executeCommand("setContext", BAGLAM.secili, secili);
    await vscode.commands.executeCommand("setContext", BAGLAM.rayGizli, secili !== RAY_BOLUMU);
    this.kardesVarYazildi = this.defter.kayitSayisi > 0;
    await vscode.commands.executeCommand("setContext", BAGLAM.kardesVar, this.kardesVarYazildi);
  }

  /** "Diğer bölümler" eylemi: kayıtlı kardeşler QuickPick'te listelenir, seçilen öne alınır.
   *  Seçim yine yalnız kullanıcının eylemiyle olur (QuickPick kullanıcıya açılır). */
  private async digerSec(): Promise<void> {
    const ogeler = this.defter.sira().filter((o) => !yerlesikMi(o.kimlik)).map((o) => {
      const k = this.defter.ek(o.kimlik)!;
      return { label: o.ad, description: k.sahip.ad, detail: k.tanim.ipucu, iconPath: { light: k.simge.acik, dark: k.simge.koyu }, kimlik: o.kimlik };
    });
    if (!ogeler.length) return;
    const secilen = await vscode.window.showQuickPick(ogeler, { placeHolder: BOLUM_SIRASI_METINLERI.digerYerTutucu, matchOnDescription: true });
    if (secilen) await this.sec(secilen.kimlik, true);
  }

  sekmeBagla(kanca: SekmeKancasi): void { this.sekmeKancasi = kanca; }

  async sec(kimlik: string, odakla = false): Promise<boolean> {
    const onceki = this.defter.secili;
    if (!this.defter.sec(kimlik)) return false;
    await this.baglamiYaz();
    if (onceki !== kimlik) this.degisti.fire(kimlik);
    // Yerleşik bölüm panelin sekmesidir: kanca sekmeyi seçer ve kabı öne alır.
    if (yerlesikMi(kimlik) && this.sekmeKancasi) await this.sekmeKancasi(kimlik);
    else if (odakla) {
      // Kardeşin yuva görünümü öne alınır.
      const yuva = this.yuvaNo(kimlik);
      const gorunum = yerlesikMi(kimlik) ? BASLIK_GORUNUSLERI[kimlik] : yuva !== undefined ? YUVA_GORUNUSLERI[yuva] : undefined;
      if (gorunum) {
        try { await vscode.commands.executeCommand(`${gorunum}.focus`); } catch { /* görünüş henüz yoksa odak beklenmez */ }
      }
    }
    return true;
  }

  private yuvaNo(kimlik: string): number | undefined {
    return this.defter.sira().find((o) => o.kimlik === kimlik)?.yuva;
  }

  private kaydet(tanim: BolumTanimi): vscode.Disposable {
    const kimlik = String(tanim?.kimlik ?? "");
    const simge = simgeUrileri(tanim?.simge);
    if (!simge) throw new Error(BOLUM_SIRASI_METINLERI.kayitReddi("simge-yok", kimlik));
    if (!tanim?.saglayici || typeof tanim.saglayici.resolveWebviewView !== "function") {
      throw new Error(BOLUM_SIRASI_METINLERI.kayitReddi("saglayici-yok", kimlik));
    }
    const sahip = this.sahipOku();
    if (!sahip) throw new Error(BOLUM_SIRASI_METINLERI.kayitReddi("sahip-yok", kimlik));
    // Simge gerçek yoluna çözülür (sembolik bağ sahibin kökünden kaçamaz) ve çizim de
    // o gerçek yoldan yapılır; kök yalnız simgenin kendi klasörüdür.
    const kokler: vscode.Uri[] = [];
    const gercek: vscode.Uri[] = [];
    for (const u of [simge.acik, simge.koyu]) {
      const ham = u.scheme === "file" ? u.fsPath : u.path;
      const yol = u.scheme === "file" ? cozulenYol(ham) : undefined;
      const karar = simgeKarari(u.scheme, ham, yol, sahip.kok);
      if (karar.tur === "ret" || yol === undefined) throw new Error(BOLUM_SIRASI_METINLERI.kayitReddi("simge-kok", kimlik));
      kokler.push(vscode.Uri.file(karar.kok));
      gercek.push(vscode.Uri.file(yol));
    }
    const ek: YuvaKaydi = {
      tanim, sahip, simge: { acik: gercek[0], koyu: gercek[1] }, kokler, cozulen: 0, dusur: () => undefined,
    };
    const sonuc = this.defter.kaydet(kimlik, tanim.ad, ek);
    if (sonuc.tur === "ret") throw new Error(BOLUM_SIRASI_METINLERI.kayitReddi(sonuc.sebep, kimlik));
    const gorunus = YUVA_GORUNUSLERI[sonuc.yuva];
    const ad = this.defter.sira().find((o) => o.kimlik === kimlik)!.ad;
    ek.kayit = vscode.window.registerWebviewViewProvider(gorunus, {
      resolveWebviewView: (gorunum, baglam, iptal) => {
        gorunum.title = ad;
        ek.cozulen++;
        this.yuvaCozumu[kimlik] = ek.cozulen;
        // Çözülemeyen sağlayıcı (kapanmış ya da bozuk kardeş) bölümü düşürür ve
        // seçim Ray'e döner; hata kardeşin sınırında kalır.
        try {
          const sonuc = tanim.saglayici.resolveWebviewView(gorunum, baglam, iptal);
          if (sonuc && typeof (sonuc as PromiseLike<void>).then === "function") {
            return Promise.resolve(sonuc).catch(() => ek.dusur());
          }
          return sonuc;
        } catch {
          ek.dusur();
          return undefined;
        }
      },
    }, { webviewOptions: { retainContextWhenHidden: tanim.webviewSecenekleri?.retainContextWhenHidden === true } });
    void this.baglamiYaz();
    let birakildi = false;
    ek.dusur = () => {
      if (birakildi) return;
      birakildi = true;
      const { dustu, seciliDegisti } = this.defter.dusur(kimlik);
      if (!dustu) return;
      delete this.yuvaCozumu[kimlik];
      // Önce görünüş gizlenir (bağlam), sonra sağlayıcı bırakılır.
      void this.baglamiYaz().finally(() => ek.kayit?.dispose());
      if (seciliDegisti) this.degisti.fire(RAY_BOLUMU);
    };
    return new vscode.Disposable(() => ek.dusur());
  }

  al(surum: number): BolumYuvasiV1 | undefined {
    if (surum !== BOLUM_YUVASI_SURUMU) return undefined;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const kabuk = this;
    return {
      surum: 1,
      bolumKaydet: (tanim) => kabuk.kaydet(tanim),
      get seciliBolum() { return kabuk.defter.secili; },
      seciliBolumDegisti: kabuk.degisti.event,
    };
  }

  sinamaKapisi(): BolumSinamaKapisi {
    return {
      olcumler: () => this.olcumler(),
      kullaniciSecimi: (k) => this.sec(k, true),
      sahipKaybi: (id) => this.sahipsizleriDusur(new Set(vscode.extensions.all.map((e) => e.id).filter((x) => x !== id))),
    };
  }

  private olcumler(): BolumOlcumleri {
    return {
      sira: this.defter.sira().map((o) => o.kimlik),
      secili: this.defter.secili,
      seciliYuva: this.defter.seciliYuva,
      yuvaCozumu: { ...this.yuvaCozumu },
      kardesVar: this.kardesVarYazildi,
    };
  }
}

/** Bölüm yuvasını kurar: başlık komutları kaydedilir ve seçim Ray'le başlar. */
export function bolumYuvasiKaydi(context: vscode.ExtensionContext): BolumYuvasiYuzu {
  return new BolumYuvasiKabugu(context);
}

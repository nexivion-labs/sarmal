// ═══════════════════════════════════════════════════════════════════════════
// bolum-yuvasi.ts — 🧩 BÖLÜM YUVASI KABUĞU VE KARDEŞ EKLENTİ ARAYÜZÜ (VIT-K78-A10)
//
//   Kararlar saf çekirdektedir (bolum-cekirdek.ts). Bu kabuk yalnız üç şey
//   yapar: kabın en üstündeki bölüm sırasını çizer, seçimi bağlam anahtarlarına
//   yazar ve kardeş eklentinin sağlayıcısını boş bir yuva görünüşüne bağlar.
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
//   Kayıt bir `Disposable` döndürür. Kardeş onu kendi `context.subscriptions`
//   kümesine koyduğunda, eklenti kapandığında VS Code kaydı serbest bırakır ve
//   bölüm sıradan kalkar; seçili bölüm kalkarsa seçim Ray'e döner. Geçersiz
//   kayıt (biçimsiz ya da yinelenen kimlik, boş ad, dolu yuvalar) anlaşılır bir
//   `Error` fırlatır. Kardeş eklenti hiç yoksa hiçbir şey çağrılmaz ve sıra
//   yalnız Ray'i gösterir.
//
//   🛡️ GÜVENLİK (VIT-K78-A10 sıkılaştırması):
//   · Seçim yalnız kullanıcının Bölümler sırasındaki eylemiyle değişir. Arayüz
//     programla seçim vermez; bir kardeş kendini öne alamaz ve her açılış
//     Ray'le başlar. Kardeş seçimi yalnız okuyabilir ve olayını dinleyebilir.
//   · Kaydı yapan eklenti çağrı yığınından ölçülür (bolum-cekirdek.ts
//     `sahibiBul`); sahibi okunamayan kayıt reddedilir. Bölümün ipucu sahibin
//     görünen adını taşır ("… · <eklenti adı>"), böylece kim olduğu gizlenemez.
//   · Simge yalnız `file:` şemasında ve sahibin kendi eklenti kökü altında
//     kabul edilir; webview'in yerel kaynak kökü simgenin kendi klasörüdür.
//   · Sağlayıcısı çözümde hata veren ya da sahibi artık etkin olmayan bölüm
//     sıradan düşer ve seçim Ray'e döner.
//
//   Sağlayıcı, yuvanın `WebviewView` nesnesini VS Code'un kendi çağrısıyla
//   alır; görünüşün başlığı bölümün adıdır. Simge dosyasının klasörü bölüm
//   sırasının yerel kaynak köklerine eklenir ve simge `<img>` olarak basılır,
//   yani logo kendi renkleriyle görünür; koyu ve yüksek karşıtlıklı temalar için
//   `{ acik, koyu }` çifti verilebilir.
//
//   Bağlam anahtarları (bolum-cekirdek.ts `BAGLAM`) herkese açıktır: kardeş
//   eklenti kendi ek görünümlerini `sarmal.bolum.secili == <kimlik>` koşuluyla
//   aynı kaba koyabilir. Bu isteğe bağlıdır; yuva tek başına yeterlidir.
// ═══════════════════════════════════════════════════════════════════════════

import * as vscode from "vscode";
import { readFileSync, realpathSync } from "node:fs";
import { randomBytes } from "node:crypto";
import {
  BAGLAM, BOLUM_SIRASI_GORUNUSU, BolumDefteri, RAY_BOLUMU, YUVA_GORUNUSLERI,
  sahibiBul, sahipsizBolumler, simgeKarari, siraHtml, yiginDosyalari,
  type EklentiKoku, type SiraCizimOgesi,
} from "./bolum-cekirdek.ts";
import { BOLUM_SIRASI_METINLERI } from "./yuzey-metinleri.ts";
import { RAY_BOLUM_SIMGESI } from "./simge-cizelgesi.ts";

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
   *  Seçim arayüzden yapılamaz; yalnız kullanıcı Bölümler sırasında seçer. */
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
  siraCozuldu: boolean;
  siraCizimi: number;
  yuvaCozumu: Record<string, number>;
  /** Sırada basılan ipuçları (kimlik → metin). */
  ipuclari: Record<string, string>;
  /** Bölüm sırası webview'inin yerel kaynak kökleri (fsPath). */
  kokler: string[];
}

/** Yalnız sınama kipinde (`ExtensionMode.Test`) verilen kapı; herkese açık arayüzde yoktur. */
export interface BolumSinamaKapisi {
  olcumler(): BolumOlcumleri;
  /** Kullanıcının sıradaki tıklamasının eşdeğeri: sınama sıranın iletisini taklit eder. */
  kullaniciSecimi(kimlik: string): Promise<boolean>;
  /** Verilen eklenti artık etkin değilmiş gibi sahipsiz bölümleri düşürür; düşenleri döner. */
  sahipKaybi(eklentiKimligi: string): string[];
}

export interface BolumYuvasiYuzu {
  al(surum: number): BolumYuvasiV1 | undefined;
  sinamaKapisi(): BolumSinamaKapisi;
  diliTazele(): void;
}

function gercekYol(yol: string): string {
  try { return realpathSync.native(yol); } catch { return yol; }
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

class BolumSirasi implements vscode.WebviewViewProvider {
  gorunum?: vscode.WebviewView;
  cizim = 0;
  sonKokler: string[] = [];
  sonIpuclari: Record<string, string> = {};
  private raySvg?: string;

  constructor(private readonly eklentiUri: vscode.Uri, private readonly yuva: BolumYuvasiKabugu) {}

  resolveWebviewView(gorunum: vscode.WebviewView): void {
    this.gorunum = gorunum;
    gorunum.onDidDispose(() => { if (this.gorunum === gorunum) this.gorunum = undefined; });
    gorunum.webview.onDidReceiveMessage((m: unknown) => {
      const ileti = m as { tur?: unknown; kimlik?: unknown };
      // Seçimin TEK yolu: kullanıcının bu sıradaki tıklaması ya da Enter/Boşluk'u.
      if (ileti?.tur === "sec" && typeof ileti.kimlik === "string") void this.yuva.sec(ileti.kimlik, true);
    });
    this.ciz();
  }

  private rayCizimi(): string {
    if (this.raySvg === undefined) {
      try {
        this.raySvg = readFileSync(vscode.Uri.joinPath(this.eklentiUri, RAY_BOLUM_SIMGESI).fsPath, "utf8");
      } catch {
        this.raySvg = "";
      }
    }
    return this.raySvg;
  }

  ciz(): void {
    const g = this.gorunum;
    if (!g) return;
    const kokler: vscode.Uri[] = [this.eklentiUri];
    const ogeler: SiraCizimOgesi[] = this.yuva.defter.sira(BOLUM_SIRASI_METINLERI.rayAdi).map((o) => {
      const secili = o.kimlik === this.yuva.defter.secili;
      if (o.kimlik === RAY_BOLUMU) {
        return { kimlik: o.kimlik, ad: o.ad, ipucu: BOLUM_SIRASI_METINLERI.rayIpucu, secili, svg: this.rayCizimi() };
      }
      const k = this.yuva.defter.ek(o.kimlik)!;
      const s = k.simge;
      // Kök yalnız simgenin kendi klasörüdür (kayıtta sahibin kökü altında doğrulandı).
      kokler.push(...k.kokler);
      return {
        kimlik: o.kimlik, ad: o.ad, ipucu: `${k.tanim.ipucu ?? o.ad} · ${k.sahip.ad}`, secili,
        simgeAcik: g.webview.asWebviewUri(s.acik).toString(),
        simgeKoyu: g.webview.asWebviewUri(s.koyu).toString(),
      };
    });
    g.webview.options = { enableScripts: true, localResourceRoots: kokler };
    this.sonKokler = kokler.map((k) => k.fsPath);
    this.sonIpuclari = Object.fromEntries(ogeler.map((o) => [o.kimlik, o.ipucu]));
    g.webview.html = siraHtml({
      nonce: randomBytes(16).toString("base64"),
      cspKaynak: g.webview.cspSource,
      dil: BOLUM_SIRASI_METINLERI.htmlDili,
      listeEtiketi: BOLUM_SIRASI_METINLERI.listeEtiketi,
      ogeler,
    });
    this.cizim++;
  }

  seciliBildir(kimlik: string): void {
    void this.gorunum?.webview.postMessage({ tur: "secili", kimlik });
  }
}

class BolumYuvasiKabugu implements BolumYuvasiYuzu {
  readonly defter = new BolumDefteri<YuvaKaydi>();
  private readonly sira: BolumSirasi;
  private readonly degisti = new vscode.EventEmitter<string>();
  private readonly yuvaCozumu: Record<string, number> = {};

  private readonly kendiKok: string;

  constructor(context: vscode.ExtensionContext) {
    this.kendiKok = gercekYol(context.extensionPath);
    this.sira = new BolumSirasi(context.extensionUri, this);
    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(BOLUM_SIRASI_GORUNUSU, this.sira),
      this.degisti,
      // Kaydını bırakmadan devre dışı kalan ya da kaldırılan kardeşin bölümü düşer.
      vscode.extensions.onDidChange(() => this.sahipsizleriDusur()),
      // Açık eklenti kapanırken kardeş kayıtlarının yuva sağlayıcıları bırakılır ve
      // bağlam Ray'e döner: Sarmal bir kardeş seçiliyken devre dışı kalırsa Ray
      // panelleri gizli bir bağlamda takılı kalmaz.
      { dispose: () => {
        for (const o of this.defter.sira("")) this.defter.ek(o.kimlik)?.kayit?.dispose();
        void vscode.commands.executeCommand("setContext", BAGLAM.rayGizli, false);
        void vscode.commands.executeCommand("setContext", BAGLAM.seciliYuva, RAY_BOLUMU);
        void vscode.commands.executeCommand("setContext", BAGLAM.secili, RAY_BOLUMU);
      } },
    );
    // Her etkinleşme Ray'le başlar ve bağlamı sıfırlar (önceki oturumdan kalan
    // rayGizli değeri Ray panellerini gizleyemez).
    void this.baglamiYaz();
  }

  sahipsizleriDusur(canli: ReadonlySet<string> = new Set(vscode.extensions.all.map((e) => e.id))): string[] {
    const kayitlar = this.defter.sira("").filter((o) => o.kimlik !== RAY_BOLUMU)
      .map((o) => ({ kimlik: o.kimlik, sahip: this.defter.ek(o.kimlik)!.sahip.kimlik }));
    const dusen = sahipsizBolumler(kayitlar, canli);
    for (const k of dusen) this.defter.ek(k)?.dusur();
    return dusen;
  }

  private sahipOku(): EklentiKoku | undefined {
    const eski = Error.stackTraceLimit;
    Error.stackTraceLimit = 64;
    const yigin = new Error().stack ?? "";
    Error.stackTraceLimit = eski;
    const eklentiler = vscode.extensions.all.map((e) => ({ kimlik: e.id, ad: gorunenAd(e), kok: gercekYol(e.extensionPath) }));
    return sahibiBul(yiginDosyalari(yigin).map(gercekYol), eklentiler, this.kendiKok);
  }

  private async baglamiYaz(): Promise<void> {
    const secili = this.defter.secili;
    await vscode.commands.executeCommand("setContext", BAGLAM.seciliYuva, this.defter.seciliYuva);
    await vscode.commands.executeCommand("setContext", BAGLAM.secili, secili);
    await vscode.commands.executeCommand("setContext", BAGLAM.rayGizli, secili !== RAY_BOLUMU);
  }

  async sec(kimlik: string, odakla = false): Promise<boolean> {
    const onceki = this.defter.secili;
    if (!this.defter.sec(kimlik)) return false;
    await this.baglamiYaz();
    this.sira.seciliBildir(kimlik);
    if (onceki !== kimlik) this.degisti.fire(kimlik);
    const k = this.defter.ek(kimlik);
    if (odakla && k) {
      const yuva = this.yuvaNo(kimlik);
      if (yuva !== undefined) {
        try { await vscode.commands.executeCommand(`${YUVA_GORUNUSLERI[yuva]}.focus`); } catch { /* görünüş henüz yoksa odak beklenmez */ }
      }
    }
    return true;
  }

  private yuvaNo(kimlik: string): number | undefined {
    return this.defter.sira("").find((o) => o.kimlik === kimlik)?.yuva;
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
      const yol = u.scheme === "file" ? gercekYol(u.fsPath) : u.path;
      const karar = simgeKarari(u.scheme, yol, sahip.kok);
      if (karar.tur === "ret") throw new Error(BOLUM_SIRASI_METINLERI.kayitReddi("simge-kok", kimlik));
      kokler.push(vscode.Uri.file(karar.kok));
      gercek.push(vscode.Uri.file(yol));
    }
    const ek: YuvaKaydi = {
      tanim, sahip, simge: { acik: gercek[0], koyu: gercek[1] }, kokler, cozulen: 0, dusur: () => undefined,
    };
    const sonuc = this.defter.kaydet(kimlik, tanim.ad, ek);
    if (sonuc.tur === "ret") throw new Error(BOLUM_SIRASI_METINLERI.kayitReddi(sonuc.sebep, kimlik));
    const gorunus = YUVA_GORUNUSLERI[sonuc.yuva];
    const ad = this.defter.sira("").find((o) => o.kimlik === kimlik)!.ad;
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
    this.sira.ciz();
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
      this.sira.ciz();
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
      sira: this.defter.sira("").map((o) => o.kimlik),
      secili: this.defter.secili,
      seciliYuva: this.defter.seciliYuva,
      siraCozuldu: this.sira.gorunum !== undefined,
      siraCizimi: this.sira.cizim,
      yuvaCozumu: { ...this.yuvaCozumu },
      ipuclari: { ...this.sira.sonIpuclari },
      kokler: [...this.sira.sonKokler],
    };
  }

  diliTazele(): void {
    this.sira.ciz();
  }
}

/** Bölüm yuvasını kurar: bölüm sırası kaydedilir ve seçim Ray'le başlar. */
export function bolumYuvasiKaydi(context: vscode.ExtensionContext): BolumYuvasiYuzu {
  return new BolumYuvasiKabugu(context);
}

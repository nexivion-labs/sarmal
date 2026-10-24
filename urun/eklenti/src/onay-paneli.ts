// ═══════════════════════════════════════════════════════════════════════════
// onay-paneli.ts — 📬 ONAYLAR KARTI (kanonun dördüncü sunum yüzeyi)
//
//   Founder 2026-10-21 (üçüncü hüküm): kapta her bölüm TEK görünümdür, bu yüzden
//   Onaylar artık bir kenar çubuğu görünümü değil, Makinist ağacının bir üst
//   düğümüdür (makinist.ts; satırlar bu panelin defterinden gelir). Karar yüzeyi
//   (gerekçe kutusu, üç düğme) bir ağaç satırına sığmadığı için bu dosyada ŞU AN
//   YAN SEKMEDE AÇILAN BİR WEBVIEW KARTI olarak yaşar: kapı satırına tıklanınca
//   ya da kod merceğinden gelince `gosterVeAc` kartı açar. Gövde, mesajlar ve
//   hüküm hattı aynen korunmuştur; yalnız barınağı değişti (WebviewView →
//   WebviewPanel). Sayı rozeti artık Makinist ağacında durur.
//
//   Aşağıdaki tarihçe kartın "panel" olduğu dönemi anlatır; "görünüş" yerine
//   "kart" okunmalıdır.
//
//   Founder onayı bekleyen kapılar burada yaşar. Bugüne kadar bu yüzey bir AĞAÇ
//   GÖRÜNÜŞÜYDÜ ve kararın gerekçesi `showInputBox` ile isteniyordu. Founder aynı
//   şikâyeti ÜÇ KEZ söyledi; sonuncusu şudur: "ya ben bir şerh metni yazmak için
//   ta en yukarıya bakmak zorunda mıyım? onaylar panelinin metin alanı için niye bu
//   kadar uzak bir noktaya dikkatimi yoğunlaştırmak zorundayım?"
//
//   ŞİKÂYET HAKLIYDI VE ÇÖZÜMÜ TEKTİ. Ölçüm (varsayım değil, `@types/vscode`
//   bildiriminden okundu): `InputBoxOptions`, `QuickInput` ve `InputBox`
//   arayüzlerinin hiçbirinde konum alanı yoktur; VS Code bütün QuickInput
//   yüzeylerini pencerenin üst ortasında çizer. Aynı bildirimde `TreeItem` bir
//   metin alanı barındıramaz — alanları etiket, kimlik, simge, açıklama, kaynak
//   adresi, ipucu, komut, kademe durumu, bağlam değeri, erişilebilirlik bilgisi
//   ve onay kutusudur. Yani not alanını kullanıcının gözünün olduğu yere
//   getirmenin tek yolu onu PANELİN İÇİNDE çizmektir; bu da webview demektir.
//
//   YEREL AĞAÇTAN VAZGEÇMENİN ÖLÇÜLMÜŞ BEDELİ (hepsi elle geri kuruldu ya da
//   dürüstçe kayıp yazıldı):
//     · klavye gezinmesi — ELLE KURULDU (ok tuşları, Home/End, Enter/Boşluk).
//     · tema renkleri — ELLE KURULDU (`--vscode-*` değişkenleri; ham renk yok).
//     · teknoloji simgesi — ELLE KURULDU (aynı çizelge, `asWebviewUri` ile).
//     · sayı rozeti — KAYIP DEĞİL: `WebviewView.badge` yerel olarak vardır.
//     · boş-durum cümlesi — ELLE KURULDU (`TreeView.message` webview'de yoktur).
//     · `reveal` — ELLE KURULDU (`show` + odak mesajı).
//     · bağlam menüsü (`contextValue`) — paket bildiriminde bu görünüş için
//       HİÇ menü katkısı yoktur; kaybedilen bir davranış olmadı.
//     · codicon yazı tipi — KAYIP. Webview'e codicon yazı tipi ancak dış varlık
//       gömülerek gelir; sıfır bağımlılık ilkesi (STR-3.1) bunu yasaklar. Yerine
//       katalogun zaten kullandığı emojiler kondu.
//     · listenin YAZARAK SÜZME penceresi — KAYIP. Taklidi yapılmadı.
//
//   SAĞLAYICI KARAR VERMEZ VE TARAMAZ. Kapı listesi tek bir gözden gelir
//   (onay-tarayici.ts); ağacın kurulumu saf çekirdektedir (onay-cekirdek.ts);
//   gövde ile gerekçe ölçüsü saf gövdededir (onay-govde.ts); kullanıcı metinleri
//   katalogdadır (yuzey-metinleri.ts). Burada yalnız editör kabuğuna çevirme işi
//   yapılır ve hüküm YİNE tek yazıcıya (`sarmal.onayKararVer` → `kararIsle`)
//   iner.
//
//   İKİNCİ BİR ZAMANLAYICI YOKTUR. Panel kendi nabzını kurmaz; onay kuyruğunun
//   hâlihazırdaki nabzına bağlanır (kaydetme olayı · geciktirmeli yazım turu ·
//   disk izleyicisi).
// ═══════════════════════════════════════════════════════════════════════════

import * as vscode from "vscode";
import { projeKimligi } from "./yolharitasi.ts";   // 🗺️ aidiyet TEK kaynaktan çözülür
import {
  YUZEY_BOS_DURUM, MAKINIST_METINLERI,
  ONAY_GOVDE_METINLERI, gerekceZorunlu, gerekceArtik,
  onayKapiBaglami, onayBaglamKopyalandi, onayBaglamKapiYok,
} from "./yuzey-metinleri.ts";
import {
  OnayDefteri, onayKimligi,
  type KapiKaydi, type OnayKapisi,
} from "./onay-cekirdek.ts";
import {
  PanelDurumu, onayGovdesiHtml, onayIcGovdesi, gerekceyiOlc, secenekBul,
  notKimligi, odakNiyeti, KARAR_SECENEKLERI,
  type GovdeGirdisi, type PanelMesaji,
} from "./onay-govde.ts";
// 🏷️ Founder hükmü 2026-07-28: her satır ilgili olduğu dosyanın TEKNOLOJİ simgesini
// taşır. Çizelge eklentinin kendi dil ilanından türer — tek kaynak (teknoloji-simgesi.ts).
import { eklentiCizelgesi, teknolojiSimgesi, type SimgeCizelgesi } from "./teknoloji-simgesi.ts";
// VIT-KIMLIK-A05: kapı satırının geometrik balonu satır çizelgesinden okunur —
// gövde saf kaldığı için dosyayı KABUK okur ve metin olarak verir.
import { satirSvgKaynagi, type SatirSimgesi } from "./simge-cizelgesi.ts";
import { readFileSync } from "node:fs";

/** İçerik güvenlik politikasının nonce'u — her belgede bir kez, tahmin edilemez. */
function nonceUret(): string {
  const harfler = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let n = "";
  for (let i = 0; i < 32; i += 1) n += harfler[Math.floor(Math.random() * harfler.length)];
  return n;
}

export class OnayPaneli {
  /**
   * Panel içeriği değişti. Durum çubuğu bu olaydan beslenir (ölçülmüş kusur
   * KUSUR-DURUM-ÇUBUĞU: panelde on dört kapı varken durum çubuğu sıfır gösteriyordu). Ağaç
   * dünyasındaki `onDidChangeTreeData` yerine geçer; İKİNCİ BİR SAYAÇ ya da
   * tarama kurulmaz, sayı yine bu defterden okunur.
   */
  private degisti = new vscode.EventEmitter<void>();
  readonly onDegisti = this.degisti.event;

  private readonly defter = new OnayDefteri();
  /** Açıklık ve gerekçe taslakları — tazeleme bunları düşüremez. */
  private readonly durum = new PanelDurumu();
  /** Açık kart (yan sekme); yoksa yoktur ve kapılar yalnız Makinist ağacında görünür. */
  private gorunum?: vscode.WebviewPanel;
  /** Teknoloji simgesi kökü ve çizelgesi — kayıt anında bir kez kurulur. */
  private simgeKoku?: vscode.Uri;
  private simgeCizelgesi: SimgeCizelgesi = new Map();

  /** Simge kaynağını bağlar; verilmezse satırlar simgesiz kalır (uydurma yapılmaz). */
  simgeKaynaginiBagla(kok: vscode.Uri, cizelge: SimgeCizelgesi): void {
    this.simgeKoku = kok; this.simgeCizelgesi = cizelge;
  }

  /** Kapı balonunun currentColor SVG metni — çizelge yolundan BİR KEZ okunur;
   *  kök yoksa ya da dosya okunamazsa satır işaretsiz kalır (uydurma yapılmaz). */
  private kapiSimgesiOnbellek?: string;
  private kapiSimgesi(): string {
    if (this.kapiSimgesiOnbellek !== undefined) return this.kapiSimgesiOnbellek;
    this.kapiSimgesiOnbellek = this.satirSimgesiOku("kapi");
    return this.kapiSimgesiOnbellek;
  }

  /** Bağlam kopyalama eyleminin currentColor SVG metni — aynı kural: çizelge
   *  yolundan bir kez okunur, okunamazsa eylem işaretsiz kalır. Emoji basmak
   *  YASAKTIR (YUZ-4.1): panelin bütün satır işaretleri geometrik ailedendir. */
  private kopyaSimgesiOnbellek?: string;
  private kopyaSimgesi(): string {
    if (this.kopyaSimgesiOnbellek !== undefined) return this.kopyaSimgesiOnbellek;
    this.kopyaSimgesiOnbellek = this.satirSimgesiOku("kopya");
    return this.kopyaSimgesiOnbellek;
  }

  /** Üç karar düğmesinin çizimleri — kaynak yine çizelgedir, emoji basılmaz. */
  private kararSimgeleriOnbellek?: Readonly<Record<string, string>>;
  private kararSimgeleri(): Readonly<Record<string, string>> {
    if (this.kararSimgeleriOnbellek !== undefined) return this.kararSimgeleriOnbellek;
    this.kararSimgeleriOnbellek = Object.fromEntries(
      KARAR_SECENEKLERI.map((s) => [s.simge, this.satirSimgesiOku(s.simge as SatirSimgesi)]),
    );
    return this.kararSimgeleriOnbellek;
  }

  private satirSimgesiOku(ad: Parameters<typeof satirSvgKaynagi>[0]): string {
    try {
      return this.simgeKoku
        ? readFileSync(vscode.Uri.joinPath(this.simgeKoku, satirSvgKaynagi(ad)).fsPath, "utf8")
        : "";
    } catch {
      return "";
    }
  }

  /** Bekleyen kapı sayısı — rozet, durum çubuğu ve nöbet bu sayıyı okur. */
  get kapiSayisi(): number {
    return this.defter.kapiSayisi;
  }

  /** Nöbet ölçüsü: defterde kaç gerekçe taslağı duruyor. */
  get taslakSayisi(): number {
    return this.durum.taslakSayisi;
  }

  /** Dil ayarı değiştiğinde kartın başlığını ve gövdeyi aynı turda yeniler. */
  diliTazele(): void {
    if (this.gorunum) this.gorunum.title = MAKINIST_METINLERI.onaylar;
    this.cizdir();
  }

  /** Makinist ağacının Onaylar düğümünün satırları: bekleyen bütün kapılar. */
  kapilar(): KapiKaydi[] {
    return this.defter.kayitlar();
  }

  /**
   * 🔬 ÖLÇÜM KAPISI: panelin ŞU AN gösterdiği kapılar. Salt-okunurdur, hiçbir
   * davranış değiştirmez. Gerçek editör kabuğunda koşan nöbet "karara bağlanan
   * kapı panelden düştü mü" sorusunu ancak buradan gerçekten sorabilir; VS Code
   * bir görünüşün içeriğini dışarıya vermez.
   */
  kapiKodlari(): { dosya: string; kod: string }[] {
    return this.defter.kayitlar().map((k) => ({ dosya: k.dosya, kod: k.kapi.kod }));
  }

  /** Tam taramanın sonucunu toptan yerleştirir (komutla panel aynı listeden beslenir). */
  yerlestirHepsi(kayitlar: readonly KapiKaydi[]): void {
    if (this.defter.tazele(kayitlar)) this.cizdir();
  }

  /** Tek bir belgenin kapılarını tazeler; öteki dosyalar yerinde kalır. */
  yerlestirDosya(dosya: string, kapilar: readonly OnayKapisi[]): void {
    if (this.defter.yaz(dosya, kapilar)) this.cizdir();
  }

  /** Silinen ya da kapsam dışına çıkan dosyanın kapılarını düşürür. */
  dusur(dosya: string): void {
    if (this.defter.sil(dosya)) this.cizdir();
  }

  private cizdir(): void {
    this.govdeyiTazele();
    this.degisti.fire();
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 🖼️ ÇİZİM
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Kartı etkin sütunda, dosya sekmelerinin yanında açar (varsa açık olanı
   * döndürür). Founder 2026-10-22: yan sütunda açılan kart ekranı üçe bölüp
   * açık dosyayı tek kelimelik şeride sıkıştırıyordu; kart artık sütun açmaz.
   */
  kartiAc(): vscode.WebviewPanel {
    if (this.gorunum) return this.gorunum;
    const gorunum = vscode.window.createWebviewPanel(
      "sarmalOnayKarti", MAKINIST_METINLERI.onaylar,
      { viewColumn: vscode.ViewColumn.Active, preserveFocus: false },
      {
        // Karar yüzeyi GİRİŞ ALIR; betiksiz olamaz. Mini Grafın betiksiz disiplini
        // (bir GÖSTERGE olduğu için) aynen yerinde durur ve ona dokunulmadı.
        enableScripts: true,
        // Dış kaynağa hiç bağlanılmaz (STR-3.1): yalnız eklentinin kendi kökü.
        localResourceRoots: this.simgeKoku ? [this.simgeKoku] : [],
        // Kullanıcı başka sekmeye geçip döndüğünde yazdığı gerekçe DURMALIDIR.
        retainContextWhenHidden: true,
      },
    );
    this.gorunum = gorunum;
    gorunum.webview.onDidReceiveMessage((m: PanelMesaji) => { void this.mesaj(m); });
    // Kart gizlenip yeniden göründüğünde belge sıfırdan kurulur; durum eklenti
    // tarafında yaşadığı için açıklık da taslaklar da yerinde gelir.
    gorunum.onDidChangeViewState(() => { if (gorunum.visible) this.yuzeyiKur(); });
    gorunum.onDidDispose(() => { if (this.gorunum === gorunum) this.gorunum = undefined; });
    this.yuzeyiKur();
    return gorunum;
  }

  /**
   * 🔗 YÜZEYİN İKİ KANALI BİRLİKTE KURULUR — ROZET VE GÖVDE AYRI YOLDAN BESLENEMEZ.
   *
   * ÖLÇÜLMÜŞ KUSUR (Founder ekran görüntüsü 2026-07-30): panel gövdesi "gelen kutun
   * sıfır" derken başlıktaki rozet 1 gösteriyordu. Beyan ile ölçüm aynı ekranda
   * çelişiyordu ve çelişen taraf rozetti.
   *
   * KÖK SEBEP YAPISALDI, sayma hatası DEĞİL. Rozet ile gövde aynı deftere bakar ve
   * defterde eleme yoktur (`dosyayaGrupla` hiçbir kaydı düşürmez), dolayısıyla ikisi
   * aynı ANDA çelişemez. Çelişki iki tazeleme yolunun ayrışmasından doğuyordu:
   * görünüş çözülürken rozet ile gövde birlikte kurulurdu, fakat görünürlük
   * değiştiğinde YALNIZ gövde yeniden basılırdı. Panel gizliyken kapı düşerse rozet
   * yazımı hedefsiz kalır; panel geri açıldığında gövde gerçeği yeniden çizer ama
   * rozeti kimse yeniden ilan etmez ve son bilinen sayı ekranda asılı kalır.
   *
   * DÜZELTMENİN ŞEKLİ: kanalları çağıranlara bırakmak yerine tek kapıya aldık.
   * Yüzeyi kuran her yol buradan geçer, dolayısıyla "birini çağırıp ötekini unutmak"
   * artık yazılamaz bir hatadır. Bu, deponun kendi dersinin uygulamasıdır: iki kapı
   * aynı gerçeği söylüyorsa ikisi tek kaynaktan beslenir, yoksa biri sessizce bayatlar.
   */
  private yuzeyiKur(): void {
    this.belgeyiBas();
  }

  /** Gövdeyi basmak için gereken her şeyi toplar. */
  private girdi(): GovdeGirdisi {
    const kumeler = this.defter.kumeler();
    // Dosya satırları AÇIK başlar; kullanıcı kapattıysa kapalı kalır.
    for (const k of kumeler) {
      this.durum.dosyayiVarsayilanAc(onayKimligi({ tur: "dosya", dosya: k.dosya }));
    }
    const webview = this.gorunum?.webview;
    return {
      kumeler,
      durum: this.durum,
      // Proje çözümü Yol Haritası ile AYNI kapıdan gelir; ikinci bir kök arama
      // yazılsaydı iki panel aynı dosyayı farklı Projeye yazabilirdi.
      proje: (dosya: string) => projeKimligi(dosya).ad || undefined,
      simge: (dosya) => {
        if (!this.simgeKoku || !webview) return undefined;
        const s = teknolojiSimgesi(this.simgeKoku, this.simgeCizelgesi, dosya);
        return s
          ? { light: webview.asWebviewUri(s.light).toString(), dark: webview.asWebviewUri(s.dark).toString() }
          : undefined;
      },
      nonce: nonceUret(),
      kapiSimgesi: this.kapiSimgesi(),
      kopyaSimgesi: this.kopyaSimgesi(),
      kararSimgeleri: this.kararSimgeleri(),
      cspKaynak: webview?.cspSource ?? "",
      bosCumle: YUZEY_BOS_DURUM.onayPaneli,
      metinler: ONAY_GOVDE_METINLERI,
    };
  }

  /** Belgeyi BAŞTAN basar — yalnız görünüş çözüldüğünde ya da geri göründüğünde. */
  private belgeyiBas(): void {
    if (!this.gorunum) return;
    this.gorunum.webview.html = onayGovdesiHtml(this.girdi());
  }

  /**
   * Tazeleme belgeyi baştan YAZMAZ, yalnız iç gövdeyi gönderir. Belge yeniden
   * yüklenseydi odak ve imleç konumu uçar, kullanıcı cümlesinin ortasında
   * klavyeyi kaybederdi — ölçülen kusur ailesinin aynısı, başka kılıkta.
   */
  private govdeyiTazele(odakNot?: string): void {
    if (!this.gorunum) return;
    void this.gorunum.webview.postMessage({
      tur: "gövde", html: onayIcGovdesi(this.girdi()), odakNot,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 📨 PANELDEN GELEN MESAJLAR
  //
  //   Sağlayıcı KARAR VERMEZ: hükmü yazan tek el `sarmal.onayKararVer`
  //   komutudur ve o da saf `kararIsle` hattına iner. Buradaki tek yargı
  //   GEREKÇE ÖLÇÜSÜDÜR ve o da saf gövdenin işlevidir (`gerekceyiOlc`) —
  //   burada ikinci bir kural yazılmaz.
  // ═══════════════════════════════════════════════════════════════════════

  private async mesaj(m: PanelMesaji): Promise<void> {
    switch (m.tur) {
      case "aç":
        // ⌨️ Founder hükmü 2026-07-29: "kapı açılınca odak kendiliğinden gerekçe
        // kutusuna gitsin." Odak niyeti SAF kuraldan okunur ve YALNIZ kullanıcının
        // kendi açtığı kapıda doğar; tazeleme yolları bu argümanı hiç veremez,
        // dolayısıyla odağı yapısal olarak çalamazlar.
        if (this.durum.acikligiYaz(m.kimlik, m.acik)) this.govdeyiTazele(odakNiyeti(m));
        return;
      case "taslak":
        // Yazılan metin deftere düşer. GÖVDE YENİDEN BASILMAZ: her tuş vuruşunda
        // basmak imleci ve odağı sürekli yeniden kurar; defter zaten yeterlidir.
        this.durum.taslakYaz(m.kimlik, m.metin);
        return;
      case "kapıSeç":
        // TEK TIK: satır açıldı (yukarıdaki "aç" mesajı) ve Adım kaynağında
        // önizleme kipinde, odağı çalmadan gösterilir.
        await vscode.commands.executeCommand(
          "sarmal.onayKapisiAc", m.dosya, this.satirBul(m.dosya, m.kod), m.kod);
        return;
      case "iptal": {
        // İPTAL İLE BOŞ KUTU AYRI ŞEYLERDİR. İptal hiçbir kayıt yazmaz ve kapı
        // satırı kapanır; taslak defterde KALIR, çünkü vazgeçmek silmek değildir.
        const kimlik = onayKimligi({ tur: "kapı", dosya: m.dosya, kod: m.kod });
        this.durum.acikligiYaz(kimlik, false);
        this.govdeyiTazele();
        await vscode.commands.executeCommand("sarmal.onayKararIptal", m.kod);
        return;
      }
      case "kararVer":
        await this.kararIste(m);
        return;
      case "bağlamKopyala":
        await this.baglamiKopyala(m.dosya, m.kod);
        return;
    }
  }

  /** Panelin elindeki güncel çapa satırı — kapı bulunamazsa sıfır (kod bağlayıcıdır). */
  private satirBul(dosya: string, kod: string): number {
    const kume = this.defter.kumeler().find((k) => k.dosya === dosya);
    return kume?.kayitlar.find((k) => k.kapi.kod === kod)?.kapi.satir ?? 0;
  }

  /**
   * 📋 Kapının tam bağlamını panoya yazar (VIT-POSTA-A04). Pano yazımı YALNIZ
   * burada, kabukta yaşar: webview düğme öğeleri metin seçimine kapalıdır ve
   * panel tarafında hiçbir tarayıcı pano ya da seçim yolu kurulmaz. Blok
   * kabuğun kendi kapı defterinden okunur; satır kullanıcıya 1-tabanlı
   * söylenir, çünkü blok editörün satır numarasına götürmek için kopyalanır.
   * Karar mantığına dokunulmaz: bu yol hiçbir damga yazmaz.
   */
  private async baglamiKopyala(dosya: string, kod: string): Promise<void> {
    const kume = this.defter.kumeler().find((k) => k.dosya === dosya);
    const kayit = kume?.kayitlar.find((k) => k.kapi.kod === kod);
    if (!kayit) {
      // Kapı bu arada karara bağlanmış olabilir; panoya hiçbir şey yazılmaz
      // ve sessiz kalınmaz — sebep kullanıcıya açıkça söylenir.
      void vscode.window.showWarningMessage(onayBaglamKapiYok(kod));
      return;
    }
    await vscode.env.clipboard.writeText(onayKapiBaglami({
      kod, ne: kayit.kapi.ne, olcut: kayit.kapi.olcut,
      dosya, satir: kayit.kapi.satir + 1, durum: kayit.kapi.durumMetin,
    }));
    // Bildirim kapının KODUNU taşır: kullanıcı hangi kapıyı taşıdığını görür.
    void vscode.window.showInformationMessage(onayBaglamKopyalandi(kod));
  }

  /**
   * Panelden gelen karar isteği. Gerekçe ölçüsü BURADA, kullanıcının gözünün
   * önünde uygulanır: hata kutunun hemen yanında görünür ve hiçbir şey yazılmaz.
   */
  private async kararIste(
    m: Extract<PanelMesaji, { tur: "kararVer" }>,
  ): Promise<void> {
    const secenek = secenekBul(m.rol);
    if (!secenek) return;                       // tanınmayan rol: hiçbir şey yazılmaz
    const notId = notKimligi(m.dosya, m.kod);
    const olcu = gerekceyiOlc(secenek.notIster, m.not);
    if (olcu.tur === "gerekçeBoş" || olcu.tur === "iptal" || olcu.tur === "geçersiz") {
      this.durum.hataYaz(notId, gerekceZorunlu());
      this.govdeyiTazele();
      return;
    }
    if (olcu.tur === "gerekçeArtık") {
      // SESSİZ KAYIP YOK: yazılmış gerekçe ne atılır ne de seçilmeyen bir damgaya
      // iliştirilir. Yazım durur, metin yerinde kalır, ne yapılacağı söylenir.
      this.durum.hataYaz(notId, gerekceArtik());
      this.govdeyiTazele();
      return;
    }
    this.durum.hatayiSil(notId);
    const sonuc = await vscode.commands.executeCommand<{ tur: string } | undefined>(
      "sarmal.onayKararVer", m.dosya, m.satir, m.kod,
      secenek.damga, secenek.notIster, olcu.not);
    // Karar diske kanıtlanarak indiyse kapı kapandı: taslağı da defterden düşer.
    if (sonuc?.tur === "başarı") this.durum.taslagiSil(notId);
  }

  /**
   * 📬 Dosya+kod ile kapıyı panelde GÖSTERİR ve satırını açar. Kod merceği ile
   * yardımcı komutlar buraya gelir.
   *
   * @returns Kapı panelde bulunduysa doğru.
   */
  async gosterVeAc(dosya: string, kod: string): Promise<boolean> {
    const kume = this.defter.kumeler().find((k) => k.dosya === dosya);
    const kayit = kume?.kayitlar.find((k) => k.kapi.kod === kod);
    if (!kayit) return false;
    this.durum.acikligiYaz(onayKimligi({ tur: "dosya", dosya }), true);
    this.durum.acikligiYaz(onayKimligi({ tur: "kapı", dosya, kod }), true);
    const kart = this.kartiAc();
    kart.reveal(vscode.ViewColumn.Active, false);
    this.govdeyiTazele();
    // Kod merceğinden gelen yol da kullanıcının KENDİ açtığı bir kapıdır; odak
    // orada da gerekçe kutusuna gider ve akış iki girişte de aynı hisseder.
    await kart.webview.postMessage({ tur: "odakla", kimlik: notKimligi(dosya, kod) });
    return true;
  }
}

/**
 * Onay defterini kurar. Görünüm KAYDI YOKTUR: satırlar Makinist ağacında yaşar
 * (makinist.ts) ve kart yan sekmede, ilk `gosterVeAc` çağrısında açılır.
 */
export function onayPaneliKaydi(context: vscode.ExtensionContext): OnayPaneli {
  const saglayici = new OnayPaneli();
  saglayici.simgeKaynaginiBagla(context.extensionUri, eklentiCizelgesi(context.extension));
  return saglayici;
}

/** Karar seçenekleri dışarıdan da okunabilir olsun — nöbet çizelgeyi gerçekten okur. */
export { KARAR_SECENEKLERI };

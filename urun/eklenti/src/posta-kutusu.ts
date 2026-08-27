// ═══════════════════════════════════════════════════════════════════════════
// posta-kutusu.ts — 📬 POSTA KUTUSU GÖRÜNÜŞÜ (kanonun dördüncü sunum yüzeyi)
//
//   Founder onayı bekleyen kapılar burada yaşar. Bugüne kadar bu yüzey bir AĞAÇ
//   GÖRÜNÜŞÜYDÜ ve kararın gerekçesi `showInputBox` ile isteniyordu. Founder aynı
//   şikâyeti ÜÇ KEZ söyledi; sonuncusu şudur: "ya ben bir şerh metni yazmak için
//   ta en yukarıya bakmak zorunda mıyım? posta kutusunun metin alanı için niye bu
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
//   gövde ile gerekçe ölçüsü saf gövdededir (posta-govde.ts); kullanıcı metinleri
//   katalogdadır (yuzey-metinleri.ts). Burada yalnız editör kabuğuna çevirme işi
//   yapılır ve hüküm YİNE tek yazıcıya (`sarmal.postaKararVer` → `kararIsle`)
//   iner.
//
//   İKİNCİ BİR ZAMANLAYICI YOKTUR. Panel kendi nabzını kurmaz; onay kuyruğunun
//   hâlihazırdaki nabzına bağlanır (kaydetme olayı · geciktirmeli yazım turu ·
//   disk izleyicisi).
// ═══════════════════════════════════════════════════════════════════════════

import * as vscode from "vscode";
import { GORUNUS_POSTA_KUTUSU, panelRozeti } from "./yuzey-cekirdek.ts";
import {
  YUZEY_ACIKLAMALARI, YUZEY_BOS_DURUM,
  postaRozetIpucu, POSTA_GOVDE_METINLERI, gerekceZorunlu, gerekceArtik,
  postaKapiBaglami, postaBaglamKopyalandi, postaBaglamKapiYok,
} from "./yuzey-metinleri.ts";
import {
  OnayDefteri, postaKimligi,
  type KapiKaydi, type OnayKapisi,
} from "./onay-cekirdek.ts";
import {
  PanelDurumu, postaGovdesiHtml, postaIcGovdesi, gerekceyiOlc, secenekBul,
  notKimligi, odakNiyeti, KARAR_SECENEKLERI,
  type GovdeGirdisi, type PanelMesaji,
} from "./posta-govde.ts";
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

export class PostaKutusu implements vscode.WebviewViewProvider {
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
  private gorunum?: vscode.WebviewView;
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

  /** Dil ayarı değiştiğinde rozet, açıklama ve gövdeyi aynı turda yeniler. */
  diliTazele(): void {
    if (this.gorunum) this.gorunum.description = YUZEY_ACIKLAMALARI.postaKutusu;
    this.cizdir();
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
    else this.rozetiGuncelle();
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
    this.rozetiGuncelle();
    this.govdeyiTazele();
    this.degisti.fire();
  }

  /**
   * Başlıktaki sayı rozeti — kuyruk boşken rozet hiç görünmez.
   *
   * Rozetin KARARI dört panelin ortak saf çekirdeğine devredilmiştir
   * Founder hükmü (2026-08-27) üç komşu panele de sayı rozeti getirdi ve dördü
   * ayrı ayrı yazsaydı biri sessizce bayatlar, bir panelin sayısı ötekiyle
   * çelişirdi. Sayı yine bu panelin KENDİ defterinden okunur; ortak olan şey
   * sayının kaynağı değil, rozete yazılma biçimidir.
   */
  private rozetiGuncelle(): void {
    if (!this.gorunum) return;
    this.gorunum.badge = panelRozeti(this.defter.kapiSayisi, postaRozetIpucu);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 🖼️ ÇİZİM
  // ═══════════════════════════════════════════════════════════════════════

  resolveWebviewView(gorunum: vscode.WebviewView): void {
    this.gorunum = gorunum;
    gorunum.webview.options = {
      // Karar yüzeyi GİRİŞ ALIR; betiksiz olamaz. Mini Grafın betiksiz disiplini
      // (bir GÖSTERGE olduğu için) aynen yerinde durur ve ona dokunulmadı.
      enableScripts: true,
      // Dış kaynağa hiç bağlanılmaz (STR-3.1): yalnız eklentinin kendi kökü.
      localResourceRoots: this.simgeKoku ? [this.simgeKoku] : [],
    };
    gorunum.description = YUZEY_ACIKLAMALARI.postaKutusu;
    gorunum.webview.onDidReceiveMessage((m: PanelMesaji) => { void this.mesaj(m); });
    // Görünüş gizlenip yeniden açıldığında belge sıfırdan kurulur; durum eklenti
    // tarafında yaşadığı için açıklık da taslaklar da yerinde gelir.
    gorunum.onDidChangeVisibility(() => { if (gorunum.visible) this.yuzeyiKur(); });
    this.yuzeyiKur();
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
    this.rozetiGuncelle();
    this.belgeyiBas();
  }

  /** Gövdeyi basmak için gereken her şeyi toplar. */
  private girdi(): GovdeGirdisi {
    const kumeler = this.defter.kumeler();
    // Dosya satırları AÇIK başlar; kullanıcı kapattıysa kapalı kalır.
    for (const k of kumeler) {
      this.durum.dosyayiVarsayilanAc(postaKimligi({ tur: "dosya", dosya: k.dosya }));
    }
    const webview = this.gorunum?.webview;
    return {
      kumeler,
      durum: this.durum,
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
      bosCumle: YUZEY_BOS_DURUM.postaKutusu,
      metinler: POSTA_GOVDE_METINLERI,
    };
  }

  /** Belgeyi BAŞTAN basar — yalnız görünüş çözüldüğünde ya da geri göründüğünde. */
  private belgeyiBas(): void {
    if (!this.gorunum) return;
    this.gorunum.webview.html = postaGovdesiHtml(this.girdi());
  }

  /**
   * Tazeleme belgeyi baştan YAZMAZ, yalnız iç gövdeyi gönderir. Belge yeniden
   * yüklenseydi odak ve imleç konumu uçar, kullanıcı cümlesinin ortasında
   * klavyeyi kaybederdi — ölçülen kusur ailesinin aynısı, başka kılıkta.
   */
  private govdeyiTazele(odakNot?: string): void {
    if (!this.gorunum) return;
    void this.gorunum.webview.postMessage({
      tur: "gövde", html: postaIcGovdesi(this.girdi()), odakNot,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 📨 PANELDEN GELEN MESAJLAR
  //
  //   Sağlayıcı KARAR VERMEZ: hükmü yazan tek el `sarmal.postaKararVer`
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
          "sarmal.postaKapisiAc", m.dosya, this.satirBul(m.dosya, m.kod), m.kod);
        return;
      case "iptal": {
        // İPTAL İLE BOŞ KUTU AYRI ŞEYLERDİR. İptal hiçbir kayıt yazmaz ve kapı
        // satırı kapanır; taslak defterde KALIR, çünkü vazgeçmek silmek değildir.
        const kimlik = postaKimligi({ tur: "kapı", dosya: m.dosya, kod: m.kod });
        this.durum.acikligiYaz(kimlik, false);
        this.govdeyiTazele();
        await vscode.commands.executeCommand("sarmal.postaKararIptal", m.kod);
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
      void vscode.window.showWarningMessage(postaBaglamKapiYok(kod));
      return;
    }
    await vscode.env.clipboard.writeText(postaKapiBaglami({
      kod, ne: kayit.kapi.ne, olcut: kayit.kapi.olcut,
      dosya, satir: kayit.kapi.satir + 1, durum: kayit.kapi.durumMetin,
    }));
    // Bildirim kapının KODUNU taşır: kullanıcı hangi kapıyı taşıdığını görür.
    void vscode.window.showInformationMessage(postaBaglamKopyalandi(kod));
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
    if (olcu.tur === "gerekçeBoş" || olcu.tur === "iptal") {
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
      "sarmal.postaKararVer", m.dosya, m.satir, m.kod,
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
    if (!kayit || !this.gorunum) return false;
    this.durum.acikligiYaz(postaKimligi({ tur: "dosya", dosya }), true);
    this.durum.acikligiYaz(postaKimligi({ tur: "kapı", dosya, kod }), true);
    this.gorunum.show(true);
    this.govdeyiTazele();
    // Kod merceğinden gelen yol da kullanıcının KENDİ açtığı bir kapıdır; odak
    // orada da gerekçe kutusuna gider ve akış iki girişte de aynı hisseder.
    await this.gorunum.webview.postMessage({ tur: "odakla", kimlik: notKimligi(dosya, kod) });
    return true;
  }
}

/**
 * Görünüşü kurar ve sağlayıcıyı döndürür. Görünüş KİMLİĞİ DEĞİŞMEZ
 * (`sarmalPostaKutusu`): kimlik değişirse kullanıcının panel yerleşimi sıfırlanır.
 * Başlık, başlık altı açıklaması ve boş-durum cümlesi tek kaynaktan
 * (yuzey-cekirdek · yuzey-metinleri) okunur; paket bildirimiyle eşitliği nöbet ölçer.
 */
export function postaKutusuKaydi(context: vscode.ExtensionContext): PostaKutusu {
  const saglayici = new PostaKutusu();
  saglayici.simgeKaynaginiBagla(context.extensionUri, eklentiCizelgesi(context.extension));
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(GORUNUS_POSTA_KUTUSU, saglayici, {
      // Kullanıcı başka panele geçip döndüğünde yazdığı gerekçe DURMALIDIR.
      // Bağlam korunmasa bile taslak defteri metni geri koyardı; ikisi birlikte
      // hem metni hem kaydırma konumunu korur.
      webviewOptions: { retainContextWhenHidden: true },
    }),
  );
  return saglayici;
}

/** Karar seçenekleri dışarıdan da okunabilir olsun — nöbet çizelgeyi gerçekten okur. */
export { KARAR_SECENEKLERI };

// ═══════════════════════════════════════════════════════════════════════════
// onay-paneli.ts — 📬 ONAYLAR: KAPI DEFTERİ VE PANEL İÇİ KARAR (kanonun dördüncü sunum yüzeyi)
//
//   Founder 2026-10-27 (OZK-13 üçüncü hüküm · PNL-A07): onay kapılarının kuyruğu ile karar
//   yüzeyi Sarmal panelinin Makinist sekmesindeki Onaylar bölümünde yaşar ve karar satırın
//   altında verilir. Kapıya tıklayınca dosya editörde Adımın satırında açılır, odak panelde
//   kalır; gerekçe kutusu ile üç eylem kapı satırının hemen altında, panelin içinde belirir.
//   Panel hiçbir içeriği editörün yerine ya da yan sütuna açmaz. Aynı anda YALNIZ BİR kapının
//   karar kademesi açıktır: Founder editörde açılan kartta birden çok kapının gerekçe kutusunun
//   aynı anda açık durmasını dikkat dağıtıcı bulmuştur (2026-10-27).
//
//   0.9.194'te karar yüzeyi editörün etkin sütununda açılan bir WebviewPanel kartına taşınmıştı;
//   kart dosyanın üstünü örtüyor ve odağı alıyordu. Bu dosya artık hiçbir webview kurmaz:
//   kapılar Makinist ağacının Onaylar düğümünde satır olarak durur (makinist.ts), kademeyi
//   Sarmal paneli çizer (panel.ts) ve kullanıcının eylemleri buradaki `mesaj` kapısına iner.
//   Defter, gerekçe taslakları, gerekçe ölçüsü ve hüküm hattı (`sarmal.onayKararVer` →
//   `kararIsle`) DEĞİŞMEDİ; 2026-08-10'da gözle onaylanan düzen (VIT-POSTA-A03) geri gelmiştir.
//
//   Aşağıdaki tarihçe yüzeyin ayrı bir Onaylar görünümü olduğu dönemi anlatır; ölçümleri
//   (giriş kutusunun konumu, webview gerekçesi, klavye) panel içi karar için de geçerlidir.
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
import {
  ONAY_GOVDE_METINLERI, gerekceZorunlu, gerekceArtik,
  onayKapiBaglami, onayBaglamKopyalandi, onayBaglamKapiYok,
} from "./yuzey-metinleri.ts";
import {
  OnayDefteri,
  type KapiKaydi, type OnayKapisi,
} from "./onay-cekirdek.ts";
import {
  PanelDurumu, kararKademesiHtml, gerekceyiOlc, secenekBul,
  notKimligi, odakNiyeti, KARAR_SECENEKLERI,
  type PanelMesaji,
} from "./onay-govde.ts";
// VIT-KIMLIK-A05: karar düğmelerinin geometrik çizimleri satır çizelgesinden okunur —
// gövde saf kaldığı için dosyayı KABUK okur ve metin olarak verir.
import { satirSvgKaynagi, type SatirSimgesi } from "./simge-cizelgesi.ts";
import { readFileSync } from "node:fs";

/**
 * Kararın verildiği yüzey: Sarmal panelinin Makinist sekmesi (panel.ts). Defter yüzeyi tanımaz,
 * yalnız bu iki çağrıyı yapar; böylece karar hattı hangi webview'in içinde çizildiğinden bağımsızdır.
 */
export interface OnayYuzeyi {
  /** Karar kademesi değişti (açılan ya da kapanan kapı, gerekçe hatası): Makinist ağacı yeniden
   *  çizilir. `odakNot` verilirse odak o kapının gerekçe kutusuna gider. */
  tazele(odakNot?: string): void;
  /** Kapıyı göstermek için Makinist sekmesi seçilir, Onaylar düğümü açılır ve panel öne gelir. */
  goster(): Promise<void>;
}

/** Panelden gelebilen karar iletileri; kapı satırının kendisi panelin ağaç satırıdır. */
export const ONAY_ILETILERI: ReadonlySet<string> = new Set(["taslak", "kararVer", "iptal", "bağlamKopyala"]);

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
  /** Gerekçe taslakları ve hataları — tazeleme bunları düşüremez. */
  private readonly durum = new PanelDurumu();
  /** Kararın çizildiği yüzey (Sarmal paneli); bağlanmadıysa defter yine çalışır, çizim yoktur. */
  private yuzey?: OnayYuzeyi;
  /** Karar kademesi açık TEK kapı (Founder 2026-10-27: aynı anda yalnız bir kapı açık). */
  private acik?: { readonly dosya: string; readonly kod: string };
  /** Simge kökü — karar düğmelerinin çizimleri buradan okunur. */
  private simgeKoku?: vscode.Uri;

  /** Simge kaynağını bağlar; verilmezse düğmeler simgesiz kalır (uydurma yapılmaz). */
  simgeKaynaginiBagla(kok: vscode.Uri): void {
    this.simgeKoku = kok;
  }

  /** Kararın çizileceği yüzeyi bağlar (Sarmal paneli kurulurken). */
  yuzeyBagla(y: OnayYuzeyi): void {
    this.yuzey = y;
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

  /** Dil ayarı değiştiğinde kademe yeni dilde yeniden çizilir. */
  diliTazele(): void {
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

  /** Defter değişti: Makinist ağacı yeniden çizilir; karara bağlanıp düşen kapının kademesi kapanır. */
  private cizdir(): void {
    if (this.acik && !this.kayitBul(this.acik.dosya, this.acik.kod)) this.acik = undefined;
    this.degisti.fire();
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 🖼️ KARAR KADEMESİ (PNL-A07)
  // ═══════════════════════════════════════════════════════════════════════

  private kayitBul(dosya: string, kod: string): KapiKaydi | undefined {
    return this.defter.kumeler().find((k) => k.dosya === dosya)?.kayitlar.find((k) => k.kapi.kod === kod);
  }

  /** Karar kademesi açık kapı; yoksa tanımsız. */
  acikKapi(): { dosya: string; kod: string } | undefined {
    return this.acik ? { ...this.acik } : undefined;
  }

  /** Verilen kapının kademesi açık mı? */
  acikMi(dosya: string, kod: string): boolean {
    return this.acik?.dosya === dosya && this.acik.kod === kod;
  }

  /** Kapının kademesini açar; açık olan öteki kapı kapanır (tek kapı). Kapı defterde yoksa yanlış döner. */
  kapiyiAc(dosya: string, kod: string): boolean {
    if (!this.kayitBul(dosya, kod)) return false;
    this.acik = { dosya, kod };
    return true;
  }

  /** Kademeyi kapatır; taslak defterde kalır, çünkü vazgeçmek silmek değildir. */
  kapiyiKapat(): void {
    this.acik = undefined;
  }

  /**
   * Açık kapının karar kademesi (gerekçe kutusu, hata satırı, üç eylem). Yalnız açık kapı için
   * HTML verir; panel onu kapı satırının hemen altına basar.
   */
  kademeHtml(dosya: string, kod: string): string | undefined {
    if (!this.acikMi(dosya, kod)) return undefined;
    const kayit = this.kayitBul(dosya, kod);
    return kayit
      ? kararKademesiHtml({ durum: this.durum, kararSimgeleri: this.kararSimgeleri(), metinler: ONAY_GOVDE_METINLERI }, kayit)
      : undefined;
  }

  /** Kademe değişti: yüzey yeniden çizer; odak niyeti yalnız kullanıcının kendi açtığı kapıda doğar. */
  private govdeyiTazele(odakNot?: string): void {
    this.yuzey?.tazele(odakNot);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 📨 PANELDEN GELEN MESAJLAR
  //
  //   Sağlayıcı KARAR VERMEZ: hükmü yazan tek el `sarmal.onayKararVer`
  //   komutudur ve o da saf `kararIsle` hattına iner. Buradaki tek yargı
  //   GEREKÇE ÖLÇÜSÜDÜR ve o da saf gövdenin işlevidir (`gerekceyiOlc`) —
  //   burada ikinci bir kural yazılmaz.
  // ═══════════════════════════════════════════════════════════════════════

  async mesaj(m: PanelMesaji): Promise<void> {
    switch (m.tur) {
      case "aç":
        // Kapı satırının açılıp kapanması. Tek kapı kuralı burada da geçerlidir. ⌨️ Founder hükmü
        // 2026-07-29: "kapı açılınca odak kendiliğinden gerekçe kutusuna gitsin." Odak niyeti
        // YALNIZ kullanıcının kendi açtığı kapıda doğar; tazeleme yolları odağı çalamaz.
        if (!m.dosya || !m.kod) return;
        if (m.acik) {
          if (this.kapiyiAc(m.dosya, m.kod)) this.govdeyiTazele(odakNiyeti(m));
        } else if (this.acikMi(m.dosya, m.kod)) {
          this.kapiyiKapat();
          this.govdeyiTazele();
        }
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
        if (this.acikMi(m.dosya, m.kod)) this.kapiyiKapat();
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
   * 📬 Dosya+kod ile kapıyı panelde GÖSTERİR ve karar kademesini açar (tek kapı). Kapı satırı,
   * `sarmal.onayKapisiAc` ve kod merceği buraya gelir. Hiçbir webview açılmaz ve editör
   * öne getirilmez: yüzey Makinist sekmesini seçer, Onaylar düğümünü açar ve paneli öne alır.
   *
   * @returns Kapı defterde bulunduysa doğru.
   */
  async gosterVeAc(dosya: string, kod: string): Promise<boolean> {
    if (!this.kapiyiAc(dosya, kod)) return false;
    await this.yuzey?.goster();
    // Kod merceğinden gelen yol da kullanıcının KENDİ açtığı bir kapıdır; odak
    // orada da gerekçe kutusuna gider ve akış iki girişte de aynı hisseder.
    this.govdeyiTazele(notKimligi(dosya, kod));
    return true;
  }
}

/**
 * Onay defterini kurar. Görünüm KAYDI YOKTUR ve webview açılmaz: kapılar Makinist ağacının
 * Onaylar düğümünde, karar kademesi Sarmal panelinde kapı satırının altında çizilir.
 */
export function onayPaneliKaydi(context: vscode.ExtensionContext): OnayPaneli {
  const saglayici = new OnayPaneli();
  saglayici.simgeKaynaginiBagla(context.extensionUri);
  return saglayici;
}

/** Karar seçenekleri dışarıdan da okunabilir olsun — nöbet çizelgeyi gerçekten okur. */
export { KARAR_SECENEKLERI };

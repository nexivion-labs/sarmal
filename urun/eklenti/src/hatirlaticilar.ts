// ═══════════════════════════════════════════════════════════════════════════
// hatirlaticilar.ts — 🔔 HATIRLATICILAR GÖRÜNÜŞÜ (kanonun ikinci sunum yüzeyi)
//
//   Kullanıcının BİLEREK açık bıraktığı işaretler burada yaşar: açık
//   Hatırlatıcı düğümleri, henüz kapanmamış Adımlar ve bloklu ya da geliştirme
//   evresindeki çıpalar. Bunlar düzeltilecek bir sapma değildir; sonraya
//   bırakılmış ve unutulmaması istenen işlerdir. Problems'ta durdukları sürece
//   kullanıcı onları çözülmesi gereken ihlal sanıyordu.
//
//   SAĞLAYICI KARAR VERMEZ. Tanı üretmez, düzey değiştirmez ve Problems
//   koleksiyonunu kendi veri kaynağı yapmaz; kayıtları yönlendirmeden hazır
//   ayrılmış olarak alır. Doğa kararı motorda, gruplama ve özetleme saf
//   çekirdekte (yuzey-cekirdek.ts), kullanıcı metinleri katalogda
//   (yuzey-metinleri.ts) yaşar.
//
//   Yenileme, Proje gruplaması ve satıra gitme desenleri Yol Haritası
//   emsalinden alınmıştır; yeni bir olay hattı ya da tarama kurulmaz.
// ═══════════════════════════════════════════════════════════════════════════

import * as vscode from "vscode";
import {
  GORUNUS_HATIRLATICILAR, projeyeGrupla, dosyayaGrupla, kayitGorunumu,
  hatirlaticiIsareti, panoMetni, panoDugumu, panoAdedi, turDagilimi,
  type SatirIsareti, type YuzeyKaydi, type ProjeKumesi, type YuzeyDosyaKumesi,
  panelRozeti,
  // ✅ KYN-YUZ-A03: ateşlemiş hatırlatıcının kapatılması — karar SAF çekirdekte
  hatirlaticiKapatilabilir, hatirlaticiDurumAlani, hatirlaticiKapatmaAraligi,
  BAGLAM_HATIRLATICI, BAGLAM_HATIRLATICI_ATESLEDI,
} from "./yuzey-cekirdek.ts";
import {
  YUZEY_ACIKLAMALARI, YUZEY_BOS_DURUM,
  projeSatiriEtiketi, projeSatiriAciklamasi, projeSatiriIpucu, kaydaGitBasligi,
  dosyaSatiriAciklamasi, dosyaSatiriIpucu, hatirlaticiRozetIpucu,
  HATIRLATICI_KAPATMA_METINLERI,
} from "./yuzey-metinleri.ts";
import { belirtecle } from "../../cekirdek/src/belirtec.ts";
import { ayristir } from "../../cekirdek/src/ayristirici.ts";
import { satirdaDegerDegistir } from "../../cekirdek/src/deger-yaz.ts";

import { satirIkonu } from "./ortak.ts";
import { eksenSvgVaryanti, type SatirSimgesi } from "./simge-cizelgesi.ts";
// 🏷️ Dosya satırının teknoloji simgesi TEK kaynaktan gelir: çizelge eklentinin
// kendi dil ilanından türer ve ikinci bir eşleme yazılmaz (teknoloji-simgesi.ts).
import { eklentiCizelgesi, teknolojiSimgesi, type SimgeCizelgesi } from "./teknoloji-simgesi.ts";

/**
 * Panelin kendi proje satırı simgesi — geometrik ailenin satır çizelgesinden
 * (VIT-KIMLIK-A05). Yol Haritası seferi kullanır ve Bildirimler gelen kutusunu;
 * üç panel aynı simgeyi taşırsa bakışta ayrılmaz (Founder canlı bulgusu
 * 2026-07-28). Hatırlatıcılar bir yer imi defteridir: kullanıcı bir işi
 * bilerek işaretler ve sonra oraya döner.
 */
const PROJE_SIMGESI: SatirSimgesi = "yerimi";

/**
 * Teknoloji simgesi çözülemeyen dosyanın işareti. Uydurma bir teknoloji simgesi
 * BASILMAZ; satır da işaretsiz kalmaz. Gözlemler panelindeki yedekle aynıdır,
 * çünkü iki panelin dosya satırı aynı soruya aynı biçimde cevap verir.
 */
const DOSYA_YEDEK_SIMGESI: SatirSimgesi = "dosya";

/**
 * Panel düğümü: Proje satırı · Dosya satırı · hatırlatıcı kaydı.
 *
 * FİKİR HANESİ BU PANELDE YAŞAMAZ (VIT-GRAF-A16). Hane bir ara turda bu panelin
 * içinde bir bölüm olarak açılmıştı ve gerekçesi sınıflamanın Fikir tipini
 * Hatırlatıcı'nın söz-verilmemiş kardeşi ilan etmesiydi. Founder 2026-08-08
 * tarihinde bunun tersine hükmetti; gerekçesi Fikrin kendi başına bir düşünce
 * evresi olması ve başka bir tipin penceresine misafir edilmemesidir. Hükmün
 * doğruluğu 2026-08-09 tarihinde canlı görünümde ayrıca ölçüldü: canlı rafa
 * yazılan iki gerçek Fikir bu panelde bulunamadı, çünkü ikisi de yirmi dokuz
 * hatırlatıcı kaydının altında kalmıştı. Hane bugün kendi görünüşünde yaşar
 * (fikirler.ts) ve bu panele bir daha girmez; bölümün geri doğmadığını bir nöbet
 * mekanik olarak ölçer.
 */
type PanelOge =
  | { tur: "proje"; kume: ProjeKumesi }
  | { tur: "dosya"; kume: YuzeyDosyaKumesi }
  | { tur: "kayıt"; kayit: YuzeyKaydi };

export class Hatirlaticilar implements vscode.TreeDataProvider<PanelOge> {
  private degisti = new vscode.EventEmitter<PanelOge | void>();
  readonly onDidChangeTreeData = this.degisti.event;
  private kumeler: ProjeKumesi[] = [];

  /**
   * Panelde yaşayan kayıt sayısı — durum çubuğu bu sayıyı okur.
   *
   * SAYAÇ İKİNCİ KEZ TUTULMAZ: durum çubuğu kendi taramasını kurmaz ve kendi
   * sayacını saymaz, panelin zaten tuttuğu kümeden türetir. İkinci bir sayaç
   * doğarsa panelle durum çubuğu ayrışır ve hangisinin doğru olduğu bilinemez;
   * bu depo aynı kusuru bugün iki kez ölçtü (iki simge çizelgesi · iki dışlama
   * evreni). Türetme, kopyalamanın panzehiridir.
   */
  get kayitSayisi(): number {
    return this.kumeler.reduce((toplam, k) => toplam + k.kayitlar.length, 0);
  }

  gorunum?: vscode.TreeView<PanelOge>;
  /** VIT-KIMLIK-A05: satır simgelerinin üretilmiş varyant kökü (kayıtta bağlanır). */
  eklentiKoku?: vscode.Uri;
  /** Uzantı → teknoloji simgesi çizelgesi; kayıtta eklentinin dil ilanından kurulur. */
  private simgeCizelgesi: SimgeCizelgesi = new Map();

  /** Teknoloji simgesi kaynağını bağlar — panel kendi çizelgesini KURMAZ. */
  simgeKaynaginiBagla(kok: vscode.Uri, cizelge: SimgeCizelgesi): void {
    this.eklentiKoku = kok;
    this.simgeCizelgesi = cizelge;
  }

  /** Dil ayarı değiştiğinde aynı kayıtları yeni okuma yüzüyle yeniden çizer. */
  diliTazele(): void {
    if (!this.gorunum) return;
    this.gorunum.description = YUZEY_ACIKLAMALARI.hatırlatıcılar;
    this.bosDurumuGuncelle();
    this.degisti.fire();
  }

  /**
   * Yüzeye ayrılmış kayıtları yerleştirir ve ağacı bir kez çizdirir. Aynı
   * içerik ikinci kez geldiğinde yenileme olayı ÜRETİLMEZ; yinelenen yenileme
   * sayısını sıfırda tutan yapısal güvence budur.
   */
  yerlestir(kayitlar: readonly YuzeyKaydi[]): void {
    const yeni = projeyeGrupla(kayitlar);
    if (this.aynıMı(yeni)) return;
    this.kumeler = yeni;
    this.bosDurumuGuncelle();
    this.degisti.fire();
  }

  /** İki yerleşimin görünür içeriği aynı mı — yinelenen çizimi önleyen ölçü. */
  private aynıMı(yeni: readonly ProjeKumesi[]): boolean {
    return this.parmakIzi(this.kumeler) === this.parmakIzi(yeni);
  }

  private parmakIzi(kumeler: readonly ProjeKumesi[]): string {
    return kumeler
      .map((k) => `${k.proje.kod}|` + k.kayitlar
        .map((y) => `${y.dosya}:${y.tani.satir}:${y.tani.sutun}:${y.tani.kod}`)
        .join(","))
      .join(";");
  }

  /**
   * Panel boşken ne yapılacağını anlatan cümleyi gösterir.
   *
   * BOŞLUK ÖLÇÜSÜ YALNIZ HATIRLATICILARI SAYAR (VIT-GRAF-A16). Hane Fikirleri de
   * taşırken ölçü iki haneyi birlikte sayıyordu, çünkü aksi hâlde tek bir Fikir
   * yazmış kullanıcı hem fikrini listede görür hem de üstünde bekleyen bir
   * hatırlatıcısı olmadığını okurdu. Fikir hanesi kendi paneline taşınınca o
   * ortak ölçünün sebebi ortadan kalktı ve cümle yeniden yalnız kendi hanesini
   * anlatır oldu.
   */
  private bosDurumuGuncelle(): void {
    if (!this.gorunum) return;
    this.gorunum.message = this.kumeler.length ? undefined : YUZEY_BOS_DURUM.hatırlatıcılar;
    // 🔢 Sayı rozeti panelin KENDİ listesinden türer ve durum çubuğuyla aynı
    // kaynağı okur; iki sayı bu yüzden çelişemez. Yazıcı tektir (ortak.ts).
    this.gorunum.badge = panelRozeti(this.kayitSayisi, hatirlaticiRozetIpucu);
  }

  /** Ağacın kökü Hatırlatıcı Projeleridir; ikinci bir kök hane yoktur. */
  getChildren(oge?: PanelOge): PanelOge[] {
    if (!oge) return this.kumeler.map((kume) => ({ tur: "proje" as const, kume }));
    // AĞACIN ARA KADEMESİ DOSYADIR (VIT-GRAF-A13). Founder canlı görünümde
    // altmış iki kaydın tek yığın hâlinde gezilemediğini bildirdi (2026-07-28);
    // ağaç o gün Proje satırından doğrudan kayıt yığınına iniyordu. Dosya satırı
    // yığını böler ve teknoloji simgesine doğal bir ev açar. Tek kayıtlık dosya
    // da kendi satırını alır: kademe atlanırsa bazı kayıtlar grubun içinde,
    // bazıları yanında durur ve ağacın kademesi bakışta okunmaz olur.
    if (oge.tur === "proje") {
      return dosyayaGrupla(oge.kume.kayitlar).map((kume) => ({ tur: "dosya" as const, kume }));
    }
    if (oge.tur === "dosya") return oge.kume.kayitlar.map((kayit) => ({ tur: "kayıt" as const, kayit }));
    return [];
  }

  getTreeItem(oge: PanelOge): vscode.TreeItem {
    if (oge.tur === "proje") {
      const adet = oge.kume.kayitlar.length;
      // 📊 TÜR ÖZETİ (VIT-GRAF-A15). Gözlemler panelindeki kuralın ta kendisi:
      // dağılım panelin KENDİ kayıt kümesinden türetilir, ikinci bir sayaç
      // kurulmaz ve ağaç üç kademeli kalır. İki panelde iki desen doğarsa kusur
      // ad değiştirerek yaşamaya devam eder.
      const dagilim = turDagilimi(oge.kume.kayitlar);
      const item = new vscode.TreeItem(
        projeSatiriEtiketi(oge.kume.proje.ad, dagilim.baskinlar),
        vscode.TreeItemCollapsibleState.Expanded,
      );
      item.description = projeSatiriAciklamasi(adet, dagilim.turSayisi);
      item.tooltip = new vscode.MarkdownString(
        projeSatiriIpucu(oge.kume.proje.ad, oge.kume.proje.kod, adet, dagilim.tumu));
      item.iconPath = satirIkonu(this.eklentiKoku, PROJE_SIMGESI, "bilgi");
      item.contextValue = "sarmalHatirlaticiProjesi";
      return item;
    }
    if (oge.tur === "dosya") {
      const adet = oge.kume.kayitlar.length;
      const item = new vscode.TreeItem(oge.kume.dosyaAdi, vscode.TreeItemCollapsibleState.Expanded);
      item.description = dosyaSatiriAciklamasi(adet);
      item.tooltip = new vscode.MarkdownString(dosyaSatiriIpucu(oge.kume.dosya, adet));
      // 🏷️ TEKNOLOJİ SİMGESİ YALNIZ DOSYA SATIRINDADIR — Gözlemler panelindeki
      // kuralın ta kendisi. Yaprağa logo koymak kaydın tür sinyalini öldürürdü.
      item.iconPath = this.dosyaIkonu(oge.kume.dosya);
      item.contextValue = "sarmalHatirlaticiDosyasi";
      return item;
    }
    const g = kayitGorunumu(oge.kayit);
    // 🔎 SATIR KENDİ KODUNU SÖYLER VE İŞARETİ TÜRÜNE GÖRE AYRIŞIR.
    //
    // Founder canlı incelemede şunu bildirdi (2026-07-29): "bazıları tıklandığında
    // adımlara gidiyor, bazıları da tıklandığında hatırlatıcıya gidiyor,
    // anlamadım." Ölçüm davranışın DOĞRU olduğunu gösterdi — bu panel tek tip
    // kayıt taşımaz ve tıklama her zaman satırı doğuran kayda gider — fakat
    // okunaklılık kusurluydu: bütün satırlar aynı çanı taşıyordu ve hiçbiri
    // kodunu söylemiyordu, dolayısıyla yönlendirme rastgele hissettiriyordu.
    //
    // İki kararın da kaynağı SAF çekirdektir ve Gözlemler paneli etiket kuralında
    // aynı kaynağı çağırır; iki panelde iki desen doğarsa kusur ad değiştirerek
    // yaşamaya devam eder.
    const item = new vscode.TreeItem(g.kodluEtiket, vscode.TreeItemCollapsibleState.None);
    item.description = g.aciklama;
    item.tooltip = new vscode.MarkdownString(g.ipucu);
    item.iconPath = this.isaretIkonu(hatirlaticiIsareti(g.kod));
    // ✅ EYLEM YUVASI YALNIZ ATEŞLEMİŞ SATIRDA AÇILIR (KYN-YUZ-A03). Uykuda
    // bekleyen hatırlatıcı bilinçle eylemsizdir: hedefi kapanmamış bir taahhüdü
    // tek tıkla düşürmek sessiz vazgeçmeye kapı açar (Adımın sınır hükmü).
    // Karar burada VERİLMEZ, saf çekirdekten okunur.
    item.contextValue = hatirlaticiKapatilabilir(oge.kayit)
      ? BAGLAM_HATIRLATICI_ATESLEDI : BAGLAM_HATIRLATICI;
    item.command = {
      command: "sarmal.dosyaAc",
      title: kaydaGitBasligi(),
      arguments: [g.dosya, g.satir],
    };
    return item;
  }

  /**
   * Dosya satırının simgesi. Çizelgede karşılığı olmayan uzantı için teknoloji
   * simgesi ÜRETİLMEZ; satır geometrik ailenin nötr dosya işaretine düşer.
   */
  private dosyaIkonu(dosya: string): { light: vscode.Uri; dark: vscode.Uri } | undefined {
    if (!this.eklentiKoku) return undefined;
    return teknolojiSimgesi(this.eklentiKoku, this.simgeCizelgesi, dosya)
      ?? satirIkonu(this.eklentiKoku, DOSYA_YEDEK_SIMGESI, "duz");
  }

  /**
   * Saf işaret kararını iki-tema dosya yoluna çevirir. Kabuk hiçbir karar
   * VERMEZ: hangi kaydın hangi işareti taşıyacağını çekirdek söyler, burada
   * yalnız doğru ailenin yol üreticisi seçilir. Eksen ailesi Adım tipinin kendi
   * simgesini taşır (Founder hükmü: "açık Adım kendi eksen simgesini taşısın").
   */
  private isaretIkonu(isaret: SatirIsareti): { light: vscode.Uri; dark: vscode.Uri } | undefined {
    const kok = this.eklentiKoku;
    if (!kok) return undefined;
    if (isaret.aile === "satır") return satirIkonu(kok, isaret.simge, isaret.anlam);
    return {
      light: vscode.Uri.joinPath(kok, eksenSvgVaryanti(isaret.tip, isaret.evre, "acik")),
      dark:  vscode.Uri.joinPath(kok, eksenSvgVaryanti(isaret.tip, isaret.evre, "koyu")),
    };
  }

  /**
   * 📋 Bir ağaç satırının panoya inecek metni. Sağlayıcı panoya YAZMAZ; kararı
   * saf çekirdek verir, yazımı komut yapar. Tanımadığı düğüm için boş döner ve
   * çağıran öteki paneli dener — komut tek olduğu için satırın hangi panelden
   * geldiğini VS Code söylemez.
   */
  panoMetni(oge: unknown): { metin: string; adet: number } | undefined {
    const d = panoDugumu(oge);
    return d ? { metin: panoMetni(d), adet: panoAdedi(d) } : undefined;
  }

  /**
   * ✅ ATEŞLEMİŞ HATIRLATICIYI KAPATIR (KYN-YUZ-A03).
   *
   * TEK YAZAR KAPISININ HATIRLATICI İKİZİDİR ve onun sözleşmesini aynen taşır:
   * yalnız `durum` alanı yazılır, konum ayrıştırıcıdan gelir, yazımdan önce
   * kaynak metinle bayt düzeyinde doğrulanır ve EN KÜÇÜK ŞÜPHEDE dosyaya
   * dokunulmadan dürüst hata döner. Kayıt SİLİNMEZ; kanon tamamlanan
   * hatırlatıcının yerinde kaldığını yazar (SNF-0).
   *
   * TAZELEME AYRI BİR TARAMA KURMAZ: kapatma diske indiğinde gövdenin kendi
   * denetim turu istenir ve hane o turun yayınıyla yeniden basılır; ikinci bir
   * tarama hattı doğarsa panel ile durum çubuğu ayrışır.
   */
  async kapat(oge: unknown, turIste?: (tetik: string) => void): Promise<boolean> {
    const secili = oge as PanelOge | undefined;
    if (!secili || secili.tur !== "kayıt" || !hatirlaticiKapatilabilir(secili.kayit)) {
      void vscode.window.showWarningMessage(HATIRLATICI_KAPATMA_METINLERI.kapatilamaz);
      return false;
    }
    const g = kayitGorunumu(secili.kayit);
    const doc = await vscode.workspace.openTextDocument(secili.kayit.dosya);
    const kaynak = doc.getText();
    let alan: ReturnType<typeof hatirlaticiDurumAlani>;
    try {
      alan = hatirlaticiDurumAlani(ayristir(belirtecle(kaynak)).bildirimler, g.satirKodu);
    } catch {
      // AYRIŞTIRMA HATASI BAŞARI SAYILAMAZ. Bozuk bir dosyaya konum tahminiyle
      // yazmak, onarımı imkânsız bir sessiz bozulma üretirdi.
      void vscode.window.showErrorMessage(
        HATIRLATICI_KAPATMA_METINLERI.basarisiz(g.satirKodu, HATIRLATICI_KAPATMA_METINLERI.ayristirilamadi));
      return false;
    }
    const sonuc = hatirlaticiKapatmaAraligi(kaynak, alan, satirdaDegerDegistir);
    if (sonuc.tur === "zaten-kapalı") {
      void vscode.window.setStatusBarMessage(HATIRLATICI_KAPATMA_METINLERI.zatenKapali(g.satirKodu), 4000);
      return false;
    }
    if (sonuc.tur !== "aralık") {
      void vscode.window.showErrorMessage(
        HATIRLATICI_KAPATMA_METINLERI.basarisiz(g.satirKodu, sonuc.neden));
      return false;
    }
    // SON KONTROL DİSKİN KENDİSİNDEDİR: ölçüm ile yazım arasında belge değişmiş
    // olabilir; değiştiyse yazım yapılmaz ve kullanıcı bunu öğrenir.
    if (doc.lineAt(sonuc.satir).text !== sonuc.eskiSatir) {
      void vscode.window.showErrorMessage(
        HATIRLATICI_KAPATMA_METINLERI.basarisiz(g.satirKodu, HATIRLATICI_KAPATMA_METINLERI.belgeDegisti));
      return false;
    }
    const duzenle = new vscode.WorkspaceEdit();
    duzenle.replace(doc.uri,
      new vscode.Range(sonuc.satir, 0, sonuc.satir, sonuc.eskiSatir.length), sonuc.yeniSatir);
    if (!await vscode.workspace.applyEdit(duzenle)) {
      void vscode.window.showErrorMessage(
        HATIRLATICI_KAPATMA_METINLERI.basarisiz(g.satirKodu, HATIRLATICI_KAPATMA_METINLERI.yazilamadi));
      return false;
    }
    await doc.save();
    vscode.window.setStatusBarMessage(HATIRLATICI_KAPATMA_METINLERI.kapatildi(g.satirKodu), 4000);
    // AYNI TURDA TAZELEME: kullanıcı ikinci bir tarama beklemez.
    turIste?.("hatırlatıcı-kapatma");
    return true;
  }

  getParent(): PanelOge | undefined { return undefined; }
}

/**
 * Görünüşü kurar ve sağlayıcıyı döndürür. Görünüş kimliği paket bildirimiyle
 * TEK kaynaktan gelir; başlık altı açıklaması ve boş-durum cümlesi katalogdan
 * okunur. Sağlayıcı eklenti kapanışında görünümle birlikte serbest bırakılır.
 */
export function hatirlaticilarKaydi(context: vscode.ExtensionContext): Hatirlaticilar {
  const saglayici = new Hatirlaticilar();
  // VIT-KIMLIK-A05: geometrik satır simgeleri · VIT-GRAF-A13: dosya satırının
  // teknoloji simgesi eklentinin KENDİ dil ilanından türer (tek kaynak).
  saglayici.simgeKaynaginiBagla(context.extensionUri, eklentiCizelgesi(context.extension));
  const gorunum = vscode.window.createTreeView<PanelOge>(GORUNUS_HATIRLATICILAR, {
    treeDataProvider: saglayici,
  });
  gorunum.description = YUZEY_ACIKLAMALARI.hatırlatıcılar;
  gorunum.message = YUZEY_BOS_DURUM.hatırlatıcılar;
  saglayici.gorunum = gorunum;
  context.subscriptions.push(gorunum);
  return saglayici;
}

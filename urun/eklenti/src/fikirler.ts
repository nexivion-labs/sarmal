// ═══════════════════════════════════════════════════════════════════════════
// fikirler.ts — 💡 FİKİRLER GÖRÜNÜŞÜ (VIT-GRAF-A16)
//
//   Henüz taahhüde dönüşmemiş ham düşünceler burada yaşar. Bunlar ne düzeltme
//   isteyen bir sapma ne de verilmiş bir sözdür; kullanıcının bir işi üstlenmeden
//   önce kaybetmek istemediği düşüncelerdir.
//
//   HANE NEDEN KENDİ PANELİNE TAŞINDI. Fikir hanesi bir önceki turda
//   Hatırlatıcılar panelinin içinde bir bölüm olarak açılmıştı ve gerekçesi
//   sınıflamanın Fikir tipini Hatırlatıcı'nın söz-verilmemiş kardeşi ilan
//   etmesiydi. Founder 2026-08-08 tarihinde bunun tersine hükmetti; gerekçesi
//   Fikrin kendi başına bir düşünce evresi olması ve başka bir tipin penceresine
//   misafir edilmemesidir. Hükmün doğruluğu 2026-08-09 tarihinde canlı görünümde
//   ayrıca ölçüldü: canlı rafa yazılan iki gerçek Fikir panelde bulunamadı,
//   çünkü ikisi de yirmi dokuz hatırlatıcı kaydının altında kalmıştı.
//
//   BESLENME YOLU DEĞİŞMEDİ. Kayıtlar bugün de tanı turunun ZATEN ürettiği
//   paylaşılan ayrıştırma önbelleğinden okunur, dosya başına deftere yazılır
//   (fikir-cekirdek.FikirDefteri), kapsam süzgeci yüzey defteriyle aynı kalır ve
//   tur sonunda tek yayın yapılır. Bu panelin ikinci bir taraması, ikinci bir
//   dosya okuması ve ikinci bir sayacı YOKTUR; taşınan şey yalnız görünüş
//   kabuğudur.
//
//   SAĞLAYICI KARAR VERMEZ. Satırın etiketi, gri açıklaması ve ipucu saf
//   çekirdeğin tarifinden (fikir-cekirdek.fikirGorunumu) gelir; kullanıcıya
//   görünen cümleler metin kataloğunda (yuzey-metinleri.ts) yaşar. Burada yapılan
//   tek iş o tarifi editör kabuğuna çevirmektir.
//
//   AĞAÇ TEK KADEMEDİR. Kardeş tanı panelleri Proje ile kayıt arasına dosya
//   kademesi koyar, çünkü orada altmış iki kayıt tek yığın hâlinde gezilemiyordu;
//   Fikir hanesi ise doğası gereği küçüktür ve kayıtları kaynak sırasıyla okunur.
//   Kademe eklemek her fikre iki tık uzaklık koyar ve panelin tek vaadini —
//   yazılan fikri bir bakışta görmek — zayıflatır.
// ═══════════════════════════════════════════════════════════════════════════

import * as vscode from "vscode";
import {
  GORUNUS_FIKIRLER, panelRozeti, projeyeGrupla, type ProjeKumesi,
} from "./yuzey-cekirdek.ts";
import {
  YUZEY_ACIKLAMALARI, YUZEY_BOS_DURUM, kaydaGitBasligi, fikirRozetIpucu,
  fikirProjeAciklamasi, fikirProjeIpucu, panoKumeMetni,
} from "./yuzey-metinleri.ts";
import {
  fikirGorunumu, fikirParmakIzi, fikirPanoMetni, type FikirKaydi,
} from "./fikir-cekirdek.ts";
import { satirIkonu } from "./ortak.ts";
import type { SatirSimgesi } from "./simge-cizelgesi.ts";

/**
 * Kayıt satırının işareti — geometrik ailenin Fikir simgesi (VIT-KIMLIK-A05).
 *
 * ŞEKİL TİPİ, RENK ANLAMI SÖYLER. Şekil Fikir tipinin kendi işaretidir; anlam
 * rengi ise nötrdür, çünkü Fikir bir taahhüt DEĞİLDİR ve dikkat çekmeyi hak eden
 * bir aciliyeti yoktur. Renk değerleri burada yaşamaz; yalnız üreticinin anlam
 * çizelgesinde yaşar (YUZ-4.1).
 */
const KAYIT_SIMGESI: SatirSimgesi = "fikir";

/** Proje satırının işareti — Fikir hanesinin kendi ampulü, komşu panellerin
 *  yer imi ve kutu işaretlerinden bakışta ayrılır. */
const PROJE_SIMGESI: SatirSimgesi = "fikir";

/**
 * Panel düğümü. AĞAÇ İKİ KADEMEDİR: Proje → Fikir.
 *
 * ÖLÇÜLMÜŞ KUSUR (Founder canlı bulgusu 2026-08-27): panel bugüne dek düz bir
 * liste çiziyordu ve Founder üç fikri görüp "hangi projenin, belli değil" dedi.
 * Tek köklü düzende düz liste yetiyordu, çünkü panelde tek bir projenin fikirleri
 * yaşıyordu; çalışma alanı iç içe bir çatıya taşınıp çatı odağı bütün projeleri
 * kapsar hâle gelince aynı liste üç projenin fikirlerini ayrımsız yığdı.
 *
 * EKLENEN KADEME YALNIZ PROJEDİR VE DOSYA KADEMESİ BİLEREK AÇILMAMIŞTIR. Komşu
 * iki panelde dosya kademesi vardır, çünkü onlar yüzlerce kayıt taşır ve dosya
 * satırı o yığını böler; Fikirler onlarca kat daha seyrek bir hanedir ve dosya
 * kademesi orada yığın bölmez, yalnız her fikri bir tık uzağa iter. Panelin
 * sadeliği bir nöbetle korunuyordu ve o nöbet bu turda kaldırılmadı, yalnız
 * Founder hükmünün açtığı tek kademeye izin verecek biçimde daraltıldı.
 */
type PanelOge =
  | { tur: "proje"; kume: ProjeKumesi<FikirKaydi> }
  | { tur: "fikir"; kayit: FikirKaydi };

export class Fikirler implements vscode.TreeDataProvider<PanelOge> {
  private degisti = new vscode.EventEmitter<PanelOge | void>();
  readonly onDidChangeTreeData = this.degisti.event;
  private kayitlar: readonly FikirKaydi[] = [];

  /**
   * Panelde yaşayan kayıt sayısı — durum çubuğu bu sayıyı okur.
   *
   * SAYAÇ İKİNCİ KEZ TUTULMAZ: durum çubuğu kendi taramasını kurmaz ve kendi
   * sayacını saymaz, panelin zaten tuttuğu listeden türetir. İkinci bir sayaç
   * doğarsa panelle durum çubuğu ayrışır ve hangisinin doğru olduğu bilinemez;
   * bu depo aynı kusuru üç kez ölçtü (iki simge çizelgesi · iki dışlama evreni ·
   * panel ile durum çubuğu). Türetme, kopyalamanın panzehiridir.
   */
  get kayitSayisi(): number {
    return this.kayitlar.length;
  }

  gorunum?: vscode.TreeView<PanelOge>;
  /** VIT-KIMLIK-A05: satır simgelerinin üretilmiş varyant kökü (kayıtta bağlanır). */
  eklentiKoku?: vscode.Uri;

  /** Simge kaynağını bağlar — panel kendi çizelgesini KURMAZ. */
  simgeKaynaginiBagla(kok: vscode.Uri): void {
    this.eklentiKoku = kok;
  }

  /** Dil ayarı değiştiğinde aynı kayıtları yeni okuma yüzüyle yeniden çizer. */
  diliTazele(): void {
    if (!this.gorunum) return;
    this.gorunum.description = YUZEY_ACIKLAMALARI.fikirler;
    this.bosDurumuGuncelle();
    this.degisti.fire();
  }

  /**
   * Defterden gelen kayıtları yerleştirir ve ağacı bir kez çizdirir. Aynı içerik
   * ikinci kez geldiğinde yenileme olayı ÜRETİLMEZ; yinelenen yenileme sayısını
   * sıfırda tutan yapısal güvence budur ve ölçüyü saf çekirdeğin parmak izi
   * verir, çünkü panelin bastığı her alan o ize girer.
   */
  yerlestir(kayitlar: readonly FikirKaydi[]): void {
    if (fikirParmakIzi(this.kayitlar) === fikirParmakIzi(kayitlar)) return;
    this.kayitlar = [...kayitlar];
    this.bosDurumuGuncelle();
    this.degisti.fire();
  }

  /**
   * Panel boşken ne yapılacağını anlatan cümleyi gösterir. Ölçü YALNIZ bu hanenin
   * kendi kayıtlarıdır; hane Hatırlatıcılar panelinin içindeyken boşluk iki haneyi
   * birlikte sayıyordu ve o ortak ölçü hane taşınırken kaldırıldı.
   */
  private bosDurumuGuncelle(): void {
    if (!this.gorunum) return;
    this.gorunum.message = this.kayitlar.length ? undefined : YUZEY_BOS_DURUM.fikirler;
    // 🔢 Sayı rozeti panelin KENDİ listesinden türer ve durum çubuğuyla aynı
    // kaynağı okur; iki sayı bu yüzden çelişemez. Yazıcı tektir (ortak.ts).
    this.gorunum.badge = panelRozeti(this.kayitSayisi, fikirRozetIpucu);
  }

  /**
   * Ağacın kökü kayıtların kendisidir. Sıra defterde kurulur: kayıtlar dosya
   * adına, bir dosyanın içinde de kaynak satırına göre dizilir, dolayısıyla
   * panelde okunan sıra kaynakta okunan sırayla aynıdır.
   */
  getChildren(oge?: PanelOge): PanelOge[] {
    if (!oge) {
      return projeyeGrupla(this.kayitlar).map((kume) => ({ tur: "proje" as const, kume }));
    }
    if (oge.tur === "proje") {
      return oge.kume.kayitlar.map((kayit) => ({ tur: "fikir" as const, kayit }));
    }
    return [];
  }

  getTreeItem(oge: PanelOge): vscode.TreeItem {
    // Sağlayıcı hiçbir karar VERMEZ: etiketi, gri açıklamayı ve ipucunu saf
    // çekirdeğin tarifinden alır ve yalnız editör kabuğuna çevirir. Dönüş
    // tetikleyicisi gri açıklamada yaşar; kaynağın tam konumu ipucundadır ve
    // satıra tıklandığında kaynak açılır.
    //
    // ETİKET BİÇİMİ PANELLER ARASINDA ORTAKTIR (VIT-GRAF-A15 · Founder hükmü
    // 2026-08-08). Fikir satırı da kodunu başında taşır ve kod ile cümle
    // arasındaki ayracı hatırlatıcı satırlarıyla AYNI işlev kurar; hane kendi
    // paneline taşınırken bu ortaklık korunmuştur, çünkü panel değişse de
    // kullanıcının okuduğu satır kuralı değişmemelidir.
    if (oge.tur === "proje") {
      const adet = oge.kume.kayitlar.length;
      const item = new vscode.TreeItem(
        oge.kume.proje.ad, vscode.TreeItemCollapsibleState.Expanded,
      );
      // TÜR ÖZETİ BURADA YOKTUR VE BU BİLİNÇLİDİR: komşu panellerdeki özet tanı
      // TÜRLERİNİ sayar, oysa Fikir tek bir türdür ve "1 tür" demek hiçbir şey
      // söylemez. Proje satırı bu yüzden yalnız adedi bildirir.
      item.description = fikirProjeAciklamasi(adet);
      item.tooltip = new vscode.MarkdownString(
        fikirProjeIpucu(oge.kume.proje.ad, oge.kume.proje.kod, adet));
      item.iconPath = satirIkonu(this.eklentiKoku, PROJE_SIMGESI, "bilgi");
      item.contextValue = "sarmalFikirProjesi";
      return item;
    }
    const f = fikirGorunumu(oge.kayit);
    const item = new vscode.TreeItem(f.etiket, vscode.TreeItemCollapsibleState.None);
    item.description = f.aciklama;
    item.tooltip = new vscode.MarkdownString(f.ipucu);
    item.iconPath = satirIkonu(this.eklentiKoku, KAYIT_SIMGESI, "notr");
    item.contextValue = "sarmalFikir";
    item.command = {
      command: "sarmal.dosyaAc",
      title: kaydaGitBasligi(),
      arguments: [f.dosya, f.satir],
    };
    return item;
  }

  /**
   * 📋 Bir ağaç satırının panoya inecek metni. Sağlayıcı panoya YAZMAZ; kararı
   * saf çekirdek verir, yazımı komut yapar. Tanımadığı düğüm için boş döner,
   * çünkü kopyalama komutu TEKTİR ve satırın hangi panelden geldiğini VS Code
   * söylemez.
   */
  panoMetni(oge: unknown): { metin: string; adet: number } | undefined {
    if (typeof oge !== "object" || oge === null || !("tur" in oge)) return undefined;
    const d = oge as { tur: string; kayit?: FikirKaydi; kume?: ProjeKumesi<FikirKaydi> };
    if (d.tur === "fikir" && d.kayit) return { metin: fikirPanoMetni(d.kayit), adet: 1 };
    // PROJE SATIRI DA KOPYALANIR VE KOMŞU PANELLERİN KURALINI İZLER
    // (VIT-GRAF-A17). Kopyalama eylemi artık satırın üzerine gelindiğinde
    // düğme olarak da belirdiği için her satırın bir cevabı olmak zorundadır;
    // görünen ama iş görmeyen bir düğme, keşfedilebilirlik adına eklenmiş
    // olmasına rağmen keşfedileni boşa çıkarır. Küme hiçbir kaydı düşürmez ve
    // blokları ORTAK birleştirici dizer (yuzey-metinleri.panoKumeMetni);
    // panele özgü ikinci bir pano biçimi doğmaz.
    if (d.tur === "proje" && d.kume?.proje && d.kume.kayitlar) {
      return {
        metin: panoKumeMetni(d.kume.proje.ad, d.kume.kayitlar.map(fikirPanoMetni)),
        adet: d.kume.kayitlar.length,
      };
    }
    return undefined;
  }

  getParent(): PanelOge | undefined { return undefined; }
}

/**
 * Görünüşü kurar ve sağlayıcıyı döndürür (Hatırlatıcılar emsalinin ikizi).
 * Görünüş kimliği paket bildirimiyle TEK kaynaktan gelir; başlık altı açıklaması
 * ve boş-durum cümlesi katalogdan okunur. Sağlayıcı eklenti kapanışında görünümle
 * birlikte serbest bırakılır.
 */
export function fikirlerKaydi(context: vscode.ExtensionContext): Fikirler {
  const saglayici = new Fikirler();
  saglayici.simgeKaynaginiBagla(context.extensionUri);
  const gorunum = vscode.window.createTreeView<PanelOge>(GORUNUS_FIKIRLER, {
    treeDataProvider: saglayici,
  });
  gorunum.description = YUZEY_ACIKLAMALARI.fikirler;
  gorunum.message = YUZEY_BOS_DURUM.fikirler;
  saglayici.gorunum = gorunum;
  context.subscriptions.push(gorunum);
  return saglayici;
}

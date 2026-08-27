// ═══════════════════════════════════════════════════════════════════════════
// bildirimler.ts — 🛈 BİLDİRİMLER GÖRÜNÜŞÜ (kanonun üçüncü sunum yüzeyi)
//
//   Motorun düzeltme istemediği, yalnız haber verdiği bilgi düzeyli ölçüm,
//   durum ve vade işaretleri burada yaşar. Bunlar Problems'ta durduğu sürece
//   gerçek sapmayı sayıca boğuyordu: kullanıcı üç yüz bilgi satırının arasında
//   iki hatayı göremiyordu.
//
//   ÜÇ SÖZLEŞME BURADA TUTULUR. Birincisi, bilgi kaydı sunum sırasında uyarıya
//   ya da hataya yükseltilmez — düzey motorun kararıdır. İkincisi, bilinçli
//   Hatırlatıcı bu panele alınmaz; onun kendi yüzeyi vardır. Üçüncüsü, aynı
//   kökten gelen yığın tek özet altında toplanır fakat hiçbir kayıt elenmez:
//   özet satırı sayıyı söyler, kayıtlar bir kademe altta tek tek durur.
//
//   Doğa kararı motorda, gruplama ve özetleme saf çekirdekte (yuzey-cekirdek.ts),
//   kullanıcı metinleri katalogda (yuzey-metinleri.ts) yaşar.
// ═══════════════════════════════════════════════════════════════════════════

import * as vscode from "vscode";
import {
  GORUNUS_BILDIRIMLER, projeyeGrupla, dosyayaGrupla, kayitGorunumu,
  panoMetni, panoDugumu, panoAdedi, turDagilimi,
  type YuzeyKaydi, type ProjeKumesi, type YuzeyDosyaKumesi,
  panelRozeti,
} from "./yuzey-cekirdek.ts";
import {
  YUZEY_ACIKLAMALARI, YUZEY_BOS_DURUM,
  projeSatiriEtiketi, projeSatiriAciklamasi, projeSatiriIpucu,
  dosyaSatiriAciklamasi, dosyaSatiriIpucu, kaydaGitBasligi, gozlemRozetIpucu,
} from "./yuzey-metinleri.ts";
import { BILDIRIM_ROZET } from "./yol-dekor.ts";
import { satirIkonu } from "./ortak.ts";
import type { SatirSimgesi } from "./simge-cizelgesi.ts";
// 🏷️ Dosya satırının teknoloji simgesi TEK kaynaktan gelir: çizelge eklentinin
// kendi dil ilanından türer ve ikinci bir eşleme yazılmaz (teknoloji-simgesi.ts).
import { eklentiCizelgesi, teknolojiSimgesi, type SimgeCizelgesi } from "./teknoloji-simgesi.ts";

/**
 * Panelin kendi proje satırı simgesi — geometrik ailenin satır çizelgesinden
 * (VIT-KIMLIK-A05). Yol Haritası seferi kullanır ve Hatırlatıcılar yer imini;
 * üç panel aynı simgeyi taşırsa bakışta ayrılmaz (Founder canlı bulgusu
 * 2026-07-28). Bildirimler gelen kutusudur: kayıtlar buraya düşer, kullanıcı
 * okur, hiçbiri düzeltme istemez.
 */
const PROJE_SIMGESI: SatirSimgesi = "kutu";

/**
 * Teknoloji simgesi çözülemeyen dosyanın işareti. Uydurma bir teknoloji simgesi
 * BASILMAZ — yanlış teknoloji göstermek hiç göstermemekten kötüdür — fakat satır
 * da işaretsiz bırakılmaz; geometrik ailenin nötr dosya işareti "burada bir dosya
 * var" der ve hiçbir teknoloji iddiasında bulunmaz.
 */
const DOSYA_YEDEK_SIMGESI: SatirSimgesi = "dosya";

/**
 * Panel düğümü: Proje satırı · Dosya satırı · tek kayıt (VIT-GRAF-A13).
 *
 * AĞAÇ ÜÇ KADEMEDİR VE ARA KADEME DOSYADIR. Önceki düzende ara kademe aynı-kök
 * özetiydi ve ölçüm şunu gösterdi: tek bir özet satırının altında yüz otuz altı
 * kayıt yığılıyordu, yani ara kademe yığını BÖLMÜYORDU. Founder canlı görünümde
 * altmış iki kaydın gezilemediğini bildirdi (2026-07-28) ve kabul ölçütü ağacın
 * üç kademesini adıyla saydı: Proje, Dosya, kayıt.
 *
 * KÖK ÖZETİ KAYBOLMADI, YER DEĞİŞTİRDİ. Aynı kökten geldiğini söyleyen bilgi
 * artık her satırın KENDİ kodunda ve ipucunda yaşar; kökün insan başlığını
 * üreten `ozetSatiriEtiketi` kataloğu ve `kokeGoreOzetle` çekirdeği yerinde
 * durur ve nöbetlidir. Dördüncü bir kademe açmak yerine üçte kalmanın gerekçesi
 * şudur: iki panelin aynı deseni kullanması, kademelerin panelden panele
 * değişmemesini gerektirir ve derin ağaçta kullanıcı her kayda dört tıkla iner.
 */
type PanelOge =
  | { tur: "proje"; kume: ProjeKumesi }
  | { tur: "dosya"; kume: YuzeyDosyaKumesi }
  | { tur: "kayıt"; kayit: YuzeyKaydi };

export class Bildirimler implements vscode.TreeDataProvider<PanelOge> {
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
    this.gorunum.description = YUZEY_ACIKLAMALARI.bildirimler;
    this.bosDurumuGuncelle();
    this.degisti.fire();
  }

  /**
   * Yüzeye ayrılmış kayıtları yerleştirir. İçerik değişmediyse yenileme olayı
   * üretilmez; yinelenen yenileme sayısı yapısal olarak sıfırdır.
   */
  yerlestir(kayitlar: readonly YuzeyKaydi[]): void {
    const yeni = projeyeGrupla(kayitlar);
    if (this.parmakIzi(this.kumeler) === this.parmakIzi(yeni)) return;
    this.kumeler = yeni;
    this.bosDurumuGuncelle();
    this.degisti.fire();
  }

  private parmakIzi(kumeler: readonly ProjeKumesi[]): string {
    return kumeler
      .map((k) => `${k.proje.kod}|` + k.kayitlar
        .map((y) => `${y.dosya}:${y.tani.satir}:${y.tani.sutun}:${y.tani.kod}`)
        .join(","))
      .join(";");
  }

  private bosDurumuGuncelle(): void {
    if (!this.gorunum) return;
    this.gorunum.message = this.kumeler.length ? undefined : YUZEY_BOS_DURUM.bildirimler;
    // 🔢 Sayı rozeti panelin KENDİ listesinden türer ve durum çubuğuyla aynı
    // kaynağı okur; iki sayı bu yüzden çelişemez. Yazıcı tektir (ortak.ts).
    this.gorunum.badge = panelRozeti(this.kayitSayisi, gozlemRozetIpucu);
  }

  getChildren(oge?: PanelOge): PanelOge[] {
    if (!oge) return this.kumeler.map((kume) => ({ tur: "proje" as const, kume }));
    if (oge.tur === "proje") {
      // HER KAYIT BİR DOSYA SATIRININ ALTINDA YAŞAR — tek kayıtlık dosya da kendi
      // satırını alır. Kademe atlamak, bazı kayıtları grubun içinde bazılarını
      // grupların yanında bırakır ve ağacın kademesi bakışta okunmaz olur
      // (Founder canlı bulgusu 2026-07-28). Bir tık kazanmak, ağacın okunur
      // olmasından ve her kaydın teknoloji simgesini görmesinden daha ucuzdur.
      return dosyayaGrupla(oge.kume.kayitlar).map((kume) => ({ tur: "dosya" as const, kume }));
    }
    if (oge.tur === "dosya") return oge.kume.kayitlar.map((kayit) => ({ tur: "kayıt" as const, kayit }));
    return [];
  }

  getTreeItem(oge: PanelOge): vscode.TreeItem {
    if (oge.tur === "proje") {
      const adet = oge.kume.kayitlar.length;
      // 📊 TÜR ÖZETİ (VIT-GRAF-A15). Dağılım panelin KENDİ kayıt kümesinden
      // türetilir; ikinci bir tarama ya da ikinci bir sayaç kurulmaz ve ağaca
      // dördüncü bir kademe eklenmez — geri gelen şey bir kademe değil, satırdır.
      const dagilim = turDagilimi(oge.kume.kayitlar);
      const item = new vscode.TreeItem(
        projeSatiriEtiketi(oge.kume.proje.ad, dagilim.baskinlar),
        vscode.TreeItemCollapsibleState.Collapsed,
      );
      item.description = projeSatiriAciklamasi(adet, dagilim.turSayisi);
      item.tooltip = new vscode.MarkdownString(
        projeSatiriIpucu(oge.kume.proje.ad, oge.kume.proje.kod, adet, dagilim.tumu));
      item.iconPath = satirIkonu(this.eklentiKoku, PROJE_SIMGESI, "bilgi");
      item.contextValue = "sarmalBildirimProjesi";
      return item;
    }
    if (oge.tur === "dosya") {
      const adet = oge.kume.kayitlar.length;
      const item = new vscode.TreeItem(oge.kume.dosyaAdi, vscode.TreeItemCollapsibleState.Collapsed);
      item.description = dosyaSatiriAciklamasi(adet);
      item.tooltip = new vscode.MarkdownString(dosyaSatiriIpucu(oge.kume.dosya, adet));
      // 🏷️ TEKNOLOJİ SİMGESİ YALNIZ BURADA. Yaprak satıra logo konsaydı tür
      // sinyali ölürdü: yaprakta RENK türü söyler ve dosya yolundan gelen bir SVG
      // tema rengiyle boyanamaz. Simgenin doğal evi dosya satırıdır.
      item.iconPath = this.dosyaIkonu(oge.kume.dosya);
      item.contextValue = "sarmalBildirimDosyasi";
      return item;
    }
    const g = kayitGorunumu(oge.kayit);
    const rozet = BILDIRIM_ROZET[g.tur];
    // 🔎 SATIR KENDİ KODUNU SÖYLER: kullanıcı tıklamadan nereye gideceğini bilir.
    // Karar saf çekirdekte verilir ve Hatırlatıcılar paneli AYNI kaynağı çağırır;
    // iki panelde iki desen doğarsa kusur ad değiştirerek yaşamaya devam eder.
    const item = new vscode.TreeItem(g.kodluEtiket, vscode.TreeItemCollapsibleState.None);
    item.description = g.aciklama;
    item.tooltip = new vscode.MarkdownString(`${g.ipucu}\n\n${rozet.ne}`);
    // YAPRAĞIN TÜR RENGİNE DOKUNULMAZ. Üç türün rengi ve tek şekil kuralı
    // yerindedir: şekil kademeyi, renk türü söyler. Renk YALNIZ anlam ekseninden
    // gelir; ham değer bu dosyada da gömülü değildir (YUZ-4.1 — değer yalnız
    // arac/simge-uret.mjs çizelgesinde yaşar).
    item.iconPath = satirIkonu(this.eklentiKoku, rozet.simge, rozet.anlam);
    item.contextValue = "sarmalBildirim";
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
   * 📋 Bir ağaç satırının panoya inecek metni. Sağlayıcı panoya YAZMAZ; kararı
   * saf çekirdek verir, yazımı komut yapar. Tanımadığı düğüm için boş döner ve
   * çağıran öteki paneli dener — komut tek olduğu için satırın hangi panelden
   * geldiğini VS Code söylemez.
   */
  panoMetni(oge: unknown): { metin: string; adet: number } | undefined {
    const d = panoDugumu(oge);
    return d ? { metin: panoMetni(d), adet: panoAdedi(d) } : undefined;
  }

  getParent(): PanelOge | undefined { return undefined; }
}

/** Görünüşü kurar ve sağlayıcıyı döndürür (Hatırlatıcılar emsalinin ikizi). */
export function bildirimlerKaydi(context: vscode.ExtensionContext): Bildirimler {
  const saglayici = new Bildirimler();
  // VIT-KIMLIK-A05: geometrik satır simgeleri · VIT-GRAF-A13: dosya satırının
  // teknoloji simgesi eklentinin KENDİ dil ilanından türer (tek kaynak).
  saglayici.simgeKaynaginiBagla(context.extensionUri, eklentiCizelgesi(context.extension));
  const gorunum = vscode.window.createTreeView<PanelOge>(GORUNUS_BILDIRIMLER, {
    treeDataProvider: saglayici,
  });
  gorunum.description = YUZEY_ACIKLAMALARI.bildirimler;
  gorunum.message = YUZEY_BOS_DURUM.bildirimler;
  saglayici.gorunum = gorunum;
  context.subscriptions.push(gorunum);
  return saglayici;
}

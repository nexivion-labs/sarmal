// ═══════════════════════════════════════════════════════════════════════════
// taban-kanon.ts — 🪧 SESSİZ DÜŞÜŞÜN SONU (EKL-F6-A04)
//
//   Ölçülmüş kusur: tip sistemi kaydı bulunamadığında eklenti gömülü taban
//   kanona düşüyor ve bunu kullanıcıya HİÇ söylemiyordu. Sessiz düşüş, kusurun
//   kendisidir; çünkü renkler ve ipuçları çalışmaya devam ettiği için kullanıcı
//   eksik bir kanonla çalıştığını fark etmez ve gördüğü şeyin projesinin kendi
//   tip sistemi olduğunu sanır.
//
//   İŞARETİN BİÇİMİ NEDEN DURUM ÇUBUĞUDUR. İki aday vardı: tek seferlik bir
//   bilgi iletisi ve durum çubuğu girdisi. Durum çubuğu seçildi, gerekçesi
//   ölçülmüş bir derstir. Birincisi, bilgi iletisi kullanıcının işini keser ve
//   birkaç saniye sonra kaybolur; kaybolduktan sonra hâlâ taban kanonla
//   çalışıldığını hiçbir yerden okuyamazsınız, oysa bu durum dosya açık kaldığı
//   sürece sürer. İkincisi, VIT-KIMLIK-A04 hükmü ürünle ilk karşılaşmanın bir
//   izin sorusu ya da bir açılış kutusu olmamasını buyurur; açılışta beliren bir
//   ileti tam olarak kaldırılan davranışın kardeşidir. Durum çubuğu girdisi ise
//   görünürdür, işi kesmez, ipucunda sebebi ve çözümü tam cümleyle söyler ve
//   kanon bulunur bulunmaz kendiliğinden kaybolur.
//
//   SAF ÇEKİRDEK AYRIMI: karar (düşüldü mü, hangi belgede) `vscode` bilmez;
//   yalnız görünen kabuk vscode kullanır. Nöbet kararı kabuk olmadan ölçer.
// ═══════════════════════════════════════════════════════════════════════════

import * as vscode from "vscode";
import { TABAN_KANON_METINLERI } from "./yuzey-metinleri.ts";

/**
 * EKL-F6-A09: kanon işaretçisini yazan komutun kimliği. İşarete tıklamak bu
 * komutu çalıştırır; paket bildirimi ile kabuğun kaydı da aynı kimliği kullanır.
 */
export const KANON_ISARETCISI_KOMUTU = "sarmal.kanonIsaretcisiYaz";

/** Taban kanon durumu: düşüldü mü, son ölçüm hangi belgede yapıldı ve tam denetim hangi köklerde koşmadı. */
export interface TabanKanonDurumu {
  readonly düşüldü: boolean;
  readonly belge?: string;
  /**
   * EKL-F6-A09: tam proje denetiminin hiçbir kanon bulunamadığı için KOŞMADIĞI
   * kökler. Bu liste boş değilse panelin boşluğu ağacın temiz olduğu anlamına
   * gelmez ve işaret bunu her şeyden önce söyler.
   */
  readonly atlanan: readonly string[];
}

let durum: TabanKanonDurumu = { düşüldü: false, atlanan: [] };
const dinleyiciler = new Set<(d: TabanKanonDurumu) => void>();

function yayınla(yeni: TabanKanonDurumu): void {
  const değişti = yeni.düşüldü !== durum.düşüldü || yeni.belge !== durum.belge
    || yeni.atlanan.join("\n") !== durum.atlanan.join("\n");
  durum = yeni;
  if (değişti) for (const d of dinleyiciler) d(durum);
}

/** Kanon kaydı bulunamadı ve gömülü taban kanonla çalışılıyor. */
export function tabanKanonaDusuldu(belgeYolu: string): void {
  yayınla({ düşüldü: true, belge: belgeYolu, atlanan: durum.atlanan });
}

/** Kanon kaydı bulundu — işaret kalkar. */
export function tabanKanonBulundu(): void {
  if (durum.düşüldü) yayınla({ düşüldü: false, atlanan: durum.atlanan });
}

/**
 * EKL-F6-A09: bir denetim turunun kök hükmü. `olculen` bu turda denetlenmesi
 * istenen köklerdir, `atlanan` ise bunlardan kanon bulunamadığı için tam
 * denetimi koşmayanlardır. Tam turda eski kayıt baştan kurulur; daraltılmış
 * turda yalnız ölçülen köklerin hanesi tazelenir ve öteki köklerin kaydı korunur,
 * çünkü onlar bu turda hiç sorulmamıştır.
 */
export function tamDenetimSonucu(olculen: readonly string[], atlanan: readonly string[], tamTur: boolean): void {
  const kume = new Set(tamTur ? [] : durum.atlanan);
  for (const kok of olculen) kume.delete(kok);
  for (const kok of atlanan) kume.add(kok);
  yayınla({ ...durum, atlanan: [...kume].sort() });
}

/** Bugünkü durum — nöbet ve kabuk buradan okur. */
export function tabanKanonDurumu(): TabanKanonDurumu {
  return durum;
}

/** Durum değiştiğinde haber verir; aboneliği geri verir. */
export function tabanKanonDinle(dinleyici: (d: TabanKanonDurumu) => void): { dispose(): void } {
  dinleyiciler.add(dinleyici);
  return { dispose: () => { dinleyiciler.delete(dinleyici); } };
}

/** Yalnız nöbet içindir: kayıt sıfırlanır, iki sınama birbirinin izini ölçmez. */
export function tabanKanonSifirla(): void {
  durum = { düşüldü: false, atlanan: [] };
  dinleyiciler.clear();
}

/**
 * Durum çubuğundaki işaret. Sıfır kayıt tutmaz ve kendi taraması yoktur:
 * yalnız yukarıdaki kararı aynalar. Kanon bulunduğunda gizlenir, çünkü hiçbir
 * şey söylemeyen kalıcı bir girdi durum çubuğunda yer israfıdır.
 */
export class TabanKanonCubugu {
  private readonly oge: vscode.StatusBarItem;
  private readonly abone: { dispose(): void };

  constructor() {
    // Sağ tarafta ve düşük öncelikte durur: bu bir sayaç değil, bir uyarıdır;
    // soldaki dört yüzey sayacının sırasını bozmaz.
    this.oge = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 0);
    this.oge.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground");
    // İpucunun önerdiği çözüm tek tıkla çalışır: işaret, işaretçi komutunu çağırır.
    this.oge.command = KANON_ISARETCISI_KOMUTU;
    this.abone = tabanKanonDinle(() => this.tazele());
    this.tazele();
  }

  /**
   * Kararı aynalar — görünür ya da görünmez. Tam denetimin koşmadığı hâl önce
   * gelir, çünkü o hâlde panel eksik konuşmaktadır; kanon düşüşü ise yalnız
   * hangi kanonla çalışıldığını söyler ve tanıların eksik olduğunu söylemez.
   */
  tazele(): void {
    const d = tabanKanonDurumu();
    if (d.atlanan.length > 0) {
      this.oge.text = TABAN_KANON_METINLERI.atlandiMetni;
      this.oge.tooltip = TABAN_KANON_METINLERI.atlandiIpucu(d.atlanan);
      this.oge.show();
      return;
    }
    if (!d.düşüldü) { this.oge.hide(); return; }
    this.oge.text = TABAN_KANON_METINLERI.cubukMetni;
    this.oge.tooltip = TABAN_KANON_METINLERI.cubukIpucu(d.belge);
    this.oge.show();
  }

  dispose(): void {
    this.abone.dispose();
    this.oge.dispose();
  }
}

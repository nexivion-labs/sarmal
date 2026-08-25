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

/** Taban kanon durumu: düşüldü mü ve son ölçüm hangi belgede yapıldı. */
export interface TabanKanonDurumu {
  readonly düşüldü: boolean;
  readonly belge?: string;
}

let durum: TabanKanonDurumu = { düşüldü: false };
const dinleyiciler = new Set<(d: TabanKanonDurumu) => void>();

function yayınla(yeni: TabanKanonDurumu): void {
  const değişti = yeni.düşüldü !== durum.düşüldü || yeni.belge !== durum.belge;
  durum = yeni;
  if (değişti) for (const d of dinleyiciler) d(durum);
}

/** Kanon kaydı bulunamadı ve gömülü taban kanonla çalışılıyor. */
export function tabanKanonaDusuldu(belgeYolu: string): void {
  yayınla({ düşüldü: true, belge: belgeYolu });
}

/** Kanon kaydı bulundu — işaret kalkar. */
export function tabanKanonBulundu(): void {
  if (durum.düşüldü) yayınla({ düşüldü: false });
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
  durum = { düşüldü: false };
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
    this.oge.text = TABAN_KANON_METINLERI.cubukMetni;
    this.oge.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground");
    this.abone = tabanKanonDinle(() => this.tazele());
    this.tazele();
  }

  /** Kararı aynalar — görünür ya da görünmez. */
  tazele(): void {
    const d = tabanKanonDurumu();
    if (!d.düşüldü) { this.oge.hide(); return; }
    this.oge.tooltip = TABAN_KANON_METINLERI.cubukIpucu(d.belge);
    this.oge.show();
  }

  dispose(): void {
    this.abone.dispose();
    this.oge.dispose();
  }
}

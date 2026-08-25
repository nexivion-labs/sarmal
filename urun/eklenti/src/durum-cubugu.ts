// ═══════════════════════════════════════════════════════════════════════════
// durum-cubugu.ts — 📊 DÖRT YÜZEYİN DURUM ÇUBUĞU SAYAÇLARI (VIT-GRAF-A13)
//
//   Founder hükmü 2026-07-28: "şu kısımda tüm bildirim, posta, hata ve uyarı,
//   hepsi görünsün." Ölçüm o gün şunu gösterdi: durum çubuğunda Sarmal'a ait
//   HİÇBİR girdi yoktu; yalnız VS Code'un kendi hata ve uyarı sayacı vardı.
//
//   SAYAÇ İKİNCİ KEZ TUTULMAZ. Bu modül kendi taramasını KURMAZ, kendi kaydını
//   TUTMAZ ve kendi zamanlayıcısını AÇMAZ. Sayıları, panellerin zaten tuttuğu
//   kümelerden TÜRETİR; sorunlar ise motorun kendi tanı koleksiyonundan okunur.
//   Gerekçesi ölçülmüş bir derstir: bu depo bugün aynı kusuru iki kez yakaladı —
//   iki simge çizelgesi sessizce ayrışmıştı ve iki dışlama evreni birbirinden
//   sapmıştı. İkinci bir sayaç doğsaydı panel ile durum çubuğu ayrışır ve
//   kullanıcı hangisinin doğru olduğunu bilemezdi. Türetme, kopyalamanın
//   panzehiridir.
//
//   SIFIR DA BİR BİLGİDİR. Girdi, sayı sıfırken de görünür kalır; kaybolan bir
//   sayaç ile bozulmuş bir sayaç kullanıcı gözünde aynı şeydir. Sıfır görmek,
//   ölçümün çalıştığını görmektir.
// ═══════════════════════════════════════════════════════════════════════════

import * as vscode from "vscode";
import { durumCubuguIpucu, DURUM_CUBUGU_METINLERI } from "./yuzey-metinleri.ts";
// Girdi çizelgesi SAF çekirdektedir: nöbet onu vscode kabuğu olmadan koşturur.
import { DURUM_CUBUGU_GIRDILERI as GIRDILER, type SayacKaynagi } from "./yuzey-cekirdek.ts";

/**
 * Dört yüzeyi tek bir durum çubuğu girdisinde toplar. Tek girdi seçildi çünkü
 * beş ayrı girdi durum çubuğunu işgal eder ve kullanıcının başka eklentileri
 * de oraya yazar; tek girdi hem sayıların tamamını gösterir hem komşuya yer
 * bırakır. Tıklama, en ACİL yüzeye götürür: sorun varsa Problems, yoksa karar
 * bekleyen kapı, o da yoksa hatırlatıcı.
 */
export class DurumCubugu {
  private readonly ogeler: vscode.StatusBarItem[] = [];

  constructor(private readonly kaynak: SayacKaynagi) {
    // Sağdan sola yerleşir; öncelik sayısı büyük olan SOLDA durur. Girdileri
    // ters sırayla kurunca dizideki soldan sağa sıra ekranda da korunur.
    GIRDILER.forEach((g, i) => {
      const oge = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left, 100 - i);
      oge.command = g.komut;
      this.ogeler.push(oge);
    });
  }

  /** Sayıları kaynaktan TÜRETİR ve metinleri tazeler. */
  tazele(): void {
    GIRDILER.forEach((g, i) => {
      const adet = g.say(this.kaynak);
      const metin = DURUM_CUBUGU_METINLERI[g.metin];
      const oge = this.ogeler[i]!;
      oge.text = `${g.simge} ${adet}`;
      oge.tooltip = durumCubuguIpucu(metin.ad, adet, metin.eylem);
      oge.show();
    });
  }

  /** Bugünkü sayılar — nöbet buradan okur ve panelinkiyle karşılaştırır. */
  sayilar(): Record<string, number> {
    return Object.fromEntries(
      GIRDILER.map((g, i) => [`${String(g.metin)}${i}`, g.say(this.kaynak)]));
  }

  dispose(): void {
    for (const o of this.ogeler) o.dispose();
    this.ogeler.length = 0;
  }
}


// ═══════════════════════════════════════════════════════════════════════════
// baglanti.ts — 🔗 Tıklanır Yollar (DocumentLinkProvider · EKL-F11-A04 · VIT-GRAF-A14)
//
//   referans: · yol: · dosya: alanlarındaki dosya yolları ile koşu/anlatı
//   metinlerinin İÇİNDE geçen uzantılı yol sözceleri Ctrl/⌘+tık ile açılır;
//   :satır eki hedef satıra iner. Karar mantığı SAF çekirdekte
//   (baglanti-cekirdek.ts — fikstürlü sınamada); burada yalnız vscode köprüsü
//   yaşar. Yol üç kökten sırayla çözülür: belge dizini → varlık kökü (DIL-1.2
//   anadizin deseni) → çalışma-alanı klasörleri. OLMAYAN dosyaya link
//   üretilmez (kırık yol link değildir — dürüst yüzey).
//   Kod atıfları (BLK-ZKA gibi) BU modülün işi değil — F12 (gezinme.ts) +
//   çapraz-varlık bakışı (atif-baglanti.ts).
// ═══════════════════════════════════════════════════════════════════════════

import * as vscode from "vscode";
import { dirname } from "node:path";
import { programAl } from "./onbellek.ts";
import { baglantiAcIpucu } from "./yuzey-metinleri.ts";
import { yolCozumleyici, yolLinkleriTopla } from "./baglanti-cekirdek.ts";

// Saf çekirdeğe indi (VIT-GRAF-A14); eski tüketiciler (eklenti.ts meyve kapısı)
// buradan almaya devam eder — kapı değişmedi, gövde taşındı.
export { yolCozumleyici } from "./baglanti-cekirdek.ts";

export function baglantiSaglayici(
  varlikKoku: (yol: string) => string | undefined,
): vscode.DocumentLinkProvider {
  return {
    provideDocumentLinks(doc) {
      if (doc.uri.scheme !== "file") return undefined;
      const bildirimler = programAl(doc)?.bildirimler;
      if (!bildirimler) return undefined;

      const kokler = [
        dirname(doc.uri.fsPath),
        varlikKoku(doc.uri.fsPath),
        ...(vscode.workspace.workspaceFolders ?? []).map((k) => k.uri.fsPath),
      ].filter((k): k is string => !!k);

      const satirlar: string[] = [];
      for (let s = 0; s < doc.lineCount; s++) satirlar.push(doc.lineAt(s).text);

      return yolLinkleriTopla(bildirimler, satirlar, yolCozumleyici(kokler)).map((y) => {
        const uri = vscode.Uri.file(y.hedef);
        const link = new vscode.DocumentLink(
          new vscode.Range(y.satir, y.baslangic, y.satir, y.bitis),
          y.hedefSatiri ? uri.with({ fragment: `L${y.hedefSatiri}` }) : uri);
        link.tooltip = baglantiAcIpucu(y.metin);
        return link;
      });
    },
  };
}

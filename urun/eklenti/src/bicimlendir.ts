// ═══════════════════════════════════════════════════════════════════════════
// bicimlendir.ts — Belge Biçimlendirme (DocumentFormattingEditProvider)
//
//   "Format Document" (⇧⌥F) → .sar'ı hizalar. Motor: bicimle.ts (saf metin,
//   vscode'suz — Node testinde sınanır). Buradaki tek iş: vscode köprüsü.
//
//   ⏸️ BİÇİM ASKISI (ölçülmüş Kusur 1'in onarımı · 2026-07-29).
//
//   Ölçüm şuydu: karar yazımı tek bir alan eklemesi olması gerekirken, dosya bir
//   editörde AÇIKSA `doc.save()` çağrısı kaydetmede-biçimle katılımcısını
//   tetikliyor ve bu sağlayıcı belgenin TAMAMINI tek `TextEdit.replace` ile
//   değiştiriyordu. Kontrol ve deney aynı oturumda koştu: dosya kapalıyken bir
//   satır, açıkken on satırın dokuzu değişti. Founder tek alan eklediğini sanıyor,
//   `git diff` kırk altı satır gösteriyordu.
//
//   Biçimleme AYARI kullanıcının değil, eklentinin kendi paket bildirimindedir
//   (`configurationDefaults` → `[sarmal]` → `editor.formatOnSave: true`) ve o
//   ayar kendi başına doğrudur: kullanıcı KENDİ kaydettiğinde dosya hizalanmalıdır.
//   Yanlış olan, KARAR YAZMANIN yan etkisi olarak belge biçimlemektir — karar
//   yazmak biçim işi değildir. Onarım bu yüzden ayarı kaldırmaz; yalnız karar
//   yazıcısının kendi kaydetmesi süresince, YALNIZ O BELGE için biçimlendiriciyi
//   askıya alır. Kullanıcının kendi kaydetmesi hiç etkilenmez.
// ═══════════════════════════════════════════════════════════════════════════

import * as vscode from "vscode";
import { bicimle } from "../../cekirdek/src/bicimle.ts";   // BKM-MCP-A01: biçim çekirdeği çekirdeğe indi (MCP de kullanır)
import { BicimAskisi } from "./onay-cekirdek.ts";

/**
 * Biçimlendirmenin askıya alındığı belgeler. Tek örnektir ve saf çekirdekte
 * yaşayan bir defterle tutulur; nöbet o defteri editör kabuğu kurmadan koşturur.
 */
export const bicimAskisi = new BicimAskisi();

export function bicimlendirmeSaglayici(): vscode.DocumentFormattingEditProvider {
  return {
    provideDocumentFormattingEdits(doc) {
      // Karar yazıcısı bu belgeyi askıya aldıysa HİÇBİR düzenleme üretilmez:
      // karar tek alan ekler, kırk altı satır değil.
      if (bicimAskisi.askidaMi(doc.uri.fsPath)) return [];
      const eol = doc.eol === vscode.EndOfLine.CRLF ? "\r\n" : "\n";
      const bicimli = bicimle(doc.getText(), eol);
      const tumu = new vscode.Range(
        new vscode.Position(0, 0),
        doc.lineAt(doc.lineCount - 1).range.end,
      );
      return [vscode.TextEdit.replace(tumu, bicimli)];
    },
  };
}

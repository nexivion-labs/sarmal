// ═══════════════════════════════════════════════════════════════════════════
// duzeltme.ts — Hızlı Düzeltme (CodeActionProvider · 💡 ampul)
//
//   Ampul, imlecin durduğu satırda çıkar: ya o satırda bir tanı vardır ve
//   ampul onun düzeltmesini taşır, ya da satırın biçimi elle uğraşılacak bir
//   iş içerir ve ampul o işi tek tıka indirir. Sağ tık > Quick Fix ile de açılır.
//
//   BUGÜN SUNDUĞU YEDİ EYLEM:
//     🔧 bilinmeyen-tip → "<öneri> olarak düzelt" (tanı güdümlü · QuickFix)
//     🎓 beceri-terfisi → bekleyen Bellek'ten Beceri iskeleti üret ve kaydı ona bağla
//     💡 Karar düğümüne özet alanı ekle — bağlamı bilmeyen de okuyabilsin
//     📝 noktalı virgülle sıkışmış alanı madde listesine çevir
//     📏 uzun niyeti üç tırnaklı çok satırlı biçime katla (DIL-2.2)
//     📊 tablo satırlarını hizala (sütunlar nizami)
//     🔨🏁 durumu bir kademe ilerlet (ORK-3.2 akışı · Adım açılış satırında)
//
//   NEDEN BİÇİM İŞLERİ AMPULDE, BİÇİMLENDİRİCİDE DEĞİL: katlama ve maddeleme
//   değere satır sonu sokar; biçimlendiricinin anlam-koruma güvencesi bunu
//   yasaklar. Bu yüzden bunlar otomatik değil, bilinçli tek-tık kararıdır.
//   (izinsiz-sarma yapısal taşıma gerektirir → hâlâ sonraki faz.)
// ═══════════════════════════════════════════════════════════════════════════

import * as vscode from "vscode";
import { uzunNiyetiKatla, tabloHizala, noktaliVirgulMaddele } from "./katla.ts";
import {
  DUZELTME_METINLERI,
  alaniMaddeleBasligi,
  onerilenYazimaDuzelt,
} from "./yuzey-metinleri.ts";

export function duzeltmeSaglayici(): vscode.CodeActionProvider {
  return {
    provideCodeActions(doc, aralik, baglam) {
      const eylemler: vscode.CodeAction[] = [];

      // EKL-F4-A01 · uzun niyet → DIL-2.2 üç-tırnak katlaması (ÖNERİ — imleç satırında)
      // Biçimlendirici bunu otomatik YAPAMAZ: değere satır sonu girer, anlam-koruma
      // güvencesi bozulur; katlama bilinçli tek-tık kararıdır.
      const satirNo = aralik.start.line;
      const satir = doc.lineAt(satirNo).text;
      const katli = uzunNiyetiKatla(satir);
      // EKL-F5-A03 · 🟡→🎓 terfi ampulü: bekleyen Bellek'ten Beceri iskeleti
      for (const tani of vscode.languages.getDiagnostics(doc.uri)) {
        if (tani.code !== "beceri-terfisi" || tani.range.start.line !== satirNo) continue;
        const belge = doc.getText();
        const kodEs = /Bellek\([^)]*?kod:\s*([\p{Lu}][\p{Lu}\p{N}-]*)/u.exec(
          belge.slice(doc.offsetAt(tani.range.start)));
        const kaynakKod = kodEs?.[1] ?? "BLK-KAYNAK";
        const yeniKod = "BCR-" + kaynakKod.replace(/^(BLK|DRS)-/u, "");
        const eylem = new vscode.CodeAction(DUZELTME_METINLERI.beceriTerfisi, vscode.CodeActionKind.QuickFix);
        eylem.diagnostics = [tani];
        eylem.edit = new vscode.WorkspaceEdit();
        // Bellek düğümünün kapanışından sonra iskelet — zorunlu alanlar TODO'lu
        let son = tani.range.start.line;
        for (let i = son; i < Math.min(son + 30, doc.lineCount); i++)
          if (/\)\s*$/.test(doc.lineAt(i).text) || /\}\s*$/.test(doc.lineAt(i).text)) { son = i; break; }
        eylem.edit.insert(doc.uri, new vscode.Position(son + 1, 0),
          `\nBeceri( kod: ${yeniKod}, sağlar: YTN-TODO, yığın: evrensel,\n` +
          `        neZaman: "TODO: bu beceri hangi durumda devreye girer",\n` +
          `        kurallar: "TODO: uygulama kuralları",\n` +
          `        antiDesen: "TODO: kaçınılacaklar",\n` +
          `        ne: "🎓 ${kaynakKod} belleğinden terfi eden beceri" )\n`);
        eylemler.push(eylem);
      }

      // EKL-F4-A05 · 📊 tablo hizalama (belge bloğu tabloları — kullanıcı kararıyla)
      if (/^\s*\|.*\|\s*$/.test(satir)) {
        let bas = satirNo, son = satirNo;
        while (bas > 0 && /^\s*\|.*\|\s*$/.test(doc.lineAt(bas - 1).text)) bas--;
        while (son + 1 < doc.lineCount && /^\s*\|.*\|\s*$/.test(doc.lineAt(son + 1).text)) son++;
        const blok = Array.from({ length: son - bas + 1 }, (_, i) => doc.lineAt(bas + i).text);
        const hizali = tabloHizala(blok);
        if (hizali) {
          const eylem = new vscode.CodeAction(DUZELTME_METINLERI.tabloyuHizala, vscode.CodeActionKind.RefactorRewrite);
          eylem.edit = new vscode.WorkspaceEdit();
          eylem.edit.replace(doc.uri,
            new vscode.Range(bas, 0, son, doc.lineAt(son).text.length), hizali.join("\n"));
          eylemler.push(eylem);
        }
      }

      if (katli) {
        const eylem = new vscode.CodeAction(
          DUZELTME_METINLERI.uzunNiyetiKatla, vscode.CodeActionKind.RefactorRewrite);
        eylem.edit = new vscode.WorkspaceEdit();
        eylem.edit.replace(doc.uri, doc.lineAt(satirNo).range, katli.join("\n"));
        eylemler.push(eylem);
      }

      // ── ZRF-A05 · yıldız hünerleri (Founder 2026-07-18: "sadece biçimlendirme
      //    değil başka şeyler de olsa") — dört tek-tık iş akışı hüneri ──────────

      // ① ORK-3.2 durum akışı: Adım açılış satırında durumu tek tıkla ilerlet
      //    (meşru geçişler: beklemede→geliştirmede · geliştirmede→tamamlandı).
      const durumEs = /(durum:\s*)(beklemede|geliştirmede)(?![\p{L}])/u.exec(satir);
      if (durumEs && /(?<![\p{L}\p{N}_])Adım\s*\(/u.test(satir)) {
        const hedef = durumEs[2] === "beklemede" ? "geliştirmede" : "tamamlandı";
        const baslik = durumEs[2] === "beklemede"
          ? DUZELTME_METINLERI.kosuyaBasla
          : DUZELTME_METINLERI.adimiTamamla;
        const eylem = new vscode.CodeAction(baslik, vscode.CodeActionKind.QuickFix);
        eylem.edit = new vscode.WorkspaceEdit();
        const bas = durumEs.index + durumEs[1].length;
        eylem.edit.replace(doc.uri, new vscode.Range(satirNo, bas, satirNo, bas + durumEs[2].length), hedef);
        eylemler.push(eylem);
      }

      // ② NTK-A09 özet katmanı: özetsiz Karar'a bağlamsız-okunur özet iskeleti
      if (/(?<![\p{L}\p{N}_])Karar\s*\(/u.test(satir)) {
        let ozetVar = false;
        for (let i = satirNo; i < Math.min(satirNo + 16, doc.lineCount); i++) {
          if (/(?<![\p{L}\p{N}_])özet:/u.test(doc.lineAt(i).text)) { ozetVar = true; break; }
          if (i > satirNo && /(?<![\p{L}\p{N}_])Karar\s*\(/u.test(doc.lineAt(i).text)) break;
        }
        if (!ozetVar) {
          const girinti = " ".repeat(satir.indexOf("(") + 2);
          const eylem = new vscode.CodeAction(DUZELTME_METINLERI.kararOzetiEkle, vscode.CodeActionKind.RefactorRewrite);
          eylem.edit = new vscode.WorkspaceEdit();
          eylem.edit.insert(doc.uri, new vscode.Position(satirNo + 1, 0),
            `${girinti}özet: "TODO: kararı, bağlamı hiç bilmeyen bir okuyucuya tek paragrafta anlat",\n`);
          eylemler.push(eylem);
        }
      }

      // ③ MIM-1.6 ② madde desteği: noktalı-virgüllü tek-satır görev/sınır'ı madde
      //    listesine çevir (mantık SAF yardımcıda — katla.ts, davranış-testli)
      const maddeli = noktaliVirgulMaddele(satir);
      if (maddeli) {
        const alanAdi = maddeli.trimStart().startsWith("görev") ? "görev" : "sınır";
        const eylem = new vscode.CodeAction(alaniMaddeleBasligi(alanAdi), vscode.CodeActionKind.RefactorRewrite);
        eylem.edit = new vscode.WorkspaceEdit();
        eylem.edit.replace(doc.uri, doc.lineAt(satirNo).range, maddeli);
        eylemler.push(eylem);
      }
      for (const tani of vscode.languages.getDiagnostics(doc.uri)) {
        if (tani.source !== "Sarmal" || tani.range.start.line !== satirNo) continue;

        if (tani.code === "bilinmeyen-tip") {
          const m = /Bunu mu demek istedin: "([^"]+)"/.exec(tani.message);
          if (m) {
            const oneri = m[1];
            const eylem = new vscode.CodeAction(onerilenYazimaDuzelt(oneri), vscode.CodeActionKind.QuickFix);
            eylem.edit = new vscode.WorkspaceEdit();
            eylem.edit.replace(doc.uri, tani.range, oneri);
            eylem.diagnostics = [tani];
            eylem.isPreferred = true;
            eylemler.push(eylem);
          }
        }
      }
      return eylemler;
    },
  };
}

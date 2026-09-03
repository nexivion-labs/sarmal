// ═══════════════════════════════════════════════════════════════════════════
// imza.ts — 🖋️ İmza Yardımı (SignatureHelpProvider · EKL-F11-A04)
//
//   `Adım(` yazıp durduğunda parametre imzası açılır — beş ekosistemin
//   ortak alışkanlığı (envanter A5). Veri YALNIZ kanondan (snfBul →
//   Sema.zorunlu/opsiyonel/enum/tür — elle liste YOK, drift kapısı):
//   kanon değişir, imza kendiliğinden değişir.
//
//   Sarmal parametreleri ADLA yazılır (sırasız) — aktif parametre virgül
//   SAYISIYLA değil, imleçten geriye son `ad:` sözcesiyle bulunur.
// ═══════════════════════════════════════════════════════════════════════════

import * as vscode from "vscode";
import { snfBul } from "./ortak.ts";
import type { Sema } from "../../cekirdek/src/siniflama.ts";
import { imzaAlanBelgesi, imzaBelgesi, kanonikWidgetAdi } from "./yuzey-metinleri.ts";

const AD = "[A-Za-z0-9ÇĞİÖŞÜçğıöşü_]+";

/** İmleçten GERİYE parantez dengesiyle açık çağrının tip adını bulur.
 *  String içleri kaba tırnak-eşliğiyle atlanır; bulunamazsa undefined. */
function acikCagriTipi(doc: vscode.TextDocument, poz: vscode.Position): string | undefined {
  let derinlik = 0;
  for (let s = poz.line; s >= 0 && s > poz.line - 40; s--) {
    const satir = doc.lineAt(s).text;
    const son = s === poz.line ? poz.character : satir.length;
    let icerde = false; // çift tırnak içi (kaba ama yeterli — imza konforu, denetim değil)
    const acilislar: number[] = [];
    for (let i = 0; i < son; i++) {
      const c = satir[i];
      if (c === '"') icerde = !icerde;
      if (icerde) continue;
      if (c === "(") acilislar.push(i);
      else if (c === ")") { if (acilislar.length) acilislar.pop(); else derinlik++; }
    }
    // bu satırda kapanmamış açılış varsa: en içteki, geriden gelen kapanışları düşerek
    while (derinlik > 0 && acilislar.length) { acilislar.pop(); derinlik--; }
    if (acilislar.length) {
      const es = satir.slice(0, acilislar[acilislar.length - 1]).match(new RegExp(`(${AD})\\s*$`));
      if (es) return es[1];
      return undefined; // '(' var ama önünde ad yok — imza gösterme
    }
  }
  return undefined;
}

/** İmleçten geriye AYNI çağrı içinde son yazılan `ad:` alanı (aktif parametre). */
function aktifAlan(doc: vscode.TextDocument, poz: vscode.Position): string | undefined {
  const satir = doc.lineAt(poz.line).text.slice(0, poz.character);
  const es = [...satir.matchAll(new RegExp(`(${AD})\\s*:`, "g"))];
  return es.length ? es[es.length - 1][1] : undefined;
}

export function imzaSaglayici(): vscode.SignatureHelpProvider {
  return {
    provideSignatureHelp(doc, poz) {
      const tip = acikCagriTipi(doc, poz);
      if (!tip) return undefined;
      const sema: Sema | undefined = snfBul(doc)?.semalar?.[tip];
      if (!sema) return undefined;

      const alanlar = [...sema.zorunlu, ...(sema.opsiyonel ?? [])];
      if (!alanlar.length) return undefined;

      const etiket = (a: string): string => (sema.zorunlu.includes(a) ? a : `[${a}]`);
      const belge = (a: string): string =>
        imzaAlanBelgesi(sema.zorunlu.includes(a), sema.tür?.[a], sema.enum?.[a]);

      const imza = new vscode.SignatureInformation(
        `${kanonikWidgetAdi(tip, tip)}( ${alanlar.map(etiket).join(", ")} )`,
        new vscode.MarkdownString(imzaBelgesi()));
      imza.parameters = alanlar.map((a) =>
        new vscode.ParameterInformation(etiket(a), belge(a)));

      const yardim = new vscode.SignatureHelp();
      yardim.signatures = [imza];
      yardim.activeSignature = 0;
      const aktif = aktifAlan(doc, poz);
      yardim.activeParameter = Math.max(0, alanlar.indexOf(aktif ?? sema.zorunlu[0] ?? alanlar[0]));
      return yardim;
    },
  };
}

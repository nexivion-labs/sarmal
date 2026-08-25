// ═══════════════════════════════════════════════════════════════════════════
// yildiz.ts — 🌟 KUZEY YILDIZI BEKÇİSİ (Founder 2026-07-06 14:21)
//
//   "Yıldızı görmek için üzerine gelmeye gerek kalmasın; BEN HEP BURDAYIM
//    desin; yanıp sönsün — tıpkı bir kalp atışı gibi."
//
//   Ampulden farkı: imleç BEKLEMEZ — eylem uygulanabilir HER satırda, satır
//   numarasının solunda (glyph kenarı) beyaz-ışıltılı yıldız yaşar ve kalp
//   ritmiyle atar (parlak↔sönük iki süs dönüşümlü). Tıklama daveti: satıra
//   gel + ⌘. — yıldız haberci, menü kapısı aynı.
// ═══════════════════════════════════════════════════════════════════════════

import * as vscode from "vscode";
import { uzunNiyetiKatla, tabloHizala } from "./katla.ts";
import { rozetRenkleri } from "./ortak.ts";
import { nabizAbone, geciktir } from "./nabiz.ts";   // EKL-F9-A07/A08: tek kalp + tek geciktirici
import { YILDIZ_METINLERI } from "./yuzey-metinleri.ts";

function susYap(baglam: vscode.ExtensionContext, dosya: string): vscode.TextEditorDecorationType {
  return vscode.window.createTextEditorDecorationType({
    gutterIconPath: vscode.Uri.joinPath(baglam.extensionUri, "ikonlar", dosya),
    gutterIconSize: "contain",
  });
}

/** Eylem-uygulanabilir satırları bulur (katlama · tablo · tanı-düzeltmeleri).
 *  Founder 2026-07-18 ("içerik zenginliği yok"): yıldız artık NEDENİNİ anlatır —
 *  üzerine gelen, önerinin ne olduğunu ve nasıl uygulanacağını okur. */
function yildizSatirlari(doc: vscode.TextDocument): vscode.DecorationOptions[] {
  const nedenler = new Map<number, string>();
  const ekle = (satir: number, neden: string): void => {
    if (!nedenler.has(satir)) nedenler.set(satir, neden);
  };

  for (let i = 0; i < doc.lineCount; i++) {
    const metin = doc.lineAt(i).text;
    if (uzunNiyetiKatla(metin)) {
      ekle(i, YILDIZ_METINLERI.uzunNiyet);
      continue;
    }
    // tablo bloğu: ilk satırından işaretle (blok 2+ satır ve hizasızsa)
    if (/^\s*\|.*\|\s*$/.test(metin) && (i === 0 || !/^\s*\|.*\|\s*$/.test(doc.lineAt(i - 1).text))) {
      let son = i;
      while (son + 1 < doc.lineCount && /^\s*\|.*\|\s*$/.test(doc.lineAt(son + 1).text)) son++;
      if (son > i) {
        const blok = Array.from({ length: son - i + 1 }, (_, k) => doc.lineAt(i + k).text);
        if (tabloHizala(blok)) ekle(i, YILDIZ_METINLERI.tablo);
      }
    }
  }
  for (const tani of vscode.languages.getDiagnostics(doc.uri)) {
    if (tani.code === "beceri-terfisi")
      ekle(tani.range.start.line, YILDIZ_METINLERI.terfi);
    else if (tani.code === "bilinmeyen-tip")
      ekle(tani.range.start.line, YILDIZ_METINLERI.bilinmeyenTip);
  }
  return [...nedenler.entries()].sort((a, b) => a[0] - b[0])
    .map(([s, neden]) => ({
      range: new vscode.Range(s, 0, s, 0),
      hoverMessage: new vscode.MarkdownString(YILDIZ_METINLERI.ipucu(neden)),
    }));
}

export function kuzeyYildiziKaydi(baglam: vscode.ExtensionContext): void {
  // 🌬️ NEFES ALAN YILDIZ (Founder 2026-07-18: "araba sinyali gibi yanıp sönmesin —
  // bir yıldız hafifçe yanar söner, tam yandığında göz kamaştırır"): iki-faz
  // aç/kapa yerine DÖRT fazlı nefes çevrimi (parlak → orta → sönük → orta) —
  // tek kalp korunur (nabiz.ts, yeni zamanlayıcı yok), her atışta bir faz ilerler;
  // yumuşak iniş-çıkış üçgen dalgası göze kırpma değil soluma olarak görünür.
  const parlak = susYap(baglam, "kuzey-parlak.svg");
  const orta = susYap(baglam, "kuzey-orta.svg");
  const sonuk = susYap(baglam, "kuzey-sonuk.svg");
  const NEFES: vscode.TextEditorDecorationType[] = [parlak, orta, sonuk, orta];

  // 💓 Uyarı rozetleri de atar (Founder 2026-07-06 14:45: "diğer uyarı satırları
  // da yanıp sönsün"). Renkler GERÇEKTEN kanondan okunur (KRR-MUT Sütun D —
  // eski elle-kopya "kanondan" diyen yorumla yaşıyordu; artık rozetRenkleri()).
  const R = rozetRenkleri();
  const rozet = (metin: string, renk: string): vscode.TextEditorDecorationType =>
    vscode.window.createTextEditorDecorationType({ after: { contentText: metin, color: renk } });
  const terfiParlak = rozet(YILDIZ_METINLERI.terfiBekliyor, R.terfi);
  const terfiSonuk  = rozet("  🎓", `${R.terfi}55`);
  const uyariParlak = rozet(YILDIZ_METINLERI.uyari, R.uyari);
  const uyariSonuk  = rozet("  ⚠️", `${R.uyari}55`);

  // Yıldız satırları yalnız aralık değil, aralığa bağlı bir açıklama da taşır
  // (yildizSatirlari her satıra "bu satırda şu öneri var" cümlesini iliştirir).
  // Alanın türü bu yüzden DecorationOptions'tır; Range[] yazımı tür denetimini
  // kırıyordu ve paket esbuild ile üretildiği için hata derlemede görünmüyordu.
  let araliklar: vscode.DecorationOptions[] = [];
  let terfiler: vscode.DecorationOptions[] = [];
  let uyarilar: vscode.DecorationOptions[] = [];
  let faz = 0;          // nefes çevrimi imleci (NEFES dizisinde döner)
  let atis = true;      // rozetlerin iki-faz ritmi (metin süsleri — eski davranış)

  const boya = (): void => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== "sarmal") return;
    // yıldız: aktif nefes fazı çizilir, kalan fazlar temizlenir (tek yıldız, yumuşak geçiş)
    for (const sus of [parlak, orta, sonuk]) editor.setDecorations(sus, []);
    editor.setDecorations(NEFES[faz], araliklar);
    editor.setDecorations(atis ? terfiParlak : terfiSonuk, terfiler);
    editor.setDecorations(atis ? terfiSonuk : terfiParlak, []);
    editor.setDecorations(atis ? uyariParlak : uyariSonuk, uyarilar);
    editor.setDecorations(atis ? uyariSonuk : uyariParlak, []);
  };

  const hesapla = (): void => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== "sarmal") { araliklar = []; terfiler = []; uyarilar = []; return; }
    araliklar = yildizSatirlari(editor.document);
    terfiler = []; uyarilar = [];
    const gorulen = new Set<number>();
    for (const tani of vscode.languages.getDiagnostics(editor.document.uri)) {
      const satir = tani.range.start.line;
      if (gorulen.has(satir)) continue;
      const secenek: vscode.DecorationOptions = {
        range: editor.document.lineAt(satir).range,
        hoverMessage: new vscode.MarkdownString(tani.message),
      };
      if (tani.code === "beceri-terfisi") { terfiler.push(secenek); gorulen.add(satir); }
      else if (tani.severity === vscode.DiagnosticSeverity.Warning) { uyarilar.push(secenek); gorulen.add(satir); }
    }
    boya();
  };

  // 💓 kalp atışı — "ben hep burdayım" (tek nabız: nabiz.ts · EKL-F9-A08);
  // yıldız her atışta bir nefes fazı ilerler (araba-sinyali kırpması yok).
  const kalp = nabizAbone((a) => { atis = a; faz = (faz + 1) % NEFES.length; boya(); });

  const bekletici = geciktir(hesapla);   // 350ms — tuş vuruşu başına tek hesap (EKL-F9-A07)

  baglam.subscriptions.push(
    kalp, bekletici,
    vscode.window.onDidChangeActiveTextEditor(hesapla),
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document === vscode.window.activeTextEditor?.document) bekletici.cagir();
    }),
    vscode.languages.onDidChangeDiagnostics(() => bekletici.cagir()),
    parlak, orta, sonuk, terfiParlak, terfiSonuk, uyariParlak, uyariSonuk,
  );
  hesapla();
}

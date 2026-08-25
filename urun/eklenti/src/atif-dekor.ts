// ═══════════════════════════════════════════════════════════════════════════
// atif-dekor.ts — 🔗 Çözülen Atıf Görünümü (NTK-A01 · Founder 2026-07-17)
//
//   Founder isteği: "Tıklanıp açılabilen her şey görsel bir uyaran taşısın ki
//   okunması gereken bir şey olduğu anlaşılsın." Bir .sar belgesindeki KOD
//   atıfları (DIL-1.1 · kanıt-ekseni turu · BLK-EMJ), kimlik indeksinde TANIMI VARSA link
//   renginde ve altı çizili boyanır — kullanıcı, F12/⌘+tık ile gidilebilen
//   yeri koddan değil renkten tanır. Kapsam bütün belge gövdesidir: parametre
//   değerleri, yorum satırları ve belge blokları (-->| |<--) dahildir.
//   Tanımsız sözce boyanmaz (kırık atıf link değildir — baglanti.ts ilkesi).
// ═══════════════════════════════════════════════════════════════════════════

import * as vscode from "vscode";
import { kimlikIndeksi, INDEKS_DISI } from "../../cekirdek/src/kimlik.ts";
import { atifAraliklariTopla } from "./atif-cekirdek.ts";   // SAF karar mantığı — fikstürlü testte (NTK-A01)

/** Link görünümü — tema link rengi + altı çizgi (kullanıcının tanıdığı evrensel işaret). */
const tur = vscode.window.createTextEditorDecorationType({
  color: new vscode.ThemeColor("textLink.foreground"),
  textDecoration: "underline",
});

/** Etkin editördeki çözülen atıfları boyar — karar mantığı saf çekirdekte (atif-cekirdek.ts). */
export function atifDekorBoya(editor: vscode.TextEditor | undefined): void {
  if (!editor || editor.document.languageId !== "sarmal") return;
  const doc = editor.document;

  // Kirli tampon tazeliği (gezinme.ts deseni): boyamadan önce aktif belge indekse yazılır.
  if (doc.uri.scheme === "file") kimlikIndeksi.dosyaGuncelle(doc.uri.fsPath, doc.getText());

  // Tanım evreni TEK geçişte kurulur — sözce başına indeks taraması yapılmaz (maliyet kalkanı).
  // KPN-A01: açık ders-dünyası (şablon/örnek) dosyasının tanımları ürün belgesinin link
  // evrenine karışmaz; belgenin KENDİ tanımları her zaman evrende (belge-içi linkler yaşar).
  const tanimlar = kimlikIndeksi.tumTanimlar(
    (d) => d === doc.uri.fsPath || !INDEKS_DISI.test(d));
  const kodlar = new Set(tanimlar.map((t) => t.kod));
  const buradakiTanimlar = new Set(
    tanimlar.filter((t) => t.dosya === doc.uri.fsPath).map((t) => `${t.kod}@${t.satir - 1}`));

  const satirlar: string[] = [];
  for (let s = 0; s < doc.lineCount; s++) satirlar.push(doc.lineAt(s).text);
  editor.setDecorations(tur, atifAraliklariTopla(satirlar, kodlar, buradakiTanimlar)
    .map((a) => new vscode.Range(a.satir, a.baslangic, a.satir, a.bitis)));
}

/** Etkinleştirme: editör/belge değişimlerine bağlanır (girinti.ts kayıt deseni). */
export function atifDekorKaydi(context: vscode.ExtensionContext): void {
  atifDekorBoya(vscode.window.activeTextEditor);
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(atifDekorBoya),
    vscode.workspace.onDidChangeTextDocument((e) => {
      const aktif = vscode.window.activeTextEditor;
      if (aktif && e.document === aktif.document) atifDekorBoya(aktif);
    }),
    { dispose: () => tur.dispose() },
  );
}

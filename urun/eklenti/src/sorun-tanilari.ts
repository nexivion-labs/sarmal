// ═══════════════════════════════════════════════════════════════════════════
// sorun-tanilari.ts — 🩺 SORUNLAR PANELİ AYARI VE EDİTÖRÜN TANI KAYNAĞI
//                     (PNL-A22 · OZK-14 ÜÇÜNCÜSÜ · YUZ-3.1)
//
//   Founder 2026-10-28: Sarmal tanılarının VS Code Sorunlar paneline gönderilmesi
//   bir ayarla seçilir ve ayarın varsayılanı kapalıdır. Kapalıyken tanılar VS Code
//   tanı koleksiyonuna YAZILMAZ; Sinyaller sekmesinde, editördeki satır işaretinde,
//   hover'da, hızlı düzeltmede ve komut satırında görünmeye devam eder.
//
//   Bu modül iki şeyin tek evidir:
//     · Ayarın okunuşu (`sorunlarPaneliAcik`). Okunamayan ayar varsayılana düşer.
//     · Editör yüzeylerinin (satır içi tanı, yıldız rozeti, hızlı düzeltme) okuduğu
//       hata ve uyarı listesi (`sorunTanilari`). Eskiden bu yüzeyler doğrudan
//       `vscode.languages.getDiagnostics` okuyordu; koleksiyon boşalınca hepsi
//       susardı. Kaynak eklentinin girişinde bağlanır: ayar açıkken koleksiyonun
//       kendisi, kapalıyken turun defterinden koleksiyona gidecek olan liste. İki
//       yol aynı tanı nesnelerini verir; yalnız nerede durdukları ayrıdır.
// ═══════════════════════════════════════════════════════════════════════════

import * as vscode from "vscode";

/** Ayarın `sarmal` bölümü altındaki adı. */
export const SORUNLAR_PANELI_AYARI = "sorunlarPaneli";
/** Ayarın varsayılanı; paketin ilanıyla (package.json) aynı olmak zorundadır, birim nöbeti ikisini karşılaştırır. */
export const SORUNLAR_PANELI_VARSAYILANI = false;

/** Sarmal tanıları Sorunlar paneline gönderilsin mi? Ayar okunamazsa ya da boolean değilse varsayılan geçerlidir. */
export function sorunlarPaneliAcik(): boolean {
  try {
    const v = vscode.workspace.getConfiguration("sarmal").get<unknown>(SORUNLAR_PANELI_AYARI, SORUNLAR_PANELI_VARSAYILANI);
    return typeof v === "boolean" ? v : SORUNLAR_PANELI_VARSAYILANI;
  } catch { return SORUNLAR_PANELI_VARSAYILANI; }
}

type Kaynak = (uri: vscode.Uri) => readonly vscode.Diagnostic[];
let kaynak: Kaynak | undefined;
const degisti = new vscode.EventEmitter<void>();

/** Editör yüzeylerinin okuyacağı listeyi bağlar (eklentinin girişi). Bırakılınca koleksiyon okumasına dönülür. */
export function sorunKaynaginiBagla(f: Kaynak): vscode.Disposable {
  kaynak = f;
  return new vscode.Disposable(() => { if (kaynak === f) kaynak = undefined; });
}

/** Dosyanın Sarmal hata ve uyarıları: Sorunlar paneli açıksa koleksiyondan, kapalıysa turun defterinden. */
export function sorunTanilari(uri: vscode.Uri): readonly vscode.Diagnostic[] {
  return kaynak ? kaynak(uri) : vscode.languages.getDiagnostics(uri);
}

/** Defterden okunan liste değişti (ayar kapalıyken koleksiyon olayı doğmaz; bu olay onun yerini tutar). */
export function sorunTanilariDegisti(): void { degisti.fire(); }

/** Liste değişince çağrılır: koleksiyonun kendi olayı ve defterin olayı birlikte dinlenir. */
export function sorunTanilariDegisince(dinleyici: () => void): vscode.Disposable {
  const a = vscode.languages.onDidChangeDiagnostics(() => dinleyici());
  const b = degisti.event(() => dinleyici());
  return new vscode.Disposable(() => { a.dispose(); b.dispose(); });
}

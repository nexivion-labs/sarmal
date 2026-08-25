// ═══════════════════════════════════════════════════════════════════════════
// cam.ts — 🪟 CAM EFEKTİ (ZRF-A03 · Founder 2026-07-18 · rötuş ZRF-A08 2026-07-19)
//
//   Kod yüzeyinin taşıyıcı sözcükleri buzlu-cam bir kapsülde yaşar: tip
//   açılışları (Adım · Katman · Blok …), anahtar kelimeler (görev: · kabul: ·
//   sınır: …) ve ürün yolları (dosya: değeri — meyve 🍎). Kapsül üç katmandan
//   oluşur: yarı saydam zemin + kanonun marka gradyanından çok soluk bir çift
//   renk geçişi (mor→camgöbeği) + taşıdığı metnin tonunda iç parıltı. Metin
//   rengi temadan gelir — cam yalnız zemindir, okunurluğu bozmaz.
//
//   ZRF-A08 dersi: süs kenarlığı (border) köşe yuvarlaklığından bağımsız,
//   keskin köşeli çizilebiliyor — ışık kenarı görevi iç parıltıya devredildi,
//   border kullanılmaz. Işıma renkleri KANONDAN okunur (tip adları altın
//   sadeRenkler.kod · anahtarlar mavi sadeRenkler.parametre · meyve moru
//   agacRenkleri.meyve · gradyan renkPaleti.gradyan) — elle boya yazılmaz,
//   tema/kanon değişirse cam onunla değişir. Kapatma: sarmal.camEfekti = false.
// ═══════════════════════════════════════════════════════════════════════════

import * as vscode from "vscode";
import { geciktir } from "./nabiz.ts";   // EKL-F9-A07: tuş vuruşu başına tek hesap
import { GOMULU_KAYIT } from "./gomulu-kanon.ts";

const PALET = (GOMULU_KAYIT as {
  renkPaleti?: {
    sadeRenkler?: Record<string, string>;
    agacRenkleri?: Record<string, string>;
    gradyan?: string[];
  };
}).renkPaleti ?? {};
const SADE = PALET.sadeRenkler ?? {};
const TIP_ISIK = SADE["kod"] ?? "#E5C07B";
const ANAHTAR_ISIK = SADE["parametre"] ?? "#9CDCFE";
const MEYVE_ISIK = PALET.agacRenkleri?.["meyve"] ?? "#C173CE";
const [GRD_A, GRD_B] = PALET.gradyan ?? ["#7C3AED", "#06B6D4"];

/** Ortak kapsül CSS'i: yumuşak köşe + marka gradyanı + metnin tonunda iç parıltı.
 *  (border YOK — ZRF-A08: kenarlık köşe yuvarlaklığına uymayıp keskin çerçeve basar.) */
const kapsul = (radius: number, gradyanAlfa: string, isik: string, parlaklik: string): string =>
  `none; border-radius: ${radius}px; ` +
  `background-image: linear-gradient(120deg, ${GRD_A}${gradyanAlfa}, ${GRD_B}${gradyanAlfa}); ` +
  `box-shadow: inset 0 0 ${radius + 2}px ${isik}${parlaklik}`;

/** Buzlu cam kapsülleri — tip adları (belirgin), anahtar kelimeler (daha tül),
 *  ürün yolları (meyve moru — 🍎 olduğu renginden okunur). */
const tipCam = vscode.window.createTextEditorDecorationType({
  backgroundColor: "rgba(255,255,255,0.06)",
  textDecoration: kapsul(5, "14", TIP_ISIK, "3d"),
});
const anahtarCam = vscode.window.createTextEditorDecorationType({
  backgroundColor: "rgba(255,255,255,0.04)",
  textDecoration: kapsul(4, "0f", ANAHTAR_ISIK, "30"),
});
const meyveCam = vscode.window.createTextEditorDecorationType({
  backgroundColor: "rgba(255,255,255,0.05)",
  textDecoration: kapsul(4, "12", MEYVE_ISIK, "3a"),
});

/** Tip açılışı: BüyükHarfle başlayan sözce + '(' — Adım( · Katman( · Karar( … */
const TIP_DESENI = /(?<![\p{L}\p{N}_])([\p{Lu}][\p{L}\p{N}]*)\s*\(/gu;
/** Anahtar kelime: satır başında ya da '('/','' sonrasında küçük-harfli ad + ':'
 *  (dizgi içleri elenir — anahtarlar yalnız bu üç konumda meşrudur). */
const ANAHTAR_DESENI = /(^\s*|\(\s*|,\s*)([\p{Ll}][\p{L}\p{N}_]*)(?=\s*:)/gu;
/** Meyve yolu: `dosya:` parametresinin dizgi değeri (ürün 🍎 — Kod widget'ının
 *  disk izi). Kapsül tırnaklarıyla birlikte sarar (tek görsel birim). */
const MEYVE_DESENI = /dosya\s*:\s*("[^"]+")/gu;

export function camBoya(editor: vscode.TextEditor | undefined): void {
  if (!editor || editor.document.languageId !== "sarmal") return;
  const acik = vscode.workspace.getConfiguration("sarmal").get<boolean>("camEfekti") !== false;
  const tipler: vscode.Range[] = [];
  const anahtarlar: vscode.Range[] = [];
  const meyveler: vscode.Range[] = [];

  if (acik) {
    const doc = editor.document;
    let belgeIcinde = false;   // -->| |<-- blokları belge metnidir — cam kapsül kod yüzeyine aittir
    for (let s = 0; s < doc.lineCount; s++) {
      const metin = doc.lineAt(s).text;
      if (belgeIcinde) { if (metin.includes("|<--")) belgeIcinde = false; continue; }
      if (metin.includes("-->|") && !metin.includes("|<--")) { belgeIcinde = true; }
      if (/^\s*\/\//.test(metin)) continue;   // yorum satırı cam almaz
      for (const es of metin.matchAll(TIP_DESENI)) {
        tipler.push(new vscode.Range(s, es.index + es[0].indexOf(es[1]), s, es.index + es[0].indexOf(es[1]) + es[1].length));
      }
      for (const es of metin.matchAll(ANAHTAR_DESENI)) {
        const bas = es.index + es[1].length;
        anahtarlar.push(new vscode.Range(s, bas, s, bas + es[2].length));
      }
      for (const es of metin.matchAll(MEYVE_DESENI)) {
        const bas = es.index + es[0].indexOf(es[1]);
        meyveler.push(new vscode.Range(s, bas, s, bas + es[1].length));
      }
    }
  }
  editor.setDecorations(tipCam, tipler);
  editor.setDecorations(anahtarCam, anahtarlar);
  editor.setDecorations(meyveCam, meyveler);
}

/** Etkinleştirme: editör/belge/ayar değişimlerine bağlanır (girinti.ts deseni). */
export function camKaydi(context: vscode.ExtensionContext): void {
  camBoya(vscode.window.activeTextEditor);
  const bekletici = geciktir(() => camBoya(vscode.window.activeTextEditor));
  context.subscriptions.push(
    bekletici, tipCam, anahtarCam, meyveCam,
    vscode.window.onDidChangeActiveTextEditor(camBoya),
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document === vscode.window.activeTextEditor?.document) bekletici.cagir();
    }),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("sarmal.camEfekti")) camBoya(vscode.window.activeTextEditor);
    }),
  );
}

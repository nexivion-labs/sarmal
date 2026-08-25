// ═══════════════════════════════════════════════════════════════════════════
// girinti.ts — Girinti Renklendirici (Sarmal'ın kendi "boşluk boyacısı")
//
//   indent-rainbow'un yerine geçer (Founder 2026-07-02): her girinti katmanı
//   (2 boşluk = 1 kat, BÇ standardı) AĞAÇ GRADYANIYLA hafifçe tonlanır —
//   🌱 kök kahvesi → 🪵 gövde → 🌿 dal yeşili → 🍃 yaprak → 🍎 meyve moru.
//   BİLEREK YOK: "bozuk girinti" kırmızısı — standardı biçimlendirici (⇧⌥F)
//   korur; boyacı yalnız derinliği okunur kılar, ceza kesmez.
//   SÜREKLİLİK (Founder 2026-07-12): yorum/belge satırları DA boyanır — bantlar
//   blok boyunca kesilmez (eski belge-muafiyeti kaldırıldı).
//   Kapatma: sarmal.girintiRenkleri = false.
// ═══════════════════════════════════════════════════════════════════════════

import * as vscode from "vscode";

/** GERÇEK GÖKKUŞAĞI (Founder 2026-07-18: "gerçek gökkuşağı renkleri gibi olsa,
 *  hafiften glow'lu") — yedi seviye doğal tayf sırasında (kırmızı → mor); her
 *  bandın sol kenarında aynı tonda yumuşak bir ışıma yaşar (iç gölge — neon
 *  değil, tül gibi). Zeminler düşük alfada kalır ki metin okunurluğu bozulmasın. */
const PALET: ReadonlyArray<{ zemin: string; isilti: string }> = [
  { zemin: "rgba(255, 99, 99,0.16)", isilti: "rgba(255, 99, 99,0.45)" },  // ① kırmızı
  { zemin: "rgba(255,159, 67,0.15)", isilti: "rgba(255,159, 67,0.42)" },  // ② turuncu
  { zemin: "rgba(255,214, 74,0.13)", isilti: "rgba(255,214, 74,0.38)" },  // ③ sarı
  { zemin: "rgba( 88,214,120,0.14)", isilti: "rgba( 88,214,120,0.40)" },  // ④ yeşil
  { zemin: "rgba( 84,160,255,0.15)", isilti: "rgba( 84,160,255,0.42)" },  // ⑤ mavi
  { zemin: "rgba(108, 99,255,0.15)", isilti: "rgba(108, 99,255,0.42)" },  // ⑥ lacivert
  { zemin: "rgba(199,110,255,0.15)", isilti: "rgba(199,110,255,0.42)" },  // ⑦ mor
];

const KAT = 2; // 1 girinti katmanı = 2 boşluk (BÇ — biçimlendiriciyle aynı)

const turler: vscode.TextEditorDecorationType[] = PALET.map(({ zemin, isilti }) =>
  vscode.window.createTextEditorDecorationType({
    backgroundColor: zemin,
    // hafif ışıma: bandın sol kenarından içe süzülen aynı-ton yumuşak gölge
    // (textDecoration CSS kanalı — VS Code süs API'sinde gölge alanı yoktur)
    textDecoration: `none; box-shadow: inset 2px 0 6px -2px ${isilti}`,
  }),
);

/** Etkin editördeki .sar belgesinin girintilerini boyar. */
export function girintileriBoya(editor: vscode.TextEditor | undefined): void {
  if (!editor || editor.document.languageId !== "sarmal") return;

  const acik = vscode.workspace.getConfiguration("sarmal").get<boolean>("girintiRenkleri") !== false;
  const kovalar: vscode.Range[][] = PALET.map(() => []);

  if (acik) {
    const doc = editor.document;
    // Founder 2026-07-12: "çizgiler kesilmesin" — yorum/belge satırları da boyanır
    // (eski "kod-dışı boyanmaz" tasarımı süreklilik lehine kaldırıldı); tek kalan
    // kesinti word-wrap devam satırı (VS Code API sınırı — dallar.ts başlığı).
    for (let s = 0; s < doc.lineCount; s++) {
      const metin = doc.lineAt(s).text;
      const es = /^[ \t]+/.exec(metin);
      if (!es) continue;
      const bas = es[0];
      // Katmanlara böl: 2 boşluk ya da 1 tab = 1 kat; artık boşluk son kata yapışır.
      let sutun = 0;
      let kat = 0;
      while (sutun < bas.length) {
        const adim = bas[sutun] === "\t" ? 1 : Math.min(KAT, bas.length - sutun);
        kovalar[kat % PALET.length].push(new vscode.Range(s, sutun, s, sutun + adim));
        sutun += adim;
        kat++;
      }
    }
  }
  turler.forEach((t, i) => editor.setDecorations(t, kovalar[i]));
}

/** Etkinleştirme: editör/belge/ayar değişimlerine bağlanır. */
export function girintiKaydi(context: vscode.ExtensionContext): void {
  girintileriBoya(vscode.window.activeTextEditor);
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(girintileriBoya),
    vscode.workspace.onDidChangeTextDocument((e) => {
      const aktif = vscode.window.activeTextEditor;
      if (aktif && e.document === aktif.document) girintileriBoya(aktif);
    }),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("sarmal.girintiRenkleri")) girintileriBoya(vscode.window.activeTextEditor);
    }),
    { dispose: () => turler.forEach((t) => t.dispose()) },
  );
}

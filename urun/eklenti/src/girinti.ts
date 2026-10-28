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
//   İKİ STİL (Founder 2026-10-21 · "girinti boyası tül derinlik olsun"):
//     • VARSAYILAN (ayar verilmemiş, false ya da okunamayan) → TÜL DERİNLİK:
//       her kademe için 1 piksellik soluk çizgi ve tek renkte (mor), içeri
//       girdikçe çok az koyulaşan bir tül; renkleri ve çizimi 0.9.194 ile
//       aynıdır (PNL-A24 · dallar.ts inceStilMi).
//     • sarmal.girintiRenkleri = true → yukarıdaki gökkuşağı bantları;
//       renkleri ve çizimi 0.9.193 ile aynıdır.
// ═══════════════════════════════════════════════════════════════════════════

import * as vscode from "vscode";
import { inceStilMi } from "./dallar.ts";
import { tulRengi } from "./tul-rengi.ts";

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

// ── Tül derinlik stili ─────────────────────────────────────────────────────

// TÜL DERİNLİK (Founder 2026-10-21 · "girinti boyası tül derinlik olsun, daha estetik olur"):
//   her kademe ince çizgisinin yanında tek renkte (mor) bir tül taşır ve tül içeri
//   girdikçe çok az koyulaşır; derinlik hissedilir, renk cümbüşü olmaz.
const TUL_ALFA = [0.035, 0.06, 0.085, 0.11, 0.13, 0.15, 0.17];
const tulTurleri: vscode.TextEditorDecorationType[] = TUL_ALFA.map((a) =>
  vscode.window.createTextEditorDecorationType({
    // Çizgiyi dallar.ts'in ağaç glifleri verir; burada yalnız tül zemini boyanır.
    // Mor ton tek kaynaktandır (tul-rengi.ts); panel ağaçlarının çizgileri de oradan okur.
    backgroundColor: tulRengi("koyu", a),
    light: { backgroundColor: tulRengi("acik", a * 0.8) },
  }),
);

/** Girinti katmanları: 2 boşluk ya da 1 tab = 1 kat; her katın ilk karakteri çizgi taşır. */
function katBaslangiclari(bas: string): number[] {
  const sutunlar: number[] = [];
  let sutun = 0;
  while (sutun < bas.length) {
    sutunlar.push(sutun);
    sutun += bas[sutun] === "\t" ? 1 : Math.min(KAT, bas.length - sutun);
  }
  return sutunlar;
}

interface Cizgi { satir: number; sutun: number; bitis: number; kat: number; }
let tabanBellegi: { uri: string; surum: number; cizgiler: Cizgi[] } | undefined;

/** Taban çizgi konumları (belge sürümüne bağlı önbellek). */
function tabanCizgileri(doc: vscode.TextDocument): Cizgi[] {
  const uri = doc.uri.toString();
  if (tabanBellegi && tabanBellegi.uri === uri && tabanBellegi.surum === doc.version) return tabanBellegi.cizgiler;
  const cizgiler: Cizgi[] = [];
  for (let s = 0; s < doc.lineCount; s++) {
    const es = /^[ \t]+/.exec(doc.lineAt(s).text);
    if (!es) continue;
    const baslar = katBaslangiclari(es[0]);
    baslar.forEach((c, i) => cizgiler.push({ satir: s, sutun: c, bitis: baslar[i + 1] ?? es[0].length, kat: i }));
  }
  tabanBellegi = { uri, surum: doc.version, cizgiler };
  return cizgiler;
}

/** Tül derinlik stilini çizer: her kademe kendi tül türüyle, kademenin tam genişliğinde
 *  ve solunda ince çizgiyle boyanır. Boya imlece bağlı değildir. */
function inceBoya(editor: vscode.TextEditor): void {
  const katlar: vscode.Range[][] = tulTurleri.map(() => []);
  for (const c of tabanCizgileri(editor.document)) {
    katlar[Math.min(c.kat, katlar.length - 1)].push(new vscode.Range(c.satir, c.sutun, c.satir, c.bitis));
  }
  tulTurleri.forEach((t, i) => editor.setDecorations(t, katlar[i]));
  sonBoyama = { stil: "tul", dosya: editor.document.uri.fsPath, araliklar: katlar.map((k) => k.length) };
}

/** Son boyamanın salt okur ölçüsü (PNL-A24 nöbeti): hangi stil, hangi belge, kademe başına aralık sayısı. */
export interface GirintiOlcumu { stil: "tul" | "bant"; dosya: string; araliklar: number[] }
let sonBoyama: GirintiOlcumu | undefined;
export function girintiOlcumu(): GirintiOlcumu | undefined {
  return sonBoyama && { ...sonBoyama, araliklar: [...sonBoyama.araliklar] };
}

/** Etkin editördeki .sar belgesinin girintilerini boyar. */
export function girintileriBoya(editor: vscode.TextEditor | undefined): void {
  if (!editor || editor.document.languageId !== "sarmal") return;

  const gokkusagi = !inceStilMi();
  // Stil değişince öteki stilin izi temizlenir.
  if (gokkusagi) {
    for (const t of tulTurleri) editor.setDecorations(t, []);
  } else {
    turler.forEach((t) => editor.setDecorations(t, []));
    inceBoya(editor);
    return;
  }

  const kovalar: vscode.Range[][] = PALET.map(() => []);
  {
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
  sonBoyama = { stil: "bant", dosya: editor.document.uri.fsPath, araliklar: kovalar.map((k) => k.length) };
}

/** Basit geciktirici: art arda olaylar son çağrıya indirgenir. */
function geciktir<A extends unknown[]>(ms: number, is: (...a: A) => void): ((...a: A) => void) & { iptal(): void } {
  let zaman: ReturnType<typeof setTimeout> | undefined;
  const f = (...a: A) => { if (zaman) clearTimeout(zaman); zaman = setTimeout(() => { zaman = undefined; is(...a); }, ms); };
  f.iptal = () => { if (zaman) clearTimeout(zaman); zaman = undefined; };
  return f;
}

/** Etkinleştirme: editör/belge/imleç/ayar değişimlerine bağlanır. */
export function girintiKaydi(context: vscode.ExtensionContext): void {
  girintileriBoya(vscode.window.activeTextEditor);
  // Yazarken 120 ms geciktirilir; boya imlece bağlı olmadığından imleç olayı dinlenmez.
  const yazimBoya = geciktir(120, () => girintileriBoya(vscode.window.activeTextEditor));
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(girintileriBoya),
    vscode.workspace.onDidChangeTextDocument((e) => {
      const aktif = vscode.window.activeTextEditor;
      if (aktif && e.document === aktif.document) yazimBoya();
    }),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("sarmal.girintiRenkleri")) girintileriBoya(vscode.window.activeTextEditor);
    }),
    { dispose: () => {
      yazimBoya.iptal();
      [...turler, ...tulTurleri].forEach((t) => t.dispose());
    } },
  );
}

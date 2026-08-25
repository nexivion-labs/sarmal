// ═══════════════════════════════════════════════════════════════════════════
// onizleme.ts — .sar Okuma Modu = YERLİ CustomEditor (sekme YERİNDE tip değiştirir)
//
//   Yol ayrımı 3 (Founder 2026-07-03): sekme kapat/aç hilesi VS Code'un tab
//   modeliyle kavga etti (başka belgeler kapanıyor, çift sekme doğuyordu).
//   Doğru mekanizma: CustomReadonlyEditorProvider — VS Code'un kendi
//   "Reopen Editor With" altyapısı. `workbench.action.toggleEditorType`
//   AYNI SEKMEYİ yerinde kod↔okuma çevirir; diğer sekmelere DOKUNULMAZ,
//   her belge kendi sekmesinde bağımsız moda sahip.
//
//   Render: .sar → belgeMd({boya}) → markdown-it → webview (script'siz CSP).
// ═══════════════════════════════════════════════════════════════════════════

import * as vscode from "vscode";
import { readFileSync } from "node:fs";
import MarkdownIt from "markdown-it";
import hljs from "highlight.js";
import { belgeMd } from "../../cekirdek/src/belgele.ts";
import { agacYüz } from "../../cekirdek/src/agac.ts";
import { SozDizimHatasi } from "../../cekirdek/src/belirtec.ts";
import { snfBul } from "./ortak.ts";
import { ONIZLEME_METINLERI } from "./yuzey-metinleri.ts";

// YEDEK palet — asıl kaynak SNF kanonu (renkPaleti); bunlar kanon yokken devreye girer.
const AGAC_RENK: Record<string, string> = {
  "ÇalışmaAlanı": "#8A6E58", "Uygulama": "#9A7A5C", "Proje": "#AC814F",
  "Blok": "#C0925C", "Faz": "#D0A878", "Katman": "#D8BE94", "AltKatman": "#E2CFAA", "Adım": "#8CC152",
};
const AILE_RENK: Record<string, string> = {
  temel: "#AC814F", plan: "#C0925C", bilgi: "#4ec9b0", orkestrasyon: "#c9b458",
  etmen: "#c586c0", yuzey: "#ce9178", yasa: "#e06c6c", teknoloji: "#5b97a3",
  urun: "#C173CE", surec: "#9c7256", nitelik: "#b56a8e", oz: "#8a94a0",
};

// markdown-it: yerli önizlemenin motoru — html açık (kodBoya span'ları için).
// Yabancı dil kod-çitleri kendi renkleriyle (highlight.js).
const md = new MarkdownIt({
  html: true,
  linkify: true,
  breaks: false,
  highlight: (kod, dil) => {
    if (dil && hljs.getLanguage(dil)) {
      try { return hljs.highlight(kod, { language: dil, ignoreIllegals: true }).value; } catch { /* düş */ }
    }
    return "";
  },
});

// DIL-2 bölüm başlıkları kitapta ROZET olur (## Amaç → h2.sarmal-bolum-amac).
const BOLUMLER: Record<string, string> = {
  "Amaç": "amac", "Kapsam": "kapsam", "Neden": "neden", "Sonuç": "sonuc", "Nasıl": "nasil",
};
md.renderer.rules.heading_open = (tokens, idx, opts, _env, self) => {
  const icerik = tokens[idx + 1]?.content ?? "";
  const es = /^\s*(?:[\p{Extended_Pictographic}\uFE0F\u200D]+\s*)?(Amaç|Kapsam|Neden|Sonuç|Nasıl)\b/u.exec(icerik);
  if (es) tokens[idx].attrJoin("class", "sarmal-bolum sarmal-bolum-" + BOLUMLER[es[1]]);
  return self.renderToken(tokens, idx, opts);
};

let stil = "";

/** Ağaç çizimini HTML'e gömmeden önce kaçış (CSP script'siz; salt metin). */
function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function onizlemeKaydi(context: vscode.ExtensionContext): void {
  try {
    stil = readFileSync(vscode.Uri.joinPath(context.extensionUri, "medya", "onizleme.css").fsPath, "utf8");
  } catch { stil = ""; }

  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider("sarmal.okuma", new OkumaSaglayici(), {
      webviewOptions: { retainContextWhenHidden: true },
      supportsMultipleEditorsPerDocument: false,
    }),
    // Kod → okuma ve okuma → kod: İKİSİ DE yerli tip-değişimi (aynı sekme).
    vscode.commands.registerCommand("sarmal.onizleme", () =>
      vscode.commands.executeCommand("workbench.action.toggleEditorType")),
    vscode.commands.registerCommand("sarmal.kaynagaDon", () =>
      vscode.commands.executeCommand("workbench.action.toggleEditorType")),
  );
}

class OkumaSaglayici implements vscode.CustomReadonlyEditorProvider {
  openCustomDocument(uri: vscode.Uri): vscode.CustomDocument {
    return { uri, dispose: () => { /* durum yok */ } };
  }

  async resolveCustomEditor(dokuman: vscode.CustomDocument, panel: vscode.WebviewPanel): Promise<void> {
    panel.webview.options = { enableScripts: false };
    const doc = await vscode.workspace.openTextDocument(dokuman.uri);

    const yenile = (): void => { panel.webview.html = sayfaUret(doc); };

    // Yazdıkça canlı (300ms) — yalnız BU belge.
    let zamanlayici: ReturnType<typeof setTimeout> | undefined;
    const geciktirYenile = (): void => {
      if (zamanlayici) clearTimeout(zamanlayici);
      zamanlayici = setTimeout(yenile, 300);
    };
    const abone = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() !== dokuman.uri.toString()) return;
      geciktirYenile();
    });
    // 🩹 Bayat-önizleme tamiri (Founder bulgusu · 2026-08-10): editör DIŞINDAN
    // değişen dosya (ajan aracı, git, biçimlendirici) onDidChangeTextDocument
    // ateşlemez ve retainContextWhenHidden eski HTML'i saklar. İki kapak:
    // ① disk izleyicisi — dosya dışarıdan değişince taze çizim,
    // ② görünürlük — sekmeye geri dönüldüğünde taze çizim.
    const izleyici = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(
        vscode.Uri.joinPath(dokuman.uri, ".."),
        dokuman.uri.path.split("/").pop() ?? "*"));
    izleyici.onDidChange(geciktirYenile);
    izleyici.onDidCreate(geciktirYenile);
    const gorunurluk = panel.onDidChangeViewState((e) => {
      if (e.webviewPanel.visible) yenile();
    });
    panel.onDidDispose(() => { abone.dispose(); izleyici.dispose(); gorunurluk.dispose(); });

    yenile();
  }
}

function sayfaUret(doc: vscode.TextDocument): string {
  let govde: string;
  try {
    // Kaydedilmemiş değişiklik varsa editör metni gerçektir; yoksa DİSK gerçektir,
    // çünkü dışarıdan değişen dosyada TextDocument tazelenmemiş olabilir (2026-08-10).
    let metin: string;
    if (doc.isDirty) { metin = doc.getText(); }
    else { try { metin = readFileSync(doc.uri.fsPath, "utf8"); } catch { metin = doc.getText(); } }
    const snf = snfBul(doc);
    const aile = new Map<string, string>((snf?.widgetTipleri ?? []).map((t) => [t.ad, t.aile]));
    const agacR = snf?.renkPaleti?.agacRenkleri ?? AGAC_RENK;   // tek-kaynak: SNF (EKL-F4-A04)
    const aileR = snf?.renkPaleti?.aileler ?? AILE_RENK;
    const kitap = md.render(belgeMd(metin, {
      boya: true,
      tipRenk: (ad) => agacR[ad] ?? aileR[aile.get(ad) ?? ""],
    }));
    // 🌳 Ağaç yüzü (YUZ-1.1): yapı ├──/└── çizimi olarak panelin başında, canlı.
    let agac = "";
    try {
      // Boş satırlar sıkıştırılır: düz (iç içe olmayan) dosyalarda üreteç her
      // düğümden sonra boş satır basıyor ve blok seyrek bir listeye dönüyordu
      // (Founder gözlemi 2026-08-10 · ölçüm: ork.sar 54 satırın 27'si boştu).
      const cizim = agacYüz(metin).trimEnd().replace(/\n{2,}/g, "\n");
      if (cizim) agac = `<pre class="sarmal-agac"><code>${escapeHtml(cizim)}</code></pre>`;
    } catch { /* söz-dizim hatası: kitap render'ının hata kutusu zaten anlatır */ }
    govde = (agac ? `<h2 class="sarmal-bolum sarmal-bolum-nasil">${ONIZLEME_METINLERI.agacBasligi}</h2>${agac}` : "") + kitap;
  } catch (e) {
    govde = e instanceof SozDizimHatasi
      ? `<div class="sarmal-hata">⚠️ <b>${ONIZLEME_METINLERI.sozDizimBasligi}</b> (${e.satir}:${e.sutun}) — ${escapeHtml(e.message)}<br><small>${ONIZLEME_METINLERI.duzelinceYenilenir}</small></div>`
      : `<div class="sarmal-hata">⚠️ ${ONIZLEME_METINLERI.beklenmeyenHata}</div>`;
  }

  return `<!DOCTYPE html>
<html lang="${ONIZLEME_METINLERI.htmlDili}"><head><meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>${TEMEL_STIL}\n${stil}</style></head>
<body><main class="govde">${govde}</main></body></html>`;
}

// Yerli MD önizlemesinin tipografisi — tema değişkenli + layout ritmi.
const TEMEL_STIL = `
body { font-family: var(--vscode-markdown-font-family, -apple-system, sans-serif);
  font-size: var(--vscode-markdown-font-size, 14px); line-height: 1.6;
  color: var(--vscode-editor-foreground); background: var(--vscode-editor-background);
  margin: 0; }
.govde { max-width: min(1180px, 96vw); margin: 0 auto; padding: 1rem 1.4rem 3.5rem; }
@media (min-width: 1400px) { .govde { max-width: 1280px; } }
h1 { font-size: 1.9em; font-weight: 650; margin: 1.4em 0 .5em; padding-bottom: .35em;
  border-bottom: 1px solid color-mix(in srgb, currentColor 20%, transparent); }
.govde > h1:first-child { margin-top: .4em; }
h2 { font-size: 1.45em; font-weight: 600; margin: 1.5em 0 .5em; padding-bottom: .3em;
  border-bottom: 1px solid color-mix(in srgb, currentColor 15%, transparent); }
h3 { font-size: 1.18em; font-weight: 600; margin: 1.3em 0 .4em; }
p, ul, ol, blockquote { margin: .65em 0; }
table { margin: .9em 0; }
pre { margin: .7em 0 1.2em; }
blockquote { border-left: 4px solid color-mix(in srgb, currentColor 25%, transparent);
  padding: 0 1em; opacity: .9; }
code { font-family: var(--vscode-editor-font-family, monospace); font-size: .9em;
  background: color-mix(in srgb, currentColor 10%, transparent);
  padding: .1em .35em; border-radius: 4px; }
pre { font-family: var(--vscode-editor-font-family, monospace); font-size: .9em;
  background: var(--vscode-textCodeBlock-background, rgba(127,127,127,.08));
  padding: .8em 1em; border-radius: 6px; line-height: 1.45;
  white-space: pre-wrap; word-break: break-word; overflow-x: auto; }
/* Taşma sigortası: hiçbir öğe sayfayı yana kaydıramaz */
.govde { overflow-wrap: anywhere; }
pre code { background: none; padding: 0; font-size: 1em; }
table { border-collapse: collapse; }
th, td { border: 1px solid color-mix(in srgb, currentColor 25%, transparent);
  padding: .35em .8em; }
th { background: color-mix(in srgb, #C0925C 22%, transparent); font-weight: 650; }
tbody tr:nth-child(even) { background: color-mix(in srgb, currentColor 5%, transparent); }
table { display: block; max-width: 100%; overflow-x: auto; border-radius: 6px; }
/* DIL-2 bölüm rozetleri — kitapta Amaç/Kapsam/Sonuç bir bakışta seçilir */
.sarmal-bolum { border: none !important; padding: .28em .7em !important; border-radius: 7px;
  font-size: 1.08em !important; display: inline-block; margin: 1.15em 0 .35em !important; }
.sarmal-bolum-amac   { background: color-mix(in srgb, #4EC9B0 16%, transparent); border-left: 4px solid #4EC9B0 !important; }
.sarmal-bolum-kapsam { background: color-mix(in srgb, #569CD6 14%, transparent); border-left: 4px solid #569CD6 !important; }
.sarmal-bolum-neden  { background: color-mix(in srgb, #C586C0 14%, transparent); border-left: 4px solid #C586C0 !important; }
.sarmal-bolum-sonuc  { background: color-mix(in srgb, #8CC152 15%, transparent); border-left: 4px solid #8CC152 !important; }
.sarmal-bolum-nasil  { background: color-mix(in srgb, #DCDCAA 14%, transparent); border-left: 4px solid #DCDCAA !important; }
hr { border: none; border-top: 1px solid color-mix(in srgb, currentColor 20%, transparent); }
/* 🌳 Ağaç yüzü (YUZ-1.1) — ├──/└── çizgileri hizalı kalsın: kaydırma, sarma YOK */
pre.sarmal-agac { white-space: pre; word-break: normal; overflow-x: auto;
  border-left: 4px solid #8CC152;
  background: color-mix(in srgb, #8CC152 8%, var(--vscode-textCodeBlock-background, rgba(127,127,127,.08))); }
pre.sarmal-agac code { white-space: pre; }
a { color: var(--vscode-textLink-foreground); }
.sarmal-hata { border: 1px solid #e06c6c; border-radius: 6px; padding: .8rem 1rem; color: #e06c6c; }
/* highlight.js — yabanci dil kod-citleri (dart/python/...) editor paletiyle */
.hljs-keyword, .hljs-selector-tag, .hljs-tag { color: #C586C0; }
.hljs-string, .hljs-regexp, .hljs-addition { color: #CE9178; }
.hljs-number, .hljs-literal { color: #B5CEA8; }
.hljs-comment, .hljs-quote { color: #6A9955; font-style: italic; }
.hljs-title, .hljs-name, .hljs-section { color: #DCDCAA; }
.hljs-type, .hljs-class .hljs-title, .hljs-built_in { color: #4EC9B0; }
.hljs-variable, .hljs-attr, .hljs-attribute, .hljs-template-variable { color: #9CDCFE; }
.hljs-symbol, .hljs-bullet, .hljs-link, .hljs-meta { color: #569CD6; }
.hljs-emphasis { font-style: italic; } .hljs-strong { font-weight: 700; }
`;

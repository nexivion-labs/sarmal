// ═══════════════════════════════════════════════════════════════════════════
// satirici.ts — 🩺 Satır-İçi Tanılar (errorlens'in Sarmal'lısı · native)
//
//   Founder 2026-07-09: "o eklentilerin özelliklerini Sarmal'a koyalım — kendi
//   kendine yetsin." errorlens = motor tanılarını satır SONUNA yazar; biz de
//   kendi DiagnosticCollection'ımızı (source: "Sarmal") okuyup satır-içi
//   `after` decoration olarak düzeye göre renkli basıyoruz — üçüncü-partiye
//   gerek kalmadan aynı "canlı panel" hissi.
//     🔴 hata · 🟠 uyarı · 🔵 bilgi (kanon rozet renkleri).
//   Kapatma: sarmal.satirIciTani = false.
// ═══════════════════════════════════════════════════════════════════════════

import * as vscode from "vscode";
import { nabizAbone } from "./nabiz.ts";   // VIT-K78-A01: hata lensi TEK kalpten nabız atar

// Kanon rozet renkleri (settings.json workbench.colorCustomizations ile aynı).
//
// 🪦 BİLGİ DALININ SAHİPLİĞİ (GOC-YUZEY düzeltme halkası, 2026-07-28). Üç sunum
// yüzeyi ayrımından sonra bilgi düzeyli kayıtlar Problems koleksiyonunu terk
// etti ve Bildirimler görünüşüne taşındı. Satır-içi lens yalnız Problems'i okur
// (`vscode.languages.getDiagnostics` + Sarmal kaynak süzgeci), dolayısıyla
// `düzey` işlevi bugün "bilgi" değerini bir daha döndürmez ve bu üç satır ölü
// koddur. YİNE DE BİLEREK BIRAKILDI, iki gerekçeyle. Birincisi, `düzey` işlevi
// `DiagnosticSeverity` numaralandırmasının DÖRT değerini birden karşılayan tam
// bir işlevdir; bilgi dalını silmek Information ve Hint değerlerini "uyari"
// diye yalan söylemeye ya da işlevi kısmî bırakmaya zorlardı, ikisi de bu
// düzeltmenin kazandırdığından fazlasını götürür. İkincisi, bu dal bir güvenlik
// ağıdır: terfi turu bir tanının kademesini yükselttiğinde ya da başka bir
// sağlayıcı Sarmal koleksiyonuna bilgi düzeyli kayıt bastığında lens renksiz
// kalmaz. Dal ateşlenmediği sürece hiçbir maliyeti yoktur.
const RENK = {
  hata:  "#EF4444",
  uyari: "#FF8C42",
  bilgi: "#4D9FFF",
};
const ARKA = {   // satır fonu — çok hafif (metni ezmez, satırı işaretler)
  hata:  "rgba(239,68,68,0.07)",
  uyari: "rgba(255,140,66,0.07)",
  bilgi: "rgba(59,130,246,0.06)",
};

/** Tanı bizim mi? MIM-1.1'ten beri kaynak "Sarmal · <varlık>" etiketli — düz "Sarmal"
 *  karşılaştırması varlık-içi TÜM satır-içi mesajları susturuyordu (Founder canlı
 *  testte yakaladı 2026-07-11: "sadece uyarı yazıyor, sorunun ne olduğunu bildirmiyor"). */
export function sarmalKaynakli(source: string | undefined): boolean {
  return source === "Sarmal" || (source?.startsWith("Sarmal · ") ?? false);
}

function düzey(sev: vscode.DiagnosticSeverity): keyof typeof RENK {
  return sev === vscode.DiagnosticSeverity.Error ? "hata"
    : sev === vscode.DiagnosticSeverity.Warning ? "uyari" : "bilgi";
}

// Tek taban tür; renk/fon/metin her satırda renderOptions ile verilir.
const tur = vscode.window.createTextEditorDecorationType({
  isWholeLine: true,
  rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
});
// YUZ-3 ① (VIT-K78-A01): hata lensi NABIZ atar — iki tür dönüşümlü (parlak↔sönük).
// Yalnız HATA düzeyi atar; uyarı/bilgi statik kalır (dikkat hiyerarşisi).
const turHataParlak = vscode.window.createTextEditorDecorationType({
  isWholeLine: true, rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
});
const turHataSonuk = vscode.window.createTextEditorDecorationType({
  isWholeLine: true, rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
});
let hataParlakDekor: vscode.DecorationOptions[] = [];
let hataSonukDekor: vscode.DecorationOptions[] = [];
let hataAtis = true;

function hataBoya(editor: vscode.TextEditor | undefined): void {
  if (!editor || editor.document.languageId !== "sarmal") return;
  editor.setDecorations(hataAtis ? turHataParlak : turHataSonuk, hataAtis ? hataParlakDekor : hataSonukDekor);
  editor.setDecorations(hataAtis ? turHataSonuk : turHataParlak, []);
}

/** Satır-içi tanı metnini sadeleştir: çok-satır → tek satır (↳ ile). */
function tekSatır(mesaj: string): string {
  return mesaj.replace(/\s*\n\s*/g, "  ").replace(/\s+/g, " ").trim();
}

/** Etkin editöre satır-içi tanıları çizer (source: "Sarmal" olanlar). */
export function satiriciCiz(editor: vscode.TextEditor | undefined): void {
  if (!editor || editor.document.languageId !== "sarmal") return;
  const açık = vscode.workspace.getConfiguration("sarmal").get<boolean>("satirIciTani") !== false;
  if (!açık) {
    editor.setDecorations(tur, []);
    editor.setDecorations(turHataParlak, []);
    editor.setDecorations(turHataSonuk, []);
    hataParlakDekor = []; hataSonukDekor = [];
    return;
  }

  const tanılar = vscode.languages.getDiagnostics(editor.document.uri)
    .filter((t) => sarmalKaynakli(t.source));

  // Satır başına EN AĞIR tanıyı göster (errorlens deseni — satır sonu tek mesaj).
  const enAgir = new Map<number, vscode.Diagnostic>();
  for (const t of tanılar) {
    const s = t.range.start.line;
    const v = enAgir.get(s);
    if (!v || t.severity < v.severity) enAgir.set(s, t);   // Error(0) < Warning(1) < Info(2)
  }

  const dekor: vscode.DecorationOptions[] = [];
  hataParlakDekor = []; hataSonukDekor = [];
  for (const [satır, t] of enAgir) {
    const d = düzey(t.severity);
    const satırUzunluk = editor.document.lineAt(satır).text.length;
    const secenek = (renk: string): vscode.DecorationOptions => ({
      range: new vscode.Range(satır, satırUzunluk, satır, satırUzunluk),
      renderOptions: {
        after: {
          contentText: "   " + tekSatır(t.message),
          color: renk,
          fontStyle: "italic",
        },
      },
    });
    if (d === "hata") {   // YUZ-3 ①: hata nabız çiftine gider (parlak ↔ %55 sönük)
      hataParlakDekor.push(secenek(RENK.hata));
      hataSonukDekor.push(secenek(RENK.hata + "55"));
    } else {
      dekor.push(secenek(RENK[d]));
    }
  }
  // Fon: ayrı geçiş — isWholeLine tür tek olduğu için fonu after ile birleştiremeyiz;
  // basitlik + performans için yalnız satır-içi metin (errorlens'in çekirdeği). Fon
  // istenirse düzey-başına ayrı tür eklenebilir; şimdilik metin yeterli.
  void ARKA;
  editor.setDecorations(tur, dekor);
  hataBoya(editor);
}

/** Etkinleştirme: tanı/editör/belge değişimlerine bağlanır. */
export function satiriciKaydi(context: vscode.ExtensionContext): void {
  satiriciCiz(vscode.window.activeTextEditor);
  // YUZ-3 ①: hata lensi tek kalpten atar (nabiz.ts — takdir/yildiz ile AYNI zamanlayıcı).
  const nabiz = nabizAbone((a) => { hataAtis = a; hataBoya(vscode.window.activeTextEditor); });
  context.subscriptions.push(
    // Tanılar değişince (motor yeniden denetleyince) satır-içini tazele.
    vscode.languages.onDidChangeDiagnostics(() => satiriciCiz(vscode.window.activeTextEditor)),
    vscode.window.onDidChangeActiveTextEditor(satiriciCiz),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("sarmal.satirIciTani")) satiriciCiz(vscode.window.activeTextEditor);
    }),
    nabiz,
    { dispose: () => { tur.dispose(); turHataParlak.dispose(); turHataSonuk.dispose(); } },
  );
}

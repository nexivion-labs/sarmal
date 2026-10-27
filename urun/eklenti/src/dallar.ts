// ═══════════════════════════════════════════════════════════════════════════
// dallar.ts — 🌳 Ağaç Kılavuz Çizgileri (kaynak editöründe canlı hiyerarşi)
//
//   Founder 2026-07-03: "Dart'taki işaret çubukları Sarmal'da da olsun."
//   Founder 2026-07-09: "çizgiler satır aralarında kesiliyor — kesilmesin; dal
//   çubuklarıyla aileyi/bağımlılığı göster, UI güzel olsun. Çok projeyi başka
//   türlü yönetemeyiz." → Bu sürüm KESİNTİSİZ + DALLI + gradyan:
//     • ayrıştırıcı düğüm ağacından çizilir (her düğüm satır + kardeş bilir)
//     • │ dikey bağ her satırda akar (boş/kısa satır dahil — kopma yok)
//     • ├─ ara-kardeş · └─ son-kardeş dal bağlaçları
//     • her derinlik ağaç-gradyanıyla renklenir (kök→dal→meyve)
//     • kapanış `}`'ine hayalet etiket: ‹ Blok BLK-X (kaynak kirlenmez)
//   Kutu-glifler mutlak-konumla girintinin ÜZERİNE biner → metin kaymaz.
//
//   KAPANIŞ ETİKETİ DİLDEN BAĞIMSIZDIR (MGZ-A09 · Founder hükmü 2026-10-10).
//   Etiket dosyadaki bir tipi adlandırır ve o tipin dosyadaki adını, yani
//   açılış satırında yazan Türkçe sözcüğü taşır. İngilizce pencerede `‹ Block`
//   basmak dosyada bulunmayan bir adı öğretirdi; bu yüzden etiket her dilde
//   aynıdır ve dil değişikliği kılavuzları yeniden çizdirmez.
//
//   KESİNTİ SINIRLARI (VIT-K78-A04 · dürüst belgeleme 2026-07-11):
//   dalIzgarasi() (dallar-cekirdek.ts) kardeşler arasına ARALIKSIZ │ koyar — yorum/belge satırları dahil;
//   muafiyet-kaynaklı dal-çizgisi kesintisi YOKTUR. Kalan iki kesinti VS Code
//   API sınırıdır ve dekorasyonla ÇÖZÜLEMEZ (dekorasyon belge satırına bağlanır,
//   görsel satıra değil): ① CodeLens sanal-satırı çizgiyi görsel olarak böler;
//   ② word-wrap devam satırı glifsiz kalır. Kesintisiz bütün görünüm Yol
//   Haritası paneli + koni kartında yaşar (Founder kararı 2026-07-10: yüzey =
//   panel+kart; editör-içi kart yolları KAPALI). belgeSatirlari() muafiyeti
//   ARTIK HİÇBİR boyamaya uygulanmıyor (Founder 2026-07-12 süreklilik kararı —
//   girinti.ts de yorum/belge satırlarını boyar); işlev katla/anahat için yaşar.
// ═══════════════════════════════════════════════════════════════════════════

import * as vscode from "vscode";
import { programAl } from "./onbellek.ts";   // EKL-F9-A06: paylaşımlı AST önbelleği
import type { Program } from "../../cekirdek/src/sozdizim.ts";
import { dalIzgarasi, satirDizesi, blokAraliklari } from "./dallar-cekirdek.ts";   // KPS-SIR-A02: sütun yapı derinliğinden

// Tek taban tür — glif/renk/konum her aralıkta ayrıca (renderOptions) verilir.
const glifTuru = vscode.window.createTextEditorDecorationType({});
const etiketTuru = vscode.window.createTextEditorDecorationType({});

const ETIKET_ESIGI = 4;      // (kapanış − açılış) satır farkı bu değerden küçükse etiket yok

/** `sarmal.girintiRenkleri` ayarının varsayılanı (PNL-A06 · Founder 2026-10-27): gökkuşağı bantları.
 *  Paketin ilanıyla (package.json) aynı olmak zorundadır; birim nöbeti ikisini karşılaştırır. */
export const GIRINTI_RENKLERI_VARSAYILANI = true;

/** İnce stil (tül derinlik): `sarmal.girintiRenkleri` açıkça false verildiğinde geçerlidir. Ayar
 *  verilmemişse ya da okunamazsa varsayılan gökkuşağı bantları çizilir (girinti.ts). */
export function inceStilMi(): boolean {
  try { return vscode.workspace.getConfiguration("sarmal").get<boolean>("girintiRenkleri", GIRINTI_RENKLERI_VARSAYILANI) === false; }
  catch { return !GIRINTI_RENKLERI_VARSAYILANI; }
}

/** Belge/yorum satırları (0-tabanlı): `-->| … |<--` blokları + tam-satır `//`.
 *  Kod-DIŞI bölge → ağaç çizgileri ve girinti boyası burada GÖRÜNMEZ (yalnız kod). */
export function belgeSatirlari(doc: vscode.TextDocument): Set<number> {
  const küme = new Set<number>();
  let içeride = false;
  for (let s = 0; s < doc.lineCount; s++) {
    const t = doc.lineAt(s).text;
    if (içeride) { küme.add(s); if (t.includes("|<--")) içeride = false; continue; }
    if (t.includes("-->|")) { küme.add(s); içeride = !t.includes("|<--"); continue; }
    if (t.trimStart().startsWith("//")) küme.add(s);   // tam-satır yorum
  }
  return küme;
}

// ── glif ızgarası: SAF çekirdekte (dallar-cekirdek.ts · KPS-SIR-A02) ──────────
//   Bağlaç sütunu girintiden değil ayrıştırıcının verdiği yapı derinliğinden
//   hesaplanır; girintisi bozuk dosyada da ağaç yapıyı doğru gösterir.

/** Kapanış `}` etiketleri: ortak blok taramasından (dallar-cekirdek.ts) türer. */
function etiketleriTara(doc: vscode.TextDocument): vscode.DecorationOptions[] {
  const satirlar: string[] = [];
  for (let s = 0; s < doc.lineCount; s++) satirlar.push(doc.lineAt(s).text);
  const etiketler: vscode.DecorationOptions[] = [];
  const ince = inceStilMi();
  for (const b of blokAraliklari(satirlar)) {
    if (!b.ad || b.kapanan - b.acan < ETIKET_ESIGI) continue;
    const m = satirlar[b.kapanan];
    etiketler.push({
      range: new vscode.Range(b.kapanan, m.length, b.kapanan, m.length),
      renderOptions: { after: {
        contentText: `  ‹ ${b.ad}${b.kod ? " " + b.kod : ""}`,
        // İnce stilde etiket daha da soluk: kılavuz çizgisini bastırmasın.
        color: ince ? "rgba(150,150,150,0.32)" : "rgba(150,150,150,0.5)", fontStyle: "italic",
      } },
    });
  }
  return etiketler;
}

// ── Flutter tekniği (dart-code eklentisi · FlutterUiGuideDecorations) ────────
//   Satır başına TEK inline dize: kutu-karakterleri doğru sütunlara koy, araları
//   NBSP; `width:"0"` ile metni İTMEDEN before olarak bas. Inline karakterler
//   satır yüksekliğini DOĞAL doldurur → satır aralarında boşluk YOK (kopmaz).
const CIZGI_RENGI = "rgba(206,166,102,0.9)";        // koyu tema: sıcak altın (Flutter gibi temiz)
const CIZGI_RENGI_ACIK = "rgba(138,96,38,0.9)";     // açık tema: koyu bronz — beyaz zeminde kaybolmaz (RF-T1-A02)

/** Belgeyi çözümle → satır-içi kılavuz dizeleri (Flutter tekniği) + etiketler. */
export function dallariHesapla(doc: vscode.TextDocument): {
  glifler: vscode.DecorationOptions[];
  etiketler: vscode.DecorationOptions[];
} {
  const program: Program | undefined = programAl(doc);   // EKL-F9-A06: tek parse
  if (!program) return { glifler: [], etiketler: [] };    // söz-dizim hatası: önceki çizim kalsın

  const g = dalIzgarasi(program);

  const glifler: vscode.DecorationOptions[] = [];
  for (const [satır, sr] of g) {
    // KPS-SIR-A02: dize saf çekirdekte kurulur; az girintili düğümün dalı metnin
    // önündeki son sütuna sıkıştırılır (sınırı dallar-cekirdek.ts belgesindedir).
    const info = doc.lineAt(satır);
    const sonuc = satirDizesi(sr, info.firstNonWhitespaceCharacterIndex, info.range.end.character);
    if (!sonuc) continue;
    const { capa: çapa, dize } = sonuc;
    glifler.push({
      range: new vscode.Range(satır, çapa, satır, çapa),
      renderOptions: {
        before: {
          contentText: dize,
          color: CIZGI_RENGI,
          fontStyle: "normal",
          width: "0",                 // metni İTMEZ — Flutter'ın anahtarı
          margin: "0 1px 0 -1px",
        },
        // RF-T1-A02: açık temada altın çizgi beyaza karışıyordu — tema-duyarlı renk.
        light: { before: { color: CIZGI_RENGI_ACIK } },
      },
    });
  }
  return { glifler, etiketler: etiketleriTara(doc) };
}

/** Etkin editöre dalları çizer. */
export function dallariCiz(editor: vscode.TextEditor | undefined): void {
  if (!editor || editor.document.languageId !== "sarmal") return;
  const açık = vscode.workspace.getConfiguration("sarmal").get<boolean>("agacCizgileri") !== false;
  if (!açık) {
    editor.setDecorations(glifTuru, []);
    editor.setDecorations(etiketTuru, []);
    return;
  }
  const { glifler, etiketler } = dallariHesapla(editor.document);
  // Ağaç çizgileri (├─ ╰ │) her stilde çizilir (Founder 2026-10-21: "çizgiler yine
  // kaybolmuş"); tül derinlik stilinde girinti.ts yalnız zemini boyar, çizgiyi bu dosya verir.
  editor.setDecorations(glifTuru, glifler);
  editor.setDecorations(etiketTuru, etiketler);
}

/** Etkinleştirme: editör/belge/ayar değişimlerine bağlanır. Çizim dilden
 *  bağımsız olduğu için yalnız kılavuz ayarı yeniden çizdirir (MGZ-A09). */
export function dallarKaydi(context: vscode.ExtensionContext): void {
  dallariCiz(vscode.window.activeTextEditor);
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(dallariCiz),
    vscode.workspace.onDidChangeTextDocument((e) => {
      const aktif = vscode.window.activeTextEditor;
      if (aktif && e.document === aktif.document) dallariCiz(aktif);
    }),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("sarmal.agacCizgileri") || e.affectsConfiguration("sarmal.girintiRenkleri"))
        dallariCiz(vscode.window.activeTextEditor);
    }),
    { dispose: () => { glifTuru.dispose(); etiketTuru.dispose(); } },
  );
}

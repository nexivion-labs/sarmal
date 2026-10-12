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
import { dalIzgarasi, satirDizesi } from "./dallar-cekirdek.ts";   // KPS-SIR-A02: sütun yapı derinliğinden

// Tek taban tür — glif/renk/konum her aralıkta ayrıca (renderOptions) verilir.
const glifTuru = vscode.window.createTextEditorDecorationType({});
const etiketTuru = vscode.window.createTextEditorDecorationType({});

const ETIKET_ESIGI = 4;      // en az bu kadar satırlık bloklara kapanış etiketi

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

/** Kapanış `}` etiketleri için hafif sözcüksel tarama (dal ızgarasından bağımsız). */
function etiketleriTara(doc: vscode.TextDocument): vscode.DecorationOptions[] {
  const etiketler: vscode.DecorationOptions[] = [];
  const yığın: { ad: string; kod: string; açan: number }[] = [];
  const çağrı: { ad: string; ham: string }[] = [];
  let belge = false, üçlü = false, sonKap: { ad: string; ham: string } | undefined;

  for (let s = 0; s < doc.lineCount; s++) {
    const m = doc.lineAt(s).text;
    if (belge) { if (m.includes("|<--")) belge = false; continue; }
    let i = 0, dz = false, ad = "", ab = -1;
    while (i < m.length) {
      const k = m[i];
      if (üçlü) { if (m.startsWith('"""', i)) { üçlü = false; i += 3; continue; } i++; continue; }
      if (dz) { if (k === '"') dz = false; i++; continue; }
      if (m.startsWith('"""', i)) { üçlü = true; i += 3; continue; }
      if (k === '"') { dz = true; i++; continue; }
      if (k === "/" && m[i + 1] === "/") break;
      if (m.startsWith("-->|", i)) { belge = true; break; }
      if (/[\p{L}\p{N}_-]/u.test(k)) { if (ab < 0) ab = i; i++; continue; }
      if (ab >= 0) { ad = m.slice(ab, i); ab = -1; }
      // Yeni çağrı açıldı → bayat sonKap'ı temizle: `raflar: {` MAP bloğu, önceki
      // `Raf(...)`'ın adını YANLIŞLIKLA almasın (Kitaplık'a "‹ Raf" etiketi bug'ı).
      if (k === "(") { çağrı.push({ ad, ham: "" }); ad = ""; sonKap = undefined; }
      else if (k === ")") { sonKap = çağrı.pop(); }
      else if (k === "{") {
        const sh = sonKap; sonKap = undefined;
        yığın.push({ ad: sh?.ad ?? "", kod: sh ? /kod:\s*([^,\s)]+)/.exec(sh.ham)?.[1] ?? "" : "", açan: s });
      } else if (k === "}") {
        const b = yığın.pop();
        if (b && b.ad && s - b.açan >= ETIKET_ESIGI) {
          etiketler.push({
            range: new vscode.Range(s, m.length, s, m.length),
            renderOptions: { after: {
              contentText: `  ‹ ${b.ad}${b.kod ? " " + b.kod : ""}`,
              color: "rgba(150,150,150,0.5)", fontStyle: "italic",
            } },
          });
        }
      }
      if (çağrı.length && k !== "(") çağrı[çağrı.length - 1].ham += k;
      i++;
    }
    if (ab >= 0) ad = m.slice(ab);
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
      if (e.affectsConfiguration("sarmal.agacCizgileri"))
        dallariCiz(vscode.window.activeTextEditor);
    }),
    { dispose: () => { glifTuru.dispose(); etiketTuru.dispose(); } },
  );
}

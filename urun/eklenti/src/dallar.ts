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
//   KESİNTİ SINIRLARI (VIT-K78-A04 · dürüst belgeleme 2026-07-11):
//   döşe() kardeşler arasına ARALIKSIZ │ koyar — yorum/belge satırları dahil;
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
import type { Program, Dugum } from "../../cekirdek/src/sozdizim.ts";
import { kanonikWidgetAdi } from "./yuzey-metinleri.ts";

/** Derinlik paleti — ağaç gradyanı (kök kahvesi → yaprak yeşili → meyve moru). */
const CIZGI_PALETI = [
  "rgba(196,150,96,0.95)",   // kök (kahve)
  "rgba(210,164,108,0.92)",  // gövde
  "rgba(222,184,132,0.90)",  // dal kabuğu
  "rgba(150,205,92,0.92)",   // yaprak yeşili
  "rgba(137,186,115,0.88)",  // filiz
  "rgba(203,125,216,0.88)",  // meyve (mor)
];

const GENISLIK = 2;          // seviye başına sütun (.sar girintisi = 2 boşluk)

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

// ── glif ızgarası: grid[satır][seviye] = "│" | "├" | "└" ─────────────────────
type Izgara = Map<number, Map<number, string>>;

function koy(g: Izgara, satır: number, seviye: number, glif: string, ezme = false): void {
  let sr = g.get(satır);
  if (!sr) { sr = new Map(); g.set(satır, sr); }
  if (ezme || !sr.has(seviye)) sr.set(seviye, glif);
}

/** Bir düğümün başlangıç satırı (0-tabanlı). */
function satırNo(d: Dugum): number { return Math.max(0, d.satir - 1); }

interface Kardeş { satır: number; sütun: number; dugum?: Dugum; }

/** Düğümün çocukları: YAPISAL çocuklar + `raflar:{}` harita kısayolu (dosya-analojisi).
 *  Referans temizliği: attribute'lar (kod/durum/ne/görev…) ağaca GİRMEZ — yalnız
 *  yapısal düğümler + raflar (klasör→dosya gibi). Çok-satırlı değer içi kirlenmez. */
function çocuklar(d: Dugum): Kardeş[] {
  const liste: Kardeş[] =
    d.cocuklar.map((c) => ({ satır: satırNo(c), sütun: Math.max(0, c.sutun - 1), dugum: c }));
  const haritaEkle = (ciftler?: { satir: number; sutun: number }[]): void => {
    for (const c of ciftler ?? []) liste.push({ satır: Math.max(0, c.satir - 1), sütun: Math.max(0, c.sutun - 1) });
  };
  for (const p of [...d.parametreler, ...d.ozellikler]) {
    if (p.deger.tur === "harita" && p.ad === "raflar") haritaEkle(p.deger.ciftler);
  }
  return liste.sort((a, b) => a.satır - b.satır);
}

/** Sibling grubunu ızgaraya döşe: ├/└ dallar + aralarında sürekli │.
 *  Bağlaç sütunu = düğüm sütunu − GENISLIK (metnin tam SOLUNDAKİ 2 sütun).
 *  Sütun 0'daki kökler (bağlaç sütunu < 0) işaretlenmez, yalnız içine inilir. */
function döşe(g: Izgara, kardeşler: Kardeş[]): void {
  kardeşler.forEach((n, i) => {
    const son = i === kardeşler.length - 1;
    const bs = n.sütun - GENISLIK;            // bağlaç sütunu
    if (bs >= 0) {
      koy(g, n.satır, bs, son ? "└" : "├", true);              // dal (│ üstüne ezer)
      if (!son) for (let ℓ = n.satır + 1; ℓ < kardeşler[i + 1].satır; ℓ++) koy(g, ℓ, bs, "│");
    }
    if (n.dugum) döşe(g, çocuklar(n.dugum));
  });
}

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
              contentText: `  ‹ ${kanonikWidgetAdi(b.ad, b.ad)}${b.kod ? " " + b.kod : ""}`,
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
const V = "│";      // │ dikey
const H = "─";      // ─ yatay (dal ucu)
const ORTA = "├";   // ├ ara-kardeş (dikey sürer)
const SON = "╰";    // ╰ son-kardeş köşesi (yuvarlak — Flutter ile birebir)
const NBSP = " ";
const CIZGI_RENGI = "rgba(206,166,102,0.9)";        // koyu tema: sıcak altın (Flutter gibi temiz)
const CIZGI_RENGI_ACIK = "rgba(138,96,38,0.9)";     // açık tema: koyu bronz — beyaz zeminde kaybolmaz (RF-T1-A02)

/** Belgeyi çözümle → satır-içi kılavuz dizeleri (Flutter tekniği) + etiketler. */
export function dallariHesapla(doc: vscode.TextDocument): {
  glifler: vscode.DecorationOptions[];
  etiketler: vscode.DecorationOptions[];
} {
  const program: Program | undefined = programAl(doc);   // EKL-F9-A06: tek parse
  if (!program) return { glifler: [], etiketler: [] };    // söz-dizim hatası: önceki çizim kalsın

  const g: Izgara = new Map();
  döşe(g, program.bildirimler.map((b) => ({ satır: satırNo(b), sütun: Math.max(0, b.sutun - 1), dugum: b })));

  const glifler: vscode.DecorationOptions[] = [];
  for (const [satır, sr] of g) {
    const sütunlar = [...sr.keys()];
    if (!sütunlar.length) continue;
    const enSon = Math.max(...sütunlar) + GENISLIK;         // dal ucu için +GENISLIK pay
    const chars: string[] = new Array(enSon).fill(NBSP);
    for (const [sütun, glif] of sr) {
      if (glif === "│") {
        if (chars[sütun] === NBSP) chars[sütun] = V;
        else if (chars[sütun] === SON) chars[sütun] = ORTA;   // dikey + köşe = ├
      } else {                                                // dal (├ / └)
        chars[sütun] = glif === "└" ? SON : ORTA;
        for (let c = sütun + 1; c < sütun + GENISLIK; c++)     // ─ metne kadar uzat
          if (chars[c] === NBSP) chars[c] = H;
      }
    }
    // Metnin bulunduğu bölgeyi temizle (kılavuz yalnız girintide görünür).
    const info = doc.lineAt(satır);
    const ilkYazı = info.firstNonWhitespaceCharacterIndex;
    const satırSonu = info.range.end.character;
    for (let c = ilkYazı; c < Math.min(chars.length, satırSonu); c++) chars[c] = NBSP;
    // Çapa: ilk kılavuz sütunu (kısa satırda 0). before oraya, width:0 (metni itmez).
    const ilkKılavuz = Math.min(...sütunlar);
    const çapa = satırSonu < ilkKılavuz ? 0 : ilkKılavuz;
    const dize = chars.slice(çapa).join("");
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

/** Etkinleştirme: editör/belge/ayar değişimlerine bağlanır. */
export function dallarKaydi(
  context: vscode.ExtensionContext,
  dilAyariDegistiMi: (olay: vscode.ConfigurationChangeEvent) => boolean,
): void {
  dallariCiz(vscode.window.activeTextEditor);
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(dallariCiz),
    vscode.workspace.onDidChangeTextDocument((e) => {
      const aktif = vscode.window.activeTextEditor;
      if (aktif && e.document === aktif.document) dallariCiz(aktif);
    }),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("sarmal.agacCizgileri") || dilAyariDegistiMi(e))
        dallariCiz(vscode.window.activeTextEditor);
    }),
    { dispose: () => { glifTuru.dispose(); etiketTuru.dispose(); } },
  );
}

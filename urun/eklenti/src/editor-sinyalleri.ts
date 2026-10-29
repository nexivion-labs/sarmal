// ═══════════════════════════════════════════════════════════════════════════
// editor-sinyalleri.ts — 〰️ SORUNLAR PANELİ KAPALIYKEN EDİTÖRDEKİ SİNYALLER
//                        (PNL-A22 · OZK-14 ÜÇÜNCÜSÜ · YUZ-3.1 · YAS-3.4)
//
//   Ayar kapalıyken Sarmal tanıları VS Code tanı koleksiyonuna yazılmaz; koleksiyonun
//   editöre kendiliğinden verdiği dört şey bu modülde aynı tanı nesnelerinden üretilir:
//     · Satır işareti: tanının sözcüğünün altında dalgalı çizgi, düzeyin renginde
//       (Dur kırmızı, Dikkat sarı, Bilgi mavi; Sinyaller sekmesindeki renkler). Aynı
//       renk kaydırma çubuğunun genel bakış cetvelinde de görünür.
//     · Hover: tanının düzeyi (bant adı), kodu, iletisi, önerisi ve dayandığı kanon
//       maddesi; madde tıklanınca tanımı açılır.
//     · Dosya gezgininde rozet: Dur ya da Dikkat taşıyan dosyanın adı düzeyin
//       renginde boyanır ve sayısı rozet olarak yazılır; renk üst klasörlere yayılır.
//     · Hızlı düzeltme bu modülde değildir: duzeltme.ts aynı listeyi
//       `sorunTanilari` üzerinden okur (sorun-tanilari.ts).
//   Ayar açıkken bu modül hiçbir şey çizmez; aynı işleri VS Code koleksiyondan yapar.
//
//   VERİ KARAR VERMEZ, YALNIZ GÖSTERİR. Satırlar eklentinin girişinden gelir: her
//   kayıt turun ürettiği tanı (`tani`) ile ondan kurulan editör tanısıdır (`tanilama`,
//   koleksiyona da giden nesnenin aynısı). Kapsam süzgeci girişte uygulanır.
// ═══════════════════════════════════════════════════════════════════════════

import * as vscode from "vscode";
import type { Tani } from "../../cekirdek/src/tani.ts";
import { SINYAL_BANTLARI, duzeyBandi, type SinyalBandi } from "./sinyaller-cekirdek.ts";
import { BANT_RENGI, KANON_MADDESI_KOMUTU, turKanonMaddeleri } from "./sinyaller.ts";
import { SINYAL_METINLERI } from "./yuzey-metinleri.ts";
import { sorunlarPaneliAcik } from "./sorun-tanilari.ts";
import type { AnlamRengi } from "./simge-cizelgesi.ts";

/** Editördeki bir sinyal: turun tanısı ve ondan kurulan editör tanısı. */
export interface EditorSinyali {
  readonly tani: Tani;
  readonly tanilama: vscode.Diagnostic;
}

/** Eklentinin girişinin verdiği iki okuma: dosyanın sinyalleri (üç bant) ve hata ile uyarıları. */
export interface EditorSinyalKaynagi {
  sinyaller(dosya: string): readonly EditorSinyali[];
  sorunlar(dosya: string): readonly vscode.Diagnostic[];
}

/** Anlam renginin tema rengi: Sinyaller simgelerinin üretildiği renklerin aynısı (arac/simge-uret.mjs ANLAM_RENK). */
const ANLAM_TEMA_RENGI: Readonly<Partial<Record<AnlamRengi, string>>> = { hata: "charts.red", uyari: "charts.yellow", bilgi: "charts.blue" };

/** Bandın tema rengi (Dur kırmızı, Dikkat sarı, Bilgi mavi). */
export function bantTemaRengi(bant: SinyalBandi): string {
  return ANLAM_TEMA_RENGI[BANT_RENGI[bant]]!;
}

/** Bandın satır işareti: dalgalı alt çizgi ve genel bakış cetvelindeki işaret, ikisi de bandın renginde. */
export function satirIsaretiSecenekleri(bant: SinyalBandi): vscode.DecorationRenderOptions {
  const renk = bantTemaRengi(bant);
  return {
    // VS Code tema renklerini CSS değişkeni olarak taşır (`charts.red` → `--vscode-charts-red`).
    textDecoration: `underline wavy var(--vscode-${renk.replace(/\./g, "-")})`,
    overviewRulerColor: new vscode.ThemeColor(renk),
    overviewRulerLane: vscode.OverviewRulerLane.Right,
  };
}

/** Son çizimin salt okur ölçüsü (nöbet): dosya ve bant başına [satır, başlangıç, bitiş] aralıkları. */
export interface EditorSinyalOlcumu {
  dosya: string;
  etkin: boolean;
  bantlar: Record<SinyalBandi, Array<[number, number, number]>>;
}

export class EditorSinyalleri implements vscode.HoverProvider, vscode.FileDecorationProvider, vscode.Disposable {
  private readonly turler: Record<SinyalBandi, vscode.TextEditorDecorationType>;
  private readonly dosyaDegisti = new vscode.EventEmitter<vscode.Uri | vscode.Uri[] | undefined>();
  readonly onDidChangeFileDecorations = this.dosyaDegisti.event;
  private readonly olcumler = new Map<string, EditorSinyalOlcumu>();

  constructor(private readonly kaynak: EditorSinyalKaynagi) {
    this.turler = Object.fromEntries(SINYAL_BANTLARI.map((b) => [b, vscode.window.createTextEditorDecorationType(satirIsaretiSecenekleri(b))])) as Record<SinyalBandi, vscode.TextEditorDecorationType>;
  }

  /** Bu yüzey yalnız Sorunlar paneli kapalıyken çizer. */
  etkin(): boolean { return !sorunlarPaneliAcik(); }

  /** Editörün satır işaretlerini çizer; ayar açıksa ya da belge Sarmal değilse temizler. */
  ciz(editor: vscode.TextEditor | undefined): void {
    if (!editor) return;
    const dosya = editor.document.uri.fsPath;
    const etkin = this.etkin() && editor.document.languageId === "sarmal";
    const kovalar = Object.fromEntries(SINYAL_BANTLARI.map((b) => [b, [] as vscode.Range[]])) as Record<SinyalBandi, vscode.Range[]>;
    if (etkin) {
      for (const s of this.kaynak.sinyaller(dosya)) {
        const bant = duzeyBandi(s.tani.duzey);
        if (bant) kovalar[bant].push(s.tanilama.range);
      }
    }
    for (const b of SINYAL_BANTLARI) editor.setDecorations(this.turler[b], kovalar[b]);
    this.olcumler.set(dosya, {
      dosya, etkin,
      bantlar: Object.fromEntries(SINYAL_BANTLARI.map((b) => [b, kovalar[b].map((r) => [r.start.line, r.start.character, r.end.character])])) as EditorSinyalOlcumu["bantlar"],
    });
  }

  /** Görünen bütün editörler yeniden çizilir. */
  cizHepsi(): void { for (const e of vscode.window.visibleTextEditors) this.ciz(e); }

  /** Bir dosyanın sinyalleri değişti: görünen editörü yeniden çizilir, gezgin rozeti tazelenir. */
  dosyaTazele(uri: vscode.Uri): void {
    for (const e of vscode.window.visibleTextEditors) if (e.document.uri.fsPath === uri.fsPath) this.ciz(e);
    if (this.etkin()) this.dosyaDegisti.fire(uri);
  }

  /** Ayar ya da kapsam değişti: her şey yeniden çizilir. */
  hepsiniTazele(): void {
    this.cizHepsi();
    this.dosyaDegisti.fire(undefined);
  }

  provideHover(doc: vscode.TextDocument, konum: vscode.Position): vscode.Hover | undefined {
    if (!this.etkin()) return undefined;
    const burada = this.kaynak.sinyaller(doc.uri.fsPath).filter((s) => s.tanilama.range.contains(konum));
    if (!burada.length) return undefined;
    const md = new vscode.MarkdownString();
    md.isTrusted = { enabledCommands: [KANON_MADDESI_KOMUTU] };
    burada.forEach((s, i) => md.appendMarkdown((i ? "\n\n---\n\n" : "") + sinyalHoverMetni(s.tani)));
    return new vscode.Hover(md, burada[0]!.tanilama.range);
  }

  provideFileDecoration(uri: vscode.Uri): vscode.FileDecoration | undefined {
    if (!this.etkin()) return undefined;
    const t = this.kaynak.sorunlar(uri.fsPath);
    const dur = t.filter((x) => x.severity === vscode.DiagnosticSeverity.Error).length;
    const dikkat = t.filter((x) => x.severity === vscode.DiagnosticSeverity.Warning).length;
    if (dur + dikkat === 0) return undefined;
    const n = dur + dikkat;
    const d = new vscode.FileDecoration(n > 9 ? "9+" : String(n), SINYAL_METINLERI.rozetIpucu(dur, dikkat),
      new vscode.ThemeColor(bantTemaRengi(dur > 0 ? "dur" : "dikkat")));
    d.propagate = true;
    return d;
  }

  /** Nöbetin ölçüsü: dosyanın son çizimi. */
  olcum(dosya: string): EditorSinyalOlcumu | undefined { return this.olcumler.get(dosya); }

  dispose(): void {
    for (const t of Object.values(this.turler)) t.dispose();
    this.dosyaDegisti.dispose();
  }
}

/** Hover metni: bant adı, kod, ileti, öneri ve kanon maddesi (madde tanımını açan bağla). */
export function sinyalHoverMetni(t: Tani): string {
  const bant = duzeyBandi(t.duzey);
  const kacir = (s: string): string => s.replace(/([\\`*_{}[\]()#+\-.!|<>])/g, "\\$1");
  const satirlar = [`**${bant ? SINYAL_METINLERI.bantAdi(bant) : t.duzey}** · \`${t.kod}\``, kacir(t.mesaj)];
  if (t.oneri) satirlar.push(`**${SINYAL_METINLERI.oneri}:** ${kacir(t.oneri)}`);
  const maddeler = turKanonMaddeleri(t.kod);
  if (maddeler.length) {
    const bag = (m: string): string => `[${m}](command:${KANON_MADDESI_KOMUTU}?${encodeURIComponent(JSON.stringify([m]))})`;
    satirlar.push(`**${SINYAL_METINLERI.kanonMaddesi}:** ${maddeler.map(bag).join(", ")}`);
  }
  return satirlar.join("\n\n");
}

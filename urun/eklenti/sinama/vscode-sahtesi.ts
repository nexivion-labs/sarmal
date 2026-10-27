// ═══════════════════════════════════════════════════════════════════════════
// vscode-sahtesi.ts — 🧪 EDİTÖR KABUĞUNUN EN KÜÇÜK SAHTESİ (BKM-DNT-A09)
//
//   Eklenti kaynağının yarısı `import * as vscode from "vscode"` satırıyla
//   başlar ve bu yüzden birim süiti o dosyaları modül olarak hiç yükleyemezdi;
//   nöbetler kaynak metnini düzenli ifadeyle okumak zorunda kalıyordu. Bu dosya
//   o yarının davranışını sınamak için gereken kadar kabuğu kurar ve yaptığı her
//   çağrıyı `kabuk` kaydına yazar; nöbet o kayıttan okur.
//
//   SAHTE BİR ŞEYİ DOĞRULAMAZ, YALNIZ KAYDEDER. Görünüş, rozet, komut çağrısı,
//   bildirim ve düzenleme kullanıcı kabuğunda nasıl çizildiğinden bağımsız
//   olarak burada saklanır; çizimin kendisi gerçek editör süitinin işidir
//   (`sinama_vscode/`). Sıfır bağımlılık sözleşmesi (STR-3.1) korunur: dosya
//   yalnız Node'un kendi modüllerini kullanır.
//
//   Bağlanış `kabuk-kur.ts` dosyasındadır: o dosya "vscode" belirtecini bu
//   modüle çözer. Sınama dosyası önce onu içeri alır, eklenti modülünü ise
//   ardından dinamik olarak yükler; durağan bir içe aktarma çözümleme kancası
//   kurulmadan bağlanırdı.
// ═══════════════════════════════════════════════════════════════════════════

import { pathToFileURL } from "node:url";
import { posix } from "node:path";

type Dinleyici<T> = (olay: T) => unknown;

/** Kabuğun yaptığı her şeyin kaydı — nöbet buradan okur. */
export const kabuk = {
  /** `commands.executeCommand` çağrıları sırasıyla. */
  komutCagrilari: [] as { komut: string; argumanlar: unknown[] }[],
  /** `commands.registerCommand` ile kayda giren işleyiciler. */
  komutlar: new Map<string, (...a: unknown[]) => unknown>(),
  /** `executeCommand` için sahte dönüş değerleri (komut → işlev). */
  komutCevaplari: new Map<string, (...a: unknown[]) => unknown>(),
  bilgiler: [] as string[],
  uyarilar: [] as string[],
  hatalar: [] as string[],
  durumMesajlari: [] as string[],
  pano: [] as string[],
  /** `workspace.applyEdit` ile istenen düzenlemeler. */
  duzenlemeler: [] as SahteDuzenleme[],
  /** `window.showTextDocument` çağrılarının hedefi ve seçenekleri. */
  gosterilen: [] as { dosya: string; secenek: unknown }[],
  /** `workspace.openTextDocument` ile açılabilen bellek içi belgeler. */
  belgeler: new Map<string, SahteBelge>(),
  /** Kayda giren webview görünüş sağlayıcıları (kimlik → sağlayıcı). */
  webviewSaglayicilari: new Map<string, unknown>(),
  /** createWebviewPanel ile açılan kartlar (Onaylar kartı gibi). */
  paneller: [] as SahteWebviewGorunusu[],
  /** Kurulmuş ağaç görünüşleri. */
  agaclar: [] as SahteAgacGorunusu[],
  /** `activeTextEditor` — sınama isterse atar. */
  etkinEditor: undefined as SahteEditor | undefined,
};

/** Kaydı sıfırlar; her senaryo temiz bir kabukla başlar. */
export function kabukSifirla(): void {
  kabuk.komutCagrilari.length = 0;
  kabuk.komutlar.clear();
  kabuk.komutCevaplari.clear();
  kabuk.bilgiler.length = 0;
  kabuk.uyarilar.length = 0;
  kabuk.hatalar.length = 0;
  kabuk.durumMesajlari.length = 0;
  kabuk.pano.length = 0;
  kabuk.duzenlemeler.length = 0;
  kabuk.gosterilen.length = 0;
  kabuk.belgeler.clear();
  kabuk.webviewSaglayicilari.clear();
  kabuk.paneller.length = 0;
  kabuk.agaclar.length = 0;
  kabuk.etkinEditor = undefined;
}

const atilabilir = (): { dispose(): void } => ({ dispose() { /* sahte */ } });

// ── Temel değer tipleri ──────────────────────────────────────────────────────

export class Disposable {
  private readonly f: () => void;
  constructor(f: () => void = () => {}) { this.f = f; }
  dispose(): void { this.f(); }
  static from(...d: { dispose(): unknown }[]): Disposable {
    return new Disposable(() => { for (const x of d) x.dispose(); });
  }
}

export class EventEmitter<T> {
  private dinleyiciler: Dinleyici<T>[] = [];
  /** Kaç kez ateşlendiği — "yinelenen çizim yok" nöbetleri bunu okur. */
  atesSayisi = 0;
  readonly event = (d: Dinleyici<T>): { dispose(): void } => {
    this.dinleyiciler.push(d);
    return { dispose: () => { this.dinleyiciler = this.dinleyiciler.filter((x) => x !== d); } };
  };
  fire(olay: T): void {
    this.atesSayisi += 1;
    for (const d of [...this.dinleyiciler]) d(olay);
  }
  dispose(): void { this.dinleyiciler = []; }
}

export class Uri {
  readonly scheme: string;
  readonly fsPath: string;
  private constructor(scheme: string, fsPath: string) { this.scheme = scheme; this.fsPath = fsPath; }
  get path(): string { return this.fsPath; }
  static file(yol: string): Uri { return new Uri("file", yol); }
  static parse(metin: string): Uri {
    return metin.startsWith("file://") ? new Uri("file", new URL(metin).pathname) : new Uri("sahte", metin);
  }
  static joinPath(kok: Uri, ...parca: string[]): Uri { return new Uri(kok.scheme, posix.join(kok.fsPath, ...parca)); }
  with(_: unknown): Uri { return this; }
  toString(): string { return this.scheme === "file" ? pathToFileURL(this.fsPath).href : this.fsPath; }
}

export class Position {
  readonly line: number;
  readonly character: number;
  constructor(line: number, character: number) { this.line = line; this.character = character; }
}

export class Range {
  readonly start: Position;
  readonly end: Position;
  constructor(a: number | Position, b: number | Position, c?: number, d?: number) {
    if (typeof a === "number") { this.start = new Position(a, b as number); this.end = new Position(c!, d!); }
    else { this.start = a; this.end = b as Position; }
  }
}

export class Selection extends Range {
  readonly anchor: Position;
  readonly active: Position;
  constructor(anchor: Position, active: Position) {
    super(anchor, active);
    this.anchor = anchor; this.active = active;
  }
}

export class ThemeColor {
  readonly id: string;
  constructor(id: string) { this.id = id; }
}
export class ThemeIcon {
  readonly id: string;
  readonly color?: ThemeColor;
  constructor(id: string, color?: ThemeColor) { this.id = id; this.color = color; }
  static readonly File = new ThemeIcon("file");
  static readonly Folder = new ThemeIcon("folder");
}
export class MarkdownString {
  isTrusted = false;
  supportHtml = false;
  value: string;
  constructor(value = "") { this.value = value; }
  appendMarkdown(m: string): this { this.value += m; return this; }
  appendText(m: string): this { this.value += m; return this; }
  appendCodeblock(m: string): this { this.value += m; return this; }
}
export class Hover {
  readonly contents: MarkdownString[];
  readonly range?: Range;
  constructor(icerik: MarkdownString | MarkdownString[], aralik?: Range) {
    this.contents = Array.isArray(icerik) ? icerik : [icerik];
    this.range = aralik;
  }
}

// Tamamlama ve imza yardımı (MGZ-A09): İngilizce yüz nöbeti sağlayıcıları doğrudan
// çağırır; sınıflar yalnız sağlayıcının yazdığı alanları taşır.
export const CompletionItemKind = {
  Text: 0, Method: 1, Function: 2, Field: 4, Variable: 5, Class: 6, Property: 9, Value: 11,
  Keyword: 13, Reference: 17, EnumMember: 19,
} as const;
export class SnippetString {
  readonly value: string;
  constructor(value = "") { this.value = value; }
}
export class CompletionItem {
  label: string;
  kind?: number;
  detail?: string;
  documentation?: string | MarkdownString;
  insertText?: string | SnippetString;
  sortText?: string;
  filterText?: string;
  preselect?: boolean;
  constructor(label: string, kind?: number) { this.label = label; this.kind = kind; }
}
export class ParameterInformation {
  readonly label: string;
  readonly documentation?: string | MarkdownString;
  constructor(label: string, documentation?: string | MarkdownString) { this.label = label; this.documentation = documentation; }
}
export class SignatureInformation {
  readonly label: string;
  readonly documentation?: string | MarkdownString;
  parameters: ParameterInformation[] = [];
  constructor(label: string, documentation?: string | MarkdownString) { this.label = label; this.documentation = documentation; }
}
export class SignatureHelp {
  signatures: SignatureInformation[] = [];
  activeSignature = 0;
  activeParameter = 0;
}

// Sayım tipleri düz nesnedir: Node tip söküm kipi `enum` sözdizimini kabul etmez.
export const TreeItemCollapsibleState = { None: 0, Collapsed: 1, Expanded: 2 } as const;
export const TreeItemCheckboxState = { Unchecked: 0, Checked: 1 } as const;
export const TextEditorRevealType = { Default: 0, InCenter: 1, InCenterIfOutsideViewport: 2, AtTop: 3 } as const;
export const ViewColumn = { Active: -1, Beside: -2, One: 1, Two: 2 } as const;
export const ExtensionMode = { Production: 1, Development: 2, Test: 3 } as const;
export const EndOfLine = { LF: 1, CRLF: 2 } as const;
export const StatusBarAlignment = { Left: 1, Right: 2 } as const;
export const DiagnosticSeverity = { Error: 0, Warning: 1, Information: 2, Hint: 3 } as const;
export const ConfigurationTarget = { Global: 1, Workspace: 2, WorkspaceFolder: 3 } as const;

export class TreeItem {
  description?: string;
  tooltip?: unknown;
  iconPath?: unknown;
  contextValue?: string;
  command?: unknown;
  resourceUri?: Uri;
  id?: string;
  label: string;
  collapsibleState: number;
  constructor(label: string, collapsibleState: number = TreeItemCollapsibleState.None) {
    this.label = label; this.collapsibleState = collapsibleState;
  }
}

export class CodeLens {
  readonly range: Range;
  readonly command?: unknown;
  constructor(range: Range, command?: unknown) { this.range = range; this.command = command; }
}
export class FileDecoration {
  readonly badge?: string;
  readonly tooltip?: string;
  constructor(badge?: string, tooltip?: string) { this.badge = badge; this.tooltip = tooltip; }
}
export class TextEdit {
  readonly range: Range;
  readonly newText: string;
  constructor(range: Range, newText: string) { this.range = range; this.newText = newText; }
  static replace(r: Range, m: string): TextEdit { return new TextEdit(r, m); }
}

/** Kaydedilen düzenleme — hangi dosyaya hangi metin, hangi konuma. */
export interface SahteDuzenleme { dosya: string; tur: "ekle" | "değiştir"; konum: Range | Position; metin: string }

export class WorkspaceEdit {
  readonly parcalar: SahteDuzenleme[] = [];
  insert(uri: Uri, konum: Position, metin: string): void {
    this.parcalar.push({ dosya: uri.fsPath, tur: "ekle", konum, metin });
  }
  replace(uri: Uri, konum: Range, metin: string): void {
    this.parcalar.push({ dosya: uri.fsPath, tur: "değiştir", konum, metin });
  }
  get size(): number { return this.parcalar.length; }
}

// ── Belge ve editör ─────────────────────────────────────────────────────────

export class SahteBelge {
  readonly uri: Uri;
  readonly languageId = "sarmal";
  readonly isUntitled = false;
  readonly isClosed = false;
  readonly eol = EndOfLine.LF;
  isDirty = false;
  version = 1;
  metin: string;
  constructor(fsPath: string, metin: string) { this.uri = Uri.file(fsPath); this.metin = metin; }
  get fileName(): string { return this.uri.fsPath; }
  get lineCount(): number { return this.metin.split("\n").length; }
  /** Aralık verilirse yalnız onun metni döner (VS Code `getText(range)` anlamı). */
  getText(aralik?: Range): string {
    if (!aralik) return this.metin;
    const satirlar = this.metin.split("\n");
    if (aralik.start.line === aralik.end.line)
      return (satirlar[aralik.start.line] ?? "").slice(aralik.start.character, aralik.end.character);
    return [
      (satirlar[aralik.start.line] ?? "").slice(aralik.start.character),
      ...satirlar.slice(aralik.start.line + 1, aralik.end.line),
      (satirlar[aralik.end.line] ?? "").slice(0, aralik.end.character),
    ].join("\n");
  }
  lineAt(n: number | Position): { text: string; lineNumber: number } {
    const satir = typeof n === "number" ? n : n.line;
    return { text: this.metin.split("\n")[satir] ?? "", lineNumber: satir };
  }
  /**
   * VS Code `TextDocument.getWordRangeAtPosition` anlamının kopyası (HST-YUZ-A05).
   * İpucu ve gezinme sözceyi bu çağrıyla seçtiği için sahte, editörün sözcük
   * yardımcısının (wordHelper.getWordAtText) davranışını taşır: boş dizgiyle
   * eşleşen desen reddedilir, desen küresel bayrakla yeniden kurulur ve imleci
   * kuşatan eşleşme imlecin önündeki on beşer karakterlik pencerelerle geriye
   * doğru aranır. Eşleşmenin bittiği sütun da imleci kuşatmış sayılır.
   * Varsayılan dil sözcük deseni sahtede yoktur; desensiz çağrı açıkça düşer.
   */
  getWordRangeAtPosition(konum: Position, desen?: RegExp): Range | undefined {
    if (!desen) throw new Error("sahte kabuk dilin varsayılan sözcük desenini bilmez");
    if (bosDizgiyleEslesir(desen)) throw new Error(`[getWordRangeAtPosition]: boş eşleşen desen: ${desen.source}`);
    const kuresel = desen.global ? desen
      : new RegExp(desen.source, `g${desen.ignoreCase ? "i" : ""}${desen.multiline ? "m" : ""}${desen.unicode ? "u" : ""}`);
    kuresel.lastIndex = 0;
    const sozcuk = sozcukBul(konum.character + 1, kuresel, this.lineAt(konum.line).text, 0);
    return sozcuk ? new Range(konum.line, sozcuk.bas - 1, konum.line, sozcuk.son - 1) : undefined;
  }
  async save(): Promise<boolean> { this.isDirty = false; return true; }
}

/** VS Code `regExpLeadsToEndlessLoop` kopyası. */
function bosDizgiyleEslesir(desen: RegExp): boolean {
  if (["^", "^$", "$", "^\\s*$"].includes(desen.source)) return false;
  const es = desen.exec("");
  return !!(es && desen.lastIndex === 0);
}

/** VS Code `getWordAtText` kopyası (en çok 1000 karakter, 15 karakterlik pencere; süre bütçesi yok). */
function sozcukBul(sutun: number, desen: RegExp, metin: string, ofset: number): { bas: number; son: number } | undefined {
  if (metin.length > 1000) {
    let bas = sutun - 500;
    if (bas < 0) bas = 0;
    else ofset += bas;
    return sozcukBul(sutun, desen, metin.substring(bas, sutun + 500), ofset);
  }
  const konum = sutun - 1 - ofset;
  let oncekiBaslangic = -1;
  let es: RegExpExecArray | null = null;
  for (let i = 1; ; i++) {
    const baslangic = konum - 15 * i;
    desen.lastIndex = Math.max(0, baslangic);
    const bu = kusatanEslesme(desen, metin, konum, oncekiBaslangic);
    if (!bu && es) break;
    es = bu;
    if (baslangic <= 0) break;
    oncekiBaslangic = baslangic;
  }
  if (!es) return undefined;
  desen.lastIndex = 0;
  return { bas: ofset + 1 + es.index, son: ofset + 1 + es.index + es[0].length };
}

/** VS Code `_findRegexMatchEnclosingPosition` kopyası. */
function kusatanEslesme(desen: RegExp, metin: string, konum: number, dur: number): RegExpExecArray | null {
  let es: RegExpExecArray | null;
  while ((es = desen.exec(metin))) {
    const i = es.index || 0;
    if (i <= konum && desen.lastIndex >= konum) return es;
    if (dur > 0 && i > dur) return null;
  }
  return null;
}

/** Bir belgeyi bellek içi kabuğa koyar; `openTextDocument` onu bulur. */
export function belgeKoy(fsPath: string, metin: string): SahteBelge {
  const b = new SahteBelge(fsPath, metin);
  kabuk.belgeler.set(fsPath, b);
  return b;
}

export class SahteEditor {
  selection = new Selection(new Position(0, 0), new Position(0, 0));
  readonly gosterilenAraliklar: Range[] = [];
  readonly document: SahteBelge;
  constructor(document: SahteBelge) { this.document = document; }
  revealRange(r: Range): void { this.gosterilenAraliklar.push(r); }
  setDecorations(): void { /* sahte */ }
}

// ── Görünüşler ──────────────────────────────────────────────────────────────

export interface SahteRozet { value: number; tooltip: string }

export class SahteAgacGorunusu {
  badge?: SahteRozet;
  message?: string;
  description?: string;
  title?: string;
  visible = true;
  readonly kimlik: string;
  readonly secenek: unknown;
  constructor(kimlik: string, secenek: unknown) { this.kimlik = kimlik; this.secenek = secenek; }
  reveal(): Promise<void> { return Promise.resolve(); }
  dispose(): void { /* sahte */ }
  onDidChangeVisibility = new EventEmitter<unknown>().event;
  onDidChangeSelection = new EventEmitter<unknown>().event;
  onDidChangeCheckboxState = new EventEmitter<unknown>().event;
}

/** Webview görünüşünün sahtesi — gönderilen mesajları ve rozeti saklar. */
export class SahteWebviewGorunusu {
  badge?: SahteRozet;
  description?: string;
  visible = true;
  gosterimler = 0;
  private readonly gelen = new EventEmitter<unknown>();
  private readonly gorunurluk = new EventEmitter<void>();
  readonly gonderilen: unknown[] = [];
  readonly webview = {
    options: {} as unknown,
    html: "",
    cspSource: "sahte-csp",
    asWebviewUri: (u: Uri): Uri => u,
    postMessage: async (m: unknown): Promise<boolean> => { this.gonderilen.push(m); return true; },
    onDidReceiveMessage: this.gelen.event,
  };
  readonly onDidChangeVisibility = this.gorunurluk.event;
  /** WebviewPanel yüzü (Onaylar kartı): başlık, durum olayı ve atılma olayı. */
  title = "";
  /** `createWebviewPanel` ile açıldıysa açılış sütunu ve odak seçeneği (PNL-A02 · OZK-13 nöbeti okur). */
  acilis?: unknown;
  /** `reveal(sütun, odağıKoru)` çağrılarının argümanları sırasıyla. */
  readonly onaGetirmeler: unknown[][] = [];
  readonly onDidChangeViewState = this.gorunurluk.event;
  private readonly atildi = new EventEmitter<void>();
  readonly onDidDispose = this.atildi.event;
  reveal(...a: unknown[]): void { this.gosterimler += 1; this.onaGetirmeler.push(a); }
  dispose(): void { this.atildi.fire(); }
  show(): void { this.gosterimler += 1; }
  /** Panelin içinden kabuğa bir mesaj gönderir (kullanıcının tıklaması). */
  mesajGonder(m: unknown): void { this.gelen.fire(m); }
}

// ── Ad alanları ─────────────────────────────────────────────────────────────

const kanal = () => ({ appendLine() {}, append() {}, show() {}, clear() {}, dispose() {} });

export const window = {
  get activeTextEditor(): SahteEditor | undefined { return kabuk.etkinEditor; },
  visibleTextEditors: [] as SahteEditor[],
  showInformationMessage: async (m: string, ..._: unknown[]) => { kabuk.bilgiler.push(m); return undefined; },
  showWarningMessage: async (m: string, ..._: unknown[]) => { kabuk.uyarilar.push(m); return undefined; },
  showErrorMessage: async (m: string, ..._: unknown[]) => { kabuk.hatalar.push(m); return undefined; },
  setStatusBarMessage: (m: string) => { kabuk.durumMesajlari.push(m); return atilabilir(); },
  showQuickPick: async () => undefined,
  showInputBox: async () => undefined,
  showTextDocument: async (belge: SahteBelge, secenek?: unknown) => {
    kabuk.gosterilen.push({ dosya: belge.uri.fsPath, secenek });
    kabuk.etkinEditor = new SahteEditor(belge);
    return kabuk.etkinEditor;
  },
  createTreeView: (kimlik: string, secenek: unknown) => {
    const g = new SahteAgacGorunusu(kimlik, secenek);
    kabuk.agaclar.push(g);
    return g;
  },
  registerWebviewViewProvider: (kimlik: string, saglayici: unknown) => {
    kabuk.webviewSaglayicilari.set(kimlik, saglayici);
    return atilabilir();
  },
  registerFileDecorationProvider: () => atilabilir(),
  createTextEditorDecorationType: () => ({ key: "sahte", dispose() {} }),
  createOutputChannel: kanal,
  createStatusBarItem: () => ({ text: "", tooltip: "", command: undefined, show() {}, hide() {}, dispose() {} }),
  createWebviewPanel: (_tur: string, baslik: string, acilis?: unknown) => {
    const p = new SahteWebviewGorunusu();
    p.title = baslik;
    p.acilis = acilis;
    kabuk.paneller.push(p);
    return p;
  },
  onDidChangeActiveTextEditor: new EventEmitter<unknown>().event,
  onDidChangeTextEditorSelection: new EventEmitter<unknown>().event,
  onDidChangeVisibleTextEditors: new EventEmitter<unknown>().event,
};

export const commands = {
  registerCommand: (komut: string, f: (...a: unknown[]) => unknown) => {
    kabuk.komutlar.set(komut, f);
    return atilabilir();
  },
  /** Kayıtlı komutların kimlikleri: kardeş eklentinin varlığı komutundan ölçülür (panel.ts). */
  getCommands: async (_ic?: boolean): Promise<string[]> => [...kabuk.komutlar.keys()],
  executeCommand: async (komut: string, ...argumanlar: unknown[]) => {
    kabuk.komutCagrilari.push({ komut, argumanlar });
    const cevap = kabuk.komutCevaplari.get(komut) ?? kabuk.komutlar.get(komut);
    return cevap ? await cevap(...argumanlar) : undefined;
  },
};

export const workspace = {
  workspaceFolders: undefined as unknown,
  textDocuments: [] as SahteBelge[],
  openTextDocument: async (hedef: Uri | string) => {
    const yol = typeof hedef === "string" ? hedef : hedef.fsPath;
    const b = kabuk.belgeler.get(yol);
    if (!b) throw new Error(`sahte kabukta belge yok: ${yol}`);
    return b;
  },
  applyEdit: async (d: WorkspaceEdit) => { kabuk.duzenlemeler.push(...d.parcalar); return true; },
  getConfiguration: () => ({ get: <T>(_: string, v?: T) => v, has: () => false, inspect: () => undefined, update: async () => {} }),
  findFiles: async () => [] as Uri[],
  asRelativePath: (u: Uri | string) => (typeof u === "string" ? u : u.fsPath),
  createFileSystemWatcher: () => ({
    onDidCreate: new EventEmitter<Uri>().event,
    onDidChange: new EventEmitter<Uri>().event,
    onDidDelete: new EventEmitter<Uri>().event,
    dispose() {},
  }),
  onDidSaveTextDocument: new EventEmitter<unknown>().event,
  onDidChangeTextDocument: new EventEmitter<unknown>().event,
  onDidOpenTextDocument: new EventEmitter<unknown>().event,
  onDidCloseTextDocument: new EventEmitter<unknown>().event,
  onDidChangeConfiguration: new EventEmitter<unknown>().event,
  onDidChangeWorkspaceFolders: new EventEmitter<unknown>().event,
  fs: {
    readFile: async () => new Uint8Array(),
    stat: async () => ({ type: 1, size: 0, ctime: 0, mtime: 0 }),
  },
};

export const env = {
  language: "tr",
  clipboard: { writeText: async (m: string) => { kabuk.pano.push(m); } },
};

export const languages = {
  registerCodeLensProvider: () => atilabilir(),
  registerHoverProvider: () => atilabilir(),
  registerDefinitionProvider: () => atilabilir(),
  registerDocumentFormattingEditProvider: () => atilabilir(),
  createDiagnosticCollection: () => ({ set() {}, delete() {}, clear() {}, dispose() {} }),
};

export const comments = {
  createCommentController: () => ({ commentingRangeProvider: undefined as unknown, createCommentThread() { throw new Error("sahte"); }, dispose() {} }),
};

export const extensions = { getExtension: () => undefined, all: [] as unknown[], onDidChange: new EventEmitter<void>().event };

// ═══════════════════════════════════════════════════════════════════════════
// etkinlesme-kabugu.ts — 🧪 EKLENTİNİN GERÇEK GİRİŞİNİ KOŞTURAN SAHTE EDİTÖR
//                         (MGZ-A03 · MGZ-A02)
//
//   Neden var: birim süiti eklenti girişini (`src/eklenti.ts`) bugüne dek hiç
//   koşturmadı; editöre bakan davranış ya saf çekirdeğe çıkarılarak ya da kaynak
//   metni düzenli ifadeyle okunarak ölçülüyordu. Bazı kabul ölçütleri ise ancak
//   giriş bütün hâlinde koşunca ölçülebilir: kırık bir dosyanın Sorunlar
//   panelinde satır ve sütunuyla görünmesi tanı turunun, yüzey ayrımının ve odak
//   süzgecinin birlikte çalışmasına bağlıdır; kısıtlı modda eklentinin ne
//   söylediği ve hangi yeteneği kapalı tuttuğu ise etkinleşmenin kendisidir.
//
//   Nasıl çalışır: giriş, üretim paketleyicisinin (esbuild.mjs) seçenekleriyle
//   geçici bir dosyaya paketlenir; tek fark `vscode` belirtecinin bu modülün
//   kurduğu sahte nesneye bağlanmasıdır. Her etkinleşme paketi taze yükler,
//   dolayısıyla modül düzeyindeki durum iki sınama arasında taşınmaz.
//
//   SAHTE BİR ŞEYİ DOĞRULAMAZ, YALNIZ KAYDEDER (vscode-sahtesi.ts emsali). Tanı
//   koleksiyonu, durum çubuğu öğeleri, iletiler, çıktı kanalları ve komut
//   kayıtları burada saklanır; ölçüm sınamanın işidir. Turun dokunduğu yüzey
//   gerçek davranışla kurulur: çalışma alanı klasörleri, dosya araması ve dosya
//   okuma diskteki gerçek fikstüre gider. Etkinleşmenin yalnız kayıt anında
//   dokunduğu geniş API yüzeyi (sağlayıcı kayıtları, dekor tipleri, yardımcı
//   sınıflar) zararsız bir yedeğe düşer: yedek her çağrıyı kabul eder ve kendisini
//   döndürür. Yedeğe düşen bir üyenin davranışı ölçülmez; ölçülen her davranış
//   aşağıda açıkça kurulmuştur.
//
//   Sıfır bağımlılık sözleşmesi (STR-3.1) korunur: yalnız Node modülleri ve
//   deponun zaten kullandığı esbuild kullanılır. Bu modül `vscode-sahtesi.ts`
//   dosyasını içe aktarmaz; o dosya modül sınamalarının kabuğudur ve burada
//   kurulan nesne eklentinin bütününü taşıyacak kadar geniştir.
// ═══════════════════════════════════════════════════════════════════════════

import esbuild from "esbuild";
import { createRequire } from "node:module";
import { existsSync, mkdtempSync, readdirSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const EKLENTI_KOKU = fileURLToPath(new URL("..", import.meta.url));
const gerek = createRequire(import.meta.url);
const KOPRU_ANAHTARI = "__SARMAL_ETKIN_KABUK_VSCODE__";

// ── Paket ───────────────────────────────────────────────────────────────────

let paketYolu: string | undefined;

/** Eklenti girişini bir kez paketler; yolu döndürür. */
function paketle(): string {
  if (paketYolu) return paketYolu;
  const dizin = mkdtempSync(join(tmpdir(), "sarmal-etkin-kabuk-"));
  const kopru = join(dizin, "vscode-kopru.cjs");
  writeFileSync(kopru, `module.exports = globalThis.${KOPRU_ANAHTARI};\n`);
  const cikti = join(dizin, "eklenti.cjs");
  esbuild.buildSync({
    entryPoints: [join(EKLENTI_KOKU, "src", "eklenti.ts")],
    bundle: true, format: "cjs", platform: "node", target: "node18",
    outfile: cikti, alias: { vscode: kopru }, logLevel: "silent",
  });
  paketYolu = realpathSync(cikti);
  return paketYolu;
}

// ── Yedek: kayıt anında dokunulan geniş yüzey ───────────────────────────────

/** Her erişimi, çağrıyı ve kurulumu kabul edip kendini döndüren zararsız nesne. */
const YEDEK: unknown = new Proxy(function yedek() { /* zararsız */ }, {
  get(_hedef, anahtar) {
    if (anahtar === "then") return undefined;   // beklenen bir söz sanılmasın
    if (anahtar === Symbol.toPrimitive) return () => "";
    if (typeof anahtar === "symbol") return undefined;
    return YEDEK;
  },
  apply() { return YEDEK; },
  construct() { return YEDEK as object; },
});

/**
 * Bilinen üyeleri taşıyan, bilinmeyen üyede yedeğe düşen ad alanı. Üyeler
 * tanımlayıcılarıyla kopyalanır: alıcılar (örneğin etkin editör) her okumada
 * yeniden çalışır ve atama prototipteki yedeğe uğramaz.
 */
function adAlani<T extends object>(uyeler: T): T {
  return Object.defineProperties(Object.create(YEDEK as object) as object, Object.getOwnPropertyDescriptors(uyeler)) as T;
}

// ── Değer tipleri ───────────────────────────────────────────────────────────

type Dinleyici<T> = (olay: T) => unknown;

class EventEmitter<T> {
  private dinleyiciler: Dinleyici<T>[] = [];
  readonly event = (d: Dinleyici<T>): { dispose(): void } => {
    this.dinleyiciler.push(d);
    return { dispose: () => { this.dinleyiciler = this.dinleyiciler.filter((x) => x !== d); } };
  };
  fire(olay: T): void { for (const d of [...this.dinleyiciler]) d(olay); }
  dispose(): void { this.dinleyiciler = []; }
}

class Disposable {
  private readonly f: () => unknown;
  constructor(f: () => unknown = () => undefined) { this.f = f; }
  dispose(): void { this.f(); }
  static from(...d: { dispose(): unknown }[]): Disposable { return new Disposable(() => { for (const x of d) x.dispose(); }); }
}

class Uri {
  readonly scheme: string;
  readonly fsPath: string;
  readonly query: string;
  private constructor(scheme: string, fsPath: string, query = "") { this.scheme = scheme; this.fsPath = fsPath; this.query = query; }
  get path(): string { return this.fsPath.split(sep).join("/"); }
  static file(yol: string): Uri { return new Uri("file", yol); }
  static parse(metin: string): Uri {
    return metin.startsWith("file://") ? new Uri("file", fileURLToPath(metin)) : new Uri(metin.split(":")[0] ?? "", metin);
  }
  static joinPath(kok: Uri, ...parca: string[]): Uri { return new Uri(kok.scheme, join(kok.fsPath, ...parca)); }
  static from(p: { scheme: string; path?: string; query?: string }): Uri { return new Uri(p.scheme, p.path ?? "", p.query ?? ""); }
  with(degisim: { scheme?: string; path?: string; query?: string }): Uri {
    return new Uri(degisim.scheme ?? this.scheme, degisim.path ?? this.fsPath, degisim.query ?? this.query);
  }
  toString(): string { return this.scheme === "file" ? pathToFileURL(this.fsPath).href : `${this.scheme}:${this.fsPath}`; }
  toJSON(): unknown { return { scheme: this.scheme, fsPath: this.fsPath }; }
}

class Position {
  readonly line: number;
  readonly character: number;
  constructor(line: number, character: number) { this.line = line; this.character = character; }
  isBefore(o: Position): boolean { return this.line < o.line || (this.line === o.line && this.character < o.character); }
  isAfter(o: Position): boolean { return o.isBefore(this); }
  isEqual(o: Position): boolean { return this.line === o.line && this.character === o.character; }
  translate(satir = 0, sutun = 0): Position { return new Position(this.line + satir, this.character + sutun); }
  with(satir?: number, sutun?: number): Position { return new Position(satir ?? this.line, sutun ?? this.character); }
}

class Range {
  readonly start: Position;
  readonly end: Position;
  constructor(a: number | Position, b: number | Position, c?: number, d?: number) {
    if (typeof a === "number") { this.start = new Position(a, b as number); this.end = new Position(c ?? a, d ?? (b as number)); }
    else { this.start = a; this.end = b as Position; }
  }
  get isEmpty(): boolean { return this.start.isEqual(this.end); }
  get isSingleLine(): boolean { return this.start.line === this.end.line; }
  contains(p: Position | Range): boolean {
    const r = p instanceof Range ? p : new Range(p, p);
    return !r.start.isBefore(this.start) && !this.end.isBefore(r.end);
  }
  with(bas?: Position, son?: Position): Range { return new Range(bas ?? this.start, son ?? this.end); }
}

class Selection extends Range {
  readonly anchor: Position;
  readonly active: Position;
  constructor(anchor: Position, active: Position) { super(anchor, active); this.anchor = anchor; this.active = active; }
}

const DiagnosticSeverity = { Error: 0, Warning: 1, Information: 2, Hint: 3 } as const;

class Diagnostic {
  range: Range;
  message: string;
  severity: number;
  source?: string;
  code?: unknown;
  relatedInformation?: unknown[];
  tags?: number[];
  constructor(range: Range, message: string, severity: number = DiagnosticSeverity.Error) {
    this.range = range; this.message = message; this.severity = severity;
  }
}

class Location {
  readonly uri: Uri;
  readonly range: Range | Position;
  constructor(uri: Uri, range: Range | Position) { this.uri = uri; this.range = range; }
}

class DiagnosticRelatedInformation {
  readonly location: Location;
  readonly message: string;
  constructor(location: Location, message: string) { this.location = location; this.message = message; }
}

class ThemeColor { readonly id: string; constructor(id: string) { this.id = id; } }
class ThemeIcon {
  readonly id: string;
  readonly color?: ThemeColor;
  constructor(id: string, color?: ThemeColor) { this.id = id; this.color = color; }
  static readonly File = new ThemeIcon("file");
  static readonly Folder = new ThemeIcon("folder");
}
class MarkdownString {
  value: string;
  isTrusted?: boolean;
  supportHtml?: boolean;
  supportThemeIcons?: boolean;
  constructor(value = "", supportThemeIcons = false) { this.value = value; this.supportThemeIcons = supportThemeIcons; }
  appendMarkdown(m: string): this { this.value += m; return this; }
  appendText(m: string): this { this.value += m; return this; }
  appendCodeblock(m: string): this { this.value += m; return this; }
}
class TreeItem {
  label: unknown;
  collapsibleState: number;
  description?: unknown;
  tooltip?: unknown;
  iconPath?: unknown;
  contextValue?: string;
  command?: unknown;
  resourceUri?: Uri;
  id?: string;
  constructor(label: unknown, collapsibleState = 0) { this.label = label; this.collapsibleState = collapsibleState; }
}
class RelativePattern {
  readonly base: string;
  readonly pattern: string;
  constructor(base: string | Uri | { uri: Uri }, pattern: string) {
    this.base = typeof base === "string" ? base : base instanceof Uri ? base.fsPath : base.uri.fsPath;
    this.pattern = pattern;
  }
}

// ── Belge ve editör ─────────────────────────────────────────────────────────

/** Diskteki bir dosyanın belge yüzü — dil kimliği uzantıdan okunur. */
class SahteBelge {
  readonly uri: Uri;
  readonly languageId: string;
  readonly isUntitled = false;
  readonly isClosed = false;
  readonly isDirty = false;
  readonly eol = 1;
  readonly version = 1;
  private readonly metin: string;
  constructor(fsPath: string, metin: string) {
    this.uri = Uri.file(fsPath);
    this.metin = metin;
    this.languageId = fsPath.endsWith(".sar") ? "sarmal" : "plaintext";
  }
  get fileName(): string { return this.uri.fsPath; }
  private get satirlar(): string[] { return this.metin.split("\n"); }
  get lineCount(): number { return this.satirlar.length; }
  getText(aralik?: Range): string {
    if (!aralik) return this.metin;
    const bas = this.offsetAt(aralik.start);
    return this.metin.slice(bas, this.offsetAt(aralik.end));
  }
  lineAt(n: number | Position): { text: string; lineNumber: number; range: Range; isEmptyOrWhitespace: boolean; firstNonWhitespaceCharacterIndex: number } {
    const satir = typeof n === "number" ? n : n.line;
    const text = this.satirlar[satir] ?? "";
    return {
      text, lineNumber: satir, range: new Range(satir, 0, satir, text.length),
      isEmptyOrWhitespace: text.trim() === "", firstNonWhitespaceCharacterIndex: text.length - text.trimStart().length,
    };
  }
  offsetAt(p: Position): number {
    const s = this.satirlar;
    let ofset = 0;
    for (let i = 0; i < p.line && i < s.length; i++) ofset += (s[i]?.length ?? 0) + 1;
    return ofset + p.character;
  }
  positionAt(ofset: number): Position {
    let kalan = ofset;
    const s = this.satirlar;
    for (let i = 0; i < s.length; i++) {
      const uzunluk = (s[i]?.length ?? 0) + 1;
      if (kalan < uzunluk) return new Position(i, kalan);
      kalan -= uzunluk;
    }
    return new Position(Math.max(s.length - 1, 0), s.at(-1)?.length ?? 0);
  }
  getWordRangeAtPosition(): Range | undefined { return undefined; }
  validateRange(r: Range): Range { return r; }
  async save(): Promise<boolean> { return true; }
}

class SahteEditor {
  readonly document: SahteBelge;
  selection = new Selection(new Position(0, 0), new Position(0, 0));
  get selections(): Selection[] { return [this.selection]; }
  get visibleRanges(): Range[] { return [new Range(0, 0, Math.max(this.document.lineCount - 1, 0), 0)]; }
  readonly options = { tabSize: 2, insertSpaces: true };
  readonly viewColumn = 1;
  constructor(document: SahteBelge) { this.document = document; }
  setDecorations(): void { /* çizim ölçülmez */ }
  revealRange(): void { /* görünüm ölçülmez */ }
  async edit(): Promise<boolean> { return true; }
}

// ── Kayıt ve kurulum ────────────────────────────────────────────────────────

/** Durum çubuğu öğesinin kaydı — görünürlüğü ve son metni ölçülür. */
export interface DurumOgesi {
  text: string;
  tooltip: unknown;
  command: unknown;
  backgroundColor: unknown;
  hizalama: number | undefined;
  gorunur: boolean;
  atildi: boolean;
}

/** Kabuğun yaptığı her şeyin kaydı. */
export interface KabukKaydi {
  /** Tanı koleksiyonu: dosya yolu → o an Sorunlar panelindeki tanılar. */
  readonly tanilar: Map<string, Diagnostic[]>;
  readonly durumOgeleri: DurumOgesi[];
  readonly bilgiler: string[];
  readonly uyarilar: string[];
  readonly hatalar: string[];
  readonly durumMesajlari: string[];
  /** Çıktı kanalları: ad → yazılan satırlar. */
  readonly kanallar: Map<string, string[]>;
  readonly komutlar: Map<string, (...a: unknown[]) => unknown>;
  readonly komutCagrilari: { komut: string; argumanlar: unknown[] }[];
  /** `workspace.findFiles` çağrı sayısı — güven isteyen disk taraması ölçülür. */
  dosyaAramasi: number;
}

export interface EtkinlesmeSecenegi {
  /** Çalışma alanı klasörleri (mutlak yol). */
  readonly klasorler: readonly string[];
  /** Etkin editörde açık sayılan dosya — odak ondan türer. */
  readonly etkinDosya?: string;
  /** Çalışma alanı güvenilir mi (VS Code Workspace Trust). Verilmezse güvenilir. */
  readonly guvenilir?: boolean;
  /** `sarmal.*` ayarları; verilmeyen anahtar bildirimin varsayılanına düşer. */
  readonly ayarlar?: Readonly<Record<string, unknown>>;
  /** Editör dili (`vscode.env.language`). Verilmezse "tr". */
  readonly dil?: string;
}

/** Etkinleşmiş eklenti ve onu çevreleyen kabuk. */
export interface EtkinEklenti {
  readonly kayit: KabukKaydi;
  /** `activate` dönüşü (eklentinin dış yüzü). */
  readonly yuz: Record<string, (...a: unknown[]) => unknown> | undefined;
  /** Güven verilir: `onDidGrantWorkspaceTrust` ateşlenir. */
  guvenVer(): void;
  /** İlk denetim turunun yayınını bekler; tur görüntüsü yayınlanınca döner. */
  turBekle(zamanAsimiMs?: number): Promise<void>;
  /** Etkinleşmeyi kapatır: abonelikler bırakılır, `deactivate` çağrılır. */
  kapat(): void;
}

/** Klasörün altındaki dosyaları yürür; gizli dizinler ve paket klasörleri atlanır. */
function dosyalariYuru(kok: string, uygun: (yol: string) => boolean, cikti: string[]): void {
  let girdiler: import("node:fs").Dirent[];
  try { girdiler = readdirSync(kok, { withFileTypes: true }); } catch { return; }
  for (const g of girdiler) {
    const yol = join(kok, g.name);
    if (g.isDirectory()) {
      if (g.name.startsWith(".") || g.name === "node_modules") continue;
      dosyalariYuru(yol, uygun, cikti);
    } else if (g.isFile() && uygun(yol)) cikti.push(yol);
  }
}

/** `**​/*.sar`, `**​/*.{md,ts}` ve `**​/*` biçimli aramaların uzantı süzgeci. */
function aramaSuzgeci(desen: string): (yol: string) => boolean {
  const ek = /\*\.\{([^}]+)\}$/u.exec(desen)?.[1]?.split(",") ?? (/\*\.([\w-]+)$/u.exec(desen)?.[1] ? [/\*\.([\w-]+)$/u.exec(desen)![1]!] : undefined);
  if (!ek) return () => true;
  return (yol) => ek.some((e) => yol.endsWith(`.${e}`));
}

/** Eklentinin paket bildirimindeki `sarmal.*` ayar varsayılanları. */
function ayarVarsayilanlari(): Record<string, unknown> {
  const paket = JSON.parse(readFileSync(join(EKLENTI_KOKU, "package.json"), "utf8")) as {
    contributes?: { configuration?: { properties?: Record<string, { default?: unknown }> } | Array<{ properties?: Record<string, { default?: unknown }> }> };
  };
  const yapi = paket.contributes?.configuration;
  const parcalar = Array.isArray(yapi) ? yapi : yapi ? [yapi] : [];
  const sonuc: Record<string, unknown> = {};
  for (const p of parcalar) for (const [ad, tanim] of Object.entries(p.properties ?? {})) sonuc[ad] = tanim.default;
  return sonuc;
}

/** Sahte `vscode` ad alanını ve kaydını kurar. */
function kabukKur(secenek: EtkinlesmeSecenegi): { vscode: object; kayit: KabukKaydi; guven: EventEmitter<void>; durum: { guvenilir: boolean } } {
  const kayit: KabukKaydi = {
    tanilar: new Map(), durumOgeleri: [], bilgiler: [], uyarilar: [], hatalar: [], durumMesajlari: [],
    kanallar: new Map(), komutlar: new Map(), komutCagrilari: [], dosyaAramasi: 0,
  };
  const durum = { guvenilir: secenek.guvenilir ?? true };
  const guven = new EventEmitter<void>();
  const ayarlar = { ...ayarVarsayilanlari(), ...Object.fromEntries(Object.entries(secenek.ayarlar ?? {}).map(([k, v]) => [`sarmal.${k}`, v])) };
  const klasorler = secenek.klasorler.map((k, index) => ({ uri: Uri.file(k), name: k.split(sep).at(-1) ?? k, index }));
  const etkinEditor = secenek.etkinDosya
    ? new SahteEditor(new SahteBelge(secenek.etkinDosya, readFileSync(secenek.etkinDosya, "utf8")))
    : undefined;
  const bosOlay = (): ((d: Dinleyici<unknown>) => { dispose(): void }) => new EventEmitter<unknown>().event;
  const kapsayanKlasor = (yol: string): (typeof klasorler)[number] | undefined =>
    klasorler.find((k) => yol === k.uri.fsPath || yol.startsWith(k.uri.fsPath + sep));

  const iletiKaydet = (liste: string[]) => async (m: string): Promise<undefined> => { liste.push(m); return undefined; };

  const window = adAlani({
    get activeTextEditor() { return etkinEditor; },
    get visibleTextEditors() { return etkinEditor ? [etkinEditor] : []; },
    activeColorTheme: { kind: 2 },
    showInformationMessage: iletiKaydet(kayit.bilgiler),
    showWarningMessage: iletiKaydet(kayit.uyarilar),
    showErrorMessage: iletiKaydet(kayit.hatalar),
    setStatusBarMessage: (m: string) => { kayit.durumMesajlari.push(m); return new Disposable(); },
    showQuickPick: async () => undefined,
    showInputBox: async () => undefined,
    showTextDocument: async () => etkinEditor,
    createOutputChannel: (ad: string) => {
      const satirlar: string[] = [];
      kayit.kanallar.set(ad, satirlar);
      return adAlani({
        name: ad,
        appendLine: (s: string) => { satirlar.push(s); },
        append: (s: string) => { satirlar.push(s); },
        replace: () => undefined, clear: () => { satirlar.length = 0; }, show: () => undefined, hide: () => undefined, dispose: () => undefined,
      });
    },
    createStatusBarItem: (hizalama?: number) => {
      const oge: DurumOgesi = { text: "", tooltip: undefined, command: undefined, backgroundColor: undefined, hizalama, gorunur: false, atildi: false };
      kayit.durumOgeleri.push(oge);
      return adAlani({
        get text() { return oge.text; }, set text(v: string) { oge.text = v; },
        get tooltip() { return oge.tooltip; }, set tooltip(v: unknown) { oge.tooltip = v; },
        get command() { return oge.command; }, set command(v: unknown) { oge.command = v; },
        get backgroundColor() { return oge.backgroundColor; }, set backgroundColor(v: unknown) { oge.backgroundColor = v; },
        show: () => { oge.gorunur = true; },
        hide: () => { oge.gorunur = false; },
        dispose: () => { oge.gorunur = false; oge.atildi = true; },
      });
    },
    createTreeView: () => adAlani({
      visible: true, badge: undefined as unknown, message: undefined as unknown, title: undefined as unknown, description: undefined as unknown,
      reveal: async () => undefined, dispose: () => undefined,
      onDidChangeVisibility: bosOlay(), onDidChangeSelection: bosOlay(), onDidChangeCheckboxState: bosOlay(),
      onDidExpandElement: bosOlay(), onDidCollapseElement: bosOlay(),
    }),
    createTextEditorDecorationType: () => ({ key: "sahte", dispose: () => undefined }),
    onDidChangeActiveTextEditor: bosOlay(),
    onDidChangeTextEditorSelection: bosOlay(),
    onDidChangeVisibleTextEditors: bosOlay(),
    onDidChangeTextEditorVisibleRanges: bosOlay(),
    onDidChangeActiveColorTheme: bosOlay(),
  });

  const workspace = adAlani({
    get workspaceFolders() { return klasorler.length ? klasorler : undefined; },
    get name() { return klasorler[0]?.name; },
    get isTrusted() { return durum.guvenilir; },
    onDidGrantWorkspaceTrust: guven.event,
    textDocuments: [] as SahteBelge[],
    getConfiguration: (bolum?: string) => ({
      get: <T>(anahtar: string, varsayilan?: T): T | undefined => {
        const tam = bolum ? `${bolum}.${anahtar}` : anahtar;
        return (tam in ayarlar ? ayarlar[tam] : varsayilan) as T | undefined;
      },
      has: (anahtar: string) => (bolum ? `${bolum}.${anahtar}` : anahtar) in ayarlar,
      inspect: () => undefined,
      update: async () => undefined,
    }),
    getWorkspaceFolder: (u: Uri) => kapsayanKlasor(u.fsPath),
    asRelativePath: (u: Uri | string) => {
      const yol = typeof u === "string" ? u : u.fsPath;
      const k = kapsayanKlasor(yol);
      return k ? relative(k.uri.fsPath, yol).split(sep).join("/") : yol;
    },
    findFiles: async (desen: string | RelativePattern) => {
      kayit.dosyaAramasi += 1;
      const metin = typeof desen === "string" ? desen : desen.pattern;
      const kokler = typeof desen === "string" ? klasorler.map((k) => k.uri.fsPath) : [desen.base];
      const yollar: string[] = [];
      for (const k of kokler) dosyalariYuru(k, aramaSuzgeci(metin), yollar);
      return yollar.sort().map((y) => Uri.file(y));
    },
    openTextDocument: async (hedef: Uri | string) => {
      const yol = typeof hedef === "string" ? hedef : hedef.fsPath;
      return new SahteBelge(yol, readFileSync(yol, "utf8"));
    },
    applyEdit: async () => true,
    createFileSystemWatcher: () => adAlani({ onDidCreate: bosOlay(), onDidChange: bosOlay(), onDidDelete: bosOlay(), dispose: () => undefined }),
    fs: adAlani({
      readFile: async (u: Uri) => new Uint8Array(readFileSync(u.fsPath)),
      stat: async (u: Uri) => {
        const s = statSync(u.fsPath);
        return { type: s.isDirectory() ? 2 : 1, size: s.size, ctime: s.ctimeMs, mtime: s.mtimeMs };
      },
      readDirectory: async (u: Uri) => readdirSync(u.fsPath, { withFileTypes: true }).map((g) => [g.name, g.isDirectory() ? 2 : 1]),
    }),
    onDidOpenTextDocument: bosOlay(),
    onDidChangeTextDocument: bosOlay(),
    onDidSaveTextDocument: bosOlay(),
    onDidCloseTextDocument: bosOlay(),
    onDidChangeConfiguration: bosOlay(),
    onDidChangeWorkspaceFolders: bosOlay(),
  });

  const languages = adAlani({
    createDiagnosticCollection: (ad?: string) => adAlani({
      name: ad,
      set: (u: Uri, liste?: Diagnostic[]) => { kayit.tanilar.set(u.fsPath, [...(liste ?? [])]); },
      delete: (u: Uri) => { kayit.tanilar.delete(u.fsPath); },
      clear: () => { kayit.tanilar.clear(); },
      get: (u: Uri) => kayit.tanilar.get(u.fsPath),
      has: (u: Uri) => kayit.tanilar.has(u.fsPath),
      forEach: (cb: (u: Uri, t: Diagnostic[]) => void) => { for (const [y, t] of kayit.tanilar) cb(Uri.file(y), t); },
      dispose: () => { kayit.tanilar.clear(); },
    }),
    getDiagnostics: (u?: Uri) => (u ? kayit.tanilar.get(u.fsPath) ?? [] : [...kayit.tanilar].map(([y, t]) => [Uri.file(y), t])),
    onDidChangeDiagnostics: bosOlay(),
  });

  const commands = adAlani({
    registerCommand: (komut: string, f: (...a: unknown[]) => unknown) => {
      kayit.komutlar.set(komut, f);
      // VS Code'daki gibi: kayıt yalnız kendi işleyicisini bırakır; aynı kimliğe
      // sonradan yapılmış bir kayıt, eskisinin ikinci kez bırakılmasıyla silinmez.
      return new Disposable(() => { if (kayit.komutlar.get(komut) === f) kayit.komutlar.delete(komut); });
    },
    executeCommand: async (komut: string, ...argumanlar: unknown[]) => {
      kayit.komutCagrilari.push({ komut, argumanlar });
      const f = kayit.komutlar.get(komut);
      return f ? await f(...argumanlar) : undefined;
    },
    getCommands: async () => [...kayit.komutlar.keys()],
  });

  const vscode = adAlani({
    Uri, Range, Position, Selection, Diagnostic, DiagnosticSeverity, DiagnosticRelatedInformation, Location,
    EventEmitter, Disposable, ThemeColor, ThemeIcon, MarkdownString, TreeItem, RelativePattern,
    StatusBarAlignment: { Left: 1, Right: 2 },
    TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 },
    TreeItemCheckboxState: { Unchecked: 0, Checked: 1 },
    ExtensionMode: { Production: 1, Development: 2, Test: 3 },
    ConfigurationTarget: { Global: 1, Workspace: 2, WorkspaceFolder: 3 },
    ViewColumn: { Active: -1, Beside: -2, One: 1, Two: 2 },
    TextEditorRevealType: { Default: 0, InCenter: 1, InCenterIfOutsideViewport: 2, AtTop: 3 },
    EndOfLine: { LF: 1, CRLF: 2 },
    DecorationRangeBehavior: { OpenOpen: 0, ClosedClosed: 1, OpenClosed: 2, ClosedOpen: 3 },
    ColorThemeKind: { Light: 1, Dark: 2, HighContrast: 3, HighContrastLight: 4 },
    window, workspace, languages, commands,
    env: adAlani({
      language: secenek.dil ?? "tr",
      appName: "Visual Studio Code",
      clipboard: { writeText: async () => undefined, readText: async () => "" },
      openExternal: async () => false,
    }),
    extensions: adAlani({ getExtension: () => undefined, all: [] as unknown[], onDidChange: bosOlay() }),
  });
  return { vscode, kayit, guven, durum };
}

/** Bellekte tutulan anahtar-değer deposu (Memento). */
function bellek(): { get<T>(k: string, v?: T): T | undefined; update(k: string, v: unknown): Promise<void>; keys(): string[]; setKeysForSync(): void } {
  const depo = new Map<string, unknown>();
  return {
    get: <T>(k: string, v?: T) => (depo.has(k) ? depo.get(k) as T : v),
    update: async (k: string, v: unknown) => { depo.set(k, v); },
    keys: () => [...depo.keys()],
    setKeysForSync: () => undefined,
  };
}

/**
 * Eklentiyi sahte editörde etkinleştirir. Paket taze yüklenir; dönen nesne
 * kaydı, eklentinin dış yüzünü ve kapanış kapısını taşır.
 */
export function etkinlestir(secenek: EtkinlesmeSecenegi): EtkinEklenti {
  const { vscode, kayit, guven, durum } = kabukKur(secenek);
  const yol = paketle();
  (globalThis as Record<string, unknown>)[KOPRU_ANAHTARI] = vscode;
  delete gerek.cache[yol];
  const eklenti = gerek(yol) as {
    activate(baglam: unknown): Record<string, (...a: unknown[]) => unknown> | undefined;
    deactivate?(): void;
  };
  const paket = JSON.parse(readFileSync(join(EKLENTI_KOKU, "package.json"), "utf8")) as Record<string, unknown>;
  const baglam = {
    subscriptions: [] as { dispose(): unknown }[],
    extensionUri: Uri.file(EKLENTI_KOKU),
    extensionPath: EKLENTI_KOKU,
    extension: { id: "nexivion-labs.sarmal", packageJSON: paket, extensionUri: Uri.file(EKLENTI_KOKU), extensionPath: EKLENTI_KOKU },
    extensionMode: 1,
    globalState: bellek(),
    workspaceState: bellek(),
    globalStorageUri: Uri.file(join(tmpdir(), "sarmal-etkin-kabuk-depo")),
    storageUri: undefined,
    logUri: Uri.file(join(tmpdir(), "sarmal-etkin-kabuk-gunluk")),
    asAbsolutePath: (p: string) => join(EKLENTI_KOKU, p),
  };
  const yuz = eklenti.activate(baglam);
  return {
    kayit,
    yuz,
    guvenVer: () => { durum.guvenilir = true; guven.fire(); },
    async turBekle(zamanAsimiMs = 20_000): Promise<void> {
      const bitis = Date.now() + zamanAsimiMs;
      const ozet = (): unknown => (yuz?.sonGoruntuOzeti as (() => unknown) | undefined)?.();
      while (Date.now() < bitis) {
        if (ozet() !== undefined) return;
        await new Promise((r) => setTimeout(r, 20));
      }
      throw new Error("ilk denetim turu zaman aşımında yayınlanmadı");
    },
    kapat: () => {
      for (const d of baglam.subscriptions.splice(0)) { try { d.dispose(); } catch { /* kapanış kaydı ölçülmez */ } }
      try { eklenti.deactivate?.(); } catch { /* kapanış kaydı ölçülmez */ }
      delete (globalThis as Record<string, unknown>)[KOPRU_ANAHTARI];
    },
  };
}

/** Sınamaların fikstür kökü için gerçek (bağları çözülmüş) geçici dizin. */
export function geciciAlan(onek: string): string {
  return realpathSync(mkdtempSync(join(tmpdir(), onek)));
}

/** Paketlenmiş girişin varlığı — sınama kendi ön koşulunu ölçebilsin. */
export function paketHazirMi(): boolean {
  return existsSync(paketle());
}

// ═══════════════════════════════════════════════════════════════════════════
// ingilizce-yuz.test.ts — 🌐 İNGİLİZCE YÜZÜN TEK İLKESİ (MGZ-A09)
//
//   Founder 2026-09-17 tarihinde İngilizce bir pencerede yarı çevrilmiş bir yüz
//   görmüş ve yayını durdurmuştur (HTR-INGILIZCE-YUZ-YARI-CEVRILMIS): eklenti
//   tip adlarının üstüne İngilizce karşılıklarını boyuyor, aynı satırdaki alan
//   adları ve değerler Türkçe kalıyor, boya imleç satırında kalkıyor ve kademe
//   simgesi boyanan sözcüğün harflerinin üstüne çiziliyordu. Founder'ın
//   2026-10-10 hükmü tek ilkedir: dosyanın üzerine boyanan İngilizce bindirme
//   kalkar ve dosya her dilde olduğu gibi Türkçe görünür; arayüz, tanılar ve
//   ipucu balonları İngilizce olur ve dosyadaki gerçek Türkçe adları anar.
//
//   Nöbet eklentinin GERÇEK girişini sahte bir editörde iki dilde koşturur
//   (etkinlesme-kabugu.ts). Fikstür doğuş paketinin ürettiği gerçek bir ağaçtır,
//   çünkü İngilizce kullanan birinin ilk açtığı dosya odur.
//
//   ① BİNDİRME. Editöre basılan her dekor okunur. İki şey yasaktır: kaynak
//     metni saydamlaştıran bir dekor türü ve satırın İÇİNE harf boyayan bir
//     dekor. Satır sonuna basılan notlar (satır içi tanı, onay notu) arayüzdür ve
//     etkin dilde konuşur; kapanış etiketi ise dosyadaki tipi adlandırdığı için
//     iki dilde birebir aynıdır ve Türkçe tip adını taşır.
//   ② TÜRKÇE YÜZ. Türkçe dilde boyanan her şey İngilizce dildekiyle aynıdır;
//     Türkçe kullanıcının gördüğü görünüş bu Adımla değişmez.
//   ③ İPUCU BALONLARI. Kanonun her tipi, kenarı, alanı, anahtar sözcüğü ve
//     işleci gerçek ipucu sağlayıcısıyla iki dilde açılır. İngilizce balon
//     İngilizce konuşur, başlığında imlecin altındaki Türkçe adı taşır ve dosyada
//     bulunmayan bir ad karşılığı öğretmez; Türkçe balon değişmemiştir.
//   ④ ARAYÜZ METİNLERİ. Yüzey kataloğunun bütün İngilizce haneleri, paket
//     bildiriminin İngilizce dizeleri ve sözlüğün İngilizce düzyazısı aynı
//     ölçerden geçer (cekirdek/src/ingilizce-yuz.ts); adı veren yardımcılar
//     İngilizce dilde dosyadaki adı döndürür.
//   ⑤ TAMAMLAMA VE İMZA YARDIMI. Kanondaki her şema tipinin parantezinde gerçek
//     tamamlama ve imza sağlayıcıları iki dilde açılır. Alan önerisinin etiketi
//     dosyaya yazılacak Türkçe addır; ayrıntı satırı ve imza yardımı İngilizce
//     dilde İngilizce tarif taşır; Türkçe dilde ikisi de kanondaki dizgedir.
// ═══════════════════════════════════════════════════════════════════════════

import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dogusYaz } from "../../cekirdek/src/dogus.ts";
import { ingilizceYuzKusurlari } from "../../cekirdek/src/ingilizce-yuz.ts";
import { sozlukDuzYazisi } from "../../cekirdek/src/cevir.ts";
import { siniflamaYukle } from "../../cekirdek/src/siniflama.ts";
import { etkinlestir, geciciAlan, kabukTemizle, type EtkinEklenti, type KabukKaydi } from "./etkinlesme-kabugu.ts";
import { belgeKoy } from "./kabuk-kur.ts";
import { Position, Uri, workspace } from "./vscode-sahtesi.ts";
import { yuzeyDiliniAyarla } from "../src/yuzey-metinleri.ts";

// Kabuğu içeri alan modüller kanca kurulduktan SONRA yüklenir (kabuk-kur.ts).
const { ipucuSaglayici } = await import("../src/ipucu.ts");
const { tamamlamaSaglayici } = await import("../src/tamamlama.ts");
const { imzaSaglayici } = await import("../src/imza.ts");
const yuzey = await import("../src/yuzey-metinleri.ts");

const BUGUN = "2026-10-10";
const acik: EtkinEklenti[] = [];
after(() => { for (const e of acik.splice(0)) e.kapat(); kabukTemizle(); });

/** Doğuş paketinin ürettiği gerçek ağaç; etkin dosya planın Faz dosyasıdır. */
function agacKur(): { alan: string; plan: string } {
  const alan = geciciAlan("sarmal-ingilizce-yuz-");
  dogusYaz(alan, "deneme", BUGUN, "proje");
  return { alan, plan: join(alan, "is", "plan", "faz", "1_dogus.sar") };
}

type Konum = { line: number; character: number };
type Ek = { contentText?: string; contentIconPath?: unknown };
type CizimSecenegi = { before?: Ek; after?: Ek; light?: { before?: Ek; after?: Ek }; dark?: { before?: Ek; after?: Ek } };
type Aralik = { start: Konum; end: Konum };
/** `setDecorations` iki biçim kabul eder: çıplak aralık ya da seçenekli dekor. */
type Dekor = Aralik | { range: Aralik; renderOptions?: CizimSecenegi };

/** Bir dekorun ya da dekor türünün boyadığı bütün metinler. */
function ekMetinleri(s: CizimSecenegi | undefined): string[] {
  if (!s) return [];
  return [s.before, s.after, s.light?.before, s.light?.after, s.dark?.before, s.dark?.after]
    .map((e) => e?.contentText)
    .filter((m): m is string => typeof m === "string" && m.length > 0);
}

interface Boyama { readonly satir: number; readonly sutun: number; readonly bos: boolean; readonly satirSonu: boolean; readonly metin: string }

/** Etkin editöre basılan her metin, konumu ve satır sonunda olup olmadığıyla. */
function boyananlar(kayit: KabukKaydi, kaynak: string): Boyama[] {
  const satirlar = kaynak.split("\n");
  const sonuc: Boyama[] = [];
  for (const [tur, dekorlar] of kayit.dekorlar) {
    const turMetni = ekMetinleri(kayit.dekorTurleri.get(tur) as CizimSecenegi | undefined);
    for (const d of dekorlar as Dekor[]) {
      const { start, end } = "range" in d ? d.range : d;
      const secenek = "range" in d ? d.renderOptions : undefined;
      for (const metin of [...turMetni, ...ekMetinleri(secenek)]) {
        sonuc.push({
          satir: start.line, sutun: start.character,
          bos: start.line === end.line && start.character === end.character,
          satirSonu: start.character >= (satirlar[start.line] ?? "").length,
          metin,
        });
      }
    }
  }
  return sonuc;
}

/** Kaynak metni görünmez kılan dekor türleri — bindirmenin mekanizması budur. */
function saydamlastiranTurler(kayit: KabukKaydi): string[] {
  return [...kayit.dekorTurleri].filter(([, s]) => {
    const secenek = s as { color?: unknown; opacity?: unknown } | undefined;
    return secenek?.color === "transparent" || secenek?.opacity === "0";
  }).map(([anahtar]) => anahtar);
}

/** Bir dilde etkinleşir, ilk tur yayınını bekler ve editöre basılanı okur. */
async function dildeBoyananlar(dil: "tr" | "en"): Promise<{ kayit: KabukKaydi; boyama: Boyama[]; kaynak: string }> {
  const { alan, plan } = agacKur();
  const e = etkinlestir({ klasorler: [alan], etkinDosya: plan, dil });
  acik.push(e);
  await e.turBekle();
  const kaynak = readFileSync(plan, "utf8");
  return { kayit: e.kayit, boyama: boyananlar(e.kayit, kaynak), kaynak };
}

/** Kapanış etiketleri: `}` satırının sonuna basılan `‹ Tip KOD` notları. */
const kapanisEtiketleri = (boyama: readonly Boyama[]): string[] =>
  boyama.filter((b) => b.satirSonu && /^\s*‹ /u.test(b.metin)).map((b) => `${b.satir}: ${b.metin.trim()}`);

/** Satırın içine (satır sonundan önce) ya da kaynak sözcesinin üstüne harf boyayan dekorlar. */
const satirIciBoyama = (boyama: readonly Boyama[]): string[] =>
  boyama.filter((b) => (!b.satirSonu || !b.bos) && /\p{L}/u.test(b.metin)).map((b) => `${b.satir}:${b.sutun} "${b.metin}"`);

// ── ① BİNDİRME ──────────────────────────────────────────────────────────────

test("MGZ-A09 ① İngilizce dilde dosyanın üzerine hiçbir sözcük boyanmaz ve kaynak metin saydamlaşmaz", async () => {
  const { kayit, boyama } = await dildeBoyananlar("en");
  assert.ok(boyama.length > 0, "editöre hiç dekor basılmadı — nöbet boş küme üstünde koşuyor");
  assert.deepEqual(saydamlastiranTurler(kayit), [],
    "İngilizce dilde kaynak metni saydamlaştıran bir dekor türü kuruldu — bindirme geri gelmiş");
  assert.deepEqual(satirIciBoyama(boyama), [],
    "İngilizce dilde satırın içine sözcük boyandı — dosya her dilde olduğu gibi görünmeli");
});

test("MGZ-A09 ① kapanış etiketi iki dilde aynıdır ve dosyadaki Türkçe tip adını anar", async () => {
  const en = kapanisEtiketleri((await dildeBoyananlar("en")).boyama);
  const { boyama, kaynak } = await dildeBoyananlar("tr");
  const tr = kapanisEtiketleri(boyama);
  assert.ok(tr.length >= 5, `doğuş planında en az beş kapanış etiketi beklenir, bulunan: ${tr.join(" | ")}`);
  assert.deepEqual(en, tr, "İngilizce dildeki kapanış etiketi Türkçedekinden ayrışıyor — etiket dosyadaki adı anmalı");
  for (const tip of ["Faz", "Blok", "Katman", "AltKatman", "Adım"]) {
    assert.ok(tr.some((e) => new RegExp(`‹ ${tip}(?: |$)`, "u").test(e)), `"${tip}" kapanışının etiketi yok: ${tr.join(" | ")}`);
    assert.ok(kaynak.includes(`${tip}( kod:`), `fikstür "${tip}" ilanı taşımıyor`);
  }
});

// ── ② TÜRKÇE YÜZ ────────────────────────────────────────────────────────────

test("MGZ-A09 ② Türkçe dilde görünüş değişmez: boyanan her şey İngilizce dildekiyle aynıdır, satır içi boya yoktur", async () => {
  const tr = await dildeBoyananlar("tr");
  const en = await dildeBoyananlar("en");
  assert.deepEqual(saydamlastiranTurler(tr.kayit), [], "Türkçe dilde kaynak metni saydamlaştıran bir dekor türü kuruldu");
  assert.deepEqual(satirIciBoyama(tr.boyama), [], "Türkçe dilde satırın içine sözcük boyandı");
  // Satır sonundaki arayüz notları dilde konuşur; satırın içindeki ve kaynağın
  // üstündeki her şey (dal çizgileri, simgeler) iki dilde birebir aynıdır.
  const dilsiz = (b: readonly Boyama[]): string[] =>
    b.filter((x) => !x.satirSonu || /^\s*‹ /u.test(x.metin)).map((x) => `${x.satir}:${x.sutun} ${x.metin}`).sort();
  assert.deepEqual(dilsiz(en.boyama), dilsiz(tr.boyama), "dosyanın üstüne boyanan bir şey dile göre değişiyor");
});

// ── ③ İPUCU BALONLARI ───────────────────────────────────────────────────────

const EKLENTI_KOKU = fileURLToPath(new URL("..", import.meta.url));
const DEPO_KOKU = fileURLToPath(new URL("../../..", import.meta.url));
const SOZLUK = JSON.parse(readFileSync(join(DEPO_KOKU, "oz", "ceviri", "dil-sozlugu.json"), "utf8")) as Record<string, Record<string, unknown>>;

/** Dosyanın kendi Türkçe içeriği — balon onu aynen gösterir ve ölçüm dışıdır. */
const ICERIK = "Türkçe içerik cümlesi kaynakta olduğu gibi durur";

interface Hedef { readonly ad: string; readonly sozce: string; readonly satir: number; readonly sutun: number }

/** Kanonun bütün adlarını taşıyan tek belge ve her adın imleç konumu. */
function ipucuBelgesi(): { yol: string; hedefler: Hedef[] } {
  const satirlar: string[] = [];
  const hedefler: Hedef[] = [];
  const ekle = (ad: string, sozce: string, satir: string, sutun: number): void => {
    hedefler.push({ ad, sozce, satir: satirlar.length, sutun });
    satirlar.push(satir);
  };
  satirlar.push(`Adım( kod: ORN-ICERIK, ne: "${ICERIK}" )`);
  for (const tip of Object.keys(SOZLUK.widget)) ekle(`tip:${tip}`, tip, `${tip}( kod: ORN-${satirlar.length} )`, 0);
  for (const k of Object.keys(SOZLUK.kenar)) ekle(`kenar:${k}`, k, `  ${k}: [ ORN-ICERIK ]`, 2);
  for (const p of Object.keys(SOZLUK.parametre)) ekle(`alan:${p}`, p, `  ${p}: "x"`, 2);
  for (const a of ["çağır", "Tip", "Kural", "ve", "veya", "değil"]) ekle(`anahtar:${a}`, a, `${a} x`, 0);
  ekle("kod:ORN-ICERIK", "ORN-ICERIK", "  referans: [ ORN-ICERIK ]", 15);
  ekle("işleç:==", "==", "  görünür: a == b", 14);
  ekle("işleç:>=", ">=", "  görünür: yaş >= 18", 16);
  ekle("akış:-->", "-->", "  --> ORN-ICERIK", 2);
  ekle("i18n:#giris", "#giris.baslik", "  metin: #giris.baslik", 9);
  const belge = satirlar.length;
  satirlar.push("-->|", "|<--");
  hedefler.push({ ad: "belge:açılış", sozce: "-->|", satir: belge, sutun: 1 }, { ad: "belge:kapanış", sozce: "|<--", satir: belge + 1, sutun: 1 });
  const yol = join(geciciAlan("sarmal-ingilizce-ipucu-"), "ornek.sar");
  const metin = satirlar.join("\n");
  writeFileSync(yol, metin, "utf8");
  belgeKoy(yol, metin);
  workspace.findFiles = async () => [Uri.file(yol)];
  return { yol, hedefler };
}

/** Her hedefte gerçek ipucu sağlayıcısının açtığı balonun Markdown metni. */
async function balonlar(dil: "tr" | "en"): Promise<Map<string, { hedef: Hedef; md: string }>> {
  const { yol, hedefler } = ipucuBelgesi();
  const belge = belgeKoy(yol, readFileSync(yol, "utf8"));
  yuzeyDiliniAyarla(dil);
  try {
    const saglayici = ipucuSaglayici(() => dil);
    const sonuc = new Map<string, { hedef: Hedef; md: string }>();
    for (const h of hedefler) {
      const balon = await saglayici.provideHover(belge as never, new Position(h.satir, h.sutun) as never, undefined as never);
      const icerik = balon ? (Array.isArray(balon.contents) ? balon.contents : [balon.contents]) : [];
      sonuc.set(h.ad, { hedef: h, md: icerik.map((c) => (typeof c === "string" ? c : (c as { value: string }).value)).join("\n") });
    }
    return sonuc;
  } finally {
    yuzeyDiliniAyarla("tr");
  }
}

test("MGZ-A09 ③ İngilizce ipucu balonu İngilizce konuşur ve dosyadaki Türkçe adı aynen anar", async () => {
  const en = await balonlar("en");
  const dolu = [...en.values()].filter((b) => b.md.trim());
  assert.ok(dolu.length >= 150, `İngilizce balonların çoğu boş döndü (${dolu.length}) — nöbet boş küme üstünde koşuyor`);
  const kusurlu: string[] = [];
  for (const { hedef, md } of dolu) {
    const k = ingilizceYuzKusurlari(md, [hedef.sozce, ICERIK]);
    if (k.length) kusurlu.push(`${hedef.ad}: ${k.map((x) => `${x.tur}=${x.sozce}`).join(", ")}`);
  }
  assert.deepEqual(kusurlu, [], "İngilizce balonda Türkçe düzyazı ya da dosyada bulunmayan bir ad karşılığı var");
  for (const tip of Object.keys(SOZLUK.widget)) {
    const md = en.get(`tip:${tip}`)?.md ?? "";
    assert.ok(md.includes(`**${tip}**`), `${tip} balonunun başlığı dosyadaki adı taşımıyor: ${md.split("\n")[0]}`);
  }
  for (const kenar of Object.keys(SOZLUK.kenar)) {
    const ilk = (en.get(`kenar:${kenar}`)?.md ?? "").split("\n")[0] ?? "";
    assert.match(ilk, new RegExp(`\\*\\*${kenar}\\*\\* — edge`, "u"), `${kenar} kenar balonu başlığında ikinci bir ad taşıyor: ${ilk}`);
  }
  assert.match(en.get("kod:ORN-ICERIK")?.md ?? "", /\*\*ORN-ICERIK\*\* — Adım\n\nTürkçe içerik cümlesi/u,
    "atıf balonu düğümün tipini dosyadaki adıyla ve içeriğini olduğu gibi göstermeli");
});

test("MGZ-A09 ③ Türkçe ipucu balonu değişmez", async () => {
  const tr = await balonlar("tr");
  assert.equal(tr.get("kenar:bağımlı")?.md,
    "**bağımlı** — kenar (A->B)\n\nA, B'ye bağımlıdır; çağrı bağının tabanını kurar\n\n🌍 Emoji eşdeğeri: `🔗` — iki yazım aynı grafı üretir");
  assert.equal(tr.get("alan:görev")?.md,
    "**görev** — parametre\n\nAdım'ın yapacağı iş — bağlam-konisi (orkestratör prompt üretir)\n\n🌍 Emoji eşdeğeri: `🛠️` — iki yazım aynı grafı üretir");
  assert.equal(tr.get("anahtar:çağır")?.md,
    "**çağır**\n\nkod-tabanlı içe-aktarma: `çağır KOD` — yol değil, drift-bağışık\n\n🌍 Emoji eşdeğeri: `📞` — iki yazım aynı grafı üretir");
  assert.equal(tr.get("işleç:==")?.md, "**`==`** — ifade işleci\n\neşitlik — tek `=` geçersizdir, ayrıştırıcı uyarır");
  assert.match(tr.get("tip:Faz")?.md ?? "", /^🌀 \*\*Faz\*\* — _plan_ ailesi\n\nFaz \(mevsim\/yıl halkası 🌀\), ZAMAN eksenidir/u);
  assert.match(tr.get("kod:ORN-ICERIK")?.md ?? "", /\*\*ORN-ICERIK\*\* — Adım\n\nTürkçe içerik cümlesi/u);
});

// ── ④ ARAYÜZ METİNLERİ ──────────────────────────────────────────────────────

const ts = createRequire(join(EKLENTI_KOKU, "package.json"))("typescript") as typeof import("typescript");

/** Bir ifadenin metin iskeleti: dizgi parçaları birleşir, ara değerler yer tutucuya iner. */
function iskelet(d: import("typescript").Node): string {
  if (ts.isStringLiteral(d) || ts.isNoSubstitutionTemplateLiteral(d)) return d.text;
  if (ts.isTemplateExpression(d)) return d.head.text + d.templateSpans.map((s) => `⟨⟩${s.literal.text}`).join("");
  if (ts.isParenthesizedExpression(d)) return iskelet(d.expression);
  if (ts.isBinaryExpression(d) && d.operatorToken.kind === ts.SyntaxKind.PlusToken) return iskelet(d.left) + iskelet(d.right);
  return "⟨⟩";
}

/**
 * Yüzey kataloğunun BÜTÜN İngilizce haneleri, kaynaktan okunur: `yuzeyMetni`
 * çağrısının ikinci değişkeni, adı `_EN` ile biten çizelgeler ve `=== "en"`
 * dalları. Elle seçilmiş bir liste ertesi gün eklenen metni yeşilden geçirirdi.
 */
function katalogIngilizceHaneleri(): Array<{ yer: string; metin: string }> {
  const yol = join(EKLENTI_KOKU, "src", "yuzey-metinleri.ts");
  const kaynak = ts.createSourceFile(yol, readFileSync(yol, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const sonuc: Array<{ yer: string; metin: string }> = [];
  const parcalar = (d: import("typescript").Node, yer: string): void => {
    const ic = (n: import("typescript").Node): void => {
      if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateExpression(n)
        || (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.PlusToken)) {
        sonuc.push({ yer, metin: iskelet(n) });
        if (ts.isTemplateExpression(n)) for (const s of n.templateSpans) ic(s.expression);
        return;
      }
      if (ts.isCallExpression(n) && n.expression.getText() === "yuzeyMetni") return;
      if (ts.isBinaryExpression(n) && /^(?:===|!==)$/u.test(n.operatorToken.getText())) return;
      ts.forEachChild(n, ic);
    };
    ic(d);
  };
  const ziyaret = (d: import("typescript").Node): void => {
    const yer = `yuzey-metinleri.ts:${kaynak.getLineAndCharacterOfPosition(d.getStart()).line + 1}`;
    if (ts.isCallExpression(d) && d.expression.getText() === "yuzeyMetni" && d.arguments.length >= 2) parcalar(d.arguments[1]!, yer);
    if (ts.isVariableDeclaration(d) && d.initializer && /_EN$/u.test(d.name.getText())) { parcalar(d.initializer, yer); return; }
    if (ts.isConditionalExpression(d) && ts.isBinaryExpression(d.condition)) {
      const kosul = d.condition.getText();
      const enDali = /===\s*"en"/u.test(kosul) ? d.whenTrue : /===\s*"tr"/u.test(kosul) ? d.whenFalse : undefined;
      if (enDali) parcalar(enDali, yer);
    }
    ts.forEachChild(d, ziyaret);
  };
  ziyaret(kaynak);
  return sonuc.filter((p) => p.metin.trim() && p.metin !== "⟨⟩");
}

const kusurDokumu = (liste: ReadonlyArray<{ yer: string; metin: string }>): string[] =>
  liste.flatMap(({ yer, metin }) => {
    const k = ingilizceYuzKusurlari(metin, ["⟨⟩"]);
    return k.length ? [`${yer} [${k.map((x) => `${x.tur}=${x.sozce}`).join(", ")}] ${metin.replace(/\s+/gu, " ").slice(0, 90)}`] : [];
  });

test("MGZ-A09 ④ yüzey kataloğunun her İngilizce hanesi İngilizce konuşur ve dosyadaki adları anar", () => {
  const haneler = katalogIngilizceHaneleri();
  assert.ok(haneler.length > 400, `katalogda yalnız ${haneler.length} İngilizce hane okundu — tarama kör`);
  assert.deepEqual(kusurDokumu(haneler), [], "yüzey kataloğunun İngilizce hanesinde Türkçe düzyazı ya da İngilizce ad karşılığı var");
});

test("MGZ-A09 ④ paket bildiriminin ve sözlüğün İngilizce düzyazısı aynı ilkeye uyar", () => {
  const nls = JSON.parse(readFileSync(join(EKLENTI_KOKU, "package.nls.json"), "utf8")) as Record<string, string>;
  assert.deepEqual(kusurDokumu(Object.entries(nls).map(([k, v]) => ({ yer: `package.nls.json:${k}`, metin: v }))), [],
    "paket bildiriminin İngilizce dizesinde Türkçe düzyazı ya da İngilizce ad karşılığı var");
  // Sözlüğün eklentinin ve tanıların okuduğu üç bölümü, eklentinin okuduğu
  // kiple (ad jetonları dosyadaki adla) çözülür. Öteki bölümleri yalnız MCP
  // öğretim yüzü okur ve o yüz bu Adımın kapsamı dışında ölçülüp raporlanır.
  const duzyazi = (["widgetNe", "kenarNe", "yetkiNe"] as const).flatMap((b) => Object.keys((SOZLUK[b] ?? {}) as Record<string, unknown>)
    .map((k) => ({ yer: `dil-sozlugu.json:${b}.${k}`, metin: sozlukDuzYazisi(b, k, "", "en", "kaynak") })));
  assert.ok(duzyazi.length > 120, "sözlüğün düzyazı haneleri okunamadı");
  assert.deepEqual(duzyazi.filter((d) => /[⟦⟧]/u.test(d.metin)).map((d) => d.yer), [], "çözülmemiş ad jetonu kaldı");
  assert.deepEqual(kusurDokumu(duzyazi), [], "sözlüğün İngilizce düzyazısında Türkçe düzyazı ya da İngilizce ad karşılığı var");
});

test("MGZ-A09 ④ adı veren yardımcılar İngilizce dilde dosyadaki adı döndürür", () => {
  yuzeyDiliniAyarla("en");
  try {
    for (const tip of Object.keys(SOZLUK.widget)) assert.equal(yuzey.kanonikWidgetAdi(tip, tip), tip, `${tip} tipi İngilizce yüzde çevrilmiş`);
    for (const aile of Object.keys(SOZLUK.aileAdi)) assert.equal(yuzey.aileAdi(aile), aile, `${aile} ailesi İngilizce yüzde çevrilmiş`);
    for (const durum of ["beklemede", "geliştirmede", "tamamlandı", "bloklu", "doğrulanmamış"])
      assert.equal(yuzey.MINI_GRAF_METINLERI.durum(durum), durum, `${durum} değeri Mini Grafta çevrilmiş`);
    for (const alan of ["görev", "kabul", "sınır", "dokunulmaz", "referans", "rapor", "yama"] as const)
      assert.ok(yuzey.YOL_METINLERI.alan(alan).endsWith(alan), `koni kartı ${alan} alanını başka adla anıyor: ${yuzey.YOL_METINLERI.alan(alan)}`);
  } finally {
    yuzeyDiliniAyarla("tr");
  }
});

// ── ⑤ TAMAMLAMA VE İMZA YARDIMI ─────────────────────────────────────────────
//   Kontrolcü incelemesi (2026-10-10): İngilizce yüzde 27 alanın şema tarifi Türkçe
//   kalıyordu, çünkü ayrıntı satırı kanondaki dizgeyi olduğu gibi basıyordu. Tarif
//   artık sözlüğün `semaAlani` bölümünden gelir; ad ve enum değerleri aynen kalır.

const SEMA = siniflamaYukle(join(DEPO_KOKU, "oz", "siniflama", "kayit.json"));
const alanAdi = (ham: string): string => ham.split(" ")[0]!.split("(")[0]!;
interface SemaOneri { readonly tip: string; readonly ham: string; readonly rozet: string; readonly etiket?: string; readonly ayrinti?: string }
/** Ayrıntının alan tarifi; emoji eşdeğeri olan alanın sonundaki `· 🌍 …` eki ayrılır. */
const tarifKismi = (ayrinti: string | undefined): string | undefined => ayrinti?.replace(/ · 🌍 \S+$/u, "");

/** Her şema tipinin `Tip( ` satırında gerçek tamamlama ve imza sağlayıcılarının verdiği. */
async function semaYuzu(dil: "tr" | "en"): Promise<{ oneriler: SemaOneri[]; imzalar: Map<string, string[]> }> {
  const yol = join(geciciAlan("sarmal-ingilizce-tamamlama-"), "ornek.sar");
  yuzeyDiliniAyarla(dil);
  try {
    const tamamlama = tamamlamaSaglayici(() => dil);
    const imza = imzaSaglayici();
    const oneriler: SemaOneri[] = [];
    const imzalar = new Map<string, string[]>();
    for (const [tip, sema] of Object.entries(SEMA.semalar ?? {})) {
      const satir = `${tip}( `;
      writeFileSync(yol, satir, "utf8");
      const belge = belgeKoy(yol, satir);
      const konum = new Position(0, satir.length);
      const ogeler = (await tamamlama.provideCompletionItems(belge as never, konum as never, undefined as never, undefined as never)) as
        Array<{ label: string; detail?: string }> | undefined ?? [];
      const hamlar: Array<[string, string]> = [
        ...(sema.zorunlu ?? []).map((h): [string, string] => [h, "★"]),
        ...(sema.birindenBiri ?? []).flat().map((h): [string, string] => [h, "◇"]),
        ...(sema.opsiyonel ?? []).map((h): [string, string] => [h, "·"]),
      ];
      const gorulen = new Set<string>();
      for (const [ham, rozet] of hamlar) {
        if (gorulen.has(alanAdi(ham))) continue;
        gorulen.add(alanAdi(ham));
        const oge = ogeler.find((o) => o.label === alanAdi(ham) && (o.detail ?? "").startsWith(`${rozet} ${tip} `));
        oneriler.push({ tip, ham, rozet, etiket: oge?.label, ayrinti: oge?.detail });
      }
      const yardim = (await imza.provideSignatureHelp(belge as never, konum as never, undefined as never, undefined as never)) as
        { signatures: Array<{ label: string; parameters: Array<{ label: string }> }> } | undefined;
      const imzaBilgisi = yardim?.signatures[0];
      if (imzaBilgisi) imzalar.set(tip, [imzaBilgisi.label, ...imzaBilgisi.parameters.map((x) => x.label)]);
    }
    return { oneriler, imzalar };
  } finally {
    yuzeyDiliniAyarla("tr");
  }
}

test("MGZ-A09 ⑤ İngilizce tamamlama Türkçe alan adını önerir ve tarifi İngilizce verir", async () => {
  const { oneriler, imzalar } = await semaYuzu("en");
  assert.ok(oneriler.length > 300, `yalnız ${oneriler.length} şema alanı ölçüldü — nöbet kör`);
  const kusurlu: string[] = [];
  for (const o of oneriler) {
    if (o.etiket !== alanAdi(o.ham)) { kusurlu.push(`${o.tip}.${alanAdi(o.ham)}: öneri yok ya da etiket dosyadaki ad değil (${o.etiket})`); continue; }
    if (!tarifKismi(o.ayrinti)?.startsWith(`${o.rozet} ${o.tip} schema — ${alanAdi(o.ham)}`)) kusurlu.push(`${o.tip}.${o.etiket}: ayrıntı İngilizce çerçeve taşımıyor: ${o.ayrinti}`);
    const k = ingilizceYuzKusurlari(o.ayrinti ?? "", [o.tip, o.etiket]);
    if (k.length) kusurlu.push(`${o.tip}.${o.etiket} [${k.map((x) => `${x.tur}=${x.sozce}`).join(", ")}] ${o.ayrinti}`);
  }
  assert.deepEqual(kusurlu, [], "İngilizce tamamlamada Türkçe tarif ya da dosyada bulunmayan bir ad var");
  assert.ok(imzalar.size > 50, `yalnız ${imzalar.size} tipte imza yardımı açıldı`);
  for (const [tip, [imza, ...parametreler]] of imzalar) {
    const k = ingilizceYuzKusurlari(imza ?? "", [tip]);
    assert.deepEqual(k.map((x) => `${x.tur}=${x.sozce}`), [], `${tip} imza yardımı İngilizce tarif taşımıyor: ${imza}`);
    for (const p of parametreler) assert.ok((imza ?? "").includes(p), `${tip} imza parametresi imza etiketinde yok: ${p}`);
  }
});

test("MGZ-A09 ⑤ Türkçe tamamlama ve imza yardımı kanondaki dizgeyi aynen gösterir", async () => {
  const { oneriler, imzalar } = await semaYuzu("tr");
  for (const o of oneriler) {
    assert.equal(o.etiket, alanAdi(o.ham), `${o.tip}.${alanAdi(o.ham)} önerisi Türkçe yüzde kayboldu`);
    assert.equal(tarifKismi(o.ayrinti), `${o.rozet} ${o.tip} şeması — ${o.ham}`, `${o.tip}.${o.etiket} ayrıntısı Türkçe yüzde değişti`);
  }
  for (const [tip, [imza]] of imzalar) {
    const sema = SEMA.semalar![tip]!;
    const alanlar = [...sema.zorunlu, ...(sema.opsiyonel ?? [])];
    assert.equal(imza, `${tip}( ${alanlar.map((a) => (sema.zorunlu.includes(a) ? a : `[${a}]`)).join(", ")} )`, `${tip} imza yardımı Türkçe yüzde değişti`);
  }
});

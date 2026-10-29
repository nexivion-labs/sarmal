// ═══════════════════════════════════════════════════════════════════════════
// sorunlar-paneli.test.ts — 〰️ SORUNLAR PANELİNE GÖNDERİM AYARA BAĞLI (PNL-A22 · gerçek VS Code)
//
//   OZK-14 ÜÇÜNCÜSÜ (Founder 2026-10-28): Sarmal tanılarının Sorunlar paneline gönderilmesi
//   bir ayarla seçilir ve varsayılanı kapalıdır. Kabulün gerçek VS Code ayağı:
//     · Ayar kapalıyken VS Code'un tanı deposunda (`vscode.languages.getDiagnostics`) Sarmal
//       kaynaklı tanı yoktur; editörde satır işareti, hover ve hızlı düzeltme aynı tanı
//       kodu, düzey ve öneriyle görünür. Hover ve hızlı düzeltme VS Code'un kendi
//       komutlarıyla (`vscode.executeHoverProvider` · `vscode.executeCodeActionProvider`)
//       istenir; satır işareti eklentinin son çizim ölçüsünden okunur (süit ekranı okuyamaz).
//     · Her tanı en az Sinyaller sekmesinde ve editör satırında görünür kalır (YAS-3.4).
//     · Ayar açılınca pencere yeniden yüklenmeden Sorunlar deposu aynı tanıları kayıpsız
//       taşır; ayar silinince depo yeniden boşalır.
//   Ölçüm çalışma alanına yazılan geçici bir dosyanın bilinçli kusurlarıyla yapılır:
//   bilinmeyen tip (HATA, önerili), eksik alan (UYARI) ve öneksiz Blok (BİLGİ).
// ═══════════════════════════════════════════════════════════════════════════

import * as assert from "node:assert";
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import { beklenenSunumYuzeyi } from "../../../cekirdek/src/denetim.ts";

const EKLENTI = "nexivion-labs.sarmal";
const AYAR = "sorunlarPaneli";

type Bant = "dur" | "dikkat" | "bilgi";
interface Olcu { dosya: string; etkin: boolean; bantlar: Record<Bant, Array<[number, number, number]>> }
interface Kapi { editorSinyalOlcumu(dosya: string): Olcu | undefined }
interface DisYuz { bolumSinamaKapisi?: Kapi; sinyalKayitlari(): Array<{ dosya: string; kod: string; duzey: string; satir: number }> }

async function bekle(kosul: () => boolean | Promise<boolean>, ne: string, sure = 20_000): Promise<void> {
  const son = Date.now() + sure;
  while (!(await kosul())) {
    if (Date.now() > son) throw new Error(`beklenen durum gelmedi: ${ne}`);
    await new Promise((r) => setTimeout(r, 100));
  }
}

const KAYNAK = [
  `Faz( kod: SPN-F1, ad: "Sorunlar paneli nöbeti" ) {`,
  `  Blok( kod: SPN-B1, ad: "Sorunlar işi" ) {`,
  `    Katmanx( kod: SPN-K1, ad: "Bilerek yanlış tip" )`,
  `  }`,
  `}`,
  ``,
].join("\n");
const BANT: Record<string, Bant> = { hata: "dur", "uyarı": "dikkat", bilgi: "bilgi" };
const ayar = (): vscode.WorkspaceConfiguration => vscode.workspace.getConfiguration("sarmal");
const sarmalTanilari = (uri: vscode.Uri): vscode.Diagnostic[] =>
  vscode.languages.getDiagnostics(uri).filter((t) => String(t.source ?? "").startsWith("Sarmal"));
const butunSarmalTanilari = (): number =>
  vscode.languages.getDiagnostics().reduce((t, [, l]) => t + l.filter((x) => String(x.source ?? "").startsWith("Sarmal")).length, 0);

describe("PNL-A22 — Sorunlar paneline gönderim ayara bağlı (gerçek VS Code)", () => {
  let disYuz: DisYuz;
  let yol = "";
  let uri: vscode.Uri;
  const olcu = (): Olcu | undefined => disYuz.bolumSinamaKapisi!.editorSinyalOlcumu(yol);
  const dosyaninKayitlari = () => disYuz.sinyalKayitlari().filter((k) => k.dosya === yol);

  before(async () => {
    disYuz = (await vscode.extensions.getExtension(EKLENTI)!.activate()) as DisYuz;
    assert.ok(disYuz.bolumSinamaKapisi, "sınama kipinde nöbet kapısı verilmeliydi");
    await ayar().update(AYAR, undefined, vscode.ConfigurationTarget.Global);
    const kok = vscode.workspace.workspaceFolders![0]!.uri.fsPath;
    yol = path.join(kok, "gercek", "_pnl-a22-nobet.sar");
    uri = vscode.Uri.file(yol);
    fs.writeFileSync(yol, KAYNAK, "utf8");
    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(uri));
    await bekle(() => ["bilinmeyen-tip", "eksik-alan", "öneksiz-blok"].every((kod) => dosyaninKayitlari().some((k) => k.kod === kod)),
      "geçici dosyanın tanıları turun defterine düşmedi");
  });

  after(async () => {
    await ayar().update(AYAR, undefined, vscode.ConfigurationTarget.Global);
    try { fs.unlinkSync(yol); } catch { /* zaten silindi */ }
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
  });

  it("varsayılan kapalıdır: yeni kurulumda sarmal.sorunlarPaneli kapalı gelir ve değer paketin ilanından okunur", () => {
    const bakis = ayar().inspect<boolean>(AYAR);
    assert.strictEqual(bakis?.globalValue, undefined, "ayar kullanıcı ayarından geliyor — yeni kurulum ölçülmüyor");
    assert.strictEqual(bakis?.workspaceValue, undefined, "ayar çalışma alanı ayarından geliyor");
    assert.strictEqual(bakis?.defaultValue, false, "paketin ilanında varsayılan kapalı değil");
    assert.strictEqual(ayar().get(AYAR), false);
  });

  it("ayar kapalıyken Sorunlar deposunda Sarmal tanısı yoktur; her tanı Sinyaller'de ve editör satırında düzeyinin bandıyla görünür", async () => {
    await bekle(() => olcu()?.etkin === true && (olcu()?.bantlar.dur.length ?? 0) > 0, "editörde satır işareti çizilmedi");
    assert.strictEqual(sarmalTanilari(uri).length, 0, "ayar kapalıyken dosyanın Sarmal tanısı Sorunlar deposunda");
    assert.strictEqual(butunSarmalTanilari(), 0, "ayar kapalıyken çalışma alanında Sorunlar deposuna Sarmal tanısı yazılmış");
    // YAS-3.4: Sinyaller'e giren her kayıt editör satırında kendi bandıyla işaretlidir.
    const o = olcu()!;
    for (const k of dosyaninKayitlari().filter((x) => beklenenSunumYuzeyi({ kod: x.kod, duzey: x.duzey as never }) !== "hatırlatıcılar")) {
      const bant = BANT[k.duzey]!;
      assert.ok(o.bantlar[bant].some(([satir]) => satir === k.satir - 1), `${k.kod} (${k.duzey}) satır ${k.satir}: editörde ${bant} işareti yok`);
    }
  });

  it("ayar kapalıyken hover tanının kodunu, düzeyini, iletisini ve önerisini; hızlı düzeltme önerinin düzeltmesini verir", async () => {
    const [satir, bas, son] = olcu()!.bantlar.dur.find(([s]) => s === 2)!;
    const hoverlar = (await vscode.commands.executeCommand<vscode.Hover[]>("vscode.executeHoverProvider", uri, new vscode.Position(satir, bas + 1))) ?? [];
    const metin = hoverlar.flatMap((h) => h.contents).map((c) => (typeof c === "string" ? c : (c as vscode.MarkdownString).value)).join("\n");
    assert.match(metin, /\*\*(Dur|Stop)\*\* · `bilinmeyen-tip`/, `hover düzeyi ve kodu söylemiyor: ${metin.slice(0, 400)}`);
    assert.match(metin, /Katmanx/, "hover tanının iletisini taşımıyor");
    assert.match(metin, /\*\*(Öneri|Suggestion):\*\*/, "hover öneriyi taşımıyor");
    assert.match(metin, /Katman\b/, "hover önerinin kendisini taşımıyor");
    const eylemler = (await vscode.commands.executeCommand<vscode.CodeAction[]>("vscode.executeCodeActionProvider", uri,
      new vscode.Range(satir, bas, satir, son))) ?? [];
    // VS Code komutun dönüşünde eylemin tanı bağını her zaman taşımaz; eylem başlığı ve düzenlemesiyle tanınır.
    const duzelt = eylemler.find((e) => /Katman/.test(e.title) && e.edit !== undefined);
    assert.ok(duzelt, `hızlı düzeltme çıkmadı (eylemler: ${eylemler.map((e) => e.title).join(" | ")})`);
    const metinler = duzelt.edit?.entries().flatMap(([, d]) => d.map((x) => x.newText)) ?? [];
    assert.deepStrictEqual(metinler, ["Katman"], "hızlı düzeltme öneriyi uygulamıyor");
    assert.strictEqual(sarmalTanilari(uri).length, 0, "hover ve hızlı düzeltme Sorunlar deposuna dayanıyor");
  });

  it("ayar açılınca pencere yeniden yüklenmeden Sorunlar deposu aynı tanıları kayıpsız taşır ve editör katmanı susar; ayar silinince depo yeniden boşalır", async () => {
    const beklenen = dosyaninKayitlari().filter((k) => beklenenSunumYuzeyi({ kod: k.kod, duzey: k.duzey as never }) === "problems")
      .map((k) => `${k.kod}:${k.satir}`).sort();
    assert.ok(beklenen.length > 0, "dosyada Sorunlar paneline gidecek tanı yok");
    await ayar().update(AYAR, true, vscode.ConfigurationTarget.Global);
    await bekle(() => sarmalTanilari(uri).length > 0, "ayar açılınca Sorunlar deposu dolmadı");
    await new Promise((r) => setTimeout(r, 500));
    assert.deepStrictEqual(sarmalTanilari(uri).map((t) => `${String(t.code)}:${t.range.start.line + 1}`).sort(), beklenen,
      "Sorunlar deposu turun hata ve uyarılarını kayıpsız taşımıyor");
    await bekle(() => olcu()?.etkin === false && Object.values(olcu()!.bantlar).every((b) => b.length === 0), "ayar açıkken editör katmanı da çiziyor");
    await ayar().update(AYAR, undefined, vscode.ConfigurationTarget.Global);
    await bekle(() => sarmalTanilari(uri).length === 0, "ayar silinince Sorunlar deposu boşalmadı");
    await bekle(() => olcu()?.etkin === true && (olcu()?.bantlar.dur.length ?? 0) > 0, "ayar silinince satır işaretleri geri gelmedi");
  });
});

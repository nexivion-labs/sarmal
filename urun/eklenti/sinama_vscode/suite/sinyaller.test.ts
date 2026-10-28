// ═══════════════════════════════════════════════════════════════════════════
// sinyaller.test.ts — 🚦 SİNYALLER SEKMESİ GERÇEK VS Code'DA (PNL-A09 · OZK-14)
//
//   Kabulün iki ayağı burada ölçülür:
//     · Her satır dosyanın doğru yerini açar: Sinyaller ağacındaki tanı satırına
//       tıklama (webview'den gelen ileti) dosyayı tanının satırında açar.
//     · Sekmedeki tanı sayısı aynı kapsamdaki denetim sonucundan Hatırlatıcılar
//       yüzeyine yönlenenler çıkınca kalanın sayısına eşittir; Dur ile Dikkat
//       bantları da VS Code'un Sorunlar deposunun aynı dosya için tuttuğu Sarmal
//       tanılarına eşittir.
//     · Panelde her tanı bir kez görünür (YUZ-3.3 · Founder hükmü 2026-10-28):
//       Hatırlatıcılar yüzeyine yönlenen tanı Sinyaller'de yoktur ve Makinist'in
//       Hatırlatıcılar kaynağındadır; bütün bantlar açıkken çizilen satır sayısı
//       tekil kayıt sayısıdır; Sinyaller'de ayrı Gözlemler bölümü yoktur.
//   Ölçüm, çalışma alanına yazılan geçici bir dosyanın bilinçli kusurları üzerinden
//   yapılır: bilinmeyen tip (HATA), eksik alan (UYARI), öneksiz Blok (BİLGİ) ve
//   açık bir Hatırlatıcı (Hatırlatıcılar yüzeyine yönlenen BİLGİ).
// ═══════════════════════════════════════════════════════════════════════════

import * as assert from "node:assert";
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import { beklenenSunumYuzeyi } from "../../../cekirdek/src/denetim.ts";

const EKLENTI = "nexivion-labs.sarmal";
const SINAMA_KOMUTU = "sarmal.sinama.panel";

interface SinyalOlcusu {
  dur: number; dikkat: number; bilgi: number; toplam: number; bantsiz: number; hatirlatici: number;
  cizilenSatir: number; tekilKayit: number;
}
interface Kapi { panelOlcumleri(): { sekme: string; hazir: number; sinyaller?: SinyalOlcusu } | undefined }
interface YuzKaydi { dosya: string; tani: { kod: string; satir: number } }
interface DisYuz {
  bolumSinamaKapisi?: Kapi;
  sinyalKayitlari(): Array<{ dosya: string; kod: string; duzey: string; satir: number }>;
  /** Makinist'in Hatırlatıcılar grubunu ve durum çubuğundaki Gözlemler sayacını besleyen dağıtım. */
  yuzeyKayitlari(): { hatırlatıcılar: readonly YuzKaydi[]; bildirimler: readonly YuzKaydi[] };
}
/** Denetim tarafının yönlendirmesi: kayıt Hatırlatıcılar yüzeyine mi gider (motorun kararı)? */
const hatirlaticiya = (k: { kod: string; duzey: string }): boolean =>
  beklenenSunumYuzeyi({ kod: k.kod, duzey: k.duzey as never }) === "hatırlatıcılar";
interface AgacSatiri { id: string; derinlik: number; durum: string; etiket: string }
interface SinyalSatiri { id: string; kod: string; dosya: string; satir: number; bant: string; komutlu: boolean }

async function bekle(kosul: () => boolean | Promise<boolean>, ne: string, sure = 20_000): Promise<void> {
  const son = Date.now() + sure;
  while (!(await kosul())) {
    if (Date.now() > son) throw new Error(`beklenen durum gelmedi: ${ne}`);
    await new Promise((r) => setTimeout(r, 100));
  }
}

const KAYNAK = [
  `Faz( kod: SNY-F1, ad: "Sinyal nöbeti" ) {`,
  `  Blok( kod: SNY-B1, ad: "Sinyal işi" ) {`,
  `    Katmanx( kod: SNY-K1, ad: "Bilerek yanlış tip" )`,
  `  }`,
  `}`,
  `Hatırlatıcı( kod: SNY-H1, ne: "Sinyal nöbetinin açık hatırlatıcısı", durum: açık )`,
  ``,
].join("\n");

describe("PNL-A09 — Sinyaller sekmesi (gerçek VS Code)", () => {
  let kapi: Kapi;
  let disYuz: DisYuz;
  let yol = "";
  const o = () => kapi.panelOlcumleri()!;
  const agac = async (): Promise<AgacSatiri[]> => (await vscode.commands.executeCommand(SINAMA_KOMUTU, { eylem: "sinyalAgaci" })) as AgacSatiri[];
  const satirlar = async (): Promise<SinyalSatiri[]> => (await vscode.commands.executeCommand(SINAMA_KOMUTU, { eylem: "sinyalSatirlari" })) as SinyalSatiri[];

  before(async () => {
    // Dur ve Dikkat bantları VS Code'un Sorunlar deposuyla karşılaştırılır; PNL-A22'den beri gönderim ayarla
    // seçildiği için süit ayarı açar ve sonunda siler.
    await vscode.workspace.getConfiguration("sarmal").update("sorunlarPaneli", true, vscode.ConfigurationTarget.Global);
    disYuz = (await vscode.extensions.getExtension(EKLENTI)!.activate()) as DisYuz;
    assert.ok(disYuz.bolumSinamaKapisi, "sınama kipinde nöbet kapısı verilmeliydi");
    kapi = disYuz.bolumSinamaKapisi!;
    await vscode.commands.executeCommand("sarmal.bolum.ray");
    await bekle(() => (o()?.hazir ?? 0) > 0, "panelin betiği yüklenmedi");
    const kok = vscode.workspace.workspaceFolders![0]!.uri.fsPath;
    yol = path.join(kok, "gercek", "_pnl-a09-nobet.sar");
    fs.writeFileSync(yol, KAYNAK, "utf8");
    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(yol));
  });

  after(async () => {
    try { fs.unlinkSync(yol); } catch { /* zaten silindi */ }
    await vscode.workspace.getConfiguration("sarmal").update("sorunlarPaneli", undefined, vscode.ConfigurationTarget.Global);
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    await vscode.commands.executeCommand("sarmal.bolum.ray");
  });

  it("geçici dosyanın HATA, UYARI ve BİLGİ tanıları kendi bantlarındadır; sekmenin sayısı turun kayıtları eksi Hatırlatıcılar yüzeyine yönlenenlerdir, Dur ile Dikkat VS Code'un Sorunlar deposuna, Bilgi durum çubuğunun Gözlemler sayacına eşittir", async () => {
    await vscode.commands.executeCommand("sarmal.sinyallerAc");
    await bekle(() => o().sekme === "sinyaller", "Sinyaller sekmesi seçilmedi");
    const dosyaKayitlari = () => disYuz.sinyalKayitlari().filter((k) => k.dosya === yol);
    await bekle(() => ["bilinmeyen-tip", "eksik-alan", "öneksiz-blok", "açık-hatırlatıcı"].every((kod) => dosyaKayitlari().some((k) => k.kod === kod)), "geçici dosyanın tanıları Sinyaller defterine düşmedi");
    // Sayılar durulana dek (izleyici turu da koşar) bekle, sonra ölç.
    await new Promise((r) => setTimeout(r, 2_500));
    const kayitlar = disYuz.sinyalKayitlari();
    const sinyalde = kayitlar.filter((k) => !hatirlaticiya(k));
    const olcu = o().sinyaller!;
    assert.strictEqual(olcu.bantsiz, 0);
    assert.ok(sinyalde.length < kayitlar.length, "kapsamda Hatırlatıcılar yüzeyine yönlenen tanı yok: nöbet hiçbir şeyi ölçmüyor");
    assert.strictEqual(olcu.toplam, sinyalde.length, "Sinyaller sayısı denetim sonucu eksi Hatırlatıcılar yüzeyine yönlenenlerden ayrıştı");
    assert.strictEqual(olcu.hatirlatici, kayitlar.length - sinyalde.length);
    assert.deepStrictEqual([olcu.dur, olcu.dikkat, olcu.bilgi], ["hata", "uyarı", "bilgi"].map((d) => sinyalde.filter((k) => k.duzey === d).length));
    // Bilgi bandı eski Gözlemler kümesinin kendisidir: durum çubuğundaki Gözlemler sayacının kaynağına eşittir.
    assert.strictEqual(olcu.bilgi, disYuz.yuzeyKayitlari().bildirimler.length, "Bilgi bandı durum çubuğundaki Gözlemler sayacından ayrıştı");
    // Bağımsız kanal: VS Code'un Sorunlar deposu bu dosya için hata ve uyarı düzeyindeki Sarmal tanılarını tutar.
    const sorunlar = vscode.languages.getDiagnostics(vscode.Uri.file(yol)).filter((t) => String(t.source ?? "").startsWith("Sarmal"));
    const dosyaninKayitlari = dosyaKayitlari();
    assert.strictEqual(sorunlar.filter((t) => t.severity === vscode.DiagnosticSeverity.Error).length, dosyaninKayitlari.filter((k) => k.duzey === "hata").length,
      `Dur bandı Sorunlar deposundan ayrıştı (${sorunlar.map((t) => t.code).join(", ")} · ${dosyaninKayitlari.map((k) => k.kod).join(", ")})`);
    assert.strictEqual(sorunlar.filter((t) => t.severity === vscode.DiagnosticSeverity.Warning).length, dosyaninKayitlari.filter((k) => k.duzey === "uyarı").length,
      "Dikkat bandı Sorunlar deposundan ayrıştı");
  });

  it("Sinyaller satırına tıklamak dosyayı tanının satırında açar (bilinmeyen tip · satır 3)", async () => {
    // Kapalı bant ve projeleri webview'in kendi iletisiyle aç; tanı satırları çizilsin.
    for (let tur = 0; tur < 3; tur++) {
      for (const s of (await agac()).filter((x) => x.durum === "kapali" && x.derinlik <= 1)) {
        await vscode.commands.executeCommand(SINAMA_KOMUTU, { eylem: "ileti", ileti: { tip: "gec", id: s.id, ac: true } });
      }
    }
    await bekle(async () => (await satirlar()).some((s) => s.dosya === yol && s.kod === "bilinmeyen-tip"), "bilinmeyen tip satırı çizilmedi");
    const satir = (await satirlar()).find((s) => s.dosya === yol && s.kod === "bilinmeyen-tip")!;
    assert.strictEqual(satir.bant, "dur", "HATA düzeyindeki tanı Dur bandında değil");
    assert.strictEqual(satir.satir, 3);
    assert.ok(satir.komutlu, "tanı satırı dosyayı açan komutu taşımıyor");
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    await vscode.commands.executeCommand(SINAMA_KOMUTU, { eylem: "ileti", ileti: { tip: "ac", id: satir.id } });
    const editor = (): vscode.TextEditor | undefined => vscode.window.visibleTextEditors.find((e) => e.document.uri.fsPath === yol);
    await bekle(() => editor()?.selection.active.line === 2, `dosya tanının satırında açılmadı (satır ${editor()?.selection.active.line})`, 8_000);
    const uyari = (await satirlar()).find((s) => s.dosya === yol && s.kod === "eksik-alan");
    if (uyari) assert.strictEqual(uyari.bant, "dikkat", "UYARI düzeyindeki tanı Dikkat bandında değil");
  });

  it("panelde her tanı bir kez: Hatırlatıcılar yüzeyine yönlenen tanı Sinyaller'de yok, Makinist'in kaynağında var; ayrı Gözlemler bölümü yok; çizilen satır tekil kayıt sayısıdır", async () => {
    // Bütün bant ve projeleri webview'in kendi iletisiyle aç (önceki sınama açmış olabilir; açık olan dokunulmaz).
    for (let tur = 0; tur < 3; tur++) {
      for (const s of (await agac()).filter((x) => x.durum === "kapali" && x.derinlik <= 1)) {
        await vscode.commands.executeCommand(SINAMA_KOMUTU, { eylem: "ileti", ileti: { tip: "gec", id: s.id, ac: true } });
      }
    }
    await bekle(() => o().sinyaller!.cizilenSatir === o().sinyaller!.toplam, "bütün tanı satırları çizilmedi");
    const olcu = o().sinyaller!;
    const tum = await agac();
    assert.deepStrictEqual(tum.filter((x) => x.derinlik === 0).map((x) => x.id), ["sinyaller/bant.dur", "sinyaller/bant.dikkat", "sinyaller/bant.bilgi"],
      "üst düğümler yalnız üç bant olmalı; ayrı Gözlemler bölümü kalkmıştır");
    assert.strictEqual(olcu.tekilKayit, olcu.cizilenSatir, "bir kayıt Sinyaller'de iki kez çizildi");
    assert.strictEqual(new Set(tum.map((x) => x.id)).size, tum.length, "aynı satır kimliği iki kez çizildi");
    const sat = await satirlar();
    assert.deepStrictEqual(sat.filter((x) => hatirlaticiya({ kod: x.kod, duzey: x.bant === "dur" ? "hata" : x.bant === "dikkat" ? "uyarı" : "bilgi" })).map((x) => x.kod), [],
      "Hatırlatıcılar yüzeyine yönlenen tanı Sinyaller'de çizildi");
    // Geçici dosyanın açık Hatırlatıcısı Makinist'in Hatırlatıcılar kaynağındadır, Sinyaller'de değildir.
    assert.ok(disYuz.yuzeyKayitlari().hatırlatıcılar.some((k) => k.dosya === yol && k.tani.kod === "açık-hatırlatıcı"), "açık hatırlatıcı Makinist'in kaynağına düşmedi");
    assert.ok(!sat.some((x) => x.dosya === yol && x.kod === "açık-hatırlatıcı"), "açık hatırlatıcı Sinyaller'de de görünüyor");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// dizgi-tokeni.test.ts — 📝 NİYET METNİ ANLAMSAL TOKEN ALIR (Founder 2026-09-02)
//
//   Ölçülmüş kusur ve bir aylık ömrü: Sarmal kaynağındaki dizgi değerleri —
//   yani `ne`, `görev`, `kabul` ve `sınır` alanlarının niyet metinleri — hiçbir
//   anlamsal token almıyordu. Boyanmaları yalnız TextMate kapsamına
//   (string.quoted.double.sar) kalıyordu ve o kapsamın rengi paketin
//   configurationDefaults ilanından boyayıcıya HİÇ ulaşmaz; bu iki bağımsız
//   ölçümle saptanmış bir VS Code davranışıdır. Sonuç şuydu: kanonun beyazı
//   yalnız deponun kendi ayar dosyasını taşıyan pencerede görünüyor, doğuş
//   paketiyle doğan her projede niyet metinleri editörün kendi dizgi rengine
//   düşüyordu. Kusur bir ay yaşadı, çünkü token üretimini ölçen hiçbir nöbet
//   yoktu: `renkSaglayici` dışa açıktı fakat hiçbir sınama onu çağırmıyordu.
//
//   Nöbet metin avı değil DAVRANIŞ ölçer: renk.ts sahte bir yürütücüyle
//   paketlenip GERÇEKTEN koşturulur ve üretilen token akışı sayılır.
// ═══════════════════════════════════════════════════════════════════════════
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import esbuild from "esbuild";

const yol = (u: string): string => fileURLToPath(new URL(u, import.meta.url));
const KOK = dirname(yol("../package.json"));
const gerek = createRequire(import.meta.url);

const PAKETLENMIS = (() => {
  const dizin = mkdtempSync(join(tmpdir(), "sarmal-dizgi-tokeni-"));
  const sahteYol = join(dizin, "sahte-vscode.cjs");
  writeFileSync(sahteYol, "module.exports = globalThis.__SARMAL_SAHTE_VSCODE__;\n");
  const giris = join(dizin, "giris.ts");
  writeFileSync(giris, `export { renkSaglayici, efsane } from ${JSON.stringify(join(KOK, "src", "renk.ts"))};\n`);
  const cikti = join(dizin, "dizgi-tokeni.cjs");
  esbuild.buildSync({
    entryPoints: [giris],
    bundle: true, format: "cjs", platform: "node", outfile: cikti,
    alias: { vscode: sahteYol }, logLevel: "silent",
  });
  return realpathSync(cikti);
})();

interface Itilen { satir: number; sutun: number; uzunluk: number; tip: number }

/** Sahte yürütücü: yalnız token akışını kaydeder, hesap yapmaz. */
function sahteVscode(): { itilenler: Itilen[]; vscode: unknown } {
  const itilenler: Itilen[] = [];
  const vscode = {
    SemanticTokensLegend: class {
      tipler: string[];
      degistiriciler: string[];
      constructor(tipler: string[], degistiriciler: string[]) { this.tipler = tipler; this.degistiriciler = degistiriciler; }
    },
    SemanticTokensBuilder: class {
      push(satir: number, sutun: number, uzunluk: number, tip: number): void {
        itilenler.push({ satir, sutun, uzunluk, tip });
      }
      build(): { veri: Itilen[] } { return { veri: itilenler }; }
    },
    workspace: { workspaceFolders: [] },
  };
  return { itilenler, vscode };
}

function tokenla(kaynak: string): { itilenler: Itilen[]; tipler: string[] } {
  const { itilenler, vscode } = sahteVscode();
  (globalThis as Record<string, unknown>).__SARMAL_SAHTE_VSCODE__ = vscode;
  delete gerek.cache[PAKETLENMIS];
  const modul = gerek(PAKETLENMIS) as {
    renkSaglayici(): { provideDocumentSemanticTokens(d: unknown): unknown };
    efsane: { tipler: string[] };
  };
  const belge = { uri: { fsPath: join(tmpdir(), "deneme.sar") }, getText: () => kaynak };
  modul.renkSaglayici().provideDocumentSemanticTokens(belge);
  return { itilenler, tipler: modul.efsane.tipler };
}

const KAYNAK = 'Adım( kod: ADM-01, durum: beklemede, ne: "Giriş ekranını kurmak" )\n';

test("dizgi değeri anlamsal token ALIR — niyet metni TextMate'e bırakılmaz", () => {
  const { itilenler, tipler } = tokenla(KAYNAK);
  const dizgiIndeks = tipler.indexOf("sarmalDizgi");
  assert.ok(dizgiIndeks >= 0, "sarmalDizgi efsanede yok — token tipi ilan edilmemiş");

  const dizgiler = itilenler.filter((t) => t.tip === dizgiIndeks);
  assert.equal(dizgiler.length, 1,
    "niyet metni token almadı. Bu kusur bir ay yaşadı: dizgiler yalnız TextMate kapsamıyla "
    + "boyanıyordu ve o kapsamın rengi paketin ilanından boyayıcıya ulaşmaz, dolayısıyla "
    + "doğan her projede niyet metinleri editörün kendi dizgi rengine düşüyordu.");
});

test("dizgi tokeni AÇAN ve KAPAYAN tırnağı da kapsar", () => {
  const { itilenler, tipler } = tokenla(KAYNAK);
  const dizgi = itilenler.find((t) => t.tip === tipler.indexOf("sarmalDizgi"))!;
  assert.equal(dizgi.uzunluk, "Giriş ekranını kurmak".length + 2,
    "token yalnız gövdeyi kapsıyor — tırnaklar dışarıda kalırsa iki uçta renk sıçraması görünür");
});

test("ÇOK SATIRLI dizgi token ALMAZ — anlamsal token satır sınırını aşamaz", () => {
  // Bu bir sınır beyanıdır, eksiklik değil: çok satırlı gövde TextMate kapsamında
  // kalır ve temanın dizgi kuralıyla boyanır.
  const { itilenler, tipler } = tokenla('Adım( kod: ADM-02, ne: """satır bir\nsatır iki""" )\n');
  assert.equal(itilenler.filter((t) => t.tip === tipler.indexOf("sarmalDizgi")).length, 0,
    "çok satırlı dizgiye token verildi — VS Code bir tokeni satır sınırında keser ve ofsetler kayar");
});

test("KOD değeri dizgi tokenine düşmez — iki rol ayrı kalır", () => {
  const { itilenler, tipler } = tokenla(KAYNAK);
  const kodTipleri = tipler.map((t, i) => [t, i] as const).filter(([t]) => t.startsWith("sarmalKod")).map(([, i]) => i);
  const kodlar = itilenler.filter((t) => kodTipleri.includes(t.tip));
  assert.ok(kodlar.length >= 1, "ADM-01 kod tokeni almadı — dizgi dalı kod dalını gölgelemiş olabilir");
});

// ═══════════════════════════════════════════════════════════════════════════
// sinama_vscode/calistir.ts — 🎬 Entegrasyon sürücüsü (GERÇEK VS Code)
//
//   @vscode/test-electron gerçek bir VS Code indirir, eklentiyi GELİŞTİRME
//   modunda yükler, extensionTestsPath'i (mocha köprüsü) koşar. ornek/ korpusu
//   çalışma alanı olarak açılır. Bu, birim testlerin göremediğini görür:
//   eklenti gerçekten AKTİFLEŞİYOR mu, komutlar kayıtlı mı, tanı/hover CANLI mı.
// ═══════════════════════════════════════════════════════════════════════════

import * as fs from "node:fs";
import * as path from "node:path";
import { downloadAndUnzipVSCode, runTests } from "@vscode/test-electron";

/**
 * İndirilen VS Code'un ÇALIŞTIRILABİLİR dosyasını bulur.
 *
 * ÖLÇÜLMÜŞ KUSUR (2026-08-22): `@vscode/test-electron` 3.0.0 sürümü macOS'ta
 * yürütücü adını `Visual Studio Code.app/Contents/MacOS/Electron` olarak SABİT
 * varsayar. VS Code kararlı sürümü bu dosyanın adını `Code` yaptı; sonuç,
 * entegrasyon süitinin hiç açılmadan `spawn ... Electron ENOENT` ile düşmesidir.
 * Kusur bu deponun kodunda değil, sürücü kütüphanesinin varsayımındadır;
 * onarım da bu yüzden dar tutulmuştur: beklenen ad yoksa aynı klasördeki `Code`
 * denenir ve o da yoksa kütüphanenin verdiği yol olduğu gibi bırakılır.
 */
function yurutucuYolu(indirilen: string): string {
  if (fs.existsSync(indirilen)) return indirilen;
  const yeniAd = path.join(path.dirname(indirilen), "Code");
  return fs.existsSync(yeniAd) ? yeniAd : indirilen;
}

async function main(): Promise<void> {
  // dist-sinama/calistir.js konumundan: eklenti kökü = .. · testler = ./suite/index.js
  const eklentiKok = path.resolve(__dirname, "..");
  const testYolu = path.resolve(__dirname, "suite", "index.js");
  // Korpus, eklenti kökünün kökündeki ogreti/ornek dizinidir (git'te izli 43 dosya).
  // Temiz-fail (Sol RED onarımı 2026-07-18): yol yoksa VS Code başlatılmadan
  // anlaşılır Türkçe hatayla çıkılır — sessiz modül-bulunamadı yerine teşhis.
  const ornekKorpus = path.resolve(eklentiKok, "..", "..", "ogreti", "ornek");
  if (!fs.existsSync(ornekKorpus)) {
    throw new Error(`ogreti/ornek/ korpusu bulunamadı: ${ornekKorpus} — depo tam checkout mu? (git ls-files ogreti/ornek | wc -l → 43 beklenir)`);
  }

  await runTests({
    vscodeExecutablePath: yurutucuYolu(await downloadAndUnzipVSCode()),
    extensionDevelopmentPath: eklentiKok,
    extensionTestsPath: testYolu,
    // ornek/ açılır (test .sar'ları elde); --disable-extensions yalnız DİĞERlerini kapatır.
    // KISA user-data-dir ŞART (macOS): derin proje yolu Unix soketini 103 char
    // sınırının üstüne çıkarır → 'listen EINVAL'. /tmp/svt kısa ve güvenli.
    launchArgs: [
      ornekKorpus,
      "--disable-extensions",
      "--user-data-dir=/tmp/svt-ud",
      "--extensions-dir=/tmp/svt-ext",
    ],
  });
}

main().catch((e) => {
  console.error("✖ Entegrasyon testi sürücüsü başarısız:", e);
  process.exit(1);
});

// ═══════════════════════════════════════════════════════════════════════════
// suite/index.ts — Mocha köprüsü (VS Code test host bunu yükler → run())
// ═══════════════════════════════════════════════════════════════════════════

import * as path from "node:path";
import Mocha from "mocha";

export function run(): Promise<void> {
  const mocha = new Mocha({ ui: "bdd", color: true, timeout: 60_000 });
  // Testler ayrı bundle'landı (aktivasyon.test.js) — mocha diskteki dosyayı yükler
  // (globals describe/it mocha.run öncesi kurulur; bu yüzden ayrı dosya, inline değil).
  mocha.addFile(path.resolve(__dirname, "aktivasyon.test.js"));
  mocha.addFile(path.resolve(__dirname, "panel-gorunum.test.js"));
  mocha.addFile(path.resolve(__dirname, "onay-yuzeyi.test.js"));   // VIT-POSTA-A03
  mocha.addFile(path.resolve(__dirname, "gorunum-varsayilani.test.js"));   // EKL-F6-A04 kanıt ölçümü
  mocha.addFile(path.resolve(__dirname, "tek-agac.test.js"));   // 🗺️ PRF-TA-A04 tek ağaç nöbetleri
  mocha.addFile(path.resolve(__dirname, "bolum-yuvasi.test.js"));   // 🧩 VIT-K78-A10 bölüm yuvası (sahte kardeşle)
  mocha.addFile(path.resolve(__dirname, "davranis-nobeti.test.js"));   // 🛡️ BKM-DNT-A09 en büyük üç yüzey dosyası
  mocha.addFile(path.resolve(__dirname, "minigraf-tiklama.test.js"));   // 🖱️ PNL-A05 Mini Graf tıklaması
  mocha.addFile(path.resolve(__dirname, "sekme-gecisi.test.js"));   // ⏱️ PNL-A18 sekme geçişi eklentiyi beklemez

  return new Promise((resolve, reject) => {
    try {
      mocha.run((basarisiz) => {
        if (basarisiz > 0) reject(new Error(`${basarisiz} entegrasyon testi başarısız`));
        else resolve();
      });
    } catch (e) {
      reject(e);
    }
  });
}

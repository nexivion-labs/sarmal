// esbuild-sinama.mjs — Entegrasyon testlerini CJS'e paketler (VS Code test host için).
//   Beş giriş: sürücü (calistir) · mocha köprüsü (suite/index) · üç test dosyası
//   (aktivasyon.test · panel-gorunum.test · onay-yuzeyi.test · gorunum-varsayilani.test).
//   vscode + mocha DIŞ bırakılır (test host'ta node_modules'ten çözülür).
import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: [
    "sinama_vscode/calistir.ts",
    "sinama_vscode/suite/index.ts",
    "sinama_vscode/suite/aktivasyon.test.ts",
    "sinama_vscode/suite/panel-gorunum.test.ts",
    "sinama_vscode/suite/onay-yuzeyi.test.ts",
    "sinama_vscode/suite/gorunum-varsayilani.test.ts",
  ],
  bundle: true,
  format: "cjs",
  platform: "node",
  target: "node18",
  outdir: "dist-sinama",
  outbase: "sinama_vscode",
  external: ["vscode", "mocha", "@vscode/test-electron"],
  sourcemap: true,
  logLevel: "info",
});
console.log("✅ dist-sinama/ paketlendi (calistir · suite/index · suite/aktivasyon.test · suite/panel-gorunum.test · suite/onay-yuzeyi.test · suite/gorunum-varsayilani.test).");

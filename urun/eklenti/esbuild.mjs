// esbuild.mjs — Sarmal eklentisini tek CJS dosyasına paketler.
// Çekirdeği (../cekirdek/src/*.ts) doğrudan bundle'lar; "vscode" dış bırakılır.
import * as esbuild from "esbuild";

const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

const ctx = await esbuild.context({
  entryPoints: ["src/eklenti.ts"],
  bundle: true,
  format: "cjs",
  platform: "node",
  target: "node18",
  outfile: "dist/eklenti.js",
  external: ["vscode"],
  sourcemap: !production,
  minify: production,
  logLevel: "info",
});

if (watch) {
  await ctx.watch();
  console.log("👀 izleniyor…");
} else {
  await ctx.rebuild();
  await ctx.dispose();
  console.log("✅ dist/eklenti.js paketlendi.");
}

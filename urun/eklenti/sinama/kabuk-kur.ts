// ═══════════════════════════════════════════════════════════════════════════
// kabuk-kur.ts — 🧪 "vscode" belirtecini kabuk sahtesine bağlar (BKM-DNT-A09)
//
//   Node'un eşzamanlı modül kancası (`module.registerHooks`) yalnız "vscode"
//   belirtecini `vscode-sahtesi.ts` dosyasına çözer; öteki her çözüm olduğu
//   gibi geçer. Kanca süreç başınadır ve `node --test` her sınama dosyasını
//   ayrı süreçte koştuğu için yalnız bu dosyayı içeri alan sınamayı etkiler.
//
//   KULLANIM SIRASI ZORUNLUDUR: sınama dosyası önce bu modülü durağan olarak
//   içeri alır, eklenti modülünü ise `await import(...)` ile SONRA yükler.
//   Durağan içe aktarmalar kanca kurulmadan çözüldüğü için eklenti modülü
//   durağan olarak alınırsa "vscode" bulunamaz ve süreç düşer.
// ═══════════════════════════════════════════════════════════════════════════

import * as nodeModulu from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Deponun `@types/node` sürümü bu iki işlevi henüz bildirmez (çalışma zamanı
// Node 24 ve sonrasıdır); kullanılan dar imza burada elle yazılır.
type Sonuc = { url?: string; format?: string; source?: string; shortCircuit?: boolean };
type Kancalar = {
  resolve(belirtec: string, baglam: unknown, sonraki: (b: string, c: unknown) => Sonuc): Sonuc;
  load(url: string, baglam: unknown, sonraki: (u: string, c: unknown) => Sonuc): Sonuc;
};
const { registerHooks, stripTypeScriptTypes } = nodeModulu as unknown as {
  registerHooks(k: Kancalar): void;
  stripTypeScriptTypes(kaynak: string, secenek: { mode: "transform"; sourceUrl: string }): string;
};

const SAHTE = new URL("./vscode-sahtesi.ts", import.meta.url).href;
const KAYNAK = new URL("../src/", import.meta.url).href;

registerHooks({
  resolve(belirtec, baglam, sonraki) {
    if (belirtec === "vscode") return { url: SAHTE, shortCircuit: true };
    return sonraki(belirtec, baglam);
  },
  // Eklenti kaynağı esbuild ile paketlenir ve bu yüzden Node'un tip söküm
  // kipinin kabul etmediği iki sözdizimini (kurucu parametre alanı ve enum)
  // serbestçe kullanır. Kaynak dosyası değiştirilmez; yalnız eklenti kaynağı
  // Node'un kendi dönüştürme kipinden geçirilir (dış bağımlılık yok · STR-3.1).
  //   Varsayılan yükleyici söküm kipini biçim tespiti sırasında uyguladığı için
  //   kaynak burada doğrudan diskten okunur ve sonraki halkaya hiç verilmez.
  load(url, baglam, sonraki) {
    if (url.startsWith(KAYNAK) && url.endsWith(".ts")) {
      const metin = readFileSync(fileURLToPath(url), "utf8");
      return {
        format: "module",
        source: stripTypeScriptTypes(metin, { mode: "transform", sourceUrl: url }),
        shortCircuit: true,
      };
    }
    return sonraki(url, baglam);
  },
});

export { kabuk, kabukSifirla, belgeKoy, SahteWebviewGorunusu, Uri } from "./vscode-sahtesi.ts";

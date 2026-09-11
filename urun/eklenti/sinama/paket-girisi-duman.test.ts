// paket-girisi-duman.test.ts — VS Code açmadan gerçek dağıtım girişini yükler.
// Kaynak modülleri değil, package.json içinde ilan edilmiş CJS girişini sınar.
//
//   BU SINAMA NEDEN ARTIK DERLEME YAPMAZ. Bu dosya 2026-08-29 tarihine kadar
//   sınamanın ilk işi olarak `node esbuild.mjs` koşturuyor ve derlenmiş gövdeyi
//   süitin ORTASINDA yeniden yazıyordu. Yan etkinin bedeli kardeş nöbette
//   ölçülmüştür: paket tazeliği nöbeti gövdenin tanı sicili kaynağından eski
//   olmadığını sınar, dolayısıyla bayat bir gövdeyle koşan ilk tur kırmızı
//   yanar, aynı tur buradaki derleme sayesinde gövdeyi tazeler ve ikinci tur
//   yeşile döner; nöbet ölçtüğü kusurun kanıtını kendi eliyle siler ve
//   kararsız görünür. İkinci bir bedel daha vardır: gövde süit koşarken
//   yeniden yazıldığı için aynı gövdeyi metin olarak okuyan kardeş sınamalar
//   yarım yazılmış bir dosya görebilir. Derleme bu yüzden süitin bir adımı
//   değil ÖN KOŞULUDUR ve `npm run build` ile koşulur; gövde yoksa bu sınama
//   sebebini söyleyerek atlar. Atlama deseninin emsali kardeş nöbettir
//   (paket-tazeligi.test.ts).

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PAKET_YOLU = fileURLToPath(new URL("../package.json", import.meta.url));
const EKLENTI_KOKU = dirname(PAKET_YOLU);
const paket = JSON.parse(readFileSync(PAKET_YOLU, "utf8")) as { main: string };
const giris = resolve(EKLENTI_KOKU, paket.main);

/** Gövde bir yapı ürünüdür ve depoda izlenmez; yoksa sınama sebebini söyleyerek atlar. */
const govdeVar = existsSync(giris);

test("barınaksız duman: paketlenmiş giriş yüklenir ve activate fonksiyondur", { skip: govdeVar ? false : "dist/eklenti.js henüz derlenmemiş — önce `npm run build` koşulur" }, () => {
  const yukleyici = String.raw`
    const assert = require("node:assert/strict");
    const Module = require("node:module");
    const { readFileSync } = require("node:fs");
    const asilYukle = Module._load;
    // esbuild, "import * as vscode" erişimlerini __toESM/__copyProps ile SAHİP
    // anahtarlar üzerinden kopyalar; salt get trap'li bir Proxy'nin anahtarları
    // kopyaya girmez ve "X is not a constructor" doğar. Bu yüzden pakette geçen
    // bütün adalani.X adları dist metninden dinamik çıkarılır ve Proxy ownKeys
    // ile getOwnPropertyDescriptor trap'leri o kümeyi ilan eder — mock kendini
    // paketin gerçek API yüzeyine göre günceller, elle liste bayatlayamaz.
    //
    // BKM-DNT-A12 · KÜÇÜLTMEYE DAYANIKLI ÇIKARIM. Desen eskiden vscodeN.X
    // sabit adını arıyordu; küçültme ad alanını yeniden adlandırdığı için
    // (ölçüm 2026-09-10: üretim gövdesinde ad alanı G değişkenine bağlanıyor) desen
    // hiçbir ada denk gelmiyor, mock boş anahtar kümesiyle doğuyor ve paketleme
    // sonrası ilk koşum "SemanticTokensLegend is not a constructor" ile
    // düşüyordu. Ad alanı değişkeninin ADI artık gövdeden ÇIKARILIR: hangi
    // değişkene vscode modülü bağlanmışsa onun üye erişimleri toplanır.
    const distMetni = readFileSync(${JSON.stringify(giris)}, "utf8");
    const adlar = new Set(["default"]);
    // Ad alanı değişkeninin adı gövdeden çıkarılır; küçültme onu yeniden
    // adlandırdığında bile üye erişimleri bulunur. Dinamik düzenli ifade
    // KURULMAZ: kaçış kuralları bu betiğin içinde iki kez yorumlanır ve kırılgandır.
    const adAlanlari = new Set(["vscode"]);
    for (const es of distMetni.matchAll(/([A-Za-z_]\w*)\s*=\s*(?:[A-Za-z_]\w*\()?\s*require\("vscode"\)/g)) {
      adAlanlari.add(es[1]);
    }
    // Üye erişimlerini metni tarayarak topla (indexOf ile — kaçışsız ve kesin).
    for (const ad of adAlanlari) {
      let p = distMetni.indexOf(ad + ".");
      while (p >= 0) {
        const oncesi = p === 0 ? "" : distMetni[p - 1];
        if (!/[A-Za-z0-9_$]/.test(oncesi)) {
          const kalan = distMetni.slice(p + ad.length + 1);
          const es = /^([A-Za-z_][A-Za-z0-9_]*)/.exec(kalan);
          if (es) adlar.add(es[1]);
        }
        p = distMetni.indexOf(ad + ".", p + 1);
      }
    }
    const sahteVscode = new Proxy(function () {}, {
      get(_hedef, anahtar) {
        if (anahtar === "then") return undefined;
        if (anahtar === Symbol.toPrimitive) return () => "";
        return sahteVscode;
      },
      ownKeys(hedef) { return [...new Set([...Reflect.ownKeys(hedef), ...adlar])]; },
      getOwnPropertyDescriptor(hedef, anahtar) {
        const gercek = Reflect.getOwnPropertyDescriptor(hedef, anahtar);
        if (gercek) return gercek;
        return { value: sahteVscode, writable: true, configurable: true, enumerable: true };
      },
      apply() { return sahteVscode; },
      construct() { return sahteVscode; },
    });
    Module._load = function (kimlik, ust, anaMi) {
      if (kimlik === "vscode") return sahteVscode;
      return asilYukle.call(this, kimlik, ust, anaMi);
    };
    const eklenti = require(${JSON.stringify(giris)});
    assert.equal(typeof eklenti.activate, "function");
  `;

  const cikti = execFileSync(process.execPath, ["-e", yukleyici], {
    cwd: EKLENTI_KOKU,
    encoding: "utf8",
    stdio: "pipe",
  });
  assert.equal(cikti, "", "paket girişini yükleyen alt süreç beklenmeyen çıktı üretti");
});

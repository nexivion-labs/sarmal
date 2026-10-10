// onizleme-palet.test.ts — 🎨 Önizlemenin paleti tek kaynaktan gelir (BKM-DNT-A07).
//
//   Ölçülmüş kusur: önizleme dosyası ağaç ve aile renklerini "kanon yokken devreye
//   girer" notuyla elle yazılmış iki haritada taşıyordu. Harita kanondan sapmıştı
//   (öz ailesinin rengi yedekte başka, kanonda başkaydı) ve dal ulaşılmazdı, çünkü
//   sınıflama çözücüsü kanon bulamadığında zaten gömülü kanona düşer ve gömülü
//   kanon paleti taşır. Sapmış ve ölü bir kopya YUZ-1.2'nin yasakladığı elle
//   ikizdir. Bu nöbet iki şeyi ölçer: önizleme kaynağında kanondan bağımsız hiçbir
//   renk değeri kalmadığını ve tek yedeğin gömülü kanon olduğunu; gömülü kanonun
//   da bu yedeği taşıyacak kadar tam olduğunu.
//
//   SINIRIN KALKMASI (EKL-F6-A05 · 2026-09-16): bu nöbet eskiden yalnız kaynağın
//   `TEMEL_STIL` öncesindeki MANTIK bölgesini ölçüyordu ve stil bloğundaki
//   renkleri bilinçle dışarıda bırakıyordu. Masa düzeniyle birlikte stil bloğu bu
//   dosyadan çıkıp saf çekirdeğe ve `medya/onizleme.css` dosyasına indi; kabukta
//   artık bir renk bölgesi YOKTUR ve ölçüm dosyanın TAMAMINA uygulanır. Stil ile
//   üretilen sayfanın renk ölçümü kendi nöbetindedir: sinama/onizleme-masa.test.ts.
//
//   Önizleme modülü VS Code kabuğunu içeri aldığı için bu birim süitinde
//   yüklenemez; ölçüm panellerin kendi kaynağı üstünden yapılır (Onaylar
//   panelinin nöbetiyle aynı yöntem).

import "./dil-kur.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { GOMULU_KAYIT } from "../src/gomulu-kanon.ts";

const oku = (u: string): string => readFileSync(fileURLToPath(new URL(u, import.meta.url)), "utf8");
const KAYNAK = oku("../src/onizleme.ts");

test("BKM-DNT-A07: önizleme kabuğunun TAMAMINDA kanondan bağımsız renk değeri yoktur", () => {
  const renkler = KAYNAK.match(/#[0-9a-fA-F]{6}\b/g) ?? [];
  assert.deepEqual(renkler, [],
    `önizleme kaynağı elle yazılmış renk taşıyor: ${renkler.join(", ")} — palet yalnız kanondan gelir (YUZ-1.2)`);
  assert.ok(!/const\s+\w*RENK\w*\s*:\s*Record<string,\s*string>/.test(KAYNAK),
    "önizleme kaynağı elle yazılmış bir renk haritası tanımlıyor — kaldırılan yedek geri gelmiş");
});

test("BKM-DNT-A07: tek yedek gömülü kanondur ve gömülü kanon o yedeği taşıyacak kadar tamdır", () => {
  assert.ok(/snfBul\(doc\)\s*\?\?\s*GOMULU_SNF/.test(KAYNAK),
    "çözücü tanımsız döndüğünde önizleme gömülü kanona düşmüyor — yedek yolu kopuk");
  const kayit = GOMULU_KAYIT as unknown as {
    widgetTipleri?: Array<{ ad: string; aile: string }>;
    renkPaleti?: { agacRenkleri?: Record<string, string>; aileler?: Record<string, string> };
  };
  const agac = kayit.renkPaleti?.agacRenkleri ?? {};
  const aileler = kayit.renkPaleti?.aileler ?? {};
  for (const tip of ["ÇalışmaAlanı", "Proje", "Faz", "Blok", "Katman", "AltKatman", "Adım"]) {
    assert.match(agac[tip] ?? "", /^#[0-9a-fA-F]{6}$/, `gömülü kanonun ağaç paleti '${tip}' rengini taşımıyor — yedek eksik kalır`);
  }
  const tipler = kayit.widgetTipleri ?? [];
  assert.ok(tipler.length > 0, "gömülü kanon widget tiplerini taşımıyor");
  const eksik = [...new Set(tipler.map((t) => t.aile))].filter((a) => !/^#[0-9a-fA-F]{6}$/.test(aileler[a] ?? ""));
  assert.deepEqual(eksik, [], `gömülü kanonun aile paleti şu aileleri boyamıyor: ${eksik.join(", ")}`);
});

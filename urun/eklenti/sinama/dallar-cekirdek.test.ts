// ═══════════════════════════════════════════════════════════════════════════
// dallar-cekirdek.test.ts — 🌳 Ağaç çizgileri yapıyı gösterir (KPS-SIR-A02)
//
//   Ölçülmüş kusur (2026-09-29): bağlaç sütunu düğümün yazıldığı sütundan
//   hesaplanıyordu (`bs = sütun − GENISLIK`); girintisi bozuk bir dosyada Katman,
//   AltKatman ve Adım aynı sütunda yazılınca ağaç onları kardeş gibi çiziyordu.
//   Sütun artık yapı derinliğinden gelir. Nöbet iki şeyi birlikte ölçer:
//   ① bozuk girintide her kademe kendi sütununda çizilir ve aynı dosya
//      girinti-yapı-uyumsuz ölçütünde konuşur;
//   ② doğru girintili dosyada düğüm ızgarası, girintiden hesaplanan eski ızgarayla
//      birebir aynıdır (davranış yalnız bozuk dosyada değişir);
//   ③ raf haritasının çiftleri Kitaplığın gövde çocuklarıyla aynı kademededir.
//
//   MUTASYON KANITI (2026-09-29 · `cp` yedeğiyle geri alındı, `cmp` ile doğrulandı):
//     M1 bağlaç sütunu yeniden girintiden hesaplanır → ① kırmızı
//     M2 raf haritası çiftleri ebeveynle aynı derinliğe konur → ③ kırmızı
//     M3 çarpan dal sıkıştırılmaz, metin temizliğinde silinir → ④ kırmızı
//     M4 dal ucu uzatma çizgisi çizilmez                     → ⑤ kırmızı
// ═══════════════════════════════════════════════════════════════════════════

import { test } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { belirtecle } from "../../cekirdek/src/belirtec.ts";
import { ayristir } from "../../cekirdek/src/ayristirici.ts";
import { girintiYapiFarklari } from "../../cekirdek/src/bicimle.ts";
import { dalIzgarasi, satirDizesi, GENISLIK, ORTA, SON, NBSP, type Izgara } from "../src/dallar-cekirdek.ts";

/** Izgaranın dal glifleri (├/└) satır → sütun olarak; dikey │ çizgileri ayrı ölçülmez. */
function dallar(g: Izgara): Record<number, number[]> {
  const out: Record<number, number[]> = {};
  for (const [satir, sr] of [...g].sort((a, b) => a[0] - b[0])) {
    const s = [...sr].filter(([, glif]) => glif !== "│").map(([sutun]) => sutun).sort((a, b) => a - b);
    if (s.length) out[satir] = s;
  }
  return out;
}

const BOZUK = [
  "Faz( kod: FAZ-A, ad: \"f\" ) {",
  "  Blok( kod: BLK-A, ne: \"g\" ) {",
  "  Katman( kod: KAT-A, ad: \"k\" ) {",
  "  AltKatman( kod: ALT-A, ad: \"m\" ) {",
  "  Adım( kod: ADM-A-1, durum: beklemede )",
  "  Adım( kod: ADM-A-2, durum: beklemede )",
  "  }",
  "  }",
  "  }",
  "}",
].join("\n");

test("① girintisi bozuk dosyada Katman, AltKatman ve Adım kardeş değil, kendi kademelerinde çizilir", () => {
  const d = dallar(dalIzgarasi(ayristir(belirtecle(BOZUK))));
  assert.deepEqual(d, { 1: [0], 2: [GENISLIK], 3: [2 * GENISLIK], 4: [3 * GENISLIK], 5: [3 * GENISLIK] });
  // Aynı dosya çekirdeğin girinti-yapı-uyumsuz ölçütünde de konuşur (ilk fark Katman satırı).
  assert.equal(girintiYapiFarklari(BOZUK)[0]?.satir, 3);
});

test("② doğru girintili dosyada düğüm dallarının ızgarası girintiden hesaplanan ızgarayla birebir aynıdır", () => {
  const kaynak = [
    "Proje( kod: PRJ-A, ad: \"a\" ) {",
    "  Faz( kod: FAZ-A, ad: \"f\" ) {",
    "    Blok( kod: BLK-A, ne: \"g\" ) {",
    "      Katman( kod: KAT-A, ad: \"k\" ) {",
    "        AltKatman( kod: ALT-A, ad: \"m\" ) {",
    "          Adım( kod: ADM-A-1, durum: beklemede )",
    "          Adım( kod: ADM-A-2, durum: beklemede )",
    "        }",
    "      }",
    "    }",
    "  }",
    "}",
  ].join("\n");
  const g = dalIzgarasi(ayristir(belirtecle(kaynak)));
  // Girintiden okunan eski sütun: satırın ilk yazı sütunu − GENISLIK.
  const beklenen: Record<number, number[]> = {};
  for (const satir of [1, 2, 3, 4, 5, 6]) {
    const metin = kaynak.split("\n")[satir];
    beklenen[satir] = [metin.length - metin.trimStart().length - GENISLIK];
  }
  assert.deepEqual(dallar(g), beklenen);
});

test("③ raf haritasının çiftleri Kitaplığın gövde çocuklarıyla aynı kademede çizilir", () => {
  const kaynak = [
    "Proje( kod: PRJ-A, ad: \"a\" ) {",
    "  Kitaplık( kod: KTP-IS, yol: \"is/\",",
    "    raflar: {",
    "      PLAN: \"plan/\",",
    "      DURUM: \"durum/\"",
    "    } ) {",
    "    Raf( kod: RAF-X, yol: \"x/\" )",
    "  }",
    "}",
  ].join("\n");
  const d = dallar(dalIzgarasi(ayristir(belirtecle(kaynak))));
  assert.deepEqual(d, { 1: [0], 3: [GENISLIK], 4: [GENISLIK], 6: [GENISLIK] });
});

/** Editör yolunun ikizi: dallar.ts her satır için ilk yazı sütununu ve satır sonunu
 *  belgeden okuyup satirDizesi'ne verir; burada aynı iki sayı kaynak metinden okunur. */
function cizim(kaynak: string): Map<number, string> {
  const satirlar = kaynak.split("\n");
  const out = new Map<number, string>();
  for (const [satir, sr] of dalIzgarasi(ayristir(belirtecle(kaynak)))) {
    const metin = satirlar[satir] ?? "";
    const ilk = metin.trim() === "" ? metin.length : metin.length - metin.trimStart().length;
    const s = satirDizesi(sr, ilk, metin.length);
    if (s) out.set(satir, NBSP.repeat(s.capa) + s.dize);
  }
  return out;
}

test("④ editör çizimi: az girintili Katman, AltKatman ve Adım dalsız kalmaz; dal metnin önündeki son sütuna sıkışır", () => {
  // Editör yolu bu çekirdeği belgenin kendi iki sayısıyla çağırır; ikinci bir döngü yazılmaz.
  const kaynak = readFileSync(fileURLToPath(new URL("../src/dallar.ts", import.meta.url)), "utf8");
  assert.match(kaynak, /satirDizesi\(sr, info\.firstNonWhitespaceCharacterIndex, info\.range\.end\.character\)/u);
  assert.doesNotMatch(kaynak, /chars\[c\] = NBSP/u);
  const c = cizim(BOZUK);
  for (const satir of [2, 3, 4, 5]) {
    const dize = c.get(satir) ?? "";
    const metin = BOZUK.split("\n")[satir];
    const ilk = metin.length - metin.trimStart().length;
    assert.ok([ORTA, SON].includes(dize[ilk - 1]), `satır ${satir + 1} dalsız kaldı: ${JSON.stringify(dize)}`);
    assert.ok(dize.slice(ilk).split("").every((ch) => ch === NBSP), `satır ${satir + 1} metnin üstüne glif basıyor`);
  }
});

test("⑤ editör çizimi: metin sıfırıncı sütundan başlarsa dal bilinçli olarak çizilmez; doğru girintide dal ucu uzar", () => {
  const sifir = "Faz( kod: FAZ-S, ad: \"f\" ) {\nBlok( kod: BLK-S, ne: \"g\" ) {\n}\n}";
  assert.equal(cizim(sifir).get(1), undefined);
  const dogru = "Faz( kod: FAZ-D, ad: \"f\" ) {\n  Blok( kod: BLK-D, ne: \"g\" ) {\n  }\n}";
  assert.equal(cizim(dogru).get(1), `${SON}─`);
});

test("A06 blokAraliklari ve aktifBlok: imleç en içteki plan bloğunu bulur", async () => {
  const { blokAraliklari, aktifBlok } = await import("../src/dallar-cekirdek.ts");
  const satirlar = [
    "Faz( kod: F1 ) {",         // 0
    "  Blok( kod: B1 ) {",      // 1
    "    Adım( kod: A1 ) {",    // 2
    "      ne: \"x\"",          // 3
    "    }",                    // 4
    "    Raf( kod: R ) {",      // 5
    "    }",                    // 6
    "  }",                      // 7
    "}",                        // 8
  ];
  const b = blokAraliklari(satirlar);
  assert.equal(aktifBlok(b, 3)?.ad, "Adım", "imleç Adım gövdesinde: en içteki blok Adım olmalı");
  assert.equal(aktifBlok(b, 5)?.ad, "Blok", "Raf plan bloğu değildir: üstteki Blok seçilmeli");
  assert.equal(aktifBlok(b, 8)?.ad, "Faz", "kapanış satırı bloğa dâhildir");
  assert.equal(aktifBlok(b, 99), undefined);
});

// graf.test.ts — 🕸️ Kanonik graf yüzü: determinist JSON + alt-graf + kopuk dürüstlüğü (VIT-GRAF-A01)
//   Fikstür .sar → dagKur → grafCikar/grafYuz. Graf = derleyici çıktısı; iki koşu = aynı bayt.

import { test } from "node:test";
import assert from "node:assert/strict";
import { belirtecle } from "../src/belirtec.ts";
import { ayristir } from "../src/ayristirici.ts";
import type { Program } from "../src/sozdizim.ts";
import { dagKur } from "../src/dag.ts";
import { grafCikar, grafYuz } from "../src/graf.ts";

function progla(kaynak: string): Map<string, Program> {
  return new Map([["t.sar", ayristir(belirtecle(kaynak))]]);
}
const sar = (govde: string) =>
  `Blok( kod: BLK, ne: "x" ) { Katman( kod: FZ, ad: "f" ) { AltKatman( kod: KT, ad: "k" ) {\n${govde}\n} } }`;

const FIKSTUR = sar(`
    Adım( kod: A1, durum: tamamlandı, ne: "bir" )
    Adım( kod: A2, durum: geliştirmede, bağımlı: A1, ne: "iki" )
    Adım( kod: A3, durum: beklemede, bağımlı: [ A1, A2 ], ne: "üç" )`);

test("graf yüzü: düğümler kod-sıralı, içerme (kapsayan) + bağımlılık kenarları birlikte", () => {
  const g = grafCikar(dagKur(progla(FIKSTUR)))!;
  assert.deepEqual(g.düğümler.map((d) => d.kod), ["A1", "A2", "A3", "BLK", "FZ", "KT"]);
  const a2 = g.düğümler.find((d) => d.kod === "A2")!;
  assert.equal(a2.kapsayan, "KT");                          // içerme kenarı türetilmiş
  assert.deepEqual(a2.öncekiler, ["A1"]);                   // yazılı bağımlılık
  assert.deepEqual(a2.sonrakiler, ["A3"]);                  // ters-türetilmiş ardıl
  assert.equal(g.düğümler.find((d) => d.kod === "FZ")!.kapsayan, "BLK");
  assert.equal(g.düğümler.find((d) => d.kod === "BLK")!.kapsayan, undefined);
  assert.equal(g.özet.adim, 3);
  assert.deepEqual(g.özet.durumlar, { "tamamlandı": 1, "geliştirmede": 1, "beklemede": 1 });
});

test("determinizm: aynı kaynak iki koşuda AYNI baytları verir (kanonik çıktı)", () => {
  const bir = grafYuz(dagKur(progla(FIKSTUR)));
  const iki = grafYuz(dagKur(progla(FIKSTUR)));
  assert.equal(bir, iki);
  assert.ok(bir!.endsWith("\n"));
  assert.deepEqual(Object.keys(JSON.parse(bir!)), ["düğümler", "kopuk", "özet"]);
});

test("--kok alt-graf: kapsananlar + atalar + ileri kapanış girer, alakasız düğüm girmez", () => {
  const kaynak = `Blok( kod: BLK, ne: "x" ) {
    Katman( kod: FZ1, ad: "bir" ) { AltKatman( kod: KT1, ad: "k" ) {
      Adım( kod: A1, durum: tamamlandı, ne: "bir" )
    } }
    Katman( kod: FZ2, ad: "iki" ) { AltKatman( kod: KT2, ad: "k" ) {
      Adım( kod: B1, durum: beklemede, bağımlı: A1, ne: "tüketici" )
      Adım( kod: C1, durum: beklemede, ne: "alakasız" )
    } }
  }`;
  const g = grafCikar(dagKur(progla(kaynak)), "FZ1")!;
  const kodlar = g.düğümler.map((d) => d.kod);
  assert.equal(g.kök, "FZ1");
  assert.ok(kodlar.includes("A1") && kodlar.includes("KT1"), kodlar.join(","));  // kapsananlar
  assert.ok(kodlar.includes("BLK"), "ata (bağlam) girmeli");
  assert.ok(kodlar.includes("B1"), "ileri kapanış (A1'i bekleyen) girmeli");
  assert.ok(!kodlar.includes("C1"), "alakasız düğüm GİRMEMELİ");
  assert.equal(g.özet.adim, 2);                             // özet alt-graf üzerinden
});

test("bilinmeyen kök: undefined döner (dürüst hata — sessiz boş graf yok)", () => {
  assert.equal(grafCikar(dagKur(progla(FIKSTUR)), "YOK-BOYLE-KOD"), undefined);
});

test("kopuk kenar dürüstlüğü: çözülmeyen uç çıktıda görünür — graf 'tam' gibi davranmaz", () => {
  const g = grafCikar(dagKur(progla(sar(`
    Adım( kod: A1, bağımlı: HAYALET, ne: "kopuk kenarlı" )`))))!;
  assert.equal(g.kopuk.length, 1);
  assert.equal(g.kopuk[0].kaynak, "A1");
  assert.equal(g.kopuk[0].hedef, "HAYALET");
  assert.equal(g.kopuk[0].kenar, "bağımlı");
});

// ── VIT-GRAF-A12: mevsim aidiyeti kanonik JSON yüzünde ───────────────────────
test("VIT-GRAF-A12 graf: Blok'un mevsim aidiyeti çıktıda görünür; mevsimsiz düğüm alanı hiç taşımaz", () => {
  const src = `Faz( kod: FAZ-M, ad: "mevsim" ) {
    çağır BLK-M
  }
  Blok( kod: BLK-M, ne: "gövde" ) { Katman( kod: KAT-M, ad: "k" ) { Adım( kod: ADM-M, durum: beklemede, ne: "iş" ) } }`;
  const g = grafCikar(dagKur(progla(src)))!;
  assert.equal(g.düğümler.find((d) => d.kod === "BLK-M")!.mevsim, "FAZ-M",
    "IDE ile MCP'nin okuduğu kanonik yüz mevsim kenarını taşımalı");
  assert.ok(!("mevsim" in g.düğümler.find((d) => d.kod === "ADM-M")!),
    "mevsimsiz düğüme alan sızmamalı — determinist çıktı şişmez");
});

// ── HTR-A02 (IDA dogfood oturum-2 · BUG-2): hatırlat yumuşak-kenar graf'ta ───
test("HTR-A02 graf: hatırlat eden HTR alt-grafta görünür + gelen/giden yumuşak-kenar serilir", () => {
  const src = `
Katman( kod: KAT-G ){
  Adım( kod: ADM-G1, ne: "hedef" )
}
Hatırlatıcı( kod: HTR-G, durum: kararlaştı, çapa: mimari, hatırlat: ADM-G1, ne: "not" )
`;
  const g = grafCikar(dagKur(progla(src)), "ADM-G1")!;
  const kodlar = g.düğümler.map((d) => d.kod);
  assert.ok(kodlar.includes("HTR-G"), "HTR-G alt-grafa dahil olmalı (yumuşak-kenar komşu); gelen: " + JSON.stringify(kodlar));
  const hedef = g.düğümler.find((d) => d.kod === "ADM-G1")!;
  assert.deepEqual(hedef.hatırlatanlar, ["HTR-G"], "hedefte gelen yumuşak-kenar");
  const htr = g.düğümler.find((d) => d.kod === "HTR-G")!;
  assert.deepEqual(htr.hatırlatıyor, ["ADM-G1"], "kaynakta giden yumuşak-kenar");
  // topolojik alanlar hatırlat'tan etkilenmez
  assert.deepEqual(hedef.öncekiler, []);
  assert.deepEqual(hedef.sonrakiler, []);
});

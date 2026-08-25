// orkestra.test.ts — ⚡ HALKA-ORK-A02: paralel yürütücü güvenceleri.
//   Eşzamanlılık ÖLÇÜLÜR (lig: "eşzamanlı" ölçüsüz kalamaz): bağımsız Adımların
//   koşu pencereleri örtüşür; bağımlı Adım öncülü bitmeden BAŞLAMAZ; çöken Adım
//   kardeşlerini düşürmez; limit aşılamaz.
import { test } from "node:test";
import assert from "node:assert/strict";
import { belirtecle } from "../src/belirtec.ts";
import { ayristir } from "../src/ayristirici.ts";
import type { Program } from "../src/sozdizim.ts";
import { dagKur } from "../src/dag.ts";
import { paralelYurut, paralelKumeler } from "../src/orkestra.ts";

function progla(kaynak: string): Map<string, Program> {
  return new Map([["t.sar", ayristir(belirtecle(kaynak))]]);
}
const sar = (govde: string) => `Blok( kod: BLK-P, ne: "p" ) { Katman( kod: FZ-P, ad: "f" ) { AltKatman( kod: KT-P, ad: "k" ) {
${govde}
} } }`;

const DAG = () => dagKur(progla(sar(`
    Adım( kod: ADM-P1, durum: beklemede, bağımlı: [], ne: "bağımsız 1" )
    Adım( kod: ADM-P2, durum: beklemede, bağımlı: [], ne: "bağımsız 2" )
    Adım( kod: ADM-P3, durum: beklemede, bağımlı: [ ADM-P1, ADM-P2 ], ne: "ikisini bekler" )`)));

const beklet = (ms: number) => new Promise((r) => setTimeout(r, ms));

test("paralelKumeler: bağımsızlar aynı seviyede, bağımlı sonraki seviyede", () => {
  const k = paralelKumeler(DAG(), ["ADM-P1", "ADM-P2", "ADM-P3"]);
  assert.equal(k.length, 2);
  assert.deepEqual([...k[0]].sort(), ["ADM-P1", "ADM-P2"]);
  assert.deepEqual(k[1], ["ADM-P3"]);
});

test("eşzamanlılık KANITI: bağımsız pencereler örtüşür; bağımlı öncüller bitmeden başlamaz", async () => {
  const kayitlar = await paralelYurut(DAG(), ["ADM-P1", "ADM-P2", "ADM-P3"], async (kod) => {
    await beklet(30);
    return kod;
  });
  const bul = (kod: string) => kayitlar.find((k) => k.adımKod === kod)!;
  const p1 = bul("ADM-P1"), p2 = bul("ADM-P2"), p3 = bul("ADM-P3");
  assert.ok(p1.baslangic < p2.bitis && p2.baslangic < p1.bitis,
    `bağımsız pencereler örtüşmeli: P1[${p1.baslangic},${p1.bitis}] P2[${p2.baslangic},${p2.bitis}]`);
  assert.ok(p3.baslangic >= Math.max(p1.bitis, p2.bitis) - 1, "DAG saygısı: P3 öncülleri bitmeden başlamaz");
});

test("allSettled ruhu: çöken Adım kardeşini DÜŞÜRMEZ; hata kayda geçer, sonraki seviye yine koşar", async () => {
  const kayitlar = await paralelYurut(DAG(), ["ADM-P1", "ADM-P2", "ADM-P3"], async (kod) => {
    if (kod === "ADM-P1") throw new Error("kasıtlı çöküş");
    await beklet(5);
    return kod;
  });
  assert.equal(kayitlar.length, 3, "üçü de kayıtlı (hiçbiri yutulmadı)");
  assert.match(kayitlar.find((k) => k.adımKod === "ADM-P1")!.hata ?? "", /kasıtlı/);
  assert.equal(kayitlar.find((k) => k.adımKod === "ADM-P2")!.sonuç, "ADM-P2", "kardeş tamamlandı");
  assert.equal(kayitlar.find((k) => k.adımKod === "ADM-P3")!.sonuç, "ADM-P3", "sonraki seviye koştu (karar ŞEF'in)");
});

test("eşzamanlılık limiti: cap=1 → koşular SERİLEŞİR (pencere örtüşmez)", async () => {
  const kayitlar = await paralelYurut(DAG(), ["ADM-P1", "ADM-P2"], async () => { await beklet(15); return 1; },
    { esZamanLimit: 1 });
  const [a, b] = [...kayitlar].sort((x, y) => x.baslangic - y.baslangic);
  assert.ok(b.baslangic >= a.bitis - 1, "cap=1: ikinci koşu birincisi bitmeden başlamamalı");
});

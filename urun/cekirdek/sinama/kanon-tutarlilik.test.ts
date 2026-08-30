import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { kanonMaddeleriniOlc, kanonTutarlilikMetni } from "../src/kanon-tutarlilik.ts";
import { siniflamaOrtuMerge, siniflamaOrtuYukle, siniflamaYukle } from "../src/siniflama.ts";
import {
  EMEKLI_TANI_KODLARI,
  EMEKLILIK_BORCU_TANI_KODLARI,
  ONCEKI_TANI_KODLARI,
  taniSicili,
  YENI_TANI_KANONU,
} from "../src/tani-sicili.ts";

const KOK = fileURLToPath(new URL("../../..", import.meta.url));
const KANON_SHA = [
  "dil.sar:3454c635035b35eb70ffdd4128e46be22702073e7f67025edea53f8b1a4ad3e7",
  "mim.sar:42665be3f4a29abff60e3f1002ee8f80193053d42fb64a4043fe6836041525fe",
  "ogr.sar:d6e132fbb7b28e36ebadab1ea8f8bfe4ed7f727a817321e3b727a5d2254f2f46",
  "ork.sar:b938725bcbf4cab2dcf2b21077cb3109878be4016b35af539084c37df8303fe7",
  "str.sar:a8ebcdb80326bfc5d2cc57ec34f2658ee3e159e8ef2f10db7e4fb37099d1582d",
  "tip.sar:0c726015dc4d63a6757b9b4a8c8a9afba04f96477d224affd0f7cea290a6e068",
  "yas.sar:159b5bcb9c762586be345d7cecd4bcc6c7606a99cd1cca7aced28e70173a9b49",
  "yuz.sar:d6caf9cefad8c24a04aa1eb0972b7eb14a47bb5cbfc12ca451b6bff68c20d96c",
] as const;

test("resmi sekizli 151/151 maddeyi, örneği ve dört parçayı sabit SHA'larla taşır", () => {
  const olcum = kanonMaddeleriniOlc(KOK);
  assert.equal(olcum.maddeler.length, 151);
  assert.equal(new Set(olcum.maddeler.map((m) => m.kod)).size, 151);
  assert.deepEqual(
    { karar: olcum.maddeler.filter((m) => m.rol === "Karar").length, kural: olcum.maddeler.filter((m) => m.rol === "Kural").length },
    { karar: 37, kural: 114 },
  );
  assert.equal(olcum.maddeler.filter((m) => m.ornek === "—").length, 0);
  assert.equal(olcum.maddeler.filter((m) => !m.dortParcaTam).length, 0);
  assert.deepEqual(olcum.muhurler, KANON_SHA);
});

test("70 taban + üç gözlem kümesi 47/16/11 olarak 74'tür", () => {
  assert.equal(YENI_TANI_KANONU.length, 74);
  assert.equal(YENI_TANI_KANONU.filter((t) => t.kademe === "hata").length, 47);
  assert.equal(YENI_TANI_KANONU.filter((t) => t.kademe === "uyarı").length, 16);
  assert.equal(YENI_TANI_KANONU.filter((t) => t.kademe === "bilgi").length, 11);
  // ORK-8 mevsim ritüelinin ilk motor karşılığı (Founder ölçümü 2026-08-27).
  assert.equal(YENI_TANI_KANONU.filter((t) => t.madde === "ORK-8" && t.kod === "mevsim-vadesi-geçti").length, 1);
  assert.equal(YENI_TANI_KANONU.filter((t) => t.madde === "YUZ-3.3" && t.kod === "tanı-yüzeyi-karışması").length, 1);
  // MIM-1.7 AltKatman tekilliği — Founder hükmü 2026-08-28; kök sebep bir hüküm
  // boşluğuydu ve madde o boşluğu kapattı, bekçi de onu hata düzeyinde zorlar.
  assert.equal(YENI_TANI_KANONU.filter((t) => t.madde === "MIM-1.7" && t.kod === "altkatman-tekilliği-ihlali").length, 1);
  assert.equal(ONCEKI_TANI_KODLARI.length, 101);
});

test("uygulanmış emekli ve canlı emeklilik borcu tam sicile karşı ayrıdır", () => {
  const snf = siniflamaOrtuMerge(
    siniflamaYukle(join(KOK, "oz/siniflama/kayit.json")),
    siniflamaOrtuYukle(KOK),
  );
  const canli = taniSicili(snf);
  assert.equal(canli.size, 184);
  assert.equal(EMEKLI_TANI_KODLARI.length, 15);
  assert.equal(EMEKLI_TANI_KODLARI.filter((kod) => canli.has(kod)).length, 0);
  assert.equal(EMEKLILIK_BORCU_TANI_KODLARI.length, 38);
  assert.equal(EMEKLILIK_BORCU_TANI_KODLARI.filter((kod) => canli.has(kod)).length, 38);
});

test("A03 türevi idempotenttir ve geneldurum'u hüküm kaynağı olarak okumaz", () => {
  const ilk = kanonTutarlilikMetni(KOK);
  const ikinci = kanonTutarlilikMetni(KOK);
  const uretici = readFileSync(join(KOK, "urun/cekirdek/src/kanon-tutarlilik.ts"), "utf8");
  assert.equal(ikinci, ilk);
  assert.match(ilk, /Resmi sonuç 151\/151 maddedir/);
  assert.match(ilk, /69 yeni tanı tabanı YUZ-3\.3 tanısıyla, iki gözlemle, ORK-8 mevsim vadesiyle ve MIM-1\.7 AltKatman tekilliğiyle 74/);
  assert.doesNotMatch(ilk, /144 madde|144\/144/);
  assert.doesNotMatch(uretici, /readFileSync\([^\n]*geneldurum|readdirSync\([^\n]*geneldurum/);
});

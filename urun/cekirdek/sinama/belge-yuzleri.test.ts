import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import {
  BELGE_YUZU_HEDEFLERI,
  belgeBolgesiUygula,
  kanonOlc,
  type BelgeAmaci,
  type BelgeYuzuHedefi,
} from "../src/belge-yuzleri.ts";
import { siniflamaOrtuMerge, siniflamaOrtuYukle, siniflamaYukle } from "../src/siniflama.ts";

const KOK = fileURLToPath(new URL("../../..", import.meta.url));

test("belge yüzü envanteri Diátaxis sınıflarını tekil ve ölçülebilir taşır", () => {
  const beklenen: Record<BelgeAmaci, number> = {
    README: 3,
    indeks: 2,
    Reference: 1,
    Tutorial: 2,
    "How-To": 6,
    Explanation: 2,
  };
  const sayim = Object.fromEntries(Object.keys(beklenen).map((amac) => [amac, 0])) as Record<BelgeAmaci, number>;
  const envanter = readFileSync(join(KOK, "is/nitelik/goc/belge_etki_envanteri.sar"), "utf8");
  for (const hedef of BELGE_YUZU_HEDEFLERI) {
    sayim[hedef.amac]++;
    const icerik = readFileSync(join(KOK, hedef.yol), "utf8");
    assert.equal(icerik.match(new RegExp(`SARMAL:DIATAXIS ${hedef.amac}`, "g"))?.length, 1, hedef.yol);
    assert.ok(envanter.includes(`\`${hedef.yol}\``), `${hedef.yol} A01 envanterinde olmalı`);
    assert.ok(envanter.includes(`| \`${hedef.yol}\` | ${hedef.amac} |`), `${hedef.yol} sınıfı envanterle uyuşmalı`);
  }
  assert.deepEqual(sayim, beklenen);
});

test("Reference yüzü canlı sınıflamadaki bütün tiplerin alan satırını taşır", () => {
  const icerik = readFileSync(join(KOK, "oz/siniflama/kayit.md"), "utf8");
  const snf = siniflamaOrtuMerge(
    siniflamaYukle(join(KOK, "oz/siniflama/kayit.json")),
    siniflamaOrtuYukle(KOK),
  );
  assert.ok(icerik.includes("SARMAL:ALAN-TABLOSU:TAM"));
  const alanBolgesi = icerik.slice(icerik.indexOf("SARMAL:ALAN-TABLOSU:TAM"));
  for (const tip of snf.widgetTipleri) assert.ok(alanBolgesi.includes(`| ${tip.ad} |`), tip.ad);
  assert.equal(snf.widgetTipleri.length, 101);
});

test("Tutorial, How-To ve Explanation yüzleri sınıf sözleşmelerini karşılar", () => {
  for (const hedef of BELGE_YUZU_HEDEFLERI) {
    const icerik = readFileSync(join(KOK, hedef.yol), "utf8");
    if (hedef.amac === "Tutorial") {
      assert.ok(icerik.includes("SARMAL:ADIM-ZINCIRI:CALISTIRILABILIR"), hedef.yol);
      assert.match(icerik, /1\. .+\n2\. .+\n3\. /, hedef.yol);
      assert.ok(icerik.includes("sarmal denetle"), hedef.yol);
    }
    if (hedef.amac === "How-To") assert.ok(icerik.includes("SARMAL:GOREV:TAM"), hedef.yol);
    if (hedef.amac === "Explanation") assert.doesNotMatch(icerik, /```(?:sh|bash|sarmal|ts|js|typescript)/i, hedef.yol);
  }
});

test("işaretli üretim bölgesi elle korunan girişi korur ve idempotenttir", () => {
  const hedef: BelgeYuzuHedefi = { kimlik: "TEST", yol: "test.md", amac: "indeks" };
  const ilk = belgeBolgesiUygula(undefined, hedef, "Başlık", "elle giriş", "ilk gövde");
  const elleDuzenli = ilk.replace("elle giriş", "elle değiştirilmiş giriş");
  const ikinci = belgeBolgesiUygula(elleDuzenli, hedef, "Başlık", "yoksay", "ikinci gövde");
  const ucuncu = belgeBolgesiUygula(ikinci, hedef, "Başlık", "yoksay", "ikinci gövde");
  assert.ok(ikinci.includes("elle değiştirilmiş giriş"));
  assert.ok(ikinci.includes("ikinci gövde"));
  assert.equal(ucuncu, ikinci);
});

test("belge üreticisinin resmi kanon ölçümü 151/151'dir", () => {
  const olcum = kanonOlc(KOK);
  assert.deepEqual({ madde: olcum.madde, karar: olcum.karar, kural: olcum.kural, tekil: new Set(olcum.kodlar).size },
    { madde: 151, karar: 37, kural: 114, tekil: 151 });
  assert.equal(olcum.muhurler.length, 8);
});

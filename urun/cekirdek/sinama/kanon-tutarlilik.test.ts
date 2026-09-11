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
  "dil.sar:7b2980c27d81771c67ac82f52b90f7080f54b169f99f7f5ddce3f1f06229cd44",
  "mim.sar:32ed314975828c7bac39bdcca3ba7e31bfd94c2609af2b32d4fb89c835153da6",
  "ogr.sar:8fc6dc27545d70ab2bc58bce2766ba54cfd754255933a44910ec3572344fda46",
  "ork.sar:761d586afb55f3c39af0f2d53bc84a4dc009738352778ac04b6e26e7dd288cc1",
  "str.sar:a8ebcdb80326bfc5d2cc57ec34f2658ee3e159e8ef2f10db7e4fb37099d1582d",
  "tip.sar:0c726015dc4d63a6757b9b4a8c8a9afba04f96477d224affd0f7cea290a6e068",
  "yas.sar:159b5bcb9c762586be345d7cecd4bcc6c7606a99cd1cca7aced28e70173a9b49",
  "yuz.sar:826bb6fa1fcac88bb64cbd4f793716b025d1b454e415e8e3d2770b3b2edc863c",
] as const;

test("resmi sekizli 161/161 maddeyi, örneği ve dört parçayı sabit SHA'larla taşır", () => {
  const olcum = kanonMaddeleriniOlc(KOK);
  // KPS-MHR-A01 (2026-09-11): MIM-3.4 Dosya Mühürleri Kural olarak doğdu (160 → 161).
  assert.equal(olcum.maddeler.length, 161);
  assert.equal(new Set(olcum.maddeler.map((m) => m.kod)).size, 161);
  assert.deepEqual(
    { karar: olcum.maddeler.filter((m) => m.rol === "Karar").length, kural: olcum.maddeler.filter((m) => m.rol === "Kural").length },
    { karar: 38, kural: 123 },
  );
  assert.equal(olcum.maddeler.filter((m) => m.ornek === "—").length, 0);
  assert.equal(olcum.maddeler.filter((m) => !m.dortParcaTam).length, 0);
  assert.deepEqual(olcum.muhurler, KANON_SHA);
});

test("70 taban + dört gözlem + MIM-3.4 dosya mühürlerinin üç tanısı 47/17/14 olarak 78'dir", () => {
  assert.equal(YENI_TANI_KANONU.length, 78);
  assert.equal(YENI_TANI_KANONU.filter((t) => t.kademe === "hata").length, 47);
  assert.equal(YENI_TANI_KANONU.filter((t) => t.kademe === "uyarı").length, 17);
  assert.equal(YENI_TANI_KANONU.filter((t) => t.kademe === "bilgi").length, 14);
  // MIM-3.4 dosya mühürleri (KPS-MHR-A01 · Founder hükmü 2026-09-11).
  assert.deepEqual(YENI_TANI_KANONU.filter((t) => t.madde === "MIM-3.4").map((t) => `${t.kod}:${t.kademe}`),
    ["dosya-mührü:bilgi", "sonraya-bırakılmış-dosya:bilgi", "geçersiz-dosya-adı:uyarı"]);
  // ORK-8 mevsim ritüelinin ilk motor karşılığı (Founder ölçümü 2026-08-27).
  assert.equal(YENI_TANI_KANONU.filter((t) => t.madde === "ORK-8" && t.kod === "mevsim-vadesi-geçti").length, 1);
  // ORK-8 mühür dürüstlüğü bekçisi (KPS-MVS-A01 ikinci teslim · kontrolcü hükmü 2026-09-10).
  assert.equal(YENI_TANI_KANONU.filter((t) => t.madde === "ORK-8" && t.kod === "mevsim-mührü-çelişkili").length, 1);
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
  // 2026-09-10 (KPS-MVS-A01 ikinci teslim): ORK-8 mühür bekçisiyle canlı sicil yüz seksen dörtten yüz seksen beşe çıktı.
  // 2026-09-11 (KPS-MHR-A01): MIM-3.4 dosya mühürlerinin üç tanısıyla yüz seksen sekize çıktı.
  assert.equal(canli.size, 188);
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
  assert.match(ilk, /Resmi sonuç 161\/161 maddedir/);
  assert.match(ilk, /69 yeni tanı tabanı YUZ-3\.3 tanısıyla, iki gözlemle, ORK-8 mevsim vadesi ile mühür dürüstlüğüyle, MIM-1\.7 AltKatman tekilliğiyle ve MIM-3\.4 dosya mühürlerinin üç tanısıyla 78/);
  assert.doesNotMatch(ilk, /144 madde|144\/144/);
  assert.doesNotMatch(uretici, /readFileSync\([^\n]*geneldurum|readdirSync\([^\n]*geneldurum/);
});

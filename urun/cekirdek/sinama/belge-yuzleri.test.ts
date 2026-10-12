import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import {
  BELGE_YUZU_HEDEFLERI,
  belgeBolgesiUygula,
  kanonOlc,
  URETIM_BAS,
  URETIM_SON,
  type BelgeAmaci,
  type BelgeYuzuHedefi,
  sayiIyelik,
} from "../src/belge-yuzleri.ts";
import { kanonMaddeleriniOlc } from "../src/kanon-tutarlilik.ts";
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

// EKL-F6-A03: dizinin gönderim belgesi, yerel bağlayıcının giriş belgesinde
// "Privacy Policy" başlıklı bir bölüm ister ve eksikliğini anında ret sebebi
// sayar. Nöbet, iki kök tanıtım yüzünün de bu bölümü ÜRETİLEN bölgede taşıdığını,
// bölümün politikanın HTTPS adresine bağlandığını ve politikaya bağlanan
// cümlenin yüzeyde yalnız bir kez durduğunu ölçer. Adres bilerek üreticiden
// içe alınmaz; üreticideki adres bozulursa nöbet onu bağımsız olarak yakalar.
test("iki kök tanıtım yüzü üretilen bölgede Gizlilik Politikası bölümünü ve HTTPS adresini taşır", () => {
  const adres = "https://github.com/nexivion-labs/sarmal/blob/main/PRIVACY.md";
  const basliklar: Record<string, string> = { "KOK-README-TR": "Gizlilik Politikası", "KOK-README-EN": "Privacy Policy" };
  const hedefler = BELGE_YUZU_HEDEFLERI.filter((h) => h.kimlik in basliklar);
  assert.equal(hedefler.length, 2);
  for (const hedef of hedefler) {
    const icerik = readFileSync(join(KOK, hedef.yol), "utf8");
    const bas = icerik.indexOf(URETIM_BAS(hedef.kimlik));
    const son = icerik.indexOf(URETIM_SON(hedef.kimlik));
    assert.ok(bas >= 0 && son > bas, `${hedef.yol} üretilen bölgeyi taşımalı`);
    const satirlar = icerik.slice(bas, son).split("\n");
    const baslik = `## ${basliklar[hedef.kimlik]}`;
    const i = satirlar.indexOf(baslik);
    assert.ok(i >= 0, `${hedef.yol} üretilen bölgede "${baslik}" başlığını taşımalı`);
    assert.equal(icerik.split("\n").filter((s) => s === baslik).length, 1, `${hedef.yol} "${baslik}" başlığını bir kez taşımalı`);
    const sonraki = satirlar.findIndex((s, j) => j > i && s.startsWith("## "));
    const govde = satirlar.slice(i + 1, sonraki < 0 ? undefined : sonraki).join("\n");
    assert.ok(govde.includes(`](${adres})`), `${hedef.yol} Gizlilik Politikası bölümü ${adres} adresine bağlanmalı`);
    assert.equal(icerik.match(/\]\([^)]*PRIVACY\.md\)/g)?.length, 1, `${hedef.yol} politikaya yalnız bir kez bağlanmalı`);
  }
});

test("belge üreticisinin kanon ölçümü resmi kanon ölçümüyle birebirdir", () => {
  // Sayı burada dondurulmaz: tek kaydı src/kanon-tutarlilik.ts içindeki KANON_SAYIMI, kayda
  // karşı tek nöbeti sinama/kanon-tutarlilik.test.ts içindedir (HST-MTR-A02). Bu sınama iki ölçümün aynı
  // kanonu aynı biçimde saydığını bekler.
  const olcum = kanonOlc(KOK);
  const resmi = kanonMaddeleriniOlc(KOK);
  assert.deepEqual(olcum.sayim, resmi.sayim);
  assert.equal(olcum.madde, resmi.maddeler.length);
  assert.deepEqual(olcum.kodlar, resmi.maddeler.map((m) => m.kod));
  assert.deepEqual(olcum.muhurler, resmi.muhurler);
});

// KPS-SIR-A03 inceleme bulgusu: belge yüzleri sayıya sabit "'i" ekliyordu ve
// "189'i" gibi dil bilgisine aykırı yüzler doğuyordu. Ek okunuşa göre seçilir.
test("KPS-SIR-A03: sayının iyelik eki okunuşun son sözcüğüne uyar ve üretilen yüzlerde yanlış ek kalmaz", () => {
  assert.deepEqual([1, 2, 3, 6, 9, 10, 20, 40, 60, 70, 100, 185, 186, 189, 190, 1000].map(sayiIyelik),
    ["1'i", "2'si", "3'ü", "6'sı", "9'u", "10'u", "20'si", "40'ı", "60'ı", "70'i", "100'ü", "185'i", "186'sı", "189'u", "190'ı", "1000'i"]);
  const kok = fileURLToPath(new URL("../../..", import.meta.url));
  for (const yol of ["README.md", "urun/eklenti/README.md"]) {
    const metin = readFileSync(join(kok, yol), "utf8");
    const m = metin.match(/Tanı metinlerinin (\d+'[a-zıüşöç]+)/u);
    assert.ok(m, `${yol} sayılı cümleyi taşımıyor`);
    assert.equal(m[1], sayiIyelik(Number(m[1].split("'")[0])), `${yol} yanlış ek taşıyor`);
  }
});

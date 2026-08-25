// test-kosucu.test.ts — 🧪 KNT-A03: `test-koş` yürütücüsü (tezin mekanik ucu)
//
//   ⚠️ BU SÜİTTE LLM YOK — ve bu KASITLIDIR. Araç, modelden BAĞIMSIZ kanıtlanmalı
//   ki KNT-A06 (gerçek koşu) patladığında SUÇ BÖLÜNEBİLSİN: "kapı mı çok sıkı,
//   model mi çok zayıf?" İkisi AYNI belirtiyi verir (her Adım COMPLETED'da takılır).
//   Burada kanıtlanan şey — aracın sağlam olduğu — o ayrımın tek dayanağıdır.
//
//   Fikstürler GEÇİCİ dizinde üretilir (mkdtempSync): repo köküne tek bayt yazılmaz.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { testKoşucuYap, type TestKoşumSonucu } from "../src/kopru/nvidia.ts";
import { araçTuru, type AraçTalep } from "../src/toolround.ts";
import type { İzinBeyan, İzinMatrisi, Mod } from "../src/gateway.ts";

// ── Fikstür tezgâhı — .mjs uzantısı: package.json "type"ından bağımsız ESM ────
let kök: string;

const FİKSTÜRLER: Record<string, string> = {
  // ① Geçen test → node --test çıkış kodu 0
  "gecen.test.mjs":
    `import { test } from "node:test";\n` +
    `test("kasten geçer", () => {});\n`,
  // ② Kasten KIRIK test → çıkış kodu ≠ 0 (assertion düşer)
  "kirik.test.mjs":
    `import { test } from "node:test";\n` +
    `import assert from "node:assert/strict";\n` +
    `test("kasten düşer", () => { assert.equal(1, 2, "kasten kırık fikstür"); });\n`,
  // ③ Asılı test → zaman aşımı kalkanı. process.exit güvenlik supabı: kalkan
  //    yürütücüyü döndürdükten sonra öksüz kalırsa bile fikstür kendi kendini keser.
  "yavas.test.mjs":
    `import { test } from "node:test";\n` +
    `setTimeout(() => process.exit(0), 8000).unref?.();\n` +
    `test("kasten yavaş", async () => { await new Promise((r) => setTimeout(r, 5000)); });\n`,
  // ④ Taşkın çıktı → çıktı tavanı kalkanı (~200KB)
  "gurultu.test.mjs":
    `import { test } from "node:test";\n` +
    `test("kasten gürültülü", () => { const s = "x".repeat(1024); for (let i = 0; i < 200; i++) console.log(s); });\n`,
};

before(() => {
  kök = mkdtempSync(join(tmpdir(), "sarmal-knt-a03-"));
  for (const [ad, içerik] of Object.entries(FİKSTÜRLER)) writeFileSync(join(kök, ad), içerik);
});
after(() => { rmSync(kök, { recursive: true, force: true }); });

const talep = (yol: unknown): AraçTalep => ({ etmen: "ETM-X", araç: "test-koş", mod: "çağır", argüman: { yol } });
const gövde = (s: unknown): TestKoşumSonucu => s as TestKoşumSonucu;

// ══ KABUL ① · Geçen test → çıkışKodu 0 ═══════════════════════════════════════
test("KNT-A03: geçen test fikstürü → durum izinli + çıkışKodu 0 (LLM YOK)", () => {
  const sonuç = testKoşucuYap(kök)(talep("gecen.test.mjs"));
  assert.equal(sonuç.durum, "izinli", sonuç.sebep ?? "");
  assert.equal(sonuç.güvenilmez, true, "araç çıktısı DAİMA güvenilmez (untrusted kalkanı)");
  assert.equal(gövde(sonuç.sonuç).çıkışKodu, 0);
  assert.match(gövde(sonuç.sonuç).stdout, /pass 1/, "koşum GERÇEKTEN oldu — TAP çıktısı sicilde");
});

// ══ KABUL ② · Kırık test → çıkışKodu ≠ 0 ═════════════════════════════════════
test("KNT-A03: kasten KIRIK test fikstürü → çıkışKodu ≠ 0 (kapı yalanı yakalar)", () => {
  const sonuç = testKoşucuYap(kök)(talep("kirik.test.mjs"));
  assert.equal(sonuç.durum, "izinli", "koşum yapıldı — 'hata' değil: test düştü, araç düşmedi");
  const s = gövde(sonuç.sonuç);
  assert.notEqual(s.çıkışKodu, 0, "düşen test 0 döndüremez — mührün güven kökü budur");
  assert.equal(s.çıkışKodu, 1);
  assert.match(s.stdout, /fail 1/);
});

test("KNT-A03: geçen ↔ kırık AYNI yürütücüde AYRIŞIR (araç çıkış kodunu gerçekten okuyor)", () => {
  const koşucu = testKoşucuYap(kök);
  const geçen = gövde(koşucu(talep("gecen.test.mjs")).sonuç).çıkışKodu;
  const kırık = gövde(koşucu(talep("kirik.test.mjs")).sonuç).çıkışKodu;
  assert.equal(geçen, 0);
  assert.notEqual(kırık, 0);
  assert.notEqual(geçen, kırık, "iki fikstür aynı sayıyı döndürüyorsa araç kodu OKUMUYORDUR");
});

// ══ SESSİZ YALAN KALKANI · NODE_TEST_CONTEXT mirası ══════════════════════════
//    Bu süitin KENDİSİ `node --test` altında koşuyor → ortamda NODE_TEST_CONTEXT
//    var. Miras alınsaydı torun süreç kendini iç-içe koşum sanar, HİÇBİR testi
//    koşmaz ve **çıkış kodu 0** döndürürdü — kırık fikstür bile "geçti" derdi.
//    Yukarıdaki kabuller zaten bu ortamda koşuyor; aşağıdaki iddia mirası AÇIKÇA
//    kilitler ki gelecekte biri `env:` satırını silerse süit ANINDA kırmızıya dönsün.
test("KNT-A03: koşum ortamı NODE_TEST_CONTEXT mirasını taşımaz (0 çıkış kodu yalanı kapandı)", () => {
  assert.ok(process.env.NODE_TEST_CONTEXT, "ön-koşul: bu süit gerçekten test-koşucusu ortamında");
  // Miras sızsaydı: kırık fikstür stdout'suz çıkışKodu 0 döndürürdü.
  const sonuç = testKoşucuYap(kök)(talep("kirik.test.mjs"));
  const s = gövde(sonuç.sonuç);
  assert.notEqual(s.çıkışKodu, 0, "torun süreç testi GERÇEKTEN koştu (miras sızsaydı 0 gelirdi)");
  assert.notEqual(s.stdout, "", "boş stdout = 'skipping running files' imzası — koşum olmamış demektir");
});

// ══ KABUL ③a · Zaman aşımı kalkanı ═══════════════════════════════════════════
test("KNT-A03 kalkan: asılı test zaman aşımına düşer → durum hata (sessiz 0 UYDURULMAZ)", () => {
  const sonuç = testKoşucuYap(kök, { zamanAşımıMs: 500 })(talep("yavas.test.mjs"));
  assert.equal(sonuç.durum, "hata", "çıkış kodu okunamadı → kanıt YOK");
  assert.match(sonuç.sebep ?? "", /zaman aşımı/);
  assert.equal(sonuç.sonuç, undefined, "kalkan tetiklendiğinde gövde YOK — çıkışKodu sızmaz");
  assert.equal(sonuç.güvenilmez, true);
});

test("KNT-A03 kalkan: zaman aşımı BOL verilirse aynı yavaş fikstür normal biter (kalkan kör değil)", () => {
  const sonuç = testKoşucuYap(kök, { zamanAşımıMs: 30_000 })(talep("yavas.test.mjs"));
  assert.equal(sonuç.durum, "izinli", sonuç.sebep ?? "");
  assert.equal(gövde(sonuç.sonuç).çıkışKodu, 0);
});

// ══ KABUL ③b · Çıktı tavanı kalkanı ══════════════════════════════════════════
test("KNT-A03 kalkan: taşkın çıktı tavanı aşar → durum hata (bellek taşması kapandı)", () => {
  const sonuç = testKoşucuYap(kök, { çıktıTavanıBayt: 4096 })(talep("gurultu.test.mjs"));
  assert.equal(sonuç.durum, "hata");
  assert.match(sonuç.sebep ?? "", /çıktı tavanı aşıldı: 4096 bayt/);
  assert.equal(sonuç.sonuç, undefined);
});

test("KNT-A03 kalkan: tavan BOL verilirse aynı gürültülü fikstür geçer + stdout tavanla kırpılır", () => {
  const sonuç = testKoşucuYap(kök, { çıktıTavanıBayt: 1024 * 1024 })(talep("gurultu.test.mjs"));
  assert.equal(sonuç.durum, "izinli", sonuç.sebep ?? "");
  assert.equal(gövde(sonuç.sonuç).çıkışKodu, 0);
  assert.ok(gövde(sonuç.sonuç).stdout.length <= 1024 * 1024);
});

// ══ KABUL ③c · Kök sınırı (kanitOkuyucuYap:299 deseni) ═══════════════════════
test("KNT-A03 sınır: kök-dışı göreli yol (../) RED — koşum YAPILMAZ", () => {
  const sonuç = testKoşucuYap(kök)(talep("../kacak.test.mjs"));
  assert.equal(sonuç.durum, "hata");
  assert.match(sonuç.sebep ?? "", /kök dışı erişim reddedildi/);
});

test("KNT-A03 sınır: kök-dışı MUTLAK yol RED (gerçek dosya olsa bile koşulmaz)", () => {
  const dışarı = resolve(import.meta.dirname, "test-kosucu.test.ts");   // GERÇEKTEN var, kök dışında
  const sonuç = testKoşucuYap(kök)(talep(dışarı));
  assert.equal(sonuç.durum, "hata");
  assert.match(sonuç.sebep ?? "", /kök dışı erişim reddedildi/);
});

test("KNT-A03 sınır: kök adının UZANTISI kök sanılmaz (prefix tuzağı — kok-kotu ≠ kok)", () => {
  const komşu = kök + "-kotu";
  const sonuç = testKoşucuYap(kök)(talep(join(komşu, "x.test.mjs")));
  assert.equal(sonuç.durum, "hata");
  assert.match(sonuç.sebep ?? "", /kök dışı erişim reddedildi/);
});

test("KNT-A03 sınır: yol argümanı yok / dosya yok → durum hata (fail-visible)", () => {
  const koşucu = testKoşucuYap(kök);
  assert.match(koşucu(talep(undefined)).sebep ?? "", /yol argümanı yok/);
  assert.match(koşucu(talep(42)).sebep ?? "", /yol argümanı yok/);
  assert.match(koşucu(talep("yok.test.mjs")).sebep ?? "", /test dosyası yok/);
});

// ══ Gateway zinciri — `test-koş` mod `çağır` olarak kapıdan geçer ═════════════
test("KNT-A03 zincir: beyan ∧ matris izinliyse test-koş:çağır gateway'den geçer, çıkışKodu sicile düşer", () => {
  const beyanlar: İzinBeyan[] = [{ araç: "test-koş", mod: "çağır" }];
  const matris: İzinMatrisi = new Map([["ETM-X", new Map([["test-koş", new Set<Mod>(["çağır"])]])]]);
  const sonuç = araçTuru(talep("gecen.test.mjs"), { beyanlar, matris, araçÇağır: testKoşucuYap(kök) });
  assert.equal(sonuç.durum, "izinli");
  assert.equal(gövde(sonuç.sonuç).çıkışKodu, 0);
});

test("KNT-A03 zincir: beyansız test-koş talebi RED — yürütücü HİÇ çağrılmaz (fail-closed)", () => {
  const sonuç = araçTuru(talep("gecen.test.mjs"), { beyanlar: [], araçÇağır: testKoşucuYap(kök) });
  assert.equal(sonuç.durum, "red");
  assert.match(sonuç.sebep ?? "", /least-privilege/);
});

// ogretim-ceviri.test.ts — CDL-A06 öğretim yüzeyi çeviri ve tek-kaynak nöbeti.
//
// Türkçe kanonik kaynak ve `.sar` örnekleri değişmez. İngilizce yüz aynı üretici
// iskeletinden, sabit anlatım hanelerinden ve kanonik listeler için dil sözlüğünden
// doğar. Ayrı bir İngilizce kart/AGENTS şablonu bu sözleşmeyi bozar.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { dilBaglami } from "../src/dil-baglami.ts";
import { MINIMAL_ANADIZIN, MINIMAL_PLAN, ogretKarti } from "../src/ogret.ts";
import { siniflamaYukle, type Siniflama } from "../src/siniflama.ts";

const CEKIRDEK = fileURLToPath(new URL("..", import.meta.url));
const SRC = join(CEKIRDEK, "src");
const SARMAL = join(SRC, "sarmal.ts");
const DOGUS = join(SRC, "dogus.ts");
const KAYIT_YOL = fileURLToPath(new URL("../../../oz/siniflama/kayit.json", import.meta.url));
const SOZLUK_YOL = fileURLToPath(new URL("../../../oz/ceviri/dil-sozlugu.json", import.meta.url));
const SNF = siniflamaYukle(KAYIT_YOL);

const kartIskeleti = (metin: string): string[] => metin.split("\n")
  .map((satir) => satir.match(/^(🚪|①|②|③|④|⚖️|⑤|🚦|🤖)/u)?.[1])
  .filter((x): x is string => x !== undefined);

const markdownBaslikDuzeyleri = (metin: string): number[] => metin.split("\n")
  .map((satir) => satir.match(/^(#{1,6})\s/u)?.[1].length)
  .filter((x): x is number => x !== undefined);

const ikinciSeviyeBasliklar = (metin: string): string[] => metin.split("\n")
  .filter((satir) => /^##\s/u.test(satir));

const sarOrnegi = (metin: string): string => {
  const eslesme = metin.match(/```sar\n([\s\S]*?)\n```/u);
  assert.ok(eslesme, "dil bağlamında ortak sar örneği bulunmalı");
  return eslesme[1];
};

test("CDL-A06: karşılama kartı ve dil bağlamı iki düzyazı hanesini seçer", () => {
  const kartTr = ogretKarti(SNF, "tr");
  const kartEn = ogretKarti(SNF, "en");
  assert.match(kartTr, /^🚪 SARMAL KARŞILAMA KARTI/u);
  assert.match(kartEn, /^🚪 SARMAL WELCOME CARD/u);
  assert.match(kartEn, /Phase \(canonical: Faz\).*TIME axis/u,
    "kanonik tip adı ve açıklaması sözlüğün İngilizce hanesinden gelmeli");
  assert.match(kartEn, /Step \(canonical: Adım\) → task\|accept\|produces/u,
    "zorunlu kenar adları sözlükten çevrilmeli");

  const baglamTr = dilBaglami("2026-08-02", "tr");
  const baglamEn = dilBaglami("2026-08-02", "en");
  assert.match(baglamTr, /^# Sarmal Dil Bağlamı/u);
  assert.match(baglamEn, /^# Sarmal Language Context/u);
  assert.match(baglamEn, /\*\*Phase \(`Faz`\)\*\* — a season or a year-ring/u,
    "tip kanonu widget/widgetNe sözlük hanelerinden derlenmeli");
  assert.match(baglamEn, /\*\*dependsOn \(`bağımlı`\)\*\* \(A->B\) — A depends on B/u,
    "kenar kanonu kenar/kenarNe sözlük hanelerinden derlenmeli");
  assert.match(baglamEn, /Canonical `ayakizi:` convention.*The `footprint:` field/u,
    "şema kuralı semaKural sözlük hanesinden derlenmeli");
});

test("CDL-A06: `.sar` örnekleri iki dilde de aynı kanonik Türkçe kaynaktır", () => {
  const kartTr = ogretKarti(SNF, "tr");
  const kartEn = ogretKarti(SNF, "en");
  for (const kaynak of [MINIMAL_ANADIZIN, MINIMAL_PLAN]) {
    assert.ok(kartTr.includes(kaynak), "Türkçe kart kanonik örneği birebir taşımalı");
    assert.ok(kartEn.includes(kaynak), "İngilizce kart kanonik örneği birebir taşımalı");
  }
  assert.match(kartEn, /\/\/ ⚠️ Belge bloğu KENDİNDEN SONRAKİ/u,
    "örnek içindeki Türkçe yorum İngilizce yüzde de çevrilmemeli");
  assert.equal(
    sarOrnegi(dilBaglami("2026-08-02", "en")),
    sarOrnegi(dilBaglami("2026-08-02", "tr")),
    "dil bağlamındaki fenced sar örneği tek gövde olmalı",
  );
});

test("CDL-A06: iki dil aynı bölüm iskeletini taşır; başlık silme mutasyonu yakalanır", () => {
  const kartTr = ogretKarti(SNF, "tr");
  const kartEn = ogretKarti(SNF, "en");
  const kartBeklenen = ["🚪", "①", "②", "③", "④", "⚖️", "⑤", "🚦", "🤖"];
  assert.deepEqual(kartIskeleti(kartTr), kartBeklenen);
  assert.deepEqual(kartIskeleti(kartEn), kartBeklenen);

  const baglamTr = dilBaglami("2026-08-02", "tr");
  const baglamEn = dilBaglami("2026-08-02", "en");
  assert.deepEqual(markdownBaslikDuzeyleri(baglamEn), markdownBaslikDuzeyleri(baglamTr));
  assert.equal(ikinciSeviyeBasliklar(baglamTr).length, 12, "Türkçe yüzde 12 ana bölüm olmalı");
  assert.equal(ikinciSeviyeBasliklar(baglamEn).length, 12, "İngilizce yüzde 12 ana bölüm olmalı");

  const kartMutasyonu = kartEn.split("\n").filter((satir) => !satir.startsWith("③ ")).join("\n");
  assert.notDeepEqual(kartIskeleti(kartMutasyonu), kartIskeleti(kartTr),
    "tek kart bölümü silinince iskelet nöbeti kırmızı olmalı");
  const baglamMutasyonu = baglamEn.replace(/^## Edge canon.*\n/mu, "");
  assert.notDeepEqual(markdownBaslikDuzeyleri(baglamMutasyonu), markdownBaslikDuzeyleri(baglamTr),
    "tek AGENTS bölümü silinince başlık nöbeti kırmızı olmalı");
});

test("CDL-A06: İngilizce kart kanon mutasyonunu aynı üretici üzerinden kendiliğinden taşır", () => {
  const tanı = "sahte-tanı-cdl-a06";
  const snf2: Siniflama = {
    ...SNF,
    zorunluKenarlar: {
      ...(SNF.zorunluKenarlar ?? {}),
      SahteTip: [{ grup: ["sahteKenar"], tanı, mesaj: "m", öneri: "o" }],
    },
  };
  const tabanEn = ogretKarti(SNF, "en");
  const mutasyonEn = ogretKarti(snf2, "en");
  assert.ok(!tabanEn.includes(tanı), "taban kart sahte kanon girdisini taşımamalı");
  assert.match(mutasyonEn, new RegExp(`SahteTip → sahteKenar \\(diagnostic: ${tanı}\\)`),
    "kanona eklenen kural ayrı İngilizce kart bakımı olmadan görünmeli");
});

test("CDL-A06: aile/ağaç/karne kanon düzyazısı eksiksizdir; boş-hane mutasyonu yakalanır", () => {
  const kanon = JSON.parse(readFileSync(KAYIT_YOL, "utf8")) as {
    aileler: Record<string, string>;
    agacMetaforu: Record<string, string>;
    karneSkalasi: { dereceler: Record<string, string>; bilesenler: Record<string, string> };
  };
  type Hane = Record<string, { en?: string }>;
  type Sozluk = { aileAdi: Hane; aileNe: Hane; agacOrgani: Hane; agacMetaforuNe: Hane;
    karneDerece: Hane; karneBilesen: Hane };
  const sozluk = JSON.parse(readFileSync(SOZLUK_YOL, "utf8")) as Sozluk;
  const eksikler = (s: Sozluk): string[] => {
    const sonuc: string[] = [];
    const bak = (bolum: keyof Sozluk, anahtarlar: readonly string[]): void => {
      for (const anahtar of anahtarlar) {
        if (!s[bolum][anahtar]?.en?.trim()) sonuc.push(`${bolum}.${anahtar}.en`);
      }
    };
    bak("aileAdi", Object.keys(kanon.aileler));
    bak("aileNe", Object.keys(kanon.aileler));
    bak("agacOrgani", Object.keys(kanon.agacMetaforu));
    bak("agacMetaforuNe", Object.keys(kanon.agacMetaforu));
    bak("karneDerece", Object.keys(kanon.karneSkalasi.dereceler));
    bak("karneBilesen", Object.keys(kanon.karneSkalasi.bilesenler));
    return sonuc;
  };
  assert.deepEqual(eksikler(sozluk), []);
  const mutasyon = structuredClone(sozluk);
  mutasyon.agacMetaforuNe["kök"].en = "";
  assert.ok(eksikler(mutasyon).includes("agacMetaforuNe.kök.en"),
    "tek İngilizce hane boşalınca nöbet tam yolu göstermeli");
});

test("CDL-A06: elle yazılmış ikinci kart/bağlam üretici dosyası yoktur", () => {
  const dosyalar = readdirSync(SRC).filter((ad) => ad.endsWith(".ts"));
  const kartKaynaklari = dosyalar.filter((ad) => {
    const metin = readFileSync(join(SRC, ad), "utf8");
    return metin.includes("SARMAL KARŞILAMA KARTI") || metin.includes("SARMAL WELCOME CARD");
  });
  const baglamKaynaklari = dosyalar.filter((ad) => {
    const metin = readFileSync(join(SRC, ad), "utf8");
    return metin.includes("# Sarmal Dil Bağlamı") || metin.includes("# Sarmal Language Context");
  });
  assert.deepEqual(kartKaynaklari, ["ogret.ts"], "karşılama kartının tek üretici dosyası olmalı");
  assert.deepEqual(baglamKaynaklari, ["dil-baglami.ts"], "dil bağlamının tek üretici dosyası olmalı");
  assert.equal(kartKaynaklari.filter((ad) => ad !== "ogret.ts").length, 0,
    "elle yazılmış ikinci kart dosyası sayısı sıfır olmalı");
});

test("CDL-A06: SARMAL_DIL CLI kartına ve doğuş AGENTS.md üretimine uçtan uca akar", () => {
  const kart = (dil: "tr" | "en"): string => execFileSync(process.execPath, [SARMAL, "ogret"], {
    cwd: CEKIRDEK,
    env: { ...process.env, SARMAL_DIL: dil },
    encoding: "utf8",
  });
  assert.match(kart("tr"), /^🚪 SARMAL KARŞILAMA KARTI/u);
  assert.match(kart("en"), /^🚪 SARMAL WELCOME CARD/u);

  const kod = `import { dogusManifesti } from ${JSON.stringify(pathToFileURL(DOGUS).href)};` +
    `process.stdout.write(dogusManifesti("deneme", "2026-08-02").find((d) => d.yol === "AGENTS.md").icerik);`;
  const baglam = (dil: "tr" | "en"): string => execFileSync(
    process.execPath,
    ["--input-type=module", "--eval", kod],
    { cwd: CEKIRDEK, env: { ...process.env, SARMAL_DIL: dil }, encoding: "utf8" },
  );
  assert.match(baglam("tr"), /^# Sarmal Dil Bağlamı/u);
  assert.match(baglam("en"), /^# Sarmal Language Context/u);
});

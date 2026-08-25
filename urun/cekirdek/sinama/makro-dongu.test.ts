// ═══════════════════════════════════════════════════════════════════════════
// makro-dongu.test.ts — 🔁 Makro-döngü koşucusu güvenceleri (ORK-3.3 · DNG-KOS-A01)
//
//   Kabul kanıtları:
//     • el-tetikli döngü tur atar, turLimiti'nde durur
//     • koşul-tetikli döngü durunca baştan sağlıysa SIFIR tur (deterministik)
//     • İLERLEMESİZ-DÖNGÜ bekçisi: özdeş iki tur → erken dur + Türkçe gerekçe
//     • durunca değerlendirici denetçi sözlüğüyle TEK kaynak
//   Koşum: cd cekirdek && npm test
// ═══════════════════════════════════════════════════════════════════════════

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { donguKos, donguBul, duruncaDegerlendir, turKarnesi } from "../src/makro-dongu.ts";
import { demoEtmenYap } from "../src/dongu.ts";
import { programlariYukle } from "../src/denetci.ts";

/** Geçici bahçe: anadizin + koni-dolu hedef Adım + verilen Döngü. */
function bahce(donguSatiri: string): string {
  const d = mkdtempSync(join(tmpdir(), "sarmal-dongu-"));
  writeFileSync(join(d, "test_anadizin.sar"),
    'Proje( kod: DNG-BAHCE, baslik: "döngü bahçesi" ) {\n' +
    '  raflar: { PLAN: "plan/" }\n' +
    "}\n" +
    "/// ## Amaç\n/// döngü sınaması\n/// ## Kapsam\n/// tek hedef Adım + tek Döngü — koşucu güvencesi ölçülür.\n/// ## Sonuç\n/// koşucu kararları doğru\n");
  mkdirSync(join(d, "plan"));
  writeFileSync(join(d, "plan", "is.sar"),
    'Blok( kod: DNB, ne: "döngü işi" ) {\n' +
    '  Faz( kod: DNB-F1, ad: "f" ) {\n' +
    '    Adım( kod: ADM-HEDEF, durum: geliştirmede, bağımlı: [],\n' +
    '          ne: "koşulan hedef" ) {\n' +
    '      görev: "demo görevi işle"\n' +
    '      kabul: [ "demo kabulü" ]\n' +
    '      sınır: "demo"\n' +
    "    }\n" +
    "  }\n" +
    `  ${donguSatiri}\n` +
    "}\n");
  return d;
}

test("ORK-3.3: el-tetikli döngü tur atar ve turLimiti'nde durur; trace yazılır", () => {
  const d = bahce('Döngü( kod: DNG-EL, tetik: el, koşar: [ ADM-HEDEF ], turLimiti: 1, ne: "tek tur" )');
  try {
    const s = donguKos(d, "DNG-EL", demoEtmenYap());
    assert.equal(s.cikis, 0);
    assert.equal(s.turlar.length, 1, "turLimiti 1 → tam 1 tur");
    assert.ok(s.gerekce.includes("turLimiti"), s.gerekce);
    assert.equal(s.turlar[0].kosulan[0].kod, "ADM-HEDEF");
    const iz = join(d, ".sarmal", "trace");
    assert.ok(existsSync(iz) && readdirSync(iz).some((f) => f.startsWith("dongu-DNG-EL")),
      "ORK-3.3: tur trace’e yazılmalı");
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test("ORK-3.3: koşul-tetikli döngü durunca baştan sağlıysa SIFIR tur döner", () => {
  const d = bahce('Döngü( kod: DNG-KSL, tetik: koşul, koşar: [ ADM-HEDEF ], durunca: "durum(ADM-HEDEF) == geliştirmede" )');
  try {
    const s = donguKos(d, "DNG-KSL", demoEtmenYap());
    assert.equal(s.cikis, 0);
    assert.equal(s.turlar.length, 0, "koşul baştan sağlı → dönmemeli");
    assert.ok(s.gerekce.includes("sıfır tur"), s.gerekce);
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test("ORK-3.3: ilerlemesiz-döngü bekçisi — özdeş iki tur erken durdurur, Türkçe gerekçeli", () => {
  // demo-etmen deterministik → her tur özdeş biter; turLimiti 5 ama 2. turda bekçi kesmeli.
  const d = bahce('Döngü( kod: DNG-TAKILI, tetik: el, koşar: [ ADM-HEDEF ], turLimiti: 5, ne: "takılı" )');
  try {
    const s = donguKos(d, "DNG-TAKILI", demoEtmenYap());
    assert.equal(s.cikis, 5, "ilerlemesiz çıkış kodu 5 (insan baksın)");
    assert.equal(s.turlar.length, 2, "2. turda kesilmeli — 5'e kadar dönmemeli");
    assert.ok(s.gerekce.includes("ilerleme yok") || s.gerekce.includes("özdeş"), s.gerekce);
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test("ORK-3.3: durunca değerlendirici — karne kalıpları + durum(KOD) + sözlük-dışı=undefined", () => {
  const d = bahce('Döngü( kod: DNG-X, tetik: el, koşar: [ ADM-HEDEF ], turLimiti: 1 )');
  try {
    const { dag } = turKarnesi(d);
    assert.equal(duruncaDegerlendir("karne.hata == 0", { hata: 0, uyari: 3 }, dag), true);
    assert.equal(duruncaDegerlendir("karne.hata == 0", { hata: 2, uyari: 0 }, dag), false);
    assert.equal(duruncaDegerlendir("karne.uyari <= 5", { hata: 0, uyari: 3 }, dag), true);
    assert.equal(duruncaDegerlendir("durum(ADM-HEDEF) == geliştirmede", { hata: 0, uyari: 0 }, dag), true);
    assert.equal(duruncaDegerlendir("durum(ADM-HEDEF) == tamamlandı", { hata: 0, uyari: 0 }, dag), false);
    assert.equal(duruncaDegerlendir("ay dolunayken dur", { hata: 0, uyari: 0 }, dag), undefined,
      "sözlük-dışı ifade asla durduramaz (denetim zaten bilgi düşürür)");
    // donguBul da doğru okuyor mu
    const t = donguBul(programlariYukle(d).programlar, "DNG-X");
    assert.ok(t && t.tetik === "el" && t.turLimiti === 1 && t.kosar.includes("ADM-HEDEF"));
  } finally { rmSync(d, { recursive: true, force: true }); }
});

// ── BKM-BUG-A05: donguBul skaler koşar'ı tek elemanlı liste sayar (koşucu boş koşmaz) ─
test("A05: donguBul skaler koşar → kosar=[hedef] (denetçiyle birebir semantik)", async () => {
  const { belirtecle } = await import("../src/belirtec.ts");
  const { ayristir } = await import("../src/ayristirici.ts");
  const programlar = new Map([["d.sar", ayristir(belirtecle(
    'Döngü( kod: DNG-SKALER, tetik: el, koşar: ADM-TEK, turLimiti: 1, ne: "skaler" )',
  ))]]);
  const tanim = donguBul(programlar, "DNG-SKALER");
  assert.deepEqual(tanim?.kosar, ["ADM-TEK"]);
});

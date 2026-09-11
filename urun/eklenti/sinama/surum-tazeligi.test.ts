// ═══════════════════════════════════════════════════════════════════════════
// surum-tazeligi.test.ts — 📦 BKM-DNT-A12 · sürüm damgası tuzağının nöbeti
//
//   Tuzak iki kez ölçülmüştür ve ikisi de canlı vakadır: aynı sürümle yeniden
//   paketlenen eklenti kullanıcının düzenleyicisinde hiç tazelenmez (2026-08-08),
//   ve bayat paket kanonun kendisiyle çeliştiğini söyleyerek sahte uyarı üretir
//   (2026-08-28). Nöbet kararın kendisini ölçer; gövde saf olduğu için gerçek
//   bir düzenleyici indirmeye gerek kalmaz.
// ═══════════════════════════════════════════════════════════════════════════
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { surumAyrismasi, surumIleriMi } from "../src/surum-tazeligi.ts";

test("BKM-DNT-A12: depo sürümü ileri olduğunda ayrışma bildirilir ve satır iki sürümü de anar", () => {
  const a = surumAyrismasi({ kuruluSurum: "0.9.137", depoSurumu: "0.9.159", gelistirmeKipi: true });
  assert.ok(a, "bayat kurulu paket bildirilmeli");
  assert.match(a.satir, /0\.9\.137/u, "satır kurulu sürümü anmalı");
  assert.match(a.satir, /0\.9\.159/u, "satır depo sürümünü anmalı");
  assert.match(a.satir, /bayat/u, "satır sebebi söylemeli");
});

test("BKM-DNT-A12: MAĞAZA kurulumunda hiçbir uyarı doğmaz", () => {
  assert.equal(surumAyrismasi({ kuruluSurum: "0.9.137", depoSurumu: "0.9.159", gelistirmeKipi: false }), undefined,
    "mağaza kurulumunda karşılaştırılacak bir depo yoktur; uyarı anlamsız gürültü olurdu");
});

test("BKM-DNT-A12: sürümler eşitse ya da depo GERİDEYSE susulur", () => {
  assert.equal(surumAyrismasi({ kuruluSurum: "0.9.159", depoSurumu: "0.9.159", gelistirmeKipi: true }), undefined,
    "eşit sürümde söylenecek bir şey yok");
  assert.equal(surumAyrismasi({ kuruluSurum: "0.9.159", depoSurumu: "0.9.137", gelistirmeKipi: true }), undefined,
    "depo geride ise geliştirici bilerek eski bir dalda olabilir; uyarı yanlış yönlendirir");
});

test("BKM-DNT-A12: depo sürümü okunamadığında susulur (yarım ölçümle hüküm verilmez)", () => {
  assert.equal(surumAyrismasi({ kuruluSurum: "0.9.159", gelistirmeKipi: true }), undefined);
  assert.equal(surumAyrismasi({ kuruluSurum: "0.9.159", depoSurumu: "   ", gelistirmeKipi: true }), undefined);
});

/** Tuzağın doğduğu ölçek tam olarak burasıdır: sözlük sırası 0.9.90'ı 0.9.137'den
 *  ileri sayar ve nöbet sessizce yanlış tarafa düşerdi. */
test("BKM-DNT-A12: karşılaştırma SAYISALDIR — sözlük sırası tuzağı kapanmıştır", () => {
  assert.equal(surumIleriMi("0.9.137", "0.9.90"), true, "137 > 90 sayısal olarak doğrudur");
  assert.equal(surumIleriMi("0.9.90", "0.9.137"), false, "sözlük sırası burada yanlış cevap verir");
  assert.equal(surumIleriMi("0.10.0", "0.9.999"), true);
  assert.equal(surumIleriMi("1.0.0", "0.9.999"), true);
  assert.equal(surumIleriMi("0.9.159", "0.9.159"), false, "eşitlik ilerilik değildir");
  const a = surumAyrismasi({ kuruluSurum: "0.9.90", depoSurumu: "0.9.137", gelistirmeKipi: true });
  assert.ok(a, "sayısal karşılaştırma bu ayrışmayı görmeli");
});

/** Canlı zemin: deponun kendi paket bildirimi okunabilir ve sürüm taşıyor olmalı. */
test("BKM-DNT-A12 · canlı: deponun paket bildirimi karşılaştırılabilir bir sürüm taşır", () => {
  const yol = fileURLToPath(new URL("../package.json", import.meta.url));
  const p = JSON.parse(readFileSync(yol, "utf8")) as { version?: string };
  assert.ok(p.version, "paket bildirimi sürüm taşımalı — taşımazsa karşılaştırmanın zemini yoktur");
  assert.match(p.version, /^\d+\.\d+\.\d+/u, "sürüm sayısal parçalara bölünebilir olmalı");
  // Kendisiyle karşılaştırma daima susar; bu, nöbetin sahte uyarı üretmediğinin kanıtıdır.
  assert.equal(surumAyrismasi({ kuruluSurum: p.version, depoSurumu: p.version, gelistirmeKipi: true }), undefined);
});

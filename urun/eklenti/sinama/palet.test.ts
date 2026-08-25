// ═══════════════════════════════════════════════════════════════════════════
// palet.test.ts — 🎨 İFADE PALETİ güvenceleri (TAS-C01 · kip A)
//   Tasarım sözlüğü → tamamlama önerisi çıkarımı SAF katmanda testlenir
//   (palet.ts vscode importsuz). Gerçek sözlük dosyasına karşı koşar: sözlük
//   büyüdükçe/küçüldükçe palet CANLI kalır (elle kopya listesi yok — tek kaynak).
// ═══════════════════════════════════════════════════════════════════════════
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ifadePaletiCikar } from "../src/palet.ts";

const sozluk = JSON.parse(readFileSync(
  fileURLToPath(new URL("../../../ogreti/bilgi/tasarim_sozlugu/kayit.json", import.meta.url)), "utf8"));

test("TAS-C01: gerçek sözlükten zengin palet çıkar (200+ kavram — İFADE PALETİ, kafes değil)", () => {
  const palet = ifadePaletiCikar(sozluk);
  assert.ok(palet.length >= 200, `272-kavramlık sözlükten en az 200 öneri beklenir; çıkan: ${palet.length}`);
  const kapsayici = palet.find((o) => o.kavram === "kapsayıcı");
  assert.ok(kapsayici, "'kapsayıcı' kavramı palete girmeli");
  assert.equal(kapsayici!.es, "Container", "kanonik (flutter) eşleme taşınmalı");
  assert.ok(kapsayici!.kategori.includes("yerlesim"), "kategori yolu taşınmalı (onyuz · yerlesim)");
  // _meta palete SIZMAZ (öneri değil, sözlük künyesi)
  assert.ok(!palet.some((o) => o.kategori.startsWith("_") || o.kavram === "kaynaklar"),
    "_meta girdileri palete sızmamalı");
});

test("TAS-C01: bozuk/boş girdi sessiz-güvenli (boş liste — palet zorlamaz, yardım eder)", () => {
  assert.deepEqual(ifadePaletiCikar(undefined), []);
  assert.deepEqual(ifadePaletiCikar(null), []);
  assert.deepEqual(ifadePaletiCikar("dizgi"), []);
  assert.deepEqual(ifadePaletiCikar({ _meta: { ad: "x" } }), []);
});

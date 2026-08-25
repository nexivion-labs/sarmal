// ═══════════════════════════════════════════════════════════════════════════
// performans.test.ts — 🔬 Performans merceği sınamaları (PRF-A01 · VS Code'suz)
//
//   PerformansMercegi: olaylar birikir, tur bitince tek satır özet düşer ve
//   sayaçlar sıfırlanır; kanal yazıcısı yalnız tur sonunda çağrılır.
// ═══════════════════════════════════════════════════════════════════════════

import { test } from "node:test";
import assert from "node:assert/strict";
import { PerformansMercegi } from "../src/performans.ts";

test("mercek: olaylar birikir, tur özeti hepsini tek satırda döker", () => {
  const satırlar: string[] = [];
  const mercek = new PerformansMercegi((s) => satırlar.push(s));
  mercek.olayGeldi("disk"); mercek.olayGeldi("disk"); mercek.olayGeldi("sar");
  mercek.süzüldü(); mercek.atlandı(); mercek.ertelendi(); mercek.ertelendi();

  const satır = mercek.turBitti({ tetik: "disk-olayı", süreMs: 843, dosyaSayısı: 129 },
                                new Date("2026-07-19T12:34:56"));
  assert.equal(satırlar.length, 1);            // kanal yazımı YALNIZ tur sonunda
  assert.equal(satırlar[0], satır);
  assert.match(satır, /12:34:56/);
  assert.match(satır, /843 ms · 129 dosya · tetik=disk-olayı/);
  assert.match(satır, /disk 2 · sar 1/);
  assert.match(satır, /süzülen 1 · atlanan 1 · ertelenen 2/);
});

test("mercek: tur sayaçları sıfırlar — ikinci tur birikimi taşımaz", () => {
  const mercek = new PerformansMercegi(() => {});
  mercek.olayGeldi("disk"); mercek.süzüldü();
  mercek.turBitti({ tetik: "başlangıç", süreMs: 10, dosyaSayısı: 5 });

  const ikinci = mercek.turBitti({ tetik: "sar-olayı", süreMs: 20, dosyaSayısı: 5 });
  assert.match(ikinci, /aradaki olaylar: olay yok/);
  assert.match(ikinci, /süzülen 0 · atlanan 0 · ertelenen 0/);
});

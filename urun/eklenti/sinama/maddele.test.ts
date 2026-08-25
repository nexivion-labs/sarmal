// ═══════════════════════════════════════════════════════════════════════════
// maddele.test.ts — 📝 Madde çevirme hüneri sınamaları (ZRF-A05 · VS Code'suz)
//
//   noktaliVirgulMaddele: noktalı-virgüllü tek-satır görev/sınır değeri madde
//   listesine çevrilir; tek maddeli, alıntısız ve yabancı alanlar dokunulmaz.
// ═══════════════════════════════════════════════════════════════════════════

import { test } from "node:test";
import assert from "node:assert/strict";
import { noktaliVirgulMaddele } from "../src/katla.ts";

test("maddele: üç işli görev madde listesine çevrilir — girinti ve kuyruk virgülü korunur", () => {
  const sonuc = noktaliVirgulMaddele('        görev: "işi yap; testi koştur; kapat",');
  assert.equal(sonuc,
    '        görev: [\n' +
    '          "işi yap",\n' +
    '          "testi koştur",\n' +
    '          "kapat"\n' +
    '        ],');
});

test("maddele: sınır alanı da çevrilir; tek madde/ayraçsız değer dokunulmaz", () => {
  assert.ok(noktaliVirgulMaddele('  sınır: "şunu yapma; bunu da yapma"'));
  assert.equal(noktaliVirgulMaddele('  görev: "tek cümle iş"'), undefined);
  assert.equal(noktaliVirgulMaddele('  kabul: "a; b"'), undefined);   // yalnız görev/sınır
  assert.equal(noktaliVirgulMaddele('  görev: "sondaki; "'), undefined); // tek gerçek madde
});

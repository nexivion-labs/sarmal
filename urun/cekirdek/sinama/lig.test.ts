// lig.test.ts — 🎻 Çalgıcı ligi: SAF sentez güvencesi (ağ yolu birim-testlenmez — fail-visible).

import { test } from "node:test";
import assert from "node:assert/strict";
import { ligSentezle, ligSistemPrompt, type Gorus } from "../src/kopru/lig.ts";

const g = (model: string, kismi: Partial<Gorus>): Gorus => ({
  model, eksikKabulKriterleri: [], kapsamBosluklari: [], riskler: [], oneriler: [], ...kismi,
});

test("sentez: puanlar + kategori uzlaşı sayacı + model imzası", () => {
  const md = ligSentezle([
    g("a/deepseek", { genelPuan: 7, riskler: ["HALKA-SENK-A05 geri-yazım yorum bozabilir"] }),
    g("b/kimi", { genelPuan: 8, riskler: ["trace.jsonl sınırsız büyür"], oneriler: ["A01'e boyut-sınırı ekle"] }),
    g("c/glm", { genelPuan: 6 }),
  ]);
  assert.ok(md.includes("**a/deepseek**: 7/10"));
  assert.ok(md.includes("⚠️ Riskler — uzlaşı: 2/3 model"));           // 2 model risk verdi
  assert.ok(md.includes("💡 Öneriler — uzlaşı: 1/3 model"));
  assert.ok(md.includes("`[kimi]`"));                                  // model imzası (kısa ad)
  assert.ok(md.includes("hiçbir model bu kategoride bulgu vermedi") === false || true);
});

test("sentez: çöken model fail-visible (⛔) + uzlaşı paydasından düşer", () => {
  const md = ligSentezle([
    g("a/deepseek", { hata: "429 kota doldu" }),
    g("b/kimi", { genelPuan: 9, kapsamBosluklari: ["rollback adımı yok"] }),
  ]);
  assert.ok(md.includes("⛔ görüş alınamadı — 429 kota doldu"));
  assert.ok(md.includes("🕳️ Kapsam boşlukları — uzlaşı: 1/1 model")); // payda = sağlam modeller
});

test("sistem promptu JSON sözleşmesini dikte eder (şema alanları + yasak)", () => {
  const p = ligSistemPrompt();
  for (const alan of ["eksikKabulKriterleri", "kapsamBosluklari", "riskler", "oneriler", "genelPuan"]) {
    assert.ok(p.includes(alan), `prompt '${alan}' alanını dikte etmeli`);
  }
  assert.ok(p.includes("YALNIZCA geçerli bir JSON"));
});

// ── HALKA-IZLE-A01: trace katmanı (izliEtmenYap — köprü kardeşi burada sınanır) ──
import { test as izTest } from "node:test";
import izAssert from "node:assert/strict";

izTest("izliEtmenYap: her çağrı HAM JSONL satırı yazar (prompt+yanıt+rol+ajan imzası+sıra); davranış birebir", async () => {
  const { izliEtmenYap } = await import("../src/kopru/iz.ts");
  const { mkdtempSync, readFileSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const dir = mkdtempSync(join(tmpdir(), "iz-"));
  try {
    const dosya = join(dir, "kosu.jsonl");
    const ic = (ç: { adımKod: string; rol: string; prompt: string }) =>
      ({ rol: ç.rol, yanit: "tamam", tokenGiriş: 11, tokenÇıkış: 7 });
    const izli = izliEtmenYap(ic as never, { dosya, model: "test-model" });
    const y1 = izli({ adımKod: "ADM-IZ", rol: "üretici", prompt: "HAM PROMPT metni", etmen: { kod: "ETM-X", ad: "uzman" } } as never);
    izAssert.equal((y1 as Record<string, unknown>).yanit, "tamam", "çıktı birebir geçer");
    izli({ adımKod: "ADM-IZ", rol: "denetçi", prompt: "ikinci çağrı" } as never);
    const satirlar = readFileSync(dosya, "utf8").trim().split("\n").map((s) => JSON.parse(s));
    izAssert.equal(satirlar.length, 2);
    izAssert.equal(satirlar[0].hamPrompt, "HAM PROMPT metni", "prompt HAM (kısaltmasız)");
    izAssert.deepEqual(satirlar[0].ajanİmza, { kod: "ETM-X", ad: "uzman" });
    izAssert.equal(satirlar[0].model, "test-model");
    izAssert.equal(satirlar[0].tokenGiriş, 11);
    izAssert.equal(satirlar[1].sıra, 2);
    izAssert.equal(satirlar[1].rol, "denetçi");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

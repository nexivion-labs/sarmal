// ═══════════════════════════════════════════════════════════════════════════
// dil-baglami.test.ts — 🧠 Ajan dil bağlamının nöbeti (DPK-A03)
//
//   Söz: AGENTS.md kanonla SENKRON üretilir — her widget tipi, her kenar tipi
//   ve koni alanları içerikte yaşar; üretilen-dosya beyanı başta durur. Kanona
//   tip eklendiğinde bu test elle güncelleme istemez (tek-kaynak kanıtı).
// ═══════════════════════════════════════════════════════════════════════════

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dilBaglami } from "../src/dil-baglami.ts";
import { KONI_ALANLARI } from "../src/koni.ts";
import { dogusManifesti } from "../src/dogus.ts";

const KAYIT = JSON.parse(readFileSync(
  fileURLToPath(new URL("../../../oz/siniflama/kayit.json", import.meta.url)), "utf8")) as {
  widgetTipleri: Array<{ ad: string }>;
  kenarTipleri: Array<{ ad: string }>;
};

test("dil bağlamı kanonla senkron: her tip, her kenar ve koni alanları içerikte", () => {
  const m = dilBaglami("2026-07-17");
  for (const t of KAYIT.widgetTipleri)
    assert.ok(m.includes(`**${t.ad}**`), `tip kanondan düşmüş: ${t.ad}`);
  for (const k of KAYIT.kenarTipleri)
    assert.ok(m.includes(`**${k.ad}**`), `kenar kanondan düşmüş: ${k.ad}`);
  for (const alan of KONI_ALANLARI)
    assert.ok(m.includes(alan), `koni alanı anlatılmamış: ${alan}`);
});

test("dil bağlamı kavram kanonunu ve bağlam haritasını anlatır — aileler haritayla senkron (OGR-3)", () => {
  const m = dilBaglami("2026-07-18");
  assert.ok(m.includes("bilgi/tasarim_sozlugu/kayit.json"), "kavram kanonunun yolu anlatılmalı (YUZ-1.2)");
  assert.ok(m.includes("bilgi/tasarim_sozlugu/baglam-haritasi.json"), "bağlam haritasının yolu anlatılmalı");
  const harita = JSON.parse(readFileSync(
    fileURLToPath(new URL("../../../ogreti/bilgi/tasarim_sozlugu/baglam-haritasi.json", import.meta.url)), "utf8")) as {
    aileler: Record<string, unknown>;
  };
  for (const aile of Object.keys(harita.aileler))
    assert.ok(m.includes(`**${aile}**`), `aile haritadan düşmüş: ${aile} (bağlam paketi yeniliği öğrenmeli — OGR-3)`);
  assert.match(m, /ÖNERİR, zorlamaz/u, "zorlamasızlık ajana açıkça söylenmeli");
});

test("dil bağlamı üretilen-dosya beyanı taşır ve STR-3 sınırını korur", () => {
  const m = dilBaglami("2026-07-17");
  assert.match(m, /ÜRETİLEN DOSYA — elle DÜZENLENMEZ/u, "üretilen-dosya beyanı başta olmalı");
  assert.ok(!/ŞEF politikası|orkestrasyon zekâsı/iu.test(m),
    "orkestrasyon zekâsı bağlama SIZMAMALI (STR-3 — yalnız açık dil anlatılır)");
});

test("doğuş manifesti dil bağlamını taşır: AGENTS.md altıncı dosya", () => {
  const m = dogusManifesti("deneme", "2026-07-17");
  const agents = m.find((d) => d.yol === "AGENTS.md");
  assert.ok(agents, "AGENTS.md manifestte olmalı");
  assert.match(agents!.icerik, /Sarmal Dil Bağlamı/u);
  assert.equal(m.length, 6, "manifest 6 dosyadır (5 iskelet + dil bağlamı)");
});

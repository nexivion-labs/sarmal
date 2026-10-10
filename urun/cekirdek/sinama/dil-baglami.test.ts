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

// ── EKL-F6-A08 · BAĞLANAMAYAN SUNUCU ile TANIMSIZ SUNUCU ────────────────────
//   Ölçülmüş kusur: doğan ağaç taşındığında sunucu açılmıyordu ve ajan, bağlanamayan
//   bir sunucu ile hiç tanımlanmamış bir sunucuyu ayırt edemediği için HAM TARAMAYA
//   dönüyordu — yani ürünün tam olarak engellemek için var olduğu davranışa. Yönerge
//   bu ayrımı öğretmek zorundadır ve öğretiyi İKİ DİLDE de taşımalıdır, çünkü doğan
//   kökün yönergesi okuyucunun diline göre üretilir ve tek kanatta kalan bir öğreti
//   öteki dilde okuyan ajana hiç ulaşmaz.
test("EKL-F6-A08: dil bağlamı bağlanamayan sunucu ile tanımsız sunucuyu ayırt etmeyi iki dilde de öğretir", () => {
  for (const dil of ["tr", "en"] as const) {
    const m = dilBaglami("2026-09-16", dil);
    assert.ok(m.includes("SARMAL_KOK"), `${dil}: eksik ortam değişkeninin ADI anlatılmamış`);
    assert.match(m, /Missing environment variables/u, `${dil}: istemcinin eksik değişken uyarısı tanıtılmamış`);
    assert.match(m, /claude mcp list/u, `${dil}: sunucu durumunun nereden okunacağı söylenmemiş`);
  }
  const tr = dilBaglami("2026-09-16", "tr");
  assert.match(tr, /HAM TARAMAYA GEÇME/u, "ham taramaya düşme yasağı yazılmamış — kusurun kendisi budur");
  assert.match(tr, /TANIMSIZDIR/u, "tanımsız sunucu hâli adlandırılmamış");
  assert.match(tr, /BAĞLANAMAMIŞTIR/u, "bağlanamayan sunucu hâli adlandırılmamış");
  const en = dilBaglami("2026-09-16", "en");
  assert.match(en, /DO NOT FALL BACK TO RAW SCANNING/u, "EN gövdesi ham tarama yasağını taşımıyor");
  assert.match(en, /the server is UNDEFINED/u, "EN gövdesi tanımsız sunucu hâlini adlandırmıyor");
  assert.match(en, /DEFINED AND FAILED TO CONNECT/u, "EN gövdesi bağlanamayan sunucu hâlini adlandırmıyor");
});

test("doğuş manifesti dil bağlamını YÖNERGE İKİZİNİN İKİ KANADINDA da taşır", () => {
  const m = dogusManifesti("deneme", "2026-07-17");
  // BKM-DNT-A15: dil bağlamı tek bir dosya değil, bayt özdeş bir ikizdir. Sayı
  // iddiası kaldırıldı ve yerine ilişki iddiası yazıldı: manifestin uzunluğu
  // kökün kapıları büyüdükçe değişir, fakat iki kanadın özdeşliği değişmez ve
  // asıl korunması gereken sözleşme odur.
  const agents = m.find((d) => d.yol === "AGENTS.md");
  const claude = m.find((d) => d.yol === "CLAUDE.md");
  assert.ok(agents, "AGENTS.md manifestte olmalı");
  assert.ok(claude, "CLAUDE.md manifestte olmalı — ikizin öteki kanadı eksik");
  assert.match(agents!.icerik, /Sarmal Dil Bağlamı/u);
  assert.equal(claude!.icerik, agents!.icerik, "yönerge ikizi manifestte ayrışmış");
});

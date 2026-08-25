// ═══════════════════════════════════════════════════════════════════════════
// emoji-yazim.test.ts — 🌍 Emoji takma-adı sınamaları (EMJ-A02)
//
//   Üç kabul ölçütünün kanıtı: ① aynı içeriğin Türkçe ve emoji yazımı birebir
//   aynı düğüm grafını üretir (eşdeğerlik) ② karışık yazımlı dosya geçerli
//   ayrışır ③ mevcut dosyalar eski davranışıyla ayrışır (kanon-dışı çıplak
//   emoji hâlâ söz dizimi hatasıdır — geriye uyumluluk). Ek nöbetler: çekirdek
//   tablo ↔ kayit.json emojiYazimi eşitliği (durumGecisleri YEDEK deseni) +
//   tek-anlamlılık (DIL-4) + varyasyon-seçicisiz yazım toleransı.
// ═══════════════════════════════════════════════════════════════════════════

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { belirtecle, SozDizimHatasi } from "../src/belirtec.ts";
import { ayristir } from "../src/ayristirici.ts";
import { agaciYaz } from "../src/yazdir.ts";
import { EMOJI_TIPLER, EMOJI_PARAMETRELER, EMOJI_DURUMLAR, EMOJI_TAKMA, emojiEsle } from "../src/emoji-yazim.ts";

const agac = (kaynak: string): string => agaciYaz(ayristir(belirtecle(kaynak)));

// ── ① Eşdeğerlik: iki yüz aynı grafı üretir ──────────────────────────────────

test("eşdeğerlik: aynı Adım'ın Türkçe ve emoji yazımı birebir aynı grafı üretir", () => {
  const turkce =
    `Adım( kod: EMJ-ORNEK, durum: beklemede, ne: "🧪 Deneme", kabul: [ "ölçüt bir" ], bağımlı: [ EMJ-DIGER ] )`;
  const emoji =
    `🍃( 🆔: EMJ-ORNEK, 🚦: ⏳, ❓: "🧪 Deneme", ✅: [ "ölçüt bir" ], 🔗: [ EMJ-DIGER ] )`;
  assert.equal(agac(emoji), agac(turkce));
});

test("eşdeğerlik: tam zincir (Faz›Blok›Katman›Adım) emoji yüzüyle aynı grafı üretir", () => {
  const turkce =
    `Faz( kod: F1, ad: "dönem" ) {\n` +
    `  Blok( kod: B1, ad: "iş" ) {\n` +
    `    Katman( kod: K1, ad: "teknoloji" ) {\n` +
    `      Adım( kod: A1, durum: tamamlandı, görev: "işi yap", sınır: "burada dur" )\n` +
    `    }\n` +
    `  }\n` +
    `}`;
  const emoji =
    `🌀( 🆔: F1, 🏷️: "dönem" ) {\n` +
    `  🪵( 🆔: B1, 🏷️: "iş" ) {\n` +
    `    🌿( 🆔: K1, 🏷️: "teknoloji" ) {\n` +
    `      🍃( 🆔: A1, 🚦: 🏁, 🛠️: "işi yap", 🚧: "burada dur" )\n` +
    `    }\n` +
    `  }\n` +
    `}`;
  assert.equal(agac(emoji), agac(turkce));
});

test("eşdeğerlik: dört durum değeri de emoji yazımından kanonik ada normalleşir", () => {
  for (const [emoji, ad] of Object.entries(EMOJI_DURUMLAR)) {
    assert.equal(
      agac(`Adım( kod: A1, durum: ${emoji} )`),
      agac(`Adım( kod: A1, durum: ${ad} )`),
      `durum ${emoji} → ${ad}`);
  }
});

// ── ② Karışık yazım ──────────────────────────────────────────────────────────

test("karışık yazım: Türkçe + emoji aynı dosyada geçerli ayrışır ve grafı değiştirmez", () => {
  const karisik =
    `Adım( kod: A1, 🚦: geliştirmede, ne: "karışık yüz", ✅: [ "ölçüt" ], sınır: "dar" )`;
  const turkce =
    `Adım( kod: A1, durum: geliştirmede, ne: "karışık yüz", kabul: [ "ölçüt" ], sınır: "dar" )`;
  assert.equal(agac(karisik), agac(turkce));
});

// ── ③ Geriye uyumluluk ───────────────────────────────────────────────────────

test("geriye uyumluluk: dizgi/yorum/belge bloğu içindeki emojiler İÇERİK olarak korunur", () => {
  const kaynak =
    `// yorumda ✅ serbesttir\n` +
    `Adım( kod: A1, ne: "✅ dizgide emoji içeriktir 🍎" )`;
  const p = ayristir(belirtecle(kaynak));
  const ne = p.bildirimler[0].parametreler.find((x) => x.ad === "ne");
  assert.equal(ne?.deger.metin, "✅ dizgide emoji içeriktir 🍎");
});

test("geriye uyumluluk: kanon DIŞI çıplak emoji hâlâ söz dizimi hatasıdır", () => {
  assert.throws(() => belirtecle(`Adım( kod: A1, 🎸: "kanonda yok" )`), SozDizimHatasi);
});

test("geriye uyumluluk: gerçek anadizin eski davranışıyla ayrışıyor (tam yüzey örneği)", () => {
  const yol = fileURLToPath(new URL("../../../sarmal_anadizin.sar", import.meta.url));
  const kaynak = readFileSync(yol, "utf8");
  assert.doesNotThrow(() => agac(kaynak));
});

// ── Nöbetler: kanon eşitliği + tek-anlam + tolerans ─────────────────────────

test("eşitlik nöbeti: çekirdek tablolar kayit.json emojiYazimi kanonuyla BİREBİR", () => {
  const yol = fileURLToPath(new URL("../../../oz/siniflama/kayit.json", import.meta.url));
  const kanon = JSON.parse(readFileSync(yol, "utf8")).emojiYazimi;
  assert.ok(kanon, "kayit.json emojiYazimi bölümü olmalı");
  assert.deepEqual(EMOJI_TIPLER, kanon.tipler);
  assert.deepEqual(EMOJI_PARAMETRELER, kanon.parametreler);
  assert.deepEqual(EMOJI_DURUMLAR, kanon.durumlar);
});

test("tek-anlamlılık (DIL-4): hiçbir emoji iki kavrama bağlanmamıştır", () => {
  const hepsi = [
    ...Object.keys(EMOJI_TIPLER),
    ...Object.keys(EMOJI_PARAMETRELER),
    ...Object.keys(EMOJI_DURUMLAR),
  ];
  assert.equal(new Set(hepsi).size, hepsi.length);
  assert.equal(hepsi.length, 7 + 16 + 4);   // birinci parti kapsamı (Founder onayı)
});

test("varyasyon-seçici toleransı: ☘️ ve seçicisiz ☘ aynı kanonik ada çözülür", () => {
  assert.equal(EMOJI_TAKMA.get("☘️"), "AltKatman");
  assert.equal(EMOJI_TAKMA.get("☘"), "AltKatman");
  assert.equal(emojiEsle("☘( 🆔: X )", 0)?.ad, "AltKatman");
});

test("uzun eşleşme önce: çok-kod-noktalı emoji tek-kod-noktalıyı gölgelemez", () => {
  // 🏷️ (etiket + FE0F) "ad"a çözülmeli — kısaltılmış biçimi değil.
  assert.equal(emojiEsle(`🏷️: "x"`, 0)?.ad, "ad");
});

test("prizma yansıması (EMJ-A03): emoji yazımı bütün prizma yüzlerinde Türkçe yazımla birebir", async () => {
  // Prizma yüzleri grafı okur; belirteçleyici emoji yazımını kanonik ada
  // normalleştirdiğinden iki yüzün her yansıması (json · yaml · xml) aynı olmalı.
  const { yansıt } = await import("../src/prizma.ts");
  const turkce =
    `Faz( kod: F1 ) {\n  Blok( kod: B1 ) {\n    Katman( kod: K1 ) {\n` +
    `      Adım( kod: A1, durum: beklemede, ne: "🧪 deneme", bağımlı: [] )\n    }\n  }\n}`;
  const emoji =
    `🌀( 🆔: F1 ) {\n  🪵( 🆔: B1 ) {\n    🌿( 🆔: K1 ) {\n` +
    `      🍃( 🆔: A1, 🚦: ⏳, ❓: "🧪 deneme", 🔗: [] )\n    }\n  }\n}`;
  for (const yuz of ["json", "yaml", "xml"] as const) {
    assert.equal(yansıt(emoji, yuz), yansıt(turkce, yuz), `${yuz} yüzü iki yazımda aynı olmalı`);
  }
});

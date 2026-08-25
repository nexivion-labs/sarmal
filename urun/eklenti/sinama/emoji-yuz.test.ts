// ═══════════════════════════════════════════════════════════════════════════
// emoji-yuz.test.ts — 🌍 Emoji yüzü sınamaları (EMJ-A03 · VS Code'suz)
//
//   Dört güvence:
//     1. TERS EŞLEME kanonla bire bir: her kanon girdisi için ad → emoji geri
//        döner (çekirdek emoji-yazim.ts tek kaynak — burada tablo icat edilmez).
//     2. YÜZ ALGISI dürüst: emoji YAZIMI yüzü açar; dizgi/yorum/belge-bloğu
//        İÇERİĞİNDEKİ emoji yüzü yanıltamaz (bu repoda her ne: alanı emojili).
//     3. YAZIM-DIŞI TESPİT: dizgi · yorum · üçlü dizgi · belge bloğu içindeki
//        konumlara kanon baloncuğu basılmaz (EMJ-A02: içerik korunur).
//     4. BİÇİMLENDİRİCİ YÜZ KORUMASI: emoji yazılan dosya biçimden emoji çıkar —
//        idempotent + anlam-koruma + tek bir emoji bile Türkçeye çevrilmez.
//   Koşum: cd eklenti && npm test
// ═══════════════════════════════════════════════════════════════════════════

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AD_EMOJI, emojiKarsiligi, emojiSozceCoz, emojiDeseni, emojiYuzuMu, yazimDisiMi, yazimDisiSoy,
} from "../src/emoji-yuz.ts";
import {
  EMOJI_TIPLER, EMOJI_PARAMETRELER, EMOJI_DURUMLAR,
} from "../../cekirdek/src/emoji-yazim.ts";
import { bicimle } from "../../cekirdek/src/bicimle.ts";
import { belirtecle } from "../../cekirdek/src/belirtec.ts";
import { ayristir } from "../../cekirdek/src/ayristirici.ts";
import { agaciYaz } from "../../cekirdek/src/yazdir.ts";

// ── fikstür: emoji yüzüyle yazılmış tam-zincir dosya ─────────────────────────
const EMOJI_DOSYA = [
  '// başlık yorumu — 🍎 buradaki emoji içeriktir',
  '🌀( 🆔: FZ-1, ❓: "dönem — ❓ dizgideki emoji de içeriktir" ) {',
  '  🪵( 🆔: BLK-1 ) {',
  '    🌿( 🆔: KAT-1 ) {',
  '      🍃( 🆔: ADM-1, 🚦: ⏳, 🔗: [], ❓: "🍎 meyve anlatımı" )',
  '    }',
  '  }',
  '}',
].join("\n");

const TURKCE_DOSYA = [
  'Faz( kod: FZ-1, ne: "🌀 dönem — içerik emojisi yüz açmaz" ) {',
  '  Blok( kod: BLK-1, ne: "🍎 meyve anlatımı" ) {',
  '    Katman( kod: KAT-1 ) {',
  '      Adım( kod: ADM-1, durum: beklemede, bağımlı: [] )',
  '    }',
  '  }',
  '}',
].join("\n");

// ── 1. ters eşleme kanonla bire bir ──────────────────────────────────────────
test("ters eşleme: kanonun her girdisi ad→emoji geri döner (üç bölüm eksiksiz)", () => {
  const tablolar = [EMOJI_TIPLER, EMOJI_PARAMETRELER, EMOJI_DURUMLAR];
  let toplam = 0;
  for (const tablo of tablolar) {
    for (const [emoji, ad] of Object.entries(tablo)) {
      assert.equal(emojiKarsiligi(ad), emoji, `${ad} adının emojisi ${emoji} olmalı`);
      toplam++;
    }
  }
  assert.equal(AD_EMOJI.size, toplam, "ters eşleme kanonla aynı sayıda girdi taşır (çakışma yok)");
});

test("emojiSozceCoz: bölüm doğru, seçicisiz yazım tolere, kanon dışı undefined", () => {
  assert.deepEqual(emojiSozceCoz("🍃"), { ad: "Adım", bolum: "kademe" });
  assert.deepEqual(emojiSozceCoz("🆔"), { ad: "kod", bolum: "parametre" });
  assert.deepEqual(emojiSozceCoz("⏳"), { ad: "beklemede", bolum: "durum" });
  assert.deepEqual(emojiSozceCoz("☘"), { ad: "AltKatman", bolum: "kademe" }, "seçicisiz ☘ da tanınır");
  assert.equal(emojiSozceCoz("💥"), undefined, "kanon dışı emoji çözülmez");
});

test("emojiDeseni: kanon emojilerini yakalar, kanon dışını yakalamaz", () => {
  const desen = emojiDeseni();
  for (const e of ["🍃", "☘️", "☘", "🆔", "⏳"]) assert.ok(desen.test(e), `${e} yakalanmalı`);
  assert.ok(!desen.test("💥"), "kanon dışı emoji yakalanmaz");
});

// ── 2. yüz algısı ────────────────────────────────────────────────────────────
test("emojiYuzuMu: emoji yazımlı dosya yüzü açar, Türkçe dosya açmaz", () => {
  assert.equal(emojiYuzuMu(EMOJI_DOSYA), true);
  assert.equal(emojiYuzuMu(TURKCE_DOSYA), false, "içerikteki 🌀/🍎 yüz algısını yanıltmaz");
});

test("emojiYuzuMu: karışık yazım (tek emoji parametre) yüzü açar", () => {
  const karisik = 'Adım( 🆔: ADM-1, durum: beklemede )';
  assert.equal(emojiYuzuMu(karisik), true);
});

test("emojiYuzuMu: yalnız yorum ve belge bloğundaki emoji yüz açmaz", () => {
  const icerik = [
    "// 🍃( yorumdaki sahte yazım",
    "-->|",
    "  🆔: belge bloğundaki sahte parametre",
    "|<--",
    'Adım( kod: ADM-1, ne: "🚦: dizgideki sahte parametre" )',
  ].join("\n");
  assert.equal(emojiYuzuMu(icerik), false);
});

// ── 3. yazım-dışı konum tespiti ──────────────────────────────────────────────
test("yazimDisiMi: dizgi · yorum · üçlü dizgi · belge bloğu içi TRUE, yazım FALSE", () => {
  const satirlar = [
    '🍃( 🆔: ADM-1, ❓: "🍎 içerik" ) // yorum 🍎',
    'koşu: """',
    '  🏁 üçlü dizgi içeriği',
    '"""',
    "-->|",
    "  belge 🍎 metni",
    "|<--",
  ];
  assert.equal(yazimDisiMi(satirlar, 0, 1), false, "kademe emojisi yazımdadır");
  assert.equal(yazimDisiMi(satirlar, 0, 21), true, "dizgi içi (🍎 konumu — UTF-16 birimleriyle)");
  assert.equal(yazimDisiMi(satirlar, 0, 38), true, "satır yorumu içi");
  assert.equal(yazimDisiMi(satirlar, 2, 3), true, "üçlü dizgi içi");
  assert.equal(yazimDisiMi(satirlar, 5, 8), true, "belge bloğu içi");
});

test("yazimDisiSoy: dizgi/yorum/belge içerikleri düşer, yazım kalır", () => {
  const soyulmus = yazimDisiSoy(EMOJI_DOSYA);
  assert.ok(soyulmus.includes("🍃("), "yazım korunur");
  assert.ok(!soyulmus.includes("🍎"), "içerik emojileri soyulur");
  assert.ok(!soyulmus.includes("başlık yorumu"), "yorumlar soyulur");
});

// ── 4. biçimlendirici yüz koruması ───────────────────────────────────────────
const agac = (kaynak: string): string => agaciYaz(ayristir(belirtecle(kaynak)));

test("biçimlendirici yüz koruması: emoji dosya biçimden emoji çıkar (idempotent + anlam-koruma)", () => {
  const bicimli = bicimle(EMOJI_DOSYA, "\n");
  for (const sozce of ["🌀(", "🪵(", "🌿(", "🍃(", "🆔:", "🚦: ⏳", "🔗:"]) {
    assert.ok(bicimli.includes(sozce), `${sozce} yazımı biçimden aynen çıkmalı — yüz kendiliğinden değişmez`);
  }
  assert.ok(!/\b(Faz|Blok|Katman|Adım)\(/u.test(bicimli), "hiçbir emoji Türkçe yazıma çevrilmez");
  assert.equal(bicimle(bicimli, "\n"), bicimli, "idempotent");
  assert.equal(agac(bicimli), agac(EMOJI_DOSYA), "anlam korunur — iki yüz aynı graf");
});

test("biçimlendirici yüz koruması: Türkçe dosya da Türkçe kalır (emojiye çevrilmez)", () => {
  const bicimli = bicimle(TURKCE_DOSYA, "\n");
  for (const sozce of ["Faz(", "Adım(", "kod:", "durum: beklemede"]) {
    assert.ok(bicimli.includes(sozce), `${sozce} Türkçe yazımı korunmalı`);
  }
});

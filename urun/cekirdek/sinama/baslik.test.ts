// ═══════════════════════════════════════════════════════════════════════════
// baslik.test.ts — 🔤 Türkçe başlık düzeni ve yüzey adı nöbetleri (YUZ · VIT-K78-A08)
//
//   Founder turu 2026-08-27 bulgu ①'in kapanış kanıtı: dönüşüm yalnız ADA
//   uygulanır; adı olmayan düğümün KODU yüzeyde olduğu gibi durur. `YTK-A01`
//   bir kimliktir ve `Ytk A01` hiçbir düğümü adlandırmaz. Türkçe tuzağı da
//   burada kilitlenir: i→İ ve ı→I ayrımı yerel duyarlı büyütmeyle korunur.
// ═══════════════════════════════════════════════════════════════════════════
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  baslikDuzeni, baslikDuzenindeMi, yuzeyAdi, buyukTr, kucukTr, tarihRozeti, tarihRozetiKisa,
} from "../src/baslik.ts";

test("yuzeyAdi: ad varsa başlık düzenine çevrilir", () => {
  assert.equal(yuzeyAdi("kimlik ve zemin", "VIT-KIMLIK-A01"), "Kimlik ve Zemin");
  assert.equal(yuzeyAdi("nexivion-labs", "PRJ-NL"), "Nexivion Labs");
});

test("yuzeyAdi: ad yoksa KOD olduğu gibi yazılır — bulgu ① geri gelemez", () => {
  // Mutasyon kanıtı: `baslikDuzeni(ad ?? kod)` yazımı bu satırı 'Ytk A01' yapar ve kırmızı yakar.
  assert.equal(yuzeyAdi(undefined, "YTK-A01"), "YTK-A01");
  assert.equal(yuzeyAdi("", "BLK-VITRIN"), "BLK-VITRIN");
  assert.notEqual(yuzeyAdi(undefined, "YTK-A01"), baslikDuzeni("YTK-A01"));
});

test("baslikDuzeni: bağlaç ve edat küçük kalır, ilk sözcük her hâlde büyük", () => {
  assert.equal(baslikDuzeni("kimlik ve zemin"), "Kimlik ve Zemin");
  assert.equal(baslikDuzeni("ve sonra"), "Ve Sonra");
  assert.equal(baslikDuzeni("v1 omurga göçü"), "V1 Omurga Göçü");
  assert.equal(baslikDuzeni("ağustos orkestrasyon mevsimi"), "Ağustos Orkestrasyon Mevsimi");
});

test("baslikDuzeni: tire ve alt çizgi sözcük ayracıdır, fazla boşluk tekleşir", () => {
  assert.equal(baslikDuzeni("nexivion-labs"), "Nexivion Labs");
  assert.equal(baslikDuzeni("yol_haritasi   paneli"), "Yol Haritasi Paneli");
  assert.equal(baslikDuzeni("   "), "   ");   // boş ad dokunulmadan döner
});

test("Türkçe tuzağı: i→İ ve ı→I ayrımı korunur (varsayılan büyütme bunu bozar)", () => {
  assert.equal(buyukTr("istanbul"), "İSTANBUL");
  assert.equal(kucukTr("IĞDIR"), "ığdır");
  assert.equal(baslikDuzeni("istanbul ışığı"), "İstanbul Işığı");
  assert.notEqual("istanbul".toUpperCase(), "İSTANBUL");   // tuzağın kendisi: JS varsayılanı yanlıştır
});

test("baslikDuzenindeMi: dönüşüm sonucu kendisiyle aynıysa ad düzgündür", () => {
  assert.equal(baslikDuzenindeMi("Kimlik ve Zemin"), true);
  assert.equal(baslikDuzenindeMi("kimlik ve zemin"), false);
  assert.equal(baslikDuzenindeMi("YTK-A01"), false);   // kod başlık düzeninde DEĞİLDİR — bu yüzden koda uygulanmaz
});

test("tarihRozeti: tam tarih gün adıyla, ay hassasiyeti ay adıyla, bozuk değer boş", () => {
  assert.equal(tarihRozeti("2026-08-31"), "31 Ağustos 2026 Pazartesi");
  assert.equal(tarihRozeti("2026-08"), "Ağustos 2026");
  assert.equal(tarihRozeti("2026-13-01"), "");
  assert.equal(tarihRozeti(undefined), "");
});

test("tarihRozetiKisa: satırda gün ve ay durur, yıl yalnız farklıysa yazılır", () => {
  assert.equal(tarihRozetiKisa("2026-08-31", 2026), "31 Ağustos");
  assert.equal(tarihRozetiKisa("2025-08-31", 2026), "31 Ağustos 2025");
  assert.equal(tarihRozetiKisa("2026-08", 2026), "Ağustos");
  assert.equal(tarihRozetiKisa("2027-01", 2026), "Ocak 2027");
});

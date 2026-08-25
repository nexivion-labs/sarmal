// ═══════════════════════════════════════════════════════════════════════════
// kurtarma-sozlesmesi.test.ts — 🩺 SEF-SZL-A01 · KURTARMA ŞEKLİ NÖBETLERİ
//
//   Motor bir Adımı BLOKLU mührüyle kapattığında kurtarma kararı üretir, kararı
//   durak ile kontrol noktasına taşır ve çevrim tavanı aşıldığında insana
//   eskalasyon yazar. Bu şeklin bugüne kadar hiçbir sözleşme ilanı yoktu;
//   mekanizmanın kendi kapanış hükmü sözleşmesiz uç bırakmamayı şart koştuğu
//   için ilan boşluğu kendi şartını çiğniyordu. SZL-KURTARMA o boşluğu kapatır.
//
//   BU NÖBETLER İKİ ŞEYİ AYRI AYRI ÖLÇER. Birincisi ilanın gerçekten motorun
//   ürettiği veriyi tarif ettiğidir: sözleşme metni ile motorun canlı çıktısı
//   karşılaştırılır, dolayısıyla ilan bir dilek listesi değil ölçülmüş bir
//   tariftir. İkincisi açık sınırın korunduğudur: kurtarma yolunun hangi
//   koşulda seçileceğini söyleyen strateji kapalı ürüne aittir ve açık tarafta
//   hiçbir seçim ağırlığı yazılı olamaz (STR-3).
// ═══════════════════════════════════════════════════════════════════════════
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { kurtar, basitKurtarma } from "../src/muzakere.ts";

const oku = (u: string): string => readFileSync(fileURLToPath(new URL(u, import.meta.url)), "utf8");
const MEKANIZMA = oku("../../../is/plan/mekanizma/mek_sef.sar");

/** Sözleşmenin ilan ettiği alan adları — kaynak metinden okunur, ezberden değil. */
function sozlesmeAlanlari(): string[] {
  const bas = MEKANIZMA.indexOf("Sözleşme( kod: SZL-KURTARMA");
  assert.notEqual(bas, -1, "SZL-KURTARMA ilanı mekanizmada yok — kurtarma şekli hâlâ sözleşmesiz");
  const gövde = MEKANIZMA.slice(bas, MEKANIZMA.indexOf("}", MEKANIZMA.indexOf("alanlar:", bas)));
  return [...gövde.matchAll(/^\s{6}([\wçğıöşüÇĞİÖŞÜ]+):\s*"/gm)].map((m) => m[1]);
}

// ── ① İLAN, MOTORUN GERÇEKTEN ÜRETTİĞİ VERİYİ TARİF EDER ───────────────────

test("A01: sözleşme, kurtarma kararının bugünkü şeklini eksiksiz tarif eder", () => {
  const alanlar = new Set(sozlesmeAlanlari());
  for (const beklenen of ["adım", "yol", "gerekçe", "deneme", "çevrimTavanı", "mühür", "bölmeÖnerisi", "hatırlatıcı", "durakİzi"]) {
    assert.ok(alanlar.has(beklenen),
      `SZL-KURTARMA "${beklenen}" alanını ilan etmiyor — Adımın kabul maddesi bu alanı şart koşar`);
  }
});

test("A01: ilan edilen her alan bir kaynak dosyasını ve satırını gösterir", () => {
  const bas = MEKANIZMA.indexOf("Sözleşme( kod: SZL-KURTARMA");
  const gövde = MEKANIZMA.slice(bas, MEKANIZMA.indexOf("}", MEKANIZMA.indexOf("alanlar:", bas)));
  for (const satir of gövde.split("\n")) {
    if (!/^\s{6}[\wçğıöşüÇĞİÖŞÜ]+:\s*"/.test(satir)) continue;
    assert.match(satir, /cekirdek\/src\/\w+\.ts:\d+/,
      `alan kaynağını göstermiyor: ${satir.trim()} — "her alan için kaynak dosya ile satır numarası kayıtlıdır" kabul maddesi`);
  }
});

test("A01: motorun ÜRETTİĞİ kurtarma kaydı ilan edilen şekle uyar", () => {
  // Üç yolun üçü de gerçekten koşturulur; şekil kaynaktan değil ÇIKTIDAN ölçülür.
  const bulgular = [{ kod: "X", ciddiyet: "hata", mesaj: "deneme bulgusu" }] as never;
  const yeniden = kurtar("ADM-X", 1, bulgular);
  assert.equal(yeniden.yol, "yeniden-dene");
  assert.ok(yeniden.gerekçe.trim().length > 0, "gerekçe alanı boş — sözleşme onu zorunlu ilan ediyor");

  const bol = kurtar("ADM-X", 2, bulgular);
  assert.equal(bol.yol, "böl");
  assert.ok(Array.isArray(bol.bölmeÖnerisi),
    "böl yolunda bölmeÖnerisi listesi yok — sözleşme bu alanı bu yola bağlar");

  const eskale = kurtar("ADM-X", 3, bulgular);
  assert.equal(eskale.yol, "eskale");
  assert.ok(eskale.hatırlatıcı && eskale.hatırlatıcı.trim().length > 0,
    "eskale yolunda hatırlatıcı kaydı yok — tavan aşıldığında insana giden iz kaybolur");
});

test("A01: şekli bozulan kayıt reddedilir — sözleşmenin zorunlu alanı eksik kalamaz", () => {
  // Sözleşme "yol" ve "gerekçe" alanlarını zorunlu ilan eder. Motorun ürettiği
  // her kararın bu ikisini taşıdığı, üç yolda da ayrı ayrı ölçülür; taşımayan
  // bir kayıt bu nöbette kırmızıya döner.
  for (const deneme of [1, 2, 3, 4]) {
    const karar = kurtar("ADM-Y", deneme, [] as never);
    assert.ok(typeof karar.yol === "string" && karar.yol.length > 0,
      `deneme ${deneme}: yol alanı yok — zorunlu alan eksik`);
    assert.ok(typeof karar.gerekçe === "string" && karar.gerekçe.length > 0,
      `deneme ${deneme}: gerekçe alanı yok — zorunlu alan eksik`);
  }
});

// ── ② AÇIK SINIR: seçim ağırlığı açık tarafta YAZILI DEĞİLDİR (STR-3) ──────

test("A01/STR-3: açık tarafta hiçbir kurtarma yolu seçim AĞIRLIĞI yazılı değildir", () => {
  // Açık taraftaki tek strateji, kendisini gösterim amaçlı ilan eden basit
  // sıradır: deneme sayısına bakar, bulgulara BAKMAZ. Gerçek politika (bulgu
  // ağırlığı, maliyet, geçmiş) kapalı üründe yaşar ve motora dışarıdan takılır.
  const agirBulgular = Array.from({ length: 50 }, () => ({ kod: "K", ciddiyet: "hata", mesaj: "ağır" })) as never;
  assert.equal(basitKurtarma("ADM-Z", 1, agirBulgular), basitKurtarma("ADM-Z", 1, [] as never),
    "açık strateji bulgu ağırlığına göre yol değiştiriyor — seçim politikası açık tarafa sızmış (STR-3)");
  assert.equal(basitKurtarma("ADM-Z", 2, agirBulgular), "böl");
  assert.equal(basitKurtarma("ADM-Z", 9, [] as never), "eskale",
    "tavan sonrası yol eskale olmalı — insana devir noktası açık tarafın ilan ettiği tek şeydir");

  // Sözleşmenin kendi metni de sınırı yazar; yazmazsa okuyucu politikayı burada arar.
  // Yorum satırı sarmaladığı için karşılaştırma satır başlarından arındırılır.
  const duz = MEKANIZMA.replace(/\n\s*\/\/\/?\s*/g, " ");
  assert.ok(/SINIR \(STR-3\)[^.]*STRATEJİ burada ilan EDİLMEZ/i.test(duz),
    "ilan, seçim politikasının kapalı üründe yaşadığını açıkça söylemiyor — sınır beyanı eksik");
  assert.ok(/seçim politikası kapalı üründe yaşar/i.test(duz),
    "politikanın nerede yaşadığı yazılmamış — okuyucu onu açık tarafta aramaya devam eder");
});

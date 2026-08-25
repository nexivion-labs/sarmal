// koniyaz.test.ts — ✍️ STR-4: runtime→plan geri-yazımı (adimGeriYaz) güvenceleri.
//   Geçici dizinde gerçek dosya: yaz → yeniden-oku → parse → alan doğrula; yorumlar
//   korunur; hedef yoksa/bozuksa DOSYAYA DOKUNULMAZ (fail-safe).

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { belirtecle } from "../src/belirtec.ts";
import { ayristir } from "../src/ayristirici.ts";
import { adimGeriYaz, muhurDurum } from "../src/koniYaz.ts";
import type { DonguSonuç } from "../src/dongu.ts";

const sonucYap = (mühür: DonguSonuç["mühür"], karar = "kabul"): DonguSonuç => ({
  adımKod: "A01", karar, mühür,
  iterasyonlar: [{ no: 0 } as never],
  gerekçe: { ne: "özet", kanıt: "x.test.ts:7" },
  ertelenenler: [],
});

const FIKSTUR = `// üst yorum — geri-yazım BUNA dokunmamalı
Blok( kod: BLK-T, ne: "t" ) {
  Katman( kod: FZ-T, ad: "f" ) {
    AltKatman( kod: KT-T, ad: "k" ) {
      // Adım yorumu — korunmalı
      Adım( kod: A01, ne: "iş", görev: "g",
            durum: beklemede,
            sınır: "s" )
    }
  }
}
`;

function fiksturYaz(icerik = FIKSTUR): string {
  const dizin = mkdtempSync(join(tmpdir(), "koniyaz-"));
  const yol = join(dizin, "plan.sar");
  writeFileSync(yol, icerik);
  return yol;
}

test("VERIFIED koşu → durum: tamamlandı + koşu: Koşum(...) yazılır; yorumlar korunur; re-parse temiz", () => {
  const yol = fiksturYaz();
  const gy = adimGeriYaz(yol, "A01", sonucYap("VERIFIED"), { tarih: "2026-07-10", model: "demo" });
  assert.equal(gy.yazildi, true, gy.sebep ?? "");
  const yeni = readFileSync(yol, "utf8");
  assert.ok(yeni.includes("durum: tamamlandı"), yeni);
  assert.ok(yeni.includes("koşu: Koşum( kod: KSM-A01"), yeni);
  assert.ok(yeni.includes("mühür: VERIFIED") && yeni.includes('kanıt: "x.test.ts:7"'));
  assert.ok(yeni.includes("// üst yorum") && yeni.includes("// Adım yorumu"), "yorumlar korunmalı");
  ayristir(belirtecle(yeni));   // yazılan dosya hâlâ geçerli .sar
});

test("BLOCKED koşu → durum: bloklu (STR-4 uçucu-sonuç kalıcılaştı)", () => {
  const yol = fiksturYaz();
  const gy = adimGeriYaz(yol, "A01", sonucYap("BLOCKED", "red"));
  assert.equal(gy.yazildi, true, gy.sebep ?? "");
  assert.ok(readFileSync(yol, "utf8").includes("durum: bloklu"));
});

test("ikinci koşu ÜSTÜNE yazar — tek koşu kaydı kalır (son koşu kazanır)", () => {
  const yol = fiksturYaz();
  adimGeriYaz(yol, "A01", sonucYap("BLOCKED", "red"));
  const gy2 = adimGeriYaz(yol, "A01", sonucYap("VERIFIED"));
  assert.equal(gy2.yazildi, true, gy2.sebep ?? "");
  const yeni = readFileSync(yol, "utf8");
  assert.equal(yeni.match(/Koşum\(/g)?.length, 1, "tek Koşum kaydı kalmalı");
  assert.ok(yeni.includes("durum: tamamlandı") && yeni.includes("mühür: VERIFIED"));
});

test("durum parametresi hiç yoksa eklenir (Adım açılışına)", () => {
  const yol = fiksturYaz(FIKSTUR.replace("            durum: beklemede,\n", ""));
  const gy = adimGeriYaz(yol, "A01", sonucYap("VERIFIED"));
  assert.equal(gy.yazildi, true, gy.sebep ?? "");
  const yeni = readFileSync(yol, "utf8");
  assert.ok(yeni.includes("durum: tamamlandı"));
  ayristir(belirtecle(yeni));
});

test("olmayan Adım kodu → yazilmadi + dosya DEĞİŞMEDİ (fail-safe)", () => {
  const yol = fiksturYaz();
  const gy = adimGeriYaz(yol, "YOK-BOYLE", sonucYap("VERIFIED"));
  assert.equal(gy.yazildi, false);
  assert.ok(gy.sebep?.includes("YOK-BOYLE"));
  assert.equal(readFileSync(yol, "utf8"), FIKSTUR, "dosya bit-birebir aynı kalmalı");
});

test("muhurDurum eşlemesi (YAS-4 · KNT-A09): VERIFIED→tamamlandı · COMPLETED→doğrulanmamış · BLOCKED→bloklu", () => {
  // Eski iddia (COMPLETED→tamamlandı) yanlış değil EKSİKTİ: kanıtsız teslim kanıtlı
  // kapanıştan ayırt edilemiyordu — YAS-4 dördüncü değeri tam bunun için doğdu.
  assert.equal(muhurDurum("VERIFIED"), "tamamlandı");
  assert.equal(muhurDurum("COMPLETED"), "doğrulanmamış");
  assert.equal(muhurDurum("BLOCKED"), "bloklu");
});

test("YAS-4: COMPLETED koşu → plana durum: doğrulanmamış yazılır (kanıtsız teslim planda dürüst)", () => {
  const yol = fiksturYaz();
  const gy = adimGeriYaz(yol, "A01", sonucYap("COMPLETED"));
  assert.equal(gy.yazildi, true, gy.sebep ?? "");
  const yeni = readFileSync(yol, "utf8");
  assert.ok(yeni.includes("durum: doğrulanmamış"), yeni);
  assert.ok(yeni.includes("mühür: COMPLETED"), yeni);
});

test("YAS-4: elle doğrulanmamış→tamamlandı YAZ-ANINDA RED (kanıtsız terfi kapalı); geliştirmede'ye dönüş serbest", async () => {
  const { adimDurumYaz } = await import("../src/koniYaz.ts");
  const yol = fiksturYaz(FIKSTUR.replace("durum: beklemede", "durum: doğrulanmamış"));
  const red = adimDurumYaz(yol, "A01", "tamamlandı");
  assert.equal(red.yazildi, false);
  // MDR-A06: sebep metninde iç karar numarası YAŞAMAZ; iddia hükmün kendisine bağlanır.
  assert.match(red.sebep ?? "", /kanıtsız iş bitmiş ilan edilemez/, red.sebep ?? "sebep yok");
  assert.ok(readFileSync(yol, "utf8").includes("durum: doğrulanmamış"), "dosyaya dokunulmamalı");
  const geri = adimDurumYaz(yol, "A01", "geliştirmede");   // meşru: yeniden çalışmaya dönüş
  assert.equal(geri.yazildi, true, geri.sebep ?? "");
});

// ── SENK-A05 yazma kilidi (lig uzlaşısı: TEK-YAZAR) ───────────────────────────
test("yazma kilidi: kilit doluyken adimGeriYaz dosyaya DOKUNMAZ; kilit boşalınca yazar", async () => {
  const { yazmaKilidiAl } = await import("../src/koniYaz.ts");
  const { mkdtempSync, writeFileSync, readFileSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const dir = mkdtempSync(join(tmpdir(), "kilit-"));
  try {
    const dosya = join(dir, "plan.sar");
    writeFileSync(dosya, 'Blok( kod: BLK-K, ne: "x" ) { Katman( kod: FZ-K, ad: "f" ) { AltKatman( kod: KT-K, ad: "k" ) {\n  Adım( kod: ADM-K, durum: beklemede, ne: "n" )\n} } }\n');
    // kilidi ELLE tut (ikinci yazar simülasyonu) — adimGeriYaz fail-safe dönmeli
    const birak = yazmaKilidiAl(dosya);
    assert.ok(birak, "ilk kilit alınmalı");
    const t0 = Date.now();
    const sonuc = adimGeriYaz(dosya, "ADM-K", sonucYap("VERIFIED"), { tarih: "2026-07-10", model: "test" });
    assert.equal(sonuc.yazildi, false);
    assert.match(sonuc.sebep ?? "", /kilid/);
    assert.ok(Date.now() - t0 >= 1500, "kilit beklemesi gerçekleşmeli (~2sn)");
    assert.ok(!readFileSync(dosya, "utf8").includes("Koşum"), "dosyaya dokunulmamalı");
    birak!();
    // kilit boş — yazım başarılı
    const s2 = adimGeriYaz(dosya, "ADM-K", sonucYap("VERIFIED"), { tarih: "2026-07-10", model: "test" });
    assert.equal(s2.yazildi, true, "kilit boşken yazmalı: " + (s2.sebep ?? ""));
    assert.ok(readFileSync(dosya, "utf8").includes("Koşum"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── HALKA-IZLE-A02: canlı durum yayını (adimDurumYaz) ─────────────────────────
test("adimDurumYaz: durum kilit altında yazılır (geliştirmede→bloklu geri-alınabilir); yok-Adım fail-safe", async () => {
  const { adimDurumYaz } = await import("../src/koniYaz.ts");
  const yol = fiksturYaz();
  const s1 = adimDurumYaz(yol, "A01", "geliştirmede");
  assert.equal(s1.yazildi, true, s1.sebep ?? "");
  assert.ok(readFileSync(yol, "utf8").includes("durum: geliştirmede"));
  const s2 = adimDurumYaz(yol, "A01", "beklemede");   // BLOCKED → beklemede geri-alma yolu
  assert.equal(s2.yazildi, true, s2.sebep ?? "");
  assert.ok(readFileSync(yol, "utf8").includes("durum: beklemede"));
  const yok = adimDurumYaz(yol, "A-HAYALET", "geliştirmede");
  assert.equal(yok.yazildi, false);
  // yorumlar korunur (string-splice — AST yeniden-yazımı yok)
  assert.ok(readFileSync(yol, "utf8").includes("üst yorum — geri-yazım BUNA dokunmamalı"));
});

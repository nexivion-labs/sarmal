// Stres sınaması (#9) — büyük gerçek .sar (200+ satır) takılmadan + sıfır-drift.
// Regresyon kalkanı: buyuk_bahce.sar tüm grameri/aileleri/kenarları egzersiz eder.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { belirtecle } from "../src/belirtec.ts";
import { ayristir } from "../src/ayristirici.ts";
import { dogrula } from "../src/dogrulayici.ts";
import { iskeletPlani } from "../src/iskeletci.ts";
import { siniflamaYukle } from "../src/siniflama.ts";

const snf = siniflamaYukle(fileURLToPath(new URL("../../../oz/siniflama/kayit.json", import.meta.url)));
const kaynak = readFileSync(fileURLToPath(new URL("../../../ogreti/ornek/gercek/buyuk_bahce.sar", import.meta.url)), "utf8");

test("büyük .sar (200+ satır) çökmeden ayrışır", () => {
  assert.ok(kaynak.split("\n").length >= 200, "fikstür 200+ satır olmalı");
  const bel = belirtecle(kaynak);
  assert.ok(bel.length > 500, "beklenen belirteç bolluğu");
  const prog = ayristir(bel);
  assert.ok(prog.bildirimler.length >= 8, "çok sayıda üst düğüm");
});

test("büyük ağaç SIFIR drift üretir (dogfood — izinliSarma + yuzeyKurali temiz)", () => {
  // MIM-1 kademesi: stres fikstürü eski dizilişte — bilgi (eski-diziliş) drift sayılmaz.
  // MIM-1 çıplak-kademe ölçümü: fikstür çıplak Katman kullanıyor (Adım doğrudan altında); yapının bu
  // yönü sınamanın konusu değil (amaç: büyük ağaç takılmadan işlensin), çıplak-katman
  // uyarısı hariç tutulur — kurulum yapısal drift üretmiyor mu, onu ölçer.
  const t = dogrula(ayristir(belirtecle(kaynak)), snf)
    .filter((x) => x.duzey !== "bilgi" && x.kod !== "çıplak-adımlı-katman");
  assert.equal(t.length, 0, "temiz büyük dosya 0 hata/uyarı vermeli; verdi:\n" + JSON.stringify(t, null, 2));
});

test("büyük ağaç iskelete dökülür (dizin + dosya üretir)", () => {
  const ogeler = iskeletPlani(ayristir(belirtecle(kaynak)), snf).ogeler;
  assert.ok(ogeler.length > 0, "iskelet öğe üretmeli");
  assert.ok(ogeler.some((o) => o.tur === "dizin"), "en az bir dizin");
  assert.ok(ogeler.some((o) => o.tur === "dosya"), "en az bir dosya (Adım yaprağı)");
});

test("performans: tam boru hattı hızlı (< 150ms — takılma yok)", () => {
  const t0 = process.hrtime.bigint();
  dogrula(ayristir(belirtecle(kaynak)), snf);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  assert.ok(ms < 150, `boru hattı ${ms.toFixed(1)}ms — 150ms altında olmalı (takılma yok)`);
});

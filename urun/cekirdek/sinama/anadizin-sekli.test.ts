// ═══════════════════════════════════════════════════════════════════════════
// anadizin-sekli.test.ts — 🏛️ MIM-3.1 ÇEKİRDEK BEKÇİSİNİN ALTIN-TESTİ (B-06)
//
//   anadizin-plan-karışması HATA düzeyli bir yapısal bekçidir: anadizin MİMARİ
//   çizer (Kitaplık/Raf/yol), plan (Faz→Blok→Katman→Adım) plan/ rafında AYRI
//   .sar'da yaşar. Bu HATA yolunun regresyon testi yoktu (114 tanıdan yalnız
//   ikisi testsizdi); motor refaktörü onu sessizce devre dışı bırakabilirdi.
//   motor-guven felsefesi: "teftişte SESSİZ geçen deliğin kapanış kanıtı —
//   bir daha sessiz geçemez."
// ═══════════════════════════════════════════════════════════════════════════
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { belirtecle } from "../src/belirtec.ts";
import { ayristir } from "../src/ayristirici.ts";
import { anadizinSekliTanilari } from "../src/denetci.ts";
import { dogusManifesti } from "../src/dogus.ts";
import type { Siniflama } from "../src/siniflama.ts";
import { DOGUS_TARIHI, DUZEN, VARSAYILAN_AD } from "./dogus-agaci.ts";

const SNF: Siniflama = JSON.parse(
  readFileSync(fileURLToPath(new URL("../../../oz/siniflama/kayit.json", import.meta.url)), "utf8"));
const parse = (k: string) => ayristir(belirtecle(k));

test("anadizin-plan-karışması: anadizin kökü DOĞRUDAN Faz içerirse HATA (MIM-3.1)", () => {
  const ana = parse('Proje( kod: PRJ-X, ad: "x", ne: "deneme" ) { Faz( kod: FAZ-X, ad: "mvp", ne: "dönem" ) { } }');
  const t = anadizinSekliTanilari(ana, SNF);
  assert.equal(t.length, 1, JSON.stringify(t));
  assert.equal(t[0].kod, "anadizin-plan-karışması");
  assert.equal(t[0].duzey, "hata");
});

test("anadizin-plan-karışması: kök altındaki (derin) Blok da yakalanır (MIM-3.1)", () => {
  const ana = parse('Uygulama( kod: UYG-X, ad: "x", ne: "deneme" ) { Blok( kod: BLK-X, ne: "iş" ) { } }');
  const t = anadizinSekliTanilari(ana, SNF).filter((x) => x.kod === "anadizin-plan-karışması");
  assert.equal(t.length, 1, JSON.stringify(t));
  assert.equal(t[0].duzey, "hata");
});

test("anadizin-plan-karışması: yalnız mimari (Raf) taşıyan anadizin TEMİZ", () => {
  const ana = parse('Proje( kod: PRJ-Y, ad: "y", ne: "deneme" ) { Raf( kod: RAF-PLAN, yol: "plan/", ne: "plan rafı" ) }');
  const t = anadizinSekliTanilari(ana, SNF).filter((x) => x.kod === "anadizin-plan-karışması");
  assert.equal(t.length, 0, JSON.stringify(t));
});

test("anadizin şekli: doğuş paketinin yazdığı proje ve çatı giriş ilanları bekçiden TEMİZ geçer (HST-MTR-A07)", () => {
  // Gerçek ağaç: giriş ilanları elle yazılmaz, paketin kendi manifestinden okunur.
  const proje = dogusManifesti(VARSAYILAN_AD, DOGUS_TARIHI).find((d) => d.yol === DUZEN.anadizin);
  const cati = dogusManifesti("cati", DOGUS_TARIHI, "calisma-alani").find((d) => d.yol.endsWith("_anadizin.sar") && !d.yol.includes("/"));
  assert.ok(proje && cati, "doğuş manifesti proje ve çatı giriş ilanlarını taşımalı");
  for (const giris of [proje, cati]) {
    assert.deepEqual(anadizinSekliTanilari(parse(giris.icerik), SNF), [], `${giris.yol} şekil tanısı almamalı`);
  }
});

test("anadizin-plan-karışması: kök YOK (plan-fragmanı) → bu bekçinin işi değil, TEMİZ", () => {
  const ana = parse('Blok( kod: BLK-FRG, ne: "plan fragmanı" ) { }');
  const t = anadizinSekliTanilari(ana, SNF).filter((x) => x.kod === "anadizin-plan-karışması");
  assert.equal(t.length, 0, JSON.stringify(t));
});

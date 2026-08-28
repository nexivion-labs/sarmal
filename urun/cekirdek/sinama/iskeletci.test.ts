// İskeletçi sınamaları (node:test) — saf plan (diske dokunmaz).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { belirtecle } from "../src/belirtec.ts";
import { ayristir } from "../src/ayristirici.ts";
import { iskeletPlani } from "../src/iskeletci.ts";
import { siniflamaYukle } from "../src/siniflama.ts";

const snf = siniflamaYukle(fileURLToPath(new URL("../../../oz/siniflama/kayit.json", import.meta.url)));
const ornek = readFileSync(fileURLToPath(new URL("../../../ogreti/ornek/gercek/blok_kimlik.sar", import.meta.url)), "utf8");
const plan = () => iskeletPlani(ayristir(belirtecle(ornek)), snf);

test("örnek ağaç doğru klasör/dosya planına dökülür", () => {
  const yollar = plan().ogeler.map((o) => `${o.tur} ${o.yol}`);
  assert.deepEqual(yollar, [
    "dizin kimlik",
    "dizin kimlik/onyuz",
    "dizin kimlik/onyuz/ekranlar",
    "dosya kimlik/onyuz/ekranlar/giris_ekrani.md",
    "dosya kimlik/onyuz/ekranlar/kayit_ekrani.md",
    "dizin kimlik/arkayuz",
    "dizin kimlik/arkayuz/servisler",
    "dosya kimlik/arkayuz/servisler/kimlik_servisi.md",
    // MIM-1.7 (Founder hükmü 2026-08-28): arkayüzün iki kodlama kademesi tek
    // kademede birleşti, dolayısıyla kimlik tablosu artık servisler klasöründe
    // yaşıyor. İki Adım da FASTAPI'ye bağlıdır ve ayrı bir teknoloji dilimi
    // değildir; ayrı klasör onları yanlışlıkla ayrı bir sorumluluk gibi
    // gösteriyordu.
    "dosya kimlik/arkayuz/servisler/kimlik_tablosu.md",
    "dizin kimlik/guvenlik",
    "dizin kimlik/guvenlik/jeton",
    "dosya kimlik/guvenlik/jeton/jeton_dogrula.md",
  ]);
});

test("çağır/Tip/Karar iskelet dışı bırakılır (spine değil)", () => {
  const dizinAdlari = plan().ogeler.filter((o) => o.tur === "dizin").map((o) => o.yol);
  assert.ok(!dizinAdlari.some((y) => /flutter|fastapi|giris_ekrani-tip|oturum/i.test(y)));
});

test("Adım dosyası bağlam-konisi + kenarları içerir", () => {
  const adim = plan().ogeler.find((o) => o.yol.endsWith("giris_ekrani.md"))!;
  const ic = adim.icerik ?? "";
  assert.match(ic, /## görev/);
  assert.match(ic, /## dokunulmaz/);
  assert.match(ic, /## sınır/);
  assert.match(ic, /## bağlar \(kenarlar\)/);
  assert.match(ic, /bağımlı: FLUTTER/);
  assert.match(ic, /kod: ADM-GIRIS/);
});

test("Türkçe ad ASCII kebap dosya adına indirilir (ad-standardı)", () => {
  // "Görüş Alanı" gibi Türkçe ad → gorus_alani (DIL-1.2 alt-çizgi)
  const p = iskeletPlani(ayristir(belirtecle('Katman( kod: K, ad: "Görüş Alanı" ){ Adım( kod: A, ad: "Öntanım İş" ) }')), snf);
  const yollar = p.ogeler.map((o) => o.yol);
  assert.deepEqual(yollar, ["gorus_alani", "gorus_alani/ontanim_is.md"]);
});

// ── GBR-A07 (IDA dogfood #10): kök-olmayan temel/plan düğümü yol: okur ────────
//   Uygulama/Blok/Katman klasör segmentini yol:'dan alır (yoksa ad/kod'dan);
//   yol:"." → kendi klasörünü açmaz (Kitaplık(yol:X)+eşadlı Uygulama çift-yol panzehiri).
const yollari = (src: string) => iskeletPlani(ayristir(belirtecle(src)), snf).ogeler.map((o) => `${o.tur} ${o.yol}`);

test("GBR-A07: kök-olmayan Uygulama yol: verildiğinde o segment (ad'ı değil) kullanılır", () => {
  const y = yollari(`Proje( kod: PRJ-T, ad: "t", ne: "x" ) {
  Kitaplık( kod: KTP, yol: "tanitim/", ne: "k" ) {
    Uygulama( kod: UYG, ad: "tanitim", yol: "web", ne: "y" )
  }
}`);
  assert.ok(y.includes("dizin tanitim/web"), "yol: segmenti kullanılmalı (tanitim/web); gelen: " + JSON.stringify(y));
  assert.ok(!y.some((s) => /tanitim\/tanitim/.test(s)), "ad'dan çift-yol ('tanitim/tanitim') ÜRETİLMEMELİ");
});

test("GBR-A07: yol: YOKKEN ad/kod'dan segment (mevcut davranış korunur — regresyon yok)", () => {
  const y = yollari(`Proje( kod: PRJ-T, ad: "t", ne: "x" ) {
  Kitaplık( kod: KTP, yol: "uygulamalar/", ne: "k" ) {
    Uygulama( kod: UYG, ad: "tanitim", ne: "y" )
  }
}`);
  assert.ok(y.includes("dizin uygulamalar/tanitim"), "yol: yokken ad'dan segment (uygulamalar/tanitim); gelen: " + JSON.stringify(y));
});

test("GBR-A07: yol:'.' → düğüm kendi klasörünü AÇMAZ (ebeveynde yaşar · çift-yol panzehiri)", () => {
  const y = yollari(`Proje( kod: PRJ-T, ad: "t", ne: "x" ) {
  Kitaplık( kod: KTP, yol: "tanitim/", ne: "k" ) {
    Uygulama( kod: UYG, ad: "tanitim", yol: ".", ne: "y" ) {
      Raf( kod: RAF-E, yol: "ekranlar/", ne: "e" )
    }
  }
}`);
  assert.ok(!y.some((s) => /tanitim\/tanitim/.test(s)), "yol:'.' ile çift-yol OLMAMALI; gelen: " + JSON.stringify(y));
  assert.ok(y.includes("dizin tanitim/ekranlar"), "Uygulama çocuğu ebeveyn (tanitim/) altında yaşamalı; gelen: " + JSON.stringify(y));
});

test("GBR-A07: plan-ailesi (Katman) da yol: okur (temel/plan aynı dal)", () => {
  const y = yollari(`Blok( kod: BLK-T, ne: "iş" ) {
  Katman( kod: KAT-T, ad: "onyuz", yol: "istemci", ne: "k" )
}`);
  assert.ok(y.includes("dizin blk_t/istemci"), "Katman yol: segmenti (blk_t/istemci); gelen: " + JSON.stringify(y));
});

// ── MIM-1.4 (GBR-A11): teknoloji-ailesi `ayakizi:` beyanı — ilanın dizinine göreli toplanır ──
test("MIM-1.4 (GBR-A11): ayakizi izleri ilanın yaşadığı dizine göreli toplanır; teknoloji iskelet üretmez", () => {
  const kaynak = `Proje( kod: ANA, ad: "t", ne: "x" ) {
  Teknoloji( kod: TEK-TS, ne: "TypeScript", ayakizi: [ "tsconfig.json" ] )
  Uygulama( kod: UYG-T, ad: "tanitim", ne: "y", yol: "tanitim" ) {
    Araç( kod: ARC-PNPM, ne: "paket yöneticisi", ayakizi: [ "pnpm-lock.yaml", "uretilen/" ] )
  }
}`;
  const p = iskeletPlani(ayristir(belirtecle(kaynak)), snf);
  assert.deepEqual(p.ayakIzleri!.map((i) => `${i.teknoloji} ${i.yol}`), [
    "TEK-TS tsconfig.json",             // kök ilanı → hedef köke göreli
    "ARC-PNPM tanitim/pnpm-lock.yaml",  // Uygulama içi ilan → tanitim/ dizinine göreli
    "ARC-PNPM tanitim/uretilen",        // dizin izi — kuyruk '/' normalize edilir
  ]);
  // teknoloji-ailesi spine değildir: iz toplanır ama iskelet öğesi üretilmez
  assert.ok(!p.ogeler.some((o) => /tek_ts|arc_pnpm/i.test(o.yol)), JSON.stringify(p.ogeler.map((o) => o.yol)));
});

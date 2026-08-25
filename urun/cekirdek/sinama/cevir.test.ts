// cevir.test.ts — çeviri katmanı (3 sözlük) sınamaları

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { cevir, zorunluKenarIngilizcesi } from "../src/cevir.ts";

test("① i18n: Ekran → Screen (keyword TR→EN)", () => {
  assert.equal(cevir("Ekran").i18n?.diller.en, "Screen");
});

test("① i18n ters: Screen → Ekran (EN→kanonik TR)", () => {
  assert.equal(cevir("Screen").i18n?.kanonik, "Ekran");
});

test("② stack: kapsayıcı → Container / <div> / ZStack (kanondan — TIP-3)", () => {
  const c = cevir("kapsayıcı");
  assert.equal(c.stack?.hedefler.flutter, "Container");
  assert.equal(c.stack?.hedefler.react, "<div>");
});

test("② stack kanon genişliği: mantik ve matematik bölümleri de çevrilir (ikizde yoktu)", () => {
  assert.ok(cevir("süz").stack, "mantik.süz kanondan çevrilmeli");
  assert.ok(cevir("koşul").stack, "mantik.koşul kanondan çevrilmeli");
});

test("② stack arkayüz: uç → FastAPI/Express", () => {
  const c = cevir("uç");
  assert.ok(c.stack?.hedefler.python?.includes("app"));
});

test("③ terim: hover ↔ üzerine gelme (TR↔EN)", () => {
  const c = cevir("hover");
  assert.ok(c.terim);
  assert.match(c.terim!.en, /hover/i);
});

test("çok-katman: Metin hem i18n (keyword) hem stack (kod)", () => {
  const c = cevir("Metin");
  assert.equal(c.i18n?.diller.en, "Text");        // keyword: Metin→Text
  assert.equal(c.stack?.hedefler.flutter, "Text"); // stack: metin→Text
});

test("bilinmeyen kelime → bulundu:false", () => {
  assert.equal(cevir("xyzzy123").bulundu, false);
});

test("katalog dışı dokuz zorunluKenar tanısının İngilizce yüzü sözlükten çözülür", () => {
  const kanon = JSON.parse(readFileSync(
    fileURLToPath(new URL("../../../oz/siniflama/kayit.json", import.meta.url)), "utf8",
  )) as {
    widgetTipleri: Array<{ ad: string; ne: string }>;
    zorunluKenarlar: Record<string, Array<{ grup: string[]; tanı: string }>>;
  };
  const kimlikler = new Set<string>();
  for (const [tip, kurallar] of Object.entries(kanon.zorunluKenarlar)) {
    const ne = kanon.widgetTipleri.find((t) => t.ad === tip)?.ne ?? "";
    for (const kural of kurallar) {
      kimlikler.add(kural.tanı);
      const metin = zorunluKenarIngilizcesi(tip, "KOD-ORNEK", kural.grup, ne);
      assert.doesNotMatch(
        `${metin.mesaj}\n${metin.oneri}`,
        /[çğıöşüÇĞİÖŞÜ]/u,
        `${kural.tanı}: İngilizce yüzde çevrilmemiş Türkçe ad kaldı`,
      );
      assert.match(metin.mesaj, /\bis missing\b/u);
      assert.match(metin.oneri, /\bAdd at least one\b/u);
    }
  }
  assert.equal(kimlikler.size, 9, "zorunluKenarlar kümesi dokuz ayrı tanı kimliğidir");
});

// ── ④ SARMAL'IN KENDİ KAVRAMLARI (V1B-KAVRAM-A01) ───────────────────────────
//   Ölçüm 2026-08-22'de şunu gösterdi: `koni` dört belgede geçiyordu ve hiçbir
//   yerde tanımlı değildi; `kavuşum` motorca zorlanıyordu fakat kavram aracı
//   onu hiç bulamıyordu ve "kanonda böyle bir kavram yaşamıyor" diyordu, oysa
//   kavram kanonda yaşıyordu. Sorgu yüzeyi ile kanonun ayrışması, aracın
//   kullanıcıya yanlış bilgi vermesi demektir; bu nöbetler o ayrışmayı kapatır.

test("④ Sarmal'ın kendi kavramları sorgulanabilir ve kanonik dayanağını taşır", () => {
  for (const kavram of ["koni", "kavuşum"]) {
    const c = cevir(kavram);
    assert.equal(c.bulundu, true, `'${kavram}' sorgusu boş döndü — kavram aracı kanonda yaşayan bir kavramı bulamıyor`);
    assert.ok(c.sarmal, `'${kavram}' Sarmal kavramı olarak çözülmedi`);
    assert.equal(c.sarmal!.kavram, kavram);
    assert.ok(c.sarmal!.tanim.length > 120, `'${kavram}' tanımı bir cümlelik etiketten ibaret — kavram öğretilmiyor`);
    assert.ok(c.sarmal!.dayanak.length > 20,
      `'${kavram}' kanonik dayanağını söylemiyor; dayanaksız tanım, kaynağından koparılmış ikizdir (YUZ-1.2)`);
  }
});

test("④ İngilizce karşılık da aynı kavrama çözülür", () => {
  assert.equal(cevir("cone").sarmal?.kavram, "koni");
  assert.equal(cevir("convergence").sarmal?.kavram, "kavuşum");
});

test("④ dördüncü sözlük ötekileri gölgelemez: tasarım kavramı hâlâ stack'e çözülür", () => {
  const c = cevir("kapsayıcı");
  assert.ok(c.stack, "tasarım sözlüğü kapandı — dördüncü katman ötekilerin önüne geçmiş olabilir");
  assert.equal(c.sarmal, undefined, "tasarım kavramı yanlışlıkla Sarmal kavramı sayılmış");
});

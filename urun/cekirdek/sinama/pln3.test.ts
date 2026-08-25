// PLN-3 sınamaları: P1 kök=dizin · P2 Raf · RPR-1 bulguları (exit-code, dizin sayacı).
// MDR-A04 bağ sınıflandırması: bu dosyadaki mesaj-metnine dokunan assert'ler ya kod-çıpalı ikincil kontroldür ya da bilinçli metin sözleşmesidir (nöbet); çıpasız tanı araması yasaktır. Tam döküm: nitelik/motor_tani_envanteri.sar (MDR-A04 bölümü).
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { belirtecle } from "../src/belirtec.ts";
import { ayristir } from "../src/ayristirici.ts";
import { siniflamaYukle } from "../src/siniflama.ts";
import { iskeletPlani, iskeletYaz } from "../src/iskeletci.ts";

const SNF = siniflamaYukle(new URL("../../../oz/siniflama/kayit.json", import.meta.url).pathname);
const CLI = new URL("../src/sarmal.ts", import.meta.url).pathname;

const KAYNAK = `Proje( kod: ANA, ad: "cicek" ) {
  Kitaplık( kod: KTP-YASA, yol: "yasa/" ) { Raf( kod: RAF-GENEL, yol: "genel_kurallar/" ) }
  Blok( kod: BLK-B, ad: "bahce" ) { Katman( kod: FAZ-F, ad: "onyuz" ) {
    AltKatman( kod: KAT-K, ad: "ekim" ) { Adım( kod: ADM-A, ad: "tohum", görev: "ek" ) } } }
}`;

test("P1 kök=dizin: kök Proje kendine klasör açmaz — çocuklar doğrudan hedefte", () => {
  const plan = iskeletPlani(ayristir(belirtecle(KAYNAK)), SNF);
  const yollar = plan.ogeler.map((o) => o.yol);
  assert.ok(!yollar.some((y) => y.startsWith("cicek")), "kök sarmalayıcı olmamalı");
  assert.ok(yollar.includes("bahce"), "Blok doğrudan kökte");
  assert.ok(yollar.includes("yasa"), "Raf doğrudan kökte");
});

test("P2 Raf: yol parametresinden iç içe dizin + içerikSerbest imi", () => {
  const plan = iskeletPlani(ayristir(belirtecle(KAYNAK)), SNF);
  const raf = plan.ogeler.find((o) => o.yol === "yasa/genel_kurallar");
  assert.ok(raf, "iç içe raf planda olmalı");
  assert.equal(raf!.tur, "dizin");
  assert.equal(raf!.icerikSerbest, true);
  const blok = plan.ogeler.find((o) => o.yol === "bahce");
  assert.ok(!blok!.icerikSerbest, "plan dizini serbest DEĞİL (omurga)");
});

test("RPR-1 bulgu 2: tekrar iskelet — var olan dizinler 'atlandı' sayılır", () => {
  const kok = mkdtempSync(join(tmpdir(), "sarmal-pln3-"));
  try {
    const plan = iskeletPlani(ayristir(belirtecle(KAYNAK)), SNF);
    const ilk = iskeletYaz(plan, kok);
    assert.ok(ilk.every((u) => u.durum === "oluşturuldu"));
    const ikinci = iskeletYaz(plan, kok);
    assert.ok(ikinci.every((u) => u.durum === "atlandı"), "ikinci koşuda HER ŞEY atlanmalı");
  } finally {
    rmSync(kok, { recursive: true, force: true });
  }
});

test("RPR-1 bulgu 1: tek-dosya drift → çıkış kodu 4 (denetle ile TEK sözleşme)", () => {
  const kok = mkdtempSync(join(tmpdir(), "sarmal-exit-"));
  try {
    const yol = join(kok, "bozuk.sar");
    writeFileSync(yol, 'Ekrann( kod: E )\n', "utf8");
    let kod = 0;
    try {
      execFileSync(process.execPath, [CLI, yol], { encoding: "utf8" });
    } catch (e: any) {
      kod = e.status;
    }
    assert.equal(kod, 4);
  } finally {
    rmSync(kok, { recursive: true, force: true });
  }
});

test("P2 denetle: kayıp raf = hata; raf içindeki ilansız dosya = SESSİZ (içerik serbest)", async () => {
  const { denetle, diskTara } = await import("../src/denetci.ts");
  const kok = mkdtempSync(join(tmpdir(), "sarmal-raf-"));
  try {
    const plan = iskeletPlani(ayristir(belirtecle(KAYNAK)), SNF);
    iskeletYaz(plan, kok);
    writeFileSync(join(kok, "yasa/genel_kurallar/yeni-kural.md"), "---\nkod: X\n---\n", "utf8");
    const temiz = denetle(plan, diskTara(kok));
    assert.equal(temiz.length, 0, "raf içi dosya yetim SAYILMAMALI");
    rmSync(join(kok, "yasa/genel_kurallar"), { recursive: true });
    const kayip = denetle(plan, diskTara(kok));
    assert.ok(kayip.some((t) => t.kod === "kayıp-yapı" && t.mesaj.includes("genel_kurallar")));
  } finally {
    rmSync(kok, { recursive: true, force: true });
  }
});


test("metafor: Raf içinde Raf = izinsiz-sarma (Kitaplık › Raf › Kitap)", async () => {
  const { dogrula } = await import("../src/dogrulayici.ts");
  const t = dogrula(ayristir(belirtecle('Raf( kod: R1, yol: "a/" ) { Raf( kod: R2, yol: "b/" ) }')), SNF);
  assert.ok(t.some((x) => x.kod === "izinsiz-sarma"));
});

test("çalışma alanında ÇOK proje: her biri kendi dizinini alır", () => {
  const k = 'ÇalışmaAlanı( kod: CA, ad: "bahce" ) {\n  Proje( kod: P1, ad: "elma" )\n  Proje( kod: P2, ad: "armut" )\n}';
  const plan = iskeletPlani(ayristir(belirtecle(k)), SNF);
  const yollar = plan.ogeler.map((o) => o.yol);
  assert.ok(yollar.includes("elma") && yollar.includes("armut"));
});

test("kompakt raflar: Kitaplık( raflar: {src: \"...\"} ) → alt dizinler (satır numaralı)", () => {
  const k = 'Kitaplık( kod: K1, yol: "cekirdek/", raflar: { src: "motor", sinama: "testler" } )';
  const plan = iskeletPlani(ayristir(belirtecle(k)), SNF);
  const src = plan.ogeler.find((o) => o.yol === "cekirdek/src");
  assert.ok(src && src.icerikSerbest && (src.satir ?? 0) > 0);
  assert.ok(plan.ogeler.some((o) => o.yol === "cekirdek/sinama"));
});
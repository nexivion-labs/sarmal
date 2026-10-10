// ═══════════════════════════════════════════════════════════════════════════
// ad-alani-dogrulama.test.ts — 🧭 KPS-ADA-A01 · Ad alanlı atıfın ÜÇ DURUMLU doğrulanması (ORK-4)
//
//   Altıncı görev (kontrolcü ölçümü 2026-09-09): ad alanlı atıf MUAF TUTULMAKTAN
//   çıkıp DOĞRULANIR hâle gelsin. Kardeş kök çözülebiliyorsa hedef gerçekten
//   doğrulanır ve bulunmazsa HATADIR; kök çözülemiyorsa atıf kırık sayılmaz,
//   fakat muafiyetin kendisi UYARI olarak adıyla bildirilir. Sessiz yeşil yoktur.
//
//   Ölçülmüş kusur (2026-09-19): denetim, gezinme yüzünün üç cevabını (çözüldü ·
//   gerçekten kırık · ölçülemez) tek "bu KOD hiçbir .sar'da tanımlı değil"
//   cümlesine indiriyordu; çatısı görünmeyen bir kökten koşulduğunda doğru
//   yazılmış bir çapraz atfı kırık ilan ediyor, iki yüzey aynı hedef için
//   farklı hüküm veriyordu. Kapalı üründe kasıtlı iki yanlış atıfla ölçüldü:
//   bilinen ad alanında yok kod → hata, bilinmeyen ad alanı → uyarı.
//
//   MUTASYON KANITI (2026-09-19 · her satır geri alındı, cmp ile bayt eşliği doğrulandı):
//   ① `adAlaniBilinir` hep `true` dönünce altı nöbetin üçü kırmızı (ölçülemez
//      dalı hiç açılmaz, bilinmeyen ad alanı hata okunur);
//   ② `adAlaniKusuru` hep `undefined` dönünce altı nöbetin dördü kırmızı (kusur
//      `kenar`, eski "hiçbir .sar'da tanımlı değil" cümlesi geri gelir);
//   ③ ölçülemez dalının düzeyi "hata" yapılınca "ölçülemez uyarı" nöbeti kırmızı (1/6).
// ═══════════════════════════════════════════════════════════════════════════

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { belirtecle } from "../src/belirtec.ts";
import { ayristir } from "../src/ayristirici.ts";
import { kodIndeksle, referansTanilari } from "../src/denetci.ts";
import { adAlaniKapsamiKur, projeKapsamlari } from "../src/kimlik.ts";
import type { Program } from "../src/sozdizim.ts";
import type { Siniflama } from "../src/siniflama.ts";

const SNF: Siniflama = JSON.parse(
  readFileSync(fileURLToPath(new URL("../../../oz/siniflama/kayit.json", import.meta.url)), "utf8"));

const parse = (k: string): Program => ayristir(belirtecle(k));

/** Kapalı ürünün deposu gibi: kendi Projesi yüklü, açık araç yalnız çatıdan duyurulmuş kardeş. */
function kapaliDepo(atif: string): { program: Program; programlar: Map<string, Program> } {
  const program = parse(`Adım( kod: ZKA-A99, durum: beklemede, ne: "Çapraz atıf sınavı.", referans: [ ${atif} ] )`);
  const programlar = new Map<string, Program>([
    ["orkestrasyon_anadizin.sar", parse('Proje( kod: PRJ-ORK, ad: "Kapalı Ürün", rejim: katı )')],
    ["plan/govde.sar", program],
  ]);
  return { program, programlar };
}

/** Çatı diskten okunmaz: kardeş listesi ve kardeş kod kümesi enjekte edilir. */
function kapi(programlar: Map<string, Program>) {
  return adAlaniKapsamiKur({
    kapsamlar: projeKapsamlari(programlar),
    tanimDosyalari: () => [],
    kardesler: [{ kod: "PRJ-SARMAL", kok: "/sanal/sarmal" }],
    kardesKodlari: () => new Set(["MEK-SEF", "TAKIM-CEKIRDEK"]),
  });
}

function kirikTanilari(atif: string) {
  const { program, programlar } = kapaliDepo(atif);
  const k = kapi(programlar);
  return referansTanilari(program, kodIndeksle(programlar), SNF, {
    dosya: "plan/govde.sar",
    cozulur: (h) => k.cozulur(h, "plan/govde.sar"),
    adAlaniBilinir: (a) => k.adAlaniBilinir(a),
  }).filter((t) => t.kod === "kırık-referans");
}

test("KPS-ADA-A01 · kardeş kökte VAR olan ad alanlı hedef doğrulanır ve tanı almaz", () => {
  assert.equal(kirikTanilari("PRJ-SARMAL::MEK-SEF").length, 0, "doğru yazılmış çapraz atıf sessizce çözülmeli");
});

test("KPS-ADA-A01 · bilinen ad alanında OLMAYAN hedef GERÇEKTEN kırıktır — hata, muafiyet yok", () => {
  const t = kirikTanilari("PRJ-SARMAL::MEK-YOK-999");
  assert.equal(t.length, 1, "yanlış yazılmış çapraz atıf sessiz yeşil geçmemeli");
  assert.equal(t[0].duzey, "hata");
  assert.ok(t[0].mesaj.includes("GERÇEKTEN kırık") && t[0].mesaj.includes("PRJ-SARMAL"),
    `mesaj ad alanının çözüldüğünü ve yerel kodun bulunmadığını söylemeli: ${t[0].mesaj}`);
});

test("KPS-ADA-A01 · bilinmeyen ad alanı ÖLÇÜLEMEZDİR — kırık değil, muafiyet UYARI olarak bildirilir", () => {
  const t = kirikTanilari("PRJ-YOK::MEK-SEF");
  assert.equal(t.length, 1, "muafiyet sessiz kalmamalı: bir bulgu basılmalı");
  assert.equal(t[0].duzey, "uyarı", "ölçülemeyen ad alanı hata değil uyarıdır");
  assert.ok(t[0].mesaj.includes("ÖLÇÜLEMEZ") && t[0].mesaj.includes("MUAF"),
    `mesaj muafiyeti adıyla söylemeli: ${t[0].mesaj}`);
  assert.ok(!t[0].mesaj.includes("hiçbir .sar'da tanımlı değil"), "eski yanıltıcı cümle basılmamalı");
});

test("KPS-ADA-A01 · `çağır` hedefi de üç durumlu okunur", () => {
  const program = parse(`Faz( kod: FAZ-T, ad: "Sınav Mevsimi", hedefTarih: "2026-09" ) {
  çağır PRJ-YOK::BLK-X
  çağır PRJ-SARMAL::BLK-YOK
}`);
  const programlar = new Map<string, Program>([
    ["orkestrasyon_anadizin.sar", parse('Proje( kod: PRJ-ORK, ad: "Kapalı Ürün", rejim: katı )')],
    ["plan/faz.sar", program],
  ]);
  const k = kapi(programlar);
  const t = referansTanilari(program, kodIndeksle(programlar), SNF, {
    dosya: "plan/faz.sar",
    cozulur: (h) => k.cozulur(h, "plan/faz.sar"),
    adAlaniBilinir: (a) => k.adAlaniBilinir(a),
  }).filter((x) => x.kod === "kırık-referans");
  assert.deepEqual(t.map((x) => [x.mesaj.includes("ÖLÇÜLEMEZ") ? "ölçülemez" : x.mesaj.includes("GERÇEKTEN kırık") ? "kırık" : "?", x.duzey]),
    [["ölçülemez", "uyarı"], ["kırık", "hata"]]);
  assert.ok(t.every((x) => x.mesaj.startsWith("'çağır ")), "çağır yazımı mesajda korunmalı");
});

test("KPS-ADA-A01 · ad alanı bilgisi verilmeyen çağıran (eski yüz) muafiyet uyduramaz — çözülmeyen ad alanlı hedef kırık okunur", () => {
  const { program, programlar } = kapaliDepo("PRJ-YOK::MEK-SEF");
  const k = kapi(programlar);
  const t = referansTanilari(program, kodIndeksle(programlar), SNF, {
    dosya: "plan/govde.sar",
    cozulur: (h) => k.cozulur(h, "plan/govde.sar"),
  }).filter((x) => x.kod === "kırık-referans");
  assert.equal(t.length, 1);
  assert.equal(t[0].duzey, "hata", "ölçüm yeteneği verilmediyse şüphede motor suçlamayı seçer");
});

test("KPS-ADA-A01 · yüklü evrendeki Proje de bilinen ad alanıdır; kapsamı dışındaki hedef gerçekten kırıktır (küresel eşleşme yasağı)", () => {
  const programlar = new Map<string, Program>([
    ["cati_anadizin.sar", parse('ÇalışmaAlanı( kod: CAL-T, ad: "Çatı" ) { Kitaplık( kod: KTP-A, yol: "a/" ) Kitaplık( kod: KTP-B, yol: "b/" ) }')],
    ["a/a_anadizin.sar", parse('Proje( kod: PRJ-A, ad: "A", rejim: katı )')],
    ["a/plan/faz.sar", parse('Faz( kod: FAZ-A, ad: "A Mevsimi", hedefTarih: "2026-09" )')],
    ["b/b_anadizin.sar", parse('Proje( kod: PRJ-B, ad: "B", rejim: katı )')],
    ["b/plan/govde.sar", parse('Blok( kod: BLK-B, mevsim: PRJ-A::FAZ-A, ne: "Doğru ad alanı." ) { }\nBlok( kod: BLK-B2, mevsim: PRJ-B::FAZ-A, ne: "Yanlış ad alanı." ) { }')],
  ]);
  const tumTanimlar = new Map<string, string[]>([["FAZ-A", ["a/plan/faz.sar"]]]);
  const k = adAlaniKapsamiKur({
    kapsamlar: projeKapsamlari(programlar),
    tanimDosyalari: (kod) => tumTanimlar.get(kod) ?? [],
    kardesler: [],
  });
  assert.equal(k.adAlaniBilinir("PRJ-A"), true);
  assert.equal(k.adAlaniBilinir("PRJ-B"), true);
  assert.equal(k.adAlaniBilinir("PRJ-YOK"), false);
  const program = programlar.get("b/plan/govde.sar")!;
  const t = referansTanilari(program, kodIndeksle(programlar), SNF, {
    dosya: "b/plan/govde.sar",
    cozulur: (h) => k.cozulur(h, "b/plan/govde.sar"),
    adAlaniBilinir: (a) => k.adAlaniBilinir(a),
  }).filter((x) => x.kod === "kırık-referans");
  assert.equal(t.length, 1, "doğru ad alanı çözülür, yanlış ad alanı tek bulgu üretir");
  assert.ok(t[0].mesaj.includes("PRJ-B::FAZ-A") && t[0].mesaj.includes("GERÇEKTEN kırık"), t[0].mesaj);
  assert.equal(t[0].duzey, "hata");
});

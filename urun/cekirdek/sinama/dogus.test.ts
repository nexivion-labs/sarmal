// ═══════════════════════════════════════════════════════════════════════════
// dogus.test.ts — 🎁 Doğuş paketi yazıcısının nöbeti (DPK-A02)
//
//   Üç söz sınanır: ① boş dizinde doğan proje GERÇEK denetimden sıfır hata ile
//   çıkar (flutter-create paritesi — CLI alt-süreçle, sahte değil) ② var olan
//   dosya ASLA ezilmez (dolu-dizin sözleşmesi) ③ kod türetimi Türkçe harfleri
//   güvenle ASCII kısaltmaya indirir.
// ═══════════════════════════════════════════════════════════════════════════

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { dogusYaz, dogusManifesti, dogusKodu, dogusRaporu } from "../src/dogus.ts";

const KOK = fileURLToPath(new URL("..", import.meta.url));

function geciciDizin(): string {
  return mkdtempSync(join(tmpdir(), "sarmal-dogus-"));
}

test("dogusKodu: Türkçe ad güvenli BÜYÜK kısaltmaya iner", () => {
  assert.equal(dogusKodu("bahçe projem"), "BAHCE-PROJEM");
  assert.equal(dogusKodu("Işık Ölçer"), "ISIK-OLCER");
  assert.equal(dogusKodu("  "), "PROJE");
});

test("dogusManifesti: onaylı manifest — 6 dosya (5 iskelet + dil bağlamı), hepsi yer-tutucusuz doğar", () => {
  const m = dogusManifesti("deneme", "2026-07-17");
  assert.deepEqual(m.map((d) => d.yol), [
    "deneme_anadizin.sar",
    "durum/durum_devir.sar",
    "ogrenme/dersler.sar",
    "ogrenme/geribildirim.sar",
    "plan/ilk_plan.sar",
    "AGENTS.md",
  ]);
  for (const d of m) {
    assert.ok(!d.icerik.includes("{{"), `${d.yol} doldurulmamış yer-tutucu taşıyor`);
    assert.ok(d.icerik.includes("2026-07-17"), `${d.yol} doğum tarihini taşımıyor`);
  }
});

test("dogusYaz + GERÇEK denetim: boş dizinde doğan proje sıfır hata verir", () => {
  const dizin = geciciDizin();
  try {
    const sonuc = dogusYaz(dizin, "bahce-deneme", "2026-07-17");
    assert.equal(sonuc.yazilan.length, 6);
    assert.equal(sonuc.atlanan.length, 0);
    const s = spawnSync(process.execPath, [join(KOK, "src", "sarmal.ts"), "denetle", dizin],
      { encoding: "utf8" });
    assert.equal(s.status, 0, `denetle sıfırla çıkmalı — çıktı:\n${s.stdout}\n${s.stderr}`);
    assert.match(s.stdout, /0 hata/, "doğan proje hatasız denetlenmeli");
  } finally {
    rmSync(dizin, { recursive: true, force: true });
  }
});

test("dolu-dizin sözleşmesi: var olan dosya ezilmez, atlanır ve raporlanır", () => {
  const dizin = geciciDizin();
  try {
    mkdirSync(join(dizin, "durum"), { recursive: true });
    const emek = "// kullanıcının kendi emeği — dokunulmamalı\n";
    writeFileSync(join(dizin, "durum", "durum_devir.sar"), emek, "utf8");
    const sonuc = dogusYaz(dizin, "deneme", "2026-07-17");
    assert.deepEqual(sonuc.atlanan, ["durum/durum_devir.sar"]);
    assert.equal(readFileSync(join(dizin, "durum", "durum_devir.sar"), "utf8"), emek);
    assert.match(dogusRaporu(sonuc, dizin), /Dokunulmayanlar/u, "rapor ne yapılmadığını söylemeli");
    // İkinci koşu: hiçbir yeni dosya doğmaz (idempotens)
    const tekrar = dogusYaz(dizin, "deneme", "2026-07-17");
    assert.equal(tekrar.yazilan.length, 0);
    assert.equal(tekrar.atlanan.length, 6);
    assert.match(dogusRaporu(tekrar, dizin), /paket daha önce kurulmuş/u);
  } finally {
    rmSync(dizin, { recursive: true, force: true });
  }
});

// ── GOC-A10 (Founder 2026-08-23): tek proje mi, çalışma alanı mı? ─────────────
//   Doğuş komutu artık türü sorar; çalışma alanı seçilince hedef ÇalışmaAlanı
//   kökü olur ve ilk proje onun altında kendi köküyle doğar (MIM-1.1).
import { dogusTuruCoz, dogusSorusu, DOGUS_TURLERI } from "../src/dogus.ts";

test("GOC-A10: dogusTuruCoz — serbest cevap iki türe iner, tanınmayan cevap tanımsız kalır", () => {
  assert.deepEqual(DOGUS_TURLERI, ["proje", "calisma-alani"]);
  for (const c of ["proje", "1", "tek", "Tek Proje"]) assert.equal(dogusTuruCoz(c), "proje", c);
  for (const c of ["calisma-alani", "2", "alan", "Çalışma Alanı", "çatı"]) assert.equal(dogusTuruCoz(c), "calisma-alani", c);
  assert.equal(dogusTuruCoz("bahçe"), undefined);
  assert.equal(dogusTuruCoz(undefined), undefined);
  assert.match(dogusSorusu(), /tek proje/u);
  assert.match(dogusSorusu(), /çalışma alanı/u);
  assert.match(dogusSorusu(), /MIM-1\.1/u, "soru kanon dayanağını söyler");
});

test("GOC-A10: çalışma alanı manifesti — çatı ilanı + dil bağlamı + ilk projenin kendi kökündeki tam paketi", () => {
  const m = dogusManifesti("Nexi Çatı", "2026-08-25", "calisma-alani");
  assert.deepEqual(m.map((d) => d.yol), [
    "nexi_çatı_anadizin.sar",
    "AGENTS.md",
    "ilk_proje/ilk_proje_anadizin.sar",
    "ilk_proje/durum/durum_devir.sar",
    "ilk_proje/ogrenme/dersler.sar",
    "ilk_proje/ogrenme/geribildirim.sar",
    "ilk_proje/plan/ilk_plan.sar",
    "ilk_proje/AGENTS.md",
  ]);
  for (const d of m) assert.ok(!d.icerik.includes("{{"), `${d.yol} doldurulmamış yer-tutucu taşıyor`);
  const cati = m[0].icerik;
  assert.match(cati, /ÇalışmaAlanı\( kod: CAL-NEXI-CATI, ad: "Nexi Çatı"/u, "çatı ÇalışmaAlanı köküyle doğar");
  assert.match(cati, /Raf\( kod: RAF-ILK-PROJE, yol: "ilk_proje\/"/u, "ilk proje çatıda Raf olarak ilan edilir");
  assert.match(m[2].icerik, /Proje\( kod: PRJ-ILK-PROJE, ad: "ilk_proje", rejim: katı/u, "ilk proje kendi Proje köküyle doğar");
  // ilk proje adı seçilebilir
  const m2 = dogusManifesti("çatı", "2026-08-25", "calisma-alani", "Bahçe Uygulaması");
  assert.equal(m2[2].yol, "bahçe_uygulaması/bahçe_uygulaması_anadizin.sar");
  assert.match(m2[0].icerik, /yol: "bahçe_uygulaması\/"/u);
  // proje türü değişmedi (geriye uyumluluk)
  assert.deepEqual(dogusManifesti("deneme", "2026-08-25", "proje").map((d) => d.yol), dogusManifesti("deneme", "2026-08-25").map((d) => d.yol));
});

test("GOC-A10: dogusYaz(calisma-alani) + GERÇEK denetim — kökten başlayan yapı sıfır hata verir", () => {
  const dizin = geciciDizin();
  try {
    const sonuc = dogusYaz(dizin, "deneme-cati", "2026-08-25", "calisma-alani", "ilk_proje");
    assert.equal(sonuc.tur, "calisma-alani");
    assert.equal(sonuc.proje, "ilk_proje");
    assert.equal(sonuc.yazilan.length, 8);
    assert.ok(readFileSync(join(dizin, "deneme_cati_anadizin.sar"), "utf8").includes("ÇalışmaAlanı("));
    assert.match(dogusRaporu(sonuc, dizin), /çalışma alanı "deneme-cati"/u);
    assert.match(dogusRaporu(sonuc, dizin), /ilk_proje\/plan\/ilk_plan\.sar/u, "rapor ilk projenin planına yönlendirir");
    const s = spawnSync(process.execPath, [join(KOK, "src", "sarmal.ts"), "denetle", dizin], { encoding: "utf8" });
    assert.equal(s.status, 0, `denetle sıfırla çıkmalı — çıktı:\n${s.stdout}\n${s.stderr}`);
    assert.match(s.stdout, /0 hata/, "doğan çalışma alanı hatasız denetlenmeli");
  } finally {
    rmSync(dizin, { recursive: true, force: true });
  }
});

test("GOC-A10: CLI — uçbirim yokken --tur verilmezse tek proje varsayılır ve ipucu basılır; --tur calisma-alani çatı doğurur; geçersiz tür reddedilir", () => {
  const a = geciciDizin();
  const b = geciciDizin();
  try {
    const s1 = spawnSync(process.execPath, [join(KOK, "src", "sarmal.ts"), "doğuş", a, "--ad", "tekil"], { encoding: "utf8" });
    assert.equal(s1.status, 0, s1.stderr);
    assert.match(s1.stderr, /tek proje varsayıldı/u, "uçbirim yokken varsayım açıkça söylenir");
    assert.match(s1.stdout, /"tekil" \(kod kısaltması: TEKIL\)/u);
    assert.ok(readFileSync(join(a, "tekil_anadizin.sar"), "utf8").includes("Proje( kod: PRJ-TEKIL"));
    const s2 = spawnSync(process.execPath, [join(KOK, "src", "sarmal.ts"), "doğuş", b, "--tur", "calisma-alani", "--ad", "çatım", "--proje", "ilk"], { encoding: "utf8" });
    assert.equal(s2.status, 0, s2.stderr);
    assert.doesNotMatch(s2.stderr, /varsayıldı/u);
    assert.match(s2.stdout, /çalışma alanı "çatım"/u);
    assert.ok(readFileSync(join(b, "ilk", "ilk_anadizin.sar"), "utf8").includes("Proje( kod: PRJ-ILK"));
    const s3 = spawnSync(process.execPath, [join(KOK, "src", "sarmal.ts"), "doğuş", join(b, "yok"), "--tur", "bahçe"], { encoding: "utf8" });
    assert.equal(s3.status, 1);
    assert.match(s3.stderr, /--tur yalnız "proje" ya da "calisma-alani"/u);
  } finally {
    rmSync(a, { recursive: true, force: true });
    rmSync(b, { recursive: true, force: true });
  }
});

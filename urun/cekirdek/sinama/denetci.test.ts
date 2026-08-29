// Denetçi sınamaları (node:test) — D0: kayıp-yapı + bildirilmemiş-dosya · D1: kırık-referans.
// MDR-A04 bağ sınıflandırması: bu dosyadaki mesaj-metnine dokunan assert'ler ya kod-çıpalı ikincil kontroldür ya da bilinçli metin sözleşmesidir (nöbet); çıpasız tanı araması yasaktır. Tam döküm: nitelik/motor_tani_envanteri.sar (MDR-A04 bölümü).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { belirtecle } from "../src/belirtec.ts";
import { ayristir } from "../src/ayristirici.ts";
import { iskeletPlani } from "../src/iskeletci.ts";
import { siniflamaYukle } from "../src/siniflama.ts";
import { denetle, diskTara, kodIndeksle, donguTanilari, referansTanilari, programlariYukle, yinelenenKodTanilari, dosyalararasiCatismaTanilari, beyansizYapiDenetle, tekCocukTanilari, anadizinBul, adAyraciTanilari, halefTanilari, kapsamTanilari, rafsizAnadizinTanilari, kavusumsuzParalellikTanilari, siloBlokTanilari, kavusumsuzDilimTanilari, acikAdimTanilari, dogusEksikProjeTanilari, olgunlukOnayiTanilari, kodBasladiMi, anadizinEvreBeyani, planlamaEvresiMi, evre1Yumusat, kuralTanilari, kodTanimlariIndeksle, type DiskAnlikGoruntu } from "../src/denetci.ts";
import type { Program } from "../src/sozdizim.ts";
import { adAlaniKapsamiKur, projeKapsamlari } from "../src/kimlik.ts";
import { dogrula as tekDosyaDogrula } from "../src/dogrulayici.ts";

const snf = siniflamaYukle(fileURLToPath(new URL("../../../oz/siniflama/kayit.json", import.meta.url)));
const ornek = readFileSync(fileURLToPath(new URL("../../../ogreti/ornek/gercek/blok_kimlik.sar", import.meta.url)), "utf8");
const plan = () => iskeletPlani(ayristir(belirtecle(ornek)), snf);

/** Plandan birebir disk görüntüsü türetir (drift'siz temel). */
const aynasi = (): DiskAnlikGoruntu => ({
  girdiler: plan().ogeler.map((o) => ({ tur: o.tur, yol: o.yol })),
});

test("temiz ayna = 0 tanı (yanlış-pozitif yok)", () => {
  assert.deepEqual(denetle(plan(), aynasi()), []);
});

// ── MIM-3 çift-yönlü: beyansız-yapı (Founder 2026-07-11 "her klasör ana.sar'da belirtilmeli")
const yapiPlani = (govde: string) =>
  iskeletPlani(ayristir(belirtecle(`Proje( kod: ANA, ad: "t", ne: "x" ) {\n${govde}\n}`)), snf);

test("beyansız-yapı: ilansız üst-düzey klasör HATA; ilanlı + build/vendor temiz", () => {
  const p = yapiPlani(`Kitaplık( kod: KTP-A, yol: "cekirdek/", ne: "x", raflar: {} )\n  Raf( kod: RAF-B, yol: "plan/", ne: "y" )`);
  const t = beyansizYapiDenetle(p, ["cekirdek", "plan", "node_modules", "dist", ".git", "sablon"]);
  assert.equal(t.length, 1, JSON.stringify(t.map((x) => x.tani.mesaj)));   // yalnız 'sablon' ilansız
  assert.equal(t[0].tani.kod, "beyansız-yapı");
  assert.equal(t[0].tani.duzey, "hata");
  assert.ok(t[0].tani.mesaj.includes("sablon"), t[0].tani.mesaj);
});

test("beyansız-yapı: tüm klasörler ilanlı → 0 tanı (yanlış-pozitif yok)", () => {
  const p = yapiPlani(`Raf( kod: RAF-A, yol: "plan/", ne: "y" )`);
  assert.deepEqual(beyansizYapiDenetle(p, ["plan", ".git", "node_modules", "out"]), []);
});

test("kayıp-yapı: ilan edilmiş ama diskte olmayan öğe hata verir", () => {
  const disk = aynasi();
  disk.girdiler = disk.girdiler.filter((g) => !g.yol.endsWith("giris_ekrani.md"));
  const t = denetle(plan(), disk);
  assert.equal(t.length, 1);
  assert.equal(t[0].kod, "kayıp-yapı");
  assert.equal(t[0].duzey, "hata");
  assert.match(t[0].mesaj, /giris_ekrani\.md/);
  assert.ok(t[0].satir! > 0, "konum ana.sar'daki ilan satırını göstermeli");
});

test("kayıp-yapı: tür uyuşmazlığı (dosya ilan, diskte dizin) yakalanır", () => {
  const disk = aynasi();
  const i = disk.girdiler.findIndex((g) => g.yol.endsWith("kimlik_servisi.md"));
  disk.girdiler[i] = { tur: "dizin", yol: disk.girdiler[i].yol };
  const t = denetle(plan(), disk);
  assert.equal(t.length, 1);
  assert.equal(t[0].kod, "kayıp-yapı");
  assert.match(t[0].mesaj, /dosya olarak ilan edilmiş ama diskte dizin/);
});

test("bildirilmemiş-dosya: omurga içindeki yetim uyarı verir", () => {
  const disk = aynasi();
  disk.girdiler.push({ tur: "dosya", yol: "kimlik/onyuz/ekranlar/kacak.ts" });
  const t = denetle(plan(), disk);
  assert.equal(t.length, 1);
  assert.equal(t[0].kod, "bildirilmemiş-dosya");
  assert.equal(t[0].duzey, "uyarı");
  assert.match(t[0].mesaj, /kacak\.ts/);
});

test("omurga DIŞI dosyalar raporlanmaz (README vb. yanlış-pozitif değil)", () => {
  const disk = aynasi();
  disk.girdiler.push({ tur: "dosya", yol: "README.md" });
  disk.girdiler.push({ tur: "dizin", yol: "docs" });
  disk.girdiler.push({ tur: "dosya", yol: "docs/notlar.md" });
  assert.deepEqual(denetle(plan(), disk), []);
});

test("diskTara: gerçek dizini okur; .git/gizli/symlink atlanır", () => {
  const kok = mkdtempSync(join(tmpdir(), "sarmal-denetci-"));
  try {
    mkdirSync(join(kok, "kimlik/onyuz"), { recursive: true });
    writeFileSync(join(kok, "kimlik/onyuz/a.md"), "x");
    mkdirSync(join(kok, ".git"));
    writeFileSync(join(kok, ".git/HEAD"), "ref");
    writeFileSync(join(kok, ".DS_Store"), "");
    symlinkSync(join(kok, "kimlik"), join(kok, "halka")); // döngü adayı
    const g = diskTara(kok).girdiler.map((x) => `${x.tur} ${x.yol}`).sort();
    assert.deepEqual(g, ["dizin kimlik", "dizin kimlik/onyuz", "dosya kimlik/onyuz/a.md"]);
  } finally {
    rmSync(kok, { recursive: true, force: true });
  }
});

test("uçtan uca: iskeletle üret → denetle = 0 tanı (üret↔denetle simetrisi)", async () => {
  const { iskeletYaz } = await import("../src/iskeletci.ts");
  const kok = mkdtempSync(join(tmpdir(), "sarmal-simetri-"));
  try {
    const p = plan();
    iskeletYaz(p, kok);
    assert.deepEqual(denetle(p, diskTara(kok)), []);
  } finally {
    rmSync(kok, { recursive: true, force: true });
  }
});

// ── Faz D1: KOD indeksi + kırık-referans ─────────────────────────────────────

const derle = (kaynak: string): Program => ayristir(belirtecle(kaynak));

/** GOC-MOTOR-A10 emeklilik nöbetleri: eski ihlal fikstürünü tam tek-dosya
 *  kapısından geçirir; emekli kimliğin çıktıda BULUNMAMASI sınanır. */
const dogrulaModulu = (p: Program, dosya = "a.sar") => tekDosyaDogrula(p, snf, dosya);

test("halef-hedef (BKM-KRR-B02): dangling atıf + döngü HATA; geçerli zincir temiz", () => {
  const src = [
    `Karar( kod: KRR-01, durum: kilitli, ne: "yürürlükte" )`,
    `Karar( kod: KRR-02, durum: revize, halef: KRR-01, ne: "geçerli halef → in-force" )`,
    `Karar( kod: KRR-03, durum: revize, halef: KRR-99, ne: "dangling — KRR-99 yok" )`,
    `Karar( kod: KRR-04, durum: revize, halef: KRR-05, ne: "döngü a" )`,
    `Karar( kod: KRR-05, durum: revize, halef: KRR-04, ne: "döngü b" )`,
  ].join("\n");
  const programlar = new Map([["yasa/kararlar/t.sar", derle(src)]]);
  const t = halefTanilari(programlar).map((x) => x.tani);
  const kirik = t.filter((x) => x.kod === "kırık-halef");
  const dongu = t.filter((x) => x.kod === "halef-döngü");
  // ① dangling: KRR-03 → KRR-99 (tanımsız) tek kırık-halef HATA
  assert.equal(kirik.length, 1, JSON.stringify(t));
  assert.equal(kirik[0].duzey, "hata");
  assert.ok(kirik[0].mesaj.includes("KRR-03") && kirik[0].mesaj.includes("KRR-99"), kirik[0].mesaj);
  // ② döngü: KRR-04↔KRR-05 halef-döngü HATA (her iki uçtan da yakalanır)
  assert.ok(dongu.length >= 1, JSON.stringify(t));
  assert.ok(dongu.every((x) => x.duzey === "hata"));
  // ③ geçerli zincir (KRR-02 → yürürlükteki KRR-01) yanlış-pozitif VERMEZ
  // MDR-A04: negatif muhafız halef tanı kodlarına çıpalandı (çıpasız mesaj araması yasak).
  assert.ok(!t.some((x) => (x.kod === "kırık-halef" || x.kod === "halef-döngü") && x.mesaj.includes('"KRR-02"')), "geçerli halef yanlış-pozitif verdi");
});
const KATALOG = 'Teknoloji( kod: FLUTTER, ad: "flutter" )\nTeknoloji( kod: FASTAPI, ad: "fastapi" )';

test("kodİndeksle: tüm dosyalardaki KOD tanımlarını toplar", () => {
  const programlar = new Map([
    ["ana.sar", derle(ornek)],
    ["katalog.sar", derle(KATALOG)],
  ]);
  const i = kodIndeksle(programlar);
  assert.ok(i.has("BLK-KIMLIK") && i.has("ADM-GIRIS") && i.has("KRR-OTURUM"));
  assert.equal(i.get("FLUTTER")!.dosya, "katalog.sar");
  assert.equal(i.get("FLUTTER")!.tip, "Teknoloji");
});

test("temiz çok-dosya: çağır/bağımlı/besler/referans çözülür — yalnız üretir uyarısı kalır", () => {
  const programlar = new Map([["ana.sar", derle(ornek)], ["katalog.sar", derle(KATALOG)]]);
  const t = referansTanilari(programlar.get("ana.sar")!, kodIndeksle(programlar), snf);
  assert.equal(t.filter((x) => x.duzey === "hata").length, 0, "hata olmamalı");
  const uyarilar = t.filter((x) => x.duzey === "uyarı");
  assert.equal(uyarilar.length, 1); // üretir: EKR-GIRIS (GOC-KIMLIK artık dosyada ilanlı — A02 meyve ilanı)
  assert.ok(uyarilar.every((x) => x.kod === "kırık-referans" && /üretir/.test(x.mesaj)));
});

// ── RF-T6-A02: dayanak kenarı graf/gezin evrenindedir — çözüm denetimi izler ──
test("dayanak kenarı: çözülmeyen Karar hedefi kırık-referans HATA; çözülen temiz", () => {
  const kirikSrc = 'GenelKural( kod: KRL-D, ad: "hedefsizDayanak", otorite: politika, kapsam: genel, dayanak: K-YOK, ne: "hedefsiz dayanak" )';
  const kirik = referansTanilari(derle(kirikSrc), kodIndeksle(new Map([["y.sar", derle(kirikSrc)]])), snf)
    .filter((x) => x.kod === "kırık-referans");
  assert.equal(kirik.length, 1, "çözülmeyen dayanak hedefi kırık-referans vermeli (kenar izleniyor)");
  assert.ok(/dayanak/.test(kirik[0].mesaj));
  const temizSrc = 'Karar( kod: K-VAR, durum: kilitli, ne: "kaynak karar" )\nGenelKural( kod: KRL-D, ad: "bagliKural", otorite: politika, kapsam: genel, dayanak: K-VAR, ne: "bağlı kural" )';
  const temiz = referansTanilari(derle(temizSrc), kodIndeksle(new Map([["y.sar", derle(temizSrc)]])), snf)
    .filter((x) => x.kod === "kırık-referans");
  assert.equal(temiz.length, 0, "çözülen dayanak temiz kalmalı");
});

test("katalog yokken çağır + bağımlı hedefleri hata verir", () => {
  const programlar = new Map([["ana.sar", derle(ornek)]]);
  const t = referansTanilari(programlar.get("ana.sar")!, kodIndeksle(programlar), snf);
  const hatalar = t.filter((x) => x.duzey === "hata");
  // çağır FLUTTER · çağır FASTAPI · Adım bağımlı: FLUTTER ×2 · FASTAPI ×2
  // + MIM-1.4 Katman eksen-bağları: KAT-ONYUZ→FLUTTER · KAT-ARKAYUZ/GUVENLIK→FASTAPI
  assert.equal(hatalar.length, 9);
  assert.ok(hatalar.every((x) => x.kod === "kırık-referans"));
  assert.ok(hatalar.some((x) => /çağır FLUTTER/.test(x.mesaj)));
});

test("kırık kenar hedefi konumuyla raporlanır (liste içi dahil)", () => {
  const p = derle('Karar( kod: KRR-X, besler: [ YOK-BIR, YOK-IKI ] )');
  const t = referansTanilari(p, kodIndeksle(new Map([["x.sar", p]])), snf);
  assert.equal(t.length, 2);
  assert.ok(t.every((x) => x.duzey === "hata" && x.satir === 1));
  assert.match(t[0].mesaj, /YOK-BIR/);
  assert.match(t[1].mesaj, /YOK-IKI/);
});

// ── Faz D2: yer-uyuşmazlığı (path_mismatch · FEL-3 deep-mirror) ──────────────

test("yer-uyuşmazlığı: yanlış klasördeki kodlu dosya TEK tanıyla raporlanır", () => {
  const p = plan();
  const disk = aynasi();
  // giris_ekrani.md'yi güvenlik facet'ine "taşı" (KOD'uyla birlikte)
  const i = disk.girdiler.findIndex((g) => g.yol.endsWith("giris_ekrani.md"));
  disk.girdiler[i] = { tur: "dosya", yol: "kimlik/guvenlik/jeton/giris_ekrani.md", kod: "ADM-GIRIS" };
  const t = denetle(p, disk);
  assert.equal(t.length, 1, "kayıp-yapı + bildirilmemiş'e ŞİŞMEMELİ — tek isabetli tanı");
  assert.equal(t[0].kod, "yer-uyuşmazlığı");
  assert.equal(t[0].duzey, "hata");
  assert.match(t[0].mesaj, /ADM-GIRIS/);
  assert.match(t[0].oneri!, /kimlik\/onyuz\/ekranlar\/giris_ekrani\.md/);
});

test("kanonik yer doluysa kopya yer-uyuşmazlığı DEĞİL yetimdir", () => {
  const disk = aynasi();
  disk.girdiler.push({ tur: "dosya", yol: "kimlik/arkayuz/kopya.md", kod: "ADM-GIRIS" });
  const t = denetle(plan(), disk);
  assert.equal(t.length, 1);
  assert.equal(t[0].kod, "bildirilmemiş-dosya");
});

test("uçtan uca: üret → dosyayı yanlış yere taşı → diskTara KOD'u okur, denetle yakalar", async () => {
  const { iskeletYaz } = await import("../src/iskeletci.ts");
  const { renameSync } = await import("node:fs");
  const kok = mkdtempSync(join(tmpdir(), "sarmal-yeruyus-"));
  try {
    const p = plan();
    iskeletYaz(p, kok);
    renameSync(
      join(kok, "kimlik/onyuz/ekranlar/giris_ekrani.md"),
      join(kok, "kimlik/arkayuz/servisler/giris_ekrani.md"),
    );
    const t = denetle(p, diskTara(kok));
    assert.equal(t.length, 1);
    assert.equal(t[0].kod, "yer-uyuşmazlığı");
    assert.match(t[0].mesaj, /kimlik\/arkayuz\/servisler\/giris_ekrani\.md/);
  } finally {
    rmSync(kok, { recursive: true, force: true });
  }
});

// ── Faz D3: kural-ihlali v1 (ad-standardı ihlali · MIM-3 ana-yok) ──────────────────

test("ad-standardı: omurga içindeki büyük-harf/diakritikli artefakt adı uyarı verir (DIL-1.2: '_' kanonik ayraç)", async () => {
  const { kuralTanilari } = await import("../src/denetci.ts");
  const disk = aynasi();
  disk.girdiler.push({ tur: "dosya", yol: "kimlik/onyuz/Giris_Ekrani.md" });
  disk.girdiler.push({ tur: "dosya", yol: "kimlik/arkayuz/sınama.yaml" });
  const t = kuralTanilari(plan(), disk);
  assert.equal(t.length, 2);
  assert.ok(t.every((x) => x.kod === "kural-ihlali" && x.duzey === "uyarı"));
  assert.match(t[0].oneri!, /giris_ekrani/);
  assert.match(t[1].oneri!, /sinama/);
});

test("ad-standardı: kod/ürün dosyaları (.ts vb.) ve omurga dışı kapsam dışıdır", async () => {
  const { kuralTanilari } = await import("../src/denetci.ts");
  const disk = aynasi();
  disk.girdiler.push({ tur: "dosya", yol: "kimlik/onyuz/LoginScreen.ts" }); // ürün — DIL-1.2/kullanıcı alanı
  disk.girdiler.push({ tur: "dosya", yol: "BUYUK_DOSYA.md" });              // omurga dışı (kök)
  assert.deepEqual(kuralTanilari(plan(), disk), []);
});

// Bu nöbet önce diskte hiç bulunmayan bir yol ("proje/") veriyor ve buna rağmen
// "dizinde giriş dosyası yok" hükmünü bekliyordu; yani tanının kap iddiasını hiç
// ölçmediğinin kanıtı bizzat nöbetin kendisiydi. Fikstür artık GERÇEK bir dizin
// kurar, çünkü sınanmak istenen durum girişi eksik bir dizindir. Yolun diskte
// hiç bulunmadığı durum ise ayrı ve dürüst bir cümleyle aşağıda bağlanır.
test("MIM-3: anaYokTanısı hata düzeyinde ana-yok üretir (gerçek ama girişsiz dizin)", async () => {
  const { anaYokTanisi } = await import("../src/denetci.ts");
  const kok = mkdtempSync(join(tmpdir(), "sarmal-anayok-"));
  try {
    const t = anaYokTanisi(kok);
    assert.equal(t.kod, "kural-ihlali");
    assert.equal(t.duzey, "hata");
    assert.match(t.mesaj, /giriş dosyası yok/);
    assert.match(t.mesaj, /anadizin\.sar/);
  } finally { rmSync(kok, { recursive: true, force: true }); }
});

test("MIM-3: anaYokTanısı var olmayan yol için kap iddiası kurmaz", async () => {
  const { anaYokTanisi } = await import("../src/denetci.ts");
  const t = anaYokTanisi("proje/");
  assert.equal(t.kod, "kural-ihlali");
  assert.equal(t.duzey, "hata");
  assert.doesNotMatch(t.mesaj, /(?:içinde|dizininde) giriş dosyası yok/u, t.mesaj);
  assert.match(t.mesaj, /diskte bulunamadı/u, t.mesaj);
});

// ── Faz D4: CLI `denetle` uçtan uca (alt süreç) ──────────────────────────────

test("CLI denetle: temiz proje çıkış 0 · drift'li proje çıkış 4 · ana-yok çıkış 4", async () => {
  const { execFileSync } = await import("node:child_process");
  const { renameSync } = await import("node:fs");
  const CLI = fileURLToPath(new URL("../src/sarmal.ts", import.meta.url));
  const kos = (dizin: string): { kod: number; cikti: string } => {
    try {
      return { kod: 0, cikti: execFileSync(process.execPath, [CLI, "denetle", dizin], { encoding: "utf8" }) };
    } catch (e: any) {
      return { kod: e.status ?? -1, cikti: (e.stdout ?? "") + (e.stderr ?? "") };
    }
  };

  const kok = mkdtempSync(join(tmpdir(), "sarmal-cli-"));
  try {
    // ana-yok: boş dizin → MIM-3 hatası, çıkış 4
    const bos = kos(kok);
    assert.equal(bos.kod, 4);
    assert.match(bos.cikti, /giriş dosyası yok/);

    // temiz: ana.sar + katalog + iskelet → çıkış 0 (yalnız üretir uyarıları)
    writeFileSync(join(kok, "ana.sar"), ornek);
    writeFileSync(join(kok, "katalog.sar"), KATALOG);
    execFileSync(process.execPath, [CLI, join(kok, "ana.sar"), "--iskelet", kok], { encoding: "utf8" });
    const temiz = kos(kok);
    assert.equal(temiz.kod, 0, temiz.cikti);
    assert.doesNotMatch(temiz.cikti, /✖/);

    // drift: dosyayı yanlış yere taşı → yer-uyuşmazlığı, çıkış 4
    renameSync(join(kok, "kimlik/onyuz/ekranlar/giris_ekrani.md"), join(kok, "kimlik/giris_ekrani.md"));
    const driftli = kos(kok);
    assert.equal(driftli.kod, 4);
    assert.match(driftli.cikti, /yer-uyuşmazlığı/);
    assert.match(driftli.cikti, /ÖZET: 1 hata/);
  } finally {
    rmSync(kok, { recursive: true, force: true });
  }
});

// ── KÜRASYON (GOC-A08 · 2026-08-25): eski üç depoya uzanan D5 kabul bloğu açık depoya girmedi — kapalı
//    depoya bağımlı sınama dışarıdan kimse tarafından koşulamaz; kaydı atölye deposundadır. ──

// ── Ö.1 refaktör: denetleKomutu'ndan çıkarılan saf yardımcılar (artık birim-testli) ──

const prog = (s: string): Program => ayristir(belirtecle(s));

test("yinelenenKodTanilari — OMURGA çakışması uyarır; ornek/ vitrini muaf", () => {
  const a = prog('Blok( kod: BLK-X, ne: "a" ){ }');
  const b = prog('Blok( kod: BLK-X, ne: "b" ){ }');
  // İki OMURGA dosyasında aynı KOD → 1 yinelenen-kod uyarısı
  const omurga = yinelenenKodTanilari(new Map([["a.sar", a], ["b.sar", b]]));
  assert.equal(omurga.length, 1);
  assert.equal(omurga[0].tani.kod, "yinelenen-kod");
  assert.match(omurga[0].tani.mesaj, /BLK-X/);
  // ornek/ kopyaları (ayrı vitrin ağaçları) → uyarı YOK
  const vitrin = yinelenenKodTanilari(new Map([["ornek/a.sar", a], ["ornek/b.sar", b]]));
  assert.equal(vitrin.length, 0);
});

test("DIL-1.2 anadizinBul — *_anadizin.sar desenle bulunur; yoksa eski ana.sar'a düşer", () => {
  const dir = mkdtempSync(join(tmpdir(), "anadizin-"));
  try {
    // hiçbiri yok → undefined
    assert.equal(anadizinBul(dir), undefined);
    // eski ad → tanınır (geçiş)
    writeFileSync(join(dir, "ana.sar"), 'Proje( kod: P, ad: "p" ){ }');
    assert.equal(anadizinBul(dir), join(dir, "ana.sar"));
    // yeni kanonik ad → desen KAZANIR
    writeFileSync(join(dir, "deneme_anadizin.sar"), 'Proje( kod: P2, ad: "p2" ){ }');
    assert.equal(anadizinBul(dir), join(dir, "deneme_anadizin.sar"));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("DIL-1.2 adAyraciTanilari — tireli .sar adı bilgi önerisi alır; alt-çizgili temiz", () => {
  const p = prog('Blok( kod: B, ne: "x" ){ }');
  const t = adAyraciTanilari(new Map([["plan/eski-tireli.sar", p], ["plan/yeni_ad.sar", p]]));
  assert.equal(t.length, 1);
  assert.equal(t[0].dosya, "plan/eski-tireli.sar");
  assert.equal(t[0].tani.kod, "ad-ayracı");
  assert.equal(t[0].tani.duzey, "bilgi");
  assert.match(t[0].tani.oneri ?? "", /eski_tireli\.sar/);
});

test("tekCocukTanilari — tek-Katmanlı Faz bilgi önerisi alır; Katman{1 Adım} maddesi EMEKLİ (RF-T3 · MIM-1 çıplak-kademe ölçümü)", () => {
  const p = prog('Faz( kod: F, ad: "f" ){ Katman( kod: K, ad: "k" ){ Adım( kod: A, ne: "iş" ) } }');   // MIM-1 dizilişi
  const t = tekCocukTanilari(new Map([["a.sar", p]]));
  assert.equal(t.length, 1);   // yalnız Faz{1 Katman} — Katman{1 Adım} önerisi MIM-1 idealiyle çelişirdi, emekli
  assert.equal(t[0].tani.kod, "tek-çocuk-kapsayıcı");
  assert.equal(t[0].tani.duzey, "bilgi");
  assert.match(t[0].tani.mesaj, /Faz/, "kalan madde Faz kademesine ait olmalı");
});

test("tekCocukTanilari — çok-çocuklu kapsayıcı tanı ÜRETMEZ", () => {
  const p = prog('Faz( kod: F, ad: "f" ){ Katman( kod: K, ad: "k" ){ Adım( kod: A1, ne: "a" ) Adım( kod: A2, ne: "b" ) } Katman( kod: K2, ad: "k2" ){ Adım( kod: A3, ne: "c" ) Adım( kod: A4, ne: "d" ) } }');
  assert.equal(tekCocukTanilari(new Map([["a.sar", p]])).length, 0);
});

// ── NTK-A05 (MIM-1.6): kırıntı-Adım bekçisi — Founder onayı 2026-07-18 ───────
// ── GOC-MOTOR-A10 · EMEKLİLİK NÖBETİ: kırıntı-Adım bekçisi kaldırıldı ────────
//   Eski ihlal fikstürü (bir Katman altında üç kırıntı Adım) korunur; artık
//   `kırıntı-adım` üretmemesi nöbete alınır. Halefi MIM-1.6 `adım-atomikliği`.
test("A10 emeklilik: üç kırıntı Adımlı Katman artık kırıntı-adım ÜRETMEZ", async () => {
  const denetciModulu = await import("../src/denetci.ts") as Record<string, unknown>;
  assert.equal(denetciModulu.kirintiTanilari, undefined,
    "kirintiTanilari üreticisi geri gelmiş — kırıntı-adım emeklidir");
  const p = derle(`Blok( kod: BLK-KR, ne: "b" ) {
  Katman( kod: KAT-KR, ad: "k" ) {
    Adım( kod: A1, durum: beklemede, ne: "a", görev: "kısa" )
    Adım( kod: A2, durum: beklemede, ne: "a", görev: "kısa" )
    Adım( kod: A3, durum: beklemede, ne: "a", görev: "kısa" )
  }
}`);
  const kodlar = dogrulaModulu(p).map((t) => t.kod);
  assert.ok(!kodlar.includes("kırıntı-adım"), `kırıntı-adım geri döndü: ${JSON.stringify(kodlar)}`);
});

test("dosyalararasiCatismaTanilari — farklı dosyada aynı KOD çelişir; tek dosyada değil", () => {
  const src = (ne: string) => `Kural rk( kod: KRL-X, otorite: anayasa, katman: niyet, ne: "${ne}" )`;
  const a = prog(src("birinci tanım"));
  const b = prog(src("ikinci tanım"));
  // Aynı KOD iki AYRI dosyada farklı gövde → dosyalar-arası kural-çatışması
  const carpik = dosyalararasiCatismaTanilari(new Map([["a.sar", a], ["b.sar", b]]));
  assert.equal(carpik.length, 1);
  assert.equal(carpik[0].tani.kod, "kural-çatışması");
  assert.match(carpik[0].dosya, /a\.sar ↔ b\.sar/);
  // Aynı iki kural TEK dosyada → dosyalar-arası denetim yok (dosya-içi dogrula'nın işi)
  const tek = prog(src("bir") + "\n" + src("iki"));
  assert.equal(dosyalararasiCatismaTanilari(new Map([["tek.sar", tek]])).length, 0);
});

test("programlariYukle — muaf işaretlenir+parse edilir; muaf-olmayan sözdizim hatası toplanır", () => {
  const dir = mkdtempSync(join(tmpdir(), "yukle-"));
  try {
    writeFileSync(join(dir, "ana.sar"), 'Proje( kod: PRJ-Y, ad: "y", ne: "y" ){ }\n');
    writeFileSync(join(dir, "muaf.sar"), '// sarmal: bilerek-hatalı örnek\nBlok( kod: BLK-M, ne: "m" ){ }\n');
    writeFileSync(join(dir, "bozuk.sar"), 'Bozuk( kod: X, (((\n');
    const { programlar, muaflar, hatalar } = programlariYukle(dir, join(dir, "ana.sar"));
    assert.ok(programlar.has("ana.sar") && programlar.has("muaf.sar"), "ana + muaf parse edildi");
    assert.ok(!programlar.has("bozuk.sar"), "sözdizim-hatalı dosya programlar'a girmez");
    assert.ok(muaflar.has("muaf.sar"), "muaf işaretlendi");
    assert.equal(hatalar.length, 1);
    assert.equal(hatalar[0].etiket, "bozuk.sar");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── STR-4: yetim-meyve kapısı (geri-drift) ─────────────────────────────────
test("yetim-meyve: beyan-komşuluğundaki beyansız kod dosyası uyarılır; beyanlı temiz", async () => {
  const { yetimMeyveTanilari } = await import("../src/denetci.ts");
  const p = prog('Kod( kod: KOD-T, dosya: "src/motor.ts", ne: "meyve" )');
  const disk: DiskAnlikGoruntu = { girdiler: [
    { tur: "dizin", yol: "src" },
    { tur: "dosya", yol: "src/motor.ts" },        // beyanlı → temiz
    { tur: "dosya", yol: "src/kacak.ts" },        // beyansız kod → yetim
    { tur: "dosya", yol: "src/OKU.md" },          // kod-dışı uzantı → muaf
    { tur: "dosya", yol: "diger/serbest.ts" },    // beyansız DİZİN (kapsam dışı) → v1 muaf
  ] };
  const t = yetimMeyveTanilari(new Map([["plan.sar", p]]), disk);
  assert.equal(t.length, 1, "yalnız src/kacak.ts yetim düşmeli; gelen: " + JSON.stringify(t.map((x) => x.dosya)));
  assert.equal(t[0].dosya, "src/kacak.ts");
  assert.equal(t[0].tani.kod, "yetim-meyve");
  assert.equal(t[0].tani.duzey, "uyarı");
});

test("yetim-meyve: hiç dosya: beyanı yoksa v1 kapsamı boş — sıfır tanı (kademe)", async () => {
  const { yetimMeyveTanilari } = await import("../src/denetci.ts");
  const p = prog('Blok( kod: BLK-T, ne: "beyansız plan" ){ }');
  const disk: DiskAnlikGoruntu = { girdiler: [{ tur: "dosya", yol: "src/kacak.ts" }] };
  assert.equal(yetimMeyveTanilari(new Map([["plan.sar", p]]), disk).length, 0);
});

// ── BKM-OLG-A03: doc-drift kapısı (tamamlandı-ama-meyvesiz) ───────────────────
test("doc-drift: tamamlandı Adım'ın dosyalı meyvesi diskte yoksa uyarı; varsa/dosyasızsa susar", async () => {
  const { docDriftTanilari } = await import("../src/denetci.ts");
  const p = prog(`Blok( kod: BLK-D, ne: "x" ) { Katman( kod: FZ-D, ad: "f" ) { AltKatman( kod: KT-D, ad: "k" ) {
      Adım( kod: ADM-VAR, durum: tamamlandı, üretir: KOD-VAR, kabul: "k", ne: "meyvesi diskte" )
      Adım( kod: ADM-YOK, durum: tamamlandı, üretir: KOD-YOK, kabul: "k", ne: "meyvesi hayalet" )
      Adım( kod: ADM-SAR, durum: tamamlandı, üretir: MEK-SAR, kabul: "k", ne: "dosyasız .sar-içi artefakt" )
    } } }
    Kod( kod: KOD-VAR, dosya: "src/var.ts", ne: "diskte" )
    Kod( kod: KOD-YOK, dosya: "src/hayalet.ts", ne: "diskte değil" )
    Mekanizma( kod: MEK-SAR, ne: "dosyasız artefakt", bağımlı: [] )`);
  const disk: DiskAnlikGoruntu = { girdiler: [{ tur: "dosya", yol: "src/var.ts" }] };
  const t = docDriftTanilari(new Map([["plan.sar", p]]), disk);
  assert.equal(t.length, 1, "yalnız hayalet meyve düşmeli; gelen: " + JSON.stringify(t.map((x) => x.tani.mesaj)));
  assert.equal(t[0].tani.kod, "doc-drift");
  assert.ok(t[0].tani.mesaj.includes("ADM-YOK") && t[0].tani.mesaj.includes("src/hayalet.ts"));
});

// ── BKM-KAPI-A02: MIM-1.4 teknolojisiz-yüzey (proje-düzeyi v1) ───────────────────
import { teknolojisizYuzeyTanilari } from "../src/denetci.ts";
const progYap = (kaynak: string): Map<string, Program> =>
  new Map([["t.sar", ayristir(belirtecle(kaynak))]]);

test("teknolojisiz-yüzey: Ekran var + sıfır Teknoloji → uyarı; Takım'lı proje susar", () => {
  const ciplak = progYap('Ekran( kod: EKR-T, ne: "yalnız ekran" )');
  const t = teknolojisizYuzeyTanilari(ciplak, kodIndeksle(ciplak));
  assert.equal(t.length, 1);
  assert.equal(t[0].tani.kod, "teknolojisiz-yüzey");
  const takimli = progYap('Takım( kod: TAKIM-ON, ne: "önyüz", bağımlı: [ FLUTTER ] )\nEkran( kod: EKR-T, ne: "ekran" )');
  assert.deepEqual(teknolojisizYuzeyTanilari(takimli, kodIndeksle(takimli)), []);
});

test("teknolojisiz-yüzey: çağır hedefi Teknoloji'ye çözülüyorsa teknoloji SEÇİLMİŞ sayılır", () => {
  const p = new Map([
    ["teknolojiler.sar", ayristir(belirtecle('Teknoloji( kod: FLUTTER, ne: "önyüz çatısı" )'))],
    ["ekran.sar", ayristir(belirtecle('çağır FLUTTER\nEkran( kod: EKR-C, ne: "çağıran ekran" )'))],
  ]);
  assert.deepEqual(teknolojisizYuzeyTanilari(p, kodIndeksle(p)), []);
});

// ── ORK-3.3 · DÖNGÜ sağlığı (DNG-FMT-A02): kırık-koşar + durunca v1-sözlüğü ─────
test("ORK-3.3: kırık-koşar uyarır, tanımlı hedef susar; sözlük-dışı durunca bilgi verir", () => {
  const ayr = (k: string) => ayristir(belirtecle(k));
  const programlar = new Map([
    ["plan.sar", ayr('Adım( kod: ADM-VAR, durum: beklemede, ne: "hedef" )')],
    ["dongu.sar", ayr(
      'Döngü( kod: DNG-A, tetik: el, koşar: [ ADM-VAR, ADM-HAYALET ], turLimiti: 3 )\n' +
      'Döngü( kod: DNG-B, tetik: koşul, koşar: [ ADM-VAR ], durunca: "ay dolunayken dur" )\n' +
      'Döngü( kod: DNG-C, tetik: koşul, koşar: [ ADM-VAR ], durunca: "karne.hata == 0" )')],
  ]);
  const t = donguTanilari(programlar, kodIndeksle(programlar));
  const kirik = t.filter((x) => x.tani.kod === "kırık-koşar");
  assert.equal(kirik.length, 1, "yalnız hayalet hedef uyarılmalı");
  assert.ok(kirik[0].tani.mesaj.includes("ADM-HAYALET"));
  const sozluk = t.filter((x) => x.tani.kod === "durunca-sözlüğü");
  assert.equal(sozluk.length, 1, "yalnız sözlük-dışı durunca bilgi almalı (v1 kalıbı susar)");
  assert.ok(sozluk[0].tani.mesaj.includes("dolunay"));
  assert.equal(sozluk[0].tani.duzey, "bilgi");
});

// ── YAS-2.3 (BKM-BUG-A01): kapsam-çözümü — bilinmeyen-kapsam · boş-kapsam · joker ─
test("YAS-2.3: çözülmeyen kapsam seçicisi bilinmeyen-kapsam uyarısı alır (onyuz vakası)", () => {
  const p = derle('Kural x( kod: KRL-K1, kapsam: onyuz ) { ne: "yazım hatalı kapsam" }');
  const programlar = new Map([["a.sar", p]]);
  const t = kapsamTanilari(programlar, kodIndeksle(programlar), snf);
  assert.equal(t.length, 1);
  assert.equal(t[0].tani.kod, "bilinmeyen-kapsam");
  assert.ok(t[0].tani.mesaj.includes("onyuz"));
});

test("YAS-2.3: joker (genel · tümü) + aile + tip + tanımlı KOD seçicileri susar", () => {
  const p = derle([
    'Tema( kod: TMA-1, ne: "hedef" )',
    'Kural a( kod: KRL-JA, kapsam: genel ) { ne: "kanonik joker" }',
    'Kural b( kod: KRL-JB, kapsam: tümü ) { ne: "eş anlamlı joker" }',
    'Kural c( kod: KRL-JC, kapsam: yuzey ) { ne: "aile seçicisi" }',
    'Kural d( kod: KRL-JD, kapsam: Tema ) { ne: "tip seçicisi" }',
    'Kural e( kod: KRL-JE, kapsam: TMA-1 ) { ne: "tek-KOD seçicisi" }',
  ].join("\n"));
  const programlar = new Map([["a.sar", p]]);
  assert.equal(kapsamTanilari(programlar, kodIndeksle(programlar), snf).length, 0);
});

test("YAS-2.3: yapısal-koşullu kural boş kapsama düşerse boş-kapsam uyarır; hedef doğunca susar", () => {
  const kural = 'Kural g( kod: KRL-BOS, katman: yapısal, kapsam: Tema, düzey: uyarı ) { ne: "renk şart" ihlal: "renk yok" koşul: renkler }';
  const bos = new Map([["a.sar", derle(kural)]]);
  const t1 = kapsamTanilari(bos, kodIndeksle(bos), snf);
  assert.equal(t1.filter((x) => x.tani.kod === "boş-kapsam").length, 1);
  const dolu = new Map([["a.sar", derle(kural + '\nTema( kod: TMA-2, ne: "hedef" ) { renkler: { ana: "#111111" } }')]]);
  assert.equal(kapsamTanilari(dolu, kodIndeksle(dolu), snf).filter((x) => x.tani.kod === "boş-kapsam").length, 0);
});

test("YAS-2.3: muaf (bilerek-hatalı) dosyanın kapsam tanıları atlanır", () => {
  const p = derle('Kural x( kod: KRL-K2, kapsam: hayalet_aile ) { ne: "muaf dosyada" }');
  const programlar = new Map([["ornek/bozuk.sar", p]]);
  assert.equal(kapsamTanilari(programlar, kodIndeksle(programlar), snf, new Set(["ornek/bozuk.sar"])).length, 0);
});

// ── BKM-BUG-A02: kırık-referans TAM kapsam — md-kod evreni · defter atfı (A10'da emekli) · giriş-dışı dosya ─
test("A02: .md başlığındaki kimlik kenar hedefini ÇÖZMEZ (ek evren emekli); K-nn defter atfı SESSİZ (A10 emekliliği)", () => {
  const p = derle('Adım( kod: ADM-REF, durum: beklemede, ne: "t", referans: [ FEL-9, K-40, YOK-HEDEF ] )');
  const indeks = kodIndeksle(new Map([["a.sar", p]]));
  const t = referansTanilari(p, indeks, snf);
  // EK EVREN EMEKLİ (2026-08-28 · HTR-FELSEFE-KIMLIKLERI-KAYNAKSIZ): bir kimlik
  // yalnız markdown başlığında geçtiği için çözülmüş SAYILMAZ; kanon lafzen
  // `.sar` kaynağı der ve motor artık aynı şeyi söyler. Bu satır muafiyetin
  // sessizce geri dönmesini engelleyen nöbettir.
  assert.equal(t.filter((x) => x.kod === "kırık-referans" && x.mesaj.includes("FEL-9")).length, 1,
    "kaynakta doğmamış kimlik çözülmüş sayılırsa kapı yeniden yalan söyler");
  // GOC-MOTOR-A10: `defter-referansı` emekli edildi — atıf sessizce meşrudur.
  assert.equal(t.filter((x) => x.kod === "defter-referansı").length, 0,
    "emekli tanı 'defter-referansı' geri dönmüş");
  assert.equal(t.filter((x) => x.mesaj.includes("K-40")).length, 0,
    "defter atfı artık hiçbir tanı doğurmamalı (kırık-referans da dahil)");
  assert.ok(t.some((x) => x.kod === "kırık-referans" && x.duzey === "hata" && x.mesaj.includes("YOK-HEDEF")),
    "gerçek kopukluk hata kalmalı");
});

test("A02 CLI: giriş-DIŞI dosyadaki kırık referans denetle kapısında yakalanır (eski DAR kapsam bitti)", async () => {
  const { execFileSync } = await import("node:child_process");
  const CLI = fileURLToPath(new URL("../src/sarmal.ts", import.meta.url));
  const kok = mkdtempSync(join(tmpdir(), "sarmal-a02-"));
  try {
    writeFileSync(join(kok, "t_anadizin.sar"), 'Proje( kod: ANA-A02, ad: "t", ne: "a02 fikstürü" )\n');
    writeFileSync(join(kok, "is.sar"), 'Adım( kod: ADM-A02, durum: beklemede, ne: "x", referans: [ HAYALET-HEDEF ] )\n');
    let kod = 0, cikti = "";
    try { cikti = execFileSync(process.execPath, [CLI, "denetle", kok], { encoding: "utf8" }); }
    catch (e: any) { kod = e.status ?? -1; cikti = (e.stdout ?? "") + (e.stderr ?? ""); }
    assert.equal(kod, 4, cikti);
    assert.match(cikti, /is\.sar.*kırık-referans.*HAYALET-HEDEF/s);
  } finally {
    rmSync(kok, { recursive: true, force: true });
  }
});

// ── BKM-SNV2-A01/A02: Sınav-2 motor kapıları (F1 rafsız-anadizin · F2 kavuşumsuz-paralellik) ─
test("SNV2-A01: rafsız anadizin uyarır; raf ilanlı kök susar (Sınav-2 F1)", () => {
  const rafsiz = derle('Proje( kod: PRJ-R, ad: "t", ne: "rafsız" ) { Teknoloji( kod: TEK-X, ne: "x" ) }');
  const t1 = rafsizAnadizinTanilari(rafsiz, iskeletPlani(rafsiz, snf), snf);
  assert.equal(t1.length, 1);
  assert.equal(t1[0].kod, "rafsız-anadizin");
  const rafli = derle('Proje( kod: PRJ-R2, ad: "t", ne: "raflı", raflar: { belge: "açıklamalar" } )');
  assert.equal(rafsizAnadizinTanilari(rafli, iskeletPlani(rafli, snf), snf).length, 0);
});

test("SNV2-A02: farklı-takım doğrudan bağımlılık uyarır; Sözleşme köprüsü ve aynı-takım susar (F2)", () => {
  const govde = (onyuzKenar: string, arkaKenar: string) => derle(`
    Takım( kod: TAKIM-ON, ne: "önyüz" )
    Takım( kod: TAKIM-ARKA, ne: "arkayüz" )
    Sözleşme( kod: SZL-K, sürüm: "1", ne: "köprü", alanlar: { a: "metin" } )
    Adım( kod: ADM-ARKA, durum: beklemede, ne: "uç", bağımlı: [ TAKIM-ARKA ]${arkaKenar} )
    Adım( kod: ADM-ON, durum: beklemede, ne: "ekran", bağımlı: [ TAKIM-ON, ADM-ARKA ]${onyuzKenar} )
  `);
  const kos = (p: import("../src/sozdizim.ts").Program) => {
    const programlar = new Map([["a.sar", p]]);
    return kavusumsuzParalellikTanilari(programlar, kodIndeksle(programlar), snf);
  };
  // ① köprüsüz: uyarı
  const t1 = kos(govde("", ""));
  assert.equal(t1.length, 1);
  assert.equal(t1[0].tani.kod, "kavuşumsuz-paralellik");
  assert.ok(t1[0].tani.mesaj.includes("ADM-ON") && t1[0].tani.mesaj.includes("ADM-ARKA"));
  // ② ortak Sözleşme köprüsü: susar
  assert.equal(kos(govde(", referans: [ SZL-K ]", ", üretir: [ SZL-K ]")).length, 0);
  // ③ aynı takım: susar
  const ayni = derle(`
    Takım( kod: TAKIM-ON, ne: "önyüz" )
    Adım( kod: ADM-B, durum: beklemede, ne: "b", bağımlı: [ TAKIM-ON ] )
    Adım( kod: ADM-A, durum: beklemede, ne: "a", bağımlı: [ TAKIM-ON, ADM-B ] )
  `);
  const programlar2 = new Map([["a.sar", ayni]]);
  assert.equal(kavusumsuzParalellikTanilari(programlar2, kodIndeksle(programlar2), snf).length, 0);
});

// ── BKM-BUG-A05 (bug-avı B4 · CANLI KANIT fikstürü): skaler koşar körlüğü ─────
test("A05: skaler koşar da denetlenir — tanımsız tek hedef kırık-koşar alır, tanımlı susar", () => {
  const programlar = new Map([["d.sar", derle(
    'Adım( kod: ADM-VAR2, durum: beklemede, ne: "hedef" )\n' +
    'Döngü( kod: DNG-S1, tetik: el, koşar: ADM-YOK-BOYLE, turLimiti: 1, ne: "kanit_b4 kalıcı fikstürü" )\n' +
    'Döngü( kod: DNG-S2, tetik: el, koşar: ADM-VAR2, turLimiti: 1, ne: "tanımlı skaler" )',
  )]]);
  const t = donguTanilari(programlar, kodIndeksle(programlar));
  const kirik = t.filter((x) => x.tani.kod === "kırık-koşar");
  assert.equal(kirik.length, 1);
  assert.ok(kirik[0].tani.mesaj.includes("ADM-YOK-BOYLE"));
});

// ── BKM-BUG-A06 (bug-avı B6): kenar-metin genellemesi ─────────────────────────
test("A06: tırnaklı kenar hedefi uyarır (referans/üretir); bağımlı/besler ORK-1.2 hükmüne bırakılır (çift tanı yok)", () => {
  const p = derle('Adım( kod: ADM-KM, durum: beklemede, ne: "t", referans: [ "ADM-1" ], üretir: "cikti" )');
  const t = referansTanilari(p, kodIndeksle(new Map([["a.sar", p]])), snf);
  const km = t.filter((x) => x.kod === "kenar-metin");
  assert.equal(km.length, 2, JSON.stringify(t));
  assert.ok(km.every((x) => x.duzey === "uyarı"));
  // bağımlı metin: burada tanı YOK — gizliBagimlilikTanilari (ORK-1.2) tek yetkili
  const p2 = derle('Adım( kod: ADM-KM2, durum: beklemede, ne: "t", bağımlı: "serbest metin" )');
  const t2 = referansTanilari(p2, kodIndeksle(new Map([["b.sar", p2]])), snf);
  assert.equal(t2.filter((x) => x.kod === "kenar-metin").length, 0);
});

// ── BKM-BUG-A07 (bug-avı B5): harf-farkı sessizliği ───────────────────────────
test("A07: yalnız harf-farklı eşleşme artık SESSİZ bastırılmaz — konumlu harf-farkı HATASI", () => {
  const disk = aynasi();
  const i = disk.girdiler.findIndex((g) => g.yol.endsWith("giris_ekrani.md"));
  disk.girdiler[i] = { tur: "dosya", yol: disk.girdiler[i].yol.replace("giris_ekrani.md", "Giris_Ekrani.md") };
  const t = denetle(plan(), disk);
  const hf = t.filter((x) => x.kod === "harf-farkı");
  assert.equal(hf.length, 1, JSON.stringify(t.map((x) => `${x.kod}:${x.mesaj}`)));
  assert.equal(hf[0].duzey, "hata");
  assert.ok(hf[0].satir > 0, "konum ilan satırını göstermeli");
});

// ── BKM-BUG-A08 (bug-avı C1+C2): muafiyet dayanıklılığı ───────────────────────
test("A08 CLI: muaf+bozuk dosya kilitle'yi KESMEZ; muaf+bozuk GİRİŞ denetle'yi çökertmez (çıkış 2)", async () => {
  const { execFileSync } = await import("node:child_process");
  const CLI = fileURLToPath(new URL("../src/sarmal.ts", import.meta.url));
  const kos = (args: string[]): { kod: number; cikti: string } => {
    try { return { kod: 0, cikti: execFileSync(process.execPath, [CLI, ...args], { encoding: "utf8" }) }; }
    catch (e: any) { return { kod: e.status ?? -1, cikti: (e.stdout ?? "") + (e.stderr ?? "") }; }
  };
  const kok = mkdtempSync(join(tmpdir(), "sarmal-a08-"));
  try {
    // ① kilitle: muaf + söz-dizimi bozuk fikstür mühürlemeyi kesmez (eskiden çıkış 2)
    writeFileSync(join(kok, "t_anadizin.sar"), 'Proje( kod: ANA-A08, ad: "t", ne: "a08", raflar: { belge: "b" } )\n');
    writeFileSync(join(kok, "bozuk.sar"), "// sarmal: bilerek-hatalı\nProje( kod: BOZUK ");
    const kilit = kos(["kilitle", kok]);
    assert.equal(kilit.kod, 0, kilit.cikti);
    // ② denetle: GİRİŞ dosyası muaf + bozuk → çökme YOK, dürüst tanı + çıkış 2
    writeFileSync(join(kok, "t_anadizin.sar"), "// sarmal: bilerek-hatalı\nProje( kod: ANA-A08 ");
    const dnt = kos(["denetle", kok]);
    assert.equal(dnt.kod, 2, dnt.cikti);
    assert.match(dnt.cikti, /AYRIŞTIRILAMIYOR|bilerek-hatalı/);
    assert.doesNotMatch(dnt.cikti, /TypeError/);
  } finally {
    rmSync(kok, { recursive: true, force: true });
  }
});

// ── GOC-MOTOR-A10 · EMEKLİLİK NÖBETİ: Hatırlatıcı vade kapısı kaldırıldı ──────
//   Eski ihlal fikstürü aynen korunur; iddia tersine çevrilmiştir. `hatırlatıcı-vade`
//   ile `uzak-vade` yeni omurgada karşılıksızdır (uzak-vade hükmü emekli) ve motor onları
//   BİR DAHA üretmemelidir. Bu nöbet, üreticinin sessizce geri gelmesini engeller.
test("A10 emeklilik: vadesi gelmiş/uzak Hatırlatıcı artık vade tanısı ÜRETMEZ", async () => {
  const denetciModulu = await import("../src/denetci.ts") as Record<string, unknown>;
  assert.equal(denetciModulu.hatirlaticiVadeTanilari, undefined,
    "hatirlaticiVadeTanilari üreticisi geri gelmiş — hatırlatıcı-vade/uzak-vade emeklidir");
  // Eski ihlal fikstürleri tam denetimden geçirilir; iki kimlik de görünmemelidir.
  const p = (tarih: string, durum = "açık") => ayristir(belirtecle(
    `Hatırlatıcı( kod: HTR-VADE-T, durum: ${durum}, çapa: nitelik, ne: "vade denemesi", tarih: "${tarih}" )`));
  const { dogrula } = await import("../src/dogrulayici.ts");
  for (const tarih of ["2026-07-12", "2026-07-01", "2027-01-01"]) {
    const kodlar = dogrula(p(tarih), snf).map((t) => t.kod);
    assert.ok(!kodlar.includes("hatırlatıcı-vade"), `hatırlatıcı-vade geri döndü: ${tarih}`);
    assert.ok(!kodlar.includes("uzak-vade"), `uzak-vade geri döndü: ${tarih}`);
  }
});

// ── MIM-1.4: katmansız-teknoloji bekçisi (ADM-STD-KTEK-TERFI: uyarı + dürüst-beyan) ──
test("MIM-1.4: Takım bağı olmayan Katman UYARI alır; kullanır (asıl) ya da bağımlı (yedek) bağ ile teknolojiBağımsız beyanı susturur; boş beyan sayılmaz", async () => {
  const { katmansizTeknolojiTanilari } = await import("../src/denetci.ts");
  const p = (ek: string) => new Map([["k.sar", ayristir(belirtecle(`
Teknoloji( kod: TEK-K91, ne: "çerçeve" )
Takım( kod: TAKIM-K91, ne: "önyüz takımı", bağımlı: [ TEK-K91 ] )
Blok( kod: BLK-KT, ne: "iş" ) {
  Katman( kod: KAT-KT, ad: "flutter-mobil"${ek} ) {
    Adım( kod: ADM-KT, ne: "a", durum: beklemede )
  }
}`))]]);
  // ① bağsız + beyansız → UYARI (terfi: bilgiydi)
  const bagsiz = katmansizTeknolojiTanilari(p(""));
  assert.equal(bagsiz.length, 1);
  assert.ok(bagsiz[0].tani.kod === "katmansız-teknoloji" && bagsiz[0].tani.duzey === "uyarı");
  // ② ASIL YOL (V1B-KANON-A01): kanonun MIM-1.4/ORK-2.4 yazımı `kullanır:` tek hedef → susar
  assert.equal(katmansizTeknolojiTanilari(p(", kullanır: TEK-K91")).length, 0, "kullanır: TEK bağlı Katman susmalı (kanonik yazım)");
  assert.equal(katmansizTeknolojiTanilari(p(", kullanır: TAKIM-K91")).length, 0, "kullanır: TAKIM bağlı Katman susmalı");
  // ③ GEÇİŞ YEDEĞİ: Takım/Teknoloji hedefli `bağımlı:` yazımı okunmaya devam eder → susar
  assert.equal(katmansizTeknolojiTanilari(p(", bağımlı: [ TAKIM-K91 ]")).length, 0, "Takım bağlı Katman susmalı (geçiş yedeği)");
  // ④ ÇİFT YAZIM: iki kenar birlikte aynı olguyu beyan eder, çelişki değildir → susar
  assert.equal(katmansizTeknolojiTanilari(p(", kullanır: TEK-K91, bağımlı: [ TAKIM-K91 ]")).length, 0, "çift yazım susmalı — ikisi de teknoloji zemini beyan eder");
  // ⑤ gerekçeli teknolojiBağımsız beyanı → susar (dürüst-beyan kaçışı)
  assert.equal(katmansizTeknolojiTanilari(p(', teknolojiBağımsız: "süreç katmanı — teknoloji dilimi değil"')).length, 0, "gerekçeli beyan susturmalı");
  // ⑥ BOŞ beyan → beyan sayılmaz, uyarı sürer
  assert.equal(katmansizTeknolojiTanilari(p(', teknolojiBağımsız: "  "')).length, 1, "boş gerekçe beyan sayılmaz");
  // ⑦ kullanır hedefi Takım/Teknoloji DEĞİLSE bağ sayılmaz — uyarı sürer (tip ölçütü korunur)
  assert.equal(katmansizTeknolojiTanilari(p(", kullanır: ADM-KT")).length, 1, "teknoloji-dışı kullanır hedefi bağ sayılmaz");
});

// ── YAS-2.1: uygulanmamış-karar bekçisi (karar yönlendirme kapısı) ─────────────
test("YAS-2.1: gerekli+kilitli+bağsız karar UYARI alır; kendinden-tam / bekliyor / beyansız / referans-bağlı karar susar", async () => {
  const { uygulanmamisKararTanilari } = await import("../src/denetci.ts");
  const kur = (karar: string, plan = "") => new Map([["k.sar", ayristir(belirtecle(`
${karar}
Blok( kod: BLK-KYK, ne: "iş" ) {
  Katman( kod: KAT-KYK, ad: "a", teknolojiBağımsız: "fikstür" ) {
    Adım( kod: ADM-KYK, ne: "a", durum: beklemede, bağımlı: []${plan} )
  }
}`))]]);
  const K = 'Karar( kod: K-T1, sıra: 10, durum: %D%, %U%ne: "t", karar: "t", gerekçe: "t" )';
  const yap = (durum: string, uyg: string, plan = "") =>
    uygulanmamisKararTanilari(kur(K.replace("%D%", durum).replace("%U%", uyg), plan));
  // ① kilitli + gerekli + bağsız → UYARI
  const bagsiz = yap("kilitli", 'uygulama: gerekli, ');
  assert.equal(bagsiz.length, 1);
  assert.ok(bagsiz[0].tani.kod === "uygulanmamış-karar" && bagsiz[0].tani.duzey === "uyarı");
  // ② kendinden-tam → susar (konvansiyon kararı plan istemez)
  assert.equal(yap("kilitli", 'uygulama: kendinden-tam, ').length, 0);
  // ③ bekliyor + gerekli → susar (yalnız KİLİTLİ karar plana iner)
  assert.equal(yap("bekliyor", 'uygulama: gerekli, ').length, 0);
  // ④ beyansız kilitli → susar (dürüst-beyan opt-in — mevcut defter boğulmaz)
  assert.equal(yap("kilitli", "").length, 0);
  // ⑤ gerekli + referans bağlı Adım → susar (ters-bağ ORK-1.2)
  assert.equal(yap("kilitli", 'uygulama: gerekli, ', ", referans: [ K-T1 ]").length, 0);
});

// ── DIL-1.1: dil denetçisi (diakritik-kayıp + normalizasyon-uyumsuz) ───────────
test("DIL-1.1: şapkasız alan adı (gorev/bagimli) bilgi tanısı üretir; doğru yazım susar; NFD ham kaynak normalizasyon-uyumsuz verir, NFC susar", async () => {
  const { dilTanilari } = await import("../src/denetci.ts");
  // ① şapkasız alan adları → diakritik-kayıp (her biri ayrı tanı)
  const sapkasiz = new Map([["k.sar", ayristir(belirtecle(`
Blok( kod: BLK-DIL, ne: "iş" ) {
  Adım( kod: ADM-DIL, ne: "a", durum: beklemede, gorev: "kaybolan niyet", bagimli: [] )
}`))]]);
  const tanilar = dilTanilari(sapkasiz);
  assert.equal(tanilar.length, 2);
  assert.ok(tanilar.every((t) => t.tani.kod === "diakritik-kayıp" && t.tani.duzey === "bilgi"));
  assert.ok(tanilar[0].tani.mesaj.includes("görev"), "öneri kanonik adı söylemeli");
  // ② doğru şapkalı yazım → susar
  const dogru = new Map([["k.sar", ayristir(belirtecle(`
Blok( kod: BLK-DIL2, ne: "iş" ) {
  Adım( kod: ADM-DIL2, ne: "a", durum: beklemede, görev: "niyet", bağımlı: [] )
}`))]]);
  assert.equal(dilTanilari(dogru).length, 0);
  // ③ NFD ham kaynak → normalizasyon-uyumsuz (satır konumuyla); NFC → susar
  const nfd = "// yorum\nAd\u0131m( kod: ADM-N, ne: \"go\u0308rev metni\" )\n";   // o + U+0308 birleşen çift-nokta = NFD ö
  const nfdTani = dilTanilari(new Map(), new Map([["n.sar", nfd]]));
  assert.equal(nfdTani.length, 1);
  assert.ok(nfdTani[0].tani.kod === "normalizasyon-uyumsuz" && nfdTani[0].tani.satir === 2);
  assert.equal(dilTanilari(new Map(), new Map([["n.sar", nfd.normalize("NFC")]])).length, 0, "NFC kaynak susmalı");
});

// ── GOC-MOTOR-A10 · EMEKLİLİK NÖBETİ: Faz takvim ısrarı kaldırıldı ───────────
//   `faz-tarihsiz`, `faz-gecikti` ve `faz-yaklaşıyor` emekli edildi (MIM-1.2: tarih
//   güçlü tavsiyedir, eksikliği ihlal değildir). Eski ihlal fikstürlerinin üçü de
//   korunur ve artık SESSİZ kalmaları nöbete alınır. `günsüz-tarih` yaşamaya
//   devam eder — canlı bahçede bulgu ürettiği ölçüldü, emekli edilmedi.
test("A10 emeklilik: tarihsiz/geciken/yaklaşan Faz artık takvim tanısı ÜRETMEZ", async () => {
  const { fazVadeTanilari } = await import("../src/denetci.ts");
  const p = (tarihAlani: string, durum = "beklemede") => ayristir(belirtecle(`
Faz( kod: FZ-VD, ad: "mvp"${tarihAlani} ) {
  Blok( kod: BLK-VD, ne: "iş" ) { Adım( kod: ADM-VD, ne: "a", durum: ${durum} ) }
}`));
  const emekli = ["faz-tarihsiz", "faz-gecikti", "faz-yaklaşıyor"];
  const fikstur = ["", ', hedefTarih: "2026-07-01"', ', hedefTarih: "2026-07-18"', ', hedefTarih: "belirsiz"'];
  for (const f of fikstur) {
    const kodlar = fazVadeTanilari(p(f), "2026-07-12").map((t) => t.kod);
    for (const k of emekli)
      assert.ok(!kodlar.includes(k), `emekli tanı '${k}' geri döndü (fikstür: ${f || "tarihsiz"})`);
  }
  // KORUNAN hüküm: ay hassasiyetli tarihte motor hâlâ nazikçe gün sorar.
  const ay = fazVadeTanilari(p(', hedefTarih: "2099-01"'), "2026-07-12");
  assert.equal(ay.length, 1, JSON.stringify(ay));
  assert.equal(ay[0].kod, "günsüz-tarih");
});

// ── E1-A02 (MIM-1.3 · IDA dogfood): silo-blok — tek-yüz + güvenliksiz Blok dikey dilim değil ──
test("E1-A02: silo-blok — tek-yüz+güvenliksiz uyarır; dikey-dilim ve güvenlikli susar", () => {
  const kos = (s: string) => { const pm = new Map([["a.sar", derle(s)]]); return siloBlokTanilari(pm, kodIndeksle(pm), snf); };
  // ① yalnız önyüz (Ekran), güvenlik yok → silo
  const t1 = kos('Blok( kod: BLK-ON, ne: "x" ) { Ekran( kod: EKR-1, ne: "e" ) }');
  assert.equal(t1.length, 1);
  assert.ok(t1[0].tani.kod === "silo-blok" && /önyüz/.test(t1[0].tani.mesaj));
  // ② dikey dilim (Ekran + Uç) → TEMİZ (silo değil)
  assert.equal(kos('Blok( kod: BLK-D, ne: "x" ) { Ekran( kod: EKR-2, ne: "e" ) Uç( kod: UC-2, ne: "u" ) }').length, 0);
  // ③ tek-yüz ama Güvenlik var → SUSAR
  assert.equal(kos('Blok( kod: BLK-G, ne: "x" ) { Ekran( kod: EKR-5, ne: "e" ) Güvenlik( kod: GUV-5, ne: "g" ) }').length, 0);
  // ④ yüzsüz ince-plan (yalnız Adım) → DÜŞMEZ (kavuşacak yüz yok)
  assert.equal(kos('Blok( kod: BLK-I, ne: "x" ) { Katman( kod: KAT-I, ne: "k" ) { Adım( kod: ADM-I, durum: beklemede, ne: "a", görev: "iş" ) } }').length, 0);
});

// ── E1-A03 (ORK-2.3 üst kademe · IDA dogfood): kavuşumsuz-dilim — FE+BE var ama bağlanmamış ──
test("E1-A03: kavuşumsuz-dilim — köprüsüz FE+BE uyarır; çağırır ve contract-first susar", () => {
  const kos = (s: string) => { const pm = new Map([["a.sar", derle(s)]]); return kavusumsuzDilimTanilari(pm, kodIndeksle(pm), snf); };
  // ① Ekran + Uç, kavuşum yok → kavuşumsuz-dilim
  const t1 = kos('Blok( kod: BLK-K, ne: "x" ) { Ekran( kod: EKR-3, ne: "e" ) Uç( kod: UC-3, ne: "u" ) }');
  assert.equal(t1.length, 1);
  assert.ok(t1[0].tani.kod === "kavuşumsuz-dilim" && t1[0].tani.mesaj.includes("EKR-3") === false);   // düğüm ADI (tip) mesajda
  assert.ok(/hem yüzey.*hem arkayüz/.test(t1[0].tani.mesaj));
  // ② doğrudan çağırır köprüsü → TEMİZ
  assert.equal(kos('Blok( kod: BLK-C, ne: "x" ) { Ekran( kod: EKR-4, ne: "e", çağırır: [ UC-4 ] ) Uç( kod: UC-4, ne: "u" ) }').length, 0);
  // ③ contract-first (ortak Sözleşme) → TEMİZ
  assert.equal(kos('Sözleşme( kod: SZL-1, sürüm: "1", ne: "k", alanlar: { a: "metin" } ) Blok( kod: BLK-S, ne: "x" ) { Ekran( kod: EKR-6, ne: "e", referans: [ SZL-1 ] ) Uç( kod: UC-6, ne: "u", üretir: [ SZL-1 ] ) }').length, 0);
  // ④ yalnız-yüzey (BE yok) → DÜŞMEZ (kavuşacak BE yok)
  assert.equal(kos('Blok( kod: BLK-Y, ne: "x" ) { Ekran( kod: EKR-7, ne: "e" ) Form( kod: FRM-7, ne: "f" ) }').length, 0);
});

// ── MOTOR SUSMAZ (Founder 2026-07-14): açık (beklemede/geliştirmede) Adım neden'iyle gündemde ──
test("açık-adım: beklemede/geliştirmede neden'iyle bilgi verir; tamamlandı SUSAR (motor susmaz)", () => {
  const kos = (s: string) => { const pm = new Map([["a.sar", derle(s)]]); return acikAdimTanilari(pm); };
  // ① geliştirmede → 🚧 + neden (görev)
  const g = kos('Adım( kod: ADM-G, durum: geliştirmede, ne: "g", görev: "kavuşumsuz-dilim bekçisini yaz" )');
  assert.equal(g.length, 1);
  assert.ok(g[0].tani.kod === "açık-adım" && /🚧/.test(g[0].tani.mesaj) && /kavuşumsuz-dilim bekçisini yaz/.test(g[0].tani.mesaj));
  assert.equal(g[0].tani.duzey, "bilgi");
  // ② beklemede → 🔵
  const b = kos('Adım( kod: ADM-B, durum: beklemede, ne: "b", görev: "silo bekçisi" )');
  assert.ok(b.length === 1 && /🔵/.test(b[0].tani.mesaj));
  // ③ tamamlandı → SUSAR (iş bitti, motor unutabilir)
  assert.equal(kos('Adım( kod: ADM-T, durum: tamamlandı, ne: "t", görev: "bitti" )').length, 0);
});

// ── E1-A04 (MIM-1.4 · IDA dogfood): doğuş-sırası — PROJE-farkında; fragman yanlış-pozitifi yok ──
test("E1-A04: doğuş-sırası — omurgasız plan uyarır; teknoloji/çağır BAŞKA dosyada olsa da TEMİZ", () => {
  const plan = derle('Faz( kod: FZ-D, ad: "x" ) { Blok( kod: BLK-D, ne: "iş" ) { Adım( kod: ADM-D, durum: beklemede, ne: "a", görev: "iş" ) } }');
  // ① teknolojisiz proje (yalnız plan) → doğuş-sırası
  const t1 = dogusEksikProjeTanilari(new Map([["plan.sar", plan]]));
  assert.equal(t1.length, 1);
  assert.ok(t1[0].tani.kod === "doğuş-sırası" && t1[0].tani.duzey === "uyarı");
  // ② teknoloji BAŞKA dosyada (anadizin) → proje-farkında TEMİZ (fragman yanlış-pozitifi yok)
  const anadizin = derle('Proje( kod: PRJ-D, ad: "d", ne: "d" ) { Teknoloji( kod: TEK-D, ne: "t" ) }');
  assert.equal(dogusEksikProjeTanilari(new Map([["anadizin.sar", anadizin], ["plan.sar", plan]])).length, 0);
  // ③ çağır köprüsü olan fragman → TEMİZ
  const kopru = derle('Faz( kod: FZ-K, ad: "x" ) { Blok( kod: BLK-K, ne: "iş" ) { çağır TEK-UZAK } }');
  assert.equal(dogusEksikProjeTanilari(new Map([["k.sar", kopru]])).length, 0);
  // ④ plan düğümü YOK (yalnız temel kök) → uyarmaz (henüz plan yazılmadı)
  const bosKok = derle('Proje( kod: PRJ-B, ad: "b", ne: "b", raflar: { plan: "plan/" } )');
  assert.equal(dogusEksikProjeTanilari(new Map([["a.sar", bosKok]])).length, 0);
});

// ── B2=A (YAS-4): olgunluk-onayı — EVRE-1→EVRE-2 geçiş anı hatırlatıcısı ──
test("olgunluk-onayı: plan olgun+kod başlamamış → hatırlatır; kod başladı VEYA koni-eksik → susar", () => {
  const olgun = 'Blok( kod: BLK-O, ne: "x" ) { Katman( kod: KAT-O, ne: "k" ) { Adım( kod: ADM-O1, durum: beklemede, ne: "a", görev: "iş1", kabul: "k1" ) Adım( kod: ADM-O2, durum: beklemede, ne: "b", görev: "iş2", kabul: "k2" ) } }';
  // ① plan olgun (koni-dolu) + kod HENÜZ başlamamış → hatırlatıcı (bilgi)
  const t1 = olgunlukOnayiTanilari(new Map([["p.sar", derle(olgun)]]));
  assert.equal(t1.length, 1);
  assert.ok(t1[0].tani.kod === "olgunluk-onayı" && t1[0].tani.duzey === "bilgi" && /OLGUNLUK ONAYI/.test(t1[0].tani.mesaj));
  // ② kod başladı (geliştirmede Adım var) → SUSAR (geçiş anı geçti)
  const kodBasladi = 'Blok( kod: BLK-K, ne: "x" ) { Katman( kod: KAT-K, ne: "k" ) { Adım( kod: ADM-K1, durum: geliştirmede, ne: "a", görev: "iş", kabul: "k" ) } }';
  assert.equal(olgunlukOnayiTanilari(new Map([["p.sar", derle(kodBasladi)]])).length, 0);
  // ③ koni EKSİK (görev/kabul yok) → SUSAR (plan henüz olgun değil)
  const koniEksik = 'Blok( kod: BLK-E, ne: "x" ) { Katman( kod: KAT-E, ne: "k" ) { Adım( kod: ADM-E1, durum: beklemede, ne: "a" ) } }';
  assert.equal(olgunlukOnayiTanilari(new Map([["p.sar", derle(koniEksik)]])).length, 0);
  // ④ plan iskeleti yok (Blok yok) → SUSAR
  assert.equal(olgunlukOnayiTanilari(new Map([["p.sar", derle('Adım( kod: ADM-X, durum: beklemede, ne: "x", görev: "g", kabul: "k" )')]])).length, 0);
});

// ── #10 (IDA dogfood): framework-dayatması klasör adı ad-standardı DIŞI ─────────────
//   Founder canlı panelde gördü: Next.js [dil]·(hukuki)·(tanitim) route folder'ları
//   “ad-standardına aykırı” (küçük ASCII) diye işaretleniyordu — YANLIŞ-POZİTİF: bunlar
//   framework yolu, yeniden adlandırılamaz. Gerçek portability tehlikesi (diakritik/
//   boşluk/büyük harf) HÂLÂ yakalanmalı.
test("#10: framework klasör adları ([dil]·(hukuki)·@panel) ad-standardını tetiklemez; diakritik/boşluk yakalanır", () => {
  const kok = mkdtempSync(join(tmpdir(), "sarmal-dl2-"));
  try {
    // ÇalışmaAlanı içindeki Uygulama (nested temel · kök değil) icerikSerbest-OLMAYAN
    // omurga dizini yaratır → alt-klasörleri ad-standardıyla denetlenir (IDA'daki gerçek 'tanitim/…' durumu).
    const p = iskeletPlani(ayristir(belirtecle(
      'ÇalışmaAlanı( kod: CAL-D, ad: "d", ne: "x" ) {\n  Uygulama( kod: UYG-T, ad: "tanitim", ne: "app" )\n}')), snf);
    mkdirSync(join(kok, "tanitim", "[dil]", "(hukuki)"), { recursive: true });
    mkdirSync(join(kok, "tanitim", "@panel"), { recursive: true });
    mkdirSync(join(kok, "tanitim", "Büyük Klasör"), { recursive: true });   // diakritik+boşluk+büyük → gerçek ad-standardı ihlali
    const t = kuralTanilari(p, diskTara(kok));
    const ihlaller = t.filter((x) => x.kod === "kural-ihlali").map((x) => x.mesaj);
    for (const fw of ["[dil]", "(hukuki)", "@panel"]) {
      assert.ok(!ihlaller.some((m) => m.includes(fw)), `${fw} framework yolu ad-standardını tetiklememeli: ${ihlaller.join(" | ")}`);
    }
    assert.ok(ihlaller.some((m) => m.includes("Büyük Klasör")), `gerçek portability tehlikesi (Büyük Klasör) ad-standardı ihlali vermeli: ${ihlaller.join(" | ")}`);
  } finally { rmSync(kok, { recursive: true, force: true }); }
});

// ── DIL-1.2 önek bekçisi · TEK-DOSYA (GBR-A05 · IDA dogfood #3) ──────────────────
//   Öneksiz giriş dosyası (anadizin.sar/ana.sar) yalnız proje-düzeyinde 'ana-yok'
//   patlıyordu; tek-dosya görünümü "mutlu" kalıyordu. Bekçi beklenen adı tek
//   bakışta söyler — doğru adlı giriş sessiz kalır (yanlış-pozitif yok).
const KOK = 'Proje( kod: PRJ-X, ad: "ida", ne: "x" ) { Teknoloji( kod: T, ne: "y" ) }';

// ── GOC-MOTOR-A10 · EMEKLİLİK NÖBETİ: giriş dosyası önek bekçisi kaldırıldı ──
//   `öneksiz-anadizin` ile `eski-giriş-adı` emekli edildi. Eski ihlal fikstürleri
//   (öneksiz `anadizin.sar` ve eski `ana.sar`) korunur; ikisi de artık SESSİZ.
//   Motorun eski adı TANIMASI değişmedi — yalnız ayrı tanı basılmıyor.
test("A10 emeklilik: öneksiz anadizin.sar ve eski ana.sar artık ad tanısı ÜRETMEZ", async () => {
  const denetciModulu = await import("../src/denetci.ts") as Record<string, unknown>;
  assert.equal(denetciModulu.anadizinAdiTanisi, undefined,
    "anadizinAdiTanisi üreticisi geri gelmiş — öneksiz-anadizin/eski-giriş-adı emeklidir");
  const KOK = 'Proje( kod: PRJ-AD, ad: "ida", ne: "x" )';
  for (const dosya of ["/proj/anadizin.sar", "/proj/ana.sar", "/proj/ida_anadizin.sar"]) {
    const kodlar = dogrulaModulu(prog(KOK), dosya).map((t) => t.kod);
    assert.ok(!kodlar.includes("öneksiz-anadizin"), `öneksiz-anadizin geri döndü: ${dosya}`);
    assert.ok(!kodlar.includes("eski-giriş-adı"), `eski-giriş-adı geri döndü: ${dosya}`);
  }
});

// ── EVRE-farkında severity yardımcıları (GBR-A01 · IDA dogfood #4-CLI) ────────
//   Planlarken (EVRE-1) declared-but-not-built FORMATİF; kod başlayınca (EVRE-2)
//   summatif. Sinyaller: durum-makinesi (kod başladı) + anadizin evre-beyanı.
const progMap = (kaynak: string): Map<string, Program> => new Map([["t.sar", prog(kaynak)]]);

test("EVRE: kodBasladiMi — Adım geliştirmede/tamamlandı → true; beklemede/yok → false", () => {
  assert.equal(kodBasladiMi(progMap('Adım( kod: A, durum: geliştirmede, ne: "x" )')), true);
  assert.equal(kodBasladiMi(progMap('Adım( kod: A, durum: tamamlandı, ne: "x" )')), true, "'bitti' iddiası da kod-başladı");
  assert.equal(kodBasladiMi(progMap('Adım( kod: A, durum: beklemede, ne: "x" )')), false);
  assert.equal(kodBasladiMi(progMap('Kitaplık( kod: K, yol: "a/", ne: "x" )')), false, "Adım yoksa kod başlamamış");
});

test("EVRE: anadizinEvreBeyani — evre:1/plan→true · evre:2/inşa→false · yok→undefined", () => {
  assert.equal(anadizinEvreBeyani(prog('Proje( kod: P, ad: "t", ne: "x", evre: 1 )')), true);
  assert.equal(anadizinEvreBeyani(prog('Proje( kod: P, ad: "t", ne: "x", evre: plan )')), true);
  assert.equal(anadizinEvreBeyani(prog('Proje( kod: P, ad: "t", ne: "x", evre: 2 )')), false);
  assert.equal(anadizinEvreBeyani(prog('Proje( kod: P, ad: "t", ne: "x", evre: inşa )')), false);
  assert.equal(anadizinEvreBeyani(prog('Proje( kod: P, ad: "t", ne: "x" )')), undefined, "beyan yok → undefined");
  assert.equal(anadizinEvreBeyani(prog('Blok( kod: B, ne: "x" )')), undefined, "kök widget yok → undefined");
});

test("EVRE: planlamaEvresiMi — beyan durum-makinesini EZER (öncelik: insan override)", () => {
  const anaSade = prog('Proje( kod: P, ad: "t", ne: "x" )');
  assert.equal(planlamaEvresiMi(anaSade, progMap('Adım( kod: A, durum: beklemede, ne: "x" )')), true, "kod başlamadı → EVRE-1");
  assert.equal(planlamaEvresiMi(anaSade, progMap('Adım( kod: A, durum: geliştirmede, ne: "x" )')), false, "kod başladı → EVRE-2");
  const anaEvre2 = prog('Proje( kod: P, ad: "t", ne: "x", evre: 2 )');
  assert.equal(planlamaEvresiMi(anaEvre2, progMap('Adım( kod: A, durum: beklemede, ne: "x" )')), false, "evre:2 beyanı kod-başlamasa da EVRE-2");
  const anaEvre1 = prog('Proje( kod: P, ad: "t", ne: "x", evre: 1 )');
  assert.equal(planlamaEvresiMi(anaEvre1, progMap('Adım( kod: A, durum: geliştirmede, ne: "x" )')), true, "evre:1 beyanı kod-başlasa da EVRE-1");
});

test("EVRE: evre1Yumusat — kayıp-yapı/harf-farkı hata→bilgi; küme-dışı/hata-değil DEĞİŞMEZ", () => {
  const y = evre1Yumusat({ duzey: "hata", kod: "kayıp-yapı", mesaj: "m", satir: 1, sutun: 1, oneri: "o" });
  assert.equal(y.duzey, "bilgi");
  assert.match(y.oneri ?? "", /--iskelet/, "üretim ipucu eklenir");
  const h = evre1Yumusat({ duzey: "hata", kod: "harf-farkı", mesaj: "m", satir: 1, sutun: 1 });
  assert.equal(h.duzey, "bilgi");
  // küme dışı (ana-yok) DEĞİŞMEZ — mutabakat kalkmaz
  const a = evre1Yumusat({ duzey: "hata", kod: "kural-ihlali", mesaj: "m", satir: 0, sutun: 0 });
  assert.equal(a.duzey, "hata", "küme-dışı hata EVRE-1'de bile şiddetini korur");
  // zaten bilgi olan DEĞİŞMEZ (idempotent)
  const b = evre1Yumusat({ duzey: "uyarı", kod: "kayıp-yapı", mesaj: "m", satir: 0, sutun: 0 });
  assert.equal(b.duzey, "uyarı");
});

// ── KNT-A11 (B5): ARTEFAKT-YEREL evre — proje-geneli tek bitin panzehiri ──────
import { yerelEvre1Yumusat } from "../src/denetci.ts";

test("KNT-A11 (B5): yeni ilan edilen alt-ağaç formatif kalır; 'bitti' iddiasının drift'i sert HATA — ikisi AYNI fikstürde", () => {
  const p = yapiPlani(`Blok( kod: BLK-ESKI, ne: "olgun iş" ) {
  Katman( kod: KAT-ESKI, ad: "eski", ne: "k" ) {
    Adım( kod: ADM-BITTI, ad: "bitmiş iş", durum: tamamlandı, ne: "x" )
  }
}
Blok( kod: BLK-YENI, ne: "yeni iş" ) {
  Katman( kod: KAT-YENI, ad: "yeni", ne: "k" ) {
    Adım( kod: ADM-TAZE, ad: "taze iş", durum: beklemede, ne: "x" )
  }
}
Kitaplık( kod: KTP-OLGUN, yol: "olgun_raf/", ne: "Adım'sız olgun yapı" )`);
  const disk = { girdiler: [] as Array<{ tur: "dizin" | "dosya"; yol: string }> };   // hiçbir şey üretilmemiş
  const y = yerelEvre1Yumusat(denetle(p, disk), p);
  // Yol-öneki eşleşmesi iç içe yolları da yakalar (blk_yeni/… üçlüsü gibi) — beklenen
  // düzey, önekle eşleşen TÜM tanılar için doğrulanır (boş küme de kırmızı).
  const duzeyler = (parca: string) => y.filter((t) => t.kod === "kayıp-yapı" && t.mesaj.includes(parca)).map((t) => t.duzey);
  const hepsi = (parca: string, beklenen: string) => {
    const d = duzeyler(parca);
    assert.ok(d.length > 0, `'${parca}' için kayıp-yapı tanısı bekleniyordu`);
    assert.ok(d.every((x) => x === beklenen), `'${parca}' → hepsi ${beklenen} olmalı; gelen: ${d.join(",")}`);
  };
  hepsi("blk_yeni", "bilgi");     // yeni alt-ağaç (dizinler + beklemede Adım dosyası) formatif
  hepsi("taze_is.md", "bilgi");
  hepsi("blk_eski", "hata");      // başlamış Adım taşıyan alt-ağaç HATA sürer
  hepsi("bitmis_is.md", "hata");  // 'tamamlandı' iddialı eksik Adım dosyası HATA
  hepsi("olgun_raf", "hata");     // Adım'sız yapının drift'i yumuşatılmaz (sessiz gevşeme yok)
});

test("KNT-A11 (B5): küme-dışı tanı ve eşlenemeyen konum DEĞİŞMEDEN döner (fail-closed)", () => {
  const p = yapiPlani(`Kitaplık( kod: KTP-X, yol: "x/", ne: "y" )`);
  const dokunulmaz = { duzey: "hata" as const, kod: "kural-ihlali", mesaj: "m", satir: 999, sutun: 999 };
  const eslenmeyen = { duzey: "hata" as const, kod: "kayıp-yapı", mesaj: "m", satir: 999, sutun: 999 };
  assert.deepEqual(yerelEvre1Yumusat([dokunulmaz, eslenmeyen], p), [dokunulmaz, eslenmeyen]);
});

// ── Açık-adım GÖSTERİM özeti (GBR-A02 · IDA dogfood #14) ─────────────────────
//   Çok beklemede-Adım tek satıra toplanır; geliştirmede (aktif cephe) ayrıntılı
//   kalır; motor-susmaz sayımı BOZULMAZ (gösterim ≠ sayım katmanı).
import { acikAdimGosterimi } from "../src/denetci.ts";
const adimlarProg = (n: number, durum: string) =>
  Array.from({ length: n }, (_, i) => `Adım( kod: ADM-${durum[0].toUpperCase()}${i}, durum: ${durum}, ne: "iş ${i}" )`).join("\n");

test("GBR-A02: çok beklemede (≥eşik) → TEK özet satırı + örnek; motor-susmaz sayımı korunur", () => {
  const acik = acikAdimTanilari(progMap(adimlarProg(6, "beklemede")));
  assert.equal(acik.length, 6, "acikAdimTanilari TAM listeyi döner (sayım kaynağı bozulmaz)");
  const gost = acikAdimGosterimi(acik, 4);
  assert.equal(gost.length, 1, "6 beklemede → tek özet satırı");
  assert.match(gost[0].tani.mesaj, /6 adım BEKLEMEDE/, "özet sayıyı gösterir (motor susmaz)");
  assert.match(gost[0].tani.mesaj, /Örnek:.*ADM-B0/, "ilk birkaçı örneklenir");
  assert.equal(gost[0].tani.duzey, "bilgi", "açık-adım BİLGİ kalır");
});

test("GBR-A02: az beklemede (< eşik) → mevcut ayrıntılı davranış korunur", () => {
  const acik = acikAdimTanilari(progMap(adimlarProg(3, "beklemede")));
  const gost = acikAdimGosterimi(acik, 4);
  assert.equal(gost.length, 3, "3 beklemede (eşik-altı) tek tek görünür (ayrıntı korunur)");
});

test("GBR-A02: geliştirmede (aktif cephe) HER ZAMAN ayrıntılı; yalnız beklemede özetlenir", () => {
  const acik = acikAdimTanilari(progMap(adimlarProg(5, "beklemede") + "\n" + adimlarProg(2, "geliştirmede")));
  const gost = acikAdimGosterimi(acik, 4);
  // 2 geliştirmede ayrıntılı + 1 beklemede özeti = 3
  assert.equal(gost.length, 3, "2 geliştirmede detay + 1 beklemede özeti");
  const gelistirmede = gost.filter((g) => g.tani.mesaj.includes("geliştirmede"));
  assert.equal(gelistirmede.length, 2, "geliştirmede Adımlar tek tek korunur (aktif cephe)");
  assert.ok(gost.some((g) => /adım BEKLEMEDE/.test(g.tani.mesaj)), "beklemede özet satırı var");
});

// GOC-MOTOR-A10 (2026-07-27): `faz-tarihsiz` emekli edilince EVRE-1 yumuşatma
// sınaması da konusuz kaldı ve kaldırıldı — susturulacak bir ısrar kalmadı.

// ── MIM-1.2 (ZMN-A06 · Founder revizesi): 'belirsiz'/tarihsiz Faz KABULDÜR — HATA yok,
//    bilgi düzeyinde hatırlatma var, iş akışı kesilmez ("çalışabilirsin böyle, yine de
//    hatırlatıyorum"). Sahte-faz HATA'sı bir gün yaşadı, aynı gün saha itirazıyla kalktı.
test("MIM-1.2: 'belirsiz' hedefTarih'li Faz HATA üretmez (hatırlatma da emekli — A10)", async () => {
  const { fazVadeTanilari } = await import("../src/denetci.ts");
  const fz = (t: string) => ayristir(belirtecle(
    `Faz( kod: FZ-B, ad: "mvp", hedefTarih: ${t} ) {\n  Blok( kod: BLK-B, ne: "iş" ) { Adım( kod: ADM-B, ne: "a", durum: beklemede ) }\n}`));
  for (const v of ['belirsiz', '"belirsiz"', 'Belirsiz', 'TBD']) {
    const t = fazVadeTanilari(fz(v), "2026-07-12");
    assert.equal(t.filter((x) => x.duzey === "hata").length, 0, `'${v}' HATA üretmemeli (MIM-1.2)`);
    assert.equal(t.length, 0, `'${v}' artık hiç tanı üretmemeli — faz-tarihsiz A10'da emekli edildi`);
  }
});

test("MIM-1.2: ay hassasiyeti (YYYY-AA) geçerli tarihtir — günsüz-tarih nazik sorusu + vade ay sonunu esas alır", async () => {
  const { fazVadeTanilari } = await import("../src/denetci.ts");
  const fz = (t: string) => ayristir(belirtecle(
    `Faz( kod: FZ-AY, ad: "mvp", hedefTarih: ${t} ) {\n  Blok( kod: BLK-AY, ne: "iş" ) { Adım( kod: ADM-AY, ne: "a", durum: beklemede ) }\n}`));
  const uzak = fazVadeTanilari(fz('"2099-01"'), "2026-07-12");
  assert.equal(uzak.length, 1, JSON.stringify(uzak));
  assert.equal(uzak[0].kod, "günsüz-tarih");
  assert.equal(uzak[0].duzey, "bilgi");
  assert.ok(/gün de belirtmek ister misin/.test(uzak[0].mesaj), "nazik soru Founder diliyle olmalı");
  // A10 sonrası: ay sonu esaslı vade nöbetleri emekli; yalnız nazik gün sorusu kalır.
  const yakin = fazVadeTanilari(fz('"2026-07"'), "2026-07-28");
  assert.deepEqual(yakin.map((x) => x.kod), ["günsüz-tarih"], "ay hassasiyeti yalnız gün sorusunu doğurmalı");
  const gec = fazVadeTanilari(fz('"2026-07"'), "2026-08-05");
  assert.ok(!gec.some((x) => x.kod === "faz-gecikti"), "faz-gecikti emeklidir, geri dönmemeli");
});

test("MIM-1.2: ders dünyası (INDEKS_DISI) hatırlatmalardan muaf; tam tarihli Faz'ın vade nöbeti değişmedi", async () => {
  const { fazVadeTanilari } = await import("../src/denetci.ts");
  const fz = (t: string) => ayristir(belirtecle(
    `Faz( kod: FZ-B2, ad: "mvp", hedefTarih: ${t} ) {\n  Blok( kod: BLK-B2, ne: "iş" ) { Adım( kod: ADM-B2, ne: "a", durum: beklemede ) }\n}`));
  assert.equal(fazVadeTanilari(fz('"belirsiz"'), "2026-07-12", "ornek/vitrin_dosyasi.sar").length, 0);
  assert.equal(fazVadeTanilari(fz('"belirsiz"'), "2026-07-12", "sablon/dogus/ilk_plan.sar").length, 0);
  assert.equal(fazVadeTanilari(fz('"2099-01"'), "2026-07-12", "ornek/vitrin_dosyasi.sar").length, 0, "günsüz-tarih sorusu da ders dünyasında susar");
  assert.equal(fazVadeTanilari(fz('"2099-01-01"'), "2026-07-12").length, 0);
  // A10: yaklaşan ve geciken vade nöbetleri emekli — tam tarihli Faz da sessiz kalır.
  assert.equal(fazVadeTanilari(fz('"2026-07-15"'), "2026-07-12").length, 0);
  assert.equal(fazVadeTanilari(fz('"2026-07-01"'), "2026-07-12").length, 0);
});

// ── MIM-1.2 (ZMN-A05): mevsim: kenarı + planlanmamış beyanı — dil evrimi uygulaması ──
//    Çevrim TEK noktada (mevsimNormalize · YUZ-1.2): Blok'un mevsim: alanı hedef Faz'a
//    sanal çağır olarak iner; fazsız-blok üç meşru hâl tanır; iki dürüstlük nöbeti.
test("ZMN-A05: mevsim: ile bağlanan Blok fazsız-blok almaz (çevrim sanal çağır kurar — ayrı dosyadaki Faz'a)", async () => {
  const { mevsimNormalize, hiyerarsiTanilari } = await import("../src/denetci.ts");
  const m = new Map<string, Program>([
    ["faz.sar", prog('Faz( kod: FAZ-TEST, ad: "mevsim", hedefTarih: "2099-01-01" ) {\n}')],
    ["plan.sar", prog('Blok( kod: BLK-MVS, mevsim: FAZ-TEST, ne: "iş" ) { Katman( kod: KTM-M, ad: "k" ) { Adım( kod: ADM-M, ne: "a", durum: beklemede ) } }')],
  ]);
  mevsimNormalize(m);
  const t = hiyerarsiTanilari(m);
  assert.equal(t.filter((x) => x.tani.kod === "fazsız-blok").length, 0, "mevsim: kapsama sayılmalı (hâl ②); gelen: " + JSON.stringify(t.map((x) => x.tani.mesaj)));
  // sanal kenar Faz'ın gövdesine indi ve imzalı — çağır-çevrimi tüketicileri (panel/karne) bedava alır
  const faz = m.get("faz.sar")!.bildirimler[0];
  const sanal = faz.cocuklar.find((c) => c.tur === "çağır" && c.ad === "BLK-MVS");
  assert.ok(sanal, "Faz'a sanal çağır çocuğu eklenmiş olmalı");
  assert.ok(sanal!.parametreler.some((p) => p.ad === "sanal"), "sanal kenar imzalı olmalı (gerçek kenardan ayrılır)");
});

test("ZMN-A05: çift-mevsim-kaydı — bağ hem Faz çağır listesinde hem mevsim: alanında → UYARI; yalnız-mevsim temiz", async () => {
  const { mevsimNormalize, hiyerarsiTanilari } = await import("../src/denetci.ts");
  const cift = new Map<string, Program>([
    ["faz.sar", prog('Faz( kod: FAZ-C, ad: "mevsim", hedefTarih: "2099-01-01" ) {\n  çağır BLK-C\n}')],
    ["plan.sar", prog('Blok( kod: BLK-C, mevsim: FAZ-C, ne: "iş" ) { Katman( kod: KTM-C, ad: "k" ) { Adım( kod: ADM-C, ne: "a", durum: beklemede ) } }')],
  ]);
  mevsimNormalize(cift);
  const t = cift && hiyerarsiTanilari(cift).filter((x) => x.tani.kod === "çift-mevsim-kaydı");
  assert.equal(t.length, 1, "iki yerde yazılan bağ tek-kaynak uyarısı almalı");
  assert.equal(t[0].tani.duzey, "uyarı");
  // yalnız mevsim: (sanal kenar) → nöbet SUSAR (sanal imza gerçek kayıt sayılmaz)
  const tek = new Map<string, Program>([
    ["faz.sar", prog('Faz( kod: FAZ-T, ad: "mevsim", hedefTarih: "2099-01-01" ) {\n}')],
    ["plan.sar", prog('Blok( kod: BLK-T, mevsim: FAZ-T, ne: "iş" ) { Katman( kod: KTM-T, ad: "k" ) { Adım( kod: ADM-T, ne: "a", durum: beklemede ) } }')],
  ]);
  mevsimNormalize(tek);
  assert.equal(hiyerarsiTanilari(tek).filter((x) => x.tani.kod === "çift-mevsim-kaydı").length, 0, "tek kayıt (mevsim:) uyarı almamalı");
});

test("ZMN-A05: planlanmamış beyanı — dolu neden fazsız-blok HATASINI bilgiye çevirir (planlanmamış-gövde); boş neden beyan sayılmaz", async () => {
  const { hiyerarsiTanilari } = await import("../src/denetci.ts");
  const dolu = hiyerarsiTanilari(progMap('Blok( kod: BLK-P, planlanmamış: "pazara çıkış kararı Founder\'da", ne: "raf işi" ) { Katman( kod: KTM-P, ad: "k" ) { Adım( kod: ADM-P, ne: "a", durum: beklemede ) } }'));
  assert.equal(dolu.filter((x) => x.tani.kod === "fazsız-blok").length, 0, "dolu beyan hata almamalı (hâl ③)");
  const bilgi = dolu.filter((x) => x.tani.kod === "planlanmamış-gövde");
  assert.equal(bilgi.length, 1, "planlanmamış-gövde bilgi satırı basılmalı");
  assert.equal(bilgi[0].tani.duzey, "bilgi");
  // boş neden → hata sürer, mesaj zorunlu-nedeni anlatır
  const bos = hiyerarsiTanilari(progMap('Blok( kod: BLK-B, planlanmamış: "", ne: "iş" ) { Katman( kod: KTM-B, ad: "k" ) { Adım( kod: ADM-B, ne: "a", durum: beklemede ) } }'));
  const hata = bos.filter((x) => x.tani.kod === "fazsız-blok");
  assert.equal(hata.length, 1, "boş beyan fazsız-blok'u susturmamalı");
  assert.ok(/BOŞ/.test(hata[0].tani.mesaj), "mesaj boş-beyan sebebini açmalı");
});

test("ZMN-A05: planlanmamış-çelişki — planlanmamış gövde altında geliştirmede Adım → UYARI (sahte-kaçış nöbeti)", async () => {
  const { hiyerarsiTanilari } = await import("../src/denetci.ts");
  const t = hiyerarsiTanilari(progMap('Blok( kod: BLK-K, planlanmamış: "önceliklendirme bekliyor", ne: "iş" ) { Katman( kod: KTM-K, ad: "k" ) { Adım( kod: ADM-K, ne: "a", durum: geliştirmede, bağımlı: [ ADM-M ] ) } }'));
  const celiski = t.filter((x) => x.tani.kod === "planlanmamış-çelişki");
  assert.equal(celiski.length, 1, "başlamış iş + planlanmamış beyanı çelişki uyarısı almalı; gelen: " + JSON.stringify(t.map((x) => x.tani.kod)));
  assert.equal(celiski[0].tani.duzey, "uyarı");
  assert.ok(celiski[0].tani.mesaj.includes("ADM-K"), "mesaj başlayan Adım'ı adıyla göstermeli");
});

test("ZMN-A05: fazsız-blok önerisi üç meşru yolu sayar (mevsim: · gerçek-tarihli Faz · planlanmamış beyan)", async () => {
  const { hiyerarsiTanilari } = await import("../src/denetci.ts");
  const t = hiyerarsiTanilari(progMap('Blok( kod: BLK-Y, ne: "iş" ) { Katman( kod: KTM-Y, ad: "k" ) { Adım( kod: ADM-Y, ne: "a", durum: beklemede ) } }'));
  const hata = t.filter((x) => x.tani.kod === "fazsız-blok");
  assert.equal(hata.length, 1);
  assert.ok(/mevsim:/.test(hata[0].tani.oneri ?? ""), "öneri mevsim: yolunu göstermeli");
  assert.ok(/planlanmamış/.test(hata[0].tani.oneri ?? ""), "öneri planlanmamış yolunu göstermeli");
});

test("GBR-A03: 'belirsiz' hedefTarih ŞEMA tür-uyarısı ALMAZ (tür-denetimi tolere eder)", async () => {
  const { dogrula } = await import("../src/dogrulayici.ts");
  const t = dogrula(derle('Faz( kod: FZ-C, ad: "mvp", hedefTarih: "belirsiz" )'), snf);
  assert.ok(!t.some((x) => /ISO 8601/.test(x.mesaj)),
    "belirsiz tür-uyarısı vermemeli; gelen: " + JSON.stringify(t.map((x) => x.mesaj)));
  // gerçek çöp değer HÂLÂ uyarı alır (kalkan delinmedi)
  const cop = dogrula(derle('Faz( kod: FZ-D, ad: "mvp", hedefTarih: "yarın" )'), snf);
  assert.ok(cop.some((x) => /ISO 8601/.test(x.mesaj)), "geçersiz tarih hâlâ tür-uyarısı almalı");
});

// ── GOC-MOTOR-A10 · EMEKLİLİK NÖBETİ: anadizin yüzey-şişmesi kaldırıldı ──────
//   Eski ihlal fikstürleri (kökte doğrudan Ekran/Servis) korunur; artık
//   `anadizin-yüzey-şişmesi` üretmemeleri nöbete alınır. Kökün ne sarabileceği
//   TIP-2.4 izinli-sarma sözleşmesinde yaşar ve ihlali `izinsiz-sarma` verir.
test("A10 emeklilik: kökte doğrudan yüzey/arkayüz artık yüzey-şişmesi ÜRETMEZ", async () => {
  const denetciModulu = await import("../src/denetci.ts") as Record<string, unknown>;
  assert.equal(denetciModulu.anadizinYuzeyBilgisi, undefined,
    "anadizinYuzeyBilgisi üreticisi geri gelmiş — anadizin-yüzey-şişmesi emeklidir");
  for (const kaynak of [
    'Uygulama( kod: UYG-Y, ad: "y", ne: "x" ) {\n  Servis( kod: SRV-Z, ad: "auth", ne: "s" )\n}',
    'Uygulama( kod: UYG-E, ad: "e", ne: "x" ) {\n  Ekran( kod: EKR-Z, ne: "e" )\n}',
  ]) {
    const kodlar = dogrulaModulu(derle(kaynak)).map((t) => t.kod);
    assert.ok(!kodlar.includes("anadizin-yüzey-şişmesi"), `yüzey-şişmesi geri döndü: ${JSON.stringify(kodlar)}`);
  }
});

// ── HTR-A03 (IDA dogfood oturum-2 · FİKİR-2): açık-hatırlatıcı gösterim özeti ─
import { acikHatirlaticiGosterimi } from "../src/denetci.ts";
const htrTani = (kod: string, tkod = "açık-hatırlatıcı") =>
  ({ dosya: "h.sar", tani: { duzey: "bilgi" as const, kod: tkod, mesaj: `❗ Açık hatırlatıcı (${kod}): metin`, satir: 1, sutun: 1 } });

test("HTR-A03: çok hatırlatıcı (≥eşik) → TEK özet + örnek + açık/kararlaşmış sayımı", () => {
  const tanilar = ["HTR-1", "HTR-2", "HTR-3", "HTR-4", "HTR-5"].map((k) => htrTani(k));
  const g = acikHatirlaticiGosterimi(tanilar, 4);
  assert.equal(g.length, 1, "5 hatırlatıcı → tek özet");
  assert.match(g[0].tani.mesaj, /5 açık\/kararlaşmış hatırlatıcı/);
  assert.match(g[0].tani.mesaj, /Örnek: HTR-1 · HTR-2 · HTR-3/, "ilk birkaçı örneklenir");
  assert.equal(g[0].tani.duzey, "bilgi");
});

test("HTR-A03: az hatırlatıcı (< eşik) → ayrıntı korunur (mevcut per-node davranış)", () => {
  const g = acikHatirlaticiGosterimi([htrTani("HTR-1"), htrTani("HTR-2")], 4);
  assert.equal(g.length, 2, "eşik-altı tek tek görünür");
});

test("HTR-A03: açık vs kararlaşmış ayrımı özet metninde", () => {
  const tanilar = [htrTani("H1"), htrTani("H2"), htrTani("H3", "kararlaşmış-hatırlatıcı"), htrTani("H4", "kararlaşmış-hatırlatıcı")];
  const g = acikHatirlaticiGosterimi(tanilar, 4);
  assert.match(g[0].tani.mesaj, /❗2 açık · ➡️2 kararlaşmış/);
});

// ── OGR-5 · ÖRNEK-DÜNYASI MUAFİYETİ: ürün gündemi ders malzemesini saymaz (KPN-A05) ──
import { dersAcikAdimSayisi } from "../src/denetci.ts";
import { dagKur, karneOzeti } from "../src/dag.ts";

test("OGR-5: örnek kapsamındaki açık Adım gündeme girmez, ders sayacında sayılır; ürün Adımı etkilenmez", () => {
  const pm = new Map([
    ["ornek/vitrinler/vitrin.sar", derle('Adım( kod: ADM-DERS, durum: beklemede, ne: "d", görev: "ders malzemesi — kasıtlı açık" )')],
    ["plan/is.sar", derle('Adım( kod: ADM-URUN, durum: beklemede, ne: "u", görev: "gerçek iş kalemi" )')],
  ]);
  const gundem = acikAdimTanilari(pm);
  assert.equal(gundem.length, 1);                            // gündemde yalnız ürün Adımı
  assert.ok(/ADM-URUN/.test(gundem[0].tani.mesaj));
  assert.equal(dersAcikAdimSayisi(pm), 1);                   // ders dünyası gizlenmez — ayrı sayaçta
  assert.equal(dersAcikAdimSayisi(new Map([["plan/is.sar", pm.get("plan/is.sar")!]])), 0);
});

test("OGR-5: karne özeti ürün kapsamındadır — örnek Adımları durum sayaçlarına girmez", () => {
  const pm = new Map([
    ["ornek/altin_yol/a.sar", derle('Adım( kod: ADM-DERS-KRN, durum: beklemede, ne: "d", görev: "ders" )')],
    ["plan/is2.sar", derle('Adım( kod: ADM-URUN-KRN, durum: tamamlandı, ne: "u", görev: "iş" )')],
  ]);
  const ozet = karneOzeti(dagKur(pm));
  assert.equal(ozet.adim, 1);                                // yalnız ürün Adımı sayılır
  assert.equal(ozet.durumlar["tamamlandı"], 1);
  assert.equal(ozet.durumlar["beklemede"], undefined);       // ders beklemedesi karneyi kirletmez
});

// ── MIM-3 (GBR-A09/A10): yetim taraması — iç içe raf muafiyeti + YOKSAY simetrisi ──
test("MIM-3.2 (GBR-A09): iç içe içerik-serbest raf altındaki dosyalar yetim sayılmaz; omurga yetimi sürer", () => {
  const p = yapiPlani(`Uygulama( kod: UYG-T, ad: "tanitim", ne: "x", yol: "tanitim" ) {\n  Kitaplık( kod: KTP-APP, yol: "app/", ne: "y" )\n}`);
  const disk = { girdiler: [
    ...p.ogeler.map((o) => ({ tur: o.tur, yol: o.yol })),
    { tur: "dosya" as const, yol: "tanitim/app/globals.css" },     // iç içe raf içi → muaf (MIM-3.2)
    { tur: "dosya" as const, yol: "tanitim/app/derin/page.tsx" },  // raf alt-ağacı → muaf
    { tur: "dosya" as const, yol: "tanitim/kacak.ts" },            // omurga içi gerçek yetim → uyarı sürer
  ]};
  const t = denetle(p, disk).filter((x) => x.kod === "bildirilmemiş-dosya");
  assert.equal(t.length, 1, JSON.stringify(t.map((x) => x.mesaj)));
  assert.match(t[0].mesaj, /kacak\.ts/);
});

test("MIM-3.2 (GBR-A10): YOKSAY vendor dizininin kendisi yetim sayılmaz; sıradan ilansız girdi uyarı almayı sürdürür", () => {
  const p = yapiPlani(`Uygulama( kod: UYG-V, ad: "tanitim", ne: "x", yol: "tanitim" )`);
  const disk = { girdiler: [
    ...p.ogeler.map((o) => ({ tur: o.tur, yol: o.yol })),
    { tur: "dizin" as const, yol: "tanitim/node_modules" },   // vendor → muaf (diskTara içine zaten inmez)
    { tur: "dizin" as const, yol: "tanitim/dist" },           // build → muaf
    { tur: "dizin" as const, yol: "tanitim/rastgele" },       // sıradan ilansız → uyarı (kalkan delinmedi)
  ]};
  const t = denetle(p, disk).filter((x) => x.kod === "bildirilmemiş-dosya");
  assert.equal(t.length, 1, JSON.stringify(t.map((x) => x.mesaj)));
  assert.match(t[0].mesaj, /rastgele/);
});

// ── MIM-1.4 (GBR-A11): `ayakizi:` deklaratif konvansiyonu — sebep-bağlı beyaz-liste ──
test("MIM-1.4 (GBR-A11): ilan-edilen Araç'ın ayakizi dosyaları yetim sayılmaz; sahipsiz dosya uyarı almayı sürdürür", () => {
  const p = yapiPlani(`Uygulama( kod: UYG-AI, ad: "tanitim", ne: "x", yol: "tanitim" ) {
  Araç( kod: ARC-PNPM, ne: "paket yöneticisi", ayakizi: [ "pnpm-lock.yaml", "pnpm-workspace.yaml" ] )
  Araç( kod: ARC-WRANGLER, ne: "Cloudflare dağıtım aracı", ayakizi: [ "wrangler.toml" ] )
}`);
  const disk = { girdiler: [
    ...p.ogeler.map((o) => ({ tur: o.tur, yol: o.yol })),
    { tur: "dosya" as const, yol: "tanitim/pnpm-lock.yaml" },      // ayakizi → ilan-edilmiş omurga-dışı
    { tur: "dosya" as const, yol: "tanitim/wrangler.toml" },       // ayakizi → muaf
    { tur: "dosya" as const, yol: "tanitim/kacak.ts" },            // SAHİPSİZ dosya → uyarı sürer (sebep-bağlılık)
  ]};
  const t = denetle(p, disk).filter((x) => x.kod === "bildirilmemiş-dosya");
  assert.equal(t.length, 1, JSON.stringify(t.map((x) => x.mesaj)));
  assert.match(t[0].mesaj, /kacak\.ts/);
  assert.match(t[0].oneri ?? "", /ayakizi/);                       // yetim önerisi ayakizi'ne yönlendirir (ayna)
});

test("MIM-1.4: ayakizi dizin izi alt-ağacını kapsar", () => {
  const p = yapiPlani(`Uygulama( kod: UYG-AD, ad: "tanitim", ne: "x", yol: "tanitim" ) {
  Teknoloji( kod: TEK-NEXT, ne: "Next.js", ayakizi: [ "uretilen/" ] )
}`);
  const disk = { girdiler: [
    ...p.ogeler.map((o) => ({ tur: o.tur, yol: o.yol })),
    { tur: "dizin" as const, yol: "tanitim/uretilen" },            // iz dizininin kendisi → muaf
    { tur: "dosya" as const, yol: "tanitim/uretilen/rapor.json" }, // iz alt-ağacı → muaf
    { tur: "dosya" as const, yol: "tanitim/serseri.txt" },         // iz dışı → uyarı sürer
  ]};
  const t = denetle(p, disk).filter((x) => x.kod === "bildirilmemiş-dosya");
  assert.equal(t.length, 1, JSON.stringify(t.map((x) => x.mesaj)));
  assert.match(t[0].mesaj, /serseri\.txt/);
});

// GOC-MOTOR-A10 · EMEKLİLİK NÖBETİ: `ayakizi-bulunamadı` kaldırıldı. Eski ihlal
//   fikstürü (ayakizinde yazılı, diskte olmayan iz) korunur ve artık SESSİZ.
//   Disk mutabakatı MIM-3'ün `beyansız-yapı` · `kayıp-yapı` · `bildirilmemiş-dosya`
//   tanılarında yaşamaya devam eder.
test("A10 emeklilik: diskte olmayan ayakizi artık ayakizi-bulunamadı ÜRETMEZ", () => {
  const p = yapiPlani(`Uygulama( kod: UYG-AN, ad: "tanitim", ne: "x", yol: "tanitim" ) {
  Araç( kod: ARC-WR2, ne: "dağıtım aracı", ayakizi: [ "wrangler.toml", ".wrangler/" ] )
}`);
  const disk = { girdiler: p.ogeler.map((o) => ({ tur: o.tur, yol: o.yol })) };
  const kodlar = denetle(p, disk).map((x) => x.kod);
  assert.ok(!kodlar.includes("ayakizi-bulunamadı"),
    `emekli tanı geri döndü: ${JSON.stringify([...new Set(kodlar)])}`);
});

// ── DVR-A03 (OGR-2.2): beceri-drift nöbeti — öğreten kart öğrettiği kuraldan kopamaz ──
import { beceriDriftTanilari } from "../src/denetci.ts";

test("DVR-A03: kırık anlatır beyanı beceri-drift uyarısı üretir; çözülen beyan sessiz", () => {
  const kaynak = `Karar( kod: K-VAR, ne: "yaşayan karar", karar: "k", gerekçe: "g" )
Beceri( kod: BCR-SAGLAM, sağlar: K-VAR, yığın: evrensel, ne: "n", neZaman: "z",
        kurallar: [ "k" ], örnek: "o", antiDesen: "a", uygular: K-VAR,
        anlatır: [ K-VAR, "kenar-metin" ] )
Beceri( kod: BCR-KOPUK, sağlar: K-VAR, yığın: evrensel, ne: "n", neZaman: "z",
        kurallar: [ "k" ], örnek: "o", antiDesen: "a", uygular: K-VAR,
        anlatır: [ K-YOK-BOYLE, "sahte-tani-yok" ] )`;
  const pm = new Map([["ogrenme/t.sar", derle(kaynak)]]);
  const t = beceriDriftTanilari(pm);
  assert.equal(t.length, 2, JSON.stringify(t.map((x) => x.tani.mesaj)));
  assert.ok(t.every((x) => x.tani.kod === "beceri-drift" && x.tani.duzey === "uyarı"));
  assert.ok(t.some((x) => x.tani.mesaj.includes("K-YOK-BOYLE")), "çözülmeyen kod yakalanmalı");
  assert.ok(t.some((x) => x.tani.mesaj.includes("sahte-tani-yok")), "sicil-dışı tanı adı yakalanmalı");
  assert.ok(!t.some((x) => x.tani.mesaj.includes("BCR-SAGLAM")), "sağlam beyan tanı almamalı");
});

// ── DVR-A02 (OGR-2.2): tanı→beceri köprüsü — hata mesajı becerinin tetikleyicisi ──
import { readFileSync as _oku } from "node:fs";
import { fileURLToPath as _yol } from "node:url";

test("DVR-A02: kenar-metin tanısı yapıştırılabilir Kod()+üretir örneği ve beceri işaretçisi taşır", () => {
  const p = derle('Katman( kod: KAT-KM, ne: "k" ) { Adım( kod: A-KM, ne: "x", üretir: [ "src/dosya.ts" ] ) }');
  const indeks = kodIndeksle(new Map([["t.sar", p]]));
  const t = referansTanilari(p, indeks, snf).filter((x) => x.kod === "kenar-metin");
  assert.equal(t.length, 1, "tırnaklı üretir hedefi kenar-metin vermeli");
  assert.match(t[0].oneri ?? "", /Kod\( kod: KOD-X/, "yapıştırılabilir Kod() örneği tanıda");
  assert.match(t[0].oneri ?? "", /uretir-kenari/, "beceri işaretçisi tanıda");
  assert.match(t[0].oneri ?? "", /sarmal ogret/, "ogret kapısına yönlendirme tanıda");
});

test("DVR-A02: işaretçinin hedefi YAŞIYOR — BCR-URETIR-KENARI kartı anlatır beyanıyla kenar-metin'e bağlı (drift nöbeti evreni)", () => {
  // İşaretçi metni ile kart arasındaki bağın canlılığı: kart dosyası kodu taşır ve
  // anlattığı tanılar arasında kenar-metin vardır — tanı adı değişirse beceri-drift
  // nöbeti (DVR-A03) kartı kırmızıya düşürür, işaretçi sahipsiz kalamaz.
  const kart = _oku(_yol(new URL("../../../ogreti/ogrenme/uretir_kenari_becerisi.sar", import.meta.url)), "utf8");
  assert.ok(kart.includes("kod: BCR-URETIR-KENARI"), "işaret edilen beceri kartı repoda yaşıyor");
  assert.ok(kart.includes('"kenar-metin"'), "kart, işaret eden tanıyı anlatır beyanında taşıyor");
});

// ── RF-T6-A02 sertleştirme (Sol ⑤): dayanak hedef-tür + halef nöbetleri + ters envanter ──
// GOC-MOTOR-A10 · EMEKLİLİK NÖBETİ: `dayanak-hedef-tür` ile `dayanak-halef`
//   kaldırıldı. Eski ihlal fikstürü (yanlış tipe ve revize karara bağlanan
//   dayanak) korunur ve ikisinin de artık SESSİZ olması nöbete alınır. Yanlış
//   hüküm tipi YAS-2 `hüküm-türü-uyumsuz` tanısına devredildi; halef zinciri
//   YAS-2.2 yaşam döngüsünden okunur. KORUNAN `dayanaksız-kural` etkilenmedi —
//   canlı bahçede otuz bir bulgu ürettiği ölçüldü.
test("A10 emeklilik: yanlış-tip ve revize-köken dayanağı artık ayrı tanı ÜRETMEZ", async () => {
  const { dayanakTanilari } = await import("../src/denetci.ts");
  const m = progMap([
    'Karar( kod: KRR-1, durum: kilitli, ne: "hüküm" )',
    'Karar( kod: KRR-2, durum: revize, halef: KRR-1, ne: "eski hüküm" )',
    'Adım( kod: ADM-X, ne: "iş", durum: beklemede )',
    'GenelKural( kod: KRL-A, dayanak: [ KRR-1 ], ne: "doğru bağ" )',
    'GenelKural( kod: KRL-B, dayanak: [ ADM-X ], ne: "yanlış tip" )',
    'GenelKural( kod: KRL-C, dayanak: [ KRR-2 ], ne: "revize hedef" )',
  ].join("\n"));
  const kodlar = dayanakTanilari(m).map((x) => x.tani.kod);
  assert.ok(!kodlar.includes("dayanak-hedef-tür"), "emekli 'dayanak-hedef-tür' geri döndü");
  assert.ok(!kodlar.includes("dayanak-halef"), "emekli 'dayanak-halef' geri döndü");
  // KORUNAN hüküm ayakta: dayanağı hiç olmayan kural hâlâ görünür kalır.
  const dayanaksiz = progMap('GenelKural( kod: KRL-D, ne: "dayanaksız kural" )');
  assert.ok(dayanakTanilari(dayanaksiz).some((x) => x.tani.kod === "dayanaksız-kural"),
    "dayanaksız-kural emekli DEĞİLDİR — canlı bahçede bulgu üretiyor");
});

test("RF-T6-A02: dayanaksizKararlar ters envanteri — dayanak gösterilmeyen KİLİTLİ karar sayılır, revize/bekliyor sayılmaz", async () => {
  const { dayanaksizKararlar } = await import("../src/denetci.ts");
  const m = progMap([
    'Karar( kod: KRR-1, durum: kilitli, ne: "kural doğurdu" )',
    'Karar( kod: KRR-2, durum: kilitli, ne: "kural doğurmadı" )',
    'Karar( kod: KRR-3, durum: revize, halef: KRR-1, ne: "eski" )',
    'Karar( kod: KRR-4, durum: bekliyor, ne: "askıda" )',
    'GenelKural( kod: KRL-A, dayanak: [ KRR-1 ], ne: "bağlı" )',
  ].join("\n"));
  assert.deepEqual(dayanaksizKararlar(m), ["KRR-2"], "yalnız dayanaksız KİLİTLİ karar listelenir");
});

test("RF-T6-A02: kuralTanım düğümü dagKur'a kaydolur ve dayanak yumuşak kenarı iki uçlu yaşar", async () => {
  const { dagKur } = await import("../src/dag.ts");
  const m = progMap([
    'Karar( kod: KRR-1, durum: kilitli, ne: "hüküm" )',
    'Kural şüphedeDur( dayanak: [ KRR-1 ], ne: "kural bildirimi" )',
  ].join("\n"));
  const dag = dagKur(m);
  const kural = dag.dugumler.get("şüphedeDur");
  assert.ok(kural, "kuralTanım düğümü grafa kaydolmalı");
  assert.equal(kural!.tip, "Kural");
  assert.deepEqual(kural!.dayanıyor, ["KRR-1"], "kuralın dayanıyor kenarı yazılmalı");
  assert.deepEqual(dag.dugumler.get("KRR-1")?.dayananlar, ["şüphedeDur"], "kararın dayananlar kenarı yazılmalı");
});

// ── RF-T6-A02 eşleme sonrası: bilinçli beyan + yeniden açılan nöbet ──
test("RF-T6-A02: dayanaksız beyanı — beyanlı kural borç sayılmaz, beyansız ürün kuralı Sol cümlesiyle bilgi alır, ders dünyası muaf", async () => {
  const { dayanakTanilari } = await import("../src/denetci.ts");
  const { dayanaksizKurallar, beyanliDayanaksizKurallar } = await import("../src/dogrulayici.ts");
  const kaynak = [
    'GenelKural( kod: KRL-BEYANLI, dayanaksız: "doğuran karar defter-öncesi", ne: "beyanlı" )',
    'GenelKural( kod: KRL-BEYANSIZ, ne: "borçlu" )',
    'GenelKural( kod: KRL-BOS-BEYAN, dayanaksız: "", ne: "boş beyan sayılmaz" )',
  ].join("\n");
  const p = prog(kaynak);
  assert.deepEqual(dayanaksizKurallar(p).sort(), ["KRL-BEYANSIZ", "KRL-BOS-BEYAN"], "beyanlı borç değil; boş beyan borç");
  assert.deepEqual(beyanliDayanaksizKurallar(p), ["KRL-BEYANLI"]);
  const urun = dayanakTanilari(new Map([["yasa/t.sar", p]]));
  const acik = urun.filter((x) => x.tani.kod === "dayanaksız-kural");
  assert.equal(acik.length, 2, "beyansız + boş-beyan bilgi almalı; beyanlı almamalı");
  assert.ok(/dayanak: bağıyla bağlanmamış|bağlanmamış/.test(acik[0].tani.mesaj), "mesaj Sol'un eylem-odaklı cümlesi olmalı");
  assert.equal(dayanakTanilari(new Map([["ornek/t.sar", p]])).filter((x) => x.tani.kod === "dayanaksız-kural").length, 0, "ders dünyası muaf (OGR-5)");
});


// ── YAS-2.1 + Sol zemin denetimi: takvim gerçeği ──
test("Sol bulgusu: takvim-dışı tarih (13. ay · şubat-31) tür-uyarısı alır ve vade hesabına girmez", async () => {
  const { dogrula } = await import("../src/dogrulayici.ts");
  const { fazVadeTanilari } = await import("../src/denetci.ts");
  const kotu13 = dogrula(prog('Faz( kod: FZ-K1, ad: "m", hedefTarih: "2026-13" )'), snf);
  assert.ok(kotu13.some((x) => /takvimde olmayan ay/.test(x.mesaj)), JSON.stringify(kotu13.map((x) => x.mesaj)));
  const kotu31 = dogrula(prog('Faz( kod: FZ-K2, ad: "m", hedefTarih: "2026-02-31" )'), snf);
  assert.ok(kotu31.some((x) => /takvimde olmayan gün/.test(x.mesaj)), "şubat-31 gün uyarısı almalı");
  const iyi = dogrula(prog('Faz( kod: FZ-K3, ad: "m", hedefTarih: "2026-02-28" )'), snf);
  assert.ok(!iyi.some((x) => /takvimde olmayan/.test(x.mesaj)), "geçerli takvim uyarı almaz");
  // vade tarafı: takvim-dışı değer vade/günsüz hesabına girmez (çift tanı yok — tür uyarısı konuşur)
  const fz = (t: string) => ayristir(belirtecle(
    `Faz( kod: FZ-K4, ad: "m", hedefTarih: "${t}" ) {\n  Blok( kod: B-K4, ne: "i" ) { Adım( kod: A-K4, ne: "a", durum: beklemede ) }\n}`));
  assert.equal(fazVadeTanilari(fz("2026-13"), "2026-07-19").filter((x) => x.kod === "günsüz-tarih").length, 0);
  assert.equal(fazVadeTanilari(fz("2026-02-31"), "2026-07-19").length, 0);
});

// ── EKL-F6 dersi · YAS-3.4: durumsuz-adım bekçisi ──────────────────────────────
test("durumsuz-adım: durum taşımayan Adım UYARI alır; durumlu Adım susar; INDEKS_DISI (örnek) muaf", async () => {
  const { durumsizAdimTanilari } = await import("../src/denetci.ts");
  const p = (dosya: string, govde: string) => new Map([[dosya, ayristir(belirtecle(govde))]]);
  // ① durumsuz gerçek Adım → UYARI (EKL-F6 senaryosu)
  const durumsuz = durumsizAdimTanilari(p("plan/x.sar",
    'Katman( kod: KAT-D, ad: "y" ) { Adım( kod: ADM-DURUMSUZ, ne: "park işi" ) }'));
  assert.equal(durumsuz.length, 1);
  assert.ok(durumsuz[0].tani.kod === "durumsuz-adım" && durumsuz[0].tani.duzey === "uyarı");
  assert.ok(durumsuz[0].tani.mesaj.includes("ADM-DURUMSUZ"));
  // ② durumlu Adım → susar
  assert.equal(durumsizAdimTanilari(p("plan/x.sar",
    'Katman( kod: KAT-D2, ad: "y" ) { Adım( kod: ADM-DURUMLU, ne: "iş", durum: beklemede ) }')).length, 0);
  // ③ örnek-dünyası (INDEKS_DISI) muaf — ders malzemesi kısalık için durum atlayabilir
  assert.equal(durumsizAdimTanilari(p("ornek/vitrin.sar",
    'Katman( kod: KAT-D3, ad: "y" ) { Adım( kod: ADM-ORNEK, ne: "ders" ) }')).length, 0);
});

// ═══════════════════════════════════════════════════════════════════════════
// ORK-4 · ÇAPRAZ-PROJE AD ALANI — mevsim çevrimi ve fazsız-blok (KPS-ADA-A01)
//
//   Founder 2026-08-29 tarihinde çatı penceresinde açık aracın "Çatı Mevsimi"
//   Fazını açtı ve altında KAPALI ürünün Bloklarını gördü; tıklayınca editör
//   kapalı deponun plan dosyasını açtı. Kusurun kökü ölçülmüştür: FAZ-2026-AGUSTOS
//   yalnız sarmal deposunda tanımlıdır, buna karşılık ona üç projeden beş Blok
//   `mevsim:` alanıyla bağlanmaktadır ve yalnız biri meşrudur. Mevsim çevrimi
//   proje sınırını tanımadığı için beşine de sanal kenar kuruyordu.
//
//   MUTASYON KANITI. `mevsimNormalize` içindeki `hedefFaz` çözümünde niteliksiz
//   dalın kapsam karşılaştırması kaldırılıp ilk aday döndürüldüğünde aşağıdaki
//   "kardeş projedeki Faz'a bağlanmaz" sınaması KIRILIR: kapalı projenin Bloku
//   yeniden açık projenin Fazının çocuğu olur. Ad alanlı dalın kapsam süzgeci
//   kaldırıldığında ise "ad alanı yanlış projeyi gösteriyorsa kenar kurulmaz"
//   sınaması kırılır. İki mutasyon iki ayrı sınamayı düşürür.
// ═══════════════════════════════════════════════════════════════════════════

const caprazCati = (mevsim: string): Map<string, Program> => new Map([
  ["sarmal/sarmal_anadizin.sar", ayristir(belirtecle("Proje( kod: PRJ-SARMAL, rejim: katı )"))],
  ["sarmal/is/plan/faz/faz.sar", ayristir(belirtecle('Faz( kod: FAZ-2026-AGUSTOS, ad: "Çatı Mevsimi" ) { }'))],
  ["orkestrasyon/orkestrasyon_anadizin.sar", ayristir(belirtecle("Proje( kod: PRJ-ORKESTRASYON, rejim: katı )"))],
  ["orkestrasyon/plan/zeka.sar", ayristir(belirtecle(`Blok( kod: BLK-ORK-ZEKA, mevsim: ${mevsim} )`))],
]);

/** Faz düğümünün mevsim çevriminden doğan SANAL çağır çocukları. */
const sanalCagirlar = (programlar: Map<string, Program>): string[] => {
  const faz = programlar.get("sarmal/is/plan/faz/faz.sar")!.bildirimler[0];
  return faz.cocuklar.filter((c) => c.tur === "çağır").map((c) => c.ad);
};

test("ORK-4: niteliksiz mevsim KARDEŞ projedeki Faz'a bağlanmaz (Founder kusuru)", async () => {
  const { mevsimNormalize } = await import("../src/denetci.ts");
  const programlar = caprazCati("FAZ-2026-AGUSTOS");
  mevsimNormalize(programlar);
  assert.deepEqual(sanalCagirlar(programlar), [],
    "kapalı projenin Bloku açık projenin Fazının altında görünemez");
});

test("ORK-4: ad alanlı mevsim kardeş projedeki Faz'a MEŞRU biçimde bağlanır", async () => {
  const { mevsimNormalize } = await import("../src/denetci.ts");
  const programlar = caprazCati("PRJ-SARMAL::FAZ-2026-AGUSTOS");
  mevsimNormalize(programlar);
  assert.deepEqual(sanalCagirlar(programlar), ["BLK-ORK-ZEKA"]);
});

test("ORK-4: ad alanı yanlış projeyi gösteriyorsa kenar kurulmaz", async () => {
  const { mevsimNormalize } = await import("../src/denetci.ts");
  const programlar = caprazCati("PRJ-ORKESTRASYON::FAZ-2026-AGUSTOS");
  mevsimNormalize(programlar);
  assert.deepEqual(sanalCagirlar(programlar), []);
});

test("ORK-4: aynı proje içindeki mevsim bağı ESKİSİ GİBİ kurulur (geriye uyum)", async () => {
  const { mevsimNormalize } = await import("../src/denetci.ts");
  const programlar: Map<string, Program> = new Map([
    ["sarmal_anadizin.sar", ayristir(belirtecle("Proje( kod: PRJ-SARMAL, rejim: katı )"))],
    ["is/plan/faz.sar", ayristir(belirtecle("Faz( kod: FAZ-A ) { }"))],
    ["is/plan/blok.sar", ayristir(belirtecle("Blok( kod: BLK-B, mevsim: FAZ-A )"))],
  ]);
  mevsimNormalize(programlar);
  const faz = programlar.get("is/plan/faz.sar")!.bildirimler[0];
  assert.deepEqual(faz.cocuklar.filter((c) => c.tur === "çağır").map((c) => c.ad), ["BLK-B"]);
});

test("ORK-4: ad alanlı mevsim taşıyan Blok FAZSIZ sayılmaz", async () => {
  const { hiyerarsiTanilari } = await import("../src/denetci.ts");
  const yalniz: Map<string, Program> = new Map([
    ["plan/zeka.sar", ayristir(belirtecle("Blok( kod: BLK-ORK-ZEKA, mevsim: PRJ-SARMAL::FAZ-2026-AGUSTOS )"))],
  ]);
  assert.equal(hiyerarsiTanilari(yalniz).filter((t) => t.tani.kod === "fazsız-blok").length, 0,
    "hedef Faz kardeş depoda olduğu için yüklü evrende görünmez; beyan yine de zaman bağıdır");
  const niteliksiz: Map<string, Program> = new Map([
    ["plan/zeka.sar", ayristir(belirtecle("Blok( kod: BLK-ORK-ZEKA, mevsim: FAZ-2026-AGUSTOS )"))],
  ]);
  assert.equal(hiyerarsiTanilari(niteliksiz).filter((t) => t.tani.kod === "fazsız-blok").length, 1,
    "niteliksiz beyan çözülmediğinde fazsız-blok dürüstçe ateşlenir");
});

test("ORK-4: referans kapsamı verilmezse çözüm ESKİSİ GİBİ küresel kalır (geriye uyum)", () => {
  const p = ayristir(belirtecle("Adım( kod: ADM-X, durum: beklemede, bağımlı: [ ADM-Y ] )"));
  const indeks = kodIndeksle(new Map([["a.sar", ayristir(belirtecle("Adım( kod: ADM-Y, durum: beklemede )"))]]));
  assert.equal(referansTanilari(p, indeks, snf).length, 0);
});

test("ORK-4: referans kapsamı verildiğinde tesadüfî küresel eşleşme kırık-referans olur", () => {
  const programlar: Map<string, Program> = new Map([
    ["sarmal/sarmal_anadizin.sar", ayristir(belirtecle("Proje( kod: PRJ-SARMAL, rejim: katı )"))],
    ["sarmal/plan/a.sar", ayristir(belirtecle("Adım( kod: ADM-Y, durum: beklemede )"))],
    ["orkestrasyon/orkestrasyon_anadizin.sar", ayristir(belirtecle("Proje( kod: PRJ-ORKESTRASYON, rejim: katı )"))],
  ]);
  const indeks = kodIndeksle(programlar);
  const tumTanimlar = kodTanimlariIndeksle(programlar);
  const kapsam = adAlaniKapsamiKur({
    kapsamlar: projeKapsamlari(programlar),
    tanimDosyalari: (kod) => (tumTanimlar.get(kod) ?? []).map((t) => t.dosya),
    kardesler: [],
  });
  const kaynak = "orkestrasyon/plan/b.sar";
  const p = ayristir(belirtecle("Adım( kod: ADM-X, durum: beklemede, bağımlı: [ ADM-Y ] )"));
  const kirik = referansTanilari(p, indeks, snf,
    { dosya: kaynak, cozulur: (h) => kapsam.cozulur(h, kaynak) });
  assert.equal(kirik.length, 1);
  assert.equal(kirik[0].kod, "kırık-referans");
  const adAlanli = ayristir(belirtecle("Adım( kod: ADM-X, durum: beklemede, bağımlı: [ PRJ-SARMAL::ADM-Y ] )"));
  assert.equal(referansTanilari(adAlanli, indeks, snf,
    { dosya: kaynak, cozulur: (h) => kapsam.cozulur(h, kaynak) }).length, 0,
    "ad alanlı yazım aynı hedefi meşru biçimde çözer");
});

// ═══════════════════════════════════════════════════════════════════════════
// ORK-4 · ad alanlı `kullanır` teknoloji bağıdır (KPS-ADA-A01 · Founder 2026-08-29)
//
//   Founder canlı pencerede şunu ölçtü: `orkestrasyon/plan/sef_yol_haritasi.sar`
//   ile `ray3_yol_haritasi.sar` dosyalarındaki iki Katman `kullanır:
//   PRJ-SARMAL::TAKIM-CEKIRDEK` yazdığı ve hedef çözüldüğü hâlde bekçi
//   "teknoloji bağı taşımıyor" diyordu. Çözülen bir bağın taşınmıyor sayılması
//   çelişkidir; sınıf, üçüncü görev maddesinde `mevsim` için kapatılan sınıfın
//   aynısıdır ve aynı hükümle kapanır.
//
//   MUTASYON KANITI. `teknolojiHedefi` içindeki ad alanlı dal kaldırılıp hedef
//   niteliksizmiş gibi çözülürse "ad alanlı kullanır teknoloji bağıdır" sınaması
//   KIRILIR. Ayrı bir mutasyon olarak niteliksiz daldaki kapsam karşılaştırması
//   gevşetilirse "niteliksiz hedef kardeş projeye bağlanmaz" sınaması kırılır.
// ═══════════════════════════════════════════════════════════════════════════

const katmanUyarilari = async (programlar: Map<string, Program>): Promise<string[]> => {
  const { katmansizTeknolojiTanilari } = await import("../src/denetci.ts");
  return katmansizTeknolojiTanilari(programlar)
    .filter((t) => t.tani.kod === "katmansız-teknoloji")
    .map((t) => t.tani.mesaj.match(/"([A-Z0-9-]+)"/)?.[1] ?? "?");
};

test("ORK-4: ad alanlı kullanır TEKNOLOJİ BAĞIDIR — kardeş depo yüklü değilken de", async () => {
  const yalniz: Map<string, Program> = new Map([
    ["orkestrasyon_anadizin.sar", ayristir(belirtecle("Proje( kod: PRJ-ORKESTRASYON, rejim: katı )"))],
    ["plan/sef.sar", ayristir(belirtecle('Katman( kod: SEFH-MEKANIZMA, kullanır: PRJ-SARMAL::TAKIM-CEKIRDEK, ad: "şef" )'))],
  ]);
  assert.deepEqual(await katmanUyarilari(yalniz), [],
    "hedef kardeş depoda yaşadığı için tipi okunamaz; beyan olduğu gibi bağdır");
});

test("ORK-4: ad alanı YÜKLÜ ise hedefin tipi gerçekten ölçülür", async () => {
  const cati = (hedefTipi: string): Map<string, Program> => new Map([
    ["sarmal/sarmal_anadizin.sar", ayristir(belirtecle("Proje( kod: PRJ-SARMAL, rejim: katı )"))],
    ["sarmal/is/plan/takimlar.sar", ayristir(belirtecle(`${hedefTipi}( kod: TAKIM-CEKIRDEK, ad: "çekirdek" )`))],
    ["orkestrasyon/orkestrasyon_anadizin.sar", ayristir(belirtecle("Proje( kod: PRJ-ORKESTRASYON, rejim: katı )"))],
    ["orkestrasyon/plan/sef.sar", ayristir(belirtecle('Katman( kod: SEFH-MEKANIZMA, kullanır: PRJ-SARMAL::TAKIM-CEKIRDEK, ad: "şef" )'))],
  ]);
  assert.deepEqual(await katmanUyarilari(cati("Takım")), [],
    "hedef gerçekten Takım ise bağ vardır");
  assert.deepEqual(await katmanUyarilari(cati("Adım")), ["SEFH-MEKANIZMA"],
    "ad alanı çözülse bile yanlış tipe bağlanan Katman uyarı almalıdır");
});

test("ORK-4: niteliksiz hedef KARDEŞ projedeki teknolojiye bağlanmaz", async () => {
  const capraz: Map<string, Program> = new Map([
    ["sarmal/sarmal_anadizin.sar", ayristir(belirtecle("Proje( kod: PRJ-SARMAL, rejim: katı )"))],
    ["sarmal/is/plan/takimlar.sar", ayristir(belirtecle('Teknoloji( kod: TEK-SARMAL, ad: "sarmal" )'))],
    ["orkestrasyon/orkestrasyon_anadizin.sar", ayristir(belirtecle("Proje( kod: PRJ-ORKESTRASYON, rejim: katı )"))],
    ["orkestrasyon/plan/kat.sar", ayristir(belirtecle('Katman( kod: KAT-X, kullanır: TEK-SARMAL, ad: "x" )'))],
  ]);
  assert.deepEqual(await katmanUyarilari(capraz), ["KAT-X"],
    "tesadüfî küresel eşleşme teknoloji bağı sayılamaz");
});

test("ORK-4: aynı proje içindeki teknoloji bağı ESKİSİ GİBİ susturur (geriye uyum)", async () => {
  const yerel: Map<string, Program> = new Map([
    ["anadizin.sar", ayristir(belirtecle("Proje( kod: PRJ-TEK, rejim: katı )"))],
    ["plan/tek.sar", ayristir(belirtecle('Teknoloji( kod: TEK-YOUTUBE, ad: "youtube" )'))],
    ["plan/kat.sar", ayristir(belirtecle('Katman( kod: KAT-Y, kullanır: TEK-YOUTUBE, ad: "y" )'))],
  ]);
  assert.deepEqual(await katmanUyarilari(yerel), []);
  const bagsiz: Map<string, Program> = new Map([
    ["anadizin.sar", ayristir(belirtecle("Proje( kod: PRJ-TEK, rejim: katı )"))],
    ["plan/kat.sar", ayristir(belirtecle('Katman( kod: KAT-Z, ad: "z" )'))],
  ]);
  assert.deepEqual(await katmanUyarilari(bagsiz), ["KAT-Z"],
    "hiç kenar taşımayan Katman uyarısını korumalıdır");
});

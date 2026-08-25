// ═══════════════════════════════════════════════════════════════════════════
// sinama/nvidia-koprubag.test.ts — KNT-A04 nöbeti: köprü bağlanması + iki kalkan
//
//   ⚠️ LLM YOK. Üçü de fikstürlü, deterministik:
//     ① SYMLINK KALKANI — kök İÇİNDEKİ bir symlink kök DIŞINI gösterdiğinde üç
//        yürütücü (oku · yaz · koş) de RED verir. Testler HATA METNİNİ değil
//        DİSKİ ölçer: mutasyonda dosyanın gerçekten kök dışına yazıldığı görülür.
//     ② İZİN MATRİSİ — üretici yazar, DENETÇİ YAZAMAZ (fail-closed yetki ayrımı).
//     ③ 503 DAYANIKLILIĞI — geçici doygunluk tekrarla elenir; kalıcı hata anında
//        fırlar; tekrar tükenirse durum AÇIKÇA "altyapı" diye ayrışır.
// ═══════════════════════════════════════════════════════════════════════════

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, existsSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  gerçekYolÇöz, kökİçindeÇöz, üretimAraçÇağırYap, üretimKöprüsüYap,
  ÜRETİM_BEYANLARI, ÜRETİM_MATRISI, ÜRETİM_MAX_TUR,
  geçiciDoygunlukMu, tekrarDene, çökmeÇıktısı, DOYGUNLUK_ETİKETİ,
} from "../src/kopru/nvidia.ts";
import { araçİzinDenetle } from "../src/gateway.ts";
import { araçTuru, type AraçTalep } from "../src/toolround.ts";

// ── Fikstür: atılabilir üst dizin + içinde kök + KÖK DIŞINDA bir "dışarı" ─────
//    (A02 dersi: sızıntı paylaşılan tmp'ye düşerse sonraki koşuyu zehirler →
//     her fikstür kendi atılabilir üst dizinine yuvalanır, temizlikle ölür.)
function fikstür(): { üst: string; kök: string; dışarı: string; sil: () => void } {
  const üst = mkdtempSync(join(tmpdir(), "knt-a04-"));
  const kök = join(üst, "kok");
  const dışarı = join(üst, "disari");
  mkdirSync(kök, { recursive: true });
  mkdirSync(dışarı, { recursive: true });
  return { üst, kök, dışarı, sil: () => rmSync(üst, { recursive: true, force: true }) };
}

const talep = (araç: string, mod: AraçTalep["mod"], argüman: unknown): AraçTalep =>
  ({ etmen: "üretici", araç, mod, argüman });

// ═══ ① SYMLINK KALKANI ══════════════════════════════════════════════════════

test("KNT-A04 symlink: kök içindeki symlink kök DIŞINI gösterirse dosya-yaz RED — ve disk TEMİZ kalır", () => {
  const f = fikstür();
  try {
    // kok/tuzak → ../disari   (kök İÇİNDE duran, DIŞARIYI gösteren bağ)
    symlinkSync(f.dışarı, join(f.kök, "tuzak"));
    const çağır = üretimAraçÇağırYap(f.kök);

    const s = çağır(talep("dosya-yaz", "yaz", { yol: "tuzak/kacak.txt", içerik: "sızıntı" }));

    assert.equal(s.durum, "hata", "symlink üzerinden yazım RED almalı");
    assert.match(String(s.sebep), /kök dışı erişim reddedildi/);
    // 🔬 ASIL İDDİA: hata metni değil DİSK. Dosya kök dışına DÜŞMEDİ.
    assert.equal(existsSync(join(f.dışarı, "kacak.txt")), false, "dosya kök DIŞINA yazılmış olmamalı");
  } finally { f.sil(); }
});

test("KNT-A04 symlink: KIRIK (dangling) bağ da kapıda ölür — writeFileSync onu izleyip hedefi YARATIRDI", () => {
  const f = fikstür();
  try {
    // Hedef YOK → existsSync bu bağı GÖRMEZ; ama writeFileSync bağı izler ve dosyayı yaratır.
    symlinkSync(join(f.dışarı, "yok.txt"), join(f.kök, "kirik"));
    const çağır = üretimAraçÇağırYap(f.kök);

    const s = çağır(talep("dosya-yaz", "yaz", { yol: "kirik", içerik: "sızıntı" }));

    assert.equal(s.durum, "hata");
    assert.match(String(s.sebep), /kök dışı erişim reddedildi/);
    assert.equal(existsSync(join(f.dışarı, "yok.txt")), false, "kırık bağ üzerinden dosya YARATILMAMALI");
  } finally { f.sil(); }
});

test("KNT-A04 symlink: dosya-oku symlink üzerinden kök dışını OKUYAMAZ", () => {
  const f = fikstür();
  try {
    writeFileSync(join(f.dışarı, "sir.txt"), "GİZLİ", "utf8");
    symlinkSync(f.dışarı, join(f.kök, "tuzak"));
    const çağır = üretimAraçÇağırYap(f.kök);

    const s = çağır(talep("dosya-oku", "oku", { yol: "tuzak/sir.txt" }));

    assert.equal(s.durum, "hata");
    assert.match(String(s.sebep), /kök dışı erişim reddedildi/);
    assert.equal(s.sonuç, undefined, "içerik SIZDIRILMAMALI");
  } finally { f.sil(); }
});

test("KNT-A04 symlink: test-koş symlink üzerinden kök dışındaki dosyayı KOŞAMAZ", () => {
  const f = fikstür();
  try {
    writeFileSync(join(f.dışarı, "yabanci.test.ts"),
      `import { test } from "node:test"; test("x", () => {});\n`, "utf8");
    symlinkSync(f.dışarı, join(f.kök, "tuzak"));
    const çağır = üretimAraçÇağırYap(f.kök);

    const s = çağır(talep("test-koş", "çağır", { yol: "tuzak/yabanci.test.ts" }));

    assert.equal(s.durum, "hata");
    assert.match(String(s.sebep), /kök dışı erişim reddedildi/);
  } finally { f.sil(); }
});

test("KNT-A04 symlink: KÖKÜN KENDİSİ symlink olsa bile meşru yazım GEÇER (kalkan aşırı kısmıyor)", () => {
  // Gerçek senaryo: macOS'ta /tmp → /private/tmp. Kök çözülmezse gKöz≠gHedef olur ve
  // HER yazım reddedilirdi — kalkan sessizce aracı öldürürdü (A06 "model beceremedi" derdi).
  const f = fikstür();
  try {
    const kökBağ = join(f.üst, "kok-bag");
    symlinkSync(f.kök, kökBağ);
    const çağır = üretimAraçÇağırYap(kökBağ);   // kök olarak SYMLINK verildi

    const s = çağır(talep("dosya-yaz", "yaz", { yol: "alt/a.txt", içerik: "meşru" }));

    assert.equal(s.durum, "izinli", "kökün kendisi symlink olduğunda meşru yazım engellenmemeli");
    assert.equal(readFileSync(join(f.kök, "alt", "a.txt"), "utf8"), "meşru");
  } finally { f.sil(); }
});

test("KNT-A04 symlink: kök İÇİNDE kalan bağ meşrudur (yön ayrımı korunur)", () => {
  const f = fikstür();
  try {
    mkdirSync(join(f.kök, "gercek"));
    symlinkSync(join(f.kök, "gercek"), join(f.kök, "ic-bag"));
    const çağır = üretimAraçÇağırYap(f.kök);

    const s = çağır(talep("dosya-yaz", "yaz", { yol: "ic-bag/b.txt", içerik: "içeride" }));

    assert.equal(s.durum, "izinli");
    assert.equal(readFileSync(join(f.kök, "gercek", "b.txt"), "utf8"), "içeride");
  } finally { f.sil(); }
});

test("KNT-A04 gerçekYolÇöz: var OLMAYAN kuyruk taşınır; ELOOP zinciri tavana takılır", () => {
  const f = fikstür();
  try {
    // var olmayan kuyruk (yazma yolu — realpathSync burada patlardı) AYNEN taşınır;
    // ataların gerçek yolu çözülür (macOS: /var → /private/var — bu kalkanın ta kendisi).
    assert.equal(gerçekYolÇöz(join(f.kök, "yok", "hic", "a.txt")),
      resolve(gerçekYolÇöz(f.kök), "yok/hic/a.txt"));
    // kendine dönen bağ → ELOOP kalkanı
    symlinkSync(join(f.kök, "dongu2"), join(f.kök, "dongu1"));
    symlinkSync(join(f.kök, "dongu1"), join(f.kök, "dongu2"));
    assert.throws(() => gerçekYolÇöz(join(f.kök, "dongu1")), /sembolik bağ zinciri çok derin/);
    // ve kapı bunu fail-visible sebebe çevirir (zincir kırılmaz)
    const s = kökİçindeÇöz(f.kök, "dongu1");
    assert.equal(s.geçti, false);
    assert.match(s.geçti === false ? s.sebep : "", /yol çözülemedi/);
  } finally { f.sil(); }
});

test("KNT-A04 sınır: klasik traversal (../ · mutlak yol) kalkanı KORUNDU (A02 regresyonu)", () => {
  const f = fikstür();
  try {
    const çağır = üretimAraçÇağırYap(f.kök);
    for (const yol of ["../kacak.txt", join(f.dışarı, "mutlak.txt")]) {
      const s = çağır(talep("dosya-yaz", "yaz", { yol, içerik: "x" }));
      assert.equal(s.durum, "hata", `${yol} RED almalı`);
      assert.match(String(s.sebep), /kök dışı erişim reddedildi/);
    }
    assert.equal(existsSync(join(f.üst, "kacak.txt")), false);
    assert.equal(existsSync(join(f.dışarı, "mutlak.txt")), false);
  } finally { f.sil(); }
});

// ═══ ② İZİN MATRİSİ — yetki ayrımı ══════════════════════════════════════════

test("KNT-A04 matris: ÜRETİCİ yazar · sınar · okur (en az ayrıcalık, ihtiyacı kadar)", () => {
  for (const [araç, mod] of [["dosya-yaz", "yaz"], ["test-koş", "çağır"], ["dosya-oku", "oku"]] as const) {
    const k = araçİzinDenetle("üretici", araç, mod, ÜRETİM_BEYANLARI, ÜRETİM_MATRISI);
    assert.equal(k.izinli, true, `üretici ${araç}:${mod} izinli olmalı — ${k.sebep}`);
  }
});

test("KNT-A04 matris: DENETÇİ YAZAMAZ — yargılayan el, yargıladığı artefaktı değiştiremez", () => {
  const k = araçİzinDenetle("denetçi", "dosya-yaz", "yaz", ÜRETİM_BEYANLARI, ÜRETİM_MATRISI);
  assert.equal(k.izinli, false, "denetçinin dosya-yaz talebi RED olmalı (fail-closed yetki ayrımı)");
  assert.match(k.sebep, /izin-matrisi/);
  // ama işini yapabilir: okur ve sınar
  assert.equal(araçİzinDenetle("denetçi", "dosya-oku", "oku", ÜRETİM_BEYANLARI, ÜRETİM_MATRISI).izinli, true);
  assert.equal(araçİzinDenetle("denetçi", "test-koş", "çağır", ÜRETİM_BEYANLARI, ÜRETİM_MATRISI).izinli, true);
});

test("KNT-A04 matris: DENETÇİNİN dosya-yaz talebi diske DOKUNAMAZ (kapı yürütücüden ÖNCE)", () => {
  const f = fikstür();
  try {
    let yürütücüÇağrıldı = false;
    const sonuç = araçTuru(
      { etmen: "denetçi", araç: "dosya-yaz", mod: "yaz", argüman: { yol: "sinsi.txt", içerik: "denetçi yazdı" } },
      {
        beyanlar: ÜRETİM_BEYANLARI, matris: ÜRETİM_MATRISI,
        araçÇağır: (t) => { yürütücüÇağrıldı = true; return üretimAraçÇağırYap(f.kök)(t); },
      },
    );
    assert.equal(sonuç.durum, "red");
    assert.equal(yürütücüÇağrıldı, false, "RED'de yürütücü HİÇ çağrılmamalı");
    // 🔬 DİSK İDDİASI: dosya yok.
    assert.equal(existsSync(join(f.kök, "sinsi.txt")), false, "denetçi diske YAZAMAMALI");
    // ③ kabul: izinsiz talep zinciri KIRMAZ — AraçSonuç döner, fırlatmaz.
    assert.equal(sonuç.güvenilmez, true);
  } finally { f.sil(); }
});

test("KNT-A04 matris: GÜVENLİK rolüne araç YOK (fail-closed — ORK-6.1: yalnız üretici çıktısını görür)", () => {
  for (const [araç, mod] of [["dosya-oku", "oku"], ["dosya-yaz", "yaz"], ["test-koş", "çağır"]] as const) {
    assert.equal(araçİzinDenetle("güvenlik", araç, mod, ÜRETİM_BEYANLARI, ÜRETİM_MATRISI).izinli, false,
      `güvenlik ${araç}:${mod} almamalı`);
  }
});

test("KNT-A04 matris: BEYAN dışı araç/mod matris ne derse desin RED (kapı-1 deny-by-default)", () => {
  // dosya-yaz beyanı yalnız 'yaz' modunda var — 'oku' modu beyansız.
  assert.equal(araçİzinDenetle("üretici", "dosya-yaz", "oku", ÜRETİM_BEYANLARI, ÜRETİM_MATRISI).izinli, false);
  assert.equal(araçİzinDenetle("üretici", "dosya-sil", "yaz", ÜRETİM_BEYANLARI, ÜRETİM_MATRISI).izinli, false);
});

test("KNT-A04 matris: ATANMIŞ Etmen KOD'u matriste yok → fail-closed RED (sessiz açılma YOK)", () => {
  // nvidiaEtmenYap kimliği `çağrı.etmen?.kod ?? çağrı.rol`. Plan Etmen atarsa kimlik KOD olur;
  // açık taban rol-düzeyinde durur (KOD→profil eşlemesi GİZLİ · STR-3) → eksik = RED.
  assert.equal(araçİzinDenetle("ETM-KODLAYICI", "dosya-yaz", "yaz", ÜRETİM_BEYANLARI, ÜRETİM_MATRISI).izinli, false);
});

// ═══ ③ KÖPRÜ BAĞLANMASI ════════════════════════════════════════════════════

test("KNT-A04 köprü: üretimKöprüsüYap katalog+matris+maxTur taşır (sarmal.ts artık ARGÜMANSIZ çağırmıyor)", () => {
  const f = fikstür();
  try {
    const k = üretimKöprüsüYap(f.kök);
    assert.deepEqual(k.araçlar.map((a) => a.ad).sort(), ["dosya-oku", "dosya-yaz", "test-koş"]);
    assert.equal(k.matris, ÜRETİM_MATRISI);
    assert.equal(k.beyanlar, ÜRETİM_BEYANLARI);
    // maxTur: plan "4-6 turluk akış" istiyor (yaz→test yaz→koş→oku→düzelt→kapat).
    assert.equal(k.maxTur, ÜRETİM_MAX_TUR);
    assert.equal(ÜRETİM_MAX_TUR, 6);
    // Katalogdaki her aracın modu matris/beyanla tutarlı olmalı (sessiz sapma nöbeti).
    for (const a of k.araçlar) {
      assert.ok(ÜRETİM_BEYANLARI.some((b) => b.araç === a.ad && b.mod === a.mod),
        `katalog '${a.ad}:${a.mod}' beyanlarda yok — sessiz sapma`);
    }
  } finally { f.sil(); }
});

test("KNT-A04 köprü: üretimAraçÇağırYap doğru yürütücüye dağıtır; tanımsız araç fail-visible", () => {
  const f = fikstür();
  try {
    const çağır = üretimAraçÇağırYap(f.kök);
    // yaz → gerçekten diske
    assert.equal(çağır(talep("dosya-yaz", "yaz", { yol: "x.txt", içerik: "merhaba" })).durum, "izinli");
    assert.equal(readFileSync(join(f.kök, "x.txt"), "utf8"), "merhaba");
    // oku → aynı içeriği geri
    assert.equal(çağır(talep("dosya-oku", "oku", { yol: "x.txt" })).sonuç, "merhaba");
    // tanımsız araç → hata (zincir kırılmaz)
    const s = çağır(talep("dosya-sil", "yaz", { yol: "x.txt" }));
    assert.equal(s.durum, "hata");
    assert.match(String(s.sebep), /tanımsız araç/);
  } finally { f.sil(); }
});

test("KNT-A04 köprü: geçen ve kırık test fikstürü üretici zincirinden GERÇEKTEN koşar (çıkış kodu)", () => {
  const f = fikstür();
  try {
    const sec = { beyanlar: ÜRETİM_BEYANLARI, matris: ÜRETİM_MATRISI, araçÇağır: üretimAraçÇağırYap(f.kök) };
    writeFileSync(join(f.kök, "gecen.test.ts"),
      `import { test } from "node:test"; test("ok", () => {});\n`, "utf8");
    writeFileSync(join(f.kök, "kirik.test.ts"),
      `import { test } from "node:test"; import a from "node:assert/strict"; test("x", () => a.equal(1, 2));\n`, "utf8");

    const g = araçTuru({ etmen: "üretici", araç: "test-koş", mod: "çağır", argüman: { yol: "gecen.test.ts" } }, sec);
    assert.equal(g.durum, "izinli");
    assert.equal((g.sonuç as { çıkışKodu: number }).çıkışKodu, 0);

    const k = araçTuru({ etmen: "üretici", araç: "test-koş", mod: "çağır", argüman: { yol: "kirik.test.ts" } }, sec);
    assert.equal(k.durum, "izinli");
    assert.notEqual((k.sonuç as { çıkışKodu: number }).çıkışKodu, 0, "kırık test 0 döndürmemeli");
  } finally { f.sil(); }
});

test("KNT-A04 nöbet: sarmal.ts üretim yolu köprüyü ENJEKTE eder — ARGÜMANSIZ çağrı geri GELEMEZ", () => {
  // Kaynak-tarama nöbeti (tani-sicili deseni). A04'ün TÜM arızası tek bir eksik argümandı:
  // `nvidiaEtmenYap()` → köprü undefined → tools API'ye hiç gitmez → sıfır araç. Bu sessizce
  // geri gelebilir (tip hatası VERMEZ — köprü opt-in). Nöbet o regresyonu kilitler.
  const ham = readFileSync(new URL("../src/sarmal.ts", import.meta.url), "utf8");
  // Yalnız KOD satırları sayılır — yorumlar arızayı ANLATMAK için o çağrıyı yazabilir.
  const kod = ham.split("\n").filter((s) => !s.trim().startsWith("//")).join("\n");
  assert.match(kod, /nvidiaEtmenYap\(üretimKöprüsüYap\(dizin\)\)/,
    "sarmal.ts --gercek yolunda köprü enjekte edilmeli");
  assert.doesNotMatch(kod, /nvidiaEtmenYap\(\s*\)/,
    "ARGÜMANSIZ nvidiaEtmenYap() üretim yolunda YASAK — köprüsüz etmen araç göremez (KNT-A04 arızası)");
});

// ═══ ④ 503 DAYANIKLILIĞI ═══════════════════════════════════════════════════

test("KNT-A04 doygunluk: 503/429/ResourceExhausted GEÇİCİ; 401/404/410 KALICI (sınıflandırma)", () => {
  // Oturum başında ÖLÇÜLEN gerçek mesaj:
  assert.equal(geçiciDoygunlukMu("NVIDIA yanıtı boş/hatalı: ResourceExhausted: Worker local total request limit reached (37/16)"), true);
  assert.equal(geçiciDoygunlukMu("HTTP 503 Service Unavailable"), true);
  assert.equal(geçiciDoygunlukMu("429 Too Many Requests"), true);
  // Ölçülen ÖLÜ modeller — bunlar tekrarla düzelmez, anında fırlamalı:
  assert.equal(geçiciDoygunlukMu("404 Not Found: deepseek-ai/deepseek-v3.1"), false);
  assert.equal(geçiciDoygunlukMu("410 Gone: qwen/qwen2.5-coder-32b"), false);
  assert.equal(geçiciDoygunlukMu("401 Unauthorized"), false);
  assert.equal(geçiciDoygunlukMu("LLM JSON döndürmedi"), false);
});

test("KNT-A04 doygunluk: aralıklı 503 tekrarla ELENİR — ölçülen 503→200 deseni", () => {
  let çağrı = 0;
  const uyunan: number[] = [];
  const sonuç = tekrarDene(() => {
    çağrı++;
    if (çağrı === 1) throw new Error("ResourceExhausted: Worker local total request limit reached (37/16)");
    return "200-OK";
  }, { tabanMs: 1, uyu: (ms) => uyunan.push(ms), günlük: () => {} });

  assert.equal(sonuç, "200-OK");
  assert.equal(çağrı, 2, "ikinci deneme başarılı olmalı (ölçülen desen)");
  assert.deepEqual(uyunan, [1], "bir backoff uygulanmalı");
});

test("KNT-A04 doygunluk: backoff ÜSTEL ve ÜST SINIRLI (sonsuz tekrar YOK)", () => {
  let çağrı = 0;
  const uyunan: number[] = [];
  assert.throws(() => tekrarDene(() => { çağrı++; throw new Error("503 Service Unavailable"); },
    { maxDeneme: 4, tabanMs: 10, uyu: (ms) => uyunan.push(ms), günlük: () => {} }),
    new RegExp(DOYGUNLUK_ETİKETİ));
  assert.equal(çağrı, 4, "tam maxDeneme kadar denenmeli — daha fazla DEĞİL");
  assert.deepEqual(uyunan, [10, 20, 40], "üstel backoff (1x·2x·4x), son denemeden sonra uyku YOK");
});

test("KNT-A04 doygunluk: KALICI hata ANINDA fırlar — boşuna beklenmez", () => {
  let çağrı = 0;
  assert.throws(() => tekrarDene(() => { çağrı++; throw new Error("404 Not Found"); },
    { tabanMs: 1, uyu: () => { throw new Error("uyunmamalıydı"); }, günlük: () => {} }),
    /404 Not Found/);
  assert.equal(çağrı, 1, "kalıcı hatada tekrar YOK");
});

test("KNT-A04 doygunluk: tekrar tükenince durum ALTYAPI diye AYRIŞIR — 'model beceremedi' DEĞİL", () => {
  // A06 ölçüm hijyeni: araya giren 503, "model 4-6 turu yürütemedi" diye okunmamalı.
  const çıktı = çökmeÇıktısı(
    { adımKod: "KNT-A06", rol: "üretici", prompt: "x" },
    `NVIDIA çağrı hatası: ${DOYGUNLUK_ETİKETİ}: 4 deneme tükendi — model/kod hatası DEĞİL, uç doygun: 503`,
  );
  assert.equal(çıktı.etmen, "NVIDIA-ALTYAPI", "altyapı doygunluğu ayrı imza taşımalı");
  assert.match(String(çıktı.testSonucu), /ALTYAPI/);
  assert.match(String(çıktı.testSonucu), /DEĞERLENDİRİLEMEDİ/);

  // Kontrast: sıradan köprü hatası ESKİ imzayı korur (regresyon).
  const sıradan = çökmeÇıktısı({ adımKod: "X", rol: "üretici", prompt: "x" }, "LLM JSON döndürmedi");
  assert.equal(sıradan.etmen, "NVIDIA-HATA");
  assert.match(String(sıradan.testSonucu), /köprü hatası/);
});

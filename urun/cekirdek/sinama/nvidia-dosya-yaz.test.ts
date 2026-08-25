// nvidia-dosya-yaz.test.ts — 🧪 KNT-A02: `dosya-yaz` aracı (üreticinin diske ilk teması)
//
//   PROBLEM: üretici diske YAZAMIYORDU — `üretilenDosyalar` saf BEYAN'dı. Kapı (gateway
//   Mod="yaz") ve yürütücü (toolround.araçTuru) hazırdı, arkasında oda yoktu.
//
//   Bu süit LLM'SİZ (fikstürlü — KNT-A03'ün kabul deseni): araç modelden BAĞIMSIZ
//   kanıtlanır ki KNT-A06 patladığında suç bölünebilsin (kapı mı sıkı, model mi zayıf?).
//   Yazımlar YALNIZ geçici fikstür dizinine düşer — repo köküne ASLA (KNT-A04 uyarısı).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { kanitYazicilarYap, YAZIM_TAVANI } from "../src/kopru/nvidia.ts";
import { araçTuru, type AraçTalep } from "../src/toolround.ts";
import { BOŞ_MATRIS, type İzinBeyan, type İzinMatrisi, type Mod } from "../src/gateway.ts";

/** TEK-KULLANIMLIK fikstür: kök, kendi ATILABİLİR üst dizininin İÇİNE açılır.
 *
 *  ⚠️ Bu iç-içelik kasıtlı ve mutasyon deneyinde KANITLANDI: kök-sınırı kaldırılınca
 *  `../kacak.txt` GERÇEKTEN yazıldı. Kök doğrudan tmpdir()'e açılsaydı o sızıntı
 *  PAYLAŞILAN tmp köküne düşer, orada kalır ve sonraki koşuyu zehirlerdi (yaşandı).
 *  Üst dizin sınırın DIŞINI da kapsadığı için her sızıntı temizlikle birlikte ölür —
 *  testler koşu-sırasından ve birbirinden bağımsız kalır. */
function kökYap(): { kök: string; üst: string } {
  const üst = mkdtempSync(join(tmpdir(), "knt-a02-"));
  const kök = join(üst, "calisma");
  mkdirSync(kök);
  return { kök, üst };
}

function yazTalep(yol: string, içerik = "merhaba"): AraçTalep {
  return { etmen: "ETM-URETICI", araç: "dosya-yaz", mod: "yaz", argüman: { yol, içerik } };
}

// ══ KABUL ① · KÖK SINIRI — `../` ve mutlak yol RED (kanitOkuyucuYap:307 deseni) ═══════

test("KNT-A02: `../` ile kök dışına yazım REDDEDİLİR (dosya diskte OLUŞMAZ)", () => {
  const { kök, üst } = kökYap();
  try {
    const yazıcı = kanitYazicilarYap(kök);
    const sonuç = yazıcı(yazTalep("../kacak.txt", "kök dışına sızdım"));

    assert.equal(sonuç.durum, "hata");
    assert.match(sonuç.sebep ?? "", /kök dışı erişim reddedildi/);
    // Kalkanın GERÇEK kanıtı: sebep metni değil, diskte dosyanın YOKLUĞU.
    assert.equal(existsSync(resolve(kök, "../kacak.txt")), false, "kök dışı dosya YAZILMAMALI");
  } finally { rmSync(üst, { recursive: true, force: true }); }
});

test("KNT-A02: derin `../../` zinciri de REDDEDİLİR (tek seviye kontrolü değil)", () => {
  const { kök, üst } = kökYap();
  try {
    const sonuç = kanitYazicilarYap(kök)(yazTalep("a/b/../../../../kacak.txt"));
    assert.equal(sonuç.durum, "hata");
    assert.match(sonuç.sebep ?? "", /kök dışı erişim reddedildi/);
  } finally { rmSync(üst, { recursive: true, force: true }); }
});

test("KNT-A02: MUTLAK yol REDDEDİLİR (resolve mutlak yolu yutar — kök yok sayılırdı)", () => {
  const { kök, üst } = kökYap();
  const dışKök = kökYap();
  const dışHedef = join(dışKök.kök, "kurban.txt");
  try {
    const sonuç = kanitYazicilarYap(kök)(yazTalep(dışHedef, "mutlak yolla yazdım"));

    assert.equal(sonuç.durum, "hata");
    assert.match(sonuç.sebep ?? "", /kök dışı erişim reddedildi/);
    assert.equal(existsSync(dışHedef), false, "mutlak yol hedefi YAZILMAMALI");
  } finally { rmSync(üst, { recursive: true, force: true }); rmSync(dışKök.üst, { recursive: true, force: true }); }
});

test("KNT-A02: kök ön-ekini PAYLAŞAN kardeş dizin (`../calisma-yan`) REDDEDİLİR", () => {
  // Çıplak startsWith(köz) kullanılsaydı `<üst>/calisma` kökü `<üst>/calisma-yan`ı
  // kök-İÇİ sanırdı (ön-ek eşleşmesi). `köz + sep` eki bu sızıntıyı kapatır — kanıtı bu test.
  const { kök, üst } = kökYap();
  try {
    const sonuç = kanitYazicilarYap(kök)(yazTalep("../calisma-yan/x.txt"));
    assert.equal(sonuç.durum, "hata");
    assert.match(sonuç.sebep ?? "", /kök dışı erişim reddedildi/);
    assert.equal(existsSync(join(üst, "calisma-yan/x.txt")), false, "ön-ek komşusu YAZILMAMALI");
  } finally { rmSync(üst, { recursive: true, force: true }); }
});

test("KNT-A02: kök DİZİNİN kendi üzerine yazım REDDEDİLİR", () => {
  const { kök, üst } = kökYap();
  try {
    const sonuç = kanitYazicilarYap(kök)(yazTalep("."));
    assert.equal(sonuç.durum, "hata");
    assert.match(sonuç.sebep ?? "", /kök dizinin üzerine yazılamaz/);
  } finally { rmSync(üst, { recursive: true, force: true }); }
});

// ══ KABUL ② · İZİNLİ YAZIMDA DOSYA GERÇEKTEN DİSKTE ═══════════════════════════════

test("KNT-A02: izinli yazımda dosya GERÇEKTEN diskte — beyan değil, artefakt", () => {
  const { kök, üst } = kökYap();
  try {
    const sonuç = kanitYazicilarYap(kök)(yazTalep("uretim/main.ts", "export const x = 1;\n"));

    assert.equal(sonuç.durum, "izinli");
    assert.equal(sonuç.güvenilmez, true, "araç çıktısı DAİMA güvenilmez (injection kalkanı)");
    // ⚠️ ASIL KANIT: sonuç nesnesi değil, DİSK. Bu satır yeşilse üretici gerçekten yazdı.
    const hedef = join(kök, "uretim/main.ts");
    assert.equal(existsSync(hedef), true, "dosya diskte OLMALI (ara dizin dahil açılır)");
    assert.equal(readFileSync(hedef, "utf8"), "export const x = 1;\n", "içerik birebir");
    assert.deepEqual(sonuç.sonuç, { yol: "uretim/main.ts", bayt: 20 });
  } finally { rmSync(üst, { recursive: true, force: true }); }
});

test("KNT-A02: mevcut dosyanın ÜZERİNE yazılır (düzelt-turu için şart — yaz→test→düzelt)", () => {
  const { kök, üst } = kökYap();
  try {
    const yazıcı = kanitYazicilarYap(kök);
    yazıcı(yazTalep("a.ts", "birinci"));
    const sonuç = yazıcı(yazTalep("a.ts", "ikinci"));

    assert.equal(sonuç.durum, "izinli");
    assert.equal(readFileSync(join(kök, "a.ts"), "utf8"), "ikinci");
  } finally { rmSync(üst, { recursive: true, force: true }); }
});

test("KNT-A02: UTF-8 içerik bayt sayısı doğru raporlanır (karakter≠bayt)", () => {
  const { kök, üst } = kökYap();
  try {
    const sonuç = kanitYazicilarYap(kök)(yazTalep("tr.txt", "ığüşöç"));
    assert.equal(sonuç.durum, "izinli");
    assert.deepEqual(sonuç.sonuç, { yol: "tr.txt", bayt: 12 });   // 6 karakter × 2 bayt
    assert.equal(readFileSync(join(kök, "tr.txt"), "utf8"), "ığüşöç");
  } finally { rmSync(üst, { recursive: true, force: true }); }
});

// ══ ARGÜMAN / TAVAN KALKANLARI (fail-visible — zincir kırılmaz) ═══════════════════

test("KNT-A02: yol/içerik argümanı eksik → hata (çökme YOK)", () => {
  const { kök, üst } = kökYap();
  try {
    const yazıcı = kanitYazicilarYap(kök);
    assert.match(yazıcı({ etmen: "E", araç: "dosya-yaz", mod: "yaz", argüman: {} }).sebep ?? "", /yol argümanı yok/);
    assert.match(yazıcı({ etmen: "E", araç: "dosya-yaz", mod: "yaz", argüman: { yol: "a.ts" } }).sebep ?? "", /içerik argümanı yok/);
    assert.match(yazıcı({ etmen: "E", araç: "dosya-yaz", mod: "yaz" }).sebep ?? "", /yol argümanı yok/);
  } finally { rmSync(üst, { recursive: true, force: true }); }
});

test("KNT-A02: içerik tavanı aşılırsa yazım OLMAZ (disk/bellek taşması kalkanı)", () => {
  const { kök, üst } = kökYap();
  try {
    const sonuç = kanitYazicilarYap(kök)(yazTalep("dev.txt", "x".repeat(YAZIM_TAVANI + 1)));
    assert.equal(sonuç.durum, "hata");
    assert.match(sonuç.sebep ?? "", /içerik tavanı aşıldı/);
    assert.equal(existsSync(join(kök, "dev.txt")), false, "tavan aşan içerik diske DEĞMEMELİ");
  } finally { rmSync(üst, { recursive: true, force: true }); }
});

// ══ KABUL ③ · GATEWAY FAIL-CLOSED — izin-matrisi olmadan çağrı RED ════════════════
//    Kök-sınırı aracın İÇ kalkanı; gateway DIŞ kapısı. İkisi bağımsız: gateway RED
//    verirse yürütücü HİÇ çağrılmaz — dosya kök İÇİNDE bile olsa yazılmaz.

const beyan: İzinBeyan[] = [{ araç: "dosya-yaz", mod: "yaz" }];
const matris: İzinMatrisi = new Map([["ETM-URETICI", new Map([["dosya-yaz", new Set<Mod>(["yaz"])]])]]);

test("KNT-A02: BOŞ_MATRIS (matris verilmemiş) → RED, dosya yazılmaz (fail-closed korundu)", () => {
  const { kök, üst } = kökYap();
  try {
    const sonuç = araçTuru(yazTalep("olmamali.ts"), {
      beyanlar: beyan, matris: BOŞ_MATRIS, araçÇağır: kanitYazicilarYap(kök),
    });

    assert.equal(sonuç.durum, "red");
    assert.match(sonuç.sebep ?? "", /izin-matrisi|fail-closed/);
    assert.equal(existsSync(join(kök, "olmamali.ts")), false, "RED alan talep diske ASLA değmez");
  } finally { rmSync(üst, { recursive: true, force: true }); }
});

test("KNT-A02: beyansız araç (least-privilege) → RED, dosya yazılmaz", () => {
  const { kök, üst } = kökYap();
  try {
    const sonuç = araçTuru(yazTalep("olmamali.ts"), {
      beyanlar: [], matris, araçÇağır: kanitYazicilarYap(kök),
    });

    assert.equal(sonuç.durum, "red");
    assert.match(sonuç.sebep ?? "", /least-privilege|beyan etmemiş/);
    assert.equal(existsSync(join(kök, "olmamali.ts")), false);
  } finally { rmSync(üst, { recursive: true, force: true }); }
});

test("KNT-A02: DENETÇİ kimliğiyle yazım → RED (yetki ayrımı — matriste yalnız üretici var)", () => {
  const { kök, üst } = kökYap();
  try {
    const sonuç = araçTuru(
      { ...yazTalep("denetci-yazdi.ts"), etmen: "ETM-DENETCI" },
      { beyanlar: beyan, matris, araçÇağır: kanitYazicilarYap(kök) },
    );

    assert.equal(sonuç.durum, "red");
    assert.equal(existsSync(join(kök, "denetci-yazdi.ts")), false, "denetçi YAZAMAZ");
  } finally { rmSync(üst, { recursive: true, force: true }); }
});

test("KNT-A02: TAM ZİNCİR — beyan ∧ matris izinli → gateway geçilir, dosya diskte", () => {
  const { kök, üst } = kökYap();
  try {
    const sonuç = araçTuru(yazTalep("uretim/kanit.ts", "// gerçek artefakt\n"), {
      beyanlar: beyan, matris, araçÇağır: kanitYazicilarYap(kök),
    });

    assert.equal(sonuç.durum, "izinli");
    assert.equal(sonuç.güvenilmez, true);
    assert.equal(readFileSync(join(kök, "uretim/kanit.ts"), "utf8"), "// gerçek artefakt\n");
  } finally { rmSync(üst, { recursive: true, force: true }); }
});

// ═══════════════════════════════════════════════════════════════════════════
// gateway-surum-denetimi.test.ts — 🚪 RAY3-GTW-A01 · SÜRÜM DENETİMİ AİLESİ
//
//   Araç kapısı fail-closed çalışır ve izin matrisinde karşılığı olmayan her
//   çağrıyı reddeder; buna karşılık kapının tanıdığı araç evreninde tek bir
//   sürüm denetimi aracı yoktu. Bir Etmen depoya dokunmak istediğinde kapı ona
//   doğru cevabı veremiyordu, çünkü reddin sebebi izin yokluğu değil aracın hiç
//   tanınmamasıydı.
//
//   BU NÖBETLER ÜÇ ŞEYİ AYRI AYRI ÖLÇER: ailenin gerçekten ilan edildiğini,
//   kipi doldurulmamış çağrının gerekçeli reddedildiğini ve açık tarafta hiçbir
//   matris hücresinin doldurulmadığını (STR-3 sınırı).
// ═══════════════════════════════════════════════════════════════════════════
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { araçİzinDenetle, beyanÇöz, BOŞ_MATRIS, type İzinMatrisi, type Mod } from "../src/gateway.ts";

const oku = (u: string): string => readFileSync(fileURLToPath(new URL(u, import.meta.url)), "utf8");
const TAKIMLAR = oku("../../../is/plan/takimlar.sar");

/** Ailenin beş işi ve Adımın şart koştuğu kipleri. */
const AILE: ReadonlyArray<{ kod: string; mod: Mod; iş: string }> = [
  { kod: "ARC-GIT-DURUM",  mod: "oku",   iş: "çalışma ağacının durumunu okumak" },
  { kod: "ARC-GIT-FARK",   mod: "oku",   iş: "farkı okumak" },
  { kod: "ARC-GIT-DAL",    mod: "yaz",   iş: "dal açmak" },
  { kod: "ARC-GIT-ISLE",   mod: "yaz",   iş: "değişikliği işlemek" },
  { kod: "ARC-GIT-GONDER", mod: "çağır", iş: "uzak depoya göndermek" },
];

// ── ① AİLE İLAN EDİLMİŞTİR VE BEŞ İŞ KENDİ KİPİYLE AYRILMIŞTIR ─────────────

test("GTW: sürüm denetimi ailesinin beş işi de araç evreninde ilan edilmiştir", () => {
  assert.ok(AILE.length >= 5, "aile en az beş iş ayırmalı — Adımın kabul maddesi");
  for (const { kod, iş } of AILE)
    assert.ok(new RegExp(`Araç\\(\\s*kod:\\s*${kod}\\b`).test(TAKIMLAR),
      `"${iş}" işi için ${kod} aracı ilan edilmemiş — kapı onu tanımaz ve reddin sebebini doğru söyleyemez`);
});

test("GTW: her aracın kipi ilanında adıyla yazılıdır", () => {
  for (const { kod, mod } of AILE) {
    const i = TAKIMLAR.indexOf(`kod: ${kod},`);
    const gövde = TAKIMLAR.slice(i, TAKIMLAR.indexOf("\n\n", i));
    assert.match(gövde, new RegExp(`kip:\\s*${mod}`),
      `${kod} ilanında kip yazılı değil ya da beklenen kip (${mod}) değil — okuma ile yazma aynı izin değildir`);
  }
});

test("GTW: geri alınamayan gönderme, yazmadan AYRI bir kipte yaşar", () => {
  const gonder = AILE.find((a) => a.kod === "ARC-GIT-GONDER")!;
  const isle = AILE.find((a) => a.kod === "ARC-GIT-ISLE")!;
  assert.notEqual(gonder.mod, isle.mod,
    "gönderme ile işleme aynı kipte — geri alınamayan eylemin izni, geri alınabilir yazmanın izniyle aynı hücrede duramaz");
  const i = TAKIMLAR.indexOf("kod: ARC-GIT-GONDER,");
  assert.match(TAKIMLAR.slice(i, i + 500), /GERİ ALINAMAZ/,
    "gönderme ilanı geri alınamazlığı söylemiyor — okuyucu kip ayrımının sebebini bulamaz");
});

// ── ② MATRİS HÜCRESİ DOLDURULMAMIŞ ÇAĞRI GEREKÇELİ REDDEDİLİR ─────────────

test("GTW: hücresi doldurulmamış sürüm denetimi çağrısı reddedilir ve gerekçe okunur", () => {
  const beyanlar = beyanÇöz(AILE.map((a) => `${a.kod}:${a.mod}`));
  for (const { kod, mod } of AILE) {
    const karar = araçİzinDenetle("ETM-URETICI", kod, mod, beyanlar, BOŞ_MATRIS);
    assert.equal(karar.izinli, false,
      `${kod}:${mod} boş matriste izinli çıktı — fail-closed varsayılan bozulmuş`);
    assert.match(karar.sebep, /izin-matrisi/,
      `${kod}:${mod} reddi hangi kapıdan geldiğini söylemiyor`);
    assert.ok(karar.sebep.includes("ETM-URETICI") && karar.sebep.includes(kod) && karar.sebep.includes(mod),
      `ret gerekçesi hangi Etmenin hangi araca hangi kiple erişemediğini söylemiyor: ${karar.sebep}`);
  }
});

test("GTW: beyan etmeyen Etmen matris dolu olsa bile reddedilir (least-privilege)", () => {
  const dolu: İzinMatrisi = new Map([["ETM-URETICI", new Map([["ARC-GIT-GONDER", new Set<Mod>(["çağır"])]])]]);
  const karar = araçİzinDenetle("ETM-URETICI", "ARC-GIT-GONDER", "çağır", [], dolu);
  assert.equal(karar.izinli, false, "beyan etmeyen Etmen matris sayesinde geçti — iki koşul AND değil OR olmuş");
  assert.match(karar.sebep, /least-privilege/, "reddin least-privilege kapısından geldiği yazılmamış");
});

test("GTW: iki koşul birlikte sağlandığında izin verilir — kapı kilitli değil, kapalıdır", () => {
  const beyanlar = beyanÇöz(["ARC-GIT-DURUM:oku"]);
  const dolu: İzinMatrisi = new Map([["ETM-DENETCI", new Map([["ARC-GIT-DURUM", new Set<Mod>(["oku"])]])]]);
  const karar = araçİzinDenetle("ETM-DENETCI", "ARC-GIT-DURUM", "oku", beyanlar, dolu);
  assert.equal(karar.izinli, true,
    "beyan ve matris birlikte sağlandığı hâlde ret verildi — kapı hiçbir koşulda açılmıyorsa araç ilanı işe yaramaz");
});

// ── ③ SINIR: AÇIK TARAFTA HİÇBİR MATRİS HÜCRESİ DOLDURULMAMIŞTIR ──────────

test("GTW/STR-3: açık tarafta sürüm denetimi için doldurulmuş matris hücresi YOKTUR", () => {
  // Açık kaynakta yalnız boş matris yaşar; ayarlanmış yönlendirme kapalı üründedir.
  assert.equal(BOŞ_MATRIS.size, 0, "açık taraftaki varsayılan matris boş değil — yönlendirme sızmış");
  const gateway = oku("../src/gateway.ts");
  for (const { kod } of AILE)
    assert.ok(!gateway.includes(kod),
      `${kod} motorun kapı gövdesinde geçiyor — açık taraf araç adını hücreye bağlamamalıdır (STR-3)`);
  // İlanın kendisi de sınırı yazar; yazmazsa okuyucu hücreleri burada arar.
  assert.match(TAKIMLAR, /MATRİS\s*\n?\/\/\s*HÜCRELERİ açık tarafta DOLDURULMAZ/,
    "aile ilanı, matris hücrelerinin açık tarafta doldurulmadığını söylemiyor — sınır beyanı eksik");
});

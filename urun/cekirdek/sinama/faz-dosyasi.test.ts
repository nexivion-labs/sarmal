// ═══════════════════════════════════════════════════════════════════════════
// faz-dosyasi.test.ts — 📂 FAZ DOSYASI DÜZENİ NÖBETİ (KPS-SIR-A03 · MIM-1.2)
//
//   Founder hükmü (2026-09-29): her Faz plan rafının faz klasöründe sıra önekli
//   kendi dosyasında yaşar, Faz ilanı dosyanın tepesinde durur ve Bloklar Faz
//   gövdesinin içine sarılır; Blokun `mevsim:` alanı ile Fazın `çağır` listesi
//   Blok bağı olarak emeklidir. Düzen önce bir kardeş projenin kendi anayasasında
//   kurulmuştu; ölçüm Sarmal kanonunun bağı üç yolla kurulmasına izin verdiğini,
//   doğuş şablonunun da üç yolu ve planlanmamış kaçışını öğrettiğini göstermiştir.
//   Bu dosya dört gözlemi, muafiyetlerini, doğuş paketinin yeni adresini ve
//   sicil ile kanon bağını davranışla ölçer.
//
//   MUTASYON KANITI (2026-09-29 · her biri tek başına uygulandı, nöbet koşuldu,
//   kaynak `cp` yedeğinden birebir geri yüklendi ve nöbet yeniden 10/10 yeşil
//   görüldü; M1–M8 nöbeti 9/10, M9 nöbeti 8/10 ile kırmızıya düşürdü):
//     M1 çok-fazlı-dosya koşulu `> 1` yerine `> 9`             → nöbet kırmızı
//     M2 faz-dışı-blok `mevsim` dalı sökülür                    → nöbet kırmızı
//     M3 faz-dışı-blok `çağır` dalı sökülür                     → nöbet kırmızı
//     M4 faz-ilanı-tepede-değil koşulu hep yanlış               → nöbet kırmızı
//     M5 yersiz-faz-dosyası deseni her yolu kabul eder          → nöbet kırmızı
//     M6 ders dünyası muafiyeti sökülür                         → nöbet kırmızı
//     M7 doğuş paketi eski `is/plan/ilk_plan.sar` adresine döner→ nöbet kırmızı
//     M8 tek-çocuk-kapsayıcı önerisi eski "kökte yaşat" metnine döner → nöbet kırmızı
//     M9 tek-çocuk-kapsayıcı doğuş iskeleti muafiyeti sökülür    → iki sınama kırmızı
//   İnceleme düzeltmeleri (2026-09-29 · ikinci işleme):
//     M10 muafiyet eski geniş `(sinama|vitrin)` desenine döner   → ⑨ kırmızı
//     M11 faz-dışı-blok kırık mevsimde de ateşler                 → ⑩ kırmızı
//     M12 iskelet muafiyeti yeniden "kuruluş Adımı var mı"ya döner → ⑪ kırmızı
//   KPS-SIR-A02 kalıntıları (2026-09-29 · her biri nöbeti 14/15 ile kırmızıya düşürdü):
//     M13 hiyerarsiTanilari muafiyeti geniş `(sinama|vitrin)` desenine döner → ⑫ kırmızı
//     M14 blokYapisiTanilari iskeleti "kuruluş Adımı var mı"ya döner         → ⑬ kırmızı
// ═══════════════════════════════════════════════════════════════════════════
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { belirtecle } from "../src/belirtec.ts";
import { ayristir } from "../src/ayristirici.ts";
import type { Program } from "../src/sozdizim.ts";
import { fazDosyasiTanilari, mevsimNormalize, tekCocukTanilari, blokYapisiTanilari, hiyerarsiTanilari, DOGUS_ISKELETI_ADIMI } from "../src/denetci.ts";
import { dagKur } from "../src/dag.ts";
import { denetimKos } from "../src/denetim.ts";
import { dogusYaz } from "../src/dogus.ts";
import { YENI_TANI_INDEKS } from "../src/tani-sicili.ts";
import { ONCEKI_TANI_METINLERI } from "../src/tani-metinleri.ts";

const KOK = fileURLToPath(new URL("../../..", import.meta.url));
const SNF_YOL = join(KOK, "oz", "siniflama", "kayit.json");
const DORT = ["çok-fazlı-dosya", "faz-dışı-blok", "faz-ilanı-tepede-değil", "yersiz-faz-dosyası"] as const;

function progla(kaynaklar: Record<string, string>): Map<string, Program> {
  const p = new Map(Object.entries(kaynaklar).map(([dosya, k]) => [dosya, ayristir(belirtecle(k))]));
  mevsimNormalize(p);
  return p;
}
const tanilar = (kaynaklar: Record<string, string>, kod: string): Array<{ dosya: string; mesaj: string; duzey: string; satir: number }> =>
  fazDosyasiTanilari(progla(kaynaklar)).filter((x) => x.tani.kod === kod)
    .map((x) => ({ dosya: x.dosya, mesaj: x.tani.mesaj, duzey: x.tani.duzey, satir: x.tani.satir }));

const KOKDOSYA = `Proje( kod: PRJ-FD, ad: "Faz Dosyası" ) { Teknoloji( kod: TEK-FD, ad: "t" ) }`;
const govde = (kod: string, ek = ""): string =>
  `Blok( kod: ${kod}${ek}, ne: "g" ) {\n  Katman( kod: KAT-${kod}, ad: "k" ) {\n    AltKatman( kod: ALT-${kod}, ad: "m" ) {\n` +
  `      Adım( kod: ADM-${kod}-1, durum: beklemede, ne: "iş" )\n      Adım( kod: ADM-${kod}-2, durum: beklemede, ne: "iş" )\n    }\n  }\n}\n`;
const fazDosyasi = (kod: string, ic = ""): string => `Faz( kod: ${kod}, ad: "f" ) {\n${ic}}\n`;

// ── ① çok-fazlı-dosya ────────────────────────────────────────────────────────

test("① iki Faz taşıyan dosya ikinci Faz ilanında bir kez bildirilir; tek Fazlı dosya sessizdir", () => {
  const t = tanilar({
    "p/p_anadizin.sar": KOKDOSYA,
    "p/is/plan/faz/1_iki.sar": fazDosyasi("FAZ-A", govde("BLK-A")) + fazDosyasi("FAZ-B", govde("BLK-B")) + fazDosyasi("FAZ-C", govde("BLK-C")),
    "p/is/plan/faz/2_tek.sar": fazDosyasi("FAZ-D", govde("BLK-D")),
  }, "çok-fazlı-dosya");
  assert.equal(t.length, 1, "dosya başına bir kez");
  assert.equal(t[0].dosya, "p/is/plan/faz/1_iki.sar");
  assert.match(t[0].mesaj, /3 Faz taşıyor; "FAZ-B" Fazı "FAZ-A" Fazıyla/u);
  assert.equal(t[0].duzey, "bilgi");
});

// ── ② faz-dışı-blok ──────────────────────────────────────────────────────────

test("② mevsim alanıyla ya da çağır satırıyla bağlanan Blok bildirilir; gövdedeki, Fazsız ve yabancı Blok burada sessizdir", () => {
  const t = tanilar({
    "p/p_anadizin.sar": KOKDOSYA,
    "p/is/plan/faz/1_bir.sar": fazDosyasi("FAZ-BIR", govde("BLK-GOVDE") + "  çağır BLK-CAGRI\n"),
    "p/is/plan/blok/mevsim.sar": govde("BLK-MEVSIM", ", mevsim: FAZ-BIR"),
    "p/is/plan/blok/cagri.sar": govde("BLK-CAGRI"),
    "p/is/plan/blok/yabanci.sar": govde("BLK-YABANCI", ", mevsim: PRJ-KARDES::FAZ-X"),
    "p/is/plan/blok/fazsiz.sar": govde("BLK-FAZSIZ"),
  }, "faz-dışı-blok");
  assert.deepEqual(t.map((x) => x.dosya).sort(), ["p/is/plan/blok/cagri.sar", "p/is/plan/blok/mevsim.sar"]);
  assert.match(t.find((x) => x.dosya.endsWith("mevsim.sar"))!.mesaj, /kendi `mevsim:` alanıyla/u);
  assert.match(t.find((x) => x.dosya.endsWith("cagri.sar"))!.mesaj, /Fazın `çağır` listesiyle/u);
  assert.ok(t.every((x) => x.duzey === "bilgi"));
});

// ── ③ faz-ilanı-tepede-değil ─────────────────────────────────────────────────

test("③ kendisinden önce ilan bulunan ya da başka bir gövdeye yazılan Faz bildirilir; tepedeki Faz sessizdir", () => {
  const t = tanilar({
    "p/p_anadizin.sar": KOKDOSYA,
    "p/is/plan/faz/1_once.sar": `Hatırlatıcı( kod: HTR-ONCE, ne: "önce" )\n` + fazDosyasi("FAZ-ONCE", govde("BLK-ONCE")),
    "p/is/plan/faz/2_gomulu.sar": `Proje( kod: PRJ-FD, ad: "g" ) {\n` + fazDosyasi("FAZ-GOMULU", govde("BLK-GOMULU")) + `}\n`,
    "p/is/plan/faz/3_tepe.sar": `// yorum ve belge satırları ilan sayılmaz\n` + fazDosyasi("FAZ-TEPE", govde("BLK-TEPE")),
  }, "faz-ilanı-tepede-değil");
  assert.deepEqual(t.map((x) => x.dosya).sort(), ["p/is/plan/faz/1_once.sar", "p/is/plan/faz/2_gomulu.sar"]);
  assert.match(t.find((x) => x.dosya.endsWith("1_once.sar"))!.mesaj, /önce Hatırlatıcı HTR-ONCE ilan edilmiş/u);
  assert.match(t.find((x) => x.dosya.endsWith("2_gomulu.sar"))!.mesaj, /başka bir düğümün \(Proje PRJ-FD\) gövdesine/u);
});

// ── ④ yersiz-faz-dosyası ─────────────────────────────────────────────────────

test("④ faz klasörü dışındaki ya da sıra öneksiz Faz dosyası bildirilir; `0_` ile `10_` önekleri geçerlidir", () => {
  const t = tanilar({
    "p/p_anadizin.sar": KOKDOSYA,
    "p/is/plan/faz.sar": fazDosyasi("FAZ-DISARIDA", govde("BLK-1")),
    "p/is/plan/faz/faz.sar": fazDosyasi("FAZ-ONEKSIZ", govde("BLK-2")),
    "p/is/plan/faz/0_sifir.sar": fazDosyasi("FAZ-SIFIR", govde("BLK-3")),
    "p/is/plan/faz/10_on.sar": fazDosyasi("FAZ-ON", govde("BLK-4")),
    "p/is/plan/blok/yalniz_blok.sar": govde("BLK-5", ", mevsim: FAZ-SIFIR"),
  }, "yersiz-faz-dosyası");
  assert.deepEqual(t.map((x) => x.dosya).sort(), ["p/is/plan/faz.sar", "p/is/plan/faz/faz.sar"]);
  assert.match(t.find((x) => x.dosya === "p/is/plan/faz.sar")!.mesaj, /faz klasöründe değil/u);
  assert.match(t.find((x) => x.dosya === "p/is/plan/faz/faz.sar")!.mesaj, /adı sıra önekli değil/u);
});

// ── ⑤ muafiyet ───────────────────────────────────────────────────────────────

test("⑤ ders dünyası, eğitim mühürlü dosya, sınama fikstürü ve giriş ilanı dört gözlemden muaftır", () => {
  const bozuk = `Hatırlatıcı( kod: HTR-X, ne: "x" )\n` + fazDosyasi("FAZ-X1", govde("BLK-X1")) + fazDosyasi("FAZ-X2") +
    govde("BLK-X3", ", mevsim: FAZ-X1");
  const t = fazDosyasiTanilari(progla({
    "ogreti/ornek/plan.sar": bozuk,
    "ogreti/sablon/dogus/1_dogus.sar": bozuk.replaceAll("X", "S"),
    "p/is/@EGITIM@_ders.sar": bozuk.replaceAll("X", "E"),
    "urun/cekirdek/sinama/fikstur.sar": bozuk.replaceAll("X", "F"),
    "p/p_anadizin.sar": `Proje( kod: PRJ-G, ad: "g" ) {\n` + fazDosyasi("FAZ-G", govde("BLK-G")) + `}\n`,
  }));
  assert.deepEqual(t.map((x) => `${x.dosya}:${x.tani.kod}`), []);
});

// ── ⑥ doğuş paketi ───────────────────────────────────────────────────────────

test("⑥ doğuş paketi planı is/plan/faz/1_dogus.sar adresinde doğurur ve ilk denetimde dört gözlemden bulgu çıkmaz", () => {
  for (const tur of ["proje", "calisma-alani"] as const) {
    const dizin = mkdtempSync(join(tmpdir(), "sarmal-faz-dosyasi-"));
    try {
      dogusYaz(dizin, "deneme", "2026-09-29", tur, "ilk_proje");
      const plan = tur === "proje" ? join(dizin, "is", "plan", "faz", "1_dogus.sar") : join(dizin, "ilk_proje", "is", "plan", "faz", "1_dogus.sar");
      assert.ok(existsSync(plan), `${tur}: plan Faz dosyası düzeninde doğmalı`);
      assert.ok(!existsSync(join(dizin, "is", "plan", "ilk_plan.sar")) && !existsSync(join(dizin, "ilk_proje", "is", "plan", "ilk_plan.sar")),
        `${tur}: eski adres doğmamalı`);
      assert.match(readFileSync(plan, "utf8"), /^\/\/[^\n]*\n(?:\/\/[^\n]*\n|\n)*Faz\( kod: FAZ-/u, "Faz ilanı yorumlardan sonraki ilk ilan olmalı");
      const s = denetimKos(dizin, { snfYol: SNF_YOL, bugun: "2026-09-29", tamListe: true });
      assert.equal(s.toplamHata, 0, `${tur}: doğan proje hatasız denetlenmeli`);
      const bulgu = s.turDokumu.filter((x) => (DORT as readonly string[]).includes(x.kod) || x.kod === "tek-çocuk-kapsayıcı");
      assert.deepEqual(bulgu, [], `${tur}: ilk denetim yeni gözlemlerden ve Fazı atlatan öneriden bulgu vermemeli`);
    } finally {
      rmSync(dizin, { recursive: true, force: true });
    }
  }
});

test("⑥ doğuş şablonu üç bağ yolunu ve planlanmamış kaçışını öğretmez, yerleşimi öğretir", () => {
  const sablon = readFileSync(join(KOK, "ogreti", "sablon", "dogus", "1_dogus.sar"), "utf8");
  assert.ok(sablon.includes(`kod: ${DOGUS_ISKELETI_ADIMI},`), "iskelet Adımı şablonda yaşamalı");
  assert.match(sablon, /YERLEŞİM[^\n]*\n[^\n]*sıra önekli kendi dosyasında yaşar ve Faz ilanı dosyanın tepesinde durur/u);
  assert.doesNotMatch(sablon, /üç yolla|mevsim: FAZ|planlanmamış:/u);
  assert.ok(!existsSync(join(KOK, "ogreti", "sablon", "dogus", "ilk_plan.sar")), "eski şablon adı kalmamalı");
});

// ── ⑦ tek-çocuk-kapsayıcı artık Fazı atlatmaz ────────────────────────────────

test("⑦ tek Bloklu Fazın önerisi Fazı atlamayı öğretmez; doğuş iskeleti muaftır", () => {
  const metin = ONCEKI_TANI_METINLERI["tek-çocuk-kapsayıcı"];
  const oneri = metin.oneri!({ kusur: "tek-blok" }) ?? "";
  const mesaj = metin.mesaj({ kusur: "tek-blok" });
  assert.doesNotMatch(`${mesaj} ${oneri}`, /kökte yaşa|Faz'ı atla|Faz yazma/u);
  assert.match(oneri, /Fazı kaldırıp Bloku köke alma/u);
  const iskelet = fazDosyasi("FAZ-I", `  Blok( kod: BLK-I ) {\n    Katman( kod: KAT-I ) {\n      AltKatman( kod: ALT-I ) {\n        Adım( kod: ${DOGUS_ISKELETI_ADIMI}, durum: beklemede )\n      }\n    }\n  }\n`);
  assert.equal(tekCocukTanilari(progla({ "p/is/plan/faz/1_dogus.sar": iskelet })).length, 0);
  assert.equal(tekCocukTanilari(progla({ "p/is/plan/faz/1_x.sar": fazDosyasi("FAZ-T", govde("BLK-T")) })).length, 1);
});

// ── ⑧ sicil ve kanon ─────────────────────────────────────────────────────────

test("⑧ dört gözlem sicilde MIM-1.2 maddesine bağlıdır ve kanonun yazdığı bilgi düzeyindedir", () => {
  for (const kod of DORT) {
    const k = YENI_TANI_INDEKS.get(kod);
    assert.ok(k, `${kod} sicilde yok`);
    assert.deepEqual([k.madde, k.kanonDüzey, k.kademe, k.kapsam, k.uretici], ["MIM-1.2", "bilgi", "bilgi", "proje", "denetci.ts"]);
  }
});

test("⑧ MIM-1.2 Faz dosyası düzenini hüküm, gerekçe ve örnekle taşır", () => {
  const mim = readFileSync(join(KOK, "yasa", "kanon", "mim.sar"), "utf8");
  const bolum = mim.slice(mim.indexOf("### MIM-1.2 "), mim.indexOf("Kural fazVeZamanEkseni("));
  const parca = (ad: string): string => bolum.split("\n").find((s) => s.startsWith(`**${ad}:**`)) ?? "";
  assert.match(parca("Hüküm"), /Blok Faza yalnız Fazın gövdesine sarılarak bağlanır/u);
  assert.match(parca("Hüküm"), /`faz\/` klasöründe sıra önekli[^;]*kendi dosyasında yaşar, bir dosya yalnız bir Faz taşır ve Faz ilanı dosyanın tepesinde/u);
  assert.match(parca("Gerekçe"), /Founder bu düzeni 2026-09-29 tarihinde/u);
  assert.match(parca("Örnek"), /Doğru: `is\/plan\/faz\/1_dogus\.sar`[^;]*; yanlış:[^\n]*mevsim: FAZ-01[^\n]*çağır BLK-01/u);
  for (const kod of DORT) assert.match(parca("Zorlama"), new RegExp("`" + kod + "` · BİLGİ", "u"));
});

// ── ⑨ muafiyet yalnız motorun kendi fikstürlerini kapsar ────────────────────

test("⑨ bir projenin sinama/ ya da vitrin/ klasöründeki plan dosyası canlı plandır; yalnız urun/*/sinama/ muaftır", () => {
  const bozuk = (ek: string): string => fazDosyasi(`FAZ-${ek}1`, govde(`BLK-${ek}1`)) + fazDosyasi(`FAZ-${ek}2`, govde(`BLK-${ek}2`));
  const tekAdimli = (ek: string): string =>
    fazDosyasi(`FAZ-${ek}T`, `  Blok( kod: BLK-${ek}T ) {\n    Katman( kod: KAT-${ek}T ) {\n      AltKatman( kod: ALT-${ek}T ) {\n        Adım( kod: ADM-${ek}T, durum: beklemede )\n      }\n    }\n  }\n`);
  const programlar = progla({
    "p/p_anadizin.sar": KOKDOSYA,
    "p/is/plan/sinama/plan.sar": bozuk("S"),
    "p/vitrin/plan.sar": bozuk("V"),
    "urun/cekirdek/sinama/fikstur/plan.sar": bozuk("F"),
    "p/is/plan/sinama/1_tek.sar": tekAdimli("S"),
    "p/vitrin/1_tek.sar": tekAdimli("V"),
    "urun/eklenti/sinama/1_tek.sar": tekAdimli("F"),
  });
  const cok = fazDosyasiTanilari(programlar).filter((x) => x.tani.kod === "çok-fazlı-dosya").map((x) => x.dosya).sort();
  assert.deepEqual(cok, ["p/is/plan/sinama/plan.sar", "p/vitrin/plan.sar"]);
  const tek = blokYapisiTanilari(programlar, dagKur(programlar)).filter((x) => x.tani.kod === "tek-adımlı-blok").map((x) => x.dosya).sort();
  assert.deepEqual(tek, ["p/is/plan/sinama/1_tek.sar", "p/vitrin/1_tek.sar"]);
});

// ── ⑩ kırık mevsim faz-dışı-blok değil fazsız-blok olarak konuşur ───────────

test("⑩ hedef Fazı çözülmeyen mevsim alanı faz-dışı-blok doğurmaz; fazsız-blok hatası konuşur", () => {
  const programlar = progla({
    "p/p_anadizin.sar": KOKDOSYA,
    "p/is/plan/faz/1_bir.sar": fazDosyasi("FAZ-BIR", govde("BLK-GOVDE")),
    "p/is/plan/blok/kirik.sar": govde("BLK-KIRIK", ", mevsim: FAZ-YOK"),
    "p/is/plan/blok/saglam.sar": govde("BLK-SAGLAM", ", mevsim: FAZ-BIR"),
  });
  assert.deepEqual(fazDosyasiTanilari(programlar).filter((x) => x.tani.kod === "faz-dışı-blok").map((x) => x.dosya), ["p/is/plan/blok/saglam.sar"]);
  assert.deepEqual(hiyerarsiTanilari(programlar).filter((x) => x.tani.kod === "fazsız-blok").map((x) => x.dosya), ["p/is/plan/blok/kirik.sar"]);
});

// ── ⑪ muafiyet yalnız saf doğuş iskeletindedir ──────────────────────────────

test("⑪ kuruluş Blokuna ikinci bir Adım yazılınca iskelet muafiyeti düşer ve tek-çocuk gözlemi konuşur", () => {
  const iskelet = (ek: string): string => fazDosyasi("FAZ-I", `  Blok( kod: BLK-I ) {\n    Katman( kod: KAT-I ) {\n      AltKatman( kod: ALT-I ) {\n        Adım( kod: ${DOGUS_ISKELETI_ADIMI}, durum: beklemede )\n${ek}      }\n    }\n  }\n`);
  assert.equal(tekCocukTanilari(progla({ "p/is/plan/faz/1_dogus.sar": iskelet("") })).length, 0);
  assert.equal(tekCocukTanilari(progla({ "p/is/plan/faz/1_dogus.sar": iskelet("        Adım( kod: ADM-EK, durum: beklemede )\n") })).length, 1);
});

// ── ⑫ fazsız-blok muafiyeti de yalnız motorun kendi fikstürlerini kapsar (KPS-SIR-A02) ──

test("⑫ bir projenin sinama/ ya da vitrin/ klasöründeki Fazsız Blok fazsız-blok hatası verir; yalnız urun/*/sinama/ muaftır", () => {
  const programlar = progla({
    "p/p_anadizin.sar": KOKDOSYA,
    "p/is/plan/sinama/plan.sar": govde("BLK-S"),
    "p/vitrin/plan.sar": govde("BLK-V"),
    "urun/cekirdek/sinama/fikstur/plan.sar": govde("BLK-F"),
  });
  const fazsiz = hiyerarsiTanilari(programlar).filter((x) => x.tani.kod === "fazsız-blok").map((x) => x.dosya).sort();
  assert.deepEqual(fazsiz, ["p/is/plan/sinama/plan.sar", "p/vitrin/plan.sar"]);
});

// ── ⑬ Blok yapısı tanıları da iskeleti saf sınırla tanır (KPS-SIR-A02) ──────

test("⑬ kuruluş Adımının yanında ikinci Adım taşıyan Blok iskelet sayılmaz ve katmansız-blok konuşur", () => {
  const blok = (ek: string): string => fazDosyasi("FAZ-I", `  Blok( kod: BLK-I ) {\n    AltKatman( kod: ALT-I ) {\n      Adım( kod: ${DOGUS_ISKELETI_ADIMI}, durum: beklemede )\n${ek}    }\n  }\n`);
  const katmansiz = (kaynak: string): number => {
    const p = progla({ "p/p_anadizin.sar": KOKDOSYA, "p/is/plan/faz/1_dogus.sar": kaynak });
    return blokYapisiTanilari(p, dagKur(p)).filter((x) => x.tani.kod === "katmansız-blok").length;
  };
  assert.equal(katmansiz(blok("")), 0, "saf iskelet muaftır");
  assert.equal(katmansiz(blok("      Adım( kod: ADM-EK, durum: beklemede )\n")), 1, "büyüyen kuruluş Bloku konuşur");
});

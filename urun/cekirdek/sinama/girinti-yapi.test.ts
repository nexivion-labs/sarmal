// ═══════════════════════════════════════════════════════════════════════════
// girinti-yapi.test.ts — 📐 girinti-yapı-uyumsuz gözlemi (KPS-SIR-A02)
//
//   Motor yapıyı girintiden değil ayrıştırmadan okur; girintisi bozuk bir dosya
//   yalnız okuru (ve girintiden çizen yüzeyleri) yanlış bir hiyerarşiye götürür.
//   Gözlem biçimlendiricinin kendi derinlik kuralını okur ve YALNIZ yapısal
//   satırları karşılaştırır: satır başında parantez ya da köşe açıksa satır bir
//   devam ya da hizalama satırıdır ve sayılmaz. Nöbet dört şeyi ölçer:
//   ① bozuk girintide farklar bulunur, biçimlendirilmiş çıktıda hiç fark kalmaz;
//   ② hizalı `kabul: [` listeleri, parametre devamları, belge blokları, çok
//      satırlı değerler ve yorumlar sahte bulgu üretmez;
//   ③ dil denetçisi dosya başına tek bir bilgi notu basar, konumu ilk farktır;
//   ④ gözlem DIL-2.2 maddesine bilgi düzeyinde bağlıdır ve iki dilli katalogdadır;
//   ⑤ ders dünyası muaftır, kullanıcının kendi `ornek/` klasörü canlıdır.
//
//   MUTASYON KANITI (2026-09-29 · `cp` yedeğiyle geri alındı, `cmp` ile doğrulandı):
//     M1 yapısal satır koşulundan "yalnız süslü gövde açık" şartı kalkar → ② ve ③ kırmızı
//     M2 belge bloğu atlanmaz                                            → ② ve ③ kırmızı
//     M3 dil denetçisi gözlemi basmaz                                    → ③ kırmızı
//     M4 ders dünyası muafiyeti kalkar                                   → ⑤ kırmızı
//     M5 DIL-2.2 zorlama satırındaki ilan silinir → ④ ile A08 üçlü senkron ① kırmızı
//     M6 belge açılışı yeniden ham satırda aranır                        → ⑥ kırmızı
// ═══════════════════════════════════════════════════════════════════════════

import { test } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { belirtecle } from "../src/belirtec.ts";
import { ayristir } from "../src/ayristirici.ts";
import { bicimle, girintiYapiFarklari } from "../src/bicimle.ts";
import { dilTanilari } from "../src/denetci.ts";
import { ONCEKI_TANI_KODLARI, YENI_TANI_INDEKS } from "../src/tani-sicili.ts";
import { TANI_METINLERI, TANI_METINLERI_EN } from "../src/tani-metinleri.ts";

/** Katman, AltKatman ve Adım aynı sütunda yazılmış — yapı üç kademe, girinti tek. */
const BOZUK = [
  "Faz( kod: FAZ-A, ad: \"f\" ) {",
  "  Blok( kod: BLK-A, ne: \"g\" ) {",
  "  Katman( kod: KAT-A, ad: \"k\" ) {",
  "  AltKatman( kod: ALT-A, ad: \"m\" ) {",
  "  Adım( kod: ADM-A-1, durum: beklemede )",
  "  Adım( kod: ADM-A-2, durum: beklemede )",
  "  }",
  "  }",
  "  }",
  "}",
].join("\n");

/** Yapısal girintisi doğru, fakat biçimlendiricinin kendi görüşünü uygulayacağı hizalamalar taşıyan dosya. */
const HIZALI = [
  "// yorum satırı istediği sütunda durabilir",
  "Faz( kod: FAZ-B, ad: \"f\" ) {",
  "  Blok( kod: BLK-B,",
  "        ne: \"parametre devamı Blok adının hizasında\" ) {",
  "    Katman( kod: KAT-B, ad: \"k\" ) {",
  "      AltKatman( kod: ALT-B, ad: \"m\" ) {",
  "        Adım( kod: ADM-B-1, durum: beklemede,",
  "                 ne: \"devam satırı parantez hizasında\" ) {",
  "          kabul: [ \"birinci ölçüt\",",
  "                   \"ikinci ölçüt köşe hizasında\" ]",
  "          görev: \"\"\"",
  "   çok satırlı değerin içi",
  "        serbest girintilidir",
  "\"\"\"",
  "        }",
  "      }",
  "    }",
  "  }",
  "}",
  "-->|",
  "     # belge bloğunun içi",
  "  serbest girintilidir { [ (",
  "|<--",
  "   // girintisi kaymış yorum yapısal satır sayılmaz",
].join("\n");

test("① bozuk girintide farklar bulunur; biçimlendirilmiş çıktıda hiç fark kalmaz", () => {
  const farklar = girintiYapiFarklari(BOZUK);
  assert.deepEqual(farklar.map((f) => `${f.satir}:${f.beklenen}:${f.bulunan}`),
    ["3:4:2", "4:6:2", "5:8:2", "6:8:2", "7:6:2", "8:4:2"]);
  assert.deepEqual(girintiYapiFarklari(bicimle(BOZUK, "\n")), []);
});

test("② hizalı listeler, parametre devamları, belge blokları, çok satırlı değerler ve yorumlar sahte bulgu üretmez", () => {
  ayristir(belirtecle(HIZALI));   // fikstür geçerli .sar'dır
  assert.deepEqual(girintiYapiFarklari(HIZALI), []);
  // Biçimlendirici bu dosyada hizalamayı değiştirir; gözlem yine susar, çünkü
  // değişen satırların hiçbiri yapısal değildir.
  assert.notEqual(bicimle(HIZALI, "\n"), HIZALI);
});

test("③ dil denetçisi dosya başına tek bir bilgi notu basar ve ilk farkı gösterir", () => {
  const programlar = new Map([["p/bozuk.sar", ayristir(belirtecle(BOZUK))], ["p/hizali.sar", ayristir(belirtecle(HIZALI))]]);
  const hamlar = new Map([["p/bozuk.sar", BOZUK], ["p/hizali.sar", HIZALI]]);
  const t = dilTanilari(programlar, hamlar).filter((x) => x.tani.kod === "girinti-yapı-uyumsuz");
  assert.equal(t.length, 1);
  assert.equal(t[0].dosya, "p/bozuk.sar");
  assert.equal(t[0].tani.duzey, "bilgi");
  assert.equal(t[0].tani.satir, 3);
  assert.match(t[0].tani.mesaj, /6 yapısal satırının girintisi yapının derinliğiyle uyuşmuyor; ilki bu satırdır: yapı 4 boşluk bekliyor, satır 2 boşlukla yazılmış/u);
});

test("④ gözlem DIL-2.2 maddesine bilgi düzeyinde bağlıdır ve iki dilli katalogda yaşar", () => {
  assert.ok(!ONCEKI_TANI_KODLARI.includes("girinti-yapı-uyumsuz"));
  const kayit = YENI_TANI_INDEKS.get("girinti-yapı-uyumsuz");
  assert.deepEqual(kayit && [kayit.madde, kayit.kanonDüzey, kayit.kademe, kayit.uretici], ["DIL-2.2", "bilgi", "bilgi", "denetci.ts"]);
  const kanon = readFileSync(fileURLToPath(new URL("../../../yasa/kanon/dil.sar", import.meta.url)), "utf8");
  const zorlama = kanon.slice(kanon.indexOf("### DIL-2.2 ·")).split("\n").find((l) => l.startsWith("**Zorlama:**")) ?? "";
  assert.match(zorlama, /`girinti-yapı-uyumsuz` · BİLGİ/u);
  const p = { sayi: 2, beklenen: 4, bulunan: 2 };
  assert.match(TANI_METINLERI["girinti-yapı-uyumsuz"].mesaj(p), /yapı 4 boşluk bekliyor/u);
  assert.match(TANI_METINLERI_EN["girinti-yapı-uyumsuz"].mesaj(p), /the structure expects 4 spaces/u);
});

test("⑤ ders dünyası (örnek, şablon, fikstür, arşiv ve eğitim mühürlü dosya) girinti gözleminden muaftır", () => {
  const dersler = [
    "p/ogreti/ornek/bozuk.sar", "p/ogreti/sablon/bozuk.sar", "p/ogreti/fikstur/bozuk.sar",
    "p/ogreti/arsiv/bozuk.sar", "p/is/plan/@EGITIM@_bozuk.sar",
  ];
  const canli = ["p/is/plan/bozuk.sar", "p/ornek/bozuk.sar"];   // kullanıcının kendi `ornek/` klasörü canlıdır
  const program = ayristir(belirtecle(BOZUK));
  const tum = [...dersler, ...canli];
  const t = dilTanilari(new Map(tum.map((d) => [d, program])), new Map(tum.map((d) => [d, BOZUK])))
    .filter((x) => x.tani.kod === "girinti-yapı-uyumsuz").map((x) => x.dosya).sort();
  assert.deepEqual(t, [...canli].sort());
});

test("⑥ dizgi ya da yorum içindeki belge imi açılış sayılmaz; gözlem dosyanın geri kalanında susmaz", () => {
  const kaynak = [
    "Faz( kod: FAZ-D, ad: \"f\" ) {",
    "  Blok( kod: BLK-D, ne: \"ok -->| bu bir dizgidir\" ) {",
    "  // yorumdaki -->| de açılış değildir",
    "  Katman( kod: KAT-D, ad: \"k\" ) {",
    "  }",
    "  }",
    "}",
  ].join("\n");
  ayristir(belirtecle(kaynak));
  assert.deepEqual(girintiYapiFarklari(kaynak).map((f) => f.satir), [4, 5]);
});

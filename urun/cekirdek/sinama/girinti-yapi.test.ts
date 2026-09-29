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
//   ④ gözlem kanon iddiası olmayan sabit kümededir ve iki dilli katalogdadır.
//
//   MUTASYON KANITI (2026-09-29 · `cp` yedeğiyle geri alındı, `cmp` ile doğrulandı):
//     M1 yapısal satır koşulundan "yalnız süslü gövde açık" şartı kalkar → ② ve ③ kırmızı
//     M2 belge bloğu atlanmaz                                            → ② ve ③ kırmızı
//     M3 dil denetçisi gözlemi basmaz                                    → ③ kırmızı
// ═══════════════════════════════════════════════════════════════════════════

import { test } from "node:test";
import assert from "node:assert/strict";
import { belirtecle } from "../src/belirtec.ts";
import { ayristir } from "../src/ayristirici.ts";
import { bicimle, girintiYapiFarklari } from "../src/bicimle.ts";
import { dilTanilari } from "../src/denetci.ts";
import { ONCEKI_TANI_KODLARI, YENI_TANI_KODLARI } from "../src/tani-sicili.ts";
import { ONCEKI_TANI_METINLERI, ONCEKI_TANI_METINLERI_EN } from "../src/tani-metinleri.ts";

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

test("④ gözlem kanon iddiası olmayan sabit kümededir ve iki dilli katalogda yaşar", () => {
  assert.ok(ONCEKI_TANI_KODLARI.includes("girinti-yapı-uyumsuz"));
  assert.ok(!YENI_TANI_KODLARI.includes("girinti-yapı-uyumsuz"));
  const p = { sayi: 2, beklenen: 4, bulunan: 2 };
  assert.match(ONCEKI_TANI_METINLERI["girinti-yapı-uyumsuz"].mesaj(p), /yapı 4 boşluk bekliyor/u);
  assert.match(ONCEKI_TANI_METINLERI_EN["girinti-yapı-uyumsuz"].mesaj(p), /the structure expects 4 spaces/u);
});

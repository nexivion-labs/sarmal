// ═══════════════════════════════════════════════════════════════════════════
// ad-alanli-atif.test.ts — 🔗 KPS-SIR-A02 · Çıplak Koda Gelen Ad Alanlı Atıflar (YUZ-3.2 · ORK-4)
//
//   Ölçülmüş kusur (2026-09-29): kimlik indeksi atıfları birebir metin
//   eşitliğiyle arıyordu. Başka bir projeden `PRJ-A::ADM-HEDEF` diye verilen
//   atıf, `PRJ-A` kapsamında ilanlı `ADM-HEDEF` tanımına çözülür ve aynı
//   düğümdür; fakat `ADM-HEDEF` sorgusu bu yazımı hiç görmüyor, tanım kimse
//   kullanmıyormuş gibi görünüyordu. Ters yön (ad alanlı sorgu → o Projedeki
//   çıplak yazım) KPS-KOD-A01'den beri kapsanıyordu.
//
//   Nöbet iki projeli (üçüncüsü aynı kodu taşıyan kardeş) bir sınav çatısında
//   ölçer: atıf bütün atıflar kümesinde ve bağlam kartında görünür, yalnız
//   tanımın SAHİBİ Projenin ad alanı sayılır, tek projeli depoda küme birebir
//   aynı kalır.
//
//   MUTASYON KANITI (2026-09-29 · her biri tek başına uygulandı, `cp` yedeğinden
//   geri yüklendi ve `cmp` ile doğrulandı):
//     M1 butunAtiflar ad alanlı gelen atıfları eklemez      → ①–④ kırmızı
//     M2 sahiplik süzgeci kalkar, her Proje ad alanı sayılır → ④ kırmızı
//     M3 gezinRaporu yeniden yalnız birebir atıfları okur    → ② ve ③ kırmızı
//     M4 kart satırı yazılmaz                                → ② ve ③ kırmızı
// ═══════════════════════════════════════════════════════════════════════════

import { test } from "node:test";
import assert from "node:assert/strict";
import { KimlikIndeksi, butunAtiflar, gezinRaporu } from "../src/kimlik.ts";

const proje = (prj: string): string =>
  `Proje( kod: PRJ-${prj}, ad: "${prj}", ne: "Sınav çatısının projesi." ) {\n  Teknoloji( kod: TEK-${prj}, ad: "t" )\n}\n`;

const tanimPlani = (prj: string): string =>
  `Faz( kod: FAZ-${prj}, ad: "f" ) {\n  Blok( kod: BLK-${prj}, ne: "g" ) {\n    Katman( kod: KAT-${prj}, ad: "k" ) {\n` +
  `      AltKatman( kod: ALT-${prj}, ad: "m" ) {\n        Adım( kod: ADM-HEDEF, durum: beklemede, ne: "Hedef iş." )\n      }\n    }\n  }\n}\n`;

/** B projesi A'nın hedefine ad alanıyla bağlanır; C'nin aynı adlı hedefine de bir kez. */
const bPlani =
  `Faz( kod: FAZ-B, ad: "f" ) {\n  Blok( kod: BLK-B, ne: "g" ) {\n    Katman( kod: KAT-B, ad: "k" ) {\n      AltKatman( kod: ALT-B, ad: "m" ) {\n` +
  `        Adım( kod: ADM-B-1, durum: beklemede, bağımlı: [ PRJ-A::ADM-HEDEF ], ne: "A'ya bağlı iş." )\n` +
  `        Adım( kod: ADM-B-2, durum: beklemede, bağımlı: [ PRJ-C::ADM-HEDEF ], ne: "C'ye bağlı iş." )\n` +
  `      }\n    }\n  }\n}\n`;

function catiIndeksi(): KimlikIndeksi {
  const indeks = new KimlikIndeksi();
  indeks.dosyaGuncelle("cati/a/a_anadizin.sar", proje("A"));
  indeks.dosyaGuncelle("cati/a/is/plan/plan.sar", tanimPlani("A"));
  indeks.dosyaGuncelle("cati/b/b_anadizin.sar", proje("B"));
  indeks.dosyaGuncelle("cati/b/is/plan/plan.sar", bPlani);
  return indeks;
}

test("① çıplak sorgu başka projeden ad alanıyla verilen atfı bulur; atıf kendi yazımını taşır", () => {
  const atiflar = butunAtiflar(catiIndeksi(), "ADM-HEDEF");
  assert.deepEqual(atiflar.map((a) => `${a.kod}@${a.dosya}:${a.satir}`), ["PRJ-A::ADM-HEDEF@cati/b/is/plan/plan.sar:5"]);
});

test("② bağlam kartı ve ATIFLAR bölümü aynı ad alanlı atfı gösterir", () => {
  const indeks = catiIndeksi();
  const kaynaklar = new Map([["cati/a/is/plan/plan.sar", tanimPlani("A")]]);
  const rapor = gezinRaporu(indeks, "ADM-HEDEF", (d) => kaynaklar.get(d), () => "");
  assert.match(rapor, /ATIFLAR — gelen \(1\):\n {2}cati\/b\/is\/plan\/plan\.sar:5:/u);
  assert.match(rapor, /BAĞLAM KARTI:[\s\S]*ad alanlı atıflar \(1\): PRJ-A::ADM-HEDEF ← cati\/b\/is\/plan\/plan\.sar:5/u);
});

test("③ yalnız tanımın sahibi Projenin ad alanı sayılır; kardeşin aynı adlı tanımı kendi atfını alır", () => {
  const indeks = catiIndeksi();
  indeks.dosyaGuncelle("cati/c/c_anadizin.sar", proje("C"));
  indeks.dosyaGuncelle("cati/c/is/plan/plan.sar", tanimPlani("C"));
  const atiflar = butunAtiflar(indeks, "ADM-HEDEF").map((a) => a.kod).sort();
  assert.deepEqual(atiflar, ["PRJ-A::ADM-HEDEF", "PRJ-C::ADM-HEDEF"]);
  const kaynaklar = new Map([
    ["cati/a/is/plan/plan.sar", tanimPlani("A")],
    ["cati/c/is/plan/plan.sar", tanimPlani("C")],
  ]);
  const rapor = gezinRaporu(indeks, "ADM-HEDEF", (d) => kaynaklar.get(d), () => "");
  assert.match(rapor, /BAĞLAM KARTI · PRJ-A:[^]*?ad alanlı atıflar \(1\): PRJ-A::ADM-HEDEF ←/u);
  assert.match(rapor, /BAĞLAM KARTI · PRJ-C:[^]*?ad alanlı atıflar \(1\): PRJ-C::ADM-HEDEF ←/u);
});

test("④ ad alanı tanımı taşımayan bir Projeyi gösteriyorsa atıf bu tanıma eklenmez (kırık atıf başkasına yamanmaz)", () => {
  const indeks = catiIndeksi();
  indeks.dosyaGuncelle("cati/c/c_anadizin.sar", proje("C"));   // C yüklü fakat ADM-HEDEF ilan etmiyor
  assert.deepEqual(butunAtiflar(indeks, "ADM-HEDEF").map((a) => a.kod), ["PRJ-A::ADM-HEDEF"]);
});

test("⑤ tek projeli depoda küme birebir atıf kümesiyle aynıdır", () => {
  const indeks = new KimlikIndeksi();
  indeks.dosyaGuncelle("p/p_anadizin.sar", proje("P"));
  indeks.dosyaGuncelle("p/is/plan/plan.sar", tanimPlani("P") +
    `// ADM-HEDEF metin içinde anılır\n`);
  assert.deepEqual(butunAtiflar(indeks, "ADM-HEDEF"), indeks.atiflar("ADM-HEDEF"));
  assert.equal(butunAtiflar(indeks, "ADM-HEDEF").length, 1);
});

// ═══════════════════════════════════════════════════════════════════════════
// mevsim-muhur.test.ts — 🔏 ORK-8 mühür dürüstlüğü nöbeti (KPS-MVS-A01 · ikinci teslim)
//
//   ORK-8 kapanışının dördüncü basamağı mühürdür ve `Faz` şeması mühür alanı
//   taşımadığı için mühür yalnız beyan metninde yaşar. Bu nöbet, metninde
//   mühürlendiğini ya da açık işini devrettiğini yazan bir mevsimin altında hâlâ
//   açık Adım duruyorsa motorun susmadığını, açık iş kapanınca sustuğunu ve
//   ölçütün metnin iddiası değil grafın sayısı olduğunu kanıtlar. Tarih
//   okunmaz; çözücü vade bekçisiyle ortaktır ve bağın üç yazımı da görülür.
//
//   MUTASYON KANITI (2026-09-10 · dördü elden koşuldu, her biri diff ile geri alındı):
//   üretici `m.acik === 0` dalını kaldırırsa ikinci sınama kırmızı yanar;
//   `muhurIddiasi` daima "mühür" döndürürse üçüncü, dördüncü ve yedinci sınama
//   kırmızı yanar; ortak çözücüdeki `mevsim` alanı taraması kaldırılırsa beşinci
//   sınama ile vade nöbetinin dördüncü sınaması birlikte kırmızı yanar (tek
//   çözücünün kanıtı budur); üretici boş dizi döndürürse birinci, dördüncü,
//   beşinci ve altıncı sınama kırmızı yanar. Nöbet dört mutasyonun dördünü görür.
// ═══════════════════════════════════════════════════════════════════════════
import { test } from "node:test";
import assert from "node:assert/strict";
import { belirtecle } from "../src/belirtec.ts";
import { ayristir } from "../src/ayristirici.ts";
import { mevsimMuhurTanilari, mevsimVadeTanilari } from "../src/denetci.ts";

function programla(kaynak: string) {
  return ayristir(belirtecle(kaynak));
}

/** Faz bir dosyada, sardığı Blok BAŞKA dosyada — proje kapsamının kendisi. */
function ikiDosya(fazGovde: string, blokGovde: string) {
  return new Map([
    ["is/plan/faz.sar", programla(fazGovde)],
    ["is/plan/govde.sar", programla(blokGovde)],
  ]);
}

const ACIK_BLOK = `Blok( kod: BLK-X, ad: "gövde" ) {
  Katman( kod: KAT-X, ad: "katman" ) {
    AltKatman( kod: ALT-X, ad: "modül" ) {
      Adım( kod: ADM-1, durum: tamamlandı, ne: "biten iş" )
      Adım( kod: ADM-2, durum: geliştirmede, ne: "süren iş" )
      Adım( kod: ADM-3, durum: beklemede, ne: "bekleyen iş" )
    }
  }
}`;

const KAPALI_BLOK = ACIK_BLOK.replace("durum: geliştirmede", "durum: tamamlandı")
                             .replace("durum: beklemede", "durum: tamamlandı");

const MUHURLU = `Faz( kod: FAZ-TEMMUZ, ad: "Mevsim", hedefTarih: "2026-07-31",
  ne: "🌀 Temmuz dönemi bu mevsimde büyüdü ve MÜHÜRLENDİ (Founder devir hükmü)" ) {
  çağır BLK-X
}`;

test("mühürlendiğini yazan mevsim açık Adım sarıyorsa çelişki bildirilir; sayı ve gövde yazılır", () => {
  const t = mevsimMuhurTanilari(ikiDosya(MUHURLU, ACIK_BLOK));
  assert.equal(t.length, 1);
  assert.equal(t[0].dosya, "is/plan/faz.sar");
  assert.equal(t[0].tani.kod, "mevsim-mührü-çelişkili");
  assert.equal(t[0].tani.duzey, "bilgi");            // gözlemdir, hiçbir kapıyı kırmızıya düşürmez
  assert.match(t[0].tani.mesaj, /FAZ-TEMMUZ/);
  assert.match(t[0].tani.mesaj, /mühürlendiğini/);
  assert.match(t[0].tani.mesaj, /\b2\b/);            // iki açık Adım
  assert.equal(t[0].tani.satir, 2, "konum mühür cümlesinin yaşadığı `ne` alanıdır");
});

test("mühür metni korunup açık Adım kapatılınca bildirim SUSAR — ölçüt grafın sayısıdır", () => {
  assert.equal(mevsimMuhurTanilari(ikiDosya(MUHURLU, KAPALI_BLOK)).length, 0);
});

test("mühür ya da devir iddiası taşımayan mevsim açık iş sarsa da susar; o durum vade bekçisinin işidir", () => {
  const iddiasiz = `Faz( kod: FAZ-TEMMUZ, ad: "Mevsim", hedefTarih: "2026-07-31", ne: "🌀 Temmuz dönemi" ) {\n  çağır BLK-X\n}`;
  const programlar = ikiDosya(iddiasiz, ACIK_BLOK);
  assert.equal(mevsimMuhurTanilari(programlar).length, 0);
  // Aynı bahçede vade bekçisi konuşur: iki bekçi aynı çözücüyü okur, aynı olguyu iki kez saymaz.
  const vade = mevsimVadeTanilari(programlar, "2026-08-27");
  assert.equal(vade.length, 1);
  assert.equal(vade[0].tani.kod, "mevsim-vadesi-geçti");
});

test("açık işini devrettiğini söyleyen mevsim de görülür ve iddia türü mesajda yazılıdır", () => {
  const devirli = `Faz( kod: FAZ-AGUSTOS, ad: "Mevsim", hedefTarih: "2026-08-31",
  ne: "Mevsim kapanmış, açık iş taşıyan on bir gövde Eylül halkasına devredilmiştir" ) {\n  çağır BLK-X\n}`;
  const t = mevsimMuhurTanilari(ikiDosya(devirli, ACIK_BLOK));
  assert.equal(t.length, 1);
  assert.match(t[0].tani.mesaj, /açık işini devrettiğini/);
});

test("bağın üç yazımı da görülür: iç içe gövde, çağır kenarı ve Blokun kendi mevsim alanı", () => {
  const icIce = programla(`Faz( kod: FAZ-TEMMUZ, ad: "Mevsim", ne: "MÜHÜRLENDİ" ) {\n${ACIK_BLOK}\n}`);
  assert.equal(mevsimMuhurTanilari(new Map([["is/plan/faz.sar", icIce]])).length, 1, "iç içe gövde");
  assert.equal(mevsimMuhurTanilari(ikiDosya(MUHURLU, ACIK_BLOK)).length, 1, "çağır kenarı");
  const alanla = mevsimMuhurTanilari(ikiDosya(
    `Faz( kod: FAZ-TEMMUZ, ad: "Mevsim", ne: "MÜHÜRLENDİ" )`,
    ACIK_BLOK.replace('Blok( kod: BLK-X, ad: "gövde" )', 'Blok( kod: BLK-X, ad: "gövde", mevsim: FAZ-TEMMUZ )')));
  assert.equal(alanla.length, 1, "Blokun mevsim alanı");
  assert.match(alanla[0].tani.mesaj, /\b1 gövde/);
});

test("mühür tarih istemez: vadesi gelmemiş fakat erken mühürlenmiş mevsim de görülür", () => {
  const erken = `Faz( kod: FAZ-EYLUL, ad: "Mevsim", hedefTarih: "2099-09-30", ne: "MÜHÜRLENDİ" ) {\n  çağır BLK-X\n}`;
  assert.equal(mevsimMuhurTanilari(ikiDosya(erken, ACIK_BLOK)).length, 1);
  assert.equal(mevsimVadeTanilari(ikiDosya(erken, ACIK_BLOK), "2026-09-10").length, 0, "vade bekçisi susar; tarih dayatılmaz");
});

test("olumsuz, gelecek zamanlı ve içeri devri anlatan yazımlar iddia sayılmaz", () => {
  for (const beyan of [
    "Mevsim henüz mühürlenmemiştir",
    "Açık iş bir sonraki mevsime devredilecek",
    "Ağustos'tan devrolan on bir gövdenin açık işi bu halkada olgunlaşır",
  ]) {
    const faz = `Faz( kod: FAZ-Y, ad: "Mevsim", ne: "${beyan}" ) {\n  çağır BLK-X\n}`;
    assert.equal(mevsimMuhurTanilari(ikiDosya(faz, ACIK_BLOK)).length, 0, beyan);
  }
});

test("ders dünyası muaftır", () => {
  const ornek = new Map([
    ["ogreti/ornek/format/plan.sar", programla(MUHURLU)],
    ["ogreti/ornek/format/govde.sar", programla(ACIK_BLOK)],
  ]);
  assert.equal(mevsimMuhurTanilari(ornek).length, 0);
});

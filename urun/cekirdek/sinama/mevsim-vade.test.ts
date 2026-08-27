// ═══════════════════════════════════════════════════════════════════════════
// mevsim-vade.test.ts — 🌀 ORK-8 mevsim vade nöbeti (KPS-MVS-A01)
//
//   Founder 2026-08-27 tarihinde motorun şu açığını ölçtü: Temmuz mevsiminin
//   hedef tarihi geçmiş, mevsim metninde mühürlendiği yazılı olduğu hâlde altında
//   sekiz açık Adım durmakta ve motor tek kelime etmemektedir. Bu nöbet o açığın
//   kapanış kanıtıdır; determinizm için bugünün tarihi DIŞARIDAN enjekte edilir.
//
//   MUTASYON KANITI: üretici `acik === 0` dalını kaldırırsa üçüncü sınama kırmızı
//   yanar; `vade >= bugun` karşılaştırması kaldırılırsa ikinci sınama kırmızı yanar.
// ═══════════════════════════════════════════════════════════════════════════
import { test } from "node:test";
import assert from "node:assert/strict";
import { belirtecle } from "../src/belirtec.ts";
import { ayristir } from "../src/ayristirici.ts";
import { mevsimVadeTanilari } from "../src/denetci.ts";

const BUGUN = "2026-08-27";

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

test("vadesi geçmiş mevsim açık Adım sarıyorsa bildirilir ve sayı ile gövde yazılır", () => {
  const t = mevsimVadeTanilari(
    ikiDosya(`Faz( kod: FAZ-TEMMUZ, ad: "Mevsim", hedefTarih: "2026-07-31" ) {\n  çağır BLK-X\n}`, ACIK_BLOK),
    BUGUN);
  assert.equal(t.length, 1);
  assert.equal(t[0].dosya, "is/plan/faz.sar");
  assert.equal(t[0].tani.kod, "mevsim-vadesi-geçti");
  assert.equal(t[0].tani.duzey, "bilgi");            // hiçbir kapıyı kırmızıya düşürmez
  assert.match(t[0].tani.mesaj, /FAZ-TEMMUZ/);
  assert.match(t[0].tani.mesaj, /2026-07-31/);
  assert.match(t[0].tani.mesaj, /\b2\b/);            // iki açık Adım
});

test("vadesi gelmemiş mevsim açık iş taşısa da susar (tarih dayatılmaz · MIM-1.2)", () => {
  const t = mevsimVadeTanilari(
    ikiDosya(`Faz( kod: FAZ-EYLUL, ad: "Mevsim", hedefTarih: "2026-09-30" ) {\n  çağır BLK-X\n}`, ACIK_BLOK),
    BUGUN);
  assert.equal(t.length, 0);
});

test("vadesi geçmiş mevsim açık iş taşımıyorsa susar — kapanmış mevsim rahat bırakılır", () => {
  const t = mevsimVadeTanilari(
    ikiDosya(`Faz( kod: FAZ-TEMMUZ, ad: "Mevsim", hedefTarih: "2026-07-31" ) {\n  çağır BLK-X\n}`, KAPALI_BLOK),
    BUGUN);
  assert.equal(t.length, 0);
});

test("bağ Blokun kendi mevsim alanıyla kurulduğunda da görülür (MIM-1.2 ③ ikinci yazım)", () => {
  const t = mevsimVadeTanilari(
    ikiDosya(`Faz( kod: FAZ-TEMMUZ, ad: "Mevsim", hedefTarih: "2026-07-31" )`,
             ACIK_BLOK.replace('Blok( kod: BLK-X, ad: "gövde" )', 'Blok( kod: BLK-X, ad: "gövde", mevsim: FAZ-TEMMUZ )')),
    BUGUN);
  assert.equal(t.length, 1);
  assert.match(t[0].tani.mesaj, /FAZ-TEMMUZ/);
});

test("ay hassasiyetli tarih ay sonundan ölçülür; tarihsiz mevsim ihlal değildir", () => {
  const ay = mevsimVadeTanilari(
    ikiDosya(`Faz( kod: FAZ-TEMMUZ, ad: "Mevsim", hedefTarih: "2026-07" ) {\n  çağır BLK-X\n}`, ACIK_BLOK), BUGUN);
  assert.equal(ay.length, 1);
  const tarihsiz = mevsimVadeTanilari(
    ikiDosya(`Faz( kod: FAZ-BELIRSIZ, ad: "Mevsim" ) {\n  çağır BLK-X\n}`, ACIK_BLOK), BUGUN);
  assert.equal(tarihsiz.length, 0);
});

test("ders dünyası muaftır ve bozuk tarih enjeksiyonu sessiz düşer", () => {
  const ornek = new Map([
    ["ogreti/ornek/format/plan.sar", programla(`Faz( kod: FAZ-ORNEK, ad: "Mevsim", hedefTarih: "2026-07-31" ) {\n  çağır BLK-X\n}`)],
    ["ogreti/ornek/format/govde.sar", programla(ACIK_BLOK)],
  ]);
  assert.equal(mevsimVadeTanilari(ornek, BUGUN).length, 0);
  const saglam = ikiDosya(`Faz( kod: FAZ-TEMMUZ, ad: "Mevsim", hedefTarih: "2026-07-31" ) {\n  çağır BLK-X\n}`, ACIK_BLOK);
  assert.equal(mevsimVadeTanilari(saglam, "bozuk-tarih").length, 0);
});

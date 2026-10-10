// ═══════════════════════════════════════════════════════════════════════════
// kitapliksiz-kok.test.ts — 📚 KPS-CEL-A01 · ikinci ayrışma (MIM-3.2 · Founder hükmü 2026-09-09)
//
//   Founder Kitaplık kademesini ZORUNLU kılmıştır: dallanan her klasör bir
//   Kitaplıktır, Raflar Kitaplıkların İÇİNDE yaşar ve bir kökün altına çıplak Raf
//   yazılmaz. Gerekçe kökün okunabilirliğidir; düzine sayıda çıplak Raf arasında
//   hangi alanın nerede başladığı seçilemez.
//
//   ÖLÇÜLEN AYRIŞMA (2026-09-09 · iki bağımsız denetim): ürünün iki öğretim
//   yüzeyi farklı mimari öğretiyordu. Rehber şablonları Kitaplık kademesini
//   öğretip Rafları onun içine koyarken doğuş paketi hiç Kitaplık üretmeyip
//   Rafları doğrudan kökün altına yazıyordu. Aynı ikilik MIM-3.2 maddesinin kendi
//   içinde de vardı: düz yazı Rafı Kitaplığın içindeki sorumluluk bölümü olarak
//   tarif ederken zorlama cümlesi ikisini birbirinin alternatifi sayıyordu. Doğuş
//   paketi BKM-DNT-A15 turunda düzeltildi; bu nöbet hükmün ölçüm yarısını tutar.
//
//   İKİ TANI AYNI OLGUYU İKİ KEZ BİLDİRMEZ ve nöbet bunu ayrıca ölçer: hiç yapı
//   ilanı yoksa `rafsız-anadizin`, yapı ilanı varken kademe atlanmışsa
//   `kitaplıksız-kök` konuşur. İkisinin birlikte ateşlemesi YUZ-3.3 tanı yüzeyi
//   karışması olurdu.
//
//   MUTASYON KANITI (2026-09-19 · ikisi de geri alındı ve süit yeniden yeşil):
//   ① bekçi Kitaplık aramasını bırakıp her kökte sessiz kalınca "çıplak Raf
//      bildirilir" nöbeti KIRMIZI; ② ders dünyası muafiyeti kaldırılınca "öğretim
//      malzemesi muaftır" nöbeti KIRMIZI.
// ═══════════════════════════════════════════════════════════════════════════

import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { belirtecle } from "../src/belirtec.ts";
import { ayristir } from "../src/ayristirici.ts";
import { kitapliksizKokTanilari } from "../src/denetci.ts";
import { siniflamaOrtuMerge, siniflamaOrtuYukle, siniflamaYukle } from "../src/siniflama.ts";
import { fileURLToPath } from "node:url";

const KOK = fileURLToPath(new URL("../../..", import.meta.url));
const SNF = siniflamaOrtuMerge(siniflamaYukle(join(KOK, "oz/siniflama/kayit.json")), siniflamaOrtuYukle(KOK));

const coz = (kaynak: string) => ayristir(belirtecle(kaynak));

/** Kademe atlanmış kök: Raf doğrudan Projenin altında. */
const ciplakRaf = `
Proje( kod: PRJ-A, ad: "A", rejim: katı, ne: "Kademe atlanmış kök." ) {
  Raf( kod: RAF-PLAN, yol: "is/plan/", ne: "Plan rafı." )
}`;

/** Kademe yerinde: Raf, Kitaplığın içinde. */
const kademeliKok = `
Proje( kod: PRJ-A, ad: "A", rejim: katı, ne: "Kademesi yerinde kök." ) {
  Kitaplık( kod: KTP-IS, yol: "is/", ne: "İşin kitaplığı." ) {
    Raf( kod: RAF-PLAN, yol: "plan/", ne: "Plan rafı." )
  }
}`;

/** Hiç yapı ilanı olmayan kök — bu hâl rafsız-anadizin bekçisinindir. */
const yapisizKok = `
Proje( kod: PRJ-A, ad: "A", rejim: katı, ne: "Yapı ilanı taşımayan kök." ) {
  Teknoloji( kod: TEK-TS, ne: "TypeScript." )
}`;

test("kökün altına çıplak Raf yazılınca kademe atlaması bildirilir", () => {
  const t = kitapliksizKokTanilari(coz(ciplakRaf), SNF, "a_anadizin.sar");
  assert.equal(t.length, 1);
  assert.equal(t[0].kod, "kitaplıksız-kök");
  // Kademesi maddenin kendi kademesiyle aynıdır; kapıyı kırmızıya düşürmez.
  assert.equal(t[0].duzey, "uyarı");
  // Bulgu, kademenin atlandığı yeri gösterir: ilk çıplak Rafın satırı.
  assert.ok(t[0].satir > 0);
});

test("Raf Kitaplığın içindeyse bekçi susar", () => {
  assert.deepEqual(kitapliksizKokTanilari(coz(kademeliKok), SNF, "a_anadizin.sar"), []);
});

test("hiç yapı ilanı yoksa bu bekçi konuşmaz — o hâl rafsız-anadizin'indir", () => {
  // İki tanının aynı olguyu iki kez bildirmesi YUZ-3.3 ihlalidir; sınır burada ölçülür.
  assert.deepEqual(kitapliksizKokTanilari(coz(yapisizKok), SNF, "a_anadizin.sar"), []);
});

test("ders dünyası OGR-5 uyarınca muaftır", () => {
  // Öğretim malzemesi bilinçle eksik ağaç gösterebilir; ürün hükmü oraya inmez.
  assert.deepEqual(kitapliksizKokTanilari(coz(ciplakRaf), SNF, "ogreti/ornek/format/ornek.sar"), []);
});

test("Sarmal'ın kendi giriş ilanı kademeyi taşır ve bekçi sessizdir", () => {
  const ana = coz(
    // Giriş ilanının kendisi okunmaz; ölçülen şey kademenin varlığıdır ve
    // depo bugün altı Kitaplık taşımaktadır (2026-09-09 ölçümü).
    `ÇalışmaAlanı( kod: CAL-X, ad: "X", ne: "Kademesi yerinde çatı." ) {
       Kitaplık( kod: KTP-URUN, yol: "urun/", ne: "Ürün kitaplığı." ) {
         Raf( kod: RAF-CEKIRDEK, yol: "cekirdek/", ne: "Motor rafı." )
       }
     }`,
  );
  assert.deepEqual(kitapliksizKokTanilari(ana, SNF, "cati_anadizin.sar"), []);
});

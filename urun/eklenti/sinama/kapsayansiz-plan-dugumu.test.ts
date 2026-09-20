// ═══════════════════════════════════════════════════════════════════════════
// kapsayansiz-plan-dugumu.test.ts — 🪟 KPS-CEL-A01 · Panel hiçbir Adımı sessizce düşürmez
//
//   ÖLÇÜLMÜŞ KUSUR (Founder 2026-09-16): yol haritası panelinin sayacı ile komut
//   satırı karnesi uyuşmuyordu; panel üç yüz altmış yedi bölü dört yüz iki, karne
//   üç yüz altmış sekiz bölü dört yüz üç gösteriyordu. Farkın tek bir Adım olduğu
//   ölçüldü: bir Katman 2026-09-08 gecesi Blokunun kapanış parantezinin DIŞINA
//   doğmuş, komut satırı her Adım düğümünü saydığı için onu saymış, panel ise
//   kökleri yalnız Blok ile Fazdan seçtiği için o Katmanın Adımını hiçbir yere
//   asmamış, saymamış ve göstermemişti. Kusur sekiz gün fark edilmeden yaşadı,
//   çünkü görünmeyen bir Adıma kimse bağlanmaz ve kimse onu aramaz.
//
//   İLKE: yeşil panel yeşil ağaç demektir. Bir yerleşimin DOĞRU olup olmadığı
//   motorun hükmüdür ve panel o hükmü vermez; panelin işi var olanı göstermektir.
//   Bu yüzden onarım bir tanı doğurmaz, yalnız sessiz düşürmeyi bitirir: bir
//   Blokun ve bir Fazın dışında doğmuş her plan düğümü kendi başına kök olur.
//
//   MUTASYON KANITI (2026-09-19 · geri alındı ve süit yeniden yeşil): kök seçimi
//   eski hâline, yani yalnız Blok ile Faza döndürülünce beş nöbetin üçü KIRMIZI:
//   "kapsayansız Katmanın Adımı görünür ve sayılır", "hiçbir Adım düşmez" ve "üst
//   düzeyde tek başına doğmuş AltKatman ile Adım da görünür".
// ═══════════════════════════════════════════════════════════════════════════

import { test } from "node:test";
import assert from "node:assert/strict";
import { belirtecle } from "../../cekirdek/src/belirtec.ts";
import { ayristir } from "../../cekirdek/src/ayristirici.ts";
import type { Dugum } from "../../cekirdek/src/sozdizim.ts";
import { ogeleriTopla, type PlanOgesi } from "../src/yolharitasi-cekirdek.ts";

const topla = (kaynak: string): PlanOgesi<string>[] =>
  ogeleriTopla(ayristir(belirtecle(kaynak)).bildirimler, "plan.sar");

/** Kaynaktaki bütün Adım düğümleri — komut satırı karnesinin saydığı evren. */
function adimSayisi(kaynak: string): number {
  let n = 0;
  const gez = (d: Dugum): void => { if (d.tur === "widget" && d.ad === "Adım") n++; d.cocuklar.forEach(gez); };
  ayristir(belirtecle(kaynak)).bildirimler.forEach(gez);
  return n;
}
const panelToplami = (kokler: readonly PlanOgesi<string>[]): number => kokler.reduce((t, k) => t + k.toplam, 0);

/** Ölçülen olayın ikizi: ikinci Katman Blokun kapanış parantezinin dışına doğmuştur. */
const DISARIDA_DOGAN = `
Faz( kod: FAZ-X, ad: "Mevsim", ne: "dönem" ) {
  Blok( kod: BLK-X, ad: "Gövde", ne: "iş" ) {
    Katman( kod: KAT-ICERIDE, ad: "İçeride", ne: "Blokun içindeki katman" ) {
      AltKatman( kod: ALT-ICERIDE, ad: "Modül", departman: kodlama, ne: "modül" ) {
        Adım( kod: ADM-ICERIDE, durum: tamamlandı, ne: "görünen iş" )
      }
    }
  }
}
Katman( kod: KAT-DISARIDA, ad: "Dışarıda", ne: "Blokun parantezinin dışına doğmuş katman" ) {
  AltKatman( kod: ALT-DISARIDA, ad: "Modül", departman: kodlama, ne: "modül" ) {
    Adım( kod: ADM-DISARIDA, durum: beklemede, ne: "sekiz gün görünmeyen iş" )
  }
}`;

test("kapsayansız Katmanın Adımı panelde görünür ve sayılır", () => {
  const kokler = topla(DISARIDA_DOGAN);
  assert.deepEqual(kokler.map((k) => `${k.tip}:${k.kod}`), ["Faz:FAZ-X", "Katman:KAT-DISARIDA"]);
  const disarida = kokler.find((k) => k.kod === "KAT-DISARIDA");
  assert.equal(disarida?.toplam, 1);
  assert.equal(disarida?.cocuklar[0]?.cocuklar[0]?.kod, "ADM-DISARIDA");
});

test("hiçbir Adım düşmez: panelin toplamı kaynaktaki Adım sayısına eşittir", () => {
  // Founder'ın ölçtüğü uyuşmazlığın ta kendisi: iki yüzey aynı evreni saymalıdır.
  assert.equal(adimSayisi(DISARIDA_DOGAN), 2);
  assert.equal(panelToplami(topla(DISARIDA_DOGAN)), 2);
});

test("üst düzeyde tek başına doğmuş AltKatman ile Adım da görünür", () => {
  const kaynak = `
AltKatman( kod: ALT-YALNIZ, ad: "Modül", departman: kodlama, ne: "kapsayansız modül" ) {
  Adım( kod: ADM-BIR, durum: beklemede, ne: "iş" )
}
Adım( kod: ADM-YALNIZ, durum: geliştirmede, ne: "hiçbir kademenin içinde olmayan iş" )`;
  const kokler = topla(kaynak);
  assert.deepEqual(kokler.map((k) => k.kod), ["ALT-YALNIZ", "ADM-YALNIZ"]);
  assert.equal(panelToplami(kokler), adimSayisi(kaynak));
});

test("olağan plan değişmez: kök yalnız Fazdır ve alt kademeler onun içinde kalır", () => {
  const kaynak = `
Faz( kod: FAZ-Y, ad: "Mevsim", ne: "dönem" ) {
  Blok( kod: BLK-Y, ad: "Gövde", ne: "iş" ) {
    Katman( kod: KAT-Y, ad: "Dal", ne: "katman" ) {
      AltKatman( kod: ALT-Y, ad: "Modül", departman: kodlama, ne: "modül" ) {
        Adım( kod: ADM-Y1, durum: tamamlandı, ne: "iş" )
        Adım( kod: ADM-Y2, durum: beklemede, ne: "iş" )
      }
    }
  }
}`;
  const kokler = topla(kaynak);
  // İç içe yazılmış hiçbir kademe ikinci kez kök olarak çoğalmaz.
  assert.deepEqual(kokler.map((k) => k.kod), ["FAZ-Y"]);
  assert.equal(panelToplami(kokler), 2);
});

test("giriş ilanının içindeki plan dışı düğümler kök sayılmaz", () => {
  const kaynak = `
Proje( kod: PRJ-Z, ad: "z", rejim: katı, ne: "Yalnız mimari taşıyan kök." ) {
  Kitaplık( kod: KTP-IS, yol: "is/", ne: "işin kitaplığı" ) { Raf( kod: RAF-PLAN, yol: "plan/", ne: "plan rafı" ) }
}`;
  assert.deepEqual(topla(kaynak), []);
});

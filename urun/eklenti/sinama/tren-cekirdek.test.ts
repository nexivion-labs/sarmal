// ═══════════════════════════════════════════════════════════════════════════
// tren-cekirdek.test.ts — 🚆 TREN GÖRÜNÜMÜNÜN SAF ÇEKİRDEĞİ (Founder 2026-10-21)
//
//   Tren, yapay zekâ ajanlarının bölümüdür: Etmen ilanları, `geliştirmede`
//   Adımlar ve son Koşum mührü. Veri yeni bir ayrıştırıcıdan değil, denetim
//   turunun program haritasından gelir; bu süit o süzgecin kararlarını ve boş
//   durum cümlesinin iki dilini kilitler.
// ═══════════════════════════════════════════════════════════════════════════

import "./dil-kur.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { belirtecle } from "../../cekirdek/src/belirtec.ts";
import { ayristir } from "../../cekirdek/src/ayristirici.ts";
import type { Program } from "../../cekirdek/src/sozdizim.ts";
import { trenBosMu, trenOzetiCikar, trenParmakIzi } from "../src/tren-cekirdek.ts";
import { TREN_METINLERI, yuzeyDiliniAyarla } from "../src/yuzey-metinleri.ts";

const prog = (k: string): Program => ayristir(belirtecle(k));

const PLAN = `
Etmen( kod: ETM-B, ad: "Bravo", tür: uzman, ne: "ikinci ajan" )
Etmen( kod: ETM-A, ad: "Alfa", tür: apex, ne: "birinci ajan" )
Blok( kod: BLK-1, ad: "Bir" ) {
  Katman( kod: KTM-1, ad: "Kat" ) {
    Adım( kod: ADM-1, ad: "Biten", durum: tamamlandı )
    Adım( kod: ADM-2, ad: "Süren", durum: geliştirmede,
      koşu: Koşum( kod: KSM-ADM-2, ne: "ilk koşu", mühür: VERIFIED, karar: VERIFIED, tarih: "2026-10-01" ) )
    Adım( kod: ADM-3, ad: "Bekleyen", durum: beklemede,
      koşu: Koşum( kod: KSM-ADM-3, ne: "yeni koşu", mühür: PARTIAL, karar: PARTIAL, tarih: "2026-10-20" ) )
  }
}
`;

test("Etmen ilanları, geliştirmedeki Adımlar ve son Koşum mührü programdan süzülür; sıra koda göredir", () => {
  const o = trenOzetiCikar([["a.sar", prog(PLAN)]]);
  assert.deepEqual(o.etmenler.map((e) => [e.kod, e.ad, e.tur]), [["ETM-A", "Alfa", "apex"], ["ETM-B", "Bravo", "uzman"]]);
  assert.deepEqual(o.adimlar.map((a) => a.kod), ["ADM-2"], "yalnız geliştirmedeki Adım gösterilir");
  assert.equal(o.sonMuhur?.kod, "KSM-ADM-3", "tarihi en yeni Koşum kazanır (Adımın durumundan bağımsız)");
  assert.equal(o.sonMuhur?.adim, "ADM-3");
  assert.equal(o.sonMuhur?.muhur, "PARTIAL");
  assert.equal(trenBosMu(o), false);
});

test("ilan, geliştirmede Adım ve Koşum yoksa özet boştur ve boş durum cümlesi iki dildedir", () => {
  const o = trenOzetiCikar([["a.sar", prog('Blok( kod: BLK-1 ) { Adım( kod: ADM-1, durum: beklemede ) }')]]);
  assert.deepEqual(o, { etmenler: [], adimlar: [], sonMuhur: undefined });
  assert.equal(trenBosMu(o), true);
  assert.equal(trenBosMu(trenOzetiCikar([])), true);
  yuzeyDiliniAyarla("tr");
  assert.equal(TREN_METINLERI.bosDurum, "Bu projede ilan edilmiş ajan ya da geliştirmede Adım yok.");
  yuzeyDiliniAyarla("en");
  assert.equal(TREN_METINLERI.bosDurum, "No declared agents or Adım nodes in development in this project.");
  yuzeyDiliniAyarla("tr");
});

test("parmak izi içerik aynıysa aynıdır, bir ajan eklenince değişir", () => {
  const a = trenOzetiCikar([["a.sar", prog(PLAN)]]);
  const b = trenOzetiCikar([["a.sar", prog(PLAN)]]);
  assert.equal(trenParmakIzi(a), trenParmakIzi(b));
  const c = trenOzetiCikar([["a.sar", prog(PLAN)], ["b.sar", prog("Etmen( kod: ETM-C, ad: \"Charlie\" )")]]);
  assert.notEqual(trenParmakIzi(a), trenParmakIzi(c));
});

test("kaynak nöbeti: Tren yeni ayrıştırıcı kurmaz; tek veri kaynağı turun yayınıdır ve kendi taraması yoktur", () => {
  const kaynak = readFileSync(fileURLToPath(new URL("../src/tren.ts", import.meta.url)), "utf8");
  assert.ok(kaynak.includes("turGoruntusunuDinle") && kaynak.includes("sonTurGoruntusu"));
  assert.ok(!/findFiles|createFileSystemWatcher|belirtecle\(|ayristir\(/.test(kaynak), "Tren kendi taramasını ya da ayrıştırıcısını kurmuş");
});

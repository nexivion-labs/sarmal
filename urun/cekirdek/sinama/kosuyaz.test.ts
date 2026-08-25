// kosuyaz.test.ts — 📼 STR-4: koşu geri-yazım kaydı (kosumYaz) + ⛔ bloklu durum.
// MDR-A04 bağ sınıflandırması: bu dosyadaki mesaj-metnine dokunan assert'ler ya kod-çıpalı ikincil kontroldür ya da bilinçli metin sözleşmesidir (nöbet); çıpasız tanı araması yasaktır. Tam döküm: nitelik/motor_tani_envanteri.sar (MDR-A04 bölümü).
//   Render round-trip: üretilen parça belirtecle+ayristir'dan geçer; şema enum'ları
//   (Koşum.mühür/karar) motorca doğrulanır; bloklu Adım rozet üretir.

import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { belirtecle } from "../src/belirtec.ts";
import { ayristir } from "../src/ayristirici.ts";
import { dogrula } from "../src/dogrulayici.ts";
import { siniflamaYukle } from "../src/siniflama.ts";
import { kosumYaz } from "../src/dongu.ts";
import type { DonguSonuç } from "../src/dongu.ts";

const snf = siniflamaYukle(fileURLToPath(new URL("../../../oz/siniflama/kayit.json", import.meta.url)));
const dnt = (kaynak: string) => dogrula(ayristir(belirtecle(kaynak)), snf);

const sonucYap = (kismi?: Partial<DonguSonuç>): DonguSonuç => ({
  adımKod: "A01",
  karar: "kabul",
  mühür: "VERIFIED",
  iterasyonlar: [{ no: 0 } as never, { no: 1 } as never],
  gerekçe: { ne: "kabul — davranışsal kanıt doğrulandı", kanıt: "taslak.test.ts:12" },
  ertelenenler: [],
  ...kismi,
});

test("kosumYaz: DonguSonuç → koşu: Koşum(...) parçası (alanlar tam)", () => {
  const parca = kosumYaz(sonucYap(), { tarih: "2026-07-10", model: "z-ai/glm-5.2" });
  assert.ok(parca.startsWith("koşu: Koşum( kod: KSM-A01,"));
  for (const bekle of ["mühür: VERIFIED", "karar: kabul", "iterasyon: 2",
                       'kanıt: "taslak.test.ts:12"', 'tarih: "2026-07-10"', 'model: "z-ai/glm-5.2"']) {
    assert.ok(parca.includes(bekle), `parça '${bekle}' içermeli: ${parca}`);
  }
});

test("round-trip: üretilen parça Adım içinde AYRIŞIR + şema-TEMİZ geçer", () => {
  const parca = kosumYaz(sonucYap(), { tarih: "2026-07-10" });
  const sar = `-->|
  ## Amaç
  🎯 Test.
  ## Kapsam
  📦 Yalnız round-trip fikstürü; başka hiçbir şeyi kapsamaz. Koşu parçası ayrışmalı. Şema temiz kalmalı. Bitti.
  ## Sonuç
  ✅ Kabul: sıfır tanı.
|<--
Blok( kod: BLK-T, ne: "t" ) { Katman( kod: FZ-T, ad: "f" ) { AltKatman( kod: KT-T, ad: "k" ) {
    Adım( kod: A01, ne: "iş", görev: "g", kabul: "k", bağımlı: [], durum: tamamlandı, ${parca} )
  } } }`;
  const hatalar = dnt(sar).filter((t) => t.duzey !== "bilgi");
  assert.equal(hatalar.length, 0, JSON.stringify(hatalar, null, 2));
});

test("şema zorlar: geçersiz mühür değeri enum tanısı üretir (Koşum widget'ı denetlenir)", () => {
  const sar = `Blok( kod: BLK-T, ne: "t" ) { Katman( kod: FZ-T, ad: "f" ) { AltKatman( kod: KT-T, ad: "k" ) {
    Adım( kod: A01, ne: "iş", koşu: Koşum( kod: KSM-A01, ne: "koşu", mühür: PARLAK ) )
  } } }`;
  const t = dnt(sar);
  // MDR-A04: tek kırılgan bağ koda çıpalandı — tanı yalnız mesaj dizgisiyle aranmaz.
  assert.ok(t.some((x) => x.kod === "geçersiz-enum" && x.mesaj.includes("PARLAK")), `geçersiz enum yakalanmalı: ${JSON.stringify(t)}`);
});

test("kanıt içindeki tırnak/satır-kırığı güvenli dizgiye iner (parça bozulmaz)", () => {
  const parca = kosumYaz(sonucYap({ gerekçe: { ne: 'çift "tırnaklı"\nözet', kanıt: "a.ts:1" } }));
  assert.ok(parca.includes(`ne: "ŞEF koşusu: çift 'tırnaklı' · özet"`), parca);
  ayristir(belirtecle(`Blok( kod: B, ne: "x", ${parca} )`));   // ayrışıyor — fırlatmıyor
});

// ── ⛔ bloklu durum (STR-4 · D1) ────────────────────────────────────────────
test("bloklu geçerli durum: geçersiz-durum ÜRETMEZ + bloklu-çapa rozeti düşer", () => {
  const t = dnt(`Blok( kod: BLK-T, ne: "t" ) { Katman( kod: FZ-T, ad: "f" ) { AltKatman( kod: KT-T, ad: "k" ) {
    Adım( kod: A01, ne: "takılan iş", durum: bloklu )
  } } }`);
  assert.ok(!t.some((x) => x.kod === "geçersiz-durum"), "bloklu artık geçerli enum değeri");
  const capa = t.filter((x) => x.kod === "bloklu-çapa");
  assert.equal(capa.length, 1);
  // MDR-A02: iç-jargon (BLOCKED) mesajdan açıldı — test, tanı koduna + kararlı anahtar söze bağlanır (MDR-A04 ruhu).
  assert.ok(capa[0].mesaj.includes("bloklu mühürledi"));
});

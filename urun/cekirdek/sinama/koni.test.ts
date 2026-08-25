import { test } from "node:test";
import assert from "node:assert/strict";
import { belirtecle } from "../src/belirtec.ts";
import { ayristir } from "../src/ayristirici.ts";
import { koniCikar, koniAlani, KONI_ALANLARI } from "../src/koni.ts";
import type { Dugum } from "../src/sozdizim.ts";

/** Bir .sar parçasını parse edip Katman içindeki ilk Adım düğümünü döndürür. */
function adim(sar: string): Dugum {
  const prog = ayristir(belirtecle(sar));
  return prog.bildirimler[0].cocuklar[0];
}

test("koniCikar — parametre-stili koniyi çıkarır (bağımlı kenarı doğrudan)", () => {
  const n = adim('Katman( kod: K ){ Adım( kod: A1, görev: "yap", kabul: [ "olur" ], bağımlı: [ B1 ], sınır: "sadece" ) }');
  const k = koniCikar(n);
  assert.equal(k.görev, "yap");
  assert.match(k.kabul, /olur/);
  assert.match(k.bağımlı, /B1/);               // bağımlı kenarı doğrudan koni alanı (A09/C5 hizası)
  assert.equal(k.sınır, "sadece");
  assert.equal(k.referans, "<!-- TODO -->");   // yok → TODO
  assert.equal(k.dokunulmaz, "<!-- TODO -->");
});

test("koniCikar — gövde-özelliği stili koniyi çıkarır (ozellikler · alanBul düzeltmesi)", () => {
  const n = adim('Katman( kod: K ){ Adım( kod: A2 ) { görev: "gövde-yap" referans: [ R1 ] } }');
  const k = koniCikar(n);
  assert.equal(k.görev, "gövde-yap");          // gövdeden okundu
  assert.match(k.referans, /R1/);
});

test("koniAlani — tekil alan + eksikte TODO", () => {
  const n = adim('Katman( kod: K ){ Adım( kod: A3, görev: "x" ) }');
  assert.equal(koniAlani(n, "görev"), "x");
  assert.equal(koniAlani(n, "kabul"), "<!-- TODO -->");
});

test("KONI_ALANLARI — 6 alan, SNF-0 sırası", () => {
  assert.deepEqual([...KONI_ALANLARI], ["görev", "referans", "kabul", "dokunulmaz", "bağımlı", "sınır"]);   // A09/C5: yasak alan adı koniden çıktı (ORK-1.2)
});

// ── NTK-A04 (MIM-1.6): niyet alanlarına madde desteği ────────────────────────
test("maddeli niyet — liste yazılan görev/sınır/kabul her öğesi madde işaretiyle çıkar", () => {
  const n = adim(
    'Katman( kod: K ){ Adım( kod: A5, görev: [ "birinci iş", "ikinci iş" ], ' +
    'kabul: [ "ölçüt bir", "ölçüt iki" ], sınır: [ "şunu yapma", "bunu da" ] ) }');
  const k = koniCikar(n);
  assert.equal(k.görev, "- birinci iş\n- ikinci iş");
  assert.equal(k.kabul, "- ölçüt bir\n- ölçüt iki");
  assert.equal(k.sınır, "- şunu yapma\n- bunu da");
});

test("maddeli niyet — geriye uyumluluk: tekil dizgi görev/sınır DEĞİŞMEDEN çıkar", () => {
  const n = adim('Katman( kod: K ){ Adım( kod: A6, görev: "tek cümle iş", sınır: "tek cümle sınır" ) }');
  const k = koniCikar(n);
  assert.equal(k.görev, "tek cümle iş");
  assert.equal(k.sınır, "tek cümle sınır");
});

// ── NTK-A07 (STR-4): Adım-özgü rapor/yama kayıtları ────────────────────────
test("rapor/yama — tekil kayıt koşu deseninde okunur; liste kayıtlar maddeleşir", () => {
  const n1 = adim('Katman( kod: K ){ Adım( kod: R1, rapor: "2026-07-18 · bulgu kaydı", yama: "2026-07-18 · düzeltme kaydı" ) }');
  assert.equal(koniAlani(n1, "rapor"), "2026-07-18 · bulgu kaydı");
  assert.equal(koniAlani(n1, "yama"), "2026-07-18 · düzeltme kaydı");
  const n2 = adim('Katman( kod: K ){ Adım( kod: R2, rapor: [ "2026-07-17 · ilk bulgu", "2026-07-18 · ikinci bulgu" ] ) }');
  assert.equal(koniAlani(n2, "rapor"), "- 2026-07-17 · ilk bulgu\n- 2026-07-18 · ikinci bulgu");
});

test("rapor/yama — yokken TODO döner; KONI_ALANLARI 6'da kalır (şema-dışı kayıt alanı)", () => {
  const n = adim('Katman( kod: K ){ Adım( kod: R3, görev: "x" ) }');
  assert.equal(koniAlani(n, "rapor"), "<!-- TODO -->");
  assert.ok(!([...KONI_ALANLARI] as string[]).includes("rapor"), "rapor .md koni başlığı DEĞİL");
});

test("maddeli niyet — KOD listeleri (bağımlı·referans·üretir) satır-içi kalır, maddeleşmez", () => {
  const n = adim('Katman( kod: K ){ Adım( kod: A7, bağımlı: [ B1, B2 ], referans: [ R1, R2 ], üretir: [ U1, U2 ] ) }');
  const k = koniCikar(n);
  assert.equal(k.bağımlı, "B1, B2");
  assert.equal(k.referans, "R1, R2");
  assert.equal(k.üretir, "U1, U2");
});

// ── #11 (Sol kazısı): runtime konisi ŞEMA-DIŞI `üretir`i EK taşır (ŞEF prompt'u) ──
test("koniCikar — üretir'i (KENAR) runtime konisine taşır; yoksa TODO (KONI_ALANLARI 6'da kalır)", () => {
  const n1 = adim('Katman( kod: K ){ Adım( kod: A3, görev: "yaz", üretir: KOD-X ) }');
  assert.match(koniCikar(n1).üretir, /KOD-X/);          // üretir runtime konisinde
  const n2 = adim('Katman( kod: K ){ Adım( kod: A4, görev: "yaz" ) }');
  assert.equal(koniCikar(n2).üretir, "<!-- TODO -->");  // yoksa TODO
  assert.ok(!([...KONI_ALANLARI] as string[]).includes("üretir"), "üretir şema/.md alanı DEĞİL (KONI_ALANLARI 6)");
});

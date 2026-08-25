// gizli-bagimlilik.test.ts — 🕵️ ORK-1.2 gizli-bağımlılık kapısı: prose'da KOD saklanamaz.
// MDR-A04 bağ sınıflandırması: bu dosyadaki mesaj-metnine dokunan assert'ler ya kod-çıpalı ikincil kontroldür ya da bilinçli metin sözleşmesidir (nöbet); çıpasız tanı araması yasaktır. Tam döküm: nitelik/motor_tani_envanteri.sar (MDR-A04 bölümü).
//   Motor yalnız kenar takip eder; prose'da çözülür KOD = DAG'ın göremediği bağ = hata.

import { test } from "node:test";
import assert from "node:assert/strict";
import { belirtecle } from "../src/belirtec.ts";
import { ayristir } from "../src/ayristirici.ts";
import type { Program } from "../src/sozdizim.ts";
import { kodIndeksle, gizliBagimlilikTanilari } from "../src/denetci.ts";

function tanila(kaynak: string, muaflar?: Set<string>) {
  const programlar = new Map<string, Program>([["t.sar", ayristir(belirtecle(kaynak))]]);
  return gizliBagimlilikTanilari(programlar, kodIndeksle(programlar), muaflar);
}
const sar = (govde: string) =>
  `Blok( kod: BLK, ne: "x" ) { Katman( kod: FZ, ad: "f" ) { AltKatman( kod: KT, ad: "k" ) {\n${govde}\n} } }`;

test("③ prose 'bağımlılık' içinde ÇÖZÜLÜR KOD → gizli-bağımlılık HATASI", () => {
  const t = tanila(sar(`
    Adım( kod: ADM-TEMEL, ne: "temel" )
    Adım( kod: ADM-UST, ne: "üst", bağımlılık: "ADM-TEMEL bitmeli + biraz anlatı" )`));
  assert.equal(t.length, 1);
  assert.equal(t[0].tani.kod, "gizli-bağımlılık");
  assert.equal(t[0].tani.duzey, "hata");
  assert.ok(t[0].tani.mesaj.includes("ADM-TEMEL"));
});

test("④ KOD'suz prose bağımlılık da YASAK — motor 'KOD'u ne?' diye sorar (Founder hükmü)", () => {
  const t = tanila(sar(`Adım( kod: ADM-X, ne: "x", bağımlılık: "mevcut ayrıştırıcı düğüm ağacı — yeni parse yok" )`));
  assert.equal(t.length, 1);
  assert.equal(t[0].tani.kod, "bağımlılık-mekanik");
  assert.ok(t[0].tani.mesaj.includes("kodu ne"));
});

test("düğüm-olmayan kısaltma (RAY-3) gizli-KOD sayılmaz ama alan yine yasak", () => {
  const t = tanila(sar(`Adım( kod: ADM-X, ne: "x", bağımlılık: "RAY-3 önkoşuluyla çakışmasın — anlatı" )`));
  assert.equal(t.length, 1);
  assert.equal(t[0].tani.kod, "bağımlılık-mekanik");   // gizli-bağımlılık DEĞİL — indeks süzer
});

test("⑤ kapsayıcı-kenar: Blok/Faz/Katman'da bağımlı beyanı HATA (kenar yalnız Adım'da)", () => {
  const t = tanila(`Blok( kod: BLK-A, ne: "a" )
Blok( kod: BLK-B, ne: "b", bağımlı: [ BLK-A ] ) { Katman( kod: FZ-B, ad: "f", besler: BLK-A ) { AltKatman( kod: KT-B, ad: "k" ) { Adım( kod: ADM-B, ne: "adım" ) } } }`);
  const kapsayici = t.filter((x) => x.tani.kod === "kapsayıcı-kenar");
  assert.equal(kapsayici.length, 2);   // Blok bağımlı + Faz besler
});

test("MIM-1.4 muafiyeti: Katman bağımlı: [TAKIM] eksen bağıdır — serbest; Takım-dışı hedef yine HATA", () => {
  // Yalnız Takım/Teknoloji hedefli Katman-bağı serbest (katmansız-teknoloji bekçisinin beklediği beyan)
  const serbest = tanila(`Teknoloji( kod: TEK-K91G, ne: "çerçeve" )
Takım( kod: TAKIM-K91G, ne: "önyüz", bağımlı: [ TEK-K91G ] )
Blok( kod: BLK-K91G, ne: "iş" ) { Katman( kod: KT-K91G, ad: "önyüz", bağımlı: [ TAKIM-K91G ] ) { Adım( kod: ADM-K91G, ne: "a" ) } }`);
  assert.equal(serbest.filter((x) => x.tani.kod === "kapsayıcı-kenar").length, 0);
  // Hedef Takım/Teknoloji DEĞİLSE (ör. başka Blok) kapsayıcı-kenar hâlâ hata
  const hatali = tanila(`Blok( kod: BLK-K91A, ne: "a" )
Blok( kod: BLK-K91B, ne: "b" ) { Katman( kod: KT-K91B, ad: "k", bağımlı: [ BLK-K91A ] ) { Adım( kod: ADM-K91B, ne: "b" ) } }`);
  assert.equal(hatali.filter((x) => x.tani.kod === "kapsayıcı-kenar").length, 1);
});

test("hedef kapsayıcı OLABİLİR: Adım bağımlı: [BLOK] serbest (motor yapraklara genişletir)", () => {
  const t = tanila(`Blok( kod: BLK-A, ne: "a" ) { Katman( kod: FZ-A, ad: "f" ) { AltKatman( kod: KT-A, ad: "k" ) { Adım( kod: ADM-A1, ne: "a1" ) } } }
Blok( kod: BLK-B, ne: "b" ) { Katman( kod: FZ-B, ad: "f" ) { AltKatman( kod: KT-B, ad: "k" ) { Adım( kod: ADM-B1, ne: "b1", bağımlı: [ BLK-A ] ) } } }`);
  assert.equal(t.length, 0);
});

test("besler: \"metin\" de kenar-metin HATASI (① besler açığı kapandı)", () => {
  const t = tanila(sar(`Adım( kod: ADM-X, ne: "x", besler: "sonraki bir şeyler" )`));
  assert.equal(t.length, 1);
  assert.equal(t[0].tani.kod, "kenar-metin");
});

test("① bağımlı: \"metin\" → kenar-metin HATASI (kenar KOD ister)", () => {
  const t = tanila(sar(`Adım( kod: ADM-X, ne: "x", bağımlı: "bir şeyler işte" )`));
  assert.equal(t.length, 1);
  assert.equal(t[0].tani.kod, "kenar-metin");
});

test("② bağımlılık: [KOD] listesi → yanlış-alan HATASI (kenarın adı bağımlı)", () => {
  const t = tanila(sar(`
    Adım( kod: ADM-A, ne: "a" )
    Adım( kod: ADM-B, ne: "b", bağımlılık: [ ADM-A ] )`));
  assert.equal(t.length, 1);
  assert.equal(t[0].tani.kod, "yanlış-alan");
});

test("muaf (bilerek-hatalı) dosya atlanır", () => {
  const t = tanila(
    sar(`
    Adım( kod: ADM-A, ne: "a" )
    Adım( kod: ADM-B, ne: "b", bağımlılık: "ADM-A sonrası" )`),
    new Set(["t.sar"]),
  );
  assert.equal(t.length, 0);
});

test("doğru kenar (bağımlı: [KOD]) tanı ÜRETMEZ — motorun istediği biçim", () => {
  const t = tanila(sar(`
    Adım( kod: ADM-A, ne: "a" )
    Adım( kod: ADM-B, ne: "b", bağımlı: [ ADM-A ] )`));
  assert.equal(t.length, 0);
});

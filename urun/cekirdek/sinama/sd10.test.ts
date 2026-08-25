// TIP-1 anlık tip motoru: "tanımsız yasak değil, İLANSIZ yasak" (2026-07-02).
import { test } from "node:test";
import assert from "node:assert/strict";
import { belirtecle } from "../src/belirtec.ts";
import { ayristir } from "../src/ayristirici.ts";
import { dogrula } from "../src/dogrulayici.ts";
import { siniflamaYukle } from "../src/siniflama.ts";
import { YENI_TANI_KODLARI } from "../src/tani-sicili.ts";

const SNF = siniflamaYukle(new URL("../../../oz/siniflama/kayit.json", import.meta.url).pathname);
const tanila = (k: string) => dogrula(ayristir(belirtecle(k)), SNF);

test("ilanlı anlık tip geçerli — kullanım ilandan ÖNCE bile olsa", () => {
  const t = tanila('Rozet( kod: R1, etiket: "L4" )\nTip Rozet( aile: yuzey ) { ne: "durum hapı" }');
  assert.equal(t.filter((x) => x.kod === "bilinmeyen-tip").length, 0);
});

test("typo hâlâ hata — drift kalkanı tam güçte (ilansız yasak)", () => {
  const t = tanila("Ekrann( kod: E1 )");
  assert.equal(t.filter((x) => x.kod === "bilinmeyen-tip").length, 1);
  assert.match(t[0].oneri ?? "", /Ekran/);
});

test("ilanlı tip yerleşik düzen içine serbest yerleşir (v1)", () => {
  // Yeni kanonun görünürlük beyanı gözlem kademesindedir; bu nöbet sarma hükmünü ölçer.
  const t = tanila('Tip Rozet( aile: yuzey ) { ne: "hap" }\nKart( kod: K1 ) { Rozet( kod: R1 ) }')
    .filter((x) => !YENI_TANI_KODLARI.includes(x.kod));
  assert.equal(t.length, 0);
});

test("içerir SARMAYI TANIMLAR: liste dışı çocuk → izinsiz-sarma", () => {
  const t = tanila('Tip Panel( aile: yuzey, içerir: [ Metin ] ) { ne: "panel" }\nPanel( kod: P1 ) { Düğme( kod: D1 ) }');
  const s = t.filter((x) => x.kod === "izinsiz-sarma");
  assert.equal(s.length, 1);   // Düğme ayrıca öksüz-düğme de verir; izinsiz-sarma'yı ADLA bul (sıra varsayma)
  assert.match(s[0].mesaj, /İlan edilen çocuklar: Metin/);
});

test("içerir'siz anlık tip = yaprak: çocuk sarınca hata + içerir önerisi", () => {
  const t = tanila('Tip Rozet( aile: yuzey ) { ne: "hap" }\nRozet( kod: R1 ) { Metin( kod: M1 ) }');
  const s = t.filter((x) => x.kod === "izinsiz-sarma");
  assert.equal(s.length, 1);
  assert.match(s[0].mesaj, /içerir/);
});

test("ne: tarifi yoksa uyarı — çevirmen ajan çeviremez (FEL-1 şartı)", () => {
  const t = tanila("Tip Rozet( aile: yuzey )");
  assert.equal(t.filter((x) => x.kod === "tarif-eksik").length, 1);
});

test("bilinmeyen aile → aile-geçersiz uyarısı (geçerli aile listesiyle)", () => {
  const t = tanila('Tip Rozet( aile: yüzeyy ) { ne: "hap" }');
  const u = t.filter((x) => x.kod === "aile-geçersiz");
  assert.equal(u.length, 1);
  assert.match(u[0].oneri ?? "", /yuzey/);
});

test("iç içe ilan da tanınır (gövde içindeki Tip)", () => {
  const t = tanila('Ekran( kod: E1 ) { Tip Vitrin( aile: yuzey ) { ne: "raf" }\nVitrin( kod: V1 ) }');
  assert.equal(t.filter((x) => x.kod === "bilinmeyen-tip").length, 0);
});

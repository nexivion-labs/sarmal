// ═══════════════════════════════════════════════════════════════════════════
// bicimle-deger-koruma.test.ts — çok satırlı düz dizginin değer koruma nöbeti
//                                (KPS-SIR-A05 · DIL-2.2)
//
//   Belirteç `"..."` düz dizgisini satır sonunda kesmez, kapanış tırnağına kadar
//   okur; devam satırlarının baştaki boşluğu da değerin parçasıdır. Biçimlendiricinin
//   satır tabanlı sözcükleyicisi bu durumu alt satıra taşımadığı sürece devam
//   satırı yapısal sanıldı: girintisi yeniden yazıldı (değer sessizce değişti),
//   içindeki { [ ( derinlik sayacını kaydırdı, iki-nokta hizalama ve satır
//   sığdırma geçişleri içeriği parametre sandı. Girinti gözlemi aynı durum
//   makinesini aynaladığı için içerik satırında sahte bulgu üretti ve sayacı
//   kayınca dosyanın geri kalanındaki gerçek sapmaları kaçırdı.
//
//   Nöbet şunları ölçer:
//   ① çok satırlı düz dizgi içeriği bayt-birebir korunur, sonraki yapı doğru girintilenir;
//   ② devam satırı iki-nokta hizalamaya ve satır sığdırmaya girmez;
//   ③ açık dizgiyle biten satırın sağ boşluğu değerin parçasıdır, kırpılmaz;
//   ④ dizgi içindeki `-->|` belge bloğu açmaz;
//   ⑤ kaçışlı tırnak ve satır sonu kaçışı dizgiyi erken kapatmaz;
//   ⑥ girinti gözlemi içerik satırında susar, sonraki gerçek sapmayı görür;
//   ⑦ deponun bütün ayrıştırılabilir .sar dosyalarında (sınama fikstürü dâhil)
//      değerler ve ağaç biçimlendirmeden önce ve sonra aynıdır, ikinci geçiş sabittir.
//
//   GEÇMİŞ ÖLÇÜMÜ (2026-09-29): açık deponun 277 işlemelik geçmişinde her işlemenin
//   değiştirdiği .sar dosyalarındaki çok satırlı düz dizgi değerleri, ebeveyn
//   işlemedeki değerlerle boşluk bakımından normalleştirilerek eşlendi; biçimlendiricinin
//   değer değiştirdiği olay sıfırdır. Bugünkü planda üç düz dizgi değeri (EKL-F6-A02,
//   EKL-F10-A09 ve EKL-F10-A10 Adımlarının `ne:` alanı) deponun doğumundan önceki
//   çalışma geçmişinde tek satırdan iki satıra bölünmüş, satır sonu boşluğu kırpılmış
//   ve devam satırının girintisi biçimlendirici tarafından yeniden yazılmış hâliyle
//   taşınır; bu nöbet onları bugünkü baytlarıyla korur, geri getirilmeleri ayrı karardır.
//
//   MUTASYON KANITI (2026-09-29 · `cp` yedeğiyle geri alındı, `cmp` ile doğrulandı):
//     M1 düz dizgi durumu alt satıra taşınmaz (eski davranış)  → ①②③④⑤⑥ ve ⑦'de 1 dosya kırmızı
//     M2 dizgi içinde başlayan satır korunmaz                  → ①②③④⑤ ve ⑦'de 1 dosya kırmızı
//     M3 iki-nokta hizalama koruma işaretini okumaz            → ② ve ⑦'de 4 dosya kırmızı
//     M4 satır sığdırma koruma işaretini okumaz                → ② ve ⑦'de 4 dosya kırmızı
//     M5 açık dizgiyle biten satır yine sağdan kırpılır        → ③ kırmızı
//     M6 belge açılışı yeniden ham satırda aranır              → ④ kırmızı
//     M7 girinti gözleminde "dizgi içinde başlamaz" şartı kalkar → ⑥ kırmızı
// ═══════════════════════════════════════════════════════════════════════════

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { belirtecle } from "../src/belirtec.ts";
import { ayristir } from "../src/ayristirici.ts";
import { agaciYaz } from "../src/yazdir.ts";
import { bicimle, girintiYapiFarklari } from "../src/bicimle.ts";

/** Kaynağın ayrıştırılmış değerleri: bütün dizgi ve belge belirteçleri sırasıyla. */
const degerler = (kaynak: string): string[] =>
  belirtecle(kaynak).filter((b) => b.tur === "metin" || b.tur === "belge").map((b) => b.deger);
const agac = (kaynak: string): string => agaciYaz(ayristir(belirtecle(kaynak)));

/** Değer, ağaç ve ikinci geçiş üçlüsü; her birim sınaması bununla kapanır. */
function korunur(kaynak: string): string {
  const bir = bicimle(kaynak, "\n");
  assert.deepEqual(degerler(bir), degerler(kaynak), `değer değişti:\n${bir}`);
  assert.equal(agac(bir), agac(kaynak));
  assert.equal(bicimle(bir, "\n"), bir, "ikinci geçiş sabit değil");
  return bir;
}

test("① çok satırlı düz dizgi içeriği bayt-birebir korunur, sonraki yapı doğru girintilenir", () => {
  const kaynak = [
    "Blok( kod: BLK-A ) {",
    "  Adım( kod: ADM-A, ne: \"birinci satır",
    "        ikinci satır",
    "  { içerikteki süslü ayraç yapı değildir [ (",
    "\" )",
    "      Adım( kod: ADM-B )",
    "}",
  ].join("\n");
  const bir = korunur(kaynak);
  assert.deepEqual(bir.split("\n"), [
    "Blok( kod: BLK-A ) {",
    "  Adım( kod: ADM-A, ne: \"birinci satır",
    "        ikinci satır",
    "  { içerikteki süslü ayraç yapı değildir [ (",
    "\" )",
    "  Adım( kod: ADM-B )",
    "}",
  ]);
});

test("② devam satırı iki-nokta hizalamaya ve satır sığdırmaya girmez", () => {
  const uzun = "  Ad( birinci: 1, ikinci: 2, üçüncü: 3, dördüncü: 4, beşinci: 5, altıncı: 6, yedinci: 7, sekizinci: 8 )";
  assert.ok(uzun.length > 100, "fikstür satır sığdırma sınırını aşmalı");
  const kaynak = [
    "Adım( kod: ADM-C,",
    "  ne: \"açılış",
    "anahtar:    değer biçiminde içerik",
    "b: kısa anahtar aynı sütunda",
    uzun,
    "\",",
    "  ad: \"x\" )",
  ].join("\n");
  const bir = korunur(kaynak);
  assert.ok(bir.includes("\nanahtar:    değer biçiminde içerik\nb: kısa anahtar aynı sütunda\n"), `hizalama içeriğe dokundu:\n${bir}`);
  assert.ok(bir.includes("\n" + uzun + "\n"), `sığdırma içeriği böldü:\n${bir}`);
});

test("③ açık dizgiyle biten satırın sağ boşluğu değerin parçasıdır, kırpılmaz", () => {
  const kaynak = "Adım( kod: ADM-D, ne: \"sonunda iki boşluk var  \n  devam\" )";
  const bir = korunur(kaynak);
  assert.ok(bir.includes("var  \n"), `sağ boşluk kırpıldı:\n${JSON.stringify(bir)}`);
});

test("④ dizgi içindeki `-->|` belge bloğu açmaz", () => {
  const kaynak = [
    "Blok( kod: BLK-E ) {",
    "  Adım( kod: ADM-E, ne: \"ok -->| belge değildir",
    "    devam\" )",
    "      Adım( kod: ADM-F )",
    "}",
  ].join("\n");
  const bir = korunur(kaynak);
  assert.ok(bir.includes("\n  Adım( kod: ADM-F )\n"), `belge sanıldı, sonraki yapı girintilenmedi:\n${bir}`);
});

test("⑤ kaçışlı tırnak ve satır sonu kaçışı dizgiyi erken kapatmaz", () => {
  const kaynak = [
    "Blok( kod: BLK-G ) {",
    "  Adım( kod: ADM-G, ne: \"içte \\\" kaçışlı tırnak",
    "      { süslü \\",
    "   devam\" )",
    "      Adım( kod: ADM-H )",
    "}",
  ].join("\n");
  const bir = korunur(kaynak);
  assert.ok(bir.includes("\n      { süslü \\\n   devam\" )\n  Adım( kod: ADM-H )\n"), `kaçış dizgiyi kapattı:\n${bir}`);
});

test("⑥ girinti gözlemi içerik satırında susar, sonraki gerçek sapmayı görür", () => {
  const kaynak = [
    "Faz( kod: FAZ-I, ad: \"f\" ) {",
    "  Blok( kod: BLK-I, ad: \"b\" ) {",
    "    görev: \"gövde alanında açılan dizgi",
    "serbest sütunda içerik",
    "      Katman( içerik satırı yapı gibi görünür {",
    "    \"",
    "  Katman( kod: KAT-I, ad: \"k\" ) {",
    "    }",
    "  }",
    "}",
  ].join("\n");
  ayristir(belirtecle(kaynak));
  // Yalnız 7. satır sapar: Blok gövdesinde dört boşluk beklenir, iki yazılmıştır.
  assert.deepEqual(girintiYapiFarklari(kaynak).map((f) => `${f.satir}:${f.beklenen}:${f.bulunan}`), ["7:4:2"]);
  assert.deepEqual(girintiYapiFarklari(bicimle(kaynak, "\n")), []);
});

// ── ⑦ depo korpusu ──────────────────────────────────────────────────────────
// Deponun kökünden bütün .sar dosyaları yürünür; nokta ile başlayan klasörler
// (depo içi çalışma ağaçları dâhil) ve node_modules atlanır. Ayrıştırılamayan
// dosyalar yalnız doğuş şablonlarıdır (yer tutucu taşırlar); başka bir dosya
// ayrıştırılamazsa nöbet kırmızı yanar, çünkü sessizce ölçülmemiş olur.
const KOK = fileURLToPath(new URL("../../../", import.meta.url));
function sarYuru(dizin: string, cikti: string[]): string[] {
  for (const g of readdirSync(dizin, { withFileTypes: true })) {
    if (g.name.startsWith(".") || g.name === "node_modules") continue;
    const yol = dizin + g.name;
    if (g.isDirectory()) sarYuru(yol + "/", cikti);
    else if (g.name.endsWith(".sar")) cikti.push(yol);
  }
  return cikti;
}
const DOSYALAR = sarYuru(KOK, []).sort();
/** Yer tutucu taşıyan, bu yüzden ayrıştırılamayan doğuş şablonları (adıyla, kalıpla değil). */
const SABLON_MUAF = new Set([
  "ogreti/sablon/dogus/1_dogus.sar",
  "ogreti/sablon/dogus/anadizin.sar",
  "ogreti/sablon/dogus/calisma_alani_anadizin.sar",
  "ogreti/sablon/dogus/durum_devir.sar",
]);

// BKM-DNT-A10 deseni: korpus diskten dolduğu için alt sınırı ölçülmezse raf
// boşaldığında nöbet sessizce az dosya ölçer. Bugün yüz kırk sekiz dosya
// ayrıştırılır (dört doğuş şablonu hariç).
const KORPUS_ALT_SINIRI = 148;

test(`⑦ korpus: en az ${KORPUS_ALT_SINIRI} .sar dosyası ölçülür ve sınama fikstürü içindedir`, () => {
  const olculen = DOSYALAR.filter((d) => !SABLON_MUAF.has(d.slice(KOK.length)));
  assert.ok(olculen.length >= KORPUS_ALT_SINIRI, `korpus ${olculen.length} dosyaya düştü`);
  assert.ok(DOSYALAR.some((d) => d.endsWith("urun/cekirdek/sinama/fikstur/ornek_proje.sar")));
});

for (const yol of DOSYALAR) {
  const ad = yol.slice(KOK.length);
  if (SABLON_MUAF.has(ad)) continue;
  test(`⑦ değer koruma: ${ad}`, () => {
    korunur(readFileSync(yol, "utf8"));
  });
}

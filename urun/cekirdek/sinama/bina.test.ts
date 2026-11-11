// ═══════════════════════════════════════════════════════════════════════════
// bina.test.ts — 🏢 ÇALIŞMA ALANININ KATLARI VE LOGOSU NÖBETİ (PNL-A31)
//
//   Kat okumasının ve logo güvenlik kararının saf çekirdeğini (bina.ts) ölçer.
//   Kabul ölçütü: kök dışına çıkan, SVG olmayan ya da betik taşıyan bir logo
//   gösterilmez ve tanı alır. Tanının kendisi yeni-kanon-tanilari.test.ts
//   nöbetinde, gösterilmeme kararı burada ölçülür. Fikstür adları uydurmadır.
// ═══════════════════════════════════════════════════════════════════════════
import { test } from "node:test";
import assert from "node:assert/strict";
import { binaOku, binalariBul, katBul, logoCoz, svgSuzgeci, logoVeriAdresi, LOGO_EN_BUYUK, projeProfili } from "../src/bina.ts";
import { ayristir } from "../src/ayristirici.ts";
import { belirtecle } from "../src/belirtec.ts";

const p = (s: string) => ayristir(belirtecle(s));
const BINA = `ÇalışmaAlanı( kod: CAL-ORNEK, ad: "Örnek Atölye", logo: "oz/logo.svg" ) {
  Kitaplık( kod: KTP-YONETIM, yol: "yonetim/", ne: "Yönetim — kurallar", kat: 1 )
  Kitaplık( kod: KTP-OFISLER, yol: "ofisler/", ne: "Ofisler", kat: 2 ) {
    Kitaplık( kod: KTP-OFIS-A, yol: "a/", ne: "A ofisi" )
  }
  Kitaplık( kod: KTP-DEPO, yol: "depo/", ne: "Depo" )
}
`;

test("bina okuması: etkin kat atadan devralınır, katsız Kitaplık katsız kalır, katlar artan sırada", () => {
  const b = binaOku(p(BINA), "/ev/w_anadizin.sar")!;
  assert.equal(b.ad, "Örnek Atölye");
  assert.equal(b.kokDizin, "/ev");
  assert.deepEqual(b.katlar, [1, 2]);
  assert.deepEqual(b.kitapliklar.map((k) => [k.kod, k.dizin, k.kat ?? null, k.sira]), [
    ["KTP-YONETIM", "/ev/yonetim", 1, 0], ["KTP-OFISLER", "/ev/ofisler", 2, 1],
    ["KTP-OFIS-A", "/ev/ofisler/a", 2, 2], ["KTP-DEPO", "/ev/depo", null, 3],
  ]);
  assert.equal(b.kitapliklar[0]!.ad, "Yönetim");
  assert.equal(katBul(b, "/ev/ofisler/a/proje/x.sar").kat, 2);
  assert.equal(katBul(b, "/ev/ofisler/a/proje/x.sar").kitaplik?.kod, "KTP-OFIS-A");
  assert.equal(katBul(b, "/ev/depo/y.sar").kat, undefined);
  assert.equal(katBul(b, "/ev/yonetim-eski/z.sar").kitaplik, undefined, "ad benzerliği kapsama sayılmaz");
  assert.deepEqual(binalariBul([["/ev/w_anadizin.sar", p(BINA)], ["/ev/p.sar", p('Proje( kod: PRJ-X, rejim: esnek )')]]).map((x) => x.kod), ["CAL-ORNEK"]);
  // Kat alanı hiç yazılmamış binanın katı yoktur; panel bugünkü görünümü korur.
  assert.deepEqual(binaOku(p('ÇalışmaAlanı( kod: CAL-D ) { Kitaplık( kod: KTP-A, yol: "a/", ne: "a" ) }'), "/d/d_anadizin.sar")!.katlar, []);
});

test("kat kusurları: iç içe kat ve pozitif olmayan kat ayrı ayrı bildirilir", () => {
  const k: Parameters<typeof binaOku>[2] = [];
  binaOku(p(`ÇalışmaAlanı( kod: CAL-K ) {
  Kitaplık( kod: KTP-A, yol: "a/", ne: "a", kat: 1 ) { Kitaplık( kod: KTP-B, yol: "b/", ne: "b", kat: 2 ) }
  Kitaplık( kod: KTP-C, yol: "c/", ne: "c", kat: 0 )
}`), "/k/k_anadizin.sar", k);
  assert.deepEqual(k!.map((x) => [x.kimlik, x.neden, x.ust ?? null]), [["KTP-B", "iç-içe", "KTP-A"], ["KTP-C", "pozitif-değil", null]]);
});

test("SVG süzgeci: betik, olay niteliği, javascript adresi, foreignObject ve dış kaynak reddedilir", () => {
  assert.equal(svgSuzgeci('<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/><use href="#a"/></svg>'), undefined);
  assert.equal(svgSuzgeci('<?xml version="1.0"?>\n<!-- yorum --><svg><circle r="1" fill="url(#g)"/></svg>'), undefined);
  assert.equal(svgSuzgeci("<svg><script>alert(1)</script></svg>"), "betik");
  assert.equal(svgSuzgeci('<svg onload="x()"></svg>'), "betik");
  assert.equal(svgSuzgeci('<svg><a href="javascript:x()"/></svg>'), "betik");
  assert.equal(svgSuzgeci("<svg><foreignObject><div/></foreignObject></svg>"), "betik");
  assert.equal(svgSuzgeci('<svg><image href="https://ornek.example/a.png"/></svg>'), "dış-kaynak");
  assert.equal(svgSuzgeci('<svg><rect fill="url(https://ornek.example/x)"/></svg>'), "dış-kaynak");
  assert.equal(svgSuzgeci('<svg><style>@import "x.css";</style></svg>'), "dış-kaynak");
  assert.equal(svgSuzgeci('<!DOCTYPE svg [<!ENTITY x "y">]><svg/>'), "svg-değil");
  assert.equal(svgSuzgeci('<?xml version="1.0"?><!DOCTYPE svg><svg></svg>'), "svg-değil");
  assert.equal(svgSuzgeci("<html><body/></html>"), "svg-değil");
  assert.equal(svgSuzgeci(`<svg>${" ".repeat(LOGO_EN_BUYUK)}</svg>`), "büyük");
});

test("logo çözümü: kök dışı, SVG olmayan, olmayan ve betikli logo gösterilmez; geçerli logo veri adresine çevrilir", () => {
  const disk = new Map([
    ["/ev/oz/logo.svg", '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0h1"/></svg>'],
    ["/ev/oz/kotu.svg", "<svg><script>x()</script></svg>"],
    ["/ev/oz/logo.png", "png"],
    ["/ev/oz/bag.svg", "<svg/>"],
  ]);
  const oku = (y: string) => disk.get(y);
  const gercek = (y: string) => (y === "/ev/oz/bag.svg" ? "/baska/bag.svg" : y);
  const ozet = (yol: string) => { const s = logoCoz("/ev", yol, oku, gercek); return s.tur === "svg" ? "svg" : s.neden; };
  assert.equal(ozet("oz/logo.svg"), "svg");
  assert.equal(ozet("./oz/../oz/logo.svg"), "svg");
  assert.equal(ozet("../disari.svg"), "kök-dışı");
  assert.equal(ozet("oz/../../ev/oz/logo.svg"), "svg", "kökün içine dönen yol kökün içindedir");
  assert.equal(ozet("/ev/oz/logo.svg"), "kök-dışı", "mutlak yol kabul edilmez");
  assert.equal(ozet("oz/bag.svg"), "kök-dışı", "kökün dışına giden sembolik bağ kabul edilmez");
  assert.equal(ozet("oz/logo.png"), "svg-değil");
  assert.equal(ozet("oz/yok.svg"), "yok");
  assert.equal(ozet("oz/kotu.svg"), "betik");
  assert.equal(ozet(""), "boş");
  const s = logoCoz("/ev", "oz/logo.svg", oku);
  assert.ok(s.tur === "svg" && logoVeriAdresi(s.svg).startsWith("data:image/svg+xml;base64,"));
});

// 🪪 PNL-A31 (Founder onayı 2026-11-04 gecesi): müşteri satırının adı Profilden okunur. Adlar uydurmadır.
test("Profil okuması: Kitaplığın içindeki Profil ilana bağlanır, proje kökünün Profili bulunur, ilk kişinin hitabı okunur", () => {
  const b = binaOku(p(`ÇalışmaAlanı( kod: CAL-X, ad: "x" ) {
  Kitaplık( kod: KTP-M, yol: "m/", ne: "M" ) {
    Profil( kod: PFL-M, ad: "Örnek Ortaklık", ne: "n", sektör: "s", şehir: "ş",
      kişiler: [ { rol: "muhatap" }, { hitap: "Ayla Hanım", rol: "muhatap" }, { hitap: "Can Bey" } ] )
    Kitaplık( kod: KTP-M-A, yol: "a/", ne: "A" )
  }
  Kitaplık( kod: KTP-N, yol: "n/", ne: "N" )
}`), "/k/x_anadizin.sar")!;
  assert.deepEqual(b.kitapliklar.find((k) => k.kod === "KTP-M")?.profil, { kod: "PFL-M", ad: "Örnek Ortaklık", kisi: "Ayla Hanım" });
  assert.equal(b.kitapliklar.find((k) => k.kod === "KTP-M-A")?.profil, undefined, "Profil yalnız doğrudan sahibinin ilanına bağlanır");
  assert.equal(b.kitapliklar.find((k) => k.kod === "KTP-N")?.profil, undefined);
  assert.deepEqual(projeProfili(p(`Proje( kod: PRJ-X, ad: "x" ) {\n  Profil( kod: PFL-X, ad: "Örnek Fırın", ne: "n", sektör: "s", şehir: "ş" )\n}`)),
    { kod: "PFL-X", ad: "Örnek Fırın" }, "kişi yazılmamışsa yalnız ad okunur");
  assert.equal(projeProfili(p(`Proje( kod: PRJ-Y, ad: "y" )`)), undefined);
});

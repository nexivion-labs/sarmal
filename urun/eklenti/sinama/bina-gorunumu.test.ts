// ═══════════════════════════════════════════════════════════════════════════
// bina-gorunumu.test.ts — 🏢 ÇALIŞMA ALANININ KATLARI VE LOGOSU (PNL-A31)
//
//   Founder 2026-11-04: çok ofisli çalışma alanı panelde bir bina gibi görünür.
//   Ölçülenler:
//     ① Kat alanı taşıyan bir çalışma alanında yol haritası projeleri artan kat
//       sırasıyla kat bantlarında, Kitaplıkların ilan sırasıyla gösterir; katsız
//       Kitaplığın projesi bina dışı şeridindedir. Kat alanı hiç kullanılmamış
//       çalışma alanında görünüm bugünkü gibidir (bant yok, projeler alfabetik).
//     ② Tren şemasında birinci kat bandında kanon kutusu, apex koltuğu ve iş
//       akışı şeridi görünür; iş akışı ajanı ilan edilmemişse şerit "tanımlı değil"
//       yazan boş yuvalardan ibarettir; apex'in yönettiği ve bir İşAkışı düğümünü
//       yöneten ajan ilan edilince yuvası kendiliğinden dolar. Katsız şema değişmez.
//     ③ Logo yalnız kökün içindeki, betiksiz bir SVG ise veri adresiyle çizilir; kök
//       dışı, SVG olmayan ve betikli logo çizilmez.
//   Fikstürdeki bütün adlar uydurmadır.
// ═══════════════════════════════════════════════════════════════════════════

import "./dil-kur.ts";
import { Uri } from "./kabuk-kur.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { ayristir } from "../../cekirdek/src/ayristirici.ts";
import { belirtecle } from "../../cekirdek/src/belirtec.ts";
import type { Program } from "../../cekirdek/src/sozdizim.ts";
import { trenOzetiCikar } from "../src/tren-cekirdek.ts";
import { trenSemaHtml, IS_AKISI_YUVA_SAYISI } from "../src/tren-gorunum.ts";
import { binaBasligiHtml } from "../src/bina-gorunum.ts";
import { BINA_METINLERI } from "../src/yuzey-metinleri.ts";

const { YolHaritasi } = await import("../src/yolharitasi.ts");
const { binaBasligiKur } = await import("../src/panel.ts");
const kok = Uri.file(fileURLToPath(new URL("..", import.meta.url)));

const K = "/ornek-bina";
const katli = (katlar: boolean): Record<string, string> => ({
  [`${K}/bina_anadizin.sar`]: `ÇalışmaAlanı( kod: CAL-ORNEK, ad: "Örnek Atölye", logo: "oz/logo.svg" ) {
  Kitaplık( kod: KTP-YONETIM, yol: "yonetim/", ne: "Yönetim"${katlar ? ", kat: 1" : ""} )
  Kitaplık( kod: KTP-OFISLER, yol: "ofisler/", ne: "Ofisler"${katlar ? ", kat: 2" : ""} ) {
    Kitaplık( kod: KTP-OFIS-Z, yol: "z/", ne: "Zeta ofisi" )
    Kitaplık( kod: KTP-OFIS-A, yol: "a/", ne: "Alfa ofisi" )
  }
  Kitaplık( kod: KTP-KISISEL, yol: "kisisel/", ne: "Kişisel" )
}
`,
  [`${K}/yonetim/kurallar/kurallar_anadizin.sar`]: `Proje( kod: PRJ-KURALLAR, ad: "Kurallar", rejim: esnek )\n`,
  [`${K}/yonetim/kurallar/yasa.sar`]: `Kural ornekKural( kod: KRL-ORNEK-1, ne: "örnek kural" )\nKarar( kod: KRR-ORNEK-1, karar: "k", gerekçe: "g", durum: kilitli, ne: "örnek karar" )\n`,
  [`${K}/ofisler/z/zeta/zeta_anadizin.sar`]: `Proje( kod: PRJ-ZETA, ad: "Zeta", rejim: esnek )\n`,
  [`${K}/ofisler/a/alfa/alfa_anadizin.sar`]: `Proje( kod: PRJ-ALFA, ad: "Alfa", rejim: esnek )\n`,
  [`${K}/kisisel/defter/defter_anadizin.sar`]: `Proje( kod: PRJ-DEFTER, ad: "Defter", rejim: esnek )\n`,
});

function yolHaritasi(dosyalar: Record<string, string>) {
  const programlar = new Map<string, Program>(Object.entries(dosyalar).map(([y, m]) => [y, ayristir(belirtecle(m))]));
  const yol = new YolHaritasi();
  yol.eklentiKoku = kok as never;
  yol.yenile({ programlar, yollar: [...programlar.keys()], kirik: [], okunamayan: 0, dilDışı: [], tetik: "sinama", kapsam: undefined, belgeler: new Map(), sıra: 1 } as never);
  return yol;
}
type O = { tur: string; kod?: string; kat?: number | null; varliklar?: unknown[] };
const etiket = (yol: InstanceType<typeof YolHaritasi>, o: unknown): string => String(yol.getTreeItem(o as never).label);

test("① kat alanı taşıyan çalışma alanında projeler kat bantlarında, ilan sırasıyla; katsızlar bina dışında", () => {
  const yol = yolHaritasi(katli(true));
  const [cati] = yol.getChildren() as O[];
  assert.equal(cati!.kod, "CAL-ORNEK");
  const bantlar = (yol.getChildren(cati as never) as O[]).filter((c) => c.tur === "kat");
  assert.deepEqual(bantlar.map((b) => etiket(yol, b)), [BINA_METINLERI.katAdi(1), BINA_METINLERI.katAdi(2), BINA_METINLERI.binaDisi]);
  const projeler = bantlar.map((b) => (yol.getChildren(b as never) as O[]).map((v) => v.kod));
  // İkinci katta Zeta, Alfa'dan önce gelir: sıra alfabetik değil Kitaplıkların ilan sırasıdır.
  assert.deepEqual(projeler, [["PRJ-KURALLAR"], ["PRJ-ZETA", "PRJ-ALFA"], ["PRJ-DEFTER"]]);
  assert.ok(String(yol.getTreeItem(bantlar[0] as never).description).includes("Yönetim"));
  // Geri dönüş zinciri bandın içinden geçer: proje → bant → çalışma alanı.
  const zeta = (yol.getChildren(bantlar[1] as never) as O[])[0]!;
  assert.equal(yol.getParent(zeta as never), bantlar[1]);
  assert.equal(yol.getParent(bantlar[1] as never), cati);
  assert.equal(yol.varlikZinciriMi(bantlar[1]), true);
  assert.equal(yol.binaAl()?.ad, "Örnek Atölye");
});

test("① kat alanı hiç kullanılmamış çalışma alanının görünümü değişmez: bant yok, projeler alfabetik", () => {
  const yol = yolHaritasi(katli(false));
  const [cati] = yol.getChildren() as O[];
  const cocuklar = yol.getChildren(cati as never) as O[];
  assert.ok(cocuklar.every((c) => c.tur === "varlık"), "katsız binada bant düğümü doğmaz");
  assert.deepEqual(cocuklar.map((c) => c.kod), ["PRJ-ALFA", "PRJ-DEFTER", "PRJ-KURALLAR", "PRJ-ZETA"]);
  assert.equal(yol.binaAl(), undefined, "katsız binada tepede bina başlığı çizilmez");
});

// ── ② Tren şeması ────────────────────────────────────────────────────────────
const AJANLAR = (akis: boolean): Record<string, string> => ({
  ...katli(true),
  [`${K}/yonetim/kurallar/ajanlar.sar`]: `Etmen( kod: ETM-LIDER, ad: "lider", tür: apex, yetki: L4, bellek: paylaşık, ne: "lider", uygular: KRL-ORNEK-1,
  yönetir: [ ETM-OFIS${akis ? ", ETM-AKIS" : ""} ] )
${akis ? `Etmen( kod: ETM-AKIS, ad: "akış-ajanı", tür: yönetici, yetki: L3, bellek: izole, ne: "akış", uygular: KRL-ORNEK-1, yönetir: [ AKS-ORNEK ] )
İşAkışı( kod: AKS-ORNEK, ne: "örnek akış" )` : ""}
`,
  [`${K}/ofisler/a/alfa/ajan.sar`]: `Etmen( kod: ETM-OFIS, ad: "ofis-ajanı", tür: yönetici, yetki: L3, bellek: izole, ne: "ofis", uygular: KRL-ORNEK-1 )\n`,
  [`${K}/kisisel/defter/ajan.sar`]: `Etmen( kod: ETM-DIS, ad: "dış-ajan", tür: uzman, yetki: L2, bellek: izole, ne: "dış", uygular: KRL-ORNEK-1 )\n`,
});
const ozet = (d: Record<string, string>) => trenOzetiCikar(Object.entries(d).map(([y, m]) => [y, ayristir(belirtecle(m))] as const));
const bant = (html: string, kat: string): string => {
  const i = html.indexOf(`<section class="tr-kat${kat === "yok" ? " tr-katsiz" : ""}" data-kat="${kat}">`);
  assert.ok(i >= 0, `kat ${kat} bandı yok`);
  const j = html.indexOf("</section>", i);
  return html.slice(i, j);
};

test("② birinci kat bandında kanon kutusu, apex koltuğu ve boş iş akışı yuvaları; ajanlar katlarına düşer", () => {
  const o = ozet(AJANLAR(false));
  assert.deepEqual(o.etmenler.map((e) => [e.kod, e.kat ?? null]), [["ETM-DIS", null], ["ETM-LIDER", 1], ["ETM-OFIS", 2]]);
  const html = trenSemaHtml(o, "seritler", { ad: "Örnek Atölye" }).sema;
  const bir = bant(html, "1");
  assert.ok(bir.includes('class="tr-kanon"') && bir.includes(BINA_METINLERI.kanonSayaci(1, 1)), "kanon kutusu yönetim katının yasa ve kararını sayar");
  assert.ok(/class="tr-apex".*data-kod="ETM-LIDER"/.test(bir), "apex koltuğu birinci kattadır");
  assert.equal(bir.split(BINA_METINLERI.isAkisiYuvasi).length - 1, IS_AKISI_YUVA_SAYISI, "iş akışı ajanı yokken bütün yuvalar boştur");
  assert.ok(!bir.includes('class="tr-akis-yuvalar"><div class="tr-grup'), "boş şeritte ajan kutusu yoktur");
  assert.ok(bant(html, "2").includes('data-kod="ETM-OFIS"'), "ofis ajanı ikinci kattadır");
  assert.ok(bant(html, "yok").includes('data-kod="ETM-DIS"'), "katsız ajan bantların altındadır");
  assert.ok(html.includes('class="bina-ad">Örnek Atölye<'), "binanın adı şemanın tepesindedir");
});

test("② apex'in yönettiği ve bir İşAkışı yöneten ajan ilan edilince yuvası kendiliğinden dolar", () => {
  const html = trenSemaHtml(ozet(AJANLAR(true)), "seritler").sema;
  const bir = bant(html, "1");
  const akis = bir.slice(bir.indexOf('class="tr-akis"'));
  assert.ok(akis.includes('data-kod="ETM-AKIS"') && akis.includes('data-ust="ETM-LIDER"'), "ajan şeritte ve apex'e bağlı");
  assert.equal(akis.split(BINA_METINLERI.isAkisiYuvasi).length - 1, IS_AKISI_YUVA_SAYISI - 1, "dolan yuva kadar boş yuva azalır");
  assert.equal(html.split('data-kod="ETM-AKIS"').length - 1, 1, "iş akışı ajanı şemada tam bir kez görünür");
});

test("② kat alanı olmayan çalışma alanında şema bantsızdır ve bugünkü gibi çizilir", () => {
  const d = AJANLAR(true);
  d[`${K}/bina_anadizin.sar`] = katli(false)[`${K}/bina_anadizin.sar`]!;
  const o = ozet(d);
  assert.equal(o.bina, undefined);
  const html = trenSemaHtml(o, "seritler").sema;
  assert.ok(!html.includes("tr-kat") && !html.includes("tr-akis") && !html.includes("bina-bas"));
  assert.ok(html.includes('<div class="tr-apex"><div class="tr-apex-kutular">'));
});

// ── ③ Logo ───────────────────────────────────────────────────────────────────
test("③ logo yalnız kökün içindeki betiksiz SVG ise çizilir; kök dışı, SVG olmayan ve betikli logo çizilmez", () => {
  const dis = mkdtempSync(join(tmpdir(), "sarmal-bina-"));
  try {
    const ev = join(dis, "ev");
    mkdirSync(join(ev, "oz"), { recursive: true });
    writeFileSync(join(ev, "oz", "logo.svg"), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10"/></svg>');
    writeFileSync(join(ev, "oz", "kotu.svg"), '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    writeFileSync(join(ev, "oz", "logo.png"), "png");
    writeFileSync(join(dis, "disari.svg"), '<svg xmlns="http://www.w3.org/2000/svg"/>');
    symlinkSync(join(dis, "disari.svg"), join(ev, "oz", "bag.svg"));
    const bina = (logo: string) => ({ kod: "CAL-ORNEK", ad: "Örnek", kokDizin: ev, logo: { yol: logo, satir: 1, sutun: 1 }, kitapliklar: [], katlar: [1] });
    const iyi = binaBasligiKur(bina("oz/logo.svg"))!;
    assert.ok(iyi.logo?.startsWith("data:image/svg+xml;base64,"));
    assert.ok(binaBasligiHtml(iyi).includes('<img class="bina-logo" src="data:image/svg+xml;base64,'));
    for (const kotu of ["oz/kotu.svg", "../disari.svg", "oz/bag.svg", "oz/logo.png", "oz/yok.svg"]) {
      const b = binaBasligiKur(bina(kotu))!;
      assert.equal(b.logo, undefined, `${kotu} gösterilmemeli`);
      assert.ok(!binaBasligiHtml(b).includes("<img"), `${kotu} çizilmemeli`);
    }
    // Veri adresi dışında bir adres biçimce reddedilir (savunmanın ikinci katmanı).
    assert.ok(!binaBasligiHtml({ ad: "x", logo: "javascript:alert(1)" }).includes("<img"));
    assert.ok(!binaBasligiHtml({ ad: "x", logo: 'data:image/svg+xml;base64,AA" onerror="x' }).includes("<img"));
  } finally {
    rmSync(dis, { recursive: true, force: true });
  }
});

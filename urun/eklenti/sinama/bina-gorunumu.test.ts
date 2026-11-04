// ═══════════════════════════════════════════════════════════════════════════
// bina-gorunumu.test.ts — 🏢 ÇALIŞMA ALANININ KATLARI VE LOGOSU (PNL-A31)
//
//   Founder 2026-11-04: çok ofisli çalışma alanı panelde bir bina gibi görünür.
//   Ölçülenler:
//     ① Kat alanı hiç kullanılmamış çalışma alanında görünüm bugünkü gibidir (bant
//       yok, projeler alfabetik).
//     ①' Kat alanı taşıyan çalışma alanının ağacı Founder'ın 2026-11-04 tarihinde
//       onayladığı şemaya birebir uyar ve yalnız Kitaplık ilanlarından türer: kök ›
//       1. Kat · Yönetim › yönetim projeleri; 2. Kat · Ofisler › ofisler › projeler,
//       ofisin içindeki grubun çocukları müşteridir; en altta bina dışı. Simge
//       eşlemesi (organization ya da logo, law, briefcase, rocket, person, archive)
//       ve eklentinin kendi deposunun marka simgesi istisnası depo kimliğinden
//       türer. Kendi anadizinli ofis kendi kökünden açılınca ve tek proje kökünde
//       görünüm değişmez.
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
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
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
import { satirlariUret, satirHtml, IkonDefteri } from "../src/panel-cekirdek.ts";
import { depoAdresiNormal, kendiDeposuMu } from "../src/yolharitasi-cekirdek.ts";

const { YolHaritasi, MARKA_SIMGESI } = await import("../src/yolharitasi.ts");
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

function yolHaritasiDepolu(dosyalar: Record<string, string>) { return yolHaritasi(dosyalar, KENDI_DEPO); }
function yolHaritasi(dosyalar: Record<string, string>, kendiDepo?: string) {
  const programlar = new Map<string, Program>(Object.entries(dosyalar).map(([y, m]) => [y, ayristir(belirtecle(m))]));
  const yol = new YolHaritasi();
  yol.eklentiKoku = kok as never;
  if (kendiDepo) yol.kendiDepoAdresi = kendiDepo;
  yol.yenile({ programlar, yollar: [...programlar.keys()], kirik: [], okunamayan: 0, dilDışı: [], tetik: "sinama", kapsam: undefined, belgeler: new Map(), sıra: 1 } as never);
  return yol;
}
type O = { tur: string; kod?: string; kat?: number | null; varliklar?: unknown[] };
const etiket = (yol: InstanceType<typeof YolHaritasi>, o: unknown): string => String(yol.getTreeItem(o as never).label);

test("① kat alanı hiç kullanılmamış çalışma alanının görünümü değişmez: bant yok, projeler alfabetik", () => {
  const yol = yolHaritasi(katli(false));
  const [cati] = yol.getChildren() as O[];
  const cocuklar = yol.getChildren(cati as never) as O[];
  assert.ok(cocuklar.every((c) => c.tur === "varlık"), "katsız binada bant düğümü doğmaz");
  assert.deepEqual(cocuklar.map((c) => c.kod), ["PRJ-ALFA", "PRJ-DEFTER", "PRJ-KURALLAR", "PRJ-ZETA"]);
  assert.equal(yol.binaAl(), undefined, "katsız binada tepede bina başlığı çizilmez");
});

// ── ①' Founder'ın onayladığı bina ağacı (2026-11-04) ─────────────────────────
//   Şema: Kök › 1. Kat · Yönetim › yönetim projeleri; 2. Kat · Ofisler › her ofis ›
//   projeler (ofisin içindeki grubun çocukları müşteridir, müşterinin içi yine projedir);
//   en altta Bina dışı. Ağaç yalnız Kitaplık ilanlarından türer; fikstürdeki adlar uydurmadır.
const BINA = mkdtempSync(join(tmpdir(), "sarmal-bina-agaci-"));
after(() => rmSync(BINA, { recursive: true, force: true }));
const KENDI_DEPO = "https://github.com/ornek-kurum/ornek-arac";
const binaDosyalari = (logo = "oz/logo.svg"): Record<string, string> => ({
  [`${BINA}/bina_anadizin.sar`]: `ÇalışmaAlanı( kod: CAL-ORNEK, ad: "Örnek Atölye", logo: "${logo}" ) {
  Kitaplık( kod: KTP-YONETIM, yol: "yonetim/", ne: "Yönetim", kat: 1 )
  Kitaplık( kod: KTP-ATOLYE, ad: "Atölye", yol: "atolye/", ne: "Atölye ofisi", kat: 2 ) {
    Kitaplık( kod: KTP-ATOLYE-ZETA, yol: "zeta/", ne: "Zeta" )
    Kitaplık( kod: KTP-ATOLYE-ALFA, yol: "alfa/", ne: "Alfa" )
    Kitaplık( kod: KTP-ATOLYE-BOS, yol: "bos/", ne: "Boş raf" )
  }
  Kitaplık( kod: KTP-HIZMET, ad: "Hizmet", yol: "hizmet/", ne: "Hizmet ofisi", kat: 2 ) {
    Kitaplık( kod: KTP-HIZMET-CEKIRDEK, yol: "cekirdek/", ne: "Çekirdek" )
    Kitaplık( kod: KTP-HIZMET-PAYDAS, yol: "paydaslar/", ne: "Paydaşlar" )
  }
  Kitaplık( kod: KTP-KISISEL, ad: "Kişisel", yol: "kisisel/", ne: "Kişisel ofis" )
  Kitaplık( kod: KTP-DEPO, ad: "Depo", yol: "depo/", ne: "Depo" )
  Kitaplık( kod: KTP-OZ, yol: "oz/", ne: "Öz" )
}
`,
  [`${BINA}/yonetim/kurallar/kurallar_anadizin.sar`]: `Proje( kod: PRJ-KURALLAR, ad: "Kurallar", rejim: esnek )\n`,
  [`${BINA}/atolye/zeta/zeta_anadizin.sar`]: `Proje( kod: PRJ-ZETA, ad: "Zeta", rejim: esnek )\n`,
  [`${BINA}/atolye/alfa/alfa_anadizin.sar`]: `Proje( kod: PRJ-ALFA, ad: "Alfa", rejim: esnek )\n`,
  // Kendi anadizinli ofis: müşterileri yalnız kendi ilanında yaşar.
  [`${BINA}/hizmet/hizmet_anadizin.sar`]: `ÇalışmaAlanı( kod: CAL-HIZMET, ad: "hizmet" ) {
  Kitaplık( kod: KTP-H-CEKIRDEK, yol: "cekirdek/", ne: "Çekirdek" )
  Kitaplık( kod: KTP-H-PAYDAS, yol: "paydaslar/", ne: "Paydaşlar" ) {
    Kitaplık( kod: KTP-P-KUZEY, yol: "kuzey/", ne: "Kuzey — tek projeli paydaş" )
    Kitaplık( kod: KTP-P-GUNEY, yol: "guney/", ne: "Güney çatısı — iki projeli paydaş" ) {
      Kitaplık( kod: KTP-P-GUNEY-BIR, yol: "bir/", ne: "Bir" )
      Kitaplık( kod: KTP-P-GUNEY-IKI, yol: "iki/", ne: "İki" )
    }
  }
}
`,
  [`${BINA}/hizmet/cekirdek/cekirdek_anadizin.sar`]: `Proje( kod: PRJ-CEKIRDEK, ad: "Çekirdek", rejim: esnek )\n`,
  [`${BINA}/hizmet/paydaslar/kuzey/kuzey_anadizin.sar`]: `Proje( kod: PRJ-KUZEY, ad: "Kuzey", rejim: esnek )\n`,
  [`${BINA}/hizmet/paydaslar/guney/bir/bir_anadizin.sar`]: `Proje( kod: PRJ-BIR, ad: "Bir", rejim: esnek )\n`,
  [`${BINA}/hizmet/paydaslar/guney/iki/iki_anadizin.sar`]: `Proje( kod: PRJ-IKI, ad: "İki", rejim: esnek )\n`,
  [`${BINA}/kisisel/defter/defter_anadizin.sar`]: `Proje( kod: PRJ-DEFTER, ad: "Defter", rejim: esnek )\n`,
});
mkdirSync(join(BINA, "oz"), { recursive: true });
writeFileSync(join(BINA, "oz", "logo.svg"), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10"/></svg>');
writeFileSync(join(BINA, "oz", "kotu.svg"), '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
// Zeta, eklentinin kendi deposudur: git uzak adresi paket ilanındaki depo adresiyle aynıdır (yazım biçimi farklı).
mkdirSync(join(BINA, "atolye", "zeta", ".git"), { recursive: true });
writeFileSync(join(BINA, "atolye", "zeta", ".git", "config"), '[remote "origin"]\n\turl = git@github.com:Ornek-Kurum/ornek-arac.git\n');
// Alfa başka bir depodur.
mkdirSync(join(BINA, "atolye", "alfa", ".git"), { recursive: true });
writeFileSync(join(BINA, "atolye", "alfa", ".git", "config"), '[remote "origin"]\n\turl = git@github.com:ornek-kurum/baska-arac.git\n');

/** Satırın simgesi döküm için: codicon kimliği, marka simgesi ya da dosya adı. */
const simgeAdi = (p: unknown): string => {
  if (!p || typeof p !== "object") return "-";
  const o = p as { id?: string; light?: { fsPath: string } };
  if (typeof o.id === "string") return o.id;
  if (o.light?.fsPath.endsWith(MARKA_SIMGESI)) return "marka";
  return o.light ? `dosya:${o.light.fsPath.replace(/^.*\//, "")}` : "-";
};
/** Ağacın panelde görünen metin dökümü (yalnız varlık ve bina satırları; plan ögeleri yoktur). */
function dokum(yol: InstanceType<typeof YolHaritasi>): string[] {
  const satirlar = satirlariUret(yol as never, {
    acikMi: (_id: string, v: boolean) => v,
    ikonCoz: (p: unknown) => ({ tur: "tema", ad: simgeAdi(p) }),
    dekor: () => undefined, eylemler: () => [], defter: new IkonDefteri(), onek: "y",
  }, 0);
  return satirlar.map((u) => `${"  ".repeat(u.satir.derinlik)}[${u.satir.temaIkonu?.ad ?? "-"}] ${u.satir.etiket}${u.satir.aciklama ? ` — ${u.satir.aciklama}` : ""}`);
}
/** Paket ilanında depo adresi taşımayan kabuk (istisnanın doğmadığı hâl). */
const binaYolu = (logo?: string) => yolHaritasi(binaDosyalari(logo));

test("①' bina ağacı onaylı şemayla aynı kademe ve sırada: Kök › Kat › Ofis › Proje, müşteri ve bina dışı", () => {
  const yol = yolHaritasiDepolu(binaDosyalari());
  assert.deepEqual(dokum(yol), [
    "[dosya:logo.svg] Örnek Atölye — 5 proje",
    "  [-] 1. Kat · Yönetim",
    `    [law] Kurallar — ${BINA_METINLERI.yonetimAciklamasi}`,
    "  [-] 2. Kat · Ofisler",
    "    [briefcase] Atölye — 2 proje",
    "      [marka] Zeta — ray döşendi — vagon bekleniyor",
    "      [rocket] Alfa — ray döşendi — vagon bekleniyor",
    "    [briefcase] Hizmet — 3 proje",
    "      [rocket] Çekirdek — ray döşendi — vagon bekleniyor",
    "      [-] Paydaşlar — 2 proje",
    "        [person] Kuzey — ray döşendi — vagon bekleniyor",
    "        [person] Güney çatısı — 2 proje",
    "          [rocket] Bir — ray döşendi — vagon bekleniyor",
    "          [rocket] İki — ray döşendi — vagon bekleniyor",
    "  [archive] Bina dışı · Kişisel · Depo — 1 proje",
    "    [archive] Kişisel — 1 proje",
    "      [rocket] Defter — ray döşendi — vagon bekleniyor",
  ]);
  // Geri dönüş zinciri ağacın kendisinden geçer: proje → müşteri → grup → ofis (varlık) → kat → kök.
  const kok = (yol.getChildren() as O[])[0]!;
  const bul = (ust: unknown, ad: string): unknown => (yol.getChildren(ust as never) as unknown[]).find((c) => etiket(yol, c) === ad);
  const kat2 = bul(kok, BINA_METINLERI.katAdi(2));
  const hizmet = bul(kat2, "Hizmet");
  const paydas = bul(hizmet, "Paydaşlar");
  const guney = bul(paydas, "Güney çatısı");
  const bir = bul(guney, "Bir");
  assert.equal(yol.getParent(bir as never), guney);
  assert.equal(yol.getParent(guney as never), paydas);
  assert.equal(yol.getParent(paydas as never), hizmet);
  assert.equal(yol.getParent(hizmet as never), kat2);
  assert.equal(yol.getParent(kat2 as never), kok);
  assert.equal((hizmet as O).tur, "varlık", "kendi anadizinli ofisin satırı varlığın kendisidir");
  for (const o of [kat2, paydas, guney]) assert.equal(yol.varlikZinciriMi(o), true);
});

test("①' simge eşlemesi: kök organization ya da logo, yönetim law, ofis briefcase, proje rocket, müşteri person, bina dışı archive, kendi depo marka", () => {
  const yol = yolHaritasiDepolu(binaDosyalari());
  const tum = satirlariUret(yol as never, { acikMi: (_i: string, v: boolean) => v, ikonCoz: () => undefined, dekor: () => undefined,
    eylemler: () => [], defter: new IkonDefteri(), onek: "y" }, 0);
  const item = (ad: string) => tum.find((u) => u.satir.etiket === ad)!.item as { iconPath?: { id?: string; color?: { id: string }; light?: { fsPath: string }; dark?: { fsPath: string } } };
  assert.equal(item("Kurallar").iconPath?.id, "law");
  assert.equal(item("Atölye").iconPath?.id, "briefcase");
  assert.equal(item("Hizmet").iconPath?.id, "briefcase");
  assert.equal(item("Alfa").iconPath?.id, "rocket");
  assert.equal(item("Kuzey").iconPath?.id, "person");
  assert.equal(item("Güney çatısı").iconPath?.id, "person");
  assert.equal(item("Bir").iconPath?.id, "rocket", "müşterinin içindeki proje yine projedir");
  assert.equal(item(BINA_METINLERI.binaDisiSatiri(["Kişisel", "Depo"])).iconPath?.id, "archive");
  assert.equal(item("Kişisel").iconPath?.id, "archive");
  // Proje simgesi durum rengini taşır (bugünkü anlam rengiyle aynı rol): boş rayda bekliyor rengi.
  assert.equal(item("Alfa").iconPath?.color?.id, "disabledForeground");
  // Kendi depo istisnası ad ile değil depo kimliğiyle türer: aynı ağaçta Alfa başka depodur ve roket kalır.
  const zeta = item("Zeta").iconPath!;
  assert.ok(zeta.light?.fsPath.endsWith(MARKA_SIMGESI) && zeta.dark?.fsPath === zeta.light.fsPath, "marka simgesi iki temada da aynı renkli dosyadır");
  // Kök: geçerli logo varsa logo, yoksa ya da süzgeçten geçmiyorsa organization.
  assert.ok(item("Örnek Atölye").iconPath?.light?.fsPath.endsWith("/oz/logo.svg"));
  for (const logo of ["oz/kotu.svg", "oz/yok.svg", "../disari.svg"]) {
    const y = yolHaritasiDepolu(binaDosyalari(logo));
    assert.equal((y.getTreeItem((y.getChildren() as O[])[0] as never).iconPath as { id?: string }).id, "organization", logo);
  }
  // Paket ilanında depo adresi yoksa istisna doğmaz: Zeta da roket taşır.
  const depsuz = binaYolu();
  const z = satirlariUret(depsuz as never, { acikMi: (_i: string, v: boolean) => v, ikonCoz: () => undefined, dekor: () => undefined,
    eylemler: () => [], defter: new IkonDefteri(), onek: "y" }, 0).find((u) => u.satir.etiket === "Zeta")!;
  assert.equal((z.item.iconPath as { id?: string }).id, "rocket");
  // Webview codicon yazı tipi taşımaz: altı simgenin her birinin panelde kendi çizimi vardır.
  for (const ad of ["organization", "law", "briefcase", "rocket", "person", "archive"]) {
    const html = satirHtml({ id: "x", derinlik: 0, etiket: "x", aciklama: "", ipucu: "", durum: "yaprak", komutlu: false, eylemler: [], temaIkonu: { ad } });
    assert.ok(/<svg class="ik"[^>]*><g [^>]*>.+<\/g><\/svg>/.test(html), `${ad} çizimi yok`);
  }
  // Marka dosyası pakette durur ve iki temada görünen somut renk taşır (currentColor değil).
  const marka = readFileSync(fileURLToPath(new URL(`../${MARKA_SIMGESI}`, import.meta.url)), "utf8");
  assert.ok(marka.startsWith("<svg") && /stop-color="#[0-9A-F]{6}"/i.test(marka) && !marka.includes("currentColor"));
});

test("①' kendi anadizinli ofis kendi kökünden açıldığında ve tek proje kökünde görünüm değişmez", () => {
  const hepsi = binaDosyalari();
  const sadece = (onek: string) => Object.fromEntries(Object.entries(hepsi).filter(([y]) => y.startsWith(onek)));
  const ofis = yolHaritasiDepolu(sadece(`${BINA}/hizmet/`));
  const satirlar = dokum(ofis);
  assert.equal(satirlar[0], "[dosya:satir-istasyon-notr-acik.svg] Hizmet — 4 proje");
  assert.deepEqual(satirlar.slice(1).map((s) => s.trim().replace(/ —.*$/, "")), [
    "[dosya:satir-sefer-notr-acik.svg] Bir", "[dosya:satir-sefer-notr-acik.svg] Çekirdek",
    "[dosya:satir-sefer-notr-acik.svg] İki", "[dosya:satir-sefer-notr-acik.svg] Kuzey",
  ], "ofisin kendi panelinde bina satırı doğmaz, projeler bugünkü gibi düz ve alfabetiktir");
  const tek = yolHaritasiDepolu(sadece(`${BINA}/atolye/zeta/`));
  assert.deepEqual(dokum(tek), ["[dosya:satir-sefer-notr-acik.svg] Zeta — ray döşendi — vagon bekleniyor"],
    "çatı yokken kendi depo da bugünkü sefer simgesini taşır");
});

test("①' depo kimliği: adres yazımları aynı depoya iner, başka depo eşleşmez", () => {
  const ayni = ["git@github.com:Ornek-Kurum/ornek-arac.git", "https://github.com/ornek-kurum/ornek-arac", "ssh://git@github.com/ornek-kurum/ornek-arac.git",
    "git+https://github.com/ornek-kurum/ornek-arac.git", "https://kullanici@github.com/ornek-kurum/ornek-arac/"];
  for (const a of ayni) assert.equal(depoAdresiNormal(a), "github.com/ornek-kurum/ornek-arac", a);
  assert.equal(depoAdresiNormal("ornek-arac"), undefined);
  assert.equal(kendiDeposuMu('[remote "origin"]\n\turl = git@github.com:ornek-kurum/ornek-arac.git\n', KENDI_DEPO), true);
  assert.equal(kendiDeposuMu('[remote "origin"]\n\turl = git@github.com:ornek-kurum/ornek-arac-catal.git\n', KENDI_DEPO), false);
  assert.equal(kendiDeposuMu(undefined, KENDI_DEPO), false);
  assert.equal(kendiDeposuMu('[remote "origin"]\n\turl = git@github.com:ornek-kurum/ornek-arac.git\n', undefined), false);
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

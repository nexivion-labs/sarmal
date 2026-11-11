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
//     ④ Ray sekmesinin tepesi (Founder onayı 2026-11-04 gecesi): şirket yalnız bir
//       kez, logosuyla "Yol Haritası" başlığının üstünde durur; kök satırı ağaçtan
//       çıkar, katlar doğrudan başlığın altında açılır ve durum bilgisi (proje sayısı)
//       başlıkta kalır. Katsız çalışma alanında tepe yoktur ve ağaç değişmez.
//     ⑤ Müşteriler Kişi › Proje › Faz düzenindedir: her müşteri kendi satırını alır,
//       tek projeli müşteri de aynı biçimde görünür; satırın adı Profildeki ilk kişinin
//       hitabıdır, kişi yoksa Profilin adı, Profil yoksa Kitaplığın adı yazar. Profil
//       müşteri Kitaplığının içinden ya da müşterinin proje kökünden okunur. Müşteri
//       üst satırın sayısında bir sayılır.
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
import { satirlariUret, satirHtml, IkonDefteri, binaKokunuAyir, rayBolumuHtml, BINA_TEPESI_KIMLIGI } from "../src/panel-cekirdek.ts";
import { depoAdresiNormal, kendiDeposuMu, klasorSayimi } from "../src/yolharitasi-cekirdek.ts";
import { yasaOku } from "../../cekirdek/src/bina.ts";

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
  // Yönetim katının projesi: yasası tiplerden okunur, plan ağacı Ray ağacına girmez (Founder hükmü 2026-11-04 gecesi).
  [`${BINA}/yonetim/kurallar/kurallar_anadizin.sar`]: `Proje( kod: PRJ-KURALLAR, ad: "Kurallar", rejim: esnek ) {
  Kitaplık( kod: KTP-K-YASA, yol: "yasa/", ne: "Yasa" )
  Kitaplık( kod: KTP-K-IS, yol: "is/", ne: "İş" )
}
`,
  [`${BINA}/yonetim/kurallar/yasa/anayasa.sar`]: `Anayasa( kod: ANY-ORNEK, ad: "Örnek Atölye Anayasası", ne: "Uydurma anayasa" ) {
  Kural birinciIlke( kod: KRL-BIRINCI, ne: "Birinci ilke: uydurma" )
  Kural ikinciIlke( kod: KRL-IKINCI, ad: "İkinci İlke", ne: "uydurma" )
}
`,
  // İçi boş yönetmelik: yasa Kitaplığında durduğu için yerini korur.
  [`${BINA}/yonetim/kurallar/yasa/yonetmelik/bos.sar`]: `Mekanizma( kod: MEK-BOS, ad: "Boş Yönetmelik" )\n`,
  [`${BINA}/yonetim/kurallar/yasa/yonetmelik/dolu.sar`]: `Mekanizma( kod: MEK-DOLU, ad: "Dolu Yönetmelik" ) {
  Kural ucuncuIlke( kod: KRL-UCUNCU, otorite: politika, ne: "uydurma" )
}
`,
  [`${BINA}/yonetim/kurallar/yasa/kararlar.sar`]: `Karar( kod: KRR-BIR, karar: "k", gerekçe: "g", durum: kilitli, ne: "🔤 Örnek ASCII kararı: uydurma açıklama" )
Karar( kod: KRR-IKI, karar: "k", gerekçe: "g", durum: bekliyor, ne: "Bekleyen öneri" )
Karar( kod: KRR-UC, karar: "k", gerekçe: "g", durum: kilitli, ne: "Üçüncü karar ve ekleri — uzun açıklama" )
`,
  [`${BINA}/yonetim/kurallar/yasa/tema.sar`]: `Tema( kod: TEM-ORNEK, ne: "Örnek arayüz dili — sade" )\n`,
  // Plan ağacı ve yasa Kitaplığı dışındaki kuralsız Mekanizma: ikisi de yasa görünümüne girmez.
  [`${BINA}/yonetim/kurallar/is/plan.sar`]: `Faz( kod: FZ-K, ad: "Kuruluş" ) {
  Blok( kod: BLK-K ) {
    Katman( kod: KAT-K ) {
      Adım( kod: ADM-K1 )
    }
  }
}
Mekanizma( kod: MEK-IS, ad: "İş Mekanizması" )
`,
  [`${BINA}/atolye/zeta/zeta_anadizin.sar`]: `Proje( kod: PRJ-ZETA, ad: "Zeta", rejim: esnek )\n`,
  [`${BINA}/atolye/alfa/alfa_anadizin.sar`]: `Proje( kod: PRJ-ALFA, ad: "Alfa", rejim: esnek )\n`,
  // Kendi anadizinli ofis: müşterileri yalnız kendi ilanında yaşar.
  [`${BINA}/hizmet/hizmet_anadizin.sar`]: `ÇalışmaAlanı( kod: CAL-HIZMET, ad: "hizmet" ) {
  Kitaplık( kod: KTP-H-CEKIRDEK, yol: "cekirdek/", ne: "Çekirdek" )
  Kitaplık( kod: KTP-H-PAYDAS, yol: "paydaslar/", ne: "Paydaşlar" ) {
    Kitaplık( kod: KTP-P-KUZEY, yol: "kuzey/", ne: "Kuzey — tek projeli paydaş" )
    Kitaplık( kod: KTP-P-GUNEY, yol: "guney/", ne: "Güney çatısı — iki projeli paydaş" ) {
      Profil( kod: PFL-GUNEY, ad: "Güney Ortaklığı", ne: "İki projeli uydurma paydaş.", sektör: "örnek", şehir: "Örnekköy",
        kişiler: [ { hitap: "Selin Hanım", rol: "muhatap", sorumluluk: "onay" } ] )
      Kitaplık( kod: KTP-P-GUNEY-BIR, yol: "bir/", ne: "Bir" )
      Kitaplık( kod: KTP-P-GUNEY-IKI, yol: "iki/", ne: "İki" )
    }
    Kitaplık( kod: KTP-P-BATI, yol: "bati/", ne: "Batı — kişisi yazılmamış paydaş" )
    Kitaplık( kod: KTP-P-DOGU, yol: "dogu/", ne: "Doğu — Profili olmayan paydaş" )
  }
}
`,
  [`${BINA}/hizmet/cekirdek/cekirdek_anadizin.sar`]: `Proje( kod: PRJ-CEKIRDEK, ad: "Çekirdek", rejim: esnek )\n`,
  // Tek projeli paydaşın Profili kendi proje kökündedir; Batı'nın Profili kişi taşımaz (firma adı yazar).
  [`${BINA}/hizmet/paydaslar/kuzey/kuzey_anadizin.sar`]: `Proje( kod: PRJ-KUZEY, ad: "Kuzey", rejim: esnek ) {
  Profil( kod: PFL-KUZEY, ad: "Kuzey Fırını", ne: "Uydurma fırın.", sektör: "gıda", şehir: "Örnekköy",
    kişiler: [ { hitap: "Deniz Bey", rol: "muhatap", sorumluluk: "onay" } ] )
}
`,
  [`${BINA}/hizmet/paydaslar/bati/bati_anadizin.sar`]: `Proje( kod: PRJ-BATI, ad: "Batı", rejim: esnek ) {
  Profil( kod: PFL-BATI, ad: "Batı Atölyesi", ne: "Uydurma atölye.", sektör: "örnek", şehir: "Örnekköy" )
}
`,
  [`${BINA}/hizmet/paydaslar/dogu/dogu_anadizin.sar`]: `Proje( kod: PRJ-DOGU, ad: "Doğu", rejim: esnek )\n`,
  [`${BINA}/hizmet/paydaslar/guney/bir/bir_anadizin.sar`]: `Proje( kod: PRJ-BIR, ad: "Bir", rejim: esnek )\n`,
  [`${BINA}/hizmet/paydaslar/guney/iki/iki_anadizin.sar`]: `Proje( kod: PRJ-IKI, ad: "İki", rejim: esnek )\n`,
  [`${BINA}/kisisel/defter/defter_anadizin.sar`]: `Proje( kod: PRJ-DEFTER, ad: "Defter", rejim: esnek )\n`,
});
mkdirSync(join(BINA, "oz"), { recursive: true });
// Bina dışındaki projesiz Depo Kitaplığı: klasörleri yalnız adlarıyla sayılır, mühürlülerin içine inilmez.
for (const k of ["acik-klasor", "@ARSIV@_birinci/ic", "@ARSIV@_ikinci", ".gizli"]) mkdirSync(join(BINA, "depo", k), { recursive: true });
writeFileSync(join(BINA, "depo", "not.txt"), "dosya klasör sayılmaz");
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

test("①' ⑤ bina ağacı onaylı şemayla aynı kademe ve sırada: Kök › Kat › Ofis › Proje, müşteri Kişi › Proje ve bina dışı", () => {
  const yol = yolHaritasiDepolu(binaDosyalari());
  assert.deepEqual(dokum(yol), [
    "[dosya:logo.svg] Örnek Atölye — 8 proje",
    "  [-] 1. Kat · Yönetim — 3 kural · 2 yönetmelik · 3 karar",
    "    [book] Anayasa · Örnek Atölye Anayasası — 2 kural",
    "    [notebook] Yönetmelikler — 2",
    "    [verified] Kararlar — 3 · 2 kilitli · 1 bekliyor",
    "    [symbol-color] Arayüz Dili",
    "  [-] 2. Kat · Ofisler",
    "    [briefcase] Atölye — 2 proje",
    "      [marka] Zeta — ray döşendi — vagon bekleniyor",
    "      [rocket] Alfa — ray döşendi — vagon bekleniyor",
    "    [briefcase] Hizmet — 5 proje",
    "      [rocket] Çekirdek — ray döşendi — vagon bekleniyor",
    "      [-] Paydaşlar — 4 proje",
    "        [person] Deniz Bey — 1 proje",
    "          [rocket] Kuzey — ray döşendi — vagon bekleniyor",
    "        [person] Selin Hanım — 2 proje",
    "          [rocket] Bir — ray döşendi — vagon bekleniyor",
    "          [rocket] İki — ray döşendi — vagon bekleniyor",
    "        [person] Batı Atölyesi — 1 proje",
    "          [rocket] Batı — ray döşendi — vagon bekleniyor",
    "        [person] Doğu — 1 proje",
    "          [rocket] Doğu — ray döşendi — vagon bekleniyor",
    "  [archive] Bina dışı · Kişisel · Depo — 1 proje",
    "    [archive] Kişisel — 1 proje",
    "      [rocket] Defter — ray döşendi — vagon bekleniyor",
    "    [archive] Depo — 1 klasör · 2 mühürlü klasör",
  ]);
  // Geri dönüş zinciri ağacın kendisinden geçer: proje → müşteri → grup → ofis (varlık) → kat → kök.
  const kok = (yol.getChildren() as O[])[0]!;
  const bul = (ust: unknown, ad: string): unknown => (yol.getChildren(ust as never) as unknown[]).find((c) => etiket(yol, c) === ad);
  const kat2 = bul(kok, BINA_METINLERI.katAdi(2));
  const hizmet = bul(kat2, "Hizmet");
  const paydas = bul(hizmet, "Paydaşlar");
  const guney = bul(paydas, "Selin Hanım");
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
  assert.equal(item("Atölye").iconPath?.id, "briefcase");
  assert.equal(item("Hizmet").iconPath?.id, "briefcase");
  assert.equal(item("Alfa").iconPath?.id, "rocket");
  assert.equal(item("Deniz Bey").iconPath?.id, "person");
  assert.equal(item("Selin Hanım").iconPath?.id, "person");
  assert.equal(item("Kuzey").iconPath?.id, "rocket", "tek projeli müşterinin projesi de projedir");
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
  for (const ad of ["organization", "law", "briefcase", "rocket", "person", "archive", "book", "notebook", "verified", "symbol-color", "folder"]) {
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
  assert.equal(satirlar[0], "[dosya:satir-istasyon-notr-acik.svg] Hizmet — 6 proje");
  assert.deepEqual(satirlar.slice(1).map((s) => s.trim().replace(/ —.*$/, "")), [
    "[dosya:satir-sefer-notr-acik.svg] Batı", "[dosya:satir-sefer-notr-acik.svg] Bir", "[dosya:satir-sefer-notr-acik.svg] Çekirdek",
    "[dosya:satir-sefer-notr-acik.svg] Doğu", "[dosya:satir-sefer-notr-acik.svg] İki", "[dosya:satir-sefer-notr-acik.svg] Kuzey",
  ], "ofisin kendi panelinde bina satırı ve müşteri satırı doğmaz, projeler bugünkü gibi düz ve alfabetiktir");
  const tek = yolHaritasiDepolu(sadece(`${BINA}/atolye/zeta/`));
  assert.deepEqual(dokum(tek), ["[dosya:satir-sefer-notr-acik.svg] Zeta — ray döşendi — vagon bekleniyor"],
    "çatı yokken kendi depo da bugünkü sefer simgesini taşır");
});

// ── ④ Ray sekmesinin tepesi (Founder onayı 2026-11-04 gecesi) ─────────────────
test("④ şirket yalnız bir kez tepede durur: kök satırı ağaçtan çıkar, katlar başlığın altında açılır, durum başlıkta kalır", () => {
  const yol = yolHaritasiDepolu(binaDosyalari());
  const sec = { acikMi: (_i: string, v: boolean) => v, ikonCoz: () => undefined, dekor: () => undefined,
    eylemler: () => [], defter: new IkonDefteri(), onek: "y" };
  const tum = satirlariUret(yol as never, sec, 0);
  const kok = yol.binaKoku();
  assert.ok(kok, "katlı binada tepeye taşınacak kök vardır");
  const { tepe, satirlar } = binaKokunuAyir(tum, kok);
  assert.equal(tepe?.satir.etiket, "Örnek Atölye");
  assert.equal(tepe?.satir.aciklama, "8 proje", "durum bilgisi tepeye taşınan satırdan gelir; yönetim katı sayılmaz");
  assert.ok(!satirlar.some((u) => u.oge === kok), "ikinci bir kök satırı kalmaz");
  assert.deepEqual(satirlar.filter((u) => u.satir.derinlik === 0).map((u) => u.satir.etiket),
    [BINA_METINLERI.katAdi(1), BINA_METINLERI.katAdi(2), BINA_METINLERI.binaDisiSatiri(["Kişisel", "Depo"])],
    "katlar doğrudan Yol Haritası başlığının altında açılır");
  // Kimlikler değişmez: açık-kapalı tercihi ve tıklama iletileri aynı satırlara gider.
  assert.ok(satirlar.every((u) => tum.includes(u)) && satirlar.length === tum.length - 1);
  // Çizim: tepe "Yol Haritası" bölüm başlığının ÜSTÜNDE durur ve adı, logoyu ve açıklamayı taşır.
  const html = rayBolumuHtml({ bina: { ad: "Örnek Atölye", logo: "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=", aciklama: tepe!.satir.aciklama }, agac: "" });
  const tepeYeri = html.indexOf(`id="${BINA_TEPESI_KIMLIGI}"`);
  assert.ok(tepeYeri >= 0 && tepeYeri < html.indexOf('<h2 class="bas"'), "tepe bölüm başlığından önce gelir");
  assert.ok(html.includes('class="bina-logo"') && html.includes(">Örnek Atölye<") && html.includes('class="bina-ac">8 proje<'));
  assert.equal((html.match(/Örnek Atölye/g) ?? []).length, 2, "ad yalnız başlıkta ve logonun alt metninde geçer");
});

test("④ katsız çalışma alanında tepe yoktur ve ağaç bugünkü gibi kalır", () => {
  const yol = yolHaritasi(katli(false));
  assert.equal(yol.binaKoku(), undefined);
  const tum = satirlariUret(yol as never, { acikMi: (_i: string, v: boolean) => v, ikonCoz: () => undefined, dekor: () => undefined,
    eylemler: () => [], defter: new IkonDefteri(), onek: "y" }, 0);
  const derinlikler = tum.map((u) => u.satir.derinlik);
  const { tepe, satirlar } = binaKokunuAyir(tum, undefined);
  assert.equal(tepe, undefined);
  assert.deepEqual(satirlar.map((u) => u.satir.derinlik), derinlikler, "hiçbir satır kaymaz");
  assert.ok(!rayBolumuHtml({ agac: "" }).includes(BINA_TEPESI_KIMLIGI), "bina yoksa tepe çizilmez");
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

// ── ⑥ Yönetim katı proje çağırmaz (Founder hükmü 2026-11-04 gecesi) ─────────────
//   Katın altında proje satırı, roket, sayaç ya da plan ağacı yoktur; yasa grupları doğrudan
//   bandın altında durur ve gruplar yalnız tiplerden türer. Banda tıklanınca anayasa açılır.
type Komut = { command: string; arguments?: Array<{ fsPath?: string; selection?: { start: { line: number } } }> };
const komutu = (u: { item: unknown }): string => {
  const c = (u.item as { command?: Komut }).command;
  if (!c) return "";
  const yer = c.arguments?.[0]?.fsPath?.replace(BINA, "") ?? "";
  const satir = c.arguments?.[1]?.selection ? `:${c.arguments[1].selection.start.line + 1}` : "";
  return ` {${c.command} ${yer}${satir}}`;
};
function acikDokum(yol: InstanceType<typeof YolHaritasi>): Array<{ metin: string; u: ReturnType<typeof satirlariUret>[number] }> {
  const tum = satirlariUret(yol as never, { acikMi: () => true, ikonCoz: (p: unknown) => ({ tur: "tema", ad: simgeAdi(p) }),
    dekor: () => undefined, eylemler: () => [], defter: new IkonDefteri(), onek: "y" }, 99);
  return tum.map((u) => ({ u, metin: `${"  ".repeat(u.satir.derinlik)}[${u.satir.temaIkonu?.ad ?? "-"}] ${u.satir.etiket}${u.satir.aciklama ? ` — ${u.satir.aciklama}` : ""}${komutu(u)}` }));
}
/** Birinci kat bandının alt ağacı (bant dâhil). */
function yonetimKati(yol: InstanceType<typeof YolHaritasi>) {
  const tum = acikDokum(yol);
  const i = tum.findIndex((x) => x.u.satir.etiket === BINA_METINLERI.katAdi(1));
  const d = tum[i]!.u.satir.derinlik;
  const son = tum.findIndex((x, j) => j > i && x.u.satir.derinlik <= d);
  return tum.slice(i, son < 0 ? undefined : son);
}

test("⑥ yönetim katında proje satırı, roket, sayaç ya da plan satırı yoktur; yasa grupları tiplerden türer ve tanımına gider", () => {
  const kat = yonetimKati(yolHaritasiDepolu(binaDosyalari()));
  const Y = "/yonetim/kurallar/yasa";
  assert.deepEqual(kat.map((x) => x.metin), [
    `  [-] 1. Kat · Yönetim — 3 kural · 2 yönetmelik · 3 karar {vscode.open ${Y}/anayasa.sar:1}`,
    `    [book] Anayasa · Örnek Atölye Anayasası — 2 kural {vscode.open ${Y}/anayasa.sar:1}`,
    `      [-] Birinci Ilke {vscode.open ${Y}/anayasa.sar:2}`,
    `      [-] İkinci İlke {vscode.open ${Y}/anayasa.sar:3}`,
    "    [notebook] Yönetmelikler — 2",
    `      [-] Boş Yönetmelik — ${BINA_METINLERI.yasaBos} {vscode.open ${Y}/yonetmelik/bos.sar:1}`,
    `      [-] Dolu Yönetmelik — 1 kural {vscode.open ${Y}/yonetmelik/dolu.sar:1}`,
    `        [-] Ucuncu Ilke {vscode.open ${Y}/yonetmelik/dolu.sar:2}`,
    `    [verified] Kararlar — 3 · 2 kilitli · 1 bekliyor {vscode.open ${Y}/kararlar.sar:1}`,
    `      [-] Örnek ASCII Kararı {vscode.open ${Y}/kararlar.sar:1}`,
    `      [-] Bekleyen Öneri {vscode.open ${Y}/kararlar.sar:2}`,
    `      [-] Üçüncü Karar ve Ekleri {vscode.open ${Y}/kararlar.sar:3}`,
    `    [symbol-color] Arayüz Dili {vscode.open ${Y}/tema.sar:1}`,
    `      [-] Örnek Arayüz Dili {vscode.open ${Y}/tema.sar:1}`,
  ]);
  // Kanıt: katın hiçbir satırı varlık değildir, hiçbiri roket ya da sayaç taşımaz, plan düğümü (Faz) girmez.
  for (const x of kat) {
    assert.notEqual((x.u.oge as { tur?: string }).tur, "varlık", `${x.metin} bir proje satırı`);
    assert.notEqual((x.u.oge as { tur?: string }).tur, "oge", `${x.metin} bir plan satırı`);
    assert.ok(!/\[rocket\]|\[law\]|\[\d+\/\d+\]|Kuruluş|İş Mekanizması/.test(x.metin), x.metin);
  }
  // Gruplar ve yasa satırları kapalı doğar; bant açıktır.
  const yol = yolHaritasiDepolu(binaDosyalari());
  const kapali = satirlariUret(yol as never, { acikMi: (_i: string, v: boolean) => v, ikonCoz: () => undefined, dekor: () => undefined,
    eylemler: () => [], defter: new IkonDefteri(), onek: "y" }, 0);
  const grup = kapali.find((u) => u.satir.etiket === BINA_METINLERI.yasaKararlar)!;
  assert.equal(grup.satir.durum, "kapali");
});

test("⑥ birden çok yönetim projesi kendi roketsiz yasa başlığıyla durur; boş yasa grupları yerini korur", () => {
  const dosyalar = {
    [`${BINA}/bina_anadizin.sar`]: `ÇalışmaAlanı( kod: CAL-IKI, ad: "İki Yönetimli" ) {
  Kitaplık( kod: KTP-Y1, ad: "Birinci", yol: "y1/", kat: 1 )
  Kitaplık( kod: KTP-Y2, ad: "İkinci", yol: "y2/", kat: 1 )
  Kitaplık( kod: KTP-O, ad: "Ofis", yol: "o/", kat: 2 )
}
`,
    [`${BINA}/y1/y1_anadizin.sar`]: `Proje( kod: PRJ-Y1, ad: "Birinci Yönetim", rejim: esnek )\n`,
    [`${BINA}/y1/yasa.sar`]: `Anayasa( kod: ANY-Y1, ad: "Birinci Anayasa", ne: "u" ) {\n  Kural bir( kod: KRL-Y1, ne: "u" )\n}\n`,
    [`${BINA}/y2/y2_anadizin.sar`]: `Proje( kod: PRJ-Y2, ad: "İkinci Yönetim", rejim: esnek )\n`,
    [`${BINA}/o/p/p_anadizin.sar`]: `Proje( kod: PRJ-P, ad: "Proje", rejim: esnek )\n`,
  };
  const kat = yonetimKati(yolHaritasi(dosyalar));
  assert.deepEqual(kat.map((x) => x.metin.replace(/ \{.*\}$/, "")), [
    "  [-] 1. Kat · Yönetim — 1 kural · 0 yönetmelik · 0 karar",
    "    [law] Birinci Yönetim — 1 kural · 0 yönetmelik · 0 karar",
    "      [book] Anayasa · Birinci Anayasa — 1 kural",
    "        [-] Bir",
    `      [notebook] Yönetmelikler — ${BINA_METINLERI.yasaBos}`,
    `      [verified] Kararlar — ${BINA_METINLERI.yasaBos}`,
    `      [symbol-color] Arayüz Dili — ${BINA_METINLERI.yasaBos}`,
    "    [law] İkinci Yönetim — 0 kural · 0 yönetmelik · 0 karar",
    `      [book] Anayasa — ${BINA_METINLERI.yasaBos}`,
    `      [notebook] Yönetmelikler — ${BINA_METINLERI.yasaBos}`,
    `      [verified] Kararlar — ${BINA_METINLERI.yasaBos}`,
    `      [symbol-color] Arayüz Dili — ${BINA_METINLERI.yasaBos}`,
  ]);
  assert.ok(kat.every((x) => (x.u.oge as { tur?: string }).tur !== "varlık"), "yasa başlığı proje satırı değildir");
  assert.match(kat[1]!.metin, /\{vscode\.open \/y1\/yasa\.sar:1\}$/, "başlık kendi anayasasına gider");
});

test("⑥ yasa okuması yalnız tiplerden türer: serbest kurallar otoritelerine göre, Politika Mekanizmanın içinde, kuralsız Mekanizma yasa Kitaplığı dışında sayılmaz", () => {
  const p = (m: string) => ayristir(belirtecle(m));
  const yasa = yasaOku([
    ["/k/yasa/a.sar", p(`Anayasa( kod: ANY-A, ad: "A" ) {\n  Kural x( kod: KRL-X, ne: "u" )\n}\nKural serbestAnayasa( kod: KRL-SA, otorite: anayasa, ne: "u" )\n`)],
    ["/k/yasa/b.sar", p(`Kural serbestTercih( kod: KRL-ST, otorite: tercih, ne: "u" )\nMevzuat( kod: MVZ-A, kaynak: "u", yargıAlanı: TR, ne: "u", zorunluKılar: [] )\n`)],
    ["/k/is/c.sar", p(`Mekanizma( kod: MEK-POL, ad: "Politikalı" ) {\n  Politika( kod: POL-A, alan: hız, ne: "u" ) {\n    Kural y( kod: KRL-Y, ne: "u" )\n  }\n}\n`)],
    ["/k/diger/d.sar", p(`Mekanizma( kod: MEK-BOS, ad: "Boş" )\n`)],
  ], ["/k/yasa", "/k/is", "/k/diger"]);
  assert.deepEqual(yasa.anayasa.map((d) => [d.kod, d.cocuklar.map((c) => c.kod)]), [["ANY-A", ["KRL-X", "KRL-SA"]]]);
  assert.deepEqual(yasa.yonetmelik.map((d) => d.kod), ["MEK-POL", "KRL-ST", "MVZ-A"], "kuralsız MEK-BOS yasa Kitaplığı dışında olduğu için girmez");
  assert.deepEqual(yasa.yonetmelik[0]!.cocuklar.map((c) => [c.kod, c.cocuklar.map((k) => k.kod)]), [["POL-A", ["KRL-Y"]]]);
  assert.equal(yasa.kuralSayisi, 4);
});

test("⑦ bina dışındaki projesiz Kitaplık klasör sayısıyla görünür ve gezginde gösterir; mühürlü klasörlerin içine inilmez", () => {
  assert.deepEqual(klasorSayimi([
    { ad: "hobiler", dizin: true }, { ad: "okuma", dizin: true }, { ad: "@ARSIV@_eski", dizin: true }, { ad: "@SONRA@_yarin", dizin: true },
    { ad: "@EGITIM@_ders", dizin: true }, { ad: ".git", dizin: true }, { ad: "not.txt", dizin: false },
  ]), { klasor: 3, muhurlu: 2 }, "eğitim mühürlü klasör okunur ve sıradan klasör sayılır");
  const tum = acikDokum(yolHaritasiDepolu(binaDosyalari()));
  const depo = tum.find((x) => x.u.satir.etiket === "Depo")!;
  assert.equal(depo.metin.trim(), "[archive] Depo — 1 klasör · 2 mühürlü klasör {revealInExplorer /depo}");
  assert.equal(depo.u.satir.durum, "yaprak", "klasörler tek tek listelenmez");
  const ipucu = String((depo.u.item as { tooltip?: unknown }).tooltip);
  assert.ok(ipucu.startsWith(`Depo\nDepo\n${BINA}/depo\n`) && ipucu.includes("Mühürlü klasörleri motor okumaz"), ipucu);
  // Bina dışı satırı açılabilir; yalnız açılıp kapanır, komut taşımaz.
  const disari = tum.find((x) => x.u.satir.etiket.startsWith(BINA_METINLERI.binaDisiSatiri([])))!;
  assert.equal((disari.u.item as { command?: unknown }).command, undefined);
  assert.notEqual(disari.u.satir.durum, "yaprak");
});

// ═══════════════════════════════════════════════════════════════════════════
// dis-degisiklik.test.ts — 🩹 EDİTÖR DIŞINDAN DEĞİŞEN DOSYADA PANEL BAYATLIĞI
//                          (BKM-DNT-A18 · "Panelin Dışarıdan Değişen Dosyada
//                           Bayat Kalmaması")
//
//   SAHA BULGUSU (2026-10-24 · HTR-EKLENTI-DAR-KAPSAM-BAYAT-PANEL): 0.9.194
//   kurulu bir makinede dosyalar başka bir pencerede çalışan bir ajan tarafından
//   editörün dışından değiştirilirken yol haritası paneli bir projenin Adım
//   sayısını eski değerinde gösterdi ve doğru değer ancak pencere yeniden
//   yüklenince geldi. Kontrolcü kaynakta iki aday neden ölçtü:
//
//     ① AÇIK BELGE ÖNCELİĞİ — tur açık belgeyi her zaman diskten önce okuyordu.
//        VS Code modeli diskten tazelemeden önce koşan bir tur eski metni okur;
//        model sonradan tazelendiğinde yalnız tek dosya yolu koşar, görüntü
//        yayını koşmaz ve panel eski sayıda kalır.
//     ② ODAKTAN SEÇİLEN DAR KÖK — olay tetikli tur değişen dosyanın kökünü değil
//        odaktaki varlığı seçiyordu; değişen kardeş kökün çapraz tanıları
//        yeniden hesaplanmıyordu.
//
//   FİKSTÜR: gerçek bir geçici dizinde tek çalışma alanı klasörü ve onun altında
//   iki kardeş varlık kökü (`birinci/` ile `ikinci/`) kurulur; çatının tek kök
//   olarak açıldığı saha düzeninin aynısıdır. Tur, kabuğun (eklenti.ts
//   `denetleHepsi`) çağırdığı saf modüllerle ve kabuktaki sırayla koşturulur:
//   açık belge haritası, erişim sınırı, belge toplama, program haritası (gerçek
//   paylaşımlı önbellek `programAl` ile), kapsam kararı ve tek görüntü yayını.
//   Adım sayıları panelin KENDİ sayacıyla (`ogeleriTopla`) ölçülür. Açık belge,
//   VS Code modelinin davranışını taşıyan bir sahtedir: açıldığı andaki metni
//   tutar ve disk değişince kendiliğinden tazelenmez; bu, modelin henüz
//   tazelenmediği andaki turdur.
//
//   Bu dosyanın YENİDEN ÜRETİM nöbetleri yalnız onarım öncesinde de var olan
//   dış yüzleri kullanır; aynı dosya onarım öncesi ağaçta koşturulduğunda hangi
//   nedenin hangi bayatlığı ürettiği adıyla kırmızı yanar (koşu kaydı).
//   Koşum: cd urun/eklenti && npm test
// ═══════════════════════════════════════════════════════════════════════════

import "./dil-kur.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type * as vscode from "vscode";
import { anadizinBul } from "../../cekirdek/src/denetci.ts";
import { programAl } from "../src/onbellek.ts";
import { açıkBelgeHaritası, diskBelgesi, erisimSiniri, turBelgeleriniTopla, turProgramlariniKur } from "../src/tur-belgesi.ts";
import { turKapsami } from "../src/izleyici-cekirdek.ts";
import { kapsamIcinde, ogeleriTopla } from "../src/yolharitasi-cekirdek.ts";
import { turGoruntusunuUnut, turGoruntusunuYayinla, type TurGoruntusu } from "../src/tur-goruntusu.ts";

// ── 🧱 FİKSTÜR ───────────────────────────────────────────────────────────────

type AdimDurumu = "tamamlandı" | "beklemede";

/** Tek AltKatman altında verilen durumlarda Adımlar taşıyan bir Faz dosyası. */
const planMetni = (önek: string, adımlar: readonly AdimDurumu[]): string =>
  `Faz( kod: FAZ-${önek}, ad: "Fikstür Mevsimi" ) {\n` +
  `  Blok( kod: BLK-${önek}, ad: "Fikstür Bloku" ) {\n` +
  `    Katman( kod: KAT-${önek}, ad: "Fikstür Katmanı" ) {\n` +
  `      AltKatman( kod: ALT-${önek}, ad: "Fikstür Dalı" ) {\n` +
  adımlar.map((d, i) => `        Adım( kod: ${önek}-A${String(i + 1).padStart(2, "0")}, durum: ${d}, ne: "fikstür" )\n`).join("") +
  `      }\n    }\n  }\n}\n`;

/** Beş Adımın ikisi tamam: değişiklikten önceki hâl. */
const ESKİ: readonly AdimDurumu[] = ["tamamlandı", "tamamlandı", "beklemede", "beklemede", "beklemede"];
/** Altı Adımın üçü tamam: başka penceredeki ajanın yazdığı hâl. */
const YENİ: readonly AdimDurumu[] = ["tamamlandı", "tamamlandı", "tamamlandı", "beklemede", "beklemede", "beklemede"];

interface Fikstur {
  readonly ws: string;
  readonly birinci: string;
  readonly ikinci: string;
  readonly birinciPlan: string;
  readonly ikinciPlan: string;
  temizle(): void;
}

function fiksturKur(): Fikstur {
  const ws = mkdtempSync(join(tmpdir(), "sarmal-a18-"));
  const yaz = (göreli: string, metin: string): string => {
    const yol = join(ws, göreli);
    mkdirSync(dirname(yol), { recursive: true });
    writeFileSync(yol, metin, "utf8");
    return yol;
  };
  yaz("birinci/birinci_anadizin.sar", 'Proje( kod: PRJ-BIRINCI, ad: "Birinci" )\n');
  yaz("ikinci/ikinci_anadizin.sar", 'Proje( kod: PRJ-IKINCI, ad: "İkinci" )\n');
  const birinciPlan = yaz("birinci/is/plan/faz/1_ilk.sar", planMetni("BIR", ["tamamlandı", "beklemede"]));
  const ikinciPlan = yaz("ikinci/is/plan/faz/1_ilk.sar", planMetni("IKI", ESKİ));
  return {
    ws, birinci: join(ws, "birinci"), ikinci: join(ws, "ikinci"), birinciPlan, ikinciPlan,
    temizle: () => rmSync(ws, { recursive: true, force: true }),
  };
}

/** Editör DIŞINDAN yazım: diski değiştirir, açık belgeye dokunmaz. */
const dışarıdanYaz = (yol: string, metin: string): void => writeFileSync(yol, metin, "utf8");

/** Çalışma alanındaki bütün `.sar` dosyaları (kabuğun dosya araması). */
function sarDosyaları(kök: string): string[] {
  const çıktı: string[] = [];
  const gez = (d: string): void => {
    for (const g of readdirSync(d, { withFileTypes: true })) {
      const yol = join(d, g.name);
      if (g.isDirectory()) gez(yol);
      else if (g.name.endsWith(".sar")) çıktı.push(yol);
    }
  };
  gez(kök);
  return çıktı.sort();
}

/** Kabuktaki `varlikKoku` işlevinin ikizi: en yakın `*_anadizin.sar` taşıyan üst dizin. */
function varlıkKökü(yol: string): string | undefined {
  let d = dirname(yol);
  for (let i = 0; i < 12; i++) {
    if (anadizinBul(d)) return d;
    const üst = dirname(d);
    if (üst === d) break;
    d = üst;
  }
  return undefined;
}

// ── 📄 VS CODE MODELİNİN SAHTESİ ─────────────────────────────────────────────
//   Açık belge açıldığı andaki metni tutar. Gerçek model editör dışındaki bir
//   yazımı ancak kendi tazeleme döngüsünde okur; nöbet o döngüden ÖNCE koşan
//   turu ölçer. `isDirty` kaydedilmemiş düzenlemeyi temsil eder.

interface SahteBelge {
  readonly uri: vscode.Uri;
  readonly languageId: string;
  readonly isDirty: boolean;
  readonly version: number;
  getText(): string;
  readonly lineCount: number;
  lineAt(satır: number): { readonly text: string };
}

let sürüm = 0;
function belgeAç(yol: string, o: { metin?: string; kirli?: boolean } = {}): SahteBelge {
  const metin = o.metin ?? readFileSync(yol, "utf8");
  const satırlar = metin.split(/\r?\n/);
  sürüm += 1;
  const kimlik = { scheme: "file", fsPath: yol, toString: () => `file://${yol}` } as unknown as vscode.Uri;
  return {
    uri: kimlik, languageId: "sarmal", isDirty: o.kirli ?? false, version: sürüm,
    getText: () => metin, lineCount: satırlar.length,
    lineAt: (satır: number) => ({ text: satırlar[satır] ?? "" }),
  };
}

// ── 🔁 TUR: KABUĞUN SIRASIYLA ────────────────────────────────────────────────

interface TurSonucu {
  readonly goruntu: TurGoruntusu;
  /** Çapraz denetimin koştuğu kökler; `undefined` tam tur demektir. */
  readonly denetlenen: readonly string[] | undefined;
}

/**
 * eklenti.ts `denetleHepsi` gövdesinin saf omurgası. Kapsam kararı onarım
 * öncesinde tek bir kök (dize), onarım sonrasında kök listesi döner; nöbet iki
 * biçimi de aynı listeye indirir ki aynı dosya iki ağaçta da koşabilsin.
 */
async function turKoş(f: Fikstur, o: {
  açık: readonly SahteBelge[];
  tetik: string;
  odak: string;
  değişen?: readonly string[];
}): Promise<TurSonucu> {
  const açıkBelgeler = açıkBelgeHaritası(o.açık);
  const yollar = erisimSiniri(sarDosyaları(f.ws), [f.ws]);
  const kabuk = {
    açıkBelge: (yol: string) => açıkBelgeler.get(yol),
    dilKimliği: (yol: string) => açıkBelgeler.get(yol)?.languageId,
    kaydedilmemisMi: (yol: string) => açıkBelgeler.get(yol)?.isDirty === true,
    oku: async (yol: string) => {
      try {
        const ham = readFileSync(yol);
        return { belge: diskBelgesi({ fsPath: yol } as unknown as vscode.Uri, new TextDecoder("utf-8").decode(ham)), bayt: ham.byteLength };
      } catch { return undefined; }
    },
  };
  const { belgeler, dilDışı } = await turBelgeleriniTopla(yollar, kabuk);
  const programlar = turProgramlariniKur(belgeler, açıkBelgeler,
    (açık) => programAl(açık as unknown as vscode.TextDocument));
  const hamKapsam: unknown = (turKapsami as (...a: unknown[]) => unknown)(
    o.tetik, o.odak, true, [f.ws], o.değişen, varlıkKökü);
  const denetlenen = hamKapsam === undefined ? undefined
    : Array.isArray(hamKapsam) ? (hamKapsam as string[]) : [hamKapsam as string];
  const goruntu = turGoruntusunuYayinla({
    programlar, yollar, belgeler, dilDışı, tetik: o.tetik,
    kapsam: denetlenen as never,
  });
  return { goruntu, denetlenen };
}

/** Bir kökün Adım sayıları, panelin kendi sayacından (`ogeleriTopla`). */
function sayılar(g: TurGoruntusu, kök: string): { tamam: number; toplam: number } {
  let tamam = 0, toplam = 0;
  for (const [yol, program] of g.programlar) {
    if (!kapsamIcinde(yol, kök)) continue;
    for (const öge of ogeleriTopla(program.bildirimler, yol)) { tamam += öge.tamam; toplam += öge.toplam; }
  }
  return { tamam, toplam };
}

/** Kabuğun çapraz önbellek kuralı: dosya denetlenen bir kökün kapsamında mı? */
const çaprazTazelenir = (yol: string, denetlenen: readonly string[] | undefined): boolean =>
  denetlenen === undefined || denetlenen.some((k) => kapsamIcinde(yol, k));

// ── ① YENİDEN ÜRETİM: AÇIK BELGE ÖNCELİĞİ ───────────────────────────────────

test("YENİDEN ÜRETİM ①: kaydedilmemiş değişiklik taşımayan açık belge editör dışından değişince ilk turdan sonraki görüntü YENİ sayıları taşır", async () => {
  turGoruntusunuUnut();
  const f = fiksturKur();
  try {
    // İkinci kökün planı bu pencerede bir sekmede açıktır ve kaydedilmemiş
    // değişiklik taşımaz; odak birinci köktedir.
    const açık = [belgeAç(f.birinciPlan), belgeAç(f.ikinciPlan)];
    const ilk = await turKoş(f, { açık, tetik: "başlangıç", odak: f.birinci });
    assert.deepEqual(sayılar(ilk.goruntu, f.ikinci), { tamam: 2, toplam: 5 }, "fikstürün ilk resmi yanlış kuruldu");

    dışarıdanYaz(f.ikinciPlan, planMetni("IKI", YENİ));
    const ikinci = await turKoş(f, { açık, tetik: "sar-olayı", odak: f.birinci, değişen: [f.ikinciPlan] });
    assert.deepEqual(sayılar(ikinci.goruntu, f.ikinci), { tamam: 3, toplam: 6 },
      "tur, kaydedilmemiş değişiklik taşımayan açık belgenin ESKİ metnini okudu; panel pencere yeniden " +
      "yüklenene dek eski Adım sayısında kalır (aday neden ①: açık belge önceliği)");
  } finally { f.temizle(); }
});

test("YENİDEN ÜRETİM ①: odak kökündeki açık belge de aynı yarışa düşmez (neden ① kapsamdan bağımsızdır)", async () => {
  turGoruntusunuUnut();
  const f = fiksturKur();
  try {
    const açık = [belgeAç(f.birinciPlan)];
    await turKoş(f, { açık, tetik: "başlangıç", odak: f.birinci });
    dışarıdanYaz(f.birinciPlan, planMetni("BIR", ["tamamlandı", "tamamlandı", "beklemede"]));
    const sonra = await turKoş(f, { açık, tetik: "sar-olayı", odak: f.birinci, değişen: [f.birinciPlan] });
    assert.deepEqual(sonra.denetlenen, [f.birinci], "odak içindeki değişiklikte tur odağa daralmadı");
    assert.deepEqual(sayılar(sonra.goruntu, f.birinci), { tamam: 2, toplam: 3 },
      "odak kökünde bile açık belgenin eski metni okundu; neden ① dar kökten bağımsız olarak bayatlık üretir");
  } finally { f.temizle(); }
});

test("YENİDEN ÜRETİM ①: kaydedilmemiş düzenleme taşıyan açık belge bellekten okunur; disk onu ezemez", async () => {
  turGoruntusunuUnut();
  const f = fiksturKur();
  try {
    const kaydedilmemiş = planMetni("IKI", ["tamamlandı", "beklemede"]);
    const açık = [belgeAç(f.birinciPlan), belgeAç(f.ikinciPlan, { metin: kaydedilmemiş, kirli: true })];
    dışarıdanYaz(f.ikinciPlan, planMetni("IKI", YENİ));
    const sonra = await turKoş(f, { açık, tetik: "sar-olayı", odak: f.birinci, değişen: [f.ikinciPlan] });
    assert.deepEqual(sayılar(sonra.goruntu, f.ikinci), { tamam: 1, toplam: 2 },
      "kaydedilmemiş düzenleme diskteki metne ezdirildi; panel kullanıcının GÖRDÜĞÜ metni anlatmaz");
  } finally { f.temizle(); }
});

// ── ② YENİDEN ÜRETİM: ODAKTAN SEÇİLEN DAR KÖK ───────────────────────────────

test("YENİDEN ÜRETİM ②: açık olmayan kardeş kökteki değişiklikte görüntünün sayıları zaten tazedir (neden ② panel sayısını bayatlatmaz)", async () => {
  turGoruntusunuUnut();
  const f = fiksturKur();
  try {
    const açık = [belgeAç(f.birinciPlan)];
    await turKoş(f, { açık, tetik: "başlangıç", odak: f.birinci });
    dışarıdanYaz(f.ikinciPlan, planMetni("IKI", YENİ));
    const sonra = await turKoş(f, { açık, tetik: "sar-olayı", odak: f.birinci, değişen: [f.ikinciPlan] });
    assert.deepEqual(sayılar(sonra.goruntu, f.ikinci), { tamam: 3, toplam: 6 },
      "açık olmayan dosyanın sayısı bayat geldi; belge toplama her turda bütün yolları diskten okumalıydı");
  } finally { f.temizle(); }
});

test("YENİDEN ÜRETİM ②: odak dışı kökteki değişiklik o kökün çapraz denetimine girer", async () => {
  turGoruntusunuUnut();
  const f = fiksturKur();
  try {
    const açık = [belgeAç(f.birinciPlan)];
    dışarıdanYaz(f.ikinciPlan, planMetni("IKI", YENİ));
    const sonra = await turKoş(f, { açık, tetik: "sar-olayı", odak: f.birinci, değişen: [f.ikinciPlan] });
    assert.ok(çaprazTazelenir(f.ikinciPlan, sonra.denetlenen),
      `dar tur yalnız ${JSON.stringify(sonra.denetlenen)} köklerini denetledi; değişen ikinci kökün çapraz ` +
      "tanıları önceki turdan taşınır (aday neden ②: dar kök odaktan seçiliyor)");
    assert.ok(sonra.denetlenen !== undefined,
      "kardeş kökteki tek dosyalık değişiklik bütün çalışma alanını yeniden denetledi; PRF-A06 darlığı kayboldu");
    assert.deepEqual(sonra.denetlenen, [f.birinci, f.ikinci],
      "dar tur odağı ve değişen kökü, bu sırayla ve yalnız onları denetlemiyor");
  } finally { f.temizle(); }
});

// ── ③ SAHA SENARYOSU: İKİ NEDEN BİRLİKTE ─────────────────────────────────────

test("SAHA: odak birinci kökte, ikinci kökün planı açık ve dışarıdan değişiyor; ilk turdan sonra hem sayı hem çapraz denetim tazedir", async () => {
  turGoruntusunuUnut();
  const f = fiksturKur();
  try {
    const açık = [belgeAç(f.birinciPlan), belgeAç(f.ikinciPlan)];
    await turKoş(f, { açık, tetik: "başlangıç", odak: f.birinci });
    dışarıdanYaz(f.ikinciPlan, planMetni("IKI", YENİ));
    const sonra = await turKoş(f, { açık, tetik: "sar-olayı", odak: f.birinci, değişen: [f.ikinciPlan] });
    const sayı = sayılar(sonra.goruntu, f.ikinci);
    const çapraz = çaprazTazelenir(f.ikinciPlan, sonra.denetlenen);
    assert.deepEqual({ sayı, çapraz }, { sayı: { tamam: 3, toplam: 6 }, çapraz: true },
      "saha senaryosu bayat: panel sayısı ve/veya değişen kökün çapraz tanıları pencere yeniden yüklenmeden tazelenmiyor");
  } finally { f.temizle(); }
});

// ── ④ DARLIK KORUNUR ─────────────────────────────────────────────────────────

test("DARLIK: odak içindeki tek dosyalık değişiklikte tur yine YALNIZ odağa daralır", async () => {
  turGoruntusunuUnut();
  const f = fiksturKur();
  try {
    const sonra = await turKoş(f, { açık: [], tetik: "sar-olayı", odak: f.birinci, değişen: [f.birinciPlan] });
    assert.deepEqual(sonra.denetlenen, [f.birinci],
      "odak içindeki tek dosyalık değişiklik odağın dışına taştı ya da tam tura döndü; PRF-A06 maliyeti geri gelir");
    assert.equal(çaprazTazelenir(f.ikinciPlan, sonra.denetlenen), false,
      "odak içindeki değişiklikte kardeş kök de denetlendi; dar tur darlığını kaybetti");
  } finally { f.temizle(); }
});

// ── ⑤ KAYNAK: KABUK KARARI SAF MODÜLE BAĞLAR ────────────────────────────────
//   Saf modülün doğru olması kabuğun onu doğru bağladığını kanıtlamaz; tek satırlık
//   bir geri alma (`isDirty` yerine sabit, mutlak yol yerine göreli yol, değişen
//   yolların düşürülmesi) bayatlığı geri getirir ve yukarıdaki nöbetlerin hiçbiri
//   onu görmez. Desen tur-belgesi.test.ts ⑧ KAYNAK nöbetinin ikizidir.

const EKLENTI_KAYNAK = readFileSync(fileURLToPath(new URL("../src/eklenti.ts", import.meta.url)), "utf8");

function denetleHepsiGövdesi(): string {
  const baş = EKLENTI_KAYNAK.indexOf("const denetleHepsi");
  const son = EKLENTI_KAYNAK.indexOf("const denetimKilidi", baş);
  assert.ok(baş >= 0 && son > baş, "denetleHepsi gövdesi bulunamadı; nöbet boşlukta ölçüm yapamaz");
  return EKLENTI_KAYNAK.slice(baş, son);
}

test("KAYNAK: kabuk açık belgenin kaydedilmemiş değişiklik bilgisini belge toplamaya verir", () => {
  assert.ok(/kaydedilmemisMi:\s*\(fsPath\)\s*=>\s*açıkBelgeler\.get\(fsPath\)\?\.isDirty === true/.test(denetleHepsiGövdesi()),
    "kabuk `isDirty` bilgisini belge toplamaya vermiyor; açık belge önceliği yeniden koşulsuz olur ve panel bayatlar");
});

test("KAYNAK: tur değişen yolları alır ve kapsam kararına varlık kökü çözücüsüyle birlikte verir", () => {
  const gövde = denetleHepsiGövdesi();
  assert.ok(/const denetleHepsi = async \(tetik = "\?", degisenYollar\?: readonly string\[\]\)/.test(gövde),
    "denetleHepsi değişen yolları almıyor; kilit onları taşısa bile tur odaktan daralır");
  assert.ok(/turKapsami\(\s*tetik, aktifVarlik, odakAcik\(\),\s*[^;]*degisenYollar, varlikKoku\)/.test(gövde),
    "kapsam kararı değişen yolları ya da varlık kökü çözücüsünü almıyor; dar kök yeniden odaktan seçilir");
  assert.ok(gövde.includes("caprazYenidenHesaplanir(fsPath, darKokler)"),
    "çapraz önbellek kuralı saf karardan okunmuyor; denetlenen kökün dosyaları da önceki turdan taşınabilir");
  assert.ok(/kapsam: darKokler\b/.test(gövde),
    "görüntü ya da mercek gerçekten denetlenen kökleri taşımıyor");
});

test("KAYNAK: olay hatları değişen dosyanın MUTLAK yolunu tura taşır ve kilit onu tura verir", () => {
  assert.ok(/const diskDegisti = \(u: vscode\.Uri\): void => diskHatti\.olay\(goreliYol\(u\), "disk-olayı", u\.fsPath\);/.test(EKLENTI_KAYNAK),
    "disk hattı değişen yolu tura taşımıyor; klasör olayı kardeş kökte olsa da tur odağa daralır");
  assert.ok(/const sarDegisti = \(u: vscode\.Uri\): void => sarHatti\.olay\(goreliYol\(u\), "sar-olayı", u\.fsPath\);/.test(EKLENTI_KAYNAK),
    ".sar hattı değişen yolu tura taşımıyor; kardeş kökteki değişiklik yeniden odaktan daralır");
  const istekler = EKLENTI_KAYNAK.match(/iste: \(tetik, yollar\) => denetimKilidi\.iste\(tetik, yollar\)/g) ?? [];
  assert.equal(istekler.length, 2, "iki olay hattından biri değişen yolları kilide vermiyor");
});

// ═══════════════════════════════════════════════════════════════════════════
// parametre-dekor.test.ts — Parametre simge dekorasyonu NÖBETİ (VIT-KIMLIK-A08)
//
//   Amaç:   Founder 2026-08-30 isteği: aile simgeleri editörde, ilgili
//           oldukları parametrelerin yanında görünür. Bu nöbet dört şeyi ölçer:
//           eşlemedeki her parametre satırı simge alır ve kapsam çizelgeyle
//           eşittir (mutasyonla kanıtlı); eşleme yalnız çizelgede yaşar ve
//           değerleri raftaki aile üyeleridir; dekorasyon dosyanın tek baytını
//           değiştirmez (sha256); karar yalnız görünür aralık için verilir ve
//           tazeleme gecikmelidir. Görünüm kanıtı olarak örnek belgenin bütün
//           satır listesi (konum, simge, iki temanın varyant yolu) sabitlenir.
//   Kapsam: simge-cizelgesi.ts PARAMETRE HANESİ · eklenti.ts kaydı.
//   Kapsam DIŞI: canlı pencerede görünüm; o doğrulama Founder'ın gözüdür ve
//           hiçbir sınama onun yerine geçmez (Adımın dördüncü kabul maddesi).
// ═══════════════════════════════════════════════════════════════════════════
import "./dil-kur.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as beklet } from "node:timers/promises";
import { belirtecle } from "../../cekirdek/src/belirtec.ts";
import { ayristir } from "../../cekirdek/src/ayristirici.ts";
import type { Program } from "../../cekirdek/src/sozdizim.ts";
import {
  PARAMETRE_SIMGESI, PARAMETRE_ANLAMI, SATIR_SIMGELERI, ARAYUZ_ISARETI,
  parametreDekorKararlari, parametreDekorKaydi, parametreSvgVaryanti, payliAraliklar,
  satirSvgVaryanti, type SatirSimgesi, type DekorOlcumu,
} from "../src/simge-cizelgesi.ts";
import { IZ_METINLERI } from "../src/yuzey-metinleri.ts";

const KOK = fileURLToPath(new URL("..", import.meta.url));
const DEPO = fileURLToPath(new URL("../../..", import.meta.url));
const sha256 = (veri: Uint8Array): string => createHash("sha256").update(veri).digest("hex");
const programla = (kaynak: string): Program => ayristir(belirtecle(kaynak));
const tumu = (kaynak: string): { satirOku: (n: number) => string | undefined; aralik: { bas: number; son: number }[] } => {
  const satirlar = kaynak.split("\n");
  return { satirOku: (n) => satirlar[n], aralik: [{ bas: 0, son: satirlar.length - 1 }] };
};

// Örnek belge: çizelgedeki on bir parametrenin her biri bir kez SATIR BAŞINDA
// geçer. Ayrıca dekor ALMAMASI gereken dört durum taşır: satırın ilk sözcüğü
// olmayan parametre (satır 13'teki `referans`), çizelge dışı parametre (`ne`,
// `kod`, `durum`), dizgi içinde geçen parametre adı ve yorumdaki parametre adı.
const ORNEK = [
  "Blok( kod: BLK-1 ) {",                                              // 0
  "  Adım( kod: ADM-1, durum: beklemede,",                             // 1
  "    bağımlı: [ ADM-0 ],",                                           // 2
  "    referans: [ KRL-1 ],",                                          // 3
  '    ne: "görev: bu dizgide içeriktir, dekor almaz" ) {',            // 4
  '    görev: [ "sınır: dizgi içi ad dekor almaz" ]',                  // 5
  '    kabul: [ "ölçüt" ]',                                            // 6
  '    sınır: "kapsam"',                                               // 7
  '    dokunulmaz: [ "dosya.ts" ]',                                    // 8
  '    yama: "yama notu"',                                             // 9
  '    rapor: "rapor notu"',                                           // 10
  '    koşu: Koşum( kod: KSM-1,',                                      // 11
  '      tarih: "2026-10-10", karar: kabul )',                         // 12
  "    // kabul: yorumdaki ad düzyazıdır, dekor almaz",                // 13
  "  }",                                                               // 14
  "  Adım( kod: ADM-0, durum: tamamlandı, referans: [ KRL-1 ] )",      // 15
  "  Beceri( kod: BCR-1 ) {",                                          // 16
  '    kurallar: [ "kural" ]',                                         // 17
  "  }",                                                               // 18
  "}",                                                                 // 19
].join("\n");

/** Görünüm kanıtı: örnek belgenin dekor alan satırlarının TAM listesi
 *  (satır, sütun başı, sütun sonu, parametre, simge). Liste değişirse Founder'ın
 *  editörde göreceği görüntü değişmiş demektir ve bu bilinçli olmalıdır. */
const BEKLENEN_SATIRLAR: ReadonlyArray<[number, number, number, string, SatirSimgesi]> = [
  [2, 4, 11, "bağımlı", "baglanti-geri"],
  [3, 4, 12, "referans", "referans"],
  [5, 4, 9, "görev", "gorev"],
  [6, 4, 9, "kabul", "kabul"],
  [7, 4, 9, "sınır", "sinir"],
  [8, 4, 14, "dokunulmaz", "dokunulmaz"],
  [9, 4, 8, "yama", "yama"],
  [10, 4, 9, "rapor", "dosya"],
  [11, 4, 8, "koşu", "kosum"],
  [12, 6, 11, "tarih", "zaman"],
  [17, 4, 12, "kurallar", "kural"],
];

test("A08 görünüm kanıtı: örnek belgenin dekor satır listesi (konum · parametre · simge) birebir sabittir", () => {
  const { satirOku, aralik } = tumu(ORNEK);
  const kararlar = parametreDekorKararlari(programla(ORNEK), satirOku, aralik);
  assert.deepEqual(
    kararlar.map((k) => [k.satir, k.baslangic, k.bitis, k.parametre, k.simge]),
    BEKLENEN_SATIRLAR,
    "A08 nöbeti: parametre dekor satırları beklenen görüntüden saptı");
  // Her karar parametre adının kendi dilimine oturur.
  const satirlar = ORNEK.split("\n");
  for (const k of kararlar) {
    assert.equal(satirlar[k.satir].slice(k.baslangic, k.bitis), k.parametre,
      `A08 nöbeti: ${k.parametre} kararı adın dilimine oturmuyor`);
  }
});

test("A08 kapsam: eşlemedeki her parametre simge alır ve kapsam çizelgeyle EŞİTTİR — mutasyonla kanıtlı", () => {
  const { satirOku, aralik } = tumu(ORNEK);
  const bekci = (cizelge?: Readonly<Record<string, SatirSimgesi>>): void => {
    const kararlar = parametreDekorKararlari(programla(ORNEK), satirOku, aralik, cizelge);
    assert.deepEqual(new Set(kararlar.map((k) => k.parametre)), new Set(Object.keys(PARAMETRE_SIMGESI)),
      "A08 nöbeti: dekor alan parametre kümesi çizelgenin (PARAMETRE_SIMGESI) kapsamından ayrıştı");
  };
  bekci();
  // Mutasyon: çizelgeden bir ad düşürülünce kapsam nöbeti kırmızıya döner.
  const { kabul: _dusen, ...eksik } = PARAMETRE_SIMGESI;
  assert.throws(() => bekci(eksik), /PARAMETRE_SIMGESI/u,
    "A08 nöbeti: eksik-ad mutasyonu kapsam nöbetinden sessizce geçti");
  // Mutasyon: çizelgeye fazladan ad eklenince de kırmızıya döner (ne: satırı dekor alır).
  assert.throws(() => bekci({ ...PARAMETRE_SIMGESI, ne: "belge" }), /PARAMETRE_SIMGESI/u,
    "A08 nöbeti: fazla-ad mutasyonu kapsam nöbetinden sessizce geçti");
});

test("A08 dışlama: satır başında olmayan, çizelge dışı, dizgi ve yorum içindeki ad simge almaz", () => {
  const { satirOku, aralik } = tumu(ORNEK);
  const satirlar = new Set(parametreDekorKararlari(programla(ORNEK), satirOku, aralik).map((k) => k.satir));
  for (const [satir, neden] of [
    [0, "çizelge dışı kod"], [1, "çizelge dışı kod ve durum"], [4, "çizelge dışı ne; dizgi içi görev"],
    [13, "yorumdaki kabul"], [15, "satır başında olmayan referans"], [16, "çizelge dışı kod"],
  ] as const) {
    assert.ok(!satirlar.has(satir), `A08 nöbeti: satır ${satir} dekor aldı (${neden})`);
  }
});

test("A08 tek kaynak: çizelge değerleri raftaki aile üyeleridir, varyantlar diskte yaşar ve aile genişletilmez", () => {
  const aile = new Set<string>(SATIR_SIMGELERI);
  for (const [ad, simge] of Object.entries(PARAMETRE_SIMGESI)) {
    assert.ok(aile.has(simge), `A08 nöbeti: '${ad}' parametresinin simgesi '${simge}' ailede yok`);
    for (const tema of ["acik", "koyu"] as const) {
      const yol = parametreSvgVaryanti(simge, tema);
      assert.equal(yol, satirSvgVaryanti(simge, PARAMETRE_ANLAMI, tema),
        "A08 nöbeti: parametre varyantı satır hanesinin yol üreticisinden sapmış");
      assert.ok(existsSync(join(KOK, yol)), `A08 nöbeti: ${yol} diskte yok ("npm run build" üretir)`);
    }
  }
  // Koni kartında aynı alanın simgesi ile editördeki simge aynıdır: kartın
  // alan başlıkları ARAYUZ_ISARETI'nden okunur ve iki yüz ayrışmamalıdır.
  const kartAlanlari = new Set(Object.values(ARAYUZ_ISARETI));
  for (const ad of ["görev", "sınır", "dokunulmaz", "referans", "kabul", "yama"] as const) {
    assert.ok(kartAlanlari.has(PARAMETRE_SIMGESI[ad]),
      `A08 nöbeti: '${ad}' editörde koni kartından farklı bir simgeyle görünür`);
  }
});

test("A08 tek kaynak: eşleme kodda yazılmaz — kayıt ve karar gövdeleri hiçbir parametre adını dizgi olarak taşımaz", () => {
  const kaynak = readFileSync(join(KOK, "src/simge-cizelgesi.ts"), "utf8");
  const bas = kaynak.indexOf("export function parametreDekorKararlari(");
  const son = kaynak.indexOf("// ── WEBVIEW HANESİ");
  assert.ok(bas > 0 && son > bas, "A08 nöbeti: parametre hanesinin karar ve kayıt gövdesi bulunamadı");
  const govde = kaynak.slice(bas, son);
  const eklenti = readFileSync(join(KOK, "src/eklenti.ts"), "utf8");
  for (const ad of Object.keys(PARAMETRE_SIMGESI)) {
    for (const [yer, metin] of [["simge-cizelgesi gövdesi", govde], ["eklenti.ts", eklenti]] as const) {
      assert.ok(!metin.includes(`"${ad}"`) && !metin.includes(`'${ad}'`),
        `A08 nöbeti: '${ad}' eşlemesi ${yer} içinde elle yazılmış; tek kaynak çizelgedir`);
    }
  }
});

test("A08 görünür aralık: karar yalnız verilen aralıktaki satırlar için verilir; pay bir ekrandır ve belgeye kırpılır", () => {
  const { satirOku } = tumu(ORNEK);
  const program = programla(ORNEK);
  const kararlar = parametreDekorKararlari(program, satirOku, [{ bas: 5, son: 8 }]);
  assert.deepEqual(kararlar.map((k) => k.satir), [5, 6, 7, 8],
    "A08 nöbeti: görünür aralık dışındaki satır karar aldı ya da içerideki atlandı");
  // Aralık dışı satır OKUNMAZ: satır okuyucu aralık dışında çağrılırsa nöbet düşer.
  const okunan = new Set<number>();
  parametreDekorKararlari(program, (n) => { okunan.add(n); return satirOku(n); }, [{ bas: 5, son: 8 }]);
  for (const n of okunan) assert.ok(n >= 5 && n <= 8, `A08 nöbeti: görünür aralık dışındaki satır ${n} okundu`);
  assert.deepEqual(parametreDekorKararlari(program, satirOku, []), [],
    "A08 nöbeti: görünür aralık yokken karar verildi");
  assert.deepEqual(payliAraliklar([{ bas: 10, son: 19 }], 100), [{ bas: 0, son: 29 }]);
  assert.deepEqual(payliAraliklar([{ bas: 80, son: 89 }], 95), [{ bas: 70, son: 94 }]);
});

test("A08 dayanıklılık: bozuk ya da geçici belgede program yoksa kare dekorsuzdur", () => {
  assert.deepEqual(parametreDekorKararlari(undefined, () => "görev:", [{ bas: 0, son: 0 }]), []);
});

// ── Kayıt boru hattı: sahte kabuk + gerçek diskteki üretilmiş varyantlar ─────

class SahteUri {
  readonly fsPath: string;
  constructor(fsPath: string) { this.fsPath = fsPath; }
  toString(): string { return this.fsPath; }
}
interface SahteDekor {
  range: { sb: number; bb: number; ss: number; bs: number };
  renderOptions: {
    light: { before: { contentIconPath: SahteUri } };
    dark: { before: { contentIconPath: SahteUri } };
  };
}

function kabukKur(metinOku: () => string, gorunur: { bas: number; son: number }): {
  kabuk: unknown;
  context: { subscriptions: Array<{ dispose(): void }>; extensionUri: SahteUri };
  boyamalar: SahteDekor[][];
  belgeDegisti: () => void;
  kaydir: () => void;
} {
  const boyamalar: SahteDekor[][] = [];
  const satirlar = (): string[] => metinOku().split("\n");
  const belge = {
    languageId: "sarmal",
    version: 1,
    uri: { toString: () => `sahte:parametre-dekor-${Math.random()}` },
    getText: metinOku,
    get lineCount(): number { return satirlar().length; },
    lineAt: (n: number) => ({ text: satirlar()[n] }),
  };
  const editor = {
    document: belge,
    visibleRanges: [{ start: { line: gorunur.bas }, end: { line: gorunur.son } }],
    setDecorations: (_tur: unknown, dekor: SahteDekor[]): void => { boyamalar.push(dekor); },
  };
  const abonelik = { dispose(): void { /* sınama kabuğu */ } };
  let belgeDinleyici: ((olay: { document: typeof belge }) => void) | undefined;
  let kaydirmaDinleyici: ((olay: { textEditor: typeof editor }) => void) | undefined;
  const kabuk = {
    DecorationRangeBehavior: { ClosedClosed: 0 },
    Range: class {
      readonly sb: number; readonly bb: number; readonly ss: number; readonly bs: number;
      constructor(sb: number, bb: number, ss: number, bs: number) {
        this.sb = sb; this.bb = bb; this.ss = ss; this.bs = bs;
      }
    },
    Uri: { joinPath: (kok: SahteUri, ...parcalar: string[]) => new SahteUri(join(kok.fsPath, ...parcalar)) },
    window: {
      visibleTextEditors: [editor],
      createTextEditorDecorationType: () => abonelik,
      onDidChangeVisibleTextEditors: () => abonelik,
      onDidChangeTextEditorVisibleRanges: (f: (olay: { textEditor: typeof editor }) => void) => {
        kaydirmaDinleyici = f;
        return abonelik;
      },
    },
    workspace: {
      onDidChangeTextDocument: (f: (olay: { document: typeof belge }) => void) => {
        belgeDinleyici = f;
        return abonelik;
      },
    },
  };
  return {
    kabuk,
    context: { subscriptions: [], extensionUri: new SahteUri(KOK) },
    boyamalar,
    belgeDegisti: () => belgeDinleyici?.({ document: belge }),
    kaydir: () => kaydirmaDinleyici?.({ textEditor: editor }),
  };
}

test("A08 sha256 + tek kaynak: boru hattı her satırı diskteki varyantla boyar, ölçüm bildirir ve dosyanın TEK BAYTINI değiştirmez", () => {
  const dizin = mkdtempSync(join(tmpdir(), "sarmal-parametre-dekor-"));
  const dosya = join(dizin, "ornek.sar");
  try {
    writeFileSync(dosya, ORNEK, "utf8");
    const once = readFileSync(dosya);
    const onceSha = sha256(once);

    const olcumler: DekorOlcumu[] = [];
    const { kabuk, context, boyamalar } = kabukKur(() => readFileSync(dosya, "utf8"), { bas: 0, son: 19 });
    parametreDekorKaydi(
      context as unknown as import("vscode").ExtensionContext,
      kabuk as unknown as typeof import("vscode"),
      (o) => olcumler.push(o),
    );
    assert.equal(boyamalar.length, 1, "A08 nöbeti: kayıt açılışta görünen editörü BİR kez boyamalı");
    const dekorlar = boyamalar[0];
    assert.equal(dekorlar.length, BEKLENEN_SATIRLAR.length, "A08 nöbeti: boyanan dekor sayısı görünüm kanıtından sapmış");
    for (const [i, [satir, bas, son, , simge]] of BEKLENEN_SATIRLAR.entries()) {
      const d = dekorlar[i];
      assert.deepEqual([d.range.sb, d.range.bb, d.range.ss, d.range.bs], [satir, bas, satir, son]);
      for (const [tema, kanal] of [["acik", "light"], ["koyu", "dark"]] as const) {
        const yol = d.renderOptions[kanal].before.contentIconPath.fsPath;
        assert.equal(yol, join(KOK, parametreSvgVaryanti(simge, tema)),
          `A08 nöbeti: satır ${satir} ${kanal} simge yolu çizelgeden sapmış`);
        assert.ok(existsSync(yol), `A08 nöbeti: ${yol} diskte yok`);
      }
    }
    // Ölçüm kanala düşecek biçimde bildirilir.
    assert.equal(olcumler.length, 1, "A08 nöbeti: boyama ölçümü bildirilmedi");
    assert.equal(olcumler[0].tetik, "acilis");
    assert.equal(olcumler[0].simge, BEKLENEN_SATIRLAR.length);
    assert.ok(olcumler[0].sureMs >= 0);
    assert.match(IZ_METINLERI.dekorTuru({ saat: "12:00:00", sure: 0.5, simge: 11, satir: 20, tetik: "acilis" }),
      /parametre dekoru: 0\.50 ms · 11 simge · 20 satır · tetik=acilis/u);

    const sonra = readFileSync(dosya);
    assert.equal(sha256(sonra), onceSha, "A08 nöbeti: dekorasyon diskteki SHA-256 özetini değiştirdi");
    assert.deepEqual(sonra, once, "A08 nöbeti: dekorasyon kaynak baytlarını değiştirdi");
    for (const a of context.subscriptions) a.dispose();
  } finally {
    rmSync(dizin, { recursive: true, force: true });
  }
});

test("A08 gecikme: art arda belge değişimi ve kaydırma tek boyamaya iner (kasma regresyonu kilidi)", async () => {
  const { kabuk, context, boyamalar, belgeDegisti, kaydir } = kabukKur(() => ORNEK, { bas: 0, son: 19 });
  parametreDekorKaydi(
    context as unknown as import("vscode").ExtensionContext,
    kabuk as unknown as typeof import("vscode"),
    undefined, 20, 20,
  );
  assert.equal(boyamalar.length, 1);
  belgeDegisti(); belgeDegisti(); belgeDegisti();
  kaydir(); kaydir(); kaydir();
  assert.equal(boyamalar.length, 1, "A08 nöbeti: tuş vuruşu ya da kaydırma ANINDA boyama tetikledi");
  await beklet(70);
  assert.equal(boyamalar.length, 3, "A08 nöbeti: belge ve kaydırma dalgaları birer boyamaya inmeli");
  for (const a of context.subscriptions) a.dispose();
});

// ── Performans bütçesi (OZK-12: ana iş parçacığında en uzun bölünmez blok 16 ms) ──
//    Büyük bir gerçek plan dosyasında görünür aralık boyaması ölçülür. Program
//    önbellekten geldiği için ayrıştırma bu ölçümün dışındadır (A06 ile ortak
//    önbellek); ölçülen, dekorasyonun kendi ek maliyetidir.
test("A08 performans: büyük plan dosyasında görünür aralık kararı 16 ms bütçesinin belirgin altındadır", () => {
  const yol = join(DEPO, "is/plan/faz/5_eylul_lansman.sar");
  const kaynak = readFileSync(yol, "utf8");
  const satirlar = kaynak.split("\n");
  const program = programla(kaynak);
  const satirOku = (n: number): string | undefined => satirlar[n];
  const orta = Math.floor(satirlar.length / 2);
  const aralik = payliAraliklar([{ bas: orta, son: orta + 59 }], satirlar.length);
  const sureler: number[] = [];
  for (let i = 0; i < 30; i++) {
    const bas = performance.now();
    parametreDekorKararlari(program, satirOku, aralik);
    sureler.push(performance.now() - bas);
  }
  sureler.sort((a, b) => a - b);
  const p95 = sureler[Math.floor(sureler.length * 0.95) - 1];
  assert.ok(p95 < 16, `A08 nöbeti: görünür aralık kararı p95 ${p95.toFixed(2)} ms — 16 ms bütçesi aşıldı`);
});

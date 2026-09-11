// ═══════════════════════════════════════════════════════════════════════════
// gezinme-reddi.test.ts — 🚧 GEZİNME REDDİNİN SEBEBİ NÖBETİ (VIT-K78-A09)
//
//   ADIMIN ÖLÇÜSÜ İKİ CÜMLEDİR. Birincisi: "üç ret sebebinin her biri fikstürde
//   KENDİ cümlesini üretir". İkincisi: "tanımlı kodda HİÇBİR bildirim doğmaz".
//   Bu dosya ikisini de fikstürle ölçer ve üçüncü bir şey iddia etmez.
//
//   NÖBETİN ERİŞİMİ ÜÇ KATLIDIR:
//     ① SEBEP KARARI — saf çekirdek (gezinme-cekirdek.ts) üç sebebi birbirinden
//        ayırır; tanımlı kodda ve ağaçta izi olmayan sözcede SUSAR.
//     ② CÜMLE AYRIMI — üç sebep üç AYRI cümle üretir; iki sebep aynı cümleye
//        düşerse kullanıcı hangi kuralın çalıştığını yine öğrenemez ve Adımın
//        çözdüğü kusur ad değiştirerek yaşamaya devam eder. Cümleler ayrıca
//        dayanaklarını anar (OGR-5 · STR-3 · MIM-1.1).
//     ③ KABLO — saf karar doğru olsa bile kabuk onu ÇAĞIRMAZSA yüzey yine
//        sessiz kalır. Editör kabuğu bu süitte koşamadığı için kablo, kabuğun
//        KAYNAK METNİNDEN ölçülür (tur-erisim.test.ts emsali).
//
//   RET KURALLARI BU DOSYADA DEĞİŞMEZ: burada yalnız sebebin görünür kılındığı
//   ölçülür. Tanımlı kodun gezinme davranışı Adımın sınırıyla korunmaktadır.
//   Koşum: cd urun/eklenti && npm test
// ═══════════════════════════════════════════════════════════════════════════
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  gezinmeRetSebebi, type GezinmeRetGirdisi, type GezinmeRetSebebi,
} from "../src/gezinme-cekirdek.ts";
import { gezinmeRetCumlesi } from "../src/yuzey-metinleri.ts";

const burasi = dirname(fileURLToPath(import.meta.url));
const oku = (gorece: string): string => readFileSync(join(burasi, gorece), "utf8");

// ── FİKSTÜR EVRENİ ─────────────────────────────────────────────────────────
//   İki varlık kökü ve bir öğreti rafı. Yollar gerçek depo düzenini taklit eder
//   ki `DERS_DUNYASI` deseni fikstürde de gerçekteki gibi demirlensin: desen
//   `ogreti/` kitaplığına bağlıdır, gelişigüzel bir `ornek/` klasörüne değil.
const ACIK_KAYNAK   = "/ws/sarmal/urun/eklenti/src/gezinme.ts";
const ACIK_TANIM    = "/ws/sarmal/is/plan/blok/vitrin_ui.sar";
const DERS_TANIMI   = "/ws/sarmal/ogreti/ornek/gercek/adim_a01.sar";
const KAPALI_TANIM  = "/ws/kapali/is/plan/kadro.sar";

/** Fikstür varlık çözücüsü — kabuğun disk yürüyüşünün yerine geçen saf ikizi. */
const varlikKoku = (yol: string): string | undefined => {
  if (yol.startsWith("/ws/sarmal/")) return "/ws/sarmal";
  if (yol.startsWith("/ws/kapali/")) return "/ws/kapali";
  return undefined;
};

const girdi = (parca: Partial<GezinmeRetGirdisi>): GezinmeRetGirdisi => ({
  kaynakYolu: ACIK_KAYNAK,
  gorunenSayi: 0,
  tumTanimlar: [],
  atifVar: true,
  varlikKoku,
  ...parca,
});

// ═══════════════════════════════════════════════════════════════════════════
// ① ÜÇ SEBEP AYRI AYRI ÖLÇÜLÜR
// ═══════════════════════════════════════════════════════════════════════════

test("RET ①: başka varlığın kökündeki tanım varlık sınırı sebebini üretir", () => {
  assert.equal(gezinmeRetSebebi(girdi({ tumTanimlar: [KAPALI_TANIM] })), "varlık-sınırı");
});

test("RET ②: öğreti rafındaki tanım ders dünyası sebebini üretir", () => {
  assert.equal(gezinmeRetSebebi(girdi({ tumTanimlar: [DERS_TANIMI] })), "ders-dünyası");
});

test("RET ③: hiç tanımı olmayan fakat metin atfı bulunan kod tanım yokluğunu üretir", () => {
  assert.equal(gezinmeRetSebebi(girdi({ tumTanimlar: [], atifVar: true })), "tanım-yok");
});

// ═══════════════════════════════════════════════════════════════════════════
// ② SUSMANIN İKİ MEŞRU HÂLİ — Adımın ikinci kabul ölçütü
// ═══════════════════════════════════════════════════════════════════════════

test("TANIMLI KOD: gezinme gerçekleştiğinde HİÇBİR bildirim doğmaz", () => {
  assert.equal(
    gezinmeRetSebebi(girdi({ gorunenSayi: 1, tumTanimlar: [ACIK_TANIM] })),
    undefined,
    "tanımı bulunan kodda bildirim doğdu; Adımın sınırı gezinme davranışının değişmemesini şart koşar",
  );
});

test("SIRADAN SÖZCÜK: ağaçta hiç izi olmayan sözcede yüzey susar (gürültü basılmaz)", () => {
  assert.equal(gezinmeRetSebebi(girdi({ tumTanimlar: [], atifVar: false })), undefined);
});

test("KAYNAĞIN KENDİSİ ret sebebi üretemez — süzgeç onu her zaman geçirir", () => {
  // Kaynak dosyanın kendi tanımı elenmiş olamaz; ona bakıp sebep uydurmak
  // kullanıcıya var olmayan bir kuralı öğretirdi.
  assert.equal(gezinmeRetSebebi(girdi({ tumTanimlar: [ACIK_KAYNAK] })), undefined);
});

test("DERS KAYNAĞI kendi evreninde serbesttir — ders rafından ders rafına ret doğmaz", () => {
  assert.equal(
    gezinmeRetSebebi(girdi({ kaynakYolu: DERS_TANIMI, tumTanimlar: [DERS_TANIMI + "x"] })),
    undefined,
  );
});

test("KÖKSÜZ KAYNAK varlık sınırı çizmez — sınır yoksa sebep de yoktur", () => {
  assert.equal(
    gezinmeRetSebebi(girdi({ kaynakYolu: "/tmp/serbest.sar", tumTanimlar: [KAPALI_TANIM] })),
    undefined,
  );
});

test("SIRA MEKANİZMANIN SIRASIDIR: ders rafı varlık sınırından önce sorulur", () => {
  // Süzgeç (`gezinmeSuzgeci`) önce ders dünyasını, sonra varlığı sorar. Basılan
  // cümle ile fiilen uygulanan kural çelişemez.
  assert.equal(
    gezinmeRetSebebi(girdi({ tumTanimlar: ["/ws/kapali/ogreti/ornek/x.sar"] })),
    "ders-dünyası",
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// ③ ÜÇ SEBEP ÜÇ AYRI CÜMLE ÜRETİR VE DAYANAĞINI ANAR
// ═══════════════════════════════════════════════════════════════════════════

test("CÜMLE AYRIMI: üç sebep üç FARKLI cümle üretir ve kodu adıyla anar", () => {
  const sebepler: GezinmeRetSebebi[] = ["ders-dünyası", "varlık-sınırı", "tanım-yok"];
  const cumleler = sebepler.map((s) => gezinmeRetCumlesi(s, "VIT-K78-A09"));
  assert.equal(new Set(cumleler).size, 3,
    "iki sebep aynı cümleye düştü; kullanıcı hangi kuralın çalıştığını yine öğrenemez");
  for (const c of cumleler) {
    assert.ok(c.includes("VIT-K78-A09"), `cümle kodu anmıyor: ${c}`);
    assert.ok(c.trim().length > 0 && !c.includes("\n"), `cümle tek satır değil: ${c}`);
  }
});

test("DAYANAK: iki kural cümlesi kanon maddesini anar", () => {
  assert.match(gezinmeRetCumlesi("ders-dünyası", "KOD-X"), /OGR-5/);
  assert.match(gezinmeRetCumlesi("varlık-sınırı", "KOD-X"), /STR-3/);
  assert.match(gezinmeRetCumlesi("varlık-sınırı", "KOD-X"), /MIM-1\.1/);
});

// ═══════════════════════════════════════════════════════════════════════════
// ④ KABLO — kabuk saf kararı GERÇEKTEN çağırır
// ═══════════════════════════════════════════════════════════════════════════

test("KABLO: tanıma-git sağlayıcısı ret ölçümünü çağırır ve cümleyi yüzeye basar", () => {
  const kaynak = oku("../src/gezinme.ts");
  assert.ok(kaynak.includes("gezinmeRetSebebi"),
    "gezinme.ts saf ret ölçümünü hiç çağırmıyor; karar doğru olsa da yüzey sessiz kalır");
  assert.ok(kaynak.includes("gezinmeRetCumlesi"),
    "gezinme.ts sebebi cümleye çevirmiyor; kabuk kendi metnini yazarsa iki dil ayrışır");
  assert.ok(/registerDefinitionProvider[\s\S]*?retBildir\(/.test(kaynak),
    "ret bildirimi tanıma-git sağlayıcısının içinden çağrılmıyor");
  assert.ok(kaynak.includes("showInformationMessage(gezinmeRetCumlesi("),
    "cümle bilgi düzeyli bildirim yüzeyine basılmıyor (YUZ-3.3: bilgi → Bildirimler)");
});

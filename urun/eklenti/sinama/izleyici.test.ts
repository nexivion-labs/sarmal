// ═══════════════════════════════════════════════════════════════════════════
// izleyici.test.ts — 🧯 İzleyici çekirdeği sınamaları (PRF-A02 · VS Code'suz)
//
//   Sol RED-1 P2/K3 onarımı: önce/sonra kanıtı artık SENTETİK YOL SINIFLAMASI
//   değildir — GERÇEK olay hattı (OlayHatti: süzgeç + geciktirme) sahte-
//   zamanlayıcıyla koşturulur ve fiilî denetim-tetik sayısı ölçülür.
//   ① süzgeç sınıflaması (dar iddia)  ② gerçek hat benzetimi (tetik sayımı)
//   ③ tek-uçuş kilidi (üst üste binmez · istek kaybolmaz · çöküş raporlanır)
// ═══════════════════════════════════════════════════════════════════════════

import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { gurultuMu, sarGurultuMu, SAR_DISLANANLAR, TARAMA_DISLAMA_GLOB, OlayHatti, TekUcusKilidi, istekleriBirlestir } from "../src/izleyici-cekirdek.ts";
import { planYolu } from "../../cekirdek/sinama/dogus-agaci.ts";

// Meşru plan yolları doğuşun plan rafından türetilir (HST-MTR-A07).
const PLAN_TURU = planYolu("performans_turu.sar");

// ── ① Süzgeç sınıflaması (iddia dardır: yol sınıflaması, tetik sayımı değil) ──

test("süzgeç: gizli dizinler ve araç/derleme çıktıları gürültüdür; meşru yollar değildir", () => {
  for (const yol of [
    ".git/index.lock", ".git/objects/pack/tmp_pack_abc", ".sarmal/trace/kosu-1.jsonl",
    "eklenti/dist/eklenti.js", "cekirdek/out/derleme.js", "node_modules/x/paket.json",
    ".vscode/settings.json",
  ]) assert.equal(gurultuMu(yol), true, yol);
  for (const yol of [
    PLAN_TURU, "yeni-klasor", "eklenti/src/eklenti.ts",
    "cikti-notu.md",            // 'out' yalnız TAM dizin adı olarak süzülür
    "ornek/tema_ornek.sar",     // disk hattı ornek'i SÜZMEZ (proje-denetim kapsar)
    // KPS-IND-A01: disk hattı yalnız bağımlılık ve derleme çıktısını süzer;
    // arşiv, fikstür ve şablon ADI tek başına gürültü hükmü doğurmaz, çünkü
    // bunlar kullanıcının kendi kitaplık adları olabilir (Founder 2026-09-10).
    "arsiv/eski.sar", "fikstur/kirik.sar", "sablon/kurumsal/plan.sar",
  ]) assert.equal(gurultuMu(yol), false, yol);
  assert.equal(gurultuMu("C:\\proje\\.git\\index.lock"), true);   // Windows ayracı
});

test("süzgeç: tarama globu dışlama LİSTESİNDEN TÜRETİLİR — kapsam tek kaynak (RED-1 D1 · RED-2 kalıntısı)", () => {
  // Globun küme parçası sökülür ve listeyle KÜME EŞİTLİĞİ aranır — 'includes'
  // zayıflığı yok (RED-2 dersi: elle örnekleme __pycache__ sınıfını kaçırdı).
  // Yeni bir ada eklenen dışlama iki yüze birden iner; ayrışma yapısal imkânsız.
  const kume = TARAMA_DISLAMA_GLOB.match(/^\*\*\/\{(.+)\}\/\*\*$/)?.[1]?.split(",") ?? [];
  assert.deepEqual(new Set(kume), new Set([...SAR_DISLANANLAR, ".*"]));
  for (const ad of SAR_DISLANANLAR) {
    assert.equal(sarGurultuMu(`${ad}/icerde/dosya.sar`), true, ad);       // kökte
    assert.equal(sarGurultuMu(`x/${ad}/dosya.sar`), true, `x/${ad}`);     // içeride
  }
  assert.equal(sarGurultuMu("__pycache__/canli.sar"), true);   // RED-2'nin somut örneği
  assert.equal(sarGurultuMu(".vscode/model.sar"), true);
  assert.equal(sarGurultuMu(PLAN_TURU), false);
  // KPS-IND-A01: ders rafı ADIYLA değil YERİYLE süzülür (Founder 2026-09-10).
  for (const raf of ["arsiv", "ornek", "fikstur", "sablon"]) {
    assert.equal(sarGurultuMu(`ogreti/${raf}/dosya.sar`), true, `ogreti/${raf}`);
    assert.equal(sarGurultuMu(`x/ogreti/${raf}/alt/dosya.sar`), true, `x/ogreti/${raf}`);
    // NÖBET: kullanıcının kendi kökü altındaki aynı ad ÜRÜNDÜR ve süzülmez.
    assert.equal(sarGurultuMu(`${raf}/kurumsal/plan.sar`), false, `kullanıcı ${raf}/`);
    assert.equal(sarGurultuMu(`is/${raf}/plan.sar`), false, `kullanıcı is/${raf}/`);
  }
});

test("hat: iz yolu tam-tur kuyruğuna GİRMEZ — meşgul panel turunda bile başlangıç ≤1sn (RED-2 IZLE-A03)", (t) => {
  // Sol koşu-2 karşı-deneyinin onarımlı hâli: 1100 ms süren panel turu
  // koşarken gelen trace olayı, iz yolunun AYRI kilidi sayesinde 350 ms'de
  // (geciktirme dolar dolmaz) başlar — eski mimaride 1102 ms ölçülmüştü.
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const baslamalar: Array<{ tetik: string; ms: number }> = [];
  let simdi = 0;
  let panelBirak!: () => void;
  const panelKilidi = new TekUcusKilidi(async (tetik) => {
    baslamalar.push({ tetik, ms: simdi });
    await new Promise<void>((coz) => { panelBirak = coz; });   // uzun tur (1100 ms temsili)
  });
  const izKilidi = new TekUcusKilidi(async (tetik) => { baslamalar.push({ tetik, ms: simdi }); });
  const izHatti = new OlayHatti({ gurultu: () => false, gecikmeMs: 350, iste: (x) => izKilidi.iste(x) });

  panelKilidi.iste("başlangıç");                       // panel meşgul
  izHatti.olay(".sarmal/trace/kosu.jsonl", "iz-olayı");
  simdi = 350; t.mock.timers.tick(350);                // geciktirme doldu
  assert.deepEqual(baslamalar,
    [{ tetik: "başlangıç", ms: 0 }, { tetik: "iz-olayı", ms: 350 }]);
  panelBirak();
});

// ── ② Gerçek hat benzetimi: fiilî tetik sayımı (sahte-zamanlayıcı) ───────────

/** 10 olaylık dalga — aralıklar 100–700 ms (bir git komut zincirinin ritmi). */
const DALGA_ZAMANLARI = [0, 100, 700, 800, 1400, 2100, 2200, 2900, 3600, 4300];

const dalgaKostur = (t: TestContext, hat: OlayHatti, yollar: string[]): void => {
  let simdi = 0;
  DALGA_ZAMANLARI.forEach((z, i) => {
    t.mock.timers.tick(z - simdi); simdi = z;
    hat.olay(yollar[i % yollar.length], "disk-olayı");
  });
  t.mock.timers.tick(2000);   // dalga sonrası sükûnet — bekleyen geciktirme dolar
};

test("hat: onarım öncesi yapılandırma (süzgeçsiz · 500 ms) git dalgasında 7 fiilî tetik üretir", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let tetik = 0;
  const eskiHat = new OlayHatti({ gurultu: () => false, gecikmeMs: 500, iste: () => { tetik += 1; } });
  dalgaKostur(t, eskiHat, [".git/index.lock", ".git/objects/pack/tmp_pack"]);
  assert.equal(tetik, 7);   // 500 ms'den uzun her boşlukta tam tarama başlıyordu
});

test("hat: onarımlı yapılandırma (süzgeçli · 1500 ms) aynı dalgada 0 tetik üretir; 10 olay süzülür", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let tetik = 0, suzulen = 0;
  const yeniHat = new OlayHatti({ gurultu: gurultuMu, gecikmeMs: 1500,
    iste: () => { tetik += 1; }, suzuldu: () => { suzulen += 1; } });
  dalgaKostur(t, yeniHat, [".git/index.lock", ".git/objects/pack/tmp_pack"]);
  assert.equal(tetik, 0);
  assert.equal(suzulen, 10);
});

test("hat: MEŞRU dosya dalgası onarımlı yapılandırmada kaybolmaz — tek telafi turuna iner", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let tetik = 0, ertelenen = 0;
  const hat = new OlayHatti({ gurultu: gurultuMu, gecikmeMs: 1500,
    iste: () => { tetik += 1; }, ertelendi: () => { ertelenen += 1; } });
  dalgaKostur(t, hat, [planYolu("a.sar"), "yasa/b.sar"]);
  assert.equal(tetik, 1);        // istek kaybolmadı, sel tek tura indi
  assert.equal(ertelenen, 9);
});

// ── ③ Tek-uçuş kilidi ────────────────────────────────────────────────────────

test("kilit: koşarken gelen istekler tek telafi turuna iner — son tetik kazanır", async () => {
  const kosulan: string[] = [];
  let atlanan = 0;
  let birak!: () => void;
  const kilit = new TekUcusKilidi(async (tetik) => {
    kosulan.push(tetik);
    if (kosulan.length === 1) await new Promise<void>((coz) => { birak = coz; });
  }, () => { atlanan += 1; });

  kilit.iste("başlangıç");                 // koşuya girdi, bekliyor
  kilit.iste("sar-olayı");                 // koşarken geldi → bayrak
  kilit.iste("disk-olayı");                // koşarken geldi → bayrağı ezdi
  assert.deepEqual(kosulan, ["başlangıç"]);
  assert.equal(atlanan, 2);

  birak();                                 // ilk tur bitti
  await new Promise((coz) => setImmediate(coz));
  await new Promise((coz) => setImmediate(coz));
  assert.deepEqual(kosulan, ["başlangıç", "disk-olayı"]);   // TEK telafi, son istek
});

test("kilit: çöken tur sessiz yutulmaz (hata geri-çağrısı) ve kilidi asılı bırakmaz", async () => {
  const kosulan: string[] = [];
  const hatalar: string[] = [];
  const kilit = new TekUcusKilidi(async (tetik) => {
    kosulan.push(tetik);
    if (tetik === "patlayan") throw new Error("tur çöktü");
  }, undefined, (h) => hatalar.push(h instanceof Error ? h.message : String(h)));
  kilit.iste("bir");
  await new Promise((coz) => setImmediate(coz));
  kilit.iste("patlayan");
  await new Promise((coz) => setImmediate(coz));
  kilit.iste("iki");                       // çöken turdan sonra kilit açık kalmalı
  await new Promise((coz) => setImmediate(coz));
  assert.deepEqual(kosulan, ["bir", "patlayan", "iki"]);
  assert.deepEqual(hatalar, ["tur çöktü"]);   // RED-1 R1: çöküş raporlanır
});

// ── ④ 🩹 BKM-DNT-A18 · DEĞİŞEN YOLLAR TURA TAŞINIR ──────────────────────────
//   Saha bulgusu (2026-10-24 · HTR-EKLENTI-DAR-KAPSAM-BAYAT-PANEL): olay hattı
//   tura yalnız tetik adını taşıyordu; tur darlığını değişen dosyadan değil
//   odaktaki varlıktan seçiyor ve kardeş kökteki değişiklik o kökün çapraz
//   tanılarını tazelemiyordu. Hat artık geciktirme penceresinde süzgeçten geçen
//   her olayın yolunu biriktirir, kilit bekleyen istekleri birleştirir.

test("hat: geciktirme penceresindeki bütün meşru olayların yolu TEK istekle tura taşınır; gürültü taşınmaz", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const istekler: Array<{ tetik: string; yollar: readonly string[] }> = [];
  const hat = new OlayHatti({ gurultu: gurultuMu, gecikmeMs: 300,
    iste: (tetik, yollar) => { istekler.push({ tetik, yollar }); } });

  hat.olay("birinci/is/plan/a.sar", "sar-olayı", "/ws/birinci/is/plan/a.sar");
  t.mock.timers.tick(100);
  hat.olay(".git/index.lock", "sar-olayı", "/ws/.git/index.lock");          // süzülür
  hat.olay("ikinci/is/plan/b.sar", "sar-olayı", "/ws/ikinci/is/plan/b.sar");
  hat.olay("birinci/is/plan/a.sar", "sar-olayı", "/ws/birinci/is/plan/a.sar");
  t.mock.timers.tick(300);

  assert.deepEqual(istekler, [{ tetik: "sar-olayı", yollar: ["/ws/birinci/is/plan/a.sar", "/ws/ikinci/is/plan/b.sar"] }],
    "seldeki olayların yolları tek isteğe birleşmedi; ilk olayın yolu sonrakine ezdirildi ya da gürültü tura sızdı");

  // Pencere dolunca küme boşalır: sonraki istek önceki selin yollarını taşımaz.
  hat.olay("ikinci/is/plan/c.sar", "sar-olayı", "/ws/ikinci/is/plan/c.sar");
  t.mock.timers.tick(300);
  assert.deepEqual(istekler[1], { tetik: "sar-olayı", yollar: ["/ws/ikinci/is/plan/c.sar"] },
    "önceki selin yolları bir sonraki tura taşındı; dar kök gereksiz genişler");
});

test("hat: üçüncü argüman verilmezse süzgecin ölçtüğü yol taşınır", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let alınan: readonly string[] = [];
  const hat = new OlayHatti({ gurultu: () => false, gecikmeMs: 10, iste: (_t, yollar) => { alınan = yollar; } });
  hat.olay("a.sar", "sar-olayı");
  t.mock.timers.tick(10);
  assert.deepEqual(alınan, ["a.sar"]);
});

test("kilit: koşarken gelen isteklerin değişen yolları telafi turunda BİRLEŞİR", async () => {
  const koşulan: Array<{ tetik: string; yollar: readonly string[] | undefined }> = [];
  let bırak!: () => void;
  const kilit = new TekUcusKilidi(async (tetik, yollar) => {
    koşulan.push({ tetik, yollar });
    if (koşulan.length === 1) await new Promise<void>((çöz) => { bırak = çöz; });
  });

  kilit.iste("sar-olayı", ["/ws/birinci/a.sar"]);          // koşuya girdi
  kilit.iste("sar-olayı", ["/ws/ikinci/b.sar"]);           // kardeş kök — bekler
  kilit.iste("disk-olayı", ["/ws/birinci/c.sar"]);         // odak — bekler
  bırak();
  await new Promise((çöz) => setImmediate(çöz));
  await new Promise((çöz) => setImmediate(çöz));

  assert.deepEqual(koşulan[1], { tetik: "disk-olayı", yollar: ["/ws/ikinci/b.sar", "/ws/birinci/c.sar"] },
    "telafi turu yalnız son isteğin yolunu taşıyor; kardeş kökteki değişiklik ezilir ve tur odağa daralır");
  assert.equal(koşulan.length, 2, "bekleyen istekler tek telafi turuna inmedi");
});

test("kilit: tam tur isteyen tetik ardından gelen dar olay tetiğine YENİLMEZ", () => {
  // Odak değişimi tam tur ister; o istek beklerken gelen bir .sar olayı eski
  // kilitte bayrağı ezip turu daraltıyordu ve yeni odağın resmi hiç kurulmuyordu.
  const birleşik = istekleriBirlestir({ tetik: "odak", yollar: undefined }, { tetik: "sar-olayı", yollar: ["/ws/a.sar"] });
  assert.deepEqual(birleşik, { tetik: "odak", yollar: undefined },
    "tam tur isteği dar bir olay tetiğine yenildi; tam resim kurulmaz");
  // Ters sırada da tam tur kazanır (son istek kazanır kuralı zaten bunu verir).
  assert.deepEqual(istekleriBirlestir({ tetik: "sar-olayı", yollar: ["/ws/a.sar"] }, { tetik: "ayar", yollar: undefined }),
    { tetik: "ayar", yollar: undefined });
  // İki dar istekte son tetik kazanır ve yollar yinelenmeden birleşir.
  assert.deepEqual(istekleriBirlestir({ tetik: "sar-olayı", yollar: ["/ws/a.sar"] }, { tetik: "disk-olayı", yollar: ["/ws/b", "/ws/a.sar"] }),
    { tetik: "disk-olayı", yollar: ["/ws/a.sar", "/ws/b"] });
  // Yollardan biri bilinmiyorsa birleşik istek de bilinmez (kapsam kararı onu tama çevirir).
  assert.deepEqual(istekleriBirlestir({ tetik: "sar-olayı", yollar: undefined }, { tetik: "sar-olayı", yollar: ["/ws/a.sar"] }),
    { tetik: "sar-olayı", yollar: undefined });
  assert.deepEqual(istekleriBirlestir(undefined, { tetik: "sar-olayı", yollar: ["/ws/a.sar"] }),
    { tetik: "sar-olayı", yollar: ["/ws/a.sar"] });
});

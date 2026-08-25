// ═══════════════════════════════════════════════════════════════════════════
// kok-yuzeyi.test.ts — 🌍 Kök Yüzeyi Nöbeti sınamaları (KYN-MTR-A04)
//
//   Bu dosya üç kabul ölçütünü birlikte kanıtlar. Birinci ölçüt, bir kök yüzeyine
//   karşılıksız bir kod atfı konulduğunda motorun onu bildirmesidir; bunu uydurma
//   içerik ve uydurma kimlik evreniyle kurulan fikstürlerle ölçeriz, dolayısıyla
//   kanıt deponun bugünkü metnine bağlı değildir ve metin tazelendiğinde de ayakta
//   kalır. İkinci ölçüt iki varlığın karnesinin ayrı kalmasıdır; nöbetin varlık
//   denetimine hiçbir bulgu yazmadığı, bulgularının kendi kapısında yaşadığı ve
//   atıf evreninin yalnız açık araç olduğu ölçülür. Üçüncü ölçüt bugün diskte duran
//   kök dosyalarının yanlış pozitif üretmemesidir; canlı bölüm gerçek kökü okur ve
//   hiçbir HATA çıkmadığını, ilan ile diskin örtüştüğünü gösterir.
//
//   BUGÜNKÜ UYARILAR SINANMAZ, ÇÜNKÜ ONLAR İÇERİKTİR. Nöbet bugün gerçek kök
//   tanıtım dosyasında karşılıksız kimlikler görüyor ve bunlar yanlış pozitif
//   değildir; adları gerçekten hiçbir kaynakta tanımlı değildir. Bu sayı sınamaya
//   çakılmaz, çünkü metnin tazelenmesi ayrı bir işin konusudur ve tazelendiği gün
//   sayıya bağlanmış bir sınama sebepsiz kırmızıya düşerdi. Sınanan şey MEKANİZMA
//   ile ilan-disk mutabakatıdır; içeriğin kendisi değildir.
// ═══════════════════════════════════════════════════════════════════════════

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  KOK_YUZEYLERI,
  KOK_KAPSAM_DISI,
  GIZLI_KOK_ADI,
  KOK_ATIF_EVRENI,
  ornekCitleriniBosalt,
  kokYuzeyiAtiflari,
  kokYuzeyleriOku,
  kimlikEvreniniKur,
  beyansizKokDosyalari,
  kokYuzeyiDenetle,
  kokYuzeyiRaporu,
  type KokYuzeyi,
} from "../src/kok-yuzeyi.ts";

/** Çalışma alanı kökü: sinama/ → cekirdek/ → urun/ → kök. */
const KOK = fileURLToPath(new URL("../../../", import.meta.url));

/** Tek yüzeylik fikstür kurar — liste dışarıdan verilir, kaynak listesi ölçüme karışmaz. */
const yuzey = (yol: string): KokYuzeyi => ({ yol, ne: "sınama yüzeyi" });

/** Fikstür içeriklerini saf katmanın beklediği haritaya çevirir. */
const icerikler = (kayitlar: Record<string, string | undefined>): Map<string, string | undefined> =>
  new Map(Object.entries(kayitlar));

// ── ① MEKANİZMA: karşılıksız atıf adresiyle bildirilir ──────────────────────

test("kök yüzeyine konulan karşılıksız kod atfı bildirilir ve adresi doğrudur", () => {
  const bulgular = kokYuzeyiAtiflari(
    [yuzey("README.md")],
    icerikler({ "README.md": "Karşılama satırı.\nKurallar için EMEKLI-7 kaydına bakınız.\n" }),
    new Set(["ADM-A01"]),
  );
  assert.equal(bulgular.length, 1, "karşılıksız kimlik bildirilmedi");
  assert.equal(bulgular[0].dosya, "README.md");
  assert.equal(bulgular[0].tani.kod, "kök-yüzeyi-karşılıksız-atıf");
  assert.equal(bulgular[0].tani.duzey, "uyarı");
  assert.equal(bulgular[0].tani.satir, 2, "bulgunun satırı metindeki gerçek satır olmalı");
  assert.equal(bulgular[0].tani.sutun, 15, "bulgunun sütunu kimliğin başladığı sütun olmalı");
  assert.match(bulgular[0].tani.mesaj, /EMEKLI-7/, "cümle karşılıksız kimliği adıyla anmalı");
});

test("çözülen kimlik hiçbir bulgu üretmez", () => {
  const bulgular = kokYuzeyiAtiflari(
    [yuzey("README.md")],
    icerikler({ "README.md": "Denetim kapısı ADM-A01 adımında anlatılır.\n" }),
    new Set(["ADM-A01"]),
  );
  assert.deepEqual(bulgular, [], "evrende çözülen kimlik karşılıksız sayılamaz");
});

// ── ② İKİNCİ SÜZGEÇ: kimlik şekli taşımayan sözce kod sayılmaz ──────────────

test("rakam taşımayan büyük-harf sözce kod sayılmaz (yanlış pozitif kalkanı)", () => {
  // Kökteki gerçek metinlerde ölçülmüş vakalar: dosya adı ve rakamsız teknoloji kodu.
  const bulgular = kokYuzeyiAtiflari(
    [yuzey("CONTRIBUTING.md")],
    icerikler({ "CONTRIBUTING.md": "Roller ROL-HARITASI dosyasında; motor TEK-TS teknolojisidir.\n" }),
    new Set<string>(),
  );
  assert.deepEqual(bulgular, [], "rakamsız kuyruk düz yazıdır, kimlik değildir");
});

// ── ③ AİLE SÜZGECİ YOKTUR: nöbet kendi doğuş gerekçesini görebilmelidir ─────

test("ailesi tamamen emekli olmuş kimlik de bildirilir (aile süzgeci bilinçli olarak yoktur)", () => {
  // Bu, nöbetin var oluş sebebidir: kök tanıtım dosyasında ailesi tamamen emekli
  // kimlikler aylarca durdu. Varlık taramasının aile süzgeci korunsaydı bu bulgu
  // doğmazdı; genişleme burada sınanır ki sessizce geri daralmasın.
  const evren = new Set(["ADM-A01", "KYN-MTR-A04"]);   // hiçbir PLN- ailesi yok
  const bulgular = kokYuzeyiAtiflari(
    [yuzey("README.md")],
    icerikler({ "README.md": "Planlar PLN-1 ve PLN-2 kayıtlarında anlatılır.\n" }),
    evren,
  );
  assert.deepEqual(
    bulgular.map((b) => b.tani.mesaj.match(/'(PLN-\d)'/)?.[1]),
    ["PLN-1", "PLN-2"],
    "emekli ailenin iki kimliği de bildirilmeli",
  );
});

// ── ④ ÖRNEK KAYNAK BLOĞU KAPSAM DIŞI ────────────────────────────────────────

test("`sar` etiketli çit bloğunun içi ölçülmez, dışı ölçülür", () => {
  const metin = [
    "Giriş cümlesi.",
    "```sar",
    "Adım( kod: ADM-ORNEK-1, ne: \"örnek\" )",
    "```",
    "Kapanış cümlesinde EMEKLI-9 anılıyor.",
    "",
  ].join("\n");
  const bulgular = kokYuzeyiAtiflari([yuzey("README.en.md")], icerikler({ "README.en.md": metin }), new Set<string>());
  assert.equal(bulgular.length, 1, "yalnız çit dışındaki kimlik bildirilmeli");
  assert.match(bulgular[0].tani.mesaj, /EMEKLI-9/);
  assert.equal(bulgular[0].tani.satir, 5, "çit boşaltması satır adresini kaydırmamalı");
});

test("`sar` dışındaki çit blokları ölçülmeye devam eder", () => {
  // Kökteki gerçek tanıtım dosyasının raf ağacı etiketsiz bir çit bloğundadır ve
  // orası öğretim malzemesi değil, deponun kendisi hakkında olgusal bir iddiadır.
  const metin = ["```", "plan/   # PLN-1 kaydı", "```", ""].join("\n");
  const bulgular = kokYuzeyiAtiflari([yuzey("README.md")], icerikler({ "README.md": metin }), new Set<string>());
  assert.equal(bulgular.length, 1, "etiketsiz çit bloğu örnek kaynak sayılamaz");
  assert.equal(bulgular[0].tani.satir, 2);
});

test("çit boşaltması satır sayısını korur ve kapanmamış bloğu sonuna kadar boşaltır", () => {
  const metin = "bir\n```sar\niki\nüç\n```\ndört\n";
  assert.equal(ornekCitleriniBosalt(metin).split("\n").length, metin.split("\n").length);
  assert.equal(ornekCitleriniBosalt("bir\n```SAR\nADM-A01\n").split("\n")[2], "");
});

// ── ⑤ İLAN İLE DİSK MUTABAKATI ──────────────────────────────────────────────

test("ilan edilmiş yüzey diskte yoksa HATA basılır ve o yüzey ölçülemez", () => {
  const bulgular = kokYuzeyiAtiflari([yuzey("YOK.md")], icerikler({ "YOK.md": undefined }), new Set<string>());
  assert.equal(bulgular.length, 1);
  assert.equal(bulgular[0].tani.kod, "kök-yüzeyi-eksik-dosya");
  assert.equal(bulgular[0].tani.duzey, "hata");
});

test("kökte ilan edilmemiş dosya beyansız olarak görünür kılınır", () => {
  const gecici = mkdtempSync(join(tmpdir(), "sarmal-kok-"));
  try {
    writeFileSync(join(gecici, "README.md"), "boş\n");
    writeFileSync(join(gecici, "LICENSE"), "boş\n");
    writeFileSync(join(gecici, "NOTICE.md"), "boş\n");
    writeFileSync(join(gecici, ".gizli"), "boş\n");
    mkdirSync(join(gecici, "urun"));
    const beyansiz = beyansizKokDosyalari(
      gecici,
      [yuzey("README.md")],
      [{ yol: "LICENSE", gerekce: "dış dünyaya ait standart belge" }],
    );
    assert.deepEqual(beyansiz, ["NOTICE.md"],
      "ilan edilmemiş dosya görünmeli; gizli dosya ve dizin kapsam dışıdır");
  } finally { rmSync(gecici, { recursive: true, force: true }); }
});

test("KAPI beyansız dosyayı bulguya çevirir — bağlantı ölçülür, işlev değil", () => {
  // BAĞIMSIZ DENETÇİ BULGUSU (2026-08-09): yukarıdaki sınama `beyansizKokDosyalari`
  // işlevini DOĞRUDAN çağırıyordu ve işlevin kapıya bağlı olduğunu hiç ölçmüyordu.
  // Denetçi bağlantıyı sustururken süit 16/16 yeşil kaldı, çünkü canlı kök bugün
  // temiz olduğu için canlı sınama da farkı göremiyordu. Bu sınama tam o boşluğu
  // kapatır: geçici bir kökte ilansız bir dosya kurar ve bulguyu KAPININ çıktısında
  // arar; bağlantı koparsa MIM-3 bekçisi artık sessizce ölemez.
  const gecici = mkdtempSync(join(tmpdir(), "sarmal-kok-kapi-"));
  try {
    writeFileSync(join(gecici, "README.md"), "Karşılama satırı.\n");
    writeFileSync(join(gecici, "NOTICE.md"), "İlan edilmemiş kök dosyası.\n");
    writeFileSync(join(gecici, "LICENSE"), "Dış dünyaya ait standart belge.\n");
    mkdirSync(join(gecici, "urun"));
    const bulgular = kokYuzeyiDenetle(
      gecici,
      [yuzey("README.md")],
      [{ yol: "LICENSE", gerekce: "dış dünyaya ait standart belge; kimlik evrenimize atıf vermez" }],
    );
    const beyansiz = bulgular.filter((b) => b.tani.kod === "kök-yüzeyi-beyansız");
    assert.deepEqual(beyansiz.map((b) => b.dosya), ["NOTICE.md"],
      "kapı beyansız dosyayı bulguya çevirmiyor — MIM-3 bekçisi kapıya bağlı değil");
    assert.equal(beyansiz[0].tani.duzey, "uyarı");
    assert.match(kokYuzeyiRaporu(bulgular, [yuzey("README.md")]), /NOTICE\.md/,
      "beyansız bulgusu raporun insan yüzüne çıkmıyor");
  } finally { rmSync(gecici, { recursive: true, force: true }); }
});

test("atıf evreni diskte yoksa nöbet sessizce yeşil vermez", () => {
  const gecici = mkdtempSync(join(tmpdir(), "sarmal-kok-evren-"));
  try {
    const bulgular = kokYuzeyiDenetle(gecici, [yuzey("README.md")], [], "_OlmayanVarlik");
    assert.equal(bulgular.length, 1);
    assert.equal(bulgular[0].tani.kod, "kök-yüzeyi-evrensiz");
    assert.equal(bulgular[0].tani.duzey, "hata");
  } finally { rmSync(gecici, { recursive: true, force: true }); }
});

// ── ⑥ VARLIK AYRILIĞI: evren tektir ve açık aracındır ───────────────────────

test("atıf evreni yalnız açık araçtır ve kapalı ürünün kimlikleri karışmaz", (t) => {
  assert.equal(KOK_ATIF_EVRENI, ".", "evren ilanı sessizce değişmemeli — açık depoda kök ile evren aynı ağaçtır");
  const evren = kimlikEvreniniKur(join(KOK, KOK_ATIF_EVRENI));
  assert.ok(evren.size > 1000, `açık aracın kimlik evreni beklenenden küçük: ${evren.size}`);
  // Kapalı ürünün kökü okunmadığı için, yalnız orada tanımlı bir kimlik bu evrende
  // BULUNMAMALIDIR. Kimlik sabit yazılmaz; kapalı ürün diskte varsa oradan ölçülür,
  // yoksa sınama kendini atlar — açık çekirdek kapalı ürüne bağımlı olamaz (STR-3.1).
  //
  // KLASÖR ADI DA SABİT YAZILMAZ (GOC-A06): kapalı kökün adı motorun tek kaynağından
  // okunur, çünkü ad sabit yazılırsa klasör yeniden adlandırıldığında bu sınama
  // kırılmaz, KÖRLEŞİR — kapalı kök hiç bulunamaz, ölçüm sessizce atlanır ve
  // sızıntı nöbeti yıllarca yeşil yanarken hiçbir şey ölçmez. Atlama artık sessiz
  // de değildir: kapsam kaybı tanı satırı olarak koşum çıktısına düşer.
  const kapaliKok = join(KOK, GIZLI_KOK_ADI);
  if (!existsSync(kapaliKok)) {
    t.diagnostic(`KAPSAM KAYBI: kapalı ürün kökü diskte yok (${kapaliKok}) — `
      + "sızıntı ölçümü bu koşumda YAPILMADI; sonuç yeşil görünse de bu nöbet bir şey kanıtlamaz.");
    return;
  }
  const kapali = kimlikEvreniniKur(kapaliKok);
  const yalnizKapali = [...kapali].filter((k) => !evren.has(k));
  assert.ok(yalnizKapali.length > 0,
    "kapalı ürünün kendine özgü hiçbir kimliği yok — ölçüm kurulumu bozulmuş olabilir");
  for (const kod of yalnizKapali) {
    assert.ok(!evren.has(kod), `'${kod}' kapalı üründe tanımlı, açık aracın evrenine sızmış`);
  }
});

// ── ⑦ CANLI NÖBET: gerçek çalışma alanı kökü ────────────────────────────────

test("canlı: ilan edilmiş her kök yüzeyi diskte durur", () => {
  for (const yuz of KOK_YUZEYLERI) {
    assert.ok(existsSync(join(KOK, yuz.yol)), `ilan edilmiş kök yüzeyi diskte yok: ${yuz.yol}`);
  }
});

test("canlı: çalışma alanı kökünde ilansız yüzey dosyası yoktur", () => {
  const beyansiz = beyansizKokDosyalari(KOK);
  assert.deepEqual(beyansiz, [],
    `kökte ilan edilmemiş dosya(lar) var: ${beyansiz.join(" · ")} — kök yüzeyi listesine ya da kapsam dışı listesine gerekçesiyle yaz`);
});

test("canlı: kök yüzeyi nöbeti bugünkü depoda HİÇBİR hata üretmez (kapı yeşil geçer)", () => {
  const bulgular = kokYuzeyiDenetle(KOK);
  const hatalar = bulgular.filter((b) => b.tani.duzey === "hata");
  assert.deepEqual(hatalar.map((h) => `${h.dosya}: ${h.tani.mesaj}`), [],
    "kök yüzeyi kapısı hata basıyor — ilan ile disk ayrışmış olabilir");
  // Uyarılar bilinçli olarak sayıya çakılmaz (dosya başlığı); yalnız kimliklerinin
  // bu nöbete ait olduğu ve raporun onları basabildiği doğrulanır.
  for (const b of bulgular) {
    assert.equal(b.tani.kod, "kök-yüzeyi-karşılıksız-atıf",
      `beklenmeyen bulgu kimliği: ${b.tani.kod}`);
  }
  assert.match(kokYuzeyiRaporu(bulgular), bulgular.length === 0 ? /kök yüzeyi: karşılıksız atıf yok/ : /kök yüzeyi: \d+ bulgu \(0 hata\)/);
});

// ── ⑧ LİSTE TEK KAYNAKTIR VE MUAFİYET GEREKÇELİDİR ─────────────────────────

test("kök yüzeyi listesi ve muafiyet listesi gerekçeli, tekil ve çakışmasızdır", () => {
  const yuzeyYollari = KOK_YUZEYLERI.map((y) => y.yol);
  assert.equal(new Set(yuzeyYollari).size, yuzeyYollari.length, "yüzey listesinde yinelenen yol var");
  for (const y of KOK_YUZEYLERI) assert.ok(y.ne.trim().length > 10, `gerekçesiz yüzey kaydı: ${y.yol}`);
  for (const k of KOK_KAPSAM_DISI) {
    assert.ok(k.gerekce.trim().length > 20, `gerekçesiz muafiyet: ${k.yol}`);
    assert.ok(!yuzeyYollari.includes(k.yol), `'${k.yol}' hem yüzey hem muaf olarak ilan edilmiş`);
  }
});

test("okuma katmanı diskteki yüzeyi getirir, olmayanı undefined bırakır", () => {
  const okunan = kokYuzeyleriOku(KOK, [yuzey("README.md"), yuzey("YOK-BOYLE-DOSYA.md")]);
  assert.ok((okunan.get("README.md") ?? "").length > 0, "gerçek yüzey okunamadı");
  assert.equal(okunan.get("YOK-BOYLE-DOSYA.md"), undefined, "olmayan dosya sessizce boş metne düşmemeli");
  // Kök dizininin kendisi de okunabilir olmalı; aksi hâlde canlı ölçümler anlamsızdır.
  assert.ok(readdirSync(KOK).length > 0);
});

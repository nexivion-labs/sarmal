// ═══════════════════════════════════════════════════════════════════════════
// dogus-ogretisi.test.ts — 🌱 BKM-DNT-A16 doğuş anının öğretisi
//
//   Ölçülmüş kök sebep: beceri kartları yalnız bir Adım `geliştirmede`
//   durumundayken ateşler, dolayısıyla henüz hiçbir Adımı bulunmayan BOŞ bir
//   ağaçta hiçbir kart ateşleyemez; doğuş anı öğretinin ulaşamadığı tek andır
//   ve yanlış ağacın kurulduğu an tam olarak odur. Bu süit o anda ulaşan iki
//   kanalı (rehber `basla` · karşılama kartı `ogret`) ve konu kartlarının boş
//   dizinde okunabilirliğini nöbete bağlar. Ateşlemeyen kart öğreti sayılmaz.
// ═══════════════════════════════════════════════════════════════════════════
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { beceriKartiBul, kartAnahtari, OGRENME_RAFI } from "../src/beceri-karti.ts";
import { dogusAnlatisi, ogretKarti, MINIMAL_ANADIZIN } from "../src/ogret.ts";
import { siniflamaYukle } from "../src/siniflama.ts";
import { MCP_SUNUCU_TALIMATI } from "../src/mcp-metinleri.ts";

const CEKIRDEK = fileURLToPath(new URL("..", import.meta.url));
const SARMAL = join(CEKIRDEK, "src", "sarmal.ts");
const SNF = siniflamaYukle(fileURLToPath(new URL("../../../oz/siniflama/kayit.json", import.meta.url)));

/** Boş bir dizinde koşan taze süreç — doğuş anının fikstürü (ağaç yok, Adım yok). */
function bosDizindeKos(betik: string): string {
  const bos = mkdtempSync(join(tmpdir(), "dogus-bos-"));
  return execFileSync(process.execPath, ["--input-type=module", "--eval", betik], {
    cwd: bos, encoding: "utf8", timeout: 60_000,
  });
}

// ── ① Konu kartları: çalışma alanı ile teknoloji, BOŞ dizinde ────────────────
test("BKM-DNT-A16: boş dizinde ogret çalışma alanı ve teknoloji kartlarını döndürür (kart bulunamadı hatası kalkar)", () => {
  const kartYolu = pathToFileURL(join(CEKIRDEK, "src", "beceri-karti.ts")).href;
  const betik = `import { beceriKartiBul } from ${JSON.stringify(kartYolu)};` +
    `for (const k of ["çalışma alanı", "ÇalışmaAlanı", "calisma-alani", "teknoloji", "Teknoloji"]) {` +
    `  const s = beceriKartiBul(k);` +
    `  process.stdout.write(k + "|" + String(s.isError) + "|" + s.metin.split("\\n")[0] + "\\n");` +
    `}`;
  const satirlar = bosDizindeKos(betik).trim().split("\n");
  assert.equal(satirlar.length, 5, "beş yazım da cevaplanmalı");
  for (const satir of satirlar) {
    const [konu, hata, basSatir] = satir.split("|");
    assert.equal(hata, "false", `'${konu}' boş dizinde kart bulunamadı hatası verdi: ${basSatir}`);
  }
  assert.match(satirlar[0], /calisma_alani_becerisi\.sar/u, "çalışma alanı kartı");
  assert.match(satirlar[4], /teknoloji_becerisi\.sar/u, "teknoloji kartı");
});

/** Ateşlemeyen kart öğreti sayılmaz: rafın HER kartı kendi adından çağrılabilmeli. */
test("BKM-DNT-A16: ogrenme rafındaki her kart kendi konusundan çağrılabilir — ulaşılamayan kart yoktur", () => {
  const kartlar = readdirSync(OGRENME_RAFI).filter((a) => a.endsWith(".sar"));
  assert.ok(kartlar.length >= 14, `raf beklenenden küçük (${kartlar.length}) — fikstür eridi mi?`);
  const ulasilamayan: string[] = [];
  for (const dosya of kartlar) {
    const konu = dosya.replace(/\.sar$/u, "").replace(/_becerisi$/u, "").replace(/_/gu, "-");
    const s = beceriKartiBul(konu);
    if (s.isError || !s.metin.includes(dosya)) ulasilamayan.push(`${dosya} ← "${konu}"`);
  }
  assert.deepEqual(ulasilamayan, [], "her kart kendi konusundan ulaşılabilir olmalı");
});

test("BKM-DNT-A16: anahtar sıkıştırması Türkçe yazımı ASCII dosya adına denk düşürür", () => {
  assert.equal(kartAnahtari("çalışma alanı"), "calismaalani");
  assert.equal(kartAnahtari("ÇalışmaAlanı"), "calismaalani");
  assert.equal(kartAnahtari("BCR-CALISMA-ALANI"), "bcrcalismaalani");
  assert.equal(kartAnahtari("Teknoloji"), "teknoloji");
  // Bilinmeyen konu hâlâ koridor iletisi verir (labirent değil — YAS-3.4).
  const yok = beceriKartiBul("boyle-bir-konu-yok");
  assert.ok(yok.isError, "bilinmeyen konu dürüstçe hata olmalı");
  assert.match(yok.metin, /Mevcut kartlar/u, "hata yolu mevcut kartları saymalı");
});

// ── ② Doğuş anlatısı: iki kanal, TEK üretici ────────────────────────────────
test("BKM-DNT-A16: doğuş anlatısı üç bölümü de taşır — hedef · kademeli onay · diyalog disiplini", () => {
  const a = dogusAnlatisi("tr");
  assert.match(a, /🌍 NE İÇİN VARIZ/u, "ürünün hedefi bölümü");
  assert.match(a, /🪜 AĞAÇ TEK HAMLEDE DEĞİL, KADEME KADEME KURULUR/u, "kademeli kuruluş bölümü");
  assert.match(a, /💬 PLANLAMA YAVAŞTIR/u, "diyalog disiplini bölümü");
  // Hedef: niyet üretir, kod üretmez + uzun ömürlü/karar yoğun/ajan ağırlıklı iş.
  assert.match(a, /kod üretmez, NİYET üretir/u);
  assert.match(a, /uzun ömürlü, az kişili, karar yoğun ve ajan/u);
  // Kademeli onay: her kademe insan onayından geçer, üst kademe onaylanmadan alt yazılmaz.
  assert.match(a, /her kademe insan onayından geçer/u);
  assert.match(a, /Üst kademe onaylanmadan alt kademe yazılmaz/u);
  // Diyalog disiplini: önce ilan, sonra plan; seçenek sun, seçimi kullanıcıya bırak.
  assert.match(a, /Önce yalnız giriş ilanını çıkar ve/u);
  assert.match(a, /seçimi kullanıcıya bırak/u);
  // Doğuş araç sırası — dördü de adıyla anılır.
  for (const arac of ["basla", "dogus", "iskelet", "denetle-proje"]) {
    assert.ok(a.includes(`\`${arac}\``), `doğuş sırası '${arac}' aracını anmalı`);
  }
});

test("BKM-DNT-A16: beş ölçülmüş anti-desen anlatıda tek tek yazılıdır", () => {
  const a = dogusAnlatisi("tr");
  const beklenen: readonly [string, RegExp][] = [
    ["elle yazma", /boş dizinde ağacı ELLE yazmak/u],
    ["araç atlama", /doğuş araçlarını hiç çağırmamak/u],
    ["şema rehber sanılması", /şema aracını rehber yerine kullanmak/u],
    ["kademe atlama", /bir kademeyi atlayıp doğrudan alt kademeyi açmak/u],
    ["zaman ekseni", /zaman eksenini \(Faz\) giriş ilanına yazmak/u],
  ];
  for (const [ad, desen] of beklenen) assert.match(a, desen, `anti-desen eksik: ${ad}`);
  const madde = a.split("\n").filter((s) => s.trimStart().startsWith("•"));
  assert.equal(madde.length, 5, "anti-desen listesi beş maddedir — madde düşerse nöbet kırmızı yanar");
});

test("BKM-DNT-A16: rehber ile karşılama kartı ANLATIYI TEK ÜRETİCİDEN alır — elle ikizlenmemiştir", () => {
  const anlati = dogusAnlatisi("tr");
  // Kart: anlatının TAMAMINI birebir taşır (kopya değil, aynı gövde).
  assert.ok(ogretKarti(SNF, "tr").includes(anlati), "karşılama kartı anlatıyı birebir taşımalı");
  // Rehber: MCP `basla` çıktısı da aynı gövdeyi taşır (alt süreçten, boş dizinde).
  const mcpYolu = pathToFileURL(join(CEKIRDEK, "src", "mcp.ts")).href;
  assert.ok(mcpYolu.endsWith("mcp.ts"));
  const cikti = execFileSync(process.execPath, [SARMAL, "başla"], {
    cwd: CEKIRDEK, encoding: "utf8", env: { ...process.env, SARMAL_DIL: "tr" }, timeout: 60_000,
  });
  assert.ok(cikti.includes(anlati), "başla rehberi anlatıyı birebir taşımalı (ikinci elle yazım yok)");
});

test("BKM-DNT-A16: anlatı iki dilde de aynı bölüm iskeletini taşır", () => {
  const iskelet = (m: string): string[] => m.split("\n")
    .map((s) => s.match(/^(🌍|🪜|💬)/u)?.[1]).filter((x): x is string => x !== undefined);
  assert.deepEqual(iskelet(dogusAnlatisi("tr")), ["🌍", "🪜", "💬"]);
  assert.deepEqual(iskelet(dogusAnlatisi("en")), ["🌍", "🪜", "💬"]);
  assert.match(dogusAnlatisi("en"), /WHAT WE EXIST FOR/u, "İngilizce yüz aynı üreticiden doğmalı");
});

// ── ③ Kitaplık hükmü ve plan adresi: bayat öğretim yüzeyi kalmadı ───────────
test("BKM-DNT-A16: kartın örneği Kitaplık kademesini öğretir ve plan adresi is/plan/ilk_plan.sar'dır", () => {
  assert.match(MINIMAL_ANADIZIN, /Kitaplık\( kod: KTP-IS, yol: "is\/"/u, "örnek Kitaplık kademesini taşımalı");
  // Kökün DOĞRUDAN çocuğu olan Raf (tam iki boşluk girinti) yasaktır; Kitaplık
  // içindeki Raf (dört boşluk) hükmün ta kendisidir ve beklenir.
  assert.doesNotMatch(MINIMAL_ANADIZIN, /^ {2}Raf\(/mu, "kökün altına çıplak Raf yazılamaz");
  assert.match(MINIMAL_ANADIZIN, /^ {4}Raf\( kod: RAF-PLAN/mu, "Raf Kitaplığın İÇİNDE yaşamalı");
  const kart = ogretKarti(SNF, "tr");
  assert.ok(kart.includes("─── is/plan/ilk_plan.sar ───"), "kart doğan ağacın gerçek plan adresini göstermeli");
});

/** Bayat adres tek yüzeyde kalırsa ajan var olmayan bir yol öğrenir; bütün üretim metni birlikte
 *  ölçülür. Adresler 2026-09-10 tarihinde ölçülmüştür: doğan ağaçta plan dosyası
 *  `is/plan/ilk_plan.sar`, öğrenme rafı `ogreti/ogrenme/`, ürünün kendi kurulumunda tasarım
 *  sözlüğü ise `ogreti/bilgi/tasarim_sozlugu` adresindedir. Üçünün de çıplak yazımı, yani
 *  kitaplık öneki düşmüş hâli, var olmayan bir yol öğretir ve bu yüzden üçü de nöbettedir. */
const BAYAT_ADRESLER: ReadonlyArray<{ bayat: string; dogru: string; desen: RegExp }> = [
  { bayat: "plan/ilk_plan.sar", dogru: "is/plan/ilk_plan.sar", desen: /(?<!is\/)(?<![\w/])plan\/ilk_plan\.sar/u },
  { bayat: "ogrenme/", dogru: "ogreti/ogrenme/", desen: /(?<!ogreti\/)ogrenme\//u },
  { bayat: "bilgi/tasarim_sozlugu", dogru: "ogreti/bilgi/tasarim_sozlugu", desen: /(?<!ogreti\/)bilgi\/tasarim_sozlugu/u },
];

for (const { bayat, dogru, desen } of BAYAT_ADRESLER) {
  test(`BKM-DNT-A16: hiçbir öğretim üreticisinde bayat \`${bayat}\` adresi kalmamıştır`, () => {
    const src = join(CEKIRDEK, "src");
    const bulunan: string[] = [];
    for (const ad of readdirSync(src).filter((a) => a.endsWith(".ts"))) {
      const metin = readFileSync(join(src, ad), "utf8");
      for (const [i, satir] of metin.split("\n").entries()) {
        if (desen.test(satir)) bulunan.push(`${ad}:${i + 1}`);
      }
    }
    assert.deepEqual(bulunan, [], `doğuş paketi ${dogru} altına yazıyor — öğretim yüzeyi de orayı göstermeli`);
  });
}

/** Nöbetin kendi doğruluğu: bayat yazımı YAKALAMALI, kitaplık önekli doğru yazımı ELEMELİ.
 *  Bu iddia olmadan desen sessizce her şeyi eleyebilir ve nöbet yeşil kalırken hiçbir şeyi ölçmez. */
test("BKM-DNT-A16: bayat-adres deseni çıplak yazımı yakalar, kitaplık önekli doğru yazımı eler", () => {
  const desenBul = (bayat: string): RegExp => {
    const k = BAYAT_ADRESLER.find((a) => a.bayat === bayat);
    assert.ok(k !== undefined, `${bayat} nöbet listesinde olmalı`);
    return k.desen;
  };
  const plan = desenBul("plan/ilk_plan.sar");
  assert.ok(plan.test("kart `plan/ilk_plan.sar` adresini gösterir"), "çıplak plan adresi yakalanmalı");
  assert.ok(!plan.test("kart `is/plan/ilk_plan.sar` adresini gösterir"), "doğru plan adresi elenmeli");
  const raf = desenBul("ogrenme/");
  assert.ok(raf.test("Beceri kartları `ogrenme/` rafında yaşar"), "çıplak raf adresi yakalanmalı");
  assert.ok(raf.test("Skill cards live on the `ogrenme/` shelf"), "İngilizce hane de yakalanmalı");
  assert.ok(!raf.test("Beceri kartları `ogreti/ogrenme/` rafında yaşar"), "doğru raf adresi elenmeli");
  assert.ok(!raf.test('new URL("../../../ogreti/ogrenme/", import.meta.url)'), "kurulum köküne göre çözülen raf elenmeli");
  const sozluk = desenBul("bilgi/tasarim_sozlugu");
  assert.ok(sozluk.test("kanon **TEKTİR**: `bilgi/tasarim_sozlugu/kayit.json`"), "çıplak sözlük adresi yakalanmalı");
  assert.ok(!sozluk.test("kanon **TEKTİR**: `ogreti/bilgi/tasarim_sozlugu/kayit.json`"), "doğru sözlük adresi elenmeli");
});

// ── ③b Bayat KADEME: kökün altına çıplak Raf öğreten örnek kalmadı ──────────
//   Adres nöbeti yolun yanlış olduğunu yakalar, kademenin yanlış olduğunu
//   yakalamaz: `Raf( yol: "plan/" )` örneği doğru rafı gösterse bile Kitaplık
//   kademesi atlandığında Founder'ın 2026-09-09 hükmünü ihlal eden bir ağaç
//   öğretir. Bu yüzden kademe ayrı ölçülür.

/** Bir `Raf(` yazımı ya aynı satırda `Kitaplık(` ile birlikte görünür (tek satırlık
 *  örnek), ya da açık bir `Kitaplık( … ) {` bloğunun içindedir (çok satırlı şablon).
 *  İkisi de yoksa örnek rafı kökün altına yazdırıyordur ve bayat kademedir. */
export function ciplakRafSatirlari(metin: string): number[] {
  const RAF = /(?<![\p{L}\p{N}_])Raf\(/u;
  const KITAPLIK = /(?<![\p{L}\p{N}_])Kitaplık\(/u;
  const bulunan: number[] = [];
  let kitaplikDerinligi = 0;
  for (const [i, satir] of metin.split("\n").entries()) {
    const rafM = RAF.exec(satir);
    if (rafM) {
      const kitaplikM = KITAPLIK.exec(satir);
      const ayniSatirda = kitaplikM !== null && kitaplikM.index < rafM.index;
      if (!ayniSatirda && kitaplikDerinligi === 0) bulunan.push(i + 1);
    }
    if (KITAPLIK.test(satir) && satir.includes("{")) kitaplikDerinligi++;
    else if (kitaplikDerinligi > 0 && /^\s*\}/u.test(satir)) kitaplikDerinligi--;
  }
  return bulunan;
}

test("BKM-DNT-A16: hiçbir öğretim üreticisi kökün altına çıplak `Raf(` öğretmez", () => {
  const src = join(CEKIRDEK, "src");
  const bulunan: string[] = [];
  for (const ad of readdirSync(src).filter((a) => a.endsWith(".ts"))) {
    for (const satir of ciplakRafSatirlari(readFileSync(join(src, ad), "utf8"))) bulunan.push(`${ad}:${satir}`);
  }
  assert.deepEqual(bulunan, [], "Kitaplık kademesi zorunludur (Founder hükmü 2026-09-09) — raf Kitaplığın İÇİNDE ilan edilir");
});

/** Kademe nöbetinin kendi doğruluğu: çıplak Rafı yakalamalı, iki sarma biçimini de elemeli. */
test("BKM-DNT-A16: kademe nöbeti çıplak Rafı yakalar, Kitaplık içindeki Rafı eler", () => {
  assert.deepEqual(ciplakRafSatirlari('Raf( kod: RAF-PLAN, yol: "plan/" )'), [1], "kökün altındaki çıplak Raf yakalanmalı");
  assert.deepEqual(ciplakRafSatirlari('Kitaplık( kod: KTP-IS, yol: "is/" ) { Raf( kod: RAF-PLAN, yol: "plan/" ) }'), [],
    "tek satırda kademeyi gösteren örnek elenmeli");
  assert.deepEqual(ciplakRafSatirlari('  Kitaplık( kod: KTP-IS, yol: "is/" ) {\n    Raf( kod: RAF-PLAN, yol: "plan/" )\n  }'), [],
    "çok satırlı şablonda Kitaplık bloğunun içindeki Raf elenmeli");
  assert.deepEqual(ciplakRafSatirlari('  Kitaplık( kod: KTP-IS, yol: "is/" ) {\n  }\n  Raf( kod: RAF-PLAN, yol: "plan/" )'), [3],
    "Kitaplık bloğu KAPANDIKTAN sonra gelen Raf yeniden çıplaktır");
  assert.deepEqual(ciplakRafSatirlari('Raf( kod: RAF-X ) … Kitaplık( kod: KTP-X )'), [1],
    "Kitaplık Rafʼtan SONRA geliyorsa kademe gösterilmiş sayılmaz");
});

// ── ④ Sunucu talimatı: doğuş anı boş dizinde de anlatılır ───────────────────
test("BKM-DNT-A16: sunucu talimatı doğuş araçlarını ve boş dizinde elle yazma yasağını anar (iki dil)", () => {
  for (const arac of ["dogus", "iskelet", "ogret"]) {
    assert.ok(MCP_SUNUCU_TALIMATI.tr.includes(arac), `Türkçe talimat '${arac}' aracını anmalı`);
    assert.ok(MCP_SUNUCU_TALIMATI.en.includes(arac), `İngilizce talimat '${arac}' aracını anmalı`);
  }
  assert.match(MCP_SUNUCU_TALIMATI.tr, /ELLE YAZILMAZ/u, "elle yazma yasağı talimatta");
  assert.match(MCP_SUNUCU_TALIMATI.tr, /boş bir dizinde de geçerlidir/u, "yasak boş dizini kapsamalı");
  assert.match(MCP_SUNUCU_TALIMATI.en, /NEVER hand-written/u);
  assert.match(MCP_SUNUCU_TALIMATI.en, /empty directory too/u);
});

// ── ⑤ CLI ikizi: konu kartı gerçekten döner ─────────────────────────────────
test("BKM-DNT-A16: CLI ikizi konu kartını döndürür — 'henüz yolda' cevabı emekli oldu (YUZ-1.2)", () => {
  const cikti = execFileSync(process.execPath, [SARMAL, "ogret", "teknoloji"], {
    cwd: CEKIRDEK, encoding: "utf8", timeout: 60_000,
  });
  assert.match(cikti, /teknoloji_becerisi\.sar/u, "CLI konu kartının tam metnini basmalı");
  assert.doesNotMatch(cikti, /henüz yolda/u, "bayat yönlendirme cümlesi kalkmalı");
  assert.doesNotMatch(cikti, /SARMAL KARŞILAMA KARTI/u, "konulu çağrı karşılama kartına düşmemeli");
});

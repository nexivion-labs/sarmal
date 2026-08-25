// nvidia-toolround.test.ts — 🧪 SEF-L3-A29: OpenAI function-calling ↔ SZL-ARAÇ-TALEP/SONUÇ
//   köprüsünün SAF eşlemesi + mock ile tam zincir (talep→gateway→sonuç). Gerçek NVIDIA
//   çağrısı YOK (o canlı --gercek turunun işi); burada eşlemenin doğruluğu token'sız kanıtlanır.
import { test } from "node:test";
import assert from "node:assert/strict";
import { oaAraçTanım, oaToolCallÇöz, oaAraçSonuçMesaj, araçSiciliYaz, jsonAyıkla, wireAdı, üretimKöprüsüYap, type AraçTanım } from "../src/kopru/nvidia.ts";
import { araçTuru, type AraçÇağır, type AraçSonuç } from "../src/toolround.ts";
import type { İzinBeyan, İzinMatrisi, Mod } from "../src/gateway.ts";

const katalog: AraçTanım[] = [
  { ad: "dosya-oku", açıklama: "Bir dosyanın içeriğini oku", mod: "oku",
    parametreler: { type: "object", properties: { yol: { type: "string" } }, required: ["yol"] } },
];
const modBul = (ad: string): Mod => katalog.find((a) => a.ad === ad)?.mod ?? "oku";

test("oaAraçTanım: AraçTanım → OpenAI tools girdisi (type:function + name/description/parameters)", () => {
  const t = oaAraçTanım(katalog[0]) as { type: string; function: { name: string; description: string; parameters: unknown } };
  assert.equal(t.type, "function");
  assert.equal(t.function.name, "dosya-oku");
  assert.equal(t.function.description, "Bir dosyanın içeriğini oku");
  assert.deepEqual(t.function.parameters, katalog[0].parametreler);
});

test("oaAraçTanım: parametresiz araç boş obje şeması alır (undefined değil)", () => {
  const t = oaAraçTanım({ ad: "ping", açıklama: "x", mod: "çağır" }) as { function: { parameters: unknown } };
  assert.deepEqual(t.function.parameters, { type: "object", properties: {} });
});

test("oaToolCallÇöz: geçerli tool_call → AraçTalep (argüman JSON çözülür, mod katalogdan)", () => {
  const talep = oaToolCallÇöz(
    { id: "call_1", function: { name: "dosya-oku", arguments: '{"yol":"a.ts"}' } }, modBul, "ETM-X");
  assert.equal(talep.etmen, "ETM-X");
  assert.equal(talep.araç, "dosya-oku");
  assert.equal(talep.mod, "oku");
  assert.deepEqual(talep.argüman, { yol: "a.ts" });
});

test("oaToolCallÇöz: bozuk argüman JSON'u ÇÖKERTMEZ — _ham'a düşer (fail-visible)", () => {
  const talep = oaToolCallÇöz({ id: "c", function: { name: "dosya-oku", arguments: "{bozuk" } }, modBul, "ETM-X");
  assert.deepEqual(talep.argüman, { _ham: "{bozuk" });
  assert.equal(talep.araç, "dosya-oku");
});

test("oaToolCallÇöz: bilinmeyen araç mod 'oku'ya düşer; argümansız çağrı undefined argüman", () => {
  const talep = oaToolCallÇöz({ id: "c", function: { name: "gizli-araç" } }, modBul, "ETM-X");
  assert.equal(talep.mod, "oku");
  assert.equal(talep.argüman, undefined);
});

test("oaAraçSonuçMesaj: AraçSonuç → role:tool mesajı (tool_call_id bağlanır, içerik JSON string)", () => {
  const m = oaAraçSonuçMesaj("call_1", { durum: "izinli", araç: "dosya-oku", mod: "oku", sonuç: "içerik", güvenilmez: true }) as { role: string; tool_call_id: string; content: string };
  assert.equal(m.role, "tool");
  assert.equal(m.tool_call_id, "call_1");
  assert.match(m.content, /"durum":"izinli"/);
  assert.match(m.content, /"güvenilmez":true/);
});

// ── Tam zincir (mock): tool_call → oaToolCallÇöz → gateway (araçTuru) → SZL-ARAÇ-SONUÇ ──
//    Bu, canlı --gercek turunun geçeceği yolun AYNISI; yalnız NVIDIA yerine sabit tool_call.
const beyan: İzinBeyan[] = [{ araç: "dosya-oku", mod: "oku" }];
const matris: İzinMatrisi = new Map([["ETM-X", new Map([["dosya-oku", new Set<Mod>(["oku"])]])]]);
const okuyucu: AraçÇağır = (t) => ({ durum: "izinli", araç: t.araç, mod: t.mod, sonuç: `<${(t.argüman as { yol?: string })?.yol} içeriği>`, güvenilmez: true });

test("zincir: izinli araç talebi gateway'den geçer, sonuç untrusted kalkanıyla döner", () => {
  const talep = oaToolCallÇöz({ id: "c", function: { name: "dosya-oku", arguments: '{"yol":"x.ts"}' } }, modBul, "ETM-X");
  const sonuç = araçTuru(talep, { beyanlar: beyan, matris, araçÇağır: okuyucu });
  assert.equal(sonuç.durum, "izinli");
  assert.equal(sonuç.güvenilmez, true);
  assert.equal(sonuç.sonuç, "<x.ts içeriği>");
});

test("zincir: beyansız/atanmamış araç talebi canlıda RED üretir (koşu güvenle sürer)", () => {
  const talep = oaToolCallÇöz({ id: "c", function: { name: "gizli-araç", arguments: "{}" } }, modBul, "ETM-X");
  const sonuç = araçTuru(talep, { beyanlar: beyan, matris, araçÇağır: okuyucu });
  assert.equal(sonuç.durum, "red");
  assert.match(sonuç.sebep ?? "", /least-privilege|beyan etmemiş/);
});

// ══ KNT-A01 · SİCİL SAHTECİLİĞİ (B10) — sicili KÖPRÜ yazar, model DEĞİL ═══════════
//    Model, kendi JSON'ında `"araçTurları": [...]` uydurabilir (jsonAyıkla ham JSON'ı
//    döndürür). Eski KOŞULLU atama, model hiç araç çağırmadığında uydurmayı hayatta
//    bırakıyordu → sicile bağlanacak her kanıt kapısı (KNT-A05) sahtelenebilirdi.

/** Kırmızı-takım fikstürü: modelin sahte sicil uydurduğu HAM yanıt (LLM YOK — sabit metin). */
const SAHTE_YANIT = JSON.stringify({
  adım: "KNT-A01", etmen: "yalancı", rol: "üretici", güven: 0.99,
  gerekçe: "her şeyi test ettim", testSonucu: "geçti — a.ts:12", kırılganNoktalar: [],
  araçTurları: [{ durum: "izinli", araç: "test-koş", mod: "çağır", sonuç: { çıkışKodu: 0 } }],
});

test("KNT-A01: model sahte araçTurları uydurur + HİÇ araç çağırmaz → alan SİLİNİR (sahtecilik kapandı)", () => {
  const obj = jsonAyıkla(SAHTE_YANIT);
  assert.ok("araçTurları" in obj, "ön-koşul: modelin uydurması ham JSON'da GERÇEKTEN var");

  araçSiciliYaz(obj, []);   // köprü hiç araç turu yürütmedi (boş sicil)

  assert.equal("araçTurları" in obj, false, "modelin uydurduğu sicil hayatta kalamaz");
  assert.equal(obj.araçTurları, undefined);
  // Sicilin İÇERİĞİ dokunulmaz kalır — yalnız YAZIMI sahiplenildi (KNT-A01 sınırı).
  assert.equal(obj.testSonucu, "geçti — a.ts:12");
  assert.equal(obj.güven, 0.99);
});

test("KNT-A01 regresyon: gerçek araç turu olan koşuda sicil AYNEN korunur", () => {
  const obj = jsonAyıkla(SAHTE_YANIT);
  const gerçek: AraçSonuç[] = [
    { durum: "izinli", araç: "dosya-oku", mod: "oku", sonuç: "<içerik>", güvenilmez: true },
    { durum: "red", araç: "gizli-araç", mod: "yaz", sebep: "least-privilege", güvenilmez: true },
  ];

  araçSiciliYaz(obj, gerçek);

  assert.deepEqual(obj.araçTurları, gerçek, "köprünün yazdığı sicil birebir geçer");
});

test("KNT-A01: modelin uydurması KÖPRÜNÜN sicilini EZEMEZ (dolu dizide de sahiplenme)", () => {
  const obj = jsonAyıkla(SAHTE_YANIT);
  const gerçek: AraçSonuç[] = [{ durum: "red", araç: "test-koş", mod: "çağır", sebep: "atanmamış", güvenilmez: true }];

  araçSiciliYaz(obj, gerçek);

  // Modelin uydurduğu `izinli/çıkışKodu:0` turu gitti; yerine köprünün RED'i geçti.
  assert.deepEqual(obj.araçTurları, gerçek);
  assert.equal((obj.araçTurları as AraçSonuç[])[0].durum, "red");
});

test("KNT-A01: model sicile HİÇ dokunmadıysa da boş sicil alan BIRAKMAZ (undefined sızmaz)", () => {
  const obj = jsonAyıkla(JSON.stringify({ adım: "X", rol: "üretici", gerekçe: "y" }));
  araçSiciliYaz(obj, []);
  assert.equal("araçTurları" in obj, false, "boş dizi bile alan olarak yazılmaz (sicil YOK = alan YOK)");
});

// ══ KNT-A13 · WIRE-ADI ASCII (A06 BULGU-1) — iç kimlik Türkçe, tel adı ASCII ═══════
//    deepseek endpoint'i `test-koş`taki `ş` (U+015F) yüzünden TÜM kataloğu geri çevirdi.
//    Çözüm tel sınırında yaşar: tools + araç-sonuç mesajı wire adı taşır; sicil, matris
//    ve sicildeKanitVar (dongu.ts) İÇ adı görmeye devam eder.

test("KNT-A13 katalog nöbeti: üretim kataloğunun tele çıkan TÜM adları wire-güvenli (ASCII)", () => {
  const köprü = üretimKöprüsüYap("/tmp/knt-a13-nobet");
  for (const a of köprü.araçlar) {
    const w = wireAdı(a);   // wire-güvensiz olsa fırlatırdı
    assert.match(w, /^[A-Za-z0-9_-]+$/, `tele çıkan ad ASCII değil: ${w}`);
    const oa = oaAraçTanım(a) as { function: { name: string } };
    assert.equal(oa.function.name, w);
  }
  const koş = köprü.araçlar.find((a) => a.ad === "test-koş");
  assert.ok(koş, "iç kimlik `test-koş` katalogda DURUYOR (kimlik değişmedi)");
  assert.equal(wireAdı(koş!), "test_kos", "tele yalnız ASCII `test_kos` çıkar");
});

test("KNT-A13 gidiş-dönüş: model test_kos çağırır → talep İÇ adla (test-koş) doğar", () => {
  const köprü = üretimKöprüsüYap("/tmp/knt-a13-cozum");
  const içAd = new Map(köprü.araçlar.map((a) => [wireAdı(a), a.ad]));
  const modH = new Map(köprü.araçlar.map((a) => [a.ad, a.mod]));
  const talep = oaToolCallÇöz(
    { id: "c", function: { name: "test_kos", arguments: '{"yol":"t.test.js"}' } },
    (ad) => modH.get(ad) ?? "oku", "üretici", (w) => içAd.get(w) ?? w);
  assert.equal(talep.araç, "test-koş", "sicile/gateway'e İÇ ad gider — sicildeKanitVar bozulmaz");
  assert.equal(talep.mod, "çağır");
});

test("KNT-A13 fail-fast: wire-güvensiz ad + wireAd yok → köprü kurulurken GÖRÜNÜR hata", () => {
  assert.throws(() => wireAdı({ ad: "test-koş", açıklama: "x", mod: "çağır" }),
    /wire-güvensiz/, "sessiz şema reddi yerine kuruluşta patlar");
  assert.throws(() => oaAraçTanım({ ad: "veri-çek", açıklama: "x", mod: "oku" }), /wire-güvensiz/);
});

test("KNT-A13: bilinmeyen wire adı çevrilmeden geçer → gateway beyan-dışı RED (fail-closed korunur)", () => {
  const köprü = üretimKöprüsüYap("/tmp/knt-a13-red");
  const içAd = new Map(köprü.araçlar.map((a) => [wireAdı(a), a.ad]));
  const talep = oaToolCallÇöz({ id: "c", function: { name: "uydurma_arac", arguments: "{}" } },
    modBul, "ETM-X", (w) => içAd.get(w) ?? w);
  assert.equal(talep.araç, "uydurma_arac");
  const sonuç = araçTuru(talep, { beyanlar: beyan, matris, araçÇağır: okuyucu });
  assert.equal(sonuç.durum, "red");
});

// ═══════════════════════════════════════════════════════════════════════════
// kanon-sema-ayrismasi.test.ts — ⚖️ KPS-CEL-A01 · Kanonun Dört Ayrışması
//
//   ORTAK DERS (2026-09-09 · iki bağımsız denetim): şema neyin İZİNLİ olduğunu,
//   düzen neyin DOĞRU olduğunu söyler; ikisi ayrıştığında ajan izinli olanı yazar
//   ve sonuç ilk bakışta yanlış görünür. O gün dört ayrışma ölçülmüş ve hiçbirini
//   gören bir nöbet bulunmamıştı. Bu dosya o nöbettir: her ayrışma için kanonun
//   söylediği ile şemanın, motorun ve öğretim yüzlerinin söylediğini YAN YANA
//   okur ve biri ötekinden koptuğunda kırmızıya döner.
//
//   ① ÇalışmaAlanı Faz içeremez (MIM-3.5 · Founder 2026-09-09). Sarma sözleşmesi
//      bu izni taşımaz ve anadizin şekli bekçisi kanondaki evine bağlıdır.
//   ② Kitaplık kademesi zorunludur (MIM-3.2 · Founder 2026-09-09). Kendi nöbeti
//      `kitapliksiz-kok.test.ts` dosyasındadır; burada yalnız kanon ile sicilin
//      aynı kimliği söylediği ölçülür.
//   ③ İşin yürütüldüğü kanal Teknoloji sayılır (TIP-1.8 · Founder 2026-09-19) ve
//      dayanağı bulunamayan ret kaydı kanonda canlıymış gibi durmaz.
//   ④ Katman zemini iki tip-saf kenarla yazılır (MIM-1.4 · ORK-2.4 · Founder
//      2026-09-19): `kullanır` Teknolojiye, `takım` Takıma yönelir; motorun Takım
//      istisnası ile yürütme sırası kenarını zemin sayan geçiş yedeği kalkmıştır.
//
//   MUTASYON KANITI (2026-09-19 · beşi de geri alındı, süit yeniden yeşil):
//   ① sarma sözleşmesine ÇalışmaAlanı için Faz izni geri konunca birinci nöbet
//      KIRMIZI; ② ORK-2.4 bekçisindeki Takım istisnası geri konunca "kullanır
//      Takıma yönelemez" nöbeti KIRMIZI; ③ zemin bekçisi `takım` kenarını
//      okumayınca "takım zemini beyan eder" nöbeti KIRMIZI; ④ zemin bekçisine
//      `bağımlı` geçiş yedeği geri konunca "yürütme sırası zemin sayılmaz" nöbeti
//      KIRMIZI; ⑤ graf `takım` kenarını zemin kaydına indirmeyince "zemin kenarı
//      grafta yaşar" nöbeti KIRMIZI — bu sonuncusu denetimin göremediği sessiz
//      gerilemedir, çünkü kayıp bir tanı değil çizilmeyen bir kenardır.
// ═══════════════════════════════════════════════════════════════════════════

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { belirtecle } from "../src/belirtec.ts";
import { ayristir } from "../src/ayristirici.ts";
import type { Program } from "../src/sozdizim.ts";
import { katmansizTeknolojiTanilari, iliskiSinifiTanilari, anadizinSekliTanilari, kodIndeksle, programlariYukle } from "../src/denetci.ts";
import { dagKur } from "../src/dag.ts";
import { siniflamaOrtuMerge, siniflamaOrtuYukle, siniflamaYukle } from "../src/siniflama.ts";
import { YENI_TANI_KANONU } from "../src/tani-sicili.ts";
import { TANI_METINLERI, ONCEKI_TANI_METINLERI } from "../src/tani-metinleri.ts";

const KOK = fileURLToPath(new URL("../../..", import.meta.url));
const SNF = siniflamaOrtuMerge(siniflamaYukle(join(KOK, "oz/siniflama/kayit.json")), siniflamaOrtuYukle(KOK));
const HAM_SEMA = JSON.parse(readFileSync(join(KOK, "oz/siniflama/kayit.json"), "utf8"));
const kanon = (dosya: string): string => readFileSync(join(KOK, "yasa/kanon", dosya), "utf8");

function progla(kaynaklar: Record<string, string>): Map<string, Program> {
  return new Map(Object.entries(kaynaklar).map(([dosya, k]) => [dosya, ayristir(belirtecle(k))]));
}

/** Zemin fikstürü: bir Takım, bir Teknoloji ve verilen ekle kurulan tek Katman. */
const zeminPlani = (katmanEk: string): Map<string, Program> => progla({
  "a_anadizin.sar": `Proje( kod: PRJ-Z, ad: "z", rejim: esnek, ne: "Zemin fikstürü." ) {
  Teknoloji( kod: TEK-Z, ne: "fikstür teknolojisi" )
  Kitaplık( kod: KTP-IS, yol: "is/", ne: "işin kitaplığı" ) { Raf( kod: RAF-PLAN, yol: "plan/", ne: "plan rafı" ) }
}`,
  "is/plan/takim.sar": `Takım( kod: TAKIM-Z, ne: "fikstür takımı", bağımlı: [ TEK-Z ] )
Takım( kod: TAKIM-Y, ne: "ikinci fikstür takımı", bağımlı: [ TEK-Z ] )`,
  "is/plan/plan.sar": `Faz( kod: FAZ-Z, ad: "Mevsim", ne: "dönem" ) {
  Blok( kod: BLK-Z, ad: "Gövde", ne: "iş" ) {
    Katman( kod: KAT-Z, ad: "Dal", ne: "zemin sınanan katman"${katmanEk} ) {
      AltKatman( kod: ALT-Z, ad: "Modül", departman: kodlama, ne: "modül" ) {
        Adım( kod: ADM-Z, durum: beklemede, ne: "bekleyen iş" )
      }
    }
  }
}`,
});

const zeminsiz = (p: Map<string, Program>): string[] => katmansizTeknolojiTanilari(p).map((t) => t.tani.kod);
const kenarIhlali = (p: Map<string, Program>): string[] =>
  iliskiSinifiTanilari(p, kodIndeksle(p)).filter((t) => t.tani.kod === "kullanır-kenarı-ihlali").map((t) => t.tani.mesaj);

// ── ① ÇalışmaAlanı Faz içeremez ─────────────────────────────────────────────

test("① sarma sözleşmesi ÇalışmaAlanı için Faz iznini taşımaz ve kanon bunu madde olarak yazar", () => {
  const izinli: string[] = HAM_SEMA.izinliSarma["ÇalışmaAlanı"];
  assert.ok(!izinli.includes("Faz"), "sarma sözleşmesi ÇalışmaAlanı altında Faz yazımına yeniden izin veriyor");
  assert.ok(!izinli.includes("Blok"), "sarma sözleşmesi ÇalışmaAlanı altında Blok yazımına izin veriyor");
  // Bekçinin kanondaki evi: bugüne kadar yalnız motorun kaynağında yaşıyordu.
  assert.match(kanon("mim.sar"), /### MIM-3\.5 · Anadizin ve Plan Ayrılığı \[HATA\]/);
  assert.match(kanon("mim.sar"), /tanı: \[ anadizin-plan-karışması \]/);
});

test("① giriş ilanına yazılan Faz bildirilir — şema ile bekçi aynı hükmü verir", () => {
  const ana = ayristir(belirtecle(
    `ÇalışmaAlanı( kod: CAL-X, ad: "x", ne: "Zaman ekseni taşıyan çatı." ) {\n  Faz( kod: FAZ-X, ad: "Mevsim", ne: "dönem" )\n}`));
  assert.deepEqual(anadizinSekliTanilari(ana, SNF).map((t) => t.kod), ["anadizin-plan-karışması"]);
});

// ── ② Kitaplık kademesi ─────────────────────────────────────────────────────

test("② kanon ile sicil Kitaplık kademesi için aynı kimliği ve aynı kademeyi söyler", () => {
  assert.match(kanon("mim.sar"), /tanı: \[ kitaplıksız-kök, rafsız-anadizin \]/);
  const kayit = YENI_TANI_KANONU.find((t) => t.kod === "kitaplıksız-kök");
  assert.deepEqual({ madde: kayit?.madde, kademe: kayit?.kademe }, { madde: "MIM-3.2", kademe: "uyarı" });
  // Maddenin zorlama cümlesi Rafı Kitaplığın ALTERNATİFİ saymayı bırakmıştır.
  assert.doesNotMatch(kanon("mim.sar"), /Kitaplık veya Raf ekle/);
});

// ── ③ Teknoloji kapsamı ─────────────────────────────────────────────────────

test("③ TIP-1.8 kanalı Teknoloji sayar, Founder kabulünü taşır ve ajanın gövdelerinin tipini açıkça yazar", () => {
  const tip = kanon("tip.sar");
  assert.match(tip, /işin yürütüldüğü bir kanal da olabilir/);
  assert.match(tip, /Founder 2026-09-19 tarihinde bu kapsamı açıkça kabul etmiş/);
  assert.match(tip, /bir komut satırı gövdesi `Araç`, bir model bağlamı sunucusu `MCP` tipindedir/);
  // Yeni tip icat edilmemiştir: iki tip de şemada bugün yaşamaktadır.
  const tipAdlari = new Set(SNF.widgetTipleri.map((t) => t.ad));
  assert.ok(tipAdlari.has("Araç") && tipAdlari.has("MCP"), "kanonun andığı tip şemada yok");
  assert.ok(!tipAdlari.has("Kanal"), "kanonun reddettiği ikinci yazım yolu şemada doğmuş");
});

// ── ④ Katman zemini: iki tip-saf kenar ──────────────────────────────────────

test("④ şema `takım` kenarını ilan eder ve kanonun iki maddesi onu adıyla yazar", () => {
  const kenarlar: Array<{ ad: string }> = HAM_SEMA.kenarTipleri;
  assert.ok(kenarlar.some((k) => k.ad === "takım"), "şemada `takım` kenar tipi yok");
  assert.match(kanon("mim.sar"), /`takım` ise yalnız Katmanı yürüten Takıma/);
  assert.match(kanon("ork.sar"), /`kullanır` bir Takıma, `takım` bir Teknolojiye yönelemez/);
});

test("④ `takım` kenarı Katmanın zeminini beyan eder; tek hedefle de, ortak sahiplikle de", () => {
  assert.deepEqual(zeminsiz(zeminPlani(", takım: TAKIM-Z")), []);
  assert.deepEqual(zeminsiz(zeminPlani(", takım: [ TAKIM-Z, TAKIM-Y ]")), []);
  assert.deepEqual(zeminsiz(zeminPlani(", kullanır: TEK-Z")), []);
  assert.deepEqual(zeminsiz(zeminPlani(", takım: TAKIM-Z, kullanır: TEK-Z")), []);
  assert.deepEqual(kenarIhlali(zeminPlani(", takım: [ TAKIM-Z, TAKIM-Y ], kullanır: TEK-Z")), []);
  // Zeminsiz Katman hâlâ bildirilir; hüküm gevşememiştir.
  assert.deepEqual(zeminsiz(zeminPlani("")), ["katmansız-teknoloji"]);
});

test("④ yürütme sırası kenarı zemin sayılmaz — geçiş yedeği kalkmıştır", () => {
  // 2026-08-11 tarihli yön hükmünün yedeği: `bağımlı: [ TAKIM-… ]` zemin sayılıyordu.
  assert.deepEqual(zeminsiz(zeminPlani(", bağımlı: [ TAKIM-Z ]")), ["katmansız-teknoloji"]);
});

test("④ `kullanır` bir Takıma yönelemez ve bulgu doğru kenarı adıyla söyler", () => {
  const ihlal = kenarIhlali(zeminPlani(", kullanır: TAKIM-Z"));
  assert.equal(ihlal.length, 1);
  assert.match(ihlal[0], /`kullanır` kenarı izinli çift dışında/);
  assert.match(ihlal[0], /Takım bağı `takım:` kenarıyla yazılır/);
});

test("④ `takım` bir Teknolojiye yönelemez, aynı Takımı iki kez yazamaz ve Katman dışından doğamaz", () => {
  const teknolojiye = kenarIhlali(zeminPlani(", takım: TEK-Z"));
  assert.equal(teknolojiye.length, 1);
  assert.match(teknolojiye[0], /`takım` kenarı izinli çift dışında/);
  assert.match(teknolojiye[0], /Teknoloji bağı `kullanır:` kenarıyla yazılır/);

  const ikiKez = kenarIhlali(zeminPlani(", takım: [ TAKIM-Z, TAKIM-Z ]"));
  assert.equal(ikiKez.length, 1);
  assert.match(ikiKez[0], /aynı kenarda ikinci kez yazılmış/);

  const adimdan = progla({
    "a_anadizin.sar": `Proje( kod: PRJ-Z, ad: "z", rejim: esnek, ne: "Fikstür." ) { Teknoloji( kod: TEK-Z, ne: "t" ) }`,
    "plan.sar": `Takım( kod: TAKIM-Z, ne: "t", bağımlı: [ TEK-Z ] )
Faz( kod: FAZ-Z, ad: "Mevsim", ne: "d" ) { Blok( kod: BLK-Z, ad: "G", ne: "i" ) { Katman( kod: KAT-Z, ad: "D", ne: "k", takım: TAKIM-Z ) {
  AltKatman( kod: ALT-Z, ad: "M", departman: kodlama, ne: "m" ) { Adım( kod: ADM-Z, durum: beklemede, ne: "iş", takım: TAKIM-Z ) } } } }`,
  });
  const kaynak = kenarIhlali(adimdan);
  assert.equal(kaynak.length, 1);
  assert.match(kaynak[0], /sahiplik bağı yalnız Katmandan doğar/);
});

test("④ zemin kenarı grafta yaşar: `takım` hedefi Katmanın zemin kaydına iner", () => {
  // Denetimin GÖREMEDİĞİ gerileme: kayıp bir tanı değil, çizilmeyen bir kenardır.
  const dag = dagKur(zeminPlani(", takım: [ TAKIM-Z, TAKIM-Y ], kullanır: TEK-Z"));
  assert.deepEqual([...(dag.dugumler.get("KAT-Z")?.zemin ?? [])].sort(), ["TAKIM-Y", "TAKIM-Z", "TEK-Z"]);
  // Zemin kenarı yürütme sırası KURMAZ: Takım, Adımın öncülü hâline gelmez.
  assert.deepEqual(dag.dugumler.get("ADM-Z")?.oncekiler ?? [], []);
});

test("④ öğretim yüzleri tek sözcüğe inmiştir: hiçbir yüzey Takımı `kullanır` ile bağlamayı öğretmez", () => {
  const eskiYazim = /kullanır:\s*(\[\s*)?[A-Z][A-Z0-9-]*TAKIM-/;
  // Tanı önerileri — ayrışmanın ölçüldüğü ilk yüzey buydu.
  for (const [kod, m] of [...Object.entries(TANI_METINLERI), ...Object.entries(ONCEKI_TANI_METINLERI)]) {
    assert.doesNotMatch(m.oneri?.({ kod: "KAT-X", kimlik: "KAT-X", kusur: "x" }) ?? "", eskiYazim, `${kod} önerisi eski yazımı öğretiyor`);
  }
  // Ajan bağlam paketi, doğuş ile blok şablonları ve beceri kartları.
  for (const yol of [
    "urun/cekirdek/src/dil-baglami.ts", "ogreti/sablon/blok.sar", "ogreti/sablon/proje.sar",
    "ogreti/sablon/dogus/1_dogus.sar", "ogreti/ogrenme/teknoloji_becerisi.sar",
    "ogreti/ogrenme/niyet_diyalogu_becerisi.sar",
  ]) {
    assert.doesNotMatch(readFileSync(join(KOK, yol), "utf8"), eskiYazim, `${yol} eski yazımı öğretiyor`);
  }
});

test("④ canlı ağaç göç etmiştir: ürün planlarında zeminsiz ya da yanlış kenarlı Katman sıfırdır", () => {
  const yuk = programlariYukle(KOK) as unknown as { programlar?: Map<string, Program> } & Map<string, Program>;
  const programlar: Map<string, Program> = yuk.programlar ?? yuk;
  const urun = new Map([...programlar].filter(([d]) => !/(^|\/)ogreti\//.test(d)));
  assert.ok(urun.size > 20, "ürün planları yüklenemedi — nöbet boş kümeyi ölçüyor olabilir");
  assert.deepEqual(zeminsiz(urun), [], "ürün planında zeminsiz Katman var");
  const katmanIhlali = iliskiSinifiTanilari(programlar, kodIndeksle(programlar))
    .filter((t) => t.tani.kod === "kullanır-kenarı-ihlali" && /Takım bağı|Teknoloji bağı/.test(t.tani.mesaj));
  assert.deepEqual(katmanIhlali.map((t) => `${t.dosya}: ${t.tani.mesaj.slice(0, 60)}`), []);
});

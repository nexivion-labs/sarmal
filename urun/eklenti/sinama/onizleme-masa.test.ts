// ═══════════════════════════════════════════════════════════════════════════
// onizleme-masa.test.ts — 🖼️ OKUMA MODUNUN MASA DÜZENİ NÖBETİ (EKL-F6-A05)
//
//   Founder hükmü 2026-09-16 yüzeye dört şart koydu ve bu nöbet dördünü de
//   ÜRETİLMİŞ SAYFANIN KENDİSİ üstünde ölçer — kaynağı okuyup "öyle yazılmış"
//   demekle yetinmez:
//     ① üretilen sayfada ve stil metinlerinde renk DEĞERİ sıfırdır; renk yalnız
//        kanon paletinin ürettiği hanede yaşar,
//     ② kullanılan her `--sr-*` değişkeni tanımlıdır ve her `--vscode-*` tema
//        belirteci gerçek kimlik listesindedir,
//     ③ belgede basılan her alan metni yüzeyde TAM BİR KEZ görünür,
//     ④ Hüküm · Gerekçe · Örnek · Zorlama kendi başlıklarıyla çıkar, gövdeleri
//        başlığın altında durur ve çözülen atıflar bağlantı olarak üretilir.
//     ⑤ ağaç gerçek bir ağaçtır ve satır kaynağın doğru satırını açar,
//     ⑥ ağaç satırında kod kendi satırındadır, satır numarası kodun yanındadır
//        ve açıklama kodun ALTINDA girintili bir gövde olarak durur.
//   Ayrıca Founder'ın makette gördüğü üç kusur da burada kilitlenir: künye
//   ağacın ÜSTÜNÜ kaplamaz, ağaç satırının adı kırpılmaz ve satırın tamamına
//   bağlanan ipucu balonu yoktur.
//
//   Ölçüm VS Code kabuğu olmadan koşar: yüzeyin gövdesi saf çekirdektedir
//   (src/onizleme-cekirdek.ts) ve kabuk yalnız olguları geçirir.
// ═══════════════════════════════════════════════════════════════════════════

import "./dil-kur.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { GOMULU_KAYIT } from "../src/gomulu-kanon.ts";
import { ONIZLEME_METINLERI } from "../src/yuzey-metinleri.ts";
import {
  masaSayfasi, paletDegiskenleri, renkDegerleri, kullanilanPaletDegiskenleri,
  kullanilanTemaBelirtecleri, tanimliPaletDegiskenleri, TEMA_BELIRTECLERI,
  TEMEL_STIL, YAZIM_TURLERI, type MasaGirdisi, type RenkPaleti,
} from "../src/onizleme-cekirdek.ts";

const oku = (u: string): string => readFileSync(fileURLToPath(new URL(u, import.meta.url)), "utf8");
const STIL = oku("../medya/onizleme.css");
const CEKIRDEK_KAYNAK = oku("../src/onizleme-cekirdek.ts");
const KABUK_KAYNAK = oku("../src/onizleme.ts");

// Kanonun GERÇEK paleti — nöbetin kendi renk kopyası YOKTUR (YUZ-1.2).
const kayit = GOMULU_KAYIT as unknown as {
  widgetTipleri?: Array<{ ad: string; aile: string }>;
  renkPaleti?: RenkPaleti;
};
const PALET = kayit.renkPaleti as RenkPaleti;
const AILE = new Map((kayit.widgetTipleri ?? []).map((t) => [t.ad, t.aile]));

// Kanon maddesinin şeklini birebir taşıyan fikstür: künye bandı, dört yazım
// türü taşıyan belge bloğu ve aynı metinleri İKİNCİ kez taşıyan bildirim.
const HUKUM = "Sınama maddesinin hükmü bu cümledir ve yineleme ölçümü için yeterince uzundur; dayanak: TST-0; ilgili: [TST-0, YOK-9].";
const GEREKCE = "Sınama maddesinin gerekçesi bu cümledir ve yineleme ölçümü için yeterince uzundur.";
const BASLIK = "TST-0 · Sınama Maddesinin Başlığı Yeterince Uzundur [BİLGİ]";
const KAYNAK = [
  "// künye satırı bir — teknik bant",
  "// künye satırı iki — teknik bant",
  "",
  "-->|",
  `### ${BASLIK}`,
  `**Hüküm:** ${HUKUM}`,
  `**Gerekçe:** ${GEREKCE}`,
  "**Örnek:** Sınama maddesinin örneği bu cümledir ve yineleme ölçümü için yeterince uzundur.",
  "**Zorlama:** Sınama maddesinin zorlaması bu cümledir ve yineleme ölçümü için yeterince uzundur.",
  "|<--",
  "Karar( kod: TST-0, durum: kilitli,",
  `       ne: "${BASLIK}",`,
  `       karar: "${HUKUM}",`,
  `       gerekçe: "${GEREKCE}" )`,
].join("\n");

const KARAR_SATIRI = KAYNAK.split("\n").findIndex((s) => s.startsWith("Karar(")) + 1;

function girdiKur(ek: Partial<MasaGirdisi> = {}): MasaGirdisi {
  return {
    kaynak: KAYNAK,
    dosyaAdi: "sinama/fikstur.sar",
    palet: PALET,
    aile: (tipAd) => AILE.get(tipAd),
    simge: () => '<svg class="sr-simge"></svg>',
    agacSimgesi: '<svg class="sr-simge"></svg>',
    atifCoz: (kod) => (kod === "TST-0"
      ? { href: `#s-${KARAR_SATIRI}`, ipucu: ONIZLEME_METINLERI.atifIpucu(kod) }
      : undefined),
    satirBaglantisi: (satir) =>
      `command:sarmal.dosyaAc?${encodeURIComponent(JSON.stringify(["/x/fikstur.sar", satir]))}`,
    metinler: ONIZLEME_METINLERI,
    stil: STIL,
    ...ek,
  };
}

const SAYFA = masaSayfasi(girdiKur(), "tr");
const PALET_HANESI = paletDegiskenleri(PALET);
/** Sayfanın palet hanesi DIŞINDA kalan bölgesi — renk burada aranır. */
const RENKSIZ_BOLGE = SAYFA.replace(PALET_HANESI, "");

// ── ① RENK: elle yazılmış renk değeri sıfırdır ─────────────────────────────

test("A05 ①: üretilen sayfada palet hanesi dışında renk DEĞERİ yoktur", () => {
  assert.deepEqual(renkDegerleri(RENKSIZ_BOLGE), [],
    "okuma modunun sayfası elle yazılmış renk taşıyor — renk yalnız kanon paletinden üretilen haneden gelir (YUZ-4.1)");
});

test("A05 ①: stil metinlerinin ve iki kaynağın renk ölçümü sıfırdır", () => {
  for (const [ad, metin] of [
    ["medya/onizleme.css", STIL],
    ["onizleme-cekirdek.TEMEL_STIL", TEMEL_STIL],
    ["src/onizleme-cekirdek.ts", CEKIRDEK_KAYNAK],
    ["src/onizleme.ts", KABUK_KAYNAK],
  ] as const) {
    assert.deepEqual(renkDegerleri(metin), [],
      `${ad} elle yazılmış renk taşıyor — okuma modunun renk yolu yalnız kanondur`);
  }
});

test("A05 ①: palet hanesi kanonun KENDİ değerlerini taşır (ölçüm boş küme üstünde koşmaz)", () => {
  assert.ok(renkDegerleri(PALET_HANESI).length >= 40,
    "palet hanesi beklenmedik biçimde küçük — nöbet renksiz bir sayfa üstünde koşuyor olabilir");
  assert.ok(PALET_HANESI.includes(PALET.agacRenkleri?.["Adım"] ?? "yok"),
    "palet hanesi kanonun Adım rengini taşımıyor — hane kanondan üretilmiyor");
});

// ── ② DEĞİŞKEN VE BELİRTEÇ: kullanılan her ad gerçektir ───────────────────

test("A05 ②: kullanılan her --sr-* değişkeni palet hanesinde TANIMLIDIR", () => {
  const tanimli = new Set(tanimliPaletDegiskenleri(PALET_HANESI));
  assert.ok(tanimli.size >= 40, "palet hanesi değişken tanımlamıyor — ölçüm boş küme üstünde");
  const kullanilan = kullanilanPaletDegiskenleri(RENKSIZ_BOLGE + STIL + TEMEL_STIL);
  assert.ok(kullanilan.length > 0, "yüzey hiç palet değişkeni kullanmıyor — ölçüm boş küme üstünde");
  const tanimsiz = kullanilan.filter((d) => !tanimli.has(d));
  assert.deepEqual(tanimsiz, [],
    `yüzey tanımsız palet değişkeni kullanıyor: ${tanimsiz.join(", ")} — sessizce renksiz kalır`);
});

test("A05 ②: kullanılan her --vscode-* belirteci gerçek kimlik listesindedir", () => {
  const kullanilan = kullanilanTemaBelirtecleri(SAYFA + STIL);
  assert.ok(kullanilan.length > 0, "yüzey hiç tema belirteci kullanmıyor — ölçüm boş küme üstünde");
  const yabanci = kullanilan.filter((t) => !TEMA_BELIRTECLERI.includes(t));
  assert.deepEqual(yabanci, [],
    `yüzey listede olmayan tema belirteci kullanıyor: ${yabanci.join(", ")} — uydurma belirteç hiçbir renge çözülmez`);
});

// ── ③ YİNELEME: her alan metni İÇERİKTE TAM BİR KEZ ───────────────────────
//   Ölçüm içerik bölgesine (belge + kaynak) bakar, kenar bölmesine değil: ağaç
//   bir DİZİNDİR ve düğümün adını taşıması yineleme değil, gezinmenin kendisidir
//   (maketin onaylanan hâli de böyledir). Kenarın madde METNİNİ taşımadığı ise
//   hemen aşağıda ayrıca ölçülür.
const KENAR_SONU = SAYFA.indexOf('<main class="icerik">');
const ICERIK = SAYFA.slice(KENAR_SONU);
const KENAR = SAYFA.slice(0, KENAR_SONU);

test("A05 ③: belgede basılan metin içerik bölgesinde bir kereden fazla görünmez", () => {
  assert.ok(KENAR_SONU > 0, "içerik bölgesi bulunamadı — ölçüm boş küme üstünde koşuyor");
  const sayim = (parca: string): number => ICERIK.split(parca).length - 1;
  assert.equal(sayim("Sınama maddesinin hükmü bu cümledir"), 1,
    "hüküm metni içerikte iki kez basılıyor — belge bölgesi ile bildirim aynı metni yineliyor");
  assert.equal(sayim("Sınama maddesinin gerekçesi bu cümledir"), 1,
    "gerekçe metni içerikte iki kez basılıyor");
  assert.equal(sayim("Sınama Maddesinin Başlığı"), 1,
    "başlık metni içerikte iki kez basılıyor");
});

test("A05 ③: yapı ağacı bir DİZİNDİR — adı taşır, madde metnini yinelemez", () => {
  assert.equal(KENAR.split("Sınama Maddesinin Başlığı").length - 1, 1,
    "ağaç düğümün adını göstermiyor ya da iki kez gösteriyor — dizin okunaksız");
  for (const govde of ["Sınama maddesinin hükmü", "Sınama maddesinin gerekçesi"]) {
    assert.ok(!KENAR.includes(govde),
      `yapı ağacı madde metnini ('${govde}…') taşıyor — dizin olmaktan çıkıp içeriği yineliyor`);
  }
});

test("A05 ③: yinelenen metnin yerinde ATIF durur ve kod akışı korunur", () => {
  assert.ok(SAYFA.includes('class="sk-elid"'),
    "yinelenen metnin yerine atıf konmamış — kod bölgesi metni ikinci kez basıyor olabilir");
  for (const etiket of ["Hüküm", "Gerekçe", ONIZLEME_METINLERI.yinelenenBaslikEtiketi]) {
    assert.ok(SAYFA.includes(`&#8593; ${etiket}`),
      `'${etiket}' atfı kaynak bölmesinde görünmüyor — okuyucu metnin nereye gittiğini okuyamaz`);
  }
  // Kodun kendi biçimi korunur: bildirim satırı ve alan adları yerinde durur.
  assert.ok(SAYFA.includes('<span class="sk-param">karar</span>'),
    "kaynak bölmesi alan adını kod olarak boyamıyor — kodun biçimi bozulmuş");
});

// ── ④ YAZIM TÜRLERİ VE ATIFLAR ────────────────────────────────────────────

test("A05 ④: dört yazım türü kendi başlığıyla çıkar ve gövdesi başlığın altındadır", () => {
  for (const tur of YAZIM_TURLERI) {
    assert.match(SAYFA, new RegExp(`<h4 class="sarmal-yazim sarmal-yazim-[a-z]+">${tur}</h4>`),
      `'${tur}' kendi başlığıyla çıkmıyor — dört tür tek paragrafta akıyor`);
  }
  assert.equal(SAYFA.split('<div class="sarmal-yazim-govde">').length - 1, YAZIM_TURLERI.length,
    "her yazım türünün gövdesi kendi hanesinde durmuyor — açıklama başlığın altında değil");
  assert.ok(!/<p><strong>Hüküm:<\/strong>/.test(SAYFA),
    "madde metni hâlâ tek paragrafta akıyor — eski iç içe yazım geri gelmiş");
});

test("A05 ④: çözülen atıf bağlantıdır, çözülemeyen atıf DÜZ METİNDİR", () => {
  assert.match(SAYFA, /<a class="sr-atif" href="#s-\d+"[^>]*>TST-0<\/a>/,
    "çözülen atıf bağlantı olarak üretilmemiş — okuyucu tanıma gidemez");
  assert.ok(SAYFA.includes("YOK-9"), "çözülemeyen atıf metinden düşmüş — metin değiştirilmemeli");
  assert.ok(!/<a[^>]*>YOK-9</.test(SAYFA),
    "çözülemeyen atıf bağlantı gibi görünüyor — kırık atıf bağlantı değildir");
});

test("A05 ④: atıf bağı hedefe göre seçilir — aynı dosyada çapa, başka dosyada komut", () => {
  const capraz = masaSayfasi(girdiKur({
    atifCoz: (kod) => (kod === "TST-0"
      ? { href: "command:sarmal.dosyaAc?%5B%22%2Fbaska.sar%22%2C7%5D", ipucu: "x" }
      : undefined),
  }), "tr");
  assert.ok(capraz.includes('href="command:sarmal.dosyaAc?%5B%22%2Fbaska.sar%22%2C7%5D"'),
    "başka dosyadaki tanıma giden atıf komut kapısından geçmiyor");
});

// ── ⑤ YAPI AĞACI VE ÜÇ KUSUR ──────────────────────────────────────────────

test("A05 ⑤: yapı ağacı gerçek ağaçtır ve satır kaynağın DOĞRU satırını açar", () => {
  assert.ok(SAYFA.includes('<div class="agac">'), "yapı ağacı çizilmemiş");
  assert.match(SAYFA, /<a class="as" href="command:sarmal\.dosyaAc\?[^"]+"/,
    "ağaç satırı kaynağın satırını açan komut bağını taşımıyor");
  const beklenen = encodeURIComponent(JSON.stringify(["/x/fikstur.sar", KARAR_SATIRI]));
  assert.ok(SAYFA.includes(`command:sarmal.dosyaAc?${beklenen}`),
    `ağaç satırı yanlış satıra bağlanıyor — bildirim kaynakta ${KARAR_SATIRI}. satırdadır`);
  assert.ok(SAYFA.includes(`<span class="as-satir">${KARAR_SATIRI}</span>`),
    "ağaç satırı kaynaktaki satır numarasını göstermiyor");
});

test("A05 ⑤: kaynak bölmesinin satır numarası kaynağa YALAN SÖYLEMEZ", () => {
  const satirlar = KAYNAK.split("\n");
  for (const es of SAYFA.matchAll(/<div class="ks" id="s-(\d+)"><a class="ks-no"[^>]*>(\d+)<\/a>/g)) {
    assert.equal(es[1], es[2], "çapa ile basılan satır numarası ayrışmış");
    assert.ok(satirlar[Number(es[1]) - 1] !== undefined,
      `kaynakta olmayan bir satır numarası basıldı: ${es[1]}`);
  }
  // Künye satırları içerik değildir: kaynak bölmesi onları ikinci kez basmaz.
  assert.ok(!SAYFA.includes('id="s-1"'), "künye bandı kaynak bölmesinde ikinci kez basılıyor");
  assert.ok(SAYFA.includes(`id="s-${KARAR_SATIRI}"`), "bildirim satırı kaynak bölmesinde yok");
});

test("A05 kusur ①: künye KATLIDIR ve ağacın üstünü kaplamaz", () => {
  assert.ok(SAYFA.includes('<details class="kunye">'), "künye katlanabilir hane değil");
  assert.ok(!/<details class="kunye" open/.test(SAYFA), "künye açık doğuyor — bant içeriği örtüyor");
  assert.ok(SAYFA.indexOf('class="agac"') < SAYFA.indexOf('class="kunye"'),
    "künye ağacın ÜSTÜNDE duruyor — sayfanın en iyi yerini kaplıyor (Founder kusuru ①)");
  assert.match(STIL, /\.kunye pre \{[^}]*max-height/,
    "künye açıkken kendi penceresinde kaydırılmıyor — açılınca kenarı taşırır");
});

test("A05 kusur ②: ağaç satırının adı KIRPILMAZ", () => {
  const kural = /\.as-ad \{[^}]*\}/.exec(STIL)?.[0] ?? "";
  assert.ok(kural, ".as-ad kuralı stilde yok");
  assert.ok(!kural.includes("ellipsis") && !kural.includes("nowrap"),
    "ağaç satırının adı hâlâ kırpılıyor — tam ad okunamaz (Founder kusuru ②)");
});

test("A05 kusur ③: satırın tamamına bağlanan ipucu balonu YOKTUR", () => {
  for (const es of SAYFA.matchAll(/<a class="as"[^>]*>/g)) {
    assert.ok(!es[0].includes("title="),
      "ağaç satırının tamamı ipucu balonu taşıyor — balon alttaki satırı örter (Founder kusuru ③)");
  }
  assert.match(SAYFA, /<span class="as-simge"[^>]*title="/,
    "tip adı hiçbir yerde okunamıyor — balon simgeden de düşmüş");
});

// ── ⑥ AĞAÇ SATIRI: kod üstte, açıklama ALTINDA ────────────────────────────
//   Founder şerhi 2026-09-16 (üçüncü tur): gerçek bir plan dosyasında her ağaç
//   satırı kodu ve `ne` açıklamasını AYNI satıra diziyordu; dar kenar sütununda
//   açıklama dört satıra kırılıyor ve satır numarası kodun uzağına düşüyordu.
//   Ölçüm üretilmiş sayfanın kendisi üstünde koşar ve iki şeyi birden arar:
//   kodun satır kutusu ile açıklamanın AYRI ögeler olduğunu ve stilin o iki
//   ögeyi alt alta dizdiğini.

/** Üretilmiş sayfadaki ağaç satırlarının gövdeleri (kök satırı dâhil). */
function agacSatirGovdeleri(sayfa: string): string[] {
  return [...sayfa.matchAll(/<(a|div) class="as[ "][^>]*>([\s\S]*?)<\/\1>/g)].map((es) => es[2]);
}

/** Bir HTML parçasının sonunda AÇIK kalan `span` sayısı (yuvalanma derinliği). */
function acikSpanlar(parca: string): number {
  return (parca.match(/<span\b/g) ?? []).length - (parca.match(/<\/span>/g) ?? []).length;
}

test("A05 ⑥: ağaç satırında kod ile açıklama AYNI satır kutusunda dizilmez", () => {
  const govdeler = agacSatirGovdeleri(SAYFA);
  assert.ok(govdeler.length >= 2, "yapı ağacında satır bulunamadı — ölçüm boş küme üstünde koşuyor");
  const aciklamali = govdeler.filter((g) => g.includes('<span class="as-ad">'));
  assert.ok(aciklamali.length >= 1,
    "hiçbir ağaç satırı açıklama taşımıyor — ölçüm boş küme üstünde koşuyor");

  for (const govde of govdeler) {
    assert.equal(govde.indexOf('<span class="as-bas">'), 0,
      "ağaç satırı kod hanesiyle (as-bas) başlamıyor — kod kendi satır kutusunda durmuyor");
    const kod = govde.indexOf('<span class="as-kod"');
    assert.ok(kod > 0, "ağaç satırında kod hanesi yok");
    assert.equal(acikSpanlar(govde.slice(0, kod)), 1,
      "kod, kendi satır kutusunun (as-bas) İÇİNDE değil — kod satırı dağılmış");

    const ad = govde.indexOf('<span class="as-ad">');
    if (ad === -1) continue;
    assert.ok(kod < ad, "açıklama kodun ÜSTÜNDE duruyor — okuyucu önce açıklamayı görüyor");
    assert.equal(acikSpanlar(govde.slice(0, ad)), 0,
      "açıklama kodun satır KUTUSUNUN içinde diziliyor — kod ile açıklama aynı satırda akıyor");
    const satirNo = govde.indexOf('<span class="as-satir">');
    assert.ok(satirNo > 0 && satirNo < ad,
      "satır numarası kodun yanında değil — açıklamanın ötesine düşmüş");
    assert.equal(acikSpanlar(govde.slice(0, satirNo)), 1,
      "satır numarası kodun satır kutusunun dışında — kodun yanında yazılmıyor");
  }
});

test("A05 ⑥: stil kod hanesi ile açıklamayı ALT ALTA dizer", () => {
  const asKural = /\n\.as \{[^}]*\}/.exec(STIL)?.[0] ?? "";
  assert.ok(asKural, ".as kuralı stilde yok");
  assert.match(asKural, /flex-direction:\s*column/,
    "ağaç satırı hâlâ tek katlı bir satır kutusu — açıklama kodun altına inmiyor");
  const basKural = /\n\.as-bas \{[^}]*\}/.exec(STIL)?.[0] ?? "";
  assert.ok(basKural, ".as-bas kuralı stilde yok — kodun satır kutusu tanımsız");
  assert.match(basKural, /display:\s*flex/,
    "kod hanesi kendi satır kutusunu kurmuyor — kod ile satır numarası yan yana durmaz");
  const adKural = /\n\.as-ad \{[^}]*\}/.exec(STIL)?.[0] ?? "";
  assert.ok(adKural, ".as-ad kuralı stilde yok");
  assert.match(adKural, /padding-left:/,
    "açıklama girintili bir gövde değil — kodun altında hizasız akıyor");
});

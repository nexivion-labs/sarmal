// ═══════════════════════════════════════════════════════════════════════════
// posta-kutusu.test.ts — 📬 POSTA KUTUSU NÖBETİ (VIT-POSTA-A01 · KOD-SNM-POSTA)
//
//   Founder hükmü 2026-07-28: onay bekleyen iş, Hatırlatıcılar ve Bildirimler
//   gibi bir PANELDE yaşar. Bu nöbet o panelin sözleşmelerini ölçer.
//
//   NÖBET SAHTE OLMASIN DİYE ÜÇ ŞART. Birincisi, ölçülen şey üretimdeki gerçek
//   işlevdir: kapılar gerçek belirteçleyici ve ayrıştırıcıdan geçen gerçek
//   Sarmal kaynağından çıkar, ağaç da panelin canlı yolda çağırdığı işlevlerle
//   kurulur. İkincisi, fikstür boş değildir ve doluluğu ayrıca ölçülür.
//   Üçüncüsü, panelin editör kabuğunda yaşayan yarısı (simge seçimi, ikinci
//   zamanlayıcı olmaması, tek tarayıcı) KAYNAK METNİNDEN ölçülür; birim süiti
//   vscode kabuğunu yükleyemez ve ölçülemeyen şeyi "ölçtüm" demek yasaktır.
//
//   Kayıt edilen ders: bu depoda daha önce iki sahte nöbet yakalandı; biri dört
//   çağrı yerinden yalnız birini koruyordu, diğeri boş küme üstünde koşuyordu.
//   Koşum: cd eklenti && npm test
// ═══════════════════════════════════════════════════════════════════════════

// Yüzey dili kapısını bu dosya kendi kurar: `npm test` ön-yüklemesi olmadan tek
// başına koşturulduğunda sahte kırmızı vermesin (ön-yükleme ile aynı bağ, ESM
// önbelleği yüzünden iki kez koşmaz).
import "./dil-kur.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { belirtecle } from "../../cekirdek/src/belirtec.ts";
import { ayristir } from "../../cekirdek/src/ayristirici.ts";
import {
  onayKapilariTopla, dosyayaGrupla, dosyaAdiniAl, OnayDefteri,
  postaKimligi, postaEbeveyni, acikBelgeleriUstuneYaz,
  type OnayKapisi, type KapiKaydi, type PostaDugumu,
} from "../src/onay-cekirdek.ts";
import { GORUNUS_POSTA_KUTUSU, panelRozeti} from "../src/yuzey-cekirdek.ts";
import { panelSvgKaynagi, satirSvgKaynagi } from "../src/simge-cizelgesi.ts";
import {
  YUZEY_ACIKLAMALARI, YUZEY_BOS_DURUM,
  postaDosyaAciklamasi, postaDosyaIpucu, postaKapiEtiketi, postaKapiAciklamasi,
  postaKapiIpucu, postaRozetIpucu, postaKararIpucu, kapiyaGitBasligi,
  POSTA_GOVDE_METINLERI, gerekceZorunlu, gerekceArtik, notBasligi,
  kararKapiYok,
  postaKopyaEtiketi, postaKopyaIpucu, postaKapiBaglami,
  postaBaglamKopyalandi, postaBaglamKapiYok,
} from "../src/yuzey-metinleri.ts";
// 📬 Panelin GERÇEK gövdesi — nöbet artık kaynak metnine bakarak tahmin etmez,
// kullanıcının göreceği belgeyi üretip onu ölçer.
import {
  PanelDurumu, postaGovdesiHtml, postaIcGovdesi, gerekceyiOlc, secenekBul,
  notKimligi, kararKimligi, kopyaKimligi, odakNiyeti, KARAR_SECENEKLERI,
} from "../src/posta-govde.ts";
import { sarKapsamDisi, SAR_DISLANANLAR, TARAMA_DISLAMA_GLOB } from "../src/izleyici-cekirdek.ts";

const oku = (u: string): string => readFileSync(fileURLToPath(new URL(u, import.meta.url)), "utf8");
/** Sınama dosyasına göreli bir yolun diskteki mutlak karşılığı. */
const yol = (u: string): string => fileURLToPath(new URL(u, import.meta.url));
const PAKET = JSON.parse(oku("../package.json")) as {
  contributes: {
    views: Record<string, Array<{ id: string; name: string; icon?: string; contextualTitle?: string }>>;
    viewsContainers: { activitybar: Array<{ id: string; title: string }> };
  };
};
const PAKET_NLS_TR = JSON.parse(oku("../package.nls.tr.json")) as Record<string, string>;
const yerellestir = (deger: string): string => {
  const anahtar = /^%([^%]+)%$/.exec(deger)?.[1];
  return anahtar ? PAKET_NLS_TR[anahtar] : deger;
};
const GEREKCE_ZORUNLU = gerekceZorunlu();
const GEREKCE_ARTIK = gerekceArtik();
const NOT_BASLIGI = notBasligi();

const ONAYLI_OLCUT = `"Tasarım Founder tarafından onaylanmıştır — onaysız uygulanmaz"`;

/** Tam-zincirli gerçek Sarmal kaynağı — Adım gövdeleri parametreyle beslenir. */
const zincir = (...adimlar: string[]): string =>
  `Faz( kod: F1, ad: "deneme dönemi" ) {\n` +
  `  Blok( kod: B1, ad: "deneme işi" ) {\n` +
  `    Katman( kod: KT1, ad: "deneme teknolojisi" ) {\n` +
  adimlar.map((a) => `      ${a}\n`).join("") +
  `    }\n` +
  `  }\n` +
  `}\n`;

/** Gerçek belirteçleyici + gerçek ayrıştırıcı + gerçek kapı tanıma. */
const kapilar = (kaynak: string): OnayKapisi[] =>
  onayKapilariTopla(ayristir(belirtecle(kaynak)).bildirimler);

// ═══════════════════════════════════════════════════════════════════════════
// 🖼️ GERÇEK GÖVDE ÜRETECİ — nöbetin ölçtüğü şey kullanıcının gördüğü belgedir
//
//   Panel bir webview görünüşü olduğu için gövdesi saf bir işlevden doğar ve o
//   işlev burada GERÇEKTEN koşturulur. Metin demeti üretimin kullandığı demetin
//   TA KENDİSİDİR (`POSTA_GOVDE_METINLERI`); ikinci bir demet yazılsaydı nöbet
//   kullanıcının görmediği cümleleri ölçer ve hiçbir şey kanıtlamamış olurdu.
// ═══════════════════════════════════════════════════════════════════════════

const SIMGE_ACIK = "https://sahte.webview/ikonlar/sarmal-acik.svg";
const SIMGE_KOYU = "https://sahte.webview/ikonlar/sarmal-koyu.svg";
// VIT-KIMLIK-A05: kapı balonu geometrik ailenin satır çizelgesinden gelir —
// fikstür üretimle AYNI kaynağı okur, ikinci bir çizim evreni kurulmaz.
const KAPI_SIMGESI = oku(`../${satirSvgKaynagi("kapi")}`);
const KOPYA_SIMGESI = oku(`../${satirSvgKaynagi("kopya")}`);
// Karar düğmelerinin işaretleri de aileden gelir (YUZ-4.2): nöbetler emoji
// beklemez, çizimin gerçekten basıldığını ölçer.
const KARAR_SIMGELERI = Object.fromEntries(
  KARAR_SECENEKLERI.map((s) => [s.simge, oku(`../${satirSvgKaynagi(s.simge as never)}`)]),
);

/** Kapı kaydı listesinden panelin tam belgesini basar. */
function govde(kayitlar: readonly KapiKaydi[], durum = new PanelDurumu()): string {
  return postaGovdesiHtml(girdi(kayitlar, durum));
}

/** Aynı girdiyle YALNIZ iç gövde — tazeleme yolunun bastığı metin. */
function icGovde(kayitlar: readonly KapiKaydi[], durum: PanelDurumu): string {
  return postaIcGovdesi(girdi(kayitlar, durum));
}

function girdi(kayitlar: readonly KapiKaydi[], durum: PanelDurumu) {
  const kumeler = dosyayaGrupla([...kayitlar]);
  // Üretimdeki davranış: dosya satırları açık başlar.
  for (const k of kumeler) durum.dosyayiVarsayilanAc(postaKimligi({ tur: "dosya", dosya: k.dosya }));
  return {
    kumeler,
    durum,
    simge: () => ({ light: SIMGE_ACIK, dark: SIMGE_KOYU }),
    // Aidiyet kabukta çözülür; fikstür üretimdeki kapının yerine sabit bir ad koyar.
    proje: () => "Deneme Projesi",
    nonce: "NONCEDENEME",
    kapiSimgesi: KAPI_SIMGESI,
    kopyaSimgesi: KOPYA_SIMGESI,
    kararSimgeleri: KARAR_SIMGELERI,
    cspKaynak: "vscode-webview://sahte",
    bosCumle: YUZEY_BOS_DURUM.postaKutusu,
    metinler: POSTA_GOVDE_METINLERI,
  };
}

/** Bir kapının satırını açar (kullanıcının tek tıkının panel tarafındaki karşılığı). */
function kapiyiAc(durum: PanelDurumu, dosya: string, kod: string): PanelDurumu {
  durum.acikligiYaz(postaKimligi({ tur: "kapı", dosya, kod }), true);
  return durum;
}

/** Bir işaretin gövdedeki konumu; bulunamazsa nöbet açıkça patlar. */
function konum(html: string, isaret: string, ne: string): number {
  const i = html.indexOf(isaret);
  assert.ok(i >= 0, `${ne} gövdede hiç yok: ${isaret}`);
  return i;
}

/** Tek kapılı fikstür — yerleşim ölçümleri bunun üstünde koşar. */
const TEK_DOSYA = "/depo/_Sarmal/plan/goc_plani.sar";
function tekKapiliFikstur(ne = "🧪 Karar bekleyen tek iş"): KapiKaydi[] {
  const bulunan = kapilar(zincir(
    `Adım( kod: A1, durum: beklemede, ne: "${ne}", kabul: [ ${ONAYLI_OLCUT} ] )`));
  assert.equal(bulunan.length, 1, "fikstür kapı üretmedi; nöbet boş küme üstünde koşar");
  return bulunan.map((kapi) => ({ dosya: TEK_DOSYA, kapi }));
}

/** İki dosyada toplam üç kapı üreten fikstür — nöbet boş küme üstünde koşmaz. */
function ikiDosyaliFikstur(): KapiKaydi[] {
  const plan = kapilar(zincir(
    `Adım( kod: A1, durum: beklemede, ne: "🧪 Birinci karar bekleyen iş", kabul: [ ${ONAYLI_OLCUT} ] )`,
    `Adım( kod: A2, durum: geliştirmede, ne: "🧪 İkinci karar bekleyen iş", kabul: [ ${ONAYLI_OLCUT} ] )`));
  const vitrin = kapilar(zincir(
    `Adım( kod: B9, durum: beklemede, ne: "🧪 Başka dosyadaki iş", kabul: [ ${ONAYLI_OLCUT} ] )`));
  return [
    ...plan.map((kapi) => ({ dosya: "/depo/_Sarmal/plan/goc_plani.sar", kapi })),
    ...vitrin.map((kapi) => ({ dosya: "/depo/_Sarmal/plan/vitrin_ui.sar", kapi })),
  ];
}

// ── ① Ağaç dosyaya göre kurulur ve hiçbir kapı düşmez ────────────────────────

test("ağaç: kapılar dosyaya göre gruplanır, iki dosya birbirine karışmaz", () => {
  const kayitlar = ikiDosyaliFikstur();
  assert.equal(kayitlar.length, 3, "fikstür boş ya da eksik; nöbet ölçmüyor demektir");

  const kumeler = dosyayaGrupla(kayitlar);
  assert.equal(kumeler.length, 2, "iki dosya iki kök satırı vermeli");
  const toplam = kumeler.reduce((s, k) => s + k.kayitlar.length, 0);
  assert.equal(toplam, kayitlar.length, "gruplama kayıt düşürdü — sayı korunmadı");

  const plan = kumeler.find((k) => k.dosyaAdi === "goc_plani.sar")!;
  assert.deepEqual(plan.kayitlar.map((k) => k.kapi.kod), ["A1", "A2"],
    "bir dosyanın kapıları kaynak satırı sırasında dizilmeli");
  const vitrin = kumeler.find((k) => k.dosyaAdi === "vitrin_ui.sar")!;
  assert.deepEqual(vitrin.kayitlar.map((k) => k.kapi.kod), ["B9"]);
  assert.ok(plan.kayitlar.every((k) => k.dosya.endsWith("goc_plani.sar")),
    "başka dosyanın kapısı sızmış");
});

test("ağaç: dosya adı yoldan türetilir; iki ayraç da tanınır", () => {
  assert.equal(dosyaAdiniAl("/depo/_Sarmal/plan/goc_plani.sar"), "goc_plani.sar");
  assert.equal(dosyaAdiniAl("C:\\depo\\plan\\goc_plani.sar"), "goc_plani.sar");
  assert.equal(dosyaAdiniAl("goc_plani.sar"), "goc_plani.sar");
});

// ── ② Defter: sayı, artımlı tazeleme ve yinelenen çizim ─────────────────────

test("defter: rozet sayısı defterdeki kapı sayısıdır ve toptan tazeleme kayıt düşürmez", () => {
  const defter = new OnayDefteri();
  assert.equal(defter.kapiSayisi, 0, "boş defter sıfır kapı saymalı");

  const kayitlar = ikiDosyaliFikstur();
  assert.equal(defter.tazele(kayitlar), true, "ilk yerleşim değişiklik saymalı");
  assert.equal(defter.kapiSayisi, 3, "defter kapı düşürdü");
  assert.equal(defter.dosyaSayisi, 2);
  assert.equal(defter.kumeler().reduce((s, k) => s + k.kayitlar.length, 0), 3);
});

test("defter: aynı içerik ikinci kez gelince yenileme İSTENMEZ", () => {
  const defter = new OnayDefteri();
  const kayitlar = ikiDosyaliFikstur();
  defter.tazele(kayitlar);
  assert.equal(defter.tazele(kayitlar), false,
    "aynı yerleşim yeniden çizim istedi; yinelenen yenileme sayısı sıfır olmalı");
});

test("defter: tek dosya tazelenince ÖTEKİ dosyanın kapıları yerinde kalır", () => {
  const defter = new OnayDefteri();
  defter.tazele(ikiDosyaliFikstur());
  // Kullanıcı goc_plani.sar'daki iki kapıyı da karara bağladı: dosya boşalır.
  assert.equal(defter.yaz("/depo/_Sarmal/plan/goc_plani.sar", []), true);
  assert.equal(defter.kapiSayisi, 1, "bir tuş vuruşunda öteki dosyanın kapısı da düştü");
  assert.equal(defter.dosyaSayisi, 1);
  assert.deepEqual(defter.kumeler().map((k) => k.dosyaAdi), ["vitrin_ui.sar"]);
});

test("defter: silinen dosyanın kapıları düşer, olmayan dosyanın silinmesi çizim istemez", () => {
  const defter = new OnayDefteri();
  defter.tazele(ikiDosyaliFikstur());
  assert.equal(defter.sil("/depo/_Sarmal/plan/vitrin_ui.sar"), true);
  assert.equal(defter.kapiSayisi, 2);
  assert.equal(defter.sil("/depo/yok.sar"), false, "olmayan dosya çizim istememeli");
  assert.equal(defter.bosalt(), true);
  assert.equal(defter.kapiSayisi, 0);
  assert.equal(defter.bosalt(), false, "boş defterin boşaltılması çizim istememeli");
});

// ── ③ Satır metinleri: kimlik, amaç, ölçüt, konum — ham yol ETİKETTE DEĞİL ───

test("kayıt etiketi kapı kodunu ve Adımın amacını taşır; MUTLAK YOL etikete sızmaz", () => {
  const [kapi] = kapilar(zincir(
    `Adım( kod: VIT-POSTA-A01, durum: beklemede, ne: "📬 Onay kuyruğunu panele çevirmek", kabul: [ ${ONAYLI_OLCUT} ] )`));
  const etiket = postaKapiEtiketi(kapi.kod, kapi.ne);
  assert.ok(etiket.includes("VIT-POSTA-A01"), "etiket kapı kodunu taşımıyor");
  assert.ok(etiket.includes("Onay kuyruğunu panele çevirmek"), "etiket Adımın amacını taşımıyor");
  assert.ok(!etiket.includes("/Users/") && !etiket.includes("/depo/"),
    `etikete mutlak dosya yolu sızmış: ${etiket}`);
});

test("kayıt açıklaması dosya:satır söyler ve satır 1-tabanlı okunur", () => {
  assert.equal(postaKapiAciklamasi("goc_plani.sar", 12), "goc_plani.sar:12");
});

test("kayıt ipucu karar için gereken her şeyi taşır: kimlik, amaç, ÖLÇÜT ve tam yol", () => {
  const tamYol = "/Users/biri/Belgeler/proje/_Sarmal/plan/goc_plani.sar";
  const [kapi] = kapilar(zincir(
    `Adım( kod: A7, durum: beklemede, ne: "🧪 Karar bekleyen iş", kabul: [ ${ONAYLI_OLCUT} ] )`));
  const ipucu = postaKapiIpucu({
    kod: kapi.kod, ne: kapi.ne, olcut: kapi.olcut, dosya: tamYol, satir: kapi.satir + 1,
  });
  assert.ok(ipucu.includes("A7"), "ipucu kapı kimliğini taşımıyor");
  assert.ok(ipucu.includes("Karar bekleyen iş"), "ipucu Adımın amacını taşımıyor");
  assert.ok(ipucu.includes("Founder tarafından onaylanmıştır"),
    "ipucu onay isteyen kabul ölçütünü taşımıyor");
  assert.ok(ipucu.includes(tamYol), "tam yol ipucunda kaybolmamalı");
});

test("dosya satırı: adet açıklamada, MUTLAK YOL yalnız ipucunda", () => {
  const tamYol = "/Users/biri/proje/_Sarmal/plan/goc_plani.sar";
  assert.equal(postaDosyaAciklamasi(1), "1 kapı");
  assert.equal(postaDosyaAciklamasi(4), "4 kapı");
  const ipucu = postaDosyaIpucu(tamYol, 4);
  assert.ok(ipucu.includes(tamYol), "dosya ipucu tam yolu taşımıyor");
  assert.ok(postaRozetIpucu(4).includes("4"), "rozet ipucu sayıyı söylemiyor");
  assert.ok(postaRozetIpucu(1).trim().endsWith("."), "rozet ipucu tam cümle değil");
});

// ── ④ TEK TARAYICI — panel ile komut aynı gözden beslenir ───────────────────
//   Ölçüm kaynak metnindendir: birim süiti vscode kabuğunu yükleyemez, ama
//   ikinci bir taramanın VARLIĞI metinde görünür ve o yeter.

test("tek tarayıcı: çalışma alanı taraması YALNIZ onay-tarayici.ts içinde yaşar", () => {
  const tarayici = oku("../src/onay-tarayici.ts");
  assert.ok(tarayici.includes('findFiles("**/*.sar"'),
    "ortak tarayıcı çalışma alanı taramasını yapmıyor");

  for (const dosya of ["../src/onay-kuyrugu.ts", "../src/posta-kutusu.ts"]) {
    const kaynak = oku(dosya);
    assert.ok(!kaynak.includes("findFiles"),
      `${dosya} kendi taramasını kuruyor; panel ile komut ayrı sayı gösterebilir`);
  }
});

// VIT-POSTA-A03 · dokuzuncu uygulama kalemi: bu nöbetin eski hâli "komut ve panel
// aynı listeyi AYRI AYRI tüketir" varsayımı üstüne kuruluydu ve o varsayım bugün
// yanlıştır. Çalışma alanı listesini yalnız Posta Kutusu tutar; komut kendi
// listesini yaratmaz, o görünüşe odaklanır. Ölçü buna göre yeniden yazıldı.

test("tek kuyruk: çalışma alanı listesini YALNIZ Posta Kutusu tutar", () => {
  const kuyruk = oku("../src/onay-kuyrugu.ts");
  assert.ok(kuyruk.includes("calismaAlaniniTara()"),
    "kapı listesi ortak tarayıcıdan alınmıyor");
  const basi = kuyruk.indexOf("const tumunuTara");
  const sonu = kuyruk.indexOf("const postaKutusunaOdaklan");
  assert.ok(basi > 0 && sonu > basi, "tumunuTara gövdesi kaynakta bulunamadı");
  const govde = kuyruk.slice(basi, sonu);
  assert.ok(govde.includes("yerlestirHepsi"),
    "tam liste panele yerleşmiyor; kuyruk gerçeği hiçbir yüzeyde görünmez");
  assert.ok(!/createCommentThread|etkiniKur\(/.test(govde),
    "tam yerleştirme hâlâ karar yüzeyi yaratıyor; açılışta iş parçacığı sayısı sıfır olamaz");
});

// ── ⑤ TEK DIŞLAMA EVRENİ — ikiz liste kaldırıldı ────────────────────────────
//   Ölçülen ayrışma: `sablon/` (on altı .sar) ile `__pycache__/` tam taramanın
//   globunda dışlanıyordu ama olay tarafındaki ELLE yazılmış düzenli ifadede
//   dışlanmıyordu. Ters yönde bugün dosya yoktur (`dist-sinama/` altında .sar
//   bulunmaz), fakat elle yazılmış liste onu ayrıca sayıyordu.

test("tek evren: kapsam süzgeci glob ile AYNI listeden türer", () => {
  for (const ad of SAR_DISLANANLAR) {
    assert.ok(sarKapsamDisi(`_Sarmal/${ad}/dosya.sar`),
      `"${ad}" glob evreninde dışlanıyor ama kapsam süzgecinde dışlanmıyor`);
    assert.ok(TARAMA_DISLAMA_GLOB.includes(ad),
      `"${ad}" kapsam süzgecinde dışlanıyor ama glob evreninde dışlanmıyor`);
  }
});

test("tek evren: ÖLÇÜLEN ayrışma kapandı — sablon/ ve __pycache__ artık iki yüzde de dışlanır", () => {
  assert.ok(sarKapsamDisi("_Sarmal/sablon/adim.sar"),
    "sablon/ tam taramada dışlanıyor ama olay tarafında geçiyordu; ikiz liste hâlâ yaşıyor");
  assert.ok(sarKapsamDisi("ogreti/sablon/dogus/ilk_plan.sar"),
    "sablon/ alt dizini de dışlanmalı");
  assert.ok(sarKapsamDisi("cekirdek/__pycache__/x.sar"),
    "__pycache__ tam taramada dışlanıyor ama olay tarafında geçiyordu");
  assert.ok(sarKapsamDisi(".claude/worktrees/ajan/plan.sar"),
    "gizli dizin dışlanmıyor; SRN-ONAY-WORKTREE-SIZINTISI geri açıldı");
  assert.ok(!sarKapsamDisi("_Sarmal/plan/goc_plani.sar"),
    "gerçek plan dosyası kapsam dışına düştü; kuyruk körleşir");
});

test("tek evren: ölçüm yalnız DİZİN parçalarına bakar — glob semantiği birebir", () => {
  // Glob `**/{…}/**` dizin segmentlerine bakar, dosya adına bakmaz.
  assert.ok(!sarKapsamDisi("plan/dist.sar"), "dosya adı dizin sanıldı");
  assert.ok(!sarKapsamDisi("goc_plani.sar"), "kök dosyası kapsam dışına düştü");
  assert.ok(sarKapsamDisi("a/ornek/b/c.sar"), "ara dizin ölçülmüyor");
});

test("tek evren: onay kuyruğunda ELLE yazılmış ikiz dışlama listesi kalmadı", () => {
  const kuyruk = oku("../src/onay-kuyrugu.ts");
  assert.ok(!/arsiv\|node_modules/.test(kuyruk),
    "onay-kuyrugu.ts hâlâ elle yazılmış bir dışlama düzenli ifadesi taşıyor (RED-2 dersi)");
  assert.ok(kuyruk.includes('from "./onay-tarayici.ts"'),
    "kapsam süzgeci ortak kaynaktan alınmıyor");
});

// ── ⑥ Panel bakışta ayrılır: simgeler ve kademe ─────────────────────────────

/** Bir panel kaynağından proje/varlık satırının ÇİZELGE simgesini okur
 *  (VIT-KIMLIK-A05: codicon kimliği kalmadı, ad satır çizelgesinindir). */
const kokSimgesi = (dosya: string): string => {
  const kaynak = oku(dosya);
  const desen = /const (?:PROJE_SIMGESI|VARLIK_SIMGESI): SatirSimgesi = "([a-z-]+)"/.exec(kaynak);
  return (desen?.[1] ?? "").trim();
};

// ⚠️ YEREL AĞAÇTAN VAZGEÇİLDİ — bu ölçüler ARTIK GERÇEK GÖVDEYİ okur.
//
//   Panel 2026-07-29'da ağaç görünüşünden panel içi karar yüzeyine (webview)
//   çevrildi, çünkü ağaç satırı bir metin alanı BARINDIRAMAZ ve QuickInput
//   yüzeylerinin konumu değiştirilemez. Ağaca özgü ölçüler (TreeItem.id,
//   resourceUri, ThemeIcon, collapsibleState) bu yüzden anlamını yitirdi;
//   yerlerine AYNI KULLANICI SONUÇLARINI ölçen gövde ölçüleri kondu ve bunlar
//   daha güçlüdür: kaynak metnine bakarak tahmin etmek yerine kullanıcının
//   göreceği belgeyi üretip okurlar.

test("dosya satırı KENDİ teknoloji simgesini taşır ve simge aynı çizelgeden gelir", () => {
  const html = govde(ikiDosyaliFikstur());
  assert.ok(html.includes(SIMGE_ACIK) && html.includes(SIMGE_KOYU),
    "dosya satırı teknoloji simgesini basmıyor; panel yine uydurma bir kap simgesine düşer");
  // Simge kaynağı SAĞLAYICIDA tek çizelgeden okunur — panel kendi çizelgesini kurmaz.
  const kaynak = oku("../src/posta-kutusu.ts");
  assert.ok(kaynak.includes("teknolojiSimgesi(") && kaynak.includes("eklentiCizelgesi("),
    "panel simgeyi ortak çizelgeden almıyor; ikinci bir simge evreni doğmuş");
  assert.ok(!/\.svg["'`]/.test(kaynak),
    "panele elle yazılmış bir simge yolu gömülmüş; çizelge ile ayrışır");
  // Simgesi olmayan dosya UYDURMA simge almaz: satır simgesiz kalır.
  const simgesiz = postaGovdesiHtml({ ...girdi(ikiDosyaliFikstur(), new PanelDurumu()), simge: () => undefined });
  assert.ok(!simgesiz.includes("<img"),
    "çizelgede karşılığı olmayan dosya için uydurma bir simge basılmış");
});

test("ata ile çocuk BAKIŞTA ayrılır: dosya satırı simge, kapı satırı balon taşır", () => {
  const html = govde(ikiDosyaliFikstur());
  assert.ok(html.includes('class="teknoloji tek-acik"'), "dosya satırı simgesini kaybetmiş");
  // VIT-KIMLIK-A05: balon artık hazır emoji değil, satır çizelgesinin geometrik
  // SVG'sidir ve gövdeye RAF KAYNAĞININ KENDİSİ basılır (currentColor korunur).
  assert.ok(html.includes('class="kapi-simge"') && html.includes(KAPI_SIMGESI.trim()),
    "kapı satırı çizelgedeki geometrik balonu taşımıyor; ata ile çocuk aynı görünür ve kademe okunmaz");
  assert.ok(!html.includes("💬"),
    "kapı satırı hazır emoji balonuna geri düşmüş (VIT-KIMLIK-A05 hükmü: geometrik aile)");
  // İki işaret yapısal olarak AYRI kaynaklardan gelir (biri teknoloji simgesi,
  // biri satır çizelgesinin SVG'si), dolayısıyla çakışmaları imkânsızdır.
  const dosyaSatiri = html.slice(konum(html, 'class="satir dosya-satiri"', "dosya satırı"));
  const kapiBasi = dosyaSatiri.indexOf('class="satir kapi-satiri"');
  assert.ok(kapiBasi > 0, "kapı satırı dosya satırının altında değil");
  assert.ok(!dosyaSatiri.slice(0, kapiBasi).includes("kapi-simge"),
    "dosya satırı kapı işaretini kullanıyor (Founder canlı bulgusu 2026-07-28)");
  // Balon işaretsiz kalabilir ama UYDURULMAZ: çizelge metni verilmezse satır boş kalır.
  const isaretsiz = postaGovdesiHtml({ ...girdi(ikiDosyaliFikstur(), new PanelDurumu()), kapiSimgesi: "" });
  assert.ok(!isaretsiz.includes('class="kapi-simge"'),
    "çizelge kaynağı verilmeden kapı satırına uydurma bir işaret basılmış");
});

test("renk YALNIZ tema değişkeninden gelir: gövdeye ham renk değeri gömülmez", () => {
  const html = govde(ikiDosyaliFikstur());
  // Yerel ağaçtan vazgeçince tema renkleri kendiliğinden gelmez; hepsi elle
  // kuruldu. Kural aynen korunur (YUZ-4.1): renk=durum, ham değer yok.
  const hamRenk = /#[0-9a-fA-F]{3,8}\b|\brgba?\(/.exec(html);
  assert.equal(hamRenk, null, `panel gövdesine ham renk değeri gömülmüş: ${hamRenk?.[0]}`);
  assert.ok(html.includes("var(--vscode-"),
    "gövde hiçbir tema değişkeni kullanmıyor; kullanıcının teması panele geçmez");
  assert.ok(html.includes("var(--vscode-charts-yellow)"),
    "karar bekleyen işin kanonik dikkat sarısı kaybolmuş");
});

test("beş panel bakışta ayrılır: kök simgeler tekildir", () => {
  const hatirlatici = kokSimgesi("../src/hatirlaticilar.ts");
  const bildirim = kokSimgesi("../src/bildirimler.ts");
  // 🪆 EKL-F7-A09: yol haritasının varlık simgesi tipe bağlıdır (çalışma alanı
  // istasyon, proje sefer) — iki simge de öteki panellerle çakışamaz.
  const yolKume = /return tip === "ÇalışmaAlanı" \? "([a-z-]+)" : "([a-z-]+)";/.exec(oku("../src/yolharitasi-cekirdek.ts"));
  assert.ok(hatirlatici && bildirim && yolKume, "panel kök simgeleri kaynakta bulunamadı");
  const hepsi = [hatirlatici, bildirim, yolKume![1], yolKume![2]];
  assert.equal(new Set(hepsi).size, hepsi.length,
    "satır çizelgesini kullanan panellerin kök simgeleri tekil değil; kenar çubuğunda bakışta ayrılmazlar");
  // Posta Kutusu dosya simgesi kullandığı için bu kümeye hiç girmez ve yarışamaz.
});

// Bu iki ölçünün ağaca özgü hâli (ThemeIcon kimliği · ThemeColor rolü) yukarıda
// gövde ölçüsü olarak yeniden kuruldu: "ata ile çocuk BAKIŞTA ayrılır" ve
// "renk YALNIZ tema değişkeninden gelir".

// ── ⑦ İKİNCİ ZAMANLAYICI YOK — panel kuyruğun nabzına bağlıdır ──────────────

test("panel kendi zamanlayıcısını kurmaz: tazeleme onay kuyruğunun nabzından gelir", () => {
  const kaynak = oku("../src/posta-kutusu.ts");
  for (const yasak of ["setInterval", "setTimeout", "createFileSystemWatcher", "nabizAbone", "geciktir("]) {
    assert.ok(!kaynak.includes(yasak),
      `Posta Kutusu ikinci bir tazeleme ritmi kuruyor: ${yasak}`);
  }
  const kuyruk = oku("../src/onay-kuyrugu.ts");
  assert.ok(kuyruk.includes("postaKutusu?.yerlestirDosya"),
    "kaydetme ve yazım turunda panel tazelenmiyor");
  assert.ok(kuyruk.includes("postaKutusu?.dusur"),
    "silinen dosyanın kapıları panelden düşmüyor");
});

// ── ⑧ Paket bildirimi ile sağlayıcı tek kaynaktan ───────────────────────────

test("görünüş kimliği: paket bildirimi ile sağlayıcı sabiti birebir aynıdır", () => {
  const gorunusler = PAKET.contributes.views["sarmal-yol"];
  const kimlikler = gorunusler.map((g) => g.id);
  assert.ok(kimlikler.includes(GORUNUS_POSTA_KUTUSU),
    `paket bildiriminde "${GORUNUS_POSTA_KUTUSU}" görünüşü yok`);
  assert.equal(new Set(kimlikler).size, kimlikler.length,
    `yinelenen görünüş kimliği var: ${kimlikler.join(" · ")}`);
  // VIT-GRAF-A16 ile kenar çubuğu ALTI görünüşe çıktı: Fikirler hanesi
  // Hatırlatıcılar panelinin içinden çıkıp kendi görünüşüne taşındı. Sayı
  // BİLEREK güncellenmiştir; nöbetin değeri sayının kendisinde değil,
  // güncellemenin sessiz olamamasındadır.
  assert.equal(kimlikler.length, 6, "kenar çubuğunda altı görünüş bekleniyordu");
});

test("başlık yerelleştirme kataloğundan gelir ve kapsayıcının adını TEKRAR ETMEZ", () => {
  const posta = PAKET.contributes.views["sarmal-yol"].find((g) => g.id === GORUNUS_POSTA_KUTUSU)!;
  const kapsayiciAdi = PAKET_NLS_TR["view.container"];
  assert.equal(yerellestir(posta.name), PAKET_NLS_TR["view.approvals"]);
  assert.equal(yerellestir(posta.contextualTitle!), PAKET_NLS_TR["view.approvals"]);
  assert.ok(!yerellestir(posta.name).includes(kapsayiciAdi),
    "görünüş adı kapsayıcının adını tekrar ediyor");
  assert.ok(!yerellestir(posta.contextualTitle!).includes(kapsayiciAdi),
    "bağlam başlığı kapsayıcının adını tekrar ediyor");
});

test("görünüş simgeleri tekildir: paneller aynı SVG'yi paylaşmaz", () => {
  const simgeler = PAKET.contributes.views["sarmal-yol"].map((g) => g.icon);
  // Simge yolu TEK kaynaktan (simge-cizelgesi) gelir — VIT halka 1, Founder
  // 2026-08-04 geometrik panel ailesi. Eski `ikonlar/posta.svg` ilanı emekli.
  assert.ok(simgeler.includes(panelSvgKaynagi("sarmalPostaKutusu")),
    "Onaylar paneli çizelgedeki kendi simgesini taşımıyor");
  assert.equal(new Set(simgeler).size, simgeler.length,
    `görünüşler aynı simgeyi paylaşıyor: ${simgeler.join(" · ")}`);
});

test("simge mevcut çizim dilini izler: dolgusuz, currentColor konturlu, yirmi dört birimlik", () => {
  const posta = oku(`../${panelSvgKaynagi("sarmalPostaKutusu")}`);
  const gozlem = oku(`../${panelSvgKaynagi("sarmalBildirimler")}`);
  for (const nitelik of ['viewBox="0 0 24 24"', 'fill="none"', 'stroke="currentColor"', 'stroke-width="1.7"']) {
    assert.ok(posta.includes(nitelik), `panel-onaylar.svg çizim dilinden ayrılıyor: ${nitelik} yok`);
    assert.ok(gozlem.includes(nitelik), `emsal ölçüsü bozuldu: panel-gozlemler.svg ${nitelik} taşımıyor`);
  }
  assert.ok(!/#[0-9a-fA-F]{3,6}\b/.test(posta), "simgeye ham renk gömülmüş");
});

// ── ⑨ Boş kuyruk okunur bir cümle söyler ────────────────────────────────────

test("boş-durum cümlesi bekleyen kapı olmadığını anlatır ve ne yapılacağını öğretir", () => {
  const cumle = YUZEY_BOS_DURUM.postaKutusu;
  // Nöbet SÖZCÜĞÜ değil ANLAMI şart koşar. Eskiden burada "Gelen kutun sıfır"
  // dizesi birebir aranıyordu; panel Onaylar adını alıp posta metaforu düştüğünde
  // o dize değişti ve nöbet, hiçbir davranış bozulmamışken kırmızıya döndü.
  // Metnin taşıması gereken şey bir kalıp değil, iki bilgidir: kapı olmadığı ve
  // panelin ne zaman dolacağı.
  assert.ok(cumle.includes("kapı yok"),
    "boş panel bekleyen kapı olmadığını söylemiyor");
  assert.ok(cumle.includes("kabul ölçütü"),
    "boş-durum panelin hangi koşulda dolduğunu öğretmiyor");
  // Founder hükmü 2026-08-16: "onay:" alan adı gibi teknik imla boş-durumdan
  // düştü; kararın kaydedildiği bilgisi düz cümleyle verilir.
  assert.ok(/karar[ıi]?[^.]*yazılır/.test(cumle),
    "boş-durum kararın kayda yazıldığını söylemiyor");
  assert.ok(cumle.trim().endsWith("."), "boş-durum metni tam cümleyle bitmiyor");
  assert.ok(cumle.length > 80, "boş-durum metni okuyana ne yapacağını anlatacak kadar uzun değil");
  assert.ok(YUZEY_ACIKLAMALARI.postaKutusu.length > 0, "başlık altı açıklaması boş");
});

test("panel boşken rozet GÖRÜNMEZ, dolduğunda sayıyı taşır", () => {
  // NÖBET KAYNAK TARAMASINDAN DAVRANIŞ ÖLÇÜMÜNE ÇEVRİLDİ (2026-08-27). Eskiden
  // bu dosyada `badge = adet ?` kalıbını arıyordu; kalıp aramak yazımı kilitler
  // ama davranışı ölçmez ve rozet kararı dört panelin ortak çekirdeğine taşınınca
  // nöbet, davranış hiç değişmediği hâlde kırmızıya döndü. Kararın kendisi artık
  // saf çekirdekte yaşadığı için gerçek işlev koşturulup sonucu ölçülebilir.
  assert.equal(panelRozeti(0, postaRozetIpucu), undefined,
    "boş kuyrukta rozet görünüyor; sıfır bir işaret gibi asılı kalır");
  const dolu = panelRozeti(3, postaRozetIpucu);
  assert.equal(dolu?.value, 3, "rozet kapı sayısını taşımıyor");
  assert.ok(dolu?.tooltip.includes("3"), "rozet ipucusu sayıyı söylemiyor");
  assert.ok(panelRozeti(1, postaRozetIpucu)?.tooltip.length, "rozet ipucusuz basılıyor");

  // Panel tarafı kararı KENDİ yeniden vermez, ortak çekirdeğe sorar; ikinci bir
  // rozet kararı yazılsaydı biri sessizce bayatlar ve iki panel çelişirdi.
  const kaynak = oku("../src/posta-kutusu.ts");
  assert.ok(kaynak.includes("panelRozeti("), "rozet ortak karardan geçmiyor");
  assert.ok(kaynak.includes("postaRozetIpucu"), "rozet ipucusuz basılıyor");
});

test("ROZET GÖVDEYLE AYNI KAPIDAN KURULUR — görünürlük dönüşü rozeti de yeniler", () => {
  // ÖLÇÜLMÜŞ KUSUR (Founder ekran görüntüsü 2026-07-30): gövde "kararını bekleyen
  // hiçbir kapı yok" derken başlıktaki rozet 1 gösteriyordu. Rozet ile gövde aynı
  // deftere bakar ve defterde eleme yoktur, dolayısıyla ikisi aynı ANDA çelişemez;
  // çelişki iki TAZELEME YOLUNUN ayrışmasından doğdu. Görünüş çözülürken ikisi
  // birlikte kurulurdu, görünürlük değiştiğinde ise yalnız gövde yeniden basılırdı.
  // Panel gizliyken kapı düşerse rozet yazımı hedefsiz kalır ve panel geri
  // açıldığında son bilinen sayı ekranda asılı kalır.
  const kaynak = oku("../src/posta-kutusu.ts");

  const gorunurluk = /onDidChangeVisibility\(\(\) => \{[^}]*\}\)/.exec(kaynak);
  assert.ok(gorunurluk, "görünürlük değişimi hiç ele alınmıyor");
  assert.ok(gorunurluk[0].includes("yuzeyiKur"),
    "görünürlük dönüşü tek kurulum kapısından geçmiyor; rozet bayat kalabilir");
  assert.ok(!/onDidChangeVisibility\(\(\) => \{[^}]*belgeyiBas\(\)/.test(kaynak),
    "görünürlük dönüşü gövdeyi doğrudan basıyor; rozeti atlayan eski desen geri gelmiş");

  const kapi = /private yuzeyiKur\(\): void \{([^}]*)\}/.exec(kaynak);
  assert.ok(kapi, "tek kurulum kapısı (yuzeyiKur) yok");
  assert.ok(kapi[1].includes("rozetiGuncelle()"), "kurulum kapısı rozeti ilan etmiyor");
  assert.ok(kapi[1].includes("belgeyiBas()"), "kurulum kapısı gövdeyi basmıyor");
});

test("HİÇBİR KAYNAK DOSYASI HAM NUL TAŞIMAZ — dosya grep'e görünür kalır", () => {
  // ÖLÇÜLMÜŞ KUSUR (2026-07-30): `onay-cekirdek.ts` birleşik anahtar ayracı olarak
  // ham bir NUL baytı taşıyordu. Ayracın kendisi doğru bir seçimdir çünkü NUL ne
  // dosya yolunda ne kodda geçebilir; kusur ayraçta değil YAZIMINDA idi. Tek ham
  // NUL, `grep`in dosyayı ikili sayması için yeterlidir: yedi yüz elli dokuz
  // satırlık dosyanın tamamı arama sonuçlarından sessizce düşüyordu ve `file`
  // komutu onu "data" diye bildiriyordu.
  //
  // Bu, deponun en tehlikeli kusur sınıfıdır: araç hata vermez, yalnız EKSİK cevap
  // verir. İçinde kimlik arayan her tarama boş döner ve arayan kişi "yok" sonucunu
  // gerçek sanır. Kaçış dizisi çalışma zamanında birebir aynı karakteri üretir,
  // dolayısıyla davranış korunur ve dosya denetlenebilir kalır.
  const kokler = ["../src", "../../cekirdek/src"];
  const kirli: string[] = [];
  for (const kok of kokler) {
    const dizin = yol(kok);
    for (const ad of readdirSync(dizin, { recursive: true }) as string[]) {
      if (!ad.endsWith(".ts") && !ad.endsWith(".mjs") && !ad.endsWith(".json")) continue;
      const tam = join(dizin, ad);
      if (!statSync(tam).isFile()) continue;
      if (readFileSync(tam).includes(0)) kirli.push(`${kok}/${ad}`);
    }
  }
  assert.deepEqual(kirli, [],
    `ham NUL taşıyan kaynak dosyası var ve grep onları sessizce atlar: ${kirli.join(" · ")}`);
});

// ── ⑩ KARARLI KİMLİK — açık satır tazelemede kapanmaz ───────────────────────
//
//   Ölçülmüş kusur (2026-07-29 · prob 2 ile prob 7 kontrol–deney çifti): aynı
//   tıklama dizisi, tek fark araya sokulan bir tazeleme. Kontrolde akış
//   tamamlandı, deneyde tıklama boşa düştü. VS Code 1.130.0 kaynağında öğe
//   tutamağı `TreeItem.id` verilmezse `${ata}/${sıra}:${etiket}` biçiminde
//   üretiliyor; yani tutamak hem KARDEŞ SIRASINA hem ETİKETE bağlı. Bu çalışma
//   alanında kendiliğinden kaydetme açık olduğu için tazeleme süreklidir ve
//   Founder açtığı kapıyı elinin altında kaybediyordu.

test("kimlik: kapı kimliği ETİKETTEN değil KAYNAKTAN doğar — etiket değişse de sabit kalır", () => {
  const yol = "/depo/_Sarmal/plan/goc_plani.sar";
  const once = postaKimligi({ tur: "kapı", dosya: yol, kod: "VIT-POSTA-A01" });
  // Adımın `ne` metni düzenlendi: etiket değişti, kapı aynı kapı.
  const sonra = postaKimligi({ tur: "kapı", dosya: yol, kod: "VIT-POSTA-A01" });
  assert.equal(once, sonra, "kapı kimliği değişti; açılma ve seçim durumu korunamaz");
  // Kimlik görünen metinden hiçbir parça taşımaz.
  const [kapi] = kapilar(zincir(
    `Adım( kod: VIT-POSTA-A01, durum: beklemede, ne: "📬 amaç metni", kabul: [ ${ONAYLI_OLCUT} ] )`));
  assert.ok(!once.includes(postaKapiEtiketi(kapi.kod, kapi.ne)),
    `kimliğe görünen etiket sızmış: ${once}`);
});

test("kimlik: aynı kısa adı taşıyan iki dosyanın kapıları AYRI kimlik alır", () => {
  const a = postaKimligi({ tur: "kapı", dosya: "/depo/bir/plan.sar", kod: "A1" });
  const b = postaKimligi({ tur: "kapı", dosya: "/depo/iki/plan.sar", kod: "A1" });
  assert.notEqual(a, b,
    "iki ayrı projedeki aynı kodlu kapı tek kapı sanılıyor; kullanıcı yanlış kapıda karar verir");
  assert.notEqual(
    postaKimligi({ tur: "dosya", dosya: "/depo/bir/plan.sar" }),
    postaKimligi({ tur: "dosya", dosya: "/depo/iki/plan.sar" }),
    "aynı kısa adlı iki dosya satırı aynı kimliği taşıyor");
});

test("kimlik: üç karar satırı birbirinden ve kapıdan ayrışır", () => {
  const yol = "/depo/plan.sar";
  const kapi = postaKimligi({ tur: "kapı", dosya: yol, kod: "A1" });
  const roller = ["onay", "şerh", "ret"];
  const kimlikler = roller.map((rol) => postaKimligi({ tur: "karar", dosya: yol, kod: "A1", rol }));
  assert.equal(new Set(kimlikler).size, roller.length,
    "iki karar satırı aynı kimliği taşıyor; tıklama komşu satıra düşebilir");
  assert.ok(!kimlikler.includes(kapi), "karar satırı kapı satırıyla aynı kimliği taşıyor");
  // Kardeş sırası değişse de kimlik aynı kalır: sıra kimliğin parçası DEĞİLDİR.
  assert.equal(postaKimligi({ tur: "karar", dosya: yol, kod: "A1", rol: "onay" }), kimlikler[0]);
});

// ── ⑫ TEK TIK — Founder hükmü 2026-07-29 ────────────────────────────────────
//
//   Founder ekran görüntüsüyle şunu bildirdi: kapı satırına tıklayıp, sonra
//   Adıma gitmek için ayrıca "Kapıya git" satırına tıklamak GEREKSİZDİR. Kapı
//   satırı artık hem açılır hem Adımı kaynakta gösterir; dördüncü çocuk satır
//   kaldırıldı ve kapıya gitme yolu iki yerden yürür: kapı satırının kendisi ve
//   kod merceği.

test("tek tık: kapı satırı HEM açılabilir HEM Adımı kaynakta gösterir", () => {
  const kayitlar = tekKapiliFikstur();
  // Kapalıyken gövde HİÇBİR karar satırı ve HİÇBİR kutu taşımaz.
  const kapali = govde(kayitlar);
  assert.ok(kapali.includes('aria-expanded="false"'),
    "kapı satırı açılabilir değil; kapalı hâli hiç yok");
  assert.ok(!kapali.includes('class="satir karar-satiri"'),
    "kapı kapalıyken karar satırları basılıyor; tek tık bir şey AÇMIYOR demektir");
  assert.ok(!kapali.includes("<textarea"),
    "kapı kapalıyken gerekçe kutusu basılıyor; kutu tıklamayla DOĞMUYOR demektir");
  // Tek tık satırı açar: karar satırları ve kutu belirir.
  const acik = govde(kayitlar, kapiyiAc(new PanelDurumu(), TEK_DOSYA, "A1"));
  assert.ok(acik.includes('aria-expanded="true"'), "açık kapı satırı açık işaretlenmiyor");
  assert.equal((acik.match(/class="satir karar-satiri"/g) ?? []).length, 3,
    "açılan kapının altında üç karar satırı yok");
  // Aynı tık Adımı da gösterir: satır dosya+kod+satır çapasını taşır ve panel
  // bunu Adıma götüren komuta indirir.
  assert.ok(acik.includes(`data-dosya="${TEK_DOSYA}"`) && acik.includes('data-kod="A1"'),
    "kapı satırının çapası dosya+kod ikilisini taşımıyor");
  const kaynak = oku("../src/posta-kutusu.ts");
  assert.ok(/case "kapıSeç"[\s\S]{0,400}"sarmal\.postaKapisiAc"/.test(kaynak),
    "kapı seçimi Adıma götüren komuta inmiyor; tek tık Adımı göstermez");
});

test("tek tık: 'Kapıya git' adında bir gezinme satırı ARTIK ÜRETİLMEZ", () => {
  const acik = govde(tekKapiliFikstur(), kapiyiAc(new PanelDurumu(), TEK_DOSYA, "A1"));
  assert.ok(!/Kapıya git/.test(acik),
    "kapının altında hâlâ bir gezinme satırı var; Founder onu kaldırdı");
  // Çizelge GERÇEKTEN okunur: üç seçenek, üçü de hüküm yazar, damgasız satır yok.
  assert.deepEqual(KARAR_SECENEKLERI.map((s) => s.damga),
    ["onaylandı", "şerhle onaylandı", "reddedildi"],
    "karar çizelgesi beklenen üç hükmü taşımıyor; diskte yazılı kayıtlarla uyum kaybolur");
  assert.deepEqual(KARAR_SECENEKLERI.map((s) => s.rol), ["onay", "şerh", "ret"],
    "karar rolleri değişmiş; kararlı kimlikler kayar");
  assert.deepEqual(KARAR_SECENEKLERI.map((s) => s.notIster), [false, true, true],
    "gerekçe isteyen seçenekler değişmiş; düz onay gerekçe istemez, şerh ve ret ister");
  assert.ok(!KARAR_SECENEKLERI.some((s) => !s.damga),
    "damgasız (yazmayan) bir karar satırı kalmış");
});

test("tek tık: üç karar satırının hepsi TEK yazıcıya iner", () => {
  const acik = govde(tekKapiliFikstur(), kapiyiAc(new PanelDurumu(), TEK_DOSYA, "A1"));
  for (const s of KARAR_SECENEKLERI) {
    assert.ok(acik.includes(`data-rol="${s.rol}"`), `${s.rol} satırı gövdede yok`);
    assert.ok(acik.includes(`data-kimlik="${kararKimligi(TEK_DOSYA, "A1", s.rol)}"`),
      `${s.rol} satırı kararlı kimliğini taşımıyor`);
  }
  const kaynak = oku("../src/posta-kutusu.ts");
  assert.ok(/case "kararVer"[\s\S]{0,200}kararIste/.test(kaynak),
    "karar mesajı tek bir hatta inmiyor");
  assert.ok(/"sarmal\.postaKararVer", m\.dosya, m\.satir, m\.kod,/.test(kaynak),
    "karar satırları tek yazıcı komutuna inmiyor");
  assert.ok(!kaynak.includes("kararIsle(") && !kaynak.includes("applyEdit"),
    "panel hükmü kendisi yazıyor; karar yazan tek el kalmamış");
});

test("tek tık: kaynak ÖNİZLEME kipinde ve odağı ÇALMADAN açılır", () => {
  const kaynak = oku("../src/onay-kuyrugu.ts");
  assert.ok(/showTextDocument\(doc, \{\s*\n?\s*preview: true, preserveFocus: true,?\s*\n?\s*\}\)/.test(kaynak),
    "kapıya gitme yolu önizleme kipini ve odak korumasını kullanmıyor; on dört " +
    "kapı arasında gezinen kullanıcı sekme yığını üretir ve odak panelden kaçar");
});

// ⚠️ ÖLÇÜLMÜŞ GERÇEK — VARSAYIM DEĞİL (2026-07-29, gerçek VS Code 1.130 kabuğu).
//
//   "Komut taşıyan açılabilir bir satır seçilince VS Code hem komutu koşturur hem
//   satırı açar" varsayımı ÖLÇÜLDÜ ve ÇÜRÜTÜLDÜ. Gerçek liste komutlarıyla
//   (list.focusFirst · list.focusDown · list.select) yapılan ölçüm iki ayrı
//   `workbench.list.openMode` kipinde de aynı sonucu verdi: kaynak doğru satırda
//   AÇILDI, fakat kapı satırı AÇILMADI ve bir alt satır "Onayla" olmadığı için
//   hiçbir karar yazılmadı.
//
//   Bu yüzden açma işi tahmine bırakılmaz: komutun kendisi kapıyı panelde
//   `reveal` ile açar. Aynı ölçüm onarımdan sonra tekrarlandı ve iki kipte de
//   "kaynak açıldı: true · satır açıldı: true · değişen satır: 1" verdi.
test("tek tık: kapı komutu açma işini KENDİSİ üstlenir, VS Code'un tıklama kipine bırakmaz", () => {
  const kaynak = oku("../src/onay-kuyrugu.ts");
  const basi = kaynak.indexOf("const postaKapisiAc = async");
  const sonu = kaynak.indexOf("baglam.subscriptions.push(");
  assert.ok(basi > 0 && sonu > basi, "postaKapisiAc gövdesi kaynakta bulunamadı");
  const govde = kaynak.slice(basi, sonu);
  assert.ok(govde.includes("kapiyaGit("),
    "kapı komutu kaynağı açmıyor; tek tık Adımı göstermez");
  assert.ok(/postaKutusu\?\.gosterVeAc\(dosya, kod\)/.test(govde),
    "kapı komutu satırı panelde AÇMIYOR; ölçüm bunun kendiliğinden olmadığını " +
    "iki openMode kipinde de gösterdi — kullanıcı yine ikinci bir tık harcar");
});

test("tek tık: panelde gösterme görünüşü öne getirir, satırı AÇAR ve odaklar", () => {
  const kaynak = oku("../src/posta-kutusu.ts");
  const basi = kaynak.indexOf("async gosterVeAc(");
  assert.ok(basi > 0, "gosterVeAc gövdesi kaynakta bulunamadı");
  const g = kaynak.slice(basi, basi + 900);
  assert.ok(/acikligiYaz\(postaKimligi\(\{ tur: "kapı"[^)]*\}\), true\)/.test(g),
    "gösterme kapı satırını açmıyor; karar satırları ve gerekçe kutusu görünmez kalır");
  assert.ok(/acikligiYaz\(postaKimligi\(\{ tur: "dosya"[^)]*\}\), true\)/.test(g),
    "gösterme dosya satırını açmıyor; kapı kapalı bir dalın altında gizli kalır");
  assert.ok(/this\.gorunum\.show\(/.test(g),
    "gösterme görünüşü öne getirmiyor; kullanıcı paneli kendisi aramak zorunda kalır");
  assert.ok(/tur: "odakla"/.test(g),
    "gösterme satıra odaklanmıyor; kullanıcının bir sonraki tuşu boşa düşer");
});

test("ebeveyn: karar satırının atası KAPI, kapının atası DOSYA, dosyanın atası yok", () => {
  const yol = "/depo/plan.sar";
  const karar: PostaDugumu = { tur: "karar", dosya: yol, kod: "A1", rol: "onay" };
  const kapiAta = postaEbeveyni(karar);
  assert.deepEqual(kapiAta, { tur: "kapı", dosya: yol, kod: "A1" },
    "karar satırı kök öğe ilan edilmiş; TreeView.reveal zinciri kurulamaz");
  const dosyaAta = postaEbeveyni(kapiAta!);
  assert.deepEqual(dosyaAta, { tur: "dosya", dosya: yol },
    "kapı satırının atası doğru dosya değil");
  assert.equal(postaEbeveyni(dosyaAta!), undefined, "dosya satırının atası olmamalı");
  // Zincir kimlik düzeyinde de tutarlıdır: ata kimliği çocuğun ön ekidir.
  assert.ok(postaKimligi(karar).startsWith(postaKimligi(kapiAta!)),
    "karar kimliği kapı kimliğinden türemiyor; iki şema ayrışmış");
});

test("kimlik: gövdedeki her satır KAYNAKTAN doğan kararlı kimliğini taşır", () => {
  const acik = govde(tekKapiliFikstur(), kapiyiAc(new PanelDurumu(), TEK_DOSYA, "A1"));
  // Ölçülmüş Kusur 4'ün ruhu korunur: kimlik kardeş sırasından ya da etiketten
  // değil, dosya yolu + kapı kodu + rolden doğar.
  assert.ok(acik.includes(`data-kimlik="${postaKimligi({ tur: "dosya", dosya: TEK_DOSYA })}"`),
    "dosya satırı kararlı kimliğini taşımıyor");
  assert.ok(acik.includes(`data-kimlik="${postaKimligi({ tur: "kapı", dosya: TEK_DOSYA, kod: "A1" })}"`),
    "kapı satırı kararlı kimliğini taşımıyor; tazeleme açık satırı götürür");
  assert.ok(acik.includes(`data-kimlik="${notKimligi(TEK_DOSYA, "A1")}"`),
    "gerekçe kutusu kararlı kimliğini taşımıyor; tazeleme yazılan metni götürür");
  const kaynak = oku("../src/posta-kutusu.ts");
  assert.ok(kaynak.includes("gosterVeAc("),
    "dosya+kod ile kapıyı panelde gösteren kapı yok; kod merceği doğru kapıyı açamaz");
});

// ── ⑪ METİNLER YALAN SÖYLEMEZ ───────────────────────────────────────────────
//
//   Ölçülmüş kusur (Kusur 5): kapı ipucu ve boş-durum cümlesi "tıklayınca kararın
//   sorulur" diyordu; tıklama yalnız bir alt liste açıyor ve o listenin
//   satırlarının hiç ipucu yoktu. Kusur teknik değil SÖZLEŞME kusurudur: yüzey
//   kendi davranışını yanlış anlatınca kod doğru çalışsa bile "bozuk" hükmü alır.

test("metin: hiçbir panel metni 'tıklayınca kararın sorulur' vaadi taşımaz", () => {
  const bos = YUZEY_BOS_DURUM.postaKutusu;
  const ipucu = postaKapiIpucu({
    kod: "A1", ne: "iş", olcut: "ölçüt", dosya: "/depo/plan.sar", satir: 4,
  });
  for (const [ad, metin] of [["boş-durum", bos], ["kapı ipucu", ipucu]] as const) {
    assert.ok(!/sonra kararın sorulur/.test(metin),
      `${ad} hâlâ olmayan bir davranışı vadediyor: "sonra kararın sorulur"`);
  }
  // Founder hükmü 2026-07-29: tek tık hem açar hem Adımı gösterir ve vaat
  // davranışla hizalanır. Founder hükmü 2026-08-16 kapsamı daralttı: kullanım
  // talimatı yalnız kapı İPUCUNDA yaşar; boş-durum cümlesi kısa kalır ve
  // talimat taşımaz.
  assert.ok(/aç|satır/.test(ipucu), "kapı ipucu satırın açılacağını söylemiyor");
  assert.ok(/tek tık|bir kez tıkla/i.test(ipucu),
    "kapı ipucu tek tıkla ne olacağını söylemiyor");
  assert.ok(/üç (karar )?satır/.test(ipucu),
    "kapı ipucu hâlâ dört satır vaat ediyor; gezinme satırı kaldırıldı");
  assert.ok(!/kararını ver/.test(kapiyaGitBasligi()),
    `kapı satırının komut adı hâlâ karar vaat ediyor: ${kapiyaGitBasligi()}`);
});

test("metin: her karar satırının ipucu vardır ve ne yazacağını söyler", () => {
  for (const damga of ["onaylandı", "şerhle onaylandı", "reddedildi"]) {
    const ipucu = postaKararIpucu({ kod: "A1", damga, notIster: damga !== "onaylandı" });
    assert.ok(ipucu.includes("A1"), `${damga} ipucusu kapı kimliğini taşımıyor`);
    assert.ok(ipucu.includes(damga), `${damga} ipucusu yazılacak damgayı söylemiyor`);
    assert.ok(ipucu.includes("onay:"), `${damga} ipucusu kaydın nereye yazıldığını söylemiyor`);
    assert.ok(ipucu.includes("diskten geri okunduktan sonra"),
      `${damga} ipucusu başarının kanıtlandığını söylemiyor`);
  }
  const serh = postaKararIpucu({ kod: "A1", damga: "şerhle onaylandı", notIster: true });
  assert.ok(serh.includes("gerekçe zorunludur"),
    "not isteyen satır gerekçenin zorunlu olduğunu söylemiyor");
  const duz = postaKararIpucu({ kod: "A1", damga: "onaylandı", notIster: false });
  assert.ok(duz.includes("Ek bir soru sorulmaz"),
    "düz onay satırı ek soru sormadığını söylemiyor");
});

test("metin: gövde karar satırlarına ipucu GERÇEKTEN basar", () => {
  const acik = govde(tekKapiliFikstur(), kapiyiAc(new PanelDurumu(), TEK_DOSYA, "A1"));
  for (const s of KARAR_SECENEKLERI) {
    const ipucu = postaKararIpucu({ kod: "A1", damga: s.damga, notIster: s.notIster });
    // İpucu HTML'e kaçırılarak basılır; ölçü kaçırılmış hâline bakar.
    const ilkParca = ipucu.slice(0, 40).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
    assert.ok(acik.includes(ilkParca),
      `${s.damga} satırı ipucusuz basılmış; kullanıcı ne yapacağını satırdan öğrenemiyor`);
  }
  // Kapı satırının ve dosya satırının ipuçları da yerinde durur.
  assert.ok(acik.includes("Onay isteyen ölçüt"), "kapı satırı ipucusuz basılmış");
  assert.ok(acik.includes(TEK_DOSYA), "dosya satırının ipucu tam yolu taşımıyor");
});

// ═══════════════════════════════════════════════════════════════════════════
// ⑬ PANEL İÇİ GEREKÇE KUTUSU — Founder'ın ÜÇÜNCÜ kez söylediği şikâyetin onarımı
//
//   Founder şunu üç kez söyledi: "ya ben bir şerh metni yazmak için ta en
//   yukarıya bakmak zorunda mıyım? posta kutusunun metin alanı için niye bu
//   kadar uzak bir noktaya dikkatimi yoğunlaştırmak zorundayım?" İki kez giriş
//   kutusuyla idare edilmeye çalışıldı; ikisi de olmadı, çünkü kusur giriş
//   kutusunun İÇERİĞİNDE değil KONUMUNDAYDI.
//
//   ÖLÇÜLMÜŞ TEKNİK GERÇEK: `@types/vscode` bildiriminde `InputBoxOptions`,
//   `QuickInput` ve `InputBox` arayüzlerinin HİÇBİRİNDE konum alanı yoktur; VS
//   Code bütün QuickInput yüzeylerini pencerenin üst ortasında çizer. Aynı
//   bildirimde `TreeItem` bir metin alanı barındıramaz. Yani not alanını
//   kullanıcının gözünün olduğu yere getirmenin tek yolu onu panelin içinde
//   çizmekti; yüzey bu yüzden webview'e çevrildi.
//
//   YERLEŞİM Founder'ın ekran görüntüsünden gelir: kapı satırına tıklanınca
//   ÖNCE metin kutusu açılır, üç seçenek O KUTUNUN ALTINDA durur ve kutu üçünün
//   ORTAK girdisidir.
// ═══════════════════════════════════════════════════════════════════════════

test("yerleşim: gerekçe kutusu kapının HEMEN ALTINDA doğar ve panelin İÇİNDEDİR", () => {
  const acik = govde(tekKapiliFikstur(), kapiyiAc(new PanelDurumu(), TEK_DOSYA, "A1"));
  const kapiSatiri = konum(acik, 'class="satir kapi-satiri"', "kapı satırı");
  const kutu = konum(acik, "<textarea", "gerekçe kutusu");
  assert.ok(kutu > kapiSatiri,
    "gerekçe kutusu kapı satırının ÜSTÜNDE basılıyor; kullanıcının gözü satırı terk eder");
  // Kutu kapının KENDİ kutusunun içindedir: araya başka bir kapı girmez.
  const kapiKutusu = acik.slice(konum(acik, '<li class="kapi-kutu">', "kapı kabı"));
  assert.ok(kapiKutusu.indexOf("<textarea") < (kapiKutusu.indexOf("</li>") + 1) || kapiKutusu.includes("<textarea"),
    "gerekçe kutusu kapının kendi kabının dışında yaşıyor");
  assert.ok(acik.includes(NOT_BASLIGI.replace(/&/g, "&amp;")),
    "kutunun ne için olduğunu söyleyen etiket yok");
});

test("yerleşim: ÜÇ SEÇENEK kutunun ALTINDA durur (Founder ekran görüntüsü)", () => {
  const acik = govde(tekKapiliFikstur(), kapiyiAc(new PanelDurumu(), TEK_DOSYA, "A1"));
  const kutu = konum(acik, "<textarea", "gerekçe kutusu");
  for (const s of KARAR_SECENEKLERI) {
    const secenek = konum(acik, `data-rol="${s.rol}"`, `${s.rol} seçeneği`);
    assert.ok(secenek > kutu,
      `"${s.rol}" seçeneği kutunun ÜSTÜNDE duruyor; Founder yerleşimi kutuyu öne alır`);
  }
  // Seçenekler kendi aralarında da kanonik sırayı korur.
  const sira = KARAR_SECENEKLERI.map((s) => acik.indexOf(`data-rol="${s.rol}"`));
  assert.deepEqual([...sira].sort((a, b) => a - b), sira,
    "üç seçenek kanonik sırasında basılmıyor: onayla · şerhle onayla · reddet");
});

test("yerleşim: kutu ÜÇ SEÇENEĞİN ORTAK girdisidir — seçenek başına ayrı kutu AÇILMAZ", () => {
  const acik = govde(tekKapiliFikstur(), kapiyiAc(new PanelDurumu(), TEK_DOSYA, "A1"));
  assert.equal((acik.match(/<textarea/g) ?? []).length, 1,
    "bir kapının altında birden çok gerekçe kutusu var; kullanıcı hangisine yazdığını karıştırır");
  // Üç seçenek de AYNI kutuyu gösterir. Ölçü GÖVDEDEN okunur ve `notKimligi`
  // ile karşılaştırılmaz: iki taraf da aynı işlevden türeseydi ölçü totoloji
  // olur, işlev bozulduğunda ikisi birlikte bozulur ve nöbet hiçbir şey görmezdi.
  // Ölçü YALNIZ çizilen gövdeye bakar; betik bölümü işaretlerden söz eder ve
  // oraya bakmak sayıyı yalancı biçimde şişirirdi.
  const cizilen = acik.slice(acik.indexOf('<div id="kok"'), acik.indexOf("<script"));
  const bagli = [...cizilen.matchAll(/data-not="([^"]*)"/g)].map((m) => m[1]);
  assert.equal(bagli.length, 3, "üç seçeneğin hepsi bir kutuya bağlı değil");
  assert.equal(new Set(bagli).size, 1,
    `üç seçenek AYRI kutulara bağlı; kutu ortak girdi olmaktan çıkmış: ${bagli.join(" · ")}`);
  // Kutunun kimliği hiçbir ROL adı taşımaz: taşısaydı kullanıcı seçenek
  // değiştirdiğinde yazdığı metni kaybederdi.
  for (const s of KARAR_SECENEKLERI) {
    assert.ok(!bagli[0]!.includes(s.rol),
      `kutu kimliği "${s.rol}" rolüne bağlanmış; seçenek değişince metin kaybolur`);
  }
  // Gövdedeki kutunun kendi kimliği de aynı değerdir.
  assert.ok(cizilen.includes(`<div class="not-alani" data-kimlik="${bagli[0]}"`),
    "seçeneklerin işaret ettiği kutu gövdede yok");
});

test("QUICKINPUT: hiçbir yolda pencerenin tepesinde giriş kutusu AÇILMAZ", () => {
  // Founder'ın şikâyetinin ta kendisi buydu. Yol yapısal olarak kapatıldı:
  // karar hattının hiçbir dosyasında QuickInput yüzeyi çağrılmaz.
  // Ölçü ÇAĞRI biçimine bakar, tarihsel kaydın adı anmasına değil: bu dosyaların
  // baş yorumları kaldırılan yolu bilerek anlatır ve o kayıt korunmalıdır.
  for (const dosya of ["../src/posta-kutusu.ts", "../src/posta-govde.ts", "../src/onay-kuyrugu.ts"]) {
    const kaynak = oku(dosya);
    for (const yasak of ["showInputBox", "createInputBox", "showQuickPick", "createQuickPick"]) {
      assert.ok(!new RegExp(`${yasak}\\s*\\(`).test(kaynak),
        `${dosya} hâlâ ${yasak} çağırıyor; kullanıcı şerh yazmak için yine pencerenin tepesine bakar`);
    }
  }
});

// ── ⑭ BOŞ KUTU · DOLU KUTU · İPTAL — üçü de sessiz DEĞİLDİR ─────────────────

test("boş kutu: şerh ve ret ENGELLENİR, düz onay ENGELLENMEZ", () => {
  const duzOnay = secenekBul("onay")!;
  assert.equal(duzOnay.notIster, false, "düz onay gerekçe ister hâle gelmiş");
  assert.deepEqual(gerekceyiOlc(duzOnay.notIster, ""), { tur: "geçerli", not: "" },
    "boş kutuda düz onay engellendi; kullanıcıya olmayan bir borç yüklendi");
  for (const rol of ["şerh", "ret"]) {
    const s = secenekBul(rol)!;
    assert.equal(s.notIster, true, `${rol} artık gerekçe istemiyor`);
    assert.deepEqual(gerekceyiOlc(s.notIster, ""), { tur: "gerekçeBoş" },
      `boş kutuda ${rol} yazıma geçiyor; bugünkü validateInput hükmü kaybolmuş`);
    assert.deepEqual(gerekceyiOlc(s.notIster, "   \n  "), { tur: "gerekçeBoş" },
      `yalnız boşluk taşıyan kutu ${rol} için gerekçe sayılıyor`);
  }
  // Gerekçe kırpılarak yazılır: baştaki ve sondaki boşluk diske inmez.
  assert.deepEqual(gerekceyiOlc(true, "  neden böyle  "), { tur: "geçerli", not: "neden böyle" });
});

test("dolu kutu + düz onay: SESSİZ KAYIP YOK — yazım durur, metin yerinde kalır", () => {
  // İki kolay yol da reddedildi: (a) yazılmış gerekçeyi sessizce atmak — bu
  // depoda bu hafta ölçülmüş kusur ailesi; (b) düz onayı sessizce şerhe
  // çevirmek — kullanıcının SEÇMEDİĞİ damgayı diske yazar.
  assert.deepEqual(gerekceyiOlc(false, "yazdığım gerekçe"), { tur: "gerekçeArtık" },
    "kutuda gerekçe varken düz onay yazıma geçiyor; yazılan metin sessizce atılır");
  assert.ok(GEREKCE_ARTIK.includes("Şerhle onayla") && GEREKCE_ARTIK.includes("boşalt"),
    "uyarı ne yapılacağını söylemiyor; kullanıcı çıkmazda kalır");
  assert.ok(/sessizce/.test(GEREKCE_ARTIK),
    "uyarı metnin atılmayacağını açıkça söylemiyor");
  // Metin defterde DURUR: uyarı taslağı silmez.
  const durum = new PanelDurumu();
  const notId = notKimligi(TEK_DOSYA, "A1");
  durum.taslakYaz(notId, "yazdığım gerekçe");
  durum.hataYaz(notId, GEREKCE_ARTIK);
  assert.equal(durum.taslak(notId), "yazdığım gerekçe",
    "uyarı kullanıcının yazdığı metni sildi; sessiz kayıp geri gelmiş");
});

test("iptal ile boş kutu AYRI şeylerdir ve ikisi de HİÇBİR kayıt yazmaz", () => {
  assert.deepEqual(gerekceyiOlc(true, undefined), { tur: "iptal" },
    "kutuyu hiç doldurmadan vazgeçmek boş gerekçeyle aynı sayılıyor (ölçülmüş Kusur 9)");
  assert.notDeepEqual(gerekceyiOlc(true, undefined), gerekceyiOlc(true, ""),
    "iptal ile boş kutu aynı sonucu veriyor; ikisi ayrı karşılanamaz");
  // Panel iptali kendi komutuna indirir ve HİÇBİR karar yazmaz.
  const panel = oku("../src/posta-kutusu.ts");
  assert.ok(/case "iptal"[\s\S]{0,600}"sarmal\.postaKararIptal"/.test(panel),
    "iptal yolu yok ya da karar komutuna düşüyor");
  assert.ok(!/case "iptal"[\s\S]{0,600}postaKararVer/.test(panel),
    "iptal kararı yazan komuta iniyor; vazgeçmek hüküm yazamaz");
  const kuyruk = oku("../src/onay-kuyrugu.ts");
  assert.ok(/postaKararIptal[\s\S]{0,400}kararIptalEdildi\(kod\)/.test(kuyruk),
    "iptal sessiz kalıyor; kullanıcı vazgeçtiğini hiçbir yerden görmüyor");
});

test("hata kullanıcının GÖZÜNÜN ÖNÜNDE, kutunun yanında görünür", () => {
  const durum = kapiyiAc(new PanelDurumu(), TEK_DOSYA, "A1");
  const notId = notKimligi(TEK_DOSYA, "A1");
  const temiz = govde(tekKapiliFikstur(), durum);
  assert.ok(/class="not-hata"[^>]*hidden/.test(temiz),
    "hata satırı hata yokken de görünüyor; her açılışta kırmızı bir uyarı çıkar");
  durum.hataYaz(notId, GEREKCE_ZORUNLU);
  const hatali = govde(tekKapiliFikstur(), durum);
  assert.ok(!/class="not-hata"[^>]*hidden/.test(hatali),
    "hata yazıldığı hâlde gövdede gizli kalıyor; kullanıcı neden yazılmadığını göremez");
  assert.ok(hatali.includes(GEREKCE_ZORUNLU.slice(0, 30)),
    "hata cümlesi gövdeye basılmıyor");
  // Konum: hata KUTUNUN hemen altında, seçeneklerin ÜSTÜNDE durur.
  const kutu = konum(hatali, "<textarea", "gerekçe kutusu");
  const hata = konum(hatali, 'class="not-hata"', "hata satırı");
  const ilkSecenek = konum(hatali, 'data-rol="onay"', "onay seçeneği");
  assert.ok(kutu < hata && hata < ilkSecenek,
    "hata kutunun yanında değil; kullanıcı hatayı kutudan uzakta arar");
});

// ── ⑮ TAZELEME YAZILMAKTA OLAN METNİ DÜŞÜREMEZ ─────────────────────────────
//
//   Bu çalışma alanında kendiliğinden kaydetme açıktır ve tazeleme SÜREKLİDİR.
//   Ağaç dünyasında tazeleme açık satırı kapatıyordu (ölçülmüş Kusur 4). Kutu
//   akışın merkezi olduğu bu düzende aynı kusur çok daha pahalıya patlardı.

test("tazeleme: yazılmakta olan gerekçe DÜŞMEZ, satır da AÇIK kalır", () => {
  const durum = kapiyiAc(new PanelDurumu(), TEK_DOSYA, "A1");
  const notId = notKimligi(TEK_DOSYA, "A1");
  durum.taslakYaz(notId, "bu kapıyı şu yüzden şerhliyorum");
  // Tazeleme: aynı kapı, fakat Adımın amacı bu arada düzenlendi (etiket değişti).
  const tazelenmis = icGovde(tekKapiliFikstur("🧪 amaç metni DEĞİŞTİ"), durum);
  assert.ok(tazelenmis.includes("bu kapıyı şu yüzden şerhliyorum"),
    "tazeleme kullanıcının yazdığı gerekçeyi düşürdü; ölçülmüş kusur ailesi geri gelmiş");
  assert.ok(tazelenmis.includes('aria-expanded="true"'),
    "tazeleme açık kapı satırını kapattı; kullanıcı elinin altında kapıyı kaybeder");
  assert.ok(tazelenmis.includes("amaç metni DEĞİŞTİ"),
    "tazeleme yeni gerçeği göstermiyor; panel bayat kalır");
});

test("tazeleme: belge BAŞTAN yazılmaz; odak ve imleç konumu korunur", () => {
  const panel = oku("../src/posta-kutusu.ts");
  assert.ok(/govdeyiTazele\(\)[\s\S]{0,80}/.test(panel), "tazeleme yolu yok");
  const basi = panel.indexOf("private govdeyiTazele(");
  const govdeIsleve = panel.slice(basi, basi + 400);
  assert.ok(govdeIsleve.includes('tur: "gövde"') && !govdeIsleve.includes("webview.html ="),
    "tazeleme belgeyi baştan yazıyor; sayfa yeniden yüklenir ve kullanıcı " +
    "cümlesinin ortasında klavyeyi kaybeder");
  // Her tuş vuruşunda gövde YENİDEN BASILMAZ: taslak yalnız deftere düşer.
  assert.ok(/case "taslak":[\s\S]{0,400}taslakYaz\(m\.kimlik, m\.metin\);\s*\n\s*return;/.test(panel),
    "taslak mesajı gövdeyi yeniden bastırıyor; her harfte imleç yeniden kurulur");
  const betik = oku("../src/posta-govde.ts");
  assert.ok(betik.includes("setSelectionRange") && betik.includes("activeElement"),
    "tazeleme sonrası odak ve imleç konumu geri konmuyor");
});

test("taslak: her KAPININ kutusu ayrıdır; başka kapıyı açmak metni silmez", () => {
  const durum = new PanelDurumu();
  const bir = notKimligi("/depo/_Sarmal/plan/goc_plani.sar", "A1");
  const iki = notKimligi("/depo/_Sarmal/plan/vitrin_ui.sar", "B9");
  durum.taslakYaz(bir, "birinci kapının gerekçesi");
  durum.taslakYaz(iki, "ikinci kapının gerekçesi");
  assert.equal(durum.taslak(bir), "birinci kapının gerekçesi",
    "ikinci kapıya yazmak birinci kapının metnini ezdi");
  assert.equal(durum.taslakSayisi, 2, "iki ayrı kapının taslağı tek yuvada tutuluyor");
  // Aynı kapının üç seçeneği TEK taslağı paylaşır: kutu ortak girdidir.
  assert.equal(notKimligi("/depo/x.sar", "A1"), notKimligi("/depo/x.sar", "A1"));
  assert.ok(!notKimligi("/depo/x.sar", "A1").includes("onay"),
    "taslak kimliği role bağlanmış; kullanıcı seçenek değiştirince metnini kaybeder");
});

test("taslak: karar DİSKTE kanıtlanınca taslak düşer, kanıtlanmazsa DURUR", () => {
  const durum = new PanelDurumu();
  const notId = notKimligi(TEK_DOSYA, "A1");
  durum.taslakYaz(notId, "gerekçem");
  durum.taslagiSil(notId);
  assert.equal(durum.taslak(notId), "", "karar yazıldıktan sonra taslak defterde kalmış");
  const panel = oku("../src/posta-kutusu.ts");
  assert.ok(/sonuc\?\.tur === "başarı"[\s\S]{0,120}taslagiSil\(notId\)/.test(panel),
    "taslak kanıtlı başarıdan bağımsız siliniyor; yazılamayan bir kararda kullanıcı " +
    "gerekçesini de kaybeder");
});

// ── ⑯ GÜVENLİK VE SIFIR BAĞIMLILIK ─────────────────────────────────────────

test("güvenlik: içerik güvenlik politikası dar tutulur ve DIŞ KAYNAĞA hiç bağlanılmaz", () => {
  const html = govde(ikiDosyaliFikstur());
  assert.ok(html.includes("default-src 'none'"),
    "politika 'none' ile başlamıyor; gövde varsayılan olarak her şeye izin verir");
  assert.ok(html.includes("script-src 'nonce-NONCEDENEME'"),
    "betik nonce ile sınırlanmamış");
  assert.ok(!/'unsafe-inline'|'unsafe-eval'|\*/.test(
    /content="([^"]*)"/.exec(html)?.[1] ?? ""),
    "politika gevşetilmiş; nonce'suz betik ya da joker kaynak kabul ediliyor");
  // STR-3.1: sıfır bağımlılık — gövdede hiçbir dış adres yoktur.
  const kaynak = oku("../src/posta-govde.ts");
  assert.ok(!/https?:\/\//.test(kaynak),
    "gövde kaynağında dış adres var; sıfır bağımlılık ilkesi çiğnenmiş");
  const panel = oku("../src/posta-kutusu.ts");
  assert.ok(/localResourceRoots/.test(panel),
    "yerel kaynak kökü sınırlanmamış; panel eklenti dışına erişebilir");
});

test("güvenlik: kullanıcı verisi gövdeye KAÇIŞSIZ girmez", () => {
  const kotu = kapilar(zincir(
    `Adım( kod: A1, durum: beklemede, ne: "<script>alert(1)</script> & \\"tırnak\\"", kabul: [ ${ONAYLI_OLCUT} ] )`));
  assert.equal(kotu.length, 1, "fikstür kapı üretmedi");
  const durum = kapiyiAc(new PanelDurumu(), TEK_DOSYA, "A1");
  durum.taslakYaz(notKimligi(TEK_DOSYA, "A1"), "</textarea><script>alert(2)</script>");
  const html = govde(kotu.map((kapi) => ({ dosya: TEK_DOSYA, kapi })), durum);
  assert.ok(!html.includes("<script>alert(1)</script>"),
    "Adımın amacı gövdeye ham girmiş; kaynak metni panelde betiğe dönüşebilir");
  assert.ok(!html.includes("</textarea><script>alert(2)</script>"),
    "kullanıcının yazdığı taslak gövdeye ham girmiş; kutudan kaçılabilir");
  assert.ok(html.includes("&lt;script&gt;"), "kaçış hiç uygulanmamış");
});

test("betiksiz disiplin: Mini Graf betiksiz KALIR, karar yüzeyi betik alır", () => {
  const minigraf = oku("../src/minigraf.ts");
  assert.ok(minigraf.includes("enableScripts: false"),
    "Mini Grafın betiksiz disiplini bozulmuş; ona dokunulmayacaktı");
  const panel = oku("../src/posta-kutusu.ts");
  assert.ok(panel.includes("enableScripts: true"),
    "karar yüzeyi betiksiz; giriş alan bir yüzey betiksiz olamaz");
});

// ── ⑰ YEREL AĞACIN VERDİKLERİ: ELLE KURULANLAR VE DÜRÜSTÇE KAYIP OLANLAR ───

test("elle kuruldu: klavye gezinmesi ağaçtan gelmez, gövde onu kendisi kurar", () => {
  // ⚠️ Bu ölçü KAYNAK METNİNDENDİR ve sınırı açıkça budur: birim süiti tarayıcı
  // kurmaz, dolayısıyla bir ok tuşunun gerçekten odağı taşıdığını ölçemez.
  // Ölçülen şey davranışın VAR OLMASIDIR; kaybolursa nöbet kırmızıya döner.
  const kaynak = oku("../src/posta-govde.ts");
  for (const tus of ["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft", "Home", "End", "Escape"]) {
    assert.ok(kaynak.includes(`"${tus}"`),
      `${tus} tuşu ele alınmıyor; yerel ağacın bedava verdiği gezinme geri kurulmadı`);
  }
  assert.ok(kaynak.includes("aria-expanded"),
    "açıklık durumu erişilebilirlik ağacına bildirilmiyor");
});

test("elle kuruldu: boş-durum cümlesi gövdenin İÇİNDE yaşar (TreeView.message yoktur)", () => {
  const bos = govde([]);
  // Beklenen cümle KAYNAĞINDAN okunur, elle ikizlenmez: metin değiştiğinde nöbet
  // kendiliğinden yeni metni ölçer ve yalnız cümlenin gövdeden DÜŞMESİ kırmızı verir.
  assert.ok(bos.includes(YUZEY_BOS_DURUM.postaKutusu.slice(0, 40)),
    "boş kuyrukta panel bomboş kalıyor; kullanıcı ne yapacağını öğrenemez");
  assert.ok(!bos.includes("<textarea"), "boş kuyrukta gerekçe kutusu basılıyor");
  assert.ok(!bos.includes('class="satir'), "boş kuyrukta satır basılıyor");
});

test("elle kuruldu: panel dar olduğunda kutu TAŞMAZ", () => {
  const html = govde(tekKapiliFikstur(), kapiyiAc(new PanelDurumu(), TEK_DOSYA, "A1"));
  assert.ok(html.includes("box-sizing: border-box"),
    "kenarlık genişliğin dışında sayılıyor; dar panelde kutu taşar");
  assert.ok(/\.not-metin \{[^}]*max-width: 100%/.test(html),
    "kutu genişliği sınırlanmamış; kenar çubuğu daraltılınca taşar");
  assert.ok(/body \{[^}]*overflow-x: hidden/.test(html),
    "gövde yatay kaydırma çubuğu doğurabiliyor");
  assert.ok(/\.not-metin \{[^}]*overflow-wrap: anywhere/.test(html),
    "uzun sözcük kırılmıyor; dar panelde metin kutudan taşar");
  assert.ok(/<textarea[^>]*rows="3"/.test(html),
    "gerekçe kutusu tek satırlık; çok satırlı gerekçe yazılamaz");
});

// ── ⑱ SINIR DENETİMİ — panelden GELMEYEN çağrı da boş gerekçeyle yazamaz ───

test("sınır: komut da boş gerekçeyle karar YAZMAZ ve aynı saf ölçüyü kullanır", () => {
  const kuyruk = oku("../src/onay-kuyrugu.ts");
  assert.ok(kuyruk.includes('import { gerekceyiOlc } from "./posta-govde.ts"'),
    "komut sınırı gerekçeyi kendi kuralıyla ölçüyor; iki kural zamanla ayrışır (RED-2 dersi)");
  const basi = kuyruk.indexOf("const postaKararVer = async");
  const sonu = kuyruk.indexOf("const postaKararIptal");
  assert.ok(basi > 0 && sonu > basi, "postaKararVer gövdesi kaynakta bulunamadı");
  const g = kuyruk.slice(basi, sonu);
  const olcuKonum = g.indexOf("gerekceyiOlc(");
  const yazimKonum = g.indexOf("kaydiIsle(");
  assert.ok(olcuKonum > 0 && yazimKonum > olcuKonum,
    "gerekçe ölçüsü yazımdan SONRA yapılıyor; boş gerekçeyle karar diske inebilir");
  assert.ok(/if \(olcu\.tur !== "geçerli"\)[\s\S]{0,400}return undefined;/.test(g),
    "geçersiz gerekçede yazım durmuyor");
  assert.ok(/olcu\.not/.test(g), "yazıma kırpılmamış ham metin gidiyor");
});

// ═══════════════════════════════════════════════════════════════════════════
// ⑲ BAYAT ANLIK GÖRÜNTÜ KARARA BAĞLANMIŞ KAPIYI DİRİLTEMEZ
//
//   Founder canlı bulgusu 2026-07-29 (0.9.130): "bir tane kapıyı onaylıyorum,
//   onaylanan kutucuk tekrar gelip onay istiyor." Karar DİSKE İNİYORDU; kusur
//   panelin kapıyı geri almasıydı. İkinci tıklamada çıkan "kapı bulunamadı"
//   hatası kusur DEĞİL, kanıtlı yazım hattının doğru çalıştığının kanıtıydı.
//
//   ⚠️ BU NÖBETİ NEDEN HİÇBİRİ YAKALAMADI — günün en pahalı dersi. Yirmi beş
//   nöbet mutasyonla kanıtlanmıştı ve hepsi doğruydu, fakat hepsi PARÇALARI
//   ölçüyordu: gövde doğru mu, gerekçe ölçüsü doğru mu, mesaj doğru mu. Hiçbiri
//   kullanıcının gördüğü SONUCU ölçmüyordu — "karar verdim, kapı gitti ve bir
//   daha sorulmadı". Parçaların hepsi yeşilken bütün kırıktı. Aşağıdaki nöbetler
//   o boşluğu kapatır; kardeşi gerçek editör kabuğunda koşar.
// ═══════════════════════════════════════════════════════════════════════════

/** Bir dosyanın kapılarını `AcikBelgeKapilari` biçimine çevirir. */
const acikBelge = (dosya: string, kapilar: readonly OnayKapisi[]) => ({ dosya, kapilar });

test("bayat görüntü: karara bağlanmış kapı toptan yerleşimde GERİ GELMEZ", () => {
  // Ana tanı hattının anlık görüntüsü kullanıcının kararından ÖNCE üretildi ve
  // kapıyı hâlâ AÇIK sanıyor. Belge ise karardan SONRAKİ gerçeği taşıyor.
  const bayatGoruntu = tekKapiliFikstur();
  assert.equal(bayatGoruntu.length, 1, "fikstür boş; nöbet hiçbir şey ölçmüyor");

  // Karar yazıldı: belgede artık açık kapı yok. Belge TEMİZDİR — yazıcı onu
  // kendisi kaydetti. Ölçülen kusurun tam kalbi buradaydı: eski kural yalnız
  // KİRLİ belgelere baktığı için koruma tam gerektiği anda devre dışı kalıyordu.
  const sonuc = acikBelgeleriUstuneYaz(bayatGoruntu, [acikBelge(TEK_DOSYA, [])]);
  assert.deepEqual(sonuc, [],
    "bayat anlık görüntü karara bağlanmış kapıyı panele geri koydu; " +
    "kullanıcı aynı kapı için ikinci kez karar ister (Founder canlı bulgusu 2026-07-29)");
});

test("bayat görüntü: açık belge kapıyı hâlâ görüyorsa kapı DÜŞMEZ", () => {
  // Ters yön de ölçülür: kural körü körüne silmez, açık belgenin gerçeğini yazar.
  const kayitlar = tekKapiliFikstur();
  const sonuc = acikBelgeleriUstuneYaz([], [acikBelge(TEK_DOSYA, kayitlar.map((k) => k.kapi))]);
  assert.deepEqual(sonuc.map((k) => k.kapi.kod), ["A1"],
    "açık belgede duran kapı panele hiç inmedi; kuyruk körleşir");
});

test("bayat görüntü: AÇIK OLMAYAN dosyaların kapıları görüntüden aynen geçer", () => {
  const kayitlar = ikiDosyaliFikstur();
  const acikYol = "/depo/_Sarmal/plan/goc_plani.sar";
  // Yalnız bir dosya açık ve o dosyanın kapıları karara bağlanmış.
  const sonuc = acikBelgeleriUstuneYaz(kayitlar, [acikBelge(acikYol, [])]);
  assert.deepEqual(sonuc.map((k) => k.kapi.kod), ["B9"],
    "açık olmayan dosyanın kapıları da düştü; panel körleşir");
  // Hiç açık belge yoksa görüntü olduğu gibi geçer.
  assert.equal(acikBelgeleriUstuneYaz(kayitlar, []).length, kayitlar.length,
    "açık belge yokken görüntü değiştirildi");
});

test("bayat görüntü: kural KİRLİLİĞE değil AÇIKLIĞA bakar", () => {
  const kaynak = oku("../src/onay-kuyrugu.ts");
  const basi = kaynak.indexOf("const goruntuyuAciklarlaBirlestir");
  assert.ok(basi > 0, "birleştirme yolu kaynakta bulunamadı");
  const govde = kaynak.slice(basi, basi + 500);
  assert.ok(!/isDirty/.test(govde),
    "süzgeç hâlâ kirliliğe bakıyor; karar yazıcısı belgeyi kendisi kaydettiği " +
    "için koruma tam gerektiği anda devre dışı kalır (ölçülmüş kusur 2026-07-29)");
  assert.ok(govde.includes("acikBelgeleriUstuneYaz("),
    "birleştirme saf kuraldan geçmiyor; ikinci bir kural evreni doğmuş");
});

test("metin: kapanmış kapıya tıklayan kullanıcı SUÇLANMAZ ve panelin tazelendiğini öğrenir", () => {
  const cumle = kararKapiYok("CDL-A07");
  assert.ok(cumle.includes("CDL-A07"), "cümle hangi kapıdan söz ettiğini söylemiyor");
  assert.ok(!/İŞLENEMEDİ|HATA|⚠️/.test(cumle),
    `cümle hâlâ teknik ve suçlayıcı: ${cumle}`);
  assert.ok(/zaten karara bağlanmış/.test(cumle),
    "cümle en olası sebebi söylemiyor; kullanıcı ne olduğunu anlamıyor");
  assert.ok(/ikinci bir kayıt yazılmadı/.test(cumle),
    "cümle hiçbir şeyin bozulmadığını söylemiyor");
  assert.ok(/[Pp]anel tazelendi/.test(cumle),
    "cümle panelin tazelendiğini bildirmiyor; kullanıcı satırın kalacağını sanır");
});

// ═══════════════════════════════════════════════════════════════════════════
// ⑳ ODAK — Founder hükmü 2026-07-29: "kapı açılınca odak kendiliğinden gerekçe
//    kutusuna gitsin."
//
//   Hüküm uygulanır, fakat klavye kullanıcısını KAPANA KISTIRMADAN. Üç şart
//   ayrı ayrı ölçülür: ① kullanıcının açtığı kapıda odak kutudadır,
//   ② tazeleme odağı ÇALMAZ, ③ kutudan çıkış yolu çalışır.
//
//   ⚠️ ÖLÇÜLEMEYEN ŞEY DÜRÜSTÇE YAZILIR: birim süiti tarayıcı kurmaz, bu yüzden
//   bir tuşa basınca odağın GERÇEKTEN taşındığını koşturamaz. Ölçülen şey ODAK
//   NİYETİDİR — hangi olayın odak taşıma hakkı olduğu — ve o niyet saf bir
//   kuralda yaşadığı için gerçekten koşturulur. Niyetin DOM'da uygulanması
//   kaynak metninden ölçülür ve bu sınır burada açıkça yazılıdır.
// ═══════════════════════════════════════════════════════════════════════════

test("odak ①: kullanıcının KENDİ açtığı kapıda odak gerekçe kutusuna gider", () => {
  const kimlik = postaKimligi({ tur: "kapı", dosya: TEK_DOSYA, kod: "A1" });
  const niyet = odakNiyeti({ tur: "aç", kimlik, acik: true, dosya: TEK_DOSYA, kod: "A1" });
  assert.equal(niyet, notKimligi(TEK_DOSYA, "A1"),
    "kapı açılınca odak kutuya gitmiyor; Founder hükmü uygulanmamış");
  // Odaklanacak alan gövdede GERÇEKTEN vardır ve kimliği birebir tutar.
  const acik = govde(tekKapiliFikstur(), kapiyiAc(new PanelDurumu(), TEK_DOSYA, "A1"));
  assert.ok(acik.includes(`id="not-${niyet}"`),
    "odak niyetinin gösterdiği alan gövdede yok; odak boşluğa gider");
  // Kabuk niyeti gövde mesajına GERÇEKTEN koyar ve betik onu uygular.
  const panel = oku("../src/posta-kutusu.ts");
  assert.ok(/acikligiYaz\(m\.kimlik, m\.acik\)\) this\.govdeyiTazele\(odakNiyeti\(m\)\)/.test(panel),
    "kabuk odak niyetini tazeleme mesajına koymuyor");
  const betik = oku("../src/posta-govde.ts");
  assert.ok(/if \(m\.odakNot\) notaOdaklan\(m\.odakNot\)/.test(betik),
    "betik odak niyetini uygulamıyor");
  // ③ üncü şart: sayfa zıplamaz ve kapı satırı görünür kalır.
  assert.ok(/satir\.scrollIntoView\(\{ block: "nearest" \}\);\s*\n\s*alan\.focus\(\{ preventScroll: true \}\)/.test(betik),
    "odak verilirken sayfa zıplayabiliyor ya da kapı satırı görünür kalmıyor; " +
    "kullanıcı hangi kapıya yazdığını göremez");
});

test("odak ②: TAZELEME odağı çalamaz — niyet yalnız kullanıcı açılışında doğar", () => {
  const kimlik = postaKimligi({ tur: "kapı", dosya: TEK_DOSYA, kod: "A1" });
  const notId = notKimligi(TEK_DOSYA, "A1");
  // Kapanan kapı, dosya satırı, yazma, iptal ve karar: hiçbiri odak taşımaz.
  assert.equal(odakNiyeti({ tur: "aç", kimlik, acik: false, dosya: TEK_DOSYA, kod: "A1" }), undefined,
    "kapanan kapı odağı kutuya çekiyor");
  assert.equal(odakNiyeti({ tur: "aç", kimlik: "posta·dosya·x", acik: true }), undefined,
    "dosya satırının açılması odağı bir kutuya çekiyor");
  assert.equal(odakNiyeti({ tur: "taslak", kimlik: notId, metin: "yazıyorum" }), undefined,
    "yazma olayı odak taşıyor; her harfte imleç yeniden kurulur");
  assert.equal(odakNiyeti({ tur: "iptal", dosya: TEK_DOSYA, kod: "A1" }), undefined,
    "iptal odak taşıyor");
  assert.equal(odakNiyeti({
    tur: "kararVer", dosya: TEK_DOSYA, kod: "A1", satir: 3, rol: "onay", not: "",
  }), undefined, "karar olayı odak taşıyor");
  assert.equal(odakNiyeti({ tur: "kapıSeç", dosya: TEK_DOSYA, kod: "A1" }), undefined,
    "kapı seçimi ikinci bir odak yolu açıyor");
  // TAZELEME YOLLARI argümansız çağırır: odak niyeti üretemezler.
  const panel = oku("../src/posta-kutusu.ts");
  const basi = panel.indexOf("private cizdir()");
  const cizdir = panel.slice(basi, basi + 260);
  assert.ok(/this\.govdeyiTazele\(\);/.test(cizdir),
    "tazeleme yolu odak niyeti taşıyor; kullanıcı yazarken odağı kayar " +
    "(bu depoda bu hafta üç kez ölçülmüş kusur ailesi)");
  // Ve odak, tazeleme sonrası kullanıcının BIRAKTIĞI yere geri konur.
  const betik = oku("../src/posta-govde.ts");
  assert.ok(/odakKimlik = odak && odak\.dataset \? odak\.dataset\.kimlik/.test(betik),
    "tazeleme sonrası odak KARARLI KİMLİKTEN geri okunmuyor; kutuda olmayan " +
    "kullanıcının odağı gövdeye düşer ve ok tuşları çalışmaz olur");
  assert.ok(/kok\.querySelector\('\[data-kimlik="' \+ CSS\.escape\(odakKimlik\)/.test(betik),
    "kararlı kimlikle odak geri konmuyor");
  assert.ok(/yeni\.setSelectionRange\(bas, son\)/.test(betik),
    "tazeleme sonrası imleç konumu geri konmuyor; kullanıcı cümlesinin " +
    "ortasında imlecini kaybeder");
});

test("odak ③: kutudan ÇIKIŞ yolu açıktır ve odak kapı satırına döner", () => {
  const betik = oku("../src/posta-govde.ts");
  const basi = betik.indexOf("function kutudanCik(");
  assert.ok(basi > 0, "kutudan çıkış yolu hiç yok; klavye kullanıcısı kapana kısılır");
  const cikis = betik.slice(basi, basi + 400);
  assert.ok(cikis.includes("kapiSatiriBul(") && cikis.includes("focus("),
    "çıkış odağı kapı satırına vermiyor; kullanıcı gezinmeye devam edemez");
  // İKİ YOL: Escape ve Shift+Tab.
  assert.ok(/olay\.key === "Escape" \|\| \(olay\.key === "Tab" && olay\.shiftKey\)/.test(betik),
    "çıkış için ikinci bir yol (Shift+Tab) kurulmamış");
  // ÇIKIŞ VAZGEÇMEK DEĞİLDİR: ÇAĞRI YERİ ölçülür, yalnız işlev gövdesi değil.
  const tusBasi = betik.indexOf('olay.key === "Escape" || (olay.key === "Tab" && olay.shiftKey)');
  assert.ok(tusBasi > 0, "kutudaki çıkış tuşları ele alınmıyor");
  const tusDali = betik.slice(tusBasi, tusBasi + 220);
  assert.ok(tusDali.includes("kutudanCik(kutu)"),
    "çıkış tuşu kutudan çıkış yolunu çağırmıyor");
  assert.ok(!/tur: "iptal"/.test(tusDali),
    "kutudaki Escape hâlâ VAZGEÇMEYE bağlı; çıkmak ile vazgeçmek aynı tuşa " +
    "binmiş ve kullanıcı yalnız kutudan çıkmak isterken kapıyı kapatıyor");
  assert.ok(!/kutudanCik[\s\S]{0,300}postMessage/.test(cikis),
    "çıkış işlevi kabuğa bir şey bildiriyor; çıkmak kapıyı kapatmamalı");
  // VAZGEÇME ayrı bir eylemdir: kapı satırındaki ikinci Escape.
  assert.ok(/olay\.key === "Escape" && dugme\.classList\.contains\("kapi-satiri"\)[\s\S]{0,300}tur: "iptal"/.test(betik),
    "vazgeçme yolu kaybolmuş; iptal ile boş kutu ayrımı ancak iptal yolu varsa yaşar");
});

test("odak: metin iki Escape'in ne yaptığını DOĞRU anlatır", () => {
  const serh = postaKararIpucu({ kod: "A1", damga: "şerhle onaylandı", notIster: true });
  assert.ok(/imleç kutuya kendiliğinden gelir/.test(serh),
    "metin otomatik odağı söylemiyor; kullanıcı davranışı sürpriz olarak yaşar");
  assert.ok(/Shift\+Tab/.test(serh), "metin ikinci çıkış yolunu söylemiyor");
  assert.ok(/kapı açık kalır/.test(serh),
    "metin çıkışın kapıyı kapatmadığını söylemiyor");
  assert.ok(/ikinci Escape ise kapıyı kapatır/.test(serh),
    "metin vazgeçme yolunu söylemiyor; iki anlam kullanıcı gözünde çakışır");
});

// ═══════════════════════════════════════════════════════════════════════════
// ㉑ BAĞLAM KOPYALAMA — Founder canlı bulgusu 2026-08-04 (VIT-POSTA-A04)
//
//   Kapı satırları düğme öğesiyle basılır ve Chromium düğme içi metni seçime
//   kapalı tutar: kullanıcı kapının metnini seçip Kopyala deneyince pano ESKİ
//   içeriğinde kalıyordu ve kusur sessizdi. Asıl niyet kapının bağlamını karar
//   vermek için asistan sohbetine taşımaktı. Onarım seçimi açmak DEĞİLDİR:
//   her kapı AÇIK bir kopyalama eylemi taşır, pano yazımı YALNIZ kabukta
//   yaşar ve bildirimde kapının kodu geçer. Aşağıdaki dört nöbet bu
//   sözleşmenin dört ayrı yüzünü ölçer ve dördü de mutasyonla kanıtlanmıştır.
// ═══════════════════════════════════════════════════════════════════════════

test("bağlam: gövdede kopyalama düğmesi YOKTUR; kapının kararları üç satırda kalır", () => {
  // Founder hükmü 2026-08-05: eylem yalnız kapı satırında yaşar. Gövdeye dördüncü
  // bir düğme koymak aynı işi iki yerde göstermek olurdu; bu nöbet o düğmenin
  // geri sızmasını durdurur.
  const acik = govde(tekKapiliFikstur(), kapiyiAc(new PanelDurumu(), TEK_DOSYA, "A1"));
  assert.ok(!acik.includes('class="satir kopya-satiri"'),
    "gövdede yeniden bir kopyalama düğmesi doğmuş; eylem kapı satırının işidir");
  assert.equal((acik.match(/class="satir karar-satiri"/g) ?? []).length, 3,
    "kapının karar satırı sayısı üç değil; kopyalama karar çizelgesine sızmış olabilir");
  // Karar düğmelerinin işareti EMOJİ DEĞİL, ailenin çizimidir (YUZ-4.2).
  assert.ok(!/class="emoji" aria-hidden="true">[^<]*<\/span>\s*<span class="etiket"/.test(acik),
    "karar düğmesi hâlâ emoji basıyor; arayüz işaretleri kilitli SVG ailesinden gelir");
  assert.equal((acik.match(/class="karar-simge"/g) ?? []).length, 3,
    "üç karar düğmesinin üçü de aile çizimini taşımıyor");
  for (const s of KARAR_SECENEKLERI) {
    assert.ok(acik.includes(`data-rol="${s.rol}"`), `${s.rol} seçeneği düşmüş`);
  }
});

test("bağlam: kopyalama tıkı KENDİ dalından kabuğa gider, açma-kapamaya düşmez", () => {
  const betik = oku("../src/posta-govde.ts");
  const dal = betik.indexOf('dugme.dataset.rol === "bağlamKopyala"');
  assert.ok(dal > 0,
    "kopyalama tıkının kendi dalı yok; tık genel açma-kapama yoluna düşer ve kapıyı oynatır");
  const dalGovdesi = betik.slice(dal, dal + 300);
  assert.ok(/tur: "bağlamKopyala", dosya: dugme\.dataset\.dosya, kod: dugme\.dataset\.kod/.test(dalGovdesi),
    "kopyalama dalı kabuğa dosya+kod çapasını göndermiyor; kabuk defterinden okuyamaz");
  assert.ok(dalGovdesi.includes("return;"),
    "kopyalama dalı dönmüyor; aynı tık kapıyı da açıp kapatır");
  // Dal, tıkın genel açma-kapama düşüşünden ÖNCE durur; tek tık davranışı
  // (aç + Adıma git) ve karar dalı aynen yerindedir.
  const dusus = betik.indexOf('const acik = dugme.getAttribute("aria-expanded")');
  assert.ok(dusus > 0 && dal < dusus,
    "kopyalama dalı açma-kapama düşüşünden sonra; tık önce kapıyı oynatır");
  assert.ok(betik.includes('dugme.classList.contains("karar-satiri")'),
    "karar dalı kaybolmuş; kopyalama eklenirken mevcut akış bozulmuş");
});

test("bağlam: pano bloğu kararı vermek için gerekeni taşır ve bildirimde kapının kodu geçer", () => {
  const [kayit] = tekKapiliFikstur();
  const kapi = kayit!.kapi;
  const blok = postaKapiBaglami({
    kod: kapi.kod, ne: kapi.ne, olcut: kapi.olcut,
    dosya: TEK_DOSYA, satir: kapi.satir + 1, durum: kapi.durumMetin,
  });
  assert.ok(blok.includes(kapi.kod), "blok kapının kodunu taşımıyor");
  assert.ok(blok.includes(`${TEK_DOSYA}:${kapi.satir + 1}`),
    "blok dosya:satır konumunu taşımıyor; okuyan kapıyı kaynakta bulamaz");
  assert.ok(blok.includes(kapi.ne), "blok Adımın amacını taşımıyor");
  assert.ok(blok.includes(kapi.olcut), "blok onay isteyen ölçütü taşımıyor");
  assert.ok(blok.includes("beklemede"), "blok Adımın durumunu taşımıyor");
  // Bildirim kapının kodunu söyler ve panoya yazıldığını bildirir.
  assert.ok(postaBaglamKopyalandi("BKM-INC-A01").includes("BKM-INC-A01"),
    "bildirim kapının kodunu söylemiyor; kullanıcı hangi kapıyı taşıdığını göremez");
  assert.ok(/panoya kopyalandı/.test(postaBaglamKopyalandi("A1")),
    "bildirim panoya yazıldığını söylemiyor");
  // Defterden düşmüş kapıda pano yazımı durur ve sebep söylenir.
  assert.ok(postaBaglamKapiYok("A1").includes("A1")
    && /hiçbir şey yazılmadı/.test(postaBaglamKapiYok("A1")),
    "kapı defterde yokken susuluyor ya da panoya bir şey yazıldığı sanılıyor");
  // Kabuk bloğu KENDİ defterinden okur, panoya kendi elinden yazar, SONRA bildirir.
  const panel = oku("../src/posta-kutusu.ts");
  assert.ok(panel.includes('case "bağlamKopyala"'),
    "kabukta kopyalama mesajının dalı yok; webview'in mesajı boşluğa düşer");
  const basi = panel.indexOf("private async baglamiKopyala(");
  assert.ok(basi > 0, "kabukta kopyalama işlevi yok");
  const g = panel.slice(basi, basi + 1600);
  const yazim = g.indexOf("vscode.env.clipboard.writeText(");
  const bildirim = g.indexOf("showInformationMessage(");
  assert.ok(yazim > 0, "pano yazımı vscode.env.clipboard.writeText ile yapılmıyor");
  assert.ok(bildirim > yazim,
    "bildirim pano yazımından önce basılıyor ya da hiç basılmıyor; başarı kanıttan önce ilan edilir");
  assert.ok(g.includes("postaKapiBaglami(") && g.includes("postaBaglamKopyalandi("),
    "kabuk bloğu ve bildirimi katalogdan almıyor; metin ikinci bir evrende doğar");
  assert.ok(/satir: kayit\.kapi\.satir \+ 1/.test(g),
    "blok 0-tabanlı satır basıyor; kullanıcı editörde bir üst satıra bakar");
});

test("bağlam: pano yazımı YALNIZ kabuktadır — webview'de hiçbir pano ya da seçim yolu yoktur", () => {
  // Kusurun kök nedeni düğme içi metnin seçilememesiydi; onarım seçimi açmak
  // ya da webview'e tarayıcı pano yolu kurmak DEĞİLDİR. İçerik güvenlik
  // politikası dışarıyı zaten kapatır; bu nöbet yasak yolların kaynağa hiç
  // girmediğini bütün eklenti kaynağında ölçer.
  const kaynakDizini = yol("../src");
  for (const ad of readdirSync(kaynakDizini)) {
    if (!ad.endsWith(".ts")) continue;
    const kaynak = readFileSync(join(kaynakDizini, ad), "utf8");
    for (const yasak of ["execCommand", "navigator.clipboard", "getSelection"]) {
      assert.ok(!kaynak.includes(yasak),
        `${ad} yasak bir pano ya da seçim yolu taşıyor: ${yasak}`);
    }
  }
  // Pano yazımı kabuğun tek elindedir: gövde (webview yarısı) pano API'sinin
  // adını bile anmaz, kabuk ise vscode'un kendi kapısından yazar.
  assert.ok(!oku("../src/posta-govde.ts").includes("clipboard"),
    "gövde (webview) pano API'sine dokunuyor; yazım yalnız kabuğa aittir");
  assert.ok(oku("../src/posta-kutusu.ts").includes("vscode.env.clipboard.writeText("),
    "kabukta pano yazımı yok; kopyalama eylemi boş bir vaattir");
});

// ── ㉒ SATIRDAKİ ÜZERİNE-GELİNCE EYLEMİ (Founder hükmü 2026-08-04) ───────────
//
//   Founder canlı doğrulamada şunu söyledi: kopyalama yalnız açık kapının
//   gövdesinde durmasın, fare kapı satırının üzerine gelince satırın KENDİSİNDE
//   de belirsin; kapı hiç açılmadan tek hamlede bağlam panoya insin. Yerleşim
//   kısıtı serttir: kapı satırı bir <button> öğesidir ve içine ikinci bir düğme
//   YUVALANAMAZ (geçersiz HTML, tarayıcı ayıklar). Eylem bu yüzden satırın
//   KARDEŞİDİR. Gövdedeki düğme ve klavye gezinmesi AYNEN korunur: bu bir
//   ekleme, taşıma değil.

test("satır eylemi: kapı satırında kopyalama eylemi vardır ve düğmeye YUVALANMAZ", () => {
  // Kapı KAPALIYKEN de vardır: hüküm kapıyı hiç açmadan kopyalayabilmektir.
  const kapali = govde(tekKapiliFikstur());
  assert.ok(kapali.includes('class="satir satir-kopya"'),
    "kapalı kapı satırında kopyalama eylemi yok; kullanıcı bağlamı almak için " +
    "kapıyı açmak zorunda kalır (Founder hükmü 2026-08-04)");
  // ⚠️ YUVALAMA YASAĞI: eylem kapı düğmesinin İÇİNDE değil, KARDEŞİDİR.
  const cizilen = kapali.slice(kapali.indexOf('<div id="kok"'), kapali.indexOf("<script"));
  const dugmeBasi = konum(cizilen, 'class="satir kapi-satiri"', "kapı satırı");
  // ⚠️ Kapanış işareti KAPI SATIRINDAN SONRA aranır: belgenin başından arasaydık
  // dosya satırının düğmesini bulur ve ölçü boş bir dilim üstünde koşardı.
  const kapanis = cizilen.indexOf("</button>", dugmeBasi);
  assert.ok(kapanis > dugmeBasi, "kapı düğmesinin kapanışı gövdede bulunamadı");
  const dugmeIci = cizilen.slice(dugmeBasi, kapanis);
  assert.ok(!dugmeIci.includes("satir-kopya"),
    "kopyalama eylemi kapı düğmesinin İÇİNE yuvalanmış; button içinde button " +
    "geçersiz HTML'dir ve tarayıcı öğeyi ayıklar");
  assert.ok(!/<button/.test(dugmeIci.slice(1)),
    "kapı düğmesinin içinde ikinci bir düğme var; tarayıcı belgeyi yeniden kurar");
  assert.ok(cizilen.includes('</button><span class="satir satir-kopya"'),
    "kopyalama eylemi kapı satırının hemen ardından, kardeşi olarak basılmıyor");
  // Erişilebilirlik adı KATALOGDAN gelir ve öğe gerçekten tıklanabilir ilan edilir.
  assert.ok(/<span class="satir satir-kopya" role="button" tabindex="0"/.test(cizilen),
    "eylem tıklanabilir bir öğe olarak ilan edilmemiş; klavye ve ekran okuyucu onu göremez");
  assert.ok(cizilen.includes(`aria-label="${postaKopyaEtiketi()}"`),
    "satır eyleminin erişilebilirlik adı katalogdan gelmiyor; ekran okuyucu yalnız emoji okur");
  assert.ok(cizilen.includes(`data-dosya="${TEK_DOSYA}"`) && cizilen.includes('data-kod="A1"'),
    "satır eylemi dosya+kod çapasını taşımıyor; kabuk hangi kapıyı kopyalayacağını bilemez");
});

test("satır eylemi: kopyalama YALNIZ satırdadır; gövdede ikinci bir düğme YOKTUR", () => {
  const acik = govde(tekKapiliFikstur(), kapiyiAc(new PanelDurumu(), TEK_DOSYA, "A1"));
  const cizilen = acik.slice(acik.indexOf('<div id="kok"'), acik.indexOf("<script"));
  const satirKimligi = `${kopyaKimligi(TEK_DOSYA, "A1")}·satır`;
  // Founder hükmü 2026-08-05: aynı iş iki yerde gösterilmez. Eylem yalnız kapı
  // satırında yaşar; gövdedeki dördüncü düğme kaldırılmıştır.
  assert.equal((cizilen.match(new RegExp(`data-kimlik="${satirKimligi}"`, "g")) ?? []).length, 1,
    "satır eyleminin kararlı kimliği gövdede tekil değil");
  assert.ok(!cizilen.includes('class="satir kopya-satiri"'),
    "gövdede hâlâ ayrı bir kopyalama düğmesi var; aynı eylem iki yerde gösteriliyor");
  // Karar satırları ve gerekçe kutusu bu eklemeden etkilenmez.
  assert.equal((cizilen.match(/class="satir karar-satiri"/g) ?? []).length, 3,
    "satır eylemi karar satırı sayısını değiştirdi");
  assert.equal((cizilen.match(/<textarea/g) ?? []).length, 1,
    "satır eylemi gerekçe kutusunu ikizledi ya da düşürdü");
});

test("satır eylemi: gizli durur, yalnız üzerine gelince ve odakta belirir, yerleşimi KAYDIRMAZ", () => {
  const html = govde(tekKapiliFikstur());
  const bicem = html.slice(konum(html, "<style", "biçem bloğu"), konum(html, "</style>", "biçem kapanışı"));
  assert.ok(/\.satir-kopya \{[^}]*display: none/.test(bicem),
    "satır eylemi varsayılanda görünür; her satırda duran bir düğme listeyi gürültüye boğar");
  assert.ok(/\.satir-kopya \{[^}]*position: absolute/.test(bicem),
    "eylem akışta yer kaplıyor; belirdiğinde etiket ve açıklama kayar");
  assert.ok(/\.kapi-kutu \{[^}]*position: relative/.test(bicem),
    "eylemin konumlandığı kap yok; öğe panelin köşesine kaçar");
  assert.ok(/\.satir-kopya \{[^}]*right: 6px/.test(bicem),
    "eylem satırın sağ ucunda durmuyor");
  // İki görünürlük hâli de kuruludur: fare üzerinde ve satır klavyeyle odaklıyken.
  assert.ok(bicem.includes(".kapi-kutu:hover > .satir-kopya"),
    "fare satırın üzerine geldiğinde eylem belirmiyor; hükmün ta kendisi bu");
  assert.ok(bicem.includes(".kapi-satiri:focus-visible + .satir-kopya"),
    "klavyeyle odaklanan satırda eylem belirmiyor; klavye kullanıcısı onu hiç göremez");
  assert.ok(/\.satir-kopya:focus,?\s*\n?\.satir-kopya:focus-visible \{[^}]*display: inline-flex/.test(bicem)
    || bicem.includes(".satir-kopya:focus,"),
    "eylem odağı aldığında gizleniyor; kullanıcı tam basacakken öğe kayboluyor");
  // Renk YALNIZ tema değişkeninden gelir (YUZ-4) — ham değer gömülmez.
  const kural = /\.satir-kopya[^{]*\{[^}]*\}/g;
  for (const blok of html.match(kural) ?? []) {
    assert.ok(!/#[0-9a-fA-F]{3,6}\b|rgba?\(/.test(blok),
      `satır eyleminin biçemine ham renk gömülmüş: ${blok}`);
  }
});

test("satır eylemi: tık KENDİ dalından gider; Enter ve Boşluk aynı yola iner", () => {
  const betik = oku("../src/posta-govde.ts");
  // ⚠️ Tık dinleyicisi closest(".satir") ile çalışır ve yeni öğe de `.satir`
  // taşır: kopyalama dalı kapı satırının açma-kapama düşüşünden ÖNCE gelmezse
  // aynı tık kapıyı açıp kapatır.
  const kopyaDali = betik.indexOf('dugme.dataset.rol === "bağlamKopyala"');
  const dusus = betik.indexOf('const acik = dugme.getAttribute("aria-expanded")');
  assert.ok(kopyaDali > 0 && dusus > kopyaDali,
    "kopyalama dalı açma-kapama düşüşünden sonra geliyor; satırdaki eylem kapıyı oynatır");
  assert.ok(betik.slice(kopyaDali, dusus).includes("return;"),
    "kopyalama dalı dönmüyor; tık aşağıya sızar");
  // Enter ve Boşluk: span düğme DEĞİLDİR ve tarayıcının bedava tıkını almaz.
  const tusDali = betik.indexOf('olay.key === "Enter" || olay.key === " "');
  assert.ok(tusDali > 0,
    "satır eyleminde Enter ve Boşluk ele alınmıyor; klavye kullanıcısı eylemi çalıştıramaz");
  const dal = betik.slice(tusDali, tusDali + 320);
  assert.ok(dal.includes('dugme.dataset.rol === "bağlamKopyala"'),
    "tuş dalı kopyalama eylemine bağlanmamış; başka satırların Enter davranışı değişir");
  assert.ok(dal.includes("dugme.click()"),
    "tuş kendi mesajını yazıyor; ikinci bir mesaj yolu zamanla tık yolundan ayrışır");
  assert.ok(dal.includes("olay.preventDefault()"),
    "Boşluk tuşu sayfayı kaydırıyor; kullanıcı listede yerini kaybeder");
  // Ok tuşu gezinmesi BOZULMAZ: gizli öğe odaklanabilirler listesine girmez.
  assert.ok(/offsetParent !== null/.test(betik),
    "odaklanabilirler süzgeci görünürlüğe bakmıyor; gizli satır eylemi ok tuşu " +
    "gezinmesine sızar ve odak boşluğa düşer");
  for (const tus of ["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft", "Home", "End", "Escape"]) {
    assert.ok(betik.includes(`"${tus}"`), `${tus} gezinmesi bu turda düşmüş`);
  }
});

// ── 🗺️ AİDİYET: KAPI HANGİ PROJENİN? (Founder canlı bulgusu 2026-08-27) ──────
//   Founder çatı odağındayken panelin on yedi kapıyı listelediğini ve hiçbirinin
//   hangi projeye ait olduğunun okunamadığını bildirdi. Komşu üç panel proje
//   satırını taşır; bu panel bir webview olduğu için ağaç kademesi eklemek durum
//   yönetimini de büyütürdü, oysa soru kademe değil AİDİYET soruyordu.

test("dosya satırı hangi projeye ait olduğunu SÖYLER", () => {
  const html = postaGovdesiHtml(girdi(ikiDosyaliFikstur(), new PanelDurumu()));
  assert.ok(html.includes("Deneme Projesi"),
    "dosya satırı proje adını basmıyor; çatı odağında kapıların aidiyeti okunamaz");
});

test("proje çözülemeyen dosya UYDURMA ad taşımaz, yalnız sayıyı söyler", () => {
  // Dürüstlük kuralı teknoloji simgesindekiyle aynıdır: yanlış bir aidiyet
  // göstermek hiç göstermemekten kötüdür, çünkü kullanıcı onu doğru sanar.
  const html = postaGovdesiHtml({
    ...girdi(ikiDosyaliFikstur(), new PanelDurumu()), proje: () => undefined,
  });
  assert.ok(!html.includes("Deneme Projesi"), "çözülemeyen proje yine de basılmış");
  assert.ok(/\d+ kapı/.test(html), "proje yokken sayı da kaybolmuş");
});

test("aidiyet KABUKTA çözülür: saf gövde proje kökü aramaz", () => {
  // Gövde saf kalmalıdır; dosya sisteminden kök arayan bir gövde hem sınanamaz
  // hem de Yol Haritası ile ayrışabilir. İkinci bir kök arama yazılsaydı iki
  // panel aynı dosyayı farklı Projeye yazabilirdi.
  const kaynak = oku("../src/posta-govde.ts");
  for (const yasak of ["varlikBul", "projeKimligi", "anadizinBul", "node:fs"]) {
    assert.ok(!kaynak.includes(yasak),
      `saf gövde kendi kök aramasını kurmuş: ${yasak}`);
  }
});

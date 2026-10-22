// ═══════════════════════════════════════════════════════════════════════════
// minigraf.test.ts — 🕸️ Tek proje grafı (düzenli ağaç) davranış sınamaları
// ═══════════════════════════════════════════════════════════════════════════

// Yüzey dili kapısını bu dosya kendi kurar: `npm test` ön-yüklemesi olmadan tek
// başına koşturulduğunda sahte kırmızı vermesin (ön-yükleme ile aynı bağ, ESM
// önbelleği yüzünden iki kez koşmaz).
import "./dil-kur.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { belirtecle } from "../../cekirdek/src/belirtec.ts";
import { ayristir } from "../../cekirdek/src/ayristirici.ts";
import type { Program } from "../../cekirdek/src/sozdizim.ts";
import { mevsimNormalize } from "../../cekirdek/src/denetci.ts";
import { dagKur, type Dag, type DagDugum } from "../../cekirdek/src/dag.ts";
import { MEYVE_SIMGESI_SVG,
  projeGrafiCikar, projeGrafiAgaci, agacYerlesimi, bagYerlesimi, cizilecekBaglar, SERIT_EN_COK_SUTUN, SATIR_YUKSEKLIGI, KADEME_GIRINTISI, miniGrafHtml, bosHtml, temaDegiskeni, tipSimgesi,
} from "../src/minigraf-cekirdek.ts";
import { GOMULU_KAYIT } from "../src/gomulu-kanon.ts";
import { fazYolu, planYolu } from "../../cekirdek/sinama/dogus-agaci.ts";

// Fikstür düğümlerinin dosyaları doğuşun ağacındaki yerlerdir; yollar paketin
// kendisinden türer (HST-MTR-A07).

function dagYap(dugumler: Array<Partial<DagDugum> & { kod: string }>): Dag {
  const m = new Map<string, DagDugum>();
  for (const d of dugumler) {
    m.set(d.kod, {
      tip: "Adım", dosya: `/p/${planYolu("a.sar")}`, satir: 1, sutun: 1,
      oncekiler: [], sonrakiler: [], ...d,
    } as DagDugum);
  }
  return { dugumler: m, kopuk: [], oz: [], disProje: [] };
}

test("projeGrafiCikar: Faz→Blok→Katman→AltKatman→Adım tek grafta ve ayrı raylarda", () => {
  const dag = dagYap([
    { kod: "F", tip: "Faz", ad: "temel" },
    { kod: "B", tip: "Blok", kapsayan: "F", ad: "motor" },
    { kod: "K", tip: "Katman", kapsayan: "B", ad: "graf" },
    { kod: "AK", tip: "AltKatman", kapsayan: "K", ad: "çizim" },
    { kod: "A", tip: "Adım", kapsayan: "AK", ad: "cam mercek", durum: "beklemede" },
    { kod: "X", tip: "Sözleşme", ad: "grafta rayı olmayan tip" },
  ]);
  const graf = projeGrafiCikar(dag);
  assert.deepEqual(graf.dugumler.map((d) => d.kod), ["F", "B", "K", "AK", "A"]);
  assert.deepEqual(graf.dugumler.map((d) => d.derinlik), [0, 1, 2, 3, 4]);
  assert.deepEqual(graf.dugumler.map((d) => d.ustKod), [undefined, "F", "B", "K", "AK"]);
});

// VIT-GRAF-A12: Teknoloji ile Takım artık grafta yaşar ve İKİSİ DE KÖKTÜR.
// Bunlar kapsayıcıların üstünde durduğu ZEMİNDİR; hiçbir şeyin altında değildirler,
// bu yüzden Faz ile aynı raya, sıfırıncı kademeye otururlar.
test("projeGrafiCikar: Teknoloji ile Takım grafta kök olarak yaşar", () => {
  const graf = projeGrafiCikar(dagYap([
    { kod: "F", tip: "Faz", ad: "temel" },
    { kod: "TEK", tip: "Teknoloji", ad: "typescript" },
    { kod: "TKM", tip: "Takım", ad: "motor takımı" },
  ]));
  assert.deepEqual(graf.dugumler.map((d) => d.kod).sort(), ["F", "TEK", "TKM"]);
  const zeminDugumleri = graf.dugumler.filter((d) => d.tip === "Teknoloji" || d.tip === "Takım");
  assert.deepEqual(zeminDugumleri.map((d) => d.derinlik), [0, 0], "zemin tipleri kök rayında durur");
  assert.deepEqual(zeminDugumleri.map((d) => d.ustKod), [undefined, undefined]);
});

test("projeGrafiCikar: bütün proje kalır; seçim yalnız işaretlenir ve gerçek bağlar taşınır", () => {
  const dag = dagYap([
    { kod: "A", durum: "tamamlandı", sonrakiler: ["B"] },
    { kod: "B", durum: "geliştirmede", oncekiler: ["A"], sonrakiler: ["C"] },
    { kod: "C", durum: "beklemede", oncekiler: ["B"] },
  ]);
  const graf = projeGrafiCikar(dag, "B");
  assert.deepEqual(graf.dugumler.map((d) => d.kod), ["A", "B", "C"]);
  assert.deepEqual(graf.dugumler.filter((d) => d.secili).map((d) => d.kod), ["B"]);
  assert.deepEqual(graf.baglar, [{ once: "A", sonra: "B", tur: "adım" }, { once: "B", sonra: "C", tur: "adım" }]);
});

test("kapsayıcı rengi YUZ-4 kanonik durum türetmesinden gelir", () => {
  const dag = dagYap([
    { kod: "B", tip: "Blok" },
    { kod: "A1", kapsayan: "B", durum: "tamamlandı" },
    { kod: "A2", kapsayan: "B", durum: "beklemede" },
  ]);
  const blok = projeGrafiCikar(dag).dugumler.find((d) => d.kod === "B")!;
  assert.equal(blok.durum, "geliştirmede"); // kısmi ilerleme = sürüyor = durum sarısı (YUZ-4.1)
});

test("projeGrafiAgaci: satır başına bir düğüm + durum noktası + kanon simgesi + tıkla→atla", () => {
  const dag = dagYap([
    { kod: "F", tip: "Faz", ad: "faz", dosya: "/p/f.sar", satir: 2 },
    { kod: "B", tip: "Blok", kapsayan: "F", ad: "blok" },
    { kod: "K", tip: "Katman", kapsayan: "B", ad: "katman" },
    { kod: "AK", tip: "AltKatman", kapsayan: "K", ad: "alt katman" },
    { kod: "A1", kapsayan: "AK", ad: "ilk", durum: "tamamlandı", sonrakiler: ["A2"] },
    { kod: "A2", kapsayan: "AK", ad: "ikinci", durum: "geliştirmede", oncekiler: ["A1"], dosya: "/p/a.sar", satir: 7 },
  ]);
  const html = projeGrafiAgaci(projeGrafiCikar(dag, "A2"));
  const css = miniGrafHtml(projeGrafiCikar(dag, "A2"));
  assert.equal([...html.matchAll(/class="dugum[ "]/g)].length, 6, "her düğüm kendi satırında olmalı");
  assert.ok(html.includes('class="dugum secili"'), "seçim grafı kesmeden işaretlenir");
  assert.ok(html.includes("class=gl"), "hiyerarşi L bağı");
  assert.match(html, /class="nokta d[tg]/, "durum noktası");
  assert.ok(html.includes("🌀") && html.includes("🪵") && html.includes("🌿") && html.includes("🍃"), "ikonlar TIP-0 kanonundan");
  assert.match(css, /\.dt\{--r:var\(--vscode-testing-iconPassed\)\}/, "tamamlandı yeşil");
  assert.match(css, /\.dg\{--r:var\(--vscode-charts-yellow\)\}/, "geliştirmede altın");
  assert.ok(html.includes("command:sarmal.dosyaAc?"));
  assert.ok(html.includes(encodeURIComponent(JSON.stringify(["/p/a.sar", 7]))));
  // Tip adı sağ sütunda, tam ad ipucunda durur.
  assert.match(html, /<span class=tip>Katman<\/span>/);
  assert.match(html, /<span class=tip>Alt katman<\/span>/);
  assert.match(html, /title="ikinci · A2\nAdım · geliştirmede\n/);
});

test("HTML: tek görünüm, betiksiz, gradyansız, :has() yok, tema renklerinden beslenir", () => {
  const html = miniGrafHtml(projeGrafiCikar(dagYap([
    { kod: "A", durum: "tamamlandı", sonrakiler: ["B"] },
    { kod: "B", durum: "beklemede", oncekiler: ["A"] },
  ])));
  assert.ok(!html.includes("MİNİ GRAF"), "görünüm başlığı zaten sekmede — iç başlık tekrarlanmaz");
  assert.match(html, /aria-label="düğüm">●<\/span>2/);
  assert.match(html, /aria-label="bağ">⎇<\/span>1/);
  assert.ok(!html.includes("<script"), "enableScripts:false disiplini");
  assert.ok(!html.includes("background:radial-gradient") && !html.includes("background:linear-gradient"),
    "sayfa arka planında gradyan yok");
  assert.ok(!html.includes("kip"), "kip/anahtar yok");
  assert.ok(!html.includes(":has("), "hover için pahalı :has() seçicisi üretilmemeli");
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(html), "ham renk değeri gömülmüş (YUZ-4.1 ihlali)");
  assert.ok(!html.includes("viewBox"), "SVG ölçeklemesi yok: yazı gerçek piksel boyundadır");
});

test("boş hâl kaçışlı ve tema-token çevirisi kararlı", () => {
  const bos = bosHtml(`<script>"x"</script>`);
  assert.ok(!bos.includes("<script>"));
  assert.equal(temaDegiskeni("sarmal.kenar"), "var(--vscode-sarmal-kenar)");
});

// ── 🔭 ODAK SÜZGECİ — graf yalnız odaktaki varlığı gösterir ──────────────────
//   Founder canlı bulgusu 2026-07-28: bir Sarmal dosyasına bakarken grafta
//   kapalı ürün düğümleri de görünüyordu. Süzgeç düğümün geldiği DOSYAYA sorulur
//   ve üç tanı yüzeyinin kullandığı kapının aynısıdır.

/** İki bağımsız varlığın düğümlerini taşıyan gerçek biçimli graf. */
function ikiVarlikliDag(): Dag {
  return dagYap([
    { kod: "S-FAZ", tip: "Faz", ad: "sarmal temel", dosya: `/depo/_Sarmal/${fazYolu(1, "omurga")}` },
    { kod: "S-BLK", tip: "Blok", kapsayan: "S-FAZ", ad: "motor", dosya: `/depo/_Sarmal/${fazYolu(1, "omurga")}` },
    { kod: "S-A1", tip: "Adım", kapsayan: "S-BLK", ad: "sarmal adımı", durum: "beklemede",
      dosya: `/depo/_Sarmal/${fazYolu(1, "omurga")}`, sonrakiler: ["S-A2"] },
    { kod: "S-A2", tip: "Adım", kapsayan: "S-BLK", ad: "sarmal ikinci", durum: "beklemede",
      dosya: `/depo/_Sarmal/${fazYolu(1, "omurga")}`, oncekiler: ["S-A1"] },
    { kod: "N-FAZ", tip: "Faz", ad: "os temel", dosya: `/depo/_KapaliUrun/${fazYolu(1, "kadro")}` },
    { kod: "N-A1", tip: "Adım", kapsayan: "N-FAZ", ad: "os adımı", durum: "beklemede",
      dosya: `/depo/_KapaliUrun/${fazYolu(1, "kadro")}` },
  ]);
}

/** Aktif varlık kapsam süzgeci — eklentideki panelDeGorunur kapısının ikizi. */
const varliktaMi = (kok: string) => (dosya: string): boolean => dosya.startsWith(kok + "/");

test("odak süzgeci: graf YALNIZ odaktaki varlığın düğümlerini basar", () => {
  const dag = ikiVarlikliDag();
  const sarmal = projeGrafiCikar(dag, "", varliktaMi("/depo/_Sarmal"));
  assert.deepEqual(sarmal.dugumler.map((d) => d.kod), ["S-FAZ", "S-BLK", "S-A1", "S-A2"],
    "odaktaki varlığın dışındaki düğümler grafa sızmamalıydı");
  assert.ok(!sarmal.dugumler.some((d) => d.dosya.includes("_KapaliUrun")),
    "öteki varlığın dosyasından gelen düğüm görünüyor");
});

test("odak süzgeci: odak öteki varlığa geçince graf o varlığı gösterir", () => {
  const dag = ikiVarlikliDag();
  const os = projeGrafiCikar(dag, "", varliktaMi("/depo/_KapaliUrun"));
  assert.deepEqual(os.dugumler.map((d) => d.kod), ["N-FAZ", "N-A1"]);
  assert.equal(os.baglar.length, 0, "öteki varlığın bağları bu varlığın grafına taşınmamalı");
});

test("odak süzgeci: kapsam dışı düğümün bağımlılık kenarı da düşer, kapsam içi kenar kalır", () => {
  const dag = dagYap([
    { kod: "IC-1", dosya: `/depo/_Sarmal/${planYolu("a.sar")}`, sonrakiler: ["IC-2", "DIS-1"] },
    { kod: "IC-2", dosya: `/depo/_Sarmal/${planYolu("a.sar")}`, oncekiler: ["IC-1"] },
    { kod: "DIS-1", dosya: `/depo/_KapaliUrun/${planYolu("b.sar")}`, oncekiler: ["IC-1"] },
  ]);
  const graf = projeGrafiCikar(dag, "", varliktaMi("/depo/_Sarmal"));
  assert.deepEqual(graf.baglar, [{ once: "IC-1", sonra: "IC-2", tur: "adım" }]);
});

test("odak süzgeci verilmezse davranış değişmez: bütün çalışma alanı görünür", () => {
  const graf = projeGrafiCikar(ikiVarlikliDag());
  assert.equal(graf.dugumler.length, 6, "süzgeçsiz çağrı bugünküyle aynı grafı vermeli");
});

// ── ☘️ TİP SİMGESİ — Katman ile AltKatman bakışta ayrılır ────────────────────
//   Founder canlı bulgusu 2026-07-28: ikisi de aynı yaprak simgesini taşıyordu,
//   bu yüzden grafta hangisinin dal hangisinin ufak dal olduğu anlaşılmıyordu.
//   Simge kanonik kayıttan gelir; koda gömülü ikinci bir çizelge yoktur.

test("kanon simgeleri tekildir: iki tip aynı simgeyi paylaşamaz", () => {
  const simgeler = (GOMULU_KAYIT as { tipSimgeleri: Record<string, string> }).tipSimgeleri;
  const sahipler = new Map<string, string[]>();
  for (const [tip, simge] of Object.entries(simgeler)) {
    sahipler.set(simge, [...(sahipler.get(simge) ?? []), tip]);
  }
  const paylasan = [...sahipler.entries()].filter(([, tipler]) => tipler.length > 1);
  assert.deepEqual(paylasan, [],
    `aynı simgeyi paylaşan tipler var: ${paylasan.map(([s, t]) => `${s} → ${t.join(", ")}`).join(" · ")}`);
});

test("kanon simgeleri emoji takma adlarıyla aynı: bir kavram tek işaret taşır", () => {
  const simgeler = (GOMULU_KAYIT as { tipSimgeleri: Record<string, string> }).tipSimgeleri;
  const takmaAdlar = (GOMULU_KAYIT as { emojiYazimi: { tipler: Record<string, string> } })
    .emojiYazimi.tipler;
  for (const [simge, tip] of Object.entries(takmaAdlar)) {
    if (!(tip in simgeler)) continue;
    assert.equal(simgeler[tip], simge,
      `"${tip}" tipi iki yüzde iki ayrı simge taşıyor: kayıtta ${simgeler[tip]}, takma adda ${simge}`);
  }
});

test("Katman ile AltKatman grafta GÖRSEL OLARAK ayrılır", () => {
  const dag = dagYap([
    { kod: "K", tip: "Katman", ad: "dal" },
    { kod: "AK", tip: "AltKatman", kapsayan: "K", ad: "ufak dal" },
  ]);
  const svg = projeGrafiAgaci(projeGrafiCikar(dag));
  const simgeler = (GOMULU_KAYIT as { tipSimgeleri: Record<string, string> }).tipSimgeleri;
  assert.notEqual(simgeler.Katman, simgeler.AltKatman,
    "Katman ile AltKatman kanonda hâlâ aynı simgeyi taşıyor");
  assert.ok(svg.includes(simgeler.Katman), "Katman simgesi grafta yok");
  assert.ok(svg.includes(simgeler.AltKatman), "AltKatman simgesi grafta yok");
});

// ── 🕸️ VIT-GRAF-A12 — ZEMİN kenarı ile MEYVE düğümleri ──────────────────────
//   Founder 2026-07-28 gözden geçirmesi: Katmanların bağları ve Adımların
//   ürettiği meyveler grafta hiç görünmüyordu. İkisi de saklı graftan okunur;
//   yeni tarama, yeni ayrıştırma ya da dış kütüphane yoktur.

/** Bir Katmanın zemin bağını ve bir Adımın meyvelerini taşıyan gerçek biçimli graf. */
function zeminliDag(): Dag {
  return dagYap([
    { kod: "TKM", tip: "Takım", ad: "motor takımı" },
    { kod: "F", tip: "Faz", ad: "temel" },
    { kod: "K", tip: "Katman", kapsayan: "F", ad: "graf katmanı", zemin: ["TKM"] },
    { kod: "A1", tip: "Adım", kapsayan: "K", ad: "ilk", durum: "geliştirmede",
      üretiyor: ["KOD-VAR", "KOD-YOK"] },
    { kod: "A2", tip: "Adım", kapsayan: "K", ad: "ikinci", durum: "beklemede",
      üretiyor: ["KOD-OTEKI"] },
    { kod: "KOD-VAR", tip: "Kod", ad: "diskteki", beyanYolu: "src/var.ts", üretenler: ["A1"] },
    { kod: "KOD-YOK", tip: "Kod", ad: "beyandaki", beyanYolu: "src/yok.ts", üretenler: ["A1"] },
    { kod: "KOD-OTEKI", tip: "Kod", ad: "öteki", beyanYolu: "src/oteki.ts", üretenler: ["A2"] },
  ]);
}

/** Meyve kapısının fikstürü — yalnız "src/var.ts" ile "src/oteki.ts" diskte vardır. */
const diskte = (yol: string): boolean => yol === "src/var.ts" || yol === "src/oteki.ts";

test("N4 · zemin kenarı ile adım kenarı veride AYRI SINIFTIR", () => {
  const graf = projeGrafiCikar(dagYap([
    { kod: "TKM", tip: "Takım", ad: "takım" },
    { kod: "K", tip: "Katman", ad: "katman", zemin: ["TKM"] },
    { kod: "A1", tip: "Adım", kapsayan: "K", ad: "ilk", sonrakiler: ["A2"] },
    { kod: "A2", tip: "Adım", kapsayan: "K", ad: "ikinci", oncekiler: ["A1"] },
  ]));
  // ① Sınıf VERİDE taşınır — çizim onu tahmin etmez.
  assert.deepEqual(graf.baglar.find((b) => b.once === "TKM"), { once: "TKM", sonra: "K", tur: "zemin" });
  assert.deepEqual(graf.baglar.find((b) => b.once === "A1"), { once: "A1", sonra: "A2", tur: "adım" });

});

test("N4c · kenar sınıfı KAYNAĞIN TİPİNDEN doğar: `oncekiler`'den gelen zemin bağı da kesiklidir", () => {
  // ÖLÇÜLMÜŞ KUSUR (2026-07-29 · üretici bildirimi): Teknoloji ile Takım grafa
  // girdiğinde `oncekiler` üzerinden gelen 571 kenar `adım` sınıfına düşüyordu.
  // Sebebi genislet()'tir — kapsayıcının Takım/Teknoloji bağını yaprak Adımlara
  // AÇAR, dolayısıyla her yaprak Adımın `oncekiler` listesinde bir zemin düğümü
  // durur. Sonuç, aynı ilişkinin iki farklı cümleyle anlatılmasıydı: bir kısmı
  // kesikli dirsek (zemin), bir kısmı yumuşak eğri (yürütme sırası). Oysa ölçüm
  // bu kenarın hiç sıra taşımadığını söylüyor — kapsayıcı hedeflerinin tamamı
  // Takım ya da Teknolojidir ve Katman→Katman hedefi sıfırdır.
  const graf = projeGrafiCikar(dagYap([
    { kod: "TEK", tip: "Teknoloji", ad: "teknoloji" },
    { kod: "K", tip: "Katman", ad: "katman" },
    // genislet()'in ürettiği hâl: zemin düğümü YAPRAK ADIMIN oncekiler'inde durur.
    { kod: "A1", tip: "Adım", kapsayan: "K", ad: "ilk", oncekiler: ["TEK"] },
    { kod: "A2", tip: "Adım", kapsayan: "K", ad: "ikinci", oncekiler: ["A1", "TEK"] },
  ]));
  const bag = (once: string, sonra: string) =>
    graf.baglar.find((b) => b.once === once && b.sonra === sonra);

  // ① Kaynağı zemin tipi olan kenar, `oncekiler`'den gelse bile ZEMİN sınıfındadır.
  assert.equal(bag("TEK", "A1")?.tur, "zemin",
    "Teknoloji kaynaklı kenar yürütme eğrisi sayılmış; zemin olmalıydı");
  assert.equal(bag("TEK", "A2")?.tur, "zemin",
    "Teknoloji kaynaklı ikinci kenar da zemin olmalıydı");
  // ② Gerçek yürütme kenarı ETKİLENMEZ — düzeltme fazla süpürmüyor.
  assert.equal(bag("A1", "A2")?.tur, "adım",
    "Adım→Adım kenarı zemine kaymış; düzeltme gerçek yürütme sırasını yuttu");
  // ③ Sınıf kaynağın tipinden türer, hedefin tipinden DEĞİL: aynı hedefe (A2)
  //    giden iki kenar farklı sınıflardadır.
  assert.notEqual(bag("TEK", "A2")?.tur, bag("A1", "A2")?.tur,
    "aynı hedefe giden zemin ve yürütme kenarları aynı sınıfa düşmüş");
});

test("N5 · meyve SATIRI yalnız seçili Adımın altında açılır; seçilmeyenin SAYACI yine görünür", () => {
  const dag = zeminliDag();
  const secili = projeGrafiCikar(dag, "A1", () => true, diskte);
  assert.deepEqual(secili.dugumler.map((d) => d.kod),
    ["TKM", "F", "K", "A1", "KOD-VAR", "KOD-YOK", "A2"],
    "seçili Adımın meyveleri hemen altında ayrı kademede olmalı");
  const meyve = secili.dugumler.filter((d) => d.derinlik === 5);
  assert.deepEqual(meyve.map((d) => d.ustKod), ["A1", "A1"], "meyvenin üstü onu ÜRETEN Adımdır");

  // ASIL NÖBET: seçilmeyen Adımın meyvesi SATIR OLMAZ ama sayacı yaşar.
  assert.ok(!secili.dugumler.some((d) => d.kod === "KOD-OTEKI"),
    "seçilmeyen Adımın meyvesi grafa satır olarak girmiş — graf kalabalıklaşır");
  assert.equal(secili.dugumler.find((d) => d.kod === "A2")!.meyveSayisi, 1,
    "seçilmeyen Adımın meyve sayacı kaybolmuş");

  // Seçim değişince satırlar öteki Adıma taşınır; hiçbiri kalıcı değildir.
  const oteki = projeGrafiCikar(dag, "A2", () => true, diskte);
  assert.ok(oteki.dugumler.some((d) => d.kod === "KOD-OTEKI"));
  assert.ok(!oteki.dugumler.some((d) => d.kod === "KOD-VAR"));
});

test("N6 · beyan edilmiş ama diskte olmayan meyve BOŞ NOKTA çizilir", () => {
  const graf = projeGrafiCikar(zeminliDag(), "A1", () => true, diskte);
  const var_ = graf.dugumler.find((d) => d.kod === "KOD-VAR")!;
  const yok = graf.dugumler.find((d) => d.kod === "KOD-YOK")!;
  assert.equal(var_.diskte, true, "kapı true dedi, düğüm dolu sayılmalı");
  assert.equal(yok.diskte, false, "kapı false dedi, düğüm boş sayılmalı");

  const html = projeGrafiAgaci(graf);
  const satirlar = html.split(/(?=<(?:a|div) class="dugum)/).filter((x) => /^<(a|div) class="dugum/.test(x));
  const satir = (kod: string): string => satirlar[graf.dugumler.findIndex((d) => d.kod === kod)];
  // ASIL NÖBET: yokluk doluluk gibi görünmez — boş meyvenin noktası içi boştur.
  assert.ok(satir("KOD-YOK").includes("nokta bos"), "boş meyvenin noktası ayrı işaret taşımıyor");
  assert.ok(satir("KOD-VAR").includes('class="nokta') && !satir("KOD-VAR").includes("nokta bos"));
  const css = miniGrafHtml(graf);
  assert.match(css, /\.nokta\.bos::before\{[^}]*background:transparent[^}]*dashed/, "boş noktanın kesik çerçevesi yok");
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(css), "ham renk değeri gömülmüş (YUZ-4.1 ihlali)");
});

test("N7 · Adım alt yazısı eksik meyveyi SEÇİM OLMADAN bildirir", () => {
  // Hiçbir Adım seçili DEĞİL — buna rağmen sayaç ve eksik bildirimi görünmeli.
  const graf = projeGrafiCikar(zeminliDag(), "", () => true, diskte);
  const a1 = graf.dugumler.find((d) => d.kod === "A1")!;
  assert.equal(a1.meyveSayisi, 2);
  assert.equal(a1.eksikMeyve, 1, "eksik meyve seçim yokken de sayılmalı");
  assert.equal(graf.dugumler.find((d) => d.kod === "A2")!.eksikMeyve, 0);
  assert.ok(!graf.dugumler.some((d) => d.derinlik === 5), "seçim yokken meyve satırı açılmamalı");

  const svg = projeGrafiAgaci(graf);
  assert.ok(svg.includes(`<span class=rozet title="2 meyve">${MEYVE_SIMGESI_SVG}2</span>`), "meyve sayacı satırda yok");
  assert.ok(!svg.includes("🍎"), "meyve sayacı emoji taşımaz (Founder 2026-10-22)");
  assert.ok(svg.includes('<span class="rozet eksik">1 diskte yok</span>'), "eksik meyve seçim olmadan bildirilmiyor");
});

test("N7b · meyve satırının alt yazısı tipini ve BEYAN EDİLEN yolunu söyler", () => {
  const svg = projeGrafiAgaci(projeGrafiCikar(zeminliDag(), "A1", () => true, diskte));
  assert.ok(svg.includes("Kod · src/yok.ts"), "meyve alt yazısı beyan yolunu göstermiyor");
  assert.ok(svg.includes("Kod · src/var.ts"));
});

test("N8 · simge KANONDAN gelir: koda gömülü ikinci bir çizelge yoktur", () => {
  const kayit = GOMULU_KAYIT as unknown as {
    tipSimgeleri: Record<string, string>;
    aileSimgeleri: Record<string, string>;
  };
  const kanonSimgeleri = new Set([
    ...Object.values(kayit.tipSimgeleri), ...Object.values(kayit.aileSimgeleri),
  ]);
  // İki kademe: tipin kendi simgesi, yoksa AİLE simgesi. İkisi de kanondadır.
  assert.equal(tipSimgesi("Katman"), kayit.tipSimgeleri.Katman);
  assert.equal(tipSimgesi("Kod"), kayit.aileSimgeleri.urun, "meyve rolü ürün ailesinin simgesini taşır");
  assert.equal(tipSimgesi("Veri"), kayit.aileSimgeleri.urun);
  assert.equal(tipSimgesi("Teknoloji"), kayit.aileSimgeleri.teknoloji);
  assert.equal(tipSimgesi("Takım"), kayit.aileSimgeleri.teknoloji);

  // ASIL NÖBET: grafta basılan HER simge kanonda karşılığı olan bir işarettir.
  // Koda gömülü bir çizelge kanonla sessizce ayrışır ve bu nöbet onu yakalar.
  const svg = projeGrafiAgaci(projeGrafiCikar(zeminliDag(), "A1", () => true, diskte));
  const basilanlar = [...svg.matchAll(/<span class=simge>([^<]*)<\/span>/g)].map((m) => m[1]);
  assert.ok(basilanlar.length >= 7, `beklenenden az simge basıldı: ${basilanlar.length}`);
  for (const s of basilanlar) {
    assert.ok(kanonSimgeleri.has(s),
      `grafta kanonda olmayan bir simge basıldı: ${s} — koda gömülü ikinci bir çizelge var`);
  }
});

test("N8b · ALT YAZI kanalının simgesi de kanondan gelir; kaynakta gömülü emoji yoktur", () => {
  // ÖLÇÜLMÜŞ KUSUR (2026-07-29 · bağımsız denetim): N8 yalnız `<text class="simge">`
  // damgalarını denetliyordu, alt yazı kanalına bakmıyordu. Meyve sayacının simgesi
  // koda gömülüydü. Kanondaki `aileSimgeleri.urun` değeri değiştirildiğinde mercek
  // yeni simgeye geçiyor, sayaç eskisinde kalıyordu — aynı satır aynı kavramı iki
  // ayrı işaretle anlatıyordu ve üç yüz kırk dokuz sınamanın tamamı yeşil kalıyordu.
  const kayit = GOMULU_KAYIT as unknown as { aileSimgeleri: Record<string, string> };
  const urunSimgesi = kayit.aileSimgeleri.urun;

  // ① DAVRANIŞ: Founder 2026-10-22 hükmüyle arayüzde emoji kalmaz; sayaç kanonun ürün
  //    emojisini artık TAŞIMAZ (ağaçta geometrik Meyve işareti, metin kanalında sözcük).
  const graf = projeGrafiCikar(zeminliDag(), "", () => true, diskte);
  const svg = projeGrafiAgaci(graf);
  assert.ok(!svg.includes(`${urunSimgesi} 2`) && /2 meyve/.test(svg),
    `meyve sayacı emoji (${urunSimgesi}) yerine işaret ya da sözcük taşımalı`);

  // ② ASIL NÖBET — KAYNAK: alt yazı üretecinde gömülü emoji BULUNMAMALI. Davranış
  //    nöbeti tek başına yetmez, çünkü gömülü değer kanondakiyle bugün EŞİTTİR ve
  //    eşit olduğu sürece davranış nöbeti yeşil kalır. Ayrışma ancak kanon
  //    değiştiğinde doğar; o günü beklemek yerine kaynağı ölçüyoruz.
  const kaynak = readFileSync(
    fileURLToPath(new URL("../src/minigraf-cekirdek.ts", import.meta.url)), "utf8");
  const govde = /function dugumAltYazisi[\s\S]*?\n}/.exec(kaynak)?.[0];
  assert.ok(govde, "dugumAltYazisi gövdesi bulunamadı — nöbet ölçemez hâle geldi");
  const kodSatirlari = govde!.split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l));
  const gomulu = kodSatirlari.filter((l) => /\p{Extended_Pictographic}/u.test(l));
  assert.deepEqual(gomulu, [],
    `alt yazı üretecinin KOD satırlarında gömülü emoji var; simge kanondan okunmalı:\n${gomulu.join("\n")}`);
});

test("N9 · GİRİNTİ: hiyerarşi kademe başına sabit girintiyle okunur", () => {
  const graf = projeGrafiCikar(zeminliDag(), "A1", () => true, diskte);
  const yerlesim = agacYerlesimi(graf);
  assert.equal(yerlesim.length, graf.dugumler.length, "her düğüm bir satır almalı");
  // ① Girinti ata zincirinden türer: çocuk, atasından tam bir kademe sağdadır.
  const girinti = new Map(yerlesim.map((s) => [s.kod, s.girinti]));
  for (const d of graf.dugumler) {
    if (!d.ustKod) assert.equal(girinti.get(d.kod), 0, `${d.kod} kök olduğu hâlde girintili`);
    else assert.equal(girinti.get(d.kod), girinti.get(d.ustKod)! + 1, `${d.kod} atasının bir kademe sağında değil`);
  }
  // ② Bağ kolu sayısı girintiye eşittir ve son hücre düğümün kendi dirseğidir.
  for (const s of yerlesim) {
    assert.equal(s.kollar.length, s.girinti, `${s.kod} kol sayısı girintiyle uyuşmuyor`);
    if (s.girinti > 0) assert.ok(["l", "t"].includes(s.kollar[s.girinti - 1]), `${s.kod} dirseği yok`);
  }
  // ③ L yalnız son kardeşte, T öbürlerinde: A1 (ilk) T, A2 (son) L.
  const kol = (kod: string) => yerlesim.find((s) => s.kod === kod)!.kollar.at(-1);
  assert.equal(kol("A1"), "t");
  assert.equal(kol("A2"), "l");
  assert.equal(kol("KOD-VAR"), "t");
  assert.equal(kol("KOD-YOK"), "l");
  // ④ Son kardeşin altındaki satırlarda atanın dikey çizgisi SÜRMEZ, değilse sürer.
  const meyve = yerlesim.find((s) => s.kod === "KOD-VAR")!;
  assert.equal(meyve.kollar[meyve.girinti - 2], "i", "A1'in sonraki kardeşi (A2) var: dikey çizgi sürmeli");
  // ⑤ CSS girintiyi ve L çizgilerini tanımlar; çizgi ince ve tema renklidir.
  const html = miniGrafHtml(graf);
  assert.ok(html.includes(`--g:${KADEME_GIRINTISI}px`));
  assert.match(html, /\.gl::before\{bottom:50%\}/);
  assert.match(html, /--iz:var\(--vscode-tree-indentGuidesStroke,var\(--vscode-panel-border\)\)/);
  assert.match(html, /border-left:1px solid var\(--iz\)/, "bağ çizgisi ince değil");
  assert.ok(!/stroke-width:(?:[2-9]|1\.[7-9])/.test(html) && !html.includes("kapsama"), "kalın gövde çizgisi kalkmış olmalı");
});

test("N10 · ÇAKIŞMAZLIK: her düğüm kendi satırındadır, y aralıkları örtüşmez", () => {
  // FOUNDER EKRAN GÖRÜNTÜSÜ BULGUSU: dar panelde etiketler üst üste biniyor ve
  // okunmuyordu. Satır yüksekliği sabittir ve satırlar boşluksuz dizilir.
  const dallar = Array.from({ length: 40 }, (_, i) => ({
    kod: `A${i}`, kapsayan: "AK", ad: `adım numara ${i} ve oldukça uzun bir ad`, durum: "beklemede" as const,
  }));
  const graf = projeGrafiCikar(dagYap([
    { kod: "F", tip: "Faz", ad: "faz" },
    { kod: "B", tip: "Blok", kapsayan: "F", ad: "blok" },
    { kod: "K", tip: "Katman", kapsayan: "B", ad: "katman" },
    { kod: "AK", tip: "AltKatman", kapsayan: "K", ad: "alt katman" },
    ...dallar,
  ]), "A5");
  const yerlesim = agacYerlesimi(graf);
  assert.equal(yerlesim.length, 44);
  for (let i = 0; i < yerlesim.length; i++) {
    assert.equal(yerlesim[i].yukseklik, SATIR_YUKSEKLIGI);
    assert.ok(yerlesim[i].yukseklik >= 24 && yerlesim[i].yukseklik <= 28, "satır yüksekliği 24-28 px aralığında olmalı");
    for (let j = i + 1; j < yerlesim.length; j++) {
      const a = yerlesim[i], b = yerlesim[j];
      assert.ok(a.y + a.yukseklik <= b.y || b.y + b.yukseklik <= a.y,
        `${a.kod} ile ${b.kod} satırlarının y aralığı örtüşüyor`);
    }
  }
  // HTML tarafı: satır tek satıra zorlanır, ad üç nokta ile kesilir, yükseklik CSS'te sabittir.
  const html = miniGrafHtml(graf);
  assert.match(html, /\.dugum\{[^}]*height:var\(--sat\)/, "satır yüksekliği sabit değil");
  assert.match(html, /\.dugum\{[^}]*white-space:nowrap/, "satır tek satıra zorlanmıyor");
  assert.match(html, /\.ad\{[^}]*overflow:hidden;text-overflow:ellipsis/, "uzun ad üç nokta ile kesilmiyor");
  assert.match(html, /--sat:26px/);
  // Tam ad ipucunda durur (CSS kesse bile).
  assert.ok(html.includes("adım numara 5 ve oldukça uzun bir ad · A5"), "tam ad ipucunda yok");
  // Her satır ayrı bir öğedir: satır sayısı düğüm sayısına eşit.
  assert.equal([...html.matchAll(/class="dugum[ "]/g)].length, 44);
});

test("N11 · OKUNURLUK: yazı gerçek piksel boyundadır; dar panelde tip sütunu ilk gizlenir; klavye odağı görünür", () => {
  const html = miniGrafHtml(projeGrafiCikar(zeminliDag(), "A1", () => true, diskte));
  const boyut = (sinif: string): number =>
    +(new RegExp(`\\.${sinif}\\{[^}]*font-size:(\\d+)px`).exec(html)?.[1] ?? "0");
  assert.match(html, /body\{[^}]*font-family:var\(--vscode-font-family\);font-size:12px/, "ad yazısı 12 px arayüz yazı tipinde değil");
  assert.ok(boyut("tip") >= 10 && boyut("tip") <= 11, "tip adı yaklaşık 10 px olmalı");
  assert.match(html, /@media \(max-width:\d+px\)\{\.tip\{display:none\}\}/, "dar panelde tip sütunu gizlenmiyor");
  assert.match(html, /\.dugum:focus-visible\{outline:1px solid var\(--vscode-focusBorder\)/, "klavye odağı görünmüyor");
  assert.match(html, /<a class="dugum[^"]*"[^>]*href="command:sarmal\.dosyaAc\?/, "satır tıklanabilir bağ olarak kalmalı");
  // Açık temada da okunur: renkler yalnız tema değişkenlerinden gelir.
  assert.match(html, /\.tip\{[^}]*color:var\(--vscode-descriptionForeground\)/);
  assert.match(html, /\.dugum\.secili\{background:var\(--vscode-list-inactiveSelectionBackground\)/);
});

// ── 🍎 VIT-GRAF-A12 · ÜÇÜNCÜ KENAR SINIFI: ÜRETİM KÖKENİ ─────────────────────
//   Kanon dayanağı ORK-1 ve YUZ-3.2: `üretir` yalnız Adım→Meyve üretim kökeni içindir
//   ve mimari sarma bağı diye yeniden etiketlenmez. Sınıf veride taşınır; ağaçta
//   meyve, üreten Adımın çocuk satırı olarak girintiyle okunur.

/** Bir Adımın iki meyvesini ve bir Katmanın zemin bağını taşıyan fikstür. */
function uretimliDag(): Dag {
  return dagYap([
    { kod: "TKM", tip: "Takım", ad: "takım" },
    { kod: "F", tip: "Faz", ad: "faz" },
    { kod: "K", tip: "Katman", kapsayan: "F", ad: "katman", zemin: ["TKM"] },
    { kod: "A1", tip: "Adım", kapsayan: "K", ad: "üreten adım", durum: "geliştirmede",
      üretiyor: ["KOD-VAR", "KOD-YOK"] },
    { kod: "KOD-VAR", tip: "Kod", ad: "diskteki", beyanYolu: "src/var.ts", üretenler: ["A1"] },
    { kod: "KOD-YOK", tip: "Kod", ad: "beyandaki", beyanYolu: "src/yok.ts", üretenler: ["A1"] },
  ]);
}

test("N12 · üretim kökeni KENDİ kenar sınıfında doğar; meyve kapsama rayına ASILMAZ", () => {
  const graf = projeGrafiCikar(uretimliDag(), "A1", () => true, (y) => y === "src/var.ts");

  // ① SINIF VERİDE TAŞINIR (ORK-1.3): kenar Adımdan Meyveye yönelir ve `üretir`
  //    sınıfındadır; çizim onu satırın yerinden tahmin etmez.
  const uretir = graf.baglar.filter((b) => b.tur === "üretir");
  assert.deepEqual(uretir, [
    { once: "A1", sonra: "KOD-VAR", tur: "üretir" },
    { once: "A1", sonra: "KOD-YOK", tur: "üretir" },
  ], "meyve kenarı `üretir` sınıfıyla veriye girmemiş");

  // ② İZLENEBİLİRLİK: her meyve satırının tam olarak BİR üreten Adımı vardır ve o
  //    Adım kenarın kaynak ucunda durur; kullanıcı meyvenin hangi Adımdan doğduğunu
  //    grafta okur.
  for (const m of graf.dugumler.filter((d) => d.derinlik === 5)) {
    const gelen = graf.baglar.filter((b) => b.tur === "üretir" && b.sonra === m.kod);
    assert.equal(gelen.length, 1, `${m.kod} meyvesinin üretim kökeni kenarı tekil değil`);
    assert.equal(gelen[0].once, m.ustKod, "üretim kenarının kaynağı üreten Adım değil");
  }

  // ③ KAPSAMA DİLİ: meyve satırı Adımın çocuğudur ve ağaçta Adımın altında,
  //    bir kademe sağda durur; üretim kökeni veride kendi sınıfında kalır.
  const yerlesim = agacYerlesimi(graf);
  const girinti = (kod: string) => yerlesim.find((s) => s.kod === kod)!.girinti;
  assert.equal(girinti("KOD-VAR"), girinti("A1") + 1, "meyve üreten Adımın bir kademe altında değil");
  assert.equal(girinti("KOD-YOK"), girinti("A1") + 1);
});

// ── 🪵 VIT-GRAF-A12 · ZEMİN YİNELEMESİNİN KIRPILMASI ────────────────────────
//   Founder kabul metni Katman kenarlarının "Adım kenarlarından ayırt edilmesini"
//   ister. ÖLÇÜLMÜŞ KUSUR (2026-08-08 · canlı korpus, _Sarmal odağı): grafta 423
//   zemin kenarı çiziliyordu ve bunların 335'i bir ADIM satırında bitiyordu, 331'i
//   ise bir ATANIN zaten söylediği cümleyi yineliyordu. Sebep genislet()'tir:
//   bir Katman "şu teknolojinin üstünde duruyorum" dediğinde motor kenarı Katmanın
//   BÜTÜN yaprak Adımlarına açar. Sonuç, Katmanın kendi cümlesinin yaprak
//   kopyalarının altında kaybolmasıydı. Kırpma kayıpsızdır: ata kenarı yerinde
//   kalır ve yaprak zaten kapsama rayıyla o ataya bağlıdır.

test("N13 · zemin kenarı BEYAN KADEMESİNDE çizilir; yaprak yinelemesi kırpılır", () => {
  const graf = projeGrafiCikar(dagYap([
    { kod: "TEK", tip: "Teknoloji", ad: "typescript" },
    { kod: "F", tip: "Faz", ad: "faz" },
    // K1 zemini KENDİ üstünde ilan eder; yaprakları genislet() artefaktı taşır.
    { kod: "K1", tip: "Katman", kapsayan: "F", ad: "ilan eden katman", zemin: ["TEK"] },
    { kod: "A1", tip: "Adım", kapsayan: "K1", ad: "ilk", oncekiler: ["TEK"], sonrakiler: ["A2"] },
    { kod: "A2", tip: "Adım", kapsayan: "K1", ad: "ikinci", oncekiler: ["TEK", "A1"] },
    // K2 hiçbir zemin ilan ETMEZ; altındaki Adım bağı KENDİ kademesinde beyan eder.
    { kod: "K2", tip: "Katman", kapsayan: "F", ad: "ilan etmeyen katman" },
    { kod: "A3", tip: "Adım", kapsayan: "K2", ad: "üçüncü", oncekiler: ["TEK"] },
  ]));
  const zemin = graf.baglar.filter((b) => b.tur === "zemin");

  // ① ASIL NÖBET: yaprak kopyaları düşer, Katmanın kendi cümlesi kalır.
  assert.deepEqual(zemin, [
    { once: "TEK", sonra: "A3", tur: "zemin" },
    { once: "TEK", sonra: "K1", tur: "zemin" },
  ], "zemin kenarı beyan kademesine indirgenmedi ya da fazla süpürüldü");

  // ② KIRPMA KAYIPSIZDIR: A1 ile A2 hâlâ K1 üzerinden TEK zeminine bağlıdır,
  //    çünkü kapsama rayı ikisini de K1'e bağlar.
  assert.equal(graf.dugumler.find((d) => d.kod === "A1")!.ustKod, "K1");
  assert.equal(graf.dugumler.find((d) => d.kod === "A2")!.ustKod, "K1");

  // ③ BEYAN KADEMESİNDEKİ KENAR KIRPILMAZ: A3'ün bağı atasında ikizi olmadığı
  //    için yerinde durur; kırpma "bütün Adım hedeflerini sil" değildir.
  assert.ok(zemin.some((b) => b.sonra === "A3"),
    "Adım kademesinde beyan edilmiş zemin bağı da silinmiş — kırpma fazla süpürüyor");

  // ④ YÜRÜTME KENARI ETKİLENMEZ: düzeltme gerçek sırayı yutmuyor.
  assert.deepEqual(graf.baglar.filter((b) => b.tur === "adım"),
    [{ once: "A1", sonra: "A2", tur: "adım" }]);
});

test("N14 · hover için `:has()` seçicisi üretilmez: kenar sayısı büyüse de maliyet değişmez", () => {
  // PERFORMANS DERSİ (2026-07-30 · "IDE'de kasma var"): `:has()` en pahalı CSS
  // seçicisidir. Düzenli ağaçta hover yalnız `.dugum:hover` düz seçicisidir.
  const dag = uretimliDag();
  for (const kod of ["", "A1"]) {
    const html = miniGrafHtml(projeGrafiCikar(dag, kod, () => true, () => true));
    assert.equal((html.match(/:has\(/g) ?? []).length, 0, "ağaç görünümü :has() seçicisi üretmemeli");
  }
});

// ── 🌀 VIT-GRAF-A12 · MEVSİM BAĞI — Blok kendi Faz'ının altında gruplanır ────
//   Founder bildirimi 2026-08-10 (gece ve gündüz vardiyası): bağını `mevsim:`
//   alanıyla ya da Faz'ın `çağır` listesiyle kuran Blok grafta köksüz görünüyordu
//   ve Faz satırları çocuksuz düz bir liste gibi duruyordu; iki mevsim yan yana
//   dururken bir Blokun hangisine bağlı olduğunu bakış ayırt edemiyordu. Ölçüm:
//   canlı korpusta 18 çağır kenarının (10 gerçek · 8 sanal) SIFIRI grafa
//   iniyordu ve 23 Blok kök rayında duruyordu. Motor bağı düğümün `mevsim`
//   alanına indirir; yerleşim Blok'u Faz'ının altına oturtur ve bağı kapsama
//   rayı çizer. Ayrı bir kenar sınıfı YOKTUR, çünkü motor üç yazımı (iç içe
//   geçme · çağır · mevsim:) tek kapsama kenarına normalize eder ve aynı olgu
//   iki görsel dille anlatılamaz (ORK-1).

/** GERÇEK FİKSTÜR: kaynak metin → belirteç → ayrıştır → mevsimNormalize → dagKur.
 *  İki mevsim, iki yazım: BLK-CAGRILI Faz'ın `çağır` listesiyle, BLK-MEVSIMLI
 *  kendi `mevsim:` alanıyla bağlanır — tıpkı canlı korpusta faz.sar ile
 *  yayin_yuzeyi.sar gibi. */
function mevsimliDagKur(): Dag {
  const programlar = new Map<string, Program>([
    [`/depo/_Sarmal/${fazYolu(1, "faz")}`, ayristir(belirtecle(
      'Faz( kod: FAZ-TEMMUZ, ad: "temmuz mevsimi" ) {\n  çağır BLK-CAGRILI\n}\n' +
      'Faz( kod: FAZ-AGUSTOS, ad: "ağustos mevsimi" ) {\n}\n'))],
    [`/depo/_Sarmal/${planYolu("cagrili.sar")}`, ayristir(belirtecle(
      'Blok( kod: BLK-CAGRILI, ne: "çağır listesiyle bağlı gövde" ) { Katman( kod: KAT-C, ad: "c katmanı" ) { Adım( kod: ADM-C, ne: "biten iş", durum: tamamlandı ) } }'))],
    [`/depo/_Sarmal/${planYolu("mevsimli.sar")}`, ayristir(belirtecle(
      'Blok( kod: BLK-MEVSIMLI, mevsim: FAZ-AGUSTOS, ne: "mevsim alanıyla bağlı gövde" ) { Katman( kod: KAT-M, ad: "m katmanı" ) { Adım( kod: ADM-M, ne: "bekleyen iş", durum: beklemede ) } }'))],
  ]);
  mevsimNormalize(programlar);
  return dagKur(programlar);
}

test("N15 · mevsim bağı MOTORDAN gelir: iki yazım da Blok'un mevsim alanına iner", () => {
  const dag = mevsimliDagKur();
  // ① Gerçek `çağır` yazımı ve `mevsim:` yazımı aynı alana normalize olur.
  assert.equal(dag.dugumler.get("BLK-CAGRILI")!.mevsim, "FAZ-TEMMUZ",
    "Faz'ın çağır listesiyle kurulan bağ Dag'a inmedi");
  assert.equal(dag.dugumler.get("BLK-MEVSIMLI")!.mevsim, "FAZ-AGUSTOS",
    "Blok'un mevsim: alanıyla kurulan bağ Dag'a inmedi");
  // ② Fiziksel kapsayan bundan etkilenmez: iki Blok da kendi dosyasında köktür.
  assert.equal(dag.dugumler.get("BLK-CAGRILI")!.kapsayan, undefined);
  assert.equal(dag.dugumler.get("BLK-MEVSIMLI")!.kapsayan, undefined);
});

test("N16 · Blok kendi Faz'ının altında GRUPLANIR ve bağı kapsama rayı çizer; ayrı kenar sınıfı doğmaz", () => {
  const graf = projeGrafiCikar(mevsimliDagKur());
  // ① AİDİYET BAKIŞTA OKUNUR: her Blok kendi mevsiminin hemen ardında, Blok
  //    rayında listelenir — Faz satırları çocuksuz düz bir liste değildir.
  assert.deepEqual(graf.dugumler.map((d) => d.kod),
    ["FAZ-TEMMUZ", "BLK-CAGRILI", "KAT-C", "ADM-C", "FAZ-AGUSTOS", "BLK-MEVSIMLI", "KAT-M", "ADM-M"],
    "Bloklar kendi Fazlarının altında gruplanmadı");
  assert.equal(graf.dugumler.find((d) => d.kod === "BLK-CAGRILI")!.ustKod, "FAZ-TEMMUZ");
  assert.equal(graf.dugumler.find((d) => d.kod === "BLK-MEVSIMLI")!.ustKod, "FAZ-AGUSTOS");
  assert.deepEqual(graf.dugumler.filter((d) => !d.ustKod).map((d) => d.kod),
    ["FAZ-TEMMUZ", "FAZ-AGUSTOS"], "kökte yalnız Fazlar kalmalıydı");
  // ② FAZ ARTIK ÇOCUKLU: durumu altındaki Adımlardan türer (YUZ-4 türetmesi).
  assert.equal(graf.dugumler.find((d) => d.kod === "FAZ-TEMMUZ")!.durum, "tamamlandı");
  assert.equal(graf.dugumler.find((d) => d.kod === "FAZ-AGUSTOS")!.durum, "beklemede");
  // ③ TEK GÖRSEL DİL: mevsim bağı kenar listesine ayrı bir sınıf olarak GİRMEZ —
  //    Faz ile kendi Bloku arasında hiçbir kenar yaşamaz, bağ kapsama rayındadır.
  //    (Kardeş Fazlar arasındaki zincir bundan ayrıdır: o, MIM-1.2 Faz-sırası
  //    türetmesinin meşru yürütme kenarıdır ve burada denetlenmez.)
  assert.ok(!graf.baglar.some((b) =>
    (b.once === "FAZ-TEMMUZ" && b.sonra === "BLK-CAGRILI") || (b.once === "BLK-CAGRILI" && b.sonra === "FAZ-TEMMUZ") ||
    (b.once === "FAZ-AGUSTOS" && b.sonra === "BLK-MEVSIMLI") || (b.once === "BLK-MEVSIMLI" && b.sonra === "FAZ-AGUSTOS")),
    "mevsim bağı kenar listesine sızmış — kapsama rayının dilinde kalmalıydı");
  // ④ GİRİNTİ: Blok kendi Fazının altında bir kademe sağdadır, kökler sıfırdadır.
  const yerlesim = agacYerlesimi(graf);
  assert.deepEqual(yerlesim.map((s) => s.girinti), [0, 1, 2, 3, 0, 1, 2, 3],
    "mevsim bağı girintiyle okunmuyor");
});

test("N17 · savunmacı hâller: fiziksel ata mevsime baskındır; Fazı kapsam dışı Blok köksüz kalır ama kaybolmaz", () => {
  // ① Fiziksel kapsayan varsa mevsim yerleşimi araya girmez (çift-mevsim-kaydı
  //    hâli ayrıca nöbetlidir; yerleşim yine de deterministik kalmalıdır).
  const fiziksel = projeGrafiCikar(dagYap([
    { kod: "F1", tip: "Faz", ad: "birinci" },
    { kod: "F2", tip: "Faz", ad: "ikinci" },
    { kod: "B", tip: "Blok", kapsayan: "F2", mevsim: "F1", ad: "iç içe gövde" },
  ]));
  assert.equal(fiziksel.dugumler.find((d) => d.kod === "B")!.ustKod, "F2",
    "fiziksel kapsayan dururken yerleşim mevsime kaymış");
  // ② Mevsim Fazı grafta görünmüyorsa (kapsam dışı ya da çözülmemiş) Blok köksüz
  //    kalır ve satırı düşmez — bağ gizlenmez, yalnız çizilemez.
  const kapsamDisi = projeGrafiCikar(dagYap([
    { kod: "B2", tip: "Blok", mevsim: "FAZ-YOK", ad: "fazı görünmeyen gövde" },
  ]));
  assert.equal(kapsamDisi.dugumler.length, 1, "Fazı görünmeyen Blok graftan düşmüş");
  assert.equal(kapsamDisi.dugumler[0].ustKod, undefined);
});

// ── Bağ şeridi: adım / zemin / üretir bağları ağacın solunda yay olarak çizilir ──

test("N18 · BAĞ ŞERİDİ: YALNIZ seçili düğümün bağları çizilir; uçlar doğru satır merkezlerinde, sınıf veriden", () => {
  const dag = dagYap([
    { kod: "TKM", tip: "Takım", ad: "takım" },
    { kod: "K", tip: "Katman", ad: "katman" },
    { kod: "A1", kapsayan: "K", ad: "ilk", durum: "geliştirmede", sonrakiler: ["A2", "A3"], zemin: ["TKM"], üretiyor: ["KOD-VAR"] },
    { kod: "A2", kapsayan: "K", ad: "ikinci", oncekiler: ["A1"] },
    { kod: "A3", kapsayan: "K", ad: "üçüncü", oncekiler: ["A1"], sonrakiler: ["A4"] },
    { kod: "A4", kapsayan: "K", ad: "dördüncü", oncekiler: ["A3"] },
    { kod: "KOD-VAR", tip: "Kod", ad: "kod", beyanYolu: "src/var.ts", üretenler: ["A1"] },
  ]);
  const sinif = { "adım": "bag", "zemin": "zemin", "üretir": "uretir" } as const;
  const yolRe = /<path class="(bag|zemin|uretir)" data-a="(\d+)" data-b="(\d+)" d="M ([\d.]+) ([\d.]+) C [\d.]+ [\d.]+, [\d.]+ [\d.]+, ([\d.]+) ([\d.]+)"/g;
  const graf = projeGrafiCikar(dag, "A1", () => true, diskte2);
  const secili = graf.baglar.filter((b) => b.once === "A1" || b.sonra === "A1");
  assert.ok(graf.baglar.length > secili.length, "fikstürde seçili düğüme bağlı olmayan bağ da bulunmalı (A3→A4)");
  assert.deepEqual([...new Set(secili.map((b) => b.tur))].sort(), ["adım", "zemin", "üretir"], "üç sınıf da seçilide");
  const html = projeGrafiAgaci(graf);
  const yollar = [...html.matchAll(yolRe)];
  assert.equal(yollar.length, secili.length, "yalnız seçili düğümün bağları için yol çizilmeli");
  const yerlesim = agacYerlesimi(graf);
  for (const b of secili) {
    const a = graf.dugumler.findIndex((d) => d.kod === b.once), z = graf.dugumler.findIndex((d) => d.kod === b.sonra);
    const m = yollar.find((y) => +y[2] === a && +y[3] === z);
    assert.ok(m, `${b.once}→${b.sonra} yolu yok`);
    assert.equal(m![1], sinif[b.tur], "yol sınıfı kenar sınıfından türemeli");
    assert.equal(+m![5], yerlesim[a].y + SATIR_YUKSEKLIGI / 2, "başlangıç kaynak satırın merkezinde değil");
    assert.equal(+m![7], yerlesim[z].y + SATIR_YUKSEKLIGI / 2, "bitiş hedef satırın merkezinde değil");
  }
  assert.ok(!yollar.some((y) => graf.dugumler[+y[2]].kod === "A3" && graf.dugumler[+y[3]].kod === "A4"), "seçiliye bağlı olmayan bağ çizilmiş");
  // Desenler ayrıdır; hover için düğüm başına seçici YOKTUR.
  const css = miniGrafHtml(graf);
  const desen = (k: string) => new RegExp(`\\.${k}\\{[^}]*stroke-dasharray:([^;}]*)`).exec(css)?.[1];
  assert.equal(desen("bag"), undefined, "adım bağı düz olmalı");
  assert.ok(desen("zemin") && desen("uretir") && desen("zemin") !== desen("uretir"));
  assert.ok(!css.includes(":has(") && !css.includes(":hover~"), "düğüm başına hover seçicisi üretilmemeli");
  assert.ok(!css.includes("<script"));
  // SEÇİLİ DÜĞÜM YOKSA ŞERİT HİÇ ÇİZİLMEZ ve genişliği sıfırdır.
  const secimsiz = miniGrafHtml(projeGrafiCikar(dag, "", () => true, diskte2));
  assert.ok(!secimsiz.includes('<svg class="serit"') && secimsiz.includes("--serit:0px"), "seçimsiz grafta şerit çizilmiş");
  assert.equal(cizilecekBaglar(projeGrafiCikar(dag)).length, 0);
  // Başlıktaki bağ sayısı bütün ağı söylemeye devam eder.
  assert.match(css, new RegExp(`aria-label="bağ">⎇</span>${graf.baglar.length}`));
});

const diskte2 = (): boolean => true;

test("N19 · BAĞ ŞERİDİ: örtüşen bağlar ayrı sütun alır, sütun sayısı sınırlıdır, etiketler şeride binmez", () => {
  const hedefler = Array.from({ length: 8 }, (_, i) => `H${i}`);
  const graf = projeGrafiCikar(dagYap([
    { kod: "K", tip: "Katman", ad: "k" },
    { kod: "A0", kapsayan: "K", ad: "kaynak", sonrakiler: hedefler },
    ...hedefler.map((h) => ({ kod: h, kapsayan: "K", ad: h, oncekiler: ["A0"] })),
  ]), "A0");
  const { yollar, sutunSayisi } = bagYerlesimi(graf);
  assert.equal(yollar.length, 8);
  assert.equal(sutunSayisi, SERIT_EN_COK_SUTUN, "sütun sayısı sınırda kalmalı");
  assert.ok(yollar.every((y) => y.sutun < SERIT_EN_COK_SUTUN));
  // Hepsi aynı kaynaktan çıktığı için aralıklar örtüşür: ilk dört sütun TEKİL, kalanlar en dışı paylaşır.
  const sutunlar = yollar.map((y) => y.sutun);
  for (let k = 0; k < SERIT_EN_COK_SUTUN - 1; k++) assert.equal(sutunlar.filter((x) => x === k).length, 1, `${k}. sütun tekil değil`);
  assert.equal(sutunlar.filter((x) => x === SERIT_EN_COK_SUTUN - 1).length, 8 - (SERIT_EN_COK_SUTUN - 1));
  // Satırlar şerit genişliği kadar içeriden başlar: etiket şeridin altına girmez.
  const html = miniGrafHtml(graf);
  assert.match(html, /style="--serit:\d+px"/);
  assert.match(html, /\.dugum\{[^}]*padding:0 8px 0 calc\(var\(--serit\) \+ 6px\)/);
});

test("meyve sayacının işareti geometrik ailenin Meyve simgesidir (medya/simgeler/meyve.svg ile aynı şekiller)", () => {
  const dosya = readFileSync(new URL("../medya/simgeler/meyve.svg", import.meta.url), "utf8");
  const sekiller = [...dosya.matchAll(/<(circle|path)\b[^>]*\/>/g)].map((m) => m[0]);
  assert.ok(sekiller.length >= 3, "meyve.svg şekilleri okunamadı");
  for (const s of sekiller) assert.ok(MEYVE_SIMGESI_SVG.includes(s), `sayaç işaretinde eksik şekil: ${s}`);
});

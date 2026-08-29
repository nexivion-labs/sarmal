// ═══════════════════════════════════════════════════════════════════════════
// minigraf.test.ts — 🕸️ Tek proje grafı davranış sınamaları
// ═══════════════════════════════════════════════════════════════════════════

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { belirtecle } from "../../cekirdek/src/belirtec.ts";
import { ayristir } from "../../cekirdek/src/ayristirici.ts";
import type { Program } from "../../cekirdek/src/sozdizim.ts";
import { mevsimNormalize } from "../../cekirdek/src/denetci.ts";
import { dagKur, type Dag, type DagDugum } from "../../cekirdek/src/dag.ts";
import {
  projeGrafiCikar, projeGrafiSvg, miniGrafHtml, bosHtml, temaDegiskeni, tipSimgesi,
} from "../src/minigraf-cekirdek.ts";
import { GOMULU_KAYIT } from "../src/gomulu-kanon.ts";

function dagYap(dugumler: Array<Partial<DagDugum> & { kod: string }>): Dag {
  const m = new Map<string, DagDugum>();
  for (const d of dugumler) {
    m.set(d.kod, {
      tip: "Adım", dosya: "/p/plan/a.sar", satir: 1, sutun: 1,
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

test("projeGrafiSvg: GitLens rayları + cam ikonlar + bağımlılık + tıkla→atla", () => {
  const dag = dagYap([
    { kod: "F", tip: "Faz", ad: "faz", dosya: "/p/f.sar", satir: 2 },
    { kod: "B", tip: "Blok", kapsayan: "F", ad: "blok" },
    { kod: "K", tip: "Katman", kapsayan: "B", ad: "katman" },
    { kod: "AK", tip: "AltKatman", kapsayan: "K", ad: "alt katman" },
    { kod: "A1", kapsayan: "AK", ad: "ilk", durum: "tamamlandı", sonrakiler: ["A2"] },
    { kod: "A2", kapsayan: "AK", ad: "ikinci", durum: "geliştirmede", oncekiler: ["A1"], dosya: "/p/a.sar", satir: 7 },
  ]);
  const svg = projeGrafiSvg(projeGrafiCikar(dag, "A2"));
  assert.ok(svg.includes('class="kapsama"'), "hiyerarşi rayı");
  assert.ok(svg.includes('class="bag"'), "gerçek bağımlılık eğrisi");
  assert.ok(svg.includes('class="dugum secili"'), "seçim grafı kesmeden işaretlenir");
  assert.ok(svg.includes('class="mercek"') && svg.includes('class="isima"'), "cam mercek + ışıltı katmanları");
  assert.ok(svg.includes("🌀") && svg.includes("🪵") && svg.includes("🌿") && svg.includes("🍃"), "ikonlar TIP-0 kanonundan");
  assert.match(svg, /var\(--vscode-testing-iconPassed\)/);
  assert.match(svg, /var\(--vscode-charts-yellow\)/);
  assert.ok(svg.includes("command:sarmal.dosyaAc?"));
  assert.ok(svg.includes(encodeURIComponent(JSON.stringify(["/p/a.sar", 7]))));
});

test("HTML: tek görünüm, betiksiz hover ışıltısı, arka plan gradyanı yok", () => {
  const html = miniGrafHtml(projeGrafiCikar(dagYap([
    { kod: "A", durum: "tamamlandı", sonrakiler: ["B"] },
    { kod: "B", durum: "beklemede", oncekiler: ["A"] },
  ])));
  assert.ok(!html.includes("MİNİ GRAF"), "görünüm başlığı zaten sekmede — iç başlık tekrarlanmaz");
  assert.match(html, /aria-label="düğüm">●<\/span>2/);
  assert.match(html, /aria-label="bağ">⎇<\/span>1/);
  assert.match(html, /\.dugum:hover \.isima\{opacity:\.30\}/);
  assert.match(html, /:has\(\.dugum\[data-i="0"\]:hover\).*\.bag\[data-a="0"\]/,
    "hover doğrudan bağı hafifçe güçlendirir");
  assert.ok(!html.includes("<script"), "enableScripts:false disiplini");
  assert.ok(!html.includes("background:radial-gradient") && !html.includes("background:linear-gradient"),
    "sayfa arka planında gradyan yok");
  assert.ok(!html.includes("kip"), "kip/anahtar yok");
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
    { kod: "S-FAZ", tip: "Faz", ad: "sarmal temel", dosya: "/depo/_Sarmal/plan/omurga.sar" },
    { kod: "S-BLK", tip: "Blok", kapsayan: "S-FAZ", ad: "motor", dosya: "/depo/_Sarmal/plan/omurga.sar" },
    { kod: "S-A1", tip: "Adım", kapsayan: "S-BLK", ad: "sarmal adımı", durum: "beklemede",
      dosya: "/depo/_Sarmal/plan/omurga.sar", sonrakiler: ["S-A2"] },
    { kod: "S-A2", tip: "Adım", kapsayan: "S-BLK", ad: "sarmal ikinci", durum: "beklemede",
      dosya: "/depo/_Sarmal/plan/omurga.sar", oncekiler: ["S-A1"] },
    { kod: "N-FAZ", tip: "Faz", ad: "os temel", dosya: "/depo/_KapaliUrun/plan/kadro.sar" },
    { kod: "N-A1", tip: "Adım", kapsayan: "N-FAZ", ad: "os adımı", durum: "beklemede",
      dosya: "/depo/_KapaliUrun/plan/kadro.sar" },
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
    { kod: "IC-1", dosya: "/depo/_Sarmal/plan/a.sar", sonrakiler: ["IC-2", "DIS-1"] },
    { kod: "IC-2", dosya: "/depo/_Sarmal/plan/a.sar", oncekiler: ["IC-1"] },
    { kod: "DIS-1", dosya: "/depo/_KapaliUrun/plan/b.sar", oncekiler: ["IC-1"] },
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
  const svg = projeGrafiSvg(projeGrafiCikar(dag));
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

test("N4 · zemin kenarı ile adım kenarı grafta AYRI SINIFTIR ve ayrı çizilir", () => {
  const graf = projeGrafiCikar(dagYap([
    { kod: "TKM", tip: "Takım", ad: "takım" },
    { kod: "K", tip: "Katman", ad: "katman", zemin: ["TKM"] },
    { kod: "A1", tip: "Adım", kapsayan: "K", ad: "ilk", sonrakiler: ["A2"] },
    { kod: "A2", tip: "Adım", kapsayan: "K", ad: "ikinci", oncekiler: ["A1"] },
  ]));
  // ① Sınıf VERİDE taşınır — çizim onu tahmin etmez.
  assert.deepEqual(graf.baglar.find((b) => b.once === "TKM"), { once: "TKM", sonra: "K", tur: "zemin" });
  assert.deepEqual(graf.baglar.find((b) => b.once === "A1"), { once: "A1", sonra: "A2", tur: "adım" });

  const svg = projeGrafiSvg(graf);
  assert.ok(svg.includes('class="zemin"'), "zemin kenarı çizilmedi");
  assert.ok(svg.includes('class="bag"'), "adım kenarı çizilmedi");
  // ② Zemin düz DİRSEKTİR, adım kenarı bezier EĞRİDİR — bakışta ayrılırlar.
  const zeminYolu = /class="zemin"[^>]*d="M [^"]*"/.exec(svg)![0];
  assert.ok(!zeminYolu.includes(" C "), "zemin bağı eğri çizilmiş; düz dirsek olmalıydı");
  assert.match(zeminYolu, / H .* V .* H /, "zemin dirseği yatay-dikey-yatay değil");

  // ③ ASIL NÖBET: iki sınıf FARKLI stroke-dasharray taşır (yoksa aynı görünürler).
  const html = miniGrafHtml(graf);
  const stil = (sinif: string): string =>
    new RegExp(`\\.${sinif}\\{([^}]*)\\}`).exec(html)![1];
  const desen = (s: string): string | undefined => /stroke-dasharray:([^;}]*)/.exec(s)?.[1];
  assert.ok(desen(stil("zemin")), "zemin kenarının kesik deseni yok — adım kenarından ayrılmıyor");
  assert.notEqual(desen(stil("zemin")), desen(stil("bag")),
    "zemin ile adım kenarı aynı çizgi desenini taşıyor; graf iki kenar sınıfını ayırt ettirmiyor");
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

test("N6 · beyan edilmiş ama diskte olmayan meyve BOŞ CAM çizilir", () => {
  const graf = projeGrafiCikar(zeminliDag(), "A1", () => true, diskte);
  const var_ = graf.dugumler.find((d) => d.kod === "KOD-VAR")!;
  const yok = graf.dugumler.find((d) => d.kod === "KOD-YOK")!;
  assert.equal(var_.diskte, true, "kapı true dedi, düğüm dolu sayılmalı");
  assert.equal(yok.diskte, false, "kapı false dedi, düğüm boş sayılmalı");

  const svg = projeGrafiSvg(graf);
  // ASIL NÖBET: boş cam DOLDURULMAZ — yalnız mercek ile kesikli çember kalır.
  const dugumGovdesi = (kod: string): string => {
    const i = graf.dugumler.findIndex((d) => d.kod === kod);
    return new RegExp(`<g class="dugum[^"]*" data-i="${i}">[\\s\\S]*?</g>`).exec(svg)![0];
  };
  const bosGovde = dugumGovdesi("KOD-YOK");
  assert.ok(bosGovde.includes('class="cember boş"'), "boş meyvenin çemberi ayrı işaret taşımıyor");
  assert.ok(bosGovde.includes('class="mercek boş"'), "boş meyvenin merceği ayrı işaret taşımıyor");
  assert.ok(!bosGovde.includes('class="isima"'), "boş cam ışıyor — yokluk doluluk gibi görünüyor");
  assert.ok(!bosGovde.includes('class="parlama"'), "boş camda parlama var");
  assert.ok(!bosGovde.includes('filter="url(#buz)"'), "boş camın buzlu gövdesi doldurulmuş");

  const doluGovde = dugumGovdesi("KOD-VAR");
  assert.ok(doluGovde.includes('class="cember"') && !doluGovde.includes("cember boş"));
  assert.ok(doluGovde.includes('class="isima"'), "dolu meyve normal cam olarak çizilmeli");

  // Boş ile dolu camın çemberi CSS'te de farklıdır; renk kanonik token'dan gelir.
  const html = miniGrafHtml(graf);
  assert.match(html, /\.cember\.boş\{[^}]*stroke-dasharray/, "boş çemberin kesik deseni yok");
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(html), "ham renk değeri gömülmüş (YUZ-4.1 ihlali)");
});

test("N7 · Adım alt yazısı eksik meyveyi SEÇİM OLMADAN bildirir", () => {
  // Hiçbir Adım seçili DEĞİL — buna rağmen sayaç ve eksik bildirimi görünmeli.
  const graf = projeGrafiCikar(zeminliDag(), "", () => true, diskte);
  const a1 = graf.dugumler.find((d) => d.kod === "A1")!;
  assert.equal(a1.meyveSayisi, 2);
  assert.equal(a1.eksikMeyve, 1, "eksik meyve seçim yokken de sayılmalı");
  assert.equal(graf.dugumler.find((d) => d.kod === "A2")!.eksikMeyve, 0);
  assert.ok(!graf.dugumler.some((d) => d.derinlik === 5), "seçim yokken meyve satırı açılmamalı");

  const svg = projeGrafiSvg(graf);
  assert.ok(svg.includes("🍎 2"), "meyve sayacı alt yazıda yok");
  assert.ok(svg.includes("1 diskte yok"), "eksik meyve seçim olmadan bildirilmiyor");
});

test("N7b · meyve satırının alt yazısı tipini ve BEYAN EDİLEN yolunu söyler", () => {
  const svg = projeGrafiSvg(projeGrafiCikar(zeminliDag(), "A1", () => true, diskte));
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
  const svg = projeGrafiSvg(projeGrafiCikar(zeminliDag(), "A1", () => true, diskte));
  const basilanlar = [...svg.matchAll(/<text class="simge"[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]);
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

  // ① DAVRANIŞ: sayaç kanondaki ürün simgesini taşır.
  const graf = projeGrafiCikar(zeminliDag(), "", () => true, diskte);
  const svg = projeGrafiSvg(graf);
  assert.ok(svg.includes(`${urunSimgesi} `),
    `meyve sayacı kanonun ürün simgesini (${urunSimgesi}) taşımıyor`);

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

test("N9 · ETİKET MERDİVENİ: yazı da mercek gibi kademelenir, tek sütunda dizilmez", () => {
  // FOUNDER HÜKMÜ (2026-07-30): "bloklar, katmanlar, adımlar gibi itemlerin isimleri
  // düz bir çizgi gibi alt alta dizildiğinde karışabiliyor; hiyerarşi sırasına göre
  // merdiven gibi olsa." Ölçülen kusur: mercekler altı ayrı rayda kademeleniyordu
  // fakat bütün etiketler TEK sabitten (x=146) başlıyordu, dolayısıyla göz merdiveni
  // dairelerde görüyor yazıda kaybediyordu.
  const svg = projeGrafiSvg(projeGrafiCikar(zeminliDag(), "A1", () => true, diskte));
  const sutun = (sinif: string) =>
    [...svg.matchAll(new RegExp(`<text class="${sinif}" x="(\\d+)"`, "g"))].map((m) => +m[1]);

  const etiketler = sutun("etiket");
  const tekil = [...new Set(etiketler)];
  // ① ASIL NÖBET: birden çok sütun vardır. Tek sütun, merdivenin hiç kurulmadığıdır.
  assert.ok(tekil.length > 1,
    `bütün etiketler tek sütunda (x=${tekil[0]}) — kademe girintisi yok`);

  // ② Girinti KADEMEYLE ARTAR: derin düğümün etiketi sığ düğümünkinden sağdadır.
  const graf = projeGrafiCikar(zeminliDag(), "A1", () => true, diskte);
  const yerler = [...svg.matchAll(/<text class="etiket" x="(\d+)"/g)].map((m) => +m[1]);
  assert.equal(yerler.length, graf.dugumler.length, "her düğüm bir etiket basmalı");
  graf.dugumler.forEach((d, i) => {
    graf.dugumler.forEach((e, j) => {
      if (d.derinlik < e.derinlik) {
        assert.ok(yerler[i] < yerler[j],
          `kademe ${d.derinlik} (${d.kod}) etiketi kademe ${e.derinlik} (${e.kod}) ile aynı ya da sağında — merdiven bozuk`);
      }
    });
  });

  // ③ Etiket merceğin SAĞINDA durur — üstüne binmez.
  const merkezler = [...svg.matchAll(/<circle class="mercek[^"]*" cx="([\d.]+)"/g)].map((m) => +m[1]);
  merkezler.forEach((cx, i) => {
    assert.ok(yerler[i] > cx, `etiket merceğin üstüne binmiş (x=${yerler[i]} ≤ cx=${cx})`);
  });
});

test("N10 · bağımlılık eğrileri yazılarla ÇAKIŞMAZ: kavis Adım sütununun solunda durur, yazı halelidir", () => {
  // FOUNDER CANLI BULGUSU (2026-07-30): "bağımlılık çizgileri yazılar ile çakışıyor."
  // Kusur etiket merdiveninin yan etkisiydi: merdiven öncesi bütün etiketler x=146'dan
  // başlıyordu ve eğriler oraya hiç ulaşmıyordu; merdiven etiketleri sola kaydırınca
  // hepsi eğri koridoruna (x=28..140) girdi. Ölçüm: en kalabalık sütun Adımlarındır
  // ve x=128'den başlar, eğriler ise 140'a kadar çıkıyordu.
  // Fikstür UZAK SATIRLAR arasında bağımlılık taşır: kavis genişliği satır
  // mesafesiyle büyür, dolayısıyla tavan ancak uzun atlamada sınanabilir.
  const graf = projeGrafiCikar(dagYap([
    { kod: "F", tip: "Faz", ad: "faz" },
    { kod: "B", tip: "Blok", kapsayan: "F", ad: "blok" },
    { kod: "K", tip: "Katman", kapsayan: "B", ad: "katman" },
    { kod: "AK", tip: "AltKatman", kapsayan: "K", ad: "alt katman" },
    { kod: "A1", kapsayan: "AK", ad: "ilk adım", durum: "tamamlandı", sonrakiler: ["A5"] },
    { kod: "A2", kapsayan: "AK", ad: "ikinci", durum: "beklemede" },
    { kod: "A3", kapsayan: "AK", ad: "üçüncü", durum: "beklemede" },
    { kod: "A4", kapsayan: "AK", ad: "dördüncü", durum: "beklemede" },
    { kod: "A5", kapsayan: "AK", ad: "beşinci", durum: "beklemede", oncekiler: ["A1"] },
  ]), "A5");
  const svg = projeGrafiSvg(graf);
  const yollar = [...svg.matchAll(/class="bag"[^>]*d="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(yollar.length > 0, "fikstürde bağımlılık eğrisi yok — nöbet ölçemez");

  // ① KAVİS TAVANI: hiçbir eğri Adım etiket sütununa ulaşmaz.
  const adimSutunu = Math.min(
    ...[...svg.matchAll(/<text class="etiket" x="(\d+)"/g)].map((m) => +m[1])
      .filter((x) => x >= 128));
  for (const d of yollar) {
    const enSag = Math.max(...[...d.matchAll(/[ML,C]\s*([\d.]+)[ ,]/g)].map((m) => +m[1]));
    assert.ok(enSag < adimSutunu,
      `bağımlılık eğrisi Adım etiket sütununa girmiş (x=${enSag} ≥ ${adimSutunu})`);
  }

  // ② YAZI HALESİ: eğri satırlar boyunca uzanır ve yolu üstündeki SIĞ kademelerin
  //    adlarını da keser; tavan tek başına yetmez. Hale harfin arkasında çizgiyi
  //    görünmez kılar.
  const html = miniGrafHtml(graf);
  const kural = /\.etiket,\.alt\{([^}]*)\}/.exec(html)?.[1] ?? "";
  assert.match(kural, /paint-order:\s*stroke fill/, "yazı halesi yok — çizgi harfin üstünden geçer");
  assert.match(kural, /stroke:var\(--vscode-/, "hale rengi kanonik tema rolünden gelmeli (ham değer yasak)");

  // ③ BOYAMA SIRASI: eğri metinden ÖNCE basılır, yoksa hale hiçbir işe yaramaz.
  assert.ok(svg.indexOf('class="bag"') < svg.indexOf('class="etiket"'),
    "eğri metinden SONRA basılıyor — hale çizgiyi kesemez");
});

test("N11 · hover kuralı YALNIZ yürütme kenarı için üretilir: zemin ölü seçici doğurmaz", () => {
  // FOUNDER CANLI BULGUSU (2026-07-30): "IDE'de kasma var." Ölçülen kök sebep:
  // bağlılık denetimi BÜTÜN kenarlara bakıyordu, oysa ürettiği kural yalnız `.bag`
  // sınıfını boyar; zemin kenarı `.zemin` sınıfındadır. Yani yalnız zemine bağlı bir
  // düğüm için hiçbir zaman eşleşemeyecek iki `:has()` seçicisi üretiliyordu. Zemin
  // kenarları bu turda 151'den 722'ye çıkınca ölü maliyet grafa yayıldı ve seçici
  // sayısı 1366'ya ulaştı; canlı korpusta düzeltmeden sonra 694'e indi.
  // `:has()` en pahalı CSS seçicisidir ve her fare hareketinde yeniden değerlendirilir.
  const graf = projeGrafiCikar(dagYap([
    { kod: "TEK", tip: "Teknoloji", ad: "typescript" },
    { kod: "K", tip: "Katman", ad: "katman", zemin: ["TEK"] },
    // ZEMİNE bağlı ama yürütme bağı OLMAYAN Adım — hover kuralı ÜRETMEMELİ.
    { kod: "AY", tip: "Adım", kapsayan: "K", ad: "yalnız zemine bağlı", durum: "beklemede",
      oncekiler: ["TEK"] },
    // Gerçek yürütme bağı olan iki Adım — hover kuralı ÜRETMELİ.
    { kod: "AB", tip: "Adım", kapsayan: "K", ad: "birinci", durum: "beklemede", sonrakiler: ["AC"] },
    { kod: "AC", tip: "Adım", kapsayan: "K", ad: "ikinci", durum: "beklemede", oncekiler: ["AB"] },
  ]));
  const html = miniGrafHtml(graf);
  const sira = (kod: string) => graf.dugumler.findIndex((d) => d.kod === kod);
  const kuralVar = (kod: string) => html.includes(`.dugum[data-i="${sira(kod)}"]:hover`);

  // ① ASIL NÖBET: yalnız zemine bağlı düğüm ölü seçici doğurmaz.
  assert.equal(kuralVar("AY"), false,
    "yalnız zemine bağlı düğüm için hover kuralı üretilmiş — hiçbir zaman eşleşemez, saf maliyet");
  assert.equal(kuralVar("TEK"), false, "zemin düğümü için de hover kuralı üretilmemeli");
  // ② Gerçek yürütme bağı olan düğüm kuralını KAYBETMEZ — düzeltme fazla süpürmüyor.
  assert.equal(kuralVar("AB"), true, "yürütme bağı olan düğümün hover kuralı düşmüş");
  assert.equal(kuralVar("AC"), true);
  // ③ Seçici sayısı bağlı düğüm başına İKİdir; toplam bunu aşarsa ölü kural sızmıştır.
  const secici = (html.match(/:has\(/g) ?? []).length;
  assert.equal(secici, 4, `beklenen 4 seçici (iki bağlı düğüm × 2), bulunan ${secici}`);
});

// ── 🍎 VIT-GRAF-A12 · ÜÇÜNCÜ KENAR SINIFI: ÜRETİM KÖKENİ ─────────────────────
//   Kanon dayanağı iki maddedir ve ikisi de aynı şeyi söyler. ORK-1 hükmü kenar
//   sınıflarını kesin olarak ayırır: `mimariBağı` yalnız kapsama ve görünürlük,
//   `bağımlı|besler` yalnız Adım sırası, `üretir` yalnız Adım→Meyve üretim kökeni
//   içindir ve bir kenar başka sınıfın anlamını üstlenemez. YUZ-3.2 maddesi ise
//   bunu doğrudan GRAF YÜZÜ için tekrarlar ve örneğinde adıyla yasaklar: bir
//   `üretir` bağı "mimari sarma bağı diye yeniden etiketlenmez".
//
//   ÖLÇÜLMÜŞ KUSUR (2026-08-08): meyve satırı yalnız `ustKod` alanıyla kapsama
//   rayına asılıyordu, yani üretim kökeni mimari sarmanın çizgisiyle anlatılıyordu.
//   Kusur hiçbir sınamayı kırmıyordu, çünkü o güne dek hiçbir nöbet meyvenin
//   HANGİ SINIFIN çizgisiyle bağlandığına bakmamıştı.

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

  const svg = projeGrafiSvg(graf);
  const yollar = (sinif: string): string[] =>
    [...svg.matchAll(new RegExp(`<path class="${sinif}"[^>]*d="([^"]+)"`, "g"))].map((m) => m[1]);

  // ③ ASIL NÖBET — KAPSAMA SAYIMI: meyve satırı kapsama rayına asılırsa bu sayı
  //    şişer. Beklenen kapsama yolu sayısı üç parçadan oluşur: birden çok kök varsa
  //    bir omurga, her kök için bir bağlantı ve kök olmayan HER MEYVE DIŞI satır
  //    için bir bağlantı. Meyve bu hesaba GİRMEZ.
  const kok = graf.dugumler.filter((d) => !d.ustKod).length;
  const meyve = graf.dugumler.filter((d) => d.derinlik === 5).length;
  const beklenenKapsama = (kok > 1 ? 1 : 0) + kok + (graf.dugumler.length - kok - meyve);
  assert.equal(yollar("kapsama").length, beklenenKapsama,
    "meyve satırı kapsama rayına asılmış — üretim kökeni mimari sarma dilinde çizilmiş (YUZ-3.2 ihlali)");
  assert.equal(yollar("uretir").length, 2, "üretim kökeni çizilmedi");

  // ④ DÖRT SINIF DÖRT AYRI GEOMETRİ: üretir DÜZ iner, kapsama kavislidir, zemin
  //    dik açılıdır, yürütme kenarı bezier eğridir. Aynı biçimi paylaşan iki sınıf
  //    bakışta ayrılmaz.
  for (const d of yollar("uretir")) {
    assert.match(d, /^M [\d.]+ [\d.]+ L [\d.]+ [\d.]+$/,
      `üretim kenarı düz iniş değil: ${d}`);
  }
  assert.ok(yollar("kapsama").some((d) => d.includes(" Q ")), "kapsama rayı kavisini yitirmiş");
  assert.ok(yollar("zemin").every((d) => / H .* V /.test(d)), "zemin dirseği dik açısını yitirmiş");

  // ⑤ YAZIYA GİRMEZ (Founder canlı bulgusu 2026-07-30: "çizgiler yazılarla
  //    çakışıyor"): üretim kenarı iki mercek arasında kalır ve hiçbir etiket
  //    sütununa ulaşmaz. En sağdaki etiket sütunu bu nöbetin ölçüsüdür.
  const enSolEtiket = Math.min(
    ...[...svg.matchAll(/<text class="etiket" x="(\d+)"/g)].map((m) => +m[1]).filter((x) => x >= 128));
  for (const d of yollar("uretir")) {
    const enSag = Math.max(...[...d.matchAll(/[ML]\s*([\d.]+) /g)].map((m) => +m[1]));
    assert.ok(enSag < enSolEtiket,
      `üretim kenarı etiket sütununa girmiş (x=${enSag} ≥ ${enSolEtiket})`);
  }

  // ⑤ DESEN DE AYRIDIR: üretir noktalı, zemin kesikli, kapsama süreklidir.
  const html = miniGrafHtml(graf);
  const stil = (sinif: string): string => new RegExp(`\\.${sinif}\\{([^}]*)\\}`).exec(html)![1];
  const desen = (s: string): string | undefined => /stroke-dasharray:([^;}]*)/.exec(s)?.[1];
  assert.ok(desen(stil("uretir")), "üretim kenarının noktalı deseni yok");
  assert.notEqual(desen(stil("uretir")), desen(stil("zemin")),
    "üretim kenarı ile zemin kenarı aynı çizgi desenini taşıyor");
  assert.equal(desen(stil("kapsama")), undefined, "kapsama rayı sürekli çizgi olmalı");
  assert.match(stil("uretir"), /stroke:var\(--vscode-/,
    "üretim kenarının rengi kanonik tema rolünden gelmeli (YUZ-4.1 · ham değer yasak)");
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

test("N14 · üretim kenarı HOVER MALİYETİ doğurmaz: `:has()` seçici sayısı değişmez", () => {
  // PERFORMANS DERSİ (2026-07-30 · Founder canlı bulgusu "IDE'de kasma var"):
  // `:has()` en pahalı CSS seçicisidir ve tarayıcı onu her fare hareketinde
  // yeniden değerlendirir; sayı 1366'ya çıktığında editörde kasma hissi doğmuştu.
  // Yeni kenar sınıfı bu maliyeti BÜYÜTMEMELİDİR: hover kuralı yalnız yürütme
  // kenarı için üretilir, üretim kökeni izlenecek bir sıra taşımaz.
  const dag = uretimliDag();
  const secici = (kod: string): number => {
    const html = miniGrafHtml(projeGrafiCikar(dag, kod, () => true, () => true));
    return (html.match(/:has\(/g) ?? []).length;
  };
  assert.equal(secici(""), 0, "yürütme kenarı olmayan grafta hover kuralı üretilmemeli");
  assert.equal(secici("A1"), 0,
    "meyve satırları açılınca `:has()` seçicisi doğmuş — üretim kökeni hover maliyeti taşıyamaz");
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
    ["/depo/_Sarmal/plan/faz.sar", ayristir(belirtecle(
      'Faz( kod: FAZ-TEMMUZ, ad: "temmuz mevsimi" ) {\n  çağır BLK-CAGRILI\n}\n' +
      'Faz( kod: FAZ-AGUSTOS, ad: "ağustos mevsimi" ) {\n}\n'))],
    ["/depo/_Sarmal/plan/cagrili.sar", ayristir(belirtecle(
      'Blok( kod: BLK-CAGRILI, ne: "çağır listesiyle bağlı gövde" ) { Katman( kod: KAT-C, ad: "c katmanı" ) { Adım( kod: ADM-C, ne: "biten iş", durum: tamamlandı ) } }'))],
    ["/depo/_Sarmal/plan/mevsimli.sar", ayristir(belirtecle(
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
  // ④ KAPSAMA SAYIMI: iki kök için bir omurga ve iki kök bağlantısı, kök olmayan
  //    altı satır için altı bağlantı — Blok satırları da bu hesabın İÇİNDEDİR.
  const svg = projeGrafiSvg(graf);
  const kapsama = [...svg.matchAll(/<path class="kapsama"/g)].length;
  assert.equal(kapsama, 1 + 2 + 6, "mevsim bağı kapsama rayıyla çizilmedi");
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

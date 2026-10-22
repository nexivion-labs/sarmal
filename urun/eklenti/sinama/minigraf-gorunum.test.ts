// ═══════════════════════════════════════════════════════════════════════════
// minigraf-gorunum.test.ts — 🕸️ Mini Graf görünüm seçimi: Klasik · Ağaç · İlerleme
// ═══════════════════════════════════════════════════════════════════════════

import "./dil-kur.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dagKur, type Dag, type DagDugum } from "../../cekirdek/src/dag.ts";
import { belirtecle } from "../../cekirdek/src/belirtec.ts";
import { ayristir } from "../../cekirdek/src/ayristirici.ts";
import { mevsimNormalize } from "../../cekirdek/src/denetci.ts";
import type { Program } from "../../cekirdek/src/sozdizim.ts";
import { projeGrafiCikar, gorunurGraf, cizilecekBaglar, BUYUK_GRAF_ESIGI } from "../src/minigraf-cekirdek.ts";
import { GRAF_KOMUTLARI, grafKomutu } from "../src/panel-cekirdek.ts";
import { ilerlemeKartlari, ilerlemeHtml } from "../src/minigraf-ilerleme.ts";
import {
  gorunumHtml, gorunumNormalle, seciciHtml, GORUNUMLER, VARSAYILAN_GORUNUM,
  GORUNUM_SEC_KOMUTU, GORUNUM_KAPAT_KOMUTU,
} from "../src/minigraf-gorunum.ts";
import { planYolu } from "../../cekirdek/sinama/dogus-agaci.ts";

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

/** İki Katmanlı Blok (3/4 ve 0/1), Katmansız ikinci Blok (1/2) taşıyan fikstür. */
function ilerlemeDagi(): Dag {
  return dagYap([
    { kod: "F", tip: "Faz", ad: "faz" },
    { kod: "B1", tip: "Blok", kapsayan: "F", ad: "katmanlı blok" },
    { kod: "K1", tip: "Katman", kapsayan: "B1", ad: "birinci katman" },
    { kod: "AK", tip: "AltKatman", kapsayan: "K1", ad: "alt katman" },
    { kod: "A1", kapsayan: "AK", ad: "a1", durum: "tamamlandı" },
    { kod: "A2", kapsayan: "AK", ad: "a2", durum: "tamamlandı" },
    { kod: "A3", kapsayan: "K1", ad: "a3", durum: "tamamlandı" },
    { kod: "A4", kapsayan: "K1", ad: "a4", durum: "geliştirmede" },
    { kod: "K2", tip: "Katman", kapsayan: "B1", ad: "ikinci katman" },
    { kod: "A5", kapsayan: "K2", ad: "a5", durum: "beklemede" },
    { kod: "B2", tip: "Blok", kapsayan: "F", ad: "katmansız blok" },
    { kod: "A6", kapsayan: "B2", ad: "a6", durum: "tamamlandı" },
    { kod: "A7", kapsayan: "B2", ad: "a7", durum: "beklemede" },
  ]);
}

test("görünüm ayarı: bilinmeyen değer varsayılana (Ağaç) düşer; üç değer korunur", () => {
  assert.deepEqual([...GORUNUMLER], ["klasik", "agac", "ilerleme"]);
  assert.equal(VARSAYILAN_GORUNUM, "agac");
  for (const g of GORUNUMLER) assert.equal(gorunumNormalle(g), g);
  for (const kotu of [undefined, null, "", "izgara", 3]) assert.equal(gorunumNormalle(kotu), "agac");
});

test("ayar değerine göre DOĞRU çizici seçilir; her görünüm çizer", () => {
  const graf = projeGrafiCikar(ilerlemeDagi());
  const klasik = gorunumHtml(graf, "klasik");
  const agac = gorunumHtml(graf, "agac");
  const ilerleme = gorunumHtml(graf, "ilerleme");
  assert.ok(klasik.includes('<svg class="graf"') && klasik.includes('class="mercek"'), "klasik: SVG mercek çizimi");
  assert.ok(agac.includes('role="group"') && agac.includes('class="nokta') && !agac.includes('class="mercek"'), "ağaç: düzenli ağaç");
  assert.ok(ilerleme.includes('class="kart"') && ilerleme.includes("role=\"progressbar\""), "ilerleme: kartlar");
  assert.equal(gorunumHtml(graf, undefined), agac, "ayar yoksa Ağaç çizilir");
  assert.equal(gorunumHtml(graf, "bozuk"), agac, "bozuk ayar Ağaç çizer");
  for (const h of [klasik, agac, ilerleme]) assert.ok(!h.includes("<script"), "betiksiz disiplin");
  // Boş grafta her görünüm dürüst boş hâli basar.
  const bos = projeGrafiCikar(dagYap([]));
  for (const g of GORUNUMLER) assert.ok(gorunumHtml(bos, g).includes('class="k"'));
});

test("ilerleme kartı: Katman altındaki BÜTÜN Adımlar sayılır, Katmansız Blok Blok düzeyinde kart alır", () => {
  const kartlar = ilerlemeKartlari(projeGrafiCikar(ilerlemeDagi()));
  assert.deepEqual(kartlar.map((k) => [k.kod, k.tip, k.tamam, k.toplam]), [
    ["K1", "Katman", 3, 4],       // AltKatman altındaki iki Adım da dâhil
    ["K2", "Katman", 0, 1],
    ["B2", "Blok", 1, 2],         // Katmansız Blok; katmanlı B1 kart ALMAZ
  ]);
  const html = ilerlemeHtml(projeGrafiCikar(ilerlemeDagi()));
  assert.ok(html.includes("3/4 Adım") && html.includes("0/1 Adım") && html.includes("1/2 Adım"));
  assert.ok(html.includes('style="width:75%"') && html.includes('style="width:0%"') && html.includes('style="width:50%"'));
  assert.ok(!html.includes('"dolu bitti"'), "tamamlanmamış çubuk yeşil olmamalı");
  assert.match(html, /\.dolu\{[^}]*var\(--vscode-charts-blue\)/, "devam eden çubuk mavi");
  assert.match(html, /\.dolu\.bitti\{[^}]*var\(--vscode-testing-iconPassed\)/, "biten çubuk yeşil");
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(html), "ham renk değeri gömülmüş");
});

test("ilerleme kartı: tüm Adımlar tamamlanınca çubuk yeşil sınıfı alır; Adımsız Katman 0/0", () => {
  const dag = dagYap([
    { kod: "K", tip: "Katman", ad: "bitmiş" },
    { kod: "A1", kapsayan: "K", ad: "x", durum: "tamamlandı" },
    { kod: "K0", tip: "Katman", ad: "boş" },
  ]);
  const html = ilerlemeHtml(projeGrafiCikar(dag));
  assert.ok(html.includes("1/1 Adım") && html.includes('class="dolu bitti" style="width:100%"'));
  assert.ok(html.includes("0/0 Adım"));
  assert.ok(html.includes("command:sarmal.dosyaAc?"), "kart kaynağa atlar");
});

test("seçici: üç kart, seçili kart vurgulu, tıklama command: bağıyla ve betiksiz", () => {
  for (const sec of GORUNUMLER) {
    const html = seciciHtml(sec);
    assert.equal([...html.matchAll(/class="gk[ "]/g)].length, 3, "üç kart");
    assert.equal([...html.matchAll(/class="gk secili"/g)].length, 1, "yalnız bir kart seçili");
    assert.ok(html.includes(`command:${GORUNUM_SEC_KOMUTU}?${encodeURIComponent(JSON.stringify([sec]))}" aria-current`),
      "seçili kart seçili görünümün komutunu taşımıyor");
    for (const g of GORUNUMLER) assert.ok(html.includes(encodeURIComponent(JSON.stringify([g]))));
    assert.ok(html.includes(`command:${GORUNUM_KAPAT_KOMUTU}`), "Kapat bağı yok");
    assert.ok(!html.includes("<script"));
    assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(html), "ham renk");
    assert.equal([...html.matchAll(/<svg viewBox/g)].length, 3, "her kartta önizleme çizimi");
  }
  const html = seciciHtml("agac");
  assert.match(html, /grid-template-columns:repeat\(auto-fit,minmax\(150px,1fr\)\)/, "dar panelde alt alta");
  assert.match(html, /\.gk\.secili\{border:2px solid var\(--vscode-focusBorder\)/);
  for (const ad of ["Klasik", "Ağaç", "İlerleme"]) assert.ok(html.includes(`<b>${ad}</b>`));
});

test("kabuk: çizici betiksiz kalır, komut köprüsü YALNIZ gerekli üç komutla sınırlı, ayar adı çatışmasız", () => {
  const kaynak = readFileSync(fileURLToPath(new URL("../src/minigraf.ts", import.meta.url)), "utf8");
  // Founder 2026-10-21: Mini Graf kendi webview'ünü kurmaz; Sarmal panelinin Ray sekmesinde gölge kökte çizilir.
  // Betik panelindir (nonce'lu tek blok); Mini Graf çiziciler ise betiksiz kalır (aşağıdaki ve öteki sınamalar).
  assert.ok(!kaynak.includes("enableScripts") && !kaynak.includes("registerWebviewViewProvider"), "Mini Graf kendi webview'ünü kurmamalı");
  assert.deepEqual([...GRAF_KOMUTLARI].sort(), ["sarmal.dosyaAc", GORUNUM_KAPAT_KOMUTU, GORUNUM_SEC_KOMUTU].sort(), "komut köprüsü izin listesi değişmiş");
  assert.equal(grafKomutu(`command:sarmal.dosyaAc?${encodeURIComponent(JSON.stringify(["/a.sar", 3]))}`)?.komut, "sarmal.dosyaAc");
  assert.equal(grafKomutu("command:workbench.action.reloadWindow"), undefined, "izinsiz komut köprüden geçmemeli");
  assert.equal(grafKomutu("command:sarmal.dosyaAc?%7Bbozuk"), undefined, "bozuk argüman reddedilmeli");
  const paket = JSON.parse(readFileSync(fileURLToPath(new URL("../package.json", import.meta.url)), "utf8"));
  const ayar = paket.contributes.configuration.properties["sarmal.miniGrafGorunum"];
  assert.deepEqual(ayar.enum, ["klasik", "agac", "ilerleme"]);
  assert.equal(ayar.default, "agac");
  // `sarmal.miniGraf` mantıksal bir ayardır; altına ayar eklenemez (VS Code ağacı çatışır).
  assert.ok(!("sarmal.miniGraf.gorunum" in paket.contributes.configuration.properties));
  const komut = paket.contributes.commands.find((c: { command: string }) => c.command === "sarmal.miniGraf.gorunumDegistir");
  assert.ok(komut, "başlık düğmesinin komutu ilan edilmemiş");
  const menu = paket.contributes.menus["view/title"].filter((m: { command: string }) => m.command === "sarmal.miniGraf.gorunumDegistir");
  assert.equal(menu.length, 1);
  assert.match(menu[0].when, /view == sarmalPanel/);
  assert.match(menu[0].group, /^navigation/);
});

// ── Ölçek: bağ ve satır sayısı HTML boyutunu patlatmamalı ───────────────────────
//   ÖLÇÜLMÜŞ KUSUR (2026-10-22 · Sarmal deposunun gerçek planı): 713 düğüm ve
//   13.380 bağ; bütün bağları çizen Ağaç ve Klasik görünümler 1,8-2,0 MB HTML
//   üretiyor, şerit tek renkli duvara dönüyor ve panel kasıyordu.

const BOYUT_SINIRI = 300 * 1024;

function gercekPlanDagi(): Dag {
  const kok = fileURLToPath(new URL("../../../", import.meta.url)).replace(/\/$/, "");
  const dosyalar = [join(kok, "sarmal_anadizin.sar"),
    ...readdirSync(join(kok, "is/plan/faz")).filter((f) => f.endsWith(".sar")).sort().map((f) => join(kok, "is/plan/faz", f))];
  const programlar = new Map<string, Program>();
  for (const d of dosyalar) programlar.set(d, ayristir(belirtecle(readFileSync(d, "utf8"))));
  mevsimNormalize(programlar);
  return dagKur(programlar);
}

test("ÖLÇEK: gerçek planda üç görünüm de 300 KB altında kalır (seçili HST-MTR-A04 ve seçimsiz)", () => {
  const dag = gercekPlanDagi();
  assert.ok(dag.dugumler.has("HST-MTR-A04"), "ölçüt düğümü gerçek planda yok — nöbet ölçemez");
  for (const secili of ["HST-MTR-A04", ""]) {
    const graf = projeGrafiCikar(dag, secili);
    assert.ok(graf.dugumler.length > BUYUK_GRAF_ESIGI, "gerçek plan büyük graf eşiğini aşmalı (ölçek nöbeti anlamsız kalır)");
    assert.ok(graf.baglar.length > 1000, "gerçek planda binlerce bağ beklenir");
    for (const g of GORUNUMLER) {
      const boyut = gorunumHtml(graf, g).length;
      assert.ok(boyut < BOYUT_SINIRI, `${g} görünümü ${secili || "seçimsiz"} için ${(boyut / 1024).toFixed(0)} KB — sınır 300 KB`);
    }
    // Şerit YALNIZ seçili düğümün bağlarını çizer.
    const agac = gorunumHtml(graf, "agac");
    const yolSayisi = [...agac.matchAll(/<path class="(?:bag|zemin|uretir)"/g)].length;
    assert.equal(yolSayisi, cizilecekBaglar(graf).filter((b) => {
      const g2 = gorunurGraf(graf).graf;
      return g2.dugumler.some((d) => d.kod === b.once) && g2.dugumler.some((d) => d.kod === b.sonra);
    }).length);
    if (!secili) assert.equal(yolSayisi, 0, "seçimsiz grafta şerit çizilmemeli");
    assert.ok(!agac.includes(":has(") && !agac.includes(":hover~"));
  }
});

test("büyük graf daraltması: tamamlanmış alt ağaç tek satıra iner, seçili alt ağaç hiç daralmaz, küçük graf aynen kalır", () => {
  const dugumler: Array<Partial<DagDugum> & { kod: string }> = [{ kod: "F", tip: "Faz", ad: "faz" }];
  for (let b = 0; b < 40; b++) {
    dugumler.push({ kod: `B${b}`, tip: "Blok", kapsayan: "F", ad: `blok ${b}` });
    for (let a = 0; a < 9; a++) {
      dugumler.push({ kod: `A${b}-${a}`, kapsayan: `B${b}`, ad: `adım ${b}-${a}`, durum: b < 38 ? "tamamlandı" : "beklemede" });
    }
  }
  const dag = dagYap(dugumler);
  const tam = projeGrafiCikar(dag, "A5-3");
  assert.ok(tam.dugumler.length > BUYUK_GRAF_ESIGI);
  const { graf, gizli } = gorunurGraf(tam);
  // B5 seçili Adımı taşır: daralmaz. Öteki tamamlanmış Bloklar daralır. B38/B39 bitmemiştir: daralmaz.
  assert.ok(!gizli.has("B5") && graf.dugumler.some((d) => d.kod === "A5-3"));
  assert.equal(gizli.get("B4"), 9);
  assert.ok(!graf.dugumler.some((d) => d.kod === "A4-0"), "daralan alt ağacın satırı basılmış");
  assert.ok(graf.dugumler.some((d) => d.kod === "A38-0") && graf.dugumler.some((d) => d.kod === "A39-8"), "bitmemiş iş daralmamalı");
  // Daralan satırın sayısı HTML'de söylenir.
  const html = gorunumHtml(tam, "agac");
  assert.ok(html.includes("+9 tamamlanmış satır gizli"));
  // Küçük graf aynen kalır.
  const kucuk = projeGrafiCikar(ilerlemeDagi());
  assert.equal(gorunurGraf(kucuk).graf, kucuk);
});

// magaza-vitrini.test.ts — MGZ-A10 mağaza vitrini nöbeti
//
//   NEYİ ÖLÇER. Founder'ın 2026-10-10 hükmüyle mağaza vitrini iki dilde seçilmiş
//   adı ve kısa açıklamayı taşır, mağaza beniokusu eklentiye odaklanan ayrı bir
//   İngilizce dosyadır ve paket o dosyayla üretilir; depodaki Türkçe benioku
//   olduğu gibi kalır. Bu dosya bildirimi, beniokuyu ve paketleme komutlarını
//   birlikte ölçer.
//
//   ANAHTAR SÖZCÜKLER. Founder 2026-10-10 tarihinde karar sayfasının "Vitrin
//   taslağı 3: anahtar sözcükler" kaleminde önerilen otuz sözcüğün girmesine
//   hükmetmiştir. Liste aşağıda sabitlenir ve bildirim onunla sırasıyla, bire bir
//   karşılaştırılır; mağaza otuzdan fazlasına izin vermediği için bir sözcük
//   eklemek ancak bir başkasını çıkararak ve bu listeyi bilerek değiştirerek
//   mümkündür. Liste başka ürünlerin markalarını taşımaz. Eklenti ayrıca
//   mağazanın yapay zekâ kategorisinde durur (HTR-MAGAZA-VITRININDE-YAPAY-ZEKA-
//   VURGUSU-YOK); kategori adı VS Code'un kabul ettiği sabit kümeden okunmuştur.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const KOK = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const oku = (ad: string): string => readFileSync(join(KOK, ad), "utf8");
const json = (ad: string): Record<string, string> => JSON.parse(oku(ad));
const paket = JSON.parse(oku("package.json")) as {
  displayName: string;
  description: string;
  keywords: string[];
  categories: string[];
  scripts: Record<string, string>;
};

test("MGZ: manifest ad ve açıklamayı yerelleştirme anahtarlarından alır", () => {
  assert.equal(paket.displayName, "%sarmal.displayName%");
  assert.equal(paket.description, "%sarmal.description%");
});

test("MGZ: İngilizce ad ve kısa açıklama Founder'ın seçtiği metindir", () => {
  const en = json("package.nls.json");
  assert.equal(en["sarmal.displayName"], "Sarmal: Plan & Guardrails for AI Agents");
  assert.equal(
    en["sarmal.description"],
    "Write your project's plan, structure and rules in .sar files. Sarmal checks the plan against the disk on every save and serves the same truth to your AI agents over MCP.",
  );
});

test("MGZ: Türkçe ad ve kısa açıklama Founder'ın seçtiği metindir", () => {
  const tr = json("package.nls.tr.json");
  assert.equal(tr["sarmal.displayName"], "Sarmal: Yapay Zekâ Ajanları için Plan ve Ray");
  assert.equal(
    tr["sarmal.description"],
    "Projenizin planını, yapısını ve kurallarını .sar dosyalarına yazın. Sarmal her kayıtta planı diskle karşılaştırır ve aynı gerçeği MCP üzerinden yapay zekâ ajanlarınıza sunar.",
  );
});

/** Founder'ın 2026-10-10 karar sayfasında onayladığı otuz sözcük, onaylandığı sırayla. */
const KARAR_SOZCUKLERI = [
  "sarmal", "sar", "ai agents", "ai", "llm", "mcp", "model context protocol", "agentic",
  "guardrails", "planning", "project plan", "roadmap", "architecture", "drift", "drift detection",
  "linter", "diagnostics", "declarative", "dsl", "specification", "spec driven", "intent",
  "governance", "folder structure", "knowledge graph", "dependency graph", "workflow",
  "documentation", "turkish", "türkçe",
];

/** VS Code'un kabul ettiği mağaza kategorileri (EXTENSION_CATEGORIES · VS Code 1.145). */
const GECERLI_KATEGORILER = new Set([
  "AI", "Azure", "Chat", "Data Science", "Debuggers", "Extension Packs", "Education", "Formatters",
  "Keymaps", "Language Packs", "Linters", "Machine Learning", "Notebooks", "Programming Languages",
  "SCM Providers", "Snippets", "Testing", "Themes", "Visualization", "Other",
]);

test("MGZ: anahtar sözcük alanı karar sayfasındaki otuz sözcüğü bire bir taşır", () => {
  const liste = paket.keywords;
  assert.equal(KARAR_SOZCUKLERI.length, 30, "karar listesi otuz sözcüktür");
  assert.equal(liste.length, 30, `anahtar sözcük sayısı ${liste.length}; karar otuz sözcüktür`);
  assert.deepEqual(liste, KARAR_SOZCUKLERI);
  assert.equal(new Set(liste.map((s) => s.toLowerCase())).size, liste.length, "yinelenen anahtar sözcük var");
  assert.ok(!liste.some((s) => /orkestrasyon/i.test(s)), "kapalı ürün adı anahtar sözcükte bulunamaz");
});

test("MGZ: anahtar sözcükler yapay zekâ, ajan ve MCP aramasını karşılar; başka ürünün markasını taşımaz", () => {
  const liste = paket.keywords;
  for (const temel of ["ai", "ai agents", "mcp", "llm", "guardrails"])
    assert.ok(liste.includes(temel), `temel sözcük eksik: ${temel}`);
  for (const marka of [/claude/i, /copilot/i, /cursor/i, /codex/i, /gemini/i, /chatgpt/i, /openai/i])
    assert.ok(!liste.some((s) => marka.test(s)), `başka ürünün markası anahtar sözcükte bulunamaz: ${marka}`);
});

test("MGZ: eklenti mağazanın yapay zekâ kategorisindedir ve her kategori geçerlidir", () => {
  const kategoriler = paket.categories;
  assert.ok(kategoriler.includes("AI"), "AI kategorisi eksik");
  assert.ok(kategoriler.includes("Programming Languages"), "dil kategorisi eksik");
  assert.equal(new Set(kategoriler).size, kategoriler.length, "yinelenen kategori var");
  for (const k of kategoriler) assert.ok(GECERLI_KATEGORILER.has(k), `mağazanın tanımadığı kategori: ${k}`);
});

test("MGZ: mağaza beniokusu ilk bakışta kurulumu, MCP bağlantısını ve depoyu gösterir; göreli yol taşımaz", () => {
  const en = oku("README.en.md");
  assert.match(en, /^## Getting started$/m, "kurulum bölümü yok");
  assert.ok(en.includes("code --install-extension nexivion-labs.sarmal"), "kurulum komutu yok");
  assert.ok(en.includes("urun/cekirdek/src/mcp.ts"), "MCP sunucusunun bağlantı komutu yok");
  assert.ok(en.includes("https://github.com/nexivion-labs/sarmal"), "depo bağlantısı yok");
  // Mağaza göreli yolları kendi kurallarıyla çözer; görsel ve bağlantılar tam adres taşır.
  const hedefler = [...en.matchAll(/\]\(([^)\s]+)\)/g)].map((m) => m[1] ?? "");
  assert.ok(hedefler.length > 0, "beniokuda hiç bağlantı yok");
  for (const h of hedefler) assert.match(h, /^https:\/\//, `göreli ya da güvensiz bağlantı: ${h}`);
  // Tanı sayısı Türkçe beniokunun ölçülmüş sayısıyla aynıdır; iki yüz ayrı sayı söyleyemez.
  const trSayi = /Tanı metinlerinin (\d+)'i/.exec(oku("README.md"))?.[1];
  const enSayi = /Each of the (\d+) diagnostics/.exec(en)?.[1];
  assert.ok(trSayi && enSayi, "tanı sayısı iki beniokudan okunamadı");
  assert.equal(enSayi, trSayi);
});

test("MGZ: mağaza beniokusu ayrı bir İngilizce dosyadır ve Türkçe benioku ondan farklıdır", () => {
  assert.ok(existsSync(join(KOK, "README.en.md")), "README.en.md yok");
  const en = oku("README.en.md");
  const tr = oku("README.md");
  assert.notEqual(en, tr);
  assert.ok(en.startsWith("# Sarmal: Plan & Guardrails for AI Agents"));
  assert.ok(!/[ğĞşŞıİ]/.test(en), "İngilizce beniokuda Türkçe harf kalmış");
  assert.ok(!/orkestrasyon/i.test(en), "kapalı ürün adı beniokuda bulunamaz");
});

test("MGZ: paketleme komutları mağaza beniokusunu açıkça seçer", () => {
  assert.match(paket.scripts["package"] ?? "", /--readme-path README\.en\.md/);
  assert.match(oku("arac/kur.mjs"), /"--readme-path", "README\.en\.md"/);
});

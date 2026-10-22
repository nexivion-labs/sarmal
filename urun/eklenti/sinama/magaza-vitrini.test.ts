// magaza-vitrini.test.ts — MGZ-A10 mağaza vitrini nöbeti
//
//   NEYİ ÖLÇER. Founder'ın 2026-10-10 hükmüyle mağaza vitrini iki dilde seçilmiş
//   adı ve kısa açıklamayı taşır, mağaza beniokusu eklentiye odaklanan ayrı bir
//   İngilizce dosyadır ve paket o dosyayla üretilir; depodaki Türkçe benioku
//   olduğu gibi kalır. Bu dosya bildirimi, beniokuyu ve paketleme komutlarını
//   birlikte ölçer.
//
//   AÇIK SINIR. Anahtar sözcük alanının tam kümesi (karar sayfasındaki otuz
//   sözcük) bu nöbette sabitlenmez, çünkü o liste kaynakta bulunamamıştır;
//   nöbet yalnız üst sınırı, tekilliği ve kapalı ürün adının bulunmayışını ölçer.
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

test("MGZ: anahtar sözcükler mağaza sınırı içindedir, tekildir ve kapalı ürün adını taşımaz", () => {
  const liste = paket.keywords;
  assert.ok(liste.length <= 30, `anahtar sözcük sayısı ${liste.length}; mağaza otuza izin verir`);
  assert.equal(new Set(liste.map((s) => s.toLowerCase())).size, liste.length, "yinelenen anahtar sözcük var");
  assert.ok(!liste.some((s) => /orkestrasyon/i.test(s)), "kapalı ürün adı anahtar sözcükte bulunamaz");
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

// ═══════════════════════════════════════════════════════════════════════════
// sablon.test.ts — 📐 Şablon kopyalanabilirlik nöbeti (BKM-SNV2-A05/A3)
//   Sınav-2 A3 tuzağı: proje şablonundaki Takım, ilansız Teknoloji KOD'larına
//   (FLUTTER…) işaret ediyordu — kopyalayan ajan daha ilk denetle'de kırık-referans
//   yedi. Nöbet: başla('proje') şablonu kopyala → iskelet → denetle TAM-yeşil.
//   Uçtan-uca CLI ile koşulur (ajan akışının birebir aynısı — YUZ-1.2 tek yol).
// ═══════════════════════════════════════════════════════════════════════════
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SARMAL = fileURLToPath(new URL("../src/sarmal.ts", import.meta.url));
import { sablonMetni, sablonTurleri, mimariDiyalog } from "../src/sablon.ts";

test("A05/A3: başla('proje') şablonu kopyala→iskelet→denetle TAM-yeşil (kırık-referans tuzağı ölü)", () => {
  const s = sablonMetni("proje");
  assert.ok(s, "proje şablonu kütüphanede yok");
  // A3 kapanışının özü: Takım'ın bağımlı olduğu her yığın üyesi Teknoloji İLANI taşır
  assert.match(s!.sablon, /Teknoloji\(\s*kod:\s*FLUTTER/, "şablonda FLUTTER Teknoloji ilanı yok (A3 tuzağı geri döndü)");
  const kok = mkdtempSync(join(tmpdir(), "sarmal-sablon-"));
  try {
    const ana = join(kok, "ornek_anadizin.sar");
    writeFileSync(ana, s!.sablon);
    execFileSync(process.execPath, [SARMAL, ana, "--iskelet", kok], { encoding: "utf8", timeout: 30_000 });
    // denetle hata varsa sıfır-dışı çıkar → execFileSync fırlatır (yakala, çıktıyı göster)
    let cikti = "";
    try {
      cikti = execFileSync(process.execPath, [SARMAL, "denetle", kok], { encoding: "utf8", timeout: 30_000 });
    } catch (e) {
      const err = e as { stdout?: string; stderr?: string };
      assert.fail(`şablon denetle-temiz DEĞİL:\n${err.stdout ?? ""}${err.stderr ?? ""}`);
    }
    assert.match(cikti, /Drift yok/, cikti);
  } finally {
    rmSync(kok, { recursive: true, force: true });
  }
});

// ── IDA dersi (2026-07-14): ÇalışmaAlanı (bahçe) ULAŞILABİLİR olmalı ─────────
//   Fabrikadaki ajan çok-app/tek-auth vizyonunu gördü ama `basla çalışmaalanı`
//   ŞABLONU YOKTU → bahçeye uzanamadı, A/B doğaçladı. Nöbet: bahçe şablonu
//   kütüphanede + kopyala→iskelet→denetle TAM-yeşil (proje ile aynı disiplin).
test("IDA-bahçe: başla('çalışmaalanı') şablonu kopyala→iskelet→denetle TAM-yeşil", () => {
  assert.ok(sablonTurleri().includes("çalışmaalanı"), "çalışmaalanı şablon türü listede yok — bahçe ulaşılamaz");
  const s = sablonMetni("çalışmaalanı");
  assert.ok(s, "çalışmaalanı şablonu kütüphanede yok");
  assert.match(s!.sablon, /ÇalışmaAlanı\(/, "bahçe şablonu ÇalışmaAlanı kökü taşımıyor");
  assert.match(s!.sablon, /Uygulama\(/, "bahçe şablonu Uygulama (ağaç) örneği taşımıyor");
  const kok = mkdtempSync(join(tmpdir(), "sarmal-bahce-"));
  try {
    const ana = join(kok, "bahce_anadizin.sar");
    writeFileSync(ana, s!.sablon);
    execFileSync(process.execPath, [SARMAL, ana, "--iskelet", kok], { encoding: "utf8", timeout: 30_000 });
    let cikti = "";
    try {
      cikti = execFileSync(process.execPath, [SARMAL, "denetle", kok], { encoding: "utf8", timeout: 30_000 });
    } catch (e) {
      const err = e as { stdout?: string; stderr?: string };
      assert.fail(`bahçe şablonu denetle-temiz DEĞİL:\n${err.stdout ?? ""}${err.stderr ?? ""}`);
    }
    assert.match(cikti, /Drift yok/, cikti);
  } finally {
    rmSync(kok, { recursive: true, force: true });
  }
});

test("IDA-kavram: mimariDiyalog KAPSAYICI çatalını ⓪ önden sorar (Proje/Uygulama/ÇalışmaAlanı)", () => {
  const d = mimariDiyalog();
  // Üç kapsayıcı tipi de ADIYLA görünür (kavram yüzeye çıkar — ajan siniflama sormadan görsün)
  for (const tip of ["Proje", "Uygulama", "ÇalışmaAlanı"]) {
    assert.match(d, new RegExp(tip), `mimari diyalog "${tip}" kapsayıcı tipini göstermiyor`);
  }
  // Karar kuralı + uzun-vadeli-şekil ilkesi (erken daraltma panzehiri) beyanlı
  assert.match(d, /KARAR KURALI|başka app|ortak auth/i, "kapsayıcı karar kuralı yok");
  assert.match(d, /UZUN-VADELİ ŞEKİL|bugünkü tek teslimat DEĞİL/i, "uzun-vadeli-şekil ilkesi (erken daraltma panzehiri) yok");
});

// ── DIL-1.2 önek · `başla` KAYDET rehberi (GBR-A05 · IDA dogfood #3) ─────────────
//   Öneksiz `anadizin.sar` proje-düzeyinde 'ana-yok' patlıyordu; `başla proje/
//   çalışmaalanı` çıktısı beklenen KAYIT adını (<varlık>_anadizin.sar · örnekli)
//   AÇIKÇA yazsın ki ajan doğru adı baştan bilsin (giriş-içi tipler yazmaz).
test("GBR-A05: başla('proje') çıktısı beklenen giriş dosya adını örnekle yazar", () => {
  const cikti = execFileSync(process.execPath, [SARMAL, "başla", "proje"], { encoding: "utf8", timeout: 30_000 });
  assert.match(cikti, /KAYDET/, "başla proje çıktısı KAYDET rehberi taşımalı");
  assert.match(cikti, /<varlık>_anadizin\.sar/, "beklenen ad deseni yok");
  assert.match(cikti, /ida_anadizin\.sar/, "somut örnek ad (ida_anadizin.sar) yok");
});

test("GBR-A05: başla('çalışmaalanı') çıktısı da KAYDET rehberini taşır (bahçe kökü)", () => {
  const cikti = execFileSync(process.execPath, [SARMAL, "başla", "çalışmaalanı"], { encoding: "utf8", timeout: 30_000 });
  assert.match(cikti, /KAYDET/, "başla çalışmaalanı çıktısı KAYDET rehberi taşımalı");
  assert.match(cikti, /<varlık>_anadizin\.sar/);
});

test("GBR-A05: giriş-içi tip (etmen) KAYDET rehberi taşımaz — yalnız anadizin kökleri", () => {
  const cikti = execFileSync(process.execPath, [SARMAL, "başla", "etmen"], { encoding: "utf8", timeout: 30_000 });
  assert.doesNotMatch(cikti, /KAYDET/, "anadizin-olmayan tip KAYDET rehberi taşımamalı (yanlış yönlendirme)");
});

// ═══════════════════════════════════════════════════════════════════════════
// baglanti-atif.test.ts — 🔗👁️ Tıklanır yollar + çapraz-varlık bakış nöbetleri
//
//   VIT-GRAF-A14 kapanış kanıtı (VS Code'suz):
//   ① Yol katmanı — dosya:/yol:/referans: alanı diskte VAR olan yola link
//     üretir; olmayan yol link almaz (kırık yol link değildir — dürüst yüzey).
//   ② Anlatı katmanı — koşu/ne metinlerinin İÇİNDE geçen uzantılı yol sözcesi
//     link olur, :satır eki hedef satıra iner; model kimliği gibi diskte
//     olmayan yol-görünümlü sözce link almaz; alan katmanıyla teklenmez.
//   ③ Çapraz-varlık bakış kararı — kaynağın varlığında tanım varsa link
//     üretilmez (o iş F12'nindir), tüm tanımlar öbür varlıktaysa hedef seçilir,
//     çözülmeyen kod hiçbir zaman link almaz.
//   ④ İpucu AST yedeği — `kod:` alanı widget açılışından ayrı satırda yazılmış
//     tanımı satır-regex kaçırır, AST yedeği kod+tip+ne özetini yine üretir.
//   Koşum: cd eklenti && npm test
// ═══════════════════════════════════════════════════════════════════════════

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { belirtecle } from "../../cekirdek/src/belirtec.ts";
import { ayristir } from "../../cekirdek/src/ayristirici.ts";
import { yolCozumleyici, yolLinkleriTopla, type YolLinki } from "../src/baglanti-cekirdek.ts";
import { caprazAtifSec } from "../src/atif-cekirdek.ts";
import { kodTanimlariTara, tanimOzetiCikar } from "../src/ipucu-cekirdek.ts";
import type { Dugum } from "../../cekirdek/src/sozdizim.ts";

// ── Fikstür: geçici diskte GERÇEK dosyalar — varlık yoklaması gerçek olsun ──
let kok: string;
before(() => {
  kok = mkdtempSync(join(tmpdir(), "sarmal-baglanti-"));
  mkdirSync(join(kok, "alt", "klasor"), { recursive: true });
  writeFileSync(join(kok, "var.txt"), "içerik");
  writeFileSync(join(kok, "alt", "klasor", "veri.md"), "veri");
  writeFileSync(join(kok, "alt", "sozlesme.ts"), "// satırlar\n".repeat(120));
});
after(() => rmSync(kok, { recursive: true, force: true }));

function linkler(metin: string): YolLinki[] {
  const bildirimler: Dugum[] = ayristir(belirtecle(metin)).bildirimler;
  return yolLinkleriTopla(bildirimler, metin.split("\n"), yolCozumleyici([kok]));
}

// ── ① Yol katmanı ────────────────────────────────────────────────────────────

test("yol katmanı: dosya alanı diskte VAR olan yola link üretir ve aralık sözceyi birebir örter", () => {
  const metin = `Kod( kod: KOD-X, dosya: "var.txt", ne: "🍎 deneme" )`;
  const [l] = linkler(metin);
  assert.ok(l, "diskte var olan yol link üretmeliydi");
  assert.equal(l.hedef, join(kok, "var.txt"));
  assert.equal(metin.split("\n")[l.satir].slice(l.baslangic, l.bitis), "var.txt");
});

test("yol katmanı: diskte OLMAYAN yol link üretmez — kullanıcı kırık yola sessizce düşürülmez", () => {
  const metin = `Kod( kod: KOD-X, dosya: "boyle-bir-dosya-yok.txt", ne: "🍎 deneme" )`;
  assert.equal(linkler(metin).length, 0);
});

test("yol katmanı: referans listesindeki yol da link olur, listedeki olmayan yol dışarıda kalır", () => {
  const metin = `Adım( kod: ADM-X, durum: beklemede, referans: [ "alt/klasor/veri.md", "yok/boyle.md" ], ne: "🧪 deneme" )`;
  const sonuc = linkler(metin);
  assert.equal(sonuc.length, 1);
  assert.equal(sonuc[0].hedef, join(kok, "alt", "klasor", "veri.md"));
});

// ── ② Anlatı katmanı ─────────────────────────────────────────────────────────

test("anlatı katmanı: koşu metninin içinde geçen çözülür yol link olur, :satır eki hedef satıra iner", () => {
  const metin = `Adım( kod: ADM-X, durum: beklemede, koşu: "Ölçüm alt/sozlesme.ts:106 kaydında yaşar", ne: "🧪 deneme" )`;
  const sonuc = linkler(metin);
  assert.equal(sonuc.length, 1);
  assert.equal(sonuc[0].hedef, join(kok, "alt", "sozlesme.ts"));
  assert.equal(sonuc[0].hedefSatiri, 106);
  assert.equal(metin.split("\n")[sonuc[0].satir].slice(sonuc[0].baslangic, sonuc[0].bitis), "alt/sozlesme.ts:106");
});

test("anlatı katmanı: diskte olmayan yol-görünümlü sözce (model kimliği) link almaz", () => {
  const metin = `Etmen( kod: ETM-X, koşu: "Model deepseek-ai/deepseek-v4.pro kimliğiyle koşar", ne: "🤖 deneme" )`;
  assert.equal(linkler(metin).length, 0);
});

test("anlatı katmanı: alan katmanının zaten linklediği değer İKİNCİ kez link almaz (tekleme)", () => {
  const metin = `Kod( kod: KOD-X, dosya: "alt/klasor/veri.md", ne: "🍎 deneme" )`;
  const sonuc = linkler(metin);
  assert.equal(sonuc.length, 1, "aynı sözce iki katmandan iki link doğurmamalı");
});

test("anlatı katmanı: çok satırlı metnin ikinci satırındaki yol kendi belge satırında bulunur", () => {
  const metin = [
    `Adım( kod: ADM-X, durum: beklemede, ne: """`,
    `ilk satır anlatıdır`,
    `ikinci satır alt/klasor/veri.md dosyasına değinir""" )`,
  ].join("\n");
  const sonuc = linkler(metin);
  assert.equal(sonuc.length, 1);
  assert.equal(sonuc[0].satir, 2);
});

// ── ③ Çapraz-varlık bakış kararı ─────────────────────────────────────────────

const vk = (yol: string): string | undefined =>
  yol.startsWith("/is/A/") ? "/is/A" : yol.startsWith("/is/B/") ? "/is/B" : undefined;

test("çapraz bakış: kaynağın KENDİ varlığında tanım varsa link üretilmez — o iş F12'nindir", () => {
  const tanimlar = [{ dosya: "/is/A/plan.sar" }, { dosya: "/is/B/plan.sar" }];
  assert.equal(caprazAtifSec(tanimlar, "/is/A", vk), undefined);
});

test("çapraz bakış: tüm tanımlar ÖBÜR varlıktaysa hedef seçilir (salt-okunur bakışın kapısı)", () => {
  const tanimlar = [{ dosya: "/is/B/plan.sar" }];
  assert.equal(caprazAtifSec(tanimlar, "/is/A", vk)?.dosya, "/is/B/plan.sar");
});

test("çapraz bakış: çözülmeyen kod (tanımsız) hiçbir zaman link almaz — dürüst yüzey", () => {
  assert.equal(caprazAtifSec([], "/is/A", vk), undefined);
});

test("çapraz bakış: köksüz tanım F12'de zaten görünür sayılır ve çapraz link doğurmaz", () => {
  const tanimlar = [{ dosya: "/koksuz/notlar.sar" }];
  assert.equal(caprazAtifSec(tanimlar, "/is/A", vk), undefined);
});

test("çapraz bakış: köksüz KAYNAK için link üretilmez — F12 orada sınır çizmez", () => {
  const tanimlar = [{ dosya: "/is/B/plan.sar" }];
  assert.equal(caprazAtifSec(tanimlar, undefined, vk), undefined);
});

// ── ④ İpucu AST yedeği ───────────────────────────────────────────────────────

const COK_SATIRLI_TANIM = [
  `Etmen(`,
  `  kod: ETM-COK-SATIR,`,
  `  ad: "ayrı satır etmeni",`,
  `  ne: "🤖 kod alanı açılıştan ayrı satırda yazılmış tanım" )`,
].join("\n");

test("ipucu yedeği: satır-regex'in KAÇIRDIĞI çok satırlı tanımı AST yedeği kod+tip+ne ile bulur", () => {
  // Önce kusurun varlığı ölçülür: satır-regex bu tanımı gerçekten kaçırıyor.
  assert.ok(!kodTanimlariTara(COK_SATIRLI_TANIM).some((t) => t.kod === "ETM-COK-SATIR"),
    "satır-regex bu tanımı görüyorsa yedeğin gerekçesi kalmamıştır — ölçümü tazele");
  const ozet = tanimOzetiCikar(COK_SATIRLI_TANIM, "ETM-COK-SATIR");
  assert.equal(ozet?.tip, "Etmen");
  assert.equal(ozet?.ad, "ayrı satır etmeni");
  assert.match(ozet?.ne ?? "", /ayrı satırda yazılmış/u);
});

test("ipucu yedeği: tanımı olmayan koda özet uydurulmaz", () => {
  assert.equal(tanimOzetiCikar(COK_SATIRLI_TANIM, "YOK-BOYLE-KOD"), undefined);
});

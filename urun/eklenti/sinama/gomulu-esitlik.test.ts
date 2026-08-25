// ═══════════════════════════════════════════════════════════════════════════
// gomulu-esitlik.test.ts — 🍎 KAYNAK ↔ GÖMÜLÜ KANON EŞİTLİK NÖBETİ (GOC-KANON-A06)
//
//   Gömülü kanon (src/gomulu-kanon.ts) yalnız üreticiden (arac/renk-uret.mjs)
//   doğar ve kaynak sınıflama kayıtlarıyla (oz/siniflama/*.json) BİREBİR kalır.
//   Bu nöbet süitin zorunlu önkoşuludur: kaynak değişip üretici koşulmadıysa,
//   ya da gömülü elle düzenlendiyse, süit build beklemeden kırmızı yanar.
//   Yeni omurga sözleşmeleri (üç tip · rejim · departman) gömülü yüzden de
//   ayrıca doğrulanır — dış projeler bu sözleşmeleri gömülüden okur (U4).
// ═══════════════════════════════════════════════════════════════════════════
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { GOMULU_KAYIT, GOMULU_REHBER } from "../src/gomulu-kanon.ts";

const oku = (u: string): unknown =>
  JSON.parse(readFileSync(fileURLToPath(new URL(u, import.meta.url)), "utf8"));

test("ÖNKOŞUL: gömülü kanon kaynak sınıflama kayıtlarıyla birebir (elle ikiz yok)", () => {
  assert.deepEqual(GOMULU_KAYIT, oku("../../../oz/siniflama/kayit.json"),
    "GOMULU_KAYIT kaynaktan sapmış — kaynak değişince üretici koşulmalı (npm run build); gömülü elle düzenlenemez");
  assert.deepEqual(GOMULU_REHBER, oku("../../../oz/siniflama/rehber.json"),
    "GOMULU_REHBER kaynaktan sapmış — üretici koşulmalı; gömülü elle düzenlenemez");
});

test("gömülü yüz yeni omurga sözleşmelerini taşır (dış proje kör kalmaz)", () => {
  const k = GOMULU_KAYIT as {
    widgetTipleri: Array<{ ad: string }>;
    semalar: Record<string, { enum?: Record<string, string[]> }>;
    izinliSarma: Record<string, string[]>;
  };
  for (const ad of ["Meyve", "KimlikKökü", "KimlikSağlayıcısı"]) {
    assert.ok(k.widgetTipleri.some((t) => t.ad === ad), `${ad} gömülü widgetTipleri yüzünde yok`);
    assert.ok(k.semalar[ad], `${ad} gömülü semalar yüzünde yok`);
  }
  assert.ok(!k.widgetTipleri.some((t) => t.ad === "Kimlik"), "eski 'Kimlik' tip adı gömülüde geri gelemez");
  assert.deepEqual(k.semalar["Proje"].enum?.["rejim"], ["katı", "esnek"], "rejim enumu gömülüde eksik");
  assert.deepEqual(k.semalar["AltKatman"].enum?.["departman"],
    ["planlama", "kodlama", "sınama", "inceleme", "güvenlik"], "departman beşlisi gömülüde eksik");
  assert.deepEqual(k.semalar["KimlikSağlayıcısı"].enum?.["tür"],
    ["google", "github", "linkedin", "apple", "microsoft", "sso"], "sağlayıcı taban altılısı gömülüde eksik");
  assert.deepEqual(k.izinliSarma["Adım"], ["Meyve"], "Adım→Meyve sarma izni gömülüde eksik");
});

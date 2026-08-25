// ═══════════════════════════════════════════════════════════════════════════
// baglam-haritasi.test.ts — 🗺️ Bağlam→kavram haritasının kırık-işaretçi nöbeti (KVR-A07)
//
//   Söz (KVR-A02 tasarımı · Founder onaylı): harita kavram KOPYALAMAZ, kanon
//   yoluyla işaret eder (TIP-3) ve ÖNERİR, zorlamaz — denetçi bu dosyayı
//   okumaz, nöbet YALNIZ buradadır (emoji-yazim eşitlik-nöbeti emsali).
//   Üç nöbet: ① her üye yolu kanonda çözülür ② her önerilen aile tanımlıdır
//   ③ şemada zorlayıcı alan (önem/zorunluluk/tanı) belirEMEZ — belirirse kırar.
// ═══════════════════════════════════════════════════════════════════════════

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const oku = (yol: string): unknown =>
  JSON.parse(readFileSync(fileURLToPath(new URL(yol, import.meta.url)), "utf8"));

const KANON = oku("../../../ogreti/bilgi/tasarim_sozlugu/kayit.json") as Record<string, unknown>;
const HARITA = oku("../../../ogreti/bilgi/tasarim_sozlugu/baglam-haritasi.json") as {
  aileler: Record<string, { soru: string; üyeler: string[] }>;
  bağlamlar: Record<string, { öner: string[] }>;
};

/** Kanon yolunu ("onyuz.bilesen.menü") kayit.json içinde çözer; bulunamazsa undefined. */
const kanondaCoz = (yol: string): unknown =>
  yol.split(".").reduce<unknown>(
    (dugum, parca) =>
      dugum && typeof dugum === "object" ? (dugum as Record<string, unknown>)[parca] : undefined,
    KANON);

// ── ① Kırık işaretçi: her üye yolu kanonda yaşamalı ──────────────────────────

test("kırık-işaretçi nöbeti: haritadaki her üye yolu kanonda çözülür", () => {
  for (const [ad, aile] of Object.entries(HARITA.aileler)) {
    for (const uye of aile.üyeler) {
      assert.notEqual(kanondaCoz(uye), undefined,
        `kanonda çözülmeyen üye yolu: ${ad} → ${uye} (kavram kanondan kalktıysa haritadan da kaldır; ` +
        `ad değiştiyse yeni kanon yolunu yaz — TIP-3: kimlik = kanon yolu)`);
    }
  }
});

test("kırık-işaretçi nöbeti: üye yolu YAPRAK kavramdır, bölüm değil", () => {
  for (const [ad, aile] of Object.entries(HARITA.aileler)) {
    for (const uye of aile.üyeler) {
      const dugum = kanondaCoz(uye) as Record<string, unknown>;
      const yaprak = dugum && typeof dugum === "object" &&
        Object.values(dugum).every((v) => typeof v === "string");
      assert.ok(yaprak,
        `üye yolu bölüme işaret ediyor, kavrama değil: ${ad} → ${uye} (aile üyesi tek kavramdır; ` +
        `bütün bölümü önermek aileyi anlamsızlaştırır)`);
    }
  }
});

// ── ② Tanımsız aile: bağlam yalnız var olan aileyi önerebilir ────────────────

test("aile nöbeti: her bağlamın önerdiği aile tanımlıdır", () => {
  for (const [baglam, kayit] of Object.entries(HARITA.bağlamlar)) {
    for (const aile of kayit.öner) {
      assert.ok(HARITA.aileler[aile],
        `tanımsız aile atfı: ${baglam} → ${aile} (aileler bölümünde tanımla ya da öneriden kaldır)`);
    }
  }
});

test("aile nöbeti: her aile soru ve en az bir üye taşır", () => {
  for (const [ad, aile] of Object.entries(HARITA.aileler)) {
    assert.ok(aile.soru && aile.soru.trim().length > 0, `sorusuz aile: ${ad} (soru ajanın diyalog açılışıdır)`);
    assert.ok(Array.isArray(aile.üyeler) && aile.üyeler.length > 0, `üyesiz aile: ${ad}`);
  }
});

// ── ③ Zorlamasızlık YAPIDA: zorlayıcı alan belirirse test kırar ──────────────

test("zorlamasızlık nöbeti: şemada zorlayıcı alan yok — öneri üretir, kural üretemez", () => {
  const AILE_ALANLARI = ["soru", "üyeler"];
  const BAGLAM_ALANLARI = ["öner"];
  for (const [ad, aile] of Object.entries(HARITA.aileler)) {
    for (const anahtar of Object.keys(aile)) {
      assert.ok(AILE_ALANLARI.includes(anahtar),
        `ailede zorlayıcı/tanımsız alan: ${ad}.${anahtar} (izinli alanlar: ${AILE_ALANLARI.join(" · ")} — ` +
        `zorlamasızlık niyette değil YAPIDADIR, KVR-A02 tasarım onayı)`);
    }
  }
  for (const [baglam, kayit] of Object.entries(HARITA.bağlamlar)) {
    for (const anahtar of Object.keys(kayit)) {
      assert.ok(BAGLAM_ALANLARI.includes(anahtar),
        `bağlamda zorlayıcı/tanımsız alan: ${baglam}.${anahtar} (izinli alan: öner)`);
    }
  }
});

// ── Doğrulanmış iki bağlam (KVR-A02 kabul ölçütü ①) yaşamaya devam eder ──────

test("doğrulanmış bağlamlar: Ekran ve Adım.görev kayıtları haritada yaşar", () => {
  assert.ok(HARITA.bağlamlar["Ekran"], "Ekran bağlamı tasarımın doğrulanmış örneğidir — silinemez");
  assert.ok(HARITA.bağlamlar["Adım.görev"], "Adım.görev bağlamı tasarımın doğrulanmış örneğidir — silinemez");
});

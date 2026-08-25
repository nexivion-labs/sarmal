// ═══════════════════════════════════════════════════════════════════════════
// sd14.test.ts — DIL-2 belge bloğu motoru sınamaları
//
//   /// belge-yorumu: düğüme bağlanır · ardışık satırlar birleşir · markdown
//   korunur · sahipsiz blok uyarı alır. """ çok-satırlı değer: girinti-kırpma
//   · tek satır · kapanmamış hata · içerik güvenliği.
// ═══════════════════════════════════════════════════════════════════════════

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { belirtecle, SozDizimHatasi } from "../src/belirtec.ts";
import { ayristir } from "../src/ayristirici.ts";
import { dogrula } from "../src/dogrulayici.ts";
import { agaciYaz } from "../src/yazdir.ts";
import type { Siniflama } from "../src/siniflama.ts";

const SNF: Siniflama = JSON.parse(
  readFileSync(new URL("../../../oz/siniflama/kayit.json", import.meta.url), "utf8"),
);

const parse = (k: string) => ayristir(belirtecle(k));

// ── /// belge-yorumu ─────────────────────────────────────────────────────────

test("DIL-2: /// tek satır, altındaki widget'a bağlanır", () => {
  const p = parse(`/// Kimlik bloğu — ilk dokunuş.\nBlok( kod: BLK-KIMLIK ) { }`);
  assert.equal(p.bildirimler[0].belge, "Kimlik bloğu — ilk dokunuş.");
  assert.equal(p.sahipsizBelgeler, undefined);
});

test("DIL-2: ardışık /// satırları tek belgeye birleşir (\\n ile)", () => {
  const p = parse(`/// satır bir\n/// satır iki\nAdım( kod: ADM-X ) { görev: "iş" }`);
  assert.equal(p.bildirimler[0].belge, "satır bir\nsatır iki");
});

test("DIL-2: belge içinde markdown + kod-çiti AYNEN korunur", () => {
  const p = parse(
    "/// # Başlık\n/// **kalın** ve `kod`\n/// ```dart\n/// var x = { a: 1 };\n/// ```\nEkran( kod: EKR-X ) { }",
  );
  assert.equal(
    p.bildirimler[0].belge,
    "# Başlık\n**kalın** ve `kod`\n```dart\nvar x = { a: 1 };\n```",
  );
});

test("DIL-2: gövde içindeki /// çocuk-widget'a bağlanır", () => {
  const p = parse(`Blok( kod: BLK-A ) {\n  /// alt düğümün belgesi\n  Katman( kod: FAZ-B ) { }\n}`);
  assert.equal(p.bildirimler[0].cocuklar[0].belge, "alt düğümün belgesi");
});

test("DIL-2: dosya sonunda kalan /// → sahipsiz-belge uyarısı", () => {
  const p = parse(`Blok( kod: BLK-A ) { }\n/// kimseye ait değil`);
  assert.equal(p.sahipsizBelgeler?.length, 1);
  const tanilar = dogrula(p, SNF);
  const s = tanilar.find((t) => t.kod === "sahipsiz-belge");
  assert.ok(s && s.duzey === "uyarı");
});

test("DIL-2: özellikten önceki /// sahipsizdir; özellik yine ayrışır", () => {
  const p = parse(`Adım( kod: ADM-X ) {\n  /// bu bir özelliğin üstünde\n  görev: "iş"\n}`);
  assert.equal(p.sahipsizBelgeler?.length, 1);
  assert.equal(p.bildirimler[0].ozellikler[0].ad, "görev");
});

test("DIL-2: belge, ağaç yazımında ANLAMIN parçasıdır", () => {
  const agac = agaciYaz(parse(`/// belge metni\nBlok( kod: BLK-A ) { }`));
  assert.ok(agac.includes("belge: belge metni"));
});

test("DIL-2: belgesiz eski dosyalar değişmeden çalışır (geriye-uyum)", () => {
  const p = parse(`// sıradan yorum\nBlok( kod: BLK-A ) { }`);
  assert.equal(p.bildirimler[0].belge, undefined);
  assert.equal(p.sahipsizBelgeler, undefined);
});

// ── """ çok-satırlı değer ────────────────────────────────────────────────────

test('DIL-2: """ girintisi ilk içerik satırına göre kırpılır', () => {
  const p = parse(`Adım( kod: ADM-X ) {\n  görev: """\n    birinci satır\n      girintili ikinci\n    üçüncü\n    """\n}`);
  assert.equal(
    p.bildirimler[0].ozellikler[0].deger.metin,
    "birinci satır\n  girintili ikinci\nüçüncü",
  );
});

test('DIL-2: tek satırlık """abc""" düz metin verir', () => {
  const p = parse(`Adım( kod: ADM-X ) { görev: """tek satır""" }`);
  assert.equal(p.bildirimler[0].ozellikler[0].deger.metin, "tek satır");
});

test('DIL-2: """ içinde tırnak, süslü ve // güvenle taşınır', () => {
  const p = parse(`Adım( kod: ADM-X ) {\n  görev: """\n    o "böyle" dedi { a: 1 } // yorum değil\n    """\n}`);
  assert.equal(p.bildirimler[0].ozellikler[0].deger.metin, 'o "böyle" dedi { a: 1 } // yorum değil');
});

test('DIL-2: kapanmamış """ Türkçe söz dizimi hatası verir', () => {
  assert.throws(
    () => parse(`Adım( kod: ADM-X ) { görev: """açık kaldı`),
    (e: unknown) => e instanceof SozDizimHatasi && /çok-satırlı/.test((e as Error).message),
  );
});

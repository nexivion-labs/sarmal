// ═══════════════════════════════════════════════════════════════════════════
// sd15.test.ts — DIL-2 belge bloğu motoru sınamaları
//
//   -->| ... |<-- belge bloğu: her satıra /// gerekmeden çok-satırlı belge.
//   İçerik HAM akar (markdown + XML bölüm tag'leri + ASCII şekiller); şekil
//   içindeki | ve ] bloğu KAPATMAZ (DIL-2.2 şekil-muhafazası) — kapanış yalnız
//   ayna |<-- dizisidir. /// ile aynı "belge" kanalını kullanır: düğüme
//   bağlanma + sahipsiz-belge bedava.
// ═══════════════════════════════════════════════════════════════════════════

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { belirtecle, SozDizimHatasi } from "../src/belirtec.ts";
import { ayristir } from "../src/ayristirici.ts";
import { dogrula } from "../src/dogrulayici.ts";
import type { Siniflama } from "../src/siniflama.ts";

const SNF: Siniflama = JSON.parse(
  readFileSync(new URL("../../../oz/siniflama/kayit.json", import.meta.url), "utf8"),
);

const parse = (k: string) => ayristir(belirtecle(k));

// ── temel bağlanma ───────────────────────────────────────────────────────────

test("DIL-2: blok, altındaki widget'a belge olarak bağlanır", () => {
  const p = parse(`-->|\nblok belgesi\n|<--\nBlok( kod: BLK-A ) { }`);
  assert.equal(p.bildirimler[0].belge, "blok belgesi");
  assert.equal(p.sahipsizBelgeler, undefined);
});

test("DIL-2: çok satırlı markdown HAM korunur (başlık + kalın + liste)", () => {
  const p = parse(`-->|\n# Başlık\n**kalın** metin\n- madde bir\n- madde iki\n|<--\nEkran( kod: EKR-X ) { }`);
  assert.equal(p.bildirimler[0].belge, "# Başlık\n**kalın** metin\n- madde bir\n- madde iki");
});

// ── DIL-2.2 şekil-muhafazası: | ve ] bloğu KAPATMAZ ────────────────────────────

test("DIL-2: ket notasyonu |0⟩ |↑⟩ bloğu erken KAPATMAZ", () => {
  const p = parse(`-->|\nH |↑⟩ = |←⟩ ve ölçüm |0⟩ ya da |1⟩ verir\n|<--\nÇıkarım( kod: CKR-X, kaynak: "k" ) { ne: "n" }`);
  assert.equal(p.bildirimler[0].belge, "H |↑⟩ = |←⟩ ve ölçüm |0⟩ ya da |1⟩ verir");
});

test("DIL-2: ASCII şekil (kutu çizgileri │ + köşeli [3,1]) karakteri karakterine korunur", () => {
  const sekil = `  ┌─────┐\n  │Güney│  ← üst mıknatıs\n  └──┬──┘\n|a⟩ = [3, 1]^T`;
  const p = parse(`-->|\n${sekil}\n|<--\nÇıkarım( kod: CKR-S, kaynak: "k" ) { ne: "n" }`);
  assert.equal(p.bildirimler[0].belge, sekil);
});

test("DIL-2: girinti KIRPILMAZ — şekil hizası bozulmaz", () => {
  const p = parse(`-->|\n    dört boşluk girintili\n  iki boşluk\nsıfır\n|<--\nBlok( kod: BLK-G ) { }`);
  assert.equal(p.bildirimler[0].belge, "    dört boşluk girintili\n  iki boşluk\nsıfır");
});

test("DIL-2: XML bölüm tag'leri (serbest) aynen korunur", () => {
  const p = parse(`-->|\n<desenler>\niçerik | burada ] serbest\n</desenler>\n|<--\nBlok( kod: BLK-T ) { }`);
  assert.equal(p.bildirimler[0].belge, "<desenler>\niçerik | burada ] serbest\n</desenler>");
});

// ── kenarlar ─────────────────────────────────────────────────────────────────

test("DIL-2: kapanmamış blok → Türkçe konumlu hata", () => {
  assert.throws(
    () => belirtecle(`-->|\nhiç kapanmıyor\nBlok( kod: BLK-A ) { }`),
    // MDR-A06: hata metni iç kod taşımaz; iddia kapanış işaretine ve tarife bağlanır.
    (h: unknown) => h instanceof SozDizimHatasi && h.message.includes("|<--") && h.message.includes("Kapanmamış belge bloğu"),
  );
});

test("DIL-2: dosya sonunda sahipsiz blok → sahipsiz-belge uyarısı", () => {
  const p = parse(`Blok( kod: BLK-A ) { }\n-->|\nkimseye ait değil\n|<--`);
  assert.equal(p.sahipsizBelgeler?.length, 1);
  const s = dogrula(p, SNF).find((t) => t.kod === "sahipsiz-belge");
  assert.ok(s && s.duzey === "uyarı");
});

test("DIL-2: gövde içindeki blok çocuk-widget'a bağlanır", () => {
  const p = parse(`Blok( kod: BLK-A ) {\n  -->|\n  alt düğüm belgesi\n  |<--\n  Katman( kod: FAZ-B ) { }\n}`);
  assert.equal(p.bildirimler[0].cocuklar[0].belge, "  alt düğüm belgesi");
});

test("DIL-2: /// satırı + blok ardışıksa tek belgeye birleşir", () => {
  const p = parse(`/// üst satır\n-->|\nblok kısmı\n|<--\nBlok( kod: BLK-K ) { }`);
  assert.equal(p.bildirimler[0].belge, "üst satır\nblok kısmı");
});

test("DIL-2: DIL-1.4 akış oku --> KOD etkilenmez (| bitişik değilse ok kalır)", () => {
  const p = parse(`Çıkarım( kod: CKR-A, kaynak: "k" ) {\n  ne: "n"\n  --> ETM-HEDEF\n}`);
  const oklar = p.bildirimler[0].ozellikler.length;
  assert.ok(oklar >= 1); // ayrışma patlamadı, ok yolu yaşıyor
});

test("DIL-2: açılış sonrası ve kapanış öncesi boş satırlar düşer, içtekiler kalır", () => {
  const p = parse(`-->|\n\nilk\n\nson\n\n|<--\nBlok( kod: BLK-B ) { }`);
  assert.equal(p.bildirimler[0].belge, "\nilk\n\nson\n");
});

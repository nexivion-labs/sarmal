// ═══════════════════════════════════════════════════════════════════════════
// atif-ipucu.test.ts — 🔗💡 Atıf görünümü + ipucu saf çekirdeği sınamaları
//
//   NTK-A01 kapanış kanıtı (VS Code'suz):
//   ① Link kararı — tanımlı KOD atfı işaretlenir, tanımsız sözce işaretlenmez,
//     tanımın kendisi atıf sayılmaz; yorum satırı ve belge bloğu kapsamdadır.
//   ② Tanım taraması — `kod: X` bildirimleri bulunur; Karar düğümünde hüküm
//     (karar: "…") da yakalanır — K-XX ipucusu hükmü dosya açmadan gösterir.
//   ③ Karar metni eki — başlıkla aynıysa yinelenmez, 420 karakterde kesilir.
//   ④ Belge bloğu tespiti — -->| |<-- karakter hassas iç/dış ayrımı.
//   Koşum: cd eklenti && npm test
// ═══════════════════════════════════════════════════════════════════════════

import { test } from "node:test";
import assert from "node:assert/strict";
import { atifAraliklariTopla, KOD_DESENI } from "../src/atif-cekirdek.ts";
import { kodTanimlariTara, kararMetniEki, blokIcindeMi } from "../src/ipucu-cekirdek.ts";

// ── ① Link kararı (atif-cekirdek) ────────────────────────────────────────────

test("link kararı: tanımlı KOD atfı işaretlenir, tanımsız sözce işaretlenmez", () => {
  const satirlar = [
    `Adım( kod: ADM-BIR, bağımlı: [ K-997, YOK-BOYLE-KOD ] )`,
  ];
  const a = atifAraliklariTopla(satirlar, new Set(["K-997", "ADM-BIR"]), new Set(["ADM-BIR@0"]));
  assert.deepEqual(a.map((x) => x.kod), ["K-997"]);   // tanımsız YOK-BOYLE-KOD dışarıda, tanımın kendisi ADM-BIR dışarıda
});

test("link kararı: tanımın kendisi atıf değil — ama BAŞKA satırdaki aynı kod atıftır", () => {
  const satirlar = [
    `Adım( kod: ADM-BIR )`,
    `// ADM-BIR yukarıda tanımlandı — bu satırdaki link olur`,
  ];
  const a = atifAraliklariTopla(satirlar, new Set(["ADM-BIR"]), new Set(["ADM-BIR@0"]));
  assert.equal(a.length, 1);
  assert.equal(a[0].satir, 1);
});

test("link kararı: yorum satırı ve belge bloğu satırı da kapsamdadır (Founder netleştirmesi)", () => {
  const satirlar = [
    `-->|`,
    `  Bu tasarım K-997 kararına dayanır.`,
    `|<--`,
    `// bakınız: K-997`,
  ];
  const a = atifAraliklariTopla(satirlar, new Set(["K-997"]), new Set());
  assert.deepEqual(a.map((x) => x.satir), [1, 3]);
});

test("link kararı: aralık sütunları sözceyi birebir örter", () => {
  const satir = `  referans: [ K-997 ]`;
  const [a] = atifAraliklariTopla([satir], new Set(["K-997"]), new Set());
  assert.equal(satir.slice(a.baslangic, a.bitis), "K-997");
});

test("KOD deseni: tireli BÜYÜK-harf kimlik tanınır, düz kelime ve küçük harf tanınmaz", () => {
  const bul = (m: string) => [...m.matchAll(KOD_DESENI)].map((e) => e[0]);
  assert.deepEqual(bul("K-997 RF-T6-A05 NTK-A08"), ["K-997", "RF-T6-A05", "NTK-A08"]);
  assert.deepEqual(bul("kelime adım-bir Adım"), []);
});

// ── ② Tanım taraması (ipucu-cekirdek) ────────────────────────────────────────

test("tanım taraması: kod + tip + ne yakalanır; ne sonraki satırlarda da aranır", () => {
  const t = kodTanimlariTara(
    `Adım( kod: ADM-X, durum: beklemede,\n` +
    `  ne: "🧪 Deneme amacı" )\n` +
    `Blok( kod: BLK-Y, ne: "🪵 Gövde" )`);
  assert.equal(t.length, 2);
  assert.deepEqual(t[0], { kod: "ADM-X", satir: 0, tip: "Adım", ne: "🧪 Deneme amacı", hukum: undefined, ozet: undefined });
  assert.equal(t[1].tip, "Blok");
});

test("tanım taraması: Karar düğümünde hüküm (karar:) de yakalanır — K-XX ipucusu hükmü gösterir", () => {
  const t = kodTanimlariTara(
    `Karar( kod: K-999, tarih: "2026-07-18",\n` +
    `  ne: "🧪 Deneme kararı",\n` +
    `  karar: "Bu bir deneme hükmüdür — ipucu penceresinde görünecektir" )`);
  assert.equal(t.length, 1);
  assert.equal(t[0].hukum, "Bu bir deneme hükmüdür — ipucu penceresinde görünecektir");
});

test("tanım taraması: Karar OLMAYAN düğümde hüküm aranmaz", () => {
  const t = kodTanimlariTara(`Adım( kod: ADM-Z, karar: "bu alan hüküm değildir" )`);
  assert.equal(t[0].hukum, undefined);
});

// ── ③ Karar metni eki ────────────────────────────────────────────────────────

test("karar metni eki: hüküm iner, başlıkla aynıysa yinelenmez, hükümsüz kayıtta boştur", () => {
  assert.match(kararMetniEki({ ne: "başlık", hukum: "hüküm cümlesi" }), /⚖️ \*\*Karar metni:\*\* hüküm cümlesi/u);
  assert.equal(kararMetniEki({ ne: "aynı", hukum: "aynı" }), "");
  assert.equal(kararMetniEki({ ne: "başlık" }), "");
});

test("karar metni eki: 420 karakteri aşan hüküm kesilir", () => {
  const ek = kararMetniEki({ ne: "b", hukum: "h".repeat(500) });
  assert.ok(ek.includes("h".repeat(420) + "…"));
  assert.ok(!ek.includes("h".repeat(421)));
});

// ── ④ Belge bloğu tespiti ────────────────────────────────────────────────────

test("belge bloğu: açılış sonrası içeride, kapanış sonrası dışarıda", () => {
  const satirlar = [`-->|`, `  içerik satırı`, `|<--`, `Adım( kod: A )`];
  assert.equal(blokIcindeMi(satirlar, 1, 4), true);
  assert.equal(blokIcindeMi(satirlar, 3, 0), false);
});

test("belge bloğu: karakter hassastır — aynı satırda açılıştan önce dışarıda, sonra içeride", () => {
  const satirlar = [`Adım( kod: A )  -->| blok başladı`];
  assert.equal(blokIcindeMi(satirlar, 0, 5), false);    // -->| işaretinden önce
  assert.equal(blokIcindeMi(satirlar, 0, 25), true);    // -->| işaretinden sonra
});

// ── NTK-A09: özet katmanı ipucu yüzü ─────────────────────────────────────────
test("özet katmanı: Karar'ın özet: alanı yakalanır ve ipucu ekinde HÜKÜMDEN ÖNCE gösterilir", () => {
  const t = kodTanimlariTara(
    `Karar( kod: K-998, sıra: 1, durum: kilitli,\n` +
    `  özet: "Bağlamsız okunur tek paragraf özet.",\n` +
    `  ne: "K-998 · deneme kararı",\n` +
    `  karar: "Ham hüküm cümlesi tarihçedir" )`);
  assert.equal(t[0].ozet, "Bağlamsız okunur tek paragraf özet.");
  const ek = kararMetniEki(t[0]);
  const ozetIdx = ek.indexOf("💡 **Özet:**");
  const hukumIdx = ek.indexOf("⚖️ **Karar metni:**");
  assert.ok(ozetIdx !== -1 && hukumIdx !== -1 && ozetIdx < hukumIdx, "özet hükümden önce gelmeli");
});

test("özet katmanı: özetsiz karar eski davranışını korur (yalnız hüküm eki)", () => {
  const ek = kararMetniEki({ ne: "başlık", hukum: "hüküm" });
  assert.ok(!ek.includes("Özet") && ek.includes("⚖️ **Karar metni:** hüküm"));
});

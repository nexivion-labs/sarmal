// ═══════════════════════════════════════════════════════════════════════════
// kuralci.test.ts — Kuralcı M-1 sınamaları (PLN-6)
//
//   Kural hijyeni (katman-uyumsuz · zorlanamayan-kural · ebedi-ihlal) +
//   koni-taşması + Değerlendirme (ağırlık-toplamı · eşik-sırası) + eşik defteri.
// ═══════════════════════════════════════════════════════════════════════════

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { belirtecle } from "../src/belirtec.ts";
import { ayristir } from "../src/ayristirici.ts";
import { dogrula } from "../src/dogrulayici.ts";
import { esikDefteri, ebediEnvanter, ebediTanilar, kurallariCikar, dugumeDusenKurallar, kuralNe } from "../src/kuralci.ts";
import type { Siniflama } from "../src/siniflama.ts";
import type { Dugum } from "../src/sozdizim.ts";

const SNF: Siniflama = JSON.parse(
  readFileSync(new URL("../../../oz/siniflama/kayit.json", import.meta.url), "utf8"),
);

const dnt = (k: string) => dogrula(ayristir(belirtecle(k)), SNF);
const kodlar = (k: string) => dnt(k).map((t) => t.kod);

// ── kural hijyeni ────────────────────────────────────────────────────────────

test("M-1: niyet katmanı + koşul → katman-uyumsuz", () => {
  const t = dnt(`Kural x( kod: KRL-A, katman: niyet ) {
    ne: "niyet ama koşullu"
    koşul: güven >= 0.7
  }`);
  assert.ok(t.some((x) => x.kod === "katman-uyumsuz" && /ZORLANAMAZ/.test(x.mesaj)));
});

test("M-1: eşik katmanı koşulsuz → zorlanamayan-kural", () => {
  assert.ok(kodlar(`Kural x( kod: KRL-B, katman: eşik ) { ne: "koşulsuz eşik" }`)
    .includes("zorlanamayan-kural"));
});

test("M-1: yapısal katman koşulsuz → zorlanamayan-kural", () => {
  assert.ok(kodlar(`Kural x( kod: KRL-B2, katman: yapısal ) { ne: "koşulsuz yapısal" }`)
    .includes("zorlanamayan-kural"));
});

test("M-1: koşul var katman beyanı yok → katman-uyumsuz (kim zorlayacak?)", () => {
  const t = dnt(`Kural x( kod: KRL-C ) { ne: "beyansız" koşul: a >= 1 }`);
  assert.ok(t.some((x) => x.kod === "katman-uyumsuz" && /katman beyanı yok/.test(x.mesaj)));
});

test("M-1: bilinmeyen katman değeri → katman-uyumsuz + geçerli liste önerisi", () => {
  const t = dnt(`Kural x( kod: KRL-D, katman: sıkı ) { ne: "yanlış katman" }`);
  const u = t.find((x) => x.kod === "katman-uyumsuz");
  assert.ok(u && /yapısal/.test(u.oneri ?? ""));
});

test("M-1: ebedi bayrağı anayasa-dışı otoritede → ebedi-ihlal", () => {
  assert.ok(kodlar(`Kural x( kod: KRL-E, otorite: politika, ebedi: evet, katman: niyet ) { ne: "yanlış ebedi" }`)
    .includes("ebedi-ihlal"));
});

test("M-1: doğru kural (vitrin deseni) sıfır kural-tanısı verir", () => {
  const t = dnt(`Anayasa( kod: ANY-T ) {
    ne: "test anayasası"
    Kural a( kod: KRL-F, otorite: anayasa, ebedi: evet, katman: yapısal, kapsam: etmen ) {
      ne: "üretici denetçi olamaz"
      koşul: değil (etmen.üretir ve etmen.denetler)
      ihlal: "ihlal"
      düzey: hata
    }
    Kural b( kod: KRL-G, otorite: anayasa, katman: niyet, kapsam: tümü ) {
      ne: "şüphede dur"
    }
  }`);
  const kural = t.filter((x) => ["katman-uyumsuz", "zorlanamayan-kural", "ebedi-ihlal"].includes(x.kod));
  assert.equal(kural.length, 0);
});

// ── koni-taşması ─────────────────────────────────────────────────────────────

test("M-1: 21 kural tümü kapsamında → hedef düğümde koni-taşması", () => {
  const kurallar = Array.from({ length: 21 }, (_, i) =>
    `Kural k${i}( kod: KRL-K${i}, katman: niyet, kapsam: tümü ) { ne: "k${i}" }`).join("\n");
  const t = dnt(`${kurallar}\nBlok( kod: BLK-HEDEF ) { }`);
  assert.ok(t.some((x) => x.kod === "koni-taşması" && /21 kural/.test(x.mesaj)));
});

test("M-1: 20 kural (eşikte) → koni-taşması YOK", () => {
  const kurallar = Array.from({ length: 20 }, (_, i) =>
    `Kural k${i}( kod: KRL-K${i}, katman: niyet, kapsam: tümü ) { ne: "k${i}" }`).join("\n");
  assert.ok(!kodlar(`${kurallar}\nBlok( kod: BLK-HEDEF ) { }`).includes("koni-taşması"));
});

test("M-1: kapsam dar ise sayım yalnız hedefe işler (aile eşleşmesi)", () => {
  // 21 kural yalnız etmen ailesine — Blok etmen değil, taşmaz; Etmen taşar.
  const kurallar = Array.from({ length: 21 }, (_, i) =>
    `Kural k${i}( kod: KRL-K${i}, katman: niyet, kapsam: etmen ) { ne: "k${i}" }`).join("\n");
  const t = dnt(`${kurallar}
Blok( kod: BLK-X ) { }
Etmen( kod: ETM-X, tür: uzman, uzmanlık: önyüz, yetki: L3, bellek: paylaşık, uygular: ANY-X ) { ne: "test etmeni" }`);
  const tasan = t.filter((x) => x.kod === "koni-taşması");
  assert.equal(tasan.length, 1);
  assert.ok(/ETM-X/.test(tasan[0].mesaj));
});

// ── dugumeDusenKurallar (TERS YÖN · #7 panel/ŞEF) ────────────────────────────

const AILE = new Map<string, string>(SNF.widgetTipleri.map((t) => [t.ad, t.aile]));
const dusenler = (kaynak: string, hedefAd: string) => {
  const prog = ayristir(belirtecle(kaynak));
  const kurallar = kurallariCikar(prog);
  const hedef = prog.bildirimler.find((b): b is Dugum => (b as Dugum).ad === hedefAd)!;
  return dugumeDusenKurallar(hedef, kurallar, AILE);
};

test("#7: aynı predikat — joker + widget-adı + aile + kod kurallarını düğüme düşürür", () => {
  const dusen = dusenler(`
Kural joker( kod: KRL-J, katman: niyet, kapsam: tümü ) { ne: "hepsine" }
Kural adli( kod: KRL-AD, katman: niyet, kapsam: Blok ) { ne: "widget-adı" }
Kural aileli( kod: KRL-AI, katman: niyet, kapsam: plan ) { ne: "aile eşleşmesi" }
Kural kodlu( kod: KRL-KD, katman: niyet, kapsam: BLK-HEDEF ) { ne: "koda" }
Kural baska( kod: KRL-BS, katman: niyet, kapsam: etmen ) { ne: "düşmez" }
Blok( kod: BLK-HEDEF ) { }`, "Blok").map((k) => k.kod);
  assert.deepEqual(new Set(dusen), new Set(["KRL-J", "KRL-AD", "KRL-AI", "KRL-KD"]));
  assert.ok(!dusen.includes("KRL-BS"));   // etmen ailesi Blok'a düşmez
});

test("#7: kapsamsız kural HİÇBİR düğüme düşmez (koni-taşması sayımıyla hizalı)", () => {
  const dusen = dusenler(`
Kural kapsamsiz( kod: KRL-NC, katman: niyet ) { ne: "kapsamsız" }
Blok( kod: BLK-X ) { }`, "Blok");
  assert.equal(dusen.length, 0);
});

test("#7: kuralNe — ne: alanını okur, yoksa boş döner", () => {
  const [k] = dusenler(`Kural a( kod: KRL-N, katman: niyet, kapsam: tümü ) { ne: "insan yüzü" }
Blok( kod: BLK-X ) { }`, "Blok");
  assert.equal(kuralNe(k), "insan yüzü");
});

// ── Değerlendirme tutarlılığı ────────────────────────────────────────────────

test("M-1: boyut ağırlıkları 0.90 → ağırlık-toplamı uyarısı", () => {
  const t = dnt(`Değerlendirme( kod: DGR-A, hedef: meyve ) {
    ne: "eksik ağırlık"
    boyutlar: { doğruluk: 0.50, hız: 0.40 }
    eşikler: { kabul: 0.90, revizyon: 0.40 }
  }`);
  assert.ok(t.some((x) => x.kod === "ağırlık-toplamı" && /0\.90/.test(x.mesaj)));
});

test("M-1: eşik bandı artan sıralı → eşik-sırası uyarısı", () => {
  const t = dnt(`Değerlendirme( kod: DGR-B, hedef: meyve ) {
    ne: "bozuk bant"
    boyutlar: { doğruluk: 1.00 }
    eşikler: { kabul: 0.40, revizyon: 0.90 }
  }`);
  assert.ok(t.some((x) => x.kod === "eşik-sırası"));
});

test("M-1: aralık dışı eşik (1.5) → eşik-sırası", () => {
  const t = dnt(`Değerlendirme( kod: DGR-C, hedef: meyve ) {
    ne: "taşan eşik"
    boyutlar: { doğruluk: 1.00 }
    eşikler: { kabul: 1.5 }
  }`);
  assert.ok(t.some((x) => x.kod === "eşik-sırası" && /aralığı dışında/.test(x.mesaj)));
});

test("M-1: vitrin Değerlendirme deseni (1.00 + azalan bant) temiz", () => {
  const t = dnt(`Değerlendirme( kod: DGR-D, hedef: etmen-çıktısı ) {
    ne: "temiz"
    boyutlar: { doğruluk: 0.30, tamlık: 0.20, güvenlik: 0.20, performans: 0.10, kodKalitesi: 0.10, dayanıklılık: 0.10 }
    eşikler: { kabul: 0.90, kabulNotlu: 0.75, izlemeyle: 0.60, revizyon: 0.40 }
  }`);
  const d = t.filter((x) => x.kod === "ağırlık-toplamı" || x.kod === "eşik-sırası");
  assert.equal(d.length, 0);
});

// ── eşik defteri ─────────────────────────────────────────────────────────────

test("M-1: eşik defteri koşul + eşikler sayılarını toplar", () => {
  const p = ayristir(belirtecle(`Kural x( kod: KRL-H, katman: eşik, kapsam: tümü ) {
    ne: "eşikli"
    koşul: güven >= 0.7 ve deneme <= 3
  }
  Değerlendirme( kod: DGR-E, hedef: meyve ) {
    ne: "defter"
    boyutlar: { doğruluk: 1.00 }
    eşikler: { kabul: 0.85 }
  }`));
  const defter = esikDefteri(p);
  const degerler = defter.map((e) => e.deger).sort();
  assert.deepEqual(degerler, [0.7, 0.85, 3]);
  assert.ok(defter.every((e) => e.sahip === "KRL-H" || e.sahip === "DGR-E"));
});

// ── dogfood: vitrin + gerçek örnekler kural-tanısız ──────────────────────────

// KÜRASYON (GOC-A08 · 2026-08-25): format vitrini kürasyon hükmüyle açık depoya girmediği için ona dayanan dogfood sınaması çıkarıldı; aslı atölyededir.

test("M-2: kesişen kapsam + ayrık aralık + eşit otorite → kural-çatışması hata", () => {
  const t = dnt(`Kural a( kod: KRL-M1, otorite: politika, katman: eşik, kapsam: etmen ) {
    ne: "yüksek eşik"
    koşul: güven >= 0.8
  }
  Kural b( kod: KRL-M2, otorite: politika, katman: eşik, kapsam: etmen ) {
    ne: "düşük tavan"
    koşul: güven < 0.5
  }`);
  const c = t.find((x) => x.kod === "kural-çatışması");
  assert.ok(c && c.duzey === "hata" && /AYNI ANDA sağlanamaz/.test(c.mesaj));
});

// ADM-DGS-11: 'üst kazanır' bilgi tanısı KALKTI — daraltma modeli: çelişen alt otorite HATA.
test("DGS-11: aynı çelişki farklı otoritede artık HATA (sessiz galibiyet yok — daraltma modeli)", () => {
  const t = dnt(`Kural a( kod: KRL-M3, otorite: anayasa, katman: eşik, kapsam: tümü ) {
    ne: "anayasa eşiği"
    koşul: güven >= 0.8
  }
  Kural b( kod: KRL-M4, otorite: tercih, katman: eşik, kapsam: tümü ) {
    ne: "tercih tavanı"
    koşul: güven < 0.5
  }`);
  const c = t.find((x) => x.kod === "kural-çatışması");
  assert.ok(c && c.duzey === "hata" && /DARALTMIYOR/.test(c.mesaj), JSON.stringify(c));
  assert.ok(/KRL-M4/.test(c!.mesaj.split("üzerinde")[0]), "hata alt otoriteye (gevşetene) yazılmalı");
});

test("DGS-11: Politika Anayasa'yı GEVŞETİRSE kural-çatışması hatası (kabul ①)", () => {
  const t = dnt(`Kural a( kod: KRL-D1, otorite: anayasa, katman: eşik, kapsam: tümü ) {
    ne: "anayasa tabanı"
    koşul: güven >= 0.7
  }
  Kural b( kod: KRL-D2, otorite: politika, katman: eşik, kapsam: tümü ) {
    ne: "gevşek politika"
    koşul: güven >= 0.5
  }`);
  const c = t.find((x) => x.kod === "kural-çatışması");
  assert.ok(c && c.duzey === "hata" && /KRL-D2/.test(c.mesaj) && /daraltabilir/i.test(c.mesaj), JSON.stringify(c));
});

test("DGS-11: kuralı KATILAŞTIRAN daraltma denetimden geçer (kabul ②)", () => {
  assert.ok(!kodlar(`Kural a( kod: KRL-D3, otorite: anayasa, katman: eşik, kapsam: tümü ) { ne: "taban" koşul: güven >= 0.7 }
  Kural b( kod: KRL-D4, otorite: politika, katman: eşik, kapsam: tümü ) { ne: "katı politika" koşul: güven >= 0.9 }`)
    .includes("kural-çatışması"));
});

test("DGS-11: Etmen anayasası kuralları da daralma kuralına tabi (kabul ③)", () => {
  const t = dnt(`Kural a( kod: KRL-D5, otorite: anayasa, katman: eşik, kapsam: tümü ) {
    ne: "çatı anayasa"
    koşul: güven >= 0.7
  }
  Etmen( kod: ETM-D1, tür: uzman, uzmanlık: deneme, yetki: L3, bellek: izole, ne: "deneme etmeni" ) {
    Anayasa( kod: ANY-D1, ne: "etmen anayasası" ) {
      Kural b( kod: KRL-D6, otorite: tercih, katman: eşik, kapsam: tümü ) {
        ne: "etmenin gevşek tercihi"
        koşul: güven >= 0.4
      }
    }
  }`);
  const c = t.find((x) => x.kod === "kural-çatışması");
  assert.ok(c && c.duzey === "hata" && /KRL-D6/.test(c.mesaj), "Etmen içindeki gevşeten kural da yakalanmalı: " + JSON.stringify(c));
});

test("DGS-11: alt otoritenin ÜST'te olmayan yolu kısıtlaması serbest (yeni kısıt = daraltma)", () => {
  assert.ok(!kodlar(`Kural a( kod: KRL-D7, otorite: anayasa, katman: eşik, kapsam: tümü ) { ne: "taban" koşul: güven >= 0.7 }
  Kural b( kod: KRL-D8, otorite: politika, katman: eşik, kapsam: tümü ) { ne: "ek kısıt" koşul: maliyet <= 100 }`)
    .includes("kural-çatışması"));
});

test("M-2: örtüşen aralıklar çatışma DEĞİL", () => {
  assert.ok(!kodlar(`Kural a( kod: KRL-M5, katman: eşik, kapsam: tümü ) { ne: "a" koşul: güven >= 0.5 }
  Kural b( kod: KRL-M6, katman: eşik, kapsam: tümü ) { ne: "b" koşul: güven >= 0.7 }`)
    .includes("kural-çatışması"));
});

test("M-2: kapsamlar kesişmiyorsa ayrık aralık bile çatışma değil", () => {
  assert.ok(!kodlar(`Kural a( kod: KRL-M7, katman: eşik, kapsam: etmen ) { ne: "a" koşul: x >= 0.8 }
  Kural b( kod: KRL-M8, katman: eşik, kapsam: Adım ) { ne: "b" koşul: x < 0.5 }`)
    .includes("kural-çatışması"));
});

test("M-2: veya içeren koşul güvenle atlanır (yanlış-pozitif yok)", () => {
  assert.ok(!kodlar(`Kural a( kod: KRL-M9, katman: eşik, kapsam: tümü ) { ne: "a" koşul: x >= 0.8 veya acil }
  Kural b( kod: KRL-M10, katman: eşik, kapsam: tümü ) { ne: "b" koşul: x < 0.5 }`)
    .includes("kural-çatışması"));
});

test("M-2: aynı KOD iki farklı gövde → kural-çatışması (RBAC dersi)", () => {
  const t = dnt(`Kural a( kod: KRL-AYNI, katman: niyet, kapsam: etmen ) { ne: "birinci tanım" }
  Kural b( kod: KRL-AYNI, katman: niyet, kapsam: etmen ) { ne: "İKİNCİ farklı tanım" }`);
  const c = t.find((x) => x.kod === "kural-çatışması");
  assert.ok(c && /İKİ KEZ farklı tanımlanmış/.test(c.mesaj));
});

// ── M-2: ebedi mühür ─────────────────────────────────────────────────────────

test("M-2: mühürsüz ebedi kural → mühürsüz-ebedi uyarısı", () => {
  const p = ayristir(belirtecle(`Anayasa( kod: ANY-E ) { ne: "t"
    Kural a( kod: KRL-E1, otorite: anayasa, ebedi: evet, katman: niyet, kapsam: tümü ) { ne: "ebedi kural" }
  }`));
  const env = ebediEnvanter(new Map([["a.sar", p]]));
  const t = ebediTanilar(env, undefined);
  assert.equal(t.length, 1);
  assert.equal(t[0].tani.kod, "mühürsüz-ebedi");
});

test("M-2: mühürlü ebedi değişince → ebedi-ihlal hatası", () => {
  const eski = ayristir(belirtecle(`Anayasa( kod: ANY-E ) { ne: "t"
    Kural a( kod: KRL-E2, otorite: anayasa, ebedi: evet, katman: niyet, kapsam: tümü ) { ne: "orijinal metin" }
  }`));
  const kilit = {
    not: "test", muhurlenme: "2026-07-03",
    kurallar: Object.fromEntries([...ebediEnvanter(new Map([["a.sar", eski]])).entries()].map(([k, e]) => [k, e.imza])),
  };
  const yeni = ayristir(belirtecle(`Anayasa( kod: ANY-E ) { ne: "t"
    Kural a( kod: KRL-E2, otorite: anayasa, ebedi: evet, katman: niyet, kapsam: tümü ) { ne: "DEĞİŞTİRİLMİŞ metin" }
  }`));
  const t = ebediTanilar(ebediEnvanter(new Map([["a.sar", yeni]])), kilit);
  assert.equal(t.length, 1);
  assert.ok(t[0].tani.kod === "ebedi-ihlal" && t[0].tani.duzey === "hata");
});

test("M-2: mühürlü ebedi SİLİNİNCE → ebedi-ihlal (silmek de değiştirmektir)", () => {
  const kilit = { not: "test", muhurlenme: "2026-07-03", kurallar: { "KRL-YOK": "eski-imza" } };
  const t = ebediTanilar(new Map(), kilit);
  assert.equal(t.length, 1);
  assert.ok(t[0].tani.kod === "ebedi-ihlal" && /SİLİNMİŞ/.test(t[0].tani.mesaj));
});

test("M-2: mühür imzayla eşleşiyorsa sıfır tanı", () => {
  const p = ayristir(belirtecle(`Anayasa( kod: ANY-E ) { ne: "t"
    Kural a( kod: KRL-E3, otorite: anayasa, ebedi: evet, katman: yapısal, kapsam: etmen ) {
      ne: "değişmeyen"
      koşul: değil (etmen.üretir ve etmen.denetler)
      ihlal: "ihlal"
      düzey: hata
    }
  }`));
  const env = ebediEnvanter(new Map([["a.sar", p]]));
  const kilit = { not: "t", muhurlenme: "2026-07-03",
    kurallar: Object.fromEntries([...env.entries()].map(([k, e]) => [k, e.imza])) };
  assert.equal(ebediTanilar(env, kilit).length, 0);
});

// ── M-3: yapısal koşul değerlendirici ────────────────────────────────────────

test("M-3: üretici≠denetçi — hem üretir hem denetler eden düğüm → kural-ihlali", () => {
  const t = dnt(`Anayasa( kod: ANY-M ) { ne: "t"
    Kural a( kod: KRL-UD, otorite: anayasa, katman: yapısal, kapsam: etmen ) {
      ne: "üretici denetçi olamaz"
      koşul: değil (etmen.üretir ve etmen.denetler)
      ihlal: "Aynı etmen hem üretir hem denetler"
      düzey: hata
    }
  }
  Etmen( kod: ETM-COVERT, tür: uzman, uzmanlık: güvenlik, yetki: L5, bellek: izole, uygular: ANY-M ) {
    ne: "kirli etmen"
    üretir: ADM-X
    denetler: ADM-Y
  }`);
  const i = t.find((x) => x.kod === "kural-ihlali");
  assert.ok(i && i.duzey === "hata" && /ETM-COVERT/.test(i.mesaj) && /hem üretir hem denetler/.test(i.mesaj));
});

test("M-3: yalnız üretir eden düğüm → ihlal YOK (temiz)", () => {
  assert.ok(!kodlar(`Anayasa( kod: ANY-M ) { ne: "t"
    Kural a( kod: KRL-UD, otorite: anayasa, katman: yapısal, kapsam: etmen ) {
      ne: "x" koşul: değil (etmen.üretir ve etmen.denetler) ihlal: "x" düzey: hata
    }
  }
  Etmen( kod: ETM-TEMIZ, tür: uzman, uzmanlık: önyüz, yetki: L3, bellek: paylaşık, uygular: ANY-M ) {
    ne: "temiz" üretir: ADM-X
  }`).includes("kural-ihlali"));
});

test("M-3: karşılaştırma — yetki == L6 kuralı L6 düğümü yakalar", () => {
  const t = dnt(`Kural a( kod: KRL-L6, katman: yapısal, kapsam: etmen ) {
    ne: "L6 kalıcı olamaz" koşul: değil (etmen.yetki == L6) ihlal: "Kalıcı L6 yasak" düzey: hata
  }
  Etmen( kod: ETM-ROOT, tür: apex, uzmanlık: yönetişim, yetki: L6, bellek: paylaşık, uygular: ANY-X ) { ne: "root" }
  Etmen( kod: ETM-USER, tür: uzman, uzmanlık: önyüz, yetki: L3, bellek: paylaşık, uygular: ANY-X ) { ne: "normal" }`);
  const ihlaller = t.filter((x) => x.kod === "kural-ihlali");
  assert.equal(ihlaller.length, 1);
  assert.ok(/ETM-ROOT/.test(ihlaller[0].mesaj));
});

test("M-3: eşik/niyet katmanı koşuları M-3'te DEĞERLENDİRİLMEZ", () => {
  // eşik = runtime; M-3 yalnız yapısal koşturur → kural-ihlali üretmez
  assert.ok(!kodlar(`Kural a( kod: KRL-ES, katman: eşik, kapsam: etmen ) {
    ne: "x" koşul: etmen.güven >= 0.7 ihlal: "x" düzey: hata
  }
  Etmen( kod: ETM-X, tür: uzman, uzmanlık: önyüz, yetki: L3, bellek: paylaşık, uygular: ANY-X ) { ne: "x" }`)
    .includes("kural-ihlali"));
});

test("M-3: düzyazı (string) koşul makine değerlendiremez → sessiz atlanır", () => {
  assert.ok(!kodlar(`Kural a( kod: KRL-DZ, otorite: politika, katman: yapısal, kapsam: Ekran ) {
    ne: "x" koşul: "her öğe etiket taşır" ihlal: "x" düzey: uyarı
  }
  Ekran( kod: EKR-X ) { ne: "x" }`).includes("kural-ihlali"));
});

test("M-3: düzey alanı ihlalin seviyesini belirler (uyarı)", () => {
  const t = dnt(`Kural a( kod: KRL-W, katman: yapısal, kapsam: etmen ) {
    ne: "x" koşul: etmen.profil == tam ihlal: "profil eksik" düzey: uyarı
  }
  Etmen( kod: ETM-X, tür: uzman, uzmanlık: önyüz, yetki: L3, bellek: paylaşık, uygular: ANY-X ) { ne: "x" }`);
  const i = t.find((x) => x.kod === "kural-ihlali");
  assert.ok(i && i.duzey === "uyarı");
});

// KÜRASYON (GOC-A08 · 2026-08-25): format vitrini kürasyon hükmüyle açık depoya girmediği için ona dayanan dogfood sınaması çıkarıldı; aslı atölyededir.

test("M-3 + YAS-2.3: kapsam: genel JOKERDİR — yapısal koşul boş kümeye düşmez, ihlal yakalanır", () => {
  const t = dnt(`Kural j( kod: KRL-J, katman: yapısal, kapsam: genel, düzey: uyarı ) {
    ne: "güven şart"
    ihlal: "güven eşiği sağlanmıyor"
    koşul: düğüm.güven >= 1
  }
  Karar( kod: KRR-J, karar: "deneme", gerekçe: "test", ne: "hedef düğüm", güven: 0 )`);
  assert.ok(t.some((x) => x.kod === "kural-ihlali" && /KRL-J/.test(x.mesaj)),
    "genel-kapsamlı yapısal kural artık tüm düğümlerde koşmalı (eskiden boş kümeye düşüp susuyordu)");
});

// ── BKM-BUG-A03: kural-motoru dürüstlük seti (M3 düzyazı-koşul · M5 sızıntı · C7 bant) ─
test("M3: zorlanan katmanda düzyazı koşul → düzyazı-koşul BİLGİ tanısı; ifade koşul susar", () => {
  const t = dnt(`Kural a( kod: KRL-DY, katman: yapısal, kapsam: genel ) {
    ne: "beyan koşulu"
    koşul: "her derlemede başka bekçi tarar"
  }`);
  const dy = t.filter((x) => x.kod === "düzyazı-koşul");
  assert.equal(dy.length, 1);
  assert.equal(dy[0].duzey, "bilgi");
  const t2 = dnt(`Kural b( kod: KRL-IF, katman: eşik, kapsam: genel ) {
    ne: "gerçek koşul"
    koşul: düğüm.güven >= 0.7
  }`);
  assert.equal(t2.filter((x) => x.kod === "düzyazı-koşul").length, 0);
});

test("M5: kanon katman kümesi çağrılar arası SIZMAZ (koşum-yerel)", () => {
  const kaynak = `Kural x( kod: KRL-OZ, katman: özel_katman ) { ne: "özel katmanlı" }`;
  const p = ayristir(belirtecle(kaynak));
  const ozelSnf: Siniflama = { ...SNF, semalar: { ...SNF.semalar, Kural: { zorunlu: ["kod", "ne"], enum: { katman: ["özel_katman"] } } } };
  assert.equal(dogrula(p, ozelSnf).filter((x) => x.kod === "katman-uyumsuz").length, 0, "özel kanon kendi katmanını tanımalı");
  // Aynı süreçte taban (kanonlu) sınıflamayla denetim: özel katman artık TANINMAMALI.
  assert.equal(dogrula(p, SNF).filter((x) => x.kod === "katman-uyumsuz").length, 1, "taban kanona dönünce özel katman sızmamalı");
});

test("C7: eşik bandında sayısal-olmayan çift kalanları İPTAL ETMEZ — aralık-dışı sayı yine yakalanır", () => {
  const t = dnt(`Değerlendirme( kod: DGR-C7, ne: "karışık bant",
    eşikler: { kabul: "önce metin", esnek: 2 } )`);
  assert.ok(t.some((x) => x.kod === "eşik-sırası" && /aralığı dışında/.test(x.mesaj)),
    "metin çiftten SONRAKİ aralık-dışı sayı denetlenmeli (eskiden return tüm bandı terk ediyordu)");
});

// ── ADM-DGS-13: mühürlü referans (`çağır KOD @mühür:<hash>`) ─────────────────
test("DGS-13: @mühür sözdizimi tanınıyor — doğru pin temiz, kırık pin 'mühür-kırık' hata", async () => {
  const { muhurTanilari, dugumMuhru } = await import("../src/kuralci.ts");
  const { belirtecle } = await import("../src/belirtec.ts");
  const { ayristir } = await import("../src/ayristirici.ts");

  const hedefKaynak = `Kural sabit( kod: KRL-MHR-1, otorite: anayasa, katman: niyet, ebedi: evet ) { ne: "değişmez ilke" }`;
  const hedefProgram = ayristir(belirtecle(hedefKaynak));
  const dogruPin = dugumMuhru(hedefProgram.bildirimler[0]);

  // ① doğru pin → temiz
  const temiz = new Map([
    ["yasa.sar", hedefProgram],
    ["atif.sar", ayristir(belirtecle(`çağır KRL-MHR-1 @mühür:${dogruPin}`))],
  ]);
  assert.equal(muhurTanilari(temiz).length, 0, "doğru pin tanı üretmemeli");

  // ② hedef değişti → mühür-kırık (hata) + öneri güncel hash'i söyler
  const degisen = ayristir(belirtecle(hedefKaynak.replace("değişmez ilke", "sessizce değişti")));
  const kirik = new Map([
    ["yasa.sar", degisen],
    ["atif.sar", ayristir(belirtecle(`çağır KRL-MHR-1 @mühür:${dogruPin}`))],
  ]);
  const t = muhurTanilari(kirik);
  assert.equal(t.length, 1);
  assert.equal(t[0].tani.kod, "mühür-kırık");
  assert.equal(t[0].tani.duzey, "hata");
  assert.ok(t[0].tani.oneri!.includes(dugumMuhru(degisen.bildirimler[0])), "öneri güncel hash'i içermeli");

  // ③ hedef YOK → susar (kırık-referans bekçisinin işi — çift tanı yok)
  const hedefsiz = new Map([["atif.sar", ayristir(belirtecle(`çağır KRL-YOK @mühür:abc123abc123`))]]);
  assert.equal(muhurTanilari(hedefsiz).length, 0);

  // ④ mühürsüz çağır dokunulmaz (geriye-uyum)
  const sade = new Map([["a.sar", ayristir(belirtecle("çağır KRL-MHR-1"))], ["yasa.sar", hedefProgram]]);
  assert.equal(muhurTanilari(sade).length, 0);
});

test("DGS-13: bozuk @ sözdizimi dürüst SözDizimHatası", async () => {
  const { belirtecle, SozDizimHatasi } = await import("../src/belirtec.ts");
  assert.throws(() => belirtecle("çağır X @imza:abc"), SozDizimHatasi);     // yalnız mühür
  assert.throws(() => belirtecle("çağır X @mühür abc"), SozDizimHatasi);    // ':' şart
  assert.throws(() => belirtecle("çağır X @mühür:"), SozDizimHatasi);      // boş hash
});

// ── ADM-DGS-12: argümanlı koşul + eşik değerlendirme + .uzunluk (DIL-3 canlandı) ──
test("DGS-12: eşik katmanı koşulu DENETİMDE değerlendirilir — alan değeri eşiği ihlal ederse kural-ihlali", () => {
  const kaynak = (puan: string) => `Kural esik( kod: KRL-ESK-1, otorite: politika, katman: eşik, kapsam: Blok, düzey: uyarı ) {
    ne: "puan tabanı"
    koşul: puan >= 0.7
    ihlal: "puan tabanın altında"
  }
  Blok( kod: BLK-ESK, ne: "hedef", puan: ${puan} )`;
  const dusuk = dnt(kaynak("0.6")).filter((x) => x.kod === "kural-ihlali");
  assert.equal(dusuk.length, 1, "0.6 < 0.7 ihlal vermeli");
  assert.ok(/puan tabanın altında/.test(dusuk[0].mesaj));
  assert.equal(dnt(kaynak("0.9")).filter((x) => x.kod === "kural-ihlali").length, 0, "0.9 temiz");
});

test("DGS-12: alanı taşımayan düğümde eşik koşulu İHLAL üretmez; hiç değerlendirilemezse BİLGİ düzeyi (çalışma anına not)", () => {
  const t = dnt(`Kural esik( kod: KRL-ESK-2, otorite: politika, katman: eşik, kapsam: Blok ) {
    ne: "deneme sınırı"
    koşul: deneme <= 3
  }
  Blok( kod: BLK-ESK2, ne: "alan yok" )`);
  assert.equal(t.filter((x) => x.kod === "kural-ihlali").length, 0);
  const z = t.find((x) => x.kod === "zorlanamayan-koşul");
  assert.ok(z && z.duzey === "bilgi" && /çalışma anında/.test(z.mesaj), JSON.stringify(z));
});

test("DGS-12: argüman ikamesi + .uzunluk — Kural adSınırı( azami: 5 ) fonksiyon-biçimi çalışır", () => {
  const kaynak = (ad: string) => `Kural adSiniri( kod: KRL-ARG-1, otorite: politika, katman: yapısal, kapsam: Blok, azami: 5, düzey: uyarı ) {
    ne: "ad kısalık sınırı"
    koşul: ad.uzunluk <= azami
    ihlal: "ad azami uzunluğu aşıyor"
  }
  Blok( kod: BLK-ARG, ad: "${ad}", ne: "hedef" )`;
  const uzun = dnt(kaynak("yedincirharfli")).filter((x) => x.kod === "kural-ihlali");
  assert.equal(uzun.length, 1, "14 harf > 5 ihlal vermeli");
  assert.equal(dnt(kaynak("kisa")).filter((x) => x.kod === "kural-ihlali").length, 0, "4 harf temiz");
});

test("DGS-12: çıplak sabit geriye-uyumu — yetki == L5 deseninde L5 alan değil sabittir", () => {
  const t = dnt(`Kural r( kod: KRL-ARG-2, otorite: politika, katman: yapısal, kapsam: Etmen, düzey: uyarı ) {
    ne: "denetçi L5 olmalı"
    koşul: yetki == L5
    ihlal: "yetki L5 değil"
  }
  Etmen( kod: ETM-ARG, tür: uzman, uzmanlık: deneme, yetki: L3, bellek: izole, uygular: ANY-ARG ) { ne: "test etmeni" }`);
  assert.equal(t.filter((x) => x.kod === "kural-ihlali").length, 1, "L3 != L5 ihlal vermeli (sabit çözümü bozulmadı)");
});

// ── RF-T6-A04 · GenelKural/ÖzelKural MOTOR-VATANDAŞLIĞI ───────────────────────
//
//   Founder teşhisi (2026-07-12): vitrin tipleri "motorsuz doğmuş" — kuralci yalnız
//   Kural'ı değerlendiriyordu. A04: GenelKural = kapsam-varsayılanı "genel" Kural;
//   ÖzelKural = hedef: dizinine inen Kural (kapsam farkı = TİP farkı). AYNI motorda
//   değerlendirilir (DIL-3 tek motor iki kaynak). Bu bölüm o vatandaşlığı sınar.

const dntYol = (k: string, yol: string) => dogrula(ayristir(belirtecle(k)), SNF, yol);

test("RF-T6-A04: GenelKural kapsam yazılmasa da 'genel' varsayılır — koşul motorda AYNI değerlendirilir", () => {
  // kapsam YAZILMADI → varsayılan "genel" (joker) → Blok'a düşer → puan 3<5 → ihlal
  const t = dnt(`
GenelKural( kod: ORN-GK, katman: yapısal, koşul: puan >= 5, ihlal: "puan eşik altı", düzey: hata ) { ne: "genel eşik" }
Blok( kod: BLK-GK, ne: "hedef", puan: 3 )`);
  const ihlal = t.find((x) => x.kod === "kural-ihlali" && /ORN-GK/.test(x.mesaj));
  assert.ok(ihlal, "GenelKural koşulu Blok üstünde değerlendirilmeli (kapsam varsayılanı genel)");
  assert.equal(ihlal!.duzey, "hata", "düzey: hata GenelKural'dan okunmalı");

  // EŞDEĞERLİK: aynı koşullu Kural(kapsam: genel) AYNI ihlali üretir — motor tek
  const kuralIhlal = dnt(`
Kural k( kod: KRL-EK, katman: yapısal, kapsam: genel, koşul: puan >= 5, ihlal: "puan eşik altı", düzey: hata ) { ne: "eş kural" }
Blok( kod: BLK-GK, ne: "hedef", puan: 3 )`).find((x) => x.kod === "kural-ihlali");
  assert.ok(kuralIhlal, "eş Kural da ihlal üretmeli — GenelKural motor-eşdeğeri");
});

test("RF-T6-A04: GenelKural koşulu SAĞLANIRSA ihlal yok (yanlış-pozitif yok)", () => {
  const t = dnt(`
GenelKural( kod: ORN-GK2, katman: yapısal, koşul: puan >= 5, ihlal: "x", düzey: hata ) { ne: "genel" }
Blok( kod: BLK-OK, ne: "hedef", puan: 7 )`);
  assert.ok(!t.some((x) => x.kod === "kural-ihlali"), "puan 7>=5 → sağlanır, ihlal yok");
});

test("RF-T6-A04: ÖzelKural hedef: dizini İÇİNDE zorlanır", () => {
  const src = `
ÖzelKural( kod: ORN-OK, hedef: "eklenti/", katman: yapısal, koşul: puan >= 5, ihlal: "eklenti puan", düzey: hata ) { ne: "hedefli" }
Blok( kod: BLK-OK2, ne: "hedef", puan: 3 )`;
  const t = dntYol(src, "eklenti/renk.sar");
  assert.ok(t.some((x) => x.kod === "kural-ihlali" && /ORN-OK/.test(x.mesaj)), "hedef içi dosyada ÖzelKural zorlanır (kapsam varsayılanı genel, hedefe süzülür)");
});

test("RF-T6-A04: ÖzelKural hedef: dizini DIŞINDA eşleşmez (kapsam farkı = tip farkı)", () => {
  const src = `
ÖzelKural( kod: ORN-OK, hedef: "eklenti/", katman: yapısal, koşul: puan >= 5, ihlal: "eklenti puan", düzey: hata ) { ne: "hedefli" }
Blok( kod: BLK-OK3, ne: "hedef", puan: 3 )`;
  const t = dntYol(src, "cekirdek/src/foo.sar");
  assert.ok(!t.some((x) => x.kod === "kural-ihlali"), "hedef DIŞI dosyada ÖzelKural ATLANIR — kapsam farkı testli");
});

// ── YAS-2.4: tip birleşimi — uygular-hedefli kısıt birleşimi (⊥) ───────────────
test("YAS-2.4: aynı düğüme uygulanan KAPSAMSIZ Anayasa↔Politika kuralı çelişirse ⊥ birleşim-çatışması; uyumlu daraltma ve kapsam-kesişen çift susar", async () => {
  const { birlesimCatismaTanilari } = await import("../src/kuralci.ts");
  const kur = (kurallar: string, hedef: string) =>
    new Map([["k.sar", ayristir(belirtecle(`${kurallar}\n${hedef}`))]]);
  // ① kapsamsız anayasa↔politika, politika GEVŞETİYOR → ⊥ hata (mevcut ciftCatismasi kapsamsızı GÖREMEZ)
  const catisan = birlesimCatismaTanilari(kur(`
Kural a( kod: KRL-BC-UST, otorite: anayasa, katman: eşik ) {
  ne: "anayasa tabanı"
  koşul: güven >= 0.8
}
Kural b( kod: KRL-BC-ALT, otorite: politika, katman: eşik ) {
  ne: "gevşek politika"
  koşul: güven >= 0.3
}`, `Servis( kod: SRV-BC, ne: "hedef", uygular: [ KRL-BC-UST, KRL-BC-ALT ] )`));
  assert.equal(catisan.length, 1);
  assert.ok(catisan[0].tani.kod === "birleşim-çatışması" && catisan[0].tani.duzey === "hata");
  assert.ok(catisan[0].tani.mesaj.includes("⊥"), "mesaj mantıksal taban imini taşımalı");
  // ② uyumlu daraltma (politika ⊆ anayasa) → susar
  const uyumlu = birlesimCatismaTanilari(kur(`
Kural a( kod: KRL-BC-U2, otorite: anayasa, katman: eşik ) {
  ne: "taban"
  koşul: güven >= 0.5
}
Kural b( kod: KRL-BC-A2, otorite: politika, katman: eşik ) {
  ne: "daraltan"
  koşul: güven >= 0.7
}`, `Servis( kod: SRV-BC2, ne: "hedef", uygular: [ KRL-BC-U2, KRL-BC-A2 ] )`));
  assert.equal(uyumlu.length, 0, "daraltan politika birleşir — ⊥ yok");
  // ③ eşit otorite + ayrık aralık → ⊥
  const esit = birlesimCatismaTanilari(kur(`
Kural a( kod: KRL-BC-E1, otorite: tercih, katman: eşik ) {
  ne: "alt sınır"
  koşul: güven >= 0.8
}
Kural b( kod: KRL-BC-E2, otorite: tercih, katman: eşik ) {
  ne: "üst sınır"
  koşul: güven < 0.3
}`, `Servis( kod: SRV-BC3, ne: "hedef", uygular: [ KRL-BC-E1, KRL-BC-E2 ] )`));
  assert.equal(esit.length, 1);
  // ④ kapsamları KESİŞEN çift bu bekçide atlanır (ciftCatismasi'nın alanı — çift tanı basılmaz)
  const kesisen = birlesimCatismaTanilari(kur(`
Kural a( kod: KRL-BC-K1, otorite: anayasa, katman: eşik, kapsam: tümü ) {
  ne: "taban"
  koşul: güven >= 0.8
}
Kural b( kod: KRL-BC-K2, otorite: politika, katman: eşik, kapsam: tümü ) {
  ne: "gevşek"
  koşul: güven >= 0.3
}`, `Servis( kod: SRV-BC4, ne: "hedef", uygular: [ KRL-BC-K1, KRL-BC-K2 ] )`));
  assert.equal(kesisen.length, 0, "kapsam-kesişen çifti ciftCatismasi raporlar");
});

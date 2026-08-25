// ═══════════════════════════════════════════════════════════════════════════
// simge-cizelgesi.test.ts — Kapsam eşitliği NÖBETİ (VIT-KIMLIK-A03)
//
//   Amaç:   Ölçülmüş ders — iki simge çizelgesi (emoji ↔ grafik) birbirinden
//           ayrıştı ve bunu hiçbir kapı yakalamadı; Founder gözle buldu.
//           Bu nöbet, SVG rafı ile kanonun emoji çizelgesinin AYNI altı eksen
//           tipini kapsadığını ÖLÇER: raf eksik ya da fazla tip taşırsa süit
//           kırmızıya döner. Ayrıca .sar dosya ikonu ilanının (Founder hükmü
//           2026-08-03) package.json'da yaşadığını ve ikon dosyalarının diskte
//           var olduğunu aynı nöbete bağlar.
//   Kapsam: raf ↔ eksen eşitliği · emoji kanon-okuması · YUZ-4.1 (kaynağa renk
//           gömülmez) · üretilmiş varyantların varlığı · dosya ikonu ilanı ·
//           üreticinin (arac/simge-uret.mjs) geçici kopyaya karşı gerçek koşusu.
// ═══════════════════════════════════════════════════════════════════════════
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as beklet } from "node:timers/promises";
import { belirtecle } from "../../cekirdek/src/belirtec.ts";
import { ayristir } from "../../cekirdek/src/ayristirici.ts";
import type { Program } from "../../cekirdek/src/sozdizim.ts";
import { ADIM_YASAM_DURUMLARI } from "../../cekirdek/src/durum.ts";
import {
  EKSEN_TIPLERI, eksenSvgKaynagi, eksenSvgVaryanti, tipSimgesi,
  DOSYA_IKON_KAYNAGI, DOSYA_IKONU, SIMGE_RAFI,
  PANEL_GORUNUSLERI, panelSvgKaynagi, KAPSAYICI_SIMGE,
  SATIR_SIMGELERI, ANLAM_RENKLERI, satirSvgKaynagi, satirSvgVaryanti,
  ADIM_EVRESI, eksenDekorKararlari, eksenDekorKaydi,
} from "../src/simge-cizelgesi.ts";
import type { KapsayiciEvre } from "../../cekirdek/src/durum.ts";

const KOK = fileURLToPath(new URL("..", import.meta.url));
const oku = (goreli: string): string => readFileSync(join(KOK, goreli), "utf8");
const kayit = JSON.parse(readFileSync(fileURLToPath(new URL("../../../oz/siniflama/kayit.json", import.meta.url)), "utf8"));

/** Raftaki eksen SVG'leri: üst seviye *.svg dosyaları; dosya ikonu (sar-dosya)
 *  eksen değildir, panel simgeleri (panel-*) ve satır simgeleri (satir-*)
 *  ayrı hanelerdir, üretilmiş varyant rafı ayrı klasördür (alt dizin taranmaz). */
function rafEksenAdlari(): string[] {
  return readdirSync(join(KOK, SIMGE_RAFI), { withFileTypes: true })
    .filter((g) => g.isFile() && g.name.endsWith(".svg") && g.name !== "sar-dosya.svg"
      && !g.name.startsWith("panel-") && !g.name.startsWith("satir-"))
    .map((g) => g.name.replace(/\.svg$/, ""))
    .sort();
}

/** Raftaki satır SVG'leri: üst seviye satir-*.svg dosyaları (VIT-KIMLIK-A05). */
function rafSatirAdlari(): string[] {
  return readdirSync(join(KOK, SIMGE_RAFI), { withFileTypes: true })
    .filter((g) => g.isFile() && g.name.startsWith("satir-") && g.name.endsWith(".svg"))
    .map((g) => g.name.replace(/^satir-/, "").replace(/\.svg$/, ""))
    .sort();
}

/** Raftaki panel SVG'leri: üst seviye panel-*.svg dosyaları. */
function rafPanelAdlari(): string[] {
  return readdirSync(join(KOK, SIMGE_RAFI), { withFileTypes: true })
    .filter((g) => g.isFile() && g.name.startsWith("panel-") && g.name.endsWith(".svg"))
    .map((g) => g.name)
    .sort();
}

test("simge nöbeti: SVG rafı ile eksen çizelgesi AYNI altı tipi kapsar — eksik de fazla da kırmızı", () => {
  const raf = rafEksenAdlari();
  const beklenen = EKSEN_TIPLERI.map((t) => eksenSvgKaynagi(t).split("/").pop()!.replace(/\.svg$/, "")).sort();
  assert.deepEqual(raf, beklenen,
    `simge nöbeti: raf ${JSON.stringify(raf)}, çizelge ${JSON.stringify(beklenen)} — ` +
    "raf ile çizelge ayrıştı; SVG silmek/eklemek çizelgeyle BİRLİKTE yapılır (VIT-KIMLIK-A03 dersi)");
  assert.equal(raf.length, 6, "eksen ailesi ALTI tiptir (Faz·Blok·Katman·AltKatman·Adım·Meyve)");
});

test("simge nöbeti: altı eksen tipinin her biri kanondan emoji taşır ve simgeler birbirinden ayrıdır", () => {
  const simgeler = EKSEN_TIPLERI.map((t) => tipSimgesi(t));
  for (const [i, t] of EKSEN_TIPLERI.entries())
    assert.notEqual(simgeler[i], "◦",
      `simge nöbeti: ${t} kanon emoji çizelgesinden çözülemedi — emoji çizelgesi eksik tip taşıyor`);
  assert.equal(new Set(simgeler).size, EKSEN_TIPLERI.length,
    "simge nöbeti: iki eksen tipi aynı emojiyi paylaşıyor — kanon hükmü HER TİP AYRI SİMGE taşır");
});

test("simge nöbeti: emoji İKİNCİ KOPYADAN değil kanondan okunur (tip kademesi + Meyve'nin aile kademesi)", () => {
  for (const t of ["Faz", "Blok", "Katman", "AltKatman", "Adım"] as const)
    assert.equal(tipSimgesi(t), kayit.tipSimgeleri[t],
      `simge nöbeti: ${t} çizelgesi kanondan sapmış — ikinci kopya kurulmuş olmalı, kaynak kayit.json'dur`);
  assert.equal(tipSimgesi("Meyve"), kayit.aileSimgeleri.urun,
    "simge nöbeti: Meyve rolü ürün ailesinin kanon simgesini taşır");
});

test("simge nöbeti: raf kaynakları currentColor konturludur — simgeye renk GÖMÜLMEZ (YUZ-4.1)", () => {
  for (const t of EKSEN_TIPLERI) {
    const icerik = oku(eksenSvgKaynagi(t));
    assert.ok(icerik.includes('stroke="currentColor"'),
      `simge nöbeti: ${eksenSvgKaynagi(t)} currentColor konturunu yitirmiş`);
    assert.ok(!/#[0-9A-Fa-f]{3,8}\b/.test(icerik),
      `simge nöbeti: ${eksenSvgKaynagi(t)} içinde somut renk var — renk yalnız arac/simge-uret.mjs çizelgesinde yaşar`);
  }
  // Dosya ikonu bu kuralın DIŞINDADIR: o üretilen bir varyant değil, Founder'ın
  // kendi çizimi olan marka ikonudur (2026-08-04 hükmü) — gradyanı kimliktir.
});

test("simge nöbeti: üretilmiş evre×tema varyantları diskte yaşar (ağacın iconPath'i boşa bakmaz)", () => {
  const evreler: KapsayiciEvre[] = ["bitti", "sürüyor", "bekliyor"];
  for (const t of EKSEN_TIPLERI)
    for (const e of evreler)
      for (const tema of ["acik", "koyu"] as const) {
        const yol = eksenSvgVaryanti(t, e, tema);
        assert.ok(existsSync(join(KOK, yol)),
          `simge nöbeti: ${yol} diskte yok — "npm run build" (arac/simge-uret.mjs) üretir`);
      }
});

test("simge nöbeti: .sar dosya ikonu MARKA ikonudur ve ilanı package.json'da yaşar (Founder hükmü 2026-08-04)", () => {
  const paket = JSON.parse(oku("package.json"));
  const dil = (paket.contributes?.languages as Array<{ id: string; icon?: { light?: string; dark?: string } }> | undefined)
    ?.find((d) => d.id === "sarmal");
  assert.ok(dil?.icon?.light && dil?.icon?.dark,
    "simge nöbeti: contributes.languages[sarmal].icon {light,dark} ilanı yok — .sar dosyaları ikonsuz kalır");
  assert.equal(dil.icon.light, `./${DOSYA_IKONU.acik}`,
    "simge nöbeti: açık tema dosya ikonu çizelgeden (simge-cizelgesi.DOSYA_IKONU) sapmış");
  assert.equal(dil.icon.dark, `./${DOSYA_IKONU.koyu}`,
    "simge nöbeti: koyu tema dosya ikonu çizelgeden sapmış");
  assert.equal(DOSYA_IKONU.acik, DOSYA_IKON_KAYNAGI,
    "simge nöbeti: dosya ikonu marka kaynağının kendisidir — türetilmiş kopyaya sapmış");
  assert.ok(existsSync(join(KOK, DOSYA_IKON_KAYNAGI)), `simge nöbeti: ${DOSYA_IKON_KAYNAGI} diskte yok`);
  const marka = oku(DOSYA_IKON_KAYNAGI);
  assert.ok(marka.includes("linearGradient"),
    "simge nöbeti: marka ikonu gradyanını kaybetmiş — Founder'ın çizimi birebir korunur");
});

// ── PANEL HANESİ NÖBETLERİ (VIT halka 1 · Founder 2026-08-04: geometrik aile) ──

test("panel nöbeti: raf ile panel çizelgesi AYNI görünüşleri kapsar — eksik de fazla da kırmızı", () => {
  const raf = rafPanelAdlari();
  const beklenen = PANEL_GORUNUSLERI.map((g) => panelSvgKaynagi(g).split("/").pop()!).sort();
  assert.deepEqual(raf, beklenen,
    `panel nöbeti: raf ${JSON.stringify(raf)}, çizelge ${JSON.stringify(beklenen)} — ` +
    "panel SVG'si silmek/eklemek çizelgeyle BİRLİKTE yapılır (VIT-KIMLIK-A03 dersi paneller için de geçerlidir)");
  // VIT-GRAF-A16 ile aile ALTIYA çıktı: Fikirler hanesi Hatırlatıcılar panelinin
  // içinden çıkıp kendi görünüşüne taşındı ve kendi panel simgesini aldı. Sayı
  // bilerek güncellenmiştir; nöbetin değeri sayının kendisinde değil,
  // güncellemenin sessiz olamamasındadır.
  assert.equal(raf.length, 6,
    "panel ailesi ALTI görünüştür (Yol Haritası·Hatırlatıcılar·Fikirler·Gözlemler·Mini Graf·Onaylar)");
});

test("panel nöbeti: panel simgelerinin içeriği birbirinden FARKLIDIR — aynı simge iki panele gidemez", () => {
  // Founder 2026-07-28 canlı bulgusu: iki panel aynı simgeyi taşıyordu ve
  // bakışta ayrılmıyordu. Yol karşılaştırması yetmez — içerik karşılaştırılır,
  // çünkü iki AYRI dosya aynı çizimi taşırsa kusur ad değiştirip geri gelir.
  const icerikler = PANEL_GORUNUSLERI.map((g) => oku(panelSvgKaynagi(g)));
  for (let i = 0; i < icerikler.length; i++)
    for (let j = i + 1; j < icerikler.length; j++)
      assert.notEqual(icerikler[i], icerikler[j],
        `panel nöbeti: ${panelSvgKaynagi(PANEL_GORUNUSLERI[i])} ile ` +
        `${panelSvgKaynagi(PANEL_GORUNUSLERI[j])} AYNI çizimi taşıyor — ` +
        "iki panel bakışta ayrılmaz (Founder 2026-07-28 bulgusu geri gelemez)");
});

test("panel nöbeti: panel kaynakları geometrik ailenin çizim dilini izler ve renk GÖMÜLMEZ (YUZ-4.1)", () => {
  for (const g of PANEL_GORUNUSLERI) {
    const yol = panelSvgKaynagi(g);
    const icerik = oku(yol);
    for (const nitelik of ['viewBox="0 0 24 24"', 'fill="none"', 'stroke="currentColor"', 'stroke-width="1.7"'])
      assert.ok(icerik.includes(nitelik),
        `panel nöbeti: ${yol} çizim dilinden ayrılıyor — ${nitelik} yok`);
    assert.ok(!/#[0-9A-Fa-f]{3,8}\b/.test(icerik),
      `panel nöbeti: ${yol} içinde somut renk var — panel simgesi temadan boyanır, renk gömülmez`);
  }
});

test("panel nöbeti: package.json görünüş ilanları çizelgeyle BİREBİRDİR (kapsayıcı dahil)", () => {
  const paket = JSON.parse(oku("package.json"));
  const gorunusler = paket.contributes.views["sarmal-yol"] as Array<{ id: string; icon: string }>;
  assert.deepEqual(gorunusler.map((g) => g.id).sort(), [...PANEL_GORUNUSLERI].sort(),
    "panel nöbeti: package.json görünüş kimlikleri çizelgenin kapsamından ayrıştı");
  for (const g of gorunusler)
    assert.equal(g.icon, panelSvgKaynagi(g.id as (typeof PANEL_GORUNUSLERI)[number]),
      `panel nöbeti: ${g.id} ilanı ${g.icon} taşıyor, çizelge ${panelSvgKaynagi(g.id as (typeof PANEL_GORUNUSLERI)[number])} diyor — ilan çizelgeden sapmış`);
  const kapsayici = paket.contributes.viewsContainers.activitybar
    .find((k: { id: string }) => k.id === "sarmal-yol");
  assert.equal(kapsayici?.icon, KAPSAYICI_SIMGE,
    "panel nöbeti: etkinlik çubuğu kapsayıcısının simgesi çizelgeden (KAPSAYICI_SIMGE) sapmış");
});

test("simge nöbeti: üretici geçici kopyaya karşı GERÇEKTEN koşar; boyanmış kaynağı yüksek sesle reddeder", async () => {
  const { uret } = await import("../arac/simge-uret.mjs");
  const gecici = mkdtempSync(join(tmpdir(), "sarmal-simge-"));
  try {
    cpSync(join(KOK, SIMGE_RAFI), join(gecici, "raf"), { recursive: true });
    rmSync(join(gecici, "raf", "uretilmis"), { recursive: true, force: true });
    const { yazilan } = uret({ RAF: join(gecici, "raf"), URETILMIS: join(gecici, "cikti") });
    // 6 eksen × 3 evre × 2 tema = 36 · 20 satır × 9 anlam × 2 tema = 360 → 396
    // (istasyon simgesi EKL-F7-A09 küme kimliğiyle katıldı: 19 → 20 satır)
    assert.equal(yazilan.length, 396, "üretici 396 varyant dökmeli (6×3×2 eksen + 20×9×2 satır)");
    // Boyanmış kaynak (YUZ-4.1 ihlali) sessiz geçilmez:
    writeFileSync(join(gecici, "raf", "faz.svg"),
      '<svg xmlns="http://www.w3.org/2000/svg"><circle stroke="#FF0000"/></svg>');
    assert.throws(() => uret({ RAF: join(gecici, "raf"), URETILMIS: join(gecici, "cikti2") }),
      /YUZ-4\.1/, "üretici renk gömülü kaynağı reddetmeli");
  } finally {
    rmSync(gecici, { recursive: true, force: true });
  }
});

// ── SATIR HANESİ NÖBETLERİ (VIT-KIMLIK-A05 · Founder hükmü 2026-08-04: IDE'nin ──
//    içi baştan aşağı geometrik çizim dilinden konuşur — satır içi hazır
//    codicon'lar da dahil). Çizelge ile disk birebirdir, kaynaklara renk
//    gömülmez ve hiçbir panel hazır ikon kimliğine geri düşmez.

test("satır nöbeti: raf ile satır çizelgesi AYNI simgeleri kapsar — eksik de fazla da kırmızı", () => {
  const raf = rafSatirAdlari();
  const beklenen = [...SATIR_SIMGELERI].sort();
  assert.deepEqual(raf, beklenen,
    `satır nöbeti: raf ${JSON.stringify(raf)}, çizelge ${JSON.stringify(beklenen)} — ` +
    "raf ile çizelge ayrıştı; satır SVG'si silmek/eklemek çizelgeyle BİRLİKTE yapılır (VIT-KIMLIK-A03 dersi)");
  // KYN-YUZ-A01 ile aile on dokuza çıkmıştı (Fikir hanesi kendi simgesini
  // aldı); EKL-F7-A09 küme kimliğiyle YİRMİYE çıktı — çalışma alanı satırı
  // artık sefer değil kendi İSTASYON simgesini taşır.
  assert.equal(raf.length, 20, "satır ailesi YİRMİ simgedir (panellerin kayıt ve grup satırları, Onaylar eylemleri, Fikir satırı ve istasyon)");
});

test("satır nöbeti: satır kaynakları geometrik ailenin çizim dilini izler ve renk GÖMÜLMEZ (YUZ-4.1)", () => {
  for (const ad of SATIR_SIMGELERI) {
    const yol = satirSvgKaynagi(ad);
    const icerik = oku(yol);
    for (const nitelik of ['viewBox="0 0 24 24"', 'fill="none"', 'stroke="currentColor"', 'stroke-width="1.7"'])
      assert.ok(icerik.includes(nitelik),
        `satır nöbeti: ${yol} çizim dilinden ayrılıyor — ${nitelik} yok`);
    assert.ok(!/#[0-9A-Fa-f]{3,8}\b/.test(icerik),
      `satır nöbeti: ${yol} içinde somut renk var — renk yalnız arac/simge-uret.mjs çizelgesinde yaşar`);
  }
});

test("satır nöbeti: on dokuz satır simgesinin içeriği birbirinden FARKLIDIR — grup ile kayıt aynı simgeyi taşıyamaz", () => {
  const icerikler = SATIR_SIMGELERI.map((ad) => oku(satirSvgKaynagi(ad)));
  for (let i = 0; i < icerikler.length; i++)
    for (let j = i + 1; j < icerikler.length; j++)
      assert.notEqual(icerikler[i], icerikler[j],
        `satır nöbeti: ${satirSvgKaynagi(SATIR_SIMGELERI[i])} ile ` +
        `${satirSvgKaynagi(SATIR_SIMGELERI[j])} AYNI çizimi taşıyor — ` +
        "iki satır kademesi bakışta ayrılmaz (Founder 2026-07-28 bulgusu geri gelemez)");
});

test("satır nöbeti: üretilmiş anlam×tema varyantları diskte yaşar (satır iconPath'i boşa bakmaz)", () => {
  for (const ad of SATIR_SIMGELERI)
    for (const anlam of ANLAM_RENKLERI)
      for (const tema of ["acik", "koyu"] as const) {
        const yol = satirSvgVaryanti(ad, anlam, tema);
        assert.ok(existsSync(join(KOK, yol)),
          `satır nöbeti: ${yol} diskte yok — "npm run build" (arac/simge-uret.mjs) üretir`);
      }
});

test("satır nöbeti: üreticinin anlam çizelgesi ile çizelgenin anlam ekseni BİREBİRDİR", async () => {
  const { ANLAM_RENK } = await import("../arac/simge-uret.mjs");
  assert.deepEqual(Object.keys(ANLAM_RENK).sort(), [...ANLAM_RENKLERI].sort(),
    "satır nöbeti: üreticinin ANLAM_RENK çizelgesi çizelgenin ANLAM_RENKLERI ekseninden ayrıştı — " +
    "anlam eklemek/silmek iki dosyada BİRLİKTE yapılır");
});

test("satır nöbeti: hiçbir panel hazır ikon kimliğine GERİ DÜŞMEZ — codicon satır kalıntısı sıfır", () => {
  // Dört panelin kayıt/grup satırlarını basan kaynaklarda string-literal
  // ThemeIcon KALMADI; simge yalnız çizelgeden okunur. MEŞRU İSTİSNALAR ve
  // gerekçeleri (bu tarama bilerek kapsamaz):
  //   • yol-dekor.ts DURUM_ROZET — Adım satırının checkbox kanunu bölgesi:
  //     geliştirmede'nin DÖNEN ikonu (sync~spin) yalnız codicon'da yaşar
  //     (SVG iconPath animasyon çözmez, VS Code kısıtı) ve bloklu/doğrulanmamış
  //     aynı durum-rozet sisteminin parçasıdır (YAS-4 · Founder 2026-07-14).
  //   • yuzey-cekirdek.ts durum çubuğu $(mail|bell|eye) — StatusBarItem yalnız
  //     codicon fontu basabilir (SVG kabul etmez); satır ikonu değildir.
  //   • Onaylar dosya satırının teknoloji simgesi — kendi tek kaynağı
  //     teknoloji-simgesi.ts'dir ve dosyanın teknoloji kimliğini taşır.
  const paneller = [
    "src/yolharitasi.ts", "src/hatirlaticilar.ts",
    "src/bildirimler.ts", "src/posta-kutusu.ts", "src/posta-govde.ts",
  ];
  for (const dosya of paneller) {
    const kaynak = oku(dosya);
    const kalinti = /new\s+vscode\.ThemeIcon\(\s*"/.exec(kaynak);
    assert.equal(kalinti, null,
      `geri-düşüş: ${dosya} hâlâ string-literal codicon basıyor (${kalinti?.[0] ?? ""}) — ` +
      "satır simgesi yalnız simge-cizelgesi.ts çizelgesinden okunur (VIT-KIMLIK-A05)");
    assert.ok(!kaynak.includes("💬"),
      `geri-düşüş: ${dosya} kapı balonunu hazır emojiyle basıyor — geometrik satir-kapi.svg kullanılır`);
  }
});

// ── EDİTÖR HANESİ NÖBETLERİ (VIT-KIMLIK-A06 · Founder hükmü 2026-08-04) ─────
//    Örnek belgede altı tipin bildirim satırları dekorasyon kararı alır, kapsam
//    çizelgeyle (EKSEN_TIPLERI) eşittir ve mutasyonla kanıtlıdır; simge yolları
//    tek kaynaktan türer ve diskte yaşar; dosyanın sha256 özeti dekorasyon
//    öncesi ve sonrası birebirdir; debounce kasma regresyonunu kilitler.

const sha256 = (veri: Uint8Array): string => createHash("sha256").update(veri).digest("hex");
const programla = (kaynak: string): Program => ayristir(belirtecle(kaynak));

// Altı eksen tipini, emoji eşadlı bir Adım'ı (🍃 → satır zaten simge taşır,
// dekor almaz), dizgi/yorum içinde geçen tip adlarını ve eksen çizelgesi
// DIŞINDA kalan meyve-ailesi Kod bildirimini birlikte taşıyan örnek belge.
const ORNEK = [
  'Faz( kod: FAZ-1, ne: "Katman bu dizgide içeriktir, dekor almaz" ) {',
  "  Blok( kod: BLK-1 ) {",
  "    Katman( kod: KAT-1 ) {",
  "      AltKatman( kod: ALT-1 ) {",
  "        Adım( kod: ADM-1, durum: tamamlandı )",
  "        Adım( kod: ADM-2, durum: geliştirmede )",
  "        🍃( kod: ADM-3, durum: beklemede )",
  "      }",
  "    }",
  "  }",
  "  // Blok bu yorumda düzyazıdır, dekor almaz",
  "}",
  'Meyve( kod: MYV-1, ne: "durumsuz meyve nötr evrede kalır" )',
  'Kod( kod: KOD-1, dosya: "x.ts", ne: "meyve ailesi ama eksen çizelgesi dışı" )',
].join("\n");

test("A06 kapsam: altı eksen tipinin bildirim satırları karar alır ve kapsam çizelgeyle EŞİTTİR — mutasyonla kanıtlı", () => {
  const bekci = (tipler?: ReadonlySet<string>): void => {
    const kararlar = eksenDekorKararlari(ORNEK, programla(ORNEK), tipler);
    assert.deepEqual(new Set(kararlar.map((k) => k.tip)), new Set(EKSEN_TIPLERI),
      "A06 nöbeti: dekor alan tip kümesi çizelgenin (EKSEN_TIPLERI) kapsamından ayrıştı");
  };
  bekci();
  // Mutasyon kanıtı (gorsel-esad kapisizMutant emsali): çizelge kümesinden
  // Meyve düşürülmüş bir mutant kapsam nöbetinden KAÇAMAZ.
  const mutant = new Set<string>(EKSEN_TIPLERI.filter((t) => t !== "Meyve"));
  assert.throws(() => bekci(mutant), /EKSEN_TIPLERI/u,
    "A06 nöbeti: eksik-tip mutasyonu kapsam nöbetinden sessizce geçti");
});

test("A06 konum ve evre: karar tip adının kendi dilimine oturur; RENK=DURUM kanonik türetmeden gelir (YUZ-4)", () => {
  const kararlar = eksenDekorKararlari(ORNEK, programla(ORNEK));
  assert.deepEqual(
    kararlar.map((k) => [k.tip, k.satir, k.baslangic, k.bitis, k.evre]),
    [
      // Kapsayıcılar alt ağaçtan türer: 1 tamam + 1 geliştirmede → sürüyor.
      ["Faz", 0, 0, 3, "sürüyor"],
      ["Blok", 1, 2, 6, "sürüyor"],
      ["Katman", 2, 4, 10, "sürüyor"],
      ["AltKatman", 3, 6, 15, "sürüyor"],
      ["Adım", 4, 8, 12, "bitti"],
      ["Adım", 5, 8, 12, "sürüyor"],
      // 🍃 satırı kararda YOK (satır zaten simge taşıyor); Meyve durumsuz → nötr.
      ["Meyve", 12, 0, 5, "bekliyor"],
    ],
    "A06 nöbeti: konum/evre kararları beklenen çizimden saptı");
});

test("A06 evre çizelgesi: beş Adım durumunun tamamı üç evreye iner ve yalnız tamamlandı 'bitti' boyanır", () => {
  assert.deepEqual(new Set(Object.keys(ADIM_EVRESI)), new Set(ADIM_YASAM_DURUMLARI),
    "A06 nöbeti: ADIM_EVRESI çizelgesi kanonik Adım durum kümesinden ayrıştı");
  for (const [durum, evre] of Object.entries(ADIM_EVRESI)) {
    assert.equal(evre === "bitti", durum === "tamamlandı",
      `A06 nöbeti: '${durum}' durumu '${evre}' evresine gidiyor — bitmemiş iş yeşil boyanamaz (YUZ-4)`);
  }
});

test("A06 dayanıklılık: bozuk/geçici belgede program yoksa kare dekorsuzdur, akış kesilmez", () => {
  assert.deepEqual(eksenDekorKararlari("Blok( kod: BOZUK", undefined), [],
    "A06 nöbeti: program yokken karar listesi boş olmalı");
});

// ── Kayıt boru hattı: sahte kabuk + gerçek diskteki üretilmiş varyantlar ─────

interface SahteDekor {
  range: { sb: number; bb: number; ss: number; bs: number };
  renderOptions: {
    light: { before: { contentIconPath: SahteUri } };
    dark: { before: { contentIconPath: SahteUri } };
  };
}

class SahteUri {
  readonly fsPath: string;
  constructor(fsPath: string) { this.fsPath = fsPath; }
  toString(): string { return this.fsPath; }
}

/** En küçük sahte VS Code kabuğu — dekorasyonları ve dinleyicileri sayar. */
function kabukKur(metinOku: () => string): {
  kabuk: unknown;
  context: { subscriptions: Array<{ dispose(): void }>; extensionUri: SahteUri };
  boyamalar: SahteDekor[][];
  belgeDegisti: () => void;
} {
  const boyamalar: SahteDekor[][] = [];
  const belge = {
    languageId: "sarmal",
    version: 1,
    uri: { toString: () => `sahte:eksen-dekor-${Math.random()}` },
    getText: metinOku,
  };
  const editor = {
    document: belge,
    setDecorations: (_tur: unknown, dekor: SahteDekor[]): void => { boyamalar.push(dekor); },
  };
  const abonelik = { dispose(): void { /* sınama kabuğu */ } };
  let belgeDinleyici: ((olay: { document: typeof belge }) => void) | undefined;
  const kabuk = {
    DecorationRangeBehavior: { ClosedClosed: 0 },
    Range: class {
      readonly sb: number; readonly bb: number; readonly ss: number; readonly bs: number;
      constructor(sb: number, bb: number, ss: number, bs: number) {
        this.sb = sb; this.bb = bb; this.ss = ss; this.bs = bs;
      }
    },
    Uri: { joinPath: (kok: SahteUri, ...parcalar: string[]) => new SahteUri(join(kok.fsPath, ...parcalar)) },
    window: {
      visibleTextEditors: [editor],
      createTextEditorDecorationType: () => abonelik,
      onDidChangeVisibleTextEditors: () => abonelik,
    },
    workspace: {
      onDidChangeTextDocument: (f: (olay: { document: typeof belge }) => void) => {
        belgeDinleyici = f;
        return abonelik;
      },
    },
  };
  return {
    kabuk,
    context: { subscriptions: [], extensionUri: new SahteUri(KOK) },
    boyamalar,
    belgeDegisti: () => belgeDinleyici?.({ document: belge }),
  };
}

test("A06 sha256 + tek kaynak: boru hattı altı tipi diskteki varyantlarla boyar ve dosyanın TEK BAYTINI değiştirmez", () => {
  const dizin = mkdtempSync(join(tmpdir(), "sarmal-eksen-dekor-"));
  const dosya = join(dizin, "ornek.sar");
  try {
    writeFileSync(dosya, ORNEK, "utf8");
    const once = readFileSync(dosya);
    const onceSha = sha256(once);

    const { kabuk, context, boyamalar } = kabukKur(() => readFileSync(dosya, "utf8"));
    eksenDekorKaydi(
      context as unknown as import("vscode").ExtensionContext,
      kabuk as unknown as typeof import("vscode"),
    );
    assert.equal(boyamalar.length, 1, "A06 nöbeti: kayıt açılışta görünen editörü BİR kez boyamalı");

    const dekorlar = boyamalar[0];
    const beklenen = eksenDekorKararlari(ORNEK, programla(ORNEK));
    assert.equal(dekorlar.length, beklenen.length,
      "A06 nöbeti: boyanan dekor sayısı saf kararla eşit değil");
    for (const [i, k] of beklenen.entries()) {
      const d = dekorlar[i];
      assert.deepEqual([d.range.sb, d.range.bb, d.range.ss, d.range.bs],
        [k.satir, k.baslangic, k.satir, k.bitis],
        `A06 nöbeti: ${k.tip} dekorasyonu tip adının dilimine oturmuyor`);
      for (const [tema, kanal] of [["acik", "light"], ["koyu", "dark"]] as const) {
        const yol = d.renderOptions[kanal].before.contentIconPath.fsPath;
        assert.equal(yol, join(KOK, eksenSvgVaryanti(k.tip, k.evre, tema)),
          `A06 nöbeti: ${k.tip} ${kanal} simge yolu çizelgeden (eksenSvgVaryanti) sapmış`);
        assert.ok(existsSync(yol),
          `A06 nöbeti: ${yol} diskte yok — dekorasyon boşa bakar ("npm run build" üretir)`);
      }
    }

    const sonra = readFileSync(dosya);
    assert.equal(sha256(sonra), onceSha, "A06 nöbeti: dekorasyon diskteki SHA-256 özetini değiştirdi");
    assert.deepEqual(sonra, once, "A06 nöbeti: dekorasyon kaynak baytlarını değiştirdi");
    for (const a of context.subscriptions) a.dispose();
  } finally {
    rmSync(dizin, { recursive: true, force: true });
  }
});

test("A06 performans: art arda belge değişimleri debounce ile TEK boyamaya iner (kasma regresyonu kilidi)", async () => {
  const { kabuk, context, boyamalar, belgeDegisti } = kabukKur(() => ORNEK);
  eksenDekorKaydi(
    context as unknown as import("vscode").ExtensionContext,
    kabuk as unknown as typeof import("vscode"),
    20,
  );
  assert.equal(boyamalar.length, 1, "A06 nöbeti: açılış boyaması bir kez olmalı");
  belgeDegisti();
  belgeDegisti();
  belgeDegisti();
  assert.equal(boyamalar.length, 1,
    "A06 nöbeti: tuş vuruşu ANINDA boyama tetikledi — debounce devre dışı (kasma regresyonu)");
  await beklet(60);
  assert.equal(boyamalar.length, 2,
    "A06 nöbeti: üç ardışık değişim gecikme sonunda TEK boyamaya inmeli");
  for (const a of context.subscriptions) a.dispose();
});

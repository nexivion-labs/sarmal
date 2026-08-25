// Sınıflama örtü-merge sınamaları (node:test) — SEF-L3-K8 · A20 · yığın-örtüsü.
// TIP-2.5 additive lego + STR-3 (örtü ürün tarafında, taban dokunulmaz). Enum-denetim
// tek noktadan akar (dogrulayici:210); burada SAF merge motoru birim-test edilir.
import { test } from "node:test";
import assert from "node:assert/strict";
import { siniflamaOrtuMerge, siniflamaOrtuYukle, type Siniflama, type SiniflamaOrtu } from "../src/siniflama.ts";

// Minimal taban: Beceri.yığın 4-değerli enum (gerçek kayit.json deseni).
function tabanYap(): Siniflama {
  return {
    widgetTipleri: [],
    kenarTipleri: [],
    izinliSarma: {},
    yuzeyKurali: { duzen: [], yaprak: [], kural: "" },
    semalar: {
      Beceri: { zorunlu: ["kod", "yığın"], enum: { yığın: ["flutter", "react", "fastapi", "evrensel"] } },
    },
  };
}

test("① union doğru — taban 4 + örtü 9 = 13 (sıra: taban önce, örtü sona)", () => {
  const taban = tabanYap();
  const örtü: SiniflamaOrtu = {
    semalar: { Beceri: { enum: { yığın: ["ai", "python", "typescript"] } } },
  };
  const m = siniflamaOrtuMerge(taban, örtü);
  assert.deepEqual(m.semalar!.Beceri.enum!.yığın, [
    "flutter", "react", "fastapi", "evrensel", "ai", "python", "typescript",
  ]);
});

test("② örtüsüz → taban birebir döner (undefined/null/boş)", () => {
  const taban = tabanYap();
  assert.equal(siniflamaOrtuMerge(taban, undefined), taban, "undefined → aynı referans");
  assert.equal(siniflamaOrtuMerge(taban, null), taban, "null → aynı referans");
  assert.equal(siniflamaOrtuMerge(taban, {}), taban, "boş örtü (semalar yok) → aynı referans");
});

test("③ additive — yinelenen atlanır, taban değeri KAYBOLMAZ", () => {
  const taban = tabanYap();
  // 'flutter' zaten tabanda; 'ai' yeni. Sonuç: tek 'flutter' + eklenen 'ai'.
  const m = siniflamaOrtuMerge(taban, {
    semalar: { Beceri: { enum: { yığın: ["flutter", "ai", "ai"] } } },
  });
  assert.deepEqual(m.semalar!.Beceri.enum!.yığın, [
    "flutter", "react", "fastapi", "evrensel", "ai",
  ], "yinelenen 'flutter'/'ai' tek kez, taban tümü korunur");
});

test("④ SAF — taban nesnesi MUTASYONA uğramaz (TIP-2.5: taban dokunulmaz)", () => {
  const taban = tabanYap();
  const öncesi = [...taban.semalar!.Beceri.enum!.yığın];
  siniflamaOrtuMerge(taban, {
    semalar: { Beceri: { enum: { yığın: ["ai", "python"] } } },
  });
  assert.deepEqual(taban.semalar!.Beceri.enum!.yığın, öncesi, "taban enum'u değişmemeli");
});

test("⑤ jenerik — herhangi tip.enum.alan genişler + yeni alan eklenir", () => {
  const taban = tabanYap();
  const m = siniflamaOrtuMerge(taban, {
    semalar: {
      Beceri: { enum: { yığın: ["ai"], seviye: ["kıdemli"] } }, // yığın genişler + yeni 'seviye' alanı
    },
  });
  assert.deepEqual(m.semalar!.Beceri.enum!.yığın, ["flutter", "react", "fastapi", "evrensel", "ai"]);
  assert.deepEqual(m.semalar!.Beceri.enum!.seviye, ["kıdemli"], "örtüde olan yeni enum alanı eklenir");
});

// ── BKM-OLG-A02: örtü find-up keşfi (yalnız YUKARI — kardeşe sızmaz, TIP-2.5) ────
test("siniflamaOrtuYukle: alt-dizinden kökteki örtü bulunur (find-up); kardeş varlığa sapmaz", async () => {
  const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const kok = mkdtempSync(join(tmpdir(), "ortu-"));
  try {
    // kök ÇalışmaAlanı örtüsü + iki alt seviye
    mkdirSync(join(kok, "oz", "siniflama"), { recursive: true });
    writeFileSync(join(kok, "oz", "siniflama", "ortu.json"),
      JSON.stringify({ semalar: { Beceri: { enum: { yığın: ["ai"] } } } }));
    mkdirSync(join(kok, "uygulama", "derin"), { recursive: true });
    // kardeş varlık (örtüsüz) — find-up ona ASLA sapmamalı
    mkdirSync(join(kok, "kardes"), { recursive: true });
    const altindan = siniflamaOrtuYukle(join(kok, "uygulama", "derin"));
    assert.ok(altindan, "alt-dizinden kök örtüsü bulunmalı (find-up)");
    assert.deepEqual(altindan!.semalar?.Beceri?.enum?.yığın, ["ai"]);
    const kokten = siniflamaOrtuYukle(kok);
    assert.ok(kokten, "kökten birebir davranış korunur");
  } finally {
    rmSync(kok, { recursive: true, force: true });
  }
});

// ── BKM-OLG-A01: taksonomi oto-üretim (şema→doküman, idempotent) ──────────────
test("taksonomiMd + taksonomiBlokUygula: kanondan envanter üretilir, iki koşu aynı çıktı, elle bölge korunur", async () => {
  const { taksonomiMd, taksonomiBlokUygula, siniflamaYukle } = await import("../src/siniflama.ts");
  const { fileURLToPath } = await import("node:url");
  const snf = siniflamaYukle(fileURLToPath(new URL("../../../oz/siniflama/kayit.json", import.meta.url)));
  const blok = taksonomiMd(snf);
  assert.ok(blok.includes("Makine Envanteri") && blok.includes("widget tipi"), "envanter başlığı + sayım");
  assert.ok(blok.includes("| **plan** |"), "aile satırları üretilmeli");
  const elle = "# Elle yazılmış anlatı\n\nBu blok korunmalı.\n";
  const bir = taksonomiBlokUygula(elle, blok);
  const iki = taksonomiBlokUygula(bir, blok);
  assert.equal(bir, iki, "idempotent: ikinci uygulama değişiklik üretmez");
  assert.ok(iki.startsWith(elle.trimEnd()) || iki.includes("Bu blok korunmalı."), "elle bölge korunur");
});

// ── ADM-DGS-10: CUE `*` varsayılan-işareti (kapalı-enum görünür varsayılanı) ──
test("DGS-10: siniflamaNormalize `*değer`i çözer — enum temizlenir, varsayilan türetilir, girdi bozulmaz", async () => {
  const { siniflamaNormalize, varsayilanDeger } = await import("../src/siniflama.ts");
  const ham: Siniflama = {
    widgetTipleri: [], kenarTipleri: [], izinliSarma: {},
    yuzeyKurali: { duzen: [], yaprak: [], kural: "" },
    semalar: {
      Adım: { zorunlu: ["kod"], enum: { durum: ["*beklemede", "geliştirmede", "tamamlandı", "bloklu"] } },
      Karar: { zorunlu: ["kod"], enum: { durum: ["kilitli", "bekliyor"] } },   // yıldızsız — dokunulmaz
    },
  };
  const snf = siniflamaNormalize(ham);
  assert.deepEqual(snf.semalar!["Adım"].enum!.durum, ["beklemede", "geliştirmede", "tamamlandı", "bloklu"]);
  assert.equal(snf.semalar!["Adım"].varsayilan?.durum, "beklemede");
  assert.equal(varsayilanDeger(snf, "Adım", "durum"), "beklemede");
  assert.equal(snf.semalar!["Karar"].varsayilan, undefined, "yıldızsız şemaya varsayılan uydurulmaz");
  // girdi BOZULMAZ (saf): ham hâlâ yıldızlı
  assert.equal(ham.semalar!["Adım"].enum!.durum[0], "*beklemede");
});

test("DGS-10: gerçek kanon — Adım.durum varsayılanı *beklemede olarak yükleniyor (siniflamaYukle normalize)", async () => {
  const { siniflamaYukle, varsayilanDeger } = await import("../src/siniflama.ts");
  const { fileURLToPath } = await import("node:url");
  const snf = siniflamaYukle(fileURLToPath(new URL("../../../oz/siniflama/kayit.json", import.meta.url)));
  assert.ok(snf.semalar!["Adım"].enum!.durum.includes("beklemede"), "enum temiz değer taşımalı");
  assert.ok(!snf.semalar!["Adım"].enum!.durum.some((d) => d.startsWith("*")), "enum'da yıldız kalmamalı");
  assert.equal(varsayilanDeger(snf, "Adım", "durum"), "beklemede");
  // eklenti yolharitasi fallback'i bu değere KİLİTLİ (yolharitasi.ts ogeleriTopla) —
  // kanon varsayılanı değişirse bu test kırılır ve iki yüz birlikte güncellenir.
});

test("DGS-10: örtü-merge varsayılanı korur (spread ile taşınır)", async () => {
  const { siniflamaNormalize, siniflamaOrtuMerge: merge } = await import("../src/siniflama.ts");
  const taban = siniflamaNormalize({
    widgetTipleri: [], kenarTipleri: [], izinliSarma: {},
    yuzeyKurali: { duzen: [], yaprak: [], kural: "" },
    semalar: { Adım: { zorunlu: ["kod"], enum: { durum: ["*beklemede", "tamamlandı"] } } },
  } as Siniflama);
  const örtülü = merge(taban, { semalar: { Adım: { enum: { durum: ["os-özel"] } } } });
  assert.deepEqual(örtülü.semalar!["Adım"].enum!.durum, ["beklemede", "tamamlandı", "os-özel"]);
  assert.equal(örtülü.semalar!["Adım"].varsayilan?.durum, "beklemede", "örtü varsayılanı silmemeli");
});

test("örtü zinciri: iç örtü dıştakini GÖLGELEMEZ — dıştan içe birleşim (iki kademe)", async () => {
  // Ölçülmüş kusurun nöbeti: yükleyici eskiden İLK örtüde durup dönüyordu ve
  // dıştaki değerler sessizce kayboluyordu. Fikstür iki kademeli gerçek bir
  // dizin zinciri kurar: kök örtüsü bir değer, iç örtü başka bir değer ekler;
  // iç dizinden yükleme İKİSİNİ BİRDEN görmelidir.
  const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { siniflamaOrtuYukle: yukle } = await import("../src/siniflama.ts");
  const kok = mkdtempSync(join(tmpdir(), "sarmal-ortu-zinciri-"));
  try {
    const dis = join(kok, "oz", "siniflama");
    const icKok = join(kok, "sektor");
    const ic = join(icKok, "oz", "siniflama");
    mkdirSync(dis, { recursive: true });
    mkdirSync(ic, { recursive: true });
    writeFileSync(join(dis, "ortu.json"),
      JSON.stringify({ semalar: { AltKatman: { enum: { departman: ["hukuk"] } } } }));
    writeFileSync(join(ic, "ortu.json"),
      JSON.stringify({ semalar: { AltKatman: { enum: { departman: ["tasarım", "hukuk"] } } } }));
    const örtü = yukle(icKok);
    const departman = örtü?.semalar?.["AltKatman"]?.enum?.["departman"] ?? [];
    assert.ok(departman.includes("hukuk"),
      "DIŞ örtünün değeri kayboldu — zincir birleşmiyor, iç örtü gölgeliyor");
    assert.ok(departman.includes("tasarım"), "iç örtünün değeri kayboldu");
    assert.equal(departman.filter((d) => d === "hukuk").length, 1,
      "yinelenen değer tekilleştirilmedi");
    assert.equal(departman[0], "hukuk",
      "dıştan içe sıra bozuldu — dıştaki değer önce yaşamalı");
    // Tek kademe davranışı değişmedi: kökten yükleme yalnız kök örtüsünü verir.
    assert.deepEqual(yukle(kok)?.semalar?.["AltKatman"]?.enum?.["departman"], ["hukuk"]);
  } finally {
    rmSync(kok, { recursive: true, force: true });
  }
});

// ── V1B-ROLINDEKS-A01: TIP-1.16 çapraz rol indeksi (kanon → sicil nöbeti) ─────
//   Madde beş rol kümesi sayar (yasa · plan · bilgi · yuzey · arkayuz) ve üyelik
//   yalnız kanon metninde yaşıyordu. Nöbet ÜRETİM YOLUNU ölçer: gerçek kayit.json
//   siniflamaYukle ile yüklenir ve madde metninden (yasa/kanon/tip.sar TIP-1.16
//   hükmü) çıkarılan üyelik birebir doğrulanır; kendi ikizi bir fikstür kurulmaz.
test("TIP-1.16: caprazRoller alanı üretim kaydından yüklenir ve madde üyelikleriyle birebirdir", async () => {
  const { siniflamaYukle } = await import("../src/siniflama.ts");
  const { fileURLToPath } = await import("node:url");
  const snf = siniflamaYukle(fileURLToPath(new URL("../../../oz/siniflama/kayit.json", import.meta.url)));

  // Katalog: beş rol kümesi, madde sırasıyla.
  assert.deepEqual(snf.caprazRolKumeleri?.izinliRoller, ["yasa", "plan", "bilgi", "yuzey", "arkayuz"],
    "caprazRolKumeleri kataloğu TIP-1.16'nın beş rol kümesini saymalı");

  // Madde Örneği: Sözleşme ürün kimliğini korurken Yüzey ve Arkayüz rol sorgularında bulunur.
  const sozlesme = snf.widgetTipleri.find((t) => t.ad === "Sözleşme");
  assert.deepEqual(sozlesme?.caprazRoller, ["yuzey", "arkayuz"],
    "Sözleşme madde Örneği gereği yuzey ile arkayuz rollerinde çok-üyeli olmalı");
  assert.equal(sozlesme?.aile, "urun", "çok-üyelik ana aileyi DEĞİŞTİRMEZ — Sözleşme urun ailesinde kalır");

  // Hüküm satırındaki beş kümenin tam üyeliği (tip.sar TIP-1.16 hükmünden çıkarılmıştır).
  const rolUyeleri = (rol: string) =>
    snf.widgetTipleri.filter((t) => t.caprazRoller?.includes(rol)).map((t) => t.ad).sort();
  assert.deepEqual(rolUyeleri("yasa"), ["Anayasa", "Karar", "Kural", "Mevzuat", "Politika"].sort());
  assert.deepEqual(rolUyeleri("plan"),
    ["Faz", "Blok", "Katman", "AltKatman", "Adım", "Kapı", "Döngü", "Gereksinim"].sort());
  assert.deepEqual(rolUyeleri("bilgi"), ["Beceri", "Felsefe", "Çıkarım", "Formül", "Sözlük"].sort());
  assert.deepEqual(rolUyeleri("yuzey"), ["Ekran", "Form", "Düğme", "Metin", "Sözleşme"].sort());
  assert.deepEqual(rolUyeleri("arkayuz"), ["Uç", "Sözleşme"].sort());

  // Kabul ölçütü: en az beş tip için çok-üyeli rol alanı doludur; değerler katalog dışına çıkmaz.
  const dolu = snf.widgetTipleri.filter((t) => (t.caprazRoller?.length ?? 0) > 0);
  assert.ok(dolu.length >= 5, `en az beş tipte caprazRoller dolu olmalı (ölçülen: ${dolu.length})`);
  const izinli = new Set(snf.caprazRolKumeleri!.izinliRoller);
  for (const t of dolu) {
    for (const rol of t.caprazRoller!) {
      assert.ok(izinli.has(rol), `${t.ad} tipi katalog dışı rol taşıyor: ${rol}`);
    }
  }

  // Türetilmiş yüz: taksonomi üreticisi rol indeksini kaynaktan basar (kayit.md bölgesi).
  const { taksonomiMd } = await import("../src/siniflama.ts");
  const blok = taksonomiMd(snf);
  assert.ok(blok.includes("Çapraz rol indeksi"), "taksonomi yüzü çapraz rol indeksini taşımalı");
  assert.ok(/\| \*\*yuzey\*\* \| 5 \|.*Sözleşme/.test(blok), "yuzey rol satırı Sözleşme'yi listelemeli");
});

// ── BAYAT MUAFİYET NÖBETİ (V1B-ACIKORNEK-A01 · 2026-08-22) ──────────────────
//
//   Tip doğum kapısı, sıfır kullanımlı bir tipi muafiyet listesinde bulduğu an
//   susar. Bu doğrudur, buna karşılık TERSİ ÖLÇÜLMÜYORDU: muafiyet, tipin
//   canlı kullanıma girmesinden sonra da listede kalabiliyordu ve kimse
//   görmüyordu. 2026-08-22 ölçümü yetmiş dokuz muafiyetin otuz ikisinin bu
//   durumda olduğunu gösterdi; kayıt, canlı kullanılan otuz iki tip için
//   "burada kullanılmıyor" diye beyanda bulunuyordu.
//
//   Kusurun cinsi eksiklik değil YANLIŞ BEYANDIR ve tam olarak kapının
//   korumaya çalıştığı şeydir: sicilde bulunmayan bir durumu canlıymış gibi
//   sunmak. Bu nöbet o beyanı her koşumda ölçer; yeni bir tip canlı kullanıma
//   girdiğinde muafiyeti sökülmezse süit kırmızıya döner.
import { readFileSync as _okuMuaf } from "node:fs";
import { fileURLToPath as _yolMuaf } from "node:url";
import { programHaritasi as _progMuaf } from "../src/sef.ts";

test("muafiyet bayatlamaz: muaf ilan edilen hiçbir tip canlı bahçede kullanılmaz", () => {
  const kok = _yolMuaf(new URL("../../..", import.meta.url));
  const snf = JSON.parse(_okuMuaf(_yolMuaf(new URL("../../../oz/siniflama/kayit.json", import.meta.url)), "utf8"));
  const muafiyet: Record<string, string> = snf.tipMuafiyetleri ?? {};
  // Kapının kendi kapsam kuralı: örnek, sınama, vitrin ve fikstür canlı sayılmaz.
  const BAHCE_DISI = /(^|\/)(ornek|sinama|vitrin|fikstur)(\/|$)|(_ornek|_vitrin|_fikstur)/;
  const sayim = new Map<string, number>();
  const say = (n: { tur: string; ad: string; cocuklar: unknown[] }): void => {
    if (n.tur === "widget") sayim.set(n.ad, (sayim.get(n.ad) ?? 0) + 1);
    for (const c of n.cocuklar) say(c as typeof n);
  };
  for (const [dosya, p] of _progMuaf(kok)) {
    if (BAHCE_DISI.test(dosya)) continue;
    for (const b of p.bildirimler) say(b as never);
  }
  const bayat = Object.keys(muafiyet).filter((t) => (sayim.get(t) ?? 0) > 0);
  assert.deepEqual(bayat, [],
    `BAYAT MUAFİYET: aşağıdaki tipler canlı bahçede kullanılıyor, buna karşılık kayıt onları `
    + `muaf ilan etmeyi sürdürüyor — beyan gerçeği yalanlıyor. Muafiyeti kayit.json içinden `
    + `sök: ${bayat.map((t) => `${t} (${sayim.get(t)} düğüm)`).join(", ")}`);
});

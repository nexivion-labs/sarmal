// RBAC yetki zorlaması sınamaları (node:test) — RAY-3 Aşama 4 · D.1.
//
//   V1B-RBAC-A01 (2026-08-09): dosyanın ikinci yarısı yetki motorunun ANA DENETİM
//   AKIŞINA bağlı kaldığını nöbetle tutar. Kusurun ağırlığı şuydu: yetki kuralları
//   yalnız ayrı `sarmal rbac` alt komutundan okunursa `denetle` ile `denetle-proje`
//   sıfır hata bildirdiği hâlde apex tekilliği, yönetici üretim yasağı, paylaşık
//   bellek yasağı ve kalıcı atama yasağı ihlalleri görünmez kalır; aracın kapısı
//   yeşil yanarken gerçek ihlalin yaşaması ORK-6.3 zorlamasını kâğıt üstünde
//   bırakır ve YAS-3.4'ün "sicilde bulunmayan bir zorlamayı canlıymış gibi sunma"
//   yasağını çiğner. Bağlantı iki kademede tutulur: `sefAkisiTanilari` üreticisi
//   (denetci.ts) RBAC kayıtlarını iş bölümü kapısına katar, `denetimKos` (denetim.ts)
//   o kapıyı proje-çapı akışta koşar. Nöbetler ikisini ayrı ayrı ölçer ki
//   bağlantının hangi kademede koptuğu tanıdan okunabilsin.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { belirtecle } from "../src/belirtec.ts";
import { ayristir } from "../src/ayristirici.ts";
import { rbacAltKomutTanilari, rbacÇağrıDenetle, rbacGrafDenetle, VARSAYILAN_ROL_PROFIL } from "../src/rbac.ts";
import { sefAkisiTanilari } from "../src/denetci.ts";
import { denetimKos } from "../src/denetim.ts";
import type { Program } from "../src/sozdizim.ts";

const graf = (sar: string) =>
  rbacGrafDenetle(new Map<string, Program>([["t.sar", ayristir(belirtecle(sar))]]));

const SNF_YOL = fileURLToPath(new URL("../../../oz/siniflama/kayit.json", import.meta.url));

/** Adımın şart koştuğu ihlalleri taşıyan kadro: iki apex, L5 ile paylaşık bellek,
 *  kalıcı atanmış L6 ve üretim kenarı taşıyan bir yönetici. */
const İHLALLİ_KADRO = [
  'Etmen( kod: ETM-APEX-BIR, tür: apex, uzmanlık: "yönetim", yetki: L4, bellek: izole,',
  '       ne: "birinci apex", uygular: ANY-FX )',
  'Etmen( kod: ETM-APEX-IKI, tür: apex, uzmanlık: "yönetim", yetki: L4, bellek: izole,',
  '       ne: "ikinci apex — tekillik ihlali", uygular: ANY-FX )',
  'Etmen( kod: ETM-L5-PAY, tür: uzman, uzmanlık: "denetim", yetki: L5, bellek: paylaşık,',
  '       ne: "L5 yetkisi paylaşık bellekle yazılmış", uygular: ANY-FX )',
  'Etmen( kod: ETM-L6-KAL, tür: uzman, uzmanlık: "kök", yetki: L6, bellek: izole,',
  '       ne: "L6 yetkisi kalıcı atanmış", uygular: ANY-FX )',
  'Etmen( kod: ETM-YON-URET, tür: yönetici, uzmanlık: "akış", yetki: L3, bellek: izole,',
  '       ne: "yönetici üretim kenarı taşıyor", uygular: ANY-FX, üretir: MYV-FX )',
].join("\n") + "\n";

/** Fikstür kadrosunun taşıdığı dört RBAC kimliği — nöbetler bu listeyi arar. */
const BEKLENEN_KODLAR = [
  "rbac-apex-tekil", "rbac-l5-paylaşık", "rbac-l6-kalıcı", "rbac-yönetici-üretir",
] as const;

/** İhlalli kadroyu taşıyan geçici bir proje kökü kurar (canlı ağaca yazılmaz). */
function ihlalliFikstur(): string {
  const kok = mkdtempSync(join(tmpdir(), "sarmal-rbac-akis-"));
  writeFileSync(join(kok, "fx_anadizin.sar"),
    'Proje( kod: PRJ-FX, ad: "fx", ne: "RBAC ihlalli fikstür", rejim: esnek )\n', "utf8");
  writeFileSync(join(kok, "kadro.sar"), İHLALLİ_KADRO, "utf8");
  return kok;
}

/**
 * İki yüzeyin sayısını aynı kök üzerinde ölçer.
 *
 * `ana` ana denetim akışının (denetimKos → "iş bölümü" kapısı) bildirdiği rbac-*
 * tanı sayısıdır. `alt` ise ayrı `sarmal rbac` alt komutunun ÜRETİM YOLUNDAN,
 * `rbacAltKomutTanilari` çağrılarak alınır. Bu bilinçli bir seçimdir: sayıyı
 * burada süzgeci yeniden kurarak hesaplasaydık nöbet üretim yolunu değil kendi
 * ikizini ölçerdi ve kabuktan kapsam süzgeci sökülse bile yeşil kalırdı. Alt
 * komutun kabuğu (sefRbacKomutu) bu işlevin döndürdüğünü yalnız basar, bu yüzden
 * ölçüm alt-süreç doğurmadan ve baskı biçimine bağlanmadan gerçek yolu sınar.
 */
function ikiYuzeyinSayisi(kok: string): { ana: number; alt: number } {
  const sonuc = denetimKos(kok, { snfYol: SNF_YOL, bugun: "2026-08-09" });
  const ana = sonuc.akis.flatMap((r) => r.tanilar).filter((t) => t.kod.startsWith("rbac-")).length;
  return { ana, alt: rbacAltKomutTanilari(kok).tanilar.length };
}

test("rbacÇağrıDenetle — denetçi L5+izole temiz; L3/paylaşık ihlal; üretici L5 ihlal", () => {
  assert.equal(rbacÇağrıDenetle("denetçi", { yetki: "L5", bellek: "izole" }).length, 0);
  assert.ok(rbacÇağrıDenetle("denetçi", { yetki: "L3", bellek: "izole" }).some((i) => i.kural === "L5-denetçi"));
  assert.ok(rbacÇağrıDenetle("denetçi", { yetki: "L5", bellek: "paylaşık" }).some((i) => i.kural === "denetçi-izole"));
  assert.equal(rbacÇağrıDenetle("üretici", { yetki: "L3", bellek: "paylaşık" }).length, 0);
  assert.ok(rbacÇağrıDenetle("üretici", { yetki: "L5", bellek: "izole" }).some((i) => i.kural === "L5-yalnız-denetçi"));
});

test("VARSAYILAN_ROL_PROFIL — kanonik profiller temiz (fail-closed güvenli varsayılan)", () => {
  assert.equal(rbacÇağrıDenetle("üretici", VARSAYILAN_ROL_PROFIL["üretici"]).length, 0);
  assert.equal(rbacÇağrıDenetle("denetçi", VARSAYILAN_ROL_PROFIL["denetçi"]).length, 0);
});

test("rbacGrafDenetle — temiz kadro (tek apex, kurallara uygun) → 0 ihlal", () => {
  const t = graf('Etmen( kod: ETM-A, tür: apex, uzmanlık: "genel", yetki: L4, bellek: izole, ne: "orkestratör", uygular: ANY-X )');
  assert.equal(t.length, 0);
});

test("rbacGrafDenetle — 2 apex → apex-tekil ihlali", () => {
  const t = graf('Etmen( kod: ETM-A, tür: apex, yetki: L4, bellek: izole )\nEtmen( kod: ETM-B, tür: apex, yetki: L4, bellek: izole )');
  assert.ok(t.some((x) => x.tani.kod === "rbac-apex-tekil"));
});

test("rbacGrafDenetle — yönetici+üretir · L5+paylaşık · L6 → hata", () => {
  assert.ok(graf('Etmen( kod: ETM-Y, tür: yönetici, yetki: L3, bellek: izole, üretir: EKR-X )')
    .some((x) => x.tani.kod === "rbac-yönetici-üretir"));
  assert.ok(graf('Etmen( kod: ETM-D, tür: uzman, yetki: L5, bellek: paylaşık )')
    .some((x) => x.tani.kod === "rbac-l5-paylaşık"));
  assert.ok(graf('Etmen( kod: ETM-K, tür: uzman, yetki: L6, bellek: izole )')
    .some((x) => x.tani.kod === "rbac-l6-kalıcı"));
});

test("rbacGrafDenetle — tek apex + L5-izole denetçi kadrosu temiz (kanonik)", () => {
  const t = graf(`
    Etmen( kod: ETM-APEX, tür: apex, yetki: L4, bellek: izole )
    Etmen( kod: ETM-URET, tür: uzman, yetki: L3, bellek: paylaşık )
    Etmen( kod: ETM-DEN, tür: uzman, yetki: L5, bellek: izole )
  `);
  assert.equal(t.length, 0);
});

// ── V1B-RBAC-A01 · ANA DENETİM AKIŞI NÖBETLERİ ──────────────────────────────

test("V1B-RBAC-A01 ① iş bölümü üreticisi RBAC ihlallerini kendi çıktısına katar (denetci.ts bağı)", () => {
  // Bağlantının BİRİNCİ kademesi: `sefAkisiTanilari` içindeki rbacGrafDenetle çağrısı.
  // Bu satır sökülürse nöbet burada düşer ve kusurun yeri tanıdan okunur.
  const programlar = new Map<string, Program>([
    ["kadro.sar", ayristir(belirtecle(İHLALLİ_KADRO))],
  ]);
  const uretilen = sefAkisiTanilari(programlar);
  for (const kod of BEKLENEN_KODLAR) {
    const kayit = uretilen.find((x) => x.tani.kod === kod);
    assert.ok(kayit, `iş bölümü kapısı ${kod} tanısını üretmeli — RBAC motoru ana akıştan koptu`);
    assert.equal(kayit!.tani.duzey, "hata", `${kod} HATA düzeyinde bildirilmeli (ORK-6.3 zorlaması)`);
  }
});

test("V1B-RBAC-A01 ② proje-çapı denetim RBAC ihlallerini HATA olarak bildirir ve iki yolun sayısı tutar", () => {
  const kok = ihlalliFikstur();
  try {
    // Bağlantının İKİNCİ kademesi: denetim.ts'teki "iş bölümü" kapısının proje-çapı
    // akışta koşuyor olması. Kapı akıştan çıkarılırsa liste boşalır ve nöbet düşer.
    const sonuc = denetimKos(kok, { snfYol: SNF_YOL, bugun: "2026-08-09" });
    const akistakiRbac = sonuc.akis.flatMap((r) => r.tanilar).filter((t) => t.kod.startsWith("rbac-"));
    for (const kod of BEKLENEN_KODLAR) {
      const tani = akistakiRbac.find((t) => t.kod === kod);
      assert.ok(tani, `denetle/denetle-proje çıktısı ${kod} bildirmeli — bugün sıfır bildiriyorsa kapı kördür`);
      assert.equal(tani!.duzey, "hata", `${kod} proje-çapı akışta da HATA düzeyinde kalmalı`);
    }
    assert.equal(sonuc.atlananKapilar?.length ?? 0, 0,
      `zorunlu denetim kapısı düştü: ${(sonuc.atlananKapilar ?? []).join(" · ")}`);

    // Kabul ölçütünün üçüncü kalemi: aynı fikstür üzerinde ayrı `sarmal rbac`
    // alt komutunun bildirdiği ihlal sayısı ile ana akıştaki rbac-* sayısı BİREBİR
    // tutmalıdır.
    const { ana, alt } = ikiYuzeyinSayisi(kok);
    assert.equal(ana, akistakiRbac.length, "ölçüm yardımcısı ana akışı aynı saymalı");
    assert.equal(ana, alt,
      `iki yol aynı olguyu farklı sayıyor: ana akış ${ana}, ayrı alt komut ${alt}`);

    // Çift sayım yasağı: aynı ihlal ana akışta bir kereden fazla görünmemelidir.
    for (const kod of BEKLENEN_KODLAR) {
      assert.equal(akistakiRbac.filter((t) => t.kod === kod).length, 1,
        `${kod} ana akışta tam bir kez görünmeli — aynı olgu iki kez basılırsa kullanıcı iki ihlal sanır`);
    }
  } finally {
    rmSync(kok, { recursive: true, force: true });
  }
});

test("V1B-RBAC-A01 ④ ders dünyasındaki ihlal iki yüzeyde de aynı hükmü alır (kapsam ayrışması nöbeti)", () => {
  // 2026-08-09 denetiminin bulduğu kusur: iki yüzey aynı üreticiyi çağırıyordu ama
  // AYNI KÜMEYİ okumuyordu. Ana akış ders dünyasını süzüyor, ayrı alt komut hiç
  // süzmüyordu; ihlalli kadro `ornek/` altına konduğunda ana akış sıfır, alt komut
  // iki bildiriyordu. Bu YANLIŞ KIRMIZI ders fikstürünü "onarmaya" davet eder.
  // Fikstür bilerek ders dünyası yoluna konur, çünkü eski nöbet yalnız ürün
  // yolunda ölçüyordu ve ayrışmayı ASLA yakalayamazdı.
  const kok = mkdtempSync(join(tmpdir(), "sarmal-rbac-ders-"));
  try {
    mkdirSync(join(kok, "ornek"), { recursive: true });
    writeFileSync(join(kok, "fx_anadizin.sar"),
      'Proje( kod: PRJ-FX, ad: "fx", ne: "ders dünyası kapsam nöbeti", rejim: esnek )\n', "utf8");
    writeFileSync(join(kok, "ornek", "ders_kadro.sar"), İHLALLİ_KADRO, "utf8");

    const { ana, alt } = ikiYuzeyinSayisi(kok);
    assert.equal(ana, alt,
      `ders dünyası yolunda iki yüzey ayrıştı: ana akış ${ana}, ayrı alt komut ${alt}`);
    assert.equal(ana, 0,
      "OGR-5: ders dünyasındaki kasıtlı ihlal ürün bulgusu sayılmaz, iki yüzeyde de sıfırdır");
  } finally {
    rmSync(kok, { recursive: true, force: true });
  }
});

test("V1B-RBAC-A01 ⑤ bilerek-hatalı muaf dosyadaki ihlal iki yüzeyde de aynı hükmü alır", () => {
  // Kapsamın ikinci yarısı: muafiyet ilanı. Muaf dosya PARSE edilir ve programlar
  // haritasında durur, dolayısıyla süzgeci uygulamayan bir yüzey onu yargılar.
  // Muafiyet o dosyanın tanılarından bilerek feragat edildiğinin ilanıdır; bir alt
  // komutun feragati görmezden gelmesi kapanmış bir kararı yeniden açar.
  const kok = mkdtempSync(join(tmpdir(), "sarmal-rbac-muaf-"));
  try {
    writeFileSync(join(kok, "fx_anadizin.sar"),
      'Proje( kod: PRJ-FX, ad: "fx", ne: "muafiyet kapsam nöbeti", rejim: esnek )\n', "utf8");
    writeFileSync(join(kok, "kadro.sar"),
      "// sarmal: bilerek-hatalı — bu kadro kasıtlı olarak yetki kurallarını çiğner\n" + İHLALLİ_KADRO,
      "utf8");

    const { ana, alt } = ikiYuzeyinSayisi(kok);
    assert.equal(ana, alt,
      `muaf dosya yolunda iki yüzey ayrıştı: ana akış ${ana}, ayrı alt komut ${alt}`);
    assert.equal(ana, 0, "muafiyet ilanı iki yüzeyde de geçerlidir");
  } finally {
    rmSync(kok, { recursive: true, force: true });
  }
});

test("V1B-RBAC-A01 ③ kurallara uyan kadro proje-çapı akışta hiç rbac tanısı doğurmaz (yanlış-pozitif nöbeti)", () => {
  const kok = mkdtempSync(join(tmpdir(), "sarmal-rbac-temiz-"));
  try {
    writeFileSync(join(kok, "fx_anadizin.sar"),
      'Proje( kod: PRJ-FX, ad: "fx", ne: "kurallara uyan kadro", rejim: esnek )\n', "utf8");
    writeFileSync(join(kok, "kadro.sar"),
      'Etmen( kod: ETM-APEX, tür: apex, uzmanlık: "yönetim", yetki: L4, bellek: izole,\n'
      + '       ne: "tek apex", uygular: ANY-FX )\n'
      + 'Etmen( kod: ETM-DEN, tür: uzman, uzmanlık: "denetim", yetki: L5, bellek: izole,\n'
      + '       ne: "izole denetçi", uygular: ANY-FX )\n', "utf8");
    const sonuc = denetimKos(kok, { snfYol: SNF_YOL, bugun: "2026-08-09" });
    const rbacTanilari = sonuc.akis.flatMap((r) => r.tanilar).filter((t) => t.kod.startsWith("rbac-"));
    assert.deepEqual(rbacTanilari.map((t) => t.kod), [],
      "temiz kadro RBAC tanısı doğurmamalı — yanlış pozitif kapıyı gürültüye boğar");
  } finally {
    rmSync(kok, { recursive: true, force: true });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// klasor-muhru.test.ts — 📛 MIM-3.4 · KLASÖR MÜHRÜ NÖBETİ (KPS-MHR-A02)
//
//   Founder 2026-11-03 tarihinde dosya mührünün bir klasörün adına da
//   basılabilmesine ve o klasörün bütün içeriğini kapsamasına hükmetmiştir.
//   Kusurun canlı kanıtı iki projeli bir maketti: adının başında `@ARSIV@_`
//   taşıyan bir klasörün içine motor iniyor, arşivdeki eski Proje kökünü canlı
//   kökle aynı kodla okuyor ve "ad alanı olmadan ayrışamayan Proje kökü"
//   uyarısıyla ilk tanımı kazandırıyordu. Bu süit hükmün her davranışını ayrı
//   bir sınamayla ve gerçek bir diskte kurulan geçici bir çatıda ölçer; canlı
//   depoya dokunulmaz.
//
//   Ölçülen davranışlar:
//     ① tek çözücü: klasör mührü dosya mührüyle aynı biçim ve aynı kapalı
//        kümeden okunur, yolun herhangi bir klasör parçasında tanınır.
//     ② aynı Proje kodunu taşıyan arşiv klasörü çakışma üretmez, içindeki hiçbir
//        tanı sayılmaz ve klasör adıyla listelenir; mühür kaldırıldığında çakışma
//        uyarısı geri döner.
//     ③ eğitim mühürlü klasörün içeriği okunur ve doğrulanır, fakat karneye ve
//        gündeme girmez.
//     ④ ebedî kural taşıyan bir dosyayı içeren klasöre arşiv mührü basılırsa
//        denetim hata verir.
//     ⑤ geçersiz klasör mührü sessiz geçmez ve klasör canlı kaynak olarak okunur.
//     ⑥ kardeş kök çözümü mühürlü klasörün içindeki Proje kökünü görmez.
//     ⑦ öğretim yüzü (karşılama kartı, doğuş rehberi ve ajan bağlam paketinin
//        ortak üreticisi) klasör mührünü iki dilde öğretir (OGR-3).
//
//   Mutasyon kanıtı (2026-11-03 koşusu; her mutasyon yedekten bayt özdeş geri
//   alındı, SHA-256 özeti geri alma öncesiyle karşılaştırıldı ve süit yeniden
//   yeşil görüldü):
//     M1 `diskTara` klasör mührü dalı söküldü          → ②, ③ ve ④ düştü (③ karşılaştırma
//                                                       ağacı arşiv klasörü taşıdığı için)
//     M2 `DERS_DUNYASI` klasör dalı söküldü             → ① ve ③ düştü
//     M3 ebedî envanterin klasör yürüyüşü söküldü       → yalnız ④ düştü
//     M4 bekçinin klasör kaydı boş döndürüldü           → ②, ③ ve ⑤ düştü
//     M5 `catiKardesleri` mühür süzgeci söküldü         → yalnız ⑥ düştü
//     M6 `INDEKS_DISI` eğitim klasörü dalı söküldü      → yalnız ③ düştü
//     M7 öğretim üreticisinin klasör cümlesi bozuldu    → yalnız ⑦ düştü
// ═══════════════════════════════════════════════════════════════════════════
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, renameSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { denetimKos, type DenetimSonucu } from "../src/denetim.ts";
import { diskTara, programlariYukle } from "../src/denetci.ts";
import { klasorMuhru, klasorAdiKusuru, okunmazMuhurlu, DERS_DUNYASI, dizindenIndeks, catiKardesleri } from "../src/kimlik.ts";
import { dagKur, karneOzeti } from "../src/dag.ts";
import { ebediEnvanter, EBEDI_KILIT_ADI } from "../src/kuralci.ts";
import { belirtecle } from "../src/belirtec.ts";
import { ayristir } from "../src/ayristirici.ts";
import { dosyaMuhruOgretisi } from "../src/ogret.ts";

const SNF_YOL = fileURLToPath(new URL("../../../oz/siniflama/kayit.json", import.meta.url));
const BUGUN = "2026-11-03";
const ARSIV = "arsiv/@ARSIV@_eski";

const kos = (kok: string): DenetimSonucu => denetimKos(kok, { snfYol: SNF_YOL, bugun: BUGUN, tamListe: true });
const tumTanilar = (s: DenetimSonucu) => s.akis.flatMap((r) => r.tanilar.map((t) => ({ dosya: r.dosya, tani: t })));

function yaz(kok: string, yol: string, metin: string): void {
  mkdirSync(dirname(join(kok, yol)), { recursive: true });
  writeFileSync(join(kok, yol), metin, "utf8");
}

/** Bir Proje kökü: anadizin ile kırık atıf taşıyan açık bir Adım. Okunursa denetim ona tanı bağlar. */
function projeKur(kok: string, klasor: string, kod: string, adimKodu: string): void {
  yaz(kok, `${klasor}/alfa_anadizin.sar`, `Proje( kod: ${kod}, ad: "alfa", ne: "Klasör mührü nöbetinin projesi", rejim: esnek ) {
  Raf( kod: RAF-PLAN, yol: "plan/", ne: "Plan rafı" )
}
`);
  yaz(kok, `${klasor}/plan/is.sar`,
    `Adım( kod: ${adimKodu}, durum: beklemede, ne: "Klasör mührü sınaması için yazılmış bir Adım.", referans: [ YOK-HEDEF-${adimKodu} ] )\n`);
}

/** Canlı alfa ile aynı Proje kodunu taşıyan arşiv kopyasını barındıran çatı. */
function catiKur(arsivYolu: string = ARSIV): string {
  const kok = mkdtempSync(join(tmpdir(), "sarmal-klasor-muhru-"));
  const [ust, alt] = arsivYolu.split("/");
  yaz(kok, "cati_anadizin.sar", `ÇalışmaAlanı( kod: CAL-SNM, ad: "Sınav Çatısı", ne: "Klasör mührü nöbet çatısı" ) {
  Kitaplık( kod: KTP-LABS, yol: "labs/", ne: "ürün ofisi" ) {
    Kitaplık( kod: KTP-ALFA, yol: "alfa/", ne: "alfa projesi" )
  }
  Kitaplık( kod: KTP-ARSIV, yol: "${ust}/", ne: "arşiv" ) {
    Kitaplık( kod: KTP-ESKI, yol: "${alt}/", ne: "eski kopya" )
  }
}
`);
  projeKur(kok, "labs/alfa", "PRJ-ALFA", "ADM-CANLI");
  projeKur(kok, arsivYolu, "PRJ-ALFA", "ADM-ARSIV");
  return kok;
}

test("① tek çözücü: klasör mührü dosya mührüyle aynı biçim ve aynı kapalı kümeden okunur", () => {
  assert.deepEqual(klasorMuhru("arsiv/@ARSIV@_eski/plan/is.sar"), { etiket: "ARSIV", tur: "arşiv", klasor: "arsiv/@ARSIV@_eski" });
  assert.deepEqual(klasorMuhru("a\\@SONRA@_bekleyen\\x.sar"), { etiket: "SONRA", tur: "sonra", klasor: "a/@SONRA@_bekleyen" });
  assert.equal(klasorMuhru("arsiv/@ARSIV@_eski.sar"), undefined, "dosya adının mührü klasör mührü sayılmaz");
  assert.equal(klasorMuhru("arsiv/eski/plan.sar"), undefined, "klasör ADINDAN tahmin yürütülmez");
  // Arşiv mührü eğitim mühründen ağır basar: okunmayan bir klasörün içi okunmaz.
  assert.equal(klasorMuhru("@EGITIM@_ders/@ARSIV@_eski/x.sar")?.tur, "arşiv");
  assert.equal(okunmazMuhurlu("arsiv/@ARSIV@_eski/plan/is.sar"), true);
  assert.equal(okunmazMuhurlu("ders/@EGITIM@_eski/plan/is.sar"), false, "eğitim mühürlü klasörün içi okunur");
  assert.ok(DERS_DUNYASI.test("ders/@EGITIM@_eski/plan/is.sar"), "eğitim mühürlü klasörün içi ders dünyası sayılmadı");
  assert.ok(!DERS_DUNYASI.test("ders/eski_@EGITIM@_/plan/is.sar"), "adın ortasındaki etiket mühür sayıldı");
  assert.deepEqual(klasorAdiKusuru("@FOO@_x"), { kusur: "bilinmeyen-etiket", etiket: "FOO" });
  assert.deepEqual(klasorAdiKusuru("@arsiv@_x"), { kusur: "bozuk-biçim" });
  assert.deepEqual(klasorAdiKusuru("eski_@ARSIV@_x"), { kusur: "bozuk-biçim" });
  assert.deepEqual(klasorAdiKusuru("@ARSIV@_Eski"), { kusur: "mühür-sonrası-büyük-harf", etiket: "ARSIV" });
  assert.equal(klasorAdiKusuru("@ARSIV@_eski"), undefined);
  assert.equal(klasorAdiKusuru("Belgeler"), undefined, "mühüre benzemeyen büyük harfli klasör adı kusur değildir");
});

test("② aynı Proje kodunu taşıyan arşiv klasörü çakışma üretmez ve sayılmaz; mühür kalkınca çakışma geri döner", () => {
  const kok = catiKur();
  try {
    const disk = diskTara(kok);
    assert.ok(disk.girdiler.some((g) => g.tur === "dizin" && g.yol === ARSIV), "mühürlü klasör kayda alınmadı");
    assert.ok(!disk.girdiler.some((g) => g.yol.startsWith(`${ARSIV}/`)), "motor mühürlü klasörün içine indi");
    assert.deepEqual(disk.muhurlular?.map((g) => [g.tur, g.yol]), [["dizin", ARSIV]]);
    assert.ok(![...programlariYukle(kok).programlar.keys()].some((y) => y.startsWith(`${ARSIV}/`)), "yükleyici arşiv klasörünü okudu");
    assert.ok(!dizindenIndeks(kok).tumTanimlar().some((t) => t.kod === "ADM-ARSIV"), "arşiv kodu kod dizinine girdi");

    const s = kos(kok);
    assert.deepEqual(s.adAlani.ayrisamayan, [], "arşiv kopyası canlı kökle çakıştı");
    const tanilar = tumTanilar(s);
    assert.ok(!tanilar.some((t) => t.dosya.startsWith(`${ARSIV}/`) || /ADM-ARSIV/.test(t.tani.mesaj)), "arşiv klasörünün içindeki tanı sayıldı");
    assert.ok(!s.acikAdimlar.some((a) => /ADM-ARSIV/.test(a.tani.mesaj)), "arşivdeki Adım gündeme girdi");
    assert.ok(tanilar.some((t) => /YOK-HEDEF-ADM-CANLI/.test(t.tani.mesaj)), "canlı projenin kırık atfı görünmeli");
    const liste = tanilar.filter((t) => t.tani.kod === "dosya-mührü" && t.tani.hedefDosya === `${ARSIV}/`);
    assert.equal(liste.length, 1, "arşiv klasörü denetim çıktısında listelenmedi");
    assert.equal(liste[0].dosya, "cati_anadizin.sar");
    assert.match(liste[0].tani.mesaj, /"arsiv\/@ARSIV@_eski\/" klasörü arşiv mührü/);
    assert.equal(liste[0].tani.duzey, "bilgi");

    // Mühür kaldırılır ve ilan aynı adla güncellenir: çakışma uyarısı geri dönmelidir.
    renameSync(join(kok, ARSIV), join(kok, "arsiv/eski"));
    const ilan = join(kok, "cati_anadizin.sar");
    writeFileSync(ilan, readFileSync(ilan, "utf8").replace("@ARSIV@_eski/", "eski/"), "utf8");
    const muhursuz = kos(kok);
    assert.deepEqual(muhursuz.adAlani.ayrisamayan.map((a) => a.kod), ["PRJ-ALFA"], "mühürsüz kopya çakışma uyarısını sürdürmeli");
    assert.ok(tumTanilar(muhursuz).some((t) => /YOK-HEDEF-ADM-ARSIV/.test(t.tani.mesaj)), "mühürsüz klasör okunmalı");
  } finally { rmSync(kok, { recursive: true, force: true }); }
});

test("③ eğitim mühürlü klasörün içeriği okunur ve doğrulanır, fakat karneye ve gündeme girmez", () => {
  const kok = catiKur("ders/@EGITIM@_eski");
  const temiz = catiKur("ders/@ARSIV@_eski");
  try {
    const { programlar } = programlariYukle(kok);
    assert.ok(programlar.has("ders/@EGITIM@_eski/plan/is.sar"), "eğitim mühürlü klasörün içi okunmadı");
    const s = kos(kok);
    const tanilar = tumTanilar(s);
    assert.ok(tanilar.some((t) => /YOK-HEDEF-ADM-ARSIV/.test(t.tani.mesaj)), "eğitim mühürlü klasörün içi doğrulanmadı");
    assert.ok(!s.acikAdimlar.some((a) => /ADM-ARSIV/.test(a.tani.mesaj)), "eğitim klasöründeki Adım gündeme girdi");
    const once = karneOzeti(dagKur(programlariYukle(temiz).programlar));
    const sonra = karneOzeti(dagKur(programlar));
    assert.equal(sonra.adim, once.adim, "eğitim mühürlü klasördeki Adım karneye girdi");
    const liste = tanilar.filter((t) => t.tani.kod === "dosya-mührü" && t.tani.hedefDosya === "ders/@EGITIM@_eski/");
    assert.equal(liste.length, 1, "eğitim mühürlü klasör listelenmedi");
    assert.match(liste[0].tani.mesaj, /klasörü eğitim mührü/);
  } finally {
    rmSync(kok, { recursive: true, force: true });
    rmSync(temiz, { recursive: true, force: true });
  }
});

test("④ ebedî kural taşıyan bir dosyayı içeren klasöre arşiv mührü basılırsa denetim hata verir", () => {
  const kok = catiKur();
  try {
    const kural = `Kural ebediDeneme( kod: KRL-EBEDI-DENEME, dayanaksız: "Sınama için yazılmış ebedî kural.", otorite: anayasa, ebedi: evet,\n  katman: niyet, kapsam: etmen ) {\n  ne: "Ebedî deneme kuralı."\n}\n`;
    const onceki = kos(kok).toplamHata;
    const imza = ebediEnvanter(new Map([["k.sar", ayristir(belirtecle(kural))]])).get("KRL-EBEDI-DENEME")!.imza;
    writeFileSync(join(kok, EBEDI_KILIT_ADI), JSON.stringify({ not: "sınama", muhurlenme: BUGUN, kurallar: { "KRL-EBEDI-DENEME": imza } }), "utf8");
    yaz(kok, `${ARSIV}/yasa/derin/kural.sar`, kural);
    const s = kos(kok);
    const ebedi = tumTanilar(s).filter((t) => t.tani.kod === "ebedi-ihlal");
    assert.equal(ebedi.length, 1, `tek olgu tek bildirim bekleniyordu: ${ebedi.map((t) => t.tani.mesaj).join(" | ")}`);
    assert.equal(ebedi[0].tani.duzey, "hata");
    assert.match(ebedi[0].tani.mesaj, /arşiv mühürlü "arsiv\/@ARSIV@_eski\/yasa\/derin\/kural\.sar"/);
    assert.equal(s.toplamHata, onceki + 1);
    assert.equal(s.cikis, 4, "hata varken denetim çıkış kodu dört olmalı");
  } finally { rmSync(kok, { recursive: true, force: true }); }
});

test("⑤ geçersiz klasör mührü sessiz geçmez ve klasör canlı kaynak olarak okunur", () => {
  const kok = catiKur("arsiv/@arsiv@_eski");
  try {
    const s = kos(kok);
    const gecersiz = tumTanilar(s).filter((t) => t.tani.kod === "geçersiz-dosya-adı" && t.tani.hedefDosya === "arsiv/@arsiv@_eski/");
    assert.equal(gecersiz.length, 1, "geçersiz klasör adı bildirilmedi");
    assert.equal(gecersiz[0].tani.duzey, "uyarı");
    assert.match(gecersiz[0].tani.mesaj, /klasör adı/);
    assert.ok(programlariYukle(kok).programlar.has("arsiv/@arsiv@_eski/plan/is.sar"), "geçersiz mühürlü klasör canlı kaynak olarak okunmalı");
    assert.deepEqual(s.adAlani.ayrisamayan.map((a) => a.kod), ["PRJ-ALFA"], "geçersiz mühür çakışmayı susturmamalı");
  } finally { rmSync(kok, { recursive: true, force: true }); }
});

test("⑥ kardeş kök çözümü mühürlü klasörün içindeki Proje kökünü görmez", () => {
  const kok = catiKur();
  try {
    // Arşivdeki kopya ayrı bir Proje koduna çevrilir ki ilk tanım kuralı sonucu gizlemesin.
    const giris = join(kok, ARSIV, "alfa_anadizin.sar");
    writeFileSync(giris, readFileSync(giris, "utf8").replace("PRJ-ALFA", "PRJ-ESKI"), "utf8");
    const kardesler = catiKardesleri(join(kok, "labs/alfa"));
    assert.ok(kardesler.some((k) => k.kod === "PRJ-ALFA"), "canlı kardeş çözülmeli");
    assert.ok(!kardesler.some((k) => k.kod === "PRJ-ESKI"), "mühürlü klasördeki Proje kökü kardeş sayıldı");
  } finally { rmSync(kok, { recursive: true, force: true }); }
});

test("⑦ öğretim yüzlerinin ortak üreticisi klasör mührünü iki dilde öğretir (OGR-3)", () => {
  const tr = dosyaMuhruOgretisi("tr").join("\n");
  const en = dosyaMuhruOgretisi("en").join("\n");
  assert.match(tr, /KLASÖRÜN adının başına/);
  assert.match(tr, /`arsiv\/@ARSIV@_eski\/`/);
  assert.match(en, /FOLDER name/);
});

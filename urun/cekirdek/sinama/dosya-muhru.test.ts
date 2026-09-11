// ═══════════════════════════════════════════════════════════════════════════
// dosya-muhru.test.ts — 📛 MIM-3.4 · DOSYA MÜHÜRLERİ NÖBETİ (KPS-MHR-A01)
//
//   Founder 2026-09-11 tarihinde işi bitmiş arşivin, eğitim malzemesinin ve
//   sonraya bırakılmış işin canlı kaynaktan dosya ADINA yazılan açık bir mühürle
//   ayrılmasına hükmetmiştir: `@ETİKET@_ad.sar`. Bu süit hükmün her davranışını
//   AYRI bir sınamayla ve gerçek bir doğuş ağacında ölçer; ağaç sınama başına
//   geçici bir dizinde doğar ve canlı depoya dokunulmaz.
//
//   Ölçülen davranışlar ve her birinin mutasyon kanıtı (2026-09-11 koşusu; her
//   mutasyon yedekten bayt özdeş geri alındı):
//     ① tek çözücü: kapalı küme, biçim ve büyük harf kuralı
//        — `dosyaAdiKusuru` büyük harf dalı söküldüğünde ① ile ⑥ düştü.
//     ② arşiv ile sonra mühürlü dosya OKUNMAZ (yükleyici, graf, kod dizini,
//        gündem, disk mutabakatı) — `diskTara` ayırması söküldüğünde ②, ③ ve ⑤
//        düştü, çünkü mühürlü dosyalar olağan listeye dönüp okunmaya başladı.
//     ③ eğitim mühürlü dosya OKUNUR ve doğrulanır, karneye girmez — ders
//        dünyası desenindeki eğitim dalı söküldüğünde yalnız ③ düştü.
//     ④ listeleme: her mühürlü dosya türüyle ve adıyla görünür — bekçi boş
//        döndürüldüğünde ④ ile ⑥ düştü.
//     ⑤ ebedî engel: ebedî kural taşıyan dosya arşiv mührü alamaz — arşiv
//        envanteri `ebediTanilar`a verilmediğinde yalnız ⑤ düştü.
//     ⑥ geçersiz ad sessiz geçmez — ① ve ④ mutasyonlarıyla birlikte düştü.
//     ⑦ mühürlü giriş dosyası canlı giriş sayılmaz — `anadizinBul` süzgeci
//        söküldüğünde yalnız ⑦ düştü.
//     ⑧ bekleme süresinin kaynağı: git varsa işlemenin günü, yoksa durum tarihi
//        — git dalı söküldüğünde yalnız ⑧ düştü.
// ═══════════════════════════════════════════════════════════════════════════
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { dogusYaz } from "../src/dogus.ts";
import { denetimKos } from "../src/denetim.ts";
import { diskTara, programlariYukle, anadizinBul, muhurTarihiCoz } from "../src/denetci.ts";
import { dosyaMuhru, okunmazMuhurlu, dosyaAdiKusuru, DERS_DUNYASI, dizindenIndeks, DOSYA_MUHRU_KUMESI } from "../src/kimlik.ts";
import { dagKur, karneOzeti } from "../src/dag.ts";
import { ebediEnvanter, EBEDI_KILIT_ADI } from "../src/kuralci.ts";
import { belirtecle } from "../src/belirtec.ts";
import { ayristir } from "../src/ayristirici.ts";

const SNF_YOL = fileURLToPath(new URL("../../../oz/siniflama/kayit.json", import.meta.url));
const BUGUN = "2026-09-11";

/** Doğuş paketiyle geçici bir proje doğurur; sınama bittiğinde silinir. */
function proje(): string {
  const kok = mkdtempSync(join(tmpdir(), "sarmal-muhur-"));
  dogusYaz(kok, "deneme", BUGUN, "proje");
  return kok;
}
function yaz(kok: string, yol: string, metin: string): void {
  mkdirSync(dirname(join(kok, yol)), { recursive: true });
  writeFileSync(join(kok, yol), metin, "utf8");
}
/** Kırık bir atıf taşıyan Adım: okunursa denetim ona mutlaka bir tanı bağlar. */
const KIRIK_ADIM = (kod: string): string =>
  `Adım( kod: ${kod}, durum: beklemede, ne: "Mühür sınaması için yazılmış bir Adım.", referans: [ YOK-HEDEF-${kod} ] )\n`;

const ARSIV = "is/plan/@ARSIV@_eski_plan.sar";
const SONRA = "is/plan/@SONRA@_bekleyen_plan.sar";
const EGITIM = "is/plan/@EGITIM@_ders_plan.sar";

function mühürlüAgac(): string {
  const kok = proje();
  yaz(kok, ARSIV, KIRIK_ADIM("ARS-ESKI-A01"));
  yaz(kok, SONRA, KIRIK_ADIM("SNR-BEKLEYEN-A01"));
  yaz(kok, EGITIM, KIRIK_ADIM("EGT-DERS-A01"));
  return kok;
}
const kos = (kok: string) => denetimKos(kok, { snfYol: SNF_YOL, bugun: BUGUN, tamListe: true });
const tumTanilar = (s: ReturnType<typeof kos>) => s.akis.flatMap((r) => r.tanilar.map((t) => ({ dosya: r.dosya, tani: t })));

test("① tek çözücü: kapalı küme, biçim ve büyük harf kuralı", () => {
  assert.deepEqual([...DOSYA_MUHRU_KUMESI.keys()], ["ARSIV", "EGITIM", "SONRA"]);
  assert.deepEqual(dosyaMuhru("arsiv/@ARSIV@_gstack_inceleme.sar"), { etiket: "ARSIV", tur: "arşiv" });
  assert.deepEqual(dosyaMuhru("deney\\fikstur\\@EGITIM@_eski.sar"), { etiket: "EGITIM", tur: "eğitim" });
  assert.equal(okunmazMuhurlu("@SONRA@_x.sar"), true);
  assert.equal(okunmazMuhurlu("@EGITIM@_x.sar"), false, "eğitim mühürlü dosya okunur");
  // Kanonun "Yanlış" örnekleri mühür sayılmaz ve sessiz de geçmez.
  for (const ad of ["@arsiv@_x.sar", "[ARSIV]x.sar", "#ARSIV#x.sar", "Rapor.sar", "@FOO@_x.sar", "@ARSIV@_Rapor.sar"]) {
    assert.equal(okunmazMuhurlu(ad), ad === "@ARSIV@_Rapor.sar", `${ad} okunma hükmü yanlış`);
    assert.ok(dosyaAdiKusuru(ad), `${ad} biçim kusuru sessiz geçti`);
  }
  assert.deepEqual(dosyaAdiKusuru("@FOO@_x.sar"), { kusur: "bilinmeyen-etiket", etiket: "FOO" });
  assert.deepEqual(dosyaAdiKusuru("@arsiv@_x.sar"), { kusur: "bozuk-biçim" });
  assert.deepEqual(dosyaAdiKusuru("Rapor.sar"), { kusur: "büyük-harf" });
  assert.deepEqual(dosyaAdiKusuru("is/plan/Çizelge.sar"), { kusur: "büyük-harf" }, "Türkçe büyük harf de büyük harftir");
  assert.equal(dosyaAdiKusuru("@ARSIV@_gstack_inceleme.sar"), undefined);
  assert.equal(dosyaAdiKusuru("durum_devir.sar"), undefined);
});

test("② arşiv ile sonra mühürlü dosya okunmaz: yükleyici, graf, kod dizini, gündem ve disk mutabakatı dışında", () => {
  const kok = mühürlüAgac();
  try {
    const disk = diskTara(kok);
    assert.ok(!disk.girdiler.some((g) => g.yol === ARSIV || g.yol === SONRA), "mühürlü dosya olağan disk listesine girdi");
    assert.deepEqual(disk.muhurlular?.map((g) => g.yol).sort(), [ARSIV, SONRA].sort());
    const { programlar } = programlariYukle(kok);
    assert.ok(!programlar.has(ARSIV) && !programlar.has(SONRA), "yükleyici mühürlü dosyayı okudu");
    const dag = dagKur(programlar);
    assert.ok(!dag.dugumler.has("ARS-ESKI-A01") && !dag.dugumler.has("SNR-BEKLEYEN-A01"), "mühürlü düğüm grafa girdi");
    const indeks = dizindenIndeks(kok).tumTanimlar().map((t) => t.kod);
    assert.ok(!indeks.includes("ARS-ESKI-A01") && !indeks.includes("SNR-BEKLEYEN-A01"), "mühürlü kod dizine girdi");
    const s = kos(kok);
    const tanilar = tumTanilar(s);
    assert.ok(!tanilar.some((t) => t.dosya === ARSIV || t.dosya === SONRA), "okunmayan dosyaya tanı bağlandı");
    assert.ok(!tanilar.some((t) => /YOK-HEDEF-(ARS|SNR)/.test(t.tani.mesaj)), "okunmayan dosyanın kırık atfı sayıldı");
    assert.ok(!tanilar.some((t) => ["bildirilmemiş-dosya", "ilansız-gövde"].includes(t.tani.kod) && /@(ARSIV|SONRA)@_/.test(t.tani.mesaj)),
      "disk mutabakatı mühürlü dosyayı gördü");
    assert.ok(!s.acikAdimlar.some((a) => /ARS-ESKI|SNR-BEKLEYEN/.test(a.tani.mesaj)), "mühürlü Adım gündeme girdi");
  } finally { rmSync(kok, { recursive: true, force: true }); }
});

test("③ eğitim mühürlü dosya okunur ve doğrulanır, fakat karneye ve gündeme girmez", () => {
  const kok = mühürlüAgac();
  try {
    assert.ok(DERS_DUNYASI.test(EGITIM), "eğitim mühürlü dosya ders dünyası sayılmadı");
    const { programlar } = programlariYukle(kok);
    assert.ok(programlar.has(EGITIM), "eğitim mühürlü dosya okunmadı");
    const tanilar = tumTanilar(kos(kok));
    assert.ok(tanilar.some((t) => t.dosya === EGITIM && /YOK-HEDEF-EGT/.test(t.tani.mesaj)), "eğitim mühürlü dosya doğrulanmadı");
    // Karne: mühürlü üç dosyanın Adımı eklenmeden önceki ağaçla aynı sayıyı verir.
    const temiz = proje();
    try {
      const once = karneOzeti(dagKur(programlariYukle(temiz).programlar));
      const sonra = karneOzeti(dagKur(programlar));
      assert.equal(sonra.adim, once.adim, "eğitim mühürlü Adım karneye girdi");
      assert.equal(sonra.dugum, once.dugum + 1, "graf yalnız eğitim düğümü kadar büyümeliydi");
    } finally { rmSync(temiz, { recursive: true, force: true }); }
    assert.ok(!kos(kok).acikAdimlar.some((a) => /EGT-DERS/.test(a.tani.mesaj)), "eğitim Adımı gündeme girdi");
  } finally { rmSync(kok, { recursive: true, force: true }); }
});

test("④ listeleme: her mühürlü dosya denetim akışında türüyle ve adıyla görünür", () => {
  const kok = mühürlüAgac();
  try {
    const s = kos(kok);
    const tanilar = tumTanilar(s);
    const giris = anadizinBul(kok)!.slice(kok.length + 1);
    const muhur = tanilar.filter((t) => t.tani.kod === "dosya-mührü");
    assert.equal(muhur.length, 2);
    assert.ok(muhur.some((t) => t.tani.mesaj.includes(ARSIV) && /arşiv mührü/.test(t.tani.mesaj)));
    assert.ok(muhur.some((t) => t.tani.mesaj.includes(EGITIM) && /eğitim mührü/.test(t.tani.mesaj)));
    const sonra = tanilar.filter((t) => t.tani.kod === "sonraya-bırakılmış-dosya");
    assert.equal(sonra.length, 1);
    assert.ok(sonra[0].tani.mesaj.includes(SONRA) && /gündür bekliyor/.test(sonra[0].tani.mesaj));
    assert.ok([...muhur, ...sonra].every((t) => t.dosya === giris && t.tani.duzey === "bilgi"),
      "mühür bulgusu giriş dosyasına bilgi düzeyinde yazılmalı");
    assert.equal(s.turDokumu.find((d) => d.kod === "dosya-mührü")?.toplam, 2);
    assert.equal(s.turDokumu.find((d) => d.kod === "sonraya-bırakılmış-dosya")?.toplam, 1);
  } finally { rmSync(kok, { recursive: true, force: true }); }
});

test("⑤ ebedî kural taşıyan dosya arşiv mührü alamaz: ebedi-ihlal HATA doğar ve tek bildirimle söylenir", () => {
  const kok = proje();
  try {
    const kural = `Kural ebediDeneme( kod: KRL-EBEDI-DENEME, dayanaksız: "Sınama için yazılmış ebedî kural.", otorite: anayasa, ebedi: evet,\n  katman: niyet, kapsam: etmen ) {\n  ne: "Ebedî deneme kuralı."\n}\n`;
    yaz(kok, "is/plan/kural.sar", kural);
    const onceki = kos(kok).toplamHata;
    // Kural mühürlenir; mühürlü kural arşive gidince yalnız arşiv engeli konuşmalıdır.
    const imza = ebediEnvanter(new Map([["is/plan/kural.sar", ayristir(belirtecle(kural))]])).get("KRL-EBEDI-DENEME")!.imza;
    writeFileSync(join(kok, EBEDI_KILIT_ADI), JSON.stringify({ not: "sınama", muhurlenme: BUGUN, kurallar: { "KRL-EBEDI-DENEME": imza } }), "utf8");
    rmSync(join(kok, "is/plan/kural.sar"));
    yaz(kok, "is/plan/@ARSIV@_kural.sar", kural);
    const s = kos(kok);
    const ebedi = tumTanilar(s).filter((t) => t.tani.kod === "ebedi-ihlal");
    assert.equal(ebedi.length, 1, `tek olgu tek bildirim bekleniyordu: ${ebedi.map((t) => t.tani.mesaj).join(" | ")}`);
    assert.equal(ebedi[0].tani.duzey, "hata");
    assert.match(ebedi[0].tani.mesaj, /arşiv mühürlü "is\/plan\/@ARSIV@_kural\.sar"/);
    assert.equal(s.toplamHata, onceki + 1);
    assert.equal(s.cikis, 4, "hata varken denetim çıkış kodu dört olmalı");
  } finally { rmSync(kok, { recursive: true, force: true }); }
});

test("⑥ geçersiz ad sessiz geçmez: büyük harfli mühürsüz ad ve bilinmeyen etiket uyarı üretir ve dosya okunur", () => {
  const kok = proje();
  try {
    yaz(kok, "is/plan/Rapor.sar", "// büyük harfli mühürsüz ad\n");
    yaz(kok, "is/plan/@FOO@_x.sar", "// kümede olmayan etiket\n");
    const s = kos(kok);
    const gecersiz = tumTanilar(s).filter((t) => t.tani.kod === "geçersiz-dosya-adı");
    assert.equal(gecersiz.length, 2);
    assert.ok(gecersiz.every((t) => t.tani.duzey === "uyarı"));
    assert.ok(programlariYukle(kok).programlar.has("is/plan/@FOO@_x.sar"), "geçersiz etiketli dosya canlı kaynak olarak okunmalı");
  } finally { rmSync(kok, { recursive: true, force: true }); }
});

test("⑦ mühürlü giriş dosyası canlı giriş sayılmaz", () => {
  const kok = mkdtempSync(join(tmpdir(), "sarmal-muhur-giris-"));
  try {
    yaz(kok, "@ARSIV@_eski_anadizin.sar", "// arşivlenmiş eski giriş\n");
    assert.equal(anadizinBul(kok), undefined);
    yaz(kok, "yeni_anadizin.sar", "// canlı giriş\n");
    assert.equal(anadizinBul(kok), join(kok, "yeni_anadizin.sar"));
  } finally { rmSync(kok, { recursive: true, force: true }); }
});

test("⑧ bekleme süresinin kaynağı: git varsa mührün işlendiği gün, yoksa dosyanın durum tarihi", () => {
  const kok = mkdtempSync(join(tmpdir(), "sarmal-muhur-git-"));
  try {
    yaz(kok, SONRA, "// sonraya bırakılmış iş\n");
    const dosya = muhurTarihiCoz(kok, SONRA);
    assert.equal(dosya?.kaynak, "dosya", "depo yokken durum tarihine düşülmeli");
    let gitVar = true;
    try { execFileSync("git", ["--version"], { stdio: "ignore" }); } catch { gitVar = false; }
    if (!gitVar) return;
    const git = (...a: string[]): void => { execFileSync("git", ["-C", kok, ...a], { stdio: "ignore", env: { ...process.env, GIT_AUTHOR_DATE: "2026-08-15T10:00:00", GIT_COMMITTER_DATE: "2026-08-15T10:00:00" } }); };
    git("init", "-q");
    git("config", "user.email", "s@s");
    git("config", "user.name", "s");
    writeFileSync(join(kok, ".gitignore"), "!*.sar\n", "utf8");   // küresel yok sayma kuralı `*.sar` desenini taşıyabilir
    git("add", "-f", ".gitignore", SONRA);
    git("commit", "-qm", "mühür");
    assert.deepEqual(muhurTarihiCoz(kok, SONRA), { tarih: "2026-08-15", kaynak: "git" });
    assert.ok(readFileSync(join(kok, SONRA), "utf8").length > 0);
  } finally { rmSync(kok, { recursive: true, force: true }); }
});

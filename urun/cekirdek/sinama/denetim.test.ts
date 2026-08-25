// ═══════════════════════════════════════════════════════════════════════════
// denetim.test.ts — 🧩 SAF DENETİM ÇEKİRDEĞİ NÖBETLERİ (SEF-L3-A37)
//
//   Kabul ölçütü ①: denetimKos konsol ve süreç yan-etkisi olmadan denetim
//   sonucunu VERİ olarak döndürür — programatik fikstürle sınanır. Çekirdek,
//   CLI kabuğunun (sarmal.ts denetleKomutu) ve gelecekte ŞEF döngüsünün
//   ortak kapısıdır; davranış sözleşmesi akış sırası + sayaç + çıkış kodudur.
// ═══════════════════════════════════════════════════════════════════════════
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { denetimKos } from "../src/denetim.ts";

const SNF_YOL = fileURLToPath(new URL("../../../oz/siniflama/kayit.json", import.meta.url));
const gecici = (): string => mkdtempSync(join(tmpdir(), "sarmal-dnt-"));

test("denetimKos: giriş dosyası yoksa erken sonuç — çıkış 4, akışta ana-yok, konsol yan-etkisi yok", () => {
  const kok = gecici();
  try {
    const eskiLog = console.log;
    let yazildi = 0;
    console.log = () => { yazildi++; };
    const s = denetimKos(kok, { snfYol: SNF_YOL });
    console.log = eskiLog;
    assert.equal(yazildi, 0, "çekirdek konsola YAZMAZ — sunum kabuğun işidir");
    assert.equal(s.cikis, 4);
    assert.equal(s.tamKosum, false, "erken çıkış: özet bölgesi kurulmaz");
    assert.equal(s.akis.length, 1);
    assert.equal(s.akis[0].tanilar[0].kod, "kural-ihlali");   // anaYokTanisi'nın kanonik kodu
    assert.match(s.akis[0].tanilar[0].mesaj, /[Gg]iriş dosyası|anadizin/u, "tanı giriş-dosyası yokluğunu anlatır");
  } finally { rmSync(kok, { recursive: true, force: true }); }
});

test("denetimKos: temiz mini proje — tam koşum, veri alanları dolu, açık Adım motor-susmaz listesinde", () => {
  const kok = gecici();
  try {
    writeFileSync(join(kok, "t_anadizin.sar"),
      'Proje( kod: PRJ-DNT, ad: "dnt", ne: "çekirdek fikstürü", rejim: esnek ) {\n  Raf( kod: RAF-PLN, yol: "plan/", ne: "plan rafı" )\n}\n');
    mkdirSync(join(kok, "plan"));
    writeFileSync(join(kok, "plan", "is.sar"), `Faz( kod: FZ-T, ad: "mevsim", ne: "dönem" ) {
  Blok( kod: BLK-T, ad: "gövde", ne: "iş" ) {
    Katman( kod: KAT-T, ad: "dal", ne: "teknoloji" ) {
      Adım( kod: ADM-T1, durum: beklemede, ne: "bekleyen iş" )
    }
  }
}\n`);
    const s = denetimKos(kok, { snfYol: SNF_YOL, bugun: "2026-07-20" });
    assert.equal(s.tamKosum, true);
    assert.ok(s.karne, "karne verisi tam koşumda dolu");
    assert.equal(s.toplamHata, 0, `beklenmeyen hata: ${JSON.stringify(s.akis.flatMap(r => r.tanilar.filter(t => t.duzey === "hata")))}`);
    assert.equal(s.cikis, 0);
    assert.equal(s.acikAdimlar.length, 1, "ADM-T1 motor-susmaz listesinde");
    assert.ok(s.akis.every((r) => Array.isArray(r.tanilar) && r.tanilar.length > 0), "akış birimleri boş olamaz");
  } finally { rmSync(kok, { recursive: true, force: true }); }
});

// ── MIM-1.4 üretim yolu nöbeti (V1B-KANON-A01 · Founder yön hükmü 2026-08-11) ──
//   Kanonu harfiyen izleyen bir Katman (kullanır: TEK-X, bağımlı yok) üretim
//   denetim yolundan katmansız-teknoloji uyarısı ALMAMALIDIR. Nöbet bilinçli
//   olarak denetimKos üzerinden koşar: CLI `denetle` ile MCP proje denetimi bu
//   çekirdeği paylaşır, dolayısıyla ölçülen şey birim işlev değil üretim yoludur.
//   Karşıt senaryo aynı fikstürde ölçülür ki nöbet "hep susan" bir sahte yeşile
//   dönüşemesin: bağsız Katman aynı yoldan uyarıyı almaya devam eder.
test("denetimKos: MIM-1.4 kanonik yazım — kullanır: TEK-X taşıyan Katman katmansız-teknoloji uyarısı almaz, bağsız Katman alır", () => {
  const kur = (katmanEk: string): { uyarilar: string[]; toplamUyari: number } => {
    const kok = gecici();
    try {
      writeFileSync(join(kok, "t_anadizin.sar"), `-->|
## Amaç
MIM-1.4 üretim yolu fikstürü kanonik Katman yazımını üretim denetiminde kanıtlar.
## Kapsam
Bir teknoloji ilanı ve tek Katmanlı bir plan; başka hiçbir yüzey kurulmaz.
## Sonuç
Kanonik yazımda denetim sıfır uyarı verir; bağsız yazımda bekçi konuşur.
|<--
Proje( kod: PRJ-KTEK, ad: "ktek", ne: "MIM-1.4 üretim yolu fikstürü", rejim: esnek ) {
  Teknoloji( kod: TEK-KTEK, ne: "fikstür teknolojisi" )
  Raf( kod: RAF-PLN, yol: "plan/", ne: "plan rafı" )
}
`);
      mkdirSync(join(kok, "plan"));
      writeFileSync(join(kok, "plan", "is.sar"), `Faz( kod: FZ-KTEK, ad: "mevsim", ne: "dönem" ) {
  -->|
  ## Amaç
  Kanonik Katman yazımının bekçiyi susturduğunu tek gövdede göstermek.
  ## Kapsam
  Tek Katman ve tek bekleyen Adım; kod üretimi kapsam dışıdır.
  ## Sonuç
  Denetim koşusu katmansız-teknoloji tanısı basmadan tamamlanır.
  |<--
  Blok( kod: BLK-KTEK, ad: "gövde", ne: "iş" ) {
    Katman( kod: KAT-KTEK, ad: "dal", ne: "teknoloji dilimi"${katmanEk} ) {
      Adım( kod: ADM-KTEK, durum: beklemede, ne: "bekleyen iş" )
    }
  }
}
`);
      const s = denetimKos(kok, { snfYol: SNF_YOL, bugun: "2026-08-11" });
      assert.equal(s.tamKosum, true, "fikstür tam koşuma ulaşmalı");
      return {
        uyarilar: s.akis.flatMap((r) => r.tanilar.filter((t) => t.kod === "katmansız-teknoloji").map((t) => `${r.dosya}:${t.kod}`)),
        toplamUyari: s.toplamUyari,
      };
    } finally { rmSync(kok, { recursive: true, force: true }); }
  };
  // ① Kanonik yazım: kullanır tek Teknoloji hedefi → bekçi susar, fikstürde hiç uyarı kalmaz.
  const kanonik = kur(", kullanır: TEK-KTEK");
  assert.deepEqual(kanonik.uyarilar, [], "kanonu harfiyen izleyen Katman uyarı almamalı");
  assert.equal(kanonik.toplamUyari, 0, "kanonik fikstür sıfır uyarıyla geçmeli");
  // ② Karşıt senaryo: bağsız Katman aynı üretim yolundan uyarıyı almaya devam eder.
  const bagsiz = kur("");
  assert.equal(bagsiz.uyarilar.length, 1, "bağsız Katman üretim yolunda uyarı almalı — nöbet sahte yeşile dönmesin");
});

test("denetimKos: aynı dizinde iki çağrı aynı sonucu verir (saf — gizli durum yok)", () => {
  const kok = gecici();
  try {
    writeFileSync(join(kok, "t_anadizin.sar"), 'Proje( kod: PRJ-DNT2, ad: "dnt2", ne: "determinizm fikstürü" )\n');
    const a = denetimKos(kok, { snfYol: SNF_YOL, bugun: "2026-07-20" });
    const b = denetimKos(kok, { snfYol: SNF_YOL, bugun: "2026-07-20" });
    assert.equal(a.cikis, b.cikis);
    assert.equal(a.toplamHata, b.toplamHata);
    assert.equal(a.toplamUyari, b.toplamUyari);
    assert.deepEqual(
      a.akis.map((r) => [r.dosya, r.tanilar.map((t) => t.kod)]),
      b.akis.map((r) => [r.dosya, r.tanilar.map((t) => t.kod)]),
      "akış sırası ve tanı kodları deterministik",
    );
  } finally { rmSync(kok, { recursive: true, force: true }); }
});

// ═══════════════════════════════════════════════════════════════════════════
// GİRİŞ DOSYASI TANISININ DÜRÜSTLÜĞÜ — yol türü ÖLÇÜLEREK konuşulur
//
//   Kusur şuydu: proje denetimine bir DOSYA verildiğinde motor "'<yol>' içinde
//   giriş dosyası yok" diyordu. Bu cümle verilen yolun bir kap olduğunu
//   varsayar, oysa o varsayım hiç sınanmıyordu; kullanıcı doğru adlandırılmış
//   bir giriş dosyasını doğrudan verdiğinde bile yanlış yaptığını sanıyordu.
//   Nöbet iki yönü birden bağlar: tek dosya verildiğinde yanıltıcı cümle
//   BASILMAZ ve doğru ipucu verilir; gerçekten girişsiz bir DİZİN verildiğinde
//   klasik tanı olduğu gibi korunur.
// ═══════════════════════════════════════════════════════════════════════════

/** Erken çıkışta akışa düşen tek tanıyı, kimliğiyle birlikte döndürür. */
function erkenTani(kok: string): { kod: string; mesaj: string; oneri: string } {
  const s = denetimKos(kok, { snfYol: SNF_YOL, bugun: "2026-07-20" });
  assert.equal(s.cikis, 4, "giriş çözülemediğinde çıkış kodu 4 kalır");
  assert.equal(s.akis.length, 1, "erken çıkış tek rapor birimi üretir");
  const t = s.akis[0].tanilar[0];
  return { kod: t.kod, mesaj: t.mesaj, oneri: t.oneri ?? "" };
}

/**
 * Yanıltıcı cümlenin imzası: verilen yolun bir KAP olduğunu söyleyen her ifade.
 * Bu iddia yalnız yol gerçekten bir dizin olarak ölçüldüğünde meşrudur; iki
 * yazım da (`içinde` ile `dizininde`) aynı varsayımı kurar ve ikisi de tek
 * dosya ya da var olmayan yol için yasaktır.
 */
const YANILTICI = /(?:içinde|dizininde) giriş dosyası yok/u;

test("giriş tanısı: doğru adlandırılmış tek dosya verildiğinde yanıltıcı 'içinde giriş dosyası yok' basılmaz", () => {
  const kok = gecici();
  try {
    const dosya = join(kok, "ilk_proje_anadizin.sar");
    writeFileSync(dosya, 'Proje( kod: PRJ-GRS, ad: "giris", ne: "giriş deseninde tek dosya fikstürü" )\n');
    const t = erkenTani(dosya);
    assert.equal(t.kod, "kural-ihlali", "tanı kimliği korunur — yeni kimlik doğmaz");
    assert.doesNotMatch(t.mesaj, YANILTICI, `dosya yoluna kap iddiası basıldı: ${t.mesaj}`);
    assert.match(t.mesaj, /bir dosyadır, dizin değildir/u, `tanı yolun türünü söylemeli: ${t.mesaj}`);
    assert.match(t.oneri, /denetle <dizin>/u, `öneri dizin vermeyi göstermeli: ${t.oneri}`);
    assert.match(t.oneri, /tek-dosya/u, `öneri tek-dosya kipini de göstermeli: ${t.oneri}`);
  } finally { rmSync(kok, { recursive: true, force: true }); }
});

test("giriş tanısı: kapsam giriş desenini AŞAR — giriş deseninde olmayan tek dosya da yanıltılmaz", () => {
  const kok = gecici();
  try {
    const dosya = join(kok, "hatirlaticilar.sar");
    writeFileSync(dosya, 'Proje( kod: PRJ-SRB, ad: "serbest", ne: "giriş deseninde OLMAYAN tek dosya fikstürü" )\n');
    const t = erkenTani(dosya);
    assert.doesNotMatch(t.mesaj, YANILTICI, `kusur yalnız giriş deseninde değil, HER tek dosyada doğuyordu: ${t.mesaj}`);
    assert.match(t.mesaj, /bir dosyadır, dizin değildir/u, t.mesaj);
  } finally { rmSync(kok, { recursive: true, force: true }); }
});

test("giriş tanısı: gerçekten giriş dosyası eksik DİZİN klasik tanıyı almaya devam eder (regresyon)", () => {
  const kok = gecici();
  try {
    mkdirSync(join(kok, "plan"));
    writeFileSync(join(kok, "plan", "is.sar"), 'Faz( kod: FZ-GRS, ad: "mevsim", ne: "girişsiz dizin fikstürü" )\n');
    const t = erkenTani(kok);
    assert.equal(t.kod, "kural-ihlali");
    assert.match(t.mesaj, /giriş dosyası yok/u, `girişsiz dizinde hüküm korunmalı: ${t.mesaj}`);
    assert.match(t.mesaj, /_anadizin\.sar/u, `tanı beklenen adı öğretmeye devam etmeli: ${t.mesaj}`);
    assert.match(t.oneri, /Önce giriş dosyanı yaz/u, `öneri hâlâ yol gösterici: ${t.oneri}`);
  } finally { rmSync(kok, { recursive: true, force: true }); }
});

test("giriş tanısı: diskte hiç bulunmayan yol, var olmayan bir kabın içini iddia etmez", () => {
  const kok = gecici();
  try {
    const t = erkenTani(join(kok, "hic-yok"));
    assert.doesNotMatch(t.mesaj, YANILTICI, `var olmayan yol için kap iddiası basıldı: ${t.mesaj}`);
    assert.match(t.mesaj, /diskte bulunamadı/u, t.mesaj);
  } finally { rmSync(kok, { recursive: true, force: true }); }
});

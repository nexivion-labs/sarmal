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
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { denetimKos } from "../src/denetim.ts";
import { DUZEN } from "./dogus-agaci.ts";
import { belirtecle, SozDizimHatasi } from "../src/belirtec.ts";
import { ayristir } from "../src/ayristirici.ts";

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
    // MIM-3.2 (KPS-CEL-A01): Raf, Kitaplığın İÇİNDE yaşar; fikstür kademeyi taşır.
    writeFileSync(join(kok, "t_anadizin.sar"),
      'Proje( kod: PRJ-DNT, ad: "dnt", ne: "çekirdek fikstürü", rejim: esnek ) {\n  Kitaplık( kod: KTP-IS, yol: "is/", ne: "işin kitaplığı" ) {\n    Raf( kod: RAF-PLN, yol: "plan/", ne: "plan rafı" )\n  }\n}\n');
    mkdirSync(join(kok, "is", "plan"), { recursive: true });
    writeFileSync(join(kok, "is", "plan", "is.sar"), `Faz( kod: FZ-T, ad: "mevsim", ne: "dönem" ) {
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
  // MIM-3.2 (KPS-CEL-A01 · Founder hükmü 2026-09-09): Kitaplık kademesi zorunludur
  // ve Raflar Kitaplıkların İÇİNDE yaşar; fikstür bu yüzden kademeyi taşır.
  Kitaplık( kod: KTP-IS, yol: "is/", ne: "işin kitaplığı" ) {
    Raf( kod: RAF-PLN, yol: "plan/", ne: "plan rafı" )
  }
}
`);
      mkdirSync(join(kok, "is", "plan"), { recursive: true });
      writeFileSync(join(kok, "is", "plan", "is.sar"), `Faz( kod: FZ-KTEK, ad: "mevsim", ne: "dönem" ) {
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
    // Doğuşun yazdığı Faz dosyası yerinde, giriş ilanı kaybolmuş bir ağaç (HST-MTR-A07).
    const faz = join(kok, DUZEN.ilkFaz);
    mkdirSync(dirname(faz), { recursive: true });
    writeFileSync(faz, 'Faz( kod: FZ-GRS, ad: "mevsim", ne: "girişsiz dizin fikstürü" )\n');
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

// ── MGZ-A03 · Ham sözdizimi hatası tanı kimliği kazanır ─────────────────────
//   Erken çıkışın sözleşmesi aynen korunur (çıkış 2, boş akış, ilk hata kapıyı
//   kapatır); değişen tek şey hatanın artık `söz-dizim` kimlikli, iki dilli bir
//   tanı taşımasıdır. Komut satırı ve eklenti kimliği bu tanıdan okur.

test("MGZ-A03: ayrıştırılamayan dosya denetimi eskisi gibi durdurur ve hatası söz-dizim kimlikli tanı taşır", () => {
  const kok = gecici();
  try {
    writeFileSync(join(kok, "deneme_anadizin.sar"), 'ÇalışmaAlanı( kod: DNM, ad: "deneme" )\n');
    const kaynak = 'Faz( kod: F1, ad: "sağlam" )\nFaz( kod: F2 ad: "kırık" )\n';
    writeFileSync(join(kok, "kirik.sar"), kaynak);
    let beklenen: SozDizimHatasi | undefined;
    try { ayristir(belirtecle(kaynak)); } catch (e) { if (e instanceof SozDizimHatasi) beklenen = e; }
    assert.ok(beklenen, "fikstür ayrıştırılabiliyor — kusur yeniden üretilemez");

    const s = denetimKos(kok, { snfYol: SNF_YOL });
    assert.equal(s.cikis, 2, "erken çıkışın çıkış kodu değişti");
    assert.equal(s.akis.length, 0, "erken çıkışın akış sözleşmesi değişti");
    assert.equal(s.tamKosum, false);
    assert.ok(s.sozdizimHata, "sözdizimi hatası sonuçta yok");
    assert.equal(s.sozdizimHata.etiket, "kirik.sar");
    const t = s.sozdizimHata.tani;
    assert.ok(t, "sözdizimi hatası tanı kimliği taşımıyor — ham hata olarak kaldı");
    assert.equal(t.kod, "söz-dizim");
    assert.equal(t.duzey, "hata");
    assert.equal(t.satir, beklenen.satir);
    assert.equal(t.sutun, beklenen.sutun);
    assert.equal(t.mesaj, beklenen.message);
    assert.equal(t.dilMetinleri?.tr?.mesaj, beklenen.message, "Türkçe yüz ayrıştırıcının cümlesi değil");
    assert.equal(t.dilMetinleri?.en?.mesaj, beklenen.ingilizceMesaj, "İngilizce yüz ayrıştırıcının cümlesi değil");
  } finally { rmSync(kok, { recursive: true, force: true }); }
});

// ── MGZ-A12 · KIRIK DOSYA TURU DURDURMAZ (HTR-KIRIK-DOSYA-TAM-DENETIMI-SUSTURUYOR) ──
//   Ölçülen kusur (2026-10-10, bağımsız inceleme): tek bir kırık .sar dosyası
//   `denetimKos`u ilk söz dizimi hatasında erken çıkışa götürüyor ve akış boş
//   dönüyordu; eklenti bu boşluğu temiz ağaç gibi okuyor, çapraz tanılar
//   kayboluyor ve hiçbir işaret yanmıyordu. Komut satırı davranışı KORUNUR
//   (bayraksız çağrı yine çıkış 2 ile durur); yalnız bayrakla çağıran yüzey,
//   kırık dosyayı evrenden düşürüp öteki dosyaların tanılarını alır ve kırık
//   dosyayı `kirikDosyalar` alanından okur.

/** Dosya başına panel ya da komut satırı ayrımı yapmadan (dosya, kod) çiftlerinin kümesi. */
const bulguKumesi = (akis: Array<{ dosya: string; tanilar: Array<{ kod: string }> }>, haric?: string): string[] =>
  akis.filter((r) => r.dosya !== haric).flatMap((r) => r.tanilar.map((t) => `${r.dosya} · ${t.kod}`)).sort();

function kirikFiksturu(kok: string): void {
  writeFileSync(join(kok, "t_anadizin.sar"),
    'Proje( kod: PRJ-KRK, ad: "krk", ne: "kırık dosya fikstürü", rejim: esnek ) {\n  Kitaplık( kod: KTP-IS, yol: "is/", ne: "işin kitaplığı" ) {\n    Raf( kod: RAF-PLN, yol: "plan/", ne: "plan rafı" )\n  }\n}\n');
  mkdirSync(join(kok, "is", "plan"), { recursive: true });
  writeFileSync(join(kok, "is", "plan", "is.sar"), `Faz( kod: FZ-K, ad: "Mevsim", ne: "dönem" ) {
  Blok( kod: BLK-K, ad: "Gövde", ne: "iş" ) {
    Katman( kod: KAT-K, ad: "Dal", ne: "teknoloji" ) {
      Adım( kod: ADM-K1, durum: beklemede, ne: "bekleyen iş", bağımlı: [ ADM-YOK ] )
    }
  }
}\n`);
}

test("MGZ-A12: kirikDosyayiAtla bayrağı söz dizimi hatasında turu durdurmaz — kırık dosya evrenden düşer, kirikDosyalar onu söyler, öteki dosyaların bulguları korunur", () => {
  const kok = gecici();
  try {
    kirikFiksturu(kok);
    const saglam = denetimKos(kok, { snfYol: SNF_YOL, bugun: "2026-10-16", tamListe: true });
    assert.equal(saglam.tamKosum, true);
    const saglamKume = bulguKumesi(saglam.akis);
    assert.ok(saglamKume.some((s) => s.endsWith("kırık-referans")), "fikstür çapraz tanı üretmiyor — ölçüm anlamsız");
    assert.equal(saglam.kirikDosyalar, undefined, "sağlam ağaçta kırık dosya listesi doğmamalı");

    writeFileSync(join(kok, "is", "plan", "kirik.sar"), 'Faz( kod: FZ-KIRIK, ad: "yarım kalan ilan"\n');

    // ① Komut satırı sözleşmesi korunur: bayraksız çağrı ilk hatada durur.
    const eski = denetimKos(kok, { snfYol: SNF_YOL, bugun: "2026-10-16", tamListe: true });
    assert.equal(eski.tamKosum, false, "bayraksız çağrı erken çıkışını korumalı — komut satırı davranışı değişmez");
    assert.equal(eski.cikis, 2);
    assert.equal(eski.sozdizimHata?.etiket, "is/plan/kirik.sar");
    assert.deepEqual(eski.akis, [], "erken çıkış akış taşımaz — kusurun ölçüldüğü hâl budur");

    // ② Bayrakla çağrı: kırık dosya düşer, tur tamamlanır ve öteki dosyaların bulguları birebir aynıdır.
    const atla = denetimKos(kok, { snfYol: SNF_YOL, bugun: "2026-10-16", tamListe: true, kirikDosyayiAtla: true });
    assert.equal(atla.tamKosum, true, "kırık dosya atlanınca tur tamamlanmalı");
    assert.equal(atla.sozdizimHata, undefined, "erken çıkış alanı atlama kipinde dolmaz — kırık dosya kendi alanında yaşar");
    assert.equal(atla.kirikDosyalar?.length, 1, "kırık dosya listede yok — eksiklik sessiz kalır");
    assert.equal(atla.kirikDosyalar?.[0]?.etiket, "is/plan/kirik.sar");
    assert.ok((atla.kirikDosyalar?.[0]?.satir ?? 0) > 0, "kırık dosyanın satırı taşınmalı");
    assert.ok((atla.kirikDosyalar?.[0]?.mesaj ?? "").length > 0, "kırık dosyanın iletisi taşınmalı");
    assert.deepEqual(bulguKumesi(atla.akis, "is/plan/kirik.sar"), saglamKume,
      "kırık dosya atlandığında öteki dosyaların bulguları sağlam ağaçtakiyle aynı olmalı");
    assert.notEqual(atla.cikis, 0, "eksik koşan tur yeşil çıkış veremez — eksik denetim temizlik kanıtı değildir");

    // ③ Dosya onarılınca liste kalkar ve bulgular öncekine döner.
    writeFileSync(join(kok, "is", "plan", "kirik.sar"), "// onarıldı\n");
    const onarildi = denetimKos(kok, { snfYol: SNF_YOL, bugun: "2026-10-16", tamListe: true, kirikDosyayiAtla: true });
    assert.equal(onarildi.kirikDosyalar, undefined, "onarılan dosya listede kaldı");
    assert.deepEqual(bulguKumesi(onarildi.akis, "is/plan/kirik.sar"), saglamKume);
  } finally { rmSync(kok, { recursive: true, force: true }); }
});

test("MGZ-A12: giriş dosyasının kendisi kırıksa atlama kipi de tam koşamaz, fakat kırık dosyayı yine adıyla söyler", () => {
  const kok = gecici();
  try {
    kirikFiksturu(kok);
    writeFileSync(join(kok, "t_anadizin.sar"), 'Proje( kod: PRJ-KRK, ad: "krk"\n');
    const s = denetimKos(kok, { snfYol: SNF_YOL, bugun: "2026-10-16", tamListe: true, kirikDosyayiAtla: true });
    assert.equal(s.tamKosum, false, "giriş dosyası olmadan tur tamamlanamaz");
    assert.equal(s.kirikDosyalar?.[0]?.etiket, "t_anadizin.sar", "kırık giriş dosyası listede adıyla yok");
    assert.ok(s.akis.some((r) => r.tanilar.some((t) => t.mesaj.includes("giriş") || t.kod === "kural-ihlali")),
      "giriş dosyasının ayrıştırılamadığı tanıyla söylenmeli");
  } finally { rmSync(kok, { recursive: true, force: true }); }
});

test("MGZ-A12: bilerek-hatalı (muaf) dosya atlama kipinde kırık dosya sayılmaz", () => {
  const kok = gecici();
  try {
    kirikFiksturu(kok);
    writeFileSync(join(kok, "is", "plan", "ders.sar"), '// sarmal: bilerek-hatalı — ders malzemesi\nFaz( kod: FZ-DERS, ad: "yarım"\n');
    const s = denetimKos(kok, { snfYol: SNF_YOL, bugun: "2026-10-16", tamListe: true, kirikDosyayiAtla: true });
    assert.equal(s.tamKosum, true);
    assert.equal(s.kirikDosyalar, undefined, "muaf dosya kırık dosya listesine girdi — ders malzemesi işaret yakar");
  } finally { rmSync(kok, { recursive: true, force: true }); }
});

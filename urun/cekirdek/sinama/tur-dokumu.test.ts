// ═══════════════════════════════════════════════════════════════════════════
// tur-dokumu.test.ts — 📊 KAPI KENDİ SAYISINI DÜRÜSTÇE SÖYLER
//
//   ÖLÇÜLEN KUSUR (2026-07-29): `denetle` çıktısı dosya başına aynı türden ilk
//   üç bulguyu tek tek listeliyor, kalanını tek satıra indiriyordu. Okunabilirlik
//   için doğru bir tercihti; ölçüm için tuzaktı. Çalışma alanı koşumunda 187 tanı
//   satırı basılıyor, özet satırlarının içinde binden fazla bulgu saklı kalıyordu.
//   Bir kontrolcü bu tuzağa aynı gün İKİ KEZ düştü ve yanlış sayı bildirdi. Hangi
//   tanının kaç bulgu ürettiği bilinmeden hiçbir tanının düzeyi tartışılamaz;
//   bu yüzden kusur, ölçüm turunun önündeki asıl engeldi.
//
//   BU DOSYANIN NÖBET FELSEFESİ — iki ders burada birlikte uygulanır:
//
//   ① PARÇALAR YEŞİLKEN BÜTÜN KIRIK OLABİLİR. Bu yüzden nöbetlerden biri
//      `denetimKos` verisini değil, GERÇEKTEN BASILAN METNİ okur: alt-süreçte
//      gerçek komut koşar, stdout'u ayrıştırır. Sunum katmanı sessizce yalan
//      söylerse veri nöbetleri bunu göremez, çıktı nöbeti görür.
//
//   ② KOŞULU DOĞMAYAN NÖBET HİÇBİR ŞEY ÖLÇMEZ. Özetleme ancak bir dosyada aynı
//      türden DÖRT ya da daha çok bulgu varken tetiklenir. Fikstür bu yüzden
//      kasten BEŞ `şema-dışı-alan` bulgusu üretir — üç tanesi tek tek basılır,
//      ikisi özet satırına katlanır. Fikstür dört bulgunun altına düşerse bu
//      dosyadaki nöbetlerin hepsi anlamsızlaşır.
// ═══════════════════════════════════════════════════════════════════════════
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { denetimKos } from "../src/denetim.ts";

const SNF_YOL = fileURLToPath(new URL("../../../oz/siniflama/kayit.json", import.meta.url));
const KOK = fileURLToPath(new URL("..", import.meta.url));

/** Özetlemenin tetiklendiği eşik — fikstür bunun ÜSTÜNDE bulgu üretmek zorundadır. */
const TEKIL_SINIRI = 3;

/**
 * Fikstür: TEK dosyada BEŞ `şema-dışı-alan` bulgusu. Sayı bilinçlidir — eşiğin
 * (üç) üstünde olmasaydı özetleme hiç çalışmaz ve bu dosyadaki nöbetler yeşil
 * kalırken hiçbir şey ölçmezdi. `ikinciDosya` verilirse aynı tür bulgu ikinci
 * bir dosyaya da yayılır; yayılım sayısı ancak böyle sınanabilir.
 */
function fiksturKur(ikinciDosya = false): string {
  const dizin = mkdtempSync(join(tmpdir(), "sarmal-dokum-"));
  writeFileSync(join(dizin, "d_anadizin.sar"),
    `Proje( kod: PRJ-DKM, ad: "dokum", ne: "tür dökümü fikstürü" ) {\n`
    + `  Raf( kod: RAF-PLAN, yol: "plan/", ne: "planlar" )\n}\n`, "utf8");
  mkdirSync(join(dizin, "plan"));
  const adim = (kod: string, ne: string, alan: string) =>
    `    Adım( kod: ${kod}, durum: beklemede, ne: "${ne}", bağımlı: [], ${alan}: "x" )\n`;
  writeFileSync(join(dizin, "plan", "is.sar"),
    `Blok( kod: BLK-DKM, ne: "iş" ) {\n  Katman( kod: KAT-DKM, ne: "k" ) {\n`
    + adim("ADM-A", "bir", "uydurmaBir")
    + adim("ADM-B", "iki", "uydurmaIki")
    + adim("ADM-C", "üç", "uydurmaUc")
    + adim("ADM-D", "dört", "uydurmaDort")
    + adim("ADM-E", "beş", "uydurmaBes")
    + `  }\n}\n`, "utf8");
  if (ikinciDosya) {
    writeFileSync(join(dizin, "plan", "ikinci.sar"),
      `Blok( kod: BLK-IKI, ne: "iş" ) {\n  Katman( kod: KAT-IKI, ne: "k" ) {\n`
      + adim("ADM-F", "altı", "uydurmaAlti")
      + `  }\n}\n`, "utf8");
  }
  return dizin;
}

const dokumSatiri = (dizin: string, kod: string, tamListe = false) => {
  const s = denetimKos(dizin, { snfYol: SNF_YOL, tamListe });
  return s.turDokumu.find((r) => r.kod === kod);
};

// ── ① MAKİNE YÜZÜ — gerçek toplam çıktı ayrıştırmadan alınabilir ─────────────

test("tür dökümü: özetlenen bulgular sayımda KAYBOLMAZ — makine gerçek toplamı doğrudan okur", () => {
  const dizin = fiksturKur();
  try {
    const s = denetimKos(dizin, { snfYol: SNF_YOL });
    const satir = s.turDokumu.find((r) => r.kod === "şema-dışı-alan");
    assert.ok(satir, "şema-dışı-alan tür dökümünde bulunmalı — döküm türü hiç görmezse ölçüm yok demektir");
    assert.equal(satir!.toplam, 5,
      `gerçek toplam 5 olmalı; ${satir!.toplam} okundu — özet satırının katladığı bulgular sayımdan düşmüş`);
    assert.equal(satir!.dosyaSayisi, 1, "tür tek dosyada yaşıyor");
    assert.deepEqual(satir!.duzeyler, ["bilgi"], "türün düzeyi dökümde görünmeli");

    // Basılan akış BU türden yalnız dört satır taşır (üç tekil + bir özet) —
    // yani sayı, satır sayımından DEĞİL, satırların taşıdığı ağırlıktan gelir.
    const basilan = s.akis.flatMap((r) => r.tanilar).filter((t) => t.kod === "şema-dışı-alan");
    assert.equal(basilan.length, TEKIL_SINIRI + 1,
      "okunabilirlik kısıtı yerinde durmalı: üç tekil satır + bir özet satırı");
    assert.equal(basilan.reduce((t, x) => t + (x.ozetlenen ?? 1), 0), 5,
      "akışı okuyan bir sayaç da aynı gerçek toplama varmalı (ozetlenen ?? 1)");
  } finally { rmSync(dizin, { recursive: true, force: true }); }
});

test("tür dökümü: en ağır tür başta — sıralama bulgu sayısına göre azalan ve deterministik", () => {
  const dizin = fiksturKur();
  try {
    const a = denetimKos(dizin, { snfYol: SNF_YOL }).turDokumu;
    for (let i = 1; i < a.length; i++) {
      assert.ok(a[i - 1].toplam >= a[i].toplam,
        `döküm azalan sırada olmalı: ${a[i - 1].kod}(${a[i - 1].toplam}) < ${a[i].kod}(${a[i].toplam})`);
    }
    const b = denetimKos(dizin, { snfYol: SNF_YOL }).turDokumu;
    assert.deepEqual(a, b, "aynı çalışma alanı iki koşumda aynı dökümü vermeli — ölçüm determinizm ister");
  } finally { rmSync(dizin, { recursive: true, force: true }); }
});

test("tür dökümü: yayılım özet satırıyla TEK dosyaya çökmez — tür iki dosyadaysa iki der", () => {
  // Özet satırı katladığı bütün bulguları TEK bir dosyaya yazar; yayılım,
  // katlama anında kaybolan bilgidir. Sayım katlanmamış listeden alınmazsa
  // döküm "bir dosya" diye yalan söyler.
  //
  // İKİ KATLAMA SINIFI birlikte ölçülür, çünkü ikisi de ayrı kodda yaşar:
  //   • `şema-dışı-alan` DOSYA İÇİNDE katlanır (her dosya kendi özetini basar),
  //   • `açık-adım` DOSYALAR ARASINDA katlanır (bütün bekleyen Adımlar tek
  //     satıra iner) — yayılımı yutan asıl sınıf budur.
  const dizin = fiksturKur(true);
  try {
    for (const kod of ["şema-dışı-alan", "açık-adım"]) {
      const ozetli = dokumSatiri(dizin, kod);
      const tam = dokumSatiri(dizin, kod, true);
      assert.equal(ozetli?.toplam, 6, `${kod}: iki dosyaya yayılan altı bulgu`);
      assert.equal(ozetli?.dosyaSayisi, 2,
        `${kod}: yayılım iki dosya olmalı; ${ozetli?.dosyaSayisi} okundu — özet satırı yayılımı yuttu`);
      assert.deepEqual(ozetli, tam, `${kod}: yayılım da iki kipte aynı olmalı`);
    }
  } finally { rmSync(dizin, { recursive: true, force: true }); }
});

// ── ② ÖZETLEME KAPALI KİPİ — ölçen göz tam listeyi isteyebilir ───────────────

test("özetleme kapalı kipi: --tam-liste her bulguyu tek tek basar, döküm sayıları DEĞİŞMEZ", () => {
  const dizin = fiksturKur();
  try {
    const ozetli = denetimKos(dizin, { snfYol: SNF_YOL });
    const tam = denetimKos(dizin, { snfYol: SNF_YOL, tamListe: true });

    const say = (s: typeof ozetli) =>
      s.akis.flatMap((r) => r.tanilar).filter((t) => t.kod === "şema-dışı-alan");
    assert.equal(say(ozetli).length, TEKIL_SINIRI + 1, "özetli kipte dört satır (üç tekil + özet)");
    assert.equal(say(tam).length, 5, "kapalı kipte beş bulgunun beşi de kendi satırında");
    assert.ok(say(tam).every((t) => t.ozetlenen === undefined),
      "kapalı kipte hiçbir satır başka bulguların yerine geçmemeli");

    assert.deepEqual(tam.turDokumu, ozetli.turDokumu,
      "SUNUM değişti, GERÇEK değişmedi: iki kip birebir aynı dökümü vermeli");
  } finally { rmSync(dizin, { recursive: true, force: true }); }
});

// ── ③ ÇIKTININ KENDİSİ — gerçek alt-süreç, gerçek stdout ─────────────────────
//   Veri nöbetleri yeşilken sunum katmanı yalan söyleyebilir; bu nöbet basılan
//   metni okur, çünkü kullanıcının gördüğü şey odur.

const cliKos = (dizin: string, ...ek: string[]) => {
  const s = spawnSync(process.execPath, [join(KOK, "src", "sarmal.ts"), "denetle", dizin, ...ek],
    { encoding: "utf8", timeout: 120000 });
  return (s.stdout ?? "") + (s.stderr ?? "");
};

test("çıktı nöbeti: basılan metin tür dökümünü GÖSTERİR ve gerçek toplamı söyler", () => {
  const dizin = fiksturKur();
  try {
    const cikti = cliKos(dizin);
    assert.match(cikti, /📊 TÜR DÖKÜMÜ/, `tür dökümü bloğu çıktıda YOK:\n${cikti.slice(-1200)}`);

    const satir = cikti.split("\n").find((l) => l.includes("× şema-dışı-alan"));
    assert.ok(satir, `tür dökümünde şema-dışı-alan satırı YOK:\n${cikti.slice(-1200)}`);
    assert.match(satir!, /\s5 × şema-dışı-alan/,
      `basılan döküm gerçek toplamı (5) söylemeli — satır: ${satir}`);
    assert.match(satir!, /1 dosya/, "döküm satırı yayılımı da söylemeli");
    assert.match(satir!, /bilgi/, "döküm satırı düzeyi de söylemeli");

    // Okunabilirlik kısıtı KORUNUR: tekil döküm hâlâ üç satırla sınırlıdır.
    const tekil = cikti.split("\n")
      .filter((l) => l.includes("[şema-dışı-alan]") && !l.includes("aynı türden"));
    assert.equal(tekil.length, TEKIL_SINIRI,
      `okunabilirlik kısıtı bozulmuş: ${tekil.length} tekil satır basıldı, üç bekleniyordu`);
  } finally { rmSync(dizin, { recursive: true, force: true }); }
});

test("çıktı nöbeti: özet cümlesi saklanan sayının YALNIZ o dosyaya ait olduğunu söyler ve dökümü gösterir", () => {
  const dizin = fiksturKur();
  try {
    const ozet = cliKos(dizin).split("\n").find((l) => l.includes("aynı türden"));
    assert.ok(ozet, "özet satırı çıktıda bulunmalı — fikstür eşiği aşmıyor olabilir");
    assert.match(ozet!, /Yalnız bu dosyada/,
      `özet cümlesi kapsamı BAŞTAN söylemeli; okuyan bunu tür toplamı sanmamalı — satır: ${ozet}`);
    assert.match(ozet!, /türün toplamı değildir/,
      "cümle, buradaki sayının tür toplamı OLMADIĞINI açıkça söylemeli");
    assert.match(ozet!, /tür dökümü/,
      "cümle, gerçek toplamın nerede görüleceğini söylemeli");
    assert.match(ozet!, /--tam-liste/,
      "cümle, tam listenin nasıl alınacağını da öğretmeli");
  } finally { rmSync(dizin, { recursive: true, force: true }); }
});

test("çıktı nöbeti: --tam-liste bayrağı gerçek komutta özetlemeyi KAPATIR", () => {
  const dizin = fiksturKur();
  try {
    const cikti = cliKos(dizin, "--tam-liste");
    assert.ok(!/Yalnız bu (dosyada|Proje kapısında) aynı türden/.test(cikti),
      `kapalı kipte özet satırı basılmamalı:\n${cikti.slice(0, 1500)}`);
    assert.match(cikti, /🔓 Özetleme kapalı/, "kapalı kip kendini çıktıda ilan etmeli");
    const tekil = cikti.split("\n").filter((l) => l.includes("[şema-dışı-alan]"));
    assert.equal(tekil.length, 5, `kapalı kipte beş bulgunun beşi de basılmalı; ${tekil.length} basıldı`);
    const satir = cikti.split("\n").find((l) => l.includes("× şema-dışı-alan"));
    assert.match(satir ?? "", /\s5 × şema-dışı-alan/,
      "kapalı kipte de döküm aynı gerçek toplamı vermeli — değişen yalnız sunumdur");
  } finally { rmSync(dizin, { recursive: true, force: true }); }
});

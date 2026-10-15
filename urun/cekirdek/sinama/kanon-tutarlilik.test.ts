import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { ayristir } from "../src/ayristirici.ts";
import { belirtecle } from "../src/belirtec.ts";
import { BELGE_YUZU_HEDEFLERI, belgeYuzleriniUret, kanonOlc } from "../src/belge-yuzleri.ts";
import { dizindenIndeks } from "../src/kimlik.ts";
import {
  canliSicilSayisi,
  KANON_SAYIMI,
  KANON_SAYIMI_KAYDI,
  kanonMaddeleriniOlc,
  kanonMaddeSayisi,
  kanonSayimiBulgusu,
  kanonTutarlilikMetni,
  TANI_KUMESI_SAYIMI,
  taniKumesiniOlc,
  taniKumesiSayimiBulgusu,
  yeniKumeSayisi,
  type OlculenTaniKumesi,
  type TaniKumesiSayimi,
} from "../src/kanon-tutarlilik.ts";
import type { Dugum } from "../src/sozdizim.ts";
import { siniflamaOrtuMerge, siniflamaOrtuYukle, siniflamaYukle } from "../src/siniflama.ts";
import {
  EMEKLI_TANI_KODLARI,
  EMEKLILIK_BORCU_TANI_KODLARI,
  taniSicili,
  YENI_TANI_KANONU,
} from "../src/tani-sicili.ts";

const KOK = fileURLToPath(new URL("../../..", import.meta.url));
const KANON_SHA = [
  "dil.sar:3ed77f36fc53f5d048365b7134685d96e2b71eb847adccc39e144f139539de92",
  "mim.sar:5749d49cbd2ecd6dd96e228072a8348190b3e81293a7f7c3785023b50583c95a",
  "ogr.sar:ed91c13959ae35594b225b5fe066389fc20b10cbb43f888bb563c02e72cd0d67",
  "ork.sar:1040891c95d9001644cd39fe577821b59557ebd11f652df72da1da14ca8881d3",
  "str.sar:2146dd7647c0d06738de30e4e73ce0c38b0019ad9ca5aeb9b4e75e767635784e",
  "tip.sar:9e50275c279b1253c6f16bdf7e0e3352e463170fab70ce851db03fc025a062e3",   // BKM-OLG-A13: TIP-1.3 Profil ile genişledi, TIP-1.17 doğdu
  "yas.sar:23891b7c396bcff3dc35b2f540a295efff91210f4a5ade67a10a29ae507ede40",
  "yuz.sar:439364007d1ade1ae1a5f11f3b8d36db9582f884913b11b1f6efe68a808ffe02",
] as const;

test("resmi sekizlinin bütün maddeleri örneği ve dört parçayı sabit SHA'larla taşır", () => {
  const olcum = kanonMaddeleriniOlc(KOK);
  // Madde sayısı bu sınamada dondurulmaz: sayının tek kaydı KANON_SAYIMI, kayda karşı
  // tek nöbeti bu dosyadaki "kanon sayımı nöbeti" sınamasıdır (HST-MTR-A02).
  assert.equal(olcum.maddeler.filter((m) => m.ornek === "—").length, 0);
  assert.equal(olcum.maddeler.filter((m) => !m.dortParcaTam).length, 0);
  assert.deepEqual(olcum.muhurler, KANON_SHA);
});

test("yeni küme MIM-3.4, MIM-3.2, KPS-SIR-A01, KPS-SIR-A03, KPS-SIR-A02 ve RFM-MOTOR-A02 tanılarını kanonun yazdığı düzeyde taşır", () => {
  // Kümelerin sayısı ve düzey dağılımı bu sınamada dondurulmaz: tek kaydı
  // TANI_KUMESI_SAYIMI, kayda karşı tek nöbeti bu dosyadaki "tanı kümesi sayım
  // nöbeti" sınamasıdır (HST-MTR-A12). Burada yalnız kimliklerin yeri ve düzeyi ölçülür.
  // DIL-1.8 düğüm kodu standardı (RFM-MOTOR-A02 · Founder onayı 2026-10-10): kanon
  // tanılarını uyarı düzeyinde yazar ve hiçbir koşulda hataya çıkarılmalarını yasaklar.
  assert.deepEqual(YENI_TANI_KANONU.filter((t) => t.madde === "DIL-1.8").map((t) => `${t.kod}:${t.kanonDüzey}:${t.kademe}`),
    ["ilansız-önek:uyarı:uyarı", "kod-biçimi-uyumsuz:uyarı:uyarı"]);
  // Faz sırası ve Blok yapısı (KPS-SIR-A01 · Founder hükmü 2026-09-29): altı tanı
  // doğdu, `seçilemez-adım-yürütümü` bilgiden kanonun yazdığı uyarıya çıktı.
  assert.deepEqual(YENI_TANI_KANONU.filter((t) => ["MIM-1.2", "MIM-1.3", "MIM-1.6", "ORK-3.2"].includes(t.madde) && t.kod !== "projesiz-faz" && t.kod !== "adım-atomikliği")
    .map((t) => `${t.madde}:${t.kod}:${t.kademe}`), [
    "ORK-3.2:seçilemez-adım-yürütümü:uyarı",
    "MIM-1.2:ters-faz-bağımlılığı:hata", "MIM-1.2:erken-faz-işi:uyarı", "MIM-1.2:yabancı-faz-bağı:uyarı",
    "MIM-1.3:katmansız-blok:uyarı", "MIM-1.3:tek-adımlı-blok:bilgi", "MIM-1.6:adımsız-kapsayıcı:bilgi",
    // Faz dosyası düzeni (KPS-SIR-A03 · Founder hükmü 2026-09-29): dört gözlem kanonun
    // yazdığı bilgi düzeyinde doğdu; düzeyin yükselmesi ayrı bir Founder kapısıdır.
    "MIM-1.2:çok-fazlı-dosya:bilgi", "MIM-1.2:faz-dışı-blok:bilgi", "MIM-1.2:faz-ilanı-tepede-değil:bilgi", "MIM-1.2:yersiz-faz-dosyası:bilgi",
  ]);
  // MIM-3.2 Kitaplık kademesi (KPS-CEL-A01 · Founder hükmü 2026-09-09): kademe
  // atlandığında madde kendi kademesiyle, yani uyarı düzeyinde konuşur.
  assert.equal(YENI_TANI_KANONU.filter((t) => t.madde === "MIM-3.2" && t.kod === "kitaplıksız-kök" && t.kademe === "uyarı").length, 1);
  // DIL-2.2 girinti gözlemi (KPS-SIR-A02): maddenin zorlama satırına bilgi düzeyinde ilan edildi.
  assert.equal(YENI_TANI_KANONU.filter((t) => t.madde === "DIL-2.2" && t.kod === "girinti-yapı-uyumsuz" && t.kademe === "bilgi").length, 1);
  // MIM-1.2 projesiz Faz gözlemi (KPS-FAZ-A02 · Founder hükmü 2026-09-19): hükmün
  // Faz ile Proje arasındaki yarısı bir gözlemle tutulur ve bilgi düzeyinde konuşur.
  assert.equal(YENI_TANI_KANONU.filter((t) => t.madde === "MIM-1.2" && t.kod === "projesiz-faz" && t.kademe === "bilgi").length, 1);
  // MIM-3.4 dosya mühürleri (KPS-MHR-A01 · Founder hükmü 2026-09-11).
  assert.deepEqual(YENI_TANI_KANONU.filter((t) => t.madde === "MIM-3.4").map((t) => `${t.kod}:${t.kademe}`),
    ["dosya-mührü:bilgi", "sonraya-bırakılmış-dosya:bilgi", "geçersiz-dosya-adı:uyarı"]);
  // ORK-8 mevsim ritüelinin ilk motor karşılığı (Founder ölçümü 2026-08-27).
  assert.equal(YENI_TANI_KANONU.filter((t) => t.madde === "ORK-8" && t.kod === "mevsim-vadesi-geçti").length, 1);
  // ORK-8 mühür dürüstlüğü bekçisi (KPS-MVS-A01 ikinci teslim · kontrolcü hükmü 2026-09-10).
  assert.equal(YENI_TANI_KANONU.filter((t) => t.madde === "ORK-8" && t.kod === "mevsim-mührü-çelişkili").length, 1);
  assert.equal(YENI_TANI_KANONU.filter((t) => t.madde === "YUZ-3.3" && t.kod === "tanı-yüzeyi-karışması").length, 1);
  // MIM-1.7 AltKatman tekilliği — Founder hükmü 2026-08-28; kök sebep bir hüküm
  // boşluğuydu ve madde o boşluğu kapattı, bekçi de onu hata düzeyinde zorlar.
  assert.equal(YENI_TANI_KANONU.filter((t) => t.madde === "MIM-1.7" && t.kod === "altkatman-tekilliği-ihlali").length, 1);
});

test("uygulanmış emekli ve canlı emeklilik borcu tam sicile karşı ayrıdır", () => {
  const snf = siniflamaOrtuMerge(
    siniflamaYukle(join(KOK, "oz/siniflama/kayit.json")),
    siniflamaOrtuYukle(KOK),
  );
  const canli = taniSicili(snf);
  // Sicilin ve kümelerin büyüklüğü burada dondurulmaz (TANI_KUMESI_SAYIMI · HST-MTR-A12);
  // bu sınama yalnız iki kümenin canlı sicile göre yerini ölçer. Canlı sicilin
  // 2026-09-10 ile 2026-10-02 arasındaki büyümesi kaydın geçmiş satırlarındadır.
  assert.deepEqual(EMEKLI_TANI_KODLARI.filter((kod) => canli.has(kod)), [], "uygulanmış emekli kimlik canlı sicilde durmamalı");
  assert.deepEqual(EMEKLILIK_BORCU_TANI_KODLARI.filter((kod) => !canli.has(kod)), [], "emeklilik borcundaki her kimlik canlı sicilde durmalı");
});

test("A03 türevi idempotenttir ve geneldurum'u hüküm kaynağı olarak okumaz", () => {
  const ilk = kanonTutarlilikMetni(KOK);
  const ikinci = kanonTutarlilikMetni(KOK);
  const uretici = readFileSync(join(KOK, "urun/cekirdek/src/kanon-tutarlilik.ts"), "utf8");
  assert.equal(ikinci, ilk);
  const madde = kanonMaddeleriniOlc(KOK).maddeler.length;
  assert.ok(ilk.includes(`Resmi sonuç ${madde}/${madde} maddedir`), "türev ölçülen madde sayısını söylemeli");
  assert.ok(ilk.includes(`Faz dosyası düzeninin dört gözlemiyle, DIL-2.2 girinti gözlemiyle ve DIL-1.8 düğüm kodu standardının iki uyarısıyla ${YENI_TANI_KANONU.length} canlı yeni kimliğe ulaşır`),
    "türev yeni kümenin canlı sayısını söylemeli");
  assert.doesNotMatch(ilk, /144 madde|144\/144/);
  assert.doesNotMatch(uretici, /readFileSync\([^\n]*geneldurum|readdirSync\([^\n]*geneldurum/);
});

// ── KPS-BLM-A01 · `ilgili` listelerinin kimlik nöbeti ─────────────────────────
//   Kanon maddelerinin `ilgili` listeleri bölüm kök kimliklerini taşır (DIL-0,
//   MIM-0, OGR-0, ORK-0, STR-0, TIP-0, YAS-0, YUZ-0). Çıplak bölüm adı bir kod
//   değildir, çünkü kimlik deseni tire ister; bu yüzden tanıma gitme, atıf bulma
//   ve atıf dekoru yüzeyleri onu hiç görmez. Nöbet üç şeyi ölçer: hiçbir madde
//   listesinde çıplak bölüm adı kalmamıştır, her hedef gezinme aracının kullandığı
//   kimlik indeksinde tek bir tanıma çözülür ve Karar düğümlerinin makine-okur
//   ikizi belge bloğundaki Hüküm listesiyle birebirdir. Yalnız Hüküm satırı ile
//   `karar` alanındaki liste ölçülür; Örnek ve Zorlama metinlerindeki alıntı
//   listeler madde metninin dokunulmaz parçasıdır ve bu nöbetin konusu değildir.
//   Kırmızı fikstür geçici bir kopyada koşar ve canlı ağaca yazmaz.
const BOLUM_ADLARI: ReadonlySet<string> = new Set(["DIL", "MIM", "OGR", "ORK", "STR", "TIP", "YAS", "YUZ"]);
const BOLUM_KOKU = /^(DIL|MIM|OGR|ORK|STR|TIP|YAS|YUZ)-0$/;
const ILGILI_LISTESI = /ilgili: \[([^\]]*)\]/g;

interface IlgiliListesi {
  readonly dosya: string;
  readonly satir: number;
  readonly tur: "Hüküm" | "karar";
  readonly uyeler: readonly string[];
}

const uyeleriAyir = (ic: string): string[] => ic.split(",").map((p) => p.trim()).filter(Boolean);

/** Sekiz kanon dosyasında Hüküm satırı ile `karar` alanındaki `ilgili` listelerini toplar. */
function ilgiliListeleri(kok: string): IlgiliListesi[] {
  const dizin = join(kok, "yasa", "kanon");
  const sonuc: IlgiliListesi[] = [];
  for (const dosya of readdirSync(dizin).filter((ad) => ad.endsWith(".sar")).sort()) {
    readFileSync(join(dizin, dosya), "utf8").split("\n").forEach((metin, i) => {
      const tur = metin.startsWith("**Hüküm:**") ? "Hüküm" : /^\s*karar: "/.test(metin) ? "karar" : undefined;
      if (!tur) return;
      for (const es of metin.matchAll(ILGILI_LISTESI)) sonuc.push({ dosya, satir: i + 1, tur, uyeler: uyeleriAyir(es[1]) });
    });
  }
  return sonuc;
}

/** Çıplak bölüm adı taşıyan her üyeliği `dosya:satır üye` biçiminde döndürür. */
function ciplakUyelikler(kok: string): string[] {
  return ilgiliListeleri(kok).flatMap((l) =>
    l.uyeler.filter((u) => BOLUM_ADLARI.has(u)).map((u) => `${l.dosya}:${l.satir} ${u}`));
}

function dugumleriGez(dugumler: readonly Dugum[], ziyaret: (d: Dugum) => void): void {
  for (const d of dugumler) { ziyaret(d); dugumleriGez(d.cocuklar, ziyaret); }
}

test("kanon maddelerinin ilgili listelerinde çıplak bölüm adı kalmamıştır", () => {
  const listeler = ilgiliListeleri(KOK);
  // Her madde Hüküm satırında, her Karar düğümü makine-okur ikizinde birer liste taşır.
  const maddeler = kanonMaddeleriniOlc(KOK).maddeler;
  assert.equal(listeler.filter((l) => l.tur === "Hüküm").length, maddeler.length);
  assert.equal(listeler.filter((l) => l.tur === "karar").length, maddeler.filter((m) => m.rol === "Karar").length);
  assert.deepEqual(ciplakUyelikler(KOK), [], "çıplak bölüm adı taşıyan ilgili üyeliği var");
  const kokDisi = listeler.flatMap((l) => l.uyeler.filter((u) => !BOLUM_KOKU.test(u)).map((u) => `${l.dosya}:${l.satir} ${u}`));
  assert.deepEqual(kokDisi, [], "ilgili listesinde bölüm kök kimliği olmayan üye var");
});

test("her ilgili hedefi kimlik indeksinde kendi bölüm dosyasındaki tek tanıma çözülür", () => {
  const indeks = dizindenIndeks(KOK);
  const hedefler = new Set(ilgiliListeleri(KOK).flatMap((l) => l.uyeler));
  assert.equal(hedefler.size, 8, "sekiz bölüm kökünün hepsi en az bir listede geçmeli");
  for (const hedef of hedefler) {
    const tanimlar = indeks.tanimlar(hedef);
    assert.equal(tanimlar.length, 1, `${hedef} kimlik indeksinde tek tanıma çözülmeli (bulunan: ${tanimlar.length})`);
    const bolumDosyasi = `yasa/kanon/${hedef.slice(0, 3).toLowerCase()}.sar`;
    assert.ok(tanimlar[0].dosya.replaceAll("\\", "/").endsWith(bolumDosyasi),
      `${hedef} tanımı ${bolumDosyasi} dosyasında olmalı (bulunan: ${tanimlar[0].dosya})`);
  }
});

test("Karar düğümlerinin karar alanındaki ilgili listesi Hüküm satırıyla birebirdir", () => {
  const dizin = join(KOK, "yasa", "kanon");
  let karsilastirilan = 0;
  for (const dosya of readdirSync(dizin).filter((ad) => ad.endsWith(".sar")).sort()) {
    const program = ayristir(belirtecle(readFileSync(join(dizin, dosya), "utf8")));
    dugumleriGez(program.bildirimler, (d) => {
      if (!(d.tur === "widget" && d.ad === "Karar")) return;
      const kod = d.parametreler.find((p) => p.ad === "kod")?.deger.metin ?? "?";
      const hukum = (d.belge ?? "").split("\n").find((s) => s.startsWith("**Hüküm:**")) ?? "";
      const karar = [...d.parametreler, ...d.ozellikler].find((p) => p.ad === "karar")?.deger.metin ?? "";
      const belgedeki = [...hukum.matchAll(ILGILI_LISTESI)].map((es) => uyeleriAyir(es[1]));
      const ikizdeki = [...karar.matchAll(ILGILI_LISTESI)].map((es) => uyeleriAyir(es[1]));
      assert.equal(belgedeki.length, 1, `${kod} Hüküm satırı tek bir ilgili listesi taşımalı`);
      assert.deepEqual(ikizdeki, belgedeki, `${kod} makine-okur ikizi belge bloğundan ayrışmış`);
      karsilastirilan++;
    });
  }
  assert.equal(karsilastirilan, kanonMaddeleriniOlc(KOK).maddeler.filter((m) => m.rol === "Karar").length);
});

test("kırmızı fikstür: kopyada bir listeye çıplak bölüm adı geri konunca ilgili nöbeti yakalar", () => {
  const sb = mkdtempSync(join(tmpdir(), "sarmal-ilgili-"));
  cpSync(join(KOK, "yasa", "kanon"), join(sb, "yasa", "kanon"), { recursive: true });
  assert.deepEqual(ciplakUyelikler(sb), [], "temiz kopya yeşil başlamalı");
  const dil = join(sb, "yasa", "kanon", "dil.sar");
  writeFileSync(dil, readFileSync(dil, "utf8").replace("ilgili: [DIL-0,", "ilgili: [DIL,"), "utf8");
  assert.deepEqual(ciplakUyelikler(sb), ["dil.sar:12 DIL"], "çıplak ad geri konduğu hâlde nöbet kırmızıya düşmedi");
});

// ── HST-MTR-A01 · taşıyıcı alan ile belge metninin eşitliği ───────────────────
//   Kanon dosyalarının başlığı, Karar düğümündeki `karar` ve `gerekçe` alanlarının
//   belge bloğundaki Hüküm ile Gerekçe metninin makine-okur taşıyıcısı olduğunu
//   ilan eder; her maddenin `ne` alanı da belge başlığını taşır. Dört parça
//   denetimi yalnız bölüm başlıklarının VARLIĞINA baktığı için 2026-08-09 tarihinde
//   ORK-8 maddesinin gerekçe taşıyıcısından bir cümle sessizce düşmüş ve kapı yeşil
//   yanmıştı (HTR-TASIYICI-MUTABAKAT-KORLUGU). Nöbet taşıyıcıyı belge metnine
//   EŞİTLİK üzerinden ölçer: boşluk ve satır kırılımı fark sayılmaz, harf, noktalama
//   ve sözcük farkı sayılır. Fikstürler geçici bir kopyada koşar ve canlı ağaca yazmaz.
//
//   Bilinen ayrışma (HST-MTR-A01 ölçümü · 2026-10-10): ORK-9 Teslim Halkası
//   maddesinin `karar` ve `gerekçe` taşıyıcıları belge metninin kısaltılmış bir
//   hâliydi ve kanon metninin düzeltilmesi Founder kapısı olduğu için ayrışma
//   listede adıyla duruyordu. HST-MTR-A13 iki taşıyıcıyı Founder onayıyla belge
//   metnine birebir eşitlemiştir ve liste boşalmıştır; 2026-10-11 ölçümünde iki yüz
//   otuz sekiz taşıyıcı alanın hepsi belge metnine eşittir. Liste yalnız küçülür:
//   madde düzeltildiğinde nöbet kırmızıya döner ve kaydın buradan düşürülmesini
//   ister, yeni bir ayrışma ise listeye eklenmeden önce kapıyı kırmızıda tutar.
const BILINEN_TASIYICI_AYRISMALARI: readonly string[] = [];

/** Ölçümün ayrışan taşıyıcılarını `KOD alan↔bölüm` biçiminde döndürür. */
function tasiyiciAyrismalari(maddeler: ReturnType<typeof kanonMaddeleriniOlc>["maddeler"]): string[] {
  return maddeler.flatMap((m) => m.tasiyicilar.filter((t) => !t.esit).map((t) => `${m.kod} ${t.alan}↔${t.bolum}`));
}

/** Üreticinin okuduğu kaynakları (kanon sekizlisi, sınıflama, tanı sicili) geçici bir köke kopyalar. */
function uretimKaynaklariniKopyala(): string {
  const sb = mkdtempSync(join(tmpdir(), "sarmal-tasiyici-"));
  cpSync(join(KOK, "yasa", "kanon"), join(sb, "yasa", "kanon"), { recursive: true });
  mkdirSync(join(sb, "oz", "siniflama"), { recursive: true });
  for (const ad of ["kayit.json", "ortu.json"]) cpSync(join(KOK, "oz", "siniflama", ad), join(sb, "oz", "siniflama", ad));
  mkdirSync(join(sb, "urun", "cekirdek", "src"), { recursive: true });
  cpSync(join(KOK, "urun", "cekirdek", "src", "tani-sicili.ts"), join(sb, "urun", "cekirdek", "src", "tani-sicili.ts"));
  return sb;
}

const SAR_BOLUMLERI = ["Hüküm", "Gerekçe", "Örnek", "Zorlama"] as const;

/** Sınamanın kendi okuması: belge bloğundaki bir bölümün metni (bir sonraki bölüm başlığına kadar). */
function belgedenBolum(belge: string, ad: "Hüküm" | "Gerekçe"): string {
  const satirlar = belge.split("\n");
  const bas = satirlar.findIndex((s) => s.startsWith(`**${ad}:**`));
  if (bas < 0) return "";
  const son = satirlar.findIndex((s, i) => i > bas && SAR_BOLUMLERI.some((b) => s.startsWith(`**${b}:**`)));
  return satirlar.slice(bas, son < 0 ? undefined : son).join("\n").slice(`**${ad}:**`.length).trim();
}

const sarMetni = (s: string): string => s.replaceAll("\\", "\\\\").replaceAll('"', '\\"');

/** Kopyadaki bir Karar düğümünün taşıyıcı alanını yeni metinle değiştirir; yazımın tam bir kez tuttuğunu doğrular. */
function tasiyiciyiYaz(sb: string, dosya: string, eski: string, alan: "karar" | "gerekçe", yeni: string): void {
  const yol = join(sb, "yasa", "kanon", dosya);
  const kaynak = readFileSync(yol, "utf8");
  const aranan = `${alan}: "${sarMetni(eski)}"`;
  assert.equal(kaynak.split(aranan).length - 1, 1, `${dosya} içinde ${alan} taşıyıcısı tek bir kez bulunmalı`);
  writeFileSync(yol, kaynak.replace(aranan, () => `${alan}: "${sarMetni(yeni)}"`), "utf8");
}

/** Kopyadaki bütün Karar taşıyıcılarını belge metnine eşitler; canlı kanonun bugünkü hâlinden bağımsız bir eşit fikstür kurar. */
function tasiyicilariEsitle(sb: string): void {
  const dizin = join(sb, "yasa", "kanon");
  for (const dosya of readdirSync(dizin).filter((ad) => ad.endsWith(".sar")).sort()) {
    const program = ayristir(belirtecle(readFileSync(join(dizin, dosya), "utf8")));
    const yazimlar: Array<[string, "karar" | "gerekçe", string]> = [];
    dugumleriGez(program.bildirimler, (d) => {
      if (!(d.tur === "widget" && d.ad === "Karar")) return;
      for (const [alan, bolum] of [["karar", "Hüküm"], ["gerekçe", "Gerekçe"]] as const) {
        const tasiyici = [...d.parametreler, ...d.ozellikler].find((p) => p.ad === alan)?.deger.metin ?? "";
        const belge = belgedenBolum(d.belge ?? "", bolum);
        if (tasiyici !== belge) yazimlar.push([tasiyici, alan, belge]);
      }
    });
    for (const [eski, alan, yeni] of yazimlar) tasiyiciyiYaz(sb, dosya, eski, alan, yeni);
  }
}

/** Ölçüm tablosundaki taşıyıcı satırı; payda ölçülen madde sayısıdır, sabit bir sayı değil. */
const tasiyiciSatiri = (toplam: number, esit: number, sonuc: "GEÇTİ" | "SAPMA"): string =>
  `| Taşıyıcı ile belge metni eşitliği | ${toplam}/${toplam} | ${esit}/${toplam} | ${sonuc} |`;

test("HST-MTR-A01 eşit fikstür: taşıyıcıları belge metnine eşitlenmiş kopyada nöbet yeşildir", () => {
  const sb = uretimKaynaklariniKopyala();
  tasiyicilariEsitle(sb);
  const olcum = kanonMaddeleriniOlc(sb);
  // Her madde `ne` ile başlığını, her Karar ek olarak `karar` ile Hükmünü ve `gerekçe` ile Gerekçesini taşır.
  for (const m of olcum.maddeler) {
    assert.deepEqual(m.tasiyicilar.map((t) => `${t.alan}↔${t.bolum}`),
      m.rol === "Karar" ? ["ne↔Başlık", "karar↔Hüküm", "gerekçe↔Gerekçe"] : ["ne↔Başlık"], `${m.kod} taşıyıcı kümesi`);
  }
  assert.deepEqual(tasiyiciAyrismalari(olcum.maddeler), [], "eşitlenmiş kopyada ayrışma kalmamalı");
  const toplam = olcum.maddeler.length;
  assert.ok(kanonTutarlilikMetni(sb).includes(tasiyiciSatiri(toplam, toplam, "GEÇTİ")), "ölçüm tablosu eşit kopyada GEÇTİ demeli");
});

test("HST-MTR-A01 kırmızı fikstür: gerekçe taşıyıcısından bir cümle düşünce nöbet maddeyi adıyla yakalar", () => {
  const sb = uretimKaynaklariniKopyala();
  tasiyicilariEsitle(sb);
  // 2026-08-09 kusurunun yeniden üretimi: ORK-8 gerekçe taşıyıcısının son cümlesi sessizce düşer.
  const ork8 = kanonMaddeleriniOlc(sb).maddeler.find((m) => m.kod === "ORK-8");
  assert.ok(ork8, "fikstür ORK-8 maddesini taşımalı");
  const program = ayristir(belirtecle(readFileSync(join(sb, "yasa", "kanon", "ork.sar"), "utf8")));
  let tam = "";
  dugumleriGez(program.bildirimler, (d) => {
    if (d.tur === "widget" && d.ad === "Karar" && d.parametreler.find((p) => p.ad === "kod")?.deger.metin === "ORK-8") {
      tam = [...d.parametreler, ...d.ozellikler].find((p) => p.ad === "gerekçe")?.deger.metin ?? "";
    }
  });
  const kesik = tam.slice(0, tam.lastIndexOf(". ", tam.length - 2) + 1);
  assert.ok(kesik.length > 0 && kesik.length < tam.length, "fikstür son cümleyi düşürebilmeli");
  tasiyiciyiYaz(sb, "ork.sar", tam, "gerekçe", kesik);

  const olcum = kanonMaddeleriniOlc(sb);
  assert.deepEqual(tasiyiciAyrismalari(olcum.maddeler), ["ORK-8 gerekçe↔Gerekçe"],
    "düşen cümle taşıyıcıyı belge metninden ayırdığı hâlde nöbet kırmızıya dönmedi");
  const ayrisma = olcum.maddeler.find((m) => m.kod === "ORK-8")?.tasiyicilar.find((t) => !t.esit);
  assert.ok(ayrisma && ayrisma.tasiyiciUzunluk < ayrisma.belgeUzunluk && ayrisma.ilkFark === kesik.length,
    "bulgu iki metnin uzunluğunu ve ilk farkın yerini söylemeli");
  const metin = kanonTutarlilikMetni(sb);
  const toplam = olcum.maddeler.length;
  assert.ok(metin.includes(tasiyiciSatiri(toplam, toplam - 1, "SAPMA")), "ölçüm tablosu ayrışmış kopyada SAPMA demeli");
  assert.match(metin, /\| `ORK-8` \| `gerekçe` \| Gerekçe \| \d+ \| \d+ \| \d+ \|/, "ayrışan madde türevde adıyla listelenmeli");
});

test("HST-MTR-A01 canlı kanon: taşıyıcısı belge metninden ayrışan alanlar yalnız bilinen bulgudur", () => {
  const olcum = kanonMaddeleriniOlc(KOK);
  const karar = olcum.maddeler.filter((m) => m.rol === "Karar").length;
  assert.equal(olcum.maddeler.flatMap((m) => m.tasiyicilar).length, olcum.maddeler.length + 2 * karar,
    "nöbet bütün maddelerin başlığını ve bütün Kararların iki taşıyıcısını ölçmeli");
  const olculen = tasiyiciAyrismalari(olcum.maddeler);
  const yeni = olculen.filter((a) => !BILINEN_TASIYICI_AYRISMALARI.includes(a));
  const kapanan = BILINEN_TASIYICI_AYRISMALARI.filter((a) => !olculen.includes(a));
  assert.deepEqual(yeni, [], `taşıyıcı alan belge metninden ayrıştı: ${yeni.join(" · ")} — taşıyıcı, belge bloğundaki metnin aynısı olmalıdır (kanon dosyası başlığı · HTR-TASIYICI-MUTABAKAT-KORLUGU)`);
  assert.deepEqual(kapanan, [], `bilinen ayrışma kapandı: ${kapanan.join(" · ")} — kaydı BILINEN_TASIYICI_AYRISMALARI listesinden düşür`);
});

// ── HST-MTR-A02 · kanon sayımının tek kaydı ve tek nöbeti ─────────────────────
//   Kanonun dosya, Karar ve Kural sayısı bilinçle dondurulmuş bir insan kapısıdır
//   (HTR-KANON-SAYISI-BUYUMEYI-KILITLIYOR). Sayı yalnız src/kanon-tutarlilik.ts
//   içindeki KANON_SAYIMI kaydında yaşar. Aşağıdaki ilk sınama o kapının TEK sayı
//   nöbetidir: canlı kanonu kayıtla karşılaştırır ve ayrışmada artırma adımını
//   adıyla söyler. Ölçüm üreticileri sayı ayrıştığında hata fırlatmaz; kanonu
//   diskten sayar ve ayrışmayı bulgu olarak bildirir, böylece kanona madde eklemek
//   türetilmiş yüzlerin tazelenmesini kilitlemez. Öteki sınamalar sayıyı kendi
//   başına dondurmaz, canlı ölçümden okur. Fikstürler geçici kopyada koşar.

test("kanon sayımı nöbeti: canlı kanon tek sayım kaydıyla eşittir", () => {
  const bulgu = kanonSayimiBulgusu(kanonMaddeleriniOlc(KOK).sayim);
  if (bulgu !== undefined) assert.fail(bulgu);
});

test("HST-MTR-A02 sayım bulgusu kayda eşit ölçümde susar, ayrışan ölçümde artırma adımını adıyla söyler", () => {
  const madde = kanonMaddeSayisi(KANON_SAYIMI);
  assert.equal(kanonSayimiBulgusu({ ...KANON_SAYIMI, tekil: madde }), undefined);

  const buyumus = kanonSayimiBulgusu({ ...KANON_SAYIMI, kural: KANON_SAYIMI.kural + 1, tekil: madde + 1 });
  assert.ok(buyumus, "bir Kural eklenmiş ölçüm bulgu vermeli");
  assert.ok(buyumus.includes(`${madde + 1} madde`) && buyumus.includes(`${madde} madde`), `bulgu iki sayıyı da söylemeli: ${buyumus}`);
  assert.ok(buyumus.includes("artırma adımı") && buyumus.includes("KANON_SAYIMI") && buyumus.includes(KANON_SAYIMI_KAYDI),
    `bulgu artırma adımını kaydın adı ve yeriyle söylemeli: ${buyumus}`);

  const kucukmus = kanonSayimiBulgusu({ ...KANON_SAYIMI, karar: KANON_SAYIMI.karar - 1, tekil: madde - 1 });
  assert.ok(kucukmus?.includes("KANON_SAYIMI"), "bir Karar çıkarılmış ölçüm de bulgu vermeli");

  const yinelenen = kanonSayimiBulgusu({ ...KANON_SAYIMI, tekil: madde - 1 });
  assert.ok(yinelenen?.includes("yinelenen"), "sayı tutup kod yinelendiğinde bulgu yinelenen kodu söylemeli");
});

/** Fikstür maddesi; kod, canlı kanonda bulunmayan ilk `MIM-9x` kodundan seçilir ki fikstür kanonun içeriğinden bağımsız kalsın. */
function sayimFiksturuMaddesi(canliKodlar: ReadonlySet<string>): string {
  let sira = 90;
  while (canliKodlar.has(`MIM-${sira}`)) sira++;
  const kod = `MIM-${sira}`;
  return [
    "",
    "-->|",
    `### ${kod} · Sayım Fikstürü Maddesi [BİLGİ]`,
    "**Hüküm:** Bu madde yalnız sayım fikstüründe geçici kopyaya eklenir; dayanak: MIM-0; ilgili: [MIM-0].",
    "**Gerekçe:** Kanona bir madde eklendiğinde ölçüm üreticilerinin davranışını sınamak için kurulur.",
    `**Örnek:** \`${kod}\` yalnız geçici kopyada yaşar.`,
    "**Zorlama:** Zorlanmaz — sayım fikstürü.",
    "|<--",
    `Kural sayimFiksturuMaddesi( kod: ${kod},`,
    `       ne: "${kod} · Sayım Fikstürü Maddesi [BİLGİ]",`,
    "       otorite: anayasa, katman: niyet, kapsam: genel,",
    "       dayanak: MIM-0 )",
    "",
  ].join("\n");
}

/** Bu dosyanın açtığı sayım kopyaları; dosyanın son sınaması hepsinin silindiğini ölçer. */
const SAYIM_KOPYALARI: string[] = [];

/**
 * İki ölçüm üreticisinin okuduğu her girdiyi ve on altı kalıcı yüzü geçici köke kopyalar.
 * Kopyayı açan sınama onu `finally` bloğunda siler.
 */
function sayimKopyasi(): string {
  const sb = mkdtempSync(join(tmpdir(), "sarmal-sayim-"));
  SAYIM_KOPYALARI.push(sb);
  for (const dizin of ["yasa/kanon", "ogreti/ornek", "ogreti/sablon", "oz/siniflama"]) {
    cpSync(join(KOK, dizin), join(sb, dizin), { recursive: true });
  }
  for (const dosya of [
    "is/nitelik/goc/tani_yuzeyi_yonlendirme_matrisi.sar",
    "urun/cekirdek/src/tani-sicili.ts",
    ...BELGE_YUZU_HEDEFLERI.map((h) => h.yol),
  ]) {
    mkdirSync(dirname(join(sb, dosya)), { recursive: true });
    writeFileSync(join(sb, dosya), readFileSync(join(KOK, dosya)));
  }
  return sb;
}

test("HST-MTR-A02 kırmızı fikstür: kopyaya madde eklenince üreticiler hata fırlatmaz, kanonu sayar ve bulguyu bildirir", () => {
  const sb = sayimKopyasi();
  try { a02KopyadaSina(sb); } finally { rmSync(sb, { recursive: true, force: true }); }
});

/** A02 fikstürünün gövdesi; kopyanın silinmesi çağıranın `finally` bloğundadır. */
function a02KopyadaSina(sb: string): void {
  const canliMaddeler = kanonMaddeleriniOlc(KOK).maddeler;
  const canli = canliMaddeler.length;
  const madde = sayimFiksturuMaddesi(new Set(canliMaddeler.map((m) => m.kod)));
  writeFileSync(join(sb, "yasa/kanon/mim.sar"), readFileSync(join(sb, "yasa/kanon/mim.sar"), "utf8") + madde, "utf8");

  const olcum = kanonMaddeleriniOlc(sb);
  assert.equal(olcum.maddeler.length, canli + 1, "ölçüm eklenen maddeyi saymalı");
  assert.ok(kanonSayimiBulgusu(olcum.sayim)?.includes("artırma adımı"), "tek sayı nöbetinin karşılaştırması kopyada kırmızıya dönmeli");

  const tutarlilik = kanonTutarlilikMetni(sb);
  assert.ok(tutarlilik.includes(`| Kanon maddesi | ${kanonMaddeSayisi(KANON_SAYIMI)} tekil | ${canli + 1} | SAPMA |`),
    "kanon tutarlılık yüzü ayrışmayı ölçüm tablosunda SAPMA olarak göstermeli");
  assert.ok(tutarlilik.includes(`| Kanon sayımı kaydından ayrışma | ${canli + 1} / ${kanonMaddeSayisi(KANON_SAYIMI)} | AÇIK`),
    "kanon tutarlılık yüzü ayrışmayı çelişki raporunda açık bulgu olarak yazmalı");

  const belge = belgeYuzleriniUret(sb);
  assert.equal(belge.kanonMaddesi, canli + 1, "belge yüzleri kanonu diskten saymalı");
  assert.ok(belge.kanonSayimiBulgusu?.includes("artırma adımı"), "belge yüzü üreticisi ayrışmayı anlaşılır bir bulguyla bildirmeli");
  assert.ok(readFileSync(join(sb, "README.md"), "utf8").includes(`${canli + 1} tekil madde`),
    "kalıcı yüzler sayı kaydı beklenmeden tazelenebilmeli");
  assert.equal(kanonOlc(sb).sayim.tekil, canli + 1);
}

// ── HST-MTR-A12 · tanı kümesi sayımının tek kaydı ve tek nöbeti ───────────────
//   Tanı sicilinin kümeleri de bilinçle dondurulmuş bir insan kapısıdır; sayılar
//   yalnız src/kanon-tutarlilik.ts içindeki TANI_KUMESI_SAYIMI kaydında yaşar.
//   Üreticiler sicil kayıttan ayrıştığında hata fırlatmaz; ayrışan kümeyi adıyla
//   söyleyen bir bulgu yazar ve sicili kayda karşı ölçen tek nöbet aşağıdadır.
//   Kırmızı fikstür sicilin kendisine bir tanı ekler: çekirdeğin kaynak ağacı ve
//   üreticilerin okuduğu girdiler geçici köke kopyalanır, kopyadaki sicile bir kayıt
//   yazılır ve kopyanın modülleri yüklenir; böylece üreticiler canlı sicili değil
//   tanı eklenmiş sicili okur ve canlı ağaca hiçbir şey yazılmaz. Fikstür bundan
//   sonra artırma adımını kopyada uçtan uca izler (kayıt, matris, iki dilli metin ve
//   iki üretici), metin basamağı atlandığında katalog tamlık nöbetinin bilinçli olarak
//   devreye girdiğini ölçer ve kopyayı her koşunun sonunda siler.

test("tanı kümesi sayım nöbeti: canlı sicil tek sayım kaydıyla eşittir", () => {
  const snf = siniflamaOrtuMerge(siniflamaYukle(join(KOK, "oz/siniflama/kayit.json")), siniflamaOrtuYukle(KOK));
  const bulgu = taniKumesiSayimiBulgusu(taniKumesiniOlc(snf).sayim);
  if (bulgu !== undefined) assert.fail(bulgu);
});

test("HST-MTR-A12 sayım bulgusu kayda eşit ölçümde susar, ayrışan kümeyi ve bozulan değişmezi adıyla söyler", () => {
  const kayit = TANI_KUMESI_SAYIMI;
  const temiz: OlculenTaniKumesi = {
    ...kayit, canli: canliSicilSayisi(kayit), emekliCanli: [], borcCanliDegil: [], kirikHalef: [], yuz33: 1,
  };
  assert.equal(taniKumesiSayimiBulgusu(temiz), undefined);

  const buyumus = taniKumesiSayimiBulgusu({ ...temiz, yeni: { ...kayit.yeni, hata: kayit.yeni.hata + 1 }, canli: temiz.canli + 1 });
  assert.ok(buyumus, "bir hata tanısı eklenmiş ölçüm bulgu vermeli");
  assert.ok(buyumus.includes(`yeni küme ${yeniKumeSayisi(kayit) + 1} kimlik (${kayit.yeni.hata + 1} hata`)
    && buyumus.includes(`kayıt ise ${yeniKumeSayisi(kayit)} kimlik (${kayit.yeni.hata} hata`), `bulgu iki sayımı da söylemeli: ${buyumus}`);
  assert.ok(buyumus.includes("artırma adımı") && buyumus.includes("TANI_KUMESI_SAYIMI") && buyumus.includes(KANON_SAYIMI_KAYDI),
    `bulgu artırma adımını kaydın adı ve yeriyle söylemeli: ${buyumus}`);
  assert.ok(!buyumus.includes("önceki sabit küme") && !buyumus.includes("ayrık değil"), `bulgu yalnız ayrışan kümeyi söylemeli: ${buyumus}`);

  // Bir tanının düzeyi değişince küme büyümez, fakat dağılım kayıttan ayrışır.
  const terfi = taniKumesiSayimiBulgusu({ ...temiz, yeni: { ...kayit.yeni, hata: kayit.yeni.hata + 1, uyari: kayit.yeni.uyari - 1 } });
  assert.ok(terfi?.includes("yeni küme"), "düzey değişimi de bilinçli bir artırma adımı istemeli");

  // Emekliye ayrılan bir sabit kimlik iki kümeyi birden değiştirir; ikisi de adıyla söylenir.
  const emekliye = taniKumesiSayimiBulgusu({ ...temiz, onceki: kayit.onceki - 1, emekli: kayit.emekli + 1, canli: temiz.canli - 1 });
  assert.ok(emekliye?.includes("önceki sabit küme") && emekliye.includes("uygulanmış emekli küme") && !emekliye.includes("yeni küme"),
    `emekliye ayırma iki kümeyi adıyla söylemeli: ${emekliye}`);

  // Küme değişmezleri sayıdan ayrı bulgulardır ve bozulan kimliği adıyla söyler.
  const ayrikDegil = taniKumesiSayimiBulgusu({ ...temiz, canli: temiz.canli - 1 });
  assert.ok(ayrikDegil?.includes("ayrık değil") && !ayrikDegil.includes("artırma adımı"), `kesişen kümeler bulgu vermeli: ${ayrikDegil}`);
  assert.ok(taniKumesiSayimiBulgusu({ ...temiz, emekliCanli: ["durum-boyutu"] })?.includes("`durum-boyutu`"));
  assert.ok(taniKumesiSayimiBulgusu({ ...temiz, borcCanliDegil: ["derin-dal"] })?.includes("`derin-dal`"));
  assert.ok(taniKumesiSayimiBulgusu({ ...temiz, kirikHalef: ["faz-gecikti → mevsim-vadesi-geçti"] })?.includes("halefi kırık"));
  assert.ok(taniKumesiSayimiBulgusu({ ...temiz, yuz33: 0 })?.includes("YUZ-3.3"));
});

/** Tanının yüzeyini kaydeden matris; belge yüzleri yüzey sayılarını bu kayıttan okur. */
const MATRIS_KAYDI = "is/nitelik/goc/tani_yuzeyi_yonlendirme_matrisi.sar";

/**
 * Fikstür tanısı: yeni bir biçim tanısının benzeri, DIL-5.1 maddesine bağlı bir gözlem.
 * Kodu canlı sicilde bulunmayan ilk adaydan seçilir; böylece fikstür sicilin bugünkü
 * içeriğinden ve sicilin kayda eşit olup olmamasından bağımsız kalır.
 */
function fiksturKodu(canli: ReadonlySet<string>): string {
  let kod = "sayım-fikstürü-biçimi";
  for (let sira = 2; canli.has(kod); sira++) kod = `sayım-fikstürü-biçimi-${sira}`;
  return kod;
}

type KanonModulu = typeof import("../src/kanon-tutarlilik.ts");
type BelgeModulu = typeof import("../src/belge-yuzleri.ts");
type UlasmaModulu = typeof import("../src/yuzey-ulasma.ts");
type MetinModulu = typeof import("../src/tani-metinleri.ts");

/** Sicile tanı eklenmiş kopya ve kopyanın kaynak ağacından yüklenen modüller. */
interface TaniKopyasi {
  readonly sb: string;
  readonly kod: string;
  readonly kanon: KanonModulu;
  readonly belge: BelgeModulu;
  readonly ulasma: UlasmaModulu;
  readonly metinler: MetinModulu;
  /** Ekleme öncesindeki canlı sicilin ölçümü. */
  readonly once: OlculenTaniKumesi;
}

/**
 * Kopyanın modülleri kopyanın sicilini okur ve bir kez yüklenir: sonraki basamakların
 * kaynağa yazdıkları bu modüllere değil, her koşuda baştan yüklenen komut satırına yansır.
 * Kopya diske yazıldıktan sonra yükleme düşerse kopya burada silinir.
 */
async function taniEklenmisKopya(): Promise<TaniKopyasi> {
  const canliOlcum = taniKumesiniOlc(siniflamaOrtuMerge(siniflamaYukle(join(KOK, "oz/siniflama/kayit.json")), siniflamaOrtuYukle(KOK)));
  const kod = fiksturKodu(canliOlcum.canli);
  const sb = sayimKopyasi();
  try {
    cpSync(join(KOK, "urun/cekirdek/src"), join(sb, "urun/cekirdek/src"), { recursive: true });
    for (const dizin of ["oz/ceviri", "ogreti/bilgi"]) cpSync(join(KOK, dizin), join(sb, dizin), { recursive: true });
    cpSync(join(KOK, "urun/cekirdek/package.json"), join(sb, "urun/cekirdek/package.json"));
    const sicilYolu = join(sb, "urun/cekirdek/src/tani-sicili.ts");
    const sicil = readFileSync(sicilYolu, "utf8");
    const acilis = "export const YENI_TANI_KANONU: readonly YeniTaniKaydi[] = [\n";
    assert.equal(sicil.split(acilis).length - 1, 1, "fikstür yeni kümenin açılışını tek bir kez bulmalı");
    const satir = `  { kod: "${kod}", madde: "DIL-5.1", kanonDüzey: "bilgi", kapsam: "proje", uretici: "denetci.ts", kademe: "bilgi" },\n`;
    writeFileSync(sicilYolu, sicil.replace(acilis, () => acilis + satir), "utf8");
    const kaynak = pathToFileURL(join(sb, "urun/cekirdek/src/")).href;
    const kanon: KanonModulu = await import(`${kaynak}kanon-tutarlilik.ts`);
    const belge: BelgeModulu = await import(`${kaynak}belge-yuzleri.ts`);
    const ulasma: UlasmaModulu = await import(`${kaynak}yuzey-ulasma.ts`);
    const metinler: MetinModulu = await import(`${kaynak}tani-metinleri.ts`);
    return { sb, kod, kanon, belge, ulasma, metinler, once: canliOlcum.sayim };
  } catch (hata) {
    rmSync(sb, { recursive: true, force: true });
    throw hata;
  }
}

/** Kopyanın komut satırını koşturur; her koşu kopyanın kaynağını baştan yükler. */
const kopyaKomutu = (sb: string, komut: string) =>
  spawnSync(process.execPath, [join(sb, "urun/cekirdek/src/sarmal.ts"), komut, sb], { encoding: "utf8" });

/** Artırma adımının (1). basamağı: kopyadaki TANI_KUMESI_SAYIMI kaydını ölçülen sayıya çeker. */
function sayimKaydiniCek(sb: string, s: TaniKumesiSayimi): void {
  const yol = join(sb, KANON_SAYIMI_KAYDI);
  const kaynak = readFileSync(yol, "utf8");
  const desen = /export const TANI_KUMESI_SAYIMI: TaniKumesiSayimi = \{[\s\S]*?\n\};\n/g;
  assert.equal(kaynak.match(desen)?.length, 1, "kopyada sayım kaydı tek bir kez bulunmalı");
  writeFileSync(yol, kaynak.replace(desen, () => [
    "export const TANI_KUMESI_SAYIMI: TaniKumesiSayimi = {",
    `  yeni: { hata: ${s.yeni.hata}, uyari: ${s.yeni.uyari}, bilgi: ${s.yeni.bilgi} },`,
    `  onceki: ${s.onceki},`,
    `  siniflamaTurevli: ${s.siniflamaTurevli},`,
    `  emekli: ${s.emekli},`,
    `  emeklilikBorcu: ${s.emeklilikBorcu},`,
    "};",
    "",
  ].join("\n")), "utf8");
}

/** (2). basamak: metni olmayan her yeni tanının Türkçe ve İngilizce metnini kopyanın kataloglarına ekler. */
function metinleriEkle(sb: string, kodlar: readonly string[]): void {
  const yol = join(sb, "urun/cekirdek/src/tani-metinleri.ts");
  let kaynak = readFileSync(yol, "utf8");
  const kataloglar: ReadonlyArray<readonly [string, string, string]> = [
    ["export const TANI_METINLERI: Readonly<Record<string, TaniMetni>> = {\n",
      "Sayım fikstürünün geçici gözlemi.", "Fikstür kopyası sınamanın sonunda silinir. Örnek: `kademe: bilgi`"],
    ["export const TANI_METINLERI_EN: Readonly<Record<string, TaniMetni>> = {\n",
      "Temporary observation of the count fixture.", "The fixture copy is removed when the test ends."],
  ];
  for (const [acilis, mesaj, oneri] of kataloglar) {
    assert.equal(kaynak.split(acilis).length - 1, 1, `kopyada katalog açılışı tek bir kez bulunmalı: ${acilis.trim()}`);
    const girdiler = kodlar.map((kod) => `  "${kod}": { mesaj: () => "${mesaj}", oneri: () => "${oneri}" },\n`).join("");
    kaynak = kaynak.replace(acilis, () => acilis + girdiler);
  }
  writeFileSync(yol, kaynak, "utf8");
}

/**
 * (3). basamak: matris kaydının sicilden türeyen hanelerini kopyanın canlı ölçümüne çeker.
 * Desenler kaydın kendi sayı desenleridir (yuzey-ulasma.ts · SAYI_DESENLERI). Bilgi
 * düzeyinde doğan tanı Bildirimler hanesine düşer; Problems hanesi değişmez ve yüzey
 * hanelerinin toplamı sicil boyutunu verdiği için Bildirimler hanesi kalan sayıdır.
 * İlan granülündeki haneler sicille değişmez, çünkü ilan üretici granülünde yazılır.
 */
function matrisKaydiniTazele(sb: string, ozet: ReturnType<UlasmaModulu["yuzeyUlasmaOzeti"]>): { metin: string; bildirimler: number } {
  const yol = join(sb, MATRIS_KAYDI);
  let metin = readFileSync(yol, "utf8");
  const problems = Number(/^\| Problems \| (\d+) \|/m.exec(metin)?.[1]);
  assert.ok(Number.isInteger(problems), "matris kaydında Problems hanesi bulunamadı");
  const bildirimler = ozet.sicilToplami - problems - ozet.hatirlaticiKimlik;
  const hedefler: ReadonlyArray<readonly [RegExp, number]> = [
    [/^\| \*\*Toplam\*\* \| \*\*(\d+)\*\* \|/m, ozet.sicilToplami],
    [/sicilinde bugün \*\*(\d+)\*\* kimlik vardır/, ozet.sicilToplami],
    [/sicilin (\d+) kimliğinin tamamını tek yüzeye YÖNLENDİRİR/, ozet.sicilToplami],
    [/ettiği \*\*(\d+)\*\* kimlik ile ondan önce/, ozet.yeniKimlik],
    [/ondan önce yazılmış \*\*(\d+)\*\* kimlik/, ozet.oncekiKimlik],
    [/^\| Hatırlatıcılar \| (\d+) \|/m, ozet.hatirlaticiKimlik],
    [/Problems, (\d+) Hatırlatıcılar/, ozet.hatirlaticiKimlik],
    [/^\| Bildirimler \| (\d+) \|/m, bildirimler],
    [/Hatırlatıcılar ve (\d+) Bildirimler/, bildirimler],
  ];
  for (const [desen, deger] of hedefler) {
    assert.ok(desen.test(metin), `matris kaydında ${desen} bulunamadı`);
    metin = metin.replace(desen, (eslesen: string, sayi: string) => eslesen.replace(sayi, String(deger)));
  }
  writeFileSync(yol, metin, "utf8");
  return { metin, bildirimler };
}

/** Ölçüm tablosundaki yeni küme hücresi. */
const yeniDagilimi = (s: TaniKumesiSayimi): string =>
  `${yeniKumeSayisi(s)} (${s.yeni.hata} hata + ${s.yeni.uyari} uyarı + ${s.yeni.bilgi} bilgi)`;

/** İki üreticinin basabileceği bulguların ayırt edici başları. */
const TANI_KUMESI_BULGUSU = "Tanı kümesi sayımı kayıttan ayrıştı";
const YONLENDIRME_BULGUSU = "Yönlendirme matrisi kaydı canlı sicilden ayrıştı";

test("HST-MTR-A12 kırmızı fikstür: sicile tanı eklenir, artırma adımı izlenir ve iki üretici de yeşil kalır", async (t) => {
  const { sb, kod, kanon, belge, ulasma, metinler, once } = await taniEklenmisKopya();
  try {
    // Beklenen ölçüm canlı sicilin bir bilgi tanısı fazlasıdır; beklenen kayıt kopyanın
    // kaydıdır. İkisi canlı sicilden türediği için fikstür sicil kayda eşit olmasa da çalışır.
    const kayit = kanon.TANI_KUMESI_SAYIMI;
    const sonra: TaniKumesiSayimi = { ...once, yeni: { ...once.yeni, bilgi: once.yeni.bilgi + 1 } };
    const snf = siniflamaOrtuMerge(siniflamaYukle(join(sb, "oz/siniflama/kayit.json")), siniflamaOrtuYukle(sb));
    const olculen = kanon.taniKumesiniOlc(snf).sayim;
    assert.equal(yeniDagilimi(olculen), yeniDagilimi(sonra), "kopyanın sicili canlı sicilin bir bilgi tanısı fazlasını taşımalı");
    assert.notEqual(yeniDagilimi(sonra), yeniDagilimi(kayit), "fikstür kayıttan ayrışan bir sicil kurmalı");

    await t.test("adımdan önce: iki üretici de durmaz, ayrışan kümeyi ve bayat matris kaydını adıyla basar", () => {
      const komut = kopyaKomutu(sb, "kanon-tutarlilik-uret");
      assert.equal(komut.status, 0, `kanon tutarlılık komutu sicile eklenen bir tanı yüzünden durmamalı:\n${komut.stderr}`);
      assert.ok(komut.stdout.includes(`yeni küme ${yeniKumeSayisi(sonra)} kimlik`), `komut ayrışan kümeyi adıyla basmalı:\n${komut.stdout}`);

      let metin = "";
      assert.doesNotThrow(() => { metin = kanon.kanonTutarlilikMetni(sb); },
        "kanon tutarlılık üreticisi sicile eklenen bir tanı yüzünden durmamalı");
      assert.ok(metin.includes(`| Yeni tanı kümesi | ${yeniDagilimi(kayit)} | ${yeniDagilimi(sonra)} | SAPMA |`),
        "kanon tutarlılık yüzü ayrışan kümeyi ölçüm tablosunda SAPMA olarak göstermeli");
      assert.ok(metin.includes(`| Tanı kümesi sayımı kaydından ayrışma | ${once.canli + 1} / ${canliSicilSayisi(kayit)} | AÇIK`),
        "kanon tutarlılık yüzü ayrışmayı çelişki raporunda açık bulgu olarak yazmalı");

      const sonuc = kanon.kanonTutarlilikUret(sb);
      const bulgu = sonuc.taniKumesiBulgusu ?? "";
      assert.ok(bulgu.includes(`yeni küme ${yeniKumeSayisi(sonra)} kimlik`) && bulgu.includes(`kayıt ise ${yeniKumeSayisi(kayit)} kimlik`),
        `bulgu ayrışan kümeyi adıyla ve iki sayısıyla söylemeli: ${bulgu}`);
      assert.ok(bulgu.includes("artırma adımı") && bulgu.includes("TANI_KUMESI_SAYIMI") && bulgu.includes(KANON_SAYIMI_KAYDI),
        `bulgu artırma adımını kaydın adı ve yeriyle söylemeli: ${bulgu}`);
      if (once.onceki === kayit.onceki) assert.ok(!bulgu.includes("önceki sabit küme"), `bulgu yalnız ayrışan kümeyi söylemeli: ${bulgu}`);
      assert.equal(sonuc.yeni, yeniKumeSayisi(sonra), "üretici kümeyi sicilden saymalı");

      // Matris kaydı da sicilin gerisinde kalmıştır. Belge yüzleri yüzey sayılarını o
      // kayıttan okur; üretici durmaz, bayat kaydı adıyla ve artırma adımıyla söyler.
      let belgeSonucu: ReturnType<BelgeModulu["belgeYuzleriniUret"]> | undefined;
      assert.doesNotThrow(() => { belgeSonucu = belge.belgeYuzleriniUret(sb); },
        "belge yüzü üreticisi sicile eklenen bir tanı yüzünden durmamalı");
      assert.ok(belgeSonucu?.taniKumesiBulgusu?.includes(TANI_KUMESI_BULGUSU),
        "belge yüzü üreticisi ayrışan kümeyi anlaşılır bir bulguyla bildirmeli");
      const yonlendirme = belgeSonucu?.yonlendirmeBulgusu ?? "";
      assert.ok(yonlendirme.startsWith(YONLENDIRME_BULGUSU) && yonlendirme.includes(MATRIS_KAYDI)
        && yonlendirme.includes("toplam hanesi canlı ölçümle uyuşmuyor"), `belge yüzü üreticisi bayat matris kaydını adıyla söylemeli: ${yonlendirme}`);
      assert.ok(yonlendirme.includes(kanon.TANI_KUMESI_ARTIRMA_ADIMI), `bulgu artırma adımını söylemeli: ${yonlendirme}`);

      const belgeKomutu = kopyaKomutu(sb, "belge-yuzleri-uret");
      assert.equal(belgeKomutu.status, 0, `belge yüzü komutu sicile eklenen bir tanı yüzünden durmamalı:\n${belgeKomutu.stderr}`);
      assert.ok(belgeKomutu.stdout.includes(`⚠️ ${TANI_KUMESI_BULGUSU}`) && belgeKomutu.stdout.includes(`⚠️ ${YONLENDIRME_BULGUSU}`),
        `belge yüzü komutu iki bulguyu da basmalı:\n${belgeKomutu.stdout}`);
    });

    await t.test("adım izlenir; metin basamağı atlanırsa iki dilli katalog tamlık nöbeti bilinçli olarak devreye girer", () => {
      // (1) Sayım kaydı ölçülen sayıya çekilir.
      sayimKaydiniCek(sb, olculen);
      // (3) Matris kaydı tazelenir; kaydın nöbeti tazelemeden önce kırmızı, sonra yeşildir.
      const bayat = ulasma.matrisKayitSapmalari(readFileSync(join(sb, MATRIS_KAYDI), "utf8"), ulasma.yuzeyUlasmaOzeti());
      assert.ok(bayat.some((s) => s.startsWith("toplam hanesi canlı ölçümle uyuşmuyor")), `matris nöbeti tazelemeden önce kırmızı olmalı: ${bayat.join(" | ")}`);
      const { metin } = matrisKaydiniTazele(sb, ulasma.yuzeyUlasmaOzeti());
      assert.deepEqual(ulasma.matrisKayitSapmalari(metin, ulasma.yuzeyUlasmaOzeti()), [], "tazelenen matris kaydı kopyanın sicilinde nöbetten geçmeli");

      const kanonKomutu = kopyaKomutu(sb, "kanon-tutarlilik-uret");
      assert.equal(kanonKomutu.status, 0, `kanon tutarlılık komutu geçmeli:\n${kanonKomutu.stderr}`);
      assert.ok(!kanonKomutu.stdout.includes(TANI_KUMESI_BULGUSU), `kayıt çekilince tanı kümesi bulgusu susmalı:\n${kanonKomutu.stdout}`);

      // (2) atlandı: doğan tanının iki dilli metni yok. Bu bir sayı dondurması değil gerçek
      // bir tamlık nöbetidir ve gevşetilmez; üretici durur ve eksik basamağı adıyla söyler.
      const belgeKomutu = kopyaKomutu(sb, "belge-yuzleri-uret");
      assert.notEqual(belgeKomutu.status, 0, `metni yazılmamış tanı belge üretiminden geçmemeli:\n${belgeKomutu.stdout}`);
      assert.ok(belgeKomutu.stderr.includes("iki dilli tanı kataloğu") && belgeKomutu.stderr.includes("tani-metinleri.ts"),
        `durmanın nedeni iki dilli katalog tamlık nöbeti olmalı ve eksik basamağı söylemeli:\n${belgeKomutu.stderr}`);
    });

    await t.test("metinler de eklenince iki üretici bulgusuz geçer ve yüzler yeni sayıları taşır", () => {
      // (2) Metni olmayan yeni tanılar kopyanın sicilinden ölçülür; fikstür tanısı aralarındadır.
      const metinsiz = metinler.metinsizYeniTanilar();
      assert.ok(metinsiz.includes(kod), `fikstür tanısı metinsiz yeni tanılar arasında olmalı: ${metinsiz.join(", ")}`);
      metinleriEkle(sb, metinsiz);
      // (4) mühür basamağı kopyada sınanmaz: mühür nöbeti canlı ağaçta koşar (turetilmis-yuz-nobetleri.test.ts)
      // ve adımın mühürlü her kaynağı adıyla saydığını aşağıdaki son alt sınama ölçer.
      // (5) İki üretici yeniden koşar.
      const belgeKomutu = kopyaKomutu(sb, "belge-yuzleri-uret");
      assert.equal(belgeKomutu.status, 0, `adım tamamlanınca belge yüzü komutu geçmeli:\n${belgeKomutu.stderr}`);
      assert.ok(!belgeKomutu.stdout.includes(TANI_KUMESI_BULGUSU) && !belgeKomutu.stdout.includes(YONLENDIRME_BULGUSU),
        `adım tamamlanınca belge yüzü komutu bulgusuz geçmeli:\n${belgeKomutu.stdout}`);
      const kanonKomutu = kopyaKomutu(sb, "kanon-tutarlilik-uret");
      assert.equal(kanonKomutu.status, 0, `adım tamamlanınca kanon tutarlılık komutu geçmeli:\n${kanonKomutu.stderr}`);
      assert.ok(!kanonKomutu.stdout.includes(TANI_KUMESI_BULGUSU), `adım tamamlanınca tanı kümesi bulgusu susmalı:\n${kanonKomutu.stdout}`);

      const matris = readFileSync(join(sb, MATRIS_KAYDI), "utf8");
      const bildirimler = Number(/^\| Bildirimler \| (\d+) \|/m.exec(matris)?.[1]);
      const readme = readFileSync(join(sb, "README.md"), "utf8");
      assert.ok(readme.includes(`ve ${olculen.yeni.bilgi} bilgi düzeyindedir`) && readme.includes(`ve ${bildirimler} Bildirimler (Gözlemler)`),
        "tazelenen yüz yeni kümenin ve matrisin yeni sayılarını taşımalı");
      const ikinci = kopyaKomutu(sb, "belge-yuzleri-uret");
      assert.ok(ikinci.status === 0 && ikinci.stdout.includes("📚 belge yüzleri: 0 değişti"),
        `ikinci koşu sıfır fark vermeli:\n${ikinci.stdout}\n${ikinci.stderr}`);
    });

    await t.test("artırma adımı izlenen her basamağı ve adımın değiştirdiği mühürlü her kaynağı adıyla sayar", () => {
      const adim = kanon.TANI_KUMESI_ARTIRMA_ADIMI;
      for (const parca of ["TANI_KUMESI_SAYIMI", "tani-metinleri.ts", "`Örnek:`", MATRIS_KAYDI, "turetilmis_yuz_nobetleri.sar", "kanon-tutarlilik-uret", "belge-yuzleri-uret"]) {
        assert.ok(adim.includes(parca), `artırma adımı "${parca}" basamağını saymalı: ${adim}`);
      }
      // Fikstürün yukarıda değiştirdiği dört kaynaktan nöbet kaydında mühürlü olanların her biri
      // mühür basamağında adıyla geçmelidir; yoksa adımı izleyen kişi mühür nöbetini kırmızı bırakır.
      const nobetKaydi = readFileSync(join(KOK, "is/nitelik/goc/turetilmis_yuz_nobetleri.sar"), "utf8");
      const muhurlu = new Set([...nobetKaydi.matchAll(/^\| `([^`]+)` \| `[0-9a-f]{64}` \|$/gm)].map((es) => es[1]));
      const degisen = ["urun/cekirdek/src/tani-sicili.ts", "urun/cekirdek/src/tani-metinleri.ts", KANON_SAYIMI_KAYDI, MATRIS_KAYDI];
      const anilmayan = degisen.filter((yol) => muhurlu.has(yol) && !adim.includes(`${yol} mührünü`));
      assert.deepEqual(anilmayan, [], `artırma adımının mühür basamağı bu kaynakları anmalı: ${anilmayan.join(", ")}`);
      assert.ok(degisen.some((yol) => muhurlu.has(yol)), "nöbet kaydı adımın değiştirdiği en az bir kaynağı mühürlemeli");
    });
  } finally {
    rmSync(sb, { recursive: true, force: true });
  }
});

test("HST-MTR-A12 sayım kopyaları: dosyanın açtığı her geçici kopya sınamadan sonra silinmiştir", () => {
  assert.ok(SAYIM_KOPYALARI.length > 0, "bu sınama dosyanın sayım fikstürlerinden sonra koşmalıdır");
  const kalan = SAYIM_KOPYALARI.filter((yol) => existsSync(yol));
  assert.deepEqual(kalan, [], `silinmeden kalan sayım kopyaları: ${kalan.join(", ")}`);
});

import test from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { ayristir } from "../src/ayristirici.ts";
import { belirtecle } from "../src/belirtec.ts";
import { dizindenIndeks } from "../src/kimlik.ts";
import { kanonMaddeleriniOlc, kanonTutarlilikMetni } from "../src/kanon-tutarlilik.ts";
import type { Dugum } from "../src/sozdizim.ts";
import { siniflamaOrtuMerge, siniflamaOrtuYukle, siniflamaYukle } from "../src/siniflama.ts";
import {
  EMEKLI_TANI_KODLARI,
  EMEKLILIK_BORCU_TANI_KODLARI,
  ONCEKI_TANI_KODLARI,
  taniSicili,
  YENI_TANI_KANONU,
} from "../src/tani-sicili.ts";

const KOK = fileURLToPath(new URL("../../..", import.meta.url));
const KANON_SHA = [
  "dil.sar:b6fe0f82005439fcce5e328d7073d1d5c2d1e57202b28ff28da76802853e0693",
  "mim.sar:9d119d7ed6f524dd2298c72e35549181aaae2f38eb6f9486c5d1efc78b426964",
  "ogr.sar:ed91c13959ae35594b225b5fe066389fc20b10cbb43f888bb563c02e72cd0d67",
  "ork.sar:60629957058a2b7e640d57c80c825c3492111ef3dc403f7809483562e184e6d3",
  "str.sar:2146dd7647c0d06738de30e4e73ce0c38b0019ad9ca5aeb9b4e75e767635784e",
  "tip.sar:0e5fa04456c462c749b98cc08058b9880597737b434e411aa32e12cb97b43a41",
  "yas.sar:23891b7c396bcff3dc35b2f540a295efff91210f4a5ade67a10a29ae507ede40",
  "yuz.sar:060152cedb29d57100253abe26ae3e3f0e01d1492dcf26ab6286934e4cdf8857",
] as const;

test("resmi sekizli 162/162 maddeyi, örneği ve dört parçayı sabit SHA'larla taşır", () => {
  const olcum = kanonMaddeleriniOlc(KOK);
  // KPS-MHR-A01 (2026-09-11): MIM-3.4 Dosya Mühürleri Kural olarak doğdu (160 → 161).
  // KPS-CEL-A01 (2026-09-19 · Founder hükmü 2026-09-09): MIM-3.5 Anadizin ve Plan
  // Ayrılığı Kural olarak doğdu ve sarma sözleşmesi ÇalışmaAlanı için Faz iznini
  // bıraktı (161 → 162).
  assert.equal(olcum.maddeler.length, 162);
  assert.equal(new Set(olcum.maddeler.map((m) => m.kod)).size, 162);
  assert.deepEqual(
    { karar: olcum.maddeler.filter((m) => m.rol === "Karar").length, kural: olcum.maddeler.filter((m) => m.rol === "Kural").length },
    { karar: 38, kural: 124 },
  );
  assert.equal(olcum.maddeler.filter((m) => m.ornek === "—").length, 0);
  assert.equal(olcum.maddeler.filter((m) => !m.dortParcaTam).length, 0);
  assert.deepEqual(olcum.muhurler, KANON_SHA);
});

test("70 taban + beş gözlem + MIM-3.4, MIM-3.2 ve KPS-SIR-A01 tanıları 48/22/16 olarak 86'dır", () => {
  assert.equal(YENI_TANI_KANONU.length, 86);
  assert.equal(YENI_TANI_KANONU.filter((t) => t.kademe === "hata").length, 48);
  assert.equal(YENI_TANI_KANONU.filter((t) => t.kademe === "uyarı").length, 22);
  // Faz sırası ve Blok yapısı (KPS-SIR-A01 · Founder hükmü 2026-09-29): altı tanı
  // doğdu, `seçilemez-adım-yürütümü` bilgiden kanonun yazdığı uyarıya çıktı.
  assert.deepEqual(YENI_TANI_KANONU.filter((t) => ["MIM-1.2", "MIM-1.3", "MIM-1.6", "ORK-3.2"].includes(t.madde) && t.kod !== "projesiz-faz" && t.kod !== "adım-atomikliği")
    .map((t) => `${t.madde}:${t.kod}:${t.kademe}`), [
    "ORK-3.2:seçilemez-adım-yürütümü:uyarı",
    "MIM-1.2:ters-faz-bağımlılığı:hata", "MIM-1.2:erken-faz-işi:uyarı", "MIM-1.2:yabancı-faz-bağı:uyarı",
    "MIM-1.3:katmansız-blok:uyarı", "MIM-1.3:tek-adımlı-blok:bilgi", "MIM-1.6:adımsız-kapsayıcı:bilgi",
  ]);
  // MIM-3.2 Kitaplık kademesi (KPS-CEL-A01 · Founder hükmü 2026-09-09): kademe
  // atlandığında madde kendi kademesiyle, yani uyarı düzeyinde konuşur.
  assert.equal(YENI_TANI_KANONU.filter((t) => t.madde === "MIM-3.2" && t.kod === "kitaplıksız-kök" && t.kademe === "uyarı").length, 1);
  assert.equal(YENI_TANI_KANONU.filter((t) => t.kademe === "bilgi").length, 16);
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
  // KPS-SIR-A01: `planlanmamış-gövde` emekli oldu (101 → 100).
  assert.equal(ONCEKI_TANI_KODLARI.length, 100);
});

test("uygulanmış emekli ve canlı emeklilik borcu tam sicile karşı ayrıdır", () => {
  const snf = siniflamaOrtuMerge(
    siniflamaYukle(join(KOK, "oz/siniflama/kayit.json")),
    siniflamaOrtuYukle(KOK),
  );
  const canli = taniSicili(snf);
  // 2026-09-10 (KPS-MVS-A01 ikinci teslim): ORK-8 mühür bekçisiyle canlı sicil yüz seksen dörtten yüz seksen beşe çıktı.
  // 2026-09-11 (KPS-MHR-A01): MIM-3.4 dosya mühürlerinin üç tanısıyla yüz seksen sekize çıktı.
  // 2026-09-19 (KPS-FAZ-A02): MIM-1.2 projesiz Faz gözlemiyle yüz seksen dokuza çıktı.
  // 2026-09-19 (KPS-CEL-A01): MIM-3.2 Kitaplıksız kök gözlemiyle yüz doksana çıktı.
  // 2026-09-29 (KPS-SIR-A01): altı yeni tanı doğdu ve `planlanmamış-gövde` emekli oldu; yüz doksan beşe çıktı.
  assert.equal(canli.size, 195);
  assert.equal(EMEKLI_TANI_KODLARI.length, 16);
  assert.equal(EMEKLI_TANI_KODLARI.filter((kod) => canli.has(kod)).length, 0);
  assert.equal(EMEKLILIK_BORCU_TANI_KODLARI.length, 37);
  assert.equal(EMEKLILIK_BORCU_TANI_KODLARI.filter((kod) => canli.has(kod)).length, 37);
});

test("A03 türevi idempotenttir ve geneldurum'u hüküm kaynağı olarak okumaz", () => {
  const ilk = kanonTutarlilikMetni(KOK);
  const ikinci = kanonTutarlilikMetni(KOK);
  const uretici = readFileSync(join(KOK, "urun/cekirdek/src/kanon-tutarlilik.ts"), "utf8");
  assert.equal(ikinci, ilk);
  assert.match(ilk, /Resmi sonuç 162\/162 maddedir/);
  assert.match(ilk, /Faz sırası ile Blok yapısının altı tanısıyla 86 canlı yeni kimliğe ulaşır/);
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
  // 162 madde Hüküm satırında, 38 Karar düğümü makine-okur ikizinde birer liste taşır.
  assert.equal(listeler.filter((l) => l.tur === "Hüküm").length, 162);
  assert.equal(listeler.filter((l) => l.tur === "karar").length, 38);
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
  assert.equal(karsilastirilan, 38);
});

test("kırmızı fikstür: kopyada bir listeye çıplak bölüm adı geri konunca ilgili nöbeti yakalar", () => {
  const sb = mkdtempSync(join(tmpdir(), "sarmal-ilgili-"));
  cpSync(join(KOK, "yasa", "kanon"), join(sb, "yasa", "kanon"), { recursive: true });
  assert.deepEqual(ciplakUyelikler(sb), [], "temiz kopya yeşil başlamalı");
  const dil = join(sb, "yasa", "kanon", "dil.sar");
  writeFileSync(dil, readFileSync(dil, "utf8").replace("ilgili: [DIL-0,", "ilgili: [DIL,"), "utf8");
  assert.deepEqual(ciplakUyelikler(sb), ["dil.sar:12 DIL"], "çıplak ad geri konduğu hâlde nöbet kırmızıya düşmedi");
});

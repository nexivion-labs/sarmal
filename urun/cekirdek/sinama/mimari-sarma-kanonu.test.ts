// ═══════════════════════════════════════════════════════════════════════════
// mimari-sarma-kanonu.test.ts — 🍎 ORK-1.1 · Mimari Sarma nöbeti (KPS-KEN-A01)
//
//   Founder hükmü (2026-09-16): kapsama sınıfının ayrı yazılı kenarı kanondan
//   DÜŞÜRÜLMÜŞTÜR; ilişki iç içe sarma ile ondan türeyen `kapsayan` bağı olarak
//   yazılır. Buna karşılık ORK-1.1 KODU ile `mimari-bağı-ihlali` TANI ADI
//   korunur, çünkü tanı fiziksel sarma hiyerarşisinden üretilir ve motorda,
//   tanı sicilinde ve tanı metinlerinde hiçbir değişiklik gerekmemiştir.
//
//   Nöbet üç şeyi birlikte ölçer; üçü aynı hükmün üç yüzüdür:
//   ① Kanonun sekiz dosyasında çıplak kenar adı KALMAMIŞTIR.
//   ② ORK-1.1 kodu yerindedir ve kural düğümü `mimariSarma` adını taşır.
//   ③ `mimari-bağı-ihlali` tanı adı kanonun Zorlama satırında, canlı tanı
//      sicilinde (ORK-1.1 maddesine bağlı) ve iki dilin tanı metinlerinde
//      YERİNDE DURUR — ad düşerse motor ile kanon sessizce ayrışır.
//
//   Kırmızı fikstürler geçici bir kopyada koşar ve canlı ağaca YAZMAZ.
// ═══════════════════════════════════════════════════════════════════════════
import test from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { YENI_TANI_KANONU } from "../src/tani-sicili.ts";

const KOK = fileURLToPath(new URL("../../..", import.meta.url));
/** Düşürülen kenarın çıplak adı; kanonda hiçbir dosyada geçmemelidir. */
const DUSURULEN_KENAR = "mimariBağı";
/** Korunan tanı adı; kanonda, sicilde ve tanı metinlerinde yaşamalıdır. */
const KORUNAN_TANI = "mimari-bağı-ihlali";

/** Verilen kanon dizinindeki her `.sar` dosyasını `ad → içerik` olarak okur. */
function kanonDosyalari(kanonDizini: string): Map<string, string> {
  const sonuc = new Map<string, string>();
  for (const ad of readdirSync(kanonDizini).filter((a) => a.endsWith(".sar")).sort()) {
    sonuc.set(ad, readFileSync(join(kanonDizini, ad), "utf8"));
  }
  return sonuc;
}

/** Çıplak kenar adının geçtiği her yeri `dosya:satır` biçiminde döndürür. */
function ciplakKenarGecisleri(kanonDizini: string): string[] {
  const gecisler: string[] = [];
  for (const [ad, icerik] of kanonDosyalari(kanonDizini)) {
    icerik.split("\n").forEach((satir, i) => {
      if (satir.includes(DUSURULEN_KENAR)) gecisler.push(`${ad}:${i + 1}`);
    });
  }
  return gecisler;
}

/** Kanon kopyasını geçici bir dizine alır; mutasyon canlı ağaca dokunmaz. */
function kanonKopyasi(): string {
  const sb = mkdtempSync(join(tmpdir(), "sarmal-mimari-sarma-"));
  cpSync(join(KOK, "yasa", "kanon"), join(sb, "yasa", "kanon"), { recursive: true });
  return join(sb, "yasa", "kanon");
}

test("① kanonda çıplak `mimariBağı` kenar adı kalmamıştır", () => {
  assert.deepEqual(ciplakKenarGecisleri(join(KOK, "yasa", "kanon")), [],
    "Founder hükmüyle düşürülen kenar adı kanona geri sızmış — ilişki iç içe sarma ve kapsayan bağıyla yazılır");
});

test("② ORK-1.1 kodu yerinde durur ve kural düğümü `mimariSarma` adını taşır", () => {
  const ork = kanonDosyalari(join(KOK, "yasa", "kanon")).get("ork.sar");
  assert.ok(ork, "ork.sar okunamadı");
  assert.match(ork, /^Kural mimariSarma\( kod: ORK-1\.1,$/m,
    "ORK-1.1 kural düğümü `mimariSarma` adıyla ilan edilmiş olmalı");
  assert.equal((ork.match(/kod: ORK-1\.1,/g) ?? []).length, 1,
    "ORK-1.1 kodu tam olarak bir kez ilan edilmeli — kod korunur, yalnız kenar adı düşer");
});

test("③ `mimari-bağı-ihlali` tanı adı kanonda, sicilde ve tanı metinlerinde yerindedir", () => {
  const ork = kanonDosyalari(join(KOK, "yasa", "kanon")).get("ork.sar") ?? "";
  assert.ok(ork.includes(`\`${KORUNAN_TANI}\``),
    "kanonun ORK-1.1 Zorlama satırı korunan tanı adını taşımalı");

  const sicilKaydi = YENI_TANI_KANONU.filter((t) => t.kod === KORUNAN_TANI);
  assert.equal(sicilKaydi.length, 1, "tanı sicilinde tam olarak bir kayıt bulunmalı");
  assert.equal(sicilKaydi[0].madde, "ORK-1.1", "tanı ORK-1.1 maddesine bağlı kalmalı");

  const metinler = readFileSync(join(KOK, "urun/cekirdek/src/tani-metinleri.ts"), "utf8");
  assert.equal((metinler.match(new RegExp(`"${KORUNAN_TANI}":`, "g")) ?? []).length, 2,
    "tanı metinleri iki dilde (tr + en) korunan adı taşımalı");
});

test("① kırmızı fikstür: kopyada kenar adı geri konunca nöbet yakalar", () => {
  const kanon = kanonKopyasi();
  assert.deepEqual(ciplakKenarGecisleri(kanon), [], "temiz kopya yeşil başlamalı");
  const ork = join(kanon, "ork.sar");
  writeFileSync(ork, readFileSync(ork, "utf8").replace(
    "**Hüküm:** Mimari kapsam yalnız iç içe sarmayla kurulur",
    "**Hüküm:** `mimariBağı` yalnız iç içe sarmayla kurulur"), "utf8");
  assert.deepEqual(ciplakKenarGecisleri(kanon), ["ork.sar:36"],
    "düşürülen kenar adı geri konduğu hâlde nöbet kırmızıya düşmedi");
});

test("③ kırmızı fikstür: kopyada tanı adı silinince Zorlama nöbeti yakalar", () => {
  const kanon = kanonKopyasi();
  const ork = join(kanon, "ork.sar");
  assert.ok(readFileSync(ork, "utf8").includes(`\`${KORUNAN_TANI}\``), "temiz kopya tanı adını taşımalı");
  writeFileSync(ork, readFileSync(ork, "utf8").replace(`\`${KORUNAN_TANI}\``, "`mimari-sarma-ihlali`"), "utf8");
  assert.ok(!readFileSync(ork, "utf8").includes(`\`${KORUNAN_TANI}\``),
    "tanı adı değiştirildiği hâlde nöbetin okuduğu metin değişmedi");
});

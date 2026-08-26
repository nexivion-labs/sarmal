// ═══════════════════════════════════════════════════════════════════════════
// yeni-kanon-tanilari.test.ts — 🧪 YENİ KANONUN ALTMIŞ DOKUZ TANISI
//
//   Motor turunun ikinci halkası altmış dokuz tanıyı üç üreticiye dağıttı. Bu
//   süit her tanının GERÇEKTEN üretildiğini fikstürle gösterir: sicile kaydedip
//   üreticisini yazmamak, motorun sessizce yalan söylemesi demektir.
//
//   Süitin sonundaki kapanış sınaması, altmış dokuz kimliğin tamamının bu
//   dosyada bir fikstürle karşılandığını doğrular — yeni bir tanı eklenip
//   fikstürü yazılmazsa süit kırmızıya döner.
// ═══════════════════════════════════════════════════════════════════════════
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { GIZLI_KOK_ADI } from "../src/kok-yuzeyi.ts";
import { belirtecle } from "../src/belirtec.ts";
import { ayristir } from "../src/ayristirici.ts";
import { dogrula, sekilDriftTanilari } from "../src/dogrulayici.ts";
import { kuralDenetle } from "../src/kuralci.ts";
import {
  kodIndeksle, rejimTanilari, omurgaTanilari, iliskiSinifiTanilari, authTanilari,
  sefAkisiTanilari, dilKanonTanilari, ogretimTanilari, stratejiTanilari,
  tipEvreniTanilari, terfiKanitiTanilari, yuzTanilari,
  onceliksizAdimTanilari, atesleyenHatirlaticiTanilari,
  type DiskAnlikGoruntu,
} from "../src/denetci.ts";
import { denetimKos, orkestrasyonTanilari } from "../src/denetim.ts";
import { YENI_TANI_KANONU, YENI_TANI_KODLARI } from "../src/tani-sicili.ts";
import { TANI_METINLERI, yapistirilabilirOrnekVar } from "../src/tani-metinleri.ts";
import { taksonomiMd } from "../src/siniflama.ts";
import type { Program } from "../src/sozdizim.ts";
import type { Siniflama } from "../src/siniflama.ts";
import type { Tani } from "../src/tani.ts";

const SNF_YOL = fileURLToPath(new URL("../../../oz/siniflama/kayit.json", import.meta.url));
const SNF: Siniflama = JSON.parse(readFileSync(SNF_YOL, "utf8"));

/** Fikstürde üretildiği kanıtlanan kimlikler — kapanış sınaması bunu sayar. */
const KANITLANAN = new Set<string>();

function ayr(kaynak: string): Program {
  return ayristir(belirtecle(kaynak));
}

function harita(girdiler: Record<string, string>): ReadonlyMap<string, Program> {
  return new Map(Object.entries(girdiler).map(([ad, k]) => [ad, ayr(k)]));
}

function bosDisk(yollar: string[] = []): DiskAnlikGoruntu {
  return { girdiler: yollar.map((y) => ({ yol: y, tur: "dosya" as const })) } as DiskAnlikGoruntu;
}

/**
 * Bir tanı listesinin kimliklerini okur. Üreticiler iki şekil döndürür: bazıları
 * çıplak `Tani` verir, bazıları ise tanıyı `{ dosya, tani }` zarfına sarar. Bu
 * ayrımı tek yerde çözmek gerekir, çünkü zarflı bir listeyi çağrı yerinde tekrar
 * daraltmaya kalkışmak tipi `never`'a düşürür: zarflı elemanda `tani` alanı her
 * zaman bulunduğundan çıplak dal hiç erişilemez hâle gelir. Birleşim tipi burada
 * ilan edildiği için iki dal da yaşar ve her iki şekil de güvenle okunur.
 */
function taniKodlari(tanilar: Array<Tani | { tani: Tani }>): string[] {
  return tanilar.map((t) => ("tani" in t ? t.tani.kod : t.kod));
}

/** Beklenen kimliğin üretildiğini doğrular ve kanıt defterine yazar. */
function uretildi(kod: string, tanilar: Array<Tani | { tani: Tani }>): void {
  const kodlar = taniKodlari(tanilar);
  assert.ok(kodlar.includes(kod),
    `"${kod}" fikstürde üretilmedi — üretilen kimlikler: ${[...new Set(kodlar)].join(" · ") || "hiçbiri"}`);
  KANITLANAN.add(kod);
}

// ══ A05 · TEK-DOSYA KAPSAMI (beş tanı) ══════════════════════════════════════

test("tek-dosya: ilgili üyeliği kanonik önek dışına çıkarsa ve yinelenirse yakalanır", () => {
  const kaynak = `Kural denemeKuralı( kod: DIL-9, ne: "deneme", ilgili: [ MIM, XYZ, MIM ] )\n`;
  uretildi("ilgili-önek-geçersiz", dogrula(ayr(kaynak), SNF, "fikstur.sar", kaynak));
});

test("tek-dosya: şemada ilan edilmemiş alan uyarı üretir", () => {
  const kaynak = `Adım( kod: ADM-FIK, ne: "iş", uydurmaAlan: "değer" )\n`;
  uretildi("şema-dışı-alan", dogrula(ayr(kaynak), SNF, "fikstur.sar", kaynak));
});

test("tek-dosya: görünürlük beyanı eksik ya da gizli yüzey koşulsuzsa yakalanır", () => {
  const kaynak = `Ekran( kod: EKR-FIK, görünürlük: gizli )\n`;
  uretildi("görünürlük-sözleşmesi-eksik", dogrula(ayr(kaynak), SNF, "fikstur.sar", kaynak));
});

test("tek-dosya: belge bloğunun şekli türetilmiş yüzde bozulursa yakalanır", () => {
  // Bu hüküm ancak biçimlendirici bozulduğunda sağlanır; nöbet arızayı kendisi kurar:
  // kaynakta belge bloğu vardır, türetilmiş yüzde satırları kaybolmuştur.
  const kaynak = `-->|\n# Başlık\n| sütun | değer |\n|<--\nAdım( kod: ADM-BLG, ne: "iş" )\n`;
  const bozukYuz = `-->|\n# Başlık\n|<--\nAdım( kod: ADM-BLG, ne: "iş" )\n`;
  uretildi("belge-şekil-drift", sekilDriftTanilari(kaynak, bozukYuz, "fikstur.sar"));
  // Sağlam biçimlendirme bulgu üretmez (yanlış pozitif nöbeti).
  assert.equal(sekilDriftTanilari(kaynak, kaynak, "fikstur.sar").length, 0);
});

test("tek-dosya: çok satırlı değerin içeriği türetilmiş yüzde değişirse yakalanır", () => {
  const kaynak = `Adım( kod: ADM-COK, ne: """\n  ilk satır\n  ikinci satır\n""" )\n`;
  const bozukYuz = `Adım( kod: ADM-COK, ne: """\n  ilk satır\n  DEĞİŞTİRİLMİŞ satır\n""" )\n`;
  uretildi("çok-satırlı-değer-drift", sekilDriftTanilari(kaynak, bozukYuz, "fikstur.sar"));
  assert.equal(sekilDriftTanilari(kaynak, kaynak, "fikstur.sar").length, 0);
});

// Gerçek boru hattı bu iki nöbeti biçimlendiricinin kendi çıktısıyla koşar:
// kaynak ile biçimli yüz arasındaki her fark aynı hükme düşer.
test("tek-dosya: sağlam kaynak gerçek boru hattında şekil bulgusu üretmez", () => {
  const kaynak = `-->|\n# Başlık\n|<--\nAdım( kod: ADM-TEMIZ, ne: "iş" )\n`;
  const t = dogrula(ayr(kaynak), SNF, "fikstur.sar", kaynak);
  assert.equal(t.filter((x) => x.kod === "belge-şekil-drift" || x.kod === "çok-satırlı-değer-drift").length, 0);
});

// ══ A06 · PROJE KAPSAMI (elli beş tanı) ═════════════════════════════════════

test("proje: rejim beyanı eksik, katı rejim normu ve geçiş uyumsuzluğu", () => {
  const beyansiz = rejimTanilari(harita({ "a.sar": `Proje( kod: PRJ-FIK )\n` }));
  uretildi("rejim-beyanı-eksik", beyansiz);

  const kati = rejimTanilari(harita({
    "b.sar": `Proje( kod: PRJ-KATI, rejim: katı ) {\n  Katman( kod: KAT-F, ad: "k" ) {\n    Adım( kod: ADM-F, ne: "iş" )\n  }\n  Katman( kod: KAT-G, ad: "g" ) {\n    AltKatman( kod: ALT-F, ad: "a" ) {\n      Adım( kod: ADM-G, ne: "iş" )\n    }\n  }\n}\n`,
  }));
  uretildi("katı-rejim-altkatman-eksik", kati);
  uretildi("rejim-geçiş-uyumsuzluğu", kati);
});

test("proje: omurga kökü, teknoloji tekilliği, atomiklik ve meyve hükümleri", () => {
  const programlar = harita({
    "kok.sar": `Proje( kod: PRJ-OMR, rejim: esnek ) {\n  Raf( kod: RAF-PLAN, yol: "plan/", ne: "ilanlı plan" )\n  Katman( kod: KAT-COK, ad: "k", kullanır: [ TEK-BIR, TEK-IKI ] ) {\n    Adım( kod: ADM-TAM, ne: "iş", durum: tamamlandı )\n  }\n}\n`,
    "plan/ilanli.sar": `Blok( kod: BLK-ILANLI ) {\n  Katman( kod: KAT-ILANLI, ad: "k" )\n}\n`,
    "kopuk.sar": `Blok( kod: BLK-KOPUK ) {\n  Katman( kod: KAT-KOPUK, ad: "k" )\n}\n`,
    "meyve.sar": `Meyve( kod: MYV-OKSUZ, tür: Kod )\n`,
  });
  const t = omurgaTanilari(programlar, kodIndeksle(programlar), bosDisk());
  uretildi("çok-teknolojili-katman", t);
  uretildi("adım-atomikliği", t);
  uretildi("proje-köksüz-üretim", t);
  uretildi("üretimsiz-meyve", t);
  uretildi("meyve-dosyası-eksik", t);
  assert.equal(t.filter((x) => x.dosya === "plan/ilanli.sar" && x.tani.kod === "proje-köksüz-üretim").length, 0);
  const terfiBulgu = t.find((x) => x.dosya === "kopuk.sar" && x.tani.kod === "proje-köksüz-üretim")!.tani;
  const a02Anligi = {
    kod: "proje-köksüz-üretim",
    mesaj: '"Blok" (BLK-KOPUK) üretken bir düğüm ama hiçbir Proje kökünün altında yaşamıyor. Kimlik, sahiplik ve tanı grubu Proje düğümünden türer; köksüz üretim bu üçünü de türetemez.',
    satir: 1,
    sutun: 1,
    oneri: "Üretken ağacı bir Proje kökünün altına al. Örnek: `ÇalışmaAlanı( kod: CAL-ANA ) { Proje( kod: PRJ-ANA, rejim: katı ) { Faz( kod: FAZ-ILK ) { … } } }` yerleşimini kur.",
    dilMetinleri: {
      tr: {
        mesaj: '"Blok" (BLK-KOPUK) üretken bir düğüm ama hiçbir Proje kökünün altında yaşamıyor. Kimlik, sahiplik ve tanı grubu Proje düğümünden türer; köksüz üretim bu üçünü de türetemez.',
        oneri: "Üretken ağacı bir Proje kökünün altına al. Örnek: `ÇalışmaAlanı( kod: CAL-ANA ) { Proje( kod: PRJ-ANA, rejim: katı ) { Faz( kod: FAZ-ILK ) { … } } }` yerleşimini kur.",
      },
      en: {
        mesaj: '"Blok" (BLK-KOPUK) is a productive node, but it does not live under any Proje root. Identity, ownership and diagnostic grouping derive from the Proje node; rootless production cannot derive any of the three.',
        oneri: "Place the productive tree under a Proje root. Example: create the `ÇalışmaAlanı( kod: CAL-ANA ) { Proje( kod: PRJ-ANA, rejim: katı ) { Faz( kod: FAZ-ILK ) { … } } }` structure.",
      },
    },
  };
  const { duzey: terfiDuzeyi, ...sabitAlanlar } = terfiBulgu;
  assert.deepEqual(sabitAlanlar, a02Anligi,
    "A05 aynı ihlalin kodunu, mesajını, önerisini ve konumunu değiştirmemelidir");
  assert.equal(terfiDuzeyi, "hata", "A05 kabulü aynı ihlali uyarı→hata yükseltmelidir");
});

test("proje: Kod düğümünün dosya beyanı Meyve ile aynı disk doğrulamasından geçer (V1B-KODMEYVE-A01)", () => {
  // Nöbet ÜRETİM yolunu ölçer: fikstür omurgaTanilari'dan geçirilir, kendi ikizi
  // yazılmaz. Dört ihlal biçimi ve üç meşru biçim birlikte ölçülür ki doğrulamanın
  // hem ateşlediği hem sustuğu yerler kanıtlansın.
  const programlar = harita({
    "kod.sar": [
      `Kod( kod: KOD-YOK, dosya: "src/boyle-bir-dosya-yok.ts", ne: "diskte karşılıksız beyan" )`,
      `Kod( kod: KOD-DISARI, dosya: "../disari.ts", ne: "kök dışına taşan beyan" )`,
      `Kod( kod: KOD-BOS, dosya: "", ne: "boş beyan" )`,
      `Kod( kod: KOD-ARTI, dosya: "src/var.ts + src/ikinci.ts", ne: "artı ile birleştirilmiş beyan tek yol olarak çözülmez" )`,
      `Kod( kod: KOD-VAR, dosya: "src/var.ts", ne: "diskte çözülen meşru beyan" )`,
      `Kod( kod: KOD-BEYANSIZ, ne: "dosyasız Kod bu turda muaftır — alanı zorunlu kılmak kanon hükmü ister" )`,
      `Kod( kod: KOD-KOR-NOKTA, dosya: "sablon/dongu.sar", ne: "YOKSAY klasörünün içeriği taramada yaşamaz; ölçülemeyen beyan suçlanmaz" )`,
      "",
    ].join("\n"),
  });
  const t = omurgaTanilari(programlar, kodIndeksle(programlar), bosDisk(["src/var.ts"]));
  const kodBulgulari = t.filter((x) => x.tani.kod === "meyve-dosyası-eksik");
  const kimlikler = kodBulgulari.map((x) => x.tani.mesaj.match(/Kod "([^"]+)"/)?.[1]).sort();
  assert.deepEqual(kimlikler, ["KOD-ARTI", "KOD-BOS", "KOD-DISARI", "KOD-YOK"],
    "dört ihlal ateşlemeli; meşru yol, beyansız düğüm ve kör-nokta yolu susmalıdır");
  uretildi("meyve-dosyası-eksik", kodBulgulari);
  // Cümle düğümü kendi adıyla anar ve iki dil hanesi birlikte dolar (Kod'a "Meyve" denmez).
  const yok = kodBulgulari.find((x) => x.tani.mesaj.includes("KOD-YOK"))!.tani;
  assert.equal(yok.duzey, "hata", "Kod beyanının düzeyi Meyve doğrulamasının düzeyiyle AYNI kalmalıdır");
  assert.ok(yok.dilMetinleri!.tr.mesaj.startsWith('Kod "KOD-YOK"'), "Türkçe cümle düğümü Kod adıyla anmalıdır");
  assert.ok(yok.dilMetinleri!.en.mesaj.startsWith('Kod "KOD-YOK"'), "İngilizce cümle düğümü Kod adıyla anmalıdır");
  assert.ok(yok.dilMetinleri!.tr.oneri!.includes("Kod( kod: KOD-YOK"), "Türkçe öneri Kod iskeleti taşımalıdır");
  assert.ok(yok.dilMetinleri!.en.oneri!.includes("Kod( kod: KOD-YOK"), "İngilizce öneri Kod iskeleti taşımalıdır");
});

test("proje: ilişki sınıfları, mimari bağı ve üretim kökeni", () => {
  const programlar = harita({
    "a.sar": `Proje( kod: PRJ-ILS, rejim: esnek ) {\n  Blok( kod: BLK-I ) {\n    Blok( kod: BLK-IC ) { }\n    Adım( kod: ADM-I, ne: "iş", üretir: [ ADM-J ], bağımlı: [ ADM-J, ADM-J ] )\n    Adım( kod: ADM-J, ne: "iş" )\n  }\n  Katman( kod: KAT-I, ad: "k", bağımlı: [ ADM-J ], sıra: "1" ) { }\n}\n`,
  });
  const t = iliskiSinifiTanilari(programlar, kodIndeksle(programlar));
  uretildi("ilişki-sınıfı-ihlali", t);
  uretildi("mimari-bağı-ihlali", t);
  uretildi("yürütme-kenarı-sözleşmesi", t);
  uretildi("üretim-kökeni-ihlali", t);
  uretildi("deterministik-sıra-ihlali", t);
});

test("yürütme kenarı: kapsayıcının ZEMİN bağı meşrudur, YÜRÜTME bağı ihlaldir", () => {
  // Kanonun iki hükmü birlikte okunur. MIM ve ORK, `katmansız-teknoloji` tanısıyla
  // Katman'ın teknoloji bağı taşımasını ZORUNLU kılar; ORK-1.2 ise `kapsayıcı-kenar`
  // ile yürütme sırasının Adım'da kurulmasını şart koşar. İkisi çelişmez çünkü iki
  // ayrı kenardan söz ederler — fakat ikisi de `bağımlı:` alanını kullanır, dolayısıyla
  // ayrımı yapabilecek tek ölçüt hedefin TİPİDİR.
  //
  // Ölçülmüş kusur (2026-07-29): kural hedefe hiç bakmadan ateşliyordu; canlı depoda
  // ürettiği yüz altmış altı bulgunun tamamı yanlış pozitifti — yüz on beşi Takım,
  // otuzu Teknoloji hedefliyordu. Motor kendi karşılama kartının öğrettiği deseni
  // ihlal sayıyordu.

  // ① MEŞRU ZEMİN: Katman teknolojiye ve takıma bağlanır — tanı ÜRETİLMEMELİ.
  const zemin = harita({
    "a.sar": `Proje( kod: PRJ-ZEMIN, rejim: esnek ) {\n  Blok( kod: BLK-Z ) {\n    Katman( kod: KAT-Z, ad: "arkayuz", bağımlı: [ TEK-Z, TAKIM-Z ] ) {\n      Adım( kod: ADM-Z, ne: "iş", durum: beklemede )\n    }\n  }\n}\n`,
    "tek.sar": `Teknoloji( kod: TEK-Z, ne: "t" )\nTakım( kod: TAKIM-Z, ne: "ekip" )\n`,
  });
  const tZemin = iliskiSinifiTanilari(zemin, kodIndeksle(zemin));
  const zeminKodlari = taniKodlari(tZemin);
  assert.ok(!zeminKodlari.includes("yürütme-kenarı-sözleşmesi"),
    `Katman'ın teknoloji/takım zemini ihlal sayıldı — kanon bu bağı ZORUNLU kılar. Üretilenler: ${[...new Set(zeminKodlari)].join(" · ") || "hiçbiri"}`);

  // ② GERÇEK İHLAL: Katman başka bir Adıma bağımlı — tanı ÜRETİLMELİ.
  const ihlal = harita({
    "a.sar": `Proje( kod: PRJ-IHLAL, rejim: esnek ) {\n  Blok( kod: BLK-I2 ) {\n    Katman( kod: KAT-I2, ad: "k", bağımlı: [ ADM-ONCE ] ) {\n      Adım( kod: ADM-SONRA, ne: "iş", durum: beklemede )\n    }\n    Adım( kod: ADM-ONCE, ne: "iş", durum: beklemede )\n  }\n}\n`,
  });
  uretildi("yürütme-kenarı-sözleşmesi", iliskiSinifiTanilari(ihlal, kodIndeksle(ihlal)));
});

test("proje: kullanır kenarı, çapraz Proje ad-alanı ve seçilebilir Adım", () => {
  const programlar = harita({
    "a.sar": `Proje( kod: PRJ-A, rejim: esnek, kullanır: TEK-YANLIS ) {\n  Adım( kod: ADM-A, ne: "iş", durum: geliştirmede, bağımlı: [ ADM-B ] )\n}\n`,
    "b.sar": `Proje( kod: PRJ-B, rejim: esnek ) {\n  Adım( kod: ADM-B, ne: "iş", durum: beklemede )\n}\n`,
    "tek.sar": `Teknoloji( kod: TEK-YANLIS, ne: "t" )\n`,
  });
  const t = iliskiSinifiTanilari(programlar, kodIndeksle(programlar));
  uretildi("kullanır-kenarı-ihlali", t);
  uretildi("çapraz-proje-ad-alanı", t);
  uretildi("seçilemez-adım-yürütümü", t);
});

test("proje: Döngü sonlanması ve Kapı kabul kanıtı", () => {
  const programlar = harita({
    "a.sar": `Proje( kod: PRJ-DNG, rejim: esnek ) {\n  Döngü( kod: DNG-F, tetik: koşul, koşar: YOK-BOYLE )\n  Kapı( kod: KPI-F )\n}\n`,
  });
  const t = iliskiSinifiTanilari(programlar, kodIndeksle(programlar));
  uretildi("döngü-sonlanması-eksik", t);
  uretildi("kapı-kabul-kanıtı-eksik", t);
});

test("proje: kimlik omurgası ve kurucu Projesinin ortak kimlik bağı", () => {
  const t = authTanilari(harita({
    "a.sar": `KimlikSağlayıcısı( kod: KMS-OKSUZ, tür: google )\nProje( kod: PRJ-KURUCU, rejim: katı, kurucu: "evet" )\n`,
  }));
  uretildi("auth-omurgası-ihlali", t);
  uretildi("founder-ortak-auth-eksik", t);
});

test("proje: iş bölümü, üretici-denetçi ayrılığı ve oturum sınırı", () => {
  const t = sefAkisiTanilari(harita({
    "a.sar": `Adım( kod: ADM-SEF, ne: "iş", durum: tamamlandı, üretici: "ETM-BIR", denetçi: "ETM-BIR", koşu: Koşum( kod: KSM-X, karar: "VERIFIED" ) )\nKoşum( kod: KSM-COK, adım: [ ADM-BIR, ADM-IKI ] )\n`,
  }));
  uretildi("üretici-denetçi-çakışması", t);
  uretildi("şef-akışı-ihlali", t);
  uretildi("oturum-adım-sınırı", t);
});

test("proje: dil, kenar tipi ve numara grafı hükümleri", () => {
  const kok = mkdtempSync(join(tmpdir(), "sarmal-dil-"));
  try {
    mkdirSync(join(kok, "yasa"), { recursive: true });
    writeFileSync(join(kok, "yasa", "hukum.md"), "**Hüküm:** elle yazılmış bağlayıcı metin.\n", "utf8");
    const programlar = harita({
      "a.sar": `Kural birinci( kod: DIL-1, ne: "b", dayanak: DIL-0, tanı: [ soz-dizim ] )\n`
        + `Kural ikinci( kod: DIL-1, ne: "i", dayanak: DIL-0 )\n`
        + `Kural ucuncu( kod: MIM-3, ne: "u", dayanak: DIL-0 )\n`
        + `Adım( kod: ADM-KNR, ne: "iş", tema: ADM-KNR )\n`,
    });
    const t = dilKanonTanilari(programlar, bosDisk(["yasa/hukum.md"]), kok);
    uretildi("kanonik-kaynak-biçimi", t);
    uretildi("orthografi-kaybı", t);
    uretildi("kenar-tip-uyuşmazlığı", t);
    uretildi("numara-grafı-uyumsuz", t);
    uretildi("madde-kodu-uyumsuz", t);
  } finally {
    rmSync(kok, { recursive: true, force: true });
  }
});

test("DIL-5.1 ve STR-1.1 regresyonu: ilk alt madde ile Karar taşıyıcısı yanlış pozitif üretmez", () => {
  const programlar = harita({
    "yasa/kanon/dil.sar": `Karar( kod: DIL-0, durum: kilitli, ne: "kök" )\n`
      + `Karar( kod: DIL-1, durum: kilitli, ne: "bölüm", karar: "Hüküm; dayanak: DIL-0; ilgili: [DIL]." )\n`
      + `Kural ilkAltMadde( kod: DIL-1.1, ne: "ilk çocuk", dayanak: DIL-1 )\n`,
  });
  const dilTanilari = dilKanonTanilari(programlar, bosDisk(), ".");
  const stratejiTanilariSonucu = stratejiTanilari(programlar, new Map(), kodIndeksle(programlar), ".");
  assert.equal(taniKodlari(dilTanilari).filter((kod) => kod === "madde-kodu-uyumsuz").length, 0);
  assert.equal(taniKodlari(stratejiTanilariSonucu).filter((kod) => kod === "kanon-kodu-uyumsuz").length, 0);
});

test("proje: öğretim kaynağı, başvuru sicili, bayatlık ve elle düzenleme", () => {
  const kok = mkdtempSync(join(tmpdir(), "sarmal-ogr-"));
  try {
    mkdirSync(join(kok, "ogrenme"), { recursive: true });
    writeFileSync(join(kok, "ogrenme", "ders.md"), "Bu adım zorunludur ve atlanamaz.\n", "utf8");
    writeFileSync(join(kok, "bayat.md"),
      "<!-- üretilmiştir: yok/olmayan.sar · mühür: abc123 -->\nmetin\n", "utf8");
    writeFileSync(join(kok, "elle.md"),
      "<!-- üretilmiştir: ogrenme/ders.md -->\n<!-- SARMAL:BOLGE -->\niçerik\n<!-- /SARMAL:BOLGE -->\nBu kural yasaktır.\n", "utf8");
    writeFileSync(join(kok, "basvuru.md"),
      "<!-- SARMAL:TAKSONOMI -->\neski içerik\n<!-- /SARMAL:TAKSONOMI -->\n", "utf8");
    const programlar = harita({
      "a.sar": `Beceri( kod: BCR-FIK, ne: "b" )\n`
        + `Bellek( kod: BLK-FIK, tür: ders, ne: "d", terfi: tamamlandı )\n`
        + `Adım( kod: ADM-OGR, ne: "iş", durum: tamamlandı ) {\n  Meyve( kod: MYV-KNN, tür: Kod, dosya: "yasa/kanon/dil.sar" )\n}\n`,
    });
    const t = ogretimTanilari(programlar, SNF, bosDisk(["ogrenme/ders.md", "bayat.md", "elle.md", "basvuru.md"]), kok);
    uretildi("öğretim-kaynak-drifti", t);
    uretildi("öğretim-bayat", t);
    uretildi("üretilmiş-öğretim-değiştirilmiş", t);
    uretildi("başvuru-sicil-drifti", t);
    uretildi("beceri-kartı-eksik", t);
    uretildi("kanıtsız-beceri-terfisi", t);
    uretildi("öğretim-etki-eksik", t);

    writeFileSync(join(kok, "basvuru-temiz.md"), taksonomiMd(SNF) + "\n", "utf8");
    const temiz = ogretimTanilari(new Map(), SNF, bosDisk(["basvuru-temiz.md"]), kok);
    assert.equal(temiz.filter((x) => x.tani.kod === "başvuru-sicil-drifti").length, 0,
      "üreticinin idempotent taksonomi bloğu kendi denetiminde drift sayılmamalıdır");
  } finally {
    rmSync(kok, { recursive: true, force: true });
  }
});

test("proje: strateji, göç sırası, sınır, bağımlılık ve ölü iz hükümleri", () => {
  const kok = mkdtempSync(join(tmpdir(), "sarmal-str-"));
  try {
    mkdirSync(join(kok, "urun", "cekirdek"), { recursive: true });
    writeFileSync(join(kok, "urun", "cekirdek", "package.json"),
      JSON.stringify({ name: "fikstur", dependencies: { "bir-paket": "^1.0.0" } }), "utf8");
    const programlar = harita({
      "yasa/kanon/dil.sar": `Karar( kod: DIL-0, durum: kilitli, ne: "kök" )\n`
        + `Kural sapma( kod: DIL-4, ne: "s", dayanak: DIL-3, model: "gpt-5 sürümüne bağlıdır" )\n`,
      "plan.sar": `Adım( kod: ADM-SPEC, ne: "iş", aşama: "spec", durum: geliştirmede )\n`
        + `Adım( kod: ADM-MTR, ne: "iş", aşama: "motor", durum: tamamlandı, koşu: "bitti" )\n`
        + `Adım( kod: ADM-YAY, ne: "iş", yayın: "v", durum: tamamlandı, koşu: "bitti" )\n`
        + `Karar( kod: KAR-EMEKLI, durum: emekli, ne: "eski" )\n`
        + `Adım( kod: ADM-CANLI, ne: "iş", referans: [ KAR-EMEKLI ] )\n`,
    });
    const hamlar = new Map<string, string>([
      ["yasa/kanon/dil.sar", "// K-51 eski karara atıf\nKarar( kod: DIL-0 )\n"],
      // Kapalı kökün adı fikstürde SABİT YAZILMAZ (GOC-A06): ad değişince bu fikstür
      // kırılmaz, körleşir — nöbet artık ihlal görmez ve sınama yeşil kalırken
      // hiçbir şey ölçmez. Ad motorun tek kaynağından okunur.
      ["plan.sar", `-->|\n${GIZLI_KOK_ADI}/plan/gecmis.sar değerlendirme girdisidir.\n|<--\n`
        + `Adım( kod: ADM-ANLATI, görev: "${GIZLI_KOK_ADI}/plan/hedef.sar ayrı tarafta yaşar" )\n`
        + `const yol = "${GIZLI_KOK_ADI}/gizli.sar";\n`],
    ]);
    const t = stratejiTanilari(programlar, hamlar, kodIndeksle(programlar), kok);
    uretildi("unutma-kapısı-ihlali", t);
    uretildi("kanon-kodu-uyumsuz", t);
    uretildi("göç-sırası-ihlali", t);
    uretildi("göç-kapısı-eksik", t);
    uretildi("açık-gizli-sınır-ihlali", t);
    uretildi("çekirdek-bağımlılık-drifti", t);
    uretildi("yürütücü-bağımlılığı", t);
    uretildi("etki-yayın-kapısı-eksik", t);
    uretildi("ölü-iz", t);
    assert.equal(t.filter((x) => x.tani.kod === "açık-gizli-sınır-ihlali").length, 1,
      "belge/anlatı atfı bağ değildir; yalnız yürütülebilir doğrudan erişim konuşmalıdır");
    const gizliKokTanilari = stratejiTanilari(programlar, hamlar, kodIndeksle(programlar), join("/tmp", GIZLI_KOK_ADI));
    assert.equal(gizliKokTanilari.filter((x) => x.tani.kod === "açık-gizli-sınır-ihlali").length, 0,
      "gizli ürünün kendi kökündeki öz-başvuruları açık→gizli bağ sayılmamalıdır");

    // Sınırın hangi yakasında olduğumuz KLASÖR ADINDAN değil, projenin KENDİ
    // beyanından da okunur (Founder hükmü 2026-08-26): kapalı ürün kendi deposuna
    // ayrıldığı gün adı artık yer tutucuyla eşleşmez ve nöbet onu kendi evinde
    // haksız yere suçlardı. Beyan `gizli` ise nöbet susar; beyan yoksa ya da
    // `açık` ise konuşmaya devam eder — sessiz varsayım nöbeti gevşetmez.
    const beyanliGizli = harita({
      "anadizin.sar": `Proje( kod: PRJ-GIZLI, ad: "kapali", rejim: katı, görünürlük: gizli, ne: "kapalı ürün" ) { }\n`,
    });
    const beyanliTanilar = stratejiTanilari(beyanliGizli, hamlar, kodIndeksle(beyanliGizli), kok);
    assert.equal(beyanliTanilar.filter((x) => x.tani.kod === "açık-gizli-sınır-ihlali").length, 0,
      "görünürlük: gizli beyan eden proje kendi evinde sınır ihlaliyle suçlanamaz");

    const beyanliAcik = harita({
      "anadizin.sar": `Proje( kod: PRJ-ACIK, ad: "acik", rejim: katı, görünürlük: açık, ne: "açık araç" ) { }\n`,
    });
    const acikTanilar = stratejiTanilari(beyanliAcik, hamlar, kodIndeksle(beyanliAcik), kok);
    assert.ok(acikTanilar.some((x) => x.tani.kod === "açık-gizli-sınır-ihlali"),
      "görünürlük: açık beyan eden projede nöbet susarsa gerçek sızıntı görünmez olur");
  } finally {
    rmSync(kok, { recursive: true, force: true });
  }
});

// (a) İÇERİK biçimli sızıntı: kapalı üründeki eşik envanterinden türeyen ikinci
//     dalga sabitleri açık taraftaki bir belgeye düz metin olarak düşerse nöbet
//     kırmızıya döner. Bu fikstür kapalı varlığın adını HİÇ anmaz; yol biçimli
//     nöbetin göremediği körlüğün kapandığını gösteren şey tam olarak budur.
//
//     FİKSTÜR SAYILARI UYDURMADIR (0.9/0.4 · 7): nöbetçi biçim tanıdığı için
//     sınama gerçek ayarlanmış değere ihtiyaç duymaz. Kapalı sabiti buraya
//     yazmak, sızıntıyı kapatan turun kendi süitinde sızıntı açması olurdu.
test("proje: sınır nöbeti içerik biçimli sızıntıyı belge yüzeyinde yakalar", () => {
  const kok = mkdtempSync(join(tmpdir(), "sarmal-sizinti-"));
  try {
    mkdirSync(join(kok, "plan"), { recursive: true });
    writeFileSync(join(kok, "plan", "yol.md"),
      "# Yol haritası\n"
      + "- Karar-motoru eşikleri — conf <0.9→eskale, <0.4→reject.\n"
      + "- Strateji-seçici — single/sequential/parallel/debate + fallback.\n"
      + "- Tetikleyici koreografisi — risk→debate→human-escalate + 7-özellikli risk.\n", "utf8");
    const programlar = harita({ "plan.sar": `Adım( kod: ADM-SIZ, ne: "iş" )\n` });
    const t = stratejiTanilari(programlar, new Map(), kodIndeksle(programlar), kok);
    const sinir = t.filter((x) => x.tani.kod === "açık-gizli-sınır-ihlali");
    assert.equal(sinir.length, 4,
      "dört ikinci-dalga izi de (karar eşiği · strateji kümesi · koreografi · risk özelliği) yakalanmalıdır");
    assert.ok(sinir.every((x) => x.dosya === "plan/yol.md"),
      "bulgu sızıntının yaşadığı belge dosyasını göstermelidir");
    assert.ok(sinir.some((x) => x.tani.satir === 2),
      "bulgu sızan satırı adreslemelidir");

    // Kapalı varlığın KENDİ kökünde aynı sabitler meşrudur: envanterin evi orasıdır.
    const gizliKok = stratejiTanilari(programlar, new Map(), kodIndeksle(programlar), join("/tmp", GIZLI_KOK_ADI));
    assert.equal(gizliKok.filter((x) => x.tani.kod === "açık-gizli-sınır-ihlali").length, 0,
      "kapalı ürün kendi eşik envanterini taşıdığı için kendi kökünde alarm üretilmez");
  } finally {
    rmSync(kok, { recursive: true, force: true });
  }
});

// (b) YANLIŞ ALARM YOK: açık kaynak minimal sürüm (birinci dalga · ZKA-A06 ajan
//     eşleyici puanlaması) Founder hükmüyle açık tarafta YAYIMLANIR. Nöbetçi bu
//     meşru sabitlerde susmalıdır. Sınama ayrımın gerçekten çalıştığını da ölçer:
//     aynı satır kaydı taşıyınca sessiz, kaydı kalkınca sesli olmalıdır — yoksa
//     "yanlış alarm yok" iddiası boş yere geçerdi.
test("proje: sınır nöbeti açık kaynak minimal sürümün meşru sabitlerinde susar", () => {
  const kok = mkdtempSync(join(tmpdir(), "sarmal-minimal-"));
  try {
    mkdirSync(join(kok, "plan"), { recursive: true });
    writeFileSync(join(kok, "plan", "minimal.md"),
      "# Açık kaynak minimal sürüm\n"
      + "- Ajan-matcher skorlama — `alan.30+dil.20+başarı.25+hız.10+hata.15`, eşik 0.80/0.60.\n"
      + "  Bu kalem birinci dalgadadır (ZKA-A06) ve taşınmaz.\n", "utf8");
    const programlar = harita({ "plan.sar": `Adım( kod: ADM-MIN, ne: "iş" )\n` });
    const t = stratejiTanilari(programlar, new Map(), kodIndeksle(programlar), kok);
    assert.equal(t.filter((x) => x.tani.kod === "açık-gizli-sınır-ihlali").length, 0,
      "eşleyici ağırlık vektörü ile kabul eşikleri açık kaynak minimal sürümün parçasıdır, sızıntı değildir");

    // VALF DARALTILDI (Founder hükmü 2026-08-05): muafiyet somut kaleme bağlıdır,
    // sihirli sözcüğe değil. Kapalı bir eşiği açık tarafa yazıp yanına iyi
    // niyetle "minimal sürüm" notu düşmek nöbetçiyi SUSTURMAZ; susturabilseydi
    // valf, bugün kapatılan kusurun aynısını başka kılıkta geri getirirdi.
    writeFileSync(join(kok, "plan", "minimal.md"),
      "# İbare taşısa da kapalı kalem sesli çıkar\n"
      + "- Karar eşiği conf <0.9→eskale, <0.4→reject — açık kaynak minimal sürüm kapsamındadır.\n", "utf8");
    assert.ok(
      stratejiTanilari(programlar, new Map(), kodIndeksle(programlar), kok)
        .filter((x) => x.tani.kod === "açık-gizli-sınır-ihlali").length > 0,
      "ibare yazmak kapalı kalemi muaf kıldı; kaçış valfi daraltılmamış");
    writeFileSync(join(kok, "plan", "minimal.md"),
      "# Kayıtsız ikiz\n"
      + "- Karar eşiği conf <0.9→eskale, <0.4→reject.\n", "utf8");
    assert.equal(
      stratejiTanilari(programlar, new Map(), kodIndeksle(programlar), kok)
        .filter((x) => x.tani.kod === "açık-gizli-sınır-ihlali").length, 1,
      "kaydı olmayan aynı sabit sızıntıdır; muafiyet satırı körü körüne geçirmemelidir");
  } finally {
    rmSync(kok, { recursive: true, force: true });
  }
});

test("proje: tip evreni, omurga tipleri, şema sözleşmesi ve katkılı örtü", () => {
  const eksikSnf: Siniflama = {
    ...SNF,
    widgetTipleri: [{ ad: "Adım", aile: "plan", ne: "iş" }, { ad: "Hayalet", aile: "yok-aile", ne: "t" }],
    semalar: {},
    izinliSarma: { "Adım": ["Bilinmeyen"] },
    zorunluKenarlar: {},
  };
  const t = tipEvreniTanilari(eksikSnf, { semalar: { "Adım": { zorunlu: ["kod"] } } }, "ana.sar");
  uretildi("tip-evreni-eksik", t);
  uretildi("omurga-tipi-eksik", t);
  uretildi("şema-tanımı-eksik", t);
  uretildi("örtü-ihlali", t);
});

test("proje: terfi kanıtı üç bağıyla birlikte istenir", () => {
  const t = terfiKanitiTanilari(harita({
    "a.sar": `Kural sertKural( kod: KUR-TRF, ne: "k", otorite: anayasa, katman: yapısal, kapsam: Adım, düzey: hata )\n`,
  }));
  uretildi("terfi-kanıtı-eksik", t);
});

test("proje: yüzey, prizma, ikiz, idempotans ve palet hükümleri", () => {
  const kok = mkdtempSync(join(tmpdir(), "sarmal-yuz-"));
  try {
    mkdirSync(join(kok, "urun", "eklenti", "src"), { recursive: true });
    writeFileSync(join(kok, "kaynak.sar"), `Adım( kod: ADM-Y, ne: "iş" )\n`, "utf8");
    writeFileSync(join(kok, "kaynak.json"), `{ "elle": true }\n`, "utf8");
    writeFileSync(join(kok, "kaynak.md"), "Bu hüküm zorunludur.\n", "utf8");
    writeFileSync(join(kok, "bolge.md"),
      "<!-- SARMAL:BOLGE -->\na\n<!-- /SARMAL:BOLGE -->\n<!-- SARMAL:BOLGE -->\nb\n<!-- /SARMAL:BOLGE -->\n", "utf8");
    writeFileSync(join(kok, "urun", "eklenti", "src", "yuz.ts"), `const t = { kod: "uydurma-yüzey-kodu" };\n`, "utf8");
    const programlar = harita({
      "a.sar": `Ekran( ne: "kimliksiz ekran" ) {\n  Metin( kod: MTN-Y, stil: "olmayan-rol", ne: "m" )\n}\n`,
    });
    const disk = bosDisk(["kaynak.sar", "kaynak.json", "kaynak.md", "bolge.md"]);
    const t = yuzTanilari(programlar, SNF, disk, kok);
    uretildi("prizma-kaynak-ayrışması", t);
    uretildi("eş-yetkili-yüz-ikizi", t);
    uretildi("yüz-idempotans-drifti", t);
    uretildi("geliştirme-yüzü-drifti", t);
    uretildi("yüzey-sözleşmesi-eksik", t);
    uretildi("palet-yüz-drifti", t);
  } finally {
    rmSync(kok, { recursive: true, force: true });
  }
});

// ══ A07 · KURAL VE ORKESTRASYON (dokuz tanı) ════════════════════════════════

test("kural: hüküm türü, sözleşme üçlüsü ve terfi kapısı", () => {
  const kaynak = `Karar( kod: KAR-KSL, durum: kilitli, ne: "k", koşul: sayı > 3 )\n`
    + `Kural eksikKural( kod: KUR-EKS, ne: "e" )\n`
    + `Kural terfiKuralı( kod: KUR-TER, ne: "t", otorite: anayasa, katman: yapısal, kapsam: Adım,\n`
    + `                   düzey: hata, tanı: [ orthografi-kaybı ] )\n`;
  const t = kuralDenetle(ayr(kaynak), SNF, "fikstur.sar");
  uretildi("hüküm-türü-uyumsuz", t);
  uretildi("kural-sözleşmesi-eksik", t);
  uretildi("tanı-terfi-kapısı-ihlali", t);
});

test("orkestrasyon: tanı sözleşmesi, kapsam, Proje kimliği ve yüz tutarlılığı", () => {
  const kok = mkdtempSync(join(tmpdir(), "sarmal-ork-"));
  try {
    writeFileSync(join(kok, "fikstur_anadizin.sar"),
      `-->|\n## Amaç\nFikstür.\n## Kapsam\nFikstür.\n## Sonuç\nFikstür.\n|<--\n`
      + `ÇalışmaAlanı( kod: CAL-FIK ) {\n`
      + `  Proje( kod: PRJ-BIR )\n`
      + `  Proje( kod: PRJ-IKI )\n`
      + `}\n`, "utf8");
    const sonuc = denetimKos(kok, { snfYol: SNF_YOL, bugun: "2026-07-27" });
    const tumu = sonuc.akis.flatMap((r) => r.tanilar);
    uretildi("proje-tanı-kimliği-uyumsuz", tumu);
    assert.equal(sonuc.atlananKapilar?.length ?? 0, 0,
      `zorunlu denetim kapısı düştü: ${(sonuc.atlananKapilar ?? []).join(" · ")}`);
  } finally {
    rmSync(kok, { recursive: true, force: true });
  }
});

test("YAS-3.3 regresyonu: örnek dünyasındaki Proje ürün kimliği sayımına girmez", () => {
  const kok = mkdtempSync(join(tmpdir(), "sarmal-ork-ornek-"));
  try {
    mkdirSync(join(kok, "ornek"), { recursive: true });
    writeFileSync(join(kok, "fikstur_anadizin.sar"),
      `Proje( kod: PRJ-URUN, rejim: esnek )\n`, "utf8");
    writeFileSync(join(kok, "ornek", "ders.sar"),
      `Proje( kod: PRJ-DERS, rejim: esnek )\n`, "utf8");
    const sonuc = denetimKos(kok, { snfYol: SNF_YOL, bugun: "2026-07-27" });
    const kimlikTanilari = sonuc.akis.flatMap((r) => r.tanilar)
      .filter((x) => x.kod === "proje-tanı-kimliği-uyumsuz");
    assert.equal(kimlikTanilari.length, 0);
  } finally {
    rmSync(kok, { recursive: true, force: true });
  }
});

test("orkestrasyon: sözleşme, kapsam karışması, yüz uyumsuzluğu ve tam yeşil hükmü", () => {
  // Bu beş hüküm ancak MOTOR bozulduğunda sağlanır; fikstür arızayı enjekte eder.
  const konum = { satir: 1, sutun: 1 };
  const t = orkestrasyonTanilari({
    uretilen: [
      // Önerisi olmayan ve sicilde bulunmayan tanı → sözleşme ihlali.
      { dosya: "a.sar", tani: { duzey: "uyarı", kod: "uydurma-kimlik", mesaj: "bulgu", satir: 1, sutun: 1 } },
      // Aynı kimlik iki ayrı düzeyde → yüzler arası bozulma.
      { dosya: "a.sar", tani: { duzey: "hata", kod: "rejim-beyanı-eksik", mesaj: "m", satir: 1, sutun: 1, oneri: "Örnek: yaz" } },
      { dosya: "b.sar", tani: { duzey: "bilgi", kod: "rejim-beyanı-eksik", mesaj: "m", satir: 1, sutun: 1, oneri: "Örnek: yaz" } },
      // Örneksiz öneri → öğretim yüzü düzeltmeyi öğretmiyor.
      { dosya: "c.sar", tani: { duzey: "bilgi", kod: "ölü-iz", mesaj: "m", satir: 1, sutun: 1, oneri: "bunu düzelt" } },
    ],
    // Tek-dosya kapsamındaki kimlik Proje kapısında üretilmiş → kapsam karışması.
    projeKapisi: [{ dosya: "a.sar", tani: { duzey: "bilgi", kod: "şema-dışı-alan", mesaj: "m", satir: 1, sutun: 1, oneri: "Örnek: yaz" } }],
    projeKodlari: new Set<string>(["PRJ-BIR"]),
    atlananKapilar: ["rejim"],
    sicil: new Set(YENI_TANI_KODLARI),
    anaEtiket: "ana.sar",
  });
  void konum;
  uretildi("tanı-sözleşmesi-uyumsuz", t);
  uretildi("tanı-kapsamı-karışması", t);
  uretildi("tanı-yüzü-uyumsuz", t);
  uretildi("öğretim-yüzü-uyumsuz", t);
  uretildi("sahte-tam-yeşil", t);
});

test("orkestrasyon: atlanan zorunlu kapı varken sonuç tam yeşil dönemez", () => {
  const temiz = orkestrasyonTanilari({
    uretilen: [], projeKapisi: [], projeKodlari: new Set<string>(),
    atlananKapilar: [], sicil: new Set(YENI_TANI_KODLARI), anaEtiket: "ana.sar",
  });
  assert.deepEqual(temiz, [], "temiz koşumda orkestrasyon hükmü bulgu üretmemeli");
});

test("orkestrasyon: tanı doğası yanlış sunum yüzeyine yönlendirilirse yakalanır (YUZ-3.3)", () => {
  // GOC-MOTOR-A08 · devredilen bulgu D-4: kanonun ilan ettiği YETMİŞİNCİ tanı.
  // Hüküm ancak bir YÖNLENDİRME TABLOSU varken konuşur; tablo verilmezse
  // yönlendirilmemiş bir tanının yanlış yüzeye düşmesi de mümkün değildir.
  const ortak = {
    projeKapisi: [], projeKodlari: new Set<string>(), atlananKapilar: [],
    sicil: new Set(YENI_TANI_KODLARI), anaEtiket: "ana.sar",
  };
  const uretilen = [
    // Drift doğası (uyarı) — Problems'a aittir, Bildirimler'e yönlendirilmiş.
    { dosya: "a.sar", tani: { duzey: "uyarı" as const, kod: "rejim-beyanı-eksik", mesaj: "m", satir: 1, sutun: 1, oneri: "Örnek: `rejim: katı` yaz." } },
    // İleri-bağlam doğası — Hatırlatıcılar'a aittir, Problems'a yönlendirilmiş.
    { dosya: "b.sar", tani: { duzey: "bilgi" as const, kod: "açık-hatırlatıcı", mesaj: "m", satir: 1, sutun: 1, oneri: "Örnek: `durum: tamamlandı` yaz." } },
  ];
  const karisik = orkestrasyonTanilari({
    ...ortak, uretilen,
    yuzeyAtamalari: new Map([["rejim-beyanı-eksik", "bildirimler" as const], ["açık-hatırlatıcı", "problems" as const]]),
  });
  uretildi("tanı-yüzeyi-karışması", karisik);
  assert.equal(karisik.filter((t) => t.tani.kod === "tanı-yüzeyi-karışması").length, 2,
    "iki ayrı doğa da yanlış yüzeye düşmüş — ikisi de bulgu vermeli");

  // Doğru yönlendirme SUSAR (yanlış-pozitif nöbeti).
  const dogru = orkestrasyonTanilari({
    ...ortak, uretilen,
    yuzeyAtamalari: new Map([["rejim-beyanı-eksik", "problems" as const], ["açık-hatırlatıcı", "hatırlatıcılar" as const]]),
  });
  assert.equal(dogru.filter((t) => t.tani.kod === "tanı-yüzeyi-karışması").length, 0,
    "doğru yönlendirilmiş tanı bulgu üretmemeli");

  // Tablo YOKSA hüküm susar — yapılmamış yönlendirme bozulmuş sayılamaz.
  assert.equal(orkestrasyonTanilari({ ...ortak, uretilen })
    .filter((t) => t.tani.kod === "tanı-yüzeyi-karışması").length, 0);
});

// ══ KAPANIŞ NÖBETİ ══════════════════════════════════════════════════════════

test("GOC-TERFI-A05: 46 kabul hatada, 16 kanon-uyarı uyarıda, on kimlik bilgide kalır", () => {
  // Sekizi GOC-TERFI-A05 turunun terfi REDDİ olan borçtur ve terfi ederse
  // burada yakalanır. İkisi 2026-08-22 tarihinde Founder onayıyla DOĞRUDAN
  // bilgi düzeyinde doğan gözlemlerdir: beyanın yokluğunu ve bekleyen işi
  // görünür kılarlar, düzeltilecek bir sapma bildirmezler.
  const borclar = [
    "adım-atomikliği", "beceri-kartı-eksik", "yürütme-kenarı-sözleşmesi",
    "üretim-kökeni-ihlali", "kullanır-kenarı-ihlali", "seçilemez-adım-yürütümü",
    "şema-dışı-alan", "terfi-kanıtı-eksik",
    "önceliksiz-adım", "ateşlemiş-hatırlatıcı",
  ].sort();
  const bilgide = YENI_TANI_KANONU.filter((k) => k.kademe === "bilgi").map((k) => k.kod).sort();
  const uyarida = YENI_TANI_KANONU.filter((k) => k.kademe === "uyarı");
  const hatada = YENI_TANI_KANONU.filter((k) => k.kademe === "hata");
  assert.deepEqual(bilgide, borclar, "sıfırdan büyük sayaçlı bir tanı yanlışlıkla terfi etmiş olabilir");
  assert.equal(hatada.length, 46, "Founder kabulündeki hata kümesi 46 tanı olmalıdır");
  assert.ok(hatada.every((k) => k.kanonDüzey === "hata"), "kanon hedefi hata olmayan tanı hataya çıkarılmış");
  assert.equal(uyarida.length, 16, "Founder hükmünde uyarıda kalan küme 16 tanı olmalıdır");
  assert.ok(uyarida.every((k) => k.kanonDüzey === "uyarı"), "kanon hedefi uyarı olmayan tanı uyarıda bırakılmış");
});

// ══ ORK-3.4 · ÖNCELİK BEYANI ve YUZ-3.4 · ATEŞLEMİŞ HATIRLATICI (2026-08-22) ══

test("proje: öncelik beyanı olmayan AÇIK Adım gözlem üretir, tamamlanmış olan üretmez", () => {
  const programlar = harita({
    "plan.sar":
      `Adım( kod: ADM-BEYANSIZ, durum: beklemede, ne: "iş" )\n` +
      `Adım( kod: ADM-BEYANLI, durum: geliştirmede, öncelik: p1, ne: "iş" )\n` +
      `Adım( kod: ADM-KAPALI, durum: tamamlandı, ne: "iş", koşu: "bitti" )\n`,
  });
  const t = onceliksizAdimTanilari(programlar);
  uretildi("önceliksiz-adım", t);
  assert.equal(t.length, 1, "bulgular kapsayıcıya göre gruplanmalı — dosya başına tek gözlem");
  assert.match(t[0].tani.mesaj, /ADM-BEYANSIZ/, "gözlem beyansız Adımı adıyla anmalı");
  assert.ok(!t[0].tani.mesaj.includes("ADM-KAPALI"),
    "tamamlanmış Adım gözleme girmiş — biten işin sıralaması artık anlam taşımaz");
  assert.ok(!t[0].tani.mesaj.includes("ADM-BEYANLI"), "beyanlı Adım gözleme girmiş");
});

test("proje: ders dünyası öncelik gözleminin DIŞINDADIR", () => {
  const programlar = harita({
    "ornek/ders.sar": `Adım( kod: ORN-BEYANSIZ, durum: beklemede, ne: "iş" )\n`,
    "sinama/fikstur.sar": `Adım( kod: SNM-BEYANSIZ, durum: beklemede, ne: "iş" )\n`,
  });
  assert.deepEqual(onceliksizAdimTanilari(programlar), [],
    "örnek ve sınama gövdeleri öğretim malzemesidir ve kasıtlı olarak eksik yazılabilir");
});

test("proje: hedefi tamamlanmış hatırlatıcı ATEŞLEMİŞ sayılır, uykudaki sayılmaz", () => {
  const programlar = harita({
    "plan.sar": `Adım( kod: ADM-BITEN, durum: tamamlandı, ne: "iş", koşu: "bitti" )\n`
      + `Adım( kod: ADM-SUREN, durum: beklemede, öncelik: p2, ne: "iş" )\n`,
    "oz/htr.sar":
      `Hatırlatıcı( kod: HTR-ATESLEYEN, durum: kararlaştı, hatırlat: ADM-BITEN, ne: "bekleyen iş" )\n` +
      `Hatırlatıcı( kod: HTR-UYKUDA, durum: açık, hatırlat: ADM-SUREN, ne: "henüz gelmedi" )\n` +
      `Hatırlatıcı( kod: HTR-KAPANMIS, durum: tamamlandı, hatırlat: ADM-BITEN, ne: "işi bitti" )\n`,
  });
  const t = atesleyenHatirlaticiTanilari(programlar);
  uretildi("ateşlemiş-hatırlatıcı", t);
  assert.equal(t.length, 1, "yalnız ateşleyen hatırlatıcı bildirilmeli");
  assert.match(t[0].tani.mesaj, /HTR-ATESLEYEN/);
  assert.match(t[0].tani.mesaj, /ADM-BITEN/, "gözlem hangi Adımın kapandığını söylemeli");
});

test("proje: ateşlemiş hatırlatıcı ölçütü GRAFTAN türetilir, serbest metinden değil", () => {
  // Dönüş tetikleyicisi cümlesi ne derse desin ölçüt hedefin durumudur; cümlenin
  // yorumlanması kimsenin doğrulayamayacağı bir karar üretirdi.
  const programlar = harita({
    "plan.sar": `Adım( kod: ADM-SUREN, durum: geliştirmede, öncelik: p1, ne: "iş", bağımlı: [], görev: "x", kabul: [ "y" ], referans: [ ADM-SUREN ], üretir: [ ] )\n`,
    "oz/htr.sar": `Hatırlatıcı( kod: HTR-METIN, durum: açık, hatırlat: ADM-SUREN, dönüşTetikleyici: "zamanı çoktan geldi", ne: "x" )\n`,
  });
  assert.deepEqual(atesleyenHatirlaticiTanilari(programlar), [],
    "serbest metin yorumlanmış — hedef Adım sürüyorken hatırlatıcı ateşlemiş sayılamaz");
});

test("kapanış: YETMİŞ kimliğin tamamı fikstürle kanıtlanmış olmalı", () => {
  const eksik = YENI_TANI_KODLARI.filter((k) => !KANITLANAN.has(k));
  assert.deepEqual(eksik, [],
    `fikstürle kanıtlanmamış tanı kimlikleri: ${eksik.join(" · ")}`);
});

// ══ YÜZLER ARASI UYUM · ÖNERİ ŞARTI ═════════════════════════════════════════

test("öneri şartı MAKİNEYLE tutulur: altmış dokuz önerinin tamamı yapıştırılabilir iskelet taşır", () => {
  const baglam = {
    kimlik: "PRJ-ANA", ad: "Ekran", kanonik: "kullanır", alan: "renk", tip: "Meyve",
    kod: "DIL-5", onerilen: "DIL-4", rol: "birincil", dosya: "yuz/okuma.md", tur: "Kod",
    uye: "XYZ", hedef: "KOD-X", kenar: "üretir", beklenen: "Meyve", iz: "eski-kimlik",
    kusur: "eksik", fark: 3, yer: "kenar", rejim: "katı", hedefler: "TEK-BIR · TEK-IKI",
    kaynak: "ADM-BIR", atif: "ESKI-1",
  };
  const iskeletsiz = Object.entries(TANI_METINLERI)
    .filter(([, v]) => !yapistirilabilirOrnekVar(v.oneri(baglam)))
    .map(([k]) => k);
  assert.deepEqual(iskeletsiz, [],
    `öneri yalnız tarif ediyor, düzeltmeyi göstermiyor: ${iskeletsiz.join(" · ")}`);
});

test("öneri şartı ölçüttür, beyan değil: düzyazı bir örnek cümlesi nöbetten GEÇEMEZ", () => {
  assert.equal(yapistirilabilirOrnekVar("Şunu düzelt. Örnek: alanı kaldır ve yeniden yaz."), false,
    "ters tırnaksız düzyazı örnek yapıştırılabilir sayılmamalı");
  assert.equal(yapistirilabilirOrnekVar("Şunu düzelt. Örnek: `kaldır`"), false,
    "yapısal jeton taşımayan kısa parça yapıştırılabilir sayılmamalı");
  assert.equal(yapistirilabilirOrnekVar("Şunu düzelt. Örnek: `rejim: katı` yaz."), true);
  assert.equal(yapistirilabilirOrnekVar("`rejim: katı` yaz."), false,
    "örnek işareti olmadan geçilmemeli");
});

/** MCP yüzünü GERÇEK süreç sınırından ölçer — modülü içe aktarmak sunucuyu başlatır. */
function mcpKimlikleri(kaynak: string): string[] {
  const mcpYol = fileURLToPath(new URL("../src/mcp.ts", import.meta.url));
  const istek = JSON.stringify({
    jsonrpc: "2.0", id: 1, method: "tools/call",
    params: { name: "denetle", arguments: { kaynak } },
  }) + "\n";
  const ham = execFileSync(process.execPath, [mcpYol], { input: istek, encoding: "utf8", timeout: 60_000 });
  const cevap = JSON.parse(ham.trim().split("\n").filter(Boolean).pop()!) as
    { result?: { content?: Array<{ text?: string }> } };
  const govde = cevap.result?.content?.[0]?.text ?? "";
  return [...new Set([...govde.matchAll(/\[([a-zçğıöşü][a-zçğıöşü0-9-]*)\]/g)].map((m) => m[1]))].sort();
}

// Şekil-drift fikstürü: eski karar defterinden izole edilmiş, sentetik KRR-*
// kimlikli köşe-durum (string içinde `///` jetonu + satır-belge bloğu birleşimi
// biçimli yüzde belge-bölgesi sayımını kaydırır). Defterin kendisi 2026-07-31
// tarihinde repo dışı arşive indi; bu parça tanıyı doğuran TEK bilinen canlı
// fikstürdür ve .txt uzantısı bilinçlidir — proje taramasına .sar olarak girmez.
const SEKIL_FIKSTUR_YOL = fileURLToPath(new URL("./fikstur-sekil-drift.txt", import.meta.url));

test("yüzler arası uyum: MCP yüzü çekirdek yüzüyle aynı kimlikleri verir", () => {
  // Şekil nöbetleri HAM kaynak ister. Ham kaynağı geçirmeyen bir yüzey bu
  // hükmü sessizce susturur ve bu hâl `tanı-yüzü-uyumsuz` hükmünün yasakladığı
  // durumdur. Ölçüm şekil bulgusu doğuran fikstürle yapılır.
  const kaynak = readFileSync(SEKIL_FIKSTUR_YOL, "utf8");
  // CLI ile düzenleyici yüzü aynı çekirdek yolunu çağırır ve ham kaynağı geçirir.
  const cekirdek = [...new Set(dogrula(ayr(kaynak), SNF, "fikstur-sekil-drift", kaynak).map((t) => t.kod))].sort();
  assert.deepEqual(mcpKimlikleri(kaynak), cekirdek,
    "MCP yüzü çekirdek yüzünden ayrışıyor: fikstur-sekil-drift");
});

test("yüzler arası uyum: şekil nöbetleri ÜÇ yüzeyde de görünür (D-7: adı kadar ölçer)", () => {
  const kaynak = readFileSync(SEKIL_FIKSTUR_YOL, "utf8");
  // ① çekirdek/CLI yüzü — sarmal.ts kabuğunun çağırdığı yol.
  const cekirdek = dogrula(ayr(kaynak), SNF, "dil_format.sar", kaynak).map((t) => t.kod);
  assert.ok(cekirdek.includes("belge-şekil-drift"), "çekirdek yüzü şekil bulgusunu vermeli");
  // ② MCP yüzü — gerçek süreç sınırından, JSON-RPC ile.
  assert.ok(mcpKimlikleri(kaynak).includes("belge-şekil-drift"), "MCP yüzü şekil bulgusunu vermeli");
  // ③ PROJE KAPISI yüzü — halka 2'de bu üçüncü yüz hiç ölçülmemişti; sınamanın
  //    adı "üç yüzey" derken gövdesi yalnız ikisini sayıyordu (devredilen D-7).
  const kok = mkdtempSync(join(tmpdir(), "sarmal-uc-yuz-"));
  try {
    writeFileSync(join(kok, "fikstur_anadizin.sar"),
      `-->|\n## Amaç\nFikstür.\n## Kapsam\nFikstür.\n## Sonuç\nFikstür.\n|<--\n`
      + `ÇalışmaAlanı( kod: CAL-UC ) { Proje( kod: PRJ-UC, rejim: katı ) }\n`, "utf8");
    writeFileSync(join(kok, "sekil.sar"), kaynak, "utf8");
    const sonuc = denetimKos(kok, { snfYol: SNF_YOL, bugun: "2026-07-27" });
    const projeKodlari = sonuc.akis.flatMap((r) => r.tanilar.map((t) => t.kod));
    assert.ok(projeKodlari.includes("belge-şekil-drift"),
      `proje kapısı şekil bulgusunu vermeli — gelen: ${[...new Set(projeKodlari)].join(" · ")}`);
  } finally {
    rmSync(kok, { recursive: true, force: true });
  }
});

test("yüzler arası uyum: ham kaynağı geçirmeyen bir yüzey şekil nöbetlerini susturur", () => {
  // D-7 (devredilen bulgu): bu nöbetin eski fikstürü HER İKİ DALDA da sıfır tanı
  // üretiyordu ve iddia `0 >= 0`'a düşüyordu — nöbet hiçbir şey ölçmüyordu.
  // Fikstür artık GERÇEKTEN şekil bulgusu doğuran canlı bir kaynaktır ve iddia
  // eşitsizlik değil KİMLİK KÜMESİ farkıdır: ham metin geçilmezse iki şekil
  // hükmünün ikisi de yok olmalıdır, geçilirse ikisi de doğmalıdır.
  const kaynak = readFileSync(SEKIL_FIKSTUR_YOL, "utf8");
  const program = ayr(kaynak);
  const SEKIL = ["belge-şekil-drift", "çok-satırlı-değer-drift"];
  const hamsiz = new Set(dogrula(program, SNF, "uyum.sar").map((t) => t.kod));
  const hamli = new Set(dogrula(program, SNF, "uyum.sar", kaynak).map((t) => t.kod));
  const kazanilan = SEKIL.filter((k) => hamli.has(k));
  assert.ok(kazanilan.length > 0,
    "fikstür hiç şekil bulgusu doğurmuyor — nöbet yine boş küme üstünde koşuyor olurdu");
  for (const k of kazanilan)
    assert.ok(!hamsiz.has(k), `ham metin geçilmediği hâlde '${k}' üretildi — nöbet farkı ölçemiyor`);
});

// ── DEVREDİLEN BULGU D-6: nöbet DÖRT çağrı yerinin dördünü de kapsar ─────────
//   Halka 2 denetimi dört `dogrula()` çağrı yerini tek tek bozdu ve yalnız
//   `mcp.ts` mutasyonunda süitin kırmızıya döndüğünü ölçtü; öteki üçünde
//   regresyon GERÇEKTİ (CLI `belge-şekil-drift` bulgusunu kaybediyor, proje
//   kapısının şekil bulguları üçten sıfıra düşüyor) fakat süit sessiz kalıyordu.
//   Davranış nöbeti üç yüzeyi ölçer; bu YAPI nöbeti dördüncüyü (düzenleyici) de
//   kapsar ve dördünün her birinde mutasyonu kırmızıya çevirir.
test("D-6: ham kaynağı `dogrula()`'ya geçiren DÖRT çağrı yerinin dördü de korunur", () => {
  const cagriYerleri: ReadonlyArray<readonly [string, string]> = [
    ["cekirdek/src/denetim.ts", "../src/denetim.ts"],
    ["cekirdek/src/sarmal.ts", "../src/sarmal.ts"],
    ["cekirdek/src/mcp.ts", "../src/mcp.ts"],
    ["eklenti/src/eklenti.ts", "../../eklenti/src/eklenti.ts"],
  ];
  const eksik: string[] = [];
  for (const [ad, goreli] of cagriYerleri) {
    const kaynak = readFileSync(fileURLToPath(new URL(goreli, import.meta.url)), "utf8");
    // `dogrula(` çağrılarının argüman listesini kabaca çıkar ve DÖRDÜNCÜ
    // argümanın (ham metin) verilip verilmediğini say. Yorum satırları elenir.
    const cagrilar = [...kaynak.matchAll(/(?<!\w)dogrula\(([^;]*?)\)[,;\s\]]/g)]
      .map((m) => m[1])
      .filter((arg) => !/^\s*program,\s*snf\s*\)/.test(arg));
    const hamGeciren = cagrilar.filter((arg) => arg.split(",").length >= 4);
    if (!cagrilar.length) { eksik.push(`${ad}: hiç dogrula() çağrısı bulunamadı — nöbet kör kalmış`); continue; }
    if (!hamGeciren.length)
      eksik.push(`${ad}: dogrula() çağrısı ham kaynağı DÖRDÜNCÜ argüman olarak geçirmiyor — `
        + `bu yüzey 'belge-şekil-drift' ve 'çok-satırlı-değer-drift' hükümlerini susturur (YUZ-3.1 ihlali)`);
  }
  assert.deepEqual(eksik, [], eksik.join("\n"));
});

// `makro-dongu.ts:93` çağrısı BİLİNÇLİ olarak ham metin almaz ve bu nöbetin
// kapsamında değildir: iç döngü kullanıcı yüzü değildir, ayrıştırılmış ağaç
// üzerinden ilerler ve elinde dosyanın ham metni bulunmaz. Şekil hükümleri
// kullanıcıya görünen dört yüzeyde konuşur; iç döngüde sessizlikleri kayıp
// değildir. Bu cümle, halka 2 denetiminin B-1 kapanış şartının son maddesidir.

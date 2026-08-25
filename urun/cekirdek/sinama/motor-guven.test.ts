// ═══════════════════════════════════════════════════════════════════════════
// MDR-A04 bağ sınıflandırması: bu dosyadaki mesaj-metnine dokunan assert'ler ya kod-çıpalı ikincil kontroldür ya da bilinçli metin sözleşmesidir (nöbet); çıpasız tanı araması yasaktır. Tam döküm: nitelik/motor_tani_envanteri.sar (MDR-A04 bölümü).
// motor-guven.test.ts — 🛡️ TUR-2 MOTOR GÜVEN sınamaları (RF-T2-A01)
//
//   Terra'nın canlı deneyleri REGRESYON testine iner (reform sözleşmesi):
//   ① öz-bağımlılık artık HATA  ② yinelenen-parametre artık UYARI
//   (durum_devir çift-parametre vakası). Her senaryo teftişte SESSİZ geçen
//   gerçek bir deliğin kapanış kanıtıdır — bir daha sessiz geçemez.
// ═══════════════════════════════════════════════════════════════════════════
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { belirtecle } from "../src/belirtec.ts";
import { ayristir } from "../src/ayristirici.ts";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { dagKur, ozBagimlilikTanilari, kopukZincirTanilari, kayipKenarTanilari } from "../src/dag.ts";
import { dogrula } from "../src/dogrulayici.ts";
import { kodIndeksle, referansTanilari, teknolojisizYuzeyTanilari } from "../src/denetci.ts";
import { kuralDenetle } from "../src/kuralci.ts";
import { gecisSinifla, YEDEK_GECISLER } from "../src/durum.ts";
import { adimDurumYaz } from "../src/koniYaz.ts";
import { SABIT_TANI_KODLARI, YENI_TANI_KODLARI, YENI_TANI_KANONU, taniSicili, katlanmisAd, taniKodCoz, terfiKapisiKusurlari } from "../src/tani-sicili.ts";
import { metinsizYeniTanilar, sicilsizTaniMetinleri } from "../src/tani-metinleri.ts";
import { orkestrasyonTanilari } from "../src/denetim.ts";
import { kurallariCikar } from "../src/kuralci.ts";
import { readdirSync } from "node:fs";
import type { Program } from "../src/sozdizim.ts";
import type { Siniflama } from "../src/siniflama.ts";

const SNF: Siniflama = JSON.parse(
  readFileSync(fileURLToPath(new URL("../../../oz/siniflama/kayit.json", import.meta.url)), "utf8"));

function parse(kaynak: string): Program {
  return ayristir(belirtecle(kaynak));
}

test("öz-bağımlılık: bağımlı [KENDİSİ] artık HATA — Terra deneyi sessiz geçemez", () => {
  const p = parse(`Blok( kod: BLK-T, ne: "t" ) {
  Katman( kod: KAT-T, ne: "k" ) {
    Adım( kod: A1, durum: beklemede, ne: "kendine bağımlı iş", bağımlı: [ A1 ] )
  }
}`);
  const dag = dagKur(new Map([["t.sar", p]]));
  const tanilar = ozBagimlilikTanilari(dag);
  assert.equal(tanilar.length, 1, "öz-kenar tanısız atlandı — Terra deliği geri açılmış");
  assert.equal(tanilar[0].tani.duzey, "hata");
  assert.equal(tanilar[0].tani.kod, "öz-bağımlılık");
  assert.ok(tanilar[0].tani.mesaj.includes("A1"));
});

test("öz-bağımlılık (dolaylı): Adım kendi kapsayıcısına bağımlı — genişleme kendini içerir", () => {
  const p = parse(`Blok( kod: BLK-T2, ne: "t" ) {
  Katman( kod: KAT-T2, ne: "k" ) {
    Adım( kod: B1, durum: beklemede, ne: "kendi bloğuna bağımlı", bağımlı: [ BLK-T2 ] )
  }
}`);
  const dag = dagKur(new Map([["t.sar", p]]));
  const tanilar = ozBagimlilikTanilari(dag);
  assert.equal(tanilar.length, 1);
  assert.ok(tanilar[0].tani.mesaj.includes("kapsayıcı"), "dolaylı öz-bağımlılık mesajı kapsayıcıyı söylemeli");
});

test("öz-bağımlılık: temiz kenar tanı ÜRETMEZ (yanlış-pozitif yok)", () => {
  const p = parse(`Blok( kod: BLK-T3, ne: "t" ) {
  Katman( kod: KAT-T3, ne: "k" ) {
    Adım( kod: C1, durum: tamamlandı, ne: "öncül iş", bağımlı: [] )
    Adım( kod: C2, durum: beklemede, ne: "ardıl iş", bağımlı: [ C1 ] )
  }
}`);
  const dag = dagKur(new Map([["t.sar", p]]));
  assert.equal(ozBagimlilikTanilari(dag).length, 0);
  assert.deepEqual(dag.dugumler.get("C2")?.oncekiler, ["C1"], "meşru kenar kurulmalı");
});

test("yinelenen-parametre: aynı düğümde ikinci aynı-adlı alan UYARI — durum_devir vakası", () => {
  const p = parse(`DurumKaydı( kod: DRM-T, tarih: "2026-07-12",
  neredeyiz: BIR,
  sıradaki: IKI,
  neredeyiz: BIR,
  sıradaki: IKI,
  ne: "çift-parametre vakası" )`);
  const tanilar = dogrula(p, SNF).filter((t) => t.kod === "yinelenen-parametre");
  assert.equal(tanilar.length, 2, "iki yinelenen alan iki uyarı üretmeli");
  assert.equal(tanilar[0].duzey, "uyarı");
  assert.ok(tanilar[0].oneri?.includes("satırda"), "öneri ilk yazımın satırını söylemeli");
});

test("yinelenen-parametre: parametre + gövde-özelliği AYNI alan da yakalanır (alanDeger dersi)", () => {
  const p = parse(`Blok( kod: BLK-T4, ne: "t" ) {
  Katman( kod: KAT-T4, ne: "k" ) {
    Adım( kod: D1, durum: beklemede, ne: "parametre" ) {
      ne: "gövdede ikinci kez"
    }
  }
}`);
  const tanilar = dogrula(p, SNF).filter((t) => t.kod === "yinelenen-parametre");
  assert.equal(tanilar.length, 1, "parametre∪özellik çifte yazımı yakalanmalı");
  assert.ok(tanilar[0].mesaj.includes('"ne"'));
});

test("kenar sicili: Düğme(çağırır: UC-YOK) artık KIRIK-REFERANS — Terra kaçağı kapandı", () => {
  const p = parse(`Ekran( kod: EKR-T, ne: "test ekranı" ) {
  Düğme( kod: DGM-T, ne: "kayıp uca giden düğme", çağırır: UC-YOK ) { }
  Düğme( kod: DGM-T2, ne: "kayıp ekrana giden düğme", gider: EKR-YOK ) { }
  Form( kod: FRM-T, ne: "kayıp uca gönderen form", gönderir: UC-YOK-2 ) { }
}`);
  const indeks = kodIndeksle(new Map([["t.sar", p]]));
  const kirik = referansTanilari(p, indeks, SNF).filter((t) => t.kod === "kırık-referans");
  const mesajlar = kirik.map((t) => t.mesaj).join(" | ");
  assert.ok(mesajlar.includes("çağırır: UC-YOK"), "çağırır hedefi çözücüden kaçıyor — Terra deliği geri açılmış");
  assert.ok(mesajlar.includes("gider: EKR-YOK"), "gider hedefi çözücüden kaçıyor");
  assert.ok(mesajlar.includes("gönderir: UC-YOK-2"), "gönderir hedefi çözücüden kaçıyor");
  assert.ok(kirik.every((t) => t.duzey === "hata"), "davranış kenarının kırık hedefi HATA olmalı");
});

test("kenar sicili: sözleşme + koşar hedefleri de çözücüde; ÇÖZÜLEN hedef tanı almaz", () => {
  const p = parse(`Sözleşme( kod: SZL-T, sürüm: "1.0", ne: "kontrat", istek: { a: metin }, yanıt: { b: metin } )
Uç( kod: UC-T, yol: "/t", sözleşme: SZL-T, ne: "çözülen sözleşme — tanısız" )
Uç( kod: UC-K, yol: "/k", sözleşme: SZL-YOK, ne: "kırık sözleşme" )
Döngü( kod: DNG-T, tetik: el, koşar: [ ADM-YOK ], turLimiti: 3, ne: "kırık koşar hedefi" )`);
  const indeks = kodIndeksle(new Map([["t.sar", p]]));
  const kirik = referansTanilari(p, indeks, SNF).filter((t) => t.kod === "kırık-referans");
  const mesajlar = kirik.map((t) => t.mesaj).join(" | ");
  assert.ok(mesajlar.includes("sözleşme: SZL-YOK"), "sözleşme hedefi çözücüden kaçıyor (ORK-2.3)");
  assert.ok(mesajlar.includes("koşar: ADM-YOK"), "koşar hedefi çözücüden kaçıyor (ORK-3.3)");
  assert.ok(!mesajlar.includes("SZL-T"), "çözülen sözleşme yanlış-pozitif almamalı");
});

test("kenar sicili kanonda: beş davranış kenarı kayıtlı; eylem BİLİNÇLİ dışarıda (serbest metin)", () => {
  const adlar = new Set(SNF.kenarTipleri.map((k: { ad: string }) => k.ad));
  for (const kenar of ["çağırır", "gider", "gönderir", "sözleşme", "koşar"])
    assert.ok(adlar.has(kenar), `'${kenar}' kenar sicilinde yok — Terra kaçağı geri açılır`);
  assert.ok(!adlar.has("eylem"), "eylem serbest-metin eylem adıdır — kenar sicline girerse vitrine yanlış-pozitif basar (kapi_kapsami beyanı)");
});

test("yinelenen-parametre: temiz düğüm uyarı almaz", () => {
  const p = parse(`Blok( kod: BLK-T5, ne: "t" ) {
  Katman( kod: KAT-T5, ne: "k" ) {
    Adım( kod: E1, durum: beklemede, ne: "temiz iş", bağımlı: [] )
  }
}`);
  assert.equal(dogrula(p, SNF).filter((t) => t.kod === "yinelenen-parametre").length, 0);
});

// ══ DURUM MAKİNESİ (Founder kilidi reform ③ — Terra 3. deneyi) ═══════════════

test("durum makinesi: geçiş sınıflandırması kilitli karardaki gibi", () => {
  assert.equal(gecisSinifla("bloklu", "tamamlandı"), "yasak", "bloklu→tamamlandı YASAK (kilit)");
  assert.equal(gecisSinifla("beklemede", "tamamlandı"), "meşru", "beklemede→tamamlandı SERBEST (panel tek-tık kilidi)");
  assert.equal(gecisSinifla("beklemede", "geliştirmede"), "meşru");
  assert.equal(gecisSinifla("geliştirmede", "tamamlandı"), "meşru");
  assert.equal(gecisSinifla("tamamlandı", "bloklu"), "meşru", "her durum → bloklu serbest");
  assert.equal(gecisSinifla("bloklu", "beklemede"), "meşru", "blokaj çözümü serbest");
  assert.equal(gecisSinifla("tamamlandı", "beklemede"), "bilgi", "geri-alma serbest ama BİLGİ notu");
  assert.equal(gecisSinifla("tamamlandı", "geliştirmede"), "bilgi");
  assert.equal(gecisSinifla(undefined, "geliştirmede"), "meşru", "ilk yazım serbest");
  assert.equal(gecisSinifla("beklemede", "beklemede"), "meşru", "aynı değere yazım nötr");
});

test("durum makinesi NÖBETİ: YEDEK_GECISLER kanonla BİREBİR (④-B9: farklı anahtar = ikinci gerçek)", () => {
  const kanon = JSON.parse(readFileSync(
    fileURLToPath(new URL("../../../oz/siniflama/kayit.json", import.meta.url)), "utf8")).durumGecisleri;
  assert.ok(kanon, "kanonda durumGecisleri yok — tablo KANONA yazılır (kilitli karar)");
  const { not: _n, ...kanonTablo } = kanon;
  assert.deepEqual(kanonTablo, YEDEK_GECISLER,
    "YEDEK_GECISLER kanondan sapmış — iki tablo BİREBİR tutulmalı (tek doğruluk kanon)");
});

test("durum makinesi: bloklu→tamamlandı YAZ-ANINDA reddedilir, dosyaya dokunulmaz — Terra 3. deneyi", () => {
  const dizin = mkdtempSync(join(tmpdir(), "sarmal-durum-"));
  const dosya = join(dizin, "plan.sar");
  const kaynak = `Blok( kod: BLK-DM, ne: "durum makinesi deneyi" ) {
  Katman( kod: KAT-DM, ne: "k" ) {
    Adım( kod: DM-A1, durum: bloklu, ne: "bloklu iş — bitmiş ilan edilemez", bağımlı: [] )
  }
}
`;
  writeFileSync(dosya, kaynak);
  const s = adimDurumYaz(dosya, "DM-A1", "tamamlandı");
  assert.equal(s.yazildi, false, "bloklu→tamamlandı YAZILDI — kilitli karar delindi!");
  assert.ok(s.sebep?.includes("YAZILAMAZ"), "RED sebebi yasak geçişi söylemeli");
  assert.equal(readFileSync(dosya, "utf8"), kaynak, "reddedilen yazım dosyayı DEĞİŞTİRMEMELİ");
});

test("durum makinesi: meşru geçişler yazılır — bloklu→beklemede (çözüm) + beklemede→tamamlandı (tek-tık)", () => {
  const dizin = mkdtempSync(join(tmpdir(), "sarmal-durum2-"));
  const dosya = join(dizin, "plan.sar");
  writeFileSync(dosya, `Blok( kod: BLK-DM2, ne: "t" ) {
  Katman( kod: KAT-DM2, ne: "k" ) {
    Adım( kod: DM-B1, durum: bloklu, ne: "blokajı çözülen iş", bağımlı: [] )
  }
}
`);
  const s1 = adimDurumYaz(dosya, "DM-B1", "beklemede");
  assert.equal(s1.yazildi, true, `bloklu→beklemede meşru — yazılmalıydı: ${s1.sebep}`);
  const s2 = adimDurumYaz(dosya, "DM-B1", "tamamlandı");
  assert.equal(s2.yazildi, true, `beklemede→tamamlandı SERBEST (panel tek-tık) — yazılmalıydı: ${s2.sebep}`);
  assert.ok(readFileSync(dosya, "utf8").includes("durum: tamamlandı"));
});

test("gayrimeşru-geçiş (statik): koşu BLOCKED + durum tamamlandı — elle yazım yakalanır", () => {
  const p = parse(`Blok( kod: BLK-GM, ne: "t" ) {
  Katman( kod: KAT-GM, ne: "k" ) {
    Adım( kod: GM-A1, durum: tamamlandı, ne: "motorun arkasından kapatılmış iş", bağımlı: [],
          koşu: Koşum( mühür: BLOCKED, karar: BLOCKED, kanıt: "güvenlik bulgusu açık", iterasyon: 2 ) )
  }
}`);
  const tanilar = dogrula(p, SNF).filter((t) => t.kod === "gayrimeşru-geçiş");
  assert.equal(tanilar.length, 1, "elle yazılmış bloklu→tamamlandı statik denetimden kaçıyor");
  assert.equal(tanilar[0].duzey, "uyarı");
});

test("koni-doluluk BİLGİ kapısı: geliştirmede-Adım üretir/referans boşsa bilgi tanısı (S3 kilidi)", () => {
  const p = parse(`Blok( kod: BLK-KN, ne: "t" ) {
  Katman( kod: KAT-KN, ne: "k" ) {
    Adım( kod: KN-A1, durum: geliştirmede, ne: "meyvesiz+dayanaksız aktif iş", bağımlı: [], görev: "bir şey yap", kabul: [ "yeşil" ] )
  }
}`);
  const tanilar = dogrula(p, SNF);
  const meyve = tanilar.filter((t) => t.kod === "meyvesiz-geliştirme");
  const ref = tanilar.filter((t) => t.kod === "referanssız-geliştirme");
  assert.equal(meyve.length, 1, "üretir boşken bilgi tanısı yok");
  assert.equal(ref.length, 1, "referans boşken bilgi tanısı yok");
  assert.ok(meyve[0].duzey === "bilgi" && ref[0].duzey === "bilgi", "S3 kilidi: düzey BİLGİ'yi aşamaz");
});

test("koni-doluluk kapısı: üretir+referans dolu geliştirmede-Adım tanı almaz; beklemede hiç almaz", () => {
  const p = parse(`Blok( kod: BLK-KN2, ne: "t" ) {
  Katman( kod: KAT-KN2, ne: "k" ) {
    Adım( kod: KN-B1, durum: geliştirmede, ne: "tam koni", bağımlı: [], görev: "g", kabul: [ "k" ],
          referans: [ KN-B2 ], üretir: KOD-KNB )
    Adım( kod: KN-B2, durum: beklemede, ne: "iskelet — bilgi kapısı beklemedeyi rahat bırakır" )
  }
}`);
  const tanilar = dogrula(p, SNF).filter((t) => t.kod === "meyvesiz-geliştirme" || t.kod === "referanssız-geliştirme");
  assert.equal(tanilar.length, 0, "yanlış-pozitif: dolu koni ya da beklemede Adım tanı aldı");
});

test("YAS-4 gayrimeşru-geçiş: koşu COMPLETED (kanıtsız teslim) + durum tamamlandı — elle terfi yakalanır", () => {
  const p = parse(`Blok( kod: BLK-GM3, ne: "t" ) {
  Katman( kod: KAT-GM3, ne: "k" ) {
    Adım( kod: GM-C1, durum: tamamlandı, ne: "kanıtsız teslimi elle kapatılmış iş", bağımlı: [],
          koşu: Koşum( mühür: COMPLETED, karar: COMPLETED, kanıt: "", iterasyon: 1 ) )
  }
}`);
  const tanilar = dogrula(p, SNF).filter((t) => t.kod === "gayrimeşru-geçiş");
  assert.equal(tanilar.length, 1, "elle yazılmış doğrulanmamış→tamamlandı statik denetimden kaçıyor");
  assert.match(tanilar[0].mesaj, /ilan edilemez/);
});

test("YAS-4 doğrulanmamış-çapa: kanıtsız teslim plan yüzeyinde uyarı rozetiyle görünür", () => {
  const p = parse(`Blok( kod: BLK-DG, ne: "t" ) {
  Katman( kod: KAT-DG, ne: "k" ) {
    Adım( kod: DG-A1, durum: doğrulanmamış, ne: "teslim edildi, kanıt bekliyor", bağımlı: [] )
  }
}`);
  const tanilar = dogrula(p, SNF);
  const capa = tanilar.filter((t) => t.kod === "doğrulanmamış-çapa");
  assert.equal(capa.length, 1);
  assert.equal(capa[0].duzey, "uyarı");
  assert.equal(tanilar.filter((t) => t.kod === "geçersiz-durum").length, 0, "doğrulanmamış artık geçerli enum değeri");
});

test("gayrimeşru-geçiş: VERIFIED koşulu tamamlandı Adım tanı ALMAZ (yanlış-pozitif yok)", () => {
  const p = parse(`Blok( kod: BLK-GM2, ne: "t" ) {
  Katman( kod: KAT-GM2, ne: "k" ) {
    Adım( kod: GM-B1, durum: tamamlandı, ne: "meşru kapanış", bağımlı: [],
          koşu: Koşum( mühür: VERIFIED, karar: VERIFIED, kanıt: "testler yeşil", iterasyon: 1 ) )
  }
}`);
  assert.equal(dogrula(p, SNF).filter((t) => t.kod === "gayrimeşru-geçiş").length, 0);
});

// ══ TANI-KENARI (RF-T6-A03 — "MOTORDA ✅" iddiasını makine doğrular) ═════════

// KÖK KAPISI MUAFİYETİ (KYN-MTR-A02 · denetçi gözlemi 2026-08-08). Yönerge ikizi
// nöbeti iki varlığın da ÜSTÜNDE, çalışma alanı kökünde çalışır ve hiçbir varlığın
// karnesine yazılmaz; kimliklerini varlık sicilinin evrenine sokmak onları ait
// olmadıkları bir sayıma katardı. Muafiyet meşrudur, fakat SESSİZ kalmamalıdır:
// tarayıcı kök kapısının kurucusunu da okur ve bulduğu her kimliği bu listede
// ADIYLA bekler. Böylece yarın kökte yeni bir kapı doğarsa, üreticisi muafiyeti
// bilinçli olarak yazmadıkça nöbet kırılır — muafiyet kararı görünür kalır.
// KYN-MTR-A04 · ikinci kök kapısı: kök yüzeyi nöbeti de iki varlığın üstünde
// çalışır ve bulgularını hiçbir varlığın karnesine yazmaz, dolayısıyla kimlikleri
// aynı muafiyetin kapsamındadır. Muafiyetin görünür kalması için tarayıcı bu
// kapının kurucusunu da okur; kurucu eklenmeseydi yeni kapı sessizce doğardı ve
// ilk kapının yazarının açıkça uyardığı kaçak gerçekleşirdi.
const KOK_KAPISI_MUAFLARI: readonly string[] = [
  "ikiz-ayrışması", "ikiz-eksik-dosya", "ikiz-tekil",
  "kök-yüzeyi-beyansız", "kök-yüzeyi-eksik-dosya", "kök-yüzeyi-evrensiz", "kök-yüzeyi-karşılıksız-atıf",
];

test("tanı-sicili NÖBETİ: SABIT_TANI_KODLARI kaynak taramasıyla BİREBİR (çift-kayıt yasağı)", () => {
  const srcDizin = fileURLToPath(new URL("../src", import.meta.url));
  const bulunan = new Set<string>();
  const kokKapisi = new Set<string>();
  const tara = (dizin: string): void => {
    for (const ad of readdirSync(dizin, { withFileTypes: true })) {
      const yol = join(dizin, ad.name);
      if (ad.isDirectory()) { tara(yol); continue; }
      if (!ad.name.endsWith(".ts") || ad.name === "gomulu-kanon.ts") continue;
      const kaynak = readFileSync(yol, "utf8");
      for (const m of kaynak.matchAll(/kod: "([a-zçğıöşü][a-zçğıöşü0-9-]*)"/g)) bulunan.add(m[1]);
      // CDL-A02: tanı cümlesi tek kaynağa taşındıktan sonra üretici, kimliği
      // `kod:` alanıyla değil kurucunun ilk argümanıyla söyler. Nöbetin ölçtüğü
      // şey değişmedi — "sicildeki her kimliğin kaynakta gerçek bir üreticisi
      // var mı?" sorusu aynı soru; yalnız üreticinin yazılışı değişti.
      for (const m of kaynak.matchAll(/eskiTani\("([a-zçğıöşü][a-zçğıöşü0-9-]*)"/g)) bulunan.add(m[1]);
      // üçlü-operatörle kurulan kodlar (gizli-bağımlılık ?: bağımlılık-mekanik deseni)
      for (const m of kaynak.matchAll(/kod: [A-Za-z.]+(?:\.length)? \? "([a-zçğıöşü][a-zçğıöşü0-9-]*)" : "([a-zçğıöşü][a-zçğıöşü0-9-]*)"/g)) {
        bulunan.add(m[1]); bulunan.add(m[2]);
      }
      // Kök kapısı kurucusu: kimlikleri sicile GİRMEZ, fakat tarayıcıya görünür
      // olmak zorundadır — görünmeyen muafiyet, muafiyet değil kaçaktır.
      for (const m of kaynak.matchAll(/ikizTanisi\(\s*"([a-zçğıöşü][a-zçğıöşü0-9-]*)"/g)) kokKapisi.add(m[1]);
      for (const m of kaynak.matchAll(/kokYuzeyiTanisi\(\s*"([a-zçğıöşü][a-zçğıöşü0-9-]*)"/g)) kokKapisi.add(m[1]);
    }
  };
  tara(srcDizin);

  // ① Kök kapısının bastığı her kimlik muafiyet listesinde ADIYLA bulunmalıdır.
  assert.deepEqual(
    [...kokKapisi].sort((a, b) => a.localeCompare(b, "tr")),
    [...KOK_KAPISI_MUAFLARI].sort((a, b) => a.localeCompare(b, "tr")),
    "çalışma alanı kökü kapısının tanı kimlikleri değişmiş — muafiyet listesini bilinçli olarak güncelle (tani-sicili.ts başlığındaki ② maddesi)",
  );
  // ② Muaf kimliklerin hiçbiri varlık siciline SIZMAMIŞ olmalıdır; muafiyet iki
  //    yönlüdür ve yanlışlıkla sicile eklenen bir kök kapısı kimliği de kusurdur.
  for (const kod of KOK_KAPISI_MUAFLARI) {
    assert.ok(!SABIT_TANI_KODLARI.includes(kod as never),
      `'${kod}' kök kapısı kimliğidir ve varlık siciline girmemelidir`);
  }

  const beklenen = [...bulunan].sort((a, b) => a.localeCompare(b, "tr"));
  const sicil = [...SABIT_TANI_KODLARI].sort((a, b) => a.localeCompare(b, "tr"));
  assert.deepEqual(sicil, beklenen,
    "SABIT_TANI_KODLARI kaynaktan sapmış — yeni tanı kodu eklendiyse sicile de ekle (tani-sicili.ts)");
});

// ══ ORTHOGRAFİ + KATLANMIŞ ARAMA ADI (GOC-MOTOR-A02 · Karar A) ══════════════

// GOC-MOTOR-A10 (2026-07-27): beşlinin biri (`faz-yaklaşıyor`) emekli edildiği
// için çift artık dörttür; emekli kimliğin İKİ yazımı da sicilde bulunmamalıdır
// ve bu ayrıca aşağıdaki emeklilik nöbetinde sınanır.
test("orthografi: dört diakritik kayıplı eski kimlik sicilde SIFIR, kanonik yazım TAM", () => {
  const sicil = taniSicili(SNF);
  const cift: ReadonlyArray<readonly [string, string]> = [
    ["bloklu-capa", "bloklu-çapa"],
    ["gelistirmede-capa", "geliştirmede-çapa"],
    ["soz-dizim", "söz-dizim"],
    ["tek-cocuk-kapsayici", "tek-çocuk-kapsayıcı"],
  ];
  for (const [eski, kanonik] of cift) {
    assert.ok(!sicil.has(eski), `eski yazım '${eski}' sicilde hâlâ yaşıyor — iki kimlik yasaktır`);
    assert.ok(sicil.has(kanonik), `kanonik yazım '${kanonik}' sicilde yok`);
  }
});

test("katlanmış arama adı: diakritiksiz girdi kanonik kimliğe çözülür, kanonik girdi kendine çözülür", () => {
  // Karar A ikinci parça: girdi iki yazımı da kabul eder, ÇIKTI hep kanoniktir.
  assert.equal(taniKodCoz("tek-cocuk-kapsayici", SNF), "tek-çocuk-kapsayıcı");
  assert.equal(taniKodCoz("tek-çocuk-kapsayıcı", SNF), "tek-çocuk-kapsayıcı");
  assert.equal(taniKodCoz("soz-dizim", SNF), "söz-dizim");
  assert.equal(taniKodCoz("gelistirmede-capa", SNF), "geliştirmede-çapa");
  assert.equal(taniKodCoz("bloklu-capa", SNF), "bloklu-çapa");
  // veri-güdümlü kimlik de çözülür (sicil birleştirmesi kullanılıyor)
  assert.equal(taniKodCoz("konisiz-adim", SNF), "konisiz-adım");
  // sicilde karşılığı olmayan girdi UYDURULMAZ
  assert.equal(taniKodCoz("olmayan-tani", SNF), undefined);
});

test("katlanmış arama adı: hiçbir iki kanonik kimlik aynı katlanmış ada düşmez (belirsizlik yok)", () => {
  const gorulen = new Map<string, string>();
  for (const kod of taniSicili(SNF)) {
    const katli = katlanmisAd(kod);
    const onceki = gorulen.get(katli);
    assert.equal(onceki, undefined,
      `'${kod}' ile '${onceki}' aynı katlanmış ada ('${katli}') düşüyor — katlama kimlik seçemez hâle gelir`);
    gorulen.set(katli, kod);
  }
});

test("tanı-sicili: kanonun veri-güdümlü tanıları da sicile girer (zorunluKenarlar)", () => {
  const sicil = taniSicili(SNF);
  for (const kod of ["konisiz-adım", "öksüz-düğme", "meyvesiz-geliştirme", "referanssız-geliştirme"])
    assert.ok(sicil.has(kod), `veri-güdümlü '${kod}' sicilde yok`);
  assert.ok(sicil.has("geçersiz-renk"), "sabit kod sicilde yok");
});

// ══ GENELKURAL/ÖZELKURAL MOTOR-VATANDAŞLIĞI (RF-T6-A04 — Founder: "neden uygulamadık?") ══

test("A04: GenelKural'ın koşulu Kural'la AYNI motorda değerlendirilir — kapsam varsayılanı genel", () => {
  const kaynak = (baslik: string) => `${baslik} {
  ne: "güven şart — vatandaşlık testi"
  ihlal: "güven eşiği sağlanmıyor"
  koşul: düğüm.güven >= 1
}
Karar( kod: KRR-V, karar: "deneme", gerekçe: "test", ne: "hedef düğüm", güven: 0 )`;
  // Kural (referans davranış — kapsam açık verilir):
  const kuralT = dogrula(parse(kaynak("Kural vatandas( kod: GK-T, katman: yapısal, kapsam: genel, düzey: uyarı )")), SNF)
    .filter((t) => t.kod === "kural-ihlali");
  // GenelKural (kapsam YAZILMADAN — varsayılan genel · widget biçimi):
  const genelT = dogrula(parse(kaynak("GenelKural( kod: GK-T, katman: yapısal, düzey: uyarı )")), SNF)
    .filter((t) => t.kod === "kural-ihlali");
  assert.ok(kuralT.length >= 1, "referans Kural ihlali üretmeliydi (güven 0 < 1)");
  assert.equal(genelT.length, kuralT.length,
    "GenelKural aynı koşulda Kural'dan FARKLI sonuç verdi — vatandaşlık eşdeğer değil");
  assert.ok(genelT[0].mesaj.includes("GK-T"));
});

test("A04: ÖzelKural hedef: dizini DIŞINDA eşleşmez, İÇİNDE eşleşir (kapsam farkı = tip farkı)", () => {
  const p = () => parse(`ÖzelKural( kod: OK-T, hedef: "eklenti/", katman: yapısal, kapsam: genel, düzey: uyarı ) {
  ne: "eklenti dizinine özel güven kuralı"
  ihlal: "güven eşiği sağlanmıyor"
  koşul: düğüm.güven >= 1
}
Karar( kod: KRR-O, karar: "deneme", gerekçe: "test", ne: "hedef düğüm", güven: 0 )`);
  const icinde = dogrula(p(), SNF, "eklenti/src/deneme.sar").filter((t) => t.kod === "kural-ihlali");
  const disinda = dogrula(p(), SNF, "cekirdek/src/deneme.sar").filter((t) => t.kod === "kural-ihlali");
  assert.ok(icinde.length >= 1, "hedef İÇİNDEKİ dosyada ÖzelKural değerlendirilmeliydi");
  assert.equal(disinda.length, 0, "hedef DIŞINDAKİ dosyada ÖzelKural değerlendirilmemeliydi");
});

test("A04: vitrin dalga1_yasa.sar motor-vatandaşı — dört yasa tipi kural motoruna girer, denetle temiz", () => {
  const kaynak = readFileSync(
    fileURLToPath(new URL("../../../ogreti/ornek/format/dalga1_yasa.sar", import.meta.url)), "utf8");
  const p = parse(kaynak);
  const tanilar = dogrula(p, SNF);
  assert.equal(tanilar.filter((t) => t.duzey === "hata").length, 0,
    `vitrin hatasız kalmalı: ${tanilar.filter((t) => t.duzey === "hata").map((t) => t.kod).join(",")}`);
  // GenelKural artık kural motorunda — asıl kanıt: kurallariCikar onu Kural'la aynı listede sayar.
  const kurallar = kurallariCikar(p);
  const kodlar = kurallar.map((k) => k.kod);
  assert.ok(kodlar.includes("ORN-GK-BICIM"), "GenelKural kural motoruna girmedi");
  assert.ok(kodlar.includes("ORN-OK-EKLENTI"), "ÖzelKural kural motoruna girmedi");
  assert.ok(kurallar.find((k) => k.kod === "ORN-OK-EKLENTI")?.hedef === "eklenti/", "ÖzelKural hedefi okunmadı");
});

test("tanı-iddiası: sicilde OLMAYAN kod uyarı alır; GERÇEK kapı iddiası temiz geçer", () => {
  const p = parse(`Anayasa( kod: ANY-TI, ad: "test", sürüm: "1.0", ne: "iddia testi" ) {
  Kural gercekIddia( kod: TI-1, otorite: anayasa, katman: eşik, kapsam: Tema, tanı: [ geçersiz-renk, düşük-kontrast ] ) {
    ne: "gerçek kapı iddiası — YUZ-4.1 deseni"
  }
  Kural sahteIddia( kod: TI-2, otorite: anayasa, katman: eşik, kapsam: genel, tanı: [ hayali-kapi-kodu ] ) {
    ne: "sahte motor iddiası — sicil yakalamalı"
  }
}`);
  const tanilar = dogrula(p, SNF).filter((t) => t.kod === "doğrulanamayan-tanı-iddiası");
  assert.equal(tanilar.length, 1, "sahte iddia tek uyarı almalıydı (gerçek iddia temiz)");
  assert.ok(tanilar[0].mesaj.includes("hayali-kapi-kodu"));
});

// ── RF-T6-A05: kullanımsız-tip bekçisi (tip-doğum kapısı · Founder onayı) ─────
//    Beyansız sıfır-kullanım tip BİLGİ alır; muafiyeti beyanlı olan susar;
//    canlı kullanılan tip sağlıklı sayılır. "Format yazıp uygulamama" nöbeti.
test("RF-T6-A05: kullanımsız-tip — beyansız sıfır BİLGİ, muaf sus, kullanılan sağlıklı", async () => {
  const { kullanimsizTipTanilari } = await import("../src/denetci.ts");
  const snf = {
    widgetTipleri: [
      { ad: "Kullanılan", aile: "test" },
      { ad: "MuafTip", aile: "test" },
      { ad: "Beyansız", aile: "test" },
    ],
    tipMuafiyetleri: { MuafTip: "OS-vadeli" },
  } as unknown as Parameters<typeof kullanimsizTipTanilari>[1];
  const src = `ANA( kod: ANA-T ){ Kullanılan( kod: KLN-1 ) }`;
  const programlar = new Map([["anadizin.sar", ayristir(belirtecle(src))]]);
  const tanilar = kullanimsizTipTanilari(programlar, snf, "anadizin.sar");
  const kodlar = tanilar.map((x) => x.tani.mesaj);
  assert.equal(tanilar.length, 1, "yalnız beyansız-sıfır tip raporlanmalı");
  assert.ok(kodlar[0].includes("Beyansız"), "Beyansız tip yakalanmalı");
  assert.ok(!kodlar.some((m) => m.includes("MuafTip")), "muafiyeti beyanlı tip susmalı");
  assert.ok(!kodlar.some((m) => m.includes("Kullanılan")), "canlı kullanılan tip sağlıklı");
  assert.equal(tanilar[0].tani.duzey, "bilgi", "düzey BİLGİ (kapıyı doldurmaz)");
});

// Örnek/vitrin dosyasındaki kullanım CANLI sayılmaz (bahçe-dışı filtre).
test("RF-T6-A05: örnek/vitrin kullanımı CANLI değildir — bekçi yine BİLGİ verir", async () => {
  const { kullanimsizTipTanilari } = await import("../src/denetci.ts");
  const snf = { widgetTipleri: [{ ad: "SadeceOrnekte", aile: "test" }], tipMuafiyetleri: {} } as unknown as Parameters<typeof kullanimsizTipTanilari>[1];
  const src = `ANA( kod: ANA-T ){ SadeceOrnekte( kod: X-1 ) }`;
  const programlar = new Map([["ornek/vitrin.sar", ayristir(belirtecle(src))]]);
  const tanilar = kullanimsizTipTanilari(programlar, snf, "anadizin.sar");
  assert.equal(tanilar.length, 1, "örnek/ altındaki kullanım canlı sayılmaz → hâlâ kullanımsız");
  assert.ok(tanilar[0].tani.mesaj.includes("SadeceOrnekte"));
});

// ── Yapısal-hiyerarşi (Founder MECBURİ · MIM-1 · 2026-07-14): tam zincir zorlaması
//    Founder canlı yakaladı: Blok Faz'la aynı hizada + Blok doğrudan Adım = drift.
test("hiyerarşi: fazsız-blok + katmansız-adım HATA (tam-zincir · MIM-1 kademesi açıldı); meşru zincir + çağır-bağı temiz", async () => {
  const { hiyerarsiTanilari } = await import("../src/denetci.ts");
  const der = (s: string) => new Map([["p.sar", ayristir(belirtecle(s))]]);
  // fazsız-blok: Faz'a bağlı olmayan Blok → HATA (blok_kimlik göçü sonrası terfi)
  const t1 = hiyerarsiTanilari(der(`Blok( kod: BLK-YALNIZ, ad: "faz yok" ) { Katman( kod: KAT-1 ) { Adım( kod: ADM-1, durum: beklemede ) } }`));
  assert.ok(t1.some((x) => x.tani.kod === "fazsız-blok" && x.tani.duzey === "hata"), "Faz'sız Blok fazsız-blok HATA almalı");
  // katmansız-adım: Blok doğrudan Adım (kademe yok)
  const t2 = hiyerarsiTanilari(der(`Faz( kod: FAZ-1 ) { Blok( kod: BLK-X, ad: "x" ) { Adım( kod: ADM-2, durum: beklemede ) } }`));
  assert.ok(t2.some((x) => x.tani.kod === "katmansız-adım" && x.tani.duzey === "hata"), "Blok→doğrudan Adım katmansız-adım HATA almalı");
  assert.ok(!t2.some((x) => x.tani.kod === "fazsız-blok"), "Faz altında Blok fazsız-blok ALMAMALI");
  // meşru: Faz→Blok→Katman→Adım tam zincir temiz
  const t3 = hiyerarsiTanilari(der(`Faz( kod: FAZ-2 ) { Blok( kod: BLK-Y, ad: "y" ) { Katman( kod: KAT-Y ) { Adım( kod: ADM-3, durum: beklemede ) } } }`));
  assert.equal(t3.length, 0, "tam zincir hiyerarşi tanısı ALMAMALI");
  // çağır ile Faz'a bağlı Blok (fiziksel değil ama çağrılı) = temiz
  const t4 = hiyerarsiTanilari(der(`Faz( kod: FAZ-3 ) { çağır BLK-Z }\nBlok( kod: BLK-Z, ad: "z" ) { Katman( kod: KAT-Z ) { Adım( kod: ADM-4, durum: beklemede ) } }`));
  assert.ok(!t4.some((x) => x.tani.kod === "fazsız-blok"), "çağır ile Faz'a bağlı Blok fazsız-blok ALMAMALI");
});

// ═══════════════════════════════════════════════════════════════════════════
// GOC-KANON-A06 · YENİ OMURGA SINIFLAMA NÖBETLERİ
//   Kanon-verisi göçünün üç yeni tipi (Meyve · KimlikKökü · KimlikSağlayıcısı),
//   Proje rejim sözleşmesi, AltKatman departman sözleşmesi ve kimlik rol ayrımı
//   canlı sicile bağlanır. Nöbetler iki katmanlıdır: canlı kayıt assert'leri üç
//   kayıt yüzünden biri eksilirse süiti kırmızı yapar; mutasyon assert'leri
//   eksilmenin motor davranışını nasıl değiştirdiğini davranışla kanıtlar.
// ═══════════════════════════════════════════════════════════════════════════
const SNF_HAM = SNF as unknown as {
  widgetTipleri: Array<{ ad: string; aile: string }>;
  semalar: Record<string, { zorunlu?: string[]; enum?: Record<string, string[]>;
    beyanZorunlu?: Record<string, { tanı?: string; düzey?: string; dayanak?: string }>;
    dosyaZorunluTürler?: string[]; dosyaMuafTürler?: string[]; varsayilan?: Record<string, string> }>;
  izinliSarma: Record<string, string[]>;
  kenarTipleri: Array<{ ad: string }>;
};

const YENI_OMURGA_FIKSTUR = `Faz( kod: FAZ-NBT ) { Blok( kod: BLK-NBT, ne: "nöbet gövdesi" ) { Katman( kod: KAT-NBT, ad: "nöbet" ) { AltKatman( kod: ALT-NBT, ad: "nöbet", departman: kodlama ) { Adım( kod: ADM-NBT, durum: tamamlandı, ne: "nöbet adımı", kabul: [ "nöbet" ], üretir: [ Meyve( kod: MEY-NBT, tür: Kod, dosya: "src/nbt.sar", ne: "nöbet meyvesi" ) ] ) { Meyve( kod: MEY-NBT-2, tür: Onay, ne: "gövde meyvesi" ) } } } } }`;

test("yeni omurga tipleri: üç kayıt yüzü tam — biri eksilirse bu nöbet kırmızı", () => {
  for (const ad of ["Meyve", "KimlikKökü", "KimlikSağlayıcısı"]) {
    assert.ok(SNF_HAM.widgetTipleri.some((t) => t.ad === ad), `${ad} widgetTipleri yüzünde yok`);
    assert.ok(SNF_HAM.semalar[ad], `${ad} semalar yüzünde yok`);
  }
  assert.equal(SNF_HAM.widgetTipleri.find((t) => t.ad === "Meyve")?.aile, "urun", "Meyve urun ailesinde olmalı");
  assert.equal(SNF_HAM.widgetTipleri.find((t) => t.ad === "KimlikKökü")?.aile, "arkayuz");
  assert.equal(SNF_HAM.widgetTipleri.find((t) => t.ad === "KimlikSağlayıcısı")?.aile, "arkayuz");
  // izinliSarma yüzü: Adım yalnız Meyve sarar; kök yerleşimleri MIM-1.1/ORK-5.3
  assert.deepEqual(SNF_HAM.izinliSarma["Adım"], ["Meyve"], "Adım'ın izinli tek çocuğu Meyve olmalı (üretir konisine bitişik teslim)");
  assert.deepEqual(SNF_HAM.izinliSarma["KimlikKökü"], ["KimlikPolitikası", "KimlikSağlayıcısı"], "kök tam bir politika + sağlayıcılar sarar");
  assert.ok(SNF_HAM.izinliSarma["ÇalışmaAlanı"].includes("KimlikKökü"), "ortak Auth kökü ÇalışmaAlanı altında ilan edilir (MIM-1.1)");
  assert.ok(SNF_HAM.izinliSarma["Proje"].includes("KimlikKökü"), "bağımsız yol: Proje kendi kökünü ilan edebilir (ORK-5.3)");
  assert.ok(!SNF_HAM.izinliSarma["ÇalışmaAlanı"].includes("KimlikSağlayıcısı"), "sağlayıcı köksüz (doğrudan ÇalışmaAlanı'nda) yaşayamaz");
  // kenar sözlüğü yüzü
  assert.ok(SNF_HAM.kenarTipleri.some((k) => k.ad === "kullanır"), "kullanır kenarı sicile inmeli (MIM-1.4 · ORK-5)");
});

test("yeni omurga fikstürü canlı sicille temiz; yüz mutasyonları davranışı değiştirir (kanıt)", () => {
  const p = parse(YENI_OMURGA_FIKSTUR);
  const yapiKodlari = (t: ReturnType<typeof dogrula>) =>
    t.filter((x) => ["bilinmeyen-tip", "izinsiz-sarma", "geçersiz-enum"].includes(x.kod));
  assert.equal(yapiKodlari(dogrula(p, SNF)).length, 0, "canlı sicilde fikstür yapı tanısı almamalı");
  // mutasyon A: widget yüzü eksilirse tip tanınmaz olur
  const mutA = structuredClone(SNF_HAM);
  mutA.widgetTipleri = mutA.widgetTipleri.filter((t) => t.ad !== "Meyve");
  assert.ok(dogrula(p, mutA as unknown as Siniflama).some((x) => x.kod === "bilinmeyen-tip"),
    "widgetTipleri'nden Meyve eksilince motor tipi tanımamalı (bilinmeyen-tip)");
  // mutasyon B: şema yüzü eksilirse enum denetimi sessizce kaybolur — kanıt
  const kotu = parse(`KimlikKökü( kod: KMK-NBT ) { KimlikSağlayıcısı( kod: KMS-NBT, tür: facebook ) }`);
  assert.ok(dogrula(kotu, SNF).some((x) => x.kod === "geçersiz-enum"),
    "canlı sicil taban dışı sağlayıcıyı (facebook) geçersiz-enum ile yakalamalı");
  const mutB = structuredClone(SNF_HAM);
  delete mutB.semalar["KimlikSağlayıcısı"];
  assert.equal(dogrula(kotu, mutB as unknown as Siniflama).filter((x) => x.kod === "geçersiz-enum").length, 0,
    "şema yüzü eksilince aynı ihlal denetimsiz kalır — üç yüz bu yüzden birlikte nöbetlidir");
  // mutasyon C: sarma yüzü eksilirse meşru teslim yerleşimi kırılır — kanıt
  const govdeKod = parse(`Adım( kod: ADM-SRM, ne: "n" ) { Kod( kod: KD-SRM, ne: "k" ) }`);
  assert.ok(dogrula(govdeKod, SNF).some((x) => x.kod === "izinsiz-sarma"),
    "canlı sicilde Adım gövdesi Meyve dışı çocuğu (Kod) reddetmeli");
  const govdeMeyve = parse(`Adım( kod: ADM-SRM2, ne: "n" ) { Meyve( kod: MEY-SRM, tür: Kod, dosya: "src/s.sar", ne: "m" ) }`);
  assert.equal(dogrula(govdeMeyve, SNF).filter((x) => x.kod === "izinsiz-sarma").length, 0,
    "canlı sicilde Adım gövdesindeki Meyve meşru yerleşimdir");
  const mutC = structuredClone(SNF_HAM);
  delete mutC.izinliSarma["Adım"];
  assert.ok(dogrula(govdeMeyve, mutC as unknown as Siniflama).some((x) => x.kod === "izinsiz-sarma"),
    "izinliSarma yüzü eksilince meşru Adım{Meyve} yerleşimi izinsiz-sarma'ya döner — yüz eksilmesi süiti böyle kırmızı yapar");
});

test("rejim sözleşmesi: enum katı|esnek, sessiz varsayılan yok, beyanZorunlu kaydı hata düzeyinde", () => {
  assert.deepEqual(SNF_HAM.semalar["Proje"].enum?.["rejim"], ["katı", "esnek"], "rejim enumu tam iki değer taşımalı");
  assert.ok(!SNF_HAM.semalar["Proje"].enum?.["rejim"].some((d) => d.startsWith("*")),
    "rejim enumunda CUE yıldızı olamaz — YAS-1 sessiz varsayılanı yasaklar");
  assert.equal(SNF_HAM.semalar["Proje"].varsayilan?.["rejim"], undefined, "rejim için normalize varsayılan da doğmamalı");
  const beyan = SNF_HAM.semalar["Proje"].beyanZorunlu?.["rejim"];
  assert.ok(beyan, "Proje şeması rejim beyanZorunlu sözleşmesini taşımalı (YAS-1)");
  assert.equal(beyan?.tanı, "rejim-beyanı-eksik");
  assert.equal(beyan?.düzey, "hata");
  // katı ve esnek yerleşimler ayrı fikstürlerde beklenen sonucu verir
  const kati = dogrula(parse(`Proje( kod: PRJ-NBT-KATI, rejim: katı, ne: "katı fikstür" )`), SNF);
  assert.equal(kati.filter((x) => x.kod === "geçersiz-enum").length, 0, "rejim: katı geçerli olmalı");
  const esnek = dogrula(parse(`Proje( kod: PRJ-NBT-ESNEK, rejim: esnek, ne: "esnek fikstür" )`), SNF);
  assert.equal(esnek.filter((x) => x.kod === "geçersiz-enum").length, 0, "rejim: esnek geçerli olmalı");
  const bozuk = dogrula(parse(`Proje( kod: PRJ-NBT-BOZUK, rejim: sıkı, ne: "geçersiz fikstür" )`), SNF);
  assert.ok(bozuk.some((x) => x.kod === "geçersiz-enum" && x.mesaj.includes("sıkı")), "rejim: sıkı geçersiz-enum almalı");
});

test("departman sözleşmesi: taban beşli birebir, geçersiz değer uyarı, katkılı örtü genişletir", async () => {
  const { siniflamaOrtuMerge } = await import("../src/siniflama.ts");
  assert.deepEqual(SNF_HAM.semalar["AltKatman"].enum?.["departman"],
    ["planlama", "kodlama", "sınama", "inceleme", "güvenlik"],
    "çekirdek departman beşlisi yerinde değiştirilemez (MIM-1.5)");
  assert.ok(SNF_HAM.semalar["AltKatman"].beyanZorunlu?.["departman"], "AltKatman şeması departman beyanZorunlu sözleşmesini taşımalı");
  const gecersiz = dogrula(parse(`AltKatman( kod: ALT-NBT-P, ad: "n", departman: pazarlama )`), SNF);
  assert.ok(gecersiz.some((x) => x.kod === "geçersiz-enum"), "taban dışı departman (pazarlama) geçersiz-enum almalı");
  // katkılı örtü: taban korunur, yeni değer eklenir (TIP-2.5)
  const ortulu = siniflamaOrtuMerge(SNF, { semalar: { AltKatman: { enum: { departman: ["uyumluluk"] } } } });
  const genis = dogrula(parse(`AltKatman( kod: ALT-NBT-U, ad: "n", departman: uyumluluk )`), ortulu);
  assert.equal(genis.filter((x) => x.kod === "geçersiz-enum").length, 0, "örtüyle eklenen departman (uyumluluk) kabul edilmeli");
  const ortuluHam = ortulu as unknown as typeof SNF_HAM;
  assert.deepEqual(ortuluHam.semalar["AltKatman"].enum?.["departman"].slice(0, 5),
    ["planlama", "kodlama", "sınama", "inceleme", "güvenlik"], "örtü taban beşliyi bozamaz — yalnız sona ekler");
});

test("kimlik ayrımı regresyonu: eski Kimlik tipi geri gelemez, üç rol ayrı, sağlayıcı tabanı altılı", () => {
  // Karar C kilidi: 'Kimlik' adlı tip hiçbir kayıt yüzünde yaşayamaz
  assert.ok(!SNF_HAM.widgetTipleri.some((t) => t.ad === "Kimlik"), "eski 'Kimlik' tip adı widgetTipleri'nde geri gelemez");
  assert.equal(SNF_HAM.semalar["Kimlik"], undefined, "eski 'Kimlik' şema anahtarı geri gelemez");
  for (const liste of Object.values(SNF_HAM.izinliSarma))
    assert.ok(!liste.includes("Kimlik"), "eski 'Kimlik' adı hiçbir sarma listesinde geri gelemez");
  assert.ok(dogrula(parse(`Kimlik( kod: KML-NBT, ne: "eski ad" )`), SNF).some((x) => x.kod === "bilinmeyen-tip"),
    "eski adla bildirim bilinmeyen-tip almalı — yeniden adlandırma çift kimlik bırakmadı");
  // üç rol ayrı yüzlerde ve ayrı sorumluluklarla yaşar
  assert.ok(SNF_HAM.widgetTipleri.some((t) => t.ad === "KimlikPolitikası"), "politika rolü sicilde");
  assert.deepEqual(SNF_HAM.semalar["KimlikSağlayıcısı"].enum?.["tür"],
    ["google", "github", "linkedin", "apple", "microsoft", "sso"],
    "sağlayıcı taban kataloğu altılıyı eksiksiz ve bu adlarla taşımalı (ORK-5.1)");
  assert.deepEqual(SNF_HAM.semalar["Meyve"].dosyaZorunluTürler, ["Kod", "Ekran", "Uç", "Sözleşme"], "MIM-2.1 dosya-zorunlu türler makine-okur");
  assert.deepEqual(SNF_HAM.semalar["Meyve"].dosyaMuafTürler, ["Karar", "Onay", "dış-çıktı"], "MIM-2.2 muafiyet kataloğu kapalı ve makine-okur");
  // köksüz sağlayıcı yerleşimi reddedilir (ORK-5)
  assert.ok(dogrula(parse(`ÇalışmaAlanı( kod: CAL-NBT, ne: "n" ) { KimlikSağlayıcısı( kod: KMS-YETIM, tür: google ) }`), SNF)
    .some((x) => x.kod === "izinsiz-sarma"), "köksüz sağlayıcı izinsiz-sarma almalı");
});

// ══ BOŞLUK KARARI GÖRÜNÜRLÜK NÖBETİ (GOC-MOTOR-A04) ═════════════════════════
//
//   GOC-MOTOR-A03 Adımı beş boşluk adayının beşini de reddetti ve hiçbirine
//   yeni kimlik açmadı. Reddin bedeli şudur: bir ihlalin görünürlüğü artık tek
//   bir kimliğe değil, o kimliğin HALEF KÜMESİNE dayanır. Aşağıdaki nöbetler o
//   kümeyi sınar; ihlal kümedeki hiçbir tanıyı üretmezse sınama kırmızıya döner.
//   Böylece GOC-MOTOR-A10 emekli temizliği bir kimliği halefi doğmadan
//   çıkarırsa kusur kapıya düşer, sessizce geçmez.
//   Kararların tam gerekçesi: nitelik/goc/tani_boslugu_kararlari.sar

/** Bir ihlalin görünür kalmasını sağlayan kanonik kimlikler (A03 hükümleri). */
const HALEF_KUMESI: Readonly<Record<string, readonly string[]>> = {
  // RET · kanonik tanı eksiksiz karşılıyor → halef ORK-1.2 tanısıdır
  "kopuk-zincir": ["kopuk-zincir", "yürütme-kenarı-sözleşmesi", "kırık-referans"],
  // RET · kanonik tanı eksiksiz karşılıyor → halef MIM-1.4 / ORK-2.4 zinciridir
  "teknolojisiz-yüzey": ["teknolojisiz-yüzey", "katmansız-teknoloji", "kullanır-kenarı-ihlali"],
  // RET · kanonda hüküm YOK → halefi yoktur; Founder hükmüne kadar kendisi tek bekçidir
  "kayıp-kenar": ["kayıp-kenar"],
  "koni-taşması": ["koni-taşması"],
};
const gorunurMu = (kodlar: readonly string[], aday: string): boolean =>
  kodlar.some((k) => HALEF_KUMESI[aday].includes(k));

test("A04 · kopuk-zincir: çözülmeyen bağımlı hedefi HİÇBİR ZAMAN görünmez kalmaz (olumlu)", () => {
  const p = parse(`Blok( kod: BLK-KZ, ne: "kopuk zincir fikstürü" ) {
  Katman( kod: KAT-KZ, ne: "katman" ) {
    Adım( kod: ADM-KZ, durum: beklemede, ne: "hedefi doğmamış işe bağımlı", bağımlı: [ ADM-YOK ] )
  }
}`);
  const kodlar = kopukZincirTanilari(dagKur(new Map([["kz.sar", p]]))).map((x) => x.tani.kod);
  assert.ok(gorunurMu(kodlar, "kopuk-zincir"),
    `çözülmeyen 'bağımlı' hedefi sessiz kaldı — halef kümesinden hiçbiri üretilmedi; gelen: ${JSON.stringify(kodlar)}`);
});

test("A04 · kopuk-zincir: çözülen hedef tanı ÜRETMEZ (olumsuz)", () => {
  const p = parse(`Blok( kod: BLK-KZ2, ne: "temiz zincir" ) {
  Katman( kod: KAT-KZ2, ne: "katman" ) {
    Adım( kod: ADM-ONCE, durum: tamamlandı, ne: "öncül iş" )
    Adım( kod: ADM-SONRA, durum: beklemede, ne: "ardıl iş", bağımlı: [ ADM-ONCE ] )
  }
}`);
  assert.deepEqual(kopukZincirTanilari(dagKur(new Map([["kz2.sar", p]]))), []);
});

test("A04 · kayıp-kenar: Meyve tüketen kenarsız Adım görünür kalır (olumlu) ve zincirliyse susar (sınır)", () => {
  const ihlal = new Map([["kk.sar", parse(`
    Adım( kod: ADM-KK-URETEN, durum: tamamlandı, üretir: KOD-KK, kabul: "k", ne: "meyveyi üretir" )
    Adım( kod: ADM-KK-TUKETEN, durum: beklemede, bağımlı: [], referans: [ KOD-KK ], ne: "meyveyi tüketir ama kenar yok" )`)]]);
  const kodlar = kayipKenarTanilari(dagKur(ihlal), ihlal).map((x) => x.tani.kod);
  assert.ok(gorunurMu(kodlar, "kayıp-kenar"),
    `eksik yürütme kenarı sessiz kaldı — A03 bu kimliği Founder hükmüne kadar tek bekçi ilan etti; gelen: ${JSON.stringify(kodlar)}`);
  // SINIR: geçişli zincir bağı zaten kuruyorsa yanlış-pozitif üretilmez.
  const temiz = new Map([["kk2.sar", parse(`
    Adım( kod: ADM-KK2-URETEN, durum: tamamlandı, üretir: KOD-KK2, kabul: "k", ne: "üretir" )
    Adım( kod: ADM-KK2-ORTA, durum: beklemede, bağımlı: [ ADM-KK2-URETEN ], ne: "ara halka" )
    Adım( kod: ADM-KK2-TUKETEN, durum: beklemede, bağımlı: [ ADM-KK2-ORTA ], referans: [ KOD-KK2 ], ne: "geçişli zincirli tüketim" )`)]]);
  assert.deepEqual(kayipKenarTanilari(dagKur(temiz), temiz), []);
});

test("A04 · teknolojisiz-yüzey: teknolojisiz yüzey görünür kalır (olumlu), teknoloji seçilince susar (olumsuz)", () => {
  const ciplak = new Map([["ty.sar", parse('Ekran( kod: EKR-TY, ne: "teknolojisiz yüzey" )')]]);
  const kodlar = teknolojisizYuzeyTanilari(ciplak, kodIndeksle(ciplak)).map((x) => x.tani.kod);
  assert.ok(gorunurMu(kodlar, "teknolojisiz-yüzey"),
    `teknolojisiz yüzey sessiz kaldı — halef kümesinden hiçbiri üretilmedi; gelen: ${JSON.stringify(kodlar)}`);
  const secili = new Map([["ty2.sar", parse('Takım( kod: TAKIM-TY, ne: "önyüz yığını", bağımlı: [ FLUTTER ] )\nEkran( kod: EKR-TY2, ne: "yüzey" )')]]);
  assert.deepEqual(teknolojisizYuzeyTanilari(secili, kodIndeksle(secili)), []);
});

test("A04 · koni-taşması: eşik üstü yığılma görünür kalır (olumlu), eşikte susar (sınır)", () => {
  const kural = (n: number): string => Array.from({ length: n }, (_, i) =>
    `Kural kt${i}( kod: KRL-KT${i}, katman: niyet, kapsam: tümü ) { ne: "koni yükü ${i}" }`).join("\n");
  const asan = kuralDenetle(parse(`${kural(21)}\nBlok( kod: BLK-KT, ne: "yük taşıyan düğüm" ) { }`), SNF).map((t) => t.kod);
  assert.ok(gorunurMu(asan, "koni-taşması"),
    `bağlam boğulması sessiz kaldı — A03 bu kimliği Founder hükmüne kadar tek bekçi ilan etti; gelen: ${JSON.stringify([...new Set(asan)])}`);
  // SINIR: tam eşikte (20) tanı üretilmez — eşik sertleşmesi kazara olmasın.
  const esikte = kuralDenetle(parse(`${kural(20)}\nBlok( kod: BLK-KT2, ne: "eşikteki düğüm" ) { }`), SNF).map((t) => t.kod);
  assert.ok(!esikte.includes("koni-taşması"), "eşik değeri sessizce sertleşmiş — 20 kural taşma sayılmamalı");
});

test("A04 · alan-adı-çakışması: AltKatman departman alanı tekil, `rol` adı rezerve (çakışma geri doğmaz)", () => {
  const sema = (SNF as unknown as { semalar: Record<string, { zorunlu?: string[]; enum?: Record<string, string[]>; beyanZorunlu?: Record<string, unknown> }> }).semalar["AltKatman"];
  assert.ok(sema, "AltKatman şeması sicilde yok");
  assert.ok(sema.enum?.departman, "kanonik alan adı 'departman' AltKatman enum'unda yok — Karar B geri alınmış");
  assert.equal(sema.enum?.rol, undefined, "'rol' adı AltKatman şemasına geri dönmüş — Karar B çakışması yeniden doğdu");
  assert.equal(sema.beyanZorunlu?.rol, undefined, "'rol' AltKatman beyan sözleşmesine geri dönmüş");
  assert.deepEqual(sema.enum?.departman,
    ["planlama", "kodlama", "sınama", "inceleme", "güvenlik"],
    "çekirdek beşli departman kümesi değişmiş — genişletme yalnız ÇalışmaAlanı örtüsüyle olur (TIP-2.5)");
});

// ═══════════════════════════════════════════════════════════════════════════
// GOC-MOTOR-A08 · ÜÇLÜ TANI NÖBETİ (2026-07-27)
//
//   Bir tanı ÜÇ yerde birden yaşar ve üçü birbirine eşit olmak zorundadır:
//     ① `tani-sicili.ts` kaydı,
//     ② gerçek üretici kaynağındaki kod,
//     ③ kanon maddesinin `**Zorlama:**` satırındaki tanı iddiası.
//
//   Halka 2'de bu üçlüyü tutan tek şey üreticinin disipliniydi ve senkron YALNIZ
//   TEK YÖNDE (sicilden kanona) ölçülmüştü; ters yönde bir delik vardı ve kanonun
//   ilan ettiği yetmişinci tanı (`tanı-yüzeyi-karışması`) envantere hiç girmemişti.
//   Bu nöbet üçlüyü İKİ YÖNLÜ tutar; delik bir daha sessizce yaşayamaz.
// ═══════════════════════════════════════════════════════════════════════════

const KANON_DIZINI = fileURLToPath(new URL("../../../yasa/kanon", import.meta.url));
const SRC_DIZINI = fileURLToPath(new URL("../src", import.meta.url));

/** Kanonun sekiz bölüm dosyasındaki `**Zorlama:**` satırlarından YENİ tanı iddiaları. */
function kanonYeniTaniIddialari(): Map<string, string> {
  const iddialar = new Map<string, string>();
  for (const ad of readdirSync(KANON_DIZINI)) {
    if (!ad.endsWith(".sar")) continue;
    const metin = readFileSync(join(KANON_DIZINI, ad), "utf8");
    for (const satir of metin.split("\n")) {
      if (!satir.includes("**Zorlama:**")) continue;
      // "yeni tanı önerisi `kimlik` · DÜZEY" kalıbı — yalnız YENİ ilanlar sayılır;
      // aynı satırdaki korunan tanılar (`geçersiz-enum` gibi) bu kalıba girmez.
      for (const m of satir.matchAll(/[Yy]eni tanı önerisi\s+`([^`]+)`\s*·\s*(HATA|UYARI|BİLGİ)/g)) {
        iddialar.set(m[1], m[2] === "HATA" ? "hata" : m[2] === "UYARI" ? "uyarı" : "bilgi");
      }
    }
  }
  return iddialar;
}

/** Üretici kaynaklarında GERÇEKTEN basılan yeni tanı kimlikleri. */
function ureticiKimlikleri(): Map<string, Set<string>> {
  const bulunan = new Map<string, Set<string>>();
  const ekle = (kod: string, dosya: string): void => {
    if (!bulunan.has(kod)) bulunan.set(kod, new Set());
    bulunan.get(kod)!.add(dosya);
  };
  for (const ad of readdirSync(SRC_DIZINI)) {
    if (!ad.endsWith(".ts") || ad === "tani-sicili.ts" || ad === "tani-metinleri.ts") continue;
    const kaynak = readFileSync(join(SRC_DIZINI, ad), "utf8");
    // Yeni kanon tanıları üreticide HER ZAMAN yeniTani("kimlik", …) ile kurulur —
    // düzeyi sicilden, cümleyi katalogdan alırlar (kilitli mesaj-anahtarı kararı).
    for (const m of kaynak.matchAll(/yeniTani\(\s*"([^"]+)"/g)) ekle(m[1], ad);
  }
  return bulunan;
}

test("A08 üçlü senkron ①: SİCİL ile KANON iddiaları iki yönlü birebir", () => {
  const kanon = kanonYeniTaniIddialari();
  const sicil = new Set(YENI_TANI_KODLARI);
  // İleri yön: sicildeki her kimliğin kanonda bir Zorlama iddiası olmalı.
  const kanondaYok = [...sicil].filter((k: string) => !kanon.has(k)).sort();
  assert.deepEqual(kanondaYok, [],
    `sicilde olup kanonda **Zorlama:** iddiası bulunmayan tanı: ${kanondaYok.join(" · ")}`);
  // TERS YÖN (D-4 deliğinin kapandığı yer): kanonun ilan ettiği her yeni tanı
  // sicilde de bulunmalı. Halka 2'de ölçülmeyen yön tam buydu.
  const sicildeYok = [...kanon.keys()].filter((k) => !sicil.has(k)).sort();
  assert.deepEqual(sicildeYok, [],
    `kanon ilan ediyor fakat sicilde yok: ${sicildeYok.join(" · ")} — envanter deliği geri açılmış`);
  // Düzey ataması da kanonun kendi cümlesinden doğrulanır.
  const duzeySapmasi = YENI_TANI_KANONU
    .filter((k) => kanon.get(k.kod) !== k.kanonDüzey)
    .map((k) => `${k.kod}: sicil ${k.kanonDüzey} ≠ kanon ${kanon.get(k.kod)}`);
  assert.deepEqual(duzeySapmasi, [], duzeySapmasi.join(" · "));
});

test("A08 üçlü senkron ②: SİCİL ile ÜRETİCİ kaynakları iki yönlü birebir", () => {
  const uretici = ureticiKimlikleri();
  const sapma: string[] = [];
  for (const kayit of YENI_TANI_KANONU) {
    const dosyalar = uretici.get(kayit.kod);
    if (!dosyalar) { sapma.push(`${kayit.kod}: sicilde var, hiçbir üreticide basılmıyor`); continue; }
    if (!dosyalar.has(kayit.uretici))
      sapma.push(`${kayit.kod}: sicil "${kayit.uretici}" diyor, gerçek üretici ${[...dosyalar].join("+")}`);
    if (dosyalar.size > 1)
      sapma.push(`${kayit.kod}: çift sahiplik — ${[...dosyalar].join(" + ")}`);
  }
  // Ters yön: üreticide basılıp sicilde olmayan kimlik olamaz.
  const sicil = new Set(YENI_TANI_KODLARI);
  for (const kod of uretici.keys())
    if (!sicil.has(kod)) sapma.push(`${kod}: üreticide basılıyor, sicilde yok`);
  assert.deepEqual(sapma, [], sapma.join("\n"));
});

test("A08 üçlü senkron ③: KATALOG sicille iki yönlü birebir (D-5 ölü kodu nöbete bağlandı)", () => {
  assert.deepEqual(metinsizYeniTanilar(), [],
    "sicile girmiş fakat metni yazılmamış tanı var — yeniTani() çalışma anında patlardı");
  assert.deepEqual(sicilsizTaniMetinleri(), [],
    "metni yazılmış fakat sicilde karşılığı olmayan tanı var — ölü katalog girdisi");
});

test("A08: korunan VERİ-GÜDÜMLÜ tanılar yanlışlıkla eksik sayılmaz (kaynak ayrımı açık)", () => {
  // Bu dokuz kimlik sabit listede DEĞİLDİR ve olmamalıdır: kanonun zorunluKenar
  // kayıtlarından çalışma anında doğarlar. Nöbet ikisini birden tutar — sabit
  // listeye sızmamaları ve canlı sicilde bulunmaları.
  const VERI_GUDUMLU = ["konisiz-adım", "öksüz-düğme", "kavuşumsuz-ekran", "temasız-ekran", "ölçüsüz-metin"];
  const sabit = new Set(SABIT_TANI_KODLARI);
  const canli = taniSicili(SNF);
  for (const kod of VERI_GUDUMLU) {
    assert.ok(!sabit.has(kod), `veri-güdümlü '${kod}' sabit listeye sızmış — tek kaynak kanondur`);
    assert.ok(canli.has(kod), `veri-güdümlü '${kod}' canlı sicilde yok — yanlışlıkla eksik sayılır`);
  }
});

test("A08: orthografi düzeltmesi ÇİFT KOD bırakmadı — eski ve yeni kimlik birlikte yaşayamaz", () => {
  const sicil = taniSicili(SNF);
  // Her kanonik kimliğin katlanmış adı, sicilde AYRI bir kimlik olarak yaşamamalı.
  const cift: string[] = [];
  for (const kod of sicil) {
    const katli = katlanmisAd(kod);
    if (katli !== kod && sicil.has(katli)) cift.push(`${kod} ↔ ${katli}`);
  }
  assert.deepEqual(cift, [],
    `aynı ihlal için eski ve yeni kimlik BİRLİKTE yaşıyor: ${cift.join(" · ")}`);
});

// ═══════════════════════════════════════════════════════════════════════════
// GOC-TERFI-A06 · TERFİ KAPISI VE YÜZEY TEK-KAYNAK NÖBETİ (2026-08-03)
// ═══════════════════════════════════════════════════════════════════════════

const TERFI_KAYDI = readFileSync(fileURLToPath(
  new URL("../../../is/nitelik/goc/hata_terfi_kapi_kaydi.sar", import.meta.url)), "utf8");

interface A05AdaySatiri {
  kod: string;
  uygulama: string;
  dogrulama: string;
  kanon: string;
  karar: "hata" | "uyarı";
}

function a05AdaySatirlari(): A05AdaySatiri[] {
  const adayBolumu = TERFI_KAYDI.slice(
    TERFI_KAYDI.indexOf("## ADAY"), TERFI_KAYDI.indexOf("## RET-ADAYI"));
  const satirlar: A05AdaySatiri[] = [];
  for (const satir of adayBolumu.split("\n")) {
    if (!/^\| \d+ \|/.test(satir)) continue;
    const kimlik = /\| `([^`]+)` ·/.exec(satir)?.[1];
    const kanit = /\| U `([^`]+)` · D `([^`]+)` · K `([^`]+)`/.exec(satir);
    const karar = satir.includes("**HATA öner**") ? "hata"
      : satir.includes("**Uyarıda kalsın**") ? "uyarı" : undefined;
    if (!kimlik || !kanit || !karar) throw new Error(`A05 aday satırı makine-okur değil: ${satir}`);
    satirlar.push({ kod: kimlik, uygulama: kanit[1], dogrulama: kanit[2], kanon: kanit[3], karar });
  }
  return satirlar;
}

function a05RetKimlikleri(): string[] {
  const bolum = TERFI_KAYDI.slice(
    TERFI_KAYDI.indexOf("## RET-ADAYI"), TERFI_KAYDI.indexOf("## Öneri dağılımı"));
  return bolum.split("\n").flatMap((satir) => {
    const eslesme = /^\| `([^`]+)` ·/.exec(satir);
    return eslesme ? [eslesme[1]] : [];
  });
}

test("A06 gerçek kapı: 46 uyarı→hata terfisi sıra+sayaç+üçlü kanıt+açık kabul ile geçer", () => {
  const adaylar = a05AdaySatirlari();
  const kabulEdilen = adaylar.filter((x) => x.karar === "hata");
  const uyaridaKalan = adaylar.filter((x) => x.karar === "uyarı");
  const ret = a05RetKimlikleri();
  const indeks = new Map(YENI_TANI_KANONU.map((k) => [k.kod, k]));
  const acikKabul = TERFI_KAYDI.includes("Founder 2026-08-03 tarihinde açık kabul vermiştir")
    && TERFI_KAYDI.includes("46 güvenli çekirdek hataya, 16 uyarıda kalır.")
    && (TERFI_KAYDI.match(/^- \[x\] Founder/gm)?.length ?? 0) === 3
    ? "2026-08-03 · 46 güvenli çekirdek hataya, 16 uyarıda kalır."
    : "";

  assert.match(TERFI_KAYDI, /Bütün ADAY satırlarında bugünkü ölçüm aynıdır: ANA=0 ve KPLU=0/,
    "A05 sayaç koşulu aday kümesinin tamamı için açıkça kayıtlı değildir");
  assert.equal(kabulEdilen.length, 46);
  assert.equal(uyaridaKalan.length, 16);
  assert.equal(ret.length, 8);
  assert.equal(new Set([...kabulEdilen.map((x) => x.kod), ...uyaridaKalan.map((x) => x.kod), ...ret]).size, 70,
    "A05 kabul/uyarı/ret kümeleri ayrık ve tam değildir");

  const kabulListesi = TERFI_KAYDI.slice(TERFI_KAYDI.indexOf("Founder'ın hataya çıkmasını"), TERFI_KAYDI.indexOf("Founder'ın uyarıda kalmasını"));
  const uyariListesi = TERFI_KAYDI.slice(TERFI_KAYDI.indexOf("Founder'ın uyarıda kalmasını"), TERFI_KAYDI.indexOf("Founder'ın reddettiği"));
  const retListesi = TERFI_KAYDI.slice(TERFI_KAYDI.indexOf("Founder'ın reddettiği"), TERFI_KAYDI.indexOf("|<--"));
  assert.ok(kabulEdilen.every((x) => kabulListesi.includes(`\`${x.kod}\``)), "46 kabul kimliği kabul hanesinde tam yazılmamış");
  assert.ok(uyaridaKalan.every((x) => uyariListesi.includes(`\`${x.kod}\``)), "16 uyarı kimliği kabul hanesinde tam yazılmamış");
  assert.ok(ret.every((kod) => retListesi.includes(`\`${kod}\``)), "sekiz ret kimliği kabul hanesinde tam yazılmamış");

  const kusurlar: string[] = [];
  for (const aday of kabulEdilen) {
    const kayit = indeks.get(aday.kod);
    if (!kayit) { kusurlar.push(`${aday.kod}: sicilde yok`); continue; }
    if (kayit.kanonDüzey !== "hata") kusurlar.push(`${aday.kod}: kanon hedefi hata değil`);
    kusurlar.push(...terfiKapisiKusurlari({
      kod: aday.kod, onceki: "uyarı", sonraki: kayit.kademe,
      sayaclar: [0, 0],
      ucluKanit: { uygulama: aday.uygulama, dogrulama: aday.dogrulama, kanon: aday.kanon },
      acikKabul,
    }));
  }
  assert.deepEqual(kusurlar, [], kusurlar.join("\n"));
  assert.ok(uyaridaKalan.every((x) => indeks.get(x.kod)?.kademe === "uyarı"
    && indeks.get(x.kod)?.kanonDüzey === "uyarı"), "16 kimlik uyarıda ve kanon hedefinde kalmadı");
  assert.ok(ret.every((kod) => indeks.get(kod)?.kademe === "bilgi"), "sekiz RET-ADAYI bilgide kalmadı");
});

test("A06 KIRMIZI FİKSTÜRLER: atlama, açık sayaç, eksik üçlü kanıt ve kapalı kabul reddedilir", () => {
  const temiz = {
    kod: "kanonik-kaynak-biçimi", onceki: "uyarı" as const, sonraki: "hata" as const,
    sayaclar: [0, 0],
    ucluKanit: { uygulama: "denetci.ts", dogrulama: "motor-guven.test.ts", kanon: "dil.sar" },
    acikKabul: "2026-08-03 · Founder açık kabulü",
  };
  assert.deepEqual(terfiKapisiKusurlari(temiz), [], "temiz kapı fikstürü geçmelidir");
  assert.match(terfiKapisiKusurlari({ ...temiz, onceki: "bilgi" }).join("\n"), /düzey atlama/,
    "bilgi→hata atlaması kırmızı olmadı");
  assert.match(terfiKapisiKusurlari({ ...temiz, sayaclar: [0, 1] }).join("\n"), /sayaçlar/,
    "açık sayaç kırmızı olmadı");
  assert.match(terfiKapisiKusurlari({ ...temiz, ucluKanit: { ...temiz.ucluKanit, dogrulama: "" } }).join("\n"), /üçlü kanıt/,
    "eksik doğrulama ayağı kırmızı olmadı");
  assert.match(terfiKapisiKusurlari({ ...temiz, acikKabul: "" }).join("\n"), /açık kabul/,
    "kapalı Founder kabulü kırmızı olmadı");
});

test("A06 KIRMIZI FİKSTÜR: yüzey sicil düzeyini yeniden derecelendirirse motor yakalar", () => {
  const sonuc = orkestrasyonTanilari({
    uretilen: [{ dosya: "a.sar", tani: {
      duzey: "uyarı", kod: "kanonik-kaynak-biçimi", mesaj: "m", satir: 1, sutun: 1,
      oneri: "Yapıştır-düzelt: `Karar( kod: DIL-1 )` yaz.",
    } }],
    projeKapisi: [], projeKodlari: new Set<string>(), atlananKapilar: [],
    sicil: new Set(YENI_TANI_KODLARI), anaEtiket: "ana.sar",
  });
  const bulgu = sonuc.find((x) => x.tani.kod === "tanı-yüzü-uyumsuz");
  assert.ok(bulgu, "sicilde hata olan kimlik yüzeyde uyarıya indirildi ama nöbet kırmızı olmadı");
  assert.match(bulgu.tani.mesaj, /sicil bugünkü kademeyi "hata".*yüzey "uyarı"/);
});

test("A06 KIRMIZI FİKSTÜR: atlanan kapıyla sahte tam-yeşil ilanı hata üretir", () => {
  const sonuc = orkestrasyonTanilari({
    uretilen: [], projeKapisi: [], projeKodlari: new Set<string>(),
    atlananKapilar: ["üçlü-kanıt"], sicil: new Set(YENI_TANI_KODLARI), anaEtiket: "ana.sar",
  });
  const bulgu = sonuc.find((x) => x.tani.kod === "sahte-tam-yeşil");
  assert.ok(bulgu, "zorunlu kapı atlandı ama sahte tam-yeşil nöbeti kırmızı olmadı");
  assert.equal(bulgu.tani.duzey, "hata", "A05 terfisi sahte-tam-yeşil tanısına yansımadı");
});

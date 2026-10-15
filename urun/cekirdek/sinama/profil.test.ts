// ═══════════════════════════════════════════════════════════════════════════
// profil.test.ts — 🪪 BKM-OLG-A13 · Profil türü (TIP-1.17 · Founder onayı 2026-10-15)
//
//   Bir proje kökü bir işletmeyi, kurumu ya da müşteriyi temsil ettiğinde onun
//   kimliği tek bir Profil düğümünde yaşar. Bu nöbet türün üç tanısını ölçer:
//     • profil-eksik-alan (UYARI): zorunlu alan yazılmış ama boş ya da yer tutucu.
//       Alanın hiç yazılmadığı hâl genel `eksik-alan` uyarısınındır; aynı olgu
//       iki kez bildirilmez (YUZ-3.3) ve nöbet bunu ayrıca ölçer.
//     • profil-kişisel-veri (HATA): telefon, e-posta, IBAN, kart ve açık adres
//       deseni ile kişi kaydında izinsiz alan. Tanı metni sızan değeri yinelemez.
//     • profil-çift (HATA): aynı proje kökünde ikinci Profil.
//
//   AÇIK DEPO KURALI: fikstürlerdeki bütün değerler uydurmadır. IBAN ve kart
//   numaraları burada denetim haneleri hesaplanarak üretilir; hiçbir gerçek
//   hesaba ya da karta karşılık gelmez.
// ═══════════════════════════════════════════════════════════════════════════

import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { belirtecle } from "../src/belirtec.ts";
import { ayristir } from "../src/ayristirici.ts";
import { dogrula } from "../src/dogrulayici.ts";
import { profilTanilari, kisiselVeriTurleri } from "../src/denetci.ts";
import { denetimKos } from "../src/denetim.ts";
import { siniflamaOrtuMerge, siniflamaOrtuYukle, siniflamaYukle } from "../src/siniflama.ts";
import { taniDilineCevir } from "../src/tani-metinleri.ts";
import type { Program } from "../src/sozdizim.ts";

const KOK = fileURLToPath(new URL("../../..", import.meta.url));
const SNF = siniflamaOrtuMerge(siniflamaYukle(join(KOK, "oz/siniflama/kayit.json")), siniflamaOrtuYukle(KOK));
const coz = (kaynak: string): Program => ayristir(belirtecle(kaynak));
const harita = (g: Record<string, string>): ReadonlyMap<string, Program> =>
  new Map(Object.entries(g).map(([ad, k]) => [ad, coz(k)]));

// ── Uydurma ama denetim hanesi geçerli değerler ─────────────────────────────
/** ISO 13616 mod-97 denetim haneleriyle uydurma bir IBAN üretir. */
function uydurmaIban(ulke: string, bban: string): string {
  const sayisal = (s: string): string => [...s].map((c) => (/[A-Z]/.test(c) ? String(c.charCodeAt(0) - 55) : c)).join("");
  let kalan = 0;
  for (const c of sayisal(bban + ulke + "00")) kalan = (kalan * 10 + Number(c)) % 97;
  return `${ulke}${String(98 - kalan).padStart(2, "0")}${bban}`;
}
/** Luhn denetim hanesiyle uydurma bir kart numarası üretir. */
function uydurmaKart(onbes: string): string {
  let top = 0;
  for (let i = 0; i < 15; i++) {
    let r = Number(onbes[14 - i]);
    if (i % 2 === 0) { r *= 2; if (r > 9) r -= 9; }
    top += r;
  }
  return onbes + String((10 - (top % 10)) % 10);
}
const IBAN = uydurmaIban("TR", "000000000000000000000001");
const KART = uydurmaKart("400000000000000");

/** Temiz, eksiksiz bir Profil — hiçbir tanı doğmamalı. */
const temizProfil = `
-->|
Sürüm 1.2.3 notu 2026-10-15 tarihinde saat 14:30'da yazıldı; iç kod PFL-ORNEK-0001, sipariş 12345.
|<--
Profil( kod: PFL-ORNEK, ad: "Örnek Fırın", ne: "Mahalle ölçeğinde ekmek ve pasta üreten bir fırın.",
        sektör: "gıda", şehir: "Ankara", bölge: "il geneli", görünürlük: gizli,
        hizmetler: [ "ekmek", "pasta" ],
        kanallar: { instagram: "@ornek_firin", site: "ornek-firin.example" },
        kişiler: [ { hitap: "Hanım", rol: "muhatap", sorumluluk: "onay" } ] )`;

test("temiz Profil hiçbir profil tanısı üretmez ve şema uyarısı almaz", () => {
  assert.deepEqual(profilTanilari(harita({ "musteri/profil.sar": temizProfil }), SNF), []);
  const tek = dogrula(coz(temizProfil), SNF, "profil.sar", temizProfil);
  assert.deepEqual(tek.map((t) => t.kod), []);
});

test("Profil bilgi ailesinde kayıtlıdır; Proje, Kitaplık ve Raf altında yaşar", () => {
  const tip = SNF.widgetTipleri.find((t) => t.ad === "Profil");
  assert.equal(tip?.aile, "bilgi");
  for (const ebeveyn of ["Proje", "Kitaplık", "Raf"]) assert.ok(SNF.izinliSarma[ebeveyn].includes("Profil"), ebeveyn);
  assert.deepEqual(SNF.semalar?.Profil?.zorunlu, ["kod", "ad", "ne", "sektör", "şehir"]);
  const kaynak = `Proje( kod: PRJ-ORNEK, ad: "Örnek", ne: "Örnek kök.", rejim: esnek ) {\n${temizProfil}\n}`;
  assert.ok(!dogrula(coz(kaynak), SNF, "ornek_anadizin.sar", kaynak).some((t) => t.kod === "izinsiz-sarma"));
});

test("profil-eksik-alan: boş ya da yer tutucu zorunlu alan uyarı alır", () => {
  const k = `Profil( kod: PFL-ORNEK, ad: "Örnek Fırın", ne: "Fırın.", sektör: "", şehir: "bilinmiyor" )`;
  const t = profilTanilari(harita({ "musteri/profil.sar": k }), SNF);
  assert.equal(t.length, 1);
  assert.equal(t[0].tani.kod, "profil-eksik-alan");
  assert.equal(t[0].tani.duzey, "uyarı");
  assert.match(t[0].tani.mesaj, /sektör/);
  assert.match(t[0].tani.mesaj, /şehir/);
});

test("profil-eksik-alan: hiç yazılmamış alan genel eksik-alan uyarısınındır, iki kez sayılmaz", () => {
  const k = `Profil( kod: PFL-ORNEK, ad: "Örnek Fırın", ne: "Fırın." )`;
  assert.deepEqual(profilTanilari(harita({ "musteri/profil.sar": k }), SNF), []);
  const tek = dogrula(coz(k), SNF, "profil.sar", k);
  assert.ok(tek.some((t) => t.kod === "eksik-alan"));
});

for (const [tur, deger] of [
  ["telefon", "+90 500 000 00 00"],
  ["e-posta", "iletisim@ornek.example"],
  ["IBAN", IBAN.replace(/(.{4})/g, "$1 ").trim()],
  ["kart", KART.replace(/(.{4})/g, "$1 ").trim()],
  ["açık adres", "Örnek Mahallesi Deneme Sokak No: 5"],
] as const) {
  test(`profil-kişisel-veri: ${tur} deseni hata alır ve tanı değeri yinelemez`, () => {
    const k = `Profil( kod: PFL-ORNEK, ad: "Örnek Fırın", ne: "Fırın.", sektör: "gıda", şehir: "Ankara",
                       bölge: "${deger}" )`;
    const t = profilTanilari(harita({ "musteri/profil.sar": k }), SNF);
    assert.equal(t.length, 1, JSON.stringify(t.map((x) => x.tani.kod)));
    assert.equal(t[0].tani.kod, "profil-kişisel-veri");
    assert.equal(t[0].tani.duzey, "hata");
    assert.match(t[0].tani.mesaj, /bölge/);
    // Tanı metni sızan değeri ne Türkçe ne İngilizce yüzde taşır.
    const en = taniDilineCevir(t[0].tani, "en");
    for (const metin of [t[0].tani.mesaj, t[0].tani.oneri ?? "", en.mesaj, en.oneri ?? ""]) {
      assert.ok(!metin.includes(deger), `değer tanı metnine sızdı: ${metin}`);
    }
  });
}

test("profil-kişisel-veri: iç içe kişi ve kanal değerleri ile gövde özellikleri de taranır", () => {
  const k = `Profil( kod: PFL-ORNEK, ad: "Örnek Fırın", ne: "Fırın.", sektör: "gıda", şehir: "Ankara",
    kanallar: { eposta: "siparis@ornek.example" } ) {
    unvan: "Ulaşmak için 0500 000 00 00 aranır."
  }`;
  const t = profilTanilari(harita({ "musteri/profil.sar": k }), SNF);
  assert.deepEqual(t.map((x) => x.tani.kod), ["profil-kişisel-veri", "profil-kişisel-veri"]);
});

test("profil-kişisel-veri: düğümün belge bloğu da taranır", () => {
  const k = `-->|\nSipariş için iletisim@ornek.example adresine yazılır.\n|<--\nProfil( kod: PFL-ORNEK, ad: "Örnek Fırın", ne: "Fırın.", sektör: "gıda", şehir: "Ankara" )`;
  const t = profilTanilari(harita({ "musteri/profil.sar": k }), SNF);
  assert.deepEqual(t.map((x) => [x.tani.kod, x.tani.mesaj.includes('"belge"')]), [["profil-kişisel-veri", true]]);
});

test("profil-kişisel-veri: kişi kaydında hitap, rol ve sorumluluk dışında alan hata alır", () => {
  const k = `Profil( kod: PFL-ORNEK, ad: "Örnek Fırın", ne: "Fırın.", sektör: "gıda", şehir: "Ankara",
    kişiler: [ { hitap: "Bey", rol: "muhatap", soyad: "Yazılmamalı" } ] )`;
  const t = profilTanilari(harita({ "musteri/profil.sar": k }), SNF);
  assert.equal(t.length, 1);
  assert.equal(t[0].tani.kod, "profil-kişisel-veri");
  assert.match(t[0].tani.mesaj, /soyad/);
  assert.ok(!t[0].tani.mesaj.includes("Yazılmamalı"));
});

test("sıradan sayı dizileri kişisel veri sayılmaz: tarih, sürüm, kod, saat ve kısa sayılar", () => {
  for (const deger of ["2026-10-15", "2026-10-15 14:30", "2026-10-15 12 kişi", "15.10.2026 10 adet", "1.2.3", "PFL-ORNEK-0001", "12345", "0.9.193", "v2026.10.15", "10-20 kişi", "No kuralı"]) {
    assert.deepEqual(kisiselVeriTurleri(deger), [], deger);
  }
  // Denetim hanesi tutmayan uzun sayılar IBAN ya da kart sayılmaz.
  assert.deepEqual(kisiselVeriTurleri("TR00 0000 0000 0000 0000 0000 01"), []);
});

// ── Bağımsız inceleme bulguları (2026-10-15): yanlış pozitifler ve kaçaklar ──
test("adres: tek başına sokak, cadde ya da No: sözcüğü ve semt anması adres sayılmaz", () => {
  for (const deger of [
    "Sokak lezzetleri sunan bir büfe", "sokak yemekleri", "Ana cadde üzerinde", "Sokak hayvanları derneği",
    "Sipariş No: 5 ile takip edilir", "Karar No. 3 uyarınca", "Fatura no:2026001",
    "Bağdat Caddesi'nin sevilen kafesi", "Moda Mahallesi'nde 2015'ten beri",
    // Üçüncü tur: kesirli sayı ya da "no" yer adının hemen ardında değilse adres değildir.
    "Mahalle ölçeğinde 24/7 hizmet veren fırın", "Cadde üzerinde 7/24 açık", "Bulvar şubesi 2/3 kapasiteyle",
    "Sokak lezzetlerinde no 1 marka", "sokak sanatı festivali No. 4", "Cadde 24/7 açık", "Sokak 7/24 hizmet",
  ]) {
    assert.deepEqual(kisiselVeriTurleri(deger), [], deger);
  }
  // Belge bloğunda da aynı ölçü geçerlidir.
  const k = `-->|\nFatura no:2026001 ile kesilir; Sokak lezzetleri sunulur.\n|<--\nProfil( kod: PFL-ORNEK, ad: "Örnek Büfe", ne: "Büfe.", sektör: "sokak yemekleri", şehir: "Ankara" )`;
  assert.deepEqual(profilTanilari(harita({ "musteri/profil.sar": k }), SNF), []);
});

test("adres: sokak ya da mahalle adı ile kapı numarası aynı satırda birlikte geçince yakalanır", () => {
  for (const deger of [
    "Deneme Sokak No: 5", "Örnek Mahallesi No:12 Daire 3", "Deneme Caddesi No. 7", "Uydurma Bulvarı 14/2",
    "Mah. Deneme Sk. No:3/1", "Örnek Cad. No 12 Kat 3", "Örnek Sk. 14/2", "Atatürk Blv. No:10", "Deneme Sokağı No:3",
  ]) {
    assert.deepEqual(kisiselVeriTurleri(deger), ["açık adres"], deger);
  }
});

test("telefon: tireli kodlar, uzun kimlikler ve sıradan sayı dizileri telefon sayılmaz", () => {
  for (const deger of [
    "SIP-20261015-0001", "ORD-2026-1015-001", "SIP_05001234567", "VKN 1234567890", "vergi no 1234567890", "vergi no 0123456789",
    "ISBN 978-0-000-00000-2", "GTIN 8690000000001", "barkod 012345678905", "20261015143000",
    "2026-10-15T14:30:00Z", "2026-2027-2028 dönemi", "1 2 3 4 5 6 7 8 9 10", "ciro 2 500 000 000 TL",
  ]) {
    assert.deepEqual(kisiselVeriTurleri(deger), [], deger);
  }
});

test("telefon: gerçekçi biçimli uydurma numaralar yakalanmaya devam eder, dokuz hane telefon değildir", () => {
  for (const deger of [
    "0 500 000 00 00", "0500 000 00 00", "05000000000", "+90 500 000 00 00", "+49 30 0000 0000", "(0500) 000 00 00",
    // Üçüncü tur: etiketli yazım, sıfırsız GSM, 90 önekli on iki hane ve noktalı ayraç.
    "Tel-05001234567", "WA-0500 000 00 00", "whatsapp_05001234567", "tel.05000000000", "GSM: 0500 000 00 00",
    "500 000 00 00", "(500) 000 00 00", "5000000000", "905000000000", "90 500 000 00 00", "0500.000.00.00",
    "Aramak için 0500 000 00 00.",
  ]) {
    assert.deepEqual(kisiselVeriTurleri(deger), ["telefon"], deger);
  }
  assert.deepEqual(kisiselVeriTurleri("0 500 000 00"), [], "dokuz haneli dizi telefon sayılmamalı");
  // Ayraçlı yazımda sekiz haneden uzun grup bir kimlik numarasıdır, telefon değildir.
  for (const deger of ["0500 123456789", "0 1234567890", "+7 123456789012"]) {
    assert.deepEqual(kisiselVeriTurleri(deger), [], deger);
  }
});

test("kart: Luhn tutmayan on altı haneli gruplu dizi kart sayılmaz", () => {
  const bozuk = KART.slice(0, 15) + String((Number(KART[15]) + 1) % 10);
  assert.deepEqual(kisiselVeriTurleri(bozuk.replace(/(.{4})/g, "$1 ").trim()), []);
});

test("kişiler düz metin yazılınca yapısız kişi kaydı hatası doğar", () => {
  const k = `Profil( kod: PFL-ORNEK, ad: "Örnek Fırın", ne: "Fırın.", sektör: "gıda", şehir: "Ankara", kişiler: "Deneme Kişi Bey" )`;
  const t = profilTanilari(harita({ "musteri/profil.sar": k }), SNF);
  assert.deepEqual(t.map((x) => x.tani.kod), ["profil-kişisel-veri"]);
  assert.match(t[0].tani.mesaj, /yapısız/);
  assert.ok(!t[0].tani.mesaj.includes("Deneme Kişi Bey"));
});

test("profil-çift: aynı proje kökünde ikinci Profil hata alır, kardeş kök etkilenmez", () => {
  const ana = (kod: string) => `Proje( kod: ${kod}, ad: "Kök", ne: "Kök.", rejim: esnek )`;
  const prf = (kod: string) => `Profil( kod: ${kod}, ad: "Örnek", ne: "Örnek.", sektör: "gıda", şehir: "Ankara" )`;
  const t = profilTanilari(harita({
    "a/a_anadizin.sar": ana("PRJ-A"),
    "a/profil.sar": prf("PFL-A"),
    "a/yasa/ikinci.sar": prf("PFL-A2"),
    "b/b_anadizin.sar": ana("PRJ-B"),
    "b/profil.sar": prf("PFL-B"),
  }), SNF);
  assert.equal(t.length, 1);
  assert.equal(t[0].tani.kod, "profil-çift");
  assert.equal(t[0].tani.duzey, "hata");
  assert.equal(t[0].dosya, "a/yasa/ikinci.sar");
});

test("profil-çift: Proje gövdesine iç içe yazılan Profil o Projeye sayılır", () => {
  const k = `Proje( kod: PRJ-A, ad: "Kök", ne: "Kök.", rejim: esnek ) {
    Profil( kod: PFL-A, ad: "Örnek", ne: "Örnek.", sektör: "gıda", şehir: "Ankara" )
    Profil( kod: PFL-A2, ad: "Örnek", ne: "Örnek.", sektör: "gıda", şehir: "Ankara" )
  }`;
  const t = profilTanilari(harita({ "a/a_anadizin.sar": k }), SNF);
  assert.deepEqual(t.map((x) => x.tani.kod), ["profil-çift"]);
});

test("ders dünyası ve muaf dosyalar OGR-5 uyarınca muaftır", () => {
  const k = `Profil( kod: PFL-ORNEK, ad: "Örnek", ne: "Örnek.", sektör: "", şehir: "Ankara", bölge: "iletisim@ornek.example" )`;
  assert.deepEqual(profilTanilari(harita({ "ogreti/ornek/format/profil.sar": k }), SNF), []);
  assert.deepEqual(profilTanilari(harita({ "musteri/profil.sar": k }), SNF, new Set(["musteri/profil.sar"])), []);
});

test("uçtan uca: proje denetimi kişisel veri taşıyan Profili hatayla bildirir", () => {
  const kok = mkdtempSync(join(tmpdir(), "sarmal-profil-"));
  try {
    writeFileSync(join(kok, "ornek_anadizin.sar"),
      'Proje( kod: PRJ-ORN, ad: "Örnek", ne: "Örnek kök.", rejim: esnek ) {\n  Kitaplık( kod: KTP-IS, yol: "is/", ne: "işin kitaplığı" ) {\n    Raf( kod: RAF-KIMLIK, yol: "kimlik/", ne: "kimlik rafı" )\n  }\n}\n');
    mkdirSync(join(kok, "is", "kimlik"), { recursive: true });
    writeFileSync(join(kok, "is", "kimlik", "profil.sar"),
      'Profil( kod: PFL-ORN, ad: "Örnek Fırın", ne: "Fırın.", sektör: "gıda", şehir: "Ankara", bölge: "iletisim@ornek.example" )\n');
    const s = denetimKos(kok, { snfYol: join(KOK, "oz/siniflama/kayit.json"), tamListe: true });
    const kodlar = s.akis.flatMap((r) => r.tanilar.map((t) => t.kod));
    assert.ok(kodlar.includes("profil-kişisel-veri"), kodlar.join(" · "));
    assert.ok(s.toplamHata >= 1);
  } finally {
    rmSync(kok, { recursive: true, force: true });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// kimlik.test.ts — Kimlik indeksi güvence sınamaları (EKL-F11-A01/A05)
//
//   Kabul maddelerinin saf kanıtı:
//     • tanım + atıf + silme senaryoları
//     • ARTIMLI: dosyaGuncelle yalnız o dosyanın kaydını değiştirir
//     • kırık dosyada metin katmanı yaşar (atıflar kaybolmaz)
//     • yanlış-pozitif nöbeti: tarih/tek-parça sözceler kod sayılmaz
//   (A05'te eklenti/sinama'dan çekirdeğe taşındı — modül artık üç yüzü besliyor:
//    eklenti F12/⇧F12 · MCP `gezin` · CLI `sarmal gezin`.)
//   Koşum: cd cekirdek && npm test
// ═══════════════════════════════════════════════════════════════════════════

import { test } from "node:test";
import assert from "node:assert/strict";
import { KimlikIndeksi, dosyayiTara, gezinRaporu, dugumBaglami } from "../src/kimlik.ts";
import { belirtecle } from "../src/belirtec.ts";
import { ayristir } from "../src/ayristirici.ts";

const PLAN = `// Yorumda atıf: BKM-ARC-A02 raporundan indi.
Faz( kod: EKL-F11, ad: "ide-asinalik" ) {
  Adım( kod: EKL-F11-A01, durum: beklemede, bağımlı: [] )
  Adım( kod: EKL-F11-A02, durum: beklemede, bağımlı: [ EKL-F11-A01 ],
        ne: "🎯 EKL-F11-A01 indeksi üstüne F12 gelir (2026-07-11)" )
}
`;

test("tanımlar: kod: parametresi DEĞER konumuyla bulunur", () => {
  const i = new KimlikIndeksi();
  i.dosyaGuncelle("plan.sar", PLAN);
  const t = i.tanimlar("EKL-F11-A01");
  assert.equal(t.length, 1);
  assert.equal(t[0].tip, "Adım");
  assert.equal(t[0].dosya, "plan.sar");
  assert.equal(t[0].satir, 3);
  assert.equal(t[0].sutun, PLAN.split("\n")[2].indexOf("EKL-F11-A01") + 1);
});

test("atıflar: bağımlı listesi + metin içi + yorum içi bulunur, tanım satırı HARİÇ", () => {
  const i = new KimlikIndeksi();
  i.dosyaGuncelle("plan.sar", PLAN);
  const a = i.atiflar("EKL-F11-A01");
  const satirlar = a.map((x) => x.satir).sort();
  assert.deepEqual(satirlar, [4, 5]);            // bağımlı: (4) + ne: metni (5); tanım satırı 3 yok
  const yorum = i.atiflar("BKM-ARC-A02");
  assert.equal(yorum.length, 1);                  // yorumdaki atıf da görünür
  assert.equal(yorum[0].satir, 1);
});

test("atıf konumu SÜTUN hassasiyetiyle döner (rename temeli)", () => {
  const i = new KimlikIndeksi();
  i.dosyaGuncelle("plan.sar", PLAN);
  const bagimli = i.atiflar("EKL-F11-A01").find((x) => x.satir === 4);
  assert.ok(bagimli);
  assert.equal(bagimli.sutun, PLAN.split("\n")[3].indexOf("EKL-F11-A01") + 1);
});

test("çağır düğümü atıftır (DIL-1.4)", () => {
  const i = new KimlikIndeksi();
  i.dosyaGuncelle("a.sar", `Proje( kod: P-1, ad: "x" ) {\n  çağır ORTAK-KIMLIK\n}\n`);
  assert.equal(i.atiflar("ORTAK-KIMLIK").length, 1);
});

test("artımlı: dosyaGuncelle yalnız o dosyayı değiştirir, eski kayıt düşer", () => {
  const i = new KimlikIndeksi();
  i.dosyaGuncelle("a.sar", `Adım( kod: ESKI-A01, durum: beklemede )`);
  i.dosyaGuncelle("b.sar", `Adım( kod: B-A01, durum: beklemede, bağımlı: [ ESKI-A01 ] )`);
  i.dosyaGuncelle("a.sar", `Adım( kod: YENI-A01, durum: beklemede )`);   // a.sar yeniden
  assert.equal(i.tanimlar("ESKI-A01").length, 0);   // eski tanım düştü
  assert.equal(i.tanimlar("YENI-A01").length, 1);
  assert.equal(i.atiflar("ESKI-A01").length, 1);    // b.sar'a DOKUNULMADI (dosya-yerel)
  assert.equal(i.dosyaSayisi(), 2);
});

test("dosyaSil: kayıtlar tamamen gider", () => {
  const i = new KimlikIndeksi();
  i.dosyaGuncelle("a.sar", PLAN);
  i.dosyaSil("a.sar");
  assert.equal(i.dosyaSayisi(), 0);
  assert.equal(i.tanimlar("EKL-F11-A01").length, 0);
  assert.equal(i.atiflar("EKL-F11-A01").length, 0);
});

test("kırık dosyada metin katmanı yaşar: atıflar söz-dizim hatasına rağmen bulunur", () => {
  const i = new KimlikIndeksi();
  i.dosyaGuncelle("bozuk.sar", `// K-85 göçü notu\nAdım( kod: X-1, durum:`); // kapanmamış
  assert.equal(i.atiflar("K-85").length, 1);        // yorum atıfı sağ
  assert.equal(i.tanimlar("X-1").length, 0);        // AST yok → tanım yok (bilinçli sınır)
});

test("yanlış-pozitif nöbeti: tarih, tek-parça ve bitişik sözceler kod sayılmaz", () => {
  const k = dosyayiTara(`Adım( kod: A-1, ne: "2026-07-11 tarihinde TAM-yeşil geçti; TAM ayrıca x-K-85 bitişik" )`);
  const metinler = k.adaylar.map((a) => a.metin);
  assert.ok(!metinler.includes("2026-07-11"));      // harfsiz → kod değil
  assert.ok(!metinler.includes("TAM"));             // tek parça → kod değil
  assert.ok(!metinler.includes("K-85"));            // bitişik (x-K-85) → sınır ihlali
});

test("Türkçe büyük harfli kodlar tanınır (İŞ-AKIŞI)", () => {
  const i = new KimlikIndeksi();
  i.dosyaGuncelle("a.sar", `Adım( kod: A-1, ne: "İŞ-AKIŞI yasasına uyar" )`);
  assert.equal(i.atiflar("İŞ-AKIŞI").length, 1);
});

test("süzgeç: sorgular dosya süzgeciyle daraltılır (YAS-3.3 varlık sınırı temeli)", () => {
  const i = new KimlikIndeksi();
  i.dosyaGuncelle("/is/_Sarmal/a.sar", `Adım( kod: S-1, bağımlı: [ ORTAK-K1 ] )`);
  i.dosyaGuncelle("/is/_KapaliUrun/b.sar", `Adım( kod: O-1, bağımlı: [ ORTAK-K1 ] )`);
  assert.equal(i.atiflar("ORTAK-K1").length, 2);
  const sarmalda = i.atiflar("ORTAK-K1", (d) => d.startsWith("/is/_Sarmal/"));
  assert.equal(sarmalda.length, 1);
  assert.equal(sarmalda[0].dosya, "/is/_Sarmal/a.sar");
});

test("Tip/Kural tanımı adıyla indekse girer, konum AD’a hizalıdır (DIL-3 ile TIP-1)", () => {
  const i = new KimlikIndeksi();
  const tanim = `Tip ANY-KODLAMA-AKISI( taban: Blok ) { ne: "akış tabanı" }`;
  i.dosyaGuncelle("t.sar", tanim);
  i.dosyaGuncelle("k.sar", `Blok( kod: B-1, uygular: ANY-KODLAMA-AKISI, ad: "x" )`);
  const t = i.tanimlar("ANY-KODLAMA-AKISI");
  assert.equal(t.length, 1);
  assert.equal(t[0].tip, "tipTanım");
  assert.equal(t[0].sutun, tanim.indexOf("ANY-") + 1);      // "Tip" değil, AD vurgulanır
  assert.equal(i.atiflar("ANY-KODLAMA-AKISI").length, 1);   // uygular: atıfı
});

test("dosyaVar: gezinme tazelemesinin 'ilk görüş' kararı", () => {
  const i = new KimlikIndeksi();
  assert.equal(i.dosyaVar("a.sar"), false);
  i.dosyaGuncelle("a.sar", `Adım( kod: A-1, durum: beklemede )`);
  assert.equal(i.dosyaVar("a.sar"), true);
});

test("A03: tanım kardeş ad: değerini taşır — Ctrl+T ad-araması temeli", () => {
  const i = new KimlikIndeksi();
  i.dosyaGuncelle("plan.sar", PLAN);
  const t = i.tanimlar("EKL-F11");
  assert.equal(t.length, 1);
  assert.equal(t[0].ad, "ide-asinalik");            // Faz'ın ad: parametresi
  assert.equal(i.tanimlar("EKL-F11-A01")[0].ad, undefined);   // ad'sız Adım → undefined
});

test("YUZ-3.2: .md/.ts yalnız ATIF katmanı — atıf bulunur, tanım asla üremez", () => {
  const i = new KimlikIndeksi();
  i.dosyaGuncelle("plan.sar", `Adım( kod: EKL-F11-A01, durum: tamamlandı )`);
  i.dosyaGuncelle("KARARLAR.md", `### K-86 · EKL-F11-A01 buradan doğdu\nkod: SAHTE-TANIM-A01 gibi görünse de md'de tanım üremez.`);
  i.dosyaGuncelle("kimlik.ts", `// EKL-F11-A01 indeksi bu modülde yaşar`);
  const a = i.atiflar("EKL-F11-A01").map((x) => x.dosya).sort();
  assert.deepEqual(a, ["KARARLAR.md", "kimlik.ts"]);        // iki atıf evreni de görünür
  assert.equal(i.tanimlar("SAHTE-TANIM-A01").length, 0);    // md'deki kod: SATIRI tanım değil
  assert.equal(i.tanimlar("EKL-F11-A01").length, 1);        // tanım yalnız .sar'dan
});

test("gezinRaporu: tanım+atıf raporu · kırık atıf · hiç-geçmeyen kod (MCP/CLI yüzü)", () => {
  const i = new KimlikIndeksi();
  i.dosyaGuncelle("plan.sar", PLAN);
  const rapor = gezinRaporu(i, "EKL-F11-A01");
  assert.ok(rapor.includes("TANIM (1)"));
  assert.ok(rapor.includes("plan.sar:3"));
  assert.ok(rapor.includes("ATIFLAR — gelen (2)"));   // HTR-A06: başlık "gelen" ile netleşti
  // tanımı olmayan ama atfı olan kod → kırık-atıf uyarısı
  const kirik = gezinRaporu(i, "BKM-ARC-A02");
  assert.ok(kirik.includes("TANIM: yok"));
  // hiç geçmeyen kod → dürüst ✖
  assert.ok(gezinRaporu(i, "YOK-BOYLE-KOD").startsWith("✖"));
});

// ── HTR-A06 (IDA dogfood oturum-2 · DOC-4): gezin GİDEN kenar + smell yumuşatma ──
test("HTR-A06: gezin GİDEN çıkış kenarlarını gösterir (hatırlat/bağımlı/besler/üretir)", () => {
  const i = new KimlikIndeksi();
  i.dosyaGuncelle("h.sar", 'Hatırlatıcı( kod: HTR-X, durum: kararlaştı, çapa: mimari, hatırlat: ADM-Y, dönüşTetikleyici: "olay", ne: "n" )\nAdım( kod: ADM-Z, bağımlı: [ ADM-Y ], ne: "z" )');
  const g = i.giden("HTR-X");
  assert.equal(g.length, 1);
  assert.equal(g[0].hedef, "ADM-Y");
  assert.equal(g[0].kenar, "hatırlat");
  const rapor = gezinRaporu(i, "HTR-X");
  assert.match(rapor, /GİDEN — çıkış kenarları \(1\)/);
  assert.match(rapor, /→ ADM-Y \[hatırlat\]/);
});

test("HTR-A06: 0-gelen + GİDEN'li düğüm 'ileri-bağlama' der (ölü-kod smell YOK)", () => {
  const i = new KimlikIndeksi();
  // HTR-Z'ye kimse atıf vermez; o ADM-Q'ya hatırlat eder (forward-binding)
  i.dosyaGuncelle("h.sar", 'Hatırlatıcı( kod: HTR-Z, durum: kararlaştı, çapa: gelecek, hatırlat: ADM-Q, dönüşTetikleyici: "x", ne: "n" )');
  const rapor = gezinRaporu(i, "HTR-Z");
  assert.match(rapor, /İLERİ-BAĞLAMA düğümü/, "forward-binding smell yumuşatması");
  assert.doesNotMatch(rapor, /kimse kullanmıyor/, "ölü-kod smell'i basılmamalı");
});

test("HTR-A06: gerçekten yetim (0-gelen + 0-giden) düğüm mevcut 'kimse kullanmıyor' uyarısını korur", () => {
  const i = new KimlikIndeksi();
  i.dosyaGuncelle("h.sar", 'Karar( kod: KRR-YETIM, durum: kilitli, karar: "x", gerekçe: "y", ne: "n" )');
  const rapor = gezinRaporu(i, "KRR-YETIM");
  assert.match(rapor, /kimse kullanmıyor/, "gerçek yetimde mevcut uyarı korunur");
});

// ── NTK-A06 · BAĞLAM KARTI: bir kodun çevresi tek çağrıda ────────────────────
test("bağlam kartı: üst zincir + kardeşler + koni özeti tek raporda (NTK-A06)", () => {
  const kaynak = `Faz( kod: FZ-K, ad: "kart fazı", hedefTarih: "belirsiz", ne: "f" ) {
  Blok( kod: BLK-K, ad: "kart bloğu", ne: "b" ) {
    Katman( kod: KAT-K, ad: "kart katmanı", ne: "k" ) {
      Adım( kod: ADM-K1, durum: beklemede, ne: "birinci iş — kart hedefi", bağımlı: [ ADM-K2 ], kabul: [ "a", "b" ] )
      Adım( kod: ADM-K2, durum: tamamlandı, ne: "ikinci iş" )
    }
  }
}`;
  const b = dugumBaglami(kaynak, "ADM-K1");
  assert.ok(b, "bağlam bulunmalı");
  assert.deepEqual(b!.zincir.map((z) => z.kod), ["FZ-K", "BLK-K", "KAT-K"], "üst zincir kökten ebeveyne");
  assert.deepEqual(b!.kardesler.map((k) => k.kod), ["ADM-K2"], "kardeş listelenir, kendisi listelenmez");
  const alanlar = new Map(b!.alanlar);
  assert.equal(alanlar.get("durum"), "beklemede");
  assert.equal(alanlar.get("bağımlı"), "ADM-K2");
  assert.equal(alanlar.get("kabul"), "2 ölçüt");

  // Rapor yüzü: kart, gezin çıktısına iner (dosyaOku enjekte — dosya diskte olmadan test edilir).
  const i = new KimlikIndeksi();
  i.dosyaGuncelle("/kart/plan.sar", kaynak);
  const rapor = gezinRaporu(i, "ADM-K1", () => kaynak);
  assert.ok(rapor.includes("BAĞLAM KARTI:"), rapor);
  assert.ok(rapor.includes("üst zincir: Faz FZ-K (kart fazı) › Blok BLK-K (kart bloğu) › Katman KAT-K (kart katmanı)"), rapor);
  assert.ok(rapor.includes("kardeşler (1): Adım ADM-K2"), rapor);
});

test("bağlam kartı: okuyucu verilmezse rapor ESKİ davranışıyla yaşar (geriye uyumluluk)", () => {
  const i = new KimlikIndeksi();
  i.dosyaGuncelle("/kart/plan.sar", 'Adım( kod: ADM-TEK, durum: beklemede, ne: "t" )');
  const rapor = gezinRaporu(i, "ADM-TEK");
  assert.ok(!rapor.includes("BAĞLAM KARTI:"), "okuyucusuz çağrıda kart üretilmez");
  assert.ok(rapor.includes("TANIM (1):"));
});

// ── KPN-A01 · Varlık/şablon sınır bilinci (Founder onayı 2026-07-19: sınır+etiket) ──
test("KPN-A01: gezinmeSuzgeci — ürün kaynağı şablon kopyasını süzer, YAS-3.3 varlık sınırı ve köksüz görünürlük yaşar", async () => {
  const { gezinmeSuzgeci } = await import("../src/kimlik.ts");
  const varlik = (y: string) => y.startsWith("/ws/sarmal/") ? "/ws/sarmal" : y.startsWith("/ws/os/") ? "/ws/os" : undefined;
  const s = gezinmeSuzgeci("/ws/sarmal/plan/is.sar", varlik);
  assert.equal(s("/ws/sarmal/sablon/proje.sar"), false, "ders kopyası ürün gezinmesine girmez");
  assert.equal(s("/ws/sarmal/sarmal_anadizin.sar"), true, "gerçek tanım görünür");
  assert.equal(s("/ws/os/os_anadizin.sar"), false, "çapraz varlık süzülür (YAS-3.3)");
  assert.equal(s("/ws/koksuz/notlar.sar"), true, "köksüz dosya hep görünür (YAS-3.3 deseni)");
  const d = gezinmeSuzgeci("/ws/sarmal/sablon/proje.sar", varlik);
  assert.equal(d("/ws/sarmal/sablon/dogus/anadizin.sar"), true, "ders kaynağı kendi evreninde serbest gezinir");
  assert.equal(d("/ws/sarmal/sablon/proje.sar"), true, "kaynak dosyanın kendisi her zaman görünür");
  const k = gezinmeSuzgeci("/tmp/tek.sar", varlik);
  assert.equal(k("/ws/sarmal/sablon/proje.sar"), false, "köksüz ürün kaynağında da ders süzmesi yaşar");
  assert.equal(k("/ws/os/plan/a.sar"), true, "köksüz kaynak varlık sınırı çizmez");
});

test("KPN-A01: bolgeEtiketi — ders bölgeleri rozetli, varlık adı çözücüden, çözümsüz köksüz", async () => {
  const { bolgeEtiketi } = await import("../src/kimlik.ts");
  const ad = (y: string) => y.includes("sarmal") ? "sarmal" : undefined;
  assert.equal(bolgeEtiketi("/x/sablon/proje.sar", ad), "📋 şablon");
  assert.equal(bolgeEtiketi("/x/ornek/vitrin.sar", ad), "🎓 örnek dünyası");
  assert.equal(bolgeEtiketi("/ws/sarmal/plan/is.sar", ad), "🧭 sarmal");
  assert.equal(bolgeEtiketi("/baska/yer.sar", ad), "🧭 köksüz");
});

test("KPN-A01: gezinRaporu çok-tanımda rozet basar ve uyarı şablon/varlık/drift ayrımını öğretir", async () => {
  const { bolgeEtiketi } = await import("../src/kimlik.ts");
  const i = new KimlikIndeksi();
  i.dosyaGuncelle("/ws/sarmal/sarmal_anadizin.sar", 'Raf( kod: RAF-PLAN, yol: "plan/", ne: "x" )');
  i.dosyaGuncelle("/ws/sarmal/sablon/proje.sar", 'Raf( kod: RAF-PLAN, yol: "plan/", ne: "y" )');
  const rapor = gezinRaporu(i, "RAF-PLAN", undefined, (d) => bolgeEtiketi(d, () => "sarmal"));
  assert.ok(rapor.includes("TANIM (2)"), rapor);
  assert.ok(rapor.includes("📋 şablon"), "şablon kopyası rozetli olmalı");
  assert.ok(rapor.includes("🧭 sarmal"), "gerçek tanım varlık rozetli olmalı");
  assert.ok(/rozetlere bak/.test(rapor), "çok-tanım uyarısı rozet ayrımını öğretmeli");
});

// ═══════════════════════════════════════════════════════════════════════════
// ORK-4 · ÇAPRAZ-PROJE AD ALANI (KPS-ADA-A01)
//
//   İki hüküm AYRI AYRI nöbete bağlanır ve her biri kendi mutasyonuyla
//   kanıtlanır. Birincisi ad alanlı çözümdür: `PRJ-A::KOD-X` yalnız o Projenin
//   kapsamında aranır. İkincisi küresel eşleşme yasağıdır: niteliksiz bir KOD
//   başka bir Projedeki eş adlı tanıma tesadüfen bağlanamaz.
//
//   MUTASYON KANITI — AD ALANLI ÇÖZÜM. `adAlaniAyir` işlevindeki ayırma satırı
//   kodu olduğu gibi geri döndürecek biçimde bozulduğunda (yani ad alanı hiç
//   ayrıştırılmadığında) "ad alanlı hedef yalnız kendi projesinde çözülür"
//   sınaması KIRILIR: hedef artık niteliksiz sayılır ve kaynağın kendi
//   projesinde aranıp bulunamaz.
//
//   MUTASYON KANITI — KÜRESEL EŞLEŞME YASAĞI. `adAlaniKapsamiKur` içindeki
//   niteliksiz dalın kapsam karşılaştırması `true` döndürecek biçimde
//   gevşetildiğinde "niteliksiz kod kardeş projeye bağlanmaz" sınaması KIRILIR:
//   çözücü sarmaldaki tanımı komşu projeden meşru sayar. İki mutasyon ayrı
//   sınamaları düşürür; hiçbiri ötekinin yerini tutmaz.
// ═══════════════════════════════════════════════════════════════════════════

test("ORK-4: adAlaniAyir ad alanını ayırır, yarım yazımı niteliksiz sayar", async () => {
  const { adAlaniAyir } = await import("../src/kimlik.ts");
  assert.deepEqual(adAlaniAyir("PRJ-SARMAL::FAZ-2026-AGUSTOS"),
    { adAlani: "PRJ-SARMAL", yerel: "FAZ-2026-AGUSTOS" });
  assert.deepEqual(adAlaniAyir("FAZ-2026-AGUSTOS"), { yerel: "FAZ-2026-AGUSTOS" });
  assert.deepEqual(adAlaniAyir("::FAZ-X"), { yerel: "::FAZ-X" }, "başta ayraç ad alanı doğurmaz");
  assert.deepEqual(adAlaniAyir("PRJ-X::"), { yerel: "PRJ-X::" }, "sonda ayraç ad alanı doğurmaz");
  assert.deepEqual(adAlaniAyir("A-1::B-2::C-3"), { yerel: "A-1::B-2::C-3" }, "iki kademe geçersiz");
});

test("ORK-4: kapsam öneki klasör ayırıcısıyla biter — ad benzeri kardeş kök kapsanmaz", async () => {
  const { kapsamOneki, onekKapsar } = await import("../src/kimlik.ts");
  assert.equal(kapsamOneki("sarmal/sarmal_anadizin.sar"), "sarmal/");
  assert.equal(kapsamOneki("anadizin.sar"), "", "kök dosyanın öneki boştur");
  assert.equal(onekKapsar("sarmal/", "sarmal/is/plan/faz.sar"), true);
  assert.equal(onekKapsar("sarmal/", "sarmal-arsiv/is/plan/faz.sar"), false,
    "ad benzerliği taşıyan kardeş kök kapsanan sayılamaz");
  assert.equal(onekKapsar("", "her/hangi/dosya.sar"), true, "boş önek her dosyayı kapsar");
});

/** Founder'ın 2026-08-29 tarihinde canlı yakaladığı kusurun fikstür ikizi: tek
 *  Fazı olan bir açık projeye, kapalı bir projeden aynı adla bağlanan Blok. */
const CATI_PROGRAMLARI = (): Map<string, ReturnType<typeof ayristirKaynak>> => new Map([
  ["sarmal/sarmal_anadizin.sar", ayristirKaynak('Proje( kod: PRJ-SARMAL, ad: "Sarmal", rejim: katı )')],
  ["sarmal/is/plan/faz/faz.sar", ayristirKaynak('Faz( kod: FAZ-2026-AGUSTOS, ad: "Çatı Mevsimi" )')],
  ["komsu/komsu_anadizin.sar", ayristirKaynak('Proje( kod: PRJ-KOMSU, ad: "Komşu Proje", rejim: katı )')],
  ["komsu/plan/govde.sar", ayristirKaynak('Blok( kod: BLK-KOMSU-GOVDE, mevsim: FAZ-2026-AGUSTOS )')],
]);

function ayristirKaynak(kaynak: string) {
  return ayristir(belirtecle(kaynak));
}

test("ORK-4: niteliksiz kod kardeş projeye BAĞLANMAZ (küresel eşleşme yasağı)", async () => {
  const { adAlaniKapsamiKur, projeKapsamlari } = await import("../src/kimlik.ts");
  const programlar = CATI_PROGRAMLARI();
  const kapsam = adAlaniKapsamiKur({
    kapsamlar: projeKapsamlari(programlar),
    tanimDosyalari: (kod) => kod === "FAZ-2026-AGUSTOS" ? ["sarmal/is/plan/faz/faz.sar"] : [],
    kardesler: [],
  });
  assert.equal(kapsam.cozulur("FAZ-2026-AGUSTOS", "sarmal/is/plan/rayda/yayin.sar"), true,
    "kendi projesindeki tanım çözülür");
  assert.equal(kapsam.cozulur("FAZ-2026-AGUSTOS", "komsu/plan/govde.sar"), false,
    "başka projedeki eş adlı tanım tesadüfî eşleşmedir ve bağ sayılmaz");
});

test("ORK-4: ad alanlı hedef YALNIZ o projenin kapsamında çözülür", async () => {
  const { adAlaniKapsamiKur, projeKapsamlari } = await import("../src/kimlik.ts");
  const programlar = CATI_PROGRAMLARI();
  const kapsam = adAlaniKapsamiKur({
    kapsamlar: projeKapsamlari(programlar),
    tanimDosyalari: (kod) => kod === "FAZ-2026-AGUSTOS" ? ["sarmal/is/plan/faz/faz.sar"] : [],
    kardesler: [],
  });
  assert.equal(kapsam.cozulur("PRJ-SARMAL::FAZ-2026-AGUSTOS", "komsu/plan/govde.sar"), true,
    "açıkça yazılmış ad alanı proje sınırını meşru biçimde geçer");
  assert.equal(kapsam.cozulur("PRJ-KOMSU::FAZ-2026-AGUSTOS", "komsu/plan/govde.sar"), false,
    "ad alanı yanlış projeyi gösteriyorsa hedef çözülmez");
  assert.equal(kapsam.cozulur("PRJ-YOK::FAZ-2026-AGUSTOS", "komsu/plan/govde.sar"), false,
    "ilan edilmemiş ad alanı bağ doğurmaz");
});

test("ORK-4: ad alanı yüklü değilse çatının duyurduğu kardeş kökten okunur", async () => {
  const { adAlaniKapsamiKur } = await import("../src/kimlik.ts");
  const kapsam = adAlaniKapsamiKur({
    kapsamlar: [{ kod: "PRJ-LABORATUVAR", onek: "", dosya: "laboratuvar_anadizin.sar" }],
    tanimDosyalari: () => [],
    kardesler: [{ kod: "PRJ-SARMAL", kok: "/ws/sarmal" }],
    kardesKodlari: (kok) => new Set(kok === "/ws/sarmal" ? ["FAZ-2026-AGUSTOS"] : []),
  });
  assert.equal(kapsam.cozulur("PRJ-SARMAL::FAZ-2026-AGUSTOS", "plan/bulgu.sar"), true);
  assert.equal(kapsam.cozulur("PRJ-SARMAL::FAZ-YOK", "plan/bulgu.sar"), false,
    "kardeş kökte tanımlı olmayan yerel kod çözülmez");
  assert.equal(kapsam.kardesKok("PRJ-SARMAL"), "/ws/sarmal");
  assert.equal(kapsam.kardesKok("PRJ-YOK"), undefined);
});

test("ORK-4: proje kapsamı en uzun önekten çözülür; ders dünyası kök saymaz", async () => {
  const { projeKapsamlari, sahipProjeKapsami } = await import("../src/kimlik.ts");
  const programlar = new Map([
    ["sarmal/sarmal_anadizin.sar", ayristirKaynak("Proje( kod: PRJ-SARMAL, rejim: katı )")],
    ["sarmal/ogreti/ornek/ders_anadizin.sar", ayristirKaynak("Proje( kod: PRJ-DERS, rejim: esnek )")],
  ]);
  const kapsamlar = projeKapsamlari(programlar);
  assert.deepEqual(kapsamlar.map((k) => k.kod), ["PRJ-SARMAL"],
    "ders dünyasındaki Proje bildirimi gerçek bir sınır doğurmaz");
  assert.equal(sahipProjeKapsami("sarmal/is/plan/x.sar", kapsamlar)?.kod, "PRJ-SARMAL");
  assert.equal(sahipProjeKapsami("baska/yer.sar", kapsamlar), undefined, "köksüz dosya sınır çizmez");
});

test("ORK-4: metin katmanı ad alanlı kodu TEK sözce olarak görür", () => {
  const i = new KimlikIndeksi();
  i.dosyaGuncelle("plan.sar", "// PRJ-SARMAL::FAZ-2026-AGUSTOS mevsimine bağlıdır\n");
  assert.equal(i.atiflar("PRJ-SARMAL::FAZ-2026-AGUSTOS").length, 1);
  assert.equal(i.atiflar("FAZ-2026-AGUSTOS").length, 0,
    "ad alanının yarısı ayrı bir atıf sayılamaz");
  assert.equal(i.atiflar("PRJ-SARMAL").length, 0);
});

test("ORK-4: adAlanliTanimlar çatı rafından kardeş kökteki tanıma gider", async () => {
  const { adAlanliTanimlar, catiKardesleri, kardesOnbelleginiTemizle } = await import("../src/kimlik.ts");
  const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");

  const cati = mkdtempSync(join(tmpdir(), "sarmal-ork4-"));
  try {
    writeFileSync(join(cati, "cati_anadizin.sar"),
      'ÇalışmaAlanı( kod: CAL-X, ne: "çatı" ) {\n'
      + '  Raf( kod: RAF-A, yol: "acik/", ne: "açık" )\n'
      + '  Raf( kod: RAF-B, yol: "kapali/", ne: "kapalı" )\n}\n');
    mkdirSync(join(cati, "acik", "plan"), { recursive: true });
    mkdirSync(join(cati, "kapali", "plan"), { recursive: true });
    writeFileSync(join(cati, "acik", "acik_anadizin.sar"),
      'Proje( kod: PRJ-ACIK, ad: "Açık", rejim: katı, ne: "açık araç" )');
    writeFileSync(join(cati, "acik", "plan", "faz.sar"),
      'Faz( kod: FAZ-AGUSTOS, ad: "Çatı Mevsimi" )');
    writeFileSync(join(cati, "kapali", "kapali_anadizin.sar"),
      'Proje( kod: PRJ-KAPALI, ad: "Kapalı", rejim: katı, ne: "kapalı ürün" )');
    const kapaliPlan = join(cati, "kapali", "plan", "zeka.sar");
    writeFileSync(kapaliPlan, "Blok( kod: BLK-ZEKA, mevsim: PRJ-ACIK::FAZ-AGUSTOS )");

    kardesOnbelleginiTemizle();
    assert.deepEqual(catiKardesleri(join(cati, "kapali", "plan")).map((k) => k.kod).sort(),
      ["PRJ-ACIK", "PRJ-KAPALI"], "çatının duyurduğu iki kök de tanınır");

    const bulunan = adAlanliTanimlar("PRJ-ACIK::FAZ-AGUSTOS", kapaliPlan);
    assert.equal(bulunan.length, 1);
    assert.equal(bulunan[0].kod, "FAZ-AGUSTOS");
    assert.ok(bulunan[0].dosya.endsWith(join("acik", "plan", "faz.sar")), bulunan[0].dosya);

    assert.deepEqual(adAlanliTanimlar("FAZ-AGUSTOS", kapaliPlan), [],
      "niteliksiz kod kardeş köke atlamaz — küresel eşleşme bağ değildir");
    assert.deepEqual(adAlanliTanimlar("PRJ-YOK::FAZ-AGUSTOS", kapaliPlan), [],
      "ilansız ad alanı kardeş sayılmaz");
    kardesOnbelleginiTemizle();
  } finally {
    rmSync(cati, { recursive: true, force: true });
  }
});

// ── EKL-F10-A12 · Founder geribildirim kanalları kartta ──────────────────────
//   Founder'ın PRF-A01'e yazdığı takdir yalnız git farkında görünüyordu; gezin
//   kartı dört kanalı hiç basmıyordu. Kart artık kanalı koni alanı gibi basar
//   ve kanalı olmayan Adımda satır doğmaz (STR-4).
test("EKL-F10-A12: bağlam kartı dört geribildirim kanalını basar, kanal yoksa satır doğmaz", () => {
  const kaynak = `Katman( kod: KAT-G, ad: "geribildirim katmanı", ne: "k" ) {
  Adım( kod: ADM-G1, durum: tamamlandı, takdir: "Tebrikler, harika işçilik", öneri: "yorumları kısalt", ne: "takdirli iş" )
  Adım( kod: ADM-G2, durum: tamamlandı, ne: "sessiz iş" )
}`;
  const b = dugumBaglami(kaynak, "ADM-G1");
  const alanlar = new Map(b!.alanlar);
  assert.equal(alanlar.get("takdir"), "Tebrikler, harika işçilik");
  assert.equal(alanlar.get("öneri"), "yorumları kısalt");
  const i = new KimlikIndeksi();
  i.dosyaGuncelle("/kart/g.sar", kaynak);
  const r1 = gezinRaporu(i, "ADM-G1", () => kaynak);
  assert.ok(r1.includes("  takdir: Tebrikler, harika işçilik"), r1);
  assert.ok(r1.includes("  öneri: yorumları kısalt"), r1);
  const r2 = gezinRaporu(i, "ADM-G2", () => kaynak);
  for (const k of ["teşekkür", "takdir", "onur", "öneri"]) assert.ok(!r2.includes(`  ${k}:`), `kanalsız Adımda '${k}' satırı doğmamalı:\n${r2}`);
});

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
import { calismaAlaniKur, dogusAgaciKur, fazYolu, planYolu } from "./dogus-agaci.ts";

// Fikstür yolları doğuşun yazdığı ağaçtan türetilir (HST-MTR-A07): plan dosyaları
// işin kitaplığındaki plan rafında, Fazlar Faz klasöründe sıra önekli yaşar.
const PLAN_IS = planYolu("is.sar");
const KOMSU_GOVDE = `komsu/${planYolu("govde.sar")}`;
const SARMAL_FAZ = `sarmal/${fazYolu(1, "faz")}`;

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

// ── HST-MTR-A15 · adlı tanımın tipi anahtar sözcüktür ──────────────────────────
//   `Kural ad( kod: … )` ve `Tip Ad( kod: … )` yazımlarında paranteze bitişik
//   sözcük tanımın ADIDIR; gezin tipi oradan basıyordu ("[araçÖnce]"). Tip,
//   düğümün sözdizimi türünden okunur; adsız düğümler değişmez.
test("HST-MTR-A15: adlı Kuralın gezin cevabı tipi Kural gösterir, kart adresleri de", () => {
  const kaynak = `Anayasa( kod: ANY-ADLI, ad: "adlı anayasa" ) {
  Kural birinciKural( kod: KRL-ADLI-1, ne: "birinci kural" )
  Kural ikinciKural( kod: KRL-ADLI-2, ad: "ikinci", ne: "ikinci kural" )
  Tip AdliTip( kod: TIP-ADLI-1, taban: Blok ) { ne: "adlı tip" }
}`;
  const i = new KimlikIndeksi();
  i.dosyaGuncelle("/adli/kanon.sar", kaynak);
  assert.equal(i.tanimlar("KRL-ADLI-1")[0].tip, "Kural");
  assert.equal(i.tanimlar("KRL-ADLI-2")[0].tip, "Kural");
  assert.equal(i.tanimlar("KRL-ADLI-2")[0].ad, "ikinci", "kardeş ad: alanı değişmez");
  assert.equal(i.tanimlar("TIP-ADLI-1")[0].tip, "Tip");
  assert.equal(i.tanimlar("ANY-ADLI")[0].tip, "Anayasa", "adsız düğüm değişmez");
  assert.equal(i.tanimlar("birinciKural")[0].tip, "kuralTanım", "ad tanımı değişmez");
  const rapor = gezinRaporu(i, "KRL-ADLI-1", () => kaynak);
  assert.ok(rapor.includes("[Kural]"), rapor);
  assert.ok(!rapor.includes("[birinciKural]"), rapor);
  assert.ok(rapor.includes("kardeşler (2): Kural KRL-ADLI-2 (ikinci) · Tip TIP-ADLI-1"), rapor);
  const b = dugumBaglami(kaynak, "KRL-ADLI-1");
  assert.equal(b!.dugum.tip, "Kural");
  assert.equal(b!.tur, "kuralTanım");
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
  const s = gezinmeSuzgeci(`/ws/sarmal/${PLAN_IS}`, varlik);
  assert.equal(s("/ws/sarmal/ogreti/sablon/proje.sar"), false, "ders kopyası ürün gezinmesine girmez");
  assert.equal(s("/ws/sarmal/sarmal_anadizin.sar"), true, "gerçek tanım görünür");
  assert.equal(s("/ws/os/os_anadizin.sar"), false, "çapraz varlık süzülür (YAS-3.3)");
  assert.equal(s("/ws/koksuz/notlar.sar"), true, "köksüz dosya hep görünür (YAS-3.3 deseni)");
  // KPS-IND-A01 NÖBETİ: öğreti kitaplığının DIŞINDAKİ `sablon/` bir ders rafı
  // değildir; kullanıcının kendi şablon kitaplığı gezinmede TAM görünür.
  assert.equal(s("/ws/sarmal/sablon/kurumsal/kurumsal_anadizin.sar"), true,
    "kullanıcı ağacındaki şablon kitaplığı gezinmeden süzülmemeli");
  const d = gezinmeSuzgeci("/ws/sarmal/ogreti/sablon/proje.sar", varlik);
  assert.equal(d("/ws/sarmal/ogreti/sablon/dogus/anadizin.sar"), true, "ders kaynağı kendi evreninde serbest gezinir");
  assert.equal(d("/ws/sarmal/ogreti/sablon/proje.sar"), true, "kaynak dosyanın kendisi her zaman görünür");
  const k = gezinmeSuzgeci("/tmp/tek.sar", varlik);
  assert.equal(k("/ws/sarmal/ogreti/sablon/proje.sar"), false, "köksüz ürün kaynağında da ders süzmesi yaşar");
  assert.equal(k(`/ws/os/${planYolu("a.sar")}`), true, "köksüz kaynak varlık sınırı çizmez");
});

test("KPN-A01: bolgeEtiketi — ders bölgeleri rozetli, varlık adı çözücüden, çözümsüz köksüz", async () => {
  const { bolgeEtiketi } = await import("../src/kimlik.ts");
  const ad = (y: string) => y.includes("sarmal") ? "sarmal" : undefined;
  assert.equal(bolgeEtiketi("/x/ogreti/sablon/proje.sar", ad), "📋 şablon");
  assert.equal(bolgeEtiketi("/x/ogreti/ornek/vitrin.sar", ad), "🎓 örnek dünyası");
  assert.equal(bolgeEtiketi(`/ws/sarmal/${PLAN_IS}`, ad), "🧭 sarmal");
  assert.equal(bolgeEtiketi("/baska/yer.sar", ad), "🧭 köksüz");
  // KPS-IND-A01 NÖBETİ: rozet de kendi evine demirlidir — kullanıcının kökü
  // altındaki `sablon/` ders rozeti DEĞİL, varlık adı alır (YUZ-3.1).
  assert.equal(bolgeEtiketi("/ws/sarmal/sablon/kurumsal/plan.sar", ad), "🧭 sarmal",
    "kullanıcı ağacındaki şablon kitaplığı ders rozeti almamalı");
});

test("KPN-A01: gezinRaporu çok-tanımda rozet basar ve uyarı şablon/varlık/drift ayrımını öğretir", async () => {
  const { bolgeEtiketi } = await import("../src/kimlik.ts");
  const i = new KimlikIndeksi();
  i.dosyaGuncelle("/ws/sarmal/sarmal_anadizin.sar", 'Kitaplık( kod: KTP-IS, yol: "is/", ne: "x" ) { Raf( kod: RAF-PLAN, yol: "plan/", ne: "x" ) }');
  i.dosyaGuncelle("/ws/sarmal/ogreti/sablon/proje.sar", 'Kitaplık( kod: KTP-IS, yol: "is/", ne: "y" ) { Raf( kod: RAF-PLAN, yol: "plan/", ne: "y" ) }');
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
  [SARMAL_FAZ, ayristirKaynak('Faz( kod: FAZ-2026-AGUSTOS, ad: "Çatı Mevsimi" )')],
  ["komsu/komsu_anadizin.sar", ayristirKaynak('Proje( kod: PRJ-KOMSU, ad: "Komşu Proje", rejim: katı )')],
  [KOMSU_GOVDE, ayristirKaynak('Blok( kod: BLK-KOMSU-GOVDE, mevsim: FAZ-2026-AGUSTOS )')],
]);

function ayristirKaynak(kaynak: string) {
  return ayristir(belirtecle(kaynak));
}

test("ORK-4: niteliksiz kod kardeş projeye BAĞLANMAZ (küresel eşleşme yasağı)", async () => {
  const { adAlaniKapsamiKur, projeKapsamlari } = await import("../src/kimlik.ts");
  const programlar = CATI_PROGRAMLARI();
  const kapsam = adAlaniKapsamiKur({
    kapsamlar: projeKapsamlari(programlar),
    tanimDosyalari: (kod) => kod === "FAZ-2026-AGUSTOS" ? [SARMAL_FAZ] : [],
    kardesler: [],
  });
  assert.equal(kapsam.cozulur("FAZ-2026-AGUSTOS", `sarmal/${planYolu("rayda", "yayin.sar")}`), true,
    "kendi projesindeki tanım çözülür");
  assert.equal(kapsam.cozulur("FAZ-2026-AGUSTOS", KOMSU_GOVDE), false,
    "başka projedeki eş adlı tanım tesadüfî eşleşmedir ve bağ sayılmaz");
});

test("ORK-4: ad alanlı hedef YALNIZ o projenin kapsamında çözülür", async () => {
  const { adAlaniKapsamiKur, projeKapsamlari } = await import("../src/kimlik.ts");
  const programlar = CATI_PROGRAMLARI();
  const kapsam = adAlaniKapsamiKur({
    kapsamlar: projeKapsamlari(programlar),
    tanimDosyalari: (kod) => kod === "FAZ-2026-AGUSTOS" ? [SARMAL_FAZ] : [],
    kardesler: [],
  });
  assert.equal(kapsam.cozulur("PRJ-SARMAL::FAZ-2026-AGUSTOS", KOMSU_GOVDE), true,
    "açıkça yazılmış ad alanı proje sınırını meşru biçimde geçer");
  assert.equal(kapsam.cozulur("PRJ-KOMSU::FAZ-2026-AGUSTOS", KOMSU_GOVDE), false,
    "ad alanı yanlış projeyi gösteriyorsa hedef çözülmez");
  assert.equal(kapsam.cozulur("PRJ-YOK::FAZ-2026-AGUSTOS", KOMSU_GOVDE), false,
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
  assert.equal(kapsam.cozulur("PRJ-SARMAL::FAZ-2026-AGUSTOS", planYolu("bulgu.sar")), true);
  assert.equal(kapsam.cozulur("PRJ-SARMAL::FAZ-YOK", planYolu("bulgu.sar")), false,
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
  assert.equal(sahipProjeKapsami(`sarmal/${planYolu("x.sar")}`, kapsamlar)?.kod, "PRJ-SARMAL");
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
  const { join } = await import("node:path");

  // Doğuşun çatısı: iki proje doğuşla doğar ve çatıya Kitaplık satırıyla katılır.
  const cati = calismaAlaniKur({ ad: "cati", onek: "sarmal-ork4-", projeler: [{ ad: "acik" }, { ad: "kapali" }] });
  try {
    const acik = cati.projeler.get("acik")!;
    const kapali = cati.projeler.get("kapali")!;
    acik.yaz(acik.ilkFaz, 'Faz( kod: FAZ-AGUSTOS, ad: "Çatı Mevsimi" )');
    const kapaliPlan = kapali.yaz(planYolu("zeka.sar"), "Blok( kod: BLK-ZEKA, mevsim: PRJ-ACIK::FAZ-AGUSTOS )");

    kardesOnbelleginiTemizle();
    assert.deepEqual(catiKardesleri(join(kapali.kok, kapali.planRafi)).map((k) => k.kod).sort(),
      ["PRJ-ACIK", "PRJ-KAPALI"], "çatının duyurduğu iki kök de tanınır");

    const bulunan = adAlanliTanimlar("PRJ-ACIK::FAZ-AGUSTOS", kapaliPlan);
    assert.equal(bulunan.length, 1);
    assert.equal(bulunan[0].kod, "FAZ-AGUSTOS");
    assert.ok(bulunan[0].dosya.endsWith(join("acik", acik.ilkFaz)), bulunan[0].dosya);

    assert.deepEqual(adAlanliTanimlar("FAZ-AGUSTOS", kapaliPlan), [],
      "niteliksiz kod kardeş köke atlamaz — küresel eşleşme bağ değildir");
    assert.deepEqual(adAlanliTanimlar("PRJ-YOK::FAZ-AGUSTOS", kapaliPlan), [],
      "ilansız ad alanı kardeş sayılmaz");
    kardesOnbelleginiTemizle();
  } finally {
    cati.sil();
  }
});

/** GERİYE DÖNÜK UYUM. Kitaplık hükmünden (2026-09-09) önce kurulan çatılar kardeş
 *  projeleri `Raf` satırıyla duyururdu. Doğuş bugün bu satırı yazmaz, fakat böyle
 *  çatılar diskte yaşamaya devam eder ve `calismaAlaniRaflari` onları Raf koluyla
 *  okur. HST-MTR-A07 ORK-4 fikstürlerini doğuşun çatısına taşıdığında bu kolu
 *  sınayan fikstür kalmamıştı; bağımsız inceleme okuyucuyu yalnız Kitaplık
 *  okuyacak biçimde bozduğunda süit yeşil kalmıştı. Bu sınama eski çatıyı kuran
 *  TEK fikstürdür ve çatı ilanı bilerek elle yazılmıştır. Altındaki projeler
 *  bugünkü doğuşla doğar; böylece fikstürdeki tek eski öğe çatının Raf ilanıdır.
 *
 *  MUTASYON KANITI. Okuyucu yalnız Kitaplık tarayacak biçimde bozulduğunda bu
 *  sınama kırmızıya düşer: eski çatı tanınmaz, kardeş kök bulunamaz ve ad alanlı
 *  tanım boş döner. */
test("ORK-4 · geriye dönük uyum: Raf ilanıyla kurulmuş eski çatıda ad alanlı tanım kardeş projede çözülür", async () => {
  const { adAlanliTanimlar, catiKardesleri, kardesOnbelleginiTemizle } = await import("../src/kimlik.ts");
  const { mkdtempSync, rmSync, writeFileSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");

  const cati = mkdtempSync(join(tmpdir(), "sarmal-eski-cati-"));
  try {
    writeFileSync(join(cati, "cati_anadizin.sar"),
      'ÇalışmaAlanı( kod: CAL-ESKI, ad: "eski çatı", ne: "Kitaplık hükmünden önce kurulmuş çatı" ) {\n'
      + '  Raf( kod: RAF-ACIK, yol: "acik/", ne: "açık proje" )\n'
      + '  Raf( kod: RAF-KAPALI, yol: "kapali/", ne: "kapalı proje" )\n}\n', "utf8");
    const acik = dogusAgaciKur({ ad: "acik", kok: join(cati, "acik") });
    const kapali = dogusAgaciKur({ ad: "kapali", kok: join(cati, "kapali") });
    const acikFaz = fazYolu(2, "mevsim");
    acik.yaz(acikFaz, 'Faz( kod: FAZ-AGUSTOS, ad: "Çatı Mevsimi" )');
    const kapaliPlan = kapali.yaz(planYolu("zeka.sar"), "Blok( kod: BLK-ZEKA, mevsim: PRJ-ACIK::FAZ-AGUSTOS )");

    kardesOnbelleginiTemizle();
    const bulunan = adAlanliTanimlar("PRJ-ACIK::FAZ-AGUSTOS", kapaliPlan);
    assert.equal(bulunan.length, 1,
      "Raf ilanıyla kurulmuş çatıda ad alanlı tanım kardeş projede çözülmeli; okuyucu Raf kolunu kaybederse eski çatılar kör kalır");
    assert.equal(bulunan[0].kod, "FAZ-AGUSTOS");
    assert.ok(bulunan[0].dosya.endsWith(join("acik", acikFaz)), bulunan[0].dosya);
    assert.deepEqual(catiKardesleri(join(kapali.kok, kapali.planRafi)).map((k) => k.kod).sort(),
      ["PRJ-ACIK", "PRJ-KAPALI"], "eski çatının Raf ile duyurduğu iki kök de tanınır");
  } finally {
    rmSync(cati, { recursive: true, force: true });
    kardesOnbelleginiTemizle();
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

// ═══════════════════════════════════════════════════════════════════════════
// KPS-ADA-A01 · AD ALANLI GEZİNME — üç durumlu dürüst çözüm
//
//   Ölçüm (2026-09-10): `gezin PRJ-SARMAL::TAKIM-CEKIRDEK` bu depoda "TANIM: yok
//   — bu kod hiçbir yerde ilan edilmemiş" diyordu, oysa PRJ-SARMAL bu deponun
//   kendi Proje kodudur ve TAKIM-CEKIRDEK is/plan/takimlar.sar dosyasında
//   ilanlıdır. Araç ORK-4 hükmünü denetim yüzünde uyguluyor, gezinme yüzünde
//   uygulamıyordu; doğru yazılmış bir çapraz atfa kırık diyordu.
// ═══════════════════════════════════════════════════════════════════════════

test("KPS-ADA-A01: ad alanı YÜKLÜ evrendeki Proje ise tanım o projenin kapsamında bulunur", async () => {
  const { adAlanliGezinCozumu } = await import("../src/kimlik.ts");
  const i = new KimlikIndeksi();
  i.dosyaGuncelle("urun/urun_anadizin.sar", 'Proje( kod: PRJ-URUN, ad: "urun", ne: "x" ) { Takım( kod: TAKIM-CEKIRDEK, ne: "y" ) }');
  const c = adAlanliGezinCozumu(i, "PRJ-URUN::TAKIM-CEKIRDEK");
  assert.equal(c.tanimlar.length, 1, "ad alanlı kod kendi projesinin kapsamında çözülmeli");
  assert.equal(c.tanimlar[0].dosya, "urun/urun_anadizin.sar");
  assert.equal(c.cozulemedi, undefined, "çözülen kodda gerekçe cümlesi olmaz");
});

test("KPS-ADA-A01: KÜRESEL EŞLEŞME YASAĞI — ad alanı dışındaki eş kod bağ sayılmaz", async () => {
  const { adAlanliGezinCozumu } = await import("../src/kimlik.ts");
  const i = new KimlikIndeksi();
  i.dosyaGuncelle("a/a_anadizin.sar", 'Proje( kod: PRJ-A, ad: "a", ne: "x" )');
  // Aynı kod BAŞKA projenin altında yaşıyor; ad alanı PRJ-A dediği için bağ KURULMAZ.
  i.dosyaGuncelle("b/plan.sar", 'Takım( kod: TAKIM-ORTAK, ne: "y" )');
  const c = adAlanliGezinCozumu(i, "PRJ-A::TAKIM-ORTAK");
  assert.deepEqual(c.tanimlar, [], "başka projedeki eş kod tesadüfî eşleşmedir, bağ değildir");
  assert.match(c.cozulemedi ?? "", /o Projenin kapsamında ilan edilmemiş/u,
    "kapsam dışı kalan kod için araç 'gerçekten kırık' demeli");
});

test("KPS-ADA-A01: ad alanı hiç çözülemiyorsa araç 'tanım yok' DEMEZ, ölçülemediğini söyler", async () => {
  const { adAlanliGezinCozumu } = await import("../src/kimlik.ts");
  const i = new KimlikIndeksi();
  i.dosyaGuncelle("plan.sar", "// PRJ-UZAK::KOD-X atfı burada geçiyor\n");
  const c = adAlanliGezinCozumu(i, "PRJ-UZAK::KOD-X");
  assert.deepEqual(c.tanimlar, []);
  assert.match(c.cozulemedi ?? "", /KIRIK DEĞİL, ÖLÇÜLEMEZ/u,
    "muafiyet dürüstçe bildirilmeli — sessiz geçiş de yanlış hüküm de yasaktır");
});

test("KPS-ADA-A01: gezin raporu ad alanlı kodun tanımını GÖSTERİR (yüzey ile çekirdek ayrışmaz)", () => {
  const i = new KimlikIndeksi();
  i.dosyaGuncelle("urun/urun_anadizin.sar", 'Proje( kod: PRJ-URUN, ad: "urun", ne: "x" ) { Takım( kod: TAKIM-CEKIRDEK, ne: "y" ) }');
  i.dosyaGuncelle("plan.sar", "// PRJ-URUN::TAKIM-CEKIRDEK atfı\n");
  const rapor = gezinRaporu(i, "PRJ-URUN::TAKIM-CEKIRDEK");
  assert.match(rapor, /TANIM \(1\)/u, "ad alanlı kod gezin yüzünde de çözülmeli");
  assert.doesNotMatch(rapor, /hiçbir yerde ilan edilmemiş/u, "doğru yazılmış atfa kırık denemez");
});

/** Founder hükmü 2026-09-09 sonrası çatı kardeşleri Kitaplık olarak duyurur;
 *  okuyucu yalnız Raf tarıyordu ve hükümden sonra doğan her çatıya kör kalıyordu. */
test("KPS-ADA-A01: çatı kardeşleri KİTAPLIK olarak duyurulduğunda da okunur (Kitaplık hükmü)", async () => {
  const { catiKardesleri, kardesOnbelleginiTemizle } = await import("../src/kimlik.ts");
  const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const cati = mkdtempSync(join(tmpdir(), "sarmal-ktp-"));
  try {
    writeFileSync(join(cati, "cati_anadizin.sar"),
      'ÇalışmaAlanı( kod: CAL-C, ad: "c", ne: "çatı" ) {\n'
      + '  Kitaplık( kod: KTP-B, yol: "proje_b/", ne: "kardeş proje" )\n}\n', "utf8");
    mkdirSync(join(cati, "proje_b"));
    writeFileSync(join(cati, "proje_b", "proje_b_anadizin.sar"),
      'Proje( kod: PRJ-B, ad: "b", ne: "kardeş" ) { Takım( kod: TAKIM-B, ne: "y" ) }\n', "utf8");
    kardesOnbelleginiTemizle();
    const kardesler = catiKardesleri(join(cati, "proje_b"));
    assert.deepEqual(kardesler.map((k) => k.kod), ["PRJ-B"],
      "Kitaplık olarak duyurulmuş kardeş kök çözülmeli — yalnız Raf taramak hükümden sonraki her çatıya kör kalır");
  } finally {
    rmSync(cati, { recursive: true, force: true });
    kardesOnbelleginiTemizle();
  }
});

/** BKM-OLG-A14 · İÇ İÇE KİTAPLIK. Çatı ilanındaki `yol` değeri kendi ebeveynine
 *  görelidir: `Kitaplık( yol: "teslim/" ) { Kitaplık( yol: "musteri-a/" ) }`
 *  yazımında iç projenin kökü `teslim/musteri-a/` klasörüdür. Okuyucu iç yolu
 *  çatı köküne göre çözüyordu; kardeş kök `<kök>/musteri-a/` diye aranıp
 *  bulunamıyor ve o projeye yazılmış doğru bir ORK-4 atfı "ölçülemez, muaf"
 *  uyarısı alıyordu. Fikstür iki yönü birlikte sınar: tek düzeyli projeden iç
 *  içe projeye ve iç içe projeden tek düzeyli projeye (eski yazım bozulmamalı). */
test("BKM-OLG-A14 · ORK-4: iç içe Kitaplık altındaki kardeş proje üst Kitaplığın yoluyla çözülür, tek düzeyli yazım bozulmaz", async () => {
  const { adAlanliTanimlar, adAlaniKapsamiKur, catiKardesleri, kardesOnbelleginiTemizle } = await import("../src/kimlik.ts");
  const { spawnSync } = await import("node:child_process");
  const { fileURLToPath } = await import("node:url");
  const { join } = await import("node:path");

  const cati = calismaAlaniKur({ ad: "ornek-cati", onek: "sarmal-ic-ice-ktp-",
    projeler: [{ ad: "ornek-urun" }, { ad: "musteri-a", klasor: "teslim/musteri-a" }] });
  try {
    const urun = cati.projeler.get("ornek-urun")!;
    const musteri = cati.projeler.get("musteri-a")!;
    assert.ok(musteri.kok.endsWith(join("teslim", "musteri-a")), musteri.kok);
    musteri.yaz(planYolu("teslim_karari.sar"), 'Karar( kod: KRR-TESLIM, durum: kilitli, ne: "teslim kararı", karar: "k", gerekçe: "g" )');
    urun.yaz(planYolu("urun_karari.sar"), 'Karar( kod: KRR-URUN, durum: kilitli, ne: "ürün kararı", karar: "k", gerekçe: "g" )');
    const urunPlan = urun.yaz(planYolu("atif.sar"), "// atıf: PRJ-MUSTERI-A::KRR-TESLIM\n");
    const musteriPlan = musteri.yaz(planYolu("atif.sar"), "// atıf: PRJ-ORNEK-URUN::KRR-URUN\n");

    kardesOnbelleginiTemizle();
    const kokler = new Map(catiKardesleri(urun.kok).map((k) => [k.kod, k.kok]));
    assert.equal(kokler.get("PRJ-MUSTERI-A"), musteri.kok,
      "iç içe Kitaplık altındaki projenin kökü üst Kitaplığın yoluyla birleşmeli (teslim/musteri-a/)");
    assert.equal(kokler.get("PRJ-ORNEK-URUN"), urun.kok, "tek düzeyli projenin kökü değişmemeli");

    const icIce = adAlanliTanimlar("PRJ-MUSTERI-A::KRR-TESLIM", urunPlan);
    assert.equal(icIce.length, 1, "iç içe projeye ad alanlı atıf kardeş kökte çözülmeli");
    assert.ok(icIce[0].dosya.startsWith(musteri.kok), icIce[0].dosya);
    const tek = adAlanliTanimlar("PRJ-ORNEK-URUN::KRR-URUN", musteriPlan);
    assert.equal(tek.length, 1, "iç içe projeden tek düzeyli projeye atıf çözülmeye devam etmeli");
    assert.ok(tek[0].dosya.startsWith(urun.kok), tek[0].dosya);

    // Denetimin "ölçülemez" hükmünü veren yüklem: ad alanı çatıdan bilinmeli.
    const kapsam = adAlaniKapsamiKur({ kapsamlar: [], tanimDosyalari: () => [], kokDizin: urun.kok });
    assert.equal(kapsam.adAlaniBilinir("PRJ-MUSTERI-A"), true, "iç içe kardeş ad alanı bilinmeli; bilinmezse atıf muaf sayılır");
    assert.equal(kapsam.kardesKok("PRJ-MUSTERI-A"), musteri.kok);

    // Uçtan uca: kullanıcının koştuğu CLI denetimi gerçek bir `uygular:` kenarını ölçer.
    urun.yaz(planYolu("atif.sar"),
      'Karar( kod: KRR-URUN-BAG, durum: kilitli, ne: "bağ", karar: "k", gerekçe: "g", uygular: PRJ-MUSTERI-A::KRR-TESLIM )\n');
    kardesOnbelleginiTemizle();
    const r = spawnSync(process.execPath, [fileURLToPath(new URL("../src/sarmal.ts", import.meta.url)), "denetle", urun.kok],
      { encoding: "utf8", env: { ...process.env, NO_COLOR: "1" } });
    const cikti = `${r.stdout}${r.stderr}`;
    const ilgili = cikti.split("\n").filter((s) => s.includes("PRJ-MUSTERI-A::KRR-TESLIM"));
    assert.deepEqual(ilgili, [], `iç içe kardeşe yazılmış doğru atıf hiçbir tanı almamalı:\n${ilgili.join("\n")}`);
  } finally {
    cati.sil();
    kardesOnbelleginiTemizle();
  }
});

/** BKM-OLG-A14 · MUTLAK YOL. İç içe Kitaplığın `yol` değeri mutlak yazılmışsa
 *  üst Kitaplığın yoluyla birleştirilmez; mutlak yol olduğu gibi kök sayılır
 *  (eski `resolve` davranışı). Bağımsız inceleme `join` ile birleştirmenin
 *  mutlak yolu üst yolun altına gömdüğünü ölçtü. */
test("BKM-OLG-A14 · ORK-4: iç içe Kitaplıkta mutlak yol üst yolla birleştirilmez, kardeş kök olduğu gibi çözülür", async () => {
  const { catiKardesleri, kardesOnbelleginiTemizle } = await import("../src/kimlik.ts");
  const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const cati = mkdtempSync(join(tmpdir(), "sarmal-ornek-cati-"));
  const dis = mkdtempSync(join(tmpdir(), "sarmal-mutlak-"));
  try {
    const musteri = join(dis, "musteri-a");
    mkdirSync(musteri);
    writeFileSync(join(musteri, "musteri_a_anadizin.sar"),
      'Proje( kod: PRJ-MUSTERI-A, ad: "musteri-a", ne: "kardeş" ) { Takım( kod: TAKIM-A, ne: "y" ) }\n', "utf8");
    writeFileSync(join(cati, "ornek_cati_anadizin.sar"),
      'ÇalışmaAlanı( kod: CAL-ORNEK, ad: "ornek-cati", ne: "çatı" ) {\n'
      + '  Kitaplık( kod: KTP-TESLIM, yol: "teslim/", ne: "teslim kitaplığı" ) {\n'
      + `    Kitaplık( kod: KTP-TESLIM-MUSTERI-A, yol: "${musteri}/", ne: "mutlak yollu proje" )\n`
      + '  }\n}\n', "utf8");
    kardesOnbelleginiTemizle();
    const kok = catiKardesleri(cati).find((k) => k.kod === "PRJ-MUSTERI-A")?.kok;
    assert.equal(kok, musteri, "mutlak yol üst Kitaplığın altına gömülmemeli");
  } finally {
    rmSync(cati, { recursive: true, force: true });
    rmSync(dis, { recursive: true, force: true });
    kardesOnbelleginiTemizle();
  }
});

/** Canlı depo nöbeti: bu deponun KENDİ ad alanlı atfı çözülmeli. Ölçülen kusurun
 *  birebir ikizidir ve kaynak değişirse kırmızı yanar. */
test("KPS-ADA-A01 · canlı: bu deponun PRJ-SARMAL::TAKIM-CEKIRDEK atfı gezin yüzünde çözülür", async () => {
  const { dizindenIndeks } = await import("../src/kimlik.ts");
  const { fileURLToPath } = await import("node:url");
  const kok = fileURLToPath(new URL("../../..", import.meta.url));
  const rapor = gezinRaporu(dizindenIndeks(kok), "PRJ-SARMAL::TAKIM-CEKIRDEK", undefined, undefined, kok);
  assert.match(rapor, /TANIM \(1\)/u, "canlı depoda ad alanlı atıf çözülmeli");
  assert.match(rapor, /takimlar\.sar/u, "tanım is/plan/takimlar.sar dosyasında bulunmalı");
});

// ═══════════════════════════════════════════════════════════════════════════
// KPS-IND-A01 · İNDEKS KAPSAMI DA KENDİ EVİNE DEMİRLİDİR (Founder 2026-09-10)
//
//   `INDEKS_DISI` deseni hem kimlik indeksinin dizin yürüyüşünü hem de Proje
//   kapsamı çözümünü yönetir. Desen çıplak klasör adlarıyla yazıldığı sürece
//   kullanıcının kendi `sablon/` kitaplığı gezinme indeksine hiç girmiyor ve
//   altındaki Proje kökü hiçbir kapsam kurmuyordu; bu nöbet iki soruyu birlikte
//   ölçer, çünkü ikisi de aynı desenden hüküm alır.
// ═══════════════════════════════════════════════════════════════════════════

test("KPS-IND-A01: kimlik indeksi ile Proje kapsamı kullanıcı kitaplığını yutmaz, ders rafını dışarıda tutar", async () => {
  const { dizindenIndeks, projeKapsamlari } = await import("../src/kimlik.ts");
  const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const kok = mkdtempSync(join(tmpdir(), "sarmal-ind-kapsam-"));
  try {
    mkdirSync(join(kok, "sablon", "kurumsal"), { recursive: true });
    mkdirSync(join(kok, "ogreti", "sablon"), { recursive: true });
    writeFileSync(join(kok, "sablon", "kurumsal", "plan.sar"),
      'Blok( kod: BLK-KULLANICI, ne: "kullanıcının kendi şablon kitaplığı" )\n', "utf8");
    writeFileSync(join(kok, "ogreti", "sablon", "kalip.sar"),
      'Blok( kod: BLK-DERS, ne: "öğreti kitaplığının şablon rafı" )\n', "utf8");
    const indeks = dizindenIndeks(kok);
    assert.equal(indeks.tanimlar("BLK-KULLANICI").length, 1,
      "kullanıcının şablon kitaplığı gezinme indeksinden düştü — kusur geri geldi");
    assert.equal(indeks.tanimlar("BLK-DERS").length, 0,
      "öğreti kitaplığının şablon rafı indeksi kirletmemeli (OGR-5)");
  } finally {
    rmSync(kok, { recursive: true, force: true });
  }

  // Proje kapsamı aynı desenden hüküm alır: kullanıcının Proje kökü kapsam kurar,
  // ders rafındaki örnek Proje bildirimi kurmaz.
  const p = (s: string) => ayristir(belirtecle(s));
  const kapsamlar = projeKapsamlari(new Map([
    ["sablon/kurumsal/kurumsal_anadizin.sar", p('Proje( kod: PRJ-KULLANICI, ad: "k", rejim: esnek, ne: "x" )')],
    ["ogreti/sablon/proje.sar", p('Proje( kod: PRJ-DERS, ad: "d", rejim: esnek, ne: "y" )')],
  ]));
  assert.deepEqual(kapsamlar.map((k) => k.kod), ["PRJ-KULLANICI"],
    "kullanıcının Proje kökü kapsam kurmalı, ders rafındaki örnek Proje kurmamalı");
});

// ═══════════════════════════════════════════════════════════════════════════
// HST-MTR-A06 · ÖNEK EŞLEŞMESİNİN SINIRI (HTR-GEZIN-ONEK-ESLESMESI-ATIF-SISIRIYOR)
//
//   Ölçülen kusur (2026-09-16): gezinme aracına ORK-1 sorulduğunda ORK-1.2 ve
//   ORK-1.3 yazımları da ORK-1'e gelen atıf sayılıyordu. Metin katmanı noktayı
//   kimlik sınırı sayıyor ve noktalı madde kodunu öneki üzerinden kesiyordu;
//   oysa belirteç (Karar D) ile eklentinin sözce deseni `ORK-1.2` yazımını TEK
//   kimlik sayar. Nöbet üç şeyi birlikte ölçer: üst madde alt maddenin atfını
//   saymaz, alt madde kendi metin atfını alır ve cümle sonundaki nokta ile
//   Türkçe ek gerçek atfı düşürmez.
// ═══════════════════════════════════════════════════════════════════════════

test("HST-MTR-A06: ORK-1 sorgusu ORK-1.2 ile ORK-1.3 yazımlarını saymaz, gerçek atıflarını sayar", () => {
  const KANON = [
    'Karar( kod: ORK-1, durum: kilitli, ne: "ORK-1 · üst madde" )',
    'Kural mimariSarma( kod: ORK-1.1, ne: "ORK-1.1 · alt madde", dayanak: ORK-1 )',
    'Kural bagimliVeBesler( kod: ORK-1.2, ne: "ORK-1.2 · alt madde", dayanak: ORK-1 )',
  ].join("\n");
  const NOT = "ORK-1.2 ile ORK-1.3'ün ayrı maddeler olduğunu, ORK-1.2.4 yazımının derin madde olduğunu söyler; üst hüküm ORK-1.";
  const i = new KimlikIndeksi();
  i.dosyaGuncelle("kanon.sar", KANON);
  i.dosyaGuncelle("NOTLAR.md", NOT);
  assert.equal(i.tanimlar("ORK-1.2").length, 1, "fikstür ayrıştırılamadı — AST katmanı koşmadan nöbet bir şey ölçmez");

  const dayanak = (satir: number): string => {
    const s = KANON.split("\n")[satir - 1];
    return `kanon.sar:${satir}:${s.indexOf("dayanak: ORK-1") + "dayanak: ".length + 1}`;
  };
  assert.deepEqual(
    i.atiflar("ORK-1").map((a) => `${a.dosya}:${a.satir}:${a.sutun}`),
    [dayanak(2), dayanak(3), `NOTLAR.md:1:${NOT.lastIndexOf("ORK-1") + 1}`],
    "ORK-1'e yalnız iki dayanak kenarı ile cümle sonundaki yalın yazım gelir; alt madde yazımları sayılmaz",
  );

  // Alt madde kendi kimliğiyle sayılır: atıfın türü değişmez, yalnız sınırı düzelir.
  const konumlar = (kod: string): string[] => i.atiflar(kod).map((a) => `${a.dosya}:${a.satir}:${a.sutun}`);
  assert.deepEqual(konumlar("ORK-1.2"), [`NOTLAR.md:1:${NOT.indexOf("ORK-1.2 ile") + 1}`]);
  assert.deepEqual(konumlar("ORK-1.3"), [`NOTLAR.md:1:${NOT.indexOf("ORK-1.3'ün") + 1}`]);
  assert.deepEqual(konumlar("ORK-1.2.4"), [`NOTLAR.md:1:${NOT.indexOf("ORK-1.2.4") + 1}`]);

  // MCP ve CLI yüzü aynı çekirdeği okur: rapor şişmiş sayıyı basmaz.
  assert.match(gezinRaporu(i, "ORK-1"), /ATIFLAR — gelen \(3\)/);
});

// ═══════════════════════════════════════════════════════════════════════════
// HST-MTR-A05 · BULUNAMADI İLE GEÇMİYOR AYRIMI (HTR-GEZIN-KAMEL-SEMBOLU-ADRESLEYEMIYOR)
//
//   Ölçülen kusur (2026-09-10 · yeniden 2026-10-10): gezinme aracı deve gövdeli
//   bir işlev adına, ad yedi dosyada geçtiği hâlde "hiçbir yerde geçmiyor"
//   diyordu. Metin katmanı .md ve .ts dosyalarında ve .sar metinlerinde yalnız
//   KOD biçimini tarar; biçim dışındaki ad yalnız .sar yapısal katmanında
//   aranır. Ölçülmeyen katman için yokluk hükmü kurulmaz: bulunamadı ile
//   geçmiyor ayrı cümlelerdir. KOD biçimli sorguların cevabı ise birebir aynı
//   kalır; regresyon nöbeti onları onarımdan ÖNCEKİ çıktıyla karşılaştırır.
// ═══════════════════════════════════════════════════════════════════════════

const ROZET = (): string => "🧭 sınama";

test("HST-MTR-A05: deve gövdeli sembole 'hiçbir yerde geçmiyor' denmez, kapsam dışı olduğu açıkça söylenir", () => {
  const i = new KimlikIndeksi();
  i.dosyaGuncelle("gezin.ts", "export function gezinRaporu(): string {\n  return \"\";\n}\n");
  i.dosyaGuncelle("NOTLAR.md", "gezinRaporu işlevi bu notta anılır.\n");
  i.dosyaGuncelle("plan.sar", 'Adım( kod: ADM-GZN-A01, durum: beklemede, ne: "gezinRaporu işlevini kurar" )\n');
  const rapor = gezinRaporu(i, "gezinRaporu", undefined, ROZET);
  assert.doesNotMatch(rapor, /hiçbir yerde geçmiyor/, "ölçülmeyen katman için yokluk hükmü kurulmamalı");
  assert.match(rapor, /KOD biçiminde değil/, "cevap sınırın sebebini adıyla söylemeli");
  assert.match(rapor, /ÖLÇÜLMEDİ/, "cevap ölçülmeyen katmanı açıkça söylemeli");
  assert.match(rapor, /\(3 dosya tarandı\)/, "taranan dosya sayısı cevapta kalmalı");
  assert.ok(rapor.startsWith("✖"), "sonuç yoktur: ✖ öneki korunur, CLI çıkış kodu ile MCP hata işareti değişmez");
});

test("HST-MTR-A05: .sar içinde bulunan deve gövdeli ad konumlarını verir, taranmayan katmanı açıkça söyler", () => {
  const i = new KimlikIndeksi();
  i.dosyaGuncelle("kanon.sar", 'Kural mimariSarma( kod: ORK-1.1, ne: "alt madde" )\n');
  i.dosyaGuncelle("sinama.ts", "// mimariSarma kural düğümünün adıdır\n");
  const rapor = gezinRaporu(i, "mimariSarma", undefined, ROZET);
  assert.match(rapor, /TANIM \(1\):\n {2}kanon\.sar:1:7 {2}\[kuralTanım\]/, "tanımın doğru konumu verilmeli");
  assert.match(rapor, /KAPSAM: 'mimariSarma' KOD biçiminde değil/, "taranmayan katman açıkça söylenmeli");
  assert.doesNotMatch(rapor, /kimse kullanmıyor/, "metin geçişleri taranmadan yetim hükmü kurulmamalı");
});

test("HST-MTR-A05 regresyon: KOD biçimli aramaların cevabı onarımdan önceki çıktıyla birebir aynıdır", () => {
  const i = new KimlikIndeksi();
  i.dosyaGuncelle("plan.sar", [
    'Karar( kod: KRR-GZN-YETIM, durum: kilitli, karar: "k", gerekçe: "g", ne: "kimse anmaz" )',
    'Adım( kod: ADM-GZN-A01, durum: beklemede, bağımlı: [], ne: "gezinRaporu işlevini kurar" )',
    'Adım( kod: ADM-GZN-A02, durum: beklemede, bağımlı: [ ADM-GZN-A01 ], ne: "ADM-GZN-A01 sonrası; KIRIK-GZN-A09 anılır" )',
  ].join("\n") + "\n");
  i.dosyaGuncelle("NOTLAR.md", "ADM-GZN-A01 ile gezinRaporu birlikte anılır.\n");
  // Beklenen metinler onarımdan ÖNCEKİ gövdenin aynı fikstürdeki çıktısıdır (2026-10-10).
  const ONCEKI: Record<string, string> = {
    "ADM-GZN-A01": "── 🗂️ ADM-GZN-A01 (2 dosya tarandı) ──\n\nTANIM (1):\n  plan.sar:2:12  [Adım] · 🧭 sınama\n\nATIFLAR — gelen (3):\n  plan.sar:3:54\n  plan.sar:3:74\n  NOTLAR.md:1:1",
    "KIRIK-GZN-A09": "── 🗂️ KIRIK-GZN-A09 (2 dosya tarandı) ──\n\nTANIM: yok — bu kod hiçbir yerde ilan edilmemiş (kırık atıf olabilir).\n\nATIFLAR — gelen (1):\n  plan.sar:3:95",
    "KRR-GZN-YETIM": "── 🗂️ KRR-GZN-YETIM (2 dosya tarandı) ──\n\nTANIM (1):\n  plan.sar:1:13  [Karar] · 🧭 sınama\n\nATIFLAR — gelen: yok — tanımlı ama kimse kullanmıyor (yetim olabilir).",
    "YOK-GZN-KOD": "✖ 'YOK-GZN-KOD' hiçbir yerde geçmiyor (2 dosya tarandı) — kod doğru yazıldı mı?",
  };
  for (const [kod, beklenen] of Object.entries(ONCEKI)) {
    assert.equal(gezinRaporu(i, kod, undefined, ROZET), beklenen, `${kod} cevabı değişti`);
  }
});

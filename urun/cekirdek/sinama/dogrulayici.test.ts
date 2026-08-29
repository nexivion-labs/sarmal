// Doğrulayıcı sınamaları (node:test) — gerçek SNF-0'a karşı.
// MDR-A04 bağ sınıflandırması: bu dosyadaki mesaj-metnine dokunan assert'ler ya kod-çıpalı ikincil kontroldür ya da bilinçli metin sözleşmesidir (nöbet); çıpasız tanı araması yasaktır. Tam döküm: nitelik/motor_tani_envanteri.sar (MDR-A04 bölümü).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { belirtecle } from "../src/belirtec.ts";
import { ayristir } from "../src/ayristirici.ts";
import { dogrula, dayanaksizKurallar } from "../src/dogrulayici.ts";
import { siniflamaYukle } from "../src/siniflama.ts";
import { YENI_TANI_KODLARI } from "../src/tani-sicili.ts";
import { taniDilineCevir } from "../src/tani-metinleri.ts";

const snf = siniflamaYukle(fileURLToPath(new URL("../../../oz/siniflama/kayit.json", import.meta.url)));
const dnt = (kaynak: string) => dogrula(ayristir(belirtecle(kaynak)), snf);
const derle = (kaynak: string) => ayristir(belirtecle(kaynak));

test("temiz örnek dosya drift üretmez", () => {
  const ornek = readFileSync(fileURLToPath(new URL("../../../ogreti/ornek/gercek/blok_kimlik.sar", import.meta.url)), "utf8");
  // MIM-1 kademe evresi: örnek eski dizilişte (Blok{Faz}) — 'eski-diziliş' BİLGİ tanısı
  // drift DEĞİLDİR (göç yol göstergesi); drift = hata/uyarı. Örnek ⑤. aşamada göçünce filtre boşa düşer.
  const t = dnt(ornek).filter((x) => x.duzey !== "bilgi");
  assert.equal(t.length, 0, "temiz örnek 0 hata/uyarı vermeli; verdi: " + JSON.stringify(t, null, 2));
});

test("bilinmeyen tip hata + en-yakın öneri verir", () => {
  const t = dnt("Bloo( kod: X )");
  assert.equal(t.length, 1);
  assert.equal(t[0].kod, "bilinmeyen-tip");
  assert.equal(t[0].duzey, "hata");
  assert.match(t[0].oneri ?? "", /Blok/);
});

test("DIL-1.2/KRR-MUT-8: kod ilk parametre değilse kod-ilk-değil uyarısı", () => {
  const t = dnt('Blok( ne: "önce açıklama", kod: BLK-X )');
  const u = t.find((x) => x.kod === "kod-ilk-değil");
  assert.ok(u, "kod-ilk-değil beklenirdi; gelen: " + JSON.stringify(t.map((x) => x.kod)));
  assert.equal(u.duzey, "uyarı");
});

test("DIL-1.2/KRR-MUT-8: kod ilk sıradaysa uyarı YOK · ana tipte kod'suz düğüm eksik-alan", () => {
  const temiz = dnt('Blok( kod: BLK-X, ne: "doğru sıra" )');
  assert.ok(!temiz.some((x) => x.kod === "kod-ilk-değil"));
  const kodsuz = dnt('Karar( karar: "x", gerekçe: "y", durum: kilitli, ne: "z" )');
  assert.ok(kodsuz.some((x) => x.kod === "eksik-alan" && x.mesaj.includes("kod")),
    "kod'suz Karar eksik-alan(kod) vermeli; gelen: " + JSON.stringify(kodsuz.map((x) => x.kod)));
});

test("②-B2 bypass kapandı: Kural bildirimi şema-denetlenir (ne'siz → eksik-alan · sahte otorite → geçersiz-enum)", () => {
  const t1 = dnt("Kural k1( kod: KRL-T1, katman: niyet )");
  assert.ok(t1.some((x) => x.kod === "eksik-alan" && x.mesaj.includes("ne")),
    "ne'siz Kural eksik-alan vermeli; gelen: " + JSON.stringify(t1.map((x) => x.kod)));
  const t2 = dnt('Kural k2( kod: KRL-T2, otorite: padişah, katman: niyet ) { ne: "x" }');
  assert.ok(t2.some((x) => x.kod === "geçersiz-enum"),
    "otorite:padişah geçersiz-enum vermeli; gelen: " + JSON.stringify(t2.map((x) => x.kod)));
});

test("KRR-MUT-3 sessizlik yasağı: hiçbir düğümde değerlendirilemeyen koşul → zorlanamayan-koşul", () => {
  const t = dnt('Kural k3( kod: KRL-T3, katman: yapısal, kapsam: Blok ) { ne: "x", koşul: düğüm.ad.uzunluk <= 40 }\nBlok( kod: BLK-T, ne: "hedef" )');
  const u = t.find((x) => x.kod === "zorlanamayan-koşul");
  assert.ok(u && u.duzey === "uyarı",
    "belirsiz koşul sessiz geçmemeli; gelen: " + JSON.stringify(t.map((x) => x.kod)));
});

test("Takım: üyesiz takım geçersiz (bağımlı zorunlu)", () => {
  const t = dnt('Takım( kod: TAKIM-BOS, ne: "boş" )');
  const eksik = t.find((x) => x.kod === "eksik-alan" && (x.mesaj ?? "").includes("bağımlı"));
  assert.ok(eksik, "üyesiz Takım 'bağımlı' eksik-alan vermeli; verdi: " + JSON.stringify(t));
});

test("Takım: üyeli takım şema-temiz geçer", () => {
  const t = dnt('Takım( kod: TAKIM-WEB, ne: "web yığını", bağımlı: [ FLUTTER, FASTAPI ] )');
  assert.ok(!t.some((x) => x.kod === "eksik-alan"), "üyeli Takım eksik-alan vermemeli; verdi: " + JSON.stringify(t));
});

test("izinsiz sarma yakalanır ve doğru ebeveyn önerilir", () => {
  // MIM-1 TERFİsi sonrası örnek: ters sarma — Katman bir Faz saramaz; öneri Faz'ın
  // gerçek evini söyler (Faz=ZAMAN, kapları ÇalışmaAlanı/Uygulama/Proje — Blok değil).
  const t = dnt('Katman( kod: K, ad: "k" ) { Faz( kod: F, ad: "f" ) }');
  const s = t.find((x) => x.kod === "izinsiz-sarma");
  assert.ok(s, "izinsiz-sarma beklenirdi");
  assert.match(s.oneri ?? "", /Proje|Uygulama|ÇalışmaAlanı/);
});

test("yaprak yüzey widget'ı çocuk sararsa hata", () => {
  const t = dnt("Metin( kod: M ) { Düğme( kod: D ) }");
  assert.ok(t.some((x) => x.kod === "izinsiz-sarma"));
});

test("yüzey düzen widget'ı yüzey-olmayanı sararsa hata", () => {
  // Ekran (düzen) bir Blok (plan) saramaz.
  const t = dnt("Ekran( kod: E ) { Blok( kod: B ) }");
  assert.ok(t.some((x) => x.kod === "izinsiz-sarma"));
});

test("kullanıcı-tanımlı tip (TIP-1) geçerli sayılır — bilinmeyen-tip vermez", () => {
  const t = dnt('Tip Kutu( aile: yuzey ){ ne: "x" } Ekran( kod: E ){ Kutu( kod: K ) }');
  assert.equal(t.filter((x) => x.kod === "bilinmeyen-tip").length, 0);
});

test("geçerli iç içe sarma temiz kalır (Katman › Adım) — yalnız çıplak-adımlı-katman BİLGİSİ çıkar", () => {
  const t = dnt('Katman( kod: K, ad: "k" ) { Adım( kod: A, ne: "iş" ) }');
  // sarma HATASI yok; MIM-1 çıplak-kademe bekçisi çıplak yazımı BİLGİ ile ölçer (ceza değil — Adım AltKatman altında ideal)
  assert.equal(t.filter((x) => x.kod !== "çıplak-adımlı-katman").length, 0, JSON.stringify(t));
  assert.equal(t.filter((x) => x.kod === "çıplak-adımlı-katman" && x.duzey === "bilgi").length, 1);
});

test("rütbe-atlama: Blok doğrudan Adım/Katman sarabilir — ara kademe isteğe bağlı", () => {
  const t = dnt('Blok( kod: B, ne: "x" ) { Adım( kod: A, ne: "iş" ) }');
  assert.equal(t.filter((x) => x.kod === "izinsiz-sarma").length, 0);
  const t2 = dnt('Blok( kod: B2, ne: "x" ) { Katman( kod: K, ad: "k" ) { Adım( kod: A2, ne: "iş" ) } }');
  assert.equal(t2.filter((x) => x.kod === "izinsiz-sarma").length, 0);
});

test("rütbe-atlama: Faz doğrudan Adım sarabilir", () => {
  const t = dnt('Faz( kod: F, ad: "f" ) { Adım( kod: A, ne: "iş" ) }');
  assert.equal(t.filter((x) => x.kod === "izinsiz-sarma").length, 0);
});

test("rütbe-atlama: ters sarma yasak kalır: Katman içine Faz · Adım içine Katman → izinsiz-sarma", () => {
  const t = dnt('Katman( kod: K, ad: "k" ) { Faz( kod: F, ad: "f" ) }');
  assert.ok(t.some((x) => x.kod === "izinsiz-sarma"));
  const t2 = dnt('Adım( kod: A, ne: "iş" ) { Katman( kod: K2, ad: "k" ) }');
  assert.ok(t2.some((x) => x.kod === "izinsiz-sarma"));
});

test("kendi ANA'mız (sarmal_anadizin.sar) drift üretmez — dogfooding", () => {
  const ana = readFileSync(fileURLToPath(new URL("../../../sarmal_anadizin.sar", import.meta.url)), "utf8");
  // Yeni kanonun tanıları bugün GÖZLEM kademesindedir ve kendi kaynağımızın göç
  // borcunu görünür kılar; bu borcun kapatılması proje-kod turunun kapsamıdır.
  // Bu nöbet yürürlükteki kanonun drift'ini korur, göç borcunu ayrı sayar.
  const t = dogrula(ayristir(belirtecle(ana)), snf).filter((x) => !YENI_TANI_KODLARI.includes(x.kod));
  assert.equal(t.length, 0, "ana.sar 0 drift vermeli; verdi: " + JSON.stringify(t, null, 2));
});

test("widget-değerindeki tip de denetlenir (yasa: Yaza → bilinmeyen-tip)", () => {
  const t = dnt("Proje( kod: A ) { yasa: Yaza( kod: X ) }");
  assert.ok(t.some((x) => x.kod === "bilinmeyen-tip"));
});

test("Bellek(terfi: bekliyor) → SARI beceri-terfisi uyarısı (OGR-4)", () => {
  const t = dnt('Bellek( kod: B1, ad: "x", ne: "tekrar eden ders", tür: ders, aşama: bellek, terfi: bekliyor )');
  const u = t.find((x) => x.kod === "beceri-terfisi");
  assert.ok(u, "beceri-terfisi uyarısı bekleniyordu");
  assert.equal(u!.duzey, "uyarı");
});

test("terfi alanı olmayan Bellek sarı üretmez", () => {
  const t = dnt('Bellek( kod: B2, ad: "x", ne: "boş depo", tür: ders, aşama: bellek )');
  assert.equal(t.filter((x) => x.kod === "beceri-terfisi").length, 0);
});

test("Blok anlatı standardı: Amaç/Kapsam/Sonuç bölümsüz belge → eksik-bölüm uyarısı (EKL-F2-A02)", () => {
  const t = dnt('-->|\n## Amaç\nx\n|<--\nBlok( kod: B9 )');
  const u = t.find((x) => x.kod === "eksik-alan");
  assert.ok(u && u.mesaj.includes('"## Kapsam"') && u.mesaj.includes('"## Sonuç"'));
});

test("Blok anlatı standardı: üç bölüm tam → temiz", () => {
  const t = dnt('-->|\n## Amaç\na\n## Kapsam\nb\n## Sonuç\nc\n|<--\nBlok( kod: B10 )');
  assert.equal(t.filter((x) => x.kod === "eksik-alan").length, 0);
});

test("Adım durum enum'u: bilinmeyen değer → geçersiz-durum uyarısı (EKL-F7-A01)", () => {
  const t = dnt("Katman( kod: K7 ) { Adım( kod: A7, durum: bitti ) }");
  assert.ok(t.some((x) => x.kod === "geçersiz-durum"));
  const t2 = dnt("Katman( kod: K8 ) { Adım( kod: A8, durum: geliştirmede ) }");
  assert.equal(t2.filter((x) => x.kod === "geçersiz-durum").length, 0);
});

test("geliştirmede adım → MAVİ çapa tanısı (EKL-F7-A05 entegrasyonu)", () => {
  const t = dnt('Katman( kod: K9 ) { Adım( kod: A9, durum: geliştirmede, ne: "çapa testi" ) }');
  const c = t.find((x) => x.kod === "geliştirmede-çapa");
  assert.ok(c && c.duzey === "bilgi" && c.mesaj.includes("🚧"));
});

test("durum GÖVDEDE (özellik) yazılınca da enum denetlenir — param/özellik deliği kapalı", () => {
  // Motor uzmanı bulgusu 2026-07-06: yalnız parametreler'e bakan denetçi
  // gövdedeki geçersiz durumu SESSİZCE atlıyordu.
  const t = dnt('Katman( kod: K, ad: "k" ) { Adım( kod: A, ne: "iş" ) { durum: yürüyor } }');
  const c = t.find((x) => x.kod === "geçersiz-durum");
  assert.ok(c, "gövdeye yazılan geçersiz durum uyarı vermeli");
});

test("terfi GÖVDEDE yazılınca da beceri-terfisi doğar", () => {
  const t = dnt('Bellek( kod: DRS-X, tür: ders, ne: "x", neden: "y", nasılUygula: "z", aşama: pratik ) { terfi: bekliyor }');
  assert.ok(t.find((x) => x.kod === "beceri-terfisi"), "gövdedeki terfi:bekliyor sarı uyarı vermeli");
});

test("enum tek-kaynak (F9-A02): şema-dışı değer geçersiz-enum uyarısı verir", () => {
  const t = dnt('Etmen( kod: E, tür: süpermen, uzmanlık: "x", yetki: L2, bellek: izole, ne: "y", uygular: ANY-X )');
  const c = t.find((x) => x.kod === "geçersiz-enum");
  assert.ok(c && c.mesaj.includes("tür"), "geçersiz tür enum uyarısı vermeli");
});

test("enum tek-kaynak: geçerli değer temiz geçer", () => {
  const t = dnt('Etmen( kod: E, tür: uzman, uzmanlık: "x", yetki: L2, bellek: izole, ne: "y", uygular: ANY-X )');
  assert.ok(!t.some((x) => x.kod === "geçersiz-enum"), "geçerli enum uyarı vermemeli");
});

test("tür denetimi (F9-A03): geçersiz tarih ISO uyarısı verir", () => {
  const t = dnt('DurumKaydı( kod: D, tarih: "6 Temmuz", oturum: 3, neredeyiz: A, sıradaki: B )');
  const c = t.find((x) => x.kod === "geçersiz-tür");
  assert.ok(c && c.mesaj.includes("tarih"), "ISO olmayan tarih uyarı vermeli");
});

test("tür denetimi: geçersiz sayı (oturum) uyarısı + geçerli değer temiz", () => {
  const kirli = dnt('DurumKaydı( kod: D, tarih: "2026-07-06", oturum: çok, neredeyiz: A, sıradaki: B )');
  assert.ok(kirli.find((x) => x.kod === "geçersiz-tür" && x.mesaj.includes("oturum")), "sayı olmayan oturum uyarı vermeli");
  const temiz = dnt('DurumKaydı( kod: D, tarih: "2026-07-06", oturum: 18, neredeyiz: A, sıradaki: B )');
  assert.ok(!temiz.some((x) => x.kod === "geçersiz-tür"), "geçerli tür uyarı vermemeli");
});

// ── NTK-A04 (MIM-1.6): görev/sınır birleşik türü (metin|liste) ───────────────
test("maddeli niyet: liste yazılan görev/sınır geçersiz-tür ÜRETMEZ (birleşik tür)", () => {
  const t = dnt(
    'Faz( kod: F, ad: "d" ) { Blok( kod: B, ad: "i" ) { Katman( kod: K, ad: "t" ) { ' +
    'Adım( kod: A, ne: "🧪 deneme", görev: [ "iş bir", "iş iki" ], sınır: [ "dışarıda" ] ) } } }');
  assert.ok(!t.some((x) => x.kod === "geçersiz-tür"),
    "görev/sınır madde listesi kanonen geçerli yazımdır (metin|liste)");
});

test("maddeli niyet: tekil dizgi görev/sınır eski davranışıyla temiz (geriye uyumluluk)", () => {
  const t = dnt(
    'Faz( kod: F, ad: "d" ) { Blok( kod: B, ad: "i" ) { Katman( kod: K, ad: "t" ) { ' +
    'Adım( kod: A, ne: "🧪 deneme", görev: "tek cümle", sınır: "tek sınır" ) } } }');
  assert.ok(!t.some((x) => x.kod === "geçersiz-tür"));
});

// ── NTK-A07 (STR-4): rapor/yama Adım-özgü kayıt alanları ───────────────────
test("rapor/yama: Adım'a yazılan kayıtlar motor denetiminden temiz geçer (tekil + liste)", () => {
  const t = dnt(
    'Faz( kod: F, ad: "d" ) { Blok( kod: B, ad: "i" ) { Katman( kod: K, ad: "t" ) { ' +
    'Adım( kod: A, ne: "🧪 deneme", rapor: "2026-07-18 · bulgu", yama: [ "2026-07-18 · düzeltme bir", "2026-07-18 · düzeltme iki" ] ) } } }');
  assert.ok(!t.some((x) => x.kod === "geçersiz-tür" || x.mesaj.includes("rapor") || x.mesaj.includes("yama")),
    "rapor/yama kanonlu opsiyonel alanlardır — kendilerine dair tanı üretmezler");
});

test("rapor/yama: koşu alanının mevcut davranışı DEĞİŞMEDİ (geriye uyumluluk)", () => {
  const t = dnt(
    'Faz( kod: F, ad: "d" ) { Blok( kod: B, ad: "i" ) { Katman( kod: K, ad: "t" ) { ' +
    'Adım( kod: A, ne: "🧪 deneme", durum: tamamlandı, kabul: [ "ölçüt" ], üretir: KOD-X ) { koşu: "2026-07-18 · kapanış kaydı" } } } }');
  assert.ok(!t.some((x) => x.kod === "geçersiz-tür"), "koşu eskisi gibi serbest metindir");
});

// ── TIP-1.4: Mekanizma tipi (kesişen altyapı toparlayıcısı) ──────────────
test("Mekanizma: Politika/Kural İÇEREBİLİR (izinsiz-sarma YOK)", () => {
  const t = dnt('Mekanizma( kod: MEK-T, ne: "governance" ) { Politika( kod: POL-T, alan: güvenlik, ne: "tek kapı" ) }');
  assert.ok(!t.some((x) => x.kod === "izinsiz-sarma"),
    "Mekanizma Politika sarabilmeli; gelen: " + JSON.stringify(t.map((x) => x.kod)));
});

test("Mekanizma: ad/ne'siz düğüm eksik-alan (birindenBiri [[ad,ne]])", () => {
  const t = dnt("Mekanizma( kod: MEK-T )");
  assert.ok(t.some((x) => x.kod === "eksik-alan"),
    "ad/ne'siz Mekanizma eksik-alan vermeli; gelen: " + JSON.stringify(t.map((x) => x.kod)));
});

test("Raf: Mekanizma'yı İÇEREBİLİR (ortak/mekanizma/ rafı — izinsiz-sarma YOK)", () => {
  const t = dnt('Raf( kod: RAF-T, yol: "ortak/mekanizma/" ) { Mekanizma( kod: MEK-T, ne: "rbac" ) }');
  assert.ok(!t.some((x) => x.kod === "izinsiz-sarma"),
    "Raf Mekanizma sarabilmeli; gelen: " + JSON.stringify(t.map((x) => x.kod)));
});

// ── MIM-2.1: üretim-yeri (üretilebilir artefakt dosya: ile kod-yerini beyan eder) ──
test("MIM-2.1: üretilebilir artefakt (Ekran/Uç) opsiyonel dosya: taşır — eksik-alan/bilinmeyen YOK", () => {
  const e = dnt('Ekran( kod: EKR-T, ne: "giriş", dosya: "onyuz/lib/screens/giris.dart" )');
  assert.ok(!e.some((x) => x.kod === "eksik-alan"),
    "dosya'lı Ekran eksik-alan vermemeli; gelen: " + JSON.stringify(e.map((x) => x.kod)));
  const u = dnt('Uç( kod: UC-T, yol: "/api/x", sözleşme: SZL-X, dosya: "arkayuz/app/api/x.py" )');
  assert.ok(!u.some((x) => x.kod === "eksik-alan"),
    "dosya'lı Uç eksik-alan vermemeli; gelen: " + JSON.stringify(u.map((x) => x.kod)));
});

// ── ORK-1.2 zorunlu beyanı: bağımlılık sorusu CEVAPSIZ kalamaz (sessizlik yasak) ──
test("bağımlılık-beyansız: geliştirmede Adım bağımlı taşımıyorsa motor sorar", () => {
  const t = dnt(`Blok( kod: BLK-B, ne: "x" ) { Katman( kod: FZ-B, ad: "f" ) { AltKatman( kod: KT-B, ad: "k" ) {
    Adım( kod: ADM-B, durum: geliştirmede, görev: "bir iş", kabul: "ölçüt", ne: "n" )
  } } }`).filter((x) => x.kod === "bağımlılık-beyansız");
  assert.equal(t.length, 1, "beyansız geliştirmede Adım'a bağımlılık-beyansız düşmeli");
  assert.equal(t[0].duzey, "hata", "ZINCIR-A06 terfisi (oturum 29): beyansız geliştirmede = HATA — kapıdan geçemez");
  assert.ok(t[0].oneri?.includes("bağımlı: []"), "öneri bilinçli-bağımsız yolunu göstermeli");
});

test("bilinçli-bağımsız: bağımlı: [] beyanı kuralı SUSTURUR (soru cevaplandı)", () => {
  const t = dnt(`Blok( kod: BLK-B, ne: "x" ) { Katman( kod: FZ-B, ad: "f" ) { AltKatman( kod: KT-B, ad: "k" ) {
    Adım( kod: ADM-B, durum: geliştirmede, görev: "bir iş", kabul: "ölçüt", bağımlı: [], ne: "n" )
  } } }`).filter((x) => x.kod === "bağımlılık-beyansız");
  assert.equal(t.length, 0);
});

test("beklemede iskelet muaf (v1 kademe — işe başlarken sorulur)", () => {
  const t = dnt(`Blok( kod: BLK-B, ne: "x" ) { Katman( kod: FZ-B, ad: "f" ) { AltKatman( kod: KT-B, ad: "k" ) {
    Adım( kod: ADM-B, durum: beklemede, ne: "backlog işi" )
  } } }`).filter((x) => x.kod === "bağımlılık-beyansız");
  assert.equal(t.length, 0);
});

// ── STR-4 niyet-drift kapısı (ileri-drift): tamamlandı iş kanıtsız kalamaz ──
test("niyet-drift: tamamlandı Adım üretir/kabul taşımıyorsa motor işaretler (STR-4)", () => {
  const t = dnt(`Blok( kod: BLK-N, ne: "x" ) { Katman( kod: FZ-N, ad: "f" ) { AltKatman( kod: KT-N, ad: "k" ) {
    Adım( kod: ADM-N, durum: tamamlandı, ne: "bitmiş ama kanıtsız iş" )
  } } }`).filter((x) => x.kod === "niyet-drift");
  assert.equal(t.length, 1, "tamamlandı + üretir/kabul yok → niyet-drift düşmeli");
  assert.equal(t[0].duzey, "uyarı", "v1 kademe: düzey uyarı (hata terfisi ayrı kararla)");
});

test("niyet-drift: üretir YA DA kabul beyanı kapıyı susturur", () => {
  const u = dnt(`Blok( kod: BLK-N, ne: "x" ) { Katman( kod: FZ-N, ad: "f" ) { AltKatman( kod: KT-N, ad: "k" ) {
    Adım( kod: ADM-N, durum: tamamlandı, üretir: KOD-N, ne: "meyveli iş" )
  } } }`).filter((x) => x.kod === "niyet-drift");
  assert.equal(u.length, 0, "üretir beyanı yeterli");
  const k = dnt(`Blok( kod: BLK-N, ne: "x" ) { Katman( kod: FZ-N, ad: "f" ) { AltKatman( kod: KT-N, ad: "k" ) {
    Adım( kod: ADM-N, durum: tamamlandı, kabul: "testler yeşil", ne: "kabullü iş" )
  } } }`).filter((x) => x.kod === "niyet-drift");
  assert.equal(k.length, 0, "kabul beyanı yeterli");
});

test("niyet-drift: yalnız tamamlandı'da ateşler — geliştirmede/beklemede muaf (ancak koşulu)", () => {
  const t = dnt(`Blok( kod: BLK-N, ne: "x" ) { Katman( kod: FZ-N, ad: "f" ) { AltKatman( kod: KT-N, ad: "k" ) {
    Adım( kod: ADM-N1, durum: geliştirmede, görev: "sürüyor", bağımlı: [], ne: "n" )
    Adım( kod: ADM-N2, durum: beklemede, ne: "backlog" )
  } } }`).filter((x) => x.kod === "niyet-drift");
  assert.equal(t.length, 0);
});

test("ZorunluKenar.düzey: kanon kuralı düzey taşıyabilir — motor tanıyı o düzeyde basar (YAS-4.2 kademesi)", () => {
  // niyet-drift kuralı kanonda düzey: "uyarı" taşır; alan yoksa da uyarı (varsayılan) —
  // terfi günü kanonda tek satır değişir, motor koduna dokunulmaz (data-driven kademe).
  const t = dnt(`Blok( kod: BLK-N, ne: "x" ) { Katman( kod: FZ-N, ad: "f" ) { AltKatman( kod: KT-N, ad: "k" ) {
    Adım( kod: ADM-N, durum: tamamlandı, ne: "kanıtsız" )
  } } }`).filter((x) => x.kod === "niyet-drift");
  assert.equal(t[0]?.duzey, "uyarı");
});

// ── BKM-OLG-A04: Politika → Karar bağı (dayanak) ──────────────────────────────
test("politika-dayanaksız: dayanak'sız Politika bilgi-tanısı üretir; dayanak'lı susar", () => {
  const dayanaksiz = dnt('Politika( kod: POL-T, alan: güvenlik, ne: "test politikası" )')
    .filter((x) => x.kod === "politika-dayanaksız");
  assert.equal(dayanaksiz.length, 1, "dayanaksız Politika bilgi-tanısı düşmeli");
  assert.equal(dayanaksiz[0].duzey, "bilgi", "kapıyı doldurmaz — editör yüzeyi (bilgi)");
  const dayanakli = dnt('Politika( kod: POL-T, alan: güvenlik, dayanak: "KRR-51", ne: "bağlı politika" )')
    .filter((x) => x.kod === "politika-dayanaksız");
  assert.equal(dayanakli.length, 0);
});

// ── RF-T6-A02 + SOL HÜKMÜ (b): dayanak nöbeti eşleme bitene dek panele TANI BASMAZ —
//    sayı karneye iner (dayanaksizKurallar sayacı). Eşleme sonrası dosya-nöbeti geri açılır.
test("dayanak sayacı: panel tanısı YOK; dayanaksizKurallar iki yazım biçimini sayar, boş liste kaçamaz", () => {
  // panel susar (Sol hükmü b — toplu geçiş borcu Problems'ın normal durumu yapılmaz):
  const tanili = dnt('GenelKural( kod: KRL-T, ad: "testKurali", otorite: politika, kapsam: genel, ne: "test kuralı" )')
    .filter((x) => x.kod === "dayanaksız-kural");
  assert.equal(tanili.length, 0, "eşleme öncesi panel tanısı basılmaz (Sol b)");
  // sayaç: GenelKural + Kural-bildirimi tek evren
  const p1 = derle('GenelKural( kod: KRL-1, ad: "birinciKural", otorite: politika, kapsam: genel, ne: "bir" )\n' +
                   'Kural ikinciKural( kod: KRL-2, otorite: politika, kapsam: genel, ne: "iki" )');
  assert.deepEqual(dayanaksizKurallar(p1), ["KRL-1", "KRL-2"]);
  // dayanaklılar sayılmaz (tek KOD + liste); BOŞ liste dayanak SAYILMAZ (Sol gözlemi)
  const p2 = derle('GenelKural( kod: KRL-A, ad: "bagli", otorite: politika, kapsam: genel, dayanak: KRR-90, ne: "bağlı" )\n' +
                   'ÖzelKural( kod: KRL-B, ad: "cokBagli", otorite: politika, kapsam: genel, hedef: "eklenti/", dayanak: [ KRR-90, KRR-102 ], ne: "çok bağlı" )\n' +
                   'GenelKural( kod: KRL-C, ad: "bosListe", otorite: politika, kapsam: genel, dayanak: [], ne: "boş liste hilesi" )');
  assert.deepEqual(dayanaksizKurallar(p2), ["KRL-C"], "boş liste nöbeti susturamaz");
});

// ── YUZ-3.1 (VIT-K78-A02): Hatırlatıcı ÜNLEM + yaşam döngüsü ───────────────────
test("hatırlatıcı yaşam döngüsü: açık → ❗; kararlaştı+hatırlat'sız → eksik-alan (zincir zorunlu)", () => {
  const acik = dnt('Hatırlatıcı( kod: HTR-T1, durum: açık, çapa: gelecek, dönüşTetikleyici: "v2", ne: "sonra bak" )');
  const a = acik.find((x) => x.kod === "açık-hatırlatıcı");
  assert.ok(a && a.mesaj.includes("❗"), "açık hatırlatıcı ÜNLEM taşımalı (YUZ-3.1)");
  const kararli = dnt('Hatırlatıcı( kod: HTR-T2, durum: kararlaştı, çapa: gelecek, dönüşTetikleyici: "v2", ne: "karar verildi" )');
  assert.ok(kararli.some((x) => x.kod === "eksik-alan" && x.mesaj.includes("hatırlat")),
    "kararlaştı + hatırlat'sız → eksik-alan (zincire girmemiş); gelen: " + JSON.stringify(kararli.map((x) => x.kod)));
  const zincirli = dnt('Hatırlatıcı( kod: HTR-T3, durum: kararlaştı, çapa: gelecek, dönüşTetikleyici: "v2", hatırlat: ADM-HEDEF, ne: "zincirde" )');
  assert.ok(!zincirli.some((x) => x.kod === "eksik-alan"), "hatırlat'lı kararlaştı temiz");
  assert.ok(zincirli.some((x) => x.kod === "kararlaşmış-hatırlatıcı" && x.mesaj.includes("ADM-HEDEF")));
});

// ── BKM-KAPI-A03: DIL-1.2 ad-biçimi (v1 ilk-harf · Türkçe destekli) ──────────────
test("ad-biçimi: küçük tip adı + BÜYÜK parametre adı uyarılır; uyumlu ad susar", () => {
  const t = dnt('blok( kod: BLK-K, Ne: "ters casing" )');
  const tip = t.find((x) => x.kod === "ad-biçimi" && x.mesaj.includes("blok"));
  const par = t.find((x) => x.kod === "ad-biçimi" && x.mesaj.includes("Ne"));
  assert.ok(tip && tip.duzey === "uyarı", "küçük tip adı uyarılmalı");
  assert.ok(par, "büyük parametre adı uyarılmalı");
  const temiz = dnt('Blok( kod: BLK-K, ne: "doğru casing" )');
  assert.ok(!temiz.some((x) => x.kod === "ad-biçimi"));
});

test("ad-biçimi: Türkçe harf desteklenir — ÇalışmaAlanı geçerli, çalışmaAlanı uyarılır", () => {
  assert.ok(!dnt('ÇalışmaAlanı( kod: CA-K, ad: "b", ne: "x" )').some((x) => x.kod === "ad-biçimi"));
  assert.ok(dnt('çalışmaAlanı( kod: CA-K, ad: "b", ne: "x" )').some((x) => x.kod === "ad-biçimi"));
});

// durum-boyutu bekçisinin süiti 2026-08-24 tarihinde bekçiyle birlikte emekli
// edildi; DurumKaydı artık boyut sınırı taşımaz (Founder hükmü, tarihçe git'te).

// ── BKM-KAPI-A04: TIP-1.4 dağıtma — gömülü Mekanizma'ya ÖZEL yönlendirme ─────────
test("dağıtma: Adım'a gömülü Mekanizma izinsiz-sarma + Mekanizma-özel öneri alır", () => {
  const t = dnt('Blok( kod: B, ne: "x" ) { Katman( kod: F, ad: "f" ) { AltKatman( kod: K, ad: "k" ) { Adım( kod: A, ne: "a" ) { Mekanizma( kod: MEK-T, ad: "m", faz: "F1", ne: "gömülü" ) } } } }');
  const s = t.find((x) => x.kod === "izinsiz-sarma" && (x.oneri ?? "").includes("bağımlı: MEK-"));
  assert.ok(s, "gömülü Mekanizma TIP-1.4 önerisi taşımalı; gelen: " + JSON.stringify(t.map((x) => x.oneri)));
});

// ── ORK-3.3 · DÖNGÜ: çıkışsız döngü YAZILAMAZ (DNG-FMT-A01) ─────────────────────
test("ORK-3.3: çıkışsız Döngü uyarılır; durunca YA DA turLimiti yeter; sahte tetik enum-uyarısı", () => {
  const cikissiz = dnt('Döngü( kod: DNG-T1, tetik: el, koşar: [ ADM-X ] )');
  assert.ok(cikissiz.some((x) => x.kod === "eksik-alan" && x.mesaj.includes("durunca")),
    "çıkışsız döngü uyarılmalı (runaway-loop kapısı)");
  const turlu = dnt('Döngü( kod: DNG-T2, tetik: el, koşar: [ ADM-X ], turLimiti: 5 )');
  assert.ok(!turlu.some((x) => x.kod === "eksik-alan" && x.mesaj.includes("durunca")),
    "turLimiti tek başına yeterli olmalı");
  const durunclu = dnt('Döngü( kod: DNG-T3, tetik: koşul, koşar: [ ADM-X ], durunca: "karne.hata == 0" )');
  assert.ok(!durunclu.some((x) => x.kod === "eksik-alan" && x.mesaj.includes("durunca")),
    "durunca tek başına yeterli olmalı");
  const sahte = dnt('Döngü( kod: DNG-T4, tetik: uzaydan, koşar: [ ADM-X ], turLimiti: 1 )');
  assert.ok(sahte.some((x) => x.kod === "geçersiz-enum" && x.mesaj.includes("tetik")),
    "bilinmeyen tetik enum-uyarısı almalı");
});

// ── BKM-BUG-A04 (bug-avı B3 · CANLI KANIT fikstürü): tema parametre-körlüğü ───
test("A04: Tema renkleri PARAMETRE yazımında da denetlenir (geçersiz hex artık kaçamaz)", () => {
  const t = dogrula(ayristir(belirtecle(
    'Tema( kod: TMA-KANIT, renkler: { ana: "#ZZZZZZ", nötr: "#GGGGGG" }, ne: "kanit_b3 kalıcı fikstürü" )',
  )), snf);
  const renk = t.filter((x) => x.kod === "geçersiz-renk");
  assert.equal(renk.length, 2, JSON.stringify(t));
  assert.ok(renk.every((x) => x.duzey === "hata"));
});

test("A04: özellik yazımı davranışı birebir (regresyon) + kontrast parametreden de hesaplanır", () => {
  const ozellik = dogrula(ayristir(belirtecle(
    'Tema( kod: TMA-OZ, ne: "t" ) { renkler: { ana: "#777777", nötr: "#888888" } }',
  )), snf);
  const parametre = dogrula(ayristir(belirtecle(
    'Tema( kod: TMA-PRM, ne: "t", renkler: { ana: "#777777", nötr: "#888888" } )',
  )), snf);
  assert.ok(ozellik.some((x) => x.kod === "düşük-kontrast"));
  assert.ok(parametre.some((x) => x.kod === "düşük-kontrast"));
});

// ── ADM-DGS-14: Adım öncelik alanı (spec-kit user-story önceliği ödüncü) ─────
//    ORK-3.4 (2026-08-08): kademe kümesi küçük harfli dörtlüye tekleşti; eski
//    büyük harfli üçlü emekli oldu, çünkü Adım ile Hatırlatıcı aynı kavramı iki
//    ayrı biçimde beyan ediyordu ve DIL-1.2 casing kuralı küçük harfi ister.
test("DGS-14: öncelik p0/p1/p2/p3 geçerli — emekli P1 ve uydurma p9 'geçersiz-enum' uyarısı", async () => {
  const { siniflamaYukle } = await import("../src/siniflama.ts");
  const { fileURLToPath } = await import("node:url");
  const kanon = siniflamaYukle(fileURLToPath(new URL("../../../oz/siniflama/kayit.json", import.meta.url)));
  const dnt = (k: string) => dogrula(ayristir(belirtecle(k)), kanon);
  for (const p of ["p0", "p1", "p2", "p3"]) {
    assert.equal(dnt(`Adım( kod: ADM-ONC, ne: "a", öncelik: ${p} )`).filter((t) => t.kod === "geçersiz-enum").length, 0, p);
  }
  for (const p of ["P1", "p9"]) {
    const t = dnt(`Adım( kod: ADM-ONC, ne: "a", öncelik: ${p} )`).find((t) => t.kod === "geçersiz-enum");
    assert.ok(t && /öncelik/.test(t.mesaj), `${p}: ${JSON.stringify(t)}`);
  }
});

// ── TAS-B01: önyüz disiplin kapıları (temasız-ekran · ölçüsüz-metin · ham-renk) ──
//    v1 düzey: uyarı (YAS-4.2 kademe deseni) — ihlal uyarır, uyumlu SUSAR.
test("TAS-B01 temasız-ekran: tema kenarsız Ekran uyarılır (uyarı düzeyi)", () => {
  const t = dnt(`Adım( kod: ADM-TE, durum: beklemede, ne: "plan hedefi" )
Ekran( kod: EKR-TE, ne: "temasız ekran", referans: ADM-TE )`);
  const u = t.find((x) => x.kod === "temasız-ekran");
  assert.ok(u, "temasız-ekran beklenirdi; gelen: " + JSON.stringify(t.map((x) => x.kod)));
  assert.equal(u.duzey, "uyarı", "v1 kademe: uyarı düzeyinde başlar");
  // MDR-A06: iddia iç KODA değil DAVRANIŞA bağlanır — öneri tema kenarını göstermeli.
  assert.match(u.oneri ?? "", /tema: alanına bir Tema düğümü bağla/);
});

test("TAS-B01 temasız-ekran: temalı ekran SUSAR (rol-listesi Tema şema-temiz — TAS-A01)", () => {
  const t = dnt(`Adım( kod: ADM-TT, durum: beklemede, ne: "plan hedefi" )
Tema( kod: TEM-TT, ne: "token-ROL sözleşmesi — değerler tech-temada",
      dosya: "onyuz/lib/tema/ana_tema.dart",
      renkler: [ birincil, vurgu ], tipografi: [ başlık1, gövde ] )
Ekran( kod: EKR-TT, ne: "temalı ekran", referans: ADM-TT, tema: TEM-TT )`);
  assert.equal(t.filter((x) => x.kod === "temasız-ekran").length, 0,
    "temalı ekran susmalı; gelen: " + JSON.stringify(t, null, 2));
  // TAS-A01: rol-listesi yazımı (DEĞER yok) tüm bekçilerden temiz geçer.
  // Yeni kanonun gözlem tanıları ayrı sayılır (görünürlük beyanı proje-kod turunun borcu).
  const eski = t.filter((x) => !YENI_TANI_KODLARI.includes(x.kod));
  assert.equal(eski.length, 0, "rol-listesi Tema + temalı ekran 0 tanı vermeli; verdi: " + JSON.stringify(eski, null, 2));
});

test("TAS-B01 ölçüsüz-metin: stil/rol/ölçek kenarsız Metin uyarılır; stil'li Metin susar", () => {
  const ihlal = dnt(`Adım( kod: ADM-OM, durum: beklemede, ne: "n" )
Tema( kod: TEM-OM, ne: "t", tipografi: [ başlık1, gövde ] )
Ekran( kod: EKR-OM, ne: "e", referans: ADM-OM, tema: TEM-OM ) {
  Metin( kod: MTN-OM, ne: "rolsüz metin" )
}`);
  const u = ihlal.find((x) => x.kod === "ölçüsüz-metin");
  assert.ok(u, "ölçüsüz-metin beklenirdi; gelen: " + JSON.stringify(ihlal.map((x) => x.kod)));
  assert.equal(u.duzey, "uyarı");
  assert.match(u.oneri ?? "", /başlık1/, "öneri tipografi rollerini saymalı (temaRolleri.tipografi)");
  const temiz = dnt(`Adım( kod: ADM-OT, durum: beklemede, ne: "n" )
Tema( kod: TEM-OT, ne: "t", tipografi: [ başlık1, gövde ] )
Ekran( kod: EKR-OT, ne: "e", referans: ADM-OT, tema: TEM-OT ) {
  Metin( kod: MTN-OT, ne: "rollü metin", stil: gövde )
}`);
  assert.equal(temiz.filter((x) => x.kod === "ölçüsüz-metin").length, 0,
    "stil'li Metin susmalı; gelen: " + JSON.stringify(temiz, null, 2));
});

test("TAS-B01 ham-renk: yüzey widget'ında ham hex uyarılır — rol yazımı ve Tema/Tip muaf", () => {
  // ihlal: Kapsayıcı ham hex taşıyor (rol yerine DEĞER — kör drift)
  const ihlal = dnt('Kapsayıcı( kod: KPS-HR, ne: "kutu", renk: "#FF0000" )');
  const u = ihlal.find((x) => x.kod === "ham-renk");
  assert.ok(u, "ham-renk beklenirdi; gelen: " + JSON.stringify(ihlal.map((x) => x.kod)));
  assert.equal(u.duzey, "uyarı");
  assert.match(u.oneri ?? "", /birincil/, "öneri renk rollerini göstermeli (temaRolleri.renk)");
  // harita içine gömülü hex de yakalanır (dekorasyon: { renk: "#..." })
  const gomulu = dnt('Kart( kod: KRT-HR, ne: "kart", dekorasyon: { renk: "#0EA5E9" } )');
  assert.ok(gomulu.some((x) => x.kod === "ham-renk"), "harita-içi hex yakalanmalı");
  // uyumlu: ROL yazımı susar
  const rollu = dnt('Kapsayıcı( kod: KPS-RL, ne: "kutu", renk: birincil )');
  assert.equal(rollu.filter((x) => x.kod === "ham-renk").length, 0, "rol yazımı susmalı");
  // muaf ①: Tema değer-taşıyan eski biçim ham-renk BASMAZ (YUZ-4.1 bekçileri zaten nöbette)
  const tema = dnt('Tema( kod: TEM-HR, ne: "t", renkler: { ana: "#1A1C1E", nötr: "#F7F5F2" } )');
  assert.equal(tema.filter((x) => x.kod === "ham-renk").length, 0, "Tema muaf (geçersiz-renk/kontrast bekçisinin işi)");
  // muaf ②: Tip TANIMI (TIP-1 eklenti-dekor yapılandırması) ham-renk BASMAZ
  const tip = dnt('Tip Rozet( aile: yuzey, renk: "#14B8A6" ) { ne: "x" }');
  assert.equal(tip.filter((x) => x.kod === "ham-renk").length, 0, "Tip tanımı muaf (TIP-1 dekor)");
});

// ── MIM-1: yeni sarma yönleri + eski-diziliş bilgi tanısı ─────────────────────
test("MIM-1 TERFİsi: Proje→Faz→Blok dizilişi İZİNLİ; Blok içindeki Faz artık izinsiz-sarma HATASI (kademe bitti, Founder onayı 2026-07-12)", async () => {
  const { siniflamaYukle } = await import("../src/siniflama.ts");
  const { fileURLToPath } = await import("node:url");
  const kanon = siniflamaYukle(fileURLToPath(new URL("../../../oz/siniflama/kayit.json", import.meta.url)));
  const dnt = (k: string) => dogrula(ayristir(belirtecle(k)), kanon);
  // ① yeni diziliş: izinsiz-sarma YOK, eski-diziliş YOK
  const yeni = dnt('Proje( kod: PRJ-YD, ad: "y", ne: "yeni" ) { Faz( kod: FZ-YD, ad: "mvp" ) { Blok( kod: BLK-YD, ne: "iş" ) { Adım( kod: ADM-YD, ne: "a", durum: beklemede ) } } }');
  assert.equal(yeni.filter((t) => t.kod === "izinsiz-sarma").length, 0, JSON.stringify(yeni));
  assert.equal(yeni.filter((t) => t.kod === "eski-diziliş").length, 0);
  // ② TERFİ: eski diziliş (Blok{Faz}) artık HATA — motor eski düzene dönüşü yapısal imkânsız kılar
  const eski = dnt('Blok( kod: BLK-ED, ne: "eski" ) { Faz( kod: FZ-ED, ad: "önyüz" ) { Adım( kod: ADM-ED, ne: "a", durum: beklemede ) } }');
  const es = eski.find((t) => t.kod === "izinsiz-sarma");
  assert.ok(es, "TERFİ sonrası Blok{Faz} izinsiz-sarma HATASI olmalı: " + JSON.stringify(eski));
  assert.equal(eski.filter((t) => t.kod === "eski-diziliş").length, 0, "kademe tanısı kalktı");
});

// ── MIM-1.5: AltKatman — dal üstünde ufak dal (Flutter-usulü ada ayrışma) ────────
test("MIM-1.5: Katman→AltKatman→AltKatman izinli (derin-dal bilgi frenli); Katman{Katman} HATA — ada ayrışma motorca zorlanır", async () => {
  const { siniflamaYukle } = await import("../src/siniflama.ts");
  const { fileURLToPath } = await import("node:url");
  const kanon = siniflamaYukle(fileURLToPath(new URL("../../../oz/siniflama/kayit.json", import.meta.url)));
  const dnt = (k: string) => dogrula(ayristir(belirtecle(k)), kanon);
  // ① iki seviye: temiz (izinsiz-sarma yok, derin-dal yok)
  const iki = dnt('Blok( kod: BLK-K92, ne: "iş" ) { Katman( kod: KAT-K92, ad: "arkayuz" ) { AltKatman( kod: ALT-K92, ad: "auth" ) { Adım( kod: ADM-K92, ne: "a", durum: beklemede ) } } }');
  assert.equal(iki.filter((t) => t.kod === "izinsiz-sarma").length, 0, JSON.stringify(iki));
  assert.equal(iki.filter((t) => t.kod === "derin-dal").length, 0);
  // ② üç seviye (Alt²): RF-T3 sonrası ARTIK FRENSİZ — MIM-1 ideali Katman→Alt→Adım'ı
  //    meşru kıldı, fren 4+ seviyeye indi (Alt³).
  const uc = dnt('Blok( kod: BLK-K92U, ne: "iş" ) { Katman( kod: KAT-K92U, ad: "arkayuz" ) { AltKatman( kod: ALT-A, ad: "auth" ) { AltKatman( kod: ALT-B, ad: "oauth" ) { Adım( kod: ADM-K92U, ne: "a", durum: beklemede ) } } } }');
  assert.equal(uc.filter((t) => t.kod === "izinsiz-sarma").length, 0);
  assert.equal(uc.filter((t) => t.kod === "derin-dal").length, 0, "Alt² artık fren yemez (RF-T3)");
  // ②b dört seviye (Alt³): derin-dal BİLGİ freni burada (ceza değil soru — MIM-1.5 · RF-T3)
  const dort = dnt('Blok( kod: BLK-K92D, ne: "iş" ) { Katman( kod: KAT-K92D, ad: "arkayuz" ) { AltKatman( kod: ALT-D1, ad: "auth" ) { AltKatman( kod: ALT-D2, ad: "oauth" ) { AltKatman( kod: ALT-D3, ad: "pkce" ) { Adım( kod: ADM-K92D, ne: "a", durum: beklemede ) } } } } }');
  const dd = dort.find((t) => t.kod === "derin-dal");
  assert.ok(dd && dd.duzey === "bilgi" && /4\+/.test(dd.mesaj), JSON.stringify(dort.filter((t) => t.kod === "derin-dal")));
  // ③ Katman içinde Katman: HATA — alt seviye AltKatman ADIYLA yazılır (Founder: "dal diye fonksiyon yazamayız")
  const yanlis = dnt('Blok( kod: BLK-K92Y, ne: "iş" ) { Katman( kod: KAT-DIS, ad: "arkayuz" ) { Katman( kod: KAT-IC, ad: "auth" ) { Adım( kod: ADM-K92Y, ne: "a", durum: beklemede ) } } }');
  assert.ok(yanlis.some((t) => t.kod === "izinsiz-sarma" && /AltKatman/.test(t.mesaj)), JSON.stringify(yanlis));
});

// ── RF-T3 · MIM-1: çıplak-adımlı-katman bekçisi ─────────────────────────────
test("MIM-1: Adım’ı doğrudan taşıyan Katman TEK bilgi tanısı alır (çok Adımda da tek); AltKatman'lı ideal susar", async () => {
  const { siniflamaYukle } = await import("../src/siniflama.ts");
  const { fileURLToPath } = await import("node:url");
  const kanon = siniflamaYukle(fileURLToPath(new URL("../../../oz/siniflama/kayit.json", import.meta.url)));
  const dnt = (k: string) => dogrula(ayristir(belirtecle(k)), kanon);
  // ① çıplak: Katman doğrudan İKİ Adım taşıyor → Katman başına TEK bilgi tanısı (MIM-1: ölçüm, ceza değil)
  const ciplak = dnt('Blok( kod: BLK-CK, ne: "iş" ) { Katman( kod: KAT-CK, ad: "arkayuz" ) { Adım( kod: ADM-CK1, ne: "a", durum: beklemede ) Adım( kod: ADM-CK2, ne: "b", durum: beklemede ) } }');
  const t = ciplak.filter((x) => x.kod === "çıplak-adımlı-katman");
  assert.equal(t.length, 1, "Katman başına TEK tanı (sel önlenir)");
  assert.ok(t[0].duzey === "bilgi" && /AltKatman/.test(t[0].mesaj));
  // ② ideal: Katman → AltKatman → Adım → susar
  const ideal = dnt('Blok( kod: BLK-CKI, ne: "iş" ) { Katman( kod: KAT-CKI, ad: "arkayuz" ) { AltKatman( kod: AKT-CKI, ad: "auth" ) { Adım( kod: ADM-CKI, ne: "a", durum: beklemede ) } } }');
  assert.equal(ideal.filter((x) => x.kod === "çıplak-adımlı-katman").length, 0, "ideal diziliş susmalı");
});

// ── HZL-B01: yürürlük modeli — halefsiz-revize bekçisi ────────────────────────
test("HZL-B01: durum:revize + halef yok → uyarı; halefli revize ve kilitli susar", async () => {
  const { siniflamaYukle } = await import("../src/siniflama.ts");
  const { fileURLToPath } = await import("node:url");
  const kanon = siniflamaYukle(fileURLToPath(new URL("../../../oz/siniflama/kayit.json", import.meta.url)));
  const dnt = (k: string) => dogrula(ayristir(belirtecle(k)), kanon);
  const kotu = dnt('Karar( kod: KRR-98, sıra: 980, durum: revize, ne: "x", karar: "y", gerekçe: "z" )');
  const h = kotu.find((t) => t.kod === "halefsiz-revize");
  assert.ok(h && h.duzey === "uyarı", JSON.stringify(kotu));
  const iyi = dnt('Karar( kod: KRR-98, sıra: 980, durum: revize, halef: KRR-99, ne: "x", karar: "y", gerekçe: "z" )');
  assert.equal(iyi.filter((t) => t.kod === "halefsiz-revize").length, 0);
  const kilitli = dnt('Karar( kod: KRR-98, sıra: 980, durum: kilitli, ne: "x", karar: "y", gerekçe: "z" )');
  assert.equal(kilitli.filter((t) => t.kod === "halefsiz-revize").length, 0);
});

// ── GBR-A06 (IDA dogfood #13): belge YANLIŞ-DÜĞÜM — yol gösteren mesaj ────────
//   Belge bloğu Blok'un İÇİNE konunca ilk çocuğa (Katman) bağlanır → Blok belge-
//   eksik görünür; kuru "belge eksik" yerine mesaj yanlış-bağlanmayı + doğru yeri söyler.
test("GBR-A06: belge Blok İÇİNE konunca 'belge-yanlış-düğüm' — yanlış bağlanmayı + doğru yeri söyler", () => {
  const src = `Blok( kod: BLK-X, ne: "iş" ) {
  -->|
  ## Amaç
  bir şey yapar
  ## Kapsam
  şunu kapsar
  ## Sonuç
  biter
  |<--
  Katman( kod: KAT-X, ne: "önyüz" )
}`;
  const t = dnt(src);
  const y = t.find((x) => x.kod === "belge-yanlış-düğüm");
  assert.ok(y, "belge-yanlış-düğüm bekleniyor; gelen: " + JSON.stringify(t.map((x) => x.kod)));
  assert.equal(y.duzey, "uyarı");
  assert.match(y.mesaj, /KAT-X|Katman/, "yanlış bağlanılan çocuğu (Katman) söylemeli");
  assert.match(y.mesaj, /hemen önce/, "doğru yerleşim kuralını söylemeli");
  assert.match(y.oneri ?? "", /açılış satırından HEMEN ÖNCE|Amaç/, "öneri doğru yeri gösterir");
  // Aynı olguda kuru 'anlatı belgesi eksik' eksik-alan'ı BASILMAZ (çift/yanıltıcı mesaj yok)
  const eksik = t.find((x) => x.kod === "eksik-alan");
  assert.ok(!eksik || !/anlatı belgesi/.test(eksik.mesaj), "belge yanlış-düğümken kuru 'anlatı belgesi eksik' basılmamalı");
});

test("GBR-A06: gerçekten belgesiz Blok (çocukta da belge yok) → mevcut 'anlatı belgesi' mesajı KORUNUR", () => {
  const t = dnt('Blok( kod: BLK-Y, ne: "iş" ) {\n  Katman( kod: KAT-Y, ne: "k" )\n}');
  assert.ok(!t.some((x) => x.kod === "belge-yanlış-düğüm"), "çocukta belge yoksa yanlış-düğüm ÜRETİLMEZ");
  const eksik = t.find((x) => x.kod === "eksik-alan");
  assert.ok(eksik && /anlatı belgesi/.test(eksik.mesaj), "gerçekten belgesizde mevcut mesaj korunur: " + JSON.stringify(t.map((x) => x.kod)));
});

test("GBR-A06: belge Blok'un DOĞRU yerinde (hemen önünde) → hiçbir belge tanısı yok", () => {
  const src = `-->|
## Amaç
yapar
## Kapsam
kapsar
## Sonuç
biter
|<--
Blok( kod: BLK-Z, ne: "iş" ) {
  Katman( kod: KAT-Z, ne: "k" )
}`;
  const t = dnt(src);
  assert.ok(!t.some((x) => x.kod === "belge-yanlış-düğüm"), "doğru yerleşimde yanlış-düğüm yok");
  const eksik = t.find((x) => x.kod === "eksik-alan");
  assert.ok(!eksik || !/anlatı belgesi/.test(eksik.mesaj), "doğru yerleşimde 'anlatı belgesi eksik' yok");
});

// ── HTR-A04 (IDA dogfood oturum-2 · DOC-1/DOC-2): Hatırlatıcı şema dürüstlüğü ─
import { readFileSync as _rf } from "node:fs";
const HTR_SEMA = JSON.parse(_rf(fileURLToPath(new URL("../../../oz/siniflama/kayit.json", import.meta.url)), "utf8")).semalar["Hatırlatıcı"];

test("HTR-A04 DOC-1: dönüşTetikleyici şema alan-listelerinde (opsiyonel + koşullu) görünür", () => {
  assert.ok(HTR_SEMA.opsiyonel.includes("dönüşTetikleyici"), "opsiyonel'de dönüşTetikleyici yok (siniflama çıktısında görünmez)");
  const capaKosullar = HTR_SEMA.kosullu.filter((k: { alan: string; gerekli: string[] }) => k.alan === "çapa" && k.gerekli.includes("dönüşTetikleyici"));
  assert.equal(capaKosullar.length, 4, "adım-dışı 4 çapa (mimari/yasa/nitelik/gelecek) için koşullu dönüşTetikleyici");
});

test("HTR-A04 DOC-1: adım-dışı çapa dönüşTetikleyici İSTER; çapa=adım İSTEMEZ; beyanlı temiz", () => {
  const eksik = dnt('Hatırlatıcı( kod: HTR-M, durum: açık, çapa: mimari, ne: "x" )');
  assert.ok(eksik.some((t) => t.kod === "eksik-alan" && /dönüşTetikleyici/.test(t.mesaj)), "mimari çapa dönüşTetikleyici istemeli");
  const adim = dnt('Hatırlatıcı( kod: HTR-A, durum: açık, çapa: adım, hatırlat: ADM-X, ne: "x" )');
  assert.ok(!adim.some((t) => t.kod === "eksik-alan" && /dönüşTetikleyici/.test(t.mesaj)), "çapa=adım dönüşTetikleyici İSTEMEZ (hatırlat ister)");
  const temiz = dnt('Hatırlatıcı( kod: HTR-T, durum: açık, çapa: gelecek, dönüşTetikleyici: "olay X olunca", ne: "x" )');
  assert.ok(!temiz.some((t) => t.kod === "eksik-alan"), "dönüşTetikleyici beyanlı → temiz: " + JSON.stringify(temiz.map((t) => t.kod)));
});

test("HTR-A04 DOC-2: kural metni ÇAPA sıralamasını 'öncelik' değil 'çapa' olarak adlandırır (p0-p3 ayrı)", () => {
  assert.match(HTR_SEMA.kural, /Çapa önem sırası/, "çapa sıralaması açıkça 'çapa' olarak adlandırılmalı");
  assert.match(HTR_SEMA.kural, /öncelik alanından ayrıdır/, "p0-p3 öncelik alanından ayrıştığı belirtilmeli");
});

// ═══════════════════════════════════════════════════════════════════════════
// ✂️ KIRPILMAMIŞ İKİZ CÜMLE — pencere kaydın tamamını görür (VIT-GRAF-A18)
//
//   HÜKMÜN DOĞUŞU. Founder 2026-08-16 tarihli canlı turda ipucu penceresinin
//   satırın kırpılmış metnini olduğu gibi tekrarladığını bildirdi. Kırpma bir
//   SUNUM kararıdır: komut satırının bir satırı ve ağacın bir etiketi sınırlıdır,
//   buna karşılık ipucu penceresi kaydın tamamını taşımak üzere açılır.
//
//   ÇÖZÜM KIRPMAYI SÖKMEZ, İKİNCİ BİR CÜMLE EKLER. Adımın sınırı komut satırı
//   çıktısının bilgi içeriğinin değişmemesini şart koşar; bu yüzden `mesaj` alanı
//   kırpılmış hâlini aynen korur ve tanı, aynı olgunun kırpılmamış gövdeyle
//   kurulmuş ikizini `tamMesaj` alanında AYRICA taşır. Cümle iki kez kurulur,
//   metin elle kesilip yapıştırılmaz; böylece iki yüz aynı şablondan doğar ve
//   ikisi arasında yalnız gövde uzunluğu farklıdır.
// ═══════════════════════════════════════════════════════════════════════════

/** Kırpma eşiğini kesin aşan, tek parça bir düğüm gövdesi. */
const UZUN_NE = "Bu gövde kırpma eşiğini kesin olarak aşar ve bu yüzden komut satırına " +
  "basılan cümlede kısaltılır; okuyucunun kaydın tamamını görebilmesi ise ipucu " +
  "penceresinin işidir ve bu nöbet tam olarak o ayrımı ölçmektedir.";

test("VIT-GRAF-A18: hatırlatıcı tanısı kırpılmış mesajı ile kırpılmamış ikizini birlikte taşır", () => {
  const t = dnt(`Hatırlatıcı( kod: HTR-UZUN, durum: açık, çapa: nitelik, ne: "${UZUN_NE}" )`)
    .find((x) => x.kod === "açık-hatırlatıcı");
  assert.ok(t, "açık-hatırlatıcı tanısı üretilmedi");
  assert.ok(t.mesaj.endsWith("…"), "komut satırı mesajı kırpılmış hâlini kaybetti");
  assert.ok(!t.mesaj.includes(UZUN_NE), "komut satırı mesajı uzadı; Adımın sınırı bunu yasaklar");
  assert.ok(t.tamMesaj, "kırpılmamış ikiz cümle üretilmedi");
  assert.ok(t.tamMesaj.includes(UZUN_NE), "ikiz cümle kaydın tam gövdesini taşımıyor");
  assert.equal(t.tamMesaj.includes("…"), false, "ikiz cümlede kırpma işareti kaldı");
  assert.ok(t.tamMesaj.includes("HTR-UZUN"), "ikiz cümle kaydın kimliğini düşürmüş");
});

test("VIT-GRAF-A18: kırpma eşiğinin altındaki gövdede ikinci alan hiç doğmaz", () => {
  const t = dnt('Hatırlatıcı( kod: HTR-KISA, durum: açık, çapa: nitelik, ne: "Kısa gövde." )')
    .find((x) => x.kod === "açık-hatırlatıcı");
  assert.ok(t, "açık-hatırlatıcı tanısı üretilmedi");
  assert.equal(t.mesaj.includes("…"), false, "kısa gövde boş yere kırpıldı");
  assert.equal(t.tamMesaj, undefined,
    "kısa gövdede ikiz alan doğdu; aynı metni iki alanda taşımak kaydı şişirir ve var olmayan bir fark ima eder");
});

test("VIT-GRAF-A18: ikiz cümle iki dil hanesinde de yaşar ve dil seçimiyle birlikte döner", () => {
  const t = dnt(`Hatırlatıcı( kod: HTR-DIL, durum: açık, çapa: nitelik, ne: "${UZUN_NE}" )`)
    .find((x) => x.kod === "açık-hatırlatıcı");
  assert.ok(t?.dilMetinleri, "dil haneleri yok");
  assert.ok(t.dilMetinleri.tr.tamMesaj?.includes(UZUN_NE), "Türkçe hane ikizi taşımıyor");
  assert.ok(t.dilMetinleri.en.tamMesaj?.includes(UZUN_NE), "İngilizce hane ikizi taşımıyor");
  const en = taniDilineCevir(t, "en");
  assert.equal(en.tamMesaj, t.dilMetinleri.en.tamMesaj, "dil çevirisi ikizi haneyle birlikte taşımadı");
  assert.notEqual(en.tamMesaj, t.dilMetinleri.tr.tamMesaj, "dil çevirisinde Türkçe ikiz İngilizce haneye sızdı");
});

test("VIT-GRAF-A18: geliştirmede çapası da kırpılmamış ikizini taşır", () => {
  const t = dnt(`Adım( kod: ADM-UZUN, durum: geliştirmede, ne: "${UZUN_NE}" )`)
    .find((x) => x.kod === "geliştirmede-çapa");
  assert.ok(t, "geliştirmede-çapa tanısı üretilmedi");
  assert.ok(t.mesaj.endsWith("…"), "komut satırı mesajı kırpılmış hâlini kaybetti");
  assert.ok(t.tamMesaj?.includes(UZUN_NE), "ikiz cümle kaydın tam gövdesini taşımıyor");
});

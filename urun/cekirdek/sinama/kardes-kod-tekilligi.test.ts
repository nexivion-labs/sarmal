// ═══════════════════════════════════════════════════════════════════════════
// kardes-kod-tekilligi.test.ts — 🔗 KPS-KOD-A01 · Kardeş Projelerde Kod Tekilliği (ORK-4 · MIM-1.1)
//
//   Founder hükmü (2026-09-10): TEKDÜZELİK KORUNUR, TEKİLLİK ÇATIDA KURULUR.
//   Şablondan doğan her müşteri projesi aynı Kitaplık, Raf ve Adım kodlarını
//   taşır ve taşımalıdır; kodlara önek eklemek yasaktır. Çakışma birleştirme
//   anında çözülür: graf bir kodu hangi Proje kökünün altında bulduysa onu o
//   kökün ad alanında (`PRJ::KOD`) tutar ve kardeşlerin aynı adlı kodları ayrı
//   düğümler olarak yaşar. Ölçülmüş kusur: doğuş paketiyle doğan iki kardeşin
//   sekiz kodu çatı grafında tek düğüme çöküyor, kazanan proje tarama sırasına
//   bağlı çıkıyor ve ikinci projenin karnesi on dört yerine altı düğüm
//   gösteriyordu.
//
//   Nöbetler üç şeyi birlikte ölçer: ayrışmanın KURULDUĞU yer (iki kardeş,
//   ayrı düğümler, her birinin kapsayanı kendi Projesi, karneler eşit), çözümün
//   DOĞRU HEDEFE gittiği yer (çıplak atıf kendi Projesinde, ad alanlı atıf
//   kardeşte, köksüz kaynak tesadüfî eşleşme kurmaz) ve DEĞİŞMEYEN yer (tek
//   projeli depo bayt bayt aynı, ders dünyası kopyası kardeş sayılmaz).
//   Çevrimin ayıramadığı hâl de susmaz: aynı Proje kodu iki kökte ilanlıysa
//   `ayrisamayan` listesi onu adıyla söyler.
//
//   MUTASYON KANITI (2026-09-10 · her satır geri alındı, diff ile doğrulandı):
//   ① `anahtar` hep çıplak kodu döndürünce ayrışma, kapsayan ve karne
//      nöbetleri kırmızı; ② çıplak hedef eski `dugumler.has(hedef)` yoluna
//      dönünce "atıf kendi Projesinde çözülür" nöbeti kırmızı; ③ `ortakKod`
//      listesi boş üretilince seçenek, özet yüzü ve etki nöbetleri kırmızı;
//      ④ `ayrisamayan` boş üretilince susma nöbeti kırmızı; ⑤ ortaklık eşiği
//      `> 1` yerine `> 0` olunca tek projeli değişmezlik nöbeti kırmızı;
//      ⑥ gezinme yüzü çok projeli hâli görmezden gelince gezin nöbeti kırmızı.
// ═══════════════════════════════════════════════════════════════════════════

import { test } from "node:test";
import assert from "node:assert/strict";
import { belirtecle } from "../src/belirtec.ts";
import { ayristir } from "../src/ayristirici.ts";
import type { Program } from "../src/sozdizim.ts";
import { dagKur, projeKarneleri, adAlaniSecenekleri, dugumYokMetni } from "../src/dag.ts";
import { grafCikar, grafOzetYuzu, grafYuz } from "../src/graf.ts";
import { etkiMetni } from "../src/etki.ts";
import { projeKapsamlari, KimlikIndeksi, gezinRaporu } from "../src/kimlik.ts";

function progla(kaynaklar: Record<string, string>): Map<string, Program> {
  return new Map(Object.entries(kaynaklar).map(([dosya, k]) => [dosya, ayristir(belirtecle(k))]));
}

/** Doğuş paketinin verdiği giriş ilanı — her kardeşte AYNI kodlar, yalnız Proje kodu farklı. */
const girisIlani = (prj: string) => `
Proje( kod: PRJ-${prj}, ad: "${prj} Projesi", rejim: katı, ne: "Şablondan doğan müşteri projesi." ) {
  Teknoloji( kod: TEK-${prj}, ad: "${prj} tekniği" )
  Kitaplık( kod: KTP-IS, yol: "is/", ne: "İşin kitaplığı." ) {
    Raf( kod: RAF-PLAN, yol: "plan/", ne: "Plan ağacı." )
    Raf( kod: RAF-DURUM, yol: "durum/", ne: "Durum devri." )
  }
  Kitaplık( kod: KTP-OZ, yol: "oz/", ne: "Özün kitaplığı." ) {
    Raf( kod: RAF-SINIFLAMA, yol: "siniflama/", ne: "Tip işaretçisi." )
  }
}`;

/** Doğuş paketinin ilk planı — kuruluş Adımının kodu her kardeşte AYNI. */
const ilkPlan = (prj: string) => `
Faz( kod: FAZ-${prj}-DOGUS, ad: "Doğuş Mevsimi", hedefTarih: "2026-09" ) {
  Blok( kod: BLK-${prj}-KURULUS, ne: "Kuruluş işi tam cümleyle yazılmıştır." ) {
    Katman( kod: KAT-${prj}-MIMARI, ad: "Mimari", kullanır: TEK-${prj} ) {
      AltKatman( kod: ALT-${prj}-PLANLAMA, ad: "Planlama", departman: planlama ) {
        Adım( kod: ADM-KURULUS-01, durum: beklemede, ne: "Mimari diyaloğu yürütmek." )
        Adım( kod: ADM-KURULUS-02, durum: beklemede, bağımlı: [ ADM-KURULUS-01 ], ne: "Kuruluşu kapatmak." )
      }
    }
  }
}`;

const catiIlani = `
ÇalışmaAlanı( kod: CAL-AJANS, ad: "Ajans", ne: "Şablon ile müşterilerini saran çatı." ) {
  Kitaplık( kod: KTP-BERBER, yol: "berber/", ne: "Şablon projesi." )
  Kitaplık( kod: KTP-KUAFOR, yol: "kuafor/", ne: "Şablondan doğan müşteri." )
  Kitaplık( kod: KTP-OZ, yol: "oz/", ne: "Çatının kendi özü." ) {
    Raf( kod: RAF-SINIFLAMA, yol: "siniflama/", ne: "Çatının tip işaretçisi." )
  }
}`;

/** İki kardeş projeli çatı: giriş ilanları ve ilk planlar kod kod aynı. */
function ajans(ek: Record<string, string> = {}): Map<string, Program> {
  return progla({
    "ajans_anadizin.sar": catiIlani,
    "berber/berber_anadizin.sar": girisIlani("BERBER"),
    "berber/is/plan/ilk_plan.sar": ilkPlan("BERBER"),
    "kuafor/kuafor_anadizin.sar": girisIlani("KUAFOR"),
    "kuafor/is/plan/ilk_plan.sar": ilkPlan("KUAFOR"),
    ...ek,
  });
}

/** Tek projeli depo: aynı şablon, çatısız ve kardeşsiz. */
function tekProje(): Map<string, Program> {
  return progla({
    "berber_anadizin.sar": girisIlani("BERBER"),
    "is/plan/ilk_plan.sar": ilkPlan("BERBER"),
  });
}

const ORTAK = ["KTP-IS", "RAF-PLAN", "RAF-DURUM", "KTP-OZ", "RAF-SINIFLAMA", "ADM-KURULUS-01", "ADM-KURULUS-02"];

// ── ① Ayrışmanın KURULDUĞU yer ───────────────────────────────────────────────

test("KPS-KOD-A01 · kardeş projelerin aynı adlı kodları çatı grafında AYRI düğümlerdir ve her birinin kapsayanı kendi Projesidir", () => {
  const dag = dagKur(ajans());
  for (const kod of ORTAK) {
    const a = dag.dugumler.get(`PRJ-BERBER::${kod}`);
    const b = dag.dugumler.get(`PRJ-KUAFOR::${kod}`);
    assert.ok(a, `${kod} berber altında ayrı düğüm olmalı`);
    assert.ok(b, `${kod} kuafor altında ayrı düğüm olmalı`);
    assert.equal(a.yerelKod, kod);
    assert.equal(b.yerelKod, kod);
    assert.equal(a.dosya.startsWith("berber/"), true);
    assert.equal(b.dosya.startsWith("kuafor/"), true);
    // Çıplak anahtar iki kardeşten hiçbirine kalmaz; çatının KENDİ ilan ettiği
    // KTP-OZ ile RAF-SINIFLAMA köksüz dosyadan çıplak yaşar, onlar aşağıda ölçülür.
    if (kod !== "KTP-OZ" && kod !== "RAF-SINIFLAMA") {
      assert.equal(dag.dugumler.has(kod), false, `${kod} çıplak anahtarla tek düğüme çökmemeli`);
    }
  }
  // Kitaplık kademesi kendi Projesinin altındadır (Founder'ın zorunlu kıldığı kademe çatıda kaybolmaz).
  assert.equal(dag.dugumler.get("PRJ-BERBER::KTP-IS")!.kapsayan, "PRJ-BERBER");
  assert.equal(dag.dugumler.get("PRJ-KUAFOR::KTP-IS")!.kapsayan, "PRJ-KUAFOR");
  // Raf kendi Kitaplığının ad alanlı anahtarına bağlıdır; zincir kopmaz.
  assert.equal(dag.dugumler.get("PRJ-KUAFOR::RAF-PLAN")!.kapsayan, "PRJ-KUAFOR::KTP-IS");
  // Çatının KENDİ KTP-OZ ve RAF-SINIFLAMA'sı köksüz dosyadadır: ad alanı almaz, çıplak kalır.
  assert.equal(dag.dugumler.get("KTP-OZ")!.dosya, "ajans_anadizin.sar");
  assert.equal(dag.dugumler.get("RAF-SINIFLAMA")!.kapsayan, "KTP-OZ");
  // Ortak kod ölçümü BEKLENEN durumu sayar: yedi kod, ikişer Proje.
  assert.deepEqual(dag.ortakKod.map((o) => o.kod).sort(), [...ORTAK].sort());
  for (const o of dag.ortakKod) assert.deepEqual(o.projeler, ["PRJ-BERBER", "PRJ-KUAFOR"]);
  assert.deepEqual(dag.ayrisamayan, []);
});

test("KPS-KOD-A01 · iki kardeşin karnesi EŞİTTİR: ikinci proje çatı kökünden düğüm kaybetmez", () => {
  const programlar = ajans();
  const dag = dagKur(programlar);
  const karneler = projeKarneleri(dag, projeKapsamlari(programlar));
  const berber = karneler.find((k) => k.kod === "PRJ-BERBER")!;
  const kuafor = karneler.find((k) => k.kod === "PRJ-KUAFOR")!;
  // Tek başına ölçülen proje kaç düğümse çatıdan da o kadar.
  const tek = dagKur(tekProje());
  assert.equal(berber.dugum, tek.dugumler.size);
  assert.equal(kuafor.dugum, tek.dugumler.size);
  assert.equal(berber.adim, 2);
  assert.equal(kuafor.adim, 2);
  // Çatı grafının toplamı = iki proje + çatının kendi altı düğümü (çatı, üç Kitaplık, bir Raf, ...).
  const catininKendi = [...dag.dugumler.values()].filter((d) => d.dosya === "ajans_anadizin.sar").length;
  assert.equal(dag.dugumler.size, 2 * tek.dugumler.size + catininKendi);
});

// ── ② Çözümün DOĞRU HEDEFE gittiği yer ───────────────────────────────────────

test("KPS-KOD-A01 · çıplak atıf yalnız KENDİ Projesinde çözülür: kuaforun ADM-KURULUS-02'si kuaforun 01'ini bekler, berberinkini değil", () => {
  const dag = dagKur(ajans());
  const k02 = dag.dugumler.get("PRJ-KUAFOR::ADM-KURULUS-02")!;
  assert.deepEqual(k02.oncekiler, ["PRJ-KUAFOR::ADM-KURULUS-01"]);
  assert.deepEqual(dag.dugumler.get("PRJ-KUAFOR::ADM-KURULUS-01")!.sonrakiler, ["PRJ-KUAFOR::ADM-KURULUS-02"]);
  assert.deepEqual(dag.dugumler.get("PRJ-BERBER::ADM-KURULUS-01")!.sonrakiler, ["PRJ-BERBER::ADM-KURULUS-02"]);
  assert.deepEqual(dag.kopuk, []);
  // `kullanır` zemin kenarı da kendi anahtarıyla iner (Katman → Teknoloji).
  assert.deepEqual(dag.dugumler.get("KAT-KUAFOR-MIMARI")!.zemin, ["TEK-KUAFOR"]);
});

test("KPS-KOD-A01 · ad alanlı atıf (`PRJ-A::KOD`) kardeşin AYRIŞTIRILMIŞ düğümüne bağlanır", () => {
  const dag = dagKur(ajans({
    "kuafor/is/plan/ek.sar": `
      Faz( kod: FAZ-KUAFOR-EK, ad: "Ek", hedefTarih: "2026-10" ) {
        Blok( kod: BLK-KUAFOR-EK, ne: "Ek işin gövdesi." ) {
          Katman( kod: KAT-KUAFOR-EK, ad: "Ek", kullanır: TEK-KUAFOR ) {
            AltKatman( kod: ALT-KUAFOR-EK, ad: "Ek", departman: kodlama ) {
              Adım( kod: ADM-KUAFOR-EK, durum: beklemede, bağımlı: [ PRJ-BERBER::ADM-KURULUS-01 ], ne: "Berberin kuruluşunu bekler." )
            }
          }
        }
      }`,
  }));
  assert.deepEqual(dag.dugumler.get("ADM-KUAFOR-EK")!.oncekiler, ["PRJ-BERBER::ADM-KURULUS-01"]);
  assert.ok(dag.dugumler.get("PRJ-BERBER::ADM-KURULUS-01")!.sonrakiler.includes("ADM-KUAFOR-EK"));
  assert.deepEqual(dag.kopuk, []);
});

test("KPS-KOD-A01 · köksüz kaynak ortak koda ÇIPLAK bakar: tesadüfî kardeş eşleşmesi bağ sayılmaz, kenar kopuk kalır", () => {
  const dag = dagKur(ajans({
    "notlar.sar": `Hatırlatıcı( kod: HTR-KOKSUZ, ne: "Çatı düzeyinden kuruluşa bakar.", bağımlı: [ ADM-KURULUS-01 ] )`,
  }));
  assert.deepEqual(dag.dugumler.get("HTR-KOKSUZ")!.oncekiler, []);
  assert.equal(dag.kopuk.length, 1);
  assert.equal(dag.kopuk[0].hedef, "ADM-KURULUS-01");
});

// ── ③ Araç yüzleri: sessizce seçmez, SORAR ───────────────────────────────────

test("KPS-KOD-A01 · çıplak ortak kod sorulunca araçlar seçenekleri PROJESİYLE sıralar; ortak olmayan kod eski cümleyi alır", () => {
  const dag = dagKur(ajans());
  assert.deepEqual(adAlaniSecenekleri(dag, "KTP-IS"), ["PRJ-BERBER::KTP-IS", "PRJ-KUAFOR::KTP-IS"]);
  assert.deepEqual(adAlaniSecenekleri(dag, "KAT-BERBER-MIMARI"), []);
  const metin = dugumYokMetni(dag, "KTP-IS", "eski cümle");
  assert.match(metin, /2 kardeş Projede/);
  assert.match(metin, /PRJ-BERBER::KTP-IS/);
  assert.match(metin, /PRJ-KUAFOR::KTP-IS/);
  assert.equal(dugumYokMetni(dag, "YOK-BOYLE-KOD", "eski cümle"), "eski cümle");
  // etki: çıplak ortak kod "yok" değildir — sorar; ad alanlı sorgu cevaplanır.
  assert.match(etkiMetni(dag, "ADM-KURULUS-01"), /PRJ-KUAFOR::ADM-KURULUS-01/);
  assert.match(etkiMetni(dag, "PRJ-KUAFOR::ADM-KURULUS-01"), /Doğrudan bekleyenler \(1\)/);
  // graf kökü: çıplak ortak kod alt-graf vermez (yüzey seçenekleri basar), ad alanlı kök verir.
  assert.equal(grafCikar(dag, "KTP-IS"), undefined);
  assert.equal(grafCikar(dag, "PRJ-KUAFOR::KTP-IS")!.düğümler.some((d) => d.kod === "PRJ-KUAFOR::RAF-PLAN"), true);
});

test("KPS-KOD-A01 · graf özet yüzü ortak kodu BEKLENEN durum olarak basar ve JSON düğümü yerel kodunu taşır", () => {
  const g = grafCikar(dagKur(ajans()))!;
  const ozet = grafOzetYuzu(g);
  assert.match(ozet, /KARDEŞ PROJELERDE ORTAK KOD \(7 · beklenen durum, tanı değil/);
  assert.match(ozet, /KTP-IS → PRJ-BERBER · PRJ-KUAFOR/);
  assert.doesNotMatch(ozet, /AYRIŞAMAYAN/);
  const d = g.düğümler.find((x) => x.kod === "PRJ-KUAFOR::KTP-IS")!;
  assert.equal(d.yerelKod, "KTP-IS");
  assert.equal(g.ortakKod!.length, 7);
});

test("KPS-KOD-A01 · gezin yüzü aynı kodu iki kardeşte bulunca ikisini de projesiyle gösterir ve ad alanıyla sormayı ister", () => {
  const dosyalar: Record<string, string> = {
    "ajans_anadizin.sar": catiIlani,
    "berber/berber_anadizin.sar": girisIlani("BERBER"),
    "kuafor/kuafor_anadizin.sar": girisIlani("KUAFOR"),
    // Ders dünyası kopyası kardeş DEĞİLDİR: sayıma girmez, kart almaz.
    "berber/ogreti/sablon/ornek_anadizin.sar": girisIlani("SABLON"),
  };
  const indeks = new KimlikIndeksi();
  for (const [d, m] of Object.entries(dosyalar)) indeks.dosyaGuncelle(d, m);
  const rapor = gezinRaporu(indeks, "KTP-IS", (d) => dosyalar[d]);
  assert.match(rapor, /'KTP-IS' 2 kardeş Projede birden ilanlı/);
  assert.match(rapor, /PRJ-BERBER::KTP-IS/);
  assert.match(rapor, /PRJ-KUAFOR::KTP-IS/);
  assert.match(rapor, /BAĞLAM KARTI · PRJ-BERBER:/);
  assert.match(rapor, /BAĞLAM KARTI · PRJ-KUAFOR:/);
  assert.doesNotMatch(rapor, /PRJ-SABLON::KTP-IS/);
  // Ad alanlı sorgu tek Projeye iner ve kartı etiketsizdir.
  const tek = gezinRaporu(indeks, "PRJ-KUAFOR::KTP-IS", (d) => dosyalar[d]);
  assert.match(tek, /TANIM \(1\)/);
  assert.match(tek, /kuafor\/kuafor_anadizin\.sar/);
  assert.doesNotMatch(tek, /kardeş Projede birden/);
});

// ── ④ DEĞİŞMEYEN yer ─────────────────────────────────────────────────────────

test("KPS-KOD-A01 · tek projeli depoda hiçbir şey değişmez: anahtarlar çıplak, yerel kod yok, ölçümler boş, JSON yeni alan taşımaz", () => {
  const dag = dagKur(tekProje());
  for (const kod of ORTAK) {
    const d = dag.dugumler.get(kod);
    assert.ok(d, `${kod} çıplak anahtarla durmalı`);
    assert.equal(d.yerelKod, undefined);
  }
  assert.equal([...dag.dugumler.keys()].some((k) => k.includes("::")), false);
  assert.deepEqual(dag.ortakKod, []);
  assert.deepEqual(dag.ayrisamayan, []);
  const json = grafYuz(dag)!;
  assert.doesNotMatch(json, /yerelKod|ortakKod|ayrışamayan/);
  assert.doesNotMatch(grafOzetYuzu(grafCikar(dag)!), /ORTAK KOD|AYRIŞAMAYAN/);
});

test("KPS-KOD-A01 · ders dünyası kopyası kardeş sayılmaz: şablondaki aynı kod ürün kodunu ad alanına itmez", () => {
  const dag = dagKur(progla({
    "berber_anadizin.sar": girisIlani("BERBER"),
    "ogreti/sablon/dogus/anadizin.sar": girisIlani("SABLON"),
  }));
  assert.ok(dag.dugumler.get("KTP-IS"));
  assert.equal(dag.dugumler.get("KTP-IS")!.yerelKod, undefined);
  assert.deepEqual(dag.ortakKod, []);
});

// ── ⑤ Çevrimin ayıramadığı yer SUSMAZ ────────────────────────────────────────

test("KPS-KOD-A01 · aynı Proje kodu iki kökte ilanlıysa ad alanı çoğalmıştır: çevrim ayıramaz, susmaz ve kökü adıyla söyler", () => {
  const dag = dagKur(progla({
    "ajans_anadizin.sar": catiIlani,
    "berber/berber_anadizin.sar": girisIlani("BERBER"),
    // Şablon HİÇBİR BAYTI DEĞİŞMEDEN kopyalandı — Proje kodu dahil.
    "kuafor/berber_anadizin.sar": girisIlani("BERBER"),
  }));
  assert.deepEqual(dag.ayrisamayan, [{ kod: "PRJ-BERBER", dosyalar: ["berber/berber_anadizin.sar", "kuafor/berber_anadizin.sar"] }]);
  // Ortak kod yok: ikisi de AYNI ad alanındadır, çevrim onları ayıramaz ve ilk tanım kazanır.
  assert.deepEqual(dag.ortakKod, []);
  assert.equal(dag.dugumler.get("KTP-IS")!.dosya, "berber/berber_anadizin.sar");
  const ozet = grafOzetYuzu(grafCikar(dag)!);
  assert.match(ozet, /AD ALANI OLMADAN AYRIŞAMAYAN PROJE KÖKÜ \(1/);
  assert.match(ozet, /PRJ-BERBER — berber\/berber_anadizin\.sar · kuafor\/berber_anadizin\.sar/);
});

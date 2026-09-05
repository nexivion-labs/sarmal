// ═══════════════════════════════════════════════════════════════════════════
// tani-yuzeyleri.test.ts — 🧭 ÜÇ SUNUM YÜZEYİ NÖBETİ (GOC-YUZEY-A06)
//
//   Kanonun hükmü şudur: düzeltilecek sapma Problems yüzeyine, kullanıcının
//   bilerek açık bıraktığı işaretler Hatırlatıcılar yüzeyine, düzeltme
//   istemeyen ölçüm ve durum satırları Bildirimler yüzeyine gider; bir doğa
//   başka yüzeyi işgal edemez ve tanının kimliği ile düzeyi bütün yüzeylerde
//   korunur.
//
//   NÖBET SAHTE OLMASIN DİYE ÜÇ ŞART: Birincisi, nöbet gerçek dağıtım
//   işlevini koşturur — sunum verisi taklit edilmez, `yuzeyeAyir` eklentinin
//   canlı yolunda çağırdığı işlevin ta kendisidir. İkincisi, nöbet boş küme
//   üstünde koşmaz: her yüzey için gerçekten kayıt üreten fikstürler kurulur
//   ve fikstürün boş olmadığı ayrıca ölçülür. Üçüncüsü, nöbetin ölçtüğü
//   mutasyonla kanıtlanır: bir kayıt kasten yanlış yüzeye taşındığında ilgili
//   iddia kırmızıya döner; üç yüzeyin üçü için de ayrı ayrı gösterilir.
//
//   Kayıt edilen ders: bu depoda daha önce iki sahte nöbet yakalandı; biri
//   dört çağrı yerinden yalnız birini koruyordu, diğeri boş küme üstünde
//   koşuyordu. İkisi de "kurulmuş" sayılıyordu.
// ═══════════════════════════════════════════════════════════════════════════
// Yüzey dili kapısını bu dosya kendi kurar: `npm test` ön-yüklemesi olmadan tek
// başına koşturulduğunda sahte kırmızı vermesin (ön-yükleme ile aynı bağ, ESM
// önbelleği yüzünden iki kez koşmaz).
import "./dil-kur.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Tani, Duzey } from "../../cekirdek/src/tani.ts";
import { beklenenSunumYuzeyi, type SunumYuzeyi } from "../../cekirdek/src/denetim.ts";
import { taniSicili, YENI_TANI_KANONU, ONCEKI_TANI_KODLARI } from "../../cekirdek/src/tani-sicili.ts";
import {
  yuzeyeAyir, projeyeGrupla, kokeGoreOzetle, kayitGorunumu, dagitimKusurlari,
  yuzeyMatrisi, kaydinYuzeyi, YuzeyDefteri, meyveKokleri,
  GORUNUS_HATIRLATICILAR, GORUNUS_BILDIRIMLER, GORUNUS_FIKIRLER,
  dosyayaGrupla, yuzeyDosyaAdiniAl, dugumKodu, kodluEtiket,
  hatirlaticiIsareti, HATIRLATICI_ISARETLERI, panoMetni, panoDugumu,
  DURUM_CUBUGU_GIRDILERI, turDagilimi, OZET_TUR_SAYISI,
  type YuzeyKaydi, type YuzeyDagilimi, type SatirIsareti,
} from "../src/yuzey-cekirdek.ts";
import {
  YUZEY_BOS_DURUM, YUZEY_ACIKLAMALARI,
  ozetSatiriEtiketi, ozetSatiriAciklamasi, ozetSatiriIpucu,
  panoyaKopyalaBasligi,
  projeSatiriEtiketi, projeSatiriAciklamasi, projeSatiriIpucu, taniKisaAdi,
  fikirEtiketi,
  kayitEtiketi, kayitIpucu, panoKaydiMetni, panoKumeMetni,
  yuzeyKokleriniAyarla, calismaAlaninaGoreli,
} from "../src/yuzey-metinleri.ts";
// VIT-GRAF-A15 ikinci işi: Fikir hanesi Hatırlatıcılar panelinin İÇİNDE yaşar,
// dolayısıyla ortak satır biçimi nöbeti iki haneyi de aynı yerde ölçer.
import { fikirleriTopla, fikirGorunumu, fikirPanoMetni, type FikirKaydi } from "../src/fikir-cekirdek.ts";
import { EKSEN_TIPLERI } from "../src/simge-cizelgesi.ts";
// NOT: `teknoloji-simgesi.ts` çalışma zamanında vscode kabuğunu içeri alır ve bu
// birim süitinde yüklenemez; onun tek-kaynak sözleşmesi aşağıda panellerin KENDİ
// kaynağı üstünden ölçülür (Onaylar panelinin nöbetiyle aynı yöntem).
import { BILDIRIM_ROZET, bildirimTuru } from "../src/yol-dekor.ts";
import { ANLAM_RENKLERI, SATIR_SIMGELERI, satirSvgVaryanti } from "../src/simge-cizelgesi.ts";
import { belirtecle } from "../../cekirdek/src/belirtec.ts";
import { ayristir } from "../../cekirdek/src/ayristirici.ts";
import type { Program } from "../../cekirdek/src/sozdizim.ts";
import { yinelenenKodTanilari, varlikSinirlari } from "../../cekirdek/src/denetci.ts";
import { yeniTani } from "../../cekirdek/src/tani-metinleri.ts";

const oku = (u: string): string => readFileSync(fileURLToPath(new URL(u, import.meta.url)), "utf8");
// Problems yerine Bildirimler yüzeyine düşen kimlikler. Sekizi GOC-TERFI-A05
// turunun terfi REDDİ olan borçlardır; ikisi 2026-08-22 tarihinde Founder
// onayıyla doğrudan bilgi düzeyinde doğan gözlemlerdir ve düzeltilecek bir
// sapma değil, bekleyen işi görünür kılan işaretlerdir.
const TERFI_RET_KIMLIKLERI = new Set([
  "adım-atomikliği", "beceri-kartı-eksik", "yürütme-kenarı-sözleşmesi",
  "üretim-kökeni-ihlali", "kullanır-kenarı-ihlali", "seçilemez-adım-yürütümü",
  "şema-dışı-alan", "terfi-kanıtı-eksik",
  "önceliksiz-adım", "ateşlemiş-hatırlatıcı",
  // On birincisi 2026-08-27 tarihinde Founder ölçümüyle doğdu (ORK-8 mevsim
  // vadesi): beyan ile grafın ayrıştığını bildirir, düzeltilecek bir sapma değil
  // bekleyen işi görünür kılan gözlemdir; bu yüzden Bildirimler yüzeyine düşer.
  "mevsim-vadesi-geçti",
]);
const PAKET = JSON.parse(oku("../package.json")) as {
  contributes: { views: Record<string, Array<{ id: string; name: string; contextualTitle?: string }>> };
};
const PAKET_NLS_TR = JSON.parse(oku("../package.nls.tr.json")) as Record<string, string>;
const yerellestir = (deger: string): string => {
  const anahtar = /^%([^%]+)%$/.exec(deger)?.[1];
  return anahtar ? PAKET_NLS_TR[anahtar] : deger;
};

const ANA = { kod: "SRM", ad: "Sarmal" };
const OS = { kod: "NOS", ad: "kapalı ürün" };

/** Fikstür kaydı — kanonik tanı nesnesinin bütün alanları doldurulur. */
function kayit(
  kod: string, duzey: Duzey,
  ek: Partial<Tani> & { dosya?: string; proje?: { kod: string; ad: string } } = {},
): YuzeyKaydi {
  const { dosya = "/p/plan/omurga.sar", proje = ANA, ...taniEk } = ek;
  return {
    proje,
    dosya,
    tani: {
      duzey, kod,
      mesaj: `${kod} bulgusu bu satırda gözlendi.`,
      satir: 12, sutun: 3,
      oneri: `Yapıştır-düzelt: ${kod} için kanonik yazımı kullan.`,
      ...taniEk,
    },
  };
}

/** Üç doğayı da gerçekten üreten fikstür — nöbet boş küme üstünde koşmaz. */
function ucDogaliFikstur(): YuzeyKaydi[] {
  return [
    kayit("bilinmeyen-tip", "hata"),                       // düzeltilecek sapma
    kayit("çıplak-adımlı-katman", "uyarı"),                // düzeltilecek sapma
    kayit("açık-hatırlatıcı", "bilgi"),                    // bilinçli ileri bağlam
    kayit("açık-adım", "bilgi"),                           // bilinçli ileri bağlam
    kayit("bloklu-çapa", "bilgi"),                         // bilinçli ileri bağlam
    kayit("geliştirmede-çapa", "bilgi"),                   // bilinçli ileri bağlam
    kayit("kullanımsız-tip", "bilgi"),                     // salt bilgilendirme
    kayit("olgunluk-onayı", "bilgi"),                      // salt bilgilendirme
  ];
}

// ── ① Doğa ayrımı: her doğa YALNIZ kendi yüzeyinde görünür ───────────────────

test("yüzey ayrımı: hata ve uyarı Problems'ta, bilinçli işaretler Hatırlatıcılar'da, bilgi Bildirimler'de", () => {
  const girdi = ucDogaliFikstur();
  const d = yuzeyeAyir(girdi);

  // Fikstür gerçekten dolu — boş küme üstünde koşan nöbet hiçbir şey ölçmez.
  assert.ok(d.problems.length > 0, "Problems yüzeyi fikstürde boş kaldı; nöbet ölçmüyor demektir");
  assert.ok(d.hatırlatıcılar.length > 0, "Hatırlatıcılar yüzeyi fikstürde boş kaldı; nöbet ölçmüyor demektir");
  assert.ok(d.bildirimler.length > 0, "Bildirimler yüzeyi fikstürde boş kaldı; nöbet ölçmüyor demektir");

  assert.deepEqual(d.problems.map((k) => k.tani.kod), ["bilinmeyen-tip", "çıplak-adımlı-katman"]);
  assert.deepEqual(d.hatırlatıcılar.map((k) => k.tani.kod),
    ["açık-hatırlatıcı", "açık-adım", "bloklu-çapa", "geliştirmede-çapa"]);
  assert.deepEqual(d.bildirimler.map((k) => k.tani.kod), ["kullanımsız-tip", "olgunluk-onayı"]);
});

test("yüzey ayrımı: sızma yok — bir yüzeyin kaydı öteki iki yüzeyde bulunmaz", () => {
  const d = yuzeyeAyir(ucDogaliFikstur());
  const kodlari = (l: readonly YuzeyKaydi[]): Set<string> => new Set(l.map((k) => k.tani.kod));
  const p = kodlari(d.problems), h = kodlari(d.hatırlatıcılar), b = kodlari(d.bildirimler);
  for (const kod of p) {
    assert.ok(!h.has(kod), `"${kod}" hem Problems hem Hatırlatıcılar yüzeyinde görünüyor`);
    assert.ok(!b.has(kod), `"${kod}" hem Problems hem Bildirimler yüzeyinde görünüyor`);
  }
  for (const kod of h) assert.ok(!b.has(kod), `"${kod}" hem Hatırlatıcılar hem Bildirimler yüzeyinde görünüyor`);
});

// ── ② MUTASYON KANITI — üç yüzeyin üçü için ayrı ayrı ────────────────────────
//   Bir kaydı kasten yanlış yüzeye taşıyıp süitin kırmızıya döndüğünü ölçeriz.
//   `dagitimKusurlari` nöbetin ölçüm gözüdür: temiz dağıtımda boş liste döner.

test("mutasyon · Problems: hata düzeyli sapma Bildirimler'e taşınırsa nöbet kırmızıya döner", () => {
  const girdi = ucDogaliFikstur();
  const dogru = yuzeyeAyir(girdi);
  assert.deepEqual(dagitimKusurlari(girdi, dogru), [], "temiz dağıtımda kusur çıkmamalıydı");

  const hata = dogru.problems.find((k) => k.tani.duzey === "hata")!;
  const bozuk = {
    problems: dogru.problems.filter((k) => k !== hata),
    hatırlatıcılar: dogru.hatırlatıcılar,
    bildirimler: [...dogru.bildirimler, hata],           // ← kasten yanlış yüzey
  };
  const kusurlar = dagitimKusurlari(girdi, bozuk);
  assert.ok(kusurlar.some((c) => c.includes("bilinmeyen-tip") && c.includes("problems")),
    `Problems mutasyonu yakalanmadı; nöbet sahte olurdu. Dönen kusurlar: ${JSON.stringify(kusurlar)}`);
});

test("mutasyon · Hatırlatıcılar: bilinçli ileri bağlam Problems'a taşınırsa nöbet kırmızıya döner", () => {
  const girdi = ucDogaliFikstur();
  const dogru = yuzeyeAyir(girdi);
  const htr = dogru.hatırlatıcılar[0];
  const bozuk = {
    problems: [...dogru.problems, htr],                  // ← kasten yanlış yüzey
    hatırlatıcılar: dogru.hatırlatıcılar.filter((k) => k !== htr),
    bildirimler: dogru.bildirimler,
  };
  const kusurlar = dagitimKusurlari(girdi, bozuk);
  assert.ok(kusurlar.some((c) => c.includes("açık-hatırlatıcı") && c.includes("hatırlatıcılar")),
    `Hatırlatıcılar mutasyonu yakalanmadı; nöbet sahte olurdu. Dönen kusurlar: ${JSON.stringify(kusurlar)}`);
});

test("mutasyon · Bildirimler: bilgi kaydı Hatırlatıcılar'a taşınırsa nöbet kırmızıya döner", () => {
  const girdi = ucDogaliFikstur();
  const dogru = yuzeyeAyir(girdi);
  const bil = dogru.bildirimler[0];
  const bozuk = {
    problems: dogru.problems,
    hatırlatıcılar: [...dogru.hatırlatıcılar, bil],      // ← kasten yanlış yüzey
    bildirimler: dogru.bildirimler.filter((k) => k !== bil),
  };
  const kusurlar = dagitimKusurlari(girdi, bozuk);
  assert.ok(kusurlar.some((c) => c.includes("kullanımsız-tip") && c.includes("bildirimler")),
    `Bildirimler mutasyonu yakalanmadı; nöbet sahte olurdu. Dönen kusurlar: ${JSON.stringify(kusurlar)}`);
});

test("mutasyon · kayıp ve çift yayın: düşen kayıt da iki kez yayınlanan kayıt da yakalanır", () => {
  const girdi = ucDogaliFikstur();
  const dogru = yuzeyeAyir(girdi);

  const dusuk = { ...dogru, bildirimler: dogru.bildirimler.slice(1) };
  assert.ok(dagitimKusurlari(girdi, dusuk).some((c) => c.includes("kayıp yayın")),
    "kayıp yayın yakalanmadı");

  const cift = { ...dogru, bildirimler: [...dogru.bildirimler, dogru.bildirimler[0]] };
  assert.ok(dagitimKusurlari(girdi, cift).some((c) => c.includes("çift yayın")),
    "çift yayın yakalanmadı");
});

// ── ③ Tanı nesnesi yüzler arasında kayıpsız ──────────────────────────────────

test("kayıpsızlık: kod, düzey, mesaj, konum ve öneri yüzeye taşınırken değişmez", () => {
  const girdi = ucDogaliFikstur();
  const d = yuzeyeAyir(girdi);
  const cikti = [...d.problems, ...d.hatırlatıcılar, ...d.bildirimler];
  assert.equal(cikti.length, girdi.length, "yüzeylerden çıkan kayıt sayısı girdiyle eşit değil");
  for (const k of cikti) {
    const asil = girdi.find((g) => g.tani.kod === k.tani.kod)!;
    assert.deepEqual(k.tani, asil.tani, `"${k.tani.kod}" tanısı yüzeye taşınırken değişmiş`);
  }
});

test("kayıpsızlık: panel satırı kanonik alanların hiçbirini düşürmez", () => {
  const k = kayit("açık-hatırlatıcı", "bilgi", {
    mesaj: "Bu Hatırlatıcı hâlâ açık ve hedefi henüz gelmedi.",
    oneri: "Karar verince durum: kararlaştı yaz; iş bitince tamamlandı yaz.",
  });
  const g = kayitGorunumu(k);
  assert.equal(g.kod, "açık-hatırlatıcı");
  assert.equal(g.duzey, "bilgi");
  assert.equal(g.satir, 12);
  assert.equal(g.sutun, 3);
  assert.equal(g.dosya, "/p/plan/omurga.sar");
  assert.ok(g.etiket.includes("hâlâ açık"), "etiket mesajı taşımıyor");
  assert.ok(g.aciklama.includes("omurga.sar:12"), "açıklama kaynak konumunu taşımıyor");
  assert.ok(g.ipucu.includes("açık-hatırlatıcı"), "ipucu tanı kimliğini taşımıyor");
  assert.ok(g.ipucu.includes("Karar verince"), "ipucu düzeltme önerisini taşımıyor");
});

// ── ④ Proje gruplaması: başka Projeyle birleşmez ─────────────────────────────

test("gruplama: kayıtlar doğru Proje koduyla gruplanır ve iki Proje birbirine karışmaz", () => {
  const kayitlar = [
    kayit("açık-hatırlatıcı", "bilgi", { proje: ANA, dosya: "/a/plan/bir.sar" }),
    kayit("açık-adım", "bilgi", { proje: OS, dosya: "/b/plan/iki.sar" }),
    kayit("bloklu-çapa", "bilgi", { proje: ANA, dosya: "/a/plan/uc.sar" }),
  ];
  const kumeler = projeyeGrupla(kayitlar);
  assert.equal(kumeler.length, 2, "iki Proje bekleniyordu");
  const srm = kumeler.find((k) => k.proje.kod === "SRM")!;
  const nos = kumeler.find((k) => k.proje.kod === "NOS")!;
  assert.equal(srm.kayitlar.length, 2);
  assert.equal(nos.kayitlar.length, 1);
  assert.ok(srm.kayitlar.every((k) => k.dosya.startsWith("/a/")), "başka Projenin kaydı sızmış");
});

// ── ⑤ Aynı-kök özeti: sayı ve anlam korunur ──────────────────────────────────

test("özetleme: aynı kökten gelen bilgi kayıtları tek başlık altında toplanır, hiçbiri elenmez", () => {
  const kayitlar = [
    kayit("kullanımsız-tip", "bilgi", { dosya: "/a/bir.sar" }),
    kayit("kullanımsız-tip", "bilgi", { dosya: "/a/iki.sar" }),
    kayit("kullanımsız-tip", "bilgi", { dosya: "/a/uc.sar" }),
    kayit("olgunluk-onayı", "bilgi", { dosya: "/a/dort.sar" }),
  ];
  const kumeler = kokeGoreOzetle(kayitlar);
  assert.equal(kumeler.length, 2, "iki kök bekleniyordu");
  const toplam = kumeler.reduce((s, k) => s + k.kayitlar.length, 0);
  assert.equal(toplam, kayitlar.length, "özetleme kayıt düşürdü — sayı korunmadı");
  const kullanimsiz = kumeler.find((k) => k.kod === "kullanımsız-tip")!;
  assert.equal(kullanimsiz.kayitlar.length, 3);
  assert.deepEqual(kullanimsiz.kayitlar.map((k) => k.dosya), ["/a/bir.sar", "/a/iki.sar", "/a/uc.sar"],
    "özet içindeki kaynak sırası bozuldu");
});

// ── ⑥ Paket bildirimi ile sağlayıcı kimliklerinin birebirliği ────────────────

test("görünüş kimlikleri: paket bildirimi ile sağlayıcı sabitleri birebir aynıdır", () => {
  const gorunusler = PAKET.contributes.views["sarmal-yol"];
  const kimlikler = gorunusler.map((g) => g.id);
  assert.ok(kimlikler.includes(GORUNUS_HATIRLATICILAR),
    `paket bildiriminde "${GORUNUS_HATIRLATICILAR}" görünüşü yok`);
  assert.ok(kimlikler.includes(GORUNUS_BILDIRIMLER),
    `paket bildiriminde "${GORUNUS_BILDIRIMLER}" görünüşü yok`);
  assert.ok(kimlikler.includes(GORUNUS_FIKIRLER),
    `paket bildiriminde "${GORUNUS_FIKIRLER}" görünüşü yok`);
  assert.equal(new Set(kimlikler).size, kimlikler.length,
    `yinelenen görünüş kimliği var: ${kimlikler.join(" · ")}`);
});

test("görünüş kimlikleri: mevcut Yol Haritası ve Mini Graf görünüşleri geriye açılmadı", () => {
  const kimlikler = PAKET.contributes.views["sarmal-yol"].map((g) => g.id);
  assert.ok(kimlikler.includes("sarmalYolHaritasi"), "Yol Haritası görünüşü kayboldu");
  assert.ok(kimlikler.includes("sarmalMiniGraf"), "Mini Graf görünüşü kayboldu");
});

test("başlıklar katalogdan gelir: paket bildirimi yerelleştirme anahtarlarına bağlıdır", () => {
  const gorunusler = PAKET.contributes.views["sarmal-yol"];
  const htr = gorunusler.find((g) => g.id === GORUNUS_HATIRLATICILAR)!;
  const bld = gorunusler.find((g) => g.id === GORUNUS_BILDIRIMLER)!;
  assert.equal(yerellestir(htr.name), "Hatırlatıcılar");
  assert.equal(yerellestir(htr.contextualTitle!), "Hatırlatıcılar");
  assert.equal(yerellestir(bld.name), "Gözlemler");
  assert.equal(yerellestir(bld.contextualTitle!), "Gözlemler");
});

// ── ⑦ Yönlendirme matrisi tam ve kayıtla aynı ────────────────────────────────

test("matris tamlığı: sicildeki her tanı kimliği tam olarak bir yüzeye düşer", () => {
  const sicil = [...taniSicili()];
  assert.ok(sicil.length > 100, `sicil beklenmedik biçimde küçük (${sicil.length}); nöbet ölçmüyor olabilir`);
  const matris = yuzeyMatrisi(sicil.map((kod) => ({ kod, duzey: "bilgi" as Duzey })));
  assert.equal(matris.size, sicil.length, "her kimlik matriste bulunmuyor");
  const gecerli = new Set<SunumYuzeyi>(["problems", "hatırlatıcılar", "bildirimler"]);
  for (const [kod, yuzey] of matris) {
    assert.ok(gecerli.has(yuzey), `"${kod}" tanınmayan bir yüzeye düştü: ${yuzey}`);
  }
});

test("A05 kademe hükmü: 47 hata + 16 uyarı Problems'a, on bir kimlik Bildirimler'e düşer", () => {
  // Yüzey yalnız tanının BUGÜN üretildiği kademeyi okur; hedef düzeyden ikinci
  // bir sunum düzeyi türetilmez.
  assert.ok(YENI_TANI_KANONU.length >= 70,
    `yeni kanon kayıt sayısı beklenenden az: ${YENI_TANI_KANONU.length}`);
  for (const k of YENI_TANI_KANONU) {
    const yuzey = beklenenSunumYuzeyi({ duzey: k.kademe, kod: k.kod, mesaj: "", satir: 1, sutun: 1 });
    const beklenen = TERFI_RET_KIMLIKLERI.has(k.kod) ? "bildirimler" : "problems";
    assert.equal(yuzey, beklenen,
      `"${k.kod}" bugünkü kademesiyle (${k.kademe}) ${yuzey} yüzeyine düşüyor; A05 kararı ${beklenen} bekliyor`);
  }
  // Kırk yedinci hata kimliği MIM-1.7 AltKatman tekilliğidir (Founder hükmü
  // 2026-08-28); terfi turundan gelmedi, doğrudan hata düzeyinde doğdu.
  assert.equal(YENI_TANI_KANONU.filter((k) => k.kademe === "hata").length, 47);
  assert.equal(YENI_TANI_KANONU.filter((k) => k.kademe === "uyarı").length, 16);
  assert.equal(YENI_TANI_KANONU.filter((k) => k.kademe === "bilgi").length, 11);
});

test("A06 yüzey eşitliği: sicil→üretici→Problems→hover aynı kimlik+düzeyi taşır", () => {
  const sicil = YENI_TANI_KANONU.find((k) => k.kod === "kanonik-kaynak-biçimi")!;
  const tani = yeniTani("kanonik-kaynak-biçimi", { dosya: "yasa-kopyasi.md" }, { satir: 7, sutun: 2 });
  const kayitYuzeyi: YuzeyKaydi = { proje: ANA, dosya: "/p/yasa-kopyasi.md", tani };
  const dagilim = yuzeyeAyir([kayitYuzeyi]);
  const problemsTanisi = dagilim.problems[0]?.tani;
  const hover = kayitGorunumu(kayitYuzeyi);

  assert.deepEqual({ kimlik: sicil.kod, duzey: sicil.kademe },
    { kimlik: "kanonik-kaynak-biçimi", duzey: "hata" });
  assert.deepEqual({ kimlik: tani.kod, duzey: tani.duzey }, { kimlik: sicil.kod, duzey: sicil.kademe });
  assert.strictEqual(problemsTanisi, tani, "Problems kanonik tanıyı kopyalayıp yeniden derecelendirdi");
  assert.deepEqual({ kimlik: hover.kod, duzey: hover.duzey }, { kimlik: sicil.kod, duzey: sicil.kademe });
  assert.match(hover.ipucu, /\*\*kanonik-kaynak-biçimi\*\* · hata düzeyi/);
  assert.ok(hover.ipucu.includes(tani.oneri!), "hover öğretim önerisini kanonik tanıdan taşımadı");
  assert.equal(dagilim.hatırlatıcılar.length + dagilim.bildirimler.length, 0,
    "hata tanısı Problems dışında ikinci bir yüzeye yayıldı");
});

test("A06 KIRMIZI FİKSTÜR: yüzey hata tanısını uyarıya yeniden derecelendiremez", () => {
  const bozuk = kayit("kanonik-kaynak-biçimi", "uyarı");
  const kusurlar = dagitimKusurlari([bozuk], yuzeyeAyir([bozuk]));
  assert.ok(kusurlar.some((k) => k.includes("sunum kanonik düzeyi yeniden derecelendirmiştir")),
    `yüzey yeniden derecelendirmesi kırmızı olmadı: ${JSON.stringify(kusurlar)}`);
});

test("kayıt tazeliği: yayımlanan yönlendirme matrisi kaydı türetilmiş gerçekle uyuşur", () => {
  const kayitMetni = oku("../../../is/nitelik/goc/tani_yuzeyi_yonlendirme_matrisi.sar");
  // Kayıt, ileri-bağlam kimliklerini tek tek yazar; motorun kümesiyle eşleşmeli.
  for (const kod of ["açık-hatırlatıcı", "açık-adım", "bloklu-çapa", "geliştirmede-çapa"]) {
    assert.ok(kayitMetni.includes(kod), `yönlendirme matrisi kaydında "${kod}" kimliği yok`);
    assert.equal(kaydinYuzeyi(kayit(kod, "bilgi")), "hatırlatıcılar",
      `"${kod}" motorda artık Hatırlatıcılar yüzeyine gitmiyor; kayıt bayatladı`);
  }
});

// ── ⑧ Boş-durum ve açıklama cümleleri okuyana ne yapacağını söyler ───────────

// Founder hükmü 2026-08-16: boş-durum cümlesi KISA ve NET yazılır, üslup "siz"
// biçimindedir ve cümleye ham sözdizimi örneği gömülmez (dar panelde kod
// çorbasına dönüyordu); Türkçe metinde İngilizce yüzey adı geçmez. Önceki
// "yapıştırılabilir örnek" hükmü bu tarihle emeklidir.
test("boş-durum cümleleri öğretir: panelin nasıl dolacağı ve yüzey ayrımı açıkça yazılıdır", () => {
  assert.ok(YUZEY_BOS_DURUM.hatırlatıcılar.includes("Hatırlatıcı"),
    "Hatırlatıcılar boş-durumu panelin hangi düğümle dolacağını söylemiyor");
  assert.ok(YUZEY_BOS_DURUM.bildirimler.includes("Sorunlar"),
    "Bildirimler boş-durumu düzeltilecek sapmanın gittiği yeri Türkçe sekme adıyla söylemiyor");
  for (const cumle of [YUZEY_BOS_DURUM.hatırlatıcılar, YUZEY_BOS_DURUM.bildirimler]) {
    assert.ok(cumle.trim().endsWith("."), "boş-durum metni tam cümleyle bitmiyor");
    assert.ok(cumle.length > 80, "boş-durum metni okuyana ne yapacağını anlatacak kadar uzun değil");
  }
  assert.ok(YUZEY_ACIKLAMALARI.hatırlatıcılar.length > 0 && YUZEY_ACIKLAMALARI.bildirimler.length > 0);
});

// ── ⑨ Yinelenen yenileme: toplu tarama panele TEK KEZ çizdirir ──────────────
//   Denetçi ölçtü: yüz yetmiş iki canlı dosyalık tam taramada yetmiş bir dosya
//   Problems dışı kayıt üretiyordu ve dağıtım işlevi koşulsuz yayımladığı için
//   Bildirimler paneli tur başına yaklaşık yetmiş bir kez yeniden çiziliyordu.
//   Sağlayıcıdaki parmak izi güvencesi bunu ENGELLEYEMEZ: defter her belgede
//   büyüdüğü için parmak izi her seferinde gerçekten değişir.

test("toplu tarama: yüz yetmiş iki dosyalık tur panele TAM BİR KEZ çizdirir", () => {
  let cizim = 0;
  const defter = new YuzeyDefteri(() => { cizim += 1; });
  const dosyalar = Array.from({ length: 172 }, (_, i) => `/p/plan/dosya-${i}.sar`);
  for (const dosya of dosyalar) {
    defter.yaz(dosya, [kayit("olgunluk-onayı", "bilgi", { dosya })], false);
  }
  // Fikstür gerçekten dolu — boş defter üstünde koşan nöbet hiçbir şey ölçmez.
  assert.equal(defter.dosyaSayisi, 172, "defter fikstürde boş kaldı; nöbet ölçmüyor demektir");
  assert.equal(cizim, 0, `toplu tarama sırasında ${cizim} erken çizim yapıldı; yayın ertelenmiyor`);
  defter.yayımla();
  assert.equal(cizim, 1, `tur sonunda tek çizim bekleniyordu, gerçekte ${cizim} çizim yapıldı`);
  assert.equal(defter.yayinSayisi, 1, "yayın sayacı turun tek yayınını saymadı");
});

test("toplu tarama: kayıt silme de erteleniyor — tur içinde tek bir ara çizim bile olmaz", () => {
  let cizim = 0;
  const defter = new YuzeyDefteri(() => { cizim += 1; });
  defter.yaz("/p/bir.sar", [kayit("açık-adım", "bilgi", { dosya: "/p/bir.sar" })], false);
  defter.yaz("/p/iki.sar", [kayit("açık-adım", "bilgi", { dosya: "/p/iki.sar" })], false);
  assert.ok(defter.sil("/p/bir.sar", false), "silinen dosya defterde bulunamadı");
  defter.buda(new Set(["/p/iki.sar"]));
  assert.equal(cizim, 0, `silme ve budama sırasında ${cizim} erken çizim yapıldı`);
  defter.yayımla();
  assert.equal(cizim, 1);
});

test("toplu tarama yayını canlı yolda gerçekten kapatılır: eklenti döngüsü ertelenmiş dağıtımı çağırır", () => {
  const kaynak = oku("../src/eklenti.ts");
  const basi = kaynak.indexOf("const denetleHepsi");
  const sonu = kaynak.indexOf("const denetimKilidi");
  assert.ok(basi > 0 && sonu > basi, "denetleHepsi gövdesi eklenti kaynağında bulunamadı");
  const govde = kaynak.slice(basi, sonu);
  // Yayın bayrağı ÜÇÜNCÜ argümandır ve `false` olmalıdır; desen dördüncü argümanı
  // (turun kendi ağacından gelen program) kabul eder, çünkü nöbetin ölçtüğü şey
  // çağrının şekli değil YAYININ KAPALI olmasıdır.
  assert.ok(/\.\.\.capraz\], false[,)]/.test(govde),
    "toplu tarama döngüsü dağıtımı yayın AÇIKKEN çağırıyor; panel her belgede yeniden çizilir");
  assert.ok(govde.includes("taniSil(doc.uri, false)"),
    "toplu tarama döngüsündeki tanı silme yayını kapatmıyor; tur içinde ara çizim doğar");
  assert.ok(govde.includes("yuzeyDefteri.yayımla()"),
    "tur sonunda tek yayın çağrısı yok; iki yeni yüzey bayat kalır");

  // Tek-dosya yolu yayını KAPATMAZ: bir tuş vuruşunda panel tazelenmelidir.
  const tekDosyaBasi = kaynak.indexOf("const denetle = (");
  assert.ok(tekDosyaBasi > 0 && tekDosyaBasi < basi, "tek-dosya denetleme yolu bulunamadı");
  // Yayın bayrağı eskiden atlanıp varsayılana bırakılıyordu; 2026-08-29'dan beri
  // AÇIKÇA `true` yazılır, çünkü aynı çağrı artık dördüncü argümanı da taşır ve
  // atlanan bir bayrak okuyanı yanıltırdı. Ölçülen şey yine aynıdır: tek-dosya
  // yolu yayını KAPATAMAZ, yoksa yazarken hatırlatıcılar tazelenmez.
  assert.ok(/\.\.\.cross\], true[,)]/.test(kaynak.slice(tekDosyaBasi, basi)),
    "tek-dosya yolu da yayını kapatmış; hatırlatıcılar yazarken tazelenmez");
});

// ── ⑩ Aktif-varlık süzgeci: üç yüzey kapsam konusunda anlaşır ───────────────
//   Karar verici hükmü (GOC-YUZEY düzeltme halkası): iki yeni yüzey Problems'in
//   süzgecine UYAR. Gerekçe ölçülebilir bir kullanıcı zararıdır: biri bir
//   varlığı gizlerken öteki ikisi göstermeye devam ederse kullanıcı çelişkili
//   iki tablo görür ve yeni başlayan biri bunu kendi hatası sanar.

test("aktif-varlık süzgeci: süzülen varlığın kayıtları iki yeni yüzeyde de durmaz", () => {
  let son: YuzeyDagilimi | undefined;
  const defter = new YuzeyDefteri((d) => { son = d; }, (dosya) => dosya.startsWith("/sarmal/"));
  defter.yaz("/sarmal/bir.sar", [
    kayit("açık-hatırlatıcı", "bilgi", { dosya: "/sarmal/bir.sar" }),
    kayit("olgunluk-onayı", "bilgi", { dosya: "/sarmal/bir.sar" }),
  ], false);
  defter.yaz("/kapaliurun/iki.sar", [
    kayit("açık-adım", "bilgi", { dosya: "/kapaliurun/iki.sar" }),
    kayit("kullanımsız-tip", "bilgi", { dosya: "/kapaliurun/iki.sar" }),
  ], false);
  defter.yayımla();

  assert.ok(son, "yayın hiç yapılmadı; nöbet ölçmüyor demektir");
  assert.deepEqual(son!.hatırlatıcılar.map((k) => k.dosya), ["/sarmal/bir.sar"],
    "süzülen varlığın hatırlatıcısı panelde kaldı; Problems onu gizlerken bu yüzey gösteriyor");
  assert.deepEqual(son!.bildirimler.map((k) => k.dosya), ["/sarmal/bir.sar"],
    "süzülen varlığın bildirimi panelde kaldı; Problems onu gizlerken bu yüzey gösteriyor");
  // Süzgeç kaydı SİLMEZ, yalnız gizler — odak geri dönünce kayıt geri gelmelidir.
  assert.equal(defter.dosyaSayisi, 2,
    "süzgeç defterden kayıt düşürdü; odak geri döndüğünde kayıtlar geri gelemez");
});

test("aktif-varlık süzgeci canlı yola bağlıdır: defter süzgeci alır, odak değişince üç yüzey birlikte yenilenir", () => {
  const kaynak = oku("../src/eklenti.ts");
  assert.ok(/new YuzeyDefteri\([\s\S]{0,800}?panelDeGorunur/.test(kaynak),
    "yüzey defteri aktif-varlık süzgecini almıyor; iki yeni yüzey Problems'ten farklı kapsam gösterir");
  const basi = kaynak.indexOf("function hepsiniYenidenYayinla");
  assert.ok(basi > 0, "hepsiniYenidenYayinla işlevi bulunamadı");
  const govde = kaynak.slice(basi, kaynak.indexOf("\n}", basi));
  assert.ok(govde.includes("yuzeyDefteri.yayımla()"),
    "odak ya da ayar değişince iki yeni yüzey yeniden basılmıyor; öteki varlığın kayıtları panelde kalır");
});

// ── ⑪ Yayımlanan kaydın sayıları bayatlamaz ─────────────────────────────────
//   Yönlendirme matrisi kaydı dört sayı taşır ve bu sayılar sicil büyüdüğünde
//   sessizce yanlışa döner. Nöbet sayıları kaydın METNİNDEN okur ve motorun
//   bugünkü gerçeğiyle karşılaştırır.
//
//   NEYİN ÖLÇÜLDÜĞÜ, NEYİN ÖLÇÜLEMEDİĞİ AÇIKÇA YAZILIDIR. Sicil boyutu, yeni
//   kanon ile önceki gövdenin sayıları ve ileri-bağlam kümesinin genişliği
//   motordan DOĞRUDAN ölçülür; bunlar bayatlığın asıl kaynağıdır. Problems
//   satırındaki seksen bir ile Bildirimler satırındaki seksen altının içindeki
//   on altılık önceki-bilgi payı statik olarak türetilemez, çünkü önceki yüz bir
//   kimliğin düzeyi sicilde tutulmaz; üçü bağlama göre değişir ve altısı üretici
//   işlevlerinde ayrı satırda kurulur. Bu iki sayı için nöbet toplamın
//   tutarlılığını zorlar: üç satırın toplamı Toplam satırına ve Toplam satırı da
//   sicilin gerçek boyutuna eşit olmak zorundadır.

test("kayıt bayatlamaz: yönlendirme matrisinin sayıları sicilin bugünkü gerçeğiyle ölçülür", () => {
  const metin = oku("../../../is/nitelik/goc/tani_yuzeyi_yonlendirme_matrisi.sar");

  const satirSayisi = (etiket: string): number => {
    const es = new RegExp(`\\|\\s*\\*{0,2}${etiket}\\*{0,2}\\s*\\|\\s*\\*{0,2}(\\d+)\\*{0,2}\\s*\\|`).exec(metin);
    assert.ok(es, `yönlendirme matrisi kaydında "${etiket}" satırı okunamadı`);
    return Number(es![1]);
  };
  const metindenSayi = (desen: RegExp, ne: string): number => {
    const es = desen.exec(metin);
    assert.ok(es, `yönlendirme matrisi kaydında ${ne} sayısı okunamadı`);
    return Number(es![1]);
  };

  const sicil = [...taniSicili()];
  // Kayıt metni sarmalanmış cümlelerden oluşur; sözcük araları satır sonu da
  // olabileceği için desenler tek boşluk değil boşluk kümesi arar.
  const kayitToplam = metindenSayi(/bugün\s+\*\*(\d+)\*\*\s+kimlik\s+vardır/, "sicil boyutu");
  const kayitYeni = metindenSayi(/ilan\s+ettiği\s+\*\*(\d+)\*\*\s+kimlik/, "yeni kanon");
  const kayitOnceki = metindenSayi(/ondan\s+önce\s+yazılmış\s+\*\*(\d+)\*\*\s+kimlik/, "önceki gövde");

  assert.equal(kayitToplam, sicil.length,
    `kayıt sicili ${kayitToplam} kimlikli sanıyor, sicilde bugün ${sicil.length} kimlik var`);
  assert.equal(kayitYeni, YENI_TANI_KANONU.length,
    `kayıt yeni kanonu ${kayitYeni} kimlikli sanıyor, gerçekte ${YENI_TANI_KANONU.length}`);
  assert.equal(kayitOnceki, ONCEKI_TANI_KODLARI.length,
    `kayıt önceki gövdeyi ${kayitOnceki} kimlikli sanıyor, gerçekte ${ONCEKI_TANI_KODLARI.length}`);
  assert.equal(kayitYeni + kayitOnceki, kayitToplam, "kaydın kendi iki parçası toplamını tutmuyor");

  // İleri-bağlam kümesi düzeyden ÖNCE gelir; hata düzeyi verilmesine rağmen
  // Hatırlatıcılar'a düşen kimlik sayısı kümenin genişliğini doğrudan ölçer.
  const ileriBaglam = sicil.filter(
    (kod) => beklenenSunumYuzeyi({ duzey: "hata", kod, mesaj: "", satir: 1, sutun: 1 }) === "hatırlatıcılar",
  ).length;
  assert.equal(satirSayisi("Hatırlatıcılar"), ileriBaglam,
    `kayıt Hatırlatıcılar yüzeyine ${satirSayisi("Hatırlatıcılar")} kimlik yazıyor, motor bugün ${ileriBaglam} kimlik gönderiyor`);

  const problems = satirSayisi("Problems");
  const bildirimler = satirSayisi("Bildirimler");
  const toplamSatiri = satirSayisi("Toplam");
  assert.equal(toplamSatiri, sicil.length,
    `kaydın Toplam satırı ${toplamSatiri}, sicilin gerçek boyutu ${sicil.length}`);
  assert.equal(problems + ileriBaglam + bildirimler, toplamSatiri,
    `üç yüzey satırının toplamı ${problems + ileriBaglam + bildirimler}, Toplam satırı ${toplamSatiri}`);

  // A05'te 46 hata ve 16 uyarı Problems'ta; sekiz ret bilgi kademesinde
  // Bildirimler'de kalır. 2026-08-22 tarihinde Founder onayıyla doğan iki
  // gözlem ile 2026-08-27 tarihinde doğan mevsim vadesi gözlemi de bilgi
  // kademesindedir ve aynı yüzeye düşer, dolayısıyla bugünkü bildirim kümesi
  // on birdir. Kayıt iki tabanı da taşımalıdır.
  const yeniBildirim = YENI_TANI_KANONU.filter(
    (k) => beklenenSunumYuzeyi({ duzey: k.kademe, kod: k.kod, mesaj: "", satir: 1, sutun: 1 }) === "bildirimler",
  ).length;
  const yeniProblems = YENI_TANI_KANONU.filter(
    (k) => beklenenSunumYuzeyi({ duzey: k.kademe, kod: k.kod, mesaj: "", satir: 1, sutun: 1 }) === "problems",
  ).length;
  assert.equal(yeniBildirim, 11, "A05'in sekiz RET-ADAYI ile üç yeni gözlem bilgi kademesinde kalmalıdır");
  // 2026-08-28: MIM-1.7 AltKatman tekilliği hata düzeyinde doğdu ve Problems'a
  // gider; A05'in altmış ikilik kümesi altmış üçe çıktı.
  assert.equal(yeniProblems, 63, "A05'in 47 hata ve 16 uyarı kimliği Problems'a gitmelidir");
  assert.ok(bildirimler >= yeniBildirim,
    `kayıt Bildirimler yüzeyine ${bildirimler} kimlik yazıyor, oysa yalnız yeni kanon ${yeniBildirim} kimlik gönderiyor`);
  assert.ok(problems >= yeniProblems,
    `kayıt Problems yüzeyine ${problems} kimlik yazıyor, oysa terfi eden yeni kanon ${yeniProblems} kimlik gönderiyor`);
});

test("arayüz metinleri iç kod taşımaz: kullanıcı jargonsuz cümle görür", () => {
  const kaynak = oku("../src/yuzey-metinleri.ts");
  const YASAK: Array<{ ad: string; re: RegExp }> = [
    { ad: "karar numarası", re: /\b(K|GK|SD|DR|IA|EMJ)-\d/ },
    { ad: "oturum/plan kodu", re: /\b(RAY-\d|RF-T\d|BKM-[A-Z]|NTK-A\d|ZMN-A\d|VIT-[A-Z]|HTR-[A-Z]|AOK-[A-Z0-9]|KRR-MUT|EKL-F\d)/ },
    { ad: "İngilizce terim", re: /\b(runtime|governance)\b/i },
  ];
  const metinler = [
    YUZEY_BOS_DURUM.hatırlatıcılar, YUZEY_BOS_DURUM.bildirimler,
    YUZEY_ACIKLAMALARI.hatırlatıcılar, YUZEY_ACIKLAMALARI.bildirimler,
    PAKET_NLS_TR["view.reminders"], PAKET_NLS_TR["view.observations"],
  ];
  for (const m of metinler) {
    for (const y of YASAK) {
      assert.ok(!y.re.test(m), `arayüz metnine ${y.ad} sızmış: ${m.slice(0, 90)}`);
    }
  }
  assert.ok(kaynak.includes("YAZIM ÖLÇÜTÜ"), "katalog yazım ölçütünü kendi başlığında taşımıyor");
});

// ═══════════════════════════════════════════════════════════════════════════
// ⑨ BİLDİRİMLER PANELİ OKUNUR — Founder canlı gözden geçirmesi 2026-07-28
//
//   Bulguların hepsi kullanıcının GÖRDÜĞÜ şeyle ilgilidir ve hiçbirini önceki
//   nöbetler yakalayamazdı: bir kaydın etiketi ham dosya yolu olarak basılıyor,
//   grup başlıkları çıplak tanı kimliği taşıyor, görünüş başlığı kapsayıcının
//   adını tekrar ediyor ve kayıtlar türlerine göre hiçbir görsel ayrım
//   taşımıyordu.
// ═══════════════════════════════════════════════════════════════════════════

test("etiket ham dosya yolu basmaz: kullanıcı dosya adını görür, tam yol ipucunda kalır", () => {
  const tamYol = "/Users/biri/Belgeler/proje/_Sarmal/yasa/kararlar/dil_format.sar";
  const k = kayit("kanonik-kaynak-biçimi", "bilgi", {
    dosya: tamYol,
    mesaj: `"${tamYol}" dosyası kanonik hüküm metnini kaynak-gerçek gibi taşıyor.`,
  });
  const g = kayitGorunumu(k);
  assert.ok(!g.etiket.includes("/Users/"),
    `etikete mutlak dosya yolu sızmış: ${g.etiket}`);
  assert.ok(g.etiket.includes("dil_format.sar"), "etiket dosya adını taşımalı");
  assert.ok(g.ipucu.includes(tamYol), "tam yol ipucunda kaybolmamalı");
});

test("etiket kimlikle değil ASIL CÜMLEYLE başlar: baş segmentler geriye çekilir", () => {
  const k = kayit("kararlaşmış-hatırlatıcı", "bilgi", {
    mesaj: "❗➡️ Kararlaşmış hatırlatıcı (HTR-TANIMSIZ-SEMBOL) — zincirdeki Adım: " +
      "GOC-TERFI-A99: İfade dilinde tanımsız sembol kalmasın.",
  });
  const g = kayitGorunumu(k);
  assert.equal(g.etiket, "İfade dilinde tanımsız sembol kalmasın.");
  assert.ok(g.ipucu.includes("HTR-TANIMSIZ-SEMBOL"), "kimlik ipucunda kaybolmamalı");
});

test("etiket cümlenin dil bilgisini bozmaz: olguyla başlayan mesaj kırpılmaz", () => {
  const k = kayit("yürütücü-bağımlılığı", "bilgi", {
    mesaj: '"KRR-101" hükmü belirli bir dış yürütücüye bağlanıyor: "GPT-5".',
  });
  assert.equal(kayitGorunumu(k).etiket,
    '"KRR-101" hükmü belirli bir dış yürütücüye bağlanıyor: "GPT-5".');
});

test("etiket cümle ortasındaki kimliği sökmez: dil bilgisi korunur", () => {
  const k = kayit("şema-dışı-alan", "bilgi", {
    mesaj: '"Adım" (KPN-A04) düğümünde "onay" alanı kullanılıyor, oysa bu alan şemada yok.',
  });
  assert.equal(kayitGorunumu(k).etiket,
    '"Adım" (KPN-A04) düğümünde "onay" alanı kullanılıyor, oysa bu alan şemada yok.');
});

test("grup başlığı çıplak tanı kimliği DEĞİLDİR: sicildeki her kimlik cümleye çevrilir", () => {
  const kimlikler = [...taniSicili()];
  assert.ok(kimlikler.length > 100, `sicil beklenmedik biçimde küçük (${kimlikler.length})`);
  const ciplak = kimlikler.filter((kod) => ozetSatiriEtiketi(kod, 3) === kod);
  assert.deepEqual(ciplak, [],
    `grup başlığı çıplak kimlik olarak basılıyor: ${ciplak.slice(0, 5).join(" · ")}`);
  const tireli = kimlikler.filter((kod) => /\S-\S/.test(ozetSatiriEtiketi(kod, 3)) && kod.includes("-"));
  assert.ok(tireli.length < kimlikler.length,
    "hiçbir kimlik okunur başlığa çevrilmemiş; çizelge de yedek de çalışmıyor");
});

test("grup başlığı yazılı olanlar için gerçek bir cümledir; kimlik açıklamada durur", () => {
  assert.equal(ozetSatiriEtiketi("şema-dışı-alan", 122),
    "Bir alan kullanılmış ama tipin şemasında ilan edilmemiş");
  assert.equal(ozetSatiriAciklamasi("şema-dışı-alan", 122), "122 kayıt · şema-dışı-alan");
  assert.ok(ozetSatiriIpucu("şema-dışı-alan", 122).includes("şema-dışı-alan"),
    "kimlik ipucunda kaybolmamalı");
});

test("hiçbir görünüş başlığı kapsayıcının adını tekrar etmez", () => {
  const kapsayici = (JSON.parse(oku("../package.json")) as {
    contributes: { viewsContainers: { activitybar: Array<{ id: string; title: string }> } };
  }).contributes.viewsContainers.activitybar.find((k) => k.id === "sarmal-yol")!;
  const kapsayiciAdi = PAKET_NLS_TR["view.container"];
  assert.equal(yerellestir(kapsayici.title), kapsayiciAdi);
  for (const gorunus of PAKET.contributes.views["sarmal-yol"]) {
    assert.ok(!yerellestir(gorunus.name).includes(kapsayiciAdi),
      `görünüş adı kapsayıcının adını tekrar ediyor: ${gorunus.name}`);
    assert.ok(!yerellestir(gorunus.contextualTitle ?? "").includes(kapsayiciAdi),
      `bağlam başlığı kapsayıcının adını tekrar ediyor: ${gorunus.contextualTitle}`);
  }
});

test("üç panel bakışta ayrılır: hiçbiri diğerinin görünüş simgesini kullanmaz", () => {
  const gorunusler = (JSON.parse(oku("../package.json")) as {
    contributes: { views: Record<string, Array<{ id: string; icon?: string }>> };
  }).contributes.views["sarmal-yol"];
  const simgeler = gorunusler.map((g) => g.icon);
  assert.equal(new Set(simgeler).size, simgeler.length,
    `görünüşler aynı simgeyi paylaşıyor: ${simgeler.join(" · ")}`);
});

test("üç panel bakışta ayrılır: proje satırı simgeleri birbirinden farklıdır", () => {
  // VIT-KIMLIK-A05: üç panelin proje/varlık satırı da geometrik ailenin satır
  // çizelgesinden okunur; ayrım artık codicon adlarında değil çizelge adlarındadır.
  const simge = (dosya: string, desen: RegExp): string => (desen.exec(oku(dosya))?.[1] ?? "").trim();
  const hatirlatici = simge("../src/hatirlaticilar.ts", /const PROJE_SIMGESI: SatirSimgesi = "([a-z-]+)"/);
  const bildirim = simge("../src/bildirimler.ts", /const PROJE_SIMGESI: SatirSimgesi = "([a-z-]+)"/);
  // 🪆 EKL-F7-A09: yol haritasının varlık simgesi sabit değil tipe bağlıdır —
  // çalışma alanı istasyon, proje sefer; İKİSİ de öteki panellerle çakışamaz.
  const yolKume = /return tip === "ÇalışmaAlanı" \? "([a-z-]+)" : "([a-z-]+)";/.exec(oku("../src/yolharitasi-cekirdek.ts"));
  assert.ok(hatirlatici && bildirim && yolKume, "panel proje satırı simgesi bulunamadı");
  const hepsi = [hatirlatici, bildirim, yolKume![1], yolKume![2]];
  assert.equal(new Set(hepsi).size, hepsi.length,
    "iki panel aynı proje satırı simgesini kullanıyor; kenar çubuğunda bakışta ayrılmazlar");
});

test("bildirim rozet türü tanı nesnesinin GERÇEK düzeyini yeniden yorumlamadan okur", () => {
  assert.equal(bildirimTuru({ duzey: "hata" }), "hata");
  assert.equal(bildirimTuru({ duzey: "uyarı" }), "uyarı");
  assert.equal(bildirimTuru({ duzey: "bilgi" }), "bilgi");

  const turler = new Set([
    kayitGorunumu(kayit("kanonik-kaynak-biçimi", "hata")).tur,
    kayitGorunumu(kayit("orthografi-kaybı", "uyarı")).tur,
    kayitGorunumu(kayit("adım-atomikliği", "bilgi")).tur,
  ]);
  assert.deepEqual([...turler], ["hata", "uyarı", "bilgi"]);
});

test("rozet rengi KANONİK ANLAM EKSENİNDEN okunur: ham renk değeri gömülmez", () => {
  // VIT-KIMLIK-A05: rozet artık codicon + tema rolü değil, satır çizelgesinin
  // simgesi + üreticinin anlam rengidir; ham değer yine hiçbir yerde yoktur.
  const kullanilan = new Set<string>();
  for (const rozet of Object.values(BILDIRIM_ROZET)) {
    assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(rozet.anlam) && !/\brgb\(/.test(rozet.anlam),
      `rozete ham renk değeri gömülmüş: ${rozet.anlam}`);
    assert.ok((ANLAM_RENKLERI as readonly string[]).includes(rozet.anlam),
      `rozet anlamı üretici ekseninde değil: ${rozet.anlam}`);
    assert.ok((SATIR_SIMGELERI as readonly string[]).includes(rozet.simge), "rozet simgesi çizelgede değil");
    assert.ok(rozet.ne.length > 20, "rozet ne olduğunu anlatmıyor");
    kullanilan.add(`${rozet.simge}|${rozet.anlam}`);
  }
  assert.equal(kullanilan.size, Object.keys(BILDIRIM_ROZET).length,
    "iki tür aynı rozeti taşıyor; görsel ayrım yok");
});

test("Bildirimler ağacının kademeleri tutarlı: her kayıt bir grubun altında yaşar", () => {
  // Bir kökten üç kayıt, başka bir kökten TEK kayıt: ikisi de grup satırı almalı.
  const kayitlar = [
    kayit("şema-dışı-alan", "bilgi"), kayit("şema-dışı-alan", "bilgi"),
    kayit("şema-dışı-alan", "bilgi"), kayit("düzyazı-koşul", "bilgi"),
  ];
  const kumeler = kokeGoreOzetle(kayitlar);
  assert.equal(kumeler.length, 2, "iki kök iki grup satırı vermeli");
  assert.deepEqual(kumeler.map((k) => k.kayitlar.length).sort(), [1, 3]);
  // Panelin çocuk üretimi artık tek kayıtlık kümeyi de grup olarak basar; sağlayıcı
  // kaynağı bunu doğrudan söyler (vscode kabuğu birim süitinde yüklenemez).
  const kaynak = oku("../src/bildirimler.ts");
  assert.ok(!/kume\.kayitlar\.length === 1/.test(kaynak),
    "tek kayıtlık kök hâlâ grup açılmadan basılıyor; ağacın kademeleri karışır");
});

// ═══════════════════════════════════════════════════════════════════════════
// ⑩ KİMLİK TEKİLLİĞİ VARLIK SINIRINDA ÖLÇÜLÜR
//
//   Founder canlı bulgusu 2026-07-28: motor iki bağımsız varlığı tek isim
//   uzayı sayıyor ve tamamen meşru bir yapıyı çakışma diye bildiriyordu.
//   Ölçülmüş kanıt şuydu — `RAF-PLAN` kodu hem Sarmal hem kapalı ürün giriş
//   dosyasında tanımlıdır, ikisi de kendi `plan/` rafını ilan eder ve bu
//   doğrudur; buna karşılık panel yinelenen kod uyarısı basıyordu.
//
//   NÖBET GERÇEK FİKSTÜRLE KOŞAR: aşağıdaki dosyalar gerçek Sarmal kaynağıdır,
//   gerçek belirteçleyici ve ayrıştırıcıdan geçer ve iki ayrı varlık kökü ilan
//   eder; motorun kendi işlevi bu harita üstünde koşturulur.
//
//   NEDEN BU DOSYADA: bulgu kullanıcıya panelde göründüğü için yüzey nöbetinin
//   yanında yaşar. Ayrı bir sınama dosyası açmak plan tarafında bir meyve ilanı
//   ister ve o ilan karar vericinin işidir; nöbetsiz kalmaktansa yüzey
//   nöbetinin altında yaşamak dürüst olanıdır.
// ═══════════════════════════════════════════════════════════════════════════

/** Gerçek kaynak metnini gerçek ayrıştırıcıdan geçirir. */
function prog(kaynak: string): Program {
  return ayristir(belirtecle(kaynak));
}

/** Kendi `plan/` rafını ilan eden bir varlık giriş dosyası. */
const anadizin = (kod: string, ad: string): string =>
  `ÇalışmaAlanı( kod: ${kod}, ad: "${ad}" ) {\n` +
  `  Raf( kod: RAF-PLAN, ad: "plan", yol: "plan/" )\n` +
  "}\n";

/** İki bağımsız varlık: her biri kendi giriş dosyasıyla kendi sınırını çizer. */
function ikiVarlik(): Map<string, Program> {
  return new Map<string, Program>([
    ["_Sarmal/sarmal_anadizin.sar", prog(anadizin("SARMAL", "Sarmal"))],
    ["_Sarmal/plan/omurga.sar", prog('Blok( kod: BLK-OMURGA, ne: "omurga" )\n')],
    ["_KapaliUrun/kapaliurun_anadizin.sar", prog(anadizin("KAPALIURUN", "kapalı ürün"))],
    ["_KapaliUrun/plan/kadro.sar", prog('Blok( kod: BLK-KADRO, ne: "kadro" )\n')],
  ]);
}

test("varlık sınırı: her dosya kendisini kapsayan EN YAKIN giriş dosyasının köküne düşer", () => {
  const sinir = varlikSinirlari(ikiVarlik().keys());
  assert.equal(sinir.get("_Sarmal/sarmal_anadizin.sar"), "_Sarmal");
  assert.equal(sinir.get("_Sarmal/plan/omurga.sar"), "_Sarmal");
  assert.equal(sinir.get("_KapaliUrun/kapaliurun_anadizin.sar"), "_KapaliUrun");
  assert.equal(sinir.get("_KapaliUrun/plan/kadro.sar"), "_KapaliUrun");
});

test("varlık sınırı: mutlak yol da göreli etiket de aynı sınırı verir", () => {
  const sinir = varlikSinirlari([
    "/depo/_Sarmal/sarmal_anadizin.sar",
    "/depo/_Sarmal/plan/omurga.sar",
    "/depo/_KapaliUrun/kapaliurun_anadizin.sar",
    "/depo/_KapaliUrun/plan/kadro.sar",
  ]);
  assert.equal(sinir.get("/depo/_Sarmal/plan/omurga.sar"), "/depo/_Sarmal");
  assert.equal(sinir.get("/depo/_KapaliUrun/plan/kadro.sar"), "/depo/_KapaliUrun");
});

test("varlık sınırı: giriş dosyası bulunmayan tarama tek ortak sınırda toplanır", () => {
  const sinir = varlikSinirlari(["a.sar", "alt/b.sar"]);
  assert.equal(sinir.get("a.sar"), "");
  assert.equal(sinir.get("alt/b.sar"), "");
});

test("İKİ VARLIK aynı kodu taşıyabilir: meşru yapı yinelenen kod uyarısı ÜRETMEZ", () => {
  const bulgular = yinelenenKodTanilari(ikiVarlik());
  const yinelenen = bulgular.filter((b) => b.tani.kod === "yinelenen-kod");
  assert.deepEqual(yinelenen.map((b) => b.tani.mesaj), [],
    "iki bağımsız varlığın aynı rafı ilan etmesi çakışma değildir; " +
    "kimlik tekilliği tarama kapsamına göre değil varlık sınırına göre ölçülür");
});

test("AYNI VARLIK içindeki çakışma yine bildirilir: sınır ölçümü sessizlik üretmez", () => {
  const programlar = ikiVarlik();
  // Aynı varlığın ikinci bir dosyası aynı rafı yeniden ilan ediyor: bu gerçek çakışmadır.
  programlar.set("_Sarmal/plan/ikinci_raf.sar",
    prog('Raf( kod: RAF-PLAN, ad: "plan", yol: "plan/" )\n'));
  const yinelenen = yinelenenKodTanilari(programlar).filter((b) => b.tani.kod === "yinelenen-kod");
  assert.equal(yinelenen.length, 1,
    "aynı varlığın içindeki gerçek çakışma bildirilmeliydi");
  assert.match(yinelenen[0].tani.mesaj, /RAF-PLAN/);
  assert.match(yinelenen[0].tani.mesaj, /aynı varlığın içinde/);
  assert.ok(yinelenen[0].tani.mesaj.includes("_Sarmal/sarmal_anadizin.sar")
    && yinelenen[0].tani.mesaj.includes("_Sarmal/plan/ikinci_raf.sar"),
    "çakışmanın iki sahibi de mesajda görünmeli");
  assert.ok(!yinelenen[0].tani.mesaj.includes("_KapaliUrun"),
    "öteki varlığın dosyası çakışma listesine karışmamalı");
});

test("ders dünyası muafiyeti mutlak yolda da çalışır: ornek/ vitrini uyarı üretmez", () => {
  const programlar = new Map<string, Program>([
    ["/depo/_Sarmal/sarmal_anadizin.sar", prog(anadizin("SARMAL", "Sarmal"))],
    ["/depo/_Sarmal/ornek/a.sar", prog('Blok( kod: BLK-DERS, ne: "ders" )\n')],
    ["/depo/_Sarmal/ornek/b.sar", prog('Blok( kod: BLK-DERS, ne: "ders ikizi" )\n')],
  ]);
  const yinelenen = yinelenenKodTanilari(programlar).filter((b) => b.tani.kod === "yinelenen-kod");
  assert.deepEqual(yinelenen, [],
    "ders malzemesi kendi kopyasını taşıyabilir; muafiyet mutlak yolda da tanınmalı");
});

// ── 🍎 MEYVE KAPISININ KÖK SEÇİMİ (VIT-GRAF-A12 · bağımsız denetim bulgusu) ───
//   Bu nöbet KAPIYI TAKLİT ETMEZ, kapının kendi kök seçimini ölçer. Kusur tam
//   olarak kapının hiç sınanmamış olmasından doğmuştu: bütün mini graf nöbetleri
//   meyve kapısını sahte bir fonksiyonla yerine koyuyordu, dolayısıyla gerçek
//   uygulamanın hangi kökleri denediğine hiçbir sınama bakmıyordu.

test("meyve kapısı kökünü YAPIŞKAN ODAKTAN alır — canlı editör köksüzken bile", () => {
  // ÖLÇÜLMÜŞ SENARYO (2026-07-29): depo kökünde `*_anadizin.sar` yoktur, dolayısıyla
  // `arsiv/` altı gibi köksüz bir dosya açıkken `varlikKoku` boş döner.
  // Graf yapışkanlıkla varlığı göstermeye DEVAM eder; kapı da o kökü denemelidir,
  // yoksa dört yüz elli dört beyanın tamamı "diskte yok" ilan edilir.
  const kokler = meyveKokleri("/depo/_Sarmal", undefined, ["/depo"]);
  assert.equal(kokler[0], "/depo/_Sarmal",
    "yapışkan odak kökü listede İLK sırada olmalı — grafın çizdiği varlık odur");
  assert.ok(kokler.includes("/depo"), "çalışma alanı klasörü son çare olarak kalmalı");
});

test("meyve kapısı sırası anlam taşır: yapışkan odak, canlı editör, sonra çalışma alanı", () => {
  const kokler = meyveKokleri("/depo/_Sarmal", "/depo/_KapaliUrun", ["/depo", "/baska"]);
  assert.deepEqual(kokler, ["/depo/_Sarmal", "/depo/_KapaliUrun", "/depo", "/baska"],
    "kök sırası bozuldu; yanlış kök önce denenirse aynı yol için farklı cevap doğar");
});

test("meyve kapısı aynı kökü iki kez denemez", () => {
  // Odak ile canlı editör aynı varlıkta olduğunda kök yinelenir; yinelenen kök
  // hem boşuna dosya yoklaması hem de ölçümde şişmiş sayı doğurur.
  const kokler = meyveKokleri("/depo/_Sarmal", "/depo/_Sarmal", ["/depo", "/depo"]);
  assert.deepEqual(kokler, ["/depo/_Sarmal", "/depo"], "yinelenen kök süzülmedi");
});

test("meyve kapısı odak yokken canlı editör köküne düşer", () => {
  // Odak ayarı kapalıysa (`sarmal.aktifVarlikOdagi` false) yapışkan kök hiç
  // kurulmaz; o hâlde tek ipucu canlı editördür ve kapı susmamalıdır.
  assert.deepEqual(meyveKokleri(undefined, "/depo/_Sarmal", ["/depo"]),
    ["/depo/_Sarmal", "/depo"], "odak yokken canlı editör kökü düşmüş");
  // Hiçbir ipucu yoksa yalnız çalışma alanı kalır — kapı boş liste döndürmez.
  assert.deepEqual(meyveKokleri(undefined, undefined, ["/depo"]), ["/depo"]);
});

// ═══════════════════════════════════════════════════════════════════════════
// ⑫ PANELLER GEZİLEBİLİR VE KOPYALANABİLİR (VIT-GRAF-A13)
//
//   Founder 2026-07-28 canlı incelemede üç eksik bildirdi ve üçü de aynı kökten
//   gelir: paneller kayıt gösteriyor fakat kullanıcının o kayıtla YAPABİLECEĞİ
//   hiçbir şey yok. Altmış iki kayıt tek yığın hâlinde gezilemiyor, satır metni
//   kopyalanamıyor ve satır nereye gideceğini söylemiyordu.
//
//   AŞAĞIDAKİ NÖBETLERİN HEPSİ ÜRETİMİN KENDİ İŞLEVLERİNİ KOŞTURUR. Kademe
//   kararı, satır kodu, işaret çizelgesi ve pano metni saf çekirdekte yaşar ve
//   burada gerçekten çağrılır; yalnız editör kabuğunun kendisi (TreeItem üretimi)
//   birim süitinde yüklenemediği için sağlayıcının o kaynağı okunarak ölçülür.
// ═══════════════════════════════════════════════════════════════════════════

const HATIRLATICILAR_KAYNAK = oku("../src/hatirlaticilar.ts");
const BILDIRIMLER_KAYNAK = oku("../src/bildirimler.ts");
/** VIT-GRAF-A16: Fikir hanesinin görünüş kabuğu artık kendi dosyasında yaşar. */
const FIKIRLER_KAYNAK = oku("../src/fikirler.ts");
const IKI_PANEL: ReadonlyArray<{ ad: string; kaynak: string }> = [
  { ad: "hatirlaticilar.ts", kaynak: HATIRLATICILAR_KAYNAK },
  { ad: "bildirimler.ts", kaynak: BILDIRIMLER_KAYNAK },
];

// ── ⑫a DOSYA KADEMESİ: ağaç üç kademedir ve hiçbir kayıt elenmez ────────────

test("dosya kademesi: kayıtlar dosyaya göre bölünür ve hiçbiri elenmez", () => {
  const kayitlar = [
    kayit("açık-adım", "bilgi", { dosya: "/p/plan/bir.sar", satir: 40 }),
    kayit("açık-hatırlatıcı", "bilgi", { dosya: "/p/plan/iki.sar", satir: 7 }),
    kayit("bloklu-çapa", "bilgi", { dosya: "/p/plan/bir.sar", satir: 12 }),
    kayit("geliştirmede-çapa", "bilgi", { dosya: "/p/plan/bir.sar", satir: 12, sutun: 1 }),
  ];
  const kumeler = dosyayaGrupla(kayitlar);
  assert.equal(kumeler.length, 2, "iki dosya iki satır vermeli");
  const toplam = kumeler.reduce((s, k) => s + k.kayitlar.length, 0);
  assert.equal(toplam, kayitlar.length, "dosya kademesi kayıt düşürdü");
  // Tek kayıtlık dosya da kendi satırını alır: kademe atlanırsa bazı kayıtlar
  // grubun içinde, bazıları yanında durur ve ağacın kademesi okunmaz olur.
  assert.deepEqual(kumeler.map((k) => k.dosyaAdi), ["bir.sar", "iki.sar"]);
  assert.equal(kumeler[0].kayitlar.length, 3);
  // Bir dosyanın kayıtları kaynak konumuna göre dizilir: panelde okunan sıra
  // dosyada okunan sırayla aynıdır.
  assert.deepEqual(kumeler[0].kayitlar.map((k) => k.tani.satir), [12, 12, 40]);
  assert.deepEqual(kumeler[0].kayitlar.map((k) => k.tani.sutun), [1, 3, 3]);
  assert.equal(yuzeyDosyaAdiniAl("C:\\proje\\plan\\uc.sar"), "uc.sar",
    "ters eğik çizgili yol da dosya adına inmeli");
});

test("ÜÇ KADEME İKİ PANELDE DE AYNI: Proje → Dosya → kayıt", () => {
  for (const { ad, kaynak } of IKI_PANEL) {
    assert.ok(/tur: "dosya"/.test(kaynak), `${ad} ağacında DOSYA kademesi yok`);
    assert.ok(/dosyayaGrupla\(oge\.kume\.kayitlar\)/.test(kaynak),
      `${ad} dosya kademesini saf çekirdeğin gruplayıcısından kurmuyor; ikinci bir gruplama doğmuş`);
    assert.ok(/oge\.tur === "dosya"\) return oge\.kume\.kayitlar\.map/.test(kaynak),
      `${ad} kayıtları dosya satırının altına indirmiyor; kademe atlanıyor`);
    // MUTASYON KANITI: kademeyi söküp Proje satırından doğrudan kayda inen bir
    // sağlayıcı bu üç iddianın üçünü de kıramaz — biri bile düşse süit kırmızıdır.
    assert.ok(!/oge\.tur === "proje"\) return oge\.kume\.kayitlar\.map/.test(kaynak),
      `${ad} hâlâ Proje satırından doğrudan kayıt yığınına iniyor (iki kademeli ağaç)`);
  }
});

// ── ⑫b TEKNOLOJİ SİMGESİ: tek kaynak, yalnız dosya satırı ───────────────────

test("teknoloji simgesi TEK kaynaktan gelir: ikinci bir çizelge kurulmamıştır", () => {
  for (const { ad, kaynak } of IKI_PANEL) {
    assert.ok(kaynak.includes("teknolojiSimgesi(") && kaynak.includes("eklentiCizelgesi("),
      `${ad} dosya satırının simgesini tek kaynaktan (teknoloji-simgesi.ts) almıyor`);
    // İKİNCİ ÇİZELGE YASAĞI: panelde uzantıdan simgeye giden elle yazılmış bir
    // eşleme bulunamaz. Bu deponun bugün iki kez ölçtüğü kusur tam olarak budur —
    // iki çizelge sessizce ayrışır ve hangisinin doğru olduğu bilinemez.
    assert.ok(!/["']\.[a-z]{2,5}["']\s*:/.test(kaynak),
      `${ad} kendi uzantı→simge çizelgesini kuruyor; ikinci bir çizelge doğmuş`);
    assert.ok(!kaynak.includes("contributes"),
      `${ad} paket bildirimini kendi başına okuyor; çizelge tek kapıdan gelmeli`);
  }
});

test("teknoloji simgesi YALNIZ dosya satırındadır; yaprak satır onu almaz", () => {
  for (const { ad, kaynak } of IKI_PANEL) {
    const cagriSayisi = (kaynak.match(/this\.dosyaIkonu\(/g) ?? []).length;
    // Bir tanımlama, bir de dosya satırındaki tek çağrı: yaprağa ikinci bir çağrı
    // düşerse sayı büyür ve nöbet kırmızıya döner.
    assert.equal(cagriSayisi, 1,
      `${ad} teknoloji simgesini dosya satırından başka bir yerde de basıyor (${cagriSayisi} çağrı)`);
    assert.ok(/private dosyaIkonu\(/.test(kaynak), `${ad} dosya satırı simgesi kapısını kaybetmiş`);
    // Uydurma teknoloji basılmaz: çizelgede karşılığı olmayan uzantı için
    // geometrik ailenin NÖTR dosya işaretine düşülür.
    assert.ok(/\?\? satirIkonu\(this\.eklentiKoku, DOSYA_YEDEK_SIMGESI, "duz"\)/.test(kaynak),
      `${ad} tanınmayan uzantıda ya uydurma simge basıyor ya da satırı işaretsiz bırakıyor`);
  }
});

// ── ⑫c YAPRAĞIN TÜR RENGİ DEĞİŞMEDİ ─────────────────────────────────────────

test("Gözlemler yaprağının TÜR RENGİ yerinde: üç tür üç renk, tek şekil", () => {
  // Bu, Adımın en kolay ihlal edilecek kısmıdır: simge dosya yolundan gelen bir
  // SVG olduğu için tema rengiyle boyanamaz ve yaprağa logo koymak tür sinyalini
  // öldürür. Rozet çizelgesi bugün de üç türü RENKLE ayırır ve şekil tektir.
  const anlamlar = Object.values(BILDIRIM_ROZET).map((r) => r.anlam);
  assert.equal(new Set(anlamlar).size, 3, "üç türün rengi ayrışmıyor; tür sinyali ölmüş");
  const sekiller = new Set(Object.values(BILDIRIM_ROZET).map((r) => r.simge));
  assert.equal(sekiller.size, 1, "yaprak şekli türe göre ayrışmış; şekil kademeyi söylemeli");
  // Sağlayıcı yaprağı hâlâ rozetin kendi simge ve anlamıyla çiziyor.
  assert.ok(/satirIkonu\(this\.eklentiKoku, rozet\.simge, rozet\.anlam\)/.test(BILDIRIMLER_KAYNAK),
    "Gözlemler yaprağı rozetin tür rengini kaybetmiş");
});

// ── ⑫d SATIR KENDİ KODUNU SÖYLER ────────────────────────────────────────────

test("satır kodu: mesajın adlandırdığı düğüm kimliği okunur (tırnaklı ve parantezli)", () => {
  // Motorun gerçek mesaj kalıpları — tani-metinleri.ts'deki şablonların çıktısı.
  assert.equal(dugumKodu('🚧 AÇIK ADIM (\'geliştirmede\') "KYN-MTR-A03" — neden rayda: ölçüm.'),
    "KYN-MTR-A03");
  assert.equal(dugumKodu("❗ Açık hatırlatıcı (HTR-AJAN-ORTAMI): sonraya bırakılan iş."),
    "HTR-AJAN-ORTAMI");
  assert.equal(dugumKodu("⛔ Bloklu (VIT-GRAF-A13): kabul ölçütü karşılanmadı."), "VIT-GRAF-A13");
  assert.equal(dugumKodu('"Adım" (KPN-A04) düğümünde "onay" alanı kullanılıyor.'), "KPN-A04");
  // Özet satırı tek bir düğüm adlandırmaz; uydurma kod üretilmez.
  assert.equal(dugumKodu("🔔 22 açık/kararlaşmış hatırlatıcı (❗20 açık · ➡️2 kararlaşmış) — hepsi görünür."),
    undefined, "özet satırı için düğüm kodu uydurulmuş");
});

test("KODSUZ SATIR ÜRETİLEMEZ: düğüm adlandırılmasa da satır kendi kimliğini taşır", () => {
  const dugumlu = kayit("açık-hatırlatıcı", "bilgi", {
    mesaj: "❗ Açık hatırlatıcı (HTR-AJAN-ORTAMI): ajan ortamı seçilecek.",
  });
  const dugumsuz = kayit("açık-hatırlatıcı", "bilgi", {
    mesaj: "🔔 22 açık/kararlaşmış hatırlatıcı — hepsi görünür, tek özet.",
  });
  assert.equal(kayitGorunumu(dugumlu).satirKodu, "HTR-AJAN-ORTAMI");
  assert.equal(kayitGorunumu(dugumsuz).satirKodu, "açık-hatırlatıcı",
    "düğüm adlandırılmayınca satır kodsuz kalmış");
  // Sicilin TAMAMI üstünde ölçülür: hiçbir kimlik kodsuz satır üretemez.
  for (const kod of taniSicili()) {
    const g = kayitGorunumu(kayit(kod, "bilgi"));
    assert.ok(g.satirKodu.trim().length > 0, `"${kod}" kimliği kodsuz satır üretti`);
    assert.ok(g.kodluEtiket.startsWith(g.satirKodu),
      `"${kod}" satırının etiketi kodla başlamıyor: ${g.kodluEtiket}`);
  }
});

test("MUTASYON · satır kodu: kod öneki sökülürse nöbet kırmızıya döner", () => {
  const g = kayitGorunumu(kayit("açık-adım", "bilgi", {
    mesaj: '🚧 AÇIK ADIM (\'geliştirmede\') "VIT-GRAF-A13" — neden rayda: paneller gezilemiyor.',
  }));
  assert.ok(g.kodluEtiket.startsWith("VIT-GRAF-A13 · "), "etiket kodla başlamıyor");
  // Bozuk ikiz: önek atılmış bir etiket üretilirse aynı iddia düşer.
  const bozuk = kodluEtiket("", g.etiket);
  assert.ok(!bozuk.startsWith("VIT-GRAF-A13"),
    "kod öneki sökülmüş etiket hâlâ kodla başlıyor görünüyor; nöbet ölçmüyor demektir");
});

test("İKİ PANEL AYNI DESENİ KULLANIR: biri kodu başa alıp öteki almazsa süit kırmızıya döner", () => {
  for (const { ad, kaynak } of IKI_PANEL) {
    assert.ok(/new vscode\.TreeItem\(g\.kodluEtiket,/.test(kaynak),
      `${ad} kayıt satırını kodlu etiketle basmıyor; iki panelde iki desen doğmuş`);
    assert.ok(!/new vscode\.TreeItem\(g\.etiket,/.test(kaynak),
      `${ad} hâlâ kodsuz etiket basıyor`);
  }
  // ESKİ SINIR KALKTI (VIT-GRAF-A15 · Founder hükmü 2026-08-08). VIT-GRAF-A13
  // turunda Fikir hanesi bu hükmün dışında bırakılmıştı ve gerekçesi başka bir
  // Adımın kararını sessizce ezmemekti; Founder o sınırı kaldırdı, dolayısıyla
  // bugün Fikir satırı da kodunu başında taşır ve bunu ⑬e bölümündeki nöbetler
  // ölçer. Burada korunan şey biçim değil KAYNAK ayrımıdır: iki hane aynı biçimi
  // paylaşır fakat aynı görünüm tarifini paylaşmaz, çünkü Fikir kaydı tanı
  // akışından değil ayrışmış ağaçtan gelir. VIT-GRAF-A16 ile hane kendi paneline
  // taşındı, dolayısıyla tarif de o panelin kaynağında ölçülür.
  assert.ok(/const f = fikirGorunumu\(oge\.kayit\);/.test(FIKIRLER_KAYNAK),
    "Fikir hanesi kendi görünüm tarifini basmıyor");
});

// ── ⑫e KAYIT TÜRÜNE GÖRE İŞARET AYRIŞIR ─────────────────────────────────────

test("Hatırlatıcılar işaretleri: dört kayıt türü dört ayrı işaret taşır", () => {
  const anahtar = (i: SatirIsareti): string =>
    i.aile === "satır" ? `satır:${i.simge}:${i.anlam}` : `eksen:${i.tip}:${i.evre}`;
  const isaretler = Object.values(HATIRLATICI_ISARETLERI).map(anahtar);
  assert.equal(new Set(isaretler).size, isaretler.length,
    "iki kayıt türü aynı işareti taşıyor; kullanıcı tıklamadan nereye gideceğini bilemez");
  // Founder hükmü: hatırlatıcı düğümü ÇANINI korur.
  assert.deepEqual(hatirlaticiIsareti("açık-hatırlatıcı"),
    { aile: "satır", simge: "can", anlam: "uyari" },
    "hatırlatıcı düğümünün çanı değişmiş");
  // Founder hükmü: açık Adım KENDİ EKSEN simgesini taşır.
  const adim = hatirlaticiIsareti("açık-adım");
  assert.equal(adim.aile, "eksen", "açık Adım eksen ailesinin simgesini taşımıyor");
  assert.ok(adim.aile === "eksen" && (EKSEN_TIPLERI as readonly string[]).includes(adim.tip),
    "eksen işareti kanonik eksen tipinden gelmiyor");
});

test("işaret çizelgesi yüzeyin TAMAMINI kapsar: yeni bir kimlik düşerse nöbet kırmızıya döner", () => {
  // Kapsam sicilden TÜRETİLİR, elle yazılmış bir listeden değil: motor
  // Hatırlatıcılar yüzeyine beşinci bir kimlik yollarsa bu iddia anında düşer.
  const yuzeydekiler = [...taniSicili()].filter((kod) =>
    beklenenSunumYuzeyi({ duzey: "bilgi", kod, mesaj: "", satir: 1, sutun: 1 }) === "hatırlatıcılar");
  assert.ok(yuzeydekiler.length > 0, "fikstür boş; nöbet hiçbir şey ölçmüyor");
  assert.deepEqual([...yuzeydekiler].sort(), Object.keys(HATIRLATICI_ISARETLERI).sort(),
    "işaret çizelgesi ile yüzeye düşen kimlikler ayrışmış");
});

test("MUTASYON · işaret: sağlayıcı tek tip çana dönerse nöbet kırmızıya döner", () => {
  assert.ok(/this\.isaretIkonu\(hatirlaticiIsareti\(g\.kod\)\)/.test(HATIRLATICILAR_KAYNAK),
    "Hatırlatıcılar kayıt satırı işaretini kayıt türünden türetmiyor");
  assert.ok(!/const KAYIT_SIMGESI/.test(HATIRLATICILAR_KAYNAK),
    "panel hâlâ bütün kayıtlara tek tip simge basan sabiti taşıyor");
});

// ── ⑫f PANOYA KOPYALAMA ─────────────────────────────────────────────────────

test("pano metni bağlamı taşır: TAM dosya yolu ve satır numarası bloğun içindedir", () => {
  const k = kayit("açık-hatırlatıcı", "bilgi", {
    dosya: "/Users/biri/depo/_Sarmal/plan/vitrin_ui.sar",
    mesaj: "❗ Açık hatırlatıcı (HTR-AJAN-ORTAMI): ajan ortamı seçilecek.",
    oneri: "Karar verince durum: kararlaştı yaz.",
  });
  const metin = panoMetni({ tur: "kayıt", kayit: k });
  assert.ok(metin.includes("/Users/biri/depo/_Sarmal/plan/vitrin_ui.sar:12:3"),
    `pano metni tam kaynağı taşımıyor: ${metin}`);
  assert.ok(metin.startsWith("HTR-AJAN-ORTAMI · "), "pano metni satırın kodunu taşımıyor");
  assert.ok(metin.includes("açık-hatırlatıcı"), "pano metni tanı kimliğini düşürmüş");
  assert.ok(metin.includes("Karar verince"), "pano metni düzeltme önerisini düşürmüş");
  assert.ok(metin.includes("ajan ortamı seçilecek"), "pano metni tam gövdeyi düşürmüş");
});

test("küme kopyalanınca hiçbir kayıt elenmez: panelde görülen ile panoya inen aynıdır", () => {
  const kayitlar = [
    kayit("açık-adım", "bilgi", { dosya: "/p/plan/bir.sar" }),
    kayit("bloklu-çapa", "bilgi", { dosya: "/p/plan/bir.sar" }),
    kayit("geliştirmede-çapa", "bilgi", { dosya: "/p/plan/bir.sar" }),
  ];
  const kume = dosyayaGrupla(kayitlar)[0];
  const metin = panoMetni({ tur: "küme", baslik: kume.dosya, kayitlar: kume.kayitlar });
  for (const k of kayitlar) {
    assert.ok(metin.includes(k.tani.kod), `"${k.tani.kod}" kaydı panoya inmemiş`);
  }
  assert.ok(metin.startsWith("/p/plan/bir.sar"), "küme bloğu başlığını taşımıyor");
});

test("pano düğümü çevirisi TEK yerdedir ve iki panelin düğümlerini de tanır", () => {
  const k = kayit("açık-adım", "bilgi");
  const projeKumesi = projeyeGrupla([k])[0];
  const dosyaKumesi = dosyayaGrupla([k])[0];
  assert.deepEqual(panoDugumu({ tur: "kayıt", kayit: k }), { tur: "kayıt", kayit: k });
  assert.equal(panoDugumu({ tur: "proje", kume: projeKumesi })?.tur, "küme");
  assert.equal(panoDugumu({ tur: "dosya", kume: dosyaKumesi })?.tur, "küme");
  // Tanınmayan düğüm için uydurma blok üretilmez.
  // Fikir düğümü bu çekirdeğin evreninde yaşamaz: onun pano metnini Fikirler
  // paneli kendi kaynağından verir (VIT-GRAF-A16).
  assert.equal(panoDugumu({ tur: "fikir" }), undefined);
  assert.equal(panoDugumu(undefined), undefined);
  assert.equal(panoDugumu("satır"), undefined);
});

test("kopyalama komutu ağaç panellerinin SAĞ TIK menüsünde ilan edilmiştir", () => {
  const paket = JSON.parse(oku("../package.json")) as {
    contributes: {
      commands: Array<{ command: string; title: string }>;
      menus: Record<string, Array<{ command: string; when?: string; group?: string }>>;
    };
  };
  const komut = paket.contributes.commands.find((k) => k.command === "sarmal.satiriKopyala");
  assert.ok(komut, "kopyalama komutu paket bildiriminde ilan edilmemiş");
  assert.equal(yerellestir(komut.title), panoyaKopyalaBasligi(),
    "menüde okunan ad ile metin kataloğundaki cümle ayrışmış");
  const menu = paket.contributes.menus["view/item/context"] ?? [];
  for (const gorunus of [GORUNUS_HATIRLATICILAR, GORUNUS_BILDIRIMLER, GORUNUS_FIKIRLER]) {
    assert.ok(menu.some((g) => g.command === "sarmal.satiriKopyala" && g.when === `view == ${gorunus}`),
      `"${gorunus}" görünüşünün sağ tık menüsünde kopyalama girdisi yok`);
  }
  // Komut TEKTİR: paneller aynı komuta bağlanır, ikinci bir kopyalama yolu
  // doğarsa iki panel panoya farklı metin yazmaya başlar.
  const kopyaKomutlari = paket.contributes.commands.filter((k) => /Kopyala|copyRow/i.test(k.command + k.title));
  assert.equal(kopyaKomutlari.length, 1, "birden çok satır kopyalama komutu ilan edilmiş");
  // Canlı yol gerçekten bağlı: komut kaydı eklenti gövdesinde yaşar ve panoya
  // yazan tek el odur (sağlayıcılar yalnız METNİ hesaplar).
  const eklenti = oku("../src/eklenti.ts");
  assert.ok(/registerCommand\("sarmal\.satiriKopyala"/.test(eklenti),
    "kopyalama komutu canlı yolda kaydedilmiyor; menü girdisi ölü kalır");
  assert.ok(/clipboard\.writeText\(pano\.metin\)/.test(eklenti), "komut panoya yazmıyor");
  for (const { ad, kaynak } of IKI_PANEL) {
    assert.ok(!kaynak.includes("clipboard"),
      `${ad} panoya kendisi yazıyor; pano yazan tek el komut olmalıdır`);
    assert.ok(/panoMetni\(oge: unknown\)/.test(kaynak),
      `${ad} pano metnini hesaplayan kapıyı taşımıyor`);
  }
});

test("MUTASYON · kopyalama: metin bulunamayınca panoya hiçbir şey yazılmaz", () => {
  // Kopyalanamayan satır SESSİZ geçilmez: komut önce metni ister, boş dönerse
  // uyarı basıp durur. Kaynak sırası bu sözleşmeyi taşır.
  const eklenti = oku("../src/eklenti.ts");
  const govde = /registerCommand\("sarmal\.satiriKopyala"[\s\S]*?\n    \}\),/.exec(eklenti)?.[0] ?? "";
  assert.ok(govde.length > 0, "kopyalama komutunun gövdesi okunamadı");
  const uyariYeri = govde.indexOf("panoyaKopyalanacakSatirYok");
  const yazimYeri = govde.indexOf("clipboard.writeText");
  assert.ok(uyariYeri > 0 && yazimYeri > 0, "komut ne uyarıyor ne yazıyor");
  assert.ok(uyariYeri < yazimYeri,
    "boş metin kontrolü pano yazımından SONRA geliyor; boş satır sessizce panoya inebilir");
});

// ── ⑫g DURUM ÇUBUĞU: sayı türetilir, sıfır kaybolmaz ────────────────────────

test("durum çubuğu girdileri GERÇEK görünüş kimliklerine götürür", () => {
  const gorunusler = new Set(PAKET.contributes.views["sarmal-yol"].map((g) => g.id));
  for (const girdi of DURUM_CUBUGU_GIRDILERI) {
    const kimlik = girdi.komut.replace(/\.focus$/, "");
    assert.ok(girdi.komut.endsWith(".focus"),
      `durum çubuğu girdisi bir panele götürmüyor: ${girdi.komut}`);
    assert.ok(gorunusler.has(kimlik),
      `durum çubuğu var olmayan bir görünüşe götürüyor: ${kimlik}`);
  }
});

test("SIFIR DA BİR BİLGİDİR: girdi sayı sıfırken de gizlenmez", () => {
  const kaynak = oku("../src/durum-cubugu.ts");
  // Girdi her tazelemede koşulsuz gösterilir; sayıya bakan bir gizleme dalı yoktur.
  assert.ok(/oge\.show\(\);/.test(kaynak), "durum çubuğu girdisi gösterilmiyor");
  assert.ok(!/\.hide\(\)/.test(kaynak),
    "durum çubuğu girdiyi gizliyor; sıfır sayaç ile bozuk sayaç kullanıcı gözünde aynıdır");
  assert.ok(!/adet\s*(===|>|<|\?)\s*0/.test(kaynak),
    "durum çubuğu sıfır sayıya özel bir dal açmış; sıfır da bir bilgidir");
});

// ═══════════════════════════════════════════════════════════════════════════
// ⑬ TÜR ÖZETİ VE ORTAK SATIR BİÇİMİ (VIT-GRAF-A15)
//
//   BİRİNCİ İŞİN KÖKÜ. VIT-GRAF-A13 ağacı üç kademeye indirirken tanı kimliğine
//   göre yığan eski kademeyi dosya kademesiyle DEĞİŞTİRMEK zorunda kaldı, çünkü
//   ikisini birlikte tutmak dört kademe demekti. Kazanç ölçülmüştür: kullanıcı
//   bir dosyanın nesi olduğunu bakışta görür. Bedeli de ölçülmüştür: hangi tür
//   sorunun baskın olduğunu ancak bütün dosyaları açıp sayarak öğrenir. Founder
//   2026-08-08 tarihinde kaybolan görünümü geri istedi fakat dördüncü kademeyi
//   reddetti; bu yüzden geri gelen şey bir kademe değil, proje satırına yazılan
//   bir ÖZETTİR.
//
//   İKİNCİ İŞİN KÖKÜ. Hatırlatıcılar panelinin içinde iki ayrı satır biçimi
//   yaşıyordu: hatırlatıcı satırları kodla başlıyor, Fikir satırları ise yalnız
//   amaç cümlesini basıp kimliğini düşürüyordu. Founder'ın gerekçesi üç
//   maddedir — tutarlılık, izlenebilirlik ve bedelin küçüklüğü — ve hükmü Fikir
//   satırının da ortak biçime çevrilmesidir.
//
//   NÖBETLER SAHTE OLMASIN DİYE ÜÇ ŞART BURADA DA GEÇERLİDİR: üretimin gerçek
//   işlevleri koşturulur, fikstür boş değildir ve her davranış iddiası
//   mutasyonla kanıtlanır.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Bilinen bir dağılım üreten fikstür: beş tür, on dört kayıt, kayıtlar birden
 * çok dosyaya yayılmış. Dosyaya yayılma bilinçlidir — özet dosya kademesinin
 * üstünde durur ve dosya sayısından bağımsız olmalıdır.
 */
function dagilimFiksturu(): YuzeyKaydi[] {
  const kayitlar: YuzeyKaydi[] = [];
  const dagilim: ReadonlyArray<readonly [string, number]> = [
    ["şema-dışı-alan", 5], ["adım-atomikliği", 4], ["çıplak-adımlı-katman", 2],
    ["kullanımsız-tip", 2], ["ad-ayracı", 1],
  ];
  for (const [kod, adet] of dagilim) {
    for (let i = 0; i < adet; i += 1) {
      kayitlar.push(kayit(kod, "bilgi", { dosya: `/p/plan/d${i % 3}.sar`, satir: i + 1 }));
    }
  }
  return kayitlar;
}

// ── ⑬a DAĞILIM PANELİN KENDİ KÜMESİNDEN TÜRER ───────────────────────────────

test("tür özeti: proje satırı dağılımı adıyla ve sayısıyla basar", () => {
  const kayitlar = dagilimFiksturu();
  assert.ok(kayitlar.length > 0, "dağılım fikstürü boş; nöbet hiçbir şey ölçmüyor demektir");
  const d = turDagilimi(kayitlar);

  // Sıra çoktan aza doğrudur: baskın tür her koşulda başta durur. Eşit sayılı
  // iki tür (2 · 2) Türkçe kimlik sırasıyla ayrılır ve "ç" harfi "k"den öncedir.
  assert.deepEqual(d.baskinlar.map((t) => [t.kod, t.adet] as const),
    [["şema-dışı-alan", 5], ["adım-atomikliği", 4], ["çıplak-adımlı-katman", 2]],
    "baskın türler ya yanlış sıralandı ya yanlış sayıldı");

  const etiket = projeSatiriEtiketi("Sarmal", d.baskinlar);
  assert.ok(etiket.startsWith("Sarmal"), "proje satırı kendi adını kaybetmiş");
  for (const t of d.baskinlar) {
    assert.ok(etiket.includes(String(t.adet)), `özet "${t.kod}" türünün sayısını basmıyor: ${etiket}`);
    assert.ok(etiket.includes(taniKisaAdi(t.kod)), `özet "${t.kod}" türünü adıyla basmıyor: ${etiket}`);
  }
  // Çıplak makine kimliği basılmaz: tireler çözülür (grup başlıklarıyla aynı ölçüt).
  assert.ok(!etiket.includes("şema-dışı-alan"), `özet çıplak tanı kimliği basıyor: ${etiket}`);
});

test("tür özeti: sayılar panelin KENDİ kayıt kümesinden türer — mutasyonla kanıtlı", () => {
  const kayitlar = dagilimFiksturu();
  const oncesi = projeSatiriEtiketi("Sarmal", turDagilimi(kayitlar).baskinlar);

  // MUTASYON ①: panelin kümesine aynı türden iki kayıt daha girerse sayı BÜYÜR.
  // Sayı sabit bir yerden gelseydi bu iddia düşerdi.
  const buyumus = projeSatiriEtiketi("Sarmal", turDagilimi(
    [...kayitlar, kayit("ad-ayracı", "bilgi"), kayit("ad-ayracı", "bilgi"),
      kayit("ad-ayracı", "bilgi"), kayit("ad-ayracı", "bilgi"),
      kayit("ad-ayracı", "bilgi"), kayit("ad-ayracı", "bilgi")]).baskinlar);
  assert.notEqual(buyumus, oncesi,
    "panelin kümesi büyüdüğü hâlde özet değişmedi; sayı panelden türemiyor demektir");
  assert.ok(buyumus.includes("7 × ad ayracı"),
    `büyüyen tür özete baskın olarak girmedi: ${buyumus}`);

  // MUTASYON ②: kümeden kayıt düşerse sayı KÜÇÜLÜR ve tür özetten tümüyle çıkabilir.
  const kucuk = turDagilimi(kayitlar.filter((k) => k.tani.kod !== "şema-dışı-alan"));
  assert.ok(!projeSatiriEtiketi("Sarmal", kucuk.baskinlar).includes("şema dışı alan"),
    "panelden düşen tür hâlâ özette görünüyor; özet bayat bir kaynaktan besleniyor");
});

test("tür özeti: hiçbir kayıt ve hiçbir tür kaybolmaz", () => {
  const kayitlar = dagilimFiksturu();
  const d = turDagilimi(kayitlar);
  assert.equal(d.toplam, kayitlar.length,
    "dağılımın toplamı panelin kayıt sayısını tutmuyor; bir kayıt düşmüş ya da iki kez sayılmış");
  assert.equal(d.tumu.reduce((s, t) => s + t.adet, 0), kayitlar.length,
    "tür listesi bütün kayıtları kapsamıyor");
  assert.equal(d.turSayisi, new Set(kayitlar.map((k) => k.tani.kod)).size,
    "tür sayısı fikstürdeki ayrı kimlik sayısıyla uyuşmuyor");
  // Elenen tür yoktur: baskın listede olmayanlar tam listede yaşar.
  for (const kod of new Set(kayitlar.map((k) => k.tani.kod))) {
    assert.ok(d.tumu.some((t) => t.kod === kod), `"${kod}" türü dağılımdan düşmüş`);
  }
});

// ── ⑬b GÜRÜLTÜ SINIRI: ÜST SATIRDA ÜÇ TÜR, GERİSİ SAKLANMAZ ─────────────────

test("tür özeti: üst satır ÜÇ türle sınırlıdır ve geri kalanı açıklama ile ipucunda yaşar", () => {
  const kayitlar = dagilimFiksturu();
  const d = turDagilimi(kayitlar);
  assert.equal(OZET_TUR_SAYISI, 3, "gürültü sınırı değişmiş; gerekçesi çekirdekte yazılıdır");
  assert.equal(d.baskinlar.length, OZET_TUR_SAYISI,
    "üst satır gürültü sınırına uymuyor; satırın okunur kalması ölçüttür");
  assert.ok(d.tumu.length > d.baskinlar.length, "fikstür sınırı zorlamıyor; nöbet ölçmüyor demektir");

  // GERİ KALAN SAKLANMAZ. Gri açıklama kaç ayrı tür bulunduğunu söyler ve
  // kullanıcı gördüğü üçün tamamı olmadığını bakışta anlar.
  const gri = projeSatiriAciklamasi(kayitlar.length, d.turSayisi);
  assert.ok(gri.includes(String(kayitlar.length)) && gri.includes(`${d.turSayisi} tür`),
    `gri açıklama ya toplamı ya tür sayısını düşürmüş: ${gri}`);

  // İPUCU DAĞILIMIN TAMAMINI BASAR — özetten elenen türler dâhil.
  const ipucu = projeSatiriIpucu("Sarmal", "SRM", kayitlar.length, d.tumu);
  for (const t of d.tumu) {
    assert.ok(ipucu.includes(`${t.adet} × ${taniKisaAdi(t.kod)}`),
      `ipucu "${t.kod}" türünü düşürmüş; özetin elediği tür kaybolmuş olur`);
  }
});

test("tür özeti: sıra kararlıdır — aynı küme her koşumda aynı satırı üretir", () => {
  // Eşit sayılı türler Türkçe kimlik sırasıyla dizilir. Kararsız bir sıra paneli
  // aynı içerik için yeniden çizdirir ve yinelenen çizim güvencesini bozar.
  const esit = [kayit("kullanımsız-tip", "bilgi"), kayit("ad-ayracı", "bilgi")];
  assert.deepEqual(turDagilimi(esit).tumu.map((t) => t.kod), ["ad-ayracı", "kullanımsız-tip"]);
  assert.deepEqual(turDagilimi([...esit].reverse()).tumu.map((t) => t.kod),
    ["ad-ayracı", "kullanımsız-tip"], "kaynak sırası değişince özet sırası da değişti");
  // Boş panel çıplak bir ayraçla bitmez: etiket yalnız Projenin adıdır.
  assert.equal(projeSatiriEtiketi("Sarmal", turDagilimi([]).baskinlar), "Sarmal");
});

// ── ⑬c İKİNCİ SAYAÇ KURULMAZ ────────────────────────────────────────────────

test("İKİNCİ SAYAÇ KURULMAZ: dağılım panelin var olan gruplayıcısından türer", () => {
  const kayitlar = dagilimFiksturu();
  // DAVRANIŞ ÖLÇÜSÜ: dağılım, panelin zaten kullandığı `kokeGoreOzetle`
  // gruplamasının ta kendisidir. Biri ikinci bir sayaç yazsa ve o sayaç bir gün
  // ayrışsa bu iddia düşer.
  const gruplamadan = new Map(kokeGoreOzetle(kayitlar).map((k) => [k.kod, k.kayitlar.length]));
  const ozetten = new Map(turDagilimi(kayitlar).tumu.map((t) => [t.kod, t.adet]));
  assert.deepEqual([...ozetten.entries()].sort(), [...gruplamadan.entries()].sort(),
    "tür özeti ile kök gruplaması ayrışmış; aynı gerçeğin iki sayacı doğmuş");

  // MUTASYON: kayıt yerine düzeye göre sayan bir ikiz sayaç kurulsa dağılım
  // farklılaşırdı. İkizin gerçekten farklı olduğunu ölçmek, iddianın dişi olduğunu
  // gösterir; aksi hâlde yukarıdaki karşılaştırma her koşulda yeşil kalırdı.
  const ikizSayac = new Map<string, number>();
  for (const k of kayitlar) ikizSayac.set(k.dosya, (ikizSayac.get(k.dosya) ?? 0) + 1);
  assert.notDeepEqual([...ikizSayac.entries()].sort(), [...ozetten.entries()].sort(),
    "ikinci sayaç ikizi gerçek dağılımdan ayrışmıyor; mutasyon kanıtı ölçmüyor demektir");

  // KAYNAK ÖLÇÜSÜ: çekirdek dağılımı gruplayıcıdan kurar ve kendi sayma döngüsünü açmaz.
  const cekirdek = oku("../src/yuzey-cekirdek.ts");
  const govde = /export function turDagilimi\([\s\S]*?\n}/.exec(cekirdek)?.[0] ?? "";
  assert.ok(govde.length > 0, "turDagilimi gövdesi kaynakta bulunamadı");
  assert.ok(govde.includes("kokeGoreOzetle("),
    "tür özeti panelin var olan gruplayıcısını çağırmıyor; ikinci bir sayım yolu doğmuş");
  assert.ok(!/\bfor\b|\bwhile\b|\+= 1|\?\? 0\) \+ 1/.test(govde),
    "tür özeti kendi sayma döngüsünü kurmuş; sayı gruplamadan türemeli");
});

test("İKİ PANEL DE ÖZETİ GERÇEKTEN BASAR: proje satırı çıplak ada dönemez", () => {
  // Bu iddia, özetin kaynağını değil VARLIĞINI korur: biri özeti söküp proje
  // satırını yalnız adla basarsa iki panelde iki desen doğar ve Founder'ın geri
  // istediği görünüm sessizce kaybolur.
  for (const { ad, kaynak } of IKI_PANEL) {
    assert.ok(/projeSatiriEtiketi\(oge\.kume\.proje\.ad, dagilim\.baskinlar\)/.test(kaynak),
      `${ad} proje satırını tür özetiyle basmıyor`);
    assert.ok(!/new vscode\.TreeItem\(oge\.kume\.proje\.ad,/.test(kaynak),
      `${ad} hâlâ çıplak Proje adını etiket olarak basıyor; tür özeti satıra ulaşmıyor`);
    assert.ok(/projeSatiriAciklamasi\(adet, dagilim\.turSayisi\)/.test(kaynak),
      `${ad} gri açıklamada kaç ayrı tür bulunduğunu söylemiyor; kullanıcı gördüğünü tamamı sanır`);
    assert.ok(/projeSatiriIpucu\(oge\.kume\.proje\.ad, oge\.kume\.proje\.kod, adet, dagilim\.tumu\)/.test(kaynak),
      `${ad} ipucunda dağılımın tamamını basmıyor; özetin elediği tür kaybolur`);
  }
});

test("İKİNCİ TARAMA KURULMAZ: iki panel de özeti KENDİ elindeki kümeden verir", () => {
  for (const { ad, kaynak } of IKI_PANEL) {
    assert.ok(/turDagilimi\(oge\.kume\.kayitlar\)/.test(kaynak),
      `${ad} tür özetini panelin kendi kümesinden türetmiyor`);
    // Panel kendi tarama ya da sayma yolunu açmaz: dosya okumaz, kayıt saymaz.
    for (const yasak of ["findFiles", "readFile", "openTextDocument", "createFileSystemWatcher"]) {
      assert.ok(!kaynak.includes(yasak), `${ad} tür özeti için ikinci bir tarama kurmuş: ${yasak}`);
    }
    for (const [ad2, kusur] of Object.entries(sayacKusurlari(kaynak))) {
      assert.equal(kusur, undefined, `${ad} kendi tür sayacını tutuyor (${ad2}): ${kusur}`);
    }
  }
});

/**
 * SAYAÇ İDİYOMU TARAYICISI — yasağı YAZIMDAN bağımsız kılar.
 *
 * ÖLÇÜLMÜŞ KUSUR (bağımsız denetim · 2026-08-09): yasak yalnız tek bir yazımı
 * (`new Map<string, number>`) arıyordu ve türetilmiş yolun YERİNE geçen sayacı
 * yakalıyor, YANINA eklenen sayacı kaçırıyordu. Denetçi başka bir yazımla
 * paralel bir sayaç kurdu ve nöbet yeşil kaldı; yalnız bayt özeti kırıldı.
 *
 * Tarayıcı biriktirme İDİYOMLARINI arar, belirli bir yazımı değil: sayısal
 * eşleme ilanı, artırma işleci, artırarak atama ve varsayılan-sıfır artırma
 * kalıbı. Yorum satırları elenir, çünkü bir yasağı anlatan yorumun kendisi o
 * yasağı tetiklememelidir.
 *
 * MEŞRU İSTİSNA TEK VE ADIYLA YAZILIDIR: `kayitSayisi` okuyucusu panelin KENDİ
 * kümeleri üstünde `reduce` ile toplar ve ikinci bir gerçek kurmaz — sayı yine
 * panelin tuttuğu kayıtlardan türer. Bu yüzden `reduce` bir kusur sayılmaz;
 * biriktirme idiyomlarının hiçbiri onda geçmez.
 */
function sayacKusurlari(kaynak: string): Record<string, string | undefined> {
  // Yorumlar ve dizeler elenir: yasağı ANLATAN metin yasağı tetiklemesin.
  const kod = kaynak
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1 ")
    .replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/g, '""');
  const bul = (desen: RegExp): string | undefined => desen.exec(kod)?.[0]?.trim();
  return {
    "sayısal eşleme": bul(/(?:new\s+Map|Record)\s*<[^>]*\bnumber\b[^>]*>/),
    "artırma işleci": bul(/\b[\w.[\]]+\+\+|\+\+[\w.[\]]+/),
    "artırarak atama": bul(/[\w.[\])\]]\s*\+=\s*\d/),
    "varsayılan-sıfır artırma": bul(/\?\?\s*0\s*\)\s*\+\s*\d/),
    "sayısal biriktirici ilanı": bul(/\b(?:let|var)\s+\w*(?:[Ss]ayac|[Cc]ount|[Tt]oplam)\w*\s*(?::\s*number)?\s*=\s*0\b/),
  };
}

test("İKİNCİ SAYAÇ YANINA DA EKLENEMEZ: yasak yazımdan bağımsızdır — mutasyonla kanıtlı", () => {
  // Bugünkü canlı kaynak temizdir.
  for (const { ad, kaynak } of IKI_PANEL) {
    const kusurlar = Object.entries(sayacKusurlari(kaynak)).filter(([, k]) => k !== undefined);
    assert.deepEqual(kusurlar, [], `${ad} bir sayaç idiyomu taşıyor: ${JSON.stringify(kusurlar)}`);
  }
  // MUTASYON KANITI: türetilmiş yolun YANINA eklenmiş paralel bir sayaç, dört
  // ayrı yazımın dördünde de yakalanır. Denetçinin ölçtüğü boşluk buydu.
  const paralelSayaclar: ReadonlyArray<readonly [string, string]> = [
    ["nesne eşlemesi", "const ikinci: Record<string, number> = {};"],
    ["artırma işleci", "for (const k of kayitlar) sayac[k.tani.kod]++;"],
    ["artırarak atama", "for (const k of kayitlar) toplam += 1;"],
    ["varsayılan-sıfır", "s.set(k.tani.kod, (s.get(k.tani.kod) ?? 0) + 1);"],
    ["biriktirici ilanı", "let turSayaci = 0;"],
  ];
  for (const [ad, satir] of paralelSayaclar) {
    const mutant = `${IKI_PANEL[0].kaynak}\n${satir}\n`;
    const yakalanan = Object.values(sayacKusurlari(mutant)).filter((k) => k !== undefined);
    assert.ok(yakalanan.length > 0,
      `"${ad}" yazımıyla kurulan paralel sayaç yakalanmadı; yasak hâlâ dar demektir`);
  }
  // Ve meşru istisna yanlışlıkla suçlanmaz: panelin kendi `reduce` toplamı temiz kalır.
  const mesru = "get kayitSayisi(): number {\n" +
    "  return this.kumeler.reduce((toplam, k) => toplam + k.kayitlar.length, 0);\n}";
  assert.deepEqual(Object.values(sayacKusurlari(mesru)).filter((k) => k !== undefined), [],
    "panelin kendi kümesinden türeyen toplam yanlışlıkla ikinci sayaç sayıldı");
});

// ── ⑬d ÖZET BİR KADEME DEĞİL, BİR SATIRDIR ──────────────────────────────────

test("AĞAÇ ÜÇ KADEME KALDI: tür özeti dördüncü bir kademe doğurmadı", () => {
  for (const { ad, kaynak } of IKI_PANEL) {
    // Panel düğümü hâlâ yalnız Proje, Dosya ve kayıt kademelerini tanır.
    // VIT-GRAF-A16 ile Fikir kök hanesi bu panelden tümüyle çıktı ve kendi
    // görünüşüne taşındı; kabul edilen kademe adları da o yüzden daraldı.
    const kademeler = [...kaynak.matchAll(/\{ tur: "([^"]+)"/g)].map((m) => m[1]);
    assert.ok(kademeler.length > 0, `${ad} panel düğümleri okunamadı`);
    for (const kademe of new Set(kademeler)) {
      assert.ok(["proje", "dosya", "kayıt", "küme"].includes(kademe),
        `${ad} ağacına yeni bir kademe girmiş: "${kademe}"`);
    }
    // Proje satırının çocuğu hâlâ DOSYA satırıdır; özet araya kademe sokmadı.
    assert.ok(/dosyayaGrupla\(oge\.kume\.kayitlar\)/.test(kaynak),
      `${ad} Proje satırının altında dosya kademesini kaybetmiş`);
    assert.ok(!/kokeGoreOzetle\(/.test(kaynak),
      `${ad} kök özetini yeniden bir AĞAÇ KADEMESİ olarak kurmuş; Founder dördüncü kademeyi reddetti`);
  }
  // Özet bir metindir ve ağaç düğümü değildir: çekirdek onu düğüm tipi olarak ilan etmez.
  const cekirdek = oku("../src/yuzey-cekirdek.ts");
  assert.ok(!/tur: "tür"|tur: "özet"/.test(cekirdek),
    "tür özeti bir ağaç düğümü olarak ilan edilmiş; özet satırdır, kademe değildir");
});

// ── ⑬e FİKİR SATIRI ORTAK BİÇİME GİRDİ ──────────────────────────────────────

/** Tek bir Fikir kaydı — gerçek ayrıştırıcıdan geçmiş düğümle kurulur. */
function fikirKaydi(kaynak: string): FikirKaydi {
  const [fikir] = fikirleriTopla(ayristir(belirtecle(kaynak)).bildirimler);
  assert.ok(fikir, "fikstür hiç Fikir üretmedi; nöbet boş küme üstünde koşuyor demektir");
  return { proje: ANA, dosya: "/p/plan/fikirler.sar", fikir };
}

const FIKIR_KAYNAGI =
  'Fikir( kod: FKR-ORTAK, ne: "Panel yüzeyi olmayan tipler için ortak bir kapı açmak",\n' +
  '       durum: park, dönüşTetikleyici: "yüzey turu kapanınca" )';

test("FİKİR SATIRI KODUNU BAŞINDA TAŞIR: hane ortak biçime girdi — mutasyonla kanıtlı", () => {
  const g = fikirGorunumu(fikirKaydi(FIKIR_KAYNAGI));
  assert.equal(g.satirKodu, "FKR-ORTAK", "Fikir satırı kendi kodunu okumuyor");
  assert.ok(g.etiket.startsWith("FKR-ORTAK · "), `Fikir satırı kodla başlamıyor: ${g.etiket}`);
  // Amaç cümlesi kodun ardında bütün hâliyle durur; kimlik cümleyi yutmaz.
  assert.ok(g.etiket.includes("Panel yüzeyi olmayan tipler için ortak bir kapı açmak"),
    `Fikir satırı amacını düşürmüş: ${g.etiket}`);

  // ORTAK BİÇİM İŞLEVİ KULLANILIR, YENİSİ İCAT EDİLMEZ. Etiket, hatırlatıcı
  // satırlarının kullandığı `kodluEtiket` işlevinin çıktısının ta kendisidir.
  assert.equal(g.etiket, kodluEtiket("FKR-ORTAK", "Panel yüzeyi olmayan tipler için ortak bir kapı açmak"),
    "Fikir hanesi kendi etiket biçimini icat etmiş; iki hane zamanla ayrışır");

  // MUTASYON: kod öneki sökülmüş bir ikiz üretilirse iddia düşer.
  const oneksiz = fikirEtiketi("Panel yüzeyi olmayan tipler için ortak bir kapı açmak");
  assert.ok(!oneksiz.startsWith("FKR-ORTAK"),
    "önek sökülmüş etiket hâlâ kodla başlıyor görünüyor; nöbet ölçmüyor demektir");
  assert.notEqual(oneksiz, g.etiket, "kodlu ve kodsuz etiket aynı çıktı; hüküm ölçülemiyor");
});

test("FİKİR SATIRI KODSUZ KALMAZ: kimlik yazılmamışsa uydurulmaz, eksikliği SÖYLENİR", () => {
  const g = fikirGorunumu(fikirKaydi('Fikir( ne: "kimliği yazılmamış fikir", durum: park )'));
  assert.ok(g.satirKodu.trim().length > 0, "kimliksiz Fikir kodsuz satır üretti");
  assert.ok(g.etiket.startsWith(`${g.satirKodu} · `),
    `kimliksiz Fikrin etiketi ortak biçimden çıkmış: ${g.etiket}`);
  assert.ok(!/FKR|[A-ZÇĞİÖŞÜ]{2,}-/.test(g.satirKodu),
    `kimliksiz Fikir için uydurma bir kod üretilmiş: ${g.satirKodu}`);
});

test("AMAÇ YAZILMAMIŞSA EKSİKLİK SÖYLENİR: yer tutucu bir işaret bu iddiayı geçemez", () => {
  // BU NÖBET BİLEREK DAR DEĞİL. Kod öneki artık kimliği HER KOŞULDA etikete
  // koyduğu için "satır görünmez olmaz" iddiası kendiliğinden sağlanır ve
  // cümlenin boş olmadığını ölçmek hiçbir şey ölçmez hâle gelir. Katalog ise
  // eksikliğin AÇIKÇA söyleneceğini vaat ediyor; ölçülmesi gereken vaat odur.
  const cumleHanesi = (etiket: string): string => (etiket.split(" · ")[1] ?? "").trim();
  const bos = cumleHanesi(fikirGorunumu(fikirKaydi("Fikir( kod: FKR-BOS, durum: park )")).etiket);
  const dolu = cumleHanesi(fikirGorunumu(fikirKaydi(FIKIR_KAYNAGI)).etiket);

  assert.notEqual(bos, dolu, "yazılmamış amaç ile yazılmış amaç aynı cümleyi üretti");
  // ① Cümle bir YER TUTUCU değildir: harf taşır ve en az iki sözcükten oluşur.
  //    Tek bir tire, üç nokta ya da tek sözcük bu eşiği geçemez.
  const harfler = (bos.match(/\p{L}/gu) ?? []).length;
  const sozcukler = bos.split(/\s+/).filter((s) => /\p{L}{2,}/u.test(s));
  assert.ok(harfler >= 12,
    `eksiklik cümlesi yer tutucuya dönmüş (${harfler} harf): "${bos}"`);
  assert.ok(sozcukler.length >= 3,
    `eksiklik cümlesi tam bir söz öbeği değil (${sozcukler.length} sözcük): "${bos}"`);
  // ② Cümle eksikliği ADIYLA söyler; kataloğun bütün yüzeylerde kullandığı
  //    eksiklik sözcüğü budur (dönüş tetikleyicisi hanesinde de aynısı geçer).
  assert.match(bos, /yazılmamış/,
    `eksiklik açıkça söylenmiyor; kullanıcı amacın neden boş olduğunu okuyamıyor: "${bos}"`);
  // ③ Cümle kaydın KİMLİĞİNİ tekrar etmez: kimlik zaten kod hanesindedir ve
  //    iki kez basmak satırı uzatıp asıl bilgiyi geriye iter.
  assert.ok(!bos.includes("FKR-BOS"), `eksiklik cümlesi kimliği ikinci kez basıyor: "${bos}"`);

  // MUTASYON KANITI: denetçinin ölçtüğü yer tutucular bu iddiayı GEÇEMEZ.
  for (const yerTutucu of ["—", "…", "yok", "-", "  "]) {
    assert.ok(
      (yerTutucu.match(/\p{L}/gu) ?? []).length < 12 || !/yazılmamış/.test(yerTutucu),
      `"${yerTutucu}" yer tutucusu iddiayı geçiyor; nöbet hâlâ körelmiş demektir`);
  }
});

test("PANELLER ARASINDA TEK BİÇİM VAR: iki hane de kodla başlar ve aynı ayracı kullanır", () => {
  // İki komşu hane: hatırlatıcı kaydı ve Fikir kaydı. VIT-GRAF-A16 ile hane
  // ayrı panellere yerleşti; ortak satır biçimi bu yüzden DAHA da önemlidir,
  // çünkü kullanıcı iki panelde iki kural öğrenmemelidir.
  const hatirlatici = kayitGorunumu(kayit("açık-hatırlatıcı", "bilgi", {
    mesaj: "❗ Açık hatırlatıcı (HTR-AJAN-ORTAMI): ajan ortamı seçilecek.",
  }));
  const fikir = fikirGorunumu(fikirKaydi(FIKIR_KAYNAGI));
  for (const [ad, satirKodu, etiket] of [
    ["hatırlatıcı", hatirlatici.satirKodu, hatirlatici.kodluEtiket],
    ["fikir", fikir.satirKodu, fikir.etiket],
  ] as const) {
    assert.ok(etiket.startsWith(`${satirKodu} · `),
      `"${ad}" hanesi ortak biçimden çıkmış: ${etiket}`);
  }
  // Fikir hanesi ayracı KENDİ kaynağında kurmaz; ortak işlevi çağırır.
  const fikirKaynak = oku("../src/fikir-cekirdek.ts");
  assert.ok(/kodluEtiket\(/.test(fikirKaynak),
    "Fikir hanesi ortak biçim işlevini çağırmıyor; ikinci bir biçim doğmuş");
  assert.ok(!/" · "|` · `/.test(fikirKaynak),
    "Fikir hanesi kendi ayracını gömmüş; biçim iki yerde yaşarsa zamanla ayrışır");
  // Sağlayıcı hâlâ hanenin kendi görünüm tarifini basar (A13 sınırı korunur) ve
  // tarif VIT-GRAF-A16 ile Fikirler panelinin kendi kaynağında yaşar.
  assert.ok(/const f = fikirGorunumu\(oge\.kayit\);/.test(FIKIRLER_KAYNAK),
    "Fikir hanesi kendi görünüm tarifini basmıyor");
  assert.ok(/new vscode\.TreeItem\(f\.etiket,/.test(FIKIRLER_KAYNAK),
    "Fikir satırı panelde kendi ortak biçimli etiketiyle basılmıyor");
});

// ── ⑬f SATIRLAR EMOJİ TAŞIMAZ ───────────────────────────────────────────────

test("tür özeti ve Fikir satırı EMOJİ taşımaz: işaretler vektörel aileden gelir", () => {
  const kayitlar = dagilimFiksturu();
  const d = turDagilimi(kayitlar);
  const emoji = /\p{Extended_Pictographic}/u;
  const metinler: Record<string, string> = {
    projeEtiketi: projeSatiriEtiketi("Sarmal", d.baskinlar),
    projeAciklamasi: projeSatiriAciklamasi(kayitlar.length, d.turSayisi),
    projeIpucu: projeSatiriIpucu("Sarmal", "SRM", kayitlar.length, d.tumu),
    fikirEtiketi: fikirGorunumu(fikirKaydi(FIKIR_KAYNAGI)).etiket,
  };
  for (const [ad, metin] of Object.entries(metinler)) {
    assert.equal(emoji.exec(metin), null, `"${ad}" metni emoji taşıyor: ${metin}`);
  }
  // Kısa ad da çıplak makine kimliği değildir: tire kalmaz.
  for (const kod of taniSicili()) {
    assert.ok(!/\S-\S/.test(taniKisaAdi(kod)), `"${kod}" kısa adı hâlâ çıplak makine kimliği`);
    assert.ok(taniKisaAdi(kod).trim().length > 0, `"${kod}" kısa adı boş döndü`);
  }
});

// ── 🔭 KAPSAM KAPISI UNUTULAMAZ (Founder hükmü 2026-08-27) ───────────────────
//   Founder'ın hükmü şudur: bir kullanıcı bir projeyi ya da çalışma alanını
//   açtığında bu sorunları hiç yaşamamalıdır. Hükmün kalıcı karşılığı tek tek
//   onarım değil, kusur SINIFININ tekrarını yapısal olarak imkânsız kılmaktır.
//
//   Bu turda ölçülen üç kusurun kökü birdi: paneller kapsamı ayrı ayrı
//   çözüyordu. Süzgeç tam eşitlik yaptığı için çatı odağında üç panel birden
//   boşaldı; Onaylar paneli kapsam kapısından hiç geçmediği için bütün çalışma
//   alanını gösterdi; iki panel aidiyeti hiç söylemediği için çatı odağında
//   kayıtların hangi projeye ait olduğu okunamadı. Üçü de tek köklü bir dünyada
//   doğruydu ve iç içe çatı düzeninde kırıldı.
//
//   Aşağıdaki nöbetler o kökü tutar: kapsama kuralı tek evde kalır, panele
//   yazan her yol o evden geçer ve yeni bir yüzey eklendiğinde kapsam kapısına
//   bağlanmayı unutmak SESSİZ olamaz.

test("KAPSAMA KURALI TEK EVDE YAŞAR: ikinci bir kapsama yazımı yoktur", () => {
  const evler = ["yuzey-cekirdek.ts", "eklenti.ts", "onay-kuyrugu.ts", "onay-paneli.ts"];
  for (const ev of evler) {
    const kaynak = readFileSync(
      fileURLToPath(new URL(`../src/${ev}`, import.meta.url)), "utf8");
    // Kapsama sorusunu ham `startsWith` ile soran her yer ikinci bir kuraldır:
    // ayırıcı sınırını unutabilir ve "…-arsiv" gibi bir kardeş kökü kapsanan
    // sayabilir. Kural yol haritası çekirdeğinde tek bir yerde yaşar.
    assert.ok(!/kok\w*\.startsWith\(/.test(kaynak),
      `${ev} kapsama sorusunu kendi başına soruyor; kural tek evden okunmalı`);
  }
});

test("PANELE YAZAN HER YOL KAPSAM KAPISINDAN GEÇER", () => {
  const kaynak = readFileSync(
    fileURLToPath(new URL("../src/eklenti.ts", import.meta.url)), "utf8");
  // Dört sunum yüzeyinin tamamı kapsam süzgecini defterine ya da kayıt
  // çağrısına almak zorundadır. Bir yüzey bunu almadan panele yazarsa, o yüzey
  // odak ne olursa olsun bütün çalışma alanını gösterir — Onaylar panelinde
  // ölçülen kusurun ta kendisi.
  const defterSuzgeci = kaynak.match(/panelDeGorunur\(dosya\)/g) ?? [];
  assert.ok(defterSuzgeci.length >= 2,
    "yüzey defterleri kapsam süzgecini almıyor; panel odağı tanımaz");
  assert.ok(/onayKuyruguKaydi\(.*odakKapisi/.test(kaynak),
    "Onaylar kuyruğu odak kapısına bağlanmamış; panel bütün çalışma alanını gösterir");
  // Desen satır bazlıdır: çağrı arada kendi parantezli argümanını taşıyabilir.
  assert.ok(/yolHaritasiKaydi\(.*odakKapisi/.test(kaynak),
    "Yol Haritası odak kapısına bağlanmamış");
});

test("ODAK DEĞİŞİNCE BÜTÜN YÜZEYLER AYNI TURDA YENİDEN BASILIR", () => {
  const kaynak = readFileSync(
    fileURLToPath(new URL("../src/eklenti.ts", import.meta.url)), "utf8");
  const kapi = /function hepsiniYenidenYayinla\(\): void \{([\s\S]*?)\n\}/.exec(kaynak);
  assert.ok(kapi, "tek yeniden yayın kapısı yok; odak değişimi dağınık ele alınıyor");
  // Problems, Hatırlatıcılar, Gözlemler, Fikirler ve odağa bağlı öteki yüzeyler
  // AYNI turda basılır. Biri atlanırsa kullanıcı çelişkili iki tablo görür:
  // bir panel yeni varlığı gösterirken öteki eskisini göstermeye devam eder.
  for (const [ad, desen] of Object.entries({
    Problems: /koleksiyon\.(set|delete)/,
    "yüzey defteri": /yuzeyDefteri\.yayımla\(\)/,
    "fikir defteri": /fikirDefteri\.yayımla\(\)/,
    "odak dinleyicileri": /odakDinleyicileri/,
  })) {
    assert.ok(desen.test(kapi[1]),
      `odak değişiminde ${ad} yeniden basılmıyor; panel bayat kalır`);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ✂️ KIRPMA SATIRIN İŞİDİR — ipucu penceresi kaydı kesmez (VIT-GRAF-A18)
//
//   HÜKMÜN DOĞUŞU. Founder 2026-08-16 tarihli canlı turda ipucu penceresini
//   fotoğrafla belgeledi ve pencerenin satırın kırpılmış metnini olduğu gibi
//   tekrarladığını bildirdi. Kırpma bir SUNUM kararıdır ve yalnız ağaç satırına
//   aittir: satır dar olduğu için kesilir, buna karşılık ipucu penceresi kaydın
//   tamamını taşımak üzere açılır. İki yüzey aynı kısaltmayı gösterirse fareyi
//   getirmenin hiçbir kazancı kalmaz.
//
//   NÖBETİN KAPSAMI DÜRÜSTÇE YAZILIYOR. Aşağıdaki hükümler YÜZEY katmanını ölçer:
//   satır etiketi kırpar, ipucu kırpmaz, ipucunun kaynak satırı çalışma alanına
//   göreli yazılır ve pano kopyası tam yolu korur. Motorun kırpılmamış ikiz
//   cümleyi ÜRETTİĞİNİ `cekirdek/sinama/dogrulayici.test.ts` ayrıca ölçer; burada
//   ölçülen şey, yüzeyin o ikizi bulduğunda gösterdiği ve bulamadığında eski
//   davranışına düştüğüdür.
// ═══════════════════════════════════════════════════════════════════════════

const KIRPMA_YOLU = "/Users/kullanici/calisma/proje/is/plan/omurga.sar";

/** Ağaç satırına sığmayacak kadar uzun, tek parça bir kanonik gövde. */
const KIRPMA_GOVDESI =
  "Bu kayıt, ağaç satırına sığmayacak kadar uzun bir gövde taşır ve gövdenin " +
  "tamamı okunmadan kaydın ne istediği anlaşılamaz; bu yüzden pencere gövdeyi " +
  "kırpmadan göstermek zorundadır ve kısaltma yalnız satırın kendi işidir.";

const KIRPMA_KAYDI = {
  kod: "açık-hatırlatıcı",
  duzey: "bilgi",
  mesaj: `❗ Açık hatırlatıcı (HTR-ORNEK): ${KIRPMA_GOVDESI}`,
  dosya: KIRPMA_YOLU,
  satir: 42,
  sutun: 3,
  oneri: "Kararı verdiğinde durum alanına kararlaştı yaz.",
};

test("kırpma satırın işidir: uzun gövde ağaç etiketinde kesilir", () => {
  const etiket = kayitEtiketi(KIRPMA_KAYDI.mesaj);
  assert.ok(etiket.length < KIRPMA_KAYDI.mesaj.length, "etiket hiç kısalmadı; satır taşacak");
  assert.ok(etiket.endsWith("…"), "etiket kesildiğini üç noktayla söylemiyor");
});

test("kırpma ipucuya taşınmaz: pencere kaydın tam gövdesini gösterir", () => {
  const ipucu = kayitIpucu(KIRPMA_KAYDI);
  assert.ok(ipucu.includes(KIRPMA_KAYDI.mesaj), "ipucu kaydın tam gövdesini taşımıyor");
  assert.ok(ipucu.includes(KIRPMA_GOVDESI), "gövdenin sonu ipucuda kaybolmuş");
  assert.ok(
    !ipucu.includes(kayitEtiketi(KIRPMA_KAYDI.mesaj)),
    "ipucu satır etiketinin kırpılmış metnini olduğu gibi tekrarlıyor",
  );
});

test("kırpma ipucuya taşınmaz: pencere kendi başına da üç nokta üretmez", () => {
  assert.equal(kayitIpucu(KIRPMA_KAYDI).includes("…"), false,
    "ipucu penceresinde kırpma işareti belirdi");
});

test("pano kopyası tam yolu korur: kayıt bağlamını kaybetmeden yapıştırılır", () => {
  const pano = panoKaydiMetni({
    etiket: kayitEtiketi(KIRPMA_KAYDI.mesaj),
    aciklama: "omurga.sar:42",
    kod: KIRPMA_KAYDI.kod,
    duzey: KIRPMA_KAYDI.duzey,
    mesaj: KIRPMA_KAYDI.mesaj,
    dosya: KIRPMA_KAYDI.dosya,
    satir: KIRPMA_KAYDI.satir,
    sutun: KIRPMA_KAYDI.sutun,
    oneri: KIRPMA_KAYDI.oneri,
  });
  assert.ok(pano.includes(`${KIRPMA_YOLU}:42:3`), "pano bloğu tam dosya yolunu düşürdü");
  assert.ok(pano.includes(KIRPMA_GOVDESI), "pano bloğu kaydın tam gövdesini düşürdü");
});

test("kırpma ipucuya taşınmaz: motorun ikiz cümlesi varsa pencere tam gövdeyi gösterir", () => {
  const tamGovde = `❗ Açık hatırlatıcı (HTR-ORNEK): ${KIRPMA_GOVDESI} Gövdenin kırpılan kuyruğu da buradadır.`;
  const ipucu = kayitIpucu({ ...KIRPMA_KAYDI, mesaj: "❗ Açık hatırlatıcı (HTR-ORNEK): kısaltılmış gövde…", tamMesaj: tamGovde });
  assert.ok(ipucu.includes(tamGovde), "pencere motorun kırpılmamış ikizini göstermedi");
  assert.equal(ipucu.includes("kısaltılmış gövde…"), false, "pencere kırpılmış cümleyi hâlâ basıyor");
});

test("kırpma ipucuya taşınmaz: ikiz cümle yoksa davranış değişmez", () => {
  const ipucu = kayitIpucu(KIRPMA_KAYDI);
  assert.ok(ipucu.includes(KIRPMA_KAYDI.mesaj),
    "ikizsiz kayıtta pencere kendi mesajını kaybetti; eski tanılar bu yolda çalışmaya devam etmelidir");
});

// ═══════════════════════════════════════════════════════════════════════════
// 📍 KAYNAK SATIRI ÇALIŞMA ALANINA GÖRELİDİR (VIT-GRAF-A18)
//
//   Founder aynı turda ipucunun kaynak satırında upuzun bir mutlak yol
//   bastığını bildirdi. Kullanıcının okuduğu kayıt kendi çalışma alanının
//   içindedir ve o alanın dışını anlatan önek hiçbir şey öğretmez. Buna karşılık
//   pano kopyası TAM yolu korur, çünkü kopyalanan metin başka bir yere
//   yapıştırıldığında çalışma alanını yanında taşımaz.
// ═══════════════════════════════════════════════════════════════════════════

test("kaynak satırı: ipucu çalışma alanına göreli yol basar, pano tam yolu korur", () => {
  yuzeyKokleriniAyarla(["/Users/kullanici/calisma/proje"]);
  try {
    const ipucu = kayitIpucu(KIRPMA_KAYDI);
    assert.ok(ipucu.includes("Kaynak: is/plan/omurga.sar:42:3"), `ipucu göreli yol basmadı:\n${ipucu}`);
    assert.equal(ipucu.includes(KIRPMA_YOLU), false, "ipucu hâlâ mutlak yol taşıyor");
    const pano = panoKaydiMetni({
      etiket: kayitEtiketi(KIRPMA_KAYDI.mesaj), aciklama: "omurga.sar:42",
      kod: KIRPMA_KAYDI.kod, duzey: KIRPMA_KAYDI.duzey, mesaj: KIRPMA_KAYDI.mesaj,
      dosya: KIRPMA_KAYDI.dosya, satir: KIRPMA_KAYDI.satir, sutun: KIRPMA_KAYDI.sutun,
    });
    assert.ok(pano.includes(`${KIRPMA_YOLU}:42:3`), "pano kopyası tam yolu düşürdü");
  } finally {
    yuzeyKokleriniAyarla([]);
  }
});

test("kaynak satırı: iç içe köklerden EN UZUNU seçilir, kapsamayan kök yolu kısaltmaz", () => {
  yuzeyKokleriniAyarla(["/Users/kullanici", "/Users/kullanici/calisma/proje", "/baska/kok"]);
  try {
    assert.equal(calismaAlaninaGoreli(KIRPMA_YOLU), "is/plan/omurga.sar",
      "iç içe kökler arasından en uzunu seçilmedi");
    assert.equal(calismaAlaninaGoreli("/hicbir/kokte/olmayan.sar"), "/hicbir/kokte/olmayan.sar",
      "hiçbir kökün kapsamadığı yol kısaltıldı; kullanıcıya var olmayan bir yol gösterilir");
  } finally {
    yuzeyKokleriniAyarla([]);
  }
});

test("kaynak satırı: kök bağlanmamışsa yol olduğu gibi kalır", () => {
  yuzeyKokleriniAyarla([]);
  assert.equal(calismaAlaninaGoreli(KIRPMA_YOLU), KIRPMA_YOLU,
    "kök bilinmezken yol kısaltıldı; bilinmeyen bir kökü tahmin etmek yanlış yol gösterir");
});

// ── ⑭ SATIR İÇİ KOPYALAMA DÜĞMESİ (VIT-GRAF-A17) ────────────────────────────
//
//   Founder 2026-08-16 gözle doğrulama turunda kopyalamanın çalıştığını fakat
//   KEŞFEDİLEBİLİR olmadığını bildirdi: eylem yalnız sağ tık menüsünde yaşıyordu
//   ve varlığı bilinmeyen bir eylemi menü görünür kılmaz. Hüküm şudur: aynı komut
//   satırın üzerine gelindiğinde beliren bir düğme olarak da sunulur, sağ tık
//   girdisi yerinde kalır ve iki yol TEK komuta iner.
//
//   Aşağıdaki nöbetler dört şeyi ölçer ve hiçbiri ötekinden türetilmez:
//   düğmenin üç panelde de ilan edildiğini, sağ tık girdisinin kaldırılmadığını,
//   ikinci bir kopyalama mantığının doğmadığını ve düğmenin simgesinin vektörel
//   aileden geldiğini.

/** Paket bildiriminin komut ve menü haneleri — nöbet kendi kopyasını okur. */
const PAKET_YUZEYI = JSON.parse(oku("../package.json")) as {
  contributes: {
    commands: Array<{ command: string; title: string; icon?: string | { light: string; dark: string } }>;
    menus: Record<string, Array<{ command: string; when?: string; group?: string }>>;
  };
};
const SATIR_MENUSU = PAKET_YUZEYI.contributes.menus["view/item/context"] ?? [];
const UC_PANEL_GORUNUSU = [GORUNUS_HATIRLATICILAR, GORUNUS_BILDIRIMLER, GORUNUS_FIKIRLER];

test("satır içi kopyalama düğmesi üç panelde de ilan edilmiştir ve sağ tık girdisi YERİNDE KALIR", () => {
  for (const gorunus of UC_PANEL_GORUNUSU) {
    const girdiler = SATIR_MENUSU.filter(
      (g) => g.command === "sarmal.satiriKopyala" && g.when === `view == ${gorunus}`);
    assert.ok(girdiler.some((g) => g.group === "inline"),
      `"${gorunus}" görünüşünde satır içi kopyalama düğmesi ilan edilmemiş; eylem yalnız ` +
      "sağ tık menüsünde kalır ve Founder'ın bildirdiği keşfedilebilirlik kusuru geri gelir");
    assert.ok(girdiler.some((g) => g.group === "9_cutcopypaste"),
      `"${gorunus}" görünüşünün sağ tık kopyalama girdisi kaldırılmış; iki erişim yolu ` +
      "birbirini DIŞLAMAZ ve Adımın hükmü girdinin kalmasını şart koşar (VIT-GRAF-A17)");
  }
});

test("düğmenin yerleşimi Yol Haritası koni kartı EMSALİNİ izler — panel başına ayrı desen kurulmaz", () => {
  // Emsal ölçülür, varsayılmaz: koni kartı düğmesi aynı menü haritasında ve aynı
  // `inline` kümesinde yaşar. Emsal bir gün başka bir mekanizmaya taşınırsa bu
  // nöbet kırmızıya döner ve iki panelin iki ayrı desene ayrışması sessiz olmaz.
  const emsal = SATIR_MENUSU.find((g) => g.command === "sarmal.koniKart");
  assert.ok(emsal, "koni kartı düğmesi satır menüsünde bulunamadı; emsal ölçülemiyor");
  assert.equal(emsal.group, "inline",
    "emsal düğme artık `inline` kümesinde değil; kopyalama düğmesi emsalden ayrışmış olur");
  for (const gorunus of UC_PANEL_GORUNUSU) {
    const satirIci = SATIR_MENUSU.find(
      (g) => g.command === "sarmal.satiriKopyala" && g.when === `view == ${gorunus}` && g.group === "inline");
    assert.equal(satirIci?.group, emsal.group,
      `"${gorunus}" düğmesi emsalin kümesini kullanmıyor; panel başına ayrı desen doğmuş`);
  }
});

test("iki erişim yolu TEK komuta iner; İKİNCİ BİR KOPYALAMA MANTIĞI doğmamıştır", () => {
  // ① Menü hanesinde kopyalamaya götüren bütün girdilerin komut kimliği tektir.
  const kopyaGirdileri = SATIR_MENUSU.filter((g) => /Kopyala/i.test(g.command));
  const kimlikler = new Set(kopyaGirdileri.map((g) => g.command));
  assert.equal(kimlikler.size, 1,
    `satır menüsünde ${kimlikler.size} ayrı kopyalama komutu var (${[...kimlikler].join(", ")}); ` +
    "iki erişim yolu ayrı komuta inerse iki yol zamanla farklı metin üretir");
  assert.equal(kopyaGirdileri.length, UC_PANEL_GORUNUSU.length * 2,
    "üç panelin ikişer girdisi (sağ tık ve satır içi) beklenirken sayı tutmadı");
  // ② Gövdede komut BİR KEZ kaydedilir ve panoya yazan tek el odur.
  const eklenti = oku("../src/eklenti.ts");
  const kayitSayisi = eklenti.match(/registerCommand\("sarmal\.satiriKopyala"/g)?.length ?? 0;
  assert.equal(kayitSayisi, 1,
    `kopyalama komutu gövdede ${kayitSayisi} kez kaydedilmiş; satır içi düğme için ikinci bir ` +
    "işleyici yazılmış olabilir ve o işleyici zamanla asıl komuttan ayrışır");
  // ③ Üç panelin hiçbiri panoya kendisi yazmaz; sağlayıcı yalnız METNİ hesaplar.
  for (const ad of ["hatirlaticilar.ts", "bildirimler.ts", "fikirler.ts"]) {
    const kaynak = oku(`../src/${ad}`);
    assert.ok(!kaynak.includes("clipboard"),
      `${ad} panoya kendisi yazıyor; pano yazan tek el komut olmalıdır (VIT-GRAF-A13 sözleşmesi)`);
  }
});

test("satır içi düğmenin simgesi VEKTÖREL aileden gelir — hazır ikon kimliğine düşülmez", () => {
  // Düğme artık satırda GÖRÜNÜR; codicon kimliği kalsaydı Founder'ın 2026-08-04
  // hükmüne aykırı bir işaret dört panelin ortasında sürekli duruyor olurdu.
  const komut = PAKET_YUZEYI.contributes.commands.find((k) => k.command === "sarmal.satiriKopyala");
  assert.ok(komut, "kopyalama komutu paket bildiriminde ilan edilmemiş");
  assert.ok(typeof komut.icon === "object" && komut.icon !== null,
    `kopyalama düğmesinin simgesi hazır ikon kimliğidir (${JSON.stringify(komut.icon)}); ` +
    "satırda görünen her işaret vektörel aileden gelir (VIT-KIMLIK-A05)");
  assert.ok((SATIR_SIMGELERI as readonly string[]).includes("kopya"),
    "kopyalama işareti satır ailesinde ilan edilmemiş; düğme ailede karşılığı olmayan bir simge kullanıyor");
  assert.equal(komut.icon.light, satirSvgVaryanti("kopya", "duz", "acik"),
    "düğmenin açık tema simgesi çizelgenin ürettiği yoldan ayrışmış");
  assert.equal(komut.icon.dark, satirSvgVaryanti("kopya", "duz", "koyu"),
    "düğmenin koyu tema simgesi çizelgenin ürettiği yoldan ayrışmış");
  for (const yol of [komut.icon.light, komut.icon.dark])
    assert.ok(existsSync(fileURLToPath(new URL(`../${yol}`, import.meta.url))),
      `düğmenin simgesi diskte yok: ${yol} — düğme boş bir kutuya bakar`);
});

// ── ⑭b DÜĞMENİN BELİRDİĞİ HER SATIR BİR CEVAP ÜRETİR ────────────────────────
//
//   ÖLÇÜLMÜŞ KUSUR (2026-08-29). Düğme satırın türüne bakmaz ve üç panelin HER
//   satırında belirir; dolayısıyla her satırın bir cevabı olmak zorundadır.
//   Fikirler panelinin proje satırı bu şartı karşılamıyordu: ortak pano
//   çevirici düğümün yalnız `tur` etiketine bakıyor, Fikir kaydı taşıyan kümeyi
//   kendi evreninden sanıyor ve blok üretimi `tani.mesaj` okunamadığı için
//   çöküyordu. Kusur sağ tık yolunda da vardı fakat gizliydi; düğme onu bir
//   fare hareketi uzağa getirir. Aşağıdaki iki nöbet hem kapıyı hem de kapının
//   NEDEN var olduğunu ölçer.

test("yabancı küme ortak çeviriciden GEÇMEZ — Fikirler proje satırı tanı çevirisine düşmez", () => {
  const f = fikirKaydi(FIKIR_KAYNAGI);
  const kume = projeyeGrupla([f] as never)[0];
  assert.ok(kume.kayitlar.length > 0, "fikstür boş küme üretti; nöbet hiçbir şey ölçmez");
  assert.equal(panoDugumu({ tur: "proje", kume }), undefined,
    "ortak çevirici Fikir kaydı taşıyan kümeyi tanı kümesi sandı; blok üretimi çöker");
  // KAPININ GEREKÇESİ ÖLÇÜLÜR: kapı olmasaydı üretim tam olarak burada patlardı.
  assert.throws(() => panoMetni({ tur: "küme", baslik: kume.proje.ad, kayitlar: [f] as never }),
    /mesaj/,
    "Fikir kaydı tanı bloğuna sokulduğunda artık patlamıyor; kapının gerekçesi ölçülemez hâle gelmiş");
});

test("Fikirler proje satırı kendi panelinden ORTAK birleştiriciyle cevap alır", () => {
  const f = fikirKaydi(FIKIR_KAYNAGI);
  const kume = projeyeGrupla([f] as never)[0];
  const beklenen = panoKumeMetni(kume.proje.ad, kume.kayitlar.map((k) => fikirPanoMetni(k as never)));
  assert.ok(beklenen.startsWith(kume.proje.ad), "küme bloğu başlığını taşımıyor");
  assert.ok(beklenen.includes("FKR-ORTAK"), "küme bloğu Fikrin kimliğini düşürmüş");
  assert.ok(beklenen.includes("/p/plan/fikirler.sar"), "küme bloğu tam kaynak yolunu düşürmüş");
  // Panelin o kapıyı GERÇEKTEN taşıdığı ve ikinci bir biçim icat etmediği ölçülür.
  assert.ok(/d\.tur === "proje"[\s\S]{0,600}?panoKumeMetni\(/.test(FIKIRLER_KAYNAK),
    "Fikirler paneli proje satırını ortak birleştiriciye bağlamıyor; satır ya çöker ya cevapsız kalır");
  assert.ok(/d\.tur === "fikir"[\s\S]{0,200}?fikirPanoMetni\(/.test(FIKIRLER_KAYNAK),
    "Fikirler paneli kayıt satırının pano kapısını kaybetmiş");
});

// ═══════════════════════════════════════════════════════════════════════════
// fikir-yuzeyi.test.ts — 💡 FİKİR YÜZEYİ NÖBETİ (KYN-YUZ-A01)
//
//   ÖLÇÜLEN KUSUR. Sınıflama Fikir tipini "ham, taahhütsüz fikir; olgunlaşırsa
//   Karar'a yükselir" diye tanımlar ve zorunlu alanlarını kod, ne, durum ve
//   dönüşTetikleyici olarak sayar. Buna karşılık yazılan bir Fikir hiçbir panele
//   ulaşmıyordu: motorun tanı akışında Fikir için hiçbir kayıt doğmaz ve
//   Hatırlatıcılar paneli yalnız o akıştan beslenir. Kullanıcı bir fikir
//   yazdığında onu kaybetmiş gibi oluyordu.
//
//   NÖBET SAHTE OLMASIN DİYE ÜÇ ŞART. Birincisi, nöbet GERÇEK işlevleri
//   koşturur: fikstür metni gerçek belirteçleyiciden ve gerçek ayrıştırıcıdan
//   geçer, panelin bastığı satır da eklentinin canlı yolda çağırdığı
//   `fikirGorunumu` tarifinin ta kendisidir. İkincisi, nöbet boş küme üstünde
//   koşmaz: fikstürün gerçekten Fikir ürettiği ayrıca ölçülür. Üçüncüsü,
//   ölçülen şey mutasyonla kanıtlanır: dönüş tetikleyicisi yüzeyden çekilirse
//   ilgili iddia kırmızıya döner.
//
//   KAPSAM: toplayıcı · panel satırının tarifi · defterin yayın ve kapsam
//   sözleşmesi · yinelenen çizimi önleyen parmak izi · arayüz işaretlerinin
//   vektörel aileden gelmesi ve hiçbir emoji taşımaması.
// ═══════════════════════════════════════════════════════════════════════════
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { belirtecle } from "../../cekirdek/src/belirtec.ts";
import { ayristir } from "../../cekirdek/src/ayristirici.ts";
import {
  fikirleriTopla, fikirGorunumu, fikirParmakIzi, FikirDefteri, FIKIR_TIPI,
  type FikirKaydi,
} from "../src/fikir-cekirdek.ts";
import { YUZEY_ACIKLAMALARI, YUZEY_BOS_DURUM } from "../src/yuzey-metinleri.ts";
import { SATIR_SIMGELERI, satirSvgKaynagi, type SatirSimgesi } from "../src/simge-cizelgesi.ts";

const oku = (u: string): string => readFileSync(fileURLToPath(new URL(u, import.meta.url)), "utf8");

/**
 * Fikstür KULLANICININ YAZDIĞI gibidir: bir tam Fikir, bir de zorunlu alanları
 * eksik bırakılmış Fikir. İkincisi kasıtlıdır — depoda bugün böyle bir kayıt
 * yaşıyor (biçim vitrini) ve panel eksik kayıtta çökmemeli, eksikliği açıkça
 * söylemelidir. Araya bir Hatırlatıcı konur ki toplayıcının kardeş tipi
 * yanlışlıkla toplamadığı da ölçülebilsin.
 */
const FIKSTUR = [
  'Fikir( kod: FKR-KAPI, ne: "Panel yüzeyi olmayan tipler için ortak bir kapı açmak",',
  '       durum: park, dönüşTetikleyici: "yüzey turu kapanınca" )',
  'Hatırlatıcı( kod: HTR-BASKA, durum: açık, çapa: gelecek, ne: "bu kayıt Fikir değildir",',
  '       dönüşTetikleyici: "hiç" )',
  "Fikir( kod: FKR-EKSIK, durum: park )",
].join("\n");

const PROJE = { kod: "PRJ-SARMAL", ad: "Sarmal" };
const fikstureKayitlari = (dosya = "/sarmal/plan/fikirler.sar"): FikirKaydi[] =>
  fikirleriTopla(ayristir(belirtecle(FIKSTUR)).bildirimler)
    .map((fikir) => ({ proje: PROJE, dosya, fikir }));

// ── ① TOPLAYICI: yazılan Fikir gerçekten okunur ─────────────────────────────

test("fikir nöbeti: ayrışmış ağaçtan Fikir düğümleri toplanır ve kardeş tip toplanmaz", () => {
  const fikirler = fikirleriTopla(ayristir(belirtecle(FIKSTUR)).bildirimler);
  assert.ok(fikirler.length > 0, "fikstür hiç Fikir üretmedi; nöbet boş küme üstünde koşuyor demektir");
  assert.deepEqual(fikirler.map((f) => f.kod), ["FKR-KAPI", "FKR-EKSIK"],
    "toplayıcı ya bir Fikri kaçırdı ya da Hatırlatıcı kardeşini Fikir sandı");
  assert.equal(FIKIR_TIPI, "Fikir", "kanonik tip adı çizelgeden sapmış");
});

test("fikir nöbeti: sınıflamanın dört zorunlu alanı da kayba uğramadan taşınır", () => {
  const [tam] = fikirleriTopla(ayristir(belirtecle(FIKSTUR)).bildirimler);
  assert.equal(tam.kod, "FKR-KAPI");
  assert.equal(tam.ne, "Panel yüzeyi olmayan tipler için ortak bir kapı açmak");
  assert.equal(tam.durum, "park");
  assert.equal(tam.dönüşTetikleyici, "yüzey turu kapanınca");
  assert.equal(tam.satir, 1, "kaynak satırı 1-tabanlı taşınmalı (kardeş panelle aynı düzen)");
});

test("fikir nöbeti: yazılmamış alan UYDURULMAZ; boş dize olarak taşınır", () => {
  const eksik = fikirleriTopla(ayristir(belirtecle(FIKSTUR)).bildirimler)[1];
  assert.equal(eksik.kod, "FKR-EKSIK");
  assert.equal(eksik.ne, "", "yazılmamış amaç uydurulmuş");
  assert.equal(eksik.dönüşTetikleyici, "", "yazılmamış dönüş tetikleyicisi uydurulmuş");
});

// ── ② PANEL SATIRI: dönüş tetikleyicisi YÜZEYE çıkar ────────────────────────

test("fikir nöbeti: panel satırının gri açıklaması DÖNÜŞ TETİKLEYİCİSİNİ okutur — mutasyonla kanıtlı", () => {
  const [tam] = fikstureKayitlari();
  const g = fikirGorunumu(tam);
  assert.ok(g.aciklama.includes("yüzey turu kapanınca"),
    `fikir nöbeti: satırın açıklaması dönüş tetikleyicisini taşımıyor: "${g.aciklama}"`);

  // MUTASYON KANITI: tetikleyici değişince yüzeydeki cümle de değişmeli. Aynı
  // cümle iki farklı tetikleyici için basılıyorsa açıklama tetikleyiciyi
  // okumuyor demektir ve iddia sahte olur.
  const baska = fikirGorunumu({
    ...tam, fikir: { ...tam.fikir, dönüşTetikleyici: "kanon reformu bitince" },
  });
  assert.notEqual(baska.aciklama, g.aciklama,
    "fikir nöbeti: iki farklı tetikleyici aynı yüzey cümlesini üretti; açıklama tetikleyiciyi okumuyor");
  assert.ok(baska.aciklama.includes("kanon reformu bitince"));
});

test("fikir nöbeti: satırın etiketi fikrin AMACINI basar ve ipucu dört zorunlu alanı birden taşır", () => {
  const g = fikirGorunumu(fikstureKayitlari()[0]);
  // Etiket VIT-GRAF-A15 hükmünden sonra kodla başlar; amaç cümlesi kodun
  // ardından gelir ve hiçbir harfi düşmez. Founder'ın gerekçesi izlenebilirliktir:
  // olgunlaşan bir Fikir Karar'a yükselir ve terfi eden fikrin hangi kayıttan
  // doğduğu ancak kimliği baştan görünürse izlenebilir.
  assert.equal(g.etiket, "FKR-KAPI · Panel yüzeyi olmayan tipler için ortak bir kapı açmak",
    "fikir nöbeti: etiket ya kodunu ya da fikrin amacını basmıyor");
  for (const beklenen of ["FKR-KAPI", "park", "yüzey turu kapanınca", "Sarmal",
    "/sarmal/plan/fikirler.sar:1"]) {
    assert.ok(g.ipucu.includes(beklenen),
      `fikir nöbeti: ipucu "${beklenen}" bilgisini düşürmüş`);
  }
});

test("fikir nöbeti: eksik yazılmış Fikir görünmez olmaz; eksikliği yüzeyde SÖYLENİR", () => {
  const g = fikirGorunumu(fikstureKayitlari()[1]);
  assert.ok(g.etiket.includes("FKR-EKSIK"),
    "fikir nöbeti: amacı yazılmamış Fikir boş etiketle basılıyor ve panelde görünmez oluyor");
  assert.ok(g.aciklama.trim().length > 0,
    "fikir nöbeti: tetikleyicisiz Fikrin açıklama hanesi sessizce boş bırakılmış");
  assert.ok(/yazılmamış/.test(g.aciklama),
    `fikir nöbeti: eksik tetikleyici açıkça söylenmiyor: "${g.aciklama}"`);
});

test("fikir nöbeti: satır tıklaması kaynağın KENDİ satırını hedefler", () => {
  const g = fikirGorunumu(fikstureKayitlari()[0]);
  assert.equal(g.dosya, "/sarmal/plan/fikirler.sar");
  assert.equal(g.satir, 1,
    "fikir nöbeti: satır numarası sarmal.dosyaAc komutunun beklediği 1-tabanlı düzende değil");
});

test("fikir nöbeti: panelin kendi cümleleri katalogdan gelir ve kanonun hükmünü tekrar eder", () => {
  // VIT-GRAF-A16: bölüm başlığının metinleri emekli edildi ve öğrettikleri
  // panelin kendi boş durum cümlesine taşındı. Cümlenin taşıması gereken üç şey
  // şudur: Fikrin ne olduğu, dönüş tetikleyicisinin neyi söylediği ve olgunlaşan
  // bir Fikrin Karar'a yükseldiği.
  // Founder hükmü 2026-08-16: cümle kısa ve "siz" üslubundadır; ham sözdizimi
  // örneği ve tetikleyici ayrıntısı metinden düştü. Kalan iki zorunlu bilgi:
  // Fikrin ne olduğu ve olgunlaşan Fikrin Karar'a yükseldiği.
  const bos = YUZEY_BOS_DURUM.fikirler;
  assert.ok(bos.includes("Fikir"),
    "fikir nöbeti: boş durum cümlesi Fikrin ne olduğunu anlatmıyor");
  assert.ok(bos.includes("Karar"),
    "fikir nöbeti: boş durum cümlesi, olgunlaşan fikrin Karar'a yükseldiği kanonik hükmü anmıyor");
  assert.ok(YUZEY_ACIKLAMALARI.fikirler.trim().length > 0,
    "fikir nöbeti: panelin başlık altı açıklaması boş");
});

// ── ③ DEFTER: tek yayın · kapsam süzgeci · budama ───────────────────────────

test("fikir defteri: dosya başına yazar, boş liste dosyayı DÜŞÜRÜR ve panele tek liste basar", () => {
  const basilan: FikirKaydi[][] = [];
  const defter = new FikirDefteri((k) => basilan.push([...k]));
  const kayitlar = fikstureKayitlari();

  defter.yaz("/sarmal/bir.sar", kayitlar);
  assert.equal(defter.dosyaSayisi, 1);
  assert.equal(basilan.at(-1)!.length, kayitlar.length, "yazılan kayıtlar panele ulaşmadı");

  defter.yaz("/sarmal/bir.sar", []);
  assert.equal(defter.dosyaSayisi, 0, "boş liste dosyayı defterden düşürmedi");
  assert.deepEqual(basilan.at(-1), [], "dosya düşünce panel boşalmadı");
});

test("fikir defteri: toplu tur TEK yayın yapar — yayın ertelendiğinde çizim istenmez", () => {
  let yayin = 0;
  const defter = new FikirDefteri(() => { yayin += 1; });
  for (const dosya of ["/a.sar", "/b.sar", "/c.sar"]) {
    defter.yaz(dosya, fikstureKayitlari(dosya), false);
  }
  assert.equal(yayin, 0, "erteleme çalışmadı; her belge ayrı çizim tetikledi");
  defter.buda(new Set(["/a.sar", "/b.sar"]));
  defter.yayımla();
  assert.equal(yayin, 1, "tur sonunda tek yayın beklenirken başka sayı ölçüldü");
  assert.equal(defter.yayinSayisi, 1);
  assert.deepEqual([...new Set(defter.gorunenler().map((k) => k.dosya))], ["/a.sar", "/b.sar"],
    "budama bu turda görülmeyen dosyanın bayat kayıtlarını düşürmedi");
});

test("fikir defteri: kapsam süzgeci YALNIZ yayın anında uygulanır; kayıt defterde kalır", () => {
  const basilan: FikirKaydi[][] = [];
  const defter = new FikirDefteri((k) => basilan.push([...k]), (dosya) => dosya.startsWith("/sarmal/"));
  defter.yaz("/sarmal/bir.sar", fikstureKayitlari("/sarmal/bir.sar"), false);
  defter.yaz("/kapaliurun/iki.sar", fikstureKayitlari("/kapaliurun/iki.sar"));
  assert.equal(defter.dosyaSayisi, 2, "kapsam dışı dosya defterden silinmiş; süzgeç yayın sınırını aşmış");
  assert.deepEqual([...new Set(basilan.at(-1)!.map((k) => k.dosya))], ["/sarmal/bir.sar"],
    "kapsam dışı varlığın Fikirleri panele basıldı; iki yüzey çelişkili tablo gösterir");
});

test("fikir defteri: temizleme paneli boşaltır ve silme yalnız kendi dosyasına dokunur", () => {
  const basilan: FikirKaydi[][] = [];
  const defter = new FikirDefteri((k) => basilan.push([...k]));
  defter.yaz("/a.sar", fikstureKayitlari("/a.sar"), false);
  defter.yaz("/b.sar", fikstureKayitlari("/b.sar"), false);
  assert.equal(defter.sil("/a.sar"), true);
  assert.deepEqual([...new Set(basilan.at(-1)!.map((k) => k.dosya))], ["/b.sar"]);
  assert.equal(defter.sil("/yok.sar"), false, "defterde olmayan dosya silinmiş sayıldı");
  defter.temizle();
  assert.deepEqual(basilan.at(-1), []);
});

test("fikir nöbeti: parmak izi panelin BASTIĞI her alanı kapsar — sessiz değişiklik kalmaz", () => {
  const [tam] = fikstureKayitlari();
  const iz = fikirParmakIzi([tam]);
  assert.equal(iz, fikirParmakIzi([{ ...tam }]), "aynı içerik farklı iz üretti; panel boşuna çizilir");
  for (const mutant of [
    { ...tam.fikir, ne: "başka amaç" },
    { ...tam.fikir, durum: "başka durum" },
    { ...tam.fikir, dönüşTetikleyici: "başka tetikleyici" },
    { ...tam.fikir, kod: "FKR-BASKA" },
    { ...tam.fikir, satir: 99 },
  ]) {
    assert.notEqual(fikirParmakIzi([{ ...tam, fikir: mutant }]), iz,
      "parmak izi bir alanı görmüyor; o alandaki değişiklik ekrana hiç ulaşmaz");
  }
});

// ── ④ ARAYÜZ İŞARETLERİ: vektörel aile · emoji yok ──────────────────────────

test("fikir nöbeti: kayıt satırının işareti satır ÇİZELGESİNDEN okunur ve vektöreldir", () => {
  // VIT-GRAF-A16: bölüm başlığı ortadan kalktı ve panelde tek bir satır türü
  // kaldı; işaret o yüzden artık yeni panelin kaynağında ilan edilir.
  const kaynak = oku("../src/fikirler.ts");
  const kayit = (/const KAYIT_SIMGESI: SatirSimgesi = "([a-z-]+)"/.exec(kaynak)?.[1] ?? "").trim();
  assert.ok(kayit, "fikir nöbeti: kayıt işareti kaynakta çizelge adıyla ilan edilmemiş");
  assert.ok((SATIR_SIMGELERI as readonly string[]).includes(kayit),
    `fikir nöbeti: "${kayit}" satır çizelgesinde yok; uydurma bir işaret basılıyor`);
  assert.ok(oku(`../${satirSvgKaynagi(kayit as SatirSimgesi)}`).includes('stroke="currentColor"'),
    "fikir nöbeti: kayıt simgesi vektörel ailenin currentColor konturunu taşımıyor");
  // Panel hazır bir codicon kimliğine geri düşmez (VIT-KIMLIK-A05).
  assert.ok(!/ThemeIcon\(/.test(kaynak),
    "fikir nöbeti: panel hazır ikon kimliğine geri düşmüş; işaretler geometrik aileden gelir");
});

test("fikir nöbeti: Fikir yüzeyinin hiçbir kullanıcı metni EMOJİ taşımaz (Founder hükmü)", () => {
  // Founder hükmü: arayüzdeki her düğme ve simge vektörel aileden gelir. Ölçü
  // kaynak dosyanın tamamına değil, KULLANICIYA GİDEN cümlelere uygulanır —
  // dosya başlıklarındaki yorum emojileri arayüzde hiç görünmez.
  const [tam] = fikstureKayitlari();
  const g = fikirGorunumu(tam);
  const emoji = /\p{Extended_Pictographic}/u;
  for (const [ad, metin] of Object.entries({
    etiket: g.etiket, aciklama: g.aciklama, ipucu: g.ipucu,
    panelAciklamasi: YUZEY_ACIKLAMALARI.fikirler, bosDurum: YUZEY_BOS_DURUM.fikirler,
  })) {
    assert.equal(emoji.exec(metin), null,
      `fikir nöbeti: "${ad}" metni emoji taşıyor; arayüz işaretleri yalnız vektörel aileden gelir`);
  }
});

test("fikir nöbeti: saf çekirdek editör kabuğu İSTEMEZ ve ikinci bir tazeleme ritmi kurmaz", () => {
  const kaynak = oku("../src/fikir-cekirdek.ts");
  assert.ok(!/from "vscode"/.test(kaynak),
    "fikir nöbeti: saf çekirdek vscode'a bağlanmış; nöbet gerçek davranışı koşturamaz hâle gelir");
  for (const yasak of ["setInterval", "setTimeout", "createFileSystemWatcher", "findFiles",
    "openTextDocument", "readFile"]) {
    assert.ok(!kaynak.includes(yasak),
      `fikir nöbeti: Fikir hanesi ikinci bir veri yolu ya da tazeleme ritmi kuruyor: ${yasak}`);
  }
});

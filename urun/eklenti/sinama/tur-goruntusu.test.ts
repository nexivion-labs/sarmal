// ═══════════════════════════════════════════════════════════════════════════
// tur-goruntusu.test.ts — 🗺️ TURUN GÖRÜNTÜSÜ VE TEK YAYINI NÖBETİ (PRF-TA-A02)
//
//   Bu nöbetin koruduğu hüküm iki cümledir: TUR BAŞINA TEK GÖRÜNTÜ YAYINI VARDIR
//   ve YAYINLANAN KAYIT TURUN KENDİ AĞACIDIR. Ölçülen kusur (2026-08-30 · OZK-12)
//   şudur: denetim turu bütün dosyaları zaten ayrıştırdığı hâlde sonucu kimseye
//   vermiyordu ve yol haritası paneli aynı işi kendi başına yeniden yapıyordu;
//   kanalda panel turu yirmi bin dokuz milisaniyeydi.
//
//   Ölçüm iki cinstendir ve ikisi de açıkça söylenir. DAVRANIŞ ölçümü yayın
//   mekanizmasını gerçekten koşturur: sayaç, tur başına kaç yayın düştüğünü
//   sayar, dolayısıyla "tek yayın" bir temenni değil sayılmış bir olgudur.
//   KAYNAK ölçümü ise kabuğun o mekanizmayı çağırdığını ölçer; saf mekanizmanın
//   doğru olması kabuğun onu tek noktadan çağırdığını kanıtlamaz ve tek satırlık
//   bir geri alma ikinci bir bildirim yolunu geri getirir (tur-erisim.test.ts
//   kaynak nöbeti deseni).
//
//   Altı güvence:
//     ① TEK YAYIN — bir tur bir yayın düşürür; sıra numarası tur başına bir artar
//        ve abone tur başına bir kez çağrılır.
//     ② İÇERİK — yayınlanan kayıt turun KENDİ program haritasını ve KENDİ yol
//        kümesini taşır; yeniden hesaplanmış ya da kopyalanmış bir ikiz değildir.
//     ③ AYRIM — söz dizimi kırık dosya `kirik` listesine, okunamayan dosya
//        `okunamayan` sayısına düşer ve iki küme kesişmez; okunamayan dosya
//        ayrıştırmaya hiç girmediği için kırık sayılamaz.
//     ④ DARALTMA — daraltılmış turda görüntünün program haritası tam turdakiyle
//        aynıdır; `kapsam` yalnız etikettir ve hiçbir şeyi süzmez.
//     ⑤ KAYNAK — kabukta yayın TEKTİR, mevsim çevriminden sonra gelir ve onay
//        tarayıcısı kendini o yayından besler; ikinci bir bildirim yolu yoktur.
//     ⑥ DAYANIKLILIK — çöken bir abone turu düşürmez; çöküş sessiz de değildir,
//        sayaca düşer.
//
//   Saf modül kabuksuz sınanır (tur-belgesi.test.ts sahte kabuk deseni); nöbet
//   turun omurgasını üretimdeki sırayla koşturur, çünkü görüntünün doğruluğu
//   ancak onu üreten zincirin üstünde ölçülebilir.
//   Koşum: cd eklenti && npm test
// ═══════════════════════════════════════════════════════════════════════════

// Yüzey dili kapısını bu dosya kendi kurar: `npm test` ön-yüklemesi olmadan tek
// başına koşturulduğunda sahte kırmızı vermesin (ön-yükleme ile aynı bağ, ESM
// önbelleği yüzünden iki kez koşmaz).
import "./dil-kur.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type * as vscode from "vscode";
import type { Program } from "../../cekirdek/src/sozdizim.ts";
import { belirtecle } from "../../cekirdek/src/belirtec.ts";
import { ayristir } from "../../cekirdek/src/ayristirici.ts";
import { type BelgeKabugu, diskBelgesi, turBelgeleriniTopla, turProgramlariniKur } from "../src/tur-belgesi.ts";
import { turKapsami } from "../src/izleyici-cekirdek.ts";
import {
  sonTurGoruntusu, turGoruntusuOlcumleri, turGoruntusunuDinle, turGoruntusunuUnut,
  turGoruntusunuYayinla, type TurGoruntusu,
} from "../src/tur-goruntusu.ts";

/** Sahte kimlik — gerçek `Uri` yerine yalnız yol taşır; modül vscode çağırmaz. */
const uriYap = (fsPath: string): vscode.Uri => ({ fsPath } as unknown as vscode.Uri);

const KÖK = "/ws/depo";
const ODAK = `${KÖK}/varlik`;

/** Açık belgenin sahte kaydı: metni ile dili taşır, kabuk onu I/O'suz verir. */
interface AçıkKayıt { readonly metin: string; readonly dil?: string }

/**
 * Sahte kabuk. Açık belgeler bellekten gelir, disk kayıtları haritadan okunur ve
 * haritada olmayan yol OKUNAMAZ; hiçbir üye belge AÇMAZ (tur-belgesi.test.ts
 * sözleşmesi).
 */
function kabukYap(açık: Record<string, AçıkKayıt>, disk: Record<string, string>): BelgeKabugu {
  return {
    açıkBelge: (yol) => (yol in açık ? diskBelgesi(uriYap(yol), açık[yol]!.metin) : undefined),
    dilKimliği: (yol) => (yol in açık ? (açık[yol]!.dil ?? "sarmal") : undefined),
    oku: async (yol) => (yol in disk
      ? { belge: diskBelgesi(uriYap(yol), disk[yol]!), bayt: Buffer.byteLength(disk[yol]!, "utf8") }
      : undefined),
  };
}

/** Paylaşılan önbelleğin sahtesi: açık belgenin metnini ayrıştırır, kırıkta susar. */
function önbellekten(açık: AçıkKayıt): Program | undefined {
  try { return ayristir(belirtecle(açık.metin)); }
  catch { return undefined; }
}

/**
 * Turun omurgası — kabuğun (eklenti.ts `denetleHepsi`) çağırdığı sırayla: belgeler
 * toplanır, program haritası kurulur, görüntü tek noktadan yayınlanır. Nöbet
 * zinciri kendisi kurar, çünkü görüntünün doğruluğu ancak onu üreten zincirin
 * üstünde ölçülebilir; zincirin kabukta bu sırayla durduğu ⑤ ile ölçülür.
 */
async function turKoş(o: {
  yollar: readonly string[];
  açık?: Record<string, AçıkKayıt>;
  disk?: Record<string, string>;
  tetik: string;
  kapsam: string | undefined;
}): Promise<{ goruntu: TurGoruntusu; programlar: ReadonlyMap<string, Program> }> {
  const açık = o.açık ?? {};
  const { belgeler, dilDışı } = await turBelgeleriniTopla(o.yollar, kabukYap(açık, o.disk ?? {}));
  const açıkBelgeler = new Map<string, AçıkKayıt>(Object.entries(açık));
  const programlar = turProgramlariniKur(belgeler, açıkBelgeler, önbellekten);
  const goruntu = turGoruntusunuYayinla({
    programlar, yollar: o.yollar, belgeler, dilDışı, tetik: o.tetik, kapsam: o.kapsam,
  });
  return { goruntu, programlar };
}

// ── ① TEK YAYIN: TUR BAŞINA BİR KAYIT ────────────────────────────────────────

test("YAYIN: tur başına tek yayın düşer; sıra bir artar ve abone bir kez çağrılır", async () => {
  turGoruntusunuUnut();
  const alınanlar: TurGoruntusu[] = [];
  const bırak = turGoruntusunuDinle((g) => { alınanlar.push(g); });
  try {
    const disk = { [`${KÖK}/a.sar`]: "Faz( kod: A )", [`${KÖK}/b.sar`]: "Faz( kod: B )" };
    const yollar = Object.keys(disk);

    const birinci = await turKoş({ yollar, disk, tetik: "başlangıç", kapsam: undefined });
    assert.equal(turGoruntusuOlcumleri().yayın, 1,
      "bir tur birden fazla ya da hiç yayın düşürdü; tüketiciler turu iki kez çizer ya da hiç görmez");
    assert.equal(birinci.goruntu.sıra, 1, "ilk turun sıra numarası birden başlamadı");
    assert.equal(alınanlar.length, 1, "abone tur başına bir kez çağrılmadı");
    assert.equal(alınanlar[0], birinci.goruntu, "abonenin aldığı kayıt yayınlanan kayıt değil");

    const ikinci = await turKoş({ yollar, disk, tetik: "sar-olayı", kapsam: undefined });
    assert.equal(turGoruntusuOlcumleri().yayın, 2, "ikinci tur yayın sayacını bir artırmadı");
    assert.equal(ikinci.goruntu.sıra, 2, "sıra numarası tur başına bir artmıyor; tek yayın ölçülemez");
    assert.equal(alınanlar.length, 2, "abone ikinci turda bir kezden fazla ya da hiç çağrılmadı");
    assert.equal(sonTurGoruntusu(), ikinci.goruntu,
      "son görüntü ikinci turun kaydı değil; geç gelen tüketici bayat kayıt okur");
  } finally { bırak(); }
});

test("YAYIN: abonelik bırakıldığında bildirim durur; bırakılmış abone turu görmez", async () => {
  turGoruntusunuUnut();
  let sayı = 0;
  const bırak = turGoruntusunuDinle(() => { sayı += 1; });
  const disk = { [`${KÖK}/a.sar`]: "Faz( kod: A )" };
  await turKoş({ yollar: Object.keys(disk), disk, tetik: "başlangıç", kapsam: undefined });
  bırak();
  await turKoş({ yollar: Object.keys(disk), disk, tetik: "sar-olayı", kapsam: undefined });
  assert.equal(sayı, 1, "bırakılan abonelik bildirim almaya devam ediyor; ölen yüzey turu tutar");
  assert.equal(turGoruntusuOlcumleri().yayın, 2, "abone kalmayınca yayın sayılmıyor");
});

// ── ② İÇERİK: KAYIT TURUN KENDİ AĞACIDIR ─────────────────────────────────────

test("İÇERİK: yayınlanan kayıt turun KENDİ program haritasını ve yol kümesini taşır", async () => {
  turGoruntusunuUnut();
  const açık = { [`${KÖK}/acik.sar`]: { metin: "Faz( kod: ACIK )" } };
  const disk = { [`${KÖK}/disk.sar`]: "Faz( kod: DISK )" };
  const yollar = [...Object.keys(açık), ...Object.keys(disk)];

  const { goruntu, programlar } = await turKoş({ yollar, açık, disk, tetik: "başlangıç", kapsam: undefined });

  // Kimlik ölçülür, eşitlik değil: kopyalanmış bir harita bir sonraki turda
  // bayatlayan ikinci bir gerçektir ve tüketici onu turun ağacı sanır.
  assert.equal(goruntu.programlar, programlar,
    "kayıt turun haritasını değil onun bir kopyasını ya da yeniden kurulmuş hâlini taşıyor");
  assert.equal(goruntu.yollar, yollar, "kayıt turun taradığı yol kümesini taşımıyor");
  assert.deepEqual([...goruntu.programlar.keys()].sort(), yollar.slice().sort(),
    "açık belge ile disk kaydı aynı haritada buluşmadı");
  assert.equal(goruntu.tetik, "başlangıç", "turu başlatan olayın adı kayda geçmedi");
  assert.equal(goruntu.kapsam, undefined, "tam tur kapsam etiketi taşıyor");
  // Kayıt donmuştur: tüketici alanları yeniden yazamaz, çünkü yazılan alan
  // ikinci bir gerçek doğurur ve sonraki tüketici onu turun sonucu sanar.
  assert.ok(Object.isFrozen(goruntu), "kayıt donmamış; tüketici alanlarını yeniden yazabilir");
});

// ── ③ AYRIM: KIRIK İLE OKUNAMAYAN KESİŞMEZ ───────────────────────────────────

test("AYRIM: söz dizimi kırık dosya kirik listesine, okunamayan dosya sayıya, dili sarmal olmayan açık belge dil dışı listesine düşer ve kesişmezler", async () => {
  turGoruntusunuUnut();
  const kırıkYol = `${KÖK}/kirik.sar`;
  const okunamayanYol = `${KÖK}/silinmis.sar`;
  const sarmalDışıYol = `${KÖK}/baska.sar`;
  const sağlamYol = `${KÖK}/saglam.sar`;
  const açık = { [sarmalDışıYol]: { metin: "Faz( kod: X )", dil: "markdown" } };
  const disk = { [kırıkYol]: "Faz( kod: ", [sağlamYol]: "Faz( kod: SAGLAM )" };
  const yollar = [kırıkYol, okunamayanYol, sarmalDışıYol, sağlamYol];

  const { goruntu } = await turKoş({ yollar, açık, disk, tetik: "sar-olayı", kapsam: undefined });

  assert.deepEqual(goruntu.kirik, [kırıkYol],
    "kırık listesi yalnız okunup ayrıştırılamayan dosyayı taşımıyor");
  // Denetçi bulgusu (PRF-TA-A02 ikinci tur): dili elle değiştirilmiş açık belge
  // OKUNABİLİR bir dosyadır; A01 sözleşmesi okunamayanı "diskten okunamayıp
  // atlanan" diye tanımlar. Bu yüzden ikisi ayrı kümedir ve toplam dört kümeye bölünür.
  assert.equal(goruntu.okunamayan, 1,
    "okunamayan sayısı yalnız gerçek okuma başarısızlığını saymıyor; dili sarmal olmayan açık belge buraya karışmış");
  assert.deepEqual(goruntu.dilDışı, [sarmalDışıYol],
    "dili sarmal olmayan açık belge dil dışı listesinde yalnız kendisi olarak durmuyor");
  // Kesişmeler yapısal olarak boştur: okunamayan ya da dil dışı dosya belge
  // haritasına hiç girmez ve dolayısıyla kırık listesine de giremez. Bir
  // dosyanın iki kümede sayılması panelde iki ayrı damga demektir.
  for (const yol of [okunamayanYol, sarmalDışıYol]) {
    assert.ok(!goruntu.kirik.includes(yol),
      `belge toplamada düşen dosya kırık sayıldı (${yol}); iki küme aynı kaynaktan türetilmiş`);
  }
  assert.ok(!goruntu.dilDışı.includes(okunamayanYol), "okunamayan dosya dil dışı sayıldı");
  assert.ok(!goruntu.programlar.has(kırıkYol), "kırık dosya program haritasına girdi");
  assert.ok(goruntu.programlar.has(sağlamYol), "kırık komşu sağlam dosyayı haritadan düşürdü");
  assert.equal(goruntu.kirik.length + goruntu.okunamayan + goruntu.dilDışı.length + goruntu.programlar.size, yollar.length,
    "taranan yolların toplamı dört kümeye bölünmüyor; bir dosya iki kez ya da hiç sayılmış");
});

// ── ④ DARALTMA: DAR TUR GÖRÜNTÜYÜ KÜÇÜLTMEZ ──────────────────────────────────

test("DARALTMA: daraltılmış turda görüntünün program haritası tam turla AYNIDIR", async () => {
  turGoruntusunuUnut();
  // Kapsam gerçek kuraldan gelir (izleyici-cekirdek.turKapsami): olay tetiği
  // odağa daralır, açılış tetiği tam koşar. Daraltma yalnız çapraz denetimin
  // köklerini seçer; belge toplama ile ayrıştırma her turda bütün yollar
  // üzerinde koşar, dolayısıyla görüntü küçülmez (PRF-TA-A01 sözleşmesi).
  const tamKapsam = turKapsami("başlangıç", ODAK, true, [KÖK]);
  const darKapsam = turKapsami("sar-olayı", ODAK, true, [KÖK]);
  assert.equal(tamKapsam, undefined, "açılış turu daraltıldı; nöbetin iki ucu aynı oldu");
  assert.equal(darKapsam, ODAK, "olay turu daralmadı; nöbetin iki ucu aynı oldu");

  const disk = {
    [`${ODAK}/plan/a.sar`]: "Faz( kod: A )",
    [`${KÖK}/baska/b.sar`]: "Faz( kod: B )",   // odağın DIŞINDA kalan dosya
    [`${KÖK}/c.sar`]: "Faz( kod: C )",
  };
  const yollar = Object.keys(disk);

  const tam = await turKoş({ yollar, disk, tetik: "başlangıç", kapsam: tamKapsam });
  const dar = await turKoş({ yollar, disk, tetik: "sar-olayı", kapsam: darKapsam });

  assert.equal(dar.goruntu.programlar.size, tam.goruntu.programlar.size,
    "dar turda görüntü küçüldü; panel odağın dışındaki dosyaları kaybeder ve onlara sahte kırık damgası basar");
  assert.deepEqual([...dar.goruntu.programlar.keys()].sort(), [...tam.goruntu.programlar.keys()].sort(),
    "dar turun program haritası tam turdakinden başka dosyalar taşıyor");
  assert.deepEqual(dar.goruntu.yollar, tam.goruntu.yollar, "dar turda taranan yol kümesi daraldı");
  assert.equal(dar.goruntu.kapsam, ODAK,
    "dar turun kapsam etiketi kayda geçmedi; tüketici turun hangi kökle daraldığını okuyamaz");
});

// ── ⑥ DAYANIKLILIK: ÇÖKEN ABONE TURU DÜŞÜRMEZ ────────────────────────────────

test("DAYANIKLILIK: çöken abone turu düşürmez, diğer aboneyi engellemez ve çöküş sayılır", async () => {
  turGoruntusunuUnut();
  let sağlamÇağrı = 0;
  const bırakÇöken = turGoruntusunuDinle(() => { throw new Error("çizim çöktü"); });
  const bırakSağlam = turGoruntusunuDinle(() => { sağlamÇağrı += 1; });
  try {
    const disk = { [`${KÖK}/a.sar`]: "Faz( kod: A )" };
    await assert.doesNotReject(
      turKoş({ yollar: Object.keys(disk), disk, tetik: "başlangıç", kapsam: undefined }),
      "bir tüketicinin çöküşü bütün turu düşürdü; mercek satırı ve kilit çevrimi iptal olur");
    assert.equal(sağlamÇağrı, 1, "çöken abone kendisinden sonraki aboneyi engelledi");
    const ölçüm = turGoruntusuOlcumleri();
    assert.equal(ölçüm.dinleyiciHatası, 1, "abone çöküşü sessizce yutuldu; sayaçta izi yok");
    assert.equal(ölçüm.dinleyiciÇağrısı, 2, "abone çağrıları sayılmıyor");
  } finally { bırakÇöken(); bırakSağlam(); }
});

// ── ⑤ KAYNAK: KABUK TEK NOKTADAN YAYINLAR ────────────────────────────────────
//
//   Saf mekanizmanın doğruluğu kabuğun onu tek noktadan çağırdığını kanıtlamaz;
//   tek satırlık bir geri alma ikinci bir bildirim yolunu geri getirir ve
//   yukarıdaki beş nöbet bunu görmez.

const EKLENTI_KAYNAK = readFileSync(fileURLToPath(new URL("../src/eklenti.ts", import.meta.url)), "utf8");
const TARAYICI_KAYNAK = readFileSync(fileURLToPath(new URL("../src/onay-tarayici.ts", import.meta.url)), "utf8");

/** `denetleHepsi` gövdesi (tur-belgesi.test.ts dilim deseni). */
function denetleHepsiGövdesi(): string {
  const baş = EKLENTI_KAYNAK.indexOf("const denetleHepsi");
  const son = EKLENTI_KAYNAK.indexOf("const denetimKilidi", baş);
  assert.ok(baş >= 0 && son > baş, "denetleHepsi gövdesi bulunamadı; nöbet boşlukta ölçüm yapamaz");
  return EKLENTI_KAYNAK.slice(baş, son);
}

test("KAYNAK: kabukta yayın TEKTİR, turun kendi ağacını taşır ve mevsim çevriminden sonra gelir", () => {
  const gövde = denetleHepsiGövdesi();
  assert.equal((EKLENTI_KAYNAK.match(/turGoruntusunuYayinla\s*\(/g) ?? []).length, 1,
    "kabukta birden fazla ya da hiç yayın çağrısı var; tur başına tek görüntü iddiası kaynakta bozuk");
  const yayınBaşı = gövde.indexOf("turGoruntusunuYayinla(");
  assert.ok(yayınBaşı >= 0, "yayın çağrısı denetleHepsi gövdesinde değil; turun dışında bir yayın vardır");
  const çağrı = gövde.slice(yayınBaşı, gövde.indexOf("\n", yayınBaşı));
  // Kayıt turun KENDİ değişkenlerini alır: süzülmüş yol listesi, toplanan belgeler
  // ve program haritası. Başka bir liste verilirse görüntü turun ağacı olmaktan çıkar.
  // `dilDışı,` kısaltma yazımıyla aranır: alan belge toplamanın döndürdüğü listeden
  // gelmelidir; boş bir sabit (`dilDışı: []`) alanı taşır ama gerçeği taşımaz.
  for (const alan of ["programlar", "yollar", "belgeler: doclar", "dilDışı,", "tetik", "kapsam: darKok"]) {
    assert.ok(çağrı.includes(alan), `yayın çağrısı turun kendi kaydını taşımıyor (${alan} eksik)`);
  }
  // Mevsim çevrimi yayından ÖNCE koşar; sonra koşsaydı tüketiciye çevrimsiz ağaç
  // giderdi ve panel fazsız blok damgası basardı (MIM-1.2 ③).
  const çevrim = gövde.indexOf("mevsimNormalize(");
  assert.ok(çevrim >= 0 && çevrim < yayınBaşı,
    "mevsim çevrimi yayından sonra koşuyor ya da hiç koşmuyor; tüketici çevrimsiz ağaç alır");
});

test("KAYNAK: onay tarayıcısı kendini turun yayınından besler; ikinci bir bildirim yolu yoktur", () => {
  assert.equal((TARAYICI_KAYNAK.match(/turGoruntusunuDinle\s*\(/g) ?? []).length, 1,
    "tarayıcı yayına ya hiç abone değil ya da birden fazla abonelik kurdu");
  assert.ok(!/export\s+function\s+anaGoruntuyuBildir/.test(TARAYICI_KAYNAK),
    "görüntü bildirimi dışa açık; turun tek yayınının yanında ikinci bir besleme kapısı yaşıyor");
  assert.equal((EKLENTI_KAYNAK.match(/anaGoruntuyuBildir\s*\(/g) ?? []).length, 0,
    "kabuk tarayıcıyı doğrudan besliyor; aynı ağaç iki yoldan iletiliyor");
  // Hattın SUSUŞU görüntüsüz bir olaydır ve kendi kapısından bildirilir; onu da
  // yayına bağlamak, gönderilecek bir kayıt olmadığı hâlde kayıt istemek olurdu.
  // PRF-TA-A03 ikinci tur (denetçi bulgusu): denetim kapalıyken hat SUSMAZ, tur
  // görüntüsünü yine yayınlar ve yalnız tanı üretmez; susuş bildirimi kalktı.
  assert.equal((EKLENTI_KAYNAK.match(/anaHattiSustur\s*\(/g) ?? []).length, 0,
    "kabuk hâlâ hat susuşu bildiriyor; kapalı denetimde görüntü yayınlanmalı, onay yüzeyi ve yol haritası boş kalmamalı");
});

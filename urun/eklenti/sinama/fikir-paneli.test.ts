// ═══════════════════════════════════════════════════════════════════════════
// fikir-paneli.test.ts — 💡 FİKİRLER PANELİ NÖBETİ (VIT-GRAF-A16)
//
//   ÖLÇÜLEN KUSUR. Fikir hanesi bir ara turda Hatırlatıcılar panelinin içinde bir
//   bölüm olarak açılmıştı. Founder 2026-08-08 tarihinde Fikirlerin kendi
//   panelini hak ettiğine hükmetti; gerekçesi Fikrin kendi başına bir düşünce
//   evresi olması ve başka bir tipin penceresine misafir edilmemesidir. Hükmün
//   doğruluğu 2026-08-09 tarihinde canlı görünümde ayrıca ölçüldü: canlı rafa
//   yazılan iki gerçek Fikir panelde bulunamadı, çünkü ikisi de yirmi dokuz
//   hatırlatıcı kaydının altında kalmıştı.
//
//   NÖBETİN İKİ İŞİ VARDIR. Birincisi taşınmanın GERÇEKTEN olduğunu ölçmektir:
//   panel kendi görünüş kimliğiyle kenar çubuğunda yaşar, kendi simgesini ve
//   kendi boş durum cümlesini taşır. İkincisi ve asıl işi, sökülen bölümün geri
//   DOĞMADIĞINI ölçmektir; bu yüzden bölümün izlerini arayan denetim saf bir
//   işlev olarak yazıldı ve mutasyon kaynakları üzerinde ayrıca koşturuldu.
//   Böylece nöbetin kendisi de ölçülür: bölümü geri getiren bir yazım denetimi
//   geçemiyorsa iddia sahte değildir.
//
//   BESLENME YOLU BU ADIMDA DEĞİŞMEDİ ve nöbet onu da korur: kayıtlar yine
//   paylaşılan ayrıştırma önbelleğinden okunur, dosya başına deftere yazılır,
//   kapsam süzgeci yüzey defteriyle aynı kalır ve tur sonunda tek yayın yapılır.
//   İkinci bir tarama ya da ikinci bir sayaç kurulmadığı mekanik olarak ölçülür.
// ═══════════════════════════════════════════════════════════════════════════
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  GORUNUS_FIKIRLER, GORUNUS_HATIRLATICILAR, GORUNUS_BILDIRIMLER,
  DURUM_CUBUGU_GIRDILERI,
} from "../src/yuzey-cekirdek.ts";
import { PANEL_GORUNUSLERI, panelSvgKaynagi } from "../src/simge-cizelgesi.ts";
import { YUZEY_ACIKLAMALARI, YUZEY_BOS_DURUM, DURUM_CUBUGU_METINLERI } from "../src/yuzey-metinleri.ts";

const oku = (u: string): string => readFileSync(fileURLToPath(new URL(u, import.meta.url)), "utf8");

const PAKET = JSON.parse(oku("../package.json")) as {
  version: string;
  contributes: {
    views: Record<string, Array<{ id: string; name: string; icon?: string; contextualTitle?: string }>>;
    menus: Record<string, Array<{ command: string; when?: string; group?: string }>>;
  };
};
const PAKET_NLS_TR = JSON.parse(oku("../package.nls.tr.json")) as Record<string, string>;
const PAKET_NLS_EN = JSON.parse(oku("../package.nls.json")) as Record<string, string>;
const yerellestir = (deger: string): string => {
  const anahtar = /^%([^%]+)%$/.exec(deger)?.[1];
  return anahtar ? PAKET_NLS_TR[anahtar] : deger;
};

const GORUNUSLER = PAKET.contributes.views["sarmal-yol"];
const FIKIRLER_KAYNAK = oku("../src/fikirler.ts");
const HATIRLATICILAR_KAYNAK = oku("../src/hatirlaticilar.ts");
const EKLENTI_KAYNAK = oku("../src/eklenti.ts");

// ── ① PANEL KENDİ KİMLİĞİYLE KENAR ÇUBUĞUNDA YAŞAR ──────────────────────────

test("fikir paneli: görünüş kendi kimliğiyle paket bildirimine inmiştir ve kimlik tekildir", () => {
  assert.equal(GORUNUS_FIKIRLER, "sarmalFikirler",
    "Fikirler görünüşünün kanonik kimliği değişmiş; kullanıcının panel yerleşimi sessizce sıfırlanır");
  const kimlikler = GORUNUSLER.map((g) => g.id);
  assert.ok(kimlikler.includes(GORUNUS_FIKIRLER),
    `paket bildiriminde "${GORUNUS_FIKIRLER}" görünüşü yok; panel kenar çubuğunda hiç doğmaz`);
  assert.equal(new Set(kimlikler).size, kimlikler.length,
    `yinelenen görünüş kimliği var: ${kimlikler.join(" · ")}`);
  // Kimlik sağlayıcıda da TEK kaynaktan okunur; panel dizeyi kendi içine gömmez.
  assert.ok(FIKIRLER_KAYNAK.includes("GORUNUS_FIKIRLER"),
    "panel görünüş kimliğini saf çekirdekteki sabitten okumuyor; iki kimlik zamanla ayrışır");
  assert.ok(!/createTreeView<PanelOge>\("/.test(FIKIRLER_KAYNAK),
    "panel görünüş kimliğini kaynağına gömmüş; paket bildirimiyle eşitlik ölçülemez hâle gelir");
});

test("fikir paneli: başlığı yerelleştirme kataloğundan gelir ve kapsayıcının adını TEKRAR ETMEZ", () => {
  const fikirler = GORUNUSLER.find((g) => g.id === GORUNUS_FIKIRLER)!;
  assert.equal(yerellestir(fikirler.name), "Fikirler");
  assert.equal(yerellestir(fikirler.contextualTitle!), "Fikirler");
  assert.equal(PAKET_NLS_EN["view.ideas"], "Ideas",
    "İngilizce katalogda görünüş adı yok; iki dilden biri anahtarı çıplak basar");
  const kapsayiciAdi = PAKET_NLS_TR["view.container"];
  assert.ok(!yerellestir(fikirler.name).includes(kapsayiciAdi),
    "görünüş adı kapsayıcının adını tekrar ediyor");
});

test("fikir paneli: kendi panel simgesini taşır ve hiçbir kardeşininkini kullanmaz", () => {
  assert.ok((PANEL_GORUNUSLERI as readonly string[]).includes(GORUNUS_FIKIRLER),
    "panel çizelgesi yeni görünüşü tanımıyor; simge yolu tek kaynaktan gelmiyor demektir");
  const fikirler = GORUNUSLER.find((g) => g.id === GORUNUS_FIKIRLER)!;
  assert.equal(fikirler.icon, panelSvgKaynagi("sarmalFikirler"),
    "paket bildirimi çizelgenin söylediği simgeden sapmış");
  const simgeler = GORUNUSLER.map((g) => g.icon);
  assert.equal(new Set(simgeler).size, simgeler.length,
    `görünüşler aynı simgeyi paylaşıyor: ${simgeler.join(" · ")}`);
  // İçerik de karşılaştırılır: iki AYRI dosya aynı çizimi taşırsa kusur ad
  // değiştirip geri gelir (Founder 2026-07-28 bulgusu).
  const cizim = oku(`../${panelSvgKaynagi("sarmalFikirler")}`);
  for (const kardes of PANEL_GORUNUSLERI.filter((g) => g !== "sarmalFikirler")) {
    assert.notEqual(cizim, oku(`../${panelSvgKaynagi(kardes)}`),
      `Fikirler paneli ${kardes} panelinin çizimini taşıyor; ikisi bakışta ayrılmaz`);
  }
  assert.ok(!/#[0-9A-Fa-f]{3,8}\b/.test(cizim),
    "panel simgesine ham renk gömülmüş; renk temadan gelir (YUZ-4.1)");
});

// ── ② HATIRLATICILAR PANELİNDE FİKİR BÖLÜMÜ BİR DAHA DOĞMAZ ─────────────────

/**
 * Bir panel kaynağında Fikir bölümünün izlerini arar. Denetim SAF bir işlevdir
 * ki hem gerçek kaynağın üstünde hem de mutasyon kaynaklarının üstünde
 * koşturulabilsin; nöbetin kendi körlüğü ancak böyle ölçülür.
 *
 * Aranan izler bölümün gerçekten yaşayabilmesi için gereken parçalardır: kök
 * düğüm türü, panele Fikir basan kapı, saf çekirdeğe kurulan bağ, hanenin kendi
 * sayacı ve satır tarifinin çağrısı. Biri bile geri gelirse bölüm de geri gelmiş
 * demektir.
 */
function fikirBolumuIzleri(kaynak: string): string[] {
  const izler: Array<[string, RegExp]> = [
    ["fikirBölümü kök türü", /fikirBölümü/],
    ["Fikir kök düğümü", /tur: "fikir"/],
    ["fikirleriYerlestir kapısı", /fikirleriYerlestir/],
    ["fikirSayisi okuyucusu", /fikirSayisi/],
    ["saf çekirdeğe kurulan bağ", /fikir-cekirdek/],
    ["satır tarifinin çağrısı", /fikirGorunumu\(/],
    ["bölüm başlığı metni", /fikirBolum(Basligi|Aciklamasi|Ipucu)/],
    ["Fikir simgesi ilanı", /FIKIR_(BOLUM|KAYIT)_SIMGESI/],
  ];
  return izler.filter(([, desen]) => desen.test(kaynak)).map(([ad]) => ad);
}

test("fikir paneli: Hatırlatıcılar panelinde Fikir bölümü BİR DAHA DOĞMAZ", () => {
  assert.deepEqual(fikirBolumuIzleri(HATIRLATICILAR_KAYNAK), [],
    "Hatırlatıcılar paneline Fikir bölümü geri girmiş; Founder hükmü 2026-08-08 " +
    "Fikrin başka bir tipin penceresine misafir edilemeyeceğini söyler");
});

test("MUTASYON · fikir paneli: bölümü geri getiren her yazım denetimi kırar", () => {
  // Nöbetin kendi körlüğü ölçülür: bölümü geri getirmenin sekiz ayrı yolu
  // denenir ve hiçbiri sessiz geçemez. Denetim yalnız tek bir dizeye bakıyor
  // olsaydı, bölümü başka bir adla geri getiren yazım kaçardı.
  const mutantlar: Array<[string, string]> = [
    ["kök türü geri kondu", '  | { tur: "fikirBölümü"; kayitlar: readonly FikirKaydi[] };'],
    ["Fikir kök düğümü geri kondu", '  return [{ tur: "fikir", kayit }];'],
    ["yerleştirme kapısı geri kondu", "  fikirleriYerlestir(k: readonly FikirKaydi[]): void {}"],
    ["hane sayacı geri kondu", "  get fikirSayisi(): number { return 0; }"],
    ["çekirdek bağı geri kuruldu", 'import { fikirParmakIzi } from "./fikir-cekirdek.ts";'],
    ["satır tarifi geri çağrıldı", "    const f = fikirGorunumu(oge.kayit);"],
    ["bölüm başlığı geri kondu", "    item.label = fikirBolumBasligi();"],
    ["bölüm simgesi geri kondu", '  const FIKIR_BOLUM_SIMGESI: SatirSimgesi = "fikir";'],
  ];
  for (const [ad, satir] of mutantlar) {
    const yakalanan = fikirBolumuIzleri(`${HATIRLATICILAR_KAYNAK}\n${satir}\n`);
    assert.ok(yakalanan.length > 0,
      `"${ad}" yazımıyla geri getirilen bölüm yakalanmadı; denetim hâlâ dar demektir`);
  }
  // Ve meşru kaynak yanlışlıkla suçlanmaz: bugünkü panel temiz kalır.
  assert.deepEqual(fikirBolumuIzleri(HATIRLATICILAR_KAYNAK), [],
    "temiz kaynak suçlanıyor; denetim yanlış pozitif üretiyor");
});

test("fikir paneli: Hatırlatıcılar panelinin boşluk ölçüsü artık YALNIZ hatırlatıcıları sayar", () => {
  const govde = /private bosDurumuGuncelle\(\): void \{[\s\S]*?\n  \}/.exec(HATIRLATICILAR_KAYNAK)?.[0] ?? "";
  assert.ok(govde.length > 0, "boşluk ölçüsünün gövdesi okunamadı");
  assert.ok(/this\.kumeler\.length/.test(govde),
    "boşluk ölçüsü panelin kendi kümesine bakmıyor");
  assert.ok(!/fikir/i.test(govde),
    "boşluk ölçüsü hâlâ Fikir hanesini sayıyor; hane bu panelde yaşamıyor");
  // Yeni panelin kendi ölçüsü de kendi listesine bakar.
  const yeniGovde = /private bosDurumuGuncelle\(\): void \{[\s\S]*?\n  \}/.exec(FIKIRLER_KAYNAK)?.[0] ?? "";
  assert.ok(/this\.kayitlar\.length/.test(yeniGovde),
    "Fikirler paneli boşluk ölçüsünü kendi listesinden kurmuyor");
  assert.ok(/YUZEY_BOS_DURUM\.fikirler/.test(yeniGovde),
    "Fikirler paneli komşusunun boş durum cümlesini ödünç alıyor");
});

test("fikir paneli: iki panelin boş durum cümlesi KENDİ hanesini anlatır", () => {
  const fikir = YUZEY_BOS_DURUM.fikirler;
  const hatirlatici = YUZEY_BOS_DURUM.hatırlatıcılar;
  assert.notEqual(fikir, hatirlatici, "iki panel aynı boşluk cümlesini paylaşıyor");
  assert.ok(!/hatırlatıcı/i.test(fikir),
    `Fikirler panelinin boşluk cümlesi komşusundan söz ediyor: "${fikir.slice(0, 90)}"`);
  assert.ok(!/\bfikir/i.test(hatirlatici),
    `Hatırlatıcılar panelinin boşluk cümlesi hâlâ Fikirden söz ediyor: "${hatirlatici.slice(0, 90)}"`);
  // Founder hükmü 2026-08-16: yapıştırılabilir sözdizimi örneği metinden düştü;
  // cümle kısa kalır ve yalnız kendi hanesini anlatır (yukarıdaki iki iddia).
});

// ── ③ BESLENME YOLU DEĞİŞMEDİ: TEK DEFTER · TEK TARAMA · TEK YAYIN ──────────

test("fikir paneli: kayıtlar TEK defterden gelir ve defter yeni panele bağlanmıştır", () => {
  const defterler = EKLENTI_KAYNAK.match(/new FikirDefteri\(/g) ?? [];
  assert.equal(defterler.length, 1,
    `eklentide ${defterler.length} Fikir defteri kurulmuş; ikinci defter ikinci bir gerçek demektir`);
  assert.ok(/fikirler\?\.yerlestir\(kayitlar\)/.test(EKLENTI_KAYNAK),
    "Fikir defteri yeni panele bağlanmamış; yayın kapısı boşa çalışır");
  assert.ok(!/fikirleriYerlestir/.test(EKLENTI_KAYNAK),
    "eklenti hâlâ Hatırlatıcılar panelinin Fikir kapısını çağırıyor");
  // Kapsam süzgeci yüzey defteriyle AYNI kapıdan gelir; iki yüzey kapsam
  // konusunda anlaşmazsa kullanıcı çelişkili iki tablo görür.
  const defterGovde = /const fikirDefteri = new FikirDefteri\([\s\S]*?\n\);/.exec(EKLENTI_KAYNAK)?.[0] ?? "";
  assert.ok(/panelDeGorunur\(dosya\)/.test(defterGovde),
    "Fikir defterinin kapsam süzgeci yüzey defterininkinden ayrışmış");
});

test("fikir paneli: İKİNCİ TARAMA KURULMAZ — kayıtlar paylaşılan ayrıştırma önbelleğinden okunur", () => {
  const cagrilar = EKLENTI_KAYNAK.match(/fikirleriTopla\(/g) ?? [];
  assert.equal(cagrilar.length, 1,
    `Fikir toplayıcısı ${cagrilar.length} yerden çağrılıyor; ikinci bir toplama yolu doğmuş`);
  assert.ok(/const fikirProgrami = programAl\(doc\);/.test(EKLENTI_KAYNAK),
    "Fikir kayıtları paylaşılan ayrıştırma önbelleğinden okunmuyor; ikinci bir ayrıştırma doğmuş");
  // Panelin kendisi hiçbir veri yolu ya da tazeleme ritmi kurmaz.
  for (const yasak of ["findFiles", "openTextDocument", "readFile", "setInterval", "setTimeout",
    "createFileSystemWatcher", "workspace.fs"]) {
    assert.ok(!FIKIRLER_KAYNAK.includes(yasak),
      `Fikirler paneli ikinci bir veri yolu ya da tazeleme ritmi kuruyor: ${yasak}`);
  }
  // Komşu yüzeylerden de hiçbir şey içeri almaz.
  for (const yasak of ["onay-cekirdek", "onay-tarayici", "onay-kuyrugu", "posta-kutusu",
    "CommentThread", "clipboard"]) {
    assert.ok(!FIKIRLER_KAYNAK.includes(yasak),
      `Fikirler paneli komşu bir yüzeye bağlanmış: ${yasak}`);
  }
});

test("fikir paneli: tur sonunda TEK yayın yapılır ve bayat dosya budanır", () => {
  assert.ok(/fikirDefteri\.buda\(new Set\(doclar\.keys\(\)\)\);\n\s*fikirDefteri\.yayımla\(\);/
    .test(EKLENTI_KAYNAK),
    "toplu tur ya budamıyor ya da turun tek yayınını yapmıyor");
  // Yayın ertelenerek dağıtılır: her belgede ayrı çizim tetiklenmez.
  assert.ok(/fikirDefteri\.yaz\(\n\s*doc\.uri\.fsPath,[\s\S]*?yayımlansın,\n\s*\);/.test(EKLENTI_KAYNAK),
    "Fikir kayıtları yayın erteleme bayrağını taşımadan yazılıyor; tur başına onlarca çizim doğar");
  assert.ok(/fikirDefteri\.sil\(uri\.fsPath, yayımlansın\)/.test(EKLENTI_KAYNAK),
    "kapsam dışına çıkan dosyanın Fikirleri panelde hayalet olarak kalır");
});

test("fikir paneli: yinelenen çizim yapısal olarak önlenir — parmak izi saf çekirdekten gelir", () => {
  assert.ok(/fikirParmakIzi\(this\.kayitlar\) === fikirParmakIzi\(kayitlar\)/.test(FIKIRLER_KAYNAK),
    "panel aynı içeriği ikinci kez çizdiriyor; yinelenen yenileme güvencesi yok");
  assert.ok(!/parmakIzi\(kumeler|private parmakIzi/.test(FIKIRLER_KAYNAK),
    "panel kendi parmak izini yazmış; ölçü saf çekirdekte tek yerde yaşar");
});

// ── ④ DURUM ÇUBUĞU YENİ YERLEŞİMİ SÖYLER ────────────────────────────────────

test("fikir paneli: durum çubuğu Fikirleri kendi adıyla sayar ve kendi paneline götürür", () => {
  const girdi = DURUM_CUBUGU_GIRDILERI.find((g) => g.metin === "fikirler");
  assert.ok(girdi, "durum çubuğunda Fikirler girdisi yok; hane kendi sayısını hiç söylemiyor");
  assert.equal(girdi.komut, `${GORUNUS_FIKIRLER}.focus`,
    "Fikirler girdisi kendi paneline götürmüyor");
  assert.equal(DURUM_CUBUGU_METINLERI.fikirler.ad, "Fikirler",
    "durum çubuğu girdisinin adı hanesini söylemiyor");
  // Sayı GÖMÜLÜ olamaz: girdi kaynağı çağırır ve ayırt edici değeri aynen döndürür.
  const kaynak = {
    hata: () => 1, uyarı: () => 2, gözlem: () => 3,
    hatırlatıcı: () => 4, fikir: () => 77, kapı: () => 5,
  };
  assert.equal(girdi.say(kaynak), 77,
    "Fikir sayısı kaynaktan gelmiyor; ikinci bir sayaç tutuluyor olabilir");
  // Ve sayı yine panelin KENDİ listesinden türer; eklenti ikinci bir sayaç kurmaz.
  assert.ok(/fikir: \(\) => fikirler\?\.kayitSayisi \?\? 0/.test(EKLENTI_KAYNAK),
    "durum çubuğu Fikir sayısını panelin kendi okuyucusundan türetmiyor");
  assert.ok(/get kayitSayisi\(\): number \{\n\s*return this\.kayitlar\.length;/.test(FIKIRLER_KAYNAK),
    "panel kayıt sayısını kendi listesinden vermiyor; ikinci bir sayaç doğmuş");
});

test("MUTASYON · fikir paneli: her girdi ayrı bir haneyi sayar; ikisi aynı sayıyı basamaz", () => {
  // Girdiler farklı kaynak okuyucularına bağlıdır. Aynı okuyucuya bağlanan iki
  // girdi kullanıcıya aynı sayıyı iki adla gösterirdi; sahte kaynak bunu ayırt
  // edici değerlerle yakalar.
  const kaynak = {
    hata: () => 11, uyarı: () => 22, gözlem: () => 33,
    hatırlatıcı: () => 44, fikir: () => 55, kapı: () => 66,
  };
  const okunan = DURUM_CUBUGU_GIRDILERI.map((g) => g.say(kaynak));
  assert.equal(new Set(okunan).size, okunan.length,
    `iki durum çubuğu girdisi aynı haneyi sayıyor: ${okunan.join(" · ")}`);
  // Girdiler var olan görünüşlere götürür; ölü bir odak komutu sessizce hiçbir şey yapmaz.
  const kimlikler = new Set(GORUNUSLER.map((g) => g.id));
  for (const g of DURUM_CUBUGU_GIRDILERI) {
    assert.ok(kimlikler.has(g.komut.replace(/\.focus$/, "")),
      `durum çubuğu var olmayan bir görünüşe götürüyor: ${g.komut}`);
  }
});

// ── ⑤ SATIR BİÇİMİ VE İŞARETLER ─────────────────────────────────────────────

test("fikir paneli: satır kopyalama yolu korunmuştur ve komut TEKTİR", () => {
  const menu = PAKET.contributes.menus["view/item/context"] ?? [];
  assert.ok(menu.some((g) => g.command === "sarmal.satiriKopyala" && g.when === `view == ${GORUNUS_FIKIRLER}`),
    "Fikirler görünüşünün sağ tık menüsünde kopyalama girdisi yok; hane taşınırken kopyalama düşmüş");
  assert.ok(/fikirler\?\.panoMetni\(oge\)/.test(EKLENTI_KAYNAK),
    "kopyalama komutu yeni panele hiç sormuyor; Fikir satırı panoya inemez");
  assert.ok(/panoMetni\(oge: unknown\)/.test(FIKIRLER_KAYNAK),
    "Fikirler paneli pano metnini hesaplayan kapıyı taşımıyor");
  assert.ok(!FIKIRLER_KAYNAK.includes("writeText"),
    "panel panoya kendisi yazıyor; pano yazan tek el komuttur");
});

test("fikir paneli: kullanıcıya giden panel metinleri EMOJİ taşımaz (Founder hükmü)", () => {
  const emoji = /\p{Extended_Pictographic}/u;
  for (const [ad, metin] of Object.entries({
    panelAdiTr: PAKET_NLS_TR["view.ideas"],
    panelAdiEn: PAKET_NLS_EN["view.ideas"],
    aciklama: YUZEY_ACIKLAMALARI.fikirler,
    bosDurum: YUZEY_BOS_DURUM.fikirler,
    durumCubuguAdi: DURUM_CUBUGU_METINLERI.fikirler.ad,
    durumCubuguEylemi: DURUM_CUBUGU_METINLERI.fikirler.eylem,
  })) {
    assert.equal(emoji.exec(metin), null,
      `"${ad}" metni emoji taşıyor; arayüz işaretleri yalnız vektörel aileden gelir`);
  }
});

test("fikir paneli: ağaç TEK kademedir ve komşu panellerin kademelerini ödünç almaz", () => {
  const kademeler = [...FIKIRLER_KAYNAK.matchAll(/tur: "([^"]+)"/g)].map((m) => m[1]);
  assert.ok(kademeler.length > 0, "panel düğümleri okunamadı");
  assert.deepEqual([...new Set(kademeler)], ["fikir"],
    `Fikirler ağacına yeni bir kademe girmiş: ${[...new Set(kademeler)].join(" · ")}`);
  for (const yasak of ["projeyeGrupla", "dosyayaGrupla", "kokeGoreOzetle", "turDagilimi"]) {
    assert.ok(!FIKIRLER_KAYNAK.includes(yasak),
      `Fikirler paneli komşu panelin gruplayıcısını kullanıyor: ${yasak}`);
  }
});

// ── ⑥ EKLENTİ SÜRÜMÜ İLERLEDİ ───────────────────────────────────────────────

/** Üç parçalı sürüm numarasını karşılaştırır: sol büyükse pozitif döner. */
function surumKarsilastir(sol: string, sag: string): number {
  const a = sol.split(".").map(Number);
  const b = sag.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) - (b[i] ?? 0);
  }
  return 0;
}

test("fikir paneli: paket sürümü ilerlemiştir — aynı numara kullanıcının editöründe tazelenmez", () => {
  // HTR-SURUM-DAMGASI-TUZAGI 2026-08-08 tarihinde ölçülerek kanıtlandı: aynı
  // sürüm numarasıyla yeniden paketlenen eklenti kullanıcının editöründe hiç
  // tazelenmez ve üç günlük iş kullanıcıya hiç ulaşmaz. Bu Adımın teslimi YENİ
  // bir görünüş doğurur; sürüm ilerlemezse panel kullanıcıda hiç belirmez ve
  // geliştirici özelliğin çalıştığını sanarken kullanıcı onu hiç görmez.
  //
  // Alt sınır, Fikir hanesinin Hatırlatıcılar panelinin içinde paketlendiği son
  // sürümdür. Taşıma o numarayla yayımlanamaz; buradaki karşılaştırma bunu
  // mekanik olarak zorlar.
  const HANENIN_ESKI_EVIYLE_PAKETLENEN_SON_SURUM = "0.9.140";
  assert.equal(PAKET.version.split(".").length, 3,
    `sürüm numarası üç parçalı değil: ${PAKET.version}`);
  assert.ok(surumKarsilastir(PAKET.version, HANENIN_ESKI_EVIYLE_PAKETLENEN_SON_SURUM) > 0,
    `eklenti sürümü ilerlememiş (${PAKET.version}); aynı numarayla paketlenen paket ` +
    "kullanıcının editöründe hiç tazelenmez ve yeni panel hiç belirmez");
  // Ve sürüm sessiz ilerleyemez: değişiklik günlüğünün en üstteki girdisi bu
  // sürümü anlatır, dolayısıyla numarayı ilerleten kişi ne değiştiğini yazmak
  // zorunda kalır.
  const ilkBaslik = /^## (\S+)/m.exec(oku("../CHANGELOG.md"))?.[1] ?? "";
  assert.equal(ilkBaslik, PAKET.version,
    `değişiklik günlüğünün en üstteki girdisi ${ilkBaslik}, paket ise ${PAKET.version} diyor`);
});

// ── ⑦ KOMŞU PANELLER BU TURDA KENDİ İŞLERİNİ SÜRDÜRÜR ───────────────────────

test("fikir paneli: komşu iki panelin kimliği ve kayıt sayacı bu turda değişmedi", () => {
  const kimlikler = GORUNUSLER.map((g) => g.id);
  for (const kimlik of [GORUNUS_HATIRLATICILAR, GORUNUS_BILDIRIMLER]) {
    assert.ok(kimlikler.includes(kimlik),
      `komşu panelin görünüş kimliği paket bildiriminden düşmüş: ${kimlik}`);
  }
  assert.ok(/get kayitSayisi\(\): number \{\n\s*return this\.kumeler\.reduce/.test(HATIRLATICILAR_KAYNAK),
    "Hatırlatıcılar panelinin kayıt sayacı hane taşınırken bozulmuş");
  assert.ok(HATIRLATICILAR_KAYNAK.includes("GORUNUS_HATIRLATICILAR"),
    "Hatırlatıcılar paneli kendi görünüş kimliğini kaybetmiş");
});

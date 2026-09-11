// ═══════════════════════════════════════════════════════════════════════════
// hatirlatici-kapatma.test.ts — ✅ ATEŞLEMİŞ HATIRLATICININ KAPATILMASI (KYN-YUZ-A03)
//
//   ADIMIN ÖLÇÜSÜ DÖRT CÜMLEDİR ve bu dosya dördünü de fikstürle ölçer:
//     ① Kapatma eylemi YALNIZ ateşlemiş satırda görünür; uykuda bekleyende
//        görünmez ve aynı eylem ona uygulanmak istendiğinde REDDEDİLİR.
//     ② Kapatma yalnız hatırlatıcının `durum` alanını değiştirir; dosyanın geri
//        kalanı BAYT BAYT aynıdır — ölçüm karakter karşılaştırmasıyla yapılır.
//     ③ Konum tahmin edilmez: bayat konum, NFC dışı satır, belirsiz kimlik ve
//        alan yokluğu hâllerinin DÖRDÜNDE de dosyaya dokunulmaz ve dürüst bir
//        "doğrulanamadı" döner.
//     ④ Kablo: kabuk saf kararı gerçekten çağırır, eylem yuvasını ateşlemiş
//        satıra bağlar ve tazelemeyi gövdenin KENDİ kilidinden ister.
//
//   KAPATMA SİLMEZ. Kanon tamamlanan kaydın yerinde kaldığını yazar (SNF-0);
//   nöbet bu yüzden düğümün varlığını da ölçer, yalnız değerin değiştiğini değil.
//   Koşum: cd urun/eklenti && npm test
// ═══════════════════════════════════════════════════════════════════════════
import "./dil-kur.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { belirtecle } from "../../cekirdek/src/belirtec.ts";
import { ayristir } from "../../cekirdek/src/ayristirici.ts";
import { satirdaDegerDegistir } from "../../cekirdek/src/deger-yaz.ts";
import type { Tani } from "../../cekirdek/src/tani.ts";
import {
  hatirlaticiKapatilabilir, hatirlaticiDurumAlani, hatirlaticiKapatmaAraligi,
  HATIRLATICI_KAPALI_DEGERI, ATESLEMIS_TANI,
  BAGLAM_HATIRLATICI, BAGLAM_HATIRLATICI_ATESLEDI,
  type YuzeyKaydi,
} from "../src/yuzey-cekirdek.ts";
import { HATIRLATICI_KAPATMA_METINLERI } from "../src/yuzey-metinleri.ts";

const oku = (u: string): string => readFileSync(fileURLToPath(new URL(u, import.meta.url)), "utf8");

// ── FİKSTÜR ────────────────────────────────────────────────────────────────
//   İki hatırlatıcı yan yana durur ve aralarındaki tek fark durumlarıdır; böylece
//   ölçüm tek değişkenlidir ve kapatmanın komşu satıra dokunmadığı görülebilir.
const KAYNAK = [
  `Hatırlatıcı( kod: HTR-ATESLEDI, durum: açık, öncelik: p2,`,
  `  ne: "🔔 hedefi kapanmış taahhüt",`,
  `  dönüşTetikleyici: "hedef Adım tamamlandığında" )`,
  `Hatırlatıcı( kod: HTR-UYKUDA, durum: açık, öncelik: p3,`,
  `  ne: "🔔 hedefi henüz kapanmamış taahhüt",`,
  `  dönüşTetikleyici: "yayın gününde" )`,
  `Hatırlatıcı( kod: HTR-TIRNAKLI, durum: "kararlaştı", öncelik: p2,`,
  `  ne: "🔔 tırnaklı değer" )`,
  `Hatırlatıcı( kod: HTR-KAPALI, durum: tamamlandı, ne: "🔔 kapanmış kayıt" )`,
  ``,
].join("\n");

const bildirimler = (kaynak: string) => ayristir(belirtecle(kaynak)).bildirimler;
const alanBul = (kaynak: string, kod: string) => hatirlaticiDurumAlani(bildirimler(kaynak), kod);
const kapat = (kaynak: string, kod: string) =>
  hatirlaticiKapatmaAraligi(kaynak, alanBul(kaynak, kod), satirdaDegerDegistir);

/** Bir kaydı üretim tipiyle kurar; yalnız nöbetin okuduğu alanlar doldurulur. */
const kayit = (taniKodu: string): YuzeyKaydi => ({
  proje: { kod: "PRJ-DENEME", ad: "Deneme" } as YuzeyKaydi["proje"],
  dosya: "/depo/oz/kayit/hatirlaticilar.sar",
  tani: { kod: taniKodu, düzey: "bilgi", mesaj: "HTR-ATESLEDI ateşledi", satir: 1, sutun: 1 } as unknown as Tani,
});

/** Kaynağı satır satır karşılaştırır — hangi satırların değiştiğini döndürür. */
function degisenSatirlar(once: string, sonra: string): number[] {
  const a = once.split("\n"); const b = sonra.split("\n");
  assert.equal(a.length, b.length, "satır SAYISI değişti; kapatma dosyanın yapısına dokunmuş");
  const fark: number[] = [];
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) fark.push(i);
  return fark;
}

// ═══════════════════════════════════════════════════════════════════════════
// ① EYLEM YALNIZ ATEŞLEMİŞ SATIRDA GÖRÜNÜR
// ═══════════════════════════════════════════════════════════════════════════

test("EYLEM: ateşlemiş kayıt kapatılabilir, uykuda bekleyen kayıt kapatılamaz", () => {
  assert.equal(hatirlaticiKapatilabilir(kayit(ATESLEMIS_TANI)), true);
  assert.equal(hatirlaticiKapatilabilir(kayit("açık-hatırlatıcı")), false,
    "uykuda bekleyen hatırlatıcıya kapatma sunuldu; sessiz vazgeçmeye kapı açılır (Adımın sınır hükmü)");
  assert.equal(hatirlaticiKapatilabilir(kayit("kararlaşmış-hatırlatıcı")), false);
  assert.equal(hatirlaticiKapatilabilir(kayit("geliştirmede-çapa")), false,
    "hatırlatıcı olmayan bir hane kaydına kapatma sunuldu");
});

test("EYLEM YUVASI: iki bağlam değeri BİRBİRİNDEN AYRIDIR", () => {
  // Aynı değere düşerlerse menü koşulu iki satırı ayıramaz ve eylem uykuda
  // bekleyen hatırlatıcıda da belirir.
  assert.notEqual(BAGLAM_HATIRLATICI, BAGLAM_HATIRLATICI_ATESLEDI);
});

// ═══════════════════════════════════════════════════════════════════════════
// ② YALNIZ DURUM ALANI DEĞİŞİR — BAYT KARŞILAŞTIRMASI
// ═══════════════════════════════════════════════════════════════════════════

test("KAPATMA: yalnız durum satırı değişir, dosyanın geri kalanı BAYT BAYT aynıdır", () => {
  const sonuc = kapat(KAYNAK, "HTR-ATESLEDI");
  assert.equal(sonuc.tur, "aralık", `kapatma aralığı üretilmedi: ${JSON.stringify(sonuc)}`);
  if (sonuc.tur !== "aralık") return;

  const satirlar = KAYNAK.split("\n");
  satirlar[sonuc.satir] = sonuc.yeniSatir;
  const yeni = satirlar.join("\n");

  const fark = degisenSatirlar(KAYNAK, yeni);
  assert.deepEqual(fark, [0], `beklenenden fazla satır değişti: ${fark.join(", ")}`);
  assert.equal(yeni.split("\n")[0], `Hatırlatıcı( kod: HTR-ATESLEDI, durum: ${HATIRLATICI_KAPALI_DEGERI}, öncelik: p2,`);

  // KAYIT SİLİNMEZ (SNF-0): düğüm hâlâ oradadır ve öteki alanları yerindedir.
  assert.ok(yeni.includes("kod: HTR-ATESLEDI"), "kapatma kaydı sildi; kanon yerinde kalmasını şart koşar");
  assert.ok(yeni.includes("öncelik: p2"), "durum dışında bir alan kaybolmuş");
  assert.ok(yeni.includes(`dönüşTetikleyici: "hedef Adım tamamlandığında"`), "gövde alanı bozulmuş");

  // KOMŞU HATIRLATICI HİÇ DEĞİŞMEZ.
  assert.ok(yeni.includes("kod: HTR-UYKUDA, durum: açık"), "komşu hatırlatıcının durumu da yazılmış");
});

test("KAPATMA: tırnaklı durum değeri de bozulmadan yazılır (tırnak sınırı kapsanır)", () => {
  const sonuc = kapat(KAYNAK, "HTR-TIRNAKLI");
  assert.equal(sonuc.tur, "aralık");
  if (sonuc.tur !== "aralık") return;
  const satirlar = KAYNAK.split("\n");
  satirlar[sonuc.satir] = sonuc.yeniSatir;
  const yeni = satirlar.join("\n");
  // Yazımdan sonra dosya HÂLÂ ayrıştırılabilirdir; sessiz bozulma zinciri kırıktır.
  assert.doesNotThrow(() => bildirimler(yeni), "tırnaklı değerde yazım dosyayı bozdu");
  assert.equal(alanBul(yeni, "HTR-TIRNAKLI")?.metin, HATIRLATICI_KAPALI_DEGERI);
  assert.deepEqual(degisenSatirlar(KAYNAK, yeni), [6]);
});

test("KAPATMA: zaten kapalı kayıtta dosyaya DOKUNULMAZ", () => {
  assert.equal(kapat(KAYNAK, "HTR-KAPALI").tur, "zaten-kapalı");
});

// ═══════════════════════════════════════════════════════════════════════════
// ③ ŞÜPHEDE DUR — dört ret hâli
// ═══════════════════════════════════════════════════════════════════════════

test("ŞÜPHEDE DUR: bilinmeyen kod için aralık üretilmez", () => {
  const sonuc = kapat(KAYNAK, "HTR-YOK");
  assert.equal(sonuc.tur, "doğrulanamadı");
});

test("ŞÜPHEDE DUR: kod BİRDEN ÇOK hatırlatıcıda geçiyorsa yazım yapılmaz", () => {
  const ikiz = KAYNAK + `Hatırlatıcı( kod: HTR-ATESLEDI, durum: açık, ne: "🔔 ikiz kayıt" )\n`;
  assert.equal(alanBul(ikiz, "HTR-ATESLEDI"), undefined,
    "belirsiz kimlikte alan çözüldü; yanlış düğüm kapatılabilirdi");
  assert.equal(kapat(ikiz, "HTR-ATESLEDI").tur, "doğrulanamadı");
});

test("ŞÜPHEDE DUR: durum alanı olmayan hatırlatıcıda yazım yapılmaz", () => {
  const alansiz = `Hatırlatıcı( kod: HTR-ALANSIZ, ne: "🔔 durumsuz kayıt" )\n`;
  assert.equal(alanBul(alansiz, "HTR-ALANSIZ"), undefined);
  assert.equal(kapat(alansiz, "HTR-ALANSIZ").tur, "doğrulanamadı");
});

test("ŞÜPHEDE DUR: NFC olmayan satırda yazım DURUR", () => {
  const alan = alanBul(KAYNAK, "HTR-ATESLEDI");
  const nfd = KAYNAK.normalize("NFD");
  assert.notEqual(nfd, KAYNAK, "fikstür NFD'de farklılaşmıyor; nöbet ölçmüyor");
  assert.equal(hatirlaticiKapatmaAraligi(nfd, alan, satirdaDegerDegistir).tur, "doğrulanamadı",
    "iki konum sistemi ayrışmışken yazım yapıldı; kaymış dilim sahte-geçti");
});

test("ŞÜPHEDE DUR: konum bayatsa (satır kaymış) yazım yapılmaz", () => {
  const alan = alanBul(KAYNAK, "HTR-ATESLEDI");
  assert.ok(alan);
  // Kaynak değişti, ölçüm eski: alanın gösterdiği yerde artık başka bir şey var.
  const kaymis = "// araya giren yorum satırı\n" + KAYNAK;
  assert.equal(hatirlaticiKapatmaAraligi(kaymis, alan, satirdaDegerDegistir).tur, "doğrulanamadı",
    "bayat konuma yazıldı; komşu alan bozulurdu");
});

test("ŞÜPHEDE DUR: konumda BAŞKA bir değer duruyorsa yazım yapılmaz (bayt doğrulaması)", () => {
  // EN SİNSİ HÂL BUDUR ve satır kaymasından ayrıdır: satır numarası tutar, sütun
  // satıra SIĞAR, dolayısıyla dilim denetimi tek başına sahte-geçer. Yakalayan
  // tek ölçü, bildirilen konumda bildirilen DEĞERİN gerçekten durup durmadığıdır;
  // durmuyorsa yazım komşu bir alanın içine düşer ve dosyayı sessizce bozar.
  const alan = alanBul(KAYNAK, "HTR-ATESLEDI");
  assert.ok(alan);
  const satirlar = KAYNAK.split("\n");
  satirlar[0] = satirlar[0]!.replace("durum: açık,", "durum: kapalıY,");
  const bozuk = satirlar.join("\n");
  const sonuc = hatirlaticiKapatmaAraligi(bozuk, alan, satirdaDegerDegistir);
  assert.equal(sonuc.tur, "doğrulanamadı",
    "bildirilen konumda başka bir değer dururken yazım yapıldı; komşu alan bozulurdu");
  if (sonuc.tur === "doğrulanamadı") assert.match(sonuc.neden, /konum bayat/);
});

test("DÜRÜST HATA: her ret hâli sebebini SÖYLER", () => {
  const sonuc = kapat(KAYNAK, "HTR-YOK");
  assert.equal(sonuc.tur, "doğrulanamadı");
  if (sonuc.tur !== "doğrulanamadı") return;
  assert.ok(sonuc.neden.length > 0, "ret sebepsiz döndü; kullanıcı kaynağa körlemesine gönderilir");
  const cumle = HATIRLATICI_KAPATMA_METINLERI.basarisiz("HTR-YOK", sonuc.neden);
  assert.ok(cumle.includes("HTR-YOK"), "hata cümlesi kaydın kodunu anmıyor");
  assert.ok(cumle.includes(sonuc.neden), "hata cümlesi sebebi taşımıyor");
});

// ═══════════════════════════════════════════════════════════════════════════
// ④ KABLO — kabuk saf kararı GERÇEKTEN çağırır
// ═══════════════════════════════════════════════════════════════════════════

test("KABLO: panel eylem yuvasını ateşlemiş satıra bağlar ve kararı saf çekirdekten alır", () => {
  const kaynak = oku("../src/hatirlaticilar.ts");
  assert.ok(kaynak.includes("hatirlaticiKapatilabilir(oge.kayit)"),
    "contextValue kararı saf çekirdekten okunmuyor; iki yerde iki ölçüt doğar");
  assert.ok(kaynak.includes("BAGLAM_HATIRLATICI_ATESLEDI") && kaynak.includes("BAGLAM_HATIRLATICI"),
    "eylem yuvasının bağlam değerleri tek kaynaktan gelmiyor");
  assert.ok(kaynak.includes("hatirlaticiKapatmaAraligi("),
    "yazım saf doğrulamadan geçmiyor; konum tahminine düşülür");
  assert.ok(kaynak.includes("satirdaDegerDegistir"),
    "değer değişimi tırnak-güvenli ortak kapıdan geçmiyor");
});

test("KABLO: yazımdan önce DİSKİN kendisi bir kez daha okunur", () => {
  const kaynak = oku("../src/hatirlaticilar.ts");
  assert.ok(/doc\.lineAt\(sonuc\.satir\)\.text\s*!==\s*sonuc\.eskiSatir/.test(kaynak),
    "ölçüm ile yazım arasındaki değişim kontrol edilmiyor; yarış dosyayı bozar");
});

test("KABLO: komut kayıtlıdır ve tazeleme gövdenin KENDİ kilidinden istenir", () => {
  const kaynak = oku("../src/eklenti.ts");
  assert.ok(kaynak.includes(`registerCommand("sarmal.hatirlaticiKapat"`),
    "kapatma komutu hiç kaydedilmemiş; menü girdisi çalışmaz");
  assert.ok(/hatirlaticilar\?\.kapat\(oge,\s*\(t\)\s*=>\s*denetimKilidi\.iste\(t\)\)/.test(kaynak),
    "kapatma sonrası tazeleme gövdenin tek kilidinden istenmiyor; panel kendi taramasını kurar");
});

// ═══════════════════════════════════════════════════════════════════════════
// ⑤ MANİFEST — eylem kullanıcıya GERÇEKTEN görünür
//
//   ÖLÇÜLMÜŞ KUSUR: gövde eksiksizdi ve komut kayıtlıydı, fakat manifest onu
//   ilan etmediği için eylem hiçbir satırda BELİRMİYORDU. Kablo nöbeti bunu
//   yakalayamaz, çünkü kablo TypeScript tarafını ölçer ve VS Code menü
//   haritasını yalnız `package.json` dosyasından okur. Bu bölüm o boşluğu
//   kapatır: komutun ilanını, iki dildeki başlığını, simgesinin rafta gerçekten
//   bulunduğunu ve `when` cümlesinin ateşlemiş satırı kabul edip uykuda
//   bekleyeni reddettiğini ölçer.
// ═══════════════════════════════════════════════════════════════════════════
const KAPATMA_KOMUTU = "sarmal.hatirlaticiKapat";
const GORUNUS_HATIRLATICILAR = "sarmalHatirlaticilar";
/** Dosya başlığı satırının bağlam değeri — kapatma ona da uygulanamaz. */
const BAGLAM_DOSYA = "sarmalHatirlaticiDosyasi";

type MenuGirdisi = { command: string; when?: string; group?: string };
const PAKET = JSON.parse(oku("../package.json")) as {
  contributes: {
    commands: Array<{ command: string; title: string; category?: string; icon?: { light: string; dark: string } }>;
    menus: Record<string, MenuGirdisi[]>;
  };
};
const NLS_EN = JSON.parse(oku("../package.nls.json")) as Record<string, string>;
const NLS_TR = JSON.parse(oku("../package.nls.tr.json")) as Record<string, string>;
const OGE_MENUSU = (): MenuGirdisi[] => PAKET.contributes.menus["view/item/context"] ?? [];
const kapatmaGirdileri = (): MenuGirdisi[] => OGE_MENUSU().filter((g) => g.command === KAPATMA_KOMUTU);

/**
 * `when` cümlesini iki değişkenli bir dünyada değerlendirir: hangi görünüş ve
 * hangi bağlam değeri. Karşılaştırma EŞİTLİKTİR, alt dizge değil — uykuda
 * bekleyenin bağlam değeri ateşlemiş olanın ÖN EKİDİR ("sarmalHatirlatici" ⊂
 * "sarmalHatirlaticiAtesledi") ve alt dizgeyle ölçen bir nöbet ikisini ayırt
 * edemez, yani asıl kusuru göremez. Değerlendirici yalnız `&&` ve `||`
 * tanır; cümle bundan karmaşık bir söz dizimi taşımaya başlarsa nöbet SESSİZ
 * GEÇMEZ, yüksek sesle düşer ve kendisinin büyütülmesini ister.
 */
function menudeBelirir(when: string | undefined, gorunus: string, baglam: string): boolean {
  if (!when) return true;
  assert.ok(!/[()!]/.test(when),
    `nöbetin değerlendiricisi bu koşulu tanımıyor: ${when} — değerlendiriciyi büyüt, koşulu kırpma`);
  const cozumle = (parca: string): boolean => {
    const item = /^\s*viewItem\s*(==|!=)\s*([A-Za-z0-9_.]+)\s*$/.exec(parca);
    if (item) return item[1] === "==" ? item[2] === baglam : item[2] !== baglam;
    const view = /^\s*view\s*(==|!=)\s*([A-Za-z0-9_.]+)\s*$/.exec(parca);
    if (view) return view[1] === "==" ? view[2] === gorunus : view[2] !== gorunus;
    if (/^\s*(true|false)\s*$/.test(parca)) return parca.trim() === "true";
    assert.fail(`nöbetin değerlendiricisi bu yüklemi tanımıyor: ${parca}`);
  };
  return when.split("||").some((veya) => veya.split("&&").every(cozumle));
}

test("MANİFEST: kapatma komutu ilan edilmiştir ve başlığı iki dilde yaşar", () => {
  const komut = PAKET.contributes.commands.find((k) => k.command === KAPATMA_KOMUTU);
  assert.ok(komut, `${KAPATMA_KOMUTU} contributes.commands altında ilan edilmemiş — eylem hiçbir menüde belirmez`);
  const anahtar = /^%([^%]+)%$/.exec(komut!.title)?.[1];
  assert.ok(anahtar, "komut başlığı yerelleştirme anahtarı değil; ikinci dil karşılıksız kalır");
  assert.ok(NLS_TR[anahtar!]?.length, `package.nls.tr.json içinde '${anahtar}' karşılığı yok`);
  assert.ok(NLS_EN[anahtar!]?.length, `package.nls.json içinde '${anahtar}' karşılığı yok`);
  assert.notEqual(NLS_EN[anahtar!], NLS_TR[anahtar!], "iki dil aynı metni taşıyor — ikinci dil yazılmamış");
});

test("MANİFEST: eylem yuvası YALNIZ ateşlemiş hatırlatıcı satırında belirir", () => {
  const girdiler = kapatmaGirdileri();
  assert.ok(girdiler.length > 0,
    "view/item/context altında kapatma girdisi yok — komut kayıtlı olsa bile kullanıcı ona ulaşamaz");
  assert.ok(girdiler.some((g) => menudeBelirir(g.when, GORUNUS_HATIRLATICILAR, BAGLAM_HATIRLATICI_ATESLEDI)),
    "ateşlemiş satırda hiçbir kapatma girdisi belirmiyor — Adımın birinci kabul ölçütü karşılanmıyor");
  for (const g of girdiler) {
    assert.equal(menudeBelirir(g.when, GORUNUS_HATIRLATICILAR, BAGLAM_HATIRLATICI), false,
      `uykuda bekleyen hatırlatıcıda kapatma beliriyor (${g.group}) — sessiz vazgeçmeye kapı açılır`);
    assert.equal(menudeBelirir(g.when, GORUNUS_HATIRLATICILAR, BAGLAM_DOSYA), false,
      `dosya başlığı satırında kapatma beliriyor (${g.group}) — kayıt taşımayan satıra eylem verilmiş`);
    for (const yabanci of ["sarmalBildirimler", "sarmalFikirler", "sarmalYolHaritasi", "sarmalOnaylar"]) {
      assert.equal(menudeBelirir(g.when, yabanci, BAGLAM_HATIRLATICI_ATESLEDI), false,
        `kapatma '${yabanci}' görünüşüne sızıyor (${g.group}) — eylem kendi panelinin dışına taşmış`);
    }
  }
});

test("MANİFEST: eylem hem üzerine-gelme yuvasında hem bağlam menüsünde vardır", () => {
  const gruplar = kapatmaGirdileri().map((g) => g.group ?? "");
  assert.ok(gruplar.some((g) => g.startsWith("inline")),
    "kapatma satır üzerine gelince görünmüyor; Adım 'üzerine gelince görünen bir eylem' ister");
  assert.ok(gruplar.some((g) => !g.startsWith("inline")),
    "kapatma yalnız üzerine-gelme yuvasında; sağ tık menüsünden ulaşılamaz ve klavyeyle gezen kullanıcı eylemi bulamaz");
});

test("MANİFEST: kapatma simgesi rafta gerçekten vardır ve iki temayı da taşır", () => {
  const komut = PAKET.contributes.commands.find((k) => k.command === KAPATMA_KOMUTU)!;
  assert.ok(komut.icon, "üzerine-gelme yuvası simgesiz kalıyor; VS Code o yuvada başlığı çizmez");
  // İKİ TEMA ZORUNLUDUR: `iconPath` currentColor çözmez (YUZ-4.1 · simge-uret
  // başlığı), dolayısıyla açık ve koyu için AYRI dosya ilan edilir. Yol bozuksa
  // VS Code sessizce boş bir yuva çizer; kusur ancak canlı pencerede görülür.
  for (const [tema, yol] of Object.entries(komut.icon!)) {
    assert.ok(yol.startsWith("medya/simgeler/uretilmis/"),
      `'${tema}' simgesi üretilmiş raftan gelmiyor: ${yol} — elle boyanmış dosya YUZ-4.1 ihlalidir`);
    assert.ok(existsSync(fileURLToPath(new URL(`../${yol}`, import.meta.url))),
      `'${tema}' simgesi rafta yok: ${yol} — yuva boş çizilir`);
  }
});

test("MANİFEST: kapatma komutu komut paletine düşmez", () => {
  const palet = PAKET.contributes.menus["commandPalette"] ?? [];
  const girdi = palet.find((g) => g.command === KAPATMA_KOMUTU);
  assert.ok(girdi, "komut palette gizlenmemiş; satır argümanı olmadan çağrılınca yalnız uyarı üretir");
  assert.equal(girdi!.when, "false", "palet gizlemesi koşullu yazılmış; komut bazı hâllerde yine listelenir");
});

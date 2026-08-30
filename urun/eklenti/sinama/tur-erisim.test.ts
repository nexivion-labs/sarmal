// ═══════════════════════════════════════════════════════════════════════════
// tur-erisim.test.ts — 🛡️ TURUN ERİŞİM SINIRI NÖBETİ (PRF-KP-A05)
//
//   Tur artık diski kendisi okuduğu için (PRF-A06 · PRF-KP-A02) okuduğu
//   evrenin sınırı bir güvenlik sorusudur. Bu nöbet o sınırı dört yüzden kilitler
//   ve okuma evrenini ne genişletir ne daraltır (Adımın sınır hükmü).
//
//   Dört güvence:
//     ① KÖK SINIRI — kabuğun `oku` üyesine ulaşan her yol çalışma alanı
//        köklerinden birinin altındadır; `/etc/passwd` ile `<kök>/../disari.sar`
//        enjekte edildiğinde ikisi de okunmaz. Üst dizin parçası önce çözülür,
//        çünkü çözülmeden yapılan önek karşılaştırması `<kök>/../` yolunu kökün
//        içinde sayar. İç içe köklerde yol, kapsayan HERHANGİ bir köke göre
//        meşruysa geçer (denetçi bulgusu: ilk kapsayan kök seçilirse
//        `/ws/dist/depo/plan/a.sar` yolu `/ws` köküne göre `dist/` sayılıp düşer).
//     ② DIŞLAMA — tarama globunun dışladığı gizli ve dışlanan dizinlerin
//        (`.git` · `node_modules` · `dist` · `arsiv` · `fikstur` · `sablon` ·
//        `ornek`) yolları `oku` üyesine ulaşmaz; ölçüm kök-görelidir ki kökün
//        kendi üst dizinleri yanlış pozitif üretmesin (Sol RED-2 dersi).
//     ③ HATA SIZINTISI — kabuğun `oku` gövdesi okuma hatasını hiçbir kullanıcı
//        yüzeyine yazmaz; okunamayan yol yalnız `atlanan` sayacını artırır ve
//        merceğin "taranan" sayısı süzülmüş listeden gelir ki kanaldaki özdeşlik
//        (açıktan + diskten + atlanan = taranan) yapısal kalsın.
//     ④ STR-3 — belge yüzü modülü ile iki nöbeti kapalı ürünün adını ve yolunu
//        anmaz; kapalı kökün yer tutucusu motorun tek kaynağından okunur
//        (kok-yuzeyi.test.ts deseni) ve yazıya sabit geçirilmez.
//
//   Saf modül kabuksuz sınanır (tur-belgesi.test.ts sahte kabuk deseni); kabuğun
//   süzgeci uyguladığı ise kaynak metninden ölçülür, çünkü saf süzgecin doğru
//   olması kabuğun onu çağırdığını kanıtlamaz.
//   Koşum: cd eklenti && npm test
// ═══════════════════════════════════════════════════════════════════════════
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { basename, dirname, join, resolve } from "node:path";
import type * as vscode from "vscode";
import { type BelgeKabugu, diskBelgesi, erisimSiniri, turBelgeleriniTopla } from "../src/tur-belgesi.ts";
import { SAR_DISLANANLAR } from "../src/izleyici-cekirdek.ts";
import { kapsamIcinde } from "../src/yolharitasi-cekirdek.ts";
import { GIZLI_KOK_ADI } from "../../cekirdek/src/kok-yuzeyi.ts";

/** Sahte kimlik — gerçek `Uri` yerine yalnız yol taşır; modül vscode çağırmaz. */
const uriYap = (fsPath: string): vscode.Uri => ({ fsPath } as unknown as vscode.Uri);

/**
 * Sahte kabuk: `oku` üyesi kendisine ULAŞAN her yolu kaydeder. Nöbetin ölçüsü
 * bu kayıttır; süzgeç bir yolu geçirirse yol burada görünür.
 */
function kabukYap(disk: Record<string, string> = {}): { kabuk: BelgeKabugu; okunanlar: string[] } {
  const okunanlar: string[] = [];
  const kabuk: BelgeKabugu = {
    açıkBelge: () => undefined,
    dilKimliği: () => undefined,
    oku: async (yol) => {
      okunanlar.push(yol);
      return yol in disk
        ? { belge: diskBelgesi(uriYap(yol), disk[yol]!), bayt: Buffer.byteLength(disk[yol]!, "utf8") }
        : undefined;
    },
  };
  return { kabuk, okunanlar };
}

const KÖK = "/ws/depo";

// ── ① KÖK SINIRI: KÖK DIŞI YOL OKUNMAZ ────────────────────────────────────────

test("SINIR: /etc/passwd ve <kök>/../disari.sar enjekte edilince ikisi de oku üyesine ULAŞMAZ", async () => {
  const içeride = `${KÖK}/plan/a.sar`;
  const dışarısı = `${KÖK}/../disari.sar`;
  const yollar = [içeride, "/etc/passwd", dışarısı, `${KÖK}-arsiv/b.sar`, "/ws/depo2/c.sar", "/ws/d.sar"];
  // Diskte hepsi vardır; okunmamaları süzgecin işidir, diskin yokluğunun değil.
  const disk = Object.fromEntries(yollar.map((y) => [y, "Faz( kod: X )"]));
  const { kabuk, okunanlar } = kabukYap(disk);

  const { belgeler, sayaç } = await turBelgeleriniTopla(erisimSiniri(yollar, [KÖK]), kabuk);

  assert.deepEqual(okunanlar, [içeride],
    "kök dışı bir yol kabuğun oku üyesine ulaştı; tur çalışma alanının dışını okuyor");
  assert.ok(!okunanlar.includes("/etc/passwd"), "sistem dosyası okundu");
  assert.ok(!okunanlar.includes(dışarısı),
    "üst dizin parçası çözülmeden önek karşılaştırıldı; <kök>/../ yolu kökün içinde sayıldı");
  assert.deepEqual([...belgeler.keys()], [içeride]);
  assert.deepEqual(sayaç, { açıktan: 0, diskten: 1, atlanan: 0 },
    "kök dışı yol sayaca girdi; sınır dışı yol turun evreninde değildir ve sayılmaz");
});

test("SINIR: çok köklü çalışma alanında her kökün altı geçer, geçen yol OLDUĞU GİBİ döner", () => {
  const kökler = ["/ws/a", "/ws/b/"];
  const içeride = ["/ws/a/x.sar", "/ws/b/y/z.sar", "/ws/a/x/../y.sar"];
  const dışarıda = ["/ws/c/x.sar", "/ws/a/../c/x.sar", "/ws/ab/x.sar", "/x.sar", "../x.sar"];
  assert.deepEqual(erisimSiniri([...dışarıda, ...içeride], kökler), içeride,
    "kök sınırı yanlış yerden geçiyor ya da geçen yol yeniden yazıldı; " +
    "dönen yol açık belge haritasının anahtarıdır ve olduğu gibi kalmalıdır");
  // Kök verilmemişse hiçbir yol geçmez: çalışma alanı yoksa tur da yoktur.
  assert.deepEqual(erisimSiniri(içeride, []), []);
  // Windows ayırıcısı: üst dizin parçası ters bölü ile de çözülür.
  assert.deepEqual(erisimSiniri(["C:\\ws\\plan\\a.sar", "C:\\ws\\..\\dis.sar"], ["C:\\ws"]),
    ["C:\\ws\\plan\\a.sar"], "ters bölülü yolda üst dizin parçası çözülmedi");
});

test("SINIR: iç içe köklerde yol, kapsayan HERHANGİ bir köke göre meşruysa geçer", () => {
  // `/ws/dist/depo/plan/a.sar` dış köke göre `dist/` altındadır ve düşerdi; iç köke
  // göre `plan/a.sar` olduğu için meşrudur. `/ws/dist/baska.sar` ise hiçbir köke göre
  // meşru değildir: dış köke göre `dist/` altında, iç kökün ise dışındadır.
  const geçmeli = "/ws/dist/depo/plan/a.sar";
  const düşmeli = "/ws/dist/baska.sar";
  for (const kökler of [["/ws", "/ws/dist/depo"], ["/ws/dist/depo", "/ws"]]) {
    assert.deepEqual(erisimSiniri([geçmeli, düşmeli], kökler), [geçmeli],
      `iç içe köklerde sınır yalnız ilk kapsayan köke bakıyor ya da dış kökün dışlaması iç kökü eziyor (kökler: ${kökler.join(" · ")})`);
  }
});

// ── ② DIŞLAMA: GİZLİ VE DIŞLANAN DİZİNLER OKUNMAZ ─────────────────────────────

test("DIŞLAMA: gizli ve dışlanan dizinlerin yolları oku üyesine ulaşmaz", async () => {
  // Adımın saydığı yedi ad burada AÇIKÇA yazılır ve tek kaynakla (SAR_DISLANANLAR)
  // kesiştirilir; listeden bir ad düşerse bu nöbet onu görür.
  const beklenen = ["node_modules", "dist", "arsiv", "fikstur", "sablon", "ornek"];
  for (const ad of beklenen) {
    assert.ok((SAR_DISLANANLAR as readonly string[]).includes(ad), `dışlama listesinden düşmüş: ${ad}`);
  }
  const gizliler = [".git", ".vscode", ".claude"];
  const içeride = `${KÖK}/is/plan/h.sar`;
  const dışlananlar = [
    ...beklenen.map((ad) => `${KÖK}/${ad}/x.sar`),
    ...gizliler.map((ad) => `${KÖK}/${ad}/x.sar`),
    `${KÖK}/urun/node_modules/paket/y.sar`,   // iç içe: parça ortada da olsa dışlanır
    `${KÖK}/urun/eklenti/dist/z.sar`,
  ];
  const yollar = [...dışlananlar, içeride];
  const { kabuk, okunanlar } = kabukYap(Object.fromEntries(yollar.map((y) => [y, "Faz( kod: X )"])));

  const { sayaç } = await turBelgeleriniTopla(erisimSiniri(yollar, [KÖK]), kabuk);

  assert.deepEqual(okunanlar, [içeride],
    "dışlama evrenindeki bir yol okundu; tarama globu ile okuma sınırı ayrıştı");
  assert.deepEqual(sayaç, { açıktan: 0, diskten: 1, atlanan: 0 });
});

test("DIŞLAMA: ölçüm kök-görelidir; kökün kendi üst dizinleri gizli ya da dışlanan ad taşısa bile dosya okunur", () => {
  // Sol RED-2 dersi: mutlak yolda üst dizin adları elenmeye katılırsa `.claude/worktrees`
  // altındaki bir depo bütünüyle kapsam dışı sayılır ve panel sessizce boşalır.
  const kök = "/ws/.claude/worktrees/dist/depo";
  assert.deepEqual(erisimSiniri([`${kök}/plan/a.sar`, `${kök}/.git/x.sar`, `${kök}/dist/y.sar`], [kök]),
    [`${kök}/plan/a.sar`],
    "dışlama mutlak yola uygulanmış; kökün üst dizinleri dosyayı kapsam dışı bıraktı ya da kök-göreli dışlama çalışmadı");
  // Dosya ADI dışlanmaz; yalnız dizin parçaları ölçülür (glob sözleşmesi).
  assert.deepEqual(erisimSiniri([`${KÖK}/plan/dist.sar`, `${KÖK}/plan/.gizli.sar`], [KÖK]),
    [`${KÖK}/plan/dist.sar`, `${KÖK}/plan/.gizli.sar`]);
});

// ── KAYNAK METNİ: KABUK SÜZGECİ UYGULAR ───────────────────────────────────────
//
//   Saf süzgecin doğruluğu kabuğun onu çağırdığını kanıtlamaz; tek satırlık bir
//   geri alma kök dışı yolu yeniden okutur ve yukarıdaki dört nöbet bunu görmez.

const EKLENTI_KAYNAK = readFileSync(fileURLToPath(new URL("../src/eklenti.ts", import.meta.url)), "utf8");

/** `denetleHepsi` gövdesi (tur-belgesi.test.ts dilim deseni). */
function denetleHepsiGövdesi(): string {
  const baş = EKLENTI_KAYNAK.indexOf("const denetleHepsi");
  const son = EKLENTI_KAYNAK.indexOf("const denetimKilidi", baş);
  assert.ok(baş >= 0 && son > baş, "denetleHepsi gövdesi bulunamadı; nöbet boşlukta ölçüm yapamaz");
  return EKLENTI_KAYNAK.slice(baş, son);
}

/** Süzülmüş yol listesinin tanım satırı (`const yollar = …;`). */
function yollarTanımı(gövde: string): string {
  const baş = gövde.indexOf("const yollar =");
  assert.ok(baş >= 0, "süzülmüş yol listesi (const yollar) bulunamadı");
  return gövde.slice(baş, gövde.indexOf("\n", baş));
}

test("KAYNAK: denetleHepsi yol listesini erişim sınırından geçirerek toplar", () => {
  const gövde = denetleHepsiGövdesi();
  const tanım = yollarTanımı(gövde);
  assert.match(tanım, /^const yollar = erisimSiniri\(/,
    "kabuk yol listesini süzgeçsiz kuruyor; kök dışı ya da dışlanan yol oku üyesine ulaşır");
  assert.ok(tanım.includes("dosyalar.map"), "süzgeç dosya aramasının sonucunu değil başka bir listeyi süzüyor");
  assert.ok(tanım.includes("workspaceFolders"), "süzgece çalışma alanı kökleri verilmiyor; sınır boşlukta ölçülür");
  // Toplama çağrısı süzülmüş listeyi alır; kabukta ikinci, süzgeçsiz bir çağrı saklanamaz.
  assert.match(gövde, /turBelgeleriniTopla\(\s*yollar\s*,/,
    "toplama çağrısı süzülmüş listeyi (yollar) almıyor");
  assert.equal((EKLENTI_KAYNAK.match(/turBelgeleriniTopla\(/g) ?? []).length, 1,
    "kabukta birden fazla toplama çağrısı var; her biri süzgeçten geçmelidir");
});

test("KAYNAK: merceğin taranan sayısı (dosyaSayısı) süzülmüş listeden gelir", () => {
  // Kanal "açıktan + diskten + atlanan = taranan" özdeşliğini vadeder. Sayaçlar
  // süzülmüş listeden dolar; taranan sayı süzgeç ÖNCESİ listeden gelirse sınırın
  // düşürdüğü her yol özdeşliği sessizce bozar ve kanal yalan söyler.
  const gövde = denetleHepsiGövdesi();
  const sayılar = [...gövde.matchAll(/dosyaSayısı:\s*([\p{L}\p{N}_.]+)/gu)].map((eş) => eş[1]);
  assert.deepEqual(sayılar, ["yollar.length"],
    "merceğin taranan sayısı süzülmüş listeden (yollar.length) gelmiyor; kanal özdeşliği yapısal değil");
});

// ── ③ HATA SIZINTISI: OKUMA HATASI YÜZEYE YAZILMAZ ───────────────────────────

test("KAYNAK: kabuğun oku üyesi okuma hatasını kullanıcı yüzeyine sızdırmaz", () => {
  const gövde = denetleHepsiGövdesi();
  const baş = gövde.indexOf("oku: async");
  const son = gövde.indexOf("turProgramlariniKur(", baş);
  assert.ok(baş >= 0 && son > baş, "oku gövdesi bulunamadı");
  const oku = gövde.slice(baş, son);
  for (const yasak of ["showErrorMessage", "showWarningMessage", "showInformationMessage", "appendLine", "console."]) {
    assert.ok(!oku.includes(yasak),
      `oku gövdesi hatayı yüzeye yazıyor (${yasak}); mutlak yol kullanıcı yüzeyine sızar`);
  }
  // Hata nesnesi bağlanmaz bile: mesajı mutlak yolu taşır ve bağlanmayan bir nesne iletilemez.
  assert.match(oku, /catch\s*\{\s*return undefined;/,
    "oku gövdesi hata nesnesini bağlıyor ya da undefined dışında bir şey döndürüyor");
});

test("SAYAÇ: okunamayan yol yalnız atlanan sayacını artırır ve haritaya girmez", async () => {
  const okunabilen = `${KÖK}/a.sar`;
  const okunamayan = `${KÖK}/silinmis.sar`;
  const { kabuk, okunanlar } = kabukYap({ [okunabilen]: "Faz( kod: A )" });
  const { belgeler, sayaç, okunanBayt } = await turBelgeleriniTopla(erisimSiniri([okunabilen, okunamayan], [KÖK]), kabuk);
  assert.deepEqual(okunanlar, [okunabilen, okunamayan], "kök içindeki yol süzgeçte kaldı; evren daraldı");
  assert.deepEqual(sayaç, { açıktan: 0, diskten: 1, atlanan: 1 }, "okuma hatası yalnız atlanan sayacına düşmeli");
  assert.ok(!belgeler.has(okunamayan), "okunamayan yol haritaya girdi");
  assert.equal(okunanBayt, Buffer.byteLength("Faz( kod: A )", "utf8"), "okunamayan yol bayt sayımına karıştı");
});

// ── ④ STR-3: KAPALI ÜRÜNÜN ADI VE YOLU ANILMAZ ───────────────────────────────

/** Açık aracın kökü (urun/eklenti/sinama → sarmal). */
const SARMAL_KOK = fileURLToPath(new URL("../../../", import.meta.url));

/** Nöbetin kapsadığı üç dosya: saf modül, belge yolu nöbeti ve bu dosyanın kendisi. */
const SINIR_DOSYALARI = [
  "../src/tur-belgesi.ts", "./tur-belgesi.test.ts", "./tur-erisim.test.ts",
  // PRF-TA-A06: tek ağaç Blokunun yeni modülleri de sınır nöbetindedir.
  "../src/tur-goruntusu.ts", "../src/yolharitasi-cekirdek.ts", "./tur-goruntusu.test.ts",
].map((y) => fileURLToPath(new URL(y, import.meta.url)));

test("STR-3: belge yüzü modülü ile nöbetleri kapalı ürünün adını ve yolunu anmaz", (t) => {
  const evAdları = ["Users", "home"].map((ad) => `/${ad}/`);
  for (const dosya of SINIR_DOSYALARI) {
    assert.ok(existsSync(dosya), `nöbetin kapsadığı dosya diskte yok: ${dosya}`);
    const metin = readFileSync(dosya, "utf8");
    const ad = basename(dosya);
    // Yer tutucu bile anılmaz: belge yüzünün kapalı ürünle hiçbir işi yoktur.
    assert.ok(!metin.includes(GIZLI_KOK_ADI), `${ad}: kapalı kökün yer tutucusu anılıyor`);
    // Göreli her yol açık aracın kökünde kalır; kapalı ürüne giden yol köke çıkmadan yazılamaz.
    for (const eş of metin.matchAll(/["'`](\.\.?\/[^"'`\n]*)["'`]/g)) {
      const hedef = resolve(dirname(dosya), eş[1]!);
      assert.ok(kapsamIcinde(hedef, SARMAL_KOK), `${ad}: açık aracın kökü dışına çıkan yol anılıyor (${eş[1]})`);
    }
    // Makine yolu anılmaz; çatı kökü ancak böyle bir yolla adlandırılabilirdi.
    for (const ev of evAdları) assert.ok(!metin.includes(ev), `${ad}: makine yolu anılıyor (${ev})`);
  }
  // Çatı düzeyindeki kardeş varlıklar diskte varsa adları da ölçülür (kok-yuzeyi.test.ts
  // deseni): ad koda sabit yazılmaz, çünkü sabit ad klasör yeniden adlandırılınca nöbeti
  // sessizce körleştirir. Kardeş yoksa atlama sessiz değildir; tanı satırı olarak düşer.
  const çatı = resolve(SARMAL_KOK, "..");
  const kendi = basename(resolve(SARMAL_KOK));
  const kardeşler = readdirSync(çatı, { withFileTypes: true })
    .filter((g) => g.isDirectory() && g.name !== kendi && !g.name.startsWith("."))
    .map((g) => g.name)
    .filter((ad) => existsSync(join(çatı, ad, `${ad}_anadizin.sar`)));
  if (kardeşler.length === 0) {
    t.diagnostic("KAPSAM KAYBI: çatıda anadizinli kardeş varlık yok — kapalı ürünün adı bu koşumda ölçülmedi.");
    return;
  }
  for (const dosya of SINIR_DOSYALARI) {
    const metin = readFileSync(dosya, "utf8");
    for (const kardeş of kardeşler) {
      const desen = new RegExp(`(^|[^\\p{L}\\p{N}])${kardeş}([^\\p{L}\\p{N}]|$)`, "iu");
      assert.ok(!desen.test(metin), `${basename(dosya)}: kardeş varlığın adı anılıyor`);
    }
  }
});

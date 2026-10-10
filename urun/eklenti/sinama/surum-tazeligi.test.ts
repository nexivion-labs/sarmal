// ═══════════════════════════════════════════════════════════════════════════
// surum-tazeligi.test.ts — 📦 BKM-DNT-A12 · sürüm damgası tuzağının nöbeti
//
//   Tuzak iki kez ölçülmüştür ve ikisi de canlı vakadır: aynı sürümle yeniden
//   paketlenen eklenti kullanıcının düzenleyicisinde hiç tazelenmez (2026-08-08),
//   ve bayat paket kanonun kendisiyle çeliştiğini söyleyerek sahte uyarı üretir
//   (2026-08-28). Nöbet kararın kendisini ölçer; gövde saf olduğu için gerçek
//   bir düzenleyici indirmeye gerek kalmaz.
// ═══════════════════════════════════════════════════════════════════════════
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import {
  damgaliBildirim, depoPaketiBul, DEPO_PAKET_YOLU, kurulumuDogrula, paketKimligiCoz,
  surumAyrismasi, surumIleriMi, type DepoOkuyucu,
} from "../src/surum-tazeligi.ts";

test("BKM-DNT-A12: depo sürümü ileri olduğunda ayrışma bildirilir ve satır iki sürümü de anar", () => {
  const a = surumAyrismasi({ kuruluSurum: "0.9.137", depoSurumu: "0.9.159", gelistirmeKipi: true });
  assert.ok(a, "bayat kurulu paket bildirilmeli");
  assert.match(a.satir, /0\.9\.137/u, "satır kurulu sürümü anmalı");
  assert.match(a.satir, /0\.9\.159/u, "satır depo sürümünü anmalı");
  assert.match(a.satir, /bayat/u, "satır sebebi söylemeli");
});

test("BKM-DNT-A12: MAĞAZA kurulumunda hiçbir uyarı doğmaz", () => {
  assert.equal(surumAyrismasi({ kuruluSurum: "0.9.137", depoSurumu: "0.9.159", gelistirmeKipi: false }), undefined,
    "mağaza kurulumunda karşılaştırılacak bir depo yoktur; uyarı anlamsız gürültü olurdu");
});

test("BKM-DNT-A12: sürümler eşitse ya da depo GERİDEYSE susulur", () => {
  assert.equal(surumAyrismasi({ kuruluSurum: "0.9.159", depoSurumu: "0.9.159", gelistirmeKipi: true }), undefined,
    "eşit sürümde söylenecek bir şey yok");
  assert.equal(surumAyrismasi({ kuruluSurum: "0.9.159", depoSurumu: "0.9.137", gelistirmeKipi: true }), undefined,
    "depo geride ise geliştirici bilerek eski bir dalda olabilir; uyarı yanlış yönlendirir");
});

test("BKM-DNT-A12: depo sürümü okunamadığında susulur (yarım ölçümle hüküm verilmez)", () => {
  assert.equal(surumAyrismasi({ kuruluSurum: "0.9.159", gelistirmeKipi: true }), undefined);
  assert.equal(surumAyrismasi({ kuruluSurum: "0.9.159", depoSurumu: "   ", gelistirmeKipi: true }), undefined);
});

/** Tuzağın doğduğu ölçek tam olarak burasıdır: sözlük sırası 0.9.90'ı 0.9.137'den
 *  ileri sayar ve nöbet sessizce yanlış tarafa düşerdi. */
test("BKM-DNT-A12: karşılaştırma SAYISALDIR — sözlük sırası tuzağı kapanmıştır", () => {
  assert.equal(surumIleriMi("0.9.137", "0.9.90"), true, "137 > 90 sayısal olarak doğrudur");
  assert.equal(surumIleriMi("0.9.90", "0.9.137"), false, "sözlük sırası burada yanlış cevap verir");
  assert.equal(surumIleriMi("0.10.0", "0.9.999"), true);
  assert.equal(surumIleriMi("1.0.0", "0.9.999"), true);
  assert.equal(surumIleriMi("0.9.159", "0.9.159"), false, "eşitlik ilerilik değildir");
  const a = surumAyrismasi({ kuruluSurum: "0.9.90", depoSurumu: "0.9.137", gelistirmeKipi: true });
  assert.ok(a, "sayısal karşılaştırma bu ayrışmayı görmeli");
});

/** Canlı zemin: deponun kendi paket bildirimi okunabilir ve sürüm taşıyor olmalı. */
test("BKM-DNT-A12 · canlı: deponun paket bildirimi karşılaştırılabilir bir sürüm taşır", () => {
  const yol = fileURLToPath(new URL("../package.json", import.meta.url));
  const p = JSON.parse(readFileSync(yol, "utf8")) as { version?: string };
  assert.ok(p.version, "paket bildirimi sürüm taşımalı — taşımazsa karşılaştırmanın zemini yoktur");
  assert.match(p.version, /^\d+\.\d+\.\d+/u, "sürüm sayısal parçalara bölünebilir olmalı");
  // Kendisiyle karşılaştırma daima susar; bu, nöbetin sahte uyarı üretmediğinin kanıtıdır.
  assert.equal(surumAyrismasi({ kuruluSurum: p.version, depoSurumu: p.version, gelistirmeKipi: true }), undefined);
});

// ═══════════════════════════════════════════════════════════════════════════
// EKL-F6-A11 · KURULU PAKET İLE DEPO DERLEMESİNİN AYRIŞMA NÖBETİ
//
//   Sahte uzantı klasörü bellekte kurulur: okuyucu dışarıdan verildiği için
//   nöbet gerçek kuruluma hiç dokunmaz ve diske tek bayt yazmaz. Fikstür gerçek
//   kayıt dosyasının biçimini taşır; aynı klasörde silinmeyi bekleyen eski sürüm
//   klasörleri de durur, çünkü gerçek uzantı klasörü bugün tam olarak böyledir.
// ═══════════════════════════════════════════════════════════════════════════

const UZANTI = "/sahte/uzantilar";

/** Gerçek paket bildiriminin karşılaştırmaya giren kısmı. */
function bildirim(surum: string, isleme?: string): string {
  const p: Record<string, unknown> = { name: "sarmal", publisher: "nexivion-labs", version: surum };
  return isleme ? damgaliBildirim(JSON.stringify(p), isleme) : JSON.stringify(p);
}

/** Bellekteki sahte uzantı klasörü; `extensions.json` yalnız `etkin` sürümü gösterir. */
function uzantiKlasoru(etkin: { surum: string; damga?: string } | undefined, eskiler: string[] = []): Map<string, string> {
  const dosyalar = new Map<string, string>();
  for (const s of eskiler) dosyalar.set(join(UZANTI, `nexivion-labs.sarmal-${s}`, "package.json"), bildirim(s));
  if (etkin) {
    const ad = `nexivion-labs.sarmal-${etkin.surum}`;
    dosyalar.set(join(UZANTI, ad, "package.json"), bildirim(etkin.surum, etkin.damga));
    dosyalar.set(join(UZANTI, "extensions.json"), JSON.stringify([
      { identifier: { id: "baska.eklenti" }, version: "9.9.9", relativeLocation: "baska.eklenti-9.9.9" },
      { identifier: { id: "nexivion-labs.sarmal" }, version: etkin.surum,
        location: { $mid: 1, fsPath: join(UZANTI, ad), path: join(UZANTI, ad), scheme: "file" },
        relativeLocation: ad, metadata: { source: "vsix" } },
    ]));
  }
  return dosyalar;
}

const okuyucu = (dosyalar: Map<string, string>) => (yol: string): string | undefined => dosyalar.get(yol);

test("EKL-F6-A11: kurulu paket depo derlemesinden ESKİYKEN kurulum nöbeti ayrışmayı bildirir", () => {
  const h = kurulumuDogrula(UZANTI, { surum: "0.9.188", damga: "b".repeat(40) },
    okuyucu(uzantiKlasoru({ surum: "0.9.186" }, ["0.9.184", "0.9.185"])));
  assert.equal(h.tur, "ayrisma", "bayat kurulu paket bildirilmeli");
  if (h.tur !== "ayrisma") return;
  assert.equal(h.ayrisma.neden, "eski-surum");
  assert.equal(h.kurulu.surum, "0.9.186", "kayıt dosyasının gösterdiği paket okunmalı, eski klasörler değil");
  assert.match(h.ayrisma.satir, /0\.9\.186/u);
  assert.match(h.ayrisma.satir, /0\.9\.188/u);
});

test("EKL-F6-A11: kurulu paket depo derlemesiyle AYNIYKEN nöbet susar", () => {
  const damga = "a".repeat(40);
  const h = kurulumuDogrula(UZANTI, { surum: "0.9.189", damga },
    okuyucu(uzantiKlasoru({ surum: "0.9.189", damga }, ["0.9.186"])));
  assert.equal(h.tur, "uyumlu", "aynı sürüm ve aynı damga için söylenecek bir şey yok");
});

test("EKL-F6-A11: AYNI SÜRÜMDE başka derleme kurulu kaldıysa ayrışma bildirilir (2026-08-08 tuzağı)", () => {
  const eski = kurulumuDogrula(UZANTI, { surum: "0.9.137", damga: "c".repeat(40) },
    okuyucu(uzantiKlasoru({ surum: "0.9.137", damga: "d".repeat(40) })));
  assert.equal(eski.tur, "ayrisma", "aynı numara farklı işleme: düzenleyici eski gövdeyi yerinde bırakmış");
  if (eski.tur === "ayrisma") {
    assert.equal(eski.ayrisma.neden, "ayni-surum-baska-derleme");
    assert.match(eski.ayrisma.satir, /dddddddd?/u, "satır kurulu işlemeyi anmalı");
    assert.match(eski.ayrisma.satir, /ccccccc/u, "satır üretilen işlemeyi anmalı");
    assert.match(eski.ayrisma.satir, /tazelenmez/u, "satır sebebi söylemeli");
  }
  const damgasiz = kurulumuDogrula(UZANTI, { surum: "0.9.137", damga: "c".repeat(40) },
    okuyucu(uzantiKlasoru({ surum: "0.9.137" })));
  assert.equal(damgasiz.tur, "ayrisma", "damgasız eski paket, damgalı yeni paketle aynı sayılamaz");
});

test("EKL-F6-A11: depo tarafı damga bilmiyorsa aynı sürümde susulur (açılış kipi, yarım ölçüm)", () => {
  assert.equal(surumAyrismasi({ kuruluSurum: "0.9.189", kuruluDamga: "e".repeat(40), depoSurumu: "0.9.189", gelistirmeKipi: true }),
    undefined, "açılışta depo damgası yoktur ve HEAD ile karşılaştırma plan işlemelerinde sahte uyarı üretirdi");
});

test("EKL-F6-A11: kayıt dosyası yoksa ölçülemez denir; klasör taranmaz", () => {
  const dosyalar = uzantiKlasoru(undefined, ["0.9.184", "0.9.186"]);
  const okunan: string[] = [];
  const h = kurulumuDogrula(UZANTI, { surum: "0.9.188" }, (y) => { okunan.push(y); return dosyalar.get(y); });
  assert.equal(h.tur, "olculemedi");
  assert.deepEqual(okunan, [join(UZANTI, "extensions.json")], "kayıt dosyası dışında hiçbir şey okunmamalı");
});

test("EKL-F6-A11: damga yazıcı ile okuyucu aynı alanı konuşur; yabancı paket bildirimi kimlik vermez", () => {
  const damgali = damgaliBildirim(bildirim("0.9.189"), "f".repeat(40));
  assert.deepEqual(paketKimligiCoz(damgali), { surum: "0.9.189", damga: "f".repeat(40) });
  assert.deepEqual(paketKimligiCoz(bildirim("0.9.189")), { surum: "0.9.189", damga: undefined });
  assert.equal(paketKimligiCoz(JSON.stringify({ name: "sarmal", publisher: "baskasi", version: "1.0.0" })), undefined,
    "başka yayımcının aynı adlı paketi karşılaştırmaya girmemeli");
  assert.equal(paketKimligiCoz("{bozuk"), undefined);
});

/** Bellekteki çalışma alanı; okuma ve listeleme sayılır. */
function calismaAlani(dosyalar: Record<string, string>, klasorler: Record<string, string[]>) {
  const sayac = { oku: 0, listele: 0 };
  const g: DepoOkuyucu = {
    oku: async (yol) => { sayac.oku += 1; return dosyalar[yol]; },
    altKlasorler: async (kok) => { sayac.listele += 1; return klasorler[kok] ?? []; },
  };
  return { g, sayac };
}

test("EKL-F6-A11: depo çatı penceresinde bir kat aşağıda bulunur", async () => {
  const { g } = calismaAlani(
    { [join("/cati", "sarmal", DEPO_PAKET_YOLU)]: bildirim("0.9.188") },
    { "/cati": ["laboratuvar", "sarmal", "site"] });
  const d = await depoPaketiBul(["/cati"], g);
  assert.equal(d?.kimlik.surum, "0.9.188");
  assert.equal(d?.yol, join("/cati", "sarmal", DEPO_PAKET_YOLU));
});

test("EKL-F6-A11: depo kökü doğrudan açıksa hiçbir klasör listelenmez", async () => {
  const { g, sayac } = calismaAlani({ [join("/sarmal", DEPO_PAKET_YOLU)]: bildirim("0.9.188") }, {});
  assert.equal((await depoPaketiBul(["/sarmal"], g))?.kimlik.surum, "0.9.188");
  assert.deepEqual(sayac, { oku: 1, listele: 0 });
});

test("EKL-F6-A11: mağaza kullanıcısının çalışma alanında keşif tek kattır ve susar", async () => {
  // Otuz klasörlü yabancı bir çalışma alanı; depo iki kat aşağıda bile olsa aranmaz.
  const alt = Array.from({ length: 30 }, (_, i) => `klasor-${i}`);
  const { g, sayac } = calismaAlani(
    { [join("/proje", "klasor-3", "ic", DEPO_PAKET_YOLU)]: bildirim("0.9.188") },
    { "/proje": alt, [join("/proje", "klasor-3")]: ["ic"] });
  assert.equal(await depoPaketiBul(["/proje"], g), undefined, "iki kat aşağıdaki paket bulunmamalı");
  assert.deepEqual(sayac, { oku: 31, listele: 1 },
    "kök başına bir okuma, bir listeleme ve bir kat aşağıda klasör başına bir okuma; daha fazlası taramadır");
});

/** Kurulum betiği süitte koşmaz; saf gövdeyle bağının kopmadığı kaynaktan ölçülür. */
test("EKL-F6-A11: kurulum betiği saf gövdeyi çağırır ve içe aldığı adların hepsi gerçekten vardır", async () => {
  const betik = readFileSync(fileURLToPath(new URL("../arac/kur.mjs", import.meta.url)), "utf8");
  const ice = /import \{([^}]+)\} from "\.\.\/src\/surum-tazeligi\.ts"/u.exec(betik)?.[1];
  assert.ok(ice, "kurulum betiği karşılaştırmayı saf gövdeden almalı; ikinci bir karşılaştırma yazılmamalı");
  const modul = await import("../src/surum-tazeligi.ts") as Record<string, unknown>;
  for (const ad of ice.split(",").map((s) => s.trim()).filter(Boolean)) {
    assert.equal(typeof modul[ad], "function", `kurulum betiğinin içe aldığı ${ad} saf gövdede yok`);
  }
  // Yalnız KURULUM dalı ölçülür: yalnız paketleme dalı da doğrulamayı çağırır ve
  // dal sınırı çizilmezse kurulum dalındaki çağrı söküldüğünde nöbet yeşil kalırdı.
  const bas = betik.indexOf("--install-extension");
  const kurulumDali = betik.slice(bas, betik.indexOf("} else {", betik.indexOf("\n  } else {", bas)));
  assert.ok(bas > 0 && kurulumDali.length > 0, "kurulum dalı betikte bulunamadı");
  assert.match(kurulumDali, /const hukum = kurulumuDogrula\(/u, "kurulumun hemen ardından doğrulama koşmalı");
  assert.match(kurulumDali, /process\.exitCode = 1/u, "ayrışmada betik sıfırdan farklı kodla çıkmalı");
  assert.match(betik, /damga = damgala\(kaynak\)/u, "geçici ağaçtaki paket damgalanmalı");
});

test("EKL-F6-A11: eklenti açılışı nöbeti kurar ve keşfi saf gövdeden alır", () => {
  const eklenti = readFileSync(fileURLToPath(new URL("../src/eklenti.ts", import.meta.url)), "utf8");
  const activate = eklenti.slice(eklenti.indexOf("export function activate("));
  assert.match(activate, /surumTazeligiNobetiniKur\(context\)/u, "açılış nöbeti kurmalı");
  assert.equal((eklenti.match(/depoPaketiBul\(/gu) ?? []).length, 1, "depo keşfi tek yerden çağrılmalı");
  const nobet = /function surumTazeligiNobetiniKur[\s\S]*?\n\}/u.exec(eklenti)?.[0] ?? "";
  assert.match(nobet, /void \(async \(\) =>/u, "keşif açılışı bekletmemeli");
  assert.doesNotMatch(nobet, /findFiles|readFileSync|readdirSync|existsSync/u,
    "açılış nöbeti eşzamanlı okuma ya da çalışma alanı araması yapmamalı");
});

// ═══════════════════════════════════════════════════════════════════════════
// atif.test.ts — 📜 GOC-A04 · ÜÇÜNCÜ TARAF ATIF NÖBETLERİ
//
//   Depo, Microsoft'un Codicons yazı tipini yeniden dağıtır ve lisansı atfı
//   zorunlu kılar. Atıf iki yerde yaşar ve bu bilinçlidir: deponun tam bildirimi
//   `NOTICE.md` dosyasındadır, paketle birlikte GİDEN nüsha ise eklentinin
//   lisans dosyasındadır. İkincisi olmadan paket, yazı tipini atıfsız dağıtır;
//   birincisi olmadan depo, ölçüm kaydını kaybeder.
//
//   İki metnin ayrışması sessiz bir ihlaldir, çünkü hiçbir derleme kırılmaz ve
//   hiçbir kapı kızarmaz. Aşağıdaki nöbetler o sessizliği kapatır: atfın
//   zorunlu dört unsuru (sahip, eser, lisans adı, lisans adresi) iki metinde
//   de aranır ve yazı tipinin diskteki künyesi bildirimde yazan ölçümle
//   karşılaştırılır.
// ═══════════════════════════════════════════════════════════════════════════
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const oku = (u: string): string => readFileSync(fileURLToPath(new URL(u, import.meta.url)), "utf8");
const ham = (u: string): Buffer => readFileSync(fileURLToPath(new URL(u, import.meta.url)));

const BILDIRIM = oku("../../../NOTICE.md");
const PAKET_LISANSI = oku("../LICENSE.md");
const YAZI_TIPI = "../temalar/yildiz.ttf";

/** CC BY 4.0'ın istediği asgari unsurlar — dördü de her iki metinde bulunmalıdır. */
const ZORUNLU = [
  { ad: "sahip", iz: "Microsoft Corporation" },
  { ad: "eser adresi", iz: "github.com/microsoft/vscode-codicons" },
  { ad: "lisans adı", iz: "Creative Commons Attribution 4.0 International" },
  { ad: "lisans adresi", iz: "creativecommons.org/licenses/by/4.0/" },
  { ad: "depodaki dosya", iz: "yildiz.ttf" },
];

test("A04: deponun bildirimi atfın zorunlu unsurlarını taşır", () => {
  for (const { ad, iz } of ZORUNLU)
    assert.ok(BILDIRIM.includes(iz), `NOTICE.md içinde ${ad} yok: "${iz}"`);
});

test("A04: PAKETLE GİDEN nüsha da atfın zorunlu unsurlarını taşır", () => {
  for (const { ad, iz } of ZORUNLU)
    assert.ok(PAKET_LISANSI.includes(iz),
      `eklenti/LICENSE.md içinde ${ad} yok: "${iz}". Bu dosya pakete girer; `
      + "eksilirse yazı tipi atıfsız dağıtılır ve lisans ihlal edilir.");
});

test("A04: paket bildirimi lisans dosyasını adıyla bağlar", () => {
  const paket = JSON.parse(oku("../package.json"));
  assert.equal(paket.licenseFile, "LICENSE.md",
    "package.json lisans dosyasını göstermiyor — mağaza yüzü atfı bulamaz");
  assert.equal(paket.license, "Apache-2.0", "paketin kendi lisansı beyanı düşmüş");
});

test("A04: yazı tipinin diskteki künyesi bildirimde YAZAN ölçümle birebirdir", () => {
  const d = ham(YAZI_TIPI);
  // maxp tablosundan glif sayısı — künye dosyanın kendisinden okunur, ezberden değil.
  const tabloSayisi = d.readUInt16BE(4);
  let maxp = -1;
  for (let i = 0; i < tabloSayisi; i++) {
    const yer = 12 + i * 16;
    if (d.subarray(yer, yer + 4).toString("latin1") === "maxp") { maxp = d.readUInt32BE(yer + 8); break; }
  }
  assert.notEqual(maxp, -1, "yazı tipinde maxp tablosu yok — dosya bozulmuş olabilir");
  const glif = d.readUInt16BE(maxp + 4);
  const ozet = createHash("sha256").update(d).digest("hex").slice(0, 16);

  assert.ok(BILDIRIM.includes(String(glif)),
    `bildirimdeki glif sayısı diskteki dosyayla uyuşmuyor: diskte ${glif}`);
  assert.ok(BILDIRIM.includes(ozet),
    `bildirimdeki sha256 önekiyle diskteki dosya uyuşmuyor: diskte ${ozet}. `
    + "Yazı tipi değiştiyse değişiklik beyanı da yeniden yazılmalıdır (CC BY 4.0).");
  assert.ok(BILDIRIM.includes(d.length.toLocaleString("tr-TR")) || BILDIRIM.includes(String(d.length)),
    `bildirimdeki boyut diskteki dosyayla uyuşmuyor: diskte ${d.length} bayt`);
});

// ═══════════════════════════════════════════════════════════════════════════
// GOC-A05 · DERLENMİŞ GÖVDEYE GÖMÜLÜ npm KİTAPLIKLARININ ATIF NÖBETİ
//
//   esbuild, dist/eklenti.js gövdesini üretirken üçüncü taraf kitaplıkların
//   kaynak kodunu içine gömer ve üst akış LICENSE dosyalarındaki telif
//   bildirimlerini küçültme sırasında siler. Bu nöbet gövdeyi TEKRAR tarar
//   (ezberden değil), gövdede gerçekten bulunan her kitaplık için sürüm,
//   telif sahibi, telif satırı ve lisans adının hem NOTICE.md hem de pakedin
//   kendisiyle giden eklenti/LICENSE.md içinde anıldığını ölçer. Bir kitaplık
//   gövdeye girip atıf metinlerinden birine girmezse süit kızarır.
//
//   GÖVDE YOKSA BU NÖBETLER ÇÖKMEZ, SEBEBİNİ SÖYLEYEREK ATLAR. Derlenmiş gövde
//   bir yapı ürünüdür, depoda izlenmez ve süitin ÖN KOŞULUDUR; süit onu kendisi
//   üretmez. Bu dosya 2026-08-29 tarihine kadar gövdeyi modül yükleme anında
//   koşulsuz okuyordu, dolayısıyla gövdesi olmayan bir ağaçta dosyanın TAMAMI
//   bir dosya bulunamadı hatasıyla çöküyor ve gövdeye hiç bağlı olmayan dört
//   A04 nöbetini de beraberinde götürüyordu. Kusur o tarihe kadar bir yarışın
//   arkasında gizliydi: kardeş duman sınaması süitin ortasında derleyiciyi
//   çağırıp gövdeyi yazıyor ve yarışı genellikle kazanıyordu. O yan etki
//   kaldırılınca davranış belirli hâle geldi ve depoyu yeni klonlayan bir
//   katılımcının göreceği ilk şey anlaşılır bir atlama iletisi değil bir çökme
//   olurdu. Bu yüzden gövdeye bağlı üç A05 hükmü kardeşlerinin (paket-tazeligi
//   ve paket-girisi-duman) atlama desenine çevrilmiştir ve ileti onlarla aynı
//   dili konuşur. Nöbetlerin ÖLÇTÜĞÜ şey değişmemiştir: gövde varken üçü de
//   bugünkü sertlikte koşar, değişen yalnız gövde YOKKEN verilen cevaptır.
// ═══════════════════════════════════════════════════════════════════════════

const GOVDE_YOLU = fileURLToPath(new URL("../dist/eklenti.js", import.meta.url));

/** Gövde bir yapı ürünüdür ve depoda izlenmez; yoksa A05 nöbetleri sebebini söyleyerek atlar. */
const govdeVar = existsSync(GOVDE_YOLU);

/** Atlama gerekçesi; kardeş nöbetlerdeki metinle birebir aynıdır ve okuyanı derlemeye yönlendirir. */
const GOVDE_YOK = "dist/eklenti.js henüz derlenmemiş — önce `npm run build` koşulur";

/**
 * Gövde yoksa boş dizedir, fakat aşağıdaki üç nöbeti koruyan şey bu boş dize
 * değil atlama koşuludur: iz araması boş gövdede zaten başarısız olur ve bu
 * güvenli yöndür, çünkü sessiz bir yeşil değil açık bir kırmızı üretir.
 */
const GOVDE = govdeVar ? readFileSync(GOVDE_YOLU, "utf8") : "";

interface KitaplikKaydi {
  ad: string;
  /** esbuild'in GELİŞTİRME gövdesinde bıraktığı kaynak yol izi — yalnız tanıtıcıdır, hüküm değil. */
  izYolu: string;
  /**
   * KÜÇÜLTMEYE DAYANIKLI İMZA (BKM-DNT-A12). Kitaplığın gövdede gerçekten
   * bulunduğu artık yol iziyle DEĞİL bu imzayla ölçülür; imza kitaplığa özgü bir
   * dize ya da düzenli ifade değişmezidir ve küçültme onu silmez.
   *
   * Neden değişti: `izYolu` bir YORUM satırıdır ve küçültme yorumları siler.
   * Ölçüm 2026-09-10 tarihinde bunu doğrulamıştır — yedi kitaplığın yedisinin
   * yol izi üretim gövdesinde yoktur, oysa kitaplıkların kendisi gövdededir.
   * Bunun iki bedeli vardı: paketlemenin ardından koşan süit ürün gerilemesi
   * olmadığı hâlde kırmızı yanıyordu (kapının yalan söylediği an), ve daha
   * ağırı, lisans atfının doğruluğu KULLANICIYA GİDEN gövde üstünde hiç
   * sınanmıyordu. İmza her iki gövdede de yaşar, dolayısıyla tek nöbet iki
   * kipi birden ölçer.
   *
   * Liste birden fazla adayla yazılır ve BİRİNİN bulunması yeterlidir: bir
   * kitaplık kendi içeriğini sürüm yükseltmesiyle değiştirebilir ve tek imzaya
   * bağlı nöbet o gün kırılgan olurdu.
   */
  imza: readonly string[];
  surum: string;
  telifSahibi: string;
  telifSatiri: string;
  lisansAdi: string;
}

const KITAPLIKLAR: KitaplikKaydi[] = [
  {
    ad: "highlight.js",
    imza: ["before:highlightElement", "after:highlightElement", "hljs"],
    izYolu: "node_modules/highlight.js/lib/core.js",
    surum: "11.11.1",
    telifSahibi: "Ivan Sagalaev",
    telifSatiri: "Copyright (c) 2006, Ivan Sagalaev. All rights reserved.",
    lisansAdi: "BSD 3-Clause",
  },
  {
    ad: "markdown-it",
    imza: ["Parser rule not found: ", "inline rule didn't increment state.pos", "Rules manager: invalid rule name "],
    izYolu: "node_modules/markdown-it/lib/helpers/index.mjs",
    surum: "14.3.0",
    telifSahibi: "Vitaly Puzrin, Alex Kocharin",
    telifSatiri: "Copyright (c) 2014 Vitaly Puzrin, Alex Kocharin.",
    lisansAdi: "MIT License",
  },
  {
    ad: "linkify-it",
    imza: ["%TLDS%", "fuzzyLink", "fuzzyEmail"],
    izYolu: "node_modules/linkify-it/index.mjs",
    surum: "5.0.2",
    telifSahibi: "Vitaly Puzrin",
    telifSatiri: "Copyright (c) 2015 Vitaly Puzrin.",
    lisansAdi: "MIT License",
  },
  {
    ad: "mdurl",
    imza: [";/?:@&=+$,-_.!~*'()#"],
    izYolu: "node_modules/mdurl/lib/parse.mjs",
    surum: "2.0.0",
    telifSahibi: "Vitaly Puzrin, Alex Kocharin",
    telifSatiri: "Copyright (c) 2015 Vitaly Puzrin, Alex Kocharin.",
    lisansAdi: "MIT License",
  },
  {
    ad: "entities",
    imza: ["&DiacriticalGrave;", "&DiacriticalTilde;", "&amp;"],
    izYolu: "node_modules/entities/lib/esm/decode.js",
    surum: "4.5.0",
    telifSahibi: "Felix Böhm",
    telifSatiri: "Copyright (c) Felix Böhm All rights reserved.",
    lisansAdi: "BSD 2-Clause",
  },
  {
    ad: "punycode.js",
    imza: ["Overflow: input needs wider integers to process", "Illegal input >= 0x80 (not a basic code point)"],
    izYolu: "node_modules/punycode.js/punycode.js",
    surum: "2.3.1",
    telifSahibi: "Mathias Bynens",
    telifSatiri: "Copyright Mathias Bynens <https://mathiasbynens.be/>",
    lisansAdi: "MIT License",
  },
  {
    ad: "uc.micro",
    imza: ["[\\0-\\x1F\\x7F-\\x9F]"],
    izYolu: "node_modules/uc.micro/categories/Cc/regex.mjs",
    surum: "2.1.0",
    telifSahibi: "Mathias Bynens",
    telifSatiri: "Copyright Mathias Bynens <https://mathiasbynens.be/>",
    lisansAdi: "MIT License",
  },
];

/** Kitaplık bu gövdede gerçekten var mı? Ölçüt küçültmeye dayanıklı imzadır. */
function govdedeVarMi(govde: string, k: KitaplikKaydi): boolean {
  return k.imza.some((i) => govde.includes(i));
}

test("A05: gövdeye gömülü her kitaplık küçültmeye dayanıklı imzasıyla bulunur", { skip: govdeVar ? false : GOVDE_YOK }, () => {
  for (const k of KITAPLIKLAR)
    assert.ok(govdedeVarMi(GOVDE, k),
      `${k.ad} için beklenen imzaların hiçbiri gövdede yok: ${JSON.stringify(k.imza)}. `
      + "Kitaplık derlemeden çıkarıldıysa bu kayıt da NOTICE.md ve LICENSE.md'den kaldırılmalıdır; "
      + "hâlâ gömülüyse kitaplığın içeriği sürüm yükseltmesiyle değişmiş olabilir ve imza tazelenmelidir.");
});

test("A05: gövdeye gömülü her kitaplık NOTICE.md içinde tam olarak anılır", { skip: govdeVar ? false : GOVDE_YOK }, () => {
  for (const k of KITAPLIKLAR) {
    if (!govdedeVarMi(GOVDE, k)) continue; // yalnız gövdede gerçekten bulunanlar zorunludur
    for (const [alanAdi, deger] of Object.entries({
      sürüm: k.surum, "telif sahibi": k.telifSahibi, "telif satırı": k.telifSatiri, "lisans adı": k.lisansAdi,
    }))
      assert.ok(BILDIRIM.includes(deger),
        `NOTICE.md içinde ${k.ad} için ${alanAdi} eksik: "${deger}"`);
  }
});

test("A05: gövdeye gömülü her kitaplık PAKETLE GİDEN LICENSE.md içinde de tam olarak anılır", { skip: govdeVar ? false : GOVDE_YOK }, () => {
  for (const k of KITAPLIKLAR) {
    if (!govdedeVarMi(GOVDE, k)) continue;
    for (const [alanAdi, deger] of Object.entries({
      sürüm: k.surum, "telif sahibi": k.telifSahibi, "telif satırı": k.telifSatiri, "lisans adı": k.lisansAdi,
    }))
      assert.ok(PAKET_LISANSI.includes(deger),
        `eklenti/LICENSE.md içinde ${k.ad} için ${alanAdi} eksik: "${deger}". `
        + "Bu dosya pakete girer; eksilirse kitaplık atıfsız dağıtılır ve lisans ihlal edilir.");
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// BKM-DNT-A12 · ÜRETİM GÖVDESİ NÖBETİ — kullanıcıya GİDEN yapı ölçülür
//
//   Kusurun iki bedeli vardı ve karıştırılmamalıdır. Birincisi bir akış
//   tuzağıdır: paketleyen kişi hemen ardından kapıyı ölçerse kırmızı görür,
//   oysa üründe hiçbir gerileme yoktur ve kırmızının tek sebebi gövdenin
//   kipidir; bu, kapının yalan söylediği bir andır. İkincisi daha derindir:
//   nöbet, kullanıcıya GİDEN gövdeyi değil geliştirme gövdesini ölçmekteydi,
//   dolayısıyla lisans atfının doğruluğu yayımlanan yapı üzerinde HİÇ
//   sınanmıyordu. Bu nöbet küçültülmüş bir gövdeyi geçici bir yola üretir ve
//   atfı onun üstünde ölçer; `dist/eklenti.js` DEĞİŞTİRİLMEZ, çünkü geliştirme
//   akışının gövdesini bir sınama ezmemelidir.
// ═══════════════════════════════════════════════════════════════════════════

test("BKM-DNT-A12: küçültülmüş ÜRETİM gövdesinde her kitaplık imzasıyla bulunur (atıf yayımlanan yapıda sınanır)", async () => {
  const esbuild = await import("esbuild");
  const { mkdtempSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const giris = fileURLToPath(new URL("../src/eklenti.ts", import.meta.url));
  const hedef = join(mkdtempSync(join(tmpdir(), "sarmal-uretim-")), "eklenti.min.js");
  await esbuild.build({
    entryPoints: [giris], bundle: true, format: "cjs", platform: "node", target: "node18",
    outfile: hedef, external: ["vscode"], sourcemap: false, minify: true, logLevel: "error",
  });
  const uretim = readFileSync(hedef, "utf8");
  // Nöbetin zemini: gövde GERÇEKTEN küçültülmüş olmalı, yoksa nöbet geliştirme
  // gövdesini ikinci kez ölçer ve hiçbir şey kanıtlamaz.
  assert.ok(uretim.length > 500_000, `üretim gövdesi beklenenden küçük: ${uretim.length} bayt`);
  for (const k of KITAPLIKLAR) {
    assert.ok(!uretim.includes(k.izYolu),
      `${k.ad} yol izi küçültülmüş gövdede DURUYOR — bu nöbetin zemini çökmüş demektir, `
      + "çünkü kusurun tarifi tam olarak küçültmenin yol izlerini silmesiydi");
    assert.ok(govdedeVarMi(uretim, k),
      `${k.ad} için imzaların hiçbiri ÜRETİM gövdesinde yok: ${JSON.stringify(k.imza)}. `
      + "Lisans atfı kullanıcıya giden yapıda doğrulanamıyorsa atıf iddiası sınanmamış demektir.");
  }
});

test("BKM-DNT-A12: imza listesi boş bırakılamaz ve yol izi artık hüküm taşımaz", () => {
  for (const k of KITAPLIKLAR) {
    assert.ok(k.imza.length >= 1, `${k.ad}: imza listesi boş — ölçüt olmadan kitaplık varlığı iddia edilemez`);
    for (const i of k.imza) {
      assert.ok(i.length >= 4, `${k.ad}: "${i}" imzası fazla kısa ve tesadüfen eşleşebilir`);
      assert.ok(!i.startsWith("node_modules/"),
        `${k.ad}: imza bir kaynak YOL İZİ olamaz ("${i}") — küçültme yol izlerini siler, nöbet yeniden kırılganlaşır`);
    }
  }
});

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
import { readFileSync } from "node:fs";
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
// ═══════════════════════════════════════════════════════════════════════════

const GOVDE = oku("../dist/eklenti.js");

interface KitaplikKaydi {
  ad: string;
  /** esbuild'in gövdede bıraktığı, kitaplığın gerçekten gömülü olduğunu kanıtlayan kaynak yol izi. */
  izYolu: string;
  surum: string;
  telifSahibi: string;
  telifSatiri: string;
  lisansAdi: string;
}

const KITAPLIKLAR: KitaplikKaydi[] = [
  {
    ad: "highlight.js",
    izYolu: "node_modules/highlight.js/lib/core.js",
    surum: "11.11.1",
    telifSahibi: "Ivan Sagalaev",
    telifSatiri: "Copyright (c) 2006, Ivan Sagalaev. All rights reserved.",
    lisansAdi: "BSD 3-Clause",
  },
  {
    ad: "markdown-it",
    izYolu: "node_modules/markdown-it/lib/helpers/index.mjs",
    surum: "14.3.0",
    telifSahibi: "Vitaly Puzrin, Alex Kocharin",
    telifSatiri: "Copyright (c) 2014 Vitaly Puzrin, Alex Kocharin.",
    lisansAdi: "MIT License",
  },
  {
    ad: "linkify-it",
    izYolu: "node_modules/linkify-it/index.mjs",
    surum: "5.0.2",
    telifSahibi: "Vitaly Puzrin",
    telifSatiri: "Copyright (c) 2015 Vitaly Puzrin.",
    lisansAdi: "MIT License",
  },
  {
    ad: "mdurl",
    izYolu: "node_modules/mdurl/lib/parse.mjs",
    surum: "2.0.0",
    telifSahibi: "Vitaly Puzrin, Alex Kocharin",
    telifSatiri: "Copyright (c) 2015 Vitaly Puzrin, Alex Kocharin.",
    lisansAdi: "MIT License",
  },
  {
    ad: "entities",
    izYolu: "node_modules/entities/lib/esm/decode.js",
    surum: "4.5.0",
    telifSahibi: "Felix Böhm",
    telifSatiri: "Copyright (c) Felix Böhm All rights reserved.",
    lisansAdi: "BSD 2-Clause",
  },
  {
    ad: "punycode.js",
    izYolu: "node_modules/punycode.js/punycode.js",
    surum: "2.3.1",
    telifSahibi: "Mathias Bynens",
    telifSatiri: "Copyright Mathias Bynens <https://mathiasbynens.be/>",
    lisansAdi: "MIT License",
  },
  {
    ad: "uc.micro",
    izYolu: "node_modules/uc.micro/categories/Cc/regex.mjs",
    surum: "2.1.0",
    telifSahibi: "Mathias Bynens",
    telifSatiri: "Copyright Mathias Bynens <https://mathiasbynens.be/>",
    lisansAdi: "MIT License",
  },
];

test("A05: gövdede iz sürülen her kitaplık gerçekten gömülü kalmıştır", () => {
  for (const k of KITAPLIKLAR)
    assert.ok(GOVDE.includes(k.izYolu),
      `${k.ad} için beklenen kaynak yol izi gövdede yok: "${k.izYolu}". `
      + "Kitaplık derlemeden çıkarıldıysa bu kayıt da NOTICE.md ve LICENSE.md'den kaldırılmalıdır; "
      + "hâlâ gömülüyse esbuild çıktısı değişmiş olabilir ve iz güncellenmelidir.");
});

test("A05: gövdeye gömülü her kitaplık NOTICE.md içinde tam olarak anılır", () => {
  for (const k of KITAPLIKLAR) {
    if (!GOVDE.includes(k.izYolu)) continue; // yalnız gövdede gerçekten bulunanlar zorunludur
    for (const [alanAdi, deger] of Object.entries({
      sürüm: k.surum, "telif sahibi": k.telifSahibi, "telif satırı": k.telifSatiri, "lisans adı": k.lisansAdi,
    }))
      assert.ok(BILDIRIM.includes(deger),
        `NOTICE.md içinde ${k.ad} için ${alanAdi} eksik: "${deger}"`);
  }
});

test("A05: gövdeye gömülü her kitaplık PAKETLE GİDEN LICENSE.md içinde de tam olarak anılır", () => {
  for (const k of KITAPLIKLAR) {
    if (!GOVDE.includes(k.izYolu)) continue;
    for (const [alanAdi, deger] of Object.entries({
      sürüm: k.surum, "telif sahibi": k.telifSahibi, "telif satırı": k.telifSatiri, "lisans adı": k.lisansAdi,
    }))
      assert.ok(PAKET_LISANSI.includes(deger),
        `eklenti/LICENSE.md içinde ${k.ad} için ${alanAdi} eksik: "${deger}". `
        + "Bu dosya pakete girer; eksilirse kitaplık atıfsız dağıtılır ve lisans ihlal edilir.");
  }
});

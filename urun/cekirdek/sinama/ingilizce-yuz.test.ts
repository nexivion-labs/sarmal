// ═══════════════════════════════════════════════════════════════════════════
// ingilizce-yuz.test.ts — 🌐 İNGİLİZCE YÜZ ÖLÇERİNİN AYARI (MGZ-A09)
//
//   İngilizce yüz nöbetleri (eklenti/sinama/ingilizce-yuz.test.ts, tanı metni
//   kapsaması) ölçümlerini cekirdek/src/ingilizce-yuz.ts ölçerine yaptırır. Ölçer
//   yanlış ayarlıysa nöbetler ya doğru bir İngilizce cümleyi kırmızıya düşürür ya
//   da yarı çevrilmiş bir cümleyi yeşilden geçirir. Bu dosya ölçerin iki kusuru
//   da yakaladığını ve dosyadaki adları, cümle başındaki büyük harfi, panel
//   adlarını ve çatı adlarını kusur saymadığını ölçer.
//
//   Ad jetonlarının çözümü de burada ölçülür (cevir.ts `adJetonlariniCoz`):
//   aynı sözlük hanesi eklentide dosyadaki adla, MCP öğretim yüzünde sözlüğün
//   karşılığıyla okunur ve tanımlık okunan ada göre seçilir.
// ═══════════════════════════════════════════════════════════════════════════

import { test } from "node:test";
import assert from "node:assert/strict";
import { ingilizceYuzKusurlari } from "../src/ingilizce-yuz.ts";
import { adJetonlariniCoz, sozlukDuzYazisi } from "../src/cevir.ts";

const kusur = (metin: string, izinli: string[] = []): string[] =>
  ingilizceYuzKusurlari(metin, izinli).map((k) => `${k.tur}=${k.sozce}`);

test("ölçer: dosyadaki Türkçe adları anan İngilizce cümle temizdir", () => {
  for (const metin of [
    "An Adım in geliştirmede does not say which file it will produce.",
    "A Kural does not complete its otorite, katman and kapsam trio.",
    "Write the dependency with the `bağımlı: [CODE]` edge; the Blok stays under its own Proje.",
    "Step 2 of the guide: run the check again.",
    "Select to open the Reminders panel.",
    "the top title and action bar (AppBar); the crown of an Ekran",
    "access declaration — `herkese` · `girişli` · role on an Uç",
  ]) assert.deepEqual(kusur(metin), [], metin);
});

test("ölçer: cümlede kalan Türkçe düzyazıyı yakalar", () => {
  assert.deepEqual(kusur("The gate is ready; plan hazır, koda geçebiliriz."), ["turkce-duzyazi=hazır", "turkce-duzyazi=geçebiliriz"]);
  assert.deepEqual(kusur("Example: ekle bir satir"), ["turkce-duzyazi=ekle", "turkce-duzyazi=bir", "turkce-duzyazi=satir"]);
});

test("ölçer: dosyada bulunmayan ad karşılığını yakalar", () => {
  assert.deepEqual(kusur("Declare it with `dependsOn: [CODE]`."), ["ingilizce-ad=dependsOn"]);
  assert.deepEqual(kusur("It enters a Step's context cone."), ["ingilizce-ad=Step"]);
  assert.deepEqual(kusur("the dependsOn and feeds fields"), ["ingilizce-ad=dependsOn"]);
});

test("ölçer: izinli metin ölçümden önce düşer", () => {
  assert.deepEqual(kusur("**ORN** — Adım\n\nBu cümle Türkçe kalır", ["Bu cümle Türkçe kalır"]), []);
  assert.deepEqual(kusur("**ORN** — Adım\n\nBu cümle Türkçe kalır"),
    ["turkce-duzyazi=Bu", "turkce-duzyazi=cümle", "turkce-duzyazi=Türkçe", "turkce-duzyazi=kalır"]);
});

test("ad jetonu: kaynak kipi dosyadaki adı, çeviri kipi sözlüğün karşılığını basar", () => {
  const metin = "⟦A:Adım⟧ wraps ⟦Katman|s⟧ through `⟦bağımlı⟧:`; ⟦a:AltKatman⟧ has ⟦durum=revize⟧ and ⟦a:Blok⟧.";
  assert.equal(adJetonlariniCoz(metin, "en", "kaynak"),
    "An Adım wraps Katman nodes through `bağımlı:`; an AltKatman has revize and a Blok.");
  assert.equal(adJetonlariniCoz(metin, "en", "ceviri"),
    "A Step wraps Layers through `dependsOn:`; a Sublayer has revised and a Block.");
  assert.equal(adJetonlariniCoz("jetonsuz metin", "en", "kaynak"), "jetonsuz metin");
});

test("ad jetonu: eklentinin okuduğu kip dosyadaki adı, varsayılan kip MCP yüzünü korur", () => {
  const kaynak = sozlukDuzYazisi("widgetNe", "Adım", "yaprak", "en", "kaynak");
  const ceviri = sozlukDuzYazisi("widgetNe", "Adım", "yaprak", "en");
  assert.match(kaynak, /`bağımlı: \[CODE\]`/u);
  assert.match(ceviri, /`dependsOn: \[CODE\]`/u);
  assert.equal(sozlukDuzYazisi("widgetNe", "Adım", "yaprak", "tr", "kaynak"), "yaprak", "Türkçe yüz kanonun kendi metnidir");
  assert.deepEqual(ingilizceYuzKusurlari(kaynak), []);
});

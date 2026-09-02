// manifest-menuleri.test.ts — 🪟 Manifestin menü gruplarının nöbeti (BKM-DNT-A05).
//
//   Ölçülmüş kusur: editör başlığındaki "İskeleti Kur" düğmesi yalnız `ana.sar`
//   adlı dosyada görünecek biçimde koşullanmıştı; oysa canlı adlandırma
//   `*_anadizin.sar` desenidir ve bunu doğuş komutu, yol haritasının tarama deseni
//   ve sürüm günlüğü üç ayrı yerden doğrular. Komut paletten çalışıyor, düğme ise
//   kanonik adı kullanan hiçbir projede belirmiyordu; manifest nöbetleri editör
//   başlığı ile görünüm başlığı menü gruplarını hiç ölçmediği için kusur göç
//   artığı olarak yaşamıştı. Bu dosya beş menü grubunu birden kapsama alır ve
//   dosya adı koşulu taşıyan her girdinin canlı adlandırmayla eşleştiğini ölçer.
//
//   İkinci ölçüm boş durum cümlesidir: altı panelin beşi boş durumda bir cümle
//   söylerken Yol Haritası susuyordu. Cümle artık katalogdadır ve iki dilde
//   yaşar; nöbet ikisini de ayrı ayrı okur.

import "./dil-kur.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { YUZEY_BOS_DURUM, yuzeyDiliniAyarla } from "../src/yuzey-metinleri.ts";

const oku = (u: string): string => readFileSync(fileURLToPath(new URL(u, import.meta.url)), "utf8");
type MenuGirdisi = { command: string; when?: string; group?: string };
const PAKET = JSON.parse(oku("../package.json")) as {
  contributes: {
    commands: Array<{ command: string }>;
    menus: Record<string, MenuGirdisi[]>;
  };
};

/** Manifestin bugün ilan ettiği beş menü grubu; yenisi doğarsa bu liste büyür ve nöbet onu da kapsar. */
const MENU_GRUPLARI = ["editor/title", "view/title", "view/item/context", "comments/commentThread/context", "commandPalette"] as const;

/**
 * `when` cümlesindeki dosya adı koşulunu değerlendirir. VS Code'un iki yazımı
 * tanınır: `resourceFilename == ad` eşitliği ve `resourceFilename =~ /desen/`
 * düzenli ifadesi. Koşul başka hiçbir şey söylemiyorsa (dosya adına bakmıyorsa)
 * `undefined` döner ve girdi bu ölçümün dışında kalır.
 */
function dosyaAdiKabulEder(when: string, dosyaAdi: string): boolean | undefined {
  const esitlikler = [...when.matchAll(/resourceFilename\s*==\s*([^\s)|&]+)/g)].map((m) => m[1]);
  const desenler = [...when.matchAll(/resourceFilename\s*=~\s*\/((?:\\\/|[^/])+)\//g)].map((m) => new RegExp(m[1]));
  if (esitlikler.length === 0 && desenler.length === 0) return undefined;
  return esitlikler.includes(dosyaAdi) || desenler.some((d) => d.test(dosyaAdi));
}

test("manifest kapsamı: beş menü grubunun beşi de ilanda vardır ve her girdinin komutu bildirilmiştir", () => {
  const komutlar = new Set(PAKET.contributes.commands.map((k) => k.command));
  for (const grup of MENU_GRUPLARI) {
    const girdiler = PAKET.contributes.menus[grup];
    assert.ok(Array.isArray(girdiler) && girdiler.length > 0, `'${grup}' menü grubu manifestte yok ya da boş`);
    for (const g of girdiler) {
      assert.ok(komutlar.has(g.command), `'${grup}' grubundaki '${g.command}' komutu contributes.commands altında ilan edilmemiş`);
    }
  }
  const bilinmeyen = Object.keys(PAKET.contributes.menus).filter((g) => !(MENU_GRUPLARI as readonly string[]).includes(g));
  assert.deepEqual(bilinmeyen, [], `manifest nöbetin kapsamadığı menü grubu taşıyor: ${bilinmeyen.join(", ")} — listeye ekle`);
});

test("dosya adı koşulu canlı adlandırmayla eşleşir: kanonik anadizin kabul, eski ad geçiş yedeği, sıradan dosya ret", () => {
  let olculen = 0;
  for (const grup of MENU_GRUPLARI) {
    for (const g of PAKET.contributes.menus[grup] ?? []) {
      if (!g.when) continue;
      const kanonik = dosyaAdiKabulEder(g.when, "proje_anadizin.sar");
      if (kanonik === undefined) continue;   // dosya adına bakmayan koşul
      olculen += 1;
      assert.equal(kanonik, true,
        `'${grup}' grubundaki '${g.command}' koşulu kanonik adı kabul etmiyor: ${g.when} — düğme *_anadizin.sar açıkken görünmez`);
      assert.equal(dosyaAdiKabulEder(g.when, "sarmal_anadizin.sar"), true, `'${g.command}' koşulu ikinci bir kanonik adı reddediyor`);
      assert.equal(dosyaAdiKabulEder(g.when, "plan.sar"), false, `'${g.command}' koşulu sıradan bir plan dosyasını da kabul ediyor — düğme her dosyada belirir`);
      assert.equal(dosyaAdiKabulEder(g.when, "anadizin.sar"), false, `'${g.command}' koşulu alt çizgisiz adı kabul ediyor; desen başında ayraç ister`);
    }
  }
  assert.ok(olculen >= 1, "dosya adına bakan hiçbir koşul bulunamadı — İskeleti Kur düğmesi editör başlığından düşmüş");
  const iskelet = (PAKET.contributes.menus["editor/title"] ?? []).find((g) => g.command === "sarmal.iskeletKur");
  assert.ok(iskelet?.when, "İskeleti Kur düğmesi editör başlığında koşullu bir girdi olmalı");
  assert.equal(dosyaAdiKabulEder(iskelet!.when!, "ana.sar"), true, "eski ana.sar adı geçiş yedeği olarak tanınmalı");
});

test("Yol Haritası boş durum cümlesi katalogdadır, iki dilde yaşar ve nasıl dolacağını söyler", () => {
  const tr = YUZEY_BOS_DURUM.yolHaritası;
  assert.ok(tr.trim().endsWith("."), "boş-durum metni tam cümleyle bitmiyor");
  assert.ok(tr.length > 80, "boş-durum metni okuyana ne yapacağını anlatacak kadar uzun değil");
  assert.ok(tr.includes("_anadizin.sar"), "cümle panelin hangi dosyayla dolacağını söylemiyor");
  assert.ok(/Doğuş/.test(tr), "cümle boş klasörde hangi komutun çalıştırılacağını söylemiyor");
  assert.ok(!/\bsen\b|\byap\b|\baç\b/.test(tr), "cümle siz üslubundan sapıyor");
  yuzeyDiliniAyarla("en");
  try {
    const en = YUZEY_BOS_DURUM.yolHaritası;
    assert.notEqual(en, tr, "İngilizce karşılık Türkçe metnin aynısı — ikinci dil yazılmamış");
    assert.ok(en.includes("_anadizin.sar") && /Genesis/.test(en) && en.trim().endsWith("."), "İngilizce karşılık dosya adını ve komutu söylemiyor");
  } finally {
    yuzeyDiliniAyarla("tr");
  }
});

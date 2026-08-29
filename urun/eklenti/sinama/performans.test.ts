// ═══════════════════════════════════════════════════════════════════════════
// performans.test.ts — 🔬 Performans merceği sınamaları (PRF-A01 · VS Code'suz)
//
//   PerformansMercegi: olaylar birikir, tur bitince tek satır özet düşer ve
//   sayaçlar sıfırlanır; kanal yazıcısı yalnız tur sonunda çağrılır.
// ═══════════════════════════════════════════════════════════════════════════

import { test } from "node:test";
import assert from "node:assert/strict";
import { PerformansMercegi } from "../src/performans.ts";

test("mercek: olaylar birikir, tur özeti hepsini tek satırda döker", () => {
  const satırlar: string[] = [];
  const mercek = new PerformansMercegi((s) => satırlar.push(s));
  mercek.olayGeldi("disk"); mercek.olayGeldi("disk"); mercek.olayGeldi("sar");
  mercek.süzüldü(); mercek.atlandı(); mercek.ertelendi(); mercek.ertelendi();

  const satır = mercek.turBitti({ tetik: "disk-olayı", süreMs: 843, dosyaSayısı: 129 },
                                new Date("2026-07-19T12:34:56"));
  assert.equal(satırlar.length, 1);            // kanal yazımı YALNIZ tur sonunda
  assert.equal(satırlar[0], satır);
  assert.match(satır, /12:34:56/);
  assert.match(satır, /843 ms · 129 dosya · tetik=disk-olayı/);
  assert.match(satır, /disk 2 · sar 1/);
  assert.match(satır, /süzülen 1 · atlanan 1 · ertelenen 2/);
});

test("mercek: tur sayaçları sıfırlar — ikinci tur birikimi taşımaz", () => {
  const mercek = new PerformansMercegi(() => {});
  mercek.olayGeldi("disk"); mercek.süzüldü();
  mercek.turBitti({ tetik: "başlangıç", süreMs: 10, dosyaSayısı: 5 });

  const ikinci = mercek.turBitti({ tetik: "sar-olayı", süreMs: 20, dosyaSayısı: 5 });
  assert.match(ikinci, /aradaki olaylar: olay yok/);
  assert.match(ikinci, /süzülen 0 · atlanan 0 · ertelenen 0/);
});

// ═══════════════════════════════════════════════════════════════════════════
// ⚡ PRF-A06 NÖBETLERİ — olay-tetikli turun maliyeti
//
//   Bu Adımın kazancı iki mekanizmaya dayanır ve her ikisi de sessizce
//   gerileyebilir; nöbetler o gerilemeyi görünür kılar. Ölçüm dayanağı
//   2026-08-29 tarihli kanal ölçümleridir: kenar yapısı değişmediği hâlde
//   koşan topolojik sıra hesabı çatı ölçeğinde 2093 ms, kenar imzası 1,6 ms.
//
//   Nöbetler SÜREYE değil MEKANİZMAYA bakar: bir sınamanın makinenin anlık
//   yüküne bağlı olması onu kırılgan yapar ve gerçek gerilemeyi gizler.
//   Ölçülen şey hesabın kaç kez koştuğudur.
// ═══════════════════════════════════════════════════════════════════════════

import { grafImzasi, SiraBellegi } from "../src/yolharitasi-cekirdek.ts";
import { turKapsami } from "../src/izleyici-cekirdek.ts";
import { tetikEtiketi } from "../src/performans.ts";

const dugum = (oncekiler: string[], sonrakiler: string[]) => ({ oncekiler, sonrakiler });

test("imza: kenar yapısı aynıysa sıra hesabı İKİNCİ KEZ koşmaz", () => {
  const graf = new Map([
    ["A", dugum([], ["B"])],
    ["B", dugum(["A"], [])],
  ]);
  const bellek = new SiraBellegi();
  let hesapSayısı = 0;
  const hesapla = (): string[] => { hesapSayısı += 1; return ["A", "B"]; };

  const ilk = bellek.al(grafImzasi(graf), hesapla);
  assert.equal(ilk.yenidenHesaplandi, true);
  assert.equal(hesapSayısı, 1);

  // İkinci tur: düz yazı değişti, kenar yapısı DEĞİŞMEDİ — hesap koşmamalı.
  const ikinci = bellek.al(grafImzasi(graf), hesapla);
  assert.equal(ikinci.yenidenHesaplandi, false);
  assert.equal(hesapSayısı, 1, "kenar yapısı aynıyken sıra yeniden hesaplandı");
  assert.deepEqual([...ikinci.sira], ["A", "B"]);
});

test("imza: kenar DEĞİŞİNCE sıra yeniden hesaplanır — bayat sıra gösterilmez", () => {
  const bellek = new SiraBellegi();
  let hesapSayısı = 0;
  const once = new Map([["A", dugum([], ["B"])], ["B", dugum(["A"], [])]]);
  bellek.al(grafImzasi(once), () => { hesapSayısı += 1; return ["A", "B"]; });

  // Kenar ters çevrildi: yapı başkadır, sıra da başka olmalıdır.
  const sonra = new Map([["A", dugum(["B"], [])], ["B", dugum([], ["A"])]]);
  const sonuc = bellek.al(grafImzasi(sonra), () => { hesapSayısı += 1; return ["B", "A"]; });
  assert.equal(sonuc.yenidenHesaplandi, true);
  assert.equal(hesapSayısı, 2);
  assert.deepEqual([...sonuc.sira], ["B", "A"]);
});

test("imza: ekleme sırası değişse de aynı graf aynı imzayı verir", () => {
  // dagKur haritayı dosya keşif sırasıyla kurar; sıralama olmasaydı yapı hiç
  // değişmediği hâlde imza değişir ve kazanç sessizce kaybolurdu.
  const a = new Map([["A", dugum([], ["B", "C"])], ["B", dugum(["A"], [])], ["C", dugum(["A"], [])]]);
  const b = new Map([["C", dugum(["A"], [])], ["A", dugum([], ["C", "B"])], ["B", dugum(["A"], [])]]);
  assert.equal(grafImzasi(a), grafImzasi(b));
});

test("imza: ayraçlar iki ayrı grafı aynı dizeye çökertmez", () => {
  const a = new Map([["AB", dugum([], [])], ["C", dugum([], [])]]);
  const b = new Map([["A", dugum([], [])], ["BC", dugum([], [])]]);
  assert.notEqual(grafImzasi(a), grafImzasi(b));
});

test("kapsam: olay-tetikli tur odaktaki varlığa daralır", () => {
  const koklar = ["/depo/Nexivion-Labs"];
  assert.equal(turKapsami("sar-olayı", "/depo/Nexivion-Labs/sarmal", true, koklar),
               "/depo/Nexivion-Labs/sarmal");
  assert.equal(turKapsami("disk-olayı", "/depo/Nexivion-Labs/sarmal", true, koklar),
               "/depo/Nexivion-Labs/sarmal");
});

test("kapsam: soğuk açılış ve dünya-kuran tetikler TAM koşar", () => {
  const koklar = ["/depo/Nexivion-Labs"];
  const odak = "/depo/Nexivion-Labs/sarmal";
  // Adımın sınırı: ilk resmin tam olması gerekir.
  for (const tetik of ["başlangıç", "ayar", "dil", "odak", "klasör"]) {
    assert.equal(turKapsami(tetik, odak, true, koklar), undefined,
                 `'${tetik}' tetiği daraltılmamalıydı`);
  }
});

test("kapsam: odak kapalıyken daraltma YAPILMAZ — görünen tanı düşmez", () => {
  // Odak kapalıyken paneller bütün varlıkları gösterir; daraltma bir kazanç
  // değil, gösterilen tanının kaybı olurdu.
  assert.equal(turKapsami("sar-olayı", "/depo/Nexivion-Labs/sarmal", false,
                          ["/depo/Nexivion-Labs"]), undefined);
  assert.equal(turKapsami("sar-olayı", undefined, true, ["/depo/Nexivion-Labs"]), undefined);
});

test("kapsam: odak çalışma alanı kökünün kendisiyse ya da dışındaysa daraltılmaz", () => {
  // Kökün kendisi: daraltacak bir şey yok, sahte kazanç raporlanmamalı.
  assert.equal(turKapsami("sar-olayı", "/depo/Nexivion-Labs", true, ["/depo/Nexivion-Labs"]),
               undefined);
  // Çalışma alanı dışı: tur o kökü hiç taramaz, resim boşalırdı.
  assert.equal(turKapsami("sar-olayı", "/baska/yer", true, ["/depo/Nexivion-Labs"]), undefined);
  // Ad benzerliği kapsama sayılmaz ('…-arsiv' dersi).
  assert.equal(turKapsami("sar-olayı", "/depo/Nexivion-Labs-yedek/sarmal", true,
                          ["/depo/Nexivion-Labs"]), undefined);
});

test("mercek: dar tur kanalda kapsamıyla görünür, tam tur işaretsiz kalır", () => {
  assert.equal(tetikEtiketi({ tetik: "sar-olayı", süreMs: 1, dosyaSayısı: 1, kapsam: "sarmal" }),
               "sar-olayı · dar kapsam=sarmal");
  assert.equal(tetikEtiketi({ tetik: "başlangıç", süreMs: 1, dosyaSayısı: 1 }), "başlangıç");
});

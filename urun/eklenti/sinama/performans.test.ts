// ═══════════════════════════════════════════════════════════════════════════
// performans.test.ts — 🔬 Performans merceği sınamaları (PRF-A01 · VS Code'suz)
//
//   PerformansMercegi: olaylar birikir, tur bitince tek satır özet düşer ve
//   sayaçlar sıfırlanır; kanal yazıcısı yalnız tur sonunda çağrılır.
// ═══════════════════════════════════════════════════════════════════════════

// Yüzey dili kapısını bu dosya kendi kurar: `npm test` ön-yüklemesi olmadan tek
// başına koşturulduğunda sahte kırmızı vermesin (ön-yükleme ile aynı bağ, ESM
// önbelleği yüzünden iki kez koşmaz).
import "./dil-kur.ts";
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

// ═══════════════════════════════════════════════════════════════════════════
// 🗺️ PRF-TA-A03 NÖBETLERİ — PANEL TURUN TEK AĞACINDAN BESLENİR
//
//   Ölçülen kusur (2026-08-30 · SRN-IDE-KASMA-SOL-KOSUSU · OZK-12): yol haritası
//   paneli kendi ayrı taramasını koşturuyordu. Tur başına iki dosya araması
//   (`**/*.sar` ile anadizin deseni), taranan her dosya için bir belge açma
//   çağrısı ve denetim turunun ZATEN kurduğu ağacın ikinci bir kopyası; kanalda
//   panel turu yirmi bin dokuz milisaniye ölçüldü ve soğuk açılışta yarışı
//   kaybeden dosya sahte kırık damgası yedi.
//
//   Nöbetler kabul ölçütlerinin üçünü de ölçer ve ikisi ayrı cinstendir.
//   DAVRANIŞ ölçümü gerçek depo üzerinde koşar: bu çalışma alanının bütün `.sar`
//   dosyaları önce ESKİ yolla (dosya araması ile dosya başına ayrıştırma), sonra
//   YENİ yolla (turun görüntüsünden) toplanır ve iki ağacın düğüm kodları ile
//   sayaçları birebir karşılaştırılır. KAYNAK ölçümü ise panelin o yolu gerçekten
//   terk ettiğini ölçer; saf çekirdeğin doğru olması kabuğun eski taramayı geri
//   koymadığını kanıtlamaz ve tek satırlık bir geri alma ikinci hattı geri
//   getirir (tur-goruntusu.test.ts ⑤ KAYNAK deseni).
//
//   Kapsam şerhi: "sıfır" iddiası panelin PLAN AĞACI yolunu ölçer, çünkü A01
//   tabanı da o yolu saymıştır (iki dosya araması ile dosya başına bir belge
//   açma). İzlerin kendi hattı (`.sarmal/trace` izleyicisi · `izTazele`) bu
//   Adımın sınırı DIŞINDADIR ve kendi aramasıyla kalır; kaynak metni yasağının
//   tamamı PRF-TA-A06'nın işidir.
// ═══════════════════════════════════════════════════════════════════════════

import { readFileSync, readdirSync, statSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join as yolBirlestir } from "node:path";
import { fileURLToPath } from "node:url";
import type { Program, Dugum } from "../../cekirdek/src/sozdizim.ts";
import { durumTuret } from "../../cekirdek/src/durum.ts";   // referans gövde: eski öğe toplama sayaçları
import { belirtecle } from "../../cekirdek/src/belirtec.ts";
import { ayristir } from "../../cekirdek/src/ayristirici.ts";
import { anadizinBul, mevsimNormalize } from "../../cekirdek/src/denetci.ts";
import { SAR_DISLANANLAR } from "../src/izleyici-cekirdek.ts";
import { diskBelgesi, erisimSiniri, turBelgeleriniTopla, turProgramlariniKur } from "../src/tur-belgesi.ts";
import { turGoruntusunuUnut, turGoruntusunuYayinla } from "../src/tur-goruntusu.ts";
import {
  anadizinHaritasi, anadizinYoluMu, evrenCozucu, ogeleriTopla, varlikCozucu, varlikKimligi, varliklariKur,
  type PlanOgesi, type VarlikKimligi,
} from "../src/yolharitasi-cekirdek.ts";

const DEPO_KOKU = fileURLToPath(new URL("../../../", import.meta.url)).replace(/\/$/, "");
const YOLHARITASI_KAYNAK = readFileSync(
  fileURLToPath(new URL("../src/yolharitasi.ts", import.meta.url)), "utf8");
const EKLENTI_KAYNAGI = readFileSync(
  fileURLToPath(new URL("../src/eklenti.ts", import.meta.url)), "utf8");

/** Sahte kimlik: nöbet gerçek `Uri` yerine düz yol taşır, dolayısıyla host istemez. */
const yolAl = (yol: string): string => yol;

/**
 * Deponun `.sar` evreni — tam taramanın dışlama globuyla (`TARAMA_DISLAMA_GLOB`)
 * AYNI listeden türer: gizli dizinler ile `SAR_DISLANANLAR` adlarına inilmez.
 * Panelin eski `findFiles` çağrısının nöbet ikizidir.
 */
function sarDosyalariniTara(kok: string): string[] {
  const dislanan = new Set<string>(SAR_DISLANANLAR);
  const bulunan: string[] = [];
  const in_ = (dizin: string): void => {
    for (const girdi of readdirSync(dizin, { withFileTypes: true })) {
      if (girdi.isDirectory()) {
        if (girdi.name.startsWith(".") || dislanan.has(girdi.name)) continue;
        in_(yolBirlestir(dizin, girdi.name));
      } else if (girdi.name.endsWith(".sar")) {
        bulunan.push(yolBirlestir(dizin, girdi.name));
      }
    }
  };
  in_(kok);
  return bulunan.sort();
}

/** Bir ağacın bütün düğüm kodları ile sayaçları — karşılaştırmanın ölçüsü. */
function kodveSayaclar(ogeler: readonly PlanOgesi<string>[]): string[] {
  const satirlar: string[] = [];
  const gez = (liste: readonly PlanOgesi<string>[]): void => {
    for (const o of liste) {
      satirlar.push(`${o.dosya}|${o.tip}|${o.kod}|${o.durum}|${o.tamam}/${o.toplam}` +
                    `|g${o.gelistirmede}|b${o.bloklu}|k${o.kabulSayisi}|s${o.satir}`);
      gez(o.cocuklar);
    }
  };
  gez(ogeler);
  return satirlar.sort();
}

/** Varlık köklerinin kimlikleri ile sayaçları — panelin ray satırının ölçüsü. */
function varlikSatirlari(harita: ReadonlyMap<string, { tip: string; kod: string; ad: string; tamam: number; toplam: number; gelistirmede: number; bloklu: number; cocuklar: unknown[] }>): string[] {
  return [...harita.entries()]
    .map(([kokDizin, v]) => `${kokDizin}|${v.tip}|${v.kod}|${v.ad}|${v.tamam}/${v.toplam}` +
                            `|g${v.gelistirmede}|b${v.bloklu}|c${v.cocuklar.length}`)
    .sort();
}

// ── REFERANS GÖVDELER (PRF-TA-A03 ikinci tur · denetçi bulgusu) ──────────────
//   Eşdeğerlik ancak eski gövdeye karşı ölçülürse refaktör eşdeğerliğidir; eski
//   ve yeni kollar aynı yeni yardımcıları kullanırsa ölçülen şey yalnız veri
//   edinme yoludur. Aşağıdaki işlevler PRF-TA-A03 ÖNCESİ yolharitasi.ts'nin
//   (HEAD a1e81e6) ANLAM KORUYUCU kopyasıdır ve hiçbiri birebir metin kopyası
//   değildir: öğe toplama gövdesinde `vscode.Uri` yerine kimlik türü K taşınır;
//   varlık bulucudan modül ömürlü bellek çıkarılmış ve giriş bulucu dışarıdan
//   verilmiştir ki nöbet host istemesin; varlık kurulumu eski `yenile` gövdesinin kök alma kısmıdır. Referans
//   kolu üretimin HİÇBİR yeni yardımcısını kullanmaz: plan tipleri kümesi ile giriş
//   adı ölçütü de eski gövdeden kopyadır (üçüncü tur, denetçi bulgusu: ortak bir
//   yardımcıdaki mutasyon eşdeğerlik nöbetinden kaçabilirdi). Kopya bilinçle BAYAT
//   TUTULUR: üretim değişince nöbet kırılır ve fark gerekçesiyle buraya yazılır
//   (dag.test.ts referans deseni).
const REFERANS_PLAN_TIPLERI: ReadonlySet<string> = new Set(["Blok", "Faz", "Katman", "AltKatman", "Adım"]);   // a1e81e6 yolharitasi.ts:47
/** Eski giriş ölçütü: `findFiles("**\/{ana.sar,*_anadizin.sar}")` globunun ikizi (a1e81e6 yolharitasi.ts:468). */
function referansAnadizinYoluMu(yol: string): boolean {
  const ad = basename(yol);
  return ad === "ana.sar" || ad.endsWith("_anadizin.sar");
}
function referansParametre(d: Dugum, ad: string) {
  return d.parametreler.find((p) => p.ad === ad) ?? d.ozellikler.find((p) => p.ad === ad);
}
function referansOgeleriTopla<K>(bildirimler: readonly Dugum[], dosya: K): PlanOgesi<K>[] {
  const kokler: PlanOgesi<K>[] = [];
  const yap = (d: Dugum): PlanOgesi<K> => {
    const durumP = referansParametre(d, "durum");
    const durum = (durumP?.deger.metin as PlanOgesi<K>["durum"]) || "beklemede";
    const kabulP = [...d.parametreler, ...d.ozellikler].find((p) => p.ad === "kabul");
    const oge: PlanOgesi<K> = {
      tur: "oge",
      tip: d.ad,
      kod: referansParametre(d, "kod")?.deger.metin ?? d.ad,
      ad: referansParametre(d, "ad")?.deger.metin,
      ne: referansParametre(d, "ne")?.deger.metin ?? "",
      durum,
      dosya,
      satir: d.satir,
      durumSatir: durumP?.deger.satir,
      durumSutun: durumP?.deger.sutun,
      durumUzunluk: durumP?.deger.metin?.length,
      cocuklar: [],
      tamam: 0,
      toplam: 0,
      gelistirmede: 0,
      bloklu: 0,
      dugum: d,
      kabulSayisi: kabulP ? (kabulP.deger.tur === "liste" ? (kabulP.deger.ogeler?.length ?? 0) : 1) : 0,
      hedefTarih: referansParametre(d, "hedefTarih")?.deger.metin,
      cagirlar: d.cocuklar.filter((c) => c.tur === "çağır").map((c) => c.ad),
    };
    for (const c of d.cocuklar) if (REFERANS_PLAN_TIPLERI.has(c.ad)) oge.cocuklar.push(yap(c));
    if (d.ad === "Adım") {
      const t = durumTuret([durum]);
      oge.toplam = t.toplam; oge.tamam = t.tamam;
      oge.gelistirmede = t.gelistirmede; oge.bloklu = t.bloklu;
    } else {
      for (const c of oge.cocuklar) {
        oge.tamam += c.tamam; oge.toplam += c.toplam;
        oge.gelistirmede += c.gelistirmede; oge.bloklu += c.bloklu;
      }
      if (durum === "bloklu") oge.bloklu += 1;
    }
    return oge;
  };
  const gez = (d: Dugum): void => {
    if (d.ad === "Blok" || d.ad === "Faz") { kokler.push(yap(d)); return; }
    for (const c of d.cocuklar) gez(c);
  };
  for (const b of bildirimler) gez(b);
  return kokler;
}
/** Eski varlık bulucu: yukarı yürüyüş + ham metinde düzenli ifadeyle kimlik okuma. */
function referansVarlikBul(dosyaYolu: string, girisBul: (dizin: string) => string | undefined): VarlikKimligi {
  let dizin = dirname(dosyaYolu);
  for (let i = 0; i < 12; i++) {
    const anaSar = girisBul(dizin);
    if (anaSar) {
      let tip = "Proje", kod = basename(dizin), ad = basename(dizin);
      try {
        const metin = readFileSync(anaSar, "utf8");
        const kokEs = /^(ÇalışmaAlanı|Proje|Uygulama)\(/mu.exec(metin);
        if (kokEs) {
          tip = kokEs[1]!;
          const govde = metin.slice(kokEs.index);
          kod = /\bkod:\s*([A-Za-zÇĞİÖŞÜçğıöşü0-9-]+(?:\.[0-9]+){0,2})/u.exec(govde)?.[1] ?? kod;
          ad = /\bad:\s*"([^"]+)"/u.exec(govde)?.[1] ?? ad;
        }
      } catch { /* klasör kimliği yeter */ }
      return { tur: "varlık", tip, kod, ad, kokDizin: dizin, anaSar };
    }
    const ust = dirname(dizin);
    if (ust === dizin) break;
    dizin = ust;
  }
  return { tur: "varlık", tip: "Proje", kod: basename(dirname(dosyaYolu)),
           ad: basename(dirname(dosyaYolu)), kokDizin: dirname(dosyaYolu), anaSar: "" };
}
/** Eski varlık kurulumu: ögeler köklere bindirilir, sayaçlar köke kabarır (HEAD yenile gövdesi). */
function referansVarliklariKur(ogeler: readonly PlanOgesi<string>[], anadizinler: ReadonlyMap<string, string>, coz: (yol: string) => VarlikKimligi) {
  const harita = new Map<string, VarlikKimligi & { cocuklar: PlanOgesi<string>[]; tamam: number; toplam: number; gelistirmede: number; bloklu: number }>();
  const kokAl = (k: VarlikKimligi) => {
    let v = harita.get(k.kokDizin);
    if (!v) { v = { ...k, cocuklar: [], tamam: 0, toplam: 0, gelistirmede: 0, bloklu: 0 }; harita.set(k.kokDizin, v); }
    return v;
  };
  for (const oge of ogeler) {
    const v = kokAl(coz(oge.dosya));
    v.cocuklar.push(oge); v.tamam += oge.tamam; v.toplam += oge.toplam; v.gelistirmede += oge.gelistirmede; v.bloklu += oge.bloklu;
  }
  for (const anaSar of anadizinler.values()) kokAl(coz(anaSar));
  return harita;
}

test("EŞDEĞERLİK: panelin eski taraması ile turun görüntüsü AYNI kod kümesini ve aynı sayaçları verir", async () => {
  turGoruntusunuUnut();
  const yollar = sarDosyalariniTara(DEPO_KOKU);
  // Karşılaştırmanın boş kümede kendiliğinden doğru çıkması engellenir: evren
  // gerçekten büyük olmalıdır. Ölçüm BU DEPONUN kendi evreninde yapılır (bugün
  // yüz bir dosya) ve bilerek öyledir: açık depo kendi başına klonlandığında da
  // koşmalıdır, dolayısıyla nöbet çatının öteki projelerine bakamaz (STR-3). Planın
  // andığı iki yüz yetmiş altı dosyalık çatı ölçümü canlı pencerenin işidir
  // (PRF-TA-A05) ve gerçek kabuk süiti PRF-TA-A04'te yazılır.
  assert.ok(yollar.length > 80,
    `eşdeğerlik ölçümü boşlukta koşuyor: yalnız ${yollar.length} dosya bulundu`);

  // ── ESKİ YOL: dosya araması + dosya başına ayrıştırma; varlık kökleri diskten
  //    yukarı yürüyerek bulunur (panelin PRF-TA-A03 öncesi veri edinme yolu).
  const eskiProgramlar = new Map<string, Program>();
  const eskiKirik: string[] = [];
  for (const yol of yollar) {
    try { eskiProgramlar.set(yol, ayristir(belirtecle(readFileSync(yol, "utf8")))); }
    catch { eskiKirik.push(yol); }
  }
  mevsimNormalize(eskiProgramlar);
  // Eski gövdeler REFERANS kopyadır (yukarıda): öğe toplama eski `parametre`
  // okumasıyla, varlık kimliği ham metinde düzenli ifadeyle, giriş bulma motorun
  // diskten yukarı yürüyen `anadizinBul` işleviyle.
  const eskiOgeler: PlanOgesi<string>[] = [];
  for (const [yol, program] of eskiProgramlar) eskiOgeler.push(...referansOgeleriTopla(program.bildirimler, yol));
  const eskiAnadizinler = new Map<string, string>();
  for (const yol of yollar) if (referansAnadizinYoluMu(yol)) eskiAnadizinler.set(dirname(yol), yol);
  const eskiVarliklar = referansVarliklariKur(eskiOgeler, eskiAnadizinler, (y) => referansVarlikBul(y, anadizinBul));

  // ── YENİ YOL: turun omurgası koşar (erişim sınırı → belge toplama → program
  //    haritası → mevsim çevrimi → tek yayın) ve panel YALNIZ görüntüden beslenir.
  const suzulmus = erisimSiniri(yollar, [DEPO_KOKU]);
  const { belgeler, dilDışı } = await turBelgeleriniTopla(suzulmus, {
    açıkBelge: () => undefined,      // nöbette açık editör yoktur
    dilKimliği: () => undefined,
    oku: async (yol) => {
      try {
        const ham = readFileSync(yol);
        return { belge: diskBelgesi({ fsPath: yol } as never, ham.toString("utf8")), bayt: ham.byteLength };
      } catch { return undefined; }
    },
  });
  const yeniProgramlar = turProgramlariniKur(belgeler, new Map<string, never>(), () => undefined);
  mevsimNormalize(yeniProgramlar);
  const goruntu = turGoruntusunuYayinla({
    programlar: yeniProgramlar, yollar: suzulmus, belgeler, dilDışı,
    tetik: "başlangıç", kapsam: undefined,
  });
  const yeniOgeler: PlanOgesi<string>[] = [];
  for (const [yol, program] of goruntu.programlar) yeniOgeler.push(...ogeleriTopla(program.bildirimler, yol));
  const yeniAnadizinler = anadizinHaritasi(goruntu.yollar);
  const yeniVarliklar = varliklariKur(
    yeniOgeler, yeniAnadizinler,
    varlikCozucu(yeniAnadizinler, (anaSar) => goruntu.programlar.get(anaSar)), yolAl);

  // Evrenler aynı olmalıdır: erişim sınırı bu depoda hiçbir dosyayı elemez,
  // dolayısıyla panelin gördüğü dosya kümesi turunkiyle birebirdir.
  assert.deepEqual([...goruntu.yollar].sort(), yollar,
    "turun taradığı yol kümesi panelin eski taramasından farklı; iki hat farklı evrene bakıyor");
  assert.deepEqual([...goruntu.kirik].sort(), eskiKirik.sort(),
    "kırık dosya listesi iki yolda ayrışıyor; panel bir dosyaya sahte damga basar");
  assert.equal(goruntu.okunamayan, 0,
    "nöbet evreninde okunamayan dosya yok; sayı sıfır değilse ölçüm başka bir şeyi sayıyor");

  // Asıl ölçüt: düğüm kodları ile sayaçlar BİREBİR.
  const eski = kodveSayaclar(eskiOgeler);
  const yeni = kodveSayaclar(yeniOgeler);
  assert.ok(eski.length > 500,
    `plan ağacı beklenenden küçük (${eski.length} düğüm); eşdeğerlik boşlukta ölçülüyor`);
  assert.deepEqual(yeni, eski,
    "görüntüden kurulan ağaç eski taramanın ağacından farklı: düğüm kodları ya da sayaçlar ayrıştı");
  assert.deepEqual(varlikSatirlari(yeniVarliklar), varlikSatirlari(eskiVarliklar),
    "varlık kökleri ya da ray sayaçları iki yolda ayrıştı; panel bir projeyi başka bir çatının altına yazar");
  turGoruntusunuUnut();
});

// ── ② SIFIR: PANELİN PLAN AĞACI YOLU DOSYA ARAMAZ VE BELGE AÇMAZ ─────────────

/** `yenile` gövdesi — sonraki üye bildirimine kadar (tur-goruntusu.test.ts dilim deseni). */
function yenileGovdesi(): string {
  const baş = YOLHARITASI_KAYNAK.indexOf("  yenile(goruntu: TurGoruntusu): void {");
  const son = YOLHARITASI_KAYNAK.indexOf("  varlikListesi()", baş);
  assert.ok(baş >= 0 && son > baş, "yenile gövdesi bulunamadı; nöbet boşlukta ölçüm yapamaz");
  return YOLHARITASI_KAYNAK.slice(baş, son);
}

test("SIFIR: panelin tur gövdesinde dosya araması ve belge açma sayısı SIFIRDIR", () => {
  const gövde = yenileGovdesi();
  assert.equal((gövde.match(/findFiles\s*\(/g) ?? []).length, 0,
    "panel turu yeniden dosya arıyor; turun ZATEN taradığı evren ikinci kez taranır");
  assert.equal((gövde.match(/openTextDocument\s*\(/g) ?? []).length, 0,
    "panel turu yeniden belge açıyor; A01 tabanının yirmi yedi saniyelik kalemi geri döndü");
  // Veri kaynağı görüntüdür: harita, yol kümesi ve kırık listesi ondan gelir.
  for (const alan of ["goruntu.programlar", "goruntu.yollar", "goruntu.kirik", "goruntu.okunamayan"]) {
    assert.ok(gövde.includes(alan),
      `panel turu görüntünün ${alan} alanını okumuyor; veri başka bir yerden geliyor`);
  }
  // İkinci dosya araması da kalktı: anadizinler AD ÖLÇÜTÜYLE yol kümesinden süzülür.
  assert.ok(gövde.includes("anadizinHaritasi(goruntu.yollar)"),
    "anadizin listesi turun yol kümesinden süzülmüyor; ikinci dosya araması yaşıyor");
  // Turun kendi ağacı KOPYALANMAZ: kopya bir sonraki turda bayatlayan ikinci gerçektir.
  assert.ok(/const programlar = goruntu\.programlar;/.test(gövde),
    "panel turun haritasını doğrudan almıyor; kopya ya da yeniden kurulmuş bir ikiz kullanıyor");
});

test("SIFIR: paneldeki HER dosya araması ve HER belge açma sayaca düşer — sayılmayan çağrı yok", () => {
  // Sayaç ancak bütün çağrıları görüyorsa bir şey ölçer. Sayılmayan tek bir çağrı,
  // gerçek kabuk nöbetinin (PRF-TA-A04) sıfır okumasını YANLIŞ bir güvene çevirirdi.
  const arama = (YOLHARITASI_KAYNAK.match(/findFiles\s*\(/g) ?? []).length;
  const acma = (YOLHARITASI_KAYNAK.match(/openTextDocument\s*\(/g) ?? []).length;
  const aramaSayaci = (YOLHARITASI_KAYNAK.match(/panelSayacı\.dosyaAramasi \+= 1;/g) ?? []).length;
  const acmaSayaci = (YOLHARITASI_KAYNAK.match(/panelSayacı\.belgeAcma \+= 1;/g) ?? []).length;
  assert.equal(aramaSayaci, arama,
    `panelde ${arama} dosya araması var ama ${aramaSayaci} tanesi sayılıyor; sayılmayan arama ölçümü kandırır`);
  assert.equal(acmaSayaci, acma,
    `panelde ${acma} belge açma var ama ${acmaSayaci} tanesi sayılıyor; sayılmayan açma ölçümü kandırır`);
  // Kalan çağrılar PANEL TURUNUN dışındadır: arama izlerin kendi hattında,
  // açma kullanıcının kendi gezinmesindedir (satıra atlama ile kutucuk yazımı).
  assert.equal(arama, 1, "panelde iz hattının aramasından başka bir dosya araması var");
  const gövde = yenileGovdesi();
  assert.equal((gövde.match(/panelSayacı\.(dosyaAramasi|belgeAcma) \+= 1;/g) ?? []).length, 0,
    "panel turu arama ya da açma sayacını artırıyor; tur artık dosyaya dokunuyor demektir");
});

test("SIFIR: panelin kendi .sar izleyicisi, olay hattı ve açılış tetiği KALKTI", () => {
  assert.equal((YOLHARITASI_KAYNAK.match(/createFileSystemWatcher\(\s*"\*\*\/\*\.sar"\s*\)/g) ?? []).length, 0,
    "panel kendi .sar izleyicisini geri kurmuş; aynı olay iki hattı birden tetikler ve turlar yarışır");
  assert.equal((YOLHARITASI_KAYNAK.match(/panelHatti|panelKilidi/g) ?? []).length, 0,
    "panelin kendi olay hattı ya da tek-uçuş kilidi geri gelmiş; ikinci bir tur gövdesi doğdu");
  assert.equal((YOLHARITASI_KAYNAK.match(/\*\*\/\{ana\.sar/g) ?? []).length, 0,
    "anadizin deseni yeniden dosya aramasıyla çözülüyor");
  // Panel yayının abonesidir ve abonelik TEKTİR; iki abonelik turu iki kez çizerdi.
  assert.equal((YOLHARITASI_KAYNAK.match(/turGoruntusunuDinle\s*\(/g) ?? []).length, 1,
    "panel yayına ya hiç abone değil ya da birden fazla abonelik kurdu");
  // Mini Graf AYNI dinleyicide tazelenir: ayrı bir tetik ikinci bir çizim turudur.
  assert.ok(/const goruntuyuIsle = \(g: TurGoruntusu\): void => \{\s*saglayici\.yenile\(g\);\s*miniGraf\.tazele\(\);/.test(YOLHARITASI_KAYNAK),
    "Mini Graf panelin görüntü dinleyicisinde tazelenmiyor; graf ile ağaç ayrı turlarda çizilir");
  // Kalan olay hattı YALNIZ izlerindir (Adımın sınırı: iz hattı değişmez).
  assert.equal((YOLHARITASI_KAYNAK.match(/new OlayHatti\(/g) ?? []).length, 1,
    "panelde birden fazla olay hattı var; plan ağacının hattı geri gelmiş olabilir");
});

test("TEK DEĞİŞİM: panel tur başına TAM BİR değişim olayı üretir ve olayı sayar", () => {
  const gövde = yenileGovdesi();
  // Öğe-hedefli fire (aktiflik nabzı) tek satırı tazeler; TAM tazeleme argümansızdır
  // ve tur başına yalnız bir kez düşer. İki tam olay ağacı iki kez çizdirirdi.
  assert.equal((gövde.match(/this\.degisti\.fire\(\s*\)/g) ?? []).length, 1,
    "panel turu tam değişim olayını bir kezden farklı sayıda üretiyor; ağaç iki kez çizilir ya da hiç çizilmez");
  assert.ok(/panelSayacı\.tamDegisim \+= 1;\s*\n\s*this\.degisti\.fire\(\);/.test(gövde),
    "tam değişim olayı sayılmıyor; iddia ölçülemez hâle gelir");
  assert.ok(/export function panelOlcumleri\(\)/.test(YOLHARITASI_KAYNAK),
    "panel sayaçları dış yüzden okunamıyor; gerçek kabuk nöbeti (PRF-TA-A04) ölçüm kapısı bulamaz");
});

// ── ③ EL İLE YENİLEME BİR DENETİM TURU İSTER ────────────────────────────────

test("EL İLE: yenileme düğmesi gövdenin tur kapısını çağırır; panel kendi turunu kurmaz", () => {
  assert.ok(/const tazele = \(\): void => turIste\?\.\("el-ile"\);/.test(YOLHARITASI_KAYNAK),
    "yenileme düğmesi bir denetim turu istemiyor; panel kendi turunu kurmuş olabilir");
  assert.ok(/yolHaritasiKaydi\(.*denetimKilidi\.iste/.test(EKLENTI_KAYNAGI),
    "gövde panele tur kapısını vermiyor; yenileme düğmesi sessiz kalır");
  // Tur kapısı GÖVDENİN TEK kilidinden geçer; ikinci bir kilit ikinci bir tur demektir.
  assert.equal((EKLENTI_KAYNAGI.match(/new TekUcusKilidi\(/g) ?? []).length, 1,
    "gövdede birden fazla tek-uçuş kilidi var; turlar iki kuyruğa bölündü");
});

test("EL İLE: el ile istenen tur DARALTILMAZ — kullanıcı bütün çalışma alanını bekler", () => {
  const koklar = ["/depo/Nexivion-Labs"];
  assert.equal(turKapsami("el-ile", "/depo/Nexivion-Labs/sarmal", true, koklar), undefined,
    "el ile istenen tur odağa daraldı; kullanıcı düğmeye bastığında çatının tamamı kurulmalıdır");
});

// ── ④ ANADİZİN AD ÖLÇÜTÜ MOTORUN KURALIYLA AYNIDIR ──────────────────────────

test("ANADİZİN: yol kümesinden süzme, motorun anadizinBul seçimiyle aynı kuralı uygular", () => {
  assert.ok(anadizinYoluMu("/ws/depo/sarmal_anadizin.sar"), "yeni ad tanınmadı");
  assert.ok(anadizinYoluMu("/ws/depo/ana.sar"), "eski ad tanınmadı");
  assert.ok(!anadizinYoluMu("/ws/depo/plan.sar"), "sıradan bir plan dosyası varlık girişi sayıldı");
  // Aynı dizinde iki giriş varsa yeni ad kazanır (anadizinBul: `*_anadizin.sar`
  // adayları önce, `ana.sar` yalnız yeni ad yoksa); iki kural olsaydı panel ile
  // çekirdek aynı klasörü iki ayrı varlığa bağlayabilirdi.
  const harita = anadizinHaritasi([
    "/ws/depo/ana.sar", "/ws/depo/depo_anadizin.sar", "/ws/depo/is/plan.sar",
    "/ws/depo/alt/ana.sar",
  ]);
  assert.equal(harita.get("/ws/depo"), "/ws/depo/depo_anadizin.sar",
    "iki giriş yan yanayken eski ad kazandı; motorun seçimiyle ayrıştı");
  assert.equal(harita.get("/ws/depo/alt"), "/ws/depo/alt/ana.sar",
    "yalnız eski adı olan dizin varlık kökü sayılmadı");
  assert.equal(harita.size, 2, "plan dosyası varlık girişi sayıldı");
});

// ── 🛡️ PRF-TA-A06 · PANELİN VERİ YOLU SINIRI (kaynak metni yasağı) ─────────────
//   Fikirler panelinin deseniyle aynıdır: panel kendi başına dosya aramaz, açmaz,
//   okumaz, zamanlayıcı kurmaz ve .sar izleyicisi kurmaz. Kalan her çağrı ya
//   sayaçtan geçer ya da açık bir istisna listesinde adıyla durur; listede olmayan
//   yeni bir çağrı nöbeti kırmızıya çevirir. İstisnalar (gerekçesiyle): izlerin
//   kendi hattı (Adımın sınırı: iz hattı değişmez), kullanıcının kendi gezinmesi
//   (satıra atlama ve kutucuk yazımı belge açar), eklenti kökünden okunan SVG
//   simge varlıkları (dosya değil, eklentinin kendi malı) ve tur DIŞI bir dosya
//   için sorulan aidiyet sorusunun giriş dosyasını okuması (`varlikBul`; A03 üretici
//   şerhi, kök bulma kuralının ikiliği kayıtta).
test("PRF-TA-A06 · yol haritası kaynağında zamanlayıcı yoktur, izleyici yalnız izlerindir, her okuma ve açma izin listesindedir", () => {
  const k = YOLHARITASI_KAYNAK;
  const say = (re: RegExp): number => (k.match(re) ?? []).length;
  assert.equal(say(/\bset(Timeout|Interval|Immediate)\s*\(/g), 0, "panel zamanlayıcı kuruyor; tur ritmi kalp atışının dışında ikinci bir saat kazanmış");
  // İzleyici: yalnız izlerin hattı, tam bir tane ve yalnız o glob ile.
  assert.equal(say(/createFileSystemWatcher\s*\(/g), 1, "panelde izlerin hattından başka bir izleyici var");
  assert.equal(say(/createFileSystemWatcher\(\s*"\*\*\/\.sarmal\/trace\/\*\.jsonl"\s*\)/g), 1, "izleyici globu izlerin globu değil");
  // Dosya araması: yalnız izlerin hattı ve sayaçtan geçer (SIFIR nöbeti sayacı ölçer; burada glob ölçülür).
  assert.equal(say(/findFiles\s*\(/g), 1);
  assert.equal(say(/findFiles\(\s*"\*\*\/\.sarmal\/trace\/\*\.jsonl"/g), 1, "dosya araması izlerin globunu değil başka bir evreni arıyor");
  // Editör kabuğu üzerinden okuma: yalnız iz dosyaları.
  assert.equal(say(/workspace\.fs\.readFile\s*\(/g), 1, "panel editör kabuğundan iz dışında dosya okuyor");
  // Doğrudan disk okuması: her satır izin listesinden birine uymalı.
  const okumaSatirlari = k.split("\n").filter((s) => /readFileSync\s*\(/.test(s));
  const izinli = [
    /kok\.fsPath, g\), "utf8"\)/,                 // SVG simge varlığı (eklenti kökü)
    /context\.extensionUri\.fsPath, g\), "utf8"\)/, // SVG simge varlığı (eklenti kökü)
    /readFileSync\(anaSar, "utf8"\)/,             // varlikBul: tur dışı dosyanın aidiyeti için giriş dosyası
  ];
  for (const s of okumaSatirlari) {
    assert.ok(izinli.some((re) => re.test(s)), `izin listesinde olmayan disk okuması: ${s.trim().slice(0, 120)}`);
  }
  assert.ok(okumaSatirlari.length <= 5, `disk okuması sayısı büyüdü (${okumaSatirlari.length}); yeni okuma önce gerekçesiyle izin listesine girer`);
  // Belge açma: yalnız kullanıcı gezinmesi ve her biri sayaçtan geçer (SIFIR nöbeti sayar); burada tavan ölçülür.
  assert.ok(say(/openTextDocument\s*\(/g) <= 2, "panelde iki kullanıcı gezinmesinden fazla belge açma var");
});

test("EŞDEĞERLİK (sentetik çok köklü fikstür): iç içe kökler, iki girişli dizin, gövde-durumlu Adım ve alanı eksik kök", async () => {
  turGoruntusunuUnut();
  const kok = mkdtempSync(yolBirlestir(tmpdir(), "sarmal-ta-a03-esdeger-"));
  try {
    const yaz = (goreli: string, icerik: string): void => { mkdirSync(dirname(yolBirlestir(kok, goreli)), { recursive: true }); writeFileSync(yolBirlestir(kok, goreli), icerik); };
    yaz("cati_anadizin.sar", 'ÇalışmaAlanı( kod: CATI-X, ad: "Çatı X" )\n');
    yaz("a/a_anadizin.sar", 'Proje( kod: PRJ-A, ad: "Proje A" )\n');
    yaz("a/plan.sar", 'Faz( kod: FZ-A, ad: "faz" ) {\n  Blok( kod: BLK-A ) {\n    Katman( kod: KAT-A ) {\n      Adım( kod: ADM-A1, durum: tamamlandı )\n      Adım( kod: ADM-A2 ) {\n        durum: bloklu\n      }\n    }\n  }\n}\n');
    // İki girişli dizin: yeni ad `b_anadizin.sar` eski `ana.sar`ı yener (motorun seçimiyle aynı).
    yaz("a/b/ana.sar", 'Proje( kod: PRJ-ESKI, ad: "eski giriş" )\n');
    yaz("a/b/b_anadizin.sar", 'Proje( kod: PRJ-B, ad: "Proje B" )\n');
    yaz("a/b/is.sar", 'Blok( kod: BLK-B, durum: bloklu ) {\n  Katman( kod: KAT-B ) {\n    Adım( kod: ADM-B1, durum: geliştirmede )\n  }\n}\n');
    // Kökün `kod` alanı EKSİK; çocuk düğümde `kod:` var. Eski düzenli ifade çocuğun kodunu
    // varlığa yazar (ölçülmüş kusur); yeni okuma klasör adına düşer. Fark BELGELENİR.
    yaz("c/c_anadizin.sar", 'Uygulama( ad: "Uygulama C" ) {\n  Bileşen( kod: BIL-C1, ad: "bileşen" )\n}\n');
    yaz("c/plan.sar", 'Blok( kod: BLK-C ) { Katman( kod: KAT-C ) { Adım( kod: ADM-C1 ) } }\n');
    yaz("d/plan.sar", 'Blok( kod: BLK-D ) { Katman( kod: KAT-D ) { Adım( kod: ADM-D1, durum: tamamlandı ) } }\n');   // girişsiz dizin: çatı köküne biner

    const yollar = sarDosyalariniTara(kok);
    const eskiProgramlar = new Map<string, Program>();
    for (const yol of yollar) eskiProgramlar.set(yol, ayristir(belirtecle(readFileSync(yol, "utf8"))));
    mevsimNormalize(eskiProgramlar);
    const eskiOgeler: PlanOgesi<string>[] = [];
    for (const [yol, program] of eskiProgramlar) eskiOgeler.push(...referansOgeleriTopla(program.bildirimler, yol));
    const eskiAnadizinler = new Map<string, string>();
    for (const yol of yollar) if (referansAnadizinYoluMu(yol)) eskiAnadizinler.set(dirname(yol), yol);
    const eskiVarliklar = referansVarliklariKur(eskiOgeler, eskiAnadizinler, (y) => referansVarlikBul(y, anadizinBul));

    const suzulmus = erisimSiniri(yollar, [kok]);
    const { belgeler, dilDışı } = await turBelgeleriniTopla(suzulmus, {
      açıkBelge: () => undefined, dilKimliği: () => undefined,
      oku: async (yol) => { const ham = readFileSync(yol); return { belge: diskBelgesi({ fsPath: yol } as never, ham.toString("utf8")), bayt: ham.byteLength }; },
    });
    const yeniProgramlar = turProgramlariniKur(belgeler, new Map<string, never>(), () => undefined);
    mevsimNormalize(yeniProgramlar);
    const goruntu = turGoruntusunuYayinla({ programlar: yeniProgramlar, yollar: suzulmus, belgeler, dilDışı, tetik: "başlangıç", kapsam: undefined });
    const yeniOgeler: PlanOgesi<string>[] = [];
    for (const [yol, program] of goruntu.programlar) yeniOgeler.push(...ogeleriTopla(program.bildirimler, yol));
    const yeniAnadizinler = anadizinHaritasi(goruntu.yollar);
    const yeniVarliklar = varliklariKur(yeniOgeler, yeniAnadizinler, varlikCozucu(yeniAnadizinler, (a) => goruntu.programlar.get(a)), yolAl);

    assert.deepEqual(kodveSayaclar(yeniOgeler), kodveSayaclar(eskiOgeler), "sentetik fikstürde düğüm kodları ya da sayaçlar ayrıştı");
    const eski = varlikSatirlari(eskiVarliklar), yeni = varlikSatirlari(yeniVarliklar);
    // Belgelenen tek fark: alanı eksik kök. Eski düzenli ifade çocuğun kodunu varlığa
    // yazar (BIL-C1), yeni okuma kökün kendi alanlarıyla sınırlıdır ve klasör adına düşer.
    const eskiC = eski.find((s) => s.includes("/c|"))!, yeniC = yeni.find((s) => s.includes("/c|"))!;
    assert.ok(eskiC.includes("|Uygulama|BIL-C1|Uygulama C|"), `eski düzenli ifade çocuğun kodunu almalıydı: ${eskiC}`);
    assert.ok(yeniC.includes("|Uygulama|c|Uygulama C|"), `yeni okuma kökün klasör adına düşmeliydi: ${yeniC}`);
    assert.deepEqual(yeni.filter((s) => !s.includes("/c|")), eski.filter((s) => !s.includes("/c|")), "alanı eksik kök dışında varlık satırları ayrıştı");
    // İki girişli dizin: yeni ad kazanır, eski giriş kimliğe girmez.
    assert.ok(yeni.some((s) => s.includes("/a/b|Proje|PRJ-B|Proje B|")), `iki girişli dizinde yeni ad kazanmalı: ${yeni.join(" · ")}`);
    assert.ok(!yeni.some((s) => s.includes("PRJ-ESKI")), "eski ana.sar girişi kimliğe girdi");
    // Gövde-durumlu Adım ve bloklu kapsayıcı sayaçları: eski ve yeni okuma aynı (parametre ∪ özellik).
    assert.ok(kodveSayaclar(yeniOgeler).some((s) => s.includes("|Adım|ADM-A2|bloklu|")), "gövdedeki durum okunmadı");
    assert.ok(yeni.some((s) => s.includes("|Proje|PRJ-B|Proje B|0/1|g1|b1|")), `BLK-B'nin bloklu beyanı köke kabarmadı: ${yeni.join(" · ")}`);
  } finally { rmSync(kok, { recursive: true, force: true }); turGoruntusunuUnut(); }
});

// ── 🧭 KÖK KURALI (PRF-TA-A03 üçüncü tur · denetçi bulgusu) ──────────────────
//   `projeKimligi` aidiyet sorusunu turun görüntüsüne sorar; ikinci turda evren
//   üyeliği "çözücü bir kök buldu mu" ile ölçülüyordu. Bu ölçü yanlıştı: dışlanmış
//   bir dizindeki (`ornek/`) iç içe kök kendi girişini taşısa da yukarı yürüyüş
//   dıştaki görüntü kökünü bulur ve dosya ona bağlanırdı; disk yedeğine hiç
//   düşülmezdi. Üyelik artık görüntünün YOL KÜMESİYLE ölçülür ve kararı çekirdek
//   verir (`evrenCozucu`); nöbet gerçek depoda, dışlanan bahçe üzerinde ölçer.
test("KÖK KURALI: evren üyeliği yol kümesiyle ölçülür; dışlanmış iç içe kök dıştaki görüntü köküne bağlanmaz", () => {
  const anaSar = yolBirlestir(DEPO_KOKU, "sarmal_anadizin.sar");
  const program = ayristir(belirtecle(readFileSync(anaSar, "utf8")));
  const plan = yolBirlestir(DEPO_KOKU, "is", "plan", "blok", "prf_tekagac.sar");
  const yollar = [anaSar, plan];
  const agacAl = (a: string): Program | undefined => (a === anaSar ? program : undefined);
  let yedekSayisi = 0;
  const yedek = (y: string): VarlikKimligi => { yedekSayisi += 1; return referansVarlikBul(y, anadizinBul); };   // eski disk yürüyüşü
  const coz = evrenCozucu(yollar, agacAl, yedek);

  // Evren İÇİ dosya: panelle aynı çözücü, yedek çağrılmaz.
  const ic = coz(plan);
  assert.equal(ic.kod, "PRJ-SARMAL", `evren içi dosya kendi köküne bağlanmadı: ${ic.kod}`);
  assert.equal(yedekSayisi, 0, "evren içi dosya için diske düşüldü");
  assert.deepEqual(ic, varlikCozucu(anadizinHaritasi(yollar), agacAl)(plan), "aidiyet cevabı panelin çözücüsünden ayrıştı; kök bulma kuralı yine iki");

  // Evren DIŞI, dışlanmış iç içe kök: `ogreti/ornek/altin_yol` kendi girişini taşır
  // (ÇalışmaAlanı CAL-BAHCE) ve `ornek` tam taramanın dışındadır (SAR_DISLANANLAR).
  assert.ok((SAR_DISLANANLAR as readonly string[]).includes("ornek"), "fikstürün dayandığı dışlama kalkmış; nöbet başka bir dışlanmış kök seçmeli");
  const bahce = yolBirlestir(DEPO_KOKU, "ogreti", "ornek", "altin_yol");
  const dis = yolBirlestir(bahce, "herhangi.sar");   // dosyanın kendisi gerekmez; aidiyet dizinden sorulur
  const k = coz(dis);
  assert.equal(yedekSayisi, 1, "evren dışı dosya için diske düşülmedi");
  assert.equal(k.kod, "CAL-BAHCE", `dışlanmış iç içe kök dıştaki görüntü köküne bağlandı: ${k.kod}`);
  assert.equal(k.anaSar, yolBirlestir(bahce, "altin_yol_anadizin.sar"), "yedek yanlış girişi buldu");

  // Karşı deney (denetçinin yeniden ürettiği kusur): üyelik üst dizinle ölçülseydi
  // aynı dosya dıştaki köke bağlanırdı. Salt çözücü bunu yapar; evren süzgeci yapmaz.
  const yanlis = varlikCozucu(anadizinHaritasi(yollar), agacAl)(dis);
  assert.equal(yanlis.kod, "PRJ-SARMAL", "karşı deney artık kusuru üretmiyor; nöbetin ölçtüğü şey değişti, gerekçesi yazılmalı");

  // Evren dışı ve girişsiz: yedek klasör adına düşer, çözücü uydurmaz.
  const yetim = coz(yolBirlestir(tmpdir(), "sarmal-yok-" + process.pid, "x.sar"));
  assert.equal(yetim.anaSar, "", "girişsiz evren dışı dosyaya giriş uyduruldu");
  assert.equal(yedekSayisi, 2);
});

test("KÖK KURALI (kaynak): kabuğun aidiyet sorusu yalnız çekirdeğin evren çözücüsünden geçer", () => {
  const basi = YOLHARITASI_KAYNAK.indexOf("function varlikBul(");
  const sonu = YOLHARITASI_KAYNAK.indexOf("function diskYuruyusu(", basi);
  assert.ok(basi >= 0 && sonu > basi, "varlikBul ya da diskYuruyusu bulunamadı; kaynak nöbeti dilimi kaçırdı");
  const dilim = YOLHARITASI_KAYNAK.slice(basi, sonu);
  assert.equal((dilim.match(/evrenCozucu\s*\(/g) ?? []).length, 1, "aidiyet çözücüsü evren süzgecinden kurulmuyor");
  assert.equal((dilim.match(/varlikCozucu\s*\(|anadizinHaritasi\s*\(/g) ?? []).length, 0,
    "kabuk çözücüyü doğrudan kuruyor; üyelik kararı çekirdekten kaçtı");
  assert.ok(/goruntuCozucu\.sıra !== g\.sıra/.test(dilim), "çözücü görüntünün sıra numarasına bağlı değil; bayat kimlik taşınır");
  assert.equal((dilim.match(/diskYuruyusu/g) ?? []).length, 2, "disk yedeği hem tursuz hâlde hem evren dışı için verilmeli (iki anma)");
});

// ═══════════════════════════════════════════════════════════════════════════
// kapi-kapsami.test.ts — 🚪 KAPI-KAPSAM NÖBETİ (KYN-MTR-A05 · mutasyon kanıtlı)
//
//   Bu süit, `KAPI_KAPSAMI` ilanı ile CLI'nin (`denetimKos`) gerçekten çağırdığı
//   üretici kümesi arasındaki sapmayı ölçen nöbeti sınar. İlk nöbet bugünkü
//   gerçek dosyaya karşı koşar (ilan = kayıt, sapma sıfır olmalıdır). İkinci ve
//   üçüncü nöbet MUTASYONLA kanıtlanır: ilana sahte bir kimlik eklenip nöbetin
//   "ilan-fazlası" sapmasını yakaladığı, sonra gerçek bir girdi ilandan silinip
//   nöbetin "kayıt-fazlası" sapmasını yakaladığı gösterilir. Her iki mutasyon
//   yalnız BELLEKTEKİ bir kopya üstünde yaşar — kaynak dosyaya hiçbir bayt
//   yazılmaz, süitin kırmızı senaryosu süitin kendi içinde kalır.
//
//   Süitin ikinci ailesi KÖKEN SÜZGECİNİ sınar. Bağımsız denetim şu sızıntıyı
//   ölçmüştü: aynı tanı kimliği iki ayrı üreticide yaşayabildiği (kenar-metin)
//   için kimlik-temelli panel süzgeci, yalnız komut satırına ayrılmış bir
//   üreticinin tanısını da panele geçiriyor ve Founder'a ayrılmış kapsam
//   kararını kazara veriyordu. Süzgeç artık üretici kimliğiyle çalışır; burada
//   hem sınırın tuttuğu (cli-only üretici panel kümesine giremez) hem sızıntının
//   kapandığı (fikstürde üretilen gerçek kenar-metin tanısı süzgeçten geçemez)
//   hem de köken damgasının TAM olduğu (akıştaki her tanı damga taşır) ölçülür.
// ═══════════════════════════════════════════════════════════════════════════
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  KAPI_KAPSAMI, cliGercekUreticileri, kapsamNobeti, yuzeyUreticiKumesi, panelCaprazUreticiKumesi,
  kanonUyumNobeti, yuzeyGercekUreticileri, yuzeyKapsamNobeti, mcpEtkinUreticiler,
  type KapiGirdisi,
} from "../src/kapi-kapsami.ts";
import { denetimKos } from "../src/denetim.ts";

const DENETIM_YOLU = fileURLToPath(new URL("../src/denetim.ts", import.meta.url));
const SNF_YOL = fileURLToPath(new URL("../../../oz/siniflama/kayit.json", import.meta.url));

// BKM-DNT-A06 (2026-09-10): ilan artık YALNIZ komut satırında koşan üreticilerden
// ibaret değildir; `dogusEksikTanilari` yalnız MCP yüzeyinde çağrılır. Bu yüzden
// komut satırı nöbeti ilanın TAMAMINI değil `cli` yüzeyli alt kümesini karşılaştırır.
const CLI_ILANI = KAPI_KAPSAMI.filter((g) => g.yuzeyler.includes("cli"));

test("kapı-kapsamı nöbeti: bugünkü ilan ile CLI'nin gerçekten çağırdığı üretici kümesi TAM eşleşir (sıfır sapma)", () => {
  const gercek = cliGercekUreticileri(DENETIM_YOLU);
  const sapma = kapsamNobeti(gercek, CLI_ILANI);
  assert.deepEqual(sapma, [],
    `ilan ile denetim.ts'in gerçek çağrı kümesi arasında sapma var: ${JSON.stringify(sapma)}`);
});

test("kapı-kapsamı nöbeti: ilana SAHTE bir kimlik eklenince nöbet kırmızıya döner (mutasyon 1 — ilan-fazlası)", () => {
  const gercek = cliGercekUreticileri(DENETIM_YOLU);
  const sahteGirdi: KapiGirdisi = {
    uretici: "uydurmaTanilariYokVeHicOlmayacak", modul: "denetci.ts", kademe: "bilgi", yuzeyler: ["cli"],
    cliGerekcesi: "Mutasyon fikstürü — gerçek bir üretici değildir.",
  };
  const mutasyonluIlan = [...CLI_ILANI, sahteGirdi];
  const sapma = kapsamNobeti(gercek, mutasyonluIlan);
  assert.equal(sapma.length, 1, "tek bir sapma bekleniyor — yalnız eklenen sahte kimlik");
  assert.deepEqual(sapma[0], { tur: "ilan-fazlası", uretici: "uydurmaTanilariYokVeHicOlmayacak" },
    "nöbet sahte kimliği 'ilan-fazlası' olarak damgalamalı: ilanda var, CLI'de gerçekten çağrılmıyor");
  // Geri alma kanıtı: mutasyonsuz ilan yine sıfır sapma verir — kaynağa hiç dokunulmadı.
  assert.deepEqual(kapsamNobeti(gercek, CLI_ILANI), [], "geri alındıktan sonra nöbet yeniden yeşil");
});

test("kapı-kapsamı nöbeti: gerçek bir üretici ilandan SİLİNİNCE nöbet kırmızıya döner (mutasyon 2 — kayıt-fazlası)", () => {
  const gercek = cliGercekUreticileri(DENETIM_YOLU);
  // Rastgele değil, GERÇEKTEN çağrılan bir üretici seçilir (denetle: yapısal
  // mutabakat — kayıp-yapı/harf-farkı/bildirilmemiş-dosya/yer-uyuşmazlığı'nın
  // üreticisi, panelde de koşuyor); bu satır ilandan çıkarılır.
  const silinecek = "denetle";
  assert.ok(gercek.has(silinecek), "test önkoşulu: 'denetle' CLI'de gerçekten çağrılmalı");
  const mutasyonluIlan = CLI_ILANI.filter((g) => g.uretici !== silinecek);
  const sapma = kapsamNobeti(gercek, mutasyonluIlan);
  assert.equal(sapma.length, 1, "tek bir sapma bekleniyor — yalnız silinen 'denetle' girdisi");
  assert.deepEqual(sapma[0], { tur: "kayıt-fazlası", uretici: "denetle" },
    "nöbet silinen üreticiyi 'kayıt-fazlası' olarak damgalamalı: CLI gerçekten çağırıyor, ilan artık susuyor");
  // Geri alma kanıtı: orijinal ilan yine sıfır sapma verir.
  assert.deepEqual(kapsamNobeti(gercek, CLI_ILANI), [], "geri alındıktan sonra nöbet yeniden yeşil");
});

test("kapı-kapsamı ilanı: her girdi tekil bir üretici adı taşır (yinelenen ilan satırı yok)", () => {
  const gorulen = new Set<string>();
  for (const girdi of KAPI_KAPSAMI) {
    assert.ok(!gorulen.has(girdi.uretici), `üretici iki kez ilan edilmiş: ${girdi.uretici}`);
    gorulen.add(girdi.uretici);
    assert.ok(girdi.yuzeyler.length > 0, `${girdi.uretici}: en az bir yüzey ilan etmeli`);
  }
});

test("panelCaprazUreticiKumesi: per-dosya yol cross süzgeçte YOK, cross ailesi VAR, cli-only üretici SINIRDAN GEÇEMEZ", () => {
  const capraz = panelCaprazUreticiKumesi();
  // dogrula ile fazVadeTanilari panelde YAŞAR ama tanilaCekirdek yolundan, dosya
  // başına gelir; cross süzgeçten de geçselerdi aynı tanı Problems'a iki kez yazılırdı.
  assert.ok(!capraz.has("dogrula"), "dogrula cross-file süzgeçte OLMAMALI — çift yayın riski");
  assert.ok(!capraz.has("fazVadeTanilari"), "fazVadeTanilari cross-file süzgeçte OLMAMALI — çift yayın riski");
  const tamPanel = yuzeyUreticiKumesi("panel");
  assert.ok(tamPanel.has("dogrula"), "dogrula panelde yaşar (tanilaCekirdek üstünden)");
  assert.ok(tamPanel.has("fazVadeTanilari"), "fazVadeTanilari panelde yaşar (tanilaCekirdek üstünden)");
  // Cross-file ailesinin iki temsilcisi süzgeçte bulunmalı — bu üreticiler yalnız
  // denetleHepsi yolundan gelir.
  assert.ok(capraz.has("dagTanilari"), "cross-file üretici panel süzgecinde olmalı");
  assert.ok(capraz.has("gizliBagimlilikTanilari"), "cross-file üretici panel süzgecinde olmalı");
  // YUZ-3.4 NÖBETİ (Founder kararı 2026-08-28): ateşleyen hatırlatıcı bildirimi
  // panele ULAŞMAK ZORUNDADIR. Madde tanıyı "proje CLI ve Bildirimler" yüzeylerine
  // yönlendirir; üretici panel yüzeyini kaybederse hatırlatma anı yalnız komut
  // satırında kalır ve hatırlatıcının bütün vaadi sessizce boşa düşer.
  assert.ok(capraz.has("atesleyenHatirlaticiTanilari"),
    "ateşlemiş-hatırlatıcı panele ulaşmalı — YUZ-3.4 Bildirimler yüzeyini şart koşar");
  // ORK-3.4 NÖBETİ (BKM-DNT-A04 · 2026-09-02): önceliksiz Adım bildirimi de panele
  // ULAŞMAK ZORUNDADIR. Madde tanıyı "proje CLI ve Bildirimler" yüzeylerine yönlendirir;
  // ateşlemiş hatırlatıcı ikizinin onarımından sonra bu üretici tek başına komut
  // satırında kalmıştı ve beyansız açık Adım Founder'ın baktığı panelde hiç görünmüyordu.
  assert.ok(capraz.has("onceliksizAdimTanilari"),
    "önceliksiz-adım panele ulaşmalı — ORK-3.4 Bildirimler yüzeyini şart koşar");
  // KANON NÖBETİ (BKM-DNT-A01 · Founder hükmü 2026-09-09). Bu iki satır 2026-09-10
  // tarihinde TERSİNE ÇEVRİLMİŞTİR ve tersine çevrilme gerekçesi şudur: eski hâlleri
  // `referansTanilari` ile `metinAtifTanilari` üreticilerinin panele GİRMEMESİNİ şart
  // koşuyordu, oysa Founder'ın canlı kanıtı tam da bu üreticiden doğmuştur — komut
  // satırı `kırık-referans` uyarısı verirken panel "sorun algılanmadı" demiştir.
  // YUZ-3.1 hiçbir yüzün tanıyı gizlemesine izin vermez, YUZ-3.3 hata ile uyarıyı
  // Problems yüzeyine yollar; dolayısıyla hata ya da uyarı basan bir üreticinin
  // panelden düşmesi kapsam dar tutma değil, doğrudan kanon ihlalidir.
  assert.ok(capraz.has("referansTanilari"),
    "referansTanilari hata düzeyinde tanı basar (kırık-referans) — YUZ-3.1 gizleme yasağı gereği panele ULAŞMALIDIR");
  assert.ok(capraz.has("metinAtifTanilari"),
    "metinAtifTanilari uyarı düzeyinde tanı basar — YUZ-3.3 uyarıyı Problems yüzeyine yollar");
  assert.ok(!capraz.has("orkestrasyonTanilari"),
    "orkestrasyonTanilari ilanda yoktur ve panel süzgecine hiçbir yoldan giremez");
});

// Fikstür: tırnaklı bir referans hedefi taşıyan tek Adımlık en küçük çalışma
// alanı. Tırnaklı hedef, referans üreticisinin kenar-metin tanısını doğurur —
// bağımsız denetimin sızıntıyı kanıtladığı senaryonun birebir kendisidir.
const FIKSTUR_ANA = `-->|
## Amaç
Köken süzgeci nöbetinin fikstür ağacıdır; tırnaklı referans hedefi kenar-metin tanısını doğurur.
## Kapsam
Bir plan rafı ve tek Adımlık bir plan dosyası bulunur.
## Sonuç
Sınama, yalnız komut satırına ayrılmış üreticinin tanısının panel süzgecinden geçmediğini ölçer.
|<--
Proje( kod: PRJ-FX, ad: "fx", rejim: katı, ne: "köken süzgeci nöbetinin fikstürü" ) {
  Teknoloji( kod: TEK-FX, ne: "fikstür teknolojisi" )
  Raf( kod: RAF-FX-PLAN, yol: "plan/", ne: "plan dosyaları rafı" )
}
`;

const FIKSTUR_PLAN = `Faz( kod: FAZ-FX, ad: "fx mevsimi", ne: "fikstür dönemi", hedefTarih: "2099-12-31" ) {
  -->|
  ## Amaç
  Kenar-metin tanısını doğuran tek Adımı taşımak için kurulmuş gövdedir.
  ## Kapsam
  Bir teknoloji katmanı, bir departman modülü ve tek iş adımı bulunur.
  ## Sonuç
  Adımın tırnaklı referansı kenar-metin tanısını üretir ve sınama bunu ölçer.
  |<--
  Blok( kod: BLK-FX, ne: "fikstür işi" ) {
    Katman( kod: KAT-FX, ad: "fxkatman", ne: "fikstür katmanı", kullanır: TEK-FX ) {
      AltKatman( kod: ALT-FX, ad: "fxmodul", departman: kodlama, ne: "fikstür modülü" ) {
        Adım( kod: ADM-FX, durum: beklemede, ne: "tırnaklı referans hedefiyle kenar-metin tanısını doğurmak",
              görev: "bu adım yalnız sınama fikstürüdür ve hiçbir iş yapmaz",
              referans: [ "K-99" ],
              kabul: [ "kenar-metin tanısı üretilir ve köken damgası referans üreticisini gösterir" ] )
      }
    }
  }
}
`;

// YUZ-3.4 · UÇTAN UCA: hatırlatma ANI panele ulaşır mı? Yukarıdaki küme sınaması
// ilanın doğru yazıldığını ölçer; bu fikstür ilanın gerçek akışta karşılığı olduğunu
// ölçer. Ayrım önemlidir, çünkü ilan doğru yazılıp tanı yine de köken damgası
// taşımazsa süzgeç körleşir ve tanı panelden sessizce düşer.
const FIKSTUR_ATESLEME_ANA = `-->|
## Amaç
Ateşlemiş hatırlatıcı nöbetinin fikstür ağacıdır; hedefi tamamlanmış bir hatırlatıcı taşır.
## Kapsam
Bir plan rafı, tamamlanmış tek Adım ve ona bağlanmış bir hatırlatıcı bulunur.
## Sonuç
Sınama, ateşleme tanısının panel süzgecinden GEÇTİĞİNİ ölçer.
|<--
Proje( kod: PRJ-FXH, ad: "fxh", rejim: katı, ne: "ateşleme nöbetinin fikstürü" ) {
  Teknoloji( kod: TEK-FXH, ne: "fikstür teknolojisi" )
  Raf( kod: RAF-FXH-PLAN, yol: "plan/", ne: "plan dosyaları rafı" )
}

Hatırlatıcı(
  kod:              HTR-FXH,
  durum:            kararlaştı,
  çapa:             nitelik,
  hatırlat:         ADM-FXH,
  dönüşTetikleyici: "hedef Adım tamamlandığında",
  ne:               "Ateşleme nöbetinin fikstür hatırlatıcısıdır ve hedefi tamamlanmış olduğu için ateşlemiş sayılmalıdır.",
)
`;

const FIKSTUR_ATESLEME_PLAN = `Faz( kod: FAZ-FXH, ad: "fxh mevsimi", ne: "fikstür dönemi", hedefTarih: "2099-12-31" ) {
  -->|
  ## Amaç
  Ateşleme tanısını doğuran tamamlanmış Adımı taşımak için kurulmuş gövdedir.
  ## Kapsam
  Bir teknoloji katmanı, bir departman modülü ve tek tamamlanmış adım bulunur.
  ## Sonuç
  Hatırlatıcının hedefi kapandığı için ateşleme tanısı doğar ve sınama bunu ölçer.
  |<--
  Blok( kod: BLK-FXH, ne: "fikstür işi" ) {
    Katman( kod: KAT-FXH, ad: "fxhkatman", ne: "fikstür katmanı", kullanır: TEK-FXH ) {
      AltKatman( kod: ALT-FXH, ad: "fxhmodul", departman: kodlama, ne: "fikstür modülü" ) {
        Adım( kod: ADM-FXH, durum: tamamlandı, ne: "hatırlatıcının beklediği hedefi kapatmak",
              görev: "bu adım yalnız sınama fikstürüdür ve hiçbir iş yapmaz",
              kabul: [ "hedef kapandığı için bağlı hatırlatıcı ateşlemiş sayılır" ] )
      }
    }
  }
}
`;

test("YUZ-3.4 uçtan uca: ateşlemiş hatırlatıcı tanısı panel süzgecinden GEÇER", () => {
  const kok = mkdtempSync(join(tmpdir(), "sarmal-atesleme-"));
  try {
    writeFileSync(join(kok, "fxh_anadizin.sar"), FIKSTUR_ATESLEME_ANA, "utf8");
    mkdirSync(join(kok, "plan"));
    writeFileSync(join(kok, "plan", "fxh_plan.sar"), FIKSTUR_ATESLEME_PLAN, "utf8");
    const sonuc = denetimKos(kok, { snfYol: SNF_YOL, bugun: "2026-08-28", tamListe: true });
    const paneller = panelCaprazUreticiKumesi();
    let atesleme = 0;
    let panelegecen = 0;
    for (const rapor of sonuc.akis) {
      for (const t of rapor.tanilar) {
        if (t.kod !== "ateşlemiş-hatırlatıcı") continue;
        atesleme += 1;
        const uretici = sonuc.koken.get(t);
        assert.equal(uretici, "atesleyenHatirlaticiTanilari",
          "ateşleme tanısının köken damgası kendi üreticisini göstermeli; damgasız tanı süzgecin körü olur");
        if (uretici !== undefined && paneller.has(uretici)) panelegecen += 1;
      }
    }
    assert.ok(atesleme >= 1,
      "fikstür en az bir ateşleme tanısı üretmeli — üretmiyorsa nöbetin zemini çökmüştür ve panel yolu ölçülemez");
    assert.equal(panelegecen, atesleme,
      "ateşleme tanısı panel süzgecinden geçmedi — hatırlatma ANI yalnız komut satırında kalır ve hatırlatıcının vaadi boşa düşer (YUZ-3.4)");
  } finally {
    rmSync(kok, { recursive: true, force: true });
  }
});

// Fikstür: öncelik beyanı taşımayan tek açık Adımlık en küçük çalışma alanı.
// Ateşleme fikstürüyle aynı gövdeyi kullanır; tek fark Adımın açık (beklemede)
// olması ve `öncelik` alanını taşımamasıdır. Nöbet, ORK-3.4 tanısının köken
// damgasını ve panel süzgecinden geçişini ölçer.
const FIKSTUR_ONCELIKSIZ_ANA = `-->|
## Amaç
Önceliksiz Adım nöbetinin fikstür ağacıdır; öncelik beyanı olmayan tek açık Adım taşır.
## Kapsam
Bir plan rafı ve beyansız tek açık Adım bulunur.
## Sonuç
Sınama, önceliksiz Adım tanısının panel süzgecinden GEÇTİĞİNİ ölçer.
|<--
Proje( kod: PRJ-FXO, ad: "fxo", rejim: katı, ne: "önceliksiz Adım nöbetinin fikstürü" ) {
  Teknoloji( kod: TEK-FXO, ne: "fikstür teknolojisi" )
  Raf( kod: RAF-FXO-PLAN, yol: "plan/", ne: "plan dosyaları rafı" )
}
`;

const FIKSTUR_ONCELIKSIZ_PLAN = `Faz( kod: FAZ-FXO, ad: "fxo mevsimi", ne: "fikstür dönemi", hedefTarih: "2099-12-31" ) {
  -->|
  ## Amaç
  Önceliksiz Adım tanısını doğuran açık Adımı taşımak için kurulmuş gövdedir.
  ## Kapsam
  Bir teknoloji katmanı, bir departman modülü ve öncelik beyanı olmayan tek açık adım bulunur.
  ## Sonuç
  Adım açık ve beyansız olduğu için önceliksiz Adım tanısı doğar ve sınama bunu ölçer.
  |<--
  Blok( kod: BLK-FXO, ad: "fxo bloğu", ne: "fikstür işi" ) {
    Katman( kod: KAT-FXO, ad: "fxokatman", ne: "fikstür katmanı", kullanır: TEK-FXO ) {
      AltKatman( kod: ALT-FXO, ad: "fxomodul", departman: kodlama, ne: "fikstür modülü" ) {
        Adım( kod: ADM-FXO, durum: beklemede, ne: "öncelik beyanı olmayan açık adım",
              görev: "bu adım yalnız sınama fikstürüdür ve hiçbir iş yapmaz",
              kabul: [ "adım açık ve beyansız olduğu için önceliksiz Adım tanısı doğar" ] )
      }
    }
  }
}
`;

test("ORK-3.4 uçtan uca: önceliksiz Adım tanısı panel süzgecinden GEÇER", () => {
  const kok = mkdtempSync(join(tmpdir(), "sarmal-onceliksiz-"));
  try {
    writeFileSync(join(kok, "fxo_anadizin.sar"), FIKSTUR_ONCELIKSIZ_ANA, "utf8");
    mkdirSync(join(kok, "plan"));
    writeFileSync(join(kok, "plan", "fxo_plan.sar"), FIKSTUR_ONCELIKSIZ_PLAN, "utf8");
    const sonuc = denetimKos(kok, { snfYol: SNF_YOL, bugun: "2026-09-02", tamListe: true });
    const paneller = panelCaprazUreticiKumesi();
    let onceliksiz = 0;
    let panelegecen = 0;
    for (const rapor of sonuc.akis) {
      for (const t of rapor.tanilar) {
        if (t.kod !== "önceliksiz-adım") continue;
        onceliksiz += 1;
        const uretici = sonuc.koken.get(t);
        assert.equal(uretici, "onceliksizAdimTanilari",
          "önceliksiz Adım tanısının köken damgası kendi üreticisini göstermeli; damgasız tanı süzgecin körü olur");
        if (uretici !== undefined && paneller.has(uretici)) panelegecen += 1;
      }
    }
    assert.ok(onceliksiz >= 1,
      "fikstür en az bir önceliksiz Adım tanısı üretmeli — üretmiyorsa nöbetin zemini çökmüştür ve panel yolu ölçülemez");
    assert.equal(panelegecen, onceliksiz,
      "önceliksiz Adım tanısı panel süzgecinden geçmedi — beyansız açık Adım yalnız komut satırında kalır (ORK-3.4)");
  } finally {
    rmSync(kok, { recursive: true, force: true });
  }
});

/** BKM-DNT-A01: nöbetin YÖNÜ tersine çevrildi. Eskiden `kenar-metin` tanısının panele
 *  sızmaması ölçülüyordu; Founder hükmünden sonra ölçülen şey onun panele ULAŞMASIDIR.
 *  Köken damgası nöbeti olduğu gibi korunur: damgasız tanı süzgecin körü olur. */
test("köken süzgeci (fikstürlü): uyarı düzeyli kenar-metin tanısı panele ULAŞIR ve akıştaki her tanı köken damgası taşır", () => {
  const kok = mkdtempSync(join(tmpdir(), "sarmal-koken-"));
  try {
    writeFileSync(join(kok, "fx_anadizin.sar"), FIKSTUR_ANA, "utf8");
    mkdirSync(join(kok, "plan"));
    writeFileSync(join(kok, "plan", "fx_plan.sar"), FIKSTUR_PLAN, "utf8");
    const sonuc = denetimKos(kok, { snfYol: SNF_YOL, bugun: "2026-08-23", tamListe: true });
    const paneller = panelCaprazUreticiKumesi();
    let kenarMetin = 0;
    let paneleUlasan = 0;
    const kokensizler: string[] = [];
    for (const rapor of sonuc.akis) {
      for (const t of rapor.tanilar) {
        const uretici = sonuc.koken.get(t);
        if (uretici === undefined) kokensizler.push(`${rapor.dosya} → ${t.kod}`);
        if (t.kod !== "kenar-metin") continue;
        kenarMetin += 1;
        assert.equal(uretici, "referansTanilari",
          "fikstürdeki kenar-metin tanısının köken damgası referans üreticisini göstermeli");
        if (uretici !== undefined && paneller.has(uretici)) paneleUlasan += 1;
      }
    }
    assert.ok(kenarMetin >= 1,
      "fikstür en az bir kenar-metin tanısı üretmeli — üretmiyorsa sınamanın zemini çökmüş demektir, sızıntı ölçülemez");
    assert.equal(paneleUlasan, kenarMetin,
      "KÖRLÜK: uyarı düzeyli kenar-metin tanısı panel süzgecinden geçemedi — komut satırında görünüp panelde görünmeyen tanı YUZ-3.1'in gizleme yasağını çiğner");
    assert.deepEqual(kokensizler, [],
      "akıştaki her tanı köken damgası taşımalı; damgasız tanı süzgecin körü olur ve panelden sessizce düşer");
  } finally {
    rmSync(kok, { recursive: true, force: true });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// BKM-DNT-A01 · KANON UYUM NÖBETİ — "hiç görünmeme" hâlini gören aile
//
//   Var olan iki nöbet yalnız o koşuda FİİLEN ÜRETİLMİŞ tanılar üstünde döner;
//   panelde hiç koşmayan bir üretici hiç tanı üretmediği için o kümelere hiç
//   girmez ve nöbetler yapısal olarak yalnız FARKLI GÖRÜNME hâlini görür.
//   Aşağıdaki aile tabanını İLAN EDİLEN ÜRETİCİ KÜMESİNDEN alır, dolayısıyla
//   bir üreticinin kanonun gerektirdiği yüzeyde hiç bulunmamasını da görür.
// ═══════════════════════════════════════════════════════════════════════════

test("BKM-DNT-A01: canlı ilan kanonla uyumludur — hata/uyarı basıp panele ulaşamayan üretici SIFIRDIR", () => {
  const sapmalar = kanonUyumNobeti();
  assert.deepEqual(sapmalar, [],
    `ilan kanondan ayrıştı: ${JSON.stringify(sapmalar)}`);
});

test("BKM-DNT-A01: yalnız komut satırında kalan her girdi gerekçe taşır ve yalnız bilgi kademesindedir", () => {
  const cliOnly = KAPI_KAPSAMI.filter((g) => !g.yuzeyler.includes("panel"));
  assert.ok(cliOnly.length > 0, "ölçümün zemini: en az bir CLI-only girdi bulunmalı");
  const gerekcesiz = cliOnly.filter((g) => !g.cliGerekcesi?.trim()).map((g) => g.uretici);
  assert.deepEqual(gerekcesiz, [], "gerekçesiz CLI girdisi sessiz bir gizleme kararıdır");
  // BKM-DNT-A06: tek meşru istisna, aynı hükmü panele basan bir İKİZİ adıyla
  // beyan eden girdidir; beyan ölçülür — ikiz ilanda panelde yaşamak zorundadır.
  const panelliler = new Set(KAPI_KAPSAMI.filter((g) => g.yuzeyler.includes("panel")).map((g) => g.uretici));
  const bilgiDisi = cliOnly
    .filter((g) => g.kademe !== "bilgi" && !(g.panelIkizi && panelliler.has(g.panelIkizi)))
    .map((g) => `${g.uretici}:${g.kademe}`);
  assert.deepEqual(bilgiDisi, [],
    "panelsiz bir girdi ya yalnız bilgi düzeyinde konuşur ya da panelde yaşayan bir ikiz beyan eder (YUZ-3.3)");
  const ikizli = cliOnly.filter((g) => g.panelIkizi);
  for (const g of ikizli) {
    assert.ok(panelliler.has(g.panelIkizi!),
      `${g.uretici} ikizi olarak ${g.panelIkizi} beyan ediyor ama o üretici panelde yaşamıyor`);
  }
});

test("BKM-DNT-A01 · mutasyon: bir üreticinin panel yüzeyi ilandan DÜŞÜRÜLÜNCE nöbet kırmızıya döner", () => {
  const kurban = KAPI_KAPSAMI.find((g) => g.kademe === "hata" && g.yuzeyler.includes("panel"));
  assert.ok(kurban, "ölçümün zemini: hata basan panelli bir üretici bulunmalı");
  const mutasyonlu: KapiGirdisi[] = KAPI_KAPSAMI.map((g) => g.uretici === kurban.uretici
    ? { ...g, yuzeyler: g.yuzeyler.filter((y) => y !== "panel") }
    : g);
  const sapmalar = kanonUyumNobeti(mutasyonlu);
  const panelsiz = sapmalar.filter((s) => s.tur === "panelsiz-kademe");
  assert.deepEqual(panelsiz, [{ tur: "panelsiz-kademe", uretici: kurban.uretici, kademe: "hata" }],
    "panel yüzeyi düşürülen hata üreticisi 'panelsiz-kademe' sapması vermeli — bu, HİÇ GÖRÜNMEME hâlidir");
  // Geri alma kanıtı: mutasyonsuz ilan yine sıfır sapma verir (kaynağa dokunulmadı).
  assert.deepEqual(kanonUyumNobeti(KAPI_KAPSAMI), [], "geri alındıktan sonra nöbet yeniden yeşil");
});

test("BKM-DNT-A01 · mutasyon: CLI girdisinin gerekçesi silinince nöbet kırmızıya döner", () => {
  const kurban = KAPI_KAPSAMI.find((g) => !g.yuzeyler.includes("panel") && g.kademe === "bilgi" && !g.panelIkizi);
  assert.ok(kurban, "ölçümün zemini: ikizsiz, bilgi kademeli bir CLI-only girdi bulunmalı");
  const mutasyonlu: KapiGirdisi[] = KAPI_KAPSAMI.map((g) => g.uretici === kurban.uretici
    ? { uretici: g.uretici, modul: g.modul, kademe: g.kademe, yuzeyler: g.yuzeyler }
    : g);
  const sapmalar = kanonUyumNobeti(mutasyonlu);
  assert.deepEqual(sapmalar, [{ tur: "gerekçesiz-cli", uretici: kurban.uretici, kademe: kurban.kademe }],
    "gerekçesi silinen CLI girdisi 'gerekçesiz-cli' sapması vermeli");
});

/** İKİNCİ KÖRLÜK: var olan yönlendirme nöbeti tablo verilmediğinde tümüyle susar.
 *  Bu nöbet susmayı ayrışma sayar — ölçülemeyen hüküm ölçülmüş sayılamaz. */
test("BKM-DNT-A01: ilan tablosu BOŞ verilince nöbet susmaz, tablonun yokluğunu bildirir", () => {
  const sapmalar = kanonUyumNobeti([]);
  assert.deepEqual(sapmalar, [{ tur: "ilan-yok", uretici: "(ilan tablosu boş)" }],
    "boş tabloya sessiz kalmak, yapılmamış bir yönlendirmeyi doğru saymaktır");
});

/** Beyan elle yazılır fakat elle KALMAZ: gerçek bir denetim koşusundan gözlenen
 *  kademe, ilandaki beyanla karşılaştırılır. Beyanın gözlenenin ALTINDA kalması
 *  (bilgi denilen üreticinin hata basması) sessiz bir gizleme kaynağıdır. */
test("BKM-DNT-A01 · görgül: gerçek koşumlarda gözlenen kademe ilandaki beyanı AŞMAZ", () => {
  const sira = { bilgi: 0, "uyarı": 1, hata: 2 } as const;
  const beyan = new Map(KAPI_KAPSAMI.map((g) => [g.uretici, g.kademe]));
  const gozlenen = new Map<string, "hata" | "uyarı" | "bilgi">();
  const topla = (kok: string): void => {
    const sonuc = denetimKos(kok, { snfYol: SNF_YOL, bugun: "2026-09-10", tamListe: true });
    for (const rapor of sonuc.akis) {
      for (const t of rapor.tanilar) {
        const uretici = sonuc.koken.get(t);
        if (uretici === undefined) continue;
        const onceki = gozlenen.get(uretici);
        if (onceki === undefined || sira[t.duzey] > sira[onceki]) gozlenen.set(uretici, t.duzey);
      }
    }
  };
  // ① Deponun kendisi TEMİZDİR (sıfır hata · sıfır uyarı), dolayısıyla yalnız bilgi
  //    düzeyli üreticileri ateşler; tek başına bu koşum nöbete diş vermez.
  topla(fileURLToPath(new URL("../../..", import.meta.url)));
  // ② Bu yüzden BOZUK bir fikstür de koşulur: kırık atıf ile tırnaklı hedef,
  //    hata ve uyarı düzeyli üreticileri ateşler ve beyanı gerçekten sınar.
  const kok = mkdtempSync(join(tmpdir(), "sarmal-gorgul-"));
  try {
    writeFileSync(join(kok, "fx_anadizin.sar"), FIKSTUR_ANA, "utf8");
    mkdirSync(join(kok, "plan"));
    writeFileSync(join(kok, "plan", "fx_plan.sar"), FIKSTUR_PLAN, "utf8");
    topla(kok);
  } finally {
    rmSync(kok, { recursive: true, force: true });
  }
  assert.ok(gozlenen.size >= 8, `ölçümün zemini: koşumlar en az sekiz üreticiyi ateşlemeli (gözlenen ${gozlenen.size})`);
  const hataUyari = [...gozlenen.values()].filter((d) => d !== "bilgi").length;
  assert.ok(hataUyari >= 1, "ölçümün zemini: en az bir hata ya da uyarı düzeyli üretici ateşlemeli — yoksa nöbetin dişi yoktur");
  const eksikBeyan: string[] = [];
  for (const [uretici, duzey] of gozlenen) {
    const b = beyan.get(uretici);
    if (b === undefined) continue;   // ilanda olmayan üretici kapsamNobeti'nin işidir
    if (sira[duzey] > sira[b]) eksikBeyan.push(`${uretici}: beyan ${b}, gözlenen ${duzey}`);
  }
  assert.deepEqual(eksikBeyan, [],
    "beyan gözlenenin altında kalamaz — düşük beyan, üreticiyi kanonun gerektirdiği yüzeyden sessizce düşürür");
});

/**
 * STATİK KADEME NÖBETİ (BKM-DNT-A01 · görgül nöbetin körünü kapatır).
 *
 * Görgül nöbet yalnız o koşumda FİİLEN ateşlenen kademeleri görür: deponun kendisi
 * temiz olduğu için oradaki üreticiler bilgi düzeyinde konuşur ve `hata` basabilen
 * bir üretici `bilgi` diye beyan edilse bile görgül nöbet susar. Mutasyon ölçümü
 * 2026-09-10 tarihinde bunu göstermiştir: `omurgaTanilari` beyanı `bilgi`ye
 * düşürüldüğünde süit yeşil kalmıştır. Bu nöbet o körü kapatır — kademeyi
 * üreticinin KENDİ gövdesinden yeniden türetir ve beyanla karşılaştırır.
 *
 * Türetim depth-0'dır, yani yalnız üreticinin kendi gövdesindeki tanı çağrılarını
 * okur. Geçişli tarama bilinçli olarak KULLANILMAZ: paylaşılan yardımcılar üstünden
 * kirlenip yalnız bilgi basan üreticileri hata gibi gösterdiği ölçülmüştür. Gövdesi
 * yerine bir yardımcıya devreden dört üretici tek tek kaynaktan doğrulanıp aşağıya
 * yazılmıştır; devir tablosu değişirse bu nöbet kırmızı yanar ve tablo tazelenir.
 */
const DEVREDEN_URETICILER: Readonly<Record<string, readonly ("hata" | "uyarı" | "bilgi")[]>> = {
  // beyansizYapiDenetle → eskiTani("beyansız-yapı", "hata", …)
  beyansizYapiTanilari: ["hata"],
  // kuralci.ciftCatismasi → eskiTani("kural-çatışması", "hata", …) üç ayrı dalda
  dosyalararasiCatismaTanilari: ["hata"],
  // eskiTani("karşılıksız-metin-atfı", md ? "bilgi" : "uyarı", …) — üçlü koşul
  metinAtifTanilari: ["bilgi", "uyarı"],
  // duzey parametresi varsayılan "bilgi"; denetim.ts tek çağrı yerinde üç argüman verir
  ilansizGovdeDenetle: ["bilgi"],
};

test("BKM-DNT-A01 · statik: ilandaki kademe, üreticinin kendi gövdesinden türetilenle BİREBİR aynıdır", async () => {
  const { readFileSync } = await import("node:fs");
  const { YENI_TANI_INDEKS } = await import("../src/tani-sicili.ts");
  const src = fileURLToPath(new URL("../src/", import.meta.url));
  const kaynak = new Map(["denetci.ts", "dag.ts", "kuralci.ts", "dogrulayici.ts"]
    .map((m) => [m, readFileSync(join(src, m), "utf8")] as const));
  const sira = { bilgi: 0, "uyarı": 1, hata: 2 } as const;
  const govde = (metin: string, ad: string): string | undefined => {
    const es = new RegExp(`^export (?:async )?function \\*?${ad}\\s*[(<]`, "m").exec(metin);
    if (!es) return undefined;
    const son = metin.indexOf("\n}\n", es.index);
    return son < 0 ? metin.slice(es.index) : metin.slice(es.index, son + 3);
  };
  const ayrisan: string[] = [];
  const olcumsuz: string[] = [];
  for (const girdi of KAPI_KAPSAMI) {
    const kademeler = new Set<string>(DEVREDEN_URETICILER[girdi.uretici] ?? []);
    const g = govde(kaynak.get(girdi.modul) ?? "", girdi.uretici);
    if (g === undefined) { olcumsuz.push(girdi.uretici); continue; }
    for (const m of g.matchAll(/yeniTani\(\s*"([^"]+)"/gu)) {
      const kayit = YENI_TANI_INDEKS.get(m[1]);
      if (kayit) kademeler.add(kayit.kademe);
    }
    for (const m of g.matchAll(/eskiTani\(\s*"[^"]+"\s*,\s*"(hata|uyarı|bilgi)"/gu)) kademeler.add(m[1]);
    const bilinen = [...kademeler].filter((k): k is "hata" | "uyarı" | "bilgi" => k in sira);
    if (!bilinen.length) { olcumsuz.push(girdi.uretici); continue; }
    const turetilen = bilinen.sort((a, b) => sira[b] - sira[a])[0];
    if (turetilen !== girdi.kademe) ayrisan.push(`${girdi.uretici}: ilan ${girdi.kademe}, gövde ${turetilen}`);
  }
  assert.deepEqual(olcumsuz, [], "her ilan girdisinin kademesi gövdesinden ölçülebilmeli");
  assert.deepEqual(ayrisan, [],
    "ilandaki kademe üreticinin gövdesinden ayrıştı — düşük beyan üreticiyi kanonun gerektirdiği yüzeyden sessizce düşürür");
});

// ═══════════════════════════════════════════════════════════════════════════
// BKM-DNT-A06 · DÖRT YÜZEYLİ KAPSAM NÖBETİ
//
//   Eski nöbet yalnız komut satırı akışının kaynağını okuyordu ve üç ayrışma bu
//   körlüğün altında sessizce yaşıyordu: `dogusEksikTanilari` yalnız MCP'de
//   koşup ilanda hiç yoktu, AltKatman tekilliği tek-dosya yüzeyini beyan edip o
//   yola hiç uğramıyordu ve alt süreç köprüsüyle MCP'ye ulaşan altmış bir
//   üretici hiçbir yerde yazılı değildi. Aşağıdaki nöbetler üçünü de ölçer.
// ═══════════════════════════════════════════════════════════════════════════

const YUZEY_KAYNAKLARI = {
  denetim: readFileSync(fileURLToPath(new URL("../src/denetim.ts", import.meta.url)), "utf8"),
  mcp: readFileSync(fileURLToPath(new URL("../src/mcp.ts", import.meta.url)), "utf8"),
  cli: readFileSync(fileURLToPath(new URL("../src/sarmal.ts", import.meta.url)), "utf8"),
};

test("BKM-DNT-A06: ölçülebilir üç yüzeyin üçünde de ilan ile gerçek çağrı kümesi eşittir", () => {
  const sapmalar = yuzeyKapsamNobeti(YUZEY_KAYNAKLARI);
  assert.deepEqual(sapmalar, [],
    `yüzey ilanı gerçekle ayrıştı: ${JSON.stringify(sapmalar)}`);
});

test("BKM-DNT-A06: nöbet gerçekten ölçüyor — üç yüzeyin kümesi boş değildir ve birbirinden farklıdır", () => {
  const gercek = yuzeyGercekUreticileri(YUZEY_KAYNAKLARI);
  assert.ok((gercek.cli?.size ?? 0) > 50, "komut satırı kümesi ölçülemedi");
  assert.ok((gercek.mcp?.size ?? 0) >= 2, "MCP'nin doğrudan çağrı kümesi ölçülemedi");
  assert.equal(gercek.tekil?.size, 1, "tek-dosya yolu yalnız `dogrula` çağırır");
  assert.ok(gercek.tekil?.has("dogrula"));
  assert.ok(gercek.mcp?.has("dogusEksikTanilari"),
    "MCP doğrudan çağrı kümesi doğuş eksiği üreticisini içermeli — A06'nın kapattığı birinci ayrışma");
  assert.ok(!gercek.tekil?.has("altKatmanTekilligiTanilari"),
    "tek-dosya yolu AltKatman tekilliğine uğramaz — A06'nın kapattığı ikinci ayrışma");
  assert.equal(gercek.panel, undefined, "panel yüzeyinin kaynağı bu pakette değildir ve ölçülemez");
});

test("BKM-DNT-A06 · mutasyon: MCP'de çağrılan üretici ilandan silinince nöbet KIRMIZI yanar", () => {
  const mutasyonlu = KAPI_KAPSAMI.filter((g) => g.uretici !== "dogusEksikTanilari");
  const sapmalar = yuzeyKapsamNobeti(YUZEY_KAYNAKLARI, mutasyonlu);
  assert.deepEqual(sapmalar, [{ yuzey: "mcp", tur: "kayıt-fazlası", uretici: "dogusEksikTanilari" }],
    "MCP'de gerçekten çağrılan üretici ilandan düşünce 'kayıt-fazlası' doğmalı");
  assert.deepEqual(yuzeyKapsamNobeti(YUZEY_KAYNAKLARI, KAPI_KAPSAMI), [], "geri alınca nöbet yeşile döner");
});

test("BKM-DNT-A06 · mutasyon: koşmayan bir yüzey ilana yazılınca nöbet KIRMIZI yanar", () => {
  const mutasyonlu: KapiGirdisi[] = KAPI_KAPSAMI.map((g) => g.uretici === "altKatmanTekilligiTanilari"
    ? { ...g, yuzeyler: [...g.yuzeyler, "tekil" as const] }
    : g);
  const sapmalar = yuzeyKapsamNobeti(YUZEY_KAYNAKLARI, mutasyonlu);
  assert.deepEqual(sapmalar, [{ yuzey: "tekil", tur: "ilan-fazlası", uretici: "altKatmanTekilligiTanilari" }],
    "tek-dosya yoluna hiç uğramayan üreticinin `tekil` beyanı 'ilan-fazlası' vermeli");
  assert.deepEqual(yuzeyKapsamNobeti(YUZEY_KAYNAKLARI, KAPI_KAPSAMI), [], "geri alınca nöbet yeşile döner");
});

test("BKM-DNT-A06 · mutasyon: tek-dosya bölgesinin işareti silinince nöbet SUSMAZ", () => {
  const isaretsiz = {
    ...YUZEY_KAYNAKLARI,
    cli: YUZEY_KAYNAKLARI.cli.replace("// ── YÜZEY:tekil · BAŞLANGIÇ ──", "// (işaret silindi)"),
  };
  assert.notEqual(isaretsiz.cli, YUZEY_KAYNAKLARI.cli, "mutasyon deseni kaynağa uymadı");
  const sapmalar = yuzeyKapsamNobeti(isaretsiz);
  assert.ok(sapmalar.some((s) => s.yuzey === "tekil" && s.uretici.includes("çağrı bölgesi kaynakta bulunamadı")),
    "ölçülemeyen yüzey sessizce geçilemez — ölçülemeyen hüküm ölçülmüş sayılamaz");
});

test("BKM-DNT-A06: alt süreç köprüsü kuralı — komut satırı yüzeyli her üretici MCP'de de etkindir", () => {
  const etkin = mcpEtkinUreticiler(YUZEY_KAYNAKLARI);
  const cliKumesi = yuzeyUreticiKumesi("cli");
  for (const uretici of cliKumesi) {
    assert.ok(etkin.has(uretici), `${uretici} komut satırında koşuyor; köprü üstünden MCP'de de etkin olmalı`);
  }
  assert.ok(etkin.has("dogusEksikTanilari"), "doğrudan MCP çağrısı da etkin kümededir");
  assert.ok(etkin.size > cliKumesi.size,
    "köprü kümesi komut satırı kümesinden GENİŞ olmalı — eşitse doğrudan çağrılar sayılmıyor demektir");
});

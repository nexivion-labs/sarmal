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
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  KAPI_KAPSAMI, cliGercekUreticileri, kapsamNobeti, yuzeyUreticiKumesi, panelCaprazUreticiKumesi,
  type KapiGirdisi,
} from "../src/kapi-kapsami.ts";
import { denetimKos } from "../src/denetim.ts";

const DENETIM_YOLU = fileURLToPath(new URL("../src/denetim.ts", import.meta.url));
const SNF_YOL = fileURLToPath(new URL("../../../oz/siniflama/kayit.json", import.meta.url));

test("kapı-kapsamı nöbeti: bugünkü ilan ile CLI'nin gerçekten çağırdığı üretici kümesi TAM eşleşir (sıfır sapma)", () => {
  const gercek = cliGercekUreticileri(DENETIM_YOLU);
  const sapma = kapsamNobeti(gercek);
  assert.deepEqual(sapma, [],
    `ilan ile denetim.ts'in gerçek çağrı kümesi arasında sapma var: ${JSON.stringify(sapma)}`);
});

test("kapı-kapsamı nöbeti: ilana SAHTE bir kimlik eklenince nöbet kırmızıya döner (mutasyon 1 — ilan-fazlası)", () => {
  const gercek = cliGercekUreticileri(DENETIM_YOLU);
  const sahteGirdi: KapiGirdisi = {
    uretici: "uydurmaTanilariYokVeHicOlmayacak", modul: "denetci.ts", yuzeyler: ["cli"],
  };
  const mutasyonluIlan = [...KAPI_KAPSAMI, sahteGirdi];
  const sapma = kapsamNobeti(gercek, mutasyonluIlan);
  assert.equal(sapma.length, 1, "tek bir sapma bekleniyor — yalnız eklenen sahte kimlik");
  assert.deepEqual(sapma[0], { tur: "ilan-fazlası", uretici: "uydurmaTanilariYokVeHicOlmayacak" },
    "nöbet sahte kimliği 'ilan-fazlası' olarak damgalamalı: ilanda var, CLI'de gerçekten çağrılmıyor");
  // Geri alma kanıtı: mutasyonsuz ilan yine sıfır sapma verir — kaynağa hiç dokunulmadı.
  assert.deepEqual(kapsamNobeti(gercek, KAPI_KAPSAMI), [], "geri alındıktan sonra nöbet yeniden yeşil");
});

test("kapı-kapsamı nöbeti: gerçek bir üretici ilandan SİLİNİNCE nöbet kırmızıya döner (mutasyon 2 — kayıt-fazlası)", () => {
  const gercek = cliGercekUreticileri(DENETIM_YOLU);
  // Rastgele değil, GERÇEKTEN çağrılan bir üretici seçilir (denetle: yapısal
  // mutabakat — kayıp-yapı/harf-farkı/bildirilmemiş-dosya/yer-uyuşmazlığı'nın
  // üreticisi, panelde de koşuyor); bu satır ilandan çıkarılır.
  const silinecek = "denetle";
  assert.ok(gercek.has(silinecek), "test önkoşulu: 'denetle' CLI'de gerçekten çağrılmalı");
  const mutasyonluIlan = KAPI_KAPSAMI.filter((g) => g.uretici !== silinecek);
  const sapma = kapsamNobeti(gercek, mutasyonluIlan);
  assert.equal(sapma.length, 1, "tek bir sapma bekleniyor — yalnız silinen 'denetle' girdisi");
  assert.deepEqual(sapma[0], { tur: "kayıt-fazlası", uretici: "denetle" },
    "nöbet silinen üreticiyi 'kayıt-fazlası' olarak damgalamalı: CLI gerçekten çağırıyor, ilan artık susuyor");
  // Geri alma kanıtı: orijinal ilan yine sıfır sapma verir.
  assert.deepEqual(kapsamNobeti(gercek, KAPI_KAPSAMI), [], "geri alındıktan sonra nöbet yeniden yeşil");
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
  // SINIR NÖBETİ (Founder'a ayrılmış kapsam kararı): yalnız komut satırına ayrılmış
  // üreticiler panel süzgecine giremez. Bu satırların kırmızıya dönmesi, birinin
  // ilanda bir üreticiye panel yüzeyi eklediği anlamına gelir — o değişiklik
  // Founder kararı ister ve bu sınamayı da o kararla birlikte güncellemek gerekir.
  assert.ok(!capraz.has("referansTanilari"),
    "referansTanilari yalnız komut satırına ayrılmıştır; panel süzgecine girmesi Founder kararı olmadan kapsam genişlemesidir");
  assert.ok(!capraz.has("metinAtifTanilari"),
    "metinAtifTanilari yalnız komut satırına ayrılmıştır; panel süzgecine girmesi Founder kararı olmadan kapsam genişlemesidir");
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

test("köken süzgeci (fikstürlü): cli-only üreticinin kenar-metin tanısı panele SIZAMAZ ve akıştaki her tanı köken damgası taşır", () => {
  const kok = mkdtempSync(join(tmpdir(), "sarmal-koken-"));
  try {
    writeFileSync(join(kok, "fx_anadizin.sar"), FIKSTUR_ANA, "utf8");
    mkdirSync(join(kok, "plan"));
    writeFileSync(join(kok, "plan", "fx_plan.sar"), FIKSTUR_PLAN, "utf8");
    const sonuc = denetimKos(kok, { snfYol: SNF_YOL, bugun: "2026-08-23", tamListe: true });
    const paneller = panelCaprazUreticiKumesi();
    let kenarMetin = 0;
    let sizinti = 0;
    const kokensizler: string[] = [];
    for (const rapor of sonuc.akis) {
      for (const t of rapor.tanilar) {
        const uretici = sonuc.koken.get(t);
        if (uretici === undefined) kokensizler.push(`${rapor.dosya} → ${t.kod}`);
        if (t.kod !== "kenar-metin") continue;
        kenarMetin += 1;
        assert.equal(uretici, "referansTanilari",
          "fikstürdeki kenar-metin tanısının köken damgası referans üreticisini göstermeli");
        if (uretici !== undefined && paneller.has(uretici)) sizinti += 1;
      }
    }
    assert.ok(kenarMetin >= 1,
      "fikstür en az bir kenar-metin tanısı üretmeli — üretmiyorsa sınamanın zemini çökmüş demektir, sızıntı ölçülemez");
    assert.equal(sizinti, 0,
      "SIZINTI: yalnız komut satırına ayrılmış üreticinin kenar-metin tanısı panel süzgecinden geçti — Founder'a ayrılmış kapsam kararı kazara verilmiş olur");
    assert.deepEqual(kokensizler, [],
      "akıştaki her tanı köken damgası taşımalı; damgasız tanı süzgecin körü olur ve panelden sessizce düşer");
  } finally {
    rmSync(kok, { recursive: true, force: true });
  }
});

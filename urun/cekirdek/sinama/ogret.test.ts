// ogret.test.ts — 🚪 DVR-A01 karşılama kartı güvenceleri (OGR-2.2 · DIL-4).
//   Kartın çekirdek iddiası kendi kendini kanıtlar: minimal örnek diske yazılır,
//   şema + yapısal mutabakat denetiminden ⛔0 geçer — kart yalan söyleyemez.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { belirtecle } from "../src/belirtec.ts";
import { ayristir } from "../src/ayristirici.ts";
import { dogrula } from "../src/dogrulayici.ts";
import { siniflamaYukle, type Siniflama } from "../src/siniflama.ts";
import { iskeletPlani } from "../src/iskeletci.ts";
import { ogretKarti, MINIMAL_ANADIZIN, MINIMAL_PLAN } from "../src/ogret.ts";
import { denetimKos } from "../src/denetim.ts";

const SNF_YOL = fileURLToPath(new URL("../../../oz/siniflama/kayit.json", import.meta.url));
const SNF = siniflamaYukle(SNF_YOL);

test("DVR-A01: kartın minimal örneği KENDİNİ KANITLAR — iki dosya şema hatasız + yapısal mutabakat ⛔0", () => {
  for (const kaynak of [MINIMAL_ANADIZIN, MINIMAL_PLAN]) {
    const p = ayristir(belirtecle(kaynak));
    const hatalar = dogrula(p, SNF).filter((t) => t.duzey === "hata");
    assert.deepEqual(hatalar.map((t) => `${t.kod}: ${t.mesaj}`), [], "minimal örnek şema hatası taşıyamaz");
  }
  const dizin = mkdtempSync(join(tmpdir(), "ogret-"));
  writeFileSync(join(dizin, "ilk_proje_anadizin.sar"), MINIMAL_ANADIZIN);
  mkdirSync(join(dizin, "plan"));
  writeFileSync(join(dizin, "plan", "ilk_plan.sar"), MINIMAL_PLAN);
  // KYN-MTR-A05: yapısal-mutabakat katmanı artık `denetimKos` (CLI'nin çağırdığı
  // TEK gövde) üstünden ölçülür — proje-denetim.ts'in küçültülmüş yeniden yazımı emekli oldu.
  const yapi = denetimKos(dizin, { snfYol: SNF_YOL }).akis
    .flatMap((r) => r.tanilar.map((t) => ({ dosya: r.dosya, tani: t })))
    .filter((x) => x.tani.duzey === "hata");
  assert.deepEqual(yapi.map((x) => `${x.tani.kod}: ${x.tani.mesaj}`), [], "kapı hükmü hatasız olmalı");
});

/** Kartın vaadi "kendini kanıtlar"dır; hatasız olmak yetmez, UYARISIZ da olmalıdır.
 *  Gerekçe (2026-07-26 · dış proje bulgusu): kartın eski örneği belge bloğunu Faz'ın
 *  içine ama Blok'un üstüne koyuyordu. Belge kendinden SONRAKİ düğüme bağlandığı için
 *  okuyan onu Faz'ın belgesi sanıyor, sonraki Bloklara belge yazmıyor ve her biri
 *  `eksik-alan` uyarısı alıyordu. Örnek ayrıca Adım'ı doğrudan Katman altına koyarak
 *  `çıplak-adımlı-katman` uyarısı üretiyordu. Kanonik başlangıç örneğini taklit eden
 *  kullanıcı, taklit ettiği için uyarı alıyordu. Bu nöbet o gerilemeyi kalıcı olarak
 *  engeller. Bilgi düzeyli tanılar (açık-adım · olgunluk-onayı) meşrudur ve beklenir;
 *  onlar motorun susmama davranışıdır, örnek kusuru değildir. */
test("DVR-A01: kartın minimal örneği UYARI da üretmez — kanonik örnek anti-desen öğretemez", () => {
  const dizin = mkdtempSync(join(tmpdir(), "ogret-uyari-"));
  writeFileSync(join(dizin, "ilk_proje_anadizin.sar"), MINIMAL_ANADIZIN);
  mkdirSync(join(dizin, "plan"));
  writeFileSync(join(dizin, "plan", "ilk_plan.sar"), MINIMAL_PLAN);
  // KYN-MTR-A05: bkz. yukarıdaki nöbet — aynı gerekçeyle `denetimKos` çağrılır.
  const uyarilar = denetimKos(dizin, { snfYol: SNF_YOL }).akis
    .flatMap((r) => r.tanilar.map((t) => ({ dosya: r.dosya, tani: t })))
    .filter((x) => x.tani.duzey === "uyarı");
  assert.deepEqual(
    uyarilar.map((x) => `${x.tani.kod}: ${x.tani.mesaj}`), [],
    "kartın örneği uyarı üretemez — yeni kullanıcı örneği kopyalar, uyarıyı da kopyalar");
});

/** İlk iki nöbet yalnız şema + yapısal mutabakat katmanını koşuyordu; rejim
 *  denetimi gibi denetci.ts katmanında doğan tanılar kapsam dışında kalınca
 *  kart örneği rejim-beyanı-eksik hatası verdiği hâlde süit yeşil kalabildi
 *  (2026-08-03 kontrolcü bulgusu, belge turu kapısı). Bu nöbet CLI'nin koştuğu
 *  boru hattının kendisini (denetimKos) çağırır: motor yarın yeni bir denetim
 *  katmanı kazandığında kart örneği o katmandan da geçmek zorundadır. */
test("DVR-A01: kartın örneği TAM denetimden geçer — CLI denetle boru hattı (denetimKos) hatasız ve uyarısız", () => {
  const dizin = mkdtempSync(join(tmpdir(), "ogret-tam-"));
  writeFileSync(join(dizin, "ilk_proje_anadizin.sar"), MINIMAL_ANADIZIN);
  mkdirSync(join(dizin, "plan"));
  writeFileSync(join(dizin, "plan", "ilk_plan.sar"), MINIMAL_PLAN);
  const sonuc = denetimKos(dizin, { snfYol: SNF_YOL });
  assert.equal(sonuc.toplamHata, 0, "kart örneği tam denetimde hata taşıyamaz — kartın ⛔0 vaadi CLI boru hattında kanıtlanır");
  assert.equal(sonuc.toplamUyari, 0, "kart örneği tam denetimde uyarı da taşıyamaz");
});

test("DVR-A01: kart kanondan ÜRETİLİR — yeni zorunlu kenar kartta kendiliğinden görünür (elle bakım yok)", () => {
  const kart = ogretKarti(SNF);
  assert.ok(kart.includes(MINIMAL_ANADIZIN) && kart.includes(MINIMAL_PLAN), "kopyalanabilir iki dosya kartın içinde");
  assert.ok(kart.includes("sarmal denetle"), "yaz→denetle→düzelt döngüsü kartta");
  const snf2: Siniflama = { ...SNF, zorunluKenarlar: {
    ...(SNF.zorunluKenarlar ?? {}),
    "SahteTip": [{ grup: ["sahteKenar"], tanı: "sahte-tanı-dvr", mesaj: "m", öneri: "o" }],
  } };
  const kart2 = ogretKarti(snf2);
  assert.ok(kart2.includes("sahte-tanı-dvr") && kart2.includes("SahteTip"), "kanona eklenen kural kartta otomatik");
  assert.ok(!kart.includes("sahte-tanı-dvr"), "taban kartta sahte kural yok (üretim gerçekten kanodan)");
});

test("DVR-A01: iskelet Adım dosyası kapı tabelası taşır (yeni dosya — mevcut dosya ezilmez zaten)", () => {
  const kaynak = `Proje( kod: PRJ-T, ad: "t", ne: "x" ) {
  Faz( kod: FAZ-T, ne: "z" ) {
    Blok( kod: BLK-T, ne: "i" ) {
      Katman( kod: KAT-T, ad: "k", ne: "t" ) {
        Adım( kod: ADM-T, durum: beklemede, ne: "iş" )
      }
    }
  }
}`;
  const plan = iskeletPlani(ayristir(belirtecle(kaynak)), SNF);
  const adim = plan.ogeler.find((o) => o.tur === "dosya" && o.yol.endsWith(".md"));
  assert.ok(adim?.icerik?.includes("Sarmal iskelet ürünüdür"), "kapı tabelası iskelet çıktısında");
  assert.ok(adim?.icerik?.includes("sarmal ogret"), "tabela ilk-temas kartına işaret eder");
});

// ── ADM-STD-OGRET-PROTOKOL (YAS-3.4): model-bağımsız Asistan Protokolü ───────
test("YAS-3.4: ogret kartı beş maddelik Asistan Protokolü bölümünü üretir (model-bağımsız açılış)", () => {
  const kart = ogretKarti(SNF);
  assert.ok(kart.includes("ASİSTAN PROTOKOLÜ"), "protokol bölümü yok");
  for (const m of ["①", "②", "③", "④", "⑤"]) assert.ok(kart.includes(m), `protokol maddesi ${m} eksik`);
  for (const anahtar of ["İKİ VARLIK", "MCP-ÖNCE", "KARAR→PLAN", "DURUM AKIŞI", "TEK FORMAT"])
    assert.ok(kart.includes(anahtar), `protokol '${anahtar}' yönergesini içermeli`);
  // beş maddeyi AŞMAZ (koni bütçesi): ⑥ protokol bölümünde YOK
  const bolum = kart.slice(kart.indexOf("ASİSTAN PROTOKOLÜ"));
  assert.ok(!bolum.includes("⑥"), "protokol beş maddeyi aşamaz");
});

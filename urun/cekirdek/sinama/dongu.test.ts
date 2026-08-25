// ŞEF çekirdek döngüsü sınamaları (node:test) — RAY-3 Aşama 3 · SEF-L3-A02..A05.
// Gerçek LLM YOK: etmenÇağır deterministik mock olarak enjekte edilir (STR-3.1).
import { test } from "node:test";
import assert from "node:assert/strict";
import { belirtecle } from "../src/belirtec.ts";
import { ayristir } from "../src/ayristirici.ts";
import { baglamMontajla, sozlesmeBul, promptUret, programHaritasi } from "../src/sef.ts";
import type { DurakÖzet, KancaÖzet } from "../src/sef.ts";
import { sozlesmeSema, sozlesmeDenetle } from "../src/sozlesme.ts";
import { donguÇalıştır, durakOzetle, kontrolNoktasiYaz, kontrolNoktasiOku, programlariTopla, baglamKilidi, testDosyalariCikar } from "../src/dongu.ts";
import type { EtmenÇağır, EtmenÇağrı, KontrolNoktasiDurum, KancaÇağır } from "../src/dongu.ts";

// Bir Adım + iki ŞEF sözleşmesi (mek_sef.sar alanlarının çekirdeği) mock'lanır.
const SAR = `
Mekanizma( kod: MEK-T ){
  Sözleşme( kod: SZL-ETMEN-CIKTI, sürüm: "1.0" ){
    alanlar: {
      adım: "metin · zorunlu",
      etmen: "metin · zorunlu",
      rol: "metin · üretici|denetçi",
      güven: "sayı · 0..1",
      gerekçe: "metin · zorunlu",
    }
  }
  Sözleşme( kod: SZL-GEREKCE, sürüm: "1.0" ){
    alanlar: {
      adım: "metin · zorunlu",
      karar: "metin · zorunlu · kabul|revizyon|red|kurtarma|eskalasyon",
      ne: "metin · zorunlu",
      neden: "metin · zorunlu",
      kabulDurumu: "metin · GEÇTİ|PASS-WEAK|PARTIAL|CONDITIONAL",
    }
  }
  Blok( kod: BLK-T ){
    Katman( kod: FAZ-T ){
      AltKatman( kod: KAT-T ){
        Adım( kod: ADM-T, ad: "test-adım", görev: "bir şey üret", durum: beklemede )
      }
    }
  }
}
`;

function kur() {
  const programlar = new Map([["t.sar", ayristir(belirtecle(SAR))]]);
  const paket = baglamMontajla(programlar, "ADM-T")!;
  const ciktiSema = sozlesmeSema(sozlesmeBul(programlar, "SZL-ETMEN-CIKTI")!);
  const gerekceSema = sozlesmeSema(sozlesmeBul(programlar, "SZL-GEREKCE")!);
  return { paket, ciktiSema, gerekceSema };
}
const çalış = (etmen: EtmenÇağır, seç = {}) => {
  const { paket, ciktiSema, gerekceSema } = kur();
  return donguÇalıştır(paket, ciktiSema, gerekceSema, etmen, seç);
};

// Ortak üretici/denetçi çıktı kalıpları
const üretici = (over: Record<string, unknown>) => ({ etmen: "U", rol: "üretici", güven: 0.9, gerekçe: "gk", ...over });
const denetçi = (over: Record<string, unknown>) => ({ etmen: "D", rol: "denetçi", güven: 0.9, gerekçe: "gk", ...over });

// KNT-A05: makine-yazımlı koşum sicili fikstürü — köprünün araçSiciliYaz'ının (KNT-A01,
// KOŞULSUZ sahiplenme) çıktısına birebir AraçSonuç şekli. Mock'ta bunu biz yazıyoruz;
// üretimde bu alana YALNIZ köprü yazabilir (model uydursa da ezilir).
const SICIL_TEST_GECTI = [
  { durum: "izinli", araç: "test-koş", mod: "çağır", güvenilmez: true, sonuç: { çıkışKodu: 0, stdout: "tests 1 · pass 1" } },
];

test("① beyan-beyan uzlaşması VERIFIED VERMEZ — sicilsiz temiz koşu kabul/COMPLETED (KNT-A05)", () => {
  // ⚠️ TERSİNE ÇEVRİLDİ (KNT-A05): bu fikstür eskiden VERIFIED'ın pozitif kanıtıydı —
  // oysa testSonucu da üretilenDosyalar da LLM-YAZIMLI; iki rolün aynı string üzerinde
  // anlaşması bedava. Artık sicilsiz uzlaşma kabul edilir ama mühür COMPLETED'da kalır.
  const etmen: EtmenÇağır = (ç) => ç.rol === "üretici"
    ? üretici({ adım: ç.adımKod, testSonucu: "geçti", üretilenDosyalar: ["a.ts", "a.test.ts"] })
    : denetçi({ adım: ç.adımKod, testSonucu: "geçti — kanıt: a.test.ts:10", kırılganNoktalar: [] });
  const s = çalış(etmen);
  assert.equal(s.karar, "kabul");
  assert.equal(s.mühür, "COMPLETED", "iki LLM beyanının uzlaşması mekanik kanıt DEĞİL — VERIFIED sicil ister");
  assert.equal(s.kabulDurumu, "GEÇTİ");
  assert.equal(s.iterasyonlar.length, 1);
});

test("② yama döngüsü — iter0 GAP → iter1 RESOLVED → kabul (2 iterasyon)", () => {
  let n = 0;
  const etmen: EtmenÇağır = (ç) => {
    if (ç.rol === "üretici") { n++; return üretici({ adım: ç.adımKod, testSonucu: n === 1 ? "kaldı" : "geçti", üretilenDosyalar: n === 1 ? ["a.ts"] : ["a.ts", "a.test.ts"] }); }
    const ok = typeof ç.denetlenecek?.testSonucu === "string" && ç.denetlenecek.testSonucu.startsWith("geçti");
    return denetçi({ adım: ç.adımKod, testSonucu: ok ? "geçti — kanıt: a.test.ts:10" : "kaldı", kırılganNoktalar: ok ? [] : ["test yok (a.ts:1)"] });
  };
  const s = çalış(etmen);
  assert.equal(s.iterasyonlar.length, 2);
  assert.equal(s.iterasyonlar[0].durum, "GAP");
  assert.equal(s.iterasyonlar[1].durum, "RESOLVED");
  assert.equal(s.karar, "kabul");
});

test("③ izolasyon (ORK-6.1) — denetçi çağrısı yalnız üretici çıktısını görür, bağlamı değil", () => {
  let denetçiÇağrı: EtmenÇağrı | undefined;
  const etmen: EtmenÇağır = (ç) => {
    if (ç.rol === "denetçi") denetçiÇağrı = ç;
    return ç.rol === "üretici"
      ? üretici({ adım: ç.adımKod, testSonucu: "geçti", üretilenDosyalar: ["a.ts"] })
      : denetçi({ adım: ç.adımKod, testSonucu: "geçti — kanıt: a.test.ts:10", kırılganNoktalar: [] });
  };
  çalış(etmen);
  assert.ok(denetçiÇağrı, "denetçi çağrıldı");
  assert.equal(denetçiÇağrı!.denetlenecek?.etmen, "U", "denetçi girdisi = üretici çıktısı");
  // İzolasyon: denetçi prompt'unda üreticinin koni-bağlamı (görev metni) GEÇMEZ
  assert.ok(!denetçiÇağrı!.prompt.includes("bir şey üret"), "üretici bağlamı denetçiye sızmamalı");
});

test("④ sahte-yeşil reddi (YAS-4.1) — denetçi kanıt sunmadıysa 'temiz' kabul edilmez", () => {
  const etmen: EtmenÇağır = (ç) => ç.rol === "üretici"
    ? üretici({ adım: ç.adımKod, testSonucu: "geçti", üretilenDosyalar: ["a.ts"] })
    : denetçi({ adım: ç.adımKod, testSonucu: "geçti (kanıtsız — file:line yok)", kırılganNoktalar: [] });
  const s = çalış(etmen);
  assert.notEqual(s.karar, "kabul", "kanıtsız çıktı kabul edilmemeli");
  assert.ok(s.iterasyonlar[0].bulgular.some((b) => /sahte-yeşil/.test(b.mesaj)), "sahte-yeşil bulgusu enjekte edildi");
});

test("④b uydurma-kanıt reddi (Sol teftişi) — denetçi ÜRETİLMEYEN dosyayı kanıt gösterirse sahte-yeşil", () => {
  // Üretici yalnız a.ts üretti; denetçi 'geçti — uydurma.py:12' diyor. Kanıt dosyası
  // üretilenler beyanında YOK → beyanTutarli false (sicil de yok) → sahte-yeşil enjekte.
  const etmen: EtmenÇağır = (ç) => ç.rol === "üretici"
    ? üretici({ adım: ç.adımKod, testSonucu: "geçti", üretilenDosyalar: ["a.ts"] })
    : denetçi({ adım: ç.adımKod, testSonucu: "geçti — kanıt: uydurma.py:12", kırılganNoktalar: [] });
  const s = çalış(etmen);
  assert.notEqual(s.karar, "kabul", "üretilmeyen dosyaya dayalı kanıt kabul edilmemeli");
  assert.ok(s.iterasyonlar[0].bulgular.some((b) => /sahte-yeşil/.test(b.mesaj)),
    "kanıt üretilen dosyayı göstermiyor → sahte-yeşil bulgusu");
});

test("⑤ VERIFIED yalnız denetçi — üretici-rollü onay mührü VERIFIED olmaz (COMPLETED)", () => {
  const etmen: EtmenÇağır = (ç) => ç.rol === "üretici"
    ? üretici({ adım: ç.adımKod, testSonucu: "geçti", üretilenDosyalar: ["a.ts", "a.test.ts"] })
    // "denetçi" çağrısına YANLIŞ rol ile (üretici) dönen bozuk etmen:
    : { etmen: "D", rol: "üretici", güven: 0.95, gerekçe: "gk", adım: ç.adımKod, testSonucu: "geçti — kanıt: a.test.ts:10", kırılganNoktalar: [] };
  const s = çalış(etmen);
  assert.equal(s.karar, "kabul");
  assert.equal(s.mühür, "COMPLETED", "denetçi rolü olmadan VERIFIED konulamaz");
});

test("⑥a limit — aynı-yöntem-yasak: değişmeyen üretici çıktısı → eskalasyon/BLOCKED", () => {
  const etmen: EtmenÇağır = (ç) => ç.rol === "üretici"
    ? üretici({ adım: ç.adımKod, testSonucu: "kaldı", üretilenDosyalar: ["a.ts"] })   // hep aynı
    : denetçi({ adım: ç.adımKod, testSonucu: "kaldı", kırılganNoktalar: ["hâlâ eksik (a.ts:1)"] });
  const s = çalış(etmen);
  assert.equal(s.karar, "eskalasyon");
  assert.equal(s.mühür, "BLOCKED");
  assert.equal(s.iterasyonlar.length, 2, "iter0 GAP + iter1 aynı-imza → dur");
});

test("⑥b limit — maxIterasyon aşımı: yöntem değişse de sınırda eskalasyon", () => {
  let n = 0;
  const etmen: EtmenÇağır = (ç) => {
    if (ç.rol === "üretici") { n++; return üretici({ adım: ç.adımKod, gerekçe: `deneme ${n}`, testSonucu: "kaldı", üretilenDosyalar: [`a${n}.ts`] }); }
    return denetçi({ adım: ç.adımKod, testSonucu: "kaldı", kırılganNoktalar: [`eksik (a.ts:${n})`] });
  };
  const s = çalış(etmen, { maxIterasyon: 3 });
  assert.equal(s.iterasyonlar.length, 3);
  assert.equal(s.karar, "eskalasyon");
  assert.ok(s.ertelenenler.length > 0, "açık bulgular ertelenenlere (STR-2.1) yazıldı");
});

// ── D.1 RBAC entegrasyonu ────────────────────────────────────────────────────
// temizEtmen: KANITLI kabul kalıbı — denetçi çıktısı KNT-A05 sonrası makine sicili
// de taşır (araçTurları: test-koş çıkışKodu:0) ki VERIFIED yolu sınanabilir kalsın.
const temizEtmen: EtmenÇağır = (ç) => ç.rol === "üretici"
  ? üretici({ adım: ç.adımKod, testSonucu: "geçti", üretilenDosyalar: ["a.ts", "a.test.ts"] })
  : denetçi({ adım: ç.adımKod, testSonucu: "geçti — kanıt: a.test.ts:10", kırılganNoktalar: [], araçTurları: SICIL_TEST_GECTI });

test("⑦ RBAC — geçerli profil (üretici L3, denetçi L5/izole) → kabul/VERIFIED", () => {
  const s = çalış(temizEtmen, { rolProfil: { "üretici": { yetki: "L3", bellek: "paylaşık" }, "denetçi": { yetki: "L5", bellek: "izole" } } });
  assert.equal(s.karar, "kabul");
  assert.equal(s.mühür, "VERIFIED");
});

test("KNT-A07 (B7): SZL-GEREKCE şema ihlali VERIFIED'ı düşürür — kabulGate mühürde tüketilir, düşüş iz bırakır", () => {
  // Fikstür: SZL-GEREKCE'ye gerekceKur'un DOLDURMADIĞI zorunlu bir alan (imza) eklenir;
  // kabulGate ihlal döndürür → ⑦ ile AYNI temiz-kanıtlı koşu VERIFIED yerine COMPLETED alır.
  const SAR_IMZALI = SAR.replace(`neden: "metin · zorunlu",`, `neden: "metin · zorunlu",\n      imza: "metin · zorunlu",`);
  const programlar = new Map([["t.sar", ayristir(belirtecle(SAR_IMZALI))]]);
  const paket = baglamMontajla(programlar, "ADM-T")!;
  const ciktiSema = sozlesmeSema(sozlesmeBul(programlar, "SZL-ETMEN-CIKTI")!);
  const gerekceSema = sozlesmeSema(sozlesmeBul(programlar, "SZL-GEREKCE")!);
  const s = donguÇalıştır(paket, ciktiSema, gerekceSema, temizEtmen,
    { rolProfil: { "üretici": { yetki: "L3", bellek: "paylaşık" }, "denetçi": { yetki: "L5", bellek: "izole" } } });
  assert.equal(s.karar, "kabul");
  assert.equal(s.mühür, "COMPLETED", "şema-ihlalli gerekçe VERIFIED üretemez (KNT-A07)");
  assert.ok(s.ertelenenler.some((e) => /SZL-GEREKCE şema ihlali/.test(e)), "sessiz düşüş yok — ertelenene iz yazılır");
});

test("KNT-A10 (B4): kanıtsız denetçi bulgusu SAYILIR (bloklar — STR-4 v1 davranışı korunur) ve oranı ölçülür", () => {
  const etmen: EtmenÇağır = (ç) => ç.rol === "üretici"
    ? üretici({ adım: ç.adımKod, testSonucu: "geçti", üretilenDosyalar: ["a.ts"] })
    : denetçi({ adım: ç.adımKod, kırılganNoktalar: ["uygulama bozuk görünüyor"] });   // kanıtsız KALDI
  const s = çalış(etmen, { maxIterasyon: 1 });
  assert.notEqual(s.karar, "kabul", "kanıtsız bulgu v1'de düşürülmez — karar yolunu bloklamaya devam eder");
  assert.deepEqual(s.kanitDisiplini, { kanitsiz: 1, toplam: 1 }, "ihlal oranı ölçüldü (terfi verisi)");
});

test("KNT-A10 (B4): kanıtlı bulgu bugünkü gibi bloklar; ölçümde kanıtsız sayılmaz", () => {
  const etmen: EtmenÇağır = (ç) => ç.rol === "üretici"
    ? üretici({ adım: ç.adımKod, testSonucu: "geçti", üretilenDosyalar: ["a.ts"] })
    : denetçi({ adım: ç.adımKod, kırılganNoktalar: ["a.ts:10 sınır koşulu eksik"] });   // kanıtlı KALDI
  const s = çalış(etmen, { maxIterasyon: 1 });
  assert.notEqual(s.karar, "kabul");
  assert.deepEqual(s.kanitDisiplini, { kanitsiz: 0, toplam: 1 }, "kanıtlı bulgu disiplin ihlali değildir");
});

test("KNT-A10 (B4): temiz kabul koşusunda ölçüm alanı boş kalır (sentetik bulgular ölçüme girmez)", () => {
  const s = çalış(temizEtmen, { rolProfil: { "üretici": { yetki: "L3", bellek: "paylaşık" }, "denetçi": { yetki: "L5", bellek: "izole" } } });
  assert.equal(s.karar, "kabul");
  assert.equal(s.kanitDisiplini, undefined, "denetçi bulgusu yoksa disiplin ölçümü üretilmez");
});

test("⑧ RBAC — yasadışı denetçi profili (L3) → döngü başlamaz, red/BLOCKED", () => {
  const s = çalış(temizEtmen, { rolProfil: { "üretici": { yetki: "L3", bellek: "paylaşık" }, "denetçi": { yetki: "L3", bellek: "izole" } } });
  assert.equal(s.karar, "red");
  assert.equal(s.mühür, "BLOCKED");
  assert.equal(s.iterasyonlar.length, 0, "yetkisiz kadro ile hiç çağrı yapılmaz");
  assert.ok(s.ertelenenler.some((m) => /RBAC/.test(m)));
});

test("⑨ RBAC fail-closed — profilsiz de aktif: denetçi üretim taşıyamaz", () => {
  const etmen: EtmenÇağır = (ç) => ç.rol === "üretici"
    ? üretici({ adım: ç.adımKod, testSonucu: "geçti", üretilenDosyalar: ["a.ts"] })
    // denetçi ÜRETİM taşıyor (yasak) — rolProfil verilmese bile RBAC yakalar
    : denetçi({ adım: ç.adımKod, testSonucu: "geçti — kanıt: a.test.ts:10", üretilenDosyalar: ["denetçi-yazdı.ts"], kırılganNoktalar: [] });
  const s = çalış(etmen);   // rolProfil YOK → fail-closed varsayılan
  assert.notEqual(s.karar, "kabul");
  assert.ok(s.iterasyonlar[0].bulgular.some((b) => /denetçi üretmez|üretilenDosyalar/.test(b.mesaj)), "RBAC denetçi-üretemez bulgusu");
});

// ── D.3 Handoff + Kontrol noktası (SEF-L3-A11..A13) ───────────────────────────────

// SZL-DURAK şeması (mek_sef.sar kaynak-gerçeğinin inline dogfood kopyası).
const DURAK_SEMA = `Mekanizma(kod:M){ Sözleşme( kod: SZL-DURAK ){ alanlar: {
  adım: "metin · zorunlu",
  karar: "metin · zorunlu · kabul|revizyon|red|kurtarma|eskalasyon",
  mühür: "metin · zorunlu · COMPLETED|VERIFIED|BLOCKED",
  özet: "metin · zorunlu",
} } }`;

test("⑩ durakOzetle — DonguSonuç → DurakÖzet, SZL-DURAK şemasına uyar (dogfood, 0 ihlal)", () => {
  const s = çalış(temizEtmen);
  const d = durakOzetle(s);
  assert.equal(d.adım, "ADM-T");
  assert.equal(d.karar, "kabul");
  assert.equal(d.mühür, "VERIFIED");
  assert.ok(d.özet.length > 0, "özet dolu (sonraki Adım'a taşınır)");
  assert.ok(d.kanıt && /:\d+/.test(d.kanıt), "kanıt file:line taşır (VARLIK≠DOĞRULUK)");
  assert.ok(Array.isArray(d.ertelenenler));
  // Davranışsal kanıt: çıktı SZL-DURAK sözleşmesiyle doğrulanır (alan-var değil şema-uyumlu)
  const sema = sozlesmeSema(sozlesmeBul(new Map([["d.sar", ayristir(belirtecle(DURAK_SEMA))]]), "SZL-DURAK")!);
  assert.equal(sozlesmeDenetle(sema, d as unknown as Record<string, unknown>).length, 0, "durakOzetle SZL-DURAK'a uyar");
});

test("⑪ handoff — baglamMontajla(öncekiDurak) → prompt'ta '## ⏮️ Önceki Durak' bölümü", () => {
  const programlar = new Map([["t.sar", ayristir(belirtecle(SAR))]]);
  const durak: DurakÖzet = { adım: "ADM-ONCE", karar: "kabul", mühür: "VERIFIED", özet: "önceki iş bitti", ertelenenler: ["açık kalem X"], kanıt: "a.test.ts:5" };
  const paket = baglamMontajla(programlar, "ADM-T", durak)!;
  assert.deepEqual(paket.öncekiDurak, durak, "öncekiDurak bağlam paketine girer");
  const prompt = promptUret(paket);
  assert.ok(prompt.includes("## ⏮️ Önceki Durak"), "handoff bölümü prompt'ta");
  assert.ok(prompt.includes("ADM-ONCE"), "önceki Adım kodu prompt'ta");
  assert.ok(prompt.includes("açık kalem X"), "devralınan açık kalem prompt'ta (carry-forward)");
});

test("⑫ handoff yok — öncekiDurak verilmezse bölüm basılmaz (geriye-uyumlu)", () => {
  const programlar = new Map([["t.sar", ayristir(belirtecle(SAR))]]);
  const paket = baglamMontajla(programlar, "ADM-T")!;   // 3. param yok
  assert.equal(paket.öncekiDurak, undefined);
  assert.ok(!promptUret(paket).includes("Önceki Durak"), "durak yoksa bölüm çıkmaz");
});

test("⑬ kontrol noktası — round-trip: kontrolNoktasiYaz → kontrolNoktasiOku tam eşit", () => {
  const durum: KontrolNoktasiDurum = {
    akış: ["ADM-A", "ADM-B"],
    tamamlanan: [{ adım: "ADM-A", karar: "kabul", mühür: "VERIFIED", özet: "bitti", ertelenenler: [] }],
  };
  assert.deepEqual(kontrolNoktasiOku(kontrolNoktasiYaz(durum)), durum);
});

test("⑭ kontrol noktası — bozuk JSON → boş akış (arıza-güvenli, çökmе yok)", () => {
  const boş = kontrolNoktasiOku("{ bozuk json");
  assert.deepEqual(boş, { akış: [], tamamlanan: [] });
});

// ── K9 · A24 · Kanca (hook) ateşleme mekanizması ─────────────────────────────
// paket.kancalar'ı elle kurup (A23 toplama ayrı testlenir) YALNIZ ateşleme mantığını izole eder.
const kancalarİle = (kancalar: KancaÖzet[], etmen: EtmenÇağır, kancaÇağır?: KancaÇağır) => {
  const { paket, ciktiSema, gerekceSema } = kur();
  (paket as { kancalar: KancaÖzet[] }).kancalar = kancalar;
  return donguÇalıştır(paket, ciktiSema, gerekceSema, etmen, { kancaÇağır });
};
// temizEtmen (yukarıda tanımlı · kanıtlı kabul) yeniden kullanılır. Hep-başarısız etmen
// (şema-ihlali → 2-hata eskale → mühür BLOCKED) hata-hook yolunu tetikler:
const kancaBaşarısızEtmen: EtmenÇağır = (ç) => ç.rol === "üretici"
  ? { adım: ç.adımKod } as Record<string, unknown>   // zorunlu alan eksik → ard-arda ihlal
  : denetçi({ adım: ç.adımKod, kırılganNoktalar: ["boşluk (a.ts:1)"] });
const ONCE: KancaÖzet = { kod: "KNC-ONCE", evre: "önce", ne: "kaynak-teyit kapısı", etmen: "ETM-X" };
const SONRA: KancaÖzet = { kod: "KNC-SONRA", evre: "sonra", ne: "öz-denetim", etmen: "ETM-X" };
const HATA: KancaÖzet = { kod: "KNC-HATA", evre: "hata", ne: "kurtarma", etmen: "ETM-X" };

test("⑮ önce-hook 'hata' → FAIL-CLOSED: döngü BLOCKED, üretici HİÇ çağrılmaz", () => {
  let çağrıSayısı = 0;
  const izlenen: EtmenÇağır = (ç) => { çağrıSayısı++; return temizEtmen(ç); };
  const kancaÇağır: KancaÇağır = (k) => ({ kod: k.kod, evre: k.evre, durum: "hata", mesaj: "kaynak yok" });
  const s = kancalarİle([ONCE], izlenen, kancaÇağır);
  assert.equal(s.mühür, "BLOCKED", "önce-hook hata → BLOCKED");
  assert.equal(s.iterasyonlar.length, 0, "üretici/denetçi döngüsü hiç başlamamalı");
  assert.equal(çağrıSayısı, 0, "etmen HİÇ çağrılmamalı (fail-closed)");
  assert.ok(s.kancaSonuçları?.some((r) => r.kod === "KNC-ONCE" && r.durum === "hata"));
});

test("⑯ önce-hook 'tamam' → döngü akar; sonra-hook kabul SONRASI ateşlenir", () => {
  const kancaÇağır: KancaÇağır = (k) => ({ kod: k.kod, evre: k.evre, durum: "tamam" });
  const s = kancalarİle([ONCE, SONRA], temizEtmen, kancaÇağır);
  assert.equal(s.karar, "kabul");
  assert.ok(s.iterasyonlar.length > 0, "önce-hook geçince döngü koşar");
  const evreler = (s.kancaSonuçları ?? []).map((r) => r.evre);
  assert.deepEqual(evreler, ["önce", "sonra"], "önce (döngü öncesi) + sonra (kabul sonrası) ateşlendi");
});

test("⑰ hata-hook mühür=BLOCKED olunca ateşlenir; sonra-hook ateşlenmez", () => {
  const kancaÇağır: KancaÇağır = (k) => ({ kod: k.kod, evre: k.evre, durum: "tamam" });
  const s = kancalarİle([SONRA, HATA], kancaBaşarısızEtmen, kancaÇağır);
  assert.equal(s.mühür, "BLOCKED");
  const kodlar = (s.kancaSonuçları ?? []).map((r) => r.kod);
  assert.ok(kodlar.includes("KNC-HATA"), "BLOCKED → hata-hook ateşlenir");
  assert.ok(!kodlar.includes("KNC-SONRA"), "BLOCKED yolunda sonra-hook ateşlenmez");
});

test("⑱ kancaÇağır YOK → Kanca'lar uykuda (kancaSonuçları undefined · geriye-uyumlu)", () => {
  const s = kancalarİle([ONCE, SONRA], temizEtmen);   // yürütücü verilmedi
  assert.equal(s.karar, "kabul", "hook'suz eski davranış birebir");
  assert.equal(s.kancaSonuçları, undefined, "yürütücü yoksa hiç ateşlenmez");
});

// ── K10 · A26 · programlariTopla (cross-entity sözleşme kaynağı · disk okur) ──
// Yollar cekirdek'e görelidir (npm test cwd=cekirdek).
test("⑲ programlariTopla — sozlesmeDizin yok → programHaritasi ile birebir (geriye-uyumlu)", () => {
  const tek = programlariTopla("sinama/fikstur");
  const ref = programHaritasi("sinama/fikstur");
  assert.equal(tek.size, ref.size, "tek dizin: aynı program sayısı");
  assert.ok(tek.size > 0, "fikstur .sar'ları yüklendi");
});

test("⑳ programlariTopla — iki dizin çakışmasız birleşir (graf + sözleşme kaynağı)", () => {
  const a = programHaritasi("sinama/fikstur").size;
  const b = programHaritasi("../../is/plan/mekanizma").size;   // mek_sef.sar (SZL-* sözleşmeleri)
  const birlesik = programlariTopla("sinama/fikstur", "../../is/plan/mekanizma");
  assert.equal(birlesik.size, a + b, "çakışmasız birleşim = toplam program sayısı");
  assert.ok(b > 0, "sözleşme kaynağı .sar'ları da katıldı");
});

// ── HALKA-GUV: güvenlik halkası (üretici→denetçi→GÜVENLİK · oturum 29) ────────
import { guvenlikPrompt, guvenlikBulgulariCikar, ciddiMi } from "../src/dongu.ts";

const guvEtmen = (bulgular: unknown[]): EtmenÇağır => (ç) => {
  if (ç.rol === "üretici") return üretici({ adım: ç.adımKod, testSonucu: "geçti", üretilenDosyalar: ["a.ts", "a.test.ts"] });
  if (ç.rol === "denetçi") return denetçi({ adım: ç.adımKod, testSonucu: "geçti — kanıt: a.test.ts:10", kırılganNoktalar: [], araçTurları: SICIL_TEST_GECTI });
  return { etmen: "G", rol: "güvenlik", güven: 0.9, gerekçe: "tarama", adım: ç.adımKod, bulgular };
};

test("⑲ güvenlik halkası: CİDDİ bulgu (kategori+kanıt) → BLOCKED; ciddi-olmayan Hatırlatıcı'ya düşer", () => {
  const s = çalış(guvEtmen([
    { mesaj: "SQL enjeksiyonu: girdi doğrulanmadan sorguya giriyor", kanıt: "a.ts:12", kategori: "injection" },
    { mesaj: "log seviyesi düşük", kategori: "diğer" },
  ]), { guvenlikAktif: true });
  assert.equal(s.mühür, "BLOCKED", "ciddi güvenlik bulgusu BLOCKED üretmeli");
  assert.equal(s.guvenlikBulgular?.length, 2);
  assert.ok(s.ertelenenler.some((e) => e.includes("log seviyesi")), "ciddi-olmayan bulgu carry-forward (STR-2.1)");
});

test("⑳ güvenlik halkası: temiz tarama VERIFIED'ı korur; opt-in kapalıyken güvenlik HİÇ çağrılmaz", () => {
  let guvCagri = 0;
  const say: EtmenÇağır = (ç) => {
    if (ç.rol === "güvenlik") guvCagri++;
    return guvEtmen([])(ç);
  };
  const acik = çalış(say, { guvenlikAktif: true });
  assert.equal(acik.mühür, "VERIFIED", "temiz tarama mührü bozmaz");
  assert.equal(guvCagri, 1, "güvenlik tam bir kez çağrılır");
  guvCagri = 0;
  const kapali = çalış(say, {});
  assert.equal(kapali.mühür, "VERIFIED");
  assert.equal(guvCagri, 0, "opt-in kapalı → güvenlik çağrılmaz (geriye-uyumlu)");
  assert.equal(kapali.guvenlikBulgular, undefined);
});

// GOC-PROJEKOD-A07: iddia eskiden prompt'un iç kural NUMARASINI taşımasını ölçüyordu.
// Numara kullanıcı-yüzü metne girmez; hüküm cümlenin içinde yaşar. Bu yüzden iddia
// gevşetilmedi, HÜKMÜN KENDİSİNE bağlandı — prompt artık ebedî güvenlik hükmünü
// (güvenlik bilgisi yalnız koruma amacıyla kullanılır) sözle beyan etmek zorundadır.
test("㉑ güvenlik prompt'u ebedî koruma-amacı hükmünü sözle taşır + kategorili çıkarım toleranslı", () => {
  const p = guvenlikPrompt({ x: 1 });
  assert.ok(p.includes("EBEDÎ"), "prompt ebedî rütbeyi beyan etmiyor");
  assert.ok(p.includes("yalnız koruma amacıyla"), "prompt koruma-amacı hükmünü sözle taşımıyor");
  assert.ok(p.includes("istismar") && p.includes("injection"));
  const b = guvenlikBulgulariCikar({ bulgular: [{ mesaj: "m", kanıt: "f:1", kategori: "secret" }, { garip: true }] });
  assert.equal(b.length, 2);
  assert.ok(ciddiMi(b[0]) && !ciddiMi(b[1]));
});

// ── HALKA-ORK-A01: kadro kimliği çağrıya biner ────────────────────────────────
test("㉒ kadro çözümü: paket.etmen üretici çağrısına taşınır (trace/panel görür)", () => {
  const { paket, ciktiSema, gerekceSema } = kur();
  paket.etmen = { kod: "ETM-TEST", ad: "test-uzmanı" };
  let gorulen: EtmenÇağrı | undefined;
  const etmen: EtmenÇağır = (ç) => {
    if (ç.rol === "üretici") gorulen = ç;
    return guvEtmen([])(ç);
  };
  donguÇalıştır(paket, ciktiSema, gerekceSema, etmen, {});
  assert.deepEqual(gorulen?.etmen, { kod: "ETM-TEST", ad: "test-uzmanı" });
});

// ═══ SEF-L3-A30/31/32 · DÖNGÜ ENTEGRASYONU (debate · recovery · çok-Etmen) ═══
import { donguKurtarmali } from "../src/dongu.ts";
import { atananEtmenler } from "../src/sef.ts";
import { fileURLToPath as fUP } from "node:url";
import { readFileSync as oku } from "node:fs";

// Gerçek SZL-MÜZAKERE sözleşmesi mek_sef.sar'dan OKUNUR (dogfood — koda gömülmez).
function muzakereSemasi() {
  const kaynak = oku(fUP(new URL("../../../is/plan/mekanizma/mek_sef.sar", import.meta.url)), "utf8");
  const programlar = new Map([["mek_sef.sar", ayristir(belirtecle(kaynak))]]);
  const node = sozlesmeBul(programlar, "SZL-MÜZAKERE");
  assert.ok(node, "SZL-MÜZAKERE mek_sef.sar'da ilan edilmiş olmalı");
  return sozlesmeSema(node!);
}

test("A30: itirazlı bulgu müzakereden geçip düşer → kabul; SZL-MÜZAKERE şeması mek-sef'ten doğrulanır; iz iterasyonda", () => {
  const etmen: EtmenÇağır = (ç) => ç.rol === "üretici"
    ? üretici({ adım: "ADM-T", üretilenDosyalar: ["a.ts"] })
    : denetçi({ adım: "ADM-T", kırılganNoktalar: ["kapsam düşük (a.ts:12)"], testSonucu: "geçti — a.ts:12" });
  const s = çalış(etmen, {
    muzakere: {
      savun: () => ({ iddia: "kapsam yeterli — uç senaryolar ayrı Adım'da", kanıt: "a.test.ts:3" }),
      hakem: () => "itiraz-haklı" as const,
      sema: muzakereSemasi(),
    },
  });
  assert.equal(s.karar, "kabul", JSON.stringify(s.gerekçe));
  assert.equal(s.iterasyonlar.length, 1);
  const m = s.iterasyonlar[0].muzakereler;
  assert.ok(m && m.length === 1 && m[0].hüküm === "itiraz-haklı", "müzakere izi iterasyonda taşınmalı");
  assert.ok(!s.iterasyonlar[0].bulgular.some((b) => /SZL-MÜZAKERE ihlali/.test(b.mesaj)), "gerçek şemayla tur kaydı uyumlu olmalı");
});

test("A30: hakem bulguyu geçerli sayarsa akış ESKİ davranışta (yama turu) — itirazsız/ayarsız birebir regresyonsuz", () => {
  const etmen: EtmenÇağır = (ç) => ç.rol === "üretici"
    ? üretici({ adım: "ADM-T", üretilenDosyalar: ["a.ts"] })
    : denetçi({ adım: "ADM-T", kırılganNoktalar: ["gerçek eksik (a.ts:5)"], testSonucu: "geçti — a.ts:5" });
  // ① müzakeresiz (ayarsız): bulgu kalır — kabul DEĞİL (mevcut davranış)
  const eski = çalış(etmen);
  assert.notEqual(eski.karar, "kabul");
  // ② müzakereli ama hakem 'bulgu-geçerli': bulgu YİNE kalır — davranış eşit
  const yeni = çalış(etmen, {
    muzakere: { savun: () => ({ iddia: "itiraz" }), hakem: () => "bulgu-geçerli" as const },
  });
  assert.equal(yeni.karar, eski.karar, "hüküm bulgu-geçerliyken akış itirazsızla aynı kalmalı");
});

test("A30: tur limiti savunma sürerken dolarsa koşu ESKALE edilir (sessiz kabule düşmez)", () => {
  let iddiaNo = 0;
  const etmen: EtmenÇağır = (ç) => ç.rol === "üretici"
    ? üretici({ adım: "ADM-T", üretilenDosyalar: ["a.ts"] })
    : denetçi({ adım: "ADM-T", kırılganNoktalar: ["sorun (a.ts:1)"], testSonucu: "geçti — a.ts:1" });
  const s = çalış(etmen, {
    muzakere: {
      savun: () => ({ iddia: `yeni sav ${++iddiaNo}` }),   // hep taze iddia — kilit değil, LİMİT dolmalı
      hakem: () => "bulgu-geçerli" as const,
      maxTur: 2,
    },
  });
  assert.equal(s.karar, "eskalasyon", JSON.stringify(s.gerekçe));
  assert.ok(s.iterasyonlar[0].muzakereler?.[0].limitAşıldı, "limitAşıldı bayrağı taşınmalı");
});

test("A31: BLOCKED koşu üç yoldan ilerler — yeniden-dene çevrimi, böl yalnız ÖNERİ, eskale Hatırlatıcı; durak kurtarmayı taşır", () => {
  let üretimSayısı = 0;
  const hepBulgulu: EtmenÇağır = (ç) => ç.rol === "üretici"
    ? üretici({ adım: "ADM-T", üretilenDosyalar: [`a${++üretimSayısı}.ts`] })   // her tur farklı imza (aynı-yöntem kilidi değil)
    : denetçi({ adım: "ADM-T", kırılganNoktalar: [`kapanmayan sorun (a.ts:${üretimSayısı})`], testSonucu: "geçti — a.ts:1" });
  const { paket, ciktiSema, gerekceSema } = kur();

  // basit strateji: deneme1 yeniden-dene (2. çevrim koşar) → deneme2 böl → dur
  const s = donguKurtarmali(paket, ciktiSema, gerekceSema, hepBulgulu, {});
  assert.equal(s.karar, "kurtarma");
  assert.equal(s.kurtarma?.yol, "böl");
  assert.ok((s.kurtarma?.bölmeÖnerisi?.length ?? 0) > 0, "böl yalnız ÖNERİ üretir (YUZ-1.2)");
  // KNT-A05: yama tavanı GEÇİCİ 2 → tek çevrim en çok 2 üretim; >2 = ikinci çevrim koştu.
  assert.ok(üretimSayısı > 2, "yeniden-dene ikinci çevrimi gerçekten koşturmalı");
  const durak = durakOzetle(s);
  assert.equal(durak.kurtarma?.yol, "böl", "durak/kontrol noktası kurtarma durumunu taşımalı");

  // enjekte strateji: doğrudan eskale → Hatırlatıcı ertelenenlere düşer
  const e = donguKurtarmali(paket, ciktiSema, gerekceSema, hepBulgulu, {}, { strateji: () => "eskale" });
  assert.equal(e.kurtarma?.yol, "eskale");
  assert.ok(e.ertelenenler.some((x) => /insan kararı/.test(x)), "eskalasyon Hatırlatıcı metni taşımalı");

  // BLOCKED olmayan koşu: sarmalayıcı sonucu AYNEN geçirir (regresyon yok)
  const temiz: EtmenÇağır = (ç) => ç.rol === "üretici"
    ? üretici({ adım: "ADM-T", üretilenDosyalar: ["a.ts"] })
    : denetçi({ adım: "ADM-T", testSonucu: "geçti — a.ts:1" });
  const t = donguKurtarmali(paket, ciktiSema, gerekceSema, temiz, {});
  assert.equal(t.karar, "kabul");
  assert.equal(t.kurtarma, undefined);
});

const SAR_COK = `
Mekanizma( kod: MEK-C ){
  Sözleşme( kod: SZL-ETMEN-CIKTI, sürüm: "1.0" ){
    alanlar: { adım: "metin · zorunlu", etmen: "metin · zorunlu", rol: "metin · üretici|denetçi", güven: "sayı · 0..1", gerekçe: "metin · zorunlu" }
  }
  Sözleşme( kod: SZL-GEREKCE, sürüm: "1.0" ){
    alanlar: { adım: "metin · zorunlu", karar: "metin · zorunlu · kabul|revizyon|red|kurtarma|eskalasyon", ne: "metin · zorunlu", neden: "metin · zorunlu", kabulDurumu: "metin · GEÇTİ|PASS-WEAK|PARTIAL|CONDITIONAL" }
  }
  Blok( kod: BLK-C ){
    Katman( kod: FAZ-C ){
      Adım( kod: ADM-C, ad: "çok-etmen-adım", görev: "api + testini üret", durum: beklemede )
    }
  }
  Etmen( kod: ETM-API, ad: "api-uzmanı", tür: uzman ){
    Beceri( kod: BCR-API, ne: "api iskeleti", sağlar: "routing" )
  }
  Etmen( kod: ETM-TST, ad: "test-uzmanı", tür: uzman ){
    Beceri( kod: BCR-TST, ne: "test disiplini", sağlar: "kapsam" )
  }
  Görev( kod: GRV-C1, gerçekleştirir: ADM-C, atanan: ETM-API, durum: beklemede )
  Görev( kod: GRV-C2, gerçekleştirir: ADM-C, atanan: ETM-TST, durum: beklemede )
}
`;

test("A32: iki atanan Etmen — paylar kendi bağlamıyla sıralı üretir, denetçi BİRLEŞİK çıktıyı görür → kabul", () => {
  const programlar = new Map([["c.sar", ayristir(belirtecle(SAR_COK))]]);
  const etmenler = atananEtmenler(programlar, "ADM-C");
  assert.deepEqual(etmenler.map((e) => e.kod), ["ETM-API", "ETM-TST"], "iki Görev'in atananları sıralı toplanmalı");

  const paketler = etmenler.map((e) => baglamMontajla(programlar, "ADM-C", undefined, e.kod)!);
  assert.equal(paketler[0].etmen?.kod, "ETM-API");
  assert.equal(paketler[1].etmen?.kod, "ETM-TST");
  // her pay kendi Etmen'inin GÖMÜLÜ becerisini alır (ORK-6.1: pay-başına bağlam)
  assert.ok(paketler[0].beceriler.some((b) => b.kod === "BCR-API") && !paketler[0].beceriler.some((b) => b.kod === "BCR-TST"));
  assert.ok(paketler[1].beceriler.some((b) => b.kod === "BCR-TST") && !paketler[1].beceriler.some((b) => b.kod === "BCR-API"));

  const üreticiEtmenSirasi: string[] = [];
  let denetlenenBirlesik: Record<string, unknown> | undefined;
  const etmen: EtmenÇağır = (ç) => {
    if (ç.rol === "üretici") {
      üreticiEtmenSirasi.push(ç.etmen?.kod ?? "?");
      return üretici({
        adım: "ADM-C", etmen: ç.etmen?.kod,
        üretilenDosyalar: ç.etmen?.kod === "ETM-API" ? ["api.ts", "ortak.ts"] : ["api.test.ts", "ortak.ts"],
      });
    }
    denetlenenBirlesik = ç.denetlenecek as Record<string, unknown>;
    return denetçi({ adım: "ADM-C", testSonucu: "geçti — api.test.ts:1" });
  };
  const ciktiSema = sozlesmeSema(sozlesmeBul(programlar, "SZL-ETMEN-CIKTI")!);
  const gerekceSema = sozlesmeSema(sozlesmeBul(programlar, "SZL-GEREKCE")!);
  const s = donguÇalıştır(paketler[0], ciktiSema, gerekceSema, etmen, { cokEtmen: { paketler } });

  assert.equal(s.karar, "kabul", JSON.stringify(s.iterasyonlar[0]?.bulgular));
  assert.deepEqual(üreticiEtmenSirasi, ["ETM-API", "ETM-TST"], "üretim payları SIRALI sürülmeli");
  assert.equal(denetlenenBirlesik?.çokEtmen, true, "denetçi birleşik çıktıyı görmeli");
  assert.deepEqual([...(denetlenenBirlesik?.üretilenDosyalar as string[])].sort(), ["api.test.ts", "api.ts", "ortak.ts"]);
});

// ═══ TAS-D01 · YÜZEY-CHECKLIST DENETÇİ MODU (fidelity: madde madde, bütünsel yargı YASAK) ═══
import { denetciChecklistPrompt, denetciPrompt } from "../src/dongu.ts";

const SAR_EKRAN = `
Mekanizma( kod: MEK-E ){
  Sözleşme( kod: SZL-ETMEN-CIKTI, sürüm: "1.0" ){
    alanlar: { adım: "metin · zorunlu", etmen: "metin · zorunlu", rol: "metin · üretici|denetçi", güven: "sayı · 0..1", gerekçe: "metin · zorunlu" }
  }
  Sözleşme( kod: SZL-GEREKCE, sürüm: "1.0" ){
    alanlar: { adım: "metin · zorunlu", karar: "metin · zorunlu · kabul|revizyon|red|kurtarma|eskalasyon", ne: "metin · zorunlu", neden: "metin · zorunlu", kabulDurumu: "metin · GEÇTİ|PASS-WEAK|PARTIAL|CONDITIONAL" }
  }
  Blok( kod: BLK-E ){
    Katman( kod: KAT-E ){
      Adım( kod: ADM-E, ad: "giriş-ekranı", görev: "giriş ekranını üret — başlık1 rolünde tek başlık, iki form alanı, birincil düğme", durum: beklemede )
    }
  }
  Etmen( kod: ETM-YUZ, ad: "yüzey-uzmanı", tür: uzman ){
    Beceri( kod: BCR-YUZ, ne: "ekran iskeleti", sağlar: "yerleşim" )
  }
  Etmen( kod: ETM-ERI, ad: "erişilebilirlik-uzmanı", tür: uzman ){
    Beceri( kod: BCR-ERI, ne: "erişilebilirlik disiplini", sağlar: "a11y" )
  }
  Görev( kod: GRV-E1, gerçekleştirir: ADM-E, atanan: ETM-YUZ, durum: beklemede )
  Görev( kod: GRV-E2, gerçekleştirir: ADM-E, atanan: ETM-ERI, durum: beklemede )
}
`;

test("TAS-D01: checklist prompt'u maddeleri TEK TEK işaretletir — bütünsel yargı YASAK talimatı gömülü", () => {
  const maddeler = ["başlık1 rolünde tek başlık var", "iki form alanı var", "birincil düğme var"];
  const p = denetciChecklistPrompt({ x: 1 }, maddeler);
  for (const [i, m] of maddeler.entries()) {
    assert.ok(p.includes(`madde ${i + 1}: ${m}`), `madde ${i + 1} prompt'ta ayrı satır olmalı`);
  }
  assert.ok(/var.*yok.*kısmi/s.test(p), "var/yok/kısmi işaretleme talimatı olmalı");
  assert.ok(/BÜTÜNSEL YARGI YASAK/.test(p), "bütünsel 'iyi mi' yargısı YASAK talimatı gömülü olmalı");
  // İDDİA DAVRANIŞA BAĞLIDIR, KODA DEĞİL (GOC-PROJEKOD-A07): bu satır önceden
  // iç kural kodlarını dizgi olarak arıyordu, yani prompt’un DOĞRU DAVRANMASINI
  // değil iç kural numarası TAŞIMASINI ölçüyordu. Kullanıcı-yüzü metinden kod
  // kalkınca iddia kırıldı; gevşetilmedi, HÜKMÜN KENDİSİNE yönlendirildi:
  //   ① üretici ile denetçinin bellekçe izole olduğu prompt'ta yazılı olmalı,
  //   ② artefaktın varlığının doğruluk kanıtı sayılmadığı prompt'ta yazılı olmalı.
  // ① İZOLASYON: denetçiye üreticinin belleği/bağlamı VERİLMEDİĞİ açıkça söylenmeli.
  //    Başlıktaki "izole" sözcüğü tek başına yetmez — talimat satırı aranır.
  assert.ok(p.includes("belleğini") && p.includes("görmüyorsun"),
    "üretici–denetçi izolasyonu talimat satırında cümleyle yazılı olmalı");
  // ② VARLIK ≠ DOĞRULUK: kanıtsız işaretin sahte-yeşil sayıldığı KURAL satırında
  //    yazılı olmalı; başlıktaki genel cümle bu talimatın yerine geçmez.
  assert.ok(/kanıtsız[^\n]*sahte-yeşil/.test(p),
    "kanıtsız işaretin sahte-yeşil olduğu hükmü kural satırında yazılı olmalı");
});

test("TAS-D01: İKİ-Etmen'li örnek ekran koşusu — denetçi checklist prompt'u alır, birleşik çıktıyı görür, madde-eksiği bulguya döner", () => {
  const programlar = new Map([["e.sar", ayristir(belirtecle(SAR_EKRAN))]]);
  const etmenler = atananEtmenler(programlar, "ADM-E");
  assert.deepEqual(etmenler.map((e) => e.kod), ["ETM-YUZ", "ETM-ERI"], "iki atanan Etmen sıralı");
  const paketler = etmenler.map((e) => baglamMontajla(programlar, "ADM-E", undefined, e.kod)!);
  const ciktiSema = sozlesmeSema(sozlesmeBul(programlar, "SZL-ETMEN-CIKTI")!);
  const gerekceSema = sozlesmeSema(sozlesmeBul(programlar, "SZL-GEREKCE")!);
  const maddeler = ["başlık1 rolünde tek başlık var", "iki form alanı var", "birincil düğme var"];

  const denetciPromptlari: string[] = [];
  let denetlenen: Record<string, unknown> | undefined;
  let tur = 0;
  const etmen: EtmenÇağır = (ç) => {
    if (ç.rol === "üretici") {
      return üretici({
        adım: "ADM-E", etmen: ç.etmen?.kod,
        üretilenDosyalar: ç.etmen?.kod === "ETM-YUZ" ? ["giris_ekrani.dart"] : ["giris_a11y.dart"],
      });
    }
    denetciPromptlari.push(ç.prompt);
    denetlenen = ç.denetlenecek as Record<string, unknown>;
    tur++;
    // iter0: madde-2 KISMİ (checklist bulgusu) → iter1: yama sonrası tüm maddeler VAR
    return tur === 1
      ? denetçi({ adım: "ADM-E", testSonucu: "kaldı", kırılganNoktalar: ["madde 2 KISMİ: tek form alanı var, ikincisi yok (giris_ekrani.dart:12)"] })
      : denetçi({ adım: "ADM-E", testSonucu: "geçti — madde 1 VAR (giris_ekrani.dart:3) · madde 2 VAR (giris_ekrani.dart:12) · madde 3 VAR (giris_ekrani.dart:21)", kırılganNoktalar: [] });
  };

  const s = donguÇalıştır(paketler[0], ciktiSema, gerekceSema, etmen, {
    cokEtmen: { paketler },                 // A32: mevcut çok-Etmen altyapısı
    checklistMaddeler: maddeler,            // TAS-D01: yüzey-checklist modu (opt-in)
  });

  assert.equal(s.karar, "kabul", JSON.stringify(s.iterasyonlar.map((i) => i.bulgular)));
  assert.equal(s.iterasyonlar.length, 2, "iter0 GAP (madde kısmi) → iter1 RESOLVED");
  assert.ok(s.iterasyonlar[0].bulgular.some((b) => /madde 2 KISMİ/.test(b.mesaj)), "madde-eksiği checklist bulgusuna dönmeli");
  assert.equal(denetlenen?.çokEtmen, true, "denetçi BİRLEŞİK çıktıyı görmeli (A32)");
  for (const p of denetciPromptlari) {
    assert.ok(/BÜTÜNSEL YARGI YASAK/.test(p), "her denetçi çağrısı checklist modunda olmalı");
    assert.ok(p.includes("madde 3: birincil düğme var"), "maddeler denetçi prompt'unda madde madde olmalı");
  }
});

test("TAS-D01: checklistMaddeler verilmezse denetçi prompt'u BİREBİR eski (geriye-uyumlu)", () => {
  let gorulen = "";
  const etmen: EtmenÇağır = (ç) => {
    if (ç.rol === "denetçi") gorulen = ç.prompt;
    return temizEtmen(ç);
  };
  const s = çalış(etmen, {});
  assert.equal(s.karar, "kabul");
  assert.equal(gorulen, denetciPrompt(s.iterasyonlar[0].üreticiÇıktı), "ayarsız akış eski prompt'la birebir");
  assert.ok(!/BÜTÜNSEL YARGI YASAK/.test(gorulen), "checklist talimatı opt-in olmadan sızmamalı");
});

// ═══ SEF-L3-A33 · AŞ-2 ÖNCE TASARIM (asama-ayrimi) ═══════════════════════════

// SZL-TASARIM sözleşmesi mek_sef.sar'dan OKUNUR (dogfood — koda gömülmez).
function tasarimSemasi() {
  const kaynak = oku(fUP(new URL("../../../is/plan/mekanizma/mek_sef.sar", import.meta.url)), "utf8");
  const programlar = new Map([["mek_sef.sar", ayristir(belirtecle(kaynak))]]);
  const node = sozlesmeBul(programlar, "SZL-TASARIM");
  assert.ok(node, "SZL-TASARIM mek_sef.sar'da ilan edilmiş olmalı");
  return sozlesmeSema(node!);
}

const tasarımÇıktı = (over: Record<string, unknown> = {}) => ({
  adım: "ADM-T", rol: "üretici",
  seçenekler: ["A: doğrudan", "B: soyut — A tercih (basit)"],
  değişmezler: ["girdi doğrulanır", "hata yolu sessiz geçmez"],
  edgeler: ["boş girdi"],
  testStratejisi: "birim test: boş girdi + normal yol",
  ...over,
});

test("A33: tasarimAsamasi AÇIK → üretici ÖNCE kod-suz tasarım verir, AŞ-3 prompt'u tasarımı bağlam alır (uçtan uca)", () => {
  let tasarımPromptGördü = false, kodPromptTasarımİçerdi = false;
  const etmen: EtmenÇağır = (ç) => {
    if (ç.rol === "üretici") {
      if (/AŞ-2 · ÖNCE TASARIM/.test(ç.prompt)) { tasarımPromptGördü = true; return tasarımÇıktı(); }
      if (/AŞ-2 Tasarım \(bunu UYGULA/.test(ç.prompt)) kodPromptTasarımİçerdi = true;
      return üretici({ adım: ç.adımKod, testSonucu: "geçti", üretilenDosyalar: ["a.ts", "a.test.ts"] });
    }
    return denetçi({ adım: ç.adımKod, testSonucu: "geçti — kanıt: a.test.ts:10", kırılganNoktalar: [] });
  };
  const s = çalış(etmen, { tasarimAsamasi: true, tasarimSema: tasarimSemasi() });
  assert.equal(s.karar, "kabul", JSON.stringify(s.gerekçe));
  assert.ok(tasarımPromptGördü, "AŞ-2 tasarım çağrısı koşmalı");
  assert.ok(kodPromptTasarımİçerdi, "AŞ-3 kod prompt'u tasarımı önek bağlam almalı");
  assert.ok(s.tasarim && Array.isArray(s.tasarim.değişmezler), "DonguSonuç.tasarim taşınmalı");
});

test("A33: <2 değişmez → BLOCKED (halüsinasyon kalkanı — sessizce geçilmez)", () => {
  const etmen: EtmenÇağır = (ç) =>
    ç.rol === "üretici" && /AŞ-2 · ÖNCE TASARIM/.test(ç.prompt)
      ? tasarımÇıktı({ değişmezler: ["tek değişmez"] })   // 1 < 2 → yetersiz
      : ç.rol === "üretici"
        ? üretici({ adım: ç.adımKod, testSonucu: "geçti", üretilenDosyalar: ["a.ts"] })
        : denetçi({ adım: ç.adımKod, kırılganNoktalar: [] });
  const s = çalış(etmen, { tasarimAsamasi: true });
  assert.equal(s.mühür, "BLOCKED");
  assert.ok(s.ertelenenler.some((e) => /≥2 değişmez/.test(e)), "eksik-değişmez GAP mesajı düşmeli");
});

test("A33: SZL-TASARIM şema ihlali (testStratejisi eksik) → BLOCKED", () => {
  const etmen: EtmenÇağır = (ç) =>
    ç.rol === "üretici" && /AŞ-2 · ÖNCE TASARIM/.test(ç.prompt)
      ? tasarımÇıktı({ testStratejisi: undefined })   // zorunlu alan eksik (≥2 değişmez korunur)
      : üretici({ adım: ç.adımKod });
  const s = çalış(etmen, { tasarimAsamasi: true, tasarimSema: tasarimSemasi() });
  assert.equal(s.mühür, "BLOCKED");
  assert.ok(s.ertelenenler.some((e) => /SZL-TASARIM ihlali/.test(e)), "şema ihlali GAP mesajı düşmeli");
});

test("A33: tasarimAsamasi KAPALI → akış birebir eski (regresyon yok · tasarım çağrısı YOK)", () => {
  let tasarımÇağrısı = false;
  const etmen: EtmenÇağır = (ç) => {
    if (ç.rol === "üretici" && /AŞ-2 · ÖNCE TASARIM/.test(ç.prompt)) { tasarımÇağrısı = true; return tasarımÇıktı(); }
    return ç.rol === "üretici"
      ? üretici({ adım: ç.adımKod, testSonucu: "geçti", üretilenDosyalar: ["a.ts", "a.test.ts"] })
      : denetçi({ adım: ç.adımKod, testSonucu: "geçti — kanıt: a.test.ts:10", kırılganNoktalar: [] });
  };
  const s = çalış(etmen);   // ayarsız
  assert.equal(s.karar, "kabul");
  assert.equal(s.tasarim, undefined, "tasarım koşmamalı");
  assert.ok(!tasarımÇağrısı, "AŞ-2 çağrısı hiç yapılmamalı");
});

// ═══ SEF-L3-A34 · AŞ-0 BAĞLAM KİLİDİ (asama-ayrimi) ═════════════════════════

// Kilitli bağlam fikstürü: Adım'ın dokunulmaz + sınır'ı VAR (≥2 değişmez kaynağı).
const KILITLI_SAR = `
Mekanizma( kod: MEK-K ){
  Sözleşme( kod: SZL-ETMEN-CIKTI, sürüm: "1.0" ){ alanlar: { adım: "metin · zorunlu", etmen: "metin · zorunlu", rol: "metin", güven: "sayı · 0..1", gerekçe: "metin · zorunlu" } }
  Sözleşme( kod: SZL-GEREKCE, sürüm: "1.0" ){ alanlar: { adım: "metin · zorunlu", karar: "metin · zorunlu · kabul|revizyon|red|kurtarma|eskalasyon", ne: "metin · zorunlu", neden: "metin · zorunlu", kabulDurumu: "metin" } }
  Blok( kod: BLK-K ){ Katman( kod: FAZ-K ){ AltKatman( kod: KAT-K ){
    Adım( kod: ADM-K, ad: "kilitli", görev: "üret", dokunulmaz: "X bozulmaz", sınır: "Y sınırı", durum: beklemede )
  }}}
}`;
function kilitliPaket() {
  const programlar = new Map([["k.sar", ayristir(belirtecle(KILITLI_SAR))]]);
  return baglamMontajla(programlar, "ADM-K")!;
}

test("A34: baglamKilidi saf — <2 değişmez + çözülmeyen referans GAP; kilitli bağlam boş döner", () => {
  const { paket } = kur();   // ADM-T: dokunulmaz/sınır yok → <2 değişmez kaynağı
  assert.ok(baglamKilidi(paket).some((b) => /≥2 değişmez/.test(b.mesaj)), "eksik değişmez GAP");
  // çözülmeyen referans dalı (2 değişmez set, yalnız ref eksik)
  const sahte = { ...paket, koni: { ...paket.koni, dokunulmaz: "a", sınır: "b" },
    referanslar: [{ kod: "REF-YOK", tür: "referans" as const, çözüldü: false }] };
  assert.ok(baglamKilidi(sahte).some((b) => /REF-YOK.*çözülmedi/.test(b.mesaj)), "çözülmeyen referans GAP");
  assert.equal(baglamKilidi(kilitliPaket()).length, 0, "kilitli bağlam (dokunulmaz+sınır) GAP üretmez");
});

test("A34: baglamKilidi AÇIK + eksik bağlam → koşu HİÇ başlamaz (BLOCKED/DUR · üretici çağrılmaz)", () => {
  let üreticiÇağrıldı = false;
  const etmen: EtmenÇağır = (ç) => { üreticiÇağrıldı = true; return üretici({ adım: ç.adımKod }); };
  const s = çalış(etmen, { baglamKilidi: true });   // ADM-T eksik bağlam
  assert.equal(s.mühür, "BLOCKED");
  assert.ok(s.ertelenenler.some((e) => /AŞ-0 bağlam eksik/.test(e)), "AŞ-0 GAP ertelenenlere düşmeli");
  assert.ok(!üreticiÇağrıldı, "eksik bağlamda üretici HİÇ çağrılmamalı (DUR)");
});

test("A34: baglamKilidi AÇIK + kilitli bağlam → normal akış (kabul)", () => {
  const { ciktiSema, gerekceSema } = kur();
  const etmen: EtmenÇağır = (ç) => ç.rol === "üretici"
    ? üretici({ adım: ç.adımKod, testSonucu: "geçti", üretilenDosyalar: ["a.ts", "a.test.ts"] })
    : denetçi({ adım: ç.adımKod, testSonucu: "geçti — kanıt: a.test.ts:10", kırılganNoktalar: [] });
  const s = donguÇalıştır(kilitliPaket(), ciktiSema, gerekceSema, etmen, { baglamKilidi: true });
  assert.equal(s.karar, "kabul", JSON.stringify(s.gerekçe));
});

test("A34: baglamKilidi KAPALI → eksik bağlamda bile akış eski (regresyon yok)", () => {
  const etmen: EtmenÇağır = (ç) => ç.rol === "üretici"
    ? üretici({ adım: ç.adımKod, testSonucu: "geçti", üretilenDosyalar: ["a.ts", "a.test.ts"] })
    : denetçi({ adım: ç.adımKod, testSonucu: "geçti — kanıt: a.test.ts:10", kırılganNoktalar: [] });
  const s = çalış(etmen);   // ayarsız — ADM-T eksik ama kilit kapalı
  assert.equal(s.karar, "kabul", "kilit kapalıyken eksik bağlam akışı durdurmaz");
});

// ═══ SEF-L3-A35 · AŞ-6 TEST ÜRETİMİ (asama-ayrimi) ═════════════════════════

const kod = (ç: EtmenÇağrı) => ç.rol === "üretici"
  ? üretici({ adım: ç.adımKod, testSonucu: "geçti", üretilenDosyalar: ["a.ts", "a.test.ts"] })
  : denetçi({ adım: ç.adımKod, testSonucu: "geçti — kanıt: a.test.ts:10", kırılganNoktalar: [], araçTurları: SICIL_TEST_GECTI });

test("A35: testDosyalariCikar — testDosyalar öncelikli; yoksa üretilenDosyalar'dan test-desenli", () => {
  assert.deepEqual(testDosyalariCikar({ testDosyalar: ["x.test.ts"] }), ["x.test.ts"]);
  assert.deepEqual(testDosyalariCikar({ üretilenDosyalar: ["a.ts", "a.test.ts", "b.spec.js"] }), ["a.test.ts", "b.spec.js"]);
  assert.deepEqual(testDosyalariCikar({ üretilenDosyalar: ["a.ts"] }), []);
});

test("A35: testAsamasi AÇIK + testler üretilir → AŞ-6 çağrısı koşar, DonguSonuç.testler dolu, VERIFIED korunur", () => {
  let testPromptGördü = false;
  const etmen: EtmenÇağır = (ç) => {
    if (ç.rol === "üretici" && /AŞ-6 · TEST ÜRETİMİ/.test(ç.prompt)) {
      testPromptGördü = true;
      return { etmen: "U", rol: "üretici", güven: 0.9, gerekçe: "gk", testDosyalar: ["a.test.ts"] };
    }
    return kod(ç);
  };
  const s = çalış(etmen, { testAsamasi: true });
  assert.equal(s.mühür, "VERIFIED", JSON.stringify(s.gerekçe));
  assert.ok(testPromptGördü, "AŞ-6 test-üretim çağrısı koşmalı (kabulden sonra)");
  assert.ok(s.testler && Array.isArray(s.testler.testDosyalar), "DonguSonuç.testler taşınmalı");
});

test("A35: testAsamasi AÇIK + test ÜRETİLMEZ → VERIFIED düşer (COMPLETED) + GAP ertelenende", () => {
  const etmen: EtmenÇağır = (ç) => {
    if (ç.rol === "üretici" && /AŞ-6 · TEST ÜRETİMİ/.test(ç.prompt)) {
      return { etmen: "U", rol: "üretici", güven: 0.9, gerekçe: "gk", testDosyalar: [] };   // test YOK
    }
    return kod(ç);
  };
  const s = çalış(etmen, { testAsamasi: true });
  assert.equal(s.karar, "kabul");
  assert.equal(s.mühür, "COMPLETED", "test yoksa VERIFIED düşmeli (kanıt yok = yeşil değil)");
  assert.ok(s.ertelenenler.some((e) => /AŞ-6 test üretilemedi/.test(e)), "AŞ-6 GAP ertelenenlere düşmeli");
});

test("A35: testAsamasi KAPALI → AŞ-6 çağrısı YOK, akış eski (VERIFIED · testler undefined)", () => {
  let testÇağrısı = false;
  const etmen: EtmenÇağır = (ç) => {
    if (ç.rol === "üretici" && /AŞ-6 · TEST ÜRETİMİ/.test(ç.prompt)) { testÇağrısı = true; return { rol: "üretici" }; }
    return kod(ç);
  };
  const s = çalış(etmen);   // ayarsız
  assert.equal(s.mühür, "VERIFIED");
  assert.equal(s.testler, undefined, "testler koşmamalı");
  assert.ok(!testÇağrısı, "AŞ-6 çağrısı hiç yapılmamalı");
});

// ═══ SEF-L3-A36 · AŞ-10 SON KONTROL (asama-ayrimi) ═════════════════════════

test("A36: sonKontrolAsamasi AÇIK + kontrol geçer → kabul korunur (VERIFIED), sonKontrol taşınır", () => {
  let sonKontrolGördü = false;
  const etmen: EtmenÇağır = (ç) => {
    if (ç.rol === "denetçi" && /AŞ-10 · SON KONTROL/.test(ç.prompt)) {
      sonKontrolGördü = true;
      return denetçi({ adım: ç.adımKod, kırılganNoktalar: [] });   // tümü geçti
    }
    return kod(ç);
  };
  const s = çalış(etmen, { sonKontrolAsamasi: true });
  assert.equal(s.karar, "kabul", JSON.stringify(s.gerekçe));
  assert.equal(s.mühür, "VERIFIED");
  assert.ok(sonKontrolGördü, "AŞ-10 son kontrol koşmalı (tüm aşamalardan sonra)");
  assert.ok(s.sonKontrol, "DonguSonuç.sonKontrol taşınmalı");
});

test("A36: sonKontrolAsamasi AÇIK + kontrol BAŞARISIZ (dokunulmaz ihlali) → karar RED / BLOCKED", () => {
  const etmen: EtmenÇağır = (ç) => {
    if (ç.rol === "denetçi" && /AŞ-10 · SON KONTROL/.test(ç.prompt)) {
      return denetçi({ adım: ç.adımKod, kırılganNoktalar: ["dokunulmaz X'e dokunuldu (a.ts:3)"] });
    }
    return kod(ç);   // kod-döngüsü kabul olur, AŞ-10 devirir
  };
  const s = çalış(etmen, { sonKontrolAsamasi: true });
  assert.equal(s.mühür, "BLOCKED", "son kontrol başarısız → BLOCKED (kabul geri alınır)");
  assert.ok(s.gerekçe && /AŞ-10 son kontrol/.test(JSON.stringify(s.gerekçe)), "AŞ-10 bulgusu gerekçede");
});

test("A36: sonKontrolAsamasi KAPALI → AŞ-10 çağrısı YOK, akış eski (VERIFIED · sonKontrol undefined)", () => {
  let sonKontrolÇağrısı = false;
  const etmen: EtmenÇağır = (ç) => {
    if (ç.rol === "denetçi" && /AŞ-10 · SON KONTROL/.test(ç.prompt)) { sonKontrolÇağrısı = true; return denetçi({ kırılganNoktalar: ["x"] }); }
    return kod(ç);
  };
  const s = çalış(etmen);   // ayarsız
  assert.equal(s.mühür, "VERIFIED");
  assert.equal(s.sonKontrol, undefined, "sonKontrol koşmamalı");
  assert.ok(!sonKontrolÇağrısı, "AŞ-10 çağrısı hiç yapılmamalı");
});

// ═══ KNT-A05 · MÜHÜR SİCİLE BAĞLANIR (B1 — beyandan sicile) ══════════════════
//   VERIFIED'ın tek kanıt kaynağı artık koşum sicili (araçTurları): modelin
//   YAZAMADIĞI alan (KNT-A01: köprü koşulsuz sahiplenir). testSonucu BEYANI
//   mühür veremez — 13 Temmuz'da düzeltme ikinci bir beyana bağlanmıştı, delik
//   kapanmamıştı; bu blok o hatanın kilididir.
import { sicildeKanitVar, beyanTutarli, sefAkisKomutu } from "../src/dongu.ts";
import { mkdtempSync, writeFileSync as fikstürYaz, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join as yolBirleştir } from "node:path";

test("KNT-A05 kırmızı-takım: denetçi 'geçti — a.ts:1' YAZAR ama sicilde test-koş YOK → VERIFIED DÜŞER, COMPLETED kalır", () => {
  // Denetçi beyanı KUSURSUZ: 'geçti' + file:line + dosya üreticinin listesinde.
  // Eski kapı (metin regex'i) bunu VERIFIED yapardı — alanın yazarı model olduğu
  // sürece kapı modelin insafındaydı. Yeni kapı sicil ister; beyan en çok COMPLETED.
  const etmen: EtmenÇağır = (ç) => ç.rol === "üretici"
    ? üretici({ adım: ç.adımKod, testSonucu: "geçti", üretilenDosyalar: ["a.ts"] })
    : denetçi({ adım: ç.adımKod, testSonucu: "geçti — a.ts:1", kırılganNoktalar: [] });   // sicil YOK
  const s = çalış(etmen);
  assert.equal(s.karar, "kabul", "beyan-tutarlı koşu kabul edilir (kapı kabulü değil MÜHRÜ sıkar)");
  assert.notEqual(s.mühür, "VERIFIED", "sicilsiz beyan VERIFIED üretemez — 13 Temmuz kilidi");
  assert.equal(s.mühür, "COMPLETED");
});

test("KNT-A05 pozitif: sicilde test-koş + çıkışKodu:0 → VERIFIED (denetçi sicili)", () => {
  const s = çalış(temizEtmen);   // temizEtmen denetçisi SICIL_TEST_GECTI taşır
  assert.equal(s.karar, "kabul");
  assert.equal(s.mühür, "VERIFIED", "makine sicili (test-koş · çıkışKodu:0) mührü açar");
});

test("KNT-A05 pozitif: sicil ÜRETİCİ çıktısında da geçerli (matris üreticiye de test-koş verir)", () => {
  const etmen: EtmenÇağır = (ç) => ç.rol === "üretici"
    ? üretici({ adım: ç.adımKod, testSonucu: "geçti", üretilenDosyalar: ["a.ts", "a.test.ts"], araçTurları: SICIL_TEST_GECTI })
    : denetçi({ adım: ç.adımKod, testSonucu: "geçti — kanıt: a.test.ts:10", kırılganNoktalar: [] });
  const s = çalış(etmen);
  assert.equal(s.mühür, "VERIFIED", "üreticinin makine sicili de kanıttır (her iki sicil taranır)");
});

test("KNT-A05 saf birim: sicildeKanitVar yalnız izinli test-koş çıkışKodu:0 sayar; testSonucu METNİNE BAKMAZ", () => {
  const boş = { rol: "denetçi" };
  const sicilli = (sicil: unknown[]) => ({ rol: "denetçi", araçTurları: sicil });
  // pozitif — testSonucu HİÇ YOK, hatta 'kaldı' bile olsa sicil yeter (metin okunmaz)
  assert.equal(sicildeKanitVar(sicilli(SICIL_TEST_GECTI), boş), true);
  assert.equal(sicildeKanitVar({ ...sicilli(SICIL_TEST_GECTI), testSonucu: "kaldı — her şey kırık" }, boş), true,
    "kapı metne bakmaz: sicil geçtiyse denetçinin metni ne derse desin kanıt sicildedir");
  // negatifler — her alan tek tek zorunlu
  assert.equal(sicildeKanitVar(sicilli([{ durum: "izinli", araç: "test-koş", güvenilmez: true, sonuç: { çıkışKodu: 1 } }]), boş), false, "çıkışKodu≠0 kanıt değil");
  assert.equal(sicildeKanitVar(sicilli([{ durum: "red", araç: "test-koş", güvenilmez: true, sonuç: { çıkışKodu: 0 } }]), boş), false, "red'li tur kanıt değil");
  assert.equal(sicildeKanitVar(sicilli([{ durum: "hata", araç: "test-koş", güvenilmez: true, sebep: "zaman aşımı" }]), boş), false, "hata turu kanıt değil (çıkış kodu OKUNAMADI)");
  assert.equal(sicildeKanitVar(sicilli([{ durum: "izinli", araç: "dosya-yaz", güvenilmez: true, sonuç: { çıkışKodu: 0 } }]), boş), false, "başka araç kanıt değil");
  assert.equal(sicildeKanitVar(sicilli([{ durum: "izinli", araç: "test-koş", güvenilmez: true, sonuç: { çıkışKodu: "0" } }]), boş), false, "çıkışKodu SAYI olmalı ('0' dizgisi makine yazımı değil)");
  assert.equal(sicildeKanitVar(boş, boş), false, "sicil yoksa kanıt yok");
});

test("KNT-A05: bedava-VERIFIED dalı SİLİNDİ — beyanTutarli üretici çıktısı olmadan çağrılamaz (imza zorlar) · boş üretim false", () => {
  // Eski delik: kanitVar(denetçi, undefined) → true. Yeni imzada üreticiÇıktı ZORUNLU;
  // davranışsal kilit: üretim beyanı BOŞ ise dosya-kanıtı doğrulanamaz → false.
  assert.equal(beyanTutarli({ testSonucu: "geçti — a.ts:1" }, {}), false, "üretim sicili boş → beyan doğrulanamaz");
  assert.equal(beyanTutarli({ testSonucu: "geçti — a.ts:1" }, { üretilenDosyalar: [] }), false);
  assert.equal(beyanTutarli({ testSonucu: "geçti — a.ts:1" }, { üretilenDosyalar: ["a.ts"] }), true, "beyan-tutarlılık süzgeci yaşıyor (ama mühür VEREMEZ)");
});

test("KNT-A05 nöbet: dongu.ts'te node:fs importu YOK — döngü diske bakmaz, sicili okur", () => {
  // 13 Temmuz dersi: kanıt kapısını diske bağlamak (existsSync) tiyatroyu inandırıcı
  // yapar — VARLIK≠DOĞRULUK. Köprü sicili diske bakar, döngü SİCİLİ okur. Bu nöbet,
  // gelecekteki 'diske bakıversin' düzeltmesini yaz-anında kırmızıya düşürür.
  const kaynak = oku(fUP(new URL("../src/dongu.ts", import.meta.url)), "utf8");
  assert.ok(!/from\s+["']node:fs["']/.test(kaynak) && !/require\(\s*["']node:fs/.test(kaynak),
    "node:fs dongu.ts'e giremez — saf çekirdek korunur (KNT-A05 mimari kilit)");
  // kanıt kapısının kendisi SAF bölgede yaşamalı (ETKİLİ kabuktan önce)
  const safBölge = kaynak.slice(0, kaynak.indexOf("ETKİLİ CLI KABUĞU"));
  assert.ok(safBölge.includes("export function sicildeKanitVar"), "kanıt kapısı SAF çekirdekte yaşamalı");
});

test("KNT-A05: kontrol-noktası I/O'su ENJEKTE depo üzerinden — yazılır, ikinci koşu kaldığı yerden", () => {
  // node:fs dongu.ts'ten çıkarken sef-akis'in kesinti-kurtarması kaybolmadı mı? (regresyon kilidi)
  const d = mkdtempSync(yolBirleştir(tmpdir(), "sarmal-akis-"));
  try {
    fikstürYaz(yolBirleştir(d, "t.sar"), SAR);
    const depo = new Map<string, string>();
    const knDeposu = { oku: (y: string) => depo.get(y), yaz: (y: string, i: string) => { depo.set(y, i); } };
    let çağrı = 0;
    const etmen: EtmenÇağır = (ç) => { çağrı++; return temizEtmen(ç); };
    assert.equal(sefAkisKomutu(d, ["ADM-T"], etmen, undefined, undefined, { knDeposu }), 0);
    assert.equal(depo.size, 1, "kabul edilen Adım kontrol noktasına (depoya) yazılmalı");
    const ilkÇağrı = çağrı;
    assert.ok(ilkÇağrı > 0, "ilk koşuda etmen çağrılmalı");
    assert.equal(sefAkisKomutu(d, ["ADM-T"], etmen, undefined, undefined, { knDeposu }), 0);
    assert.equal(çağrı, ilkÇağrı, "ikinci koşu kabul edilmiş Adımı atlamalı (kaldığı yerden — etmen çağrılmaz)");
  } finally { rmSync(d, { recursive: true, force: true }); }
});

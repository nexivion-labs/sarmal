// ═══════════════════════════════════════════════════════════════════════════
// ilgili-kok-kimligi.test.ts — 🔗 `ilgili` listesinin tek yazım yolu nöbeti (KPS-BLM-A01)
//
//   Founder hükmü (2026-09-19): kanon ve motor bölüm kök kimliğine geçer. Bir
//   `ilgili` listesinin doğru yazımı `ilgili: [ YAS-0, MIM-0 ]` biçimidir; çıplak
//   bölüm öneki (`YAS`) kimlik desenine uymadığı için hiçbir yüzeyde tanıma
//   gidemez ve doğru yazım olarak öğretilmez. Nöbet dört şeyi ölçer: motor kök
//   kimlikli listeyi sessizce kabul eder, çıplak öneki aynı tanıyla ve aynı
//   düzeyde bildirir, tanı öneri metni kök kimlikli örneği taşır ve kanonun
//   DIL-5 ile DIL-5.2 maddelerinin Hüküm ve Örnek cümleleri çıplak öneki doğru
//   yazım diye öğretmez.
//
//   MUTASYON KANITI (üretici · 2026-09-19 · KNT-4):
//   ① `dogrulayici.ts` içinde `BOLUM_KOKLERI` kümesi geçici olarak çıplak
//      öneklere geri çevrildiğinde bu dosyanın "kök kimlikli liste tanı
//      üretmez", "çıplak önek kendi kusur cümlesiyle bildirilir" ve "tanımsız
//      bölüm ile yinelenen kök kimliği reddedilir" sınamaları kırmızıya düştü
//      (3/6 kırmızı); değişiklik geri konunca 6/6 yeşil.
//   ② `yasa/kanon/dil.sar` DIL-5.2 Örnek cümlesindeki doğru yazım geçici
//      olarak `ilgili: [DIL, TIP, YUZ]` biçimine geri konduğunda "kanon örneği
//      çıplak öneki doğru yazım diye öğretmez" sınaması kırmızıya düştü (1/6);
//      geri konunca 6/6 yeşil.
//   ③ `tani-metinleri.ts` öneri metnindeki kök kimlikli örnek geçici olarak
//      çıplak öneklere çevrildiğinde "öneri metni kök kimlikli örneği taşır"
//      sınaması kırmızıya düştü (1/6); geri konunca 6/6 yeşil.
// ═══════════════════════════════════════════════════════════════════════════

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { belirtecle } from "../src/belirtec.ts";
import { ayristir } from "../src/ayristirici.ts";
import { dogrula } from "../src/dogrulayici.ts";
import { TANI_METINLERI, TANI_METINLERI_EN, yapistirilabilirOrnekVar } from "../src/tani-metinleri.ts";
import type { Siniflama } from "../src/siniflama.ts";
import type { Tani } from "../src/tani.ts";

const KOK = fileURLToPath(new URL("../../..", import.meta.url));
const SNF: Siniflama = JSON.parse(readFileSync(`${KOK}oz/siniflama/kayit.json`, "utf8"));
const TANI = "ilgili-önek-geçersiz";

function ilgiliTanilari(kaynak: string): Tani[] {
  return dogrula(ayristir(belirtecle(kaynak)), SNF, "fikstur.sar", kaynak).filter((t) => t.kod === TANI);
}

test("kök kimlikli ilgili listesi tanı üretmez — tek doğru yazım budur", () => {
  const kaynak = `Kural denemeKuralı( kod: DIL-9, ne: "deneme", ilgili: [ YAS-0, MIM-0, ORK-0 ] )\n`;
  assert.deepEqual(ilgiliTanilari(kaynak), [], "kök kimlikli liste yanlış pozitif üretti");
});

test("çıplak bölüm öneki aynı tanıyla, hata düzeyinde ve kendi kusur cümlesiyle bildirilir", () => {
  const kaynak = `Kural denemeKuralı( kod: DIL-9, ne: "deneme", ilgili: [ YAS, MIM-0 ] )\n`;
  const tanilar = ilgiliTanilari(kaynak);
  assert.equal(tanilar.length, 1, "çıplak önek sessizce kabul edildi");
  assert.equal(tanilar[0].duzey, "hata", "tanı düzeyi DIL-5.2 kademesinden ayrıştı");
  assert.match(tanilar[0].mesaj, /çıplak bölüm öneki/, "kusur cümlesi çıplak öneki adıyla anmıyor");
  assert.match(tanilar[0].mesaj, /`YAS-0`/, "kusur cümlesi yazılması gereken kök kimliği göstermiyor");
});

test("tanımsız bölüm ve yinelenen kök kimliği reddedilmeye devam eder", () => {
  const tanimsiz = ilgiliTanilari(`Kural denemeKuralı( kod: DIL-9, ne: "deneme", ilgili: [ DIL-0, YAP-0 ] )\n`);
  assert.equal(tanimsiz.length, 1, "tanımsız bölüm kök kimliği kabul edildi");
  assert.match(tanimsiz[0].mesaj, /sekiz bölüm kök kimliğinin dışında/);
  const yinelenen = ilgiliTanilari(`Kural denemeKuralı( kod: DIL-9, ne: "deneme", ilgili: [ DIL-0, DIL-0 ] )\n`);
  assert.equal(yinelenen.length, 1, "yinelenen kök kimliği kabul edildi");
  assert.match(yinelenen[0].mesaj, /ikinci kez/);
});

test("öneri metni kök kimlikli örneği taşır ve çıplak önekli örneği artık öğretmez", () => {
  for (const [dil, sozluk] of [["tr", TANI_METINLERI], ["en", TANI_METINLERI_EN]] as const) {
    const oneri = sozluk[TANI].oneri({});
    // Yapıştırılabilirlik ölçütü Türkçe "Örnek:" imini arar; İngilizce yüz için yalnız içerik ölçülür.
    if (dil === "tr") assert.ok(yapistirilabilirOrnekVar(oneri), "tr: öneri yapıştırılabilir örnek taşımıyor");
    assert.match(oneri, /ilgili: \[ MIM-0, DIL-0, TIP-0, YAS-0, YUZ-0, STR-0, OGR-0, ORK-0 \]/, `${dil}: kök kimlikli örnek yok`);
    assert.doesNotMatch(oneri, /\[ MIM, DIL, TIP, YAS, YUZ, STR, OGR, ORK \]/, `${dil}: çıplak önekli örnek hâlâ öğretiliyor`);
  }
});

/** DIL-5 ile DIL-5.2 maddelerinin belge bloğundaki Hüküm ve Örnek satırları. */
function maddeSatirlari(kod: string): { hukum: string; ornek: string } {
  const satirlar = readFileSync(`${KOK}yasa/kanon/dil.sar`, "utf8").split("\n");
  const baslik = satirlar.findIndex((s) => s.startsWith(`### ${kod} ·`));
  assert.notEqual(baslik, -1, `${kod} başlığı dil.sar içinde bulunamadı`);
  const bolge = satirlar.slice(baslik, baslik + 6);
  const hukum = bolge.find((s) => s.startsWith("**Hüküm:**")) ?? "";
  const ornek = bolge.find((s) => s.startsWith("**Örnek:**")) ?? "";
  assert.ok(hukum && ornek, `${kod} maddesinin Hüküm ya da Örnek satırı eksik`);
  return { hukum, ornek };
}

const CIPLAK_LISTE = /ilgili: \[\s*(?:MIM|DIL|TIP|YAS|YUZ|STR|OGR|ORK)\s*(?:,|\])/;

test("kanon örneği çıplak öneki doğru yazım diye öğretmez — DIL-5 ve DIL-5.2", () => {
  const dil5 = maddeSatirlari("DIL-5");
  assert.doesNotMatch(dil5.ornek, CIPLAK_LISTE, "DIL-5 Örnek cümlesi çıplak önekli liste taşıyor");
  assert.match(dil5.ornek, /ilgili: \[DIL-0, TIP-0, ORK-0\]/, "DIL-5 Örnek cümlesi kök kimlikli listeyi göstermiyor");
  assert.match(dil5.hukum, /kök madde kimliklerine/, "DIL-5 Hüküm cümlesi kök kimliğini söylemiyor");

  const dil52 = maddeSatirlari("DIL-5.2");
  const dogruYazim = dil52.ornek.split(";")[0];
  assert.match(dogruYazim, /Doğru: `ilgili: \[DIL-0, TIP-0, YUZ-0\]`/, "DIL-5.2 doğru örneği kök kimlikli değil");
  assert.doesNotMatch(dogruYazim, CIPLAK_LISTE, "DIL-5.2 doğru örneği çıplak önek taşıyor");
  assert.match(dil52.ornek, /yanlış: `ilgili: \[DIL, TIP, YUZ\]` \(çıplak önek\)/, "DIL-5.2 çıplak öneki yanlış örnek olarak göstermiyor");
  assert.match(dil52.hukum, /kök madde kimliklerinden/, "DIL-5.2 Hüküm cümlesi kök kimliğini şart koşmuyor");
  assert.match(dil52.hukum, /çıplak bölüm öneki bir kimlik değildir/, "DIL-5.2 Hüküm cümlesi çıplak öneki dışlamıyor");
});

test("Karar ikizi: DIL-5 makine-okur karar alanı Hüküm cümlesiyle birebirdir", () => {
  const { hukum } = maddeSatirlari("DIL-5");
  const program = ayristir(belirtecle(readFileSync(`${KOK}yasa/kanon/dil.sar`, "utf8")));
  const karar = program.bildirimler
    .find((d) => d.ad === "Karar" && d.parametreler.some((p) => p.ad === "kod" && p.deger.metin === "DIL-5"));
  assert.ok(karar, "DIL-5 Karar düğümü bulunamadı");
  const ikiz = [...karar.parametreler, ...karar.ozellikler].find((p) => p.ad === "karar")?.deger.metin ?? "";
  assert.equal(ikiz, hukum.replace(/^\*\*Hüküm:\*\* /, ""), "DIL-5 karar ikizi Hüküm cümlesinden ayrışmış");
});

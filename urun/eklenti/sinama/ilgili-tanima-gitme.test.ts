// ═══════════════════════════════════════════════════════════════════════════
// ilgili-tanima-gitme.test.ts — 🎯 `ilgili` listesinden tanıma gitme kanıtı (KPS-BLM-A01)
//
//   Founder 2026-09-19 tarihinde KPS-BLM-A01 için kontrolcünün tanıma gitme
//   ölçümünün canlı pencere yerine yeterli sayılmasına hükmetmiştir. Bu sınama
//   o ölçümün eklenti süitindeki karşılığıdır ve F12 yolunun üç halkasını, VS
//   Code çalışma zamanı olmadan, aynı kaynaklardan ölçer:
//   ① SÖZCE: tanıma-git sağlayıcısının imleç altındaki kodu seçtiği desen
//      (`gezinme.ts` içindeki KOD_SOZCUK) DIL-5 Hüküm satırındaki `YAS-0`
//      üyesinin üstünde tam olarak `YAS-0` sözcesini verir; ne `YAS` parçasını
//      ne de virgülü alır.
//   ② ÇÖZÜM: sağlayıcının okuduğu kimlik indeksi, dil.sar kaynaklı gezinme
//      süzgeciyle `YAS-0` kodunu yalnız `yasa/kanon/yas.sar` içindeki tek
//      tanıma çözer ve aynı Hüküm satırını o kodun atıfları arasında sayar.
//   ③ KARŞITLIK: çıplak `YAS` sözcesi indekste hiçbir tanıma çözülmez; çevrimin
//      sebebi budur ve nöbet sebebi de kaydeder.
//
//   MUTASYON KANITI (üretici · 2026-09-19 · KNT-4): `yasa/kanon/dil.sar`
//   içindeki DIL-5 Hüküm satırının `ilgili: [DIL-0, YAS-0, STR-0]` listesi
//   geçici olarak `ilgili: [DIL-0, YAS, STR-0]` biçimine bozulduğunda ① ve ②
//   sınamaları kırmızıya düştü (2/3); satır geri konunca 3/3 yeşil.
// ═══════════════════════════════════════════════════════════════════════════

import "./kabuk-kur.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { dizindenIndeks, gezinmeSuzgeci } from "../../cekirdek/src/kimlik.ts";
import { varlikKokuBul } from "../src/kanon-kesif.ts";

// HST-YUZ-A05: KOD_SOZCUK madde kuyruğunu çekirdekten kurar ve artık düz bir
// desen yazımı değildir; sağlayıcının desenini okumanın tek doğru yolu modülün
// kendisidir. Modül editör kabuğunu içeri aldığı için kanca kurulduktan SONRA
// yüklenir (kabuk-kur.ts).
const { KOD_SOZCUK } = await import("../src/gezinme.ts");

const KOK = fileURLToPath(new URL("../../..", import.meta.url)).replace(/\/$/, "");
const DIL_SAR = join(KOK, "yasa", "kanon", "dil.sar");
const YAS_SAR = join(KOK, "yasa", "kanon", "yas.sar");

/** DIL-5 Hüküm satırı ve içindeki `YAS-0` üyesinin bir tabanlı satır ile sıfır tabanlı sütunu. */
function dil5Hukmu(): { satir: number; metin: string; sutun: number } {
  const satirlar = readFileSync(DIL_SAR, "utf8").split("\n");
  const baslik = satirlar.findIndex((s) => s.startsWith("### DIL-5 ·"));
  assert.notEqual(baslik, -1, "DIL-5 başlığı bulunamadı");
  const satir = satirlar.slice(baslik).findIndex((s) => s.startsWith("**Hüküm:**")) + baslik;
  const metin = satirlar[satir];
  const liste = metin.indexOf("ilgili: [");
  assert.notEqual(liste, -1, "DIL-5 Hüküm satırında ilgili listesi yok");
  const sutun = metin.indexOf("YAS-0", liste);
  assert.notEqual(sutun, -1, "DIL-5 ilgili listesinde YAS-0 üyesi yok");
  return { satir: satir + 1, metin, sutun };
}

/** Sağlayıcının kullandığı sözce desenini modülünden okur; ikinci bir desen yazılmaz (YUZ-1.2). */
function kodSozcukDeseni(): RegExp {
  return new RegExp(KOD_SOZCUK.source, "gu");
}

/** VS Code `getWordRangeAtPosition` davranışının ikizi: deseni satırda gezdirir, imleci kapsayan eşleşmeyi verir. */
function imlecAltindakiSozce(metin: string, sutun: number, desen: RegExp): string | undefined {
  for (const es of metin.matchAll(desen)) {
    const bas = es.index ?? 0;
    if (bas <= sutun && sutun < bas + es[0].length) return es[0];
  }
  return undefined;
}

test("① sözce: DIL-5 ilgili listesindeki YAS-0 üstünde sağlayıcı tam kök kimliğini seçer", () => {
  const { metin, sutun } = dil5Hukmu();
  const desen = kodSozcukDeseni();
  assert.equal(imlecAltindakiSozce(metin, sutun, desen), "YAS-0", "imleç YAS harfinin üstündeyken sözce YAS-0 değil");
  assert.equal(imlecAltindakiSozce(metin, sutun + 4, desen), "YAS-0", "imleç 0 rakamının üstündeyken sözce YAS-0 değil");
});

test("② çözüm: kimlik indeksi dil.sar süzgeciyle YAS-0 kodunu yas.sar içindeki tek tanıma götürür", () => {
  const { satir } = dil5Hukmu();
  const indeks = dizindenIndeks(KOK);
  const suzgec = gezinmeSuzgeci(DIL_SAR, (yol) => varlikKokuBul(dirname(yol)));
  const tanimlar = indeks.tanimlar("YAS-0", suzgec);
  assert.equal(tanimlar.length, 1, `YAS-0 tek tanıma çözülmeli (bulunan: ${tanimlar.length})`);
  assert.equal(tanimlar[0].dosya, YAS_SAR, "YAS-0 tanımı yas.sar dışında bulundu");
  const buradan = indeks.atiflar("YAS-0", suzgec).filter((a) => a.dosya === DIL_SAR && a.satir === satir);
  assert.equal(buradan.length, 1, "DIL-5 Hüküm satırındaki YAS-0 üyesi atıf olarak sayılmıyor");
});

test("③ karşıtlık: çıplak YAS sözcesi indekste hiçbir tanıma çözülmez — çevrimin sebebi budur", () => {
  const indeks = dizindenIndeks(KOK);
  const suzgec = gezinmeSuzgeci(DIL_SAR, (yol) => varlikKokuBul(dirname(yol)));
  assert.equal(indeks.tanimlar("YAS", suzgec).length, 0, "çıplak bölüm adı bir tanıma çözüldü; çevrim gereksiz olurdu");
});

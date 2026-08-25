// ═══════════════════════════════════════════════════════════════════════════
// kanon-kesif.ts — 🧭 KANON KEŞFİ: varlık kökü İLANDAN bulunur (SAF çekirdek)
//
//   Founder canlı gözlemi 2026-08-21: yeni ve boş bir çalışma alanında açılan
//   bir kanon dosyası alışılmış görüntüyü vermedi. Ölçüm üç kaynağın da yalnız
//   bu depoda yaşadığını gösterdi; üçüncüsü tip sistemi kaydının SABİT bir
//   klasör adıyla aranmasıydı. Klasörün adı `_Sarmal` değilse kayıt bulunamıyor
//   ve eklenti sessizce gömülü taban kanona düşüyordu.
//
//   Onarım tek cümleyle şudur: klasörün ADI hiçbir şey ilan etmez, `*_anadizin.sar`
//   dosyası ilan eder (DIL-1.2). Bu modül varlık kökünü o ilandan bulur; ad ne
//   olursa olsun kayıt doğru yerden okunur. Emsali eklentinin kendi içindedir
//   (`yolharitasi.ts` varlıkBul ve `eklenti.ts` varlıkKöku aynı deseni kullanır);
//   burada üçüncü bir desen doğmaz, var olan desen paylaşılan bir kapıya iner.
//
//   SAF: bu modül `vscode` İTHAL ETMEZ. Yalnız dosya sistemini okur, dolayısıyla
//   nöbetler onu gerçek fikstür ağaçlarına karşı doğrudan koşturur.
// ═══════════════════════════════════════════════════════════════════════════

import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { anadizinBul } from "../../cekirdek/src/denetci.ts";

/** Yukarı yürüyüşün kat sınırı — emsal iki çağrı yerinde de on ikidir. */
const KAT_SINIRI = 12;

/**
 * Bir dosyanın bağlı olduğu VARLIK KÖKÜ: yukarı yürünür ve `*_anadizin.sar`
 * ilanını taşıyan ilk dizin köktür (eski `ana.sar` adı da tanınır — göç
 * tamamlanana dek iki desen birlikte yaşar). İlan yoksa kök yoktur ve bu
 * dürüstçe `undefined` ile söylenir; klasör adına bakarak kök uydurulmaz.
 */
export function varlikKokuBul(baslangicDizin: string): string | undefined {
  let dizin = baslangicDizin;
  for (let i = 0; i < KAT_SINIRI; i++) {
    if (anadizinBul(dizin)) return dizin;
    const ust = dirname(dizin);
    if (ust === dizin) break;
    dizin = ust;
  }
  return undefined;
}

/**
 * Bir çalışma alanı kökünün İLAN EDİLMİŞ varlıkları: kökün kendisi ilan
 * taşıyorsa o, ayrıca birinci seviye alt klasörlerden ilan taşıyanlar. Bugünkü
 * tek depo düzeninde bu liste `_Sarmal` ve `_KapaliUrun` verir; yarın adlar
 * değişirse liste kendiliğinden onları verir, çünkü listeyi ad değil ilan kurar.
 */
export function ilanliVarliklar(calismaAlaniKoku: string): string[] {
  const koklar: string[] = [];
  if (anadizinBul(calismaAlaniKoku)) koklar.push(calismaAlaniKoku);
  try {
    for (const alt of readdirSync(calismaAlaniKoku, { withFileTypes: true })) {
      if (!alt.isDirectory() || alt.name.startsWith(".") || alt.name === "node_modules") continue;
      const aday = join(calismaAlaniKoku, alt.name);
      if (anadizinBul(aday)) koklar.push(aday);
    }
  } catch { /* kök okunamadıysa ilan listesi boş kalır */ }
  return koklar;
}

/**
 * Bir çıktının hangi varlık köküne yazılacağını belirler. Sıra yine dardan
 * genişe gider: açık belgenin kendi varlığı, sonra çalışma alanında ilan
 * edilmiş varlıklardan hedef klasörü zaten olan, sonra ilan edilmiş ilk varlık,
 * en sonda çalışma alanı kökünün kendisi. Eskiden burada `_Sarmal` adı sabit
 * yazılıydı ve başka adla açılan bir depoda geribildirim hasadı, var olmayan
 * bir klasöre yazılıyordu.
 */
export function yazimKokuBul(
  acikBelgeDizini: string | undefined,
  calismaAlaniKokleri: readonly string[],
  hedefKlasor: string,
): string | undefined {
  if (acikBelgeDizini) {
    const kok = varlikKokuBul(acikBelgeDizini);
    if (kok) return kok;
  }
  const ilanlilar = calismaAlaniKokleri.flatMap((k) => ilanliVarliklar(k));
  const yerlesik = ilanlilar.find((k) => existsSync(join(k, hedefKlasor)));
  return yerlesik ?? ilanlilar[0] ?? calismaAlaniKokleri[0];
}

/**
 * Bir varlığa ait göreli yolun (örneğin `oz/siniflama/kayit.json`) diskteki
 * karşılığını arar. Sıra kasıtlıdır ve dardan genişe gider: önce belgenin kendi
 * ağacında yukarı yürünür, sonra belgenin varlık kökünde bakılır, en sonda
 * çalışma alanının İLAN EDİLMİŞ varlıkları taranır. Hiçbir adımda klasör adı
 * sabit yazılmaz.
 */
export function varlikDosyasiBul(
  baslangicDizin: string,
  goreli: string,
  calismaAlaniKokleri: readonly string[] = [],
): string | undefined {
  let dizin = baslangicDizin;
  for (let i = 0; i < KAT_SINIRI; i++) {
    const aday = join(dizin, goreli);
    if (existsSync(aday)) return aday;
    const ust = dirname(dizin);
    if (ust === dizin) break;
    dizin = ust;
  }
  for (const kok of calismaAlaniKokleri) {
    const dogrudan = join(kok, goreli);
    if (existsSync(dogrudan)) return dogrudan;
    for (const varlik of ilanliVarliklar(kok)) {
      const aday = join(varlik, goreli);
      if (existsSync(aday)) return aday;
    }
  }
  // GERİYE DÖNÜK UYUM: ilanını henüz yazmamış bir klasör de kanon taşıyor
  // olabilir. Bu son çare, ilan aramasından SONRA gelir ve onun yerine geçmez;
  // amacı, ilan disiplinine bugün uymayan bir depoyu zekâsız bırakmamaktır.
  for (const kok of calismaAlaniKokleri) {
    try {
      for (const alt of readdirSync(kok, { withFileTypes: true })) {
        if (!alt.isDirectory() || alt.name.startsWith(".") || alt.name === "node_modules") continue;
        const aday = join(kok, alt.name, goreli);
        if (existsSync(aday)) return aday;
      }
    } catch { /* kök okunamadıysa sessiz geç */ }
  }
  return undefined;
}

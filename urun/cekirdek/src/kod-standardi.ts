// ═══════════════════════════════════════════════════════════════════════════
// kod-standardi.ts — 🏷️ DÜĞÜM KODU STANDARDI (DIL-1.8 · RFM-MOTOR-A02)
//
//   Bu modül düğüm kodu standardının saf ölçümlerini taşır: projenin anadizininde
//   yaşayan önek sicilini okur ve bir kodun biçim hükmüne uyup uymadığını söyler.
//   Tanının kendisi burada basılmaz; üretici `denetci.ts` içindeki
//   `kodStandardiTanilari` işlevidir ve cümle tanı kataloğundan gelir. Ölçümün ayrı
//   bir modülde yaşamasının sebebi sonraki boş kodu önerecek aracın da (RFM-MOTOR-A03)
//   aynı sicili ve aynı biçim kuralını okuyacak olmasıdır; iki yerde yazılan kural
//   bir gün ayrışır.
//
//   SİCİLİN YERİ. Kanon önek sicilini projenin anadizinine koyar, çünkü önek bir tip
//   adı değil bir KONU adıdır ve konu uzayı her projenin kendi düzenidir. Sicil Proje
//   düğümünün iki alanında yaşar:
//     `önekler`       — projenin ilanlı önekleri; ilansız önekle doğan kod uyarı alır.
//     `biçimMuafları` — standarttan önce doğmuş ve dokunulmaz kalan kodlar. Tire
//                       taşıyan öğe tek bir kodu, tire taşımayan öğe ise o önekin
//                       bütün kodlarını biçim tanısından muaf tutar.
//
//   İLERİYE DÖNÜKLÜK. Standart yalnız sicil beyan edilmiş bir projede yürürlüktedir;
//   sicil yoksa hiçbir kod tanı üretmez, çünkü standardı benimsemeyen bir projenin
//   bütün kodlarını bir gecede uyarıya boyamak hükmün tersidir. Sicil beyan
//   edildiğinde mevcut envanterin önekleri toptan ilan edilir ve mevcut uyumsuz
//   kodlar muafiyet listesine adıyla yazılır; böylece yalnız yeni doğan kod konuşur.
//   Kanon madde kodları (DIL-5.1) bu standardın konusu değildir ve ölçülmez.
// ═══════════════════════════════════════════════════════════════════════════

import type { Dugum, Deger } from "./sozdizim.ts";

/** Projenin anadizininden okunan önek sicili. */
export interface OnekSicili {
  /** İlanlı önekler. */
  onekler: ReadonlySet<string>;
  /** Biçim tanısından muaf tutulan önekler (tire taşımayan muafiyet öğeleri). */
  muafOnekler: ReadonlySet<string>;
  /** Biçim tanısından muaf tutulan tekil kodlar. */
  muafKodlar: ReadonlySet<string>;
}

/** Biçim hükmünün dört ihlali. */
export type KodBicimKusuru =
  /** Küçük harf, alt çizgi, nokta, boşluk ya da Türkçe diakritik; ya da rakamla başlama. */
  | "karakter"
  /** Tek parçalı kod: parçalar tireyle ayrılır ve en az iki parça bulunur. */
  | "tek-parça"
  /** Önek iki ile dört harf arasında olmalı ve yalnız harf taşımalıdır. */
  | "önek"
  /** Adımın son parçası tek seri harfi ile iki basamaklı sıradan oluşur. */
  | "adım-sırası";

/** Büyük ASCII harf ve rakamlardan kurulan, tek tireyle ayrılan, harfle başlayan parçalar. */
const KOD_KARAKTERI = /^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*$/;
const ONEK_BICIMI = /^[A-Z]{2,4}$/;
const ADIM_SIRASI = /^[A-Z][0-9]{2}$/;
/** Kanon madde kodu biçimi (DIL-5.1): önek, tire ve noktalı numara. */
const MADDE_KODU = /^[A-Z]{2,4}-[0-9]+(?:\.[0-9]+)+$/;

/** Kodun ilk parçası — önek. */
export function kodOneki(kod: string): string {
  const kesim = kod.indexOf("-");
  return kesim < 0 ? kod : kod.slice(0, kesim);
}

/** Kanon madde kodu biçimindeki kod bu standardın konusu değildir (DIL-1.8 · DIL-5.1). */
export function maddeKoduMu(kod: string): boolean {
  return MADDE_KODU.test(kod);
}

/**
 * Bir kodun biçim hükmüne uyup uymadığını söyler; uyuyorsa `undefined` döner.
 * `tip` düğümün tip adıdır ve yalnız Adım için son parça kuralını açar.
 */
export function kodBicimKusuru(kod: string, tip: string): KodBicimKusuru | undefined {
  if (!KOD_KARAKTERI.test(kod)) return "karakter";
  const parcalar = kod.split("-");
  if (parcalar.length < 2) return "tek-parça";
  if (!ONEK_BICIMI.test(parcalar[0])) return "önek";
  if (tip === "Adım" && !ADIM_SIRASI.test(parcalar[parcalar.length - 1])) return "adım-sırası";
  return undefined;
}

/** Liste değerinin öğelerini düz metin olarak okur; liste değilse boş döner. */
function listeOgeleri(d: Deger | undefined): string[] {
  if (!d || d.tur !== "liste") return [];
  return (d.ogeler ?? []).map((o) => o.metin ?? "").filter((m) => m.length > 0);
}

/**
 * Proje düğümünden önek sicilini okur. Düğüm `önekler` alanını taşımıyorsa
 * `undefined` döner: o projede standart yürürlükte değildir.
 */
export function onekSiciliOku(proje: Dugum): OnekSicili | undefined {
  const alanlar = [...proje.parametreler, ...proje.ozellikler];
  const onekAlani = alanlar.find((p) => p.ad === "önekler");
  if (!onekAlani) return undefined;
  const muaf = listeOgeleri(alanlar.find((p) => p.ad === "biçimMuafları")?.deger);
  return {
    onekler: new Set(listeOgeleri(onekAlani.deger)),
    muafOnekler: new Set(muaf.filter((m) => !m.includes("-"))),
    muafKodlar: new Set(muaf.filter((m) => m.includes("-"))),
  };
}

/** Kod standardının tek bir kod için verdiği hüküm. */
export type KodStandardiHukmu =
  | { tur: "biçim"; kusur: KodBicimKusuru }
  | { tur: "ilansız-önek"; onek: string };

/**
 * Sicil altında bir kodu ölçer. Biçim kusuru önce konuşur, çünkü biçimi bozuk bir
 * kodun öneki güvenle okunamaz; biçim yerindeyse önekin sicilde ilanı aranır. Muaf
 * kod ve muaf önek yalnız biçim tanısından muaftır, önek ilanı her kodda aranır.
 */
export function kodStandardiHukmu(kod: string, tip: string, sicil: OnekSicili): KodStandardiHukmu | undefined {
  if (maddeKoduMu(kod)) return undefined;
  const onek = kodOneki(kod);
  const muaf = sicil.muafKodlar.has(kod) || sicil.muafOnekler.has(onek);
  if (!muaf) {
    const kusur = kodBicimKusuru(kod, tip);
    if (kusur) return { tur: "biçim", kusur };
  }
  if (!sicil.onekler.has(onek)) return { tur: "ilansız-önek", onek };
  return undefined;
}

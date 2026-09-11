// ═══════════════════════════════════════════════════════════════════════════
// gezinme-cekirdek.ts — 🚧 GEZİNME REDDİNİN SEBEBİ (VIT-K78-A09 · HTR-GEZINME-SESSIZ-RET)
//
//   ÖLÇÜLMÜŞ KUSUR. Kimlik penceresi bazı kodlarda açılır, bazılarında hiçbir
//   şey yapmaz ve kullanıcı bu farkın sebebini göremez. Sebep ölçüldü ve ÜÇ
//   TANEDİR; üçü de bilinçlidir ve savunulabilir:
//     ① VARLIK SINIRI — açık araçtaki bir dosyadan başka bir varlığın kökünde
//        tanımlı koda gezinmek STR-3 ile MIM-1.1 gereği yasaktır.
//     ② DERS DÜNYASI — ürün dosyasından öğreti rafındaki (arşiv · örnek ·
//        fikstür · şablon) tanımlara gidilmez (OGR-5).
//     ③ TANIM YOKLUĞU — pencere yalnız TANIMI olan kodda açılır; kimi kodun
//        ağaçta yalnız metin atfı vardır.
//   Kusur davranışta değil YÜZEYDEDİR: üç kural da doğru çalışır, fakat yüzey
//   sessizce hiçbir şey yapmadığı için davranış keyfî görünür. Kullanıcı neden
//   gidilemediğini öğrenirse kural öğretici olur; bugün yalnız kafa karıştırıcıdır.
//
//   BU MODÜL KARAR VERİR, YAZMAZ. Saf ve vscode'suzdur; kabuk (gezinme.ts)
//   yalnız sebebi cümleye çevirip bildirim yüzeyine basar. Ret KURALLARI burada
//   DEĞİŞMEZ ve İKİNCİ KEZ YAZILMAZ: sebep, süzgecin kendi ölçütleriyle
//   (`DERS_DUNYASI` deseni ve varlık kökü çözücüsü) hesaplanır — yani bu modül
//   `gezinmeSuzgeci` kararının AYNASIDIR, rakibi değil.
//
//   SIRA MEKANİZMANIN KENDİ SIRASIDIR. `gezinmeSuzgeci` önce ders dünyasını,
//   sonra varlık sınırını sorar; bu modül de aynı sırayı izler ki basılan cümle
//   ile fiilen uygulanan kural hiçbir durumda çelişmesin (YUZ-3.1: hiçbir yüzey
//   bir tanıyı gizleyemez — yanlış sebep söylemek de bir gizlemedir).
//
//   Fikstürlü sınama: sinama/gezinme-reddi.test.ts
// ═══════════════════════════════════════════════════════════════════════════

import { DERS_DUNYASI } from "../../cekirdek/src/kimlik.ts";

/** Gezinmenin reddedilme sebebi — üçü de bilinçli kuraldır, kusur değildir. */
export type GezinmeRetSebebi = "ders-dünyası" | "varlık-sınırı" | "tanım-yok";

/**
 * Ret ölçümünün girdisi. Hiçbir alan uydurulmaz: sayılar ve yollar üretimdeki
 * kimlik indeksinin kendi cevaplarıdır, çözücü de kabuğun kullandığı çözücüdür.
 */
export interface GezinmeRetGirdisi {
  /** Gezinmenin başladığı dosya (`file` şeması değilse tanımsız). */
  readonly kaynakYolu: string | undefined;
  /** Süzgeçten GEÇEN tanım sayısı — sıfırdan büyükse ret yoktur. */
  readonly gorunenSayi: number;
  /** Kodun ağaçtaki TÜM tanımlarının dosya yolları (süzgeçsiz). */
  readonly tumTanimlar: readonly string[];
  /** Kodun ağaçta en az bir metin atfı var mı — rastgele sözcüğü susturan ölçü. */
  readonly atifVar: boolean;
  /** Bir dosyanın varlık kökü; kabuğun kullandığı çözücünün ta kendisi. */
  readonly varlikKoku: (yol: string) => string | undefined;
}

/**
 * Gezinme reddinin sebebini ölçer; ret yoksa ya da sebep ölçülemiyorsa
 * `undefined` döner ve yüzey SUSAR.
 *
 * SUSMANIN İKİ MEŞRU HÂLİ VARDIR ve ikisi de bilinçlidir. Birincisi tanımın
 * bulunmasıdır: gezinme gerçekleşmiştir, söylenecek bir şey yoktur. İkincisi
 * imlecin altındaki sözcenin ağaçta hiçbir izinin olmamasıdır: kullanıcı sıradan
 * bir sözcüğün üstünde F12'ye basmıştır ve ona "tanımı yok" demek bir bildirim
 * değil gürültü olurdu. Bildirim yalnız kodun ağaçta YAŞADIĞI, fakat gezinmenin
 * yine de durduğu hâlde doğar — kullanıcının şaşırdığı tek durum budur.
 */
export function gezinmeRetSebebi(girdi: GezinmeRetGirdisi): GezinmeRetSebebi | undefined {
  if (girdi.gorunenSayi > 0) return undefined;
  if (girdi.tumTanimlar.length === 0) return girdi.atifVar ? "tanım-yok" : undefined;

  const kaynakDersDunyasi =
    girdi.kaynakYolu !== undefined && DERS_DUNYASI.test(girdi.kaynakYolu);
  const kaynakKoku = girdi.kaynakYolu ? girdi.varlikKoku(girdi.kaynakYolu) : undefined;

  let varlikSiniri = false;
  for (const dosya of girdi.tumTanimlar) {
    // Süzgeç kaynak dosyanın KENDİSİNİ her zaman geçirir; o tanım elenmiş
    // olamaz, dolayısıyla bir ret sebebi de üretemez.
    if (dosya === girdi.kaynakYolu) continue;
    if (!kaynakDersDunyasi && DERS_DUNYASI.test(dosya)) return "ders-dünyası";
    if (kaynakKoku) {
      const kok = girdi.varlikKoku(dosya);
      if (kok && kok !== kaynakKoku) varlikSiniri = true;
    }
  }
  return varlikSiniri ? "varlık-sınırı" : undefined;
}

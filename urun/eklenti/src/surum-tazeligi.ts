// ═══════════════════════════════════════════════════════════════════════════
// surum-tazeligi.ts — 📦 KURULU PAKET İLE DEPO SÜRÜMÜNÜN KARŞILAŞTIRILMASI
//                        (BKM-DNT-A12 · HTR-SURUM-DAMGASI-TUZAGI)
//
//   ÖLÇÜLMÜŞ TUZAK. 2026-08-08 tarihinde Founder'ın kurulu paketi 5 Ağustos
//   derlemesini taşırken depodaki derleme 8 Ağustos tarihliydi; iki paket de
//   aynı sürüm numarasını taşıdığı için yürütücü kurulu paketi hiç değiştirmedi
//   ve üç günlük iş kullanıcıya hiç ulaşmadı. Geliştirici özelliğin çalıştığını
//   sanarken kullanıcı özelliğin kaybolduğunu gördü.
//
//   İKİNCİ VAKA GEREKÇEYİ SERTLEŞTİRDİ (2026-08-28). Founder panelde
//   `doğrulanamayan-tanı-iddiası` uyarısı gördü; uyarı kaynakta GERÇEK DEĞİLDİ.
//   Belirtinin sebebi, kurulu eklentinin tanıyı henüz tanımayan bir motoru
//   çalıştırmasıydı. Yani asıl tuzak paketin üretilmemesi değil, üretilenin
//   KULLANICIYA ULAŞMAMASIDIR: bayat paket, ürünün kanonuyla çeliştiğini
//   söyleyerek aracın bütün iddiasını zayıflatır.
//
//   BU GÖVDE SAFTIR ve düzenleyiciye dokunmaz: sürümleri ve kipi argüman olarak
//   alır, kararı döndürür. Böylece nöbet gerçek bir düzenleyici indirmeden
//   koşabilir ve karar mantığı yüzeyden bağımsız sınanır.
//
//   MAĞAZA KURULUMUNDA SUSAR. Karşılaştırmanın anlamı yalnız GELİŞTİRME çalışma
//   alanında vardır, çünkü orada depo ile kurulu paket aynı makinede yaşar ve
//   ayrışmaları mümkündür. Mağazadan kurulan bir pakette depo yoktur;
//   karşılaştırılacak ikinci bir sürüm de yoktur ve uyarı üretmek kullanıcıya
//   anlamsız bir gürültü olurdu.
// ═══════════════════════════════════════════════════════════════════════════

/** Karşılaştırmanın girdisi — üçü de çağıranın ölçtüğü olgulardır. */
export interface SurumOlgusu {
  /** Çalışan (kurulu) eklentinin kendi bildirdiği sürüm. */
  readonly kuruluSurum: string;
  /** Depodaki paket bildiriminin sürümü; depo yoksa tanımsızdır. */
  readonly depoSurumu?: string;
  /** Geliştirme çalışma alanı mı? Mağaza kurulumunda `false`. */
  readonly gelistirmeKipi: boolean;
}

/** Karşılaştırmanın sonucu; `undefined` "söylenecek bir şey yok" demektir. */
export interface SurumAyrismasi {
  /** Panelde basılacak tek satır. */
  readonly satir: string;
  readonly kuruluSurum: string;
  readonly depoSurumu: string;
}

/** `1.2.10` biçimini sayısal parçalara böler; sayı olmayan parça sıfır sayılır. */
function parcala(s: string): number[] {
  return s.split(/[.+-]/u).map((p) => {
    const n = Number.parseInt(p, 10);
    return Number.isFinite(n) ? n : 0;
  });
}

/**
 * Karşılaştırma: a, b'den ileri mi? Sözlük sırası KULLANILMAZ, çünkü `0.9.137`
 * ile `0.9.90` sözlükte yanlış sıralanır ve tuzağın tam da bu ölçekte doğduğu
 * ölçülmüştür (0.9.137 · 0.9.143 · 0.9.159 sürümleri).
 */
export function surumIleriMi(a: string, b: string): boolean {
  const x = parcala(a);
  const y = parcala(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const fark = (x[i] ?? 0) - (y[i] ?? 0);
    if (fark !== 0) return fark > 0;
  }
  return false;
}

/**
 * Ayrışmayı ölçer. Uyarı YALNIZ şu üç koşul birlikte sağlandığında doğar:
 * geliştirme kipindeyiz, depo sürümü okunabildi ve depo sürümü kurulu paketten
 * İLERİDE. Depo geride ise susulur, çünkü o hâl geliştiricinin bilerek eski bir
 * dala geçmesi olabilir ve uyarı yanlış yönlendirirdi.
 */
export function surumAyrismasi(olgu: SurumOlgusu): SurumAyrismasi | undefined {
  if (!olgu.gelistirmeKipi) return undefined;
  const depo = olgu.depoSurumu?.trim();
  if (!depo || !olgu.kuruluSurum.trim()) return undefined;
  if (!surumIleriMi(depo, olgu.kuruluSurum)) return undefined;
  return {
    kuruluSurum: olgu.kuruluSurum,
    depoSurumu: depo,
    satir: `Kurulu eklenti ${olgu.kuruluSurum} sürümünü çalıştırıyor, depodaki paket bildirimi ise ${depo} sürümünde;`
      + " kurulu paket bayat olduğu için panelde gördüğün sonuç kaynağın bugünkü hâlini yansıtmayabilir."
      + " Paketi yeniden kurmadan panel çıktısını kaynak hükmü sayma.",
  };
}

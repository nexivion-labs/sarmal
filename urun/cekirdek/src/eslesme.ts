// ═══════════════════════════════════════════════════════════════════════════
// eslesme.ts — 🎯 Adım ↔ Etmen eşleyicisi (RAY-3 · RAY3-ESL-A01)
//
//   NE ÇÖZER. Bir Adımın hangi Etmene verileceği bugüne kadar hiçbir yerde
//   yazılı değildi; çekirdek kaynağında eşleyici ya da skorlama adını taşıyan
//   tek bir işlev yoktu. Karar tamamen kontrolcünün belleğinde yaşıyordu ve
//   bellek kişiyle birlikte kaybolur. Bu modül kararı ÖLÇÜLEBİLİR hâle getirir.
//
//   ⚖️ STR-3.1 KESİM TESTİ. MEKANİZMA açıktır: beş boyut, ağırlıklı toplam,
//   eşik elemesi, deterministik sıralama ve gerekçeli çıktı. AYARLANMIŞ POLİTİKA
//   ise ağırlıkların ve eşiğin DEĞERLERİDİR; onlar gövdeye gömülmez, çağıranın
//   enjekte ettiği yapılandırmadan okunur (rbac.ts ve gateway.ts ile aynı desen).
//   Founder 2026-08-05 dalga hükmüyle bu kalemi birinci dalgaya, yani açık
//   kaynak minimal sürüme koyduğu için VARSAYILAN yapılandırma da açık tarafta
//   yazılıdır; bu bir sızıntı değil, ilan edilmiş bir yayın kararıdır.
//
//   SAF ÇEKİRDEK: dosya okumaz, dosya yazmaz, ağa çıkmaz, saat okumaz. Aynı
//   girdi her koşuda aynı çıktıyı verir; determinizm eşleyicinin denetlenebilir
//   olmasının ön şartıdır, çünkü yeniden üretilemeyen bir sıralama savunulamaz.
// ═══════════════════════════════════════════════════════════════════════════

/** Eşleyicinin baktığı beş boyut. Sıra sabittir ve çıktı metinlerinde bu sırayla anılır. */
export const BOYUTLAR = ["alan", "dil", "başarı", "hız", "hata"] as const;
export type Boyut = (typeof BOYUTLAR)[number];

/**
 * Bir adayın ölçülmüş profili. Beş boyutun beşi de sıfır ile bir arasında
 * normalize edilmiş değerlerdir; normalizasyon bu modülün işi değildir, çünkü
 * ham ölçünün nereden geldiği (sicil, telemetri, beyan) çağıranın bilgisidir.
 * `hata` boyutu TERS YÖNLÜDÜR: büyük değer kötüdür ve skorlamada çıkarılır.
 */
export interface AdayProfil {
  etmen: string;
  alan: number;
  dil: number;
  başarı: number;
  hız: number;
  hata: number;
}

/** Ağırlıklar ve eşik — AYARLANMIŞ POLİTİKA. Gövdeye gömülmez, enjekte edilir. */
export interface EşlemeYapılandırması {
  ağırlıklar: Readonly<Record<Boyut, number>>;
  /** Bu değerin ALTINDA kalan aday elenir; eleme gerekçesiyle birlikte taşınır. */
  eşik: number;
}

/**
 * Açık kaynak minimal sürümün varsayılanı (Founder dalga hükmü · 2026-08-05).
 * Değerler bir başlangıç noktasıdır ve ayarlanmış politika bunları enjeksiyonla
 * geçersiz kılar; burada yazılı olmaları açık sürümün çalışır olması içindir.
 */
export const VARSAYILAN_ESLEME: EşlemeYapılandırması = {
  ağırlıklar: { alan: 0.35, dil: 0.20, başarı: 0.25, hız: 0.10, hata: 0.10 },
  eşik: 0.45,
};

/** Bir adayın skorlanmış sonucu — seçilse de elense de gerekçesi taşınır. */
export interface AdaySonuç {
  etmen: string;
  skor: number;
  /** Boyut başına ağırlıklı katkı — skorun nereden geldiği okunabilir olsun diye. */
  katkılar: Readonly<Record<Boyut, number>>;
  elendi: boolean;
  /** Elenen aday için sebep; seçilen aday için sıralamayı açıklayan cümle. */
  gerekçe: string;
}

export interface EşlemeSonuç {
  /** Eşiği geçen adaylar, skoru büyükten küçüğe sıralı. */
  sıralı: AdaySonuç[];
  /** Eşiğin altında kalanlar; her biri kendi gerekçesini taşır. */
  elenen: AdaySonuç[];
  /** Sonuç boşsa NEDEN boş olduğu. Eşleyici aday uydurmaz, sebebini söyler. */
  sebep?: string;
}

/** Skoru üç basamağa yuvarlar — kayan nokta gürültüsü sıralamayı oynatmasın. */
function yuvarla(x: number): number {
  return Math.round(x * 1000) / 1000;
}

/**
 * Bir Adım için aday Etmenleri skorlar ve sıralar.
 *
 * TASARIM KARARLARI VE GEREKÇELERİ:
 *   ① Eşik altında kalan aday SESSİZCE düşmez; `elenen` listesinde gerekçesiyle
 *      yaşar, çünkü gerekçesiz eleme denetlenemez ve denetlenemeyen bir karar
 *      savunulamaz.
 *   ② Aday kümesi boşsa işlev bir aday UYDURMAZ; boş sonuç ile birlikte sebebini
 *      döner ve kararı çağırana bırakır. Kapalı kapıda tahmin üretmek, gateway'in
 *      fail-closed hükmüyle aynı sebepten yasaktır.
 *   ③ Eşit skorlu adaylar Etmen koduna göre alfabetik sıralanır; böylece aynı
 *      girdi her koşuda birebir aynı çıktıyı verir ve determinizm korunur.
 */
export function etmenEşle(
  adımKod: string,
  adaylar: readonly AdayProfil[],
  yapılandırma: EşlemeYapılandırması = VARSAYILAN_ESLEME,
): EşlemeSonuç {
  if (adaylar.length === 0) {
    return { sıralı: [], elenen: [], sebep: `'${adımKod}' için hiç aday Etmen verilmedi; eşleyici aday uydurmaz ve kararı çağırana bırakır.` };
  }

  const { ağırlıklar, eşik } = yapılandırma;
  const sonuçlar: AdaySonuç[] = adaylar.map((a) => {
    const katkılar = {
      alan:   yuvarla(a.alan * ağırlıklar.alan),
      dil:    yuvarla(a.dil * ağırlıklar.dil),
      başarı: yuvarla(a.başarı * ağırlıklar.başarı),
      hız:    yuvarla(a.hız * ağırlıklar.hız),
      // TERS YÖN: hata oranı büyüdükçe skor düşer.
      hata:   yuvarla(-a.hata * ağırlıklar.hata),
    } as const;
    const skor = yuvarla(Object.values(katkılar).reduce((t, x) => t + x, 0));
    const elendi = skor < eşik;
    const döküm = BOYUTLAR.map((b) => `${b}=${katkılar[b]}`).join(" · ");
    return {
      etmen: a.etmen,
      skor,
      katkılar,
      elendi,
      gerekçe: elendi
        ? `skor ${skor}, eşik ${eşik} altında kaldı (${döküm})`
        : `skor ${skor}, eşiği geçti (${döküm})`,
    };
  });

  // Deterministik sıra: önce skor (büyükten küçüğe), eşitlikte Etmen kodu.
  const sırala = (a: AdaySonuç, b: AdaySonuç): number =>
    b.skor - a.skor || a.etmen.localeCompare(b.etmen, "tr");

  const sıralı = sonuçlar.filter((s) => !s.elendi).sort(sırala);
  const elenen = sonuçlar.filter((s) => s.elendi).sort(sırala);

  return sıralı.length > 0
    ? { sıralı, elenen }
    : { sıralı, elenen, sebep: `'${adımKod}' için ${adaylar.length} adayın tamamı ${eşik} eşiğinin altında kaldı; eşleyici aday uydurmaz ve kararı çağırana bırakır.` };
}

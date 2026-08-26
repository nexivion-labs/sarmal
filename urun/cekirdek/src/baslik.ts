// ═══════════════════════════════════════════════════════════════════════════
// baslik.ts — 🔤 TÜRKÇE BAŞLIK DÜZENİ (Founder hükmü 2026-08-26 · YUZ)
//
//   NEDEN VAR: yüzeyler insan içindir. Bir düğümün KODU makinenin kimliğidir ve
//   yüzeyde yer kaplamaktan başka iş görmez; tip zaten ikonun kendisiyle
//   söylenir. Geliştiricinin panelde okuması gereken tek şey ADdır ve o ad
//   düzgün bir başlık gibi yazılmalıdır.
//
//   NEDEN ÇEKİRDEKTE: kural tek bir yüzeyin değil BÜTÜN yüzeylerin kuralıdır —
//   yol haritası paneli, komut satırı çıktısı, üretilen belge yüzleri ve graf
//   raporu aynı işlevi çağırır. İki yerde iki yazım olursa aynı ad iki yüzeyde
//   farklı görünür ve kural sessizce çürür.
//
//   TÜRKÇE TUZAĞI: JavaScript'in varsayılan büyütmesi Türkçe'yi bozar —
//   "istanbul".toUpperCase() "ISTANBUL" verir, oysa doğrusu "İSTANBUL"dur; aynı
//   şekilde "IĞDIR".toLowerCase() "iğdir" verir, doğrusu "ığdır"dır. Bu yüzden
//   her dönüşüm yerel duyarlı biçimiyle ("tr") yapılır.
// ═══════════════════════════════════════════════════════════════════════════

/** Başlıkta küçük kalan bağlaç ve edatlar — Türkçe yazım kuralı: başlıkta her
 *  sözcüğün ilk harfi büyük yazılır, FAKAT bağlaçlar ile edatlar küçük kalır.
 *  Bir istisna: bağlaç başlığın İLK sözcüğüyse büyük yazılır. */
const KUCUK_KALANLAR = new Set([
  "ve", "ile", "ya", "veya", "ki", "de", "da", "ama", "fakat", "çünkü",
  "için", "göre", "gibi", "kadar", "ise", "hem", "ne", "yahut",
]);

/** Sözcük ayracı sayılan işaretler — kimlik yazımından (nexivion-labs) insan
 *  yazımına (Nexivion Labs) geçişi bunlar sağlar. */
const AYRAC = /[-_]+/g;

/** Türkçe duyarlı büyütme: i→İ ve ı→I ayrımı korunur. */
export function buyukTr(s: string): string {
  return s.toLocaleUpperCase("tr");
}

/** Türkçe duyarlı küçültme: I→ı ve İ→i ayrımı korunur. */
export function kucukTr(s: string): string {
  return s.toLocaleLowerCase("tr");
}

/** Tek sözcüğü başlık biçimine çevirir: ilk harf büyük, kalanı küçük.
 *  Sözcüğün başındaki noktalama ve emoji atlanır — ilk HARF büyütülür. */
function sozcukBaslik(sozcuk: string): string {
  const kucuk = kucukTr(sozcuk);
  const i = [...kucuk].findIndex((c) => /\p{L}/u.test(c));
  if (i < 0) return sozcuk;                      // harf yok (emoji, sayı, işaret)
  const dizi = [...kucuk];
  dizi[i] = buyukTr(dizi[i]);
  return dizi.join("");
}

/**
 * Bir adı Türkçe başlık düzenine çevirir.
 *
 * Kural: her sözcüğün ilk harfi büyük, kalan harfleri küçüktür; bağlaç ve
 * edatlar küçük kalır, ancak ilk sözcük her hâlde büyük yazılır. Kimlik
 * yazımındaki tire ve alt çizgi sözcük ayracı sayılır.
 *
 * Örnek: `"nexivion-labs"` → `"Nexivion Labs"`,
 *        `"kimlik ve zemin"` → `"Kimlik ve Zemin"`,
 *        `"v1 omurga göçü"` → `"V1 Omurga Göçü"`.
 */
export function baslikDuzeni(ad: string): string {
  const duz = ad.replace(AYRAC, " ").replace(/\s+/g, " ").trim();
  if (!duz) return ad;
  const sozcukler = duz.split(" ");
  return sozcukler
    .map((s, i) => {
      const yalin = kucukTr(s.replace(/[^\p{L}]/gu, ""));
      if (i > 0 && KUCUK_KALANLAR.has(yalin)) return kucukTr(s);
      return sozcukBaslik(s);
    })
    .join(" ");
}

/** Ad başlık düzeninde mi? Tanı bu yüklemi kullanır; dönüşüm sonucu kendisiyle
 *  aynıysa ad zaten düzgündür. */
export function baslikDuzenindeMi(ad: string): boolean {
  return ad === baslikDuzeni(ad);
}

/** `hedefTarih` alanından yüzeyde gösterilecek kısa tarih rozeti üretir.
 *  Faz adları ay bilgisini metinde taşımaz (Founder hükmü 2026-08-26); zaman
 *  bilgisi ADIN İÇİNDE değil, satırın kenarında yaşar ve kaynağı `hedefTarih`
 *  alanıdır — böylece tek yerde durur ve elle yazılmış ay adıyla çelişemez. */
const AYLAR = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

const GUNLER = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

export function tarihRozeti(hedefTarih: string | undefined): string {
  if (!hedefTarih) return "";
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(hedefTarih.trim());
  if (!m) return "";
  const yil = Number(m[1]); const ay = Number(m[2]);
  if (ay < 1 || ay > 12) return "";
  if (m[3] === undefined) return `${AYLAR[ay - 1]} ${yil}`;
  const gun = Number(m[3]);
  if (gun < 1 || gun > 31) return `${AYLAR[ay - 1]} ${yil}`;
  // Gün adı UTC'den okunur: yerel saat dilimi tarihi bir gün kaydırabilir ve
  // aynı plan iki makinede iki farklı gün adı gösterir; bu sapma sessizdir.
  const d = new Date(Date.UTC(yil, ay - 1, gun));
  return `${gun} ${AYLAR[ay - 1]} ${yil} ${GUNLER[d.getUTCDay()]}`;
}

/** Satırda duran KISA tarih: gün ve ay. Yıl yalnız içinde bulunulan yıldan
 *  farklıysa yazılır ve gün adı hiç yazılmaz — ikisi de satırı uzatır ve ağaç
 *  görünümünde uzun satır sayacı kırptırır. Tam tarih hover'da yaşar; yüzey
 *  kısalığı bilgiyi silmez, yerini değiştirir. */
export function tarihRozetiKisa(hedefTarih: string | undefined, buYil?: number): string {
  if (!hedefTarih) return "";
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(hedefTarih.trim());
  if (!m) return "";
  const yil = Number(m[1]); const ay = Number(m[2]);
  if (ay < 1 || ay > 12) return "";
  const simdi = buYil ?? new Date().getFullYear();
  const yilEki = yil === simdi ? "" : ` ${yil}`;
  if (m[3] === undefined) return `${AYLAR[ay - 1]}${yilEki}`;
  const gun = Number(m[3]);
  if (gun < 1 || gun > 31) return `${AYLAR[ay - 1]}${yilEki}`;
  return `${gun} ${AYLAR[ay - 1]}${yilEki}`;
}

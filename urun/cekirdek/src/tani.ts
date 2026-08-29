// ═══════════════════════════════════════════════════════════════════════════
// tani.ts — Tanı (drift diagnostic)
//
//   Doğrulayıcının ürettiği bulgu. Türkçe, konumlu, öneri taşıyabilir.
//   Düzey renkleri (SNF-0 driftRozetleri): hata #EF4444 · uyarı #FF8C42 · bilgi #4D9FFF
// ═══════════════════════════════════════════════════════════════════════════

export type Duzey = "hata" | "uyarı" | "bilgi";

/** Tanının okuma yüzünde seçilebilen metin çifti; kimlik ve konum çevrilmez. */
export interface TaniDilMetni {
  mesaj: string;
  oneri?: string;
  /** Kırpılmamış gövdeyle kurulmuş ikiz cümle — açıklaması `Tani.tamMesaj` alanındadır. */
  tamMesaj?: string;
}

export interface Tani {
  duzey: Duzey;
  /** drift kodu — örn. "bilinmeyen-tip" · "izinsiz-sarma". */
  kod: string;
  /** Türkçe, sade açıklama. */
  mesaj: string;
  satir: number;
  sutun: number;
  /** düzeltme önerisi (öneri motoru). */
  oneri?: string;
  /**
   * Aynı olgunun paralel okuma yüzleri. Motor varsayılan Türkçe yüzü üretse de
   * eklenti bu hanelerden etkin dili seçebilir; .sar kaynağına dokunulmaz.
   */
  dilMetinleri?: Readonly<{ tr: TaniDilMetni; en: TaniDilMetni }>;
  /**
   * ÖZET SATIRININ DÜRÜSTLÜK ALANI — bu satırın KAÇ bulguyu temsil ettiği.
   * Gösterim katmanı bir tanı selini tek satıra indirdiğinde saklanan bulgular
   * yok olmaz; satır onların YERİNE geçer ve kaçının yerine geçtiğini burada
   * söyler. Böylece akışı okuyan tek bir sayaç, satırları değil GERÇEK bulguları
   * toplayabilir: bir satırın ağırlığı `ozetlenen ?? 1` kadardır. Alan yoksa
   * satır yalnız kendini temsil eder.
   */
  ozetlenen?: number;
  /**
   * AYNI OLGUNUN KIRPILMAMIŞ CÜMLESİ (VIT-GRAF-A18).
   *
   * Bir tanı, düğümün gövdesini mesajına gömerken onu kısaltmak zorundadır:
   * komut satırının bir satırı ve ağacın bir etiketi sınırlıdır ve oraya sığmayan
   * cümle okunmaz hâle gelir. Buna karşılık ipucu penceresi kaydın TAMAMINI
   * taşımak üzere açılır; pencere de kısaltılmışı gösterirse fareyi getirmenin
   * hiçbir kazancı kalmaz (Founder canlı bulgusu · 2026-08-16).
   *
   * Bu alan bu yüzden vardır ve `mesaj` alanına DOKUNMAZ: `mesaj` kırpılmış hâlini
   * korur, dolayısıyla komut satırı çıktısının bilgi içeriği değişmez; `tamMesaj`
   * ise aynı cümlenin kırpılmamış gövdeyle kurulmuş ikizidir ve yalnız pencere
   * gibi yeri geniş olan yüzeyler onu okur. Alan isteğe bağlıdır: taşımayan tanı
   * eskisi gibi çalışır ve yüzey kısa cümleye düşer.
   */
  tamMesaj?: string;
}

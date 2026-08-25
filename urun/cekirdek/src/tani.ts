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
}

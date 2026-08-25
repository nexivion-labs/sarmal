// ═══════════════════════════════════════════════════════════════════════════
// sozdizim.ts — Söz Dizim Ağacı (AST) tipleri
//
//   Ayrıştırıcının ürettiği ağacın biçimi. Yalnız tip tanımı içerir
//   (çalışma-zamanı kodu yok → import type ile çekilir, sıfır ayak izi).
//
//   Bir .sar dosyası = bildirimler dizisi. Her bildirim bir Düğüm:
//     • widget      → Tip(params){ gövde }         (DIL-1.3)
//     • çağır       → çağır KOD                     (DIL-1.4)
//     • tipTanım    → Tip Ad(params){ ne: ... }     (TIP-1)
//     • kuralTanım  → Kural ad(params){ ... }        (DIL-3)
// ═══════════════════════════════════════════════════════════════════════════

export type DugumTuru = "widget" | "çağır" | "tipTanım" | "kuralTanım";

/** Harita (map) değerindeki bir anahtar→değer çifti. */
export interface HaritaCifti {
  ad: string;
  deger: Deger;
  satir: number;
  sutun: number;
}

/** Bir parametre değeri (DIL-1.3 ifade dili). */
export interface Deger {
  tur: "metin" | "kod" | "liste" | "sayı" | "widget" | "harita"
     | "anahtar"   // #küme.ad — i18n sözlük anahtarı (DIL-1.3)
     | "erişim"    // kullanıcı.ad — nokta-erişimi (DIL-1.3)
     | "ifade";    // sol İŞLEM sağ — aritmetik/karşılaştırma/mantık (DIL-1.3)
  /** metin/kod/sayı için ham içerik; anahtar/erişim için noktalı yol. */
  metin?: string;
  /** liste için öğeler. */
  ogeler?: Deger[];
  /** widget değeri için düğüm (örn. `yasa: Yasa(...)`). */
  dugum?: Dugum;
  /** harita değeri için çiftler (örn. `raflar: { ÖZ: "oz/" }`). */
  ciftler?: HaritaCifti[];
  /** ifade için: işlem (+ - * / % == != < <= > >= ve veya değil). */
  islem?: string;
  /** ifade için: sol işlenen (tekli `değil`de yok). */
  sol?: Deger;
  /** ifade için: sağ işlenen. */
  sag?: Deger;
  satir: number;
  sutun: number;
}

/** Adlandırılmış parametre: `ad: değer` (DIL-1.2). */
export interface Param {
  ad: string;
  deger: Deger;
  satir: number;
  sutun: number;
}

/** Ağaçtaki bir düğüm (widget bildirimi / çağır / tip-kural tanımı). */
export interface Dugum {
  tur: DugumTuru;
  /** widget tip adı · çağrılan KOD · tanımlanan tip/kural adı. */
  ad: string;
  /** (...) içindeki adlandırılmış parametreler (kenarlar dahil). */
  parametreler: Param[];
  /** gövde {...} içindeki `ad: değer` özellikleri (örn. tipTanım'da ne:). */
  ozellikler: Param[];
  /** gövde {...} içindeki alt-widget'lar (containment). */
  cocuklar: Dugum[];
  /** /// belge-yorumu (DIL-2.2): düğümün insan/ajan anlatısı — markdown serbest. */
  belge?: string;
  satir: number;
  sutun: number;
}

/** Bir .sar dosyasının tümü. */
export interface Program {
  bildirimler: Dugum[];
  /** Altında widget olmayan /// blokları (DIL-2.1) — Denetçi `sahipsiz-belge` uyarır. */
  sahipsizBelgeler?: { satir: number; sutun: number }[];
}

// ═══════════════════════════════════════════════════════════════════════════
// palet.ts — 🎨 İFADE PALETİ (TAS-C01 · kip A: sözlük-yardımlı detaylı niyet)
//
//   Tasarım sözlüğü (bilgi/tasarim_sozlugu/kayit.json · 272 kavram) tamamlamaya
//   ÖNERİ LİSTESİ olarak bağlanır — rijit enum DEĞİL: motor doğrulamaz, geçersiz-enum
//   basılmaz; palet yalnız niyeti DETAYLI yazmaya yardım eder (kayıplı özet değil,
//   zengin ifade — HTR-TASARIM-DISIPLINI). SAF modül: vscode importu YOK (testlenebilir).
// ═══════════════════════════════════════════════════════════════════════════

/** Bir palet önerisi: Türkçe kavram + kategori yolu + kanonik (flutter) eşleme. */
export interface PaletOneri {
  kavram: string;
  kategori: string;
  /** kanonik eşleme (flutter sütunu — sözlük _meta: "flutter = kanonik"). */
  es?: string;
}

/**
 * Sözlük JSON'undan düz öneri listesi çıkarır (saf · biçim-toleranslı).
 * Sözlük şekli: { _meta, onyuz: { yerlesim: { kavram: { flutter, react, … } } }, … } —
 * derinlik serbest; YAPRAK = değerleri string olan nesne (kavram→stack eşlemesi).
 * `_` önekli anahtarlar (meta) atlanır. Bozuk/boş girdi → boş liste (sessiz-güvenli).
 */
export function ifadePaletiCikar(sozluk: unknown): PaletOneri[] {
  const out: PaletOneri[] = [];
  if (!sozluk || typeof sozluk !== "object") return out;
  const gez = (dugum: Record<string, unknown>, yol: string[]): void => {
    for (const [ad, deger] of Object.entries(dugum)) {
      if (ad.startsWith("_")) continue;   // _meta vb.
      if (!deger || typeof deger !== "object" || Array.isArray(deger)) continue;
      const girdiler = Object.values(deger as Record<string, unknown>);
      const yaprakMi = girdiler.length > 0 && girdiler.every((v) => typeof v === "string");
      if (yaprakMi) {
        const e = (deger as Record<string, unknown>)["flutter"];
        out.push({ kavram: ad, kategori: yol.join(" · ") || "sözlük", es: typeof e === "string" ? e : undefined });
      } else {
        gez(deger as Record<string, unknown>, [...yol, ad]);
      }
    }
  };
  gez(sozluk as Record<string, unknown>, []);
  return out;
}

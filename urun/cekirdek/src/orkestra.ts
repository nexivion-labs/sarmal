// ═══════════════════════════════════════════════════════════════════════════
// orkestra.ts — ⚡ PARALEL YÜRÜTÜCÜ (HALKA-ORK-A02 · ORK-3 üstüne)
//
//   Bağımsız Adımları EŞZAMANLI sürer: paralel-kümeler DAG motorunun topolojik
//   KATMANLARINDAN (Kahn seviyeleri · ZINCIR-A03) türetilir — aynı seviyedekiler
//   aralarında kenarsızdır, birlikte koşabilir; bağımlı Adım öncülü bitmeden
//   BAŞLAMAZ (DAG saygısı). Çekirdek döngü (donguÇalıştır) SENKRON ve SAF kalır;
//   paralellik BU orkestra katmanındadır (koşucu enjekte edilir — STR-3 deseni).
//   Lig uzlaşıları: allSettled (bir Adım çökerse küme çökmez) + eşzamanlılık
//   limiti (50+ Adım'da bellek basıncı sınırlanır) + ölçülebilir eşzamanlılık
//   (başlangıç/bitiş zaman damgaları döner — 'eşzamanlı' iddiası kanıtlanır).
// ═══════════════════════════════════════════════════════════════════════════

import type { Dag } from "./dag.ts";

/** Bir Adım koşusunun orkestra kaydı — zaman damgaları eşzamanlılık KANITIDIR. */
export interface KosuKaydi<T> {
  adımKod: string;
  seviye: number;              // Kahn seviyesi (0 = önkoşulsuz)
  baslangic: number;           // epoch ms — örtüşme kanıtı
  bitis: number;
  sonuç?: T;                   // koşucu değeri (başarı)
  hata?: string;               // koşucu fırlattıysa (kardeşler ETKİLENMEZ — allSettled)
}

export interface ParalelSecenek {
  /** aynı anda koşan Adım üst sınırı (lig: glm — bellek basıncı). Varsayılan 4. */
  esZamanLimit?: number;
}

/**
 * Verilen Adımları Kahn seviyelerine böler (yalnız SEÇİLEN kümenin iç kenarları
 * sayılır — dışarıdaki öncüller seviyeyi şişirmez; onların hazır olduğu çağıranın
 * sorumluluğudur). Saf — dag.ts oncekiler/sonrakiler türetmesi üstüne.
 */
export function paralelKumeler(dag: Dag, adimlar: readonly string[]): string[][] {
  const kume = new Set(adimlar);
  const seviye = new Map<string, number>();
  const hesapla = (kod: string, iz: Set<string>): number => {
    if (seviye.has(kod)) return seviye.get(kod)!;
    if (iz.has(kod)) return 0;   // döngü: dagTanilari zaten HATA verir — burada güvenli taban
    iz.add(kod);
    const icOnculler = (dag.dugumler.get(kod)?.oncekiler ?? []).filter((o) => kume.has(o));
    const s = icOnculler.length ? 1 + Math.max(...icOnculler.map((o) => hesapla(o, iz))) : 0;
    seviye.set(kod, s);
    return s;
  };
  for (const a of adimlar) hesapla(a, new Set());
  const enDerin = Math.max(0, ...adimlar.map((a) => seviye.get(a) ?? 0));
  const kumeler: string[][] = Array.from({ length: enDerin + 1 }, () => []);
  for (const a of adimlar) kumeler[seviye.get(a) ?? 0].push(a);
  return kumeler.filter((k) => k.length);
}

/** Eşzamanlılık limitli allSettled — havuz deseni (sıfır bağımlılık, STR-3.1). */
async function limitliKostur<T>(isler: Array<() => Promise<T>>, limit: number): Promise<void> {
  let sira = 0;
  const isci = async (): Promise<void> => {
    while (sira < isler.length) {
      const i = sira++;
      await isler[i]();   // iş kendi hatasını KosuKaydi'na gömer — işçi ölmez
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, isler.length)) }, isci));
}

/**
 * Paralel yürütme (HALKA-ORK-A02): seviye seviye ilerler — bir seviyenin TÜM
 * Adımları bitmeden sonraki seviye başlamaz (DAG saygısı); seviye İÇİ eşzamanlı
 * (limitli). Bir Adım çökerse kaydına `hata` yazılır, kardeşleri tamamlanır ve
 * SONRAKI seviyeler yine koşar (çağıran hatalı öncülün ardıllarını değerlendirir —
 * karar orkestranın değil ŞEF'in; burada mekanik toplayıcıyız).
 */
export async function paralelYurut<T>(
  dag: Dag,
  adimlar: readonly string[],
  kosucu: (adımKod: string) => Promise<T>,
  sec: ParalelSecenek = {},
): Promise<KosuKaydi<T>[]> {
  const limit = sec.esZamanLimit ?? 4;
  const kayitlar: KosuKaydi<T>[] = [];
  const kumeler = paralelKumeler(dag, adimlar);
  for (let s = 0; s < kumeler.length; s++) {
    const isler = kumeler[s].map((adımKod) => async (): Promise<void> => {
      const kayit: KosuKaydi<T> = { adımKod, seviye: s, baslangic: Date.now(), bitis: 0 };
      try {
        kayit.sonuç = await kosucu(adımKod);
      } catch (e) {
        kayit.hata = (e as Error).message;   // allSettled ruhu: kardeşler etkilenmez
      }
      kayit.bitis = Date.now();
      kayitlar.push(kayit);
    });
    await limitliKostur(isler, limit);   // seviye bariyeri: DAG saygısı
  }
  return kayitlar;
}

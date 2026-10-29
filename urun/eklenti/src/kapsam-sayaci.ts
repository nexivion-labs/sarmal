// ═══════════════════════════════════════════════════════════════════════════
// kapsam-sayaci.ts — 🔢 SAYININ KAPSAMI VE ACİL İŞ SAYISI (PNL-A08 · SAF)
//
//   Founder 2026-10-26 tarihinde panelin sayılarının bağlama göre büyük ölçüde
//   değiştiğini gözlemlemiştir: Sarmal projesinin dosyası açıkken rozette kırk
//   sekiz, çatıdayken yüz yirmi dört yazıyordu ve hiçbir yer sayının hangi
//   kapsama ait olduğunu söylemiyordu (HTR-PANEL-KAPSAM-SAYIMI). Bu modül
//   sayının kapsamını ve çatı kapsamındaki proje kırılımını taşır; metni
//   katalog yazar (yuzey-metinleri.ts), bu modül yalnız sayıları kurar.
//
//   DIŞ ROZET BİR ALARMDIR (Founder hükmü 2026-10-28 · YUZ-3.4). Yalnız acil olanı
//   sayar: kararı bugün verilebilecek onay kapıları, Dur bandındaki tanılar ve
//   ateşlemiş hatırlatıcılar. Uyuyan hatırlatıcı, Dikkat ve Bilgi sayılmaz;
//   rozet sıfırsa acil iş yoktur.
//
//   SAF: bu modül `vscode` İTHAL ETMEZ; nöbetler onu doğrudan koşturur. Sayı
//   ikinci kez tutulmaz: kırılım, sayıyı veren yüzeyin kendi kümesinden gelir.
// ═══════════════════════════════════════════════════════════════════════════

/** Bir sayının bir projeye düşen payı; çatı kapsamında ipucunda proje proje dökülür. */
export interface ProjePayi {
  readonly ad: string;
  readonly adet: number;
}

/**
 * Sayının kapsamı: odaktaki kökün adı ve türü. `proje` tek bir Proje köküdür; `cati` başka Proje
 * köklerini kapsayan çatıdır; `alan` odak kapalıyken ya da henüz bir kök seçilmemişken bütün çalışma
 * alanıdır. Çatı ve alan kapsamında sayı proje proje dökülür.
 */
export interface SayiKapsami {
  readonly ad: string;
  readonly tur: "proje" | "cati" | "alan";
}

/** Kapsamın sayısı proje proje dökülür mü? Tek projenin sayısı dökülmez. */
export function dokulur(k: SayiKapsami | undefined): boolean {
  return k !== undefined && k.tur !== "proje";
}

/** Acil işlerin üç parçası (YUZ-3.4 · Founder 2026-10-28). */
export interface AcilSayilar {
  /** Kararı bugün verilebilecek onay kapıları (Adımı geliştirmede ya da doğrulanmamış). */
  readonly onay: number;
  /** Dur bandındaki (HATA düzeyindeki) tanılar. */
  readonly dur: number;
  /** Ateşlemiş hatırlatıcılar: bağlandığı iş tamamlanmış ve kapatılmayı bekleyen hatırlatıcı. */
  readonly atesmis: number;
}

/** Dış rozetin değeri: üç acil parçanın toplamı; başka hiçbir sayı girmez. */
export function acilToplami(a: AcilSayilar): number {
  return a.onay + a.dur + a.atesmis;
}

const sirala = (a: ProjePayi, b: ProjePayi): number => b.adet - a.adet || a.ad.localeCompare(b.ad, "tr");

/** Her öğe bir kayıttır; kayıtlar proje adına göre sayılır. */
export function adaGoreSay(adlar: Iterable<string>): ProjePayi[] {
  const sayac = new Map<string, number>();
  for (const ad of adlar) sayac.set(ad, (sayac.get(ad) ?? 0) + 1);
  return [...sayac].map(([ad, adet]) => ({ ad, adet })).sort(sirala);
}

/**
 * Payları proje adına göre birleştirir ve toplar. Sıfır pay düşer; sıra çoktan aza, eşit sayıda
 * ada göredir. Toplam girdilerin toplamına eşittir (hiçbir pay kaybolmaz).
 */
export function paylariBirlestir(...listeler: readonly (readonly ProjePayi[])[]): ProjePayi[] {
  const sayac = new Map<string, number>();
  for (const liste of listeler) for (const p of liste) sayac.set(p.ad, (sayac.get(p.ad) ?? 0) + p.adet);
  return [...sayac].filter(([, adet]) => adet > 0).map(([ad, adet]) => ({ ad, adet })).sort(sirala);
}

/** Payların toplamı; nöbet onu gösterilen sayıyla karşılaştırır. */
export function payToplami(paylar: readonly ProjePayi[]): number {
  return paylar.reduce((t, p) => t + p.adet, 0);
}

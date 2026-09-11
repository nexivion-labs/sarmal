// ═══════════════════════════════════════════════════════════════════════════
// taze-kaynak.ts — 🔄 ÇAĞRI ANINDA MÜHÜR KARŞILAŞTIRMASI (BKM-MCP-A02)
//
//   MCP sunucusu uzun ömürlü bir süreçtir ve kanonik kaynakları süreç başında
//   belleğe alır. Kusur 2026-08-08 tarihinde ölçülerek gösterilmiştir:
//   sınıflama kaydındaki öncelik kümesi diskte küçük harfli dörtlüye geçtiği
//   hâlde çalışan sunucu eski büyük harfli üçlüyü bildirmeye devam etmiştir.
//   Tehlike sessizliğindedir: sunucuya soran ajan yanlış şemayı DOĞRU sanır ve
//   o şemaya göre yazdığı kayıt denetimden geçemez.
//
//   Seçilen yol (kontrolcü kararı · 2026-09-05) çağrı anında mühür
//   karşılaştırmasıdır: gözcü kurmaktan ucuzdur, çünkü hiçbir izleyici süreç
//   ya da olay kuyruğu gerektirmez; bayatlığı yalnız bildirmekten dürüsttür,
//   çünkü kullanıcıyı uyarmakla kalmaz, doğru cevabı verir.
//
//   MÜHÜR NEDİR: dosyanın değişiklik zamanı ile boyutu. İçerik özeti (SHA)
//   BİLİNÇLİ olarak kullanılmaz — özet almak dosyayı okumayı gerektirir ve
//   değişmeyen kaynakta ödenecek bedel tam da kaçınmak istediğimiz bedeldir.
//   `statSync` dosyayı okumaz, yalnız dizin girdisine bakar; ölçülen maliyeti
//   mikrosaniye ölçeğindedir ve Adımın "değişmeyen kaynakta ek maliyet
//   ölçülebilir değildir" ölçütü bu seçimle karşılanır.
//
//   SINIR (Adımın kendi sınırı): dosya izleme gözcüsü kurulmaz. Ayrıca bu
//   mekanizma VERİ bayatlığını çözer, KOD bayatlığını çözmez: sunucunun kendi
//   modülleri süreç başında yüklenir ve motorun gövdesi değiştiğinde süreç
//   yeniden başlatılmadıkça eski davranış sürer. Bu ayrım dürüstçe yazılıdır,
//   çünkü iki bayatlık aynı belirtiyi verir ve karıştırılırsa yanlış yerde
//   onarım aranır.
// ═══════════════════════════════════════════════════════════════════════════

import { statSync } from "node:fs";

/** Bir dosyanın ucuz mührü: değişiklik zamanı ile boyut. */
export interface Muhur {
  readonly mtimeMs: number;
  readonly boyut: number;
}

/** Dosya okunamıyorsa mühür tanımsızdır; çağıran son bilinen değeri korur. */
export function muhurAl(yol: string): Muhur | undefined {
  try {
    const s = statSync(yol);
    return { mtimeMs: s.mtimeMs, boyut: s.size };
  } catch {
    return undefined;
  }
}

export function muhurAyni(a: Muhur | undefined, b: Muhur | undefined): boolean {
  if (a === undefined || b === undefined) return a === b;
  return a.mtimeMs === b.mtimeMs && a.boyut === b.boyut;
}

/** Tazelenebilir bir kaynağın dışa açık yüzü. */
export interface TazeKaynak<T> {
  /** Güncel değer — mühür değiştiyse yeniden yüklenmiş hâli. */
  deger(): T;
  /** Son `deger()` çağrısı kaynağı yeniden yükledi mi? */
  sonCagridaTazelendi(): boolean;
  /** Kaç kez yeniden yüklendi (ölçüm ve nöbet için). */
  tazelemeSayisi(): number;
}

/**
 * Bir dosyaya bağlı değeri çağrı anında tazeler. Yükleyici YALNIZ mühür
 * değiştiğinde çağrılır; değişmeyen kaynakta yapılan iş tek bir `statSync`
 * çağrısıdır.
 */
export function tazeKaynak<T>(yol: string, yukle: (yol: string) => T): TazeKaynak<T> {
  let muhur = muhurAl(yol);
  let deger = yukle(yol);
  let tazelendi = false;
  let sayac = 0;
  return {
    deger(): T {
      const simdiki = muhurAl(yol);
      if (muhurAyni(muhur, simdiki)) {
        tazelendi = false;
        return deger;
      }
      // Yükleme başarısız olursa (yarım yazılmış dosya) ESKİ değer korunur:
      // bozuk bir kaynağa düşmektense bilinen son doğru şemayla cevap vermek
      // yeğdir ve bir sonraki çağrı yeniden dener.
      try {
        deger = yukle(yol);
        muhur = simdiki;
        tazelendi = true;
        sayac += 1;
      } catch {
        tazelendi = false;
      }
      return deger;
    },
    sonCagridaTazelendi: () => tazelendi,
    tazelemeSayisi: () => sayac,
  };
}

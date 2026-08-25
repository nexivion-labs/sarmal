// ═══════════════════════════════════════════════════════════════════════════
// deger-yaz.ts — 🔏 Quote-güvenli değer yazıcı (EKL-F9-A09 · kadro denetimi bulgusu)
//
//   durum/takdir değer ekleme-değiştirme TEK yardımcıdan geçer: tırnaklı/tırnaksız
//   mevcut değer otomatik tanınır (yarım tırnak BIRAKILMAZ — latent dosya-bozma
//   riski kapanır), yeni değer gerekiyorsa tırnaklanır (iç " → ' · satır kırığı → ·).
//   SAF modül — vscode importu YOK (node:test ile sınanır); WorkspaceEdit çağıranın
//   işi (yolharitasi.durumYaz · takdir). HALKA-SENK-A05 geri-yazımı da bu temel
//   üstüne kurulacak (lig uzlaşısı: aynı .sar'a yazım tek mekanizmadan).
// ═══════════════════════════════════════════════════════════════════════════

/** Çıplak (tırnaksız) yazılabilir mi? Türkçe harf/rakam/altçizgi/tire — boşluk·tırnak·virgül·parantez YOK. */
export function ciplakGuvenli(deger: string): boolean {
  return /^[\p{L}\p{N}_-]+$/u.test(deger);
}

/** Değeri .sar'a yazılacak biçime getirir: bare-güvenliyse çıplak; değilse iç tırnaklar
 *  '→ dönüştürülüp "..." içine alınır. Satır kırıkları ' · ' olur (tek-satır garantisi). */
export function degerBicimle(deger: string): string {
  const tek = deger.replace(/\n+/g, " · ").trim();
  if (ciplakGuvenli(tek)) return tek;
  return `"${tek.replace(/"/g, "'")}"`;
}

/**
 * Satırdaki MEVCUT değeri (tırnaklı ya da tırnaksız) yeni değerle değiştirir.
 *   sutun        — 1-tabanlı değer başlangıcı (AST `deger.sutun`; tırnağın KENDİSİNİ
 *                  ya da içeriği işaret edebilir — ikisi de tolere edilir).
 *   metinUzunluk — tırnaksız içerik uzunluğu (AST `deger.metin.length`).
 * Tırnak sınırları otomatik genişletilir (yarım tırnak kalmaz); kapanış tırnağı
 * bulunamazsa ya da konum satıra sığmıyorsa null döner → ÇAĞIRAN DOKUNMAZ (fail-safe).
 */
export function satirdaDegerDegistir(
  satirMetni: string,
  sutun: number,
  metinUzunluk: number,
  yeniDeger: string,
): string | null {
  let bas = sutun - 1;
  if (bas < 0 || bas >= satirMetni.length) return null;
  let son: number;

  if (satirMetni[bas] === '"') {
    // sutun tırnağın kendisinde → kapanış tırnağına kadar kapsa
    const kapa = satirMetni.indexOf('"', bas + 1);
    if (kapa < 0) return null;                       // kapanmamış tırnak — dokunma
    son = kapa + 1;
  } else if (bas > 0 && satirMetni[bas - 1] === '"') {
    // sutun içerikte, solunda açılış tırnağı var → iki tırnağı da kapsa
    const kapa = satirMetni.indexOf('"', bas);
    if (kapa < 0) return null;
    bas--;
    son = kapa + 1;
  } else {
    // çıplak değer
    son = bas + metinUzunluk;
    if (son > satirMetni.length) return null;        // uzunluk satıra sığmıyor — dokunma
  }

  return satirMetni.slice(0, bas) + degerBicimle(yeniDeger) + satirMetni.slice(son);
}

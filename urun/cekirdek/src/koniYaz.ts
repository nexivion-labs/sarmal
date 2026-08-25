// ═══════════════════════════════════════════════════════════════════════════
// koniYaz.ts — ✍️ runtime→plan geri-yazımı (STR-4 · HALKA-SENK-A05)
//
//   Bir ŞEF koşusu bitince kararı Adım'ın .sar'ına KALICI yazar: `durum:`
//   (mühür→ tamamlandı|bloklu) + `koşu: Koşum(...)` kaydı (kosumYaz). Hedefli
//   STRING-SPLICE — AST yeniden-yazımı YOK (yorumlar/biçim korunur, STR-4).
//   Quote-güvenli zemin: deger-yaz (EKL-F9-A09). Her adım FAIL-SAFE: konum
//   bayat / koşu çok-satırlı / re-parse kırık → DOSYAYA DOKUNULMAZ (sebep döner).
//   Yalnız --yaz bayrağıyla çağrılır (çekirdek varsayılan salt-okuma; STR-3
//   Spec≠Runtime — tek-yönlü besleme, denetle sözleşmesi bozulmaz).
// ═══════════════════════════════════════════════════════════════════════════

import { readFileSync, writeFileSync, mkdirSync, rmdirSync } from "node:fs";
import { belirtecle } from "./belirtec.ts";
import { ayristir } from "./ayristirici.ts";
import type { Dugum, Param } from "./sozdizim.ts";
import { satirdaDegerDegistir } from "./deger-yaz.ts";
import { kosumYaz } from "./dongu.ts";
import type { DonguSonuç } from "./dongu.ts";
import { gecisSinifla, yasakGecisMesaji, type DurumGecisleri } from "./durum.ts";   // TUR-2: yaz-anında RED

/** Mühür → plan durumu (STR-4 · YAS-4.2): VERIFIED→tamamlandı · COMPLETED→doğrulanmamış
 *  (iş teslim, bağımsız kanıt yok — plan yüzeyi dürüst konuşur) · BLOCKED→bloklu.
 *  Kanıtlı terfi (doğrulanmamış→tamamlandı) YALNIZ bu yoldan gelir: VERIFIED mührü
 *  kanıt-ekseni turu gereği zaten koşum-sicili kanıtı taşır. */
export function muhurDurum(mühür: DonguSonuç["mühür"]): "tamamlandı" | "doğrulanmamış" | "bloklu" {
  return mühür === "BLOCKED" ? "bloklu" : mühür === "VERIFIED" ? "tamamlandı" : "doğrulanmamış";
}

// ── YAZMA KİLİDİ (SENK-A05 · lig uzlaşısı: TEK-YAZAR) ────────────────────────
//    Aynı .sar'a eşzamanlı yazım (CLI koşusu ∥ eklenti durum-yayını IZLE-A02)
//    SERİLEŞTİRİLİR: mkdir atomikliği kilittir — dizin varsa başka yazar aktif.
//    Bu, .sar-yazımının TEK kilit mekanizmasıdır; IZLE-A02 de buradan geçer.

/** Senkron bekleme (busy-wait yok — Atomics.wait gerçek uyku). */
function bekle(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * Dosya-yazma kilidini al: başarıda BIRAKICI fonksiyon döner, ~2sn içinde
 * alınamazsa null (çağıran fail-safe davranır — yazmaz, sebep raporlar).
 */
export function yazmaKilidiAl(dosyaYolu: string): (() => void) | null {
  const kilit = dosyaYolu + ".sarmal-kilit";
  for (let deneme = 0; deneme < 40; deneme++) {   // 40 × 50ms ≈ 2sn
    try {
      mkdirSync(kilit);
      return () => { try { rmdirSync(kilit); } catch { /* zaten bırakılmış */ } };
    } catch { bekle(50); }
  }
  return null;
}

export interface GeriYazSonuc {
  yazildi: boolean;
  sebep?: string;    // yazılamadıysa neden (fail-safe görünür — sessiz düşme yok)
}

interface AdimKonum { dugum: Dugum; durumP?: Param; kosuP?: Param }

/** Kaynakta `kod: adimKod` taşıyan Adım'ı ve durum/koşu parametrelerini bulur (saf). */
function adimBul(kaynak: string, adimKod: string): AdimKonum | null {
  const program = ayristir(belirtecle(kaynak));
  let bulunan: AdimKonum | null = null;
  const gez = (d: Dugum): void => {
    if (bulunan) return;
    if (d.tur === "widget" && d.ad === "Adım") {
      const kod = d.parametreler.find((p) => p.ad === "kod")?.deger.metin;
      if (kod === adimKod) {
        const tum = [...d.parametreler, ...d.ozellikler];
        bulunan = {
          dugum: d,
          durumP: tum.find((p) => p.ad === "durum"),
          kosuP: tum.find((p) => p.ad === "koşu"),
        };
        return;
      }
    }
    for (const c of d.cocuklar) gez(c);
  };
  for (const b of program.bildirimler) gez(b);
  return bulunan;
}

/** Satırda `bas`tan başlayan `(`'nin AYNI satırdaki dengeli kapanışını bulur (-1 = yok). */
function parenKapat(satir: string, bas: number): number {
  let derinlik = 0;
  for (let i = bas; i < satir.length; i++) {
    if (satir[i] === "(") derinlik++;
    else if (satir[i] === ")" && --derinlik === 0) return i;
  }
  return -1;
}

/**
 * Koşu sonucunu Adım'ın .sar dosyasına geri yazar: `durum:` güncellenir/eklenir +
 * `koşu: Koşum(...)` kaydı değiştirilir/eklenir (son koşu kazanır — tek kayıt).
 * Her aşama arasında TAZE parse (konum kayması imkânsız); sonda re-parse guard +
 * davranışsal doğrulama — geçemezse dosya YAZILMAZ.
 */
export function adimGeriYaz(
  dosyaYolu: string,
  adimKod: string,
  sonuç: DonguSonuç,
  ek?: { tarih?: string; model?: string },
): GeriYazSonuc {
  // ── ⓪ YAZMA KİLİDİ (SENK-A05): oku-değiştir-yaz bütünü tek-yazar korumasında ──
  const birak = yazmaKilidiAl(dosyaYolu);
  if (!birak) return { yazildi: false, sebep: "yazma kilidi alınamadı — başka yazar aktif (2sn bekledi, fail-safe: dokunulmadı)" };
  try {
    return kilitAltindaGeriYaz(dosyaYolu, adimKod, sonuç, ek);
  } finally {
    birak();
  }
}

function kilitAltindaGeriYaz(
  dosyaYolu: string,
  adimKod: string,
  sonuç: DonguSonuç,
  ek?: { tarih?: string; model?: string },
): GeriYazSonuc {
  let kaynak: string;
  try { kaynak = readFileSync(dosyaYolu, "utf8"); }
  catch (e) { return { yazildi: false, sebep: `dosya okunamadı: ${(e as Error).message}` }; }

  const yeniDurum = muhurDurum(sonuç.mühür);
  const parca = kosumYaz(sonuç, ek);

  // ── ① koşu kaydı: varsa DEĞİŞTİR (son koşu kazanır), yoksa "(" ardına EKLE ──
  try {
    const bul = adimBul(kaynak, adimKod);
    if (!bul) return { yazildi: false, sebep: `'${adimKod}' kodlu Adım dosyada yok` };
    const satirlar = kaynak.split("\n");
    if (bul.kosuP) {
      const s = bul.kosuP.satir - 1;
      const satir = satirlar[s];
      const adBas = bul.kosuP.sutun - 1;
      const ac = satir.indexOf("(", adBas);
      const kapa = ac < 0 ? -1 : parenKapat(satir, ac);
      if (kapa < 0) return { yazildi: false, sebep: "mevcut koşu kaydı tek satırda kapanmıyor — dokunulmadı (fail-safe)" };
      satirlar[s] = satir.slice(0, adBas) + parca + satir.slice(kapa + 1);
    } else {
      const s = bul.dugum.satir - 1;
      const ac = satirlar[s].indexOf("(");
      if (ac < 0) return { yazildi: false, sebep: "Adım açılış parantezi satırında değil — dokunulmadı" };
      satirlar[s] = satirlar[s].slice(0, ac + 1) + ` ${parca},` + satirlar[s].slice(ac + 1);
    }
    kaynak = satirlar.join("\n");
  } catch (e) { return { yazildi: false, sebep: `parse: ${(e as Error).message}` }; }

  // ── ② durum: TAZE parse ile güncelle/ekle (① konumları kaydırmış olabilir) ──
  try {
    const bul = adimBul(kaynak, adimKod);
    if (!bul) return { yazildi: false, sebep: "koşu yazımı Adım'ı bozdu — geri alındı (yazılmadı)" };
    const satirlar = kaynak.split("\n");
    if (bul.durumP) {
      const s = bul.durumP.deger.satir - 1;
      const yeni = satirdaDegerDegistir(
        satirlar[s], bul.durumP.deger.sutun, (bul.durumP.deger.metin ?? "").length, yeniDurum);
      if (yeni === null) return { yazildi: false, sebep: "durum konumu bayat — dokunulmadı (fail-safe)" };
      satirlar[s] = yeni;
    } else {
      const s = bul.dugum.satir - 1;
      const ac = satirlar[s].indexOf("(");
      satirlar[s] = satirlar[s].slice(0, ac + 1) + ` durum: ${yeniDurum},` + satirlar[s].slice(ac + 1);
    }
    kaynak = satirlar.join("\n");
  } catch (e) { return { yazildi: false, sebep: `re-parse (koşu sonrası): ${(e as Error).message} — yazılmadı` }; }

  // ── ③ re-parse guard + DAVRANIŞSAL doğrulama (VARLIK≠DOĞRULUK) — sonra yaz ──
  try {
    const dogrulama = adimBul(kaynak, adimKod);
    if (dogrulama?.durumP?.deger.metin !== yeniDurum || !dogrulama.kosuP) {
      return { yazildi: false, sebep: "guard: yazım sonucu doğrulanamadı — dosyaya yazılmadı" };
    }
  } catch (e) { return { yazildi: false, sebep: `guard: yazım .sar'ı bozuyordu — yazılmadı (${(e as Error).message})` }; }

  writeFileSync(dosyaYolu, kaynak);
  return { yazildi: true };
}

/**
 * Canlı durum yayını (HALKA-IZLE-A02 · saf-olmayan kabuk yardımcısı): Adım'ın
 * yalnız `durum:` alanını kilit altında yazar — koşu BAŞLARKEN 'geliştirmede',
 * panel FileSystemWatcher'ı satırı ANLIK yansıtır. Koşu SONU durumunu
 * adimGeriYaz yazar (tamamlandı/bloklu — geri-alınabilirlik oradan).
 * AYNI kilit mekanizması (yazmaKilidiAl) — SENK-A05 ile TEK-YAZAR garantisi.
 */
export function adimDurumYaz(dosyaYolu: string, adimKod: string, durum: string, gecisler?: DurumGecisleri): GeriYazSonuc {
  const birak = yazmaKilidiAl(dosyaYolu);
  if (!birak) return { yazildi: false, sebep: "yazma kilidi alınamadı — başka yazar aktif (fail-safe)" };
  try {
    let kaynak: string;
    try { kaynak = readFileSync(dosyaYolu, "utf8"); }
    catch (e) { return { yazildi: false, sebep: `dosya okunamadı: ${(e as Error).message}` }; }
    const bul = adimBul(kaynak, adimKod);
    if (!bul) return { yazildi: false, sebep: `'${adimKod}' kodlu Adım dosyada yok` };
    // ── TUR-2 DURUM MAKİNESİ (Founder kilidi): yasak geçiş YAZ-ANINDA reddedilir —
    //    bloklu→tamamlandı üç yazıcının hiçbirinden geçemez (MCP bu kapıdan geçer).
    const eskiDurum = bul.durumP?.deger.metin;
    if (gecisSinifla(eskiDurum, durum, gecisler) === "yasak") {
      return { yazildi: false, sebep: yasakGecisMesaji(eskiDurum!, durum, adimKod) };
    }
    const satirlar = kaynak.split("\n");
    if (bul.durumP) {
      const s = bul.durumP.deger.satir - 1;
      const yeni = satirdaDegerDegistir(
        satirlar[s], bul.durumP.deger.sutun, (bul.durumP.deger.metin ?? "").length, durum);
      if (yeni === null) return { yazildi: false, sebep: "durum konumu bayat — dokunulmadı (fail-safe)" };
      satirlar[s] = yeni;
    } else {
      const s = bul.dugum.satir - 1;
      const ac = satirlar[s].indexOf("(");
      if (ac < 0) return { yazildi: false, sebep: "Adım açılış parantezi satırında değil — dokunulmadı" };
      satirlar[s] = satirlar[s].slice(0, ac + 1) + ` durum: ${durum},` + satirlar[s].slice(ac + 1);
    }
    const yeniKaynak = satirlar.join("\n");
    // re-parse guard: yazım .sar'ı bozuyorsa DOSYAYA DOKUNULMAZ
    try {
      const dogrulama = adimBul(yeniKaynak, adimKod);
      if (dogrulama?.durumP?.deger.metin !== durum && dogrulama !== null) {
        if ((dogrulama?.durumP?.deger.metin ?? "") !== durum) {
          return { yazildi: false, sebep: "guard: durum yazımı doğrulanamadı — yazılmadı" };
        }
      }
      if (!dogrulama) return { yazildi: false, sebep: "guard: yazım Adım'ı bozdu — yazılmadı" };
    } catch (e) { return { yazildi: false, sebep: `guard: yazım .sar'ı bozuyordu — yazılmadı (${(e as Error).message})` }; }
    writeFileSync(dosyaYolu, yeniKaynak);
    return { yazildi: true };
  } finally {
    birak();
  }
}

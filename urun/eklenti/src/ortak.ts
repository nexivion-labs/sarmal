// ═══════════════════════════════════════════════════════════════════════════
// ortak.ts — Eklenti geneli paylaşılan yardımcılar
//   SNF-0'ı belgeden yukarı yürüyüp bulur (önbellekli). Hem diagnostics hem
//   tamamlama bunu kullanır.
// ═══════════════════════════════════════════════════════════════════════════

import * as vscode from "vscode";
import * as fs from "node:fs";
import * as path from "node:path";
import { siniflamaYukle, siniflamaOrtuMerge, siniflamaNormalize } from "../../cekirdek/src/siniflama.ts";
import type { Siniflama, SiniflamaOrtu } from "../../cekirdek/src/siniflama.ts";
import { GOMULU_KAYIT, GOMULU_REHBER } from "./gomulu-kanon.ts";
import { varlikDosyasiBul } from "./kanon-kesif.ts";
import { tabanKanonaDusuldu, tabanKanonBulundu } from "./taban-kanon.ts";

/** U4/YUZ-3: GÖMÜLÜ kanon — proje kanonu (oz/siniflama/*.json) bulunamazsa (dış proje,
 *  _Sarmal erişilemez) buna düşülür → HER projede renk/dekor/hover çalışır. esbuild bunu
 *  dist'e bundle'lar. Kaynak hâlâ oz/siniflama; bu build'de dökülen kopyadır (tek-kaynak).
 *  doğuş-rehberi turu: gömülü kanon da normalize edilir — `*varsayılan` işaretleri çözülmeden
 *  enum bekçisine girerse dış projede sahte geçersiz-enum doğar (siniflamaYukle ikizi). */
const GOMULU_SNF = siniflamaNormalize(GOMULU_KAYIT as unknown as Siniflama);

/** Bir widget tipinin eğitici açıklaması (rehber.json). */
export interface RehberGiris {
  tanim: string;
  yeri?: string;
  gorev?: string;
  ajan?: string;
  insan?: string;
}

const snfOnbellek = new Map<string, { mtime: number; snf: Siniflama }>();
const jsonOnbellek = new Map<string, { mtime: number; veri: unknown }>();

/** Drift rozet renkleri — YEDEK (kanon ulaşılamazsa); asıl kaynak kayit.json. */
const ROZET_YEDEK = { hata: "#EF4444", uyari: "#FF8C42", terfi: "#FFD60A", bilgi: "#4D9FFF", bilgiZemin: "#4D9FFF26", kalp: "#FF4D4D" };

/**
 * Drift rozet renklerini KANONDAN okur (KRR-MUT Sütun D — yildiz/takdir'deki
 * elle kopyalar tek kaynağa indi). Belge gerekmez: çalışma alanı köklerinden
 * oz/siniflama/kayit.json aranır; bulunamazsa yedek sabitler (eklenti tek başına
 * .sar-dışı bir klasörde açılırsa bile rozetler çizilir).
 */
export function rozetRenkleri(): typeof ROZET_YEDEK {
  // EKL-F6-A04: kayıt SABİT bir klasör adında değil, İLAN EDİLMİŞ varlık
  // kökünde aranır. Eski hâli `_Sarmal` adını kaynağa yazıyordu ve başka adla
  // açılan bir depoda rozet renkleri sessizce yedek sabitlere düşüyordu.
  const koklar = (vscode.workspace.workspaceFolders ?? []).map((k) => k.uri.fsPath);
  for (const kok of koklar) {
    const aday = varlikDosyasiBul(kok, path.join("oz", "siniflama", "kayit.json"), [kok]);
    if (!aday) continue;
    try {
      const mtime = fs.statSync(aday).mtimeMs;
      const o = snfOnbellek.get(aday);
      const snf = o && o.mtime === mtime ? o.snf : siniflamaYukle(aday);
      if (!o || o.mtime !== mtime) snfOnbellek.set(aday, { mtime, snf });
      const dr = (snf as { renkPaleti?: { driftRozetleri?: Record<string, string> } }).renkPaleti?.driftRozetleri;
      if (dr) return { ...ROZET_YEDEK, ...dr };
    } catch { /* sıradaki köke geç */ }
  }
  // U4/YUZ-3: proje kanonu yok → gömülü kanonun rozetleri (yedek sabitler değil)
  const gd = (GOMULU_KAYIT as { renkPaleti?: { driftRozetleri?: Record<string, string> } }).renkPaleti?.driftRozetleri;
  return gd ? { ...ROZET_YEDEK, ...gd } : ROZET_YEDEK;
}

/** Belgeden yukarı yürüyüp oz/siniflama/kayit.json'u bulur (önbellekli); varsa
 *  çalışma-alanı örtüsüyle (oz/siniflama/ortu.json) enum'ları ADDITIVE birleştirir. */
/** Bu iki işlevin belgeden istediği tek şey KİMLİKTİR; imza `TextDocument`
 *  yerine o en az yüze bağlanır ki tur yolu diskten kurulan kayıtla da
 *  çalışsın (PRF-A06 · turun `openTextDocument` bağımlılığı söküldü). */
type KimlikliBelge = { readonly uri: vscode.Uri };

export function snfBul(doc: KimlikliBelge): Siniflama | undefined {
  const yol = yukariAra(doc, path.join("oz", "siniflama", "kayit.json"));
  let taban: Siniflama;
  if (!yol) {
    // EKL-F6-A04: düşüş SESSİZ DEĞİLDİR, fakat işaretin koşulu 2026-09-02'de
    // daraltılmıştır. O hükmün gerekçesi şudur: kullanıcı, gördüğü şeyin
    // PROJESİNİN KENDİ tip sistemi olduğunu sanmasın. Gömülü kanon eksik bir
    // kanon değildir, Sarmal'ın kanonunun ta kendisidir; projenin kendi katkısı
    // ise örtüde (oz/siniflama/ortu.json) yaşar. Dolayısıyla iki hâl ayrılır.
    // Örtü YOKSA proje kendi tipini hiç eklememiştir ve gömülü kanon tam
    // karşılığıdır: işaret gürültüdür ve basılmaz. Örtü VARSA fakat taban
    // bulunamıyorsa gerçek kusur budur, çünkü örtü tabana eklenerek yüklenir ve
    // tabansız örtü sessizce düşer; kullanıcı kendi ilan ettiği tipleri
    // göremezken sebebini hiçbir yerden okuyamaz. Ölçülen bedel: kanon araması
    // yukarı yürüdüğü için Sarmal deposunun kendi kökü dışında çalışan HERKES
    // eski koşulda uyarı alıyordu ve doğan her yeni proje ilk gününde bu
    // işaretle karşılanıyordu, oysa hiçbirinin tip sistemi eksik değildi.
    if (yukariAra(doc, path.join("oz", "siniflama", "ortu.json"), false)) tabanKanonaDusuldu(doc.uri.fsPath);
    else tabanKanonBulundu();
    taban = GOMULU_SNF;   // U4/YUZ-3: dış projede gömülü kanona düş (kör kalma)
  } else {
    tabanKanonBulundu();
    try {
      const mtime = fs.statSync(yol).mtimeMs;
      const o = snfOnbellek.get(yol);
      if (o && o.mtime === mtime) {
        taban = o.snf;
      } else {
        taban = siniflamaYukle(yol);
        snfOnbellek.set(yol, { mtime, snf: taban });
      }
    } catch {
      return undefined;
    }
  }
  // Çalışma-alanı örtüsü: bu varlığın oz/siniflama/ortu.json'u varsa
  // enum'lar (Beceri.yığın vb.) additive genişler → Founder'ın gördüğü canlı kırmızı
  // (geçersiz-enum) gider. KARDEŞ GERİ-DÜŞÜŞ YOK (false): STR-3 kırmızı çizgisi —
  // _KapaliUrun örtüsü _Sarmal görünümüne sızmamalı. Örtüsüz varlık = taban (doğru).
  const örtüYol = yukariAra(doc, path.join("oz", "siniflama", "ortu.json"), false);
  if (!örtüYol) return taban;
  const örtü = jsonYukle(örtüYol) as SiniflamaOrtu | undefined;
  return örtü ? siniflamaOrtuMerge(taban, örtü) : taban;
}

/**
 * Tasarım sözlüğünü (bilgi/tasarim_sozlugu/kayit.json · 272 kavram) belgeden yukarı
 * yürüyerek bulur (TAS-C01 · İFADE PALETİ kaynağı). Bulunamazsa undefined — dış
 * projede palet sessizce kapanır (zorlama yok; palet öneridir, kafes değil).
 */
export function sozlukBul(doc: vscode.TextDocument): unknown | undefined {
  const yol = yukariAra(doc, path.join("ogreti", "bilgi", "tasarim_sozlugu", "kayit.json"));
  return yol ? jsonYukle(yol) : undefined;
}

/** rehber.json'daki eğitici açıklamaları döndürür (tip adına göre). */
export function rehberBul(doc: vscode.TextDocument): Record<string, RehberGiris> | undefined {
  const yol = yukariAra(doc, path.join("oz", "siniflama", "rehber.json"));
  if (!yol) return (GOMULU_REHBER as { girisler?: Record<string, RehberGiris> }).girisler;  // U4/YUZ-3: gömülü rehber
  const veri = jsonYukle(yol) as { girisler?: Record<string, RehberGiris> } | undefined;
  return veri?.girisler;
}

/** Hover/tamamlama rozeti: SNF tip kanonu › aile simgesi (yalnız baloncukta —
 *  satır-içi dekorasyon KALDIRILDI, Founder 2026-07-02: "ekran kirleniyor"). */
export function simgeSec(snf: Siniflama, tipAd: string, aile: string): string | undefined {
  return snf.tipSimgeleri?.[tipAd] ?? snf.aileSimgeleri?.[aile];
}

function yukariAra(doc: KimlikliBelge, goreli: string, kardesGeriDusus = true): string | undefined {
  const dizin = path.dirname(doc.uri.fsPath);
  // Örtü (ortu.json) varlığa özeldir: kardeş taramadan ÖNCE dur — OS örtüsü
  // _Sarmal görünümüne sızmasın (STR-3). Yalnız taban kanon kardeşten ödünç alınır.
  // Kardeş taraması İLANDAN yürür (EKL-F6-A04): varlık kökünü klasör adı değil
  // `*_anadizin.sar` bildirir, dolayısıyla ad değişse de kanon bulunur.
  const koklar = kardesGeriDusus
    ? (vscode.workspace.workspaceFolders ?? []).map((k) => k.uri.fsPath)
    : [];
  return varlikDosyasiBul(dizin, goreli, koklar);
}

function jsonYukle(yol: string): unknown {
  try {
    const mtime = fs.statSync(yol).mtimeMs;
    const o = jsonOnbellek.get(yol);
    if (o && o.mtime === mtime) return o.veri;
    const veri = JSON.parse(fs.readFileSync(yol, "utf8"));
    jsonOnbellek.set(yol, { mtime, veri });
    return veri;
  } catch {
    return undefined;
  }
}

// ── 🎨 SATIR SİMGESİ KÖPRÜSÜ (VIT-KIMLIK-A05) ────────────────────────────────
//
//   Dört panelin kayıt ve grup satırları geometrik ailenin satır simgelerini
//   TEK çizelgeden (simge-cizelgesi.ts) okur; codicon kimliğine geri düşüş
//   YOKTUR. TreeItem.iconPath currentColor çözmediği için burada üretilmiş
//   anlam×tema varyantının iki-tema Uri çifti kurulur; renk değeri bu modülde
//   de yaşamaz (YUZ-4.1 — renk yalnız arac/simge-uret.mjs çizelgesindedir).

import { satirSvgVaryanti, type AnlamRengi, type SatirSimgesi } from "./simge-cizelgesi.ts";

/** Bir satır simgesinin iki-tema iconPath çifti. Eklenti kökü bilinmiyorsa
 *  (saf birim sınaması, köksüz kurulum) satır SİMGESİZ kalır — uydurma
 *  yapılmaz, hazır ikona geri düşülmez (Onaylar panelinin teknoloji-simgesi
 *  dersiyle aynı dürüstlük). */
export function satirIkonu(
  kok: vscode.Uri | undefined, ad: SatirSimgesi, anlam: AnlamRengi = "duz",
): { light: vscode.Uri; dark: vscode.Uri } | undefined {
  if (!kok) return undefined;
  return {
    light: vscode.Uri.joinPath(kok, satirSvgVaryanti(ad, anlam, "acik")),
    dark:  vscode.Uri.joinPath(kok, satirSvgVaryanti(ad, anlam, "koyu")),
  };
}

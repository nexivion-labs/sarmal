// ═══════════════════════════════════════════════════════════════════════════
// sablon.ts — 📐 ŞABLON KÜTÜPHANESİ (tek kaynak · SABLON-KUTUPHANE-TOPARLAMA)
//
//   Kanonik `.sar` şablonları `ogreti/sablon/` altında GERÇEK dosyalar olarak
//   yaşar (insan gözle açar, düzenler, dogfood). `başla` üreteci — hem MCP hem
//   CLI — buradan okur; şablon metni İKİ yerde tutulmaz (YUZ-1.2 tek-kaynak).
//   Metadata (başlık + bekçi notu) burada; ŞABLON METNİ dosyada. Dağınıklık
//   biter: dil öğrenen tek yere bakar (Founder 2026-07-10 "hepsi dağınık").
// ═══════════════════════════════════════════════════════════════════════════

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SABLON_KOK = fileURLToPath(new URL("../../../ogreti/sablon/", import.meta.url));

/** Bir şablonun kimliği: dosya + başlık + doğrulayıcının o tipte yakaladığı bekçi. */
interface SablonKimlik {
  dosya: string;      // sablon/ altındaki dosya adı
  baslik: string;     // tek satır tanıtım
  bekci: string;      // yazınca `denetle`nin uyaracağı kapılar
}

// Doğuş sırasına göre (MIM-4 omurgası): kök → sözleşme → yüzey/arkayüz → etmen/mekanizma.
const SABLONLAR: Record<string, SablonKimlik> = {
  "proje": { dosya: "proje.sar",
    baslik: "🌱 PROJE DOĞUŞU — <varlık>_anadizin.sar (KÖK). TEK uygulama. Önce teknoloji, sonra eksenli plan.",
    bekci: "ana-yok (giriş dosyası şart) · konisiz-adım (geliştirmede Adım koni taşımalı). ⚖️ İleride çok-app/ortak-auth olacaksa → çalışmaalanı seç (bahçe)." },
  "çalışmaalanı": { dosya: "calisma_alani.sar",
    baslik: "🏡 ÇALIŞMAALANI (BAHÇE) DOĞUŞU — çok uygulamalı, tek kimlik tabanlı kurulum. Her Uygulama kendi Teknoloji'sini taşır; ortak tabana ve kimliğe çağır ile bağlanır.",
    bekci: "ana-yok · rafsız-anadizin · anadizin-plan-karışması. Uzun-vadeli şekil (bahçe) kapsayıcıyı belirler — bugünkü tek app onun İÇİNE Uygulama olarak girer." },
  "blok": { dosya: "blok.sar",
    baslik: "🪵 BLOK DOĞUŞU — plan gövdesi: Blok(iş) → Katman(teknoloji, Takım bağlı) → Adım; zaman gerekiyorsa Faz üstten sarar.",
    bekci: "konisiz-adım — durum:geliştirmede Adım koni taşımalı (görev·kabul·bağımlı)." },
  "adım": { dosya: "adim.sar",
    baslik: "🎯 ADIM DOĞUŞU — KONİ-dolu (yalın Adım = kör drift; çalgıcı tahmin eder).",
    bekci: "konisiz-adım — durum:geliştirmede'ye alınca koni ŞART (görev/kabul/üretir/bağımlı/referans)." },
  "sözleşme": { dosya: "sozlesme.sar",
    baslik: "📜 SÖZLEŞME DOĞUŞU — KAVUŞUM NOKTASI (contract-first). Ekran+Uç ondan türer.",
    bekci: "sözleşmesiz-uç — her Uç bir sözleşmeye bağlanmalı. Sözleşme İLK yaz." },
  "arkayüz": { dosya: "arkayuz.sar",
    baslik: "🔌 ARKAYÜZ DOĞUŞU — backend ayağı: Uç sözleşmeyi UYGULAR + üretim-yeri beyan.",
    bekci: "sözleşmesiz-uç (Uç→sözleşme) · üretim-yeri (dosya: kodun düşeceği yer — artefakt yerini kendisi beyan eder)." },
  "ekran": { dosya: "ekran.sar",
    baslik: "🖼️ EKRAN DOĞUŞU — SÖZLEŞME ÖNCE gelir; Ekran ile Uç o sözleşmeden türer.",
    bekci: "öksüz-düğme · kavuşumsuz-ekran · sözleşmesiz-uç. Sözleşme İLK yaz (contract-first)." },
  "beceri": { dosya: "beceri.sar",
    baslik: "🎓 BECERİ DOĞUŞU — dersten terfi eden yapabilirlik (Yetenek + yığın-Becerisi çifti).",
    bekci: "eksik-alan — Beceri 9 zorunlu: kod·sağlar·yığın·ne·neZaman·kurallar·örnek·antiDesen·uygular. ≤300 satır; Adım 'kullanır:' ile bağlar." },
  "etmen": { dosya: "etmen.sar",
    baslik: "🤖 ETMEN DOĞUŞU — 7 zorunlu alan (kimlik+yetenek+izole hafıza+anayasa).",
    bekci: "eksik-alan — Etmen 7 zorunlu: kod·tür·uzmanlık·yetki·bellek·ne·uygular. tür∈{apex,yönetici,uzman}." },
  "mekanizma": { dosya: "mekanizma.sar",
    baslik: "🔩 MEKANİZMA DOĞUŞU — kesişen altyapı BİR KEZ ilan edilir; Adım REFERANS alır, İÇERMEZ.",
    bekci: "faz serbest etiket · modüller arası sıra bağımlı-DAG · Adım mekanizmayı İÇERİRSE tek-ilan kuralı çiğnenir." },
  "döngü": { dosya: "dongu.sar",
    baslik: "🔁 DÖNGÜ DOĞUŞU — tekrarlayan işin evidir: tetik ile döner, durunca ya da turLimiti ile DURUR.",
    bekci: "eksik-alan — durunca ve/veya turLimiti ŞART (çıkışsız döngü yazılamaz); koşucu ilerlemesiz-döngüyü erken durdurur; her tur trace'e yazılır." },
};

/** Şablon türleri (doğuş sırasında). */
export function sablonTurleri(): string[] {
  return Object.keys(SABLONLAR);
}

/**
 * 🏛️ MİMARİ DİYALOG (E1-A06 · Founder 2026-07-13 · EVRE-0 öğretimi): `başla`, plan-yazan
 * ajana yazmadan ÖNCE doğru sırayı ÖĞRETİR — kurulu ŞEF'in kod-ajanına yaptığı
 * beceri-enjeksiyonun EVRE-1 (plan) karşılığı. Üç mimari soru + ALTIN KURAL (anadizin=mimari).
 * Tek kaynak: hem MCP başla hem CLI başla buradan okur (YUZ-1.2). IDA dogfood dersinin özü.
 */
export function mimariDiyalog(): string {
  return [
    "🏛️ MİMARİ DİYALOG (EVRE-0 · yazmadan ÖNCE, bir kez — KAPSAYICI doğar):",
    "   Mimar SENSİN; makine ne yazarsan ONU takip eder. ÖNCE KAPSAYICIYI seç, SONRA içini doldur.",
    "",
    "   ⓪ 🧭 KAPSAYICI TİPİ — bu TEK uygulama mı, çok uygulamalı BAHÇE mi? (varlık ekseni ·",
    "      kanon: siniflama { tip: \"ÇalışmaAlanı\" | \"Uygulama\" | \"Proje\" }):",
    "        • 🌱 Proje       = tek app, tek ağaç (küçük iş) — auth kendi içinde.",
    "        • 🌳 Uygulama    = bir app; bir ÇalışmaAlanı İÇİNDE yaşar (bahçedeki ağaç).",
    "        • 🏡 ÇalışmaAlanı = BAHÇE: tek taban · TEK-AUTH · ortak yasa; İÇİNDE çok Uygulama paralel",
    "          (her app kendi Teknoloji'sini taşır — FARKLI stack serbest; hepsi ortak taban/kimlik'e çağır).",
    "      ⚖️ KARAR KURALI: \"ileride BAŞKA app/teknoloji gelecek mi? ortak auth?\" → EVET ise ÇalışmaAlanı",
    "      seç, bugünkü app'i onun İÇİNE Uygulama koy. ⚠️ UZUN-VADELİ ŞEKİL kapsayıcıyı belirler —",
    "      bugünkü tek teslimat DEĞİL (IDA dersi 2026-07-14: tek-app hedefi tüm mimariyi ÇÖKERTMESİN).",
    "      Şablon: başla { tür: \"proje\" | \"çalışmaalanı\" }. Emin değilsen siniflama'ya SOR (uydurma).",
    "",
    "   Kapsayıcıyı seçtikten SONRA:",
    "   ① 🌀 FAZLAR neler? — büyüme dönemleri; zaman eksenini kurar.",
    "   ② 🔑 TEK-AUTH tabanı nerede? — çok-uygulamada kimlik TEK noktada (taban/kimlik · SZL-AUTH);",
    "      tüm uygulamalar `çağır` ile bağlanır (Bahçe deseni motorda birinci-sınıf: ÇalışmaAlanı).",
    "   ③ 🌿 TEKNOLOJİ → KLASÖR mimarisi? — teknoloji hangi klasörleri doğurur (Kitaplık/Raf + yol:)?",
    "",
    "⚠️ ALTIN KURAL: Anadizin MİMARİ çizer (Kitaplık/Raf/yol = klasör ağacı). Plan",
    "   (Faz→Blok→Katman→Adım) anadizine GÖMÜLMEZ — plan/ altında AYRI .sar'da yaşar",
    "   (bekçi: anadizin-plan-karışması). Blok = DİKEY DİLİM: ön+arka+güvenlik BİRLİKTE,",
    "   silo değil; Blok bunları KAVUŞTURUR (bekçi: silo-blok · kavuşumsuz-paralellik).",
  ].join("\n");
}

/**
 * Bir tür için başlık + şablon metni + bekçi notu döner (tek kaynak: sablon/*.sar).
 * Bilinmeyen tür → undefined. Dosya okunamazsa fırlatmaz, açıklayıcı metin döner.
 */
export function sablonMetni(tur: string): { baslik: string; sablon: string; bekci: string } | undefined {
  const k = SABLONLAR[tur.toLocaleLowerCase("tr")];
  if (!k) return undefined;
  let sablon: string;
  try {
    sablon = readFileSync(SABLON_KOK + k.dosya, "utf8").trimEnd();
  } catch (e) {
    sablon = `// ✖ Şablon dosyası okunamadı (${k.dosya}): ${(e as Error).message}`;
  }
  return { baslik: k.baslik, sablon, bekci: k.bekci };
}

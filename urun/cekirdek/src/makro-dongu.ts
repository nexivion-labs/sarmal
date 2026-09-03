// ═══════════════════════════════════════════════════════════════════════════
// makro-dongu.ts — 🔁 MAKRO-DÖNGÜ KOŞUCUSU (ORK-3.3 · DNG-KOS)
//
//   Döngü widget'ının runtime'ı: tetik değerlendir → tur at (koşar zinciri;
//   Adım turu ŞEF üret→denetle→yama mikro-döngüsünü SARAR — sef-dongu bir
//   turun İÇİDİR, üreten≠denetleyen aynen korunur) → durunca/turLimiti →
//   devam/dur. Her tur .sarmal/trace JSONL'e yazılır (ORK-3.3 ④: kayıtsız döngü
//   kalmadı — panel Koşum yüzü aynı klasörü dinler).
//
//   ORK-3.3 ② çift emniyet: çıkışsız döngü ŞEMADA ölür (durunca|turLimiti
//   en-az-biri); burada da İLERLEMESİZ-DÖNGÜ bekçisi yaşar — ardışık iki tur
//   ÖZDEŞ sonuçla biterse koşucu erken durur ve insana söyler (aynı duvara
//   yüz kez vuran ajan tuzağı). Döngüyü insan değil SİSTEM durdurur (ORK-3.3).
//
//   TETİK ANLAMLARI (v1):
//     el    → hemen döner; durunca/turLimiti'ye kadar.
//     koşul → durunca sağlanana KADAR döner; baştan sağlıysa SIFIR tur.
//     olay  → --izle: .sar değişince tek tur (geciktiricili).
//     zaman → --izle: verilen aralıkta tek tur.
//   TUR-KARNESİ dürüst alt-küme: şema (dogrula) + DAG tanıları — tam kapı
//   yine `sarmal denetle` (kopya-mantık değil, çekirdek aynı fonksiyonlar).
// ═══════════════════════════════════════════════════════════════════════════

import { appendFileSync, mkdirSync, watch } from "node:fs";
import { join } from "node:path";
import { dogrula } from "./dogrulayici.ts";
import { siniflamaYukle } from "./siniflama.ts";
import { programlariYukle, DURUNCA_KALIPLARI } from "./denetci.ts";
import { dagKur, dagTanilari, durumTutarlilikTanilari, type Dag } from "./dag.ts";
import { sefDonguKomutu, type EtmenÇağır } from "./dongu.ts";
import { fileURLToPath } from "node:url";
import type { Dugum } from "./sozdizim.ts";
import type { Program } from "./sozdizim.ts";

const SNF_YOL = fileURLToPath(new URL("../../../oz/siniflama/kayit.json", import.meta.url));

export interface DonguTanim {
  kod: string;
  tetik: "el" | "koşul" | "olay" | "zaman";
  kosar: string[];
  durunca?: string;
  turLimiti?: number;
}

export interface TurSonucu {
  tur: number;
  kosulan: Array<{ kod: string; cikis: number }>;
  hata: number;
  uyari: number;
  karar: "devam" | "durunca" | "turLimiti" | "ilerlemesiz-döngü";
}

export interface KosumSonucu {
  cikis: number;                 // 0 = sağlıklı durdu · 5 = ilerlemesiz (insan baksın) · 4 = tanım hatası
  turlar: TurSonucu[];
  gerekce: string;
}

/** Programlardan Döngü tanımını çıkarır (bulunamazsa undefined). SAF. */
export function donguBul(programlar: ReadonlyMap<string, Program>, kod: string): DonguTanim | undefined {
  let bulunan: DonguTanim | undefined;
  const gez = (n: Dugum): void => {
    if (n.tur === "widget" && n.ad === "Döngü") {
      const p = (ad: string) => [...n.parametreler, ...n.ozellikler].find((x) => x.ad === ad)?.deger;
      if (p("kod")?.metin === kod) {
        // A05 (bug-avı B4): skaler koşar = tek elemanlı liste — denetçiyle birebir semantik.
        const kd = p("koşar");
        const kosar = kd?.tur === "liste"
          ? (kd.ogeler ?? []).map((o) => o.metin ?? "").filter(Boolean)
          : kd?.metin ? [kd.metin] : [];
        bulunan = {
          kod,
          tetik: (p("tetik")?.metin as DonguTanim["tetik"]) ?? "el",
          kosar,
          durunca: p("durunca")?.metin,
          turLimiti: p("turLimiti")?.metin ? Number(p("turLimiti")!.metin) : undefined,
        };
      }
    }
    n.cocuklar.forEach(gez);
  };
  for (const [, prg] of programlar) prg.bildirimler.forEach(gez);
  return bulunan;
}

/** Tur-karnesi: şema + DAG çekirdek tanılarının hata/uyarı sayımı (dürüst alt-küme). */
export function turKarnesi(dizin: string): { hata: number; uyari: number; dag: Dag } {
  const { programlar, muaflar } = programlariYukle(dizin);
  const snf = siniflamaYukle(SNF_YOL);
  let hata = 0, uyari = 0;
  for (const [etiket, prg] of programlar) {
    if (muaflar.has(etiket)) continue;
    for (const t of dogrula(prg, snf)) {
      if (t.duzey === "hata") hata++;
      else if (t.duzey === "uyarı") uyari++;
    }
  }
  const dag = dagKur(programlar);
  for (const { tani } of [...dagTanilari(dag), ...durumTutarlilikTanilari(dag)]) {
    if (tani.duzey === "hata") hata++;
    else if (tani.duzey === "uyarı") uyari++;
  }
  return { hata, uyari, dag };
}

/** durunca v1 sözlüğünü değerlendirir — kalıplar denetçiyle TEK kaynak
 *  (DURUNCA_KALIPLARI); tanınmayan ifade `undefined` (asla durdurmaz —
 *  denetim zaten durunca-sözlüğü bilgisi düşürdü). SAF. */
export function duruncaDegerlendir(
  ifade: string | undefined,
  karne: { hata: number; uyari: number },
  dag: Dag,
): boolean | undefined {
  if (!ifade) return undefined;
  const m = ifade.trim();
  if (!DURUNCA_KALIPLARI.some((r) => r.test(m))) return undefined;
  const karneEs = m.match(/^karne\.(hata|uyari|uyarı)\s*(==|<=|<)\s*(\d+)$/u);
  if (karneEs) {
    const sol = karneEs[1] === "hata" ? karne.hata : karne.uyari;
    const sag = Number(karneEs[3]);
    return karneEs[2] === "==" ? sol === sag : karneEs[2] === "<=" ? sol <= sag : sol < sag;
  }
  const durumEs = m.match(/^durum\(\s*([A-ZÇĞİÖŞÜ0-9_-]+(?:\.[0-9]+){0,2})\s*\)\s*==\s*(tamamlandı|geliştirmede|beklemede)$/u);
  if (durumEs) return dag.dugumler.get(durumEs[1])?.durum === durumEs[2];
  return undefined;
}

/** Tek tur: koşar zincirini işlet (Adım → ŞEF mikro-döngüsü; diğer tipler atlanır+bilinir). */
function turAt(dizin: string, tanim: DonguTanim, tur: number, etmen: EtmenÇağır, dag: Dag): TurSonucu {
  const kosulan: TurSonucu["kosulan"] = [];
  for (const hedef of tanim.kosar) {
    const dugum = dag.dugumler.get(hedef);
    if (dugum?.tip === "Adım") {
      kosulan.push({ kod: hedef, cikis: sefDonguKomutu(dizin, hedef, etmen) });
    } else {
      console.log(`↷ ${hedef} atlandı (${dugum ? dugum.tip + " — şimdilik yalnız Adım koşar" : "tanımsız"}).`);
      kosulan.push({ kod: hedef, cikis: -1 });
    }
  }
  const k = turKarnesi(dizin);
  return { tur, kosulan, hata: k.hata, uyari: k.uyari, karar: "devam" };
}

/** Trace satırı (ORK-3.3 ④) — panel Koşum yüzünün dinlediği klasöre. */
function izYaz(dizin: string, dosya: string, satir: object): void {
  const klasor = join(dizin, ".sarmal", "trace");
  mkdirSync(klasor, { recursive: true });
  appendFileSync(join(klasor, dosya), JSON.stringify(satir) + "\n");
}

/** Makro-döngü koşumu (el + koşul tetiği — anında; olay/zaman için bkz. donguIzle). */
export function donguKos(dizin: string, kod: string, etmen: EtmenÇağır): KosumSonucu {
  const { programlar } = programlariYukle(dizin);
  const tanim = donguBul(programlar, kod);
  if (!tanim) return { cikis: 4, turlar: [], gerekce: `'${kod}' kodlu Döngü bulunamadı.` };

  const izDosya = `dongu-${kod}-${new Date().toISOString().replace(/[:.]/g, "-")}.jsonl`;
  const turlar: TurSonucu[] = [];
  let onceki: string | undefined;

  for (;;) {
    // koşul tetiği: TUR ÖNCESİ bak — baştan sağlıysa SIFIR tur (deterministik).
    const on = turKarnesi(dizin);
    if (tanim.tetik === "koşul" && duruncaDegerlendir(tanim.durunca, on, on.dag) === true) {
      return { cikis: 0, turlar, gerekce: turlar.length ? "durunca sağlandı." : "durunca baştan sağlı — sıfır tur." };
    }
    if (tanim.turLimiti !== undefined && turlar.length >= tanim.turLimiti) {
      return { cikis: 0, turlar, gerekce: `turLimiti (${tanim.turLimiti}) doldu.` };
    }

    const sonuc = turAt(dizin, tanim, turlar.length + 1, etmen, on.dag);
    turlar.push(sonuc);

    const son = turKarnesi(dizin);
    if (duruncaDegerlendir(tanim.durunca, son, son.dag) === true) sonuc.karar = "durunca";

    // İLERLEMESİZ-DÖNGÜ bekçisi: özdeş iki tur → erken dur, insan baksın (ORK-3.3 ②).
    const ozet = JSON.stringify({ k: sonuc.kosulan, h: sonuc.hata, u: sonuc.uyari });
    if (sonuc.karar === "devam" && ozet === onceki) sonuc.karar = "ilerlemesiz-döngü";
    onceki = ozet;

    if (tanim.turLimiti !== undefined && turlar.length >= tanim.turLimiti && sonuc.karar === "devam") {
      sonuc.karar = "turLimiti";
    }
    izYaz(dizin, izDosya, { zaman: new Date().toISOString(), döngü: kod, ...sonuc });

    if (sonuc.karar === "durunca") return { cikis: 0, turlar, gerekce: "durunca sağlandı." };
    if (sonuc.karar === "turLimiti") return { cikis: 0, turlar, gerekce: `turLimiti (${tanim.turLimiti}) doldu.` };
    if (sonuc.karar === "ilerlemesiz-döngü") {
      return { cikis: 5, turlar, gerekce: "ardışık iki tur ÖZDEŞ bitti — ilerleme yok, insan bakmalı." };
    }
    if (tanim.tetik === "el" && !tanim.durunca && tanim.turLimiti === undefined) {
      // şema buna izin vermez (enAzBiri) ama koşucu fail-safe: tek tur at, dur.
      return { cikis: 0, turlar, gerekce: "çıkış beyanı yok — fail-safe tek tur." };
    }
  }
}

/** --izle kipi (döngü-rayı turu): olay → .sar değişiminde tur; zaman → aralıkta tur.
 *  durunca/turLimiti/ilerlemesiz bekçileri her tetiklenişte aynen işler. */
export function donguIzle(
  dizin: string, kod: string, etmen: EtmenÇağır,
  secenek: { aralikMs?: number } = {},
): Promise<KosumSonucu> {
  const { programlar } = programlariYukle(dizin);
  const tanim = donguBul(programlar, kod);
  if (!tanim) return Promise.resolve({ cikis: 4, turlar: [], gerekce: `'${kod}' kodlu Döngü bulunamadı.` });

  const izDosya = `dongu-${kod}-${new Date().toISOString().replace(/[:.]/g, "-")}.jsonl`;
  const turlar: TurSonucu[] = [];
  let onceki: string | undefined;
  let mesgul = false;

  return new Promise((coz) => {
    const bitir = (cikis: number, gerekce: string): void => {
      if (saat) clearInterval(saat);
      izleyici?.close();
      coz({ cikis, turlar, gerekce });
    };
    const tekTur = (): void => {
      if (mesgul) return;   // geciktirici: olay seli üst üste tur bindirmesin
      mesgul = true;
      try {
        const on = turKarnesi(dizin);
        if (duruncaDegerlendir(tanim.durunca, on, on.dag) === true) return bitir(0, "durunca sağlandı.");
        if (tanim.turLimiti !== undefined && turlar.length >= tanim.turLimiti) {
          return bitir(0, `turLimiti (${tanim.turLimiti}) doldu — izle kipi kapandı.`);
        }
        const sonuc = turAt(dizin, tanim, turlar.length + 1, etmen, on.dag);
        turlar.push(sonuc);
        const ozet = JSON.stringify({ k: sonuc.kosulan, h: sonuc.hata, u: sonuc.uyari });
        if (ozet === onceki) sonuc.karar = "ilerlemesiz-döngü";
        onceki = ozet;
        izYaz(dizin, izDosya, { zaman: new Date().toISOString(), döngü: kod, ...sonuc });
        if (sonuc.karar === "ilerlemesiz-döngü") return bitir(5, "ardışık iki tur özdeş — ilerleme yok.");
        if (tanim.turLimiti !== undefined && turlar.length >= tanim.turLimiti) {
          return bitir(0, `turLimiti (${tanim.turLimiti}) doldu — izle kipi kapandı.`);
        }
      } finally { mesgul = false; }
    };
    const saat = tanim.tetik === "zaman"
      ? setInterval(tekTur, Math.max(250, secenek.aralikMs ?? 60_000))
      : undefined;
    const izleyici = tanim.tetik === "olay"
      ? watch(dizin, { recursive: true }, (_e, ad) => { if (ad?.toString().endsWith(".sar")) setTimeout(tekTur, 350); })
      : undefined;
    if (!saat && !izleyici) {
      // el/koşul tetiği --izle istemez: anında koşuma düş (kullanım kolaylığı).
      const s = donguKos(dizin, kod, etmen);
      coz(s);
    } else {
      console.log(`👁️ izle: ${kod} (${tanim.tetik}) — Ctrl+C ile çık; durunca/turLimiti kendiliğinden kapatır.`);
    }
  });
}

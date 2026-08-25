// ═══════════════════════════════════════════════════════════════════════════
// kopru/iz.ts — 📜 TRACE KATMANI (HALKA-IZLE-A01 · TAM ŞEFFAFLIK)
//
//   EtmenÇağır'ı saran İNCE izleme-sarmalayıcı (kopru deseni — çekirdek boru
//   hattına dokunmaz, EtmenÇağır prizine takılır): her üretici/denetçi/güvenlik
//   çağrısı .sarmal/trace/<koşu>.jsonl'e HAM kaydedilir — ŞEF'in yazdığı ham
//   prompt, LLM'in verdiği ham yanıt, model, ajan imzası, rol, token, sıra.
//   HİÇBİR ALAN KISALTILMAZ/GİZLENMEZ (denetlenebilirlik).
//   Büyüme sınırı (lig uzlaşısı): koşu-başına dosya + boyut eşiğinde rotasyon
//   (panel 10K satırda tıkanmaz — dosya-2, dosya-3… diye devam eder).
// ═══════════════════════════════════════════════════════════════════════════

import { appendFileSync, mkdirSync, statSync } from "node:fs";
import { dirname } from "node:path";
import type { EtmenÇağır, EtmenÇağrı } from "../dongu.ts";

/** Bir trace satırı (JSONL — SZL-ETMEN-CIKTI'nin izleme ikizi). */
export interface IzSatiri {
  zaman: string;
  adım: string;
  rol: string;
  /** ajan imzası (HALKA-ORK-A01 kadro çözümü — hangi ajan çalışıyor). */
  ajanİmza?: { kod: string; ad: string };
  model?: string;
  /** devreye giren Beceri kodları (HALKA-ORK-A04 — ⚠️ öneki: çözülmedi). */
  beceriler?: string[];
  hamPrompt: string;
  hamYanıt: unknown;
  tokenGiriş?: number;
  tokenÇıkış?: number;
  sıra: number;
}

export interface IzSecenek {
  /** trace dosya yolu (koşu-başına — çağıran benzersiz ad verir). */
  dosya: string;
  /** model adı (NVIDIA_MODEL / demo-stub) — her satıra iner. */
  model?: string;
  /** rotasyon eşiği (bayt) — aşılınca dosya-2, dosya-3… (varsayılan 5 MB). */
  esikBayt?: number;
}

const VARSAYILAN_ESIK = 5 * 1024 * 1024;

/**
 * EtmenÇağır'ı izleme-sarmalayıcıyla döndürür: davranış BİREBİR (çıktı aynen
 * geçer), yan etki yalnız JSONL append. Yazım hatası koşuyu KIRMAZ (izleme
 * gözlemcidir, aktör değil) — stderr'e düşer.
 */
export function izliEtmenYap(ic: EtmenÇağır, sec: IzSecenek): EtmenÇağır {
  let sıra = 0;
  let parça = 1;
  const hedef = (): string =>
    parça === 1 ? sec.dosya : sec.dosya.replace(/\.jsonl$/, "") + `-${parça}.jsonl`;

  return (çağrı: EtmenÇağrı) => {
    const yanıt = ic(çağrı);
    sıra++;
    const satir: IzSatiri = {
      zaman: new Date().toISOString(),
      adım: çağrı.adımKod,
      rol: çağrı.rol,
      ajanİmza: çağrı.etmen,
      beceriler: çağrı.beceriler,
      model: sec.model,
      hamPrompt: çağrı.prompt,                       // HAM — kısaltmasız
      hamYanıt: yanıt,                               // HAM — kısaltmasız
      tokenGiriş: typeof yanıt.tokenGiriş === "number" ? yanıt.tokenGiriş : undefined,
      tokenÇıkış: typeof yanıt.tokenÇıkış === "number" ? yanıt.tokenÇıkış : undefined,
      sıra,
    };
    try {
      mkdirSync(dirname(sec.dosya), { recursive: true });
      // rotasyon: mevcut parça eşiği aştıysa sonraki parçaya geç (koşu içi)
      try {
        if (statSync(hedef()).size > (sec.esikBayt ?? VARSAYILAN_ESIK)) parça++;
      } catch { /* dosya henüz yok — ilk satır */ }
      appendFileSync(hedef(), JSON.stringify(satir) + "\n", "utf8");
    } catch (e) {
      console.error(`📜 iz: trace yazılamadı (koşu sürüyor): ${(e as Error).message}`);
    }
    return yanıt;
  };
}

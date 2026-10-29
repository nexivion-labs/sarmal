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
import { dirname, join } from "node:path";
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

// ── HST-MTR-A04 · YÜRÜTÜCÜ İZİ ───────────────────────────────────────────────
//   Yukarıdaki sarmalayıcı yalnız motorun kendi döngüsü bir model çağırdığında
//   yazar. İşi dış bir yürütücü (MCP istemcisi, ör. Claude Code) yaptığında da
//   panel Adımın altında bir satır görsün diye MCP sunucusu iki temas noktasında
//   (sef ve durum-guncelle) bu hafif satırı aynı klasöre ekler. Satır yalnız
//   çağrının kendisidir: ham istem ve yanıt toplanmaz (Adım sınırı); dosya yolu,
//   kullanıcı adı ya da makine bilgisi de yazılmaz. İz kendiliğinden açılmaz:
//   açık hâlde `sef` çalışma alanına yazar ve aracın salt okunur beyanı bu yüzden
//   yalnız iz kapalıyken doğrudur (EKL-F6-A03 nöbeti beyanı davranışla ölçer).

/** Yürütücü teması satırı (JSONL). `adım` panelin gruplama anahtarıdır ve IzSatiri ile aynı protokol alanıdır. */
export interface YurutucuIziSatiri {
  zaman: string;
  adım: string;
  rol: typeof YURUTUCU_ROLU;
  /** Temas eden MCP aracı. */
  arac: "sef" | "durum-guncelle";
  /** durum-guncelle: Adıma yazılan yeni durum. */
  durum?: string;
  /** MCP istemcisinin kendini tanıttığı yazılım adı (initialize · clientInfo.name). */
  yurutucu?: string;
}

/** Yürütücü satırının rolü — panel satırı bu değerle tanır. */
export const YURUTUCU_ROLU = "yurutucu";

/** İzi açan ortam değişkeni (MCP sunucusunun ayarında, ör. `.mcp.json` içindeki `env`). */
export const YURUTUCU_IZI_ORTAM_DEGISKENI = "SARMAL_YURUTUCU_IZI";
const ACIK_DEGERLER: ReadonlySet<string> = new Set(["1", "true", "on", "acik", "açık", "açik"]);

/** İz yalnız ortam değişkeni açık bir değer taşıdığında yazılır; boş, `0` ya da `kapali` kapalıdır. */
export function yurutucuIziAcik(ortam: Readonly<Record<string, string | undefined>> = process.env): boolean {
  return ACIK_DEGERLER.has((ortam[YURUTUCU_IZI_ORTAM_DEGISKENI] ?? "").trim().toLowerCase());
}

/** İstemcinin yazılım adı yalnız sade bir ürün adıysa kayda girer; yol, e-posta ya da uzun metin düşer. */
export function yurutucuAdi(ham: unknown): string | undefined {
  return typeof ham === "string" && /^[A-Za-z0-9][A-Za-z0-9 ._-]{0,39}$/.test(ham) ? ham : undefined;
}

/** Sunucu oturumunun iz dosyası adı (bir kez kurulur; panel `*.jsonl` dinler). */
export function yurutucuIziDosyaAdi(baslangic = new Date()): string {
  return `yurutucu-${baslangic.toISOString().replace(/[:.]/g, "-")}.jsonl`;
}

/** Satırı `<dizin>/.sarmal/trace/<dosya>` dosyasına ekler. İzleme gözlemcidir: yazım hatası çağrıyı kırmaz. */
export function yurutucuIziYaz(dizin: string, dosya: string, satir: YurutucuIziSatiri): void {
  try {
    const klasor = join(dizin, ".sarmal", "trace");
    mkdirSync(klasor, { recursive: true });
    appendFileSync(join(klasor, dosya), JSON.stringify(satir) + "\n", "utf8");
  } catch (e) {
    console.error(`📜 iz: yürütücü izi yazılamadı (çağrı sürüyor): ${(e as Error).message}`);
  }
}

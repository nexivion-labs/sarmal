// ═══════════════════════════════════════════════════════════════════════════
// toolround.ts — 🔄 GERÇEK TOOL-ROUND
//
//   Bu akış, ŞEF runtime çalışmasının tool-round kaleminden doğmuştur. O kalemin
//   plan kaydı bugün bu deponun dışında, laboratuvar arşivindeki eski omurga
//   planında yaşar. Arşiv gövdesi CANLI bir `.sar` ilanı olmadığı için taşıdığı
//   Adım kodu motorun çözebileceği bir tanım vermez; bu yüzden köken burada kodla
//   değil anlatıyla anılır.
//
//   Etmen yanıtı bir ARAÇ-TALEBİ (SZL-ARAÇ-TALEP) içerirse döngü bu talebi
//   gateway'den geçirir (fail-closed — izinsiz talep RED, döngü DEVAM), izinli
//   talebi enjekte AraçÇağır ile çalıştırır ve SZL-ARAÇ-SONUÇ'u (güvenilmez=
//   untrusted kalkanıyla) Etmen'in bir sonraki turuna girdi yapar. Tur limiti
//   (max araç-turu) sonsuz döngüyü imkânsız kılar. STR-3.1: tur MEKANİĞİ + allowlist
//   AÇIK; hangi aracı seçmeli/bütçe/routing GİZLİ (AraçÇağır arkasında).
//   STR-3: AraçÇağır dışarıdan enjekte edilir ve bu dosya hiçbir çağırıcıyı kendisi
//   bağlamaz. Bugün gerçekten bağlanan çağırıcılar kopru/nvidia.ts gövdesinde yaşar:
//   kanıt komutu sefAracKanitKomutu iki senaryonun ikisinde de kanitOkuyucuYap'ı
//   bağlar, üretim yolu ise okuyucuyu, yazıcıyı ve test koşucusunu araç KOD'una göre
//   dağıtan üretimAraçÇağırYap'ı bağlar. Sınama dosyaları kendi çağırıcılarını verir.
// ═══════════════════════════════════════════════════════════════════════════

import { spawnSync } from "node:child_process";
import type { Mod, İzinBeyan, İzinMatrisi } from "./gateway.ts";
import { araçİzinDenetle, BOŞ_MATRIS } from "./gateway.ts";

/** SZL-ARAÇ-TALEP — Etmen'in araç isteği (etmen·araç·mod·argüman·gerekçe). */
export interface AraçTalep {
  etmen: string;
  araç: string;
  mod: Mod;
  argüman?: unknown;
  gerekçe?: string;
}

/** SZL-ARAÇ-SONUÇ — gateway/araç dönüşü. güvenilmez: untrusted kalkanı (asla kod-olarak-değerlendirme). */
export interface AraçSonuç {
  durum: "izinli" | "red" | "hata";
  araç: string;
  mod: Mod;
  sonuç?: unknown;
  güvenilmez: true;   // SABİT: araç çıktısı DAİMA güvenilmez (prompt-injection kalkanı)
  sebep?: string;
}

/** TAKILABİLİR araç yürütücü (STR-3 · A28 alt-MCP proxy bunu implemente eder). */
export type AraçÇağır = (talep: AraçTalep) => AraçSonuç;

/** Bir Etmen çıktısındaki araç-taleplerini ayıklar (biçim toleranslı, saf). */
export function araçTalepleriÇöz(çıktı: Record<string, unknown>): AraçTalep[] {
  const ham = çıktı.araçTalepleri ?? çıktı.toolCalls;
  if (!Array.isArray(ham)) return [];
  return ham.map((t) => {
    const o = t as Record<string, unknown>;
    return {
      etmen: typeof o.etmen === "string" ? o.etmen : "",
      araç: typeof o.araç === "string" ? o.araç : (typeof o.arac === "string" ? o.arac : ""),
      mod: (typeof o.mod === "string" ? o.mod : "oku") as Mod,
      argüman: o.argüman ?? o.args,
      gerekçe: typeof o.gerekçe === "string" ? o.gerekçe : undefined,
    };
  }).filter((t) => t.araç);
}

export interface ToolRoundSecenek {
  beyanlar: readonly İzinBeyan[];
  matris?: İzinMatrisi;
  araçÇağır: AraçÇağır;
  maxTur?: number;   // varsayılan 5 — sonsuz araç-döngüsü imkânsız
}

/**
 * Tek araç-talebini gateway'den geçirip yürütür (saf-değil: araçÇağır yan-etkili).
 * İzinsiz → durum:red (döngü kırılmaz). Araç fırlatırsa → durum:hata (döngü kırılmaz).
 */
export function araçTuru(talep: AraçTalep, sec: ToolRoundSecenek): AraçSonuç {
  const karar = araçİzinDenetle(talep.etmen, talep.araç, talep.mod, sec.beyanlar, sec.matris ?? BOŞ_MATRIS);
  if (!karar.izinli) {
    return { durum: "red", araç: talep.araç, mod: talep.mod, güvenilmez: true, sebep: karar.sebep };
  }
  try {
    const sonuç = sec.araçÇağır(talep);
    // araçÇağır kendi AraçSonuç'unu döndürür; güvenilmez daima SABİT true (kalkan).
    return { ...sonuç, araç: talep.araç, mod: talep.mod, güvenilmez: true };
  } catch (e) {
    return { durum: "hata", araç: talep.araç, mod: talep.mod, güvenilmez: true, sebep: (e as Error).message };
  }
}

/**
 * Tam tool-round akışı: bir Etmen çıktısındaki tüm araç-taleplerini
 * (tur limiti içinde) gateway'den geçirip yürütür; SZL-ARAÇ-SONUÇ listesini döner.
 * Tur limiti aşılırsa kalan talepler durum:hata "tur-limiti" ile işaretlenir
 * (eskalasyon sinyali — döngü sonsuza gitmez).
 */
export function toolRoundKostur(çıktı: Record<string, unknown>, sec: ToolRoundSecenek): AraçSonuç[] {
  const max = sec.maxTur ?? 5;
  const talepler = araçTalepleriÇöz(çıktı);
  const sonuçlar: AraçSonuç[] = [];
  for (let i = 0; i < talepler.length; i++) {
    if (i >= max) {
      sonuçlar.push({ durum: "hata", araç: talepler[i].araç, mod: talepler[i].mod, güvenilmez: true, sebep: `tur-limiti (${max}) aşıldı — eskalasyon` });
      continue;
    }
    sonuçlar.push(araçTuru(talepler[i], sec));
  }
  return sonuçlar;
}

// ── Alt-MCP vekili (bir AraçÇağır implementasyonu) ───────────────────────────
//    HAZIR AMA BAĞLI DEĞİL: bu vekilin src/ ve sinama/ altında bugün hiçbir çağıranı
//    yoktur; kullanılabilir bir implementasyon olarak durur ve onu bağlayacak yolu
//    bekler (ölçüm 2026-08-08).
//    İzinli talebi bir alt-MCP sunucusuna (stdio JSON-RPC) senkron iletir. STR-3.1:
//    Node yerel child_process.spawnSync — sıfır npm. Sunucu-yaşam-döngüsü tek
//    seferliktir: her talep için sunucu başlatılır, sorulur ve kapatılır; kalıcı
//    bağlantı canlı tool-round turuna bırakılmıştır.
//    Alt-MCP hatası döngüyü KIRMAZ — durum:hata AraçSonuç döner. Hangi sunucuların
//    bağlanacağı KULLANICI yapılandırması (GİZLİ katalog değil — açık liste).

export interface AltMcpAyar {
  komut: string;         // alt-MCP çalıştırılabiliri (ör. "node")
  argümanlar?: string[]; // (ör. ["alt-sunucu.js"])
  aracEşleme?: Record<string, string>;   // Sarmal araç KOD → MCP tool adı (yoksa birebir)
  zamanAşımıMs?: number; // varsayılan 30sn
}

/** Alt-MCP proxy AraçÇağır'ı üretir (STR-3.1 senkron spawn — curl/nvidia deseninin ikizi). */
export function altMcpProxyYap(ayar: AltMcpAyar): AraçÇağır {
  return (talep: AraçTalep): AraçSonuç => {
    const toolAdı = ayar.aracEşleme?.[talep.araç] ?? talep.araç;
    // MCP tools/call isteği (tek satır JSON-RPC; sunucu tek yanıtla döner).
    const istek = JSON.stringify({
      jsonrpc: "2.0", id: 1, method: "tools/call",
      params: { name: toolAdı, arguments: talep.argüman ?? {} },
    }) + "\n";
    try {
      const p = spawnSync(ayar.komut, ayar.argümanlar ?? [], {
        input: istek, encoding: "utf8", timeout: ayar.zamanAşımıMs ?? 30_000,
      });
      if (p.status !== 0 || p.error) {
        return { durum: "hata", araç: talep.araç, mod: talep.mod, güvenilmez: true,
          sebep: `alt-MCP hata (${ayar.komut}): ${p.error?.message ?? `çıkış ${p.status}`}` };
      }
      // Son JSON satırını yanıt kabul et (sunucu birden çok bildirim basabilir).
      const satır = p.stdout.trim().split("\n").filter(Boolean).pop() ?? "";
      const yanıt = JSON.parse(satır) as { result?: unknown; error?: { message?: string } };
      if (yanıt.error) {
        return { durum: "hata", araç: talep.araç, mod: talep.mod, güvenilmez: true, sebep: yanıt.error.message ?? "alt-MCP tool hatası" };
      }
      return { durum: "izinli", araç: talep.araç, mod: talep.mod, sonuç: yanıt.result, güvenilmez: true };
    } catch (e) {
      return { durum: "hata", araç: talep.araç, mod: talep.mod, güvenilmez: true, sebep: `alt-MCP proxy: ${(e as Error).message}` };
    }
  };
}

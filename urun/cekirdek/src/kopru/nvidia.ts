// ═══════════════════════════════════════════════════════════════════════════
// kopru/nvidia.ts — GERÇEK Etmen köprüsü (STR-3 · EtmenÇağır prizi)
//
//   ŞEF↔Etmen sınırının GERÇEK dolgusu: demo-stub yerine NVIDIA API Catalog'a
//   (integrate.api.nvidia.com · OpenAI-uyumlu) canlı çağrı. Çekirdek SAF kalır —
//   bu köprü boru-hattı DIŞINDA yaşar (src/kopru/), döngüye ENJEKTE edilir
//   (sef-dongu --gercek). STR-3.1 SIFIR-npm: Node yerel `curl` + execFileSync
//   kullanır (fetch async'tir; senkron EtmenÇağır sözleşmesine uymaz — çekirdeğin
//   senkron döngü imzasına dokunmamak için curl senkron köprüdür). STR-3: bu bir
//   DEMO politikasıdır; gerçek ürün etmen-zekâsı GİZLİ kalır (_KapaliUrun).
// ═══════════════════════════════════════════════════════════════════════════

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, readFileSync, readlinkSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, parse as yolAyrıştır, resolve, sep } from "node:path";
import type { EtmenÇağır, EtmenÇıktı, EtmenÇağrı } from "../dongu.ts";
// Canlı tool-round: bu köprü nvidia'yı mevcut tool-round mekaniğine bağlar ve yeni bir
// mekanizma DOĞURMAZ.
import { araçTuru, type AraçTalep, type AraçSonuç, type AraçÇağır } from "../toolround.ts";
import { BOŞ_MATRIS, type İzinBeyan, type İzinMatrisi, type Mod } from "../gateway.ts";

const UÇ = "https://integrate.api.nvidia.com/v1/chat/completions";
const VARSAYILAN_MODEL = "meta/llama-3.3-70b-instruct";

// ── Anahtar çözümü: process.env önce, sonra cekirdek/.env (gitignore'da) ──────
export function anahtarBul(): string {
  if (process.env.NVIDIA_API_KEY) return process.env.NVIDIA_API_KEY.trim();
  const envYol = fileURLToPath(new URL("../../../.env", import.meta.url));
  if (existsSync(envYol)) {
    const içerik = readFileSync(envYol, "utf8");
    for (const satır of içerik.split("\n")) {
      const m = satır.match(/^\s*NVIDIA_API_KEY\s*=\s*(.+?)\s*$/);
      if (m) return m[1].replace(/^["']|["']$/g, "").trim();
    }
  }
  throw new Error(
    "NVIDIA_API_KEY yok — cekirdek/.env içine `NVIDIA_API_KEY=nvapi-...` koy " +
    "veya ortam değişkeni olarak ver (build.nvidia.com → ücretsiz anahtar).",
  );
}

// ── Rol'e göre sistem-promptu — sözleşmeyi (SZL-ETMEN-CIKTI) LLM'e dikte eder ──
function sistemPrompt(rol: EtmenÇağrı["rol"]): string {
  const ortak =
    "Sen Sarmal framework'ünde çalışan bir yazılım ETMENİSİN. Türkçe düşün ve üret.\n" +
    "YALNIZCA geçerli bir JSON nesnesi döndür — açıklama, markdown, ``` bloğu YOK.\n" +
    "Zorunlu alanlar: adım(metin), etmen(metin), rol(metin), güven(0..1 sayı),\n" +
    "gerekçe(metin: ne+neden), testSonucu(metin), kırılganNoktalar(dizi).\n";
  if (rol === "üretici") {
    return ortak +
      "ROL=üretici. Görevi tamamla; ürettiğin dosyaları `üretilenDosyalar` dizisine koy.\n" +
      "`testSonucu` alanına davranışsal kanıt yaz: geçen bir testi 'geçti — <dosya:satır>' " +
      "biçiminde belirt (ör. 'geçti — kapsam tam: main_test.py:12'). Uydurma; gerçekten " +
      "ürettiğin yapıya dayan. Varsayımlarını `varsayımlar` dizisinde gizleme.\n" +
      "rol alanı KESİNLİKLE 'üretici' olmalı.";
  }
  // A11/E3 (bug-avı): güvenlik rolü kendi kalıbını alır — eskiden denetçi kalıbına
  // düşüyor, "rol='denetçi' olmalı" diyordu (HALKA-GUV canlı koşumda rol çelişirdi).
  if (rol === "güvenlik") {
    return ortak +
      "ROL=güvenlik. SANA YALNIZ üreticinin ÇIKTISI verilir — üretici ile denetçi bellekçe izoledir. SAVUNMA amaçlı\n" +
      "tehdit modelle (ebedî güvenlik hükmü: güvenlik bilgisi yalnız koruma amacıyla kullanılır):\n" +
      "üç kategoriyi tara — injection · authz · secret.\n" +
      "Her bulguyu `bulgular` dizisine {mesaj, kanıt (dosya:satır), kategori} nesnesi olarak yaz;\n" +
      "kategori özetini `kategoriRaporu` nesnesine koy (her kategori: bulgu YA DA gerekçeli 'temiz').\n" +
      "İstismar yükü/silahlaştırılmış araç ÜRETME — zafiyeti bul, savunmayı öner.\n" +
      "GÜVENLİK ÜRETMEZ: `üretilenDosyalar` alanını KESİNLİKLE döndürme. rol alanı KESİNLİKLE 'güvenlik' olmalı.";
  }
  return ortak +
    "ROL=denetçi. SANA YALNIZ üreticinin ÇIKTISI verilir; bağlamı verilmez, çünkü üretici ile denetçi bellekçe izoledir.\n" +
    "VARLIK≠DOĞRULUK: 'dosya üretildi' YETMEZ; artefaktın varlığı davranışın doğruluğunu kanıtlamaz — davranışsal kanıt (dosya:satır) ara.\n" +
    "Kabul ölçütlerini gerçekten karşılıyorsa: `kırılganNoktalar` BOŞ dizi [] ver ve\n" +
    "`testSonucu` alanına 'geçti — <kanıt dosya:satır>' yaz (satır numarası ŞART: ':12' gibi).\n" +
    "Eksik/kanıtsızsa: her kusuru `kırılganNoktalar` dizisine 'açıklama (dosya:satır)' biçiminde ekle.\n" +
    "DENETÇİ ÜRETMEZ: `üretilenDosyalar` alanını KESİNLİKLE döndürme (RBAC). rol='denetçi' olmalı.";
}

// ── Denetçiye gönderilecek üretici çıktısını okunur metne indir ───────────────
function denetlenecekMetin(çağrı: EtmenÇağrı): string {
  if (!çağrı.denetlenecek) return çağrı.prompt;
  return "Denetlenecek ÜRETİCİ ÇIKTISI (yalnız bu — bağlam yok):\n" +
    JSON.stringify(çağrı.denetlenecek, null, 2) +
    "\n\nBu çıktının kabul ölçütlerini davranışsal kanıtla karşılayıp karşılamadığını yargıla.";
}

// ── LLM içeriğinden JSON'u güvenle çıkar (``` sarmalı olabilir) ───────────────
export function jsonAyıkla(içerik: string): Record<string, unknown> {
  let s = içerik.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();
  const ilk = s.indexOf("{");
  const son = s.lastIndexOf("}");
  if (ilk >= 0 && son > ilk) s = s.slice(ilk, son + 1);
  return JSON.parse(s);
}

// ── SIR NÖBETİ: hata metninden anahtarı redakte et ────────────────────────────
//    execFileSync istisnası KOMUT ARGÜMANLARINI (Bearer anahtarı dahil) mesajında
//    taşır; yakalayan katman bunu ŞEF çıktısına/loga aynen geçirir. Bu yüzden
//    anahtar değeri + Bearer/nvapi- desenleri hata metnine girmeden silinir.
export function sırRedakte(metin: string, anahtar?: string): string {
  let s = metin;
  if (anahtar && anahtar.length > 0) s = s.split(anahtar).join("***");
  return s
    .replace(/Bearer\s+[^\s"']+/g, "Bearer ***")
    .replace(/nvapi-[A-Za-z0-9_-]+/g, "nvapi-***");
}

// ── Senkron NVIDIA çağrısı (curl · OpenAI-uyumlu chat/completions) ────────────
//    maxTokens: uzun yapılandırılmış yanıtlar (lig görüşü) 2048'de KESİLİYORDU
//    (JSON yarıda → parse hatası) — çağıran ihtiyaca göre büyütür.
//    tools: verilirse OpenAI function-calling açılır (tool_choice:auto);
//    model bir araç isterse yanıtın `tool_calls` alanı dolu döner (içerik boş olabilir).
export function nvidiaÇağır(anahtar: string, model: string, mesajlar: unknown[], maxTokens = 2048, tools?: unknown[]): {
  içerik: string; toolCalls: unknown[]; tokenGiriş: number; tokenÇıkış: number;
} {
  const gövde = JSON.stringify({
    model, messages: mesajlar, temperature: 0.2, top_p: 0.9, max_tokens: maxTokens,
    ...(tools && tools.length ? { tools, tool_choice: "auto" } : {}),
  });
  let ham: string;
  try {
    ham = execFileSync(
      "curl",
      ["-sS", "-m", "180", "-X", "POST", UÇ,
        "-H", `Authorization: Bearer ${anahtar}`,
        "-H", "Accept: application/json",
        "-H", "Content-Type: application/json",
        "--data-binary", "@-"],
      { input: gövde, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
    );
  } catch (e) {
    const mesaj = e instanceof Error ? e.message : String(e);
    throw new Error(`NVIDIA çağrısı başarısız: ${sırRedakte(mesaj, anahtar)}`);
  }
  const yanıt = JSON.parse(ham) as {
    choices?: { message?: { content?: string; tool_calls?: unknown[] } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
    error?: unknown; detail?: unknown; message?: string;
  };
  if (!yanıt.choices?.length) {
    throw new Error(`NVIDIA yanıtı boş/hatalı: ${sırRedakte(JSON.stringify(yanıt.error ?? yanıt.detail ?? yanıt.message ?? yanıt).slice(0, 300), anahtar)}`);
  }
  return {
    içerik: yanıt.choices[0].message?.content ?? "",
    toolCalls: yanıt.choices[0].message?.tool_calls ?? [],
    tokenGiriş: yanıt.usage?.prompt_tokens ?? 0,
    tokenÇıkış: yanıt.usage?.completion_tokens ?? 0,
  };
}

// ── kanıt-ekseni turu · ALTYAPI DOYGUNLUĞU DAYANIKLILIĞI (503/429) ──────────────────────
//
//   ÖLÇÜM (2026-07-17, canlı): aynı anahtarla arka arkaya iki çağrı →
//     ① HTTP 503 `ResourceExhausted: Worker local total request limit reached (37/16)`
//     ② HTTP 200
//   Yani NVIDIA ücretsiz katmanı ARALIKLI doyuyor; anahtar SAĞLAM, kod SAĞLAM.
//
//   NEDEN KRİTİK (ölçüm hijyeni): kanıt-ekseni turu "model 4-6 turluk akışı yürütebiliyor mu?"
//   sorusunu ölçecek. Plan zaten iki değişkeni ayırmayı dert ediyor — "kapı mı sıkı,
//   model mi zayıf?". ALTYAPI DOYGUNLUĞU ÜÇÜNCÜ değişkendir: araya giren bir 503,
//   "model beceremedi" diye YANLIŞ okunur ve A06'nın ölçümünü kirletir. Bu yüzden
//   ① sınırlı tekrar (üstel backoff) geçici doygunluğu eler, ② tekrar TÜKENİRSE
//   durum sessiz "başarısız" değil, AÇIKÇA "altyapı" olarak ayrışır (aşağıda
//   çökmeÇıktısı `NVIDIA-ALTYAPI` etmen imzası basar → izde model suçlanmaz).

/** Geçici altyapı doygunluğu mu (503/429 · ResourceExhausted)? — kalıcı hatadan (401/404/410) ayırır. */
export function geçiciDoygunlukMu(mesaj: string): boolean {
  return /ResourceExhausted|Worker local total request|Too Many Requests|\b429\b|\b503\b|Service Unavailable|rate.?limit/i.test(mesaj);
}

/** Tekrar politikası — üst sınırlı (sonsuz tekrar YOK; `uyu` enjekte = test hızlı koşar). */
export interface TekrarAyarı {
  /** Toplam deneme sayısı (varsayılan 4 → 1 asıl + 3 tekrar). */
  maxDeneme?: number;
  /** İlk backoff (varsayılan 1000ms); üstel: 1s → 2s → 4s. */
  tabanMs?: number;
  uyu?: (ms: number) => void;
  günlük?: (mesaj: string) => void;
}

export const DOYGUNLUK_ETİKETİ = "ALTYAPI DOYGUNLUĞU";

/** Sınırlı üstel backoff (jenerik · ağdan BAĞIMSIZ → LLM'siz test edilebilir).
 *  YALNIZ geçici doygunlukta tekrar dener; kalıcı hata (401 · 404 · 410 · bozuk JSON)
 *  ANINDA fırlatılır — tekrar anlamsız, gecikme zararlı.
 *  Tekrar tükenirse mesaj `ALTYAPI DOYGUNLUĞU` etiketi taşır → çökmeÇıktısı bunu okur
 *  ve izde "model yetersiz" değil "uç doygun" diye ayrışır (A06 ölçüm hijyeni). */
export function tekrarDene<T>(çağır: () => T, ayar: TekrarAyarı = {}): T {
  const maxDeneme = ayar.maxDeneme ?? 4;
  const tabanMs = ayar.tabanMs ?? 1000;
  const uyu = ayar.uyu ?? uyuSenkron;
  const günlük = ayar.günlük ?? ((m: string) => console.error(m));
  let son: Error = new Error("tekrar döngüsü koşmadı");
  for (let deneme = 1; deneme <= maxDeneme; deneme++) {
    try {
      return çağır();
    } catch (e) {
      son = e as Error;
      if (!geçiciDoygunlukMu(son.message)) throw son;              // kalıcı hata — tekrar yok
      if (deneme === maxDeneme) break;
      const bekle = tabanMs * 2 ** (deneme - 1);                   // 1s → 2s → 4s (üst sınırlı)
      günlük(`   ⏳ altyapı doygunluğu (NVIDIA 503/429) — ${bekle}ms backoff, tekrar ${deneme + 1}/${maxDeneme}…`);
      uyu(bekle);
    }
  }
  throw new Error(`${DOYGUNLUK_ETİKETİ}: ${maxDeneme} deneme tükendi — model/kod hatası DEĞİL, uç doygun: ${son.message}`);
}

/** nvidiaÇağır + 503/429 dayanıklılığı (tekrarDene sarmalı). */
export function nvidiaÇağırDayanıklı(
  anahtar: string, model: string, mesajlar: unknown[], maxTokens = 2048, tools?: unknown[],
  ayar: TekrarAyarı = {},
): ReturnType<typeof nvidiaÇağır> {
  return tekrarDene(() => nvidiaÇağır(anahtar, model, mesajlar, maxTokens, tools), ayar);
}

// ── TOOL-ROUND KÖPRÜSÜ: OpenAI function-calling ↔ SZL-ARAÇ-TALEP/SONUÇ ──────────
//    STR-3.1 kesim testi: format eşlemesi + gateway MEKANİĞİ AÇIK; hangi araç kataloğu +
//    izin-matrisi (kim ne alır) ENJEKTE edilir (köprü opt-in). Eşleme fonksiyonları SAF
//    (test-edilebilir); çok-tur curl orkestrasyonu nvidiaEtmenYap'ta.

/** Bir aracın OpenAI function-tanımı + Sarmal erişim modu (model mod SEÇMEZ — tanımda sabit). */
export interface AraçTanım {
  ad: string;                              // Sarmal araç KOD — İÇ kimlik (sicil·matris·yürütücü bu adı görür)
  wireAd?: string;                         // kanıt-ekseni turu: tele çıkan OpenAI function.name (ASCII); yoksa ad kullanılır
  açıklama: string;
  mod: Mod;                                // gateway'e geçen erişim modu
  parametreler?: Record<string, unknown>;  // JSON-Schema (OpenAI function.parameters)
}

/** OpenAI-uyumlu function.name alfabesi — kanıt-ekseni turu BULGU-1: `ş` (U+015F) endpoint şema
 *  doğrulamasında geri çevrildi ("Only a-z, A-Z, 0-9, underscores, and dashes"). */
const WIRE_AD_DESENİ = /^[A-Za-z0-9_-]+$/;

/** Aracın TELE çıkan adı (kanıt-ekseni turu): `wireAd ?? ad`. Wire-güvensizse GÖRÜNÜR hata —
 *  köprü kurulurken patlar (fail-fast); model karşısında sessiz şema reddi yaşanmaz.
 *  İç kimlik (t.ad) Türkçe kalır; çeviri YALNIZ tel sınırında yaşar. */
export function wireAdı(t: AraçTanım): string {
  const ad = t.wireAd ?? t.ad;
  if (!WIRE_AD_DESENİ.test(ad)) {
    throw new Error(`wire-güvensiz araç adı: "${ad}" — function.name yalnız [A-Za-z0-9_-] alır; AraçTanım'a ASCII wireAd ekle (iç kimlik "${t.ad}" değişmez)`);
  }
  return ad;
}

/** nvidiaEtmenYap'a enjekte tool-round köprüsü (opt-in — verilmezse eski tek-tur davranış). */
export interface ToolRoundKöprü {
  araçlar: AraçTanım[];                     // OpenAI tools kataloğu (STR-3: GİZLİ olabilir)
  beyanlar: readonly İzinBeyan[];           // gateway ① least-privilege
  matris?: İzinMatrisi;                     // gateway ② atama (fail-closed)
  araçÇağır: AraçÇağır;                     // izinli talebi yürüten (mock · A28 alt-MCP proxy)
  maxTur?: number;                          // API araç-turu limiti (varsayılan 5 · üretim yolu 6 — kanıt-ekseni turu)
  tekrar?: TekrarAyarı;                     // 503/429 dayanıklılığı (kanıt-ekseni turu; test `uyu` enjekte eder)
}

/** AraçTanım → OpenAI `tools[]` girdisi (saf; name = wire adı — kanıt-ekseni turu). */
export function oaAraçTanım(t: AraçTanım): Record<string, unknown> {
  return { type: "function", function: {
    name: wireAdı(t), description: t.açıklama,
    parameters: t.parametreler ?? { type: "object", properties: {} },
  } };
}

/** OpenAI ham `tool_call` → SZL-ARAÇ-TALEP (saf; argüman JSON güvenle çözülür — bozuksa _ham).
 *  `adÇöz` (kanıt-ekseni turu, opsiyonel): wire adını İÇ ada çevirir (test_kos → test-koş); verilmezse
 *  ad olduğu gibi geçer. Bilinmeyen wire adı çevrilmeden kalır → gateway beyan-dışı RED (fail-closed). */
export function oaToolCallÇöz(tc: unknown, modBul: (ad: string) => Mod, etmen: string, adÇöz?: (wireAd: string) => string): AraçTalep {
  const o = (tc ?? {}) as { function?: { name?: string; arguments?: string } };
  const wireAd = o.function?.name ?? "";
  const ad = adÇöz ? adÇöz(wireAd) : wireAd;
  let argüman: unknown;
  const ham = o.function?.arguments;
  if (typeof ham === "string" && ham.trim()) {
    try { argüman = JSON.parse(ham); } catch { argüman = { _ham: ham }; }
  }
  return { etmen, araç: ad, mod: modBul(ad), argüman };
}

/** SZL-ARAÇ-SONUÇ → OpenAI `role:"tool"` mesajı (saf — model sonraki turda okur; untrusted kalkanı korunur). */
export function oaAraçSonuçMesaj(toolCallId: string, s: AraçSonuç): Record<string, unknown> {
  return { role: "tool", tool_call_id: toolCallId, content: JSON.stringify(s) };
}

/** kanıt-ekseni turu · SİCİL SAHİPLENMESİ (saf) — koşum sicilini KÖPRÜ yazar, model DEĞİL.
 *
 *  jsonAyıkla modelin HAM JSON'ını döndürür; model oraya `"araçTurları": [...]`
 *  uydurabilir. Eski hâl (`if (turlar.length) obj.araçTurları = turlar;`) KOŞULLU
 *  atamaydı: model hiç araç çağırmazsa dizi boş kalır → atama ateşlenmez → modelin
 *  uydurduğu alan HAYATTA KALIR. Tek makine-yazımlı kanıt kaynağı sahtelenebilirdi.
 *
 *  Atama artık KOŞULSUZ: dizi doluysa köprünün turları yazılır, BOŞSA alan SİLİNİR.
 *  Modelin bu alana yazdığı her şey HER HÂLDE ezilir — sicile bağlanacak her kanıt
 *  kapısının (kanıt-ekseni turu) güven kökü budur. */
export function araçSiciliYaz(obj: Record<string, unknown>, turlar: AraçSonuç[]): Record<string, unknown> {
  if (turlar.length) obj.araçTurları = turlar;
  else delete obj.araçTurları;
  return obj;
}

/** GERÇEK NVIDIA etmeni — `EtmenÇağır` prizine takılır (demoEtmenYap'ın canlı ikizi).
 *  Model `NVIDIA_MODEL` env ile değişir (varsayılan llama-3.3-70b-instruct).
 *  köprü (opt-in): verilirse tool-round açılır — model araç isterse gateway'den
 *  geçer (izinli çalıştırılır · izinsiz RED), sonuç geri beslenir, model DEVAM eder (YAS-4.1 kanıtı
 *  `araçTurları`'nda). Verilmezse davranış BİREBİR eski (tek-tur, tools gönderilmez). */
export function nvidiaEtmenYap(köprü?: ToolRoundKöprü): EtmenÇağır {
  const anahtar = anahtarBul();
  const model = process.env.NVIDIA_MODEL?.trim() || VARSAYILAN_MODEL;
  const araçlarOA = köprü ? köprü.araçlar.map(oaAraçTanım) : undefined;
  const modHaritası = new Map((köprü?.araçlar ?? []).map((a) => [a.ad, a.mod]));
  // kanıt-ekseni turu · tel ↔ iç ad eşlemesi (çift yönlü): model YALNIZ wire adı görür (tools +
  // araç-sonuç mesajı), sicil/gateway YALNIZ iç adı. Bilinmeyen ad çevrilmeden geçer → RED.
  const içAd = new Map((köprü?.araçlar ?? []).map((a) => [wireAdı(a), a.ad]));
  const telAd = new Map((köprü?.araçlar ?? []).map((a) => [a.ad, wireAdı(a)]));
  const maxTur = köprü?.maxTur ?? 5;

  return (çağrı) => {
    const kullanıcı = çağrı.rol === "denetçi" ? denetlenecekMetin(çağrı) : çağrı.prompt;
    const mesajlar: unknown[] = [
      { role: "system", content: sistemPrompt(çağrı.rol) },
      { role: "user", content: kullanıcı },
    ];
    const etmenKimlik = çağrı.etmen?.kod ?? çağrı.rol;
    const araçTurları: AraçSonuç[] = [];

    let sonuç: { içerik: string; toolCalls: unknown[]; tokenGiriş: number; tokenÇıkış: number };
    try {
      // Tool-round: model araç isterse gateway'den geçir → sonucu besle → DEVAM. Son turda
      // (tur==maxTur) tools GÖNDERİLMEZ → model üretimle kapatmaya zorlanır (sonsuz döngü imkânsız).
      for (let tur = 0; ; tur++) {
        const toolsGönder = köprü && tur < maxTur ? araçlarOA : undefined;
        // kanıt-ekseni turu: aralıklı 503/429 (ölçüldü) burada elenir — A06'nın "model yeterli mi?"
        // ölçümü altyapı gürültüsüyle kirlenmesin (bkz. nvidiaÇağırDayanıklı).
        sonuç = nvidiaÇağırDayanıklı(anahtar, model, mesajlar, 2048, toolsGönder, köprü?.tekrar);
        const talepler = toolsGönder ? (sonuç.toolCalls ?? []) : [];
        if (!talepler.length) break;                    // içerik döndü — tur bitti
        // OpenAI protokolü: araç sonuçlarından ÖNCE asistanın tool_calls mesajı geçmişe girmeli.
        mesajlar.push({ role: "assistant", content: sonuç.içerik || "", tool_calls: sonuç.toolCalls });
        for (const tc of talepler) {
          const talep = oaToolCallÇöz(tc, (ad) => modHaritası.get(ad) ?? "oku", etmenKimlik, (w) => içAd.get(w) ?? w);
          const araçSonuç = araçTuru(talep, { beyanlar: köprü!.beyanlar, matris: köprü!.matris, araçÇağır: köprü!.araçÇağır });
          araçTurları.push(araçSonuç);
          // kanıt-ekseni turu: modele dönen mesaj wire adıyla konuşur (model tek ad görür); SİCİLE iç ad düşer.
          mesajlar.push(oaAraçSonuçMesaj((tc as { id?: string }).id ?? "", { ...araçSonuç, araç: telAd.get(araçSonuç.araç) ?? araçSonuç.araç }));
        }
      }
    } catch (e) {
      // Ağ/API hatası → döngüyü çökertme; kusuru görünür kıl (fail-visible).
      return çökmeÇıktısı(çağrı, `NVIDIA çağrı hatası: ${(e as Error).message}`);
    }

    let obj: Record<string, unknown>;
    try {
      obj = jsonAyıkla(sonuç.içerik);
    } catch {
      return çökmeÇıktısı(çağrı, `LLM JSON döndürmedi: ${sonuç.içerik.slice(0, 200)}`);
    }

    // Sözleşme güvenceleri: rol/adım/etmen doldur, token'ı API'den geçir.
    obj.adım = çağrı.adımKod;
    obj.rol = çağrı.rol;
    if (typeof obj.etmen !== "string") obj.etmen = `NVIDIA:${model}`;
    obj.tokenGiriş = sonuç.tokenGiriş;
    obj.tokenÇıkış = sonuç.tokenÇıkış;
    // YAS-4.1 davranışsal iz: talep→izin→sonuç→devam zinciri çıktıda görünür (canlı kanıtın delili).
    // kanıt-ekseni turu: atama KOŞULSUZ — modelin uydurduğu araçTurları her hâlde EZİLİR (bkz. araçSiciliYaz).
    araçSiciliYaz(obj, araçTurları);
    // RBAC koruma-ağı: denetim ailesi (denetçi+güvenlik) üretim taşıyamaz — model kaçırırsa temizle (A11/E3).
    if (çağrı.rol !== "üretici") delete obj.üretilenDosyalar;
    return obj as EtmenÇıktı;
  };
}

// ── Hata çıktısı — rol'e uygun, döngüyü GAP'e sokan güvenli düşüş ─────────────
//    kanıt-ekseni turu: altyapı doygunluğu (503/429 · tekrar tükendi) MODEL BAŞARISIZLIĞI DEĞİLDİR.
//    Etmen imzası + testSonucu ayrı etiket taşır ki iz okunduğunda üçüncü değişken
//    (uç doygun) "model 4-6 turu yürütemedi" diye YANLIŞ okunmasın (A06 ölçüm hijyeni).
export function çökmeÇıktısı(çağrı: EtmenÇağrı, mesaj: string): EtmenÇıktı {
  const altyapı = mesaj.includes(DOYGUNLUK_ETİKETİ);
  const taban = {
    adım: çağrı.adımKod, etmen: altyapı ? "NVIDIA-ALTYAPI" : "NVIDIA-HATA", rol: çağrı.rol,
    güven: 0, gerekçe: mesaj,
    testSonucu: altyapı
      ? "kaldı — ALTYAPI doygunluğu (uç 503/429; model DEĞERLENDİRİLEMEDİ)"
      : "kaldı — köprü hatası",
  };
  return çağrı.rol === "üretici"
    ? { ...taban, üretilenDosyalar: [], kırılganNoktalar: [mesaj] }
    : { ...taban, kırılganNoktalar: [`denetim yapılamadı: ${mesaj} (kopru:1)`] };
}

// ── CANLI KANIT KOMUTU (`sarmal sef-arac-kanit <dizin> --gercek`) ─────────────────
//    Gerçek NVIDIA LLM'e `dosya-oku` aracını sunar; iki senaryo koşup YAS-4.1 davranışsal
//    kanıtı (talep→gateway→sonuç→devam) izini basar: ① İZİNLİ (matris atar → zincir
//    tamamlanır) ② İZİNSİZ (boş matris → fail-closed RED, koşu güvenle sürer). CLI'dan
//    çağrılır (sarmal.ts kabuğu); gerçek çağrı yaptığı için --gercek ZORUNLU (güvenlik).

// ── kanıt-ekseni turu · SYMLINK KALKANI — ÜÇ YÜRÜTÜCÜNÜN ORTAK KÖK-SINIRI ─────────────────
//
//   ⚠️ DEVRALINAN AÇIK (canlı sonda ile ölçüldü, teoriden değil): `resolve()`
//   sembolik bağ ÇÖZMEZ — saf metin normalizasyonu yapar. Kök İÇİNDE dışarıyı
//   gösteren bir symlink varsa (`kok/tuzak -> /disari`), eski kapı
//   (`resolve` + `startsWith(köz+sep)`) yolu "içeride" sanıp GEÇİRİR; writeFileSync
//   bağı izler ve dosya kök DIŞINA yazılır. Sonda çıktısı:
//       resolve() sonucu     : …/kok/tuzak/kacak.txt   → "kök içinde" (kapı GEÇİRİR)
//       gerçekte yazılan yer : KÖK DIŞINA ⚠️
//   A02/A03 bu deseni okuyucudan birebir devraldı (yeni açık değil, MİRAS).
//   A04 üreticiye ilk kez `yaz` izni açtığı için kalkan burada gerçek olmak ZORUNDA.
//
//   ÇÖZÜM: sınır kontrolü `realpath` tabanına oturur. İki incelik:
//     ① KÖKÜN KENDİSİ de symlink olabilir (macOS: /tmp → /private/tmp) → kök de çözülür.
//     ② HEDEF henüz VAR OLMAYABİLİR (yazma!) → realpathSync patlar. Bu yüzden yol
//        BİLEŞEN BİLEŞEN çözülür: var olan her bileşen izlenir, olmayan kuyruk aynen
//        eklenir. Dangling (kırık) symlink de yakalanır — lstat kullanılır, çünkü
//        `kok/kacak -> /disari/yok.txt` existsSync'e GÖRÜNMEZ ama writeFileSync
//        onu izleyip /disari/yok.txt'yi YARATIR.

/** Sembolik bağ zinciri tavanı (ELOOP kalkanı — kendine dönen bağ sonsuz dönmesin). */
const BAĞ_ZİNCİR_TAVANI = 32;

/**
 * Bir yolu bileşen bileşen GERÇEKLEŞTİRİR (symlink'leri çözer), var olmayan kuyruğu
 * aynen taşır. `realpathSync`ten farkı: hedefin var olması gerekmez (yazma yolu) ve
 * kırık (dangling) son-bileşen symlink'i de çözülür (writeFileSync onu izler — biz de).
 * Saf değil (fs okur) ama yan-etkisiz; kabuk tarafında yaşar (çekirdek SAF kalır).
 */
export function gerçekYolÇöz(yol: string, derinlik = 0): string {
  if (derinlik > BAĞ_ZİNCİR_TAVANI) throw new Error(`sembolik bağ zinciri çok derin (ELOOP?): ${yol}`);
  const mutlak = resolve(yol);
  const kök = yolAyrıştır(mutlak).root;
  const parçalar = mutlak.slice(kök.length).split(sep).filter(Boolean);
  let şu = kök;
  for (let i = 0; i < parçalar.length; i++) {
    şu = resolve(şu, parçalar[i]);
    let st: ReturnType<typeof lstatSync> | undefined;
    try { st = lstatSync(şu); } catch { continue; }   // bileşen yok → kuyruğu aynen taşı (yazma yolu)
    if (!st.isSymbolicLink()) continue;
    // Bağı izle (kırık olsa bile). Bağ MUTLAK bir hedefe gidebilir → yeni yolun KENDİ
    // ataları da symlink olabilir (macOS: /tmp → /private/tmp). Bu yüzden kalan parçalar
    // eklenip yol BAŞTAN çözülür; yarım çözüm sınırı yanlış yerde ölçerdi.
    const bağHedefi = resolve(dirname(şu), readlinkSync(şu));
    const kalan = parçalar.slice(i + 1);
    return gerçekYolÇöz(kalan.length ? resolve(bağHedefi, ...kalan) : bağHedefi, derinlik + 1);
  }
  return şu;
}

/** Kök-sınırı kapısının sonucu — `geçti` AYIRT EDİCİdir (boş-string sebep de doğru dallanır). */
export type SınırSonuç = { geçti: true; hedef: string } | { geçti: false; sebep: string };

/**
 * KÖK-SINIRI KAPISI — üç yürütücünün (oku · yaz · koş) TEK ortak kalkanı.
 * `yol`u kök içinde çözer; kaçış varsa `sebep` döner (fail-visible — zincir kırılmaz).
 * Dönen `hedef` GERÇEKLEŞTİRİLMİŞ yoldur: I/O bunun üzerinden yapılır ki kapı ile
 * fiili erişim aynı yolu görsün (kapıdan sonra yeniden symlink izleme İMKÂNSIZ).
 */
export function kökİçindeÇöz(köz: string, yol: string): SınırSonuç {
  let gKöz: string, gHedef: string;
  try {
    gKöz = gerçekYolÇöz(köz);
    gHedef = gerçekYolÇöz(resolve(köz, yol));
  } catch (e) {
    return { geçti: false, sebep: `yol çözülemedi: ${(e as Error).message}` };
  }
  if (gHedef !== gKöz && !gHedef.startsWith(gKöz + sep)) {
    return { geçti: false, sebep: `kök dışı erişim reddedildi: ${yol}` };
  }
  return { geçti: true, hedef: gHedef };
}

/** Kanıt turu için güvenli `dosya-oku` yürütücü: yalnız `kök` İÇİNDE okur (traversal +
 *  symlink kaçışı RED — kökİçindeÇöz), içeriği 2KB'ye kırpar. STR-3.1: yerel fs, ağ yok.
 *  Kök dışı/eksik dosya → durum:hata (fail-visible). */
function kanitOkuyucuYap(kök: string): AraçÇağır {
  const köz = resolve(kök);
  return (t: AraçTalep): AraçSonuç => {
    const yol = (t.argüman as { yol?: string })?.yol;
    if (!yol || typeof yol !== "string") {
      return { durum: "hata", araç: t.araç, mod: t.mod, güvenilmez: true, sebep: "yol argümanı yok" };
    }
    const sınır = kökİçindeÇöz(köz, yol);
    if (!sınır.geçti) {
      return { durum: "hata", araç: t.araç, mod: t.mod, güvenilmez: true, sebep: sınır.sebep };
    }
    if (!existsSync(sınır.hedef)) {
      return { durum: "hata", araç: t.araç, mod: t.mod, güvenilmez: true, sebep: `dosya yok: ${yol}` };
    }
    return { durum: "izinli", araç: t.araç, mod: t.mod, güvenilmez: true, sonuç: readFileSync(sınır.hedef, "utf8").slice(0, 2048) };
  };
}

const KANIT_KATALOG: AraçTanım[] = [{
  ad: "dosya-oku", açıklama: "Verilen yoldaki metin dosyasının içeriğini oku ve döndür.",
  mod: "oku", parametreler: { type: "object", properties: { yol: { type: "string", description: "okunacak dosyanın göreli yolu" } }, required: ["yol"] },
}, {
  // kanıt-ekseni turu · yazma aracı — okuyucunun ters yönü. Silme/taşıma aracı YOK (en az ayrıcalık).
  ad: "dosya-yaz", açıklama: "Verilen yoldaki dosyaya metin içeriği yaz (varsa üzerine yazar). Yalnız çalışma kökü içinde.",
  mod: "yaz", parametreler: { type: "object", properties: {
    yol: { type: "string", description: "yazılacak dosyanın göreli yolu (kök dışı yasak)" },
    içerik: { type: "string", description: "dosyaya yazılacak tam metin" },
  }, required: ["yol", "içerik"] },
}, {
  // kanıt-ekseni turu · TEZİN MEKANİK UCU — tezin doğru olabileceği tek nokta: testin GERÇEKTEN
  // koşması ve ÇIKIŞ KODUNUN okunması. Dosya varlığı doğrulama DEĞİLDİR (VARLIK≠DOĞRULUK).
  // Yürütücü: testKoşucuYap(kök) — zaman aşımı + çıktı tavanı kalkanlı; kalkan tetiklenirse
  // durum:"hata" (çıkış kodu okunamadı = KANIT YOK; uydurma 0 ASLA verilmez).
  // kanıt-ekseni turu · wireAd: iç kimlik `test-koş` sicil/matris/yürütücüde AYNEN kalır; tele
  // yalnız ASCII `test_kos` çıkar (A06 BULGU-1: `ş` U+015F function.name'de geçersiz).
  ad: "test-koş", wireAd: "test_kos", açıklama: "Verilen yoldaki test dosyasını `node --test` ile koştur; çıkış kodunu ve çıktısını döndür.",
  mod: "çağır", parametreler: { type: "object", properties: {
    yol: { type: "string", description: "koşulacak test dosyasının göreli yolu (kök dışı yasak)" },
  }, required: ["yol"] },
}];

// ── kanıt-ekseni turu · ÜRETİM KÖPRÜSÜ — araçlar üretim yoluna BAĞLANIR ────────────────────
//
//   PROBLEM (sade dille): araçlar vardı, kimse onlara ulaşamıyordu. sarmal.ts:46
//   `nvidiaEtmenYap()` ARGÜMANSIZ çağrılıyordu → köprü undefined → tools API'ye HİÇ
//   gönderilmiyordu → tek tur, tek JSON, sıfır araç. Köprü yalnız `sef-arac-kanit`
//   demo komutunda veriliyordu — ÜRETİM YOLU DEĞİL. Bu, o bağlantı.
//
//   ⚖️ STR-3.1 KESİM TESTİ (burada duruyoruz): araç KATALOĞU + izin MATRİSİ + tur mekaniği
//   AÇIK (mekanizma). Hangi aracın NE ZAMAN seçileceği — routing · bütçe · sıra · risk
//   eşiği — GİZLİ politika, buraya GİRMEZ. Aşağıdaki matris bir POLİTİKA DEĞİL, rol
//   ayrımının yapısal TABANIDIR (rbac.ts VARSAYILAN_ROL_PROFIL deseni: fail-closed
//   varsayılan; GİZLİ ürün üstüne kendi matrisini enjekte eder).

/** ① BEYAN katmanı (least-privilege · gateway kapı-1): köprünün TOPLAM araç yüzeyi.
 *  Beyan edilmeyen araç, matris ne derse desin YASAKTIR (deny-by-default). */
export const ÜRETİM_BEYANLARI: readonly İzinBeyan[] = [
  { araç: "dosya-oku", mod: "oku" },
  { araç: "dosya-yaz", mod: "yaz" },
  { araç: "test-koş", mod: "çağır" },
];

/** ② MATRİS katmanı (gerçek atama · gateway kapı-2 · FAIL-CLOSED): rol × araç × mod.
 *
 *  EN AZ AYRICALIK — her rol yalnız işini yapacak kadarını alır:
 *    üretici → dosya-oku:oku · dosya-yaz:yaz · test-koş:çağır  (üretir, sınar, düzeltir)
 *    denetçi → dosya-oku:oku · test-koş:çağır                  (YAZAMAZ — okur, sınar, yargılar)
 *    güvenlik → (yok)                                          (ORK-6.1: yalnız üretici ÇIKTISI verilir;
 *                                                               diske hiç teması olmamalı → fail-closed)
 *
 *  ⚖️ DENETÇİ NEDEN YAZAMAZ: ORK-6.1'in KİMLİK ayrımı bugün kodda zorlanmıyor (aynı model
 *  iki rolde koşuyor — planın B6 dilimi, ayrı karar). Ama YETKİ ayrımı BURADA zorlanır:
 *  yargılayan el, yargıladığı artefaktı DEĞİŞTİREMEZ. Bu tek satır, "denetçi kendi
 *  denetlediği kodu düzeltip geçer not verir" sınıfını yapısal olarak imkânsız kılar.
 *
 *  🔑 ANAHTAR = ROL: gateway kimliği `çağrı.etmen?.kod ?? çağrı.rol` (nvidiaEtmenYap).
 *  Plan bir Etmen ATAMIŞSA kimlik o Etmen'in KOD'u olur ve bu matriste karşılığı YOKTUR
 *  → fail-closed RED (sessiz açılma YOK). Etmen-KOD → profil eşlemesi GİZLİ politikadır
 *  (STR-3.1 · rbac.ts:11 aynı sınırı çiziyor); açık taban rol-düzeyinde durur. */
export const ÜRETİM_MATRISI: İzinMatrisi = new Map<string, ReadonlyMap<string, ReadonlySet<Mod>>>([
  ["üretici", new Map([
    ["dosya-oku", new Set<Mod>(["oku"])],
    ["dosya-yaz", new Set<Mod>(["yaz"])],
    ["test-koş", new Set<Mod>(["çağır"])],
  ])],
  ["denetçi", new Map([
    ["dosya-oku", new Set<Mod>(["oku"])],
    ["test-koş", new Set<Mod>(["çağır"])],
  ])],
]);

/** ÜRETİM TUR TAVANI — plan (kanıt-ekseni turu görev): "4-6 turluk akış gerekiyor:
 *  yaz → test yaz → koş → oku → düzelt → kapat".
 *
 *  MEKANİK: `tur < maxTur` olan turlarda tools GÖNDERİLİR; tur == maxTur'da tools
 *  KESİLİR → model üretimle kapatmaya ZORLANIR (sonsuz döngü imkânsız). Yani maxTur =
 *  en çok araç-taşıyan tur sayısı; toplam API çağrısı ≤ maxTur + 1 (kapanış turu).
 *
 *  ESKİ DEĞER 5 (ToolRoundKöprü varsayılanı · A29 demosu için yazılmıştı — TEK okuma
 *  turu kanıtlıyordu). Planın saydığı 6 eylemin son basamağı ("kapat") araç değil ÜRETİM
 *  turudur; ama "düzelt" gerçekte İKİ araç turu ister (yeniden-yaz + yeniden-koş). 5 ile
 *  başarısız-test → düzeltme akışı tam olarak son turda tools kaybederdi: model düzeltmeyi
 *  YAZAMADAN kapatmak zorunda kalır → A06 bunu "model beceremedi" diye okurdu. Kapıyı
 *  ölçümün ihtiyacından DAR tutmak, ölçtüğümüz şeyi bozar.
 *  6 = planın en uzun akışı (5 araç turu) + 1 tur pay; tavan hâlâ sıkı (≤7 API çağrısı). */
export const ÜRETİM_MAX_TUR = 6;

/** Üretim tool-round köprüsü: katalog + fail-closed matris + üç yürütücü, `kök` sınırlı.
 *
 *  ⚠️ `kök` = araçların diske dokunabileceği TEK alan (üç yürütücünün de kök-sınırı +
 *  symlink kalkanı buradan beslenir). Çağıran kabuk hangi dizini verirse araçlar orayı
 *  görür — ilk yazım izni ASLA repo köküne verilmez (kanıt-ekseni turu tek-kullanımlık fikstürde koşar). */
export function üretimKöprüsüYap(kök: string): ToolRoundKöprü {
  return {
    araçlar: KANIT_KATALOG,
    beyanlar: ÜRETİM_BEYANLARI,
    matris: ÜRETİM_MATRISI,
    araçÇağır: üretimAraçÇağırYap(kök),
    maxTur: ÜRETİM_MAX_TUR,
  };
}

/** Katalog araç-KOD'unu doğru yürütücüye dağıtır (oku/yaz/koş). Tanımsız araç →
 *  durum:hata (fail-visible; gateway zaten beyan-dışını RED'liyor — bu ikinci kalkan). */
export function üretimAraçÇağırYap(kök: string): AraçÇağır {
  const okuyucu = kanitOkuyucuYap(kök);
  const yazıcı = kanitYazicilarYap(kök);
  const koşucu = testKoşucuYap(kök);
  return (t: AraçTalep): AraçSonuç => {
    if (t.araç === "dosya-oku") return okuyucu(t);
    if (t.araç === "dosya-yaz") return yazıcı(t);
    if (t.araç === "test-koş") return koşucu(t);
    return { durum: "hata", araç: t.araç, mod: t.mod, güvenilmez: true, sebep: `tanımsız araç: ${t.araç}` };
  };
}

function kanitPrompt(okunacakYol: string): string {
  return `Görev: Bu depoda '${okunacakYol}' dosyasının ilk satırlarını incele. Bunun için önce ` +
    `\`dosya-oku\` aracını { "yol": "${okunacakYol}" } argümanıyla ÇAĞIR. Aracın döndürdüğü içeriğe ` +
    `dayanarak dosyanın ne işe yaradığını bir cümleyle özetle. Aracı çağırmadan cevaplama.`;
}

function kanitRaporla(başlık: string, çıktı: EtmenÇıktı): { araçKullandı: boolean; izinli: boolean; red: boolean } {
  const turlar = Array.isArray(çıktı.araçTurları) ? (çıktı.araçTurları as AraçSonuç[]) : [];
  console.log(`\n▸ ${başlık} — araç-turu: ${turlar.length}`);
  for (const t of turlar) {
    const iz = t.durum === "izinli" ? "✅ izinli" : t.durum === "red" ? "⛔ RED" : "⚠️ hata";
    console.log(`   ${iz}  ${t.araç}:${t.mod}${t.sebep ? ` — ${t.sebep}` : ""}${t.durum === "izinli" && t.sonuç ? ` — ${String(t.sonuç).slice(0, 60).replace(/\n/g, " ")}…` : ""}`);
  }
  const özet = typeof çıktı.gerekçe === "string" ? çıktı.gerekçe : (typeof çıktı.testSonucu === "string" ? çıktı.testSonucu : "");
  if (özet) console.log(`   ↳ model devam etti: "${özet.slice(0, 100)}"`);
  return {
    araçKullandı: turlar.length > 0,
    izinli: turlar.some((t) => t.durum === "izinli"),
    red: turlar.some((t) => t.durum === "red"),
  };
}

/** Senkron backoff (STR-3.1 sıfır-npm · curl-senkron köprüyle aynı ruh — SharedArrayBuffer.wait). */
function uyuSenkron(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/** NVIDIA ücretsiz-katman burst limiti (ResourceExhausted) tool-round mantığından bağımsız —
 *  köprü çökme çıktısını taşır. Kanıt turu bunu geçici sayıp backoff'la tekrar dener (kod bug'ı değil). */
function hızLimitiMi(çıktı: EtmenÇıktı): boolean {
  const g = typeof çıktı.gerekçe === "string" ? çıktı.gerekçe : "";
  return /ResourceExhausted|Worker local total req|Too Many Requests|\b429\b|rate.?limit/i.test(g);
}

/** Bir senaryoyu koşar; hız-limitine takılırsa artan backoff'la tekrar dener (varsayılan 3 deneme). */
function kanitSeneryoKos(çağır: EtmenÇağır, çağrı: EtmenÇağrı, maxDeneme = 3): EtmenÇıktı {
  let çıktı = çağır(çağrı);
  for (let d = 1; d < maxDeneme && hızLimitiMi(çıktı); d++) {
    console.log(`   ⏳ hız-limiti — ${2 * d}sn backoff, tekrar (${d + 1}/${maxDeneme})…`);
    uyuSenkron(2000 * d);
    çıktı = çağır(çağrı);
  }
  return çıktı;
}

/** `sarmal sef-arac-kanit <dizin>` — canlı tool-round kanıtı (gerçek NVIDIA). */
export function sefAracKanitKomutu(dizin: string, okunacakYol = "README.md"): number {
  const okuyucu = kanitOkuyucuYap(dizin);
  console.log(`🧪 canlı tool-round kanıtı — gerçek NVIDIA (model=${process.env.NVIDIA_MODEL ?? VARSAYILAN_MODEL})`);
  console.log(`   araç: dosya-oku · kök: ${resolve(dizin)} · hedef: ${okunacakYol}`);

  let çıktıA: EtmenÇıktı, çıktıB: EtmenÇıktı;
  try {
    // ① İZİNLİ — beyan ∧ matris 'üretici' → dosya-oku:oku atar (etmen kimliği yoksa rol=üretici).
    const izinliÇağır = nvidiaEtmenYap({
      araçlar: KANIT_KATALOG,
      beyanlar: [{ araç: "dosya-oku", mod: "oku" }],
      matris: new Map([["üretici", new Map([["dosya-oku", new Set<Mod>(["oku"])]])]]),
      araçÇağır: okuyucu,
    });
    çıktıA = kanitSeneryoKos(izinliÇağır, { adımKod: "KANIT-A29", rol: "üretici", prompt: kanitPrompt(okunacakYol) });

    // ② İZİNSİZ — boş matris (fail-closed): model hangi aracı isterse RED, koşu güvenle sürer.
    const izinsizÇağır = nvidiaEtmenYap({
      araçlar: KANIT_KATALOG, beyanlar: [{ araç: "dosya-oku", mod: "oku" }],
      matris: BOŞ_MATRIS, araçÇağır: okuyucu,
    });
    çıktıB = kanitSeneryoKos(izinsizÇağır, { adımKod: "KANIT-A29", rol: "üretici", prompt: kanitPrompt(okunacakYol) });
  } catch (e) {
    console.error(`✖ kanıt koşusu başarısız: ${(e as Error).message}`);
    return 1;
  }

  const a = kanitRaporla("① İZİNLİ senaryo", çıktıA);
  const b = kanitRaporla("② İZİNSİZ senaryo (boş matris → fail-closed)", çıktıB);

  console.log("\n── Hüküm ──");
  const izinliZincir = a.araçKullandı && a.izinli;
  const redKanıt = b.araçKullandı && b.red && !b.izinli;
  console.log(`  ① izinli zincir (talep→gateway→sonuç→devam): ${izinliZincir ? "✅ KANITLANDI" : "⚠️ model aracı çağırmadı — tekrar dene"}`);
  console.log(`  ② izinsiz RED (fail-closed, koşu sürdü): ${redKanıt ? "✅ KANITLANDI" : "⚠️ model aracı çağırmadı — tekrar dene"}`);
  // Model nondeterministik: araç çağırmazsa kanıt EKSİK (hata değil) — kabul Founder gözüyle.
  return izinliZincir && redKanıt ? 0 : 2;
}

// ── kanıt-ekseni turu · `test-koş` YÜRÜTÜCÜSÜ — TEZİN MEKANİK UCU ───────────────────────
//
//   Sarmal'ın tezi: "LLM dönüştürür, mekanik doğrulama belirsizliği kapatır."
//   Tezin doğru olabileceği TEK nokta budur: testin GERÇEKTEN koşması ve ÇIKIŞ
//   KODUNUN okunması. Dosya varlığına bakmak doğrulama DEĞİLDİR (VARLIK≠DOĞRULUK
//   — dongu.ts:673). Çıkış kodu modelin YAZAMADIĞI bir alandır: işletim sistemi
//   yazar. kanıt-ekseni turu'in mührü bu sayıya bağlanacak.
//
//   Saf çekirdek ↔ etkili kabuk: süreç başlatma burada (kopru/) kalır; dongu.ts
//   `node:child_process` GÖRMEZ — döngü yalnız köprünün yazdığı SİCİLİ okur.
//
//   İki ZORUNLU kalkan (koşum bir kabuk açar — sınırsız kaynak vermeyiz):
//     ① zaman aşımı  → sonsuz/asılı test SIGKILL'lenir (ETIMEDOUT → durum:hata)
//     ② çıktı tavanı → taşkın çıktı belleği şişiremez (ENOBUFS → durum:hata)
//   İkisi de `durum:hata` üretir — çünkü ÇIKIŞ KODU OKUNAMADI. Kalkan tetiklenmiş
//   bir koşu "test geçti" sayılamaz (fail-visible; sessiz 0 ASLA uydurulmaz).

/** `test-koş` sonucu — sicile (araçTurları) düşen mekanik kanıt gövdesi.
 *  `çıkışKodu` bu köprünün tek OTORİTE alanı: node --test'in işletim sistemine
 *  bildirdiği kod (0 = geçti). `stdout`/`stderr` teşhis içindir (model okur, düzeltir). */
export interface TestKoşumSonucu {
  çıkışKodu: number;
  stdout: string;
  stderr: string;
}

/** `test-koş` yürütücüsünün kalkan ayarları (ikisi de zorunlu — varsayılanları var). */
export interface TestKoşumAyarı {
  /** Test bu süre içinde bitmezse SIGKILL + durum:hata (varsayılan 60sn). */
  zamanAşımıMs?: number;
  /** stdout/stderr başına izin verilen en büyük bayt (varsayılan 256KB); aşılırsa durum:hata. */
  çıktıTavanıBayt?: number;
}

const VARSAYILAN_TEST_ZAMAN_AŞIMI_MS = 60_000;
const VARSAYILAN_ÇIKTI_TAVANI_BAYT = 256 * 1024;

/** ⚠️ SESSİZ YALAN KALKANI (kanıt-ekseni turu · koşumda bulundu, teoriden değil).
 *
 *  `node --test` bir test-koşucusu ortamından ÇAĞRILIRSA — yani ortamda
 *  `NODE_TEST_CONTEXT` mirası varsa — kendini iç-içe koşum sanar:
 *    "Warning: node:test run() is being called recursively within a test file.
 *     skipping running files."
 *  → HİÇBİR test koşmaz, stdout BOŞ kalır ve süreç **çıkış kodu 0** döndürür.
 *  Yani kasten KIRIK bir test bile `çıkışKodu:0` verir: aracın tek otorite alanı
 *  tam da kaçınmak için var olduğu YALANI söyler (kanıt-ekseni turu'in mührü buna bağlanacak).
 *  Bu yüzden koşum ortamı miras alınmaz, TEMİZLENİR. */
function temizKoşumOrtamı(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  return env;
}

/** Güvenli `node --test` yürütücü: yalnız `kök` İÇİNDEKİ dosyayı koşar (traversal RED —
 *  kanitOkuyucuYap:299 deseninin ikizi), zaman aşımı + çıktı tavanı kalkanlarıyla sarar.
 *  Dönüş: izinli → sonuç = { çıkışKodu, stdout, stderr } · aksi → durum:hata (fail-visible).
 *  STR-3.1: Node yerel spawnSync — sıfır npm, senkron AraçÇağır sözleşmesine uyar. */
export function testKoşucuYap(kök: string, ayar: TestKoşumAyarı = {}): AraçÇağır {
  const köz = resolve(kök);
  const zamanAşımıMs = ayar.zamanAşımıMs ?? VARSAYILAN_TEST_ZAMAN_AŞIMI_MS;
  const çıktıTavanı = ayar.çıktıTavanıBayt ?? VARSAYILAN_ÇIKTI_TAVANI_BAYT;

  return (t: AraçTalep): AraçSonuç => {
    const hata = (sebep: string): AraçSonuç =>
      ({ durum: "hata", araç: t.araç, mod: t.mod, güvenilmez: true, sebep });

    const yol = (t.argüman as { yol?: string })?.yol;
    if (!yol || typeof yol !== "string") return hata("yol argümanı yok");

    // KÖK SINIRI (ortak kalkan · kanıt-ekseni turu): traversal + symlink kaçışı birlikte ölür.
    const sınır = kökİçindeÇöz(köz, yol);
    if (!sınır.geçti) return hata(sınır.sebep);
    const hedef = sınır.hedef;
    if (!existsSync(hedef)) return hata(`test dosyası yok: ${yol}`);

    const p = spawnSync(process.execPath, ["--test", hedef], {
      cwd: köz, encoding: "utf8",
      env: temizKoşumOrtamı(),
      timeout: zamanAşımıMs,
      maxBuffer: çıktıTavanı,
      killSignal: "SIGKILL",   // asılı test SIGTERM'i yutabilir — kalkan yumuşak olmaz
    });

    // ⚠️ SIRA KRİTİK: kalkan hatası p.status'ü de doldurabilir (ENOBUFS'ta status=1).
    // Önce error okunur; yoksa kalkan tetiklenmiş bir koşuyu "test düştü" sanardık.
    if (p.error) {
      const kod = (p.error as NodeJS.ErrnoException).code;
      if (kod === "ETIMEDOUT") return hata(`zaman aşımı: test ${zamanAşımıMs}ms içinde bitmedi (${yol})`);
      if (kod === "ENOBUFS") return hata(`çıktı tavanı aşıldı: ${çıktıTavanı} bayt (${yol})`);
      return hata(`test koşulamadı: ${p.error.message}`);
    }
    // Çıkış kodu YOK (sinyalle öldü) → kanıt YOK. Uydurma 0 ASLA üretilmez.
    if (typeof p.status !== "number") {
      return hata(`test sinyalle sonlandı (${p.signal ?? "bilinmiyor"}): ${yol}`);
    }

    const sonuç: TestKoşumSonucu = {
      çıkışKodu: p.status,
      stdout: (p.stdout ?? "").slice(0, çıktıTavanı),
      stderr: (p.stderr ?? "").slice(0, çıktıTavanı),
    };
    return { durum: "izinli", araç: t.araç, mod: t.mod, güvenilmez: true, sonuç };
  };
}

// ── kanıt-ekseni turu · YAZMA ARACI (`dosya-yaz`) — üreticinin diske ilk teması ─────────────
//    PROBLEM: üreticinin diske YAZMA yeteneği yoktu; `üretilenDosyalar` saf BEYAN'dı
//    (model "şunu yazdım" der, hiçbir şey yazılmaz). Kapı (gateway Mod="yaz") ve
//    yürütücü (toolround.araçTuru) hazırdı — arkasında ODA yoktu. Bu, o oda.
//
//    kanitOkuyucuYap'ın AYNASI: aynı kök-sınırı kalkanı (resolve + startsWith(köz+sep)),
//    ters yön. EN AZ AYRICALIK: yalnız YAZMA — silme/taşıma aracı YOKTUR. STR-3.1: tur
//    mekaniği + allowlist AÇIK; hangi aracın NE ZAMAN seçileceği (routing) GİZLİ kalır.
//    Saf çekirdek ↔ etkili kabuk: disk erişimi burada (kopru/) yaşar; dongu.ts SAF kalır.

/** Tek yazımda kabul edilen en büyük içerik — okuyucunun 2KB kırpma kalkanının ikizi
 *  (model dev metin üretirse disk/bellek taşmasın; aşan talep RED değil `hata` = fail-visible). */
export const YAZIM_TAVANI = 256 * 1024;

/** Kanıt turu için güvenli `dosya-yaz` yürütücü: yalnız `kök` İÇİNDE yazar (traversal RED).
 *  Kök-sınırı kontrolü kanitOkuyucuYap'tan BİREBİR devralındı — tek fark yönü. Eksik ara
 *  dizinler kök içinde açılır. STR-3.1: yerel fs, ağ yok. Kök dışı/tavan aşımı/fs hatası →
 *  durum:hata (fail-visible; zincir kırılmaz — toolround deseni). */
export function kanitYazicilarYap(kök: string): AraçÇağır {
  const köz = resolve(kök);
  return (t: AraçTalep): AraçSonuç => {
    const arg = (t.argüman ?? {}) as { yol?: unknown; içerik?: unknown };
    const hata = (sebep: string): AraçSonuç => ({ durum: "hata", araç: t.araç, mod: t.mod, güvenilmez: true, sebep });

    if (!arg.yol || typeof arg.yol !== "string") return hata("yol argümanı yok");
    if (typeof arg.içerik !== "string") return hata("içerik argümanı yok (metin bekleniyor)");
    if (arg.içerik.length > YAZIM_TAVANI) {
      return hata(`içerik tavanı aşıldı: ${arg.içerik.length} > ${YAZIM_TAVANI} bayt`);
    }

    // KÖK SINIRI (ortak kalkan · kanıt-ekseni turu): `../`, mutlak yol VE symlink kaçışı burada ölür.
    const sınır = kökİçindeÇöz(köz, arg.yol);
    if (!sınır.geçti) return hata(sınır.sebep);
    const hedef = sınır.hedef;
    // Kökün KENDİSİ dosya değildir — yazıcıda ayrıca reddedilir (okuyucuda anlamı vardı).
    if (hedef === gerçekYolÇöz(köz)) return hata(`kök dizinin üzerine yazılamaz: ${arg.yol}`);

    try {
      mkdirSync(dirname(hedef), { recursive: true });   // ara dizinler — sınır kontrolünden SONRA
      writeFileSync(hedef, arg.içerik, "utf8");
    } catch (e) {
      return hata(`yazma başarısız: ${(e as Error).message}`);
    }
    return { durum: "izinli", araç: t.araç, mod: t.mod, güvenilmez: true,
      sonuç: { yol: arg.yol, bayt: Buffer.byteLength(arg.içerik, "utf8") } };
  };
}

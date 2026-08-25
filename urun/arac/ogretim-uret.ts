// ═══════════════════════════════════════════════════════════════════════════
// arac/ogretim-uret.ts — 🎓 ÖĞRETİM ÜRETECİ (KYN-OGR-A01)
//
//   AMAÇ. Sarmal'ın on dört sınıf ailesi ve yüzü aşkın tipi bugüne kadar yalnız
//   makine sicilinde yaşadı; insana anlatan bir yüzü yoktu. Bu üreteç her aile
//   için bir öğretim kartı iskeleti yazar ve iskeleti yalnız kanonik sınıflama
//   kaydından (oz/siniflama/kayit.json) türetir.
//
//   NEDEN ÜRETİLİR, ELLE YAZILMAZ. Elle yazılan bir yüz kanonun eş-yetkili
//   ikizine dönüşür ve ilk tek taraflı değişiklikte hangi kopyanın güncel
//   olduğu belirsizleşir (YUZ-1.2). Bu yüzden kartın olgusal bölgesi kanondan
//   üretilir; kanon ilerlediğinde kart da ilerler ve iki metin ayrışamaz.
//
//   DESEN. Üreteç taksonomi üretecinin (cekirdek/src/siniflama.ts · taksonomiMd
//   ile taksonomiBlokUygula) desenini birebir izler: işaretli bölge idempotent
//   yazılır, işaretin dışında kalan her şey olduğu gibi korunur ve iki koşu
//   birebir aynı çıktıyı verir. Yeni bir mimari icat edilmemiştir.
//
//   ÜÇ BÖLGE. Kart üç işaretli bölgeden kurulur. KART_KUNYESI bölgesi başlığı,
//   ailenin kanonik tanımını ve üretim künyesini taşır ve üreteç tarafından
//   yazılır. ANLATI bölgesi elle yazılır; üreteç bu bölgenin sınırını hiçbir
//   koşulda geçmez, çünkü anlatı insanın işidir ve makinenin bilmediği bağlamı
//   taşır. AILE_ISKELETI bölgesi ailenin tiplerini, her tipin zorunlu alanlarını
//   ve izinli sarma ilişkilerini taşır ve yine üreteç tarafından yazılır.
//   İki üretilen bölgenin arasına elle yazılan bölgenin konması bilinçlidir:
//   okuyucu önce ailenin ne olduğunu, sonra anlatısını, en sonunda da makine
//   envanterini görür.
//
//   SINIR. Bu üreteç yalnız İSKELET yazar. Anlatı metninin kendisi bir sonraki
//   Adımın (KYN-OGR-A02) işidir; üreteç anlatı bölgesini yalnız kart ilk kez
//   doğarken yer tutucu yorumla açar ve bir daha ona dokunmaz.
// ═══════════════════════════════════════════════════════════════════════════

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  siniflamaOrtuMerge,
  siniflamaOrtuYukle,
  siniflamaYukle,
  type Siniflama,
} from "../cekirdek/src/siniflama.ts";

// ── Bölge işaretleri ────────────────────────────────────────────────────────
//    İşaret adı yalnız BÜYÜK HARF ve alt çizgi taşır, çünkü motorun bölge
//    bekçisi (cekirdek/src/denetci.ts · BOLGE_BAS) bölge adını bu alfabeyle
//    tanır; tire taşıyan bir ad bölge sayılmaz ve nöbet devre dışı kalır.

export const KUNYE_BAS = "<!-- SARMAL:KART_KUNYESI -->";
export const KUNYE_SON = "<!-- /SARMAL:KART_KUNYESI -->";
export const ANLATI_BAS = "<!-- SARMAL:ANLATI -->";
export const ANLATI_SON = "<!-- /SARMAL:ANLATI -->";
export const ISKELET_BAS = "<!-- SARMAL:AILE_ISKELETI -->";
export const ISKELET_SON = "<!-- /SARMAL:AILE_ISKELETI -->";

/** Kartların yaşadığı raf (anadizinde RAF-OGRETIM olarak ilan edilmiştir). */
export const OGRETIM_RAFI = "ogreti/ogretim";

/** Künyenin gösterdiği kanonik kaynak — kartın olgusal bölgesi buradan doğar. */
export const KAYNAK_YOLU = "oz/siniflama/kayit.json";

/**
 * İçerik mührü — kartın hangi kaynak sürümünden üretildiğini söyleyen kısa imza.
 *
 * Algoritma motorun öğretim nöbetiyle (cekirdek/src/denetci.ts · icerikOzeti)
 * AYNI olmak zorundadır, çünkü nöbet künyedeki mührü kaynağın bugünkü içeriğiyle
 * karşılaştırır ve uyuşmazsa kartı bayat ilan eder. Fonksiyon burada yeniden
 * yazılmıştır çünkü motor onu dışa açmaz; ikizin ayrışmadığı, üretilen kartların
 * gerçek motor nöbetinden geçirildiği sınamayla kanıtlanır.
 */
export function icerikMuhru(metin: string): string {
  let h = 5381;
  for (let i = 0; i < metin.length; i++) h = ((h * 33) ^ metin.charCodeAt(i)) >>> 0;
  return h.toString(16);
}

/** Bir markdown tablo hücresini güvenli hâle getirir; boru ve satır sonu kaçırılır. */
function hucre(metin: string | undefined): string {
  if (metin === undefined || metin === "") return "—";
  return metin.replace(/\|/g, "\\|").replace(/\s*\n\s*/g, " ").trim();
}

/** Bir ailenin tiplerini kanonik kayıttan, deterministik sırayla toplar. */
export function aileTipleri(snf: Siniflama, aile: string): Siniflama["widgetTipleri"] {
  return snf.widgetTipleri
    .filter((t) => t.aile === aile)
    .sort((a, b) => a.ad.localeCompare(b.ad, "tr"));
}

/** Kayıtta geçen bütün aileleri deterministik sırayla döndürür. */
export function aileler(snf: Siniflama): string[] {
  const kume = new Set<string>(snf.widgetTipleri.map((t) => t.aile));
  for (const ad of Object.keys(snf.aileler ?? {})) kume.add(ad);
  return [...kume].sort((a, b) => a.localeCompare(b, "tr"));
}

/** Bir tipin İÇİNE konabileceği kapsayıcılar — izinliSarma tablosunun tersi. */
function konabilir(snf: Siniflama, tip: string): string[] {
  return Object.entries(snf.izinliSarma)
    .filter(([, cocuklar]) => cocuklar.includes(tip))
    .map(([ebeveyn]) => ebeveyn)
    .sort((a, b) => a.localeCompare(b, "tr"));
}

/** Tipin kanonik simgesi; tip simgesi yoksa ailenin simgesine düşülür. */
function simge(snf: Siniflama, tip: string, aile: string): string {
  return snf.tipSimgeleri?.[tip] ?? snf.aileSimgeleri?.[aile] ?? "";
}

/**
 * Künye bölgesi — kartın başlığı, ailenin kanonik tanımı ve üretim beyanı.
 * Mühür kaynağın ham metninden hesaplanır, çünkü nöbet de ham metni ölçer.
 */
export function kunyeBloku(snf: Siniflama, aile: string, muhur: string): string {
  const rozet = snf.aileSimgeleri?.[aile] ?? "";
  const tanim = snf.aileler?.[aile];
  const sayi = aileTipleri(snf, aile).length;
  return [
    KUNYE_BAS,
    `# ${rozet} ${aile} ailesi — öğretim kartı`.replace(/\s+/g, " "),
    "",
    tanim
      ? `Bu aile kanonik sınıflama kaydında şöyle tanımlanır: ${tanim}. Ailede ${sayi} tip yaşar.`
      : `Ailede ${sayi} tip yaşar.`,
    "",
    `Bu kartın olgusal bölgeleri kanonik sınıflama kaydından üretilmiştir: ${KAYNAK_YOLU} · mühür: ${muhur}`,
    "",
    "Anlatı bölgesi elle yazılır ve üreteç o bölgenin sınırını geçmez. Kartı tazelemek için `node arac/ogretim-uret.ts` çalıştırılır.",
    KUNYE_SON,
  ].join("\n");
}

/**
 * Anlatı bölgesinin İLK hâli — yalnız kart ilk kez doğarken yazılır.
 * İçinde hüküm yoktur; yalnız bir sonraki Adımın neyi yazacağını gösteren yer
 * tutucu yorum bulunur, çünkü bu Adımın sınırı iskeletle biter.
 */
export function anlatiIskeleti(aile: string): string {
  return [
    ANLATI_BAS,
    "## Anlatı",
    "",
    `<!-- YER TUTUCU · KYN-OGR-A02 · Bu bölge ELLE yazılır ve üreteç ona dokunmaz.`,
    `     Açılış: ${aile} ailesinin hangi soruyu cevapladığı yazılır.`,
    `     Gövde: ailenin metaforu ve kardeş tiplerle ilişkisi anlatılır.`,
    `     Kapanış: canlı ağaçtan alınmış gerçek bir örnek gösterilir ve örneğin`,
    `     hangi dosyadan alındığı yazılır. Örnek uydurulmaz. -->`,
    ANLATI_SON,
  ].join("\n");
}

/**
 * İskelet bölgesi — ailenin tipleri, her tipin zorunlu alanları ve izinli sarma
 * ilişkileri. SAF ve deterministtir: aynı sınıflama iki kez verilirse iki koşu
 * birebir aynı metni döndürür.
 */
export function iskeletBloku(snf: Siniflama, aile: string): string {
  const tipler = aileTipleri(snf, aile);
  const tipSatirlari = tipler.map((t) => {
    const sema = snf.semalar?.[t.ad];
    const zorunlu = sema?.zorunlu?.length ? sema.zorunlu.join(" · ") : undefined;
    return `| ${simge(snf, t.ad, aile)} ${t.ad} | ${hucre(t.ne)} | ${hucre(zorunlu)} |`;
  });
  const sarmaSatirlari = tipler.map((t) => {
    const icerir = snf.izinliSarma[t.ad];
    const kapsayici = konabilir(snf, t.ad);
    return `| ${t.ad} | ${hucre(icerir?.length ? icerir.join(" · ") : undefined)} | ${hucre(kapsayici.length ? kapsayici.join(" · ") : undefined)} |`;
  });
  return [
    ISKELET_BAS,
    "## İskelet — sınıflama kaydından üretilir",
    "",
    "Aşağıdaki iki tablo makine envanteridir. Elle yapılan düzenleme bir sonraki üretimde silinir; düzeltme kanonik kayda yazılır.",
    "",
    "### Tipler ve zorunlu alanları",
    "",
    "| Tip | Ne | Zorunlu alanlar |",
    "|---|---|---|",
    ...(tipSatirlari.length ? tipSatirlari : ["| — | — | — |"]),
    "",
    "### İzinli sarma ilişkileri",
    "",
    "| Tip | İçerebilir | İçine konabilir |",
    "|---|---|---|",
    ...(sarmaSatirlari.length ? sarmaSatirlari : ["| — | — | — |"]),
    ISKELET_SON,
  ].join("\n");
}

/**
 * İşaretli bölgeyi yerinde değiştirir. Bölge yoksa metin AYNEN döner, çünkü
 * üretecin görevi var olan sınırı tazelemektir; sınırı olmayan bir metne
 * kendiliğinden bölge açmak elle yazılmış içeriği tehlikeye atar.
 */
export function bolgeUygula(mevcut: string, bas: string, son: string, blok: string): string {
  const b = mevcut.indexOf(bas);
  const s = mevcut.indexOf(son);
  if (b < 0 || s <= b) return mevcut;
  return mevcut.slice(0, b) + blok + mevcut.slice(s + son.length);
}

/**
 * Bir ailenin kart metnini üretir. Kart yoksa üç bölgeyle birlikte doğar; kart
 * varsa YALNIZ iki üretilen bölge tazelenir ve anlatı bölgesi ile bölgelerin
 * dışında kalan her şey olduğu gibi korunur.
 */
export function kartMetni(mevcut: string | undefined, snf: Siniflama, aile: string, muhur: string): string {
  const kunye = kunyeBloku(snf, aile, muhur);
  const iskelet = iskeletBloku(snf, aile);
  if (mevcut === undefined) {
    return [kunye, "", anlatiIskeleti(aile), "", iskelet, ""].join("\n");
  }
  let sonuc = bolgeUygula(mevcut, KUNYE_BAS, KUNYE_SON, kunye);
  sonuc = bolgeUygula(sonuc, ISKELET_BAS, ISKELET_SON, iskelet);
  return sonuc;
}

export interface OgretimKosusu {
  /** yazılan (değişen) kart dosyalarının kök-göreli yolları. */
  degisen: string[];
  /** içeriği zaten güncel olduğu için dokunulmayan kartlar. */
  degismeyen: string[];
  /** üretilen kart sayısı = kanondaki aile sayısı. */
  aileSayisi: number;
}

/**
 * Bütün ailelerin kartlarını üretir ve rafa yazar. Sonuç raporu değişen ile
 * değişmeyen kartları ayrı ayrı bildirir; ikinci koşuda değişen listesi boş
 * olmak zorundadır, çünkü üreteç idempotenttir.
 */
export function ogretimKartlariniUret(kokYolu: string): OgretimKosusu {
  const kok = resolve(kokYolu);
  const snf = siniflamaOrtuMerge(siniflamaYukle(join(kok, KAYNAK_YOLU)), siniflamaOrtuYukle(kok));
  const muhur = icerikMuhru(readFileSync(join(kok, KAYNAK_YOLU), "utf8"));
  const raf = join(kok, OGRETIM_RAFI);
  mkdirSync(raf, { recursive: true });
  const degisen: string[] = [];
  const degismeyen: string[] = [];
  const liste = aileler(snf);
  for (const aile of liste) {
    const goreli = `${OGRETIM_RAFI}/aile_${aile}.md`;
    const tamYol = join(raf, `aile_${aile}.md`);
    const mevcut = existsSync(tamYol) ? readFileSync(tamYol, "utf8") : undefined;
    const yeni = kartMetni(mevcut, snf, aile, muhur);
    if (mevcut === yeni) degismeyen.push(goreli);
    else { writeFileSync(tamYol, yeni, "utf8"); degisen.push(goreli); }
  }
  return { degisen, degismeyen, aileSayisi: liste.length };
}

// ── CLI kabuğu: `node arac/ogretim-uret.ts [kök]` ───────────────────────────
//    Kök verilmezse bu betiğin üst dizini (açık aracın kökü) varsayılır.
if (import.meta.url === `file://${process.argv[1]}`) {
  const kok = process.argv[2] ?? resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
  const kosu = ogretimKartlariniUret(kok);
  if (kosu.degisen.length === 0) {
    console.log(`✅ öğretim kartları güncel — ${kosu.aileSayisi} aile, ${kosu.degismeyen.length} kart değişmedi (idempotent).`);
  } else {
    console.log(`🎓 öğretim kartları tazelendi → ${kosu.degisen.length}/${kosu.aileSayisi} kart yazıldı (kaynak: ${KAYNAK_YOLU}).`);
    for (const yol of kosu.degisen) console.log(`   • ${yol}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// tren-gorunum.ts — 🪪 TREN SEKMESİNİN AJAN ŞEMASI VE PROFİL KARTI (PNL-A11 · SAF)
//
//   Founder 2026-10-23 ve 2026-10-27 (OZK-13 DÖRDÜNCÜSÜ): Tren sekmesinin ana
//   görünümü ajanların şirket şemasıdır. En üstte lider ajan (apex) durur; altında
//   ajanlar ilan edildikleri departmanlara ayrılır ve her yöneticinin altında
//   ekibi durur. Founder 2026-10-28 tarihinde önizlemeden düzeni seçmiştir:
//   departman sütunları, daraltılabilir ekipler, açılan ekibin üyeleri Ray'deki
//   bağımlılık iplikleri gibi yelpaze biçimli eğrilerle bağlanır, profil kartı
//   sağdadır; boş lider ajan yuvası ve "yöneticisi yok" işaretleri kalır.
//
//   KURALLAR:
//     · Örgüt yalnız `yönetir` kenarından kurulur (çatı hükmü H8); yetki kademesi
//       konum belirlemez ve elle tutulan bir liste yoktur. Bir ajanın birden çok
//       yöneticisi varsa kaynak sırasındaki ilk yönetici geçerlidir.
//     · Kayıtlı her ajan şemada tam bir kez görünür. Yöneticisi kayıtlı olmayan
//       ajan "yöneticisi yok" diye işaretlenir; apex'in yönettiği ajan işaretlenmez.
//       Döngüye düşen ajanlar da kaybolmaz, kendi departmanlarında kök olarak durur.
//     · Departman adı panelde sabit yazılmaz: ajanın ilan edildiği Raf ya da
//       Kitaplık ilanının metninden okunur (tren-cekirdek.ts `ilanAdi`). Departman
//       sırası ilanların kaynak sırasıdır.
//     · Webview dosya yolu göndermez. Kartın ve şemanın her satırı bir ANAHTAR
//       taşır (`e|KOD`, `a|KOD|alan`, `u|KOD|i` …); eklenti anahtarı kendi
//       özetinden `trenGitKonumu` ile çözer ve dosyayı ilgili satırda açar.
//
//   Bu dosya VS Code'u tanımaz; çizim panel-cekirdek.ts'nin Tren bölümüne girer,
//   istemci betiği ve stili tren-betik.ts dosyasındadır.
// ═══════════════════════════════════════════════════════════════════════════

import {
  ALT_DUGUM_TIPLERI, type TrenEtmeni, type TrenHedef, type TrenOzeti, type TrenRaf,
} from "./tren-cekirdek.ts";
import { PANEL_METINLERI, TREN_METINLERI } from "./yuzey-metinleri.ts";

/** HTML metni ve nitelik değeri için kaçırma (panel-cekirdek.ts `kacir` ile aynı kural; döngüsel bağımlılık olmasın diye burada). */
function kac(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Öğe METNİ için kaçırma: yalnız `&`, `<` ve `>`; tırnaklar metin içinde anlam taşımaz (kart verisi böyle küçük kalır). */
function metinKac(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ── GÖRÜNÜMLER ──────────────────────────────────────────────────────────────

/**
 * Şirket şemasının görünümleri (Founder 2026-10-28 · PNL-A11). Founder üç görünüme (şeritler, sütunlar, kart
 * ızgarası) hükmetmiştir; kullanım sınırı yüzünden bu turda yalnız varsayılan olan şeritler yazılmıştır, öteki
 * ikisi bu listeye ve stile eklenecektir. Bütün görünümler AYNI HTML'i paylaşır; görünüm yalnız şemanın
 * kabındaki `data-gorunum` niteliğidir ve dizilişi stil belirler (tren-betik.ts), bu yüzden görünümler aynı
 * ajan ve bağ kümesini çizer ve ayar değişince içerik yeniden üretilmeden geçilir. Ayarın adı
 * `sarmal.trenSemaGorunum`dur (package.json); Ayarlar sekmesinin Görünüm bölümü (PNL-A10) aynı adı okur.
 */
export const TREN_SEMA_GORUNUMLERI = ["seritler"] as const;
export type TrenSemaGorunumu = (typeof TREN_SEMA_GORUNUMLERI)[number];
/** Ayardan okunan değer güvenilmez: bilinmeyen ya da bozuk değer varsayılana (şeritler) düşer. */
export function trenSemaGorunumNormalle(v: unknown): TrenSemaGorunumu {
  return (TREN_SEMA_GORUNUMLERI as readonly unknown[]).includes(v) ? (v as TrenSemaGorunumu) : "seritler";
}

// ── ÖRGÜT ───────────────────────────────────────────────────────────────────

/** Şemada bir ajan ve (varsa) yönettiği ekip. */
export interface SemaGrubu {
  etmen: TrenEtmeni;
  astlar: SemaGrubu[];
  /** Yöneticisi kayıtlı değil (apex'in yönettiği ajan bu işareti taşımaz). */
  yoneticisiz: boolean;
}

export interface SemaDepartmani {
  /** İlan edilmiş Raf ya da Kitaplık; tanımsızsa ajanın dosyası hiçbir ilanın altında değildir. */
  raf?: TrenRaf;
  gruplar: SemaGrubu[];
  /** Departmandaki ajan sayısı (ekipler dâhil). */
  ajan: number;
}

export interface TrenSemasi {
  apexler: SemaGrubu[];
  departmanlar: SemaDepartmani[];
  /** Ajan kodu → yöneticisinin kodu (`yönetir` kenarının ilk sahibi). */
  ust: ReadonlyMap<string, string>;
  /** Ajan kodu → ajan (aynı kodun ilk ilanı). */
  ajanlar: ReadonlyMap<string, TrenEtmeni>;
  sayac: { toplam: number; yonetici: number; uzman: number; apex: number; yoneticisiz: number };
}

const TUR_SIRASI: Readonly<Record<string, number>> = { apex: 0, "yönetici": 1, uzman: 2 };

/**
 * Ajanların şirket şeması. Ajan kimliği koddur; aynı kod iki kez ilan edilmişse ilki geçerlidir.
 * `yönetir` hedefi ajanla tanım yerinden eşleşir, böylece ad alanlı yazım da doğru ajana bağlanır.
 */
export function trenSemasi(o: TrenOzeti): TrenSemasi {
  const ajanlar: TrenEtmeni[] = [];
  const kodla = new Map<string, TrenEtmeni>();
  for (const e of o.etmenler) if (!kodla.has(e.kod)) { kodla.set(e.kod, e); ajanlar.push(e); }
  const yerle = new Map(ajanlar.map((e) => [`${e.dosya}:${e.satir}`, e]));
  const hedefAjan = (h: TrenHedef): TrenEtmeni | undefined =>
    (h.tip === "Etmen" && h.dosya !== undefined ? yerle.get(`${h.dosya}:${h.satir}`) : undefined) ?? kodla.get(h.kod);

  // Kaynak sırası: dosya, sonra satır (özet koda göre dizilidir; ilk yönetici kuralı kaynağa bakar).
  const kaynakSirasi = [...ajanlar].sort((a, b) => a.dosya.localeCompare(b.dosya) || a.satir - b.satir);
  const ust = new Map<string, string>();
  const astKodlari = new Map<string, string[]>();
  for (const e of kaynakSirasi) {
    for (const h of e.yonetir) {
      const a = hedefAjan(h);
      if (!a || a.kod === e.kod || ust.has(a.kod)) continue;
      ust.set(a.kod, e.kod);
      astKodlari.set(e.kod, [...(astKodlari.get(e.kod) ?? []), a.kod]);
    }
  }
  const apexMi = (e: TrenEtmeni): boolean => e.tur === "apex";
  const goruldu = new Set<string>();
  const grupKur = (e: TrenEtmeni): SemaGrubu => {
    goruldu.add(e.kod);
    const astlar = (astKodlari.get(e.kod) ?? []).map((k) => kodla.get(k)!)
      .filter((a) => !goruldu.has(a.kod) && !apexMi(a)).map(grupKur);
    return { etmen: e, astlar, yoneticisiz: !ust.has(e.kod) };
  };
  const apexler = ajanlar.filter(apexMi).map((e) => { goruldu.add(e.kod); return { etmen: e, astlar: [], yoneticisiz: !ust.has(e.kod) }; });

  // Departmanlar: ilanın kaynak sırası; ilansız ajanlar sona.
  const depAnahtari = (r: TrenRaf | undefined): string => (r ? `${r.dosya}:${r.satir}:${r.kod}` : "");
  const depler = new Map<string, SemaDepartmani>();
  const depAl = (e: TrenEtmeni): SemaDepartmani => {
    const k = depAnahtari(e.departman);
    let d = depler.get(k);
    if (!d) { d = { raf: e.departman, gruplar: [], ajan: 0 }; depler.set(k, d); }
    return d;
  };
  const kokSirasi = (a: TrenEtmeni, b: TrenEtmeni): number =>
    Number(astKodlari.has(b.kod)) - Number(astKodlari.has(a.kod))
    || (TUR_SIRASI[a.tur] ?? 3) - (TUR_SIRASI[b.tur] ?? 3) || a.kod.localeCompare(b.kod, "tr");
  // Kök: yöneticisi olmayan ya da apex'in yönettiği ajan.
  const kokMu = (e: TrenEtmeni): boolean => { const u = ust.get(e.kod); return u === undefined || apexMi(kodla.get(u)!); };
  for (const e of ajanlar.filter((x) => !apexMi(x) && kokMu(x)).sort(kokSirasi)) depAl(e).gruplar.push(grupKur(e));
  // Döngüye düşen (hiçbir kökten erişilemeyen) ajanlar da şemada durur.
  for (const e of ajanlar.filter((x) => !goruldu.has(x.kod)).sort(kokSirasi)) if (!goruldu.has(e.kod)) depAl(e).gruplar.push(grupKur(e));
  const say = (g: SemaGrubu): number => 1 + g.astlar.reduce((n, a) => n + say(a), 0);
  for (const d of depler.values()) d.ajan = d.gruplar.reduce((n, g) => n + say(g), 0);
  const departmanlar = [...depler.values()].sort((a, b) =>
    (a.raf ? 0 : 1) - (b.raf ? 0 : 1) || (a.raf?.dosya ?? "").localeCompare(b.raf?.dosya ?? "") || (a.raf?.satir ?? 0) - (b.raf?.satir ?? 0));
  const yoneticisiz = ajanlar.filter((e) => !apexMi(e) && !ust.has(e.kod)).length;
  return {
    apexler, departmanlar, ust, ajanlar: kodla,
    sayac: {
      toplam: ajanlar.length, apex: apexler.length, yoneticisiz,
      yonetici: ajanlar.filter((e) => e.tur === "yönetici").length, uzman: ajanlar.filter((e) => e.tur === "uzman").length,
    },
  };
}

// ── GEZİNME ANAHTARI ────────────────────────────────────────────────────────

/** Kartın skaler alanları (anahtardaki ad → özetteki alan). */
const ALAN_ADLARI = { uzmanlik: "uzmanlik", yetki: "yetki", bellek: "bellek", ne: "ne", sinir: "sinir" } as const;
type AlanAdi = keyof typeof ALAN_ADLARI;

/**
 * Webview'den gelen gezinme anahtarını özetten çözer; çözülemeyen ya da biçimsiz anahtar `undefined`
 * döner ve hiçbir dosya açılmaz. Anahtarlar:
 *   e|KOD           ajanın tanımı
 *   a|KOD|alan      skaler alanın satırı (uzmanlik · yetki · bellek · ne · sinir · uygular · yonetir)
 *   u|KOD|i         `uygular` hedefinin tanımı (çözülemezse alanın satırı)
 *   y|KOD|i         `yönetir` hedefinin tanımı (çözülemezse alanın satırı)
 *   c|KOD|i         i'nci alt düğümün tanımı (ajanın dosyasında)
 *   r|KOD|d         ajanın departman (d) ya da ekip (k) ilanı
 */
export function trenGitKonumu(o: TrenOzeti, anahtar: unknown): { dosya: string; satir: number } | undefined {
  if (typeof anahtar !== "string" || anahtar.length > 400) return undefined;
  const [tur, kod, ek] = anahtar.split("|");
  const e = o.etmenler.find((x) => x.kod === kod);
  if (!e) return undefined;
  const yer = (satir: number | undefined) => (satir ? { dosya: e.dosya, satir } : undefined);
  const hedefYeri = (h: TrenHedef | undefined, alanSatiri: number | undefined) =>
    h?.dosya !== undefined && h.satir !== undefined ? { dosya: h.dosya, satir: h.satir } : h ? yer(alanSatiri) : undefined;
  const sira = Number(ek);
  switch (tur) {
    case "e": return yer(e.satir);
    case "a":
      if (ek === "uygular") return yer(e.uygularSatir);
      if (ek === "yonetir") return yer(e.yonetirSatir);
      return ek && ek in ALAN_ADLARI ? yer(e.alanlar[ek as AlanAdi]?.satir) : undefined;
    case "u": return Number.isInteger(sira) ? hedefYeri(e.uygular[sira], e.uygularSatir) : undefined;
    case "y": return Number.isInteger(sira) ? hedefYeri(e.yonetir[sira], e.yonetirSatir) : undefined;
    case "c": return Number.isInteger(sira) ? yer(e.altlar[sira]?.satir) : undefined;
    case "r": {
      const r = ek === "k" ? e.ekip : ek === "d" ? e.departman : undefined;
      return r ? { dosya: r.dosya, satir: r.satir } : undefined;
    }
    default: return undefined;
  }
}

// ── ÇİZİM ───────────────────────────────────────────────────────────────────

const turSinifi = (e: TrenEtmeni): string => (e.tur === "apex" ? "t-a" : e.tur === "yönetici" ? "t-y" : "t-u");
const gorunenAd = (e: TrenEtmeni): string => e.ad || e.kod;
const say = (g: SemaGrubu): number => g.astlar.reduce((n, a) => n + 1 + say(a), 0);
/** Yetki rozeti: kademe sınıfı rengi taşır (L1–L6); ilan edilmemiş yetki "?" yazar. */
function yetkiRozeti(e: TrenEtmeni): string {
  const y = e.alanlar.yetki?.deger;
  const sinif = y && /^L[1-6]$/.test(y) ? ` yk-${y}` : "";
  return `<span class="rz-l${sinif}" title="${kac(TREN_METINLERI.yetkiIpucu(y ?? ""))}">${kac(y || "?")}</span>`;
}
/**
 * "Makinist'e bağlı" işareti (Founder · OZK-16): lider ajan koltuğunda ve denetim gözlerinde durur; insanlar,
 * koltukları ve onayları Makinist sekmesinin işidir (OZK-15). Denetim gözü kanonun kuralıyla tanınır: L5 yetki
 * yalnız denetim ailesine verilir (ORK-6.3 · rbac).
 */
const makinistIsareti = (): string =>
  `<span class="rz-m" title="${kac(TREN_METINLERI.makinisteBagliIpucu)}">${kac(TREN_METINLERI.makinisteBagli)}</span>`;
const makinisteBagliMi = (e: TrenEtmeni): boolean => e.tur === "apex" || e.alanlar.yetki?.deger === "L5";
/** Sınır işaretleri: bellek izole ise kilit, `sınır` alanı ilan edilmişse kalkan. */
function sinirIsaretleri(e: TrenEtmeni): string {
  return (e.alanlar.bellek?.deger === "izole" ? `<i class="tr-isr tr-kilit" title="${kac(TREN_METINLERI.izoleIpucu)}"></i>` : "")
    + (e.alanlar.sinir ? `<i class="tr-isr tr-kalkan" title="${kac(TREN_METINLERI.sinirIpucu(e.alanlar.sinir.deger))}"></i>` : "");
}

/** Ajan kutusu: ad, yetki rozeti, ekip sayısı ve ikinci satırda ekip adı ya da kod; kökte "yöneticisi yok". */
function kutuHtml(g: SemaGrubu, ustKod: string): string {
  const e = g.etmen;
  const n = say(g);
  const ikinci = e.tur !== "uzman" && e.ekip ? e.ekip.ad : e.kod;
  return `<button type="button" class="ajan ${turSinifi(e)}" data-kod="${kac(e.kod)}"${ustKod ? ` data-ust="${kac(ustKod)}"` : ""}`
    + ` title="${kac([e.kod, e.ne].filter(Boolean).join(" · "))}">`
    + `<span class="aj-ust"><span class="aj-ad">${kac(gorunenAd(e))}</span><span class="aj-rz">`
    + (n ? `<span class="rz-n" title="${kac(TREN_METINLERI.ekipSayisi(n))}">${n}</span>` : "")
    + yetkiRozeti(e)
    + `</span></span><span class="aj-alt"><span class="aj-alt-m">${kac(ikinci)}</span>${sinirIsaretleri(e)}${makinisteBagliMi(e) ? makinistIsareti() : ""}`
    + (g.yoneticisiz ? `<span class="rz-y">${kac(TREN_METINLERI.yoneticisiYok)}</span>` : "")
    + `</span></button>`;
}

/** Ekip üyesi çipi (yönettiği kimse yoksa); yöneten üye kendi grubunu taşır. */
function cipHtml(e: TrenEtmeni, ustKod: string): string {
  return `<button type="button" class="cip ${turSinifi(e)}" data-kod="${kac(e.kod)}" data-ust="${kac(ustKod)}" title="${kac([e.kod, e.ne].filter(Boolean).join(" · "))}">`
    + `<span class="cp-ad">${kac(gorunenAd(e))}</span>${sinirIsaretleri(e)}${makinisteBagliMi(e) ? makinistIsareti() : ""}${yetkiRozeti(e)}</button>`;
}

/** Bir grup: kutu, daraltılmış ekip ve açma düğmesi. Ekip varsayılan olarak kapalıdır. */
function grupHtml(g: SemaGrubu, ustKod: string): string {
  const n = g.astlar.length;
  const astlar = g.astlar.map((a) => (a.astlar.length ? grupHtml(a, g.etmen.kod) : cipHtml(a.etmen, g.etmen.kod))).join("");
  return `<div class="tr-grup" data-grup="${kac(g.etmen.kod)}">${kutuHtml(g, ustKod)}`
    + (n ? `<div class="tr-astlar" hidden>${astlar}</div>`
      + `<button type="button" class="tr-ac" data-grup-ac="${kac(g.etmen.kod)}" aria-expanded="false"`
      + ` data-ac-metni="${kac(TREN_METINLERI.ekibiGoster(n))}" data-kapa-metni="${kac(TREN_METINLERI.ekibiDaralt)}">${kac(TREN_METINLERI.ekibiGoster(n))}</button>`
      : "")
    + `</div>`;
}

/** Kartın skaler alanlarının sırası: anahtardaki ad ve metin kataloğundaki ad. */
const KART_ALANLARI = [["uzmanlik", "uzmanlık"], ["yetki", "yetki"], ["bellek", "bellek"], ["ne", "ne"], ["sinir", "sınır"]] as const;

/**
 * Bir ajanın profil kartının verisi (PNL-A11). Kart sunucuda çizilmez: 138 ajanlık bir kadroda önceden
 * çizilmiş kartlar yaklaşık 900 KB tutuyordu (2026-10-28 ölçümü). Veri bu sıkı biçimle webview'e gider ve
 * kart ajan seçilince istemcide yalnız `textContent` ile kurulur (tren-betik.ts `kartKur`); gezinme
 * anahtarları istemcide `kartAnahtarlari` ile aynı kalıpla yazılır.
 *   k kod · a görünen ad · t tür · s tür sınıfı · f beş alan ([anahtar, değer] ya da null; sıra KART_ALANLARI)
 *   u ve y kenar hedefleri ([ad, çözüldü mü]) · uv ve yv alanın satırı var mı
 *   c alt düğümler ([tip sırası, kod, ad]) · d ve e departman ve ekip adı · m yönetici [kod, ad] · n yöneticisi yok
 *   p yol satırı: en üstteki yöneticiden doğrudan yöneticiye kadar zincir ([kod, ad]) · l lider ajan (apex) adı ya da null
 */
export interface KartVerisi {
  k: string; a: string; t: string; s: string;
  f: Array<[string, string] | null>;
  u: Array<[string, 0 | 1]>; uv: 0 | 1;
  y: Array<[string, 0 | 1]>; yv: 0 | 1;
  c: Array<[number, string, string]>;
  d: string | null; e: string | null;
  m: [string, string] | null; n: 0 | 1;
  p: Array<[string, string]>; l: string | null;
}

/** Ajanın yönetim zinciri: en üstteki yöneticiden doğrudan yöneticisine (yalnız `yönetir` kenarı; döngüde durur). */
export function yonetimZinciri(e: TrenEtmeni, s: TrenSemasi): TrenEtmeni[] {
  const zincir: TrenEtmeni[] = [];
  const goruldu = new Set([e.kod]);
  for (let u = s.ust.get(e.kod); u && !goruldu.has(u); u = s.ust.get(u)) {
    goruldu.add(u);
    const a = s.ajanlar.get(u);
    if (!a) break;
    zincir.unshift(a);
  }
  return zincir;
}

export function kartVerisi(e: TrenEtmeni, s: TrenSemasi): KartVerisi {
  const ustKod = s.ust.get(e.kod);
  const ust = ustKod ? s.ajanlar.get(ustKod) : undefined;
  const hedefler = (l: TrenHedef[]): Array<[string, 0 | 1]> => l.map((h) => [h.ad || h.kod, h.dosya === undefined ? 0 : 1]);
  return {
    k: e.kod, a: gorunenAd(e), t: e.tur, s: turSinifi(e),
    f: KART_ALANLARI.map(([anahtar]) => { const x = e.alanlar[anahtar]; return x ? [anahtar, x.deger] as [string, string] : null; }),
    u: hedefler(e.uygular), uv: e.uygularSatir ? 1 : 0,
    y: hedefler(e.yonetir), yv: e.yonetirSatir ? 1 : 0,
    c: e.altlar.map((a) => [ALT_DUGUM_TIPLERI.indexOf(a.tip), a.kod, a.ad]),
    d: e.departman?.ad ?? null, e: e.ekip?.ad ?? null,
    m: ust ? [ust.kod, gorunenAd(ust)] : null,
    n: !ust && e.tur !== "apex" ? 1 : 0,
    p: yonetimZinciri(e, s).map((x) => [x.kod, gorunenAd(x)] as [string, string]),
    l: e.tur === "apex" ? null : s.apexler[0] ? gorunenAd(s.apexler[0].etmen) : null,
  };
}

/**
 * Kartın tanımına götüren bütün satırlarının anahtarları, istemcinin kurduğu sırayla: kod satırı,
 * departman ve ekip, ilan edilmiş alanlar, uygular ve yönetir alanları ile hedefleri, alt düğümler.
 * Nöbet her anahtarın `trenGitKonumu` ile kaynaktaki doğru satıra çözüldüğünü ölçer.
 */
export function kartAnahtarlari(e: TrenEtmeni): string[] {
  const k = e.kod;
  return [
    `e|${k}`,
    ...(e.departman ? [`r|${k}|d`] : []), ...(e.ekip ? [`r|${k}|k`] : []),
    ...KART_ALANLARI.filter(([a]) => e.alanlar[a]).map(([a]) => `a|${k}|${a}`),
    ...(e.uygular.length && e.uygularSatir ? [`a|${k}|uygular`] : []), ...e.uygular.map((_, i) => `u|${k}|${i}`),
    ...(e.yonetir.length && e.yonetirSatir ? [`a|${k}|yonetir`] : []), ...e.yonetir.map((_, i) => `y|${k}|${i}`),
    ...e.altlar.map((_, i) => `c|${k}|${i}`),
  ];
}

/** Kartın istemcide kullandığı metinler (dil kataloğundan; istemci metin üretmez). */
function kartMetinleri(): Record<string, unknown> {
  return {
    alan: [...KART_ALANLARI.map(([, ad]) => TREN_METINLERI.alanAdi(ad)), TREN_METINLERI.alanAdi("uygular"), TREN_METINLERI.alanAdi("yönetir")],
    liderYok: TREN_METINLERI.liderYok, yolEtiketi: TREN_METINLERI.yolEtiketi,
    alt: ALT_DUGUM_TIPLERI.map((t) => TREN_METINLERI.altTipAdi(t)),
    ilanEdilmemis: TREN_METINLERI.ilanEdilmemis, yoneticisi: TREN_METINLERI.yoneticisi,
    yoneticisiYok: TREN_METINLERI.yoneticisiYok, tanimaGit: TREN_METINLERI.tanimaGit,
  };
}

/** Tren şemasının iki parçası: sol sütundaki şema ve sağ sütundaki profil bölümü. */
export interface TrenSemaHtml { sema: string; profil: string; ajan: number }

/**
 * Ajan şemasının ve profil kartlarının HTML'i. Ajan yoksa şema kısa bir cümle taşır. Görünüm yalnız şemanın
 * kabındaki niteliktir; görünümlerin HTML'i bu nitelik dışında birebir aynıdır.
 */
export function trenSemaHtml(o: TrenOzeti, gorunum: TrenSemaGorunumu = "seritler"): TrenSemaHtml {
  const s = trenSemasi(o);
  const baslik = TREN_METINLERI.ajanlarBasligi.toLocaleUpperCase(PANEL_METINLERI.dil);
  const profilBasligi = TREN_METINLERI.profilBasligi.toLocaleUpperCase(PANEL_METINLERI.dil);
  if (!s.sayac.toplam) {
    return {
      ajan: 0,
      sema: `<h2 class="bas">${kac(baslik)}</h2><p class="bos tr-ajan-yok">${kac(TREN_METINLERI.ajanYok)}</p>`,
      profil: "",
    };
  }
  const lejant = `<span class="lej">${(["apex", "yönetici", "uzman"] as const).map((t) =>
    `<span><i class="${t === "apex" ? "t-a" : t === "yönetici" ? "t-y" : "t-u"}"></i>${kac(TREN_METINLERI.turAdi(t))}</span>`).join("")}`
    + `<span><span class="rz-y">${kac(TREN_METINLERI.yoneticisiYok)}</span> ${s.sayac.yoneticisiz}</span></span>`;
  const apex = s.apexler.length
    ? `<div class="tr-apex-kutular">${s.apexler.map((g) => kutuHtml(g, "")).join("")}</div>`
    : `<div class="tr-apex-yuva">${kac(TREN_METINLERI.liderYok)}${makinistIsareti()}</div>`;
  const depler = s.departmanlar.map((d, i) => {
    const ad = d.raf ? d.raf.ad : TREN_METINLERI.rafsiz;
    const ilk = d.gruplar[0]?.etmen;
    const bas = d.raf && ilk
      ? `<span class="tr-dep-ad" role="button" tabindex="0" data-git="${kac(`r|${ilk.kod}|d`)}" title="${kac(TREN_METINLERI.tanimaGit)}">${kac(ad)}</span>`
      : `<span class="tr-dep-ad">${kac(ad)}</span>`;
    return `<div class="tr-dep" data-dep="${i}" style="--n:${Math.min(6, Math.max(1, d.gruplar.length))}">`
      + `<div class="tr-dep-bas">${bas}<span class="tr-dep-say">${kac(TREN_METINLERI.ajanSayisi(d.ajan))}</span></div>`
      + `<div class="tr-izgara">${d.gruplar.map((g) => grupHtml(g, s.ust.get(g.etmen.kod) ?? "")).join("")}</div></div>`;
  }).join("");
  const sema = `<h2 class="bas">${kac(baslik)}<span class="say">${kac(TREN_METINLERI.semaSayaci(s.sayac.toplam, s.sayac.yonetici, s.sayac.uzman))}</span>${lejant}</h2>`
    + `<div class="tr-sema" id="tren-sema" data-gorunum="${trenSemaGorunumNormalle(gorunum)}"><svg class="tr-iplik" aria-hidden="true"></svg><div class="tr-apex">${apex}</div>`
    + `<div class="tr-depler">${depler}</div></div>`;
  const veri = { m: kartMetinleri(), a: [...s.ajanlar.values()].map((e) => kartVerisi(e, s)) };
  const profil = `<section class="tr-bolum tr-profil"><h2 class="bas">${kac(profilBasligi)}</h2>`
    + `<p class="bos tr-profil-ipucu">${kac(TREN_METINLERI.profilIpucu)}</p><div class="tr-kart-yuva"></div>`
    + `<div id="tren-veri" hidden>${metinKac(JSON.stringify(veri))}</div></section>`;
  return { sema, profil, ajan: s.sayac.toplam };
}

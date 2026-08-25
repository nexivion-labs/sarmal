// ═══════════════════════════════════════════════════════════════════════════
// siniflama.ts — SNF-0 tip sistemini yükle
//
//   Kaynak gerçek: oz/siniflama/kayit.json (ikizi kayit.md). Doğrulayıcı
//   ağacı buna karşı denetler: geçerli tip? geçerli kenar? izinli-sarma?
// ═══════════════════════════════════════════════════════════════════════════

import { readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";

// KÖKEN ALANI (MDR-A06 tasarım kararı): `ne` insan-görünür tanımdır ve iç karar
// numarası taşımaz — hover, tamamlama ve panel bu alanı basar. Tanımın hangi
// karardan doğduğu `koken` dizisinde, çıplak KOD literalleri olarak yaşar; bu
// alan yalnız ajan yüzüdür (MCP/graf), hiçbir kullanıcı metnine basılmaz.
// ÇAPRAZ ROL (TIP-1.16): bir tip ana ailesini korurken çapraz rol sorgularında
// da bulunabilir (örn. Sözleşme urun ailesinde kalır, yuzey+arkayuz rollerinde
// indekslenir). Alan adı `caprazRoller`dır çünkü `rol:` adı AltKatman şema
// kuralıyla (MIM-1.5) RBAC/ajan rolüne rezervedir; izinli belirteçler
// kayit.json `caprazRolKumeleri.izinliRoller` kataloğunda yaşar.
export interface WidgetTipi { ad: string; aile: string; caprazRoller?: string[]; ne: string; koken?: string[]; }
export interface KenarTipi { ad: string; yon: string; ne: string; koken?: string[]; }
export interface YuzeyKurali { duzen: string[]; yaprak: string[]; kural: string; }

export interface Siniflama {
  widgetTipleri: WidgetTipi[];
  kenarTipleri: KenarTipi[];
  izinliSarma: Record<string, string[]>;
  yuzeyKurali: YuzeyKurali;
  /** aile adı → açıklama (TIP-1 aile-geçersiz denetimi buradan). */
  aileler?: Record<string, string>;
  /** TIP-1.16 çapraz rol kümeleri kataloğu: yalnız izinli rol belirteçlerini
   *  sayar; tip başına üyelik widgetTipleri[].caprazRoller alanında yaşar. */
  caprazRolKumeleri?: { not?: string; izinliRoller: string[] };
  /** aile → simge (örn. davranis→💠, urun→🍎) — hover/tamamlama rozetleri. */
  aileSimgeleri?: Record<string, string>;
  /** tip → simge geçersiz-kılma (ağaç kanonu MIM-1: Blok→🪵 · Faz→🌀 · Katman→🌿 · Adım→🍃).
   *  Yaşadığı yüzeyler: hover/tamamlama/koni-kartı — PANEL DEĞİL (YUZ-4.2; kanon tipSimgeleriNot). */
  tipSimgeleri?: Record<string, string>;
  /** tip → zorunlu-alan şeması (şema-zorlaması: eksik-alan tanısı). */
  ortakEnum?: Record<string, string[]>;
  semalar?: Record<string, Sema>;
  /** RBAC yetki kademeleri sözlüğü (L1–L6 → açıklama) — tamamlama + ipucu TEK
   *  kaynaktan okur (EKL-F9-A10: yetki tutarsızlığı kanona bağlandı). */
  yetkiSozlugu?: Record<string, string>;
  /** tip → zorunlu-kenar kuralları (TIP-2.3 · CUE `!` ödünç · kör drift kalkanı):
   *  davranış/kavuşum kenarı eksikse özel uyarı (öksüz-düğme · kavuşumsuz-ekran ·
   *  sözleşmesiz-uç). Şemadan bağımsızdır — yüzey yaprakları da denetlenir. */
  zorunluKenarlar?: Record<string, ZorunluKenar[]>;
  /** Adım durum-geçiş makinesi (TUR-2 · Founder kilidi): meşru/bilgi/yasak
   *  tabloları — yazıcılar yaz-anında RED, denetim gayrimeşru-geçiş buradan.
   *  Gömülü ikizi cekirdek/durum.ts YEDEK_GECISLER (nöbet testi birebir tutar). */
  durumGecisleri?: { ["meşru"]: Record<string, string[]>; bilgi: Record<string, string[]>; yasak: Record<string, string[]> };
  /** RF-T6-A05 tip-doğum kapısı (Founder onayı 2026-07-14): canlı bahçede sıfır
   *  kullanımı MEŞRU olan tipler → gerekçe (dış-proje/OS-vadeli/A04-bekleyen).
   *  kullanımsız-tip bekçisi buradakileri susturur; beyansız sıfır-kullanım = BİLGİ. */
  tipMuafiyetleri?: Record<string, string>;
  /** TAS-A01 token-ROL sözleşmesi: Tema rol ADLARININ tek kaynağı (renk·tipografi·
   *  boşluk·yuvarlaklık). İFADE PALETİ — öneri listesi, rijit enum DEĞİL (geçersiz-enum
   *  basılmaz); DEĞERLER (hex/px) teknoloji temasında yaşar, yeri `dosya:` beyanında. */
  temaRolleri?: Record<string, string[] | string>;
  /** EMJ-A04/A05 etmen karne skalası (Founder-onaylı kanon 2026-07-18): ⭐ beş
   *  derece + ölçülen bileşen beyanları. Ağırlık/formül STR-3 gereği burada YAŞAMAZ
   *  (gizli politika); yüzeyler boş sicilde uydurma derece BASAMAZ. */
  karneSkalasi?: { not?: string; birim: string; dereceler: Record<string, string>; bilesenler: Record<string, string> };
  /** renk kanonu (EKL-F3-A01): eklenti renkleri buradan URETILIR — tek doğruluk kaynağı.
   *  kodOnekleri: "ETM|ORK|ANY" → hex (K2 imza renkleri; renk.ts önek eşlemesi buradan okur). */
  renkPaleti?: {
    kodOnekleri?: Record<string, string>;
    sadeRenkler?: Record<string, string>;
    aileler?: Record<string, string>;
    agacRenkleri?: Record<string, string>;
    driftRozetleri?: Record<string, string>;
  };
}

/**
 * Zorunlu-kenar kuralı (TIP-2.3 · CUE'nun `!` işaretinin ödüncü): bir tip, gruptan
 * EN AZ BİR davranış/kavuşum kenarını taşımak zorundadır; yoksa özel tanı (uyarı).
 * Örn. Düğme → çağırır|gider|gönderir|eylem (öksüz-düğme) · Uç → sözleşme.
 */
export interface ZorunluKenar {
  /** gruptan en az biri düğümde bulunmalı (parametre veya özellik). */
  grup: string[];
  /** tanı kodu (öksüz-düğme · kavuşumsuz-ekran · sözleşmesiz-uç · konisiz-adım). */
  tanı: string;
  /** eksiklik açıklaması (Türkçe — "…" ile "d.ad" arasına yerleşir). */
  mesaj: string;
  /** düzeltme önerisi. */
  öneri: string;
  /** bağlam-duyarlı: YALNIZ bu alan bu değerlerden birindeyse denetle (yoksa her
   *  zaman). Örn. konisiz-adım yalnız durum ∈ {geliştirmede,tamamlandı} — beklemede
   *  backlog iskeleti muaf ("BİTMİŞ sanılmasın", YAS-3.4 iskelet=meşru · olgun=denetle). */
  ancak?: { alan: string; değerler: string[] };
  /** tanı düzeyi (STR-4 kademe deseni): v1 kural uyarıyla yaşar, repo yeşilken
   *  hata'ya terfi edilir. Verilmezse uyarı. */
  düzey?: "hata" | "uyarı" | "bilgi";
}

/** Bir widget tipinin alan sözleşmesi (TIP-2 · DIL-3 format kilitleri). */
export interface Sema {
  /** her koşumda gerekli alanlar (parametre veya özellik). */
  zorunlu: string[];
  /** bir alan belirli değere sahipse ek gerekli alanlar (örn. Bellek tür:ders → neden). */
  kosullu?: { alan: string; deger: string; gerekli: string[] }[];
  /** her gruptan en az biri tam olmalı (örn. Sözleşme: alanlar VEYA istek VEYA yanıt). */
  enAzBiri?: string[][];
  /** düğüm zengin belge bloğu (-->| … |<--) taşımalı — Beceri/Yetenek skill kalitesi (YAS-4). */
  belgeZorunlu?: boolean;
  /** belge bloğunda bulunması ZORUNLU "## Bölüm" başlıkları — anlatı standardı
   *  (EKL-F2-A02): olgu parametrede, muhakeme belgede (örn. Blok → Amaç·Kapsam·Sonuç). */
  bolumZorunlu?: string[];
  birindenBiri?: string[][];
  /** alan → izinli değerler (F9-A01 tek-kaynak): enum denetimi buradan zorlanır
   *  (ör. Etmen.tür → apex·yönetici·uzman). Eski *Semasi blokları buraya eritildi. */
  enum?: Record<string, string[]>;
  /** opsiyonel alanlar (belge/tamamlama için — zorlanmaz, rehberdir). */
  opsiyonel?: string[];
  /** alan → tür (F9-A03 · alanTurleri): sayı·ondalık·tarih·mantıksal·eposta-biçimi
   *  değeri bu türe uymuyorsa motor geçersiz-tür uyarır (tanımlı-ama-ölü yetenek kapandı). */
  tür?: Record<string, string>;
  /** motorca-zorlanmayan yapısal kurallar (ör. "apex TEKİL") — belge + gelecek denetim. */
  yapisalKurallar?: string[];
  /** şema notu (köken/kilit provenance) — insan okur. */
  kural?: string;
  /** alan → varsayılan değer (doğuş-rehberi turu · CUE `*` ödüncü): kanonda enum değeri
   *  `*değer` yazılır, normalize TÜRETİR — elle doldurulmaz (kanonun yıldızı tek kaynak). */
  varsayilan?: Record<string, string>;
}

/**
 * CUE `*` varsayılan-işaretini çözer (doğuş-rehberi turu · SAF): `semalar.<tip>.enum.<alan>`
 * içindeki `*değer` girdileri yıldızsız değere normalize edilir, varsayılan
 * `sema.varsayilan.<alan>`a yazılır. Tüm tüketiciler (doğrulayıcı enum bekçisi ·
 * MCP · eklenti) TEMİZ değerlerle çalışır; yıldız yalnız kanon YAZIMINDA yaşar.
 * Girdi bozulmaz — dokunulan patikalar klonlanır (ortu-merge deseni).
 */
export function siniflamaNormalize(ham: Siniflama): Siniflama {
  if (!ham.semalar) return ham;
  let degisti = false;
  const semalar: Record<string, Sema> = { ...ham.semalar };
  for (const [tip, sema] of Object.entries(ham.semalar)) {
    if (!sema?.enum) continue;
    let yeniEnum: Record<string, string[]> | undefined;
    let varsayilan: Record<string, string> | undefined;
    for (const [alan, degerler] of Object.entries(sema.enum)) {
      if (!degerler.some((d) => d.startsWith("*"))) continue;
      yeniEnum ??= { ...sema.enum };
      yeniEnum[alan] = degerler.map((d) => (d.startsWith("*") ? d.slice(1) : d));
      const yildizli = degerler.filter((d) => d.startsWith("*"));
      // birden çok yıldız = kanon yazım hatası; İLK yıldız kazanır (deterministik, sessiz-kalma yok: hepsi normalize edilir)
      (varsayilan ??= { ...(sema.varsayilan ?? {}) })[alan] = yildizli[0].slice(1);
    }
    if (yeniEnum) {
      semalar[tip] = { ...sema, enum: yeniEnum, varsayilan };
      degisti = true;
    }
  }
  return degisti ? { ...ham, semalar } : ham;
}

/** Bir tipin bir alanı için kanon varsayılanını döndürür (yazılmamış alan buna düşer). */
export function varsayilanDeger(snf: Siniflama, tip: string, alan: string): string | undefined {
  return snf.semalar?.[tip]?.varsayilan?.[alan];
}

/** kayit.json'u okur ve Sınıflama olarak döndürür (CUE `*` varsayılanları çözülmüş). */
export function siniflamaYukle(yol: string): Siniflama {
  return siniflamaNormalize(JSON.parse(readFileSync(yol, "utf8")) as Siniflama);
}

// ── ÇALIŞMA-ALANI ÖRTÜSÜ ─────────────────────────────────────────────────────
//   Örtü mekanizmasının iki kökeni vardır ve bugün ikisi de canlı bir ilan taşımaz;
//   bu yüzden köken burada kodla değil anlatıyla anılır. Birinci köken ŞEF runtime
//   çalışmasının taksonomi kalemidir; plan kaydı repo İÇİNDE,
//   `arsiv/omurga-v0-plan-kapali/orkestrasyon/sef_plani.sar` gövdesinde yaşar, fakat
//   arşiv gövdesi CANLI bir `.sar` ilanı olmadığı için taşıdığı Adım kodu motorun
//   çözebileceği bir tanım vermez. İkinci köken Beceri.yığın taksonomisini izleyen
//   Hatırlatıcıdır; o Hatırlatıcı 2026-07-11 gözden geçirmesinde tamamlanmış bulunup
//   silinmiştir ve `oz/hatirlaticilar.sar` bugün yalnız silinme kaydını taşır.
//   Beceri.yığın gibi katı enum'lar, her ÇalışmaAlanı'nın kendi taksonomisiyle
//   ADDITIVE genişler (TIP-2.5 lego). Örtü ürün ağacında yaşar (oz/siniflama/ortu.json);
//   _Sarmal tabanına (kayit.json) ASLA yazılmaz — STR-3 kırmızı çizgisi. Enum-denetim
//   tek noktadan (dogrulayici:210 ortakEnum+sema.enum merge) akar → merged snf ile
//   girer, dogrulayici DOKUNULMAZ.

/** Örtü dosyası şekli — yalnız enum-genişletme (semalar.<tip>.enum.<alan>). */
export interface SiniflamaOrtu {
  semalar?: Record<string, { enum?: Record<string, string[]> }>;
}

/**
 * Taban sınıflamayı örtüyle birleştirir (SAF — taban BOZULMAZ, yeni nesne döner).
 * Yalnız `semalar.<tip>.enum.<alan>` dizileri UNION'lanır: taban değerleri korunur
 * (sıra bozulmaz), örtü değerleri sona eklenir, yinelenen atlanır (additive · TIP-2.5).
 * Örtü yoksa taban AYNEN döner (jenerik/açık taban değişmez · STR-3-güvenli).
 */
export function siniflamaOrtuMerge(taban: Siniflama, örtü?: SiniflamaOrtu | null): Siniflama {
  if (!örtü?.semalar) return taban;
  // Sığ klon + yalnız dokunulan tip/enum patikaları derin klonlanır (taban dokunulmaz).
  const sonuc: Siniflama = { ...taban, semalar: { ...(taban.semalar ?? {}) } };
  for (const [tip, örtüSema] of Object.entries(örtü.semalar)) {
    const örtüEnum = örtüSema?.enum;
    if (!örtüEnum) continue;
    const tabanSema = taban.semalar?.[tip];
    const yeniEnum: Record<string, string[]> = { ...(tabanSema?.enum ?? {}) };
    for (const [alan, örtüDeğerler] of Object.entries(örtüEnum)) {
      const birleşik = [...(yeniEnum[alan] ?? [])];
      for (const d of örtüDeğerler) if (!birleşik.includes(d)) birleşik.push(d);
      yeniEnum[alan] = birleşik;
    }
    sonuc.semalar![tip] = { ...(tabanSema ?? { zorunlu: [] }), enum: yeniEnum };
  }
  return sonuc;
}

/**
 * Bir dizinin `oz/siniflama/ortu.json` örtüsünü yükler (varsa). Yoksa undefined →
 * tabana düşülür (dış/kör proje = taban davranışı, doğru). find-up (alt-dizin
 * keşfi) sonraki tur; ilk sürüm `<dizin>/oz/siniflama/ortu.json` varsayar.
 */
// ── Taksonomi oto-üretim (BKM-OLG-A01 · oturum 29) ────────────────────────────
//    renk-uret/gomulu-kanon build deseninin DOKÜMAN ikizi: kayit.json → kayit.md
//    makine-envanteri bölümü. İşaretli bölge idempotent yazılır; elle anlatı
//    blokları korunur (ağaç-yüzü turu README oto-blok deseni).

export const TAKSONOMI_BAS = "<!-- SARMAL:TAKSONOMI -->";
export const TAKSONOMI_SON = "<!-- /SARMAL:TAKSONOMI -->";

/** kayit.json kanonundan makine-envanteri markdown bloğu üretir (SAF · deterministik). */
export function taksonomiMd(snf: Siniflama): string {
  const aileler = new Map<string, string[]>();
  for (const t of snf.widgetTipleri) {
    if (!aileler.has(t.aile)) aileler.set(t.aile, []);
    aileler.get(t.aile)!.push(t.ad);
  }
  const satirlar = [...aileler.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "tr"))
    .map(([aile, tipler]) => `| **${aile}** | ${tipler.length} | ${tipler.join(" · ")} |`);
  const kenarlar = snf.kenarTipleri.map((k) => k.ad).join(" · ");
  const hucre = (deger: unknown): string => {
    if (deger === undefined || deger === false) return "—";
    if (deger === true) return "evet";
    return JSON.stringify(deger).replace(/\|/g, "\\|");
  };
  // Çapraz rol indeksi (TIP-1.16): rol → tipler, izinliRoller sırasıyla —
  // üyelik kaynağı widgetTipleri[].caprazRoller alanıdır (deterministik).
  const izinliRoller = snf.caprazRolKumeleri?.izinliRoller ?? [];
  const rolSatirlari = izinliRoller
    .map((rol) => {
      const uyeler = snf.widgetTipleri.filter((t) => t.caprazRoller?.includes(rol)).map((t) => t.ad);
      return uyeler.length ? `| **${rol}** | ${uyeler.length} | ${uyeler.join(" · ")} |` : "";
    })
    .filter(Boolean);
  const rolBolumu = rolSatirlari.length
    ? [
        "",
        "## Çapraz rol indeksi (TIP-1.16 · kayit.json caprazRoller alanından üretilir)",
        "",
        "Çok-üyelik tek kanonik tipi çoğaltmaz ve ana aileyi değiştirmez; Sözleşme urun ailesinde kalır, yuzey ile arkayuz rollerinde birlikte indekslenir.",
        "",
        "| Rol | Tip sayısı | Tipler |",
        "|---|---|---|",
        ...rolSatirlari,
      ]
    : [];
  const alanSatirlari = [...snf.widgetTipleri]
    .sort((a, b) => a.ad.localeCompare(b.ad, "tr"))
    .map((tip) => {
      const s = snf.semalar?.[tip.ad];
      return `| ${tip.ad} | ${hucre(s?.zorunlu)} | ${hucre(s?.kosullu)} | ${hucre(s?.enAzBiri)} | ${hucre(s?.birindenBiri)} | ${hucre(s?.opsiyonel)} | ${hucre(s?.enum)} | ${hucre(s?.tür)} | ${hucre(s?.belgeZorunlu)} | ${hucre(s?.bolumZorunlu)} | ${hucre(s?.yapisalKurallar)} | ${hucre(s?.kural)} |`;
    });
  return [
    TAKSONOMI_BAS,
    "<!-- SARMAL:DIATAXIS Reference -->",
    "<!-- Bu bölüm kayit.json kanonundan ÜRETİLİR — elle yapılan düzenleme bir",
    "     sonraki üretimde silinir. Tazele: sarmal taksonomi-uret <dizin> -->",
    "",
    "## 📇 Makine Envanteri (kayit.json'dan üretilir — tek gerçek)",
    "",
    `**${aileler.size} aile · ${snf.widgetTipleri.length} widget tipi · ${snf.kenarTipleri.length} kenar tipi**`,
    "",
    "| Aile | Tip sayısı | Tipler |",
    "|---|---|---|",
    ...satirlar,
    "",
    `**Kenar tipleri (${snf.kenarTipleri.length}):** ${kenarlar}`,
    ...rolBolumu,
    "",
    "## Alan sözleşmeleri",
    "",
    "<!-- SARMAL:ALAN-TABLOSU:TAM -->",
    "Bu tablo kayıtlı bütün widget tiplerini gösterir. `—`, o tip için ilgili sözleşmenin tanımlanmadığını belirtir.",
    "",
    "| Tip | Zorunlu | Koşullu | En az biri | Birinden biri | Opsiyonel | Enum | Tür | Belge zorunlu | Bölüm zorunlu | Yapısal kurallar | Kural |",
    "|---|---|---|---|---|---|---|---|---|---|---|---|",
    ...alanSatirlari,
    TAKSONOMI_SON,
  ].join("\n");
}

/** İşaretli bölgeyi değiştirir; bölge yoksa dosya sonuna ekler (idempotent). */
export function taksonomiBlokUygula(mevcut: string, blok: string): string {
  const bas = mevcut.indexOf(TAKSONOMI_BAS);
  const son = mevcut.indexOf(TAKSONOMI_SON);
  if (bas >= 0 && son > bas) {
    return mevcut.slice(0, bas) + blok + mevcut.slice(son + TAKSONOMI_SON.length);
  }
  return mevcut.replace(/\n*$/, "\n\n") + blok + "\n";
}

export function siniflamaOrtuYukle(dizin: string): SiniflamaOrtu | undefined {
  // Örtü zinciri birleşimi (TIP-2.5): yukarı yürürken bulunan BÜTÜN örtüler
  // toplanır ve dıştan içe birleştirilir — iç örtü dıştakini GÖLGELEMEZ, her
  // sektör kendi sözcüğünü ekler ve kimse kimseninkini silmez. Eski davranış
  // ilk örtüde duruyordu ve dıştaki değerler sessizce kayboluyordu. Arama
  // yalnız YUKARI gider (kardeşe asla sapmaz → komşu örtü SIZMAZ, STR-3 kalkanı).
  const zincir: SiniflamaOrtu[] = [];
  let d = resolve(dizin);
  for (let seviye = 0; seviye < 12; seviye++) {
    const yol = join(d, "oz", "siniflama", "ortu.json");
    if (existsSync(yol)) zincir.push(JSON.parse(readFileSync(yol, "utf8")) as SiniflamaOrtu);
    const ust = dirname(d);
    if (ust === d) break;   // dosya-sistemi kökü
    d = ust;
  }
  if (zincir.length === 0) return undefined;
  if (zincir.length === 1) return zincir[0];
  // Dıştan içe additive birleşim: dıştaki değerler önce yaşar, içtekiler sona
  // eklenir, yinelenen atlanır — siniflamaOrtuMerge ile aynı union disiplini.
  const birlesik: SiniflamaOrtu = { semalar: {} };
  for (const örtü of [...zincir].reverse()) {
    for (const [tip, sema] of Object.entries(örtü.semalar ?? {})) {
      if (!sema?.enum) continue;
      const hedefTip = (birlesik.semalar![tip] ??= { enum: {} });
      for (const [alan, degerler] of Object.entries(sema.enum)) {
        const hedef = (hedefTip.enum![alan] ??= []);
        for (const deger of degerler) if (!hedef.includes(deger)) hedef.push(deger);
      }
    }
  }
  return birlesik;
}

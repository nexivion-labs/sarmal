// ═══════════════════════════════════════════════════════════════════════════
// kimlik.ts — 🗂️ Kimlik İndeksi (saf metin+AST · EKL-F11-A01/A05)
//
//   Çalışma-alanı geneli kod → konum haritası. İki katman:
//     • AST katmanı: kod: beyanı = TANIM (değer konumuyla — rename buradan
//       vuracak) · Tip/Kural tanımı adıyla tanımdır (DIL-3/TIP-1) · bağımlı:/
//       uygular: gibi kod-değerleri + çağır düğümleri = ATIF ADAYI.
//     • Metin katmanı: BÜYÜK-HARF-çok-parçalı kod deseni (DIL-1.2, BKM-ARC-A02…)
//       satır satır taranır → string/yorum içi "metin atıfları" da bulunur;
//       söz-dizimi KIRIK dosyada bile atıflar yaşar (AST katmanı o an atlanır).
//
//   ARTIMLI: dosyaGuncelle yalnız o dosyanın kaydını değiştirir; adaylar
//   dosya-YEREL toplanır, kod→atıf birleştirmesi sorguda yapılır — yeni bir
//   tanım geldiğinde diğer dosyaları yeniden taramak GEREKMEZ.
//
//   ÜÇ YÜZ, TEK ÇEKİRDEK (YUZ-1.2): eklenti (F12/⇧F12 · gezinme.ts) + MCP
//   (`gezin` aracı — ajanın F12'si) + CLI (`sarmal gezin`) aynı sınıfı çağırır.
//   EKL-F11-A05'te eklenti/src/indeks.ts'ten çekirdeğe indi (Founder isteği:
//   "ajanlar da bu kısa yolları MCP ile kullanabilsin").
//
//   Konumlar 1-tabanlı (belirtec konvansiyonu); vscode.Position'a çeviren
//   tüketici -1 uygular (anahat deseni). STR-3/MIM-1.1: indeks varlık AYIRMAZ —
//   sorgular süzgeç alır, varlık sınırını tüketici çizer (aktif-varlık kökü;
//   çapraz-varlık atıf zaten denetçinin yasağında).
// ═══════════════════════════════════════════════════════════════════════════

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname, resolve, basename } from "node:path";
import { belirtecle } from "./belirtec.ts";
import { ayristir } from "./ayristirici.ts";
import type { Deger, Dugum, Program } from "./sozdizim.ts";

/** Bir kod'un TANIMI: kod: parametresinin (ya da Tip/Kural adının) konumu. */
export interface Tanim {
  kod: string;
  /** Tanımlayan widget'ın tipi (Adım · Faz · …) ya da tipTanım/kuralTanım. */
  tip: string;
  /** Kardeş ad: parametresi (varsa) — Ctrl+T ad-araması bundan beslenir (A03). */
  ad?: string;
  dosya: string;
  satir: number;
  sutun: number;
}

/** Bir kod'a dokunan konum (bağımlı: · çağır · uygular: · metin/yorum atıfı). */
export interface Atif {
  kod: string;
  dosya: string;
  satir: number;
  sutun: number;
}

/** Bir düğümün GİDEN kenarı (hatırlatıcı-rayı turu · DOC-4): kaynak-KOD'un tanım gövdesinde
 *  beyan ettiği hedef (bağımlı/besler/hatırlat/üretir). gezin bunu "GİDEN" böler —
 *  ileri-bağlama düğümü (ör. Hatırlatıcı) sahte "kimse kullanmıyor" ölü-kod sanılmasın. */
export interface GidenKenar {
  kaynak: string;
  hedef: string;
  kenar: string;
  satir: number;
  sutun: number;
}

/** Tek dosyanın yerel kaydı — dosya yolu bilmez, artımlılığın temeli. */
export interface DosyaKaydi {
  tanimlar: { kod: string; tip: string; ad?: string; satir: number; sutun: number }[];
  adaylar: { metin: string; satir: number; sutun: number }[];
  giden: GidenKenar[];
}

// Kod deseni: BÜYÜK-harf/rakam parçaları '-' ile ≥2 parça (EKL-F11-A01 · DIL-1.2).
// Tek parça ("TAM", "YOK") ve harfsiz eşleşme (tarih: 2026-07-11) kod SAYILMAZ.
const KOD_PARCASI = "[A-Z0-9ÇĞİÖŞÜ_]+";
const KOD_GOVDESI = `${KOD_PARCASI}(?:-${KOD_PARCASI})+`;
// ORK-4 (KPS-ADA-A01): ad alanlı kod TEK sözcedir. `::` ayracı olmasaydı metin
// katmanı `PRJ-A::KOD-X` yazımını iki ayrı koda bölerdi ve gezinme yüzeyleri
// ad alanının yarısına atlardı; ayraç bu yüzden desenin içinde yaşar.
const KOD_DESENI = new RegExp(`${KOD_GOVDESI}(?:::${KOD_GOVDESI})?`, "g");
const SINIR_DISI = /[0-9A-Za-zÇĞİÖŞÜçğıöşü_-]/; // bitişikse eşleşme kod değildir
const HARF_VAR = /[A-ZÇĞİÖŞÜ]/;

/** Tek dosyayı tara. SAF.
 *  sarMi=true → AST katmanı (tanım + yapısal atıf) + metin katmanı;
 *  sarMi=false → YALNIZ metin katmanı (YUZ-3.2 ④: .md/.ts atıf evreni —
 *  KARARLAR/CHANGELOG/raporlar ve kod yorumları; tanım hep .sar'da). */
// hatırlatıcı-rayı turu (DOC-4): gezin GİDEN bölümünde gösterilecek beyanlı çıkış kenarları.
// RF-T6-A02 + Sol denetimi (2026-07-19 · KISMİ KABUL bulgusu ①): dayanak da
// YAPISAL kenardır — gezin onu ATIF değil tipli GİDEN bağ olarak izler.
const GIDEN_KENAR_PARAM: ReadonlySet<string> = new Set(["bağımlı", "besler", "hatırlat", "üretir", "dayanak"]);

export function dosyayiTara(metin: string, sarMi = true): DosyaKaydi {
  const tanimlar: DosyaKaydi["tanimlar"] = [];
  const giden: GidenKenar[] = [];
  // Aday anahtarı konum bazlı — AST ile metin katmanı aynı sözceyi bulunca teklenir.
  const adaylar = new Map<string, { metin: string; satir: number; sutun: number }>();
  const adayEkle = (m: string, satir: number, sutun: number): void => {
    adaylar.set(`${satir}:${sutun}`, { metin: m, satir, sutun });
  };

  // ── Metin katmanı: string · yorum · bağımlı listesi — hepsi tek geçişte ──
  const satirlar = metin.split("\n");
  for (let i = 0; i < satirlar.length; i++) {
    const satir = satirlar[i];
    // ⚡ PRF-MK-A02 · tire ön süzgeci: KOD_GOVDESI en az iki parçayı tireyle bağlar
    // (`(?:-PARÇA)+`), dolayısıyla tire taşımayan satırda desen eşleşemez ve
    // regex hiç koşmaz. Ölçüm: satırların yalnız yaklaşık dörtte biri tire taşır;
    // sarmal taraması yüz yirmi sekizden altmış, çatı yüz yetmiş ikiden seksen bir
    // milisaniyeye indi ve aday kümeleri birebir aynı kaldı (PERFORMANS.md 3a).
    if (!satir.includes("-")) continue;
    for (const es of satir.matchAll(KOD_DESENI)) {
      const once = satir[es.index - 1];
      const sonra = satir[es.index + es[0].length];
      if (once !== undefined && SINIR_DISI.test(once)) continue;
      if (sonra !== undefined && SINIR_DISI.test(sonra)) continue;
      if (!HARF_VAR.test(es[0])) continue; // 2026-07-11 gibi tarihler kod değil
      adayEkle(es[0], i + 1, es.index + 1);
    }
  }

  // ── AST katmanı: tanımlar + yapısal atıflar (küçük-harfli adlar dahil) ──
  let bildirimler: Dugum[] | undefined;
  if (sarMi) {
    try { bildirimler = ayristir(belirtecle(metin)).bildirimler; }
    catch { bildirimler = undefined; } // kırık dosya: metin katmanı yeter
  }

  const degerGez = (d: Deger): void => {
    if (d.tur === "kod" && d.metin) adayEkle(d.metin, d.satir, d.sutun);
    d.ogeler?.forEach(degerGez);
    d.ciftler?.forEach((c) => degerGez(c.deger));
    if (d.dugum) dugumGez(d.dugum);
    if (d.sol) degerGez(d.sol);
    if (d.sag) degerGez(d.sag);
  };
  const dugumGez = (n: Dugum): void => {
    if (n.tur === "çağır") {
      // Düğüm konumu "çağır" sözcüğünü gösterir — AD'ın konumu satırdan bulunur
      // ki metin katmanının bulduğuyla TEKLENSİN (aynı sözce iki atıf olmasın).
      const adIdx = (satirlar[n.satir - 1] ?? "").indexOf(n.ad, n.sutun - 1);
      adayEkle(n.ad, n.satir, adIdx >= 0 ? adIdx + 1 : n.sutun);
    }
    // Tip/Kural adıyla çağrılır (`uygular: şüphedeDur`) — adı tanımdır (DIL-3/TIP-1).
    // Konum AD'a hizalanır (düğüm konumu "Tip"/"Kural" sözcüğünü gösterebilir);
    // F12/⇧F12 vurgusu böylece tam sözcenin üstüne düşer.
    if (n.tur === "tipTanım" || n.tur === "kuralTanım") {
      const adIdx = (satirlar[n.satir - 1] ?? "").indexOf(n.ad, n.sutun - 1);
      tanimlar.push({ kod: n.ad, tip: n.tur, satir: n.satir, sutun: adIdx >= 0 ? adIdx + 1 : n.sutun });
    }
    // Kardeş ad: değeri Ctrl+T ad-aramasını besler (A03) — tanımla birlikte taşınır.
    const adParam = [...n.parametreler, ...n.ozellikler]
      .find((p) => p.ad === "ad" && p.deger.tur === "metin")?.deger.metin;
    // hatırlatıcı-rayı turu: düğümün kendi KOD'u — GİDEN kenarları buna bağlanır (ileri-bağlama görünür).
    const nodeKodP = [...n.parametreler, ...n.ozellikler]
      .find((p) => p.ad === "kod" && (p.deger.tur === "kod" || p.deger.tur === "metin") && p.deger.metin);
    const nodeKod = nodeKodP?.deger.metin;
    for (const p of [...n.parametreler, ...n.ozellikler]) {
      if (p.ad === "kod" && (p.deger.tur === "kod" || p.deger.tur === "metin") && p.deger.metin) {
        tanimlar.push({ kod: p.deger.metin, tip: n.ad, ad: adParam, satir: p.deger.satir, sutun: p.deger.sutun });
      } else {
        // GİDEN kenar (beyanlı çıkış): kaynak-KOD → hedef (bağımlı/besler/hatırlat/üretir)
        if (nodeKod && GIDEN_KENAR_PARAM.has(p.ad)) {
          const topla = (d: Deger): void => {
            if (d.tur === "kod" && d.metin) giden.push({ kaynak: nodeKod, hedef: d.metin, kenar: p.ad, satir: d.satir, sutun: d.sutun });
            d.ogeler?.forEach(topla);
          };
          topla(p.deger);
        }
        degerGez(p.deger);
      }
    }
    n.cocuklar.forEach(dugumGez);
  };
  bildirimler?.forEach(dugumGez);

  return { tanimlar, adaylar: [...adaylar.values()], giden };
}

/** Sorgu süzgeci — tüketici varlık sınırını buradan çizer (MIM-1.1 deseni). */
export type DosyaSuzgeci = (dosya: string) => boolean;

/** İndeks kapsamı DIŞI dizinler — denetleHepsi ile AYNI dünya görüşü: kasıtlı
 *  drift malzemesi (arsiv/ornek/fikstur/sablon) gezinme indeksini kirletmez;
 *  dist* derlenmiş kopyadır (YUZ-3.2 ④ ile .ts kapsama girince eklendi).
 *  Saf regex; eklenti beslemesi de MCP/CLI dizin taraması da bunu kullanır. */
export const INDEKS_DISI = /(^|\/)(arsiv|ornek|fikstur|sablon|node_modules|dist|dist-sinama)(\/|$)/;

/** İndekslenen dosya uzantıları (YUZ-3.2 ④): .sar TAM (tanım+atıf), .md/.ts yalnız ATIF. */
export const INDEKS_DOSYASI = /\.(sar|md|ts)$/;

// ── KPN-A01 · Varlık/şablon sınır bilinci (Founder onayı 2026-07-19: sınır+etiket) ──
//   Problem: RAF-PLAN gibi standart kodlar şablonlarda ve iki varlıkta yinelenir;
//   indeks ayırt edemeyince gezinme yanlış kapıya gider, yinelenen işaret gerçek
//   drift ile ders kopyasını karıştırır. Çözüm iki bacak: ürün kaynaklı gezinme
//   sonuçlarından ders-dünyası kopyaları SÜZÜLÜR (kendi evreninde gezinme serbest),
//   gezin raporu her tanımı bölge/varlık ROZETİYLE etiketler (hiçbir bilgi gizlenmez).

/** Ders-dünyası bölge rozetleri — INDEKS_DISI ailesinin insan-okur yüzü. */
const BOLGE_ROZETLERI: Record<string, string> = {
  arsiv: "🗄️ arşiv", ornek: "🎓 örnek dünyası", fikstur: "🧪 fikstür", sablon: "📋 şablon",
};

/** Dosyadan yukarı yürüyüp varlık girişini (MIM-3: *_anadizin.sar · eski ana.sar) arar;
 *  bulunca varlık adını döndürür (sarmal_anadizin.sar → "sarmal"). Saf değil (disk okur)
 *  ama enjekte edilebilir — testler kendi çözücüsünü verir. */
export function varlikAdi(dosya: string): string | undefined {
  let d = dirname(resolve(dosya));
  for (let i = 0; i < 12; i++) {
    try {
      const giris = readdirSync(d).find((g) => g.endsWith("_anadizin.sar") || g === "ana.sar");
      if (giris) return giris === "ana.sar" ? basename(d) : giris.replace(/_anadizin\.sar$/, "");
    } catch { /* okunamayan dizin — yürümeye devam */ }
    const ust = dirname(d);
    if (ust === d) break;
    d = ust;
  }
  return undefined;
}

// ═══════════════════════════════════════════════════════════════════════════
// ORK-4 · ÇAPRAZ-PROJE AD ALANI (KPS-ADA-A01)
//
//   Kanon hükmü şudur: niteliksiz bir KOD yalnız bulunduğu Projenin içinde
//   çözülür; başka bir Projedeki hedefe kurulan her kenar `PRJ-A::KOD-X`
//   biçimindeki açık ad alanını taşır ve tesadüfî küresel kod eşleşmesi hiçbir
//   zaman geçerli bağ sayılmaz. Bu bölüm o hükmün motordaki karşılığıdır.
//
//   BORCUN DOĞUŞU ÖLÇÜLMÜŞTÜR. 26 Ağustos 2026 tarihli depo ayrılığından önce
//   dört gövde tek depoda yaşıyordu ve `mevsim: FAZ-2026-AGUSTOS` yazımı aynı
//   proje içinde bir atıftı. Ayrılıktan sonra aynı satırlar çapraz proje atıfı
//   hâline geldi, fakat kimlik çözümü proje sınırı tanımadığı için motor hiç ses
//   çıkarmadı: bugün `FAZ-2026-AGUSTOS` yalnız `sarmal/is/plan/faz/faz.sar`
//   dosyasında tanımlıdır, buna karşılık ona üç ayrı projeden beş Blok
//   bağlanmaktadır ve yalnız biri meşrudur. Çatı penceresinde kapalı ürünün
//   Blokları açık aracın Fazının altında görünüyordu; kusur buradaydı.
//
//   KAPSAM ÖNEKİ AYIRICIYLA BİTER. Bir Projenin kapsamı, Proje düğümünü taşıyan
//   dosyanın dizinidir ve önek klasör ayracıyla kapatılır. Ayırıcı kasıtlıdır:
//   çıplak `startsWith` kullanılsaydı ad benzerliği taşıyan kardeş bir kök
//   (`sarmal-arsiv/`) `sarmal/` tarafından kapsanmış sayılırdı. Aynı tuzağın
//   emsali denetçinin rejim kapsamı çözümüdür ve o çözüm bu bölümdeki
//   `kapsamOneki` işlevine bağlanmıştır; ikinci bir kapsama kuralı yazılmaz,
//   çünkü iki kural olsaydı biri sessizce bayatlar ve rejim ile kimlik aynı
//   dosya için farklı proje söylerdi.
// ═══════════════════════════════════════════════════════════════════════════

/** Ad alanı ayracı (ORK-4) — `PRJ-A::KOD-X` yazımının ortasındaki iki nokta. */
export const AD_ALANI_AYRACI = "::";

/** Bir kodun ad alanı ile yerel parçası; ayraç yoksa `adAlani` tanımsızdır. */
export interface AdAlanliKod {
  adAlani?: string;
  yerel: string;
}

/**
 * Bir kodu ad alanı ile yerel parçasına ayırır. Ayraç yoksa, kodun başındaysa
 * ya da sonundaysa kod niteliksiz sayılır ve olduğu gibi geri döner — yarım
 * yazılmış bir ad alanı sessizce meşru bir bağa dönüşemez.
 */
export function adAlaniAyir(kod: string): AdAlanliKod {
  const yer = kod.indexOf(AD_ALANI_AYRACI);
  if (yer <= 0) return { yerel: kod };
  const yerel = kod.slice(yer + AD_ALANI_AYRACI.length);
  if (!yerel || yerel.includes(AD_ALANI_AYRACI)) return { yerel: kod };
  return { adAlani: kod.slice(0, yer), yerel };
}

/**
 * Bir dosyanın kapsam öneki — dizini, ayırıcıyla biter. Ayırıcı kasıtlıdır: ad
 * benzerliği taşıyan kardeş kök (`sarmal-arsiv/`) `sarmal/` tarafından
 * kapsanmış sayılmaz. Kök dosyanın öneki boş dizedir ve her dosyayı kapsar.
 */
export function kapsamOneki(dosya: string): string {
  const egik = dosya.replace(/\\/g, "/");
  const son = egik.lastIndexOf("/");
  return son < 0 ? "" : egik.slice(0, son + 1);
}

/** Verilen kapsam öneki dosyayı kapsıyor mu? Boş önek (kök) her dosyayı kapsar. */
export function onekKapsar(onek: string, dosya: string): boolean {
  if (!onek) return true;
  return dosya.replace(/\\/g, "/").startsWith(onek);
}

/** Yüklü evrendeki bir Proje kökü: düğümün kodu ve kapsadığı önek. */
export interface ProjeKapsami {
  kod: string;
  onek: string;
  dosya: string;
}

/** Bir düğüm ağacında verilen adı taşıyan widget'ları dolaşır. */
function widgetGez(n: Dugum, ad: string, gor: (d: Dugum) => void): void {
  if (n.tur === "widget" && n.ad === ad) gor(n);
  for (const c of n.cocuklar) widgetGez(c, ad, gor);
  for (const p of [...n.parametreler, ...n.ozellikler]) {
    const dolas = (d: Deger): void => {
      if (d.dugum) widgetGez(d.dugum, ad, gor);
      d.ogeler?.forEach(dolas);
      d.ciftler?.forEach((c) => dolas(c.deger));
    };
    dolas(p.deger);
  }
}

/** Bir düğümün `kod` alanı (parametre ya da özellik olarak yazılmış olabilir). */
function dugumKodu(n: Dugum): string | undefined {
  const p = [...n.parametreler, ...n.ozellikler]
    .find((x) => x.ad === "kod" && (x.deger.tur === "kod" || x.deger.tur === "metin"));
  return p?.deger.metin;
}

/**
 * Yüklü programlardan Proje kapsamlarını çıkarır. Her Proje düğümü kendi
 * dosyasının DİZİNİYLE bir kapsam kurar; bu, anadizin yürüyüşünün saf ikizidir
 * ve disk okumadığı için denetimin her yüzeyinde aynı cevabı verir. Ders
 * dünyası (INDEKS_DISI) kök saymaz: ürün hükmü oraya inmez ve şablon içindeki
 * örnek Proje bildirimleri gerçek bir sınır doğurmaz.
 */
export function projeKapsamlari(programlar: ReadonlyMap<string, Program>): ProjeKapsami[] {
  const kapsamlar: ProjeKapsami[] = [];
  for (const [dosya, program] of programlar) {
    if (INDEKS_DISI.test(dosya)) continue;
    for (const b of program.bildirimler) {
      widgetGez(b, "Proje", (d) => {
        const kod = dugumKodu(d);
        if (kod) kapsamlar.push({ kod, onek: kapsamOneki(dosya), dosya });
      });
    }
  }
  return kapsamlar;
}

/**
 * Dosyayı kapsayan EN YAKIN Proje — iç içe çatı düzeninde en uzun önek, yani
 * alt proje kazanır. Hiçbir kapsam eşleşmiyorsa dosya köksüzdür; köksüz dosya
 * (çatı ilanı, ders dünyası) sınır çizmez ve herkese görünür kalır.
 */
export function sahipProjeKapsami(
  dosya: string,
  kapsamlar: readonly ProjeKapsami[],
): ProjeKapsami | undefined {
  let kazanan: ProjeKapsami | undefined;
  for (const k of kapsamlar) {
    if (!onekKapsar(k.onek, dosya)) continue;
    if (!kazanan || k.onek.length > kazanan.onek.length) kazanan = k;
  }
  return kazanan;
}

/** Çatı ilanında raf olarak duyurulmuş bir kardeş proje kökü. */
export interface KardesProje {
  /** Kardeş kökün kendi anadizininde ilan ettiği Proje kodu (PRJ-…). */
  kod: string;
  /** Kökün mutlak dizini. */
  kok: string;
}

/** Bir programda ÇalışmaAlanı altında ilan edilmiş raf yollarını toplar. */
function calismaAlaniRaflari(program: Program): string[] {
  const yollar: string[] = [];
  for (const b of program.bildirimler) {
    widgetGez(b, "ÇalışmaAlanı", (ca) => {
      widgetGez(ca, "Raf", (raf) => {
        const yol = [...raf.parametreler, ...raf.ozellikler]
          .find((x) => x.ad === "yol" && x.deger.tur === "metin")?.deger.metin;
        if (yol) yollar.push(yol);
      });
    });
  }
  return yollar;
}

/** Bir dizindeki *_anadizin.sar dosyalarını ayrıştırıp döndürür (okunamayan atlanır). */
function anadizinProgramlari(dizin: string): Program[] {
  let girisler: string[];
  try { girisler = readdirSync(dizin); } catch { return []; }
  const out: Program[] = [];
  for (const g of girisler) {
    if (!g.endsWith("_anadizin.sar") && g !== "ana.sar") continue;
    try { out.push(ayristir(belirtecle(readFileSync(join(dizin, g), "utf8")))); }
    catch { /* kırık anadizin çatı çözümünü düşürmez */ }
  }
  return out;
}

/**
 * Çatı ilanında duyurulmuş kardeş proje köklerini çözer. Başlangıç dizininden
 * yukarı yürünür ve ÇalışmaAlanı ile raf ilanı TAŞIYAN ilk anadizin çatı
 * sayılır; projenin kendi anadizini (Proje taşır, raf ilanıyla ÇalışmaAlanı
 * taşımaz) yürüyüşü durdurmaz. Her rafın kökündeki anadizinden o projenin kodu
 * okunur. İlansız klasör kardeş SAYILMAZ: çözüm yalnız çatının duyurduğu
 * kökleri tanır ve diskteki tesadüfî bir komşu klasör ad alanı doğuramaz.
 */
export function catiKardesleri(baslangicDizin: string): KardesProje[] {
  let d = resolve(baslangicDizin);
  for (let i = 0; i < 12; i++) {
    for (const program of anadizinProgramlari(d)) {
      const raflar = calismaAlaniRaflari(program);
      if (!raflar.length) continue;
      const kardesler: KardesProje[] = [];
      for (const yol of raflar) {
        const kok = resolve(d, yol);
        for (const p of anadizinProgramlari(kok)) {
          for (const b of p.bildirimler) {
            widgetGez(b, "Proje", (pr) => {
              const kod = dugumKodu(pr);
              if (kod && !kardesler.some((k) => k.kod === kod)) kardesler.push({ kod, kok });
            });
          }
        }
      }
      if (kardesler.length) return kardesler;
    }
    const ust = dirname(d);
    if (ust === d) break;
    d = ust;
  }
  return [];
}

/** Bir kardeş kökteki TANIMLI kodların kümesi — ad alanlı hedefin sınandığı evren. */
export function projeninKodlari(kok: string): ReadonlySet<string> {
  const kume = new Set<string>();
  for (const t of dizindenIndeks(kok).tumTanimlar()) kume.add(t.kod);
  return kume;
}

/** ORK-4 çözümünün dışa açık yüzü — bir kenar hedefi gerçekten bağlanıyor mu? */
export interface AdAlaniKapsami {
  /** Hedef, bu kaynak dosyadan ORK-4 hükmüne göre çözülüyor mu? */
  cozulur(hedef: string, kaynakDosya: string): boolean;
  /** Ad alanının kardeş kökü — yüzeyler tanıma gitmek için buradan okur. */
  kardesKok(adAlani: string): string | undefined;
}

/** `adAlaniKapsamiKur` seçenekleri; disk bağımlılıkları sınama için enjekte edilir. */
export interface AdAlaniSecenegi {
  /** Yüklü evrendeki Proje kapsamları. */
  kapsamlar: readonly ProjeKapsami[];
  /** Bir kodun yüklü evrendeki TÜM tanım dosyaları. */
  tanimDosyalari: (kod: string) => readonly string[];
  /** Kardeş kökleri çözmek için başlangıç dizini (verilmezse çatı okunmaz). */
  kokDizin?: string;
  /** Kardeş kök listesi — verilirse çatı diskten okunmaz (sınama yüzü). */
  kardesler?: readonly KardesProje[];
  /** Bir kardeş kökün kod kümesi — verilirse disk taranmaz (sınama yüzü). */
  kardesKodlari?: (kok: string) => ReadonlySet<string>;
}

/**
 * ORK-4 çözücüsünü kurar. Çatı okuması ile kardeş kök taraması TEMBELDİR: ad
 * alanlı bir koda gerçekten rastlanmadıkça hiçbir disk erişimi yapılmaz,
 * dolayısıyla ad alanı kullanmayan bir projenin denetimi hiçbir bedel ödemez.
 * Bir kez okunan kardeş kök çözücünün ömrü boyunca bellekte kalır.
 */
export function adAlaniKapsamiKur(secenek: AdAlaniSecenegi): AdAlaniKapsami {
  const { kapsamlar, tanimDosyalari, kokDizin } = secenek;
  let kardesler: readonly KardesProje[] | undefined = secenek.kardesler;
  const kodOnbellegi = new Map<string, ReadonlySet<string>>();

  const kardesListesi = (): readonly KardesProje[] => {
    if (kardesler === undefined) kardesler = kokDizin ? catiKardesleri(kokDizin) : [];
    return kardesler;
  };
  const kardesKok = (adAlani: string): string | undefined =>
    kardesListesi().find((k) => k.kod === adAlani)?.kok;
  const kardesKodKumesi = (kok: string): ReadonlySet<string> => {
    let kume = kodOnbellegi.get(kok);
    if (!kume) {
      kume = secenek.kardesKodlari ? secenek.kardesKodlari(kok) : projeninKodlari(kok);
      kodOnbellegi.set(kok, kume);
    }
    return kume;
  };

  const cozulur = (hedef: string, kaynakDosya: string): boolean => {
    const { adAlani, yerel } = adAlaniAyir(hedef);
    if (adAlani !== undefined) {
      // ① Ad alanı yüklü evrende bir Proje kapsamına karşılık geliyorsa hedef
      //    YALNIZ o kapsamın altında aranır — küresel eşleşme burada da bağ değildir.
      const kapsam = kapsamlar.filter((k) => k.kod === adAlani);
      if (kapsam.length) {
        return tanimDosyalari(yerel).some((d) => kapsam.some((k) => onekKapsar(k.onek, d)));
      }
      // ② Ad alanı yüklü değilse çatının duyurduğu kardeş kökten okunur.
      const kok = kardesKok(adAlani);
      return kok !== undefined && kardesKodKumesi(kok).has(yerel);
    }
    // Niteliksiz kod: yalnız kaynağın kendi projesinde çözülür.
    const dosyalar = tanimDosyalari(yerel);
    if (!dosyalar.length) return false;
    const sahip = sahipProjeKapsami(kaynakDosya, kapsamlar);
    if (!sahip) return true;   // köksüz kaynak — sınır çizilmez (gezinmeSuzgeci deseni)
    return dosyalar.some((d) => {
      if (INDEKS_DISI.test(d)) return true;                    // ders dünyası herkese açıktır
      const tanimSahibi = sahipProjeKapsami(d, kapsamlar);
      return !tanimSahibi || tanimSahibi.kod === sahip.kod;     // köksüz tanım herkese görünür
    });
  };

  return { cozulur, kardesKok };
}

// ── Ad alanlı gezinme: kardeş kökteki tanıma gitmek (KPS-ADA-A01 · dördüncü madde) ──
//   Tanıma gitme, atıf bulma ve atıf dekoru yüzeylerinin ortak çekirdeği. Yüzeyler
//   ad alanını kendileri çözmez: hepsi buradan okur, dolayısıyla F12'nin gittiği yer
//   ile dekorun bağladığı yer bir daha ayrışamaz (YUZ-1.2 · üç yüz tek çekirdek).

/** Kardeş kök indeksleri — bir kök oturum boyunca bir kez taranır. */
const kardesIndeksOnbellegi = new Map<string, KimlikIndeksi>();

/** Kardeş kök önbelleğini boşaltır; kardeş depo değiştiğinde ve sınamada çağrılır. */
export function kardesOnbelleginiTemizle(): void {
  kardesIndeksOnbellegi.clear();
}

/** Bir kardeş kökün kimlik indeksi — ilk çağrıda taranır, sonra bellekten döner. */
export function kardesIndeksi(kok: string): KimlikIndeksi {
  let indeks = kardesIndeksOnbellegi.get(kok);
  if (!indeks) {
    indeks = dizindenIndeks(kok);
    kardesIndeksOnbellegi.set(kok, indeks);
  }
  return indeks;
}

/**
 * Ad alanlı bir kodun KARDEŞ kökteki tanım konumları. Kaynak dosyanın
 * dizininden çatıya yürünür, ad alanının duyurduğu kök bulunur ve kodun yerel
 * parçası orada aranır. Kod niteliksizse ya da ad alanı çatıda ilan edilmemişse
 * boş liste döner; ilansız klasör kardeş sayılmaz ve gezinme oraya atlamaz.
 *
 * Bu geçiş MIM-1.1 varlık sınırını OKUR-YALNIZ aşar ve bir bağımlılık kurmaz:
 * ad alanlı yazım zaten "başka projeye bakıyorum" beyanının kendisidir.
 */
export function adAlanliTanimlar(kod: string, kaynakDosya: string): Tanim[] {
  const { adAlani, yerel } = adAlaniAyir(kod);
  if (adAlani === undefined) return [];
  const kok = catiKardesleri(dirname(resolve(kaynakDosya))).find((k) => k.kod === adAlani)?.kok;
  if (!kok) return [];
  return kardesIndeksi(kok).tanimlar(yerel);
}

/** KPN-A01: bir dosyanın bölge/varlık rozeti — ders dünyası regex'ten, varlık adı
 *  anadizin yürüyüşünden. Gezin raporu tanımları bununla etiketler. */
export function bolgeEtiketi(dosya: string, varlikAdiBul: (yol: string) => string | undefined = varlikAdi): string {
  const m = dosya.match(/(^|\/)(arsiv|ornek|fikstur|sablon)(\/|$)/);
  if (m) return BOLGE_ROZETLERI[m[2]] ?? m[2];
  const ad = varlikAdiBul(dosya);
  return ad ? `🧭 ${ad}` : "🧭 köksüz";
}

/** KPN-A01: gezinme sonuç süzgeci — üç yüzün (F12/⇧F12/F2) ortak sınır bilinci.
 *  ① Ürün kaynaklı gezinmede ders-dünyası (INDEKS_DISI) kopyaları sonuç listesine
 *    girmez; kaynak dosyanın KENDİSİ her zaman görünür (belge-içi gezinme yaşar).
 *  ② Kaynak ders dünyasındaysa süzme uygulanmaz — şablon/örnek kendi evreninde
 *    serbest gezinir (vscode-test dersi: ornek/ içinde F12 ölmemeli).
 *  ③ MIM-1.1 varlık sınırı korunur: kaynak bir varlık köküne bağlıysa sonuçlar o
 *    varlık + köksüz dosyalarla sınırlanır (çapraz-varlık zaten denetçi yasağı). */
export function gezinmeSuzgeci(
  kaynakYolu: string | undefined,
  varlikKoku: (yol: string) => string | undefined,
): DosyaSuzgeci {
  const kaynakDersDunyasi = kaynakYolu !== undefined && INDEKS_DISI.test(kaynakYolu);
  const kok = kaynakYolu ? varlikKoku(kaynakYolu) : undefined;
  return (dosya) => {
    if (dosya === kaynakYolu) return true;
    if (!kaynakDersDunyasi && INDEKS_DISI.test(dosya)) return false;
    if (!kok) return true;                            // köksüz kaynak: varlık sınırı çizilmez
    const k = varlikKoku(dosya);
    return !k || k === kok;                           // köksüz dosya hep görünür (MIM-1.1 deseni)
  };
}

/** Çalışma-alanı geneli kimlik indeksi — dosya başına yerel kayıt, sorguda birleşim. */
export class KimlikIndeksi {
  private dosyalar = new Map<string, DosyaKaydi>();

  /** ARTIMLI: yalnız bu dosyanın kaydı yenilenir (kabul: dosya-yerel güncelleme).
   *  Katman uzantıdan seçilir: .sar TAM, diğerleri yalnız metin-atıf (YUZ-3.2 ④). */
  dosyaGuncelle(dosya: string, metin: string): void {
    this.dosyalar.set(dosya, dosyayiTara(metin, dosya.endsWith(".sar")));
  }

  dosyaSil(dosya: string): void {
    this.dosyalar.delete(dosya);
  }

  /** Dosya indekste mi? — gezinme tazelemesi 'ilk kez mi görüyorum' kararında kullanır. */
  dosyaVar(dosya: string): boolean {
    return this.dosyalar.has(dosya);
  }

  dosyaSayisi(): number {
    return this.dosyalar.size;
  }

  /** Bir kod'un tanım(lar)ı — yinelenen tanım ayrı drift türü, liste döner. */
  tanimlar(kod: string, suzgec?: DosyaSuzgeci): Tanim[] {
    const sonuc: Tanim[] = [];
    for (const [dosya, kayit] of this.dosyalar) {
      if (suzgec && !suzgec(dosya)) continue;
      for (const t of kayit.tanimlar) if (t.kod === kod) sonuc.push({ ...t, dosya });
    }
    return sonuc;
  }

  /** Bir kod'un tüm atıfları — tanım SATIRINDAKİ kendisi hariç. */
  atiflar(kod: string, suzgec?: DosyaSuzgeci): Atif[] {
    const sonuc: Atif[] = [];
    for (const [dosya, kayit] of this.dosyalar) {
      if (suzgec && !suzgec(dosya)) continue;
      const tanimSatirlari = new Set(
        kayit.tanimlar.filter((t) => t.kod === kod).map((t) => t.satir));
      for (const a of kayit.adaylar) {
        if (a.metin !== kod || tanimSatirlari.has(a.satir)) continue;
        sonuc.push({ kod, dosya, satir: a.satir, sutun: a.sutun });
      }
    }
    return sonuc;
  }

  /** hatırlatıcı-rayı turu (DOC-4): bir kod'un GİDEN kenarları — tanım gövdesinde beyan ettiği
   *  hedefler (bağımlı/besler/hatırlat/üretir). İleri-bağlama düğümü (Hatırlatıcı)
   *  gelen atıfı olmasa da GİDEN'i vardır → sahte "ölü kod" değildir. */
  giden(kod: string, suzgec?: DosyaSuzgeci): (GidenKenar & { dosya: string })[] {
    const sonuc: (GidenKenar & { dosya: string })[] = [];
    for (const [dosya, kayit] of this.dosyalar) {
      if (suzgec && !suzgec(dosya)) continue;
      for (const g of kayit.giden) if (g.kaynak === kod) sonuc.push({ ...g, dosya });
    }
    return sonuc;
  }

  /** Tüm tanımlar — Ctrl+T sembol araması (A03) buradan beslenecek. */
  tumTanimlar(suzgec?: DosyaSuzgeci): Tanim[] {
    const sonuc: Tanim[] = [];
    for (const [dosya, kayit] of this.dosyalar) {
      if (suzgec && !suzgec(dosya)) continue;
      for (const t of kayit.tanimlar) sonuc.push({ ...t, dosya });
    }
    return sonuc;
  }

  /** TÜM atıf adayları (kod süzgeci YOK) — `atiflar(kod)` verilen koda göre süzer,
   *  yani "hangi adaylar KARŞILIKSIZ?" sorusunu SORAMAZ (kanıt-ekseni turu · B9). Denetim yüzü
   *  (denetci.metinAtifTanilari) evreni buradan görür; tanım SATIRINDAKİ kendisi
   *  atıf sayılmaz — `atiflar` ile aynı kural. */
  tumAdaylar(suzgec?: DosyaSuzgeci): Atif[] {
    const sonuc: Atif[] = [];
    for (const [dosya, kayit] of this.dosyalar) {
      if (suzgec && !suzgec(dosya)) continue;
      const tanimSatirlari = new Map<string, Set<number>>();
      for (const t of kayit.tanimlar) {
        if (!tanimSatirlari.has(t.kod)) tanimSatirlari.set(t.kod, new Set());
        tanimSatirlari.get(t.kod)!.add(t.satir);
      }
      for (const a of kayit.adaylar) {
        if (tanimSatirlari.get(a.metin)?.has(a.satir)) continue;
        sonuc.push({ kod: a.metin, dosya, satir: a.satir, sutun: a.sutun });
      }
    }
    return sonuc;
  }
}

/** Eklenti-geneli tek örnek — gezinme sağlayıcıları ve izleyici beslemesi paylaşır. */
export const kimlikIndeksi = new KimlikIndeksi();

// ── MCP/CLI yüzü: dizinden indeks + Türkçe rapor ────────────────────────────

/** Bir dizindeki tüm indekslenebilir dosyaları (.sar tam · .md/.ts atıf — YUZ-3.2 ④;
 *  INDEKS_DISI hariç) indeksler — MCP `gezin` + CLI `sarmal gezin` bunun üstünde.
 *  Okunamayan dosya sessiz atlanır. */
export function dizindenIndeks(dizin: string): KimlikIndeksi {
  const indeks = new KimlikIndeksi();
  const gez = (d: string): void => {
    let girdiler;
    try { girdiler = readdirSync(d, { withFileTypes: true }); }
    catch { return; }
    for (const g of girdiler) {
      if (g.name.startsWith(".")) continue;   // .git/.sarmal gibi gizli dizinler
      const yol = join(d, g.name);
      if (g.isDirectory()) {
        if (!INDEKS_DISI.test("/" + g.name + "/")) gez(yol);
      } else if (INDEKS_DOSYASI.test(g.name)) {
        try { indeks.dosyaGuncelle(yol, readFileSync(yol, "utf8")); }
        catch { /* okunamayan dosya atlanır */ }
      }
    }
  };
  gez(dizin);
  return indeks;
}

/** `gezin` sonucunu ajanın/insanın okuyacağı Türkçe metne çevirir (MCP+CLI ortak). */
// ── NTK-A06 · BAĞLAM KARTI: bir kodun çevresi tek çağrıda ───────────────────
//   Founder isteği: ajan, bug → Adım → Blok → bağımlılık zincirini grep/cat
//   çalıştırmadan, tıklaya tıklaya gezmeli ve bağlamı TEK SEFERDE almalıdır.
//   gezin tanım+atıf+kenar veriyordu; kart, üst zinciri, kardeşleri ve koni
//   özetini ekler. Tasarım kararı: ayrı araç değil gezin'in zenginleşmesi —
//   ajanın tek alışkanlığı (YUZ-3.2: önce gezin) tek araçla beslenmelidir.

/** Kartta bir düğümün kimliği — tip + kod + insan adı. */
export interface BaglamDugumu { tip: string; kod?: string; ad?: string }

/** Bir kodun yapısal çevresi: üst zincir · kardeşler · çocuklar · koni özeti. */
export interface Baglam {
  dugum: BaglamDugumu;
  zincir: BaglamDugumu[];
  kardesler: BaglamDugumu[];
  cocuklar: BaglamDugumu[];
  alanlar: [string, string][];
}

/** Kartta gösterilen koni alanları — Adım'ın anlamını taşıyan çekirdek. */
const KART_ALANLARI = ["durum", "ne", "bağımlı", "üretir", "kullanır", "referans", "kabul"];

function baglamOzeti(n: Dugum): BaglamDugumu {
  const al = (ad: string): string | undefined =>
    [...n.parametreler, ...n.ozellikler].find((p) => p.ad === ad && p.deger.metin)?.deger.metin;
  return { tip: n.ad, kod: al("kod"), ad: al("ad") };
}

function koniOzeti(n: Dugum): [string, string][] {
  const sonuc: [string, string][] = [];
  for (const ad of KART_ALANLARI) {
    const p = [...n.parametreler, ...n.ozellikler].find((x) => x.ad === ad);
    if (!p) continue;
    const d = p.deger;
    let deger: string | undefined;
    if (d.tur === "liste") {
      const kodlar = (d.ogeler ?? []).map((o) => o.metin).filter(Boolean);
      deger = ad === "kabul"
        ? `${(d.ogeler ?? []).length} ölçüt`
        : kodlar.length ? kodlar.join(" · ") : `${(d.ogeler ?? []).length} öge`;
    } else if (d.metin) {
      deger = d.metin.length > 140 ? d.metin.slice(0, 140) + "…" : d.metin;
    }
    if (deger) sonuc.push([ad, deger]);
  }
  return sonuc;
}

/** Kart için güvenli dosya okuyucu — okunamayan dosyada kart sessizce düşer, rapor yaşar. */
export function dosyaOkuGuvenli(dosya: string): string | undefined {
  try { return readFileSync(dosya, "utf8"); } catch { return undefined; }
}

/** Verilen kaynak metinde `kod`un yapısal bağlamını çıkarır (kırık dosyada undefined). */
export function dugumBaglami(metin: string, kod: string): Baglam | undefined {
  let bildirimler: Dugum[];
  try { bildirimler = ayristir(belirtecle(metin)).bildirimler; } catch { return undefined; }
  let sonuc: Baglam | undefined;
  const gez = (n: Dugum, zincir: Dugum[]): void => {
    if (sonuc) return;
    if (baglamOzeti(n).kod === kod) {
      const ebeveyn = zincir[zincir.length - 1];
      sonuc = {
        dugum: baglamOzeti(n),
        zincir: zincir.map(baglamOzeti),
        kardesler: (ebeveyn?.cocuklar ?? []).filter((c) => c !== n).map(baglamOzeti),
        cocuklar: n.cocuklar.map(baglamOzeti),
        alanlar: koniOzeti(n),
      };
      return;
    }
    for (const c of n.cocuklar) gez(c, [...zincir, n]);
  };
  for (const b of bildirimler) gez(b, []);
  return sonuc;
}

export function gezinRaporu(indeks: KimlikIndeksi, kod: string, dosyaOku?: (dosya: string) => string | undefined, rozet: (dosya: string) => string = bolgeEtiketi): string {
  const tanimlar = indeks.tanimlar(kod);
  const atiflar = indeks.atiflar(kod);
  const giden = indeks.giden(kod);   // hatırlatıcı-rayı turu: beyanlı çıkış kenarları (ileri-bağlama)
  if (!tanimlar.length && !atiflar.length) {
    return `✖ '${kod}' hiçbir yerde geçmiyor (${indeks.dosyaSayisi()} dosya tarandı) — kod doğru yazıldı mı?`;
  }
  const satir = (x: { dosya: string; satir: number; sutun: number }): string =>
    `  ${x.dosya}:${x.satir}:${x.sutun}`;
  const bolumler: string[] = [`── 🗂️ ${kod} (${indeks.dosyaSayisi()} dosya tarandı) ──`];
  // KPN-A01: her tanım bölge/varlık rozetiyle etiketlenir — RAF-PLAN gibi standart
  // kodlarda hangi kapının gerçek olduğu (varlık · şablon · örnek) tek bakışta okunur.
  bolumler.push(tanimlar.length
    ? `TANIM (${tanimlar.length}):\n${tanimlar.map((t) => `${satir(t)}  [${t.tip}${t.ad ? ` · ${t.ad}` : ""}] · ${rozet(t.dosya)}`).join("\n")}`
    : "TANIM: yok — bu kod hiçbir yerde ilan edilmemiş (kırık atıf olabilir).");
  // NTK-A06 · BAĞLAM KARTI: üst zincir + kardeşler + çocuklar + koni özeti — ajan,
  // "bu Adım hangi Blok'ta, yanında ne var, ne iş yapar" sorularını tek çağrıda alır.
  if (tanimlar.length && dosyaOku) {
    const metin = dosyaOku(tanimlar[0].dosya);
    const b = metin ? dugumBaglami(metin, kod) : undefined;
    if (b) {
      const adres = (x: BaglamDugumu): string =>
        `${x.tip}${x.kod ? ` ${x.kod}` : ""}${x.ad ? ` (${x.ad})` : ""}`;
      const kart: string[] = [];
      if (b.zincir.length) kart.push(`  üst zincir: ${b.zincir.map(adres).join(" › ")}`);
      if (b.kardesler.length) kart.push(`  kardeşler (${b.kardesler.length}): ${b.kardesler.map(adres).join(" · ")}`);
      if (b.cocuklar.length) kart.push(`  çocuklar (${b.cocuklar.length}): ${b.cocuklar.map(adres).join(" · ")}`);
      for (const [a, v] of b.alanlar) kart.push(`  ${a}: ${v}`);
      if (kart.length) bolumler.push(`BAĞLAM KARTI:\n${kart.join("\n")}`);
    }
  }
  // ATIFLAR (gelen): boşsa "kimse kullanmıyor" — AMA GİDEN kenarı varsa bu düğüm
  // ileri-bağlamadır (ör. Hatırlatıcı: kimse ONA atıf vermez, o HEDEFİNE hatırlat eder);
  // ölü-kod smell'i bastırılır (hatırlatıcı-rayı turu · DOC-4).
  bolumler.push(atiflar.length
    ? `ATIFLAR — gelen (${atiflar.length}):\n${atiflar.map(satir).join("\n")}`
    : giden.length
      ? "ATIFLAR — gelen: yok — ama bu bir İLERİ-BAĞLAMA düğümü (aşağıdaki GİDEN kenarlarına bak); ölü kod DEĞİL."
      : "ATIFLAR — gelen: yok — tanımlı ama kimse kullanmıyor (yetim olabilir).");
  // GİDEN (bu düğümün beyan ettiği çıkış kenarları) — forward-binding görünür olur.
  if (giden.length) {
    bolumler.push(`GİDEN — çıkış kenarları (${giden.length}):\n${giden.map((g) => `  → ${g.hedef} [${g.kenar}]  (${g.dosya}:${g.satir}:${g.sutun})`).join("\n")}`);
  }
  if (tanimlar.length > 1) bolumler.push("⚠️ Birden çok tanım — rozetlere bak: 📋 şablon ile 🎓 örnek kopyası ders malzemesidir, sapma değildir; farklı 🧭 varlık ise varlık sınırıdır (her varlık kendi eş kodunu taşıyabilir); AYNI varlıkta çift tanım gerçek yinelenen-kod drifti olabilir (denetle ile doğrula).");
  return bolumler.join("\n\n");
}

/** `sarmal gezin <KOD> [dizin]` — F12/⇧F12'nin CLI ikizi (YUZ-1.2 dogfood). */
export function gezinKomutu(dizin: string, kod: string): number {
  const indeks = dizindenIndeks(dizin);
  const rapor = gezinRaporu(indeks, kod, dosyaOkuGuvenli);
  console.log(rapor);
  return rapor.startsWith("✖") ? 4 : 0;
}

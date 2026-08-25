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
import type { Deger, Dugum } from "./sozdizim.ts";

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
const KOD_DESENI = new RegExp(`${KOD_PARCASI}(?:-${KOD_PARCASI})+`, "g");
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

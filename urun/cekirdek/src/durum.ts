// ═══════════════════════════════════════════════════════════════════════════
// durum.ts — 🚦 DURUM TÜRETME — kapsayıcının "bitti"si TEK tanımdan (tek kaynak)
//
//   Teftiş bulgusu (🟠): "bitti" türetmesi 4 kopya, 3 farklı tanımdı
//   (dag.ts karne · yolharitasi sayaç/ikon · denetci acikIsVar) — bloklu
//   kiminde açık-iş sayılıyor kiminde sayılmıyordu. Kanonik tanım burada
//   yaşar; panel + denetçi + karne AYNI fonksiyonu okur (YUZ-1.2 tek-kaynak).
//   SAF: vscode/node importu yok — node:test doğrudan koşar.
// ═══════════════════════════════════════════════════════════════════════════
import type { Dugum } from "./sozdizim.ts";

/** Adım durum enum'u (kanon ortakEnum ikizi — STR-4 bloklu · YAS-4.2 doğrulanmamış dahil). */
export type AdimDurumu = "beklemede" | "geliştirmede" | "tamamlandı" | "doğrulanmamış" | "bloklu";

/** AdimDurumu tipinin çalışma-zamanı kümesi (tek kaynak — YUZ-1.2): iş-ilerlemesi
 *  denetimleri yalnız bu sözlükteki durumları karşılaştırır. Teknoloji/Takım
 *  gibi düğümlerin durum sözlüğü FARKLIDIR (aktif · ertelenen · değerlendirilecek
 *  — seçim beyanıdır, iş ilerlemesi değil) ve bu kümeye girmez. */
export const ADIM_YASAM_DURUMLARI: ReadonlySet<string> =
  new Set<AdimDurumu>(["beklemede", "geliştirmede", "tamamlandı", "doğrulanmamış", "bloklu"]);

/** Düğümün durum alanını okur — parametre VE gövde-özelliği birlikte
 *  (motor alanDeger dersi: yalnız-parametre okuma ikinci-yazımı kaçırır). */
export function adimDurumu(d: Dugum): string | undefined {
  const p = [...d.parametreler, ...d.ozellikler].find((x) => x.ad === "durum");
  return p?.deger.metin;
}

/** Kapsayıcının türetilmiş durum sayaçları — KANONİK tek tanım. */
export interface TuretilmisDurum {
  tamam: number;         // tamamlandı Adım sayısı
  toplam: number;        // tüm Adım sayısı
  gelistirmede: number;  // geliştirmede Adım sayısı (kapsayıcı "sürüyor" kanıtı)
  bloklu: number;        // bloklu Adım sayısı — bloklu-içerir bayrağı = bloklu > 0
  acikIs: boolean;       // tamamlandı OLMAYAN Adım var (bloklu ve durumsuz DAHİL)
  bitti: boolean;        // toplam > 0 && tamam === toplam
}

/** Durum listesinden kapsayıcı durumunu türetir. Durumsuz Adım (undefined)
 *  açık iştir — "durum yazılmadı" hiçbir zaman "bitti" sayılmaz. */
export function durumTuret(durumlar: Iterable<string | undefined>): TuretilmisDurum {
  let tamam = 0, toplam = 0, gelistirmede = 0, bloklu = 0;
  for (const d of durumlar) {
    toplam++;
    if (d === "tamamlandı") tamam++;
    else if (d === "geliştirmede") gelistirmede++;
    else if (d === "bloklu") bloklu++;
  }
  return { tamam, toplam, gelistirmede, bloklu,
           acikIs: tamam < toplam, bitti: toplam > 0 && tamam === toplam };
}

/** Kapsayıcının RENK evresi (YUZ-4.1: renk=YALNIZ durum): bitti=yeşil ·
 *  sürüyor=sarı (en az bir tamam YA DA geliştirmede) · bekliyor=nötr. */
export type KapsayiciEvre = "bitti" | "sürüyor" | "bekliyor";
export function kapsayiciEvre(t: Pick<TuretilmisDurum, "tamam" | "toplam" | "gelistirmede">): KapsayiciEvre {
  if (t.toplam > 0 && t.tamam === t.toplam) return "bitti";
  return t.tamam > 0 || t.gelistirmede > 0 ? "sürüyor" : "bekliyor";
}

// ── DURUM-GEÇİŞ MAKİNESİ (TUR-2 · Founder kilidi 2026-07-12 reform ③) ────────
//   Kaynak-gerçek KANON (kayit.json durumGecisleri); aşağıdaki YEDEK, kanona
//   erişilemeyen yüzeyler için gömülü ikizdir — nöbet testi birebirliği kilitler
//   (tamamlama YEDEK_ENUM/B5 emsali; farklı anahtar = ikinci gerçek YASAK).

export interface DurumGecisleri {
  ["meşru"]: Record<string, string[]>;
  bilgi: Record<string, string[]>;
  yasak: Record<string, string[]>;
}

export const YEDEK_GECISLER: DurumGecisleri = {
  "meşru": {
    "beklemede":     ["geliştirmede", "tamamlandı", "bloklu", "doğrulanmamış"],
    "geliştirmede":  ["tamamlandı", "bloklu", "doğrulanmamış"],
    "tamamlandı":    ["bloklu"],
    "bloklu":        ["beklemede", "geliştirmede"],
    "doğrulanmamış": ["geliştirmede", "bloklu"],   // YAS-4.2: kanıtlı terfi YALNIZ ŞEF geri-yazımından
  },
  bilgi: {
    "tamamlandı":    ["geliştirmede", "beklemede"],
    "geliştirmede":  ["beklemede"],
    "doğrulanmamış": ["beklemede"],
  },
  yasak: {
    "bloklu":        ["tamamlandı"],
    "doğrulanmamış": ["tamamlandı"],   // YAS-4.2: kanıtsız 'tamamlandı' ilanı elle yazılamaz
  },
};

export type GecisSinifi = "meşru" | "bilgi" | "yasak" | "bilinmeyen";

/** Bir durum geçişini sınıflar. İlk yazım (eski yok) ve aynı-değere yazım
 *  meşrudur; tabloda olmayan çift "bilinmeyen"dir (enum-dışı değer — yazıcılar
 *  zaten enum'da reddeder, denetim geçersiz-durum'la yakalar). */
export function gecisSinifla(
  eski: string | undefined, yeni: string, g: DurumGecisleri = YEDEK_GECISLER,
): GecisSinifi {
  if (!eski || eski === yeni) return "meşru";
  if (g.yasak[eski]?.includes(yeni)) return "yasak";
  if (g.bilgi[eski]?.includes(yeni)) return "bilgi";
  if (g["meşru"][eski]?.includes(yeni)) return "meşru";
  return "bilinmeyen";
}

/** Yasak geçişin RED mesajı — üç yazıcı (MCP · koniYaz · panel) AYNI cümleyi söyler. */
export function yasakGecisMesaji(eski: string, yeni: string, kod: string): string {
  if (eski === "doğrulanmamış") {
    return `'${kod}' ${eski} → ${yeni} YAZILAMAZ — kanıtsız iş bitmiş ilan edilemez; koşuyu yeniden koştur, sicil kanıtlı VERIFIED mühür 'tamamlandı'yı kendisi yazar.`;
  }
  return `'${kod}' ${eski} → ${yeni} YAZILAMAZ — bloklu iş bitmiş ilan edilemez; önce blokajı çöz (bloklu → beklemede/geliştirmede), sonra kapat.`;
}

/** Alt-ağaçtaki Adım durumlarını toplar (AST yüzü — denetçi/panel ortak). */
export function adimDurumlariTopla(kok: Dugum): (string | undefined)[] {
  const out: (string | undefined)[] = [];
  const gez = (d: Dugum): void => {
    if (d.tur === "widget" && d.ad === "Adım") out.push(adimDurumu(d));
    for (const c of d.cocuklar) gez(c);
  };
  for (const c of kok.cocuklar) gez(c);
  return out;
}

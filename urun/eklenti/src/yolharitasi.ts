// ═══════════════════════════════════════════════════════════════════════════
// yolharitasi.ts — 🚂 Yol Haritası Paneli (EKL-F7 · Founder tasarımı 2026-07-06)
//
//   Plan ağacı, Problems'ı kirletmeden KENDİ panelinde yaşar:
//     Blok(tren) → Faz(ray) → Katman → Adım(kutucuk ☐/☑)
//   • Durum dilin parametresidir (durum: beklemede|geliştirmede|tamamlandı);
//     panel yalnız AYNADIR — tek doğruluk kaynağı .sar dosyası (DIL-2 ruhu).
//   • Kutucuk tıklanınca dosyaya WorkspaceEdit ile yazılır (zombi-tampon
//     çakışması sınıfı doğmaz); dosya değişince panel kendini yeniler.
//   • Faz/Blok durumu TÜRETİLMİŞTİR: [tamam/toplam] sayacı çocuklardan
//     hesaplanır, dosyaya YAZILMAZ (çift-kayıt yasağı — DIL-2).
// ═══════════════════════════════════════════════════════════════════════════

import * as vscode from "vscode";
import { existsSync, readFileSync } from "node:fs";
import { dirname, basename, join } from "node:path";
import type { Dugum, Program } from "../../cekirdek/src/sozdizim.ts";
import { yuzeyAdi, tarihRozetiKisa } from "../../cekirdek/src/baslik.ts";   // YUZ: yüzey kodu değil adı gösterir, ad başlık düzeniyle yazılır
import { sarGurultuMu, TARAMA_DISLAMA_GLOB, OlayHatti, TekUcusKilidi } from "./izleyici-cekirdek.ts";   // 🗺️ PRF-A04: panel tazelemesi de olay hattı + tek-uçuş kilidi + tek-kaynak kapsam kullanır
import { dagKur, topolojikSira, fazTarihAnahtari, type Dag } from "../../cekirdek/src/dag.ts";   // 🕰️ MIM-1.2: kardeş Faz sırasının anahtarı motordan (Founder 2026-08-25)
import { etkiCoz, type EtkiSonuc } from "../../cekirdek/src/etki.ts";       // VIT-GRAF-A03: etkiler düğümleri aynı motor
import { koniCikar, koniAlani } from "../../cekirdek/src/koni.ts";     // VIT-GRAF-A04: kart koniyi TEK kaynaktan çıkarır; koniAlani → rapor/yama (STR-4 · NTK-A07)
import { kurallariCikar, dugumeDusenKurallar, kuralNe, KAPSAM_JOKER, type KuralBilgi } from "../../cekirdek/src/kuralci.ts";   // #7: Adım'a düşen kurallar (kapsam TEK KAYNAK)
import { degerBicimle, satirdaDegerDegistir } from "../../cekirdek/src/deger-yaz.ts";
import { geciktir, nabizAbone } from "./nabiz.ts";   // EKL-F9-A07/A08: tek geciktirici + tek kalp (aktif-varlık nabzı ZRF-A06)
import { programAl } from "./onbellek.ts";   // VIT-GRAF-A05: imleç-takibi paylaşımlı AST'den okur
import { GOMULU_KAYIT } from "./gomulu-kanon.ts";   // tip simgeleri kanondan — koni-kartı/hover yüzü (ikon katmanı YUZ-4.2)
import { anadizinBul, mevsimNormalize } from "../../cekirdek/src/denetci.ts";   // DIL-1.2: varlık girişi desenle bulunur · MIM-1.2 ③: mevsim çevrimi MOTORDA tek nokta (zaman-ekseni turu)
import { durumTuret, kapsayiciEvre, gecisSinifla, yasakGecisMesaji, type DurumGecisleri } from "../../cekirdek/src/durum.ts";   // YUZ-4 tek tanım + TUR-2 durum makinesi
import { miniGrafKaydi, type OdakKapisi, type MeyveKapisi } from "./minigraf.ts";   // VIT-GRAF-A08: yol haritasının altındaki mini graf
import { EKSEN_TIPLERI, eksenSvgVaryanti, type EksenTipi, type SatirSimgesi, type AnlamRengi } from "./simge-cizelgesi.ts";   // VIT-KIMLIK-A03/A05: geometrik aile TEK kaynaktan
import { satirIkonu } from "./ortak.ts";   // VIT-KIMLIK-A05: satır simgelerinin iki-tema köprüsü
import { varlikUstleri, enDerinVarlik, varlikSimgesi } from "./yolharitasi-cekirdek.ts";   // 🪆 EKL-F7-A09: küme ilişkisi vscode'suz çekirdekten
import {
  IZ_METINLERI, YOL_METINLERI, kanonikWidgetAdi, kanonikWidgetDuzYazisi,
} from "./yuzey-metinleri.ts";

// ── YUZ-4 RENK KANUNU (Founder kilidi 2026-07-12): renk = YALNIZ DURUM kanalı.
//    Karar mantığı SAF modülde (yol-dekor.ts — davranış testli, Terra-RED
//    onarımı); burada yalnız vscode kabuğu yaşar. Tip zaten üç kanalda konuşur
//    (ikon şekli + kod öneki + girinti) — yazıya tip yüklemek yasak.
import { dekorCoz, DURUM_ROZET, DURUM_ANAHTAR, DURUM_ANLAMI, type Durum } from "./yol-dekor.ts";

const PLAN_TIPLERI = new Set(["Blok", "Faz", "Katman", "AltKatman", "Adım"]);

// Tip kimliği ŞEKİLDE yaşar (YUZ-4 aynen): kapsayıcı satırın şekli
// Founder'ın 2026-07-28'de galeriden seçtiği GEOMETRİK SVG ailesidir
// (VIT-KIMLIK-A03 · tek kaynak: simge-cizelgesi.ts + medya/simgeler rafı).
// VIT-KIMLIK-A05: codicon geri-düşüş çizelgesi SÖKÜLDÜ — kök bilinmeyen
// kurulumda satır simgesiz kalır (uydurma yapılmaz, hazır ikona dönülmez).
// Yazı rengi tip DEĞİL (YUZ-4; YUZ-4.1 gereği rayRenkleri paleti söküldü).

// Varlık satırının simgesi artık sabit değil tipe bağlıdır (EKL-F7-A09 küme
// kimliği): çalışma alanı İSTASYON, proje ile uygulama SEFER — seçim
// yolharitasi-cekirdek.ts içindeki varlikSimgesi işlevinden okunur.

/** Panel satırını DURUMA boyar; blokaj `!` rozeti kapsayıcıdan köke tırmanır
 *  (ikon rengi ÇALINMAZ). Karar yol-dekor.dekorCoz'da — burada yalnız sarma. */
export class YolRenklendirici implements vscode.FileDecorationProvider {
  provideFileDecoration(uri: vscode.Uri): vscode.FileDecoration | undefined {
    if (uri.scheme !== "sarmal-yol") return undefined;
    const [anahtar, blokluHam] = uri.path.slice(1).split("/");
    const d = dekorCoz(anahtar, Number(blokluHam ?? "0") || 0);
    return d
      ? new vscode.FileDecoration(d.rozet, d.ipucu, d.renk ? new vscode.ThemeColor(d.renk) : undefined)
      : undefined;
  }
}

/** 🏦 VARLIK EKSENİ (MIM-1, Founder 2026-07-06): panel kökü = gerçek varlık/proje
 *  düğümü (ÇalışmaAlanı|Proje|Uygulama — ana.sar'dan). Bloklar altına biner;
 *  aidiyet = dosyanın bağlı olduğu ana.sar kökü (MIM-3: klasör=ayna, kod=kanun). */
interface Varlik {
  tur: "varlık";
  tip: string;                 // ÇalışmaAlanı | Proje | Uygulama
  kod: string;
  ad: string;
  kokDizin: string;            // ana.sar'ın dizini
  anaSar: string;              // ana.sar tam yolu
  cocuklar: Oge[];
  tamam: number;
  toplam: number;
  gelistirmede: number;        // YUZ-4: "sürüyor" evresi geliştirmedeyi de sayar
  bloklu: number;              // YUZ-4: blokaj ! rozeti köke kadar tırmanır
}
type PanelOge = Varlik | Oge | Kosum | Bilgi | BilgiGrup;
// (YUZ-4 süpürmesi: VARLIK_SIMGE emoji haritası kalktı — varlık satırı da kanuna uyar:
//  şekil=sefer (satır çizelgesinin sefer simgesi · tren dili), renk=durum, tip hover'da.)

// ── HALKA-IZLE-A03: canlı orkestrasyon akışı — trace satırı panel düğümü olur ──
/** Bir trace (.sarmal/trace/*.jsonl) satırının panel karşılığı (çekirdek IzSatiri ikizi). */
interface IzKaydi {
  zaman?: string;
  adım?: string;
  rol?: string;
  ajanİmza?: { kod: string; ad: string };
  model?: string;
  beceriler?: string[];
  hamPrompt?: string;
  hamYanıt?: unknown;
  tokenGiriş?: number;
  tokenÇıkış?: number;
  sıra?: number;
}
/** İşlenen Adım'ın altındaki orkestrasyon alt-düğümü (✎üretici · 🕵️denetçi · 🛡️güvenlik). */
interface Kosum {
  tur: "koşum";                // ayraçlı union üyesi (oturum-24 PanelOge dersi)
  etiket: string;
  aciklama: string;
  kayit: IzKaydi;
}
const ROL_SIMGE: Record<string, string> = { "üretici": "✎", "denetçi": "🕵️", "güvenlik": "🛡️" };

// ── VIT-GRAF-A03: Adım'ın graf-kenarı alt-düğümleri — panel graf müfettişine büyür ──
/** Adım altında beliren bilgi satırı: ↳bağımlı (rozetli, tıkla→atla) · ↳etkiler · ↳kabul. */
interface Bilgi {
  anlam?: AnlamRengi;          // simgenin anlam rengi (müfettiş IDE-renkleri — Founder 2026-07-12 · A05: üretici ekseni)
  tur: "bilgi";                // ayraçlı union üyesi (oturum-24 PanelOge dersi)
  etiket: string;
  aciklama: string;
  simge: SatirSimgesi;         // geometrik ailenin satır simgesi (VIT-KIMLIK-A05)
  hedef?: { dosya: vscode.Uri; satir: number };   // tıkla → o düğüme atla
}
/** VIT-GRAF-A06: kenar satırlarını toplayan KATLANABİLİR grup — '↳ etkiler [N]'
 *  (Founder 2026-07-11: düz satırlar Adım altını şişiriyordu, geçişli kapanış büyükse liste uzar). */
interface BilgiGrup {
  anlam?: AnlamRengi;
  tur: "bilgi-grup";
  etiket: string;
  aciklama: string;
  simge: SatirSimgesi;
  cocuklar: Bilgi[];
}
/** Kenar listesi taşarsa sessiz kırpma YOK — kalan sayı satır olarak söylenir. */
const KENAR_USTU = 8;
// 🐢 PRF-A05: bu eşiği aşan getChildren turu merceğe düşer — genişletme yolu
// da ölçülür (tazeleme 🗺️ · iz 🛰️ · genişletme 🐢: panelin üç yolu tamam).
const YAVAS_GENISLETME_ESIK_MS = 30;

interface Oge {
  tur: "oge";                  // ayraç (discriminated union: PanelOge = Varlik | Oge)
  tip: string;                 // Blok | Faz | Katman | Adım
  kod: string;
  ad?: string;                 // HTR-YOLHARITASI-INSAN-ADI: panel etiketi (insan yüzü; yoksa koda düşer)
  ne: string;
  durum: Durum;                // Adım için dosyadan; kapsayıcıda türetilir
  dosya: vscode.Uri;
  satir: number;               // düğüm başlangıcı (durum-yazıcı buradan arar)
  durumSatir?: number;         // mevcut durum: DEĞERİNİN konumu (varsa)
  durumSutun?: number;
  durumUzunluk?: number;
  cocuklar: Oge[];
  tamam: number;               // türetilmiş sayaç (Adım: 0|1)
  toplam: number;
  gelistirmede: number;        // YUZ-4: kapsayıcı "sürüyor" kanıtı (durumTuret)
  bloklu: number;              // YUZ-4: bloklu-içerir bayrağı (Adım: 0|1; kapsayıcı: toplam)
  dugum: Dugum;                // AST düğümü — koni kartı TEK kaynaktan çıkarır (VIT-GRAF-A04)
  kabulSayisi: number;         // kabul madde adedi (↳ kabul özet satırı — VIT-GRAF-A03)
  hedefTarih?: string;         // Faz tarifesi (MIM-1: 🚄 varış zamanı — hover'da)
  cagirlar?: string[];         // gövdedeki `çağır KOD` hedefleri (MIM-1 ③ Provider deseni)
}

function parametre(d: Dugum, ad: string) {
  // A11/E1 (bug-avı): alan HEM parametre HEM gövde-özelliği yazılabilir (motor
  // alanDeger dersi) — yalnız-parametre okuma, gövde-durumlu Adım'ı panelde
  // yanlış rozetliyordu (ikinci-yazım körlüğünün eklenti ikizi).
  return d.parametreler.find((p) => p.ad === ad) ?? d.ozellikler.find((p) => p.ad === ad);
}

/** Webview HTML kaçışı — ham metin güvenli basılır (konuşma detayı + koni kartı ortak). */
function kacir(s: unknown): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Ortak webview gövde stili (konuşma detayı + koni kartı — tema-token; ZRF-A04
 *  Founder tarifi: APPLE USULÜ BUZLU CAM — başlıklar TAM YUVARLAK hap, gerçek
 *  backdrop-filter buzu; arkaya kanon gradyanından eriyen renk lekeleri konur ki
 *  buzun ardında dağıtacağı ışık olsun. Boya kaynağı kanon gradyanı (YAS-4.2). */
const KART_PALET = (GOMULU_KAYIT as { renkPaleti?: { gradyan?: string[] } }).renkPaleti ?? {};
const [KART_GRD_A, KART_GRD_B] = KART_PALET.gradyan ?? ["#7C3AED", "#06B6D4"];
const WEBVIEW_STIL = `<style>body{font-family:var(--vscode-editor-font-family);padding:1rem;line-height:1.5}
body::before{content:"";position:fixed;top:-80px;left:-60px;width:340px;height:280px;z-index:-1;pointer-events:none;
background:radial-gradient(circle at 30% 30%,${KART_GRD_A}55,transparent 60%),radial-gradient(circle at 75% 20%,${KART_GRD_B}44,transparent 55%);filter:blur(48px)}
pre{background:var(--vscode-textCodeBlock-background);padding:.8rem;border-radius:14px;white-space:pre-wrap;word-break:break-word}
h1,h2{display:inline-block;border-radius:999px;background:rgba(255,255,255,.07);
-webkit-backdrop-filter:blur(14px) saturate(1.5);backdrop-filter:blur(14px) saturate(1.5);
border:1px solid rgba(255,255,255,.16);box-shadow:inset 0 1px 0 rgba(255,255,255,.20),0 4px 14px rgba(0,0,0,.14)}
h1{padding:.2rem .8rem}
h2{padding:.1rem .65rem}
.k{color:var(--vscode-descriptionForeground)}
ul{padding-left:1.2rem}
a{color:var(--vscode-textLink-foreground);text-decoration:none}
a:hover{text-decoration:underline}
summary{cursor:pointer;margin:.4rem 0}
details ul{margin-top:.4rem}</style>`;

/** #7: widget-adı → aile (GOMULU_KAYIT'ten, siniflama'nın panel ikizi) — kapsam
 *  aile-eşleşmesi için (kural kapsam: "akış" gibi bir AİLEyi hedefleyebilir). */
const WIDGET_AILE = new Map<string, string>(
  ((GOMULU_KAYIT.widgetTipleri as Array<{ ad: string; aile: string }>) ?? []).map((t) => [t.ad, t.aile]),
);

/** #7: kural otoritesi → rozet + sıra (YAS-2.3 · YAS-2.4 · anayasa > politika > tercih). */
const OTORITE_ROZET: Record<string, string> = { anayasa: "⚖️ anayasa", politika: "📋 politika", tercih: "🔧 tercih" };
const OTORITE_SIRA: Record<string, number> = { anayasa: 3, politika: 2, tercih: 1 };

/** Bir .sar programından plan ögelerini süzer (Blok kökleri, iç içe serbest). */
function ogeleriTopla(bildirimler: Dugum[], dosya: vscode.Uri): Oge[] {
  const kokler: Oge[] = [];
  const yap = (d: Dugum): Oge => {
    const durumP = parametre(d, "durum");
    const durum = (durumP?.deger.metin as Durum) || "beklemede";
    const kabulP = [...d.parametreler, ...d.ozellikler].find((p) => p.ad === "kabul");
    const oge: Oge = {
      tur: "oge",
      tip: d.ad,
      kod: parametre(d, "kod")?.deger.metin ?? d.ad,
      ad: parametre(d, "ad")?.deger.metin,   // HTR-YOLHARITASI-INSAN-ADI: etiket kaynağı (yoksa koda düşer)
      ne: parametre(d, "ne")?.deger.metin ?? "",
      durum,
      dosya,
      satir: d.satir,
      durumSatir: durumP?.deger.satir,
      durumSutun: durumP?.deger.sutun,
      durumUzunluk: durumP?.deger.metin?.length,
      cocuklar: [],
      tamam: 0,
      toplam: 0,
      gelistirmede: 0,
      bloklu: 0,
      dugum: d,
      kabulSayisi: kabulP ? (kabulP.deger.tur === "liste" ? (kabulP.deger.ogeler?.length ?? 0) : 1) : 0,
      hedefTarih: parametre(d, "hedefTarih")?.deger.metin,
      cagirlar: d.cocuklar.filter((c) => c.tur === "çağır").map((c) => c.ad),
    };
    for (const c of d.cocuklar) if (PLAN_TIPLERI.has(c.ad)) oge.cocuklar.push(yap(c));
    if (d.ad === "Adım") {
      // YUZ-4 tekleşmesi: Adım sayaçları da kanonik durumTuret'ten (elle üçüncü tanım doğmaz).
      const t = durumTuret([durum]);
      oge.toplam = t.toplam; oge.tamam = t.tamam;
      oge.gelistirmede = t.gelistirmede; oge.bloklu = t.bloklu;
    } else {
      for (const c of oge.cocuklar) {
        oge.tamam += c.tamam; oge.toplam += c.toplam;
        oge.gelistirmede += c.gelistirmede; oge.bloklu += c.bloklu;
      }
      // Renk kurulu BUG ①: kapsayıcının KENDİ durum: bloklu beyanı sayaçtan kaçıyordu —
      // bloklu kapsayıcı artık rozetsiz kalamaz.
      if (durum === "bloklu") oge.bloklu += 1;
    }
    return oge;
  };
  const gez = (d: Dugum): void => {
    // MIM-1: kök Blok VEYA Faz olabilir (yeni diziliş: Faz zaman eksenidir, Blok'u sarar);
    // alt kademeler yap() içinde (PLAN_TIPLERI).
    if (d.ad === "Blok" || d.ad === "Faz") { kokler.push(yap(d)); return; }
    for (const c of d.cocuklar) gez(c);
  };
  for (const b of bildirimler) gez(b);
  return kokler;
}

const varlikOnbellek = new Map<string, Omit<Varlik, "cocuklar" | "tamam" | "toplam" | "gelistirmede" | "bloklu">>();

/** Dosyadan yukarı yürü: anadizin'li ilk dizin = varlık kökü (DIL-1.2 deseni:
 *  *_anadizin.sar; eski ana.sar da tanınır); kimliği giriş dosyasının
 *  KÖK düğümünden oku (tip + kod + ad) — panel icat etmez, dili aynalar (MIM-1). */
function varlikBul(dosyaYolu: string): Omit<Varlik, "cocuklar" | "tamam" | "toplam" | "gelistirmede" | "bloklu"> {
  let dizin = dirname(dosyaYolu);
  for (let i = 0; i < 12; i++) {
    const bellek = varlikOnbellek.get(dizin);
    if (bellek) return bellek;
    const anaSar = anadizinBul(dizin);
    if (anaSar) {
      let tip = "Proje", kod = basename(dizin), ad = basename(dizin);
      try {
        const metin = readFileSync(anaSar, "utf8");
        const kokEs = /^(ÇalışmaAlanı|Proje|Uygulama)\(/mu.exec(metin);
        if (kokEs) {
          tip = kokEs[1];
          const govde = metin.slice(kokEs.index);
          kod = /\bkod:\s*([A-Za-zÇĞİÖŞÜçğıöşü0-9-]+(?:\.[0-9]+){0,2})/u.exec(govde)?.[1] ?? kod;
          ad = /\bad:\s*"([^"]+)"/u.exec(govde)?.[1] ?? ad;
        }
      } catch { /* klasör kimliği yeter */ }
      const sonuc = { tur: "varlık" as const, tip, kod, ad, kokDizin: dizin, anaSar };
      varlikOnbellek.set(dizin, sonuc);
      return sonuc;
    }
    const ust = dirname(dizin);
    if (ust === dizin) break;
    dizin = ust;
  }
  return { tur: "varlık", tip: "Proje", kod: basename(dirname(dosyaYolu)),
           ad: basename(dirname(dosyaYolu)), kokDizin: dirname(dosyaYolu), anaSar: "" };
}

/**
 * Bir dosyanın bağlı olduğu Projenin kimliği (kod ile insan adı). Tanı sunum
 * yüzeyleri (Hatırlatıcılar ile Bildirimler) kayıtlarını bu kimliğe göre
 * gruplar ve Yol Haritası ile AYNI çözümlemeyi kullanır; ikinci bir kök arama
 * yazılmaz, dolayısıyla iki panel aynı dosyayı farklı Projeye yazamaz.
 */
export function projeKimligi(dosyaYolu: string): { kod: string; ad: string } {
  const v = varlikBul(dosyaYolu);
  return { kod: v.kod, ad: v.ad };
}

export class YolHaritasi implements vscode.TreeDataProvider<PanelOge> {
  private degisti = new vscode.EventEmitter<PanelOge | void>();
  readonly onDidChangeTreeData = this.degisti.event;
  private varliklar: Varlik[] = [];
  // 🪆 EKL-F7-A09: varlıklar arası küme ilişkisi — üstü olmayan köktedir,
  // kapsananlar kapsayıcının çocuğu olarak basılır.
  private varlikUst = new Map<Varlik, Varlik | undefined>();
  // ── ZRF-A06 · aktif-varlık nabzı (Founder 2026-07-18: "hangi proje üzerindeysek
  //    o proje ikonu yanıp sönse, aktifliği belli olsun") — imlecin yaşadığı varlığın
  //    roketi tek kalple atar; tazeleme YALNIZ o satırı yeniden çizer (öğe-hedefli fire).
  private aktifVarlik?: Varlik;
  private aktifAtis = true;

  /** Aktif editörün dosyası hangi varlığın kökündeyse onu aktif işaretler (MIM-1.1 deseni). */
  aktifligiGuncelle(editor: vscode.TextEditor | undefined): void {
    const yol = editor?.document.uri.fsPath;
    // 🪆 EKL-F7-A09: iç içe köklerde ilk eşleşen değil EN DERİN varlık aktifleşir.
    const yeni = yol ? enDerinVarlik(this.varliklar, yol) : undefined;
    if (yeni === this.aktifVarlik) return;
    const eski = this.aktifVarlik;
    this.aktifVarlik = yeni;
    if (eski) this.degisti.fire(eski);
    if (yeni) this.degisti.fire(yeni);
  }

  /** Kalp atışı — yalnız aktif varlık satırı tazelenir (tüm ağaç DEĞİL; maliyet tek öğe). */
  nabizAt(atis: boolean): void {
    this.aktifAtis = atis;
    if (this.aktifVarlik) this.degisti.fire(this.aktifVarlik);
  }
  /** YUZ-4 karşı-tanısı: ayrıştırılamayan dosyalar sessiz kaybolmaz — kök satırda sayılır. */
  private kirikDosyalar: string[] = [];
  /** IZLE-A03: Adım KOD → trace kayıtları (.sarmal/trace/*.jsonl — koşum alt-düğümleri). */
  private izler = new Map<string, IzKaydi[]>();
  /** VIT-GRAF-A03: yenile()'nin kurduğu Dag saklanır — kenar/etki düğümleri tuş başına
   *  yeniden KURULMAZ (onbellek deseni); serileştirme mantığı graf.ts'te tek kaynak. */
  private dag?: Dag;
  /** #7: çalışma alanındaki TÜM kurallar (yenile()'de toplanır) + kural→kaynak URI
   *  (koni kartında atla-linki için). Kapsam eşleşmesi cekirdek/kuralci TEK KAYNAK. */
  private kurallar: KuralBilgi[] = [];
  private kuralUri = new Map<KuralBilgi, vscode.Uri>();
  /** 🐢 PRF-A05: kenar-grubu önbelleği (YENİLE-ÖMÜRLÜ) — Adım KODU → bilgiUret çıktısı.
   *  Graf yalnız yenile()'de kurulur; turlar arasında veri değişmez. Faz aç/kapa
   *  yeniden hesap TETİKLEMEZ — kapanış taramaları tek karede üst üste binmez.
   *  Koşum satırları BURADA DEĞİL: iz canlılığı feda edilmez (izTazele hızlı yolu). */
  private bilgiOnbellek = new Map<string, (Bilgi | BilgiGrup)[]>();

  diliTazele(): void {
    this.bilgiOnbellek.clear();
    this.degisti.fire();
  }
  /** 🐢 PRF-A05: etkiCoz kapanış-sonucu önbelleği (yenile-ömürlü) — koni kartı da buradan okur. */
  private etkiOnbellek = new Map<string, EtkiSonuc | undefined>();
  /** 🐢 PRF-A05 saha bulgusu 2 (Founder kanal ekranı: ilk genişletme ~950 ms): topolojik
   *  sıra yenile()'de ZATEN kurulur — saklanır ve etkiCoz'a enjekte edilir; Adım-başına
   *  tüm-graf sıralaması (ilk hesap dahil) tamamen biter. */
  private topoSira: string[] = [];

  /** 🐢 PRF-A05: etki sonucu TEK hesaplanır — aynı yenile turunda ikinci etkiCoz koşusu yok. */
  private etkiAl(kod: string): EtkiSonuc | undefined {
    if (!this.dag || !kod) return undefined;
    if (!this.etkiOnbellek.has(kod)) this.etkiOnbellek.set(kod, etkiCoz(this.dag, kod, this.topoSira));
    return this.etkiOnbellek.get(kod);
  }
  /** VIT-GRAF-A08: mini graf saklı Dag'ı BURADAN okur (yeni tarama yok — tek kaynak). */
  dagAl(): Dag | undefined { return this.dag; }
  gorunum?: vscode.TreeView<PanelOge>;
  /** VIT-KIMLIK-A03: eklenti kökü — geometrik SVG iconPath'leri buradan mutlaklaşır.
   *  Kayıt sırasında context.extensionUri'den dolar; köksüz (saf sınama)
   *  kurulumda codicon geri düşüşü çalışır, ağaç ikonsuz kalmaz. */
  eklentiKoku?: vscode.Uri;
  /** 🗺️ PRF-A04: panel-turu ölçüm yazıcısı — eklenti.ts 'Sarmal Performans'
   *  kanalını bağlar (A01 merceğinin panel kör-noktası kapanır). */
  olcum?: (satir: string) => void;
  /** PRF-A04: trace dosyası içerik önbelleği (değişme-zamanı anahtarlı) —
   *  her turda bütün JSONL'leri baştan okuma borcu kapandı. */
  private izOnbellek = new Map<string, { degisti: number; kayitlar: IzKaydi[] }>();

  /** Trace dosyalarını okuyup Adım koduna göre gruplar (IZLE-A03 · sessiz-toleranslı).
   *  PRF-A04: yalnız değişme-zamanı yenilenen dosya yeniden okunur/ayrıştırılır. */
  private async izleriYukle(): Promise<void> {
    // RED-2: yerel haritada kurup ATOMİK takas — eşzamanlı iz/panel turları
    // birbirinin yarım hâlini görmez (izler hiçbir an boş pencerede kalmaz).
    const yeniIzler = new Map<string, IzKaydi[]>();
    const dosyalar = await vscode.workspace.findFiles("**/.sarmal/trace/*.jsonl", "**/node_modules/**");
    const bulunan = new Set<string>();
    for (const uri of dosyalar) {
      bulunan.add(uri.fsPath);
      try {
        const st = await vscode.workspace.fs.stat(uri);
        const eski = this.izOnbellek.get(uri.fsPath);
        let kayitlar: IzKaydi[];
        if (eski && eski.degisti === st.mtime) kayitlar = eski.kayitlar;
        else {
          kayitlar = [];
          const metin = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString("utf8");
          for (const satir of metin.split("\n")) {
            if (!satir.trim()) continue;
            try {
              const k = JSON.parse(satir) as IzKaydi;
              if (k.adım) kayitlar.push(k);
            } catch { /* bozuk satır akışı kırmaz */ }
          }
          this.izOnbellek.set(uri.fsPath, { degisti: st.mtime, kayitlar });
        }
        for (const k of kayitlar) {
          if (!yeniIzler.has(k.adım!)) yeniIzler.set(k.adım!, []);
          yeniIzler.get(k.adım!)!.push(k);
        }
      } catch { /* okunamayan trace dosyası atlanır */ }
    }
    for (const yol of [...this.izOnbellek.keys()]) if (!bulunan.has(yol)) this.izOnbellek.delete(yol);
    this.izler = yeniIzler;
  }

  /** 🛰️ IZLE-A03 HIZLI YOLU (RED-2 onarımı): trace olayı TAM panel turunu
   *  (findFiles + AST + DAG + ağaç) BEKLEMEZ — yalnız izleri tazeler ve ağacı
   *  çizdirir. Koşum düğümleri getChildren'da this.izler'den okunduğu için bu
   *  yeterlidir; ≤1sn sözleşmesinin (sef_halka IZLE-A03) yapısal güvencesi:
   *  350 ms geciktirme + küçük iz turu, tam-tur kuyruğundan bağımsız. */
  async izTazele(tetik = "iz-olayı"): Promise<void> {
    const turBasi = Date.now();
    await this.izleriYukle();
    this.degisti.fire();
    this.olcum?.(IZ_METINLERI.izTuru(
      new Date().toTimeString().slice(0, 8), Date.now() - turBasi, tetik,
    ));
  }

  async yenile(tetik = "?"): Promise<void> {
    const turBasi = Date.now();   // 🗺️ PRF-A04: panel turu mercekten okunur
    await this.izleriYukle();   // IZLE-A03: koşum düğümleri ağaçla birlikte tazelenir
    // PRF-A04 (RED-1 D1 hizası): dışlama globu izleyici süzgeciyle TEK kaynaktan.
    const dosyalar = await vscode.workspace.findFiles("**/*.sar", TARAMA_DISLAMA_GLOB);
    // DIL-1.2 ad göçü onarımı (Founder saha bulgusu 2026-07-18: "OS rayda görünüyordu,
    // görünmez oldu"): Blok'suz kök yedeği eski `ana.sar` adını arıyordu; varlık
    // girişleri artık `*_anadizin.sar` — iki desen birlikte aranır, iki varlık yan
    // yana RAY'da kalır (Founder kararı 2026-07-06: Blok'suz kök de RAY'dır).
    const analar = await vscode.workspace.findFiles(
      "**/{ana.sar,*_anadizin.sar}", TARAMA_DISLAMA_GLOB);
    const yeni: Oge[] = [];
    const kirik: string[] = [];
    const programlar = new Map<string, Program>();
    this.kurallar = [];
    this.kuralUri.clear();
    for (const uri of dosyalar) {
      try {
        // PRF-A04: paylaşımlı AST önbelleği (onbellek.programAl) — denetim turuyla
        // aynı (uri, versiyon) ikinci kez AYRIŞTIRILMAZ; çifte parse borcu kapandı.
        const program = programAl(await vscode.workspace.openTextDocument(uri));
        if (!program) { kirik.push(uri.fsPath); continue; }   // sözdizim kırık — kök satırda sayılır
        programlar.set(uri.fsPath, program);
        yeni.push(...ogeleriTopla(program.bildirimler, uri));
        // #7: çalışma alanı geneli kurallar — koni kartı düğüme düşenleri süzer
        for (const k of kurallariCikar(program)) { this.kurallar.push(k); this.kuralUri.set(k, uri); }
      } catch { kirik.push(uri.fsPath); }   // YUZ-4 karşı-tanısı: sessiz kayıp YOK — kök satırda sayılır
    }
    this.kirikDosyalar = kirik;
    // 🕰️ MIM-1.2 ③ (zaman-ekseni turu): Blok-tarafı `mevsim:` kenarı sanal çağır'a normalize edilir —
    // çevrim MOTORDA tek noktadır (DIL-2 çift-mantık yasağı; panel kendi çevirisini yazmaz).
    // Faz ögelerinin çağır listesi normalize SONRASI tazelenir (Oge.dugum aynı AST düğümü):
    // aşağıdaki çağır-çevrimi iki yazımı da aynı taşıma mantığıyla kapsar.
    mevsimNormalize(programlar);
    for (const o of yeni) if (o.tip === "Faz") o.cagirlar = o.dugum.cocuklar.filter((c) => c.tur === "çağır").map((c) => c.ad);
    // kararlı taban sırası: dosya yolu + satır (topolojik eşitlikte kaynak sırası kazanır)
    yeni.sort((a, b) => a.dosya.fsPath.localeCompare(b.dosya.fsPath) || a.satir - b.satir);

    // 🌀 ÇAĞIR-ÇEVRİMİ (Founder 2026-07-12: "Blok neden Faz'ın altına yerleşmiyor?"):
    // MIM-1 ③ Provider deseni — mevsim Faz'ı Blok'ları `çağır BLK-X` ile kapsar
    // (kopya yasak, DIL-2). Panel bu kenarı AĞACA çevirir: çağrılan KÖK Blok,
    // çağıran Faz'ın altına biner (aynı Oge — kopya değil, taşıma); sayaçlar
    // kabarcıklanır → mevsim ilerlemesi [tamam/toplam] gerçek olur. İlk çağıran
    // kazanır; kök-olmayan hedefler ve çözülmeyen kodlar dokunulmaz.
    {
      const kokler = new Map(yeni.map((o) => [o.kod, o]));
      const tasinan = new Set<Oge>();
      for (const faz of yeni) {
        if (faz.tip !== "Faz" || !faz.cagirlar?.length) continue;
        for (const hedefKod of faz.cagirlar) {
          const hedef = kokler.get(hedefKod);
          if (!hedef || hedef === faz || hedef.tip !== "Blok" || tasinan.has(hedef)) continue;
          faz.cocuklar.push(hedef);
          tasinan.add(hedef);
          faz.tamam += hedef.tamam; faz.toplam += hedef.toplam;
          faz.gelistirmede += hedef.gelistirmede; faz.bloklu += hedef.bloklu;
        }
      }
      for (let i = yeni.length - 1; i >= 0; i--) if (tasinan.has(yeni[i])) yeni.splice(i, 1);
    }

    // 🔗 ORK-1.2: kardeşler TOPOLOJİK sıraya dizilir — Adım rütbesi DAG'dan, kapsayıcı
    // rütbesi çocuklarının EN GEÇinden TÜRETİLİR (panel aynadır, DIL-2: kenar yaprakta
    // bir kez; kenarsız öğe rütbesiz kalır ve kaynak sırasını korur — serbest iş).
    this.dag = dagKur(programlar);   // VIT-GRAF-A03: graf saklanır — kenar düğümleri buradan
    // 🐢 PRF-A05: graf değişti — kenar/etki önbellekleri yalnız BURADA boşalır
    // (yenile-ömürlü sözleşme: bayat veri gösterilmez, aç/kapa hesap tetiklemez).
    this.bilgiOnbellek.clear();
    this.etkiOnbellek.clear();
    const { sira } = topolojikSira(this.dag);
    this.topoSira = sira;   // 🐢 PRF-A05: kenar grupları aynı sırayı paylaşır (etkiAl enjeksiyonu)
    const rutbeHarita = new Map(sira.map((k, i) => [k, i]));
    const rutbe = (o: Oge): number => {
      if (o.tip === "Adım") return o.cocuklar.length === 0 ? (rutbeHarita.get(o.kod) ?? -1) : -1;
      let r = -1;
      for (const c of o.cocuklar) r = Math.max(r, rutbe(c));
      return r;
    };
    // 🕰️ MIM-1.2 (Founder 2026-08-25): kardeş Fazlar TARİH sırasına dizilir — Founder
    // panelde mevsimlerin ad ve dosya sırasıyla karıştığını gördü. Anahtar motorun
    // fazTarihAnahtari işlevinden gelir (DIL-2: panel kendi çevirisini yazmaz); Faz
    // olmayan öğeler ile tarihsiz Fazlar tarihli mevsimlerin ARKASINDA topolojik
    // sırayı olduğu gibi korur (aynı listede karışık tipler için de toplam sıra tutarlıdır).
    const zamanAnahtari = (o: Oge): string => fazTarihAnahtari(o.tip === "Faz" ? o.hedefTarih : undefined);
    const topolojikSirala = (liste: Oge[]): void => {
      liste.sort((a, b) => {
        const za = zamanAnahtari(a), zb = zamanAnahtari(b);
        if (za !== zb) return za < zb ? -1 : 1;
        return (rutbe(a) - rutbe(b)) ||
          a.dosya.fsPath.localeCompare(b.dosya.fsPath) ||
          a.satir - b.satir;
      });
      for (const o of liste) topolojikSirala(o.cocuklar);
    };

    // MIM-1: Bloklar varlık köklerine biner (ÇalışmaAlanı/Proje/Uygulama)
    varlikOnbellek.clear();
    const harita = new Map<string, Varlik>();
    for (const oge of yeni) {
      const kimlik = varlikBul(oge.dosya.fsPath);
      let v = harita.get(kimlik.kokDizin);
      if (!v) { v = { ...kimlik, cocuklar: [], tamam: 0, toplam: 0, gelistirmede: 0, bloklu: 0 }; harita.set(kimlik.kokDizin, v); }
      v.cocuklar.push(oge);
      v.tamam += oge.tamam;
      v.toplam += oge.toplam;
      v.gelistirmede += oge.gelistirmede;
      v.bloklu += oge.bloklu;   // YUZ-4: blokaj rozeti köke (varlık satırına) kadar tırmanır
    }
    // 🚆 Blok'suz ana.sar kökleri de RAY'dır (Founder 2026-07-06 13:00):
    // iki varlık yan yana görünür — henüz blok dikilmemiş bahçe de istasyondadır.
    for (const uri of analar) {
      const kimlik = varlikBul(uri.fsPath);
      if (!harita.has(kimlik.kokDizin))
        harita.set(kimlik.kokDizin, { ...kimlik, cocuklar: [], tamam: 0, toplam: 0, gelistirmede: 0, bloklu: 0 });
    }
    // 🔗 ORK-1.2: her varlığın Blok'ları + tüm alt-kardeşler topolojik sıraya dizilir
    // (BLK-DOGUS gibi çok-bağımlı bloklar kendiliğinden en alta iner).
    for (const v of harita.values()) topolojikSirala(v.cocuklar);
    this.varliklar = [...harita.values()].sort((a, b) => a.ad.localeCompare(b.ad, "tr"));
    this.varlikUst = varlikUstleri(this.varliklar);   // 🪆 EKL-F7-A09: küme ilişkisi her turda taze kurulur
    // ZRF-A06: varlık nesneleri yeniden kuruldu — bayat aktif referansı taze eşine bağlanır.
    this.aktifVarlik = undefined;
    this.aktifligiGuncelle(vscode.window.activeTextEditor);
    this.degisti.fire();
    // 🗺️ PRF-A04: panel turu kanala düşer — A01 merceğinin kör noktası kapandı.
    this.olcum?.(IZ_METINLERI.panelTuru(
      new Date().toTimeString().slice(0, 8), Date.now() - turBasi, dosyalar.length, tetik,
    ));
  }

  varlikListesi(): Varlik[] { return this.varliklar; }

  /** VIT-GRAF-A05: KOD'dan panel Oge'si — canlı-harita imleç takibi buradan bulur. */
  kodlaBul(kod: string): Oge | undefined {
    const ara = (l: Oge[]): Oge | undefined => {
      for (const o of l) {
        if (o.kod === kod) return o;
        const alt = ara(o.cocuklar);
        if (alt) return alt;
      }
      return undefined;
    };
    for (const v of this.varliklar) {
      const b = ara(v.cocuklar);
      if (b) return b;
    }
    return undefined;
  }

  getParent(p: PanelOge): PanelOge | undefined {
    // 🪆 EKL-F7-A09: kapsanan varlık artık kökte değil — reveal üstünü bilmeli.
    if (p.tur === "varlık") return this.varlikUst.get(p);
    return undefined;   // öteki türlerde kök-seviye çözümü yeterli
  }

  /** VIT-GRAF-A03 + A06: Adım'ın graf-kenarı bilgisi — kenarlar '↳ bağımlı [N]' / '↳ etkiler [N]'
   *  KATLANABİLİR grubuna toplanır (düz satırlar Adım altını şişiriyordu — Founder 2026-07-11);
   *  taşan liste grubun içinde de sessiz kırpılmaz: '… +N daha' satırı kalanı sayıyla söyler. */
  private bilgiUret(o: Oge): (Bilgi | BilgiGrup)[] {
    // 🐢 PRF-A05: yenile-ömürlü önbellek — kalabalık Faz kapatılıp açıldığında
    // kenar grupları hazırdan gelir (Adım-başına kapanış taraması tekrarlanmaz).
    const hazir = o.kod ? this.bilgiOnbellek.get(o.kod) : undefined;
    if (hazir) return hazir;
    const sonuc: (Bilgi | BilgiGrup)[] = [];
    const d = this.dag?.dugumler.get(o.kod);
    const grupYap = (onek: string, simge: SatirSimgesi, kodlar: string[], ozet: string, not?: (k: string) => string, anlam?: AnlamRengi): BilgiGrup => {
      const cocuklar: Bilgi[] = kodlar.slice(0, KENAR_USTU).map((k) => {
        const hedefD = this.dag?.dugumler.get(k);
        // Founder 2026-07-12: emoji nokta yerine durum-RENKLİ nokta (IDE dili);
        // A05: nokta geometrik aileden, rengi DURUM_ANLAMI ekseninden gelir.
        const durumAnlam = hedefD?.durum ? DURUM_ANLAMI[hedefD.durum as Durum] : undefined;
        return {
          tur: "bilgi" as const, simge: "nokta" as const, anlam: durumAnlam,
          etiket: k,
          aciklama: not?.(k) ?? (hedefD ? kanonikWidgetAdi(hedefD.tip, hedefD.tip) : ""),
          hedef: hedefD ? { dosya: vscode.Uri.file(hedefD.dosya), satir: hedefD.satir } : undefined,
        };
      });
      if (kodlar.length > KENAR_USTU) {
        // A05: taşan satır grup simgesini TEKRARLAMAZ (grup ile kayıt aynı simgeyi
        // taşımaz kanunu) — devam üç noktası kalan sayının dürüst işaretidir.
        cocuklar.push({ tur: "bilgi", simge: "devam", anlam, etiket: YOL_METINLERI.daha(kodlar.length - KENAR_USTU),
          aciklama: YOL_METINLERI.grafinTamami });
      }
      return { tur: "bilgi-grup", simge, anlam, etiket: `↳ ${onek} [${kodlar.length}]`, aciklama: ozet, cocuklar };
    };
    if (d?.oncekiler.length) sonuc.push(grupYap(YOL_METINLERI.bagimli, "baglanti-geri", d.oncekiler, "", undefined, "kenar"));   // 🔗 editördeki bağımlı: pembesiyle aynı dil
    if (this.dag && d) {
      const e = this.etkiAl(o.kod);   // 🐢 PRF-A05: kapanış hesabı önbellekten
      if (e && (e.dogrudan.length || e.gecisli.length)) {
        const gecisliKume = new Set(e.gecisli);
        sonuc.push(grupYap(YOL_METINLERI.etkiler, "baglanti-ileri", [...e.dogrudan, ...e.gecisli],
          `⚡${e.dogrudan.length} · 🌊${e.gecisli.length}`,
          (k) => gecisliKume.has(k) ? YOL_METINLERI.gecisli : YOL_METINLERI.dogrudan, "turuncu"));
      }
    }
    if (o.kabulSayisi > 0) {
      sonuc.push({ tur: "bilgi", simge: "kabul", anlam: "basari", etiket: YOL_METINLERI.kabul(o.kabulSayisi),
        aciklama: YOL_METINLERI.koniDetayi, hedef: { dosya: o.dosya, satir: o.satir } });
    }
    if (o.kod) this.bilgiOnbellek.set(o.kod, sonuc);   // 🐢 PRF-A05
    return sonuc;
  }

  /** Adım'ın genişleyebilir olup olmadığı — kenar/kabul/koşum bilgisi varsa müfettiş açılır. */
  bilgili(o: Oge): boolean {
    const d = this.dag?.dugumler.get(o.kod);
    return Boolean(o.kabulSayisi > 0 || d?.oncekiler.length || d?.sonrakiler.length ||
      (this.izler.get(o.kod)?.length ?? 0) > 0);
  }

  getChildren(oge?: PanelOge): PanelOge[] {
    // 🐢 PRF-A05: genişletme yolu da ölçülür — eşiği aşan tur kanala tek satır
    // düşer; saha ölçümü hissiyata muhtaç kalmaz (tazeleme 🗺️ · iz 🛰️ · genişletme 🐢).
    const bas = Date.now();
    const sonuc = this.cocuklariUret(oge);
    const sure = Date.now() - bas;
    if (sure >= YAVAS_GENISLETME_ESIK_MS) {
      const kim = oge === undefined ? "kök"
        : oge.tur === "varlık" || oge.tur === "oge" ? oge.kod : oge.etiket;
      this.olcum?.(IZ_METINLERI.yavasGenisletme(
        new Date().toTimeString().slice(0, 8), YOL_METINLERI.yavasGenisletme(sure, kim, sonuc.length),
      ));
    }
    return sonuc;
  }

  private cocuklariUret(oge?: PanelOge): PanelOge[] {
    if (!oge) {
      // YUZ-4: kırık-dosya karşı-tanısı — panel "her şey yolunda" YALANI söyleyemez;
      // ayrıştırılamayan dosyalar kök satırda sayı + tıkla-aç listesiyle görünür.
      if (this.kirikDosyalar.length) {
        const grup: BilgiGrup = {
          tur: "bilgi-grup", simge: "uyari", anlam: "uyari",
          etiket: YOL_METINLERI.kirikDosya(this.kirikDosyalar.length),
          aciklama: YOL_METINLERI.kirikDosyaAciklamasi,
          cocuklar: this.kirikDosyalar.map((yol) => ({
            tur: "bilgi" as const, simge: "dosya" as const, anlam: "uyari" as const,
            etiket: basename(yol), aciklama: yol,
            hedef: { dosya: vscode.Uri.file(yol), satir: 1 },
          })),
        };
        return [grup, ...this.kokVarliklar()];
      }
      return this.kokVarliklar();
    }
    if (oge.tur === "koşum" || oge.tur === "bilgi") return [];   // koşum/bilgi yapraktır
    if (oge.tur === "bilgi-grup") return oge.cocuklar;           // VIT-GRAF-A06: kenar grubu açılır
    // IZLE-A03 + VIT-GRAF-A03: işlenen Adım'ın altında orkestrasyon akışı (koşumlar,
    // trace sırasında) + graf-kenarı bilgi satırları (bağımlı · etkiler · kabul).
    if (oge.tur === "oge" && oge.tip === "Adım") {
      const kayitlar = this.izler.get(oge.kod) ?? [];
      const kosum: Kosum[] = kayitlar.map((k) => ({
        tur: "koşum",
        etiket: `${ROL_SIMGE[k.rol ?? ""] ?? "·"} ${k.rol ?? "?"}${k.ajanİmza ? ` · ${k.ajanİmza.kod}` : ""}`,
        aciklama: [
          typeof k.tokenGiriş === "number" || typeof k.tokenÇıkış === "number"
            ? `${k.tokenGiriş ?? "?"}→${k.tokenÇıkış ?? "?"}tk` : "",
          k.model ?? "",
          k.beceriler?.length ? `⚙️${k.beceriler.length}` : "",
        ].filter(Boolean).join(" · "),
        kayit: k,
      }));
      return [...kosum, ...this.bilgiUret(oge), ...oge.cocuklar];
    }
    if (oge.tur === "varlık") {
      // 🪆 EKL-F7-A09: kapsanan varlıklar kapsayıcının altında, kendi plan
      // ögelerinden ÖNCE görünür — küme önce üyelerini, sonra kendi işini anlatır.
      return [...this.altVarliklar(oge), ...oge.cocuklar];
    }
    return oge.cocuklar;   // Oge cocuklar: Oge[] taşır
  }

  /** 🪆 EKL-F7-A09: kökte yalnız üstü olmayan varlıklar — kapsananlar kümesinin içindedir. */
  private kokVarliklar(): Varlik[] { return this.varliklar.filter((v) => !this.varlikUst.get(v)); }

  /** 🪆 EKL-F7-A09: bir kapsayıcının doğrudan sardığı varlıklar. */
  private altVarliklar(ust: Varlik): Varlik[] { return this.varliklar.filter((v) => this.varlikUst.get(v) === ust); }

  getTreeItem(p: PanelOge): vscode.TreeItem {
    if (p.tur === "bilgi-grup") {
      // VIT-GRAF-A06 — kenarlar tek katlanabilir grupta: Adım altı şişmez, sayı etikette.
      const eleman = new vscode.TreeItem(p.etiket, vscode.TreeItemCollapsibleState.Collapsed);
      eleman.description = p.aciklama;
      eleman.tooltip = YOL_METINLERI.bilgiGrubuIpucu(p.etiket, p.aciklama ?? "");
      eleman.iconPath = satirIkonu(this.eklentiKoku, p.simge, p.anlam);
      return eleman;
    }
    if (p.tur === "bilgi") {
      // VIT-GRAF-A03 satırı — kenar tıklaması hedef düğüme atlar (satıra-atla korunur).
      const eleman = new vscode.TreeItem(p.etiket, vscode.TreeItemCollapsibleState.None);
      eleman.description = p.aciklama;
      eleman.tooltip = YOL_METINLERI.bilgiIpucu(p.etiket, p.aciklama ?? "", !!p.hedef);
      eleman.iconPath = satirIkonu(this.eklentiKoku, p.simge, p.anlam);
      if (p.hedef) eleman.command = {
        command: "vscode.open", title: YOL_METINLERI.dugumeAtla,
        arguments: [p.hedef.dosya, { selection: new vscode.Range(p.hedef.satir - 1, 0, p.hedef.satir - 1, 0) }],
      };
      return eleman;
    }
    if (p.tur === "koşum") {
      // IZLE-A03 satırı — tıklama IZLE-A04 konuşma detayını açar (webview).
      const eleman = new vscode.TreeItem(p.etiket, vscode.TreeItemCollapsibleState.None);
      eleman.description = p.aciklama;
      eleman.tooltip = YOL_METINLERI.kosumIpucu(p.etiket, p.kayit.zaman ?? "");
      eleman.iconPath = satirIkonu(this.eklentiKoku, "kosum", "turuncu");
      eleman.command = { command: "sarmal.konusmaDetay", title: YOL_METINLERI.konusmaDetayi, arguments: [p.kayit] };
      return eleman;
    }
    if (p.tur === "varlık") {
      const evre = kapsayiciEvre(p);   // YUZ-4: "bitti" tek tanımdan (cekirdek/durum.ts)
      // 🪆 EKL-F7-A09: kendi Blok'u olmasa da varlık sarıyorsa satır katlanabilir
      // kalır ve açıklama boş ray yerine kaç proje sardığını söyler (küme kimliği).
      const sardigi = this.altVarliklar(p).length;
      const eleman = new vscode.TreeItem(
        // YUZ (Founder hükmü 2026-08-26): yüzey KODU göstermez — kod makinenin
        // kimliğidir ve tip zaten ikonla söylenir; geliştiricinin okuduğu tek şey
        // ADdır ve başlık düzeniyle yazılır. Kod hover ipucunda yaşamaya devam eder.
        // Adsız düğümde kod OLDUĞU GİBİ yazılır — dönüşüm ada uygulanır, koda değil
        // (Founder turu 2026-08-27 bulgu ①; tek kapı: cekirdek/baslik.yuzeyAdi).
        yuzeyAdi(p.ad, p.kod),
        p.cocuklar.length || sardigi ? vscode.TreeItemCollapsibleState.Expanded
                                     : vscode.TreeItemCollapsibleState.None);
      const sayac = p.cocuklar.length ? `[${p.tamam}/${p.toplam}]` : "";
      eleman.description = sardigi
        ? [YOL_METINLERI.kumeAciklama(sardigi), sayac].filter(Boolean).join(" · ")
        : (sayac || YOL_METINLERI.bosRay);
      eleman.tooltip = YOL_METINLERI.varlikIpucu(p.tip, p.kod, p.kokDizin, p.cocuklar.length, p.bloklu);
      // Şekil=SEFER (tren metaforu — A05: geometrik satır ailesinin sefer simgesi),
      // renk=durum (YUZ-4); blokaj ! rozeti köke kadar tırmanır.
      // ZRF-A06: AKTİF varlığın seferi kalp atışıyla vurgu rengine gidip gelir —
      // durum rengi öteki yarım fazda görünmeye devam eder (YUZ-4 feda edilmez),
      // aktiflik ayrıca etikette 📍 ile sabit beyan edilir.
      const durumAnlami: AnlamRengi = evre === "bitti" ? "basari" : evre === "sürüyor" ? "uyari" : "notr";
      const aktifMi = p === this.aktifVarlik;
      eleman.iconPath = satirIkonu(this.eklentiKoku, varlikSimgesi(p.tip),
        aktifMi && this.aktifAtis ? "aktif" : durumAnlami);
      if (aktifMi) {
        eleman.description = YOL_METINLERI.aktifAciklama(String(eleman.description ?? ""));
        eleman.tooltip = YOL_METINLERI.aktifIpucu(String(eleman.tooltip ?? ""));
      }
      eleman.resourceUri = vscode.Uri.parse(`sarmal-yol:/${evre === "bitti" ? "bitti" : "notr"}/${p.bloklu}`);
      // MIM-1.1 ② el-ile odak (Founder 2026-07-18): varlık satırına tıklamak Problems
      // panelini O varlığa odaklar (ve anadizinini açar) — çok-proje tek panelde,
      // tanılar karışmadan.
      eleman.command = {
        command: "sarmal.varligaOdaklan", title: YOL_METINLERI.varligaOdaklan,
        arguments: [p.kokDizin, p.anaSar || undefined] };
      return eleman;
    }
    const o = p;   // p yukarıdaki bilgi/koşum/varlık dallarından sonra Oge'ye daraldı
    const kapsayici = o.tip !== "Adım";
    // IZLE-A03 + VIT-GRAF-A03: koşumlu YA DA kenar/kabul bilgili Adım açılabilir —
    // altında orkestrasyon akışı + graf müfettişi (bağımlı · etkiler · kabul) yaşar.
    const acilir = o.tip === "Adım" && this.bilgili(o);
    const eleman = new vscode.TreeItem(
      // HTR-YOLHARITASI-INSAN-ADI (DIL-1.1 ⑥ · Founder 2026-07-20): yol haritası İNSAN
      // içindir — etiket ad:'ı gösterir (ad yoksa koda düşer); kod tooltip'te yaşar
      // (satır 748) ve ikon tipi zaten söyler → tip öneki etikette tekrarlanmaz.
      // Başlık düzeni YALNIZ ada uygulanır; koda düşülen satırda kod aynen kalır
      // (Founder turu 2026-08-27 bulgu ①: `YTK-A01` bir kimliktir, `Ytk A01` değildir).
      yuzeyAdi(o.ad, o.kod),
      // 🐢 PRF-A05 (Founder rota onayı 2026-07-19): Blok da varsayılan KAPALI —
      // kalabalık mevsim Faz'ı açılınca bütün gövdeler tek karede kurulmaz;
      // gövdenin içi kullanıcı isteğiyle açılır (yalnız açılış durumu değişti).
      kapsayici && o.cocuklar.length
        ? vscode.TreeItemCollapsibleState.Collapsed
        : acilir ? vscode.TreeItemCollapsibleState.Collapsed
                 : vscode.TreeItemCollapsibleState.None,
    );
    if (o.tip === "Adım") eleman.contextValue = "adim";   // VIT-GRAF-A04: koni kartı menüsü
    const rozet = DURUM_ROZET[o.durum] ?? DURUM_ROZET["beklemede"];
    // Founder 2026-07-12 (18:56 bulgusu): açıklama SATIRDA DEĞİL — kimi düğümün
    // ne'si var kimi yok, satır tutarsız görünüyordu; ne metni HOVER'da yaşar.
    // Satırda yalnız sayaç (kapsayıcı ilerlemesi) kalır; Adım satırı yalın KOD.
    // Founder 2026-07-14 İSTİSNA: AKTİF (geliştirmede) Adım "NEDEN RAYDA"yı HEP gösterir —
    //   hover'sız anımsatıcı (motor-susmaz ruhu): sarı satır + görev özeti = neden geliştiriliyor.
    let nedenAktif = "";
    if (o.tip === "Adım" && o.durum === "geliştirmede") {
      const g = koniCikar(o.dugum).görev;
      const n = ((g && !g.startsWith("<!--")) ? g : (o.ne ?? "")).replace(/\s+/g, " ").trim();
      nedenAktif = n ? `🟡 ${n.length > 48 ? n.slice(0, 46) + "…" : n}` : YOL_METINLERI.gelistiriliyor;
    }
    // 🧊 MIM-1.2 ③ (zaman-ekseni turu): planlanmamış gövde — tarih taahhüdü verilmemiş işin dürüst
    // beyanı. Satır soluk + 🧊 imli; NEDEN metni hover'da yaşar (tasarım: zaman-ekseni turu ②).
    const planNeden = o.tip === "Blok" ? (parametre(o.dugum, "planlanmamış")?.deger.metin ?? "").trim() : "";
    // 📅 YUZ (Founder hükmü 2026-08-26): Faz'ın zaman bilgisi ADIN İÇİNDE yaşamaz —
    // başlık kısa kalır ve panel sağa doğru kaydırılmak zorunda bırakmaz. Tarih,
    // satırın kenarında SOLUK yazıyla durur ve kaynağı `hedefTarih` alanıdır; elle
    // yazılmış bir ay adıyla çelişmesi bu yüzden imkânsızdır.
    // Satırda KISA tarih durur (31 Ağustos); tam hâli — yıl ve gün adıyla — hover'da
    // yaşar. Gerekçe ölçümdür: tam tarih satırda dururken sayaç kırpılıyordu ve ağaç
    // görünümü ikinci satırı desteklemediği için tek çare kısaltmaktı. Bilgi silinmedi,
    // yeri değişti.
    const hedefTarihDegeri = o.tip === "Faz" ? parametre(o.dugum, "hedefTarih")?.deger.metin : undefined;
    const tarih = tarihRozetiKisa(hedefTarihDegeri);
    const sayac = planNeden ? `🧊 [${o.tamam}/${o.toplam}]` : `[${o.tamam}/${o.toplam}]`;
    eleman.description = kapsayici
      ? [tarih, sayac].filter(Boolean).join("  ·  ")
      : nedenAktif;
    const md = new vscode.MarkdownString();
    md.appendMarkdown(`**${kanonikWidgetAdi(o.tip, o.tip)} · ${o.kod}**`);
    if (kapsayici) md.appendMarkdown(`  \`[${o.tamam}/${o.toplam}]\``);
    if (o.hedefTarih) md.appendMarkdown(YOL_METINLERI.tarife(o.hedefTarih));
    if (planNeden) md.appendMarkdown(YOL_METINLERI.planlanmamis(planNeden));
    if (o.ne) md.appendMarkdown(`\n\n${kanonikWidgetDuzYazisi(o.tip, o.ne)}`);
    md.appendMarkdown(`\n\n_${o.durum}_`);
    if (o.bloklu > 0 && kapsayici) md.appendMarkdown(YOL_METINLERI.blokluAlt(o.bloklu));
    eleman.tooltip = md;
    if (kapsayici) {
      // YUZ-4 (Founder kilitleri 2026-07-12): ŞEKİL=TİP DAİMA (paket hep
      // Blok, takvim hep Faz — hiçbir durumda değişmez) · RENK=DURUM daima
      // (yeşil=bitti · sarı=sürüyor · gri=bekliyor — kanonik evre durumTuret'ten;
      // renk kurulu BUG ① kapandı: bloklu-içeren kapsayıcı ! rozetini decoration'dan
      // alır, ikon rengi ÇALINMAZ). Yazı rengi tip DEĞİL — YUZ-4 durum anahtarı.
      const evre = kapsayiciEvre(o);
      // VIT-KIMLIK-A03 (Founder seçimi 2026-07-28): kapsayıcı satırın şekli
      // GEOMETRİK SVG ailesinden gelir ve TEK kaynaktan (simge-cizelgesi.ts)
      // okunur. iconPath currentColor çözmediği için açık/koyu + evre
      // varyantları build'de arac/simge-uret.mjs ile AYNI kaynaktan türer;
      // renk değeri yalnız üreticinin çizelgesinde yaşar (YUZ-4.1). YUZ-4
      // kilidi aynen: ŞEKİL=TİP DAİMA (dosya gövdesi) · RENK=DURUM daima (evre eki).
      // VIT-KIMLIK-A05: codicon geri-düşüşü yok — kök ya da eksen bilinmiyorsa
      // satır simgesiz kalır (uydurma yapılmaz, hazır ikona dönülmez).
      const eksen = (EKSEN_TIPLERI as readonly string[]).includes(o.tip)
        ? (o.tip as EksenTipi) : undefined;
      eleman.iconPath = (this.eklentiKoku && eksen)
        ? {
            light: vscode.Uri.joinPath(this.eklentiKoku, eksenSvgVaryanti(eksen, evre, "acik")),
            dark:  vscode.Uri.joinPath(this.eklentiKoku, eksenSvgVaryanti(eksen, evre, "koyu")),
          }
        : undefined;
      eleman.resourceUri = vscode.Uri.parse(`sarmal-yol:/${evre === "bitti" ? "bitti" : "notr"}/${o.bloklu}`);
      // Founder 2026-07-12: "Faz'a tıklayınca neden kod bloğuna gidemiyoruz?" —
      // kapsayıcı satırı da tanımına atlar (Adım'la aynı hak; ok işareti aç/kapa'ya bakar).
      eleman.command = {
        command: "vscode.open", title: YOL_METINLERI.ac,
        arguments: [o.dosya, { selection: new vscode.Range(o.satir - 1, 0, o.satir - 1, 0) }],
      };
    } else {
      // YUZ-4 checkbox kanunu — TEK SEMBOL (Founder 2026-07-13): en küçük Adım'da
      // kutu TEK durum/eylem yüzeyidir. beklemede/geliştirmede/tamamlandı hep
      // checkbox ile gösterilir (☐/☑); AYRI durum çemberi ÇİZİLMEZ — eskiden
      // kutu + ○ çember iki sembol veriyordu (kafa karışıklığı). Durum RENGİ
      // satır decoration'ından okunur (YUZ-4: geliştirmede=sarı label · tamamlandı=
      // soluk). YALNIZ bloklu'da checkbox YOK ("tıklanacak şey yok" dürüstlüğü) →
      // orada ikon (circle-slash) tek sembol olur.
      // Founder 2026-07-14 REGRESYON ONARIMI: AKTİF (geliştirmede) Adım DÖNEN ikon
      //   (sync~spin animasyonu) taşımalı — "şu an bunun üstünde çalışılıyor" göstergesi.
      //   YUZ-4'da checkbox eklenince kaybolmuştu; checkbox iconPath'i GİZLİYOR (VS Code
      //   kısıtı) → geliştirmede'de checkbox yerine SALT dönen ikon (animasyon öncelikli).
      //   beklemede/tamamlandı checkbox (işaretle→tamamla) · bloklu circle-slash.
      // YAS-4: doğrulanmamış da ikon dalında — checkbox "işaretle→tamamla" davet eder,
      // oysa kanıtsız işte elle 'tamamlandı' yaz-anında reddedilir (yanlış davet olmaz).
      if (o.durum === "geliştirmede" || o.durum === "bloklu" || o.durum === "doğrulanmamış") {
        eleman.iconPath = new vscode.ThemeIcon(rozet.ikon, new vscode.ThemeColor(rozet.renk));
      } else {
        eleman.checkboxState = o.durum === "tamamlandı"
          ? vscode.TreeItemCheckboxState.Checked
          : vscode.TreeItemCheckboxState.Unchecked;
      }
      eleman.resourceUri = vscode.Uri.parse(`sarmal-yol:/${DURUM_ANAHTAR[o.durum] ?? "notr"}/0`);
      // dosyada konuma zıpla
      eleman.command = {
        command: "vscode.open", title: YOL_METINLERI.ac,
        arguments: [o.dosya, { selection: new vscode.Range(o.satir - 1, 0, o.satir - 1, 0) }],
      };
    }
    return eleman;
  }

  /** VIT-GRAF-A04: koni detay KARTI — Adım'ın koni alanları + graf kenarları tek
   *  webview'de (Founder kart fikri · 2026-07-10). YALNIZ okuma; yazım koniYaz kapısında. */
  koniKartHtml(o: Oge): string {
    const rozet = DURUM_ROZET[o.durum] ?? DURUM_ROZET["beklemede"];
    const koni = koniCikar(o.dugum);                      // TEK kaynak: cekirdek/koni.ts
    const d = this.dag?.dugumler.get(o.kod);
    const e = this.etkiAl(o.kod);   // 🐢 PRF-A05: kart da önbellekten okur
    const atlaLink = (kod: string): string => {
      const h = this.dag?.dugumler.get(kod);
      const r = h?.durum ? (DURUM_ROZET[h.durum as Durum]?.emoji ?? "·") : "·";
      const metin = `${r} ${kacir(kod)}${h ? ` <span class="k">(${kacir(kanonikWidgetAdi(h.tip, h.tip))})</span>` : ""}`;
      return h
        ? `<a href="command:sarmal.dosyaAc?${encodeURIComponent(JSON.stringify([h.dosya, h.satir]))}">${metin}</a>`
        : metin;
    };
    const liste = (kodlar: string[], not?: (k: string) => string): string =>
      kodlar.length
        ? `<ul>${kodlar.map((k) => `<li>${atlaLink(k)}${not ? ` <span class="k">${not(k)}</span>` : ""}</li>`).join("")}</ul>`
        : `<p class="k">${YOL_METINLERI.yok}</p>`;
    const alan = (baslik: string, metin: string): string =>
      `<h2>${baslik}</h2><pre>${kacir(metin)}</pre>`;
    const gecisliKume = new Set(e?.gecisli ?? []);

    // #7 (Founder açık-ucu): "Adım bir Kural/Anayasa'ya bağlıysa bağlı kuralları göster."
    // Kapsam eşleşmesi cekirdek/kuralci TEK KAYNAK (dugumeDusenKurallar). SALIENCE
    // BÜTÇESİ (YUZ-4 ruhu): joker (genel/tümü) kurallar TÜM düğümlere düşer — bu düğüme
    // ÖZEL değildir; tam listelenirse kart boğulur (Founder'ın KONI_ESIGI=20 kaygısı).
    // Bu yüzden HEDEFLİ kurallar (ad/aile/kod eşleşen — bu Adım'ı özelleştiren) tam
    // gösterilir; genel yasa yalnız SAYIYLA anılır (otorite'ye göre sıralı — anayasa üstte).
    const otoriteSirala = (a: KuralBilgi, b: KuralBilgi): number =>
      (OTORITE_SIRA[b.otorite ?? "tercih"] ?? 1) - (OTORITE_SIRA[a.otorite ?? "tercih"] ?? 1);
    const dusen = dugumeDusenKurallar(o.dugum, this.kurallar, WIDGET_AILE);
    const hedefli = dusen.filter((k) => !KAPSAM_JOKER.has(k.kapsam ?? "")).sort(otoriteSirala);
    const joker = dusen.filter((k) => KAPSAM_JOKER.has(k.kapsam ?? "")).sort(otoriteSirala);
    const kuralSatiri = (k: KuralBilgi): string => {
      const rozet = OTORITE_ROZET[k.otorite ?? "tercih"] ?? OTORITE_ROZET["tercih"];
      const uri = this.kuralUri.get(k);
      const baslik = `${k.ebedi ? "🔒 " : ""}${kacir(k.kod)}`;
      const bag = uri
        ? `<a href="command:sarmal.dosyaAc?${encodeURIComponent(JSON.stringify([uri.fsPath, k.d.satir]))}">${baslik}</a>`
        : baslik;
      const ne = kuralNe(k);
      const hamKapsam = k.kapsam ?? "";
      const kapsam = kanonikWidgetAdi(hamKapsam, hamKapsam);
      const ust = `${rozet}${YOL_METINLERI.kuralKapsami(k.katman ? kacir(k.katman) : "", kacir(kapsam))}`;
      return `<li>${bag} <span class="k">${ust}</span>${ne ? `<br><span class="k">${kacir(ne)}</span>` : ""}</li>`;
    };
    // genel yasa TÜM düğümlere düşer → katlı (salience): sayı görünür, liste tıkla-aç.
    const jokerBolum = joker.length
      ? `<details><summary class="k">${YOL_METINLERI.genelYasa(joker.length)}</summary><ul>${joker.map(kuralSatiri).join("")}</ul></details>`
      : "";
    const kurallarBolum = hedefli.length
      ? `<h2>${YOL_METINLERI.bagliKurallar(hedefli.length)}</h2><ul>${hedefli.map(kuralSatiri).join("")}</ul>${jokerBolum}`
      : `<h2>${YOL_METINLERI.bagliKurallar()}</h2><p class="k">${YOL_METINLERI.ozelKuralYok}</p>${jokerBolum}`;

    return `<!DOCTYPE html><html lang="${YOL_METINLERI.webDili}"><meta charset="UTF-8">${WEBVIEW_STIL}<body>
<h1>🃏 ${rozet.emoji} ${kacir(o.kod)}</h1>
<p class="k">${kacir(kanonikWidgetAdi(o.tip, o.tip))} · ${kacir(o.durum)} ·
<a href="command:sarmal.dosyaAc?${encodeURIComponent(JSON.stringify([o.dosya.fsPath, o.satir]))}">${YOL_METINLERI.dosyadaAc}</a></p>
<p>${kacir(kanonikWidgetDuzYazisi(o.tip, o.ne))}</p>
${alan(YOL_METINLERI.alan("görev"), koni.görev)}
${alan(YOL_METINLERI.alan("kabul"), koni.kabul)}
${alan(YOL_METINLERI.alan("sınır"), koni.sınır)}
${koni.dokunulmaz !== "<!-- TODO -->" ? alan(YOL_METINLERI.alan("dokunulmaz"), koni.dokunulmaz) : ""}
${koni.referans !== "<!-- TODO -->" ? alan(YOL_METINLERI.alan("referans"), koni.referans) : ""}
${koniAlani(o.dugum, "rapor") !== "<!-- TODO -->" ? alan(YOL_METINLERI.alan("rapor"), koniAlani(o.dugum, "rapor")) : ""}
${koniAlani(o.dugum, "yama") !== "<!-- TODO -->" ? alan(YOL_METINLERI.alan("yama"), koniAlani(o.dugum, "yama")) : ""}
<h2>${YOL_METINLERI.bagimliDugumler}</h2>${liste(d?.oncekiler ?? [])}
<h2>${YOL_METINLERI.etkiledigiDugumler}</h2>${liste([...(e?.dogrudan ?? []), ...(e?.gecisli ?? [])],
      (k) => gecisliKume.has(k) ? YOL_METINLERI.gecisli : YOL_METINLERI.dogrudan)}
${kurallarBolum}
</body></html>`;
  }

  /** Kutucuk → dosyaya durum yaz (WorkspaceEdit; autosave diske indirir). */
  async durumYaz(o: Oge, yeni: Durum): Promise<void> {
    // ── TUR-2 DURUM MAKİNESİ (Founder kilidi): yasak geçiş panelden de YAZILAMAZ —
    //    tablo gömülü kanondan (üç yazıcı aynı tabloyu okur, aynı cümleyi söyler).
    const gecisler = (GOMULU_KAYIT as { durumGecisleri?: DurumGecisleri }).durumGecisleri;
    const sinif = gecisSinifla(o.durum, yeni, gecisler);
    if (sinif === "yasak") {
      void vscode.window.showWarningMessage(YOL_METINLERI.yasakGecis(yasakGecisMesaji(o.durum, yeni, o.kod), o.kod, o.durum, yeni));
      this.degisti.fire();   // reddedilen checkbox görsel durumu geri alınsın
      return;
    }
    if (sinif === "bilgi") {
      void vscode.window.setStatusBarMessage(YOL_METINLERI.geriAlma(o.kod, o.durum, yeni), 5000);
    }
    const doc = await vscode.workspace.openTextDocument(o.dosya);
    const edit = new vscode.WorkspaceEdit();
    if (o.durumSatir !== undefined && o.durumSutun !== undefined && o.durumUzunluk) {
      // mevcut değeri quote-güvenli değiştir (EKL-F9-A09): tırnak sınırları otomatik
      // kapsanır — yarım tırnak/bayat-konum bozması imkânsız (null → dokunma).
      const satirNo = o.durumSatir - 1;
      const eskiSatir = doc.lineAt(satirNo).text;
      const yeniSatir = satirdaDegerDegistir(eskiSatir, o.durumSutun, o.durumUzunluk, yeni);
      if (yeniSatir === null) return;   // fail-safe: konum bayat — dosyayı bozma
      edit.replace(o.dosya, new vscode.Range(satirNo, 0, satirNo, eskiSatir.length), yeniSatir);
    } else {
      // parametre yok → düğüm adından sonraki ilk "(" ardına ekle
      const satir = doc.lineAt(o.satir - 1).text;
      // ÇİFT-YAZIM KALKANI (ray1 vakası 2026-07-12): satırda zaten durum: varsa
      // öge bayattır (watcher tazelemeden ikinci tık) — dosyayı bozma, dokunma.
      if (/\bdurum\s*:/.test(satir)) return;
      const ac = satir.indexOf("(", 0);
      if (ac < 0) return;
      edit.insert(o.dosya, new vscode.Position(o.satir - 1, ac + 1), ` durum: ${degerBicimle(yeni)},`);
    }
    await vscode.workspace.applyEdit(edit);
  }
}

/** Paneli kur: ağaç + kutucuk olayları + dosya izleyici + koni-kartı menüsü.
 *  PRF-A04: olcum verilirse panel turları 'Sarmal Performans' kanalına düşer. */
export function yolHaritasiKaydi(context: vscode.ExtensionContext,
                                 olcum?: (satir: string) => void,
                                 odak?: OdakKapisi,
                                 meyve?: MeyveKapisi): { diliTazele(): void } {
  // YUZ-4: panel satırları DURUM renginde + blokaj ! rozeti (sarmal-yol:// dekorasyonu)
  context.subscriptions.push(vscode.window.registerFileDecorationProvider(new YolRenklendirici()));
  const saglayici = new YolHaritasi();
  saglayici.eklentiKoku = context.extensionUri;   // VIT-KIMLIK-A03: geometrik iconPath kökü
  saglayici.olcum = olcum;
  const gorunum = vscode.window.createTreeView("sarmalYolHaritasi", {
    treeDataProvider: saglayici,
    manageCheckboxStateManually: true,
  });
  saglayici.gorunum = gorunum;

  // ── VIT-GRAF-A08: 🕸️ mini graf — yol haritasının altındaki boşlukta tek proje
  //    grafı; panel seçimi + imleç (aşağıdaki geciktirici) buraya da akar.
  //    Odak kapısı eklenti gövdesinden gelir: graf ODAKTAKİ VARLIĞI gösterir ve
  //    odak değişince tazelenir (üç tanı yüzeyiyle aynı süzgeç, aynı olay).
  //    Meyve kapısı da gövdeden gelir: graf beyan edilen teslimin diskte olup
  //    olmadığını buradan öğrenir ve boş camı ona göre çizer (VIT-GRAF-A12).
  const miniGraf = miniGrafKaydi(context, () => saglayici.dagAl(), odak, meyve);
  context.subscriptions.push(
    gorunum.onDidChangeSelection((e) => {
      const ilk = e.selection[0];
      if (ilk && ilk.tur === "oge" && ilk.kod) miniGraf.dugumSec(ilk.kod);
    }),
  );

  // ── ZRF-A06 · aktif-varlık nabzı: imlecin yaşadığı proje roketi tek kalple atar ──
  saglayici.aktifligiGuncelle(vscode.window.activeTextEditor);
  context.subscriptions.push(
    nabizAbone((a) => saglayici.nabizAt(a)),
    vscode.window.onDidChangeActiveTextEditor((e) => saglayici.aktifligiGuncelle(e)),
  );

  // ── VIT-GRAF-A05: 🧠 CANLI HARİTA — tek koni kartı + imleç takibi ──────────
  // Kart açıkken imleç KOD'lu bir düğüme gelince kart TIKLAMASIZ o düğüme
  // tazelenir ("IDE değil proje beyni"). Geciktirici tuş-seli hesabını keser;
  // sarmal.canliHarita ayarı kapatınca imleç sessizdir (kart elle-tık kalır).
  let acikKart: vscode.WebviewPanel | undefined;
  let acikKartKodu = "";
  const kartGoster = (oge: Oge): void => {
    if (acikKart) {
      acikKart.title = YOL_METINLERI.kartBasligi(oge.kod);
      acikKart.webview.html = saglayici.koniKartHtml(oge);
      acikKart.reveal(vscode.ViewColumn.Beside, true);
    } else {
      acikKart = vscode.window.createWebviewPanel(
        "sarmalKoniKart", YOL_METINLERI.kartBasligi(oge.kod), { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
        { enableCommandUris: true });   // yalnız kendi ürettiğimiz escape'li komut linkleri
      acikKart.onDidDispose(() => { acikKart = undefined; acikKartKodu = ""; });
      acikKart.webview.html = saglayici.koniKartHtml(oge);
    }
    acikKartKodu = oge.kod;
  };
  // İmleç satırını kapsayan EN DERİN kod'lu düğüm (anahat kapsam mantığının ikizi).
  const imlecKodu = (doc: vscode.TextDocument, satir: number): string | undefined => {
    const bildirimler = programAl(doc)?.bildirimler;
    if (!bildirimler) return undefined;
    let bulunan: string | undefined;
    const sonSatir = (d: Dugum): number => {
      let s = d.satir;
      for (const c of d.cocuklar) s = Math.max(s, sonSatir(c));
      return s;
    };
    const gez = (d: Dugum): void => {
      if (satir + 1 >= d.satir && satir + 1 <= sonSatir(d) + 1) {
        const kod = d.parametreler.find((p) => p.ad === "kod")?.deger.metin;
        if (kod) bulunan = kod;          // daha derini bulursa üzerine yazar
        d.cocuklar.forEach(gez);
      }
    };
    bildirimler.forEach(gez);
    return bulunan;
  };
  const imlecTakip = geciktir(() => {
    const ed = vscode.window.activeTextEditor;
    if (!ed || ed.document.languageId !== "sarmal") return;
    const kod = imlecKodu(ed.document, ed.selection.active.line);
    if (!kod) return;
    miniGraf.dugumSec(kod);   // VIT-GRAF-A08: mini graf imleci hep izler (kart açık olmasa da)
    if (!acikKart) return;
    if (!vscode.workspace.getConfiguration("sarmal").get<boolean>("canliHarita", true)) return;
    if (kod === acikKartKodu) return;
    const oge = saglayici.kodlaBul(kod);
    if (oge) kartGoster(oge);
  });
  context.subscriptions.push(
    vscode.window.onDidChangeTextEditorSelection((e) => {
      if (e.textEditor.document.languageId === "sarmal") imlecTakip.cagir();
    }),
  );

  const izleyici = vscode.workspace.createFileSystemWatcher("**/*.sar");
  // 🗺️ PRF-A04: panel tazelemesi de tek-uçuş kilidi + olay hattından geçer —
  // yenile() üst üste binmez (koşarken gelen istek tek telafi turuna iner),
  // gürültü olayları (gizli dizin/derleme çıkışı .sar'ları) panel turu tetiklemez.
  // Süzgeç denetim hattıyla TEK KAYNAK (izleyici-cekirdek · RED-1 D1 hizası).
  const panelKilidi = new TekUcusKilidi(async (tetik) => {
    await saglayici.yenile(tetik);
    miniGraf.tazele();   // VIT-GRAF-A08: graf yeniden kuruldu — mini graf taze veriyle çizer
  }, undefined,
    (h) => saglayici.olcum?.(IZ_METINLERI.turCoktu("panel", h instanceof Error ? h.message : String(h))));
  const goreli = (u: vscode.Uri): string => vscode.workspace.asRelativePath(u, false);
  const panelHatti = new OlayHatti({ gurultu: sarGurultuMu, gecikmeMs: 350,
    iste: (t) => panelKilidi.iste(t) });   // 350ms — dosya-olayı seli tek yenilemeye iner (EKL-F9-A07)
  const tazele = (): void => panelKilidi.iste("el-ile");   // yenile düğmesi geciktirmesiz
  // IZLE-A03: trace yazımı → panel ≤1sn (350ms debounce dahil) — 'anlık' ölçülür (lig uzlaşısı).
  // Trace yolları .sarmal altındadır (süzgeç onları bilerek eler) → kendi hattı süzgeçsizdir.
  // RED-2 onarımı: iz yolu KENDİ kilidiyle koşar — tam panel turunun (findFiles+AST+DAG)
  // kuyruğuna girmez; meşgul panel turunda bile ≤1sn yapısal olarak korunur (davranış-testli).
  const izIzleyici = vscode.workspace.createFileSystemWatcher("**/.sarmal/trace/*.jsonl");
  const izKilidi = new TekUcusKilidi((tetik) => saglayici.izTazele(tetik), undefined,
    (h) => saglayici.olcum?.(IZ_METINLERI.turCoktu("iz", h instanceof Error ? h.message : String(h))));
  const izHatti = new OlayHatti({ gurultu: () => false, gecikmeMs: 350,
    iste: (t) => izKilidi.iste(t) });
  const izTazele = (u: vscode.Uri): void => izHatti.olay(goreli(u), "iz-olayı");

  context.subscriptions.push(
    gorunum, izleyici, izIzleyici,
    izIzleyici.onDidCreate(izTazele), izIzleyici.onDidChange(izTazele), izIzleyici.onDidDelete(izTazele),
    // IZLE-A04: koşum düğümüne tıkla → tam konuşma webview'i (ham prompt · ham yanıt ·
    // model · ajan imzası · token — hiçbir alan gizlenmez; onizleme.ts webview deseni)
    vscode.commands.registerCommand("sarmal.konusmaDetay", (kayit: Record<string, unknown>) => {
      const panel = vscode.window.createWebviewPanel(
        "sarmalKonusma", YOL_METINLERI.konusmaBasligi(kayit?.rol, kayit?.adım),
        vscode.ViewColumn.Beside, {});
      const imza = kayit?.ajanİmza as { kod?: string; ad?: string } | undefined;
      panel.webview.html = `<!DOCTYPE html><html lang="${YOL_METINLERI.webDili}"><meta charset="UTF-8">${WEBVIEW_STIL}<body>
<h1>🔬 ${kacir(kayit?.rol)} · ${kacir(kayit?.adım)}</h1>
<p class="k">${YOL_METINLERI.konusmaOzeti(kacir(kayit?.zaman), kacir(imza ? `${imza.kod} (${imza.ad})` : "—"), kacir(kayit?.tokenGiriş ?? "?"), kacir(kayit?.tokenÇıkış ?? "?"), kacir(kayit?.sıra))}</p>
${Array.isArray(kayit?.beceriler) && (kayit.beceriler as string[]).length
  ? `<p class="k">${YOL_METINLERI.beceriler(kacir((kayit.beceriler as string[]).join(" · ")))}</p>` : ""}
<h2>${YOL_METINLERI.hamPrompt}</h2><pre>${kacir(kayit?.hamPrompt)}</pre>
<h2>${YOL_METINLERI.hamYanit}</h2><pre>${kacir(JSON.stringify(kayit?.hamYanıt, null, 2))}</pre>
</body></html>`;
    }),
    izleyici.onDidCreate((u) => panelHatti.olay(goreli(u), "sar-olayı")),
    izleyici.onDidChange((u) => panelHatti.olay(goreli(u), "sar-olayı")),
    izleyici.onDidDelete((u) => panelHatti.olay(goreli(u), "sar-olayı")),
    gorunum.onDidChangeCheckboxState(async (e) => {
      for (const [oge, hal] of e.items) {
        if (oge.tur !== "oge") continue;   // durumYaz yalnız Oge (Adım) alır — varlık/koşum'da checkbox yok
        await saglayici.durumYaz(
          oge, hal === vscode.TreeItemCheckboxState.Checked ? "tamamlandı" : "beklemede");
      }
    }),
    // VIT-GRAF-A04: 🃏 koni kartı — panelde Adım'a sağ-tık/inline düğme → detay webview
    // (satıra-atla tıklaması korunur, kart onu EZMEZ). YALNIZ okuma (DIL-2).
    // A05: TEK canlı kart — açıkken yeniden istenirse öne gelir + tazelenir;
    // imleç-takibi (aşağıda) aynı paneli günceller.
    vscode.commands.registerCommand("sarmal.koniKart", (oge?: PanelOge) => {
      if (!oge || oge.tur !== "oge" || oge.tip !== "Adım") return;
      kartGoster(oge);
    }),
    vscode.commands.registerCommand("sarmal.dosyaAc", async (yol: string, satir: number) => {
      const doc = await vscode.workspace.openTextDocument(yol);
      await vscode.window.showTextDocument(doc,
        { selection: new vscode.Range(Math.max(0, satir - 1), 0, Math.max(0, satir - 1), 0) });
    }),
    vscode.commands.registerCommand("sarmal.yolHaritasiYenile", tazele),
    // 🚆 Ray Değiştir (MIM-1): varlıklar/projeler arası tek tuşla geçiş
    vscode.commands.registerCommand("sarmal.rayDegistir", async () => {
      const varliklar = saglayici.varlikListesi();
      const secim = await vscode.window.showQuickPick(
        varliklar.map((v) => ({
          label: yuzeyAdi(v.ad, v.kod),
          description: YOL_METINLERI.rayBloklari(v.tamam, v.toplam, v.cocuklar.length),
          varlik: v,
        })),
        { placeHolder: YOL_METINLERI.raySec });
      if (secim) await gorunum.reveal(secim.varlik, { expand: 2, focus: true, select: true });
    }),
  );
  panelKilidi.iste("başlangıç");
  return {
    diliTazele(): void {
      saglayici.diliTazele();
      miniGraf.tazele();
      if (acikKart && acikKartKodu) {
        const oge = saglayici.kodlaBul(acikKartKodu);
        if (oge) {
          acikKart.title = YOL_METINLERI.kartBasligi(oge.kod);
          acikKart.webview.html = saglayici.koniKartHtml(oge);
        }
      }
    },
  };
}

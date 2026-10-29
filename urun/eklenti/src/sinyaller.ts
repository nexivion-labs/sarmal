// ═══════════════════════════════════════════════════════════════════════════
// sinyaller.ts — 🚦 SİNYALLER SEKMESİNİN AĞACI (PNL-A09 · OZK-14 · vscode kabuğu)
//
//   Founder 2026-10-28: "Sarmal ray, yapay zekâ tren, insan makinisttir ve rayın
//   makiniste verdiği uyarı demiryolunda sinyaldir." Panelin dördüncü sekmesi bu
//   ağacı çizer. Üst düğümler yalnız Dur, Dikkat ve Bilgi bantlarıdır. Bant içinde
//   tanılar Proje kimliğine göre gruplanır; odaktaki proje üstte ve açık durur,
//   Bilgi bandı kapalı başlar. Bant simgesi sayı sıfır olsa da düzeyinin rengini
//   taşır (Founder 2026-10-28).
//
//   AĞAÇ KARAR VERMEZ. Tanılar motorun ürettiği kayıtlardır ve turun dağıtım
//   noktasından (eklenti.ts `yuzeylereDagit`) olduğu gibi gelir; bant düzeye göre
//   seçilir, metin ve düzey değişmez (sinyaller-cekirdek.ts).
//
//   HER TANI BİR KEZ (YUZ-3.3 · Founder hükmü 2026-10-28). Ayrı bir Gözlemler
//   bölümü yoktur; Bilgi bandı eski Gözlemler grubunun yerini alır. Hatırlatıcılar
//   yüzeyine yönlenen tanılar Sinyaller'de hiç görünmez, yalnız Makinist'in
//   Hatırlatıcılar grubunda kalır; ayrım motorun sunum kararından gelir.
//
//   TÜRE GÖRE TOPLAMA (PNL-A28 · YAS-3.4). Proje satırının altında önce tür satırları
//   durur: türün okunur adı, kayıt sayısı, tek cümlelik anlamı ve türün bütün
//   kayıtlarında aynen geçen ortak öneri. Tür satırı kapalı başlar ve açılınca
//   kayıtlar dosyaya göre dizilir. Tek kayıtlık tür ara satır açmaz; kaydı doğrudan
//   proje satırının altında durur. Türler kayıt sayısına göre çoktan aza dizilir.
//   Anlam çizelgede yazılıysa oradan (`taniAnlami`), yazılı değilse türün bütün
//   kayıtlarının iletisinde aynen geçen son cümleden gelir; ikisi de yoksa yazılmaz.
//
//   TIKLAMA. Tanı satırı dosyayı tanının satırında açar ve odak panelde kalır
//   (`sarmal.dosyaAc` · OZK-13). Kanon maddesi satırı maddenin tanımını kimlik
//   indeksinden bulur ve aynı yoldan açar; tanım çalışma alanında yoksa bunu söyler.
//   Sorunlar paneline gönderim bu Adımda değişmez (PNL-A22).
// ═══════════════════════════════════════════════════════════════════════════

import * as vscode from "vscode";
import { kimlikIndeksi } from "../../cekirdek/src/kimlik.ts";
import { sonTurGoruntusu } from "./tur-goruntusu.ts";
import {
  SINYAL_BANTLARI, kanonMaddeleri, kanonTaniHaritasi, sinyalModeli, sinyalPanosu,
  type ProjeSinyalleri, type SinyalBandi, type SinyalModeli, type SinyalSatiri, type SinyalTuru,
} from "./sinyaller-cekirdek.ts";
import { yuzeyDosyaAdiniAl, type YuzeyKaydi } from "./yuzey-cekirdek.ts";
import { SINYAL_METINLERI, taniAnlami, taniKisaAdi } from "./yuzey-metinleri.ts";
import { projeSatiriIkonu, satirIkonu } from "./ortak.ts";
import { paylariBirlestir, type ProjePayi } from "./kapsam-sayaci.ts";
import type { AnlamRengi } from "./simge-cizelgesi.ts";

/** Kanon maddesinin tanımını açan komut (satırın komutu; menüde yer almaz). */
export const KANON_MADDESI_KOMUTU = "sarmal.kanonMaddesiAc";

type SinyalOgesi =
  | { readonly tur: "sinyal-bant"; readonly bant: SinyalBandi }
  | { readonly tur: "sinyal-proje"; readonly bant: SinyalBandi; readonly grup: ProjeSinyalleri }
  | { readonly tur: "sinyal-tur"; readonly bant: SinyalBandi; readonly grup: SinyalTuru }
  | { readonly tur: "sinyal-ortak-oneri"; readonly metin: string }
  /** `turIcinde`: kayıt bir tür satırının altındadır; tür kimliği üst satırda yazılı olduğu için tekrarlanmaz. */
  | { readonly tur: "sinyal"; readonly satir: SinyalSatiri; readonly turIcinde?: boolean }
  | { readonly tur: "sinyal-oneri"; readonly satir: SinyalSatiri }
  | { readonly tur: "sinyal-madde"; readonly madde: string };

/** Bandın anlam rengi: Dur kırmızı, Dikkat sarı, Bilgi mavi. Editörün satır işareti de bu rengi taşır (PNL-A22). */
export const BANT_RENGI: Readonly<Record<SinyalBandi, AnlamRengi>> = { dur: "hata", dikkat: "uyari", bilgi: "bilgi" };

let haritaSirasi = -1;
let harita: ReadonlyMap<string, readonly string[]> = new Map();
/**
 * Tanının dayandığı kanon maddeleri: sicilin kural bağı ve turun kural↔kapı haritası. Harita son tur
 * görüntüsünün programlarından tur başına bir kez kurulur; Sinyaller ağacı ile editörün hover'ı aynı
 * haritayı okur (PNL-A22).
 */
export function turKanonMaddeleri(kod: string): readonly string[] {
  const g = sonTurGoruntusu();
  if (g && g.sıra !== haritaSirasi) {
    harita = kanonTaniHaritasi(g.programlar.values());
    haritaSirasi = g.sıra;
  }
  return kanonMaddeleri(kod, harita);
}

export class SinyallerAgaci {
  private readonly degisti = new vscode.EventEmitter<unknown>();
  readonly onDidChangeTreeData = this.degisti.event;
  private model: SinyalModeli = sinyalModeli([], undefined, () => []);
  private readonly kok: vscode.Uri | undefined;
  private readonly bantlar = new Map<SinyalBandi, SinyalOgesi>(SINYAL_BANTLARI.map((b) => [b, { tur: "sinyal-bant", bant: b }]));

  constructor(kok: vscode.Uri | undefined) {
    this.kok = kok;
  }

  /**
   * Kapsamdaki bütün tanı kayıtları (yayın tur başına birdir); odaktaki Projenin kodu üstte durur.
   * Hatırlatıcılar yüzeyine yönlenenleri model ayırır; ağaç onları hiç çizmez.
   */
  yerlestir(kayitlar: readonly YuzeyKaydi[], odakProje: string | undefined): void {
    this.model = sinyalModeli(kayitlar, odakProje, turKanonMaddeleri);
    this.degisti.fire(undefined);
  }

  /** Dil değişince bant başlıkları yeniden yazılır. */
  yenile(): void { this.degisti.fire(undefined); }

  get sayilar(): { dur: number; dikkat: number; bilgi: number; toplam: number; bantsiz: number; hatirlatici: number } {
    const n = (b: SinyalBandi): number => this.model.bantlar.find((x) => x.bant === b)?.sayi ?? 0;
    return {
      dur: n("dur"), dikkat: n("dikkat"), bilgi: n("bilgi"),
      toplam: this.model.toplam, bantsiz: this.model.bantsiz, hatirlatici: this.model.hatirlatici,
    };
  }

  /** Verilen bantların bütün kayıtları (PNL-A21: Ray satırlarının Dur ve Dikkat işareti bunlardan kurulur). */
  bantSatirlari(bantlar: readonly SinyalBandi[]): SinyalSatiri[] {
    return this.model.bantlar.filter((b) => bantlar.includes(b.bant)).flatMap((b) => b.projeler.flatMap((p) => p.satirlar));
  }

  /** Verilen bantların proje kırılımı (PNL-A08): dış rozet ve durum çubuğu çatıda proje proje döker. */
  projePaylari(bantlar: readonly SinyalBandi[]): ProjePayi[] {
    return paylariBirlestir(...this.model.bantlar.filter((b) => bantlar.includes(b.bant))
      .map((b) => b.projeler.map((p) => ({ ad: p.proje.ad, adet: p.satirlar.length }))));
  }

  /** Sekmede gösterilecek bir sinyal var mı? */
  get bos(): boolean { return this.model.toplam === 0; }

  /** Satırın tanı kaydı (nöbet ölçüsü ve dosya bağı). */
  sinyalKaydi(oge: unknown): SinyalSatiri | undefined {
    const o = oge as Partial<SinyalOgesi> | undefined;
    return o?.tur === "sinyal" ? (o as { satir: SinyalSatiri }).satir : undefined;
  }

  /** Satır bir tür satırıysa türün kimliği ve topladığı kayıtlar (PNL-A28 nöbetinin girdisi). */
  sinyalTuru(oge: unknown): SinyalTuru | undefined {
    const o = oge as Partial<SinyalOgesi> | undefined;
    return o?.tur === "sinyal-tur" ? (o as { grup: SinyalTuru }).grup : undefined;
  }

  /**
   * 📋 Satırın panoya inecek metni (PNL-A31). Sağlayıcı panoya YAZMAZ; karar saf çekirdektedir
   * (`sinyalPanosu`) ve yazımı Makinist ile ORTAK olan `sarmal.satiriKopyala` komutu yapar. Tanı satırı
   * kendi bloğunu, bant, proje ve tür satırı altındaki bütün tanıları alt alta verir; öneri ve kanon
   * maddesi satırları (alt satırlar) kendi tanılarının bloğunu verir.
   */
  panoMetni(oge: unknown): { metin: string; adet: number } | undefined {
    if (typeof oge !== "object" || oge === null || !("tur" in oge)) return undefined;
    const o = oge as SinyalOgesi;
    switch (o.tur) {
      case "sinyal": case "sinyal-oneri": return sinyalPanosu([o.satir]);
      case "sinyal-tur": return sinyalPanosu(o.grup.satirlar, taniKisaAdi(o.grup.kod));
      case "sinyal-proje": return sinyalPanosu(o.grup.satirlar, o.grup.proje.ad);
      case "sinyal-bant": {
        const satirlar = (this.model.bantlar.find((b) => b.bant === o.bant)?.projeler ?? []).flatMap((p) => p.satirlar);
        return sinyalPanosu(satirlar, SINYAL_METINLERI.bantAdi(o.bant));
      }
      default: return undefined;
    }
  }

  getChildren(oge?: unknown): unknown[] {
    if (!oge) return SINYAL_BANTLARI.map((b) => this.bantlar.get(b)!);
    const o = oge as SinyalOgesi;
    switch (o.tur) {
      case "sinyal-bant":
        return (this.model.bantlar.find((b) => b.bant === o.bant)?.projeler ?? [])
          .map((grup): SinyalOgesi => ({ tur: "sinyal-proje", bant: o.bant, grup }));
      case "sinyal-proje":
        // Tek kayıtlık tür ara satır açmaz; kaydı doğrudan gösterilir (PNL-A28).
        return o.grup.turler.map((grup): SinyalOgesi => grup.satirlar.length === 1
          ? { tur: "sinyal", satir: grup.satirlar[0]! }
          : { tur: "sinyal-tur", bant: o.bant, grup });
      case "sinyal-tur":
        return [
          ...(o.grup.ortakOneri ? [{ tur: "sinyal-ortak-oneri", metin: o.grup.ortakOneri } as SinyalOgesi] : []),
          ...o.grup.satirlar.map((satir): SinyalOgesi => ({ tur: "sinyal", satir, turIcinde: true })),
        ];
      case "sinyal":
        return [
          ...(o.satir.kayit.tani.oneri ? [{ tur: "sinyal-oneri", satir: o.satir } as SinyalOgesi] : []),
          ...o.satir.maddeler.map((madde): SinyalOgesi => ({ tur: "sinyal-madde", madde })),
        ];
      default:
        return [];
    }
  }

  getTreeItem(oge: unknown): vscode.TreeItem {
    const o = oge as SinyalOgesi;
    switch (o.tur) {
      case "sinyal-bant": return this.bantSatiri(o.bant);
      case "sinyal-proje": {
        const item = new vscode.TreeItem(o.grup.proje.ad,
          o.grup.odakta ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed);
        item.id = `proje.${o.grup.proje.kod}`;
        item.description = String(o.grup.satirlar.length);
        // PNL-A25: Proje satırı Yol Haritasının varlık simgesini taşır; çatı simgesi yalnız çatının kendi satırındadır.
        item.iconPath = projeSatiriIkonu(this.kok, o.grup.proje, "duz");
        item.contextValue = "sarmalSinyalProjesi";
        return item;
      }
      case "sinyal-tur": return this.turSatiri(o.bant, o.grup);
      case "sinyal-ortak-oneri": {
        const item = new vscode.TreeItem(SINYAL_METINLERI.ortakOneri, vscode.TreeItemCollapsibleState.None);
        item.id = "ortak-oneri";
        item.description = o.metin;
        item.tooltip = o.metin;
        item.iconPath = satirIkonu(this.kok, "yama", "duz");
        return item;
      }
      case "sinyal": return this.sinyalSatiri(o.satir, o.turIcinde === true);
      case "sinyal-oneri": {
        const item = new vscode.TreeItem(SINYAL_METINLERI.oneri, vscode.TreeItemCollapsibleState.None);
        item.id = "oneri";
        item.description = o.satir.kayit.tani.oneri;
        item.tooltip = o.satir.kayit.tani.oneri;
        item.iconPath = satirIkonu(this.kok, "yama", "duz");
        return item;
      }
      case "sinyal-madde": {
        const item = new vscode.TreeItem(o.madde, vscode.TreeItemCollapsibleState.None);
        item.id = `madde.${o.madde}`;
        item.description = SINYAL_METINLERI.kanonMaddesi;
        item.iconPath = satirIkonu(this.kok, "anayasa", "duz");
        item.command = { command: KANON_MADDESI_KOMUTU, title: SINYAL_METINLERI.kanonMaddesi, arguments: [o.madde] };
        return item;
      }
      default:
        return new vscode.TreeItem("");
    }
  }

  private bantSatiri(bant: SinyalBandi): vscode.TreeItem {
    const sayi = this.model.bantlar.find((b) => b.bant === bant)?.sayi ?? 0;
    // Bilgi bandı kapalı başlar (OZK-14); Dur ile Dikkat açık başlar.
    const durum = sayi === 0 ? vscode.TreeItemCollapsibleState.None
      : bant === "bilgi" ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.Expanded;
    const item = new vscode.TreeItem(SINYAL_METINLERI.bantAdi(bant), durum);
    item.id = `bant.${bant}`;
    item.description = `${sayi} · ${SINYAL_METINLERI.bantAnlami(bant)}`;
    item.tooltip = SINYAL_METINLERI.bantAnlami(bant);
    // Simge sayı sıfır olsa da düzeyin rengini taşır; satır işaretleriyle aynı renktir (Founder 2026-10-28).
    item.iconPath = satirIkonu(this.kok, "sinyal", BANT_RENGI[bant]);
    item.contextValue = `sarmalSinyalBandi.${bant}`;
    return item;
  }

  /**
   * Tür satırı (PNL-A28): okunur ad, kayıt sayısı ve tek cümlelik anlam. Kapalı başlar; sayı
   * türün kayıtlarının tamamıdır ve satır açılınca hepsi dosyaya göre görünür.
   */
  private turSatiri(bant: SinyalBandi, t: SinyalTuru): vscode.TreeItem {
    const item = new vscode.TreeItem(taniKisaAdi(t.kod), vscode.TreeItemCollapsibleState.Collapsed);
    item.id = `tur.${t.kod}`;
    const anlam = taniAnlami(t.kod) ?? t.ortakAnlam;
    item.description = [String(t.satirlar.length), anlam].filter(Boolean).join(" · ");
    const maddeler = t.satirlar[0]?.maddeler ?? [];
    item.tooltip = [
      ...(anlam ? [anlam] : []),
      SINYAL_METINLERI.turSayisi(t.kod, t.satirlar.length),
      ...(t.ortakOneri ? [`${SINYAL_METINLERI.ortakOneri}: ${t.ortakOneri}`] : []),
      ...(maddeler.length ? [`${SINYAL_METINLERI.kanonMaddesi}: ${maddeler.join(", ")}`] : []),
    ].join("\n");
    item.iconPath = satirIkonu(this.kok, "katmanlar", BANT_RENGI[bant]);
    item.contextValue = "sarmalSinyalTuru";
    return item;
  }

  private sinyalSatiri(s: SinyalSatiri, turIcinde: boolean): vscode.TreeItem {
    const t = s.kayit.tani;
    const cocuklu = Boolean(t.oneri) || s.maddeler.length > 0;
    const item = new vscode.TreeItem(t.mesaj,
      cocuklu ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);
    // Kimlik tanının yerini taşır; yol ayırıcısı satır kimliklerinin kademe ayırıcısı olduğu için
    // yalnız dosya adı yazılır (aynı adlı iki dosya panelin #n ekiyle ayrışır).
    item.id = `${t.kod}@${yuzeyDosyaAdiniAl(s.kayit.dosya)}:${t.satir}:${t.sutun}`;
    // Kod, dosya ve satır her satırda görünür; kanon maddesi yalnız bağı varsa yazılır (uydurulmaz). Tür satırının
    // altındaki kayıtta kod üst satırda yazılıdır ve tekrarlanmaz; dar panelde dosya ve satır görünür kalır (PNL-A28).
    item.description = [...(turIcinde ? [] : [t.kod]), `${yuzeyDosyaAdiniAl(s.kayit.dosya)}:${t.satir}`, ...s.maddeler].join(" · ");
    item.tooltip = [
      t.mesaj, `${t.kod} · ${s.kayit.dosya}:${t.satir}:${t.sutun}`,
      ...(t.oneri ? [`${SINYAL_METINLERI.oneri}: ${t.oneri}`] : []),
      ...(s.maddeler.length ? [`${SINYAL_METINLERI.kanonMaddesi}: ${s.maddeler.join(", ")}`] : []),
    ].join("\n");
    item.iconPath = satirIkonu(this.kok, "nokta", BANT_RENGI[s.bant]);
    item.contextValue = "sarmalSinyal";
    item.command = { command: "sarmal.dosyaAc", title: t.mesaj, arguments: [s.kayit.dosya, t.satir] };
    return item;
  }

  getParent(): undefined { return undefined; }
}

/** Kanon maddesinin tanımını kimlik indeksinden bulur ve dosyayı satırında açar; odak panelde kalır. */
async function kanonMaddesiniAc(madde: unknown): Promise<void> {
  if (typeof madde !== "string" || !madde) return;
  const tanim = kimlikIndeksi.tanimlar(madde)[0];
  if (!tanim) { void vscode.window.showInformationMessage(SINYAL_METINLERI.maddeYok(madde)); return; }
  await vscode.commands.executeCommand("sarmal.dosyaAc", tanim.dosya, tanim.satir, { odakPanelde: true });
}

/** Ağacı kurar ve kanon maddesi komutunu kaydeder. */
export function sinyallerKaydi(context: vscode.ExtensionContext): SinyallerAgaci {
  const agac = new SinyallerAgaci(context.extensionUri);
  context.subscriptions.push(
    vscode.commands.registerCommand(KANON_MADDESI_KOMUTU, (madde: unknown) => kanonMaddesiniAc(madde)),
  );
  return agac;
}

// ═══════════════════════════════════════════════════════════════════════════
// denetci.ts — Denetçi (Kapı 2 · Faz D0)
//
//   Beklenen yapı (ana.sar → iskelet planı) ile GERÇEK disk ağacını karşılaştırır.
//   Eklentinin göremediği drift'i (spec ↔ gerçeklik) yakalar. Bkz. PLN-1 · NIT-1.
//
//   İki katman AYRIK (iskeletçi deseni):
//     denetle(plan, anlıkGörüntü) → saf; diske dokunmaz (test edilebilir)
//     diskTara(kök)               → etkili; diski okuyup anlık-görüntü çıkarır
//
//   Drift türleri (NIT-1):
//     • kayıp-yapı           — ANA'da ilan edilmiş, diskte yok (hata)          [D0]
//     • bildirilmemiş-dosya  — diskte var, ANA'da ilan edilmemiş yetim (uyarı) [D0]
//     • beyansız-yapı        — kökte İLANSIZ üst-düzey klasör (hata · MIM-3    [D0]
//       çift-yönlü ayna, Founder 2026-07-11: her klasör ana.sar'da bildirilmeli)
//     • kırık-referans       — çağır KOD / kenar hedefi çözülmüyor             [D1]
//       (üretir istisnası: meyve çoğu zaman ilan edilmez → uyarı, hata değil)
//     • yer-uyuşmazlığı      — dosya var + ilanlı ama YANLIŞ klasörde (hata)   [D2]
//       (.md frontmatter KOD'u ↔ yolcoz kanonik yolu · FEL-3 deep-mirror)
//     • kural-ihlali         — yasa çiğnemesi (v1: artefakt adı ASCII-kebap     [D3]
//       değil · proje kökünde giriş dosyası ilan edilmemiş · MIM-3)
// ═══════════════════════════════════════════════════════════════════════════

import { readdirSync, readFileSync, existsSync, statSync, type Dirent } from "node:fs";
import { join } from "node:path";
import type { IskeletPlan } from "./iskeletci.ts";
import type { Program, Dugum, Deger, Param } from "./sozdizim.ts";
import type { Siniflama } from "./siniflama.ts";
import { TAKSONOMI_BAS, TAKSONOMI_SON, taksonomiMd } from "./siniflama.ts";   // başvuru yüzü kanondan üretilir
import { taniSicili, katlanmisAd } from "./tani-sicili.ts";   // davranış-katmanı turu: beceri-drift nöbeti tanı evreni · katlanmış ad: orthografi nöbeti
import { ORTAK_TANI_METINLERI, eskiTani, yeniTani } from "./tani-metinleri.ts";   // yeni kanonun tanı metinleri katalogda yaşar
import type { Tani, Duzey } from "./tani.ts";
import { kebaba, degerMetni } from "./yolcoz.ts";
import { durumTuret, adimDurumlariTopla } from "./durum.ts";   // durum tek kaynaktan türetilir: "bitti" tanımı tek yerde yaşar
import { ZEMIN_TIPLERI } from "./dag.ts";   // zemin bağının hedef tipleri tek kaynakta yaşar (motor tanısı ile graf çizimi ayrışmasın)
import { belirtecle, SozDizimHatasi } from "./belirtec.ts";
import { ayristir } from "./ayristirici.ts";
import { kurallariCikar, ciftCatismasi, KAPSAM_JOKER } from "./kuralci.ts";
import type { KuralBilgi } from "./kuralci.ts";
import { INDEKS_DISI, type KimlikIndeksi } from "./kimlik.ts";   // kanıt-ekseni turu: gezginin GÖZÜ ödünç (indeksler AYRI) · OGR-5: ders-kapsamı tek kaynaktan
import { rbacGrafDenetle, rbacKapsami } from "./rbac.ts";   // V1B-RBAC-A01: RBAC ihlalleri proje-çapı akışa iş bölümü kapısından katılır; kapsam süzgeci iki yüzeyde ortaktır
import { GIZLI_KOK_ADI } from "./kok-yuzeyi.ts";   // açık-gizli sınır nöbeti kapalı ürünün kök adını TEK kaynaktan okur (ad koda gömülü kalırsa yeniden adlandırmada nöbet sessizce körleşir)

export interface DiskGirdi {
  tur: "dizin" | "dosya";
  /** köke göreli yol (POSIX). */
  yol: string;
  /** .md frontmatter'ından okunan KOD (yer-uyuşmazlığı eşlemesi). */
  kod?: string;
}

export interface DiskAnlikGoruntu {
  girdiler: DiskGirdi[];
}

/** Tarama dışı: araç/altyapı gürültüsü drift değildir. */
const YOKSAY = new Set([".git", "node_modules", "__pycache__", ".DS_Store", "dist", "out", "arsiv", "fikstur", "sablon"]);

/** Kökten gerçek ağacı okur (etkili). Gizli (.-önekli) girdiler ve YOKSAY atlanır. */
export function diskTara(kok: string): DiskAnlikGoruntu {
  const girdiler: DiskGirdi[] = [];
  const gez = (goreli: string): void => {
    const tam = goreli ? join(kok, goreli) : kok;
    for (const d of readdirSync(tam, { withFileTypes: true })) {
      if (d.name.startsWith(".")) continue;   // gizli (.-önekli): tamamen dışarıda
      if (d.isSymbolicLink()) continue; // döngü riski — v1 dışı
      const yol = goreli ? goreli + "/" + d.name : d.name;
      if (d.isDirectory()) {
        // YOKSAY klasörü KAYDEDİLİR (kayıp-yapı görsün, yapı-aynası tam) ama İÇİNE
        // İNİLMEZ — içeriği parse/taranmaz (şablon placeholder'ı · arşiv · build çöpü).
        girdiler.push({ tur: "dizin", yol });
        if (!YOKSAY.has(d.name)) gez(yol);
      } else if (d.isFile()) {
        if (YOKSAY.has(d.name)) continue;   // dosya adı YOKSAY'daysa atla (nadir)
        girdiler.push({ tur: "dosya", yol, kod: yol.endsWith(".md") ? frontmatterKod(join(kok, yol)) : undefined });
      }
    }
  };
  gez("");
  return { girdiler };
}

/** Yapı-aynasının İKİNCİ yönü (MIM-3 çift-yönlü · Founder 2026-07-11 "her klasör
 *  ana.sar'da belirtilmeli"): kökteki HER klasör ana.sar'da ilan edilmeli.
 *  diskTara/YOKSAY .sar-AYRIŞTIRMA gürültüsünü eler (şablon placeholder'ları,
 *  arşiv); bu kapı ise YAPIYI denetler — kendi kök taramasını yapar, yalnız
 *  gerçek build/vendor'ı atlar, ilansız üst-düzey klasörü HATA verir.
 *  Klasör-DÜZEYİ: klasörler bildirilir, içerik-serbest olabilir (kod dosyaları
 *  yetim-meyve kapısında). Kayıp-yapının simetrik ikizi (ilan↔disk çift yön). */
const YAPI_VENDOR = new Set([".git", "node_modules", "__pycache__", ".DS_Store", "dist", "out"]);

/** SAF: ilan edilen üst-düzey klasörler ↔ diskteki üst-düzey klasör adları →
 *  beyansız tanıları (test edilebilir; diske dokunmaz — denetle deseni). */
export function beyansizYapiDenetle(plan: IskeletPlan, diskUstKlasorler: readonly string[], anaEtiket = "ana.sar"): Array<{ dosya: string; tani: Tani }> {
  const ilanli = new Set(
    plan.ogeler.filter((o) => o.tur === "dizin" && !o.yol.includes("/")).map((o) => o.yol.toLowerCase()),
  );
  const out: Array<{ dosya: string; tani: Tani }> = [];
  for (const ad of diskUstKlasorler) {
    if (ad.startsWith(".") || YAPI_VENDOR.has(ad)) continue;   // gizli + gerçek build/vendor drift değil
    if (ilanli.has(ad.toLowerCase())) continue;
    out.push({
      dosya: anaEtiket,
      tani: eskiTani("beyansız-yapı", "hata", { ad, giriş: anaEtiket }, { satir: 0, sutun: 0 }),
    });
  }
  return out;
}

/**
 * MIM-1.4 teknolojisiz-yüzey bekçisi (BKM-KAPI-A02 · v1 proje-düzeyi): Ekran/Uç
 * ilan edilmiş ama ÇALIŞMA-ALANINDA hiçbir Teknoloji/Takım ilanı ya da çağrısı
 * yoksa uyar — "Flutter seçilmeden ekran doğmaz" (MIM-1.4) motora iner. Ekran-başına
 * kenar zorlaması bilerek YOK (Takım kökte yaşar; yüzey-başına zorlamak yanlış-
 * pozitif üretir). Saf: programlar + kod indeksi alır.
 */
export function teknolojisizYuzeyTanilari(
  programlar: ReadonlyMap<string, Program>,
  indeks: KodIndeks,
): Array<{ dosya: string; tani: Tani }> {
  const TEKNOLOJI = new Set(["Teknoloji", "Takım"]);
  let ilkYuzey: { dosya: string; ad: string; satir: number; sutun: number } | undefined;
  let teknolojiVar = false;
  const gez = (d: Dugum, dosya: string): void => {
    if (d.tur === "widget") {
      if ((d.ad === "Ekran" || d.ad === "Uç") && !ilkYuzey)
        ilkYuzey = { dosya, ad: d.ad, satir: d.satir, sutun: d.sutun };
      if (TEKNOLOJI.has(d.ad)) teknolojiVar = true;
    } else if (d.tur === "çağır") {
      // çağır hedefi bir Teknoloji/Takım'a çözülüyorsa teknoloji SEÇİLMİŞ demektir.
      const hedef = indeks.get(d.ad);
      if (hedef && TEKNOLOJI.has(hedef.tip)) teknolojiVar = true;
    }
    for (const c of d.cocuklar) gez(c, dosya);
  };
  for (const [dosya, p] of programlar) for (const bd of p.bildirimler) gez(bd, dosya);
  if (!ilkYuzey || teknolojiVar) return [];
  return [{
    dosya: ilkYuzey.dosya,
    tani: eskiTani("teknolojisiz-yüzey", "uyarı",
      { yüzey: ilkYuzey.ad }, { satir: ilkYuzey.satir, sutun: ilkYuzey.sutun }),
  }];
}

/** ETKİLİ: kökün üst-düzey klasörlerini okuyup saf denetime verir (diskTara ikizi). */
export function beyansizYapiTanilari(plan: IskeletPlan, kok: string, anaEtiket = "ana.sar"): Array<{ dosya: string; tani: Tani }> {
  let girdiler: Dirent[];
  try { girdiler = readdirSync(kok, { withFileTypes: true }); } catch { return []; }
  return beyansizYapiDenetle(plan, girdiler.filter((d) => d.isDirectory()).map((d) => d.name), anaEtiket);
}

// ═══════════════════════════════════════════════════════════════════════════
// İLAN YOKLUĞU BEKÇİSİ — kitaplığa konmuş ilansız kaynak gövdesi
//
//   Yapı-Önce hükmü bugüne dek yalnız KLASÖR düzeyinde zorlanıyordu: kökte
//   açılan ilansız bir klasörü `beyansız-yapı` yakalıyor, ilan edilmiş bir
//   rafın altına konan dosyayı ise hiçbir bekçi görmüyordu. Ölçülen sonuç
//   şuydu: bilgi kitaplığına ilan edilmemiş bir kaynak dosyası konuldu ve
//   denetim sıfır hata verip dosyayı sessizce kabul etti.
//
//   EŞİK — raf düzeyinde beyan ile dosya düzeyinde ilan burada ayrılır.
//   Sınıflama kanonu Raf tipini "klasör ilanıdır ve içerik rafın içine
//   sarılır" diye tarif eder; bir rafın beyanı bu yüzden raf DÜZEYİNDE bir
//   desendir ve altındaki her gövdeyi kapsar. Kitaplık tipi ise "dallanan
//   klasördür, kitaplıkta RAFLAR durur" diye tarif edilir ve yalnız raf
//   taşımaya ilan edilmiştir. Dolayısıyla bir kaynak gövdesi doğrudan bir
//   kitaplığın (ya da çalışma alanı kökünün) içinde yaşıyorsa o gövdenin
//   ilanı hiçbir yerde yazmaz ve bekçi yalnız bu durumu bildirir. Eşik
//   bilerek buraya konmuştur: her dosyayı tek tek giriş dosyasına yazdırmak
//   ilanı gürültüye çevirir ve ilanın öğretici değerini yok eder.
//
//   MUAFİYET — üretilen dosyalar, örnek dünyası, şablon rafı, sınama
//   fikstürleri ve arşiv bu bekçinin dışındadır, çünkü onların varlık
//   gerekçesi zaten rafın kendi ilanında yazar ve her birini ayrıca ilan
//   etmek yanlış pozitif üretir. Giriş dosyasının kendisi de muaftır, çünkü
//   giriş dosyası kendi alt ağacını ilan eden belgedir ve kendi ilanını
//   bekleyemez.
//
//   SINIR — bekçi yalnız ilanın YOKLUĞUNU bildirir. Eksik ilanı kendisi
//   yazmaz, çünkü ilan bir niyet beyanıdır: bir gövdenin hangi rafa ait
//   olduğuna ve o rafın neyi topladığına insan karar verir.
// ═══════════════════════════════════════════════════════════════════════════

/** Bekçinin muaf tuttuğu klasör adları; yol üzerindeki herhangi bir dizin
 *  parçası bu kümedeyse dosya bildirilmez (üretilen · örnek · şablon · sınama
 *  fikstürü · arşiv · araç çıktısı). */
const ILANSIZ_MUAF_KLASOR: ReadonlySet<string> = new Set([
  "sablon", "arsiv", "fikstur", "sinama", "ornek", "vitrin", "vitrinler",
  "uretilen", "dist", "out", "node_modules", "__pycache__",
]);

/** Bekçinin ilan aradığı kaynak uzantısı — normatif metin yalnız burada yaşar. */
const ILANSIZ_KAYNAK_UZANTI = ".sar";

/** Bir yol etiketinin kapsayıcı dizinini döndürür; kökteki dosya için boş dize. */
function ustDizin(yol: string): string {
  const kesim = yol.lastIndexOf("/");
  return kesim < 0 ? "" : yol.slice(0, kesim);
}

/**
 * SAF: ilan edilmiş ağaç ile diskteki kaynak gövdelerini karşılaştırır ve
 * ilanı bulunmayan gövdeleri KAPSAYICISINA GÖRE GRUPLAYARAK bildirir.
 *
 * Gruplama bilinçli bir tercihtir ve tanı dürüstlüğü hükmünden doğar: on bir
 * dosyanın aynı kitaplıkta ilansız durması on bir ayrı olgu değildir, tek bir
 * kökün on bir belirtisidir. Bekçi bu yüzden kökü bir kez söyler, sayısını
 * ve örneklerini verir ve düzeltmeyi ilanın yazılacağı satırda gösterir.
 *
 * Düzey çağırandan gelir, çünkü aynı bekçi kapı hükmünde ve editör yüzünde
 * farklı ağırlıkla konuşabilir; kademe kararı üreticinin değil çağıranın işidir.
 */
export function ilansizGovdeDenetle(
  plan: IskeletPlan,
  disk: DiskAnlikGoruntu,
  anaEtiket = "ana.sar",
  duzey: Duzey = "bilgi",
): Array<{ dosya: string; tani: Tani }> {
  // ① İlan edilmiş dizinler: yol → raf mı, ilanı hangi satırda yaşıyor.
  const ilanliDizin = new Map<string, { raf: boolean; satir: number; sutun: number }>();
  // Çalışma alanının kökü daima ilanlıdır (kök = giriş dosyasının kendi dizini)
  // fakat bir RAF değildir: kökün ilanı klasör ağacını beyan eder, kökün içine
  // konan gövdeyi değil. Bu yüzden kök de kitaplık gibi gövde taşımaz.
  ilanliDizin.set("", { raf: false, satir: 0, sutun: 0 });
  const ilanliDosya = new Set<string>();
  for (const o of plan.ogeler) {
    if (o.tur === "dizin") {
      ilanliDizin.set(o.yol.toLowerCase(), {
        raf: o.icerikRafi === true, satir: o.satir ?? 0, sutun: o.sutun ?? 0,
      });
    } else {
      ilanliDosya.add(o.yol.toLowerCase());
    }
  }
  // İlan edilmiş teknoloji ayak izleri dosya düzeyinde beyandır (MIM-1.4 ③):
  // sahibi bulunan bir iz ilansız sayılamaz.
  const izKokler = (plan.ayakIzleri ?? []).map((i) => i.yol.toLowerCase());

  // ② En yakın ilanlı ata: dosya hangi ilanın kapsamında yaşıyor.
  const enYakinIlan = (dizin: string): string | undefined => {
    let aday = dizin;
    while (aday !== "") {
      if (ilanliDizin.has(aday)) return aday;
      aday = ustDizin(aday);
    }
    return ilanliDizin.has("") ? "" : undefined;
  };

  const kumeler = new Map<string, { satir: number; sutun: number; dosyalar: string[] }>();
  for (const g of disk.girdiler) {
    if (g.tur !== "dosya" || !g.yol.toLowerCase().endsWith(ILANSIZ_KAYNAK_UZANTI)) continue;
    const yol = g.yol.toLowerCase();
    if (GIRIS_DOSYASI.test(yol)) continue;                       // giriş dosyası kendi ilanını bekleyemez
    if (ilanliDosya.has(yol)) continue;                          // dosya düzeyinde ilan edilmiş
    if (izKokler.some((k) => yol === k || yol.startsWith(k + "/"))) continue;   // sahipli ayak izi
    const dizin = ustDizin(yol);
    if (dizin.split("/").some((parca) => ILANSIZ_MUAF_KLASOR.has(parca))) continue;   // muafiyet listesi
    // Üst-düzey klasörün kendisi ilansızsa kök başka bir bekçinin (beyansız-yapı)
    // işidir; aynı olguyu iki kez bildirmek gerçek nedeni örter.
    const ustDuzey = dizin === "" ? "" : dizin.split("/")[0];
    if (ustDuzey !== "" && !ilanliDizin.has(ustDuzey)) continue;
    const kapsayici = enYakinIlan(dizin);
    if (kapsayici === undefined) continue;                       // ilanlı ağacın tamamen dışında
    if (ilanliDizin.get(kapsayici)?.raf === true) continue;      // EŞİK: raf düzeyinde beyan gövdeyi kapsar
    const kayit = kumeler.get(kapsayici) ?? {
      satir: ilanliDizin.get(kapsayici)?.satir ?? 0,
      sutun: ilanliDizin.get(kapsayici)?.sutun ?? 0,
      dosyalar: [],
    };
    kayit.dosyalar.push(g.yol);
    kumeler.set(kapsayici, kayit);
  }

  const out: Array<{ dosya: string; tani: Tani }> = [];
  for (const [kapsayici, kayit] of [...kumeler].sort((a, b) => a[0].localeCompare(b[0], "tr"))) {
    const dosyalar = [...kayit.dosyalar].sort((a, b) => a.localeCompare(b, "tr"));
    out.push({
      dosya: anaEtiket,
      tani: eskiTani("ilansız-gövde", duzey, {
        yer: kapsayici,
        kök: kapsayici === "",
        giriş: anaEtiket,
        sayı: dosyalar.length,
        örnekler: dosyalar.slice(0, 3),
        artan: Math.max(0, dosyalar.length - 3),
      }, { satir: kayit.satir, sutun: kayit.sutun }),
    });
  }
  return out;
}

/** ETKİLİ ikizi yoktur: bekçi disk anlık-görüntüsünü çağırandan alır, çünkü
 *  hem kapı hükmü hem editör yüzü aynı taramayı zaten yapmıştır ve diski ikinci
 *  kez okumak iki farklı gerçek üretme riski taşır. */

/** .md frontmatter'ından `kod:` alanını okur (ilk 512 karakter yeter).
 *  A09/C3 (bug-avı): çapa dosya-BAŞINA bağlandı — eskiden gövdedeki herhangi
 *  bir `---` satırı (yatay çizgi) + `kod:` geçen satır frontmatter sanılıyordu
 *  (sahte KOD → sahte yer-uyuşmazlığı riski). */
function frontmatterKod(tamYol: string): string | undefined {
  try {
    const bas = readFileSync(tamYol, "utf8").slice(0, 512);
    if (!bas.startsWith("---")) return undefined;   // frontmatter yalnız dosya başında yaşar
    const e = /^---[\s\S]*?^kod:\s*(\S+)\s*$/m.exec(bas);
    return e?.[1];
  } catch {
    return undefined; // okunamayan dosya = kodsuz dosya
  }
}

/**
 * Beklenen planı gerçek anlık-görüntüye vurur (saf).
 *
 *   kayıp-yapı: plan öğesi diskte yok (ya da türü uyuşmuyor) → hata,
 *               konum = ana.sar'daki ilan satırı.
 *   bildirilmemiş-dosya: İLAN EDİLMİŞ omurga dizinlerinin İÇİNDE olup planda
 *               olmayan girdi → uyarı. Omurga dışı (repo kökü README vb.)
 *               D0'da raporlanmaz — yanlış-pozitif üretme.
 */
export function denetle(plan: IskeletPlan, disk: DiskAnlikGoruntu): Tani[] {
  const tanilar: Tani[] = [];
  const diskTur = new Map<string, "dizin" | "dosya">(disk.girdiler.map((g) => [g.yol, g.tur]));
  const planYol = new Set(plan.ogeler.map((o) => o.yol));
  // Harf-duyarsız görünümler: macOS/Windows'ta 'Dev-Checkpoints' ile
  // 'dev-checkpoints' AYNI dizindir — büyük harf kayıp değil, ad ihlalidir
  // (artefakt adı küçük ASCII-kebap yazılır; DIL-1.2 ad sözleşmesinin komşusu).
  const diskTurKucuk = new Map<string, "dizin" | "dosya">(disk.girdiler.map((g) => [g.yol.toLowerCase(), g.tur]));
  const planYolKucuk = new Set(plan.ogeler.map((o) => o.yol.toLowerCase()));

  // ── yer-uyuşmazlığı (D2 · FEL-3 deep-mirror) ───────────────────────────────
  // Diskteki dosya KOD taşıyorsa gerçek yeri kanonik yerle karşılaştırılır.
  // Uyuşmazsa TEK isabetli tanı verilir; aynı olgu kayıp-yapı + bildirilmemiş
  // olarak İKİNCİ kez raporlanmaz (bastırma kümeleri).
  const bastirilanKayip = new Set<string>();
  const bastirilanYetim = new Set<string>();
  const diskKodYol = new Map<string, string>();
  for (const g of disk.girdiler) {
    if (g.kod && !diskKodYol.has(g.kod)) diskKodYol.set(g.kod, g.yol);
  }
  for (const o of plan.ogeler) {
    if (!o.kod || o.tur !== "dosya") continue; // dizinler diskte KOD taşımaz — v1 dışı
    const gercek = diskKodYol.get(o.kod);
    if (!gercek || gercek === o.yol || diskTur.has(o.yol)) continue;
    bastirilanKayip.add(o.yol);
    bastirilanYetim.add(gercek);
    tanilar.push(eskiTani("yer-uyuşmazlığı", "hata",
      { kod: o.kod, beklenen: o.yol, gerçek: gercek }, { satir: o.satir ?? 0, sutun: o.sutun ?? 0 }));
  }

  // ── kayıp-yapı ─────────────────────────────────────────────────────────────
  for (const o of plan.ogeler) {
    if (bastirilanKayip.has(o.yol)) continue; // yer-uyuşmazlığı olarak raporlandı
    const diskte = diskTur.get(o.yol);
    if (diskte === o.tur) continue;
    // A07 (bug-avı B5): yalnız büyük/küçük harf farkıyla eşleşen öğe eskiden
    // SESSİZCE bastırılıyordu ("ad-ihlali kapısı yakalar" varsayımıyla) — ama o
    // kapı `.sar` dosyalarını kapsamıyor, dosya İKİ bastırmanın arasına
    // düşüyordu (macOS'ta
    // sessiz, Linux'ta "dosya yok"). Artık bastırma yerine KONUMLU tanı.
    if (diskte === undefined && diskTurKucuk.get(o.yol.toLowerCase()) === o.tur) {
      tanilar.push(eskiTani("harf-farkı", "hata",
        { yol: o.yol, tür: o.tur }, { satir: o.satir ?? 0, sutun: o.sutun ?? 0 }));
      continue;
    }
    tanilar.push(eskiTani("kayıp-yapı", "hata",
      { yol: o.yol, tür: o.tur, diskte }, { satir: o.satir ?? 0, sutun: o.sutun ?? 0 }));
  }

  // ── bildirilmemiş-dosya ────────────────────────────────────────────────────
  // Omurga kapsamı: planın en-üst dizinleri. Yalnız bunların içi denetlenir.
  const omurga = omurgaKokleri(plan);
  // MIM-3 ① (GBR-A09): İÇ İÇE içerik-serbest muafiyeti — yetim taraması bir girdiyi
  // HERHANGİ bir içerik-serbest öğenin (Raf/Kitaplık) altındaysa atlar, yalnız
  // en-üst raf değil. omurgaKokleri en-üst rafı zaten omurgadan çıkarır; iç içe
  // raf (ör. tanitim/app/) bugüne dek startsWith kesitine düşüp yetim sayılıyordu
  // — yorumun (aşağıda, omurgaKokleri) vaadi buydu, davranış şimdi vaade eşitlendi.
  const serbestKokler = plan.ogeler
    .filter((o) => o.tur === "dizin" && o.icerikSerbest)
    .map((o) => o.yol.toLowerCase() + "/");
  // MIM-1.4 ③ (GBR-A11): ayakizi muafiyeti — İLAN-EDİLMİŞ bir teknolojinin beyan
  // ettiği config/scaffold/üretilen dosya izi ilan-edilmiş omurga-dışıdır
  // (sebep-bağlı beyaz-liste; düz omurgaDisi/.sarmalignore glob'u teknolojinin
  // kendi ayak izini sahiplenmesi lehine REDDEDİLDİ). İz, ilanın dizinine göreli
  // çözülmüş gelir (iskeletPlani);
  // dizin izi alt-ağacını da kapsar. Sahipsiz dosya HÂLÂ yetimdir.
  const izKokler = (plan.ayakIzleri ?? []).map((i) => i.yol.toLowerCase());

  for (const g of disk.girdiler) {
    if (planYolKucuk.has(g.yol.toLowerCase())) continue; // (harf farkı ad-ihlali kapısının işi)
    if (bastirilanYetim.has(g.yol)) continue; // yer-uyuşmazlığı olarak raporlandı
    if (!omurga.some((k) => g.yol.toLowerCase().startsWith(k))) continue;
    if (serbestKokler.some((k) => g.yol.toLowerCase().startsWith(k))) continue; // MIM-3 ① içerik-serbest alt-ağaç
    // MIM-3 ② (GBR-A10): YOKSAY simetrisi — diskTara vendor/build dizinlerinin
    // (node_modules·dist·out·__pycache__·arsiv·fikstur·sablon) İÇİNE inmez ama
    // dizinin KENDİSİ yetim sayılıyordu; kardeş kapı beyansizYapiDenetle
    // YAPI_VENDOR'ı zaten atlar — iki kapı artık aynı kümeyi atlar (simetri).
    if (YOKSAY.has(g.yol.slice(g.yol.lastIndexOf("/") + 1))) continue;
    const y = g.yol.toLowerCase();
    if (izKokler.some((k) => y === k || y.startsWith(k + "/"))) continue; // MIM-1.4 ③ ayakizi
    tanilar.push(eskiTani("bildirilmemiş-dosya", "uyarı",
      { yol: g.yol, tür: g.tur }, { satir: 0, sutun: 0 }));
  }

  // MIM-1.4 ③ çift-yönlü ayna (bilgi nudge): ayakizi'nde YAZAN ama diskte OLMAYAN iz.
  // (Diğer yön — diskte var ama teknolojisi ilansız — zaten bildirilmemiş-dosya
  // uyarısıdır; önerisi ayakizi'ne yönlendirir.) Nokta-önekli ve YOKSAY girdileri
  // atlanır: diskTara onları HİÇ görmez (ör. .wrangler/ · node_modules), yokluk
  // kanıtı değildir — yanlış-pozitif üretme.
  // göç motor turu A10 kapanışı (2026-07-27): `ayakizi-bulunamadı` emekli edildi. Eski Teknoloji
  // iskelet ayak-izi bildirimi yeni omurgada ayrı bir tanı olarak korunmadı; disk
  // mutabakatı MIM-3 maddesinin `beyansız-yapı`, `kayıp-yapı` ve
  // `bildirilmemiş-dosya` tanılarında yaşamaya devam eder. Ölçüm: canlı bahçede
  // sıfır bulgu üretiyordu.

  return tanilar;
}

// ═══════════════════════════════════════════════════════════════════════════
// Faz D3 — kural-ihlali v1 (PLN-1)
//   ad-ihlali: artefakt/belge (.md/.yaml/.json) adı ASCII-kebap olmalı (uyarı).
//         Kapsam: omurga içi. `.sar` kaynak adları DIL-1.2'nin işi → kapsam dışı.
//   MIM-3: `ana-yok` — proje kökünde ana.sar ilanı yoksa (hata). CLI (D4) verir;
//         buradaki anaYokTanısı() tek üretim noktasıdır.
// ═══════════════════════════════════════════════════════════════════════════

const ARTEFAKT_UZANTI = /\.(md|yaml|json)$/;
// DIL-1.2 ②: kanonik ayraç ALT-ÇİZGİ; tire GEÇİŞ döneminde meşru (mevcut artefaktlar kırılmaz).
const KEBAP = /^[a-z0-9]+([_-][a-z0-9]+)*$/;
/** #10 (IDA dogfood 2026-07-14): framework-DAYATMASI klasör adları ad-ihlali
 *  kapısının DIŞINDADIR — dinamik segment [dil], route group (hukuki), paralel
 *  slot @panel evrensel routing işaretleridir (Next.js·SvelteKit·Remix);
 *  köşeli/parantez/@ diakritik ya da boşluk gibi taşınma tehlikesi DEĞİL. Bu kapı
 *  belge-adı taşınabilirliği içindir; framework yolunu yeniden adlandıramayız
 *  (kod kırılır). */
const FRAMEWORK_KLASOR = /^(\[.+\]|\(.+\)|@.+)$/;

/** Omurga: planın en-üst PLAN dizinleri ('kimlik/' gibi ön-ek listesi).
 *  Raf dizinleri (içerikSerbest · PLN-3 P2) omurgaya GİRMEZ: Denetçi rafın
 *  yalnız varlığını arar (kayıp-yapı); içindeki dosyaları yetim saymaz —
 *  dosya-tipi→raf kuralları v2'nin işi. */
function omurgaKokleri(plan: IskeletPlan): string[] {
  return plan.ogeler
    .filter((o) => o.tur === "dizin" && !o.yol.includes("/") && !o.icerikSerbest)
    .map((o) => o.yol + "/");
}

/** Omurga (planın en-üst dizinleri) içindeki ASCII-kebap ad ihlallerini bulur (saf). */
export function kuralTanilari(plan: IskeletPlan, disk: DiskAnlikGoruntu): Tani[] {
  const tanilar: Tani[] = [];
  const omurga = omurgaKokleri(plan);
  for (const g of disk.girdiler) {
    if (!omurga.some((k) => g.yol.toLowerCase().startsWith(k))) continue;
    const taban = g.yol.slice(g.yol.lastIndexOf("/") + 1);
    let ad: string;
    if (g.tur === "dosya") {
      if (!ARTEFAKT_UZANTI.test(taban)) continue; // kod/ürün dosyaları ad-ihlali kapsamı dışı
      ad = taban.replace(ARTEFAKT_UZANTI, "");
    } else {
      ad = taban;
      if (FRAMEWORK_KLASOR.test(ad)) continue; // #10: [dil]·(hukuki)·@panel framework yolu — ad-ihlali dışı
    }
    if (KEBAP.test(ad)) continue;
    tanilar.push(eskiTani("kural-ihlali", "uyarı",
      { kusur: "ad-kuralı", yol: g.yol, ad, onerilen: kebaba(ad) }, { satir: 0, sutun: 0 }));
  }
  return tanilar;
}

/**
 * Verilen yolun disk üzerindeki gerçek türünü ölçer. Tanı metni bu ölçüme
 * dayanır; ölçülmeyen bir kap iddiası cümleye giremez.
 */
function yolTuru(yol: string): "dosya" | "dizin" | "yok" {
  try { return statSync(yol).isDirectory() ? "dizin" : "dosya"; }
  catch { return "yok"; }
}

/**
 * MIM-3 `ana-yok` tanısı — proje denetimi giriş dosyasını çözemediğinde üretilir
 * (CLI ile proje denetimi kullanır).
 *
 * Tanı, verilen yolun türünü ÖLÇEREK konuşur. Ölçüm eklenmeden önce cümle her
 * durumda "'<yol>' içinde giriş dosyası yok" diyordu; bu ifade yolun bir kap
 * olduğunu varsayar ve o varsayım hiç sınanmıyordu. Sonuç, kullanıcı komuta
 * doğru adlandırılmış bir giriş dosyasını doğrudan verdiğinde dahi ortaya çıkan
 * yanıltıcı bir hükümdü: motor aslında bir dizin bekliyorken kullanıcıya giriş
 * dosyasının eksik olduğunu söylüyordu. Tanı metni artık üç durumu ayırır ve her
 * birinde yalnız ölçtüğü şeyi iddia eder (öğretim ile tanının aynı şeyi
 * söylemesi hükmü).
 */
export function anaYokTanisi(yol: string): Tani {
  return eskiTani("kural-ihlali", "hata",
    { kusur: "girişsiz-dizin", dizin: yol, hedef: yolTuru(yol) }, { satir: 0, sutun: 0 });
}

// göç motor turu A10 kapanışı (2026-07-27): `eski-giriş-adı` ile `öneksiz-anadizin` emekli
// edildi. `ana.sar` geçiş uyumluluğu ile öneksiz giriş adlandırması yeni kod
// grafında yaşamaz; giriş dosyasının kanonik adı MIM-3 disk mutabakatının ve
// DIL-1.2 ad sözleşmesinin işidir. Motor eski adı hâlâ TANIR (kırılma yok),
// yalnız ayrı bir tanı basmaz. Ölçüm: ikisi de canlı bahçede sıfır bulgu.

// ═══════════════════════════════════════════════════════════════════════════
// DIL-1.2 ① — varlık giriş dosyası: `<varlık>_anadizin.sar` DESENİ (Founder 2026-07-11)
//   Motor sabit ad aramaz, desen arar; GEÇİŞ döneminde eski `ana.sar` da tanınır
//   (dış projeler kırılmaz) — denetle eski ada bilgi tanısıyla yeni adı çağırır.
// ═══════════════════════════════════════════════════════════════════════════

/** Bir dizindeki varlık giriş dosyasını bulur: önce `*_anadizin.sar` (DIL-1.2),
 *  yoksa eski `ana.sar`. Bulunamazsa undefined. Tek kaynak — CLI + eklenti + MCP
 *  aynı yardımcıyı kullanır (kopya arama yasak). */
/**
 * Doğuş-eksik kapısı (doğuş-rehberi turu · MIM-3/MIM-1.4'ün TEK-DOSYA yüzü · SAF): kaynak
 * Faz/Katman/Adım (plan) taşıyor ama dosyada ne temel-aile kökü (Proje/
 * ÇalışmaAlanı/Uygulama — doğuş dosyasının kendisi) ne Teknoloji/Takım ilanı,
 * ne TAKIM-önekli bağımlı/kullanir referansı ne de çağır köprüsü var →
 * 'doğuş-eksik' UYARISI. Sınav-1 dersi: ajan boş tarlaya plan yazdı, motor
 * sustu. YALNIZ proje-bağlamsız yüzeyde çağrılır (MCP kaynak / anadizinsiz
 * dizin) — anadizinli çalışma-alanında proje-denetimi (ana-yok ·
 * teknolojisiz-yüzey) zaten nöbette; çift tanı basılmaz.
 */
export function dogusEksikTanilari(program: Program): Tani[] {
  const TEMEL = new Set(["Proje", "ÇalışmaAlanı", "Uygulama"]);
  const TEKNOLOJI = new Set(["Teknoloji", "Takım"]);
  const PLAN = new Set(["Faz", "Katman", "AltKatman", "Adım"]);
  let ilkPlan: Dugum | undefined;
  let bagVar = false;
  const gez = (d: Dugum): void => {
    if (d.tur === "çağır") { bagVar = true; return; }
    if (d.tur === "widget") {
      if (TEMEL.has(d.ad) || TEKNOLOJI.has(d.ad)) bagVar = true;
      if (!ilkPlan && PLAN.has(d.ad)) ilkPlan = d;
      // Takım referansı: bağımlı/kullanir değerinde TAKIM-önekli KOD (tek-dosyada
      // çözülemez ama İLAN edilmiş niyettir — yanlış-pozitif kalkanı: bağlıysa sus).
      for (const p of [...d.parametreler, ...d.ozellikler]) {
        if (p.ad !== "bağımlı" && p.ad !== "kullanir") continue;
        const metinler = p.deger.tur === "liste"
          ? (p.deger.ogeler ?? []).map((o) => o.metin).filter((m): m is string => !!m)
          : p.deger.metin ? [p.deger.metin] : [];
        if (metinler.some((m) => m.startsWith("TAKIM"))) bagVar = true;
      }
    }
    for (const c of d.cocuklar) gez(c);
  };
  for (const b of program.bildirimler) gez(b);
  if (!ilkPlan || bagVar) return [];
  return [eskiTani("doğuş-eksik", "uyarı",
    { plan: ilkPlan.ad }, { satir: ilkPlan.satir, sutun: ilkPlan.sutun })];
}

/**
 * Doğuş-sırası bekçisi — PROJE-FARKINDA (E1-A04 · IDA dogfood · MIM-1.4 · EVRE-1):
 * dogusEksikTanilari tek-dosya yüzeyinde (MCP) çalışıyordu; CLI'da naif tek-dosya
 * wire YANLIŞ-POZİTİF üretir (reform/sef plan-fragmanları teknolojiyi ANADİZİNDEN
 * alır). Bu bekçi TÜM projeyi (çok-dosya) birlikte görür: proje genelinde bir
 * doğuş omurgası (Teknoloji/Takım ilanı VEYA temel kök VEYA çağır köprüsü) HİÇ
 * YOKSA ama plan düğümü (Faz/Blok/Katman/Adım) VARSA → bir kez 'doğuş-sırası'
 * uyarısı (ilk plan düğümünde). Omurga bir dosyada bile varsa proje TEMİZ —
 * fragman yanlış-pozitifi biter. Düzey: uyarı (iskelet meşru, hata değil; YAS-3.4).
 */
export function dogusEksikProjeTanilari(
  programlar: ReadonlyMap<string, Program>,
  muaflar?: ReadonlySet<string>,
): Array<{ dosya: string; tani: Tani }> {
  // MIM-1.4 omurgası = TEKNOLOJİ ilanı (Teknoloji/Takım) veya ona çağır köprüsü.
  // Çıplak temel kök (Proje/Uygulama) omurga SAYILMAZ — "teknolojisiz proje" tam da
  // yakalanmak istenen ihlaldir (Founder · plan E1-A04 kabul: Teknoloji'siz projede uyarı).
  const TEKNOLOJI = new Set(["Teknoloji", "Takım"]);
  const PLAN = new Set(["Faz", "Blok", "Katman", "AltKatman", "Adım"]);
  let omurgaVar = false;
  let ilkPlan: { dosya: string; dugum: Dugum } | undefined;
  for (const [dosya, program] of programlar) {
    if (muaflar?.has(dosya)) continue;
    const gez = (d: Dugum): void => {
      if (d.tur === "çağır") omurgaVar = true;
      if (d.tur === "widget") {
        if (TEKNOLOJI.has(d.ad)) omurgaVar = true;
        if (!ilkPlan && PLAN.has(d.ad)) ilkPlan = { dosya, dugum: d };
      }
      for (const c of d.cocuklar) gez(c);
    };
    for (const b of program.bildirimler) gez(b);
  }
  if (omurgaVar || !ilkPlan) return [];
  return [{
    dosya: ilkPlan.dosya,
    tani: eskiTani("doğuş-sırası", "uyarı",
      { plan: ilkPlan.dugum.ad }, { satir: ilkPlan.dugum.satir, sutun: ilkPlan.dugum.sutun }),
  }];
}

// SABIT_TANI_KODLARI nöbeti için: "doğuş-sırası" kodu yukarıda kod: ile geçer.

/**
 * Olgunluk-onayı hatırlatıcısı (B2=A · YAS-4 · YAS-4.2 · 2026-07-14): EVRE-1→
 * EVRE-2 geçiş kapısı. Founder kararı: motor HATIRLATSIN, KESMESİN (insan yargısı
 * makineye devredilmez). PRECISE tetik — yalnız GEÇİŞ ANI: plan yapısal tam
 * (Blok var) + tüm Adımlar koni-dolu (olgun) + KOD HENÜZ BAŞLAMAMIŞ (geliştirmede/
 * tamamlandı Adım yok). O an "YAS-4.2 kabul kanıtını, yani insan onayını aldın mı?"
 * der. Kod başlayınca susar (geçiş geçti; açık-adım/durum devralır) — mature projeye
 * gürültü YOK. Düzey BİLGİ (kesmez); gerçek-dünya sınavında ölçülen çöküşün
 * (olgunlaşmamış plan üstüne kod) panzehiridir, olguyu görünür kılar.
 */
export function olgunlukOnayiTanilari(
  programlar: ReadonlyMap<string, Program>,
  muaflar?: ReadonlySet<string>,
): Array<{ dosya: string; tani: Tani }> {
  let adimTop = 0, kodlanan = 0, koniDolu = 0, blokVar = false;
  let ilk: { dosya: string; dugum: Dugum } | undefined;
  for (const [dosya, program] of programlar) {
    if (muaflar?.has(dosya)) continue;
    const gez = (d: Dugum): void => {
      if (d.tur === "widget") {
        if (d.ad === "Blok") blokVar = true;
        if (d.ad === "Adım") {
          adimTop++;
          const al = (a: string) => [...d.parametreler, ...d.ozellikler].find((x) => x.ad === a)?.deger?.metin;
          const durum = al("durum");
          if (durum === "geliştirmede" || durum === "tamamlandı") kodlanan++;
          if (al("görev") || al("kabul") || al("referans") || al("üretir")) koniDolu++;
          if (!ilk) ilk = { dosya, dugum: d };
        }
      }
      for (const c of d.cocuklar) gez(c);
    };
    for (const b of program.bildirimler) gez(b);
  }
  if (!blokVar || adimTop === 0 || !ilk) return [];   // plan iskeleti yok
  if (kodlanan > 0) return [];                          // kodlama başladı — geçiş anı geçti
  if (koniDolu < adimTop) return [];                    // plan henüz olgun değil (koni eksik)
  return [{
    dosya: ilk.dosya,
    tani: eskiTani("olgunluk-onayı", "bilgi",
      { adımSayısı: adimTop }, { satir: ilk.dugum.satir, sutun: ilk.dugum.sutun }),
  }];
}

// ═══════════════════════════════════════════════════════════════════════════
// EVRE-farkında severity (GBR-A01 · IDA dogfood #4-CLI · 2026-07-15)
//   Planlarken (EVRE-1) ilan-edilip-henüz-üretilmemiş yapı MEŞRUDUR (MIM-3); onu
//   17 sert HATA'yla bağırmak kurt-masalıdır (canlı panel zaten BİLGİ veriyordu —
//   CLI kapısı da evre-farkında olsun). Kod başlayınca / 'bitti' iddiasında (EVRE-2)
//   aynı olgu HATA olur (ilan↔disk mutabakatı ortadan KALKMAZ, yalnız planlama
//   penceresinde formatif kalır). Sinyaller: durum-makinesi (kod başladı) +
//   anadizin evre-beyanı (insan override). olgunlukOnayiTanilari ile aynı ölçüt.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * "Kod başladı mı?" — EVRE-2'nin DURUM-MAKİNESİ sinyali: herhangi bir Adım
 * durum∈{geliştirmede,tamamlandı} ise plan artık PLANLAMA penceresinde değildir
 * (kodlama ya da 'bitti' iddiası başlamıştır). olgunlukOnayiTanilari'nın kodlanan>0
 * ölçütüyle BİREBİR — tek gerçek, iki kullanım.
 */
export function kodBasladiMi(programlar: ReadonlyMap<string, Program>): boolean {
  for (const [, program] of programlar) {
    let bulundu = false;
    const gez = (d: Dugum): void => {
      if (bulundu) return;
      if (d.tur === "widget" && d.ad === "Adım") {
        const durum = [...d.parametreler, ...d.ozellikler].find((x) => x.ad === "durum")?.deger?.metin;
        if (durum === "geliştirmede" || durum === "tamamlandı") { bulundu = true; return; }
      }
      for (const c of d.cocuklar) gez(c);
    };
    for (const b of program.bildirimler) gez(b);
    if (bulundu) return true;
  }
  return false;
}

/**
 * Anadizin EVRE-BEYANI (insan override): kök widget (Proje/Uygulama/ÇalışmaAlanı)
 * `evre:` alanı taşıyorsa okur — '1'/'plan'/'planlama'/'tasarım' → EVRE-1 (true),
 * '2'/'kod'/'inşa'/'geliştirme'/'uygulama' → EVRE-2 (false). Tanınmayan/yok →
 * undefined (durum-makinesi sinyaline devreder). Şema bilinmeyen-alanı işaretlemez
 * (yalnız eksik-zorunlu denetler) — `evre:` sessiz opsiyonel beyandır.
 */
export function anadizinEvreBeyani(ana: Program): boolean | undefined {
  const kokTipleri = new Set(["Proje", "Uygulama", "ÇalışmaAlanı"]);
  const kok = ana.bildirimler.find((b) => b.tur === "widget" && kokTipleri.has(b.ad));
  if (!kok) return undefined;
  const ham = [...kok.parametreler, ...kok.ozellikler].find((p) => p.ad === "evre")?.deger?.metin;
  if (!ham) return undefined;
  const v = ham.toLocaleLowerCase("tr").trim();
  if (["1", "plan", "planlama", "tasarım", "tasarim"].includes(v)) return true;
  if (["2", "kod", "kodlama", "inşa", "insa", "geliştirme", "gelistirme", "uygulama", "yapım", "yapim"].includes(v)) return false;
  return undefined;
}

/**
 * Proje PLANLAMA penceresinde (EVRE-1) mi? → declared-but-not-built (kayıp-yapı·
 * harf-farkı) FORMATİF (bilgi) kalır; false → summatif (hata). Öncelik: anadizin
 * evre-beyanı (insan) > kod-başladı sinyali (durum-makinesi). Beyan yoksa: kod
 * başlamadıysa EVRE-1.
 */
export function planlamaEvresiMi(ana: Program, programlar: ReadonlyMap<string, Program>): boolean {
  const beyan = anadizinEvreBeyani(ana);
  if (beyan !== undefined) return beyan;
  return !kodBasladiMi(programlar);
}

/** EVRE-1'de FORMATİF'e (bilgi) inecek declared-but-not-built tanı kodları
 *  (proje-denetim canlı-yumuşatmasıyla aynı küme — tek gerçek). */
export const EVRE1_FORMATIF: ReadonlySet<string> = new Set(["kayıp-yapı", "harf-farkı"]);

/** EVRE-1 yumuşatması: FORMATİF kümedeki HATA'yı BİLGİ'ye indirir, üretim ipucu
 *  ekler. Küme dışı / hata-olmayan tanı DEĞİŞMEDEN döner (saf). */
export function evre1Yumusat(t: Tani): Tani {
  if (t.duzey !== "hata" || !EVRE1_FORMATIF.has(t.kod)) return t;
  return { ...t, duzey: "bilgi",
    oneri: (t.oneri ? t.oneri + " " : "") + ORTAK_TANI_METINLERI.planlamaEvresiEki({}) };
}

/**
 * kanıt-ekseni turu (B5) · ARTEFAKT-YEREL evre yumuşatması — proje-geneli tek bitin panzehiri.
 * kodBasladiMi olgun projede hep true olduğundan evre1Yumusat CLI yolunda ölü kalmıştı
 * (GBR-A01 düzeltmesi olgun projede hiç çalışmıyordu); artık evre, TANININ İŞARET
 * ETTİĞİ artefaktın kendi durumundan türer:
 *   • Adım DOSYASI eksik → kendi `durum:` beyanı karar verir: beklemede → formatif
 *     (bilgi); geliştirmede/tamamlandı → HATA ("bitti" iddiası diskle çelişiyor).
 *   • DİZİN eksik → alt-ağacındaki Adım beyanlarına bakılır: Adım VAR ve hiçbiri
 *     başlamamış → yeni ilan, formatif; herhangi biri başlamış → HATA.
 *   • Alt-ağacında HİÇ Adım beyanı olmayan dizin (olgun Kitaplık/Raf) DOKUNULMAZ —
 *     silinmiş olgun yapının HATA'sı yumuşatılmaz (sessiz gevşeme yasağı; kabul
 *     ölçütü "düşen tanı sayılır" bu muhafazakâr sınırın gerekçesidir).
 * Tanı → öğe eşlemesi ilan konumundan (satir:sutun) yapılır; eşlenemeyen tanı
 * DEĞİŞMEDEN döner (fail-closed). Saf.
 */
export function yerelEvre1Yumusat(tanilar: Tani[], plan: IskeletPlan): Tani[] {
  const basladi = (d?: string): boolean => d === "geliştirmede" || d === "tamamlandı";
  const adimlar = plan.ogeler.filter((o) => o.tur === "dosya" && o.durum !== undefined);
  const konumdanOge = new Map(plan.ogeler.map((o) => [`${o.satir ?? -1}:${o.sutun ?? -1}`, o]));
  return tanilar.map((t) => {
    if (t.duzey !== "hata" || !EVRE1_FORMATIF.has(t.kod)) return t;
    const o = konumdanOge.get(`${t.satir}:${t.sutun}`);
    if (!o) return t;
    if (o.tur === "dosya") return o.durum !== undefined && !basladi(o.durum) ? evre1Yumusat(t) : t;
    const kok = o.yol.toLowerCase() + "/";
    const altAdimlar = adimlar.filter((a) => a.yol.toLowerCase().startsWith(kok));
    return altAdimlar.length > 0 && !altAdimlar.some((a) => basladi(a.durum)) ? evre1Yumusat(t) : t;
  });
}

export function anadizinBul(dizin: string): string | undefined {
  try {
    const adaylar = readdirSync(dizin).filter((a) => a.endsWith("_anadizin.sar")).sort();
    if (adaylar.length) return join(dizin, adaylar[0]);
  } catch { /* dizin okunamadı — eski ada düş */ }
  const eski = join(dizin, "ana.sar");
  return existsSync(eski) ? eski : undefined;
}

/** DIL-1.2 ②: ad-ayracı önerisi — `.sar` dosya adında tire yerine ALT-ÇİZGİ kanoniktir.
 *  Bilgi düzeyi (zorlamaz — kademeli göç); ornek/ vitrini de dahil (öğretim malzemesi
 *  standardı gösterir). Saf. */
export function adAyraciTanilari(programlar: ReadonlyMap<string, Program>): Array<{ dosya: string; tani: Tani }> {
  const out: Array<{ dosya: string; tani: Tani }> = [];
  for (const etiket of programlar.keys()) {
    const ad = etiket.split("/").pop() ?? etiket;
    if (!ad.includes("-")) continue;
    out.push({ dosya: etiket, tani: eskiTani("ad-ayracı", "bilgi",
      { ad, onerilen: ad.replace(/-/g, "_") }, { satir: 0, sutun: 0 }) });
  }
  return out;
}

// ═══════════════════════════════════════════════════════════════════════════
// Faz D1 — KOD indeksi + kırık-referans (çok-dosya DAR kapsam · PLN-1)
//   Projedeki tüm .sar programları verilir; KOD tanımları tek indekste toplanır.
//   Çağrılan dosyanın KENDİ drift'i v1 dışı — yalnız KOD'ları indekse katılır.
// ═══════════════════════════════════════════════════════════════════════════

export interface KodTanim {
  /** tanımlayan dosya (köke göreli). */
  dosya: string;
  /** tanımlayan widget'ın tipi (Blok · Karar · …). */
  tip: string;
  satir: number;
  sutun: number;
}

/** KOD → tanım yeri. */
export type KodIndeks = Map<string, KodTanim>;

/** Projedeki tüm programlardan KOD indeksini çıkarır (saf). */
export function kodIndeksle(programlar: ReadonlyMap<string, Program>): KodIndeks {
  const indeks: KodIndeks = new Map();
  for (const [dosya, program] of programlar) {
    const gez = (node: Dugum): void => {
      // kanıt-ekseni turu (bonus): ÖZELLİK bloğu da gezilir — kimlik.ts:144 (gezgin) ikisine de
      // bakıyordu, denetçi yalnız `parametreler`e; özellikte beyan edilmiş `kod:`
      // denetçi için GÖRÜNMEZDİ → ona yapılan her atıf sahte "kırık-referans"tı.
      const kod = [...node.parametreler, ...node.ozellikler].find((p) => p.ad === "kod");
      if (kod && (kod.deger.tur === "kod" || kod.deger.tur === "metin") && kod.deger.metin) {
        // ilk tanım kazanır — yinelenen tanım ayrı drift türü (v2)
        if (!indeks.has(kod.deger.metin)) {
          indeks.set(kod.deger.metin, { dosya, tip: node.ad, satir: node.satir, sutun: node.sutun });
        }
      }
      // Kural/Tip tanımları ADLARIYLA da çağrılır (`uygular: şüphedeDur`) —
      // ad indekse girer ki adres çözülsün (DIL-3/TIP-1).
      if ((node.tur === "kuralTanım" || node.tur === "tipTanım") && !indeks.has(node.ad)) {
        indeks.set(node.ad, { dosya, tip: node.tur, satir: node.satir, sutun: node.sutun });
      }
      for (const c of node.cocuklar) gez(c);
      icin(node, (d) => { if (d.tur === "widget" && d.dugum) gez(d.dugum); });
    };
    for (const b of program.bildirimler) gez(b);
  }
  return indeks;
}

/** Bir düğümün tüm parametre değerlerini (liste/harita içi dahil) dolaşır. */
function icin(node: Dugum, f: (d: Deger) => void): void {
  const dolas = (d: Deger): void => {
    f(d);
    for (const o of d.ogeler ?? []) dolas(o);
    for (const c of d.ciftler ?? []) dolas(c.deger);
  };
  for (const p of [...node.parametreler, ...node.ozellikler]) dolas(p.deger);
}

/** KARARLAR defter-kaydı deseni (K-nn) — tek-dosya-çok-kayıt defterin bilinçli
 *  istisnası: .sar düğümü değildir, atıf bilgi düzeyinde görünür (A02).
 *
 *  ⚠️ GÖZDEN GEÇİRİLDİ (kanıt-ekseni turu · 2026-07-17): GEREKÇESİ BAYAT, dalı YAŞIYOR.
 *  DIL-5 göçünden sonra K-nn ARTIK GERÇEK `.sar` düğümü (ölçüm: 98 K-nn kodIndeks'te
 *  tanımlı) → çözülen atıf zaten yukarıdaki `indeks.has` ile döner; bu dal CANLI
 *  denetimde 0 kez ateşlenir (Sol'ün B9 gözlemi doğrulandı). Ateşlediği tek hâl:
 *  TANIMSIZ bir K-nn'e kenar atfı — ve orada artık YANLIŞ şey yapıyor: gerçek bir
 *  kopukluğu ("hiç doğmamış bir karara bağımlıyım") 'bilgi'ye indiriyor, MASKELİYOR.
 *  Doğrusu `kırık-referans`/hata olurdu.
 *
 *  DEĞİŞTİRİLMEDİ — bilinçli: (a) davranışı kilitleyen canlı test var
 *  (denetci.test.ts:545 "K-nn defter atfı BİLGİ düşer"); (b) bilgi→hata terfisi
 *  düzey değişikliğidir, kanıt-ekseni turu'nin dilimi değil (STR-2.1) ve STR-4 kademesi ister.
 *  Founder kapısı: dal kaldırılsın mı (K-nn artık düğüm → normal kırık-referans),
 *  yoksa ileri-bağlama istisnası olarak mı kalsın (`hatırlat` deseni gibi UYARI)? */
const DEFTER_KODU = /^K-\d{1,3}$/;

/**
 * Bir dosyanın çözülmeyen referanslarını bulur (saf).
 *
 *   • `çağır KOD`       → indekste yoksa hata.
 *   • kenar hedefi (KOD) → indekste yoksa hata — İSTİSNALAR:
 *       `üretir` meyvesi çoğu zaman ilan edilmez (henüz üretilmemiştir) → uyarı;
 *       `ekKodlar` (.md frontmatter kimlikleri — FEL-n gibi artefakt kodları) → çözülür;
 *       KARARLAR defter kaydı (K-nn) → sessizce meşru sayılır (göç motor turu A10 kapanışı:
 *       `defter-referansı` bilgi tanısı emekli edildi; atıf artık tanı doğurmaz).
 */
export function referansTanilari(program: Program, indeks: KodIndeks, snf: Siniflama, ekKodlar?: ReadonlySet<string>): Tani[] {
  const tanilar: Tani[] = [];
  const kenarlar = new Set(snf.kenarTipleri.map((k) => k.ad));

  const hedefDenetle = (kenar: string, d: Deger): void => {
    if (d.tur === "liste") { for (const o of d.ogeler ?? []) hedefDenetle(kenar, o); return; }
    // A06 (bug-avı B6): kenar KOD ister — dizgi içine tırnakla yazılmış Adım-kodu hedefi çözüm denetimine
    // hiç girmiyordu ve varlık-bekçilerini (kavuşumsuz-ekran) çöp değerle doyuruyordu.
    // bağımlı/besler MUAF: ORK-1.2 kenar-metin HATASI tek yetkili (çift tanı basılmaz).
    if (d.tur === "metin" && d.metin && kenar !== "bağımlı" && kenar !== "besler") {
      // davranış-katmanı turu (OGR-2.2): tanı öğretir — yapıştır-düzelt örneği + beceri işaretçisi
      // (2026-07-17 gecesinin dersi: örneksiz tanı ajanı grep arkeolojisine mahkûm eder).
      tanilar.push(eskiTani("kenar-metin", "uyarı",
        {
          kenar, metin: d.metin.slice(0, 60), kusur: "tırnaklı-hedef",
          onerilenHedef: /^[A-ZÇĞİÖŞÜ0-9_-]+$/u.test(d.metin) ? d.metin : "KOD",
        },
        { satir: d.satir, sutun: d.sutun }));
      return;
    }
    if (d.tur !== "kod" || !d.metin || indeks.has(d.metin)) return;
    if (ekKodlar?.has(d.metin)) return;   // .md artefakt kimliği — kod evreni .sar+md (A02)
    // RF-T6-A02 + Sol gözlemi ⑤: `dayanak` hedefi bir Karar DÜĞÜMÜ olmak zorundadır —
    // K-nn biçimli eksik hedef defter-istisnasıyla bilgiye İNEMEZ (kırık-referans kalır);
    // aksi hâlde var olmayan sayısal bir koda bağlanan kural sessizce yeşil görünürdü.
    // göç motor turu A10 kapanışı (2026-07-27): `defter-referansı` emekli edildi. Eski karar
    // defteri istisnası yalnız geçici göç haritasında yaşar (STR-1.2); atıf
    // burada sessizce meşru sayılır ve ayrı bir bilgi tanısı basılmaz.
    // Ölçüm: canlı bahçede sıfır bulgu üretiyordu.
    if (DEFTER_KODU.test(d.metin) && kenar !== "dayanak") return;
    // İleri-bağlama kenarları: `üretir` meyvesi henüz üretilmemiş, `hatırlat`
    // hedefi henüz doğmamış olabilir (F-8 doğası) → hata değil UYARI.
    const meyve = kenar === "üretir";
    const ileriBaglama = kenar === "hatırlat";
    tanilar.push(eskiTani("kırık-referans", meyve || ileriBaglama ? "uyarı" : "hata",
      { kenar, hedef: d.metin, kusur: meyve ? "meyve" : ileriBaglama ? "ileri-bağlama" : "kenar" },
      { satir: d.satir, sutun: d.sutun }));
  };

  const gez = (node: Dugum): void => {
    if (node.tur === "çağır") {
      if (!indeks.has(node.ad)) {
        tanilar.push(eskiTani("kırık-referans", "hata",
          { hedef: node.ad, kusur: "çağır" }, { satir: node.satir, sutun: node.sutun }));
      }
      return;
    }
    // Kenar hedefleri yalnız WIDGET örneklerinde KOD'dur; tip/kural TANIMINDA
    // (DIL-3/TIP-1) aynı adlar tip-yapılandırmasıdır (örn. içerir: [Metin, Düğme]).
    // Özellikler de dahil: `--> KOD` akış şekeri (DIL-1.4) gövdeye besler yazar.
    if (node.tur === "widget") {
      for (const p of [...node.parametreler, ...node.ozellikler]) {
        if (kenarlar.has(p.ad)) hedefDenetle(p.ad, p.deger);
      }
    }
    for (const c of node.cocuklar) gez(c);
    icin(node, (d) => { if (d.tur === "widget" && d.dugum) gez(d.dugum); });
  };

  for (const b of program.bildirimler) gez(b);
  return tanilar;
}

// ═══════════════════════════════════════════════════════════════════════════
// METİN ATIFLARI — denetçinin .md/.ts körlüğü (kanıt-ekseni turu · B9)
//
//   Gezgin (kimlik.ts) atıfları ÜÇ uzantıda görür (YUZ-3.2 ④, Founder onaylı:
//   "atıf katmanı .sar + .md + .ts tarar"); denetçi yalnız .sar yükler
//   (programlariYukle). Eski atıf kararı denetçiyi HİÇ KONU ETMEMİŞTİ → miras
//   kaynaklı kör nokta: KARARLAR/CHANGELOG/rapor ve kod yorumlarındaki
//   KARŞILIKSIZ kod atıfları sonsuza dek sessiz. Bu kapı gezginin GÖZÜNÜ ödünç
//   alır; indeksler AYRI kalır (tek-indeks birleştirmesi ayrı ve daha büyük
//   dilim · STR-2.1).
//
//   ⚠️ İKİ BEYANLI DARALMA (KRR-MUT-2: daralma beyansız kalamaz — bu kapının
//   kendi kınadığı günah). Ham evren 3549 aday; süzgeçsiz YÜZLERCE sahte
//   kırık-referans çıkar ve kapı doğar doğmaz kapatılır:
//
//     ① AİLE ÖN-EKİ — aday, .sar tanımlarından TÜRETİLEN gerçek bir aileye
//       (ADM- · BKM- · MIM- · EKR- · STR- …) ait değilse kod-denemesi SAYILMAZ.
//       Eler: UTF-8 · A-Z · 4-CLI · TypeScript tip adları. (Aile kümesi YALNIZ
//       .sar tanımlarından türer — .md kimlikleri aile DOĞURMAZ, yalnız çözer.)
//     ② KOD ŞEKLİ — gerçek kimlik numaralı bir parçayla biter (MIM-1.4 · doğuş-rehberi turu
//       · BKM-BUG-A02). Rakamsız kuyruk BÜYÜK-HARF düz yazıdır (TEK-ANLAMLI ·
//       KOD-TABANLI) ya da yer-tutucudur (ADM-X · BLK-X · KRL-X). BEDELİ AÇIK:
//       tanımlı kodların %53'ü rakamsızdır (CKR-SOL-TEFTIS · DRS-REGEX-TURKCE);
//       onlara yapılan kırık atıf bu v1'de GÖRÜNMEZ. Kasıtlı: STR-4 kademe —
//       önce yüksek kesinlikli dar kapı, gürültü ölçülüp temizlenince genişler.
//
//   Kapsam-dışı: `*.test.ts` — inline fikstürlerin uydurma kodları kasıtlı
//   sentetik malzemedir; INDEKS_DISI'nın `fikstur/` gerekçesinin aynısı. Süzgeç
//   DENETİM yüzüne özeldir: gezgin (F12) test dosyalarını görmeye devam eder.
//
//   Düzey (STR-4 kademe · acceptance #3): .md → BİLGİ (prose'da bayat atıf meşru:
//   CHANGELOG/karar tarihçesi geçmişi anlatır) · .ts → UYARI (kaynak yorumundaki
//   çözülmeyen kod atfı daha güçlü drift kokusudur). HATA hiçbir hâlde DEĞİL.
// ═══════════════════════════════════════════════════════════════════════════

/** Metin-atıf denetiminin dosya evreni: .md + .ts, sentetik fikstürler hariç. */
const METIN_ATIF_DOSYASI = (dosya: string): boolean =>
  (dosya.endsWith(".md") || dosya.endsWith(".ts")) && !dosya.endsWith(".test.ts");

/** Kimlik şekli: en az bir parçası rakam taşıyan bir kuyrukla biter (daralma ②). */
const KOD_SEKLI = /-[A-ZÇĞİÖŞÜ_]*\d[A-Z0-9ÇĞİÖŞÜ_]*$/u;

/** Bir kodun ailesi — ilk tire'ye kadarki ön-ek ("doğuş-rehberi turu" → "ADM"). */
function kodAilesi(kod: string): string {
  const i = kod.indexOf("-");
  return i > 0 ? kod.slice(0, i) : "";
}

/**
 * .md/.ts düz metnindeki KARŞILIKSIZ kod atıflarını bulur (SAF — diske dokunmaz;
 * gezgin indeksi ile denetçi KOD indeksi dışarıdan verilir).
 *
 * NOT (imza): Adım koni'si `Tani[]` diyordu; `Tani`'de dosya alanı YOK ve bu kapı
 * çok-dosyalıdır → repo'nun yerleşik çok-dosya deseni (`adAyraciTanilari` ·
 * `ebediTanilar` · `muhurTanilari`) izlendi: `{ dosya, tani }`.
 *
 * @param ekKodlar .md frontmatter kimlikleri (FEL-n gibi artefakt kodları) —
 *   `referansTanilari` ile AYNI kod evreni; çözer ama aile DOĞURMAZ.
 */
export function metinAtifTanilari(
  indeks: KimlikIndeksi,
  kodIndeks: KodIndeks,
  ekKodlar?: ReadonlySet<string>,
): Array<{ dosya: string; tani: Tani }> {
  // ① Aile kümesi YALNIZ .sar tanımlarından türer (Adım'ın kalbi).
  const aileler = new Set<string>();
  for (const kod of kodIndeks.keys()) {
    const aile = kodAilesi(kod);
    if (aile) aileler.add(aile);
  }

  const out: Array<{ dosya: string; tani: Tani }> = [];
  for (const a of indeks.tumAdaylar(METIN_ATIF_DOSYASI)) {
    if (kodIndeks.has(a.kod) || ekKodlar?.has(a.kod)) continue;   // çözülüyor — atıf sağlam
    if (!aileler.has(kodAilesi(a.kod))) continue;                 // ① aile ön-eki
    if (!KOD_SEKLI.test(a.kod)) continue;                         // ② kod şekli
    const md = a.dosya.endsWith(".md");
    out.push({ dosya: a.dosya, tani: eskiTani("karşılıksız-metin-atfı", md ? "bilgi" : "uyarı",
      { kod: a.kod, belgede: md }, { satir: a.satir, sutun: a.sutun }) });
  }
  return out;
}

// ═══════════════════════════════════════════════════════════════════════════
// Halef-hedef doğruluğu (BKM-KRR-B02 · çelişki-kapısı · Founder 2026-07-16)
//   `halefsiz-revize` (dogrulayici) revize kararın halef ALANININ varlığını
//   uyarır; bu kapı halef HEDEFİNİN geçerliliğini doğrular — dangling atıf
//   (MIM-1 vakası) + döngü artık sessiz geçemez. Cross-file: tüm Karar KOD'ları
//   görünür olmalı, o yüzden proje-düzeyi ({dosya, tani}, `raporla` uyumlu).
// ═══════════════════════════════════════════════════════════════════════════

/** Revize kararların `halef:` hedefini doğrular (saf, proje-düzeyi).
 *    • halef → tanımsız Karar KOD'u        → kırık-halef (HATA · dangling)
 *    • halef zinciri döngü (A→B→A)          → halef-döngü (HATA · hüküm belirsiz)
 *  Zincir yürürlükteki (revize-olmayan) bir kararda sessizce biter. */
export function halefTanilari(programlar: ReadonlyMap<string, Program>): Array<{ dosya: string; tani: Tani }> {
  interface KararBilgi { dosya: string; durum?: string; halef?: string; satir: number; sutun: number }
  const kararlar = new Map<string, KararBilgi>();
  for (const [dosya, program] of programlar) {
    const gez = (n: Dugum): void => {
      if (n.tur === "widget" && n.ad === "Karar") {
        const al = (ad: string): string | undefined => n.parametreler.find((p) => p.ad === ad)?.deger.metin;
        const kod = al("kod");
        // ilk tanım kazanır (yinelenen-kod ayrı kapı) — kararlaşmış tek gerçek.
        if (kod && !kararlar.has(kod)) {
          kararlar.set(kod, { dosya, durum: al("durum"), halef: al("halef"), satir: n.satir, sutun: n.sutun });
        }
      }
      for (const c of n.cocuklar) gez(c);
    };
    for (const b of program.bildirimler) gez(b);
  }

  const out: Array<{ dosya: string; tani: Tani }> = [];
  for (const [kod, bilgi] of kararlar) {
    if (bilgi.durum !== "revize" || !bilgi.halef) continue;   // yalnız halefli revize
    // ① Hedef varlığı — dangling atıf (MIM-1 vakası)
    if (!kararlar.has(bilgi.halef)) {
      out.push({ dosya: bilgi.dosya, tani: eskiTani("kırık-halef", "hata",
        { kod, halef: bilgi.halef }, { satir: bilgi.satir, sutun: bilgi.sutun }) });
      continue;
    }
    // ② Döngü — halef zincirini yürü; ziyaret edileni işaretle
    const gorulen = new Set<string>([kod]);
    let mevcut = bilgi.halef;
    while (true) {
      if (gorulen.has(mevcut)) {
        out.push({ dosya: bilgi.dosya, tani: eskiTani("halef-döngü", "hata",
          { kod, zincir: [...gorulen, mevcut] }, { satir: bilgi.satir, sutun: bilgi.sutun }) });
        break;
      }
      gorulen.add(mevcut);
      const hedef = kararlar.get(mevcut);
      if (!hedef || hedef.durum !== "revize" || !hedef.halef) break;   // zincir bitti
      mevcut = hedef.halef;
    }
  }
  return out;
}

// ── Program yükleme (etkili) ─────────────────────────────────────────────────
// denetleKomutu ile sef (programHaritasi) TEK yükleyiciyi paylaşır (Ö.1 DRY).

/** bilerek-hatalı muafiyet pragması (Founder hükmü, mutabakat 2026-07-06): ilk 5
 *  satırda taşıyan dosya kapıda ATLANIR ama LİSTELENİR (muafiyet görünür, sessiz
 *  değil). \b DEĞİL (?=\s|$): Türkçe 'ı' ASCII kelime-sınırında görünmez (DRS-REGEX-TURKCE). */
export const BILEREK_HATALI = /^\s*\/\/\s*sarmal:\s*bilerek-hatalı(?=\s|$)/;

export interface ProgramYuk {
  programlar: Map<string, Program>;
  /** bilerek-hatalı pragmalı dosyalar (parse edildi ama tanıları atlanmalı). */
  muaflar: Set<string>;
  /** muaf-OLMAYAN sözdizim hataları (atma yok — çağıran karar verir: dur / atla). */
  hatalar: Array<{ etiket: string; satir: number; sutun: number; mesaj: string }>;
}

/**
 * Bir dizindeki tüm .sar'ları yükler (etkili). `anaYolu` verilirse "ana.sar"
 * etiketiyle o DIŞ yol yüklenir ve dizindeki "ana.sar" tekrar yüklenmez.
 *
 * Muaf dosya (bilerek-hatalı) PARSE edilir ama `muaflar`'a işaretlenir: KOD'ları
 * indekste, EBEDİ kuralları mühür envanterinde kalır (atlamak = mühürden düşürmek
 * olurdu). Muaf-OLMAYAN sözdizim hatası `hatalar`'a toplanır, o dosya `programlar`'a
 * girmez; muaf dosyanın sözdizim hatası sessiz atlanır (bilerek-hatalı meşru).
 */
export function programlariYukle(dizin: string, anaYolu?: string): ProgramYuk {
  const disk = diskTara(dizin);
  const sarlar: Array<[string, string]> = anaYolu ? [["ana.sar", anaYolu]] : [];
  for (const g of disk.girdiler) {
    if (g.tur !== "dosya" || !g.yol.endsWith(".sar")) continue;
    // dış spec verildiyse dizinin KENDİ giriş dosyası (anadizin/ana.sar) tekrar yüklenmez
    if (anaYolu && !g.yol.includes("/") && (g.yol === "ana.sar" || g.yol.endsWith("_anadizin.sar"))) continue;
    sarlar.push([g.yol, join(dizin, g.yol)]);
  }

  const programlar = new Map<string, Program>();
  const muaflar = new Set<string>();
  const hatalar: ProgramYuk["hatalar"] = [];
  for (const [etiket, tamYol] of sarlar) {
    const kaynak = readFileSync(tamYol, "utf8");
    if (kaynak.split("\n", 5).some((s) => BILEREK_HATALI.test(s))) muaflar.add(etiket);
    try {
      programlar.set(etiket, ayristir(belirtecle(kaynak)));
    } catch (e) {
      if (e instanceof SozDizimHatasi) {
        if (!muaflar.has(etiket)) hatalar.push({ etiket, satir: e.satir, sutun: e.sutun, mesaj: e.message });
        continue;   // muaf: bilerek-hatalı söz-dizimi de olabilir — sessiz geç
      }
      throw e;
    }
  }
  mevsimNormalize(programlar);
  return { programlar, muaflar, hatalar };
}

/**
 * Mevsim çevrimi (MIM-1.2 ③ · zaman-ekseni turu — TEK çevrim noktası; aynı olgu iki yerde
 * hesaplanmaz): Blok'un
 * `mevsim: FAZ-X` kenarı, hedef Faz düğümüne SANAL bir `çağır BLK-…` çocuğu
 * olarak normalize edilir. Yolharitası çağır-çevrimi, karne kabarcıklanması ve
 * fazsız-blok denetimi HİÇ DEĞİŞMEDEN iki yazımı da kapsar — çift mantık yok.
 *
 * Sanal çocuk `sanal` parametresiyle imzalıdır: ayrıştırıcı `çağır`a yalnız
 * mühür pini üretir, başka parametre üretemez — dolayısıyla `sanal` imzası
 * YALNIZ bu çevrimden doğabilir; çift-mevsim-kaydı nöbeti gerçek/sanal kenarı
 * bu imzayla ayırır. Faz aynı Blok'u GERÇEK `çağır` ile zaten taşıyorsa sanal
 * eklenmez (çift kenar üretilmez; uyarıyı hiyerarsiTanilari basar). Hedef Faz
 * bulunamazsa çevrim uygulanmaz — Blok mevsimsiz kalır, fazsız-blok dürüstçe
 * ateşlenir (sessiz başarı taklidi yok).
 */
export function mevsimNormalize(programlar: ReadonlyMap<string, Program>): void {
  const kodOku = (n: Dugum): string | undefined =>
    (n.parametreler.find((x) => x.ad === "kod") ?? n.ozellikler.find((x) => x.ad === "kod"))?.deger.metin;

  // 1) Faz düğümleri (kod → düğüm) + her Faz'ın halihazır çağır kümesi
  const fazlar = new Map<string, Dugum>();
  const fazinCagirdiklari = new Map<Dugum, Set<string>>();
  const fazTara = (n: Dugum): void => {
    if (n.tur === "widget" && n.ad === "Faz") {
      const kod = kodOku(n);
      if (kod && !fazlar.has(kod)) fazlar.set(kod, n);
      // Eski SANAL kenarlar önce temizlenir: uzun-ömürlü AST önbelleklerinde (eklenti
      // paylaşımlı önbelleği) çevrim aynı düğüme tekrar koşar — sanal kenar her koşuda
      // güncel gerçeğin türevi olarak yeniden kurulur, bayat kenar kalamaz (idempotent).
      n.cocuklar = n.cocuklar.filter((c) => !(c.tur === "çağır" && c.parametreler.some((x) => x.ad === "sanal")));
      fazinCagirdiklari.set(n, new Set(n.cocuklar.filter((c) => c.tur === "çağır").map((c) => c.ad)));
    }
    for (const c of n.cocuklar) fazTara(c);
  };
  for (const p of programlar.values()) for (const b of p.bildirimler) fazTara(b);

  // 2) mevsim: taşıyan Blok'lar → hedef Faz'a sanal çağır
  const blokTara = (n: Dugum): void => {
    if (n.tur === "widget" && n.ad === "Blok") {
      const mevsim = [...n.parametreler, ...n.ozellikler].find((x) => x.ad === "mevsim")?.deger.metin;
      const kod = kodOku(n);
      if (mevsim && kod) {
        const faz = fazlar.get(mevsim);
        const mevcutlar = faz ? fazinCagirdiklari.get(faz) : undefined;
        if (faz && mevcutlar && !mevcutlar.has(kod)) {
          faz.cocuklar.push({
            tur: "çağır", ad: kod,
            parametreler: [{ ad: "sanal", deger: { tur: "metin", metin: "mevsim", satir: n.satir, sutun: n.sutun }, satir: n.satir, sutun: n.sutun }],
            ozellikler: [], cocuklar: [], satir: n.satir, sutun: n.sutun,
          });
          mevcutlar.add(kod);
        }
      }
    }
    for (const c of n.cocuklar) blokTara(c);
  };
  for (const p of programlar.values()) for (const b of p.bildirimler) blokTara(b);
}

/** Yol etiketini POSIX ayraçlı hâle getirir (mutlak fsPath da göreli etiket de aynı dili konuşsun). */
const yolNormal = (etiket: string): string => etiket.replace(/\\/g, "/");

/** Yolun bir parçası verilen ad mı — 'ornek' klasörü mutlak yolda da tanınır. */
function yolParcasiVar(etiket: string, ad: string): boolean {
  return yolNormal(etiket).split("/").includes(ad);
}

/**
 * MIM-3: bir VARLIĞIN girişi `<varlık>_anadizin.sar` dosyasıdır (eski `ana.sar`
 * adı da tanınır) ve o dosyanın bulunduğu dizin varlığın SINIRIDIR.
 */
const GIRIS_DOSYASI = /(?:^|\/)(?:[^/]*_anadizin\.sar|ana\.sar)$/;

/**
 * Her dosyayı kendisini kapsayan EN YAKIN varlık köküne bağlar (saf — diske
 * dokunmaz, yalnız verilen etiket kümesini okur). Hiçbir kökün altına düşmeyen
 * dosyalar ortak boş kökte toplanır; böylece giriş dosyası bulunmayan bir
 * taramada bugünkü davranış aynen korunur.
 *
 * GEREKÇE (Founder canlı bulgusu 2026-07-28): kimlik tekilliği TARAMA KAPSAMINA
 * göre ölçülüyordu. İki bağımsız varlık aynı çalışma alanında yan yana durunca
 * motor onları tek isim uzayı sayıyor, her ikisinin de kendi `plan/` rafını
 * ilan etmesi gibi tamamen meşru bir yapıyı çakışma diye bildiriyordu. Kimlik
 * bir varlığın içinde tekildir; iki ayrı varlığın aynı adı taşıması çakışma
 * değildir, çünkü ikisi birbirinin isim uzayına hiç girmez.
 */
export function varlikSinirlari(etiketler: Iterable<string>): Map<string, string> {
  const liste = [...etiketler];
  const kokler: string[] = [];
  for (const etiket of liste) {
    const yol = yolNormal(etiket);
    if (!GIRIS_DOSYASI.test(yol)) continue;
    const kesim = yol.lastIndexOf("/");
    kokler.push(kesim < 0 ? "" : yol.slice(0, kesim));
  }
  // En UZUN kök önce denenir: iç içe varlıklarda dosya en yakın sınıra düşer.
  kokler.sort((a, b) => b.length - a.length);
  const sinir = new Map<string, string>();
  for (const etiket of liste) {
    const yol = yolNormal(etiket);
    sinir.set(etiket, kokler.find((k) => k === "" || yol.startsWith(k + "/")) ?? "");
  }
  return sinir;
}

/**
 * Yinelenen KOD tespiti (KRR-MUT B3 · "ilk tanım kazanır" sessizliği bitti).
 * ornek/ mini-evrenleri kendi kopyalarını taşıyabilir (ayrı vitrin ağaçları) —
 * uyarı yalnız OMURGA (ornek/ dışı) dosyaları çakışırsa. `raporla` için {dosya, tani}.
 *
 * TEKİLLİK VARLIK SINIRINDA ÖLÇÜLÜR. Aynı kodu iki ayrı varlık ilan ettiyse
 * uyarı ÜRETİLMEZ; çakışma yalnız tek bir varlığın içinde anlamlıdır.
 */
export function yinelenenKodTanilari(programlar: ReadonlyMap<string, Program>): Array<{ dosya: string; tani: Tani }> {
  const omurgaMi = (e: string): boolean => !yolParcasiVar(e, "ornek");
  const sinir = varlikSinirlari(programlar.keys());
  /** Anahtar: varlık sınırı + KOD — iki varlığın aynı kodu iki ayrı kovaya düşer. */
  const kodSahipleri = new Map<string, { kod: string; sahipler: string[] }>();
  for (const [etiket, p] of programlar) {
    const varlik = sinir.get(etiket) ?? "";
    const gezKod = (n: Dugum): void => {
      const kp = n.parametreler.find((x) => x.ad === "kod");
      if (kp?.deger.metin) {
        const anahtar = `${varlik}\u0000${kp.deger.metin}`;
        const kova = kodSahipleri.get(anahtar) ?? { kod: kp.deger.metin, sahipler: [] };
        kova.sahipler.push(etiket);
        kodSahipleri.set(anahtar, kova);
      }
      for (const c of n.cocuklar) gezKod(c);
      // A09/B8 (bug-avı): parametre-değeri içindeki widget'ların (yasa: Yasa(kod: X))
      // kod'ları da sayılır — kodIndeksle ile tutarlı (çift tanım orada da sessiz kalamaz).
      icin(n, (d) => { if (d.tur === "widget" && d.dugum) gezKod(d.dugum); });
    };
    for (const bl of p.bildirimler) gezKod(bl);
  }
  const out: Array<{ dosya: string; tani: Tani }> = [];
  for (const { kod, sahipler } of kodSahipleri.values()) {
    const omurga = sahipler.filter(omurgaMi);
    if (omurga.length > 1) {
      const dosyalar = [...new Set(omurga)];
      out.push({
        dosya: dosyalar[0],
        tani: eskiTani("yinelenen-kod", "uyarı",
          { kod, sayı: omurga.length, dosyalar }, { satir: 0, sutun: 0 }),
      });
    }
  }
  return out;
}

/**
 * Bağımlılık-mekanik kapısı (ORK-1.2 · Founder hükmü 2026-07-10): bağımlılıkta NİYET
 * ifade edilmez — mekanik olgudur, bir kez, KOD'la beyan edilir: `bağımlı: [KOD]`.
 * Motor yalnız `bağımlı`/`besler` kenarlarını DAG'da takip eder. Beş zorlanış:
 *   ① `bağımlı`/`besler` metin değerle → kenar KOD ister (kenar-metin).
 *   ② `bağımlılık: [KOD, ...]`         → kenarın adı `bağımlı` (yanlış-alan).
 *   ③ `bağımlılık: "…KOD…"`            → çözülür KOD prose'da gizli (gizli-bağımlılık).
 *   ④ `bağımlılık: "salt anlatı"`      → alan TÜMDEN yasak: "bağımlı olduğun düğümün
 *       KOD'u ne?" — anlatı sınır/görev'e (bağımlılık-mekanik).
 *   ⑤ Blok/Faz/Katman'da kenar beyanı → kenar YALNIZ Adım'da; kapsayıcı sırası
 *       çocuklardan TÜRETİLİR (kapsayıcı-kenar). [Takım vb. teknoloji-ailesi serbest.
 *       MIM-1.4 muafiyeti: Katman'ın bağımlı'sı YALNIZ Takım/Teknoloji hedefliyse
 *       eksen bağıdır — katmansız-teknoloji bekçisinin beklediği beyan, hata değil.]
 * "RAY-3" gibi düğüm-olmayan kısaltmalar ③'ü tetiklemez (indeks süzer). Muaf dosyalar
 * atlanır. Saf.
 */
// ── ORK-3.3 · DÖNGÜ tanıları (döngü-rayı turu) ───────────────────────────────────
// durunca v1 KOŞUL SÖZLÜĞÜ — koşucunun anladığı kalıplar (makro-dongu.ts ile
// birebir; DIL-1.3 tam ifade değerlendirmesi ayrı tur — dürüst dar başlangıç):
//   karne.hata == 0 · karne.uyari <= N · durum(KOD) == tamamlandı|geliştirmede|beklemede
export const DURUNCA_KALIPLARI: ReadonlyArray<RegExp> = [
  /^karne\.(hata|uyari|uyarı)\s*(==|<=|<)\s*\d+$/u,
  /^durum\(\s*[A-ZÇĞİÖŞÜ0-9_-]+\s*\)\s*==\s*(tamamlandı|geliştirmede|beklemede)$/u,
];

/** Döngü sağlığı (ORK-3.3): ① kırık-koşar — koşar hedefi hiçbir yerde ilan edilmemişse
 *  döngü KOŞULAMAZ, daha yazılırken söylenir (uyarı); ② durunca-sözlüğü — koşucunun
 *  anlamayacağı durma koşulu sessiz kalmasın (bilgi; v1 sözlüğü dar ve AÇIK). Saf. */
export function donguTanilari(
  programlar: ReadonlyMap<string, Program>,
  indeks: KodIndeks,
  muaflar?: ReadonlySet<string>,
): Array<{ dosya: string; tani: Tani }> {
  const out: Array<{ dosya: string; tani: Tani }> = [];
  for (const [dosya, program] of programlar) {
    if (muaflar?.has(dosya)) continue;
    const gez = (n: Dugum): void => {
      if (n.tur === "widget" && n.ad === "Döngü") {
        const kimlik = n.parametreler.find((p) => p.ad === "kod")?.deger.metin ?? "?";
        for (const p of [...n.parametreler, ...n.ozellikler]) {
          if (p.ad === "koşar") {
            // A05 (bug-avı B4): skaler koşar da denetlenir — tek KOD = tek elemanlı
            // liste semantiği (eskiden yalnız liste görülüyordu; skaler yazım hem
            // denetçiden hem koşucudan kaçıyor, döngü SIFIR hedefle "sağlıklı" koşuyordu).
            const hedefler = p.deger.tur === "liste" ? (p.deger.ogeler ?? []) : [p.deger];
            for (const o of hedefler) {
              if (o.tur === "kod" && o.metin && !indeks.has(o.metin)) {
                out.push({ dosya, tani: eskiTani("kırık-koşar", "uyarı",
                  { kimlik, hedef: o.metin }, { satir: o.satir, sutun: o.sutun }) });
              }
            }
          }
          if (p.ad === "durunca" && p.deger.tur === "metin" && p.deger.metin) {
            const m = p.deger.metin.trim();
            if (!DURUNCA_KALIPLARI.some((r) => r.test(m))) {
              out.push({ dosya, tani: eskiTani("durunca-sözlüğü", "bilgi",
                { kimlik, koşul: m }, { satir: p.deger.satir, sutun: p.deger.sutun }) });
            }
          }
        }
      }
      n.cocuklar.forEach(gez);
    };
    program.bildirimler.forEach(gez);
  }
  return out;
}

export function gizliBagimlilikTanilari(
  programlar: ReadonlyMap<string, Program>,
  indeks: KodIndeks,
  muaflar?: ReadonlySet<string>,
): Array<{ dosya: string; tani: Tani }> {
  const out: Array<{ dosya: string; tani: Tani }> = [];
  // \b Türkçe'de güvensiz (DRS-REGEX-TURKCE) — desen zaten sınıf-dışı karakterde durur.
  const KOD_DESENI = /[A-ZÇĞİÖŞÜ0-9]+(?:-[A-ZÇĞİÖŞÜ0-9]+)+(?:\.[0-9]+){0,2}/gu;
  const KAPSAYICILAR = new Set(["Blok", "Faz", "Katman", "AltKatman"]);

  for (const [dosya, program] of programlar) {
    if (muaflar?.has(dosya)) continue;
    const gez = (node: Dugum): void => {
      if (node.tur === "widget") {
        for (const p of [...node.parametreler, ...node.ozellikler]) {
          // ⑤ kenar yalnız Adım'da — plan kapsayıcısı kenar taşıyamaz.
          //    MIM-1.4 muafiyeti: Katman = TEKNOLOJİ ekseni — `bağımlı:` hedeflerinin
          //    TAMAMI Takım/Teknoloji'ye çözülüyorsa bu bir sıra-kenarı değil EKSEN
          //    BAĞIDIR (katmansız-teknoloji bekçisinin beklediği beyan) → serbest.
          if ((p.ad === "bağımlı" || p.ad === "besler") && KAPSAYICILAR.has(node.ad)) {
            const hedefler: string[] = [];
            const topla = (d: typeof p.deger | undefined): void => {
              if (!d) return;
              if (d.tur === "liste") (d.ogeler ?? []).forEach(topla);
              else if (d.tur === "kod" && d.metin) hedefler.push(d.metin);
            };
            topla(p.deger);
            const eksenBagi = node.ad === "Katman" && p.ad === "bağımlı" &&
              hedefler.length > 0 && hedefler.every((h) => {
                const t = indeks.get(h)?.tip;
                return t === "Takım" || t === "Teknoloji";
              });
            if (!eksenBagi) out.push({ dosya, tani: eskiTani("kapsayıcı-kenar", "hata",
              { ad: node.ad, kenar: p.ad }, { satir: p.satir, sutun: p.sutun }) });
          }
          // ① kenar metin taşıyamaz
          if ((p.ad === "bağımlı" || p.ad === "besler") && p.deger.tur === "metin") {
            out.push({ dosya, tani: eskiTani("kenar-metin", "hata",
              { kenar: p.ad, metin: (p.deger.metin ?? "").slice(0, 60), kusur: "kapsayıcı-alan" },
              { satir: p.satir, sutun: p.sutun }) });
          }
          // ②③④ `bağımlılık` alanı TÜMDEN yasak — bağımlılık mekaniktir
          if (p.ad === "bağımlılık") {
            if (p.deger.tur === "liste") {
              out.push({ dosya, tani: eskiTani("yanlış-alan", "hata", {}, { satir: p.satir, sutun: p.sutun }) });
            } else {
              const metin = p.deger.tur === "metin" ? (p.deger.metin ?? "") : "";
              const gizli = [...new Set(
                [...metin.matchAll(KOD_DESENI)].map((m) => m[0]).filter((k) => indeks.has(k)),
              )];
              out.push({ dosya, tani: gizli.length
                ? eskiTani("gizli-bağımlılık", "hata", { gizli }, { satir: p.satir, sutun: p.sutun })
                : eskiTani("bağımlılık-mekanik", "hata", {}, { satir: p.satir, sutun: p.sutun }) });
            }
          }
        }
      }
      for (const c of node.cocuklar) gez(c);
      icin(node, (d) => { if (d.tur === "widget" && d.dugum) gez(d.dugum); });
    };
    for (const b of program.bildirimler) gez(b);
  }
  return out;
}

/**
 * Yapı-yalınlığı önerisi (BKM-DIL-A03). Tek Adım taşıyan Katman ve tek Katman
 * taşıyan Faz BİLGİ düzeyinde tanı alır: eski omurgada çocuk bir üst kademeye
 * alınabiliyordu — şişkinlik denetimle geriletilir, zorlanmaz (karne/kapı
 * bilgiden etkilenmez; motor olguyu bildirir, muhakemeyi insana ya da ajana
 * bırakır · OGR-1.4). Saf.
 */
export function tekCocukTanilari(programlar: ReadonlyMap<string, Program>): Array<{ dosya: string; tani: Tani }> {
  const out: Array<{ dosya: string; tani: Tani }> = [];
  for (const [dosya, program] of programlar) {
    const gez = (node: Dugum): void => {
      if (node.tur === "widget") {
        const cocukWidgetlar = node.cocuklar.filter((c) => c.tur === "widget");
        // Katman{1 Adım} maddesi EMEKLİ (RF-T3-A01 · YAS-1.1): eski öneri ("Adım'ı üste al,
        // Katman'ı kaldır") yeni idealle (Katman→AltKatman→Adım — Katman TEKNOLOJİ
        // beyanının evidir, MIM-1.4) ÇELİŞİYORDU; çıplak yazımı artık çıplak-adımlı-katman
        // bekçisi ölçer. Faz maddeleri (zaman kademesi) aynen sürer.
        if (node.ad === "Faz" && cocukWidgetlar.length === 1 && cocukWidgetlar[0].ad === "Blok") {
          out.push({ dosya, tani: eskiTani("tek-çocuk-kapsayıcı", "bilgi",
            { kusur: "tek-blok" }, { satir: node.satir, sutun: node.sutun }) });
        }
        if (node.ad === "Faz" && cocukWidgetlar.length === 1 && cocukWidgetlar[0].ad === "Katman") {
          out.push({ dosya, tani: eskiTani("tek-çocuk-kapsayıcı", "bilgi",
            { kusur: "tek-katman" }, { satir: node.satir, sutun: node.sutun }) });
        }
      }
      for (const c of node.cocuklar) gez(c);
    };
    for (const b of program.bildirimler) gez(b);
  }
  return out;
}

// göç motor turu A10 kapanışı (2026-07-27): `kırıntı-adım` emekli edildi. Küçük-Adım bilgi
// denetimi MIM-1.6 maddesinin `adım-atomikliği` sözleşmesine dönüştü; atomiklik
// hükmü hem aşırı bölmeyi hem aşırı şişmeyi tek kimlikle konuşur.
// Ölçüm: canlı bahçede sıfır bulgu üretiyordu.

/**
 * Dosyalar-ARASI kural-çatışması (M-2 · PLN-6). Dosya-içi çiftleri `dogrula`
 * zaten raporlar; burada yalnız FARKLI dosyalardaki çiftler denetlenir (RBAC-çelişki
 * dersi: aynı kavram iki ayrı dosyada farklı tanımlanır, kimse görmez).
 */
export function dosyalararasiCatismaTanilari(programlar: ReadonlyMap<string, Program>): Array<{ dosya: string; tani: Tani }> {
  const dosyaKurallari: Array<{ dosya: string; k: KuralBilgi }> = [];
  for (const [etiket, p] of programlar) {
    for (const k of kurallariCikar(p)) dosyaKurallari.push({ dosya: etiket, k });
  }
  const out: Array<{ dosya: string; tani: Tani }> = [];
  for (let i = 0; i < dosyaKurallari.length; i++) {
    for (let j = i + 1; j < dosyaKurallari.length; j++) {
      if (dosyaKurallari[i].dosya === dosyaKurallari[j].dosya) continue;
      const t = ciftCatismasi(dosyaKurallari[i].k, dosyaKurallari[j].k);
      if (t) out.push({ dosya: `${dosyaKurallari[i].dosya} ↔ ${dosyaKurallari[j].dosya}`, tani: t });
    }
  }
  return out;
}

/**
 * Rafsız-anadizin bekçisi (BKM-SNV2-A01 · Sınav-2 F1 · MIM-3.2 kapısı · SAF):
 * giriş dosyası bir temel-aile kökü (Proje/Uygulama/ÇalışmaAlanı) ilan ediyor
 * ama iskelet planında TEK BİR dizin bile üretmiyorsa (raflar: yok · Kitaplık/Raf
 * yok · plan-içerme dizini yok) yapı İLANSIZ demektir — "bu dosya nereye?"
 * sorusu kod fazında duvara çarpar (Sınav-2'de motor sustu, Founder yakaladı).
 * Düzey: uyarı — plan-turu (yalnız .sar plan) projelerde erken evre meşru
 * olabilir; uyarı kapıyı kırmaz ama sessizliği bitirir.
 */
export function rafsizAnadizinTanilari(
  ana: Program,
  plan: IskeletPlan,
  snf: Siniflama,
): Tani[] {
  const temelAile = new Set(snf.widgetTipleri.filter((t) => t.aile === "temel").map((t) => t.ad));
  const kok = ana.bildirimler.find((b) => b.tur === "widget" && temelAile.has(b.ad));
  if (!kok) return [];   // temel kök yok — ana-yok/diğer bekçilerin işi
  if (plan.ogeler.some((o) => o.tur === "dizin")) return [];   // en az bir raf/dizin ilanı var
  return [eskiTani("rafsız-anadizin", "uyarı", { kök: kok.ad }, { satir: kok.satir, sutun: kok.sutun })];
}

/**
 * Anadizin-şekli bekçisi (E1-A01 · IDA dogfood 2026-07-13 · Founder · EVRE-1 MIM-1.3):
 * bir anadizin KÖKÜ (Proje/Uygulama/ÇalışmaAlanı) DOĞRUDAN plan düğümü (Faz/Blok)
 * içeriyorsa HATA — anadizin MİMARİ çizer (Kitaplık/Raf/yol), plan (Faz→Blok→
 * Katman→Adım) plan/ rafında AYRI .sar'da yaşar. rafsız-anadizin'in (BKM-SNV2-A01)
 * KAÇIRDIĞI hâl: iskeletçi Faz/Blok'u "dizin"e çevirdiği için motor "mimari var"
 * sanıp susuyor; IDA'da 26 kayıp-yapı + yanlış öneri (iskeletçiye git) bu yüzden
 * doğdu. Bu bekçi kök-nedeni yazım anında + DOĞRU mesajla söyler. Plan-fragmanları
 * (top-level Blok, ör. reform_plani.sar — Proje/kök YOK) bu tanıya DÜŞMEZ.
 */
export function anadizinSekliTanilari(ana: Program, _snf: Siniflama): Tani[] {
  const kokTipleri = new Set(["Proje", "Uygulama", "ÇalışmaAlanı"]);   // anadizin kökleri (mimari: Kitaplık/Raf; plan: Faz/Blok DEĞİL)
  const planTipleri = new Set(["Faz", "Blok"]);                        // plan-iskeleti düğümleri (Katman/Adım bunların altında yaşar)
  const kok = ana.bildirimler.find((b) => b.tur === "widget" && kokTipleri.has(b.ad));
  if (!kok) return [];   // plan-fragmanı (kök yok) — bu bekçinin işi değil
  let bulunan: Dugum | undefined;
  const ara = (n: Dugum): void => {
    if (bulunan) return;
    if (n.tur === "widget" && planTipleri.has(n.ad)) { bulunan = n; return; }
    for (const c of n.cocuklar) ara(c);
  };
  for (const c of kok.cocuklar) ara(c);
  if (!bulunan) return [];   // kök yalnız mimari (Kitaplık/Raf) + ilan taşıyor — TEMİZ
  return [eskiTani("anadizin-plan-karışması", "hata",
    { kök: kok.ad, bulunan: bulunan.ad }, { satir: bulunan.satir, sutun: bulunan.sutun })];
}

// göç motor turu A10 kapanışı (2026-07-27): `anadizin-yüzey-şişmesi` emekli edildi.
// Anadizin-içerik mikro-denetimi yeni omurgaya taşınmadı; kökün ne sarabileceği
// artık MIM-1.1 ile TIP-2.4 izinli-sarma sözleşmesinden okunur ve ihlali
// `izinsiz-sarma` tanısına düşer. Ölçüm: canlı bahçede sıfır bulgu üretiyordu.

/**
 * Kavuşumsuz-paralellik bekçisi (BKM-SNV2-A02 · Sınav-2 F2 · SDD-L3 · SAF):
 * farklı Takım'lara bağlı iki Adım arasında DOĞRUDAN `bağımlı:` kenarı varsa
 * ve ikisini köprüleyen ORTAK bir Sözleşme yoksa uyarır — ön/arka yüz
 * birbirine zincirlenir, paralel koşamaz; kavuşum Sözleşme üzerinden olmalı
 * (contract-first). Takım-facet tespiti Adım'ın bağımlı listesindeki Takım
 * kodlarından (v1 dar: yalnız Takım tipi — Teknoloji'ye doğrudan bağımlılık
 * facet sayılmaz, yanlış-pozitif üretmez). Köprü: iki Adım'ın kenar hedefleri
 * arasında AYNI Sözleşme düğümü.
 */
export function kavusumsuzParalellikTanilari(
  programlar: ReadonlyMap<string, Program>,
  indeks: KodIndeks,
  snf: Siniflama,
  muaflar?: ReadonlySet<string>,
): Array<{ dosya: string; tani: Tani }> {
  const kenarlar = new Set(snf.kenarTipleri.map((k) => k.ad));
  interface AdimBilgi { kod: string; dosya: string; satir: number; sutun: number; bagimli: string[]; takimlar: Set<string>; sozlesmeler: Set<string> }
  const adimlar = new Map<string, AdimBilgi>();

  const hedefler = (d: Deger): string[] => {
    if (d.tur === "liste") return (d.ogeler ?? []).flatMap(hedefler);
    return d.tur === "kod" && d.metin ? [d.metin] : [];
  };

  for (const [dosya, p] of programlar) {
    if (muaflar?.has(dosya)) continue;
    const gez = (n: Dugum): void => {
      if (n.tur === "widget" && n.ad === "Adım") {
        const kod = n.parametreler.find((x) => x.ad === "kod")?.deger.metin;
        if (kod && !adimlar.has(kod)) {
          const bilgi: AdimBilgi = { kod, dosya, satir: n.satir, sutun: n.sutun, bagimli: [], takimlar: new Set(), sozlesmeler: new Set() };
          for (const prm of [...n.parametreler, ...n.ozellikler]) {
            if (!kenarlar.has(prm.ad)) continue;
            for (const h of hedefler(prm.deger)) {
              const t = indeks.get(h);
              if (prm.ad === "bağımlı") {
                bilgi.bagimli.push(h);
                if (t?.tip === "Takım") bilgi.takimlar.add(h);
              }
              if (t?.tip === "Sözleşme") bilgi.sozlesmeler.add(h);
            }
          }
          adimlar.set(kod, bilgi);
        }
      }
      for (const c of n.cocuklar) gez(c);
    };
    for (const b of p.bildirimler) gez(b);
  }

  const out: Array<{ dosya: string; tani: Tani }> = [];
  for (const a of adimlar.values()) {
    if (a.takimlar.size === 0) continue;
    for (const hedef of a.bagimli) {
      const b = adimlar.get(hedef);
      if (!b || b.takimlar.size === 0) continue;
      const ortakTakim = [...a.takimlar].some((t) => b.takimlar.has(t));
      if (ortakTakim) continue;   // aynı facet — zincir meşru
      const kopru = [...a.sozlesmeler].some((s) => b.sozlesmeler.has(s));
      if (kopru) continue;        // ortak Sözleşme köprüsü var — contract-first sağlanmış
      out.push({
        dosya: a.dosya,
        tani: eskiTani("kavuşumsuz-paralellik", "uyarı",
          { kod: a.kod, takımlar: [...a.takimlar], hedef: b.kod, hedefTakımları: [...b.takimlar] },
          { satir: a.satir, sutun: a.sutun }),
      });
    }
  }
  return out;
}

/**
 * Silo-blok bekçisi (E1-A02 · IDA dogfood 2026-07-13 · Founder · EVRE-1 MIM-1.3 · ORK-2.3):
 * bir Blok yalnız TEK yüz taşıyıp (yalnız yuzey ailesi düğümleri VEYA yalnız arkayuz)
 * ve güvenlik (Güvenlik/Mekanizma düğümü veya referansı) da yoksa → uyarı: dikey dilim
 * değil, silo. MIM-1.3 drift-anahtarı 'silo-blok' bugüne dek KÂĞITTAYDI (zorlama yok);
 * bu bekçi motora indirir. Dikey dilim (ön+arka BİRLİKTE) Blok TEMİZ geçer. Yüz-widget'ı
 * HİÇ taşımayan ince-plan Blok (yalnız görev-metinli Adım) bu tanıya DÜŞMEZ — kavuşacak
 * yapısal yüz yoktur (kör-drift'in thin-plan yüzü; yanlış-pozitif kalkanı). Yüz tespiti
 * İÇERİK-tabanlı (widget ailesi) — proje-adı bağımsız, sıfır yanlış-pozitif.
 */
export function siloBlokTanilari(
  programlar: ReadonlyMap<string, Program>,
  indeks: KodIndeks,
  snf: Siniflama,
  muaflar?: ReadonlySet<string>,
): Array<{ dosya: string; tani: Tani }> {
  const tipAile = new Map(snf.widgetTipleri.map((t) => [t.ad, t.aile]));
  const GUVENLIK_TIP = new Set(["Güvenlik", "Mekanizma"]);
  const kenarlar = new Set(snf.kenarTipleri.map((k) => k.ad));
  const out: Array<{ dosya: string; tani: Tani }> = [];

  for (const [dosya, p] of programlar) {
    if (muaflar?.has(dosya)) continue;
    const bloklar: Dugum[] = [];
    const topla = (n: Dugum): void => {
      if (n.tur === "widget" && n.ad === "Blok") bloklar.push(n);
      for (const c of n.cocuklar) topla(c);
      icin(n, (d) => { if (d.tur === "widget" && d.dugum) topla(d.dugum); });
    };
    for (const b of p.bildirimler) topla(b);

    for (const blok of bloklar) {
      let onVar = false, arkaVar = false, guvVar = false;
      const tara = (n: Dugum): void => {
        if (n.tur === "widget") {
          const aile = tipAile.get(n.ad);
          if (aile === "yuzey") onVar = true;
          else if (aile === "arkayuz") arkaVar = true;
          if (GUVENLIK_TIP.has(n.ad)) guvVar = true;
          // güvenlik REFERANSI: kenar değerindeki KOD Güvenlik/Mekanizma'ya çözülüyorsa
          for (const prm of [...n.parametreler, ...n.ozellikler]) {
            if (!kenarlar.has(prm.ad)) continue;
            const hedefler = prm.deger.tur === "liste"
              ? (prm.deger.ogeler ?? []).map((o) => o.metin).filter((m): m is string => !!m)
              : prm.deger.tur === "kod" && prm.deger.metin ? [prm.deger.metin] : [];
            if (hedefler.some((h) => GUVENLIK_TIP.has(indeks.get(h)?.tip ?? ""))) guvVar = true;
          }
        }
        for (const c of n.cocuklar) tara(c);
        icin(n, (d) => { if (d.tur === "widget" && d.dugum) tara(d.dugum); });
      };
      for (const c of blok.cocuklar) tara(c);

      // dikey dilim (ön+arka) TEMİZ · yüzsüz ince-plan DÜŞMEZ · tek-yüz+güvenliksiz → silo
      if (onVar === arkaVar) continue;   // ikisi de var (dilim) ya da ikisi de yok (ince) → temiz
      if (guvVar) continue;              // güvenlik kavuşumu var → susar
      const kod = blok.parametreler.find((x) => x.ad === "kod")?.deger.metin ?? "?";
      const yuz = onVar ? "önyüz (yuzey)" : "arkayüz (arkayuz)";
      out.push({
        dosya,
        tani: eskiTani("silo-blok", "uyarı",
          { kod, önyüz: onVar }, { satir: blok.satir, sutun: blok.sutun }),
      });
    }
  }
  return out;
}

/**
 * Kavuşumsuz-dilim bekçisi (E1-A03 · IDA dogfood · Founder · EVRE-1 · TIP-2.3 üst kademe):
 * bir Blok HEM yüzey (Ekran/Form…) HEM arkayüz (Uç/Servis…) düğümü taşıyıp aralarında
 * KAVUŞUM köprüsü YOKSA → uyarı: FE ve BE var ama bağlanmamış. Köprü iki biçimden biri:
 *   ① doğrudan kenar: bir yüzey düğümü kenarı (bağımlı/kullanir/çağırır/referans/besler)
 *      bir arkayüz düğümüne çözülüyor, ya da yüzey düğümünün çağır'ı arkayüze işaret ediyor.
 *   ② contract-first: yüzey bir Sözleşme'ye, arkayüz AYNI Sözleşme'ye dokunuyor (Ekran
 *      referans SZL ← üretir Uç). kavusumsuzParalellik (Adım-Takım düzeyi) bunun ALT
 *      kademesi; bu, structural yüz-düğümü kademesi. Tek-yüz Blok bu tanıya DÜŞMEZ
 *      (silo-blok'un işi — kavuşacak karşı yüz yok). Yüzsüz ince-plan da düşmez.
 */
export function kavusumsuzDilimTanilari(
  programlar: ReadonlyMap<string, Program>,
  indeks: KodIndeks,
  snf: Siniflama,
  muaflar?: ReadonlySet<string>,
): Array<{ dosya: string; tani: Tani }> {
  const tipAile = new Map(snf.widgetTipleri.map((t) => [t.ad, t.aile]));
  const kenarlar = new Set(snf.kenarTipleri.map((k) => k.ad));
  const out: Array<{ dosya: string; tani: Tani }> = [];

  const kenarHedefleri = (n: Dugum): string[] => {
    const cikti: string[] = [];
    for (const prm of [...n.parametreler, ...n.ozellikler]) {
      if (!kenarlar.has(prm.ad)) continue;
      const d = prm.deger;
      const metinler = d.tur === "liste"
        ? (d.ogeler ?? []).map((o) => o.metin).filter((m): m is string => !!m)
        : d.tur === "kod" && d.metin ? [d.metin] : [];
      cikti.push(...metinler);
    }
    // yüzey düğümünün altındaki çağır düğümleri (Ekran içinde `çağır UÇ`)
    const cagirTopla = (m: Dugum): void => {
      if (m.tur === "çağır" && m.ad) cikti.push(m.ad);
      for (const c of m.cocuklar) cagirTopla(c);
    };
    for (const c of n.cocuklar) cagirTopla(c);
    return cikti;
  };

  for (const [dosya, p] of programlar) {
    if (muaflar?.has(dosya)) continue;
    const bloklar: Dugum[] = [];
    const topla = (n: Dugum): void => {
      if (n.tur === "widget" && n.ad === "Blok") bloklar.push(n);
      for (const c of n.cocuklar) topla(c);
      icin(n, (d) => { if (d.tur === "widget" && d.dugum) topla(d.dugum); });
    };
    for (const b of p.bildirimler) topla(b);

    for (const blok of bloklar) {
      const onDugumler: Dugum[] = [], arkaDugumler: Dugum[] = [];
      const tara = (n: Dugum): void => {
        if (n.tur === "widget") {
          const aile = tipAile.get(n.ad);
          if (aile === "yuzey") onDugumler.push(n);
          else if (aile === "arkayuz") arkaDugumler.push(n);
        }
        for (const c of n.cocuklar) tara(c);
        icin(n, (d) => { if (d.tur === "widget" && d.dugum) tara(d.dugum); });
      };
      for (const c of blok.cocuklar) tara(c);
      if (onDugumler.length === 0 || arkaDugumler.length === 0) continue;   // dilim değil (tek yüz/yüzsüz) → DÜŞMEZ

      const arkaKodlar = new Set(
        arkaDugumler.map((n) => n.parametreler.find((x) => x.ad === "kod")?.deger.metin).filter((m): m is string => !!m),
      );
      const sozlesmeleri = (dugumler: Dugum[]): Set<string> => {
        const s = new Set<string>();
        for (const n of dugumler) for (const h of kenarHedefleri(n)) {
          if (indeks.get(h)?.tip === "Sözleşme") s.add(h);
        }
        return s;
      };
      // ① doğrudan kenar: yüzey → arkayüz düğümü
      let kopru = onDugumler.some((n) => kenarHedefleri(n).some((h) => arkaKodlar.has(h)));
      // ② contract-first: ortak Sözleşme
      if (!kopru) {
        const onSzl = sozlesmeleri(onDugumler), arkaSzl = sozlesmeleri(arkaDugumler);
        kopru = [...onSzl].some((s) => arkaSzl.has(s));
      }
      if (kopru) continue;   // kavuşum var → TEMİZ

      const kod = blok.parametreler.find((x) => x.ad === "kod")?.deger.metin ?? "?";
      const onAd = onDugumler[0].ad, arkaAd = arkaDugumler[0].ad;
      out.push({
        dosya,
        tani: eskiTani("kavuşumsuz-dilim", "uyarı",
          { kod, önyüz: onAd, arkayüz: arkaAd }, { satir: blok.satir, sutun: blok.sutun }),
      });
    }
  }
  return out;
}

/**
 * Kapsam-çözümü bekçisi (YAS-2.3 · BKM-BUG-A01 · SAF): Kural'ın `kapsam:` seçicisi
 * serbest-metindir (aile | tip | tek KOD | joker) ve bugüne dek HİÇ doğrulanmıyordu —
 * yazım hatası (`onyuz` yerine `yuzey`) sessizce BOŞ KÜMEYE düşüyordu (bug-avı M1).
 * İki tanı, ikisi de DOSYALAR-ARASI (KOD başka dosyada yaşayabilir):
 *   • bilinmeyen-kapsam (uyarı): seçici joker/aile/tip/KOD hiçbirine çözülmüyor.
 *   • boş-kapsam (uyarı): seçici GEÇERLİ ama yapısal-koşullu kuralın kapsamına
 *     tüm çalışma alanında SIFIR düğüm düşüyor — koşul hiçbir yerde koşmayacak
 *     (zorlanamayan-koşul bekçisinin kör kaldığı boş-küme hali; yalnız makine-
 *     değerlendirilir koşulda: niyet/düzyazı kural zaten koşturulmaz).
 */
export function kapsamTanilari(
  programlar: ReadonlyMap<string, Program>,
  indeks: KodIndeks,
  snf: Siniflama,
  muaflar?: ReadonlySet<string>,
): Array<{ dosya: string; tani: Tani }> {
  const aileler = new Set(Object.keys(snf.aileler ?? {}));
  const tipAile = new Map(snf.widgetTipleri.map((t) => [t.ad, t.aile]));

  // Çalışma-alanı geneli tip/aile doluluk sayımı (boş-kapsam için — tek geçiş).
  const tipSayisi = new Map<string, number>();
  const aileSayisi = new Map<string, number>();
  const say = (n: Dugum): void => {
    if (n.tur === "widget") {
      tipSayisi.set(n.ad, (tipSayisi.get(n.ad) ?? 0) + 1);
      const a = tipAile.get(n.ad);
      if (a) aileSayisi.set(a, (aileSayisi.get(a) ?? 0) + 1);
    }
    for (const c of n.cocuklar) say(c);
    icin(n, (d) => { if (d.tur === "widget" && d.dugum) say(d.dugum); });
  };
  for (const p of programlar.values()) for (const b of p.bildirimler) say(b);

  const out: Array<{ dosya: string; tani: Tani }> = [];
  for (const [dosya, p] of programlar) {
    if (muaflar?.has(dosya)) continue;
    for (const k of kurallariCikar(p)) {
      if (k.kapsam === undefined || KAPSAM_JOKER.has(k.kapsam)) continue;
      const aileMi = aileler.has(k.kapsam);
      const tipMi = tipAile.has(k.kapsam);
      if (!aileMi && !tipMi && !indeks.has(k.kapsam)) {
        out.push({ dosya, tani: eskiTani("bilinmeyen-kapsam", "uyarı",
          { kod: k.kod, kapsam: k.kapsam, aileler: [...aileler] },
          { satir: k.d.satir, sutun: k.d.sutun }) });
        continue;
      }
      // boş-kapsam: yalnız makine-değerlendirilir koşullu yapısal kuralda anlamlı.
      if (k.katman !== "yapısal" || !k.kosul || k.kosul.tur === "metin") continue;
      const dolu = aileMi ? (aileSayisi.get(k.kapsam) ?? 0)
        : tipMi ? (tipSayisi.get(k.kapsam) ?? 0)
          : 1; // tek-KOD seçici: indekste var → en az bir düğüm
      if (dolu === 0) {
        out.push({ dosya, tani: eskiTani("boş-kapsam", "uyarı",
          { kod: k.kod, kapsam: k.kapsam }, { satir: k.d.satir, sutun: k.d.sutun }) });
      }
    }
  }
  return out;
}

/** Bahçe-dışı dosya (örnek/sınama/vitrin/fikstür) — kullanım sayımına girmez. */
const BAHCE_DISI = /(^|\/)(ornek|sinama|vitrin|fikstur)(\/|$)|(_ornek|_vitrin|_fikstur)/;

/**
 * RF-T6-A05 · kullanımsız-tip bekçisi (tip-doğum kapısı · Founder onayı 2026-07-14):
 * "format yazıp uygulamama" hastalığını sürekli NÖBETE indirir. Kanon tipleri CANLI
 * bahçedeki (örnek/sınama/vitrin/fikstür HARİÇ) gerçek düğüm kullanımıyla karşılaştırır;
 * sıfır-kullanım bir tip `tipMuafiyetleri`nde BEYANLI değilse BİLGİ tanısı düşer
 * (dış-proje/OS-vadeli/A04-bekleyen muafiyeti kanonda yaşar — STR-3 dış-proje + aile
 * oturumu kilidi "hepsi OS için yaşar"). Böylece yeni bir tip doğunca ya kullanılmalı
 * ya muafiyeti beyan edilmeli — sessiz-doğum imkânsız. Proje-geneli → giriş dosyasına
 * iliştirilir (tek gözlem, dağınık değil). BİLGİ düzeyi: kapıyı doldurmaz (YAS-3.1).
 */
export function kullanimsizTipTanilari(
  programlar: ReadonlyMap<string, Program>,
  snf: Siniflama,
  girisEtiket: string,
): Array<{ dosya: string; tani: Tani }> {
  const muafiyet = snf.tipMuafiyetleri ?? {};
  const tipSayisi = new Map<string, number>();
  const say = (n: Dugum): void => {
    if (n.tur === "widget") tipSayisi.set(n.ad, (tipSayisi.get(n.ad) ?? 0) + 1);
    for (const c of n.cocuklar) say(c);
    icin(n, (d) => { if (d.tur === "widget" && d.dugum) say(d.dugum); });
  };
  for (const [dosya, p] of programlar) {
    if (BAHCE_DISI.test(dosya)) continue;   // yalnız CANLI bahçe kullanımı sayılır
    for (const b of p.bildirimler) say(b);
  }
  const out: Array<{ dosya: string; tani: Tani }> = [];
  for (const t of snf.widgetTipleri) {
    if ((tipSayisi.get(t.ad) ?? 0) > 0) continue;   // kullanılıyor → sağlıklı
    if (t.ad in muafiyet) continue;                 // muafiyeti beyanlı → sus
    out.push({ dosya: girisEtiket, tani: eskiTani("kullanımsız-tip", "bilgi",
      { ad: t.ad, aile: t.aile }, { satir: 0, sutun: 0 }) });
  }
  return out;
}

/**
 * Yapısal-hiyerarşi bekçisi (Founder MECBURİ kuralları 2026-07-14 · MIM-1 zorlaması):
 * projede TAM ZİNCİR — Faz → Blok → Katman → Adım. İki HATA:
 *   • fazsız-blok: her Blok bir zaman halkasına çözülmeli. ÜÇ meşru hâl tanınır
 *     (MIM-1.2 ③ · zaman-ekseni turu): ① FİZİKSEL çocuk (Blok bir Faz gövdesinde) ② KAPSAMA
 *     (Faz onu `çağır` ya da mevsim çevriminden gelen sanal `çağır` ile kapsıyor)
 *     ③ BEYAN (Blok `planlanmamış: "neden"` taşıyor — hata yerine 🧊
 *     planlanmamış-gövde BİLGİ satırı basılır; boş neden beyan sayılmaz).
 *   • katmansız-adım: Blok'un DOĞRUDAN çocuğu Adım olamaz — arada bir kademe
 *     (Katman/AltKatman) olmalı. (AltKatman→Adım MEŞRU; kademe zaten var.)
 * İki dürüstlük nöbeti (zaman-ekseni turu): çift-mevsim-kaydı (bağ hem Faz tarafında hem
 * Blok'un mevsim: alanında — aynı bağ iki yerde kayıtlı, tek-kaynak ihlali, UYARI) · planlanmamış-çelişki
 * (gövde 'planlanmamış' diyor ama altında geliştirmede Adım var — UYARI).
 * Founder canlı yakaladı — motor rütbe-atlamayı uyarmıyordu; MIM-1'in "rütbe-atlama
 * serbest" maddesi KALKTI (YAS-1.1 · 2026-07-14: katı rejimde tam-zincir ZORUNLU).
 * İki tanı da HATA — MIM-1 kademe koşulu ("mevcut örnekler Faz'lı olunca") TAMAMLANDI:
 * blok_kimlik.sar (son facet kalıntısı) tam-zincire göçtü (2026-07-14 · KN #14).
 * Şablonlar + örnek/sınama muaf (scaffold örneği; yapı zorlanmaz).
 */
export function hiyerarsiTanilari(
  programlar: ReadonlyMap<string, Program>,
): Array<{ dosya: string; tani: Tani }> {
  // Bir Faz'ın ÇAĞIRDIĞI Blok kodları (çağır-çevrimi — Faz halkasına giren gövdeler).
  // Gerçek/sanal ayrımı: sanal kenar mevsim çevriminden gelir (mevsimNormalize imzası);
  // kapsama hâli İKİSİNİ de sayar, çift-mevsim-kaydı nöbeti yalnız GERÇEK kenara bakar.
  const fazinCagirdigi = new Set<string>();
  const fazinGercekCagirdigi = new Set<string>();
  const fazTara = (n: Dugum): void => {
    if (n.tur === "widget" && n.ad === "Faz") {
      for (const c of n.cocuklar) if (c.tur === "çağır") {
        fazinCagirdigi.add(c.ad);
        if (!c.parametreler.some((x) => x.ad === "sanal")) fazinGercekCagirdigi.add(c.ad);
      }
    }
    for (const c of n.cocuklar) fazTara(c);
  };
  for (const p of programlar.values()) for (const b of p.bildirimler) fazTara(b);

  const kodBul = (n: Dugum): string => {
    const p = n.parametreler.find((x) => x.ad === "kod") ?? n.ozellikler.find((x) => x.ad === "kod");
    return p ? degerMetni(p.deger) : "";
  };
  // planlanmamış gövdenin altında başlamış iş var mı? (sahte-kaçış nöbeti)
  const gelistirmedeAdim = (m: Dugum): string | undefined => {
    if (m.tur === "widget" && m.ad === "Adım") {
      const durum = [...m.parametreler, ...m.ozellikler].find((x) => x.ad === "durum")?.deger.metin;
      if (durum === "geliştirmede") return kodBul(m) || m.ad;
    }
    for (const c of m.cocuklar) { const b = gelistirmedeAdim(c); if (b) return b; }
    return undefined;
  };
  const out: Array<{ dosya: string; tani: Tani }> = [];
  const gez = (n: Dugum, fazAltinda: boolean, dosya: string): void => {
    if (n.tur === "widget" && n.ad === "Blok") {
      const kod = kodBul(n);
      const mevsimP = [...n.parametreler, ...n.ozellikler].find((x) => x.ad === "mevsim");
      const planP = [...n.parametreler, ...n.ozellikler].find((x) => x.ad === "planlanmamış");
      const planNeden = planP ? degerMetni(planP.deger).trim() : "";
      if (!fazAltinda && !fazinCagirdigi.has(kod)) {
        if (planP && planNeden) {
          // Hâl ③ — BEYAN: tarih taklidi yok, dürüst erteleme. Görünür kalır ama yol kesmez.
          out.push({ dosya, tani: eskiTani("planlanmamış-gövde", "bilgi",
            { kod: kod || n.ad, neden: planNeden }, { satir: n.satir, sutun: n.sutun }) });
        } else {
          out.push({ dosya, tani: eskiTani("fazsız-blok", "hata",
            { kod: kod || n.ad, boşBeyan: Boolean(planP && !planNeden) },
            { satir: n.satir, sutun: n.sutun }) });
        }
      }
      // Nöbet: çift-mevsim-kaydı — bağ hem Faz tarafında (fiziksel/gerçek çağır) hem mevsim: alanında
      if (mevsimP && (fazAltinda || fazinGercekCagirdigi.has(kod))) {
        out.push({ dosya, tani: eskiTani("çift-mevsim-kaydı", "uyarı",
          { kod: kod || n.ad, fazAltında: fazAltinda }, { satir: mevsimP.satir, sutun: mevsimP.sutun }) });
      }
      // Nöbet: planlanmamış-çelişki — gövde 'planlanmamış' diyor ama iş başlamış
      if (planNeden) {
        const baslayan = gelistirmedeAdim(n);
        if (baslayan) {
          out.push({ dosya, tani: eskiTani("planlanmamış-çelişki", "uyarı",
            { kod: kod || n.ad, başlayan: baslayan },
            { satir: (planP ?? n).satir, sutun: (planP ?? n).sutun }) });
        }
      }
      // katmansız-adım: Blok'un DOĞRUDAN Adım çocuğu = arada kademe YOK
      for (const c of n.cocuklar) {
        if (c.tur === "widget" && c.ad === "Adım") {
          out.push({ dosya, tani: eskiTani("katmansız-adım", "hata",
            { adım: kodBul(c) || c.ad, blok: kod }, { satir: c.satir, sutun: c.sutun }) });
        }
      }
    }
    const altFaz = fazAltinda || (n.tur === "widget" && n.ad === "Faz");
    for (const c of n.cocuklar) gez(c, altFaz, dosya);
  };
  for (const [dosya, p] of programlar) {
    // örnek/şablon/sınama/vitrin = öğretim/scaffold/test dosyaları — yapı zorlanmaz (canlı plan değil)
    if (/(^|\/)(ornek|sablon|sinama|vitrin|fikstur)(\/|$)/.test(dosya)) continue;
    for (const b of p.bildirimler) gez(b, false, dosya);
  }
  return out;
}

/**
 * Dayanak nöbeti (RF-T6-A02 · Sol ⑤ — eşleme ÖNCESİ şart): bir kuralın onu
 * doğuran karara makinece okunabilir bir `dayanak:` bağıyla bağlanıp bağlanmadığı
 * denetlenir. Tek çıktısı `dayanaksız-kural` bilgi tanısıdır; ders dünyası
 * (INDEKS_DISI · OGR-5) ve bilinçli `dayanaksız: "gerekçe"` beyanı muaftır.
 * Kırık dayanak hedefi bu nöbetin değil `referansTanilari` işlevinin işidir.
 *
 * göç motor turu A10 kapanışı (2026-07-27): bu işlev eskiden hedef tarafını da denetleyen iki
 * tanı üretiyordu. `dayanak-hedef-tür` YAS-2 maddesinin `hüküm-türü-uyumsuz`
 * tanısına devredildi; `dayanak-halef` ise karşılıksız emekli edildi — halef
 * zinciri artık ayrı bir bilgi tanısı olmadan YAS-2.2 karar yaşam döngüsünden ve
 * `gezin` yüzünden okunur.
 */
export function dayanakTanilari(
  programlar: ReadonlyMap<string, Program>,
): Array<{ dosya: string; tani: Tani }> {
  // Karar envanteri: kod → {durum, halef}
  const kararlar = new Map<string, { durum?: string; halef?: string }>();
  const tipler = new Map<string, string>();   // kod → düğüm tipi (ilk tanım kazanır)
  const alanOku = (d: Dugum, ad: string): string | undefined =>
    [...d.parametreler, ...d.ozellikler].find((x) => x.ad === ad)?.deger.metin;
  const tara = (d: Dugum): void => {
    const kod = alanOku(d, "kod");
    if (kod && !tipler.has(kod)) tipler.set(kod, d.tur === "kuralTanım" ? "Kural" : d.ad);
    if (d.tur === "widget" && d.ad === "Karar" && kod && !kararlar.has(kod)) {
      kararlar.set(kod, { durum: alanOku(d, "durum"), halef: alanOku(d, "halef") });
    }
    for (const c of d.cocuklar) tara(c);
    icin(d, (v) => { if (v.tur === "widget" && v.dugum) tara(v.dugum); });
  };
  for (const p of programlar.values()) for (const b of p.bildirimler) tara(b);

  const out: Array<{ dosya: string; tani: Tani }> = [];
  const kuralGez = (d: Dugum, dosya: string): void => {
    const kuralDugumu = d.tur === "kuralTanım" ||
      (d.tur === "widget" && (d.ad === "Kural" || d.ad === "GenelKural" || d.ad === "ÖzelKural"));
    if (kuralDugumu) {
      const p = [...d.parametreler, ...d.ozellikler].find((x) => x.ad === "dayanak");
      const hedefler = p ? (p.deger.tur === "liste" ? (p.deger.ogeler ?? []) : [p.deger]) : [];
      const kuralAd = alanOku(d, "kod") ?? d.ad;
      // NÖBET YENİDEN AÇIK (eşleme oturumu tamam · 2026-07-19 — Sol hükmü b'nin
      // ikinci yarısı: "bir kez elle bağla, sonra makine tutar"): dayanaksız VE
      // beyansız kural bilgi düzeyinde işaretlenir; mesaj Sol'un eylem-odaklı
      // cümlesidir. Ders dünyası (OGR-5) kapsam dışı; bilinçli beyan (dayanaksız:
      // "gerekçe") borç değildir.
      const dolu = hedefler.some((h) => h.metin);
      const beyan = alanOku(d, "dayanaksız")?.trim();
      if (!dolu && !beyan && !INDEKS_DISI.test(dosya)) {
        out.push({ dosya, tani: eskiTani("dayanaksız-kural", "bilgi",
          { kod: kuralAd }, { satir: d.satir, sutun: d.sutun }) });
      }
      // göç motor turu A10 kapanışı (2026-07-27): `dayanak-hedef-tür` ile `dayanak-halef`
      // emekli edildi. Birincisi YAS-2 maddesinin `hüküm-türü-uyumsuz` tanısına
      // dönüştü; ikincisinin anlattığı halef zinciri artık ayrı bir bilgi tanısı
      // olmadan YAS-2.2 karar yaşam döngüsünden ve `gezin` yüzünden okunur.
      // Ölçüm: ikisi de canlı bahçede sıfır bulgu üretiyordu.
    }
    for (const c of d.cocuklar) kuralGez(c, dosya);
    icin(d, (v) => { if (v.tur === "widget" && v.dugum) kuralGez(v.dugum, dosya); });
  };
  for (const [dosya, p] of programlar) for (const b of p.bildirimler) kuralGez(b, dosya);
  return out;
}

/** Ters envanter sayacı (Sol ⑤ · kuralsız-karar): hiçbir kuralın dayanak
 *  göstermediği KİLİTLİ kararların kodları — karne TEK satırında yaşar
 *  (düğüm-başına tanı basılmaz; revize/tarihçe/bekliyor sayılmaz — yürürlükte
 *  hüküm taşımayan kayıt kural doğurmuş olmak zorunda değildir). */
export function dayanaksizKararlar(programlar: ReadonlyMap<string, Program>): string[] {
  const kilitli = new Set<string>();
  const hedefler = new Set<string>();
  const alanOku = (d: Dugum, ad: string): string | undefined =>
    [...d.parametreler, ...d.ozellikler].find((x) => x.ad === ad)?.deger.metin;
  const gez = (d: Dugum, dersDunyasi: boolean): void => {
    // Yalnız AÇIKÇA kilitli kararlar sayılır (durumsuz Karar düğümü vitrin/örnek
    // malzemesi olabilir); ders dünyası (INDEKS_DISI) envantere hiç girmez.
    if (!dersDunyasi && d.tur === "widget" && d.ad === "Karar") {
      const kod = alanOku(d, "kod");
      if (kod && alanOku(d, "durum") === "kilitli") kilitli.add(kod);
    }
    const p = [...d.parametreler, ...d.ozellikler].find((x) => x.ad === "dayanak");
    if (p) for (const h of (p.deger.tur === "liste" ? (p.deger.ogeler ?? []) : [p.deger])) {
      if (h.metin) hedefler.add(h.metin);
    }
    for (const c of d.cocuklar) gez(c, dersDunyasi);
    icin(d, (v) => { if (v.tur === "widget" && v.dugum) gez(v.dugum, dersDunyasi); });
  };
  for (const [dosya, p] of programlar) {
    const ders = INDEKS_DISI.test(dosya);
    for (const b of p.bildirimler) gez(b, ders);
  }
  return [...kilitli].filter((k) => !hedefler.has(k)).sort((a, b) => a.localeCompare(b, "tr"));
}

/** Kod dosyası sayılan uzantılar (yetim-meyve taraması · MIM-2). */
const KOD_UZANTILARI = new Set([
  "ts", "tsx", "js", "jsx", "mjs", "cjs", "py", "dart", "go", "rs",
  "java", "kt", "swift", "rb", "php", "c", "h", "cpp", "hpp", "cs",
]);

/**
 * Yetim-meyve kapısı (MIM-2 · STR-4 geri-drift · SAF): diskte KOD dosyası var ama
 * hiçbir `dosya:` beyanına bağlı değilse uyarır — kod plandan önde koşuyor
 * demektir (gerçek-dünya sınavının oturum-28 dersi: NVIDIA köprüsü plansız doğmuştu).
 *
 * v1 KAPSAM (beyan-komşuluğu): yalnız İÇİNDE en az bir `dosya:` beyanı hedefi
 * bulunan dizinler taranır (doğrudan ebeveyn). Beyansız ağaçlar (ör. hiç meyve
 * ilan etmemiş eski alt-projeler) v1'de muaf — kademe deseni: önce beyanlı
 * komşuluklar dürüstleşir, tam-ağaç taraması terfi kararıyla genişler.
 * `üretir` KOD taşır; yol meyvenin `dosya:`sındadır (MIM-2.1) — bu yüzden
 * beyan kümesi tüm düğümlerin `dosya:` değerlerinden kurulur.
 */
export function yetimMeyveTanilari(
  programlar: ReadonlyMap<string, Program>,
  disk: DiskAnlikGoruntu,
): Array<{ dosya: string; tani: Tani }> {
  // 1) Beyan kümesi: tüm düğümlerdeki dosya: değerleri (Kod ilanı + üretim-yeri artefaktları).
  const beyanlar = new Set<string>();
  for (const p of programlar.values()) {
    const gez = (node: Dugum): void => {
      const d = (node.parametreler.find((x) => x.ad === "dosya") ??
                 node.ozellikler.find((x) => x.ad === "dosya"))?.deger;
      if (d?.tur === "metin" && d.metin) beyanlar.add(d.metin.replace(/^\.\//, ""));
      for (const c of node.cocuklar) gez(c);
      icin(node, (v) => { if (v.tur === "widget" && v.dugum) gez(v.dugum); });
    };
    for (const b of p.bildirimler) gez(b);
  }
  if (beyanlar.size === 0) return [];   // hiç beyan yok → v1 kapsamı boş (kademe)

  // 2) Kapsam: beyanların doğrudan ebeveyn dizinleri.
  const kapsam = new Set<string>();
  for (const b of beyanlar) {
    const i = b.lastIndexOf("/");
    kapsam.add(i === -1 ? "" : b.slice(0, i));
  }

  // 3) Kapsamdaki beyansız kod dosyaları → yetim-meyve uyarısı.
  const out: Array<{ dosya: string; tani: Tani }> = [];
  for (const g of disk.girdiler) {
    if (g.tur !== "dosya") continue;
    const uzanti = g.yol.slice(g.yol.lastIndexOf(".") + 1);
    if (!KOD_UZANTILARI.has(uzanti)) continue;
    const i = g.yol.lastIndexOf("/");
    const ebeveyn = i === -1 ? "" : g.yol.slice(0, i);
    if (!kapsam.has(ebeveyn)) continue;   // v1: yalnız beyan-komşuluğu
    if (beyanlar.has(g.yol)) continue;    // beyanlı → temiz
    out.push({
      dosya: g.yol,
      tani: eskiTani("yetim-meyve", "uyarı", { yol: g.yol }, { satir: 1, sutun: 1 }),
    });
  }
  return out;
}

/**
 * Doc-drift kapısı (BKM-OLG-A03 · oturum 29 · SAF): Adım `tamamlandı` diyor ama
 * `üretir` meyvesinin `dosya:` beyanı DİSKTE YOK → plan gerçeğin önünde konuşuyor
 * (oturum 26'da elle yakalanan K6/K7 vakasının motorlaşması). Kademe: v1 uyarı.
 * Yalnız `dosya:` taşıyan meyveler denetlenir — .sar-içi artefaktlar (Mekanizma,
 * Sözleşme…) grafikte yaşar, kırık-referans onların bekçisidir.
 */
export function docDriftTanilari(
  programlar: ReadonlyMap<string, Program>,
  disk: DiskAnlikGoruntu,
  /** Disk-tarama kapsamı DIŞI meyveler için ikinci şans kökü (ör. sablon/ —
   *  diskTara oraya bakmaz ama meyve GERÇEKTEN diskte olabilir; TIP-1.4 dersi). */
  kok?: string,
): Array<{ dosya: string; tani: Tani }> {
  // meyve KOD → dosya: beyanı (Kod/artefakt düğümlerinden)
  const meyveDosyasi = new Map<string, string>();
  const uretenler: Array<{ adim: string; meyve: string; dosya: string; satir: number; sutun: number }> = [];
  for (const [etiket, p] of programlar) {
    const gez = (node: Dugum): void => {
      const kod = (node.parametreler.find((x) => x.ad === "kod")?.deger)?.metin;
      const dosyaP = (node.parametreler.find((x) => x.ad === "dosya") ??
                      node.ozellikler.find((x) => x.ad === "dosya"))?.deger;
      if (kod && dosyaP?.tur === "metin" && dosyaP.metin) meyveDosyasi.set(kod, dosyaP.metin);
      if (node.ad === "Adım") {
        const durum = [...node.parametreler, ...node.ozellikler].find((x) => x.ad === "durum")?.deger.metin;
        const uretir = [...node.parametreler, ...node.ozellikler].find((x) => x.ad === "üretir")?.deger;
        if (durum === "tamamlandı" && uretir) {
          const hedefler = uretir.tur === "liste"
            ? (uretir.ogeler ?? []).map((o) => o.metin).filter((m): m is string => !!m)
            : uretir.metin ? [uretir.metin] : [];
          for (const h of hedefler) {
            if (kod) uretenler.push({ adim: kod, meyve: h, dosya: etiket, satir: node.satir, sutun: node.sutun });
          }
        }
      }
      for (const c of node.cocuklar) gez(c);
      icin(node, (v) => { if (v.tur === "widget" && v.dugum) gez(v.dugum); });
    };
    for (const b of p.bildirimler) gez(b);
  }

  const diskDosyalari = new Set(disk.girdiler.filter((g) => g.tur === "dosya").map((g) => g.yol));
  const out: Array<{ dosya: string; tani: Tani }> = [];
  for (const u of uretenler) {
    const beyan = meyveDosyasi.get(u.meyve);
    if (!beyan) continue;   // dosyasız meyve (.sar-içi artefakt) → kırık-referans'ın işi
    if (diskDosyalari.has(beyan.replace(/^\.\//, ""))) continue;
    // Tarama-kapsamı dışı (sablon/arsiv gibi) meyve diskte gerçekten olabilir — ikinci şans.
    if (kok && existsSync(join(kok, beyan.replace(/^\.\//, "")))) continue;
    out.push({
      dosya: u.dosya,
      tani: eskiTani("doc-drift", "uyarı",
        { adım: u.adim, meyve: u.meyve, beyan }, { satir: u.satir, sutun: u.sutun }),
    });
  }
  return out;
}

// göç motor turu A10 kapanışı (2026-07-27): Hatırlatıcı vade kapısı emekli edildi.
//   `hatırlatıcı-vade` ile `uzak-vade` tanılarının ikisi de yeni omurgada
//   karşılıksızdır: vade temelli Hatırlatıcı nöbeti kanonik süreç modeline
//   alınmadı (vade temelli hatırlatıcı hükmü göç haritasında emekli edildi) ve
//   uzak vade kanonik ihlal sayılmadı. Hatırlatıcının
//   kendisi YUZ-3.3 Hatırlatıcılar yüzeyinde yaşamaya devam eder; kalkan
//   düşen tek şey takvim ısrarıdır. Eşik sabiti ile gün-ekleme yardımcısı da
//   çağrısız kaldığı için birlikte kaldırıldı (STR-5 ölü iz). Ölçüm: iki tanı
//   da canlı bahçede sıfır bulgu üretiyordu.

// ═══ MIM-1.4 · katmansız-teknoloji bekçisi (Katman=TEKNOLOJİ ekseni) ══════════
//
//   MIM-1.4 aksiyomu: Katman teknoloji dilimidir — bir Takım/Teknoloji bağı taşımalı.
//   ASIL YOL (V1B-KANON-A01 · Founder yön hükmü 2026-08-11): bağ `kullanır:`
//   kenarıyla kurulur; kanonun MIM-1.4 hükmü ile ORK-2.4 kenar sözleşmesi bu
//   kenarı anar ve kullanır zaten ORK-2.4 gereği TEK hedef taşır. GEÇİŞ YEDEĞİ:
//   `bağımlı:` hedeflerinden en az biri Takım ya da Teknoloji düğümüne çözülüyorsa
//   bekçi yine susar — mevcut kaynaklar kırılmaz, yeni tanı kimliği doğmaz.
//   İki yazım aynı düğümde birlikteyse çelişki yoktur: ikisi de aynı olguyu
//   (teknoloji zemini) beyan eder ve bekçi susar; kenarın biçim kusurları
//   (liste hedef, yanlış tip) ORK-2.4 bekçisinin işidir, burada yinelenmez.
//   Düzey: UYARI (ADM-STD-KTEK-TERFI · STR-4 kademe — v1'de bilgiydi, göç kapandı).
//   Dürüst-beyan kaçışı: teknolojisiz Katman MEŞRUYSA (süreç katmanı gibi)
//   `teknolojiBağımsız: "gerekçe"` beyanıyla bekçi susar — boş gerekçe sayılmaz
//   (planlanmamış: deseninin Katman ikizi; ad DIL-1.2 gereği camelCase).
export function katmansizTeknolojiTanilari(
  programlar: ReadonlyMap<string, Program>,
): Array<{ dosya: string; tani: Tani }> {
  const indeks = kodIndeksle(programlar);
  const out: Array<{ dosya: string; tani: Tani }> = [];
  for (const [dosya, program] of programlar) {
    const gez = (node: Dugum): void => {
      if (node.tur === "widget" && node.ad === "Katman") {
        const hedefler: string[] = [];
        const topla = (d: Deger | undefined): void => {
          if (!d) return;
          if (d.tur === "liste") (d.ogeler ?? []).forEach(topla);
          else if (d.tur === "kod" && d.metin) hedefler.push(d.metin);
        };
        // Asıl yol `kullanır`, geçiş yedeği `bağımlı` — iki kenarın hedefleri
        // aynı havuzda toplanır; herhangi biri Takım/Teknolojiye çözülürse bağ var.
        for (const alanAdi of ["kullanır", "bağımlı"] as const) {
          topla([...node.parametreler, ...node.ozellikler].find((p) => p.ad === alanAdi)?.deger);
        }
        const teknolojiBagi = hedefler.some((h) => {
          const t = indeks.get(h)?.tip;
          return t === "Takım" || t === "Teknoloji";
        });
        const beyan = [...node.parametreler, ...node.ozellikler]
          .find((p) => p.ad === "teknolojiBağımsız")?.deger?.metin?.trim();
        if (!teknolojiBagi && !beyan) {
          const kodP = node.parametreler.find((p) => p.ad === "kod")?.deger.metin ?? node.ad;
          out.push({ dosya, tani: eskiTani("katmansız-teknoloji", "uyarı",
            { kod: kodP }, { satir: node.satir, sutun: node.sutun }) });
        }
      }
      for (const c of node.cocuklar) gez(c);
    };
    for (const b of program.bildirimler) gez(b);
  }
  return out;
}

// ═══ YAS-2.1 · karar yönlendirme kapısı — uygulanmamış-karar bekçisi ══════════
//
//   YAS-2.1 hükmü: karar→plan bağı niyet-katmanından makine-katmanına terfi etti
//   (OGR-4 ailesi — kararlaşmış-hatırlatıcı/beceri-terfisi desenlerinin Karar
//   tipine taşınması; doğuş kanıtı: Fable→Opus geçişinde OGR-1..DIL-1 plana
//   inmemişti, niyet-katmanı kural model-kırılgandır). Üç kural:
//   ① Bekçi YALNIZ `durum: kilitli` + `uygulama: gerekli` beyanlı Karar'da
//     konuşur — beyansız/kendinden-tam/ertelendi/bekliyor karar susar
//     (dürüst-beyan opt-in · MIM-1.2 deseni).
//   ② Ters-bağ (ORK-1.2): Karar-DIŞI herhangi bir düğümün dayanak/uygular/referans
//     alanı karar KOD'unu hedefliyorsa karar "inmiş" sayılır (Karar tipi hariç:
//     halef zinciri uygulama bağı değildir).
//   ③ Bağ yoksa UYARI — karar verilmiş ama plana inmemiş iş, açık iştir.
const KARAR_TERS_BAG_ALANLARI = new Set(["dayanak", "uygular", "referans"]);
export function uygulanmamisKararTanilari(
  programlar: ReadonlyMap<string, Program>,
): Array<{ dosya: string; tani: Tani }> {
  const out: Array<{ dosya: string; tani: Tani }> = [];
  // 1. geçiş: gerekli-kilitli kararlar + Karar-dışı düğümlerden ters-bağ hedefleri.
  const adaylar: Array<{ dosya: string; kod: string; node: Dugum }> = [];
  const bagliKodlar = new Set<string>();
  for (const [dosya, program] of programlar) {
    const gez = (node: Dugum): void => {
      if (node.tur === "widget") {
        const al = (ad: string): string | undefined =>
          [...node.parametreler, ...node.ozellikler].find((p) => p.ad === ad)?.deger.metin;
        if (node.ad === "Karar") {
          const kod = al("kod");
          if (kod && al("durum") === "kilitli" && al("uygulama") === "gerekli") {
            adaylar.push({ dosya, kod, node });
          }
        } else {
          for (const p of [...node.parametreler, ...node.ozellikler]) {
            if (!KARAR_TERS_BAG_ALANLARI.has(p.ad)) continue;
            const topla = (d: typeof p.deger | undefined): void => {
              if (!d) return;
              if (d.tur === "liste") (d.ogeler ?? []).forEach(topla);
              else if (d.metin) bagliKodlar.add(d.metin);
            };
            topla(p.deger);
          }
        }
      }
      for (const c of node.cocuklar) gez(c);
    };
    for (const b of program.bildirimler) gez(b);
  }
  // 2. geçiş: bağsız kalan gerekli-kilitli karar → uyarı.
  for (const { dosya, kod, node } of adaylar) {
    if (bagliKodlar.has(kod)) continue;
    out.push({ dosya, tani: eskiTani("uygulanmamış-karar", "uyarı",
      { kod }, { satir: node.satir, sutun: node.sutun }) });
  }
  return out;
}

// ═══ DIL-1.1 · dil denetçisi — Türkçe diakritik + NFC normalizasyon taraması ══
//
//   DIL-1.1 hükmü: bugüne dek insan disiplinine emanet iki yazım kusuru makinede
//   görünür olur (bilgi düzeyi — yol kesmez):
//   ① diakritik-kayıp: bilinen bir Sarmal alan adının ŞAPKASIZ hâli parametre/
//      özellik adı olarak yazılmış (`gorev:` — kastedilen `görev:`). Şema
//      bilinmeyen alanı tolere ettiğinden bu sessiz drift'ti: değer okunmaz,
//      koni boş kalır, kimse fark etmezdi.
//   ② normalizasyon-uyumsuz: diskteki HAM kaynak NFD (ayrışık) Türkçe karakter
//      içeriyor. DIL-1 belirteci girişte NFC'ler — motor doğru çalışır ama ham
//      metin dış araçlarla (grep · diff · editör araması) uyuşmaz. Ham kaynak
//      PARAMETREYLE gelir: belirteç sonrası her şey NFC olduğundan program
//      üstünden tespit imkânsızdır.
//   Sınır (DIL-1.1): TDK sözlük denetimi DEĞİL — yalnız alan-adı sözlüğü + NFC.
const sapkaDusur = (s: string): string => s
  .replace(/ğ/g, "g").replace(/Ğ/g, "G").replace(/ü/g, "u").replace(/Ü/g, "U")
  .replace(/ş/g, "s").replace(/Ş/g, "S").replace(/ı/g, "i").replace(/İ/g, "I")
  .replace(/ö/g, "o").replace(/Ö/g, "O").replace(/ç/g, "c").replace(/Ç/g, "C");
/** Şapkalı kanonik alan adları → şapkasız düşmüş hâlleri (harita ters yönde kurulur). */
const ALAN_DIAKRITIK_HARITASI: ReadonlyMap<string, string> = new Map(
  ["görev", "bağımlı", "üretir", "sınır", "koşu", "gerekçe", "sıra", "sürüm",
   "sağlar", "yığın", "çıktı", "ölçek", "eşikler", "planlanmamış", "hatırlat",
   "anlatır", "dayanaksız", "özet", "açılmaKoşulu", "teknolojiBağımsız", "çağır"]
    .filter((a) => sapkaDusur(a) !== a)
    .map((a) => [sapkaDusur(a), a] as const),
);
export function dilTanilari(
  programlar: ReadonlyMap<string, Program>,
  hamKaynaklar?: ReadonlyMap<string, string>,
): Array<{ dosya: string; tani: Tani }> {
  const out: Array<{ dosya: string; tani: Tani }> = [];
  for (const [dosya, program] of programlar) {
    const gez = (node: Dugum): void => {
      if (node.tur === "widget") {
        for (const p of [...node.parametreler, ...node.ozellikler]) {
          const dogru = ALAN_DIAKRITIK_HARITASI.get(p.ad);
          if (dogru) {
            out.push({ dosya, tani: eskiTani("diakritik-kayıp", "bilgi",
              { ad: p.ad, dogru }, { satir: p.satir ?? node.satir, sutun: p.sutun ?? node.sutun }) });
          }
        }
      }
      for (const c of node.cocuklar) gez(c);
    };
    for (const b of program.bildirimler) gez(b);
  }
  if (hamKaynaklar) {
    for (const [dosya, kaynak] of hamKaynaklar) {
      if (kaynak === kaynak.normalize("NFC")) continue;
      const satirlar = kaynak.split("\n");
      let satir = 1;
      for (let i = 0; i < satirlar.length; i++) {
        if (satirlar[i] !== satirlar[i].normalize("NFC")) { satir = i + 1; break; }
      }
      out.push({ dosya, tani: eskiTani("normalizasyon-uyumsuz", "bilgi", {}, { satir, sutun: 1 }) });
    }
  }
  return out;
}

// ═══ davranış-katmanı turu · beceri-drift nöbeti (OGR-2.2 — öğreten içerik kuraldan kopamaz) ═
//
//   Beceri düğümü `anlatır:` beyanıyla hangi kuralı/tanıyı öğrettiğini söyler:
//   liste öğesi ya çözülen bir düğüm KOD'udur (çıplak: YAS-2 · ANY-ISAKISI) ya
//   tanı sicilindeki bir tanı adıdır (tırnaklı: "kenar-metin"). Hedef silinir/
//   yeniden adlandırılırsa beceri kartı sessizce bayatlar — bu nöbet o kopuşu
//   UYARI yapar (YAS-3.4 deseni: tanı-iddiası doğrulaması emsali; tek kaynak
//   taniSicili + kod indeksi).
export function beceriDriftTanilari(
  programlar: ReadonlyMap<string, Program>,
  snf?: Pick<Siniflama, "zorunluKenarlar">,
): Array<{ dosya: string; tani: Tani }> {
  const indeks = kodIndeksle(programlar);
  const sicil = taniSicili(snf);
  const out: Array<{ dosya: string; tani: Tani }> = [];
  for (const [dosya, program] of programlar) {
    const gez = (node: Dugum): void => {
      if (node.tur === "widget" && node.ad === "Beceri") {
        const beyan = [...node.parametreler, ...node.ozellikler].find((p) => p.ad === "anlatır")?.deger;
        const kodP = node.parametreler.find((p) => p.ad === "kod")?.deger.metin ?? node.ad;
        for (const oge of beyan?.ogeler ?? []) {
          const hedef = oge.metin ?? "";
          if (!hedef) continue;
          const cozuldu = oge.tur === "kod" ? indeks.has(hedef) : sicil.has(hedef);
          if (!cozuldu) {
            out.push({ dosya, tani: eskiTani("beceri-drift", "uyarı",
              { kod: kodP, hedef, kodHedefi: oge.tur === "kod" }, { satir: oge.satir, sutun: oge.sutun }) });
          }
        }
      }
      for (const c of node.cocuklar) gez(c);
    };
    for (const b of program.bildirimler) gez(b);
  }
  return out;
}

// ═══ Açık-adım nöbeti — MOTOR SUSMAZ (Founder ilkesi, 2026-07-14) ═════════════
//
//   İlke (Founder saha gözleminden damıtıldı): bir Adım 'beklemede' yazılıp
//   unutulabiliyor — açık iş, insan hatırlayışına bırakılamaz. Motor bu yüzden
//   tamamlanmamış her Adımı gündemde tutar ve ancak hepsi kapanınca susar
//   (ilkenin adı buradan gelir: MOTOR SUSMAZ).
//   Her tamamlanmamış Adım (beklemede/geliştirmede) bir hatırlatma taşır ve
//   NEDEN açık olduğunu (görev/ne özeti) anımsatır — panel bunu geliştirmede
//   rozeti/animasyonu için okur. Düzey BİLGİ (açık iş HATA değil — meşru), ama
//   kapanış özeti bu sayı > 0 iken "bitti/TAM-yeşil" DEMEZ (motor susmaz).
// ═══ DURUMSUZ-ADIM bekçisi (EKL-F6 dersi · YAS-3.4 ruhu · 2026-07-21) ═════════
//
//   Kanıt vakası: EKL-F6-A01/A02 (Marketplace + linguist yayını) `durum:`
//   taşımıyordu; şema durum'u opsiyonel + varsayılan *beklemede sayar ama
//   açık-Adım tarayıcısı bu varsayılanı UYGULAMAZ (durum && ACIK.has). Sonuç:
//   gerçek, park edilmiş iş HAFTALARCA motor-gündeminde görünmedi — Founder
//   gözle yakaladı. Ders: örtük varsayılana güvenmek drift üretir; motor
//   göremediğini yakalamalı (STR-3.2 model-bağımsızlık ruhu). Bu bekçi durumsuz
//   Adım'ı UYARI ile yüzeye çıkarır — "durumunu açıkça beyan et".
//   Muafiyet: OGR-5 örnek-dünyası (INDEKS_DISI) + bilerek-hatalı — ders
//   malzemesi kısalık için durum atlayabilir (gündeme girmez).
export function durumsizAdimTanilari(
  programlar: ReadonlyMap<string, Program>,
  muaflar?: ReadonlySet<string>,
): Array<{ dosya: string; tani: Tani }> {
  const out: Array<{ dosya: string; tani: Tani }> = [];
  for (const [dosya, program] of programlar) {
    if (muaflar?.has(dosya)) continue;
    if (INDEKS_DISI.test(dosya)) continue;   // OGR-5 örnek-dünyası muaf
    const gez = (d: Dugum): void => {
      if (d.tur === "widget" && d.ad === "Adım") {
        const durum = [...d.parametreler, ...d.ozellikler].find((p) => p.ad === "durum")?.deger?.metin;
        if (!durum) {
          const kod = [...d.parametreler, ...d.ozellikler].find((p) => p.ad === "kod")?.deger?.metin ?? d.ad;
          out.push({ dosya, tani: eskiTani("durumsuz-adım", "uyarı",
            { kod }, { satir: d.satir, sutun: d.sutun }) });
        }
      }
      for (const c of d.cocuklar) gez(c);
    };
    for (const b of program.bildirimler) gez(b);
  }
  return out;
}

export function acikAdimTanilari(
  programlar: ReadonlyMap<string, Program>,
  muaflar?: ReadonlySet<string>,
): Array<{ dosya: string; tani: Tani }> {
  const ACIK = new Set(["beklemede", "geliştirmede"]);
  const out: Array<{ dosya: string; tani: Tani }> = [];
  for (const [dosya, program] of programlar) {
    if (muaflar?.has(dosya)) continue;
    // OGR-5 · ÖRNEK-DÜNYASI MUAFİYETİ: ders kapsamındaki (INDEKS_DISI — ornek/
    // arsiv/fikstur/sablon…) açık Adımlar ürün gündemine GİRMEZ — kasıtlı açık
    // ders malzemesidir. Gizlenmez: sayısı dersAcikAdimSayisi ile ayrı satırda
    // raporlanır. Kapsam ölçütü tek kaynak (kimlik.ts kanonu — elle ikiz yasak).
    if (INDEKS_DISI.test(dosya)) continue;
    const gez = (d: Dugum): void => {
      if (d.tur === "widget" && d.ad === "Adım") {
        const alan = (ad: string) => [...d.parametreler, ...d.ozellikler].find((p) => p.ad === ad)?.deger?.metin;
        const durum = alan("durum");
        if (durum && ACIK.has(durum)) {
          const kod = alan("kod") ?? d.ad;
          const neden = (alan("görev") ?? alan("ne") ?? alan("ad") ?? "").replace(/\s+/g, " ").trim();
          const nedenKisa = neden.length > 90 ? neden.slice(0, 88) + "…" : neden;
          const emoji = durum === "geliştirmede" ? "🚧" : "🔵";
          out.push({
            dosya,
            tani: eskiTani("açık-adım", "bilgi",
              { emoji, durum, kod, neden: nedenKisa }, { satir: d.satir, sutun: d.sutun }),
          });
        }
      }
      for (const c of d.cocuklar) gez(c);
    };
    for (const b of program.bildirimler) gez(b);
  }
  return out;
}

/**
 * OGR-5 · ÖRNEK-DÜNYASI SAYACI: ders kapsamındaki (INDEKS_DISI) açık Adımların
 * sayısını verir. Ürün gündemi (acikAdimTanilari) bu Adımları saymaz; motor yine
 * de SUSMAZ ilkesine sadıktır — bu sayı denetim çıktısında ayrı ve tek
 * bilgilendirici satırla görünür ("örnek dünyasında N açık Adım — ders
 * malzemesi, kasıtlı"). Kurgusal kapanış yazılmaz (YAS-3.4).
 */
export function dersAcikAdimSayisi(programlar: ReadonlyMap<string, Program>): number {
  const ACIK = new Set(["beklemede", "geliştirmede"]);
  let sayi = 0;
  for (const [dosya, program] of programlar) {
    if (!INDEKS_DISI.test(dosya)) continue;
    const gez = (d: Dugum): void => {
      if (d.tur === "widget" && d.ad === "Adım") {
        const durum = [...d.parametreler, ...d.ozellikler].find((p) => p.ad === "durum")?.deger?.metin;
        if (durum && ACIK.has(durum)) sayi += 1;
      }
      for (const c of d.cocuklar) gez(c);
    };
    for (const b of program.bildirimler) gez(b);
  }
  return sayi;
}

/**
 * Açık-adım GÖSTERİM özeti (GBR-A02 · IDA dogfood #14): çok beklemede-Adım'lı
 * planda (EVRE-1'in tipik hâli) her adımı tek tek dökmek yerine BEKLEMEDE olanları
 * TEK satırda toplar ('N adım beklemede — planlamada normal', ilk birkaçı örnek);
 * geliştirmede Adımlar (AKTİF cephe) ayrıntısını KORUR. Motor susmaz (YAS-3.4): iş
 * GİZLENMEZ, özetlenir — sayı ve örnek görünür kalır. Az beklemede (< eşik) mevcut
 * ayrıntılı davranışı sürdürür. Bu SAYIM değil GÖSTERİM katmanıdır — motor-susmaz
 * hükmü için çağıran TAM listeyi (acikAdimTanilari) ayrıca sayar (özet sayıyı bozmaz).
 */
export function acikAdimGosterimi(
  acik: ReadonlyArray<{ dosya: string; tani: Tani }>,
  esik = 4,
): Array<{ dosya: string; tani: Tani }> {
  const beklemedeMi = (t: Tani) => t.mesaj.includes("('beklemede')");
  const beklemede = acik.filter((a) => beklemedeMi(a.tani));
  const gelistirmede = acik.filter((a) => !beklemedeMi(a.tani));
  if (beklemede.length < esik) return [...acik];   // az beklemede → ayrıntı korunur (mevcut davranış)
  const kodCek = (t: Tani) => t.mesaj.match(/"([^"]+)"/)?.[1] ?? "?";   // mesajdaki ilk tırnak = Adım kodu
  const ornek = beklemede.slice(0, 3).map((a) => kodCek(a.tani)).join(" · ");
  const artan = beklemede.length > 3 ? " …" : "";
  const ilk = beklemede[0];
  const ozet = {
    dosya: ilk.dosya,
    // Katlanan bulguların sayısı satırın üstünde taşınır (ozetlenen): akışı
    // okuyan sayaç satırları değil GERÇEK bulguları toplayabilsin.
    tani: {
      ...eskiTani("açık-adım", "bilgi",
        { özet: true, sayı: beklemede.length, örnek: ornek, artan },
        { satir: ilk.tani.satir, sutun: ilk.tani.sutun }),
      ozetlenen: beklemede.length,
    },
  };
  return [...gelistirmede, ozet];   // AKTİF cephe (geliştirmede) ayrıntılı + tek beklemede özeti
}

/**
 * Açık-hatırlatıcı GÖSTERİM özeti (hatırlatıcı-rayı turu · IDA dogfood oturum-2 · FİKİR-2): çok
 * açık/kararlaşmış Hatırlatıcı tanısını (hatirlatmaDenetle · dogrulayici) tek satırda
 * toplar — açık-adım özetiyle (acikAdimGosterimi) BİREBİR desen. Eşik-altında ayrıntı
 * korunur. GÖSTERİM katmanı — editör/MCP per-node tanıyı SÜRDÜRÜR (yalnız CLI denetle
 * gürültüsü sadeleşir); bilgi düzeyi, sayım/kapı etkilenmez.
 */
export function acikHatirlaticiGosterimi(
  tanilar: ReadonlyArray<{ dosya: string; tani: Tani }>,
  esik = 4,
): Array<{ dosya: string; tani: Tani }> {
  if (tanilar.length < esik) return [...tanilar];   // az → ayrıntı korunur
  const acik = tanilar.filter((t) => t.tani.kod === "açık-hatırlatıcı").length;
  const kararlasmis = tanilar.length - acik;
  const kimlikCek = (t: Tani) => t.mesaj.match(/\(([^)·]+)/)?.[1]?.trim() ?? "?";   // mesajdaki parantez-içi kimlik
  const ornek = tanilar.slice(0, 3).map((t) => kimlikCek(t.tani)).join(" · ");
  const ilk = tanilar[0];
  return [{
    dosya: ilk.dosya,
    // Katlanan bulguların sayısı satırın üstünde taşınır (ozetlenen) — özet
    // bir saklama değil bir devretmedir.
    tani: {
      ...eskiTani("açık-hatırlatıcı", "bilgi",
        { özet: true, sayı: tanilar.length, açık: acik, kararlaşmış: kararlasmis, örnek: ornek },
        { satir: ilk.tani.satir, sutun: ilk.tani.sutun }),
      ozetlenen: tanilar.length,
    },
  }];
}

// ═══ MIM-1.2 · Faz vade nöbeti (Faz=ZAMAN ekseni takvim kazanır) ═════════════
//
//   Founder (2026-07-12): "Faz zaman planlaması olsun — makine zamanı takip etsin;
//   yaklaşan/geçmiş işleri söylesin; fazın içine Blok koyduysan bitirmek için tarih
//   istesin." Determinizm hatırlatıcı-vade ile AYNI: `bugun` DIŞARIDAN enjekte
//   (CLI --tarih · test sabit-tarih), düzey BİLGİ (TAM-yeşil güne bağlanmaz).
//   Founder genişletmesi (2026-07-12 · TERFİ sonrası): "fazlar bir tarih istemeli"
//   — göç bitti, facet-Faz kalmadı → HER Faz hedefTarih ister (bilgi düzeyi).

// göç motor turu A10 kapanışı (2026-07-27): takvim nöbetinin üç tanısı emekli edilince
// eşik sabiti, açık-iş yardımcısı ve 'belirsiz tarih' sözlüğü de çağrısız kaldı;
// üçü birlikte kaldırıldı — ölü iz bırakılmadı (STR-5).

/** Ay-hassasiyetli tarih (MIM-1.2 ③): "YYYY-AA" geçerli taahhüttür — vade nöbeti
 *  ayın son gününü esas alır; motor nazikçe gün sorar (günsüz-tarih · bilgi). */
const AY_TARIH = /^\d{4}-\d{2}$/;
function aySonu(ay: string): string {
  const [y, m] = ay.split("-").map(Number);
  return `${ay}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
}

/**
 * Faz tarih tanıları (SAF · bugun enjekte). göç motor turu A10 kapanışı sonrası tek hüküm
 * kalmıştır: ay hassasiyetiyle yazılmış hedef tarihte motor nazikçe gün sorar
 * (`günsüz-tarih` · bilgi). Gecikme, yaklaşan vade ve tarihsizlik nöbetleri
 * emekli edildi; MIM-1.2 uyarınca tarih güçlü tavsiyedir ve eksikliği ihlal değildir.
 * @param dosya programın yolu — MIM-1.2 zaman hatırlatmaları ders dünyasını (INDEKS_DISI ·
 *   OGR-5 kapsam kanonu) muaf tutar; boş verilirse muafiyet uygulanmaz (ürün sayılır).
 */
export function fazVadeTanilari(program: Program, bugun: string, dosya = ""): Tani[] {
  const out: Tani[] = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(bugun)) return out;
  const gez = (d: Dugum): void => {
    if (d.tur === "widget" && d.ad === "Faz") {
      const alan = (ad: string) => [...d.parametreler, ...d.ozellikler].find((p) => p.ad === ad)?.deger;
      const kod = alan("kod")?.metin ?? d.ad;
      const tarih = alan("hedefTarih");
      const ham = tarih?.metin?.trim();
      // Sol zemin denetimi (2026-07-20): TAKVİM gerçeği — 13. ay ya da şubat-31 gibi
      // takvim-dışı değer vade hesabına GİRMEZ (tür-uyarısı dogrulayici'de konuşur;
      // burada sessiz düşer — çift tanı basılmaz, ②-B10 dersi).
      const takvimde = (t: string): boolean => {
        const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(t);
        if (!m) return false;
        if (+m[2] < 1 || +m[2] > 12) return false;
        return m[3] === undefined || (+m[3] >= 1 && +m[3] <= new Date(+m[1], +m[2], 0).getDate());
      };
      const tamTarih = ham && /^\d{4}-\d{2}-\d{2}$/.test(ham) && takvimde(ham) ? ham : undefined;
      const ayTarih = ham && AY_TARIH.test(ham) && takvimde(ham) ? ham : undefined;
      // MIM-1.2 (Founder 2026-07-19 · eski kesin-tarih zorunluluğunun revizesi): tarih GÜÇLÜ TAVSİYEDİR,
      // dayatma değil — motor hatırlatır, yol kesmez. Vade nöbeti tam tarihle tam,
      // ay hassasiyetiyle ay-sonu esaslı çalışır; tarihsiz/belirsiz yalnız hatırlatılır.
      const vade = tamTarih ?? (ayTarih ? aySonu(ayTarih) : undefined);
      if (vade) {
        if (ayTarih && !INDEKS_DISI.test(dosya)) {
          out.push(eskiTani("günsüz-tarih", "bilgi",
            { kod, ayTarihi: ayTarih, vade }, { satir: tarih!.satir, sutun: tarih!.sutun }));
        }
        // göç motor turu A10 kapanışı (2026-07-27): `faz-gecikti` ile `faz-yaklaşıyor` emekli
        // edildi. Takvim nöbeti Fazın kanonik zaman anlamından (MIM-1.2) ayrıldı;
        // MIM-1.2 uyarınca tarih güçlü tavsiyedir ve yaklaşan vade bildirimi
        // kanonik zorlama değildir. Ölçüm: ikisi de canlı bahçede sıfır bulgu.
      }
      // göç motor turu A10 kapanışı: `faz-tarihsiz` emekli edildi — tarih isteğe bağlı olduğundan
      // eksik tarih yeni omurgada ihlal değildir (MIM-1.2). Ölçüm: sıfır bulgu.
    }
    for (const c of d.cocuklar) gez(c);
  };
  for (const b of program.bildirimler) gez(b);
  return out;
}

// ═══════════════════════════════════════════════════════════════════════════
// YENİ KANON · PROJE KAPSAMI (motor turu ikinci halkası · elli beş tanı)
//
//   Bu bölümdeki üreticiler kararlarını tek bir dosyadan veremez: rejim, Proje
//   kimliği, disk mutabakatı, çok-dosya referansı, Katman teknoloji tekilliği
//   ve yüzey etkisi ancak bütün Proje indeksi okunduktan sonra konuşabilir.
//   Veri akışı mevcut hiyerarşi ve teknoloji emsallerinin akışını yeniden
//   kullanır: programlar haritası, KOD indeksi, disk anlık görüntüsü.
//
//   TERFİ KADEMESİ: bu tanıların hepsi bugün gözlem düzeyinde konuşur. Düzeyin
//   yükseltilmesi kanıt ister ve ayrı bir terfi turunun işidir; sicil her
//   tanının hem bugünkü kademesini hem kanonun hedeflediği düzeyi taşır.
// ═══════════════════════════════════════════════════════════════════════════

/** Bir düğümün parametre ya da gövde alanını bulur. */
function yeniAlan(d: Dugum, ad: string): Param | undefined {
  return d.parametreler.find((p) => p.ad === ad) ?? d.ozellikler.find((p) => p.ad === ad);
}

/** Alanın düz metin değeri. */
function yeniAlanMetin(d: Dugum, ad: string): string | undefined {
  return yeniAlan(d, ad)?.deger.metin;
}

/** Alanın liste üyeleri (tekil değer de tek üyeli liste sayılır). */
function yeniListe(d: Dugum, ad: string): Deger[] {
  const p = yeniAlan(d, ad);
  if (!p) return [];
  return p.deger.tur === "liste" ? (p.deger.ogeler ?? []) : [p.deger];
}

/** Düğümün kimliği — kod yoksa tip adı. */
function yeniKimlik(d: Dugum): string {
  return yeniAlanMetin(d, "kod") ?? d.ad;
}

interface Yerlesim {
  dosya: string;
  d: Dugum;
  /** kökten bu düğüme kadar olan atalar (en yakın ata en sonda). */
  atalar: Dugum[];
}

/** Bütün programlardaki widget düğümlerini atalarıyla birlikte dolaşır. */
function yeniDugumler(programlar: ReadonlyMap<string, Program>, muaflar?: ReadonlySet<string>): Yerlesim[] {
  const out: Yerlesim[] = [];
  for (const [dosya, program] of programlar) {
    if (muaflar?.has(dosya)) continue;
    const gez = (d: Dugum, atalar: Dugum[]): void => {
      out.push({ dosya, d, atalar });
      const alt = [...atalar, d];
      for (const c of d.cocuklar) gez(c, alt);
      icin(d, (v) => { if (v.tur === "widget" && v.dugum) gez(v.dugum, alt); });
    };
    for (const b of program.bildirimler) gez(b, []);
  }
  return out;
}

/** Ders/örnek dünyası bilinçli olarak eksik yazılır — ürün hükmü oraya inmez. */
function ogretimDunyasi(dosya: string): boolean {
  return INDEKS_DISI.test(dosya);
}

// ── Rejim (üç tanı) ─────────────────────────────────────────────────────────

/**
 * Rejim sözleşmesi: her Proje zorlama rejimini tam bir kez ve yalnız katı ya da
 * esnek değeriyle beyan eder; katı rejimde Katman doğrudan Adım taşıyamaz ve
 * beyan ile yapı ayrıştığında motor yapıyı kendiliğinden dönüştürmez.
 */
export function rejimTanilari(
  programlar: ReadonlyMap<string, Program>,
  muaflar?: ReadonlySet<string>,
): Array<{ dosya: string; tani: Tani }> {
  const out: Array<{ dosya: string; tani: Tani }> = [];
  const izinli = new Set(["katı", "esnek"]);

  for (const { dosya, d } of yeniDugumler(programlar, muaflar)) {
    if (d.tur !== "widget" || d.ad !== "Proje") continue;
    if (ogretimDunyasi(dosya)) continue;
    const beyanlar = [...d.parametreler, ...d.ozellikler].filter((p) => p.ad === "rejim");
    const kimlik = yeniKimlik(d);

    if (beyanlar.length === 0) {
      out.push({ dosya, tani: yeniTani("rejim-beyanı-eksik", { kimlik }, d) });
    } else if (beyanlar.length > 1) {
      out.push({ dosya, tani: yeniTani("rejim-beyanı-eksik",
        { kimlik, kusur: ` ve beyanı ${beyanlar.length} kez yazmış` }, beyanlar[1]) });
    } else if (!izinli.has(beyanlar[0].deger.metin ?? "")) {
      out.push({ dosya, tani: yeniTani("rejim-beyanı-eksik",
        { kimlik, kusur: `; beyan "${beyanlar[0].deger.metin ?? ""}" değerini taşıyor` }, beyanlar[0]) });
    }

    const rejim = beyanlar.length === 1 ? beyanlar[0].deger.metin : undefined;
    if (rejim !== "katı") continue;

    // Katı rejim normu: Katman → Adım yolu en az bir departman kademesinden geçer.
    const katiGez = (n: Dugum): void => {
      if (n.ad === "Katman") {
        for (const c of n.cocuklar) {
          if (c.tur === "widget" && c.ad === "Adım") {
            out.push({ dosya, tani: yeniTani("katı-rejim-altkatman-eksik", { kimlik: yeniKimlik(n) }, c) });
            break;
          }
        }
      }
      for (const c of n.cocuklar) katiGez(c);
    };
    katiGez(d);

    // Rejim geçişi: katı rejimde departman beyanı taşımayan kademeler geçiş borcudur.
    let departmansiz = 0;
    const gecisGez = (n: Dugum): void => {
      if (n.ad === "AltKatman" && !yeniAlanMetin(n, "departman")) departmansiz++;
      for (const c of n.cocuklar) gecisGez(c);
    };
    gecisGez(d);
    if (departmansiz > 0) {
      out.push({ dosya, tani: yeniTani("rejim-geçiş-uyumsuzluğu",
        { kimlik, rejim: "katı", kusur: `${departmansiz} departman kademesi hangi sorumluluğu taşıdığını beyan etmiyor` }, d) });
    }
  }
  return out;
}

// ── Mimari omurga (beş tanı) ────────────────────────────────────────────────

/** Üretken kademeler — Proje köküne bağlanmak zorunda olan düğüm tipleri. */
const URETKEN_KADEMELER: ReadonlySet<string> = new Set(["Faz", "Blok", "Katman", "AltKatman", "Adım", "Meyve"]);
/** Proje kökü sayılan tipler. */
const PROJE_KOKLERI: ReadonlySet<string> = new Set(["Proje", "ÇalışmaAlanı", "Uygulama"]);
/** Dosya beyanı zorunlu Meyve türleri. */
const DOSYA_ZORUNLU_MEYVE: ReadonlySet<string> = new Set(["Kod", "Ekran", "Uç", "Sözleşme"]);

/**
 * MIM-2.1 yol hükmü — Meyve ile Kod düğümünün ORTAK disk doğrulaması: beyan
 * edilen yol boş olamaz, proje kökünün dışına taşamaz ve anlık görüntüde
 * çözülmek zorundadır. Dönüş, tanının `kusur` cümlesidir; kusursuz yol
 * undefined döndürür. Anlık görüntünün KÖR NOKTASI ayrıca tanınır: diskTara
 * nokta-önekli girdileri ve YOKSAY klasörlerinin içeriğini taramadığından
 * oradaki bir yolun varlığı buradan ölçülemez — ölçülemeyen beyan hakkında
 * motor "diskte yok" hükmü vermez ve susar (V1B-KODMEYVE-A01 saha bulgusu:
 * `sablon/dongu.sar` ile `eklenti/.gitignore` diskte yaşarken suçlanıyordu).
 */
function dosyaBeyaniKusuru(yol: string, diskYollari: ReadonlySet<string>): string | undefined {
  if (!yol) return "dosya beyanı yazılmamış";
  if (yol.startsWith("/") || yol.startsWith("..")) return `beyan edilen yol proje kökünün dışına taşıyor ("${yol}")`;
  const temiz = yol.replace(/^\.\//, "");
  if (temiz.split("/").some((parca) => parca.startsWith(".") || YOKSAY.has(parca))) return undefined;
  if (!diskYollari.has(temiz)) return `beyan edilen yol diskte çözülmüyor ("${yol}")`;
  return undefined;
}

/**
 * Üretim ağacının kök, teknoloji, atomiklik ve teslim hükümleri: her üretken
 * düğüm bir Proje köküne bağlanır, her Katman tam olarak bir teknoloji dalını
 * temsil eder, her Adım tek kabul kapısıyla en az bir Meyve teslim eder ve her
 * Meyve üreten Adımını ve dosya yerini gösterir.
 */
export function omurgaTanilari(
  programlar: ReadonlyMap<string, Program>,
  indeks: KodIndeks,
  disk: DiskAnlikGoruntu,
  muaflar?: ReadonlySet<string>,
): Array<{ dosya: string; tani: Tani }> {
  const out: Array<{ dosya: string; tani: Tani }> = [];
  const dugumler = yeniDugumler(programlar, muaflar);

  // Proje kökü ilan eden dosyalar, kökün yol bildirileri altında yaşayan
  // kaynaklar ve onlardan çağrı zinciriyle ulaşılan dosyalar.
  const kokDosyalar = new Set<string>();
  for (const { dosya, d } of dugumler) if (PROJE_KOKLERI.has(d.ad)) kokDosyalar.add(dosya);
  if (kokDosyalar.size) {
    const kokBildirileri = new Set(kokDosyalar);
    const ilanliYollar = dugumler
      .filter(({ dosya }) => kokBildirileri.has(dosya))
      .map(({ d }) => yeniAlanMetin(d, "yol"))
      .filter((yol): yol is string => Boolean(yol))
      .map((yol) => yol.replace(/^\.\//, "").replace(/\\/g, "/").replace(/\/+$/, ""))
      .filter(Boolean);
    for (const dosya of programlar.keys()) {
      if (ilanliYollar.some((yol) => dosya === yol || dosya.startsWith(yol + "/"))) kokDosyalar.add(dosya);
    }
    const cagrilar = new Map<string, Set<string>>();
    for (const [dosya, program] of programlar) {
      const hedefler = new Set<string>();
      const gez = (d: Dugum): void => {
        if (d.tur === "çağır") {
          const t = indeks.get(d.ad)?.dosya;
          if (t) hedefler.add(t);
        }
        for (const c of d.cocuklar) gez(c);
      };
      for (const b of program.bildirimler) gez(b);
      cagrilar.set(dosya, hedefler);
    }
    const kuyruk = [...kokDosyalar];
    while (kuyruk.length) {
      const su = kuyruk.pop()!;
      for (const h of cagrilar.get(su) ?? []) if (!kokDosyalar.has(h)) { kokDosyalar.add(h); kuyruk.push(h); }
    }
  }

  const meyveler: Yerlesim[] = [];
  const kodDugumleri: Yerlesim[] = [];
  const uretilenKodlar = new Set<string>();

  for (const y of dugumler) {
    const { dosya, d, atalar } = y;
    if (d.tur !== "widget") continue;
    if (ogretimDunyasi(dosya)) continue;

    for (const o of yeniListe(d, "üretir")) if (o.metin) uretilenKodlar.add(o.metin);
    if (d.ad === "Meyve") meyveler.push(y);
    if (d.ad === "Kod") kodDugumleri.push(y);

    // Proje kökü: üretken kademe hiçbir Proje köküne bağlı değilse kimlik türetilemez.
    if (URETKEN_KADEMELER.has(d.ad) && kokDosyalar.size > 0 && !kokDosyalar.has(dosya)
        && !atalar.some((x) => PROJE_KOKLERI.has(x.ad))) {
      out.push({ dosya, tani: yeniTani("proje-köksüz-üretim", { ad: d.ad, kimlik: yeniKimlik(d) }, d) });
    }

    // Teknoloji tekilliği: Katman tam olarak bir somut Teknolojiye bağlanır.
    if (d.ad === "Katman") {
      const hedefler = yeniListe(d, "kullanır").map((v) => v.metin).filter(Boolean) as string[];
      if (hedefler.length > 1) {
        out.push({ dosya, tani: yeniTani("çok-teknolojili-katman",
          { kimlik: yeniKimlik(d), hedefler: hedefler.join(" · ") }, d) });
      }
    }

    // Adım atomikliği: tek kabul kapısı ve en az bir Meyve.
    if (d.ad === "Adım") {
      const kapilar = d.cocuklar.filter((c) => c.tur === "widget" && c.ad === "Kapı");
      if (kapilar.length > 1) {
        out.push({ dosya, tani: yeniTani("adım-atomikliği",
          { kimlik: yeniKimlik(d), kusur: `${kapilar.length} ayrı kabul kapısı taşıyor` }, kapilar[1]) });
      }
      if (yeniAlanMetin(d, "durum") === "tamamlandı" && yeniListe(d, "üretir").length === 0) {
        out.push({ dosya, tani: yeniTani("adım-atomikliği",
          { kimlik: yeniKimlik(d), kusur: "tamamlandı ilan edilmiş ama hiçbir Meyve teslim etmemiş" }, d) });
      }
    }
  }

  // Meyve hükümleri: üretim kökeni ve dosya beyanı.
  const diskYollari = new Set(disk.girdiler.filter((g) => g.tur === "dosya").map((g) => g.yol));
  for (const { dosya, d, atalar } of meyveler) {
    const kimlik = yeniKimlik(d);
    const uretenAta = atalar.some((x) => x.ad === "Adım");
    if (!uretenAta && !uretilenKodlar.has(kimlik)) {
      out.push({ dosya, tani: yeniTani("üretimsiz-meyve", { kimlik }, d) });
    }
    const tur = yeniAlanMetin(d, "tür") ?? "";
    if (!DOSYA_ZORUNLU_MEYVE.has(tur)) continue;
    const kusur = dosyaBeyaniKusuru(yeniAlanMetin(d, "dosya")?.trim() ?? "", diskYollari);
    if (kusur) {
      out.push({ dosya, tani: yeniTani("meyve-dosyası-eksik", { kimlik, tur, kusur }, d) });
    }
  }

  // Kod hükümleri (V1B-KODMEYVE-A01 · MIM-2.1 genişletmesi): Kod düğümü ürün
  // ailesinin somut kaynak-kod meyvesidir; `dosya` beyan ettiğinde beyan Meyve
  // ile AYNI üç şarttan geçer — boş olmayan, proje kökü içinde kalan ve diskte
  // çözülen yol. Beyansız Kod düğümü bu denetimden bilinçli olarak muaftır,
  // çünkü alanı zorunlu kılmak MIM-2.1'in kapsamını Meyve türlerinden Kod
  // tipine genişleten yeni bir kanon hükmü ister ve kanon hükmü Founder
  // kapısıdır; bu tur yalnız yazılmış beyanın doğruluğunu ölçer.
  for (const { dosya, d } of kodDugumleri) {
    const beyan = yeniAlan(d, "dosya");
    if (!beyan) continue;
    const kusur = dosyaBeyaniKusuru((beyan.deger.metin ?? "").trim(), diskYollari);
    if (kusur) {
      out.push({ dosya, tani: yeniTani("meyve-dosyası-eksik",
        { kimlik: yeniKimlik(d), tur: "Kod", tip: "Kod", kusur }, d) });
    }
  }
  return out;
}

// ── İlişki sınıfları ve yürütme (on tanı) ───────────────────────────────────

/** Mimari kapsama zincirinin ardışık kademeleri. */
const KADEME_SIRASI: readonly string[] = ["Blok", "Katman", "AltKatman", "Adım"];
/** Yürütme sırası kuran kenarlar. */
const YURUTME_KENARLARI: readonly string[] = ["bağımlı", "besler"];
/** Üretim kenarının izinli hedef tipleri — teslim edilebilir ürün rolleri. */
const URUN_TIPLERI: ReadonlySet<string> = new Set([
  "Meyve", "Kod", "Ayar", "Sözleşme", "Altyapı", "Veri", "Göç",
  "Ekran", "Uç", "Karar", "Sayfa", "Bileşen", "Servis", "Tablo",
]);
/** Yürütme sırası taşıyamayan kapsayıcı kademeler. */
const KAPSAYICI_KADEMELER: ReadonlySet<string> = new Set(["Faz", "Blok", "Katman", "AltKatman"]);
/**
 * ZEMİN BAĞI HEDEFLERİ — kapsayıcının `bağımlı` kenarı bu tiplere yöneldiğinde
 * yürütme sırası DEĞİL, teknoloji ya da takım zemini kurulur ve kenar meşrudur.
 *
 * Bu ayrım kanonun kendi iki hükmünü birlikte okumaktan doğar. MIM ve ORK
 * bölümleri `katmansız-teknoloji` tanısıyla Katman'ın teknoloji bağı taşımasını
 * ZORUNLU kılar ("Katman bir teknoloji dilimidir"); ORK-1.2 ise `kapsayıcı-kenar`
 * tanısıyla YÜRÜTME sırasının kapsayıcıda değil Adım'da kurulmasını şart koşar.
 * İkisi çelişmez, çünkü iki ayrı kenardan söz ederler — fakat ikisi de aynı alan
 * adını kullanır. Dolayısıyla ayrımı yapabilecek tek ölçüt HEDEFİN TİPİDİR.
 *
 * Ölçülmüş kusur (2026-07-29): kural hedefe hiç bakmadan ateşliyordu ve yüz
 * altmış altı bulgunun tamamı yanlış pozitifti — yüz on beşi Takım, otuzu
 * Teknoloji hedefliyordu, yani hiçbiri yürütme kenarı değildi. Motor kendi
 * karşılama kartının öğrettiği deseni ihlal sayıyordu.
 *
 * TEK KAYNAK (2026-07-29): bu küme bir kez `dag.ts` içinde yaşar ve buraya içe
 * alınır. Eskiden iki dosyada iki ayrı ad altında iki kez yazılıydı; aynı kavramın
 * iki kopyası, ilk tek-taraflı değişiklikte motorun tanısı ile grafın çizimini
 * sessizce ayrıştırırdı. Kavramın evi graftır, çünkü mesele kenarın anlamıdır.
 */
const ZEMIN_BAGI_TIPLERI: ReadonlySet<string> = ZEMIN_TIPLERI;

/**
 * İlişki sınıfları ve yürütme sözleşmesi: mimari görünürlük, Adım sırası ve
 * üretim kökeni birbirinin anlamını üstlenemez; yürütme sırası yalnız Adımlar
 * arasındaki kenarlardan türer; başka Projedeki hedef açık ad-alanı ister;
 * Döngü sonlanma güvencesi, Kapı ise kabul kanıtı taşır.
 */
export function iliskiSinifiTanilari(
  programlar: ReadonlyMap<string, Program>,
  indeks: KodIndeks,
  muaflar?: ReadonlySet<string>,
): Array<{ dosya: string; tani: Tani }> {
  const out: Array<{ dosya: string; tani: Tani }> = [];
  const dugumler = yeniDugumler(programlar, muaflar).filter((y) => y.d.tur === "widget" && !ogretimDunyasi(y.dosya));
  const tipOf = new Map<string, string>();
  for (const { d } of dugumler) {
    const k = yeniAlanMetin(d, "kod");
    if (k && !tipOf.has(k)) tipOf.set(k, d.ad);
  }
  // Proje kimlik alanı: her dosyanın hangi Proje koduna düştüğü.
  const dosyaProjesi = new Map<string, string>();
  for (const { dosya, d } of dugumler) {
    if (d.ad === "Proje" && !dosyaProjesi.has(dosya)) dosyaProjesi.set(dosya, yeniKimlik(d));
  }

  for (const { dosya, d, atalar } of dugumler) {
    const kimlik = yeniKimlik(d);

    // İlişki sınıfı: aynı bağlantı iki ayrı sınıfta yinelenemez.
    const yurutmeHedefleri = new Set<string>();
    for (const kenar of YURUTME_KENARLARI) {
      for (const o of yeniListe(d, kenar)) if (o.metin) yurutmeHedefleri.add(o.metin);
    }
    for (const o of yeniListe(d, "üretir")) {
      if (o.metin && yurutmeHedefleri.has(o.metin)) {
        out.push({ dosya, tani: yeniTani("ilişki-sınıfı-ihlali",
          { kimlik, kenar: "üretir", kusur: `"${o.metin}" hedefi hem üretim kökeni hem yürütme sırası kenarında yazılmış` }, o) });
      }
    }
    for (const o of yeniListe(d, "içerir")) {
      if (o.metin && yurutmeHedefleri.has(o.metin)) {
        out.push({ dosya, tani: yeniTani("ilişki-sınıfı-ihlali",
          { kimlik, kenar: "içerir", kusur: `"${o.metin}" hedefi hem kapsama hem yürütme sırası kenarında yazılmış` }, o) });
      }
    }

    // Mimari kapsama: kademe atlanamaz, eş kademe kapsama kuramaz.
    const enYakinKademe = [...atalar].reverse().find((x) => KADEME_SIRASI.includes(x.ad));
    if (KADEME_SIRASI.includes(d.ad) && enYakinKademe) {
      const ustSira = KADEME_SIRASI.indexOf(enYakinKademe.ad);
      const altSira = KADEME_SIRASI.indexOf(d.ad);
      if (altSira === ustSira) {
        out.push({ dosya, tani: yeniTani("mimari-bağı-ihlali",
          { kimlik, kusur: `"${enYakinKademe.ad}" kademesi kendi eşini sarıyor` }, d) });
      } else if (altSira > ustSira + 1 && !(enYakinKademe.ad === "Katman" && d.ad === "Adım")) {
        out.push({ dosya, tani: yeniTani("mimari-bağı-ihlali",
          { kimlik, kusur: `"${enYakinKademe.ad}" kademesinden "${d.ad}" kademesine geçilirken ara kademe atlanmış` }, d) });
      }
    }

    // Yürütme kenarı sözleşmesi: uçlar Adım olmalı, aynı çift yinelenmemeli.
    for (const kenar of YURUTME_KENARLARI) {
      const hedefler = yeniListe(d, kenar);
      // Kapsayıcının kenarı ancak YÜRÜTME hedefine yöneldiğinde ihlaldir; teknoloji
      // ya da takım zeminine yönelen kenar kanonun ZORUNLU kıldığı bağdır (yukarıdaki
      // ZEMIN_BAGI_TIPLERI yorumuna bakınız). Hedefi çözülemeyen kenar ihlal SAYILMAZ:
      // çözülemeyen atıf kırık-referans tanısının işidir ve iki tanı aynı kusuru iki
      // kez saymaz.
      const yurutmeHedefi = hedefler.some((o) => {
        const t = o.metin ? tipOf.get(o.metin) : undefined;
        return t !== undefined && !ZEMIN_BAGI_TIPLERI.has(t);
      });
      if (yurutmeHedefi && d.ad !== "Adım" && KAPSAYICI_KADEMELER.has(d.ad)) {
        out.push({ dosya, tani: yeniTani("yürütme-kenarı-sözleşmesi",
          { kimlik, kenar, kusur: `kenarın kaynağı "${d.ad}" kademesi, oysa yürütme sırası yalnız Adımlar arasında kurulur` }, d) });
      }
      const gorulen = new Set<string>();
      for (const o of hedefler) {
        const h = o.metin;
        if (!h) continue;
        if (gorulen.has(h)) {
          out.push({ dosya, tani: yeniTani("yürütme-kenarı-sözleşmesi",
            { kimlik, kenar, kusur: `"${h}" hedefi aynı kenarda ikinci kez yazılmış` }, o) });
          continue;
        }
        gorulen.add(h);
        const hedefTip = tipOf.get(h);
        if (d.ad === "Adım" && hedefTip && hedefTip !== "Adım") {
          out.push({ dosya, tani: yeniTani("yürütme-kenarı-sözleşmesi",
            { kimlik, kenar, kusur: `"${h}" hedefi "${hedefTip}" tipinde, oysa yürütme kenarı yalnız Adıma yönelir` }, o) });
        }
      }
    }

    // Üretim kökeni: üretir yalnız Adımdan Meyveye yönelir.
    const uretimHedefleri = yeniListe(d, "üretir");
    if (uretimHedefleri.length && d.ad !== "Adım") {
      out.push({ dosya, tani: yeniTani("üretim-kökeni-ihlali",
        { kimlik, kusur: `kenarın kaynağı "${d.ad}" tipinde, oysa üretim kökeni yalnız Adımdan doğar` }, d) });
    }
    for (const o of uretimHedefleri) {
      const hedefTip = o.metin ? tipOf.get(o.metin) : undefined;
      if (!hedefTip || URUN_TIPLERI.has(hedefTip)) continue;
      out.push({ dosya, tani: yeniTani("üretim-kökeni-ihlali",
        { kimlik, kusur: `hedefi "${hedefTip}" tipinde; teslim olmayan bir düğüme yönelen bu kenar yürütme sırası kurar` }, o) });
    }

    // Kullanır kenarı: yalnız Proje→kimlik kökü ve Katman→Teknoloji çiftleri.
    const kullanirlar = yeniListe(d, "kullanır");
    if (kullanirlar.length) {
      if (d.ad !== "Proje" && d.ad !== "Katman" && d.ad !== "AltKatman") {
        out.push({ dosya, tani: yeniTani("kullanır-kenarı-ihlali",
          { kimlik, kusur: `kenarın kaynağı "${d.ad}" tipinde` }, d) });
      } else if (kullanirlar.length > 1) {
        out.push({ dosya, tani: yeniTani("kullanır-kenarı-ihlali",
          { kimlik, kusur: `kenar ${kullanirlar.length} hedefe yöneliyor, oysa tekil olmak zorundadır` }, d) });
      } else {
        const hedefTip = tipOf.get(kullanirlar[0].metin ?? "");
        const beklenen = d.ad === "Proje" ? "KimlikKökü" : "Teknoloji";
        if (hedefTip && hedefTip !== beklenen && !(d.ad !== "Proje" && hedefTip === "Takım")) {
          out.push({ dosya, tani: yeniTani("kullanır-kenarı-ihlali",
            { kimlik, kusur: `hedef "${hedefTip}" tipinde, oysa "${beklenen}" bekleniyordu` }, kullanirlar[0]) });
        }
      }
    }

    // Deterministik sıra: kapsayıcı kademe iş önceliği yazamaz.
    if (KAPSAYICI_KADEMELER.has(d.ad) && yeniAlan(d, "sıra")) {
      out.push({ dosya, tani: yeniTani("deterministik-sıra-ihlali",
        { kimlik, kusur: `"${d.ad}" kademesi kendi üstünde bir sıra alanı taşıyor` }, d) });
    }

    // Çapraz Proje ad-alanı: başka Projedeki hedef açık nitelik ister.
    const buProje = dosyaProjesi.get(dosya);
    if (buProje) {
      for (const kenar of [...YURUTME_KENARLARI, "referans", "uygular", "kullanır"]) {
        for (const o of yeniListe(d, kenar)) {
          const h = o.metin;
          if (!h || h.includes("::")) continue;
          const hedefDosya = indeks.get(h)?.dosya;
          if (!hedefDosya) continue;
          const hedefProje = dosyaProjesi.get(hedefDosya);
          if (hedefProje && hedefProje !== buProje) {
            out.push({ dosya, tani: yeniTani("çapraz-proje-ad-alanı",
              { kimlik, kenar, hedef: h, onerilen: `${hedefProje}::${h}` }, o) });
          }
        }
      }
    }

    // Seçilebilir Adım: öncülü kapanmadan iş yürütülemez.
    if (d.ad === "Adım" && yeniAlanMetin(d, "durum") === "geliştirmede") {
      for (const o of yeniListe(d, "bağımlı")) {
        const h = o.metin;
        if (!h) continue;
        const oncul = dugumler.find((y) => y.d.ad === "Adım" && yeniAlanMetin(y.d, "kod") === h);
        if (!oncul) continue;
        const durum = yeniAlanMetin(oncul.d, "durum") ?? "beklemede";
        if (durum !== "tamamlandı") {
          out.push({ dosya, tani: yeniTani("seçilemez-adım-yürütümü",
            { kimlik, kusur: `öncülü "${h}" hâlâ "${durum}" durumunda` }, o) });
        }
      }
    }

    // Döngü işletimi: çözülebilir hedef ve sonlanma güvencesi.
    if (d.ad === "Döngü") {
      const kusurlar: string[] = [];
      const kosar = yeniListe(d, "koşar").map((v) => v.metin).filter(Boolean) as string[];
      if (!kosar.length) kusurlar.push("işletim hedefi yazılmamış");
      else for (const h of kosar) if (!indeks.has(h)) kusurlar.push(`işletim hedefi "${h}" hiçbir kaynakta tanımlı değil`);
      const durunca = yeniAlanMetin(d, "durunca")?.trim();
      const limit = yeniAlanMetin(d, "turLimiti")?.trim();
      if (!durunca && !limit) kusurlar.push("sonlanma koşulu yazılmamış");
      if (kusurlar.length) {
        out.push({ dosya, tani: yeniTani("döngü-sonlanması-eksik",
          { kimlik, kusur: kusurlar.join("; ") }, d) });
      }
    }

    // Kapı işletimi: kabul ölçütü ve doğrulanmış kanıt birlikte yazılır.
    if (d.ad === "Kapı") {
      const kabul = yeniListe(d, "kabul").length;
      const kanit = yeniAlanMetin(d, "kanıt")?.trim() ?? yeniAlanMetin(d, "doğrulama")?.trim();
      if (!kabul) {
        out.push({ dosya, tani: yeniTani("kapı-kabul-kanıtı-eksik",
          { kimlik, kusur: "kabul ölçütü yazılmamış" }, d) });
      } else if (yeniAlanMetin(d, "durum") === "geçildi" && !kanit) {
        out.push({ dosya, tani: yeniTani("kapı-kabul-kanıtı-eksik",
          { kimlik, kusur: "kapı geçildi işaretli ama doğrulanmış kanıt bağı yok" }, d) });
      }
    }
  }
  return out;
}

// ── Kimlik omurgası (iki tanı) ──────────────────────────────────────────────

/**
 * Kimlik omurgası: sağlayıcılar yalnız bir kimlik kökünün altında yaşar, ortak
 * kimlik bağı köke yönelir ve kurucu Projesi çalışma alanının tek ortak kökünü
 * zorunlu olarak gösterir.
 */
export function authTanilari(
  programlar: ReadonlyMap<string, Program>,
  muaflar?: ReadonlySet<string>,
): Array<{ dosya: string; tani: Tani }> {
  const out: Array<{ dosya: string; tani: Tani }> = [];
  const dugumler = yeniDugumler(programlar, muaflar).filter((y) => y.d.tur === "widget" && !ogretimDunyasi(y.dosya));
  const kokler = dugumler.filter((y) => y.d.ad === "KimlikKökü");
  const kokKodlari = new Set(kokler.map((y) => yeniKimlik(y.d)));

  for (const { dosya, d, atalar } of dugumler) {
    if (d.ad === "KimlikSağlayıcısı" && !atalar.some((x) => x.ad === "KimlikKökü")) {
      out.push({ dosya, tani: yeniTani("auth-omurgası-ihlali",
        { kimlik: yeniKimlik(d), kusur: "kimlik sağlayıcısı hiçbir kimlik kökünün altında yaşamıyor" }, d) });
    }
    if (d.ad === "KimlikPolitikası" && !atalar.some((x) => x.ad === "KimlikKökü")) {
      out.push({ dosya, tani: yeniTani("auth-omurgası-ihlali",
        { kimlik: yeniKimlik(d), kusur: "kimlik politikası kök dışında ilan edilmiş" }, d) });
    }
    if (d.ad !== "Proje") continue;

    const bagli = yeniListe(d, "kullanır").map((v) => v.metin).filter((v): v is string => Boolean(v));
    const kimlikBaglari = bagli.filter((h) => kokKodlari.has(h));
    if (kimlikBaglari.length > 1) {
      out.push({ dosya, tani: yeniTani("auth-omurgası-ihlali",
        { kimlik: yeniKimlik(d), kusur: `Proje ${kimlikBaglari.length} ayrı kimlik köküne bağlanmış` }, d) });
    }
    // Kurucu Projesi ortak kökü zorunlu gösterir.
    if (yeniAlanMetin(d, "kurucu") === "evet" || yeniAlanMetin(d, "rol") === "kurucu") {
      if (!kimlikBaglari.length) {
        out.push({ dosya, tani: yeniTani("founder-ortak-auth-eksik",
          { kimlik: yeniKimlik(d), kusur: "ortak kimlik köküne giden bağ hiç yazılmamış" }, d) });
      } else if (kokler.length > 1) {
        out.push({ dosya, tani: yeniTani("founder-ortak-auth-eksik",
          { kimlik: yeniKimlik(d), kusur: `çalışma alanında ${kokler.length} kimlik kökü var, oysa ortak kök tekil olmalıdır` }, d) });
      }
    }
  }
  return out;
}

// ── İş bölümü ve oturum (üç tanı) ───────────────────────────────────────────

/**
 * İş bölümü hükümleri: durum değişikliği doğrulanmış kabul kanıtına dayanır,
 * üretici ile denetçi rolleri ayrılır, bir koşum kaydı tam olarak bir işi
 * yürütür ve Etmen kadrosu RBAC yetki değişmezlerini (apex tekil · yönetici
 * üretemez · L5+paylaşık bellek yasak · L6 kalıcı atanamaz) taşır — V1B-RBAC-A01:
 * bu kapı `denetle-proje` akışının parçası olduğu için RBAC ihlalleri artık
 * diğer proje-çapı tanılarla aynı çıktıda, aynı HATA düzeyinde görünür (ORK-6.3);
 * ayrı `sarmal rbac <dizin>` alt-komutu aynı saf üreticiyi (rbacGrafDenetle)
 * AYNI kapsam süzgeciyle (rbacKapsami) çağırmaya devam eder — çift tarama değil,
 * tek üretici tek küme üzerinde iki yüzeyde okunur.
 */
export function sefAkisiTanilari(
  programlar: ReadonlyMap<string, Program>,
  muaflar?: ReadonlySet<string>,
): Array<{ dosya: string; tani: Tani }> {
  const out: Array<{ dosya: string; tani: Tani }> = [];
  // Kapsam kuralı burada KOPYALANMAZ, çağrılır: ders dünyası ile muaf dosyaların
  // elenmesi rbacKapsami içinde tek yerde yaşar ve ayrı alt komut da aynı işlevi
  // çağırır (OGR-5 · V1B-RBAC-A01). Süzgeç iki yerde yazıldığında iki yüzeyin
  // sayısı sessizce ayrışıyordu; ayrışma ders-dünyası yolunda ölçülmüştü.
  for (const kayit of rbacGrafDenetle(rbacKapsami(programlar, muaflar))) out.push(kayit);
  for (const { dosya, d } of yeniDugumler(programlar, muaflar)) {
    if (d.tur !== "widget" || ogretimDunyasi(dosya)) continue;
    const kimlik = yeniKimlik(d);

    if (d.ad === "Adım") {
      const uretici = yeniAlanMetin(d, "üretici");
      const denetci = yeniAlanMetin(d, "denetçi");
      if (uretici && denetci && uretici === denetci) {
        out.push({ dosya, tani: yeniTani("üretici-denetçi-çakışması",
          { kimlik, kusur: `aynı etmen ("${uretici}") hem üretici hem denetçi olarak yazılmış` }, d) });
      }
      // Durum değişikliği kanıt ister: doğrulanmamış teslim tamamlandı sayılamaz.
      const kosu = yeniAlan(d, "koşu")?.deger;
      if (yeniAlanMetin(d, "durum") === "tamamlandı" && kosu?.tur === "widget" && kosu.dugum) {
        const karar = yeniAlanMetin(kosu.dugum, "karar");
        const kanit = yeniAlanMetin(kosu.dugum, "kanıt") ?? yeniAlanMetin(kosu.dugum, "doğrulama");
        if (karar === "VERIFIED" && !kanit) {
          out.push({ dosya, tani: yeniTani("şef-akışı-ihlali",
            { kimlik, kusur: "koşum doğrulandı mührü taşıyor ama bağımsız kanıt bağı yazılmamış" }, kosu.dugum) });
        }
      }
    }

    if (d.ad === "Koşum") {
      const adimlar = yeniListe(d, "adım").map((v) => v.metin).filter(Boolean);
      if (adimlar.length > 1) {
        out.push({ dosya, tani: yeniTani("oturum-adım-sınırı",
          { kimlik, kusur: `koşum kaydı ${adimlar.length} ayrı işi birlikte gösteriyor` }, d) });
      }
    }
  }
  return out;
}

// ── Dil ve numara grafı (beş tanı) ──────────────────────────────────────────

/** Kanonik bölüm önekleri — madde kodlarının kapalı evreni. */
const KANON_ONEKLERI: readonly string[] = ["MIM", "DIL", "TIP", "YAS", "YUZ", "STR", "OGR", "ORK"];
const MADDE_KODU = /^(MIM|DIL|TIP|YAS|YUZ|STR|OGR|ORK)-(\d+(?:\.\d+)*)$/;
/** Hedef tipi kanonda sabitlenmiş kenarlar. */
const KENAR_HEDEF_TIPI: Readonly<Record<string, string>> = {
  "tema": "Tema", "mevsim": "Faz", "dayanak": "Karar",
};   // `üretir` kenarı bilinçle dışarıda: üretim kökeni kendi tanısında konuşur, aynı kök ihlal iki kez basılmaz

/**
 * Dil ve numara grafı hükümleri: kanonik hüküm yalnız kaynak dilinde yaşar,
 * kanonik kimlikler tam orthografiyle yazılır, kenarlar ilanlı hedef tipine
 * yönelir ve madde kodları tek, ardışık ve ebeveynli bir numara grafı kurar.
 */
export function dilKanonTanilari(
  programlar: ReadonlyMap<string, Program>,
  disk: DiskAnlikGoruntu,
  dizin: string,
  muaflar?: ReadonlySet<string>,
): Array<{ dosya: string; tani: Tani }> {
  const out: Array<{ dosya: string; tani: Tani }> = [];
  const dugumler = yeniDugumler(programlar, muaflar).filter((y) => y.d.tur !== "çağır" && !ogretimDunyasi(y.dosya));
  const sicil = taniSicili();

  // Kanonik kaynak biçimi: hüküm metnini taşıyan kaynak-dışı dosya.
  for (const g of disk.girdiler) {
    if (g.tur !== "dosya" || !g.yol.endsWith(".md")) continue;
    if (!/(^|\/)yasa\//.test(g.yol)) continue;
    let metin: string;
    try { metin = readFileSync(join(dizin, g.yol), "utf8"); } catch { continue; }
    if (!/\*\*Hüküm:\*\*|\*\*Zorlama:\*\*/.test(metin)) continue;
    if (/üretilmiştir/i.test(metin.slice(0, 400))) continue;
    out.push({ dosya: g.yol, tani: yeniTani("kanonik-kaynak-biçimi", { dosya: g.yol }, { satir: 1, sutun: 1 }) });
  }

  // Orthografi: kanonik kimlik şapkasız yazılmışsa kimlik sessizce ayrışır.
  const katlanmisSicil = new Map<string, string>();
  for (const k of sicil) katlanmisSicil.set(katlanmisAd(k), k);
  for (const { dosya, d } of dugumler) {
    for (const o of yeniListe(d, "tanı")) {
      const v = o.metin;
      if (!v || sicil.has(v)) continue;
      const kanonik = katlanmisSicil.get(katlanmisAd(v));
      if (kanonik && kanonik !== v) {
        out.push({ dosya, tani: yeniTani("orthografi-kaybı", { ad: v, kanonik }, o) });
      }
    }
  }

  // Kenar hedef tipi: kenar ilanlı kaynak-hedef sözleşmesine uyar.
  const tipOf = new Map<string, string>();
  for (const { d } of dugumler) {
    const k = yeniAlanMetin(d, "kod");
    if (k && !tipOf.has(k)) tipOf.set(k, d.ad);
  }
  for (const { dosya, d } of dugumler) {
    for (const [kenar, beklenen] of Object.entries(KENAR_HEDEF_TIPI)) {
      for (const o of yeniListe(d, kenar)) {
        const h = o.metin;
        if (!h) continue;
        const hedefTip = tipOf.get(h);
        if (!hedefTip || hedefTip === beklenen) continue;
        if (kenar === "dayanak" && (hedefTip === "Anayasa" || hedefTip === "Kural" || hedefTip === "kuralTanım")) continue;
        out.push({ dosya, tani: yeniTani("kenar-tip-uyuşmazlığı",
          { kaynak: yeniKimlik(d), kenar, hedef: h, beklenen }, o) });
      }
    }
  }

  // Madde grafı: tekillik, önek evreni ve ardışıklık.
  const maddeler = new Map<string, Yerlesim>();
  const yinelenen: Array<{ kod: string; y: Yerlesim }> = [];
  for (const y of dugumler) {
    const kod = yeniAlanMetin(y.d, "kod");
    if (!kod || !MADDE_KODU.test(kod)) continue;
    if (maddeler.has(kod)) yinelenen.push({ kod, y }); else maddeler.set(kod, y);
  }
  for (const { kod, y } of yinelenen) {
    out.push({ dosya: y.dosya, tani: yeniTani("numara-grafı-uyumsuz",
      { kod, kusur: "aynı madde kodu ikinci kez ilan edilmiş" }, y.d) });
  }
  if (maddeler.size) {
    const bolumler = new Map<string, Set<string>>();
    for (const kod of maddeler.keys()) {
      const m = MADDE_KODU.exec(kod)!;
      if (!bolumler.has(m[1])) bolumler.set(m[1], new Set());
      bolumler.get(m[1])!.add(m[2]);
    }
    for (const [kod, y] of maddeler) {
      const m = MADDE_KODU.exec(kod)!;
      const bolum = m[1];
      const parcalar = m[2].split(".");
      const kardesler = bolumler.get(bolum)!;
      if (!kardesler.has("0")) {
        out.push({ dosya: y.dosya, tani: yeniTani("madde-kodu-uyumsuz",
          { kod, kusur: `"${bolum}" bölümü sıfırıncı maddesini ilan etmemiş`, onerilen: `${bolum}-0` }, y.d) });
        kardesler.add("0");   // bölüm başına tek kez konuşulur
      }
      if (parcalar.length > 1) {
        const ebeveyn = parcalar.slice(0, -1).join(".");
        if (!kardesler.has(ebeveyn)) {
          out.push({ dosya: y.dosya, tani: yeniTani("madde-kodu-uyumsuz",
            { kod, kusur: `noktalı alt numaranın ana maddesi ("${bolum}-${ebeveyn}") ilan edilmemiş`, onerilen: `${bolum}-${ebeveyn}` }, y.d) });
        }
      }
      const son = Number(parcalar[parcalar.length - 1]);
      // Üst düzeyde `1`, bölüm kökü `0`ı izler; noktalı bir alt dizideyse
      // ilk çocuk `.1`dir. `.1` için uydurma bir `.0` kardeşi aramak bütün
      // kanonik alt maddeleri yanlış pozitif olarak işaretliyordu.
      const ilkSira = parcalar.length > 1 ? 1 : 0;
      if (son > ilkSira) {
        const oncekiParcalar = [...parcalar.slice(0, -1), String(son - 1)].join(".");
        if (!kardesler.has(oncekiParcalar)) {
          out.push({ dosya: y.dosya, tani: yeniTani("madde-kodu-uyumsuz",
            { kod, kusur: `ardışıklık kopmuş; "${bolum}-${oncekiParcalar}" atlanmış`, onerilen: `${bolum}-${oncekiParcalar}` }, y.d) });
        }
      }
    }
  }
  // Paralel kod evreni: kanonik bir maddeye dayanan hüküm, dayanağını kanon
  // dışındaki bir kod evreninden alıyorsa numara grafı ikiye bölünmüş demektir.
  // `ilgili` üyeliklerinin önek denetimi tek-dosya kapısındadır; aynı kök ihlal
  // burada ikinci kez konuşmaz.
  for (const [kod, y] of maddeler) {
    for (const o of yeniListe(y.d, "dayanak")) {
      const h = o.metin;
      if (!h || MADDE_KODU.test(h)) continue;
      out.push({ dosya: y.dosya, tani: yeniTani("numara-grafı-uyumsuz",
        { kod, kusur: `dayanağı "${h}" kanonun sekiz bölüm önekinin dışında bir kod evrenine yöneliyor` }, o) });
    }
  }
  return out;
}

// ── Öğretim (yedi tanı) ─────────────────────────────────────────────────────

/** Üretilmiş bölge işaretleri — üretici yalnız bu bölgeyi yeniler. */
const BOLGE_BAS = /<!--\s*SARMAL:([A-ZÇĞİÖŞÜ_]+)\s*-->/g;
const BOLGE_SON = /<!--\s*\/SARMAL:([A-ZÇĞİÖŞÜ_]+)\s*-->/g;
/** Üretim künyesi: hangi kaynaktan, hangi mühürle üretildi. */
const KUNYE = /üretilmiştir:\s*([^\s·|>]+)(?:[^\n]*mühür:\s*([A-Za-z0-9]+))?/;
/** Normatif cümle izleri — öğretim yüzünün kendi başına hüküm kurup kurmadığı. */
const NORMATIF = /(\bzorunludur\b|\byasaktır\b|\bkullanılamaz\b|\bedilemez\b|\*\*Hüküm:\*\*)/;

function dosyaOku(dizin: string, yol: string): string | undefined {
  try { return readFileSync(join(dizin, yol), "utf8"); } catch { return undefined; }
}

/** İçerik özeti — mühür karşılaştırması için kısa ve kararlı bir imza. */
function icerikOzeti(metin: string): string {
  let h = 5381;
  for (let i = 0; i < metin.length; i++) h = ((h * 33) ^ metin.charCodeAt(i)) >>> 0;
  return h.toString(16);
}

/**
 * Öğretim hükümleri: öğretim metninin normatif içeriği kanonik kaynaktan
 * türetilir, başvuru yüzleri sicilden üretilir, üretilmiş metin izinli bölgenin
 * dışında elle değiştirilmez, çıktı kaynağının mührünü izler, Beceri kartı
 * hedefini ve kanıtını taşır ve öğrenim kanıtsız terfi etmez.
 */
/**
 * ORK-3.4 · ÖNCELİK BEYANININ VARLIĞI (bilgi) — 2026-08-22, Founder onayıyla.
 *
 *   Madde kademe DEĞERİNİ hiçbir koşulda zorlamaz, çünkü bir işin ne kadar acil
 *   olduğu insan hükmüdür ve makine onu uyduramaz. Zorlanan tek şey BEYANIN
 *   VARLIĞIDIR: açık bir Adım sıralamadaki yerini söylemek zorundadır.
 *
 *   ÜÇ SINIR BİLİNÇLİDİR. Birincisi kapsamdır: yalnız açık Adımlar görülür,
 *   çünkü biten işin sıralaması artık anlam taşımaz. İkincisi ders dünyasıdır:
 *   örnek, şablon, sınama ve vitrin gövdeleri öğretim malzemesidir ve kasıtlı
 *   olarak eksik yazılabilir. Üçüncüsü gürültü sınırıdır: bulgular Adım başına
 *   tek tek değil kapsayıcıya göre gruplanır, çünkü onlarca ayrı satır gerçek
 *   nedeni örter (YAS-3.4).
 */
export function onceliksizAdimTanilari(
  programlar: ReadonlyMap<string, Program>,
): Array<{ dosya: string; tani: Tani }> {
  const out: Array<{ dosya: string; tani: Tani }> = [];
  for (const [dosya, prog] of programlar) {
    if (BAHCE_DISI.test(dosya)) continue;   // ders dünyası kapsam dışıdır
    const eksik: Array<{ kimlik: string; satir: number; sutun: number }> = [];
    const gez = (n: Dugum): void => {
      if (n.tur === "widget" && n.ad === "Adım") {
        const durum = yeniAlanMetin(n, "durum");
        if ((durum === "beklemede" || durum === "geliştirmede") && yeniAlanMetin(n, "öncelik") === undefined) {
          eksik.push({ kimlik: yeniKimlik(n), satir: n.satir ?? 0, sutun: n.sutun ?? 0 });
        }
      }
      for (const c of n.cocuklar) gez(c);
    };
    for (const b of prog.bildirimler) gez(b);
    if (eksik.length === 0) continue;
    const ornek = eksik.slice(0, 3).map((e) => e.kimlik).join(" · ")
      + (eksik.length > 3 ? ` … (+${eksik.length - 3})` : "");
    out.push({ dosya, tani: yeniTani("önceliksiz-adım",
      { kapsayıcı: dosya, sayı: String(eksik.length), örnek: ornek },
      { satir: eksik[0].satir, sutun: eksik[0].sutun }) });
  }
  return out;
}

/**
 * YUZ-3.4 · ATEŞLEMİŞ HATIRLATICININ GÖRÜNÜRLÜĞÜ (bilgi) — 2026-08-22.
 *
 *   Hatırlatıcı ileri bağlamdır ve uykuda beklemesi doğaldır; beklediği an
 *   geldiğinde uykudakilerle aynı listede kalırsa bekleyen iş görünmez olur.
 *   ÖLÇÜT GRAFTAN TÜRETİLİR: `hatırlat` kenarının hedefi tamamlandıysa hatırlatıcı
 *   ateşlemiştir. Serbest metinli dönüş tetikleyicisi BİLİNÇLİ OLARAK
 *   yorumlanmaz; o cümleyi makineye okutmak, kimsenin doğrulayamayacağı bir
 *   karar üretmek olurdu, oysa bağlanılan Adımın durumu zaten ölçülüdür.
 */
export function atesleyenHatirlaticiTanilari(
  programlar: ReadonlyMap<string, Program>,
): Array<{ dosya: string; tani: Tani }> {
  // ① Bütün Adımların durumu — hedefin kapanıp kapanmadığı buradan okunur.
  const adimDurumu = new Map<string, string>();
  const hatirlaticilar: Array<{ dosya: string; dugum: Dugum }> = [];
  for (const [dosya, prog] of programlar) {
    const gez = (n: Dugum): void => {
      if (n.tur === "widget") {
        if (n.ad === "Adım") {
          const kod = yeniAlanMetin(n, "kod");
          const durum = yeniAlanMetin(n, "durum");
          if (kod && durum) adimDurumu.set(kod, durum);
        } else if (n.ad === "Hatırlatıcı" && !BAHCE_DISI.test(dosya)) {
          hatirlaticilar.push({ dosya, dugum: n });
        }
      }
      for (const c of n.cocuklar) gez(c);
    };
    for (const b of prog.bildirimler) gez(b);
  }
  // ② Ateşleyenler: açık ya da kararlaşmış, hedefi tamamlanmış.
  const out: Array<{ dosya: string; tani: Tani }> = [];
  for (const { dosya, dugum } of hatirlaticilar) {
    const durum = yeniAlanMetin(dugum, "durum");
    if (durum !== "açık" && durum !== "kararlaştı") continue;
    for (const hedefDeger of yeniListe(dugum, "hatırlat")) {
      const hedef = hedefDeger.metin;
      if (!hedef || adimDurumu.get(hedef) !== "tamamlandı") continue;
      out.push({ dosya, tani: yeniTani("ateşlemiş-hatırlatıcı",
        { kimlik: yeniKimlik(dugum), hedef, durum },
        { satir: dugum.satir ?? 0, sutun: dugum.sutun ?? 0 }) });
      break;   // bir hatırlatıcı bir kez bildirilir
    }
  }
  return out;
}

export function ogretimTanilari(
  programlar: ReadonlyMap<string, Program>,
  snf: Siniflama,
  disk: DiskAnlikGoruntu,
  dizin: string,
  muaflar?: ReadonlySet<string>,
): Array<{ dosya: string; tani: Tani }> {
  const out: Array<{ dosya: string; tani: Tani }> = [];

  for (const g of disk.girdiler) {
    if (g.tur !== "dosya" || !g.yol.endsWith(".md")) continue;
    const metin = dosyaOku(dizin, g.yol);
    if (metin === undefined) continue;
    const kunye = KUNYE.exec(metin);
    const bolgeler = [...metin.matchAll(BOLGE_BAS)].map((m) => m[1]);
    const kapanislar = [...metin.matchAll(BOLGE_SON)].map((m) => m[1]);

    // Kaynak drifti: normatif öğretim metni kaynağını göstermiyor.
    if (!kunye && !bolgeler.length && NORMATIF.test(metin) && /(^|\/)(ogrenme|ogretim|beceri)\//.test(g.yol)) {
      out.push({ dosya: g.yol, tani: yeniTani("öğretim-kaynak-drifti",
        { dosya: g.yol, kusur: "metin bağlayıcı cümle taşıyor ama hangi kanonik kaynaktan türediğini söylemiyor" },
        { satir: 1, sutun: 1 }) });
    }

    // Bayat çıktı: künyedeki kaynak çözülmüyor ya da mühür uyuşmuyor.
    if (kunye) {
      const kaynakYol = kunye[1];
      const kaynak = dosyaOku(dizin, kaynakYol);
      if (kaynak === undefined) {
        out.push({ dosya: g.yol, tani: yeniTani("öğretim-bayat",
          { dosya: g.yol, kusur: `künyedeki kaynak ("${kaynakYol}") çözülmüyor` }, { satir: 1, sutun: 1 }) });
      } else if (kunye[2] && kunye[2] !== icerikOzeti(kaynak)) {
        out.push({ dosya: g.yol, tani: yeniTani("öğretim-bayat",
          { dosya: g.yol, kusur: "künyedeki mühür kaynağın bugünkü içeriğiyle uyuşmuyor" }, { satir: 1, sutun: 1 }) });
      }
      // Elle düzenleme: üretilmiş metin izinli bölgenin dışında hüküm taşıyor.
      if (bolgeler.length) {
        const disKisim = metin.replace(/<!--\s*SARMAL:[A-ZÇĞİÖŞÜ_]+\s*-->[\s\S]*?<!--\s*\/SARMAL:[A-ZÇĞİÖŞÜ_]+\s*-->/g, "");
        if (NORMATIF.test(disKisim)) {
          out.push({ dosya: g.yol, tani: yeniTani("üretilmiş-öğretim-değiştirilmiş",
            { dosya: g.yol, kusur: "üretim bölgesinin dışında bağlayıcı cümle yazılmış" }, { satir: 1, sutun: 1 }) });
        }
      }
    }

    // İdempotans borcu değil, sicil drifti: taksonomi bölgesi kanondan sapmış.
    if (bolgeler.includes("TAKSONOMI") && kapanislar.includes("TAKSONOMI")) {
      const bas = metin.indexOf(TAKSONOMI_BAS);
      const son = metin.indexOf(TAKSONOMI_SON);
      if (bas !== -1 && son > bas) {
        const mevcut = metin.slice(bas + TAKSONOMI_BAS.length, son).trim();
        const uretilen = taksonomiMd(snf);
        const uretilenBas = uretilen.indexOf(TAKSONOMI_BAS);
        const uretilenSon = uretilen.indexOf(TAKSONOMI_SON);
        const beklenen = uretilen.slice(uretilenBas + TAKSONOMI_BAS.length, uretilenSon).trim();
        if (mevcut !== beklenen) {
          out.push({ dosya: g.yol, tani: yeniTani("başvuru-sicil-drifti",
            { dosya: g.yol, kusur: "başvuru bölgesi kanonik sicilden üretilen içerikle birebir değil" },
            { satir: 1, sutun: 1 }) });
        }
      }
    }
  }

  // Beceri kartı ve kanıtlı terfi.
  for (const { dosya, d } of yeniDugumler(programlar, muaflar)) {
    if (d.tur !== "widget" || ogretimDunyasi(dosya)) continue;
    const kimlik = yeniKimlik(d);

    if (d.ad === "Beceri") {
      const eksik: string[] = [];
      if (!yeniListe(d, "uygular").length) eksik.push("hedef bağı");
      if (!yeniAlanMetin(d, "neZaman")?.trim()) eksik.push("tetikleyici tarifi");
      if (!yeniAlanMetin(d, "örnek")?.trim()) eksik.push("uygulama örneği");
      if (!yeniAlanMetin(d, "kabul")?.trim() && !yeniListe(d, "doğrulama").length) eksik.push("kabul kanıtı");
      if (eksik.length) {
        out.push({ dosya, tani: yeniTani("beceri-kartı-eksik",
          { kimlik, kusur: `${eksik.join(" · ")} yazılmamış` }, d) });
      }
      if (yeniAlanMetin(d, "terfi") === "tamamlandı" && !yeniListe(d, "doğrulama").length && !yeniAlanMetin(d, "kabul")) {
        out.push({ dosya, tani: yeniTani("kanıtsız-beceri-terfisi",
          { kimlik, kusur: "terfi tamamlandı görünüyor ama yinelenebilir doğrulama bağı yok" }, d) });
      }
    }

    if (d.ad === "Bellek" && yeniAlanMetin(d, "terfi") === "tamamlandı") {
      const kanit = yeniListe(d, "doğrulama").length || yeniAlanMetin(d, "kanıt")?.trim();
      if (!kanit) {
        out.push({ dosya, tani: yeniTani("kanıtsız-beceri-terfisi",
          { kimlik, kusur: "öğrenim terfi ettirilmiş ama yinelenebilir doğrulama kanıtı bağlanmamış" }, d) });
      }
    }

    // Öğretim etkisi: kanonik kaynağı değiştiren tamamlanmış iş öğretim yüzünü işler.
    if (d.ad === "Adım" && yeniAlanMetin(d, "durum") === "tamamlandı") {
      const kanonikMeyve = d.cocuklar.concat(
        yeniListe(d, "üretir").map((v) => v.dugum).filter((x): x is Dugum => Boolean(x)))
        .some((c) => {
          const yol = yeniAlanMetin(c, "dosya") ?? "";
          return /(^|\/)(yasa\/kanon|oz\/siniflama)\//.test(yol);
        });
      if (kanonikMeyve && !yeniListe(d, "etkiler").length && !yeniAlanMetin(d, "etkisiz")?.trim()) {
        out.push({ dosya, tani: yeniTani("öğretim-etki-eksik",
          { kimlik, kusur: "kanonik kaynağı değiştirmiş ama öğretim etkisi ne işlenmiş ne de etkisizliği beyan edilmiş" }, d) });
      }
    }
  }
  return out;
}

// ── Strateji, göç ve sınırlar (dokuz tanı) ──────────────────────────────────

/** Kanonik kaynakta yaşayamayacak geçmiş kimlik izleri. */
const GECMIS_KIMLIK = /\b(K-\d{1,3}|GK-\d|SD-\d|DR-\d|IA-\d|EMJ-[A-Z]|RAY-\d|RF-T\d|BKM-[A-Z]|NTK-A\d|ZMN-A\d|VIT-[A-Z]|HTR-[A-Z]|AOK-[A-Z0-9]|KRR-MUT|EKL-F\d)/;
/** Dış yürütücü kimliği ya da sürümü — kanonik hüküm buna bağlanamaz. */
const YURUTUCU_IZI = /\b(gpt-[0-9]|claude-[0-9]|gemini-[0-9]|llama-[0-9]|mistral-[0-9]|o[0-9]-mini|sonnet-[0-9]|opus-[0-9]|haiku-[0-9])/i;
/** Göç aşamalarının bağlayıcı sırası. */
const GOC_ASAMALARI: readonly string[] = ["spec", "kanon", "motor", "yüzey", "proje-kod", "terfi", "belge"];
/** Aşama kapanış kaydının taşımak zorunda olduğu dört parça. */
const KAPI_PARCALARI: ReadonlyArray<{ ad: string; re: RegExp }> = [
  { ad: "kapsam envanteri", re: /kapsam|envanter/i },
  { ad: "doğrulama sonucu", re: /doğrula|kapı|hata|uyarı|sınama/i },
  { ad: "sahipli borç kaydı", re: /borç|açık iş|kalan/i },
  { ad: "devredilen etki kümesi", re: /etki|devir|devredil/i },
];

/**
 * Kapalı üründeki eşik envanterinden (`_KapaliUrun/plan/orkestrasyon-esik-envanteri.md`)
 * türeyen AYARLANMIŞ sabitlerin parmak izleri. Bu sızıntı türü kapalı varlığın
 * adını hiç anmaz — değerin kendisi açık tarafa düz metin olarak düşer — bu
 * yüzden yol biçimli nöbet onu göremez.
 *
 * İzler AYARLANMIŞ DEĞERİ DEĞİL, değerin belirdiği BİÇİMİ tanır: sayılar `\d+`
 * ile geçilir. Bunun iki sebebi vardır. Birincisi, açık motorun kaynağı da
 * yayımlanacağı için kapalı sabiti nöbetçinin desenine yazmak sızıntıyı
 * kapatmak yerine taşırdı. İkincisi, biçim üzerinden nöbet daha geniş tutar —
 * sabit ileride ayarlanırsa desen bayatlamaz. Envanterin bölüm harfi tanıya
 * yazılır ki sahibi bulgunun hangi kapalı politikadan geldiğini tek bakışta görsün.
 *
 * BAZI ADLANDIRMALAR BURADA BİLEREK AÇIKTA DURUR (Founder hükmü 2026-08-05).
 * Nöbetçinin sızıntıyı tanıyabilmesi için strateji kümesinin üyelerini ve
 * tetikleyici zincirini adıyla anması gerekir; bu adlar sektörün ortak
 * sözcükleridir ve tek başlarına bir şey ifşa etmezler, çünkü bir stratejinin
 * VAR OLDUĞUNU söylerler, NASIL AYARLANDIĞINI değil. Asıl değer ağırlıklarda ve
 * eşiklerdeydi ve onlar açık taraftan silinmiştir.
 *
 * Bu adları da gizli sayıp zorlamayı kapalı tarafa taşımak REDDEDİLDİ, çünkü o
 * yol açık motoru gizli ürüne bağlar ve tam da korumaya çalıştığı hükmü çiğner:
 * STR-3, açık dil ve motorun gizli üründen bağımsız kullanılabilir ve sınanabilir
 * kalmasını şart koşar. Bekçiliğin açık tarafta durması bu yüzden zorunludur;
 * bekçi kapalıya taşınsaydı açık depo kendi sınırını koruyamaz hâle gelirdi.
 */
const GIZLI_ESIK_IZLERI: ReadonlyArray<{ bolum: string; ne: string; re: RegExp }> = [
  { bolum: "§D", ne: "karar motoru güven eşikleri",
    re: /(?:conf|güven)[\p{L}]*\s*<\s*0[.,]\d[^\n]{0,60}<\s*0[.,]\d/iu },
  { bolum: "§Q", ne: "strateji seçici kümesi",
    re: /single\s*\/\s*sequential\s*\/\s*parallel\s*\/\s*debate/iu },
  { bolum: "§J", ne: "tetikleyici koreografisi",
    re: /risk\s*→\s*debate\s*→\s*human[-\s]?escalate/iu },
  { bolum: "§J", ne: "risk özellik sayısı",
    re: /\b\d+[-\s]?özellikli\s+risk\b/iu },
  { bolum: "§O", ne: "yeniden deneme ve eskalasyon limitleri",
    re: /max-?\s*\d+\b[^\n]{0,50}\b\d+-?\s*hata\s*→\s*eskale/iu },
  { bolum: "§G", ne: "kanca tavanı ve zaman aşımı",
    re: /≤\s*\d+\s*kanca[^\n]{0,14}≤\s*\d+\s*ms/iu },
];

/**
 * AÇIK KAYNAK MİNİMAL SÜRÜMÜN MEŞRU SABİTLERİ (Founder dalga hükmü 2026-08-05).
 * Orkestrasyon zekâsı iki dalgaya ayrılmıştır; birinci dalga Sarmal içinde açık
 * kaynak yayımlanır ve ajan eşleyici puanlaması (ZKA-A06) ona dahildir. Onun
 * ağırlık vektörü ile kabul eşikleri açık tarafta DURMASI GEREKEN değerlerdir;
 * sızıntı değildir ve nöbetçi onlarda alarm üretmez. Ayrım burada yazılıdır:
 * bu desenlerden birine uyan satır hiçbir izin ihlali sayılmaz.
 *
 * MUAFİYET SOMUT KALEME BAĞLIDIR, SİHİRLİ SÖZCÜĞE DEĞİL (Founder hükmü
 * 2026-08-05). İlk yazımda listede "açık kaynak minimal sürüm" ibaresini anan
 * her satırı muaf tutan bir desen vardı ve bu bir kaçış valfiydi: kapalı bir
 * eşiği açık tarafa yazan biri yanına iyi niyetle o ibareyi düşseydi nöbetçi
 * susar, biz de bunu yeşil kapı sanardık — bugün kapatılan kusurun aynısı,
 * yalnız başka kılıkta. Valf bu yüzden daraltıldı: muafiyet artık YALNIZ
 * eşleyici puanlamasının kendi desenlerine bağlıdır. Yeni bir kalem açık kaynak
 * yapılacaksa buraya ELLE eklenir; bu, kayıt bırakan bilinçli bir dokunuştur ve
 * liste sessizce genişleyemez.
 */
const MINIMAL_SURUM_SABITLERI: readonly RegExp[] = [
  /alan\s*\.?\s*0?[.,]?30\s*\+\s*dil/iu,          // eşleyici ağırlık vektörü (ZKA-A06)
  /eşik\s*0[.,]80\s*\/\s*0[.,]60/iu,               // eşleyici kabul eşikleri (ZKA-A06)
];

/**
 * Strateji hükümleri: kanon geçmiş kimliğe atıf taşımaz, dayanak grafı köke
 * ulaşır, göç aşamaları sırasını izler ve dört parçalı kapanış kaydıyla kapanır,
 * açık araç gizli ürüne zorunlu bağ kurmaz, çekirdek bağımlılık taşımaz,
 * kanonik hüküm dış yürütücüye bağlanmaz ve ölü iz etkin kapsamda kalmaz.
 */
export function stratejiTanilari(
  programlar: ReadonlyMap<string, Program>,
  hamlar: ReadonlyMap<string, string>,
  indeks: KodIndeks,
  dizin: string,
  muaflar?: ReadonlySet<string>,
): Array<{ dosya: string; tani: Tani }> {
  const out: Array<{ dosya: string; tani: Tani }> = [];
  const dugumler = yeniDugumler(programlar, muaflar).filter((y) => !ogretimDunyasi(y.dosya));

  // Unutma kapısı: kanonik kaynak geçmiş kimliğe atıf taşıyamaz.
  for (const [dosya, ham] of hamlar) {
    if (!/(^|\/)yasa\/kanon\//.test(dosya)) continue;
    const satirlar = ham.split(/\r?\n/);
    for (let i = 0; i < satirlar.length; i++) {
      const m = GECMIS_KIMLIK.exec(satirlar[i]);
      if (!m) continue;
      out.push({ dosya, tani: yeniTani("unutma-kapısı-ihlali",
        { dosya, atif: m[1] }, { satir: i + 1, sutun: (satirlar[i].indexOf(m[1]) + 1) || 1 }) });
    }
  }

  // Kanon kodu grafı: dayanak çözülebilir, döngüsüz ve köke ulaşan olmalı.
  const madde = new Map<string, { dosya: string; d: Dugum; dayanak: string[] }>();
  for (const { dosya, d } of dugumler) {
    const kod = yeniAlanMetin(d, "kod");
    if (!kod || !MADDE_KODU.test(kod) || madde.has(kod)) continue;
    const yapisal = yeniListe(d, "dayanak").map((v) => v.metin).filter((v): v is string => Boolean(v));
    const kararMetni = yeniAlanMetin(d, "karar");
    const tasiyici = kararMetni?.match(/(?:^|;\s*)dayanak:\s*((?:MIM|DIL|TIP|YAS|YUZ|STR|OGR|ORK)-\d+(?:\.\d+)*)\b/);
    // Kanonik Karar düğümleri hükmün birebir makine-okur taşıyıcısını `karar`
    // alanında tutar. Yapısal kenar varsa o üstün gelir; yalnız yokluğunda bu
    // dar, kanonik `dayanak: KOD` parçası graf bağı olarak okunur.
    const dayanak = yapisal.length ? yapisal : (d.ad === "Karar" && tasiyici ? [tasiyici[1]] : []);
    madde.set(kod, { dosya, d, dayanak });
  }
  for (const [kod, kayit] of madde) {
    const parcalar = MADDE_KODU.exec(kod)![2];
    if (parcalar === "0") continue;                       // kök madde dayanaksız yaşar
    if (!kayit.dayanak.length) {
      out.push({ dosya: kayit.dosya, tani: yeniTani("kanon-kodu-uyumsuz",
        { kod, kusur: "dayanak bağı hiç yazılmamış", onerilen: MADDE_KODU.exec(kod)![1] + "-0" }, kayit.d) });
      continue;
    }
    for (const h of kayit.dayanak) {
      if (!madde.has(h) && !indeks.has(h)) {
        out.push({ dosya: kayit.dosya, tani: yeniTani("kanon-kodu-uyumsuz",
          { kod, kusur: `dayanağı "${h}" hiçbir kaynakta çözülmüyor` }, kayit.d) });
      }
    }
    // Döngü ve köke ulaşma.
    const gorulen = new Set<string>([kod]);
    let su = kayit.dayanak.find((h) => madde.has(h));
    let dongu = false;
    let kok = false;
    while (su) {
      if (gorulen.has(su)) { dongu = true; break; }
      gorulen.add(su);
      if (MADDE_KODU.exec(su)![2] === "0") { kok = true; break; }
      su = madde.get(su)!.dayanak.find((h) => madde.has(h));
    }
    if (dongu) {
      out.push({ dosya: kayit.dosya, tani: yeniTani("kanon-kodu-uyumsuz",
        { kod, kusur: "dayanak zinciri kendine dönüyor" }, kayit.d) });
    } else if (!kok && kayit.dayanak.some((h) => madde.has(h))) {
      out.push({ dosya: kayit.dosya, tani: yeniTani("kanon-kodu-uyumsuz",
        { kod, kusur: "dayanak zinciri kendi bölümünün dayanaksız köküne ulaşmıyor" }, kayit.d) });
    }
  }

  // Göç aşama sırası ve kapanış kaydı.
  const asamaDurumu = new Map<string, { dosya: string; d: Dugum; durum: string }[]>();
  for (const { dosya, d } of dugumler) {
    const asama = yeniAlanMetin(d, "aşama");
    if (!asama || !GOC_ASAMALARI.includes(asama)) continue;
    if (!asamaDurumu.has(asama)) asamaDurumu.set(asama, []);
    asamaDurumu.get(asama)!.push({ dosya, d, durum: yeniAlanMetin(d, "durum") ?? "beklemede" });
  }
  for (const [asama, kayitlar] of asamaDurumu) {
    const sira = GOC_ASAMALARI.indexOf(asama);
    for (const k of kayitlar) {
      if (k.durum === "beklemede") continue;
      for (let i = 0; i < sira; i++) {
        const onceki = asamaDurumu.get(GOC_ASAMALARI[i]) ?? [];
        const acik = onceki.filter((o) => o.durum !== "tamamlandı");
        if (!acik.length) continue;
        out.push({ dosya: k.dosya, tani: yeniTani("göç-sırası-ihlali",
          { kimlik: yeniKimlik(k.d), kusur: `"${GOC_ASAMALARI[i]}" aşaması hâlâ açıkken "${asama}" aşaması başlatılmış` }, k.d) });
        break;
      }
    }
  }
  for (const { dosya, d } of dugumler) {
    if (d.tur !== "widget") continue;
    const asama = yeniAlanMetin(d, "aşama");
    if (!asama || !GOC_ASAMALARI.includes(asama)) continue;
    if (yeniAlanMetin(d, "durum") !== "tamamlandı") continue;
    const kayit = yeniAlanMetin(d, "koşu") ?? "";
    const eksik = KAPI_PARCALARI.filter((p) => !p.re.test(kayit)).map((p) => p.ad);
    if (eksik.length) {
      out.push({ dosya, tani: yeniTani("göç-kapısı-eksik",
        { kimlik: yeniKimlik(d), kusur: `kapanış kaydında ${eksik.join(" · ")} yok` }, d) });
    }
  }

  // Açık araç ile gizli ürün sınırı: çapraz zorunlu bağ yasaktır. Gizli ürünün
  // kendi kökündeki öz-başvuruları ve açık taraftaki belge/anlatı cümleleri bağ
  // değildir; yalnız yol alanı ya da yürütülebilir dosya erişimi konuşur.
  const gizliKokEki = `${GIZLI_KOK_ADI}/`;
  const gizliYolAlani = new RegExp(`(?:^|[({,]\\s*)(?:dosya|yol|girdi|çıktı|komut|betik|modül)\\s*:\\s*["'][^"']*${gizliKokEki}`);
  const gizliKodAtama = new RegExp(`\\b(?:const|let|var)\\s+[\\p{L}_$][\\p{L}\\p{N}_$]*\\s*=.*["'][^"']*${gizliKokEki}`, "u");
  const gizliKodCagri = new RegExp(`\\b(?:import|require|readFile(?:Sync)?|writeFile(?:Sync)?|open|resolve|join)\\s*\\([^)]*["'][^"']*${gizliKokEki}`);
  const kendiGizliKoku = dizin.replace(/\\/g, "/").replace(/\/+$/, "").split("/").pop() === GIZLI_KOK_ADI;
  if (!kendiGizliKoku) for (const [dosya, ham] of hamlar) {
    const satirlar = ham.split(/\r?\n/);
    let belgeIci = false;
    for (let i = 0; i < satirlar.length; i++) {
      const satir = satirlar[i];
      if (/^\s*-->\|\s*$/.test(satir)) { belgeIci = true; continue; }
      if (/^\s*\|<--\s*$/.test(satir)) { belgeIci = false; continue; }
      if (belgeIci || /^\s*\/\//.test(satir) || !satir.includes(gizliKokEki)) continue;
      const yolAlani = gizliYolAlani.test(satir);
      const kodErisimi = gizliKodAtama.test(satir) || gizliKodCagri.test(satir);
      if (!yolAlani && !kodErisimi) continue;
      out.push({ dosya, tani: yeniTani("açık-gizli-sınır-ihlali",
        { dosya, kusur: "açık taraftaki kaynak gizli ürün ağacına doğrudan yol veriyor" },
        { satir: i + 1, sutun: 1 }) });
    }
  }

  // Aynı sınırın İÇERİK biçimi. Yukarıdaki nöbet yalnız YOL arar ve `hamlar`
  // yalnız ayrıştırılan `.sar` programlarını taşır; oysa ayarlanmış bir sabit
  // kapalı varlığın adını hiç anmadan bir `.md` anlatısına düz metin olarak
  // düşebilir. Bu tur belge yüzeyini de kapsayarak o körlüğü kapatır: envanter
  // izlerinden biri satırda belirirse sınır ihlali açılır. Makine tarafından
  // ÜRETİLEN bölgeler atlanır — nöbetçi üretilen kopyada değil, elle yazılan
  // kaynakta konuşur, yoksa aynı sızıntı iki kez sayılır.
  if (!kendiGizliKoku) {
    const belgeler = new Map<string, string>(hamlar);
    for (const g of diskTara(dizin).girdiler) {
      if (g.tur !== "dosya" || !g.yol.endsWith(".md")) continue;
      if (ogretimDunyasi(g.yol)) continue;
      const metin = dosyaOku(dizin, g.yol);
      if (metin !== undefined) belgeler.set(g.yol, metin);
    }
    for (const [dosya, ham] of belgeler) {
      const satirlar = ham.split(/\r?\n/);
      let uretilenBolge = false;
      for (let i = 0; i < satirlar.length; i++) {
        const satir = satirlar[i];
        if (/<!--\s*SARMAL:[A-ZÇĞİÖŞÜ_]+\s*-->/.test(satir)) { uretilenBolge = true; continue; }
        if (/<!--\s*\/SARMAL:[A-ZÇĞİÖŞÜ_]+\s*-->/.test(satir)) { uretilenBolge = false; continue; }
        if (uretilenBolge) continue;
        if (MINIMAL_SURUM_SABITLERI.some((re) => re.test(satir))) continue;
        for (const iz of GIZLI_ESIK_IZLERI) {
          if (!iz.re.test(satir)) continue;
          out.push({ dosya, tani: yeniTani("açık-gizli-sınır-ihlali",
            { dosya, kusur: `kapalı üründeki eşik envanterinin ${iz.bolum} bölümünden türeyen ${iz.ne} açık tarafta düz metin duruyor` },
            { satir: i + 1, sutun: 1 }) });
        }
      }
    }
  }

  // Bağımlılık sadeliği: açık çekirdek çalışma-zamanı bağımlılığı taşımaz.
  {
    const paket = dosyaOku(dizin, "urun/cekirdek/package.json");
    if (paket) {
      try {
        const j = JSON.parse(paket) as { dependencies?: Record<string, string> };
        const adlar = Object.keys(j.dependencies ?? {});
        if (adlar.length) {
          out.push({ dosya: "urun/cekirdek/package.json", tani: yeniTani("çekirdek-bağımlılık-drifti",
            { dosya: "urun/cekirdek/package.json", kusur: `çalışma-zamanı bağımlılığı ilan edilmiş (${adlar.join(" · ")})` },
            { satir: 1, sutun: 1 }) });
        }
      } catch { /* okunamayan paket bildirimi ölçüme girmez */ }
    }
  }

  // Model bağımsızlığı: kanonik hüküm dış yürütücü kimliğine bağlanamaz.
  for (const { dosya, d } of dugumler) {
    if (d.tur !== "widget" && d.tur !== "kuralTanım") continue;
    if (!/(^|\/)yasa\//.test(dosya)) continue;
    for (const p of [...d.parametreler, ...d.ozellikler]) {
      const v = p.deger.metin;
      if (!v) continue;
      const m = YURUTUCU_IZI.exec(v);
      if (!m) continue;
      out.push({ dosya, tani: yeniTani("yürütücü-bağımlılığı",
        { kimlik: yeniKimlik(d), iz: m[1] }, p) });
    }
  }

  // Etki ve yayın kapısı: yayın beyanı taşıyan iş etki kümesini doğrular.
  for (const { dosya, d } of dugumler) {
    if (d.tur !== "widget" || d.ad !== "Adım") continue;
    const yayin = yeniAlanMetin(d, "yayın") ?? yeniAlanMetin(d, "sürüm");
    if (!yayin) continue;
    const kayit = yeniAlanMetin(d, "koşu") ?? "";
    if (!/etki/i.test(kayit) || !/(hata|uyarı|kapı)/i.test(kayit)) {
      out.push({ dosya, tani: yeniTani("etki-yayın-kapısı-eksik",
        { kimlik: yeniKimlik(d), kusur: "yayın beyanı var ama geçişli etki kümesi ve kapı sonucu kayda geçmemiş" }, d) });
    }
  }

  // Ölü iz: emekli edilmiş düğüm hâlâ canlı kenarın hedefi.
  {
    const emekliler = new Map<string, string>();
    for (const { dosya, d } of dugumler) {
      if (d.tur !== "widget") continue;
      if (yeniAlanMetin(d, "durum") === "emekli" || yeniAlanMetin(d, "emekli") === "evet") {
        const k = yeniAlanMetin(d, "kod");
        if (k) emekliler.set(k, dosya);
      }
    }
    if (emekliler.size) {
      for (const { dosya, d } of dugumler) {
        if (d.tur !== "widget") continue;
        if (yeniAlanMetin(d, "durum") === "emekli") continue;
        for (const p of [...d.parametreler, ...d.ozellikler]) {
          const ogeler = p.deger.tur === "liste" ? (p.deger.ogeler ?? []) : [p.deger];
          for (const o of ogeler) {
            if (!o.metin || !emekliler.has(o.metin)) continue;
            out.push({ dosya, tani: yeniTani("ölü-iz",
              { iz: o.metin, yer: `${yeniKimlik(d)} düğümünün "${p.ad}" kenarı` }, o) });
          }
        }
      }
    }
  }
  return out;
}

// ── Tip evreni (dört tanı) ──────────────────────────────────────────────────

/** Yeni omurganın kanona eklediği tipler. */
const OMURGA_TIPLERI: readonly string[] = ["Meyve", "KimlikKökü", "KimlikSağlayıcısı"];

/**
 * Tip evreni hükümleri: hiçbir tip kanon dışında bırakılamaz, yeni omurga
 * tipleri aile, şema ve sarma kaydıyla bulunur, her tip yapısal sözleşmesini
 * makine-okur beyan eder ve çalışma alanı örtüsü taban kanonu değiştiremez.
 */
export function tipEvreniTanilari(
  snf: Siniflama,
  ortu: { semalar?: Record<string, unknown> } | undefined,
  anaEtiket: string,
): Array<{ dosya: string; tani: Tani }> {
  const out: Array<{ dosya: string; tani: Tani }> = [];
  const konum = { satir: 1, sutun: 1 };
  const tipler = new Set(snf.widgetTipleri.map((t) => t.ad));

  // Tip evreni: sarma, zorunlu kenar ve yüzey kuralında geçen her tip kanonda olmalı.
  const anilan = new Set<string>();
  for (const [ebeveyn, cocuklar] of Object.entries(snf.izinliSarma)) {
    anilan.add(ebeveyn);
    for (const c of cocuklar) anilan.add(c);
  }
  for (const t of snf.yuzeyKurali.duzen) anilan.add(t);
  for (const t of snf.yuzeyKurali.yaprak) anilan.add(t);
  for (const t of Object.keys(snf.zorunluKenarlar ?? {})) anilan.add(t);
  for (const t of anilan) {
    if (tipler.has(t)) continue;
    out.push({ dosya: anaEtiket, tani: yeniTani("tip-evreni-eksik",
      { tip: t, kusur: `"${t}" tipi sarma ya da kenar kaydında anılıyor ama tip evreninde tanımlı değil` }, konum) });
  }
  for (const t of snf.widgetTipleri) {
    if (snf.aileler && !(t.aile in snf.aileler)) {
      out.push({ dosya: anaEtiket, tani: yeniTani("tip-evreni-eksik",
        { tip: t.ad, kusur: `"${t.ad}" tipinin ailesi ("${t.aile}") aile kataloğunda yok` }, konum) });
    }
  }

  // Omurga tipleri: aile, şema ve sarma kaydı birlikte bulunur.
  for (const t of OMURGA_TIPLERI) {
    const eksik: string[] = [];
    if (!tipler.has(t)) eksik.push("tip kaydı");
    if (!snf.semalar?.[t]) eksik.push("şema kaydı");
    const sarilir = Object.values(snf.izinliSarma).some((c) => c.includes(t)) || Boolean(snf.izinliSarma[t]);
    if (!sarilir) eksik.push("izinli sarma kaydı");
    if (eksik.length) {
      out.push({ dosya: anaEtiket, tani: yeniTani("omurga-tipi-eksik",
        { tip: t, kusur: `${eksik.join(" · ")} bulunmuyor` }, konum) });
    }
  }

  // Şema sözleşmesi: her kanonik tip yapısal sözleşmesini beyan eder.
  for (const t of snf.widgetTipleri) {
    if (snf.semalar?.[t.ad]) continue;
    out.push({ dosya: anaEtiket, tani: yeniTani("şema-tanımı-eksik",
      { tip: t.ad, kusur: "tipin şema kaydı hiç yazılmamış" }, konum) });
  }

  // Katkılı örtü: örtü taban şemayı yeniden tanımlayamaz.
  for (const [tip, govde] of Object.entries(ortu?.semalar ?? {})) {
    const alanlar = Object.keys((govde ?? {}) as Record<string, unknown>);
    const izinsiz = alanlar.filter((x) => x !== "enum");
    if (izinsiz.length) {
      out.push({ dosya: "oz/siniflama/ortu.json", tani: yeniTani("örtü-ihlali",
        { kusur: `"${tip}" şemasında örtü izinli enum birleşimi dışında alan yazıyor (${izinsiz.join(" · ")})` }, konum) });
    }
  }
  return out;
}

// ── Terfi kanıtı (bir tanı) ─────────────────────────────────────────────────

/**
 * Terfi kanıtı: bir hükmün tanı düzeyi ancak çalışan uygulama bağı, tekrar
 * üretilebilir doğrulama ve yetkili açık kabul kaydı birlikte bulunduğunda
 * yükseltilir; üç kanıttan hiçbiri düzyazı iddiasıyla ikame edilemez.
 */
export function terfiKanitiTanilari(
  programlar: ReadonlyMap<string, Program>,
  muaflar?: ReadonlySet<string>,
): Array<{ dosya: string; tani: Tani }> {
  const out: Array<{ dosya: string; tani: Tani }> = [];
  for (const { dosya, d } of yeniDugumler(programlar, muaflar)) {
    if (ogretimDunyasi(dosya)) continue;
    const kuralMi = d.tur === "kuralTanım" || d.ad === "Kural" || d.ad === "GenelKural" || d.ad === "ÖzelKural";
    if (!kuralMi) continue;
    const duzey = yeniAlanMetin(d, "düzey");
    if (duzey !== "hata" && duzey !== "uyarı") continue;
    const eksik: string[] = [];
    if (!yeniListe(d, "uygulama").length && !yeniListe(d, "tanı").length) eksik.push("çalışan uygulama bağı");
    if (!yeniListe(d, "doğrulama").length) eksik.push("tekrar üretilebilir doğrulama bağı");
    if (!yeniListe(d, "kabul").length && !yeniAlanMetin(d, "kabul")?.trim()) eksik.push("yetkili açık kabul kaydı");
    if (!eksik.length) continue;
    out.push({ dosya, tani: yeniTani("terfi-kanıtı-eksik",
      { kimlik: yeniKimlik(d), kusur: `${eksik.join(" · ")} bağlanmamış` }, d) });
  }
  return out;
}

// ── Yüzeyler ve prizma (altı tanı) ──────────────────────────────────────────

/** Türetilmiş yapısal yüz uzantıları. */
const YAPISAL_YUZ_UZANTI: readonly string[] = [".json", ".yaml", ".yml", ".xml"];

/**
 * Yüzey hükümleri: türetilmiş yüz tek nötr ağaçtan gelir, elle yazılan dosya
 * kanonik kaynağın eş-yetkili ikizi olamaz, üretim idempotandır, geliştirme
 * yüzü çekirdeğin tanı evrenini genişletemez, her yüzey kimlik ve köken
 * sözleşmesini taşır ve tema rolleri tek paletten okunur.
 */
export function yuzTanilari(
  programlar: ReadonlyMap<string, Program>,
  snf: Siniflama,
  disk: DiskAnlikGoruntu,
  dizin: string,
  muaflar?: ReadonlySet<string>,
): Array<{ dosya: string; tani: Tani }> {
  const out: Array<{ dosya: string; tani: Tani }> = [];
  const konum = { satir: 1, sutun: 1 };
  const sarKokleri = new Set(disk.girdiler
    .filter((g) => g.tur === "dosya" && g.yol.endsWith(".sar"))
    .map((g) => g.yol.slice(0, -4)));

  for (const g of disk.girdiler) {
    if (g.tur !== "dosya") continue;
    const nokta = g.yol.lastIndexOf(".");
    const uzanti = nokta === -1 ? "" : g.yol.slice(nokta);
    const kok = nokta === -1 ? g.yol : g.yol.slice(0, nokta);

    // Prizma kaynak ayrışması: aynı adı taşıyan yapısal yüz, kaynağın nötr
    // ağacından üretildiğini göstermelidir.
    if (YAPISAL_YUZ_UZANTI.includes(uzanti) && sarKokleri.has(kok)) {
      const metin = dosyaOku(dizin, g.yol);
      if (metin !== undefined && !/üretilmiştir/i.test(metin.slice(0, 400))) {
        out.push({ dosya: g.yol, tani: yeniTani("prizma-kaynak-ayrışması",
          { dosya: g.yol, kusur: "kaynağıyla aynı adı taşıyan yapısal yüz üretim künyesi göstermiyor" }, konum) });
      }
    }

    if (uzanti !== ".md") continue;
    const metin = dosyaOku(dizin, g.yol);
    if (metin === undefined) continue;

    // Eş-yetkili ikiz: kaynağın yanında duran elle yazılmış normatif metin.
    if (sarKokleri.has(kok) && !/üretilmiştir/i.test(metin.slice(0, 400)) && NORMATIF.test(metin)) {
      out.push({ dosya: g.yol, tani: yeniTani("eş-yetkili-yüz-ikizi",
        { dosya: g.yol, kusur: "kanonik kaynakla aynı adı taşıyor, bağlayıcı cümle kuruyor ve üretim künyesi yok" }, konum) });
    }

    // İdempotans: aynı üretim bölgesi iki kez açılamaz, açık bölge kapanmalıdır.
    const baslar = [...metin.matchAll(BOLGE_BAS)].map((m) => m[1]);
    const sonlar = [...metin.matchAll(BOLGE_SON)].map((m) => m[1]);
    for (const ad of new Set(baslar)) {
      const bas = baslar.filter((x) => x === ad).length;
      const son = sonlar.filter((x) => x === ad).length;
      if (bas !== son) {
        out.push({ dosya: g.yol, tani: yeniTani("yüz-idempotans-drifti",
          { dosya: g.yol, kusur: `"${ad}" üretim bölgesi ${bas} kez açılmış, ${son} kez kapanmış` }, konum) });
      } else if (bas > 1) {
        out.push({ dosya: g.yol, tani: yeniTani("yüz-idempotans-drifti",
          { dosya: g.yol, kusur: `"${ad}" üretim bölgesi aynı dosyada ${bas} kez tanımlanmış; üretici hangisini yenileyeceğini seçemez` }, konum) });
      }
    }
  }

  // Geliştirme yüzü: sunum katmanı çekirdeğin tanı evrenini genişletemez.
  {
    const sicil = taniSicili(snf);
    const eklentiSrc = join(dizin, "urun", "eklenti", "src");
    if (existsSync(eklentiSrc)) {
      const tara = (yol: string, goreli: string): void => {
        let girisler: Dirent[];
        try { girisler = readdirSync(yol, { withFileTypes: true }); } catch { return; }
        for (const e of girisler) {
          const alt = join(yol, e.name);
          const altGoreli = goreli ? `${goreli}/${e.name}` : e.name;
          if (e.isDirectory()) { tara(alt, altGoreli); continue; }
          if (!e.name.endsWith(".ts")) continue;
          let kaynak: string;
          try { kaynak = readFileSync(alt, "utf8"); } catch { continue; }
          for (const m of kaynak.matchAll(/kod: "([a-zçğıöşü][a-zçğıöşü0-9-]*)"/g)) {
            if (sicil.has(m[1])) continue;
            out.push({ dosya: `urun/eklenti/src/${altGoreli}`, tani: yeniTani("geliştirme-yüzü-drifti",
              { kusur: `sunum katmanı sicilde bulunmayan "${m[1]}" tanı kimliğini kendisi üretiyor` }, konum) });
          }
        }
      };
      tara(eklentiSrc, "");
    }
  }

  // Yüzey sözleşmesi ve palet: kimlik, köken ve tema rolü birlikte yaşar.
  const { duzen, yaprak } = snf.yuzeyKurali;
  const paletRolleri = new Set<string>();
  for (const v of Object.values(snf.temaRolleri ?? {})) {
    if (Array.isArray(v)) for (const r of v) paletRolleri.add(r);
  }
  for (const { dosya, d } of yeniDugumler(programlar, muaflar)) {
    if (d.tur !== "widget" || ogretimDunyasi(dosya)) continue;
    if (!duzen.includes(d.ad) && !yaprak.includes(d.ad)) continue;

    if (duzen.includes(d.ad) && !yeniAlanMetin(d, "kod")) {
      out.push({ dosya, tani: yeniTani("yüzey-sözleşmesi-eksik",
        { kimlik: d.ad, kusur: "yüzeyin kararlı kimliği yazılmamış; taşındığında geçmişi kopar" }, d) });
    }
    if (paletRolleri.size) {
      for (const alan of ["stil", "renk", "rol", "ölçek"]) {
        const v = yeniAlanMetin(d, alan);
        if (!v || paletRolleri.has(v)) continue;
        if (/^#|^rgb|^var\(/.test(v)) continue;   // ham değer ayrı bekçinin işidir
        out.push({ dosya, tani: yeniTani("palet-yüz-drifti",
          { rol: v, kusur: "bu rol kanonik palette tanımlı değil" }, d) });
      }
    }
  }
  return out;
}

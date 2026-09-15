// ═══════════════════════════════════════════════════════════════════════════
// kanon-kesif.ts — 🧭 KANON KEŞFİ: varlık kökü İLANDAN bulunur (SAF çekirdek)
//
//   Founder canlı gözlemi 2026-08-21: yeni ve boş bir çalışma alanında açılan
//   bir kanon dosyası alışılmış görüntüyü vermedi. Ölçüm üç kaynağın da yalnız
//   bu depoda yaşadığını gösterdi; üçüncüsü tip sistemi kaydının SABİT bir
//   klasör adıyla aranmasıydı. Klasörün adı `_Sarmal` değilse kayıt bulunamıyor
//   ve eklenti sessizce gömülü taban kanona düşüyordu.
//
//   Onarım tek cümleyle şudur: klasörün ADI hiçbir şey ilan etmez, `*_anadizin.sar`
//   dosyası ilan eder (DIL-1.2). Bu modül varlık kökünü o ilandan bulur; ad ne
//   olursa olsun kayıt doğru yerden okunur. Emsali eklentinin kendi içindedir
//   (`yolharitasi.ts` varlıkBul ve `eklenti.ts` varlıkKöku aynı deseni kullanır);
//   burada üçüncü bir desen doğmaz, var olan desen paylaşılan bir kapıya iner.
//
//   SAF: bu modül `vscode` İTHAL ETMEZ. Yalnız dosya sistemini okur, dolayısıyla
//   nöbetler onu gerçek fikstür ağaçlarına karşı doğrudan koşturur.
// ═══════════════════════════════════════════════════════════════════════════

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, sep } from "node:path";
import { anadizinBul } from "../../cekirdek/src/denetci.ts";
import { iskeletPlani } from "../../cekirdek/src/iskeletci.ts";
import { belirtecle } from "../../cekirdek/src/belirtec.ts";
import { ayristir } from "../../cekirdek/src/ayristirici.ts";
import type { Siniflama } from "../../cekirdek/src/siniflama.ts";

/** Yukarı yürüyüşün kat sınırı — emsal iki çağrı yerinde de on ikidir. */
const KAT_SINIRI = 12;

// ── 🪧 KANON İŞARETÇİSİ (BKM-DNT-A15) ───────────────────────────────────────
//   Ölçülmüş kusur şudur: doğuş paketiyle doğan bir kök TEK BAŞINA açıldığında
//   `oz/siniflama/kayit.json` hiçbir yerde bulunamaz ve `eklenti.ts` içindeki
//   tam-orkestrasyon turu o kökü sessizce ATLAR; panelin proje kapsamlı tanıları
//   o ağaçta hiç doğmaz. Kayıt bulunamayınca renk ve ipucu gömülü kanona düştüğü
//   için kusur görünmez kalır: kullanıcı panelin boş olmasını "temiz" sanar.
//
//   ONARIM KOPYA DEĞİL ADRESTİR. Doğan köke kanonun kendisi yazılsaydı doksan
//   altı kilobaytlık kayıt her projede ikizlenir ve ilk kanon güncellemesinde
//   bayatlardı; dahası motorun yalnız kanon sahibinin kendi deposunda koşturduğu
//   kapılar (kullanımsız-tip gibi) her doğan ağaçta uyanırdı. Bu yüzden doğan kök
//   yalnız bir İŞARETÇİ taşır ve işaretçi, kendisini doğuran kurulumun kökünü
//   bildirir.
//
//   İŞARETÇİ YALNIZ TABANI SUNAR. Çözüm listesi bilinçle iki dosyayla sınırlıdır:
//   taban kayıt ile onun öğretici ikizi. Çalışma-alanı örtüsü (`ortu.json`) bu
//   listeye ALINMAZ, çünkü örtü bir varlığın KENDİ tip katkısıdır ve işaretçi
//   üstünden ödünç alınsaydı doğuran kurulumun örtüsü doğan projenin görünümüne
//   sızardı; bu STR-3'ün kırmızı çizgisidir.
const ISARETCI_DOSYASI = join("oz", "siniflama", "isaretci.json");
const ISARETCININ_SUNDUGU = new Set([
  join("oz", "siniflama", "kayit.json"),
  join("oz", "siniflama", "rehber.json"),
]);

/** İşaretçinin diskteki şekli — yalnız doğuran kurulumun kökünü bildirir. */
interface KanonIsaretcisi { kanonKoku?: unknown }

/**
 * Bir dizinden yukarı yürüyüp kanon işaretçisini arar ve bildirdiği kurulum
 * kökünü döndürür. Bozuk ya da göreli adres taşıyan işaretçi YOK sayılır:
 * çözülemeyen bir adres, adres olmamaktan daha kötüdür, çünkü var olmayan bir
 * dosyaya işaret eden kayıt sonraki her aramayı yanıltır.
 */
function isaretciKokuBul(baslangicDizin: string): string | undefined {
  let dizin = baslangicDizin;
  for (let i = 0; i < KAT_SINIRI; i++) {
    const aday = join(dizin, ISARETCI_DOSYASI);
    if (existsSync(aday)) {
      try {
        const veri = JSON.parse(readFileSync(aday, "utf8")) as KanonIsaretcisi;
        const kok = veri.kanonKoku;
        if (typeof kok === "string" && kok.length > 0 && isAbsolute(kok)) return kok;
      } catch { /* okunamayan işaretçi yok sayılır — yukarı yürüyüş sürer */ }
    }
    const ust = dirname(dizin);
    if (ust === dizin) break;
    dizin = ust;
  }
  return undefined;
}

/**
 * Bir dosyanın bağlı olduğu VARLIK KÖKÜ: yukarı yürünür ve `*_anadizin.sar`
 * ilanını taşıyan ilk dizin köktür (eski `ana.sar` adı da tanınır — göç
 * tamamlanana dek iki desen birlikte yaşar). İlan yoksa kök yoktur ve bu
 * dürüstçe `undefined` ile söylenir; klasör adına bakarak kök uydurulmaz.
 */
export function varlikKokuBul(baslangicDizin: string): string | undefined {
  let dizin = baslangicDizin;
  for (let i = 0; i < KAT_SINIRI; i++) {
    if (anadizinBul(dizin)) return dizin;
    const ust = dirname(dizin);
    if (ust === dizin) break;
    dizin = ust;
  }
  return undefined;
}

/**
 * Bir çalışma alanı kökünün İLAN EDİLMİŞ varlıkları: kökün kendisi ilan
 * taşıyorsa o, ayrıca birinci seviye alt klasörlerden ilan taşıyanlar. Bugünkü
 * tek depo düzeninde bu liste `_Sarmal` ve `_KapaliUrun` verir; yarın adlar
 * değişirse liste kendiliğinden onları verir, çünkü listeyi ad değil ilan kurar.
 */
export function ilanliVarliklar(calismaAlaniKoku: string): string[] {
  const koklar: string[] = [];
  if (anadizinBul(calismaAlaniKoku)) koklar.push(calismaAlaniKoku);
  try {
    for (const alt of readdirSync(calismaAlaniKoku, { withFileTypes: true })) {
      if (!alt.isDirectory() || alt.name.startsWith(".") || alt.name === "node_modules") continue;
      const aday = join(calismaAlaniKoku, alt.name);
      if (anadizinBul(aday)) koklar.push(aday);
    }
  } catch { /* kök okunamadıysa ilan listesi boş kalır */ }
  return koklar;
}

/**
 * Bir çıktının hangi varlık köküne yazılacağını belirler. Sıra yine dardan
 * genişe gider: açık belgenin kendi varlığı, sonra çalışma alanında ilan
 * edilmiş varlıklardan hedefi taşıyan, sonra ilan edilmiş ilk varlık, en sonda
 * çalışma alanı kökünün kendisi. Eskiden burada `_Sarmal` adı sabit yazılıydı ve
 * başka adla açılan bir depoda geribildirim hasadı, var olmayan bir klasöre
 * yazılıyordu.
 *
 * Hedefi taşıma sorusu bir SORGUDUR, klasör adı değil (EKL-F6-A10). Eski imza
 * bir klasör adı alıyor ve onu kökün hemen altında arıyordu; hasat bu yüzden
 * öğrenme rafını ilan edildiği yerde değil kökte arıyordu. Çağıran artık hedefin
 * o kökte bulunup bulunmadığını kendi ölçüsüyle söyler.
 */
export function yazimKokuBul(
  acikBelgeDizini: string | undefined,
  calismaAlaniKokleri: readonly string[],
  hedefiTasir: (varlikKoku: string) => boolean,
): string | undefined {
  if (acikBelgeDizini) {
    const kok = varlikKokuBul(acikBelgeDizini);
    if (kok) return kok;
  }
  const ilanlilar = calismaAlaniKokleri.flatMap((k) => ilanliVarliklar(k));
  const yerlesik = ilanlilar.find(hedefiTasir);
  return yerlesik ?? ilanlilar[0] ?? calismaAlaniKokleri[0];
}

// ── 🌾 GERİBİLDİRİM HASADININ HEDEFİ (EKL-F6-A10) ───────────────────────────
//   Ölçülmüş kusur: hasat komutu yazacağı dosyanın yolunu sabit bir klasör
//   adıyla kuruyor ve öğrenme rafını kökün hemen altında arıyordu; doğuş paketi
//   ise öğrenme kartlarını öğreti kitaplığının içindeki rafa yazar. Ya kök
//   bulunamaz ve komut hiçbir şey yazmadan sessizce döner ya da kökün altında
//   ilan edilmemiş bir klasör doğar. Onarım yolu ilandan çözer: rafın adresi bir
//   sabit değil, giriş dosyasındaki Kitaplık ve Raf beyanıdır.

/**
 * Öğrenme rafının kanondaki adı. Sınıflama etmen hafızasının evini "ogrenme/
 * rafı" diye tarif eder; raf bu adla tanınır, fakat YERİ ilandan okunur: hangi
 * Kitaplığın içinde durduğu ve kökten ne kadar derinde olduğu beyanın işidir.
 */
const OGRENME_RAFI_ADI = "ogrenme";

/** Hasadın yazdığı dosyanın adı — doğuş paketinin öğrenme rafına koyduğu dosya. */
export const HASAT_DOSYASI = "geribildirim.sar";

/**
 * Bir varlık kökünün İLAN ETTİĞİ öğrenme rafının mutlak yolu. Giriş dosyası
 * ayrıştırılır ve iskeletçinin klasör planı kurulur; plan Kitaplık yolunu rafın
 * yoluna ekleyerek rafın kökten göreli adresini verir. İlan yoksa, ayrıştırılamıyorsa
 * ya da öğrenme rafı ilan edilmemişse sonuç yoktur ve bu dürüstçe söylenir.
 */
export function ogrenmeRafiBul(varlikKoku: string, snf: Siniflama): string | undefined {
  const giris = anadizinBul(varlikKoku);
  if (!giris) return undefined;
  let plan: ReturnType<typeof iskeletPlani>;
  try { plan = iskeletPlani(ayristir(belirtecle(readFileSync(giris, "utf8"))), snf); }
  catch { return undefined; }   // ayrıştırılamayan ilandan raf uydurulmaz
  const raf = plan.ogeler.find((o) =>
    o.tur === "dizin" && o.icerikRafi === true && o.yol.split("/").pop() === OGRENME_RAFI_ADI);
  return raf ? join(varlikKoku, raf.yol) : undefined;
}

/** Hasadın yazılacağı yer: varlık kökü, dosyanın mutlak yolu ve köke göreli yolu. */
export interface HasatHedefi {
  readonly kok: string;
  readonly dosya: string;
  /** Köke göreli, eğik çizgili yol — kullanıcıya gösterilen ve dosya başlığına yazılan yol. */
  readonly goreli: string;
}

/**
 * Geribildirim hasadının hedefi. Kök `yazimKokuBul` sırasıyla seçilir ve hedefi
 * taşıyan kök, öğrenme rafını ilanında taşıyan köktür. Seçilen kök rafı ilan
 * etmiyorsa hedef YOKTUR: hasat klasör uydurmaz, çünkü ilansız klasör drifttir
 * (`beyansız-yapı`); çağıran kullanıcıya rafın ilan edilmesi gerektiğini söyler.
 */
export function hasatHedefiBul(
  acikBelgeDizini: string | undefined,
  calismaAlaniKokleri: readonly string[],
  snfCoz: (varlikKoku: string) => Siniflama | undefined,
): HasatHedefi | undefined {
  const rafVar = (k: string): boolean => {
    const s = snfCoz(k);
    return s !== undefined && ogrenmeRafiBul(k, s) !== undefined;
  };
  const kok = yazimKokuBul(acikBelgeDizini, calismaAlaniKokleri, rafVar);
  if (!kok) return undefined;
  const snf = snfCoz(kok);
  if (!snf) return undefined;
  const raf = ogrenmeRafiBul(kok, snf);
  if (!raf) return undefined;
  const dosya = join(raf, HASAT_DOSYASI);
  return { kok, dosya, goreli: relative(kok, dosya).split(sep).join("/") };
}

// ── 📦 PAKETİN KANON KOPYASI (EKL-F6-A09) ───────────────────────────────────
//   Ölçülmüş kusur: mağaza paketi diskte hiçbir kanon dosyası taşımıyordu, kanon
//   pakete yalnız gömülü girmişti (`gomulu-kanon.ts`). Tam proje denetimi ise tip
//   kaydını diskte bir YOL olarak ister; bu yüzden işaretçiden önce doğmuş ve
//   diskinde kanon bulunmayan bir ağaçta `eklenti.ts` o kökün tam denetimini
//   sessizce atlıyordu ve panelin boşluğu temiz ağaç sanılıyordu. Derleme artık
//   kayıt ile rehberi pakete kopyalar (`arac/renk-uret.mjs`) ve keşif, bütün
//   gerçek adaylar ile işaretçi tükendikten SONRA o kopyaya düşer. Sıra kasıtlıdır:
//   kopya en son çaredir, dolayısıyla var olan hiçbir kanonu ve hiçbir işaretçiyi
//   gölgeleyemez.

/** Paketin kanon kopyasının eklenti köküne göreli yeri — derlemede `renk-uret.mjs` yazar. */
export const PAKET_KANON_DIZINI = join("dist", "kanon");

/** Tip sistemi kaydının bir kanon köküne göreli yolu. */
export const KANON_KAYDI = join("oz", "siniflama", "kayit.json");

/**
 * Bir varlığa ait göreli yolun (örneğin `oz/siniflama/kayit.json`) diskteki
 * karşılığını arar. Sıra kasıtlıdır ve dardan genişe gider: önce belgenin kendi
 * ağacında yukarı yürünür, sonra belgenin varlık kökünde bakılır, sonra
 * çalışma alanının İLAN EDİLMİŞ varlıkları taranır, ardından kanon işaretçisi
 * okunur ve en sonda, verilmişse, paketin kendi kanon kopyasına düşülür. Hiçbir
 * adımda klasör adı sabit yazılmaz.
 */
export function varlikDosyasiBul(
  baslangicDizin: string,
  goreli: string,
  calismaAlaniKokleri: readonly string[] = [],
  paketKanonKoku?: string,
): string | undefined {
  let dizin = baslangicDizin;
  for (let i = 0; i < KAT_SINIRI; i++) {
    const aday = join(dizin, goreli);
    if (existsSync(aday)) return aday;
    const ust = dirname(dizin);
    if (ust === dizin) break;
    dizin = ust;
  }
  for (const kok of calismaAlaniKokleri) {
    const dogrudan = join(kok, goreli);
    if (existsSync(dogrudan)) return dogrudan;
    for (const varlik of ilanliVarliklar(kok)) {
      const aday = join(varlik, goreli);
      if (existsSync(aday)) return aday;
    }
  }
  // GERİYE DÖNÜK UYUM: ilanını henüz yazmamış bir klasör de kanon taşıyor
  // olabilir. Bu son çare, ilan aramasından SONRA gelir ve onun yerine geçmez;
  // amacı, ilan disiplinine bugün uymayan bir depoyu zekâsız bırakmamaktır.
  for (const kok of calismaAlaniKokleri) {
    try {
      for (const alt of readdirSync(kok, { withFileTypes: true })) {
        if (!alt.isDirectory() || alt.name.startsWith(".") || alt.name === "node_modules") continue;
        const aday = join(kok, alt.name, goreli);
        if (existsSync(aday)) return aday;
      }
    } catch { /* kök okunamadıysa sessiz geç */ }
  }
  // EN SON ÇARE: kanon işaretçisi. Buraya ancak diskte hiçbir gerçek kayıt
  // bulunamadığında gelinir, dolayısıyla işaretçi var olan bir kanonu ASLA
  // gölgelemez; yalnız hiç kanonu olmayan bir kökü kör bırakmaktan kurtarır.
  if (!ISARETCININ_SUNDUGU.has(goreli)) return undefined;
  for (const baslangic of [baslangicDizin, ...calismaAlaniKokleri]) {
    const kurulum = isaretciKokuBul(baslangic);
    if (!kurulum) continue;
    const aday = join(kurulum, goreli);
    if (existsSync(aday)) return aday;
  }
  // PAKETİN KENDİ KOPYASI (EKL-F6-A09): işaretçiden de SONRA gelir. Paket yalnız
  // işaretçinin sunduğu iki dosyayı taşır; örtü bu kapıdan asla gelmez, çünkü
  // örtü projenin kendi tip katkısıdır ve eklentinin malı değildir.
  if (paketKanonKoku) {
    const aday = join(paketKanonKoku, goreli);
    if (existsSync(aday)) return aday;
  }
  return undefined;
}

/** Tam proje denetiminin kullanacağı tip kaydı ve kaydın nereden geldiği. */
export interface TamDenetimKanonu {
  readonly snfYol: string;
  /** `proje`: diskte gerçek kayıt ya da işaretçinin adresi; `paket`: eklentinin kendi kopyası. */
  readonly kaynak: "proje" | "paket";
}

/**
 * Bir kökün tam proje denetimi için tip kaydını çözer. Zincir `varlikDosyasiBul`
 * ile birebir aynıdır ve paketin kopyası son halkadır; sonuç `undefined` ise
 * hiçbir kanon bulunamamıştır ve çağıran bunu kullanıcıya SÖYLEMEK zorundadır,
 * çünkü o kökte proje kapsamlı tanılar doğmaz.
 */
export function tamDenetimKanonuBul(
  kok: string,
  calismaAlaniKokleri: readonly string[],
  paketKanonKoku?: string,
): TamDenetimKanonu | undefined {
  const snfYol = varlikDosyasiBul(kok, KANON_KAYDI, calismaAlaniKokleri, paketKanonKoku);
  if (!snfYol) return undefined;
  const paketKaydi = paketKanonKoku ? join(paketKanonKoku, KANON_KAYDI) : undefined;
  return { snfYol, kaynak: snfYol === paketKaydi ? "paket" : "proje" };
}

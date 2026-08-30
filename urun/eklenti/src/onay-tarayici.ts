// ═══════════════════════════════════════════════════════════════════════════
// onay-tarayici.ts — 📬 ONAY KAPISI TARAYICISI (kuyruğun ve panelin TEK gözü)
//
//   Founder onayı bekleyen kapıların çalışma alanı genelindeki listesi BURADA
//   üretilir ve yalnız burada üretilir. Tüketicisi Onaylar panelidir
//   (posta-kutusu.ts); onay kuyruğu (onay-kuyrugu.ts) aynı listeyi panele
//   yerleştirir ve seçilen tek kapı için karar yüzeyini açar. İki ayrı tarayıcı
//   yazılsaydı biri sessizce bayatlar ve kullanıcı iki farklı gerçekle
//   karşılaşırdı (RED-2 dersi: elle ikiz liste yasak).
//
//   KAPSAM TEK EVRENDEN GELİR. Tarama tarafı `TARAMA_DISLAMA_GLOB` ile, olay
//   tarafı `sarKapsamDisi` ile ölçer ve ikisi de `SAR_DISLANANLAR` listesinden
//   türer. Ana tanı hattından gelen anlık görüntü de AYNI süzgeçten geçirilir;
//   böylece "hangi dosya kuyruğa girer" sorusuna iki ayrı cevap doğamaz.
//
//   AÇILIŞ MALİYETİ BURADA KAPANDI (VIT-POSTA-A03). Bu modül eskiden açılışta
//   kapsam içindeki her `.sar` dosyasını `openTextDocument` ile açıyor ve tam
//   sözdizim ağacını paylaşımlı belge önbelleğine yazıyordu; ölçülen maliyet
//   bugünkü çalışma ağacında iki yüz doksan sekiz belgeydi. Artık kapı listesi
//   ana tanı hattının zaten ürettiği anlık görüntüden çıkar. Yedek tur yalnız
//   görüntü HENÜZ GELMEDİYSE koşar (PRF-TA-A03: hat susmaz, denetim kapalıyken de
//   yayın yapar), dosyayı `workspace.fs.readFile` ile bir kez okur ve ağacı
//   paylaşımlı önbelleğe KOYMAZ.
//
//   Bu modül vscode kabuğu ister; kapı tanıma kuralı, defter ve tarama düzeni
//   saf çekirdekte yaşar (onay-cekirdek.ts) ve nöbet onları kabuk kurmadan
//   koşturur. Plan izi: VIT-POSTA-A01 · VIT-POSTA-A03 · KOD-ONAY-TARAYICI.
// ═══════════════════════════════════════════════════════════════════════════

import * as vscode from "vscode";
import { TARAMA_DISLAMA_GLOB, sarKapsamDisi } from "./izleyici-cekirdek.ts";
import {
  onayKapilariTopla, kapilariTopla, adimOnayDegeri, adimBeklerDegeri, adimKodAdedi,
  type OnayKapisi, type KapiKaydi, type ProgramGoruntusu, type TaramaKabugu,
  type OnayKaniti,
} from "./onay-cekirdek.ts";
import { programAl } from "./onbellek.ts";
import { turGoruntusunuDinle } from "./tur-goruntusu.ts";   // 🗺️ PRF-TA-A02: turun tek yayını
import { belirtecle } from "../../cekirdek/src/belirtec.ts";
import { ayristir } from "../../cekirdek/src/ayristirici.ts";
import type { Program, Dugum } from "../../cekirdek/src/sozdizim.ts";

/**
 * Bu yol kuyruğun kapsamı dışında mı? Tam taramanın dışlama globuyla BİREBİR
 * aynı evren; ölçüm çalışma-alanı-göreli yol üstünde yapılır.
 */
export function kapsamDisi(uri: vscode.Uri): boolean {
  return sarKapsamDisi(vscode.workspace.asRelativePath(uri, false));
}

/**
 * Yalnız GERÇEK diskteki, kapsam içindeki .sar belgeleri kuyruğa girer (0.9.77
 * saha bulgusu: git/zaman-tüneli salt-okunur ESKİ kopyalar da "sarmal"
 * belgedir — onlarda `onay:` henüz görünmediğinden çoktan karara bağlanmış
 * kapılar hayalet olarak geri geliyordu). file-şeması dışındaki her belge
 * (git:, gitlens:, vscode-local-history: …) kuyruk-körüdür.
 */
export function kuyrukBelgesiMi(doc: vscode.TextDocument): boolean {
  return doc.uri.scheme === "file"
    && doc.languageId === "sarmal"
    && !kapsamDisi(doc.uri);
}

/**
 * AÇIK belgenin kapıları — karar mantığı saf çekirdekte (onay-cekirdek.ts).
 * Bu yol bilerek korunur: kullanıcı yazarken kaydedilmemiş metin diskteki
 * gerçekten daha yenidir ve panel onu göstermeye devam etmelidir.
 */
export function belgeKapilari(doc: vscode.TextDocument): OnayKapisi[] {
  return onayKapilariTopla(programAl(doc)?.bildirimler ?? []);
}

/**
 * AÇIK belgenin kapıları, ayrıştırılamama bilgisiyle birlikte — yazım hattının
 * gözü. `belgeKapilari` boş listeye düşer ve panel için doğru davranıştır;
 * yazım hattı ise "kapı yok" ile "belge okunamıyor" cümlelerini AYIRMAK
 * zorundadır, çünkü ikisi kullanıcıya iki ayrı şey söyletir (Kusur 2).
 */
export function belgeKapilariOkumasi(doc: vscode.TextDocument): OnayKapisi[] | undefined {
  const program = programAl(doc);
  return program ? onayKapilariTopla(program.bildirimler) : undefined;
}

/**
 * Kodun AÇIK belgede kaç Adımda geçtiği — açık ya da kapalı fark etmez. Çapa
 * tekilliği bunun üstünde ölçülür: kod kapalı bir ikizde de geçiyorsa yazım durur.
 */
export function belgeKodAdedi(doc: vscode.TextDocument, kod: string): number {
  return adimKodAdedi(programAl(doc)?.bildirimler ?? [], kod);
}

/**
 * AÇIK belgedeki bir Adımın onay kanıtı — kanıtlı yazımın BELLEK ayağı.
 * Aynı ayrıştırıcıdan geçer; ikinci bir kural evreni doğmaz. Belge
 * ayrıştırılamıyorsa bu AÇIKÇA söylenir; "değer yok"a indirgenmez.
 */
export function belgeOnayKaniti(doc: vscode.TextDocument, kod: string): OnayKaniti {
  const program = programAl(doc);
  if (!program) return { tur: "ayrıştırılamadı" };
  return {
    tur: "değer",
    onay: adimOnayDegeri(program.bildirimler, kod),
    // Founder hükmü (2026-08-29): karar yazıldıktan sonra bekleme ilanı DURAMAZ.
    // Kanıt tek okumada toplanır, çünkü iki olguyu ayrı turlarda sormak, sapmanın
    // fark edilmeden diske inmesine izin veren yolun ta kendisiydi.
    bekler: adimBeklerDegeri(program.bildirimler, kod),
  };
}

/**
 * TEK DOSYANIN hedefli disk okuması — kanıtlı yazımın DİSK ayağı.
 *
 * Bu çağrı ikinci bir çalışma alanı taraması DEĞİLDİR ve öyle sayılmaz: tarama
 * sayaçları (`okunanDosya` · `dosyaAramasi`) bilerek artırılmaz, çünkü onlar
 * "açılışta kaç dosya taranıyor" sorusunu ölçer. Burada okunan şey kullanıcının
 * az önce karar verdiği tek dosyadır ve okuma amacı kayıt kanıtıdır.
 */
export async function disktenOnayKaniti(
  dosya: string, kod: string,
): Promise<OnayKaniti> {
  const ham = await vscode.workspace.fs.readFile(vscode.Uri.file(dosya));
  const metin = new TextDecoder("utf-8").decode(ham);
  // Yazım diskteki belgeyi bozduysa ayrıştırma patlar. Patlama SESSİZ bir komut
  // reddine dönüşemez ve "değer yok"a da İNDİRGENEMEZ: eskiden undefined dönüyor
  // ve kullanıcı yalnız bir uyuşmazlık görüyordu; şimdi çağıran dosyanın bozulmuş
  // olabileceğini açıkça söyler ve kapı listede kalır.
  try {
    const bildirimler = ayristir(belirtecle(metin)).bildirimler;
    return {
      tur: "değer",
      onay: adimOnayDegeri(bildirimler, kod),
      bekler: adimBeklerDegeri(bildirimler, kod),
    };
  } catch { return { tur: "ayrıştırılamadı" }; }
}

// ── 🔭 ANA TANI HATTININ ANLIK GÖRÜNTÜSÜ ────────────────────────────────────
//   Ana tanı turu bitince ürettiği ağacı TEK NOKTADAN yayınlar (tur-goruntusu.ts)
//   ve bu modül o yayının abonesidir; kapı çıkarma işini tur KENDİSİ yapmaz (ana
//   hat kapı tanımaz). Denetim ayarı kapalıyken de hat SUSMAZ: tur koşar ve
//   görüntüsünü yayınlar, yalnız tanı üretmez (PRF-TA-A03 ikinci tur). Onay
//   yüzeyinin açılışta beklediği tek şey bu görüntüdür; gelmeden yedek tarama
//   başlamaz, dolayısıyla iki tur yarışmaz. Eski "hat sustu" bildirimi üçüncü
//   turda söküldü (denetçi bulgusu): dışa açık ölü bir kapı, bir gün çağrıldığında
//   görüntüsüz ikinci bir yol olarak geri dönerdi.
//
//   🗺️ PRF-TA-A02: görüntüyü bildiren işlev DIŞA AÇILMAZ ve yayının abonesinden
//   başka çağıranı yoktur. Gerekçe ölçülmüştür: dışa açık bir bildirim kapısı,
//   turun tek yayınının yanında ikinci bir besleme yolu olarak yaşayabilir ve o
//   yol bir gün kullanıldığında onay yüzeyi ile panel iki ayrı gerçeği gösterir.
//   Kapı kapalıyken "ikinci yol yoktur" cümlesi bir temenni değil, derleyicinin
//   zorladığı bir olgudur.

let anaGoruntu: ProgramGoruntusu | undefined;
const goruntuOlayi = new vscode.EventEmitter<void>();

/** Ana hattın görüntüsü haber verildiğinde atar. */
export const anaGoruntuDegisti = goruntuOlayi.event;

/** Ana tanı turunun sonucu: kapsam süzgecinden geçirilip görüntü olarak saklanır. */
function anaGoruntuyuBildir(programlar: ReadonlyMap<string, Program>): void {
  const harita = new Map<string, readonly Dugum[]>();
  for (const [yol, program] of programlar) {
    // Ana hat ile onay yüzeyi TEK EVRENDE ölçer: glob aynı olsa da dosya-tarafı
    // süzgeç ayrıca uygulanır (gizli dizinlerdeki ajan kopyaları sızmasın).
    if (kapsamDisi(vscode.Uri.file(yol))) continue;
    harita.set(yol, program.bildirimler);
  }
  anaGoruntu = harita;
  goruntuOlayi.fire();
}

// 🗺️ PRF-TA-A02: tarayıcının ana görüntüsü turun TEK yayınından beslenir. Abonelik
// modül ömrü boyunca yaşar ve bırakılmaz, çünkü tarayıcı eklentinin ömrü kadar
// vardır; bırakılan bir abonelik onay yüzeyini sessizce bayat bırakırdı. Ayrıca
// abone burada, verinin sahibi olan modülde kurulur: kabuk (eklenti.ts) hangi
// yüzeyin hangi yayına bağlandığını bilmez ve bilmediği bir bağı koparamaz.
turGoruntusunuDinle((goruntu) => anaGoruntuyuBildir(goruntu.programlar));

/**
 * Bugün elde bir ana görüntü var mı? Ana hattın kaderi de tam olarak budur:
 * susuş yolu söküldüğü için tek olay kalmıştır (görüntü geldi). Bu yüzden aynı
 * yüklemi taşıyan ikinci dışa açık ad üçüncü turda kaldırıldı ve nöbetle yasaklandı:
 * bir yüklemin iki adı bir gün ayrışır ve iki yüzey farklı şeye "hazır" der.
 */
export function anaGoruntuHazirMi(): boolean {
  return anaGoruntu !== undefined;
}

/** Nöbet ve yeniden kurulum için: bildirilen görüntüyü unutur. */
export function anaGoruntuyuUnut(): void {
  anaGoruntu = undefined;
}

// ── 📏 TARAYICI SAYAÇLARI ───────────────────────────────────────────────────
//   Kabul ölçütü "onaya özel ikinci tam tarama turu sayısı sıfırdır" diyor. Bir
//   iddia ancak sayılabiliyorsa kanıtlanabilir; sayaçlar bu yüzden üretimin
//   içindedir ve eklenti dış yüzünden okunur.

const sayac = { yedekTur: 0, goruntudenTur: 0, okunanDosya: 0, dosyaAramasi: 0 };

/** Tarayıcının bugünkü sayaçları — nöbet bu kapıdan okur. */
export function tarayiciOlcumleri(): Readonly<typeof sayac> & { anaGoruntuHazir: boolean } {
  return { ...sayac, anaGoruntuHazir: anaGoruntu !== undefined };
}

/** Nöbet için: sayaçları sıfırlar. Üretim yolu bunu çağırmaz. */
export function tarayiciOlcumleriniSifirla(): void {
  sayac.yedekTur = 0; sayac.goruntudenTur = 0;
  sayac.okunanDosya = 0; sayac.dosyaAramasi = 0;
}

/**
 * Yedek turun vscode kabuğu. `openTextDocument` KULLANMAZ ve `programAl`
 * çağırmaz: dosya ham okunur, saf ayrıştırıcıdan geçer ve ağaç atılır.
 */
export function vscodeKabugu(): TaramaKabugu {
  return {
    async yollariBul(): Promise<readonly string[]> {
      sayac.dosyaAramasi += 1;
      const dosyalar = await vscode.workspace.findFiles("**/*.sar", TARAMA_DISLAMA_GLOB);
      return dosyalar.filter((uri) => !kapsamDisi(uri)).map((uri) => uri.fsPath);
    },
    async metniOku(yol: string): Promise<string> {
      sayac.okunanDosya += 1;
      const ham = await vscode.workspace.fs.readFile(vscode.Uri.file(yol));
      return new TextDecoder("utf-8").decode(ham);
    },
    bildirimleriCoz(metin: string): readonly Dugum[] | undefined {
      try { return ayristir(belirtecle(metin)).bildirimler; }
      catch { return undefined; }
    },
  };
}

/**
 * Bütün çalışma alanının açık kapılarını döndürür. Hiçbir yüzeye dokunmaz:
 * pencere açmak, panel doldurmak ya da bildirim basmak çağıranın işidir.
 *
 * Ana görüntü hazırsa kabuğun hiçbir işlevi çağrılmaz — ne `findFiles`, ne
 * dosya okuma, ne ayrıştırma. Görüntü yoksa tek yedek tur koşar.
 */
export async function calismaAlaniniTara(): Promise<KapiKaydi[]> {
  if (anaGoruntu !== undefined) sayac.goruntudenTur += 1;
  else sayac.yedekTur += 1;
  return kapilariTopla(anaGoruntu, vscodeKabugu());
}

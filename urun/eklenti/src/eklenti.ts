// ═══════════════════════════════════════════════════════════════════════════
// eklenti.ts — Sarmal VS Code eklentisi (giriş)
//
//   Çekirdeği (cekirdek/) doğrudan kullanır. Sağladıkları:
//     • canlı drift diagnostics (SözDizimHatası + SNF-0 drift + öneri)
//     • otomatik tamamlama (IntelliSense) — bkz. tamamlama.ts
//   Meyvesi: tek dil, tek motor — motor da eklenti de TypeScript.
// ═══════════════════════════════════════════════════════════════════════════

import * as vscode from "vscode";

import { dirname, basename, join, isAbsolute } from "node:path";

import { belirtecle, SozDizimHatasi } from "../../cekirdek/src/belirtec.ts";
import { ayristir } from "../../cekirdek/src/ayristirici.ts";
import { dogrula } from "../../cekirdek/src/dogrulayici.ts";
import { BILEREK_HATALI, anadizinBul, fazVadeTanilari, mevsimNormalize } from "../../cekirdek/src/denetci.ts";
import type { Program } from "../../cekirdek/src/sozdizim.ts";
import type { Tani } from "../../cekirdek/src/tani.ts";
import { iskeletPlani, iskeletYaz } from "../../cekirdek/src/iskeletci.ts";
// 🚪 KYN-MTR-A05: eklenti artık kendi elle seçtiği bir üretici alt kümesini AYRI
// AYRI çağırmıyor — proje-denetim.ts'in küçültülmüş yeniden yazımı ORTADAN
// KALKTI. CLI'nin `denetleKomutu`sunun çağırdığı AYNI tek gövdeyi (`denetimKos`)
// çağırır; tam akış, tek kaynaktan ilan edilen panel kod kümesiyle süzülür.
import { denetimKos } from "../../cekirdek/src/denetim.ts";
import { panelCaprazUreticiKumesi } from "../../cekirdek/src/kapi-kapsami.ts";
import { snfBul } from "./ortak.ts";
import {
  PAKET_KANON_DIZINI, eksikKokKaydi, isaretciHedefAdaylari, isaretciPlani, isaretciYaz, tamDenetimKanonuBul, tamDenetimKokTuru, varlikKokuBul,
} from "./kanon-kesif.ts";
import { programAl, belgeKapandi, onbellekAnahtarlari } from "./onbellek.ts";
import { açıkBelgeHaritası, type BelgeYuzu, diskBelgesi, erisimSiniri, taniAgaci, turBelgeleriniTopla, turProgramlariniKur } from "./tur-belgesi.ts";   // ⚡ PRF-A06: tur belge AÇMAZ · PRF-KP-A02: program haritası saf modülde   // EKL-F9-A06: paylaşımlı AST önbelleği
import { kimlikIndeksi, INDEKS_DISI } from "../../cekirdek/src/kimlik.ts";  // EKL-F11-A01/A05: kimlik indeksi (çekirdekte — MCP/CLI ile ortak)
import { gezinmeKaydi } from "./gezinme.ts";               // EKL-F11-A02/A03: F12 · ⇧F12 · F2 · ⌘T
import { imzaSaglayici } from "./imza.ts";                 // EKL-F11-A04: ( imza yardımı
import { baglantiSaglayici, yolCozumleyici } from "./baglanti.ts";   // EKL-F11-A04: tıklanır yollar · VIT-GRAF-A12: meyve kapısının yol çözümü
import { caprazAtifKaydi } from "./atif-baglanti.ts";   // 👁️ VIT-GRAF-A14: çapraz-varlık salt-okunur bakış
import { tamamlamaSaglayici } from "./tamamlama.ts";
import { renkSaglayici, efsane } from "./renk.ts";
import { anahatSaglayici } from "./anahat.ts";
import { ipucuIsaretCizicisi, ipucuSaglayici } from "./ipucu.ts";
import { duzeltmeSaglayici } from "./duzeltme.ts";
import { bicimlendirmeSaglayici } from "./bicimlendir.ts";
import { girintiKaydi } from "./girinti.ts";
import { camKaydi } from "./cam.ts";   // 🪟 cam efekti (Founder 2026-07-18)
import { atifDekorKaydi } from "./atif-dekor.ts";   // NTK-A01: çözülen atıflar link görünümü alır
import { eksenDekorKaydi, parametreDekorKaydi } from "./simge-cizelgesi.ts"; // VIT-KIMLIK-A06/A08: eksen ve parametre satırlarına aile simgesi
import { onayKuyruguKaydi, onayYuzeyiOlcumleri } from "./onay-kuyrugu.ts"; // NTK-A08: Founder karar gelen-kutusu
// 📬 VIT-POSTA-A03: ana tanı turunun anlık görüntüsü onay tarayıcısına AKTARILIR;
// kapıyı ana hat değil tarayıcı tanır. eklenti.ts kapı bilmez, yalnız ağacı taşır.
// 🗺️ PRF-TA-A02: aktarım artık doğrudan çağrı değildir — tur görüntüyü tek noktadan
// yayınlar, tarayıcı o yayının abonesidir. PRF-TA-A03: hattın susuşu diye bir olay
// yoktur; denetim kapalıyken de görüntü yayınlanır, yalnız tanı üretilmez.
import { tarayiciOlcumleri } from "./onay-tarayici.ts";   // PRF-TA-A03: susuş bildirimi diye bir olay yok, görüntü kapalı denetimde de yayınlanır
import { turGoruntusunuYayinla, turGoruntusuOlcumleri, sonTurGoruntusu } from "./tur-goruntusu.ts";   // 🗺️ PRF-TA-A02: turun tek yayın noktası · PRF-TA-A04: salt okur ölçüm kapıları
import { dallarKaydi } from "./dallar.ts";
import { satiriciKaydi } from "./satirici.ts";
import { onizlemeKaydi } from "./onizleme.ts";
import { yolHaritasiKaydi, panelOlcumleri, projeKimligi, type YolHaritasiYuzu } from "./yolharitasi.ts";
import { hatirlaticilarKaydi, type Hatirlaticilar } from "./hatirlaticilar.ts";   // 🔔 YUZ-3.3 ikinci yüzey
import { fikirlerKaydi, type Fikirler } from "./fikirler.ts";                    // 💡 VIT-GRAF-A16 Fikirler yüzeyi
import { bildirimlerKaydi, type Bildirimler } from "./bildirimler.ts";           // 🛈 YUZ-3.3 üçüncü yüzey
import { trenKaydi, type Tren } from "./tren.ts";   // 🚆 Founder 2026-10-21: Tren (yapay zekâ ajanları) veri sağlayıcısı
import { panelKaydi, type SarmalPaneliYuzu } from "./panel.ts";   // 🧭 Founder 2026-10-21: kabın tek webview görünümü (Ray · Tren · Makinist)
import { onayPaneliKaydi, type OnayPaneli } from "./onay-paneli.ts";         // 📬 VIT-POSTA-A01 dördüncü yüzey
import { makinistKaydi } from "./makinist.ts";
import { sinyallerKaydi, type SinyallerAgaci } from "./sinyaller.ts";   // 🚦 PNL-A09 Sinyaller sekmesi (OZK-14)
import { KayitDefteri } from "./sinyaller-cekirdek.ts";   // 🧑‍✈️ Makinist ağacı
import { bolumYuvasiKaydi, type BolumSinamaKapisi, type BolumYuvasiV1, type BolumYuvasiYuzu } from "./bolum-yuvasi.ts";   // 🧩 VIT-K78-A10 tek simge ve bölüm yuvası
// 📊 VIT-GRAF-A13: dört yüzeyin durum çubuğu sayaçları. Sayıları TÜRETİR,
// ikinci bir sayaç tutmaz — panellerle ayrışması yapısal olarak imkânsızdır.
import { DurumCubugu } from "./durum-cubugu.ts";
// 🪧 EKL-F6-A04: kanon bulunamadığında taban kanona düşüldüğü SÖYLENİR.
import { KANON_ISARETCISI_KOMUTU, TabanKanonCubugu, tamDenetimSonucu } from "./taban-kanon.ts";
// ⏱️ EKL-F6-A11: kurulu paket depodaki bildirimden gerideyse durum çubuğu söyler.
import { readFile, readdir } from "node:fs/promises";
import { depoPaketiBul, paketKimligiCoz, surumAyrismasi } from "./surum-tazeligi.ts";
import {
  yuzeyeAyir, YuzeyDefteri, sayaclariOlayaBagla, meyveKokleri, taniHedefi, problemsYayini,
  type YuzeyKaydi, type YuzeyDagilimi,
} from "./yuzey-cekirdek.ts";
// 🔭 Kapsama ilişkisinin TEK evi: yol haritasındaki varlık kümeleri ile panel
// kapsam süzgeci aynı kuralı okur, ikinci bir kapsama kuralı yazılmaz.
import { kapsamIcinde } from "./yolharitasi-cekirdek.ts";
// 💡 KYN-YUZ-A01 · VIT-GRAF-A16: Fikir düğümleri motorun tanı akışında YAŞAMAZ
// (Fikir bir sapma değildir ve düzeltme istemez); bu yüzden kayıtları ayrışmış
// ağaçtan doğrudan okunur ve Fikirler panelinin kendi görünüşüne basılır. İkinci
// bir tarama, ikinci bir dosya okuması ve ikinci bir ayrıştırma kurulmaz:
// kayıtlar tanı turunun ZATEN ürettiği ağaçtan çıkar (VIT-POSTA-A03 dersi).
import { fikirleriTopla, FikirDefteri, type FikirKaydi } from "./fikir-cekirdek.ts";
import { kuzeyYildiziKaydi } from "./yildiz.ts";
import { takdirKaydi } from "./takdir.ts";
import { giydirKaydi } from "./giydir.ts";               // BKM-SNV2-A03: görünüm paritesi
import { AsamaKronometresi, PerformansMercegi } from "./performans.ts";     // 🔬 PRF-A01: izleyici olay + denetim süre merceği · ⏱️ PNL-A14: aşama kronometresi
import { gurultuMu, sarGurultuMu, sarKapsamDisi, muhurluSarMi, TARAMA_DISLAMA_GLOB, OlayHatti, TekUcusKilidi, turKapsami, caprazYenidenHesaplanir } from "./izleyici-cekirdek.ts";   // 🧯 PRF-A02 (+RED-1): olay hattı + tek-kaynak kapsam + kilit · ⚡ PRF-A06: olay-tetikli turun odak kapsamı · 🩹 BKM-DNT-A18: dar kök olaylardan türer
import { dilAyariDegistiMi, etkinDil } from "./dil.ts";
import { sozDizimTanisi, taniDilineCevir } from "../../cekirdek/src/tani-metinleri.ts";
import {
  EKLENTI_KABUK_METINLERI,
  IZ_METINLERI,
  KANON_ISARETCISI_METINLERI,
  KISITLI_MOD_METINLERI,
  hedefBaglantiMetni,
  iskeletKuruldu,
  iskeletSozDizimHatasi,
  ipucuIsaretCiziciniKur,
  panelOdakMesaji,
  panoyaYazildi,
  panoyaKopyalanacakSatirYok,
  SURUM_TAZELIGI_METINLERI,
  yuzeyDiliniAyarla,
  yuzeyKokleriniAyarla,
} from "./yuzey-metinleri.ts";

let koleksiyon: vscode.DiagnosticCollection;
let durumCubugu: DurumCubugu | undefined;

// ── 📏 TUR SAYACI (PRF-TA-A04) ───────────────────────────────────────────────
//   "Tur panelde TEK değişim olayı üretir" cümlesi ancak turun kendisi
//   sayılabiliyorsa kanıtlanabilir. Panel sayacı (`tamDegisim`) ile yayın sayacı
//   (`yayın`) kaç ÇİZİM ve kaç YAYIN olduğunu söyler, fakat ikisi de bir turda
//   ikinci bir yayın eklendiğinde birlikte artar ve eşitlikleri bozulmaz; ölçüm
//   ancak üçüncü, bağımsız bir sayaçla yalanlanabilir hâle gelir. Sayaç turun
//   BAŞINDA artar, dolayısıyla çöken bir tur da sayılır ve "tur koştu ama
//   yayınlamadı" hâli görünür kalır. Kapı salt okurdur, davranış değiştirmez ve
//   üretim yolu onu hiç okumaz (yolharitasi.ts `panelSayacı` emsali).
const turSayacı = { tur: 0 };

/**
 * Motorun tanı koleksiyonundaki belirli düzeydeki tanı sayısı. Durum çubuğu
 * bu işlevi çağırır; kendi listesini TUTMAZ, koleksiyonu her seferinde okur.
 * Koleksiyon zaten tek gerçektir ve panelin gördüğü de odur.
 */
function taniSay(duzey: vscode.DiagnosticSeverity): number {
  if (!koleksiyon) return 0;
  let toplam = 0;
  koleksiyon.forEach((_uri, tanilar) => {
    for (const t of tanilar) if (t.severity === duzey) toplam++;
  });
  return toplam;
}


// ── 🧭 YUZ-3.3 ÜÇ SUNUM YÜZEYİ ────────────────────────────────────────────────
//   Motorun ürettiği her kayıt doğasına göre TEK bir yüzeye gider: düzeltilecek
//   sapma Problems'a, kullanıcının bilerek açık bıraktığı işaretler
//   Hatırlatıcılar'a, düzeltme istemeyen ölçüm ve durum satırları Bildirimler'e.
//   Yönlendirme kararı burada verilmez; motorun tek yetkili işlevinden gelir
//   (yuzey-cekirdek → beklenenSunumYuzeyi). Eklentinin işi yalnız taşımaktır.
let hatirlaticilar: Hatirlaticilar | undefined;
let bildirimler: Bildirimler | undefined;

// ── 💡 VIT-GRAF-A16 FİKİRLER YÜZEYİ ──────────────────────────────────────────
//   Henüz taahhüde dönüşmemiş ham düşünceler. Bu yüzey de motorun tanı akışından
//   beslenmez, çünkü motor Fikir için hiçbir tanı üretmez; kayıtları tanı
//   turunun ZATEN ürettiği ayrışmış ağaçtan Fikir defterine iner. Panel bir ara
//   turda Hatırlatıcılar panelinin içinde bir bölüm olarak yaşıyordu; Founder
//   2026-08-08 tarihinde Fikrin kendi panelini hak ettiğine hükmetti ve hükmün
//   doğruluğu 2026-08-09 tarihinde canlı görünümde ölçüldü.
let fikirler: Fikirler | undefined;
let sinyaller: SinyallerAgaci | undefined;   // 🚦 PNL-A09

// ── 📬 VIT-POSTA-A01 DÖRDÜNCÜ YÜZEY: ONAYLAR PANELİ ────────────────────────────
//   Founder onayı bekleyen kapılar. Bu yüzey motorun tanı akışından beslenmez;
//   onay tarayıcısından beslenir ve bu yüzden yüzey defterine bağlanmaz. Kayıt
//   noktası yine burasıdır: panel etkinleşmede TAM BİR KEZ kurulur ve onay
//   kuyruğuna verilir; kuyruk kendi nabzıyla (kaydetme · geciktirmeli yazım
//   turu · disk izleyicisi) paneli tazeler. İkinci bir zamanlayıcı kurulmaz.
let onayPaneli: OnayPaneli | undefined;
let tren: Tren | undefined;
let panel: (SarmalPaneliYuzu & { sekmeSecVeOdakla(s: "ray" | "tren" | "makinist" | "sinyaller"): Promise<void> }) | undefined;
let yolHaritasiYuzeyi: YolHaritasiYuzu | undefined;
let bolumYuvasi: BolumYuvasiYuzu | undefined;

/**
 * Eklentinin dış yüzü. VS Code `activate` işlevinin döndürdüğü nesneyi
 * `extensions.getExtension(...).exports` olarak sunar; gerçek editör kabuğunda
 * koşan entegrasyon nöbeti iki yeni yüzeyin PANELDE görünen içeriğini buradan
 * okur. Yüzey ağacının içeriğini VS Code API'si dışarıya vermez, bu yüzden
 * ölçüm için salt-okunur bir kapı gerekir. Kapı hiçbir davranış değiştirmez ve
 * hiçbir kayıt üretmez; yalnız defterin bugünkü görünümünü kopyalar.
 */
export interface SarmalEklentiYuzu {
  yuzeyKayitlari(): YuzeyDagilimi;
  /** 🚦 PNL-A09: Sinyaller sekmesinin girdisi — kapsamdaki bütün tanı kayıtları (salt okur ölçüm). */
  sinyalKayitlari(): Array<{ dosya: string; kod: string; duzey: string; satir: number }>;
  /**
   * 📬 Onay yüzeyinin bugünkü sayaçları (VIT-POSTA-A03). Kabul ölçütleri
   * "etkinleşmeden sonra canlı Comments iş parçacığı sayısı sıfırdır" ve
   * "onay yüzeyinin açılışta doğrudan açtığı belge sayısı sıfırdır" diyor;
   * gerçek editör kabuğunda koşan nöbet o iki sayıyı buradan okur. Modül
   * düzeyindeki sayaçlar eklentinin KENDİ örneğinde yaşadığı için nöbet onları
   * kaynağı ayrıca içeri alarak göremez — bu kapı o yüzden vardır.
   */
  onayOlcumleri(): {
    canliIsParcacigi: number;
    acilanBelge: number;
    olaydanAcilanBelge: number;
    acilistaAcilanBelge: number;
    acilistaOlaydanAcilanBelge: number;
    yerlestirmeTuru: number;
    sonYerlesenKapi: number;
    kapiGorulduMu: boolean;
    yaratilanYuzey: number;
    eldenCikarilanYuzey: number;
    yedekTur: number;
    goruntudenTur: number;
    okunanDosya: number;
    dosyaAramasi: number;
    anaGoruntuHazir: boolean;
  };
  /**
   * Onaylar panelinin ŞU AN gösterdiği kapılar. Salt-okunur ölçüm kapısıdır.
   * "Karara bağlanan kapı panelden düşer" cümlesi ancak buradan GERÇEKTEN
   * ölçülebilir; VS Code bir görünüşün içeriğini dışarıya vermez.
   */
  onayKapilari(): { dosya: string; kod: string }[];
  /**
   * 🗺️ Yol haritası panelinin bugünkü sayaçları (PRF-TA-A03 · yolharitasi.ts
   * `panelOlcumleri`). Kabul ölçütü "panelin doğrudan dosya araması ve belge
   * açma sayısı sıfırdır" diyor ve o sayı gerçek editör kabuğunda ölçülmelidir
   * (PRF-TA-A04 birinci görev maddesi). Kapı `onayOlcumleri` emsalini birebir
   * izler ve VAR OLMA GEREKÇESİ AYNIDIR: gerçek kabuk süiti esbuild ile
   * paketlendiği için nöbet `yolharitasi.ts` modülünü kendi içine alsaydı canlı
   * eklentininkinden AYRI bir örneğin sayaçlarını okur ve panel yüz kere dosya
   * arasa bile sıfır görürdü.
   */
  panelOlcumleri(): {
    goruntuTuru: number;
    tamDegisim: number;
    izTuru: number;
    dosyaAramasi: number;
    belgeAcma: number;
  };
  /**
   * 🗺️ Turun yayın sayaçları (tur-goruntusu.ts `turGoruntusuOlcumleri`) ile
   * turun kendi sayacı. `tur` alanı `denetleHepsi` çağrılarını sayar ve tek
   * başına anlamsızdır; anlamı `yayın` ile karşılaştırıldığında doğar: tur
   * başına birden çok yayın düşerse panel bir turda birden çok kez çizilir.
   */
  turOlcumleri(): {
    yayın: number;
    dinleyiciÇağrısı: number;
    dinleyiciHatası: number;
    sıra: number;
    dinleyici: number;
    tur: number;
  };
  /**
   * 🗺️ Son yayınlanan tur görüntüsünün SALT OKUR özeti; hiç yayın olmadıysa
   * `undefined`. Kayıt olduğu gibi verilmez, çünkü `programlar` haritası turun
   * kendi ağaçlarını taşır ve onu dış yüze koymak nöbete ayrıştırılmış ağaçları
   * elleme imkânı verirdi; özet yalnız SAYILABİLİR olanı taşır. Dört kümenin
   * kesişmezliği ile dar/tam tur eşitliği buradan ölçülür.
   */
  sonGoruntuOzeti(): {
    sıra: number;
    tetik: string;
    /** 🩹 BKM-DNT-A18: dar turun gerçekten denetlediği kökler; tam turda `undefined`. */
    kapsam: string[] | undefined;
    programlar: string[];
    yollar: string[];
    kirik: string[];
    okunamayan: number;
    dilDışı: string[];
  } | undefined;
  /** ⚡ Paylaşılan AST önbelleğinin anahtarları (onbellek.ts) — salt okur. */
  onbellekAnahtarlari(): string[];
  /** 🚂 Yol Haritası panelinin ŞU AN gösterdiği plan kodları — salt okur. */
  yolHaritasiKodlari(): string[];
  /**
   * 🧩 VIT-K78-A10 · KARDEŞ EKLENTİ ARAYÜZÜ. Kardeş eklentiler kendi bölümlerini
   * kabın başlığındaki bölüm eylemlerine buradan kaydeder (bolum-yuvasi.ts başlığı
   * sözleşmenin tam metnidir). Bilinmeyen sürüm `undefined` döner.
   */
  bolumYuvasiAl(surum: number): BolumYuvasiV1 | undefined;
  /**
   * 🧪 Bölüm yuvası nöbet kapısı — YALNIZ sınama kipinde (`ExtensionMode.Test`)
   * vardır; kurulu eklentinin herkese açık yüzünde tanımsızdır. Bölüm durumunun
   * ölçümünü, Yol Haritasının gerçek görünürlüğünü ve kullanıcı seçiminin
   * eşdeğerini verir; kardeş eklentiler bu kapıya ulaşamaz.
   */
  bolumSinamaKapisi?: BolumSinamaKapisi & { yolHaritasiGorunurMu(): boolean; panelOlcumleri(): ReturnType<SarmalPaneliYuzu["olcumler"]> | undefined };
}

/** Panel ipuçlarının kaynak satırı bu köklere göre kısalır (VIT-GRAF-A18). */
function yuzeyKokleriniTazele(): void {
  yuzeyKokleriniAyarla((vscode.workspace.workspaceFolders ?? []).map((k) => k.uri.fsPath));
}

/**
 * ⏱️ EKL-F6-A11 · kurulu paket bayatlığı nöbeti. Açılışı bekletmez: keşif
 * eşzamansızdır ve `activate` dönmeden tek bir dosya okunmaz. Keşif her kökte
 * bir okuma, bulunamazsa bir kat aşağıda klasör başına bir okumadır; mağaza
 * kullanıcısının çalışma alanında depo bulunmadığı için nöbet orada susar ve
 * izleyici hiç kurulmaz. Depo bulunursa yalnız o tek paket bildirimi izlenir,
 * çünkü Founder penceresi açıkken sürümün ilerlemesi tuzağın ta kendisidir.
 */
function surumTazeligiNobetiniKur(context: vscode.ExtensionContext): void {
  const oge = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 0);
  oge.text = SURUM_TAZELIGI_METINLERI.cubukMetni;
  oge.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground");
  context.subscriptions.push(oge);
  const kuruluSurum = String(context.extension.packageJSON?.version ?? "");
  const oku = async (yol: string): Promise<string | undefined> => {
    try { return await readFile(yol, "utf8"); } catch { return undefined; }
  };
  const tazele = (depoSurumu: string | undefined): void => {
    const a = surumAyrismasi({ kuruluSurum, depoSurumu, gelistirmeKipi: depoSurumu !== undefined });
    if (!a) { oge.hide(); return; }
    oge.tooltip = SURUM_TAZELIGI_METINLERI.cubukIpucu(a.satir, a.kuruluSurum, a.depoSurumu);
    oge.show();
  };
  void (async () => {
    const depo = await depoPaketiBul((vscode.workspace.workspaceFolders ?? []).map((k) => k.uri.fsPath), {
      oku,
      altKlasorler: async (kok) => {
        try {
          return (await readdir(kok, { withFileTypes: true }))
            .filter((g) => g.isDirectory() && !g.name.startsWith(".") && g.name !== "node_modules")
            .map((g) => g.name);
        } catch { return []; }
      },
    });
    if (!depo) return;
    tazele(depo.kimlik.surum);
    const izleyici = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(dirname(depo.yol), "package.json"));
    const yeniden = async (): Promise<void> => { tazele(paketKimligiCoz(await oku(depo.yol))?.surum); };
    izleyici.onDidChange(yeniden);
    izleyici.onDidCreate(yeniden);
    izleyici.onDidDelete(yeniden);
    context.subscriptions.push(izleyici);
  })();
}

// ── 🔒 KISITLI MOD (MGZ-A02 · HTR-KISITLI-MODDA-EKLENTI-SESSIZ) ──────────────
//   Ölçülmüş kusur: bildirim güvenilmeyen çalışma alanı beyanını taşımıyordu ve
//   VS Code eklentiyi Kısıtlı Modda bütünüyle kapatıyordu; .sar dosyası düz metin
//   görünüyor ve eklenti neden sustuğunu hiçbir yerde söylemiyordu. Bildirim
//   artık sınırlı destek ilan eder: dil tanımı, dilbilgisi renklendirmesi ve
//   parçacıklar bildirimseldir ve kod gerektirmeden çalışır.
//
//   KOD ÇALIŞTIRAN HİÇBİR YETENEK AÇILMAZ (Adımın sınırı). Tam denetim diski
//   tarar ve mühürlü dosya bulunca `git` koşturur; paneller o turdan beslenir.
//   Bu yüzden kısıtlı modda etkinleşme gövdesi HİÇ koşmaz: yalnız tek bir durum
//   çubuğu işareti kurulur, katkı komutları aynı cümleyi söyleyen zararsız yer
//   tutuculara bağlanır ve güven beklenir. Görünümler bildirimde
//   `isWorkspaceTrusted` koşuluna bağlıdır; sağlayıcısız panel hiç açılmaz.
//
//   🛡️ KARŞILAMA GÖRÜNÜMÜ (MGZ-A08 · Founder hükmü 2026-10-10): görünümlerin
//   güvene bağlanması kısıtlı modda kabı boşaltıyordu ve VS Code boş kalan kabı
//   sol şeritteki Sarmal simgesiyle birlikte gizliyordu. Kapta artık yalnız
//   kısıtlı modda görünen bir karşılama görünümü durur. Sağlayıcısı yoktur:
//   metni ve Klasöre Güven düğmesi bildirimden (`viewsWelcome`) gelir ve bu
//   gövde ona hiçbir şey kaydetmez, dolayısıyla kısıtlı modda yine kod çalışmaz.
//
//   GÜVEN VERİLİNCE pencere yeniden yüklenmez: yer tutucular bırakılır ve aynı
//   `activate` güvenilir yoldan yeniden koşar. Dış yüz (kardeş eklenti arayüzü
//   ve ölçüm kapıları) o andan sonra tam etkinleşmeye bağlanır. Karşılama
//   görünümünün koşulu aynı anda düşer ve olağan görünümler bu yeniden
//   etkinleşmenin kurduğu sağlayıcılarla açılır.

/** VS Code'un çalışma alanı güveni ekranını açan yerleşik komut. */
const GUVEN_KOMUTU = "workbench.trust.manage";

/**
 * Tam etkinleşme gelene dek bekleyen dış yüz. Güven verilmeden her üye
 * `undefined` döndüren bir işlevdir (kardeş eklenti arayüzü dahil); güvenden
 * sonra üyeler tam etkinleşmenin yüzüne bağlanır. `then` daima tanımsızdır,
 * yoksa `activate()` sözünü bekleyen kardeş eklenti dış yüzü bir söz sanıp asılırdı.
 */
function ertelenmisYuz(tam: () => SarmalEklentiYuzu | undefined): SarmalEklentiYuzu {
  return new Proxy({} as SarmalEklentiYuzu, {
    get(_hedef, ad) {
      if (ad === "then" || typeof ad === "symbol") return undefined;
      const yuz = tam();
      if (!yuz) return () => undefined;
      const deger: unknown = Reflect.get(yuz as object, ad);
      return typeof deger === "function" ? (deger as (...a: unknown[]) => unknown).bind(yuz) : deger;
    },
  });
}

/** Güvenilmeyen klasörde etkinleşme: tek işaret, zararsız komutlar ve güven beklenişi. */
function kisitliModdaBekle(context: vscode.ExtensionContext, tamEtkinles: () => SarmalEklentiYuzu): SarmalEklentiYuzu {
  let tamYuz: SarmalEklentiYuzu | undefined;
  const isaret = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 101);
  isaret.text = KISITLI_MOD_METINLERI.cubukMetni;
  isaret.tooltip = KISITLI_MOD_METINLERI.ipucu;
  isaret.command = GUVEN_KOMUTU;
  isaret.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground");
  isaret.show();
  // Katkı komutları paletten ve düğmelerden çağrılabilir; kayıtsız kalsalar
  // VS Code "komut bulunamadı" der. Yer tutucu hiçbir şey çalıştırmaz, yalnız
  // aynı cümleyi söyler ve istenirse güven ekranını açar.
  const katkilar = (context.extension.packageJSON?.contributes?.commands ?? []) as { command: string }[];
  const yerTutucular = katkilar.map((k) => vscode.commands.registerCommand(k.command, async () => {
    const secim = await vscode.window.showInformationMessage(KISITLI_MOD_METINLERI.ipucu, KISITLI_MOD_METINLERI.guvenDugmesi);
    if (secim) await vscode.commands.executeCommand(GUVEN_KOMUTU);
  }));
  let kapandi = false;
  const kapat = (): void => {
    if (kapandi) return;
    kapandi = true;
    bekleyis.dispose();
    isaret.dispose();
    for (const y of yerTutucular) y.dispose();
  };
  const bekleyis = vscode.workspace.onDidGrantWorkspaceTrust(() => {
    kapat();
    tamYuz = tamEtkinles();
  });
  context.subscriptions.push({ dispose: kapat });
  return ertelenmisYuz(() => tamYuz);
}

export function activate(context: vscode.ExtensionContext): SarmalEklentiYuzu {
  yuzeyDiliniAyarla(etkinDil());
  // 🔒 MGZ-A02: güvenilmeyen klasörde gövde koşmaz; güven verilince bu işlev yeniden çağrılır.
  if (!vscode.workspace.isTrusted) return kisitliModdaBekle(context, () => activate(context));
  // VIT-KIMLIK-A07: ipucu balonunun işaretleri ailenin tema varyantından çizilir.
  ipucuIsaretCiziciniKur(ipucuIsaretCizicisi(context.extensionUri));
  // 📍 Kaynak satırı çalışma alanına göreli yazılsın diye kökler kataloga bağlanır;
  //    klasör kümesi değişince bağ tazelenir, yoksa yol eski köke göre kısalırdı.
  yuzeyKokleriniTazele();
  koleksiyon = vscode.languages.createDiagnosticCollection("sarmal");
  context.subscriptions.push(koleksiyon);

  // Kenar çubuğunun yüzeyleri eklenti etkinleşmesinde TAM BİR KEZ kaydedilir;
  // görünümleri context.subscriptions üstünden kapanışta serbest bırakılır.
  // 🧩 VIT-K78-A10: bölüm sırası kabın en üstündedir ve ilk kaydedilen yüzeydir;
  // seçim Ray'le başlar, dolayısıyla Ray panelleri hiç gizlenmeden açılır.
  bolumYuvasi = bolumYuvasiKaydi(context);
  hatirlaticilar = hatirlaticilarKaydi(context);
  fikirler = fikirlerKaydi(context);
  bildirimler = bildirimlerKaydi(context);
  onayPaneli = onayPaneliKaydi(context);
  // 🚆 Founder 2026-10-21: Tren görünümü turun yayınından beslenir (kendi taraması yoktur).
  tren = trenKaydi(context);
  // 🧑‍✈️ Founder 2026-10-21: Onaylar · Hatırlatıcılar · Fikirler tek Makinist ağacının üst
  // düğümleridir; sağlayıcılar veri ve satır çizimini olduğu gibi verir. 🚦 PNL-A09 (OZK-14):
  // Gözlemler Makinist'ten çıktı; Sinyaller sekmesinin Bilgi bandı onun yerini alır (YUZ-3.3).
  const makinistAgaci = makinistKaydi(context, { onayPaneli, hatirlaticilar, fikirler });
  sinyaller = sinyallerKaydi(context);
  // 📋 VIT-GRAF-A13: ağaç panellerinin satırı sağ tık menüsünden panoya iner.
  // Founder'ın cümlesi şudur: "hatırlatıcı ve bildirim metinlerini
  // kopyalayamıyorum." Ağaç görünüşlerinde metin seçilemez; kopyalama ancak bir
  // komutla olur. KOMUT TEKTİR, çünkü VS Code satırın hangi panelden geldiğini
  // söylemez: metin kararını üç sağlayıcı da AYNI saf çekirdekten alır ve komut
  // yalnız panoya yazar. Metin bulunamazsa hiçbir şey yazılmaz ve sebep söylenir.
  //
  // 🖱️ VIT-GRAF-A17: aynı komut artık İKİNCİ bir erişim yolundan da çağrılır.
  // Founder 2026-08-16 gözle doğrulama turunda kopyalamanın çalıştığını fakat
  // keşfedilebilir olmadığını bildirdi; sağ tık menüsü, varlığı bilinmeyen bir
  // eylemi görünür kılmaz. Bu yüzden üç panelin satırına, üzerine gelindiğinde
  // beliren bir düğme kondu. Düğme paket bildirimindeki `view/item/context`
  // haritasına `inline` kümesiyle yazılır ve Yol Haritası panelindeki koni kartı
  // düğmesinin emsalini birebir izler; panel başına ayrı bir desen kurulmaz.
  //
  // BU GÖVDE DEĞİŞMEDİ VE DEĞİŞMEMELİDİR. İki erişim yolu da BU komuta iner,
  // dolayısıyla ikinci bir kopyalama mantığı doğmaz ve iki yol aynı pano metnini
  // üretir; ayrı bir düğme işleyicisi yazılsaydı iki yol zamanla ayrışır ve
  // kullanıcı hangi yolu seçtiğine göre farklı metin alırdı. VIT-POSTA-A04'ün
  // yaşadığı iç içe düğme tuzağı burada doğmaz, çünkü tuzak webview'in HTML
  // ağacına aitti: orada satırın kendisi bir düğme öğesiydi ve içine ikinci bir
  // düğme yuvalanamıyordu. Ağaç görünüşünde satır bir HTML düğmesi değildir ve
  // eylem yuvası editörün kendi menü haritasından gelir; satırın tek tık
  // davranışı (`sarmal.dosyaAc`) ile klavye gezinmesi bu yüzden aynen korunur.
  context.subscriptions.push(
    vscode.commands.registerCommand("sarmal.satiriKopyala", async (oge: unknown) => {
      const pano = hatirlaticilar?.panoMetni(oge) ?? bildirimler?.panoMetni(oge)
        ?? fikirler?.panoMetni(oge);
      if (!pano) {
        void vscode.window.showWarningMessage(panoyaKopyalanacakSatirYok());
        return;
      }
      await vscode.env.clipboard.writeText(pano.metin);
      vscode.window.setStatusBarMessage(panoyaYazildi(pano.adet), 4000);
    }),
    // ✅ ATEŞLEMİŞ HATIRLATICIYI KAPAT (KYN-YUZ-A03). Komut yalnız bir kapı
    // açar; hüküm, doğrulama ve yazım sağlayıcının tek yazar kapısındadır ve
    // ikinci bir yazım yolu doğmaz. Tazeleme gövdenin KENDİ denetim kilidinden
    // istenir; panel kendi taramasını kurmaz.
    vscode.commands.registerCommand("sarmal.hatirlaticiKapat", async (oge: unknown) => {
      await hatirlaticilar?.kapat(oge, (t) => denetimKilidi.iste(t));
    }),
    // ✍️ EKL-F6-A09 · KANON İŞARETÇİSİNİ YAZ. İşaretçiden önce doğmuş ağaçlara
    // işaretçiyi yazan yol budur. Karar saf çekirdektedir (kanon-kesif.ts): kabuk
    // yalnız hedefi seçer, kararı uygular ve her sonucu tam cümleyle söyler.
    // Hedef açık belgenin varlığıdır; açık belge yoksa işaretçiye muhtaç ilanlı
    // varlıklardan biri, birden çoksa kullanıcının seçtiği olur.
    vscode.commands.registerCommand(KANON_ISARETCISI_KOMUTU, async () => {
      const koklar = (vscode.workspace.workspaceFolders ?? []).map((k) => k.uri.fsPath);
      const belge = vscode.window.activeTextEditor?.document.uri;
      let hedef = belge?.scheme === "file" ? varlikKokuBul(dirname(belge.fsPath)) : undefined;
      if (!hedef) {
        const adaylar = isaretciHedefAdaylari(koklar);
        if (adaylar.length > 1) {
          const secim = await vscode.window.showQuickPick(
            adaylar.map((k) => ({ label: basename(k), description: k })),
            { placeHolder: KANON_ISARETCISI_METINLERI.secimBasligi });
          if (!secim) return;
          hedef = secim.description;
        } else {
          hedef = adaylar[0];
        }
      }
      if (!hedef) { void vscode.window.showInformationMessage(KANON_ISARETCISI_METINLERI.hedefYok); return; }
      const plan = isaretciPlani(hedef, koklar, context.extensionPath);
      if (plan.tur === "yaz") {
        const yazilan = isaretciYaz(plan.hedef, plan.kanonKoku, context.extensionPath);
        void vscode.window.showInformationMessage(KANON_ISARETCISI_METINLERI.yazildi(yazilan, plan.kanonKoku));
        denetimKilidi.iste("işaretçi");
      } else if (plan.tur === "gereksiz") {
        void vscode.window.showInformationMessage(KANON_ISARETCISI_METINLERI.gereksiz(basename(plan.hedef)));
      } else if (plan.tur === "eklenti-kanonu") {
        void vscode.window.showInformationMessage(KANON_ISARETCISI_METINLERI.eklentiKanonu);
      } else {
        void vscode.window.showWarningMessage(KANON_ISARETCISI_METINLERI.rafYok(basename(plan.hedef)));
      }
    }),
  );
  // Sayaçlar panellerin KENDİ kümelerinden ve motorun tanı koleksiyonundan okunur.
  durumCubugu = new DurumCubugu({
    hata: () => taniSay(vscode.DiagnosticSeverity.Error),
    uyarı: () => taniSay(vscode.DiagnosticSeverity.Warning),
    gözlem: () => bildirimler?.kayitSayisi ?? 0,
    hatırlatıcı: () => hatirlaticilar?.kayitSayisi ?? 0,
    // 💡 VIT-GRAF-A16: Fikir sayısı da panelin KENDİ listesinden türer. Hane
    // Hatırlatıcılar panelinin içindeyken durum çubuğunda hiç görünmüyordu,
    // çünkü oradaki girdinin adı "Hatırlatıcılar"dır ve o etiketin altına
    // sessizce ikinci bir kavramın sayısını eklemek kullanıcıya açıklamasız
    // büyüyen bir sayı gösterirdi. Kendi paneli doğunca sayı da kendi adıyla
    // konuşur oldu ve yine ikinci bir sayaç kurulmadı.
    fikir: () => fikirler?.kayitSayisi ?? 0,
    kapı: () => onayPaneli?.kapiSayisi ?? 0,
  });
  context.subscriptions.push(durumCubugu);
  // 🔗 Panel ile durum çubuğu AYNI OLAYDAN beslenir. Ölçülmüş kusur (KUSUR-DURUM-ÇUBUĞU):
  // Onaylar değiştiğinde durum çubuğu tazelenmiyordu ve kullanıcı panelde
  // on dört kapı varken durum çubuğunda sıfır görebiliyordu. İKİNCİ BİR SAYAÇ,
  // TARAMA YA DA ÇİZELGE KURULMAZ: sayı yine panelin kendi defterinden türer
  // (`onayPaneli.kapiSayisi`), yalnız tazeleme aynı ağaç olayına bağlanır.
  context.subscriptions.push(sayaclariOlayaBagla(
    (dinleyici) => onayPaneli!.onDegisti(dinleyici),
    () => durumCubugu?.tazele(),
  ));
  durumCubugu.tazele();

  // 🪧 EKL-F6-A04: taban kanon işareti. Kendi taraması ve kendi sayacı yoktur;
  // yalnız `ortak.ts` içindeki keşfin verdiği kararı aynalar ve kanon
  // bulunduğunda kendiliğinden gizlenir.
  context.subscriptions.push(new TabanKanonCubugu());
  // ⏱️ EKL-F6-A11: kurulu paket bayatlığı — aynı durum çubuğu emsaliyle, işi kesmeden.
  surumTazeligiNobetiniKur(context);

  // 🔬 PRF-A01 ölçüm merceği: hangi izleyici kaç olay üretti, tam-proje denetimi
  // kaç ms sürdü — SRN-IDE-KASMA-SOL-KOSUSU tanısı bu kanaldan okunur. Sayaç
  // artırımı sabit-zamanlı; kanal yazımı YALNIZ denetim turu sonunda (tek satır).
  const perfKanal = vscode.window.createOutputChannel(EKLENTI_KABUK_METINLERI.performansKanali);
  context.subscriptions.push(perfKanal);
  const mercek = new PerformansMercegi((s) => perfKanal.appendLine(s));

  const denetimAcik = (): boolean =>
    vscode.workspace.getConfiguration("sarmal").get<boolean>("denetim", true);

  // 📦 EKL-F6-A09: paketin kanon kopyası. Derleme kayıt ile rehberi buraya
  // kopyalar; tam denetim hiçbir gerçek kanon ve işaretçi bulamadığında buna düşer.
  const paketKanonKoku = join(context.extensionPath, PAKET_KANON_DIZINI);

  // 🩹 ÇAPRAZ-TANI ÖNBELLEĞİ (SRN-PANEL-DALGA · Founder 2026-07-20 '57 mi 63 mü'):
  //   Panel sayısı dalgalanıyordu çünkü tek-dosya yolu (denetle · yazarken) yalnız
  //   tanila(doc) yayınlıyor, proje taraması (denetleHepsi) ise tanila + ÇAPRAZ
  //   tanıları (dayanaksız-kural gibi — yalnız tam grafta hesaplanır). Bir tuş
  //   vuruşunda çapraz tanılar o dosyadan DÜŞÜYOR (63→57), debounce'lu tarama geri
  //   getiriyor (57→63). Onarım: son taramanın çapraz tanılarını dosya başına
  //   önbelleğe al; tek-dosya yolu düzenlerken onları da yayınlar → sayı sabit
  //   kalır (bir sonraki tarama önbelleği tazeler; anlık bayatlık kabul, dalga yok).
  const caprazOnbellek = new Map<string, Tani[]>();

  // AÇIK belge — canlı (yazarken anında).
  const denetle = (doc: vscode.TextDocument): void => {
    if (doc.languageId !== "sarmal") return;
    if (doc.uri.scheme !== "file" && doc.uri.scheme !== "untitled") return;
    // Kapsam-dışı (ornek/·sablon/·arsiv/·fikstur/) dosya AÇIK olsa da Problems'i KİRLETMEZ —
    // denetleHepsi (:69) ile AYNI dünya görüşü (INDEKS_DISI · kimlik.ts, DIL-2 tek-kaynak).
    // Tek-dosya yolu bu dışlamayı atlıyordu → fikstür sızması (Faz-0 onarımı 2026-07-14).
    // Dışlama WORKSPACE-GÖRELİ yola uygulanır (Sol RED-2 onarımı 2026-07-18): mutlak yol
    // kullanılınca çalışma alanının KENDİSİ 'ornek' adlı bir dizindeyse (entegrasyon
    // kasası dahil) tekil hızlı yol kendini kapatıyor, tanı tam-proje taramasını
    // beklemek zorunda kalıyordu — soğuk ilk koşuda 10 sn'i aşan yarışın kökü buydu.
    if (INDEKS_DISI.test(vscode.workspace.asRelativePath(doc.uri, false))) { taniSil(doc.uri); return; }
    if (!denetimAcik()) { taniSil(doc.uri); return; }
    // bilerek-hatalı işaretli dosya (ders malzemesi) paneli KİRLETMEZ — CLI muafiyetinin ikizi (DIL-2 tek-kaynak regex).
    if (doc.getText().split("\n", 5).some((s) => BILEREK_HATALI.test(s))) { taniSil(doc.uri); return; }
    // Tek-dosya (anlık) + son taramanın ÇAPRAZ tanıları (önbellekten) — panel
    // dalgası kapanır (proje taraması çapraz tanıları düzenlemede de görünür kalır).
    const cross = caprazOnbellek.get(doc.uri.fsPath) ?? [];
    yuzeylereDagit(doc, [...tanilaCekirdek(doc), ...cross], true, programAl(doc));   // MIM-1.1 ②: yayın aktif-varlık süzgecinden geçer
  };

  // DİSKTEKİ .sar — çalışma alanı geneli tarama + ORK-1.2 CROSS-FILE DAG döngü denetimi:
  // tüm .sar'lar TEK grafa girer; döngüsel-bağımlılık (dosyalar arası olabilir)
  // Problems'te ilgili dosyada görünür. Tek-dosya `tanila` cross-file'ı göremezdi.
  // 🩹 BKM-DNT-A18: `degisenYollar` turu tetikleyen olayların değiştirdiği mutlak
  // yollardır (olay hattı → tek-uçuş kilidi → tur); dar kök bunlardan türer.
  const denetleHepsi = async (tetik = "?", degisenYollar?: readonly string[]): Promise<void> => {
    turSayacı.tur += 1;   // 📏 PRF-TA-A04: turun kendisi sayılır (salt okur ölçüm)
    // Denetim kapalıyken TANI yüzeyleri susar — biri açık kalıp bayat kayıt
    // gösteremez. Fakat tur yine koşar ve GÖRÜNTÜSÜNÜ yayınlar (PRF-TA-A03 ikinci
    // tur, denetçi bulgusu): ayar sözleşmesi kapatınca yalnız tanının susacağını
    // söyler; Yol Haritası ile Onaylar okuma yüzeyidir ve görüntüden beslenir.
    // Görüntü tanı kapısından ayrılmıştır, ikinci bir tarama yolu doğmaz; eski
    // "hat sustu" bildirimi kalktı, çünkü hat susmaz, yalnız tanı üretmez.
    const taniKapali = !denetimAcik();
    if (taniKapali) {
      koleksiyon.clear(); taniDefteri.clear(); yuzeyDefteri.temizle();
      fikirDefteri.temizle();   // 💡 KYN-YUZ-A01: Fikir hanesi de susar — bayat kayıt kalmaz
      sinyalDefteri.temizle();   // 🚦 PNL-A09: Sinyaller de susar
      tamDenetimSonucu([], [], true);   // 📦 EKL-F6-A09: kapalı denetimde "koşmadı" işareti bayat kalmaz
    }
    const turBasi = Date.now();   // 🔬 PRF-A01: tur süresi mercekten okunur
    // ⏱️ PNL-A14: süre aşamalara bölünür (okuma · ayrıştırma · denetim · yayın);
    // kronometre yüksek çözünürlüklü saatle ölçer, toplam süre eski saatinde kalır.
    const kron = new AsamaKronometresi();
    const okumaBasi = kron.şimdi();
    // Öğreti kitaplığının ALTINDAKİ ders rafları hariç: ürün değil, kasıtlı drift
    // → paneli kirletmesin. RED-1 D1: evren izleyici süzgeciyle TEK KAYNAKTAN
    // (izleyici-cekirdek) hizalı — dist/out/gizli-dizin .sar'ları ne taranır ne
    // olayları süzülmeden kalır; çekirdek YOKSAY kanonuyla da aynı evren.
    // KPS-IND-A01: glob yalnız ada bakabildiği için ucuz ön süzgeçtir; son hükmü
    // `sarKapsamDisi` verir ve ders rafını YERİNE göre eler, böylece kullanıcının
    // kendi kökü altındaki `sablon/` kitaplığı panelde TAM görünür.
    const dosyalar = (await vscode.workspace.findFiles("**/*.sar", TARAMA_DISLAMA_GLOB))
      .filter((u) => !sarKapsamDisi(vscode.workspace.asRelativePath(u, false)));
    // ⚡ PRF-A06 KALICI ONARIMI (2026-08-29 · Founder kararı): tur artık HİÇBİR
    // dosyayı `openTextDocument` ile AÇMAZ. Ölçüm şuydu: otuz dört buçuk
    // saniyelik turun yalnız yaklaşık yedi saniyesi saf çekirdekteydi (iki yüz
    // yetmiş altı dosyanın ayrıştırılması ile `dogrula` iki bin yüz kırk dört
    // ms, çapraz denetim sarmal kökünde beş yüz yetmiş dokuz ms); geri kalan
    // yaklaşık yirmi yedi saniye iki yüz yetmiş altı belge AÇMA çağrısıydı.
    // Karar saf modüldedir (tur-belgesi.ts) ve burası yalnız kabuktur; kabuğun
    // hiçbir üyesi belge açmaz. Kaydedilmemiş değişiklik taşıyan açık editör
    // bellekten I/O'suz gelir ve önceliklidir, çünkü kaydedilmemiş düzenlemenin
    // tanısı diskteki eski metinden üretilirse panel kullanıcının gördüğü metni
    // anlatmaz. 🩹 BKM-DNT-A18: kaydedilmemiş değişiklik taşımayan açık belge
    // diskten okunur; editör dışından yapılan yazımı model henüz okumamışsa
    // bellekteki metin eskidir ve panel pencere yeniden yüklenene dek bayat kalırdı.
    // Şema süzgeci zorunludur: `textDocuments` git karşılaştırma görünümlerini ve
    // çıktı kanallarını da taşır, onların `fsPath` değeri aynı yolu gösterir ve
    // süzgeçsiz bir harita dosyanın tanısını git'teki ESKİ sürümünden üretirdi.
    const açıkBelgeler = açıkBelgeHaritası(vscode.workspace.textDocuments);
    // 🛡️ PRF-KP-A05: erişim sınırı — kök dışı ya da dışlanan yol `oku` üyesine
    // ulaşmaz; merceğin "taranan" sayısı da bu süzülmüş listeden gelir ki kanaldaki
    // özdeşlik (açıktan + diskten + atlanan = taranan) yapısal olarak korunsun.
    const yollar = erisimSiniri(dosyalar.map((u) => u.fsPath), (vscode.workspace.workspaceFolders ?? []).map((k) => k.uri.fsPath));
    const { belgeler: doclar, sayaç: belgeSayacı, okunanBayt, dilDışı } = await turBelgeleriniTopla(
      yollar,
      {
        açıkBelge: (fsPath) => açıkBelgeler.get(fsPath),
        dilKimliği: (fsPath) => açıkBelgeler.get(fsPath)?.languageId,
        kaydedilmemisMi: (fsPath) => açıkBelgeler.get(fsPath)?.isDirty === true,
        oku: async (fsPath) => {
          try {
            const uri = vscode.Uri.file(fsPath);
            const ham = await vscode.workspace.fs.readFile(uri);
            // PRF-KP-A02: bayt sayısı çözmeden önce ham tampondan alınır; çözücü
            // bayt sırası imini soyar ve geçersiz baytı yer tutucuya çevirir.
            return { belge: diskBelgesi(uri, new TextDecoder("utf-8").decode(ham)), bayt: ham.byteLength };
          } catch { return undefined; }   // silinmiş/erişilemeyen dosya turu DÜŞÜRMEZ
        },
      });
    // ⏱️ PNL-A14: toplamadan sonra turda bekleme noktası yoktur; buradan tur
    // sonuna dek koşan her şey ana iş parçacığında tek bölünmez bloktur.
    const okumaBitti = kron.şimdi();
    kron.ekle("okuma", okumaBitti - okumaBasi);
    // 📄 PRF-KP-A02: program haritası saf modülde kurulur (tur-belgesi.ts) ve
    // editör kabuğu olmadan sınanır. Açık belge paylaşılan sürüm-anahtarlı
    // önbellekten okunur (EKL-F9-A06: editör süsleriyle AYNI parse); diskten
    // gelen kaydın sürümü yoktur ve önbelleği kirletmemesi için doğrudan
    // ayrıştırılır. Söz dizimi kırık belge haritaya girmez: tek-dosya yolu
    // onu yakalar, DAG'a girmez.
    const programlar = kron.ölç("ayrıştırma", () => turProgramlariniKur(doclar, açıkBelgeler, programAl));
    // ⏱️ PNL-A14 · TEK-DOSYA TANISI TURUN AĞACINDAN. Tanı eskiden aşağıdaki
    // dağıtım döngüsünde her belgenin metnini ikinci kez belirteçleyip
    // ayrıştırıyordu; artık turun az önce kurduğu ağacı kullanır (`taniAgaci`).
    // Tanılar BURADA, mevsim çevriminden ÖNCE üretilir: çevrim ağacı yerinde
    // değiştirir (Faz düğümlerine sanal kenar ekler) ve eski yolun taze
    // ayrıştırması o kenarları hiç görmezdi. Bilerek-hatalı işaretli dosya
    // atlanır; onun tanısı aşağıdaki döngüde eskisi gibi silinir.
    const dosyaTanilari = new Map<string, Tani[]>();
    if (!taniKapali) kron.ölç("dosya", () => {
      for (const [fsPath, doc] of doclar) {
        if (bilerekHataliMi(doc)) continue;
        dosyaTanilari.set(fsPath, tanilaCekirdek(doc, taniAgaci(fsPath, doc, açıkBelgeler, programlar)));
      }
    });
    // 🕰️ MIM-1.2 ③ (zaman-ekseni turu): mevsim çevrimi TANI turunda da koşar — Blok'un `mevsim:`
    // kenarı sanal çağır'a normalize edilmeden hiyerarsiTanilari fazsız-blok basardı
    // (Founder saha bulgusu 2026-07-19: panel yolu çevrimliydi, tanı yolu çevrimsiz
    // kalmıştı — CLI temiz, Problems kirli). Çevrim MOTORDA tek nokta (DIL-2); idempotent.
    kron.ölç("ayrıştırma", () => mevsimNormalize(programlar));
    // 🚪 KYN-MTR-A05: CROSS-FILE tanılar artık TEK ORKESTRASYONDAN gelir. Eklenti
    // eskiden bu tanıları kendi elle seçtiği bir üretici alt kümesini (dagTanilari ·
    // gizliBagimlilikTanilari · … ) tek tek çağırarak kendi başına topluyordu, ayrıca
    // yapısal-mutabakat (kayıp-yapı vb.) için proje-denetim.ts adlı elle bakılan
    // küçültülmüş bir ikinci gövde koşturuyordu (44 üretici bu iki yoldan hiçbirine
    // uğramıyordu — ölçülmüş belirti, KYN-MTR-A05). Artık CLI'nin `denetleKomutu`sunun
    // çağırdığı AYNI gövde (`denetimKos`) çağrılır ve dönen TAM akış, tek kaynaktan
    // ilan edilen panel ÜRETİCİ kümesiyle (`panelCaprazUreticiKumesi` · kapi-kapsami.ts)
    // süzülür — kapsam kararını bu kod değil, o ilan verir. Süzgecin anahtarı tanı
    // kimliği DEĞİL üretici kimliğidir: her tanı `denetimKos` içinde doğduğu üreticinin
    // adıyla damgalanır (`sonuc.koken`) ve yalnız damgası panel yüzeyinde ilan edilmiş
    // bir üreticiye ait olan tanı geçer. Gerekçe ölçülmüştür: aynı tanı kimliği iki
    // ayrı üreticide yaşayabilir (kenar-metin) ve kimlikle süzen panel, yalnız komut
    // satırına ayrılmış üreticinin tanısını da geçirerek Founder'a ayrılmış kapsam
    // kararını kazara veriyordu. Şiddet de CLI ile BİREBİR aynıdır (evre-farkında
    // yumuşatma dahil): eski "canlı" modun kayıp-yapıyı EVRE'den bağımsız her zaman
    // BİLGİ'ye indiren ayrı yumuşatması kaldırıldı, çünkü panelin CLI'den farklı bir
    // düzey göstermesi YUZ-3.1'in "hiçbir yüz tanıyı yeniden derecelendiremez"
    // hükmünü ihlal ediyordu.
    const donguHar = new Map<string, Tani[]>();
    const panelUreticileri = panelCaprazUreticiKumesi();
    const bugun = new Date().toISOString().slice(0, 10);
    // ⚡ PRF-A06: olay-tetikli tur ODAKTAKİ varlığa daralır. Ölçüm (2026-08-29):
    // `denetimKos` sarmal kökünde 1828 ms, çatı kökünde 4229 ms — ikisi de
    // bölünmez senkron bloktur ve o pencerede yazım takılır. Daraltmanın hükmü
    // MIM-1.1'dir: odak açıkken paneller zaten yalnız odaktaki varlığı gösterir,
    // dolayısıyla odak dışında hesaplanan çapraz tanı üretildiği anda süzgeçte
    // eleniyordu. Soğuk açılış ile ayar/dil/odak turları TAM koşar (Adım sınırı).
    // 🩹 BKM-DNT-A18: dar kökler odağın YANINDA turu tetikleyen olayların
    // değiştirdiği dosyaların varlık köklerini de taşır; bir kök çözülemezse ya da
    // değişen bilinmiyorsa tur tam koşar (karar saf: izleyici-cekirdek `turKapsami`).
    const darKokler = turKapsami(
      tetik, aktifVarlik, odakAcik(),
      (vscode.workspace.workspaceFolders ?? []).map((k) => k.uri.fsPath), degisenYollar, varlikKoku);
    // ⚙️ Tanı üretimi yalnız denetim AÇIKKEN koşar; görüntü yayını aşağıda her
    // iki hâlde de tek çağrıdır (tur-goruntusu.test.ts KAYNAK nöbeti onu sayar).
    // Kapsam etiketi (darKokler) her iki hâlde de hesaplanır, çünkü görüntü onu taşır.
    if (!taniKapali) {
    const denetlenenKokler = darKokler
      ?? (vscode.workspace.workspaceFolders ?? []).map((k) => k.uri.fsPath);
    // 📦 EKL-F6-A09 · SESSİZ ATLAMANIN SONU. Tip kaydı bulunamayan kök eskiden
    // bir `continue` ile atlanıyordu ve o kökte kırık atıf, disk mutabakatı ve
    // bağımlılık grafı tanıları hiç doğmuyordu; boş panel temiz ağaç sanılıyordu.
    // Keşif artık paketin kendi kanon kopyasına en son çare olarak düşer, dolayısıyla
    // mağazadan kurulan eklenti de tam denetimi koşar. Kopya da okunamazsa kök
    // atlanır, fakat bu artık SÖYLENİR: atlanan kökler durum çubuğundaki işarete gider.
    // 📣 MGZ-A04: kök turu saf gövdededir (kanon-kesif.ts `tamDenetimKokTuru`).
    // Bir kökün tam denetimi çökerse canlı tanı akışı yine bozulmaz, fakat çöküş
    // artık yutulmaz: çöken kök atlanan kök gibi işarete gider ve iletisi kanala düşer.
    // ⛔ MGZ-A12: tek bir kırık .sar dosyası eskiden `denetimKos`u ilk söz dizimi
    // hatasında erken çıkışa götürüyor, akış boş dönüyor ve bu boşluk temiz ağaç
    // sanılıyordu (ölçüm 2026-10-10: Gözlemler 91 → 42, işaret sessiz). Tur artık
    // atlama kipinde koşar: kırık dosya evrenden düşer, öteki dosyaların çapraz
    // tanıları korunur ve eksik koşan kök aynı işarete üçüncü sebep olarak gider.
    // Kırık dosyanın kendi söz dizimi tanısı tek dosya yolundan geldiği gibi kalır.
    const koklar = (vscode.workspace.workspaceFolders ?? []).map((k) => k.uri.fsPath);
    const { atlanan: atlananKokler, coken: cokenKokler, eksik: eksikKokler } = kron.ölç("çapraz", () => tamDenetimKokTuru(
      denetlenenKokler,
      (kokYol) => tamDenetimKanonuBul(kokYol, koklar, paketKanonKoku),
      (kokYol, kanon) => {
        const sonuc = denetimKos(kokYol, { snfYol: kanon.snfYol, bugun, tamListe: true, kirikDosyayiAtla: true });
        for (const rapor of sonuc.akis) {
          const izinli = rapor.tanilar.filter((t) => {
            const uretici = sonuc.koken.get(t);
            return uretici !== undefined && panelUreticileri.has(uretici);
          });
          if (!izinli.length) continue;
          // denetimKos `dosya` alanına çalışma-alanı-GÖRELİ etiket ya da (ana-yok
          // erken-çıkışında) doğrudan MUTLAK kök yolu koyar; panelin tanı defteri
          // MUTLAK fsPath ile anahtarlanır (doclar haritasıyla aynı sözleşme).
          const absDosya = isAbsolute(rapor.dosya) ? rapor.dosya : join(kokYol, rapor.dosya);
          const liste = donguHar.get(absDosya) ?? [];
          liste.push(...izinli);
          donguHar.set(absDosya, liste);
        }
        return eksikKokKaydi(kokYol, sonuc);
      }));
    for (const c of cokenKokler) perfKanal.appendLine(IZ_METINLERI.kokDenetimiCoktu(c.kok, c.hata));
    for (const e of eksikKokler) perfKanal.appendLine(IZ_METINLERI.kokDenetimiEksik(e.kok, e.dosyalar));
    tamDenetimSonucu(denetlenenKokler, atlananKokler, darKokler === undefined, cokenKokler, eksikKokler);
    // Her dosyanın tanıları = tek-dosya (tanilaCekirdek) + o dosyaya düşen DAG
    // döngü tanıları; hepsi doğasına göre üç kanonik yüzeye dağıtılır.
    //
    // ÇIPLAK-ADIMLI-KATMAN KONSOLİDASYONU BURADAN KALKTI (göç yüzey turu A05 kapanışı): o
    // tanı bilgi düzeyindedir ve artık Bildirimler yüzeyinde yaşar; Bildirimler
    // aynı kökten gelen kayıtları zaten sayısını söyleyen tek özet altında
    // topluyor. Aynı işi iki yerde yapmak, ikisinden birinin sessizce bayatladığı
    // sınıfa girer; özetleme tek yerde, sunum yüzeyinde kaldı.
    for (const [fsPath, doc] of doclar) {
      // TUR-2 muaf-asimetri onarımı (teftiş 🟠 KRR-MUT-2): bilerek-hatalı işaretli
      // dosya (ders malzemesi) DENETLEHEPSI yolundan da paneli kirletemez — tek-dosya
      // `denetle` süzgecinin ikizi; CLI muafiyetiyle simetri kapandı (kapi_kapsami).
      if (bilerekHataliMi(doc)) { taniSil(doc.uri, false); continue; }
      // ⚡ PRF-A06: tur daraltılmışsa kapsam DIŞINDAKİ dosyanın çapraz tanısı bu
      // turda hiç hesaplanmamıştır. Boş liste yazmak onları SİLERDİ ve odak
      // dışındaki varlığın kayıtları sessizce kaybolurdu; bunun yerine önceki
      // turun sonucu olduğu gibi korunur. Korunan kayıt odak oraya döndüğünde
      // tazelenir: odak değişimi tam tur ister (aktifVarligiGuncelle).
      // 🩹 BKM-DNT-A18: değişen kardeş kök artık denetlenen kökler arasındadır ve
      // bu karar onun dosyalarını önbellekten değil taze denetimden besler.
      const kapsamDisi = !caprazYenidenHesaplanir(fsPath, darKokler);
      const capraz = kapsamDisi
        ? (caprazOnbellek.get(fsPath) ?? [])
        : (donguHar.get(fsPath) ?? []);
      caprazOnbellek.set(fsPath, capraz);   // SRN-PANEL-DALGA: tek-dosya yolu düzenlemede bunları da yayınlar
      // Üçüncü argüman YAYINI KAPATIR. Tam tarama yüzlerce belge gezer; her belgede
      // çizim tetiklenseydi Bildirimler paneli tur başına onlarca kez yeniden
      // çizilirdi. Turun tek yayını aşağıda, döngü bittikten sonra yapılır.
      const tekDosya = dosyaTanilari.get(fsPath) ?? kron.ölç("dosya", () => tanilaCekirdek(doc));   // ⏱️ PNL-A14: yukarıda turun ağacından üretildi
      kron.ölç("yayın", () => yuzeylereDagit(doc, [...tekDosya, ...capraz], false, programlar.get(fsPath)));   // MIM-1.1 ②
    }
    // Bu turda görülmeyen (kapanmış/dışlanmış) dosyaların bayat çapraz önbelleği
    // temizlenir — silinen tanı düzenlemede geri gelmesin.
    for (const yol of [...caprazOnbellek.keys()]) if (!doclar.has(yol)) caprazOnbellek.delete(yol);
    const yuzeyYayiniBasi = kron.şimdi();   // ⏱️ PNL-A14: iki defterin tek yayını "yayın" aşamasına düşer
    yuzeyDefteri.buda(new Set(doclar.keys()));
    yuzeyDefteri.yayımla();   // turun TEK yayını
    // 💡 KYN-YUZ-A01: Fikir hanesi aynı budama ve aynı tek-yayın disiplinini
    // izler; kapanan ya da kapsam dışına çıkan dosyanın Fikirleri panelde
    // hayalet olarak kalmaz ve tur başına yalnız bir çizim istenir.
    fikirDefteri.buda(new Set(doclar.keys()));
    fikirDefteri.yayımla();
    // 🚦 PNL-A09: Sinyaller defteri aynı budama ve tek yayın disiplinini izler.
    sinyalDefteri.buda(new Set(doclar.keys()));
    sinyalDefteri.yayımla();
    kron.ekle("yayın", kron.şimdi() - yuzeyYayiniBasi);
    }   // tanı üretimi (denetim açık)
    // 📬 VIT-POSTA-A03 · 🗺️ PRF-TA-A02: turun TEK GÖRÜNTÜ YAYINI. Onay kapıları
    // bu turun ZATEN ürettiği ağaçtan çıkar; ana hat kapı TANIMAZ ve kapı listesi
    // kurmaz, yalnız ortak ayrıştırma sonucunu taşır. Böylece onay yüzeyinin
    // ikinci bir tam turu, ikinci bir dosya okuması ve ikinci bir ayrıştırması
    // kalmaz — ölçülen maliyet açılışta iki yüz doksan sekiz `openTextDocument`
    // çağrısıydı ve bu bildirimle sıfıra iner.
    //
    // Yayın TEKTİR ve tüketiciye göre çoğalmaz: onay tarayıcısı ile (PRF-TA-A03
    // sonrası) yol haritası paneli aynı kayda abone olur. Kayıt turun kendi
    // ağacını taşır; `programlar` haritası mevsim çevrimi uygulandıktan sonra
    // olduğu gibi verilir ve daraltma yalnız `kapsam` etiketine yazılır, çünkü
    // dar tur belge toplamayı ve ayrıştırmayı değil, yalnız çapraz denetimin
    // köklerini daraltır (PRF-TA-A01 sözleşmesi).
    kron.ölç("yayın", () => turGoruntusunuYayinla({ programlar, yollar, belgeler: doclar, dilDışı, tetik, kapsam: darKokler }));
    // 🔬 PRF-A01 · ⚡ PRF-A06: dar tur kanalda kapsamıyla birlikte okunur.
    // 📄 PRF-KP-A02: belge sayacı merceğe bağlanır; kanal satırı açıktan,
    // diskten ve atlanan sayıları ile sıfır açma çağrısını ve okunan toplamı
    // basar. Açıktan artı diskten artı atlanan, taranan dosya sayısına eşittir.
    mercek.turBitti({
      tetik, süreMs: Date.now() - turBasi, dosyaSayısı: yollar.length,   // 🛡️ PRF-KP-A05: süzülmüş liste
      kapsam: darKokler,   // 🩹 BKM-DNT-A18: gerçekten denetlenen kökler; adları mercek basar
      belgeler: { ...belgeSayacı, okunanBayt },
      aşamalar: kron.dök(kron.şimdi() - okumaBitti),   // ⏱️ PNL-A14: aşama süreleri ve bölünmez blok
    });
  };
  // 🧯 PRF-A02 tek-uçuş kilidi: tam-proje denetimi ÜST ÜSTE BİNMEZ — koşarken
  // gelen istekler tek bayrağa iner (mercek 'atlanan' sayar), tur bitince bir
  // telafi turu koşulur. Sol'un olay salkımlarında taramaların üst üste binip
  // IDE'yi kastığı şüphesinin (SRN-IDE-KASMA-SOL-KOSUSU) yapısal onarımı.
  const denetimKilidi = new TekUcusKilidi(denetleHepsi, () => mercek.atlandı(),
    // RED-1 R1: çöken tur sessiz yutulmaz — kanala düşer (kilit yine asılı kalmaz).
    (h) => perfKanal.appendLine(IZ_METINLERI.denetimCoktu(h instanceof Error ? h.message : String(h))));

  // ⚡ PRF-A06: odak değişimi tam tur ister — kanca kilit kurulduktan SONRA
  // bağlanır, böylece açılış turu (aşağıda) ikinci bir turu tetiklemez.
  aktifVarligiGuncelle(vscode.window.activeTextEditor);   // MIM-1.1 ②: açılış odağı aktif dosyadan
  odakTuruIste = (t) => denetimKilidi.iste(t);
  denetimKilidi.iste("başlangıç"); // başlangıç: tüm çalışma-alanı + ORK-1.2 DAG döngü denetimi
  void kimlikIndeksiniTara(); // 🗂️ EKL-F11-A01: kimlik indeksi arka-planda dolar (activate'i bekletmez)
  vscode.workspace.textDocuments.forEach(denetle); // hâlihazırda AÇIK belgeler (çalışma-alanı dışı dahil) hemen denetlensin

  const izleyici = vscode.workspace.createFileSystemWatcher("**/*.sar");
  // YUZ-3.2 ④: .md/.ts atıf evreni AYRI izleyicide — indeksi tazeler ama .sar
  // denetimini (denetleHepsi) TETİKLEMEZ (md kaydetmek DAG taraması istemez).
  const izleyiciAtif = vscode.workspace.createFileSystemWatcher("**/*.{md,ts}");
  // 🩺 DISK-MUTABAKAT TAZELİĞİ (IDA bug 2026-07-14): kayıp-yapı · bildirilmemiş-dosya ·
  // yer-uyuşmazlığı girdileri DOSYA-SİSTEMİ durumudur (proje-denetim.ts). Tetikleyici
  // yalnız .sar olaylarıysa BAYAT kalır — klasör ekle/sil/taşı .sar'a dokunmaz (Tur-2
  // canlı disk-mutabakatın açığı). Geniş izleyici klasör/dosya OLUŞTUR·SİL olaylarında
  // proje-taramasını DEBOUNCED yeniden koşar; onDidChange YOK (içerik değişimi disk-
  // yapısını etkilemez, sadece create/delete). VS Code files.watcherExclude node_modules/
  // .git'i zaten hariç tutar; debounce hızlı olay salkımını tek taramaya indirir.
  const diskIzleyici = vscode.workspace.createFileSystemWatcher("**/*");
  // 🧯 PRF-A02 olay hattı (RED-1 P2 sonrası: hat SINANABİLİR sınıftır —
  // izleyici-cekirdek.OlayHatti; benzetim gerçek bu nesne sınıfını koşturur):
  // gizli dizinler (.git · .sarmal · .vscode …) ve araç/derleme çıkışları
  // (node_modules · dist · out · arsiv · fikstur · sablon) denetim TETİKLEMEZ
  // (mercek 'süzülen' sayar). Süzgece ÇALIŞMA-ALANI-GÖRELİ yol verilir (Sol
  // RED-2 dersi: mutlak yolun üst-dizin adları yanlış-pozitif üretir). Meşru
  // olaylarda geciktirme 500→1500 ms (varsayılan; kesin değerin saha ölçümüyle
  // seçimi PRF-A03'ün işidir): tek git/derleme komutunun dalgası saniye-altı
  // aralıklarla gelir; 500 ms'lik boşluklar dalga ortasında tam tarama
  // başlatıyordu (benzetim: 10 olaylık dalga eski yapılandırmada 7 tetik).
  const diskHatti = new OlayHatti({
    gurultu: gurultuMu, gecikmeMs: 1500,
    iste: (tetik, yollar) => denetimKilidi.iste(tetik, yollar),   // 🩹 BKM-DNT-A18: değişen yollar tura taşınır
    suzuldu: () => mercek.süzüldü(),
    olay: () => mercek.olayGeldi("disk"),
    ertelendi: () => mercek.ertelendi(),
  });
  // 🧯 PRF-A02: .sar olayları da hattan geçer — çok-dosyalı yazım dalgası
  // (biçimlendirme · scaffold · git checkout) tek DAG turuna iner; süzgeç
  // (sarGurultuMu) tam taramanın dışlama globuyla TEK KAYNAKTAN hizalıdır
  // (RED-1 D1). Açık editördeki canlı tanı yolu (onDidChangeTextDocument →
  // denetle) DEĞİŞMEZ, gecikme yalnız cross-file tam turdadır.
  const sarHatti = new OlayHatti({
    gurultu: sarGurultuMu, gecikmeMs: 300,
    iste: (tetik, yollar) => denetimKilidi.iste(tetik, yollar),   // 🩹 BKM-DNT-A18: değişen yollar tura taşınır
    suzuldu: () => mercek.süzüldü(),
    olay: () => mercek.olayGeldi("sar"),
    ertelendi: () => mercek.ertelendi(),
  });
  const goreliYol = (u: vscode.Uri): string => vscode.workspace.asRelativePath(u, false);
  // 🩹 BKM-DNT-A18: süzgeç göreli yolu ölçer (Sol RED-2 dersi); tura ise MUTLAK yol
  // taşınır, çünkü kapsam kararı odaktaki varlık kökünü mutlak yolla karşılaştırır.
  const diskDegisti = (u: vscode.Uri): void => diskHatti.olay(goreliYol(u), "disk-olayı", u.fsPath);
  const sarDegisti = (u: vscode.Uri): void => sarHatti.olay(goreliYol(u), "sar-olayı", u.fsPath);
  context.subscriptions.push(
    izleyici,
    izleyiciAtif,
    diskIzleyici,
    diskIzleyici.onDidCreate(diskDegisti),   // klasör/dosya oluştu → disk-mutabakat tazele
    diskIzleyici.onDidDelete(diskDegisti),   // klasör/dosya silindi → bayat tanı düşsün
    // EKL-F11-A01: izleyici olayları indeksi ARTIMLI tazeler — yalnız değişen dosya
    // yeniden taranır (kirli tampon tazeliği A02'de sağlayıcı katmanının işi).
    izleyici.onDidCreate((u) => { sarDegisti(u); void indeksDosyaTazele(u); }),
    izleyici.onDidChange((u) => { sarDegisti(u); void indeksDosyaTazele(u); }),   // kaydedince cross-file DAG tazele
    izleyici.onDidDelete((u) => { sarDegisti(u); taniSil(u); kimlikIndeksi.dosyaSil(u.fsPath); }),
    izleyiciAtif.onDidCreate((u) => { mercek.olayGeldi("atıf"); void indeksDosyaTazele(u); }),
    izleyiciAtif.onDidChange((u) => { mercek.olayGeldi("atıf"); void indeksDosyaTazele(u); }),
    izleyiciAtif.onDidDelete((u) => { mercek.olayGeldi("atıf"); kimlikIndeksi.dosyaSil(u.fsPath); }),
    // Bir .sar AÇILINCA hemen denetlen — yazmayı beklemeden (çalışma-alanı dışı dosyalar da).
    vscode.workspace.onDidOpenTextDocument(denetle),
    vscode.workspace.onDidChangeTextDocument((e) => denetle(e.document)),
    // ⚡ EKL-F9-A06: kapanan belge AST önbelleğinden düşer (ölü-thread nöbeti dersi)
    // + kapsam-dışı (ornek/arsiv…) belge kimlik indeksinden de düşer — gezinme
    //   tazelemesi onu AÇIKKEN eklemişti (gezinme.ts); kirlilik açık-süreyle sınırlı.
    vscode.workspace.onDidCloseTextDocument((doc) => {
      belgeKapandi(doc);
      if (INDEKS_DISI.test(doc.uri.fsPath)) kimlikIndeksi.dosyaSil(doc.uri.fsPath);
    }),
    // 📍 Çalışma alanına klasör eklenip çıkarıldığında kökler tazelenir ve paneller
    //    yeniden çizilir; aksi hâlde ipucunun kaynak satırı artık var olmayan bir
    //    köke göre kısalır ve kullanıcıya yanlış bir yol gösterir (VIT-GRAF-A18).
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      yuzeyKokleriniTazele();
      hatirlaticilar?.diliTazele();
      bildirimler?.diliTazele();
    }),
    // Ayar değişince tüm çalışma-alanını yeniden değerlendir.
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("sarmal.denetim")) denetimKilidi.iste("ayar");
      if (e.affectsConfiguration("sarmal.aktifVarlikOdagi")) hepsiniYenidenYayinla();   // MIM-1.1 ③
      if (dilAyariDegistiMi(e)) {
        yuzeyDiliniAyarla(etkinDil());
        hatirlaticilar?.diliTazele();
        fikirler?.diliTazele();
        bildirimler?.diliTazele();
        sinyaller?.yenile();   // 🚦 PNL-A09: bant başlıkları yeni dilde
        onayPaneli?.diliTazele();
        yolHaritasiYuzeyi?.diliTazele();
        tren?.diliTazele();
        panel?.diliTazele();
        denetimKilidi.iste("dil");
      }
    }),
    // MIM-1.1 ②: aktif editör değişince panel o VARLIĞA odaklanır (Nexivion'dayken Nexivion).
    vscode.window.onDidChangeActiveTextEditor(aktifVarligiGuncelle),
    // Otomatik tamamlama (harf yazınca + Ctrl+Space; ">" = --> sonrası KOD)
    vscode.languages.registerCompletionItemProvider("sarmal", tamamlamaSaglayici(etkinDil), ">"),
    // Anlamsal renklendirme (widget → aile rengi)
    vscode.languages.registerDocumentSemanticTokensProvider("sarmal", renkSaglayici(), efsane),
    // Anahat / Outline (widget ağacı → sembol ağacı)
    vscode.languages.registerDocumentSymbolProvider("sarmal", anahatSaglayici()),
    // Üzerine-gelme açıklaması (Türkçe)
    vscode.languages.registerHoverProvider("sarmal", ipucuSaglayici(etkinDil)),
    // Hızlı düzeltme (💡 ampul → öneriyi uygula)
    vscode.languages.registerCodeActionsProvider("sarmal", duzeltmeSaglayici(), {
      providedCodeActionKinds: [vscode.CodeActionKind.QuickFix, vscode.CodeActionKind.RefactorRewrite],
    }),
    // Belge biçimlendirme (⇧⌥F → girinti/hizalama)
    vscode.languages.registerDocumentFormattingEditProvider("sarmal", bicimlendirmeSaglayici()),
    // ⚡ İskeleti Kur (Hot Reload) — ana.sar'dan klasör ağacını diske üretir
    vscode.commands.registerCommand("sarmal.iskeletKur", iskeletKur),
    // 🔭 MIM-1.1 ② el-ile odak (Founder 2026-07-18): ray'daki varlık satırı tıklanınca
    // Problems o varlığın tanılarına döner — çok-proje tek panelde, tanılar karışmadan.
    // Anadizin de açılır; aktif-editör odağı (aktifVarligiGuncelle) aynı köke oturur.
    vscode.commands.registerCommand("sarmal.varligaOdaklan", async (kok: string, anaSar?: string) => {
      if (kok && kok !== aktifVarlik) { aktifVarlik = kok; hepsiniYenidenYayinla(); }
      vscode.window.setStatusBarMessage(panelOdakMesaji(basename(kok)), 4000);
      if (anaSar) await vscode.window.showTextDocument(vscode.Uri.file(anaSar), { preview: true });
    }),
  );

  // 🎯 EKL-F11-A02/A03: F12 · ⇧F12 · F2 · ⌘T — kimlik indeksinden,
  // aktif-varlık sınırına saygılı (varlık kökü tespiti MIM-1.1 ile aynı kaynaktan).
  gezinmeKaydi(context, varlikKoku);

  // 🖋️🔗 EKL-F11-A04: ( imza yardımı (kanondan) + referans:/yol:/dosya: tıklanır
  // yollar; VIT-GRAF-A14 ile anlatı-içi yol sözceleri de aynı sağlayıcıda yaşar.
  context.subscriptions.push(
    vscode.languages.registerSignatureHelpProvider("sarmal", imzaSaglayici(), "(", ","),
    vscode.languages.registerDocumentLinkProvider("sarmal", baglantiSaglayici(varlikKoku)),
  );

  // 👁️ VIT-GRAF-A14 (Founder ek hükmü 2026-08-04): F12'nin varlık sınırında KÖR
  // kaldığı kod atıfları salt-okunur ÇAPRAZ-VARLIK bakış linki olur — süslü
  // sözcenin tıklaması ölü kalmaz, F12'nin mevcut çözümüne dokunulmaz.
  caprazAtifKaydi(context, varlikKoku);

  // 🩺 Satır-içi tanılar (errorlens'in NATIVE Sarmal'lısı) — üçüncü-parti errorlens
  // .sar için susturuldu; tanı metnini biz basıyoruz (Founder 2026-07-09: bağımsızlık).
  satiriciKaydi(context);

  // Girinti derinlik-tonu (indent-rainbow'un NATIVE Sarmal'lısı) — GERİ AÇIK:
  // dallar.ts artık Flutter tekniğiyle KESİNTİSİZ → girinti renkleri boşlukları
  // doldurup çizgileri tamamlar (Founder 2026-07-09: "boşlukları dolduran renkler").
  girintiKaydi(context);
  camKaydi(context);        // 🪟 tip/anahtar kelimelere buzlu-cam kapsül
  atifDekorKaydi(context);
  // 🌐 MGZ-A09 (Founder hükmü 2026-10-10): dosyanın üzerine İngilizce tip adı
  // boyayan katman (CDL-A08) söküldü. Kaynak her dilde olduğu gibi Türkçe görünür;
  // İngilizce yalnız arayüzde, tanıda ve ipucu balonunda konuşur ve dosyadaki
  // gerçek adları anar. Editöre basılan hiçbir dekor dile göre değişmez.
  // 🎨 VIT-KIMLIK-A06 (Founder hükmü 2026-08-04): geometrik simge ailesi kaynak
  // dosyanın İÇİNDE de konuşur — altı eksen tipinin bildirim satırı tip adının
  // solunda simgesini taşır; yollar simge-cizelgesi.ts'den, dosyaya bayt yazılmaz.
  eksenDekorKaydi(context, vscode);
  // 🎨 VIT-KIMLIK-A08 (Founder isteği 2026-08-30): parametre satırları (görev,
  // sınır, referans, kabul ve kardeşleri) satır başında aile simgesini taşır;
  // eşleme simge-cizelgesi.ts'de yaşar, her boyamanın süresi performans kanalına düşer.
  parametreDekorKaydi(context, vscode, (o) => perfKanal.appendLine(IZ_METINLERI.dekorTuru({
    saat: new Date().toTimeString().slice(0, 8), sure: o.sureMs, simge: o.simge, satir: o.satir, tetik: o.tetik,
  })));
  onayKuyruguKaydi(context, onayPaneli, odakKapisi);   // 📬 nabız + 🔭 odak kapsamı

  // Ağaç kılavuz çizgileri (kesintisiz dikey + ├└ dallar + kapanış etiketi)
  dallarKaydi(context);

  // Önizleme (MD önizlemesi gibi — ⇧⌘V / başlık çubuğu ikonu)
  onizlemeKaydi(context);
  kuzeyYildiziKaydi(context);   // 🌟 kalp atışlı Kuzey Yıldızı (Founder 14:21)
  takdirKaydi(context);         // 💛 Founder takdir kalbi (Founder 14:30)

  // 🚂 Yol Haritası paneli (EKL-F7): plan ağacı kutucuklu kendi evinde
  // 🗺️ PRF-TA-A03: beşinci argüman panelin TUR İSTEME kapısıdır. Panelin kendi turu
  // yoktur; el ile yenileme düğmesi gövdenin TEK kilidinden 'el-ile' tetikli bir
  // denetim turu ister ve panel o turun yayınından beslenir. İkinci bir kilit ya da
  // ikinci bir tur gövdesi doğmaz.
  yolHaritasiYuzeyi = yolHaritasiKaydi(context, (s) => perfKanal.appendLine(s), odakKapisi, meyveKapisi, (t) => denetimKilidi.iste(t));   // 🗺️ PRF-A04: panel turları da kanala düşer · 🔭 mini graf odağı · 🍎 meyve kapısı
  // 🧭 Founder 2026-10-21: kapta tek webview görünümü; Yol Haritası, Mini Graf, Tren ve Makinist veri
  // sağlayıcıları bu görünümün sekmelerinde (Ray · Tren · Makinist) okunur. Yerleşik bölüm komutları
  // (sarmal.bolum.*) sekmeyi seçer; Graf, Ray sekmesinin parçasıdır.
  if (tren && yolHaritasiYuzeyi) {
    panel = panelKaydi(context, { yol: yolHaritasiYuzeyi, tren, makinist: makinistAgaci, sinyaller });
    // PNL-A18: yuvanın yerleşik seçimi panelin sekmesinden okunur; iki seçim ayrışamaz.
    bolumYuvasi?.sekmeBagla((b) => panel?.sekmeSecVeOdakla(b === "graf" ? "ray" : b), panel);
  }

  // 🎨 Çalışma Alanını Giydir (BKM-SNV2-A03): dış projede görünüm paritesi —
  // imzasız çalışma alanında bir kez sorar; bizim repo imzalı olduğundan sessiz.
  giydirKaydi(context);

  console.log(IZ_METINLERI.eklentiEtkin);

  return {
    yuzeyKayitlari: () => yuzeyDefteri.gorunenler(),
    // 🚦 PNL-A09: Sinyaller defterinin kapsamdaki kayıtları (sekmenin girdisi; nöbet çıktıyı buna karşı ölçer).
    sinyalKayitlari: () => sinyalDefteri.gorunenler().map((k) => ({ dosya: k.dosya, kod: k.tani.kod, duzey: k.tani.duzey, satir: k.tani.satir })),
    onayOlcumleri: () => ({ ...onayYuzeyiOlcumleri(), ...tarayiciOlcumleri() }),
    onayKapilari: () => onayPaneli?.kapiKodlari() ?? [],
    // 🗺️ PRF-TA-A04 salt okur ölçüm kapıları: hepsi üretimin KENDİ sayaçlarını
    // ve son görüntüsünü olduğu gibi verir; hiçbiri hesap yapmaz, hiçbiri yazmaz.
    panelOlcumleri: () => panelOlcumleri(),
    turOlcumleri: () => ({ ...turGoruntusuOlcumleri(), tur: turSayacı.tur }),
    sonGoruntuOzeti: () => {
      const g = sonTurGoruntusu();
      if (!g) return undefined;
      return {
        sıra: g.sıra, tetik: g.tetik, kapsam: g.kapsam === undefined ? undefined : [...g.kapsam],
        programlar: [...g.programlar.keys()], yollar: [...g.yollar],
        kirik: [...g.kirik], okunamayan: g.okunamayan, dilDışı: [...g.dilDışı],
      };
    },
    onbellekAnahtarlari: () => onbellekAnahtarlari(),
    yolHaritasiKodlari: () => yolHaritasiYuzeyi?.kodlar() ?? [],
    bolumYuvasiAl: (surum: number) => bolumYuvasi?.al(surum),
    ...(context.extensionMode === vscode.ExtensionMode.Test && bolumYuvasi
      ? { bolumSinamaKapisi: { ...bolumYuvasi.sinamaKapisi(), yolHaritasiGorunurMu: () => yolHaritasiYuzeyi?.gorunurMu() ?? false, panelOlcumleri: () => panel?.olcumler() } }
      : {}),
  };
}

export function deactivate(): void {
  koleksiyon?.dispose();
  // Yüzeyler birlikte kapanır: görünümleri context.subscriptions serbest bırakır,
  // buradaki tutamaklar da bırakılır ki kapanmış bir görünüme yayın denenmesin.
  hatirlaticilar = undefined;
  fikirler = undefined;       // 💡 VIT-GRAF-A16: kapanmış görünüşe Fikir basılmasın
  bildirimler = undefined;
  sinyaller = undefined;        // 🚦 PNL-A09: kapanmış sekmeye sinyal basılmasın
  onayPaneli = undefined;       // kapanmış görünüme kapı yazılmasın
  tren = undefined;
  panel = undefined;
  bolumYuvasi = undefined;      // 🧩 kapanmış sıraya çizim istenmesin
  odakDinleyicileri.length = 0;  // kapanmış görünüme odak haberi gitmesin
  yuzeyDefteri.temizle(false);   // tutamaklar bırakıldı; kapanışta çizim istenmez
  fikirDefteri.temizle(false);   // 💡 KYN-YUZ-A01: Fikir hanesi de sessizce boşalır
  sinyalDefteri.temizle(false);  // 🚦 PNL-A09
}

/**
 * ⚡ Hot Reload — aktif ana.sar'dan klasör iskeletini diske üretir (flutter create gibi).
 *   Var olan klasörü EZMEZ (iskeletYaz atlar) → artımlı: yeni Raf eklendikçe yeni klasör açar.
 */
async function iskeletKur(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== "sarmal") {
    vscode.window.showWarningMessage(EKLENTI_KABUK_METINLERI.iskeletIcinBelgeGerekli);
    return;
  }
  const doc = editor.document;
  await doc.save();

  let program;
  try {
    program = ayristir(belirtecle(doc.getText()));
  } catch (e) {
    if (e instanceof SozDizimHatasi) {
      vscode.window.showErrorMessage(iskeletSozDizimHatasi(e.satir, e.sutun));
      return;
    }
    throw e;
  }

  const snf = snfBul(doc);
  if (!snf) {
    vscode.window.showWarningMessage(EKLENTI_KABUK_METINLERI.siniflamaBulunamadi);
    return;
  }

  const hedef = dirname(doc.uri.fsPath);
  const sonuc = iskeletYaz(iskeletPlani(program, snf), hedef);
  const olusan = sonuc.filter((s) => s.durum === "oluşturuldu").length;
  const atlanan = sonuc.filter((s) => s.durum === "atlandı").length;
  vscode.window.showInformationMessage(iskeletKuruldu(olusan, atlanan));
}

/** Bilerek-hatalı işaretli dosya (ders malzemesi): ilk beş satırdan birinde işaret taşır. */
function bilerekHataliMi(doc: BelgeYuzu): boolean {
  return doc.getText().split("\n", 5).some((s) => BILEREK_HATALI.test(s));
}

/**
 * Bir .sar belgesini denetler → motorun KANONİK tanı nesneleri. Eskiden bu
 * işlev doğrudan editör tanısı üretiyordu; artık ham tanıyı döndürüyor, çünkü
 * yüzey yönlendirmesi kaydın düzeyini ve kimliğini görmek zorundadır ve dönüşüm
 * yalnız yayın sınırında (taniYapTani) yapılır. Böylece düzey eşlemesi de tek
 * yerde kaldı: tek-dosya yolu ile proje taraması artık aynı kodu koşuyor.
 */
function tanilaCekirdek(doc: BelgeYuzu, hazirAgac?: Program): Tani[] {
  const dil = etkinDil();
  const metin = doc.getText();

  // ⏱️ PNL-A14: tur kendi ağacını verir (`taniAgaci`); ağaç yoksa metin burada
  // ayrıştırılır. Ağaç, bu metnin aynı ayrıştırıcıdan geçmiş taze ağacıdır.
  let program = hazirAgac;
  if (!program) {
    try {
      program = ayristir(belirtecle(metin));
    } catch (e) {
      if (e instanceof SozDizimHatasi) {
        return [sozDizimTanisi(e)];
      }
      throw e;
    }
  }

  const snf = snfBul(doc);
  if (!snf) return []; // SNF-0 bulunamadı → yalnız söz dizimi denetlendi

  // BKM-OLG-A07: Hatırlatıcı vade kapısı — tarihi GELEN ❗ Problems'a düşer,
  // gelmeyen SESSİZ (gürültünün kökten önlenmesi — Founder fikri). Editör
  // katmanında gerçek bugün serbest (determinizm kaygısı CLI/test tarafında;
  // orada tarih --tarih ile enjekte edilir).
  const bugun = new Date().toISOString().slice(0, 10);

  return [
    ...dogrula(program, snf, doc.uri.fsPath, doc.getText(), { dil }),
    ...fazVadeTanilari(program, bugun).map((t) => taniDilineCevir(t, dil)),
  ];
}

// ── 🧭 YUZ-3.3 YÖNLENDİRMESİ ─────────────────────────────────────────────────
//   `yuzeyDefteri` dosya başına, Problems DIŞINDAKİ iki yüzeye ait kayıtları
//   tutar. Tek-dosya düzenlemesi yalnız kendi satırını tazeler; öteki dosyaların
//   hatırlatıcıları ve bildirimleri bir tuş vuruşunda kaybolmaz.
//
//   DEFTERİN GÖVDESİ SAF ÇEKİRDEKTEDİR (yuzey-cekirdek.YuzeyDefteri). Buradaki
//   iş yalnız iki kapıyı bağlamaktır: panele basma kapısı ve aktif-varlık kapsam
//   süzgeci. Kapsam süzgeci üç yüzeyde AYNIDIR (GOC-YUZEY düzeltme halkası
//   kararı): Problems bir varlığı gizlerken Hatırlatıcılar ile Bildirimler onu
//   göstermeye devam ederse kullanıcı çelişkili iki tablo görür ve yeni başlayan
//   biri bunu kendi hatası sanar.
const yuzeyDefteri = new YuzeyDefteri(
  (dagilim) => {
    if (!hatirlaticilar && !bildirimler) return;
    hatirlaticilar?.yerlestir(dagilim.hatırlatıcılar);
    bildirimler?.yerlestir(dagilim.bildirimler);
    // Sayaçlar panellerle AYNI turda tazelenir: ikisi ayrı anlarda güncellenirse
    // kullanıcı bir an için çelişen iki sayı görür ve hangisine inanacağını bilemez.
    durumCubugu?.tazele();
  },
  (dosya) => panelDeGorunur(dosya),
);

// ── 🚦 SİNYAL DEFTERİ (PNL-A09 · OZK-14) ─────────────────────────────────────
//   Turun her dosya için ürettiği tanıların TAMAMI, yüzeylere ayrılmadan önceki
//   hâliyle burada durur; Sinyaller sekmesi tam listeyi Dur, Dikkat ve Bilgi
//   bantlarında gösterir. Kapsam süzgeci öteki yüzeylerinkiyle AYNIDIR
//   (`panelDeGorunur`) ve yayın tur başına birdir. Odaktaki Projenin kodu
//   sekmede o projeyi üste alır.
const sinyalDefteri = new KayitDefteri<YuzeyKaydi>(
  (kayitlar) => sinyaller?.yerlestir(kayitlar, aktifVarlik ? projeKimligi(join(aktifVarlik, "_")).kod : undefined),
  (dosya) => panelDeGorunur(dosya),
);

// ── 💡 FİKİR DEFTERİ (KYN-YUZ-A01 · VIT-GRAF-A16) ────────────────────────────
//   Fikir kayıtları da dosya başına tutulur ve Fikirler panelinin görünüşüne tek
//   noktadan basılır. DEFTER, KAPSAM SÜZGECİ VE TEK YAYIN DİSİPLİNİ, hane bir
//   panelden ötekine taşınırken hiç değişmedi; taşınan şey yalnız yayın kapısının
//   ucundaki görünüştür. Kapsam süzgeci yüzey defteriyle AYNIDIR
//   (`panelDeGorunur`): aynı motorun çıktısını gösteren yüzeyler kapsam
//   konusunda birbiriyle anlaşmak zorundadır, yoksa biri bir varlığı gizlerken
//   öteki göstermeye devam eder ve kullanıcı çelişkili iki tablo görür.
const fikirDefteri = new FikirDefteri(
  (kayitlar) => {
    fikirler?.yerlestir(kayitlar);
    // Sayaç panelle AYNI turda tazelenir: ikisi ayrı anlarda güncellenirse
    // kullanıcı bir an için çelişen iki sayı görür ve hangisine inanacağını
    // bilemez (KUSUR-DURUM-ÇUBUĞU dersi). İkinci bir sayaç yine kurulmaz; sayı
    // panelin kendi listesinden türer.
    durumCubugu?.tazele();
  },
  (dosya) => panelDeGorunur(dosya),
);

/**
 * Bir dosyanın kanonik tanılarını üç kanonik yüzeye dağıtır. Hata ve uyarı
 * düzeyli sapma Problems'a yayınlanır, kalan iki doğa kendi görünüşüne gider.
 * Aynı kayıt iki yüzeye birden yazılmaz; bu güvence dağıtımın kendisinde
 * yapısaldır (yuzeyeAyir tek geçişte tek kova seçer).
 *
 * `yayımlansın` yanlış verildiğinde iki yeni yüzey ÇİZDİRİLMEZ; kayıtlar yalnız
 * deftere yazılır. Toplu tarama bu yolu kullanır ve tur sonunda tek bir yayın
 * yapar; aksi hâlde her belge için ayrı bir çizim tetiklenirdi.
 */
function yuzeylereDagit(
  doc: BelgeYuzu, tanilar: readonly Tani[], yayımlansın: boolean,
  program: Program | undefined,
): void {
  const proje = projeKimligi(doc.uri.fsPath);
  const dil = etkinDil();
  const kayitlar: YuzeyKaydi[] = tanilar.map((tani) => ({
    proje, dosya: doc.uri.fsPath, tani: taniDilineCevir(tani, dil),
  }));
  const dagilim = yuzeyeAyir(kayitlar);
  taniYayinla(doc.uri, dagilim.problems.map((k) => taniYapTani(doc, k.tani)));
  // 🚦 PNL-A09: Sinyaller tam listeyi alır (Sorunlar paneline gönderim değişmez · PNL-A22).
  sinyalDefteri.yaz(doc.uri.fsPath, kayitlar, yayımlansın);
  yuzeyDefteri.yaz(
    doc.uri.fsPath, [...dagilim.hatırlatıcılar, ...dagilim.bildirimler], yayımlansın,
  );
  // 💡 KYN-YUZ-A01 · VIT-GRAF-A16: Fikirler paneli AYNI dağıtım noktasından
  // beslenir ve hane kendi görünüşüne taşınırken bu yol hiç değişmedi. Kayıtlar
  // paylaşılan AST önbelleğinden okunur; yol hem tek-dosya düzenlemesini hem
  // toplu taramayı kapsar, dolayısıyla kullanıcı bir Fikir yazdığı an panelde
  // belirir ve sildiği an düşer. Belge ayrıştırılamıyorsa o dosyanın Fikirleri
  // defterden düşer — Hatırlatıcı hanesinin bozuk belgede yaptığının aynısı.
  // Program ÇAĞIRANDAN gelir; burada `programAl` çağrılamaz çünkü o önbellek
  // belge SÜRÜMÜNE anahtarlıdır ve diskten okunan kaydın sürümü yoktur: sürümsüz
  // bir kayıt bir kez yazıldığında `undefined === undefined` karşılaştırmasıyla
  // sonsuza dek taze sayılır ve dosya diskte değişse bile Fikirler paneli bayat
  // kalırdı. Editör yolu önbelleği kendi çağırır, tur yolu turun kendi ağacını verir.
  const fikirProgrami = program;
  fikirDefteri.yaz(
    doc.uri.fsPath,
    fikirProgrami
      ? fikirleriTopla(fikirProgrami.bildirimler)
        .map((fikir): FikirKaydi => ({ proje, dosya: doc.uri.fsPath, fikir }))
      : [],
    yayımlansın,
  );
}

/** MIM-1.1 ① (VIT-K78-A05 · Founder 2026-07-11: "her projenin doğası farklıdır"):
 *  tanı kimliği VARLIK ekseniyle etiketlenir — dosyanın bağlı olduğu ana.sar kökü
 *  bulunur, Problems'ta kaynak "Sarmal · _Sarmal" / "Sarmal · _KapaliUrun" ayrışır;
 *  filtre kutusuna varlık adı yazınca tek projenin tanıları kalır. Dizin başına memo. */
const varlikKokOnbellek = new Map<string, string | undefined>();
function varlikKoku(dosyaYolu: string): string | undefined {
  const dizin = dirname(dosyaYolu);
  if (varlikKokOnbellek.has(dizin)) return varlikKokOnbellek.get(dizin);
  let d = dizin;
  let kok: string | undefined;
  for (let i = 0; i < 12; i++) {
    if (anadizinBul(d)) { kok = d; break; }   // DIL-1.2: *_anadizin.sar deseni (eski ana.sar da tanınır)
    const ust = dirname(d);
    if (ust === d) break;
    d = ust;
  }
  varlikKokOnbellek.set(dizin, kok);
  return kok;
}
function varlikEtiketi(dosyaYolu: string): string {
  const kok = varlikKoku(dosyaYolu);
  return kok ? `Sarmal · ${basename(kok)}` : "Sarmal";
}

// ── MIM-1.1 ②③ (VIT-K78-A06): panel AKTİF VARLIĞA odaklanır — tüm tanılar kayıt
//    defterinde yaşar, panele yalnız aktif varlığınkiler basılır. Köksüz dosyanın
//    tanıları HER ZAMAN görünür; aktif dosya köksüzse son varlık YAPIŞKAN kalır.
const taniDefteri = new Map<string, { uri: vscode.Uri; tanilar: vscode.Diagnostic[] }>();
let aktifVarlik: string | undefined;

function odakAcik(): boolean {
  return vscode.workspace.getConfiguration("sarmal").get<boolean>("aktifVarlikOdagi", true);
}

function panelDeGorunur(fsPath: string): boolean {
  if (!odakAcik() || !aktifVarlik) return true;
  const kok = varlikKoku(fsPath);
  // ÖLÇÜLMÜŞ KUSUR (Founder canlı bulgusu 2026-08-27): kural eskiden tam eşitlik
  // yapıyordu ve çatı odaktayken alt projelerin hiçbir dosyası sınavı geçemiyor,
  // Hatırlatıcılar, Gözlemler ile Fikirler birden boşalıyordu. Kural artık
  // KAPSAMA ilişkisidir ve tek yönlüdür: odaktaki kökün altında yaşayan her
  // varlık görünür, üstünde ya da yanında yaşayan görünmez. Böylece çatı bütün
  // çalışma alanını, bir alt proje yalnız kendi evini gösterir. Ters yön bilerek
  // kapalıdır; açılsaydı bir alt projede çalışırken kardeş projelerin kayıtları
  // da panele dolar ve odağın kendisi anlamsızlaşırdı. Köksüz dosya HER ZAMAN
  // görünür (MIM-1.1 ②): bir varlığa bağlanamayan dosyanın gizlenmesi onu
  // bütünüyle erişilemez kılardı.
  return !kok || kapsamIcinde(kok, aktifVarlik);
}

/**
 * ⛔ MGZ-A03 · Sorunlar paneline basma kapısı. Odaktaki dosyanın bütün tanıları
 * basılır; odak dışındaki dosyadan yalnız `söz-dizim` geçer (yuzey-cekirdek
 * `problemsYayini`). Yayın ile odak değişimindeki yeniden yayın aynı kapıdan
 * geçer; iki ayrı kural yazılsaydı odak değiştiğinde kırık dosya yeniden düşerdi.
 */
function problemseBas(uri: vscode.Uri, tanilar: vscode.Diagnostic[]): void {
  const odakta = panelDeGorunur(uri.fsPath);
  const gidecek = problemsYayini(tanilar, odakta);
  if (odakta || gidecek.length) koleksiyon.set(uri, gidecek);
  else koleksiyon.delete(uri);
}

function taniYayinla(uri: vscode.Uri, tanilar: vscode.Diagnostic[]): void {
  taniDefteri.set(uri.fsPath, { uri, tanilar });
  problemseBas(uri, tanilar);
  durumCubugu?.tazele();
}

function taniSil(uri: vscode.Uri, yayımlansın = true): void {
  taniDefteri.delete(uri.fsPath);
  koleksiyon.delete(uri);
  // Dosya kapsam dışına çıktıysa hatırlatıcıları ve bildirimleri de düşer —
  // üç yüzey aynı anda temizlenir, biri bayat kalmaz. Toplu tarama içinden
  // çağrıldığında yayın ertelenir; turun tek yayını bu silmeyi de kapsar.
  yuzeyDefteri.sil(uri.fsPath, yayımlansın);
  fikirDefteri.sil(uri.fsPath, yayımlansın);   // 💡 KYN-YUZ-A01: Fikir hanesi de aynı anda temizlenir
  sinyalDefteri.sil(uri.fsPath, yayımlansın);  // 🚦 PNL-A09
}

// ── 🔭 ODAK KAPISI — kapsam süzgeci ile odak olayının TEK evi ────────────────
//   Aktif varlık odağını okuyan her yüzey buradan okur ve odak değişince
//   buradan haber alır. Mini Graf bu kapıya dördüncü tüketici olarak bağlandı
//   (Founder hükmü 2026-07-28): graf yalnız odaktaki varlığı gösterir ve odak
//   değişince tazelenir. İkinci bir odak mekanizması KURULMAZ — iki mekanizma
//   olsaydı biri sessizce bayatlar ve iki yüzey çelişkili tablo gösterirdi.
const odakDinleyicileri: Array<() => void> = [];
const odakKapisi = {
  kapsamda: (dosya: string): boolean => panelDeGorunur(dosya),
  degisince: (dinleyici: () => void): void => { odakDinleyicileri.push(dinleyici); },
};

// ── 🍎 MEYVE KAPISI — beyan edilen teslim diskte var mı? (VIT-GRAF-A12) ──────
//   Mini Graf boş camı bu kapıdan doğar. YENİ TARAMA YOKTUR: tıklanır yolların
//   bugünkü çözümü (baglanti.ts · yolCozumleyici) burada da kullanılır, kökler
//   de aynı merdivendir (varlık kökü → çalışma alanı klasörleri). İkinci bir yol
//   çözümü kurulsaydı aynı yol için iki yüzey çelişkili cevap verebilirdi.
//
//   KÖK, ODAK KAPISININ OKUDUĞU KAYNAKTAN GELİR. Ölçülmüş kusur (2026-07-29 ·
//   bağımsız denetim): bu kapı kökünü CANLI `activeTextEditor`'dan türetiyordu,
//   oysa odak kapısı YAPIŞKAN `aktifVarlik`'i okur ve köksüz dosyada bilinçle
//   değişmez. İki kapı aynı soruya iki ayrı bağlamdan cevap veriyordu. Sonucu
//   ölçüldü: kök kümesi varlık kökünü içerdiğinde 454 beyanın 449'u diskte
//   bulunuyor, yalnız çalışma alanı klasörü kaldığında 454'ünün TAMAMI "diskte
//   yok" ilan ediliyordu — çünkü depo kökünde `*_anadizin.sar` yoktur ve
//   `varlikKoku` boş döner. Bu, varlık dışı (ör. arsiv/) bir dosya açıkken ya da
//   hiç editör aktif değilken doğan olağan bir hâldir; graf her meyveyi boş cam
//   çizip beyan ile gerçeğin farkını TERSİNE gösteriyordu.
const meyveKapisi = {
  var: (beyanYolu: string): boolean => {
    const aktif = vscode.window.activeTextEditor?.document.uri.fsPath;
    const kokler = meyveKokleri(
      aktifVarlik,                                    // yapışkan odak — grafın gösterdiği varlığın kökü
      aktif ? varlikKoku(aktif) : undefined,           // canlı editör kökü (odak kapalıyken tek ipucu)
      (vscode.workspace.workspaceFolders ?? []).map((k) => k.uri.fsPath),
    );
    return !!yolCozumleyici(kokler)(beyanYolu);
  },
};

// Aktif varlık ya da odak ayarı değişince ÜÇ yüzey birden yeniden basılır ve
// odağa bağlı öteki yüzeyler (Mini Graf) haber alır. İki yeni yüzeyin buraya
// eklenmesi bir düzeltmedir: eskiden yalnız Problems yeniden basılıyordu,
// dolayısıyla öteki varlığın hatırlatıcıları ve bildirimleri Problems onları
// gizlediği hâlde panelde durmaya devam ediyordu.
function hepsiniYenidenYayinla(): void {
  for (const { uri, tanilar } of taniDefteri.values()) problemseBas(uri, tanilar);
  yuzeyDefteri.yayımla();
  fikirDefteri.yayımla();   // 💡 KYN-YUZ-A01: Fikir hanesi de odakla birlikte yeniden basılır
  sinyalDefteri.yayımla();  // 🚦 PNL-A09: Sinyaller de odakla birlikte yeniden basılır
  for (const dinleyici of odakDinleyicileri) dinleyici();
}

/** ⚡ PRF-A06: odak DEĞİŞTİĞİNDE yeni odağın çapraz tanılarını tazeleyecek tam
 *  tur isteyen kanca (activate kurar). Daraltılmış turlar odak dışındaki
 *  varlığın kaydını KORUR ama tazelemez; odak oraya döndüğünde resmin güncel
 *  olması bu tura bağlıdır. Kanca kurulmadan (saf sınama) davranış eskisi gibidir. */
let odakTuruIste: ((tetik: string) => void) | undefined;

function aktifVarligiGuncelle(editor: vscode.TextEditor | undefined): void {
  if (!editor || editor.document.uri.scheme !== "file") return;   // yapışkan: panel boşalmaz
  const kok = varlikKoku(editor.document.uri.fsPath);
  if (!kok || kok === aktifVarlik) return;                        // köksüz → yapışkan
  aktifVarlik = kok;
  hepsiniYenidenYayinla();
  // Odak turu TAM koşar (turKapsami 'odak' tetiğini daraltmaz): yeni odağın
  // çapraz tanıları en son ne zaman hesaplandıysa o hâldedir ve tazelenmelidir.
  odakTuruIste?.("odak");
}

// ── 🗂️ EKL-F11-A01: kimlik indeksi beslemesi ────────────────────────────────
// Kapsam (INDEKS_DISI · indeks.ts) denetleHepsi ile AYNI dünya görüşü: kasıtlı
// drift malzemesi indeksi kirletmez. Varlık SINIRI burada çizilmez — indeks her
// varlığı tutar, gezinme sorguları (A02) aktif-varlık süzgeciyle daraltır.
async function indeksDosyaTazele(uri: vscode.Uri): Promise<void> {
  // MIM-3.4 (KPS-MHR-A01): mühürlü dosya kod dizinine girmez — motorun `dizindenIndeks` davranışıyla aynı.
  if (uri.scheme !== "file" || INDEKS_DISI.test(uri.fsPath) || muhurluSarMi(uri.fsPath)) return;
  try {
    const veri = await vscode.workspace.fs.readFile(uri);
    kimlikIndeksi.dosyaGuncelle(uri.fsPath, new TextDecoder().decode(veri));
  } catch {
    kimlikIndeksi.dosyaSil(uri.fsPath);   // okunamayan dosya indekste kalmasın
  }
}

async function kimlikIndeksiniTara(): Promise<void> {
  const dosyalar = await vscode.workspace.findFiles(
    "**/*.{sar,md,ts}",   // YUZ-3.2 ④: .md/.ts atıf evreni (tanım hep .sar'da)
    // 2026-07-19: gizli dizinler ('.*') dışlamaya eklendi — .claude/worktrees ajan
    // kopyaları atıf indeksine sızmasın (onay-kuyruğu saha bulgusuyla aynı sınıf).
    // KPS-IND-A01: glob yalnız BAĞIMLILIK, DERLEME ÇIKTISI ve gizli dizinleri eler;
    // ders rafı ada göre değil yere göre elenir ve o hükmü indeksDosyaTazele'deki
    // INDEKS_DISI deseni verir (öğreti kitaplığına demirli).
    "**/{node_modules,dist,dist-sinama,out,__pycache__,.*}/**");
  await Promise.all(dosyalar.map(indeksDosyaTazele));
}

/** Bir çekirdek Tani'sini (satır·sütun·mesaj·öneri·düzey·kod) vscode tanısına
 *  çevirir — TEK yer (proje taraması ve tek-dosya çapraz-önbellek aynı eşlemeyi
 *  kullanır, düzey/renk tutarsızlığı yapısal olarak imkânsız · SRN-PANEL-DALGA). */
function taniYapTani(doc: BelgeYuzu, t: Tani): vscode.Diagnostic {
  const tani = taniYap(doc, t.satir, t.sutun, t.oneri ? `${t.mesaj}\n↳ ${t.oneri}` : t.mesaj,
    t.duzey === "hata" ? vscode.DiagnosticSeverity.Error
      : t.duzey === "uyarı" ? vscode.DiagnosticSeverity.Warning
        : vscode.DiagnosticSeverity.Information, t.kod);
  // MGZ-A06: giriş dosyasına yazılıp başka bir dosyayı ya da klasörü anlatan bulgu,
  // anlattığı yeri ilgili konum olarak taşır. Satır kaydın dosyasında kalır ve orada
  // sayılır; ilgili konuma tıklamak hedefi açar. Hedef panel tıklamasıyla aynı işlevden gelir.
  const hedef = taniHedefi(doc.uri.fsPath, t);
  if (hedef && t.hedefDosya) {
    tani.relatedInformation = [new vscode.DiagnosticRelatedInformation(
      new vscode.Location(vscode.Uri.file(hedef.dosya), new vscode.Position(hedef.satir - 1, hedef.sutun - 1)),
      hedefBaglantiMetni(t.hedefDosya, hedef.klasor))];
  }
  return tani;
}

/** (satır,sütun) 1-tabanlı konumdan, oradaki sözceyi kapsayan bir tanı üretir. */
function taniYap(
  doc: BelgeYuzu,
  satir: number,
  sutun: number,
  mesaj: string,
  duzey: vscode.DiagnosticSeverity,
  kod: string,
): vscode.Diagnostic {
  const satirNo = Math.min(Math.max(satir - 1, 0), Math.max(doc.lineCount - 1, 0));
  const basSutun = Math.max(sutun - 1, 0);
  const satirMetni = doc.lineAt(satirNo).text;
  const eslesme = satirMetni.slice(basSutun).match(/^\S+/);
  const uzunluk = eslesme ? eslesme[0].length : 1;
  const aralik = new vscode.Range(satirNo, basSutun, satirNo, basSutun + uzunluk);
  const tani = new vscode.Diagnostic(aralik, mesaj, duzey);
  tani.source = varlikEtiketi(doc.uri.fsPath);   // VIT-K78-A05: varlık-ayrımlı kaynak
  tani.code = kod;
  return tani;
}

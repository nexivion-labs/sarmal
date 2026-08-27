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
import { existsSync } from "node:fs";

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
import { varlikDosyasiBul } from "./kanon-kesif.ts";
import { programAl, belgeKapandi } from "./onbellek.ts";   // EKL-F9-A06: paylaşımlı AST önbelleği
import { kimlikIndeksi, INDEKS_DISI } from "../../cekirdek/src/kimlik.ts";  // EKL-F11-A01/A05: kimlik indeksi (çekirdekte — MCP/CLI ile ortak)
import { gezinmeKaydi } from "./gezinme.ts";               // EKL-F11-A02/A03: F12 · ⇧F12 · F2 · ⌘T
import { imzaSaglayici } from "./imza.ts";                 // EKL-F11-A04: ( imza yardımı
import { baglantiSaglayici, yolCozumleyici } from "./baglanti.ts";   // EKL-F11-A04: tıklanır yollar · VIT-GRAF-A12: meyve kapısının yol çözümü
import { caprazAtifKaydi } from "./atif-baglanti.ts";   // 👁️ VIT-GRAF-A14: çapraz-varlık salt-okunur bakış
import { tamamlamaSaglayici } from "./tamamlama.ts";
import { renkSaglayici, efsane } from "./renk.ts";
import { anahatSaglayici } from "./anahat.ts";
import { ipucuSaglayici } from "./ipucu.ts";
import { duzeltmeSaglayici } from "./duzeltme.ts";
import { bicimlendirmeSaglayici } from "./bicimlendir.ts";
import { girintiKaydi } from "./girinti.ts";
import { camKaydi } from "./cam.ts";   // 🪟 cam efekti (Founder 2026-07-18)
import { atifDekorKaydi } from "./atif-dekor.ts";   // NTK-A01: çözülen atıflar link görünümü alır
import { gorselEsadKaydi } from "./gorsel-esad.ts"; // CDL-A08: İngilizce kaynak-içi görsel tip eşadları
import { eksenDekorKaydi } from "./simge-cizelgesi.ts"; // VIT-KIMLIK-A06: eksen tip satırlarına geometrik simge
import { onayKuyruguKaydi, onayYuzeyiOlcumleri } from "./onay-kuyrugu.ts"; // NTK-A08: Founder karar gelen-kutusu
// 📬 VIT-POSTA-A03: ana tanı turunun anlık görüntüsü onay tarayıcısına AKTARILIR;
// kapıyı ana hat değil tarayıcı tanır. eklenti.ts kapı bilmez, yalnız ağacı taşır.
import { anaGoruntuyuBildir, anaHattiSustur, tarayiciOlcumleri } from "./onay-tarayici.ts";
import { dallarKaydi } from "./dallar.ts";
import { satiriciKaydi } from "./satirici.ts";
import { onizlemeKaydi } from "./onizleme.ts";
import { yolHaritasiKaydi, projeKimligi } from "./yolharitasi.ts";
import { hatirlaticilarKaydi, type Hatirlaticilar } from "./hatirlaticilar.ts";   // 🔔 YUZ-3.3 ikinci yüzey
import { fikirlerKaydi, type Fikirler } from "./fikirler.ts";                    // 💡 VIT-GRAF-A16 Fikirler yüzeyi
import { bildirimlerKaydi, type Bildirimler } from "./bildirimler.ts";           // 🛈 YUZ-3.3 üçüncü yüzey
import { postaKutusuKaydi, type PostaKutusu } from "./posta-kutusu.ts";         // 📬 VIT-POSTA-A01 dördüncü yüzey
// 📊 VIT-GRAF-A13: dört yüzeyin durum çubuğu sayaçları. Sayıları TÜRETİR,
// ikinci bir sayaç tutmaz — panellerle ayrışması yapısal olarak imkânsızdır.
import { DurumCubugu } from "./durum-cubugu.ts";
// 🪧 EKL-F6-A04: kanon bulunamadığında taban kanona düşüldüğü SÖYLENİR.
import { TabanKanonCubugu } from "./taban-kanon.ts";
import {
  yuzeyeAyir, YuzeyDefteri, sayaclariOlayaBagla, meyveKokleri,
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
import { PerformansMercegi } from "./performans.ts";     // 🔬 PRF-A01: izleyici olay + denetim süre merceği
import { gurultuMu, sarGurultuMu, TARAMA_DISLAMA_GLOB, OlayHatti, TekUcusKilidi } from "./izleyici-cekirdek.ts";   // 🧯 PRF-A02 (+RED-1): olay hattı + tek-kaynak kapsam + kilit
import { dilAyariDegistiMi, etkinDil } from "./dil.ts";
import { sozDizimTanisi, taniDilineCevir } from "../../cekirdek/src/tani-metinleri.ts";
import {
  EKLENTI_KABUK_METINLERI,
  IZ_METINLERI,
  iskeletKuruldu,
  iskeletSozDizimHatasi,
  panelOdakMesaji,
  panoyaYazildi,
  panoyaKopyalanacakSatirYok,
  yuzeyDiliniAyarla,
} from "./yuzey-metinleri.ts";

let koleksiyon: vscode.DiagnosticCollection;
let durumCubugu: DurumCubugu | undefined;

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

// ── 📬 VIT-POSTA-A01 DÖRDÜNCÜ YÜZEY: POSTA KUTUSU ────────────────────────────
//   Founder onayı bekleyen kapılar. Bu yüzey motorun tanı akışından beslenmez;
//   onay tarayıcısından beslenir ve bu yüzden yüzey defterine bağlanmaz. Kayıt
//   noktası yine burasıdır: panel etkinleşmede TAM BİR KEZ kurulur ve onay
//   kuyruğuna verilir; kuyruk kendi nabzıyla (kaydetme · geciktirmeli yazım
//   turu · disk izleyicisi) paneli tazeler. İkinci bir zamanlayıcı kurulmaz.
let postaKutusu: PostaKutusu | undefined;
let yolHaritasiYuzeyi: { diliTazele(): void } | undefined;

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
  postaKapilari(): { dosya: string; kod: string }[];
}

export function activate(context: vscode.ExtensionContext): SarmalEklentiYuzu {
  yuzeyDiliniAyarla(etkinDil());
  koleksiyon = vscode.languages.createDiagnosticCollection("sarmal");
  context.subscriptions.push(koleksiyon);

  // Kenar çubuğunun yüzeyleri eklenti etkinleşmesinde TAM BİR KEZ kaydedilir;
  // görünümleri context.subscriptions üstünden kapanışta serbest bırakılır.
  hatirlaticilar = hatirlaticilarKaydi(context);
  fikirler = fikirlerKaydi(context);
  bildirimler = bildirimlerKaydi(context);
  postaKutusu = postaKutusuKaydi(context);
  // 📋 VIT-GRAF-A13: ağaç panellerinin satırı sağ tık menüsünden panoya iner.
  // Founder'ın cümlesi şudur: "hatırlatıcı ve bildirim metinlerini
  // kopyalayamıyorum." Ağaç görünüşlerinde metin seçilemez; kopyalama ancak bir
  // komutla olur. KOMUT TEKTİR, çünkü VS Code satırın hangi panelden geldiğini
  // söylemez: metin kararını üç sağlayıcı da AYNI saf çekirdekten alır ve komut
  // yalnız panoya yazar. Metin bulunamazsa hiçbir şey yazılmaz ve sebep söylenir.
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
    kapı: () => postaKutusu?.kapiSayisi ?? 0,
  });
  context.subscriptions.push(durumCubugu);
  // 🔗 Panel ile durum çubuğu AYNI OLAYDAN beslenir. Ölçülmüş kusur (KUSUR-DURUM-ÇUBUĞU):
  // Onaylar değiştiğinde durum çubuğu tazelenmiyordu ve kullanıcı panelde
  // on dört kapı varken durum çubuğunda sıfır görebiliyordu. İKİNCİ BİR SAYAÇ,
  // TARAMA YA DA ÇİZELGE KURULMAZ: sayı yine panelin kendi defterinden türer
  // (`postaKutusu.kapiSayisi`), yalnız tazeleme aynı ağaç olayına bağlanır.
  context.subscriptions.push(sayaclariOlayaBagla(
    (dinleyici) => postaKutusu!.onDegisti(dinleyici),
    () => durumCubugu?.tazele(),
  ));
  durumCubugu.tazele();

  // 🪧 EKL-F6-A04: taban kanon işareti. Kendi taraması ve kendi sayacı yoktur;
  // yalnız `ortak.ts` içindeki keşfin verdiği kararı aynalar ve kanon
  // bulunduğunda kendiliğinden gizlenir.
  context.subscriptions.push(new TabanKanonCubugu());

  // 🔬 PRF-A01 ölçüm merceği: hangi izleyici kaç olay üretti, tam-proje denetimi
  // kaç ms sürdü — SRN-IDE-KASMA-SOL-KOSUSU tanısı bu kanaldan okunur. Sayaç
  // artırımı sabit-zamanlı; kanal yazımı YALNIZ denetim turu sonunda (tek satır).
  const perfKanal = vscode.window.createOutputChannel(EKLENTI_KABUK_METINLERI.performansKanali);
  context.subscriptions.push(perfKanal);
  const mercek = new PerformansMercegi((s) => perfKanal.appendLine(s));

  const denetimAcik = (): boolean =>
    vscode.workspace.getConfiguration("sarmal").get<boolean>("denetim", true);

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
    yuzeylereDagit(doc, [...tanilaCekirdek(doc), ...cross]);   // MIM-1.1 ②: yayın aktif-varlık süzgecinden geçer
  };

  // DİSKTEKİ .sar — çalışma alanı geneli tarama + ORK-1.2 CROSS-FILE DAG döngü denetimi:
  // tüm .sar'lar TEK grafa girer; döngüsel-bağımlılık (dosyalar arası olabilir)
  // Problems'te ilgili dosyada görünür. Tek-dosya `tanila` cross-file'ı göremezdi.
  const denetleHepsi = async (tetik = "?"): Promise<void> => {
    // Denetim kapalıyken üç yüzey de susar — biri açık kalıp bayat kayıt gösteremez.
    // 📬 VIT-POSTA-A03: onay yüzeyi bu turun görüntüsünü bekler; hat susacaksa
    // bunu AÇIKÇA söylemek zorundadır, yoksa Onaylar sonsuza dek boş kalır.
    if (!denetimAcik()) {
      koleksiyon.clear(); taniDefteri.clear(); yuzeyDefteri.temizle();
      fikirDefteri.temizle();   // 💡 KYN-YUZ-A01: Fikir hanesi de susar — bayat kayıt kalmaz
      anaHattiSustur();
      return;
    }
    const turBasi = Date.now();   // 🔬 PRF-A01: tur süresi mercekten okunur
    // arsiv/ + ornek/ + fikstur/ hariç: ürün değil, kasıtlı drift → paneli kirletmesin.
    // RED-1 D1: dışlama globu izleyici süzgeciyle TEK KAYNAKTAN (izleyici-cekirdek)
    // hizalı — dist/out/gizli-dizin .sar'ları ne taranır ne olayları süzülmeden kalır;
    // çekirdek YOKSAY kanonuyla da aynı evren (denetci.ts disk yürüyüşü onlara inmez).
    const dosyalar = await vscode.workspace.findFiles("**/*.sar", TARAMA_DISLAMA_GLOB);
    const programlar = new Map<string, Program>();
    const doclar = new Map<string, vscode.TextDocument>();
    for (const uri of dosyalar) {
      try {
        const doc = await vscode.workspace.openTextDocument(uri);
        if (doc.languageId !== "sarmal") continue;
        doclar.set(uri.fsPath, doc);
        const program = programAl(doc);   // EKL-F9-A06: editör süsleriyle AYNI önbellek
        if (program) programlar.set(uri.fsPath, program);
      } catch { /* söz-dizim kırık: tanila tek-dosyada yakalar, DAG'a girmez */ }
    }
    // 🕰️ MIM-1.2 ③ (zaman-ekseni turu): mevsim çevrimi TANI turunda da koşar — Blok'un `mevsim:`
    // kenarı sanal çağır'a normalize edilmeden hiyerarsiTanilari fazsız-blok basardı
    // (Founder saha bulgusu 2026-07-19: panel yolu çevrimliydi, tanı yolu çevrimsiz
    // kalmıştı — CLI temiz, Problems kirli). Çevrim MOTORDA tek nokta (DIL-2); idempotent.
    mevsimNormalize(programlar);
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
    for (const kok of vscode.workspace.workspaceFolders ?? []) {
      try {
        const kokYol = kok.uri.fsPath;
        const koklar = (vscode.workspace.workspaceFolders ?? []).map((k) => k.uri.fsPath);
        const snfYol = varlikDosyasiBul(kokYol, join("oz", "siniflama", "kayit.json"), koklar);
        if (!snfYol) continue;   // taban kanon bu kökte bulunamadı → tam-orkestrasyon anlamsız (gömülü kanona düşülür, canlı tanı akışı bozulmaz)
        const sonuc = denetimKos(kokYol, { snfYol, bugun, tamListe: true });
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
      } catch { /* tam orkestrasyon çökerse canlı tanı akışı ASLA bozulmaz (blast-radius sıfır) */ }
    }
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
      if (doc.getText().split("\n", 5).some((s) => BILEREK_HATALI.test(s))) { taniSil(doc.uri, false); continue; }
      const capraz = donguHar.get(fsPath) ?? [];
      caprazOnbellek.set(fsPath, capraz);   // SRN-PANEL-DALGA: tek-dosya yolu düzenlemede bunları da yayınlar
      // Üçüncü argüman YAYINI KAPATIR. Tam tarama yüzlerce belge gezer; her belgede
      // çizim tetiklenseydi Bildirimler paneli tur başına onlarca kez yeniden
      // çizilirdi. Turun tek yayını aşağıda, döngü bittikten sonra yapılır.
      yuzeylereDagit(doc, [...tanilaCekirdek(doc), ...capraz], false);   // MIM-1.1 ②
    }
    // Bu turda görülmeyen (kapanmış/dışlanmış) dosyaların bayat çapraz önbelleği
    // temizlenir — silinen tanı düzenlemede geri gelmesin.
    for (const yol of [...caprazOnbellek.keys()]) if (!doclar.has(yol)) caprazOnbellek.delete(yol);
    yuzeyDefteri.buda(new Set(doclar.keys()));
    yuzeyDefteri.yayımla();   // turun TEK yayını
    // 💡 KYN-YUZ-A01: Fikir hanesi aynı budama ve aynı tek-yayın disiplinini
    // izler; kapanan ya da kapsam dışına çıkan dosyanın Fikirleri panelde
    // hayalet olarak kalmaz ve tur başına yalnız bir çizim istenir.
    fikirDefteri.buda(new Set(doclar.keys()));
    fikirDefteri.yayımla();
    // 📬 VIT-POSTA-A03: onay kapıları bu turun ZATEN ürettiği ağaçtan çıkar. Ana
    // hat kapı TANIMAZ ve kapı listesi kurmaz; yalnız ortak ayrıştırma sonucunu
    // taşır. Böylece onay yüzeyinin ikinci bir tam turu, ikinci bir dosya okuması
    // ve ikinci bir ayrıştırması kalmaz — ölçülen maliyet açılışta iki yüz doksan
    // sekiz `openTextDocument` çağrısıydı ve bu bildirimle sıfıra iner.
    anaGoruntuyuBildir(programlar);
    mercek.turBitti({ tetik, süreMs: Date.now() - turBasi, dosyaSayısı: dosyalar.length });   // 🔬 PRF-A01
  };
  // 🧯 PRF-A02 tek-uçuş kilidi: tam-proje denetimi ÜST ÜSTE BİNMEZ — koşarken
  // gelen istekler tek bayrağa iner (mercek 'atlanan' sayar), tur bitince bir
  // telafi turu koşulur. Sol'un olay salkımlarında taramaların üst üste binip
  // IDE'yi kastığı şüphesinin (SRN-IDE-KASMA-SOL-KOSUSU) yapısal onarımı.
  const denetimKilidi = new TekUcusKilidi(denetleHepsi, () => mercek.atlandı(),
    // RED-1 R1: çöken tur sessiz yutulmaz — kanala düşer (kilit yine asılı kalmaz).
    (h) => perfKanal.appendLine(IZ_METINLERI.denetimCoktu(h instanceof Error ? h.message : String(h))));

  aktifVarligiGuncelle(vscode.window.activeTextEditor);   // MIM-1.1 ②: açılış odağı aktif dosyadan
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
    iste: (tetik) => denetimKilidi.iste(tetik),
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
    iste: (tetik) => denetimKilidi.iste(tetik),
    suzuldu: () => mercek.süzüldü(),
    olay: () => mercek.olayGeldi("sar"),
    ertelendi: () => mercek.ertelendi(),
  });
  const goreliYol = (u: vscode.Uri): string => vscode.workspace.asRelativePath(u, false);
  const diskDegisti = (u: vscode.Uri): void => diskHatti.olay(goreliYol(u), "disk-olayı");
  const sarDegisti = (u: vscode.Uri): void => sarHatti.olay(goreliYol(u), "sar-olayı");
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
    // Ayar değişince tüm çalışma-alanını yeniden değerlendir.
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("sarmal.denetim")) denetimKilidi.iste("ayar");
      if (e.affectsConfiguration("sarmal.aktifVarlikOdagi")) hepsiniYenidenYayinla();   // MIM-1.1 ③
      if (dilAyariDegistiMi(e)) {
        yuzeyDiliniAyarla(etkinDil());
        hatirlaticilar?.diliTazele();
        fikirler?.diliTazele();
        bildirimler?.diliTazele();
        postaKutusu?.diliTazele();
        yolHaritasiYuzeyi?.diliTazele();
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
  gorselEsadKaydi(context, vscode, etkinDil, dilAyariDegistiMi);
  // 🎨 VIT-KIMLIK-A06 (Founder hükmü 2026-08-04): geometrik simge ailesi kaynak
  // dosyanın İÇİNDE de konuşur — altı eksen tipinin bildirim satırı tip adının
  // solunda simgesini taşır; yollar simge-cizelgesi.ts'den, dosyaya bayt yazılmaz.
  eksenDekorKaydi(context, vscode);
  onayKuyruguKaydi(context, postaKutusu, odakKapisi);   // 📬 nabız + 🔭 odak kapsamı

  // Ağaç kılavuz çizgileri (kesintisiz dikey + ├└ dallar + kapanış etiketi)
  dallarKaydi(context, dilAyariDegistiMi);

  // Önizleme (MD önizlemesi gibi — ⇧⌘V / başlık çubuğu ikonu)
  onizlemeKaydi(context);
  kuzeyYildiziKaydi(context);   // 🌟 kalp atışlı Kuzey Yıldızı (Founder 14:21)
  takdirKaydi(context);         // 💛 Founder takdir kalbi (Founder 14:30)

  // 🚂 Yol Haritası paneli (EKL-F7): plan ağacı kutucuklu kendi evinde
  yolHaritasiYuzeyi = yolHaritasiKaydi(context, (s) => perfKanal.appendLine(s), odakKapisi, meyveKapisi);   // 🗺️ PRF-A04: panel turları da kanala düşer · 🔭 mini graf odağı · 🍎 meyve kapısı

  // 🎨 Çalışma Alanını Giydir (BKM-SNV2-A03): dış projede görünüm paritesi —
  // imzasız çalışma alanında bir kez sorar; bizim repo imzalı olduğundan sessiz.
  giydirKaydi(context);

  console.log(IZ_METINLERI.eklentiEtkin);

  return {
    yuzeyKayitlari: () => yuzeyDefteri.gorunenler(),
    onayOlcumleri: () => ({ ...onayYuzeyiOlcumleri(), ...tarayiciOlcumleri() }),
    postaKapilari: () => postaKutusu?.kapiKodlari() ?? [],
  };
}

export function deactivate(): void {
  koleksiyon?.dispose();
  // Yüzeyler birlikte kapanır: görünümleri context.subscriptions serbest bırakır,
  // buradaki tutamaklar da bırakılır ki kapanmış bir görünüme yayın denenmesin.
  hatirlaticilar = undefined;
  fikirler = undefined;       // 💡 VIT-GRAF-A16: kapanmış görünüşe Fikir basılmasın
  bildirimler = undefined;
  postaKutusu = undefined;       // kapanmış görünüme kapı yazılmasın
  odakDinleyicileri.length = 0;  // kapanmış görünüme odak haberi gitmesin
  yuzeyDefteri.temizle(false);   // tutamaklar bırakıldı; kapanışta çizim istenmez
  fikirDefteri.temizle(false);   // 💡 KYN-YUZ-A01: Fikir hanesi de sessizce boşalır
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

/**
 * Bir .sar belgesini denetler → motorun KANONİK tanı nesneleri. Eskiden bu
 * işlev doğrudan editör tanısı üretiyordu; artık ham tanıyı döndürüyor, çünkü
 * yüzey yönlendirmesi kaydın düzeyini ve kimliğini görmek zorundadır ve dönüşüm
 * yalnız yayın sınırında (taniYapTani) yapılır. Böylece düzey eşlemesi de tek
 * yerde kaldı: tek-dosya yolu ile proje taraması artık aynı kodu koşuyor.
 */
function tanilaCekirdek(doc: vscode.TextDocument): Tani[] {
  const dil = etkinDil();
  const metin = doc.getText();

  let program;
  try {
    program = ayristir(belirtecle(metin));
  } catch (e) {
    if (e instanceof SozDizimHatasi) {
      return [sozDizimTanisi(e)];
    }
    throw e;
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
  doc: vscode.TextDocument, tanilar: readonly Tani[], yayımlansın = true,
): void {
  const proje = projeKimligi(doc.uri.fsPath);
  const dil = etkinDil();
  const kayitlar: YuzeyKaydi[] = tanilar.map((tani) => ({
    proje, dosya: doc.uri.fsPath, tani: taniDilineCevir(tani, dil),
  }));
  const dagilim = yuzeyeAyir(kayitlar);
  taniYayinla(doc.uri, dagilim.problems.map((k) => taniYapTani(doc, k.tani)));
  yuzeyDefteri.yaz(
    doc.uri.fsPath, [...dagilim.hatırlatıcılar, ...dagilim.bildirimler], yayımlansın,
  );
  // 💡 KYN-YUZ-A01 · VIT-GRAF-A16: Fikirler paneli AYNI dağıtım noktasından
  // beslenir ve hane kendi görünüşüne taşınırken bu yol hiç değişmedi. Kayıtlar
  // paylaşılan AST önbelleğinden okunur; yol hem tek-dosya düzenlemesini hem
  // toplu taramayı kapsar, dolayısıyla kullanıcı bir Fikir yazdığı an panelde
  // belirir ve sildiği an düşer. Belge ayrıştırılamıyorsa o dosyanın Fikirleri
  // defterden düşer — Hatırlatıcı hanesinin bozuk belgede yaptığının aynısı.
  const fikirProgrami = programAl(doc);
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

function taniYayinla(uri: vscode.Uri, tanilar: vscode.Diagnostic[]): void {
  taniDefteri.set(uri.fsPath, { uri, tanilar });
  if (panelDeGorunur(uri.fsPath)) koleksiyon.set(uri, tanilar);
  else koleksiyon.delete(uri);
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
  for (const { uri, tanilar } of taniDefteri.values()) {
    if (panelDeGorunur(uri.fsPath)) koleksiyon.set(uri, tanilar);
    else koleksiyon.delete(uri);
  }
  yuzeyDefteri.yayımla();
  fikirDefteri.yayımla();   // 💡 KYN-YUZ-A01: Fikir hanesi de odakla birlikte yeniden basılır
  for (const dinleyici of odakDinleyicileri) dinleyici();
}

function aktifVarligiGuncelle(editor: vscode.TextEditor | undefined): void {
  if (!editor || editor.document.uri.scheme !== "file") return;   // yapışkan: panel boşalmaz
  const kok = varlikKoku(editor.document.uri.fsPath);
  if (!kok || kok === aktifVarlik) return;                        // köksüz → yapışkan
  aktifVarlik = kok;
  hepsiniYenidenYayinla();
}

// ── 🗂️ EKL-F11-A01: kimlik indeksi beslemesi ────────────────────────────────
// Kapsam (INDEKS_DISI · indeks.ts) denetleHepsi ile AYNI dünya görüşü: kasıtlı
// drift malzemesi indeksi kirletmez. Varlık SINIRI burada çizilmez — indeks her
// varlığı tutar, gezinme sorguları (A02) aktif-varlık süzgeciyle daraltır.
async function indeksDosyaTazele(uri: vscode.Uri): Promise<void> {
  if (uri.scheme !== "file" || INDEKS_DISI.test(uri.fsPath)) return;
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
    "**/{arsiv,ornek,node_modules,fikstur,sablon,dist,dist-sinama,.*}/**");
  await Promise.all(dosyalar.map(indeksDosyaTazele));
}

/** Bir çekirdek Tani'sini (satır·sütun·mesaj·öneri·düzey·kod) vscode tanısına
 *  çevirir — TEK yer (proje taraması ve tek-dosya çapraz-önbellek aynı eşlemeyi
 *  kullanır, düzey/renk tutarsızlığı yapısal olarak imkânsız · SRN-PANEL-DALGA). */
function taniYapTani(doc: vscode.TextDocument, t: Tani): vscode.Diagnostic {
  return taniYap(doc, t.satir, t.sutun, t.oneri ? `${t.mesaj}\n↳ ${t.oneri}` : t.mesaj,
    t.duzey === "hata" ? vscode.DiagnosticSeverity.Error
      : t.duzey === "uyarı" ? vscode.DiagnosticSeverity.Warning
        : vscode.DiagnosticSeverity.Information, t.kod);
}

/** (satır,sütun) 1-tabanlı konumdan, oradaki sözceyi kapsayan bir tanı üretir. */
function taniYap(
  doc: vscode.TextDocument,
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

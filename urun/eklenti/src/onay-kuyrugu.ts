// ═══════════════════════════════════════════════════════════════════════════
// onay-kuyrugu.ts — 🧭 ETKİN KARAR YÜZEYİ (NTK-A08 · VIT-POSTA-A03)
//
//   Founder onayı bekleyen tasarım kapıları dosyalara dağılmaktadır. Bu modül
//   onların KARARINI yazar; listelemeyi Onaylar paneli yapar. Karar, Adım'a
//   `onay:` parametresi olarak işlenir — kayıt sahibinin altında yaşar (STR-4),
//   yüzey yalnız giriş ve görünüm katmanıdır. Geribildirim akışından
//   (takdir.ts) ayrı denetleyici kullanır — iki kuyruk birbirine karışmaz.
//
//   İKİ İŞLEVSEL YÜZEY VARDIR (Founder canlı bulgusu 2026-07-28: "Açıklamalar
//   paneli ile Onaylar aynı on bir kapıyı gösteriyor").
//     ① POSTA KUTUSU, çalışma alanındaki bütün açık kapıların TEK KALICI
//        KUYRUĞUDUR: sayılır, dosyaya göre gruplanır, göz gezdirilir.
//     ② COMMENTS iş parçacığı, yalnız kullanıcının seçtiği TEK kapının ETKİN
//        KARAR YÜZEYİDİR. Ancak kullanıcı o kapıyı açtığında yaratılır ve aynı
//        anda EN FAZLA BİR tane yaşar.
//   Komut paleti ile kod merceği bu iki yüzeye giden KISAYOLLARDIR; ikisi de
//   kendi karar arayüzünü açmaz.
//
//   EMEKLİ EDİLEN KARARIN KAYDI. Bu dosyada 0.9.74'ten beri şu hüküm yazılıydı:
//   "ESAS YÜZEY seçim listesidir — VS Code 1.128 Comments arayüzünü hiç
//   çizmedi." O hüküm bir OLAĞANÜSTÜ DURUM önlemiydi ve o gün doğruydu. VS Code
//   pencereleri yeniden çizdiğinde önlem emekliye ayrılmadı; üstüne Posta
//   Kutusu paneli eklendi ve kullanıcı aynı kuyruğu iki panelde görmeye başladı.
//   Kusur bir ihmal değil, emekli edilmemiş bir kararın kalıntısıydı. Seçim
//   listesi yolu bu turda kaldırıldı: `kararSor` artık yoktur ve hiçbir giriş
//   noktası ikinci bir karar arayüzü açmaz.
//
//   KARAR MANTIĞI DEĞİŞMEDİ. Tek yazıcı `kaydiIsle` olarak kalır; `onay:` kayıt
//   biçimi, damgalar, tarih ve not ekleme davranışı aynıdır ve diskte yazılmış
//   eski kayıtlar okunmaya devam eder. Değişen tek şey yüzeylerin ROLÜDÜR.
// ═══════════════════════════════════════════════════════════════════════════

import * as vscode from "vscode";
import { rozetRenkleri } from "./ortak.ts";           // terfi sarısı — onay-bekleyen nabzının rengi (kanondan)
import { nabizAbone, geciktir } from "./nabiz.ts";    // EKL-F9-A07/A08: tek kalp + tek geciktirici
// SAF karar mantığı — fikstürlü testte (NTK-A08 · VIT-POSTA-A03). "Aynı anda en
// fazla bir karar yüzeyi" sözleşmesi de saf defterde yaşar ve nöbet onu koşturur.
import {
  UcusDefteri, EtkinKararDefteri, kararIsle, kapiCoz, dosyaAdiniAl,
  acikBelgeleriUstuneYaz,
  type OnayKapisi, type KapiKaydi, type YazimKabugu, type CatismaSecimi,
  type KararSonucu, type SatirAraligi,
} from "./onay-cekirdek.ts";
// ⏸️ Karar yazımı belge biçimlemez: yazıcının kendi kaydetmesi süresince
// biçimlendirici YALNIZ o belge için askıya alınır (ölçülmüş Kusur 1).
import { bicimAskisi } from "./bicimlendir.ts";
// 📬 VIT-POSTA-A01: kapı listesini üreten TEK göz. Kapsam süzgeci de burada tek
// evrendedir — eskiden bu dosyada tarama globunun yanında ELLE yazılmış ikinci
// bir düzenli ifade yaşıyordu ve ikisi ayrışmıştı (RED-2 dersi).
import {
  calismaAlaniniTara, kuyrukBelgesiMi, belgeKapilari, kapsamDisi,
  anaGoruntuDegisti, anaGoruntuHazirMi,
  belgeKapilariOkumasi, belgeKodAdedi, belgeOnayKaniti, disktenOnayKaniti,
} from "./onay-tarayici.ts";
import type { PostaKutusu } from "./posta-kutusu.ts";
import type { OdakKapisi } from "./minigraf.ts";   // 🔭 kapsam süzgeci TEK evden okunur

/** Odak kapısı verilmediğinde kuyruk bütün çalışma alanını gösterir (sınama yolu). */
const ONAY_TUM_KAPSAM: OdakKapisi = {
  kapsamda: () => true,
  degisince: () => { /* olay yok */ },
};
import { GORUNUS_POSTA_KUTUSU, DENETLEYICI_ONAY, KOMUT_POSTA_KUTUSU } from "./yuzey-cekirdek.ts";
import {
  etkinKararAdi, CATISMA_SECENEKLERI, commentsEmekli,
  gerekceZorunlu, gerekceArtik,
  kirliBelgeSorusu, kararUcusta, kararKapiYok, kararKimlikCakismasi,
  kararUygulanamadi, kararKaydedilemedi, kararBellekUyusmazligi,
  kararDiskUyusmazligi, kararBasarili, kararIptalEdildi,
  kararBelgeAyrisilamadi, kararEklemeNoktasiDogrulanamadi, kararBeklerKaldirilamadi,
  EKLENTI_KABUK_METINLERI, IZ_METINLERI, ONAY_YUZEY_METINLERI,
} from "./yuzey-metinleri.ts";
// 🧾 Gerekçe ölçüsü SAF gövdededir; panel ile komut sınırı AYNI kuralı kullanır.
// İki ayrı yerde iki kural yazılsaydı biri ötekinden ayrışır ve vaat ile davranış
// yine ikiye bölünürdü (RED-2 dersi).
import { gerekceyiOlc } from "./posta-govde.ts";

/** Karar seçenekleri — komut kimliği + yazılan damga. */
const SECENEKLER = [
  { komut: "sarmal.onayVer",    damga: "onaylandı" },
  { komut: "sarmal.onaySerhle", damga: "şerhle onaylandı" },
  { komut: "sarmal.onayReddet", damga: "reddedildi" },
] as const;

type OnayNoktasi = OnayKapisi;

/** Belgede onay bekleyen Adımlar — tarayıcının belge kapısıyla AYNI işlev. */
const noktalariTopla = (doc: vscode.TextDocument): OnayNoktasi[] => belgeKapilari(doc);

/**
 * 📏 ONAY YÜZEYİNİN ÖLÇÜMLERİ (VIT-POSTA-A03 kabul ölçütleri).
 *
 * Kabul metni "etkinleşmeden sonra canlı iş parçacığı sayısı sıfırdır" ve
 * "açılışta doğrudan açılan belge sayısı sıfırdır" diyor. İddiayı ölçülebilir
 * kılmak için sayaçlar üretimin İÇİNDE yaşar; eklenti dış yüzü (`activate`
 * dönüşü) onları okutur ve gerçek editör kabuğunda koşan nöbet oradan sayar.
 * Modül düzeyinde durmalarının nedeni, eklentinin bir kez etkinleşmesi ve
 * ölçümün etkinleşmenin kendisini kapsamak zorunda olmasıdır.
 */
const olcum = {
  canliIsParcacigi: 0,
  /** Bu modülün BUGÜNE KADAR açtığı belge sayısı (her sebepten). */
  acilanBelge: 0,
  /**
   * Bunların kaçı SOMUT BİR OLAY yüzünden açıldı: disk izleyicisinin bildirdiği
   * bir dosya değişikliği ya da kullanıcının tıkladığı bir kapı. Ayrım kabul
   * ölçütünü ölçülebilir kılan şeydir.
   *
   * Kabul metni "onay yüzeyinin açılışta doğrudan açtığı belge sayısı sıfırdır"
   * diyor ve doğru ölçü NEDENSELDİR, zamansal değil. Zamansal pencere yanıltır:
   * aynı editör kabuğunda koşan komşu nöbetler geçici `.sar` dosyaları yaratır,
   * disk izleyicisi onları meşru biçimde okur ve ölçüm kirlenir. Buradaki
   * sözleşme şudur: bu modülün açtığı HER belge ya bir dosya olayına ya bir
   * kullanıcı eylemine bağlıdır; hiçbiri etkinleşmenin ya da tam yerleşimin
   * kendisine bağlı DEĞİLDİR. Eskiden değildi — açılış kapsam içi her `.sar`
   * dosyasını açıyordu ve ölçülen maliyet iki yüz doksan sekiz belgeydi.
   */
  olaydanAcilanBelge: 0,
  /** İlk yerleşim anında dondurulan iki sayaç (-1: açılış daha bitmedi). */
  acilistaAcilanBelge: -1,
  acilistaOlaydanAcilanBelge: -1,
  yerlestirmeTuru: 0,
  /**
   * Son tam yerleşimde Onaylar paneline inen kapı sayısı. Nöbetin BOŞ KÜME
   * üstünde koşmasını engelleyen ölçü budur: "hiçbir belge açılmadı" cümlesi
   * kuyruk zaten boşken bedavadır ve hiçbir şey kanıtlamaz.
   */
  sonYerlesenKapi: 0,
  /** Bu oturumda Onaylar paneline HİÇ kapı indi mi? Boş küme nöbeti bunu okur. */
  kapiGorulduMu: false,
  /**
   * GERÇEKTEN yaratılan ve GERÇEKTEN elden çıkarılan Comments nesnesi sayısı.
   * `canliIsParcacigi` defterin kendi kaydıdır ve defter yanılırsa onunla
   * birlikte yanılır; bu iki sayaç ise VS Code nesnesinin yaşam döngüsüne
   * doğrudan bağlıdır — ikincisi `dispose` çağrısının İÇİNDE artar. Sözleşme
   * şudur: yaratılan eksi elden çıkarılan, her an canlı sayıya eşittir. Sızan
   * bir iş parçacığı ancak bu farkta görünür.
   */
  yaratilanYuzey: 0,
  eldenCikarilanYuzey: 0,
};

/** Onay yüzeyinin bugünkü sayaçları — nöbet bu kapıdan okur. */
export function onayYuzeyiOlcumleri(): Readonly<typeof olcum> {
  return { ...olcum };
}

/**
 * @param postaKutusu Onaylar paneli (VIT-POSTA-A01) — kapıların tek kalıcı
 *   kuyruğu. Verilmezse yalnız etkin karar yüzeyi ve kod merceği yaşar; panel
 *   kendi taramasını KURMAZ, bu modülün nabzından beslenir.
 */
export function onayKuyruguKaydi(
  baglam: vscode.ExtensionContext, postaKutusu?: PostaKutusu,
  odak: OdakKapisi = ONAY_TUM_KAPSAM,
): void {
  // Kimlik DEĞİŞMEZ (kullanıcının Açıklamalar menü koşulları ona bağlıdır);
  // kullanıcıya görünen ad ise yeni rolü söyler: burası kuyruk değil, karar yeri.
  const kutu = vscode.comments.createCommentController(DENETLEYICI_ONAY, etkinKararAdi());
  // VS Code, bir denetleyicinin hangi belgelerde yaşadığını bu sağlayıcıdan öğrenir.
  // Sağlayıcı yoksa iş parçacığı YARATILIR ve Açıklamalar panelinde görünür, fakat
  // editör içinde çizilmeyebilir — Founder canlı bulgusu 2026-07-29 tam olarak budur:
  // iz "pencere KURULDU" diyor, ekranda pencere yok. Aralık listesi BOŞ dönüyor,
  // çünkü kullanıcı kendi başına yorum AÇAMAZ; kapıyı yalnız motor doğurur. Boş liste
  // yeni yorum kutusunu kapalı tutar ama belgeyi denetleyicinin kapsamına sokar.
  kutu.commentingRangeProvider = {
    provideCommentingRanges: (doc) => (kuyrukBelgesiMi(doc) ? [] : undefined),
  };

  /**
   * 🔍 KARAR YÜZEYİ İZİ. Founder canlı görünümde şunu bildirdi (2026-07-29):
   * "düğmeler görünüyor ama karar penceresi açılmıyor". Kusur birim süitinden
   * görünmez, çünkü Comments arayüzü ancak gerçek editör kabuğunda çizilir.
   *
   * İZ KALICIDIR, geçici hata ayıklama değildir. Gerekçesi şudur: bu akış dört
   * halkadan geçer — belge açılır, kapı bulunur, editör gösterilir, pencere
   * kurulur — ve halkalardan biri sessizce durduğunda kullanıcı yalnız "olmuyor"
   * görür. Sessiz durma bu depoda yasaktır; her halka nerede olduğunu söyler.
   */
  const iz = vscode.window.createOutputChannel(EKLENTI_KABUK_METINLERI.kararYuzeyiKanali);
  const izYaz = (satir: string): void => {
    iz.appendLine(`${new Date().toISOString().slice(11, 19)} · ${satir}`);
  };
  // AÇILIŞ İZİ: kanal ancak ilk yazımda Çıktı listesinde belirir. Burada bir kez
  // yazılması, "kanal boş" ile "modül hiç yüklenmedi" ayrımını mümkün kılar —
  // ikisi kullanıcı gözünde aynı görünür, oysa nedenleri bambaşkadır.
  izYaz(IZ_METINLERI.onayKuruldu);

  /**
   * 🪦 COMMENTS KARAR PENCERESİ GÖRÜNÜR AKIŞTAN EMEKLİYE AYRILDI (2026-07-29).
   *
   * Ölçüm (prob 5): "Kapıya git" satırından hemen sonra `canlı yüzey: 1` — yani
   * çizilmediği bilinen yüzey gerçekten yaratılıyordu. Sızıntı yoktu; kusur
   * kullanıcıyı ÖLÜ BİR YÜZEYE göndermekti. Kullanıcı dosyaya gidiyor, orada
   * boşluk buluyor, satırın üstündeki kod merceği ona "karar ver" diyor, tıklıyor
   * ve gene hiçbir şey görmüyordu.
   *
   * Denetleyici KİMLİĞİ (`sarmal-onay`) ve komut kimlikleri KORUNUR: kullanıcının
   * Açıklamalar menü koşulları onlara bağlıdır ve kimlik değişirse yerleşimi
   * sıfırlanır. Değişen tek şey, denetleyicinin artık GÖRÜNÜR KARAR NESNESİ
   * üretmemesidir. Sayaçlar bu sözleşmeyi ölçülebilir tutar: yaratılan yüzey
   * sayısı sıfırda kalır ve gerçek editör kabuğundaki nöbet onu okur.
   *
   * 🩹 ÖLÇÜM SABİT OLMAKTAN ÇIKTI (2026-08-08). Bu satır eskiden şuydu:
   * `olcum.canliIsParcacigi = 0`. Yani üç sayacın üçü de sabitti — canlı sayı
   * her tazelemede sıfıra ATANIYOR, yaratılan ve elden çıkarılan sayaçları ise
   * hiç artmıyordu. Dosyanın kendi yorumu "yaratılan eksi elden çıkarılan, her
   * an canlı sayıya eşittir; sızan bir iş parçacığı ancak bu farkta görünür"
   * diye bir sözleşme ilan ediyor, oysa o sözleşme kodda hiç kurulmamıştı.
   * Sabite bakan nöbet kırmızıya dönemez, dolayısıyla hiçbir şey ölçmez ve
   * yalnız sahte güven üretir. Üç sayaç artık saf defterden TÜRETİLİR; defter
   * bir yüzey açılıp kapanmadığında farkı büyütür ve ihlal sayıda görünür.
   */
  const etkinYuzey = new EtkinKararDefteri();
  const olcumuEsitle = (): void => {
    olcum.canliIsParcacigi = etkinYuzey.canliSayi;
    olcum.yaratilanYuzey = etkinYuzey.yaratilanSayi;
    olcum.eldenCikarilanYuzey = etkinYuzey.eldenCikarilanSayi;
  };

  /** Yalnız GERÇEK diskteki belgeler kuyruğa girer — ölçüt tarayıcıdadır (tek evren). */
  const gercekDosya = (doc: vscode.TextDocument): boolean => kuyrukBelgesiMi(doc);

  /**
   * Bir belgenin kapılarını tazeler: panel yeni gerçeğe oturur ve kararı verilmiş
   * kapının karar yüzeyi kapanır. Burada HİÇBİR yüzey toptan yaratılmaz — açılışta
   * on bir iş parçacığı açan eski davranışın kökü buydu.
   */
  const tazele = (doc: vscode.TextDocument | undefined): void => {
    if (!doc || !gercekDosya(doc)) return;
    const noktalar = noktalariTopla(doc);
    // Panel aynı turda tazelenir: ayrı bir tarama ya da zamanlayıcı kurulmaz.
    // Kapsam dışı dosyanın kapıları panele YAZILMAZ ve varsa düşürülür; süzgeç
    // öteki üç yüzeyle AYNI kapıdan okur (odakKapisi → panelDeGorunur).
    if (odak.kapsamda(doc.uri.fsPath)) {
      postaKutusu?.yerlestirDosya(doc.uri.fsPath, noktalar);
    } else {
      postaKutusu?.dusur(doc.uri.fsPath);
    }
    // Kararı verilen kapının etkin yüzeyi kendiliğinden düşer: defter yaşayan
    // kodları görür ve açık yüzey artık o kümede değilse kapatıcısını çağırır.
    etkinYuzey.dosyaTazelendi(doc.uri.fsPath, noktalar.map((n) => n.kod));
    olcumuEsitle();
  };

  /** Aynı kapıya iki kez yazılmasını yapısal olarak imkânsız kılan defter. */
  const ucuslar = new UcusDefteri();

  /** Kullanıcının YEREL takvim günü (TIP-1.12: UTC gecesi kararı düne yazıyordu). */
  const yerelGun = (): string => {
    const d = new Date();
    const iki = (n: number): string => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${iki(d.getMonth() + 1)}-${iki(d.getDate())}`;
  };

  /** Editör kabuğu: saf yazım hattının vscode'a bakan tek yüzü. */
  const yazimKabugu = (doc: vscode.TextDocument): YazimKabugu => {
    const dosyaAdi = dosyaAdiniAl(doc.uri.fsPath);
    // Geri alma için DOKUNULAN SATIRLARIN ÖNCEKİ METNİ tutulur. Eskiden yalnız
    // ekin konumu ile uzunluğu saklanırdı; düzenleme tek bir ekleme olduğu sürece
    // bu yeterliydi, oysa artık aynı turda bir silme de yapılabiliyor ve iki
    // işlemden sonra kaydedilmiş konumlar kaymış olur. Satırın önceki metnini
    // olduğu gibi geri yazmak konum aritmetiği istemez; kullanıcının dosyası
    // karar öncesindeki hâline bayt birebir döner.
    let geriYukleme: readonly { satir: number; metin: string }[] | undefined;
    return {
      kirliMi: () => doc.isDirty,
      async catismaSor(kod: string): Promise<CatismaSecimi> {
        const secim = await vscode.window.showWarningMessage(
          kirliBelgeSorusu(kod, dosyaAdi), { modal: true },
          CATISMA_SECENEKLERI.kaydet, CATISMA_SECENEKLERI.kapıyaGit);
        if (secim === CATISMA_SECENEKLERI.kaydet) return "kaydet";
        if (secim === CATISMA_SECENEKLERI.kapıyaGit) return "kapıyaGit";
        return "iptal";
      },
      // Belge ayrıştırılamıyorsa BOŞ LİSTE değil `undefined` döner: yazım hattı
      // "kapı yok" ile "belge okunamıyor" cümlelerini ayırmak zorundadır.
      kapilar: () => belgeKapilariOkumasi(doc),
      kodluAdimSayisi: (kod: string) => belgeKodAdedi(doc, kod),
      // Ekleme noktasının bayt doğrulaması bu satır üstünde yapılır (Kusur 1).
      satirMetni: (satir: number) =>
        satir >= 0 && satir < doc.lineCount ? doc.lineAt(satir).text : undefined,
      async ekle(kapi: OnayKapisi, metin: string, silme?: SatirAraligi): Promise<boolean> {
        // İki iş TEK düzenlemededir: metin dışarıdan gelir, silme aralığı ise
        // çekirdekte kaynakla kanıtlanmıştır. Kabuk ne metni kurar ne aralığı
        // hesaplar; yalnız uygular.
        const dokunulan = [...new Set(silme ? [kapi.durumSatir, silme.satir] : [kapi.durumSatir])];
        const yedek = dokunulan.map((s) => ({ satir: s, metin: doc.lineAt(s).text }));
        const duzenleme = new vscode.WorkspaceEdit();
        duzenleme.insert(doc.uri, new vscode.Position(kapi.durumSatir, kapi.durumSutun), metin);
        if (silme) {
          duzenleme.delete(doc.uri, new vscode.Range(
            new vscode.Position(silme.satir, silme.baslangic),
            new vscode.Position(silme.satir, silme.bitis)));
        }
        const oldu = await vscode.workspace.applyEdit(duzenleme);
        if (oldu) geriYukleme = yedek;
        return oldu;
      },
      async kaydet(): Promise<boolean> {
        // ⏸️ Kaydetme süresince biçimlendirici askıya alınır: karar tek alan ekler,
        // kırk altı satır değil. Askı `finally` içinde kalkar — yazım patlasa bile
        // kullanıcının kendi kaydetmesi biçimsiz kalmaz.
        bicimAskisi.askiyaAl(doc.uri.fsPath);
        try { return await doc.save(); }
        finally { bicimAskisi.serbestBirak(doc.uri.fsPath); }
      },
      async ekiGeriAl(): Promise<boolean> {
        if (!geriYukleme) return false;
        // Satırın tamamı önceki metniyle değiştirilir; ne ekin uzunluğu ne de
        // silinenin yeri yeniden hesaplanır. Düzenleme satır SAYISINI değiştirmez,
        // dolayısıyla satır numaraları hâlâ aynı satırları gösterir.
        const geri = new vscode.WorkspaceEdit();
        for (const y of geriYukleme) geri.replace(doc.uri, doc.lineAt(y.satir).range, y.metin);
        const oldu = await vscode.workspace.applyEdit(geri);
        if (oldu) geriYukleme = undefined;
        return oldu;
      },
      bellektekiOnay: (kod: string) => belgeOnayKaniti(doc, kod),
      disktekiOnay: (kod: string) => disktenOnayKaniti(doc.uri.fsPath, kod),
    };
  };

  /**
   * 🧭 KARARIN TEK YAZICISI. Karar mantığı (kilit · kimlik · kirli belge · üç
   * kanıt) saf çekirdektedir; buradaki iş yalnız kabuğu bağlamak ve sonucu
   * kullanıcı diline çevirmektir. Sessiz çıkış yolu YOKTUR: her sonuç ya kanıtlı
   * başarıdır ya açık hatadır.
   */
  const kaydiIsle = async (
    doc: vscode.TextDocument, satir: number, damga: string,
    not: string, kod: string,
  ): Promise<KararSonucu> => {
    const sonuc = await kararIsle(ucuslar, yazimKabugu(doc), {
      dosya: doc.uri.fsPath, kod, satir, damga, not, gun: yerelGun(),
    });
    izYaz(IZ_METINLERI.kararSonucu(kod, sonuc.tur));
    switch (sonuc.tur) {
      case "başarı":
        tazele(doc);
        vscode.window.showInformationMessage(kararBasarili(sonuc.kod, damga));
        break;
      case "uçuşta":
        vscode.window.showWarningMessage(kararUcusta(sonuc.kod));
        break;
      case "kapıYok":
        vscode.window.showErrorMessage(kararKapiYok(sonuc.kod));
        tazele(doc);
        break;
      case "kimlikÇakışması":
        vscode.window.showErrorMessage(kararKimlikCakismasi(
          sonuc.kod, sonuc.adet, dosyaAdiniAl(doc.uri.fsPath)));
        break;
      case "iptal":
        vscode.window.setStatusBarMessage(kararIptalEdildi(sonuc.kod), 4_000);
        break;
      case "kapıyaGit":
        await kapiyaGit(doc, sonuc.satir);
        break;
      case "uygulanamadı":
        vscode.window.showErrorMessage(kararUygulanamadi(sonuc.kod, sonuc.neden));
        break;
      case "kaydedilemedi":
        vscode.window.showErrorMessage(
          kararKaydedilemedi(sonuc.kod, sonuc.neden, sonuc.geriAlindi));
        break;
      case "bellekUyuşmazlığı":
        vscode.window.showErrorMessage(
          kararBellekUyusmazligi(sonuc.kod, sonuc.beklenen, sonuc.bulunan));
        break;
      case "diskUyuşmazlığı":
        vscode.window.showErrorMessage(
          kararDiskUyusmazligi(sonuc.kod, sonuc.beklenen, sonuc.bulunan));
        break;
      case "belgeAyrıştırılamadı":
        // "Kapı listede yok" DEĞİLDİR: dosya ayrıştırılamıyor ve yazım sonrası
        // evrelerde bozulmuş olabilir. Panel bilerek tazelenmez — ayrıştırılamayan
        // belge boş liste üretir ve tazeleme kapıları sessizce düşürürdü.
        vscode.window.showErrorMessage(kararBelgeAyrisilamadi(sonuc.kod, sonuc.evre));
        break;
      case "eklemeNoktasıDoğrulanamadı":
        vscode.window.showErrorMessage(kararEklemeNoktasiDogrulanamadi(
          sonuc.kod, sonuc.beklenen, sonuc.bulunan));
        break;
      case "beklerAlanıKaldırılamadı":
        // Founder hükmü (2026-08-29): karar yazıldığında bekleme ilanı kalkar.
        // Panel bilerek tazelenmez; kaynağın hâli belirsizdir ve kullanıcı ona
        // bakmalıdır — sessiz bir tazeleme kapıyı düşürüp sorunu gizleyebilirdi.
        vscode.window.showErrorMessage(kararBeklerKaldirilamadi(
          sonuc.kod, sonuc.beklenen, sonuc.bulunan));
        break;
    }
    return sonuc;
  };

  /**
   * Kaynağı doğru satırda açar. Hiçbir Comments iş parçacığı YARATILMAZ.
   *
   * İKİ SEÇENEK BİLEREK VERİLİR ve ikisi de Founder hükmünün (2026-07-29) yan
   * etkilerini kapatır:
   *   ① `preview: true` — kapı satırı artık TEK TIKLA kaynağı açtığı için, on
   *      dört kapı arasında gezinen kullanıcı kalıcı sekme yığını üretirdi.
   *      Önizleme kipinde art arda gezinme TEK sekmeyi kirletir ve üstüne yazılır.
   *   ② `preserveFocus: true` — odak PANELDE kalır. Kullanıcı kapıyı seçtikten
   *      sonraki hamlede karar satırına tıklayacaktır; odak editöre kaçsaydı o
   *      ikinci tık yine boşa giderdi ve "tıklıyorum, bir şey olmuyor" duygusu
   *      başka bir kapıdan geri gelirdi.
   */
  const kapiyaGit = async (doc: vscode.TextDocument, satir: number): Promise<void> => {
    const editor = await vscode.window.showTextDocument(doc, {
      preview: true, preserveFocus: true,
    });
    const poz = new vscode.Position(satir, 0);
    editor.selection = new vscode.Selection(poz, poz);
    editor.revealRange(new vscode.Range(poz, poz), vscode.TextEditorRevealType.InCenter);
  };

  /**
   * Emekli Comments karar komutları. Kimlikleri KORUNUR (paket bildirimindeki
   * menü koşulları onlara bağlıdır) fakat artık hüküm yazmazlar: kullanıcıyı
   * kararın gerçekten verildiği yere, Onaylar paneline yönlendirirler.
   */
  const kararYaz = () => async (): Promise<void> => {
    izYaz(IZ_METINLERI.commentsEmekliYonlendirme);
    vscode.window.showInformationMessage(commentsEmekli());
    await postaKutusunaOdaklan();
  };

  /**
   * AÇIK belgeler ana tanı hattının anlık görüntüsünün üstüne yazar.
   *
   * ⚠️ ÖLÇÜLMÜŞ KUSUR (Founder canlı bulgusu 2026-07-29 · 0.9.130): bu süzgeç
   * eskiden YALNIZ KİRLİ belgelere bakıyordu. Karar yazıcısı belgeyi kendisi
   * kaydettiği için karardan hemen sonra belge TEMİZDİR; yani koruma tam olarak
   * gerektiği anda devre dışı kalıyordu. Kullanıcının kararından önce başlayıp
   * sonra biten bir tam tur, kararı hiç görmemiş ağacını panele yerleştiriyor ve
   * karara bağlanmış kapı geri geliyordu. Founder'ın gördüğü şey buydu:
   * "onaylanan kutucuk tekrar gelip onay istiyor."
   *
   * Kural artık kirliliğe değil AÇIKLIĞA bakar ve gerekçesi geneldir: açık bir
   * belge diskin ve görüntünün taşıdığı her şeyi zaten içerir, dolayısıyla
   * hiçbir durumda anlık görüntüden bayat olamaz. Birleştirme SAF çekirdektedir;
   * bu işlev yalnız açık belgeleri okur ve HİÇBİR belge AÇMAZ.
   */
  const goruntuyuAciklarlaBirlestir = (bulgular: readonly KapiKaydi[]): KapiKaydi[] =>
    acikBelgeleriUstuneYaz(bulgular, vscode.workspace.textDocuments
      .filter((d) => gercekDosya(d))
      .map((d) => ({ dosya: d.uri.fsPath, kapilar: noktalariTopla(d) })));

  /**
   * Bütün çalışma alanının kapılarını PANELE yerleştirir ve listeyi döndürür.
   *
   * BURADA HİÇBİR İŞ PARÇACIĞI YARATILMAZ. Eski davranış her bulgu için bir
   * Comments nesnesi açıyordu; ölçüm açılışta on bir nesne ve iki yüz doksan
   * sekiz belge gösterdi. Kapı listesi tek gözden (onay-tarayici) gelir ve o göz
   * ana tanı hattının anlık görüntüsünden beslenir; onaya ait bağımsız tam
   * tarama turu yoktur.
   */
  const tumunuTara = async (): Promise<KapiKaydi[]> => {
    const bulgular = goruntuyuAciklarlaBirlestir(await calismaAlaniniTara())
      .filter((kayit) => odak.kapsamda(kayit.dosya));
    postaKutusu?.yerlestirHepsi(bulgular);
    olcum.yerlestirmeTuru += 1;
    olcum.sonYerlesenKapi = bulgular.length;
    if (bulgular.length) olcum.kapiGorulduMu = true;
    // İlk yerleşim, açılış penceresini KAPATIR: bundan sonrası olay davranışıdır.
    if (olcum.acilistaAcilanBelge < 0) {
      olcum.acilistaAcilanBelge = olcum.acilanBelge;
      olcum.acilistaOlaydanAcilanBelge = olcum.olaydanAcilanBelge;
    }
    return bulgular;
  };

  // 📬 Komut: Founder'ın gelen kutusu. Komut artık kendi listesini YARATMAZ;
  // kimliği korunan tek kuyruğa, Onaylar görünüşüne odaklanır. Eskiden bu
  // komut her çağrıda tam tarama yapıp bir seçim listesi açıyordu ve böylece
  // panelin yanında ikinci bir "asıl kuyruk" gibi duruyordu.
  const postaKutusunaOdaklan = async (): Promise<void> => {
    await vscode.commands.executeCommand(`${GORUNUS_POSTA_KUTUSU}.focus`);
  };

  // ⚡ ANLIK KUYRUK (Sorunlar sekmesi davranışı): yazarken biriken belgeler tek
  // geciktirilmiş turda tazelenir (son çağrı kazanır — nabiz.ts geciktiricisi).
  const bekleyenler = new Map<string, vscode.TextDocument>();
  const gecikmeliTazele = geciktir(() => {
    for (const d of bekleyenler.values()) tazele(d);
    bekleyenler.clear();
    susle(); degisti.fire();   // nabız süsü + karar lensi de aynı turda tazelenir
  });

  // 💾 Disk izleyici: dosya VS Code DIŞINDAN değişince de kapı düşer/kalkar
  // (0.9.70 saha bulgusu: dış araç plana kapı yazdı, komut koşulana dek kuyruk
  // sessiz kaldı). Değişen dosya açılıp tazelenir; silinen dosyanın kapıları düşer.
  const izleyici = vscode.workspace.createFileSystemWatcher("**/*.sar");
  const diskTazele = async (uri: vscode.Uri): Promise<void> => {
    if (kapsamDisi(uri)) return;
    try {
      olcum.acilanBelge += 1; olcum.olaydanAcilanBelge += 1;   // disk olayı: YALNIZ o dosya
      tazele(await vscode.workspace.openTextDocument(uri));
      susle(); degisti.fire();
    } catch { /* açılamayan dosya kuyruğa girmez */ }
  };
  const diskSil = (uri: vscode.Uri): void => {
    // Silinen dosyaya bağlı etkin karar yüzeyi ÖNCE elden çıkarılır; sonra ölçüm
    // eşitlenir. Sıra önemlidir, çünkü ölçüm defterin son hâlini okur.
    etkinYuzey.dosyaSilindi(uri.fsPath);
    olcumuEsitle();
    // Silinen dosyanın kapıları panelden de düşer; iki yüzey aynı anda temizlenir.
    postaKutusu?.dusur(uri.fsPath);
  };

  // ── 💛 satır sonu nabzı: onay bekleyen kapı, geribildirim kalbi gibi ATAR ────
  // (Founder isteği 2026-07-17: "onay bekleyenler de geribildirim gibi yanıp
  // sönse"). Renk kanondan: driftRozetleri.terfi — karar/dikkat sarısı (YUZ-4
  // ruhu: renk=durum). Aynı tek kalp (nabiz.ts) kullanılır; ayrı zamanlayıcı yok.
  const sari = rozetRenkleri().terfi;
  const davetDolu = vscode.window.createTextEditorDecorationType({
    after: { contentText: ONAY_YUZEY_METINLERI.bekliyorSus, color: sari },
  });
  const davetBos = vscode.window.createTextEditorDecorationType({
    after: { contentText: "  📪", color: `${sari}55` },
  });
  let davetAraliklar: vscode.DecorationOptions[] = [];
  let davetAtis = true;
  const davetBoya = (): void => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || !gercekDosya(editor.document)) return;
    editor.setDecorations(davetAtis ? davetDolu : davetBos, davetAraliklar);
    editor.setDecorations(davetAtis ? davetBos : davetDolu, []);
  };
  const davetKalbi = nabizAbone((a) => { davetAtis = a; davetBoya(); });
  const susle = (): void => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || !gercekDosya(editor.document)) { davetAraliklar = []; return; }
    davetAraliklar = noktalariTopla(editor.document).map((n) => ({
      range: editor.document.lineAt(n.satir).range,
      hoverMessage: new vscode.MarkdownString(ONAY_YUZEY_METINLERI.hover(n.kod, n.olcut)),
    }));
    davetBoya();
  };

  // ── 📬 karar lensi: kapı satırının üstünde tek tık → POSTA KUTUSU ───────────
  //   Mercek bir KISAYOLDUR ve artık DÜRÜSTTÜR: kendi karar arayüzünü açmaz,
  //   görünmeyen bir Comments penceresi kurmaz, yalnız aynı kapıyı Posta
  //   Kutusunda seçili ve açık hâle getirir. Eski hâlinde başlık "karar ver"
  //   diyordu ve tıklayan kullanıcı hiçbir şey görmüyordu (ölçülmüş Kusur 6).
  const degisti = new vscode.EventEmitter<void>();
  const lensSaglayici: vscode.CodeLensProvider = {
    onDidChangeCodeLenses: degisti.event,
    provideCodeLenses(doc) {
      if (!gercekDosya(doc)) return [];
      return noktalariTopla(doc).map((n) => new vscode.CodeLens(
        new vscode.Range(n.satir, 0, n.satir, 0),
        {
          title: ONAY_YUZEY_METINLERI.lensBasligi(n.kod),
          tooltip: ONAY_YUZEY_METINLERI.lensIpucu,
          command: "sarmal.onayKarar",
          arguments: [n],
        },
      ));
    },
  };
  const onayKarar = async (n: OnayNoktasi): Promise<void> => {
    const doc = vscode.window.activeTextEditor?.document;
    if (!doc) return;
    if (!gercekDosya(doc)) {
      vscode.window.showWarningMessage(EKLENTI_KABUK_METINLERI.eskiKopyaSaltOkunur);
      return;
    }
    izYaz(IZ_METINLERI.mercek(n.kod));
    await postaKutusunaOdaklan();
    const bulundu = await postaKutusu?.gosterVeAc(doc.uri.fsPath, n.kod);
    if (!bulundu) {
      vscode.window.showInformationMessage(ONAY_YUZEY_METINLERI.paneldeBulunamadi(n.kod));
    }
  };

  /**
   * 📬 PANEL İÇİ KARAR. Founder hükmü 2026-07-29 ve ekran görüntüsüyle verdiği
   * yerleşim: gerekçe kutusu kapının hemen altında, ÜÇ SEÇENEĞİN ÜSTÜNDE, panelin
   * kendi içinde durur. Gerekçe artık BURADA SORULMAZ — panel onu kullanıcının
   * gözünün olduğu yerde toplar ve hazır getirir.
   *
   * QUICKINPUT BU HATTAN TÜMÜYLE ÇIKTI. Sebebi ölçülmüştür: `InputBoxOptions`,
   * `QuickInput` ve `InputBox` bildirimlerinin hiçbirinde konum alanı yoktur ve
   * VS Code bütün QuickInput yüzeylerini pencerenin ÜST ORTASINDA çizer. Founder
   * paneli pencerenin altında tutuyor ve şerh yazmak için üç kez "ta en yukarıya"
   * bakmak zorunda kaldığını bildirdi. Kutu artık panelin içinde olduğu için
   * burada bir giriş kutusu açmak, aynı kusuru geri getirmek olurdu; yol
   * yapısal olarak kapatıldı.
   *
   * KARAR MANTIĞI DEĞİŞMEZ: hüküm yine tek yazıcıdan (`kaydiIsle` → saf
   * `kararIsle`) geçer, `onay:` biçimi ve üç damga aynıdır, kanıtlı başarı hattı
   * (kaydetme denetimi · bellek doğrulaması · hedefli disk geri okuması · uçuş
   * kilidi) aynen korunur ve diskte yazılmış eski kayıtlar okunmaya devam eder.
   *
   * @param not Panelin topladığı gerekçe. Gerekçe isteyen bir seçenekte
   *   `undefined` gelmesi "kullanıcı vazgeçti", boş dize gelmesi ise "yazmayı
   *   denedi ama boş bıraktı" demektir; ikisi AYRI karşılanır ve ikisi de hiçbir
   *   şey yazmaz. Ölçü saf gövdededir (`gerekceyiOlc`), burada ikinci bir kural
   *   yazılmaz.
   * @returns Yazım hattının sonucu; panel taslağı yalnız kanıtlı başarıda düşürür.
   */
  const postaKararVer = async (
    dosya: string, satir: number, kod: string,
    damga: string, notIster: boolean, not?: string,
  ): Promise<KararSonucu | undefined> => {
    izYaz(IZ_METINLERI.panelKarari(kod, damga));
    // ⛔ SINIR DENETİMİ. Panel kutuyu zaten ölçer ve hatayı kullanıcının gözünün
    // önünde gösterir; bu ikinci ölçü panelden GELMEYEN çağrılar içindir (komut
    // paleti, kısayol, başka bir eklenti). Boş gerekçeyle karar yazılması böylece
    // yapısal olarak imkânsız kalır — vaat ile davranış iki yüzde de aynıdır.
    const olcu = gerekceyiOlc(notIster, not);
    if (olcu.tur !== "geçerli") {
      izYaz(IZ_METINLERI.kararYazilmadi(kod, olcu.tur));
      if (olcu.tur === "iptal") {
        vscode.window.setStatusBarMessage(kararIptalEdildi(kod), 4_000);
      } else {
        vscode.window.showWarningMessage(
          olcu.tur === "gerekçeBoş" ? gerekceZorunlu() : gerekceArtik());
      }
      return undefined;
    }
    let doc: vscode.TextDocument;
    try {
      olcum.acilanBelge += 1; olcum.olaydanAcilanBelge += 1;   // kullanıcı eylemi
      doc = await vscode.workspace.openTextDocument(vscode.Uri.file(dosya));
    } catch {
      vscode.window.showErrorMessage(ONAY_YUZEY_METINLERI.kararDosyasiOkunamiyor(dosya));
      return undefined;
    }
    return kaydiIsle(doc, satir, damga, olcu.not, kod);
  };

  /**
   * 📬 İPTAL. Panelde kutudayken Escape'e basmak kapıyı kapatır ve HİÇBİR kayıt
   * yazmaz. Sessizlik yasaktır (ölçülmüş Kusur 9): vazgeçiş durum çubuğunda
   * kısaca söylenir. İptal ile boş kutu AYRI şeylerdir — boş kutu kullanıcıyı
   * kutunun yanında uyarır, iptal ise kapıyı olduğu gibi bırakır.
   */
  const postaKararIptal = (kod: string): void => {
    izYaz(IZ_METINLERI.kararIptal(kod));
    vscode.window.setStatusBarMessage(kararIptalEdildi(kod), 4_000);
  };

  /**
   * 📬 "Kapıya git" satırı. YALNIZ kaynağı doğru satırda açar. Eskiden buradan
   * `etkinKarariAc` çağrılıyor ve çizilmeyen bir Comments penceresi kuruluyordu
   * (ölçüm: `canlı yüzey: 1`); kullanıcı dosyaya gidip boşluk buluyordu.
   * Hedef kapı da artık YALNIZ dosya+kod ile bulunur.
   */
  const postaKapisiAc = async (dosya: string, satir: number, kod: string): Promise<void> => {
    let doc: vscode.TextDocument;
    try {
      olcum.acilanBelge += 1; olcum.olaydanAcilanBelge += 1;   // kullanıcı eylemi
      doc = await vscode.workspace.openTextDocument(vscode.Uri.file(dosya));
    } catch {
      vscode.window.showErrorMessage(ONAY_YUZEY_METINLERI.kapiDosyasiOkunamiyor(dosya));
      return;
    }
    // Ayrıştırılamayan belgede "kapı kapanmış olabilir" DENMEZ (Kusur 2): boş
    // liste ile okunamayan belge iki ayrı gerçektir ve ikisi ayrı söylenir.
    const noktalar = belgeKapilariOkumasi(doc);
    if (noktalar === undefined) {
      izYaz(IZ_METINLERI.kapiAyrisilamadi(kod));
      vscode.window.showErrorMessage(kararBelgeAyrisilamadi(kod, "yazımÖncesi"));
      return;
    }
    izYaz(IZ_METINLERI.kapiAraniyor(kod, noktalar.length));
    const cozum = kapiCoz(noktalar, kod, satir);
    if (cozum.tur === "çoklu") {
      vscode.window.showErrorMessage(kararKimlikCakismasi(
        kod, cozum.adet, dosyaAdiniAl(dosya)));
      return;
    }
    if (cozum.tur === "yok") {
      izYaz(IZ_METINLERI.kapiBulunamadi(kod));
      vscode.window.showInformationMessage(ONAY_YUZEY_METINLERI.artikBeklemiyor(kod));
      tazele(doc);
      return;
    }
    await kapiyaGit(doc, cozum.kapi.satir);
    // ┌─ AÇMA İŞİ TAHMİNE BIRAKILMAZ ──────────────────────────────────────────
    // │ Founder tek tıkla hem gitmeyi hem açılmayı istedi. Gerçek VS Code
    // │ kabuğunda ölçtük (2026-07-29, iki openMode kipinde ayrı ayrı): komut
    // │ taşıyan açılabilir bir satır seçildiğinde VS Code KOMUTU koşturuyor
    // │ fakat satırı AÇMIYOR. Yani "hem komut hem açılma kendiliğinden olur"
    // │ varsayımı YANLIŞTIR ve ölçümle çürütüldü.
    // │
    // │ Bu yüzden açma işini komutun kendisi üstlenir: aynı kapı panelde
    // │ `reveal` ile bir kademe AÇILIR. `focus: true` odağı panele geri getirir —
    // │ editör önizleme kipinde açıldığı hâlde odak oraya kayabiliyordu ve
    // │ kullanıcının bir sonraki tıklaması yine boşa düşerdi.
    // └────────────────────────────────────────────────────────────────────────
    await postaKutusu?.gosterVeAc(dosya, kod);
  };

  baglam.subscriptions.push(
    kutu, iz,
    izleyici,
    gecikmeliTazele,
    davetKalbi, davetDolu, davetBos, degisti,
    // Ana tanı hattı görüntüsünü tazeleyince kuyruk yeniden yerleşir. Onay yüzeyi
    // kendi tam turunu KURMAZ. (PRF-TA-A03: susuş bildirimi diye bir olay yoktur.)
    anaGoruntuDegisti(() => { void tumunuTara().then(() => { susle(); degisti.fire(); }); }),
    vscode.languages.registerCodeLensProvider("sarmal", lensSaglayici),
    vscode.commands.registerCommand(KOMUT_POSTA_KUTUSU, postaKutusunaOdaklan),
    vscode.commands.registerCommand("sarmal.onayKarar", onayKarar),
    vscode.commands.registerCommand("sarmal.postaKapisiAc", postaKapisiAc),
    vscode.commands.registerCommand("sarmal.postaKararVer", postaKararVer),
    vscode.commands.registerCommand("sarmal.postaKararIptal", postaKararIptal),
    // Emekli Comments karar komutları: kimlikleri korunur, hüküm yazmazlar.
    ...SECENEKLER.map((s) => vscode.commands.registerCommand(s.komut, kararYaz())),
    vscode.window.onDidChangeActiveTextEditor((e) => { tazele(e?.document); susle(); degisti.fire(); }),
    vscode.workspace.onDidSaveTextDocument((d) => { tazele(d); susle(); degisti.fire(); }),
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (!gercekDosya(e.document)) return;
      bekleyenler.set(e.document.uri.toString(), e.document);
      gecikmeliTazele.cagir();
    }),
    izleyici.onDidCreate((u) => void diskTazele(u)),
    izleyici.onDidChange((u) => void diskTazele(u)),
    izleyici.onDidDelete(diskSil),
  );
  // 🔭 Odak değişince kuyruk yeniden yerleşir. Bu kayıt bir DÜZELTMEDİR (Founder
  // canlı bulgusu 2026-08-27): Onaylar paneli kapsam süzgecinden hiç geçmiyor ve
  // hangi varlık seçili olursa olsun bütün çalışma alanını gösteriyordu, oysa
  // öteki üç yüzey odağa uyuyordu. Kullanıcı böylece çelişkili iki tablo görür.
  // Yeni bir zamanlayıcı KURULMAZ; tur odağın kendi olayına bağlanır ve tarama
  // ana tanı hattının anlık görüntüsünden beslendiği için ikinci bir tam tarama
  // maliyeti doğurmaz.
  odak.degisince(() => { void tumunuTara(); });

  izYaz(IZ_METINLERI.komutlarKayitli(!!postaKutusu));
  // AÇILIŞTA HİÇBİR ŞEY YAPILMAZ. Ne belge açılır, ne iş parçacığı yaratılır, ne
  // tarama başlatılır: kuyruk ana tanı hattının ilk görüntüsüyle dolar. Denetim
  // ayarı kapalıyken de görüntü gelir, çünkü hat susmaz, yalnız tanı üretmez
  // (PRF-TA-A03 ikinci tur); "sustum" bildirimi yoktur. İki tur bu yüzden
  // yarışmaz — onay hattı görüntü gelmeden yedek taramayı başlatmaz.
  //
  // TEK İSTİSNA: görüntü bu modül kurulmadan ÖNCE yayınlanmış olabilir (geç
  // kurulum, yeniden kurulum, sınama). O durumda olay bir daha atmaz; kuyruk
  // burada bir kez doldurulur.
  if (anaGoruntuHazirMi()) {
    void tumunuTara().then(() => { susle(); degisti.fire(); });
  }
}

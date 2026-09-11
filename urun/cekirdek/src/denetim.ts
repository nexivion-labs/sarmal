// ═══════════════════════════════════════════════════════════════════════════
// denetim.ts — 🧩 SAF DENETİM ÇEKİRDEĞİ (RAY-3 · denetleme komutunun ayrıştırılması)
//
//   Bu dosya, ŞEF runtime çalışmasının "denetleme komutunu tanrı fonksiyonundan
//   ayır" kaleminin meyvesidir. O kalemin
//   plan kaydı bugün bu deponun dışında, laboratuvar arşivindeki eski omurga
//   planında yaşar. Arşiv gövdesi CANLI bir `.sar` ilanı olmadığı için taşıdığı
//   Adım kodu motorun çözebileceği bir tanım vermez; bu yüzden köken burada kodla
//   değil anlatıyla anılır.
//
//   denetleKomutu'nun ~400 satırlık gövdesinden ayrıştırılan KARAR mantığı:
//   tanı üretimi rapor SIRASI korunarak veri olarak biriktirilir; konsola
//   yazılmaz, süreç sonlandırılmaz. SUNUM (metin kurma · yazdırma · çıkış)
//   ince CLI kabuğunda (sarmal.ts denetleKomutu) yaşar. Amaç: ŞEF döngüsü,
//   Adım-seçici ve mühür bekçisi denetimi PROGRAMATİK çağırabilsin — süreç
//   sınırı (CLI) tek kapı olmaktan çıksın.
//
//   DAVRANIŞ SÖZLEŞMESİ: akış sırası, sayaçlar ve çıkış kodları refaktör
//   öncesiyle BİREBİRDİR — hiçbir tanı ailesi eklenmez/çıkarılmaz/taşınmaz.
// ═══════════════════════════════════════════════════════════════════════════
import { existsSync, readFileSync } from "node:fs";
import { join, basename, relative, isAbsolute } from "node:path";
import { dogrula, dayanaksizKurallar, beyanliDayanaksizKurallar } from "./dogrulayici.ts";
import { siniflamaYukle, siniflamaOrtuMerge, siniflamaOrtuYukle } from "./siniflama.ts";
import { iskeletPlani } from "./iskeletci.ts";
import { denetle, diskTara, kodIndeksle, adAlaniKapisi, referansTanilari, kuralTanilari, anaYokTanisi, programlariYukle, yinelenenKodTanilari, dosyalararasiCatismaTanilari, gizliBagimlilikTanilari, donguTanilari, yetimMeyveTanilari, docDriftTanilari, beyansizYapiTanilari, ilansizGovdeDenetle, teknolojisizYuzeyTanilari, tekCocukTanilari, anadizinBul, adAyraciTanilari, halefTanilari, kapsamTanilari, rafsizAnadizinTanilari, kavusumsuzParalellikTanilari, fazVadeTanilari, mevsimVadeTanilari, mevsimMuhurTanilari, katmansizTeknolojiTanilari, altKatmanTekilligiTanilari, dilTanilari, uygulanmamisKararTanilari, beceriDriftTanilari, kullanimsizTipTanilari, hiyerarsiTanilari, dayanakTanilari, dayanaksizKararlar, anadizinSekliTanilari, yerelEvre1Yumusat, siloBlokTanilari, kavusumsuzDilimTanilari, acikAdimTanilari, durumsizAdimTanilari, acikAdimGosterimi, dersAcikAdimSayisi, acikHatirlaticiGosterimi, dogusEksikProjeTanilari, olgunlukOnayiTanilari, planlamaEvresiMi, evre1Yumusat, metinAtifTanilari,
  onceliksizAdimTanilari,
  atesleyenHatirlaticiTanilari,
  dosyaMuhruTanilari, arsivEbediEnvanteri,
} from "./denetci.ts";
import { belirtecMemosuyla } from "./belirtec.ts";   // ⚡ PRF-MK-A03: tur ömürlü belirteç memosu
import { dagKur, dagTanilari, durumTutarlilikTanilari, kopukZincirTanilari, kayipKenarTanilari, ozBagimlilikTanilari, karneOzeti, projeSahibi, projeKarneleri, projeKokleri } from "./dag.ts";
import type { ProjeKarnesi, Dag } from "./dag.ts";
import { ebediEnvanter, ebediTanilar, muhurTanilari, birlesimCatismaTanilari, EBEDI_KILIT_ADI } from "./kuralci.ts";
import type { EbediKilit } from "./kuralci.ts";
import { yolTuru, rejimTanilari, katiRejimliDosyalar, omurgaTanilari, iliskiSinifiTanilari, authTanilari, sefAkisiTanilari, dilKanonTanilari, ogretimTanilari, stratejiTanilari, tipEvreniTanilari, terfiKanitiTanilari, yuzTanilari } from "./denetci.ts";
import { dizindenIndeks, DERS_DUNYASI, projeKapsamlari, onekKapsar } from "./kimlik.ts";
import { YENI_TANI_INDEKS, taniSicili, terfiKapisiKusurlari } from "./tani-sicili.ts";
import type { YeniTaniKaydi } from "./tani-sicili.ts";
import { ORTAK_TANI_METINLERI, eskiTani, yeniTani, yapistirilabilirOrnekVar } from "./tani-metinleri.ts";
import type { Tani, Duzey } from "./tani.ts";
// göç motor turu A09 kapanışı (2026-07-27): halka 2 orkestrasyon tanılarını bu dosyaya taşırken
// `Dugum` tipini içe aktarmayı atlamıştı; Node tipleri sıyırarak koştuğu için
// süitler yeşil kalmış, kusuru yalnız tür denetimi görmüştü. Kapı artık
// `npx tsc --noEmit` maddesini ayrıca taşır.
import type { Dugum } from "./sozdizim.ts";

/** Ebedi mühür kilidini okur (kilitle komutu ve denetim aynı okuyucuyu kullanır — ikiz yazılmaz). */
export function kilitOku(dizin: string): EbediKilit | undefined {
  const kilitYolu = join(dizin, EBEDI_KILIT_ADI);
  if (!existsSync(kilitYolu)) return undefined;
  return JSON.parse(readFileSync(kilitYolu, "utf8")) as EbediKilit;
}

/** Rapor akışının bir birimi — kabuk bu sırayla yazdırır (raporla sözleşmesi). */
export interface DenetimRapor { dosya: string; tanilar: Tani[] }

export interface DenetimSecenek {
  /** --ana ile verilen dış spec yolu (verilmezse MIM-3 deseniyle bulunur). */
  anaYolu?: string;
  /** Vade nöbetlerinin "bugün"ü (determinizm: testler enjekte eder; verilmezse takvim günü). */
  bugun?: string;
  /** Sınıflama kanon dosyasının yolu (kabuk kendi konumundan geçirir — çekirdek konum varsaymaz). */
  snfYol: string;
  /**
   * ÖZETLEME KAPALI KİPİ: true verilirse gösterim katmanının hiçbir katlaması
   * uygulanmaz ve her bulgu kendi satırıyla akışa girer. Okunabilirlik kısıtı
   * insan içindir; ölçüm yapan ajan ya da kontrolcü tam dökümü bu bayrakla alır.
   * Tür dökümündeki sayılar iki kipte de AYNIDIR — değişen yalnız sunumdur.
   */
  tamListe?: boolean;
}

/**
 * Bir tanı TÜRÜNÜN koşum genelindeki gerçek ağırlığı. Dosya başına basılan özet
 * satırı yalnız o dosyanın kalanını anlatır; bir türün kaç bulgu ürettiği ancak
 * bu dökümde görünür. Terfi kararı (bir tanının hangi düzeyde konuşacağı) bu
 * sayı bilinmeden verilemeyeceği için döküm hem insana hem makineye açıktır.
 */
export interface TurDokumSatiri {
  /** Tanı kimliği. */
  kod: string;
  /** GERÇEK bulgu sayısı — özet satırlarının katladığı bulgular dâhil. */
  toplam: number;
  /** Türün kaç ayrı dosyaya yayıldığı. */
  dosyaSayisi: number;
  /** Türün konuştuğu düzeyler, en ağırdan hafife (bağlama göre değişebilir). */
  duzeyler: Duzey[];
}

export interface DenetimSonucu {
  /** Süreç çıkış kodu — 0 temiz/bilgi · 2 sözdizim/giriş bozuk · 4 hata/ana-yok. */
  cikis: number;
  /** Rapor akışı — kabuk aynı sırayla basar. */
  akis: DenetimRapor[];
  /** Sözdizim hatası erken çıkışı (console.error yolu — akışa girmez). */
  sozdizimHata?: { etiket: string; satir: number; sutun: number; mesaj: string };
  /** Tam koşum tamamlandı mı (erken çıkışlarda false — özet bölgesi kurulmaz). */
  tamKosum: boolean;
  anaEtiket?: string;
  muaflar: Set<string>;
  toplamHata: number;
  toplamUyari: number;
  /** Dosya başına hata+uyarı sayısı (YUZ-3 "en çok tanı" karnesi). */
  dosyaTanilari: Map<string, number>;
  /**
   * TÜR DÖKÜMÜ — her tanı türünün koşum genelindeki GERÇEK bulgu sayısı, azalan
   * sırada. Motorun makine-okur yüzü budur; bu sayıyı almak için çıktıyı metin
   * olarak ayrıştırmak gerekmez. Döküm ayrı bir sayaçtan değil, hata/uyarı
   * toplamlarını da üreten TEK sayım noktasından (aşağıdaki `say`) doğar —
   * ikinci bir sayaç yoktur, bu yüzden iki sayı birbirinden sapamaz.
   */
  turDokumu: TurDokumSatiri[];
  /**
   * PROJE AYRIMLI TABLO (KPS-AYR-A01 · YAS-3.3). Çalışma alanında birden çok
   * Proje kökü varsa her kök kendi satırını alır: kendi kodu, kendi karnesi ve
   * kendi hata/uyarı/bilgi sayıları. Tek projeli bir depoda liste BOŞTUR ve
   * kabuk hiçbir yeni satır basmaz — tek projeli çıktı bayt-bayt korunur.
   */
  projeGruplari: ProjeBulguGrubu[];
  /**
   * KOD AD ALANI ÖLÇÜMÜ (KPS-KOD-A01 · ORK-4). `ortakKod` kardeş projelerin
   * birlikte ilan ettiği kodlardır — BEKLENEN durum, tanı değil; `ayrisamayan`
   * aynı Proje kodunu taşıyan birden çok köktür — çevrimin ayıramadığı ve
   * susmak yerine adıyla söylediği yer. İkisi de grafın kendisinden okunur
   * (ikinci bir sayım yoktur) ve tek projeli bir depoda BOŞTUR.
   */
  adAlani: { ortakKod: Dag["ortakKod"]; ayrisamayan: Dag["ayrisamayan"] };
  karne?: ReturnType<typeof karneOzeti>;
  /** OGR-5: örnek dünyasının açık Adım sayısı (ders satırı). */
  dersAcik: number;
  /** Motor-susmaz listesi — tam liste (gösterim özeti kabukta kurulur). */
  acikAdimlar: Array<{ dosya: string; tani: Tani }>;
  /** Çalıştırılamayan zorunlu denetim kapıları — doluysa sonuç tam yeşil sayılmaz. */
  atlananKapilar?: string[];
  /** Dayanak karne verileri (RF-T6-A02 · YAS-2.1). */
  dayanak: { urun: number; ornek: number; beyanli: number; kuralsizKarar: number };
  /**
   * KÖKEN HARİTASI (KYN-MTR-A05 · üretici-kimlikli süzgeç): akıştaki her tanının
   * hangi üreticiden doğduğu nesne kimliğiyle eşlenir. WeakMap hiçbir yüzeye
   * serileştirilmez, dolayısıyla kanonik tanı biçimi tek bayt değişmez. Eklenti
   * paneli bu haritayı, ilanda panel yüzeyi taşıyan üreticilerin tanılarını
   * süzmek için okur (kapi-kapsami.ts · panelCaprazUreticiKumesi). Gerekçe
   * ölçülmüştür: aynı tanı kimliğini iki ayrı üretici taşıyabilir (kenar-metin
   * hem panelde koşan gizli-bağımlılık üreticisinde hem yalnız komut satırına
   * ayrılmış referans üreticisinde yaşar) ve kimlik-temelli süzgeç bu yüzden
   * yüzey kararını yanlış üreticinin tanısına uygulayabiliyordu.
   */
  koken: WeakMap<Tani, string>;
}

/**
 * Denetimi koşar ve sonucu VERİ olarak döndürür — konsol ve süreç yan-etkisi yok.
 * Akış sırası denetleKomutu'nun tarihsel rapor sırasının birebir korunmasıdır.
 */
export function denetimKos(dizin: string, secenek: DenetimSecenek): DenetimSonucu {
  // ⚡ PRF-MK-A03: bütün tur tek belirteç memosu kapsamında koşar; aynı dosya
  // yükleyicide ve kimlik indeksinde bir kez belirteçlenir, tur bitince memo düşer.
  return belirtecMemosuyla(() => denetimKosGovde(dizin, secenek));
}

function denetimKosGovde(dizin: string, secenek: DenetimSecenek): DenetimSonucu {
  // Köken haritası: her tanı, akışa girdiği yerde üreticisinin adıyla damgalanır.
  // Damga akış sırasını, sayaçları ve tanı içeriğini DEĞİŞTİRMEZ — davranış
  // sözleşmesi korunur; harita yalnız yüzey süzgeçlerinin okuduğu ek bilgidir.
  const koken = new WeakMap<Tani, string>();
  const koklendir = (uretici: string, tanilar: Tani[]): Tani[] => {
    for (const t of tanilar) koken.set(t, uretici);
    return tanilar;
  };
  const koklendirKayit = <K extends { tani: Tani }>(uretici: string, kayitlar: K[]): K[] => {
    for (const k of kayitlar) koken.set(k.tani, uretici);
    return kayitlar;
  };
  const bos = (cikis: number): DenetimSonucu => ({
    cikis, akis: [], tamKosum: false, muaflar: new Set(), toplamHata: 0, toplamUyari: 0,
    dosyaTanilari: new Map(), projeGruplari: [], adAlani: { ortakKod: [], ayrisamayan: [] }, turDokumu: [], dersAcik: 0, acikAdimlar: [], atlananKapilar: [],
    dayanak: { urun: 0, ornek: 0, beyanli: 0, kuralsizKarar: 0 }, koken,
  });
  const akis: DenetimRapor[] = [];
  // KÖK DEVRİ (KPS-AYR-A01): devredilen bir Proje kökünün dosyası çatı payında
  // basılmaz ve sayılmaz — o dosyanın tek sözcüsü kendi kökünün koşumudur. Tek
  // projeli bir depoda hiçbir kök devredilmez ve bu yüklem hep yanlış döner.
  let devredildi = (_dosya: string): boolean => false;
  const bas = (dosya: string, tanilar: Tani[]): void => { if (tanilar.length && !devredildi(dosya)) akis.push({ dosya, tanilar }); };
  // Özetleme kapalı kipinde hiçbir gösterim katlaması uygulanmaz (eşik sonsuz →
  // hiçbir sel eşiği aşamaz); sayım her iki kipte de aynı sonucu verir.
  const ozetle = secenek.tamListe !== true;
  const gosterimEsigi = ozetle ? 4 : Number.POSITIVE_INFINITY;

  // MIM-3 ①: giriş dosyası DESENLE bulunur (*_anadizin.sar; geçişte eski ana.sar tanınır).
  const anaYolu = secenek.anaYolu;
  const anaAdi = anaYolu ?? anadizinBul(dizin);
  // BKM-DNT-A13 · ÖLÇMEDEN OKUMA YASAĞI. Eski kapı yalnız varlığı ölçüyordu ve
  // bir DİZİN de var olduğu için kapıdan geçiyordu; akış birkaç satır sonra o
  // dizini dosya gibi okumaya çalışıp ham `EISDIR` yığın izini kullanıcının
  // yüzüne döküyordu (ölçüm 2026-09-10: `denetle <dizin> --ana /tmp`). Yolun
  // CİNSİ artık okumadan önce ölçülür ve dizin dürüst bir tanıya çevrilir.
  if (!anaAdi || !existsSync(anaAdi) || (anaYolu !== undefined && yolTuru(anaAdi) === "dizin")) {
    const s = bos(4);
    s.akis.push({ dosya: dizin, tanilar: koklendir("anaYokTanisi", [anaYokTanisi(anaYolu ?? dizin, anaYolu !== undefined)]) });
    return s;
  }
  const anaEtiket = anaYolu ? "ana.sar" : basename(anaAdi);

  // Taban sınıflama, çalışma-alanının kendi örtüsüyle birleştirilir: <dizin>/oz/siniflama/ortu.json
  // varsa enum'ları YALNIZ ekleyerek genişletir, çünkü örtü ürün tarafında yaşar ve
  // tabana asla geri yazılmaz (STR-3 açık araç ile kapalı ürün sınırı).
  const snf = siniflamaOrtuMerge(siniflamaYukle(secenek.snfYol), siniflamaOrtuYukle(dizin));
  const diskEvren = diskTara(dizin);

  // Tüm .sar'ları TEK ortak yükleyiciyle ayrıştır (denetci: sef ile DRY paylaşımlı).
  // Muaf dosya PARSE edilir (KOD/EBEDİ korunur), tanısı aşağıda atlanır.
  // ⚡ PRF-MK-A03: aynı anlık görüntü yükleyiciye verilir, disk bir kez taranır;
  // ham metinler yükleyicinin zaten okuduğu kaynaklardır ve bir daha okunmaz.
  const { programlar: evren, muaflar, hatalar, hamlar } = programlariYukle(dizin, anaYolu ? anaAdi : undefined, diskEvren);
  if (hatalar.length) {
    // İlk muaf-olmayan sözdizim hatası kapıyı kapatır (davranış korundu — çıkış 2).
    const h = hatalar[0];
    const s = bos(2);
    s.muaflar = muaflar;
    s.sozdizimHata = { etiket: h.etiket, satir: h.satir, sutun: h.sutun, mesaj: h.mesaj };
    return s;
  }

  // A08 (bug-avı C2): giriş dosyası bilerek-hatalı + ayrıştırılamaz ise programlar'da yoktur.
  const ana = evren.get(anaEtiket);
  if (!ana) {
    const s = bos(2);
    s.muaflar = muaflar;
    s.anaEtiket = anaEtiket;
    s.akis.push({ dosya: anaEtiket, tanilar: koklendir("denetimKos", [
      eskiTani("kural-ihlali", "hata", { dosya: anaEtiket, kusur: "giriş-ayrıştırılamıyor" }, { satir: 0, sutun: 0 }),
    ]) });
    return s;
  }
  // ══ KÖK DEVRİ (KPS-AYR-A01 ikinci yarı · MIM-1.1 · YAS-3.3) ═══════════════════
  //   Göreli yol çözen her ölçüm kökünü `dizin` parametresinden okur: iskelet
  //   kıyası ve disk mutabakatı, meyve dosya yolu, doc-drift, ebedî kilit,
  //   sınıflama örtüsü, dogfood kapıları ile öğretim, strateji ve yüzey
  //   nöbetleri. Çatı kökünden koşan denetimde bu kök çatının kendisiydi ve
  //   kapsanan projelerin yolları çatıya göre çözülüyordu; 2026-09-10 ölçümünde
  //   Sarmal kendi kökünden sıfır hata verirken çatı kökünden üç yüz altmış beş
  //   hata veriyordu ve farkın tamamı kök çözümündendi.
  //
  //   Onarım ölçümleri tek tek yamamaz; kökü bulgunun SAHİBİ PROJEDEN türetir.
  //   Kök, `projeSahibi` yordamının okuduğu kapsam listesinin ta kendisinden
  //   çıkar (`projeKokleri`): alt dizinindeki giriş dosyasında ilan edilmiş
  //   her Proje kendi kökünden, bu gövdenin kendisiyle koşar ve bulguları kökün
  //   önekiyle çatıya döner. Çatı kökünden okunan hane, projenin kendi kökünden
  //   okunan tabloyla bu yüzden YAPISI GEREĞİ aynıdır.
  //
  //   Çatının kendi payı, yani çatı ilanı ile hiçbir Proje kökünün altında
  //   yaşamayan dosyalar, çatı kökünden koşmaya devam eder. Arama yapan yapılar
  //   (kod indeksi, ad alanı kapısı, graf, ebedî envanter ve mühür pinleri)
  //   bütün evreni görmeye devam eder, çünkü köksüz çatı ilanı her projeye
  //   görünür kalır (ORK-4); tek dosya dolaşan üreticiler ise yalnız çatının
  //   kendi payını dolaşır. Tek projeli bir depoda liste BOŞTUR ve akış bayt
  //   bayt aynı kalır.
  const kokKapsamlari = projeKapsamlari(evren);
  const devir = anaYolu ? [] : projeKokleri(kokKapsamlari).filter((k) => !muaflar.has(k.dosya));
  if (devir.length) devredildi = (dosya: string): boolean => devir.some((k) => onekKapsar(k.onek, dosya));
  const programlar = devir.length ? new Map([...evren].filter(([etiket]) => !devredildi(etiket))) : evren;
  const disk: typeof diskEvren = devir.length
    ? { girdiler: diskEvren.girdiler.filter((g) => !devredildi(g.yol)) }
    : diskEvren;

  const plan = iskeletPlani(ana, snf);
  const indeks = kodIndeksle(evren);
  // ORK-4 · ÇAPRAZ-PROJE AD ALANI (KPS-ADA-A01): referans çözümü proje sınırını
  // tanır. Niteliksiz KOD yalnız kaynağın kendi Projesinde aranır, ad alanlı KOD
  // (`PRJ-A::KOD-X`) yalnız o Projenin kökünde; tesadüfî küresel eşleşme bağ
  // sayılmaz. Kardeş kök okuması TEMBELDİR — ad alanı kullanmayan bir depo
  // denetiminde hiçbir ek disk erişimi doğmaz.
  // Kapının kurucusu TEKTİR (`adAlaniKapisi`): graf yüzü de aynı kurucudan alır,
  // böylece bir hedef bir yüzeyde çözülüp ötekinde kopuk görünemez.
  const adAlaniKapsami = adAlaniKapisi(evren, dizin);

  // Ham kaynak metinleri yükleyiciden gelir (PRF-MK-A03): belirteç girişte
  // normalleştirdiği için ham metin gerekir, fakat yükleyici o metni zaten okumuştur.
  // Tüketicileri dil denetçisi, yeni kanonun şekil nöbeti ve strateji tanılarıdır.

  let toplamHata = 0;
  let toplamUyari = 0;
  const dosyaTanilari = new Map<string, number>();   // karne: en çok tanı üreten dosyalar (YUZ-3)
  // TÜR DÖKÜMÜ ayrı bir sayaç DEĞİLDİR: hata/uyarı toplamlarını üreten aynı tek
  // sayım noktasından beslenir. Bir tanı satırının ağırlığı `ozetlenen ?? 1`dir —
  // gösterim katmanı bir seli tek satıra indirdiğinde o satır katladığı bulguların
  // YERİNE geçtiği için kendi başına da sayılmaz; sayım özetlemeden etkilenmez.
  // `ekDosya`: devredilen köklerin kendi koşumunda sayılan dosya sayısı. Kök
  // önekleri ayrık olduğu için dosya kümeleri çakışmaz ve sayılar toplanabilir.
  const turSayaci = new Map<string, { toplam: number; dosyalar: Set<string>; duzeyler: Set<Duzey>; ekDosya?: number }>();
  // KPS-AYR-A01 · YAS-3.3: dosya etiketi → o dosyanın bulgularının toplandığı
  // Proje kodu. Tablo tek yerde kurulur ve hem hükmün tamlık ölçümü hem de
  // kabuğun proje ayrımlı tablosu ondan okur.
  const bulguGruplari = new Map<string, string>();
  let projeKarneListesi: ProjeKarnesi[] = [];
  const say = (tanilar: Tani[], dosya?: string): void => {
    if (dosya !== undefined && devredildi(dosya)) return;
    const n = tanilar.filter((t) => t.duzey === "hata" || t.duzey === "uyarı").length;
    toplamHata += tanilar.filter((t) => t.duzey === "hata").length;
    toplamUyari += tanilar.filter((t) => t.duzey === "uyarı").length;
    if (dosya && n) dosyaTanilari.set(dosya, (dosyaTanilari.get(dosya) ?? 0) + n);
    for (const t of tanilar) {
      let kayit = turSayaci.get(t.kod);
      if (!kayit) { kayit = { toplam: 0, dosyalar: new Set(), duzeyler: new Set() }; turSayaci.set(t.kod, kayit); }
      kayit.toplam += t.ozetlenen ?? 1;
      kayit.duzeyler.add(t.duzey);
      if (dosya) kayit.dosyalar.add(dosya);
    }
  };

  // göç motor turu A10 kapanışı (2026-07-27): `eski-giriş-adı` geçiş uyarısı emekli edildi —
  // motor eski `ana.sar` adını TANIMAYA devam eder, yalnız ayrı bir tanı basmaz.

  // Konumlu yapısal tanıların satırları giriş dosyasına aittir (ilan yeri).
  // Dört üreticinin çıktısı köken damgası için parça parça işlenir: evre
  // yumuşatması her tanıyı bağımsız eşlediği için parça başına uygulamak
  // birleşik uygulamayla aynı sonucu verir ve akış sırası birebir korunur.
  // GBR-A01 (IDA #4-CLI): EVRE-1 planlama penceresinde declared-but-not-built FORMATİF'e iner;
  // kanıt-ekseni turu (B5): proje-geneli EVRE-2 ise evre ARTEFAKT-YEREL değerlendirilir.
  const planlamaPenceresi = planlamaEvresiMi(ana, programlar);
  const yapisal: Tani[] = [];
  const yapisalParcalar: ReadonlyArray<readonly [string, Tani[]]> = [
    ["denetle", denetle(plan, disk)],
    ["kuralTanilari", kuralTanilari(plan, disk)],
    ["rafsizAnadizinTanilari", rafsizAnadizinTanilari(ana, plan, snf)],
    ["anadizinSekliTanilari", anadizinSekliTanilari(ana, snf)],
  ];
  for (const [uretici, ham] of yapisalParcalar) {
    const islenmis = planlamaPenceresi ? ham.map(evre1Yumusat) : yerelEvre1Yumusat(ham, plan);
    yapisal.push(...koklendir(uretici, islenmis));
  }
  say(yapisal, anaEtiket);
  bas(anaEtiket, yapisal);

  // TAM kapsam (BKM-BUG-A02 · bug-avı M2): referans denetimi TÜM .sar'lara.
  for (const [etiket, p] of programlar) {
    if (muaflar.has(etiket)) continue;
    const refTanilari = koklendir("referansTanilari", referansTanilari(p, indeks, snf, { dosya: etiket, cozulur: (h) => adAlaniKapsami.cozulur(h, etiket) }));
    say(refTanilari, etiket);
    bas(etiket, refTanilari);
  }

  // kanıt-ekseni turu (B9): .md/.ts METİN atıfları — indeksler AYRI (çift tarama bilinçli · STR-2.1).
  for (const { dosya, tani } of koklendirKayit("metinAtifTanilari", metinAtifTanilari(dizindenIndeks(dizin), indeks))) {
    const etiket = relative(dizin, dosya) || dosya;   // köke-göreli etiket (raporla sözleşmesi)
    if (muaflar.has(etiket)) continue;
    say([tani], etiket);
    bas(etiket, [tani]);
  }

  // M-2 (PLN-6): DOSYALAR-ARASI kural-çatışması.
  for (const { dosya, tani } of koklendirKayit("dosyalararasiCatismaTanilari", dosyalararasiCatismaTanilari(programlar))) {
    say([tani], dosya);
    bas(dosya, [tani]);
  }

  // M-2: EBEDİ mühür denetimi (ebedi.kilit.json — değişen/silinen ebedi = hata).
  // MIM-3.4 (KPS-MHR-A01): arşiv mühürlü dosyadaki ebedî kural graftan sessizce
  // düşemez; engel aynı tanıyla HATA verir ve bulgu giriş dosyasına yazılır.
  for (const { dosya, tani } of koklendirKayit("ebediTanilar", ebediTanilar(ebediEnvanter(evren), kilitOku(dizin), arsivEbediEnvanteri(dizin, disk), anaEtiket))) {
    say([tani], dosya);
    bas(dosya, [tani]);
  }

  // doğuş-rehberi turu: mühürlü referans denetimi (`çağır KOD @mühür:` pini ↔ hedef içerik-hash'i).
  for (const { dosya, tani } of koklendirKayit("muhurTanilari", muhurTanilari(evren))) {
    say([tani], dosya);
    bas(dosya, [tani]);
  }

  // MIM-1.7: AltKatman tekilliği bekçisi (Katman içinde departman ve ad TEKİLDİR).
  // Founder hükmü 2026-08-28; kök sebep bir hüküm boşluğuydu ve MIM-1.7 onu kapattı.
  for (const { dosya, tani } of koklendirKayit(
    "altKatmanTekilligiTanilari", altKatmanTekilligiTanilari(programlar, muaflar))) {
    if (muaflar.has(dosya)) continue;
    say([tani], dosya);
    bas(dosya, [tani]);
  }

  // MIM-1.4: katmansız-teknoloji bekçisi (Katman=TEKNOLOJİ ekseni · uyarı + dürüst-beyan).
  for (const { dosya, tani } of koklendirKayit("katmansizTeknolojiTanilari", katmansizTeknolojiTanilari(programlar))) {
    if (muaflar.has(dosya)) continue;
    say([tani], dosya);
    bas(dosya, [tani]);
  }

  // DIL-1.1: dil denetçisi — şapkasız alan adı + NFD ham kaynak (bilgi; ham metin
  // diskten yeniden okunur çünkü belirteç girişte NFC'ler — DIL-1).
  {
    for (const { dosya, tani } of koklendirKayit("dilTanilari", dilTanilari(programlar, hamlar))) {
      if (muaflar.has(dosya)) continue;
      say([tani], dosya);
      bas(dosya, [tani]);
    }
  }

  // YAS-2.1: karar yönlendirme kapısı — gerekli+kilitli+bağsız karar uyarısı.
  for (const { dosya, tani } of koklendirKayit("uygulanmamisKararTanilari", uygulanmamisKararTanilari(programlar))) {
    if (muaflar.has(dosya)) continue;
    say([tani], dosya);
    bas(dosya, [tani]);
  }

  // YAS-2.4: tip birleşimi — aynı düğüme uygulanan kuralların kısıt çelişkisi (⊥).
  for (const { dosya, tani } of koklendirKayit("birlesimCatismaTanilari", birlesimCatismaTanilari(programlar))) {
    if (muaflar.has(dosya)) continue;
    say([tani], dosya);
    bas(dosya, [tani]);
  }

  // davranış-katmanı turu (OGR-2.2): beceri-drift nöbeti — `anlatır:` beyanı çözülmeli.
  for (const { dosya, tani } of koklendirKayit("beceriDriftTanilari", beceriDriftTanilari(programlar, snf))) {
    if (muaflar.has(dosya)) continue;
    say([tani], dosya);
    bas(dosya, [tani]);
  }

  // BKM-OLG-A07: Hatırlatıcı vade kapısı — tarih DIŞARIDAN enjekte edilir (determinizm).
  const bugun = secenek.bugun ?? new Date().toISOString().slice(0, 10);
  for (const [etiket, p] of programlar) {
    if (muaflar.has(etiket)) continue;
    // MIM-1.2: Faz vade nöbeti aynı tarih enjeksiyonuyla (ders dünyası etiketten muaftır).
    const vade = koklendir("fazVadeTanilari", [...fazVadeTanilari(p, bugun, etiket)]);
    say(vade, etiket);
    bas(etiket, vade);
  }

  // ORK-8 mevsim ritüeli (Founder ölçümü 2026-08-27): vadesi geçmiş bir mevsim hâlâ
  // açık Adım sarıyorsa beyan ile graf ayrışmıştır. Karar PROJE kapsamındadır —
  // Faz ile sardığı Bloklar ayrı dosyalarda yaşar; bu yüzden tek-dosya turunun
  // içinde değil, programların tamamı okunduktan sonra koşar.
  for (const { dosya, tani } of koklendirKayit("mevsimVadeTanilari", mevsimVadeTanilari(programlar, bugun))) {
    if (muaflar.has(dosya)) continue;
    say([tani], dosya);
    bas(dosya, [tani]);
  }

  // ORK-8 mühür dürüstlüğü (KPS-MVS-A01 ikinci teslim · 2026-09-10): metninde
  // mühürlendiğini ya da açık işini devrettiğini yazan bir mevsim hâlâ açık Adım
  // sarıyorsa beyan ile graf çelişmiştir. Tarih okumaz, vade bekçisiyle aynı
  // çözücüyü paylaşır ve aynı sebeple proje kapsamında koşar.
  for (const { dosya, tani } of koklendirKayit("mevsimMuhurTanilari", mevsimMuhurTanilari(programlar))) {
    if (muaflar.has(dosya)) continue;
    say([tani], dosya);
    bas(dosya, [tani]);
  }

  // KRR-MUT B1: dosya-içi doğrulama KAPIDA — bilgi SÜZÜLMEZ (MIM-1 prova bulgusu).
  // hatırlatıcı-rayı turu (FİKİR-2): açık/kararlaşmış-hatırlatıcı tanıları CLI'de tek özete toplanır.
  const HTR_TANI_KODLAR = new Set(["açık-hatırlatıcı", "kararlaşmış-hatırlatıcı"]);
  // MIM-1.5 sinyal hijyeni (RF-T3-A01): çıplak-adımlı-katman ölçüm bilgisi de CLI'de
  // TEK özete iner — 100+ satırlık sel önemli uyarıyı boğar (dikkat yorgunluğu =
  // uyarıların önemsenmemesinin makine tarafı); sayım korunur, ayrıntı panel/tekilde.
  const CIPLAK_KOD = "çıplak-adımlı-katman";
  // YAS-1.1 · TEK OLGU TEK BİLDİRİM (KPS-REJ-A01): `çıplak-adımlı-katman` dosya
  // kapsamında ölçülür ve rejimi bilemez. Katı rejimde aynı olgu
  // `katı-rejim-altkatman-eksik` ile HATA düzeyinde konuştuğu için bilgi düzeyli
  // tavsiye orada hem sayımdan hem gösterimden düşer; esnek rejimde yerinde kalır.
  const katiKapsam = katiRejimliDosyalar(programlar, muaflar);
  const hatirlaticiTanilari: Array<{ dosya: string; tani: Tani }> = [];
  const ciplakTanilari: Array<{ dosya: string; tani: Tani }> = [];
  for (const [etiket, p] of programlar) {
    if (muaflar.has(etiket)) continue;   // bilerek-hatalı: tanı raporlanmaz (listede görünür)
    const dosyaIci = koklendir("dogrula", dogrula(p, snf, etiket, hamlar.get(etiket), { ozetle }))   // RF-T6-A04: ÖzelKural hedef-süzgeci · ham metin: şekil nöbeti
      .filter((t) => !(t.kod === CIPLAK_KOD && katiKapsam.has(etiket)));
    say(dosyaIci, etiket);   // sayım TÜM tanılar (davranış korunur)
    bas(etiket, dosyaIci.filter((t) => !HTR_TANI_KODLAR.has(t.kod) && t.kod !== CIPLAK_KOD));
    for (const t of dosyaIci.filter((t) => HTR_TANI_KODLAR.has(t.kod))) hatirlaticiTanilari.push({ dosya: etiket, tani: t });
    for (const t of dosyaIci.filter((t) => t.kod === CIPLAK_KOD)) ciplakTanilari.push({ dosya: etiket, tani: t });
  }
  // Hatırlatıcı tanıları: çok olunca tek özete iner (gösterim≠sayım · A02 deseni).
  for (const { dosya, tani } of koklendirKayit("acikHatirlaticiGosterimi", acikHatirlaticiGosterimi(hatirlaticiTanilari, gosterimEsigi))) bas(dosya, [tani]);
  // Çıplak-katman: tek özet satırı (MIM-1.5 — ölçüm bilgisi, ceza değil).
  if (ciplakTanilari.length && ozetle) {
    const ornekler = ciplakTanilari.slice(0, 3).map(({ dosya, tani }) => `${dosya}:${tani.satir}`).join(" · ");
    bas(ciplakTanilari[0].dosya, koklendir("gozlemOzeti", [{
      ...eskiTani("çıplak-adımlı-katman", "bilgi",
        { özet: true, sayı: ciplakTanilari.length, örnekler: ornekler },
        { satir: ciplakTanilari[0].tani.satir, sutun: 1 }),
      ozetlenen: ciplakTanilari.length,
    }]));
  } else {
    for (const { dosya, tani } of ciplakTanilari) bas(dosya, [tani]);
  }

  // KRR-MUT B3: yinelenen-kod.
  for (const { dosya, tani } of koklendirKayit("yinelenenKodTanilari", yinelenenKodTanilari(programlar))) {
    say([tani], dosya);
    bas(dosya, [tani]);
  }

  // ORK-3.1: DAG döngü-denetimi — bağımlı/besler grafiği çevrimselse hata (saf dag.ts).
  // ORK-4 (KPS-ADA-A01 · ikinci tur): yürütme kenarı da ad alanını tanır. Kardeş
  // kök kapısı referans çözümünün TA KENDİSİDİR — ikinci bir çözücü kurulmaz, yoksa
  // aynı hedef bir yüzeyde çözülür ötekinde kopuk görünürdü.
  const dag = dagKur(evren, { adAlaniCozulur: (h, d) => adAlaniKapsami.cozulur(h, d) });
  for (const { dosya, tani } of koklendirKayit("dagTanilari", dagTanilari(dag))) {
    say([tani], dosya);
    bas(dosya, [tani]);
  }

  // ORK-1.2: gizli-bağımlılık kapısı — prose'da çözülür KOD saklanamaz.
  for (const { dosya, tani } of koklendirKayit("gizliBagimlilikTanilari", gizliBagimlilikTanilari(programlar, indeks, muaflar))) {
    say([tani], dosya);
    bas(dosya, [tani]);
  }

  // BKM-SNV2-A02: kavuşumsuz-paralellik — Sözleşme köprüsüz takım-arası bağ (contract-first).
  for (const { dosya, tani } of koklendirKayit("kavusumsuzParalellikTanilari", kavusumsuzParalellikTanilari(programlar, indeks, snf, muaflar))) {
    say([tani], dosya);
    bas(dosya, [tani]);
  }

  // E1-A04 (MIM-1.4 · IDA dogfood): doğuş-sırası — teknoloji/yasa omurgası yoksa uyar.
  for (const { dosya, tani } of koklendirKayit("dogusEksikProjeTanilari", dogusEksikProjeTanilari(programlar, muaflar))) {
    say([tani], dosya);
    bas(dosya, [tani]);
  }

  // B2=A (YAS-4.2): olgunluk-onayı — EVRE-1→EVRE-2 geçiş hatırlatıcısı (kesmez).
  for (const { dosya, tani } of koklendirKayit("olgunlukOnayiTanilari", olgunlukOnayiTanilari(programlar, muaflar))) {
    say([tani], dosya);
    bas(dosya, [tani]);
  }

  // E1-A02 (MIM-1.3 · IDA dogfood): silo-blok — tek-yüz + güvenliksiz Blok dikey dilim değil.
  for (const { dosya, tani } of koklendirKayit("siloBlokTanilari", siloBlokTanilari(programlar, indeks, snf, muaflar))) {
    say([tani], dosya);
    bas(dosya, [tani]);
  }

  // E1-A03 (TIP-2.3 üst kademe): kavuşumsuz-dilim — Blok'ta FE+BE var ama bağlanmamış.
  for (const { dosya, tani } of koklendirKayit("kavusumsuzDilimTanilari", kavusumsuzDilimTanilari(programlar, indeks, snf, muaflar))) {
    say([tani], dosya);
    bas(dosya, [tani]);
  }

  // MOTOR SUSMAZ (Founder 2026-07-14): açık Adımlar neden'iyle gündemde kalır.
  const acikAdimlar = acikAdimTanilari(programlar, muaflar);
  // GBR-A02 (IDA #14): çok beklemede-Adım tek satıra özetlenir (tam liste sayım için AYNEN).
  // Sayım KATLANMAMIŞ listeden alınır (hatırlatıcı/çıplak deseni · A02): özet satırı
  // bütün bulguları TEK dosyaya yazar, oysa tür dökümü bunların kaç ayrı dosyaya
  // yayıldığını da söylemek zorundadır — yayılım fold anında kaybolan bilgidir.
  for (const { dosya, tani } of acikAdimlar) say([tani], dosya);
  for (const { dosya, tani } of koklendirKayit("acikAdimGosterimi", acikAdimGosterimi(acikAdimlar, gosterimEsigi))) bas(dosya, [tani]);

  // DURUMSUZ-ADIM (EKL-F6 dersi · YAS-3.4): durum: taşımayan Adım motor-kör kalır.
  for (const { dosya, tani } of koklendirKayit("durumsizAdimTanilari", durumsizAdimTanilari(programlar, muaflar))) {
    say([tani], dosya);
    bas(dosya, [tani]);
  }

  // YAS-2.3 (BKM-BUG-A01): kapsam-çözümü — çözülmeyen/boş kural kapsamı sessiz kalamaz.
  for (const { dosya, tani } of koklendirKayit("kapsamTanilari", kapsamTanilari(programlar, indeks, snf, muaflar))) {
    say([tani], dosya);
    bas(dosya, [tani]);
  }

  // ORK-3.3: Döngü sağlığı — kırık-koşar (uyarı) + durunca v1-sözlüğü (bilgi).
  for (const { dosya, tani } of koklendirKayit("donguTanilari", donguTanilari(programlar, indeks, muaflar))) {
    say([tani], dosya);
    bas(dosya, [tani]);
  }

  // Yapı-yalınlığı önerisi: — tek-çocuklu kapsayıcı bilgiyle işaretlenir.
  for (const { dosya, tani } of koklendirKayit("tekCocukTanilari", tekCocukTanilari(programlar))) {
    if (muaflar.has(dosya)) continue;
    say([tani], dosya);
    bas(dosya, [tani]);
  }

  // göç motor turu A10 kapanışı (2026-07-27): kırıntı-Adım bekçisi emekli edildi; aşırı bölme
  // hükmü MIM-1.6 `adım-atomikliği` tanısında yaşar.

  // ORK-3.1: durum-tutarlılığı — öncül bitmeden iş bitmiş olamaz (GLM lig bulgusu).
  for (const { dosya, tani } of koklendirKayit("durumTutarlilikTanilari", durumTutarlilikTanilari(dag))) {
    if (muaflar.has(dosya)) continue;
    say([tani], dosya);
    bas(dosya, [tani]);
  }

  // MIM-2: yetim-meyve kapısı — beyansız kod dosyası plandan önde koşamaz.
  for (const { dosya, tani } of koklendirKayit("yetimMeyveTanilari", yetimMeyveTanilari(programlar, disk))) {
    say([tani], dosya);
    bas(dosya, [tani]);
  }

  // ORK-1.2 ①: kopuk-zincir — çözülmeyen bağımlı/besler kenarı sessizce düşemez.
  for (const { dosya, tani } of koklendirKayit("kopukZincirTanilari", kopukZincirTanilari(dag))) {
    if (muaflar.has(dosya)) continue;
    say([tani], dosya);
    bas(dosya, [tani]);
  }

  // TUR-2 (Terra kanıtı): öz-bağımlılık — kendine kenar sessizce atlanamaz, HATA.
  for (const { dosya, tani } of koklendirKayit("ozBagimlilikTanilari", ozBagimlilikTanilari(dag))) {
    if (muaflar.has(dosya)) continue;
    say([tani], dosya);
    bas(dosya, [tani]);
  }

  // ORK-1.2 (ZINCIR-A04): kayıp-kenar — başkasının meyvesini kullanan kenarsız Adım.
  for (const { dosya, tani } of koklendirKayit("kayipKenarTanilari", kayipKenarTanilari(dag, programlar))) {
    if (muaflar.has(dosya)) continue;
    say([tani], dosya);
    bas(dosya, [tani]);
  }

  // BKM-OLG-A03: doc-drift — tamamlandı Adım'ın dosyalı meyvesi diskte olmalı.
  for (const { dosya, tani } of koklendirKayit("docDriftTanilari", docDriftTanilari(programlar, disk, dizin))) {
    if (muaflar.has(dosya)) continue;
    say([tani], dosya);
    bas(dosya, [tani]);
  }

  // MIM-3 çift-yönlü: beyansız-yapı — kökteki her klasör giriş dosyasında ilan edilmeli.
  for (const { dosya, tani } of koklendirKayit("beyansizYapiTanilari", beyansizYapiTanilari(plan, dizin, anaEtiket))) {
    say([tani], dosya);
    bas(dosya, [tani]);
  }

  // MIM-3 dosya düzeyi: ilansız-gövde — kitaplığa ya da köke konan kaynak
  // gövdesinin ilanı giriş dosyasında yazmalıdır. Bekçi GÖZLEM düzeyinde
  // doğar, çünkü yönetişim kanonu yeni bir hükmün doğrudan hata ya da uyarı
  // düzeyinde doğmasını yasaklar: hüküm önce izlenir, sayacı sıfırlanınca ve
  // tekrar üretilebilirliği kanıtlanınca ayrı bir kararla bir kademe yükselir.
  for (const { dosya, tani } of koklendirKayit("ilansizGovdeDenetle", ilansizGovdeDenetle(plan, disk, anaEtiket))) {
    say([tani], dosya);
    bas(dosya, [tani]);
  }

  // MIM-3.4 · DOSYA MÜHÜRLERİ (KPS-MHR-A01 · Founder hükmü 2026-09-11): mühür
  // hiçbir zaman sessiz değildir. Arşiv ile sonra mühürlü dosyalar disk anlık
  // görüntüsünde ayrı durur ve hiçbir yükleyici onları okumaz; bu bekçi onları,
  // eğitim mühürlü dosyalarla birlikte, türüyle ve adıyla listeler ve mühür
  // biçimine uymayan adı uyarır.
  for (const { dosya, tani } of koklendirKayit("dosyaMuhruTanilari", dosyaMuhruTanilari(disk, dizin, bugun, anaEtiket))) {
    say([tani], dosya);
    bas(dosya, [tani]);
  }

  // DIL-1.2 ②: ad-ayracı — .sar dosya adında tire yerine alt-çizgi önerilir (bilgi).
  for (const { dosya, tani } of koklendirKayit("adAyraciTanilari", adAyraciTanilari(programlar))) {
    if (muaflar.has(dosya)) continue;
    say([tani], dosya);
    bas(dosya, [tani]);
  }

  // BKM-KRR-B02: kırık-halef / halef-döngü — halef geçerli, canlı bir karara işaret etmeli.
  for (const { dosya, tani } of koklendirKayit("halefTanilari", halefTanilari(programlar))) {
    if (muaflar.has(dosya)) continue;
    say([tani], dosya);
    bas(dosya, [tani]);
  }

  // MIM-1.4: teknolojisiz-yüzey — teknoloji seçilmeden ekran/uç doğamaz (BKM-KAPI-A02).
  for (const { dosya, tani } of koklendirKayit("teknolojisizYuzeyTanilari", teknolojisizYuzeyTanilari(programlar, indeks))) {
    if (muaflar.has(dosya)) continue;
    say([tani], dosya);
    bas(dosya, [tani]);
  }

  // Yapısal-hiyerarşi (Founder MECBURİ 2026-07-14 · MIM-1): tam zincir Faz→Blok→Katman→Adım.
  for (const { dosya, tani } of koklendirKayit("hiyerarsiTanilari", hiyerarsiTanilari(programlar))) {
    if (muaflar.has(dosya)) continue;
    say([tani], dosya);
    bas(dosya, [tani]);
  }

  // Dayanak nöbeti (RF-T6-A02 · Sol ⑤): kuralın kendisini doğuran karara bağlanıp
  // bağlanmadığı denetlenir. göç motor turu A99 kapanışı (2026-07-27): burada eskiden bir
  // `kokenHalef` sayacı vardı ve `dayanak-halef` bulgularını listeden ayırıp
  // karnede tek satıra indiriyordu. O tanı göç motor turu A10 kapanışı Adımında emekli edildiği
  // için sayaç bir daha hiç dolmuyordu ve beslediği karne cümlesi hiç basılamıyordu;
  // yani ölü koddu. Sayaç, alanı ve karne cümlesi birlikte kaldırıldı — kapatılan
  // hastalığın (D-8: beyan edilen davranış ile ölçen davranışın ayrışması) başka
  // dosyada yeniden doğmasına izin verilmedi.
  for (const { dosya, tani } of koklendirKayit("dayanakTanilari", dayanakTanilari(programlar))) {
    if (muaflar.has(dosya)) continue;
    say([tani], dosya);
    bas(dosya, [tani]);
  }

  // ORK-3.4 · öncelik beyanının varlığı ve YUZ-3.4 · ateşlemiş hatırlatıcı
  // (2026-08-22 · Founder onaylı iki gözlem). İkisi de BİLGİ düzeyindedir ve
  // kapıyı doldurmaz; bekleyen işi görünür kılarlar, iş yapmaya zorlamazlar.
  for (const { dosya, tani } of koklendirKayit("onceliksizAdimTanilari", onceliksizAdimTanilari(programlar))) {
    say([tani], dosya);
    bas(dosya, [tani]);
  }
  for (const { dosya, tani } of koklendirKayit("atesleyenHatirlaticiTanilari", atesleyenHatirlaticiTanilari(programlar))) {
    say([tani], dosya);
    bas(dosya, [tani]);
  }

  // RF-T6-A05: kullanımsız-tip bekçisi — YALNIZ DOGFOOD (kanon-sahibi kendi deposu).
  if (existsSync(join(dizin, "oz", "siniflama", "kayit.json"))) {
    for (const { dosya, tani } of koklendirKayit("kullanimsizTipTanilari", kullanimsizTipTanilari(programlar, snf, anaEtiket))) {
      say([tani], dosya);
      bas(dosya, [tani]);
    }
  }

  // ══ YENİ KANON · PROJE KAPSAMI (motor turu ikinci halkası) ═════════════════
  //   On bir üretici, elli beş tanıyı bütün Proje indeksi üstünde koşar. Her
  //   üretici KENDİ kapısıdır: biri düşerse akış durmaz, fakat atlanan kapı
  //   kaydedilir ve sonuç asla tam yeşil sayılmaz (aşağıdaki sahte-tam-yeşil
  //   hükmü ile çıkış kodu invaryantı).
  const atlananKapilar: string[] = [];
  const yeniProjeTanilari: Array<{ dosya: string; tani: Tani }> = [];
  const kapiKos = (ad: string, uretici: string, f: () => Array<{ dosya: string; tani: Tani }>): void => {
    try {
      for (const kayit of f()) {
        if (muaflar.has(kayit.dosya) || devredildi(kayit.dosya)) continue;
        koken.set(kayit.tani, uretici);
        yeniProjeTanilari.push(kayit);
      }
    } catch {
      atlananKapilar.push(ad);
    }
  };
  kapiKos("rejim", "rejimTanilari", () => rejimTanilari(programlar, muaflar));
  kapiKos("omurga", "omurgaTanilari", () => omurgaTanilari(programlar, indeks, disk, muaflar));
  kapiKos("ilişki sınıfları", "iliskiSinifiTanilari", () => iliskiSinifiTanilari(programlar, indeks, muaflar));
  kapiKos("kimlik omurgası", "authTanilari", () => authTanilari(programlar, muaflar));
  kapiKos("iş bölümü", "sefAkisiTanilari", () => sefAkisiTanilari(programlar, muaflar));
  kapiKos("dil ve numara grafı", "dilKanonTanilari", () => dilKanonTanilari(programlar, disk, dizin, muaflar));
  kapiKos("öğretim", "ogretimTanilari", () => ogretimTanilari(programlar, snf, disk, dizin, muaflar));
  kapiKos("strateji ve göç", "stratejiTanilari", () => stratejiTanilari(programlar, hamlar, indeks, dizin, muaflar, disk));
  kapiKos("tip evreni", "tipEvreniTanilari", () => tipEvreniTanilari(snf, siniflamaOrtuYukle(dizin), anaEtiket));
  kapiKos("terfi kanıtı", "terfiKanitiTanilari", () => terfiKanitiTanilari(programlar, muaflar));
  kapiKos("yüzeyler", "yuzTanilari", () => yuzTanilari(programlar, snf, disk, dizin, muaflar));

  // Sayım KATLANMAMIŞ listeden (A02 deseni): Proje kapısının özeti bütün bulguları
  // TEK dosyaya yazar; tür dökümü ise yayılımı da söylemek zorundadır.
  for (const { dosya, tani } of yeniProjeTanilari) say([tani], dosya);
  for (const { dosya, tani } of gozlemOzetle(yeniProjeTanilari, ozetle)) bas(dosya, koken.has(tani) ? [tani] : koklendir("gozlemOzeti", [tani]));

  // ══ YENİ KANON · ORKESTRASYON KAPSAMI (altı tanı) ══════════════════════════
  //   Karar mantığı ayrı ve saf bir işlevde yaşar (orkestrasyonTanilari) — böylece
  //   motorun kendi dürüstlüğünü denetleyen bu altı hüküm, arıza enjekte edilerek
  //   sınanabilir; koşulu ancak motor bozulduğunda sağlandığı için başka türlü
  //   kanıtlanamazdı.
  {
    const projeKodlari = new Set<string>();
    for (const [etiket, p] of evren) {
      if (muaflar.has(etiket)) continue;
      if (DERS_DUNYASI.test(etiket)) continue;   // OGR-5: ders/şablon Projesi ürün kimliği değildir
      const gez = (d: Dugum): void => {
        if (d.tur === "widget" && d.ad === "Proje") {
          const k = [...d.parametreler, ...d.ozellikler].find((x) => x.ad === "kod")?.deger.metin;
          if (k) projeKodlari.add(k);
        }
        for (const c of d.cocuklar) gez(c);
      };
      for (const b of p.bildirimler) gez(b);
    }
    // KPS-AYR-A01 · YAS-3.3: bulgunun evi dizin YOLUNDAN değil Proje KODUNDAN
    // türer. Sahiplik `projeSahibi` ile çözülür ve bu, karne ile grafın okuduğu
    // yordamın TA KENDİSİDİR; ikinci bir sahiplik hesabı yazılmaz, çünkü iki
    // hesap aynı dosyayı iki ayrı projeye yazabilir ve kanon bunu yasaklar.
    const projeKapsamListesi = kokKapsamlari;
    for (const r of akis) {
      if (bulguGruplari.has(r.dosya)) continue;
      const kod = projeSahibi(r.dosya, projeKapsamListesi);
      if (kod) bulguGruplari.set(r.dosya, kod);
    }
    const orkestrasyon = koklendirKayit("orkestrasyonTanilari", orkestrasyonTanilari({
      uretilen: akis.flatMap((r) => r.tanilar.map((t) => ({ dosya: r.dosya, tani: t }))),
      projeKapisi: yeniProjeTanilari,
      projeKodlari,
      bulguGruplari,
      atlananKapilar,
      sicil: taniSicili(snf),
      anaEtiket,
    }));
    // Kök devri varsa her hanenin karnesi kökün KENDİ koşumundan gelir (aşağıda);
    // çatı grafından hesaplanan karne o kökün kendi tablosuyla aynı olmazdı.
    projeKarneListesi = projeKodlari.size > 1 && !devir.length ? projeKarneleri(dag, projeKapsamListesi) : [];
    for (const { dosya, tani } of orkestrasyon) say([tani], dosya);
    for (const { dosya, tani } of gozlemOzetle(orkestrasyon, ozetle)) bas(dosya, koken.has(tani) ? [tani] : koklendir("gozlemOzeti", [tani]));
  }

  // ── Özet verileri (metin kurulumu kabukta — burada yalnız VERİ) ──────────────
  const krn = karneOzeti(dag);
  let dersAcik = dersAcikAdimSayisi(programlar);
  let dynUrun = 0, dynOrnek = 0;
  for (const [dosya, p] of programlar) {
    const n = dayanaksizKurallar(p).length;
    if (!n) continue;
    if (DERS_DUNYASI.test(dosya)) dynOrnek += n; else dynUrun += n;
  }
  let kuralsizK = dayanaksizKararlar(programlar).length;
  let beyanli = 0;
  for (const [dosya, p] of programlar) if (!DERS_DUNYASI.test(dosya)) beyanli += beyanliDayanaksizKurallar(p).length;

  // ── KÖK DEVRİ: devredilen her Proje kökü kendi kökünden koşar ve döner ─────
  //   Sonuç, kökün öneki eklenerek çatının akışına, sayaçlarına ve tür dökümüne
  //   katılır. Tanı nesneleri OLDUĞU GİBİ taşınır ve köken damgaları da onlarla
  //   gelir, dolayısıyla eklentinin üretici süzgeci çatı kökünde de aynı kararı
  //   verir. Hanenin karnesi de kökün kendi koşumundan okunur.
  for (const k of devir) {
    const alt = denetimKosGovde(join(dizin, k.onek.replace(/\/+$/, "")), { ...secenek, anaYolu: undefined });
    const etiketle = (d: string): string => (isAbsolute(d) ? d : `${k.onek}${d}`);
    for (const r of alt.akis) {
      for (const t of r.tanilar) { const u = alt.koken.get(t); if (u !== undefined) koken.set(t, u); }
      akis.push({ dosya: etiketle(r.dosya), tanilar: r.tanilar });
    }
    toplamHata += alt.toplamHata;
    toplamUyari += alt.toplamUyari;
    for (const [d, n] of alt.dosyaTanilari) dosyaTanilari.set(etiketle(d), (dosyaTanilari.get(etiketle(d)) ?? 0) + n);
    for (const r of alt.turDokumu) {
      let kayit = turSayaci.get(r.kod);
      if (!kayit) { kayit = { toplam: 0, dosyalar: new Set(), duzeyler: new Set() }; turSayaci.set(r.kod, kayit); }
      kayit.toplam += r.toplam;
      kayit.ekDosya = (kayit.ekDosya ?? 0) + r.dosyaSayisi;
      for (const d of r.duzeyler) kayit.duzeyler.add(d);
    }
    for (const a of alt.acikAdimlar) acikAdimlar.push({ dosya: etiketle(a.dosya), tani: a.tani });
    if (!alt.tamKosum) atlananKapilar.push(`${k.kod} kökü`);
    for (const a of alt.atlananKapilar ?? []) atlananKapilar.push(`${k.kod} · ${a}`);
    dersAcik += alt.dersAcik;
    dynUrun += alt.dayanak.urun;
    dynOrnek += alt.dayanak.ornek;
    beyanli += alt.dayanak.beyanli;
    kuralsizK += alt.dayanak.kuralsizKarar;
    const icKarneler = alt.projeGruplari.flatMap((g) => (g.karne ? [g.karne] : []));
    if (icKarneler.length) projeKarneListesi.push(...icKarneler);
    else if (alt.karne) {
      const ad = dag.dugumler.get(k.kod)?.ad;
      projeKarneListesi.push({ kod: k.kod, ...(ad ? { ad } : {}), ...alt.karne });
    }
  }
  if (devir.length) {
    for (const r of akis) {
      if (bulguGruplari.has(r.dosya)) continue;
      const kod = projeSahibi(r.dosya, kokKapsamlari);
      if (kod) bulguGruplari.set(r.dosya, kod);
    }
  }

  return {
    // Tam yeşil invaryantı: atlanan zorunlu kapı varken sonuç yeşil DÖNEMEZ —
    // eksik denetim, temizlik kanıtı değildir.
    cikis: toplamHata + toplamUyari === 0 && atlananKapilar.length === 0
      ? 0 : (toplamHata > 0 || atlananKapilar.length > 0 ? 4 : 0),
    akis, koken, tamKosum: true, anaEtiket, muaflar, toplamHata, toplamUyari, dosyaTanilari,
    projeGruplari: projeGruplariKur(akis, bulguGruplari, projeKarneListesi),
    adAlani: { ortakKod: dag.ortakKod, ayrisamayan: dag.ayrisamayan },
    turDokumu: turDokumuKur(turSayaci),
    karne: krn, dersAcik, acikAdimlar, atlananKapilar,
    dayanak: { urun: dynUrun, ornek: dynOrnek, beyanli, kuralsizKarar: kuralsizK },
  };
}

/** Tek bir Projenin bulgu hanesi — kimliği kod, sayıları kendi dosyalarından. */
export interface ProjeBulguGrubu {
  /** Tekil Proje kodu — grubun kimliği budur, dizin yolu DEĞİL (YAS-3.3). */
  kod: string;
  /** Projenin insan adı (anadizinde ilan edilmişse). */
  ad?: string;
  hata: number;
  uyari: number;
  bilgi: number;
  /** Bulgu taşıyan dosya sayısı — hanenin yayılımı. */
  dosyaSayisi: number;
  /** Projenin KENDİ karnesi — çatı düzeyinde tek sayının yerine geçer. */
  karne?: ProjeKarnesi;
  /**
   * ÇATININ KENDİ HANESİ. Çatı ilanı hiçbir Projenin malı değildir ve ona bir
   * Proje sahibi aramak kimlikleri birleştirmek olurdu (MIM-1.1). Buna karşılık
   * o dosyanın bulguları da kaybolamaz: kendi hanesinde, kodsuz olarak durur.
   * Hane toplamları tür dökümüyle mutabık kalsın diye vardır — tabloda eksilen
   * bir bulgu, tablonun kendisini güvenilmez kılar.
   */
  catininKendisi?: true;
}

/**
 * Akıştaki bulguları Proje hanelerine dağıtır (KPS-AYR-A01). Gruplama tablosu
 * boşsa liste de boştur: tek projeli bir depoda hane açılmaz ve kabuk hiçbir
 * yeni satır basmaz. Bir dosyanın evi yoksa hanesiz kalır ve bu sessizlik
 * DEĞİLDİR — aynı olgu `proje-tanı-kimliği-uyumsuz` hükmünde ayrıca ölçülür.
 */
export function projeGruplariKur(
  akis: readonly DenetimRapor[],
  bulguGruplari: ReadonlyMap<string, string>,
  karneler: readonly ProjeKarnesi[],
): ProjeBulguGrubu[] {
  if (!bulguGruplari.size) return [];
  const kutu = new Map<string, ProjeBulguGrubu>();
  const al = (kod: string): ProjeBulguGrubu => {
    let g = kutu.get(kod);
    if (!g) {
      const krn = karneler.find((k) => k.kod === kod);
      g = { kod, ...(krn?.ad ? { ad: krn.ad } : {}), hata: 0, uyari: 0, bilgi: 0, dosyaSayisi: 0, ...(krn ? { karne: krn } : {}) };
      kutu.set(kod, g);
    }
    return g;
  };
  for (const k of karneler) al(k.kod);
  const cati: ProjeBulguGrubu = { kod: "", hata: 0, uyari: 0, bilgi: 0, dosyaSayisi: 0, catininKendisi: true };
  for (const r of akis) {
    if (!r.tanilar.length) continue;
    const kod = bulguGruplari.get(r.dosya);
    const g = kod ? al(kod) : cati;
    g.dosyaSayisi++;
    for (const t of r.tanilar) {
      const agirlik = t.ozetlenen ?? 1;
      if (t.duzey === "hata") g.hata += agirlik;
      else if (t.duzey === "uyarı") g.uyari += agirlik;
      else g.bilgi += agirlik;
    }
  }
  const liste = [...kutu.values()].sort((a, b) => a.kod.localeCompare(b.kod, "tr"));
  return cati.dosyaSayisi ? [...liste, cati] : liste;
}

/** Düzey ağırlığı — döküm en ağır düzeyi başa yazar. */
const DUZEY_AGIRLIGI: Readonly<Record<Duzey, number>> = { hata: 0, "uyarı": 1, bilgi: 2 };

/**
 * Tek sayım noktasının biriktirdiği ham tabloyu dışa açık dökme dönüştürür.
 * Sıralama bulgu sayısına göre azalandır ki en ağır tür başta görünsün; eşitlik
 * durumunda kimlik alfabetik sıraya düşer (aynı çalışma alanı iki koşumda aynı
 * dökümü verir — determinizm ölçümün ön koşuludur).
 */
function turDokumuKur(
  sayac: ReadonlyMap<string, { toplam: number; dosyalar: Set<string>; duzeyler: Set<Duzey>; ekDosya?: number }>,
): TurDokumSatiri[] {
  return [...sayac].map(([kod, v]) => ({
    kod,
    toplam: v.toplam,
    dosyaSayisi: v.dosyalar.size + (v.ekDosya ?? 0),
    duzeyler: [...v.duzeyler].sort((a, b) => DUZEY_AGIRLIGI[a] - DUZEY_AGIRLIGI[b]),
  })).sort((a, b) => b.toplam - a.toplam || a.kod.localeCompare(b.kod, "tr"));
}

/** Düzeyi bağlama göre değişen kanonik tanılar — yüz tutarlılığı bunları muaf tutar. */
const BAGLAMA_GORE_DUZEY: ReadonlySet<string> = new Set([
  "karşılıksız-metin-atfı", "kenar-metin", "kayıp-yapı", "harf-farkı",
  "kırık-referans", "dayanaksız-kural", "açık-adım", "gizli-bağımlılık",
  "çıplak-adımlı-katman", "durum-tutarsızlığı",
]);

/** Bir koşumda aynı yeni tanıdan kaç bulgu tekil olarak basılır. */
const GOZLEM_TEKIL_SINIRI = 3;

/**
 * Görünürlük ve tanı dürüstlüğü hükmü, yinelenen aynı-kök bulguların anlam
 * kaybetmeden özetlenmesini ister: sayım korunur, ilk üç örnek tek tek görünür
 * ve kalanı tek satıra iner. Özet yalnız yeni kanonun tanılarına uygulanır.
 *
 * Katlanan bulguların sayısı özet satırının `ozetlenen` alanına yazılır; böylece
 * akışı okuyan sayaç satırları değil gerçek bulguları toplar. `ozetle` false
 * verilirse hiçbir katlama uygulanmaz ve tam liste döner.
 */
function gozlemOzetle(kayitlar: Array<{ dosya: string; tani: Tani }>, ozetle = true): Array<{ dosya: string; tani: Tani }> {
  if (!ozetle) return kayitlar;
  const sayac = new Map<string, number>();
  for (const { tani } of kayitlar) {
    if (!YENI_TANI_INDEKS.has(tani.kod)) continue;
    sayac.set(tani.kod, (sayac.get(tani.kod) ?? 0) + 1);
  }
  const out: Array<{ dosya: string; tani: Tani }> = [];
  const gorulen = new Map<string, number>();
  for (const kayit of kayitlar) {
    const toplam = sayac.get(kayit.tani.kod);
    if (toplam === undefined || toplam <= GOZLEM_TEKIL_SINIRI) { out.push(kayit); continue; }
    const n = (gorulen.get(kayit.tani.kod) ?? 0) + 1;
    gorulen.set(kayit.tani.kod, n);
    if (n <= GOZLEM_TEKIL_SINIRI) { out.push(kayit); continue; }
    if (n !== GOZLEM_TEKIL_SINIRI + 1) continue;
    out.push({
      dosya: kayit.dosya,
      tani: {
        duzey: kayit.tani.duzey, kod: kayit.tani.kod,
        mesaj: ORTAK_TANI_METINLERI.projeBulguOzeti({ toplam, sınır: GOZLEM_TEKIL_SINIRI }),
        satir: kayit.tani.satir, sutun: kayit.tani.sutun,
        oneri: kayit.tani.oneri,
        ozetlenen: toplam - GOZLEM_TEKIL_SINIRI,
      },
    });
  }
  return out;
}

/** Orkestrasyon hükümlerinin girdisi — motorun kendi çıktısı üstünde konuşur. */
export interface OrkestrasyonGirdisi {
  /** Koşumda üretilen bütün tanılar, dosyalarıyla. */
  uretilen: Array<{ dosya: string; tani: Tani }>;
  /** Proje kapısının ürettiği yeni kanon tanıları. */
  projeKapisi: Array<{ dosya: string; tani: Tani }>;
  /** Çalışma alanındaki tekil Proje kodları. */
  projeKodlari: ReadonlySet<string>;
  /**
   * BULGU GRUPLARI (KPS-AYR-A01 · YAS-3.3): dosya etiketi → o dosyanın
   * bulgularının toplandığı Proje kodu. Tablo verilmediğinde hüküm gruplamanın
   * HİÇ yapılmadığını anlar ve kırmızı yanar; verildiğinde tablonun TAMLIĞINI
   * ölçer. Alan bilerek isteğe bağlıdır: `orkestrasyonTanilari` saf bir
   * işlevdir ve nöbet onu gruplamasız da çağırabilmelidir, çünkü hükmün
   * kırmızıya döndüğü hâl de sınanmak zorundadır.
   */
  bulguGruplari?: ReadonlyMap<string, string>;
  /** Çalıştırılamayan zorunlu denetim kapıları. */
  atlananKapilar: readonly string[];
  /** Kanonik tanı sicili. */
  sicil: ReadonlySet<string>;
  /** Giriş dosyasının etiketi — kapsam ötesi bulguların konumu. */
  anaEtiket: string;
  /**
   * Tanı kimliğinden SUNUM YÜZEYİNE eşleme (YUZ-3.3). Yüzey turu bu tabloyu
   * kurar; motor tarafı verilmediğinde hüküm sessiz kalır, çünkü yönlendirme
   * yapılmamış bir tanının yanlış yüzeye düşmesi de mümkün değildir.
   */
  yuzeyAtamalari?: ReadonlyMap<string, SunumYuzeyi>;
}

/** YUZ-3.3'ün tanıdığı üç sunum yüzeyi. */
export type SunumYuzeyi = "problems" | "hatırlatıcılar" | "bildirimler";

/**
 * Hatırlatıcılar hanesine yalnız HATIRLATICI DÜĞÜMÜNDEN türeyen kimlikler girer
 * (KYN-YUZ-A02 · YUZ-3.3 lafzı). Küme 2026-09-10 tarihinde daraltıldı ve gerekçe
 * kanonun kendi cümlesidir: madde bu haneyi "kullanıcının bilinçli Hatırlatıcı
 * düğümleri" için ayırır, oysa küme üç ÇAPA kimliğini de taşıyordu.
 *
 * `açık-adım`, `bloklu-çapa` ve `geliştirmede-çapa` bir Hatırlatıcı düğümü
 * DEĞİLDİR; bunlar Adımın kendi durumundan doğan bilgi düzeyli ölçümlerdir ve
 * YUZ-3.3 bilgi düzeyli ölçüm ile durum işaretlerini Bildirimler (Gözlemler)
 * hanesine yollar. Üçü Hatırlatıcılar hanesinde kaldığı sürece kullanıcı, açık
 * bir Adımı bilinçli bir ileri bağlam sanıyor ve hanenin "hatırlat" vaadi
 * ölçümlerle sulanıyordu.
 *
 * `ateşlemiş-hatırlatıcı` ise kümede HİÇ YOKTU ve bu daha ağır bir kusurdu:
 * YUZ-3.4 ateşlemiş bir Hatırlatıcının uykudakilerden AYIRT EDİLMESİNİ hükme
 * bağlar, oysa bilgi düzeyli olduğu için Gözlemler hanesine düşüyor ve
 * uykudaki kardeşinden ayrı bir panele gidiyordu; iki hâl aynı hanede yan yana
 * durmadıkça ayırt etme hükmü yerine gelemez.
 */
export const ILERI_BAGLAM_KIMLIKLERI: ReadonlySet<string> =
  // KPS-MHR-A01 · MIM-3.4 (Founder hükmü 2026-09-11): `sonraya-bırakılmış-dosya`
  // üçüncü kimliktir. O da kullanıcının BİLİNÇLİ bir ileri bağlam beyanından doğar;
  // beyan bir Hatırlatıcı düğümüne değil dosya adına yazılmıştır, fakat hanenin
  // vaadi aynıdır: sonraya bırakılan iş, bekleme süresiyle görünür kalır.
  new Set(["açık-hatırlatıcı", "ateşlemiş-hatırlatıcı", "sonraya-bırakılmış-dosya"]);

/**
 * Bir tanının doğasından hangi sunum yüzeyine ait olduğunu türetir (YUZ-3.3).
 * Yalnız kimliği ve düzeyi okur; imza bu ikisini ZORUNLU, gerisini isteğe bağlı
 * kılar ki yönlendirmeyi ölçen üreteçler (`yuzey-ulasma.ts`) karar için sahte
 * bir mesaj gövdesi uydurmak zorunda kalmasın. Tam bir `Tani` nesnesi geçmek
 * eskisi gibi geçerlidir; imza yalnız genişlemiştir.
 */
export function beklenenSunumYuzeyi(tani: Partial<Tani> & Pick<Tani, "kod" | "duzey">): SunumYuzeyi {
  if (ILERI_BAGLAM_KIMLIKLERI.has(tani.kod)) return "hatırlatıcılar";
  return tani.duzey === "bilgi" ? "bildirimler" : "problems";
}

/**
 * Yüzeyde sicilin bugünkü kademesinden YUKARI çıkan bir düzey, koşum anında
 * yapılmış bir TERFİDİR; yönetişim kanonu terfiyi dört kapıya bağlar (sıra ·
 * canlı sayaçların sıfırlığı · üçlü kanıt · yetkili açık kabul) ve o dört
 * kapının motordaki tek ölçümü `terfiKapisiKusurlari` işlevidir.
 *
 * Bu çağrı, ölçümü sınama dosyasından çıkarıp `denetle` ile `denetle-proje`
 * komutlarının koştuğu gerçek denetim akışına bağlar (KPS-TRF-A01): ölçüm
 * artık üretici bir yoldan koşar ve verdiği hüküm bulgunun gerekçesine yazılır.
 * Kapının kendi eşik mantığına DOKUNULMAZ ve hangi tanının hangi düzeye terfi
 * edeceği burada kararlaştırılmaz; bu işlev yalnız hükmü okur ve aktarır.
 *
 * Girdinin dört ayağı koşum anında dürüstçe doldurulur: uygulama bağı sicilin
 * üretici dosyası, kanon ayağı maddesidir; buna karşılık tekrar üretilebilir
 * doğrulama kaydı ile yetkili açık kabul koşum anında motorun elinde YOKTUR ve
 * bu yüzden boş geçilir — bir terfi kaydı denetim koşusunun içinde doğmaz.
 * Dolayısıyla koşum anında yapılan bir yükseltme hiçbir kapıdan geçemez ve
 * hükmün kendisi budur: üretici, bir tanının düzeyini kendi başına yükseltemez.
 */
function kacakTerfiHukmu(
  kayit: YeniTaniKaydi, yuzeyDuzeyleri: ReadonlySet<string>, canliSayac: number,
): string {
  const yukselenler = [...yuzeyDuzeyleri].filter((d): d is Duzey =>
    d in DUZEY_AGIRLIGI && DUZEY_AGIRLIGI[d as Duzey] < DUZEY_AGIRLIGI[kayit.kademe]);
  if (!yukselenler.length) return "";
  const kusurlar = yukselenler.flatMap((sonraki) => terfiKapisiKusurlari({
    kod: kayit.kod, onceki: kayit.kademe, sonraki,
    sayaclar: [canliSayac],
    ucluKanit: { uygulama: kayit.uretici, doğrulama: "", kanon: kayit.madde },
    acikKabul: "",
  }));
  if (!kusurlar.length) return "";
  const gerekce = kusurlar.map((k) => k.replace(`${kayit.kod}: `, "")).join(" · ");
  return `; bu yükseltme bir terfidir ve terfi kapısından geçmemiştir (${gerekce})`;
}

/**
 * Yeni kanonun orkestrasyon hükümleri: tanı sözleşmesinin tamlığı, tek-dosya ile
 * Proje kapsamlarının karışmaması, tanı kimliğinin Proje kodundan türemesi,
 * yüzler arasında düzey bozulmaması, önerinin düzeltmeyi öğretmesi ve atlanan
 * kapı varken tam yeşil ilan edilmemesi. Altısı da tek bir üreticinin
 * göremeyeceği, ancak bütün çıktı birleştikten sonra ölçülebilen hükümlerdir.
 */
export function orkestrasyonTanilari(g: OrkestrasyonGirdisi): Array<{ dosya: string; tani: Tani }> {
  const out: Array<{ dosya: string; tani: Tani }> = [];

  // Tanı sözleşmesi: her tanı beş alanını taşır ve kodu sicilde bulunur.
  for (const { dosya, tani } of g.uretilen) {
    const eksik: string[] = [];
    if (!tani.duzey) eksik.push("düzey");
    if (!tani.kod) eksik.push("tekil kod");
    if (!tani.mesaj?.trim()) eksik.push("eyleme dönük mesaj");
    if (typeof tani.satir !== "number" || typeof tani.sutun !== "number") eksik.push("kaynak konumu");
    if (!tani.oneri?.trim()) eksik.push("düzeltme önerisi");
    if (tani.kod && !g.sicil.has(tani.kod)) eksik.push("kanonik sicil kaydı");
    if (!eksik.length) continue;
    out.push({ dosya, tani: yeniTani("tanı-sözleşmesi-uyumsuz",
      { kod: tani.kod || "adsız tanı", kusur: `${eksik.join(" · ")} yok` },
      { satir: tani.satir, sutun: tani.sutun }) });
  }

  // Kapsam ayrımı: tek-dosya kimliği Proje kapısında konuşamaz.
  for (const { dosya, tani } of g.projeKapisi) {
    const kayit = YENI_TANI_INDEKS.get(tani.kod);
    if (!kayit || kayit.kapsam === "proje") continue;
    out.push({ dosya, tani: yeniTani("tanı-kapsamı-karışması",
      { kod: tani.kod, kusur: `"${kayit.kapsam}" kapsamındaki tanı Proje kapısında üretilmiş` },
      { satir: tani.satir, sutun: tani.sutun }) });
  }

  // ── Proje kimliği (YAS-3.3 · KPS-AYR-A01) ────────────────────────────────
  //   Hüküm bulguların Proje KODUNDAN gruplanmasını ister. Önceki yazım bu
  //   gruplamayı hiç ölçmüyordu: birden çok Proje kökü görür görmez hata
  //   basıyordu, çünkü motor gerçekten tek bir dizin kimliği altında topluyordu
  //   ve hüküm dürüstçe kendini reddediyordu. Gruplama kurulduktan sonra aynı
  //   koşul YANLIŞ bir hüküm hâline gelirdi — doğru kurulmuş bir çatıyı sonsuza
  //   dek kırmızıda tutardı. Bugün ölçülen şey artık grup sayısı değil,
  //   gruplamanın TAMLIĞIDIR: üretilen her bulgunun bir Proje evi var mı?
  //
  //   Ölçüm ikiye ayrılır ve ikisi de gerçek bir kusuru bildirir. Birincisi
  //   gruplamanın hiç yapılmamış olmasıdır (tablo verilmemiş) — bu, yüzeyin
  //   ayrımı düşürdüğü hâldir. İkincisi çatı ilanının dışında kalmış bulgudur:
  //   hiçbir Proje kökünün altında yaşamayan bir dosya bir eve yazılamaz ve o
  //   bulgu tabloda kimsenin hanesine düşmez. Çatının kendi giriş dosyası bu
  //   hükmün DIŞINDADIR, çünkü o dosya hiçbir Projenin değil çatının kendisinin
  //   malıdır ve ona bir Proje sahibi aramak kimlikleri birleştirmek olurdu.
  if (g.projeKodlari.size > 1) {
    if (!g.bulguGruplari) {
      out.push({ dosya: g.anaEtiket, tani: yeniTani("proje-tanı-kimliği-uyumsuz",
        { kusur: `çalışma alanında ${g.projeKodlari.size} Proje kökü var (${[...g.projeKodlari].join(" · ")}) ama bulgular tek bir dizin kimliği altında toplanıyor` },
        { satir: 1, sutun: 1 }) });
    } else {
      const evsiz = new Set<string>();
      for (const { dosya } of g.uretilen) {
        if (dosya === g.anaEtiket || g.bulguGruplari.get(dosya)) continue;
        evsiz.add(dosya);
      }
      if (evsiz.size) {
        out.push({ dosya: g.anaEtiket, tani: yeniTani("proje-tanı-kimliği-uyumsuz",
          { kusur: `çalışma alanında ${g.projeKodlari.size} Proje kökü var (${[...g.projeKodlari].join(" · ")}) ama ${evsiz.size} dosyanın bulgusu hiçbir Proje koduna bağlanamadı (${[...evsiz].sort().slice(0, 3).join(" · ")}${evsiz.size > 3 ? " · …" : ""})` },
          { satir: 1, sutun: 1 }) });
      }
    }
  }

  // Yüz tutarlılığı: yeni kanon kimliği sicilin bugünkü kademesinden başka bir
  // düzeyde gösterilemez; aynı kimlik aynı koşumda iki ayrı düzeyde de görünemez.
  {
    const duzeyler = new Map<string, Set<string>>();
    const canliSayaclar = new Map<string, number>();
    for (const { tani } of g.uretilen) {
      if (!duzeyler.has(tani.kod)) duzeyler.set(tani.kod, new Set());
      duzeyler.get(tani.kod)!.add(tani.duzey);
      canliSayaclar.set(tani.kod, (canliSayaclar.get(tani.kod) ?? 0) + 1);
    }
    for (const [kod, kume] of duzeyler) {
      const kayit = YENI_TANI_INDEKS.get(kod);
      if (kayit && [...kume].some((duzey) => duzey !== kayit.kademe)) {
        // Terfi kapısı ÜRETİM yolundan koşar: yükseltme yönündeki sapmanın
        // gerekçesini kanonun kendi dört kapısı yazar (KPS-TRF-A01).
        const terfiHukmu = kacakTerfiHukmu(kayit, kume, canliSayaclar.get(kod) ?? 0);
        out.push({ dosya: g.anaEtiket, tani: yeniTani("tanı-yüzü-uyumsuz",
          { kod, kusur: `sicil bugünkü kademeyi "${kayit.kademe}" ilan ediyor, yüzey "${[...kume].join(" ve ")}" gösteriyor${terfiHukmu}` },
          { satir: 1, sutun: 1 }) });
        continue;
      }
      if (kume.size < 2 || BAGLAMA_GORE_DUZEY.has(kod)) continue;
      out.push({ dosya: g.anaEtiket, tani: yeniTani("tanı-yüzü-uyumsuz",
        { kod, kusur: `aynı koşumda ${[...kume].join(" ve ")} düzeylerinde birden gösterilmiş` },
        { satir: 1, sutun: 1 }) });
    }
  }

  // Öğretim yüzü: tanı önerisi düzeltmeyi öğretmek zorundadır.
  {
    const gorulen = new Set<string>();
    for (const { dosya, tani } of g.uretilen) {
      if (!YENI_TANI_INDEKS.has(tani.kod) || gorulen.has(tani.kod)) continue;
      gorulen.add(tani.kod);
      // Şart BEYAN edilmez, ÖLÇÜLÜR: örnek işareti yetmez, önerinin içinde
      // gerçekten yapıştırılabilir bir iskelet bulunmalıdır (ölçüt tek yerde
      // yaşar — katalog ile nöbet aynı yordamı okur).
      if (yapistirilabilirOrnekVar(tani.oneri)) continue;
      out.push({ dosya, tani: yeniTani("öğretim-yüzü-uyumsuz",
        { kod: tani.kod, kusur: "tanının önerisi ne yapılacağını gösteren yapıştırılabilir bir iskelet taşımıyor; düzeltmeyi tarif ediyor ama göstermiyor" },
        { satir: tani.satir, sutun: tani.sutun }) });
    }
  }

  // Sunum yüzeyi ayrımı (YUZ-3.3): düzeltilecek sapma Problems'a, bilinçli
  // ileri-bağlam Hatırlatıcılar'a, salt bilgilendirme Bildirimler'e gider; bir
  // doğa başka yüzeyi işgal edemez. Yönlendirme tablosu verilmemişse hüküm
  // susar — yapılmamış bir yönlendirme bozulmuş sayılamaz.
  if (g.yuzeyAtamalari?.size) {
    const gorulen = new Set<string>();
    for (const { dosya, tani } of g.uretilen) {
      const atanan = g.yuzeyAtamalari.get(tani.kod);
      if (!atanan || gorulen.has(tani.kod)) continue;
      const beklenen = beklenenSunumYuzeyi(tani);
      if (atanan === beklenen) continue;
      gorulen.add(tani.kod);
      out.push({ dosya, tani: yeniTani("tanı-yüzeyi-karışması",
        { kod: tani.kod, atanan, beklenen },
        { satir: tani.satir, sutun: tani.sutun }) });
    }
  }

  // Tam yeşil: atlanan zorunlu kapı varken sonuç yeşil sayılamaz.
  if (g.atlananKapilar.length) {
    out.push({ dosya: g.anaEtiket, tani: yeniTani("sahte-tam-yeşil",
      { kusur: `zorunlu denetim kapılarından ${g.atlananKapilar.length} tanesi çalıştırılamadı (${g.atlananKapilar.join(" · ")})` },
      { satir: 1, sutun: 1 }) });
  }
  return out;
}

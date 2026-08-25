// ═══════════════════════════════════════════════════════════════════════════
// posta-govde.ts — 📬 POSTA KUTUSUNUN SAF GÖVDESİ (panel içi karar yüzeyi)
//
//   Founder üç kez aynı şeyi söyledi (sonuncusu 2026-07-29): "ya ben bir şerh
//   metni yazmak için ta en yukarıya bakmak zorunda mıyım? posta kutusunun metin
//   alanı için niye bu kadar uzak bir noktaya dikkatimi yoğunlaştırmak
//   zorundayım?" İki kez giriş kutusuyla idare edilmeye çalışıldı; ikisi de
//   olmadı, çünkü kusur giriş kutusunun İÇERİĞİNDE değil KONUMUNDAYDI.
//
//   ÖLÇÜLMÜŞ TEKNİK GERÇEK (varsayım değil, tip bildiriminden okundu —
//   @types/vscode index.d.ts): `InputBoxOptions` yalnız başlık, değer, seçim,
//   ipucu, yer tutucu, parola, odak koruması ve doğrulayıcı alanlarını taşır;
//   `QuickInput` ile `InputBox` de öyle. Hiçbirinde konum, çapa ya da ana öğe
//   alanı YOKTUR. VS Code bütün QuickInput yüzeylerini pencerenin üst ortasında
//   çizer ve bunu değiştiren bir kapı sunmaz. Aynı bildirimde `TreeItem` yalnız
//   etiket, kimlik, simge, açıklama, kaynak adresi, ipucu, komut, kademe durumu,
//   bağlam değeri, erişilebilirlik bilgisi ve onay kutusu alanlarını taşır —
//   ağaç satırı bir metin alanı BARINDIRAMAZ.
//
//   Dolayısıyla not alanını kullanıcının gözünün olduğu yere getirmenin tek yolu,
//   o alanı PANELİN KENDİ İÇİNDE çizmektir; bu da bir webview görünüşü demektir.
//   Bu dosya o görünüşün SAF yarısıdır: veri modeli, açıklık/taslak defteri,
//   gerekçe doğrulaması ve gövde metni burada, vscode istemeden yaşar. Nöbet
//   (sinama/posta-kutusu.test.ts) böylece editör kabuğu kurmadan gerçek gövdeyi
//   koşturur; kabuk yarısı (posta-kutusu.ts) yalnız çizer ve mesaj taşır.
//
//   BETİK BURADA MEŞRUDUR, MİNİ GRAFTA DEĞİL. Mini Graf bir GÖSTERGEDİR ve
//   betiksiz kalır (minigraf.ts · enableScripts: false). Onaylar bir KARAR
//   YÜZEYİDİR ve giriş alır; giriş alan yüzey betiksiz olamaz. Sıfır bağımlılık
//   ilkesi (STR-3.1) aynen bağlayıcıdır: dış kaynağa hiç bağlanılmaz, içerik
//   güvenlik politikası `default-src 'none'` ile başlar ve yalnız kendi nonce'unu
//   tanır.
//
// ── 🧭 YERLEŞİM: Founder'ın ekran görüntüsüyle tarif ettiği düzen ────────────
//
//   Kapı satırına tıklanınca ÖNCE metin kutusu açılır, üç seçenek O KUTUNUN
//   ALTINDA durur. Founder'ın kendi cümlesi: "metin kutusu bu alan içerisinde
//   açılsın, onayla, şerh ile onayla ve reddet o kutucuğun altında seçenek
//   olsun."
//
//     📄 dosya adı ····························· kaç kapı beklediği
//       └─ kapının kodu — Adımın amacı
//            ┌──────────────────────────────┐
//            │ (gerekçe metin kutusu)       │
//            └──────────────────────────────┘
//            ✅ Onayla   📝 Şerhle onayla   ⛔ Reddet
//
//   KUTU ÜÇ SEÇENEĞİN ORTAK GİRDİSİDİR. Her seçenek için ayrı kutu açılmaz;
//   akış "kapıyı aç → istersen yaz → seçeneği bas" olarak sadeleşir.
// ═══════════════════════════════════════════════════════════════════════════

import type { DosyaKumesi, KapiKaydi } from "./onay-cekirdek.ts";
import { postaKimligi } from "./onay-cekirdek.ts";

// ═══════════════════════════════════════════════════════════════════════════
// ⚖️ ÜÇ KARAR — üçü de hüküm yazar
//
//   Founder hükmü 2026-07-29 (ekran görüntüsüyle): "kapı satırına tıklayıp sonra
//   Adıma gitmek için ayrıca bir satıra daha tıklamak GEREKSİZDİR." Dördüncü
//   satır ("Kapıya git") o gün kaldırıldı; işini kapı satırının kendisi yapar.
//   Çizelge ağaçtan bu saf modüle taşındı, çünkü artık gövdeyi o çiziyor ve
//   nöbet çizelgeyi kaynak metninden tahmin etmek yerine GERÇEKTEN okuyor.
//
//   ÜÇ DAMGA DEĞİŞMEZ. Diskte yazılmış kayıtlar geriye dönük yalanlanamaz;
//   `onaylandı` · `şerhle onaylandı` · `reddedildi` aynen kalır.
// ═══════════════════════════════════════════════════════════════════════════

export interface KararSecenegi {
  /** Satırın KARARLI kimlik payı — etiket değişse de sabit kalır. */
  readonly rol: string;
  /** Diske yazılan damga. DEĞİŞMEZ. */
  readonly damga: string;
  /** Seçeneğin satır simgesi ailesindeki karşılığı. Emoji DEĞİLDİR (YUZ-4.2):
   *  arayüz işaretleri kilitli SVG ailesinden gelir, çünkü emoji platforma göre
   *  başka çizilir, rengini temadan almaz ve ölçüsü denetlenemez. */
  readonly simge: string;
  /** Gerekçe isteyen seçenek mi? Şerh ve ret ister, düz onay istemez. */
  readonly notIster: boolean;
}

export const KARAR_SECENEKLERI: readonly KararSecenegi[] = [
  { rol: "onay", damga: "onaylandı", simge: "onay", notIster: false },
  { rol: "şerh", damga: "şerhle onaylandı", simge: "serh", notIster: true },
  { rol: "ret", damga: "reddedildi", simge: "ret", notIster: true },
];

/** Rolüyle seçeneği bulur; tanınmayan rol için tanımsız döner (uydurma yapılmaz). */
export function secenekBul(rol: string): KararSecenegi | undefined {
  return KARAR_SECENEKLERI.find((s) => s.rol === rol);
}

/**
 * Bir KAPININ gerekçe kutusunun kararlı kimliği.
 *
 * Kimlik ROLDEN BAĞIMSIZDIR ve bu bilerekdir: kutu üç seçeneğin ORTAK
 * girdisidir, dolayısıyla taslak da kapıya aittir, seçeneğe değil. Kullanıcı
 * yazıp fikrini değiştirip başka bir seçeneğe basarsa aynı metni kullanır.
 */
export function notKimligi(dosya: string, kod: string): string {
  return `${postaKimligi({ tur: "kapı", dosya, kod })}·not`;
}

/** Bir karar düğmesinin kararlı kimliği — dosya yolu, kapı kodu ve rolden doğar. */
export function kararKimligi(dosya: string, kod: string, rol: string): string {
  return postaKimligi({ tur: "karar", dosya, kod, rol });
}

/**
 * Bağlam kopyalama satırının kararlı kimliği. Gerekçe kutusu gibi KAPIYA aittir,
 * bir role değil: eylem karar yazmaz, yalnız kapının bağlamını panoya taşır.
 */
export function kopyaKimligi(dosya: string, kod: string): string {
  return `${postaKimligi({ tur: "kapı", dosya, kod })}·kopya`;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🧾 GEREKÇE ÖLÇÜSÜ — dört ayrı sonuç, hiçbiri sessiz değil
//
//   ① Boş kutu + düz onay → GEÇERLİ. Düz onay gerekçe istemez ve bugünkü hüküm
//      budur; kutu boş diye onay engellenirse kullanıcıya olmayan bir borç
//      yüklenmiş olur.
//   ② Boş kutu + şerh/ret → GEREKÇE BOŞ. Bugün `validateInput` ile işleyen kural
//      panel içinde de aynen işler; hata kullanıcının GÖZÜNÜN ÖNÜNDE, kutunun
//      hemen yanında görünür.
//   ③ Dolu kutu + düz onay → GEREKÇE ARTIK. Bu bir TASARIM BOŞLUĞUYDU ve sessiz
//      bırakılmadı. İki yol vardı: (a) yazılmış gerekçeyi sessizce atmak,
//      (b) düz onayı sessizce şerhe çevirmek. İkisi de reddedildi ve gerekçesi
//      ölçülmüştür: (a) bu depoda bu hafta SESSİZ KAYIP olarak ölçülmüş bir
//      kusur ailesidir — kullanıcının yazdığı metnin izsiz yok olması; (b) daha
//      kötüdür, çünkü kullanıcının SEÇMEDİĞİ bir damgayı DİSKE yazar ve diske
//      yazılmış kayıt geriye dönük yalanlanamaz. Seçilen üçüncü yol hiçbir şey
//      kaybetmez ve hiçbir şey uydurmaz: yazım DURUR, kutunun yanında ne
//      yapılacağı söylenir (şerhi seç ya da kutuyu boşalt), metin yerinde kalır.
//   ④ Kutu hiç gelmedi (`undefined`) + gerekçe isteyen seçenek → İPTAL. Panelden
//      gelmeyen çağrılar (komut sınırı) için ayrılmıştır ve boş kutudan AYRI bir
//      sonuçtur: iptal eden vazgeçmiştir, boş bırakan yazmayı denemiştir.
// ═══════════════════════════════════════════════════════════════════════════

export type GerekceSonucu =
  | { readonly tur: "geçerli"; readonly not: string }
  | { readonly tur: "gerekçeBoş" }
  | { readonly tur: "gerekçeArtık" }
  | { readonly tur: "iptal" };

export function gerekceyiOlc(notIster: boolean, not: string | undefined): GerekceSonucu {
  const kirpik = (not ?? "").trim();
  if (!notIster) return kirpik ? { tur: "gerekçeArtık" } : { tur: "geçerli", not: "" };
  if (not === undefined) return { tur: "iptal" };
  return kirpik ? { tur: "geçerli", not: kirpik } : { tur: "gerekçeBoş" };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🗂️ PANEL DURUMU — tazeleme yazılmakta olan metni DÜŞÜREMEZ
//
//   Bu hafta ölçülmüş bir kusur ailesi vardı ve kökü hep aynıydı: bu çalışma
//   alanında kendiliğinden kaydetme açık olduğu için tazeleme SÜREKLİDİR. Ağaç
//   dünyasında tazeleme açık satırı kapatıyordu (Kusur 4, `TreeItem.id` ile
//   onarıldı). Kutu akışın MERKEZİ olduğu bu düzende aynı kusur çok daha
//   pahalıya patlardı: kullanıcının yazdığı gerekçe uçardı.
//
//   Onarım ağaçtakiyle aynı ruhu taşır ve bir adım öteye gider: görünüşün durumu
//   (hangi satır açık, hangi kutuya ne yazıldı) DOM'da değil, burada, eklenti
//   tarafında yaşar. Gövde bu durumun SAF BİR İŞLEVİDİR; tazeleme gövdeyi
//   yeniden bassa da durum aynı kaldığı için metin de açıklık da yerinde kalır.
//
//   HER KAPININ TASLAĞI AYRIDIR. Kullanıcı bir kapıya yazıp başka bir kapıyı
//   açarsa ilk metin SİLİNMEZ: defter kapı kimliğine göre tutar ve kullanıcı
//   geri döndüğünde metnini yerinde bulur. Alternatif — "başka kapıya geçince
//   uyar ve at" — hem sessiz kayba komşudur hem de kullanıcıyı kesintiye uğratır;
//   defter zaten kapı başına anahtarlı olduğu için ayrı tutmak BEDAVADIR.
// ═══════════════════════════════════════════════════════════════════════════

/** Gövdeyi basan işlevin durumdan istediği tek şey — nöbet sahtesini kolayca verir. */
export interface DurumGoruntusu {
  /** Bir dosya ya da kapı satırı açık mı? */
  acikMi(kimlik: string): boolean;
  /** O kapının kutusuna bugüne kadar yazılmış taslak metin. */
  taslak(kimlik: string): string;
  /** O kapının kutusunun yanında gösterilecek hata cümlesi (yoksa tanımsız). */
  hata(kimlik: string): string | undefined;
}

export class PanelDurumu implements DurumGoruntusu {
  private readonly acikSatirlar = new Set<string>();
  private readonly taslaklar = new Map<string, string>();
  private readonly hatalar = new Map<string, string>();
  private readonly taninmis = new Set<string>();

  /**
   * Dosya satırları AÇIK başlar (Hatırlatıcılar emsali): kapılar zaten
   * tıklanmak için oradadır. Bir kez tanınan satırın açıklığı bir daha
   * varsayılana çekilmez — kullanıcı kapattıysa kapalı kalır.
   */
  dosyayiVarsayilanAc(kimlik: string): void {
    if (this.taninmis.has(kimlik)) return;
    this.taninmis.add(kimlik);
    this.acikSatirlar.add(kimlik);
  }

  acikMi(kimlik: string): boolean {
    return this.acikSatirlar.has(kimlik);
  }

  /** Bir satırın açıklığını yazar; gerçekten değiştiyse doğru döner. */
  acikligiYaz(kimlik: string, acik: boolean): boolean {
    const onceki = this.acikSatirlar.has(kimlik);
    this.taninmis.add(kimlik);
    if (acik) this.acikSatirlar.add(kimlik);
    else this.acikSatirlar.delete(kimlik);
    return onceki !== acik;
  }

  /** Kullanıcı yazdıkça taslak buraya düşer — tazeleme onu gövdeye geri koyar. */
  taslakYaz(kimlik: string, metin: string): void {
    this.taslaklar.set(kimlik, metin);
    if (metin.trim()) this.hatalar.delete(kimlik);
  }

  taslak(kimlik: string): string {
    return this.taslaklar.get(kimlik) ?? "";
  }

  /** Karar yazıldıktan sonra taslak da hata da düşer: kapı kapandı. */
  taslagiSil(kimlik: string): void {
    this.taslaklar.delete(kimlik);
    this.hatalar.delete(kimlik);
  }

  hataYaz(kimlik: string, cumle: string): void {
    this.hatalar.set(kimlik, cumle);
  }

  hatayiSil(kimlik: string): void {
    this.hatalar.delete(kimlik);
  }

  hata(kimlik: string): string | undefined {
    return this.hatalar.get(kimlik);
  }

  /** Nöbet ölçüsü: defterde kaç taslak duruyor. */
  get taslakSayisi(): number {
    return this.taslaklar.size;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 📨 MESAJ SÖZLEŞMESİ — panelden kabuğa, kabuktan panele
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Panelin (webview) kabuğa gönderdiği mesajlar.
 *
 * `aç` mesajı kapı satırlarında `dosya` ve `kod` da taşır. Bu iki alan yalnız
 * bilgi değildir, ODAK NİYETİNİN taşıyıcısıdır: yalnız kullanıcının kendi eliyle
 * açtığı kapı bunları taşır ve yalnız o çizim odağı gerekçe kutusuna götürür.
 * Dosya satırının açılması da, tazeleme de bu alanları üretemez.
 */
export type PanelMesaji =
  | {
      readonly tur: "aç"; readonly kimlik: string; readonly acik: boolean;
      readonly dosya?: string; readonly kod?: string;
    }
  | { readonly tur: "kapıSeç"; readonly dosya: string; readonly kod: string }
  // Kapının bağlamının panoya kopyalanması istendi. Pano yazımı KABUKTADIR:
  // panel yalnız bu mesajı atar, çünkü webview düğme öğeleri metin seçimine
  // kapalıdır ve panel tarafında hiçbir pano yolu yaşamaz (Founder canlı
  // bulgusu 2026-08-04: seçip Kopyala denemesi panoyu eski içeriğinde bırakıyordu).
  | { readonly tur: "bağlamKopyala"; readonly dosya: string; readonly kod: string }
  | {
      readonly tur: "kararVer"; readonly dosya: string; readonly kod: string;
      readonly satir: number; readonly rol: string; readonly not?: string;
    }
  | { readonly tur: "iptal"; readonly dosya: string; readonly kod: string }
  | { readonly tur: "taslak"; readonly kimlik: string; readonly metin: string };

/**
 * Kabuğun panele gönderdiği mesajlar. `gövde` tazelemedir ve belgeyi baştan
 * yazmaz; `odakla` kod merceğinden gelen "şu kapıyı göster" isteğidir.
 *
 * `odakNot` alanı İSTEĞE BAĞLIDIR ve tam olarak bu yüzden vardır: tazeleme
 * yolları onu üretemez, dolayısıyla tazeleme odağı YAPISAL OLARAK çalamaz.
 * Alan yoksa gövde yerine konur ve odak kullanıcının bıraktığı yerde kalır.
 */
export type KabukMesaji =
  | { readonly tur: "gövde"; readonly html: string; readonly odakNot?: string }
  | { readonly tur: "odakla"; readonly kimlik: string };

/**
 * ⌨️ ODAK NİYETİ — Founder hükmü 2026-07-29: "kapı açılınca odak kendiliğinden
 * gerekçe kutusuna gitsin."
 *
 * Hüküm uygulanır, fakat klavye kullanıcısını kapana kıstırmadan ve ölçülmüş
 * kusur ailesini dördüncü kez doğurmadan. Kural tek cümledir: ODAK YALNIZ
 * KULLANICININ KENDİ AÇTIĞI KAPIDA KUTUYA GİDER.
 *
 * Bu işlev o kuralın TEK yeridir ve saf olması bilerekdir. Tazeleme yolları
 * (`yerlestirHepsi` · `yerlestirDosya` · `dusur`) bu işlevi hiç çağırmaz ve
 * çağıramaz — ellerinde bir `PanelMesaji` yoktur. Yani "tazeleme odağı çalmaz"
 * cümlesi bir dikkat temennisi değil, yapının kendisidir.
 *
 * @returns Odaklanacak gerekçe kutusunun kimliği; niyet yoksa tanımsız.
 */
export function odakNiyeti(m: PanelMesaji): string | undefined {
  if (m.tur !== "aç") return undefined;       // yazma · iptal · karar odak taşımaz
  if (!m.acik) return undefined;              // kapanan kapı odak taşımaz
  if (!m.dosya || !m.kod) return undefined;   // dosya satırının açılması odak taşımaz
  return notKimligi(m.dosya, m.kod);
}

// ═══════════════════════════════════════════════════════════════════════════
// 🖋️ GÖVDE
// ═══════════════════════════════════════════════════════════════════════════

/** HTML'e kaçış: kullanıcı verisi (Adım amacı, dosya adı, taslak metni) gövdeye ham girmez. */
export function kacisla(metin: string): string {
  return metin
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Gövdenin kullanıcıya görünen bütün metinleri — katalogdan gelir, burada üretilmez. */
export interface GovdeMetinleri {
  readonly htmlDili: string;
  readonly ariaOnaylar: string;
  readonly notBasligi: string;
  readonly notYerTutucu: string;
  readonly gerekceZorunlu: string;
  readonly gerekceArtik: string;
  readonly dosyaAdedi: (adet: number) => string;
  readonly kapiEtiketi: (kod: string, ne: string) => string;
  readonly kapiAciklamasi: (dosyaAdi: string, satir: number) => string;
  readonly kapiIpucu: (p: { kod: string; ne: string; olcut: string; dosya: string; satir: number }) => string;
  readonly dosyaIpucu: (dosya: string, adet: number) => string;
  readonly kararIpucu: (p: { kod: string; damga: string; notIster: boolean }) => string;
  readonly kararEtiketi: (rol: string) => string;
  readonly kopyaEtiketi: string;
  readonly kopyaIpucu: (kod: string) => string;
}

/** Gövdeyi basmak için gereken her şey. Hiçbiri vscode türü DEĞİLDİR. */
export interface GovdeGirdisi {
  readonly kumeler: readonly DosyaKumesi[];
  readonly durum: DurumGoruntusu;
  /**
   * Dosyanın teknoloji simgesinin webview adresleri; yoksa satır simgesiz kalır
   * (uydurma simge basılmaz — yanlış teknoloji göstermek hiç göstermemekten
   * kötüdür). Aydınlık ve karanlık ayrı verilir, çünkü ağaç satırının temaya
   * göre simge seçmesi de kendiliğinden gelen bir davranıştı ve elle kurulur.
   */
  simge(dosya: string): { readonly light: string; readonly dark: string } | undefined;
  readonly nonce: string;
  /**
   * Kapı satırının geometrik balonu — satır çizelgesinin `kapi` kaynağının
   * currentColor SVG metni. Kabuk okur, gövde basar; boş verilirse satır
   * işaretsiz kalır (uydurma yapılmaz — teknoloji simgesiyle aynı dürüstlük).
   */
  readonly kapiSimgesi: string;
  readonly kopyaSimgesi: string;
  /** Üç karar seçeneğinin SVG çizimleri, rol simgesi anahtarıyla. Eksik anahtar
   *  boş basılır: uydurma yapılmaz, düğme yalnız metniyle görünür. */
  readonly kararSimgeleri: Readonly<Record<string, string>>;
  /** `webview.cspSource` — YALNIZ simge yüklemek için açılır. */
  readonly cspKaynak: string;
  readonly bosCumle: string;
  readonly metinler: GovdeMetinleri;
}

// Kapı satırının simgesi MESAJ BALONUDUR (kapı, yanıtlanmayı bekleyen bir
// SORUDUR) ve VIT-KIMLIK-A05 ile geometrik ailenin satır çizelgesine geçti:
// çizim `medya/simgeler/satir-kapi.svg` kaynağında yaşar, kabuk (posta-kutusu)
// onu çizelge yolundan okur ve gövdeye METİN olarak verir. Gövde saf kalır
// (dosya okumaz); balon currentColor konturlu olduğu için rengi CSS'teki
// tema değişkeninden alır — dikkat sarısı anlamı aynen korunur (YUZ-4.1).

/**
 * ⚠️ GEREKÇE KUTUSU KAPININ KENDİ GÖVDESİNDE, KAPI SATIRININ HEMEN ALTINDA DOĞAR
 *    VE ÜÇ SEÇENEK KUTUNUN ALTINDA DURUR.
 *
 * Kutu gövdeye TIKLAMA ANINDA enjekte edilmez; her kapının kendi kutusunda
 * ZATEN vardır ve kapı kapalıyken yalnız gizlidir. Fark ölçülebilirliktir:
 * enjeksiyon betiğin içinde yaşasaydı "kutu kapının hemen altında doğuyor mu"
 * ve "seçenekler kutunun altında mı" sorularını ancak betiğin kaynak metnine
 * bakarak TAHMİN edebilirdik. Bu hâliyle yerleşim SAF GÖVDENİN bir gerçeğidir
 * ve nöbet onu gerçekten okur.
 */
function kapiGovdesi(g: GovdeGirdisi, kayit: KapiKaydi): string {
  const { dosya, kapi } = kayit;
  const notId = notKimligi(dosya, kapi.kod);
  const taslak = g.durum.taslak(notId);
  const hata = g.durum.hata(notId);
  const m = g.metinler;
  const secenekler = KARAR_SECENEKLERI.map((s) => {
    const ipucu = m.kararIpucu({ kod: kapi.kod, damga: s.damga, notIster: s.notIster });
    return `
        <button type="button" class="satir karar-satiri" data-kimlik="${kacisla(kararKimligi(dosya, kapi.kod, s.rol))}"
                data-dosya="${kacisla(dosya)}" data-kod="${kacisla(kapi.kod)}"
                data-satir="${kapi.satir}" data-rol="${kacisla(s.rol)}"
                data-not-ister="${s.notIster ? "evet" : "hayır"}"
                data-not="${kacisla(notId)}" title="${kacisla(ipucu)}">
          <span class="karar-simge" aria-hidden="true">${g.kararSimgeleri[s.simge] ?? ""}</span>
          <span class="etiket">${kacisla(m.kararEtiketi(s.rol))}</span>
        </button>`;
  }).join("");
  // ⚠️ SIRA BAĞLAYICIDIR: önce kutu, sonra seçenekler (Founder ekran görüntüsü).
  // Gövdede DÖRDÜNCÜ bir eylem YOKTUR: bağlam kopyalama Founder'ın 2026-08-05
  // hükmüyle yalnız kapı satırında, üzerine gelince beliren simgede yaşar;
  // gövdeye ikinci bir düğme koymak aynı işi iki yerde göstermek olurdu.
  return `
      <div class="kapi-govde">
        <div class="not-alani" data-kimlik="${kacisla(notId)}"
             data-dosya="${kacisla(dosya)}" data-kod="${kacisla(kapi.kod)}">
          <label class="not-baslik" for="not-${kacisla(notId)}">${kacisla(m.notBasligi)}</label>
          <textarea id="not-${kacisla(notId)}" class="not-metin" rows="3"
                    placeholder="${kacisla(m.notYerTutucu)}"
                    aria-describedby="hata-${kacisla(notId)}">${kacisla(taslak)}</textarea>
          <p class="not-hata" id="hata-${kacisla(notId)}" role="alert"${hata ? "" : " hidden"}>${kacisla(hata ?? m.gerekceZorunlu)}</p>
        </div>
        <div class="kararlar" role="group">${secenekler}</div>
      </div>`;
}

/** Tek bir kapı satırı ve altındaki gövde (önce kutu, sonra üç seçenek). */
function kapiSatiri(g: GovdeGirdisi, kayit: KapiKaydi): string {
  const { dosya, kapi } = kayit;
  const kimlik = postaKimligi({ tur: "kapı", dosya, kod: kapi.kod });
  const acik = g.durum.acikMi(kimlik);
  const ipucu = g.metinler.kapiIpucu({
    kod: kapi.kod, ne: kapi.ne, olcut: kapi.olcut, dosya, satir: kapi.satir + 1,
  });
  // 📋 ÜZERİNE-GELİNCE EYLEM (VIT-POSTA-A04 eki, Founder hükmü 2026-08-04):
  // fare kapı satırının üzerine geldiğinde ya da satır odaktayken, satırın
  // kendisinde bir kopyalama eylemi belirir ve kapı hiç açılmadan bağlam
  // panoya iner. Kapı satırı bir <button> öğesidir ve içine ikinci bir düğme
  // YUVALANAMAZ (geçersiz HTML, tarayıcı ayıklar); eylem bu yüzden satırın
  // KARDEŞİ olan, role="button" ve tabindex taşıyan bir span'dır. Görünürlük
  // yalnız biçemden gelir; tık mevcut bağlamKopyala dalını aynen kullanır.
  const satirKopya = `<span class="satir satir-kopya" role="button" tabindex="0"
              data-kimlik="${kacisla(kopyaKimligi(dosya, kapi.kod))}·satır"
              data-dosya="${kacisla(dosya)}" data-kod="${kacisla(kapi.kod)}"
              data-rol="bağlamKopyala" aria-label="${kacisla(g.metinler.kopyaEtiketi)}"
              title="${kacisla(g.metinler.kopyaIpucu(kapi.kod))}">${g.kopyaSimgesi}</span>`;
  return `
    <li class="kapi-kutu">
      <button type="button" class="satir kapi-satiri" data-kimlik="${kacisla(kimlik)}"
              data-dosya="${kacisla(dosya)}" data-kod="${kacisla(kapi.kod)}"
              data-satir="${kapi.satir}" aria-expanded="${acik ? "true" : "false"}"
              title="${kacisla(ipucu)}">
        <span class="ok" aria-hidden="true">${acik ? "▾" : "▸"}</span>
        ${g.kapiSimgesi ? `<span class="kapi-simge" aria-hidden="true">${g.kapiSimgesi}</span>` : ""}
        <span class="etiket">${kacisla(g.metinler.kapiEtiketi(kapi.kod, kapi.ne))}</span>
        <span class="aciklama">${kacisla(g.metinler.kapiAciklamasi(dosyaAdi(dosya), kapi.satir + 1))}</span>
      </button>${satirKopya}${acik ? kapiGovdesi(g, kayit) : ""}
    </li>`;
}

/** Yolun son parçası — gövde bu kadarını kendi yapar, ikinci bir modül istemez. */
function dosyaAdi(yol: string): string {
  const kesim = Math.max(yol.lastIndexOf("/"), yol.lastIndexOf("\\"));
  return kesim >= 0 ? yol.slice(kesim + 1) : yol;
}

/** Bir dosya kümesi: başlık satırı ve altındaki kapılar. */
function dosyaSatiri(g: GovdeGirdisi, kume: DosyaKumesi): string {
  const kimlik = postaKimligi({ tur: "dosya", dosya: kume.dosya });
  const acik = g.durum.acikMi(kimlik);
  const simge = g.simge(kume.dosya);
  const adet = kume.kayitlar.length;
  return `
  <li class="dosya-kutu">
    <button type="button" class="satir dosya-satiri" data-kimlik="${kacisla(kimlik)}"
            aria-expanded="${acik ? "true" : "false"}"
            title="${kacisla(g.metinler.dosyaIpucu(kume.dosya, adet))}">
      <span class="ok" aria-hidden="true">${acik ? "▾" : "▸"}</span>
      ${simge
        ? `<img class="teknoloji tek-acik" src="${kacisla(simge.light)}" alt="" />` +
          `<img class="teknoloji tek-koyu" src="${kacisla(simge.dark)}" alt="" />`
        : ""}
      <span class="etiket">${kacisla(kume.dosyaAdi)}</span>
      <span class="aciklama">${kacisla(g.metinler.dosyaAdedi(adet))}</span>
    </button>
    <ul class="kapilar"${acik ? "" : " hidden"}>${kume.kayitlar.map((k) => kapiSatiri(g, k)).join("")}</ul>
  </li>`;
}

/**
 * Panelin İÇ gövdesi — kök kabın içine giren her şey.
 *
 * Ayrı bir işlev olması ölçülmüş bir gerekçeye dayanır: tazeleme belgeyi
 * BAŞTAN YAZMAZ. `webview.html` yeniden atansaydı sayfa yeniden yüklenir, odak
 * ve imleç konumu uçar, kullanıcı cümlesinin ortasında klavyeyi kaybederdi.
 * Tazelemede yalnız bu iç gövde gönderilir; betik onu yerine koyar ve odağı
 * geri yerleştirir.
 */
export function postaIcGovdesi(g: GovdeGirdisi): string {
  return g.kumeler.length === 0
    ? `<p class="bos-durum">${kacisla(g.bosCumle)}</p>`
    : `<ul class="dosyalar">${g.kumeler.map((k) => dosyaSatiri(g, k)).join("")}</ul>`;
}

/**
 * Panelin tam belgesi — YALNIZ bir kez, görünüş çözüldüğünde basılır.
 * SAF: aynı girdi hep aynı metni verir, dolayısıyla tazeleme yazılmakta olan
 * metni ancak DURUM kaybederse düşürebilir — ve durum DOM'da değil, eklenti
 * tarafında `PanelDurumu` içinde yaşar.
 */
export function postaGovdesiHtml(g: GovdeGirdisi): string {
  return `<!DOCTYPE html>
<html lang="${kacisla(g.metinler.htmlDili)}">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${g.cspKaynak}; style-src 'nonce-${g.nonce}'; script-src 'nonce-${g.nonce}';" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style nonce="${g.nonce}">${GOVDE_BICEMI}</style>
</head>
<body>
<div id="kok" aria-label="${kacisla(g.metinler.ariaOnaylar)}">${postaIcGovdesi(g)}</div>
<script nonce="${g.nonce}">${GOVDE_BETIGI}</script>
</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎨 BİÇEM — renk YALNIZ tema değişkeninden okunur, ham değer gömülmez (YUZ-4)
//
//   Yerel ağaçtan vazgeçince tema renkleri KENDİLİĞİNDEN gelmez; hepsi elle
//   kurulur. Kural ağaçtakiyle aynıdır: hiçbir yerde `#rrggbb` ya da `rgb()`
//   yazmaz, her renk VS Code'un kendi değişkeninden gelir ve kullanıcının teması
//   neyse panel de o olur.
//
//   PANEL DAR OLDUĞUNDA KUTU TAŞMAZ: genişlik yüzdeliktir, `box-sizing`
//   kenarlığı içine alır ve uzun sözcükler kırılır. Kenar çubuğu daraltıldığında
//   yatay kaydırma çubuğu doğmaz.
// ═══════════════════════════════════════════════════════════════════════════

const GOVDE_BICEMI = `
* { box-sizing: border-box; }
body {
  margin: 0; padding: 0; overflow-x: hidden;
  font-family: var(--vscode-font-family);
  font-size: var(--vscode-font-size);
  color: var(--vscode-sideBar-foreground, var(--vscode-foreground));
  background: transparent;
}
ul { list-style: none; margin: 0; padding: 0; }
.bos-durum {
  margin: 0; padding: 12px 16px; line-height: 1.5;
  color: var(--vscode-descriptionForeground);
}
.satir {
  display: flex; align-items: center; gap: 4px;
  width: 100%; padding: 1px 8px 1px 4px; border: 1px solid transparent;
  background: none; color: inherit; text-align: left; cursor: pointer;
  font: inherit; line-height: 22px; min-height: 22px;
  white-space: nowrap; overflow: hidden;
}
.satir:hover { background: var(--vscode-list-hoverBackground); }
.satir:focus-visible {
  outline: none;
  border-color: var(--vscode-focusBorder);
  background: var(--vscode-list-focusBackground);
}
.ok { width: 12px; flex: 0 0 12px; text-align: center; color: var(--vscode-icon-foreground); }
.emoji { flex: 0 0 auto; }
/* Karar düğmesinin işareti: emoji değil, ailenin kendi çizimi (YUZ-4.2).
   Ölçü metnin yanında dengeli durur ve renk düğmenin kendi renginden gelir. */
.karar-simge { flex: 0 0 auto; display: inline-flex; align-items: center; }
.karar-simge svg { width: 14px; height: 14px; display: block; }
.kapi-simge { flex: 0 0 auto; display: inline-flex; color: var(--vscode-charts-yellow); }
.kapi-simge svg { width: 15px; height: 15px; display: block; }
.teknoloji { width: 16px; height: 16px; flex: 0 0 16px; }
/* Simge temaya göre seçilir; ağaçta kendiliğinden gelen bu davranış elle kuruldu. */
.tek-koyu { display: none; }
body.vscode-dark .tek-acik, body.vscode-high-contrast .tek-acik { display: none; }
body.vscode-dark .tek-koyu, body.vscode-high-contrast .tek-koyu { display: inline; }
.etiket { overflow: hidden; text-overflow: ellipsis; }
.aciklama {
  margin-left: 6px; opacity: 0.8; font-size: 0.9em;
  color: var(--vscode-descriptionForeground);
  overflow: hidden; text-overflow: ellipsis;
}
.kapi-satiri { padding-left: 16px; }
/* ── SATIRDAKİ ÜZERİNE-GELİNCE EYLEMİ (Founder hükümleri 2026-08-04 ve 08-05)
   Eylem varsayılanda GİZLİDİR ve YER KAPLAMAZ: satırın üstüne mutlak
   konumlanır, dolayısıyla belirdiğinde etiket ya da açıklama kaymaz. Görünür
   olduğu iki hâl: fare kapının kabının üzerindeyken ve kapı satırı klavyeyle
   odaklandığında. Odak kuralı ayrı tutulur, çünkü eylem odağı aldığında
   satırın odağı düşer; o kural olmasaydı öğe tam basılacağı anda gizlenirdi.

   GÖRÜNÜŞ HÜKMÜ (2026-08-05): işaret EMOJİ DEĞİL, geometrik ailenin kendi
   çizimidir (YUZ-4.1) ve kapı balonuyla aynı ölçüde durur. Öğe satır
   sınıfını taşıdığı için gezinme kurallarını miras alır; oradan gelen kenarlık
   ve odak zemini burada BİLEREK sıfırlanır, çünkü on altı piksellik bir simge
   kutu içine alındığında panelin sakin çizgisini bozar. */
.kapi-kutu { position: relative; }
.satir-kopya {
  display: none; position: absolute; top: 0; right: 6px;
  width: auto; min-height: 22px; padding: 0 2px; gap: 0;
  align-items: center; justify-content: center;
  border: none; background: none; opacity: 0.75;
  color: var(--vscode-icon-foreground);
}
.satir-kopya svg { width: 15px; height: 15px; display: block; }
.kapi-kutu:hover > .satir-kopya,
.kapi-satiri:focus-visible + .satir-kopya,
.satir-kopya:focus,
.satir-kopya:focus-visible { display: inline-flex; }
.satir-kopya:hover { opacity: 1; color: var(--vscode-foreground); background: none; }
/* Odak GÖRÜNÜR kalmalıdır (klavye kullanıcısı nerede olduğunu bilmeli) fakat
   kutu yerine ince bir çerçeveyle: satır kuralının dolu zemini burada
   geçersizdir. */
.satir-kopya:focus-visible {
  opacity: 1; background: none;
  outline: 1px solid var(--vscode-focusBorder); outline-offset: 1px;
}
/* ── KAPI GÖVDESİ: önce kutu, sonra üç seçenek (Founder yerleşimi) ────────── */
.kapi-govde { padding: 2px 8px 8px 28px; }
.not-alani { display: flex; flex-direction: column; gap: 4px; }
.not-baslik { color: var(--vscode-descriptionForeground); font-size: 0.9em; }
.not-metin {
  width: 100%; max-width: 100%; min-width: 0; resize: vertical;
  font: inherit; padding: 4px 6px; overflow-wrap: anywhere;
  color: var(--vscode-input-foreground);
  background: var(--vscode-input-background);
  border: 1px solid var(--vscode-input-border, var(--vscode-contrastBorder, transparent));
}
.not-metin::placeholder { color: var(--vscode-input-placeholderForeground); }
.not-metin:focus { outline: 1px solid var(--vscode-focusBorder); outline-offset: -1px; }
.not-hata {
  margin: 0; padding: 2px 6px; line-height: 1.4; overflow-wrap: anywhere;
  color: var(--vscode-inputValidation-errorForeground, var(--vscode-errorForeground));
  background: var(--vscode-inputValidation-errorBackground);
  border: 1px solid var(--vscode-inputValidation-errorBorder);
}
.kararlar { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
.kararlar .satir {
  width: auto; flex: 0 1 auto; padding: 1px 10px 1px 6px;
  border: 1px solid var(--vscode-button-border, transparent);
  background: var(--vscode-button-secondaryBackground);
  color: var(--vscode-button-secondaryForeground);
}
.kararlar .satir:hover { background: var(--vscode-button-secondaryHoverBackground); }
/* Bağlam kopyalama görsel olarak İKİNCİL bir eylemdir: karar satırlarının
   yanında sağa yaslı, dolgusuz ve soluk durur; bir kararla karıştırılmaz. */
.kararlar .kopya-satiri {
  margin-left: auto; background: none; border-color: transparent;
  color: var(--vscode-descriptionForeground);
}
.kararlar .kopya-satiri:hover { background: var(--vscode-list-hoverBackground); }
[hidden] { display: none !important; }
`;

// ═══════════════════════════════════════════════════════════════════════════
// ⌨️ BETİK — yerel ağaçtan vazgeçilince KLAVYE GEZİNMESİ elle kurulur
//
//   Ağaç bize ok tuşlarını, açma/kapamayı ve Enter'ı bedava veriyordu; webview'de
//   hiçbiri gelmez. Burada elle kurulanlar: yukarı/aşağı ok ile satırlar arası
//   gezinme, sağ/sol ok ile açma-kapama ve seçenekler arası geçiş, Enter/Boşluk
//   ile seçim, kutuda Escape ile vazgeçme, Ctrl/Cmd+Enter ile şerhi yazma.
//
//   KURULAMAYAN ŞEY DÜRÜSTÇE SÖYLENİR: VS Code listelerinin yazarak-süzme
//   penceresi burada YOKTUR ve taklidi yapılmadı.
// ═══════════════════════════════════════════════════════════════════════════

const GOVDE_BETIGI = `
const kabuk = acquireVsCodeApi();
const kok = document.getElementById("kok");
const odaklanabilirler = () =>
  [...kok.querySelectorAll(".satir, .not-metin")].filter((d) => d.offsetParent !== null);

function kardesListe(dugme) {
  return dugme.parentElement.querySelector(":scope > ul, :scope > .kapi-govde");
}

/**
 * Açma-kapama YALNIZ kabuğa bildirilir; gövdeyi kabuk yeniden basar.
 * Tek yönlü akış bilerekdir: DOM ile eklenti tarafındaki defter iki ayrı gerçek
 * tutarsa biri ötekinden bayat kalır ve tazeleme yine metin düşürür.
 *
 * Kapı satırında dosya ve kod da gönderilir: kabuk odak niyetini bu iki alandan
 * okur ve YALNIZ kullanıcının kendi açtığı kapıda odağı kutuya götürür.
 */
function acKapa(dugme, acik) {
  kabuk.postMessage({
    tur: "aç", kimlik: dugme.dataset.kimlik, acik,
    dosya: dugme.dataset.dosya, kod: dugme.dataset.kod,
  });
}

/** Bir kapının kendi satırı — kutudan çıkarken odak buraya döner. */
function kapiSatiriBul(dosya, kod) {
  return kok.querySelector('.kapi-satiri[data-dosya="' + CSS.escape(dosya) +
    '"][data-kod="' + CSS.escape(kod) + '"]');
}

/**
 * Odağı gerekçe kutusuna götürür (Founder hükmü 2026-07-29).
 *
 * SAYFA ZIPLAMAZ VE KAPI SATIRI GÖRÜNÜR KALIR: önce kapı satırı en yakın
 * kenara çekilir, sonra odak kaydırmasız (preventScroll) verilir. Ters sırada
 * yapılsaydı tarayıcı kutuyu ortalamak için sayfayı kaydırır ve kullanıcı hangi
 * yazdığını göremezdi. İmleç metnin SONUNA konur: taslak varsa kullanıcı
 * yazmaya kaldığı yerden devam eder.
 */
function notaOdaklan(notId) {
  const alan = document.getElementById("not-" + notId);
  if (!alan) return;
  const kutu = alan.closest(".not-alani");
  const satir = kutu && kapiSatiriBul(kutu.dataset.dosya, kutu.dataset.kod);
  if (satir) satir.scrollIntoView({ block: "nearest" });
  alan.focus({ preventScroll: true });
  alan.setSelectionRange(alan.value.length, alan.value.length);
}

/**
 * ⎋ KUTUDAN ÇIKIŞ — klavye kullanıcısı kapana kısılmaz.
 *
 * Kapı AÇIK kalır, taslak DURUR, hiçbir kayıt yazılmaz; odak kapı satırına
 * döner ve kullanıcı ok tuşlarıyla gezinmeye kaldığı yerden devam eder.
 * Vazgeçmek ayrı bir eylemdir ve kapı satırındaki ikinci Escape'tir.
 */
function kutudanCik(kutu) {
  const satir = kapiSatiriBul(kutu.dataset.dosya, kutu.dataset.kod);
  if (!satir) return;
  satir.scrollIntoView({ block: "nearest" });
  satir.focus({ preventScroll: true });
}

function kutuMetni(dugme) {
  const alan = document.getElementById("not-" + dugme.dataset.not);
  return alan ? alan.value : "";
}

function hatayiGoster(notId, cumle) {
  const hata = document.getElementById("hata-" + notId);
  if (!hata) return;
  if (cumle) { hata.textContent = cumle; hata.hidden = false; }
  else hata.hidden = true;
  const alan = document.getElementById("not-" + notId);
  if (cumle && alan) alan.focus();
}

kok.addEventListener("click", (olay) => {
  const dugme = olay.target.closest(".satir");
  if (!dugme) return;
  if (dugme.classList.contains("karar-satiri")) {
    kabuk.postMessage({
      tur: "kararVer", dosya: dugme.dataset.dosya, kod: dugme.dataset.kod,
      satir: Number(dugme.dataset.satir), rol: dugme.dataset.rol,
      not: kutuMetni(dugme),
    });
    return;
  }
  // 📋 Bağlam kopyalama KENDİ dalıdır: tıkı açma-kapamaya düşmez ve hiçbir
  // karar yazmaz. Kabuk kapının bağlamını kendi defterinden okuyup panoya
  // yazar ve kapının kodunu taşıyan bir bildirim basar.
  if (dugme.dataset.rol === "bağlamKopyala") {
    kabuk.postMessage({ tur: "bağlamKopyala", dosya: dugme.dataset.dosya, kod: dugme.dataset.kod });
    return;
  }
  // TEK TIK: kapı satırı HEM açılır HEM Adımı kaynakta gösterir (Founder hükmü).
  // Adıma gitme YALNIZ AÇILIŞTA olur: kapanan bir satır kaynağı yeniden açsaydı,
  // kabuk kapıyı gösterirken satırı da geri açar ve kullanıcı kapatamazdı.
  const acik = dugme.getAttribute("aria-expanded") !== "true";
  acKapa(dugme, acik);
  if (acik && dugme.classList.contains("kapi-satiri")) {
    kabuk.postMessage({ tur: "kapıSeç", dosya: dugme.dataset.dosya, kod: dugme.dataset.kod });
  }
});

// Yazılan her harf eklenti tarafındaki taslak defterine düşer: tazeleme gövdeyi
// yeniden bassa da metin defterden geri gelir ve kaybolmaz.
kok.addEventListener("input", (olay) => {
  const alan = olay.target.closest(".not-metin");
  if (!alan) return;
  const kutu = alan.closest(".not-alani");
  if (alan.value.trim()) hatayiGoster(kutu.dataset.kimlik, "");
  kabuk.postMessage({ tur: "taslak", kimlik: kutu.dataset.kimlik, metin: alan.value });
});

kok.addEventListener("keydown", (olay) => {
  const alan = olay.target.closest(".not-metin");
  if (alan) {
    const kutu = alan.closest(".not-alani");
    // ⎋ ÇIKIŞ YOLU HER ZAMAN AÇIKTIR. Escape kutudan çıkar ve odağı kapı
    // satırına verir; kapı AÇIK kalır, taslak DURUR, hiçbir kayıt yazılmaz.
    // Shift+Tab ikinci yoldur: Escape'i kendi düzeninde başka bir işe bağlamış
    // ya da ekran okuyucuyla gezinen kullanıcı kapana kısılmaz.
    if (olay.key === "Escape" || (olay.key === "Tab" && olay.shiftKey)) {
      olay.preventDefault();
      kutudanCik(kutu);
    } else if (olay.key === "Enter" && (olay.ctrlKey || olay.metaKey)) {
      olay.preventDefault();
      const serh = kok.querySelector('.karar-satiri[data-rol="şerh"][data-not="' + CSS.escape(kutu.dataset.kimlik) + '"]');
      if (serh) serh.click();
    }
    return;
  }
  const dugme = olay.target.closest(".satir");
  if (!dugme) return;
  // ⎋ İKİNCİ ESCAPE = VAZGEÇ. Kutudan çıkan kullanıcı kapı satırındadır; oradaki
  // Escape kapıyı KAPATIR ve vazgeçişi bildirir. İki anlam böylece çakışmaz:
  // birincisi "kutudan çıkayım", ikincisi "bu kapıyı şimdilik bırakıyorum".
  // Hiçbiri kayıt yazmaz ve ikisi de sessiz değildir.
  if (olay.key === "Escape" && dugme.classList.contains("kapi-satiri")
      && dugme.getAttribute("aria-expanded") === "true") {
    olay.preventDefault();
    acKapa(dugme, false);
    kabuk.postMessage({ tur: "iptal", dosya: dugme.dataset.dosya, kod: dugme.dataset.kod });
    return;
  }
  // 📋 SATIRDAKİ EYLEM BİR <span role="button"> ÖĞESİDİR ve düğmelerin bedava
  // aldığı Enter/Boşluk tıkını almaz; iki tuş burada elle bağlanır. Tuş kendi
  // mesajını yazmaz, öğenin tıkını çağırır: ikinci bir mesaj yolu doğsaydı iki
  // yol zamanla ayrışır ve biri ötekinden bayat kalırdı.
  if ((olay.key === "Enter" || olay.key === " ")
      && dugme.dataset.rol === "bağlamKopyala" && dugme.tagName !== "BUTTON") {
    olay.preventDefault();
    dugme.click();
    return;
  }
  const hepsi = odaklanabilirler();
  const sira = hepsi.indexOf(dugme);
  // Kopyalama satırı da eylem sırasının bir üyesi gibi gezinir: sağ ve sol ok
  // komşu eyleme geçer. Karar satırlarının kendi gezinmesi aynen korunur.
  const karar = dugme.classList.contains("karar-satiri")
    || dugme.classList.contains("kopya-satiri");
  if (olay.key === "ArrowDown") { olay.preventDefault(); hepsi[Math.min(sira + 1, hepsi.length - 1)].focus(); }
  else if (olay.key === "ArrowUp") { olay.preventDefault(); hepsi[Math.max(sira - 1, 0)].focus(); }
  else if (olay.key === "ArrowRight") {
    olay.preventDefault();
    if (karar) hepsi[Math.min(sira + 1, hepsi.length - 1)].focus();
    else if (kardesListe(dugme)) acKapa(dugme, true);
  } else if (olay.key === "ArrowLeft") {
    olay.preventDefault();
    if (karar) hepsi[Math.max(sira - 1, 0)].focus();
    else if (kardesListe(dugme)) acKapa(dugme, false);
  } else if (olay.key === "Home") { olay.preventDefault(); hepsi[0].focus(); }
  else if (olay.key === "End") { olay.preventDefault(); hepsi[hepsi.length - 1].focus(); }
});

/**
 * TAZELEME YAZILMAKTA OLAN METNİ DÜŞÜRMEZ — iki kilit birlikte çalışır.
 *   ① Metnin KENDİSİ eklenti tarafındaki taslak defterinde yaşar ve yeni gövdeye
 *      zaten yazılı gelir; DOM'un ömrüne bağlı değildir.
 *   ② ODAK ve İMLEÇ konumu burada korunur. Bu ikincisi olmadan kullanıcı metnini
 *      kaybetmezdi ama cümlesinin ortasında klavyeyi kaybederdi — ölçülen kusur
 *      ailesinin aynısı, yalnız başka kılıkta.
 */
function govdeyiYerineKoy(html) {
  const odak = document.activeElement;
  const odakId = odak && odak.id ? odak.id : "";
  // Düğmelerin id'si yoktur; onlar KARARLI KİMLİKLERİYLE geri bulunur. Bu ikinci
  // yol olmasaydı tazeleme, kutuda olmayan kullanıcının odağını gövdeye düşürür
  // ve ok tuşları çalışmaz olurdu.
  const odakKimlik = odak && odak.dataset ? odak.dataset.kimlik || "" : "";
  const bas = odak && odak.selectionStart != null ? odak.selectionStart : null;
  const son = odak && odak.selectionEnd != null ? odak.selectionEnd : null;
  const kaydirma = kok.scrollTop;
  kok.innerHTML = html;
  kok.scrollTop = kaydirma;
  const yeni = odakId
    ? document.getElementById(odakId)
    : (odakKimlik ? kok.querySelector('[data-kimlik="' + CSS.escape(odakKimlik) + '"]') : null);
  if (!yeni) return;
  yeni.focus({ preventScroll: true });
  if (bas != null && yeni.setSelectionRange) yeni.setSelectionRange(bas, son);
}

window.addEventListener("message", (olay) => {
  const m = olay.data;
  if (!m) return;
  if (m.tur === "gövde") {
    govdeyiYerineKoy(m.html);
    // ODAK YALNIZ NİYET VARSA KUTUYA GİDER. Tazeleme mesajları bu alanı hiç
    // taşımaz, dolayısıyla tazeleme odağı kullanıcının yazdığı yerden ÇALAMAZ.
    if (m.odakNot) notaOdaklan(m.odakNot);
    return;
  }
  if (m.tur === "odakla") notaOdaklan(m.kimlik);
});
`;

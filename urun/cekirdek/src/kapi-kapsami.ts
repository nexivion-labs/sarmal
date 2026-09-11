// ═══════════════════════════════════════════════════════════════════════════
// kapi-kapsami.ts — 🚪 KAPI-KAPSAM İLANI (KYN-MTR-A05 · tek kaynak + nöbet)
//
//   Bu modül, hangi denetim üreticisinin hangi yüzeyde koştuğunu tek bir yerde
//   ilan eder. Önceki ilan `nitelik/kapi_kapsami.sar` içinde serbest metin bir
//   tabloydu; ölçüm o tablonun bayatladığını gösterdi, çünkü yapı-aynası ailesinin
//   beş üyesi eklentiye indi ama belge hiç güncellenmedi (KYN-MTR-A05 belirtisi).
//   Serbest metin kendi kendini zorlayamadığı için sapma sessiz kaldı.
//
//   İlan yalnız İKİ bilgi taşır: üreticinin adı ve gerçekten koştuğu yüzeyler.
//   İlk sürüm her üreticinin tanı kimliklerini de elle listeliyordu; bağımsız
//   denetim bunun iki kusurunu ölçtü. Birincisi, kimlik listesi hiçbir nöbetin
//   ölçmediği ikinci bir elle-tutulan tabloydu ve bir üretici yeni kimlik
//   kazandığında sessizce bayatlayacaktı. İkincisi, kimlik-temelli süzgeç
//   yüzey kararını yanlış üreticiye uygulayabiliyordu: aynı kimlik iki ayrı
//   üreticide yaşayabilir (kenar-metin hem panelde koşan gizli-bağımlılık
//   üreticisinde hem yalnız komut satırına ayrılmış referans üreticisinde
//   doğar) ve kimlikle süzen panel, komut satırına ayrılmış üreticinin
//   tanısını da geçiriyordu. Bu yüzden kimlik sütunu tümden söküldü; süzgeç
//   artık üretici kimliğiyle çalışır ve her tanının üreticisini `denetimKos`
//   koşum anında damgalar (denetim.ts · koken haritası).
//
//   Bu dosya iki şeyi birden yapar. Birincisi İLANDIR: `KAPI_KAPSAMI` dizisi her
//   üreticinin (denetci.ts · dag.ts · kuralci.ts · dogrulayici.ts dışa açımı)
//   GERÇEKTEN koştuğu yüzeyleri taşır — kapsam bu Adımın kararı değil, bugünkü
//   fiilî davranışın ÖLÇÜMÜDÜR (hangi kapının hangi yüzeye taşınacağı Founder
//   hükmüdür, bu dosya yalnız taşınmış olanı kaydeder). İkincisi NÖBETTİR:
//   `cliGercekUreticileri` `denetim.ts` kaynağını okuyup CLI'nin (`denetimKos`)
//   gerçekten çağırdığı üretici kümesini çıkarır; `kapsamNobeti` bu kümeyi
//   ilanla karşılaştırır ve iki yönlü sapmayı (ilanda olup gerçekte çağrılmayan ·
//   gerçekte çağrılıp ilanda olmayan) tanı olarak döndürür. Nöbetin mutasyon
//   kanıtı `cekirdek/sinama/kapi-kapsami.test.ts` içinde yaşar.
//
//   Eklenti bu ilanı `panelCaprazUreticiKumesi()` üstünden okur ve `denetimKos`
//   akışını her tanının köken damgasıyla SÜZER (eklenti.ts · denetleHepsi) —
//   ikinci bir elle-tutulan üretici listesi bir daha kurulmaz (proje-denetim.ts
//   silinmiştir, yerini bu süzgeç almıştır). Panel ile ilan aynı kaynağı okur ve
//   süzgeç anahtarı üretici kimliği olduğu için, komut satırına ayrılmış bir
//   üreticinin tanısı panel süzgecinden yapısal olarak geçemez.
// ═══════════════════════════════════════════════════════════════════════════

import { readFileSync } from "node:fs";

/** Bir üreticinin koşabileceği dört yüz — kapi_kapsami.sar'ın eski dört sütunuyla birebir. */
export type Yuzey = "cli" | "panel" | "mcp" | "tekil";

/** Tanı kademesi — YUZ-3.3'ün yüzey ayrımını belirleyen tek değişken. */
export type Kademe = "hata" | "uyarı" | "bilgi";

export interface KapiGirdisi {
  /** Üretici işlevin adı — denetci.ts/dag.ts/kuralci.ts/dogrulayici.ts dışa açımıyla birebir aynı yazım. */
  uretici: string;
  /** Üreticinin tanımlı olduğu kaynak dosya. */
  modul: "denetci.ts" | "dag.ts" | "kuralci.ts" | "dogrulayici.ts";
  /**
   * Bu üreticinin basabileceği EN ÜST tanı kademesi (BKM-DNT-A01 ölçümü).
   * Kanon uyumunu makine-okur kılan alan budur: YUZ-3.3 hata ile uyarıyı
   * Problems yüzeyine yolladığı için `hata` ya da `uyarı` kademesi taşıyan bir
   * üretici panel yüzeyi TAŞIMAK ZORUNDADIR. Değer elle yazılır fakat elle
   * KALMAZ: `kapi-kapsami.test.ts` içindeki görgül nöbet gerçek bir denetim
   * koşusundan gözlenen kademeyi bu beyanla karşılaştırır ve beyanın gözlenenin
   * ALTINDA kalmasını kırmızıya çevirir.
   */
  kademe: Kademe;
  /** Bu üreticinin BUGÜN gerçekten koştuğu yüzeyler — ölçülmüş, karar değil. */
  yuzeyler: readonly Yuzey[];
  /**
   * Yalnız komut satırında kalan girdinin GEREKÇESİ. Panel yüzeyi taşımayan her
   * girdi bu cümleyi taşımak zorundadır; gerekçesiz bir CLI girdisi sessiz bir
   * gizleme kararıdır ve `kanonUyumNobeti` onu ayrışma sayar.
   */
  cliGerekcesi?: string;
  /**
   * PANEL İKİZİ (BKM-DNT-A06). Hata ya da uyarı basan bir üretici kural olarak
   * panel yüzeyi taşımak zorundadır (YUZ-3.1 · YUZ-3.3) ve `kanonUyumNobeti` bunu
   * zorlar. Tek meşru istisna, aynı hükmü panele basan bir İKİZİN nöbette
   * olmasıdır: o hâlde ikinci üreticinin de panele çıkması aynı olguya iki tanı
   * bastırır. İstisna ancak burada ADIYLA beyan edilirse geçerlidir ve beyan
   * ölçülür: adı yazılan üretici ilanda bulunmalı ve panel yüzeyi TAŞIMALIDIR;
   * taşımıyorsa istisna düşer ve nöbet `panelsiz-kademe` sapmasını yine bildirir.
   * Böylece istisna bir kaçış deliği değil, sınanan bir iddia olur.
   */
  panelIkizi?: string;
}

/**
 * KAPI-KAPSAM İLANI. Sıra denetim.ts (denetimKos) içindeki çağrı sırasını izler
 * ki bu dosyayı okuyan biri CLI akışındaki yeriyle eşleştirebilsin. Panel yüzeyi
 * taşıyan on sekiz girdi, eklentinin bugün fiilen çalıştırdığı kümedir (eski
 * crossTanilar dizisi + proje-denetim.ts'in "canlı" çağrıları + tanilaCekirdek'in
 * dogrula/fazVadeTanilari çağrısı, 2026-08-23 tarihli KYN-MTR-A05 ölçümü) — bu
 * Adım o kümeyi GENİŞLETMEZ, yalnız iki hâlde de tek kaynaktan zorlar.
 *
 * ── SÜTUNLARIN OKUNUŞU (BKM-DNT-A06 · 2026-09-10) ───────────────────────────
 * `cli`   — komut satırının tam denetim akışında (`denetim.ts`) çağrılır.
 * `panel` — eklentinin panel yollarında koşar; kaynağı bu pakette değildir ve
 *           bu yüzden dört yüzeyli kapsam nöbeti onu ölçemez, yalnız kanon
 *           uyum nöbeti (hata/uyarı ⇒ panel) üstünden zorlanır.
 * `mcp`   — MCP sunucusunun DOĞRUDAN çağırdığı üreticidir (`mcp.ts`).
 * `tekil` — tek-dosya yolunda (`sarmal.ts` içindeki YÜZEY:tekil bölgesi) koşar.
 *
 * ── ALT SÜREÇ KÖPRÜSÜ KURALI ────────────────────────────────────────────────
 * MCP'nin proje denetimi aracı komut satırını ALT SÜREÇ olarak koşturur ve
 * çıktısını ajana aynen verir. Bu yüzden `cli` yüzeyi taşıyan HER üretici,
 * ilanında `mcp` yazmasa bile fiilen MCP yüzeyinde çalışır ve sonucu ajana
 * ulaşır. Kural üretici başına YAZILMAZ, bir kez yazılır ve motor karşılığı
 * `mcpEtkinUreticiler` işlevidir; ilanın `mcp` sütunu yalnız doğrudan çağrıyı
 * bildirir. Gerekçe şudur: köprü altmış iki satırın altmış birini birden MCP'ye
 * taşır ve bunu üretici başına yazmak ilanı ölçüm olmaktan çıkarıp bir kopyaya
 * çevirir; kopya ise köprü değiştiği gün sessizce bayatlar.
 */
export const KAPI_KAPSAMI: readonly KapiGirdisi[] = [
  // ── Dosya-içi bekçi: dört yüzde de koşan tek aile (kapi_kapsami.sar eski satır 1). ──
  { uretici: "dogrula", modul: "dogrulayici.ts", kademe: "uyarı", yuzeyler: ["cli", "panel", "mcp", "tekil"] },
  { uretici: "fazVadeTanilari", modul: "denetci.ts", kademe: "bilgi", yuzeyler: ["cli", "panel"] },
  { uretici: "mevsimVadeTanilari", modul: "denetci.ts", kademe: "bilgi", yuzeyler: ["cli", "panel"] },
  // BKM-DNT-A06 (2026-09-10): `tekil` beyanı ölçümle ayrıştığı için DÜŞÜRÜLDÜ.
  // Tek-dosya yolu (`sarmal.ts` içindeki YÜZEY:tekil bölgesi) yalnız `dogrula`
  // çağırır ve bu üreticiye hiç uğramaz; beyan bir niyetti, ölçüm değildi. Bu
  // Adım ilanı gerçeğe çeker, çünkü hangi üreticinin hangi yüzeyde koşacağı
  // kararı BKM-DNT-A01 sınıfındandır ve bir ilan düzeltmesiyle verilemez.
  // Üreticinin tek-dosya yoluna BAĞLANMASI istenirse o karar ayrıca alınır.
  { uretici: "altKatmanTekilligiTanilari", modul: "denetci.ts", kademe: "hata", yuzeyler: ["cli", "panel"] },

  // ── Yapısal mutabakat (eski proje-denetim.ts'in "canlı" çağırdığı üç üretici + ana-yok). ──
  { uretici: "denetle", modul: "denetci.ts", kademe: "hata", yuzeyler: ["cli", "panel"] },
  { uretici: "kuralTanilari", modul: "denetci.ts", kademe: "uyarı", yuzeyler: ["cli", "panel"] },
  { uretici: "ilansizGovdeDenetle", modul: "denetci.ts", kademe: "bilgi", yuzeyler: ["cli", "panel"] },
  { uretici: "anaYokTanisi", modul: "denetci.ts", kademe: "hata", yuzeyler: ["cli", "panel"] },
  { uretici: "rafsizAnadizinTanilari", modul: "denetci.ts", kademe: "uyarı", yuzeyler: ["cli", "panel"] },
  { uretici: "anadizinSekliTanilari", modul: "denetci.ts", kademe: "hata", yuzeyler: ["cli", "panel"] },

  // ── Referans + metin atfı (TAM kapsam — disk taraması ister, panelde ucuz değil). ──
  { uretici: "referansTanilari", modul: "denetci.ts", kademe: "hata", yuzeyler: ["cli", "panel"] },
  { uretici: "metinAtifTanilari", modul: "denetci.ts", kademe: "uyarı", yuzeyler: ["cli", "panel"] },

  // ── Dosyalar-arası + ebedi + mühür (M-2 aile — bugün CLI-only). ──
  { uretici: "dosyalararasiCatismaTanilari", modul: "denetci.ts", kademe: "hata", yuzeyler: ["cli", "panel"] },
  { uretici: "ebediTanilar", modul: "kuralci.ts", kademe: "hata", yuzeyler: ["cli", "panel"] },
  { uretici: "muhurTanilari", modul: "kuralci.ts", kademe: "hata", yuzeyler: ["cli", "panel"] },
  { uretici: "birlesimCatismaTanilari", modul: "kuralci.ts", kademe: "hata", yuzeyler: ["cli", "panel"] },

  // ── Bugün PANELDE de koşan (eski eklenti crossTanilar — cross-file ama ucuz+saf) ailesi. ──
  { uretici: "katmansizTeknolojiTanilari", modul: "denetci.ts", kademe: "uyarı", yuzeyler: ["cli", "panel"] },
  { uretici: "yinelenenKodTanilari", modul: "denetci.ts", kademe: "uyarı", yuzeyler: ["cli", "panel"] },
  { uretici: "dagTanilari", modul: "dag.ts", kademe: "hata", yuzeyler: ["cli", "panel"] },
  { uretici: "gizliBagimlilikTanilari", modul: "denetci.ts", kademe: "hata", yuzeyler: ["cli", "panel"] },
  { uretici: "durumsizAdimTanilari", modul: "denetci.ts", kademe: "uyarı", yuzeyler: ["cli", "panel"] },
  { uretici: "donguTanilari", modul: "denetci.ts", kademe: "uyarı", yuzeyler: ["cli", "panel"] },
  { uretici: "durumTutarlilikTanilari", modul: "dag.ts", kademe: "hata", yuzeyler: ["cli", "panel"] },
  { uretici: "kopukZincirTanilari", modul: "dag.ts", kademe: "uyarı", yuzeyler: ["cli", "panel"] },
  { uretici: "ozBagimlilikTanilari", modul: "dag.ts", kademe: "hata", yuzeyler: ["cli", "panel"] },
  { uretici: "kayipKenarTanilari", modul: "dag.ts", kademe: "uyarı", yuzeyler: ["cli", "panel"] },
  { uretici: "hiyerarsiTanilari", modul: "denetci.ts", kademe: "hata", yuzeyler: ["cli", "panel"] },
  { uretici: "dayanakTanilari", modul: "denetci.ts", kademe: "bilgi", yuzeyler: ["cli", "panel"] },

  // ── Diğer proje-geneli üreticiler — bugün yalnız CLI (Adım bu kararı DEĞİŞTİRMEZ). ──
  { uretici: "kavusumsuzParalellikTanilari", modul: "denetci.ts", kademe: "uyarı", yuzeyler: ["cli", "panel"] },
  { uretici: "dogusEksikProjeTanilari", modul: "denetci.ts", kademe: "uyarı", yuzeyler: ["cli", "panel"] },
  // BKM-DNT-A06 (2026-09-10): İlanda HİÇ YOKTU ve nöbet onu göremiyordu, çünkü
  // nöbet yalnız komut satırı akışının kaynağını okuyordu; üretici ise yalnız
  // MCP'nin tek-dosya yüzünde çağrılır (`mcp.ts` doğuş-rehberi turu). Panel
  // yüzeyi taşımaz ve taşımaması bilinçlidir: proje bağlamı olan bir ağaçta
  // aynı hükmü panele basan ikizi `dogusEksikProjeTanilari` nöbettedir ve iki
  // üreticinin birlikte koşması aynı olguya iki tanı bastırırdı.
  { uretici: "dogusEksikTanilari", modul: "denetci.ts", kademe: "uyarı", yuzeyler: ["mcp"],
    panelIkizi: "dogusEksikProjeTanilari",
    cliGerekcesi: "Komut satırında hiç koşmaz; yalnız MCP'nin proje-bağlamsız tek-dosya yüzünde çağrılır ve orada çıktı doğrudan ajana verilir." },
  { uretici: "olgunlukOnayiTanilari", modul: "denetci.ts", kademe: "bilgi", yuzeyler: ["cli"],
    cliGerekcesi: "Yalnız bilgi düzeyinde konuşur: olgunluk onayı bir drift değil, bir kademe ölçümüdür ve YUZ-3.3 bilgi düzeyli ölçümü Bildirimler hanesine yollar." },
  { uretici: "siloBlokTanilari", modul: "denetci.ts", kademe: "uyarı", yuzeyler: ["cli", "panel"] },
  { uretici: "kavusumsuzDilimTanilari", modul: "denetci.ts", kademe: "uyarı", yuzeyler: ["cli", "panel"] },
  { uretici: "acikAdimTanilari", modul: "denetci.ts", kademe: "bilgi", yuzeyler: ["cli"],
    cliGerekcesi: "Yalnız bilgi düzeyinde konuşur: açık Adım bir ihlal değil, motorun susmama davranışıdır ve panelde her açık işi kırmızı gibi göstermek kapı hükmünü belirsizleştirir." },
  // GBR-A02: çok beklemede-Adım tek özet satırına katlanır — ham liste `say()`e,
  // katlanmış görünüş `bas()`e gider; ikisi de aynı kimliği taşır.
  { uretici: "acikAdimGosterimi", modul: "denetci.ts", kademe: "bilgi", yuzeyler: ["cli"],
    cliGerekcesi: "Yalnız bilgi düzeyinde konuşur ve açık Adım listesinin katlanmış komut satırı görünüşüdür; panelde ikizi zaten açık Adım ölçümüyle verilir." },
  { uretici: "acikHatirlaticiGosterimi", modul: "denetci.ts", kademe: "bilgi", yuzeyler: ["cli"],
    cliGerekcesi: "Yalnız bilgi düzeyinde konuşur: açık hatırlatıcı bilinçli bir ileri bağlamdır ve YUZ-3.3 onu Problems yüzeyinden açıkça ayırır." },
  { uretici: "kapsamTanilari", modul: "denetci.ts", kademe: "uyarı", yuzeyler: ["cli", "panel"] },
  { uretici: "tekCocukTanilari", modul: "denetci.ts", kademe: "bilgi", yuzeyler: ["cli"],
    cliGerekcesi: "Yalnız bilgi düzeyinde konuşur: tek çocuklu kapsayıcı bir öneridir, ihlal değildir; ara kademe kanonda isteğe bağlıdır." },
  { uretici: "yetimMeyveTanilari", modul: "denetci.ts", kademe: "uyarı", yuzeyler: ["cli", "panel"] },
  { uretici: "docDriftTanilari", modul: "denetci.ts", kademe: "uyarı", yuzeyler: ["cli", "panel"] },
  { uretici: "beyansizYapiTanilari", modul: "denetci.ts", kademe: "hata", yuzeyler: ["cli", "panel"] },
  { uretici: "adAyraciTanilari", modul: "denetci.ts", kademe: "bilgi", yuzeyler: ["cli"],
    cliGerekcesi: "Yalnız bilgi düzeyinde konuşur: ad ayracı bir yazım önerisidir ve hiçbir kapıyı kapatmaz." },
  { uretici: "halefTanilari", modul: "denetci.ts", kademe: "hata", yuzeyler: ["cli", "panel"] },
  { uretici: "teknolojisizYuzeyTanilari", modul: "denetci.ts", kademe: "uyarı", yuzeyler: ["cli", "panel"] },
  // ORK-3.4 · PANEL YÜZEYİ EKLENDİ (BKM-DNT-A04 · 2026-09-02). Madde bu tanının
  // "proje CLI ve Bildirimler" yüzeylerinde görünmesini zorlar ve yönlendirme
  // matrisi onu Bildirimler hanesinde sayar; üretici ise 2026-08-28 tarihinde
  // onarılan ateşlemiş hatırlatıcı ikizinin aksine yalnız komut satırında kalmıştı
  // ve panel süzgeci onu yapısal olarak eliyordu. Karar Founder'a sorulmadı, çünkü
  // kanon yüzeyi zaten açıkça yazmaktadır; ilan yalnız kanona uyduruldu.
  { uretici: "onceliksizAdimTanilari", modul: "denetci.ts", kademe: "bilgi", yuzeyler: ["cli", "panel"] },
  // YUZ-3.4 · PANEL YÜZEYİ FOUNDER KARARIYLA EKLENDİ (2026-08-28). Madde bu tanının
  // "proje CLI ve Bildirimler" yüzeylerinde görünmesini zorlar ve yönlendirme matrisi
  // onu Bildirimler hanesinde sayar; buna karşılık üretici yalnız komut satırına
  // ayrıldığı için ateşleme anı Founder'ın baktığı panelde hiç görünmüyordu. Ölçüm
  // 2026-08-28 tarihinde yapıldı: hedef Adım tamamlandığında tanı komut satırında
  // doğuyor, panel süzgecinden ise üretici damgası yüzünden yapısal olarak
  // geçemiyordu. Hatırlatıcının bütün vaadi hatırlatma ANINDA görünmektir; o an
  // görünmezse mekanizmanın son halkası kopuktur.
  { uretici: "atesleyenHatirlaticiTanilari", modul: "denetci.ts", kademe: "bilgi", yuzeyler: ["cli", "panel"] },
  { uretici: "dilTanilari", modul: "denetci.ts", kademe: "bilgi", yuzeyler: ["cli"],
    cliGerekcesi: "Yalnız bilgi düzeyinde konuşur: dil ölçümü bir sayımdır, kaynakta düzeltilecek bir sapma bildirmez." },
  { uretici: "uygulanmamisKararTanilari", modul: "denetci.ts", kademe: "uyarı", yuzeyler: ["cli", "panel"] },
  { uretici: "beceriDriftTanilari", modul: "denetci.ts", kademe: "uyarı", yuzeyler: ["cli", "panel"] },
  // RF-T6-A05: yalnız kanon-sahibi depoda (oz/siniflama/kayit.json var) koşar — dogfood-only, yine de CLI-only.
  { uretici: "kullanimsizTipTanilari", modul: "denetci.ts", kademe: "bilgi", yuzeyler: ["cli"],
    cliGerekcesi: "Yalnız bilgi düzeyinde konuşur ve yalnız kanon sahibi depoda anlamlıdır; kullanılmayan tip bir envanter gözlemidir." },

  // ── Yeni-kanon Proje kapısı (kapiKos ile sarılı on bir üretici — motor turu ikinci halkası). ──
  { uretici: "rejimTanilari", modul: "denetci.ts", kademe: "hata", yuzeyler: ["cli", "panel"] },
  { uretici: "omurgaTanilari", modul: "denetci.ts", kademe: "hata", yuzeyler: ["cli", "panel"] },
  { uretici: "iliskiSinifiTanilari", modul: "denetci.ts", kademe: "hata", yuzeyler: ["cli", "panel"] },
  { uretici: "authTanilari", modul: "denetci.ts", kademe: "hata", yuzeyler: ["cli", "panel"] },
  { uretici: "sefAkisiTanilari", modul: "denetci.ts", kademe: "hata", yuzeyler: ["cli", "panel"] },
  { uretici: "dilKanonTanilari", modul: "denetci.ts", kademe: "hata", yuzeyler: ["cli", "panel"] },
  { uretici: "ogretimTanilari", modul: "denetci.ts", kademe: "hata", yuzeyler: ["cli", "panel"] },
  { uretici: "stratejiTanilari", modul: "denetci.ts", kademe: "hata", yuzeyler: ["cli", "panel"] },
  { uretici: "tipEvreniTanilari", modul: "denetci.ts", kademe: "hata", yuzeyler: ["cli", "panel"] },
  { uretici: "terfiKanitiTanilari", modul: "denetci.ts", kademe: "bilgi", yuzeyler: ["cli"],
    cliGerekcesi: "Yalnız bilgi düzeyinde konuşur: terfi kanıtı bir kapı değil, sicil olgunluğunun ölçümüdür." },
  { uretici: "yuzTanilari", modul: "denetci.ts", kademe: "hata", yuzeyler: ["cli", "panel"] },

  // NOT: `orkestrasyonTanilari` (tanı-sözleşmesi-uyumsuz · sahte-tam-yeşil vb. altı hüküm)
  // BİLİNÇLİ OLARAK bu tabloda YOKTUR: denetci/dag/kuralci/dogrulayici'den içe
  // aktarılmaz, denetim.ts'in KENDİ gövdesinde tanımlanır ve yalnız TAM koşumun
  // birikmiş çıktısı üstünde anlamlıdır (atlanan kapı sayacı gibi tek-turluk
  // durum ister). `cliGercekUreticileri` yalnız dört modülün ithalatını tarar;
  // bu üreticiyi de tabloya koymak nöbeti her koşuda YANLIŞ "ilan-fazlası"
  // sapmasıyla gürültüye boğardı — o yüzden kapsam dışı bırakılması bir eksiklik
  // değil, ölçüm sınırının dürüst beyanıdır. Koşum anında bu üreticinin tanıları
  // da köken damgası alır ("orkestrasyonTanilari"); ilan panel yüzeyi vermediği
  // için panel süzgecinden geçmezler.
];

/**
 * Yardımcı/altyapı işlevleri: denetim.ts bunları çağırır ama bunlar TANI
 * ÜRETMEZ (yükleme, indeksleme, sayaç, özet gibi işler görürler). Nöbet bu
 * kümeyi CLI'nin gerçek çağrı kümesinden ELER; aksi hâlde her yardımcı işlev
 * "ilanda yok" sapması gibi görünüp nöbeti gürültüye boğardı.
 */
const YARDIMCI_ISLEVLER: ReadonlySet<string> = new Set([
  "anadizinBul", "beyanliDayanaksizKurallar", "dagKur", "dayanaksizKararlar",
  "dayanaksizKurallar", "dersAcikAdimSayisi", "diskTara", "ebediEnvanter",
  // `kodTanimlariIndeksle` (KPS-ADA-A01) `kodIndeksle` ile aynı ailedendir: tanı
  // üretmez, ORK-4 kapsam kararının okuduğu tanım haritasını kurar. `adAlaniKapisi`
  // ise o haritanın üstüne ORK-4 kardeş kök kapısını kurar ve yine tanı üretmez;
  // kapının kendisi bir ölçüm değil, ölçenlerin ortak sorduğu sorudur.
  "adAlaniKapisi", "karneOzeti", "katiRejimliDosyalar", "kodIndeksle", "kodTanimlariIndeksle", "planlamaEvresiMi",
  // KPS-KOD-A01: `adAlaniSecenekleri` çıplak bir kodun kardeş projelerdeki
  // `PRJ::KOD` karşılıklarını, `dugumYokMetni` ise o seçenekleri soran "yok"
  // cümlesini KURAR; ikisi de graf, etki ve gezinme yüzlerinin ortak metin
  // yardımcısıdır ve TANI ÜRETMEZ. Tanı basmayan bir gövdeye yüzey beyanı
  // vermek ölçülmeyen bir zorlamayı canlı göstermek olurdu.
  "adAlaniSecenekleri", "dugumYokMetni",
  "programlariYukle", "yerelEvre1Yumusat", "evre1Yumusat",
  // BKM-DNT-A13: `yolTuru` bir yolun diskteki cinsini ölçer ve TANI ÜRETMEZ;
  // denetci.ts'ten dışa açılmasının sebebi ölçümün ikinci bir yüzeyde (iskelet
  // aracı) yeniden yazılmasını önlemektir. Ölçen değil, ölçenlerin sorduğu soru.
  "yolTuru",
]);

/**
 * `denetim.ts` kaynağını okuyup CLI'nin (`denetimKos`) GERÇEKTEN çağırdığı
 * üretici kümesini çıkarır. Ölçüm iki adımdır: önce denetci·dag·kuralci·
 * dogrulayici modüllerinden içe aktarılan adlar toplanır, sonra içe aktarma
 * bloğundan SONRAKİ gövdede bu adlardan hangisinin gerçekten `ad(` biçiminde
 * çağrıldığı aranır. Yardımcı işlevler (`YARDIMCI_ISLEVLER`) elenir; kalan
 * küme "gerçek kayıt"tır ve `kapsamNobeti` bunu ilanla karşılaştırır.
 */
export function cliGercekUreticileri(denetimKaynagiYolu: string): ReadonlySet<string> {
  return kaynaktanUreticiler(readFileSync(denetimKaynagiYolu, "utf8"));
}

/**
 * Bir kaynak METNİNDEN gerçek üretici kümesini çıkarır — `cliGercekUreticileri`
 * bunun dosya okuyan sarmalayıcısıdır. Ayrılmasının sebebi BKM-DNT-A06'dır:
 * kapsam nöbeti artık tek bir yüzeyi değil dört yüzeyi de tarar ve üç yüzeyin
 * kaynağı ayrı dosyalarda, birinin kaynağı ise bir dosyanın yalnız bir
 * BÖLGESİNDE yaşar.
 */
function kaynaktanUreticiler(kaynak: string): ReadonlySet<string> {
  const iceAktarilanlar = new Set<string>();
  const blokDeseni = /import\s*\{([^}]*)\}\s*from\s*"\.\/(denetci|dag|kuralci|dogrulayici)\.ts"/gs;
  let blok: RegExpExecArray | null;
  while ((blok = blokDeseni.exec(kaynak))) {
    for (const ad of blok[1].split(",")) {
      const temiz = ad.trim();
      if (temiz) iceAktarilanlar.add(temiz);
    }
  }
  // İçe aktarma satırları taramadan dışlanır — "import { x } from ..." satırının
  // kendisi `x(` biçiminde bir ÇAĞRI değildir, yalnız isim taşır.
  const sonIceAktarma = kaynak.lastIndexOf("\nimport ");
  const govde = sonIceAktarma >= 0 ? kaynak.slice(kaynak.indexOf("\n", sonIceAktarma + 1)) : kaynak;

  const gercek = new Set<string>();
  for (const ad of iceAktarilanlar) {
    if (YARDIMCI_ISLEVLER.has(ad)) continue;
    if (new RegExp(`\\b${ad}\\s*\\(`).test(govde)) gercek.add(ad);
  }
  return gercek;
}

/** Tek-dosya yüzeyinin çağrı bölgesini `sarmal.ts` içinde sınırlayan işaretler. */
const TEKIL_BOLGE_BASI = "// ── YÜZEY:tekil · BAŞLANGIÇ ──";
const TEKIL_BOLGE_SONU = "// ── YÜZEY:tekil · BİTİŞ ──";

/** Bir yüzeyin gerçek çağrı kümesini çıkarmak için gereken kaynaklar. */
export interface YuzeyKaynaklari {
  /** `denetim.ts` — komut satırının tam denetim akışı. */
  denetim: string;
  /** `mcp.ts` — MCP sunucusunun DOĞRUDAN çağırdığı üreticiler. */
  mcp: string;
  /** `sarmal.ts` — tek-dosya yüzeyinin bölgesi bu metnin içinde işaretlidir. */
  cli: string;
}

/**
 * DÖRT YÜZEYİN GERÇEK ÇAĞRI KÜMESİ (BKM-DNT-A06). Kapsam nöbeti bugüne dek
 * yalnız komut satırı akışını tarıyordu ve üç ayrışma bu körlüğün altında
 * sessizce yaşıyordu; işlev her yüzey için kümeyi kaynaktan çıkarır.
 *
 * `mcp` sütunu yalnız DOĞRUDAN çağrıyı bildirir. Alt süreç köprüsüyle ulaşan
 * üreticiler ilana tek tek yazılmaz; onları bir KURAL toplar ve kuralın motor
 * karşılığı `mcpEtkinUreticiler` işlevidir (bkz. aşağı). Kuralın ilan yerine
 * yazılmasının sebebi şudur: köprü altmış bir satırı birden MCP'ye taşır ve
 * bunu üretici başına yazmak ilanı gerçeğin ölçümü olmaktan çıkarıp bir
 * kopyaya çevirir; kopya ise köprü değiştiği gün sessizce bayatlar.
 *
 * `tekil` yüzeyinin kümesi `sarmal.ts` içindeki işaretli bölgeden okunur;
 * bölge bulunamazsa işlev susmaz ve `undefined` döndürerek nöbetin bölgenin
 * yokluğunu bildirmesini sağlar.
 */
export function yuzeyGercekUreticileri(
  kaynaklar: YuzeyKaynaklari,
): Readonly<Record<Yuzey, ReadonlySet<string> | undefined>> {
  const cliKumesi = kaynaktanUreticiler(kaynaklar.denetim);
  const bas = kaynaklar.cli.indexOf(TEKIL_BOLGE_BASI);
  const son = kaynaklar.cli.indexOf(TEKIL_BOLGE_SONU);
  const tekilBolge = bas >= 0 && son > bas ? kaynaklar.cli.slice(bas, son) : undefined;
  // Bölge kendi içe aktarma satırlarını taşımaz; adlar dosyanın başındadır.
  const tekilKumesi = tekilBolge === undefined
    ? undefined
    : kaynaktanUreticiler(kaynaklar.cli.slice(0, kaynaklar.cli.indexOf("\n", kaynaklar.cli.lastIndexOf("\nimport ") + 1)) + tekilBolge);
  return {
    cli: cliKumesi,
    panel: undefined,   // panel yüzeyi eklentide yaşar; kaynağı bu pakette değildir.
    mcp: kaynaktanUreticiler(kaynaklar.mcp),
    tekil: tekilKumesi,
  };
}

/**
 * ALT SÜREÇ KÖPRÜSÜ KURALI (BKM-DNT-A06). MCP'nin proje denetimi aracı komut
 * satırını alt süreç olarak koşturur ve çıktısını ajana aynen verir; bu yüzden
 * komut satırı yüzeyi taşıyan HER üretici, ilanında `mcp` yazmasa bile fiilen
 * MCP yüzeyinde çalışır ve sonucu ajana ulaşır. İşlev kuralın motor
 * karşılığıdır: MCP'de fiilen etkin olan üretici kümesini, doğrudan çağrılanlar
 * ile komut satırı kümesinin birleşimi olarak verir.
 */
export function mcpEtkinUreticiler(
  kaynaklar: YuzeyKaynaklari,
  ilan: readonly KapiGirdisi[] = KAPI_KAPSAMI,
): ReadonlySet<string> {
  const dogrudan = yuzeyGercekUreticileri(kaynaklar).mcp ?? new Set<string>();
  return new Set([...dogrudan, ...yuzeyUreticiKumesi("cli", ilan)]);
}

/** Bir yüzeyin ilanı ile gerçek çağrı kümesi arasındaki sapma. */
export interface YuzeySapmasi extends KapsamSapmasi {
  yuzey: Yuzey;
}

/**
 * DÖRT YÜZEYLİ KAPSAM NÖBETİ (BKM-DNT-A06). `kapsamNobeti` tek yüzeyi ölçer;
 * bu işlev aynı ölçümü ölçülebilir her yüzeyde koşturur ve sapmaları yüzey
 * adıyla döndürür. Ölçülemeyen yüzey (bugün yalnız `panel`, çünkü kaynağı bu
 * pakette değildir) atlanır; bölgesi bulunamayan yüzey ise ATLANMAZ ve
 * "ilan-fazlası" yerine bölgenin yokluğunu bildiren bir sapma üretir, çünkü
 * ölçülemeyen bir yüzeyi sessizce geçmek nöbeti körleştirir.
 */
export function yuzeyKapsamNobeti(
  kaynaklar: YuzeyKaynaklari,
  ilan: readonly KapiGirdisi[] = KAPI_KAPSAMI,
): YuzeySapmasi[] {
  const gercekler = yuzeyGercekUreticileri(kaynaklar);
  const sapmalar: YuzeySapmasi[] = [];
  for (const yuzey of ["cli", "mcp", "tekil"] as const) {
    const gercek = gercekler[yuzey];
    if (!gercek) {
      sapmalar.push({ yuzey, tur: "kayıt-fazlası", uretici: `(${yuzey} yüzeyinin çağrı bölgesi kaynakta bulunamadı)` });
      continue;
    }
    for (const sapma of kapsamNobeti(gercek, ilan.filter((g) => g.yuzeyler.includes(yuzey)))) {
      sapmalar.push({ yuzey, ...sapma });
    }
  }
  return sapmalar.sort((a, b) =>
    a.yuzey.localeCompare(b.yuzey) || a.uretici.localeCompare(b.uretici, "tr") || a.tur.localeCompare(b.tur));
}

/** İlan ile gerçek kayıt arasındaki tek bir sapma kaydı. */
export interface KapsamSapmasi {
  /** "ilan-fazlası": kapsam tablosunda var ama CLI'de gerçekten çağrılmıyor (sahte kimlik).
   *  "kayıt-fazlası": CLI'de gerçekten çağrılıyor ama kapsam tablosunda ilan edilmemiş (unutulmuş üretici). */
  tur: "ilan-fazlası" | "kayıt-fazlası";
  uretici: string;
}

/**
 * NÖBET: ilan (`KAPI_KAPSAMI`) ile gerçek kayıt (CLI'nin fiilen çağırdığı
 * üretici kümesi) arasındaki İKİ YÖNLÜ sapmayı ölçer. Sapma yoksa boş dizi
 * döner. Mutasyon kanıtı `cekirdek/sinama/kapi-kapsami.test.ts` içinde: ilana
 * sahte bir kimlik eklenince "ilan-fazlası", gerçek bir girdi ilandan silinince
 * "kayıt-fazlası" sapması doğar — nöbet ikisini de yakalar.
 */
export function kapsamNobeti(
  gercekUreticiler: ReadonlySet<string>,
  ilan: readonly KapiGirdisi[] = KAPI_KAPSAMI,
): KapsamSapmasi[] {
  const ilanSeti = new Set(ilan.map((g) => g.uretici));
  const sapmalar: KapsamSapmasi[] = [];
  for (const uretici of ilanSeti) {
    if (!gercekUreticiler.has(uretici)) sapmalar.push({ tur: "ilan-fazlası", uretici });
  }
  for (const uretici of gercekUreticiler) {
    if (!ilanSeti.has(uretici)) sapmalar.push({ tur: "kayıt-fazlası", uretici });
  }
  return sapmalar.sort((a, b) => a.uretici.localeCompare(b.uretici, "tr") || a.tur.localeCompare(b.tur));
}

/** Kanon ile ilan arasındaki tek bir uyum sapması. */
export interface KanonSapmasi {
  /** "panelsiz-kademe": hata/uyarı basan üretici panel yüzeyi taşımıyor (YUZ-3.1 gizleme yasağı · YUZ-3.3).
   *  "gerekçesiz-cli": yalnız komut satırında kalan girdi gerekçe cümlesi taşımıyor.
   *  "ilan-yok": ilan tablosu boş verildi — nöbet susmak yerine tablonun yokluğunu bildirir. */
  tur: "panelsiz-kademe" | "gerekçesiz-cli" | "ilan-yok";
  uretici: string;
  kademe?: Kademe;
}

/**
 * KANON UYUM NÖBETİ (BKM-DNT-A01). `kapsamNobeti` ilanı CLI'nin gerçek çağrı
 * kümesiyle karşılaştırır; bu nöbet ise ilanı KANONLA karşılaştırır ve üç
 * ölçülmüş körlüğü birden kapatır.
 *
 * BİRİNCİ KÖRLÜK — bugün var olan iki nöbet yalnız o koşuda FİİLEN ÜRETİLMİŞ
 * tanılar üstünde döner, dolayısıyla panelde hiç koşmayan bir üretici hiçbir
 * tanı üretmediği için iki kümeye de hiç girmez: nöbetler yapısal olarak yalnız
 * FARKLI GÖRÜNME hâlini görür, HİÇ GÖRÜNMEME hâlini göremez. Bu nöbet tabanını
 * üretilen tanılardan değil İLAN EDİLEN ÜRETİCİ KÜMESİNDEN alır; bir üreticinin
 * kanonun gerektirdiği yüzeyde ilan edilmemiş olması başlı başına ayrışmadır.
 *
 * İKİNCİ KÖRLÜK — var olan yönlendirme nöbeti tablo verilmediğinde tümüyle
 * susar. Bu nöbet boş ilanı sessizce geçmez; "ilan-yok" sapmasıyla tablonun
 * yokluğunu bildirir, çünkü ölçülemeyen bir hüküm ölçülmüş sayılamaz.
 *
 * ÜÇÜNCÜ KÖRLÜK — nöbetin kendisi panel yüzeyine çıkmıyordu; bir tanının bir
 * yüzeye ulaşmadığını bildirecek bekçi tam da o yüzeye ulaşamıyordu. Bu nöbetin
 * tanısını basan `kapiKapsamiTanilari` üreticisi ilanda panel yüzeyiyle
 * yazılıdır ve o satır bu hükmün kendi kanıtıdır.
 */
export function kanonUyumNobeti(ilan: readonly KapiGirdisi[] = KAPI_KAPSAMI): KanonSapmasi[] {
  if (!ilan.length) {
    return [{ tur: "ilan-yok", uretici: "(ilan tablosu boş)" }];
  }
  const panelliler = new Set(ilan.filter((g) => g.yuzeyler.includes("panel")).map((g) => g.uretici));
  const sapmalar: KanonSapmasi[] = [];
  for (const girdi of ilan) {
    const panelde = girdi.yuzeyler.includes("panel");
    // Beyan edilmiş panel ikizi ancak GERÇEKTEN panelde yaşıyorsa istisna kurar;
    // ikizi olmayan ya da ikizi de panelsiz olan girdi istisnadan yararlanamaz.
    const ikizKoruyor = !!girdi.panelIkizi && panelliler.has(girdi.panelIkizi);
    if ((girdi.kademe === "hata" || girdi.kademe === "uyarı") && !panelde && !ikizKoruyor) {
      sapmalar.push({ tur: "panelsiz-kademe", uretici: girdi.uretici, kademe: girdi.kademe });
    }
    if (!panelde && !girdi.cliGerekcesi?.trim()) {
      sapmalar.push({ tur: "gerekçesiz-cli", uretici: girdi.uretici, kademe: girdi.kademe });
    }
  }
  return sapmalar.sort((a, b) => a.uretici.localeCompare(b.uretici, "tr") || a.tur.localeCompare(b.tur));
}

/**
 * Bir yüzeyde koşması ilan edilen üreticilerin kümesi. Süzgeçler tanı kimliğini
 * değil BU kümeyi okur: bir tanının panele düşüp düşmeyeceğine, taşıdığı kod
 * değil, onu doğuran üreticinin ilan edilmiş yüzeyi karar verir.
 */
export function yuzeyUreticiKumesi(yuzey: Yuzey, ilan: readonly KapiGirdisi[] = KAPI_KAPSAMI): ReadonlySet<string> {
  const kume = new Set<string>();
  for (const girdi of ilan) {
    if (girdi.yuzeyler.includes(yuzey)) kume.add(girdi.uretici);
  }
  return kume;
}

/**
 * `dogrula` ve `fazVadeTanilari` panelde İKİ kez ilan edilmiş DEĞİLDİR — panele
 * ULAŞTIKLARI YOL diğer on altı panel-üreticisinden farklıdır: eklenti bu ikisini
 * AÇIK belge başına `tanilaCekirdek`'te doğrudan çağırır (her tuş vuruşunda,
 * `denetleHepsi` beklemeden), diğerleri ise yalnız `denetleHepsi`'nin çalıştırdığı
 * `denetimKos` tam-akışından SÜZÜLEREK gelir. Bu iki üreticinin tanılarını
 * `denetimKos` akışından da geçirmek AYNI dosya için AYNI tanının iki kez
 * (bir kez tanilaCekirdek'ten, bir kez cross-file süzgeçten) Problems'a
 * yazılmasına yol açardı — bu yüzden cross-file süzgeç bu ikisini HARİÇ tutar.
 * Süzgeç köken-temelli olduğu için bu ayrım da üretici kimliğiyle çalışır:
 * `dogrula` kökenli bir tanı hangi kimliği taşırsa taşısın cross yoldan geçmez.
 */
const PER_DOSYA_PANEL_YOLU: ReadonlySet<string> = new Set(["dogrula", "fazVadeTanilari"]);

/**
 * `denetimKos`'un tam akışını `denetleHepsi`'de süzmek için kullanılacak ÜRETİCİ
 * kümesi — panel yüzeyinde ilan edilmiş tüm üreticileri kapsar, yalnız
 * `PER_DOSYA_PANEL_YOLU` içindekiler hariç (onlar zaten `tanilaCekirdek`
 * üstünden, dosya başına, ayrı bir yoldan panele ulaşır — bkz. yukarı).
 * Eklenti her tanının köken damgasını (`DenetimSonucu.koken`) bu kümeye vurur;
 * köken damgası taşımayan ya da bu kümede olmayan üreticiden gelen tanı panele
 * geçemez. Yalnız komut satırına ayrılmış bir üreticiye panel yüzeyi eklemek
 * Founder kararı ister ve bu dosyada tek satırlık görünür bir değişikliktir.
 */
export function panelCaprazUreticiKumesi(ilan: readonly KapiGirdisi[] = KAPI_KAPSAMI): ReadonlySet<string> {
  const kume = new Set<string>();
  for (const uretici of yuzeyUreticiKumesi("panel", ilan)) {
    if (!PER_DOSYA_PANEL_YOLU.has(uretici)) kume.add(uretici);
  }
  return kume;
}

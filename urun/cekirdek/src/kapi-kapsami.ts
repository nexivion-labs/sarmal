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

export interface KapiGirdisi {
  /** Üretici işlevin adı — denetci.ts/dag.ts/kuralci.ts/dogrulayici.ts dışa açımıyla birebir aynı yazım. */
  uretici: string;
  /** Üreticinin tanımlı olduğu kaynak dosya. */
  modul: "denetci.ts" | "dag.ts" | "kuralci.ts" | "dogrulayici.ts";
  /** Bu üreticinin BUGÜN gerçekten koştuğu yüzeyler — ölçülmüş, karar değil. */
  yuzeyler: readonly Yuzey[];
}

/**
 * KAPI-KAPSAM İLANI. Sıra denetim.ts (denetimKos) içindeki çağrı sırasını izler
 * ki bu dosyayı okuyan biri CLI akışındaki yeriyle eşleştirebilsin. Panel yüzeyi
 * taşıyan on sekiz girdi, eklentinin bugün fiilen çalıştırdığı kümedir (eski
 * crossTanilar dizisi + proje-denetim.ts'in "canlı" çağrıları + tanilaCekirdek'in
 * dogrula/fazVadeTanilari çağrısı, 2026-08-23 tarihli KYN-MTR-A05 ölçümü) — bu
 * Adım o kümeyi GENİŞLETMEZ, yalnız iki hâlde de tek kaynaktan zorlar.
 */
export const KAPI_KAPSAMI: readonly KapiGirdisi[] = [
  // ── Dosya-içi bekçi: dört yüzde de koşan tek aile (kapi_kapsami.sar eski satır 1). ──
  { uretici: "dogrula", modul: "dogrulayici.ts", yuzeyler: ["cli", "panel", "mcp", "tekil"] },
  { uretici: "fazVadeTanilari", modul: "denetci.ts", yuzeyler: ["cli", "panel"] },
  { uretici: "mevsimVadeTanilari", modul: "denetci.ts", yuzeyler: ["cli", "panel"] },
  { uretici: "altKatmanTekilligiTanilari", modul: "denetci.ts", yuzeyler: ["cli", "panel", "tekil"] },

  // ── Yapısal mutabakat (eski proje-denetim.ts'in "canlı" çağırdığı üç üretici + ana-yok). ──
  { uretici: "denetle", modul: "denetci.ts", yuzeyler: ["cli", "panel"] },
  { uretici: "kuralTanilari", modul: "denetci.ts", yuzeyler: ["cli", "panel"] },
  { uretici: "ilansizGovdeDenetle", modul: "denetci.ts", yuzeyler: ["cli", "panel"] },
  { uretici: "anaYokTanisi", modul: "denetci.ts", yuzeyler: ["cli", "panel"] },
  { uretici: "rafsizAnadizinTanilari", modul: "denetci.ts", yuzeyler: ["cli"] },
  { uretici: "anadizinSekliTanilari", modul: "denetci.ts", yuzeyler: ["cli"] },

  // ── Referans + metin atfı (TAM kapsam — disk taraması ister, panelde ucuz değil). ──
  { uretici: "referansTanilari", modul: "denetci.ts", yuzeyler: ["cli"] },
  { uretici: "metinAtifTanilari", modul: "denetci.ts", yuzeyler: ["cli"] },

  // ── Dosyalar-arası + ebedi + mühür (M-2 aile — bugün CLI-only). ──
  { uretici: "dosyalararasiCatismaTanilari", modul: "denetci.ts", yuzeyler: ["cli"] },
  { uretici: "ebediTanilar", modul: "kuralci.ts", yuzeyler: ["cli"] },
  { uretici: "muhurTanilari", modul: "kuralci.ts", yuzeyler: ["cli"] },
  { uretici: "birlesimCatismaTanilari", modul: "kuralci.ts", yuzeyler: ["cli"] },

  // ── Bugün PANELDE de koşan (eski eklenti crossTanilar — cross-file ama ucuz+saf) ailesi. ──
  { uretici: "katmansizTeknolojiTanilari", modul: "denetci.ts", yuzeyler: ["cli", "panel"] },
  { uretici: "yinelenenKodTanilari", modul: "denetci.ts", yuzeyler: ["cli", "panel"] },
  { uretici: "dagTanilari", modul: "dag.ts", yuzeyler: ["cli", "panel"] },
  { uretici: "gizliBagimlilikTanilari", modul: "denetci.ts", yuzeyler: ["cli", "panel"] },
  { uretici: "durumsizAdimTanilari", modul: "denetci.ts", yuzeyler: ["cli", "panel"] },
  { uretici: "donguTanilari", modul: "denetci.ts", yuzeyler: ["cli", "panel"] },
  { uretici: "durumTutarlilikTanilari", modul: "dag.ts", yuzeyler: ["cli", "panel"] },
  { uretici: "kopukZincirTanilari", modul: "dag.ts", yuzeyler: ["cli", "panel"] },
  { uretici: "ozBagimlilikTanilari", modul: "dag.ts", yuzeyler: ["cli", "panel"] },
  { uretici: "kayipKenarTanilari", modul: "dag.ts", yuzeyler: ["cli", "panel"] },
  { uretici: "hiyerarsiTanilari", modul: "denetci.ts", yuzeyler: ["cli", "panel"] },
  { uretici: "dayanakTanilari", modul: "denetci.ts", yuzeyler: ["cli", "panel"] },

  // ── Diğer proje-geneli üreticiler — bugün yalnız CLI (Adım bu kararı DEĞİŞTİRMEZ). ──
  { uretici: "kavusumsuzParalellikTanilari", modul: "denetci.ts", yuzeyler: ["cli"] },
  { uretici: "dogusEksikProjeTanilari", modul: "denetci.ts", yuzeyler: ["cli"] },
  { uretici: "olgunlukOnayiTanilari", modul: "denetci.ts", yuzeyler: ["cli"] },
  { uretici: "siloBlokTanilari", modul: "denetci.ts", yuzeyler: ["cli"] },
  { uretici: "kavusumsuzDilimTanilari", modul: "denetci.ts", yuzeyler: ["cli"] },
  { uretici: "acikAdimTanilari", modul: "denetci.ts", yuzeyler: ["cli"] },
  // GBR-A02: çok beklemede-Adım tek özet satırına katlanır — ham liste `say()`e,
  // katlanmış görünüş `bas()`e gider; ikisi de aynı kimliği taşır.
  { uretici: "acikAdimGosterimi", modul: "denetci.ts", yuzeyler: ["cli"] },
  { uretici: "acikHatirlaticiGosterimi", modul: "denetci.ts", yuzeyler: ["cli"] },
  { uretici: "kapsamTanilari", modul: "denetci.ts", yuzeyler: ["cli"] },
  { uretici: "tekCocukTanilari", modul: "denetci.ts", yuzeyler: ["cli"] },
  { uretici: "yetimMeyveTanilari", modul: "denetci.ts", yuzeyler: ["cli"] },
  { uretici: "docDriftTanilari", modul: "denetci.ts", yuzeyler: ["cli"] },
  { uretici: "beyansizYapiTanilari", modul: "denetci.ts", yuzeyler: ["cli"] },
  { uretici: "adAyraciTanilari", modul: "denetci.ts", yuzeyler: ["cli"] },
  { uretici: "halefTanilari", modul: "denetci.ts", yuzeyler: ["cli"] },
  { uretici: "teknolojisizYuzeyTanilari", modul: "denetci.ts", yuzeyler: ["cli"] },
  { uretici: "onceliksizAdimTanilari", modul: "denetci.ts", yuzeyler: ["cli"] },
  { uretici: "atesleyenHatirlaticiTanilari", modul: "denetci.ts", yuzeyler: ["cli"] },
  { uretici: "dilTanilari", modul: "denetci.ts", yuzeyler: ["cli"] },
  { uretici: "uygulanmamisKararTanilari", modul: "denetci.ts", yuzeyler: ["cli"] },
  { uretici: "beceriDriftTanilari", modul: "denetci.ts", yuzeyler: ["cli"] },
  // RF-T6-A05: yalnız kanon-sahibi depoda (oz/siniflama/kayit.json var) koşar — dogfood-only, yine de CLI-only.
  { uretici: "kullanimsizTipTanilari", modul: "denetci.ts", yuzeyler: ["cli"] },

  // ── Yeni-kanon Proje kapısı (kapiKos ile sarılı on bir üretici — motor turu ikinci halkası). ──
  { uretici: "rejimTanilari", modul: "denetci.ts", yuzeyler: ["cli"] },
  { uretici: "omurgaTanilari", modul: "denetci.ts", yuzeyler: ["cli"] },
  { uretici: "iliskiSinifiTanilari", modul: "denetci.ts", yuzeyler: ["cli"] },
  { uretici: "authTanilari", modul: "denetci.ts", yuzeyler: ["cli"] },
  { uretici: "sefAkisiTanilari", modul: "denetci.ts", yuzeyler: ["cli"] },
  { uretici: "dilKanonTanilari", modul: "denetci.ts", yuzeyler: ["cli"] },
  { uretici: "ogretimTanilari", modul: "denetci.ts", yuzeyler: ["cli"] },
  { uretici: "stratejiTanilari", modul: "denetci.ts", yuzeyler: ["cli"] },
  { uretici: "tipEvreniTanilari", modul: "denetci.ts", yuzeyler: ["cli"] },
  { uretici: "terfiKanitiTanilari", modul: "denetci.ts", yuzeyler: ["cli"] },
  { uretici: "yuzTanilari", modul: "denetci.ts", yuzeyler: ["cli"] },

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
  "karneOzeti", "kodIndeksle", "planlamaEvresiMi", "programlariYukle",
  "yerelEvre1Yumusat", "evre1Yumusat",
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
  const kaynak = readFileSync(denetimKaynagiYolu, "utf8");
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

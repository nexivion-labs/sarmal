// ═══════════════════════════════════════════════════════════════════════════
// tur-belgesi.ts — 📄 TURUN BELGE YÜZÜ (PRF-A06 · VS Code'suz saf çekirdek)
//
//   ÖLÇÜLEN KUSUR (2026-08-29, Founder'ın canlı penceresi): olay-tetikli tur
//   otuz dört buçuk saniye sürüyordu ve bu sürenin yalnız yaklaşık yedi
//   saniyesi saf çekirdekteydi — iki yüz yetmiş altı dosyanın ayrıştırılması
//   iki bin yüz kırk dört, çapraz denetim ise sarmal kökünde beş yüz yetmiş
//   dokuz milisaniye ölçüldü. Geri kalan yaklaşık yirmi yedi saniye tek bir
//   satırdaydı: tur her dosyayı `openTextDocument` ile AÇIYORDU. O çağrı bir
//   belge modeli kurar, dil hizmetlerini uyandırır ve belgeyi bellekte tutar;
//   oysa turun belgeden istediği yalnız metin, satırlar ve kimliktir.
//
//   ONARIM: tur hiçbir dosyayı açmaz. Zaten açık olan editörler bellektedir ve
//   kabuk onları I/O'suz verir; açık olmayan dosya ham okunur. AÇIK BELGE
//   DAİMA ÖNCELİKLİDİR, çünkü kaydedilmemiş bir düzenlemenin tanısı diskteki
//   eski metinden üretilirse panel kullanıcının GÖRDÜĞÜ metni anlatmaz ve
//   kullanıcı bunu kendi hatası sanar.
//
//   Modül vscode'u YALNIZ TİP olarak ithal eder (onbellek.ts emsali) ve hiçbir
//   çalışma zamanı çağrısı yapmaz; kabuk dışarıdan verilir (onay-tarayici.ts
//   `TaramaKabugu` deseninin ikizi). Böylece davranış editör kabuğu olmadan
//   nöbete bağlanır. Kimlik gerçek `Uri` olarak taşınır, çünkü tanı yayını
//   dosyayı ona göre adresler; yoldan yeniden kurulan bir kimlik adsız
//   tamponlarda başka bir dosyayı gösterirdi.
//
//   PRF-KP-A02: program haritasının kurulumu da bu modüle indi. Çekirdeğin
//   sözcükleyicisi ile ayrıştırıcısı saf TypeScript'tir ve editör bilmez;
//   onları ithal etmek modülün vscode'suz kalma sözünü bozmaz.
// ═══════════════════════════════════════════════════════════════════════════

import type * as vscode from "vscode";
import type { Program } from "../../cekirdek/src/sozdizim.ts";
import { belirtecle } from "../../cekirdek/src/belirtec.ts";
import { ayristir } from "../../cekirdek/src/ayristirici.ts";
import { posix } from "node:path";
import { kapsamIcinde } from "./yolharitasi-cekirdek.ts";   // 🛡️ PRF-KP-A05: kapsama ilişkisinin tek evi
import { sarKapsamDisi } from "./izleyici-cekirdek.ts";      // 🛡️ PRF-KP-A05: tarama globuyla aynı dışlama evreni

/**
 * Tanı yolunun belgeden istediği EN AZ yüz. Hem `vscode.TextDocument` hem de
 * diskten kurulan kayıt bu yüzü karşılar; tanı üreten hiçbir işlev bundan
 * fazlasını istememelidir, çünkü fazlası turu editör kabuğuna geri bağlar.
 */
export interface BelgeYuzu {
  readonly uri: vscode.Uri;
  getText(): string;
  readonly lineCount: number;
  lineAt(satır: number): { readonly text: string };
}

/** Turun kabuğu — hiçbir üyesi belge AÇMAZ. */
export interface BelgeKabugu {
  /** Editörde zaten açık belge (varsa); I/O yapılmaz. */
  açıkBelge(fsPath: string): BelgeYuzu | undefined;
  /** Açık belgenin dil kimliği; `sarmal` değilse dosya turun dışındadır. */
  dilKimliği(fsPath: string): string | undefined;
  /**
   * Açık OLMAYAN dosyanın belge yüzü ve diskten okunan HAM bayt sayısı;
   * okunamıyorsa `undefined`. Bayt sayısı çözmeden önce ham tampondan alınır
   * (PRF-KP-A01 üçüncü kararı: merceğe düşen sayı turun okuduğu bayttır).
   */
  oku(fsPath: string): Promise<{ belge: BelgeYuzu; bayt: number } | undefined>;
}

/**
 * Diskten okunan metnin belge yüzü — satırlar ilk istendiğinde bir kez bölünür.
 *
 * SATIR SÖZLEŞMESİ (PRF-KP-A01 birinci kararı): satırlar `\r?\n` ile bölünür ki
 * disk kaydı VS Code belge modeliyle aynı satır sınırlarını görsün. Yalnız
 * `\n` ile bölen eski sözleşme CRLF dosyada her satırın sonunda taşıyıcı
 * dönüşü bırakıyordu; tanı aralığı rastlantıyla doğru çıkıyordu, çünkü sözcük
 * deseni taşıyıcı dönüşte durur, fakat satır uzunluğu bir fazlaydı. Yalnız
 * taşıyıcı dönüşle biten dosya bilinçle kapsam dışıdır: VS Code onu çok satır,
 * bu kayıt tek satır sayar ve sözcükleyici de yalnız yeni satırı saydığı için
 * disk kaydı motorla uyumludur; bu uç beyan edilir, onarılmaz.
 *
 * Boş dosya tek satırdır, çünkü boş dizeyi bölmek tek boş dize döner; sıfır
 * dönseydi tanı üretimi konumu eksi bire kırpardı. Bayt sırası imi (BOM)
 * burada soyulmaz, çünkü kabuğun `TextDecoder` çözücüsü onu varsayılan
 * ayarıyla zaten soymaktadır; metin buraya imsiz gelir.
 */
export function diskBelgesi(uri: vscode.Uri, metin: string): BelgeYuzu {
  let satırlar: string[] | undefined;
  const böl = (): string[] => (satırlar ??= metin.split(/\r?\n/));
  return {
    uri,
    getText: () => metin,
    get lineCount() { return böl().length; },
    lineAt: (satır: number) => ({ text: böl()[satır] ?? "" }),
  };
}

/**
 * Açık belgelerin yol haritası. YALNIZ `file` şemasındaki belgeler girer ve bu
 * süzgeç kusurun ta kendisinden doğmuştur: `textDocuments` dizisi dosyaların
 * yanında git karşılaştırma görünümlerini, çıktı kanallarını ve arama
 * sonuçlarını da taşır; bunların `fsPath` değeri aynı yolu gösterdiği için
 * şemaya bakmadan kurulan bir harita, bir dosyanın tanısını onun git'teki ESKİ
 * sürümünden üretebilir. Kullanıcı o zaman kaynağında olmayan bir hatayı
 * panelde görür ve hatayı kendi dosyasında arar.
 *
 * Çakışmada dosya şemalı belge kazanır; aynı yolda ikinci bir dosya belgesi
 * olamaz, çünkü VS Code bir dosyayı tek belge olarak açar.
 */
export function açıkBelgeHaritası<T extends { uri: vscode.Uri }>(
  belgeler: readonly T[],
): Map<string, T> {
  const harita = new Map<string, T>();
  for (const belge of belgeler) {
    if (belge.uri.scheme !== "file") continue;
    harita.set(belge.uri.fsPath, belge);
  }
  return harita;
}

/** Bir turda hangi dosyanın hangi kaynaktan geldiğinin sayımı — nöbetin ölçüsü. */
export interface BelgeSayacı {
  /** Editörde zaten açık olduğu için okunmayan dosya sayısı. */
  açıktan: number;
  /** Diskten ham okunan dosya sayısı. */
  diskten: number;
  /** Okunamadığı ya da dili `sarmal` olmadığı için turun dışında kalan dosya sayısı. */
  atlanan: number;
}

/**
 * Turun belgelerini toplar. Hiçbir dosya AÇILMAZ: açık olan bellekten alınır,
 * olmayan okunur. Okunamayan dosya sessizce atlanır ve turu düşürmez, çünkü
 * silinmiş ya da erişilemeyen tek bir dosya yüzünden bütün panelin boşalması
 * ölçülen kusurdan daha ağır bir davranıştır.
 *
 * `okunanBayt` turun diskten okuduğu HAM bayt toplamıdır (PRF-KP-A01 üçüncü
 * kararı): boyut sınırı konmaz, fakat toplam merceğe düşer ki anormal büyüme
 * görünür olsun. Sayı kabuğun ham tamponundan, çözmeden önce gelir; çözülmüş
 * metnin uzunluğu bunun yerini tutmaz, çünkü bayt sırası imi çözümde soyulur
 * ve geçersiz bir bayt üç baytlık yer tutucuya dönüşür. Açık belge
 * okunmadığından sayıma girmez.
 */
export async function turBelgeleriniTopla(
  yollar: readonly string[],
  kabuk: BelgeKabugu,
): Promise<{ belgeler: Map<string, BelgeYuzu>; sayaç: BelgeSayacı; okunanBayt: number }> {
  const belgeler = new Map<string, BelgeYuzu>();
  const sayaç: BelgeSayacı = { açıktan: 0, diskten: 0, atlanan: 0 };
  let okunanBayt = 0;
  for (const yol of yollar) {
    const açık = kabuk.açıkBelge(yol);
    if (açık) {
      // Açık belgenin dili elle değiştirilmişse dosya turun dışındadır; bu,
      // eski `openTextDocument` yolundaki `languageId !== "sarmal"` süzgecinin ikizidir.
      if (kabuk.dilKimliği(yol) !== "sarmal") { sayaç.atlanan += 1; continue; }
      belgeler.set(yol, açık);
      sayaç.açıktan += 1;
      continue;
    }
    const okunan = await kabuk.oku(yol);
    if (okunan === undefined) { sayaç.atlanan += 1; continue; }
    belgeler.set(yol, okunan.belge);
    sayaç.diskten += 1;
    okunanBayt += okunan.bayt;
  }
  return { belgeler, sayaç, okunanBayt };
}

/**
 * Turun program haritasını kurar — kabuk değil, saf modül (PRF-KP-A02).
 *
 * Belge iki kaynaktan gelir ve ikisinin ayrıştırma yolu farklıdır. Açık belge
 * paylaşılan sürüm anahtarlı önbellekten okunur (`programAl` · onbellek.ts),
 * çünkü editör süsleri aynı belgeyi zaten ayrıştırmıştır ve ikinci bir
 * ayrıştırma boşuna maliyettir. Disk kaydı ise doğrudan ayrıştırılır ve
 * önbelleğe ASLA yazılmaz: önbellek belge SÜRÜMÜNE anahtarlıdır, diskten okunan
 * kaydın sürümü yoktur ve sürümsüz bir kayıt bir kez yazıldığında dosya diskte
 * değişse bile sonsuza dek taze sayılırdı. Söz dizimi kırık belge haritaya
 * girmez; onun hatasını tek dosya yolu yakalar ve çapraz denetim ağacına
 * girmesi gerekmez.
 *
 * Önbellek çağrısı dışarıdan verilir ki bu işlev editör kabuğu olmadan nöbete
 * bağlansın; `denetleHepsi` gerçek `programAl` işlevini geçirir. Açık belge
 * haritasının değer tipi serbesttir, çünkü işlev o değeri yalnız `programAl`
 * işlevine taşır ve kendisi belgeden hiçbir şey okumaz.
 */
export function turProgramlariniKur<A>(
  belgeler: ReadonlyMap<string, BelgeYuzu>,
  açıkBelgeler: ReadonlyMap<string, A>,
  programAl: (açık: A) => Program | undefined,
): Map<string, Program> {
  const programlar = new Map<string, Program>();
  for (const [fsPath, belge] of belgeler) {
    const açık = açıkBelgeler.get(fsPath);
    let program: Program | undefined;
    if (açık !== undefined) program = programAl(açık);
    else {
      try { program = ayristir(belirtecle(belge.getText())); }
      catch { program = undefined; }
    }
    if (program) programlar.set(fsPath, program);
  }
  return programlar;
}

/**
 * Turun erişim sınırı (PRF-KP-A05). Tur diski kendisi okuduğu için okuduğu
 * evrenin sınırı bir güvenlik sorusudur; bu süzgeç kabuğa ulaşan yol listesini
 * iki koşulla keser ve geçenleri OLDUĞU GİBİ döndürür, çünkü dönen yol açık
 * belge haritasının anahtarıdır ve yeniden yazılmış bir yol o haritada bulunmaz.
 *
 * Birinci koşul kök sınırıdır: yol, çalışma alanı köklerinden birinin
 * kapsamında olmalıdır (`kapsamIcinde` · yolharitasi-cekirdek.ts, kapsama
 * ilişkisinin tek evi). Karşılaştırma önce üst dizin parçalarını çözer; aksi
 * hâlde `<kök>/../disari.sar` biçimindeki bir yol kökün önekini taşıdığı için
 * kapsam içinde sayılırdı ve sınır bir dize karşılaştırmasından ibaret kalırdı.
 *
 * İkinci koşul dışlama evrenidir: kök-göreli yolun dizin parçaları gizli ya da
 * dışlanan bir ad taşıyorsa dosya okunmaz (`sarKapsamDisi` · izleyici-cekirdek.ts,
 * tarama globuyla aynı listeden türer). Ölçüm kök-göreli yapılır, çünkü mutlak
 * yolda çalışma alanının kendi üst dizinleri elenmeye katılır ve `.claude/worktrees`
 * altındaki bir depo bütünüyle kapsam dışı sayılırdı (Sol RED-2 dersi).
 *
 * İki koşul AYNI köke göre ölçülür ve bütün kökler gezilir: yol, köklerden
 * herhangi birine göre hem kapsam içindeyse hem de o köke göreli hâliyle dışlama
 * süzgecinden geçiyorsa geçer. Yalnız ilk kapsayan kök seçilseydi iç içe köklerde
 * `/ws/dist/depo/plan/a.sar` yolu `/ws` köküne göre `dist/` altında sayılıp
 * düşerdi, oysa `/ws/dist/depo` köküne göre meşrudur (denetçi bulgusu, PRF-KP-A05).
 *
 * Bu süzgeç okuma evrenini genişletmez ya da daraltmaz: dosya araması zaten
 * köklerin içinde ve aynı globla koşar. Süzgeç yalnız sınırı kilitler ki arama
 * evreni bir gün değişse bile kabuğun `oku` üyesine kök dışı yol ulaşmasın.
 */
export function erisimSiniri(yollar: readonly string[], kökler: readonly string[]): string[] {
  const düzle = (y: string): string => posix.normalize(y.replace(/\\/g, "/")).replace(/\/+$/, "");
  const düzKökler = kökler.map(düzle);
  const geçenler: string[] = [];
  for (const yol of yollar) {
    const düz = düzle(yol);
    const geçer = düzKökler.some((kök) =>
      kapsamIcinde(düz, kök) && !sarKapsamDisi(düz.slice(kök.length + 1)));
    if (geçer) geçenler.push(yol);
  }
  return geçenler;
}

// ═══════════════════════════════════════════════════════════════════════════
// tani-metni-hijyeni.test.ts — 🧼 KULLANICI-YÜZÜ METİN HİJYENİ KAPISI
//
//   Founder hükmü (2026-07-21): iç karar/plan numaraları (K-97, SD-13, RAY-3,
//   RF-T…, BKM-…, NTK-…, ZMN-…, EKL-F…), İngilizce terimler (runtime,
//   governance) ve yol-haritası notları (v1, "sonraki tur") — insanın gördüğü
//   hiçbir tanı/uyarı/öneri metnine giremez. Numara İÇERİDE yaşar (biz
//   yönetiriz); kullanıcı akademik, jargonsuz, öğreten bir cümle görür.
//   Rust/Python/TypeScript kendi kural numaralarını dışarı sızdırmaz — biz de.
//
//   Bu kapı, tani-sicili'nin sahte "MOTORDA ✅" iddiasını imkânsız kılması
//   emsalidir: temizlik tek seferliktir, kapı kalıcıdır. Yarın hangi model
//   yazarsa yazsın, karar numarası kullanıcı metnine bir daha giremez.
//
//   KAPSAM: motor (cekirdek/src) + eklenti (eklenti/src) kaynağındaki
//   cümle-benzeri (boşluk taşıyan) string değerleri. Çıplak kod literalleri
//   ("K-97" gibi mantık karşılaştırmaları) boşluk taşımaz → muaf. "K-nn"
//   şablon yer tutucusu digit taşımaz → muaf (dayanak: K-nn ekle).
//
//   MDR-A06 GENİŞLETMESİ — SINIFLAMA KANONU DOĞRUDAN TARANIR:
//   Kullanıcının hover'da ve tamamlamada gördüğü tip/kenar/şema/rehber metinleri
//   koda değil `oz/siniflama/kayit.json` ile `rehber.json` dosyalarına yazılıdır.
//   Bu içerik eklentiye `arac/renk-uret.mjs` tarafından `gomulu-kanon.ts` olarak
//   dökülür; yani corpus taraması onu ÜRETİLEN İKİZ üzerinden zaten görüyordu.
//   Ölçüm artık KAYNAĞIN kendisinden alınır, çünkü üretilen ikiz git'te izlenmez
//   (eklenti/.gitignore) ve temiz bir klonda diskte bulunmayabilir; nöbetin
//   ölçtüğü şey bir yapı çıktısına bağlı kalmamalıdır. Çift sayımı önlemek için
//   `gomulu-kanon.ts` .ts taramasından düşürülür — kaynak ile ikizin birebirliğini
//   `eklenti/sinama/gomulu-esitlik.test.ts` ayrıca zorlar.
//
//   `koken` ALANI MUAFTIR (MDR-A06 tasarım kararı): insan-görünür tanım (`ne`,
//   `kural`, `mesaj`, `öneri`, rehber girdileri) iç karar numarası taşımaz;
//   tanımın hangi karardan doğduğu `koken` dizisinde ÇIPLAK KOD literalleri
//   olarak yaşar. Bu alan yalnız ajan yüzüdür (MCP `siniflama` aracı şemayı
//   olduğu gibi döker); hiçbir hover/tamamlama/tanı metnine basılmaz —
//   basan yüzey yoktur, ipucu.ts ile tamamlama.ts adı geçen alanları okur.
// ═══════════════════════════════════════════════════════════════════════════
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const MOTOR_DIZINI = fileURLToPath(new URL("../src", import.meta.url));
const EKLENTI_DIZINI = fileURLToPath(new URL("../../eklenti/src", import.meta.url));
const KANON_DIZINI = fileURLToPath(new URL("../../../oz/siniflama", import.meta.url));

/** Sınıflama kanonunun üretilen eklenti ikizi — kaynağı doğrudan tarandığı için düşer. */
const URETILEN_IKIZ = "gomulu-kanon.ts";
/** Ajan yüzü: köken kodları burada, çıplak KOD literalleri olarak yaşar (muaf). */
const KOKEN_ALANI = "koken";

/**
 * İnsan metninde ASLA meşru olmayan jetonlar.
 *
 * GOC-PROJEKOD-A07 GENİŞLETMESİ (bağımsız denetim bulgusu): kapı "sıfır" diyordu
 * fakat sıfır yalnız kendi deseninin gördüğü evrende sıfırdı. Üç kör nokta ölçüldü
 * ve kapatıldı:
 *
 *   ① `EMJ-\d` deseni tireden sonra HARF gelen `EMJ-A04` biçimini kaçırıyordu.
 *      Bu kod doğrudan karne çıktısına basılıyordu (`karne.ts` başlık satırı),
 *      yani kullanıcının gördüğü en görünür yüzeylerden birinde duruyordu.
 *   ② Tasarım (`TAS-`) ve spec (`SDD-`) aileleri ile numaralı Adım kodları
 *      (`ADM-<AD>-<numara>`) yasak listesinde hiç yoktu.
 *   ③ `ADM-` ailesi KÖRÜ KÖRÜNE yasaklanamaz: `Adım( kod: ADM-ARDIL )` gibi
 *      ÖĞRETİCİ ÖRNEK kodları meşrudur ve kalmalıdır. Ayrım ölçülerek kuruldu:
 *      iç Adım/spec kodu numaralı sonek taşır (`ADM-AGAC-L2`, `ADM-DGS-13`),
 *      örnek yer tutucusu taşımaz (`ADM-GIRIS`, `ADM-ONCUL`). Geniş desen
 *      denendiğinde 6 yanlış-pozitif üretti; dar desen sıfır üretiyor.
 *   ④ Eski KURAL aileleri (`YZ-`, `DO-`, `KA-`, `BL-`, `YP-`, `GR-`, `BÇ-`,
 *      `DL-`) listede yoktu, oysa `SD-`, `DR-` ve `IA-` kardeşleri zaten
 *      yasaktı — aynı sınıf jetonun yarısı yasak, yarısı serbestti. Bu kör
 *      nokta özyineleme kazancını da kanıtladı: kapatıldığında ilk yakalanan
 *      üç ihlal `cekirdek/src/kopru/nvidia.ts` içindeydi, yani hem desen hem
 *      dizin körlüğünün kesiştiği yerde duruyordu.
 *   ⑤ BEŞİNCİ KÖR NOKTA (A07 son halka · ölçülerek bulundu): eski yasa
 *      gövdesinin ADLI kural kimlikleri (`KRL-…`) hiçbir desende yoktu, çünkü
 *      onlar tire-sonrası rakam taşımaz. Sonuç şuydu: kapı sıfır diyorken
 *      `KRL-GUVENLIK-AMACLI` jetonu güvenlik denetçisinin İSTEM METNİNDE
 *      duruyordu — yani ajanın bizzat okuduğu en görünür yüzeylerden birinde.
 *      İki noktada (`dongu.ts` istem gövdesi ve `kopru/nvidia.ts` rol kalıbı)
 *      kod kaldırıldı ve hükmün kendisi cümleye yazıldı. Desen ölçülerek
 *      seçildi: bugün kapının taradığı evrende `KRL-` taşıyan tek kalıntı
 *      `denetci.ts` içindeki `KRL-X` YER TUTUCUSUDUR ve o bir yorumdadır,
 *      dolayısıyla yorum ayıklamasıyla zaten muaftır — yanlış-pozitif sıfırdır.
 *      Öğretici örneklerin kural kimlikleri (`ornek/` ile `sablon/` altındaki
 *      `KRL-SUPHEDE-DUR` gibi) bu kapının kapsamında değildir ve kalmalıdır.
 */
const YASAK: ReadonlyArray<{ ad: string; re: RegExp }> = [
  { ad: "karar numarası", re: /\b(K|GK|SD|DR|IA)-\d|\bEMJ-[A-Z]?\d/ },
  { ad: "eski kural kodu", re: /\b(YZ|DO|KA|BL|YP|GR|BÇ|DL)-\d/ },
  { ad: "eski adlı kural kimliği", re: /\bKRL-[A-ZÇĞİÖŞÜ]/ },
  { ad: "tasarım/spec/adım kodu", re: /\b(TAS|SDD)-[A-Z]?\d|\bADM-[A-Z]+-[A-Z]?\d/ },
  { ad: "oturum/plan kodu", re: /\b(RAY-\d|RF-T\d|BKM-[A-Z]|NTK-A\d|ZMN-A\d|VIT-[A-Z]|HTR-[A-Z]|AOK-[A-Z0-9]|KRR-MUT|EKL-F\d)/ },
  { ad: "İngilizce terim", re: /\b(runtime|governance)\b/i },
  { ad: "yol-haritası notu", re: /(?:^|[^A-Za-z])v\d\b|sonraki (?:tur|mevsim)/i },
];

// ── TARAMANIN GÖRDÜĞÜ YÜZ: bağlam tanıyan tek geçiş ─────────────────────────────
//   Yorumdaki geliştirici notunu kullanıcı görmez, muaftır; taranan şey kaynaktaki
//   dizge ve şablon değerleridir. Bu ikisini ayırmak bağlam ister.
//
//   HST-MTR-A11 ONARIMI (2026-10-10): Ayıklayıcı önceden blok yorum desenini ve dizge
//   desenini kaynağa bağlam tanımadan uyguluyordu ve tarama üç yoldan kör kalıyordu.
//   ① "**/*.sar" gibi bir glob dizgesi ya da sablon/*.sar geçen bir satır yorumu sahte
//     bir blok yorum açıyor ve sonraki ilk blok kapanışına kadar her şeyi siliyordu.
//     Taranan 125 dosyanın 16'sında 39 sahte blok vardı; komut satırı girişinin 644 ile
//     1025. satırları ve eklenti girişinin beş sahte bloğu (343 satır) hiç taranmıyordu.
//   ② Satır yorumu kesicisi her satıra yeniden başlıyordu ve çok satırlı bir şablonun
//     // ile başlayan satırını yorum sanıyordu. Takdir üreticisinin yazdığı dosya
//     başlığındaki iç kod bu yüzden görünmüyordu. ① ile ② birlikte 19 dosyada 783 kod
//     satırı taramanın dışında kalıyordu.
//   ③ Dizge deseni tırnak taşıyan bir düzenli ifadeden sonra kayıyor, iç içe şablonu da
//     ilk ters tırnakta kesiyordu. Yorumlar doğru örtülse bile 1428 gerçek dizge hiç
//     görünmüyor, 960 dizge yalnız parça parça görünüyordu; denetim çekirdeğinde 3174.
//     satırdaki tek bir düzenli ifadeden dosyanın sonuna kadar 598 dizge taranmıyordu.
//   Bugünkü gövde kaynağı tek geçişte okur ve beş bağlamı ayırır: kod, satır yorumu, blok
//   yorum, tırnaklı dizge ve şablon. Şablonun ${…} ifadeleri iç içe izlenir; / işareti
//   önündeki jetona bakılarak düzenli ifade ya da bölme diye ayrılır. Ölçüm (2026-10-10):
//   125 dosyanın hepsinde yorum örtüsü ve dizge listesi TypeScript ayrıştırıcısının
//   gördüğüyle karakteri karakterine aynıdır. Yasak listesi ve muafiyetler değişmemiştir;
//   değişen yalnız taramanın gördüğü alandır.

/** Bir dizge ya da şablon değeri: kaynaktaki başlangıcı ve tırnaklarıyla birlikte metni. */
interface Dizge { bas: number; metin: string }
/** Yorumları boşlukla örtülmüş kod (satır sonları korunur) ve üst düzey dizge değerleri. */
interface TaramaYuzu { kod: string; dizgeler: Dizge[] }

/** Bu işaretlerden ve sözcüklerden sonra gelen `/` düzenli ifade açar; öteki her jetondan sonra bölmedir. */
const IFADE_ONCESI_ISARET = new Set("(,=:[!&|?{};+-*%<>~^");
const IFADE_ONCESI_SOZCUK = new Set([
  "return", "typeof", "instanceof", "in", "of", "new", "delete", "void", "throw", "case", "do", "else", "yield", "await",
]);
const SOZCUK_RE = /[\p{L}\p{N}_$]+/uy;

function satirSonu(src: string, i: number): number {
  const k = src.indexOf("\n", i);
  return k < 0 ? src.length : k;
}

/** Tırnaklı dizgenin bittiği konum; kapanmadan gelen satır sonu dizgeyi keser. */
function dizgeSonu(src: string, i: number): number {
  for (let j = i + 1; j < src.length; j++) {
    if (src[j] === "\\") { j++; continue; }
    if (src[j] === src[i]) return j + 1;
    if (src[j] === "\n") return j;
  }
  return src.length;
}

/** Düzenli ifadenin bayraklarıyla bittiği konum; satır sonuna dek kapanmazsa -1 (bölme işaretidir). */
function duzenliIfadeSonu(src: string, i: number): number {
  let sinif = false;
  for (let j = i + 1; j < src.length; j++) {
    const c = src[j];
    if (c === "\\") { j++; continue; }
    if (c === "\n") return -1;
    if (sinif) { if (c === "]") sinif = false; continue; }
    if (c === "[") { sinif = true; continue; }
    if (c === "/") { SOZCUK_RE.lastIndex = j + 1; return SOZCUK_RE.test(src) ? SOZCUK_RE.lastIndex : j + 1; }
  }
  return -1;
}

/** Kaynağı tek geçişte okur; yorumları örter, üst düzey dizge ve şablon değerlerini toplar. */
function taramaYuzu(src: string): TaramaYuzu {
  const yorumlar: Array<[number, number]> = [];
  const araliklar: Array<[number, number]> = [];
  const ifadeler: number[] = [];   // açık ${…} ifadelerinin iç süslü ayraç derinliği
  let sablonBas = -1;               // açık üst düzey şablonun başı
  let sablonda = false;
  let onceki = "";                  // son anlamlı jeton
  let i = src.startsWith("#!") ? satirSonu(src, 0) : 0;
  if (i > 0) yorumlar.push([0, i]);
  while (i < src.length) {
    const c = src[i];
    if (sablonda) {
      if (c === "\\") i += 2;
      else if (c === "`") {
        i++; sablonda = false; onceki = "`";
        if (!ifadeler.length) araliklar.push([sablonBas, i]);
      } else if (c === "$" && src[i + 1] === "{") { i += 2; ifadeler.push(0); sablonda = false; onceki = "{"; }
      else i++;
      continue;
    }
    if (/\s/.test(c)) { i++; continue; }
    if (c === "/" && src[i + 1] === "/") { const son = satirSonu(src, i); yorumlar.push([i, son]); i = son; continue; }
    if (c === "/" && src[i + 1] === "*") {
      const kapanis = src.indexOf("*/", i + 2);
      const son = kapanis < 0 ? src.length : kapanis + 2;
      yorumlar.push([i, son]); i = son; continue;
    }
    if (c === '"' || c === "'") {
      const son = dizgeSonu(src, i);
      if (!ifadeler.length) araliklar.push([i, son]);
      i = son; onceki = c; continue;
    }
    if (c === "`") { if (!ifadeler.length) sablonBas = i; sablonda = true; i++; continue; }
    if (c === "/" && (onceki === "" || IFADE_ONCESI_ISARET.has(onceki) || IFADE_ONCESI_SOZCUK.has(onceki))) {
      const son = duzenliIfadeSonu(src, i);
      if (son > 0) { i = son; onceki = "değer"; continue; }
    }
    if (ifadeler.length && c === "{") ifadeler[ifadeler.length - 1]++;
    if (ifadeler.length && c === "}") {
      if (ifadeler[ifadeler.length - 1] === 0) { ifadeler.pop(); sablonda = true; i++; continue; }
      ifadeler[ifadeler.length - 1]--;
    }
    SOZCUK_RE.lastIndex = i;
    if (SOZCUK_RE.test(src)) { onceki = src.slice(i, SOZCUK_RE.lastIndex); i = SOZCUK_RE.lastIndex; continue; }
    onceki = c; i++;
  }
  // Şablon ifadesinin içindeki yorum da muaftır; dizge metni bu yüzden örtülmüş koddan kesilir.
  let kod = "";
  let son = 0;
  for (const [b, e] of yorumlar) { kod += src.slice(son, b) + src.slice(b, e).replace(/[^\n]/g, " "); son = e; }
  kod += src.slice(son);
  return { kod, dizgeler: araliklar.map(([b, e]) => ({ bas: b, metin: kod.slice(b, e) })) };
}

/** Tanı ALANI değerleri (mesaj/oneri/placeHolder) — motorun ilk temizlenen yüzeyi: önünde alan adı duran dizge. */
const ALAN_ONEKI = /(?:mesaj|oneri|placeHolder)\s*:\s*$/;

/** Bulgu satırı eşleşen jetonu da basar: uzun bir şablonun ilk yüz karakteri onu göstermeyebilir. */
function jetonIhlali(s: string, dosya: string): string[] {
  const bulunan: string[] = [];
  for (const y of YASAK) {
    const m = y.re.exec(s);
    if (m) bulunan.push(`${dosya}: ${y.ad} «${m[0].trim()}» → ${s.slice(0, 100)}`);
  }
  return bulunan;
}

/** Kaynaktaki bir dizgenin ihlalleri; satır numarası yalnız bulgu varken sayılır. */
function dizgeIhlali(dosya: string, yuz: TaramaYuzu, d: Dizge): string[] {
  if (!YASAK.some((y) => y.re.test(d.metin))) return [];
  return jetonIhlali(d.metin, `${dosya}:${yuz.kod.slice(0, d.bas).split("\n").length}`);
}

/**
 * TELGRAF ZİNCİRİ (Founder üslup hükmü · MDR-A06): kullanıcıya basılan bir metin
 * alanı, orta nokta ayracıyla birbirine eklenmiş CÜMLECİK dizisi olamaz — hüküm
 * özneli ve yüklemli tam cümleyle anlatılır.
 *
 * Desen KASTEN DARDIR ve yanlış-pozitif üretmemek için ölçülerek seçilmiştir:
 * ihlal, en az dört parçaya bölünen (üç ya da daha çok ayraç) VE her parçası en
 * az iki kelime taşıyan zincirdir. Tek kelimelik parçalar bir SAYIM'dır, telgraf
 * değildir ("görev · kabul · sınır · referans" meşrudur ve kalır).
 *
 * ÖLÇÜM (2026-07-28, kanon kaynağı): "üç ayraç" tek başına 39 dizgi yakalıyordu,
 * 34'ü tek kelimelik meşru sayımdı; iki-kelime koşulu eklenince geriye 5 dizgi
 * kaldı ve beşi de gerçek cümlecik zinciriydi — yanlış-pozitif sıfır.
 *
 * KAPSAM: yalnız sınıflama kanonunun metin alanları. .ts corpus'una uygulanmaz,
 * çünkü oradaki 15 eşleşmenin çoğu `etiket: ${değer} · etiket: ${değer}` biçiminde
 * biçimlendirilmiş CLI durum satırıdır — tablo çıktısı, telgraf üslubu değil.
 */
function telgrafZinciri(s: string): boolean {
  const parcalar = s.split("·");
  if (parcalar.length < 4) return false;
  return parcalar.every((p) => p.trim().split(/\s+/).filter(Boolean).length >= 2);
}

/** `koken` muafiyetinin koşulu: değer, boşluk taşımayan KOD literalleri dizisi mi? */
function cıplakKodDizisi(d: unknown): boolean {
  return Array.isArray(d) && d.length > 0
    && d.every((x) => typeof x === "string" && x.length > 0 && !/\s/.test(x));
}

/** Sınıflama kanonundaki (kayit.json · rehber.json) insan-görünür metinler. */
function kanonIhlalleri(dizin: string): string[] {
  const ihlaller: string[] = [];
  let dosyalar: string[];
  try { dosyalar = readdirSync(dizin).filter((f) => f.endsWith(".json")); } catch { return []; }
  for (const dosya of dosyalar) {
    const veri: unknown = JSON.parse(readFileSync(join(dizin, dosya), "utf8"));
    const gez = (d: unknown, yol: string): void => {
      if (typeof d === "string") {
        if (!/\s/.test(d)) return;                       // çıplak kod literali → muaf
        ihlaller.push(...jetonIhlali(d, `${dosya}${yol}`));
        if (telgrafZinciri(d))
          ihlaller.push(`${dosya}${yol}: telgraf zinciri → ${d.slice(0, 100)}`);
        return;
      }
      if (Array.isArray(d)) { d.forEach((x, i) => gez(x, `${yol}[${i}]`)); return; }
      if (d && typeof d === "object")
        for (const [anahtar, deger] of Object.entries(d)) {
          // Ajan yüzü muafiyeti KENDİNİ DOĞRULAR: `koken` yalnız ÇIPLAK KOD
          // dizisiyse atlanır. İçine düzyazı yazılırsa muafiyet düşer ve metin
          // taranır — böylece muafiyet, cümle saklamak için kullanılamaz.
          if (anahtar === KOKEN_ALANI && cıplakKodDizisi(deger)) continue;
          gez(deger, `${yol}.${anahtar}`);
        }
    };
    gez(veri, "");
  }
  return ihlaller;
}

/**
 * Kaynak ağacını ÖZYİNELEMELİ gezer.
 *
 * GOC-PROJEKOD-A07 GENİŞLETMESİ: tarama önceden `readdirSync` ile tek kademe
 * okuyordu, dolayısıyla `cekirdek/src/kopru/` altındaki üç dosyayı (`iz.ts`,
 * `lig.ts`, `nvidia.ts`) hiç ölçmüyordu. Alt dizin bugün ihlal taşımıyor, fakat
 * kör nokta kapının kendi iddiasını çürütüyordu: ölçülmeyen yer temiz sayılamaz.
 * Özyineleme kapsamı 48 dosyadan 51 dosyaya çıkardı.
 */
/**
 * Sınıflama kanonunun ÜRETİLEN `.md` yüzü (`kayit.md`).
 *
 * GOC-PROJEKOD-A07 GENİŞLETMESİ: kapı `oz/siniflama/*.json` kanonunu tarıyor
 * fakat aynı kanonun insan yüzü olan `.md` ikizini hiç görmüyordu. Bu yüz
 * geliştiricinin BİZZAT okuduğu sınıflama belgesidir; iç kod oraya sızarsa
 * JSON temiz olsa bile kullanıcı yüzü kirlidir. Ölçüm: genişletme anında bu tek
 * dosyada 25 ihlal satırı duruyordu ve hiçbiri kapıya görünmüyordu.
 *
 * Tarama SATIR düzeyindedir, çünkü Markdown'da "string değeri" kavramı yoktur;
 * insanın gördüğü birim satırın kendisidir.
 *
 * KAPSAM DIŞI ve GEREKÇESİ: `KARARLAR.md` ile üç `README.md` bu kapıya
 * alınmaz. Birincisi eski karar defterinin türetilmiş yüzüdür — konusu eski
 * karar numaralarının KENDİSİDİR ve kaynağı (`yasa/kararlar/`) bu turda
 * silinecek eski gövdedir; ikincisi kök belgeleridir ve ayrı bir belge turu
 * onları baştan üretir. İkisini de buraya bağlamak, kapıyı sahibi olmadığı bir
 * borçla kalıcı kırmızıya çivilerdi.
 */
function kanonMdIhlalleri(dizin: string): string[] {
  const ihlaller: string[] = [];
  let dosyalar: string[];
  try { dosyalar = readdirSync(dizin).filter((f) => f.endsWith(".md")); } catch { return []; }
  for (const dosya of dosyalar) {
    const satirlar = readFileSync(join(dizin, dosya), "utf8").split("\n");
    satirlar.forEach((satir, i) => {
      if (!satir.trim()) return;
      ihlaller.push(...jetonIhlali(satir, `${dosya}:${i + 1}`));
    });
  }
  return ihlaller;
}

function dosyalariGez(dizin: string, taban = ""): Array<{ dosya: string; yuz: TaramaYuzu }> {
  const toplanan: Array<{ dosya: string; yuz: TaramaYuzu }> = [];
  let girdiler;
  try { girdiler = readdirSync(dizin, { withFileTypes: true }); } catch { return []; }
  for (const girdi of girdiler) {
    const yol = join(dizin, girdi.name);
    const ad = taban ? `${taban}/${girdi.name}` : girdi.name;
    if (girdi.isDirectory()) { toplanan.push(...dosyalariGez(yol, ad)); continue; }
    if (!girdi.name.endsWith(".ts") || girdi.name.endsWith(".test.ts") || girdi.name === URETILEN_IKIZ) continue;
    toplanan.push({ dosya: ad, yuz: taramaYuzu(readFileSync(yol, "utf8")) });
  }
  return toplanan;
}

/** ZORLANAN kapsam: tanı alanı (mesaj/oneri/placeHolder) değerleri. */
function alanIhlalleri(dizin: string): string[] {
  const ihlaller: string[] = [];
  for (const { dosya, yuz } of dosyalariGez(dizin))
    for (const d of yuz.dizgeler)
      if (ALAN_ONEKI.test(yuz.kod.slice(Math.max(0, d.bas - 120), d.bas))) ihlaller.push(...dizgeIhlali(dosya, yuz, d));
  return ihlaller;
}

/** ÖLÇÜLEN kapsam: tüm cümle-benzeri (boşluklu) string değerleri — akademik-göç borcu. */
function corpusIhlalleri(dizin: string): string[] {
  const ihlaller: string[] = [];
  for (const { dosya, yuz } of dosyalariGez(dizin))
    for (const d of yuz.dizgeler) {
      if (!/\s/.test(d.metin)) continue; // çıplak kod literali (mantık kodu) muaf
      ihlaller.push(...dizgeIhlali(dosya, yuz, d));
    }
  return ihlaller;
}

// ── ZORLANAN: motor tanı alanları sıfır olmalı (temizlendi 2026-07-21) ────────
test("tanı-metni hijyeni · MOTOR tanı alanları (mesaj/oneri): iç jargon sızmaz — ZORLANIR", () => {
  const ihlaller = alanIhlalleri(MOTOR_DIZINI);
  assert.equal(ihlaller.length, 0,
    `Motor tanı metnine iç jargon sızmış (numara içeride yaşar, kullanıcı akademik cümle görür):\n${ihlaller.join("\n")}`);
});

// ── ZORLANAN: tüm kullanıcı-yüzü corpus (motor CLI/hata + eklenti hover/tamamlama/
//    panel + sınıflama kanonu). İnsan geliştirici bu metinleri BİZZAT görür.
//    MDR-A06 (2026-07-28) akademik-üslup göçünü bitirdi: ölçüm 236'dan sıfıra indi,
//    { todo } kalktı ve kapı ZORLANAN hâle döndü — bir daha iç kod sızarsa kırmızı yanar.
test("tanı-metni hijyeni · TÜM CORPUS: kullanıcı-yüzü metinler jargondan arınmalı", () => {
  const ihlaller = [
    ...corpusIhlalleri(MOTOR_DIZINI),
    ...corpusIhlalleri(EKLENTI_DIZINI),
    ...kanonIhlalleri(KANON_DIZINI),
    ...kanonMdIhlalleri(KANON_DIZINI),
  ];
  assert.equal(ihlaller.length, 0, `Kullanıcı-yüzü metne iç jargon sızmış (${ihlaller.length} nokta):\n${ihlaller.join("\n")}`);
});

// ── KÖR BÖLGE FİKSTÜRÜ (HST-MTR-A11) ─────────────────────────────────────────
//    Her dosya, taramanın bağlam tanımadan kör kaldığı bir yere tek bir iç kod koyar.
//    Dosyalar ayrıdır, çünkü bir kaymanın etkisi dosyanın sonuna kadar sürer ve bir
//    bölgenin kayması ötekinin kodunu kazara görünür kılabilir. Düzenli ifade dosyasında
//    hedef dizge ifadeyle aynı satırdadır, çünkü satır sonu kapanmamış bir dizgeyi keser
//    ve düzenli ifadeyi tanımayan bir ayıklayıcının kayması yalnız o satırda iz bırakır.
//    Son dosya ters yönü ölçer: gerçek yorumdaki kod, şablon ifadesinin içindeki yorum
//    dâhil, muaf kalır; `//`, `/*` ve `*/` taşıyan dizge ise baştan sona taranır.
//    Yorumlardaki kesme işareti bilinçlidir: yorumu tanımayan bir ayıklayıcı onu dizge
//    açılışı sanar ve muaf kalması gereken kodu bulguya çevirir.
const KOR_BOLGE_FIKSTURU: Record<string, string> = {
  "glob-dizgesi.ts": [
    'const desen = "**/*.sar";',
    'export const metin = "Bu metin \\" işaretini ve RAY-1 izini taşır";',
    'export const tani = { mesaj: "K-11 kodlu bir tanı" };',
    "/* gerçek blok yorum */",
  ].join("\n"),
  "yorumdaki-glob.ts": [
    "// sablon/*.sar dosyaları burada okunur",
    'export const metin = "Bu metin RAY-2 izini taşır";',
    "/** belge yorumu */",
  ].join("\n"),
  "sablondaki-yorum.ts": [
    "export const baslik = `// üretilen dosyanın başlığı",
    "//   RAY-3 koşumu bu kayıtları okur",
    "`;",
  ].join("\n"),
  "duzenli-ifade.ts": 'export const cek = (s: string) => s.match(/"([^"]+)"/)?.[1] ?? "Bu metin RAY-4 izini taşır";',
  "duzenli-ifade-sozcuk.ts": 'export function tirnakli(s: string) { return /"/.test(s) ? "Bu metin RAY-12 izini taşır" : ""; }',
  "ic-ice-sablon.ts": 'export const ozet = (n: number) => `Toplam ${n > 1 ? `${n} kayıt, RAY-5 izi` : "tek kayıt"} bulundu`;',
  "yorum-muafiyeti.ts": [
    "// Sarmal'ın satır notu: RAY-6 kullanıcıya görünmez",
    "/* Sarmal'ın blok notu: RAY-7 kullanıcıya görünmez */",
    "/** Sarmal'ın belge notu: RAY-8 kullanıcıya görünmez */",
    "export const say = (n: number) => `Toplam ${/* Sarmal'ın notu: RAY-11 */ n} kayıt`;",
    'export const adres = "https://ornek.test/*.sar ve RAY-9 izi, blok kapanışı */"; // Sarmal\'ın son notu: RAY-10',
  ].join("\n"),
};

/** Fikstür dizininde taramayı koşturur; her bulguyu `dosya kod` çiftine indirir. */
function korBolgeBulgulari(tara: (dizin: string) => string[]): string[] {
  const dizin = mkdtempSync(join(tmpdir(), "sarmal-hijyen-"));
  try {
    for (const [ad, icerik] of Object.entries(KOR_BOLGE_FIKSTURU)) writeFileSync(join(dizin, ad), icerik);
    return tara(dizin)
      .map((b) => `${b.match(/^[^:]+/)?.[0]} ${b.split("→")[1]?.match(/\b(?:RAY|K)-\d+/)?.[0]}`)
      .sort();
  } finally {
    rmSync(dizin, { recursive: true, force: true });
  }
}

test("tanı-metni hijyeni · KÖR BÖLGE: glob, şablon, düzenli ifade ve iç içe şablondaki iç kod görünür", () => {
  assert.deepEqual(korBolgeBulgulari(corpusIhlalleri), [
    "duzenli-ifade-sozcuk.ts RAY-12",
    "duzenli-ifade.ts RAY-4",
    "glob-dizgesi.ts K-11",
    "glob-dizgesi.ts RAY-1",
    "ic-ice-sablon.ts RAY-5",
    "sablondaki-yorum.ts RAY-3",
    "yorum-muafiyeti.ts RAY-9",
    "yorumdaki-glob.ts RAY-2",
  ]);
});

test("tanı-metni hijyeni · KÖR BÖLGE: sahte blok yorumun ardındaki tanı alanı görünür", () => {
  assert.deepEqual(korBolgeBulgulari(alanIhlalleri), ["glob-dizgesi.ts K-11"]);
});

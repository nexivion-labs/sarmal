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
import { readFileSync, readdirSync } from "node:fs";
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

/** Yorumları (satır + blok) kaldırır — kod-içi geliştirici notu kullanıcı görmez, muaf. */
function yorumsuz(src: string): string {
  const bloksuz = src.replace(/\/\*[\s\S]*?\*\//g, " ");
  return bloksuz
    .split("\n")
    .map((satir) => {
      // satır içindeki ilk, string DIŞINDA olan // 'den sonrasını at
      let tirnak: string | null = null;
      for (let i = 0; i < satir.length - 1; i++) {
        const c = satir[i];
        if (tirnak) {
          if (c === "\\") { i++; continue; }
          if (c === tirnak) tirnak = null;
        } else if (c === "`" || c === '"' || c === "'") {
          tirnak = c;
        } else if (c === "/" && satir[i + 1] === "/") {
          return satir.slice(0, i);
        }
      }
      return satir;
    })
    .join("\n");
}

const STRING_RE = /`(?:[^`\\]|\\.)*`|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g;
/** Tanı ALANI değerleri (mesaj/oneri/placeHolder) — motorun ilk temizlenen yüzeyi. */
const ALAN_RE = /(?:mesaj|oneri|placeHolder)\s*:\s*(`(?:[^`\\]|\\.)*`|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g;

function jetonIhlali(s: string, dosya: string): string[] {
  const bulunan: string[] = [];
  for (const y of YASAK) if (y.re.test(s)) bulunan.push(`${dosya}: ${y.ad} → ${s.slice(0, 100)}`);
  return bulunan;
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

function dosyalariGez(dizin: string, taban = ""): Array<{ dosya: string; src: string }> {
  const toplanan: Array<{ dosya: string; src: string }> = [];
  let girdiler;
  try { girdiler = readdirSync(dizin, { withFileTypes: true }); } catch { return []; }
  for (const girdi of girdiler) {
    const yol = join(dizin, girdi.name);
    const ad = taban ? `${taban}/${girdi.name}` : girdi.name;
    if (girdi.isDirectory()) { toplanan.push(...dosyalariGez(yol, ad)); continue; }
    if (!girdi.name.endsWith(".ts") || girdi.name.endsWith(".test.ts") || girdi.name === URETILEN_IKIZ) continue;
    toplanan.push({ dosya: ad, src: yorumsuz(readFileSync(yol, "utf8")) });
  }
  return toplanan;
}

/** ZORLANAN kapsam: tanı alanı (mesaj/oneri/placeHolder) değerleri. */
function alanIhlalleri(dizin: string): string[] {
  const ihlaller: string[] = [];
  for (const { dosya, src } of dosyalariGez(dizin))
    for (const m of src.matchAll(ALAN_RE)) ihlaller.push(...jetonIhlali(m[1], dosya));
  return ihlaller;
}

/** ÖLÇÜLEN kapsam: tüm cümle-benzeri (boşluklu) string değerleri — akademik-göç borcu. */
function corpusIhlalleri(dizin: string): string[] {
  const ihlaller: string[] = [];
  for (const { dosya, src } of dosyalariGez(dizin))
    for (const m of src.matchAll(STRING_RE)) {
      if (!/\s/.test(m[0])) continue; // çıplak kod literali (mantık kodu) muaf
      ihlaller.push(...jetonIhlali(m[0], dosya));
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

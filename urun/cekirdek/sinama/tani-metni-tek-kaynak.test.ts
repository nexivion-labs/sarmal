// ═══════════════════════════════════════════════════════════════════════════
// tani-metni-tek-kaynak.test.ts — 🗣️ TANI METNİ TEK KAYNAKTA YAŞAR (CDL-A02)
//
//   Motorun kullanıcıya söylediği her cümle `src/tani-metinleri.ts` dosyasında
//   yaşar. Gerekçesi dil desteğidir ve ölçülmüştür: metin motorun içine
//   dağıldığında çevirmen nereye bakacağını bilemez, kaçırılan cümle sessizce
//   Türkçe kalır ve kullanıcı İngilizce bir ad ile Türkçe bir açıklama görür.
//   Bu nöbet o dağılmayı yapısal olarak imkânsız kılar.
//
//   NÖBETİN ÖLÇTÜĞÜ ŞEY: bir tanı nesnesi (düzey taşıyan nesne değişmezi)
//   kendi `mesaj` ya da `oneri` cümlesini dizgi olarak İÇİNDE taşıyamaz.
//   Cümle katalogdan gelir; üretici yalnız olguyu, düzeyi ve konumu verir.
//   Yeni bir tanı eklenip metni kaynağa gömülürse bu süit KIRMIZIYA döner.
//
//   BEYANLI TEK İSTİSNA — `söz-dizim`: bu tanının metni bir şablon değil,
//   belirteçleyici ile ayrıştırıcının fırlattığı söz dizimi hatasının kendi
//   cümlesidir ve o katmanda yaşar. Katalog `tani-sicili` üzerinden sınıflama
//   kanonunu ve dosya sistemini çeker; belirteçleyicinin ona bağlanması en alt
//   katmanı en üst katmana bağımlı kılardı. İstisna BEYANLIDIR ve nöbet onun
//   TEK istisna kaldığını ayrıca ölçer — liste sessizce büyüyemez.
// ═══════════════════════════════════════════════════════════════════════════
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

import { SABIT_TANI_KODLARI } from "../src/tani-sicili.ts";
import { TANI_METINLERI, ONCEKI_TANI_METINLERI, eskiTani } from "../src/tani-metinleri.ts";

const MOTOR_DIZINI = fileURLToPath(new URL("../src", import.meta.url));

/** Cümlesi katalogda DEĞİL, kendi katmanında yaşayan tanılar — gerekçesi dosya başlığında. */
const BEYANLI_ISTISNALAR: readonly string[] = ["söz-dizim"];

/** Metnin tek kaynağı — kendi kendini ölçmez. */
const TEK_KAYNAK = "tani-metinleri.ts";
/** Üretilmiş ikiz — kaynağı ayrıca ölçülür, çift sayılmaz. */
const URETILEN_IKIZ = "gomulu-kanon.ts";

/**
 * Yorumları ve dizgi İÇERİKLERİNİ boşlukla siler, uzunluğu korur.
 *
 * İçeriğin silinmesi bilinçlidir: nöbet dizginin NEREDE başladığını arar,
 * içinde ne yazdığını değil. Dizgi içindeki süslü parantez, tarama sırasında
 * sahte bir nesne sınırı üretirdi.
 */
function iskeletle(src: string): string {
  let out = "";
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === "/" && src[i + 1] === "/") {
      while (i < src.length && src[i] !== "\n") { out += " "; i++; }
      continue;
    }
    if (c === "/" && src[i + 1] === "*") {
      while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) { out += src[i] === "\n" ? "\n" : " "; i++; }
      out += "  "; i += 2;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      const bit = c;
      out += c; i++;
      while (i < src.length) {
        if (src[i] === "\\") { out += "  "; i += 2; continue; }
        if (src[i] === bit) { out += bit; i++; break; }
        out += src[i] === "\n" ? "\n" : " ";
        i++;
      }
      continue;
    }
    out += c; i++;
  }
  return out;
}

/** Verilen konumu saran en yakın nesne değişmezinin metnini döndürür. */
function saranNesne(iskelet: string, konum: number): string {
  let derinlik = 0;
  let bas = -1;
  for (let i = konum; i >= 0; i--) {
    const c = iskelet[i];
    if (c === "}") derinlik++;
    else if (c === "{") {
      if (derinlik === 0) { bas = i; break; }
      derinlik--;
    }
  }
  if (bas < 0) return "";
  let d = 0;
  for (let i = bas; i < iskelet.length; i++) {
    if (iskelet[i] === "{") d++;
    else if (iskelet[i] === "}") { d--; if (d === 0) return iskelet.slice(bas, i + 1); }
  }
  return iskelet.slice(bas);
}

function motorDosyalari(dizin: string, taban = ""): Array<{ ad: string; src: string }> {
  const out: Array<{ ad: string; src: string }> = [];
  for (const girdi of readdirSync(dizin, { withFileTypes: true })) {
    const yol = join(dizin, girdi.name);
    const ad = taban ? `${taban}/${girdi.name}` : girdi.name;
    if (girdi.isDirectory()) { out.push(...motorDosyalari(yol, ad)); continue; }
    if (!girdi.name.endsWith(".ts")) continue;
    if (girdi.name === TEK_KAYNAK || girdi.name === URETILEN_IKIZ) continue;
    out.push({ ad, src: readFileSync(yol, "utf8") });
  }
  return out;
}

/** Tanı nesnesine GÖMÜLÜ kalmış kullanıcı cümlelerini bulur. */
function gomuluTaniMetinleri(): string[] {
  const bulgular: string[] = [];
  const ALAN = /(?:^|[^A-Za-z0-9_.$])(mesaj|oneri)\s*:\s*["'`]/g;
  for (const { ad, src } of motorDosyalari(MOTOR_DIZINI)) {
    const iskelet = iskeletle(src);
    for (const eslesme of iskelet.matchAll(ALAN)) {
      const konum = eslesme.index! + eslesme[0].length - 1;
      const nesne = saranNesne(iskelet, konum);
      if (!/(?:^|[^A-Za-z0-9_.$])duzey\s*:/.test(nesne)) continue;   // tanı nesnesi değil
      const satir = iskelet.slice(0, konum).split("\n").length;
      bulgular.push(`${ad}:${satir} — "${eslesme[1]}" alanı düzey taşıyan bir nesnenin içinde dizgi olarak yazılmış`);
    }
  }
  return bulgular;
}

// ── ① TEK KAYNAK: motor kaynağında gömülü tanı cümlesi kalmamıştır ───────────
test("tanı metni tek kaynakta: motor kaynağında gömülü kullanıcı cümlesi YOK", () => {
  const gomulu = gomuluTaniMetinleri();
  assert.deepEqual(gomulu, [],
    `Tanı cümlesi kaynağa gömülmüş (${gomulu.length} nokta). Cümleyi src/tani-metinleri.ts kataloğuna taşı ` +
    "ve üretim yerinde eskiTani(kod, düzey, bağlam, konum) ya da yeniTani(kod, bağlam, konum) çağır:\n" +
    gomulu.join("\n"));
});

// ── ② KAPSAMA: sicildeki her kimliğin cümlesi katalogda vardır ───────────────
test("tanı metni tek kaynakta: sabit sicilin tamamı katalogda (beyanlı istisna dışında)", () => {
  const katalog = new Set([...Object.keys(TANI_METINLERI), ...Object.keys(ONCEKI_TANI_METINLERI)]);
  const eksik = SABIT_TANI_KODLARI.filter((k) => !katalog.has(k));
  assert.deepEqual(eksik, [...BEYANLI_ISTISNALAR],
    "Sicilde olup katalogda olmayan tanı kimliği var — cümlesini src/tani-metinleri.ts içine yaz " +
    "(beyansız istisna kabul edilmez; istisna gerekçesiyle dosya başlığında ilan edilir).");
  const kapsama = SABIT_TANI_KODLARI.length - eksik.length;
  assert.equal(kapsama, SABIT_TANI_KODLARI.length - BEYANLI_ISTISNALAR.length,
    `Toplama oranı düştü: ${kapsama}/${SABIT_TANI_KODLARI.length}`);
});

// ── ③ İSTİSNA TEKTİR: beyanlı liste sessizce büyüyemez ──────────────────────
test("tanı metni tek kaynakta: beyanlı istisna TEK kalır ve gerekçesi ilan edilmiştir", () => {
  assert.equal(BEYANLI_ISTISNALAR.length, 1,
    "Katalog dışı tanı sayısı arttı — her yeni istisna gerekçesiyle bu dosyanın başlığına yazılır.");
  assert.ok(SABIT_TANI_KODLARI.includes(BEYANLI_ISTISNALAR[0]),
    "Beyanlı istisna sicilde bulunmuyor — ölü bir muafiyet kaydı yaşayamaz.");
});

// ── ④ KATALOGSUZ KİMLİK SESSİZCE GEÇEMEZ ────────────────────────────────────
test("tanı metni tek kaynakta: katalogda karşılığı olmayan kimlik cümle UYDURAMAZ", () => {
  assert.throws(() => eskiTani("olmayan-tanı-kimliği", "hata", {}, {}),
    /Tanı metni yok/,
    "Katalogsuz kimlik sessizce boş cümleyle geçiyor — motor uydurma metin basmamalıdır.");
});

// ── ⑤ KATALOG ÖLÜ GİRDİ TAŞIMAZ ─────────────────────────────────────────────
test("tanı metni tek kaynakta: katalogdaki her kimlik sicilde de yaşar (ölü metin yok)", () => {
  const sicil = new Set(SABIT_TANI_KODLARI);
  const olu = Object.keys(ONCEKI_TANI_METINLERI).filter((k) => !sicil.has(k));
  assert.deepEqual(olu, [],
    "Katalogda sicilde karşılığı olmayan metin var — emekli tanının cümlesi katalogda bayatlar.");
});

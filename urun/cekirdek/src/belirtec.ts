// ═══════════════════════════════════════════════════════════════════════════
// belirtec.ts — Belirteçleyici (lexer)
//
//   .sar kaynağını Belirteç dizisine çevirir. Boru hattının ilk halkası:
//     kaynak → [belirtecle] → Belirteç[] → [ayrıştır] → söz dizim ağacı
//
//   Türkçe-önce (DIL-1.1): tip/işlev adları Türkçe; teknoloji terimleri evrensel.
//   Bağımlılıksız: yalnız standart JS + Node.
//
//   EMOJİ TAKMA-ADLARI (EMJ-A02): Founder-onaylı kanondaki her emoji, karşılık
//   geldiği Türkçe yazımın eşdeğeridir — burada TEK YÖNLÜ normalleştirilir
//   (🍃 → "Adım", 🆔 → "kod", ⏳ → "beklemede"); boru hattının kalanı emoji
//   görmez, iki yüz aynı grafı üretir. Dizgi/yorum/belge içindeki emojiler
//   içerik olarak korunur (o yollar bu daldan önce yutar).
// ═══════════════════════════════════════════════════════════════════════════

import { emojiEsle } from "./emoji-yazim.ts";

/** Bir belirtecin türü (söz dizimindeki en küçük anlamlı parça). */
export type BelirtecTuru =
  | "ad"        // tanımlayıcı / KOD / anahtar sözcük (çağır · Tip · Kural)
  | "metin"     // "..." dizgi
  | "sayı"      // 42 · 3.14
  | "parenAç" | "parenKapa"     // ( )
  | "süsAç" | "süsKapa"         // { }
  | "köşeAç" | "köşeKapa"       // [ ]
  | "ikiNokta"  // :
  | "virgül"    // ,
  | "işleç"     // + - * / % == != < <= > >=  (DIL-1.3 ifade dili)
  | "nokta"     // .  (DIL-1.3 erişim: kullanıcı.ad)
  | "anahtar"   // #küme.ad  (DIL-1.3 i18n sözlük anahtarı)
  | "mühür"     // @mühür:<hash>  (doğuş-rehberi turu · Dhall ödüncü: çağır hedef-pini)
  | "ok"        // -->  (DIL-1.4 akış şekeri: besler kısa yolu)
  | "belge"     // /// satırı (DIL-2.2) ya da -->| ... |<-- bloğu (DIL-2) — ATILMAZ, altındaki widget'ın belgesi
  | "dosyaSonu";

export interface Belirtec {
  tur: BelirtecTuru;
  /** metin için tırnak-içi çözülmüş değer; diğerleri için ham sözce. */
  deger: string;
  satir: number;   // 1-tabanlı
  sutun: number;   // 1-tabanlı
}

/** Söz dizimi ihlali — iki okuma haneli, konumlu (satır:sütun). */
export class SozDizimHatasi extends Error {
  satir: number;
  sutun: number;
  ingilizceMesaj: string;
  constructor(mesaj: string, satir: number, sutun: number, ingilizceMesaj: string) {
    super(mesaj);
    this.name = "SözDizimHatası";
    this.satir = satir;
    this.sutun = sutun;
    this.ingilizceMesaj = ingilizceMesaj;
  }
}

// Ad başlangıcı: harf veya alt-çizgi. Ad içi: harf/rakam/alt-çizgi.
// Türkçe harfler (İ ş ç ğ ü ö ı) \p{L} ile kapsanır (u bayrağı şart).
const AD_BAS = /[\p{L}_]/u;
const AD_IC = /[\p{L}\p{N}_]/u;
const RAKAM = /[0-9]/;

// Tek karakterli imler.
const TEKLI: Record<string, BelirtecTuru> = {
  "(": "parenAç", ")": "parenKapa",
  "{": "süsAç", "}": "süsKapa",
  "[": "köşeAç", "]": "köşeKapa",
  ":": "ikiNokta", ",": "virgül",
};

// ── ⚡ PRF-MK-A03 · TUR ÖMÜRLÜ BELİRTEÇ MEMOSU ──────────────────────────────────
//   Bir denetim turunda aynı dosya iki kez belirteçleniyordu: önce program yükleyici,
//   sonra kimlik indeksi (dosyayiTara). Belirteçleme saftır ve girdi metnine
//   bağlıdır; içerik anahtarlı memo bu yüzden KESİNDİR. Memo yalnız açık bir kapsam
//   içinde yaşar (`belirtecMemosuyla`) ve kapsam kapanınca düşer; süreç ömürlü
//   sınırsız harita denetçi tarafından reddedilmiştir. Kapsam dışındaki çağrı
//   (eklenti, komut satırı araçları) eskisi gibi her seferinde hesaplar.
//   Dönen dizi PAYLAŞILIR: ayrıştırıcı imleçle okur ve belirteçleri değiştirmez;
//   ağaç paylaşılmaz, çünkü mevsim çevrimi ağaca sanal çocuk ekler.
let belirtecMemosu: Map<string, Belirtec[]> | undefined;
const belirtecSayac = { cagri: 0, hesap: 0 };

/** Verilen işi tur ömürlü memo kapsamında koşturur; iş bitince (hata dâhil) memo düşer. */
export function belirtecMemosuyla<T>(is: () => T): T {
  const dis = belirtecMemosu;          // iç içe kapsam: dıştaki korunur, içteki kendi haritasını kurar
  belirtecMemosu = new Map();
  try { return is(); }
  finally { belirtecMemosu = dis; }
}

/** Nöbet için: çağrı ve gerçek hesap sayısı; fark memo isabetidir. */
export function belirtecSayaci(): { cagri: number; hesap: number } { return { ...belirtecSayac }; }
/** Nöbet için: sayaçları sıfırlar. Üretim yolu bunu çağırmaz. */
export function belirtecSayaciniSifirla(): void { belirtecSayac.cagri = 0; belirtecSayac.hesap = 0; }
/** Nöbet için: açık memonun giriş sayısı; kapsam dışında sıfır (memo yok). */
export function belirtecMemoBoyutu(): number { return belirtecMemosu?.size ?? 0; }

/** .sar kaynağını belirteçlere ayırır. Son belirteç daima "dosyaSonu". */
export function belirtecle(kaynak: string): Belirtec[] {
  belirtecSayac.cagri += 1;
  const memoAnahtari = kaynak;
  if (belirtecMemosu) {
    const hazir = belirtecMemosu.get(memoAnahtari);
    if (hazir) return hazir;
  }
  const sonuc = belirtecleHesapla(kaynak);
  belirtecSayac.hesap += 1;
  belirtecMemosu?.set(memoAnahtari, sonuc);
  return sonuc;
}

function belirtecleHesapla(kaynak: string): Belirtec[] {
  // ⚠️ TÜRKÇE-KARAKTER GÜVENLİĞİ (DIL-1): kaynağı NFC'ye normalize et. macOS
  // dosyaları / bazı editörler ş·ğ·ö·ü·ç·İ'yi NFD (taban + birleşen) saklar;
  // NFD "Sözleşme" ≠ NFC "Sözleşme" string-eşitlikte → sahte bilinmeyen-tip.
  // Tüm boru hattı tek biçimde (NFC) çalışsın diye giriş sınırında düzeltilir.
  kaynak = kaynak.normalize("NFC");
  const belirtecler: Belirtec[] = [];
  let i = 0;
  let satir = 1;
  let sutun = 1;

  const ilerle = (n = 1): void => {
    for (let k = 0; k < n; k++) {
      if (kaynak[i] === "\n") { satir++; sutun = 1; }
      else { sutun++; }
      i++;
    }
  };
  // ⚡ PRF-MK-A04 · toplu ilerleme: `ilerle(n)` ile birebir aynı satır ve sütun
  // sonucunu verir, fakat karakter döngüsü yerine dilimdeki yeni satırları sayar.
  // Yalnız dilimleme yolunda kullanılır; tek karakterlik adımlar `ilerle` ile kalır.
  const atla = (n: number): void => {
    if (n <= 0) return;
    const dilim = kaynak.slice(i, i + n);
    const sonYeniSatir = dilim.lastIndexOf("\n");
    if (sonYeniSatir < 0) { sutun += n; }
    else {
      let yeniSatir = 0;
      for (let k = dilim.indexOf("\n"); k >= 0; k = dilim.indexOf("\n", k + 1)) yeniSatir++;
      satir += yeniSatir;
      sutun = 1 + (n - sonYeniSatir - 1);
    }
    i += n;
  };

  while (i < kaynak.length) {
    const c = kaynak[i];

    // boşluk / satır sonu
    if (c === " " || c === "\t" || c === "\r" || c === "\n") { ilerle(); continue; }

    // /// belge-yorumu (DIL-2.2): satırın kalanı BELGE içeriğidir — yorum gibi
    // atılmaz; ayrıştırıcı altındaki widget'ın `belge` alanına bağlar.
    if (c === "/" && kaynak[i + 1] === "/" && kaynak[i + 2] === "/") {
      const bsS = satir, bsSu = sutun;
      ilerle(3);
      if (kaynak[i] === " ") ilerle(); // tek baş boşluk düşer ("/// metin")
      // ⚡ PRF-MK-A04 · dilimleme: satır sonu indeksle bulunur, içerik tek dilimde alınır.
      const satirSonu = kaynak.indexOf("\n", i);
      const icerik = kaynak.slice(i, satirSonu < 0 ? kaynak.length : satirSonu);
      atla(icerik.length);
      belirtecler.push({ tur: "belge", deger: icerik.replace(/[ \t]+$/, ""), satir: bsS, sutun: bsSu });
      continue;
    }

    // satır yorumu: // ... satır sonuna kadar (DIL-1.4)
    if (c === "/" && kaynak[i + 1] === "/") {
      while (i < kaynak.length && kaynak[i] !== "\n") ilerle();
      continue;
    }

    // blok yorumu: /* ... */ (DIL-1.4; satır-içi ve çok-satırlı; iç içe değil)
    if (c === "/" && kaynak[i + 1] === "*") {
      const yorumSatir = satir;
      const yorumSutun = sutun;
      ilerle(2); // /*
      while (i < kaynak.length && !(kaynak[i] === "*" && kaynak[i + 1] === "/")) ilerle();
      if (i >= kaynak.length) {
        throw new SozDizimHatasi(
          "Kapanmamış blok yorum — */ eksik.", yorumSatir, yorumSutun,
          "Unclosed block comment — missing */.",
        );
      }
      ilerle(2); // */
      continue;
    }

    const bsSatir = satir;
    const bsSutun = sutun;

    // -->| belge bloğu (DIL-2) — |<-- görülene dek HAM yutulur: markdown,
    // XML bölüm tag'leri, ASCII şekiller (içlerindeki | ve ] serbest — DIL-2.2
    // şekil-muhafazası bu yüzden tek | ile kapanmaz, ayna |<-- ile kapanır).
    // /// ile aynı "belge" belirtecini üretir → ayrıştırıcı bedava bağlar.
    if (c === "-" && kaynak[i + 1] === "-" && kaynak[i + 2] === ">" && kaynak[i + 3] === "|") {
      const bsS = satir, bsSu = sutun;
      ilerle(4); // -->|
      // ⚡ PRF-MK-A04 · dilimleme: kapanış İLK geçtiği yerde aranır (eski döngüyle aynı
      // sözleşme), içerik tek dilimde alınır, konum toplu ilerlemeyle taşınır. Kapanış
      // bulunamayınca aynı hata aynı blok başı konumuyla atılır.
      const kapanis = kaynak.indexOf("|<--", i);
      if (kapanis < 0) {
        throw new SozDizimHatasi(
          "Kapanmamış belge bloğu — kapanış |<-- eksik.", bsS, bsSu,
          "Unclosed document block — missing closing |<--.",
        );
      }
      const ham = kaynak.slice(i, kapanis);
      atla(ham.length);
      ilerle(4); // |<--
      belirtecler.push({ tur: "belge", deger: blokKirp(ham), satir: bsS, sutun: bsSu });
      continue;
    }

    // --> akış oku (DIL-1.4) — tireli-ad birleşiminden ÖNCE denetlenir
    if (c === "-" && kaynak[i + 1] === "-" && kaynak[i + 2] === ">") {
      belirtecler.push({ tur: "ok", deger: "-->", satir: bsSatir, sutun: bsSutun });
      ilerle(3);
      continue;
    }

    // işleçler (DIL-1.3): önce iki-karakterliler (== != <= >=), sonra tekliler
    const iki = kaynak.slice(i, i + 2);
    if (iki === "==" || iki === "!=" || iki === "<=" || iki === ">=") {
      belirtecler.push({ tur: "işleç", deger: iki, satir: bsSatir, sutun: bsSutun });
      ilerle(2);
      continue;
    }
    if ("+-*/%<>".includes(c)) {
      belirtecler.push({ tur: "işleç", deger: c, satir: bsSatir, sutun: bsSutun });
      ilerle();
      continue;
    }
    if (c === "=") {
      throw new SozDizimHatasi(
        'Tek "=" geçersiz — karşılaştırma için "==" kullan.', bsSatir, bsSutun,
        'A single "=" is invalid — use "==" for comparison.',
      );
    }
    if (c === ".") {
      belirtecler.push({ tur: "nokta", deger: ".", satir: bsSatir, sutun: bsSutun });
      ilerle();
      continue;
    }

    // #küme.ad — i18n sözlük anahtarı (DIL-1.3); tek belirteç olarak yutulur
    if (c === "#") {
      ilerle(); // #
      if (!AD_BAS.test(kaynak[i] ?? "")) {
        throw new SozDizimHatasi(
          '"#" sonrası sözlük anahtarı bekleniyordu (örn. #giris.başlık).', bsSatir, bsSutun,
          'A dictionary key was expected after "#" (for example #giris.başlık).',
        );
      }
      let ham = "";
      while (i < kaynak.length && (AD_IC.test(kaynak[i]) || (kaynak[i] === "." && AD_BAS.test(kaynak[i + 1] ?? "")))) {
        ham += kaynak[i];
        ilerle();
      }
      belirtecler.push({ tur: "anahtar", deger: ham, satir: bsSatir, sutun: bsSutun });
      continue;
    }

    // @mühür:<hash> — mühürlü referans pini (doğuş-rehberi turu · Dhall sha256 import ödüncü).
    // Tek belirteç olarak yutulur; değer = çıplak hash (hex/alnum).
    if (c === "@") {
      ilerle(); // @
      let ad = "";
      while (i < kaynak.length && AD_IC.test(kaynak[i])) { ad += kaynak[i]; ilerle(); }
      if (ad !== "mühür") {
        throw new SozDizimHatasi(
          `"@" sonrası yalnız "mühür" gelir (örn. @mühür:3f2a…), "${ad}" bulundu; mühür bir referansı içeriğine sabitler.`,
          bsSatir, bsSutun,
          `Only "mühür" may follow "@" (for example @mühür:3f2a…); "${ad}" was found. A mühür pins a reference to its content.`,
        );
      }
      if (kaynak[i] !== ":") {
        throw new SozDizimHatasi(
          '"@mühür" sonrası ":" ve hash bekleniyordu (örn. @mühür:3f2a9c1b04de).', bsSatir, bsSutun,
          'A ":" and hash were expected after "@mühür" (for example @mühür:3f2a9c1b04de).',
        );
      }
      ilerle(); // :
      let hash = "";
      while (i < kaynak.length && /[0-9a-zA-Z]/.test(kaynak[i])) { hash += kaynak[i]; ilerle(); }
      if (!hash) {
        throw new SozDizimHatasi(
          '"@mühür:" sonrası hash boş — denetle koş, mühür-kırık önerisi güncel hash\'i söyler.', bsSatir, bsSutun,
          'The hash after "@mühür:" is empty — run the check; the mühür-kırık suggestion reports the current hash.',
        );
      }
      belirtecler.push({ tur: "mühür", deger: hash, satir: bsSatir, sutun: bsSutun });
      continue;
    }

    // tek karakterli imler
    const im = TEKLI[c];
    if (im) {
      belirtecler.push({ tur: im, deger: c, satir: bsSatir, sutun: bsSutun });
      ilerle();
      continue;
    }

    // """çok-satırlı değer""" (DIL-2.2) — girinti ilk içerik satırına göre kırpılır.
    if (c === '"' && kaynak[i + 1] === '"' && kaynak[i + 2] === '"') {
      ilerle(3);
      // ⚡ PRF-MK-A04 · dilimleme: kapanış ilk geçtiği yerde aranır, içerik tek dilimde alınır.
      const kapanis = kaynak.indexOf('"""', i);
      if (kapanis < 0) {
        throw new SozDizimHatasi(
          'Kapanmamış çok-satırlı değer — kapanış """ eksik.', bsSatir, bsSutun,
          'Unclosed multiline value — missing closing """.',
        );
      }
      const ham = kaynak.slice(i, kapanis);
      atla(ham.length);
      ilerle(3);
      belirtecler.push({ tur: "metin", deger: ucluKirp(ham), satir: bsSatir, sutun: bsSutun });
      continue;
    }

    // dizgi "..."
    if (c === '"') {
      ilerle(); // açılış tırnağı
      let deger = "";
      while (i < kaynak.length && kaynak[i] !== '"') {
        if (kaynak[i] === "\\" && i + 1 < kaynak.length) {
          const s = kaynak[i + 1];
          deger += s === "n" ? "\n" : s;   // basit kaçış: \" \\ \n
          ilerle(2);
        } else {
          deger += kaynak[i];
          ilerle();
        }
      }
      if (i >= kaynak.length) {
        throw new SozDizimHatasi(
          'Kapanmamış dizgi — " eksik.', bsSatir, bsSutun,
          'Unclosed string — missing ".',
        );
      }
      ilerle(); // kapanış tırnağı
      belirtecler.push({ tur: "metin", deger, satir: bsSatir, sutun: bsSutun });
      continue;
    }

    // sayı
    if (RAKAM.test(c)) {
      let ham = "";
      while (i < kaynak.length && (RAKAM.test(kaynak[i]) || kaynak[i] === ".")) {
        ham += kaynak[i];
        ilerle();
      }
      belirtecler.push({ tur: "sayı", deger: ham, satir: bsSatir, sutun: bsSutun });
      continue;
    }

    // emoji takma-adı (EMJ-A02): kanondaki emoji, kanonik Türkçe adın eşdeğer
    // yazımıdır — "ad" belirteci olarak kanonik adla yutulur (tek yönlü
    // normalleştirme; konum emojinin konumudur). Kanon dışı emoji bu dala
    // girmez ve aşağıdaki genel hataya düşer (geriye uyumluluk: çıplak emoji
    // bugüne dek zaten söz dizimi hatasıydı).
    const emoji = emojiEsle(kaynak, i);
    if (emoji) {
      belirtecler.push({ tur: "ad", deger: emoji.ad, satir: bsSatir, sutun: bsSutun });
      ilerle(emoji.sozce.length);
      continue;
    }

    // ad / KOD — harf başlar; içinde harf/rakam/_; tire ile birleşik KOD parçaları
    // (örn. BLK-KIMLIK, ADM-GIRIS) tek ad sayılır. Karar D: noktalı madde kodu
    // (örn. MIM-1.5, STR-2.1) da tek ad sayılır — nokta yalnız ardından rakam
    // gelirse ve en çok iki derinlik yutulur; alan erişimi (düğüm.alan) noktadan
    // sonra harf, cümle sonu boşluk aldığı için ayrık kalır.
    if (AD_BAS.test(c)) {
      let ham = "";
      let noktaDerinligi = 0;
      let adAlaniYutuldu = false;
      while (i < kaynak.length) {
        const ch = kaynak[i];
        if (AD_IC.test(ch)) { ham += ch; ilerle(); continue; }
        // tire yalnızca iki sözcük-parçası arasında yutulur (KOD birleşimi)
        if (ch === "-" && i + 1 < kaynak.length && AD_IC.test(kaynak[i + 1])) {
          ham += ch; ilerle(); continue;
        }
        // ORK-4 çapraz-proje ad alanı (KPS-ADA-A01): `::` iki kimlik parçası
        // ARASINDA bir kez yutulur ve `PRJ-A::KOD-X` TEK ad belirteci olur;
        // ayrıştırıcı onu bedelsiz olarak tek bir KOD değeri sayar ve liste
        // içindeki ad alanlı kodlar hata üretmez. Ayraç yalnız iki yanı da
        // kimlik olan yerde yutulur, dolayısıyla `ad: değer` yazımının tek
        // iki noktası bu daldan etkilenmez. İkinci bir ayraç yutulmaz: ORK-4
        // tek kademeli ad alanı tanımlar ve `A::B::C` bugün geçersizdir.
        if (ch === ":" && !adAlaniYutuldu && kaynak[i + 1] === ":"
            && i + 2 < kaynak.length && AD_BAS.test(kaynak[i + 2])) {
          ham += "::"; adAlaniYutuldu = true; ilerle(2); continue;
        }
        // nokta yalnızca ardından rakam gelirse yutulur (Karar D — madde kodu hiyerarşisi)
        if (ch === "." && noktaDerinligi < 2 && i + 1 < kaynak.length && RAKAM.test(kaynak[i + 1])) {
          ham += ch; noktaDerinligi += 1; ilerle(); continue;
        }
        break;
      }
      belirtecler.push({ tur: "ad", deger: ham, satir: bsSatir, sutun: bsSutun });
      continue;
    }

    // MDR-A02: üçlü tam — ne bulundu + neden sorun + nasıl düzeltilir (R4 kapanışı).
    throw new SozDizimHatasi(
      `Beklenmeyen karakter: "${c}" — bu karakter Sarmal söz diziminde hiçbir kurala bağlanamıyor. Yazım hatasıysa karakteri kaldır; metin değerinin parçasıysa değeri tırnak içine al.`,
      bsSatir, bsSutun,
      `Unexpected character: "${c}" — this character matches no Sarmal syntax rule. Remove it if it is a typo; if it is part of a text value, put the value in quotes.`,
    );
  }

  belirtecler.push({ tur: "dosyaSonu", deger: "", satir, sutun });
  return belirtecler;
}

/**
 * """ bloğunun ham içeriğini DIL-2.2'ye göre kırpar:
 *   • açılıştan hemen sonraki boş satır düşer (içerik alt satırda başlar)
 *   • ortak girinti, İLK içerik satırının girintisi kadar kırpılır
 *   • kapanış öncesi yalnız-boşluk son satır düşer
 */
/**
 * -->| bloğunun ham içeriğini DIL-2'ye göre kırpar:
 *   • açılıştan hemen sonraki boş satır düşer (içerik alt satırda başlar)
 *   • kapanış |<-- öncesi yalnız-boşluk son satır düşer
 *   • girinti KIRPILMAZ — şekiller/şemalar karakteri karakterine korunur (DIL-2.2)
 */
function blokKirp(ham: string): string {
  let satirlar = ham.split("\n");
  if (satirlar.length > 1 && satirlar[0].trim() === "") satirlar = satirlar.slice(1);
  if (satirlar.length > 0 && satirlar[satirlar.length - 1].trim() === "") satirlar = satirlar.slice(0, -1);
  return satirlar.join("\n");
}

function ucluKirp(ham: string): string {
  let satirlar = ham.split("\n");
  if (satirlar.length > 1 && satirlar[0].trim() === "") satirlar = satirlar.slice(1);
  if (satirlar.length > 1 && satirlar[satirlar.length - 1].trim() === "") satirlar = satirlar.slice(0, -1);
  const ilkDolu = satirlar.find((s) => s.trim() !== "");
  if (ilkDolu === undefined) return "";
  const girinti = /^[ \t]*/.exec(ilkDolu)![0];
  return satirlar
    .map((s) => (s.startsWith(girinti) ? s.slice(girinti.length) : s.replace(/^[ \t]+/, "")))
    .join("\n");
}

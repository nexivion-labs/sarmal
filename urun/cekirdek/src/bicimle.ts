// ═══════════════════════════════════════════════════════════════════════════
// bicimle.ts — Biçimlendirme ÇEKİRDEĞİ (saf metin — vscode'suz)
//
//   bicimlendir.ts'nin motoru. Ayrı dosyada: Node testinde koşulabilsin
//   (idempotenlik + anlam-koruma sınamaları · eklenti/sinama/bicimle.test.ts).
//   KORUMACI/güvenli:
//     • Girinti: süs/paren/köşe derinliğine göre 2 boşluk/kat (BÇ kuralı).
//     • Sağ boşluk kırpılır · ardışık boş satırlar 1'e iner · baş/son boş atılır.
//   DOKUNMADIĞI (bilerek — yoksa drift üretir):
//     • Yorumlar (// ve /* */) · string içi (çok satırlı "..." dâhil — KPS-SIR-A05)
//       · kullanıcının SÜTUN HİZALAMASI
//       (yalnız satır-başı girinti değişir; iç boşluk `kod:   ANA` korunur).
//   Belirteç (belirtec.ts) kurallarını birebir aynalar: string · // · /* */.
// ═══════════════════════════════════════════════════════════════════════════

/** Sarmal .sar biçim standardı: 1 kat = 2 boşluk (BÇ · dile ait, sabit). */
const GIRINTI = "  ";

/** Satır-sığdırma sınırı: bunu aşan parametre listeleri alt alta kırılır. */
const SATIR_SINIRI = 100;

/** İskeletin BAŞINDAKİ kapatıcı sayısı (`) ] }`) — yalnız satır başı dedent eder.
 *  Satır ORTASINDAKİ `)` (ör. `ne: "..." ) {`) girintiyi bozmaz → params hizalı kalır. */
function basKapaticiSay(isk: string): number {
  let n = 0;
  for (const c of isk.trimStart()) {
    if (c === ")" || c === "]" || c === "}") n++;
    else break;
  }
  return n;
}

/** Kaynağı satır-tabanlı, güvenli biçimlendir. */
export function bicimle(kaynak: string, eol: string): string {
  const satirlar = kaynak.split(/\r?\n/);
  const cikti: string[] = [];
  // KPS-SIR-A05: birinci geçişin DEĞER İÇİ bulduğu satırlar (belge bloğu, """ ve
  // çok satırlı "..." devamı) sonraki geçişlere bu dizi ile taşınır. Sığdırma ve
  // iki-nokta hizalama durumu kendileri yeniden kestirmez; satır tabanlı bir
  // kestirim çok satırlı düz dizginin devam satırını parametre sanıp boşluğunu
  // değiştirir ve değer sessizce bozulur (DIL-2.2).
  const koru: boolean[] = [];
  const ekle = (s: string, k: boolean): void => { cikti.push(s); koru.push(k); };
  let derinlik = 0;      // açık süs/paren/köşe sayısı
  let blokYorum = false; // /* ... */ içindeyiz
  let ucluDizgi = false; // """ ... """ içindeyiz (DIL-2.2 — içerik AYNEN korunur)
  let duzDizgi = false;  // çok satırlı "..." içindeyiz (KPS-SIR-A05 · DIL-2.2)
  let belgeBlok = false; // -->| ... |<-- içindeyiz (DIL-2 — şekil/MD AYNEN korunur, DIL-2.2)
  let bosKosusu = 0;     // ardışık boş satır sayacı

  for (const ham of satirlar) {
    // -->| belge bloğu (DIL-2): içerik HİÇ dokunulmaz — şekillerdeki [ ] { }
    // derinliği bozmasın, girinti/boş-satır kuralları MD'yi ezmesin (DIL-2.2).
    if (belgeBlok) {
      ekle(ham, true);
      bosKosusu = 0;
      if (ham.includes("|<--")) {
        belgeBlok = false;
        ekle("", false);           // kapanış sonrası NEFES: blok ile kod ayrışır
        bosKosusu = 1;
      }
      continue;
    }

    const bastaUclu = ucluDizgi;
    const bastaDuz = duzDizgi;
    const { iskelet, sonBlok, sonUclu, sonDuz, bastaYorum } = iskeleCikar(ham, blokYorum, ucluDizgi, duzDizgi);

    // Belge bloğu açılışı İSKELETTE aranır (girintiYapiFarklari ile aynı kural):
    // dizgi, """ ya da yorum içindeki `-->|` bir açılış değildir; ham satırda
    // aranırsa değer içeriği belge sanılır ve sayaç dosyanın geri kalanında kayar.
    const belgeAc = iskelet.indexOf("-->|");
    if (belgeAc !== -1 && iskelet.indexOf("|<--", belgeAc + 4) === -1) {
      if (cikti.length && cikti[cikti.length - 1] !== "") ekle("", false); // açılış öncesi nefes
      ekle(ham.replace(/[ \t]+$/, ""), true);
      bosKosusu = 0;
      belgeBlok = true;
      continue;
    }
    ucluDizgi = sonUclu;
    duzDizgi = sonDuz;

    // """ ya da "..." İÇİNDE başlayan satır → satırın kendisine HİÇ dokunma
    // (girinti/kırpma DEĞERİ bozar — DIL-2.2). Ama satır AYNI ANDA değeri kapatıp
    // ardından yapısal karakter taşıyorsa (ör. `... """ ) {`), iskeleCikar bunu
    // iskelete zaten doğru koymuştur — derinlik burada da güncellenmezse sayaç
    // kalıcı kayar.
    if (bastaUclu || bastaDuz) {
      ekle(ham, true);
      bosKosusu = 0;
      blokYorum = sonBlok;
      const { net } = koseSay(iskelet);
      derinlik = Math.max(0, derinlik + net);
      continue;
    }
    // Satır açık bir "..." ile BİTİYORSA sağdaki boşluk değerin parçasıdır, kırpılmaz.
    const kirpik = sonDuz ? ham.trimStart() : ham.trim();
    const { net } = koseSay(iskelet);
    const basKapatici = basKapaticiSay(iskelet);

    // Blok yorum İÇİNDE başlayan satır → DOKUNMA (yalnız sağ boşluk kırp).
    // Yorum içi ASCII çizim/hizalama korunur. Derinlik yine de güncellenir.
    if (bastaYorum) {
      ekle(sonDuz ? ham : ham.replace(/[ \t]+$/, ""), false);
      bosKosusu = 0;
      derinlik = Math.max(0, derinlik + net);
      blokYorum = sonBlok;
      continue;
    }

    // Boş satır → en çok 1 ardışık.
    if (kirpik === "") {
      bosKosusu++;
      if (bosKosusu <= 1) ekle("", false);
      blokYorum = sonBlok;
      continue;
    }
    bosKosusu = 0;

    // Yalnız satır BAŞINDAKİ kapatıcılar dedent eder (ortadaki `)` girintiyi bozmaz).
    const gosterim = Math.max(0, derinlik - basKapatici);
    ekle(GIRINTI.repeat(gosterim) + kirpik, false);
    derinlik = Math.max(0, derinlik + net);
    blokYorum = sonBlok;
  }

  // Baş ve son boş satırları at.
  while (cikti.length && cikti[0] === "" && !koru[0]) { cikti.shift(); koru.shift(); }
  while (cikti.length && cikti[cikti.length - 1] === "" && !koru[koru.length - 1]) { cikti.pop(); koru.pop(); }

  // 2. geçiş: SATIR_SINIRI'nı aşan parametre listelerini alt alta kır.
  const sigdirilmis: string[] = [];
  const sigdirKoru: boolean[] = [];
  for (let i = 0; i < cikti.length; i++) {
    const satir = cikti[i];
    // Birinci geçiş belge ve değer içeriğini bayt-birebir korur. İkinci geçiş de
    // aynı sınırı taşımak zorundadır; aksi hâlde uzun bir PromQL ya da tablo
    // satırı Sarmal parametresi sanılıp virgülden parçalanır.
    if (koru[i]) { sigdirilmis.push(satir); sigdirKoru.push(true); continue; }
    for (const p of satiriSigdir(satir)) { sigdirilmis.push(p); sigdirKoru.push(false); }
  }

  // 3. geçiş (YUZ-3 · VIT-K77-A04): iki-nokta hizalama — aynı girintideki ardışık
  // parametre satırlarında değerler tek hizada başlar.
  return ikiNoktaHizala(sigdirilmis, sigdirKoru).join(eol);
}

// ── yapısal girinti farkı (KPS-SIR-A02 · girinti-yapı-uyumsuz) ─────────────────
//    Biçimlendiricinin birinci geçişiyle AYNI durum makinesini koşar ve yalnız
//    YAPISAL satırların girintisini karşılaştırır: satır başında hiçbir `(` ya da
//    `[` açık değilse satırın kademesi yalnız süslü gövdelerden gelir ve
//    biçimlendirici onu `GIRINTI × derinlik` yazar. Parantez ya da köşe içindeki
//    devam satırları (hizalı `kabul: [` listeleri, parametre sütunları), belge
//    blokları, çok satırlı değerler, yorumlar ve boş satırlar SAYILMAZ; oralarda
//    biçimlendiricinin görüşü hizalama tercihidir, yapı bilgisi değildir.

/** Yapısal girintisi biçim kuralından sapan bir satır (satır bir tabanlı). */
export interface GirintiFarki { satir: number; beklenen: number; bulunan: number }

/** Kaynağın yapısal satırlarında biçimlendiricinin yazacağı girinti ile kaynağın
 *  girintisi arasındaki farklar (saf). Sekme karakteri de sapmadır: BÇ iki boşluktur. */
export function girintiYapiFarklari(kaynak: string): GirintiFarki[] {
  const farklar: GirintiFarki[] = [];
  const yigin: string[] = [];   // açık süs/paren/köşe sırası
  let blokYorum = false;
  let ucluDizgi = false;
  let duzDizgi = false;         // çok satırlı "..." (KPS-SIR-A05)
  let belgeBlok = false;
  const satirlar = kaynak.split(/\r?\n/);
  for (let i = 0; i < satirlar.length; i++) {
    const ham = satirlar[i];
    if (belgeBlok) { if (ham.includes("|<--")) belgeBlok = false; continue; }
    const bastaUclu = ucluDizgi;
    const bastaDuz = duzDizgi;
    const bastaYorum = blokYorum;
    const { iskelet, sonBlok, sonUclu, sonDuz } = iskeleCikar(ham, blokYorum, ucluDizgi, duzDizgi);
    // Belge bloğu açılışı İSKELETTE aranır (KPS-SIR-A02 · inceleme bulgusu): dizgi
    // ya da yorum içindeki `-->|` bir açılış değildir; ham satırda aranırsa gözlem
    // dosyanın geri kalanında susar.
    const belgeAc = iskelet.indexOf("-->|");
    if (belgeAc !== -1 && iskelet.indexOf("|<--", belgeAc + 4) === -1) { belgeBlok = true; continue; }
    ucluDizgi = sonUclu;
    duzDizgi = sonDuz;
    blokYorum = sonBlok;
    const kirpik = ham.trim();
    const yapisal = !bastaUclu && !bastaDuz && !bastaYorum && kirpik !== "" &&
      !kirpik.startsWith("//") && !kirpik.startsWith("/*") &&
      yigin.every((k) => k === "{");
    if (yapisal) {
      const beklenen = GIRINTI.length * Math.max(0, yigin.length - basKapaticiSay(iskelet));
      const girinti = ham.slice(0, ham.length - ham.trimStart().length);
      if (girinti !== " ".repeat(beklenen)) farklar.push({ satir: i + 1, beklenen, bulunan: girinti.length });
    }
    for (const c of iskelet) {
      if (c === "(" || c === "[" || c === "{") yigin.push(c);
      else if ((c === ")" || c === "]" || c === "}") && yigin.length) yigin.pop();
    }
  }
  return farklar;
}

// ── iki-nokta hizalama (YUZ-3 · VIT-K77-A04) ──────────────────────────────────
//    `anahtar: değer` satırları AYNI girintide ardışıksa, değerler en uzun
//    anahtara göre tek sütunda başlar (kanon okunabilirlik standardı). Yalnız
//    iki-nokta SONRASI boşluk değişir (anlam/AST birebir); """ içi, belge bloğu
//    (-->| |<--) ve // yorumlar DOKUNULMAZ. İdempotent: ikinci koşu aynı çıktı.
const PARAM_SATIRI = /^(\s*)([\p{L}_][\p{L}\p{N}_]*):\s+(\S.*)$/u;

function ikiNoktaHizala(satirlar: string[], koru: boolean[]): string[] {
  const out = [...satirlar];
  let grup: number[] = [];
  let grupGirinti = -1;

  const uygula = (): void => {
    if (grup.length >= 2) {
      const enUzun = Math.max(...grup.map((i) => out[i].match(PARAM_SATIRI)![2].length));
      for (const i of grup) {
        const m = out[i].match(PARAM_SATIRI)!;
        out[i] = m[1] + m[2] + ":" + " ".repeat(enUzun - m[2].length + 1) + m[3];
      }
    }
    grup = [];
    grupGirinti = -1;
  };

  for (let i = 0; i < out.length; i++) {
    const s = out[i];
    // Değer içi ya da belge satırı (birinci geçişin işareti) grubu keser.
    if (koru[i]) { uygula(); continue; }
    const m = s.match(PARAM_SATIRI);
    if (m && !s.trimStart().startsWith("//") && !s.includes('"""')) {
      if (grupGirinti !== -1 && grupGirinti !== m[1].length) uygula();
      grupGirinti = m[1].length;
      grup.push(i);
    } else {
      uygula();
    }
  }
  uygula();
  return out;
}

// ── satır-sığdırma (2026-07-02 · Founder: "sağa doğru uzamasın") ───────────────
// `Ad( a: x, b: y, … )` / `Ad( … ) {` kalıbındaki UZUN satırı parametre-başına-
// satır biçimine açar. GÜVENLİ sınırlar: yorum içeren, tek parametreli ya da
// kalıba uymayan satıra DOKUNULMAZ. String/parantez farkındalıklı tarama.
function satiriSigdir(satir: string): string[] {
  if (satir.length <= SATIR_SINIRI) return [satir];
  if (satir.includes('"""')) return [satir];   // çok-satırlı değer sınırı — dokunma (DIL-2.2)

  const es = /^(\s*)((?:[\p{L}_][\p{L}\p{N}_]*:\s+)?(?:cagir\s+)?[\p{L}_][\p{L}\p{N}_-]*)\(\s?(.*)$/u.exec(satir);
  if (!es) return [satir];
  const [, girinti, bas, kalan] = es;

  // Kapanış parantezini string-farkındalıklı bul (en dış seviye).
  let derinlik = 1;
  let i = 0;
  let dizgide = false;
  for (; i < kalan.length; i++) {
    const c = kalan[i];
    if (dizgide) { if (c === "\\") i++; else if (c === '"') dizgide = false; continue; }
    if (c === '"') { dizgide = true; continue; }
    if (c === "/" && kalan[i + 1] === "/") return [satir]; // yorumlu satır — dokunma
    if (c === "(" || c === "[" || c === "{") derinlik++;
    else if (c === ")" || c === "]" || c === "}") { derinlik--; if (derinlik === 0) break; }
  }
  if (derinlik !== 0) return [satir];               // kapanış bu satırda değil — dokunma
  const ic = kalan.slice(0, i).trim();
  const kuyruk = kalan.slice(i + 1).trimEnd();      // ")" sonrası: "" · " {" · ","
  if (!/^( \{|,|)$/.test(kuyruk.trimStart() === "" ? kuyruk : " " + kuyruk.trim())) return [satir];

  // En dış virgüllerden parçala (string + iç parantez korumalı).
  const parcalar: string[] = [];
  let parca = "";
  derinlik = 0;
  dizgide = false;
  for (let k = 0; k < ic.length; k++) {
    const c = ic[k];
    if (dizgide) { parca += c; if (c === "\\") { parca += ic[++k] ?? ""; } else if (c === '"') dizgide = false; continue; }
    if (c === '"') { dizgide = true; parca += c; continue; }
    if (c === "(" || c === "[" || c === "{") derinlik++;
    else if (c === ")" || c === "]" || c === "}") derinlik--;
    if (c === "," && derinlik === 0) { parcalar.push(parca.trim()); parca = ""; continue; }
    parca += c;
  }
  if (parca.trim()) parcalar.push(parca.trim());
  if (parcalar.length < 2) return [satir];          // tek parametre — kırmak fayda etmez

  const alt = girinti + GIRINTI;
  return [
    `${girinti}${bas}(`,
    ...parcalar.map((p) => `${alt}${p},`),
    `${girinti})${kuyruk ? kuyruk : ""}`,
  ];
}

/**
 * Bir satırın "iskeletini" çıkarır: string ve yorumlar SİLİNİR, yalnız yapısal
 * parantezler kalır. Böylece "http://" ya da "{ }" içeren dizgiler köşe saymaz.
 * @param blokBaşta satır bir /* ... blok yorumunun İÇİNDE mi başlıyor
 */
function iskeleCikar(
  satir: string,
  blokBasta: boolean,
  ucluBasta = false,
  duzBasta = false,
): { iskelet: string; sonBlok: boolean; sonUclu: boolean; sonDuz: boolean; bastaYorum: boolean } {
  let out = "";
  let i = 0;
  let blok = blokBasta;
  let uclu = ucluBasta;
  let duz = duzBasta;

  while (i < satir.length) {
    const c = satir[i];
    const n = satir[i + 1];

    // "..." düz dizgi (KPS-SIR-A05 · DIL-2.2): belirteç düz dizgiyi satır sonunda
    // KESMEZ, kapanış tırnağına kadar okur. Tırnak bu satırda kapanmazsa durum
    // alt satıra taşınır; aksi hâlde devam satırı yapısal sanılır, girintisi
    // yeniden yazılır ve içindeki { [ ( derinlik sayacını kaydırır.
    if (duz) {
      if (c === "\\") { i += 2; continue; }   // \" \\ \n ve satır sonu kaçışı
      if (c === '"') duz = false;
      i++;
      continue;
    }

    // """ çok-satırlı değer (DIL-2.2): içerik iskelete GİRMEZ (köşe saymaz).
    if (uclu) {
      if (c === '"' && n === '"' && satir[i + 2] === '"') { uclu = false; i += 3; continue; }
      i++;
      continue;
    }
    if (blok) {
      if (c === "*" && n === "/") { blok = false; i += 2; continue; }
      i++;
      continue;
    }
    if (c === '"' && n === '"' && satir[i + 2] === '"') { uclu = true; i += 3; continue; }
    // dizgi "..." açılışı — içerik yukarıdaki düz dizgi dalında tüketilir.
    if (c === '"') { duz = true; i++; continue; }
    // satır yorumu // → satır sonuna kadar yok say
    if (c === "/" && n === "/") break;
    // blok yorum aç /*
    if (c === "/" && n === "*") { blok = true; i += 2; continue; }

    out += c;
    i++;
  }

  return { iskelet: out, sonBlok: blok, sonUclu: uclu, sonDuz: duz, bastaYorum: blokBasta };
}

/** İskeletteki parantezlerden {min: en düşük ön-toplam, net: toplam değişim}. */
function koseSay(s: string): { min: number; net: number } {
  let kosu = 0;
  let min = 0;
  for (const ch of s) {
    if (ch === "(" || ch === "[" || ch === "{") kosu++;
    else if (ch === ")" || ch === "]" || ch === "}") kosu--;
    if (kosu < min) min = kosu;
  }
  return { min, net: kosu };
}

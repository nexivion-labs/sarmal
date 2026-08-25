// ═══════════════════════════════════════════════════════════════════════════
// bicimle.ts — Biçimlendirme ÇEKİRDEĞİ (saf metin — vscode'suz)
//
//   bicimlendir.ts'nin motoru. Ayrı dosyada: Node testinde koşulabilsin
//   (idempotenlik + anlam-koruma sınamaları · eklenti/sinama/bicimle.test.ts).
//   KORUMACI/güvenli:
//     • Girinti: süs/paren/köşe derinliğine göre 2 boşluk/kat (BÇ kuralı).
//     • Sağ boşluk kırpılır · ardışık boş satırlar 1'e iner · baş/son boş atılır.
//   DOKUNMADIĞI (bilerek — yoksa drift üretir):
//     • Yorumlar (// ve /* */) · string içi · kullanıcının SÜTUN HİZALAMASI
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
  let derinlik = 0;      // açık süs/paren/köşe sayısı
  let blokYorum = false; // /* ... */ içindeyiz
  let ucluDizgi = false; // """ ... """ içindeyiz (DIL-2.2 — içerik AYNEN korunur)
  let belgeBlok = false; // -->| ... |<-- içindeyiz (DIL-2 — şekil/MD AYNEN korunur, DIL-2.2)
  let bosKosusu = 0;     // ardışık boş satır sayacı

  for (const ham of satirlar) {
    // -->| belge bloğu (DIL-2): içerik HİÇ dokunulmaz — şekillerdeki [ ] { }
    // derinliği bozmasın, girinti/boş-satır kuralları MD'yi ezmesin (DIL-2.2).
    if (belgeBlok) {
      cikti.push(ham);
      bosKosusu = 0;
      if (ham.includes("|<--")) {
        belgeBlok = false;
        cikti.push("");            // kapanış sonrası NEFES: blok ile kod ayrışır
        bosKosusu = 1;
      }
      continue;
    }
    const belgeAc = ham.indexOf("-->|");
    if (belgeAc !== -1 && ham.indexOf("|<--", belgeAc + 4) === -1) {
      if (cikti.length && cikti[cikti.length - 1] !== "") cikti.push(""); // açılış öncesi nefes
      cikti.push(ham.replace(/[ \t]+$/, ""));
      bosKosusu = 0;
      belgeBlok = true;
      continue;
    }

    const bastaUclu = ucluDizgi;
    const { iskelet, sonBlok, sonUclu, bastaYorum } = iskeleCikar(ham, blokYorum, ucluDizgi);
    ucluDizgi = sonUclu;

    // """ İÇİNDE başlayan satır → satırın kendisine HİÇ dokunma (girinti/kırpma
    // DEĞERİ bozar — DIL-2.2). Ama satır AYNI ANDA """ı kapatıp ardından yapısal
    // karakter taşıyorsa (ör. `... """ ) {`), iskeleCikar bunu iskelete zaten
    // doğru koymuştur — derinlik burada da güncellenmezse sayaç kalıcı kayar.
    if (bastaUclu) {
      cikti.push(ham);
      bosKosusu = 0;
      blokYorum = sonBlok;
      const { net } = koseSay(iskelet);
      derinlik = Math.max(0, derinlik + net);
      continue;
    }
    const kirpik = ham.trim();
    const { net } = koseSay(iskelet);
    const basKapatici = basKapaticiSay(iskelet);

    // Blok yorum İÇİNDE başlayan satır → DOKUNMA (yalnız sağ boşluk kırp).
    // Yorum içi ASCII çizim/hizalama korunur. Derinlik yine de güncellenir.
    if (bastaYorum) {
      cikti.push(ham.replace(/[ \t]+$/, ""));
      bosKosusu = 0;
      derinlik = Math.max(0, derinlik + net);
      blokYorum = sonBlok;
      continue;
    }

    // Boş satır → en çok 1 ardışık.
    if (kirpik === "") {
      bosKosusu++;
      if (bosKosusu <= 1) cikti.push("");
      blokYorum = sonBlok;
      continue;
    }
    bosKosusu = 0;

    // Yalnız satır BAŞINDAKİ kapatıcılar dedent eder (ortadaki `)` girintiyi bozmaz).
    const gosterim = Math.max(0, derinlik - basKapatici);
    cikti.push(GIRINTI.repeat(gosterim) + kirpik);
    derinlik = Math.max(0, derinlik + net);
    blokYorum = sonBlok;
  }

  // Baş ve son boş satırları at.
  while (cikti.length && cikti[0] === "") cikti.shift();
  while (cikti.length && cikti[cikti.length - 1] === "") cikti.pop();

  // 2. geçiş: SATIR_SINIRI'nı aşan parametre listelerini alt alta kır.
  const sigdirilmis: string[] = [];
  let sigdirBelge = false;
  let sigdirUclu = false;
  for (const satir of cikti) {
    // Birinci geçiş belge ve üç-tırnak içeriğini bayt-birebir korur. İkinci
    // geçiş de aynı sınırı taşımak zorundadır; aksi hâlde uzun bir PromQL ya da
    // tablo satırı Sarmal parametresi sanılıp virgülden parçalanır.
    if (sigdirBelge) {
      sigdirilmis.push(satir);
      if (satir.includes("|<--")) sigdirBelge = false;
      continue;
    }
    if (satir.includes("-->|")) {
      sigdirilmis.push(satir);
      if (!satir.includes("|<--")) sigdirBelge = true;
      continue;
    }
    const ucluAdet = (satir.match(/"""/g) ?? []).length;
    if (sigdirUclu || ucluAdet > 0) {
      sigdirilmis.push(satir);
      if (ucluAdet % 2 === 1) sigdirUclu = !sigdirUclu;
      continue;
    }
    sigdirilmis.push(...satiriSigdir(satir));
  }

  // 3. geçiş (YUZ-3 · VIT-K77-A04): iki-nokta hizalama — aynı girintideki ardışık
  // parametre satırlarında değerler tek hizada başlar.
  return ikiNoktaHizala(sigdirilmis).join(eol);
}

// ── iki-nokta hizalama (YUZ-3 · VIT-K77-A04) ──────────────────────────────────
//    `anahtar: değer` satırları AYNI girintide ardışıksa, değerler en uzun
//    anahtara göre tek sütunda başlar (kanon okunabilirlik standardı). Yalnız
//    iki-nokta SONRASI boşluk değişir (anlam/AST birebir); """ içi, belge bloğu
//    (-->| |<--) ve // yorumlar DOKUNULMAZ. İdempotent: ikinci koşu aynı çıktı.
const PARAM_SATIRI = /^(\s*)([\p{L}_][\p{L}\p{N}_]*):\s+(\S.*)$/u;

function ikiNoktaHizala(satirlar: string[]): string[] {
  const out = [...satirlar];
  let uclu = false;    // """ içi
  let belge = false;   // -->| ... |<-- içi
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
    if (belge) { uygula(); if (s.includes("|<--")) belge = false; continue; }
    if (s.includes("-->|") && !s.includes("|<--")) { uygula(); belge = true; continue; }
    const ucluAdet = (s.match(/"""/g) ?? []).length;
    if (uclu) { uygula(); if (ucluAdet % 2 === 1) uclu = false; continue; }
    const m = s.match(PARAM_SATIRI);
    if (m && !s.trimStart().startsWith("//") && ucluAdet === 0) {
      if (grupGirinti !== -1 && grupGirinti !== m[1].length) uygula();
      grupGirinti = m[1].length;
      grup.push(i);
    } else {
      uygula();
      if (ucluAdet % 2 === 1) uclu = true;   // çok-satırlı değer açıldı — içi korunur
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
): { iskelet: string; sonBlok: boolean; sonUclu: boolean; bastaYorum: boolean } {
  let out = "";
  let i = 0;
  let blok = blokBasta;
  let uclu = ucluBasta;

  while (i < satir.length) {
    const c = satir[i];
    const n = satir[i + 1];

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
    // dizgi "..."  (\" ve \\ kaçışları atlanır)
    if (c === '"') {
      i++;
      while (i < satir.length && satir[i] !== '"') {
        i += satir[i] === "\\" ? 2 : 1;
      }
      i++; // kapanış tırnağı (yoksa i taşar, döngü biter)
      continue;
    }
    // satır yorumu // → satır sonuna kadar yok say
    if (c === "/" && n === "/") break;
    // blok yorum aç /*
    if (c === "/" && n === "*") { blok = true; i += 2; continue; }

    out += c;
    i++;
  }

  return { iskelet: out, sonBlok: blok, sonUclu: uclu, bastaYorum: blokBasta };
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

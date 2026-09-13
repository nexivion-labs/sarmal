// ═══════════════════════════════════════════════════════════════════════════
// yazitipi-uret.mjs — Durum çubuğu SİMGE YAZI TİPİ üreticisi (VIT-KIMLIK-A07)
//
//   Amaç:   Founder şerhi 2026-09-13: Sarmal'ın kendi simge ailesi görsel
//           taşıyabilen her yüzeyde görünür ve durum çubuğu da bu yüzeylerden
//           biridir. VS Code durum çubuğunda simgeyi YALNIZ `$(kimlik)`
//           sözdizimiyle çizer ve kimlik bir yazı tipindeki glife bakar; SVG
//           kabul etmez. Eklenti kendi glifini `contributes.icons` ilanıyla
//           tanıtabilir. Bu üretici ailenin currentColor konturlu SVG'lerini
//           derleme anında bir WOFF yazı tipine çevirir; durum çubuğu böylece
//           hazır codicon'a ya da emojiye düşmeden ailenin kendi çizimini basar.
//   Girdi:  package.json `contributes.icons` — hangi simgenin hangi kod
//           noktasında yaşadığını söyleyen TEK ilan. Kimlik `sarmal-<raf adı>`
//           biçimindedir ve kaynağı doğrudan adlandırır: `sarmal-panel-onaylar`
//           glifinin kaynağı `medya/simgeler/panel-onaylar.svg` dosyasıdır.
//           İkinci bir eşleme çizelgesi yoktur, dolayısıyla ayrışamaz.
//   Çıktı:  medya/simgeler/uretilmis/sarmal-simge.woff (build'de doğar,
//           depoda izlenmez; .vscodeignore onu pakete dahil eder).
//   Bağımlılık: YOK. Yalnız Node'un kendi modülleri (fs, path, url, zlib)
//           kullanılır; çalışma anına da geliştirme ağacına da paket eklenmez.
//
//   KONTURDAN DOLGUYA. Aile kontur ile çizilmiştir (dolgusuz gövde, 1.7 birim
//   kalınlık, yuvarlatılmış uç ve birleşim); bir yazı tipi glifi ise yalnız
//   DOLU alan tanır. Üretici her çizgiyi, kalınlığın yarısı yarıçaplı bir
//   kapsüle çevirir: her doğru parçası bir dikdörtgen, her köşe ve uç bir
//   daire olur. Bu tam olarak "stroke-linecap/linejoin: round" tanımıdır.
//   Parçalar aynı yönde döner ve TrueType'ın sıfırdan-farklı dolgu kuralı
//   onları birleşim olarak boyar. Çember ve dikdörtgen öğeleri ise halka
//   olarak (dış kontur dolu, iç kontur ters yönde delik) üretilir.
//
//   BELİRLENİMCİLİK. Tarih alanları sıfırdır, tablo sırası sabittir ve glif
//   sırası kod noktasına göredir; aynı girdi aynı baytları üretir. Nöbet
//   (simge-cizelgesi.test.ts) üreticiyi bellekte yeniden koşturup diskteki
//   dosyayla bayt bayt karşılaştırır.
//
//   Çalıştıran: npm run build / test / vscode:prepublish (simge-uret.mjs'den sonra).
// ═══════════════════════════════════════════════════════════════════════════
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { deflateSync } from "node:zlib";

/** Yazı tipinin eklenti köküne göreli yeri — package.json `fontPath` ile birebir. */
export const YAZI_TIPI_YOLU = "medya/simgeler/uretilmis/sarmal-simge.woff";
/** Katkı kimliklerinin öneki; kimliğin geri kalanı raftaki dosyanın adıdır. */
export const KIMLIK_ONEKI = "sarmal-";
/** Ailenin kaynak rafı (simge-cizelgesi.ts SIMGE_RAFI ile aynı). */
export const SIMGE_RAFI = "medya/simgeler";

export const VARSAYILAN = {
  KOK: fileURLToPath(new URL("..", import.meta.url)),
  PAKET: fileURLToPath(new URL("../package.json", import.meta.url)),
};

// ── ÖLÇÜ ─────────────────────────────────────────────────────────────────────
/** Ailenin kutusu yirmi dört birimdir; bir SVG birimi yüz yazı tipi birimidir. */
const KUTU = 24;
const BIRIM = 100;
/** Em karesi — kutunun tamamı. Glif tabandan tepeye kadar em'i doldurur
 *  (codicon yazı tipinin düzeni: çıkıntı em'e eşit, iniş sıfır). */
export const EM = KUTU * BIRIM;
/** head tablosunun tarih alanları: 2026-09-13 00:00 UTC, 1904-01-01'den saniye. */
const SABIT_TARIH = 3872102400;

/** Ailenin çizim ölçüsü — kök öğede birebir aranır; ayrılan kaynak sessiz
 *  geçilmez, üretim düşer (simge-uret.mjs'nin currentColor nöbetiyle aynı ruh). */
const AILE_OLCUSU = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": "1.7",
  "stroke-linecap": "round",
  "stroke-linejoin": "round",
};
const YARI_KALINLIK = 1.7 / 2;
/** Eğrilerin düzleştirilmesi: kübik ve karesel eğri on altı parçaya, yay
 *  on bir buçuk derecelik dilimlere bölünür; on altı pikselde sapma görünmez. */
const EGRI_PARCA = 16;
const YAY_DILIM = Math.PI / 16;

// ── İLAN OKUMA ──────────────────────────────────────────────────────────────

/**
 * package.json `contributes.icons` ilanını okur ve her simge için kaynak SVG
 * yolunu ile kod noktasını döndürür. İlan kuralları burada denetlenir; kural
 * dışı ilan yüksek sesle reddedilir.
 */
export function simgeIlanlari(paket) {
  const ilan = paket?.contributes?.icons ?? {};
  const kodlar = new Set();
  const liste = Object.entries(ilan).map(([kimlik, tanim]) => {
    if (!kimlik.startsWith(KIMLIK_ONEKI)) {
      throw new Error(`yazitipi-uret: "${kimlik}" kimliği "${KIMLIK_ONEKI}" önekini taşımıyor.`);
    }
    const yol = tanim?.default?.fontPath;
    if (yol !== `./${YAZI_TIPI_YOLU}`) {
      throw new Error(`yazitipi-uret: "${kimlik}" ilanının fontPath değeri "${yol}", beklenen "./${YAZI_TIPI_YOLU}".`);
    }
    const eslesme = /^\\([0-9A-Fa-f]{4})$/.exec(tanim.default.fontCharacter ?? "");
    if (!eslesme) {
      throw new Error(`yazitipi-uret: "${kimlik}" ilanının fontCharacter değeri \\XXXX biçiminde değil.`);
    }
    const kod = parseInt(eslesme[1], 16);
    if (kod < 0xe000 || kod > 0xf8ff) {
      throw new Error(`yazitipi-uret: "${kimlik}" kod noktası özel kullanım alanının (E000–F8FF) dışında.`);
    }
    if (kodlar.has(kod)) throw new Error(`yazitipi-uret: ${eslesme[1]} kod noktası iki simgeye verilmiş.`);
    kodlar.add(kod);
    return { kimlik, kaynak: `${SIMGE_RAFI}/${kimlik.slice(KIMLIK_ONEKI.length)}.svg`, kod };
  });
  if (liste.length === 0) throw new Error("yazitipi-uret: package.json contributes.icons boş; üretilecek simge yok.");
  return liste.sort((a, b) => a.kod - b.kod);
}

// ── SVG OKUMA ───────────────────────────────────────────────────────────────

function nitelikler(ham) {
  const n = {};
  for (const m of ham.matchAll(/([A-Za-z:-]+)="([^"]*)"/g)) n[m[1]] = m[2];
  return n;
}

function sayiOku(deger, ad, nitelik) {
  const v = Number(deger);
  if (deger === undefined || deger === "" || !Number.isFinite(v)) {
    throw new Error(`yazitipi-uret: ${ad} içinde ${nitelik} sayı değil ("${deger}").`);
  }
  return v;
}

/** Bir aile SVG'sini şekil listesine çevirir: çember, dikdörtgen ve yol. */
export function svgSekilleri(svg, ad = "svg") {
  const temiz = svg.replace(/<!--[\s\S]*?-->/g, "");
  const kok = /<svg\b([^>]*)>/.exec(temiz);
  if (!kok) throw new Error(`yazitipi-uret: ${ad} bir svg öğesi taşımıyor.`);
  const kn = nitelikler(kok[1]);
  for (const [k, v] of Object.entries(AILE_OLCUSU)) {
    if (kn[k] !== v) {
      throw new Error(`yazitipi-uret: ${ad} ailenin çizim ölçüsünden ayrılıyor: ${k}="${kn[k] ?? ""}", beklenen "${v}".`);
    }
  }
  const govde = temiz.slice(kok.index + kok[0].length, temiz.lastIndexOf("</svg>"));
  const sekiller = [];
  for (const m of govde.matchAll(/<([A-Za-z]+)\b([^>]*?)\/?>/g)) {
    const [, etiket, ham] = m;
    const n = nitelikler(ham);
    for (const yasak of ["transform", "stroke-width", "stroke-linecap", "stroke-linejoin", "stroke-dasharray", "opacity"]) {
      if (n[yasak] !== undefined) throw new Error(`yazitipi-uret: ${ad} içindeki <${etiket}> öğesi ${yasak} taşıyor; aile ölçüsü yalnız kökte yaşar.`);
    }
    if (n.fill !== undefined && n.fill !== "none") {
      throw new Error(`yazitipi-uret: ${ad} içindeki <${etiket}> dolgu taşıyor; aile dolgusuzdur.`);
    }
    if (etiket === "circle") {
      sekiller.push({ tur: "cember", cx: sayiOku(n.cx, ad, "cx"), cy: sayiOku(n.cy, ad, "cy"), r: sayiOku(n.r, ad, "r") });
    } else if (etiket === "rect") {
      const rx = n.rx ?? n.ry ?? "0";
      if (n.rx !== undefined && n.ry !== undefined && n.rx !== n.ry) {
        throw new Error(`yazitipi-uret: ${ad} içindeki dikdörtgenin rx ile ry değeri farklı; aile eşit köşe kullanır.`);
      }
      sekiller.push({
        tur: "dikdortgen",
        x: sayiOku(n.x ?? "0", ad, "x"), y: sayiOku(n.y ?? "0", ad, "y"),
        w: sayiOku(n.width, ad, "width"), h: sayiOku(n.height, ad, "height"), rx: sayiOku(rx, ad, "rx"),
      });
    } else if (etiket === "path") {
      sekiller.push({ tur: "yol", d: n.d ?? "" });
    } else {
      throw new Error(`yazitipi-uret: ${ad} içinde desteklenmeyen <${etiket}> öğesi var; aile yalnız circle, rect ve path kullanır.`);
    }
  }
  return sekiller;
}

// ── YOL AYRIŞTIRMA VE DÜZLEŞTİRME ──────────────────────────────────────────

function kubik(p0, p1, p2, p3) {
  const cikti = [];
  for (let i = 1; i <= EGRI_PARCA; i++) {
    const t = i / EGRI_PARCA, u = 1 - t;
    cikti.push([
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ]);
  }
  return cikti;
}

function karesel(p0, p1, p2) {
  const cikti = [];
  for (let i = 1; i <= EGRI_PARCA; i++) {
    const t = i / EGRI_PARCA, u = 1 - t;
    cikti.push([
      u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
      u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1],
    ]);
  }
  return cikti;
}

/** SVG yay komutunu (uç nokta biçimi) merkez biçimine çevirip düzleştirir
 *  (SVG 1.1 Ek F.6.5). Başlangıç noktası dönüşe dahil değildir. */
function yay(x1, y1, rxHam, ryHam, aciDerece, buyuk, yon, x2, y2) {
  if (x1 === x2 && y1 === y2) return [];
  let rx = Math.abs(rxHam), ry = Math.abs(ryHam);
  if (rx === 0 || ry === 0) return [[x2, y2]];
  const phi = (aciDerece * Math.PI) / 180;
  const cos = Math.cos(phi), sin = Math.sin(phi);
  const dx2 = (x1 - x2) / 2, dy2 = (y1 - y2) / 2;
  const x1p = cos * dx2 + sin * dy2;
  const y1p = -sin * dx2 + cos * dy2;
  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lambda > 1) { rx *= Math.sqrt(lambda); ry *= Math.sqrt(lambda); }
  const pay = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const payda = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  const kat = (buyuk !== yon ? 1 : -1) * Math.sqrt(Math.max(0, pay / payda));
  const cxp = (kat * rx * y1p) / ry;
  const cyp = (-kat * ry * x1p) / rx;
  const cx = cos * cxp - sin * cyp + (x1 + x2) / 2;
  const cy = sin * cxp + cos * cyp + (y1 + y2) / 2;
  const aci = (ux, uy, vx, vy) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  const t1 = aci(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let dt = aci((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!yon && dt > 0) dt -= 2 * Math.PI;
  else if (yon && dt < 0) dt += 2 * Math.PI;
  const n = Math.max(2, Math.ceil(Math.abs(dt) / YAY_DILIM));
  const cikti = [];
  for (let k = 1; k < n; k++) {
    const t = t1 + (dt * k) / n;
    cikti.push([
      cos * rx * Math.cos(t) - sin * ry * Math.sin(t) + cx,
      sin * rx * Math.cos(t) + cos * ry * Math.sin(t) + cy,
    ]);
  }
  cikti.push([x2, y2]);
  return cikti;
}

/**
 * Yol verisini alt yollara ayırır; her alt yol düzleştirilmiş nokta dizisi ve
 * kapalılık bilgisi taşır. Desteklenen komutlar SVG'nin tamamıdır
 * (M L H V C S Q T A Z, büyük ve küçük harf).
 */
export function yolAltlari(d, ad = "svg") {
  const belirtecler = d.match(/[MmLlHhVvCcSsQqTtAaZz]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g) ?? [];
  let i = 0;
  const komutMu = (t) => /^[A-Za-z]$/.test(t);
  const sayi = () => {
    const t = belirtecler[i++];
    if (t === undefined || komutMu(t)) throw new Error(`yazitipi-uret: ${ad} yol verisinde eksik sayı.`);
    return Number(t);
  };
  const bayrak = () => {
    const v = sayi();
    if (v !== 0 && v !== 1) throw new Error(`yazitipi-uret: ${ad} yay bayrağı 0 ya da 1 değil.`);
    return v === 1;
  };
  const altlar = [];
  let alt = null;
  let x = 0, y = 0, bx = 0, by = 0;
  let sonKubik = null, sonKaresel = null;
  let komut = null;
  const ekle = (noktalar) => {
    if (!alt || alt.kapali) {
      alt = { noktalar: [[x, y]], kapali: false, ciz: false };
      altlar.push(alt);
    }
    for (const p of noktalar) alt.noktalar.push(p);
    alt.ciz = true;
  };
  while (i < belirtecler.length) {
    if (komutMu(belirtecler[i])) komut = belirtecler[i++];
    else if (!komut) throw new Error(`yazitipi-uret: ${ad} yol verisi komutsuz başlıyor.`);
    const goreli = komut === komut.toLowerCase();
    const ox = goreli ? x : 0, oy = goreli ? y : 0;
    const K = komut.toUpperCase();
    let kubikKontrol = null, kareselKontrol = null;
    switch (K) {
      case "M": {
        x = sayi() + ox; y = sayi() + oy; bx = x; by = y;
        alt = { noktalar: [[x, y]], kapali: false, ciz: false };
        altlar.push(alt);
        komut = goreli ? "l" : "L";
        break;
      }
      case "L": { const nx = sayi() + ox, ny = sayi() + oy; ekle([[nx, ny]]); x = nx; y = ny; break; }
      case "H": { const nx = sayi() + ox; ekle([[nx, y]]); x = nx; break; }
      case "V": { const ny = sayi() + oy; ekle([[x, ny]]); y = ny; break; }
      case "C": {
        const p1 = [sayi() + ox, sayi() + oy], p2 = [sayi() + ox, sayi() + oy], p3 = [sayi() + ox, sayi() + oy];
        ekle(kubik([x, y], p1, p2, p3)); kubikKontrol = p2; [x, y] = p3; break;
      }
      case "S": {
        const p1 = sonKubik ? [2 * x - sonKubik[0], 2 * y - sonKubik[1]] : [x, y];
        const p2 = [sayi() + ox, sayi() + oy], p3 = [sayi() + ox, sayi() + oy];
        ekle(kubik([x, y], p1, p2, p3)); kubikKontrol = p2; [x, y] = p3; break;
      }
      case "Q": {
        const p1 = [sayi() + ox, sayi() + oy], p2 = [sayi() + ox, sayi() + oy];
        ekle(karesel([x, y], p1, p2)); kareselKontrol = p1; [x, y] = p2; break;
      }
      case "T": {
        const p1 = sonKaresel ? [2 * x - sonKaresel[0], 2 * y - sonKaresel[1]] : [x, y];
        const p2 = [sayi() + ox, sayi() + oy];
        ekle(karesel([x, y], p1, p2)); kareselKontrol = p1; [x, y] = p2; break;
      }
      case "A": {
        const rx = sayi(), ry = sayi(), aci = sayi(), buyuk = bayrak(), yon = bayrak();
        const nx = sayi() + ox, ny = sayi() + oy;
        ekle(yay(x, y, rx, ry, aci, buyuk, yon, nx, ny)); x = nx; y = ny; break;
      }
      case "Z": {
        if (alt) alt.kapali = true;
        x = bx; y = by;
        break;
      }
      default:
        throw new Error(`yazitipi-uret: ${ad} yol verisinde bilinmeyen komut ${komut}.`);
    }
    sonKubik = kubikKontrol;
    sonKaresel = kareselKontrol;
  }
  return altlar;
}

// ── KONTURDAN DOLGUYA ───────────────────────────────────────────────────────
//    Nokta biçimi: { x, y, on } — `on` eğri üstü nokta, değilse karesel denetim
//    noktası (TrueType glifi karesel eğri kullanır).

/** Merkez çevresinde a0'dan a1'e yay: 45 dereceyi aşmayan karesel dilimler.
 *  Çıktı başlangıç ve bitiş eğri üstü noktalarını da içerir. */
function yayNoktalari(cx, cy, r, a0, a1) {
  const dilim = Math.max(1, Math.ceil(Math.abs(a1 - a0) / (Math.PI / 4) - 1e-9));
  const adim = (a1 - a0) / dilim;
  const denetim = r / Math.cos(adim / 2);
  const cikti = [{ x: cx + r * Math.cos(a0), y: cy + r * Math.sin(a0), on: true }];
  for (let k = 0; k < dilim; k++) {
    const orta = a0 + adim * (k + 0.5), son = a0 + adim * (k + 1);
    cikti.push({ x: cx + denetim * Math.cos(orta), y: cy + denetim * Math.sin(orta), on: false });
    cikti.push({ x: cx + r * Math.cos(son), y: cy + r * Math.sin(son), on: true });
  }
  return cikti;
}

function daire(cx, cy, r) {
  const noktalar = yayNoktalari(cx, cy, r, 0, 2 * Math.PI);
  noktalar.pop();   // son nokta ilk noktanın kendisidir
  return noktalar;
}

function yuvarlakDikdortgen(x0, y0, x1, y1, r) {
  if (r <= 0) {
    return [{ x: x0, y: y0, on: true }, { x: x1, y: y0, on: true }, { x: x1, y: y1, on: true }, { x: x0, y: y1, on: true }];
  }
  const P = Math.PI;
  return [
    ...yayNoktalari(x1 - r, y0 + r, r, -P / 2, 0),
    ...yayNoktalari(x1 - r, y1 - r, r, 0, P / 2),
    ...yayNoktalari(x0 + r, y1 - r, r, P / 2, P),
    ...yayNoktalari(x0 + r, y0 + r, r, P, (3 * P) / 2),
  ];
}

/** Bir şeklin kontur çizgisini dolu alanlara çevirir. Dönüş: { dolu, delik }
 *  kontur listeleri (SVG birimiyle). */
function sekilDolgusu(sekil, ad) {
  const h = YARI_KALINLIK;
  if (sekil.tur === "cember") {
    const dolu = [daire(sekil.cx, sekil.cy, sekil.r + h)];
    const delik = sekil.r - h > 0 ? [daire(sekil.cx, sekil.cy, sekil.r - h)] : [];
    return { dolu, delik };
  }
  if (sekil.tur === "dikdortgen") {
    const { x, y, w, h: yuk, rx } = sekil;
    const r = Math.min(rx, w / 2, yuk / 2);
    const dolu = [yuvarlakDikdortgen(x - h, y - h, x + w + h, y + yuk + h, r + h)];
    const delik = w > 2 * h && yuk > 2 * h
      ? [yuvarlakDikdortgen(x + h, y + h, x + w - h, y + yuk - h, Math.max(0, r - h))]
      : [];
    return { dolu, delik };
  }
  const dolu = [];
  for (const alt of yolAltlari(sekil.d, ad)) {
    if (!alt.ciz) continue;
    const noktalar = [];
    for (const p of alt.noktalar) {
      const son = noktalar[noktalar.length - 1];
      if (!son || Math.hypot(p[0] - son[0], p[1] - son[1]) > 1e-9) noktalar.push(p);
    }
    if (alt.kapali && noktalar.length > 1) {
      const [ilk, son] = [noktalar[0], noktalar[noktalar.length - 1]];
      if (Math.hypot(ilk[0] - son[0], ilk[1] - son[1]) <= 1e-9) noktalar.pop();
    }
    const parcalar = [];
    for (let k = 0; k + 1 < noktalar.length; k++) parcalar.push([noktalar[k], noktalar[k + 1]]);
    if (alt.kapali && noktalar.length > 2) parcalar.push([noktalar[noktalar.length - 1], noktalar[0]]);
    for (const [p, q] of parcalar) {
      const dx = q[0] - p[0], dy = q[1] - p[1];
      const boy = Math.hypot(dx, dy);
      const nx = (-dy / boy) * h, ny = (dx / boy) * h;
      dolu.push([
        { x: p[0] + nx, y: p[1] + ny, on: true }, { x: q[0] + nx, y: q[1] + ny, on: true },
        { x: q[0] - nx, y: q[1] - ny, on: true }, { x: p[0] - nx, y: p[1] - ny, on: true },
      ]);
    }
    // Yuvarlatılmış birleşim ve uç: her köşede yarım kalınlık yarıçaplı daire.
    for (const p of noktalar) dolu.push(daire(p[0], p[1], h));
  }
  return { dolu, delik: [] };
}

/** SVG koordinatını yazı tipi koordinatına çevirir (y ekseni ters döner),
 *  tam sayıya yuvarlar ve ardışık aynı noktaları düşürür. */
function yaziTipineCevir(kontur) {
  const cikti = [];
  for (const p of kontur) {
    const n = { x: Math.round(p.x * BIRIM), y: Math.round((KUTU - p.y) * BIRIM), on: p.on };
    const son = cikti[cikti.length - 1];
    if (son && son.x === n.x && son.y === n.y) { if (n.on) son.on = true; continue; }
    cikti.push(n);
  }
  while (cikti.length > 1 && cikti[0].x === cikti[cikti.length - 1].x && cikti[0].y === cikti[cikti.length - 1].y) {
    const son = cikti.pop();
    if (son.on) cikti[0].on = true;
  }
  return cikti;
}

function isaretliAlan(kontur) {
  let s = 0;
  for (let i = 0; i < kontur.length; i++) {
    const a = kontur[i], b = kontur[(i + 1) % kontur.length];
    s += a.x * b.y - b.x * a.y;
  }
  return s / 2;
}

/** Dolu kontur saat yönünde, delik saat yönünün tersine döner (TrueType
 *  geleneği; y yukarı bakar, pozitif alan saat yönünün tersidir). */
function yonle(kontur, dolu) {
  const alan = isaretliAlan(kontur);
  if (alan === 0) return undefined;
  const saatYonunde = alan < 0;
  return saatYonunde === dolu ? kontur : [...kontur].reverse();
}

/** Bir aile SVG'sinin glif konturları (yazı tipi birimiyle, yönlendirilmiş). */
export function svgKonturlari(svg, ad = "svg") {
  const konturlar = [];
  for (const sekil of svgSekilleri(svg, ad)) {
    const { dolu, delik } = sekilDolgusu(sekil, ad);
    for (const [liste, doluMu] of [[dolu, true], [delik, false]]) {
      for (const k of liste) {
        const cevrilmis = yaziTipineCevir(k);
        if (cevrilmis.length < 3) continue;
        const yonlu = yonle(cevrilmis, doluMu);
        if (yonlu) konturlar.push(yonlu);
      }
    }
  }
  if (konturlar.length === 0) throw new Error(`yazitipi-uret: ${ad} hiçbir çizim üretmedi.`);
  return konturlar;
}

// ── GLİF KODLAMA (TrueType 'glyf' basit glif) ───────────────────────────────

function sinirlar(konturlar) {
  let xMin = Infinity, yMin = Infinity, xMax = -Infinity, yMax = -Infinity;
  for (const k of konturlar) for (const p of k) {
    if (p.x < xMin) xMin = p.x; if (p.x > xMax) xMax = p.x;
    if (p.y < yMin) yMin = p.y; if (p.y > yMax) yMax = p.y;
  }
  return { xMin, yMin, xMax, yMax };
}

/** Konturları TrueType basit glif baytlarına kodlar (dolgusuz, yönergesiz). */
export function glifKodla(konturlar) {
  const { xMin, yMin, xMax, yMax } = sinirlar(konturlar);
  const bayraklar = [], xler = [], yler = [], sonlar = [];
  let px = 0, py = 0, sayac = 0;
  for (const k of konturlar) {
    for (const p of k) {
      let bayrak = p.on ? 0x01 : 0x00;
      const dx = p.x - px, dy = p.y - py;
      if (dx === 0) bayrak |= 0x10;
      else if (Math.abs(dx) < 256) { bayrak |= 0x02; if (dx > 0) bayrak |= 0x10; xler.push([1, Math.abs(dx)]); }
      else xler.push([2, dx]);
      if (dy === 0) bayrak |= 0x20;
      else if (Math.abs(dy) < 256) { bayrak |= 0x04; if (dy > 0) bayrak |= 0x20; yler.push([1, Math.abs(dy)]); }
      else yler.push([2, dy]);
      bayraklar.push(bayrak);
      px = p.x; py = p.y; sayac++;
    }
    sonlar.push(sayac - 1);
  }
  const boy = 10 + 2 * sonlar.length + 2 + bayraklar.length
    + xler.reduce((a, [b]) => a + b, 0) + yler.reduce((a, [b]) => a + b, 0);
  const b = Buffer.alloc(boy);
  let o = 0;
  o = b.writeInt16BE(konturlar.length, o);
  o = b.writeInt16BE(xMin, o); o = b.writeInt16BE(yMin, o);
  o = b.writeInt16BE(xMax, o); o = b.writeInt16BE(yMax, o);
  for (const s of sonlar) o = b.writeUInt16BE(s, o);
  o = b.writeUInt16BE(0, o);                    // yönerge uzunluğu
  for (const f of bayraklar) o = b.writeUInt8(f, o);
  for (const [n, v] of xler) o = n === 1 ? b.writeUInt8(v, o) : b.writeInt16BE(v, o);
  for (const [n, v] of yler) o = n === 1 ? b.writeUInt8(v, o) : b.writeInt16BE(v, o);
  return { bayt: b, sinir: { xMin, yMin, xMax, yMax }, nokta: sayac, kontur: konturlar.length };
}

/** Bir aile SVG'sinin glif baytları — nöbet diskteki yazı tipinin glifini
 *  bununla karşılaştırır ve glifin ailenin SVG'sinden türediğini ölçer. */
export function glifBaytlari(svg, ad = "svg") {
  return glifKodla(svgKonturlari(svg, ad)).bayt;
}

// ── TABLOLAR ────────────────────────────────────────────────────────────────

const pad4 = (n) => (n + 3) & ~3;

function saglama(b) {
  const dolgulu = Buffer.alloc(pad4(b.length));
  b.copy(dolgulu);
  let s = 0;
  for (let i = 0; i < dolgulu.length; i += 4) s = (s + dolgulu.readUInt32BE(i)) >>> 0;
  return s;
}

function utf16be(metin) {
  const b = Buffer.alloc(metin.length * 2);
  for (let i = 0; i < metin.length; i++) b.writeUInt16BE(metin.charCodeAt(i), i * 2);
  return b;
}

const AD_KAYITLARI = [
  [1, "Sarmal Simge"],
  [2, "Regular"],
  [3, "Sarmal Simge 1.0"],
  [4, "Sarmal Simge"],
  [5, "Version 1.0"],
  [6, "SarmalSimge-Regular"],
];

function nameTablosu() {
  const dizeler = AD_KAYITLARI.map(([, m]) => utf16be(m));
  const baslik = 6 + 12 * AD_KAYITLARI.length;
  const b = Buffer.alloc(baslik + dizeler.reduce((a, d) => a + d.length, 0));
  let o = b.writeUInt16BE(0, 0);
  o = b.writeUInt16BE(AD_KAYITLARI.length, o);
  o = b.writeUInt16BE(baslik, o);
  let konum = 0;
  AD_KAYITLARI.forEach(([kimlik], i) => {
    o = b.writeUInt16BE(3, o); o = b.writeUInt16BE(1, o); o = b.writeUInt16BE(0x0409, o);
    o = b.writeUInt16BE(kimlik, o); o = b.writeUInt16BE(dizeler[i].length, o); o = b.writeUInt16BE(konum, o);
    konum += dizeler[i].length;
  });
  for (const d of dizeler) { d.copy(b, o); o += d.length; }
  return b;
}

function cmapTablosu(esleme /* [kod, glif][] kod sırasıyla */) {
  const bolumler = [];
  for (const [kod, glif] of esleme) {
    const son = bolumler[bolumler.length - 1];
    if (son && kod === son.bitis + 1 && glif === son.glif + (kod - son.baslangic)) son.bitis = kod;
    else bolumler.push({ baslangic: kod, bitis: kod, glif });
  }
  bolumler.push({ baslangic: 0xffff, bitis: 0xffff, glif: 0 });
  const n = bolumler.length;
  const ust = 2 ** Math.floor(Math.log2(n));
  const altBoy = 16 + 8 * n;
  const b = Buffer.alloc(4 + 16 + altBoy);
  let o = b.writeUInt16BE(0, 0);
  o = b.writeUInt16BE(2, o);
  o = b.writeUInt16BE(0, o); o = b.writeUInt16BE(3, o); o = b.writeUInt32BE(20, o);   // Unicode · BMP
  o = b.writeUInt16BE(3, o); o = b.writeUInt16BE(1, o); o = b.writeUInt32BE(20, o);   // Windows · Unicode BMP
  o = b.writeUInt16BE(4, o);
  o = b.writeUInt16BE(altBoy, o);
  o = b.writeUInt16BE(0, o);
  o = b.writeUInt16BE(2 * n, o);
  o = b.writeUInt16BE(2 * ust, o);
  o = b.writeUInt16BE(Math.log2(ust), o);
  o = b.writeUInt16BE(2 * n - 2 * ust, o);
  for (const s of bolumler) o = b.writeUInt16BE(s.bitis, o);
  o = b.writeUInt16BE(0, o);
  for (const s of bolumler) o = b.writeUInt16BE(s.baslangic, o);
  for (const s of bolumler) o = b.writeUInt16BE(s.bitis === 0xffff ? 1 : (s.glif - s.baslangic) & 0xffff, o);
  for (let k = 0; k < n; k++) o = b.writeUInt16BE(0, o);
  return b;
}

/**
 * Glif listesinden TrueType (sfnt) ve WOFF baytlarını kurar.
 * @param {{ kod: number, glif: ReturnType<typeof glifKodla> }[]} simgeler kod sırasıyla
 */
export function yaziTipiKur(simgeler) {
  const glifler = [{ bayt: Buffer.alloc(0), sinir: null, nokta: 0, kontur: 0 }, ...simgeler.map((s) => s.glif)];
  const say = glifler.length;

  // glyf + loca (uzun biçim)
  const loca = Buffer.alloc(4 * (say + 1));
  const parcalar = [];
  let konum = 0;
  glifler.forEach((g, i) => {
    loca.writeUInt32BE(konum, 4 * i);
    const dolgulu = Buffer.alloc(pad4(g.bayt.length));
    g.bayt.copy(dolgulu);
    parcalar.push(dolgulu);
    konum += dolgulu.length;
  });
  loca.writeUInt32BE(konum, 4 * say);
  const glyf = Buffer.concat(parcalar);

  const dolular = glifler.filter((g) => g.sinir);
  const genel = {
    xMin: Math.min(...dolular.map((g) => g.sinir.xMin)), yMin: Math.min(...dolular.map((g) => g.sinir.yMin)),
    xMax: Math.max(...dolular.map((g) => g.sinir.xMax)), yMax: Math.max(...dolular.map((g) => g.sinir.yMax)),
  };

  const head = Buffer.alloc(54);
  head.writeUInt32BE(0x00010000, 0);
  head.writeUInt32BE(0x00010000, 4);
  head.writeUInt32BE(0, 8);                     // checkSumAdjustment — aşağıda
  head.writeUInt32BE(0x5f0f3cf5, 12);
  head.writeUInt16BE(0x000b, 16);
  head.writeUInt16BE(EM, 18);
  // 20..35: oluşturma ve değişiklik tarihi SABİTTİR (belirlenimcilik): 2026-09-13,
  // 1904 başlangıçlı saniye. Derleme saati yazılsaydı her build başka bayt verirdi.
  head.writeUInt32BE(SABIT_TARIH, 24);
  head.writeUInt32BE(SABIT_TARIH, 32);
  head.writeInt16BE(genel.xMin, 36); head.writeInt16BE(genel.yMin, 38);
  head.writeInt16BE(genel.xMax, 40); head.writeInt16BE(genel.yMax, 42);
  head.writeUInt16BE(0, 44);
  head.writeUInt16BE(8, 46);
  head.writeInt16BE(2, 48);
  head.writeInt16BE(1, 50);                     // indexToLocFormat: uzun
  head.writeInt16BE(0, 52);

  const hhea = Buffer.alloc(36);
  hhea.writeUInt32BE(0x00010000, 0);
  hhea.writeInt16BE(EM, 4);
  hhea.writeInt16BE(0, 6);
  hhea.writeInt16BE(0, 8);
  hhea.writeUInt16BE(EM, 10);
  hhea.writeInt16BE(Math.min(...dolular.map((g) => g.sinir.xMin)), 12);
  hhea.writeInt16BE(Math.min(...dolular.map((g) => EM - g.sinir.xMax)), 14);
  hhea.writeInt16BE(Math.max(...dolular.map((g) => g.sinir.xMax)), 16);
  hhea.writeInt16BE(1, 18);
  hhea.writeUInt16BE(say, 34);

  const hmtx = Buffer.alloc(4 * say);
  glifler.forEach((g, i) => { hmtx.writeUInt16BE(EM, 4 * i); hmtx.writeInt16BE(g.sinir ? g.sinir.xMin : 0, 4 * i + 2); });

  const maxp = Buffer.alloc(32);
  maxp.writeUInt32BE(0x00010000, 0);
  maxp.writeUInt16BE(say, 4);
  maxp.writeUInt16BE(Math.max(...glifler.map((g) => g.nokta)), 6);
  maxp.writeUInt16BE(Math.max(...glifler.map((g) => g.kontur)), 8);
  maxp.writeUInt16BE(2, 14);                    // maxZones

  const kodlar = simgeler.map((s) => s.kod);
  const os2 = Buffer.alloc(96);
  os2.writeUInt16BE(4, 0);
  os2.writeInt16BE(EM, 2);
  os2.writeUInt16BE(400, 4);
  os2.writeUInt16BE(5, 6);
  os2.writeUInt16BE(0, 8);
  os2.writeInt16BE(1560, 10); os2.writeInt16BE(1440, 12); os2.writeInt16BE(0, 14); os2.writeInt16BE(180, 16);
  os2.writeInt16BE(1560, 18); os2.writeInt16BE(1440, 20); os2.writeInt16BE(0, 22); os2.writeInt16BE(840, 24);
  os2.writeInt16BE(120, 26); os2.writeInt16BE(620, 28);
  os2.writeUInt32BE(0x10000000, 46);            // ulUnicodeRange2 bit 28 → özel kullanım alanı (bit 60)
  os2.write("SRML", 58, "latin1");
  os2.writeUInt16BE(0x0040, 62);                // fsSelection: REGULAR
  os2.writeUInt16BE(Math.min(...kodlar), 64);
  os2.writeUInt16BE(Math.max(...kodlar), 66);
  os2.writeInt16BE(EM, 68); os2.writeInt16BE(0, 70); os2.writeInt16BE(0, 72);
  os2.writeUInt16BE(EM, 74); os2.writeUInt16BE(0, 76);
  os2.writeUInt32BE(1, 78);                     // ulCodePageRange1: Latin 1
  os2.writeUInt16BE(0x20, 92);                  // usBreakChar

  const post = Buffer.alloc(32);
  post.writeUInt32BE(0x00030000, 0);
  post.writeInt16BE(-120, 8);
  post.writeInt16BE(120, 10);

  const tablolar = new Map([
    ["OS/2", os2], ["cmap", cmapTablosu(simgeler.map((s, i) => [s.kod, i + 1]))],
    ["glyf", glyf], ["head", head], ["hhea", hhea], ["hmtx", hmtx],
    ["loca", loca], ["maxp", maxp], ["name", nameTablosu()], ["post", post],
  ]);
  const etiketler = [...tablolar.keys()].sort();
  const saglamalar = new Map(etiketler.map((e) => [e, saglama(tablolar.get(e))]));

  // ── sfnt ──
  const n = etiketler.length;
  const ust = 2 ** Math.floor(Math.log2(n));
  const sfntBoy = 12 + 16 * n + etiketler.reduce((a, e) => a + pad4(tablolar.get(e).length), 0);
  const sfnt = Buffer.alloc(sfntBoy);
  let o = sfnt.writeUInt32BE(0x00010000, 0);
  o = sfnt.writeUInt16BE(n, o);
  o = sfnt.writeUInt16BE(ust * 16, o);
  o = sfnt.writeUInt16BE(Math.log2(ust), o);
  o = sfnt.writeUInt16BE(n * 16 - ust * 16, o);
  let veri = 12 + 16 * n;
  const sfntKonum = new Map();
  for (const e of etiketler) {
    const t = tablolar.get(e);
    sfnt.write(e, o, "latin1"); o += 4;
    o = sfnt.writeUInt32BE(saglamalar.get(e), o);
    o = sfnt.writeUInt32BE(veri, o);
    o = sfnt.writeUInt32BE(t.length, o);
    t.copy(sfnt, veri);
    sfntKonum.set(e, veri);
    veri += pad4(t.length);
  }
  const ayar = (0xb1b0afba - saglama(sfnt)) >>> 0;
  head.writeUInt32BE(ayar, 8);
  sfnt.writeUInt32BE(ayar, sfntKonum.get("head") + 8);

  // ── WOFF 1.0 ──
  const girdiler = etiketler.map((e) => {
    const asil = tablolar.get(e);
    const sikisik = deflateSync(asil, { level: 9 });
    return { e, asil, veri: sikisik.length < asil.length ? sikisik : asil };
  });
  const woffBoy = 44 + 20 * n + girdiler.reduce((a, g) => a + pad4(g.veri.length), 0);
  const woff = Buffer.alloc(woffBoy);
  o = woff.write("wOFF", 0, "latin1");
  o = woff.writeUInt32BE(0x00010000, o);
  o = woff.writeUInt32BE(woffBoy, o);
  o = woff.writeUInt16BE(n, o);
  o = woff.writeUInt16BE(0, o);
  o = woff.writeUInt32BE(sfntBoy, o);
  o = woff.writeUInt16BE(1, o);
  o = woff.writeUInt16BE(0, o);
  // metaOffset, metaLength, metaOrigLength, privOffset, privLength: sıfır
  o = 44;
  let wVeri = 44 + 20 * n;
  for (const g of girdiler) {
    woff.write(g.e, o, "latin1"); o += 4;
    o = woff.writeUInt32BE(wVeri, o);
    o = woff.writeUInt32BE(g.veri.length, o);
    o = woff.writeUInt32BE(g.asil.length, o);
    o = woff.writeUInt32BE(saglamalar.get(g.e), o);
    g.veri.copy(woff, wVeri);
    wVeri += pad4(g.veri.length);
  }
  return { sfnt, woff };
}

/**
 * package.json ilanından yazı tipini üretir ve diske yazar. Yollar geçersiz
 * kılınabilir: nöbet üreticiyi geçici kopyalara karşı gerçekten koşturur.
 */
export function uret(yollar = {}) {
  const { KOK, PAKET, CIKTI } = { ...VARSAYILAN, ...yollar };
  const paket = JSON.parse(readFileSync(PAKET, "utf8"));
  const ilanlar = simgeIlanlari(paket);
  const simgeler = ilanlar.map((s) => {
    const svg = readFileSync(join(KOK, s.kaynak), "utf8");
    return { ...s, glif: glifKodla(svgKonturlari(svg, s.kaynak)) };
  });
  const { woff } = yaziTipiKur(simgeler);
  const hedef = CIKTI ?? join(KOK, YAZI_TIPI_YOLU);
  mkdirSync(dirname(hedef), { recursive: true });
  writeFileSync(hedef, woff);
  return { hedef, woff, simgeler: ilanlar };
}

// Doğrudan çalıştırma (npm run build): varsayılan yollara üret.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { simgeler, woff } = uret();
  console.log(`simge yazı tipi üretildi → ${YAZI_TIPI_YOLU} (${simgeler.length} glif, ${woff.length} bayt)`);
}

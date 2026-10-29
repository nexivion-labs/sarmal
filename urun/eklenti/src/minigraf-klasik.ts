// ═══════════════════════════════════════════════════════════════════════════
// minigraf-klasik.ts — 🕸️ MİNİ GRAF "Klasik" görünümü (SAF — vscode importsuz)
//
//   Düzenli ağaç öncesindeki cam mercekli SVG çizimi, git HEAD'deki hâliyle
//   (Founder 2026-10-21: kullanıcı görünümler arasında geçer). Veri ve çekirdek
//   mantığı `minigraf-cekirdek.ts` ile ORTAKTIR; burada yalnız çizim yaşar.
// ═══════════════════════════════════════════════════════════════════════════

import { type ProjeGrafi, cizilecekBaglar, gorunurGraf, bosHtml, durumRengi, kacir, atlaHref, meyveRolu, dugumAltYazisi } from "./minigraf-cekirdek.ts";
import { MINI_GRAF_METINLERI, kanonikWidgetAdi } from "./yuzey-metinleri.ts";
import { tipSimgesi } from "./simge-cizelgesi.ts";

// ── SVG çizimi ───────────────────────────────────────────────────────────────

const SVG_G = 376;
const SATIR_Y = 34;
const ILK_Y = 18;
const KOK_X = 12;
// Altıncı ray meyve rolünündür; yarıçap kademesi de onunla birlikte incelir.
const RAY_X = [28, 48, 68, 88, 108, 126] as const;
const YARICAP = [8.2, 7.8, 7.3, 6.9, 6.5, 5.8] as const;

/**
 * ETİKET MERDİVENİ — yazı da mercek gibi kademelenir (Founder hükmü 2026-07-30).
 *
 * Ölçülmüş kusur: mercekler altı ayrı rayda kademeleniyordu fakat bütün etiketler
 * TEK sütundan (x=146) başlıyordu. Göz merdiveni dairelerde görüyor, yazıda
 * kaybediyordu; alt alta dizilen Blok, Katman, Adım ve meyve adları düz bir liste
 * gibi okunuyor ve hangi adın hangi kademeye ait olduğu karışıyordu. Girinti,
 * ağaç yüzeyinin en temel görsel ipucudur.
 *
 * SIĞ KADEMELER YER KAZANIR, DERİN KADEME AYNI KALIR: en derin etiket bugünkü
 * 146 değerinde durur, üstündeki her kademe sola kayar ve yazıya daha çok alan
 * bulur. Dolayısıyla değişiklik hiçbir kademede gerileme üretmez.
 */
const ETIKET_BOSLUGU = 20;   // mercek merkezinden yazının başına — en büyük yarıçap 8.2
function etiketX(derinlik: number): number {
  const ray = RAY_X[Math.min(derinlik, RAY_X.length - 1)];
  return ray + ETIKET_BOSLUGU;
}

/**
 * Etiketin sığabileceği karakter sayısı da girintiden TÜREİR — sabit bir üst sınır
 * derin kademede taşmaya, sığ kademede boşuna kırpmaya yol açardı. Kırpma yalnız
 * görüntüdedir; tam ad üzerine gelme baloncuğunda durur.
 */
const KARAKTER_G = 7.9;   // ölçülen ortalama karakter genişliği (etiket punto'sunda)
function etiketUstSiniri(derinlik: number): number {
  return Math.max(16, Math.floor((SVG_G - etiketX(derinlik) - 10) / KARAKTER_G));
}

function kisalt(s: string, ust: number): string {
  return s.length > ust ? s.slice(0, ust - 1) + "…" : s;
}

/** GitLens-benzeri tek proje grafını satır-içi SVG'ye çizer. */
export function projeGrafiSvg(tamGraf: ProjeGrafi): string {
  if (!tamGraf.dugumler.length) return "";
  const { graf, gizli } = gorunurGraf(tamGraf);
  const H = ILK_Y * 2 + (graf.dugumler.length - 1) * SATIR_Y;
  const konum = new Map(graf.dugumler.map((d, i) => [d.kod, {
    x: RAY_X[d.derinlik], y: ILK_Y + i * SATIR_Y, i,
  }]));
  const parcalar: string[] = [];

  // Gerçek kenarlar: bütün ağ görünür, düğümlerin altında kalır. ÜÇ SINIF ÜÇ
  // ÇİZGİDİR — yürütme sırası yumuşak bir eğridir, zemin bağı kesikli düz bir
  // dirsektir, üretim kökeni ise noktalı düz bir iniştir; kullanıcı "bu iş şundan
  // sonra gelir", "bu katman şunun üstünde durur" ve "bu Adım şunu teslim eder"
  // cümlelerini bakışta ayırır. Sınıf veriden okunur, tahmin edilmez.
  for (const bag of cizilecekBaglar(graf)) {
    const a = konum.get(bag.once), b = konum.get(bag.sonra);
    if (!a || !b) continue;
    // ÜRETİM KÖKENİ DÜZ İNER (ORK-1.3): Adımın merceğinden meyvenin merceğine tek
    // bir doğru parçası gider. Geometri bilinçli olarak kavis hesabına GİRMEZ,
    // çünkü iki uç yalnız bir ray (108 → 126) uzaktadır ve doğru parçası en geniş
    // hâlinde bile x=126'da kalır; Adım etiket sütunu x=128'de başladığından bu
    // kenar hiçbir yazıyı kesemez. Kapsama rayının kavisli dilinden de böylece
    // kesin olarak ayrılır — YUZ-3.2 üretim kökeninin mimari sarma diye yeniden
    // etiketlenmesini yasaklar.
    if (bag.tur === "üretir") {
      parcalar.push(`<path class="uretir" data-a="${a.i}" data-b="${b.i}" ` +
        `d="M ${a.x} ${a.y} L ${b.x} ${b.y}"/>`);
      continue;
    }
    // KAVİS TAVANI EN KALABALIK ETİKET SÜTUNUNUN SOLUNDA DURUR. Founder canlı
    // bulgusu 2026-07-30: bağımlılık eğrileri yazılarla çakışıyordu. Ölçüldü —
    // eğriler x=28..140 arasında akıyordu, Adım etiketleri ise x=128'den
    // başlıyordu, dolayısıyla en kalabalık sütunun (523 etiket) üstünden
    // geçiyorlardı. Tavan Adım sütununun soluna çekildi; eğri on dört piksel
    // dar salınıyor fakat kendi kademesinin adını hiç kesmiyor.
    const kavisX = Math.min(etiketX(4) - 2, Math.max(a.x, b.x) + 12 + Math.abs(b.y - a.y) * 0.07);
    if (bag.tur === "zemin") {
      parcalar.push(`<path class="zemin" data-a="${a.i}" data-b="${b.i}" ` +
        `d="M ${a.x} ${a.y} H ${kavisX} V ${b.y} H ${b.x}"/>`);
      continue;
    }
    parcalar.push(`<path class="bag" data-a="${a.i}" data-b="${b.i}" ` +
      `d="M ${a.x} ${a.y} C ${kavisX} ${a.y}, ${kavisX} ${b.y}, ${b.x} ${b.y}"/>`);
  }

  // Kapsama rayları: kökler ortak proje rayına bağlanır; tüm yüz tek bütün görünür.
  //
  // KAPSAMA YALNIZ MİMARİ GÖRÜNÜRLÜĞÜ ÇİZER (ORK-1.1). Bir satırın bağlayıcısı
  // veriden okunan başka bir sınıfa aitse burada İKİNCİ kez çizilmez; aksi hâlde
  // aynı ilişki iki sınıfın dilinde birden anlatılır ve ORK-1 bunu yasaklar.
  // Bugünkü tek örnek meyvedir: onun bağlayıcısı `üretir` sınıfındadır.
  const kokler = graf.dugumler.filter((d) => !d.ustKod).map((d) => konum.get(d.kod)!);
  if (kokler.length > 1) {
    parcalar.push(`<path class="kapsama" d="M ${KOK_X} ${kokler[0].y} V ${kokler[kokler.length - 1].y}"/>`);
  }
  const kendiSinifiVar = new Set(
    graf.baglar.filter((b) => b.tur === "üretir").map((b) => b.sonra));
  for (const d of graf.dugumler) {
    const p = konum.get(d.kod)!;
    if (!d.ustKod) {
      parcalar.push(`<path class="kapsama" d="M ${KOK_X} ${p.y} H ${p.x}"/>`);
      continue;
    }
    if (kendiSinifiVar.has(d.kod)) continue;
    const ust = konum.get(d.ustKod);
    if (!ust) continue;
    const donusY = Math.max(ust.y + 6, p.y - 10);
    parcalar.push(`<path class="kapsama" d="M ${ust.x} ${ust.y} V ${donusY} Q ${ust.x} ${p.y} ${p.x} ${p.y}"/>`);
  }

  // Cam mercekler + kanon ikonları. Renk yalnız durumdan (YUZ-4).
  graf.dugumler.forEach((d, i) => {
    const p = konum.get(d.kod)!;
    const r = YARICAP[d.derinlik];
    const renk = durumRengi(d.durum);
    const simge = tipSimgesi(d.tip);
    const kimlik = d.ad === d.kod ? d.kod : `${d.ad} · ${d.kod}`;
    // BOŞ CAM: beyan edilmiş ama diskte bulunamayan meyve DOLDURULMAZ. Işıma,
    // buzlu gövde ve parlama çizilmez; geriye yalnız boş mercek ile kesikli
    // çemberi kalır. Boşluk bir renk değil, bir YOKLUK olarak anlatılır.
    const bos = d.diskte === false;
    const bosCam = bos ? " boş" : "";
    const dolgu = bos ? ""
      : `<circle class="isima" cx="${p.x}" cy="${p.y}" r="${r + 7}" fill="${renk}"/>` +
        `<circle cx="${p.x}" cy="${p.y}" r="${r - 1}" fill="${renk}" fill-opacity=".76" filter="url(#buz)"/>`;
    const parlama = bos ? ""
      : `<ellipse class="parlama" cx="${p.x - 1.5}" cy="${p.y - r / 2.5}" rx="${Math.max(2, r - 3)}" ry="${Math.max(1, (r - 3) / 2)}"/>`;
    const baslik = `${kanonikWidgetAdi(d.tip, d.tip)} · ${kimlik}${d.durum ? ` · ${MINI_GRAF_METINLERI.durum(d.durum)}` : ""}` +
      (meyveRolu(d) && d.beyanYolu ? `\n${MINI_GRAF_METINLERI.beyanYolu(bos, d.beyanYolu)}` : "");
    // Etiket merdiveni: yazı da mercek gibi kademelenir; kırpma sınırı girintiden türer.
    const ex = etiketX(d.derinlik);
    const ust = etiketUstSiniri(d.derinlik);
    const govde = `<g class="dugum${d.secili ? " secili" : ""}" data-i="${i}">` +
      `<title>${kacir(MINI_GRAF_METINLERI.kaynakIpucu(baslik))}</title>` +
      `<rect class="satir" x="0" y="${p.y - SATIR_Y / 2}" width="${SVG_G}" height="${SATIR_Y}" rx="7"/>` +
      dolgu +
      `<circle class="mercek${bosCam}" cx="${p.x}" cy="${p.y}" r="${r}"/>` +
      parlama +
      `<circle class="cember${bosCam}" cx="${p.x}" cy="${p.y}" r="${r}" stroke="${renk}"/>` +
      `<text class="simge" x="${p.x}" y="${p.y + 3.2}" font-size="${d.derinlik < 2 ? 9.5 : 8.5}">${simge}</text>` +
      `<text class="etiket" x="${ex}" y="${p.y - 1}">${kacir(kisalt(d.ad, ust))}</text>` +
      // ALT YAZI KIRPILMAZ. Denendi ve geri alındı (2026-07-30): girintiden türeyen
      // sınır Adım alt yazısının kuyruğunu kesiyordu ve kesilen tam da "N diskte yok"
      // uyarısıydı. Eksik teslim sinyalini kırpmak, grafın söylemesi gereken tek
      // dürüstlük cümlesini susturmak olurdu; genişlik kaygısı bunun önüne geçemez.
      `<text class="alt" x="${ex}" y="${p.y + 10.5}">${kacir(dugumAltYazisi(d) + (gizli.get(d.kod) ? ` · ${MINI_GRAF_METINLERI.gizliSatir(gizli.get(d.kod)!)}` : ""))}</text>` +
      `</g>`;
    const href = atlaHref(d);
    parcalar.push(href ? `<a href="${href}">${govde}</a>` : govde);
  });

  // ÖLÇEK SABİTTİR (Founder 2026-10-22): çizim 1:1 basılır, panel genişliğiyle büyümez
  // ve küçülmez. `width="100%"` iken alt panelde (≈1400 px) her şey 3,7 kat büyüyordu
  // (etiket ≈40 px, mercek ≈50 px). Dar panelde artan kısım kendi kutusunda kayar.
  return `<svg class="graf" viewBox="0 0 ${SVG_G} ${H}" width="${SVG_G}" height="${H}" ` +
    `xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${MINI_GRAF_METINLERI.ariaGraf}">` +
    `<defs><filter id="buz" x="-80%" y="-80%" width="260%" height="260%">` +
    `<feGaussianBlur stdDeviation="1.6"/></filter></defs>${parcalar.join("")}</svg>`;
}

/**
 * Hover edilen düğümün yalnız doğrudan bağımlılık bağlarını hafifçe güçlendirir.
 *
 * YALNIZ `adım` KENARI SAYILIR. Ölçülmüş kusur (2026-07-30 · Founder canlı
 * bulgusu "IDE'de kasma var"): bağlılık denetimi BÜTÜN kenarlara bakıyordu, oysa
 * ürettiği kural yalnız `.bag` sınıfını boyar. Zemin kenarı `.zemin` sınıfındadır,
 * dolayısıyla yalnız zemine bağlı bir düğüm için hiçbir zaman EŞLEŞEMEYECEK iki
 * seçici üretiliyordu. Zemin kenarları A12 turunda 151'den 722'ye çıkınca bu ölü
 * maliyet grafın tamamına yayıldı ve `:has()` seçici sayısı 1366'ya ulaştı;
 * `:has()` en pahalı seçicidir ve tarayıcı onu her fare hareketinde yeniden
 * değerlendirir. Zemin zaten ortam bilgisidir — izlenecek olan yürütme bağıdır.
 */
function bagHoverStili(graf: ProjeGrafi): string {
  const cizilen = cizilecekBaglar(graf);   // yalnız seçili düğümün bağları: seçici sayısı bağ sayısını izler
  return graf.dugumler.map((d, i) => {
    const bagli = cizilen.some((b) => b.tur === "adım" && (b.once === d.kod || b.sonra === d.kod));
    if (!bagli) return "";
    return `.graf:has(.dugum[data-i="${i}"]:hover) .bag[data-a="${i}"],` +
      `.graf:has(.dugum[data-i="${i}"]:hover) .bag[data-b="${i}"]{stroke-opacity:.72;stroke-width:1.5}`;
  }).join("");
}

// ── HTML kabuğu ──────────────────────────────────────────────────────────────

const KLASIK_STIL = `<style>
body{font-family:var(--vscode-font-family);font-size:11px;color:var(--vscode-foreground);padding:0 6px;margin:0;background:transparent;overflow-x:auto}
.ust{display:flex;justify-content:flex-end;align-items:center;height:22px;padding:0 6px;border-bottom:1px solid var(--vscode-widget-border)}
.ozet{display:flex;align-items:center;gap:5px;white-space:nowrap;font-size:10px;color:var(--vscode-descriptionForeground)}
.sayac-simge{font-size:9px;color:var(--vscode-foreground);opacity:.72}.ayrac{opacity:.55}
a{text-decoration:none}.bag{fill:none;stroke:var(--vscode-sarmal-kenar);stroke-width:1.05;stroke-opacity:.20}
.zemin{fill:none;stroke:var(--vscode-panel-border);stroke-width:.85;stroke-opacity:.42;stroke-dasharray:2 3}
/* ÜRETİM KÖKENİ (ORK-1.3) — kendi görsel dili. Kapsama sürekli ve kavislidir,
   zemin kesikli ve dik açılıdır, yürütme kenarı yumuşak bir eğridir; üretir ise
   NOKTALI ve düz iner. Dört sınıf dört ayrı (biçim × desen) çiftidir, dolayısıyla
   hiçbiri ötekiyle karışmaz. Renk yine kanonik tema rolünden gelir (YUZ-4.1) ve
   durum renkleriyle ORTAK DEĞİLDİR — kenar sınıfı bir durum değildir. */
.uretir{fill:none;stroke:var(--vscode-descriptionForeground);stroke-width:1;stroke-opacity:.55;stroke-dasharray:1 2.6;stroke-linecap:round}
.kapsama{fill:none;stroke:var(--vscode-panel-border);stroke-width:1.1;stroke-opacity:.58}
.satir{fill:transparent}.isima{opacity:0;filter:blur(5px);transition:opacity .16s ease}
.mercek{fill:var(--vscode-editorWidget-background);fill-opacity:.78}
.parlama{fill:var(--vscode-foreground);fill-opacity:.16;pointer-events:none}
.cember{fill:none;stroke-opacity:.60;stroke-width:.9}
.cember.boş{stroke-dasharray:2.5 2}
.mercek.boş{fill-opacity:.10}
.simge{font-family:var(--vscode-font-family);text-anchor:middle;pointer-events:none}
/* YAZI HALESİ — bağımlılık eğrisi harfin ARKASINDA kesilir (Founder bulgusu
   2026-07-30). Kavis tavanını çekmek tek başına yetmez: bir eğri satırlar boyunca
   uzanır ve yolu üstündeki SIĞ kademelerin adlarını da keser. Hale, her harfe
   panel arka planı renginde ince bir dış çizgi verir; çizgi harfe değdiği yerde
   görünmez olur, yazı okunur kalır. Saf CSS'tir, betik ya da kütüphane istemez.
   Renk yine kanonik tema rolünden gelir (YUZ-4.1) — ham değer gömülmez. */
.etiket,.alt{paint-order:stroke fill;stroke:var(--vscode-sideBar-background,var(--vscode-editor-background));stroke-width:3px;stroke-linejoin:round}
.etiket{fill:var(--vscode-foreground);font-size:11px}.alt{fill:var(--vscode-descriptionForeground);font-size:9px}
.dugum{cursor:pointer}.dugum:hover .satir{fill:var(--vscode-list-hoverBackground)}
.dugum:hover .isima{opacity:.30}.dugum:hover .etiket{font-weight:600}
.dugum.secili .isima{opacity:.16}.dugum.secili .cember{stroke-opacity:.95;stroke-width:1.2}
.k{color:var(--vscode-descriptionForeground);padding:6px}
</style>`;

/** Tek doğru görünüm: tüm proje grafı. Kip/anahtar yoktur. */
export function klasikHtml(graf: ProjeGrafi): string {
  if (!graf.dugumler.length) return bosHtml(MINI_GRAF_METINLERI.bosGraf);
  return `<!DOCTYPE html><html lang="${MINI_GRAF_METINLERI.dil}"><meta charset="UTF-8">${KLASIK_STIL}<style>${bagHoverStili(gorunurGraf(graf).graf)}</style><body>
<div class="ust"><span class="ozet"><span class="sayac-simge" title="${MINI_GRAF_METINLERI.dugum}" aria-label="${MINI_GRAF_METINLERI.dugum}">●</span>${graf.dugumler.length}<span class="ayrac">·</span><span class="sayac-simge" title="${MINI_GRAF_METINLERI.bag}" aria-label="${MINI_GRAF_METINLERI.bag}">⎇</span>${graf.baglar.length}</span></div>
${projeGrafiSvg(graf)}
</body></html>`;
}

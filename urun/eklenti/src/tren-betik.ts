// ═══════════════════════════════════════════════════════════════════════════
// tren-betik.ts — 🪪 TREN SEKMESİNİN STİLİ VE İSTEMCİ BETİĞİ (PNL-A11 · SAF)
//
//   Ajan şeması ve profil kartı tamamen webview'in içinde çalışır: ajan seçmek,
//   ekip açmak ve kartın alt düğüm listesini açmak eklentiye gidip gelen bir yanıt
//   beklemez (PNL-A18 ilkesi). Eklentiye yalnız "tanımına git" iletisi gider ve bu
//   ileti dosya yolu değil, eklentinin kendi özetinden çözdüğü bir ANAHTAR taşır
//   (tren-gorunum.ts `trenGitKonumu`).
//
//   İplikler (Founder seçimi 2026-10-28): açık ekibin yöneticisinden her üyeye
//   Ray'deki bağımlılık iplikleri gibi ince, yelpaze biçimli eğriler çizilir. Çizim
//   şemanın kendi kayan kabındaki bir SVG'dedir; ölçüm öncesinde SVG sıfırlanır, bu
//   yüzden daralan şema eski boyunda kalmaz ve boyut gözlemcisi döngüye girmez.
//   Seçili ajanın iplikleri vurgulanır; yeni açılan ekibin iplikleri kısa bir
//   çizilme canlandırmasıyla gelir (azaltılmış hareket tercihinde canlandırma yoktur).
//
//   Seçim ve açık ekipler bölümün yeniden çizilmesinde korunur: eklenti Tren
//   bölümünü yeniden gönderdiğinde betik aynı ajanı seçer ve aynı ekipleri açar.
//   Renkler yalnız tema değişkenlerinden ve tül morundan gelir (panel-betik.ts).
// ═══════════════════════════════════════════════════════════════════════════

import { MARKA_MAVISI } from "./panel-betik.ts";

/** Profil sütununun ve iş listesinin yan yana durduğu en küçük panel genişliği. */
export const TREN_GENIS_PX = 900;
/** Departman sütunlarının alt alta aktığı genişlik. */
export const TREN_DAR_PX = 640;

/** "Tanımına git" okunun maskesi (veri adresi; renk maskenin arkasındaki zeminden gelir). */
const GIT_MASKESI = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M6 3.5h6.5V10M12.3 3.7L4 12" fill="none" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>')}`;

const KENARLIK = "var(--vscode-sideBarSectionHeader-border,var(--vscode-panel-border,rgba(128,128,128,.35)))";
const maske = (svg: string): string => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">${svg}</svg>`)}`;
/** Sınır işaretlerinin maskeleri: kilit (bellek izole) ve kalkan (`sınır` ilan edilmiş). */
const KILIT_MASKESI = maske('<rect x="3.5" y="7" width="9" height="6.5" rx="1.2" fill="none" stroke="#000" stroke-width="1.4"/><path d="M5.5 7 V 5.2 a 2.5 2.5 0 0 1 5 0 V 7" fill="none" stroke="#000" stroke-width="1.4"/>');
const KALKAN_MASKESI = maske('<path d="M8 2l5 2v4c0 3-2.2 5-5 6-2.8-1-5-3-5-6V4z" fill="none" stroke="#000" stroke-width="1.4" stroke-linejoin="round"/>');
/**
 * Yetki kademesinin rengi (L1–L6): tema renk değişkenlerinden; açık ve koyu temada okunur kalır.
 * Renk sınırı anlatmaz, kademeyi bakışta ayırır; kademenin anlamı rozetin ipucundadır.
 */
const YETKI_RENGI: Readonly<Record<string, string>> = {
  L1: "var(--vscode-disabledForeground,#868686)", L2: "var(--vscode-charts-green,#89d185)", L3: "var(--vscode-charts-blue,#3794ff)",
  L4: "var(--vscode-charts-purple,#b180d7)", L5: "var(--vscode-charts-orange,#d18616)", L6: "var(--vscode-charts-red,#f14c4c)",
};

export const TREN_STILI = `
/* TREN · AJAN ŞEMASI (PNL-A11) */
.t-a{--renk:${MARKA_MAVISI}}
.t-y{--renk:var(--tul-vurgu)}
.t-u{--renk:var(--vscode-descriptionForeground)}
.tren-duzen{display:flex;flex-direction:column}
.tr-sol,.tr-yan{min-width:0}
.tr-yan{border-top:1px solid ${KENARLIK}}
@media (min-width:${TREN_GENIS_PX}px){
  .sekme-paneli:has(>.tren-duzen){display:flex;flex-direction:column;overflow:hidden;padding-bottom:0}
  .tren-duzen{flex:1 1 auto;min-height:0;flex-direction:row;align-items:stretch}
  .tr-sol{flex:1 1 auto;min-height:0;display:flex;flex-direction:column}
  .tr-sol>.bas{flex:none}
  .tr-sema{flex:1 1 auto;min-height:0;overflow:auto}
  .tr-yan{flex:0 0 380px;min-height:0;overflow:auto;border-top:0;border-left:1px solid ${KENARLIK};padding-bottom:8px}
}
.bas .say{font-weight:400;letter-spacing:0;margin-left:6px;text-transform:none}
.bas .lej{float:right;display:inline-flex;gap:10px;font-weight:400;letter-spacing:0;text-transform:none}
.lej i{display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:4px;vertical-align:-1px;background:var(--renk)}
@media (max-width:${TREN_DAR_PX - 1}px){.bas .lej{display:none}}
.tr-sema{position:relative;padding:0 12px 10px}
svg.tr-iplik{position:absolute;left:0;top:0;overflow:visible;pointer-events:none;z-index:0}
.tr-iplik path{fill:none;stroke:var(--vscode-sarmal-kenar,var(--tul-vurgu));stroke-width:1.05;stroke-opacity:.34}
.tr-iplik path.vurgu{stroke-opacity:.85;stroke-width:1.4}
.tr-iplik path.yeni{stroke-dasharray:var(--l,400);stroke-dashoffset:var(--l,400);animation:tr-ciz .32s ease-out forwards}
@keyframes tr-ciz{to{stroke-dashoffset:0}}
@media (prefers-reduced-motion:reduce){.tr-iplik path.yeni{animation:none;stroke-dasharray:none;stroke-dashoffset:0}}
.tr-apex{position:relative;z-index:1;display:flex;justify-content:center;padding:4px 0 8px}
.tr-apex-yuva{display:inline-flex;align-items:center;gap:8px;padding:3px 12px;border:1px dashed var(--vscode-descriptionForeground);border-radius:4px;
  color:var(--vscode-descriptionForeground);font-size:11px}
.rz-m{flex:none;display:inline-block;padding:0 5px;border-radius:7px;font-size:9px;line-height:13px;white-space:nowrap;
  color:var(--vscode-textLink-foreground);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--vscode-textLink-foreground) 50%,transparent)}
.tr-apex-kutular{display:flex;gap:10px}
.tr-apex-kutular .ajan{min-width:200px}
/* GÖRÜNÜMLER (Founder 2026-10-28): aynı HTML, kaptaki data-gorunum niteliğine göre diziliş; bu turda yalnız şeritler. */
.tr-depler{position:relative;z-index:1;display:flex}
.tr-dep-bas{display:flex;align-items:baseline;gap:6px;margin:0 0 6px;font-size:10px;line-height:14px;font-weight:600;letter-spacing:.06em;
  text-transform:uppercase;color:var(--vscode-descriptionForeground);white-space:nowrap;overflow:hidden}
/* Şeritler (varsayılan): her departman bir yatay şerit; adı solda, ekipler sağa akar. */
.tr-sema[data-gorunum="seritler"] .tr-depler{flex-direction:column}
.tr-sema[data-gorunum="seritler"] .tr-dep{display:flex;align-items:flex-start;gap:12px;padding:6px 0;border-top:1px solid ${KENARLIK}}
.tr-sema[data-gorunum="seritler"] .tr-dep:first-child{border-top:0}
.tr-sema[data-gorunum="seritler"] .tr-dep-bas{flex:0 0 170px;flex-direction:column;gap:1px;margin:3px 0 0;white-space:normal}
.tr-sema[data-gorunum="seritler"] .tr-izgara{flex:1 1 auto;min-width:0;display:flex;flex-wrap:wrap;gap:6px 10px}
.tr-sema[data-gorunum="seritler"] .tr-izgara>.tr-grup{width:210px}
.tr-grup{display:flex;flex-direction:column;gap:3px;min-width:0}
.tr-astlar{display:flex;flex-direction:column;gap:2px;padding-left:24px;margin-top:2px}
.tr-astlar[hidden]{display:none}
.tr-ac{align-self:flex-start;margin:0 0 0 14px;padding:0 4px;border:0;background:none;cursor:pointer;font:inherit;font-size:10px;line-height:14px;
  color:var(--vscode-descriptionForeground)}
.tr-ac:hover{color:var(--vscode-foreground)}
.tr-ac:focus-visible,.ajan:focus-visible,.cip:focus-visible,[data-git]:focus-visible,[data-sec]:focus-visible,.ad-c:focus-visible{outline:1px solid var(--vscode-focusBorder);outline-offset:1px}
@media (max-width:${TREN_DAR_PX - 1}px){
  .tr-sema[data-gorunum="seritler"] .tr-dep{flex-direction:column;gap:4px}
  .tr-sema[data-gorunum="seritler"] .tr-dep-bas{flex:none;flex-direction:row}
}
.ajan,.cip{position:relative;z-index:1;font:inherit;color:var(--vscode-foreground);text-align:left;cursor:pointer;min-width:0;
  border:1px solid var(--vscode-widget-border,rgba(128,128,128,.35));background:var(--vscode-editorWidget-background,transparent);border-radius:4px;
  transition:border-color .12s,background-color .12s,box-shadow .12s}
.ajan{display:flex;flex-direction:column;gap:1px;padding:3px 7px 4px 8px;border-left:2px solid var(--renk)}
.ajan:hover,.cip:hover{border-color:var(--tul-vurgu);box-shadow:0 0 0 1px var(--tul-cizgi)}
.ajan.secili,.cip.secili{border-color:${MARKA_MAVISI};box-shadow:0 0 0 1px ${MARKA_MAVISI}}
.aj-ust{display:flex;align-items:center;gap:6px;min-width:0}
.aj-ad{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;font-weight:600}
.aj-rz{flex:none;display:inline-flex;gap:3px}
.aj-alt{display:flex;align-items:center;gap:6px;min-width:0;font-size:10px;color:var(--vscode-descriptionForeground)}
.aj-alt-m{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rz-l,.rz-n{display:inline-block;padding:0 4px;border-radius:7px;font-size:9.5px;line-height:13px;font-weight:600;
  background:var(--vscode-badge-background);color:var(--vscode-badge-foreground)}
.rz-n{background:color-mix(in srgb,var(--tul-vurgu) 22%,transparent);color:var(--tul-vurgu)}
.rz-y{display:inline-block;flex:none;padding:0 4px;border:1px dashed var(--vscode-editorWarning-foreground,#cca700);border-radius:7px;font-size:9px;
  line-height:11px;color:var(--vscode-editorWarning-foreground,#cca700);white-space:nowrap}
.cip{display:flex;align-items:center;gap:6px;height:20px;padding:0 6px;font-size:11px;border-left:2px solid var(--renk)}
/* Yetki rozeti kademesinin rengini taşır; sınır işaretleri kilit (bellek izole) ve kalkandır (sınır ilanlı). */
${Object.entries(YETKI_RENGI).map(([l, r]) => `.rz-l.yk-${l}{color:${r};background:color-mix(in srgb,${r} 18%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,${r} 55%,transparent)}`).join("\n")}
.tr-isr{flex:none;display:inline-block;width:11px;height:11px;background:var(--vscode-descriptionForeground);opacity:.8}
.tr-kilit{-webkit-mask:url("${KILIT_MASKESI}") center/11px no-repeat;mask:url("${KILIT_MASKESI}") center/11px no-repeat}
.tr-kalkan{-webkit-mask:url("${KALKAN_MASKESI}") center/11px no-repeat;mask:url("${KALKAN_MASKESI}") center/11px no-repeat}
/* Kartın yol satırı: lider ajan › departman › yöneticiler › ajan. */
.k-yol{display:flex;flex-wrap:wrap;gap:1px 4px;margin-top:3px;font-size:11px;color:var(--vscode-descriptionForeground)}
.k-yol>span:not(:last-child)::after{content:" ›";opacity:.6}
.k-yol>span:last-child{color:var(--vscode-foreground);font-weight:600}
.k-yol [data-sec]{cursor:pointer}
.k-yol [data-sec]:hover{color:var(--vscode-textLink-foreground)}
.cp-ad{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
/* PROFİL KARTI */
.tr-profil{padding:0 10px}
.tr-profil .bas{padding-left:0;padding-right:0}
.tr-profil .bos{padding:2px 0 8px}
.kart[hidden]{display:none}
.k-bas{border-left:2px solid var(--renk);padding:2px 0 6px 8px;margin-bottom:4px}
.k-ad{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;min-width:0}
.k-tur{font-size:10px;font-weight:400;color:var(--renk);border:1px solid var(--renk);border-radius:7px;padding:0 5px;line-height:13px}
.k-kod,.k-yer{font-size:11px;color:var(--vscode-descriptionForeground);margin-top:2px;overflow-wrap:anywhere}
.k-kod{display:inline-flex;align-items:center;gap:4px;cursor:pointer}
.k-kod:hover,.k-yer [data-git]:hover,.k-sec:hover{color:var(--vscode-textLink-foreground)}
.k-yer [data-git],.k-sec{cursor:pointer}
.k-sec{color:var(--vscode-textLink-foreground)}
.k-govde{border-top:1px solid ${KENARLIK}}
.ks{display:grid;grid-template-columns:76px 1fr 14px;align-items:baseline;gap:8px;padding:3px 4px;border-radius:3px;font-size:12px}
.ks[data-git]{cursor:pointer}
.ks[data-git]:hover,.ks .ks-ad[data-git]:hover{background:var(--vscode-list-hoverBackground)}
.ks[data-git]:hover .tr-git{opacity:1}
.ks.yok .ks-d{color:var(--vscode-descriptionForeground);font-style:italic}
.ks-ad{font-size:10px;letter-spacing:.05em;text-transform:uppercase;color:var(--vscode-descriptionForeground)}
.ks-ad[data-git]{cursor:pointer;border-radius:3px}
.ks-d{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ks.cok .ks-d{white-space:normal;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical}
.ks.kenar{grid-template-columns:76px 1fr}
.ks.kenar .ks-d{white-space:normal;display:flex;flex-wrap:wrap;gap:3px}
.hd{display:inline-block;padding:0 6px;border:1px solid var(--vscode-widget-border,rgba(128,128,128,.35));border-radius:9px;font-size:11px;line-height:16px;cursor:pointer}
.hd:hover{border-color:var(--tul-vurgu)}
.hd.cozulmedi{border-style:dashed;opacity:.75}
/* Tanıma git oku: tek bir maske; satır başına SVG basılmaz. */
.tr-git{display:inline-block;flex:none;width:12px;height:12px;opacity:.35;align-self:center;background:var(--vscode-textLink-foreground);
  -webkit-mask:url("${GIT_MASKESI}") center/12px 12px no-repeat;mask:url("${GIT_MASKESI}") center/12px 12px no-repeat}
.k-alt{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;padding-top:6px;border-top:1px solid ${KENARLIK}}
.ad-c{display:inline-flex;align-items:baseline;gap:4px;padding:1px 7px;border:1px solid var(--vscode-widget-border,rgba(128,128,128,.35));border-radius:9px;
  background:none;font:inherit;font-size:11px;cursor:pointer;color:var(--vscode-descriptionForeground)}
.ad-c b{color:var(--vscode-foreground);font-size:12px}
.ad-c:hover,.ad-c[aria-expanded="true"]{border-color:var(--tul-vurgu);color:var(--vscode-foreground)}
.ad-c.sifir{opacity:.45;cursor:default}
.k-alt-liste{margin-top:4px}
.k-alt-liste[hidden]{display:none}
.ks.alt .ks-d{font-size:11px}
/* GELİŞTİRMEDEKİ İŞ: Tren ağacı sağ sütunda profilin altında durur. */
.tr-is{border-top:1px solid ${KENARLIK};margin-top:4px;padding-top:2px}
`;

/** İstemci betiği. Veri üretmez; seçim, ekip açma ve iplik çizimi yapar, gezinmeyi anahtarla eklentiye iletir. */
export const TREN_BETIGI = `
(function () {
  'use strict';
  var kopru = window.sarmalKopru;
  var secili = '';
  var acik = Object.create(null);
  /** Son çizimde iplikle bağlanan yönetici > üye çiftleri. */
  var ciftler = [];
  function kap() { return document.getElementById('panel-tren'); }
  function sema() { var k = kap(); return k ? k.querySelector('#tren-sema') : null; }
  function kacirSel(s) { return String(s).replace(/(["\\\\])/g, '\\\\$1'); }
  function dizi(x) { return Array.prototype.slice.call(x || []); }

  // ── İplikler: açık ekibin yöneticisinden her üyeye yelpaze; seçili apex'ten yönettiği köklere ──
  function iplikCiz(yeniGrup) {
    var s = sema();
    if (!s) return;
    var svg = s.querySelector('svg.tr-iplik');
    if (!svg) return;
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    if (!s.getClientRects().length) { svg.innerHTML = ''; return; }
    var r = s.getBoundingClientRect(), sx = s.scrollLeft, sy = s.scrollTop;
    var yer = function (el) {
      var b = el.getBoundingClientRect();
      return { l: b.left - r.left + sx, t: b.top - r.top + sy, r: b.right - r.left + sx, b: b.bottom - r.top + sy, h: b.height, w: b.width };
    };
    var yollar = [];
    ciftler = [];
    var ekle = function (yol, vurgu, yeni) {
      yollar.push('<path class="' + (vurgu ? 'vurgu' : '') + (yeni ? ' yeni' : '') + '" d="' + yol + '"/>');
    };
    dizi(s.querySelectorAll('.tr-grup')).forEach(function (g) {
      var ast = g.querySelector(':scope > .tr-astlar');
      var kutu = g.querySelector(':scope > .ajan');
      if (!ast || ast.hidden || !kutu) return;
      var kod = g.getAttribute('data-grup');
      var a = yer(kutu), x1 = a.l + 12, y1 = a.b;
      dizi(ast.children).forEach(function (c) {
        var hedef = c.classList.contains('tr-grup') ? c.querySelector(':scope > .ajan') : c;
        if (!hedef || !hedef.getClientRects().length) return;
        var b = yer(hedef), x2 = b.l, y2 = b.t + b.h / 2;
        ciftler.push(kod + '>' + hedef.getAttribute('data-kod'));
        ekle('M ' + x1 + ' ' + y1 + ' C ' + x1 + ' ' + (y1 + (y2 - y1) * 0.55) + ', ' + (x1 + (x2 - x1) * 0.15) + ' ' + y2 + ', ' + x2 + ' ' + y2,
          kod === secili || hedef.getAttribute('data-kod') === secili, yeniGrup === kod);
      });
    });
    var apex = secili ? s.querySelector('.tr-apex .ajan[data-kod="' + kacirSel(secili) + '"]') : null;
    if (apex) {
      var a2 = yer(apex), ax = a2.l + a2.w / 2, ay = a2.b;
      dizi(s.querySelectorAll('.tr-depler .ajan[data-ust="' + kacirSel(secili) + '"]')).forEach(function (k) {
        if (!k.getClientRects().length) return;
        var b = yer(k), bx = b.l + Math.min(24, b.w / 2), by = b.t;
        ekle('M ' + ax + ' ' + ay + ' C ' + ax + ' ' + (ay + (by - ay) * 0.5) + ', ' + bx + ' ' + (ay + (by - ay) * 0.5) + ', ' + bx + ' ' + by, true, false);
      });
    }
    svg.setAttribute('width', String(s.scrollWidth));
    svg.setAttribute('height', String(s.scrollHeight));
    svg.innerHTML = yollar.join('');
    dizi(svg.querySelectorAll('path.yeni')).forEach(function (p) {
      try { p.style.setProperty('--l', String(Math.ceil(p.getTotalLength()) + 2)); } catch (x) { /* uzunluk ölçülemezse çizgi canlandırmasız görünür */ }
    });
  }
  var cizimBekliyor = false;
  function cizimIste() {
    if (cizimBekliyor) return;
    cizimBekliyor = true;
    requestAnimationFrame(function () { cizimBekliyor = false; iplikCiz(''); });
  }

  // ── Profil kartı: veri niteliğinden kurulur (tren-gorunum.ts KartVerisi); metin yalnız textContent ile yazılır ──
  var veri = null;
  function veriOku() {
    var el = document.getElementById('tren-veri');
    veri = null;
    if (!el) return;
    try { veri = JSON.parse(el.textContent || 'null'); } catch (x) { veri = null; }
  }
  function ogeYap(etiket, sinif, metin) {
    var o = document.createElement(etiket);
    if (sinif) o.className = sinif;
    if (metin !== undefined && metin !== null) o.textContent = String(metin);
    return o;
  }
  function gidilir(o, anahtar, baslik) {
    o.setAttribute('role', 'button');
    o.setAttribute('tabindex', '0');
    o.setAttribute('data-git', anahtar);
    if (baslik) o.title = baslik;
    return o;
  }
  function ok() { var i = ogeYap('i', 'tr-git'); i.setAttribute('aria-hidden', 'true'); return i; }
  function kartKur(v) {
    var M = veri.m;
    var k = v.k;
    var kart = ogeYap('section', 'kart');
    kart.setAttribute('data-kart', k);
    kart.setAttribute('aria-label', v.a);
    var bas = ogeYap('header', 'k-bas ' + v.s);
    var ad = ogeYap('div', 'k-ad', v.a);
    if (v.t) ad.appendChild(ogeYap('span', 'k-tur', v.t));
    bas.appendChild(ad);
    var kod = gidilir(ogeYap('div', 'k-kod', k), 'e|' + k, M.tanimaGit);
    kod.appendChild(ok());
    bas.appendChild(kod);
    var yer = ogeYap('div', 'k-yer');
    var parca = [];
    if (v.d) parca.push(gidilir(ogeYap('span', '', v.d), 'r|' + k + '|d', M.tanimaGit));
    if (v.e) parca.push(gidilir(ogeYap('span', '', v.e), 'r|' + k + '|k', M.tanimaGit));
    if (v.m) {
      var y = ogeYap('span', '', M.yoneticisi + ' ');
      var ys = ogeYap('span', 'k-sec', v.m[1]);
      ys.setAttribute('role', 'button');
      ys.setAttribute('tabindex', '0');
      ys.setAttribute('data-sec', v.m[0]);
      y.appendChild(ys);
      parca.push(y);
    } else if (v.n) parca.push(ogeYap('span', 'rz-y', M.yoneticisiYok));
    parca.forEach(function (p, i) { if (i) yer.appendChild(document.createTextNode(' · ')); yer.appendChild(p); });
    bas.appendChild(yer);
    // Yol satırı: lider ajan (yoksa yokluğu) › departman › yönetim zinciri › ajan; zincirdeki ajan seçilebilir.
    var yol = ogeYap('div', 'k-yol');
    yol.setAttribute('aria-label', M.yolEtiketi);
    if (v.t !== 'apex') yol.appendChild(ogeYap('span', '', v.l || M.liderYok));
    if (v.d) yol.appendChild(ogeYap('span', '', v.d));
    (v.p || []).forEach(function (z) {
      var s = ogeYap('span', '', z[1]);
      s.setAttribute('role', 'button'); s.setAttribute('tabindex', '0'); s.setAttribute('data-sec', z[0]);
      yol.appendChild(s);
    });
    yol.appendChild(ogeYap('span', '', v.a));
    bas.appendChild(yol);
    kart.appendChild(bas);
    var govde = ogeYap('div', 'k-govde');
    v.f.forEach(function (f, i) {
      var satir;
      if (f) {
        satir = gidilir(ogeYap('div', 'ks' + (i >= 3 ? ' cok' : '')), 'a|' + k + '|' + f[0], M.tanimaGit);
        satir.appendChild(ogeYap('span', 'ks-ad', M.alan[i]));
        satir.appendChild(ogeYap('span', 'ks-d', f[1]));
        satir.appendChild(ok());
      } else {
        satir = ogeYap('div', 'ks yok');
        satir.appendChild(ogeYap('span', 'ks-ad', M.alan[i]));
        satir.appendChild(ogeYap('span', 'ks-d', M.ilanEdilmemis));
      }
      govde.appendChild(satir);
    });
    [['u', 'uygular', v.f.length, v.u, v.uv], ['y', 'yonetir', v.f.length + 1, v.y, v.yv]].forEach(function (x) {
      var hedefler = x[3];
      if (x[0] === 'y' && !hedefler.length) return;
      var satir = ogeYap('div', hedefler.length ? 'ks kenar' : 'ks yok');
      var ad2 = ogeYap('span', 'ks-ad', M.alan[x[2]]);
      if (hedefler.length && x[4]) gidilir(ad2, 'a|' + k + '|' + x[1], M.tanimaGit);
      satir.appendChild(ad2);
      var d = ogeYap('span', 'ks-d', hedefler.length ? null : M.ilanEdilmemis);
      hedefler.forEach(function (h, i) { d.appendChild(gidilir(ogeYap('span', 'hd' + (h[1] ? '' : ' cozulmedi'), h[0]), x[0] + '|' + k + '|' + i, M.tanimaGit)); });
      satir.appendChild(d);
      govde.appendChild(satir);
    });
    kart.appendChild(govde);
    var alt = ogeYap('div', 'k-alt');
    var listeler = [];
    M.alt.forEach(function (tipAdi, ti) {
      var ogeler = [];
      v.c.forEach(function (c, i) { if (c[0] === ti) ogeler.push([c, i]); });
      if (!ogeler.length) { var z = ogeYap('span', 'ad-c sifir'); z.appendChild(ogeYap('b', '', '0')); z.appendChild(document.createTextNode(tipAdi)); alt.appendChild(z); return; }
      var dugme = ogeYap('button', 'ad-c');
      dugme.type = 'button';
      dugme.setAttribute('data-alt', String(ti));
      dugme.setAttribute('aria-expanded', 'false');
      dugme.appendChild(ogeYap('b', '', String(ogeler.length)));
      dugme.appendChild(document.createTextNode(tipAdi));
      alt.appendChild(dugme);
      var liste = ogeYap('div', 'k-alt-liste');
      liste.setAttribute('data-alt-liste', String(ti));
      liste.hidden = true;
      ogeler.forEach(function (o) {
        var c = o[0];
        var satir = gidilir(ogeYap('div', 'ks alt'), 'c|' + k + '|' + o[1], M.tanimaGit);
        satir.appendChild(ogeYap('span', 'ks-ad', tipAdi));
        satir.appendChild(ogeYap('span', 'ks-d', c[2] ? c[1] + ' · ' + c[2] : c[1]));
        satir.appendChild(ok());
        liste.appendChild(satir);
      });
      listeler.push(liste);
    });
    kart.appendChild(alt);
    listeler.forEach(function (l) { kart.appendChild(l); });
    return kart;
  }

  // ── Seçim ve profil kartı ──
  function grubuAc(g, ac) {
    var ast = g.querySelector(':scope > .tr-astlar');
    var d = g.querySelector(':scope > .tr-ac');
    if (!ast || !d) return;
    ast.hidden = !ac;
    d.setAttribute('aria-expanded', ac ? 'true' : 'false');
    d.textContent = d.getAttribute(ac ? 'data-kapa-metni' : 'data-ac-metni');
    var kod = g.getAttribute('data-grup');
    if (ac) acik[kod] = true; else delete acik[kod];
  }
  function sec(kod, gorunsun) {
    var k = kap();
    if (!k) return;
    var v = null;
    if (kod && veri && Array.isArray(veri.a)) v = veri.a.filter(function (x) { return x.k === kod; })[0] || null;
    if (!v) kod = '';
    secili = kod;
    dizi(k.querySelectorAll('.ajan.secili, .cip.secili')).forEach(function (x) { x.classList.remove('secili'); });
    var yuva = k.querySelector('.tr-kart-yuva');
    var kart = null;
    if (yuva) {
      yuva.textContent = '';
      if (v) { kart = kartKur(v); yuva.appendChild(kart); }
    }
    var ipucu = k.querySelector('.tr-profil-ipucu');
    if (ipucu) ipucu.hidden = !!kart;
    if (kod) {
      var kutu = null;
      dizi(k.querySelectorAll('[data-kod="' + kacirSel(kod) + '"]')).forEach(function (x) { x.classList.add('secili'); kutu = kutu || x; });
      if (gorunsun && kutu) {
        // Seçilen ajan kapalı bir ekipteyse ekip açılır.
        for (var g = kutu.parentElement && kutu.parentElement.closest('.tr-astlar'); g; g = g.parentElement && g.parentElement.closest('.tr-astlar')) {
          if (g.hidden) grubuAc(g.parentElement, true);
        }
        kutu.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    }
    iplikCiz('');
  }

  // Eklenti Tren sekmesinin içeriğini yeniden gönderdiğinde (ana betik onu yazdıktan sonra) seçim ve açık ekipler korunur.
  function yenidenUygula() {
    var k = kap();
    if (!k) return;
    veriOku();
    Object.keys(acik).forEach(function (kod) {
      var g = k.querySelector('.tr-grup[data-grup="' + kacirSel(kod) + '"]');
      if (g) grubuAc(g, true); else delete acik[kod];
    });
    sec(secili, false);
  }
  // Görünüm geçişi (PNL-A11): ayar değişince eklenti yalnız görünümün adını gönderir; içerik yeniden
  // üretilmez, kap niteliği değişir ve iplikler yeni dizilişe göre yeniden ölçülür.
  function gorunumYaz(ad) {
    var s = sema();
    if (!s || ['seritler'].indexOf(ad) < 0) return;
    s.setAttribute('data-gorunum', ad);
    iplikCiz('');
  }
  window.addEventListener('message', function (e) {
    var m = e.data || {};
    if (m.tip === 'bolum' && m.sekme === 'tren') yenidenUygula();
    else if (m.tip === 'trenSemaGorunum') gorunumYaz(m.ad);
    else if (m.tip === 'trenSinama') {
      // Yalnız sınama kipinde gelir: istenirse bütün ekipler açılır ve görünüm seçilir, sonra durum raporlanır.
      if (m.hepsiniAc) dizi(document.querySelectorAll('#panel-tren .tr-grup')).forEach(function (g) { grubuAc(g, true); });
      if (m.gorunum) gorunumYaz(m.gorunum);
      if (m.sec) sec(m.sec, true);
      iplikCiz('');
      if (kopru) kopru.gonder({ tip: 'sinamaRapor', kayitlar: trenDurumu() });
    }
  });

  /** Sınama ve görsel kontrol için Tren'in anlık durumu (seçim, açık ekipler, iplik sayısı, görünen kart). */
  function trenDurumu() {
    var k = kap();
    var s = sema();
    var kart = k ? dizi(k.querySelectorAll('.kart')).filter(function (x) { return !x.hidden; })[0] : null;
    var gorunen = s ? dizi(s.querySelectorAll('.ajan[data-kod], .cip[data-kod]')).filter(function (x) { return x.getClientRects().length; })
      .map(function (x) { return x.getAttribute('data-kod'); }).sort() : [];
    return {
      secili: secili, acik: Object.keys(acik), iplik: s ? s.querySelectorAll('svg.tr-iplik path').length : 0,
      kart: kart ? kart.getAttribute('data-kart') : '', ajan: s ? s.querySelectorAll('.ajan, .cip').length : 0,
      gorunum: s ? s.getAttribute('data-gorunum') : '', gorunen: gorunen, ciftler: ciftler.slice().sort(),
      anahtarlar: kart ? dizi(kart.querySelectorAll('[data-git]')).map(function (x) { return x.getAttribute('data-git'); }) : [],
    };
  }
  window.__trenDurumu = trenDurumu;

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest || !t.closest('#panel-tren')) return;
    var git = t.closest('[data-git]');
    if (git) {
      e.preventDefault();
      if (git.getAttribute('aria-disabled') !== 'true' && kopru) kopru.gonder({ tip: 'trenGit', anahtar: git.getAttribute('data-git') });
      return;
    }
    var ac = t.closest('.tr-ac');
    if (ac) {
      var g = ac.closest('.tr-grup');
      var acilacak = ac.getAttribute('aria-expanded') !== 'true';
      grubuAc(g, acilacak);
      iplikCiz(acilacak ? g.getAttribute('data-grup') : '');
      return;
    }
    var alt = t.closest('.ad-c[data-alt]');
    if (alt) {
      var kart = alt.closest('.kart');
      var liste = kart && kart.querySelector('.k-alt-liste[data-alt-liste="' + kacirSel(alt.getAttribute('data-alt')) + '"]');
      if (!liste) return;
      var acilsin = liste.hidden;
      dizi(kart.querySelectorAll('.k-alt-liste')).forEach(function (x) { x.hidden = true; });
      dizi(kart.querySelectorAll('.ad-c[data-alt]')).forEach(function (x) { x.setAttribute('aria-expanded', 'false'); });
      liste.hidden = !acilsin;
      alt.setAttribute('aria-expanded', acilsin ? 'true' : 'false');
      return;
    }
    var yon = t.closest('[data-sec]');
    if (yon) { sec(yon.getAttribute('data-sec'), true); return; }
    var aj = t.closest('.ajan[data-kod], .cip[data-kod]');
    if (aj) sec(aj.getAttribute('data-kod'), false);
  });
  // Rol olarak düğme olan yazılar (tanıma git, yöneticiye git) Enter ve Space ile de çalışır.
  document.addEventListener('keydown', function (e) {
    var t = e.target;
    if (!t || !t.closest || (e.key !== 'Enter' && e.key !== ' ')) return;
    if (!t.closest('#panel-tren') || t.tagName === 'BUTTON') return;
    if (t.matches('[data-git], [data-sec]')) { e.preventDefault(); t.click(); }
  });
  // Sekme görünür olunca ya da panel boyutu değişince iplikler yeniden ölçülür.
  if (typeof ResizeObserver === 'function' && kap()) new ResizeObserver(cizimIste).observe(kap());
  yenidenUygula();
})();
`;

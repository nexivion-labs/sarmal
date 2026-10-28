// ═══════════════════════════════════════════════════════════════════════════
// tren-canli-betik.ts — 🔌 TREN CANLI YUVASININ STİLİ VE İSTEMCİ BETİĞİ (PNL-A13 · SAF)
//
//   Kardeş eklenti kaydolunca Tren sekmesinin üstünde "Plan | Canlı" seçicisi
//   durur (tren-yuvasi.ts sözleşmesi). Görünüm geçişi tamamen webview'in içinde
//   olur ve eklentiyi beklemez (PNL-A18 ilkesi); eklentiye yalnız haber gider,
//   görünürlük oradan kardeşe bildirilir. Seçim sekme kabının bir niteliğidir
//   (`data-tren-gorunum`), böylece açık yüzün kendi düzeni sarılmadan gizlenir.
//
//   Gövde gölge kökte açılır: kardeşin HTML'i belgeye ham girmez, `#tren-canli-veri`
//   öğesinin METNİ olarak gelir ve `#tren-canli` kabının gölge köküne yazılır.
//   Gölge köke yazılan betik çalışmaz; kimlikler ve stiller panelden yalıtılır.
//   `data-eylem` taşıyan öğeye tıklama kardeşe `trenCanliEylem` iletisiyle gider.
// ═══════════════════════════════════════════════════════════════════════════

const KENARLIK = "var(--vscode-sideBarSectionHeader-border,var(--vscode-panel-border,rgba(128,128,128,.35)))";

export const TREN_CANLI_STILI = `
/* TREN · CANLI YUVASI (PNL-A13) */
.tr-gorunumler{flex:none;display:flex;gap:2px;padding:4px 12px;border-bottom:1px solid ${KENARLIK}}
.tr-gs{padding:1px 10px;border:1px solid transparent;border-radius:10px;background:none;cursor:pointer;font:inherit;font-size:11px;line-height:16px;
  color:var(--vscode-descriptionForeground)}
.tr-gs:hover{color:var(--vscode-foreground)}
.tr-gs[aria-selected="true"]{color:var(--vscode-foreground);border-color:var(--vscode-focusBorder)}
.tr-gs:focus-visible{outline:1px solid var(--vscode-focusBorder);outline-offset:1px}
#panel-tren[data-tren-gorunum="canli"]>:not(.tr-gorunumler):not(.tr-canli){display:none!important}
#panel-tren:not([data-tren-gorunum="canli"])>.tr-canli{display:none!important}
.tr-canli{flex:1 1 auto;min-height:0;overflow:auto;padding:6px 12px 12px}
#tren-canli{display:block}
`;

/** İstemci betiği: görünüm seçimi, gölge kökte gövde ve eylem iletimi. */
export const TREN_CANLI_BETIGI = `
(function () {
  'use strict';
  var kopru = window.sarmalKopru;
  var gorunum = 'plan';
  function kap() { return document.getElementById('panel-tren'); }
  function govdeYaz(html) {
    var ev = document.getElementById('tren-canli');
    if (!ev) return;
    var kok = ev.shadowRoot || ev.attachShadow({ mode: 'open' });
    kok.innerHTML = typeof html === 'string' ? html : '';
  }
  function govdeKur() {
    var veri = document.getElementById('tren-canli-veri');
    if (veri) govdeYaz(veri.textContent || '');
  }
  function sec(ad, bildir) {
    var k = kap();
    if (!k) return;
    var seci = k.querySelector('.tr-gorunumler');
    if (!seci) ad = 'plan';
    gorunum = ad === 'canli' ? 'canli' : 'plan';
    if (seci) k.setAttribute('data-tren-gorunum', gorunum); else k.removeAttribute('data-tren-gorunum');
    Array.prototype.forEach.call(k.querySelectorAll('.tr-gs'), function (b) {
      var s = b.getAttribute('data-tren-gorunum') === gorunum;
      b.setAttribute('aria-selected', s ? 'true' : 'false');
      b.setAttribute('tabindex', s ? '0' : '-1');
    });
    if (bildir && kopru) kopru.gonder({ tip: 'trenGorunum', ad: gorunum });
  }
  function canliDurumu() {
    var k = kap();
    var ev = document.getElementById('tren-canli');
    var kok = ev && ev.shadowRoot;
    var c = k && k.querySelector('.tr-canli');
    return {
      secici: !!(k && k.querySelector('.tr-gorunumler')), gorunum: gorunum,
      canliGorunur: !!(c && c.getClientRects().length), metin: kok ? kok.textContent.replace(/\\s+/g, ' ').trim() : '',
      planGorunur: !!(k && k.querySelector('#tren-agac') && (k.querySelector('.tren-duzen, #tren-agac').getClientRects().length > 0)),
    };
  }
  window.__trenCanliDurumu = canliDurumu;
  // Gölge kökteki data-eylem tıklaması: olay gölge kökten belgeye kabarır, yol composedPath ile okunur.
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t && t.closest && t.closest('.tr-gs')) { sec(t.closest('.tr-gs').getAttribute('data-tren-gorunum'), true); return; }
    var ev = document.getElementById('tren-canli');
    if (!ev || !ev.shadowRoot) return;
    var yol = e.composedPath ? e.composedPath() : [];
    if (yol.indexOf(ev) < 0) return;
    for (var i = 0; i < yol.length && yol[i] !== ev; i++) {
      var n = yol[i];
      if (n && n.getAttribute && n.hasAttribute('data-eylem')) {
        e.preventDefault();
        if (kopru) kopru.gonder({ tip: 'trenCanliEylem', eylem: n.getAttribute('data-eylem'), deger: n.getAttribute('data-deger') || undefined });
        return;
      }
    }
  });
  window.addEventListener('message', function (e) {
    var m = e.data || {};
    if (m.tip === 'bolum' && m.sekme === 'tren') { govdeKur(); sec(gorunum, false); }
    else if (m.tip === 'trenCanli') govdeYaz(m.html);
    else if (m.tip === 'trenSinamaGorunum') {
      // Yalnız sınama kipinde gelir: seçicinin düğmesine gerçek bir tıklama gönderilir.
      var b = document.querySelector('#panel-tren .tr-gs[data-tren-gorunum="' + (m.ad === 'canli' ? 'canli' : 'plan') + '"]');
      if (b) b.click();
      if (kopru) kopru.gonder({ tip: 'sinamaRapor', kayitlar: canliDurumu() });
    } else if (m.tip === 'trenSinamaCanliTikla') {
      var ev = document.getElementById('tren-canli');
      var hedef = ev && ev.shadowRoot && ev.shadowRoot.querySelector('[data-eylem]');
      if (hedef) hedef.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true, view: window }));
      if (kopru) kopru.gonder({ tip: 'sinamaRapor', kayitlar: canliDurumu() });
    } else if (m.tip === 'trenSinamaCanli') {
      if (kopru) kopru.gonder({ tip: 'sinamaRapor', kayitlar: canliDurumu() });
    }
  });
  govdeKur();
  sec('plan', false);
})();
`;

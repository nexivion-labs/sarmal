// ═══════════════════════════════════════════════════════════════════════════
// panel-betik.ts — 🧭 SARMAL PANELİNİN STİLİ VE İSTEMCİ BETİĞİ (SAF — vscode importsuz)
//
//   Founder 2026-10-21: Sarmal kabı tek bir webview görünümüdür (`sarmalPanel`).
//   Üstte Ray · Tren · Makinist sekme şeridi, altında seçili sekmenin içeriği.
//   Bu dosya yalnız iki metin taşır: stil ve betik. Veri ve HTML üretimi
//   panel-cekirdek.ts dosyasındadır; betik veri üretmez, yalnız gelen HTML'i yerine
//   koyar ve kullanıcı eylemlerini eklentiye iletir.
//
//   Renkler yalnız `var(--vscode-*)` değişkenlerinden gelir (açık ve koyu tema).
//   Tek istisna Founder'ın seçtiği marka mavisidir (#2685F2, seçili sekme çizgisi).
//   Betik nonce'lu tek bloktur; içeriğe gömülen hiçbir şey betik taşıyamaz çünkü
//   bütün metinler kaçırılarak basılır.
// ═══════════════════════════════════════════════════════════════════════════

/** Seçili sekmenin alt çizgisi: Founder'ın verdiği marka mavisi. */
export const MARKA_MAVISI = "#2685F2";

export const PANEL_STILI = `
:root{color-scheme:light dark}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{background:transparent;color:var(--vscode-foreground);font-family:var(--vscode-font-family);font-size:13px;line-height:1.4;padding:0}
button{font:inherit;color:inherit}
.seritler{position:sticky;top:0;z-index:5;display:flex;align-items:stretch;height:32px;margin:0;padding:0;
  background:var(--vscode-sideBar-background);border-bottom:1px solid var(--vscode-sideBarSectionHeader-border,var(--vscode-panel-border,rgba(128,128,128,.35)))}
.sekme{display:inline-flex;align-items:center;gap:6px;flex:0 1 auto;min-width:0;height:100%;padding:0 12px;margin:0;border:0;border-radius:0;
  background:none;cursor:pointer;color:var(--vscode-descriptionForeground);font-size:13px;white-space:nowrap;opacity:.85}
.sekme svg{flex:none;width:16px;height:16px}
.sekme .sk-ad{overflow:hidden;text-overflow:ellipsis}
.sekme:hover{color:var(--vscode-foreground);opacity:1}
.sekme[aria-selected="true"]{color:var(--vscode-foreground);opacity:1;box-shadow:inset 0 -2px 0 ${MARKA_MAVISI}}
.sekme:focus-visible{outline:1px solid var(--vscode-focusBorder);outline-offset:-2px}
.rozet{display:inline-block;min-width:16px;padding:0 4px;border-radius:8px;text-align:center;font-size:11px;line-height:16px;
  background:var(--vscode-badge-background);color:var(--vscode-badge-foreground)}
#icerik{padding:0 0 12px}
.bas{margin:0;padding:10px 12px 4px 12px;font-size:11px;font-weight:600;letter-spacing:.06em;color:var(--vscode-descriptionForeground)}
.bas.araya{margin-top:6px;padding-top:12px}
.bb{display:inline-flex;align-items:center;gap:2px;margin:0 0 0 -16px;padding:0;border:0;background:none;cursor:pointer;
  font:inherit;letter-spacing:inherit;color:inherit;text-transform:inherit}
.bb:hover{color:var(--vscode-foreground)}
.bb:focus-visible{outline:1px solid var(--vscode-focusBorder);outline-offset:1px}
.bb[aria-expanded="true"] .ok svg{transform:rotate(90deg)}
.bas:has(.bb){padding-left:20px}
/* KAPALI MİNİ GRAF ALTA YAPIŞIR: eski ayrı görünümlerde VS Code katlanan Mini Graf'ın başlığını
   kabın dibine koyar, boş alanı Yol Haritasına verirdi. Tek webview'de bu davranış yerleşimle
   kurulur: Ray içeriği en az pencere boyundadır, açık Yol Haritası boş alanı doldurur (açılan Mini
   Graf alttan yukarı açılır) ve katlanmış Mini Graf başlığı uzun ağaçta da ekranın dibinde kalır. */
#icerik:has(>#bolum-graf){display:flex;flex-direction:column;min-height:calc(100vh - 32px);padding-bottom:0}
#icerik>#bolum-agac{flex:1 0 auto}
.bas.araya:has(>.bb[aria-expanded="false"]){position:sticky;bottom:0;z-index:4;background:var(--vscode-sideBar-background)}
.bos{margin:0;padding:8px 12px;color:var(--vscode-descriptionForeground)}
.kardes{margin:0;padding:8px 12px}
.kardes a{color:var(--vscode-textLink-foreground);text-decoration:none;cursor:pointer}
.kardes a:hover{text-decoration:underline}
.kardes a:focus-visible{outline:1px solid var(--vscode-focusBorder)}
[role="tree"]{outline:none}
.sat{position:relative;display:flex;align-items:center;height:22px;padding:0 8px 0 calc(var(--d,0) * 12px + 2px);cursor:pointer;white-space:nowrap;
  color:var(--vscode-foreground)}
/* GİRİNTİ KILAVUZLARI: eski yerel ağaç görünümünün (VS Code TreeView) çizgileri aynen geri
   gelir. Her ata kademesi için bir dikey çizgi, atanın açma okunun ortasından (12k+10 px) iner.
   Ağacın üzerine gelinince bütün kılavuzlar soluk görünür (VS Code varsayılanı "onHover");
   seçili satırın kardeşlerini bağlayan etkin kılavuz her zaman görünür (betikteki kilavuzYaz). */
.sat::before{content:"";position:absolute;left:0;top:0;bottom:0;width:calc(var(--d,0) * 12px);pointer-events:none;opacity:0;
  background:linear-gradient(to right,transparent 10px,var(--vscode-tree-inactiveIndentGuidesStroke,rgba(128,128,128,.4)) 10px,var(--vscode-tree-inactiveIndentGuidesStroke,rgba(128,128,128,.4)) 11px,transparent 11px) 0 0/12px 100% repeat-x}
[role="tree"]:hover .sat::before{opacity:1}
.sat.kl::after{content:"";position:absolute;left:calc(var(--ka,0) * 12px + 10px);top:0;bottom:0;width:0;pointer-events:none;
  border-left:1px solid var(--vscode-tree-indentGuidesStroke,rgba(128,128,128,.7))}
.sat:hover{background:var(--vscode-list-hoverBackground)}
.sat.sec{background:var(--vscode-list-inactiveSelectionBackground)}
body:focus-within .sat.sec{background:var(--vscode-list-activeSelectionBackground);color:var(--vscode-list-activeSelectionForeground)}
.sat:focus{outline:none}
.sat:focus-visible{outline:1px solid var(--vscode-focusBorder);outline-offset:-1px}
.ok{flex:none;display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;color:var(--vscode-icon-foreground,currentColor)}
.ok svg{width:16px;height:16px;transition:transform .08s linear}
.sat[aria-expanded="true"] .ok svg{transform:rotate(90deg)}
.kt{flex:none;width:14px;height:14px;margin:0 6px 0 2px;accent-color:var(--vscode-focusBorder);cursor:pointer}
.ik{flex:none;display:inline-block;width:16px;height:16px;margin-right:6px;background-repeat:no-repeat;background-position:center;background-size:16px 16px}
svg.ik{background:none}
.et{flex:0 1 auto;min-width:3ch;overflow:hidden;text-overflow:ellipsis}
.ac{flex:0 2 auto;min-width:0;margin-left:8px;overflow:hidden;text-overflow:ellipsis;color:var(--vscode-descriptionForeground);font-size:12px}
.sat.sec .ac{color:inherit;opacity:.85}
.rz{flex:none;margin-left:6px;font-weight:600}
.eyler{flex:none;display:none;margin-left:auto;padding-left:6px}
.sat:hover .eyler,.sat:focus-within .eyler{display:inline-flex}
.ey{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;padding:0;margin-left:2px;border:0;border-radius:4px;
  background:none;cursor:pointer;color:var(--vscode-icon-foreground,currentColor)}
.ey:hover{background:var(--vscode-toolbar-hoverBackground)}
.ey:focus-visible{outline:1px solid var(--vscode-focusBorder)}
.ey svg{width:14px;height:14px}
.don{animation:don 1.2s linear infinite;transform-origin:50% 50%}
@keyframes don{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.don{animation:none}}
/* Mini Graf kendi kutusundan taşamaz: gölge kökteki bir çizim (ör. satırlardan uzun bir bağ
   şeridi) gövdenin dışına taşarsa belge gövdeden uzun olur ve yapışkan sekme şeridi gövdenin
   sonunda ekrandan çıkar (Founder ekranı 2026-10-22). Taşma kutunun içinde kalır. */
#graf{display:block;overflow-x:auto}
`;

/** İstemci betiği. Veri üretmez; ileti köprüsü, klavye ve parça değiştirme yapar. */
export const PANEL_BETIGI = `
(function () {
  'use strict';
  var api = acquireVsCodeApi();
  var SEKMELER = ['ray', 'tren', 'makinist'];
  var seciliSatir = '';
  var $ = function (id) { return document.getElementById(id); };
  function gonder(m) { api.postMessage(m); }
  function kacirSel(s) { return String(s).replace(/(["\\\\])/g, '\\\\$1'); }

  // ── Sekme şeridi ───────────────────────────────────────────────────────────
  function sekmeler() { return Array.prototype.slice.call(document.querySelectorAll('.sekme')); }
  function sekmeIsaretle(ad) {
    sekmeler().forEach(function (b) {
      var s = b.getAttribute('data-sekme') === ad;
      b.setAttribute('aria-selected', s ? 'true' : 'false');
      b.setAttribute('tabindex', s ? '0' : '-1');
    });
  }
  function sekmeSec(ad, odakla) {
    if (SEKMELER.indexOf(ad) < 0) return;
    sekmeIsaretle(ad);
    if (odakla) {
      var b = document.querySelector('.sekme[data-sekme="' + ad + '"]');
      if (b) b.focus();
    }
    gonder({ tip: 'sekme', ad: ad });
  }

  // ── Mini Graf: gölge kökte çizilir, komut bağları iletiye çevrilir ──────────
  function grafYaz(html) {
    var ev = $('graf');
    if (!ev) return;
    var kok = ev.shadowRoot || ev.attachShadow({ mode: 'open' });
    kok.innerHTML = html;
  }
  function grafKur() {
    var t = $('graf-sablon');
    if (t && $('graf')) grafYaz(t.innerHTML);
  }

  // ── Parça değiştirme: odak ve seçim korunur ────────────────────────────────
  function odakKimligi() {
    var a = document.activeElement;
    var s = a && a.closest ? a.closest('.sat') : null;
    return s ? s.getAttribute('data-id') : '';
  }
  function satirBul(id) { return id ? document.querySelector('.sat[data-id="' + kacirSel(id) + '"]') : null; }
  // Etkin girinti kılavuzu (VS Code TreeView ile aynı kural): seçili satır açıksa kendi
  // çocuklarını, değilse ebeveyninin çocuklarını bağlayan çizgi her zaman görünür.
  function kilavuzYaz() {
    Array.prototype.forEach.call(document.querySelectorAll('.sat.kl'), function (x) { x.classList.remove('kl'); });
    var s = satirBul(seciliSatir);
    var agac = s && s.closest('[role="tree"]');
    if (!agac) return;
    var satirlar = Array.prototype.slice.call(agac.querySelectorAll('.sat'));
    var k = satirlar.indexOf(s);
    var derin = function (x) { return Number(x.getAttribute('data-d') || '0'); };
    var bas = k;
    if (s.getAttribute('aria-expanded') !== 'true') {
      bas = -1;
      for (var u = k - 1; u >= 0; u--) if (derin(satirlar[u]) < derin(s)) { bas = u; break; }
      if (bas < 0) return;
    }
    var kademe = derin(satirlar[bas]);
    for (var j = bas + 1; j < satirlar.length && derin(satirlar[j]) > kademe; j++) {
      satirlar[j].classList.add('kl');
      satirlar[j].style.setProperty('--ka', String(kademe));
    }
  }
  function secimiGeriYukle(odakId) {
    var s = satirBul(seciliSatir);
    if (s) s.classList.add('sec');
    kilavuzYaz();
    var agaclar = document.querySelectorAll('[role="tree"]');
    Array.prototype.forEach.call(agaclar, function (a) {
      var hedef = (odakId && a.querySelector('.sat[data-id="' + kacirSel(odakId) + '"]')) || a.querySelector('.sat.sec') || a.querySelector('.sat');
      var hepsi = a.querySelectorAll('.sat');
      Array.prototype.forEach.call(hepsi, function (x) { x.setAttribute('tabindex', '-1'); });
      if (hedef) hedef.setAttribute('tabindex', '0');
    });
    if (odakId) { var o = satirBul(odakId); if (o) o.focus({ preventScroll: true }); }
  }
  function stilEkle(metin, degistir) {
    var s = $('ikon-stil');
    if (!s || metin === undefined) return;
    s.textContent = degistir ? metin : s.textContent + metin;
  }
  function parcaYaz(kimlik, html) {
    var h = $(kimlik);
    if (!h) return;
    var odak = odakKimligi();
    if (kimlik === 'graf') { grafYaz(html); return; }
    h.innerHTML = html;
    secimiGeriYukle(odak);
  }

  window.addEventListener('message', function (e) {
    var m = e.data || {};
    if (m.tip === 'bolum') {
      sekmeIsaretle(m.sekme);
      stilEkle(m.ikonStili, true);
      var odak = odakKimligi();
      $('icerik').innerHTML = m.html;
      grafKur();
      secimiGeriYukle(odak);
    } else if (m.tip === 'parca') {
      stilEkle(m.ikonStili, true);
      parcaYaz(m.kimlik, m.html);
    } else if (m.tip === 'satir') {
      stilEkle(m.ikonStili, false);
      var s = satirBul(m.id);
      if (s) {
        var t = document.createElement('div');
        t.innerHTML = m.html;
        var yeni = t.firstElementChild;
        if (yeni) {
          var secti = s.classList.contains('sec');
          var tab = s.getAttribute('tabindex');
          s.replaceWith(yeni);
          if (secti) yeni.classList.add('sec');
          if (tab) yeni.setAttribute('tabindex', tab);
          kilavuzYaz();
        }
      }
    } else if (m.tip === 'rozet') {
      var r = document.querySelector('.sekme[data-sekme="makinist"] .rozet');
      if (r) { r.textContent = m.sayi > 0 ? String(m.sayi) : ''; r.hidden = !(m.sayi > 0); }
    } else if (m.tip === 'git') {
      var g = satirBul(m.id);
      if (g) { sec(g); g.focus(); g.scrollIntoView({ block: 'nearest' }); }
    }
  });

  // ── Katlanan başlıklar: Enter, Space ve tıklama gövdeyi katlar; durum eklentide kalıcıdır ──
  function bolumGec(bb) {
    var ac = bb.getAttribute('aria-expanded') !== 'true';
    bb.setAttribute('aria-expanded', ac ? 'true' : 'false');
    var g = $(bb.getAttribute('aria-controls'));
    if (g) g.hidden = !ac;
    gonder({ tip: 'bolumGec', bolum: bb.getAttribute('data-bolum'), ac: ac });
  }

  // ── Seçim ve aç-kapa ───────────────────────────────────────────────────────
  function sec(satir) {
    var eski = document.querySelectorAll('.sat.sec');
    Array.prototype.forEach.call(eski, function (x) { x.classList.remove('sec'); });
    satir.classList.add('sec');
    seciliSatir = satir.getAttribute('data-id') || '';
    kilavuzYaz();
    var agac = satir.closest('[role="tree"]');
    if (agac) {
      Array.prototype.forEach.call(agac.querySelectorAll('.sat'), function (x) { x.setAttribute('tabindex', '-1'); });
      satir.setAttribute('tabindex', '0');
    }
  }
  function gec(satir) {
    if (satir.getAttribute('aria-expanded') === null) return;
    gonder({ tip: 'gec', id: satir.getAttribute('data-id'), ac: satir.getAttribute('aria-expanded') !== 'true' });
  }
  function ac(satir) {
    if (satir.getAttribute('data-komut') === '1') gonder({ tip: 'ac', id: satir.getAttribute('data-id') });
    else gec(satir);
  }

  document.addEventListener('click', function (e) {
    // Gölge kök içindeki bağlar (Mini Graf): yalnız command: bağı iletilir, gezinti yapılmaz.
    var yol = e.composedPath ? e.composedPath() : [];
    for (var i = 0; i < yol.length; i++) {
      var n = yol[i];
      if (n && n.tagName === 'A' && n.getRootNode && n.getRootNode() !== document) {
        e.preventDefault();
        var h = n.getAttribute('href') || '';
        if (h.indexOf('command:') === 0) gonder({ tip: 'komut', href: h });
        return;
      }
    }
    var t = e.target;
    if (!t || !t.closest) return;
    var sek = t.closest('.sekme');
    if (sek) { sekmeSec(sek.getAttribute('data-sekme'), false); return; }
    var bb = t.closest('.bb');
    if (bb) { bolumGec(bb); return; }
    var kardes = t.closest('[data-kardes]');
    if (kardes) { e.preventDefault(); gonder({ tip: 'kardes' }); return; }
    var sat = t.closest('.sat');
    if (!sat) return;
    var id = sat.getAttribute('data-id');
    var ey = t.closest('.ey');
    if (ey) { e.stopPropagation(); gonder({ tip: 'eylem', id: id, komut: ey.getAttribute('data-komut') }); return; }
    var kt = t.closest('input.kt');
    if (kt) { sec(sat); gonder({ tip: 'isaretle', id: id, deger: kt.checked }); return; }
    if (t.closest('.ok')) { sec(sat); gec(sat); return; }
    sec(sat);
    ac(sat);
  });

  // ── Klavye: sekmeler ve ağaç ───────────────────────────────────────────────
  document.addEventListener('keydown', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    var sek = t.closest('.sekme');
    if (sek) {
      var liste = sekmeler();
      var i = liste.indexOf(sek);
      var j = -1;
      if (e.key === 'ArrowRight') j = (i + 1) % liste.length;
      else if (e.key === 'ArrowLeft') j = (i - 1 + liste.length) % liste.length;
      else if (e.key === 'Home') j = 0;
      else if (e.key === 'End') j = liste.length - 1;
      if (j >= 0) { e.preventDefault(); sekmeSec(liste[j].getAttribute('data-sekme'), true); }
      return;
    }
    var sat = t.closest('.sat');
    if (!sat || t.closest('.ey')) return;
    var agac = sat.closest('[role="tree"]');
    if (!agac) return;
    var satirlar = Array.prototype.slice.call(agac.querySelectorAll('.sat'));
    var k = satirlar.indexOf(sat);
    function git(x) { if (x) { e.preventDefault(); sec(x); x.focus(); x.scrollIntoView({ block: 'nearest' }); } }
    var acik = sat.getAttribute('aria-expanded');
    if (e.key === 'ArrowDown') git(satirlar[k + 1]);
    else if (e.key === 'ArrowUp') git(satirlar[k - 1]);
    else if (e.key === 'Home') git(satirlar[0]);
    else if (e.key === 'End') git(satirlar[satirlar.length - 1]);
    else if (e.key === 'ArrowRight') {
      if (acik === 'false') { e.preventDefault(); gec(sat); }
      else if (acik === 'true') git(satirlar[k + 1]);
    } else if (e.key === 'ArrowLeft') {
      if (acik === 'true') { e.preventDefault(); gec(sat); }
      else {
        var d = Number(sat.getAttribute('data-d') || '0');
        for (var u = k - 1; u >= 0; u--) {
          if (Number(satirlar[u].getAttribute('data-d') || '0') < d) { git(satirlar[u]); break; }
        }
      }
    } else if (e.key === 'Enter') { e.preventDefault(); sec(sat); ac(sat); }
    else if (e.key === ' ') {
      e.preventDefault();
      var kt = sat.querySelector('input.kt');
      if (kt) { kt.checked = !kt.checked; gonder({ tip: 'isaretle', id: sat.getAttribute('data-id'), deger: kt.checked }); }
      else { sec(sat); ac(sat); }
    }
  });

  // İlk yükleme: Mini Graf şablonu gölge köke yazılır, tek tabulu satır seçilir.
  grafKur();
  secimiGeriYukle('');
  gonder({ tip: 'hazir' });
})();
`;

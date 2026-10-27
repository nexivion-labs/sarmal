// ═══════════════════════════════════════════════════════════════════════════
// panel-betik.ts — 🧭 SARMAL PANELİNİN STİLİ VE İSTEMCİ BETİĞİ (SAF — vscode importsuz)
//
//   Founder 2026-10-21: Sarmal kabı tek bir webview görünümüdür (`sarmalPanel`).
//   Üstte Ray · Tren · Makinist · Gözlemler · Ayarlar sekme şeridi (OZK-13), altında
//   seçili sekmenin içeriği.
//   Bu dosya yalnız iki metin taşır: stil ve betik. Veri ve HTML üretimi
//   panel-cekirdek.ts dosyasındadır; betik veri üretmez, yalnız gelen HTML'i yerine
//   koyar ve kullanıcı eylemlerini eklentiye iletir.
//
//   Renkler yalnız `var(--vscode-*)` değişkenlerinden gelir (açık ve koyu tema).
//   İki istisna Founder'ın seçtiği renklerdir: marka mavisi (#2685F2, seçili sekme
//   çizgisi) ve ağaç çizgilerinin tül moru (tul-rengi.ts, editörün tül derinliğiyle
//   aynı kaynak; PNL-A04).
//   Betik nonce'lu tek bloktur; içeriğe gömülen hiçbir şey betik taşıyamaz çünkü
//   bütün metinler kaçırılarak basılır.
// ═══════════════════════════════════════════════════════════════════════════

import { tulRengi } from "./tul-rengi.ts";

/** Seçili sekmenin alt çizgisi: Founder'ın verdiği marka mavisi. */
export const MARKA_MAVISI = "#2685F2";

/** Ağaç çizgisinin dinlenik saydamlığı: ince, sürekli ve soluk (Founder 2026-10-27 · PNL-A04). */
export const CIZGI_ALFA = 0.45;

/** Ray bölümlerinin yan yana dizildiği en küçük panel genişliği: iki sütunun her biri en az 320 pikseldir. */
export const GENIS_PANEL_PX = 640;
/** Beş sekmenin adlarının yan yana sığdığı en küçük şerit genişliği; daha darda seçili olmayan sekme yalnız simgedir. */
export const DAR_SERIT_PX = 420;

export const PANEL_STILI = `
:root{color-scheme:light dark}
*{box-sizing:border-box}
/* TÜL MORU (PNL-A04): ağaç çizgileri ve fare vurgusu editörün tül derinliğiyle aynı mor tondadır.
   Varsayılan açık temanın tonudur; koyu ve yüksek karşıtlıklı koyu temada koyu tema tonu geçer.
   --tul-cizgi dinlenik ince çizgi, --tul-vurgu fare üzerindeki dalın çizgisi ve yazısıdır. */
:root{--tul-cizgi:${tulRengi("acik", CIZGI_ALFA)};--tul-vurgu:${tulRengi("acik", 1)}}
body.vscode-dark,body.vscode-high-contrast:not(.vscode-high-contrast-light){--tul-cizgi:${tulRengi("koyu", CIZGI_ALFA)};--tul-vurgu:${tulRengi("koyu", 1)}}
/* YERLEŞİM (PNL-A03 · Founder 2026-10-27): belge pencere boyuna (vh) dayanan bir en az yükseklik
   taşımaz ve şeridin ölçüsü hiçbir hesapta varsayılmaz. Gövde, panelin verdiği alanı dolduran
   esnek bir sütundur: şerit kendi boyunu alır, içerik kalan alanın tamamını kaplar ve kendi içinde
   kayar. Böylece şerit kaydırmayla ekrandan çıkmaz ve panel hangi yükseklikte açılırsa açılsın
   içerik o alanı doldurur. */
html,body{margin:0;padding:0;height:100%}
body{display:flex;flex-direction:column;overflow:hidden;background:transparent;color:var(--vscode-foreground);font-family:var(--vscode-font-family);font-size:13px;line-height:1.4}
button{font:inherit;color:inherit}
/* SEKME ŞERİDİ küçüktür (Founder 2026-10-27): yazı 11, şerit 26 piksel; yer kaplamaz. */
.seritler{flex:none;position:relative;z-index:5;display:flex;align-items:stretch;height:26px;margin:0;padding:0;overflow:hidden;
  background:var(--vscode-sideBar-background);border-bottom:1px solid var(--vscode-sideBarSectionHeader-border,var(--vscode-panel-border,rgba(128,128,128,.35)))}
.sekme{display:inline-flex;align-items:center;gap:5px;flex:0 1 auto;min-width:0;height:100%;padding:0 9px;margin:0;border:0;border-radius:0;
  background:none;cursor:pointer;color:var(--vscode-descriptionForeground);font-size:11px;line-height:1;white-space:nowrap;opacity:.85}
.sekme svg{flex:none;width:14px;height:14px}
.sekme .sk-ad{overflow:hidden;text-overflow:ellipsis}
.sekme:hover{color:var(--vscode-foreground);opacity:1}
.sekme[aria-selected="true"]{color:var(--vscode-foreground);opacity:1;box-shadow:inset 0 -2px 0 ${MARKA_MAVISI}}
.sekme:focus-visible{outline:1px solid var(--vscode-focusBorder);outline-offset:-2px}
.rozet{display:inline-block;min-width:14px;padding:0 4px;border-radius:7px;text-align:center;font-size:10px;line-height:14px;
  background:var(--vscode-badge-background);color:var(--vscode-badge-foreground)}
/* DAR ŞERİT: kenar çubuğunda (${DAR_SERIT_PX} pikselden dar) beş sekmenin adı yan yana sığmaz ve kesilir.
   Orada seçili olmayan sekme yalnız simgesiyle görünür; adı ipucunda kalır ve ekran okuyucu için
   görünmez biçimde yerinde durur. Seçili sekmenin adı her zaman görünür. */
@media (max-width:${DAR_SERIT_PX - 1}px){
  .sekme{padding:0 7px}
  .sekme:not([aria-selected="true"]) .sk-ad{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
}
#icerik{flex:1 1 auto;min-height:0;overflow:auto;padding:0 0 12px}
/* Yol Haritası ve Mini Graf başlıkları çok küçük puntoludur (Founder 2026-10-27): 10 piksel. */
.bas{margin:0;padding:6px 12px 3px 12px;font-size:10px;line-height:14px;font-weight:600;letter-spacing:.06em;color:var(--vscode-descriptionForeground)}
/* Dar panelde Mini Graf başlığı Yol Haritasının hemen altından başlar; ayrım dış boşlukla değil iç boşlukla
   yapılır, böylece sütunun kutusu ile başlığı aynı noktadan başlar. */
.bas.araya{padding-top:10px}
.bb{display:inline-flex;align-items:center;gap:2px;margin:0 0 0 -16px;padding:0;border:0;background:none;cursor:pointer;
  font:inherit;letter-spacing:inherit;color:inherit;text-transform:inherit}
.bb:hover{color:var(--vscode-foreground)}
.bb:focus-visible{outline:1px solid var(--vscode-focusBorder);outline-offset:1px}
.bb[aria-expanded="true"] .ok svg{transform:rotate(90deg)}
.bb .ok,.bb .ok svg{width:14px;height:14px}
.bas:has(.bb){padding-left:20px}
/* GENİŞ VE ALÇAK PANEL (Founder'ın alt paneli, yaklaşık 1400×400): Yol Haritası ile Mini Graf yan
   yana iki sütundur. Her sütun içerik alanının bütün boyunu alır, başlığı sütunun üstünde durur ve
   gövdesi kendi içinde kayar. Katlanan sütun yalnız başlığı kadar yer tutar ve öteki sütun boşalan
   genişliği alır. Dar panelde (kenar çubuğu) iki sütun alt alta akar ve içerik bütün olarak kayar.
   Hiçbir başlık alanın dibine yapıştırılmaz: eski düzende katlanan Mini Graf başlığı pencere boyuna
   dayanan bir kuralla dibe itiliyordu ve panel küçük bir kutuya sıkışabiliyordu. */
@media (min-width:${GENIS_PANEL_PX}px){
  #icerik:has(>.ray-duzen){display:flex;flex-direction:column;overflow:hidden;padding-bottom:0}
  .ray-duzen{flex:1 1 auto;min-height:0;display:flex;align-items:stretch}
  .kol{flex:1 1 0;min-width:0;min-height:0;display:flex;flex-direction:column}
  .kol:has(>.bolum[hidden]){flex:0 0 auto}
  .kol>.bas{flex:none}
  .kol>.bolum{flex:1 1 auto;min-height:0;overflow:auto;padding-bottom:8px}
  .kol+.kol{border-left:1px solid var(--vscode-sideBarSectionHeader-border,var(--vscode-panel-border,rgba(128,128,128,.35)))}
  .bas.araya{padding-top:6px}
}
.bos{margin:0;padding:8px 12px;color:var(--vscode-descriptionForeground)}
.kardes{margin:0;padding:8px 12px}
.kardes a{color:var(--vscode-textLink-foreground);text-decoration:none;cursor:pointer}
.kardes a:hover{text-decoration:underline}
.kardes a:focus-visible{outline:1px solid var(--vscode-focusBorder)}
[role="tree"]{outline:none}
.sat{position:relative;display:flex;align-items:center;height:22px;padding:0 8px 0 calc(var(--d,0) * 12px + 2px);cursor:pointer;white-space:nowrap;
  color:var(--vscode-foreground)}
/* GİRİNTİ KILAVUZLARI (PNL-A04 · Founder 2026-10-27): her ata kademesi için ince (1 piksel), tül
   morunda bir dikey çizgi atanın açma okunun ortasından (12k+10 px) iner ve HER ZAMAN görünür;
   fare ağacın üzerine gelmesini beklemez. Seçili satırın dalını bağlayan etkin kılavuz (kl)
   ayrıca çizilir. Fare bir satırın üzerine gelince o satırın dalı (dv, betikteki dalIsaretle;
   seçimle aynı kural) tül morunun tam tonuna geçer, satırın gri açıklaması da o tona boyanır ve
   simgesi canlanır. Vurgulu dalın katmanı seçimin etkin çizgisinin üstündedir; yoksa fare seçili
   satırın dalındayken gri etkin çizgi mor vurguyu örter. Ray, Tren ve Makinist ağaçları aynı satır
   üreticisini ve bu kuralları paylaşır. */
.sat::before{content:"";position:absolute;left:0;top:0;bottom:0;width:calc(var(--d,0) * 12px);pointer-events:none;
  background:linear-gradient(to right,transparent 10px,var(--tul-cizgi) 10px,var(--tul-cizgi) 11px,transparent 11px) 0 0/12px 100% repeat-x}
.sat.dv::before{z-index:1;background:
  linear-gradient(to right,transparent 10px,var(--tul-vurgu) 10px,var(--tul-vurgu) 11px,transparent 11px) calc(var(--va,0) * 12px) 0/12px 100% no-repeat,
  linear-gradient(to right,transparent 10px,var(--tul-cizgi) 10px,var(--tul-cizgi) 11px,transparent 11px) 0 0/12px 100% repeat-x}
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
/* Fare üzerindeki satırın gri açıklaması dalın tonuna boyanır (seçili satırda seçim rengi kalır,
   çünkü mor yazı seçim zemininde okunmaz) ve simgesi canlanıp tül morunda hafifçe ışır. */
.sat:hover:not(.sec) .ac{color:var(--tul-vurgu)}
.sat:hover .ik{filter:saturate(1.6) brightness(1.15) drop-shadow(0 0 2px var(--tul-vurgu))}
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
   şeridi) gövdenin dışına taşarsa kayan alan gövdeden uzun olur; o günkü yapışkan sekme şeridi
   bu yüzden ekrandan çıkmıştı (Founder ekranı 2026-10-22). Taşma kutunun içinde kalır. */
#graf{display:block;overflow-x:auto}
`;

/** İstemci betiği. Veri üretmez; ileti köprüsü, klavye ve parça değiştirme yapar. */
export const PANEL_BETIGI = `
(function () {
  'use strict';
  var api = acquireVsCodeApi();
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
  // Sekme listesi şeridin kendisidir (panel-cekirdek.ts SEKMELER); betik ikinci bir liste tutmaz.
  function sekmeSec(ad, odakla) {
    if (!sekmeler().some(function (b) { return b.getAttribute('data-sekme') === ad; })) return;
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
  // Bir satırın dalı (VS Code TreeView ile aynı kural): satır açıksa kendi çocukları, değilse
  // ebeveyninin çocukları. Dalın satırları sınıfla işaretlenir ve dalın kademesi değişkene yazılır.
  // Seçimin etkin kılavuzu (kl, --ka) ile fare vurgusu (dv, --va) bu tek kuralı paylaşır.
  function dalIsaretle(s, sinif, degisken) {
    Array.prototype.forEach.call(document.querySelectorAll('.sat.' + sinif), function (x) { x.classList.remove(sinif); });
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
      satirlar[j].classList.add(sinif);
      satirlar[j].style.setProperty(degisken, String(kademe));
    }
  }
  // Etkin girinti kılavuzu: seçili satırın dalını bağlayan çizgi her zaman görünür.
  function kilavuzYaz() { dalIsaretle(satirBul(seciliSatir), 'kl', '--ka'); }
  // Fare vurgusu (PNL-A04): fare bir satırın üzerine gelince o satırın dalı tül morunda renklenir.
  // Satır değişmedikçe yeniden hesaplanmaz; içerik yenilenince fare altındaki satırdan yeniden kurulur.
  var vurguSatiri = null;
  function vurguYaz(s) {
    if (s === vurguSatiri && s && s.isConnected) return;
    vurguSatiri = s;
    dalIsaretle(s, 'dv', '--va');
  }
  function vurguTazele() { vurguSatiri = null; vurguYaz(document.querySelector('.sat:hover')); }
  function secimiGeriYukle(odakId) {
    var s = satirBul(seciliSatir);
    if (s) s.classList.add('sec');
    kilavuzYaz();
    vurguTazele();
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
          vurguTazele();
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

  // ── Fare vurgusu: üzerine gelinen satırın dalı; fare satırdan ya da panelden çıkınca söner ──
  document.addEventListener('mouseover', function (e) {
    var t = e.target;
    vurguYaz(t && t.closest ? t.closest('.sat') : null);
  });
  document.addEventListener('mouseout', function (e) { if (!e.relatedTarget) vurguYaz(null); });

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

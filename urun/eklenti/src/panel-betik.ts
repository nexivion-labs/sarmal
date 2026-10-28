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
/* SEKME SIRASI (PNL-A23): sürüklenen sekme soluklaşır; bırakılacağı yer marka mavisi ince bir çizgiyle
   gösterilir. Çizgi sözde öğededir: seçili sekmenin alt çizgisini (box-shadow) ezmez. */
.sekme{position:relative}
.sekme.suruklenen{opacity:.4}
.sekme.birak-once::before,.sekme.birak-sonra::before{content:"";position:absolute;top:4px;bottom:4px;width:2px;
  background:${MARKA_MAVISI};pointer-events:none}
.sekme.birak-once::before{left:0}
.sekme.birak-sonra::before{right:0}
.rozet{display:inline-block;min-width:14px;padding:0 4px;border-radius:7px;text-align:center;font-size:10px;line-height:14px;
  background:var(--vscode-badge-background);color:var(--vscode-badge-foreground)}
/* Sinyaller sekmesinin Dur ve Dikkat sayıları (PNL-A09): editörün hata ve uyarı renkleriyle. */
.sinyal-rozetleri{display:inline-flex;gap:3px}
/* Sıfır olan rozet yer kaplamaz: .rozet görünüm kuralı [hidden]in tarayıcı varsayılanını ezdiği için
   gizli rozet boş bir hap olarak yer tutuyor ve Sinyaller ile Ayarlar arasında boşluk bırakıyordu. */
.rozet[hidden]{display:none}
.rozet.dur{background:var(--vscode-editorError-foreground,#f14c4c);color:var(--vscode-editor-background,#1e1e1e)}
.rozet.dikkat{background:var(--vscode-editorWarning-foreground,#cca700);color:var(--vscode-editor-background,#1e1e1e)}
/* DAR ŞERİT: kenar çubuğunda (${DAR_SERIT_PX} pikselden dar) beş sekmenin adı yan yana sığmaz ve kesilir.
   Orada seçili olmayan sekme yalnız simgesiyle görünür; adı ipucunda kalır ve ekran okuyucu için
   görünmez biçimde yerinde durur. Seçili sekmenin adı her zaman görünür. */
@media (max-width:${DAR_SERIT_PX - 1}px){
  .sekme{padding:0 7px}
  .sekme:not([aria-selected="true"]) .sk-ad{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
}
#icerik{flex:1 1 auto;min-height:0;display:flex;flex-direction:column}
/* Beş sekmenin içeriği belgede hazır durur (PNL-A18); yalnız seçili sekmenin kabı görünür ve kendi içinde kayar. */
.sekme-paneli{flex:1 1 auto;min-height:0;overflow:auto;padding:0 0 12px}
.sekme-paneli[hidden]{display:none!important}
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
  .sekme-paneli:has(>.ray-duzen){display:flex;flex-direction:column;overflow:hidden;padding-bottom:0}
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
/* SİNYALLER (PNL-A09): bant adı (Dur · Dikkat · Bilgi) hiç kısalmaz, kısalan bandın açıklamasıdır; tanı
   satırında ise kod, dosya ve satır görünür kalır, uzun ileti kısalır (tamamı satırın ipucundadır).
   Tanı satırı tıklanınca dosyayı açan satırdır; türlere toplandıktan sonra derinliği tek başına onu
   tanıtmaz (PNL-A28). Dosya açmayan satırların (bant, proje, tür, öneri) adı kısadır ve kısalmaz; kısalan
   yanındaki anlam ya da öneri cümlesidir. */
#sinyaller-agac .sat[data-d="0"] .et{flex-shrink:0}
#sinyaller-agac .sat[data-komut] .ac{flex-shrink:0;max-width:60%}
#sinyaller-agac .sat:not([data-komut]) .et{flex-shrink:0}
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
/* ONAY KARARI (OZK-13 · PNL-A07): kapı satırının hemen altında, panelin içinde durur; önce gerekçe
   kutusu, sonra üç eylem. Kademe dalın kılavuz çizgisini sürdürür, içeriği satırın adıyla aynı
   hizadan başlar ve geniş panelde okunur bir genişlikte kalır. Renkler yalnız tema değişkenlerinden
   gelir; kutu ve düğmeler eski Onaylar görünümüyle aynı biçimdedir. */
.kademe{margin:0 0 4px calc((var(--d,1) - 1) * 12px + 10px);padding:4px 12px 8px 41px;max-width:780px;border-left:1px solid var(--tul-cizgi)}
.kademe .not-alani{display:flex;flex-direction:column;gap:4px}
.kademe .not-baslik{color:var(--vscode-descriptionForeground);font-size:12px}
.kademe .not-metin{width:100%;max-width:100%;min-width:0;resize:vertical;font:inherit;padding:4px 6px;overflow-wrap:anywhere;
  color:var(--vscode-input-foreground);background:var(--vscode-input-background);border:1px solid var(--vscode-input-border,var(--vscode-contrastBorder,transparent))}
.kademe .not-metin::placeholder{color:var(--vscode-input-placeholderForeground)}
.kademe .not-metin:focus{outline:1px solid var(--vscode-focusBorder);outline-offset:-1px}
.kademe .not-hata{margin:0;padding:2px 6px;line-height:1.4;overflow-wrap:anywhere;color:var(--vscode-inputValidation-errorForeground,var(--vscode-errorForeground));
  background:var(--vscode-inputValidation-errorBackground);border:1px solid var(--vscode-inputValidation-errorBorder)}
.kademe .kararlar{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
.kademe .karar-satiri{display:inline-flex;align-items:center;gap:4px;padding:2px 10px 2px 6px;line-height:20px;cursor:pointer;font:inherit;
  border:1px solid var(--vscode-button-border,transparent);background:var(--vscode-button-secondaryBackground);color:var(--vscode-button-secondaryForeground)}
.kademe .karar-satiri:hover{background:var(--vscode-button-secondaryHoverBackground)}
.kademe .karar-satiri:focus-visible{outline:1px solid var(--vscode-focusBorder);outline-offset:1px}
.kademe .karar-simge{display:inline-flex}
.kademe .karar-simge svg{width:14px;height:14px;display:block}
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

  // ── Sekme şeridi (PNL-A18) ─────────────────────────────────────────────────
  // Beş sekmenin içeriği belgede hazır durur; geçiş yalnız hangi kabın görüneceğini değiştirir ve
  // eklentiyi beklemez, eklenti seçimi yalnız haber olarak alır. Kullanıcının her geçişi bir sayaç
  // artırır. Eklentinin seçtirdiği sekme (sekmeSec iletisi) eklentinin o ana kadar işlediği sayacı
  // taşır; eklentiye henüz ulaşmamış daha yeni bir kullanıcı geçişi varsa uygulanmaz. Son söz böylece
  // eklentinin işlediği son olaya aittir ve webview ile eklentinin seçimi ayrışmaz.
  var gecisSayaci = 0;
  function sekmeler() { return Array.prototype.slice.call(document.querySelectorAll('.sekme')); }
  function sekmePanelleri() { return Array.prototype.slice.call(document.querySelectorAll('.sekme-paneli')); }
  function sekmeVarMi(ad) { return sekmeler().some(function (b) { return b.getAttribute('data-sekme') === ad; }); }
  function sekmeIsaretle(ad) {
    if (!sekmeVarMi(ad)) return;
    sekmeler().forEach(function (b) {
      var s = b.getAttribute('data-sekme') === ad;
      b.setAttribute('aria-selected', s ? 'true' : 'false');
      b.setAttribute('tabindex', s ? '0' : '-1');
    });
    sekmePanelleri().forEach(function (p) { p.hidden = p.getAttribute('data-sekme') !== ad; });
  }
  // Sekme listesi şeridin kendisidir (panel-cekirdek.ts SEKMELER); betik ikinci bir liste tutmaz.
  function sekmeSec(ad, odakla) {
    if (!sekmeler().some(function (b) { return b.getAttribute('data-sekme') === ad; })) return;
    sekmeIsaretle(ad);
    if (odakla) {
      var b = document.querySelector('.sekme[data-sekme="' + ad + '"]');
      if (b) b.focus();
    }
    gecisSayaci += 1;
    gonder({ tip: 'sekme', ad: ad, n: gecisSayaci });
  }

  // ── Sekme sırası (PNL-A23 · OZK-14 DÖRDÜNCÜSÜ) ────────────────────────────
  // Sıra ile seçim ayrı şeylerdir: sürükleme ve klavyeyle taşıma yalnız düğmelerin yerini değiştirir;
  // seçili sekmeye, görünen kaba ve geçiş sayacına dokunmaz, sekme geçişi de sırayı değiştirmez. Yeni
  // sıra eklentiye gider ve kullanıcı ayarına yazılır. Ayar başka bir yoldan değişince (varsayılana
  // döndürme komutu, ayar dosyası, başka pencere) eklentinin bildirdiği sıra şeride uygulanır.
  function seritSirasi() { return sekmeler().map(function (b) { return b.getAttribute('data-sekme'); }); }
  function siraGonder() { gonder({ tip: 'sekmeSirasi', sira: seritSirasi() }); }
  function siraUygula(sira) {
    var serit = document.querySelector('.seritler');
    if (!serit || !Array.isArray(sira) || sira.join() === seritSirasi().join()) return;
    sira.forEach(function (ad) {
      var b = serit.querySelector('.sekme[data-sekme="' + kacirSel(ad) + '"]');
      if (b) serit.appendChild(b);
    });
  }
  var suruklenen = null;
  function birakIzleriniSil() {
    sekmeler().forEach(function (b) { b.classList.remove('birak-once', 'birak-sonra', 'suruklenen'); });
  }
  /** Bırakma hedefi: üzerinde durulan sekme ve onun önü mü arkası mı; şeridin boş yeri en sondur. */
  function birakHedefi(e) {
    var t = e.target;
    if (!t || !t.closest || !t.closest('.seritler')) return null;
    var h = t.closest('.sekme');
    if (!h) return { sekme: null, once: false };
    var r = h.getBoundingClientRect();
    return { sekme: h, once: (e.clientX - r.left) < r.width / 2 };
  }
  document.addEventListener('dragstart', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('.sekme') : null;
    if (!b) return;
    suruklenen = b;
    b.classList.add('suruklenen');
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', b.getAttribute('data-sekme')); } catch (x) { /* veri yazılamasa da sürükleme sürer */ }
    }
  });
  document.addEventListener('dragover', function (e) {
    if (!suruklenen) return;
    var h = birakHedefi(e);
    if (!h) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    sekmeler().forEach(function (b) { b.classList.remove('birak-once', 'birak-sonra'); });
    if (h.sekme && h.sekme !== suruklenen) h.sekme.classList.add(h.once ? 'birak-once' : 'birak-sonra');
  });
  document.addEventListener('drop', function (e) {
    if (!suruklenen) return;
    var h = birakHedefi(e);
    var b = suruklenen;
    suruklenen = null;
    birakIzleriniSil();
    if (!h) return;
    e.preventDefault();
    var once = seritSirasi().join();
    var serit = b.parentNode;
    if (!h.sekme) serit.appendChild(b);
    else if (h.sekme !== b) serit.insertBefore(b, h.once ? h.sekme : h.sekme.nextSibling);
    if (seritSirasi().join() !== once) siraGonder();
  });
  document.addEventListener('dragend', function () { suruklenen = null; birakIzleriniSil(); });

  /** Sekmenin içerik kabı; eklentiden gelen her güncelleme hedefini yalnız kendi sekmesinin kabında arar. */
  function sekmePaneli(sekme) { return typeof sekme === 'string' ? $('panel-' + sekme) : null; }
  function hedefBul(sekme, kimlik) { var p = sekmePaneli(sekme); return p ? p.querySelector('#' + kimlik) : null; }

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
  // Satır tıklaması (PNL-A05): Mini Graf yeniden çizilmez, yalnız seçim işareti gölge kökte bağı
  // verilen düğüme geçer. Önceki seçimin bağ çizgileri yeni seçimi anlatmadığı için gizlenir; yeni
  // seçimin bağları ve meyve satırları graf bir sonraki kez çizildiğinde gelir.
  function grafSec(href) {
    var kok = $('graf') && $('graf').shadowRoot;
    if (!kok || typeof href !== 'string') return;
    Array.prototype.forEach.call(kok.querySelectorAll('.dugum.secili'), function (x) {
      x.classList.remove('secili');
      x.removeAttribute('aria-current');
    });
    Array.prototype.forEach.call(kok.querySelectorAll('svg.serit, .bag, .zemin, .uretir'), function (x) { x.style.display = 'none'; });
    var bag = Array.prototype.filter.call(kok.querySelectorAll('a'), function (a) { return a.getAttribute('href') === href; })[0];
    var dugum = bag && (bag.classList.contains('dugum') ? bag : bag.querySelector('.dugum'));
    if (!dugum) return;
    dugum.classList.add('secili');
    dugum.setAttribute('aria-current', 'true');
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
  function stilEkle(sekme, metin, degistir) {
    var s = $('ikon-stil-' + sekme);
    if (!s || metin === undefined) return;
    s.textContent = degistir ? metin : s.textContent + metin;
  }
  // Yeniden çizimde yazılmakta olan gerekçe kutusu korunur (PNL-A07): odak, imleç ve henüz eklentiye
  // ulaşmamış olabilecek son harfler yeni kutuya aynen taşınır; kullanıcı cümlesinin ortasında
  // klavyeyi ya da metni kaybetmez.
  function alanOdagi() {
    var a = document.activeElement;
    return a && a.id && a.classList && a.classList.contains('not-metin')
      ? { id: a.id, deger: a.value, bas: a.selectionStart, son: a.selectionEnd } : null;
  }
  function alanOdaginiGeriYukle(o) {
    var y = o && document.getElementById(o.id);
    if (!y) return;
    y.value = o.deger;
    y.focus({ preventScroll: true });
    y.setSelectionRange(o.bas, o.son);
  }
  function parcaYaz(sekme, kimlik, html) {
    var h = hedefBul(sekme, kimlik);
    if (!h) return;
    var odak = odakKimligi();
    if (kimlik === 'graf') { grafYaz(html); return; }
    var alan = alanOdagi();
    h.innerHTML = html;
    secimiGeriYukle(odak);
    alanOdaginiGeriYukle(alan);
  }

  // ── Onay kararı (PNL-A07 · OZK-13): kapı satırının altındaki karar kademesi ──
  function kademeKapisi(el) {
    var k = el && el.closest ? el.closest('.kademe') : null;
    return k ? k.previousElementSibling : null;
  }
  function onayGonder(ileti) { gonder({ tip: 'onay', ileti: ileti }); }
  // Odak gerekçe kutusuna gider (Founder hükmü 2026-07-29); önce kapı satırı görünür kılınır, sayfa
  // zıplamaz ve imleç metnin sonuna konur.
  function notaOdaklan(notId) {
    var alan = document.getElementById('not-' + notId);
    if (!alan) return;
    var satir = kademeKapisi(alan);
    if (satir) satir.scrollIntoView({ block: 'nearest' });
    alan.focus({ preventScroll: true });
    alan.setSelectionRange(alan.value.length, alan.value.length);
  }
  function kutuMetni(dugme) {
    var alan = document.getElementById('not-' + dugme.getAttribute('data-not'));
    return alan ? alan.value : '';
  }

  window.addEventListener('message', function (e) {
    var m = e.data || {};
    if (m.tip === 'bolum') {
      // Yalnız iletinin sekmesinin kabı yeniden yazılır; seçili sekme ve görünen kap değişmez (PNL-A18).
      var p = sekmePaneli(m.sekme);
      if (!p) return;
      stilEkle(m.sekme, m.ikonStili, true);
      var odak = odakKimligi();
      var alanB = alanOdagi();
      p.innerHTML = m.html;
      if (m.sekme === 'ray') grafKur();
      bekleyenDallariUygula(m.gec);
      secimiGeriYukle(odak);
      alanOdaginiGeriYukle(alanB);
    } else if (m.tip === 'sekmeSec') {
      // Eklentinin seçtirdiği sekme (yerleşik komut, onay kapısı, durum çubuğu sayacı). Eklentiye henüz
      // ulaşmamış daha yeni bir kullanıcı geçişi varsa uygulanmaz; eklenti o geçişi işleyince seçimi alır.
      if (typeof m.n === 'number' && m.n >= gecisSayaci) sekmeIsaretle(m.ad);
    } else if (m.tip === 'parca') {
      stilEkle(m.sekme, m.ikonStili, true);
      parcaYaz(m.sekme, m.kimlik, m.html);
      if (m.kimlik !== 'graf') bekleyenDallariUygula(m.gec);
    } else if (m.tip === 'satir') {
      stilEkle(m.sekme, m.ikonStili, false);
      var sp = sekmePaneli(m.sekme);
      var s = sp ? sp.querySelector('.sat[data-id="' + kacirSel(m.id) + '"]') : null;
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
          bekleyenDallariUygula(m.gec);
        }
      }
    } else if (m.tip === 'rozet') {
      var r = document.querySelector('.sekme[data-sekme="makinist"] .rozet');
      if (r) { r.textContent = m.sayi > 0 ? String(m.sayi) : ''; r.hidden = !(m.sayi > 0); }
    } else if (m.tip === 'sinyalRozet') {
      // Sinyaller sekmesinin Dur ve Dikkat sayıları (PNL-A09); sıfır olan gizlenir.
      ['dur', 'dikkat'].forEach(function (k) {
        var e = document.querySelector('.sekme[data-sekme="sinyaller"] .rozet.' + k);
        var n = Number(m[k]) || 0;
        if (e) { e.textContent = n > 0 ? String(n) : ''; e.hidden = !(n > 0); }
      });
    } else if (m.tip === 'onayOdak') {
      notaOdaklan(m.kimlik);
    } else if (m.tip === 'grafSec') {
      grafSec(m.href);
    } else if (m.tip === 'sinamaTikla') {
      // Yalnız sınama kipinde gelir (panel.ts SINAMA_KOMUTU): Mini Graf'ta dosyaya götüren ilk bağın
      // içindeki yazıya, gerçek bir fare tıklaması gibi gölge kökten belgeye kabaran bir tıklama gönderilir.
      var gk = $('graf') && $('graf').shadowRoot;
      var hedefBag = gk && Array.prototype.filter.call(gk.querySelectorAll('a'), function (a) {
        return (a.getAttribute('href') || '').indexOf('command:sarmal.dosyaAc') === 0;
      })[0];
      if (hedefBag) {
        (hedefBag.querySelector('.ad, text.etiket') || hedefBag)
          .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true, view: window }));
      }
    } else if (m.tip === 'sekmeSirasi') {
      siraUygula(m.sira);
    } else if (m.tip === 'sinamaSekmeDizisi') {
      sinamaSekmeDizisi(m.sira, m.aralik);
    } else if (m.tip === 'sinamaSurukle') {
      sinamaSurukle(m.ad, m.hedef, m.once);
    } else if (m.tip === 'sinamaDalAc') {
      sinamaDalAc(m.id, m.aralik);
    } else if (m.tip === 'sinamaSerit') {
      gonder({ tip: 'sinamaRapor', kayitlar: seritDurumu() });
    } else if (m.tip === 'git') {
      var g = satirBul(m.id);
      if (g) { sec(g); g.focus(); g.scrollIntoView({ block: 'nearest' }); }
    }
  });

  // ── Sınama kipi (PNL-A18): sekme geçişinin eklentiyi beklemediğinin ölçümü ──
  // Yalnız sınama kipinde gelen iletiyle çalışır (panel.ts SINAMA_KOMUTU). Şeritteki sekmelere sırayla
  // gerçek tıklama gönderilir ve her tıklamanın hemen ardından seçili sekme, görünen kap ve görünen
  // içeriğin hangi sekmeye ait olduğu kaydedilir. Kayıt dizinin sonunda eklentiye gider; eklenti o
  // sırada meşgulse ileti sıraya girer ve eklenti boşalınca ulaşır.
  function seciliSekme() {
    var b = sekmeler().filter(function (x) { return x.getAttribute('aria-selected') === 'true'; })[0];
    return b ? b.getAttribute('data-sekme') : '';
  }
  function icerikSekmesi(p) {
    if (p.querySelector('#agac')) return 'ray';
    if (p.querySelector('#tren-agac')) return 'tren';
    if (p.querySelector('#makinist-agac')) return 'makinist';
    if (p.querySelector('#sinyaller-agac')) return 'sinyaller';
    var bos = p.querySelector('[data-bos-sekme]');
    return bos ? bos.getAttribute('data-bos-sekme') : '';
  }
  // Dizi tek bir gecikmeden sonra art arda koşar: arka plandaki webview'in zamanlayıcıları saniyeye
  // yuvarlanabilir ve tıklamalar arasına zamanlayıcı konursa dizi kilit süresinin dışına taşabilir.
  function sinamaSekmeDizisi(sira, aralik) {
    var kayitlar = [];
    setTimeout(function () {
      (Array.isArray(sira) ? sira : []).forEach(function (ad) {
        var b = document.querySelector('.sekme[data-sekme="' + ad + '"]');
        var bas = performance.now();
        if (b) b.click();
        var gorunen = sekmePanelleri().filter(function (p) { return !p.hidden; });
        kayitlar.push({ ad: ad, zaman: Date.now(), sure: performance.now() - bas, secili: seciliSekme(),
          gorunen: gorunen.map(function (p) { return p.getAttribute('data-sekme'); }), icerik: gorunen.map(icerikSekmesi) });
      });
      gonder({ tip: 'sinamaRapor', kayitlar: kayitlar });
    }, Number(aralik) || 0);
  }

  // ── Sınama kipi (PNL-A27): dalın açılması eklentiyi beklemez ─────────────────
  // Verilen satırın açma okuna kısa bir gecikmeden sonra gerçek tıklama gönderilir ve hemen ardından
  // satırın durumu ile dalın görünen çocukları kaydedilir; eklenti o sırada kilitli olabilir.
  function sinamaDalAc(id, aralik) {
    setTimeout(function () {
      var s = satirBul(id);
      var ok = s ? s.querySelector('.ok') : null;
      var bas = performance.now();
      if (ok) ok.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      var sure = performance.now() - bas;
      var onek = id + '/';
      var cocuk = Array.prototype.filter.call(document.querySelectorAll('.sat'), function (x) {
        return (x.getAttribute('data-id') || '').indexOf(onek) === 0 && x.getBoundingClientRect().height > 0;
      }).length;
      gonder({ tip: 'sinamaRapor', kayitlar: { id: id, zaman: Date.now(), sure: sure, acik: s ? s.getAttribute('aria-expanded') : null, cocuk: cocuk } });
    }, Number(aralik) || 0);
  }

  // ── Sınama kipi (PNL-A23): sekme sürüklemesi ve şeridin durumu ──────────────
  // Sürükleme gerçek DOM sürükleme olaylarıyla (dragstart, dragover, drop, dragend) yapılır; olaylar
  // bırakılacak sekmenin yarısına göre konumlanır ve şeridin kendi işleyicilerinden geçer.
  function seritDurumu() {
    var gorunen = sekmePanelleri().filter(function (p) { return !p.hidden; });
    return {
      sira: seritSirasi(), secili: seciliSekme(), gorunen: gorunen.map(function (p) { return p.getAttribute('data-sekme'); }),
      icerik: gorunen.map(icerikSekmesi),
      rozetler: sekmeler().map(function (b) {
        return { sekme: b.getAttribute('data-sekme'), rozet: Array.prototype.map.call(b.querySelectorAll('.rozet'), function (r) { return r.className; }) };
      }),
    };
  }
  function sinamaSurukle(ad, hedef, once) {
    var b = document.querySelector('.sekme[data-sekme="' + kacirSel(ad) + '"]');
    var h = document.querySelector('.sekme[data-sekme="' + kacirSel(hedef) + '"]');
    if (!b || !h) { gonder({ tip: 'sinamaRapor', kayitlar: seritDurumu() }); return; }
    var r = h.getBoundingClientRect();
    var x = once ? r.left + 2 : r.right - 2;
    var y = r.top + r.height / 2;
    var dt = new DataTransfer();
    var olay = function (hedefOge, tur) {
      hedefOge.dispatchEvent(new DragEvent(tur, { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, dataTransfer: dt }));
    };
    olay(b, 'dragstart');
    olay(h, 'dragover');
    olay(h, 'drop');
    olay(b, 'dragend');
    gonder({ tip: 'sinamaRapor', kayitlar: seritDurumu() });
  }

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
  // ── Dal aç-kapa (PNL-A27): eklentiyi beklemez ──────────────────────────────
  // Kapalı dalın çocukları satırın hemen ardındaki çizilmeyen şablondadır; açmak şablonu yerine
  // açar, kapatmak dalın satırlarını yeni bir şablona taşır. İkisi de webview'de anında olur ve
  // eklentiye yalnız haber gider (sayaçlı). Eklentinin sonraki çizimi o haberi henüz görmemişse
  // (iletideki sayaç küçükse) kullanıcının açtığı ya da kapattığı dal yeniden uygulanır. Şablonu
  // olmayan kapalı satır (onay kapısı, çocuksuz dal) ile karar kademesi taşıyan açık kapı eklentiye
  // sorulur; onların açılması eklentinin işidir.
  var dalSayaci = 0;
  var bekleyenDallar = {};
  function dalSablonu(satir) {
    var t = satir.nextElementSibling;
    return t && t.tagName === 'TEMPLATE' && t.getAttribute('data-ust') === satir.getAttribute('data-id') ? t : null;
  }
  function dalAc(satir) {
    var t = dalSablonu(satir);
    if (!t) return false;
    t.replaceWith(t.content);
    satir.setAttribute('aria-expanded', 'true');
    return true;
  }
  function dalinUyesi(el, onek) {
    if (el.classList && el.classList.contains('sat')) return (el.getAttribute('data-id') || '').indexOf(onek) === 0;
    if (el.tagName === 'TEMPLATE') return (el.getAttribute('data-ust') || '').indexOf(onek) === 0;
    if (el.classList && el.classList.contains('kademe')) return (el.getAttribute('data-kapi') || '').indexOf(onek) === 0;
    return false;
  }
  function dalKapat(satir) {
    var n = satir.nextElementSibling;
    if (n && n.classList.contains('kademe')) return false;
    var id = satir.getAttribute('data-id');
    var onek = id + '/';
    var t = document.createElement('template');
    t.setAttribute('data-ust', id);
    while (n && dalinUyesi(n, onek)) {
      var sonraki = n.nextElementSibling;
      t.content.appendChild(n);
      n = sonraki;
    }
    satir.after(t);
    satir.setAttribute('aria-expanded', 'false');
    // Seçili ya da odaktaki satır kapanan dalın içindeyse seçim dalın kendisine geçer (VS Code ağacı gibi).
    if (seciliSatir && seciliSatir.indexOf(onek) === 0) { sec(satir); satir.focus({ preventScroll: true }); }
    return true;
  }
  function dalDurumunuUygula(satir, ac) {
    var acik = satir.getAttribute('aria-expanded') === 'true';
    if (acik === ac) return true;
    return ac ? dalAc(satir) : dalKapat(satir);
  }
  function gec(satir) {
    if (satir.getAttribute('aria-expanded') === null) return;
    var id = satir.getAttribute('data-id');
    var ac = satir.getAttribute('aria-expanded') !== 'true';
    if (!dalDurumunuUygula(satir, ac)) { gonder({ tip: 'gec', id: id, ac: ac }); return; }
    dalSayaci += 1;
    bekleyenDallar[id] = { ac: ac, n: dalSayaci };
    kilavuzYaz();
    vurguTazele();
    gonder({ tip: 'gec', id: id, ac: ac, n: dalSayaci, yerel: true });
  }
  /** Eklentinin çizimi geldi: onun henüz görmediği yerel dal geçişleri yeniden uygulanır, gördükleri düşer. */
  function bekleyenDallariUygula(gorulen) {
    var g = typeof gorulen === 'number' ? gorulen : 0;
    Object.keys(bekleyenDallar).forEach(function (id) {
      var b = bekleyenDallar[id];
      if (b.n <= g) { delete bekleyenDallar[id]; return; }
      var s = satirBul(id);
      if (s) dalDurumunuUygula(s, b.ac);
    });
    kilavuzYaz();
    vurguTazele();
  }
  function ac(satir) {
    if (satir.getAttribute('data-komut') === '1') gonder({ tip: 'ac', id: satir.getAttribute('data-id') });
    else gec(satir);
  }

  document.addEventListener('click', function (e) {
    // Gölge kök içindeki bağlar (Mini Graf): yalnız command: bağı iletilir, gezinti yapılmaz.
    // TEK YOL (PNL-A05): üç görünümün düğüm bağı da buradan eklentinin komut köprüsüne gider.
    // Bağ HTML <a> (Ağaç, İlerleme) ya da SVG <a> (Klasik) olabilir. HTML öğesinin adı büyük harf
    // (A), SVG öğesinin adı küçük harf (a) gelir; ad bu yüzden harf büyüklüğüne bakmadan okunur.
    // Eskiden yalnız 'A' aranıyordu ve Klasik görünümün SVG bağı bu köprüye hiç ulaşmıyordu; tıklamayı
    // VS Code'un kendi bağ işleyicisi yakalıyor, panel komut bağına izin vermediği için düşürüyordu.
    // Olay burada durdurulur: VS Code'un bağ işleyicisi aynı tıklamayı ikinci bir yoldan taşımaz.
    var yol = e.composedPath ? e.composedPath() : [];
    for (var i = 0; i < yol.length; i++) {
      var n = yol[i];
      if (n && String(n.tagName || '').toLowerCase() === 'a' && n.getRootNode && n.getRootNode() !== document) {
        e.preventDefault();
        e.stopPropagation();
        var h = n.getAttribute('href') || n.getAttribute('xlink:href') || '';
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
    // Karar düğmesi: gerekçe kutusunun metniyle birlikte onay defterine iner; ölçü ve yazım eklentidedir.
    var karar = t.closest('.kademe .karar-satiri');
    if (karar) {
      onayGonder({ tur: 'kararVer', dosya: karar.getAttribute('data-dosya'), kod: karar.getAttribute('data-kod'),
        satir: Number(karar.getAttribute('data-satir')), rol: karar.getAttribute('data-rol'), not: kutuMetni(karar) });
      return;
    }
    if (t.closest('.kademe')) return;
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

  // Yazılan her harf onay defterindeki taslağa düşer; yeniden çizim metni defterden geri getirir.
  document.addEventListener('input', function (e) {
    var alan = e.target && e.target.closest ? e.target.closest('.kademe .not-metin') : null;
    if (!alan) return;
    var kutu = alan.closest('.not-alani');
    if (alan.value.trim()) {
      var hata = document.getElementById('hata-' + kutu.getAttribute('data-kimlik'));
      if (hata) hata.hidden = true;
    }
    onayGonder({ tur: 'taslak', kimlik: kutu.getAttribute('data-kimlik'), metin: alan.value });
  });

  // ── Klavye: sekmeler ve ağaç ───────────────────────────────────────────────
  document.addEventListener('keydown', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    // Gerekçe kutusu: Escape (ya da Shift+Tab) kutudan çıkar ve odağı kapı satırına verir; kapı açık
    // kalır, taslak durur, hiçbir kayıt yazılmaz. Ctrl/Cmd+Enter şerhle onaylar.
    var alan = t.closest('.kademe .not-metin');
    if (alan) {
      if (e.key === 'Escape' || (e.key === 'Tab' && e.shiftKey)) {
        e.preventDefault();
        var kapiSatiri = kademeKapisi(alan);
        if (kapiSatiri) { sec(kapiSatiri); kapiSatiri.focus({ preventScroll: true }); }
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        var serh = alan.closest('.kademe').querySelector('.karar-satiri[data-rol="şerh"]');
        if (serh) serh.click();
      }
      return;
    }
    if (t.closest('.kademe')) return;
    var sek = t.closest('.sekme');
    if (sek && e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      // Klavyeyle taşıma (PNL-A23): odaktaki sekme komşusuyla yer değiştirir; uçta sıra değişmez.
      // Taşınan komşudur, odaktaki düğüm yerinden sökülmez ve odağını kaybetmez. Olay VS Code'a
      // geçmez: Alt+Sol orada "geri git" kısayoludur.
      e.preventDefault();
      e.stopPropagation();
      var sol = e.key === 'ArrowLeft';
      var komsu = sol ? sek.previousElementSibling : sek.nextElementSibling;
      if (komsu && komsu.classList.contains('sekme')) {
        sek.parentNode.insertBefore(komsu, sol ? sek.nextSibling : sek);
        siraGonder();
      }
      return;
    }
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
    // Kapı satırında ikinci Escape vazgeçmektir: kademe kapanır, hiçbir kayıt yazılmaz, vazgeçiş söylenir.
    var acikKademe = sat.getAttribute('aria-expanded') === 'true' && sat.nextElementSibling
      && sat.nextElementSibling.classList.contains('kademe') ? sat.nextElementSibling : null;
    if (e.key === 'Escape' && acikKademe) {
      e.preventDefault();
      var na = acikKademe.querySelector('.not-alani');
      if (na) onayGonder({ tur: 'iptal', dosya: na.getAttribute('data-dosya'), kod: na.getAttribute('data-kod') });
      return;
    }
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

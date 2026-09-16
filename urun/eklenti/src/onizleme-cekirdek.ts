// ═══════════════════════════════════════════════════════════════════════════
// onizleme-cekirdek.ts — 🖼️ OKUMA MODUNUN SAF GÖVDESİ (EKL-F6-A05 · Masa düzeni)
//
//   Founder hükmü 2026-09-16: önizleme yüzü B seçeneğiyle, yani MASA düzeniyle
//   kurulur. Solda katlanmış künye ile gerçek yapı ağacı durur, sağda belge
//   biçimli metin ile satır numaralı gerçek kod akar ve belgeyi yineleyen
//   dizgilerin yerine atıf konur. Düzenin gerekçesi, belge dışındaki her şeyin
//   kaynaktaki hâliyle kod olarak durmasını isteyen 2026-07-03 tarihli hükmü
//   korumasıdır.
//
//   BU MODÜL VS CODE TANIMAZ. Kabuk (onizleme.ts) yalnız olguları geçirir:
//   kaynağı, kanon paletini, simge çizicisini, atıf çözücüsünü ve komut bağını.
//   Saflığın sebebi ölçümdür: nöbet yüzeyi ancak kabuksuz üretilebildiğinde
//   sayabilir (Onaylar panelinin `onay-govde.ts` dersiyle aynı).
//
//   RENK KANUNU (YUZ-4.1): bu dosyada hiçbir renk DEĞERİ yazılmaz. Renk iki
//   kaynaktan gelir ve ikisi de dışarıdadır — kanon paletinden üretilen `--sr-*`
//   değişkenleri ve editörün kendi `--vscode-*` tema belirteçleri.
//
//   Fikstürlü sınama: sinama/onizleme-masa.test.ts
// ═══════════════════════════════════════════════════════════════════════════

import MarkdownIt from "markdown-it";
import hljs from "highlight.js";
import { belirtecle } from "../../cekirdek/src/belirtec.ts";
import { ayristir } from "../../cekirdek/src/ayristirici.ts";
import { belgeParcalari, belgeGovdesiMd, kodBoyaSatirlari } from "../../cekirdek/src/belgele.ts";
import type { Dugum } from "../../cekirdek/src/sozdizim.ts";
import { KOD_DESENI } from "./atif-cekirdek.ts";

// ── Tema belirteçleri: yüzeyin kullanmasına İZİNLİ gerçek kimlikler ─────────
//   Nöbet, üretilen sayfa ile stilde geçen her `--vscode-*` belirtecinin bu
//   listede olduğunu ölçer. Liste bir izin listesidir ve elle genişletilir;
//   uydurma bir belirteç sessizce hiçbir şeye çözülür ve renk kaybolur.
export const TEMA_BELIRTECLERI: readonly string[] = [
  "--vscode-editor-background",
  "--vscode-editor-foreground",
  "--vscode-editor-font-family",
  "--vscode-editorLineNumber-foreground",
  "--vscode-editorWidget-background",
  "--vscode-descriptionForeground",
  "--vscode-focusBorder",
  "--vscode-list-hoverBackground",
  "--vscode-markdown-font-family",
  "--vscode-markdown-font-size",
  "--vscode-panel-border",
  "--vscode-sideBar-background",
  "--vscode-textBlockQuote-border",
  "--vscode-textCodeBlock-background",
  "--vscode-textLink-foreground",
  "--vscode-tree-indentGuidesStroke",
  "--vscode-widget-border",
];

/** Kanon paletinin bu yüzeyin tanıdığı şekli (oz/siniflama/kayit.json). */
export interface RenkPaleti {
  agacRenkleri?: Record<string, string>;
  aileler?: Record<string, string>;
  sadeRenkler?: Record<string, string>;
  sadeRenklerAcik?: Record<string, string>;
  kodOnekleri?: Record<string, string>;
  kodOnekleriAcik?: Record<string, string>;
  driftRozetleri?: Record<string, string>;
}

/** Çözülmüş bir atfın hedefi — kabuk kurar, çekirdek yalnız yazar. */
export interface AtifHedefi {
  /** Bağlantının href değeri: aynı dosyada çapa, başka dosyada komut bağı. */
  href: string;
  ipucu: string;
}

/** Yüzeyin ihtiyaç duyduğu arayüz metinleri (yuzey-metinleri.ts karşılar). */
export interface MasaMetinleri {
  agacBasligi: string;
  kunyeEtiketi: string;
  kunyeYeri(ilk: number, son: number): string;
  agacSatirIpucu(tip: string, satir: number): string;
  yinelenenMetinIpucu: string;
  yinelenenBaslikEtiketi: string;
  atifIpucu(kod: string): string;
}

export interface MasaGirdisi {
  kaynak: string;
  /** Kullanıcıya gösterilen dosya adı (kök simgesi ve künye başlığı için). */
  dosyaAdi: string;
  palet: RenkPaleti;
  /** Widget tip adı → kanon ailesi (renk değişkeni bundan seçilir). */
  aile(tipAd: string): string | undefined;
  /** Bir düğüm tipinin gömülü SVG gövdesi; çizilemezse boş dize. */
  simge(tip: string): string;
  /** Yapı başlığının aile işareti. */
  agacSimgesi: string;
  /** Bir KOD'un tanımına giden bağ; çözülemezse undefined (bağ üretilmez). */
  atifCoz(kod: string): AtifHedefi | undefined;
  /** Kaynağın verilen satırını EDİTÖRDE açan bağ (komut kapısı). */
  satirBaglantisi(satir: number): string;
  metinler: MasaMetinleri;
  /** Eklentinin stil dosyası (medya/onizleme.css). */
  stil: string;
}

// ── HTML kaçışı: saf modül kendi güvenlik sınırını taşır ────────────────────
function kacir(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Türkçe adları ASCII değişken adına indirir (CSS değişkeni Türkçe taşımaz). */
function ascii(s: string): string {
  return s
    .replace(/[çÇ]/g, "c").replace(/[ğĞ]/g, "g").replace(/[ıI]/g, "i").replace(/[İi]/g, "i")
    .replace(/[öÖ]/g, "o").replace(/[şŞ]/g, "s").replace(/[üÜ]/g, "u")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// ── ① PALET: kanon → CSS değişkenleri (tek renk kaynağı) ───────────────────

/**
 * Kanon paletini CSS değişkenlerine döker. Koyu tema `:root` hanesinde yaşar;
 * açık tema yalnız kanonun AÇIK EŞLERİNİ (sadeRenklerAcik · kodOnekleriAcik)
 * geçersiz kılar. Eşi olmayan renkler (ağaç omurgası ve aileler) tek değer
 * taşır ve yüzeyde editörün ön plan rengiyle karıştırılarak kullanılır.
 */
export function paletDegiskenleri(palet: RenkPaleti): string {
  const satir = (onek: string, harita: Record<string, string> | undefined): string[] =>
    Object.entries(harita ?? {})
      .filter(([, d]) => /^#[0-9a-fA-F]{3,8}$/.test(d))
      .map(([ad, deger]) => `--sr-${onek}-${ascii(ad)}:${deger};`);

  const koyu = [
    ...satir("agac", palet.agacRenkleri),
    ...satir("aile", palet.aileler),
    ...satir("sade", palet.sadeRenkler),
    ...satir("onek", palet.kodOnekleri),
    ...satir("rozet", palet.driftRozetleri),
  ].join("");
  const acik = [
    ...satir("sade", palet.sadeRenklerAcik),
    ...satir("onek", palet.kodOnekleriAcik),
  ].join("");
  return `:root{${koyu}}\nbody.vscode-light{${acik}}`;
}

/** Bir KOD'un imza rengi değişkeni — kanonun `kodOnekleri` gruplarından. */
function kodRenkDegiskeni(kod: string, palet: RenkPaleti): string {
  const onek = kod.split("-")[0];
  for (const grup of Object.keys(palet.kodOnekleri ?? {})) {
    if (grup === "not") continue;
    if (grup.split("|").includes(onek)) return `var(--sr-onek-${ascii(grup)})`;
  }
  return "var(--sr-sade-kod)";
}

/** Bir düğüm tipinin renk değişkeni — ağaç omurgası ya da kanon ailesi. */
function tipRenkDegiskeni(tip: string, girdi: MasaGirdisi): string | undefined {
  if (girdi.palet.agacRenkleri?.[tip]) return `var(--sr-agac-${ascii(tip)})`;
  const aile = girdi.aile(tip);
  if (aile && girdi.palet.aileler?.[aile]) return `var(--sr-aile-${ascii(aile)})`;
  return undefined;
}

// ── ② YAPI AĞACI: gerçek ağaç — girinti · bağ çizgisi · simge · satır ───────

/** Bir düğümün ağaçta görünen adı: `ad` alanı, yoksa `ne` (kod öneki düşer). */
function dugumAdi(d: Dugum): string {
  const alan = (isim: string): string | undefined => {
    const p = [...d.parametreler, ...d.ozellikler].find((x) => x.ad === isim);
    return p && p.deger.tur === "metin" ? p.deger.metin : undefined;
  };
  const ad = alan("ad");
  if (ad) return ad;
  const ne = (alan("ne") ?? "").replace(/\s*⏎\s*/g, " ").trim();
  if (!ne) return "";
  // "DIL-0 · Tanım · …" gibi metinlerde kimlik zaten kod sütununda durur.
  const kod = dugumKodu(d);
  return kod && ne.startsWith(kod) ? ne.slice(kod.length).replace(/^\s*·\s*/, "") : ne;
}

function dugumKodu(d: Dugum): string | undefined {
  const p = [...d.parametreler, ...d.ozellikler].find((x) => x.ad === "kod");
  return p && (p.deger.tur === "kod" || p.deger.tur === "metin") ? p.deger.metin : undefined;
}

/** Düğümün TİP adı — prizma ile aynı kural: widget'ta tip adı, ötekinde türü.
 *  `Kural türkçeOrthografi(...)` bildiriminde `ad` kuralın ADIDIR, tipi değil;
 *  simge ile renk bu ayrım yapılmazsa yanlış aileden okunur. */
export function tipAdi(d: Dugum): string {
  return d.tur === "widget" ? d.ad : d.tur;
}

function agacSatiri(d: Dugum, girdi: MasaGirdisi): string {
  const kod = dugumKodu(d);
  const ad = dugumAdi(d);
  const tip = tipAdi(d);
  const renk = tipRenkDegiskeni(tip, girdi);
  const simge = girdi.simge(tip);
  // İpucu YALNIZ simgenin üstündedir (Founder kusuru ③): satırın tamamına
  // bağlanan balon, altındaki satırı örtüyor ve ağacı okunmaz kılıyordu.
  const simgeHane = simge
    ? `<span class="as-simge"${renk ? ` style="--renk:${renk}"` : ""} title="${kacir(girdi.metinler.agacSatirIpucu(tip, d.satir))}">${simge}</span>`
    : "";
  const kodHane = kod
    ? `<span class="as-kod" style="--kodrenk:${kodRenkDegiskeni(kod, girdi.palet)}">${kacir(kod)}</span>`
    : "";
  // Founder şerhi 2026-09-16 (üçüncü tur): kod ile açıklama AYNI satır kutusunda
  // dizilmez. Kod ile satır numarası `as-bas` hanesinde yan yana durur, açıklama
  // ise onun ALTINDA girintili bir gövde olarak akar; dar sütunda kırılsa bile
  // kodun altında kalır, çünkü kırılan gövde artık kodun kardeşi değil, ardılıdır.
  const basHane = `<span class="as-bas">${simgeHane}${kodHane}`
    + `<span class="as-satir">${d.satir}</span></span>`;
  const adHane = ad ? `<span class="as-ad">${kacir(ad)}</span>` : "";
  return `<a class="as" href="${kacir(girdi.satirBaglantisi(d.satir))}">${basHane}${adHane}</a>`;
}

/** Bildirim ağacını iç içe listeye çevirir (sarma ilişkisi girintiden okunur). */
function agacDali(dugumler: readonly Dugum[], girdi: MasaGirdisi): string {
  if (!dugumler.length) return "";
  return `<ul>${dugumler.map((d) =>
    `<li>${agacSatiri(d, girdi)}${agacDali(d.cocuklar, girdi)}</li>`).join("")}</ul>`;
}

export function yapiAgaci(bildirimler: readonly Dugum[], girdi: MasaGirdisi): string {
  const kokSimge = girdi.simge("dosya");
  // Kök de baş hanesini taşır: satır kutusu artık `as-bas` olduğu için simge ile
  // dosya adı ancak o hanenin içinde yan yana durur.
  const kok = `<div class="as as-kok"><span class="as-bas">`
    + `${kokSimge ? `<span class="as-simge">${kokSimge}</span>` : ""}`
    + `<span class="as-kod">${kacir(girdi.dosyaAdi)}</span></span></div>`;
  return `<div class="agac">${kok}${agacDali(bildirimler, girdi)}</div>`;
}

// ── ③ KÜNYE: dosya başındaki teknik bant, katlanmış ────────────────────────

/** Kaynağın başındaki yorum bandını (varsa) döndürür — içerik değil, künyedir. */
export function kunyeBandi(kaynak: string): { metin: string; ilk: number; son: number } | undefined {
  const satirlar = kaynak.split("\n");
  let son = 0;
  while (son < satirlar.length && satirlar[son].startsWith("//")) son++;
  if (son === 0) return undefined;
  return { metin: satirlar.slice(0, son).join("\n"), ilk: 1, son };
}

function kunyeHanesi(kaynak: string, girdi: MasaGirdisi): string {
  const bant = kunyeBandi(kaynak);
  if (!bant) return "";
  const baslik = `${girdi.metinler.kunyeEtiketi} · ${girdi.dosyaAdi}`;
  return `<details class="kunye"><summary>`
    + `<span class="kunye-baslik">${kacir(baslik)}</span>`
    + `<span class="kunye-yer">${kacir(girdi.metinler.kunyeYeri(bant.ilk, bant.son))}</span>`
    + `</summary><pre>${kacir(bant.metin)}</pre></details>`;
}

// ── ④ YAZIM TÜRLERİ: Hüküm · Gerekçe · Örnek · Zorlama kendi başlığıyla ────

export const YAZIM_TURLERI: readonly string[] = ["Hüküm", "Gerekçe", "Örnek", "Zorlama"];

/**
 * Madde metnindeki `**Hüküm:** …` kalıbını kendi başlığına çevirir. Dönüşüm
 * markdown düzeyinde yapılır ki gövdenin kendi biçimi (kod aralığı, bağlantı,
 * vurgu) markdown motorunun elinde kalsın; başlık sınıfı `heading_open`
 * kuralıyla takılır, gövdeyi saran hane ise render sonrası kurulur.
 */
export function yazimTurleriniAyir(md: string): string {
  const desen = new RegExp(`^\\s*\\*\\*(${YAZIM_TURLERI.join("|")})\\s*:\\*\\*\\s*`, "u");
  return md.split("\n").map((satir) => {
    const es = desen.exec(satir);
    if (!es) return satir;
    const govde = satir.slice(es[0].length).trim();
    return `#### ${es[1]}\n\n${govde}`;
  }).join("\n");
}

/** Başlıktan sonraki gövdeyi girintili bir haneye sarar (render sonrası). */
export function yazimGovdeleriniSar(html: string): string {
  const desen = /<h4 class="sarmal-yazim[^"]*">[\s\S]*?<\/h4>\n?/g;
  const baslangiclar: { bas: number; son: number }[] = [];
  for (let e = desen.exec(html); e; e = desen.exec(html)) {
    baslangiclar.push({ bas: e.index, son: e.index + e[0].length });
  }
  if (!baslangiclar.length) return html;
  let cikti = "";
  let imlec = 0;
  for (let i = 0; i < baslangiclar.length; i++) {
    const { son } = baslangiclar[i];
    cikti += html.slice(imlec, son);
    // Gövde: bir sonraki başlığa (herhangi bir h1–h6) ya da metnin sonuna dek.
    const sonrakiBaslik = /<h[1-6][\s>]/g;
    sonrakiBaslik.lastIndex = son;
    const es = sonrakiBaslik.exec(html);
    const bitis = es ? es.index : html.length;
    const govde = html.slice(son, bitis).trim();
    cikti += govde ? `<div class="sarmal-yazim-govde">${govde}</div>\n` : "";
    imlec = bitis;
  }
  return cikti + html.slice(imlec);
}

// ── ⑤ ATIFLAR: madde metnindeki kimlikler tıklanır olur ────────────────────

/**
 * Render edilmiş belge HTML'indeki KOD sözcelerini bağlantıya çevirir. Etiket
 * içleri ile `code`/`pre` bölgeleri ATLANIR: biri HTML'i bozardı, öteki
 * kaynağın kendi gösterimidir. ÇÖZÜLEMEYEN sözce düz metin kalır — kırık atıf
 * bağlantı gibi görünmez (baglanti-cekirdek.ts ile aynı dürüstlük kuralı).
 */
export function atiflariBagla(html: string, coz: (kod: string) => AtifHedefi | undefined): string {
  const desen = new RegExp(KOD_DESENI.source, "gu");
  let cikti = "";
  let i = 0;
  while (i < html.length) {
    const tag = html.indexOf("<", i);
    const metin = tag === -1 ? html.slice(i) : html.slice(i, tag);
    desen.lastIndex = 0;
    cikti += metin.replace(desen, (kod) => {
      const hedef = coz(kod);
      return hedef
        ? `<a class="sr-atif" href="${kacir(hedef.href)}" title="${kacir(hedef.ipucu)}">${kod}</a>`
        : kod;
    });
    if (tag === -1) break;
    // Etiketi aynen geçir; code/pre ise kapanışına dek dokunma.
    const kapa = html.indexOf(">", tag);
    const etiket = html.slice(tag, kapa + 1);
    const ad = /^<\/?([a-zA-Z0-9]+)/.exec(etiket)?.[1]?.toLowerCase();
    if ((ad === "code" || ad === "pre") && !etiket.startsWith("</")) {
      const son = html.indexOf(`</${ad}>`, kapa);
      const bitis = son === -1 ? html.length : son + `</${ad}>`.length;
      cikti += html.slice(tag, bitis);
      i = bitis;
      continue;
    }
    cikti += etiket;
    i = kapa + 1;
  }
  return cikti;
}

// ── ⑥ YİNELEME: belgede basılmış metnin yerine atıf konur ──────────────────

const ELID_IM = "";
/** Belgede basılmış sayılacak en kısa metin — kısa değerler kod olarak kalır. */
const ELID_ESIGI = 40;

function normalle(s: string): string {
  return s.normalize("NFC").replace(/[`*]/g, "").replace(/\s+/g, " ").trim();
}

/** Belge bloklarında BASILAN metinler → hangi başlığın altında basıldığı. */
export function belgeMetinleri(kaynak: string, baslikEtiketi: string): Map<string, string> {
  const harita = new Map<string, string>();
  const desen = new RegExp(`^\\s*\\*\\*(${YAZIM_TURLERI.join("|")})\\s*:\\*\\*\\s*(.*)$`, "u");
  for (const p of belgeParcalari(kaynak)) {
    if (p.tur !== "belge") continue;
    for (const satir of p.metin.split("\n")) {
      const es = desen.exec(satir);
      if (es) {
        const govde = normalle(es[2]);
        if (govde.length >= ELID_ESIGI) harita.set(govde, es[1]);
        continue;
      }
      const baslik = /^\s*#{1,6}\s+(.*)$/.exec(satir);
      if (baslik) {
        const metin = normalle(baslik[1]);
        if (metin.length >= ELID_ESIGI) harita.set(metin, baslikEtiketi);
      }
    }
  }
  return harita;
}

/**
 * Kod parçasındaki TEK SATIRLIK dizgilerden belgede zaten basılmış olanları
 * imle değiştirir ve yerine konacak atıf etiketlerini sırayla döndürür. Çok
 * satırlı dizgi bilinçle DIŞARIDADIR: satır sayısı değişirse kaynak bölmesinin
 * satır numaraları kayar ve yüzey kaynağa yalan söyler.
 */
export function yinelemeyiIsaretle(
  kod: string, basilanlar: ReadonlyMap<string, string>,
): { metin: string; etiketler: string[] } {
  const etiketler: string[] = [];
  const metin = kod.replace(/"(?:[^"\\\n]|\\.)*"/g, (dizgi) => {
    if (dizgi.startsWith('"""')) return dizgi;
    const ic = normalle(dizgi.slice(1, -1));
    if (ic.length < ELID_ESIGI) return dizgi;
    const etiket = basilanlar.get(ic);
    if (!etiket) return dizgi;
    etiketler.push(etiket);
    return ELID_IM;
  });
  return { metin, etiketler };
}

// ── ⑦ KAYNAK BÖLMESİ: satır numaralı gerçek kod ────────────────────────────

export function kaynakBolmesi(
  kod: string, ilkSatir: number, girdi: MasaGirdisi, basilanlar: ReadonlyMap<string, string>,
): string {
  const { metin, etiketler } = yinelemeyiIsaretle(kod, basilanlar);
  const tipRenk = (ad: string): string | undefined => tipRenkDegiskeni(ad, girdi);
  let sira = 0;
  const satirlar = kodBoyaSatirlari(metin, tipRenk).map((boyali, i) => {
    const govde = boyali.split(ELID_IM).reduce((toplam, parca, j) => {
      if (j === 0) return parca;
      const etiket = etiketler[sira++] ?? "";
      const im = `<span class="sk-elid" title="${kacir(girdi.metinler.yinelenenMetinIpucu)}">`
        + `&#8593; ${kacir(etiket)}</span>`;
      return toplam + im + parca;
    }, "");
    const no = ilkSatir + i;
    return `<div class="ks" id="s-${no}">`
      + `<a class="ks-no" href="${kacir(girdi.satirBaglantisi(no))}">${no}</a>`
      + `<span class="ks-kod">${govde}</span></div>`;
  });
  return `<div class="kaynak">${satirlar.join("")}</div>`;
}

// ── ⑧ MARKDOWN MOTORU ──────────────────────────────────────────────────────

const BOLUMLER: Record<string, string> = {
  "Amaç": "amac", "Kapsam": "kapsam", "Neden": "neden", "Sonuç": "sonuc", "Nasıl": "nasil",
};

function motorKur(): MarkdownIt {
  const md = new MarkdownIt({
    html: true,
    linkify: true,
    breaks: false,
    highlight: (kod, dil) => {
      if (dil && hljs.getLanguage(dil)) {
        try { return hljs.highlight(kod, { language: dil, ignoreIllegals: true }).value; } catch { /* düş */ }
      }
      return "";
    },
  });
  md.renderer.rules.heading_open = (tokens, idx, opts, _env, self) => {
    const icerik = tokens[idx + 1]?.content ?? "";
    const yazim = YAZIM_TURLERI.find((t) => icerik.trim() === t);
    if (yazim && tokens[idx].tag === "h4") {
      tokens[idx].attrJoin("class", "sarmal-yazim sarmal-yazim-" + ascii(yazim));
      return self.renderToken(tokens, idx, opts);
    }
    const es = /^\s*(?:[\p{Extended_Pictographic}️‍]+\s*)?(Amaç|Kapsam|Neden|Sonuç|Nasıl)\b/u.exec(icerik);
    if (es) tokens[idx].attrJoin("class", "sarmal-bolum sarmal-bolum-" + BOLUMLER[es[1]]);
    return self.renderToken(tokens, idx, opts);
  };
  return md;
}

const md = motorKur();

/** Bir belge bloğunu yüzeye çevirir: yazım türleri ayrılır, atıflar bağlanır. */
export function belgeBolgesi(icerik: string, girdi: MasaGirdisi): string {
  const ham = md.render(yazimTurleriniAyir(belgeGovdesiMd(icerik)));
  return `<div class="belge">${atiflariBagla(yazimGovdeleriniSar(ham), girdi.atifCoz)}</div>`;
}

// ── ⑨ SAYFA ────────────────────────────────────────────────────────────────

/** Masa düzeninin gövdesi (kabuk bunu `<body>` içine koyar). */
export function masaGovdesi(girdi: MasaGirdisi): string {
  const program = ayristir(belirtecle(girdi.kaynak));
  const basilanlar = belgeMetinleri(girdi.kaynak, girdi.metinler.yinelenenBaslikEtiketi);
  const kunye = kunyeHanesi(girdi.kaynak, girdi);
  const agac = yapiAgaci(program.bildirimler, girdi);
  const baslik = `<h2 class="bolum-baslik">${girdi.agacSimgesi}${kacir(girdi.metinler.agacBasligi)}</h2>`;

  // Künyenin satırları içerik değildir; kaynak bölmesi onları ikinci kez basmaz.
  const bant = kunyeBandi(girdi.kaynak);
  const kunyeSonu = bant ? bant.son : 0;
  const icerik = belgeParcalari(girdi.kaynak).map((p) => {
    if (p.tur === "belge") return belgeBolgesi(p.metin, girdi);
    const atlanan = Math.max(0, kunyeSonu - p.ilkSatir + 1);
    const satirlar = p.metin.split("\n").slice(atlanan);
    if (!satirlar.join("").trim()) return "";
    return kaynakBolmesi(satirlar.join("\n"), p.ilkSatir + atlanan, girdi, basilanlar);
  }).join("");

  return `<div class="masa"><aside class="kenar">${baslik}${agac}${kunye}</aside>`
    + `<main class="icerik">${icerik}</main></div>`;
}

/** Tam sayfa — kabuk yalnız bunu webview'e verir. */
export function masaSayfasi(girdi: MasaGirdisi, htmlDili: string): string {
  return `<!DOCTYPE html>
<html lang="${kacir(htmlDili)}"><head><meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>${paletDegiskenleri(girdi.palet)}\n${TEMEL_STIL}\n${girdi.stil}</style></head>
<body>${masaGovdesi(girdi)}</body></html>`;
}

/** Hata kutusu — kabuk söz dizimi hatasında bunu sarar. */
export function hataSayfasi(govde: string, girdi: Pick<MasaGirdisi, "palet" | "stil">, htmlDili: string): string {
  return `<!DOCTYPE html>
<html lang="${kacir(htmlDili)}"><head><meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>${paletDegiskenleri(girdi.palet)}\n${TEMEL_STIL}\n${girdi.stil}</style></head>
<body>${govde}</body></html>`;
}

/** Tipografi — renk taşımaz, yalnız ritim ve editörün kendi belirteçleri. */
export const TEMEL_STIL = `
body { font-family: var(--vscode-markdown-font-family, -apple-system, sans-serif);
  font-size: var(--vscode-markdown-font-size, 14px); line-height: 1.6;
  color: var(--vscode-editor-foreground); background: var(--vscode-editor-background);
  margin: 0; }
h1 { font-size: 1.8em; font-weight: 650; margin: 1.2em 0 .5em; }
h2 { font-size: 1.4em; font-weight: 600; margin: 1.4em 0 .5em; }
h3 { font-size: 1.18em; font-weight: 650; margin: 1.1em 0 .35em; }
h4 { font-size: 1.05em; font-weight: 600; margin: 1em 0 .3em; }
p, ul, ol, blockquote { margin: .6em 0; }
a { color: var(--vscode-textLink-foreground); }
code { font-family: var(--vscode-editor-font-family, monospace); font-size: .9em;
  background: color-mix(in srgb, currentColor 10%, transparent); padding: .1em .35em; border-radius: 4px; }
pre { font-family: var(--vscode-editor-font-family, monospace); font-size: .88em;
  background: var(--vscode-textCodeBlock-background); padding: .8em 1em; border-radius: 6px;
  white-space: pre-wrap; overflow-wrap: anywhere; }
pre code { background: none; padding: 0; font-size: 1em; }
blockquote { border-left: 3px solid var(--vscode-textBlockQuote-border); padding: 0 1em; }
table { border-collapse: collapse; display: block; max-width: 100%; overflow-x: auto; }
th, td { border: 1px solid var(--vscode-widget-border); padding: .35em .8em; }
th { background: color-mix(in srgb, var(--sr-sade-tablo) 16%, transparent); font-weight: 650; }
hr { border: none; border-top: 1px solid var(--vscode-widget-border); }
`;

// ── ⑩ NÖBET KAPILARI: ölçümün kaynağı yüzeyin KENDİSİDİR ───────────────────

/**
 * Bir metindeki elle yazılmış renk değerleri (nöbet bunu sıfır ölçer).
 * `&#8593;` gibi HTML SAYI VARLIKLARI renk DEĞİLDİR ve dışarıda bırakılır:
 * ilk ölçümde üçü birden renk sanılmış ve nöbet kendi yazdığı oka kırmızı
 * yanmıştı. Ayrım `&` öncüsüyle yapılır — gerçek bir renk değerinin önünde
 * hiçbir zaman `&` durmaz.
 */
export function renkDegerleri(metin: string): string[] {
  return metin.match(/(?<!&)#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\s*\(/g) ?? [];
}

/** Metinde kullanılan `--sr-*` değişkenleri. */
export function kullanilanPaletDegiskenleri(metin: string): string[] {
  return [...new Set(metin.match(/--sr-[a-z0-9-]+/g) ?? [])];
}

/** Metinde kullanılan `--vscode-*` tema belirteçleri. */
export function kullanilanTemaBelirtecleri(metin: string): string[] {
  return [...new Set(metin.match(/--vscode-[A-Za-z0-9-]+/g) ?? [])];
}

/** Metinde TANIMLANAN `--sr-*` değişkenleri (palet hanesinin kendisi). */
export function tanimliPaletDegiskenleri(metin: string): string[] {
  return [...new Set((metin.match(/--sr-[a-z0-9-]+(?=\s*:)/g) ?? []))];
}

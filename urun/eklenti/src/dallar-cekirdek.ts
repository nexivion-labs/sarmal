// ═══════════════════════════════════════════════════════════════════════════
// dallar-cekirdek.ts — 🌳 Ağaç kılavuz çizgilerinin SAF çekirdeği (KPS-SIR-A02)
//
//   dallar.ts'nin ızgara mantığı vscode'suz burada yaşar; Node sınamasında
//   koşulabilir (sinama/dallar-cekirdek.test.ts).
//
//   SÜTUN YAPIDAN GELİR. Bağlaç sütunu eskiden düğümün yazıldığı sütundan
//   (girintiden) hesaplanıyordu; girintisi bozuk bir dosyada Katman, AltKatman
//   ve Adım aynı sütunda yazıldığında ağaç onları kardeş gibi çiziyor ve yapıyı
//   yanlış gösteriyordu. Sütun artık ayrıştırıcının verdiği derinlikten gelir:
//   derinliği d olan düğümün bağlacı (d − 1) × GENISLIK sütunundadır. Doğru
//   girintili dosyada iki hesap birebir aynı sonucu verir; bozuk girintiyi
//   ayrıca `girinti-yapı-uyumsuz` bilgi notu söyler (çekirdek dil denetçisi).
// ═══════════════════════════════════════════════════════════════════════════

import type { Program, Dugum } from "../../cekirdek/src/sozdizim.ts";

/** Seviye başına sütun (.sar girintisi = 2 boşluk). */
export const GENISLIK = 2;

/** Glif ızgarası: ızgara[satır][sütun] = "│" | "├" | "└" (satır sıfır tabanlı). */
export type Izgara = Map<number, Map<number, string>>;

function koy(g: Izgara, satır: number, sütun: number, glif: string, ezme = false): void {
  let sr = g.get(satır);
  if (!sr) { sr = new Map(); g.set(satır, sr); }
  if (ezme || !sr.has(sütun)) sr.set(sütun, glif);
}

/** Bir düğümün başlangıç satırı (0-tabanlı). */
function satırNo(d: Dugum): number { return Math.max(0, d.satir - 1); }

interface Kardeş { satır: number; derinlik: number; dugum?: Dugum; }

/** Düğümün çocukları: YAPISAL çocuklar + `raflar:{}` harita kısayolu (dosya-analojisi).
 *  Referans temizliği: attribute'lar (kod/durum/ne/görev…) ağaca GİRMEZ — yalnız
 *  yapısal düğümler + raflar (klasör→dosya gibi). Çok-satırlı değer içi kirlenmez. */
function çocuklar(d: Dugum, derinlik: number): Kardeş[] {
  const liste: Kardeş[] = d.cocuklar.map((c) => ({ satır: satırNo(c), derinlik, dugum: c }));
  for (const p of [...d.parametreler, ...d.ozellikler]) {
    if (p.deger.tur === "harita" && p.ad === "raflar") {
      for (const c of p.deger.ciftler ?? []) liste.push({ satır: Math.max(0, c.satir - 1), derinlik });
    }
  }
  return liste.sort((a, b) => a.satır - b.satır);
}

/** Kardeş grubunu ızgaraya döşe: ├/└ dallar + aralarında sürekli │.
 *  Bağlaç sütunu = (derinlik − 1) × GENISLIK; kökler (derinlik 0) işaretlenmez,
 *  yalnız içlerine inilir. */
function döşe(g: Izgara, kardeşler: Kardeş[]): void {
  kardeşler.forEach((n, i) => {
    const son = i === kardeşler.length - 1;
    const bs = (n.derinlik - 1) * GENISLIK;   // bağlaç sütunu — girintiden değil yapıdan
    if (bs >= 0) {
      koy(g, n.satır, bs, son ? "└" : "├", true);              // dal (│ üstüne ezer)
      if (!son) for (let ℓ = n.satır + 1; ℓ < kardeşler[i + 1].satır; ℓ++) koy(g, ℓ, bs, "│");
    }
    if (n.dugum) döşe(g, çocuklar(n.dugum, n.derinlik + 1));
  });
}

/** Programın dal ızgarası (saf). */
export function dalIzgarasi(program: Program): Izgara {
  const g: Izgara = new Map();
  döşe(g, program.bildirimler.map((b) => ({ satır: satırNo(b), derinlik: 0, dugum: b })));
  return g;
}

// ── Satır dizesi: ızgaradan editöre çizilen metin (KPS-SIR-A02 · inceleme bulgusu) ──
//   Flutter tekniği: satır başına TEK inline dize; kutu karakterleri doğru
//   sütunlara, araları NBSP. Dize metni itmeden `before` olarak basılır, bu yüzden
//   metnin kapladığı sütunlara glif çizilemez ve o bölge temizlenir.
//
//   AZ GİRİNTİLİ DÜĞÜM. Yapı sütunu metnin başlangıcına çarptığında (girintisi
//   bozuk dosyada Katman, AltKatman ve Adım gibi) dal glifi eskiden metnin altında
//   kalıp siliniyor ve düğüm dalsız görünüyordu. Dal glifi artık metnin hemen
//   önündeki son kullanılabilir sütuna sıkıştırılır; sıkıştırılan dal uzatma çizgisi
//   taşımaz. BİLİNÇLİ SINIR: metin sıfırıncı sütundan başlıyorsa önünde hiç yer
//   yoktur ve dal çizilmez; dikey │ çizgileri de metnin altında kalan sütunlarda
//   çizilmez. Bu hâllerde bozuk girintiyi `girinti-yapı-uyumsuz` notu söyler.

export const V = "│";      // │ dikey
export const H = "─";      // ─ yatay (dal ucu)
export const ORTA = "├";   // ├ ara-kardeş (dikey sürer)
export const SON = "╰";    // ╰ son-kardeş köşesi (yuvarlak — Flutter ile birebir)
export const NBSP = "\u00a0";

/** Izgaranın bir satırını editöre basılacak dizeye çevirir (saf). `ilkYazi` satırın
 *  ilk boşluk-dışı karakterinin sütunu, `satirSonu` satırın uzunluğudur. Çizilecek
 *  glif yoksa tanımsız döner. */
export function satirDizesi(sr: ReadonlyMap<number, string>, ilkYazi: number, satirSonu: number):
  { capa: number; dize: string } | undefined {
  const sutunlar = [...sr.keys()];
  if (!sutunlar.length) return undefined;
  const metinVar = ilkYazi < satirSonu;
  const chars: string[] = new Array(Math.max(...sutunlar) + GENISLIK).fill(NBSP);
  for (const [sutun, glif] of sr) {
    if (glif === "│") {
      if (chars[sutun] === NBSP) chars[sutun] = V;
      else if (chars[sutun] === SON) chars[sutun] = ORTA;   // dikey + köşe = ├
    }
  }
  for (const [sutun, glif] of sr) {
    if (glif === "│") continue;
    const dal = glif === "└" ? SON : ORTA;
    if (metinVar && sutun >= ilkYazi) {
      if (ilkYazi === 0) continue;                           // önünde yer yok: bilinçli sınır
      chars[ilkYazi - 1] = dal;                              // metnin önündeki son sütuna sıkıştır
      continue;
    }
    chars[sutun] = chars[sutun] === V && dal === SON ? ORTA : dal;
    for (let c = sutun + 1; c < sutun + GENISLIK; c++)       // ─ metne kadar uzat
      if (chars[c] === NBSP) chars[c] = H;
  }
  // Metnin bulunduğu bölgeyi temizle (kılavuz yalnız girintide görünür).
  for (let c = ilkYazi; c < Math.min(chars.length, satirSonu); c++) chars[c] = NBSP;
  const dolu = chars.findIndex((c) => c !== NBSP);
  if (dolu < 0) return undefined;
  // Çapa: ilk kılavuz sütunu (kısa satırda 0). before oraya basılır, metni itmez.
  const capa = satirSonu < dolu ? 0 : dolu;
  return { capa, dize: chars.slice(capa).join("") };
}

// ── Blok aralıkları: kapanış etiketi ve aktif blok boyası için ortak tarama ──
//   Hafif sözcüksel tarama (dal ızgarasından bağımsız): `Ad(...) { ... }` gövdelerinin
//   açılış ve kapanış satırlarını (0-tabanlı) verir. Saftır; vscode'suz sınanır.

export interface BlokAraligi { ad: string; kod: string; acan: number; kapanan: number; }

/** Satır listesinden iç içe blok aralıklarını çıkarır; kapanış sırasıyla döner (içten dışa). */
export function blokAraliklari(satirlar: readonly string[]): BlokAraligi[] {
  const sonuc: BlokAraligi[] = [];
  const yigin: { ad: string; kod: string; acan: number }[] = [];
  const cagri: { ad: string; ham: string }[] = [];
  let belge = false, uclu = false, sonKap: { ad: string; ham: string } | undefined;

  for (let s = 0; s < satirlar.length; s++) {
    const m = satirlar[s];
    if (belge) { if (m.includes("|<--")) belge = false; continue; }
    let i = 0, dz = false, ad = "", ab = -1;
    while (i < m.length) {
      const k = m[i];
      if (uclu) { if (m.startsWith('"""', i)) { uclu = false; i += 3; continue; } i++; continue; }
      if (dz) { if (k === '"') dz = false; i++; continue; }
      if (m.startsWith('"""', i)) { uclu = true; i += 3; continue; }
      if (k === '"') { dz = true; i++; continue; }
      if (k === "/" && m[i + 1] === "/") break;
      if (m.startsWith("-->|", i)) { belge = true; break; }
      if (/[\p{L}\p{N}_-]/u.test(k)) { if (ab < 0) ab = i; i++; continue; }
      if (ab >= 0) { ad = m.slice(ab, i); ab = -1; }
      // Yeni çağrı açılınca bayat sonKap temizlenir: `raflar: {` MAP bloğu önceki
      // `Raf(...)` adını almasın.
      if (k === "(") { cagri.push({ ad, ham: "" }); ad = ""; sonKap = undefined; }
      else if (k === ")") { sonKap = cagri.pop(); }
      else if (k === "{") {
        const sh = sonKap; sonKap = undefined;
        yigin.push({ ad: sh?.ad ?? "", kod: sh ? /kod:\s*([^,\s)]+)/.exec(sh.ham)?.[1] ?? "" : "", acan: s });
      } else if (k === "}") {
        const b = yigin.pop();
        if (b) sonuc.push({ ...b, kapanan: s });
      }
      if (cagri.length && k !== "(") cagri[cagri.length - 1].ham += k;
      i++;
    }
    if (ab >= 0) ad = m.slice(ab);
  }
  return sonuc;
}

/** Aktif blok adayları: plan hiyerarşisinin beş düğüm türü. */
export const AKTIF_BLOK_TURLERI: ReadonlySet<string> = new Set(["Faz", "Blok", "Katman", "AltKatman", "Adım"]);

/** İmlecin (satır, 0-tabanlı) bulunduğu en içteki plan bloğu; yoksa tanımsız.
 *  Açılış satırı ve kapanış satırı bloğa dâhildir. */
export function aktifBlok(bloklar: readonly BlokAraligi[], satir: number): BlokAraligi | undefined {
  let en: BlokAraligi | undefined;
  for (const b of bloklar) {
    if (!AKTIF_BLOK_TURLERI.has(b.ad) || satir < b.acan || satir > b.kapanan) continue;
    if (!en || b.acan >= en.acan) en = b;   // en geç açılan = en içteki
  }
  return en;
}

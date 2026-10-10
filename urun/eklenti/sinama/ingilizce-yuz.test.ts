// ═══════════════════════════════════════════════════════════════════════════
// ingilizce-yuz.test.ts — 🌐 İNGİLİZCE YÜZÜN TEK İLKESİ (MGZ-A09)
//
//   Founder 2026-09-17 tarihinde İngilizce bir pencerede yarı çevrilmiş bir yüz
//   görmüş ve yayını durdurmuştur (HTR-INGILIZCE-YUZ-YARI-CEVRILMIS): eklenti
//   tip adlarının üstüne İngilizce karşılıklarını boyuyor, aynı satırdaki alan
//   adları ve değerler Türkçe kalıyor, boya imleç satırında kalkıyor ve kademe
//   simgesi boyanan sözcüğün harflerinin üstüne çiziliyordu. Founder'ın
//   2026-10-10 hükmü tek ilkedir: dosyanın üzerine boyanan İngilizce bindirme
//   kalkar ve dosya her dilde olduğu gibi Türkçe görünür; arayüz, tanılar ve
//   ipucu balonları İngilizce olur ve dosyadaki gerçek Türkçe adları anar.
//
//   Nöbet eklentinin GERÇEK girişini sahte bir editörde iki dilde koşturur
//   (etkinlesme-kabugu.ts). Fikstür doğuş paketinin ürettiği gerçek bir ağaçtır,
//   çünkü İngilizce kullanan birinin ilk açtığı dosya odur.
//
//   ① BİNDİRME. Editöre basılan her dekor okunur. İki şey yasaktır: kaynak
//     metni saydamlaştıran bir dekor türü ve satırın İÇİNE harf boyayan bir
//     dekor. Satır sonuna basılan notlar (satır içi tanı, onay notu) arayüzdür ve
//     etkin dilde konuşur; kapanış etiketi ise dosyadaki tipi adlandırdığı için
//     iki dilde birebir aynıdır ve Türkçe tip adını taşır.
//   ② TÜRKÇE YÜZ. Türkçe dilde boyanan her şey İngilizce dildekiyle aynıdır;
//     Türkçe kullanıcının gördüğü görünüş bu Adımla değişmez.
// ═══════════════════════════════════════════════════════════════════════════

import { test, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { dogusYaz } from "../../cekirdek/src/dogus.ts";
import { etkinlestir, geciciAlan, kabukTemizle, type EtkinEklenti, type KabukKaydi } from "./etkinlesme-kabugu.ts";

const BUGUN = "2026-10-10";
const acik: EtkinEklenti[] = [];
after(() => { for (const e of acik.splice(0)) e.kapat(); kabukTemizle(); });

/** Doğuş paketinin ürettiği gerçek ağaç; etkin dosya planın Faz dosyasıdır. */
function agacKur(): { alan: string; plan: string } {
  const alan = geciciAlan("sarmal-ingilizce-yuz-");
  dogusYaz(alan, "deneme", BUGUN, "proje");
  return { alan, plan: join(alan, "is", "plan", "faz", "1_dogus.sar") };
}

type Konum = { line: number; character: number };
type Ek = { contentText?: string; contentIconPath?: unknown };
type CizimSecenegi = { before?: Ek; after?: Ek; light?: { before?: Ek; after?: Ek }; dark?: { before?: Ek; after?: Ek } };
type Aralik = { start: Konum; end: Konum };
/** `setDecorations` iki biçim kabul eder: çıplak aralık ya da seçenekli dekor. */
type Dekor = Aralik | { range: Aralik; renderOptions?: CizimSecenegi };

/** Bir dekorun ya da dekor türünün boyadığı bütün metinler. */
function ekMetinleri(s: CizimSecenegi | undefined): string[] {
  if (!s) return [];
  return [s.before, s.after, s.light?.before, s.light?.after, s.dark?.before, s.dark?.after]
    .map((e) => e?.contentText)
    .filter((m): m is string => typeof m === "string" && m.length > 0);
}

interface Boyama { readonly satir: number; readonly sutun: number; readonly bos: boolean; readonly satirSonu: boolean; readonly metin: string }

/** Etkin editöre basılan her metin, konumu ve satır sonunda olup olmadığıyla. */
function boyananlar(kayit: KabukKaydi, kaynak: string): Boyama[] {
  const satirlar = kaynak.split("\n");
  const sonuc: Boyama[] = [];
  for (const [tur, dekorlar] of kayit.dekorlar) {
    const turMetni = ekMetinleri(kayit.dekorTurleri.get(tur) as CizimSecenegi | undefined);
    for (const d of dekorlar as Dekor[]) {
      const { start, end } = "range" in d ? d.range : d;
      const secenek = "range" in d ? d.renderOptions : undefined;
      for (const metin of [...turMetni, ...ekMetinleri(secenek)]) {
        sonuc.push({
          satir: start.line, sutun: start.character,
          bos: start.line === end.line && start.character === end.character,
          satirSonu: start.character >= (satirlar[start.line] ?? "").length,
          metin,
        });
      }
    }
  }
  return sonuc;
}

/** Kaynak metni görünmez kılan dekor türleri — bindirmenin mekanizması budur. */
function saydamlastiranTurler(kayit: KabukKaydi): string[] {
  return [...kayit.dekorTurleri].filter(([, s]) => {
    const secenek = s as { color?: unknown; opacity?: unknown } | undefined;
    return secenek?.color === "transparent" || secenek?.opacity === "0";
  }).map(([anahtar]) => anahtar);
}

/** Bir dilde etkinleşir, ilk tur yayınını bekler ve editöre basılanı okur. */
async function dildeBoyananlar(dil: "tr" | "en"): Promise<{ kayit: KabukKaydi; boyama: Boyama[]; kaynak: string }> {
  const { alan, plan } = agacKur();
  const e = etkinlestir({ klasorler: [alan], etkinDosya: plan, dil });
  acik.push(e);
  await e.turBekle();
  const kaynak = readFileSync(plan, "utf8");
  return { kayit: e.kayit, boyama: boyananlar(e.kayit, kaynak), kaynak };
}

/** Kapanış etiketleri: `}` satırının sonuna basılan `‹ Tip KOD` notları. */
const kapanisEtiketleri = (boyama: readonly Boyama[]): string[] =>
  boyama.filter((b) => b.satirSonu && /^\s*‹ /u.test(b.metin)).map((b) => `${b.satir}: ${b.metin.trim()}`);

/** Satırın içine (satır sonundan önce) ya da kaynak sözcesinin üstüne harf boyayan dekorlar. */
const satirIciBoyama = (boyama: readonly Boyama[]): string[] =>
  boyama.filter((b) => (!b.satirSonu || !b.bos) && /\p{L}/u.test(b.metin)).map((b) => `${b.satir}:${b.sutun} "${b.metin}"`);

// ── ① BİNDİRME ──────────────────────────────────────────────────────────────

test("MGZ-A09 ① İngilizce dilde dosyanın üzerine hiçbir sözcük boyanmaz ve kaynak metin saydamlaşmaz", async () => {
  const { kayit, boyama } = await dildeBoyananlar("en");
  assert.ok(boyama.length > 0, "editöre hiç dekor basılmadı — nöbet boş küme üstünde koşuyor");
  assert.deepEqual(saydamlastiranTurler(kayit), [],
    "İngilizce dilde kaynak metni saydamlaştıran bir dekor türü kuruldu — bindirme geri gelmiş");
  assert.deepEqual(satirIciBoyama(boyama), [],
    "İngilizce dilde satırın içine sözcük boyandı — dosya her dilde olduğu gibi görünmeli");
});

test("MGZ-A09 ① kapanış etiketi iki dilde aynıdır ve dosyadaki Türkçe tip adını anar", async () => {
  const en = kapanisEtiketleri((await dildeBoyananlar("en")).boyama);
  const { boyama, kaynak } = await dildeBoyananlar("tr");
  const tr = kapanisEtiketleri(boyama);
  assert.ok(tr.length >= 5, `doğuş planında en az beş kapanış etiketi beklenir, bulunan: ${tr.join(" | ")}`);
  assert.deepEqual(en, tr, "İngilizce dildeki kapanış etiketi Türkçedekinden ayrışıyor — etiket dosyadaki adı anmalı");
  for (const tip of ["Faz", "Blok", "Katman", "AltKatman", "Adım"]) {
    assert.ok(tr.some((e) => new RegExp(`‹ ${tip}(?: |$)`, "u").test(e)), `"${tip}" kapanışının etiketi yok: ${tr.join(" | ")}`);
    assert.ok(kaynak.includes(`${tip}( kod:`), `fikstür "${tip}" ilanı taşımıyor`);
  }
});

// ── ② TÜRKÇE YÜZ ────────────────────────────────────────────────────────────

test("MGZ-A09 ② Türkçe dilde görünüş değişmez: boyanan her şey İngilizce dildekiyle aynıdır, satır içi boya yoktur", async () => {
  const tr = await dildeBoyananlar("tr");
  const en = await dildeBoyananlar("en");
  assert.deepEqual(saydamlastiranTurler(tr.kayit), [], "Türkçe dilde kaynak metni saydamlaştıran bir dekor türü kuruldu");
  assert.deepEqual(satirIciBoyama(tr.boyama), [], "Türkçe dilde satırın içine sözcük boyandı");
  // Satır sonundaki arayüz notları dilde konuşur; satırın içindeki ve kaynağın
  // üstündeki her şey (dal çizgileri, simgeler) iki dilde birebir aynıdır.
  const dilsiz = (b: readonly Boyama[]): string[] =>
    b.filter((x) => !x.satirSonu || /^\s*‹ /u.test(x.metin)).map((x) => `${x.satir}:${x.sutun} ${x.metin}`).sort();
  assert.deepEqual(dilsiz(en.boyama), dilsiz(tr.boyama), "dosyanın üstüne boyanan bir şey dile göre değişiyor");
});

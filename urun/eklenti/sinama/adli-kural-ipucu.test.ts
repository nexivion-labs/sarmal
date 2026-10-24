// ═══════════════════════════════════════════════════════════════════════════
// adli-kural-ipucu.test.ts — 🏷️ Adlı Kuralın ipucu kartı başlıkta tipini gösterir (HST-YUZ-A06)
//
//   Kural düğümü `Kural ad( kod: … )` biçiminde ADLI yazılır ve ayrıştırıcı
//   paranteze bitişik sözcüğü tanımın adı olarak okur; tip, önündeki anahtar
//   sözcüktür. İpucunun iki yolu bu ayrımı bilmiyordu: satır taraması paranteze
//   bitişik sözcüğü, sözdizimi ağacı yedeği ise düğümün adını tip sayıyordu ve
//   kart başlığı tipin yerine kuralın adını gösteriyordu. Bu dosya üç şeyi ölçer:
//   ① `kod:` alanı açılış satırında olan adlı Kuralın kartı (satır taraması);
//     kod bölgesinde, yorumda ve belge bloğunda aynı başlık açılır.
//   ② `kod:` alanı alt satıra yazılmış adlı Kuralın kartı (sözdizimi ağacı yedeği).
//   ③ Adsız düğümlerin kart başlıkları ile adlı Kuralın kart metni ve konumu.
//   İpucu sağlayıcısı kabuk sahtesiyle yüklenir; ölçülen şey kartın kendisidir.
// ═══════════════════════════════════════════════════════════════════════════

import "./dil-kur.ts";
import { belgeKoy } from "./kabuk-kur.ts";
import { Position, Uri, workspace, type SahteBelge } from "./vscode-sahtesi.ts";
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { kimlikIndeksi } from "../../cekirdek/src/kimlik.ts";
import { kodTanimlariTara, tanimOzetiCikar } from "../src/ipucu-cekirdek.ts";

// Kabuğu içeri alan modüller kanca kurulduktan SONRA yüklenir (kabuk-kur.ts).
const { ipucuSaglayici } = await import("../src/ipucu.ts");

// ── Fikstür: adlı ve adsız tanımlar taşıyan bir kanon dosyası ve onu anan bir plan ──

const KANON = [
  `Kural anlatimButunlugu( kod: KNN-1.5, otorite: anayasa,`,
  `       ne: "KNN-1.5 · Anlatım Bütünlüğü",`,
  `       dayanak: KNN-1 )`,
  ``,
  `Kural altSatirKurali(`,
  `       kod: KNN-2,`,
  `       ne: "KNN-2 · Kodu alt satırda" )`,
  ``,
  `Karar( kod: KNN-1, durum: kilitli,`,
  `       ne: "KNN-1 · Karar",`,
  `       karar: "Kararın hükmü." )`,
  ``,
  `GenelKural( kod: KNN-GK, ne: "tip adı Kural ile biter, düğüm adsızdır" )`,
].join("\n");

const PLAN = [
  `Adım( kod: ADM-ATIF, ne: "adlı kurallara dayanır",`,
  `  referans: [ KNN-1.5, KNN-2, KNN-1, KNN-GK ] )`,
  `// yorumda KNN-1.5 geçer`,
  `-->|`,
  `Belge bloğunda KNN-1.5 geçer.`,
  `|<--`,
].join("\n");

const KOK = mkdtempSync(join(tmpdir(), "sarmal-adli-kural-"));
// Geçici kök dosyanın bütün sınamaları bitince silinir; `after` bir sınama düşse de koşar.
after(() => rmSync(KOK, { recursive: true, force: true }));
const KANON_YOLU = join(KOK, "kanon.sar");
const PLAN_YOLU = join(KOK, "plan.sar");
writeFileSync(KANON_YOLU, KANON);
writeFileSync(PLAN_YOLU, PLAN);
kimlikIndeksi.dosyaGuncelle(KANON_YOLU, KANON);
kimlikIndeksi.dosyaGuncelle(PLAN_YOLU, PLAN);
belgeKoy(KANON_YOLU, KANON);
const BELGE: SahteBelge = belgeKoy(PLAN_YOLU, PLAN);
// İpucunun satır taraması (kodIndeksle) çalışma alanını findFiles ile bulur.
workspace.findFiles = async () => [Uri.file(KANON_YOLU), Uri.file(PLAN_YOLU)];

const SATIRLAR = PLAN.split("\n");
const saglayici = ipucuSaglayici(() => "tr");

/** Satırda `kod` sözcesinin TAM geçtiği sütun: `KNN-1` aranırken `KNN-1.5` yazımı atlanır. */
function sozceSutunu(satir: string, kod: string): number {
  for (let i = satir.indexOf(kod); i >= 0; i = satir.indexOf(kod, i + 1)) {
    if (!/[\p{L}\p{N}_.-]/u.test(satir[i + kod.length] ?? " ")) return i;
  }
  return -1;
}

/** Plan satırında `kod` sözcesinin üzerine gelindiğinde açılan kart: başlık satırı ve gövde. */
async function kart(satir: number, kod: string): Promise<{ baslik: string; govde: string }> {
  const sutun = sozceSutunu(SATIRLAR[satir], kod);
  assert.ok(sutun >= 0, `fikstürün ${satir}. satırında ${kod} yok`);
  const h = await saglayici.provideHover(BELGE as never, new Position(satir, sutun + 1) as never, undefined as never) as
    { contents: { value: string }[] } | undefined;
  assert.ok(h, `${satir}. satırdaki ${kod} için kart açılmadı`);
  const md = h.contents.map((c) => c.value).join("");
  const kesim = md.indexOf("\n");
  return kesim < 0 ? { baslik: md, govde: "" } : { baslik: md.slice(0, kesim), govde: md.slice(kesim) };
}

/** Başlığın tip kısmı: `**KOD** — ` ayracından sonrası. */
function basliktakiTip(baslik: string, kod: string): string {
  const ayrac = `**${kod}** — `;
  const i = baslik.indexOf(ayrac);
  assert.ok(i >= 0, `başlık ${kod} kartının başlığı değil: ${baslik}`);
  return baslik.slice(i + ayrac.length);
}

// ── ① Satır taramasının yolu ─────────────────────────────────────────────────

test("adlı Kural (kod açılış satırında): kod bölgesindeki kart başlıkta Kural tipini gösterir", async () => {
  const k = await kart(1, "KNN-1.5");
  assert.equal(basliktakiTip(k.baslik, "KNN-1.5"), "Kural", `başlık tip yerine başka bir şey gösteriyor: ${k.baslik}`);
  assert.ok(!k.baslik.includes("anlatimButunlugu"), `başlıkta kuralın adı duruyor: ${k.baslik}`);
});

test("adlı Kural: yorumda ve belge bloğunda açılan kart da başlıkta Kural tipini gösterir", async () => {
  for (const satir of [2, 4]) {
    const k = await kart(satir, "KNN-1.5");
    assert.equal(basliktakiTip(k.baslik, "KNN-1.5"), "Kural", `${satir}. satır: ${k.baslik}`);
  }
});

test("satır taraması: adlı tanımın tipi anahtar sözcüktür, paranteze bitişik ad değildir", () => {
  const tip = (satir: string): string | undefined => kodTanimlariTara(satir)[0]?.tip;
  assert.equal(tip(`Kural ad( kod: TRM-1, ne: "a" )`), "Kural");
  assert.equal(tip(`Kural    boşluklu( kod: TRM-2, ne: "b" )`), "Kural");
  assert.equal(tip(`Tip Ekran( kod: TRM-3, aile: yuzey )`), "Tip");
  // Adsız düğümler: paranteze bitişik sözcük tipin kendisidir.
  assert.equal(tip(`GenelKural( kod: TRM-4, ne: "c" )`), "GenelKural");
  assert.equal(tip(`Adım( kod: TRM-5, ne: "d" )`), "Adım");
  assert.equal(tip(`  koşu:  Koşum( kod: TRM-6, tarih: 2026-10-10 )`), "Koşum");
});

// ── ② Sözdizimi ağacı yedeğinin yolu ─────────────────────────────────────────

test("adlı Kural (kod alt satırda): sözdizimi ağacı yedeğinin kartı başlıkta Kural tipini gösterir", async () => {
  // Kontrol: satır taraması bu tanımı görmez; kartı yedek yol açar.
  assert.ok(!kodTanimlariTara(KANON).some((t) => t.kod === "KNN-2"), "satır taraması tanımı gördü — yedek yol sınanmıyor");
  assert.equal(tanimOzetiCikar(KANON, "KNN-2")?.tip, "Kural");
  const k = await kart(1, "KNN-2");
  assert.equal(basliktakiTip(k.baslik, "KNN-2"), "Kural", `başlık tip yerine başka bir şey gösteriyor: ${k.baslik}`);
  assert.ok(!k.baslik.includes("altSatirKurali"), `başlıkta kuralın adı duruyor: ${k.baslik}`);
});

// ── ③ Değişmeyenler ──────────────────────────────────────────────────────────

test("adsız düğümlerin kart başlıkları değişmez", async () => {
  assert.equal(basliktakiTip((await kart(1, "KNN-1")).baslik, "KNN-1"), "Karar");
  assert.equal(basliktakiTip((await kart(1, "KNN-GK")).baslik, "KNN-GK"), "GenelKural");
  assert.equal(basliktakiTip((await kart(0, "ADM-ATIF")).baslik, "ADM-ATIF"), "Adım");
  assert.equal(tanimOzetiCikar(KANON, "KNN-1")?.tip, "Karar");
  assert.match((await kart(1, "KNN-1")).govde, /Kararın hükmü\./u, "Karar kartı hükmünü kaybetti");
});

test("adlı Kuralın kart metni ve konumu değişmez", async () => {
  const satirli = await kart(1, "KNN-1.5");
  assert.ok(satirli.govde.startsWith("\n\nKNN-1.5 · Anlatım Bütünlüğü\n\n"), `kartın metni değişti: ${satirli.govde}`);
  assert.match(satirli.govde, /\[[^\]]*kanon\.sar:1\]\([^)]*#L1\)$/u, `kartın konumu değişti: ${satirli.govde}`);
  const yedek = await kart(1, "KNN-2");
  assert.ok(yedek.govde.startsWith("\n\nKNN-2 · Kodu alt satırda\n\n"), `kartın metni değişti: ${yedek.govde}`);
  assert.match(yedek.govde, /\[[^\]]*kanon\.sar:6\]\([^)]*#L6\)$/u, `kartın konumu değişti: ${yedek.govde}`);
});

// ── Gerçek ağaç: deponun yasa kitaplığındaki her adlı Kural ─────────────────

/** Bir dizinin altındaki bütün .sar dosyaları. */
function sarDosyalari(dizin: string): string[] {
  return readdirSync(dizin).flatMap((ad) => {
    const yol = join(dizin, ad);
    return statSync(yol).isDirectory() ? sarDosyalari(yol) : ad.endsWith(".sar") ? [yol] : [];
  });
}

test("gerçek ağaç: yasa kitaplığında satır taramasının bulduğu her adlı Kural tanımı Kural tipiyle kaydedilir", () => {
  const YASA = fileURLToPath(new URL("../../../yasa/", import.meta.url));
  let adli = 0;
  const yanlis: string[] = [];
  for (const dosya of sarDosyalari(YASA)) {
    const satirlar = readFileSync(dosya, "utf8").split("\n");
    for (const t of kodTanimlariTara(satirlar.join("\n"))) {
      if (!/^\s*Kural\s+[\p{L}][\p{L}\p{N}_]*\(/u.test(satirlar[t.satir])) continue;
      adli++;
      if (t.tip !== "Kural") yanlis.push(`${t.kod} → ${t.tip}`);
    }
  }
  assert.ok(adli > 0, "yasa kitaplığında adlı Kural bulunamadı — ölçüm konusuz kalır");
  assert.deepEqual(yanlis.slice(0, 5), [], `${yanlis.length}/${adli} adlı Kural tip yerine adıyla kaydedildi`);
});

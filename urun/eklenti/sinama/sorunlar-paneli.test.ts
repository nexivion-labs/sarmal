// ═══════════════════════════════════════════════════════════════════════════
// sorunlar-paneli.test.ts — 〰️ SORUNLAR PANELİNE GÖNDERİMİN AYARA BAĞLANMASI
//                          (PNL-A22 · OZK-14 ÜÇÜNCÜSÜ · YUZ-3.1 · YAS-3.4)
//
//   Eklentinin gerçek girişi sahte editörde koşar (etkinlesme-kabugu.ts). Ölçülenler:
//     · Ayarın varsayılanı kapalıdır; kapalıyken VS Code tanı koleksiyonuna hiçbir
//       Sarmal tanısı yazılmaz.
//     · Kapalıyken editörde her Sinyaller kaydı düzeyinin renginde satır işareti
//       taşır (Dur kırmızı, Dikkat sarı, Bilgi mavi) ve işaret genel bakış cetvelinde
//       de görünür; hover kodu, düzeyi, iletiyi, öneriyi ve kanon maddesini söyler;
//       hızlı düzeltme koleksiyon boşken de çıkar; dosya gezgininde Dur ve Dikkat
//       taşıyan dosyaya düzeyin renginde rozet konur.
//     · Durum çubuğu sayaçları ve Sinyaller kayıtları ayar açıkkenkiyle aynıdır (tek
//       kaynak turun defteridir).
//     · Ayar değişince pencere yeniden yüklenmeden geçilir: açılınca koleksiyon ayar
//       baştan açıkken dolacağı listeyle kayıpsız dolar ve editör katmanı susar;
//       kapanınca koleksiyon boşalır ve katman geri gelir.
// ═══════════════════════════════════════════════════════════════════════════

import "./dil-kur.ts";
import "./kabuk-kur.ts";
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { etkinlestir, geciciAlan, kabukTemizle, type EtkinEklenti } from "./etkinlesme-kabugu.ts";
import { kanonMaddeleri } from "../src/sinyaller-cekirdek.ts";
import { beklenenSunumYuzeyi } from "../../cekirdek/src/denetim.ts";

const KAYNAK = [
  `Faz( kod: SNY-F1, ad: "Sinyal nöbeti" ) {`,
  `  Blok( kod: SNY-B1, ad: "Sinyal işi" ) {`,
  `    Katmanx( kod: SNY-K1, ad: "Bilerek yanlış tip" )`,
  `  }`,
  `}`,
  ``,
].join("\n");
const TEMIZ = `Faz( kod: TMZ-F1, ad: "temiz dönem" )\n`;

interface Alan { alan: string; plan: string; temiz: string }
function alanKur(): Alan {
  const alan = geciciAlan("sarmal-sorunlar-paneli-");
  mkdirSync(join(alan, "proje_a"), { recursive: true });
  writeFileSync(join(alan, "proje_a", "proje_a_anadizin.sar"), `ÇalışmaAlanı( kod: PROJE_A, ad: "proje a" )\n`, "utf8");
  const plan = join(alan, "proje_a", "plan.sar");
  const temiz = join(alan, "proje_a", "temiz.sar");
  writeFileSync(plan, KAYNAK, "utf8");
  writeFileSync(temiz, TEMIZ, "utf8");
  return { alan, plan, temiz };
}

const acik: EtkinEklenti[] = [];
after(() => { for (const e of acik.splice(0)) e.kapat(); kabukTemizle(); });
async function etkin(a: Alan, ayarlar: Record<string, unknown> = {}): Promise<EtkinEklenti> {
  const e = etkinlestir({ klasorler: [a.alan], etkinDosya: a.plan, ayarlar });
  acik.push(e);
  await e.turBekle();
  await new Promise((r) => setTimeout(r, 50));
  return e;
}

type Aralik = { start: { line: number; character: number }; end: { line: number; character: number } };
type Kayit = { dosya: string; kod: string; duzey: string; satir: number };
const kayitlar = (e: EtkinEklenti): Kayit[] => (e.yuz!.sinyalKayitlari as () => Kayit[])();
const toplamTani = (e: EtkinEklenti): number => [...e.kayit.tanilar.values()].reduce((t, l) => t + l.length, 0);
/** Durum çubuğunda GÖRÜNEN girdilerin metinleri. */
const durumMetinleri = (e: EtkinEklenti): string[] => e.kayit.durumOgeleri.filter((o) => !o.atildi && o.gorunur).map((o) => o.text);
/** PNL-A08: Sarmal'ın Dur ve Dikkat girdisi (yalnız ayar kapalıyken görünür). */
const sinyalGirdisi = (e: EtkinEklenti): string | undefined => durumMetinleri(e).find((t) => /^Dur \d+ · Dikkat \d+$/.test(t));
/** Sinyaller'in Dur ve Dikkat sayıları, defterin kayıtlarından ve motorun yönlendirmesinden (ağaçtan değil). */
const beklenenSinyalGirdisi = (e: EtkinEklenti): string => {
  const sinyalde = kayitlar(e).filter((k) => beklenenSunumYuzeyi({ kod: k.kod, duzey: k.duzey as never }) !== "hatırlatıcılar");
  return `Dur ${sinyalde.filter((k) => k.duzey === "hata").length} · Dikkat ${sinyalde.filter((k) => k.duzey === "uyarı").length}`;
};
const RENK = { hata: "charts.red", "uyarı": "charts.yellow", bilgi: "charts.blue" } as const;

/** Satır işareti türünün anahtarı: dalgalı alt çizgisi verilen tema renginde olan süs türü. */
function isaretTuru(e: EtkinEklenti, renk: string): { key: string; secenek: Record<string, unknown> } {
  const css = `underline wavy var(--vscode-${renk.replace(/\./g, "-")})`;
  const bulunan = [...e.kayit.dekorTurleri].find(([, s]) => (s as { textDecoration?: string }).textDecoration === css);
  assert.ok(bulunan, `${renk} satır işareti türü kurulmamış`);
  return { key: bulunan[0], secenek: bulunan[1] as Record<string, unknown> };
}
const cizilen = (e: EtkinEklenti, renk: string): Aralik[] =>
  ((e.kayit.dekorlar.get(isaretTuru(e, renk).key) ?? []) as Aralik[]).map((r) => r);

test("PNL-A22 · ayarın varsayılanı kapalıdır: paketin ilanı ve iki katalog ayarın anlamını ve ajanlar için bedelini söyler", async () => {
  const kok = new URL("..", import.meta.url);
  const paket = JSON.parse(readFileSync(new URL("package.json", kok), "utf8"));
  const ilan = paket.contributes.configuration.properties["sarmal.sorunlarPaneli"];
  assert.equal(ilan?.type, "boolean");
  assert.equal(ilan?.default, false, "sarmal.sorunlarPaneli paketin ilanında varsayılan olarak kapalı değil");
  const { SORUNLAR_PANELI_VARSAYILANI, SORUNLAR_PANELI_AYARI } = await import("../src/sorun-tanilari.ts");
  assert.equal(SORUNLAR_PANELI_VARSAYILANI, ilan.default, "kodun düşüş değeri paketin varsayılanından ayrılmış");
  assert.equal(`sarmal.${SORUNLAR_PANELI_AYARI}`, "sarmal.sorunlarPaneli");
  assert.ok(/^[\x20-\x7e]+$/.test(SORUNLAR_PANELI_AYARI), "ayar adı ASCII olmalı (H15)");
  const tr = JSON.parse(readFileSync(new URL("package.nls.tr.json", kok), "utf8"))["config.problemsPanel"] as string;
  const en = JSON.parse(readFileSync(new URL("package.nls.json", kok), "utf8"))["config.problemsPanel"] as string;
  assert.ok(/Sorunlar/.test(tr) && /kapalı/.test(tr) && /ajan/.test(tr) && /Sinyaller/.test(tr), `Türkçe açıklama eksik: ${tr}`);
  assert.ok(/Problems/.test(en) && /off/.test(en) && /agents/.test(en) && /Signals/.test(en), `İngilizce açıklama eksik: ${en}`);
});

test("PNL-A22 · ayar kapalıyken koleksiyon boştur; durum çubuğu sayaçları ve Sinyaller kayıtları ayar açıkkenkiyle aynıdır", async () => {
  const a = alanKur();
  const kapali = await etkin(a);
  const acikE = await etkin(a, { sorunlarPaneli: true });
  assert.ok(toplamTani(acikE) > 0, "ayar açıkken koleksiyonda tanı yok; karşılaştırma kurulamaz");
  assert.equal(toplamTani(kapali), 0, "ayar kapalıyken Sarmal tanısı koleksiyona (Sorunlar paneline) yazıldı");
  // PNL-A08: ayar kapalıyken VS Code'un sayacı Sarmal tanılarını saymaz; Sarmal'ın Dur ve Dikkat girdisi görünür ve
  // Sinyaller'in sayısını taşır. Ayar açıkken aynı sayı iki kez görünmesin diye gizlenir. Öteki sayaçlar değişmez.
  assert.equal(sinyalGirdisi(kapali), beklenenSinyalGirdisi(kapali), "ayar kapalıyken Dur ve Dikkat girdisi yok ya da Sinyaller'in sayısını taşımıyor");
  assert.equal(sinyalGirdisi(acikE), undefined, "ayar açıkken Dur ve Dikkat girdisi de görünüyor (aynı sayı iki kez)");
  assert.deepEqual(durumMetinleri(kapali).filter((t) => t !== sinyalGirdisi(kapali)), durumMetinleri(acikE), "durum çubuğu sayaçları ayara göre değişti");
  assert.deepEqual(kayitlar(kapali), kayitlar(acikE), "Sinyaller kayıtları ayara göre değişti");
  assert.ok(kayitlar(kapali).some((k) => k.dosya === a.plan && k.duzey === "hata"), "fikstürde Dur kaydı yok");
});

test("PNL-A22 · ayar kapalıyken editörde her Sinyaller kaydı düzeyinin renginde satır işareti taşır ve işaret genel bakış cetvelinde görünür", async () => {
  const a = alanKur();
  const e = await etkin(a);
  const dosyaninKayitlari = kayitlar(e).filter((k) => k.dosya === a.plan);
  for (const [duzey, renk] of Object.entries(RENK)) {
    const tur = isaretTuru(e, renk);
    assert.equal((tur.secenek.overviewRulerColor as { id?: string } | undefined)?.id, renk, `${duzey}: genel bakış cetveli düzeyin renginde değil`);
    assert.equal(tur.secenek.overviewRulerLane, 4, `${duzey}: genel bakış cetvelinde sağ şeritte değil`);
    const r = cizilen(e, renk);
    assert.deepEqual(r.map((x) => x.start.line + 1).sort(), dosyaninKayitlari.filter((k) => k.duzey === duzey).map((k) => k.satir).sort(),
      `${duzey}: satır işaretleri Sinyaller kayıtlarının satırlarıyla aynı değil`);
  }
  assert.ok(cizilen(e, RENK.hata).length > 0 && cizilen(e, RENK.bilgi).length > 0, "fikstürde Dur ya da Bilgi işareti yok");
});

test("PNL-A22 · ayar kapalıyken hover tanının düzeyini, kodunu, iletisini, önerisini ve kanon maddesini taşır; hızlı düzeltme koleksiyon boşken de çıkar", async () => {
  const a = alanKur();
  const e = await etkin(a);
  const dur = cizilen(e, RENK.hata)[0]!;
  const hoverlar = await Promise.all(e.kayit.hoverSaglayicilari.map((s) => s.provideHover(e.etkinBelge, dur.start)));
  const metin = hoverlar.flatMap((h) => (h as { contents?: Array<{ value: string }> } | undefined)?.contents ?? []).map((c) => c.value).join("\n");
  assert.match(metin, /\*\*Dur\*\* · `bilinmeyen-tip`/, `hover düzeyi ve kodu söylemiyor: ${metin}`);
  assert.match(metin, /Katmanx/, "hover tanının iletisini taşımıyor");
  assert.match(metin, /\*\*Öneri:\*\*/, "hover öneriyi taşımıyor");
  const maddeler = kanonMaddeleri("bilinmeyen-tip");
  for (const m of maddeler) assert.ok(metin.includes(`[${m}](command:sarmal.kanonMaddesiAc?`), `hover kanon maddesini (${m}) tanımını açan bağla taşımıyor`);
  // Hızlı düzeltme: koleksiyon boştur, ampul aynı tanı nesnesinden çıkar.
  assert.equal(toplamTani(e), 0);
  const eylemler = (await Promise.all(e.kayit.kodEylemSaglayicilari.map((s) => s.provideCodeActions(e.etkinBelge, dur, { diagnostics: [] }))))
    .flat() as Array<{ title: string; isPreferred?: boolean; diagnostics?: Array<{ code?: unknown }>; edit?: { islemler: Array<{ metin: string }> } }>;
  const duzelt = eylemler.find((x) => x?.diagnostics?.some((d) => d.code === "bilinmeyen-tip"));
  assert.ok(duzelt, `hızlı düzeltme çıkmadı (eylemler: ${eylemler.map((x) => x?.title).join(" | ")})`);
  assert.deepEqual(duzelt.edit?.islemler.map((x) => x.metin), ["Katman"], "hızlı düzeltme öneriyi uygulamıyor");
});

test("PNL-A22 · ayar kapalıyken dosya gezgininde Dur ve Dikkat taşıyan dosyaya düzeyin renginde rozet konur; temiz dosyaya konmaz", async () => {
  const a = alanKur();
  const e = await etkin(a);
  const susle = (yol: string) => e.kayit.dosyaSusleyicileri.map((s) => s.provideFileDecoration({ fsPath: yol }))
    .find((d) => d !== undefined) as { badge?: string; color?: { id: string }; propagate?: boolean; tooltip?: string } | undefined;
  const dosyanin = kayitlar(e).filter((k) => k.dosya === a.plan);
  const hata = dosyanin.filter((k) => k.duzey === "hata").length;
  const uyari = dosyanin.filter((k) => k.duzey === "uyarı").length;
  const d = susle(a.plan);
  assert.ok(d, "Dur taşıyan dosyaya rozet konmadı");
  assert.equal(d.badge, String(hata + uyari), "rozet Dur ve Dikkat sayısını taşımıyor");
  assert.equal(d.color?.id, RENK.hata, "Dur taşıyan dosyanın rengi Dur'un rengi değil");
  assert.equal(d.propagate, true, "renk üst klasörlere yayılmıyor");
  assert.equal(susle(a.temiz), undefined, "temiz dosyaya rozet konmuş");
});

test("PNL-A22 · ayar açılınca pencere yeniden yüklenmeden koleksiyon kayıpsız dolar ve editör katmanı susar; kapanınca koleksiyon boşalır ve katman geri gelir", async () => {
  const a = alanKur();
  const baştanAcik = await etkin(a, { sorunlarPaneli: true });
  const e = await etkin(a);
  const ozet = (x: EtkinEklenti) => [...x.kayit.tanilar].filter(([, l]) => l.length).map(([y, l]) => [y, l.map((t) => [
    t.code, t.severity, t.message, t.source, t.range.start.line, t.range.start.character, t.range.end.character])]).sort();
  const isaretler = cizilen(e, RENK.hata).length;
  e.ayarDegistir("sorunlarPaneli", true);
  await new Promise((r) => setTimeout(r, 20));
  assert.deepEqual(ozet(e), ozet(baştanAcik), "ayar açılınca koleksiyon, ayar baştan açıkken dolacağı listeden ayrıştı (kayıp ya da fazlalık)");
  assert.equal(cizilen(e, RENK.hata).length, 0, "ayar açıkken editör katmanı da çiziyor (iki dalgalı çizgi)");
  assert.equal(e.kayit.dosyaSusleyicileri.map((s) => s.provideFileDecoration({ fsPath: a.plan })).find(Boolean), undefined, "ayar açıkken gezgin rozeti de konuyor");
  const hover = await Promise.all(e.kayit.hoverSaglayicilari.map((s) => s.provideHover(e.etkinBelge, (baştanAcik.kayit.tanilar.get(a.plan) ?? [])[0]!.range.start)));
  assert.ok(!hover.some((h) => /`bilinmeyen-tip`/.test(JSON.stringify(h ?? ""))), "ayar açıkken editör katmanının hover'ı da çıkıyor");
  assert.deepEqual(durumMetinleri(e), durumMetinleri(baştanAcik), "ayar açılınca durum çubuğu sayaçları değişti");
  e.ayarDegistir("sorunlarPaneli", false);
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(toplamTani(e), 0, "ayar kapanınca koleksiyon boşalmadı");
  assert.equal(sinyalGirdisi(e), beklenenSinyalGirdisi(e), "ayar kapanınca Dur ve Dikkat girdisi geri gelmedi (PNL-A08)");
  assert.equal(cizilen(e, RENK.hata).length, isaretler, "ayar kapanınca satır işaretleri geri gelmedi");
});

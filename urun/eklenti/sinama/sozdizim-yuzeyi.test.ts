// ═══════════════════════════════════════════════════════════════════════════
// sozdizim-yuzeyi.test.ts — ⛔ AYRIŞTIRILAMAYAN DOSYA SORUNLAR PANELİNDE (MGZ-A03)
//
//   Ölçülmüş kusur (HTR-SOZDIZIMI-HATASI-TANI-DEGIL-PANELDE-YOK · 2026-09-16):
//   Founder canlı pencerede Yol Haritası panelinin üstünde bir dosyanın
//   ayrıştırılamadığını gördü, Sorunlar paneli ise aynı anda sorun algılanmadı
//   dedi. Bu dosya kusuru eklentinin GERÇEK girişini sahte bir editörde
//   koşturarak yeniden üretir (etkinlesme-kabugu.ts) ve sebebini ölçer: tek dosya
//   yolu kırık dosya için `söz-dizim` tanısını zaten üretiyordu, fakat Sorunlar
//   yayını odak süzgecinden geçiyor ve odaktaki projenin dışında kalan kırık dosya
//   panelden düşüyordu. Yol Haritasının kırık dosyalar düğümü ise süzgeçsizdir;
//   iki yüzey bu yüzden aynı anda çelişiyordu. Founder'ın çatı penceresi altı
//   projeyi tek kökte taşır, dolayısıyla kırık dosya çoğu zaman odak dışındadır.
//
//   Onarımın sınırı: odak süzgeci yerinde kalır ve odak dışındaki projenin öteki
//   tanıları gizli kalmaya devam eder; süzgeçten yalnız `söz-dizim` geçer, çünkü
//   ayrıştırılamayan dosya bir projenin sapması değil, aracın hiç okuyamadığı bir
//   dosyadır ve Yol Haritası onu zaten bütün pencere için duyurur. Yol Haritası
//   düğümü değişmez (Adımın görevi); ayrıştırıcının hata kurtarması değişmez
//   (Adımın sınırı).
// ═══════════════════════════════════════════════════════════════════════════

import { test, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { belirtecle, SozDizimHatasi } from "../../cekirdek/src/belirtec.ts";
import { ayristir } from "../../cekirdek/src/ayristirici.ts";
import { etkinlestir, geciciAlan, type EtkinEklenti } from "./etkinlesme-kabugu.ts";

const SARMAL = fileURLToPath(new URL("../../cekirdek/src/sarmal.ts", import.meta.url));
const KIRIK_KAYNAK = 'Faz( kod: FB1, ad: "sağlam" )\nFaz( kod: FB2 ad: "kırık" )\n';
const SAGLAM_KAYNAK = 'Faz( kod: FA1, ad: "sağlam" )\n';

/** Ayrıştırıcının bu kaynak için verdiği hüküm — beklenen konum elle yazılmaz. */
function ayristiriciHukmu(): SozDizimHatasi {
  try { ayristir(belirtecle(KIRIK_KAYNAK)); } catch (e) { if (e instanceof SozDizimHatasi) return e; }
  throw new Error("fikstür ayrıştırılabiliyor — kusur yeniden üretilemez");
}

interface Alan { alan: string; aDosya: string; kirik: string; bAnadizin: string }

/** İki projeli çalışma alanı: odak proje_a'da durur, kırık dosya istenen projededir. */
function alanKur(kirikProje: "proje_a" | "proje_b"): Alan {
  const alan = geciciAlan("sarmal-sozdizim-yuzeyi-");
  for (const ad of ["proje_a", "proje_b"]) {
    mkdirSync(join(alan, ad), { recursive: true });
    writeFileSync(join(alan, ad, `${ad}_anadizin.sar`), `ÇalışmaAlanı( kod: ${ad.toUpperCase()}, ad: "${ad}" )\n`, "utf8");
  }
  const aDosya = join(alan, "proje_a", "plan.sar");
  writeFileSync(aDosya, SAGLAM_KAYNAK, "utf8");
  const kirik = join(alan, kirikProje, kirikProje === "proje_a" ? "kirik.sar" : "plan.sar");
  writeFileSync(kirik, KIRIK_KAYNAK, "utf8");
  return { alan, aDosya, kirik, bAnadizin: join(alan, "proje_b", "proje_b_anadizin.sar") };
}

const acik: EtkinEklenti[] = [];
after(() => { for (const e of acik.splice(0)) e.kapat(); });

/** Eklentiyi odak proje_a'da olacak biçimde etkinleştirir ve ilk turu bekler. */
async function etkin(a: Alan): Promise<EtkinEklenti> {
  const e = etkinlestir({ klasorler: [a.alan], etkinDosya: a.aDosya });
  acik.push(e);
  await e.turBekle();
  return e;
}

// Odak dışı senaryosu dört sınamada paylaşılır; etkinleşme bir kez kurulur.
let odakDisi: Promise<{ a: Alan; e: EtkinEklenti }> | undefined;
const odakDisiKur = (): Promise<{ a: Alan; e: EtkinEklenti }> => {
  odakDisi ??= (async () => { const a = alanKur("proje_b"); return { a, e: await etkin(a) }; })();
  return odakDisi;
};

/** Bir tanının Sorunlar paneline düştüğü hâl: kimlik, düzey ve sıfır tabanlı konum. */
function sozDizimTanisiniDogrula(tanilar: readonly { code?: unknown; severity: number; range: { start: { line: number; character: number } }; message: string }[] | undefined, baglam: string): void {
  const h = ayristiriciHukmu();
  assert.ok(tanilar && tanilar.length > 0, `${baglam}: kırık dosya Sorunlar panelinde hiç görünmüyor`);
  const t = tanilar.find((d) => d.code === "söz-dizim");
  assert.ok(t, `${baglam}: Sorunlar panelinde söz-dizim kimlikli tanı yok (gelen: ${tanilar.map((d) => String(d.code)).join(", ")})`);
  assert.equal(t.severity, 0, `${baglam}: sözdizimi hatası hata düzeyinde basılmadı`);
  assert.equal(t.range.start.line, h.satir - 1, `${baglam}: tanı yanlış satırda`);
  assert.equal(t.range.start.character, h.sutun - 1, `${baglam}: tanı yanlış sütunda`);
  assert.equal(t.message, h.message, `${baglam}: tanının cümlesi ayrıştırıcının cümlesi değil`);
}

test("MGZ-A03: odak başka projedeyken kırık dosya da Sorunlar panelinde satır ve sütunuyla görünür", async () => {
  const { a, e } = await odakDisiKur();
  sozDizimTanisiniDogrula(e.kayit.tanilar.get(a.kirik), "odak dışındaki kırık dosya");
});

test("MGZ-A03: odaktaki kırık dosya Sorunlar panelinde satır ve sütunuyla görünür", async () => {
  const a = alanKur("proje_a");
  const e = await etkin(a);
  sozDizimTanisiniDogrula(e.kayit.tanilar.get(a.kirik), "odaktaki kırık dosya");
});

test("MGZ-A03: odak süzgeci yerinde kalır — odak dışı projeden yalnız söz-dizim tanısı geçer", async () => {
  const { a, e } = await odakDisiKur();
  assert.deepEqual((e.kayit.tanilar.get(a.kirik) ?? []).map((d) => d.code), ["söz-dizim"],
    "kırık dosyanın söz-dizim dışında bir tanısı da odak süzgecini aştı");
  assert.equal(e.kayit.tanilar.get(a.bAnadizin)?.length ?? 0, 0,
    "odak dışındaki projenin öteki tanıları da Sorunlar paneline sızdı — odak süzgeci delindi");
});

test("MGZ-A03: odak değiştiğinde yeniden yayın kırık dosyayı düşürmez", async () => {
  // Ayrı etkinleşme: odak değişimi paylaşılan senaryonun durumunu bozmasın.
  const a = alanKur("proje_b");
  const e = await etkin(a);
  const odaklan = e.kayit.komutlar.get("sarmal.varligaOdaklan");
  assert.ok(odaklan, "odak komutu kayıtlı değil — sınama odağı değiştiremez");
  await odaklan(join(a.alan, "proje_b"));
  sozDizimTanisiniDogrula(e.kayit.tanilar.get(a.kirik), "odak kırık dosyanın projesine geçince");
  await odaklan(join(a.alan, "proje_a"));
  sozDizimTanisiniDogrula(e.kayit.tanilar.get(a.kirik), "odak yeniden başka projeye dönünce");
  assert.equal(e.kayit.tanilar.get(a.bAnadizin)?.length ?? 0, 0, "odak dönünce öteki projenin tanıları panelde kaldı");
});

test("MGZ-A03: Yol Haritasının kırık dosyalar listesi aynı kalır", async () => {
  const { a, e } = await odakDisiKur();
  const ozet = (e.yuz?.sonGoruntuOzeti as (() => { kirik: string[] }) | undefined)?.();
  assert.deepEqual(ozet?.kirik, [a.kirik], "kırık dosyalar listesi değişti");
});

test("MGZ-A03: komut satırı Sorunlar panelindeki tanının kimliğini, satırını ve sütununu basar", async () => {
  const { a, e } = await odakDisiKur();
  const panel = (e.kayit.tanilar.get(a.kirik) ?? []).find((d) => d.code === "söz-dizim");
  assert.ok(panel, "panelde söz-dizim tanısı yok — karşılaştırma kurulamaz");
  const konum = `${panel.range.start.line + 1}:${panel.range.start.character + 1}`;
  const kos = (args: string[]): string => {
    try { return execFileSync(process.execPath, [SARMAL, ...args], { encoding: "utf8", stdio: "pipe", timeout: 30_000 }); }
    catch (h) { const x = h as { stdout?: string; stderr?: string }; return `${x.stdout ?? ""}${x.stderr ?? ""}`; }
  };
  const tek = kos([a.kirik]);
  assert.ok(tek.includes(`${a.kirik}:${konum} [${String(panel.code)}] ${panel.message}`),
    `tek dosya kipi panelle aynı kimliği ve konumu basmıyor:\n${tek}`);
  const proje = kos(["denetle", join(a.alan, "proje_b")]);
  assert.ok(proje.includes(`plan.sar:${konum} [${String(panel.code)}] ${panel.message}`),
    `proje kipi panelle aynı kimliği ve konumu basmıyor:\n${proje}`);
});

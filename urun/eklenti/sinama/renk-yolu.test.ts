// ═══════════════════════════════════════════════════════════════════════════
// renk-yolu.test.ts — 🎨 EKL-F6-A04 · RENK YOLU NÖBETLERİ (Founder 2026-08-22)
//
//   HÜKÜM. Sarmal kullanıcıya renk DAYATMAZ. Kurulumdan sonra hiçbir şey
//   yazmayan bir kullanıcının kendi teması Sarmal kaynağını kendiliğinden
//   boyar, çünkü dilbilgisi yerleşik TextMate kapsam adları üretir ve anlamsal
//   simgeler `contributes.semanticTokenScopes` ile o adlara bağlanır. Kanonun
//   kendi paleti isteyene iki Sarmal temasıyla, tek tıkla gelir.
//
//   BU DOSYANIN VARLIK SEBEBİ. 2026-08-21 gecesi dizgi renkleri paketin
//   `configurationDefaults` ilanına kondu; ilan etkin yapılandırmaya ulaştı ve
//   nöbet yeşil yandı, buna karşılık Founder canlı pencerede bütün görev ile
//   kabul metinlerini beyaz yerine mavi gördü. Ders şudur: bir değerin etkin
//   yapılandırmada GÖRÜNMESİ ile ekrana BOYANMASI iki ayrı olgudur. Aynı ilan
//   2026-07-06 tarihinde Founder tarafından bir kez daha ölçülmüş ve
//   uygulanmadığı görülmüştü. İki ölçüm de aynı yöne bakmaktadır; aşağıdaki
//   nöbetler o ilanın üçüncü kez geri gelmesini engeller.
//
//   HÜKMÜN İKİNCİ YARISI (EKL-F6-A04 kapanış turu · 2026-08-24). Anlamsal renk
//   kuralları textMate ilanından farklı olarak ekrana GERÇEKTEN ulaşıyordu ve
//   tam da bu yüzden söküldü: otuz kuralı varsayılan yoluyla her kullanıcının
//   yapılandırmasına sokmak, seçilen temanın renklerini ezen bir dayatmadır.
//   Hüküm şudur: renk dayatılmaz, tam görünüm temayla gelir. Paketin
//   configurationDefaults ilanı bu yüzden HİÇBİR renk ve vurgu anahtarı taşımaz.
// ═══════════════════════════════════════════════════════════════════════════
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const oku = (u: string): string => readFileSync(fileURLToPath(new URL(u, import.meta.url)), "utf8");
const paket = JSON.parse(oku("../package.json"));
const gramer = JSON.parse(oku("../syntaxes/sarmal.tmLanguage.json"));

/** Yerleşik TextMate kök adları — bir temanın tanıdığı üst düzey kapsam
 *  kümesidir. Kaynak: TextMate kapsam sözleşmesi ve VS Code'un kendi
 *  dilbilgileri. Bu kümenin dışında bir kök, hiçbir temanın kuralına düşmez ve
 *  kapsam sessizce düz metin rengiyle kalır. */
const YERLESIK_KOKLER = new Set([
  "comment", "constant", "entity", "invalid", "keyword", "markup",
  "meta", "punctuation", "storage", "string", "support", "variable",
]);

/** TEK İSTİSNA VE GEREKÇESİ: `fenced_code.block.language`, VS Code'un kendi
 *  Markdown dilbilgisinin çitli kod bloğu dil etiketi için kullandığı addır.
 *  Sarmal belge bloğu aynı yapıyı taşıdığı için üst akışla aynı adı kullanır;
 *  ad yerleşik köklerde değildir ve hiçbir tema onu boyamaz, dolayısıyla etiket
 *  düz metin renginde kalır. Bu bilinçlidir: uyum, boyanmaktan önce gelir. */
const ISTISNA = new Set(["fenced_code.block.language.sar"]);

/** Dilbilgisinin ürettiği bütün kapsam adları (name + contentName). */
function gramerKapsamlari(): string[] {
  const bulunan = new Set<string>();
  const gez = (dugum: unknown): void => {
    if (Array.isArray(dugum)) { dugum.forEach(gez); return; }
    if (!dugum || typeof dugum !== "object") return;
    for (const [anahtar, deger] of Object.entries(dugum as Record<string, unknown>)) {
      if ((anahtar === "name" || anahtar === "contentName") && typeof deger === "string"
          && deger.includes(".") && !deger.includes(" ")) bulunan.add(deger);
      else gez(deger);
    }
  };
  gez(gramer.patterns);
  gez(gramer.repository);
  return [...bulunan].sort();
}

// ── 1) İLAN DÜRÜSTLÜĞÜ: çalışmayan ilan pakette durmaz ──────────────────────

test("A04: paket, ekrana ulaşmayan dizgi rengi ilanını TAŞIMAZ", () => {
  const varsayilanlar = paket.contributes.configurationDefaults ?? {};
  assert.ok(!("editor.tokenColorCustomizations" in varsayilanlar),
    "package.json yeniden `editor.tokenColorCustomizations` ilan ediyor. Bu ilan VS Code "
    + "tarafından boyayıcıya geçirilmez ve iki kez ölçülmüştür (Founder · 2026-07-06 ve "
    + "2026-08-21); çalışmadığı hâlde duran bir ilan, kapıya yalan söyletir. Renk yolu "
    + "semanticTokenScopes ile temalar/sarmal-*.json üzerindendir.");
});

test("A04: paket anlamsal renk kuralını VARSAYILAN olarak ilan eder — kullanıcı ayarı üstün kalır", () => {
  const varsayilanlar = paket.contributes.configurationDefaults ?? {};
  const anlamsal = varsayilanlar["editor.semanticTokenColorCustomizations"] as
    { enabled?: boolean; rules?: Record<string, unknown>; "[*Light*]"?: { rules?: Record<string, unknown> } } | undefined;
  assert.ok(anlamsal,
    "package.json anlamsal renk kuralını ilan etmiyor. Founder 2026-09-02 tarihinde EKL-F6-A04 "
    + "kaydındaki hükmün okunuşunu düzeltmiştir: kastedilen rengin hiç gelmemesi değil, "
    + "kullanıcının onu AYARLARDAN DEĞİŞTİREBİLMESİDİR. İlan bir dayatma değildir, çünkü "
    + "kullanıcının kendi ayarı her koşulda varsayılanın üstündedir. İlan sökülürse doğan her "
    + "yeni projede otuz anlamsal tip, kullanıcının temasının tek rengine düşer ve ayrım kaybolur.");
  assert.equal(anlamsal.enabled, true, "anlamsal renklendirme ilanı etkin olmalı");
  assert.equal(Object.keys(anlamsal.rules ?? {}).length, 31,
    "otuz bir anlamsal tipin tamamı varsayılan renk almalı — eksik tip kullanıcının temasının rengine düşer");
  assert.ok(Object.keys(anlamsal["[*Light*]"]?.rules ?? {}).length > 0,
    "açık temalar için ayrı kural kümesi yok — koyu zemin renkleri açık zeminde kontrast kaybeder");
});

test("A04: anlamsal vurgu KÜRESEL zorlanmaz — yalnız sarmal dil bloğunda açılır", () => {
  const varsayilanlar = paket.contributes.configurationDefaults ?? {};
  assert.ok(!("editor.semanticHighlighting.enabled" in varsayilanlar),
    "package.json anlamsal vurguyu bütün diller ve bütün temalar için küresel olarak zorluyor. "
    + "Renk hükmü Sarmal dilinin görünümünü bağlar, başka dillerin kararını değil; vurgu "
    + "tercihi `[sarmal]` dil bloğunda yaşamalıdır.");
  const dilBlogu = varsayilanlar["[sarmal]"] as Record<string, unknown> | undefined;
  assert.equal(dilBlogu?.["editor.semanticHighlighting.enabled"], true,
    "sarmal dil bloğu anlamsal vurguyu açmıyor — vurgu kapalıyken anlamsal renk kuralları hiç "
    + "uygulanmaz ve otuz tipin tamamı dilbilgisi renklerine düşer.");
});

test("A04: anlamsal kapsam köprüsü ilan edilir ve her kapsam yerleşik bir köke düşer", () => {
  const ilan = paket.contributes.semanticTokenScopes?.[0];
  assert.ok(ilan, "contributes.semanticTokenScopes yok — kullanıcının kendi teması Sarmal'ı boyayamaz");
  const kapsamlar = Object.values(ilan.scopes as Record<string, string[]>).flat();
  assert.ok(kapsamlar.length > 0, "kapsam köprüsü boş");
  for (const kapsam of kapsamlar) {
    if (kapsam.endsWith(".sar")) continue;   // kendi dilimizin adı — köprünün ilk halkası
    assert.ok(YERLESIK_KOKLER.has(kapsam.split(".")[0]),
      `köprüdeki "${kapsam}" yerleşik bir TextMate köküne düşmüyor; kullanıcının teması onu tanımaz `
      + "ve anlamsal simge renksiz kalır (arac/renk-uret.mjs · KAPSAM_* çizelgeleri)");
  }
});

// ── 2) DİLBİLGİSİ: her kapsam bir temanın tanıdığı addan türer ──────────────

test("A04: dilbilgisinin ürettiği her `.sar` kapsamı yerleşik bir kökten türer", () => {
  const kapsamlar = gramerKapsamlari();
  assert.ok(kapsamlar.length >= 30, `dilbilgisi yalnız ${kapsamlar.length} kapsam üretiyor — ölçüm fikstürü bozulmuş olabilir`);
  for (const kapsam of kapsamlar) {
    if (ISTISNA.has(kapsam)) continue;
    assert.ok(YERLESIK_KOKLER.has(kapsam.split(".")[0]),
      `dilbilgisi "${kapsam}" kapsamını üretiyor ve kökü yerleşik değil. Kullanıcının teması bu `
      + "kapsamı tanımaz, dolayısıyla o parça hiçbir temada boyanmaz. Adı yerleşik bir köke "
      + "taşı ya da gerekçesiyle ISTISNA kümesine yaz.");
  }
});

test("A04: `.sar` kapsamları kendi dilimizin dışına taşmaz", () => {
  for (const kapsam of gramerKapsamlari()) {
    if (kapsam.startsWith("meta.embedded.block.")) continue;   // gömülü dilin kendi dilbilgisine devir
    assert.ok(kapsam.endsWith(".sar"),
      `"${kapsam}" adı .sar ile bitmiyor — Sarmal dilbilgisi başka bir dilin kapsam adını üretemez`);
  }
});

// ── 3) İSTEYENE KANON PALETİ: tema yolu gerçekten boyar ─────────────────────

test("A04: iki Sarmal teması dizgi kurallarını gerçekten taşır — isteyenin beyazı bir tık uzaktadır", () => {
  for (const dosya of ["../temalar/sarmal-koyu.json", "../temalar/sarmal-acik.json"]) {
    const tema = JSON.parse(oku(dosya));
    const kurallar = tema.tokenColors as Array<{ scope: string | string[]; settings: { foreground?: string } }>;
    const dizgi = kurallar.find((k) => {
      const kapsam = Array.isArray(k.scope) ? k.scope : [k.scope];
      return kapsam.includes("string.quoted.double.sar");
    });
    assert.ok(dizgi?.settings.foreground,
      `${dosya} temasında .sar dizgi kuralı yok — kullanıcının kanon paletine ulaşacağı TEK yol budur`);
  }
});

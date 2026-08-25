// ═══════════════════════════════════════════════════════════════════════════
// palette-drift.test.ts — Renk kanonu nöbetçisi (EKL-F3-A04)
//
//   Amaç:   Yüzey (package.json) SNF-0 kanonundan (kayit.json → renkPaleti)
//           SAPAMAZ — elle boya girişimi bu testte Türkçe gerekçeyle kırmızı yanar.
//   Kapsam: anlamsal token kuralları (aile/ağaç/sade/K2-önek) + textMate biçim
//           kuralları + renk.ts ↔ renk-uret.mjs önek-eşleme birebirliği.
//   Sonuç:  Eski OS'un "palette_drift" dersi makine-zorlamasına bağlanmıştır.
// ═══════════════════════════════════════════════════════════════════════════
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { VARSAYILAN } from "../arac/renk-uret.mjs";

const oku = (u: string): string => readFileSync(fileURLToPath(new URL(u, import.meta.url)), "utf8");
const paket = JSON.parse(oku("../package.json"));
const palet = JSON.parse(oku("../../../oz/siniflama/kayit.json")).renkPaleti;
// EKL-F6-A04 (hüküm 2026-08-24): paket anlamsal renk ilanı TAŞIMAZ — renk
// dayatılmaz, tam görünüm temayla gelir. Kanon tablosunun yüzeyleri artık
// deponun kendi tercihi (.vscode/settings.json) ile iki Sarmal temasıdır;
// sapma nöbeti tabloyu depo tercihinden okur, tema eşitliğini giydirmesiz-renk
// nöbeti ölçer.
const kurallar: Record<string, string> =
  JSON.parse(readFileSync(VARSAYILAN.AYAR!, "utf8"))["editor.semanticTokenColorCustomizations"].rules;

// renk-uret.mjs ile BİREBİR eşlemeler (nöbetçi kendi kopyasını taşır ki üretici bozulursa da yakalansın)
const AGAC: Record<string, string> = {
  sarmalBahce: "ÇalışmaAlanı", sarmalAgac: "Uygulama", sarmalKok: "Proje", sarmalGovde: "Blok",
  sarmalDal: "Faz", sarmalAltDal: "Katman", sarmalYaprak: "Adım", sarmalMeyve: "meyve",
};
const AILE = ["bilgi", "orkestrasyon", "etmen", "yuzey", "yasa", "teknoloji", "surec", "nitelik", "oz"];
const ONEK: Record<string, string> = {
  "ETM|ORK|ANY": "sarmalKodEtmen", "BCR|YTN": "sarmalKodBeceri", "BLK|TTK|KNC": "sarmalKodBellek",
  "HTR": "sarmalKodHatir", "K|SD|GK|FEL": "sarmalKodYasa", "EKR|TEM|KRT": "sarmalKodYuzey",
  "PLN|ADM|FZ|KTM|EKL": "sarmalKodPlan", "SNF|DRM|RAY": "sarmalKodOz",
};

test("palette_drift: ağaç omurgası yüzeyde kanonla birebir", () => {
  for (const [token, tip] of Object.entries(AGAC))
    assert.equal(kurallar[token], palet.agacRenkleri[tip],
      `palette_drift: ${token} yüzeyde ${kurallar[token]}, kanonda ${palet.agacRenkleri[tip]} — elle boya YASAK, "npm run build" kanondan üretir`);
});

test("palette_drift: aile renkleri yüzeyde kanonla birebir", () => {
  for (const aile of AILE) {
    const token = "sarmal" + aile[0].toUpperCase() + aile.slice(1);
    assert.equal(kurallar[token], palet.aileler[aile],
      `palette_drift: ${token} kanondan sapmış — "npm run build" kanondan üretir`);
  }
});

test("palette_drift: biçim öğeleri (parametre·KOD·niyet beyazı·sayı) kanonla birebir", () => {
  assert.equal(kurallar.sarmalParam, palet.sadeRenkler.parametre);
  assert.equal(kurallar.sarmalKod, palet.sadeRenkler.kod);
  // EKL-F6-A04 (Founder 2026-08-22): dizgi renkleri kullanıcıya DAYATILMAZ,
  // dolayısıyla pakette ilan edilmez; kanon tablosu deponun kendi tercihinde ve
  // iki Sarmal temasında yaşar. Nöbet tabloyu depo tercihinden okur.
  const ayar = JSON.parse(readFileSync(VARSAYILAN.AYAR!, "utf8"));
  const tm: Array<{ scope: string | string[]; settings: { foreground: string } }> =
    ayar["editor.tokenColorCustomizations"].textMateRules;
  const bul = (s: string): string | undefined =>
    tm.find((k) => (Array.isArray(k.scope) ? k.scope.includes(s) : k.scope === s))?.settings.foreground;
  assert.equal(bul("string.quoted.double.sar"), palet.sadeRenkler.dizgi, "niyet beyazı kanondan sapmış");
  assert.equal(bul("constant.numeric.sar"), palet.sadeRenkler.sayi);
  assert.equal(bul("markup.heading.sar"), palet.sadeRenkler.belgeBaslik);
});

test("palette_drift: K2 önek imzaları yüzeyde kanonla birebir", () => {
  for (const [grup, token] of Object.entries(ONEK))
    assert.equal(kurallar[token], palet.kodOnekleri[grup],
      `palette_drift: ${token} (${grup}) kanondan sapmış`);
});

test("palette_drift: renk.ts önek eşlemesi üreticiyle birebir (çift-kayıt nöbeti)", () => {
  const kaynak = oku("../src/renk.ts");
  for (const [grup, token] of Object.entries(ONEK))
    assert.ok(kaynak.includes(`"${grup}": "${token}"`),
      `renk.ts eşlemesi sapmış: "${grup}" → ${token} bekleniyor — iki dosya BİREBİR tutulmalı`);
});

// ── F9-A04 · enum tek-kaynak nöbetçisi: tamamlama kanondan okur, elle çift-kayıt yok ──
import { readFileSync as _okuEnum } from "node:fs";
import { fileURLToPath as _yolEnum } from "node:url";

test("F9-A04: tamamlama.ts enum'u kanondan okur — elle DEGERLER çift-kaydı kalmadı", () => {
  const src = _okuEnum(_yolEnum(new URL("../src/tamamlama.ts", import.meta.url)), "utf8");
  // Eski elle-yazılmış DEGERLER sabiti silinmiş olmalı (kanon tek kaynak).
  assert.ok(!/const DEGERLER\b/.test(src), "elle DEGERLER sabiti kalmamalı (kanondan okunmalı)");
  assert.ok(/snf\.semalar\?\.\[tip\]\?\.enum/.test(src), "tip-özel enum kanondan okunmalı");
  assert.ok(/snf\.ortakEnum/.test(src), "ortak enum kanondan okunmalı");
});

// ══ ADM-MUT-B5 · nöbetçi kapsam genişlemesi (KRR-MUT-5) ═══════════════════════

test("B5: kanonun 14 ailesinin HER BİRİ yüzeye bağlı (yeni aile sessiz kalamaz)", () => {
  // Ağaç omurgasıyla boyananlar token almaz — açık muafiyet (temel=çekirdek tipler,
  // plan=agacRenkleri, urun=meyve rengi). Yeni bir aile eklenirse bu test kırmızı
  // yanar: ya sarmal<Aile> token'ı ver, ya muafiyeti BİLİNÇLİ genişlet.
  const AGAC_MUAF = new Set(["temel", "plan", "urun"]);
  for (const aile of Object.keys(palet.aileler)) {
    if (AGAC_MUAF.has(aile)) continue;
    const token = "sarmal" + aile[0].toUpperCase() + aile.slice(1);
    assert.ok(kurallar[token],
      `B5: '${aile}' ailesi yüzeyde tokensiz (${token} yok) — üreticiye bağla ya da muafiyeti bilinçli genişlet`);
    assert.equal(kurallar[token], palet.aileler[aile],
      `B5: ${token} kanondan sapmış`);
  }
});

test("RF-T1-A02: textMate '[*Light*]' bloğu YÜZEYDE — niyet mürekkebi + dal kenarı açık eşleriyle (Founder Light bulgusu: beyaz dizgi beyaz zeminde kayboluyordu)", () => {
  const acikBlok = JSON.parse(readFileSync(VARSAYILAN.AYAR!, "utf8"))["editor.tokenColorCustomizations"]["[*Light*]"];
  assert.ok(acikBlok?.textMateRules?.length, "RF-T1-A02: settings.json'da [*Light*] textMate bloğu yok — açık temada niyet metni görünmez kalır");
  const acikPalet = JSON.parse(oku("../../../oz/siniflama/kayit.json")).renkPaleti.sadeRenklerAcik;
  const bulAcik = (s: string): string | undefined =>
    (acikBlok.textMateRules as Array<{ scope: string | string[]; settings: { foreground: string } }>)
      .find((k) => (Array.isArray(k.scope) ? k.scope.includes(s) : k.scope === s))?.settings.foreground;
  assert.equal(bulAcik("string.quoted.double.sar"), acikPalet.dizgi, "açık-tema niyet mürekkebi kanondan sapmış");
  assert.equal(bulAcik("keyword.control.flow.sar"), acikPalet.kenar, "açık-tema kenar rengi kanondan sapmış");
  // kanon açık-paleti TAM: textMate'in kullandığı her anahtarın açık eşi var
  for (const anahtar of ["dizgi","kod","sayi","tablo","anahtar","kuralAd","kenar","belgeEtiket","belgeBaslik","belgeCit"])
    assert.ok(acikPalet[anahtar], `sadeRenklerAcik.${anahtar} eksik — açık temada koyu değere düşer`);
  // dal çizgisi tema-duyarlı (dallar.ts): açık bronz tanımlı ve glife bağlı
  const dallar = oku("../src/dallar.ts");
  assert.ok(dallar.includes("CIZGI_RENGI_ACIK"), "dallar.ts açık-tema çizgi rengi kalkmış");
  assert.ok(/light:\s*\{\s*before:/.test(dallar), "dal glifinde light: before override'ı yok — açık temada çizgi kaybolur");
});

test("B5: [*Light*] açık-tema bloğu kanondan üretilir (sadeRenklerAcik + kodOnekleriAcik)", () => {
  const acik: Record<string, string> =
    JSON.parse(readFileSync(VARSAYILAN.AYAR!, "utf8"))["editor.semanticTokenColorCustomizations"]["[*Light*]"].rules;
  assert.equal(acik.sarmalParam, palet.sadeRenklerAcik.parametre, "B5: açık-tema parametre rengi sapmış");
  assert.equal(acik.sarmalKod, palet.sadeRenklerAcik.kod, "B5: açık-tema KOD rengi sapmış");
  for (const [grup, token] of Object.entries(ONEK))
    assert.equal(acik[token], palet.kodOnekleriAcik[grup],
      `B5: açık-tema ${token} (${grup}) kanondan sapmış — "npm run build" kanondan üretir`);
});

test("B5: rozet/dekorasyon renkleri (.vscode/settings.json) kanonla birebir", () => {
  const ayar = JSON.parse(readFileSync(VARSAYILAN.AYAR!, "utf8"));
  const wb: Record<string, string> = ayar["workbench.colorCustomizations"];
  const rozet = JSON.parse(oku("../../../oz/siniflama/kayit.json")).renkPaleti.driftRozetleri;
  assert.equal(wb["editorError.foreground"], rozet.hata);
  assert.equal(wb["editorWarning.foreground"], rozet.uyari);
  assert.equal(wb["editorInfo.foreground"], rozet.bilgi);
  assert.equal(wb["list.errorForeground"], rozet.hata);
  assert.equal(wb["list.warningForeground"], rozet.uyari);
  assert.equal(wb["list.infoForeground"], rozet.bilgi);
});

test("B5: YEDEK_ENUM ve ROZET_YEDEK içerik-anahtarları kanonla birebir (④-B9: farklı anahtar = ikinci gerçek)", () => {
  const kanon = JSON.parse(oku("../../../oz/siniflama/kayit.json"));
  // YEDEK_ENUM.metod (tamamlama.ts) ↔ semalar.Uç.enum.metod
  const tam = oku("../src/tamamlama.ts");
  const metodEs = tam.match(/"metod":\s*\[([^\]]+)\]/);
  assert.ok(metodEs, "B5: tamamlama.ts YEDEK_ENUM.metod bulunamadı");
  const yedekMetod = [...metodEs![1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(yedekMetod, kanon.semalar["Uç"].enum.metod,
    "B5: YEDEK_ENUM.metod kanonla (semalar.Uç.enum.metod) birebir değil");
  // ROZET_YEDEK (ortak.ts) ↔ driftRozetleri (not alanı hariç)
  const ortak = oku("../src/ortak.ts");
  const rozetEs = ortak.match(/ROZET_YEDEK = \{([^}]+)\}/);
  assert.ok(rozetEs, "B5: ortak.ts ROZET_YEDEK bulunamadı");
  for (const [, ad, renk] of rozetEs![1].matchAll(/(\w+):\s*"([^"]+)"/g))
    assert.equal(renk, kanon.renkPaleti.driftRozetleri[ad],
      `B5: ROZET_YEDEK.${ad} kanondan sapmış`);
});

// ══ BKM-SNV2-A03 · Giydir ↔ kanon eşitliği (F3 görünüm-paritesi nöbeti) ═══════
//   giydir-ayar.ts, renk-uret.mjs'in RUNTIME ikizidir: dış projeye komutla
//   yazılan tablo, bizim repoya build'de yazılan tabloyla BİREBİR olmalı —
//   iki üretici sessizce ayrışırsa Giydir yarı-parite dağıtır (sinav2 dersi).
import { giydirAyarlari } from "../src/giydir-ayar.ts";

test("A03: giydir textMate kuralları .vscode/settings.json (renk-uret üretimi) ile birebir", () => {
  const giydir = giydirAyarlari() as Record<string, unknown>;
  const ayar = JSON.parse(readFileSync(VARSAYILAN.AYAR!, "utf8"));
  assert.deepEqual(giydir["editor.tokenColorCustomizations"], ayar["editor.tokenColorCustomizations"],
    "A03: giydir textMate tablosu renk-uret üretiminden sapmış — iki üretici TEK tablo olmalı");
});

test("A03: giydir rozet/dekor + ikon teması .vscode/settings.json ile birebir", () => {
  const giydir = giydirAyarlari() as Record<string, unknown>;
  const ayar = JSON.parse(readFileSync(VARSAYILAN.AYAR!, "utf8"));
  assert.deepEqual(giydir["workbench.colorCustomizations"], ayar["workbench.colorCustomizations"],
    "A03: giydir rozet tablosu sapmış");
  assert.equal(giydir["workbench.productIconTheme"], ayar["workbench.productIconTheme"],
    "A03: giydir ikon teması sapmış");
});

test("A03: giydir anlamsal kuralları .vscode/settings.json (renk-uret üretimi) ile birebir (+[*Light*])", () => {
  const giydir = giydirAyarlari() as Record<string, unknown>;
  const ayar = JSON.parse(readFileSync(VARSAYILAN.AYAR!, "utf8"));
  assert.deepEqual(giydir["editor.semanticTokenColorCustomizations"], ayar["editor.semanticTokenColorCustomizations"],
    "A03: giydir anlamsal tablosu renk-uret üretiminden sapmış — iki üretici TEK tablo olmalı "
    + "(paket bu ilanı artık taşımaz; karşılaştırma yüzeyi depo tercihidir)");
});

test("A03/EKL-F6-A04: giydir [sarmal] bloğunun HER anahtarı paketin kendi varsayılanında da vardır", () => {
  const giydir = giydirAyarlari()["[sarmal]"] as Record<string, unknown>;
  const paketBlok = paket.contributes.configurationDefaults["[sarmal]"] as Record<string, unknown>;
  for (const [anahtar, deger] of Object.entries(giydir))
    assert.deepEqual(paketBlok[anahtar], deger,
      `A03: "${anahtar}" giydir tablosunda var, paketin varsayılanında yok ya da farklı — kurulumdan sonra hiçbir şey yazmayan kullanıcı Founder'ın gördüğü biçimi görmez (EKL-F6-A04)`);
});

// ══ YUZ-4.1 RENK KANUNU nöbeti (eski ayrık ray-paleti SÖKÜLDÜ — geri gelemez) ═══
//   Renk = YALNIZ durum kanalı; tip yazı-boyaması (sarmal.ray.*) kanunla kalktı.
//   Terra-RED onarımı (TUR-1 kabul denetimi): nöbet ürünü DEĞİL ÜRETİCİYİ
//   kilitler — renk-uret GERÇEKTEN koşturulur (geçici kopyalara); üreticiye
//   ray-üretimi geri eklenirse build beklemeden bu test kırmızı yanar.
import { mkdtempSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { uret } from "../arac/renk-uret.mjs";

test("YUZ-4.1 ÜRETİCİ KİLİDİ: renk-uret koşturulur — ürettiği paket sarmal.ray.* İÇEREMEZ ve depodakiyle birebir", () => {
  const dizin = mkdtempSync(join(tmpdir(), "sarmal-renk-"));
  const yollar = {
    PAKET: join(dizin, "package.json"),
    AYAR: join(dizin, "settings.json"),
    GOMULU: join(dizin, "gomulu-kanon.ts"),
  };
  const kok = (u: string): string => fileURLToPath(new URL(u, import.meta.url));
  copyFileSync(kok("../package.json"), yollar.PAKET);
  copyFileSync(VARSAYILAN.AYAR!, yollar.AYAR);
  uret(yollar);   // ← üretici GERÇEKTEN koşar (davranış, metin-avı değil)
  const uretilen = JSON.parse(readFileSync(yollar.PAKET, "utf8"));
  const katkilar = uretilen.contributes.colors as Array<{ id: string; defaults: { dark: string } }>;
  assert.equal(katkilar.filter((c) => c.id.startsWith("sarmal.ray.")).length, 0,
    "YUZ-4.1: ÜRETİCİ sarmal.ray.* üretiyor — renk YALNIZ durumun kanalıdır, tip yazı-boyaması kanunla söküldü");
  // üretici↔depo senkronu: üretilen katkılar depodaki package.json ile BİREBİR
  // (üretici değişip build koşulmadıysa da yakalanır — Terra'nın açık kapısı).
  const depodaki = JSON.parse(oku("../package.json")).contributes.colors;
  assert.deepEqual(katkilar, depodaki,
    "YUZ-4.1: üreticinin ürettiği contributes.colors depodakinden sapmış — 'npm run build' koşulmamış ya da üretici değişmiş");
  // bağımlılık kenarının pembesi yaşar ve rengi kanondan gelir (YUZ-4.1):
  const sade = JSON.parse(oku("../../../oz/siniflama/kayit.json")).renkPaleti.sadeRenkler;
  assert.equal(katkilar.find((c) => c.id === "sarmal.kenar")?.defaults.dark, sade.kenar,
    "sarmal.kenar katkısı üreticiden kanon değeriyle çıkmalı (YUZ-4.1 — renk tek kaynaktan)");
});

test("YUZ-4.1: kanonda rayRenkleri GERİ GELEMEZ (S3 kilidi — palet tamamen silindi, tarihçe git'te)", () => {
  const palet = JSON.parse(oku("../../../oz/siniflama/kayit.json")).renkPaleti;
  assert.equal(palet.rayRenkleri, undefined,
    "YUZ-4.1: kanonda rayRenkleri bulundu — S3 kilidi: palet TAMAMEN silinir");
});

// ── YUZ-4 dekor DAVRANIŞI (yol-dekor.ts SAF modül — metin-avı değil gerçek karar) ──
import { dekorCoz, DURUM_ROZET, DURUM_ANAHTAR, BILDIRIM_ROZET } from "../src/yol-dekor.ts";
import { ANLAM_RENKLERI, SATIR_SIMGELERI } from "../src/simge-cizelgesi.ts";

test("YUZ-4.1 DAVRANIŞ: satır rengi yalnız uç durumlarda — salience bütçesi", () => {
  assert.equal(dekorCoz("gelistirmede", 0)?.renk, "charts.yellow", "geliştirmede = TAM SARI satır");
  assert.equal(dekorCoz("bloklu", 0)?.renk, "errorForeground", "bloklu = kırmızı satır");
  assert.equal(dekorCoz("bitti", 0)?.renk, "descriptionForeground", "bitmiş = soluk yazı");
  assert.equal(dekorCoz("notr", 0), undefined, "bekleyen/kısmi NÖTR — dekorasyon almaz");
});

test("YUZ-4.1 DAVRANIŞ: blokaj ! rozeti köke tırmanır, ikon rengi çalınmaz", () => {
  const d = dekorCoz("notr", 3);
  assert.equal(d?.rozet, "!", "bloklu-içeren kapsayıcı ! rozeti almalı");
  assert.ok(d?.ipucu?.includes("3"), "hover 'altında N bloklu adım' sayıyı söylemeli");
  assert.equal(d?.renk, undefined, "nötr kapsayıcının YAZI rengi çalınmaz — yalnız rozet");
  assert.equal(dekorCoz("notr", 0), undefined, "blokajsız nötr satır dekorsuz kalır");
});

test("YUZ-4.2 DAVRANIŞ: Adım ikonları şekil-durumlu + durum anahtarları tam", () => {
  assert.equal(DURUM_ROZET["geliştirmede"].ikon, "sync~spin");
  assert.equal(DURUM_ROZET["bloklu"].ikon, "circle-slash");
  assert.equal(DURUM_ROZET["beklemede"].ikon, "circle-large-outline");
  // YAS-4: kanıtsız tamamlanma ayrı görünür — doğrulanmamış BOŞ turuncu çek, dolu yeşil çekten şekil+renkle ayrılır.
  assert.equal(DURUM_ROZET["doğrulanmamış"].ikon, "pass");
  assert.deepEqual(DURUM_ANAHTAR,
    { "beklemede": "notr", "geliştirmede": "gelistirmede", "tamamlandı": "bitti", "doğrulanmamış": "dogrulanmamis", "bloklu": "bloklu" });
  // yolharitasi tip-boyamasına dönemez (kaynak-seviye kilit):
  assert.ok(!/TIP_RENK/.test(oku("../src/yolharitasi.ts")),
    "YUZ-4.1: TIP_RENK haritası geri gelmiş — yazı rengi tip DEĞİL durumdur");
});

// ── 👁 GÖZLEMLER PANELİ: şekil kademeyi, renk türü söyler ────────────────────
//    Founder bu kusuru İKİ KEZ gözle buldu (2026-07-28): grup satırı ile
//    altındaki kayıtlar aynı simgeyi taşıyınca ağacın kademesi okunmuyor, üç
//    ayrı şekil aynı kademede yarışınca da panel gürültüye dönüyor. Üçüncü kez
//    olmasın diye kusur nöbete bağlandı.
test("GÖZLEMLER: grup satırı çocuklarıyla AYNI simgeyi taşımaz", () => {
  for (const [tur, rozet] of Object.entries(BILDIRIM_ROZET)) {
    assert.notEqual(rozet.grupSimgesi, rozet.simge,
      `"${tur}" türünde grup satırı ile kayıt satırı aynı simgeyi taşıyor — ağacın kademesi bakışta okunmaz`);
  }
});

test("GÖZLEMLER: kayıt satırları TEK şekil taşır, türü RENK ayırır", () => {
  // VIT-KIMLIK-A05: şekil geometrik ailenin satır çizelgesinden, renk üreticinin
  // ANLAM ekseninden gelir; ham renk değeri rozete hiçbir biçimde giremez.
  const sekiller = new Set(Object.values(BILDIRIM_ROZET).map((r) => r.simge));
  assert.equal(sekiller.size, 1,
    `kayıt satırları ${sekiller.size} ayrı şekil kullanıyor (${[...sekiller].join(" · ")}) — aynı kademede şekil yarışı gürültü üretir`);
  const anlamlar = new Set(Object.values(BILDIRIM_ROZET).map((r) => r.anlam));
  assert.equal(anlamlar.size, Object.keys(BILDIRIM_ROZET).length,
    "her türün AYRI anlam rengi olmalı; şekil tek olduğuna göre türü yalnız renk ayırır");
  for (const r of Object.values(BILDIRIM_ROZET)) {
    assert.ok((ANLAM_RENKLERI as readonly string[]).includes(r.anlam),
      `rozet anlamı üreticinin ekseninde değil: ${r.anlam}`);
    assert.ok((SATIR_SIMGELERI as readonly string[]).includes(r.simge)
      && (SATIR_SIMGELERI as readonly string[]).includes(r.grupSimgesi),
      `rozet simgesi satır çizelgesinde değil: ${r.simge} · ${r.grupSimgesi}`);
  }
});

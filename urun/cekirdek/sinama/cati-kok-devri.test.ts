// ═══════════════════════════════════════════════════════════════════════════
// cati-kok-devri.test.ts — 🧭 KPS-AYR-A01 ikinci yarı · Çatı Kökünden Kök Devri (MIM-1.1 · YAS-3.3)
//
//   Göreli yol çözen ölçümler (iskelet kıyası ile disk mutabakatı, meyve dosya
//   yolu, doc-drift, ebedî kilit, sınıflama örtüsü, dogfood kapıları) kökünü
//   denetimin koşulduğu dizinden okur. Çatı kökünden koşulan denetimde bu kök
//   çatının kendisiydi ve kapsanan projelerin yolları çatıya göre çözülüyordu:
//   2026-09-10 ölçümünde Sarmal kendi kökünden sıfır hata verirken çatı
//   kökünden üç yüz altmış beş hata veriyordu. Onarım, alt dizinindeki giriş
//   dosyasında ilan edilmiş her Projeyi KENDİ kökünden koşturur ve bulgularını
//   o kökün önekiyle çatıya döndürür (denetim.ts · projeKokleri).
//
//   Nöbet gerçek bir diskte kurulan iki projeli bir çatıda ölçer, çünkü kusur
//   tam da yolun diskte nereden çözüldüğüdür ve bellekteki bir fikstür onu
//   göremez. Her projenin kaynak dosyası YALNIZ kendi kökünde, ebedî kilidi
//   YALNIZ kendi kökünde yaşar; birinci projenin ders dünyasında ayrıca bir
//   örnek Proje bulunur ki karnenin hangi kaynaktan okunduğu da ölçülebilsin.
//   Nöbetin kendi doğruluğu iki yoldan ölçülür: karşılaştırıcı tek bir farkı
//   bile görür ve kök devri kapatıldığında aynı fikstür üç yol tanısıyla
//   kırmızıya döner, yani fikstür yol çözümüne gerçekten duyarlıdır.
//
//   MUTASYON KANITI (2026-09-10 · her biri tek başına uygulandı, nöbet koşuldu,
//   kaynak birebir geri yüklendi ve sekiz sınama yeniden yeşil görüldü):
//     M1 kök çözümü çatıya döner (devredilen kök listesi boş)  → 4 sınama düşer
//     M2 devredilen kökün öneki etikete eklenmez               → 4 sınama düşer
//     M3 çatı payı süzgeci kapanır (kök dosyası iki kez sayılır)→ 3 sınama düşer
//     M4 tür dökümüne köklerin dosya yayılımı eklenmez         → 1 sınama düşer
//     M5 hanenin karnesi çatı grafından okunur                 → 1 sınama düşer
//     M6 köken damgası devredilen kökten taşınmaz              → 1 sınama düşer
//     M7 iç içe kök süzgeci kaldırılır (projeKokleri)          → 1 sınama düşer
//     M8 giriş dosyası şartı kaldırılır (projeKokleri)         → 1 sınama düşer
// ═══════════════════════════════════════════════════════════════════════════
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { denetimKos } from "../src/denetim.ts";
import type { DenetimSonucu } from "../src/denetim.ts";
import { projeKokleri } from "../src/dag.ts";
import { projeKapsamlari } from "../src/kimlik.ts";
import type { ProjeKapsami } from "../src/kimlik.ts";
import { programlariYukle } from "../src/denetci.ts";
import { ebediEnvanter } from "../src/kuralci.ts";

const SNF_YOL = fileURLToPath(new URL("../../../oz/siniflama/kayit.json", import.meta.url));
const BUGUN = "2026-09-10";
const kos = (kok: string, anaYolu?: string): DenetimSonucu =>
  denetimKos(kok, { snfYol: SNF_YOL, bugun: BUGUN, tamListe: true, ...(anaYolu ? { anaYolu } : {}) });

function yaz(kok: string, yol: string, icerik: string): void {
  mkdirSync(dirname(join(kok, yol)), { recursive: true });
  writeFileSync(join(kok, yol), icerik);
}

/** Bir Proje kökü kurar: kendi planı, kendi kaynak dosyası, kendi ebedî kuralı ve kilidi. */
function projeKur(cati: string, klasor: string, ek: string, dersOrnegi: boolean): void {
  const ogreti = dersOrnegi
    ? `\n  Kitaplık( kod: KTP-OGRETI, yol: "ogreti/", ne: "Öğretinin kitaplığı" ) {\n    Raf( kod: RAF-ORNEK, yol: "ornek/", ne: "Ders dünyasının örnek rafı" )\n  }`
    : "";
  yaz(cati, `${klasor}/${klasor}_anadizin.sar`, `Proje( kod: PRJ-${ek}, ad: "${ek} Projesi", ne: "Kök devri nöbetinin ${ek} projesi", rejim: esnek ) {
  Raf( kod: RAF-PLAN, yol: "plan/", ne: "Plan rafı" )
  Raf( kod: RAF-KAYNAK, yol: "src/", ne: "Kaynak rafı" )
  Kitaplık( kod: KTP-YASA, yol: "yasa/", ne: "Yasanın kitaplığı" ) {
    Raf( kod: RAF-YONETISIM, yol: "yonetisim/", ne: "Yönetişim rafı" )
  }${ogreti}
}
`);
  yaz(cati, `${klasor}/plan/is.sar`, `Faz( kod: FZ-${ek}, ad: "${ek} Mevsimi", ne: "dönem" ) {
  Blok( kod: BLK-${ek}, ad: "${ek} Gövdesi", ne: "iş" ) {
    Katman( kod: KAT-${ek}, ad: "${ek} Katmanı", ne: "katman", teknolojiBağımsız: "Nöbet fikstürüdür; teknoloji seçimi ölçümün konusu değildir." ) {
      Adım( kod: ADM-${ek}-GOVDE, durum: tamamlandı, üretir: [ KOD-${ek}-GOVDE ], ne: "Gövdeyi yazmak" )
      Adım( kod: ADM-${ek}-SONRAKI, durum: beklemede, ne: "Sıradaki iş" )
    }
  }
}
Kod( kod: KOD-${ek}-GOVDE, dosya: "src/${klasor}.ts", ne: "Gövde — yolu projenin kendi köküne göredir" )
`);
  yaz(cati, `${klasor}/src/${klasor}.ts`, `export const ${klasor} = 1;\n`);
  yaz(cati, `${klasor}/yasa/yonetisim/ebedi.sar`, `Kural ebedi${ek}( kod: KRL-${ek}-EBEDI, dayanaksız: "Nöbet fikstürünün ebedî kuralı", otorite: anayasa, ebedi: evet,
  katman: niyet, kapsam: etmen ) {
  ne: "Ebedî kural — mührü yalnız bu projenin kendi kökünde yaşar"
}
`);
  if (dersOrnegi) {
    yaz(cati, `${klasor}/ogreti/ornek/ders_anadizin.sar`, `Proje( kod: PRJ-${ek}-DERS, ad: "Ders Örneği", ne: "Ders dünyasının örnek Projesi", rejim: esnek ) {
  Raf( kod: RAF-DERS, yol: "ders/", ne: "Ders rafı" )
}
`);
  }
  // Mühür, `kilitle` komutunun kullandığı envanterden kurulur ve YALNIZ kendi köküne yazılır.
  const { programlar } = programlariYukle(join(cati, klasor));
  const kurallar = Object.fromEntries([...ebediEnvanter(programlar)].map(([kod, e]) => [kod, e.imza]));
  writeFileSync(join(cati, klasor, "ebedi.kilit.json"), JSON.stringify({ not: "nöbet mührü", muhurlenme: BUGUN, kurallar }, null, 2));
}

/** İki projeli çatı: çatı ilanı iki Kitaplık duyurur, her proje kendi kökündedir. */
function catiKur(): string {
  const cati = mkdtempSync(join(tmpdir(), "sarmal-kokdevri-"));
  yaz(cati, "cati_anadizin.sar", `ÇalışmaAlanı( kod: CAL-SNM, ad: "Sınav Çatısı", ne: "İki projeli kök devri nöbet çatısı" ) {
  Kitaplık( kod: KTP-BIRINCI, yol: "birinci/", ne: "Birinci proje — kendi kökü birinci/birinci_anadizin.sar" )
  Kitaplık( kod: KTP-IKINCI, yol: "ikinci/", ne: "İkinci proje — kendi kökü ikinci/ikinci_anadizin.sar" )
}
`);
  projeKur(cati, "birinci", "A", true);
  projeKur(cati, "ikinci", "B", false);
  return cati;
}

/** Bulgu kümesi (sıralama hariç): dosya · konum · düzey · kimlik · mesaj, önek soyulmuş. */
function kume(s: DenetimSonucu, onek = ""): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of s.akis) {
    if (onek && !r.dosya.startsWith(onek)) continue;
    const dosya = r.dosya.slice(onek.length);
    for (const t of r.tanilar) {
      const a = [dosya, `${t.satir}:${t.sutun}`, t.duzey, t.kod, t.mesaj].join("\t");
      m.set(a, (m.get(a) ?? 0) + 1);
    }
  }
  return m;
}

/** İki yönlü fark: bir kümede olup ötekinde olmayan her bulgu (çokluk dâhil). */
function fark(x: Map<string, number>, y: Map<string, number>): string[] {
  const out: string[] = [];
  const bir = (a: Map<string, number>, b: Map<string, number>, isaret: string): void => {
    for (const [k, n] of a) for (let i = b.get(k) ?? 0; i < n; i++) out.push(`${isaret} ${k}`);
  };
  bir(x, y, "-");
  bir(y, x, "+");
  return out;
}

const boyut = (m: Map<string, number>): number => [...m.values()].reduce((a, b) => a + b, 0);

// ── ① Eşitlik: çatı kökünden okunan hane = projenin kendi kökünden okunan tablo ──

test("KPS-AYR-A01 · iki projeli çatıda her hane, projenin kendi kökünden okunan bulgu kümesiyle birebir aynıdır", () => {
  const cati = catiKur();
  try {
    const c = kos(cati);
    for (const [klasor, kod] of [["birinci", "PRJ-A"], ["ikinci", "PRJ-B"]] as const) {
      const kendi = kos(join(cati, klasor));
      const kendiKume = kume(kendi);
      assert.ok(boyut(kendiKume) > 0, `${klasor}: kendi kökünden hiç bulgu yok — boş küme eşitliği bir kanıt değildir`);
      assert.deepEqual(fark(kendiKume, kume(c, `${klasor}/`)), [], `${klasor}: çatı hanesi kendi kökünden ayrıştı`);
      const hane = c.projeGruplari.find((g) => g.kod === kod);
      assert.ok(hane, `${kod} hanesi çatı tablosunda yok`);
      assert.equal(hane.hata, kendi.toplamHata, `${kod}: hane hata sayısı kendi kökünün sayısı değil`);
      assert.equal(hane.uyari, kendi.toplamUyari, `${kod}: hane uyarı sayısı kendi kökünün sayısı değil`);
    }
  } finally { rmSync(cati, { recursive: true, force: true }); }
});

test("KPS-AYR-A01 · hanenin karnesi projenin KENDİ karnesidir; ders dünyasının örnek Projesi ayrı hane açmaz", () => {
  const cati = catiKur();
  try {
    const c = kos(cati);
    assert.deepEqual(c.projeGruplari.filter((g) => !g.catininKendisi).map((g) => g.kod), ["PRJ-A", "PRJ-B"],
      "çatı tablosunda yalnız iki gerçek Proje kökü bulunur");
    for (const [klasor, kod] of [["birinci", "PRJ-A"], ["ikinci", "PRJ-B"]] as const) {
      const kendi = kos(join(cati, klasor));
      const karne = c.projeGruplari.find((g) => g.kod === kod)?.karne;
      assert.ok(karne && kendi.karne, `${kod}: karne yok`);
      assert.deepEqual({ dugum: karne.dugum, adim: karne.adim, durumlar: karne.durumlar },
        { dugum: kendi.karne.dugum, adim: kendi.karne.adim, durumlar: kendi.karne.durumlar },
        `${kod}: hanenin karnesi kendi kökünün karnesi değil`);
    }
  } finally { rmSync(cati, { recursive: true, force: true }); }
});

test("KPS-AYR-A01 · devredilen kökün tanıları köken damgasını taşır (eklentinin üretici süzgeci aynı kararı verir)", () => {
  const cati = catiKur();
  try {
    const c = kos(cati);
    const kendi = kos(join(cati, "birinci"));
    const damgalar = (s: DenetimSonucu, onek = ""): string[] => s.akis
      .filter((r) => r.dosya.startsWith(onek))
      .flatMap((r) => r.tanilar.map((t) => `${r.dosya.slice(onek.length)}\t${t.kod}\t${s.koken.get(t) ?? "DAMGASIZ"}`))
      .sort();
    assert.deepEqual(damgalar(c, "birinci/"), damgalar(kendi), "köken damgaları çatı kökünde kendi kökündekiyle aynı olmalı");
  } finally { rmSync(cati, { recursive: true, force: true }); }
});

test("KPS-AYR-A01 · tür dökümü kök devrinden sonra da gerçek toplamı ve yayılımı söyler", () => {
  const cati = catiKur();
  try {
    const c = kos(cati);
    const a = kos(join(cati, "birinci"));
    const b = kos(join(cati, "ikinci"));
    const beklenen = new Map<string, { toplam: number; dosya: Set<string> | number }>();
    const ekle = (kod: string, toplam: number, dosya: number): void => {
      const v = beklenen.get(kod) ?? { toplam: 0, dosya: 0 };
      beklenen.set(kod, { toplam: v.toplam + toplam, dosya: (v.dosya as number) + dosya });
    };
    for (const s of [a, b]) for (const r of s.turDokumu) ekle(r.kod, r.toplam, r.dosyaSayisi);
    // Çatının kendi payı (hiçbir köke devredilmeyen dosyalar) akıştan sayılır.
    const catiPayi = new Map<string, { toplam: number; dosyalar: Set<string> }>();
    for (const r of c.akis) {
      if (r.dosya.startsWith("birinci/") || r.dosya.startsWith("ikinci/")) continue;
      for (const t of r.tanilar) {
        const v = catiPayi.get(t.kod) ?? { toplam: 0, dosyalar: new Set<string>() };
        v.toplam += t.ozetlenen ?? 1; v.dosyalar.add(r.dosya); catiPayi.set(t.kod, v);
      }
    }
    for (const [kod, v] of catiPayi) ekle(kod, v.toplam, v.dosyalar.size);
    const gercek = new Map(c.turDokumu.map((r) => [r.kod, { toplam: r.toplam, dosya: r.dosyaSayisi }]));
    assert.deepEqual(gercek, beklenen, "tür dökümü köklerin kendi dökümleriyle çatı payının toplamı olmalı");
  } finally { rmSync(cati, { recursive: true, force: true }); }
});

// ── ② Nöbetin kendi doğruluğu ─────────────────────────────────────────────────

test("KPS-AYR-A01 · kök çatıya geri döndürülünce aynı fikstür üç yol tanısıyla kırmızıya döner", () => {
  const cati = catiKur();
  try {
    // Fikstürün duyarlılığı diskte ölçülür: meyve ve mühür yalnız projenin kökünde yaşar.
    assert.ok(existsSync(join(cati, "ikinci/src/ikinci.ts")) && !existsSync(join(cati, "src/ikinci.ts")));
    assert.ok(existsSync(join(cati, "ikinci/ebedi.kilit.json")) && !existsSync(join(cati, "ebedi.kilit.json")));
    // Dış giriş dosyası (--ana) kök devrini kapatır: bu, onarımdan önceki çatı koşumunun ta kendisidir.
    const devirsiz = kos(cati, join(cati, "cati_anadizin.sar"));
    const kendi = kos(join(cati, "ikinci"));
    const f = fark(kume(kendi), kume(devirsiz, "ikinci/"));
    const kodlar = new Set(f.filter((s) => s.startsWith("+")).map((s) => s.split("\t")[3]));
    for (const kod of ["meyve-dosyası-eksik", "doc-drift", "mühürsüz-ebedi"]) {
      assert.ok(kodlar.has(kod), `kök çatıdan çözülünce '${kod}' doğmalıydı; doğan: ${[...kodlar].join(" · ")}`);
    }
  } finally { rmSync(cati, { recursive: true, force: true }); }
});

test("KPS-AYR-A01 · karşılaştırıcı tek bir eksik ya da değişmiş bulguyu bile görür", () => {
  const cati = catiKur();
  try {
    const x = kume(kos(join(cati, "birinci")));
    const eksik = new Map(x);
    const [ilk] = eksik.keys();
    eksik.set(ilk, eksik.get(ilk)! - 1);
    if (eksik.get(ilk) === 0) eksik.delete(ilk);
    assert.equal(fark(x, eksik).length, 1, "tek eksik bulgu tek fark olmalı");
    const degismis = new Map([...x].map(([k, n], i) => [i === 0 ? k.replace(/\t[^\t]*$/, "\tbaşka mesaj") : k, n]));
    assert.equal(fark(x, degismis).length, 2 * (x.get(ilk) ?? 1), "değişen mesaj iki yönde fark vermeli");
    assert.deepEqual(fark(x, new Map(x)), [], "aynı küme fark vermez");
  } finally { rmSync(cati, { recursive: true, force: true }); }
});

// ── ③ Kök çözümünün sınırı ────────────────────────────────────────────────────

test("KPS-AYR-A01 · projeKokleri: yalnız alt dizindeki giriş dosyası kök sayılır, iç içe olanda en dıştaki kalır", () => {
  const k = (kod: string, dosya: string): ProjeKapsami => ({ kod, dosya, onek: dosya.slice(0, dosya.lastIndexOf("/") + 1) });
  const kapsamlar = [
    k("PRJ-KOK", "kok_anadizin.sar"),                 // koşulan kökün kendisi: devredilmez
    k("PRJ-DIS", "dis/dis_anadizin.sar"),            // alt dizindeki giriş dosyası: kök
    k("PRJ-IC", "dis/ic/ic_anadizin.sar"),           // iç içe: dıştakinin kendi koşumu devreder
    k("PRJ-PLAN", "baska/plan/proje.sar"),           // giriş dosyası dışında ilan: kök değil
    k("PRJ-ESKI", "eski/ana.sar"),                   // eski giriş adı da tanınır
  ];
  assert.deepEqual(projeKokleri(kapsamlar).map((x) => x.kod), ["PRJ-DIS", "PRJ-ESKI"]);
  assert.deepEqual(projeKokleri([k("PRJ-TEK", "tek_anadizin.sar")]), [], "tek projeli depoda devredilecek kök yoktur");
});

test("KPS-AYR-A01 · tek projeli depoda kök devri yoktur ve ders dünyasının örnek Projesi kök sayılmaz", () => {
  const cati = catiKur();
  try {
    const kok = join(cati, "birinci");
    const { programlar } = programlariYukle(kok);
    assert.deepEqual(projeKokleri(projeKapsamlari(programlar)), [], "ders dünyasındaki örnek Proje devredilmez");
    const s = kos(kok);
    assert.ok(s.akis.every((r) => !r.dosya.startsWith("birinci/")), "kendi kökünden koşumda etiketler köke görelidir; önek eklenmez");
    assert.ok(s.projeGruplari.filter((g) => !g.catininKendisi).length <= 1, "tek projeli depoda proje tablosu açılmaz");
  } finally { rmSync(cati, { recursive: true, force: true }); }
});

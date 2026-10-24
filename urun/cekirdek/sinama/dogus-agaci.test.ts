// ═══════════════════════════════════════════════════════════════════════════
// dogus-agaci.test.ts — 🌳 GERÇEK AĞAÇ NÖBETİ (HST-MTR-A07)
//
//   HTR-FIKSTUR-YOLLARI-GERCEK-AGACA-BENZEMIYOR kaydı, fikstür külliyatının
//   yarısının kullanıcının eline geçen ağacı hiç sınamadığını ölçmüştür. Bu dosya
//   iki şeyi ölçer. Birincisi `dogus-agaci.ts` modülünün türettiği yolların doğuş
//   paketinin diske yazdığı ağaçla ve motorun kendi kurallarıyla birebir
//   örtüştüğüdür; öteki sınamalar plan yollarını o modülden okuduğu için bu
//   örtüşme bütün taşınmış fikstürlerin zeminidir. İkincisi uçtan uca davranıştır:
//   doğuşun ağacı kullanıcının ilk turunda büyütülür, gerçek komut satırıyla
//   denetlenir ve tohumlanan kusurlar doğuşun yazdığı adreslerde bildirilir.
//
//   Aynı uçtan uca ölçüm, kullanıcının planını doğrudan bir Kitaplık olarak ilan
//   ettiği meşru düzende de koşar; o düzen doğuştan gelmediği için ilanı burada
//   elle yazılır. Son ölçüm kaydın dersini gerçek ağaçta mühürler: doğuşun
//   çatısında şablon, arşiv, fikstür ve örnek adlı kitaplıkların altında yaşayan
//   projeler görünür kalır ve kusurları kendi adresleriyle bildirilir.
// ═══════════════════════════════════════════════════════════════════════════
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { ayristir } from "../src/ayristirici.ts";
import { belirtecle } from "../src/belirtec.ts";
import { FAZ_DOSYASI_YERI } from "../src/denetci.ts";
import { dogusDosyaAdi, dogusYaz } from "../src/dogus.ts";
import { iskeletPlani } from "../src/iskeletci.ts";
import { siniflamaYukle } from "../src/siniflama.ts";
import {
  DOGUS_TARIHI, DUZEN, calismaAlaniKur, dogusAgaciKur, dogusDuzeni, fazMetni, fazYolu, planYolu,
} from "./dogus-agaci.ts";

const CEKIRDEK = fileURLToPath(new URL("..", import.meta.url));
const SNF = siniflamaYukle(fileURLToPath(new URL("../../../oz/siniflama/kayit.json", import.meta.url)));

/** Gerçek komut satırı: `sarmal denetle <kök> --tam-liste --tarih <doğum günü>`. */
function denetle(kok: string): { kod: number | null; cikti: string } {
  const s = spawnSync(process.execPath, [join(CEKIRDEK, "src", "sarmal.ts"), "denetle", kok, "--tam-liste", "--tarih", DOGUS_TARIHI],
    { encoding: "utf8", timeout: 120000 });
  return { kod: s.status, cikti: (s.stdout ?? "") + (s.stderr ?? "") };
}
/** Karne satırındaki Adım sayısı. */
function karneAdimi(cikti: string): number {
  const m = /📋 Karne \(ürün\): \d+ düğüm · (\d+) Adım/u.exec(cikti);
  assert.ok(m, `karne satırı çıktıda yok:\n${cikti.slice(-600)}`);
  return Number(m[1]);
}
/** Belirli bir dosyaya bağlanmış belirli kimlikteki tanı satırı. */
const taniSatiri = (cikti: string, dosya: string, kod: string): string | undefined =>
  cikti.split("\n").find((l) => l.includes(` ${dosya}:`) && l.includes(`[${kod}]`));

// ── ① Tek kaynak: türetilen düzen paketin yazdığı ağaçla örtüşür ────────────

test("tek kaynak: türetilen yollar doğuşun diske yazdığı dosya ve klasörlerin kendisidir", () => {
  const kok = mkdtempSync(join(tmpdir(), "sarmal-tek-kaynak-"));
  try {
    const sonuc = dogusYaz(kok, "deneme", DOGUS_TARIHI, "proje");
    for (const dosya of [DUZEN.anadizin, DUZEN.ilkFaz, DUZEN.durumKaydi]) {
      assert.ok(sonuc.yazilan.includes(dosya), `${dosya} paketin yazdığı dosyalar arasında değil`);
      assert.ok(statSync(join(kok, dosya)).isFile(), `${dosya} diskte dosya değil`);
    }
    for (const klasor of [DUZEN.planKitapligi, DUZEN.planRafi, DUZEN.fazKlasoru]) {
      assert.ok(statSync(join(kok, klasor)).isDirectory(), `${klasor} diskte klasör değil`);
    }
    // Plan rafı, Faz klasörünün ve ilk Faz dosyasının kapsayıcısıdır.
    assert.ok(DUZEN.fazKlasoru.startsWith(`${DUZEN.planRafi}/`));
    assert.ok(DUZEN.ilkFaz.startsWith(`${DUZEN.fazKlasoru}/`));
  } finally { rmSync(kok, { recursive: true, force: true }); }
});

test("tek kaynak: plan rafı diskteki giriş ilanında bir Kitaplığın içinde Raf olarak ilanlıdır (çıplak Raf değil)", () => {
  const agac = dogusAgaciKur();
  try {
    const dizinler = iskeletPlani(ayristir(belirtecle(agac.oku(agac.anadizin))), SNF).ogeler.filter((o) => o.tur === "dizin");
    const raf = dizinler.find((o) => o.yol === agac.planRafi);
    const kitaplik = dizinler.find((o) => o.yol === agac.planKitapligi);
    assert.ok(raf?.icerikRafi === true, "plan rafı giriş ilanında Raf olarak ilan edilmeli");
    assert.ok(kitaplik !== undefined && kitaplik.icerikRafi !== true, "plan rafının kapsayıcısı Kitaplık olmalı");
    assert.ok(agac.planRafi.startsWith(`${agac.planKitapligi}/`));
  } finally { agac.sil(); }
});

test("tek kaynak: Faz yolları motorun Faz dosyası kuralından geçer, kurala uymayan ad reddedilir", () => {
  assert.ok(FAZ_DOSYASI_YERI.test(DUZEN.ilkFaz), "paketin ilk Faz dosyası motorun kuralına uymalı");
  for (const [sira, ad] of [[2, "surum"], [10, "on"], [0, "sifir"]] as const) {
    const yol = fazYolu(sira, ad);
    assert.ok(FAZ_DOSYASI_YERI.test(yol), `${yol} motorun Faz dosyası kuralına uymalı`);
    assert.ok(yol.startsWith(`${DUZEN.fazKlasoru}/`), `${yol} Faz klasöründe olmalı`);
  }
  assert.throws(() => fazYolu(1, "alt/klasor"), /Faz dosyası kuralına uymuyor/u, "klasör taşıyan ad Faz dosyası olamaz");
  assert.equal(planYolu("a.sar"), `${DUZEN.planRafi}/a.sar`);
});

test("tek kaynak: düzen proje adından bağımsızdır; giriş ilanının adı paketin adlandırma kuralını izler", () => {
  const baska = dogusDuzeni("Bahçe Projem");
  assert.deepEqual({ ...baska, anadizin: "" }, { ...DUZEN, anadizin: "" }, "klasörler ve Faz dosyası addan bağımsız olmalı");
  assert.equal(baska.anadizin, `${dogusDosyaAdi("Bahçe Projem")}_anadizin.sar`);
});

test("tek kaynak: fazMetni doğan ağaçta tam zincirdir ve tek başına hata üretmez", () => {
  const agac = dogusAgaciKur({
    ilkFaz: fazMetni({ ek: "TEMIZ", adimlar: '        Adım( kod: ADM-TEMIZ-1, durum: beklemede, ne: "iş" )' }),
  });
  try {
    const { kod, cikti } = denetle(agac.kok);
    assert.equal(kod, 0, `tam zincirli fikstür hatasız denetlenmeli:\n${cikti.slice(0, 1500)}`);
    assert.match(cikti, /── ÖZET: 0 hata/u);
    assert.doesNotMatch(cikti, /\[(?:katı-rejim-altkatman-eksik|fazsız-blok|yersiz-faz-dosyası)\]/u);
  } finally { agac.sil(); }
});

// ── ② Uçtan uca: doğuşun ağacı kullanıcının ilk turunda ─────────────────────

const ILK_TUR_FAZI = (bagimli: string): string => fazMetni({
  ek: "SURUM",
  zemin: "takım: TAKIM-CEKIRDEK",
  adimlar: [
    `        Adım( kod: ADM-SURUM-01, durum: beklemede, öncelik: p1, bağımlı: [${bagimli}], ne: "İlk gerçek iş",`,
    '          görev: "Doğuştan sonraki ilk gerçek işi yürütmek", kabul: [ "iş biter" ], sınır: "yalnız ilk iş" )',
    "        Adım( kod: ADM-SURUM-02, durum: beklemede, öncelik: p2, bağımlı: [ ADM-SURUM-01 ], ne: \"İkinci iş\",",
    '          görev: "İlk işin üstüne ikinci işi yürütmek", kabul: [ "iş biter" ], sınır: "yalnız ikinci iş" )',
  ].join("\n"),
});

test("uçtan uca: doğuşun ağacı kullanıcının ilk turunda büyür, gerçek komut satırından hatasız geçer ve yeni Fazı sayar", () => {
  const agac = dogusAgaciKur({ ad: "uctan uca" });
  try {
    const taze = denetle(agac.kok);
    assert.equal(taze.kod, 0, `taze doğmuş ağaç hatasız olmalı:\n${taze.cikti.slice(0, 1200)}`);
    const tazeAdim = karneAdimi(taze.cikti);

    // Doğuşun Kuruluş Adımının tarif ettiği ilk tur: Teknoloji ve Takım giriş
    // ilanına yazılır, Kuruluş Katmanı Takıma bağlanır ve geçici kaçış silinir,
    // ilk gerçek iş yeni bir Faz dosyasında açılır.
    agac.ilanEkle('  Teknoloji( kod: TEK-TS, ne: "TypeScript — çekirdeğin dili" )\n' +
      '  Takım( kod: TAKIM-CEKIRDEK, ne: "Çekirdek yığını", bağımlı: [ TEK-TS ] )');
    agac.yaz(agac.ilkFaz, agac.oku(agac.ilkFaz).replace(/teknolojiBağımsız:\s*"[^"]*",/u, "takım: TAKIM-CEKIRDEK,"));
    agac.yaz(fazYolu(2, "surum"), ILK_TUR_FAZI(""));

    const { kod, cikti } = denetle(agac.kok);
    assert.equal(kod, 0, `ilk turu tamamlanmış ağaç hatasız olmalı:\n${cikti.slice(0, 1500)}`);
    assert.match(cikti, /── ÖZET: 0 hata/u);
    assert.doesNotMatch(cikti, /\[(?:yersiz-teknoloji-kaçışı|doğuş-sırası)\]/u, "zemin ilanı ve Takım bağıyla kuruluş uyarıları kapanmalı");
    assert.equal(karneAdimi(cikti), tazeAdim + 2, "yeni Faz dosyasının iki Adımı karneye girmeli");
    for (const kodu of ["ADM-SURUM-01", "ADM-SURUM-02"]) {
      assert.ok(cikti.split("\n").some((l) => l.includes(` ${fazYolu(2, "surum")}:`) && l.includes(kodu)),
        `${kodu} doğuşun Faz klasöründeki adresiyle gündemde görünmeli`);
    }
  } finally { agac.sil(); }
});

test("uçtan uca: doğuşun ağacına tohumlanan kusurlar doğuşun adreslerinde bildirilir ve kapıyı kapatır", () => {
  const agac = dogusAgaciKur({ ad: "kusurlu" });
  try {
    agac.ilanEkle('  Teknoloji( kod: TEK-TS, ne: "TypeScript" )\n  Takım( kod: TAKIM-CEKIRDEK, ne: "Çekirdek yığını", bağımlı: [ TEK-TS ] )');
    agac.yaz(fazYolu(2, "surum"), ILK_TUR_FAZI(" ADM-YOK-HEDEF "));
    // Plan rafının altındaki gövde ilanlıdır; rafı taşıyan Kitaplığa doğrudan konan gövde ilansızdır.
    agac.yaz(planYolu("notlar.sar"), 'Bellek( kod: BLM-RAFTA, tür: ders, ne: "Plan rafındaki not" )\n');
    agac.yaz(`${agac.planKitapligi}/kacak.sar`, 'Bellek( kod: BLM-KACAK, tür: ders, ne: "Kitaplığa düşmüş not" )\n');

    const { kod, cikti } = denetle(agac.kok);
    assert.equal(kod, 4, `kırık atıf kapıyı kapatmalı (çıkış 4):\n${cikti.slice(0, 1500)}`);
    const kirik = taniSatiri(cikti, fazYolu(2, "surum"), "kırık-referans");
    assert.ok(kirik?.startsWith("✖"), `kırık atıf doğuşun Faz dosyasında hata olarak bildirilmeli:\n${cikti.slice(0, 1500)}`);
    assert.match(kirik!, /ADM-YOK-HEDEF/u);
    const ilansiz = cikti.split("\n").filter((l) => l.includes("[ilansız-gövde]"));
    assert.equal(ilansiz.length, 1, `yalnız Kitaplığa düşen gövde ilansız sayılmalı:\n${ilansiz.join("\n")}`);
    assert.ok(ilansiz[0].includes(`'${agac.planKitapligi}/'`) && ilansiz[0].includes("kacak.sar"),
      `bulgu kapsayıcı Kitaplığı ve kaçak dosyayı anmalı: ${ilansiz[0]}`);
  } finally { agac.sil(); }
});

// ── ③ Uçtan uca: kullanıcının planını doğrudan Kitaplık ilan ettiği düzen ────

/** Meşru kullanıcı düzeni: plan kökün altında kendi Kitaplığıdır, Faz dosyaları onun rafındadır. */
const KITAPLIK_DUZENI = `Proje( kod: PRJ-KITAPLIK, ad: "kitaplik duzeni", rejim: katı,
  ne: "Planını doğrudan bir Kitaplık olarak ilan eden kullanıcının ağacı" ) {
  Teknoloji( kod: TEK-TS, ne: "TypeScript" )
  Takım( kod: TAKIM-CEKIRDEK, ne: "Çekirdek yığını", bağımlı: [ TEK-TS ] )
  Kitaplık( kod: KTP-PLAN, yol: "plan/", ne: "Planın kendi kitaplığı" ) {
    Raf( kod: RAF-FAZ, yol: "faz/", ne: "Faz dosyalarının rafı" )
  }
}
`;

test("uçtan uca Kitaplık düzeni: planı kendi Kitaplığında yaşayan ağaç hatasız geçer ve aynı kusur o düzenin adresinde bildirilir", () => {
  const kok = mkdtempSync(join(tmpdir(), "sarmal-kitaplik-duzeni-"));
  const yaz = (yol: string, metin: string): void => {
    mkdirSync(dirname(join(kok, yol)), { recursive: true });
    writeFileSync(join(kok, yol), metin, "utf8");
  };
  const faz = "plan/faz/1_ilk.sar";
  try {
    yaz("kitaplik_duzeni_anadizin.sar", KITAPLIK_DUZENI);
    yaz(faz, ILK_TUR_FAZI(""));
    const temiz = denetle(kok);
    assert.equal(temiz.kod, 0, `Kitaplık düzeni hatasız denetlenmeli:\n${temiz.cikti.slice(0, 1500)}`);
    assert.match(temiz.cikti, /── ÖZET: 0 hata/u);
    assert.doesNotMatch(temiz.cikti, /\[(?:kitaplıksız-kök|ilansız-gövde|yersiz-faz-dosyası)\]/u,
      "meşru Kitaplık düzeni yapı uyarısı almamalı");
    assert.equal(karneAdimi(temiz.cikti), 2);

    yaz(faz, ILK_TUR_FAZI(" ADM-YOK-HEDEF "));
    const kusurlu = denetle(kok);
    assert.equal(kusurlu.kod, 4);
    assert.ok(taniSatiri(kusurlu.cikti, faz, "kırık-referans")?.startsWith("✖"),
      `kırık atıf Kitaplık düzeninin Faz dosyasında bildirilmeli:\n${kusurlu.cikti.slice(0, 1500)}`);
  } finally { rmSync(kok, { recursive: true, force: true }); }
});

// ── ④ Kaydın dersi gerçek ağaçta: sıradan Türkçe klasör adları projeyi yutmaz ─

test("uçtan uca çatı: şablon, arşiv, fikstür ve örnek kitaplıklarındaki projeler görünür kalır, kusurları kendi adresinde bildirilir", () => {
  // Kayıttaki indeks dışı kusuru, adı ders raflarına benzeyen bir kullanıcı klasörünün
  // altındaki bütün ağacı görünmez kılıyordu ve onu yakalayabilecek tek fikstür
  // gerçek ağaçta üretilmeyen bir yolla yanlış davranışı mühürlüyordu. Burada aynı
  // dört ad doğuşun kurduğu bir çatının kitaplıklarıdır ve her birinin altında
  // doğuşla doğmuş bir proje yaşar.
  const projeler = [
    { ad: "kurumsal", klasor: "sablon/kurumsal", kod: "SABLON" },
    { ad: "eski site", klasor: "arsiv/eski_site", kod: "ARSIV" },
    { ad: "deneme alani", klasor: "fikstur/deneme_alani", kod: "FIKSTUR" },
    { ad: "vitrin", klasor: "ornek/vitrin", kod: "ORNEK" },
  ];
  const cati = calismaAlaniKur({ ad: "ajans", projeler: [{ ad: "ilk" }, ...projeler] });
  try {
    for (const p of projeler) {
      cati.projeler.get(p.ad)!.yaz(fazYolu(2, "tohum"), fazMetni({
        ek: `TOHUM-${p.kod}`,
        adimlar: `        Adım( kod: ADM-TOHUM-${p.kod}, durum: beklemede, bağımlı: [ ADM-YOK-${p.kod} ], ne: "Tohum" )`,
      }));
    }
    const { kod, cikti } = denetle(cati.kok);
    assert.equal(kod, 4, `dört kırık atıf kapıyı kapatmalı:\n${cikti.slice(0, 2000)}`);
    for (const p of projeler) {
      const satir = taniSatiri(cikti, `${p.klasor}/${fazYolu(2, "tohum")}`, "kırık-referans");
      assert.ok(satir?.startsWith("✖") && satir.includes(`ADM-YOK-${p.kod}`),
        `${p.klasor} altındaki projenin kusuru kendi adresinde bildirilmeli:\n${cikti.slice(0, 2000)}`);
    }
    assert.match(cikti, /── ÖZET: 4 hata/u, "her projenin kusuru tam bir kez sayılmalı");
  } finally { cati.sil(); }
});

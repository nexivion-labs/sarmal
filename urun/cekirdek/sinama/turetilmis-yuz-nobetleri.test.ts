// ═══════════════════════════════════════════════════════════════════════════
// turetilmis-yuz-nobetleri.test.ts — 🍎 SN-GOC-BELGE-TUREV (GOC-BELGE-A04)
//
//   Türetilmiş yüzlerin dört nöbeti tek dosyada yaşar:
//   ① KAYNAK AYRIŞMASI — canlı kaynakların SHA-256 mühürleri, A04 nöbet
//      kaydındaki (is/nitelik/goc/turetilmis_yuz_nobetleri.sar) tabloyla birebir
//      kalmalıdır; kaynak ilerleyip kayıt tazelenmezse süit kırmızı yanar.
//   ② ELLE DEĞİŞTİRİLMİŞ ÜRETİLEN YÜZ — on altı yüz temiz bir kopyada yeniden
//      üretilir ve İLK koşu sıfır fark vermelidir; üretilen bölgeye elle dokunan
//      her bayt ilk koşuda görünür.
//   ③ BAYAT ÖĞRETİM — kaynak ilerlediği hâlde yüz eski kalırsa nöbet yakalar;
//      fikstür bunu sandbox'ta kaynak mutasyonuyla kanıtlar (kırmızı senaryo
//      süitin İÇİNDE kurulur, canlı ağaca dokunulmaz).
//   ④ İDEMPOTENS DRIFT — bütün üreticilerin ikinci koşusu birebir aynı
//      çıktıyı vermelidir.
//   Ek nöbet: belge, rehber ve indeks bağlantıları yeni kanonik hedeflere
//   çözülür; emekli KARARLAR defteri bağlantı hedefi olarak geri gelemez.
//   Sınır: bu süit canlı çalışma ağacına YAZMAZ — bütün mutasyon fikstürleri
//   geçici sandbox kopyasında koşar (YAS-4.2 mutasyon kanıtı deseni).
// ═══════════════════════════════════════════════════════════════════════════
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { BELGE_YUZU_HEDEFLERI, belgeYuzleriniUret } from "../src/belge-yuzleri.ts";
import { kanonTutarlilikMetni } from "../src/kanon-tutarlilik.ts";
import { belgeMd } from "../src/belgele.ts";
import { ogretKarti } from "../src/ogret.ts";
import { siniflamaOrtuMerge, siniflamaOrtuYukle, siniflamaYukle, taksonomiBlokUygula, taksonomiMd } from "../src/siniflama.ts";

const KOK = fileURLToPath(new URL("../../..", import.meta.url));
const NOBET_KAYDI = join(KOK, "is/nitelik/goc/turetilmis_yuz_nobetleri.sar");
const sha256 = (metin: string): string => createHash("sha256").update(metin).digest("hex");

/** Nöbet kaydındaki "Kaynak mühürleri" tablosunu (kaynak → sha256) okur. */
function nobetMuhurleri(): Map<string, string> {
  const kayit = readFileSync(NOBET_KAYDI, "utf8");
  const bolge = kayit.slice(kayit.indexOf("## A · Kaynak mühürleri"), kayit.indexOf("## B ·"));
  const tablo = new Map<string, string>();
  for (const es of bolge.matchAll(/^\| `([^`]+)` \| `([0-9a-f]{64})` \|$/gm)) tablo.set(es[1], es[2]);
  return tablo;
}

/** A03 formülüyle kanon demeti: sekiz dosyanın `ad:sha` satırları + son satır sonu. */
function kanonDemeti(kok: string): string {
  const dizin = join(kok, "yasa", "kanon");
  const dosyalar = readdirSync(dizin).filter((ad) => ad.endsWith(".sar")).sort();
  return sha256(dosyalar.map((ad) => `${ad}:${sha256(readFileSync(join(dizin, ad), "utf8"))}`).join("\n") + "\n");
}

/** Canlı kaynakların mühürlerini nöbet kaydındaki adlarla ölçer. */
function canliMuhurler(kok: string): Map<string, string> {
  const tekil = [
    "oz/siniflama/kayit.json", "oz/siniflama/ortu.json",
    "urun/cekirdek/src/tani-sicili.ts", "urun/cekirdek/src/mcp-metinleri.ts", "urun/cekirdek/src/dil-baglami.ts",
    "urun/eklenti/package.nls.tr.json", "urun/eklenti/package.nls.json", "is/nitelik/goc/tani_yuzeyi_yonlendirme_matrisi.sar",
  ];
  const sonuc = new Map<string, string>([["yasa/kanon demeti (A03 formülü)", kanonDemeti(kok)]]);
  for (const yol of tekil) sonuc.set(yol, sha256(readFileSync(join(kok, yol), "utf8")));
  return sonuc;
}

/** Üreticilerin okuduğu her girdiyi ve on altı yüzü geçici köke kopyalar. */
function sandboxKur(): string {
  const sb = mkdtempSync(join(tmpdir(), "sarmal-turev-"));
  for (const dizin of ["yasa/kanon", "ogreti/ornek", "ogreti/sablon", "oz/siniflama"]) {
    cpSync(join(KOK, dizin), join(sb, dizin), { recursive: true });
  }
  for (const dosya of [
    "is/nitelik/goc/tani_yuzeyi_yonlendirme_matrisi.sar",
    "urun/cekirdek/src/tani-sicili.ts",
  ]) {
    mkdirSync(dirname(join(sb, dosya)), { recursive: true });
    writeFileSync(join(sb, dosya), readFileSync(join(KOK, dosya)));
  }
  for (const hedef of BELGE_YUZU_HEDEFLERI) {
    const kaynakYolu = join(KOK, hedef.yol);
    mkdirSync(dirname(join(sb, hedef.yol)), { recursive: true });
    writeFileSync(join(sb, hedef.yol), readFileSync(kaynakYolu));
  }
  return sb;
}

test("① kaynak ayrışması nöbeti: canlı kaynak mühürleri A04 nöbet kaydıyla birebirdir", () => {
  const kayitli = nobetMuhurleri();
  const canli = canliMuhurler(KOK);
  assert.equal(kayitli.size, canli.size, "nöbet kaydındaki mühür satırı sayısı canlı ölçümle uyuşmalı");
  for (const [kaynak, canliSha] of canli) {
    assert.equal(kayitli.get(kaynak), canliSha,
      `${kaynak} kaynağı nöbet kaydından ayrıştı — üreticileri yeniden koş ve nöbet kaydını tazele`);
  }
});

test("① kırmızı fikstür: sandbox'ta tek baytlık kanon mutasyonu demet mührünü düşürür", () => {
  const sb = sandboxKur();
  assert.equal(kanonDemeti(sb), nobetMuhurleri().get("yasa/kanon demeti (A03 formülü)"),
    "temiz kopyanın demeti kayıtla aynı başlamalı");
  const dil = join(sb, "yasa/kanon/dil.sar");
  writeFileSync(dil, readFileSync(dil, "utf8") + "\n// mutasyon\n", "utf8");
  assert.notEqual(kanonDemeti(sb), nobetMuhurleri().get("yasa/kanon demeti (A03 formülü)"),
    "kaynak ayrışması fikstürü kırmızıya düşmedi — demet mutasyonu görünmez kaldı");
});

test("② + ④ temiz kopyada on altı yüzün ilk ve ikinci koşusu sıfır fark verir", () => {
  const sb = sandboxKur();
  const ilk = belgeYuzleriniUret(sb);
  assert.deepEqual(ilk.degisen, [],
    `üretilen yüz canlı üreticiden ayrışmış (elle değişiklik ya da bayat yüz): ${ilk.degisen.join(", ")}`);
  assert.equal(ilk.degismeyen.length, BELGE_YUZU_HEDEFLERI.length);
  assert.deepEqual({ madde: ilk.kanonMaddesi, arac: ilk.aracSayisi }, { madde: 156, arac: 18 });
  const ikinci = belgeYuzleriniUret(sb);
  assert.deepEqual(ikinci.degisen, [], "ikinci koşu fark verdi — idempotens drift");
});

test("② kırmızı fikstür: üretilen bölgeye elle dokunan bayt ilk koşuda yakalanır ve onarılır", () => {
  const sb = sandboxKur();
  const readme = join(sb, "README.md");
  writeFileSync(readme, readFileSync(readme, "utf8").replace("156 tekil madde", "149 tekil madde"), "utf8");
  const koşu = belgeYuzleriniUret(sb);
  assert.deepEqual(koşu.degisen, ["README.md"], "elle değiştirilen üretilen bölge ilk koşuda görünmedi");
  assert.ok(readFileSync(readme, "utf8").includes("156 tekil madde"), "nöbet yüzü kanonik ölçüme onarmadı");
  assert.deepEqual(belgeYuzleriniUret(sb).degisen, [], "onarım sonrası koşu sıfır fark vermeli");
});

test("③ kırmızı fikstür: kaynak ilerleyip yüz eski kalınca bayat öğretim nöbeti yakalar", () => {
  const sb = sandboxKur();
  writeFileSync(join(sb, "ogreti/sablon/zzz_bayatlik_fiksturu.sar"),
    'Şablon( kod: SBL-BAYATLIK-FIKSTURU, ne: "bayat öğretim fikstürü — sandbox kaynağı ilerletir" )\n', "utf8");
  const koşu = belgeYuzleriniUret(sb);
  assert.ok(koşu.degisen.includes("ogreti/sablon/OKU.md"),
    "kaynak ilerledi ama şablon indeksi bayat kaldı — bayat öğretim nöbeti kırmızı yakalamadı");
  assert.ok(readFileSync(join(sb, "ogreti/sablon/OKU.md"), "utf8").includes("zzz_bayatlik_fiksturu.sar"),
    "tazelenen öğretim yüzü yeni kaynağı listelemeli");
});

test("④ karar indeksi ile sınıflama Reference yüzü diskte üreticisiyle birebirdir", () => {
  assert.equal(readFileSync(join(KOK, "is/nitelik/goc/kanon_tutarlilik.sar"), "utf8"), kanonTutarlilikMetni(KOK),
    "kanon_tutarlilik.sar üreticisinden ayrışmış — elle düzenleme ya da bayat türev");
  const kayitMd = readFileSync(join(KOK, "oz/siniflama/kayit.md"), "utf8");
  const snf = siniflamaOrtuMerge(siniflamaYukle(join(KOK, "oz/siniflama/kayit.json")), siniflamaOrtuYukle(KOK));
  assert.equal(taksonomiBlokUygula(kayitMd, taksonomiMd(snf)), kayitMd,
    "kayit.md üretilen bölgesi canlı sınıflamadan ayrışmış");
});

test("④ öğretim ve belge okuma üreticileri deterministtir (ikinci koşu birebir)", () => {
  const snf = siniflamaOrtuMerge(siniflamaYukle(join(KOK, "oz/siniflama/kayit.json")), siniflamaOrtuYukle(KOK));
  for (const dil of ["tr", "en"] as const) {
    assert.equal(ogretKarti(snf, dil), ogretKarti(snf, dil), `ogret kartı (${dil}) iki koşuda ayrıştı`);
  }
  const kaynak = readFileSync(join(KOK, "ogreti/felsefe/prizma.sar"), "utf8");
  assert.equal(belgeMd(kaynak), belgeMd(kaynak), "belge okuma yüzü iki koşuda ayrıştı");
});

test("bağlantı nöbeti: yüz, rehber ve indeks bağlantıları çözülür; ölü KARARLAR hedefi sıfırdır", () => {
  const yuzler = [
    ...BELGE_YUZU_HEDEFLERI.map((h) => h.yol),
    "LICENSE.md", "urun/eklenti/LICENSE.md",
    "ogreti/felsefe/ai-drift-kalkani.md", "ogreti/felsefe/fel-4-makine-hakem.md", "ogreti/felsefe/katman-haritasi.md",
    "ogreti/felsefe/klasor-mimarisi.md", "ogreti/felsefe/neden-dil-bagimsiz.md", "ogreti/felsefe/prizma-dort-yuz.md",
    "ogreti/bilgi/sozluk/flutter/dizin.md", "ogreti/bilgi/tasarim_sozlugu/dizin.md",
  ];
  const kirik: string[] = [];
  let toplam = 0;
  for (const yuz of yuzler) {
    const tamYol = join(KOK, yuz);
    assert.ok(existsSync(tamYol), `${yuz} yüzü diskte olmalı`);
    const icerik = readFileSync(tamYol, "utf8");
    assert.ok(!/\]\([^)]*KARARLAR\.md/.test(icerik), `${yuz} emekli KARARLAR defterine bağlanıyor`);
    for (const es of icerik.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
      const ham = es[1];
      if (/^(https?:|mailto:|#)/.test(ham)) continue;
      toplam++;
      const hedefYolu = ham.split("#")[0];
      if (hedefYolu && !existsSync(resolve(dirname(tamYol), decodeURI(hedefYolu)))) kirik.push(`${yuz} → ${ham}`);
    }
  }
  assert.deepEqual(kirik, [], "kanonik hedefe çözülmeyen bağlantılar var");
  // KÜRASYON (GOC-A08 · 2026-08-25): açık depoda terfi devir kaydı yüzü ve atölyeye özgü bağlantılar
  // düştüğü için taranan küme atölyedeki yetmişten altmış altıya indi; eşik ölçülen kümeye göre kondu.
  assert.ok(toplam >= 60, `bağlantı taraması anlamlı küme görmeli (ölçülen: ${toplam})`);
});

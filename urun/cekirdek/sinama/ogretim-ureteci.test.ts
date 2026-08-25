// ═══════════════════════════════════════════════════════════════════════════
// ogretim-ureteci.test.ts — 🎓 KOD-SNM-OGRETIM-URET (KYN-OGR-A01)
//
//   Öğretim üretecinin (arac/ogretim-uret.ts) üç sözleşmesi burada kanıtlanır.
//   ① ÜRETİM — üreteç kanonik sınıflama kaydındaki her aile için bir kart
//      yazar; kartta ailenin adı, kapsadığı tipler, her tipin zorunlu alanları
//      ve izinli sarma ilişkileri bulunur.
//   ② İDEMPOTENS — iki koşu birebir aynı çıktıyı verir; ikinci koşu tek bayt
//      bile değiştirmez, çünkü bayat çıktıyı yakalayan nöbetler ancak
//      deterministik bir üreteçle anlamlıdır.
//   ③ SINIR — elle yazılan anlatı bölgesi korunur ve üreteç işaretli sınırın
//      dışına çıkmaz; üretilen bölgeye elle dokunan bayt ise ilk koşuda onarılır.
//   Ek nöbet: canlı kartlar motorun kendi öğretim tanılarından temiz geçer,
//      yani künye kaynağını gösterir, mühür kaynağın bugünkü içeriğiyle uyuşur
//      ve hiçbir bağlayıcı cümle üretim bölgesinin dışına taşmaz.
//
//   SINIR — bu süit canlı çalışma ağacına YAZMAZ; bütün mutasyonlar geçici
//   sandbox kopyasında koşar (mutasyon kanıtı deseni).
// ═══════════════════════════════════════════════════════════════════════════
import test from "node:test";
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ANLATI_BAS, ANLATI_SON, ISKELET_BAS, ISKELET_SON, KUNYE_BAS, KUNYE_SON,
  OGRETIM_RAFI, aileTipleri, aileler, icerikMuhru, ogretimKartlariniUret,
} from "../../arac/ogretim-uret.ts";
import { siniflamaOrtuMerge, siniflamaOrtuYukle, siniflamaYukle } from "../src/siniflama.ts";
import { diskTara, ogretimTanilari } from "../src/denetci.ts";
import type { Program } from "../src/sozdizim.ts";

const KOK = fileURLToPath(new URL("../../..", import.meta.url));
const KAYIT = join(KOK, "oz/siniflama/kayit.json");
const SNF = siniflamaOrtuMerge(siniflamaYukle(KAYIT), siniflamaOrtuYukle(KOK));

/** Üretecin okuduğu tek girdiyi (sınıflama kaydı ve örtüsü) geçici köke kopyalar. */
function sandboxKur(): string {
  const sb = mkdtempSync(join(tmpdir(), "sarmal-ogretim-"));
  cpSync(join(KOK, "oz/siniflama"), join(sb, "oz/siniflama"), { recursive: true });
  return sb;
}

/** Bir sandbox rafındaki bütün kart dosyalarını ad→içerik olarak okur. */
function kartlariOku(kok: string): Map<string, string> {
  const raf = join(kok, OGRETIM_RAFI);
  const out = new Map<string, string>();
  if (!existsSync(raf)) return out;
  for (const ad of readdirSync(raf).sort()) out.set(ad, readFileSync(join(raf, ad), "utf8"));
  return out;
}

test("① üreteç kanondaki her aile için kart yazar; kart tipleri, zorunlu alanları ve sarma ilişkilerini taşır", () => {
  const sb = sandboxKur();
  const kosu = ogretimKartlariniUret(sb);
  const beklenen = aileler(SNF);

  assert.equal(kosu.aileSayisi, beklenen.length, "üretilen kart sayısı kanondaki aile sayısına eşit olmalı");
  assert.equal(beklenen.length, 14, "kanon bugün on dört aile taşıyor; sayı değiştiyse kart rafı da tazelenmeli");
  assert.deepEqual(kosu.degisen, beklenen.map((a) => `${OGRETIM_RAFI}/aile_${a}.md`),
    "ilk koşu her aile için bir kart yazmalı");

  for (const aile of beklenen) {
    const metin = readFileSync(join(sb, OGRETIM_RAFI, `aile_${aile}.md`), "utf8");
    for (const isaret of [KUNYE_BAS, KUNYE_SON, ANLATI_BAS, ANLATI_SON, ISKELET_BAS, ISKELET_SON]) {
      assert.ok(metin.includes(isaret), `${aile} kartında "${isaret}" bölge sınırı bulunmalı`);
    }
    assert.ok(metin.includes(`# ${SNF.aileSimgeleri?.[aile] ?? ""} ${aile} ailesi`.replace(/\s+/g, " ")),
      `${aile} kartı ailenin adını başlıkta taşımalı`);
    for (const tip of aileTipleri(SNF, aile)) {
      assert.ok(metin.includes(`| ${tip.ad} |`), `${aile} kartı "${tip.ad}" tipini sarma tablosunda listelemeli`);
      const zorunlu = SNF.semalar?.[tip.ad]?.zorunlu ?? [];
      for (const alan of zorunlu) {
        assert.ok(metin.includes(alan), `${aile} kartı "${tip.ad}" tipinin zorunlu "${alan}" alanını göstermeli`);
      }
      for (const cocuk of SNF.izinliSarma[tip.ad] ?? []) {
        assert.ok(metin.includes(cocuk), `${aile} kartı "${tip.ad}" tipinin sardığı "${cocuk}" tipini göstermeli`);
      }
    }
  }
});

test("② idempotens: ikinci koşu tek bayt değiştirmez ve iki koşunun çıktısı birebirdir", () => {
  const sb = sandboxKur();
  ogretimKartlariniUret(sb);
  const ilk = kartlariOku(sb);
  const ikinciKosu = ogretimKartlariniUret(sb);

  assert.deepEqual(ikinciKosu.degisen, [], "ikinci koşu değişiklik bildirdi — idempotens drifti");
  assert.equal(ikinciKosu.degismeyen.length, ilk.size, "ikinci koşu bütün kartları değişmemiş saymalı");
  assert.deepEqual([...kartlariOku(sb)], [...ilk], "iki koşunun çıktısı birebir aynı olmalı");

  // Bağımsız iki temiz kökte üretim de aynı sonucu vermeli: üretecin çıktısı
  // yalnız kanondan doğar, koşum sırasından ya da dosya sistemi durumundan değil.
  const digerKok = sandboxKur();
  ogretimKartlariniUret(digerKok);
  assert.deepEqual([...kartlariOku(digerKok)], [...ilk], "iki ayrı temiz kökte üretim ayrıştı — üreteç deterministik değil");
});

test("③ sınır: elle yazılan anlatı korunur, üretilen bölge onarılır, bölge dışındaki metne dokunulmaz", () => {
  const sb = sandboxKur();
  ogretimKartlariniUret(sb);
  const kartYolu = join(sb, OGRETIM_RAFI, "aile_plan.md");
  const temiz = readFileSync(kartYolu, "utf8");

  const anlati = [ANLATI_BAS, "## Anlatı", "", "Bu paragraf insan elinden çıkmıştır ve üreteç ona dokunamaz.", ANLATI_SON].join("\n");
  const elleYazilmis = temiz
    .slice(0, temiz.indexOf(ANLATI_BAS)) + anlati + temiz.slice(temiz.indexOf(ANLATI_SON) + ANLATI_SON.length)
    + "\n\n<!-- bölgelerin dışında yaşayan elle yazılmış dipnot -->\n";
  // Üretilen bölgeye de elle dokunulur: bu bayt ilk koşuda onarılmalıdır.
  const bozulmus = elleYazilmis.replace("## İskelet — sınıflama kaydından üretilir", "## İskelet — ELLE BOZULDU");
  writeFileSync(kartYolu, bozulmus, "utf8");

  const kosu = ogretimKartlariniUret(sb);
  assert.deepEqual(kosu.degisen, [`${OGRETIM_RAFI}/aile_plan.md`],
    "üretilen bölgeye elle dokunan bayt ilk koşuda yakalanmalı, başka kart değişmemeli");

  const sonuc = readFileSync(kartYolu, "utf8");
  assert.ok(sonuc.includes("Bu paragraf insan elinden çıkmıştır ve üreteç ona dokunamaz."),
    "elle yazılan anlatı bölgesi korunmadı — üreteç sınırın dışına çıktı");
  assert.ok(sonuc.includes("<!-- bölgelerin dışında yaşayan elle yazılmış dipnot -->"),
    "bölgelerin dışında kalan elle yazılmış metin korunmadı");
  assert.ok(!sonuc.includes("ELLE BOZULDU"), "üretilen bölgedeki elle değişiklik onarılmadı");
  assert.ok(sonuc.includes("## İskelet — sınıflama kaydından üretilir"), "üretilen bölge kanonik metnine dönmedi");
  assert.deepEqual(ogretimKartlariniUret(sb).degisen, [], "onarım sonrası koşu sıfır fark vermeli");
});

test("③ üreteç işaretsiz bir dosyaya kendiliğinden bölge açmaz", () => {
  const sb = sandboxKur();
  mkdirSync(join(sb, OGRETIM_RAFI), { recursive: true });
  const kartYolu = join(sb, OGRETIM_RAFI, "aile_plan.md");
  const isaretsiz = "# Bu dosya elle yazılmıştır ve hiçbir üretim bölgesi taşımaz.\n";
  writeFileSync(kartYolu, isaretsiz, "utf8");

  ogretimKartlariniUret(sb);
  assert.equal(readFileSync(kartYolu, "utf8"), isaretsiz,
    "işaretli sınırı olmayan dosyaya üreteç içerik enjekte etti — sınır sözleşmesi bozuldu");
});

test("nöbet: canlı kartlar motorun öğretim tanılarından temiz geçer (künye · mühür · bölge sözleşmesi)", () => {
  const raf = join(KOK, OGRETIM_RAFI);
  assert.ok(existsSync(raf), "öğretim rafı canlı ağaçta bulunmalı — üreteç bir kez koşturulmalıdır");

  const sb = sandboxKur();
  cpSync(raf, join(sb, OGRETIM_RAFI), { recursive: true });
  const bos = new Map<string, Program>();
  const bulgular = ogretimTanilari(bos, SNF, diskTara(sb), sb)
    .filter((b) => b.dosya.startsWith(`${OGRETIM_RAFI}/`));
  assert.deepEqual(bulgular.map((b) => `${b.dosya}: ${b.tani.kod}`), [],
    "canlı öğretim kartları motorun öğretim nöbetinden temiz geçmeli");

  // Kırmızı fikstür: kaynak ilerleyip kart tazelenmezse bayat nöbeti yakalamalı.
  const kayit = join(sb, "oz/siniflama/kayit.json");
  const ham = readFileSync(kayit, "utf8");
  assert.notEqual(icerikMuhru(ham), icerikMuhru(ham + " "), "mühür fonksiyonu içerik farkına duyarsız");
  writeFileSync(kayit, ham + " ", "utf8");
  const bayat = ogretimTanilari(bos, SNF, diskTara(sb), sb)
    .filter((b) => b.dosya.startsWith(`${OGRETIM_RAFI}/`) && b.tani.kod === "öğretim-bayat");
  assert.ok(bayat.length > 0, "kaynak ilerledi ama bayat öğretim nöbeti kırmızı yakalamadı");
});

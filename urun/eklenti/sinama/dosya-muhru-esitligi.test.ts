// ═══════════════════════════════════════════════════════════════════════════
// dosya-muhru-esitligi.test.ts — 📛 KPS-MHR-A01 · Panel ile Motorun AYNI Sayımı (MIM-3.4 · YUZ-3.1)
//
//   Dosya mühürleri iki gövdede birden uygulanır: motor mühürlü dosyayı disk
//   anlık görüntüsünde ayırır ve bulgularını giriş dosyasına yazar; eklenti ise
//   tarama evrenini `sarKapsamDisi` ile süzer ve motorun akışını panel
//   üreticileriyle yayımlar. İki gövde aynı olguda farklı sayı söylerse kullanıcı
//   çelişkili iki tablo görür ve bu YUZ-3.1 ihlalidir. Bu nöbet eklentinin GERÇEK
//   tur hattını (tarama süzgeci → köken süzgeci → dosya başına yayın → üç yüzeye
//   dağıtım) motorun sayımıyla karşılaştırır.
//
//   Mutasyon kanıtı (2026-09-11 koşusu): `sarKapsamDisi` içindeki mühür dalı
//   söküldüğünde Adım evreni sınaması düştü (panel mühürlü üç dosyanın Adımını
//   saydı); bekçinin bulguları giriş dosyası yerine mühürlü dosyanın kendisine
//   yazıldığında yüzey sayımı sınaması düştü (panel hiçbirini yayımlayamadı).
//
//   Mutasyon kanıtı (EKL-F6-A10 · 2026-09-15 koşusu; her mutasyon yedekten bayt
//   özdeş geri alındı ve sınama yeşile döndü): motor bulgudan `hedefDosya`
//   alanını söktüğünde tıklama sınaması düştü; görünüm çekirdeği alanı yok
//   saydığında yalnız tıklama sınaması düştü; mutlak yol deseni başlangıcına
//   bakmayan eski hâline döndürüldüğünde tıklama ve etiket sınamalarının ikisi
//   birden düştü, çünkü etiket yeniden `is@SONRA@_…` basmaya başladı.
//
//   Mutasyon kanıtı (MGZ-A06 · 2026-10-10 koşusu; her mutasyon yedekten geri
//   alındı): motor geçersiz ad ya da beyansız klasör bulgusundan `hedefDosya`
//   alanını söktüğünde ve hedef çözücüsü klasör hedefini dosya saydığında
//   Problems hedefi sınaması düştü.
// ═══════════════════════════════════════════════════════════════════════════

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { dogusYaz } from "../../cekirdek/src/dogus.ts";
import { denetimKos } from "../../cekirdek/src/denetim.ts";
import { programlariYukle, anadizinBul } from "../../cekirdek/src/denetci.ts";
import { dagKur, karneOzeti } from "../../cekirdek/src/dag.ts";
import { panelCaprazUreticiKumesi } from "../../cekirdek/src/kapi-kapsami.ts";
import { belirtecle } from "../../cekirdek/src/belirtec.ts";
import { ayristir } from "../../cekirdek/src/ayristirici.ts";
import type { Dugum } from "../../cekirdek/src/sozdizim.ts";
import type { Tani } from "../../cekirdek/src/tani.ts";
import { sarKapsamDisi, DISLANAN_ADLAR } from "../src/izleyici-cekirdek.ts";
import { yuzeyeAyir, kayitGorunumu, kayitHedefi, taniHedefi, type YuzeyKaydi } from "../src/yuzey-cekirdek.ts";
import { yolusuzlastir, hedefBaglantiMetni } from "../src/yuzey-metinleri.ts";

const SNF_YOL = fileURLToPath(new URL("../../../oz/siniflama/kayit.json", import.meta.url));
const BUGUN = "2026-09-11";

function yaz(kok: string, yol: string, metin: string): void {
  mkdirSync(dirname(join(kok, yol)), { recursive: true });
  writeFileSync(join(kok, yol), metin, "utf8");
}

/** Eklentinin tur taramasının disk ikizi: gizli ve dışlanan adlı dizinler atlanır. */
function sarlariTara(kok: string): string[] {
  const out: string[] = [];
  const dislanan = new Set<string>(DISLANAN_ADLAR);
  const gez = (dizin: string): void => {
    for (const g of readdirSync(dizin, { withFileTypes: true })) {
      if (g.name.startsWith(".") || dislanan.has(g.name)) continue;
      const tam = join(dizin, g.name);
      if (g.isDirectory()) gez(tam);
      else if (g.name.endsWith(".sar")) out.push(relative(kok, tam));
    }
  };
  gez(kok);
  return out.sort();
}

function adimSay(kaynak: string): number {
  let n = 0;
  const gez = (d: Dugum): void => { if (d.tur === "widget" && d.ad === "Adım") n++; d.cocuklar.forEach(gez); };
  ayristir(belirtecle(kaynak)).bildirimler.forEach(gez);
  return n;
}

/** Mühürlü dört dosya ve iki kusurlu ad taşıyan doğuş ağacı. */
function agac(): string {
  const kok = mkdtempSync(join(tmpdir(), "sarmal-muhur-panel-"));
  dogusYaz(kok, "deneme", BUGUN, "proje");
  const adim = (kod: string): string => `Adım( kod: ${kod}, durum: beklemede, ne: "Mühür eşitliği sınaması için yazılmış bir Adım." )\n`;
  yaz(kok, "is/plan/@ARSIV@_eski.sar", adim("ARS-ESKI-A01"));
  yaz(kok, "is/plan/@SONRA@_bekleyen.sar", adim("SNR-BEKLEYEN-A01"));
  yaz(kok, "is/plan/@EGITIM@_ders.sar", adim("EGT-DERS-A01"));
  yaz(kok, "is/plan/Rapor.sar", "// büyük harfli mühürsüz ad\n");
  yaz(kok, "is/plan/@FOO@_x.sar", "// kümede olmayan etiket\n");
  return kok;
}

test("KPS-MHR-A01 · panelin yüzey sayımı motorun tür dökümüyle BİREBİR aynıdır", () => {
  const kok = agac();
  try {
    const sonuc = denetimKos(kok, { snfYol: SNF_YOL, bugun: BUGUN, tamListe: true });
    const panel = panelCaprazUreticiKumesi();
    const harita = new Map<string, Tani[]>();
    for (const rapor of sonuc.akis) {
      const izinli = rapor.tanilar.filter((t) => panel.has(sonuc.koken.get(t) ?? ""));
      if (!izinli.length) continue;
      const mutlak = isAbsolute(rapor.dosya) ? rapor.dosya : join(kok, rapor.dosya);
      harita.set(mutlak, [...(harita.get(mutlak) ?? []), ...izinli]);
    }
    const doclar = sarlariTara(kok).filter((y) => !sarKapsamDisi(y));
    const kayitlar: YuzeyKaydi[] = doclar.flatMap((y) =>
      (harita.get(join(kok, y)) ?? []).map((tani) => ({ proje: { kod: "PRJ-DENEME", ad: "deneme" }, dosya: join(kok, y), tani })));
    const d = yuzeyeAyir(kayitlar);
    const motor = (kod: string): number => sonuc.turDokumu.find((s) => s.kod === kod)?.toplam ?? 0;
    const say = (liste: readonly YuzeyKaydi[], kod: string): number => liste.filter((k) => k.tani.kod === kod).length;
    // Ölçüm boş bir eşitlik değildir: üç tanı da gerçekten doğmuştur.
    assert.deepEqual([motor("dosya-mührü"), motor("sonraya-bırakılmış-dosya"), motor("geçersiz-dosya-adı")], [2, 1, 2]);
    assert.equal(say(d.bildirimler, "dosya-mührü"), motor("dosya-mührü"), "Gözlemler hanesi motordan farklı sayıyor");
    assert.equal(say(d.hatırlatıcılar, "sonraya-bırakılmış-dosya"), motor("sonraya-bırakılmış-dosya"), "Hatırlatıcılar hanesi motordan farklı sayıyor");
    assert.equal(say(d.problems, "geçersiz-dosya-adı"), motor("geçersiz-dosya-adı"), "Problems motordan farklı sayıyor");
  } finally { rmSync(kok, { recursive: true, force: true }); }
});

test("KPS-MHR-A01 · panelin Adım evreni motorun karnesiyle BİREBİR aynıdır", () => {
  const kok = agac();
  try {
    const doclar = sarlariTara(kok).filter((y) => !sarKapsamDisi(y));
    assert.ok(!doclar.some((y) => /@(ARSIV|SONRA|EGITIM)@_/.test(y)), `mühürlü dosya panel evrenine girdi: ${doclar.join(" · ")}`);
    assert.ok(doclar.includes("is/plan/@FOO@_x.sar") && doclar.includes("is/plan/Rapor.sar"), "geçersiz adlı canlı dosya panelden düştü");
    const panelAdim = doclar.reduce((n, y) => n + adimSay(readFileSync(join(kok, y), "utf8")), 0);
    const karne = karneOzeti(dagKur(programlariYukle(kok).programlar));
    assert.equal(panelAdim, karne.adim, "panel ile motor farklı Adım evreni sayıyor");
  } finally { rmSync(kok, { recursive: true, force: true }); }
});

// ── EKL-F6-A10 · mühür bulgusunun tıklaması ve etiketi ─────────────────────
//
//   Founder 2026-09-12 tarihinde Hatırlatıcılar yüzeyinde sonra mühürlü bir
//   bulguya tıkladığında anadizinin açıldığını ve komut satırında
//   `is/plan/blok/@SONRA@_prf_isci.sar` yazan yolun yüzeyde `is@SONRA@_prf_isci.sar`
//   göründüğünü gösterdi. İki kusur ayrı ölçülür: tıklama hedefi ve etiketteki yol.
//   Gözlemler yüzeyindeki arşiv ve eğitim mührü bulguları aynı görünüm işlevinden
//   geçtiği için aynı sınamada ölçülür.

test("EKL-F6-A10 · mühür bulgusuna tıklama mühürlü dosyayı açar ve etiketteki yol komut satırındaki yoldur", () => {
  const kok = agac();
  try {
    const sonuc = denetimKos(kok, { snfYol: SNF_YOL, bugun: BUGUN, tamListe: true });
    const giris = anadizinBul(kok)!;
    const kayitlar: YuzeyKaydi[] = sonuc.akis.flatMap((rapor) => rapor.tanilar
      .filter((t) => t.kod === "dosya-mührü" || t.kod === "sonraya-bırakılmış-dosya")
      .map((tani) => ({
        proje: { kod: "PRJ-DENEME", ad: "deneme" },
        dosya: isAbsolute(rapor.dosya) ? rapor.dosya : join(kok, rapor.dosya),
        tani,
      })));
    // Komut satırı tanının mesajını olduğu gibi basar; yol o cümlenin tırnağındadır.
    const yollar = kayitlar.map((k) => /"([^"]+)"/.exec(k.tani.mesaj)?.[1] ?? "");
    assert.deepEqual([...yollar].sort(),
      ["is/plan/@ARSIV@_eski.sar", "is/plan/@EGITIM@_ders.sar", "is/plan/@SONRA@_bekleyen.sar"]);
    const d = yuzeyeAyir(kayitlar);
    assert.equal(d.hatırlatıcılar.length, 1, "sonra mühürlü bulgu Hatırlatıcılar yüzeyine düşmedi");
    assert.equal(d.bildirimler.length, 2, "arşiv ve eğitim mührü Gözlemler yüzeyine düşmedi");
    kayitlar.forEach((k, i) => {
      const g = kayitGorunumu(k);
      assert.equal(k.dosya, giris, `${k.tani.kod}: kayıt giriş dosyasında kalmalı, sayım değişmemeli`);
      assert.equal(g.dosya, join(kok, yollar[i]), `${k.tani.kod}: tıklama mühürlü dosyayı değil ${g.dosya} dosyasını açıyor`);
      assert.equal(g.satir, 1, `${k.tani.kod}: tıklama dosyanın başına gitmeli`);
      assert.ok(g.kodluEtiket.includes(`"${yollar[i]}"`),
        `${k.tani.kod}: yüzeydeki yol komut satırındakinden farklı: ${g.kodluEtiket}`);
      assert.ok(g.ipucu.includes(yollar[i]), `${k.tani.kod}: ipucu mühürlü dosyanın yolunu söylemiyor`);
    });
  } finally { rmSync(kok, { recursive: true, force: true }); }
});

test("EKL-F6-A10 · etiket mutlak yolu dosya adına indirir, göreli yola dokunmaz", () => {
  assert.equal(yolusuzlastir(`"is/plan/blok/@SONRA@_prf_isci.sar" dosyası`), `"is/plan/blok/@SONRA@_prf_isci.sar" dosyası`);
  assert.equal(yolusuzlastir("urun/eklenti/src/takdir.ts dosyası"), "urun/eklenti/src/takdir.ts dosyası");
  assert.equal(yolusuzlastir(`"/Users/ad/proje/is/plan/a.sar" dosyası`), `"a.sar" dosyası`);
  assert.equal(yolusuzlastir("kaynak: /Users/ad/proje/b.sar okunamadı"), "kaynak: b.sar okunamadı");
  assert.equal(yolusuzlastir("(C:/Users/ad/c.sar)"), "(c.sar)");
});

// ── MGZ-A06 · geçersiz ad ile beyansız klasör bulgusunun hedefi ────────────
//
//   İki bulgu hata ya da uyarı düzeyinde konuştuğu için Problems yüzeyine düşer
//   ve giriş dosyasının ilk satırına bağlanır; Problems satırının kendisi kaydın
//   dosyasını açar ve kayıt orada sayılmaya devam eder. Eklenti bu yüzden
//   bulgunun anlattığı yeri satıra ilgili konum olarak ekler: kullanıcı o konuma
//   tıklayınca adı kusurlu dosya ya da ilansız klasör açılır. Hedef tek işlevden
//   çözülür (`taniHedefi`) ve panel tıklaması da aynı işlevden okur.
test("MGZ-A06 · geçersiz ad ve beyansız klasör bulgusu Problems yüzeyinde anlattığı yeri hedef gösterir", () => {
  const kok = agac();
  try {
    mkdirSync(join(kok, "sablon"));
    const sonuc = denetimKos(kok, { snfYol: SNF_YOL, bugun: BUGUN, tamListe: true });
    const giris = anadizinBul(kok)!;
    const kayitlar: YuzeyKaydi[] = sonuc.akis.flatMap((rapor) => rapor.tanilar
      .filter((t) => t.kod === "geçersiz-dosya-adı" || t.kod === "beyansız-yapı")
      .map((tani) => ({
        proje: { kod: "PRJ-DENEME", ad: "deneme" },
        dosya: isAbsolute(rapor.dosya) ? rapor.dosya : join(kok, rapor.dosya),
        tani,
      })));
    const d = yuzeyeAyir(kayitlar);
    assert.equal(d.problems.length, 3, "iki geçersiz ad ile bir beyansız klasör Problems yüzeyine düşmeli");
    const beklenen = new Map<string, boolean>([["is/plan/@FOO@_x.sar", false], ["is/plan/Rapor.sar", false], ["sablon/", true]]);
    assert.deepEqual(d.problems.map((k) => k.tani.hedefDosya).sort(), [...beklenen.keys()].sort(),
      "bulgu anlattığı dosyayı ya da klasörü taşımıyor");
    for (const k of d.problems) {
      const goreli = k.tani.hedefDosya!;
      const hedef = taniHedefi(k.dosya, k.tani);
      assert.equal(k.dosya, giris, `${k.tani.kod}: kayıt giriş dosyasında kalmalı, sayım değişmemeli`);
      assert.deepEqual(hedef, { dosya: join(kok, goreli), satir: 1, sutun: 1, klasor: beklenen.get(goreli) },
        `${k.tani.kod}: Problems kaydının ilgili konumu anlattığı yeri göstermiyor`);
      assert.equal(kayitHedefi(k).dosya, hedef?.dosya, `${k.tani.kod}: panel tıklaması ile Problems hedefi ayrışıyor`);
      assert.equal(hedefBaglantiMetni(goreli, beklenen.get(goreli)!),
        `Bulgunun anlattığı ${beklenen.get(goreli) ? "klasör" : "dosya"}: ${goreli}`);
    }
    // Hedef taşımayan kayıt ilgili konum almaz; satırı eskisi gibi kendi konumuna gider.
    assert.equal(taniHedefi(giris, { ...d.problems[0].tani, hedefDosya: undefined }), undefined);
  } finally { rmSync(kok, { recursive: true, force: true }); }
});

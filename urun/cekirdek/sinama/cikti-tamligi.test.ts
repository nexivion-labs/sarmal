// ═══════════════════════════════════════════════════════════════════════════
// cikti-tamligi.test.ts — 🚰 Makine yüzünün BORUYA eksiksiz teslim edilmesi nöbeti
//   (HTR-YANSIT-JSON-BORUDA-KIRPILIYOR · ölçülmüş kusur · 2026-08-31)
//
//   ÖLÇÜLMÜŞ KUSUR. POSIX'te `process.stdout` bir boruya bağlıyken yazma
//   asenkrondur: tek bir büyük `write()` çağrısında çekirdek boru tamponunun
//   aldığı kadarı (65.536 bayt) eşzamanlı gider, geri kalanı kullanıcı alanı
//   kuyruğuna girer. CLI dağıtıcısı çıktısını bastıktan hemen sonra
//   `process.exit()` çağırdığı için kuyrukta bekleyen bayt sessizce kaybolur:
//   `yansıt <büyük>.sar --json | wc -c` tam 65.536 bayt (geçersiz JSON) verirken
//   aynı çağrı dosyaya yönlendirilince 212.389 bayt (geçerli JSON) veriyordu.
//   Hiçbir hata basılmıyor ve çıkış kodu sıfır kalıyordu; yani kırpılmanın izi
//   çıktının üstünde görünmüyor ve ona güvenen ajan sebebi kendi kodunda arıyordu.
//
//   NÖBETİN NEDEN BÖYLE KURULDUĞU. Kusur ancak çıktı çekirdek boru tamponunu
//   AŞTIĞINDA görünür; küçük fikstürle koşan bir sınama onu asla yakalayamaz.
//   Bu yüzden nöbet kendi büyük fikstürünü ÜRETİR (deponun plan dosyalarına
//   bağlanmaz — onlar küçülürse nöbet dişsiz kalırdı) ve her yüz için önce
//   "fikstür gerçekten büyük mü" sorusunu ölçer. Tüketim de gerçek borudur:
//   `execFileSync` çocuk sürecin stdout'una BORU bağlar, yani ajanların ve
//   MCP alt-süreç köprüsünün kullandığı yolun ta kendisidir. Karşılaştırma
//   ölçütü `--yaz` ile üretilen DOSYA çıktısıdır, çünkü dosyaya yazma POSIX'te
//   zaten eşzamanlıdır ve bu yol kusurdan hiçbir zaman etkilenmemiştir; iki
//   yolun bayt bayt eşitliği hem tamlığı hem de içeriğin değişmediğini ölçer.
// ═══════════════════════════════════════════════════════════════════════════

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SARMAL = fileURLToPath(new URL("../src/sarmal.ts", import.meta.url));

/** POSIX çekirdek boru tamponu: kırpılmanın gerçekleştiği tam sınır. Fikstür
 *  bu sınırın altında kalırsa nöbet kusuru gösteremez, bu yüzden ölçülür. */
const BORU_TAMPONU = 65_536;

/** Boru tamponunu kesin aşan, söz-dizim-geçerli bir Blok üretir. Metinler
 *  bilerek uzundur; amaç düğüm sayısını değil BAYT sayısını yükseltmektir. */
function buyukKaynak(adimSayisi: number): string {
  const satirlar: string[] = [
    `Blok( kod: BLK-BORU, ne: "boru tamlığı nöbetinin üretilmiş büyük fikstürü" ) {`,
  ];
  for (let i = 1; i <= adimSayisi; i++) {
    const kod = `ADM-BORU-${String(i).padStart(4, "0")}`;
    satirlar.push(
      `  Adım( kod: ${kod}, ne: "kırpılma nöbeti için üretilmiş ${i}. Adım — bu niyet metni çıktıyı çekirdek boru tamponunun üstüne çıkarmak için bilerek uzun tutulmuştur" ) {`,
      `    durum: bekliyor`,
      `    kabul: "çıktının boruya eksiksiz teslim edildiği bayt sayısıyla ölçülür"`,
      `  }`,
    );
  }
  satirlar.push("}");
  return satirlar.join("\n");
}

const dizin = mkdtempSync(join(tmpdir(), "sarmal-boru-"));
const FIKSTUR = join(dizin, "buyuk.sar");
writeFileSync(FIKSTUR, buyukKaynak(600), "utf8");

/** Komutu GERÇEK alt süreç olarak, stdout'u BORUYA bağlı koşturur. */
function boruylaKos(...argumanlar: string[]): Buffer {
  return execFileSync(process.execPath, [SARMAL, ...argumanlar], {
    encoding: "buffer",
    maxBuffer: 64 * 1024 * 1024,
  });
}

/** Aynı komutu `--yaz <hedef>` ile DOSYAYA yazdırır ve dosyayı okur; bu yol
 *  eşzamanlıdır ve kusurdan etkilenmez, dolayısıyla doğruluk ölçütüdür. */
function dosyayaKos(uzanti: string, ...argumanlar: string[]): Buffer {
  const hedef = join(dizin, `olcut-${argumanlar.join("_").replace(/[^\wçğıöşü-]/gi, "")}.${uzanti}`);
  execFileSync(process.execPath, [SARMAL, ...argumanlar, "--yaz", hedef], { encoding: "buffer" });
  return readFileSync(hedef);
}

/** Tek bir yüz için üç ölçüm: fikstür yeterince büyük mü, boru çıktısı dosya
 *  çıktısıyla bayt bayt aynı mı, ve kırpılma imzası (tampon katı) var mı.
 *
 *  `satirSonu` payı, `console.log` ile basan komutlar içindir: `console.log`
 *  metnin sonuna bir satır sonu ekler, `--yaz` ise ham metni yazar. Bu bir
 *  bayt bugünkü davranıştır ve onarımın konusu değildir; ölçüt buna göre
 *  düzeltilir ki nöbet gerçek kırpılmayı ölçsün, bilinen bir farkı değil. */
function yuzuOlc(etiket: string, uzanti: string, satirSonu: boolean, ...argumanlar: string[]): Buffer {
  const ham = dosyayaKos(uzanti, ...argumanlar);
  const dosya = satirSonu ? Buffer.concat([ham, Buffer.from("\n", "utf8")]) : ham;
  assert.ok(
    dosya.length > BORU_TAMPONU,
    `${etiket}: fikstür boru tamponunu aşmıyor (${dosya.length} ≤ ${BORU_TAMPONU}) — bu hâliyle nöbet kusuru gösteremez, fikstür büyütülmeli.`,
  );
  const boru = boruylaKos(...argumanlar);
  assert.notEqual(
    boru.length % BORU_TAMPONU,
    0,
    `${etiket}: boru çıktısı tam ${boru.length} bayt, yani çekirdek boru tamponunun tam katı — bu kırpılmanın imzasıdır (beklenen ${dosya.length} bayt).`,
  );
  assert.equal(
    boru.length,
    dosya.length,
    `${etiket}: boru çıktısı ${boru.length} bayt, dosya çıktısı ${dosya.length} bayt — süreç tamponu boşalmadan kapanmış, çıktı sessizce kırpılmış.`,
  );
  assert.ok(boru.equals(dosya), `${etiket}: boru ve dosya çıktıları aynı uzunlukta ama içerikleri ayrışıyor.`);
  return boru;
}

test("yansıt --json: 64 KiB'ı aşan makine yüzü boruya eksiksiz gider", () => {
  const boru = yuzuOlc("yansıt --json", "json", false, "yansıt", FIKSTUR, "--json");
  const agac = JSON.parse(boru.toString("utf8")) as { kod?: string; çocuklar?: unknown[] };
  assert.equal(agac.kod, "BLK-BORU");
  assert.equal(agac.çocuklar?.length, 600, "kırpılmamış JSON altı yüz Adımın hepsini taşımalı.");
});

test("yansıt --yaml: 64 KiB'ı aşan config yüzü boruya eksiksiz gider", () => {
  const boru = yuzuOlc("yansıt --yaml", "yaml", false, "yansıt", FIKSTUR, "--yaml");
  assert.match(boru.toString("utf8"), /ADM-BORU-0600/, "son Adım kırpılmış.");
});

test("yansıt --xml: 64 KiB'ı aşan ajan yüzü boruya eksiksiz gider", () => {
  const boru = yuzuOlc("yansıt --xml", "xml", false, "yansıt", FIKSTUR, "--xml");
  assert.match(boru.toString("utf8"), /<\/Blok>\s*$/, "XML kök etiketi kapanmamış — çıktı kırpılmış.");
});

test("belge: 64 KiB'ı aşan insan yüzü de boruya eksiksiz gider (console.log yolu)", () => {
  // `yansıt` process.stdout.write ile, `belge` console.log ile basar; kusur
  // ikisinde de yaşadığı için nöbet iki yazma yolunu da ayrı ayrı ölçer.
  const boru = yuzuOlc("belge", "md", true, "belge", FIKSTUR);
  assert.match(boru.toString("utf8"), /ADM-BORU-0600/, "son Adım kırpılmış.");
});

test("çıktı tamlığı içeriği değiştirmez: boru ve dosya sağlaması birebir aynı", () => {
  // Onarım yalnız TESLİMİ düzeltir; komutun ürettiği bayt dizisi aynı kalır.
  // `yuzuOlc` bunu her yüzde ölçer; bu sınama küçük bir dosyada da tutuyor mu
  // diye bakar, çünkü küçük çıktı kusurdan hiç etkilenmiyordu ve onarımın onu
  // bozmadığı ayrıca gösterilmelidir (gerileme bekçisi).
  const kucuk = join(dizin, "kucuk.sar");
  writeFileSync(kucuk, `Blok( kod: BLK-KUCUK, ne: "tek Adımlık fikstür" ) {\n  Adım( kod: ADM-K1, ne: "tek" )\n}`, "utf8");
  const boru = boruylaKos("yansıt", kucuk, "--json");
  const hedef = join(dizin, "kucuk.json");
  execFileSync(process.execPath, [SARMAL, "yansıt", kucuk, "--json", "--yaz", hedef], { encoding: "buffer" });
  assert.ok(boru.equals(readFileSync(hedef)), "küçük çıktıda boru ile dosya ayrıştı — onarım içeriği bozmuş.");
  assert.ok(boru.length < BORU_TAMPONU, "küçük fikstür beklenenden büyük — bu sınamanın anlamı kalmadı.");
});

test.after(() => rmSync(dizin, { recursive: true, force: true }));

// ═══════════════════════════════════════════════════════════════════════════
// mcp-taze-kaynak.test.ts — 🔄 BKM-MCP-A02 · süreç bayatlığının kapanışı
//
//   Ölçülen kusur (2026-08-08): MCP sunucusu şemayı süreç başında belleğe alıyor
//   ve kaynak dosya değişince kendini tazelemiyordu; sınıflama kaydı diskte
//   değiştiği hâlde çalışan sunucu eski şemayı bildirmeye devam ediyordu.
//   Tehlike sessizliğindeydi: soran ajan yanlış şemayı doğru sanıyordu.
//
//   Bu süit iki şeyi ölçer. Birincisi mekanizmanın kendisidir (`tazeKaynak`):
//   mühür değişince yeniden yükler, değişmeyince yüklemez. İkincisi UÇTAN UCA
//   kanıttır: canlı bir sunucu süreci altında kaynak değiştirilir ve BİR SONRAKİ
//   araç çağrısının yeni şemayı döndürdüğü gösterilir.
// ═══════════════════════════════════════════════════════════════════════════
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { tazeKaynak, muhurAl, muhurAyni } from "../src/taze-kaynak.ts";

const MCP = fileURLToPath(new URL("../src/mcp.ts", import.meta.url));
const KAYIT = fileURLToPath(new URL("../../../oz/siniflama/kayit.json", import.meta.url));

test("BKM-MCP-A02: mühür değişince kaynak yeniden yüklenir, değişmeyince YÜKLENMEZ", () => {
  const dizin = mkdtempSync(join(tmpdir(), "taze-"));
  const yol = join(dizin, "veri.json");
  writeFileSync(yol, JSON.stringify({ deger: "birinci" }), "utf8");
  let yuklemeSayisi = 0;
  const kaynak = tazeKaynak(yol, (y) => {
    yuklemeSayisi += 1;
    return JSON.parse(readFileSync(y, "utf8")) as { deger: string };
  });
  assert.equal(yuklemeSayisi, 1, "kurulum bir kez yükler");
  assert.equal(kaynak.deger().deger, "birinci");
  assert.equal(kaynak.deger().deger, "birinci");
  assert.equal(yuklemeSayisi, 1, "DEĞİŞMEYEN kaynakta yeniden yükleme YOKTUR — ek maliyet yalnız statSync");
  assert.equal(kaynak.sonCagridaTazelendi(), false);

  writeFileSync(yol, JSON.stringify({ deger: "ikinci" }), "utf8");
  // Aynı saniye içinde yazıldığında mtime çözünürlüğü yetmeyebilir; boyut da
  // mührün parçasıdır fakat burada eşit uzunlukta olabilir — zamanı ileri al.
  const sonra = new Date(Date.now() + 5000);
  utimesSync(yol, sonra, sonra);
  assert.equal(kaynak.deger().deger, "ikinci", "mühür değişince yeni değer dönmeli");
  assert.equal(kaynak.sonCagridaTazelendi(), true);
  assert.equal(kaynak.tazelemeSayisi(), 1);
});

test("BKM-MCP-A02: bozuk yazımda ESKİ değer korunur (yarım dosyaya düşülmez)", () => {
  const dizin = mkdtempSync(join(tmpdir(), "taze-bozuk-"));
  const yol = join(dizin, "veri.json");
  writeFileSync(yol, JSON.stringify({ deger: "saglam" }), "utf8");
  const kaynak = tazeKaynak(yol, (y) => JSON.parse(readFileSync(y, "utf8")) as { deger: string });
  writeFileSync(yol, "{ yarim", "utf8");
  const sonra = new Date(Date.now() + 5000);
  utimesSync(yol, sonra, sonra);
  assert.equal(kaynak.deger().deger, "saglam", "bozuk kaynağa düşmektense son doğru şema korunur");
  assert.equal(kaynak.sonCagridaTazelendi(), false, "başarısız yükleme tazeleme sayılmaz");
});

test("BKM-MCP-A02: muhurAl okunamayan dosyada tanımsız döner ve karşılaştırma çökmez", () => {
  assert.equal(muhurAl(join(tmpdir(), "boyle-bir-dosya-yok-12345")), undefined);
  assert.equal(muhurAyni(undefined, undefined), true);
  assert.equal(muhurAyni({ mtimeMs: 1, boyut: 2 }, undefined), false);
});

/** UÇTAN UCA: canlı sunucu altında kaynak değişir; SONRAKİ çağrı yeni şemayı verir.
 *  İki araç çağrısı TEK süreçte yapılır — ikisi ayrı süreçte olsaydı nöbet hiçbir
 *  şey ölçmezdi, çünkü yeni süreç zaten taze yüklerdi (sahte yeşil tuzağı). */
test("BKM-MCP-A02 · uçtan uca: çalışan sunucunun altında değişen şema SONRAKİ çağrıda görünür", () => {
  const yedek = readFileSync(KAYIT, "utf8");
  const istekler = [
    { jsonrpc: "2.0", id: 1, method: "initialize", params: {} },
    { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "siniflama", arguments: { tip: "Adım" } } },
    // 3. istek sunucuya DOKUNMAZ; testin kaynağı değiştirmesi için zaman kazandırır.
    { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "siniflama", arguments: { tip: "Adım" } } },
  ];
  // Kaynağı ikinci çağrıdan ÖNCE değiştirmek için sunucuyu iki aşamada besleyemeyiz
  // (execFileSync tek seferde yazar); bunun yerine mutasyonu ÖNCE uygular, sonra
  // iki çağrıyı da koştururuz ve ikisinin de yeni şemayı verdiğini ölçeriz. Asıl
  // hüküm şudur: süreç kaynağı süreç-başı belleğe alsaydı, mutasyon süreç
  // başlatıldıktan sonra yapıldığı için ikinci çağrı da ESKİ şemayı verirdi.
  try {
    const ham = JSON.parse(yedek) as { widgetTipleri: Array<{ ad: string; ne: string }> };
    const adim = ham.widgetTipleri.find((t) => t.ad === "Adım");
    assert.ok(adim, "fikstürün zemini: kanonda Adım tipi bulunmalı");
    const damga = "TAZELEME-NÖBETİ-DAMGASI";
    // Süreci ÖNCE başlat: stdin akışı açıkken kaynağı değiştir.
    const cocuk = execFileSync(process.execPath, ["-e", `
      const { execFileSync } = require("node:child_process");
      const fs = require("node:fs");
      const { spawn } = require("node:child_process");
      const p = spawn(process.execPath, [${JSON.stringify(MCP)}], { stdio: ["pipe", "pipe", "inherit"] });
      let cikti = "";
      p.stdout.on("data", (d) => { cikti += d; });
      p.stdin.write(JSON.stringify(${JSON.stringify(istekler[0])}) + "\\n");
      p.stdin.write(JSON.stringify(${JSON.stringify(istekler[1])}) + "\\n");
      setTimeout(() => {
        const ham = JSON.parse(fs.readFileSync(${JSON.stringify(KAYIT)}, "utf8"));
        ham.widgetTipleri.find((t) => t.ad === "Adım").ne = ${JSON.stringify(damga)};
        fs.writeFileSync(${JSON.stringify(KAYIT)}, JSON.stringify(ham, null, 2), "utf8");
        p.stdin.write(JSON.stringify(${JSON.stringify(istekler[2])}) + "\\n");
        p.stdin.end();
      }, 600);
      p.on("close", () => { process.stdout.write(cikti); });
    `], { encoding: "utf8", timeout: 90_000 });
    const satirlar = cocuk.trim().split("\n").filter((s) => s.startsWith("{"));
    const metinler = satirlar.map((s) => {
      const y = JSON.parse(s) as { result?: { content?: Array<{ text?: string }> } };
      return y.result?.content?.map((c) => c.text).join("\n") ?? "";
    });
    const ikinci = metinler[metinler.length - 1];
    assert.ok(metinler.length >= 2, `iki araç cevabı bekleniyordu, ${metinler.length} geldi`);
    assert.match(ikinci, new RegExp(damga),
      "SÜREÇ BAYATLIĞI: çalışan sunucu, altında değişen kanonu görmedi — ikinci çağrı hâlâ eski şemayı döndürdü");
  } finally {
    writeFileSync(KAYIT, yedek, "utf8");
  }
});

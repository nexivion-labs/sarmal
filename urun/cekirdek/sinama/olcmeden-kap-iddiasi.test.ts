// ═══════════════════════════════════════════════════════════════════════════
// olcmeden-kap-iddiasi.test.ts — 🧭 BKM-DNT-A13 · ölçmeden kap iddiası yasağı
//
//   Kusur sınıfı denetim komutunda V1B-TANI-A01 ile kapatılmıştı fakat BAŞKA
//   yüzeylerde canlı kalmıştı. Bağımsız denetçi 2026-08-09 tarihinde ölçtü:
//   iskelet aracı, hem diskte hiç bulunmayan bir yol hem de bir DOSYA yolu
//   verildiğinde, verilen yolun bir KAP olup olmadığını hiç ölçmeden "içinde
//   giriş dosyası yok" cümlesini basıyordu. Aynı sınıfın ikinci yüzü `--ana`
//   bayrağıdır: var olmayan yolda öneri bayrağı hiç anmıyor, DİZİN verildiğinde
//   ise motor ham bir okuma hatasıyla çöküyordu (2026-09-10 ölçümü).
//
//   Nöbet iki yüzeyi de fikstürle ölçer; iddia ancak ölçüldükten sonra kurulur.
// ═══════════════════════════════════════════════════════════════════════════
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { yolTuru } from "../src/denetci.ts";
import { denetimKos } from "../src/denetim.ts";

const MCP = fileURLToPath(new URL("../src/mcp.ts", import.meta.url));
const SNF_YOL = fileURLToPath(new URL("../../../oz/siniflama/kayit.json", import.meta.url));

function iskelet(dizin: string): string {
  const istekler = [
    { jsonrpc: "2.0", id: 1, method: "initialize", params: {} },
    { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "iskelet", arguments: { dizin } } },
  ].map((x) => JSON.stringify(x)).join("\n") + "\n";
  const ham = execFileSync(process.execPath, [MCP], { input: istekler, encoding: "utf8", timeout: 60_000 });
  const satirlar = ham.trim().split("\n").filter((s) => s.startsWith("{"));
  const y = JSON.parse(satirlar[satirlar.length - 1]) as { result?: { content?: Array<{ text?: string }> } };
  return y.result?.content?.map((c) => c.text).join("\n") ?? "";
}

test("BKM-DNT-A13: yolTuru üç durumu da ölçer (iddianın dayanağı)", () => {
  const d = mkdtempSync(join(tmpdir(), "kap-"));
  const f = join(d, "x.sar");
  writeFileSync(f, "// fikstür\n", "utf8");
  assert.equal(yolTuru(d), "dizin");
  assert.equal(yolTuru(f), "dosya");
  assert.equal(yolTuru(join(d, "yok-boyle")), "yok");
});

test("BKM-DNT-A13: iskelet aracı OLMAYAN yolda kap iddiası kurmaz", () => {
  const yok = join(tmpdir(), "sarmal-kesinlikle-yok-boyle-dizin-98765");
  const cikti = iskelet(yok);
  assert.match(cikti, /diskte bulunamadı/u, "olmayan yol için doğru cümle kurulmalı");
  assert.doesNotMatch(cikti, /içinde giriş dosyası yok/u,
    "var olmayan bir yolun İÇİ olduğunu iddia etmek ölçülmemiş bir kap iddiasıdır");
  assert.doesNotMatch(cikti, /dizininde giriş dosyası yok/u);
});

test("BKM-DNT-A13: iskelet aracı DOSYA yolunda kap iddiası kurmaz ve doğru dizini önerir", () => {
  const d = mkdtempSync(join(tmpdir(), "kap-dosya-"));
  const f = join(d, "fx_anadizin.sar");
  writeFileSync(f, 'Proje( kod: PRJ-FX, ad: "fx", ne: "fikstür" )\n', "utf8");
  const cikti = iskelet(f);
  assert.match(cikti, /bir dosyadır, dizin değildir/u, "dosya yolu için doğru cümle kurulmalı");
  assert.doesNotMatch(cikti, /içinde giriş dosyası yok/u,
    "bir DOSYANIN içinde giriş dosyası aramak ölçülmemiş kap iddiasıdır");
  assert.ok(cikti.includes(d), "öneri, dosyanın bulunduğu DİZİNİ göstermeli");
});

test("BKM-DNT-A13: iskelet aracı gerçek girişsiz DİZİNDE iddiayı kurmaya devam eder (körlük sınavı)", () => {
  const d = mkdtempSync(join(tmpdir(), "kap-bos-"));
  const cikti = iskelet(d);
  assert.match(cikti, /dizininde giriş dosyası yok/u,
    "gerçekten girişsiz bir dizinde cümle iddiayı KURMALI; yoksa nöbet bütün cümleleri boşaltmakla da yeşil kalırdı");
});

/** `--ana` DİZİN aldığında motor ham okuma hatasıyla ÇÖKÜYORDU; artık dürüst tanı döner. */
test("BKM-DNT-A13: --ana bir DİZİN alınca motor çökmez, dürüst tanı döner", () => {
  const proje = mkdtempSync(join(tmpdir(), "ana-dizin-"));
  const baskaDizin = mkdtempSync(join(tmpdir(), "ana-hedef-"));
  const s = denetimKos(proje, { snfYol: SNF_YOL, anaYolu: baskaDizin });
  const tanilar = s.akis.flatMap((r) => r.tanilar);
  assert.equal(tanilar.length, 1, "tek bir dürüst tanı beklenir");
  assert.match(tanilar[0].mesaj, /bir dizindir/u, "cümle ölçülen cinsi söylemeli");
  assert.match(tanilar[0].oneri ?? "", /--ana/u, "öneri kullanıcının fiilen kullandığı bayrağı anmalı");
});

test("BKM-DNT-A13: --ana OLMAYAN yolda öneri bayrağı anar", () => {
  const proje = mkdtempSync(join(tmpdir(), "ana-yok-"));
  const s = denetimKos(proje, { snfYol: SNF_YOL, anaYolu: join(tmpdir(), "yok-boyle-spec-54321.sar") });
  const tanilar = s.akis.flatMap((r) => r.tanilar);
  assert.equal(tanilar.length, 1);
  assert.match(tanilar[0].mesaj, /diskte bulunamadı/u);
  assert.match(tanilar[0].oneri ?? "", /--ana/u,
    "bayrağı anmayan öneri kullanıcıyı kendi komutunun dışına yönlendirir");
});

// ═══════════════════════════════════════════════════════════════════════════
// yurutucu-izi.test.ts — 👣 Yürütücünün işi panelde Adımın altında görünür (HST-MTR-A04)
//
//   Yol haritası paneli koşum izi klasörünü dinler, fakat iz yalnız motorun kendi
//   döngüsü bir model çağırdığında yazılıyordu. MCP sunucusu artık izi açıkken
//   dış bir yürütücünün sef ve durum-guncelle temaslarını aynı klasöre yazar.
//   Bu dosya üç şeyi ölçer:
//   ① UÇTAN UCA: gerçek MCP sunucusu alt süreçte koşar, yazdığı iz yol haritası
//     sağlayıcısına kabuk sahtesiyle verilir ve her satır ilgili Adımın altında
//     belirir.
//   ② DÜRÜST SATIR: yürütücü satırı ham istem ve yanıt vaat etmez, çünkü onlar
//     toplanmaz (Adım sınırı); satıra tıklamak boş bir konuşma kartı açmaz.
//   ③ GERİLEME: motorun kendi koşum satırı eskisi gibi görünür ve konuşmayı açar.
// ═══════════════════════════════════════════════════════════════════════════

import "./dil-kur.ts";
import "./kabuk-kur.ts";
import { Uri, workspace } from "./vscode-sahtesi.ts";
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// Kabuğu içeri alan modül kanca kurulduktan SONRA yüklenir (kabuk-kur.ts).
const { YolHaritasi } = await import("../src/yolharitasi.ts");

const MCP = fileURLToPath(new URL("../../cekirdek/src/mcp.ts", import.meta.url));

// Panelin iz hattı dosyaları editör kabuğundan arar ve okur; sahte kabuk diske bağlanır.
let izDosyalari: string[] = [];
workspace.findFiles = async () => izDosyalari.map((y) => Uri.file(y));
const fs = workspace.fs as { readFile: unknown; stat: unknown };
fs.readFile = async (u: Uri) => new Uint8Array(readFileSync(u.fsPath));
fs.stat = async (u: Uri) => ({ type: 1, size: 0, ctime: 0, mtime: statSync(u.fsPath).mtimeMs });

type Satir = { tur: string; etiket: string; aciklama: string };
type AgacOgesi = { label?: unknown; description?: unknown; tooltip?: unknown; command?: unknown };

/** Panelin bir Adım satırı için çizdiği koşum alt satırları (TreeItem hâlleriyle). */
async function adimAltindakiKosumlar(kod: string, dosya: string): Promise<AgacOgesi[]> {
  const panel = new YolHaritasi();
  await panel.izTazele("sinama");
  const adim = { tur: "oge", tip: "Adım", kod, kabulSayisi: 0, cocuklar: [], dosya: Uri.file(dosya), satir: 1 };
  const cocuklar = panel.getChildren(adim as never) as Satir[];
  return cocuklar.filter((c) => c.tur === "koşum").map((c) => panel.getTreeItem(c as never) as AgacOgesi);
}

const kurulanlar: string[] = [];
after(() => { for (const k of kurulanlar) rmSync(k, { recursive: true, force: true }); });

/** Geçici bir proje: iki Adımlı plan ve anadizin. */
function projeKur(): { kok: string; plan: string } {
  const kok = mkdtempSync(join(tmpdir(), "sarmal-yurutucu-izi-"));
  kurulanlar.push(kok);
  writeFileSync(join(kok, "deneme_anadizin.sar"), 'Proje( kod: PRJ-IZ, ad: "d", ne: "deneme kökü" )\n');
  const plan = join(kok, "plan.sar");
  writeFileSync(plan, [
    'Faz( kod: FZ-IZ, ad: "deneme fazı" ) {',
    '  Adım( kod: ADM-IZ-A, ne: "temel adım", durum: beklemede ) {',
    '    görev: "zemini hazırla"',
    '  }',
    '  Adım( kod: ADM-IZ-B, ne: "bağımlı adım", bağımlı: [ ADM-IZ-A ] )',
    '}',
    "",
  ].join("\n"));
  return { kok, plan };
}

test("① uçtan uca: MCP'nin yazdığı yürütücü izi panelde ilgili Adımın altında görünür", { timeout: 180_000 }, async () => {
  const { kok, plan } = projeKur();
  const istekler = [
    { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "claude-code", version: "2.0.0" } } },
    { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "sef", arguments: { dizin: kok, adim: "ADM-IZ-B" } } },
    { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "durum-guncelle", arguments: { dizin: kok, kod: "ADM-IZ-A", durum: "geliştirmede" } } },
  ].map((x) => JSON.stringify(x)).join("\n") + "\n";
  execFileSync(process.execPath, [MCP], {
    input: istekler, encoding: "utf8", timeout: 120_000, maxBuffer: 32 * 1024 * 1024, cwd: kok,
    env: { ...process.env, SARMAL_DIL: "tr", SARMAL_YURUTUCU_IZI: "1" },
  });
  const klasor = join(kok, ".sarmal", "trace");
  mkdirSync(klasor, { recursive: true });   // iz yazılmadıysa klasör boş kalır ve sınama satır yokluğunu ölçer
  izDosyalari = readdirSync(klasor).map((d) => join(klasor, d));

  const b = await adimAltindakiKosumlar("ADM-IZ-B", plan);
  assert.equal(b.length, 1, "sef teması ADM-IZ-B altında tek satır olarak görünmedi");
  assert.equal(b[0].label, "yürütücü · sef");
  assert.match(String(b[0].description), /claude-code/, "satır yürütücünün adını söylemiyor");

  const a = await adimAltindakiKosumlar("ADM-IZ-A", plan);
  assert.equal(a.length, 1, "durum teması ADM-IZ-A altında tek satır olarak görünmedi");
  assert.equal(a[0].label, "yürütücü · durum-guncelle");
  assert.match(String(a[0].description), /claude-code/);
  assert.match(String(a[0].description), /→ geliştirmede/, "satır yazılan durumu söylemiyor");
});

test("② dürüst satır: yürütücü satırı ham istem vaat etmez ve konuşma kartı açmaz", async () => {
  const { kok, plan } = projeKur();
  const klasor = join(kok, ".sarmal", "trace");
  mkdirSync(klasor, { recursive: true });
  const dosya = join(klasor, "yurutucu-sinama.jsonl");
  writeFileSync(dosya, JSON.stringify({ zaman: "2026-10-10T10:00:00.000Z", adım: "ADM-IZ-B", rol: "yurutucu", arac: "sef" }) + "\n");
  izDosyalari = [dosya];
  const [satir] = await adimAltindakiKosumlar("ADM-IZ-B", plan);
  assert.ok(satir, "yürütücü satırı Adımın altında yok");
  assert.equal(satir.label, "yürütücü · sef");
  assert.equal(satir.command, undefined, "yürütücü satırı toplanmayan konuşmanın kartını açıyor");
  assert.doesNotMatch(String(satir.tooltip), /ham prompt|tam konuşma/u, "ipucu toplanmayan ham istemi vaat ediyor");
  assert.match(String(satir.tooltip), /ham istem ve yanıt toplanmaz/u);
});

test("③ gerileme: motorun kendi koşum satırı eskisi gibi görünür ve konuşmayı açar", async () => {
  const { kok, plan } = projeKur();
  const klasor = join(kok, ".sarmal", "trace");
  mkdirSync(klasor, { recursive: true });
  const dosya = join(klasor, "kosu-sinama.jsonl");
  writeFileSync(dosya, JSON.stringify({
    zaman: "2026-10-10T10:00:00.000Z", adım: "ADM-IZ-A", rol: "üretici", ajanİmza: { kod: "ETM-X", ad: "deneme" },
    model: "demo-stub", hamPrompt: "p", hamYanıt: { durum: "tamam" }, tokenGiriş: 10, tokenÇıkış: 5, sıra: 1,
  }) + "\n");
  izDosyalari = [dosya];
  const [satir] = await adimAltindakiKosumlar("ADM-IZ-A", plan);
  assert.equal(satir?.label, "üretici · ETM-X");
  assert.equal(satir?.description, "10→5tk · demo-stub");
  assert.equal((satir?.command as { command?: string } | undefined)?.command, "sarmal.konusmaDetay");
});

// ═══════════════════════════════════════════════════════════════════════════
// girinti.test.ts — 🌈 EDİTÖR GİRİNTİ BOYASININ VARSAYILANI (PNL-A06)
//
//   Founder 2026-10-27: editördeki girinti çizgileri seyrelmişti; her kademede
//   yan yana renkli bantlar yerine yalnız ince tek çizgiler görünüyordu. Sebep
//   0.9.194'te `sarmal.girintiRenkleri` ayarının varsayılanının false yapılmasıydı.
//   Bu nöbet iki durumu ölçer: ayar hiç verilmemişken (yeni kurulum) editör
//   0.9.193'ün gökkuşağı bantlarıyla boyanır; ayar false olunca tül derinliğe döner.
//
//   ÖLÇÜMÜN SINIRI. Sahte kabuk süsün ekrana nasıl boyandığını göstermez; nöbet
//   hangi süs türünün hangi aralıklarla kurulduğunu ve türlerin seçeneklerini ölçer.
//   Yeni kurulumdaki değer VS Code'daki gibi paketin ilanından okunur.
// ═══════════════════════════════════════════════════════════════════════════

import "./dil-kur.ts";
import "./kabuk-kur.ts";
import * as sahte from "./vscode-sahtesi.ts";
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

type Secenek = Record<string, unknown>;
type Tur = { key: string; secenek: Secenek; dispose(): void };

// Süs türleri modül yüklenirken kurulur; kayıt sahtesi girinti.ts içeri alınmadan önce bağlanır.
const kurulanlar: Tur[] = [];
sahte.window.createTextEditorDecorationType = ((secenek: Secenek) => {
  const t: Tur = { key: `tur-${kurulanlar.length}`, secenek, dispose() {} };
  kurulanlar.push(t);
  return t;
}) as never;
const { girintileriBoya } = await import("../src/girinti.ts");
const { inceStilMi, GIRINTI_RENKLERI_VARSAYILANI } = await import("../src/dallar.ts");
const { tulRengi } = await import("../src/tul-rengi.ts");

/** 0.9.193'ün gökkuşağı paleti (`git show ee20285^:urun/eklenti/src/girinti.ts`): zemin ve ışıltı. */
const PALET_0_9_193: ReadonlyArray<readonly [string, string]> = [
  ["rgba(255, 99, 99,0.16)", "rgba(255, 99, 99,0.45)"],
  ["rgba(255,159, 67,0.15)", "rgba(255,159, 67,0.42)"],
  ["rgba(255,214, 74,0.13)", "rgba(255,214, 74,0.38)"],
  ["rgba( 88,214,120,0.14)", "rgba( 88,214,120,0.40)"],
  ["rgba( 84,160,255,0.15)", "rgba( 84,160,255,0.42)"],
  ["rgba(108, 99,255,0.15)", "rgba(108, 99,255,0.42)"],
  ["rgba(199,110,255,0.15)", "rgba(199,110,255,0.42)"],
];
const TUL_ALFA = [0.035, 0.06, 0.085, 0.11, 0.13, 0.15, 0.17];

const bantTurleri = kurulanlar.filter((t) => String(t.secenek.textDecoration ?? "").includes("box-shadow"));
const tulTurleri = kurulanlar.filter((t) => "light" in t.secenek);

/** Paketin ilanındaki varsayılan: VS Code ayar verilmemişken bunu döndürür. */
function paketVarsayilani(): unknown {
  const paket = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  const bloklar = [paket.contributes.configuration].flat() as Array<{ properties?: Record<string, { default?: unknown }> }>;
  const ilan = bloklar.map((b) => b.properties?.["sarmal.girintiRenkleri"]).find((p) => p !== undefined);
  assert.ok(ilan, "paket sarmal.girintiRenkleri ayarını ilan etmiyor");
  return ilan!.default;
}

const asilAyar = sahte.workspace.getConfiguration;
/** Ayarı VS Code'un okuyuşuyla kurar: verilmemişse paketin varsayılanı döner, "okunamaz" okuma hatasıdır. */
function ayarKur(deger: boolean | undefined | "okunamaz"): void {
  sahte.workspace.getConfiguration = (() => {
    if (deger === "okunamaz") throw new Error("ayar okunamadı");
    return {
      get: <T>(ad: string, v?: T) => (ad === "girintiRenkleri" ? (deger === undefined ? paketVarsayilani() : deger) as T : v),
      has: () => false, inspect: () => undefined, update: async () => {},
    };
  }) as never;
}
afterEach(() => { sahte.workspace.getConfiguration = asilAyar; });

/** setDecorations çağrılarını tür anahtarına göre saklayan editör. */
class KayitEditoru {
  readonly cizilen = new Map<string, sahte.Range[]>();
  readonly document: sahte.SahteBelge;
  constructor(document: sahte.SahteBelge) { this.document = document; }
  setDecorations(t: Tur, araliklar: sahte.Range[]): void { this.cizilen.set(t.key, araliklar); }
  araliklar(turler: Tur[]): sahte.Range[][] { return turler.map((t) => this.cizilen.get(t.key) ?? []); }
}

// Girintiler 2 · 4 · 6 · 4 · 2 boşluk: birinci kademe beş, ikinci üç, üçüncü bir satırda.
const KAYNAK = [
  "Faz( kod: F ) {",
  "  Blok( kod: B ) {",
  "    Katman( kod: K ) {",
  "      Adım( kod: A )",
  "    }",
  "  }",
  "}",
].join("\n");
const editor = (): KayitEditoru => new KayitEditoru(new sahte.SahteBelge("/p/plan.sar", KAYNAK));
const sayilar = (araliklar: sahte.Range[][]): number[] => araliklar.map((r) => r.length);
const BANT_SAYILARI = [5, 3, 1, 0, 0, 0, 0];

test("PNL-A06 · ayarın varsayılanı gökkuşağı bantlarıdır: paketin ilanı ile kodun düşüş değeri aynıdır", () => {
  assert.equal(paketVarsayilani(), true, "sarmal.girintiRenkleri paketin ilanında varsayılan olarak açık değil");
  assert.equal(GIRINTI_RENKLERI_VARSAYILANI, paketVarsayilani(), "kodun düşüş değeri paketin varsayılanından ayrılmış");
  ayarKur(undefined);
  assert.equal(inceStilMi(), false, "ayar verilmemişken tül derinlik seçiliyor");
  ayarKur("okunamaz");
  assert.equal(inceStilMi(), false, "ayar okunamayınca varsayılana, yani bantlara düşülmeli");
  ayarKur(false);
  assert.equal(inceStilMi(), true, "ayar false iken tül derinlik seçilmiyor");
});

test("PNL-A06 · bantların renkleri ve çizim biçimi 0.9.193 ile aynıdır; tül derinlik tek kaynaktan boyanır", () => {
  assert.deepEqual(bantTurleri.map((t) => t.secenek), PALET_0_9_193.map(([zemin, isilti]) => ({
    backgroundColor: zemin,
    textDecoration: `none; box-shadow: inset 2px 0 6px -2px ${isilti}`,
  })), "gökkuşağı bantlarının rengi ya da çizim biçimi 0.9.193'ten ayrılmış");
  assert.deepEqual(tulTurleri.map((t) => t.secenek), TUL_ALFA.map((a) => ({
    backgroundColor: tulRengi("koyu", a),
    light: { backgroundColor: tulRengi("acik", a * 0.8) },
  })), "tül derinlik türleri değişmiş");
});

test("PNL-A06 · yeni kurulumda editör renkli bantlarla açılır; ayar false yapılınca tül derinliğe döner, açılınca bantlara geri gelir", () => {
  const e = editor();
  ayarKur(undefined);   // yeni kurulum: ayar hiç verilmemiş
  girintileriBoya(e as never);
  assert.deepEqual(sayilar(e.araliklar(bantTurleri)), BANT_SAYILARI, "yeni kurulumda girinti bantları çizilmedi");
  assert.deepEqual(sayilar(e.araliklar(tulTurleri)), [0, 0, 0, 0, 0, 0, 0], "yeni kurulumda tül derinlik de çizildi");
  // Her bant kendi kademesinin iki karakterini boyar (0.9.193 biçimi).
  assert.deepEqual(e.araliklar(bantTurleri)[2].map((r) => [r.start.line, r.start.character, r.end.character]), [[3, 4, 6]]);

  ayarKur(false);
  girintileriBoya(e as never);
  assert.deepEqual(sayilar(e.araliklar(tulTurleri)), BANT_SAYILARI, "ayar false iken tül derinlik çizilmedi");
  assert.deepEqual(sayilar(e.araliklar(bantTurleri)), [0, 0, 0, 0, 0, 0, 0], "ayar false olunca gökkuşağı bantları silinmedi");

  ayarKur(true);
  girintileriBoya(e as never);
  assert.deepEqual(sayilar(e.araliklar(bantTurleri)), BANT_SAYILARI, "ayar yeniden açılınca bantlar geri gelmedi");
  assert.deepEqual(sayilar(e.araliklar(tulTurleri)), [0, 0, 0, 0, 0, 0, 0], "ayar açılınca tül derinlik silinmedi");
});

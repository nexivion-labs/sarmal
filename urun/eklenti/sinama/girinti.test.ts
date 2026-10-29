// ═══════════════════════════════════════════════════════════════════════════
// girinti.test.ts — 🟣 EDİTÖR GİRİNTİ BOYASININ VARSAYILANI (PNL-A24 · PNL-A06)
//
//   PNL-A06 `sarmal.girintiRenkleri` ayarının varsayılanını yanlış bir okumayla
//   true yapmış ve editör gökkuşağı bantlarıyla açılmaya başlamıştı. Founder'ın
//   istediği görünüm 0.9.194'teki mor tül derinliktir (ee20285). PNL-A24 varsayılanı
//   yeniden false yapar. Bu nöbet üç şeyi ölçer: ayar hiç verilmemişken (yeni kurulum)
//   ya da okunamazken editör mor tülle boyanır; ayar açılınca 0.9.193'ün gökkuşağı
//   bantlarına geçer; mor tülün renkleri ve çizim biçimi 0.9.194 ile aynıdır.
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
const { TUL_MORU } = await import("../src/tul-rengi.ts");

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
/** 0.9.194'ün tül derinliği (`git show aee7931:urun/eklenti/src/girinti.ts`): yedi kademenin saydamlığı ve
 *  süs seçeneği. Seçenek 0.9.194'teki ifadenin harfi harfine aynısıdır; bugünkü kod tonu tul-rengi.ts'ten okur. */
const TUL_ALFA_0_9_194 = [0.035, 0.06, 0.085, 0.11, 0.13, 0.15, 0.17];
const TUL_SECENEGI_0_9_194 = (a: number): Secenek => ({
  backgroundColor: `rgba(199,146,234,${a})`,
  light: { backgroundColor: `rgba(124,77,180,${a * 0.8})` },
});

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

test("PNL-A24 · ayarın varsayılanı mor tül derinliktir: paketin ilanı ile kodun düşüş değeri aynıdır; ayar okunamazsa da tül çizilir", () => {
  assert.equal(paketVarsayilani(), false, "sarmal.girintiRenkleri paketin ilanında varsayılan olarak kapalı değil");
  assert.equal(GIRINTI_RENKLERI_VARSAYILANI, paketVarsayilani(), "kodun düşüş değeri paketin varsayılanından ayrılmış");
  ayarKur(undefined);
  assert.equal(inceStilMi(), true, "ayar verilmemişken (yeni kurulum) tül derinlik seçilmiyor");
  ayarKur("okunamaz");
  assert.equal(inceStilMi(), true, "ayar okunamayınca varsayılana, yani mor tüle düşülmeli");
  ayarKur("evet" as never);
  assert.equal(inceStilMi(), true, "boolean olmayan değer gökkuşağını açmamalı");
  ayarKur(false);
  assert.equal(inceStilMi(), true, "ayar false iken tül derinlik seçilmiyor");
  ayarKur(true);
  assert.equal(inceStilMi(), false, "ayar açıkken gökkuşağı bantları seçilmiyor");
});

test("PNL-A24 · mor tülün renkleri ve çizim biçimi 0.9.194 ile aynıdır; bantlar 0.9.193 ile aynı kalır", () => {
  // Mor tonun tek kaynağı (tul-rengi.ts) 0.9.194'teki iki tonun aynısıdır.
  assert.deepEqual({ koyu: [...TUL_MORU.koyu], acik: [...TUL_MORU.acik] }, { koyu: [199, 146, 234], acik: [124, 77, 180] },
    "tül morunun tonu 0.9.194'ten ayrılmış");
  // Yedi tül türü 0.9.194'teki süs seçeneklerinin harfi harfine aynısıdır: koyu temada zemin, açık temada 0.8 kat saydamlık.
  assert.deepEqual(tulTurleri.map((t) => t.secenek), TUL_ALFA_0_9_194.map(TUL_SECENEGI_0_9_194),
    "tül derinliğin rengi, saydamlığı ya da çizim biçimi 0.9.194'ten ayrılmış");
  // Tül yalnız zemin boyar; gökkuşağının ışıma kanalını (box-shadow) taşımaz.
  assert.ok(tulTurleri.every((t) => !("textDecoration" in t.secenek)), "tül türü ışıma taşıyor");
  assert.deepEqual(bantTurleri.map((t) => t.secenek), PALET_0_9_193.map(([zemin, isilti]) => ({
    backgroundColor: zemin,
    textDecoration: `none; box-shadow: inset 2px 0 6px -2px ${isilti}`,
  })), "gökkuşağı bantlarının rengi ya da çizim biçimi 0.9.193'ten ayrılmış");
});

test("PNL-A24 · yeni kurulumda editör mor tülle açılır; ayar açılınca gökkuşağı bantlarına geçer, kapanınca tüle döner; ayar okunamazsa tül çizilir", () => {
  const e = editor();
  const bos = [0, 0, 0, 0, 0, 0, 0];
  const yer = (r: sahte.Range[]): number[][] => r.map((x) => [x.start.line, x.start.character, x.end.character]);
  ayarKur(undefined);   // yeni kurulum: ayar hiç verilmemiş
  girintileriBoya(e as never);
  assert.deepEqual(sayilar(e.araliklar(tulTurleri)), BANT_SAYILARI, "yeni kurulumda mor tül çizilmedi");
  assert.deepEqual(sayilar(e.araliklar(bantTurleri)), bos, "yeni kurulumda gökkuşağı bantları da çizildi");
  // Tül her kademeyi tam genişliğinde boyar (0.9.194 biçimi): üçüncü kademe dördüncü satırın 4–6 sütunu.
  assert.deepEqual(yer(e.araliklar(tulTurleri)[2]), [[3, 4, 6]]);
  assert.deepEqual(yer(e.araliklar(tulTurleri)[0]), [[1, 0, 2], [2, 0, 2], [3, 0, 2], [4, 0, 2], [5, 0, 2]]);

  ayarKur(true);
  girintileriBoya(e as never);
  assert.deepEqual(sayilar(e.araliklar(bantTurleri)), BANT_SAYILARI, "ayar açılınca gökkuşağı bantları çizilmedi");
  assert.deepEqual(sayilar(e.araliklar(tulTurleri)), bos, "ayar açılınca tül silinmedi");
  // Her bant kendi kademesinin iki karakterini boyar (0.9.193 biçimi).
  assert.deepEqual(yer(e.araliklar(bantTurleri)[2]), [[3, 4, 6]]);

  ayarKur(false);
  girintileriBoya(e as never);
  assert.deepEqual(sayilar(e.araliklar(tulTurleri)), BANT_SAYILARI, "ayar kapanınca mor tüle dönülmedi");
  assert.deepEqual(sayilar(e.araliklar(bantTurleri)), bos, "ayar kapanınca gökkuşağı bantları silinmedi");

  ayarKur(true);
  girintileriBoya(e as never);
  ayarKur("okunamaz");
  girintileriBoya(e as never);
  assert.deepEqual(sayilar(e.araliklar(tulTurleri)), BANT_SAYILARI, "ayar okunamayınca varsayılan görünüm (mor tül) çizilmedi");
  assert.deepEqual(sayilar(e.araliklar(bantTurleri)), bos, "ayar okunamayınca bantlar kaldı");
});

// ═══════════════════════════════════════════════════════════════════════════
// gorsel-esad.test.ts — CDL-A08 kaynak-içi görsel eşad nöbeti
//
//   Sınama gerçek dil sözlüğünü ve üretimdeki saf aralık kararını koşturur.
//   VS Code kabuğu yalnız Türkçe yüzde dekorasyonun kurulmadığını saymak için
//   en küçük sahte yüzle verilir; dosya değişmezliği gerçek geçici dosyada
//   SHA-256 ile ölçülür.
// ═══════════════════════════════════════════════════════════════════════════

import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import DIL_SOZLUGU from "../../../oz/ceviri/dil-sozlugu.json" with { type: "json" };
import {
  gorselEsadAraliklari,
  gorselEsadKaydi,
  type WidgetAdiKapisi,
} from "../src/gorsel-esad.ts";

const ORNEK = [
  "Blok( kod: BLK-A08 ) {",
  "  Katman( kod: KAT-A08 ) {",
  "    Adım( kod: CDL-A08, ne: \"Katman ve Adım bu dizgide içeriktir\" )",
  "    // Katman bu yorumda düzyazıdır",
  "  }",
  "}",
].join("\n");

const sha256 = (veri: Uint8Array): string => createHash("sha256").update(veri).digest("hex");

test("CDL-A08 en: sözlüğün 101 widget hanesi tek kapıdan görsel İngilizce etikete bağlanır", () => {
  const widget = DIL_SOZLUGU.widget as Record<string, { en: string }>;
  assert.equal(Object.keys(widget).length, 101, "görsel eşad evreni sözlüğün 101 widget hanesi olmalı");

  const kaynak = Object.keys(widget).map((ad, i) => `${ad}( kod: WIDGET-${i} )`).join("\n");
  const araliklar = gorselEsadAraliklari(kaynak, "en");
  const degisenler = Object.entries(widget).filter(([ad, hane]) => hane.en !== ad);
  assert.equal(araliklar.length, degisenler.length, "yalnız görünüşü gerçekten değişen widget adları dekorasyon almalı");
  assert.deepEqual(
    araliklar.map(({ kaynak: ad, etiket }) => [ad, etiket]),
    degisenler.map(([ad, hane]) => [ad, hane.en]),
    "İngilizce etiketler ikinci bir çizelgeden değil sözlük kapısından gelmeli",
  );

  const ornek = gorselEsadAraliklari(ORNEK, "en");
  assert.deepEqual(ornek.map(({ kaynak, etiket }) => [kaynak, etiket]), [
    ["Blok", "Block"], ["Katman", "Layer"], ["Adım", "Step"],
  ]);
});

test("CDL-A08 tr: dekorasyon türü ve editör dinleyicileri hiç kurulmaz", () => {
  let yaratilanTur = 0;
  let editorDinleyicisi = 0;
  let ayarDinleyicisi = 0;
  const abonelik = () => ({ dispose() { /* sınama kabuğu */ } });
  const kabuk = {
    DecorationRangeBehavior: { ClosedClosed: 0 },
    Range: class {},
    ThemeColor: class {},
    window: {
      visibleTextEditors: [],
      createTextEditorDecorationType() { yaratilanTur += 1; return abonelik(); },
      onDidChangeVisibleTextEditors() { editorDinleyicisi += 1; return abonelik(); },
      onDidChangeTextEditorSelection() { editorDinleyicisi += 1; return abonelik(); },
    },
    workspace: {
      onDidChangeTextDocument() { editorDinleyicisi += 1; return abonelik(); },
      onDidChangeConfiguration() { ayarDinleyicisi += 1; return abonelik(); },
    },
  };
  const subscriptions: Array<{ dispose(): void }> = [];
  gorselEsadKaydi(
    { subscriptions } as unknown as import("vscode").ExtensionContext,
    kabuk as unknown as typeof import("vscode"),
    () => "tr",
    () => true,
  );
  assert.equal(yaratilanTur, 0, "Türkçe yüzde TextEditorDecorationType kurulmamalı");
  assert.equal(editorDinleyicisi, 0, "Türkçe yüzde editör/belge/seçim maliyeti doğmamalı");
  assert.equal(ayarDinleyicisi, 1, "yalnız en geçişini duyacak tek ayar kapısı yaşamalı");
  for (const d of subscriptions) d.dispose();
});

test("CDL-A08 sha256: en ve tr görünüşleri diskteki Türkçe kaynağın tek baytını değiştirmez", () => {
  const dizin = mkdtempSync(join(tmpdir(), "sarmal-gorsel-esad-"));
  const dosya = join(dizin, "ornek.sar");
  try {
    writeFileSync(dosya, ORNEK, "utf8");
    const once = readFileSync(dosya);
    const onceSha = sha256(once);

    gorselEsadAraliklari(once.toString("utf8"), "en");
    const enSonra = readFileSync(dosya);
    assert.equal(sha256(enSonra), onceSha, "İngilizce dekorasyon kararı diskteki SHA-256 değerini değiştirdi");
    assert.deepEqual(enSonra, once, "İngilizce görünüşte kaynak baytları değişti");

    gorselEsadAraliklari(once.toString("utf8"), "tr");
    const trSonra = readFileSync(dosya);
    assert.equal(sha256(trSonra), onceSha, "Türkçe görünüş kararı diskteki SHA-256 değerini değiştirdi");
    assert.deepEqual(trSonra, once, "Türkçe görünüşte kaynak baytları değişti");
  } finally {
    rmSync(dizin, { recursive: true, force: true });
  }
});

test("CDL-A08 mutasyon: sözlük kapısı kimlik işleviyle atlanırsa İngilizce etiket nöbeti düşer", () => {
  const bekci = (kapi?: WidgetAdiKapisi): void => {
    const araliklar = gorselEsadAraliklari("Katman( kod: KAT-MUT )", "en", kapi);
    assert.equal(araliklar[0]?.etiket, "Layer", "Katman etiketi sözlüğün Layer hanesinden gelmeli");
  };
  bekci();
  const kapisizMutant: WidgetAdiKapisi = (ad) => ad;
  assert.throws(() => bekci(kapisizMutant), /Layer/u, "sözlük kapısı atlama mutasyonu nöbetten kaçtı");
});

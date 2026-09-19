// ═══════════════════════════════════════════════════════════════════════════
// koksuz-varlik-esitligi.test.ts — 🛡️ KPS-FAZ-A02 · Panel ile Motorun AYNI Köksüz Hükmü (YUZ-3.1)
//
//   Kök dışında yaşayan bir plan dosyası için panel eskiden klasör adından sahte
//   bir `Proje` uyduruyordu (`tip: "Proje", kod: <klasör adı>`), motor ise aynı
//   düğümü dürüstçe köksüz bırakıyor ve KPS-FAZ-A02 ile bunu `projesiz-faz`
//   gözlemiyle bildiriyordu; iki yüzey aynı olguda iki ayrı gerçek söylüyordu.
//   Founder hükmü (2026-09-19): panel sahte Proje uydurmayı bırakır ve motorun
//   köksüz hükmünü gösterir. Bu nöbet o eşitliği ölçer: girişsiz dosyanın panel
//   kimliği `KOKSUZ_VARLIK_TIPI` taşır, kodu boştur ve motorun grafında aynı
//   Fazın kapsayanı yoktur; girişli dosya ise iki yüzeyde de kendi Projesine
//   çözülür.
//
//   MUTASYON KANITI (2026-09-19 · elden koşuldu, yedekten geri kondu): çekirdekteki
//   `koksuzVarlik` yeniden `tip: "Proje", kod: basename(kok)` döndürürse birinci
//   sınama iki iddiasıyla kırmızı yanar; `varlikCozucu` yedeği `koksuzVarlik`
//   yerine eski satırı yazarsa aynı sınama kırmızı yanar.
// ═══════════════════════════════════════════════════════════════════════════

import { test } from "node:test";
import assert from "node:assert/strict";
import { belirtecle } from "../../cekirdek/src/belirtec.ts";
import { ayristir } from "../../cekirdek/src/ayristirici.ts";
import type { Program } from "../../cekirdek/src/sozdizim.ts";
import { dagKur } from "../../cekirdek/src/dag.ts";
import { KOKSUZ_VARLIK_TIPI, anadizinHaritasi, koksuzVarlik, varlikCozucu } from "../src/yolharitasi-cekirdek.ts";

const AGAC: Record<string, string> = {
  "/cati/a/a_anadizin.sar": `Proje( kod: PRJ-A, ad: "A Projesi", rejim: katı ) { Teknoloji( kod: TEK-A, ad: "A tekniği" ) }`,
  "/cati/a/is/plan/faz.sar": `Faz( kod: FAZ-A, ad: "A Mevsimi" ) { Blok( kod: BLK-A, ne: "A gövdesinin işi tam cümleyle yazılmıştır." ) }`,
  "/disarida/faz.sar": `Faz( kod: FAZ-DIS, ad: "Dış Mevsim" ) { Blok( kod: BLK-DIS, ne: "Dış gövdenin işi tam cümleyle yazılmıştır." ) }`,
};
const PROGRAMLAR = new Map<string, Program>(Object.entries(AGAC).map(([yol, k]) => [yol, ayristir(belirtecle(k))]));
const YOLLAR = Object.keys(AGAC);
const coz = varlikCozucu(anadizinHaritasi(YOLLAR), (anaSar) => PROGRAMLAR.get(anaSar));

test("KPS-FAZ-A02 · girişsiz dosya sahte Proje almaz: panel köksüz tipini, motor köksüz Fazı söyler", () => {
  const k = coz("/disarida/faz.sar");
  assert.equal(k.tip, KOKSUZ_VARLIK_TIPI, "panel klasör adından Proje uydurdu");
  assert.equal(k.kod, "", "uydurulacak bir kimlik yoktur; kod boş kalır");
  assert.equal(k.ad, "disarida", "dosyanın nerede yaşadığı bir olgudur ve ad olarak kalır");
  assert.equal(k.anaSar, "");
  // Motor yarısı: aynı Fazın grafta kapsayanı yoktur — iki yüzey aynı gerçeği söyler.
  const dag = dagKur(PROGRAMLAR);
  assert.equal(dag.dugumler.get("FAZ-DIS")!.kapsayan, undefined);
});

test("KPS-FAZ-A02 · girişli dosya iki yüzeyde de kendi Projesine çözülür; eşitliğin öteki yarısı bozulmadı", () => {
  const k = coz("/cati/a/is/plan/faz.sar");
  assert.equal(k.tip, "Proje");
  assert.equal(k.kod, "PRJ-A");
  assert.equal(dagKur(PROGRAMLAR).dugumler.get("FAZ-A")!.kapsayan, "PRJ-A");
});

test("KPS-FAZ-A02 · tek kapı: tur içi çözücü ile disk yedeği aynı köksüz kimliği üretir", () => {
  assert.deepEqual(coz("/disarida/faz.sar"), koksuzVarlik("/disarida/faz.sar"));
});

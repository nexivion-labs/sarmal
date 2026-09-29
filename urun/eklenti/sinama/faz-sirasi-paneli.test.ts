// ═══════════════════════════════════════════════════════════════════════════
// faz-sirasi-paneli.test.ts — 🕰️ PANELİN FAZ SIRASI MOTORLA EŞİTTİR (KPS-SIR-A01)
//
//   Founder hükmü (2026-09-29): aynı Projenin Fazları tek zincirdir ve eşit
//   tarihli ya da tarihsiz Fazlar dosyalar arasında dosya önekinin doğal sayı
//   sırasıyla (`1_`, `2_`, … `10_`) dizilir; panel de aynı sırayı çizer. Eski
//   panel Fazları topolojik rütbeyle, eşitlikte düz sözlük sırasıyla diziyordu:
//   Adımsız bir Faz rütbesiz kaldığı için en üste fırlıyor, `10_` öneki de `2_`
//   önekinin önüne geçiyordu. Bu nöbet kardeş karşılaştırıcısını vscode'suz
//   ölçer ve aynı iki dosyalı sınav çatısında motorun zinciriyle karşılaştırır.
// ═══════════════════════════════════════════════════════════════════════════
import { test } from "node:test";
import assert from "node:assert/strict";
import { kardesKarsilastir } from "../src/yolharitasi-cekirdek.ts";
import { dagKur } from "../../cekirdek/src/dag.ts";
import { ayristir } from "../../cekirdek/src/ayristirici.ts";
import { belirtecle } from "../../cekirdek/src/belirtec.ts";

interface Ogecik { tip: string; kod: string; hedefTarih?: string; satir: number; yol: string; rutbe: number }

const sirala = (liste: Ogecik[]): string[] =>
  [...liste].sort((a, b) => kardesKarsilastir(a, b, (o) => o.rutbe, (o) => o.yol)).map((o) => o.kod);

test("tarihsiz Fazlar dosya önekinin doğal sayı sırasıyla dizilir; rütbesiz boş Faz öne fırlamaz", () => {
  const liste: Ogecik[] = [
    { tip: "Faz", kod: "FAZ-ON", satir: 1, yol: "/k/p/is/plan/faz/10_on.sar", rutbe: 40 },
    { tip: "Faz", kod: "FAZ-BOS", satir: 1, yol: "/k/p/is/plan/faz/5_bos.sar", rutbe: -1 },
    { tip: "Faz", kod: "FAZ-IKI", satir: 30, yol: "/k/p/is/plan/faz/2_iki.sar", rutbe: 20 },
    { tip: "Faz", kod: "FAZ-BIR", satir: 60, yol: "/k/p/is/plan/faz/1_bir.sar", rutbe: 10 },
  ];
  assert.deepEqual(sirala(liste), ["FAZ-BIR", "FAZ-IKI", "FAZ-BOS", "FAZ-ON"]);
});

test("tarih önekten önce gelir ve aynı dosyada satır karar verir", () => {
  const liste: Ogecik[] = [
    { tip: "Faz", kod: "FAZ-TARIHSIZ", satir: 1, yol: "/k/p/is/plan/faz/1_a.sar", rutbe: -1 },
    { tip: "Faz", kod: "FAZ-EYLUL-2", satir: 40, yol: "/k/p/is/plan/faz/faz.sar", rutbe: -1 },
    { tip: "Faz", kod: "FAZ-EYLUL-1", satir: 10, yol: "/k/p/is/plan/faz/faz.sar", rutbe: -1 },
  ];
  // Eylül Fazlarına tarih verilir; tarihsiz Faz, öneki küçük olsa da arkada kalır.
  for (const o of liste) if (o.kod.startsWith("FAZ-EYLUL")) o.hedefTarih = "2026-09-30";
  assert.deepEqual(sirala(liste), ["FAZ-EYLUL-1", "FAZ-EYLUL-2", "FAZ-TARIHSIZ"]);
});

test("iki dosyalı sınav çatısında panelin sırası motorun Faz zinciriyle birebirdir", () => {
  const faz = (ek: string, bosluk: number): string =>
    "\n".repeat(bosluk) +
    `Faz( kod: FAZ-${ek}, ad: "${ek}" ) {\n  Blok( kod: BLK-${ek}, ne: "g" ) {\n    Katman( kod: KAT-${ek}, ad: "k" ) {\n      AltKatman( kod: ALT-${ek}, ad: "m" ) {\n        Adım( kod: ADM-${ek}, durum: beklemede, ne: "iş" )\n      }\n    }\n  }\n}\n`;
  const kaynaklar: Record<string, string> = {
    "p/p_anadizin.sar": `Proje( kod: PRJ-P, ad: "P" ) { Teknoloji( kod: TEK-P, ad: "t" ) }`,
    "p/is/plan/faz/10_son.sar": faz("SON", 0),
    "p/is/plan/faz/2_ilk.sar": faz("ILK", 25),
  };
  const dag = dagKur(new Map(Object.entries(kaynaklar).map(([d, k]) => [d, ayristir(belirtecle(k))])));
  const motor = [...dag.fazSirasi!.entries()].sort((a, b) => a[1].sira - b[1].sira).map(([k]) => k);
  const panel = sirala([...dag.dugumler.values()].filter((d) => d.tip === "Faz")
    .map((d) => ({ tip: d.tip, kod: d.kod, hedefTarih: d.hedefTarih, satir: d.satir, yol: `/kok/${d.dosya}`, rutbe: -1 })));
  assert.deepEqual(motor, ["FAZ-ILK", "FAZ-SON"]);
  assert.deepEqual(panel, motor, "panel ile motor aynı Faz sırasını söylemeli");
  assert.deepEqual(dag.dugumler.get("ADM-SON")!.oncekiler, ["ADM-ILK"], "ayrı dosyalardaki Fazlar sıra kenarıyla zincirli olmalı");
});

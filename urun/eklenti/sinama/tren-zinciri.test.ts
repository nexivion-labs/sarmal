// ═══════════════════════════════════════════════════════════════════════════
// tren-zinciri.test.ts — ⛓️ GELİŞTİRMEDEKİ İŞİN ZİNCİRİ (PNL-A12 · OZK-13 DÖRDÜNCÜSÜ)
//
//   Tren sekmesi geliştirmedeki her Adımı tek satırda dört parçayla gösterir:
//   Adım → Görev ile atanmış ajan → Katmanın zemini (takım ya da teknoloji) →
//   AltKatmanın departmanı. Bu süit üç şeyi ölçer:
//     1. Dört parça uydurma bir fikstürde kaynaktan doğru okunur; yokluklar
//        (atanmamış, Katmansız, zeminsiz, AltKatmansız, departmansız) adıyla yazılır.
//     2. BAĞIMSIZ KAHİN: zincir çekirdeğin kendi çıktılarıyla karşılaştırılır.
//        Katman ve AltKatman `dagKur` grafının `kapsayan` zincirinden, zemin aynı
//        grafın `zemin` kaydından, ajanlar `atananEtmenler` işlevinden, departman
//        ise kaynak dosyanın o satırının metninden okunur. Karşılaştırma hem
//        fikstürde hem Sarmal deposunun gerçek planında koşar.
//     3. Tren ağacı: Adım satırının açıklaması dört parçayı taşır ve her parça
//        satırı tanımının dosyasına ve satırına götürür.
// ═══════════════════════════════════════════════════════════════════════════

import "./dil-kur.ts";
import { kabuk, kabukSifirla, Uri } from "./kabuk-kur.ts";
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { belirtecle } from "../../cekirdek/src/belirtec.ts";
import { ayristir } from "../../cekirdek/src/ayristirici.ts";
import { dagKur } from "../../cekirdek/src/dag.ts";
import { atananEtmenler } from "../../cekirdek/src/sef.ts";
import type { Program } from "../../cekirdek/src/sozdizim.ts";

const { trenOzetiCikar, trenParmakIzi } = await import("../src/tren-cekirdek.ts");
const { Tren, zincirMetinleri } = await import("../src/tren.ts");
const { TREN_METINLERI, yuzeyDiliniAyarla } = await import("../src/yuzey-metinleri.ts");
const { erisimSiniri } = await import("../src/tur-belgesi.ts");

beforeEach(() => { kabukSifirla(); yuzeyDiliniAyarla("tr"); });

const prog = (k: string): Program => ayristir(belirtecle(k));

// ── Fikstür (uydurma adlar) ─────────────────────────────────────────────────
const PLAN = `Takım( kod: TKM-ONYUZ, ad: "Önyüz Takımı", ne: "örnek takım" )
Teknoloji( kod: TEK-TS, ad: "TypeScript", ne: "örnek teknoloji" )
Etmen( kod: ETM-FORM, ad: "form-uzmani", tür: uzman, ne: "örnek ajan" )
Blok( kod: BLK-ORNEK, ad: "Örnek" ) {
  Katman( kod: KAT-BIR, ad: "Birinci Katman", takım: TKM-ONYUZ ) {
    AltKatman( kod: ALT-BIR, ad: "Birinci Dal",
      departman: kodlama ) {
      Adım( kod: ADM-ATANMIS, ad: "Atanmış İş", durum: geliştirmede )
      Adım( kod: ADM-BOS, ad: "Atanmamış İş", durum: geliştirmede )
      Adım( kod: ADM-BITMIS, durum: tamamlandı )
    }
  }
  Katman( kod: KAT-IKI, ad: "İkinci Katman", kullanır: TEK-TS ) {
    Adım( kod: ADM-ESNEK, durum: geliştirmede )
  }
  Katman( kod: KAT-UC, ad: "Üçüncü Katman", bağımlı: [ TKM-ONYUZ ] ) {
    AltKatman( kod: ALT-UC, ad: "Üçüncü Dal" ) {
      Adım( kod: ADM-ESKI, durum: geliştirmede )
    }
  }
  Katman( kod: KAT-DORT, ad: "Dördüncü Katman" ) {
    AltKatman( kod: ALT-DORT, ad: "Dış Dal", departman: inceleme ) {
      AltKatman( kod: ALT-DORT-IC, ad: "İç Dal", departman: sınama ) {
        Adım( kod: ADM-DERIN, durum: geliştirmede )
      }
    }
  }
  Katman( kod: KAT-BES, ad: "Beşinci Katman", takım: [ PRJ-ORNEK::TKM-ONYUZ, PRJ-ORNEK::TKM-ORTAK ] ) {
    AltKatman( kod: ALT-BES, ad: "Beşinci Dal", departman: güvenlik ) {
      Adım( kod: ADM-ADALANI, durum: geliştirmede )
    }
  }
  Adım( kod: ADM-KATMANSIZ, durum: geliştirmede )
}
Takım( kod: TKM-ORTAK, ne: "iki projede aynı kodla ilan edilmiş takım" )
Takım( kod: TKM-ORTAK, ne: "ikinci ilan" )
`;
// Atama başka bir dosyada ve planın gezisinden SONRA gelir; ikinci atanan hiçbir yerde ilan edilmemiştir.
const ATAMA = `Görev( kod: GRV-BIR, ne: "örnek atama", gerçekleştirir: ADM-ATANMIS, atanan: [ ETM-FORM, ETM-ILANSIZ ] )
Görev( kod: GRV-IKI, ne: "ikinci atama", gerçekleştirir: ADM-DERIN, atanan: ETM-FORM )
`;
const DOSYA_PLAN = "/sahte/plan.sar";
const DOSYA_ATAMA = "/sahte/zatama.sar";
const fikstur = (): Map<string, Program> => new Map([[DOSYA_PLAN, prog(PLAN)], [DOSYA_ATAMA, prog(ATAMA)]]);
/** Fikstür metninde bir parçanın geçtiği satır (1 tabanlı) — ayrıştırıcıdan bağımsız ölçü. */
const satiri = (metin: string, parca: string): number => metin.split("\n").findIndex((s) => s.includes(parca)) + 1;

test("PNL-A12 fikstür: dört parça kaynaktan okunur; ajan ve zemin tanımına, departman kendi alanının satırına bağlıdır", () => {
  const o = trenOzetiCikar(fikstur());
  const adim = (k: string) => o.adimlar.find((a) => a.kod === k)!;
  assert.deepEqual(o.adimlar.map((a) => a.kod), ["ADM-ADALANI", "ADM-ATANMIS", "ADM-BOS", "ADM-DERIN", "ADM-ESKI", "ADM-ESNEK", "ADM-KATMANSIZ"],
    "yalnız geliştirmedeki Adımlar listelenir");

  const z = adim("ADM-ATANMIS").zincir;
  assert.deepEqual(z.ajanlar.map((h) => [h.kod, h.tip, h.ad, h.dosya, h.satir]), [
    ["ETM-FORM", "Etmen", "form-uzmani", DOSYA_PLAN, satiri(PLAN, "kod: ETM-FORM")],
    ["ETM-ILANSIZ", "", "", undefined, undefined],
  ], "atanan iki ajan: ilanlı olan tanımına bağlı, ilansız olan yalnız koduyla");
  assert.deepEqual([z.katman?.kod, z.katman?.satir], ["KAT-BIR", satiri(PLAN, "kod: KAT-BIR")]);
  assert.deepEqual(z.zemin.map((h) => [h.kod, h.tip, h.satir]), [["TKM-ONYUZ", "Takım", satiri(PLAN, "kod: TKM-ONYUZ")]]);
  assert.deepEqual([z.altKatman?.kod, z.departman?.deger, z.departman?.dosya, z.departman?.satir],
    ["ALT-BIR", "kodlama", DOSYA_PLAN, satiri(PLAN, "departman: kodlama")]);
  assert.deepEqual(zincirMetinleri(adim("ADM-ATANMIS")), { ajan: "form-uzmani, ETM-ILANSIZ", zemin: "Önyüz Takımı", departman: "kodlama" });

  assert.deepEqual(zincirMetinleri(adim("ADM-BOS")), { ajan: "atanmamış", zemin: "Önyüz Takımı", departman: "kodlama" },
    "Görevi olmayan Adım atanmamış yazılır; atama tahmin edilmez");
  assert.deepEqual(zincirMetinleri(adim("ADM-ESNEK")), { ajan: "atanmamış", zemin: "TypeScript", departman: "AltKatmansız" });
  assert.equal(adim("ADM-ESNEK").zincir.zemin[0]?.tip, "Teknoloji", "kullanır kenarı teknolojiyi verir");
  assert.deepEqual(zincirMetinleri(adim("ADM-ESKI")), { ajan: "atanmamış", zemin: "Önyüz Takımı", departman: "departman beyanı yok" },
    "Takıma yönelen eski bağımlı yazımı zemin sayılır (dag.ts zemin kaydı); departmansız AltKatman adıyla yazılır");
  assert.deepEqual(zincirMetinleri(adim("ADM-DERIN")), { ajan: "form-uzmani", zemin: "zemin beyanı yok", departman: "sınama" },
    "iç içe AltKatmanda en yakın dalın departmanı okunur; zeminsiz Katman adıyla yazılır");
  assert.deepEqual(zincirMetinleri(adim("ADM-KATMANSIZ")), { ajan: "atanmamış", zemin: "Katmansız", departman: "AltKatmansız" });
  // ORK-4: ad alanlı zemin yerel parçasıyla çözülür; yerel kodu iki kez ilan edilmiş hedef tahminle çözülmez.
  assert.deepEqual(adim("ADM-ADALANI").zincir.zemin.map((h) => [h.kod, h.tip, h.satir]), [
    ["PRJ-ORNEK::TKM-ONYUZ", "Takım", satiri(PLAN, "kod: TKM-ONYUZ")],
    ["PRJ-ORNEK::TKM-ORTAK", "", undefined],
  ]);

  yuzeyDiliniAyarla("en");
  assert.deepEqual(zincirMetinleri(adim("ADM-KATMANSIZ")), { ajan: "unassigned", zemin: "no Katman", departman: "no AltKatman" });
  assert.equal(TREN_METINLERI.zincirAciklamasi("a", "b", "c"), "→ a → b → c");
  yuzeyDiliniAyarla("tr");
});

/**
 * Bağımsız kahin: zinciri çekirdeğin kendi yapılarından yeniden kurar ve karşılaştırır. Adım
 * düğümü grafta dosya ve satırıyla bulunur (ad alanlı kodlar `PRJ::KOD` anahtarı taşıyabilir).
 */
function kahinleKarsilastir(programlar: Map<string, Program>): number {
  const o = trenOzetiCikar(programlar);
  const dag = dagKur(programlar);
  const yerden = new Map([...dag.dugumler.values()].map((d) => [`${d.dosya}:${d.satir}`, d]));
  const metinler = new Map<string, string[]>();
  const satirMetni = (dosya: string, satir: number): string => {
    if (!metinler.has(dosya)) metinler.set(dosya, dosya.startsWith("/sahte/") ? (dosya === DOSYA_PLAN ? PLAN : ATAMA).split("\n") : readFileSync(dosya, "utf8").split("\n"));
    return metinler.get(dosya)![satir - 1] ?? "";
  };
  for (const a of o.adimlar) {
    const d = yerden.get(`${a.dosya}:${a.satir}`);
    assert.ok(d && d.tip === "Adım", `${a.kod}: grafta Adım düğümü yok`);
    const atalar: string[] = [];
    for (let k = d.kapsayan; k; k = dag.dugumler.get(k)?.kapsayan) atalar.push(k);
    const enYakin = (tip: string) => atalar.map((k) => dag.dugumler.get(k)!).find((x) => x.tip === tip);
    const katman = enYakin("Katman"), alt = enYakin("AltKatman");
    assert.equal(a.zincir.katman?.satir, katman?.satir, `${a.kod}: Katman grafın kapsayan zinciriyle ayrışıyor`);
    assert.equal(a.zincir.katman?.dosya, katman?.dosya, `${a.kod}: Katmanın dosyası ayrışıyor`);
    assert.equal(a.zincir.altKatman?.satir, alt?.satir, `${a.kod}: AltKatman grafın kapsayan zinciriyle ayrışıyor`);
    // Zemin: grafın kaydı yalnız çözülen Takım ve Teknoloji hedeflerini tutar. Ad alanlı zemin karşılaştırılmaz:
    // çekirdeğin zemin kaydı ortak olmayan bir kodun ad alanlı yazımını bugün çözmez (2026-10-28 ölçümü).
    if (!a.zincir.zemin.some((h) => h.kod.includes("::"))) {
      const grafZemini = (katman?.zemin ?? []).map((k) => dag.dugumler.get(k)?.yerelKod ?? dag.dugumler.get(k)?.kod ?? k).sort();
      const bizim = a.zincir.zemin.filter((h) => h.tip === "Takım" || h.tip === "Teknoloji").map((h) => h.kod).sort();
      assert.deepEqual(bizim, grafZemini, `${a.kod}: zemin grafın zemin kaydıyla ayrışıyor`);
    }
    // Ajanlar: çekirdeğin atama işlevi.
    assert.deepEqual(a.zincir.ajanlar.map((h) => h.kod), atananEtmenler(programlar, a.kod).map((e) => e.kod), `${a.kod}: atanan ajanlar ayrışıyor`);
    // Departman: alanın satırı kaynak metinde `departman:` ve değeri taşır.
    if (a.zincir.departman) {
      const s = satirMetni(a.zincir.departman.dosya, a.zincir.departman.satir);
      assert.ok(/departman\s*:/.test(s) && s.includes(a.zincir.departman.deger), `${a.kod}: departman satırı kaynakta değeri taşımıyor: ${s}`);
    }
  }
  return o.adimlar.length;
}

test("PNL-A12 bağımsız kahin (fikstür): Katman, AltKatman, zemin ve ajanlar çekirdeğin dagKur ve atananEtmenler çıktısıyla aynıdır", () => {
  assert.equal(kahinleKarsilastir(fikstur()), 7);
});

test("PNL-A12 bağımsız kahin (Sarmal deposunun gerçek planı): geliştirmedeki her Adımın zinciri çekirdekle aynıdır", () => {
  const KOK = fileURLToPath(new URL("../../..", import.meta.url));
  const yollar: string[] = [];
  const topla = (d: string): void => {
    for (const ad of readdirSync(d)) {
      if (ad.startsWith(".") || ["node_modules", "dist", "dist-sinama"].includes(ad)) continue;
      const y = join(d, ad);
      if (statSync(y).isDirectory()) topla(y); else if (ad.endsWith(".sar")) yollar.push(y);
    }
  };
  topla(KOK);
  const programlar = new Map<string, Program>();
  for (const y of erisimSiniri(yollar, [KOK])) { try { programlar.set(y, prog(readFileSync(y, "utf8"))); } catch { /* kırık dosya turda da dışarıda kalır */ } }
  const n = kahinleKarsilastir(programlar);
  assert.ok(n > 0, "gerçek planda geliştirmede Adım yok; kahin hiçbir şey ölçmedi");
  // Gerçek planda en az bir Adımın departmanı okunmuş olmalıdır (ölçümün boş geçmediğinin kanıtı).
  assert.ok(trenOzetiCikar(programlar).adimlar.some((a) => a.zincir.departman), "gerçek planda hiçbir departman okunmadı");
});

test("PNL-A12 parmak izi: atama ya da departman değişince değişir (ağaç yeniden çizilir)", () => {
  const a = trenParmakIzi(trenOzetiCikar(fikstur()));
  const atamasiz = trenParmakIzi(trenOzetiCikar(new Map([[DOSYA_PLAN, prog(PLAN)]])));
  const depDegisti = trenParmakIzi(trenOzetiCikar(new Map([[DOSYA_PLAN, prog(PLAN.replace("departman: kodlama", "departman: sınama"))], [DOSYA_ATAMA, prog(ATAMA)]])));
  assert.notEqual(a, atamasiz);
  assert.notEqual(a, depDegisti);
  assert.equal(a, trenParmakIzi(trenOzetiCikar(fikstur())));
});

test("PNL-A12 Tren ağacı: Adım satırı dört parçayı tek satırda taşır, açılınca her parça tanımına götürür", () => {
  void kabuk;
  const tren = new Tren();
  tren.eklentiKoku = Uri.file(fileURLToPath(new URL("..", import.meta.url))) as never;
  tren.goruntudenYerlestir({ programlar: fikstur() } as never);
  type O = { tur: string; grup?: string };
  const kok = tren.getChildren() as O[];
  const grup = kok.find((x) => x.tur === "grup" && x.grup === "adimlar")!;
  const adimlar = tren.getChildren(grup as never) as O[];
  const satir = (o: unknown) => tren.getTreeItem(o as never) as { label: string; description?: string; tooltip?: string; collapsibleState: number; command?: { command: string; arguments?: unknown[] } };
  const atanmis = adimlar.find((x) => satir(x).label === "ADM-ATANMIS · Atanmış İş")!;
  const s = satir(atanmis);
  assert.equal(s.description, "→ form-uzmani, ETM-ILANSIZ → Önyüz Takımı → kodlama", "dört parça tek satırda: Adım adı + ajan → zemin → departman");
  assert.equal(s.collapsibleState, 1, "Adım satırı açılabilir (kapalı başlar)");
  assert.deepEqual(s.command?.arguments, [DOSYA_PLAN, satiri(PLAN, "kod: ADM-ATANMIS")], "Adım satırı Adımın tanımına götürür");
  assert.ok(String(s.tooltip).includes("Birinci Katman") && String(s.tooltip).includes("Birinci Dal"), "ipucu kapsayan Katman ve AltKatmanı adıyla söyler");

  const parcalar = (tren.getChildren(atanmis as never) as unknown[]).map(satir);
  assert.deepEqual(parcalar.map((p) => [p.label, p.description, p.command?.command, p.command?.arguments]), [
    ["form-uzmani", "ajan · ETM-FORM", "sarmal.dosyaAc", [DOSYA_PLAN, satiri(PLAN, "kod: ETM-FORM")]],
    ["ETM-ILANSIZ", "ajan", undefined, undefined],
    ["Önyüz Takımı", "takım · Birinci Katman · TKM-ONYUZ", "sarmal.dosyaAc", [DOSYA_PLAN, satiri(PLAN, "kod: TKM-ONYUZ")]],
    ["kodlama", "departman · Birinci Dal", "sarmal.dosyaAc", [DOSYA_PLAN, satiri(PLAN, "departman: kodlama")]],
  ], "her parça tanımına; ilansız ajan hiçbir yere götürmez");

  const bos = adimlar.find((x) => satir(x).label === "ADM-BOS · Atanmamış İş")!;
  const bosParca = (tren.getChildren(bos as never) as unknown[]).map(satir);
  assert.deepEqual([bosParca[0]?.label, bosParca[0]?.command], ["atanmamış", undefined], "atanmamış Adımda ajan satırı yalnız yazıdır");

  const katmansiz = adimlar.find((x) => satir(x).label === "ADM-KATMANSIZ")!;
  const k = (tren.getChildren(katmansiz as never) as unknown[]).map(satir);
  assert.deepEqual(k.map((p) => [p.label, p.command]), [["atanmamış", undefined], ["Katmansız", undefined], ["AltKatmansız", undefined]]);

  const eski = adimlar.find((x) => satir(x).label === "ADM-ESKI")!;
  const e = (tren.getChildren(eski as never) as unknown[]).map(satir);
  assert.deepEqual([e[2]?.label, e[2]?.command?.arguments], ["departman beyanı yok", [DOSYA_PLAN, satiri(PLAN, "kod: ALT-UC")]],
    "departmansız dal satırı AltKatmanın kendisine götürür");
});

// ═══════════════════════════════════════════════════════════════════════════
// alt-madde-atfi.test.ts — 🔗 Noktalı madde kodu eklentide de TEK sözcedir (HST-YUZ-A05)
//
//   HST-MTR-A06 çekirdeğin kimlik desenine madde kuyruğunu eklemiş ve `ORK-1.2`
//   yazımını tek kimlik yapmıştır; F12 bu yüzden doğru alt maddeye gider. Bağlantı
//   dekoru ile ipucu ise kuyruğu taşımıyordu: altı çizilen ve ipucunda açılan kart
//   üst maddenin (ORK-1) kartıydı. Bu dosya üç şeyi ölçer:
//   ① Bağlantı kararı (atif-cekirdek) noktalı yazımı tek aralık sayar ve tanımsız
//     bir alt madde yazımını üst maddeye bağlamaz.
//   ② Kuyruk kuralı İKİNCİ BİR KURAL değildir: eklentinin bulduğu sözce, çekirdeğin
//     metin katmanının bulduğu kimlikle birebir aynıdır (adım sınırı).
//   ③ İpucu sağlayıcısının kendisi kabuk sahtesiyle yüklenir; kod bölgesinde, yorumda
//     ve belge bloğunda `ORK-1.2` üzerine gelindiğinde ORK-1.2 kartı açılır.
//   Noktasız kodun bağlantısı ve ipucusu değişmez; aynı dosya bunu da sınar.
// ═══════════════════════════════════════════════════════════════════════════

import "./dil-kur.ts";
import { belgeKoy } from "./kabuk-kur.ts";
import { Position, Uri, workspace, type SahteBelge } from "./vscode-sahtesi.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { kimlikIndeksi, dosyayiTara } from "../../cekirdek/src/kimlik.ts";
import { atifAraliklariTopla, KOD_DESENI } from "../src/atif-cekirdek.ts";
// Ad alanıyla alınır: onarımdan önceki gövdede bu adlar yoktur ve kırmızı, dosyanın
// yüklenememesi olarak değil, sınama başına okunur.
import * as ipucuCekirdegi from "../src/ipucu-cekirdek.ts";

// Kabuğu içeri alan modüller kanca kurulduktan SONRA yüklenir (kabuk-kur.ts).
const { ipucuSaglayici } = await import("../src/ipucu.ts");
const gezinme = await import("../src/gezinme.ts");

// ── Fikstür: bir kanon dosyası ve onu anan bir plan dosyası ──────────────────

const KANON = [
  `Karar( kod: ORK-1, durum: kilitli,`,
  `       ne: "ORK-1 · Üst Madde",`,
  `       karar: "Üst maddenin hükmü." )`,
  ``,
  `Kural ikinciMadde( kod: ORK-1.2,`,
  `       ne: "ORK-1.2 · Alt Madde",`,
  `       dayanak: ORK-1 )`,
].join("\n");

const PLAN = [
  `Adım( kod: ADM-DENEME, ne: "ORK-1.2 maddesine dayanır",`,
  `  referans: [ ORK-1.2 ] )`,
  `// yorumda ORK-1.2 geçer`,
  `-->|`,
  `Belge bloğunda ORK-1.2 geçer; cümle ORK-1. ile biter, ORK-1.99 tanımsızdır.`,
  `|<--`,
  `Adım( kod: ADM-IKINCI, ne: "ikinci", referans: [ ORK-1 ] )`,
  `Adım( kod: ADM-UCUNCU, ne: "ORK-1a bitişik yazımı" )`,
].join("\n");

const KOK = mkdtempSync(join(tmpdir(), "sarmal-alt-madde-"));
const KANON_YOLU = join(KOK, "kanon.sar");
const PLAN_YOLU = join(KOK, "plan.sar");
writeFileSync(KANON_YOLU, KANON);
writeFileSync(PLAN_YOLU, PLAN);
kimlikIndeksi.dosyaGuncelle(KANON_YOLU, KANON);
kimlikIndeksi.dosyaGuncelle(PLAN_YOLU, PLAN);
belgeKoy(KANON_YOLU, KANON);
const BELGE: SahteBelge = belgeKoy(PLAN_YOLU, PLAN);
// İpucunun satır taraması (kodIndeksle) çalışma alanını findFiles ile bulur.
workspace.findFiles = async () => [Uri.file(KANON_YOLU), Uri.file(PLAN_YOLU)];

const SATIRLAR = PLAN.split("\n");
/** Plan satırında `yazim` sözcesinin `kacinci` geçişinin sütunu. */
function sutun(satir: number, yazim: string, kacinci = 0): number {
  let i = -1;
  for (let k = 0; k <= kacinci; k++) i = SATIRLAR[satir].indexOf(yazim, i + 1);
  assert.ok(i >= 0, `fikstürde ${yazim} yok`);
  return i;
}

const saglayici = ipucuSaglayici(() => "tr");
/** Konumdaki ipucusu: kartın metni ve altı çizilen sözce. */
async function ipucu(satir: number, sut: number): Promise<{ md: string; sozce: string } | undefined> {
  const h = await saglayici.provideHover(BELGE as never, new Position(satir, sut) as never, undefined as never) as
    { contents: { value: string }[]; range: { start: Position; end: Position } } | undefined;
  if (!h) return undefined;
  return { md: h.contents.map((c) => c.value).join(""), sozce: BELGE.getText(h.range as never) };
}

// ── ① Bağlantı kararı ────────────────────────────────────────────────────────

const TANIMLI = new Set(["ORK-1", "ORK-1.2", "ADM-DENEME", "ADM-IKINCI"]);
const BURADAKI = new Set(["ADM-DENEME@0", "ADM-IKINCI@6"]);

test("bağlantı: ORK-1.2 yazımı TEK aralıktır ve ORK-1.2 tanımına bağlanır", () => {
  const araliklar = atifAraliklariTopla(SATIRLAR, TANIMLI, BURADAKI);
  for (const satir of [0, 1, 2, 4]) {
    const a = araliklar.find((x) => x.satir === satir && x.baslangic === sutun(satir, "ORK-1.2"));
    assert.ok(a, `${satir}. satırdaki ORK-1.2 bağlantı almadı`);
    assert.equal(a.kod, "ORK-1.2", `${satir}. satırdaki bağlantı ${a.kod} kartını açıyor`);
    assert.equal(SATIRLAR[satir].slice(a.baslangic, a.bitis), "ORK-1.2");
  }
});

test("bağlantı: tanımsız alt madde (ORK-1.99) üst maddeye bağlanmaz", () => {
  const araliklar = atifAraliklariTopla(SATIRLAR, TANIMLI, BURADAKI);
  const s = sutun(4, "ORK-1.99");
  assert.equal(araliklar.find((x) => x.satir === 4 && x.baslangic === s), undefined,
    "kırık alt madde atfı üst maddenin kartını açıyor");
});

test("bağlantı: noktasız kod ve cümle sonundaki nokta değişmez", () => {
  const araliklar = atifAraliklariTopla(SATIRLAR, TANIMLI, BURADAKI);
  const cumleSonu = araliklar.find((x) => x.satir === 4 && x.baslangic === sutun(4, "ORK-1. "));
  assert.equal(cumleSonu?.kod, "ORK-1", "cümle sonundaki nokta kuyruğa girdi");
  const yalin = araliklar.filter((x) => x.satir === 6).map((x) => x.kod);
  assert.deepEqual(yalin, ["ORK-1"], "noktasız atfın bağlantısı değişti");
});

test("bağlantı: tanım satırındaki noktalı kod atıf sayılmaz, üst maddeye de bağlanmaz", () => {
  const satirlar = KANON.split("\n");
  const araliklar = atifAraliklariTopla(satirlar, TANIMLI, new Set(["ORK-1@0", "ORK-1.2@4"]));
  assert.deepEqual(araliklar.filter((a) => a.satir === 4), [],
    "ORK-1.2 tanımı kendi satırında üst maddeye bağlanan bir atıf gibi boyanıyor");
});

// ── ② Kuyruk kuralı çekirdekten türer ────────────────────────────────────────

test("kuyruk kuralı: dekor, ipucu ve F12 çekirdeğin metin katmanıyla aynı sözceyi seçer", () => {
  const yazimlar = ["ORK-1.2", "ORK-1.2.3", "ORK-1.2.3.4", "DIL-1.5.", "ORK-1.", "PRJ-A::ORK-1.2", "ORK-1"];
  for (const y of yazimlar) {
    const metin = `- bakınız ${y} sonu`;
    const [cekirdek] = dosyayiTara(metin, false).adaylar.map((a) => a.metin);
    // Bağlantı dekoru bütün satırı tarar.
    assert.deepEqual([...metin.matchAll(KOD_DESENI)].map((e) => e[0]), [cekirdek],
      `${y}: dekor ile çekirdek farklı sözce görüyor`);
    // İpucu ile F12 sözceyi imlecin altından seçer; imleç sözcenin son karakterindedir.
    const satir = belgeKoy(join(KOK, "sozce.sar"), metin);
    const imlec = new Position(0, metin.indexOf(cekirdek) + cekirdek.length - 1);
    const sec = (desen: RegExp): string => satir.getText(satir.getWordRangeAtPosition(imlec, desen));
    if (!cekirdek.includes("::"))   // ipucu ad alanını bilinçle tanımaz (ipucu-cekirdek.ts)
      assert.equal(sec(ipucuCekirdegi.IPUCU_KOD_SOZCESI), cekirdek, `${y}: ipucu ile çekirdek farklı sözce görüyor`);
    assert.equal(sec(gezinme.KOD_SOZCUK), cekirdek, `${y}: F12 ile çekirdek farklı sözce görüyor`);
  }
});

// ── ③ İpucu ──────────────────────────────────────────────────────────────────

test("ipucu taraması: `kod: ORK-1.2` satırı ORK-1 olarak kaydedilmez", () => {
  const t = ipucuCekirdegi.kodTanimlariTara(KANON);
  assert.deepEqual(t.map((x) => x.kod), ["ORK-1", "ORK-1.2"]);
  // Üst maddesi tanımsız bir alt madde, olmayan bir üst kodun kartını doğurmaz.
  const yalniz = ipucuCekirdegi.kodTanimlariTara(`Kapsama( kod: KSC-X-2.4, ne: "alt madde" )`);
  assert.deepEqual(yalniz.map((x) => x.kod), ["KSC-X-2.4"]);
});

test("ipucu: kod bölgesinde ORK-1.2 üzerine gelince ORK-1.2 kartı açılır", async () => {
  const s = sutun(1, "ORK-1.2");
  for (const k of [s, s + 4, s + 5, s + 6]) {   // O · 1 · nokta · 2
    const h = await ipucu(1, k);
    assert.ok(h, `sütun ${k}: ipucu açılmadı`);
    assert.equal(h.sozce, "ORK-1.2", `sütun ${k}: ipucunun sözcesi ${h.sozce}`);
    assert.match(h.md, /\*\*ORK-1\.2\*\*/, `sütun ${k}: açılan kart ORK-1.2 değil`);
    assert.match(h.md, /kanon\.sar:5\]/, `sütun ${k}: kart ORK-1.2 tanımını göstermiyor`);
  }
});

test("ipucu: dizgi içinde, yorumda ve belge bloğunda ORK-1.2 kartı açılır", async () => {
  for (const satir of [0, 2, 4]) {
    const h = await ipucu(satir, sutun(satir, "ORK-1.2") + 6);
    assert.ok(h, `${satir}. satır: ipucu açılmadı`);
    assert.equal(h.sozce, "ORK-1.2");
    assert.match(h.md, /\*\*ORK-1\.2\*\*/, `${satir}. satır: açılan kart ORK-1.2 değil`);
  }
});

test("ipucu: tanımsız alt madde (ORK-1.99) üst maddenin kartını açmaz", async () => {
  const s = sutun(4, "ORK-1.99");
  for (const k of [s, s + 7]) assert.equal(await ipucu(4, k), undefined, `sütun ${k}: kırık atfa kart uyduruldu`);
});

test("ipucu: noktasız kod ve cümle sonundaki ORK-1 kartı değişmez", async () => {
  const yalin = await ipucu(6, sutun(6, "ORK-1 "));
  assert.equal(yalin?.sozce, "ORK-1");
  assert.match(yalin?.md ?? "", /\*\*ORK-1\*\*/);
  assert.match(yalin?.md ?? "", /Üst maddenin hükmü/, "Karar kartı hükmünü kaybetti");
  const cumleSonu = await ipucu(4, sutun(4, "ORK-1. "));
  assert.equal(cumleSonu?.sozce, "ORK-1");
  assert.match(cumleSonu?.md ?? "", /\*\*ORK-1\*\*/);
});

test("ipucu: kod bölgesinde KOD biçimine uymayan bitişik sözce (ORK-1a) eskisi gibi kart açmaz", async () => {
  // Genel sözcük deseni `ORK-1a` kelimesini seçer ve kelime KOD biçiminde değildir;
  // kod sözcesi yalnız madde kuyruğu taşıdığında öne geçer (ipucu.ts).
  assert.equal(await ipucu(7, sutun(7, "ORK-1a")), undefined, "kuyruksuz sözce genel desenin önüne geçti");
});

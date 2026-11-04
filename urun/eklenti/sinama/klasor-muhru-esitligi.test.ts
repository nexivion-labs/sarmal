// ═══════════════════════════════════════════════════════════════════════════
// klasor-muhru-esitligi.test.ts — 📛 KPS-MHR-A02 · Klasör Mühründe Panel ile Motorun AYNI Sayımı (MIM-3.4 · YUZ-3.1)
//
//   Founder 2026-11-03 tarihinde dosya mührünün bir klasörün adına da
//   basılabilmesine hükmetmiştir. Motor arşiv ile sonra mühürlü klasörün içine
//   inmez, eğitim mühürlü klasörün içini okur fakat karneye saymaz; eklenti ise
//   tarama evrenini `sarKapsamDisi` ile süzer. İki gövde aynı olguda farklı sayı
//   söylerse kullanıcı çelişkili iki tablo görür. Bu nöbet eklentinin gerçek tur
//   hattını (tarama süzgeci → köken süzgeci → dosya başına yayın → yüzeylere
//   dağıtım) motorun tür dökümü ve karnesiyle karşılaştırır.
//
//   Mutasyon kanıtı (2026-11-03 koşusu; mutasyon yedekten bayt özdeş geri alındı
//   ve sınama yeniden yeşil görüldü): `sarGurultuMu` içindeki klasör mührü dalı
//   söküldüğünde Adım evreni sınaması düştü, çünkü panel mühürlü üç klasörün
//   Adımını saydı.
// ═══════════════════════════════════════════════════════════════════════════

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { dogusYaz } from "../../cekirdek/src/dogus.ts";
import { denetimKos } from "../../cekirdek/src/denetim.ts";
import { programlariYukle } from "../../cekirdek/src/denetci.ts";
import { dagKur, karneOzeti } from "../../cekirdek/src/dag.ts";
import { panelCaprazUreticiKumesi } from "../../cekirdek/src/kapi-kapsami.ts";
import { belirtecle } from "../../cekirdek/src/belirtec.ts";
import { ayristir } from "../../cekirdek/src/ayristirici.ts";
import type { Dugum } from "../../cekirdek/src/sozdizim.ts";
import type { Tani } from "../../cekirdek/src/tani.ts";
import { sarKapsamDisi, DISLANAN_ADLAR } from "../src/izleyici-cekirdek.ts";
import { yuzeyeAyir, type YuzeyKaydi } from "../src/yuzey-cekirdek.ts";

const SNF_YOL = fileURLToPath(new URL("../../../oz/siniflama/kayit.json", import.meta.url));
const BUGUN = "2026-11-03";

function yaz(kok: string, yol: string, metin: string): void {
  mkdirSync(dirname(join(kok, yol)), { recursive: true });
  writeFileSync(join(kok, yol), metin, "utf8");
}

/** Eklentinin tur taramasının disk ikizi: gizli ve dışlanan adlı dizinler atlanır. */
function sarlariTara(kok: string): string[] {
  const out: string[] = [];
  const dislanan = new Set<string>(DISLANAN_ADLAR);
  const gez = (dizin: string): void => {
    for (const g of readdirSync(dizin, { withFileTypes: true })) {
      if (g.name.startsWith(".") || dislanan.has(g.name)) continue;
      const tam = join(dizin, g.name);
      if (g.isDirectory()) gez(tam);
      else if (g.name.endsWith(".sar")) out.push(relative(kok, tam));
    }
  };
  gez(kok);
  return out.sort();
}

function adimSay(kaynak: string): number {
  let n = 0;
  const gez = (d: Dugum): void => { if (d.tur === "widget" && d.ad === "Adım") n++; d.cocuklar.forEach(gez); };
  ayristir(belirtecle(kaynak)).bildirimler.forEach(gez);
  return n;
}

/** Üç mühürlü klasör ve bir geçersiz klasör adı taşıyan doğuş ağacı. */
function agac(): string {
  const kok = mkdtempSync(join(tmpdir(), "sarmal-klasor-muhru-panel-"));
  dogusYaz(kok, "deneme", BUGUN, "proje");
  const adim = (kod: string): string => `Adım( kod: ${kod}, durum: beklemede, ne: "Klasör mührü eşitliği sınaması için yazılmış bir Adım." )\n`;
  yaz(kok, "is/plan/@ARSIV@_eski/plan.sar", adim("ARS-ESKI-A01"));
  yaz(kok, "is/plan/@SONRA@_bekleyen/plan.sar", adim("SNR-BEKLEYEN-A01"));
  yaz(kok, "is/plan/@EGITIM@_ders/alt/plan.sar", adim("EGT-DERS-A01"));
  yaz(kok, "is/plan/@FOO@_x/plan.sar", "// kümede olmayan etiketli klasör\n");
  return kok;
}

test("KPS-MHR-A02 · klasör mühründe panelin yüzey sayımı motorun tür dökümüyle BİREBİR aynıdır", () => {
  const kok = agac();
  try {
    const sonuc = denetimKos(kok, { snfYol: SNF_YOL, bugun: BUGUN, tamListe: true });
    const panel = panelCaprazUreticiKumesi();
    const harita = new Map<string, Tani[]>();
    for (const rapor of sonuc.akis) {
      const izinli = rapor.tanilar.filter((t) => panel.has(sonuc.koken.get(t) ?? ""));
      if (!izinli.length) continue;
      const mutlak = isAbsolute(rapor.dosya) ? rapor.dosya : join(kok, rapor.dosya);
      harita.set(mutlak, [...(harita.get(mutlak) ?? []), ...izinli]);
    }
    const doclar = sarlariTara(kok).filter((y) => !sarKapsamDisi(y));
    const kayitlar: YuzeyKaydi[] = doclar.flatMap((y) =>
      (harita.get(join(kok, y)) ?? []).map((tani) => ({ proje: { kod: "PRJ-DENEME", ad: "deneme" }, dosya: join(kok, y), tani })));
    const d = yuzeyeAyir(kayitlar);
    const motor = (kod: string): number => sonuc.turDokumu.find((s) => s.kod === kod)?.toplam ?? 0;
    const say = (liste: readonly YuzeyKaydi[], kod: string): number => liste.filter((k) => k.tani.kod === kod).length;
    // Ölçüm boş bir eşitlik değildir: üç tanı da gerçekten doğmuştur.
    assert.deepEqual([motor("dosya-mührü"), motor("sonraya-bırakılmış-dosya"), motor("geçersiz-dosya-adı")], [2, 1, 1]);
    assert.equal(say(d.bildirimler, "dosya-mührü"), motor("dosya-mührü"), "Gözlemler hanesi motordan farklı sayıyor");
    assert.equal(say(d.hatırlatıcılar, "sonraya-bırakılmış-dosya"), motor("sonraya-bırakılmış-dosya"), "Hatırlatıcılar hanesi motordan farklı sayıyor");
    assert.equal(say(d.problems, "geçersiz-dosya-adı"), motor("geçersiz-dosya-adı"), "Problems motordan farklı sayıyor");
  } finally { rmSync(kok, { recursive: true, force: true }); }
});

test("KPS-MHR-A02 · klasör mühründe panelin Adım evreni motorun karnesiyle BİREBİR aynıdır", () => {
  const kok = agac();
  try {
    const doclar = sarlariTara(kok).filter((y) => !sarKapsamDisi(y));
    assert.ok(!doclar.some((y) => /@(ARSIV|SONRA|EGITIM)@_/.test(y)), `mühürlü klasör panel evrenine girdi: ${doclar.join(" · ")}`);
    assert.ok(doclar.includes("is/plan/@FOO@_x/plan.sar"), "geçersiz adlı canlı klasör panelden düştü");
    const panelAdim = doclar.reduce((n, y) => n + adimSay(readFileSync(join(kok, y), "utf8")), 0);
    const karne = karneOzeti(dagKur(programlariYukle(kok).programlar));
    assert.equal(panelAdim, karne.adim, "panel ile motor farklı Adım evreni sayıyor");
  } finally { rmSync(kok, { recursive: true, force: true }); }
});

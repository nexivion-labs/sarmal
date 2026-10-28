// ═══════════════════════════════════════════════════════════════════════════
// odak-turu.test.ts — 🎯 ODAK DEĞİŞİMİ TAM DENETİM TURU BAŞLATMAZ (PNL-A26)
//
//   Founder'ın penceresinde çatıdaki tur 7,2–7,8 saniye sürüyor ve her proje
//   değişimi (tetik=odak) tam tur başlatıyordu. Eklentinin gerçek girişi sahte
//   editörde, çatı biçimli örnek çalışma alanının (ogreti/ornek/calisma_alani:
//   çatı ilanı ve dört bağımsız Proje kökü) geçici bir kopyasında koşar.
//   Ölçülenler:
//     · Taze bir projeye odak geçişi denetim turu başlatmaz; panel aynı anda (olay
//       döngüsü beklenmeden) yeni odağın kayıtlarını gösterir; performans kanalı
//       turun atlandığını gerekçesiyle yazar.
//     · Bayatlamış projeye (diskte değişmiş, olay hattının turu henüz koşmamış) odak
//       geçişi yalnız o projeyi kapsayan daraltılmış bir tur başlatır ve sonucu, aynı
//       diskle baştan koşan tam turun o proje için verdiği sonuçla birebir aynıdır
//       (eşitlik nöbeti). Kaydedilmemiş düzenleme bayatlık sayılmaz ve tur başlatmaz,
//       çünkü çapraz denetim kökü diskten okur.
//     · Değişikliği taşıyan proje hesaplandıktan sonra ona dönüş yeniden tur
//       başlatmaz.
// ═══════════════════════════════════════════════════════════════════════════

import "./dil-kur.ts";
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { cpSync, readFileSync, writeFileSync } from "node:fs";
import { join, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { etkinlestir, geciciAlan, kabukTemizle, type EtkinEklenti } from "./etkinlesme-kabugu.ts";

const ORNEK = fileURLToPath(new URL("../../../ogreti/ornek/calisma_alani", import.meta.url));

interface Alan { kok: string; arac: string; site: string; sitePlani: string; araclPlani: string; siteAnadizini: string }
function alanKur(): Alan {
  const kok = geciciAlan("sarmal-odak-turu-");
  cpSync(ORNEK, kok, { recursive: true });
  return {
    kok, arac: join(kok, "acik_arac"), site: join(kok, "site"),
    sitePlani: join(kok, "site", "plan", "anlatim_plani.sar"),
    araclPlani: join(kok, "acik_arac", "plan", "yayin_plani.sar"),
    siteAnadizini: join(kok, "site", "site_anadizin.sar"),
  };
}

const acik: EtkinEklenti[] = [];
after(() => { for (const e of acik.splice(0)) e.kapat(); kabukTemizle(); });

type Kayit = { dosya: string; kod: string; duzey: string; satir: number };
const kayitlar = (e: EtkinEklenti): Kayit[] => (e.yuz!.sinyalKayitlari as () => Kayit[])();
const hatirlaticilar = (e: EtkinEklenti): Array<{ dosya: string; tani: { kod: string; satir: number } }> =>
  ((e.yuz!.yuzeyKayitlari as () => { hatırlatıcılar: Array<{ dosya: string; tani: { kod: string; satir: number } }> })()).hatırlatıcılar;
const turSatirlari = (e: EtkinEklenti): string[] => [...e.kayit.kanallar.values()].flat().filter((s) => /denetim turu:/.test(s));
const kanal = (e: EtkinEklenti): string[] => [...e.kayit.kanallar.values()].flat();
const altinda = (yol: string, kok: string): boolean => yol === kok || yol.startsWith(kok + sep);
const bekle = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
async function turBitince(e: EtkinEklenti, once: number, ne: string): Promise<void> {
  const son = Date.now() + 30_000;
  while (turSatirlari(e).length <= once) {
    if (Date.now() > son) throw new Error(`beklenen tur gelmedi: ${ne}`);
    await bekle(20);
  }
  await bekle(20);
}
/** Bir projenin panel yüzeylerindeki bütün kayıtları: Sinyaller ve Hatırlatıcılar (dosya, kod, düzey, satır). */
function projeninKayitlari(e: EtkinEklenti, kok: string): string[] {
  return [
    ...kayitlar(e).filter((k) => altinda(k.dosya, kok)).map((k) => `${k.dosya}|${k.kod}|${k.duzey}|${k.satir}`),
    ...hatirlaticilar(e).filter((k) => altinda(k.dosya, kok)).map((k) => `${k.dosya}|${k.tani.kod}|hatırlatıcı|${k.tani.satir}`),
  ].sort();
}

/** Sitenin kök ilanından teknoloji düğümü çıkarılır: planın `kullanır:` bağı kırılır, çapraz denetimin sonucu değişir. */
const teknolojisizSiteKoku = (a: Alan): string =>
  readFileSync(a.siteAnadizini, "utf8").replace('  Teknoloji( kod: TEK-ORNEK-SITE-STATIK, ne: "Statik site üreteci" )\n', "");

test("PNL-A26 · taze projeye odak geçişi tur başlatmaz; panel yeni odağın kayıtlarını aynı anda gösterir ve kanal turun atlandığını yazar", async () => {
  const a = alanKur();
  const e = etkinlestir({ klasorler: [a.kok], etkinDosya: a.araclPlani });
  acik.push(e);
  await e.turBekle();
  await turBitince(e, 0, "açılış turu");
  const turlar = turSatirlari(e).length;
  assert.ok(kayitlar(e).some((k) => altinda(k.dosya, a.arac)) && !kayitlar(e).some((k) => altinda(k.dosya, a.site)), "açılışta odak açık araçta değil");
  e.editorDegistir(a.sitePlani);
  // Aynı anda: olay döngüsüne dönülmeden panel yeni odağın kayıtlarını gösterir.
  assert.ok(kayitlar(e).some((k) => altinda(k.dosya, a.site)), "panel yeni odağın kayıtlarını hemen göstermiyor");
  assert.ok(!kayitlar(e).some((k) => altinda(k.dosya, a.arac)), "panel eski odağın kayıtlarını göstermeye devam ediyor");
  await bekle(400);
  assert.equal(turSatirlari(e).length, turlar, `taze projeye odak geçişi tur başlattı: ${turSatirlari(e).slice(turlar).join(" || ")}`);
  assert.ok(kanal(e).some((s) => /^odak site: proje taze, denetim turu başlatılmadı/.test(s)), "kanal turun atlandığını gerekçesiyle yazmıyor");
  // Geri dönüş de tur başlatmaz.
  e.editorDegistir(a.araclPlani);
  await bekle(400);
  assert.equal(turSatirlari(e).length, turlar, "taze projeye geri dönüş tur başlattı");
});

test("PNL-A26 · bayatlamış projeye odak geçişi yalnız o projeyi denetler ve sonuç tam turun o proje için verdiği sonuçla birebir aynıdır (eşitlik)", async () => {
  const a = alanKur();
  const yeni = teknolojisizSiteKoku(a);
  assert.notEqual(yeni, readFileSync(a.siteAnadizini, "utf8"), "fikstür değişmedi");
  // Önce: site odakta, düzenlemesiz tam tur — düzenlemenin sonucu gerçekten değiştirdiği ölçülür.
  const once = etkinlestir({ klasorler: [a.kok], etkinDosya: a.sitePlani });
  acik.push(once);
  await once.turBekle();
  await turBitince(once, 0, "düzenlemesiz tam tur");
  const duzenlemesiz = projeninKayitlari(once, a.site);
  once.kapat();

  // Ölçülen yol: odak açık araçta; site kaydedilmeden düzenlenir; odak siteye geçer.
  const e = etkinlestir({ klasorler: [a.kok], etkinDosya: a.araclPlani });
  acik.push(e);
  await e.turBekle();
  await turBitince(e, 0, "açılış turu");
  // Kaydedilmemiş düzenleme bayatlık sayılmaz: çapraz denetim diskten okur, düzenleme tur başlatmaz.
  e.belgeDuzenle(a.siteAnadizini, yeni);
  await bekle(150);
  e.editorDegistir(a.sitePlani);
  await bekle(300);
  const turlar = turSatirlari(e).length;
  assert.equal(turlar, 1, `kaydedilmemiş düzenleme ya da ardından gelen odak geçişi tur başlattı: ${turSatirlari(e).join(" || ")}`);
  e.editorDegistir(a.araclPlani);
  await bekle(100);
  // Site diskte değişir; izleyici olayı gelir ve olay hattı turunu geciktirir. Pencere dolmadan odak siteye geçer.
  writeFileSync(a.siteAnadizini, yeni, "utf8");
  e.dosyaDegisti(a.siteAnadizini);
  e.editorDegistir(a.sitePlani);
  await turBitince(e, turlar, "bayat projeye odak geçişinin turu");
  const turSatiri = turSatirlari(e).at(-1)!;
  assert.match(turSatiri, /tetik=odak-dar/, `tur odak-dar tetiğiyle koşmadı: ${turSatiri}`);
  assert.match(turSatiri, /dar kapsam=site\b/, `tur yalnız site projesine daralmadı: ${turSatiri}`);

  assert.ok(kanal(e).some((s) => /^odak site: proje son hesaplamadan sonra değişmiş/.test(s)), "kanal dar turun gerekçesini yazmıyor");
  const darSonuc = projeninKayitlari(e, a.site);

  // Olay hattının kendi turu da ardından koşar; o bitince kıyasa geçilir (aynı disk).
  await turBitince(e, turlar + 1, "olay hattının turu");
  assert.match(turSatirlari(e).at(-1)!, /tetik=sar-olayı/, "odak geçişi ikinci bir odak turu başlattı");
  assert.deepEqual(projeninKayitlari(e, a.site), darSonuc, "olay turunun sonucu dar turunkinden ayrıştı");
  // Kıyas: aynı diskle baştan koşan tam tur, odak sitede.
  const tam = etkinlestir({ klasorler: [a.kok], etkinDosya: a.sitePlani });
  acik.push(tam);
  await tam.turBekle();
  await turBitince(tam, 0, "kıyas tam turu");
  assert.match(turSatirlari(tam).at(-1)!, /tetik=başlangıç/);
  assert.doesNotMatch(turSatirlari(tam).at(-1)!, /dar kapsam/, "kıyas turu tam koşmadı");
  const tamSonuc = projeninKayitlari(tam, a.site);
  assert.notDeepEqual(tamSonuc, duzenlemesiz, "fikstürün düzenlemesi sitenin sonucunu değiştirmiyor; eşitlik bir şey ölçmüyor");
  assert.deepEqual(darSonuc, tamSonuc, "dar turun site sonucu tam turunkinden ayrıştı");

  // Hesaplanan projeye dönüş artık tur başlatmaz.
  e.editorDegistir(a.araclPlani);
  await bekle(300);
  const ara = turSatirlari(e).length;
  e.editorDegistir(a.sitePlani);
  await bekle(400);
  assert.equal(turSatirlari(e).length, ara, "dar turla tazelenen projeye dönüş yeniden tur başlattı");
});

test("PNL-A26 · tazelik defteri: tam tur her kökü, dar tur yalnız kendi köklerini tazeler; tur sürerken gelen değişiklik kökü bayat bırakır; odak kararı dar kökü turKapsami'dan alır", async () => {
  const { CaprazTazelik, odakTuruKarari, ODAK_DAR_TETIGI } = await import("../src/izleyici-cekirdek.ts");
  const W = "/w", A = "/w/a", B = "/w/b", C = "/w/a/c";
  const t = new CaprazTazelik();
  assert.equal(t.bayatMi(A), true, "hiç hesaplanmamış kök taze sayıldı");
  const tam = t.turBasladi();
  t.turBitti(tam, undefined);
  assert.equal(t.bayatMi(A) || t.bayatMi(B) || t.bayatMi(C), false, "tam tur kökleri tazelemedi");
  t.degisti(["/w/b/plan.sar"]);
  assert.equal(t.bayatMi(B), true, "değişen kök bayat sayılmadı");
  assert.equal(t.bayatMi(A), false, "değişmeyen kardeş kök bayat sayıldı");
  assert.equal(t.bayatMi(W), true, "değişikliği kapsayan çatı bayat sayılmadı");
  const dar = t.turBasladi();
  t.degisti(["/w/b/ikinci.sar"]);   // tur okurken gelen değişiklik
  t.turBitti(dar, [B]);
  assert.equal(t.bayatMi(B), true, "tur sürerken gelen değişiklik kökü bayat bırakmadı");
  const dar2 = t.turBasladi();
  t.turBitti(dar2, [B]);
  assert.equal(t.bayatMi(B), false, "dar tur kendi kökünü tazelemedi");
  assert.equal(t.bayatMi(W), true, "dar tur çatıyı da tazeledi");
  t.degisti(["/w/a/c/x.sar"]);
  assert.equal(t.bayatMi(C), true);
  const dar3 = t.turBasladi();
  t.turBitti(dar3, [A]);
  assert.equal(t.bayatMi(C), false, "dış kökün dar turu içteki kökü tazelemedi");
  // Karar: taze kökte tur yok; bayat kökte turKapsami'nın verdiği dar kök; çalışma alanı kökünde tam tur.
  assert.deepEqual(odakTuruKarari(A, false, true, [W]), { tur: "yok" });
  assert.deepEqual(odakTuruKarari(B, true, true, [W]), { tur: "dar", kokler: [B] });
  assert.deepEqual(odakTuruKarari(W, true, true, [W]), { tur: "tam" }, "çalışma alanı kökü dar tura çevrildi");
  assert.deepEqual(odakTuruKarari(B, true, false, [W]), { tur: "tam" }, "odak kapalıyken dar tur kuruldu");
  assert.equal(ODAK_DAR_TETIGI, "odak-dar");
});

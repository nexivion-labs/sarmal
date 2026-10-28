// ═══════════════════════════════════════════════════════════════════════════
// kapsam-sayaci.test.ts — 🔢 SAYININ KAPSAMI, ACİL ROZET VE BUGÜNKÜ ONAYLAR (PNL-A08)
//
//   Kabulün üç ayağı burada ölçülür:
//     · Aynı çatıda farklı dosyalar açıkken gösterilen her sayı kapsamını adıyla
//       taşır: eklentinin gerçek girişi çatı biçimli örnek çalışma alanında koşar,
//       durum çubuğunun her görünen girdisinin ipucu odaktaki projenin ya da çatının
//       adını yazar; çatıda sayı proje proje dökülür ve döküm sayıyla tutar.
//     · Dış Sarmal rozeti onay, Dur ve ateşlemiş hatırlatıcı sayılarının toplamıdır;
//       uyuyan hatırlatıcı ve Dikkat sayısı onu değiştirmez (Founder 2026-10-28).
//     · Beklemedeki bir Adımın kapısı onay sayacını ve dış rozeti artırmaz;
//       geliştirmedeki bir Adımın kapısı artırır. Beklemedeki kapı Makinist'in
//       "İleride onay isteyecek" grubunda durur.
// ═══════════════════════════════════════════════════════════════════════════

import "./dil-kur.ts";
import { kabuk, kabukSifirla, SahteWebviewGorunusu, Uri } from "./kabuk-kur.ts";
import { test, beforeEach, afterEach, after } from "node:test";
import assert from "node:assert/strict";
import { cpSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { belirtecle } from "../../cekirdek/src/belirtec.ts";
import { ayristir } from "../../cekirdek/src/ayristirici.ts";
import { onayKapilariTopla, kararBugunVerilir, KARAR_DURUMLARI, type KapiKaydi } from "../src/onay-cekirdek.ts";
import { acilToplami, adaGoreSay, dokulur, paylariBirlestir, payToplami } from "../src/kapsam-sayaci.ts";
import type { YuzeyKaydi } from "../src/yuzey-cekirdek.ts";
import { etkinlestir, geciciAlan, kabukTemizle, type EtkinEklenti } from "./etkinlesme-kabugu.ts";

const { YolHaritasi } = await import("../src/yolharitasi.ts");
const { MiniGrafGorunumu } = await import("../src/minigraf.ts");
const { Tren } = await import("../src/tren.ts");
const { panelKaydi, GORUNUS_PANEL } = await import("../src/panel.ts");
const { onayPaneliKaydi } = await import("../src/onay-paneli.ts");
const { hatirlaticilarKaydi } = await import("../src/hatirlaticilar.ts");
const { fikirlerKaydi } = await import("../src/fikirler.ts");
const { makinistKaydi } = await import("../src/makinist.ts");
const { SinyallerAgaci } = await import("../src/sinyaller.ts");

const EKLENTI_KOKU = fileURLToPath(new URL("..", import.meta.url));
const ORNEK_CATI = fileURLToPath(new URL("../../../ogreti/ornek/calisma_alani", import.meta.url));

// ── SAF ÇEKİRDEK ────────────────────────────────────────────────────────────

test("PNL-A08 · kapının kararı yalnız Adımı geliştirmede ya da doğrulanmamışken bugün verilebilir; beklemedeki kapı sayılmaz", () => {
  assert.deepEqual([...KARAR_DURUMLARI].sort(), ["doğrulanmamış", "geliştirmede"]);
  for (const durum of ["geliştirmede", "doğrulanmamış"]) assert.ok(kararBugunVerilir({ durumMetin: durum }), durum);
  for (const durum of ["beklemede", "tamamlandı", ""]) assert.ok(!kararBugunVerilir({ durumMetin: durum }), durum);
});

test("PNL-A08 · acil toplam üç parçanın toplamıdır; proje payları birleşince toplam korunur, sıfır pay düşer, sıra çoktan aza", () => {
  assert.equal(acilToplami({ onay: 2, dur: 3, atesmis: 4 }), 9);
  const birlesik = paylariBirlestir(adaGoreSay(["b", "a", "b"]), [{ ad: "a", adet: 2 }, { ad: "c", adet: 0 }], [{ ad: "d", adet: 3 }]);
  assert.deepEqual(birlesik, [{ ad: "a", adet: 3 }, { ad: "d", adet: 3 }, { ad: "b", adet: 2 }]);
  assert.equal(payToplami(birlesik), 8);
  assert.ok(dokulur({ ad: "x", tur: "cati" }) && dokulur({ ad: "x", tur: "alan" }) && !dokulur({ ad: "x", tur: "proje" }) && !dokulur(undefined));
});

// ── PANEL: DIŞ ROZET VE MAKİNİST GRUBU ──────────────────────────────────────

const ONAYLI_OLCUT = `"Tasarım Founder tarafından onaylanmıştır — onaysız uygulanmaz"`;
const plan = (adimlar: Array<[string, string]>): string =>
  `Faz( kod: F1, ad: "deneme dönemi" ) {\n  Blok( kod: B1, ad: "deneme işi" ) {\n    Katman( kod: KT1, ad: "deneme teknolojisi" ) {\n` +
  adimlar.map(([kod, durum]) => `      Adım( kod: ${kod}, onayBekler: founder, durum: ${durum}, ne: "${kod} işi", kabul: [ ${ONAYLI_OLCUT} ] )\n`).join("") +
  `    }\n  }\n}\n`;
const kapiKayitlari = (dosya: string, adimlar: Array<[string, string]>): KapiKaydi[] =>
  onayKapilariTopla(ayristir(belirtecle(plan(adimlar))).bildirimler).map((kapi) => ({ dosya, kapi }));

const SARMAL = { kod: "PRJ-S", ad: "Sarmal" };
const ORK = { kod: "PRJ-O", ad: "Orkestrasyon" };
const kayit = (kod: string, duzey: string, proje: { kod: string; ad: string }, satir: number, mesaj = `${kod} kaydı`): YuzeyKaydi =>
  ({ proje, dosya: `/c/${proje.ad}/plan.sar`, tani: { kod, duzey, mesaj, satir, sutun: 1 } }) as YuzeyKaydi;
/** Hatırlatıcı kaydı: ileti düğüm kimliğini taşır (aynı düğümün iki tanısı tek satıra iner). */
const htr = (kod: string, proje: { kod: string; ad: string }, dugum: string, satir: number): YuzeyKaydi =>
  kayit(kod, "bilgi", proje, satir, `"${dugum}" hatırlatıcısı`);

interface Baglam { subscriptions: { dispose(): unknown }[]; extensionUri: unknown; extensionPath: string; extension: unknown;
  workspaceState: { get(k: string): unknown; update(k: string, v: unknown): Promise<void> } }
const baglamlar: Baglam[] = [];
beforeEach(() => kabukSifirla());
afterEach(() => { for (const b of baglamlar.splice(0)) for (const d of b.subscriptions) d.dispose(); });

/** Gerçek Onaylar defteri, gerçek Hatırlatıcılar, gerçek Sinyaller ağacı ve gerçek panel; kapsam çatıdır. */
function panelKur() {
  const baglam: Baglam = {
    subscriptions: [], extensionUri: Uri.file(EKLENTI_KOKU), extensionPath: EKLENTI_KOKU, extension: { packageJSON: {} },
    workspaceState: { get: () => undefined, update: async () => {} },
  };
  baglamlar.push(baglam);
  const onay = onayPaneliKaydi(baglam as never);
  const hatirlaticilar = hatirlaticilarKaydi(baglam as never);
  const fikirler = fikirlerKaydi(baglam as never);
  const makinist = makinistKaydi(baglam as never, { onayPaneli: onay, hatirlaticilar, fikirler });
  const sinyaller = new SinyallerAgaci(Uri.file(EKLENTI_KOKU) as never);
  const yol = new YolHaritasi();
  const graf = new MiniGrafGorunumu(() => undefined);
  const yuz = { saglayici: yol, miniGraf: graf, panelBagla() { /* yok */ }, diliTazele() { /* yok */ }, kodlar: () => [], gorunurMu: () => true };
  let kapsam = { ad: "ornek_cati", tur: "cati" as "cati" | "proje" };
  const panel = panelKaydi(baglam as never, {
    yol: yuz as never, tren: new Tren(), makinist, sinyaller,
    kapsam: { oku: () => kapsam, projeAdi: (dosya: string) => (dosya.includes("/Orkestrasyon/") ? ORK.ad : SARMAL.ad) },
  });
  const gorunum = new SahteWebviewGorunusu();
  (kabuk.webviewSaglayicilari.get(GORUNUS_PANEL) as { resolveWebviewView(g: unknown): void }).resolveWebviewView(gorunum);
  return { onay, hatirlaticilar, makinist, sinyaller, panel, gorunum, kapsamYaz: (k: typeof kapsam) => { kapsam = k; } };
}

test("PNL-A08 · dış rozet onay + Dur + ateşlemiş hatırlatıcıdır; uyuyan hatırlatıcı ve Dikkat onu değiştirmez; beklemedeki kapı artırmaz, geliştirmedeki artırır; ipucu üç sayıyı ve çatının proje dökümünü yazar", () => {
  const o = panelKur();
  const rozet = () => o.gorunum.badge as { value: number; tooltip: string } | undefined;
  // Bir bugünkü kapı (Sarmal), iki beklemedeki kapı (Orkestrasyon).
  o.onay.yerlestirHepsi([...kapiKayitlari("/c/Sarmal/plan.sar", [["S1", "geliştirmede"]]), ...kapiKayitlari("/c/Orkestrasyon/plan.sar", [["O1", "beklemede"], ["O2", "beklemede"]])]);
  // İki Dur (biri her projede), üç Dikkat, bir Bilgi.
  o.sinyaller.yerlestir([kayit("x-hata", "hata", SARMAL, 1), kayit("x-hata", "hata", ORK, 2),
    ...[3, 4, 5].map((s) => kayit("x-uyari", "uyarı", SARMAL, s)), kayit("x-bilgi", "bilgi", SARMAL, 6)], SARMAL.kod);
  // Bir ateşlemiş (Orkestrasyon), iki uyuyan hatırlatıcı.
  o.hatirlaticilar.yerlestir([htr("ateşlemiş-hatırlatıcı", ORK, "HTR-B", 7), htr("açık-hatırlatıcı", SARMAL, "HTR-A", 8), htr("açık-hatırlatıcı", ORK, "HTR-C", 9)]);
  assert.equal(o.makinist.onaySayisi, 1, "onay sayacı beklemedeki kapıyı saydı");
  assert.equal(o.makinist.atesmisSayisi, 1);
  assert.equal(rozet()?.value, 1 + 2 + 1, `dış rozet acil toplamı değil: ${JSON.stringify(rozet())}`);
  const ipucu = rozet()!.tooltip.split("\n");
  assert.deepEqual(ipucu.slice(0, 2), ["ornek_cati çatısı: 4 acil iş", "1 onay bekleyen kapı · 2 Dur sinyali · 1 ateşlemiş hatırlatıcı"]);
  // Çatıda sayı proje proje dökülür ve döküm sayıyla tutar.
  assert.deepEqual(ipucu.slice(2), ["Projelere göre:", "  Orkestrasyon: 2", "  Sarmal: 2"]);
  assert.deepEqual(o.panel.olcumler().rozet, { deger: 4, ipucu: rozet()!.tooltip, onay: 1, dur: 2, atesmis: 1 });
  // Uyuyan hatırlatıcı ve Dikkat eklenir: rozet değişmez.
  o.hatirlaticilar.yerlestir([htr("ateşlemiş-hatırlatıcı", ORK, "HTR-B", 7), htr("açık-hatırlatıcı", SARMAL, "HTR-A", 8), htr("açık-hatırlatıcı", ORK, "HTR-C", 9), htr("açık-hatırlatıcı", ORK, "HTR-D", 10)]);
  o.sinyaller.yerlestir([kayit("x-hata", "hata", SARMAL, 1), kayit("x-hata", "hata", ORK, 2),
    ...[3, 4, 5, 11, 12].map((s) => kayit("x-uyari", "uyarı", SARMAL, s)), kayit("x-bilgi", "bilgi", SARMAL, 6)], SARMAL.kod);
  assert.equal(rozet()?.value, 4, "uyuyan hatırlatıcı ya da Dikkat dış rozeti değiştirdi");
  // Üçüncü beklemedeki kapı rozeti artırmaz; kapının Adımı geliştirmeye geçince artırır.
  o.onay.yerlestirDosya("/c/Orkestrasyon/plan.sar", onayKapilariTopla(ayristir(belirtecle(plan([["O1", "beklemede"], ["O2", "beklemede"], ["O3", "beklemede"]]))).bildirimler));
  assert.equal(rozet()?.value, 4, "beklemedeki kapı dış rozeti artırdı");
  assert.equal(o.makinist.onaySayisi, 1, "beklemedeki kapı onay sayacını artırdı");
  o.onay.yerlestirDosya("/c/Orkestrasyon/plan.sar", onayKapilariTopla(ayristir(belirtecle(plan([["O1", "geliştirmede"], ["O2", "beklemede"], ["O3", "beklemede"]]))).bildirimler));
  assert.equal(o.makinist.onaySayisi, 2, "geliştirmedeki kapı onay sayacını artırmadı");
  assert.equal(rozet()?.value, 5, "geliştirmedeki kapı dış rozeti artırmadı");
  // Makinist: beklemedeki kapılar Onaylar'ın altındaki kapalı "İleride onay isteyecek" grubunda.
  const kokler = o.makinist.getChildren() as Array<{ grup: string }>;
  assert.deepEqual(kokler.map((k) => k.grup), ["onaylar", "ileride", "hatirlaticilar", "fikirler"]);
  const ileride = o.makinist.getTreeItem(kokler[1]);
  assert.deepEqual([ileride.label, ileride.description, ileride.collapsibleState], ["İleride onay isteyecek", "2", 1]);
  // Tek proje kapsamında döküm yoktur ve kapsam projenin adıyla yazılır.
  o.kapsamYaz({ ad: "Sarmal", tur: "proje" });
  o.panel.rozetiTazele();
  assert.deepEqual(rozet()!.tooltip.split("\n"), ["Sarmal projesi: 5 acil iş", "2 onay bekleyen kapı · 2 Dur sinyali · 1 ateşlemiş hatırlatıcı"]);
  // Acil iş yoksa rozet yoktur (alarm susar).
  o.onay.yerlestirHepsi([]);
  o.sinyaller.yerlestir([kayit("x-uyari", "uyarı", SARMAL, 3)], SARMAL.kod);
  o.hatirlaticilar.yerlestir([htr("açık-hatırlatıcı", SARMAL, "HTR-A", 8)]);
  assert.equal(rozet(), undefined, "acil iş yokken dış rozet görünüyor");
});

// ── GERÇEK GİRİŞ: DURUM ÇUBUĞU KAPSAMI ADIYLA YAZAR ─────────────────────────

const acik: EtkinEklenti[] = [];
after(() => { for (const e of acik.splice(0)) e.kapat(); kabukTemizle(); });
const bekle = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
/** Durum çubuğunun görünen girdileri: metin ve düz ipucu. */
const girdiler = (e: EtkinEklenti): Array<{ text: string; ipucu: string }> =>
  e.kayit.durumOgeleri.filter((o) => !o.atildi && o.gorunur).map((o) => ({ text: o.text, ipucu: String(o.tooltip ?? "") }));
/** Girdinin gösterdiği sayı: metindeki sayıların toplamı (Dur ve Dikkat girdisi iki sayı basar). */
const sayisi = (text: string): number => [...text.matchAll(/\d+/g)].reduce((t, m) => t + Number(m[0]), 0);

test("PNL-A08 · aynı çatıda farklı dosyalar açıkken durum çubuğunun her sayısı kapsamını adıyla taşır; çatıda sayı proje proje dökülür ve döküm sayıyla tutar; onay sayacı beklemedeki kapıyı saymaz", async () => {
  const kok = geciciAlan("sarmal-kapsam-sayaci-");
  cpSync(ORNEK_CATI, kok, { recursive: true });
  // İki projede onay kapıları: her projede biri bugün (geliştirmede ya da doğrulanmamış); beklemedekiler ileride.
  writeFileSync(join(kok, "site", "plan", "onay_plani.sar"), plan([["SIT-ONAY-A01", "geliştirmede"], ["SIT-ONAY-A02", "beklemede"], ["SIT-ONAY-A03", "beklemede"]]), "utf8");
  writeFileSync(join(kok, "acik_arac", "plan", "onay_plani.sar"), plan([["ARC-ONAY-A01", "doğrulanmamış"], ["ARC-ONAY-A02", "beklemede"]]), "utf8");
  const e = etkinlestir({ klasorler: [kok], etkinDosya: join(kok, "site", "plan", "anlatim_plani.sar") });
  acik.push(e);
  await e.turBekle();
  await bekle(400);
  const projede = girdiler(e);
  assert.ok(projede.length >= 4, `durum çubuğunda girdi yok: ${JSON.stringify(projede)}`);
  for (const g of projede) assert.match(g.ipucu, /site projesi/, `"${g.text}" sayısı kapsamını adıyla yazmıyor: ${g.ipucu}`);
  const onayGirdisi = (x: EtkinEklenti) => girdiler(x).find((g) => g.text.startsWith("$(mail)"))!;
  assert.equal(onayGirdisi(e).text, "$(mail) 1", "projedeki onay sayacı beklemedeki kapıyı saydı ya da bugünkü kapıyı saymadı");
  // Çatının dosyası açılınca: kapsam çatıdır, sayılar proje proje dökülür ve döküm sayıyla tutar.
  e.editorDegistir(join(kok, "calisma_alani_anadizin.sar"));
  await bekle(400);
  const catida = girdiler(e);
  for (const g of catida) {
    assert.match(g.ipucu, /ornek_cati çatısı/, `"${g.text}" çatı sayısı kapsamını adıyla yazmıyor: ${g.ipucu}`);
    const dokum = [...g.ipucu.matchAll(/^ {2}(.+): (\d+)$/gm)].reduce((t, m) => t + Number(m[2]), 0);
    assert.equal(dokum, sayisi(g.text), `"${g.text}" çatı sayısının proje dökümü sayıyla tutmuyor: ${g.ipucu}`);
  }
  assert.equal(onayGirdisi(e).text, "$(mail) 2", "çatının onay sayacı iki bugünkü kapıyı saymadı");
  assert.match(onayGirdisi(e).ipucu, /^ {2}acik_arac: 1$/m);
  assert.match(onayGirdisi(e).ipucu, /^ {2}site: 1$/m);
});

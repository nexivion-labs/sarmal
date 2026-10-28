/**
 * PNL-A13 · Kardeş Eklenti Yuvası: Tren'in Canlı yuvasının sözleşmesi (tren-yuvasi.ts), Canlı kabının
 * HTML'i (panel-cekirdek.ts `trenCanliHtml`) ve Canlı betiğinin güvenlik noktaları.
 *
 * Kardeş sınamalarda yalnız "sahte kardeş" diye anılır; kapalı tarafın adı, mimarisi ya da protokolü
 * burada geçmez. Panelle bütünleşme panel.test.ts'de, gerçek VS Code'daki sahte kardeş
 * sinama_vscode/suite/tren-yuvasi.test.ts'dedir.
 */
import "./dil-kur.ts";
import "./kabuk-kur.ts";
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as sahte from "./vscode-sahtesi.ts";
import type { CanliEylemi } from "../src/tren-yuvasi.ts";
import { trenCanliHtml } from "../src/panel-cekirdek.ts";
import { TREN_CANLI_BETIGI } from "../src/tren-canli-betik.ts";
import { TREN_METINLERI } from "../src/yuzey-metinleri.ts";
// vscode modülünü içe alan dosya, kabuk kurulduktan sonra yüklenir.
const { CANLI_GOVDE_SINIRI, TrenYuvasi } = await import("../src/tren-yuvasi.ts");
type TrenYuvasi = InstanceType<typeof TrenYuvasi>;

const SINAMA_DIZINI = dirname(fileURLToPath(import.meta.url));
const EKLENTI_KOKU = join(SINAMA_DIZINI, "..");
const KARDES = { kimlik: "sahte.kardes", ad: "Sahte Kardeş", kok: "/sahte/kardes" };
const yuvaKur = (): TrenYuvasi => new TrenYuvasi(EKLENTI_KOKU, () => KARDES);

afterEach(() => { sahte.extensions.all.length = 0; });

test("PNL-A13 yuva: sürümlü ve tek kayıtlı; ikinci kayıt reddedilir, bırakılınca yuva yeniden açılır", () => {
  const y = yuvaKur();
  assert.equal(y.al(2), undefined, "bilinmeyen sürüm bir yüz döndürmemeli");
  const api = y.al(1)!;
  assert.equal(api.surum, 1);
  const olaylar: string[] = [];
  y.degisti((t) => olaylar.push(t));
  const k = api.canliKaydet({ html: "<p>bir</p>" });
  assert.deepEqual([y.canliVar(), y.canliHtml(), y.olcumler().sahip], [true, "<p>bir</p>", "sahte.kardes"]);
  assert.ok(y.canliIpucu().includes("Sahte Kardeş"), "ipucu kaydı yapanın adını taşımalı");
  assert.throws(() => api.canliKaydet({ html: "x" }), { message: TREN_METINLERI.canliReddi("dolu") });
  assert.equal(y.canliHtml(), "<p>bir</p>", "reddedilen kayıt var olanı değiştirmemeli");
  k.dispose();
  k.dispose();
  assert.deepEqual(olaylar, ["kayit", "kayit"], "çift bırakma tek olay doğurmalı");
  assert.equal(y.canliVar(), false);
  const k2 = api.canliKaydet({});
  assert.equal(y.canliHtml(), "");
  k.dispose();
  assert.equal(y.canliVar(), true, "eski kaydın tutacağı yeni kaydı düşürmemeli");
  k2.dispose();
});

test("PNL-A13 yuva: gövde yalnız sınırlı düz metindir; güncelleme yalnız gövde olayı doğurur, bırakılmış tutacak sessizdir", () => {
  const y = yuvaKur();
  const api = y.al(1)!;
  assert.throws(() => api.canliKaydet({ html: 42 as never }), { message: TREN_METINLERI.canliReddi("govde-tur") });
  assert.throws(() => api.canliKaydet({ html: "x".repeat(CANLI_GOVDE_SINIRI + 1) }), { message: TREN_METINLERI.canliReddi("govde-buyuk") });
  assert.equal(y.canliVar(), false, "reddedilen gövde kayıt bırakmamalı");
  const k = api.canliKaydet({ html: "a" });
  const olaylar: string[] = [];
  y.degisti((t) => olaylar.push(t));
  k.guncelle("b");
  assert.throws(() => k.guncelle("x".repeat(CANLI_GOVDE_SINIRI + 1)));
  assert.throws(() => k.guncelle(null as never));
  assert.deepEqual([y.canliHtml(), olaylar, y.olcumler().guncelleme], ["b", ["govde"], 1]);
  k.dispose();
  k.guncelle("c");
  assert.deepEqual([y.canliHtml(), olaylar], ["", ["govde", "kayit"]]);
});

test("PNL-A13 yuva: kaydı yapan eklenti çağrı yığınından okunur; yuvanın kendi eklentisi kayıt yapamaz", () => {
  // Kendi kökü altındaki kareler sayılmaz; başka hiçbir eklenti yığında yoksa kayıt reddedilir.
  const y = new TrenYuvasi(EKLENTI_KOKU);
  assert.throws(() => y.al(1)!.canliKaydet({ html: "x" }), { message: TREN_METINLERI.canliReddi("sahip-yok") });
  // Bu sınama dosyasının dizini, kendi kökünün içinde daha derin köklü bir eklenti gibi ilan edilir.
  sahte.extensions.all.push({ id: "sahte.kardes", extensionPath: SINAMA_DIZINI, packageJSON: { displayName: "Sahte Kardeş" } });
  const k = y.al(1)!.canliKaydet({ html: "x" });
  assert.deepEqual([y.olcumler().sahip, y.canliIpucu().includes("Sahte Kardeş")], ["sahte.kardes", true]);
  // Sahibi kaldırılan kayıt düşer; sahibi duran kayıt durur.
  assert.equal(y.sahipsiziDusur(new Set(["sahte.kardes"])), false);
  assert.equal(y.sahipsiziDusur(new Set()), true);
  assert.equal(y.canliVar(), false);
  k.dispose();
});

test("PNL-A13 yuva: görünürlük yalnız değişince bildirilir; eylem süzülür ve kardeşin hatası yuvayı bozmaz", () => {
  const y = yuvaKur();
  const eylemler: CanliEylemi[] = [];
  let at = false;
  const k = y.al(1)!.canliKaydet({ html: "x", eylem: (e) => { eylemler.push(e); if (at) throw new Error("kardeş hatası"); } });
  const gor: boolean[] = [];
  k.gorunurlukDegisti((v) => gor.push(v));
  y.gorunurlukYaz(true); y.gorunurlukYaz(true); y.gorunurlukYaz(false);
  assert.deepEqual(gor, [true, false]);
  y.gorunurlukYaz(true);
  assert.equal(k.gorunurMu, true);
  for (const kotu of [undefined, null, 7, {}, { eylem: "" }, { eylem: 5 }, { eylem: "x".repeat(201) }]) y.eylem(kotu);
  y.eylem({ eylem: "ac", deger: "d".repeat(5000) });
  y.eylem({ eylem: "kapat", deger: 9 });
  at = true;
  assert.doesNotThrow(() => y.eylem({ eylem: "patla" }));
  assert.deepEqual(eylemler.map((e) => [e.eylem, e.deger?.length]), [["ac", 2000], ["kapat", undefined], ["patla", undefined]]);
  assert.equal(y.olcumler().eylem, 3);
  k.dispose();
  assert.equal(k.gorunurMu, false, "bırakılmış kayıt görünür sayılmamalı");
  y.eylem({ eylem: "sonra" });
  assert.equal(eylemler.length, 3, "kayıt yokken eylem kardeşe gitmemeli");
});

test("PNL-A13 Canlı kabı: gövde ve ipucu HTML olarak yorumlanmaz; gövde gölge köke yazılır ve tıklama yalnız data-eylem taşır", () => {
  const h = trenCanliHtml({ html: "</div><script>alert(1)</script><b data-eylem=\"x\">", ipucu: "\"><img src=x onerror=1>" });
  assert.ok(!/<script|<img|<b /.test(h), h);
  assert.ok(h.includes("&lt;/div&gt;&lt;script&gt;"), "gövde öğe metni olarak taşınmalı");
  assert.ok(h.includes('title="&quot;&gt;&lt;img'), "ipucu nitelik içinde kaçırılmalı");
  assert.match(h, /data-tren-gorunum="plan" aria-selected="true"/, "Plan görünümü seçili doğmalı (Canlı kendiliğinden seçilmez)");
  assert.match(h, /data-tren-gorunum="canli" aria-selected="false"/);
  // Betik: gövde yalnız gölge köke yazılır; eylem iletisi yalnız eylem ve değer taşır.
  const innerler = [...TREN_CANLI_BETIGI.matchAll(/(\w+)\.innerHTML\s*=/g)].map((m) => m[1]);
  assert.deepEqual(innerler, ["kok"], "innerHTML yalnız gölge köke yazılmalı");
  assert.ok(/var kok = ev\.shadowRoot \|\| ev\.attachShadow\(/.test(TREN_CANLI_BETIGI), "gövdenin kabı gölge kök olmalı");
  assert.ok(/getElementById\('tren-canli-veri'\)\.textContent|\.textContent/.test(TREN_CANLI_BETIGI), "ilk gövde öğe metninden okunmalı");
  assert.ok(/kopru\.gonder\(\{ tip: 'trenCanliEylem', eylem: n\.getAttribute\('data-eylem'\), deger: n\.getAttribute\('data-deger'\) \|\| undefined \}\)/.test(TREN_CANLI_BETIGI));
});

// etki.test.ts — 💥 etki-analizi çekirdeği (YUZ-3 · test yoğunlaşması oturum-35).
//   MCP `etki` aracı e2e'de sınanıyordu; saf çekirdek (etkiCoz/etkiMetni) burada
//   doğrudan sınanır: doğrudan/geçişli ayrımı · topolojik sıra · dürüst boş-durum.
import { test } from "node:test";
import assert from "node:assert/strict";
import { belirtecle } from "../src/belirtec.ts";
import { ayristir } from "../src/ayristirici.ts";
import { dagKur } from "../src/dag.ts";
import { etkiCoz, etkiMetni } from "../src/etki.ts";

const SAR = `
Blok( kod: BLK-E ){
  Katman( kod: KAT-E ){
    Adım( kod: ADM-E1, ne: "temel", durum: tamamlandı )
    Adım( kod: ADM-E2, ne: "orta", bağımlı: [ ADM-E1 ], durum: geliştirmede )
    Adım( kod: ADM-E3, ne: "uç", bağımlı: [ ADM-E2 ] )
    Adım( kod: ADM-E4, ne: "yan", bağımlı: [ ADM-E1 ] )
  }
}
`;
const dag = () => dagKur(new Map([["e.sar", ayristir(belirtecle(SAR))]]));

test("etkiCoz: doğrudan (birinci halka) ile geçişli (ikinci+) ayrışır, topolojik sırada", () => {
  const e = etkiCoz(dag(), "ADM-E1")!;
  assert.deepEqual([...e.dogrudan].sort(), ["ADM-E2", "ADM-E4"]);
  assert.deepEqual(e.gecisli, ["ADM-E3"], "E3 yalnız E2 üzerinden — geçişli");
  const orta = etkiCoz(dag(), "ADM-E2")!;
  assert.deepEqual(orta.dogrudan, ["ADM-E3"]);
  assert.deepEqual(orta.gecisli, []);
});

test("etkiCoz: bekleyeni olmayan düğüm boş döner (boş ≠ hata); bilinmeyen KOD undefined", () => {
  const uc = etkiCoz(dag(), "ADM-E3")!;
  assert.deepEqual([uc.dogrudan.length, uc.gecisli.length], [0, 0]);
  assert.equal(etkiCoz(dag(), "ADM-YOK"), undefined);
});

test("etkiMetni: rozetli insan yüzü — sayılar + dürüst boş-durum + bilinmeyen KOD önerisi", () => {
  const m = etkiMetni(dag(), "ADM-E1");
  assert.match(m, /Doğrudan bekleyenler \(2\)/);
  assert.match(m, /Geçişli bekleyenler \(1\)/);
  assert.match(m, /Toplam 3 düğüm/);
  assert.match(etkiMetni(dag(), "ADM-E3"), /bekleyen yok — etki bu düğümle sınırlı/);
  assert.match(etkiMetni(dag(), "ADM-YOK"), /grafikte yok/);
});

// ── HTR-A02 (IDA dogfood oturum-2 · BUG-2): hatırlat yumuşak-kenar etki'de ───
const HSAR = `
Katman( kod: KAT-H ){
  Adım( kod: ADM-H1, ne: "hedef", bağımlı: [] )
  Adım( kod: ADM-H2, ne: "ardıl", bağımlı: [ ADM-H1 ] )
}
Hatırlatıcı( kod: HTR-X, durum: kararlaştı, çapa: mimari, hatırlat: ADM-H1, ne: "gözden geçir" )
`;
const hdag = () => dagKur(new Map([["h.sar", ayristir(belirtecle(HSAR))]]));

test("HTR-A02 etki: hatırlat-bağı AYRI bölümde; topolojik ardıl SAYIMI değişmez", () => {
  const e = etkiCoz(hdag(), "ADM-H1")!;
  assert.deepEqual(e.hatırlatBaglari, ["HTR-X"], "ADM-H1'e hatırlat eden HTR-X hatırlat-bağında");
  assert.deepEqual(e.dogrudan, ["ADM-H2"], "topolojik doğrudan ardıl HTR'den ETKİLENMEDİ");
  assert.equal(e.gecisli.length, 0);
  // HTR-X kendisi bir sıra düğümü değil — ADM-H1'in ardılı DEĞİL (yumuşak kenar)
  assert.ok(!e.dogrudan.includes("HTR-X") && !e.gecisli.includes("HTR-X"), "HTR yumuşak-kenar, sıraya girmez");
});

test("HTR-A02 etkiMetni: 🔔 Hatırlat-bağı bölümü basılır (topolojik sıra dışı etiketli)", () => {
  const m = etkiMetni(hdag(), "ADM-H1");
  assert.match(m, /🔔 Hatırlat-bağı \(1/, "hatırlat-bağı bölümü");
  assert.match(m, /HTR-X/);
  assert.match(m, /topolojik sıra dışı/, "yumuşak-kenar açıkça işaretli");
});

test("HTR-A02 dag: hatırlat yumuşak-kenar oncekiler/sonrakiler'e GİRMEZ (sıra saf kalır)", () => {
  const d = hdag();
  const h1 = d.dugumler.get("ADM-H1")!;
  assert.deepEqual(h1.hatırlatanlar, ["HTR-X"], "gelen yumuşak-kenar işaretli");
  assert.ok(!h1.oncekiler.includes("HTR-X") && !h1.sonrakiler.includes("HTR-X"), "topolojik listelere GİRMEZ");
  const htr = d.dugumler.get("HTR-X")!;
  assert.deepEqual(htr.hatırlatıyor, ["ADM-H1"], "kaynağın gideni işaretli");
});

// ── PRF-A05 saha bulgusu 2 (🐢 ~950 ms/Adım): hazır-sıra enjeksiyonu ──────────
test("PRF-A05 etkiCoz: hazirSira enjeksiyonu sonucu DEĞİŞTİRMEZ (yerinde hesapla birebir)", async () => {
  const { topolojikSira } = await import("../src/dag.ts");
  const d = hdag();
  const { sira } = topolojikSira(d);
  for (const kod of d.dugumler.keys()) {
    assert.deepEqual(etkiCoz(d, kod, sira), etkiCoz(d, kod),
      `'${kod}' için enjekte-sıra ile yerinde-hesap aynı sonucu vermeli`);
  }
});

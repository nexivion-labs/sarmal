// ═══════════════════════════════════════════════════════════════════════════
// graf-ozet-kipi.test.ts — 🕸️ BKM-MCP-A03 · graf çıktısının istemci sınırına sığması
//
//   Ölçülen kusur: ilk dış kullanıcı 2026-09-05 tarihinde `graf` çıktısının
//   55.916 karakterle istemci sınırını aşıp dosyaya düştüğünü ve yalnız
//   kuyruğunu okuyabildiğini bildirmiştir. Bu depoda tam graf 2026-09-10
//   tarihinde 436.698 karakter ölçülmüştür. Sınırı aşan bir cevap cevap değildir.
//
//   Nöbet ALTI YÜZ Adımlık bir fikstürle koşar: varsayılan çıktı sınırın altında
//   kalmak, ayrıntı istendiğinde tam çıktı gelmek zorundadır.
// ═══════════════════════════════════════════════════════════════════════════
import { test } from "node:test";
import assert from "node:assert/strict";
import { belirtecle } from "../src/belirtec.ts";
import { ayristir } from "../src/ayristirici.ts";
import { dagKur } from "../src/dag.ts";
import { grafCikar, grafOzetYuzu, grafYuz } from "../src/graf.ts";

/** İstemcilerin pratik sınırı — dış kullanıcının aştığı eşiğin altında tutulur. */
const ISTEMCI_SINIRI = 25_000;

/** Altı yüz Adımlık fikstür: on Blok × on Katman × altı Adım. */
function buyukFikstur(): Map<string, ReturnType<typeof ayristir>> {
  const parcalar: string[] = ['Proje( kod: PRJ-BUYUK, ad: "buyuk", rejim: esnek, ne: "altı yüz Adımlık ölçek fikstürü" ) {'];
  parcalar.push('  Teknoloji( kod: TEK-B, ne: "fikstür teknolojisi" )');
  for (let b = 1; b <= 10; b++) {
    parcalar.push(`  Blok( kod: BLK-${b}, ad: "blok ${b}", ne: "ölçek fikstürü bloku ${b}" ) {`);
    for (let k = 1; k <= 10; k++) {
      parcalar.push(`    Katman( kod: KAT-${b}-${k}, ad: "katman ${k}", teknolojiBağımsız: "ölçek fikstürü", ne: "katman ${k}" ) {`);
      for (let a = 1; a <= 6; a++) {
        parcalar.push(`      Adım( kod: ADM-${b}-${k}-${a}, durum: beklemede, ne: "ölçek fikstürü adımı ${b}.${k}.${a}" )`);
      }
      parcalar.push("    }");
    }
    parcalar.push("  }");
  }
  parcalar.push("}");
  const program = ayristir(belirtecle(parcalar.join("\n")));
  return new Map([["buyuk_anadizin.sar", program]]);
}

test("BKM-MCP-A03: altı yüz Adımlık fikstürde VARSAYILAN çıktı istemci sınırının ALTINDA kalır", () => {
  const dag = dagKur(buyukFikstur());
  const g = grafCikar(dag);
  assert.ok(g, "fikstür graf üretmeli");
  const adimSayisi = g.düğümler.filter((d) => d.tip === "Adım").length;
  assert.equal(adimSayisi, 600, `fikstürün zemini: altı yüz Adım bekleniyordu, ${adimSayisi} geldi`);

  const tam = grafYuz(dag) ?? "";
  assert.ok(tam.length > ISTEMCI_SINIRI,
    `nöbetin zemini çökmüş: tam çıktı (${tam.length}) sınırın altında kalıyorsa özet kipi hiçbir şey kanıtlamaz`);

  const ozet = grafOzetYuzu(g);
  assert.ok(ozet.length < ISTEMCI_SINIRI,
    `özet çıktı sınırı aştı: ${ozet.length} karakter (sınır ${ISTEMCI_SINIRI}) — istemci onu dosyaya düşürür`);
  // Özet, karneyi ve kök kademesini TAŞIMAK zorundadır; kırpılmış ama boş bir
  // cevap sınırı geçer ve hiçbir soruya cevap vermez.
  assert.match(ozet, /📋 Karne:/u, "özet karneyi taşımalı");
  assert.match(ozet, /🌱 KÖK KADEMESİ/u, "özet kök kademesini taşımalı");
  assert.match(ozet, /PRJ-BUYUK/u, "kök düğüm özette görünmeli");
  assert.match(ozet, /Adım 600/u, "tip dökümü gerçek sayıyı vermeli");
  assert.match(ozet, /AYRINTI/u, "özet, ayrıntının nasıl istendiğini söylemeli");
});

test("BKM-MCP-A03: AYRINTI kök koduyla istendiğinde tam alt-graf gelir (serileştirici değişmedi)", () => {
  const dag = dagKur(buyukFikstur());
  const altGraf = grafYuz(dag, "BLK-3");
  assert.ok(altGraf, "kök kodu verilince alt-graf dönmeli");
  assert.match(altGraf, /"kök": "BLK-3"/u, "alt-graf odak düğümü bildirmeli");
  assert.match(altGraf, /"ADM-3-1-1"/u, "alt-graf kökün kapsadıklarını taşımalı");
  assert.doesNotMatch(altGraf, /"ADM-7-1-1"/u, "alt-graf başka Blokun Adımlarını taşımamalı");
  // Tam graf yüzü OLDUĞU GİBİ durur — bu Adımın sınırı serileştiriciye dokunmamaktır.
  const tam = grafYuz(dag) ?? "";
  assert.match(tam, /"düğümler"/u, "tam JSON yüzü korunmalı");
  assert.ok(JSON.parse(tam), "tam çıktı geçerli JSON olmalı");
});

test("BKM-MCP-A03: özet kipi kopuk uçları gizlemez (dürüst çıktı)", () => {
  const program = ayristir(belirtecle(
    'Proje( kod: PRJ-K, ad: "k", rejim: esnek, ne: "kopuk uç fikstürü" ) {\n'
    + '  Adım( kod: ADM-K, durum: beklemede, bağımlı: [ ADM-YOK-BOYLE ], ne: "kopuk uçlu adım" )\n}'));
  const g = grafCikar(dagKur(new Map([["k_anadizin.sar", program]])));
  assert.ok(g);
  assert.ok(g.kopuk.length >= 1, "fikstürün zemini: en az bir kopuk uç doğmalı");
  const ozet = grafOzetYuzu(g);
  assert.match(ozet, /🔌 KOPUK UÇLAR/u, "özet kopuk uçları bildirmeli — gizlenen kopuk sahte tamlık üretir");
  assert.match(ozet, /ADM-YOK-BOYLE/u, "kopuk ucun hedefi özette görünmeli");
});

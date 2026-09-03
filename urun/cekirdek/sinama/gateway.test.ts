// Gateway araç-izin kapısı sınamaları (node:test) — RAY-3 Aşama 4 · Gateway-RAY · SEF-L3-K6.
// STR-3: mekanizma (fail-closed lookup) AÇIK; matris hücreleri GİZLİ enjekte (testte mock).
import { test } from "node:test";
import assert from "node:assert/strict";
import { belirtecle } from "../src/belirtec.ts";
import { ayristir } from "../src/ayristirici.ts";
import {
  beyanÇöz, araçİzinDenetle, gatewayGrafDenetle, MODLAR,
} from "../src/gateway.ts";
import type { Mod, İzinMatrisi } from "../src/gateway.ts";

// Enjekte GİZLİ matris örneği: ETM-X → MCP-PG:{oku}, MCP-FS:{oku,yaz}
const matris: İzinMatrisi = new Map([
  ["ETM-X", new Map<string, ReadonlySet<Mod>>([
    ["MCP-PG", new Set<Mod>(["oku"])],
    ["MCP-FS", new Set<Mod>(["oku", "yaz"])],
  ])],
]);
const beyan = beyanÇöz(["MCP-PG:oku", "MCP-FS:yaz"]);

test("① beyanÇöz — 'ARAÇ:mod' çiftlerine çözer, biçimsiz/geçersiz-mod atlar", () => {
  assert.deepEqual(beyanÇöz(["MCP-PG:oku", "MCP-FS:yaz"]), [
    { araç: "MCP-PG", mod: "oku" }, { araç: "MCP-FS", mod: "yaz" },
  ]);
  assert.deepEqual(beyanÇöz(["biçimsiz", "MCP-Z:uçmak", ":oku", "MCP-A:"]), [], "geçersizler atlanır");
  assert.equal(MODLAR.length, 3);
});

test("② fail-closed — BOŞ_MATRIS (varsayılan) → beyan olsa bile her araç RED", () => {
  const k = araçİzinDenetle("ETM-X", "MCP-PG", "oku", beyan);   // matris verilmedi = BOŞ
  assert.equal(k.izinli, false);
  assert.match(k.sebep, /fail-closed|matris/);
});

test("③ izinli — beyan ∧ matris ikisi de geçerse geçer", () => {
  assert.equal(araçİzinDenetle("ETM-X", "MCP-PG", "oku", beyan, matris).izinli, true);
  assert.equal(araçİzinDenetle("ETM-X", "MCP-FS", "yaz", beyan, matris).izinli, true);
});

test("④ least-privilege — beyan edilmeyen araç/mod matris izin verse bile RED", () => {
  // MCP-FS:oku matriste var AMA beyanda yalnız MCP-FS:yaz var → beyan reddeder
  const k = araçİzinDenetle("ETM-X", "MCP-FS", "oku", beyan, matris);
  assert.equal(k.izinli, false);
  assert.match(k.sebep, /least-privilege|beyan/);
});

test("⑤ matris reddi — beyan var ama GİZLİ atama yok → RED (fail-closed lookup)", () => {
  // MCP-PG:yaz beyan edilmiş sayalım ama matriste PG yalnız {oku}
  const b2 = beyanÇöz(["MCP-PG:yaz"]);
  const k = araçİzinDenetle("ETM-X", "MCP-PG", "yaz", b2, matris);
  assert.equal(k.izinli, false);
  assert.match(k.sebep, /izin-matrisi|atanmamış/);
});

test("⑥ bilinmeyen etmen — matriste yok → RED (eksik=RED)", () => {
  assert.equal(araçİzinDenetle("ETM-YOK", "MCP-PG", "oku", beyan, matris).izinli, false);
});

// ── gatewayGrafDenetle (kayıt-anı ön-denetim) ────────────────────────────────
const kur = (sar: string) => gatewayGrafDenetle(new Map([["t.sar", ayristir(belirtecle(sar))]]));

test("⑦ graf temiz — geçerli beyan + tanımlı araç → 0 ihlal", () => {
  const sar = `Blok(kod:B){
    MCP( kod: MCP-PG, ne: "postgres kapısı" )
    Etmen( kod: ETM-A, tür: uzman, uzmanlık: "db", yetki: L3, bellek: izole, ne: "x", uygular: ANY-Z,
           mcpİzinleri: [ "MCP-PG:oku" ] )
  }`;
  assert.equal(kur(sar).length, 0);
});

test("⑧ graf — biçimsiz + geçersiz-mod + tanımsız-araç yakalanır", () => {
  const sar = `Blok(kod:B){
    MCP( kod: MCP-PG, ne: "postgres" )
    Etmen( kod: ETM-A, tür: uzman, uzmanlık: "db", yetki: L3, bellek: izole, ne: "x", uygular: ANY-Z,
           mcpİzinleri: [ "biçimsiz", "MCP-PG:uçmak", "MCP-YOK:oku" ] )
  }`;
  const t = kur(sar);
  assert.equal(t.length, 3, "üç ihlal: biçim + mod + tanımsız-araç");
  assert.ok(t.every((x) => x.tani.kod === "gateway-izin-biçim"));
  assert.ok(t.some((x) => /biçimsiz/.test(x.tani.mesaj)));
  assert.ok(t.some((x) => /geçersiz mod/.test(x.tani.mesaj)));
  assert.ok(t.some((x) => /tanımsız araç/.test(x.tani.mesaj)));
});

// toolround.test.ts — 🔄 SEF-L3-A27/A28: gerçek tool-round güvenceleri.
//   İzinsiz talep RED (döngü kırılmaz) · araç sonucu untrusted kalkanı · tur limiti.
import { test } from "node:test";
import assert from "node:assert/strict";
import { araçTalepleriÇöz, araçTuru, toolRoundKostur, type AraçÇağır } from "../src/toolround.ts";
import type { İzinBeyan, İzinMatrisi, Mod } from "../src/gateway.ts";

const beyan: İzinBeyan[] = [{ araç: "ARC-DOSYA", mod: "oku" }];
const matris: İzinMatrisi = new Map([["ETM-X", new Map([["ARC-DOSYA", new Set<Mod>(["oku"])]])]]);
const başarılı: AraçÇağır = (t) => ({ durum: "izinli", araç: t.araç, mod: t.mod, sonuç: "dosya içeriği", güvenilmez: true });

test("araçTalepleriÇöz: araçTalepleri/toolCalls biçimlerini tolere eder; araçsız atlanır", () => {
  const t = araçTalepleriÇöz({ araçTalepleri: [{ etmen: "ETM-X", araç: "ARC-DOSYA", mod: "oku", args: { yol: "a" } }, { mod: "yaz" }] });
  assert.equal(t.length, 1);
  assert.equal(t[0].araç, "ARC-DOSYA");
});

test("izinli talep araç çalıştırır + sonuç DAİMA untrusted (güvenilmez SABİT true)", () => {
  const s = araçTuru({ etmen: "ETM-X", araç: "ARC-DOSYA", mod: "oku" }, { beyanlar: beyan, matris, araçÇağır: başarılı });
  assert.equal(s.durum, "izinli");
  assert.equal(s.güvenilmez, true);
  assert.equal(s.sonuç, "dosya içeriği");
});

test("izinsiz talep RED — döngü KIRILMAZ (fail-closed: beyan yoksa/matris atamamışsa)", () => {
  const beyansız = araçTuru({ etmen: "ETM-X", araç: "ARC-GIZLI", mod: "oku" }, { beyanlar: beyan, matris, araçÇağır: başarılı });
  assert.equal(beyansız.durum, "red");
  assert.match(beyansız.sebep ?? "", /least-privilege|beyan etmemiş/);
  const matrissiz = araçTuru({ etmen: "ETM-X", araç: "ARC-DOSYA", mod: "yaz" }, { beyanlar: [{ araç: "ARC-DOSYA", mod: "yaz" }], matris, araçÇağır: başarılı });
  assert.equal(matrissiz.durum, "red", "beyan var ama matris atamamış → fail-closed RED");
});

test("araç fırlatırsa durum:hata (döngü kırılmaz)", () => {
  const patlak: AraçÇağır = () => { throw new Error("araç çöktü"); };
  const s = araçTuru({ etmen: "ETM-X", araç: "ARC-DOSYA", mod: "oku" }, { beyanlar: beyan, matris, araçÇağır: patlak });
  assert.equal(s.durum, "hata");
  assert.match(s.sebep ?? "", /araç çöktü/);
});

test("tur limiti: max aşılınca kalan talepler 'tur-limiti' hata (sonsuz döngü imkânsız)", () => {
  const çok = { araçTalepleri: Array.from({ length: 4 }, () => ({ etmen: "ETM-X", araç: "ARC-DOSYA", mod: "oku" })) };
  const r = toolRoundKostur(çok, { beyanlar: beyan, matris, araçÇağır: başarılı, maxTur: 2 });
  assert.equal(r.length, 4);
  assert.equal(r.filter((x) => x.durum === "izinli").length, 2);
  assert.equal(r.filter((x) => (x.sebep ?? "").includes("tur-limiti")).length, 2);
});

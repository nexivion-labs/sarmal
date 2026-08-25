import { test } from "node:test";
import assert from "node:assert/strict";
import { belirtecle } from "../src/belirtec.ts";
import { ayristir } from "../src/ayristirici.ts";
import { dugumBul } from "../src/sef.ts";
import { alanSemasi, sozlesmeSema, sozlesmeDenetle, kabulGate } from "../src/sozlesme.ts";

const SAR = `
Mekanizma( kod: M ){
  Sözleşme( kod: SC ) {
    ne: "test sözleşmesi"
    alanlar: {
      adım: "metin · zorunlu",
      rol: "metin · üretici|denetçi",
      güven: "sayı · 0..1",
      etiketler: "liste · örnek (prose)",
    }
  }
}
`;
const sema = () => {
  const prog = ayristir(belirtecle(SAR));
  const node = dugumBul(new Map([["t.sar", prog]]), "Sözleşme", "SC")!;
  return sozlesmeSema(node);
};

test("alanSemasi — tip/zorunlu/enum/aralık tolerant parse (prose yok sayılır)", () => {
  assert.deepEqual(alanSemasi("metin · zorunlu · üretici|denetçi"), { tip: "metin", zorunlu: true, enum: ["üretici", "denetçi"] });
  assert.deepEqual(alanSemasi("sayı · 0..1"), { tip: "sayı", zorunlu: false, aralık: [0, 1] });
  assert.deepEqual(alanSemasi("liste · üretim-yeri (MIM-2.1)"), { tip: "liste", zorunlu: false });
});

test("sozlesmeSema — Sözleşme alanlar haritasından şema çıkarır (dogfood)", () => {
  const s = sema();
  assert.equal(s.get("adım")?.zorunlu, true);
  assert.deepEqual(s.get("rol")?.enum, ["üretici", "denetçi"]);
  assert.deepEqual(s.get("güven")?.aralık, [0, 1]);
  assert.equal(s.get("etiketler")?.tip, "liste");
});

test("sozlesmeDenetle — geçerli nesne 0 ihlal", () => {
  assert.equal(sozlesmeDenetle(sema(), { adım: "A1", rol: "üretici", güven: 0.8, etiketler: ["x"] }).length, 0);
});

test("sozlesmeDenetle — eksik/enum/aralık/tip ihlalleri", () => {
  const ihl = sozlesmeDenetle(sema(), { rol: "hakem", güven: 1.5, etiketler: "liste-değil" });
  assert.ok(ihl.some((i) => i.alan === "adım" && i.tür === "eksik-alan"));
  assert.ok(ihl.some((i) => i.alan === "rol" && i.tür === "geçersiz-enum"));
  assert.ok(ihl.some((i) => i.alan === "güven" && i.tür === "aralık-hatası"));
  assert.ok(ihl.some((i) => i.alan === "etiketler" && i.tür === "tip-hatası"));
});

test("kabulGate — karar=kabul + temiz → geçti; red → geçmez; durum çıkar", () => {
  const s = sema();
  const temiz = { adım: "A1", rol: "üretici", güven: 0.5, etiketler: [] };
  const ok = kabulGate({ ...temiz, karar: "kabul", kabulDurumu: "GEÇTİ" }, s);
  assert.equal(ok.geçti, true);
  assert.equal(ok.durum, "GEÇTİ");
  const red = kabulGate({ ...temiz, karar: "red" }, s);
  assert.equal(red.geçti, false);
  assert.equal(red.karar, "red");
});

test("sozlesmeDenetle — zorunlu alanda boş dize eksik sayılır (falsy-0 tuzağı: sayı 0 geçerli)", () => {
  // Boş dize zorunlu alanı GEÇMEMELİ (eski hata: v==="" ne undefined ne null → geçiyordu).
  const bos = sozlesmeDenetle(sema(), { adım: "  ", rol: "üretici", güven: 0, etiketler: [] });
  assert.ok(bos.some((i) => i.alan === "adım" && i.tür === "eksik-alan"), "boş-dize adım eksik-alan olmalı");
  assert.ok(!bos.some((i) => i.alan === "güven"), "sayı 0 geçerli değer — eksik/ihlal olmamalı");
});

test("SZL-ARAÇ-TALEP dogfood — mod enum (oku|yaz|çağır) sözleşme-motorunca zorlanır (Gateway-RAY)", () => {
  const sar = `Mekanizma(kod:M){ Sözleşme( kod: SZL-ARAÇ-TALEP ){ alanlar: {
    etmen: "metin · zorunlu",
    araç: "metin · zorunlu",
    mod: "metin · zorunlu · oku|yaz|çağır",
    gerekçe: "metin · zorunlu",
  } } }`;
  const s = sozlesmeSema(dugumBul(new Map([["a.sar", ayristir(belirtecle(sar))]]), "Sözleşme", "SZL-ARAÇ-TALEP")!);
  assert.deepEqual(s.get("mod")?.enum, ["oku", "yaz", "çağır"]);
  assert.equal(sozlesmeDenetle(s, { etmen: "E", araç: "MCP-PG", mod: "oku", gerekçe: "veri" }).length, 0);
  const ihl = sozlesmeDenetle(s, { etmen: "E", araç: "MCP-PG", mod: "uçmak", gerekçe: "x" });
  assert.ok(ihl.some((i) => i.alan === "mod" && i.tür === "geçersiz-enum"), "geçersiz mod reddedilir");
});

test("sozlesmeSema — `alanlar` taşımayan sözleşme boş şema verir (sef-dogrula boş-şema uyarısının kökü)", () => {
  // İstek/yanıt biçimli uç-sözleşmesi: `alanlar` yok → boş Map. sefDogrulaKomutu bunu
  // GEÇTİ diye raporlamamalı (sessiz kabul); bu test boş-şema koşulunu kilitler.
  const prog = ayristir(belirtecle('Ekran(){ Sözleşme( kod: SU, istek: "e+p", yanıt: "token" ) }'));
  const node = dugumBul(new Map([["u.sar", prog]]), "Sözleşme", "SU")!;
  assert.equal(sozlesmeSema(node).size, 0);
});

// ═══════════════════════════════════════════════════════════════════════════
// karne.test.ts — 🏅 Karne skalası sınamaları (EMJ-A05)
//
//   Dört güvence:
//     1. KANON VARLIĞI: kayit.json karneSkalasi Founder-onaylı biçimde yaşıyor
//        (⭐ birim · beş derece · dört sicil bileşeni).
//     2. TEK-ANLAMLILIK (DIL-4): ⭐ emoji-yazım kanonunun hiçbir tablosunda yok —
//        dilin yüzeylerinde yalnız derece birimidir.
//     3. BOŞ-SİCİL DÜRÜSTLÜĞÜ: rapor hiçbir etmene derece basmaz; her etmen
//        "henüz sicil yok" ile listelenir, kanonsuz çağrı açık hata verir.
//     4. OGR-3 GERİYE-BAĞLANTI: AGENTS.md üreticisi karne bölümünü ve `karne`
//        araç satırını kanondan derliyor.
//   Koşum: cd cekirdek && npm test
// ═══════════════════════════════════════════════════════════════════════════

import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { siniflamaYukle } from "../src/siniflama.ts";
import { karneRaporu, karneSatiri, etmenleriTopla } from "../src/karne.ts";
import { EMOJI_TIPLER, EMOJI_PARAMETRELER, EMOJI_DURUMLAR } from "../src/emoji-yazim.ts";
import { belirtecle } from "../src/belirtec.ts";
import { ayristir } from "../src/ayristirici.ts";
import { dilBaglami } from "../src/dil-baglami.ts";

const SNF_YOL = fileURLToPath(new URL("../../../oz/siniflama/kayit.json", import.meta.url));
const snf = siniflamaYukle(SNF_YOL);

const programla = (kaynak: string) => new Map([["fikstur.sar", ayristir(belirtecle(kaynak))]]);

// ── 1. kanon varlığı ─────────────────────────────────────────────────────────
test("kanon: karneSkalasi kayit.json'da Founder-onaylı biçimde yaşıyor", () => {
  const k = snf.karneSkalasi;
  assert.ok(k, "karneSkalasi bölümü bekleniyor (EMJ-A04 onayı)");
  assert.equal(k!.birim, "⭐", "onaylı birim ⭐'dır (aday A)");
  assert.deepEqual(Object.keys(k!.dereceler), ["1", "2", "3", "4", "5"], "beş derece");
  assert.deepEqual(
    Object.keys(k!.bilesenler).sort(),
    ["denetimTemizligi", "founderSinyalleri", "kabulIsabeti", "sinamaYesilligi"].sort(),
    "dört sicil bileşeni beyanlı");
});

// ── 2. tek-anlamlılık (DIL-4) ─────────────────────────────────────────────────
test("DIL-4: ⭐ emoji-yazım kanonunun hiçbir tablosunda geçmiyor (yalnız derece birimi)", () => {
  for (const tablo of [EMOJI_TIPLER, EMOJI_PARAMETRELER, EMOJI_DURUMLAR]) {
    assert.ok(!("⭐" in tablo), "⭐ yazım kanonuna giremez");
  }
});

// ── 3. boş-sicil dürüstlüğü ──────────────────────────────────────────────────
const ETMENLI = [
  'Etmen( kod: ETM-DENEME, ad: "deneme_etmeni", ne: "🤖 sınama kadrosu üyesi" )',
  'Etmen( kod: ETM-ARKA, ad: "arka_etmen", ne: "🤖 arkayüz üyesi" )',
].join("\n");

test("etmenleriTopla: Etmen bildirimleri koduyla toplanır (sıralı)", () => {
  const etmenler = etmenleriTopla(programla(ETMENLI));
  assert.deepEqual(etmenler.map((e) => e.kod), ["ETM-ARKA", "ETM-DENEME"]);
  assert.equal(etmenler[1].ad, "deneme_etmeni");
});

test("dürüstlük: rapor hiçbir etmene derece basmaz — her satır 'henüz sicil yok'", () => {
  const rapor = karneRaporu(snf, programla(ETMENLI));
  assert.ok(rapor.includes("ETM-DENEME"), "etmen listede");
  const etmenSatirlari = rapor.split("\n").filter((s) => s.includes("🤖 ETM-"));
  assert.equal(etmenSatirlari.length, 2);
  for (const satir of etmenSatirlari) {
    assert.ok(satir.includes("henüz sicil yok"), "boş sicil açıkça söylenir");
    assert.ok(!satir.includes("⭐"), "etmen satırına derece BASILMAZ — uydurma puan yasak");
  }
  assert.ok(rapor.includes("⭐⭐⭐⭐⭐"), "skala tablosu kanondan basılır (beşinci derece dahil)");
});

test("dürüstlük: etmensiz çalışma alanında liste boş ama skala yine kanonlu basılır", () => {
  const rapor = karneRaporu(snf, programla('Faz( kod: F1 ) { Blok( kod: B1 ) { } }'));
  assert.ok(rapor.includes("ilan edilmiş Etmen yok"));
  assert.ok(rapor.includes("⭐⭐⭐"), "skala kanonu etmensiz de görünür");
});

test("dürüstlük: kanonsuz sınıflamada rapor açık hata verir (sessiz boş dönmez)", () => {
  const kanonsuz = { ...snf, karneSkalasi: undefined };
  const rapor = karneRaporu(kanonsuz, programla(ETMENLI));
  assert.ok(rapor.startsWith("✖"), "kanon yoksa açık hata");
});

test("karneSatiri: hover satırı dürüst — sicil yok der, skala kaynağını söyler", () => {
  const satir = karneSatiri(snf);
  assert.ok(satir && satir.includes("henüz sicil yok") && satir.includes("karneSkalasi"));
  assert.equal(karneSatiri({ ...snf, karneSkalasi: undefined }), undefined, "kanonsuz sınıflamada satır üretilmez");
});

// ── 4. OGR-3 geriye-bağlantı ─────────────────────────────────────────────────
test("OGR-3: AGENTS.md üreticisi karne bölümünü ve araç satırını kanondan derliyor", () => {
  const md = dilBaglami("2026-07-18");
  assert.ok(md.includes("## Etmen karne skalası"), "karne bölümü var");
  assert.ok(md.includes("⭐⭐⭐⭐⭐"), "beş derece kanondan iniyor");
  assert.ok(md.includes("`kabulIsabeti`"), "bileşenler kanondan iniyor");
  assert.ok(md.includes("| `karne` |"), "araç haritasında karne satırı var");
  assert.ok(md.includes("henüz sicil yok"), "dürüstlük sözleşmesi ajana öğretiliyor");
});

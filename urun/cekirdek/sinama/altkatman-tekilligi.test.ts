// ═══════════════════════════════════════════════════════════════════════════
// altkatman-tekilligi.test.ts — 🪜 MIM-1.7 AltKatman tekilliği nöbeti
//
//   Founder 2026-08-28 tarihinde yol haritası panelinde bir Adıma giden yolu
//   adlarıyla okumak istedi ve iki şey gördü: zincirin iki kademesi aynı adı
//   taşıyordu ve tek bir Katman altında `departman: kodlama` kademesi altı kez
//   açılmıştı. Kök sebep bir yazım hatası değil bir HÜKÜM BOŞLUĞUYDU; MIM-1.5
//   her AltKatmanın tam olarak bir departmanı temsil ettiğini söylüyor, fakat
//   aynı departmanın Katman içinde kaç kez temsil edilebileceğini hiçbir madde
//   yazmıyordu. MIM-1.7 o boşluğu kapattı ve bu nöbet bekçiyi korur.
//
//   MUTASYON KANITI: bekçinin departman haritası kaldırılırsa birinci sınama,
//   ad haritası kaldırılırsa ikinci sınama, `node.cocuklar` yerine derin gezinme
//   konursa dördüncü sınama kırmızı yanar.
// ═══════════════════════════════════════════════════════════════════════════
import { test } from "node:test";
import assert from "node:assert/strict";
import { belirtecle } from "../src/belirtec.ts";
import { ayristir } from "../src/ayristirici.ts";
import { altKatmanTekilligiTanilari } from "../src/denetci.ts";

function tek(kaynak: string) {
  return altKatmanTekilligiTanilari(new Map([["is/plan/x.sar", ayristir(belirtecle(kaynak))]]));
}

test("aynı departman ikinci kez açılırsa HATA doğar ve ilk kademe adıyla gösterilir", () => {
  const t = tek(`Katman( kod: KAT-X, ad: "katman" ) {
  AltKatman( kod: ALT-A, departman: kodlama, ad: "birinci konu" ) { Adım( kod: A1, ne: "iş" ) }
  AltKatman( kod: ALT-B, departman: kodlama, ad: "ikinci konu" ) { Adım( kod: A2, ne: "iş" ) }
}`);
  assert.equal(t.length, 1);
  assert.equal(t[0].tani.kod, "altkatman-tekilliği-ihlali");
  assert.equal(t[0].tani.duzey, "hata");
  // İlk kademenin kimliği mesajda geçer; kullanıcı işi nereye taşıyacağını bilir.
  assert.ok(t[0].tani.mesaj.includes("ALT-A"), "ilk kademe gösterilmiyor");
  assert.ok(t[0].tani.mesaj.includes("kodlama"), "hangi departman olduğu söylenmiyor");
});

test("aynı AD ikinci kez kullanılırsa HATA doğar — departmanlar farklı olsa bile", () => {
  const t = tek(`Katman( kod: KAT-X, ad: "katman" ) {
  AltKatman( kod: ALT-A, departman: kodlama, ad: "aynı ad" ) { Adım( kod: A1, ne: "iş" ) }
  AltKatman( kod: ALT-B, departman: sınama, ad: "aynı ad" ) { Adım( kod: A2, ne: "iş" ) }
}`);
  assert.equal(t.length, 1);
  assert.ok(t[0].tani.mesaj.includes("aynı ad"), "yinelenen ad gösterilmiyor");
  assert.ok(t[0].tani.mesaj.includes("ALT-A"), "ilk taşıyıcı gösterilmiyor");
});

test("her departman bir kez açılmışsa hiçbir tanı doğmaz", () => {
  const t = tek(`Katman( kod: KAT-X, ad: "katman" ) {
  AltKatman( kod: ALT-A, departman: kodlama, ad: "kod" ) { Adım( kod: A1, ne: "iş" ) }
  AltKatman( kod: ALT-B, departman: sınama, ad: "sınama" ) { Adım( kod: A2, ne: "iş" ) }
  AltKatman( kod: ALT-C, departman: inceleme, ad: "inceleme" ) { Adım( kod: A3, ne: "iş" ) }
}`);
  assert.equal(t.length, 0);
});

test("tekillik KATMAN kapsamındadır: iki ayrı Katman aynı departmanı açabilir", () => {
  // Ölçüm yalnız bir Katmanın DOĞRUDAN çocuklarını karşılaştırır. Aksi hâlde iç
  // içe yapılar birbirinin kademesini ihlal sayar ve kural anlamını yitirirdi.
  const t = tek(`Blok( kod: BLK-X, ad: "gövde" ) {
  Katman( kod: KAT-A, ad: "birinci" ) {
    AltKatman( kod: ALT-A, departman: kodlama, ad: "kod" ) { Adım( kod: A1, ne: "iş" ) }
  }
  Katman( kod: KAT-B, ad: "ikinci" ) {
    AltKatman( kod: ALT-B, departman: kodlama, ad: "kod" ) { Adım( kod: A2, ne: "iş" ) }
  }
}`);
  assert.equal(t.length, 0);
});

test("üç kez açılan departman İKİ tanı doğurur — hiçbir yineleme sessiz kalmaz", () => {
  const t = tek(`Katman( kod: KAT-X, ad: "katman" ) {
  AltKatman( kod: ALT-A, departman: kodlama, ad: "bir" ) { Adım( kod: A1, ne: "iş" ) }
  AltKatman( kod: ALT-B, departman: kodlama, ad: "iki" ) { Adım( kod: A2, ne: "iş" ) }
  AltKatman( kod: ALT-C, departman: kodlama, ad: "üç" ) { Adım( kod: A3, ne: "iş" ) }
}`);
  assert.equal(t.length, 2);
});

test("öneri yapıştırılabilir iskelet taşır — kullanıcı işi nereye taşıyacağını görür", () => {
  const t = tek(`Katman( kod: KAT-X, ad: "katman" ) {
  AltKatman( kod: ALT-A, departman: kodlama, ad: "bir" ) { Adım( kod: A1, ne: "iş" ) }
  AltKatman( kod: ALT-B, departman: kodlama, ad: "iki" ) { Adım( kod: A2, ne: "iş" ) }
}`);
  const oneri = t[0].tani.oneri ?? "";
  assert.ok(oneri.includes("AltKatman( kod: ALT-A"), "öneri hedef kademeyi yazmıyor");
  assert.ok(oneri.includes("departman: kodlama"), "öneri departmanı yazmıyor");
});

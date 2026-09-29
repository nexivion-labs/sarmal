// ═══════════════════════════════════════════════════════════════════════════
// ad-alanli-atif-yuzu.test.ts — 🔗 ⇧F12 ad alanlı atıfları görür (KPS-SIR-A02 · YUZ-3.2)
//
//   Bütün atıfları bulma kısayolu MCP `gezin` ile aynı çekirdeği (`butunAtiflar`)
//   okur; çıplak koda başka bir projeden `PRJ::KOD` diye verilen atıf listeye
//   girer. Eklentinin gezinme süzgeci MIM-1.1 varlık sınırını uygular; ad alanlı
//   yazım ise zaten "başka projeden bakıyorum" beyanıdır ve sınır onu gizlememelidir.
//   Ders dünyası yine süzülür. Nöbet üç halkayı VS Code çalışma zamanı olmadan ölçer:
//   ① KAYNAK: sağlayıcı `butunAtiflar` çağırır ve vurgu uzunluğunu atfın kendi
//      yazımından alır (ad alanlı yazım çıplak koddan uzundur).
//   ② SINIR: A projesindeki kaynaktan kurulan süzgeçle B projesindeki ad alanlı
//      atıf görünür, B'deki çıplak eş ad (başka düğüm) görünmez.
//   ③ DERS DÜNYASI: öğreti örneğindeki ad alanlı yazım listeye girmez.
//
//   MUTASYON KANITI (2026-09-29 · `cp` yedeğiyle geri alındı, `cmp` ile doğrulandı):
//     M1 sağlayıcı yeniden `kimlikIndeksi.atiflar` okur        → ① kırmızı
//     M2 ad alanlı atıfta süzgeç varlık sınırını da uygular    → ② kırmızı
//     M3 ad alanlı atıfta bütün süzgeç kalkar                   → ② ve ③ kırmızı
// ═══════════════════════════════════════════════════════════════════════════

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { KimlikIndeksi, butunAtiflar, gezinmeSuzgeci } from "../../cekirdek/src/kimlik.ts";

const proje = (prj: string): string =>
  `Proje( kod: PRJ-${prj}, ad: "${prj}", ne: "Sınav çatısının projesi." ) {\n  Teknoloji( kod: TEK-${prj}, ad: "t" )\n}\n`;
const adim = (kod: string, ek = ""): string =>
  `Faz( kod: FAZ-${kod}, ad: "f" ) {\n  Blok( kod: BLK-${kod}, ne: "g" ) {\n    Katman( kod: KAT-${kod}, ad: "k" ) {\n` +
  `      AltKatman( kod: ALT-${kod}, ad: "m" ) {\n        Adım( kod: ${kod}, durum: beklemede${ek}, ne: "iş" )\n      }\n    }\n  }\n}\n`;

function cati(): KimlikIndeksi {
  const i = new KimlikIndeksi();
  i.dosyaGuncelle("/ws/a/a_anadizin.sar", proje("A"));
  i.dosyaGuncelle("/ws/a/is/plan/plan.sar", adim("ADM-HEDEF"));
  i.dosyaGuncelle("/ws/b/b_anadizin.sar", proje("B"));
  // B hem A'nın hedefine ad alanıyla bağlanır hem de kendi çıplak eş adını anar.
  i.dosyaGuncelle("/ws/b/is/plan/plan.sar", adim("ADM-B-1", ", bağımlı: [ PRJ-A::ADM-HEDEF ]") + "// ADM-HEDEF burada B'nin kendi eş adıdır\n");
  i.dosyaGuncelle("/ws/ogreti/ornek/ders.sar", adim("ADM-DERS", ", bağımlı: [ PRJ-A::ADM-HEDEF ]"));
  return i;
}
const varlikKoku = (yol: string): string | undefined =>
  yol.startsWith("/ws/a/") ? "/ws/a" : yol.startsWith("/ws/b/") ? "/ws/b" : undefined;

test("① ⇧F12 sağlayıcısı butunAtiflar okur ve vurguyu atfın kendi yazımından ölçer", () => {
  const kaynak = readFileSync(fileURLToPath(new URL("../src/gezinme.ts", import.meta.url)), "utf8");
  const govde = kaynak.slice(kaynak.indexOf("registerReferenceProvider"), kaynak.indexOf("registerRenameProvider"));
  assert.match(govde, /butunAtiflar\(kimlikIndeksi, kod, s\)/u);
  assert.match(govde, /a\.kod\.length/u);
  assert.doesNotMatch(govde, /kimlikIndeksi\.atiflar\(/u);
});

test("② A'daki kaynaktan B'nin ad alanlı atfı görünür; B'nin çıplak eş adı varlık sınırında kalır", () => {
  const s = gezinmeSuzgeci("/ws/a/is/plan/plan.sar", varlikKoku);
  const atiflar = butunAtiflar(cati(), "ADM-HEDEF", s);
  assert.deepEqual(atiflar.map((a) => `${a.kod}@${a.dosya}`), ["PRJ-A::ADM-HEDEF@/ws/b/is/plan/plan.sar"]);
  assert.equal(atiflar[0].kod.length, "PRJ-A::ADM-HEDEF".length);
});

test("③ öğreti örneğindeki ad alanlı yazım ürün kaynağından yapılan sorguya girmez", () => {
  const s = gezinmeSuzgeci("/ws/a/is/plan/plan.sar", varlikKoku);
  assert.equal(butunAtiflar(cati(), "ADM-HEDEF", s).some((a) => a.dosya.includes("/ogreti/")), false);
  // Süzgeçsiz sorgu (MCP `gezin`) ders dosyasını da görür; ayrım yalnız süzgeçten gelir.
  assert.equal(butunAtiflar(cati(), "ADM-HEDEF").some((a) => a.dosya.includes("/ogreti/")), true);
});

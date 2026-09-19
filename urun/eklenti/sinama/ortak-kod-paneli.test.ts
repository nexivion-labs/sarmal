// ═══════════════════════════════════════════════════════════════════════════
// ortak-kod-paneli.test.ts — 🔗 KPS-KOD-A01 · Ortak kodun PANELDEKİ karşılığı (ORK-4 · YUZ-3.1)
//
//   Ölçülmüş kusur (2026-09-10 · KPS-KOD-A01 koşusunda devredilmişti): çatı
//   penceresinde kardeş Projeler aynı kodu ilan ettiğinde graf o kodu `PRJ::KOD`
//   anahtarına alır, fakat panel düğümü ÇIPLAK koduyla arıyordu ve arama boş
//   dönüyordu. Bedeli şuydu: ortak kodlu bir düğümün bağımlı listesi, etki
//   kapanışı ve müfettiş açıcısı çatı penceresinde sessizce boş kalıyor, AYNI
//   düğüm tek projeli pencerede dolu görünüyordu. İki yüzey aynı düğüm için iki
//   ayrı şey söylediğinde hangisinin doğru olduğu okunamaz ve bu YUZ-3.1
//   hükmünün yasakladığı şeydir.
//
//   Çözümün iki sınırı vardır ve nöbet ikisini de ölçer. BİRİNCİSİ, seçenekleri
//   motorun kendi çözücüsü verir ve panelde ikinci bir eşleme kurulmaz; ayrışma
//   kuralının iki evi olsaydı biri sessizce bayatlardı. İKİNCİSİ, seçim dosyadan
//   yapılır ve eşleşme kurulamazsa araç sessizce bir seçeneği SEÇMEZ, çünkü
//   tesadüfî eşleşmeyi bağ saymak ORK-4'ün açıkça yasakladığı davranıştır ve
//   kapanan kusurun başka bir kılıkta tekrarı olurdu.
//
//   MUTASYON KANITI (2026-09-19 · ikisi de geri alındı ve süit yeniden 5/5):
//   ① `dagDugumunuCoz` ad alanı dalını hiç kurmayıp yalnız çıplak aramayla
//      yetinince "panel ortak kodlu düğümü kendi dosyasından çözer" nöbeti
//      KIRMIZI (4/5); ② dosya bilinmediğinde gövde sessizce ilk adayı
//      döndürünce "sessizce bir kardeşi SEÇMEZ" nöbeti KIRMIZI (4/5).
// ═══════════════════════════════════════════════════════════════════════════

import { test } from "node:test";
import assert from "node:assert/strict";
import { belirtecle } from "../../cekirdek/src/belirtec.ts";
import { ayristir } from "../../cekirdek/src/ayristirici.ts";
import type { Program } from "../../cekirdek/src/sozdizim.ts";
import { dagKur } from "../../cekirdek/src/dag.ts";
import { dagDugumunuCoz } from "../src/yolharitasi-cekirdek.ts";

function progla(kaynaklar: Record<string, string>): Map<string, Program> {
  return new Map(Object.entries(kaynaklar).map(([dosya, k]) => [dosya, ayristir(belirtecle(k))]));
}

/** Şablondan doğan iki kardeş: Proje kodu dışında BÜTÜN kodlar aynıdır. */
const girisIlani = (prj: string) => `
Proje( kod: PRJ-${prj}, ad: "${prj} Projesi", rejim: katı, ne: "Şablondan doğan müşteri projesi." ) {
  Kitaplık( kod: KTP-IS, yol: "is/", ne: "İşin kitaplığı." ) {
    Raf( kod: RAF-PLAN, yol: "plan/", ne: "Plan ağacı." )
  }
}`;

const plan = (prj: string) => `
Faz( kod: FAZ-KURULUS, ad: "Kuruluş Mevsimi", ne: "İlk mevsim.", hedefTarih: "2026-12-31" ) {
  -->|
  ## Amaç
  ${prj} kardeşinin ilk gövdesi.
  ## Kapsam
  Tek Katman ve iki Adım.
  ## Sonuç
  Adımlar kapanınca gövde biter.
  |<--
  Blok( kod: BLK-KURULUS, ad: "Kuruluş Gövdesi", ne: "İlk iş." ) {
    Katman( kod: KAT-ZEMIN, ad: "Zemin", ne: "Zemin katmanı." ) {
      AltKatman( kod: ALT-PLANLAMA, departman: planlama, ad: "Planlama", ne: "Planlama modülü." ) {
        Adım( kod: ADM-ILK, durum: beklemede, ne: "İlk iş.",
              görev: "İlk işin gövdesi burada yazılır.", kabul: [ "Gövde yazıldı." ] )
        Adım( kod: ADM-IKINCI, durum: beklemede, bağımlı: [ ADM-ILK ], ne: "İkinci iş.",
              görev: "İkinci işin gövdesi burada yazılır.", kabul: [ "Gövde yazıldı." ] )
      }
    }
  }
}`;

/** İki kardeşli çatı — sekiz kodun tamamı ortaktır, yalnız Proje kodu ayrışır. */
function catiKur() {
  return dagKur(progla({
    "musteri_a/a_anadizin.sar": girisIlani("A"),
    "musteri_a/is/plan/plan.sar": plan("A"),
    "musteri_b/b_anadizin.sar": girisIlani("B"),
    "musteri_b/is/plan/plan.sar": plan("B"),
  }));
}

test("ortak kod çatıda ayrışır ve panel düğümü ÇIPLAK koduyla bulamaz", () => {
  const dag = catiKur();
  // Ön koşul: kusurun var olma şartı. Çıplak arama boş dönmüyorsa bu nöbetin
  // ölçtüğü olgu yok demektir ve nöbet yanlış şeyi sınıyor olurdu.
  assert.equal(dag.dugumler.get("ADM-IKINCI"), undefined);
  assert.ok(dag.dugumler.has("PRJ-A::ADM-IKINCI"));
  assert.ok(dag.dugumler.has("PRJ-B::ADM-IKINCI"));
});

test("panel ortak kodlu düğümü kendi DOSYASINDAN çözer ve kenarı dolu gelir", () => {
  const dag = catiKur();
  const a = dagDugumunuCoz(dag, "ADM-IKINCI", "/kok/musteri_a/is/plan/plan.sar");
  const b = dagDugumunuCoz(dag, "ADM-IKINCI", "/kok/musteri_b/is/plan/plan.sar");
  assert.equal(a?.kod, "PRJ-A::ADM-IKINCI");
  assert.equal(b?.kod, "PRJ-B::ADM-IKINCI");
  // Kusurun görünen bedeli buydu: kenar listesi çatı penceresinde boş kalıyordu.
  assert.deepEqual(a?.oncekiler, ["PRJ-A::ADM-ILK"]);
  assert.deepEqual(b?.oncekiler, ["PRJ-B::ADM-ILK"]);
});

test("dosya eşleşmezse araç sessizce bir kardeşi SEÇMEZ", () => {
  const dag = catiKur();
  // ORK-4: tesadüfî eşleşme hiçbir zaman geçerli bağ sayılmaz. İki aday varken
  // dosya bilinmiyorsa ya da hiçbirine uymuyorsa doğru cevap "bilmiyorum"dur.
  assert.equal(dagDugumunuCoz(dag, "ADM-IKINCI"), undefined);
  assert.equal(dagDugumunuCoz(dag, "ADM-IKINCI", "/kok/baska_proje/is/plan/plan.sar"), undefined);
});

test("tek projeli depoda hiçbir şey değişmez: çıplak arama ilk denemede tutar", () => {
  const dag = dagKur(progla({
    "a_anadizin.sar": girisIlani("A"),
    "is/plan/plan.sar": plan("A"),
  }));
  // Ortak kod yoksa çevrim hiç ad alanı kurmaz; panel eski yoldan okur.
  assert.equal(dag.ortakKod.length, 0);
  const d = dagDugumunuCoz(dag, "ADM-IKINCI", "/kok/is/plan/plan.sar");
  assert.equal(d?.kod, "ADM-IKINCI");
  assert.deepEqual(d?.oncekiler, ["ADM-ILK"]);
  // Dosya bilinmese de tutar, çünkü kod ayrışmamıştır.
  assert.equal(dagDugumunuCoz(dag, "ADM-IKINCI")?.kod, "ADM-IKINCI");
});

test("graf verilmezse ya da kod hiç yoksa eski cevap aynen korunur", () => {
  const dag = catiKur();
  assert.equal(dagDugumunuCoz(undefined, "ADM-ILK", "/kok/musteri_a/is/plan/plan.sar"), undefined);
  assert.equal(dagDugumunuCoz(dag, "ADM-HIC-YOK", "/kok/musteri_a/is/plan/plan.sar"), undefined);
});

// dag.test.ts — 🔗 Bağımlılık grafiği: DAG-denetim + ters-türetme + topolojik sıra (ORK-3)
// MDR-A04 bağ sınıflandırması: bu dosyadaki mesaj-metnine dokunan assert'ler ya kod-çıpalı ikincil kontroldür ya da bilinçli metin sözleşmesidir (nöbet); çıpasız tanı araması yasaktır. Tam döküm: nitelik/motor_tani_envanteri.sar (MDR-A04 bölümü).
//   Fikstür .sar → graf → topolojik sıra / döngü / ters-kenar. bağımlı=geri, besler=ileri.

import { test } from "node:test";
import assert from "node:assert/strict";
import { belirtecle } from "../src/belirtec.ts";
import { ayristir } from "../src/ayristirici.ts";
import type { Program } from "../src/sozdizim.ts";
import { dagKur, topolojikSira, dagTanilari, blokRayi, secilebilirAdimlar, siradakiAdim } from "../src/dag.ts";
import type { Dag, DagDugum, SiraSonuc } from "../src/dag.ts";   // PRF-KP-B03: rastgele batarya `Dag` nesnesini doğrudan kurar

function progla(kaynak: string): Map<string, Program> {
  return new Map([["t.sar", ayristir(belirtecle(kaynak))]]);
}
const sar = (govde: string) =>
  `Blok( kod: BLK, ne: "x" ) { Katman( kod: FZ, ad: "f" ) { AltKatman( kod: KT, ad: "k" ) {\n${govde}\n} } }`;

test("topolojik sıra: 'A bağımlı B' → B önce gelir (kenardan türetilir)", () => {
  const { sira, dongu } = topolojikSira(dagKur(progla(sar(`
    Adım( kod: A2, bağımlı: A1, ne: "iki" )
    Adım( kod: A1, ne: "bir" )
    Adım( kod: A3, bağımlı: [ A1, A2 ], ne: "üç" )`))));
  assert.equal(dongu.length, 0);
  assert.ok(sira.indexOf("A1") < sira.indexOf("A2"), sira.join(","));
  assert.ok(sira.indexOf("A2") < sira.indexOf("A3"), sira.join(","));
});

test("ters-türetme: 'bağımlı' yazılır, ardıl HESAPLANIR (.sar’a yazılmaz — YUZ-1.2)", () => {
  const dag = dagKur(progla(sar(`
    Adım( kod: A1, ne: "bir" )
    Adım( kod: A2, bağımlı: A1, ne: "iki" )`)));
  assert.deepEqual(dag.dugumler.get("A1")!.sonrakiler, ["A2"]);   // türetilmiş ardıl
  assert.deepEqual(dag.dugumler.get("A2")!.oncekiler, ["A1"]);    // yazılı öncül
});

test("besler kenarı ileri yöndür: 'A besler B' → A önce", () => {
  const { sira } = topolojikSira(dagKur(progla(sar(`
    Adım( kod: URE, besler: TUK, ne: "üretici" )
    Adım( kod: TUK, ne: "tüketici" )`))));
  assert.ok(sira.indexOf("URE") < sira.indexOf("TUK"), sira.join(","));
});

test("döngü tespiti: A→C→A 'döngüsel-bağımlılık' HATASI verir", () => {
  const dag = dagKur(progla(sar(`
    Adım( kod: A, bağımlı: C, ne: "a" )
    Adım( kod: C, bağımlı: A, ne: "c" )`)));
  const { dongu } = topolojikSira(dag);
  assert.deepEqual(dongu, ["A", "C"]);
  const tanilar = dagTanilari(dag);
  assert.equal(tanilar.length, 2);
  assert.ok(tanilar.every((x) => x.tani.kod === "döngüsel-bağımlılık" && x.tani.duzey === "hata"));
});

test("kararlı sıra: bağımsız düğümler kod'a göre alfabetik (deterministik, Math.random yok)", () => {
  const { sira } = topolojikSira(dagKur(progla(sar(`
    Adım( kod: ZORLU, ne: "z" )
    Adım( kod: ACIL, ne: "a" )
    Adım( kod: MUTLU, ne: "m" )`))));
  const adimlar = sira.filter((k) => ["ACIL", "MUTLU", "ZORLU"].includes(k));
  assert.deepEqual(adimlar, ["ACIL", "MUTLU", "ZORLU"]);
});

test("çözülmeyen hedef kenar KURMAZ (referansTanilari işi) — çökme yok", () => {
  const dag = dagKur(progla(sar(`Adım( kod: A, bağımlı: YOK_BOYLE_KOD, ne: "a" )`)));
  assert.deepEqual(dag.dugumler.get("A")!.oncekiler, []);   // çözülmeyen uç bağlanmaz
});

test("kapsayıcı-hedef MEKANİK genişler: bağımlı: [BLOK] → bloğun TÜM yaprak Adımları önce (ORK-1.2)", () => {
  const dag = dagKur(progla(`
Blok( kod: BLK-A, ne: "a" ) { Katman( kod: FZ-A, ad: "f" ) { AltKatman( kod: KT-A, ad: "k" ) {
  Adım( kod: ADM-A1, ne: "a1" )
  Adım( kod: ADM-A2, ne: "a2" )
} } }
Blok( kod: BLK-B, ne: "b" ) { Katman( kod: FZ-B, ad: "f" ) { AltKatman( kod: KT-B, ad: "k" ) {
  Adım( kod: ADM-B1, ne: "b1", bağımlı: [ BLK-A ] )
} } }`));
  // BLK-A hedefi yapraklarına açıldı: B1'in öncülleri A1+A2 (kapsayıcının kendisi değil)
  assert.deepEqual(dag.dugumler.get("ADM-B1")!.oncekiler.sort(), ["ADM-A1", "ADM-A2"]);
  assert.deepEqual(dag.dugumler.get("ADM-A1")!.sonrakiler, ["ADM-B1"]);   // ters-türetme
  const { sira, dongu } = topolojikSira(dag);
  assert.equal(dongu.length, 0);
  assert.ok(sira.indexOf("ADM-A2") < sira.indexOf("ADM-B1"));
});

// ── ORK-1.2 durum-tutarlılığı (GLM lig bulgusu 2026-07-10): öncül bitmeden iş bitemez ──
import { durumTutarlilikTanilari } from "../src/dag.ts";

test("durum-tutarsızlığı: tamamlandı Adım'ın öncülü geliştirmede → HATA (oturum 29 terfisi)", () => {
  const t = durumTutarlilikTanilari(dagKur(progla(sar(`
    Adım( kod: ADM-ONCE, durum: geliştirmede, ne: "öncül" )
    Adım( kod: ADM-SONRA, durum: tamamlandı, bağımlı: [ ADM-ONCE ], ne: "ardıl" )`))));
  assert.equal(t.length, 1);
  assert.equal(t[0].tani.kod, "durum-tutarsızlığı");
  assert.equal(t[0].tani.duzey, "hata", "YAS-4.2 kademesi tamamlandı: uyarı→hata terfisi (repo yeşilken)");
  assert.ok(t[0].tani.mesaj.includes("ADM-ONCE"));
});

test("öncül de tamamlandı → temiz; durumsuz öncül (Teknoloji) nötr", () => {
  const t = durumTutarlilikTanilari(dagKur(progla(`
Teknoloji( kod: MOTOR-X, ne: "teknoloji — durumu yok" )
Blok( kod: BLK, ne: "x" ) { Katman( kod: FZ, ad: "f" ) { AltKatman( kod: KT, ad: "k" ) {
    Adım( kod: ADM-ONCE, durum: tamamlandı, ne: "öncül" )
    Adım( kod: ADM-SONRA, durum: tamamlandı, bağımlı: [ ADM-ONCE, MOTOR-X ], ne: "ardıl" )
} } }`)));
  assert.equal(t.length, 0);
});

test("Adım-dışı durum sözlüğü nötr: Teknoloji durum:aktif taşısa bile sahte durum-tutarsızlığı doğmaz (OS kataloğu bulgusu 2026-07-20)", () => {
  const t = durumTutarlilikTanilari(dagKur(progla(`
Teknoloji( kod: TEK-AKTIF, ne: "seçim beyanı — aktif teknoloji", durum: aktif )
Blok( kod: BLK, ne: "x" ) { Katman( kod: FZ, ad: "f" ) { AltKatman( kod: KT, ad: "k" ) {
    Adım( kod: ADM-IS, durum: tamamlandı, bağımlı: [ TEK-AKTIF ], ne: "teknolojiye yaslanan bitmiş iş" )
} } }`)));
  assert.equal(t.length, 0, "aktif/ertelenen seçim durumudur, iş ilerlemesi değil — nötr sayılır");
});

// ── SEF-L3-A38: Adım-seçici (ŞEF'in "şimdi ne koşulabilir?" ucu) ─────────────
test("Adım-seçici: yalnız öncülleri tamamlanmış açık Adımlar koşulabilir; bekleyen-öncüllü elenir", () => {
  const dag = dagKur(progla(sar(`
    Adım( kod: ADM-1, durum: tamamlandı, ne: "bitmiş öncül" )
    Adım( kod: ADM-2, durum: beklemede, bağımlı: [ ADM-1 ], ne: "hazır — öncülü bitti" )
    Adım( kod: ADM-3, durum: beklemede, bağımlı: [ ADM-2 ], ne: "hazır DEĞİL — ADM-2 açık" )`)));
  const hazir = secilebilirAdimlar(dag);
  assert.deepEqual(hazir.map((a) => a.kod), ["ADM-2"], "yalnız ADM-2 koşulabilir (ADM-1 bitti, ADM-3 ADM-2'yi bekliyor)");
  assert.equal(siradakiAdim(dag)?.kod, "ADM-2");
});

test("Adım-seçici: geliştirmede (aktif cephe) beklemede'nin ÖNÜNE alınır (ORK-3.2)", () => {
  const dag = dagKur(progla(sar(`
    Adım( kod: ADM-BEK, durum: beklemede, ne: "hazır bekleyen" )
    Adım( kod: ADM-GEL, durum: geliştirmede, ne: "aktif cephe" )`)));
  const hazir = secilebilirAdimlar(dag);
  assert.deepEqual(hazir.map((a) => a.kod), ["ADM-GEL", "ADM-BEK"], "geliştirmede önce (yarım işi bitir)");
  assert.equal(siradakiAdim(dag)?.aktif, true);
});

test("Adım-seçici: tamamlandı/bloklu koşulamaz; Teknoloji öncülü önü kapatmaz (nötr)", () => {
  const dag = dagKur(progla(`
Teknoloji( kod: TEK-X, ne: "teknoloji", durum: aktif )
Blok( kod: BLK, ne: "x" ) { Katman( kod: FZ, ad: "f" ) { AltKatman( kod: KT, ad: "k" ) {
    Adım( kod: ADM-BITTI, durum: tamamlandı, ne: "bitmiş — seçilmez" )
    Adım( kod: ADM-BLOK, durum: bloklu, ne: "bloklu — seçilmez" )
    Adım( kod: ADM-HAZIR, durum: beklemede, bağımlı: [ TEK-X ], ne: "teknolojiye yaslanır — hazır" )
} } }`));
  const hazir = secilebilirAdimlar(dag);
  assert.deepEqual(hazir.map((a) => a.kod), ["ADM-HAZIR"], "tamamlandı ve bloklu elenir; Teknoloji önü açık bırakır");
});

test("Adım-seçici: hiç koşulabilir yoksa undefined (ray boşaldı / hepsi bekleyen)", () => {
  const dag = dagKur(progla(sar(`
    Adım( kod: ADM-A, durum: tamamlandı, ne: "bitti" )
    Adım( kod: ADM-B, durum: tamamlandı, bağımlı: [ ADM-A ], ne: "bitti" )`)));
  assert.equal(siradakiAdim(dag), undefined, "tüm Adımlar tamamlandı — koşulabilir yok");
  assert.equal(secilebilirAdimlar(dag).length, 0);
});

// ── ORK-1.2 ikinci yarı: kopuk-zincir (çözülmeyen kenar sessiz düşemez) ────────
import { kopukZincirTanilari } from "../src/dag.ts";

test("kopuk-zincir: bağımlı hedefi hiçbir düğüme çözülmüyorsa uyarı (sessiz düşüş bitti)", () => {
  const dag = dagKur(progla(sar(`
    Adım( kod: ADM-VAR, durum: tamamlandı, kabul: "k", ne: "var olan" )
    Adım( kod: ADM-YENI, durum: beklemede, bağımlı: [ ADM-YOKK ], ne: "kopuk kenarlı" )`)));
  const t = kopukZincirTanilari(dag);
  assert.equal(t.length, 1, "çözülmeyen hedef kopuk-zincir düşmeli");
  assert.equal(t[0].tani.kod, "kopuk-zincir");
  assert.equal(t[0].tani.duzey, "uyarı");
  assert.ok(t[0].tani.mesaj.includes("ADM-YOKK") && t[0].tani.mesaj.includes("ADM-YENI"));
});

test("kopuk-zincir: çözülen kenarlar temiz; kopuk besler yönü de yakalanır", () => {
  const temiz = kopukZincirTanilari(dagKur(progla(sar(`
    Adım( kod: ADM-A, durum: tamamlandı, kabul: "k", ne: "a" )
    Adım( kod: ADM-B, durum: beklemede, bağımlı: [ ADM-A ], ne: "b" )`))));
  assert.equal(temiz.length, 0, "çözülen kenar uyarı üretmemeli");
  const kopukBesler = kopukZincirTanilari(dagKur(progla(sar(`
    Adım( kod: ADM-C, durum: beklemede, besler: [ ADM-HAYALET ], ne: "c" )`))));
  assert.equal(kopukBesler.length, 1);
  assert.ok(kopukBesler[0].tani.mesaj.includes("besler"));
});

// ── ORK-3: motorSirala — elle sıra yerine Kahn rütbesi ──────────────────────
import { motorSirala, kayipKenarTanilari } from "../src/dag.ts";

test("motorSirala: verilen Adım listesi topolojik rütbeye dizilir; grafik-dışı kodlar sona", () => {
  const dag = dagKur(progla(sar(`
    Adım( kod: ADM-1, durum: tamamlandı, kabul: "k", ne: "kök" )
    Adım( kod: ADM-2, durum: beklemede, bağımlı: [ ADM-1 ], ne: "orta" )
    Adım( kod: ADM-3, durum: beklemede, bağımlı: [ ADM-2 ], ne: "uç" )`)));
  assert.deepEqual(motorSirala(["ADM-3", "ADM-1", "ADM-2"], dag), ["ADM-1", "ADM-2", "ADM-3"]);
  assert.deepEqual(motorSirala(["ADM-2", "ADM-BILINMEYEN"], dag), ["ADM-2", "ADM-BILINMEYEN"]);
});

// ── ORK-1.2 (ZINCIR-A04): kayıp-kenar — başkasının meyvesi + kenarsızlık ─────────
test("kayıp-kenar: başka Adımın meyvesini referans alan kenarsız Adım uyarılır", () => {
  const programlar = progla(sar(`
    Adım( kod: ADM-URETICI, durum: tamamlandı, üretir: KOD-MEYVE, kabul: "k", ne: "meyve üretir" )
    Adım( kod: ADM-KULLANICI, durum: beklemede, bağımlı: [], referans: [ KOD-MEYVE ], ne: "meyveyi kullanır ama kenarsız" )`));
  const t = kayipKenarTanilari(dagKur(programlar), programlar);
  assert.equal(t.length, 1, "kenarsız meyve-kullanımı uyarı düşmeli");
  assert.equal(t[0].tani.kod, "kayıp-kenar");
  assert.ok(t[0].tani.mesaj.includes("ADM-URETICI") && t[0].tani.oneri!.includes("bağımlı: [ ADM-URETICI ]"));
});

test("kayıp-kenar: (geçişli) bağımlılık varsa susar — yanlış-pozitif yok", () => {
  const programlar = progla(sar(`
    Adım( kod: ADM-URETICI, durum: tamamlandı, üretir: KOD-MEYVE, kabul: "k", ne: "üretir" )
    Adım( kod: ADM-ORTA, durum: beklemede, bağımlı: [ ADM-URETICI ], ne: "orta halka" )
    Adım( kod: ADM-KULLANICI, durum: beklemede, bağımlı: [ ADM-ORTA ], referans: [ KOD-MEYVE ], ne: "geçişli zincirli" )`));
  assert.equal(kayipKenarTanilari(dagKur(programlar), programlar).length, 0);
});

// ── YUZ-3 (VIT-K77-A02): karne özeti ───────────────────────────────────────────
import { karneOzeti } from "../src/dag.ts";

test("karneOzeti: düğüm toplamı + Adım durum dağılımı (yalnız durum taşıyanlar)", () => {
  const k = karneOzeti(dagKur(progla(sar(`
    Adım( kod: ADM-T1, durum: tamamlandı, kabul: "k", ne: "a" )
    Adım( kod: ADM-T2, durum: beklemede, ne: "b" )
    Adım( kod: ADM-T3, durum: bloklu, ne: "c" )
    Adım( kod: ADM-T4, ne: "durumsuz" )`))));
  assert.equal(k.adim, 4);
  assert.equal(k.durumlar["tamamlandı"], 1);
  assert.equal(k.durumlar["beklemede"], 1);
  assert.equal(k.durumlar["bloklu"], 1);
  assert.equal(k.durumlar["geliştirmede"], undefined);
  assert.ok(k.dugum >= 4, "kapsayıcılar da düğüm sayısına girer");
});

// ── YUZ-3 (VIT-K77-A03): etki-analizi yüzü ─────────────────────────────────────
import { etkiCoz, etkiMetni } from "../src/etki.ts";

test("etkiCoz: doğrudan + geçişli ardıllar topolojik sırada; bekleyensiz düğüm dürüst boş", () => {
  const dag = dagKur(progla(sar(`
    Adım( kod: ADM-KOK, durum: tamamlandı, kabul: "k", ne: "kök" )
    Adım( kod: ADM-ORTA, durum: beklemede, bağımlı: [ ADM-KOK ], ne: "orta" )
    Adım( kod: ADM-UC, durum: beklemede, bağımlı: [ ADM-ORTA ], ne: "uç" )`)));
  const e = etkiCoz(dag, "ADM-KOK")!;
  assert.deepEqual(e.dogrudan, ["ADM-ORTA"]);
  assert.deepEqual(e.gecisli, ["ADM-UC"]);
  const bos = etkiCoz(dag, "ADM-UC")!;
  assert.equal(bos.dogrudan.length + bos.gecisli.length, 0);
  assert.match(etkiMetni(dag, "ADM-UC"), /bekleyen yok/);
  assert.match(etkiMetni(dag, "ADM-HAYALET"), /grafikte yok/);
});

// ── MIM-1.2: faz-sırası türetme (zaman ekseni makinede) ─────────────────────────
import { topolojikSira as topoK91, fazTarihAnahtari } from "../src/dag.ts";

test("MIM-1.2: YENİ dizilişte kardeş Fazlar zincirlenir — Faz-2'nin Adımı Faz-1'inkinden sonra", () => {
  const p = ayristir(belirtecle(`
Proje( kod: PRJ-K91, ad: "zaman-denemesi" ) {
  Faz( kod: FZ-K91-MVP, ad: "mvp" ) {
    Blok( kod: BLK-K91-A, ne: "iş dilimi" ) {
      Adım( kod: ADM-K91-A1, ne: "mvp işi", durum: beklemede )
    }
  }
  Faz( kod: FZ-K91-V1, ad: "v1" ) {
    Blok( kod: BLK-K91-B, ne: "ikinci dilim" ) {
      Adım( kod: ADM-K91-B1, ne: "v1 işi", durum: beklemede )
    }
  }
}`));
  const dag = dagKur(new Map([["k91.sar", p]]));
  // örtük kenar: B1'in öncülleri A1'i içermeli (genislet yapraklara açtı)
  assert.ok(dag.dugumler.get("ADM-K91-B1")!.oncekiler.includes("ADM-K91-A1"),
    "Faz-2 Adımı Faz-1 Adımına örtük bağımlı olmalı: " + JSON.stringify(dag.dugumler.get("ADM-K91-B1")!.oncekiler));
  const { sira } = topoK91(dag);
  assert.ok(sira.indexOf("ADM-K91-A1") < sira.indexOf("ADM-K91-B1"), "topolojik sıra zaman eksenini yansıtmalı");
});

test("MIM-1.2: Kapı varsa gerçek geçittir — Faz-1 yaprakları → Kapı → Faz-2 yaprakları", () => {
  const p = ayristir(belirtecle(`
Proje( kod: PRJ-K91K, ad: "kapılı" ) {
  Faz( kod: FZ-K91K-1, ad: "mvp" ) {
    Adım( kod: ADM-K91K-A, ne: "iş", durum: beklemede )
    Kapı( kod: KAPI-K91K-MVP, ne: "mvp çıkış kapısı" )
  }
  Faz( kod: FZ-K91K-2, ad: "v1" ) {
    Adım( kod: ADM-K91K-B, ne: "sonraki iş", durum: beklemede )
  }
}`));
  const dag = dagKur(new Map([["k91k.sar", p]]));
  assert.ok(dag.dugumler.get("KAPI-K91K-MVP")!.oncekiler.includes("ADM-K91K-A"), "Kapı, kendi fazının yapraklarını bekler");
  assert.ok(dag.dugumler.get("ADM-K91K-B")!.oncekiler.includes("KAPI-K91K-MVP"), "sonraki faz Kapı'yı bekler");
});

test("MIM-1.2: ESKİ dizilişte (Blok içindeki facet-Fazlar) zincir YOK — facet'ler paraleldir", () => {
  const p = ayristir(belirtecle(`
Blok( kod: BLK-K91E, ne: "eski model" ) {
  Katman( kod: FZ-K91E-ON, ad: "önyüz" ) { Adım( kod: ADM-K91E-ON, ne: "ekran", durum: beklemede ) }
  Katman( kod: FZ-K91E-AR, ad: "arkayüz" ) { Adım( kod: ADM-K91E-AR, ne: "uç", durum: beklemede ) }
}`));
  const dag = dagKur(new Map([["k91e.sar", p]]));
  assert.equal(dag.dugumler.get("ADM-K91E-AR")!.oncekiler.length, 0, "facet-Fazlar zincirlenmemeli (eski-diziliş kademesi)");
});

test("MIM-1.2 (Founder 2026-08-25): kardeş Faz sırası KAYNAKTAN değil TARİHTEN türer — geç yazılan erken mevsim önce gelir, tarihsiz sona düşer", () => {
  const p = ayristir(belirtecle(`
Proje( kod: PRJ-K92, ad: "tarih-sırası" ) {
  Faz( kod: FZ-K92-EYLUL, ad: "eylül", hedefTarih: "2026-09-30" ) {
    Adım( kod: ADM-K92-EYLUL, ne: "eylül işi", durum: beklemede )
  }
  Faz( kod: FZ-K92-TARIHSIZ, ad: "tarihsiz" ) {
    Adım( kod: ADM-K92-TARIHSIZ, ne: "taahhütsüz iş", durum: beklemede )
  }
  Faz( kod: FZ-K92-AGUSTOS, ad: "ağustos", hedefTarih: "2026-08" ) {
    Adım( kod: ADM-K92-AGUSTOS, ne: "ağustos işi", durum: beklemede )
  }
}`));
  const dag = dagKur(new Map([["k92.sar", p]]));
  assert.equal(dag.dugumler.get("FZ-K92-AGUSTOS")!.hedefTarih, "2026-08", "Faz düğümü hedefTarih beyanını taşımalı");
  assert.ok(dag.dugumler.get("ADM-K92-EYLUL")!.oncekiler.includes("ADM-K92-AGUSTOS"),
    "eylül dosyada önce yazılsa da ağustosu beklemeli (tarih sırası): " + JSON.stringify(dag.dugumler.get("ADM-K92-EYLUL")!.oncekiler));
  assert.ok(dag.dugumler.get("ADM-K92-TARIHSIZ")!.oncekiler.includes("ADM-K92-EYLUL"), "tarihsiz Faz tarihli mevsimlerin ARKASINA düşmeli");
  assert.equal(dag.dugumler.get("ADM-K92-AGUSTOS")!.oncekiler.length, 0, "en erken mevsim kimseyi beklememeli");
  const { sira } = topoK91(dag);
  assert.ok(sira.indexOf("ADM-K92-AGUSTOS") < sira.indexOf("ADM-K92-EYLUL") && sira.indexOf("ADM-K92-EYLUL") < sira.indexOf("ADM-K92-TARIHSIZ"),
    "topolojik sıra tarih eksenini yansıtmalı: " + JSON.stringify(sira));
  // anahtar sözleşmesi: günlü tarih aynı ayın ay-hassasiyetli beyanından önce, tarihsiz en sona
  assert.ok(fazTarihAnahtari("2026-08-15") < fazTarihAnahtari("2026-08"), "günlü tarih ay-sonu okumasından önce gelmeli");
  assert.ok(fazTarihAnahtari("2026-08") < fazTarihAnahtari("2026-09-01"), "ay sonu sonraki ayın ilk gününden önce gelmeli");
  assert.ok(fazTarihAnahtari("2026-12-31") < fazTarihAnahtari(undefined), "tarihsiz en sona düşmeli");
});

// ── E1-A07 (Founder 2026-07-13): blok→ray otomatik iniş — elle-wire yok ───────
test("E1-A07 blokRayi: Bloklar elle-wire'sız topolojik rayda iner; durum Adımlardan türetilir", () => {
  const p = progla(`
    Blok( kod: BLK-B, ne: "ikinci", bağımlı: [ BLK-A ] ) { Katman( kod: KAT-B, ne: "k" ) { Adım( kod: ADM-B, durum: beklemede, ne: "a" ) } }
    Blok( kod: BLK-A, ne: "ilk" ) { Katman( kod: KAT-A, ne: "k" ) { Adım( kod: ADM-A1, durum: tamamlandı, ne: "a" ) Adım( kod: ADM-A2, durum: tamamlandı, ne: "b" ) } }`);
  const dag = dagKur(p);
  const ray = blokRayi(p, dag);
  assert.equal(ray.length, 2);
  // ① bağımlı DAG'ı: BLK-A önce (BLK-B ona bağımlı) — elle koşar YAZILMADAN
  assert.equal(ray[0].kod, "BLK-A");
  assert.equal(ray[1].kod, "BLK-B");
  assert.deepEqual(ray[1].oncekiler, ["BLK-A"]);
  // ② durum Adımlardan TÜRETİLİR: BLK-A tüm Adımları tamamlandı → tamamlandı; BLK-B → beklemede
  assert.equal(ray[0].durum, "tamamlandı");
  assert.equal(ray[1].durum, "beklemede");
  assert.equal(ray[0].sira, 1);
});

test("E1-A07 blokRayi: Blok yoksa boş ray; geliştirmede Adım → Blok geliştirmede", () => {
  assert.equal(blokRayi(progla('Adım( kod: X, durum: beklemede, ne: "y" )'), dagKur(progla('Adım( kod: X, durum: beklemede, ne: "y" )'))).length, 0);
  const p = progla('Blok( kod: BLK-G, ne: "g" ) { Katman( kod: KAT-G, ne: "k" ) { Adım( kod: ADM-G1, durum: tamamlandı, ne: "a" ) Adım( kod: ADM-G2, durum: geliştirmede, ne: "b" ) } }');
  assert.equal(blokRayi(p, dagKur(p))[0].durum, "geliştirmede");
});

// ── 🍎 VIT-GRAF-A12 · MEYVE ile ZEMİN: iki yeni kenar, sıfır sıra etkisi ──────
//   `üretir` yumuşak bir TESLİM kenarıdır ve topolojik sıraya girmez; kapsayıcının
//   Takım/Teknoloji bağı ise yürütme sırası değil ZEMİN kurar. İkisi de graf yüzü
//   için kaydedilir, motorun sırası ikisinden de etkilenmez.

test("N1 · üretir YUMUŞAK kenardır: üretiyor/üretenler'e yazılır, oncekiler/sonrakiler'e YAZILMAZ", () => {
  const dag = dagKur(progla(sar(`
    Adım( kod: A1, üretir: [ KOD-BIR, KOD-IKI ], ne: "üreten" )
    Adım( kod: A2, ne: "ilgisiz" )
    Kod( kod: KOD-BIR, dosya: "src/bir.ts", ne: "meyve bir" )
    Kod( kod: KOD-IKI, dosya: "src/iki.ts", ne: "meyve iki" )`)));
  const a1 = dag.dugumler.get("A1")!;
  assert.deepEqual(a1.üretiyor, ["KOD-BIR", "KOD-IKI"], "beyan giden uçta durur");
  assert.deepEqual(dag.dugumler.get("KOD-BIR")!.üretenler, ["A1"], "gelen uç TÜRETİLİR");
  assert.deepEqual(dag.dugumler.get("KOD-IKI")!.üretenler, ["A1"]);
  // ASIL NÖBET: teslim kenarı sıra kısıtı DEĞİLDİR — kenarEkle çağrılmamalıdır.
  assert.deepEqual(a1.sonrakiler, [], "üretir hedefi ardıla sızmış");
  assert.deepEqual(dag.dugumler.get("KOD-BIR")!.oncekiler, [], "üretir hedefi öncüle sızmış");
  assert.deepEqual(dag.dugumler.get("KOD-IKI")!.oncekiler, []);
});

test("N1b · üretir beyanı hedef ÇÖZÜLMESE de kaydolur ve kopuk-zincir üretmez", () => {
  const dag = dagKur(progla(sar('Adım( kod: A1, üretir: [ YOK-BOYLE-KOD ], ne: "u" )')));
  assert.deepEqual(dag.dugumler.get("A1")!.üretiyor, ["YOK-BOYLE-KOD"]);
  assert.equal(dag.kopuk.length, 0, "üretir bir sıra kenarı değildir; kopuk-zincir siciline girmez");
});

test("N2 · topolojik sıra `üretir`den ETKİLENMEZ: aynı plan, meyveli ve meyvesiz aynı sırayı verir", () => {
  // FİKSTÜR SIRA-DUYARLI KURULMUŞTUR ve bu tesadüf değildir. Bağımsız denetim
  // (2026-07-29) bu nöbetin önceki hâlinin SAHTE YEŞİL olduğunu ölçtü: meyve
  // kodları `KOD-*` alfabetik olarak bütün Adımlardan SONRA geliyordu, dolayısıyla
  // `üretir` sıraya sızdığında in-derece değişimi çıktıyı hiç oynatmıyordu ve
  // koruma sökülmesine rağmen nöbet yeşil kalıyordu.
  //
  // Bu yüzden Adım kodları meyveden SONRAYA alındı (`KOD-` < `ZA`). Sızma yoksa
  // meyve in-derecesi sıfırdır ve kararlı Kahn onu Adımlardan önce basar; sızma
  // varsa meyve kendisini üreten Adımı BEKLEMEK zorunda kalır ve sıraya sonra
  // girer. Yani çıktı sızmaya karşı DUYARLIDIR.
  const meyvesiz = topolojikSira(dagKur(progla(sar(`
    Adım( kod: ZA1, ne: "bir" )
    Adım( kod: ZA2, bağımlı: ZA1, ne: "iki" )
    Adım( kod: ZA3, bağımlı: ZA2, ne: "üç" )`))));
  const meyveli = topolojikSira(dagKur(progla(sar(`
    Adım( kod: ZA1, üretir: [ KOD-X ], ne: "bir" )
    Adım( kod: ZA2, bağımlı: ZA1, üretir: [ KOD-Y ], ne: "iki" )
    Adım( kod: ZA3, bağımlı: ZA2, ne: "üç" )
    Kod( kod: KOD-X, dosya: "src/x.ts", ne: "meyve x" )
    Kod( kod: KOD-Y, dosya: "src/y.ts", ne: "meyve y" )`))));
  // ① Meyve düğümleri grafa katıldığı için sıradan süzülür; ADIMLARIN sırası aynı kalmalıdır.
  const adimlar = (s: string[]) => s.filter((k) => k.startsWith("ZA"));
  assert.deepEqual(adimlar(meyveli.sira), adimlar(meyvesiz.sira), "meyve beyanı Adım sırasını kaydırdı");
  assert.deepEqual(meyveli.dongu, [], "meyve kenarı döngü doğurmamalı");
  // ② ASIL NÖBET: meyve, kendisini üreten Adımdan ÖNCE basılır — çünkü in-derecesi
  //    sıfırdır. Sızma olsaydı Adımı beklerdi ve bu iddia düşerdi.
  const yer = (k: string) => meyveli.sira.indexOf(k);
  assert.ok(yer("KOD-X") < yer("ZA1"),
    "KOD-X kendisini üreten Adımdan sonra basıldı — `üretir` in-dereceye sızmış olmalı");
  assert.ok(yer("KOD-Y") < yer("ZA2"),
    "KOD-Y kendisini üreten Adımdan sonra basıldı — `üretir` in-dereceye sızmış olmalı");
  // ③ Tam çıktı ÇİVİLENİR.
  assert.deepEqual(meyveli.sira, ["BLK", "FZ", "KOD-X", "KOD-Y", "KT", "ZA1", "ZA2", "ZA3"],
    "topolojik sıra çıktısı değişti — `üretir` sıra hesabına sızmış olmalı");
});

test("N3 · ZEMİN: Katman'ın Takım/Teknoloji bağı KAPSAYICIDA korunur (genislet silmesine rağmen)", () => {
  const dag = dagKur(progla(`
    Takım( kod: TKM-MOTOR, ad: "motor takımı", ne: "t" )
    Teknoloji( kod: TEK-TS, ad: "typescript", ne: "t" )
    Blok( kod: BLK, ne: "x" ) {
      Katman( kod: KAT, ad: "k", bağımlı: [ TKM-MOTOR, TEK-TS ] ) {
        Adım( kod: A1, durum: beklemede, ne: "bir" )
        Adım( kod: A2, durum: beklemede, ne: "iki" )
      }
    }`));
  const kat = dag.dugumler.get("KAT")!;
  // ① Kapsayıcının kendisinde İZ KALIR — ölçüm bu izin bugüne kadar hiç olmadığını gösterdi.
  assert.deepEqual(kat.zemin, ["TKM-MOTOR", "TEK-TS"], "kapsayıcının zemin bağı kayboldu");
  // ② genislet() davranışı AYNEN korunur: kenar hâlâ yaprak Adımlara açılır.
  assert.deepEqual(dag.dugumler.get("A1")!.oncekiler, ["TKM-MOTOR", "TEK-TS"]);
  assert.deepEqual(dag.dugumler.get("A2")!.oncekiler, ["TKM-MOTOR", "TEK-TS"]);
  // ③ Kapsayıcının kendisi hâlâ topolojik sırada bir kenar TAŞIMAZ (zemin sıra kurmaz).
  assert.deepEqual(kat.oncekiler, [], "zemin kaydı topolojik sıraya sızmış");
  assert.deepEqual(kat.sonrakiler, []);
});

test("N3b · ZEMİN yalnız kapsayıcı→Takım/Teknoloji hâlinde doğar; Adım bağımlılığı zemin değildir", () => {
  const dag = dagKur(progla(`
    Teknoloji( kod: TEK-TS, ad: "typescript", ne: "t" )
    Blok( kod: BLK, ne: "x" ) { Katman( kod: KAT, ad: "k" ) {
      Adım( kod: A1, durum: beklemede, bağımlı: [ TEK-TS ], ne: "bir" )
      Adım( kod: A2, durum: beklemede, bağımlı: [ A1 ], ne: "iki" )
    } }`));
  assert.equal(dag.dugumler.get("A1")!.zemin, undefined, "Adım kaynaklı kenar zemin sayılmamalı");
  assert.equal(dag.dugumler.get("A2")!.zemin, undefined, "Adım→Adım kenarı zemin sayılmamalı");
  assert.deepEqual(dag.dugumler.get("A1")!.oncekiler, ["TEK-TS"], "kenarEkle davranışı değişmemeli");
});

test("N3c · ZEMİN asıl yazımdan da doğar (V1B-KANON-A01): Katman'ın `kullanır` kenarı zemine iner, sıra kurmaz", () => {
  const dag = dagKur(progla(`
    Teknoloji( kod: TEK-TS, ad: "typescript", ne: "t" )
    Blok( kod: BLK, ne: "x" ) {
      Katman( kod: KAT, ad: "k", kullanır: TEK-TS ) {
        Adım( kod: A1, durum: beklemede, ne: "bir" )
      }
    }`));
  const kat = dag.dugumler.get("KAT")!;
  // ① Kanonik `kullanır: TEK-X` yazımı zemin kaydına iner — graf yüzü bağı çizmeyi sürdürür.
  assert.deepEqual(kat.zemin, ["TEK-TS"], "kullanır kenarı zemine inmeli — graf yüzü Katman→Teknoloji bağını kaybetmemeli");
  // ② `kullanır` yürütme sırası KURMAZ (ORK-1.2): kapsayıcı da yaprak da kenarsız kalır.
  assert.deepEqual(kat.oncekiler, [], "kullanır topolojik sıraya sızmamalı");
  assert.deepEqual(dag.dugumler.get("A1")!.oncekiler, [], "kullanır yaprak Adımlara açılmamalı — o bağımlı genişlemesinin işidir");
});

test("VIT-GRAF-A12 · MEVSİM: Faz'ın `çağır` çocuğu Blok'un mevsim alanına iner; yürütme sırası kurmaz", () => {
  // Tek Faz kullanılır ki kardeş-Faz zincirlemesi (MIM-1.2 ②a) hesaba karışmasın.
  const dag = dagKur(progla(`
    Faz( kod: FAZ-M, ad: "mevsim" ) {
      çağır BLK-M
    }
    Blok( kod: BLK-M, ne: "başka dosyada yaşayan gövde" ) {
      Katman( kod: KAT-M, ad: "k" ) { Adım( kod: ADM-M, durum: beklemede, ne: "iş" ) }
    }`));
  const blok = dag.dugumler.get("BLK-M")!;
  // ① Zaman aidiyeti Dag'a iner — graf yüzü Blok'un mevsimini buradan okur.
  assert.equal(blok.mevsim, "FAZ-M", "çağır kenarı Blok'un mevsim alanına inmeli");
  // ② Fiziksel kapsayan etkilenmez ve kenar yürütme sırası KURMAZ (kenarEkle yok).
  assert.equal(blok.kapsayan, undefined, "çağır bağı fiziksel kapsayan değildir");
  assert.deepEqual(blok.oncekiler, [], "mevsim kaydı topolojik sıraya sızmamalı");
  assert.deepEqual(dag.dugumler.get("ADM-M")!.oncekiler, [], "mevsim kaydı yaprak Adımlara açılmamalı");
  // ③ Faz'ın kendisi mevsim taşımaz; kayıt yalnız Blok ucundadır.
  assert.equal(dag.dugumler.get("FAZ-M")!.mevsim, undefined);
});

test("VIT-GRAF-A12 · beyanYolu `dosya:` BEYANIDIR, düğümün kaynağı olan `dosya` alanı DEĞİLDİR", () => {
  const dag = dagKur(progla(sar('Kod( kod: KOD-X, dosya: "cekirdek/src/dag.ts", ne: "m" )')));
  const d = dag.dugumler.get("KOD-X")!;
  assert.equal(d.beyanYolu, "cekirdek/src/dag.ts", "beyan edilen teslim yolu");
  assert.equal(d.dosya, "t.sar", "düğümün yaşadığı .sar kaynağı — beyanla karışmamalı");
  assert.notEqual(d.beyanYolu, d.dosya);
});

// ═══════════════════════════════════════════════════════════════════════════
// ORK-4 · ÇAPRAZ-PROJE YÜRÜTME KENARI (KPS-ADA-A01 · ikinci tur)
//
//   Ölçülmüş kusur: ad alanı ayracı referans, kimlik, denetim ve denetçi
//   modüllerinde tanınıyordu, buna karşılık yürütme kenarını kuran `dag.ts`
//   onu hiç tanımıyordu. Laboratuvarın yedi yürütme kenarının tamamı bu yüzden
//   kopuk-zincir uyarısı basıyordu; altısı ad alanlı hedefin kardeş kökte
//   gerçekten tanımlı olduğu hâllerdi.
//
//   MUTASYON KANITI — KARDEŞ KÖK KAPISI. `dag.ts` içindeki `hedefiCoz` işlevinin
//   ② şıkkında `secenek?.adAlaniCozulur?.(hedef, kaynakDosya)` çağrısı `false`
//   sabitiyle değiştirildiğinde birinci hüküm düşer ("çapraz kenar kopuk
//   sayılmamalı"); `true` sabitiyle değiştirildiğinde ikinci hüküm düşer
//   ("kardeş kökte de bulunmayan hedef kopuk kalmalı"). İkisi de geri alınmıştır.
//
//   MUTASYON KANITI — KÜRESEL EŞLEŞME YASAĞI. Aynı işlevin ① şıkkındaki
//   `hedefKapsamlar.some((k) => onekKapsar(k.onek, d.dosya))` süzgeci `true`
//   sabitiyle değiştirildiğinde üçüncü hüküm düşer: ad alanı yüklü evrende
//   çözülürken tesadüfî küresel eşleşme bağ hâline gelir. Geri alınmıştır.
// ═══════════════════════════════════════════════════════════════════════════

test("ORK-4: kardeş kökte çözülen ad alanlı yürütme kenarı KOPUK sayılmaz", () => {
  const dag = dagKur(progla(sar(`Adım( kod: A, bağımlı: PRJ-UZAK::ADM-UZAK, ne: "a" )`)),
    { adAlaniCozulur: (h) => h === "PRJ-UZAK::ADM-UZAK" });
  assert.deepEqual(dag.kopuk, [], "hedefi kardeş kökte yaşayan kenar kopuk-zincir üretmemeli");
  assert.equal(dag.disProje.length, 1, "kenar sessizce düşmez, çapraz-proje siciline iner");
  assert.equal(dag.disProje[0].hedef, "PRJ-UZAK::ADM-UZAK");
  assert.equal(dag.disProje[0].kenar, "bağımlı");
  assert.deepEqual(dag.dugumler.get("A")!.oncekiler, [], "yerel sıra hesabı kardeş düğümü içermez");
});

test("ORK-4: kardeş kökte de bulunmayan ad alanlı hedef KOPUK kalır", () => {
  const dag = dagKur(progla(sar(`Adım( kod: A, bağımlı: PRJ-UZAK::ADM-YOK, ne: "a" )`)),
    { adAlaniCozulur: () => false });
  assert.equal(dag.disProje.length, 0);
  assert.equal(dag.kopuk.length, 1, "çözülmeyen hedef ad alanlı olsa da kopuk-zincirdir");
  assert.equal(dag.kopuk[0].hedef, "PRJ-UZAK::ADM-YOK");
});

test("ORK-4: kapı verilmezse kardeş kök okunmaz — ad alanlı hedef kopuk sayılır", () => {
  const dag = dagKur(progla(sar(`Adım( kod: A, bağımlı: PRJ-UZAK::ADM-UZAK, ne: "a" )`)));
  assert.equal(dag.kopuk.length, 1, "kapısız çağrı bugünkü davranışı korur");
  assert.equal(dag.disProje.length, 0);
});

/** İki Projeli çatı fikstürü: aynı KOD iki depoda yaşar, kapsam hangisinin
 *  bağlanacağına karar verir (ORK-4 · tesadüfî küresel eşleşme bağ değildir). */
function catiFiksturu(): Map<string, Program> {
  const proje = (kod: string, adim: string) => ayristir(belirtecle(
    `Proje( kod: ${kod}, ne: "p" )\n`
    + `Blok( kod: BLK-${kod}, ne: "b" ) { Katman( kod: KAT-${kod}, ad: "k" ) {\n`
    + `  Adım( kod: ${adim}, ne: "hedef" )\n} }`));
  return new Map([
    ["acik/anadizin.sar", proje("PRJ-ACIK", "ADM-ORTAK")],
    ["kapali/anadizin.sar", proje("PRJ-KAPALI", "ADM-KAYNAK")],
  ]);
}

test("ORK-4: ad alanı YÜKLÜ evrende çözülürse kenar gerçekten grafa iner", () => {
  const programlar = catiFiksturu();
  const kaynak = ayristir(belirtecle(
    `Proje( kod: PRJ-KAPALI, ne: "p" )\n`
    + `Blok( kod: BLK-K2, ne: "b" ) { Katman( kod: KAT-K2, ad: "k" ) {\n`
    + `  Adım( kod: ADM-KAYNAK, bağımlı: PRJ-ACIK::ADM-ORTAK, ne: "kaynak" )\n} }`));
  programlar.set("kapali/plan.sar", kaynak);
  const dag = dagKur(programlar);
  assert.deepEqual(dag.kopuk, [], "ad alanı yüklü evrende çözülür, kopuk olmamalı");
  assert.deepEqual(dag.disProje, [], "yüklü evrende çözülen kenar dış-proje sicilinde değil grafta yaşar");
  assert.deepEqual(dag.dugumler.get("ADM-KAYNAK")!.oncekiler, ["ADM-ORTAK"],
    "ad alanlı hedef çıplak KOD'a inip yürütme sırasını kurmalı");
  assert.deepEqual(dag.dugumler.get("ADM-ORTAK")!.sonrakiler, ["ADM-KAYNAK"], "ters-türetme de kurulmalı");
});

test("ORK-4: ad alanı yüklü ama hedef O PROJENİN kapsamında değilse bağ kurulmaz (küresel eşleşme yasağı)", () => {
  const programlar = new Map([
    ["acik/anadizin.sar", ayristir(belirtecle(`Proje( kod: PRJ-ACIK, ne: "p" )`))],
    ["kapali/anadizin.sar", ayristir(belirtecle(
      `Proje( kod: PRJ-KAPALI, ne: "p" )\n`
      + `Blok( kod: BLK-K, ne: "b" ) { Katman( kod: KAT-K, ad: "k" ) {\n`
      + `  Adım( kod: ADM-YEREL, ne: "hedef" )\n`
      + `  Adım( kod: ADM-KAYNAK, bağımlı: PRJ-ACIK::ADM-YEREL, ne: "kaynak" )\n} }`))],
  ]);
  // ADM-YEREL yalnız KAPALI projede yaşar; PRJ-ACIK ad alanıyla istenmesi
  // tesadüfî eşleşmedir ve kapı bu kenarı kurmaz.
  const dag = dagKur(programlar, { adAlaniCozulur: () => true });
  assert.deepEqual(dag.dugumler.get("ADM-KAYNAK")!.oncekiler, [],
    "başka projenin ad alanıyla istenen yerel düğüm bağlanmamalı");
  assert.equal(dag.kopuk.length, 1, "yüklü ad alanının kapsamında bulunmayan hedef kopuktur");
  assert.equal(dag.kopuk[0].hedef, "PRJ-ACIK::ADM-YEREL");
  assert.equal(dag.disProje.length, 0, "yüklü ad alanı kardeş kök kapısına DÜŞMEZ");
});

test("ORK-4: ad alanlı öz-bağımlılık da öz-bağımlılıktır (kendi projesine nitelikli atıf)", () => {
  const programlar = new Map([
    ["kapali/anadizin.sar", ayristir(belirtecle(
      `Proje( kod: PRJ-KAPALI, ne: "p" )\n`
      + `Blok( kod: BLK-K, ne: "b" ) { Katman( kod: KAT-K, ad: "k" ) {\n`
      + `  Adım( kod: ADM-KAYNAK, bağımlı: PRJ-KAPALI::ADM-KAYNAK, ne: "kaynak" )\n} }`))],
  ]);
  const dag = dagKur(programlar);
  assert.equal(dag.oz.length, 1, "bir iş kendinden önce gelemez — ad alanlı yazım kaçış yolu değildir");
  assert.equal(dag.oz[0].hedef, "PRJ-KAPALI::ADM-KAYNAK");
  assert.deepEqual(dag.kopuk, []);
});

// ═══════════════════════════════════════════════════════════════════════════
// PRF-KP-B03 · Topolojik sıra nöbetleri (2026-08-30)
//
//   `topolojikSira` 2026-08-29 tarihinde asgari yığına taşındı (PRF-A06) ve
//   çıkarma anı doğrulamasını PRF-KP-B02 ile aldı. Aşağıdaki nöbetler üç şeyi
//   ölçer: yığın gövdesinin eski gövdeyle birebir aynı sonucu verdiğini (tohumlu
//   rastgele batarya ve on üç sabit şekil), `dagKur` çıktısının eşdeğerlik
//   koşulunu (her düğümde simetrik ve yinelenmesiz kenar listeleri) gerçekten
//   sağladığını ve yığın gövdesinin simetrik OLMAYAN girdide de eski kuralı
//   koruduğunu. Rastgele graflar ve sabit şekiller `dagKur` yolundan değil
//   doğrudan `Dag` nesnesi olarak kurulur; böylece simetrik olmayan, yinelenen
//   ve kopuk kenarlar da üretilir ve PRF-KP-B02 doğrulaması koşulsuz sınanır.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Eski referans gövde. Bu işlev, 2026-08-29 öncesi `topolojikSira` gövdesinin
 * birebir kopyasıdır: her yerleşimde bütün grafı baştan tarayıp süzen ve
 * `.sort()` ile en küçük kodu seçen Kahn gövdesi. Yalnız ad değiştirilmiş,
 * gövdeye dokunulmamıştır. Üretim kodu bu işlevi çağırmaz; yalnız eşdeğerlik
 * referansı olarak yaşar. Yavaştır, fakat küçük graflarda doğruluğu apaçık
 * olduğu için ölçü olarak seçilmiştir.
 */
function referansTopolojikSira(dag: Dag): SiraSonuc {
  const inDeg = new Map<string, number>();
  for (const [kod, d] of dag.dugumler) inDeg.set(kod, d.oncekiler.length);

  const yerlesti = new Set<string>();
  const sira: string[] = [];
  const sonraki = (): string | undefined =>
    [...dag.dugumler.keys()]
      .filter((k) => !yerlesti.has(k) && (inDeg.get(k) ?? 0) === 0)
      .sort()[0];

  for (let k = sonraki(); k !== undefined; k = sonraki()) {
    yerlesti.add(k);
    sira.push(k);
    for (const s of dag.dugumler.get(k)!.sonrakiler) inDeg.set(s, (inDeg.get(s) ?? 1) - 1);
  }

  const dongu = [...dag.dugumler.keys()].filter((k) => !yerlesti.has(k)).sort();
  return { sira, dongu };
}

/** Bir düğümün ham yazımı: kod, öncüller ve ardıllar. Listeler bilerek
 *  bağımsızdır; simetrik olmayan girdi bu üçlüyle üretilir. */
type HamDugum = [kod: string, oncekiler: string[], sonrakiler: string[]];

/** Doğrudan `Dag` kurar ve `dagKur` yolunu atlar; böylece `kenarEkle` içindeki
 *  içerme denetiminin hiç görmediği simetrik olmayan, yinelenen ve kopuk kenar
 *  listeleri de sınanabilir. Düğümler verilen sırayla haritaya girer. */
function hamDag(satirlar: HamDugum[]): Dag {
  const dugumler = new Map<string, DagDugum>();
  for (const [kod, oncekiler, sonrakiler] of satirlar) {
    dugumler.set(kod, { kod, tip: "Adım", dosya: "ham.sar", satir: 0, sutun: 0,
      oncekiler: [...oncekiler], sonrakiler: [...sonrakiler] });
  }
  return { dugumler, kopuk: [], oz: [], disProje: [] };
}

/** Simetrik graf kısayolu: kenar listesi iki yöne birden yazılır. Sabit
 *  şekillerin çoğu bu yoldan kurulur; simetrik olmayanlar `hamDag` ile yazılır. */
function simetrikDag(kodlar: string[], kenarlar: Array<[once: string, sonra: string]>): Dag {
  const satirlar = new Map<string, HamDugum>(kodlar.map((k) => [k, [k, [], []]]));
  for (const [once, sonra] of kenarlar) {
    satirlar.get(once)![2].push(sonra);
    satirlar.get(sonra)![1].push(once);
  }
  return hamDag([...satirlar.values()]);
}

/** Tohumlu doğrusal eşlenik üreteç. `Math.random` kullanılmaz; aynı tohum her
 *  koşuda aynı graf dizisini verir ve bir kırmızı sonuç numarasıyla yeniden
 *  üretilebilir. Sabitler Numerical Recipes'ten alınmıştır; dönüş [0, 1) aralığındadır. */
function tohumluUretec(tohum: number): () => number {
  let durum = tohum >>> 0;
  return () => {
    durum = (Math.imul(durum, 1664525) + 1013904223) >>> 0;
    return durum / 4294967296;
  };
}

/** Rastgele bataryanın kod havuzu: Türkçe harfler, büyük ve küçük harf
 *  çakışmaları, temel düzlem dışı karakterler (vekil çiftler), rakamla başlayan
 *  ve alt çizgiyle başlayan kodlar. Amaç, yığının UTF-16 kod birimi
 *  karşılaştırmasını `.sort()` varsayılanıyla her karakter sınıfında yüzleştirmektir. */
const KOD_HAVUZU: readonly string[] = [
  "A", "a", "B", "b", "C", "c", "Ç", "ç", "I", "ı", "İ", "i", "Ö", "ö", "Ü", "ü", "Ş", "ş", "Ğ", "ğ",
  "É", "é", "𝔸", "😀", "A-1", "a-1", "AB", "Ab", "aB", "ab", "Z", "z", "0", "1", "10", "2", "_", "Ça", "ça", "ÇA",
];

/** Sıfır ile on üç düğümlü rastgele bir graf üretir. Kenar denemeleri dört
 *  yazımdan birini seçer: simetrik kenar, yalnız ileri yön, yalnız geri yön ve
 *  grafta olmayan bir uca giden kopuk kenar. Öz-döngü (kaynak ile hedef aynı)
 *  ve aynı kenarın yinelenmesi engellenmez; ikisi de bilinçli girdidir, çünkü
 *  eşdeğerlik koşulsuz ölçülmektedir. */
function rastgeleDag(r: () => number): Dag {
  const n = Math.floor(r() * 14);
  const havuz = [...KOD_HAVUZU];
  const kodlar: string[] = [];
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(r() * (havuz.length - i));
    [havuz[i], havuz[j]] = [havuz[j]!, havuz[i]!];
    kodlar.push(havuz[i]!);
  }
  const satirlar: HamDugum[] = kodlar.map((kod) => [kod, [], []]);
  const deneme = n === 0 ? 0 : Math.floor(r() * (2 * n + 1));
  for (let e = 0; e < deneme; e++) {
    const i = Math.floor(r() * n), j = Math.floor(r() * n);
    const z = r();
    if (z < 0.5) { satirlar[i]![2].push(kodlar[j]!); satirlar[j]![1].push(kodlar[i]!); }
    else if (z < 0.7) satirlar[i]![2].push(kodlar[j]!);
    else if (z < 0.9) satirlar[j]![1].push(kodlar[i]!);
    else if (z < 0.95) satirlar[i]![2].push("YOK-" + Math.floor(r() * 3));
    else satirlar[j]![1].push("YOK-" + Math.floor(r() * 3));
  }
  return hamDag(satirlar);
}

/** Eşdeğerlik koşulunun ölçüsü (PRF-KP-B01 koşu kaydı): her düğümün `oncekiler`
 *  ile `sonrakiler` listeleri yinelenmesiz, uçları grafta, öz-döngüsüz ve karşı
 *  listede birebir karşılıklı olmalıdır. Bulunan her kusur bir cümle olarak
 *  döner; kusur yoksa dizi boştur. */
function degismezlikKusurlari(dag: Dag): string[] {
  const kusurlar: string[] = [];
  for (const d of dag.dugumler.values()) {
    if (new Set(d.oncekiler).size !== d.oncekiler.length) kusurlar.push(`${d.kod}: öncül listesi yineleniyor (${d.oncekiler.join(", ")})`);
    if (new Set(d.sonrakiler).size !== d.sonrakiler.length) kusurlar.push(`${d.kod}: ardıl listesi yineleniyor (${d.sonrakiler.join(", ")})`);
    if (d.oncekiler.includes(d.kod) || d.sonrakiler.includes(d.kod)) kusurlar.push(`${d.kod}: öz-döngü kenara inmiş`);
    for (const o of d.oncekiler) {
      const od = dag.dugumler.get(o);
      if (!od) kusurlar.push(`${d.kod}: öncül ${o} grafta yok`);
      else if (!od.sonrakiler.includes(d.kod)) kusurlar.push(`${o} → ${d.kod}: öncül yazılı, ardıl türetilmemiş`);
    }
    for (const s of d.sonrakiler) {
      const sd = dag.dugumler.get(s);
      if (!sd) kusurlar.push(`${d.kod}: ardıl ${s} grafta yok`);
      else if (!sd.oncekiler.includes(d.kod)) kusurlar.push(`${d.kod} → ${s}: ardıl yazılı, öncül yok`);
    }
  }
  return kusurlar;
}

/** Gerçek tek yönlü asimetri: iki ucu da grafta olan bir kenarın yalnız bir
 *  listede yazılı olması. Yineleme, öz-döngü ve grafta olmayan uç bu ölçüye
 *  girmez; onlar `degismezlikKusurlari` içinde ayrı sayılır. Batarya bu iki
 *  sayıyı ayrı raporlar ki "simetrik olmayan" sözü gerçek asimetriyi ansın. */
function tekYonluKenarVar(dag: Dag): boolean {
  for (const d of dag.dugumler.values()) {
    for (const o of d.oncekiler) { const od = dag.dugumler.get(o); if (od && !od.sonrakiler.includes(d.kod)) return true; }
    for (const s of d.sonrakiler) { const sd = dag.dugumler.get(s); if (sd && !sd.oncekiler.includes(d.kod)) return true; }
  }
  return false;
}

/** Bir grafı hata iletisinde okunur kılar: kod, öncüller, ardıllar. */
const grafYazimi = (dag: Dag): string =>
  JSON.stringify([...dag.dugumler.values()].map((d) => [d.kod, d.oncekiler, d.sonrakiler]));

test("PRF-KP-B03 · beş bin tohumlu rastgele grafta yığın gövdesi eski gövdeyle birebirdir (simetrik olmayan girdiler dâhil)", (t) => {
  const r = tohumluUretec(20260830);
  let degismezlikKusurlu = 0, tekYonlu = 0, dongulu = 0, kusurluDurum = 0;
  for (let i = 0; i < 5000; i++) {
    const dag = rastgeleDag(r);
    if (degismezlikKusurlari(dag).length) degismezlikKusurlu++;
    if (tekYonluKenarVar(dag)) tekYonlu++;
    const beklenen = referansTopolojikSira(dag);
    const gercek = topolojikSira(dag);
    if (beklenen.dongu.length) dongulu++;
    // Hata iletisi yalnız fark bulununca kurulur; beş bin döngüde dizgi üretmek gereksizdir.
    if (JSON.stringify(gercek) !== JSON.stringify(beklenen)) {
      kusurluDurum++;
      assert.deepEqual(gercek, beklenen, `graf #${i} (tohum 20260830) iki gövdede ayrıştı: ${grafYazimi(dag)}`);
    }
  }
  assert.equal(kusurluDurum, 0);
  // Bataryanın dişi olduğu ölçülür: değişmezlik kusurlu (yineleme, öz-döngü, kopuk uç ya da tek yön),
  // gerçek tek yönlü asimetri taşıyan ve döngü içeren graflar gerçekten üretilmiştir. Sayılar tohuma
  // bağlı ve deterministiktir; eşikler ölçülen değerin belirgin altında tutulur.
  assert.ok(degismezlikKusurlu >= 2500, `değişmezlik kusurlu graf sayısı beklenenden az: ${degismezlikKusurlu}`);
  assert.ok(tekYonlu >= 1500, `gerçek tek yönlü asimetri taşıyan graf sayısı beklenenden az: ${tekYonlu}`);
  assert.ok(tekYonlu <= degismezlikKusurlu, "tek yönlü asimetri değişmezlik kusurunun alt kümesidir");
  assert.ok(dongulu >= 500, `döngü içeren graf sayısı beklenenden az: ${dongulu}`);
  // Ölçülen sayılar plan kaydına yazılır; değişirse kayıt da değişmelidir.
  t.diagnostic(`PRF-KP-B03 batarya · değişmezlik kusurlu ${degismezlikKusurlu} · tek yönlü ${tekYonlu} · döngülü ${dongulu}`);
});

/** Sabit şekiller: her biri hem yığın gövdesinde hem referans gövdede beklenen
 *  sonucu vermelidir. Beklenen sonuçlar elle yazılmıştır; referans gövdeyle de
 *  karşılaştırılır ki fikstürün kendisi yanlış yazılmışsa o da yakalansın. */
interface OzelSekil { ad: string; dag: () => Dag; sira: string[]; dongu: string[] }

/** Türkçe ve UTF-16 kümesi. Beklenen sıra kod birimi sırasıdır: Latin büyük
 *  harf (0x41, 0x49), Latin küçük harf (0x61, 0x63, 0x69), Latin-1 ek (Ç 0xC7,
 *  Ü 0xDC, é 0xE9), Latin genişletilmiş (İ 0x130, ı 0x131) ve vekil çiftler
 *  (𝔸 0xD835, 😀 0xD83D). Yerel (locale) sıralama bu diziyi vermez; sözleşme
 *  bilinçli olarak `.sort()` varsayılanıdır. */
const UTF16_KUMESI = ["😀-1", "𝔸-1", "ı-3", "İ-2", "é", "Ü-1", "ÇAP-1", "i-1", "cap-1", "a-1", "I-1", "A-1"];
const UTF16_SIRASI = ["A-1", "I-1", "a-1", "cap-1", "i-1", "ÇAP-1", "Ü-1", "é", "İ-2", "ı-3", "𝔸-1", "😀-1"];

const OZEL_SEKILLER: OzelSekil[] = [
  { ad: "boş graf", dag: () => simetrikDag([], []), sira: [], dongu: [] },
  { ad: "tek düğüm", dag: () => simetrikDag(["TEK"], []), sira: ["TEK"], dongu: [] },
  { ad: "üç düğümlü zincir, kaynak sırası ters",
    dag: () => simetrikDag(["C", "B", "A"], [["A", "B"], ["B", "C"]]), sira: ["A", "B", "C"], dongu: [] },
  { ad: "elmas: iki yoldan aynı hedefe",
    dag: () => simetrikDag(["D", "C", "B", "A"], [["A", "B"], ["A", "C"], ["B", "D"], ["C", "D"]]),
    sira: ["A", "B", "C", "D"], dongu: [] },
  { ad: "Türkçe ve UTF-16 kümesi, bağımsız düğümler kod birimi sırasında",
    dag: () => simetrikDag(UTF16_KUMESI, []), sira: UTF16_SIRASI, dongu: [] },
  { ad: "Türkçe ve UTF-16 kümesi, vekil çiftli düğüm Latin düğümün önüne kenarla geçer",
    dag: () => simetrikDag(UTF16_KUMESI, [["😀-1", "A-1"]]),
    sira: [...UTF16_SIRASI.filter((k) => k !== "A-1"), "A-1"], dongu: [] },
  { ad: "iki çocuklu yığın batırması: sekiz hazır düğüm dururken yedi düğüm aynı anda serbest kalır ve diziye iç içe girer",
    dag: () => simetrikDag(
      ["C4", "B7", "A", "B2", "C1", "B9", "B4", "C5", "B1", "B6", "C3", "B3", "B8", "C2", "B5"],
      [["A", "B2"], ["A", "B4"], ["A", "B6"], ["A", "B8"], ["A", "C1"], ["A", "C3"], ["A", "C5"]]),
    sira: ["A", "B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8", "B9", "C1", "C2", "C3", "C4", "C5"], dongu: [] },
  { ad: "döngü artı kuyruk: döngüye asılı kuyruk da döngü kümesine düşer",
    dag: () => simetrikDag(["T2", "T1", "Z", "Y", "X", "Q", "P"],
      [["Q", "X"], ["X", "Y"], ["Y", "Z"], ["Z", "X"], ["Z", "T1"], ["T1", "T2"]]),
    sira: ["P", "Q"], dongu: ["T1", "T2", "X", "Y", "Z"] },
  { ad: "öz-döngü yazılmış düğüm hiç yerleşmez",
    dag: () => hamDag([["A", ["A"], ["A"]], ["B", [], []]]), sira: ["B"], dongu: ["A"] },
  { ad: "kopuk ardıl yerleşimi bozmaz, hayalet öncül düğümü döngüye düşürür",
    dag: () => hamDag([["A", [], ["YOK"]], ["B", ["HAYALET"], []]]), sira: ["A"], dongu: ["B"] },
  { ad: "karşı deney (PRF-KP-B01): A.sonrakiler iki kez B, B.oncekiler bir kez A → sıra A, döngü B",
    dag: () => hamDag([["A", [], ["B", "B"]], ["B", ["A"], []]]), sira: ["A"], dongu: ["B"] },
  { ad: "ters asimetri: ardıl yazılı, öncül yazılmamış düğüm zaten yerleşmişse negatife düşmesi zararsızdır",
    dag: () => hamDag([["B", [], ["A"]], ["A", [], []]]), sira: ["A", "B"], dongu: [] },
  { ad: "büyük hazır küme: yüz bağımsız düğüm karışık sırada girer, alfabetik ilk kod olan batak en sona düşer",
    dag: () => {
      const r = tohumluUretec(7);
      const kodlar = Array.from({ length: 100 }, (_, i) => "D" + String(i).padStart(3, "0"));
      for (let i = kodlar.length - 1; i > 0; i--) {
        const j = Math.floor(r() * (i + 1));
        [kodlar[i], kodlar[j]] = [kodlar[j]!, kodlar[i]!];
      }
      return simetrikDag(["A-BATAK", ...kodlar], kodlar.map((k): [string, string] => [k, "A-BATAK"]));
    },
    sira: [...Array.from({ length: 100 }, (_, i) => "D" + String(i).padStart(3, "0")), "A-BATAK"], dongu: [] },
];

for (const [i, sekil] of OZEL_SEKILLER.entries()) {
  test(`PRF-KP-B03 · şekil ${i + 1}/${OZEL_SEKILLER.length} · ${sekil.ad}`, () => {
    const dag = sekil.dag();
    const beklenen = { sira: sekil.sira, dongu: sekil.dongu };
    assert.deepEqual(referansTopolojikSira(dag), beklenen, "referans gövde beklenen sonucu vermeli (fikstür doğru yazılmış mı?)");
    assert.deepEqual(topolojikSira(dag), beklenen, "yığın gövdesi beklenen sonucu vermeli");
  });
}

/** Değişmezlik nöbetinin okuduğu fikstür programları. Kenar biçimleri bilinçli
 *  olarak çeşitlidir: aynı hedef iki kez yazılmış `bağımlı`, kapsayıcı hedefli
 *  yazımın açık yazımla çakışması, aynı çiftin `besler` ile `bağımlı` yoluyla
 *  iki uçtan yazılması, öz-bağımlılık, çözülmeyen uç, dosyalar arası kenar ve
 *  Kapı'lı Faz zinciri (MIM-1.2). Her biri `kenarEkle` içindeki içerme denetimi
 *  ile ters yön yazımını ayrı bir yoldan zorlar. */
function degismezlikFiksturu(): Map<string, Program> {
  const kaynaklar: Record<string, string> = {
    "plan/a.sar": `
Blok( kod: BLK-A, ne: "a bloğu" ) {
  Katman( kod: KAT-A1, ad: "birinci" ) {
    AltKatman( kod: ALT-A1, ad: "alt" ) {
      Adım( kod: A1, ne: "bir" )
      Adım( kod: A2, bağımlı: [ A1, A1 ], ne: "iki" )
      Adım( kod: A3, bağımlı: [ A1, A2, ALT-A1 ], ne: "üç" )
      Adım( kod: A4, bağımlı: A2, besler: A5, ne: "dört" )
      Adım( kod: A5, bağımlı: A4, ne: "beş" )
      Adım( kod: A6, bağımlı: A6, ne: "altı" )
      Adım( kod: A7, bağımlı: YOK-BOYLE-KOD, ne: "yedi" )
    }
  }
  Katman( kod: KAT-A2, ad: "ikinci", bağımlı: KAT-A1 ) {
    Adım( kod: A8, bağımlı: [ A1, KAT-A1 ], ne: "sekiz" )
    Adım( kod: A9, besler: [ A8, BLK-B ], ne: "dokuz" )
  }
}`,
    "plan/b.sar": `
Blok( kod: BLK-B, ne: "b bloğu", bağımlı: BLK-A ) {
  Katman( kod: KAT-B1, ad: "b bir" ) {
    Adım( kod: B1, bağımlı: A9, ne: "bir" )
    Adım( kod: B2, bağımlı: [ B1, A3 ], besler: B3, ne: "iki" )
    Adım( kod: B3, bağımlı: B2, ne: "üç" )
  }
}`,
    "plan/c.sar": `
Proje( kod: PRJ-C, ad: "zaman" ) {
  Faz( kod: FZ-C1, ad: "birinci mevsim", hedefTarih: "2026-01" ) {
    Blok( kod: BLK-C1, ne: "c bir" ) {
      Adım( kod: C1, ne: "bir", durum: tamamlandı )
      Adım( kod: C2, bağımlı: C1, ne: "iki", durum: tamamlandı )
    }
    Kapı( kod: KAPI-C1, ne: "birinci kapı" )
  }
  Faz( kod: FZ-C2, ad: "ikinci mevsim", hedefTarih: "2026-02" ) {
    Blok( kod: BLK-C2, ne: "c iki" ) {
      Adım( kod: C3, bağımlı: [ C2, B3 ], ne: "üç" )
      Adım( kod: C4, bağımlı: BLK-C1, ne: "dört" )
    }
  }
}`,
  };
  return new Map(Object.entries(kaynaklar).map(([dosya, kaynak]) => [dosya, ayristir(belirtecle(kaynak))]));
}

test("PRF-KP-B03 · dagKur değişmezliği: gerçek program kümesinde her düğümün öncül ve ardıl listeleri simetrik ve yinelenmesizdir", () => {
  const dag = dagKur(degismezlikFiksturu());
  const kenar = [...dag.dugumler.values()].reduce((toplam, d) => toplam + d.oncekiler.length, 0);
  // Nöbetin boşa dönmediği ölçülür: fikstür yeterince düğüm ve kenar taşımalıdır.
  assert.ok(dag.dugumler.size >= 20, `fikstür en az yirmi düğüm taşımalı: ${dag.dugumler.size}`);
  assert.ok(kenar >= 40, `fikstür en az kırk kenar taşımalı: ${kenar}`);
  assert.deepEqual(degismezlikKusurlari(dag), []);
  // Eşdeğerlik koşulu sağlanınca iki gövde gerçek grafta da birebirdir ve döngü yalnız öz-bağımlı düğümdedir.
  const beklenen = referansTopolojikSira(dag);
  assert.deepEqual(topolojikSira(dag), beklenen);
  assert.deepEqual(beklenen.dongu, [], "fikstür döngüsüzdür; öz-bağımlılık kenara inmez, sicile iner");
  // İki öz-bağımlılık beklenir: A6'nın doğrudan kendine yazdığı kenar ve A3'ün kendi
  // kapsayıcısı ALT-A1'e yazdığı dolaylı kenar (genişleme kendini içerir).
  assert.equal(dag.oz.length, 2, "doğrudan (A6) ve dolaylı (A3 → ALT-A1) öz-bağımlılık sicile düşmeli");
  assert.equal(dag.kopuk.length, 1, "A7'nin çözülmeyen ucu kopuk sicile düşmeli");
});

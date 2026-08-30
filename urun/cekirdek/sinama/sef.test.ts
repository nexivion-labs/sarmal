import { test } from "node:test";
import assert from "node:assert/strict";
import { belirtecle } from "../src/belirtec.ts";
import { ayristir } from "../src/ayristirici.ts";
import type { Program } from "../src/sozdizim.ts";
import { baglamMontajla, promptUret, tokenSay, kavramOnerileriCoz, kavramVerisiYukle } from "../src/sef.ts";

const SAR = `
Blok( kod: B1, ne: "hedef blok" ) { }
Katman( kod: K ){
  Adım( kod: A1, görev: "işi yap", kabul: [ "olmalı" ], referans: [ B1 ], dokunulmaz: "X dosyası", sınır: "sadece A" )
}
`;
const programlar = (): Map<string, Program> => new Map([["t.sar", ayristir(belirtecle(SAR))]]);

test("baglamMontajla — Adım'ı bulur, koni + çözülen referans montajlar", () => {
  const p = baglamMontajla(programlar(), "A1");
  assert.ok(p, "paket dönmeli");
  assert.equal(p!.adimKod, "A1");
  assert.equal(p!.koni.görev, "işi yap");
  assert.match(p!.koni.kabul, /olmalı/);
  assert.equal(p!.koni.sınır, "sadece A");
  // referans B1 index'te tanımlı → çözüldü
  assert.equal(p!.referanslar.length, 1);
  assert.equal(p!.referanslar[0].kod, "B1");
  assert.equal(p!.referanslar[0].çözüldü, true);
});

test("baglamMontajla — bilinmeyen KOD → undefined", () => {
  assert.equal(baglamMontajla(programlar(), "YOK"), undefined);
});

test("promptUret — parantezleme (kritik kısıt önce, kapanış-özeti sonra) + guard", () => {
  const prompt = promptUret(baglamMontajla(programlar(), "A1")!);
  const iKisit = prompt.indexOf("Kritik Kısıtlar");
  const iGorev = prompt.indexOf("Görev");
  const iKapanis = prompt.indexOf("özeti (son)");   // HTR-A01: "Hatırlatma (son)" → "Kritik-kısıt özeti (son)"
  assert.ok(iKisit >= 0 && iGorev >= 0 && iKapanis >= 0, "üç bölüm de var");
  assert.ok(iKisit < iGorev, "kritik kısıtlar görevden ÖNCE (parantez açılışı)");
  assert.ok(iGorev < iKapanis, "kapanış özeti görevden SONRA (parantez kapanışı)");
  assert.match(prompt, /Halüsinasyon/); // TPL-023 guard gömülü
  assert.match(prompt, /işi yap/);      // görev içeriği
  assert.match(prompt, /B1 →/);         // çözülen bağ
});

// ── HTR-A01 (IDA dogfood oturum-2 · BUG-1 · TIP-1.12): hatırlat koniye enjekte ─
const HSAR = `
Katman( kod: KH ){
  Adım( kod: ADM-HEDEF, görev: "tasarım", durum: geliştirmede )
  Adım( kod: ADM-BOS, görev: "başka" )
}
Hatırlatıcı( kod: HTR-1, durum: kararlaştı, çapa: mimari, öncelik: p1, hatırlat: ADM-HEDEF, ne: "kısa mesaj" )
Hatırlatıcı( kod: HTR-2, durum: açık, çapa: gelecek, öncelik: p2, hatırlat: ADM-HEDEF, ne: "${"x".repeat(300)}" )
Hatırlatıcı( kod: HTR-BITTI, durum: tamamlandı, çapa: mimari, hatırlat: ADM-HEDEF, ne: "girmemeli" )
Hatırlatıcı( kod: HTR-BASKA, durum: açık, çapa: mimari, hatırlat: ADM-BOS, ne: "başka hedef" )
`;
const htrProg = (): Map<string, Program> => new Map([["h.sar", ayristir(belirtecle(HSAR))]]);

test("HTR-A01: hedefe hatırlat eden açık/kararlaştı Hatırlatıcı koniye girer; tamamlandı/başka-hedef girmez", () => {
  const p = baglamMontajla(htrProg(), "ADM-HEDEF")!;
  const kodlar = p.hatırlatıcılar.map((h) => h.kod);
  assert.deepEqual(kodlar.sort(), ["HTR-1", "HTR-2"], "yalnız açık/kararlaştı + doğru hedef; gelen: " + JSON.stringify(kodlar));
  const h1 = p.hatırlatıcılar.find((h) => h.kod === "HTR-1")!;
  assert.equal(h1.öncelik, "p1");
  assert.equal(h1.çapa, "mimari");
});

test("HTR-A01: uzun ne token-ekonomik kısaltılır (≤~120 kr + …)", () => {
  const p = baglamMontajla(htrProg(), "ADM-HEDEF")!;
  const h2 = p.hatırlatıcılar.find((h) => h.kod === "HTR-2")!;
  assert.ok(h2.ne.length <= 121, "ne kısaltılmalı; uzunluk: " + h2.ne.length);
  assert.ok(h2.ne.endsWith("…"), "kısaltma işareti (…) olmalı");
});

test("HTR-A01: promptUret 🔔 Bağlı Hatırlatıcılar bölümünü kapanıştan ÖNCE basar", () => {
  const prompt = promptUret(baglamMontajla(htrProg(), "ADM-HEDEF")!);
  assert.match(prompt, /🔔 Bağlı Hatırlatıcılar/, "🔔 bölümü basılmalı");
  assert.match(prompt, /HTR-1 \[p1·mimari\]/, "kod [öncelik·çapa] biçimi");
  assert.ok(prompt.indexOf("🔔 Bağlı") < prompt.indexOf("özeti (son)"), "🔔 kapanış-özetinden ÖNCE (yüksek dikkat)");
  // hatırlatıcısı olmayan Adım'da 🔔 bölümü YOK
  assert.doesNotMatch(promptUret(baglamMontajla(htrProg(), "ADM-BOS")!), /HTR-1/);
});

test("tokenSay — yaklaşık ~4 karakter/token", () => {
  assert.equal(tokenSay(""), 0);
  assert.equal(tokenSay("abcd"), 1);
  assert.equal(tokenSay("abcde"), 2); // ceil(5/4)
});

// ── D.2 · Beceri (skill) enjeksiyonu ─────────────────────────────────────────
const BSAR = `
Beceri( kod: BCR-X, yığın: flutter, ne: "flutter bloc", kurallar: "state immutable tut", antiDesen: "setState karıştırma", örnek: "BlocProvider" )
Beceri( kod: BCR-Y, ne: "ikinci beceri" )
Katman( kod: K ){
  Adım( kod: A1, görev: "yap", kullanır: BCR-X )
  Adım( kod: A2, görev: "yap2", kullanır: [ BCR-X, BCR-Y ] )
  Adım( kod: A3, görev: "yap3", kullanır: BCR-YOK )
  Adım( kod: A4, görev: "yap4" )
}
`;
const progB = (): Map<string, Program> => new Map([["b.sar", ayristir(belirtecle(BSAR))]]);

test("baglamMontajla — kullanır: BCR-X çözülür (ne/kurallar/antiDesen dolu)", () => {
  const b = baglamMontajla(progB(), "A1")!.beceriler;
  assert.equal(b.length, 1);
  assert.equal(b[0].kod, "BCR-X");
  assert.equal(b[0].çözüldü, true);
  assert.equal(b[0].ne, "flutter bloc");
  assert.match(b[0].kurallar, /immutable/);
  assert.match(b[0].antiDesen, /setState/);
});

test("baglamMontajla — liste kullanır: [BCR-X, BCR-Y] iki beceri çözülür; BCR-YOK çözülmez", () => {
  assert.equal(baglamMontajla(progB(), "A2")!.beceriler.length, 2);
  const yok = baglamMontajla(progB(), "A3")!.beceriler;
  assert.equal(yok.length, 1);
  assert.equal(yok[0].çözüldü, false);
  assert.equal(baglamMontajla(progB(), "A4")!.beceriler.length, 0);
});

test("promptUret — beceri kullanan Adım'da '🛠️ Beceriler' bölümü + kural/anti-desen; kullanmayanda yok", () => {
  const p1 = promptUret(baglamMontajla(progB(), "A1")!);
  assert.match(p1, /🛠️ Beceriler/);
  assert.match(p1, /immutable/);
  assert.match(p1, /Anti-desen.*setState/);
  const p4 = promptUret(baglamMontajla(progB(), "A4")!);
  assert.doesNotMatch(p4, /Beceriler/);
});

// ── A10 · Tetikleyici → Beceri aktivasyonu ───────────────────────────────────
const TSAR = `
Etmen( kod: ETM-T, tür: uzman, yetki: L3, bellek: izole ){
  Tetikleyici( kod: TRG-GEL, koşul: adım.durum == geliştirmede, tetikler: BCR-T, ne: "geliştirmede ateşle" )
  Tetikleyici( kod: TRG-PROSE, koşul: "iş geldiğinde", tetikler: BCR-P, ne: "prose koşul" )
  Tetikleyici( kod: TRG-BEL, koşul: adım.güven >= 0.7, tetikler: BCR-B, ne: "belirsiz alan" )
}
Beceri( kod: BCR-T, ne: "tetik becerisi", kurallar: "t-kural", antiDesen: "t-anti" )
Beceri( kod: BCR-P, ne: "prose becerisi" )
Beceri( kod: BCR-B, ne: "belirsiz becerisi" )
Katman( kod: K ){
  Adım( kod: A-GEL, görev: "yap", durum: geliştirmede )
  Adım( kod: A-BEK, görev: "yap2", durum: beklemede )
  Adım( kod: A-DUP, görev: "yap3", durum: geliştirmede, kullanır: BCR-T )
}
`;
const progT = (): Map<string, Program> => new Map([["t.sar", ayristir(belirtecle(TSAR))]]);

test("A10 — yapısal koşul true → Beceri fire (tetikleyici işaretli); prose/belirsiz fire etmez", () => {
  const b = baglamMontajla(progT(), "A-GEL")!.beceriler;
  const kodlar = b.map((x) => x.kod);
  assert.ok(kodlar.includes("BCR-T"), "durum==geliştirmede → BCR-T fire");
  assert.equal(b.find((x) => x.kod === "BCR-T")!.tetikleyici, "TRG-GEL");
  assert.ok(!kodlar.includes("BCR-P"), "prose koşul fire etmez (GİZLİ sınırı)");
  assert.ok(!kodlar.includes("BCR-B"), "belirsiz alan (güven yok) fire etmez (üç-değerli)");
});

test("A10 — koşul false → fire etmez", () => {
  assert.equal(baglamMontajla(progT(), "A-BEK")!.beceriler.length, 0, "durum==beklemede → TRG-GEL false");
});

test("A10 — statik kullanır: + tetik aynı BCR → dedupe (tek kez, statik kaynak)", () => {
  const b = baglamMontajla(progT(), "A-DUP")!.beceriler;
  const tCount = b.filter((x) => x.kod === "BCR-T").length;
  assert.equal(tCount, 1, "BCR-T tek kez");
  assert.equal(b.find((x) => x.kod === "BCR-T")!.tetikleyici, undefined, "statik kaynak (tetik değil)");
});

// ── K7 Görev köprüsü: Görev-dolaylı Etmen→Beceri enjeksiyonu ──────────────────
const SAR_KV = `
Blok( kod: BKV, ne: "köprü vitrin" ) {
  Katman( kod: KKV ){
    Adım( kod: A-KADRO, görev: "kadro becerisiyle iş" )
    Adım( kod: A-KONI, görev: "konili iş" )
    Adım( kod: A-YALIN, görev: "görevsiz iş" )
    Adım( kod: A-KRUM, görev: "çakışma", kullanır: [ BCR-X ] )
  }
  Etmen( kod: ETM-USTA, tür: uzman, uzmanlık: "demo", yetki: L3, bellek: izole, ne: "usta", uygular: ANY-Z ){
    Beceri( kod: BCR-X, sağlar: YTN-X, yığın: evrensel, ne: "beceri X", neZaman: "hep", kurallar: "kural-X", örnek: "ör-X", antiDesen: "anti-X", uygular: ANY-Z )
    Beceri( kod: BCR-Y, sağlar: YTN-Y, yığın: evrensel, ne: "beceri Y", neZaman: "hep", kurallar: "kural-Y", örnek: "ör-Y", antiDesen: "anti-Y", uygular: ANY-Z )
    Kanca( kod: KNC-ONCE, evre: önce, ne: "kaynak-teyit kapısı" )
    Kanca( kod: KNC-SONRA, evre: sonra, ne: "öz-denetim" )
    Kanca( kod: KNC-BOZUK, evre: gündüz, ne: "enum-dışı evre → toplanmamalı" )
  }
  Görev( kod: GRV-KADRO, ne: "kadro görevi", gerçekleştirir: A-KADRO, atanan: ETM-USTA )
  Görev( kod: GRV-KONI, ne: "koni görevi", gerçekleştirir: A-KONI, atanan: ETM-USTA, beceriKonisi: [ BCR-X ] )
  Görev( kod: GRV-KRUM, ne: "çakışma görevi", gerçekleştirir: A-KRUM, atanan: ETM-USTA )
}
`;
const progKV = (): Map<string, Program> => new Map([["kv.sar", ayristir(belirtecle(SAR_KV))]]);

test("K7 köprü — Görev'li Adım'da atanan Etmen'in gömülü becerileri enjekte (etmen işaretli)", () => {
  const b = baglamMontajla(progKV(), "A-KADRO")!.beceriler;
  assert.equal(b.length, 2, "ETM-USTA'nın iki gömülü becerisi");
  assert.deepEqual(b.map((x) => x.kod).sort(), ["BCR-X", "BCR-Y"]);
  assert.ok(b.every((x) => x.etmen === "ETM-USTA"), "hepsi atanan Etmen işaretli");
  assert.equal(b.find((x) => x.kod === "BCR-X")!.kurallar, "kural-X", "gömülü beceri içeriği çözüldü");
});

test("K7 köprü — beceriKonisi verilince yalnız o alt-küme (least-context)", () => {
  const b = baglamMontajla(progKV(), "A-KONI")!.beceriler;
  assert.equal(b.length, 1);
  assert.equal(b[0].kod, "BCR-X", "beceriKonisi=[BCR-X] → yalnız BCR-X");
});

test("K7 köprü — Görev yok → köprü tetiklenmez (yalın Adım boş beceri)", () => {
  assert.equal(baglamMontajla(progKV(), "A-YALIN")!.beceriler.length, 0);
});

test("K7 köprü — kullanır: + Görev aynı BCR → dedupe (kullanır kazanır, etmen işaretsiz)", () => {
  const b = baglamMontajla(progKV(), "A-KRUM")!.beceriler;
  assert.equal(b.filter((x) => x.kod === "BCR-X").length, 1, "BCR-X tek kez");
  assert.equal(b.find((x) => x.kod === "BCR-X")!.etmen, undefined, "kullanır: kaynağı (Görev değil)");
  assert.ok(b.some((x) => x.kod === "BCR-Y" && x.etmen === "ETM-USTA"), "BCR-Y Görev'den (etmen işaretli)");
});

test("K7 köprü — promptUret ⚙️etmen işareti Görev-becerisinde görünür", () => {
  const prompt = promptUret(baglamMontajla(progKV(), "A-KADRO")!);
  assert.match(prompt, /⚙️ETM-USTA/, "atanan Etmen kaynağı prompt'ta işaretli");
  assert.match(prompt, /kural-X/, "gömülü beceri kuralı prompt'ta");
});

// ── K9 Kanca toplama (A23): atanan Etmen'in Kanca çocukları evre-gruplu paket'e ──
test("K9 toplama — Görev'li Adım'da atanan Etmen'in Kanca'ları evre'siyle toplanır", () => {
  const kancalar = baglamMontajla(progKV(), "A-KADRO")!.kancalar;
  assert.deepEqual(kancalar.map((k) => k.kod).sort(), ["KNC-ONCE", "KNC-SONRA"], "geçerli evre'liler toplandı");
  assert.equal(kancalar.find((k) => k.kod === "KNC-ONCE")!.evre, "önce");
  assert.ok(kancalar.every((k) => k.etmen === "ETM-USTA"), "atanan Etmen kaynak-işaretli");
});

test("K9 toplama — enum-dışı evre (gündüz) atlanır (A15 enum ile hizalı)", () => {
  const kancalar = baglamMontajla(progKV(), "A-KADRO")!.kancalar;
  assert.ok(!kancalar.some((k) => k.kod === "KNC-BOZUK"), "geçersiz evre toplanmaz");
});

test("K9 toplama — Görev yok → kancalar boş (geriye-uyumlu)", () => {
  assert.deepEqual(baglamMontajla(progKV(), "A-YALIN")!.kancalar, []);
});

// ── HALKA-ORK-A03: Etmen-düzeyi Tetikleyici (kadro tetikle devreye girer) ─────
test("ORK-A03: koşulu tutan Tetikleyici hedefi ETMEN ise ajan ateşlenir (kimlik+beceriler); Görev ataması varsa tetik devreye girmez", () => {
  const SAR = `Proje( kod: PRJ-TRG, ad: "t", ne: "t" ) {
    Etmen( kod: ETM-TETIKLI, ad: "tetikli-uzman", tür: uzman, ne: "koşulla gelir" ) {
      Beceri( kod: BCR-TETIK-GELEN, ne: "tetikle gelen beceri", neZaman: "tetikte", kurallar: "k", antiDesen: "yok" )
    }
    Tetikleyici( kod: TRG-ETMEN, koşul: adım.durum == geliştirmede, tetikler: [ ETM-TETIKLI ], ne: "geliştirmede Adım'a uzman çek" )
    Blok( kod: BLK-TRG, ne: "b" ) { Katman( kod: FZ-TRG, ad: "f" ) { AltKatman( kod: KT-TRG, ad: "k" ) {
      Adım( kod: ADM-TETIK, durum: geliştirmede, görev: "iş", bağımlı: [], ne: "tetiklenecek" )
      Adım( kod: ADM-UYUYAN, durum: beklemede, ne: "koşul tutmaz — tetik uyur" )
    } } }
  }`;
  const programlar = new Map([["t.sar", ayristir(belirtecle(SAR))]]);
  const ateşli = baglamMontajla(programlar, "ADM-TETIK")!;
  assert.deepEqual(ateşli.etmen, { kod: "ETM-TETIKLI", ad: "tetikli-uzman" }, "koşul tutan Adım'da ajan ateşlenmeli");
  assert.ok(ateşli.beceriler.some((b) => b.kod === "BCR-TETIK-GELEN" && b.etmen === "ETM-TETIKLI"),
    "ateşlenen ajanın gömülü becerisi koni'ye girmeli (ORK-A04)");
  const uyuyan = baglamMontajla(programlar, "ADM-UYUYAN")!;
  assert.equal(uyuyan.etmen, undefined, "koşul tutmayan Adım'da tetik uyur (yan etki yok)");
});

// ── KVR-A08: kavram rehberi — bağlam→kavram önerileri ŞEF paketine iner ──────

const KAVRAM_VERI = {
  harita: {
    aileler: {
      "eylem": { soru: "Veri nasıl işlenecek?", üyeler: ["mantik.süz", "mantik.koşul"] },
      "genel": { soru: "Genel soru?", üyeler: ["mantik.yinele"] },
      "gorsel": { soru: "Nasıl görünsün?", üyeler: ["onyuz.bilesen.menü"] },
    },
    bağlamlar: {
      "Adım.görev": { öner: ["eylem"] },
      "Adım": { öner: ["genel"] },
      "Ekran": { öner: ["gorsel"] },
    },
  },
  kanon: {
    mantik: { "süz": { python: "filter" }, "koşul": { python: "if" }, "yinele": { python: "for" } },
    onyuz: { bilesen: { "menü": { flutter: "MenuAnchor", react: "<Menu>" } } },
  },
};

test("KVR-A08 — en-özel-kazanır: Adım.görev eşleşmesi çıplak Adım kaydını bastırır", () => {
  const öneriler = kavramOnerileriCoz(KAVRAM_VERI, "Adım", ["kod", "görev", "kabul"]);
  assert.equal(öneriler.length, 1);
  assert.equal(öneriler[0].bağlam, "Adım.görev");
  assert.equal(öneriler[0].aile, "eylem");
  assert.equal(öneriler[0].soru, "Veri nasıl işlenecek?");
  assert.deepEqual(öneriler[0].üyeler.map((u) => u.yol), ["mantik.süz", "mantik.koşul"]);
});

test("KVR-A08 — özel eşleşme yoksa çıplak tipe düşülür; hiç eşleşme yoksa boş", () => {
  const çıplak = kavramOnerileriCoz(KAVRAM_VERI, "Adım", ["kod", "kabul"]);   // görev alanı yok
  assert.equal(çıplak.length, 1);
  assert.equal(çıplak[0].bağlam, "Adım");
  assert.equal(çıplak[0].aile, "genel");
  assert.equal(kavramOnerileriCoz(KAVRAM_VERI, "Katman", ["kod"]).length, 0, "haritada olmayan tip boş döner");
});

test("KVR-A08 — üye Flutter eşlemesi kanondan çözülür (dart yedeğiyle); çözülmeyen yol boş kalır", () => {
  const öneriler = kavramOnerileriCoz(KAVRAM_VERI, "Ekran", []);
  assert.equal(öneriler[0].üyeler[0].flutter, "MenuAnchor");
  const bozuk = kavramOnerileriCoz(
    { harita: { aileler: { a: { soru: "s", üyeler: ["yok.böyle.yol"] } }, bağlamlar: { X: { öner: ["a"] } } }, kanon: {} },
    "X", []);
  assert.equal(bozuk[0].üyeler[0].flutter, "", "çözülmeyen yol tanı üretmez, boş kalır (nöbet KVR-A07'de)");
});

test("KVR-A08 — geriye uyumluluk: kavramVeri verilmezse bileşen doğmaz; verilirse pakete girer", () => {
  const yalın = baglamMontajla(programlar(), "A1")!;
  assert.equal(yalın.kavramÖnerileri, undefined, "veri verilmeden bileşen doğmamalı");
  const dolu = baglamMontajla(programlar(), "A1", undefined, undefined, KAVRAM_VERI)!;
  assert.ok(dolu.kavramÖnerileri && dolu.kavramÖnerileri.length === 1, "görev alanlı A1'e Adım.görev önerisi inmeli");
  assert.equal(dolu.kavramÖnerileri![0].aile, "eylem");
});

test("KVR-A08 — promptUret: dolu bileşende zorlamasız Kavram Rehberi bölümü, boşta hiç yok", () => {
  const dolu = promptUret(baglamMontajla(programlar(), "A1", undefined, undefined, KAVRAM_VERI)!);
  assert.match(dolu, /## 🗺️ Kavram Rehberi \(öneri — dayatma değil\)/u);
  assert.match(dolu, /mantik\.süz/u);
  const yalın = promptUret(baglamMontajla(programlar(), "A1")!);
  assert.ok(!yalın.includes("Kavram Rehberi"), "bileşensiz pakette bölüm basılmamalı");
});

test("KVR-A08 — gerçek disk verisi: kavramVerisiYukle + Adım.görev bağlamı eylem-fiilleri ailesini çözer", () => {
  const veri = kavramVerisiYukle();
  assert.ok(veri, "Sarmal deposunda harita ve kanon diskten yüklenmeli");
  const öneriler = kavramOnerileriCoz(veri!, "Adım", ["görev"]);
  assert.ok(öneriler.some((ö) => ö.aile === "eylem-fiilleri"), "gerçek haritada Adım.görev → eylem-fiilleri");
  const üye = öneriler.find((ö) => ö.aile === "eylem-fiilleri")!.üyeler.find((u) => u.yol === "mantik.süz");
  assert.ok(üye && üye.flutter.length > 0, "gerçek kanonda mantik.süz eşlemesi çözülmeli (dart yedeği)");
});


// ── DVR-A05 (OGR-2.2): beceri bölmesi bütçe tavanı — tavan ADİL PAYLA bölüşülür ──
//   Eski davranış ilk-gelen-alırdı ve arkadaki kartı tek satır işaretçiye indirirdi;
//   aynı koşulla ateşleyen kartların çoğu böylece okunmadan düşüyordu.
//
//   NÖBET KALİBRASYONU (2026-07-28 dış denetim bulgusu): bu nöbetlerin ilk sürümü
//   "BCR-0" gibi ON İKİ karakterlik uydurma adlar kullanıyordu ve gerçek başlıkların
//   (### BCR-ARAC-YONLENDIRME ⚡TTK-ARAC-YONLENDIRME → kırk altı karakter) dört katı
//   kadar dar bir taban ölçüyordu. Nöbet yeşil kalırken ürün bozuktu. Aşağıdaki
//   fikstür bu yüzden GERÇEK kart kodlarını ve GERÇEK tetikleyici eklerini taşır.
import {
  BECERI_BOLME_TAVANI, adilPaylarHesapla, beceriKartiUret, beceriKartiTamBoyu,
} from "../src/sef.ts";
import type { BeceriÖzet } from "../src/sef.ts";

/** VIT-GRAF-A10'da gerçekten ateşleyen yedi kartın kodu ve tetikleyici eki. */
const GERCEK_ADLAR: ReadonlyArray<{ kod: string; tetikleyici: string }> = [
  { kod: "BCR-ARAC-YONLENDIRME", tetikleyici: "TTK-ARAC-YONLENDIRME" },
  { kod: "BCR-DURUM-AKISI", tetikleyici: "TTK-DURUM-AKISI" },
  { kod: "BCR-KAPSAM-DURUSTLUGU", tetikleyici: "TTK-KAPSAM-DURUSTLUGU" },
  { kod: "BCR-OLCUM-DISIPLINI", tetikleyici: "TTK-OLCUM-DISIPLINI" },
  { kod: "BCR-MUTASYON-KANITI", tetikleyici: "TTK-MUTASYON-KANITI" },
  { kod: "BCR-URETIR-KENARI", tetikleyici: "TTK-URETIR-KENARI" },
  { kod: "VTR-BCR-FORM", tetikleyici: "VTR-TRG-FORM" },
];

/** Gerçek ad ve gerçek uzunlukta içerikle n kartlık bir ateşleme kümesi kurar. */
function gerçekKartlar(n: number): BeceriÖzet[] {
  return Array.from({ length: n }, (_, i) => {
    const { kod, tetikleyici } = GERCEK_ADLAR[i % GERCEK_ADLAR.length];
    return {
      kod, tetikleyici, çözüldü: true,
      ne: `${i}·oz Kartın ne alanı gerçek kartlarda iki yüz karakteri aşar. `.repeat(4),
      kurallar: `${i}·kural Gerçek kural metni birkaç cümleyle yazılır. `.repeat(20),
      antiDesen: `${i}·anti Gerçek anti-desen bir vakayı anlatır. `.repeat(10),
      örnek: `${i}·ornek Gerçek örnek yapıştırılabilir olmalıdır. `.repeat(10),
    };
  });
}

/** Kartın anti-deseni GERÇEKTEN basıldı mı (etiketin ardından içerik var mı)? */
const antiBasildi = (metin: string): boolean => /^- (Anti-desen \(KAÇIN\)|KAÇIN): \S/mu.test(metin);

/** Prompt'taki beceri bölmesinin kart gövdesini (bölüm başlığı ve not hariç) ölçer. */
function beceriGovdesi(prompt: string): string {
  const baş = prompt.indexOf("## 🛠️ Beceriler");
  const son = prompt.indexOf("\n## ", baş + 1);
  return prompt.slice(baş, son === -1 ? undefined : son)
    .split("\n").filter((r) => r.startsWith("### ") || r.startsWith("- ")).join("\n");
}

test("DVR-A05 — pay adil dağıtılır: küçük kart tam girer, büyük kart kırpılır (ilk-gelen-alır bitti)", () => {
  const uzun = "u".repeat(BECERI_BOLME_TAVANI - 100);   // tek başına tavanın çoğunu ister
  const paket = baglamMontajla(progT(), "A-GEL")!;
  paket.beceriler = [
    { kod: "BCR-ARAC-YONLENDIRME", ne: "n", kurallar: uzun, antiDesen: "büyük anti-desen", örnek: "o", çözüldü: true },
    { kod: "BCR-DURUM-AKISI", ne: "sonraki kart", kurallar: "k", antiDesen: "sonraki anti-desen", örnek: "o", çözüldü: true },
  ];
  const p1 = promptUret(paket);
  assert.match(p1, /### BCR-ARAC-YONLENDIRME.*✂️\(kırpıldı/u, "bütçeyi taşıran kart kırpılır");
  assert.match(p1, /### BCR-DURUM-AKISI: sonraki kart/u, "payına sığan sonraki kart TAM girer");
  assert.match(p1, /- Anti-desen \(KAÇIN\): sonraki anti-desen/u, "sonraki kartın anti-deseni okunur");
  assert.match(p1, /- Anti-desen \(KAÇIN\): büyük anti-desen/u, "kırpılan kartın anti-deseni de okunur");
  assert.equal(p1, promptUret(paket), "aynı paket aynı prompt (determinizm)");
});

test("DVR-A05 — kırpma damgası HEM CLI'da HEM MCP'de çalışan yola gönderir (gezin)", () => {
  const kart = {
    kod: "BCR-OLCUM-DISIPLINI", ne: "öz".repeat(60), kurallar: "K".repeat(300),
    antiDesen: "A".repeat(200), örnek: "Ö".repeat(300), çözüldü: true,
  };
  const metin = beceriKartiUret(kart, 500).satırlar.join("\n");
  assert.match(metin, /✂️\(kırpıldı — tamamı: `gezin BCR-OLCUM-DISIPLINI`\)/u,
    "damga kartın tam metnine götüren komutu kart KOD'uyla vermeli");
  assert.ok(!metin.includes("ogret"), "yalnız MCP'de çalışan ogret yolu damgada yaşamamalı");
});

test("DVR-A05 — GERÇEK kart adlarıyla kalabalık koşu: ad · öz · anti-desen yaşar, tavan aşılmaz", () => {
  for (const n of [7, 15, 25, 40, 50]) {
    const kartlar = gerçekKartlar(n);
    const paylar = adilPaylarHesapla(kartlar.map(beceriKartiTamBoyu), BECERI_BOLME_TAVANI);
    let toplam = 0;
    kartlar.forEach((b, i) => {
      const metin = beceriKartiUret(b, paylar[i]).satırlar.join("\n");
      toplam += metin.length;
      assert.ok(metin.startsWith(`### ${b.kod}`), `${n} kartta ${i}. kartın adı düşemez`);
      assert.ok(metin.includes(`${i}·oz`), `${n} kartta ${i}. kartın özü düşemez`);
      assert.ok(antiBasildi(metin), `${n} kartta ${i}. kartın anti-deseni düşemez`);
    });
    assert.ok(toplam <= BECERI_BOLME_TAVANI, `${n} kart tavanı aşmamalı (${toplam})`);
  }
});

test("DVR-A05 — tavan kart sayısından bağımsız tutar: doksan beş ve yüz yirmi kartta da aşılmaz", () => {
  for (const n of [95, 120, 300]) {
    const kartlar = gerçekKartlar(n);
    const paylar = adilPaylarHesapla(kartlar.map(beceriKartiTamBoyu), BECERI_BOLME_TAVANI);
    let toplam = 0;
    kartlar.forEach((b, i) => {
      const metin = beceriKartiUret(b, paylar[i]).satırlar.join("\n");
      toplam += metin.length;
      assert.ok(metin.length <= paylar[i], `${n} kartta ${i}. kart payını aşamaz`);
    });
    assert.ok(toplam <= BECERI_BOLME_TAVANI, `${n} kart tavanı aşmamalı (${toplam}) — kart adı tabanı DAHİL`);
  }
});

test("DVR-A05 — anti-desen dar payda kurallardan ÖNCE ölmez (etiket maliyeti ağırlıktan önce ödenir)", () => {
  // Gerileme kaydı: eski dağıtım kalemin ETİKET maliyetini görmüyordu. Anti-desen
  // etiketi yirmi üç, kurallar etiketi on üç karakterdir; bütçe kırk üç ile elli bir
  // arasına düşünce anti-desen ölüyor, kurallar yaşıyordu. Marj artık ters dönmez.
  const kart = {
    kod: "BCR-ARAC-YONLENDIRME", tetikleyici: "TTK-ARAC-YONLENDIRME",
    ne: "öz metni".repeat(20), kurallar: "K".repeat(300), antiDesen: "A".repeat(200),
    örnek: "Ö".repeat(300), çözüldü: true,
  };
  for (let pay = 60; pay <= 400; pay += 1) {
    const metin = beceriKartiUret(kart, pay).satırlar.join("\n");
    assert.ok(metin.length <= pay, `pay ${pay} aşılmamalı`);
    const kuralVar = /^- (Kurallar|Kural): \S/mu.test(metin);
    if (kuralVar) {
      assert.ok(antiBasildi(metin), `pay ${pay}: kurallar basılıyorsa anti-desen de basılmalı`);
    }
  }
});

test("DVR-A05 — etiketini karşılayamayan kalemin payı çöpe gitmez, kalana akar", () => {
  const kart = {
    kod: "BCR-KISA", ne: "ö".repeat(200), kurallar: "K".repeat(200),
    antiDesen: "A".repeat(200), örnek: "Ö".repeat(200), çözüldü: true,
  };
  // Değişmez: kullanılmadan kalan pay, EN UCUZ kalemin maliyetinden (sıkışık etiket
  // iki karakter + asgari metin on iki = on dört) küçük olmalıdır. Aksi hâlde o payla
  // bir kalem daha basılabilirdi, yani bütçe çöpe gitmiş olurdu.
  for (let pay = 30; pay <= 400; pay += 1) {
    const metin = beceriKartiUret(kart, pay).satırlar.join("\n");
    assert.ok(metin.length <= pay, `pay ${pay} aşılmamalı`);
    assert.ok(pay - metin.length < 14, `pay ${pay}: ${pay - metin.length} karakter boşa bırakılmış`);
  }
});

test("DVR-A05 — kırpma sırası: önce örnek düşer, anti-desen en son kırpılır", () => {
  const kart = {
    kod: "BCR-SIRA", ne: "kısa öz", kurallar: "K".repeat(400),
    antiDesen: "A".repeat(120), örnek: "Ö".repeat(400), çözüldü: true,
  };
  const { satırlar, kırpıldı } = beceriKartiUret(kart, 400);
  assert.equal(kırpıldı, true, "400 karakterlik pay tam kartı almaz");
  const metin = satırlar.join("\n");
  assert.ok(!metin.includes("- Örnek:"), "örnek kırpmada tümüyle düşer");
  assert.match(metin, /- Anti-desen \(KAÇIN\): A+/u, "anti-desen kartta kalır");
  assert.ok(metin.includes("A".repeat(100)), "anti-desen kurallardan daha az kırpılır");
  assert.ok(metin.length <= 400, "kart payını aşmaz");
});

test("DVR-A05 — pay vektörü max-min adildir: küçüğün artığı BÜYÜĞE akar (sıralama nöbetli)", () => {
  // Bu iddia doğrudan max-min özelliğini ölçer: yalnız 'toplam <= tavan' sınayan bir
  // nöbet, büyüklüğe göre sıralamayı silen mutasyonu YAKALAYAMIYORDU. Beklenen pay
  // vektörünün TAMAMI sınanır; sırasız dağıtım farklı vektör üretir ve nöbet düşer.
  assert.deepEqual(adilPaylarHesapla([5000, 40], 1000), [960, 40],
    "büyük kart önce gelse bile küçüğün artığı büyüğe akar (sırasız dağıtım [500, 40] verirdi)");
  assert.deepEqual(adilPaylarHesapla([3000, 40, 2000, 90, 1500], 4000), [1290, 40, 1290, 90, 1290],
    "beş kartlık paketin tam pay vektörü (sırasız dağıtım [800, 40, 1053, 90, 1500] verirdi)");
  assert.equal(adilPaylarHesapla([3000, 40, 2000, 90, 1500], 4000).reduce((t, v) => t + v, 0), 4000,
    "adil pay bütçenin tamamını dağıtır — artan bütçe çöpe gitmez");
  assert.deepEqual(adilPaylarHesapla([50, 50], 1000), [50, 50], "tavan altında herkes tam alır");
  assert.deepEqual(adilPaylarHesapla([100, 5000], 1000), [100, 900], "büyük kart kalanı alır, küçüğü yemez");
  assert.deepEqual(adilPaylarHesapla([5000, 5000], 1000), [500, 500], "iki aç kart bütçeyi eşit böler");
  assert.deepEqual(adilPaylarHesapla([], 1000), [], "kartsız paket boş pay döndürür");
});

test("DVR-A05 — tavan altında tüm kartlar tam gövdeyle girer (kırpma damgası yok)", () => {
  const paket = baglamMontajla(progT(), "A-GEL")!;
  const p = promptUret(paket);
  assert.doesNotMatch(p, /✂️/u, "küçük paket kırpma damgası taşımaz");
  assert.match(p, /t-kural/, "kart gövdesi tam");
  assert.ok(beceriGovdesi(p).length <= BECERI_BOLME_TAVANI, "gövde tavanın altında");
});

// ═══════════════════════════════════════════════════════════════════════════
// ŞEF PROMPTU · ÜÇ KUSURUN NÖBETLERİ (Founder ölçümü 2026-07-29)
//
//   Bugün ölçülen üç kusur da "parça yeşil, sonuç kırık" sınıfındandı: yirmi beş
//   nöbet beceri bölmesinin aritmetiğini doğruluyordu ve hiçbiri ajanın eline geçen
//   PROMPT'a bakmıyordu. Bu yüzden aşağıdaki kümenin sonunda, `sefKomutu`'nun BASTIĞI
//   çıktıyı okuyan iki nöbet vardır: biri geçici bir depo üzerinde uçtan uca koşar,
//   öteki gerçek deponun kendisini ölçer. Kusurun koşulunun sınama alanında GERÇEKTEN
//   doğması için fikstürler kanonun gerçek yazımını taşır (belge bloklu Karar/Kural,
//   satır-içi meyve, çıplak varlık koşullu Tetikleyici).
// ═══════════════════════════════════════════════════════════════════════════

import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  REFERANS_BOLME_TAVANI, referansKartiUret, referansKartiTamBoyu,
  kosulAyirtEdici, meyveleriCoz, kodluDugumBul, sefKomutu, programHaritasi,
} from "../src/sef.ts";
import type { RefCozum } from "../src/sef.ts";

// ── A · REFERANSIN METNİ PROMPTA GİRER ──────────────────────────────────────

const REF_SAR = String.raw`
-->|
### KNN-1 · Göç Etki Sırası [HATA]
**Hüküm:** Her göç spec→kanon→motor sırasını eksiksiz izler ve sıra atlanamaz.
**Gerekçe:** Tüketiciyi kaynağından önce değiştirmek geçici çift anlam üretir.
**Örnek:** Doğru: spec ✓ → kanon ✓ → motor ✓.
|<--
Karar( kod: KNN-1, durum: kilitli, ne: "KNN-1 · Göç Etki Sırası [HATA]",
       karar: "ALAN-KOPYASI — belge bloğu varken bu okunmaz",
       gerekçe: "ALAN-GEREKÇESİ — belge bloğu varken bu okunmaz" )

-->|
### KNN-2 · Aşama Temizlik Kapıları [UYARI]
**Hüküm:** Kapı, kapsam envanteri ve sahipli borç kaydı olmadan kapatılamaz.
**Gerekçe:** Yalnız beyanla kapanan aşama unutulmuş dosyaları görünmez kılar.
|<--
Kural aşamaKapısı( kod: KNN-2, otorite: anayasa, katman: niyet, kapsam: genel )

Karar( kod: KNN-3, durum: kilitli, ne: "belgesiz karar",
       karar: "Belge bloğu YOKKEN karar alanı hüküm olarak okunur.",
       gerekçe: "Alanlar ikinci kaynaktır." )

Katman( kod: K-REF ){
  Adım( kod: ADM-ZEMIN, ne: "Zemin işi: yüzey envanterini çıkarmak.",
        görev: "ZEMİNİN-GÖREVİ", kabul: [ "ZEMİNİN-KABULÜ" ] )
  Adım( kod: ADM-REF, görev: "kapıyı kapat",
        referans: [ KNN-1, KNN-2, KNN-3, KNN-YOK ], bağımlı: [ ADM-ZEMIN ] )
}
`;
const refProg = (): Map<string, Program> => new Map([["ref.sar", ayristir(belirtecle(REF_SAR))]]);

test("A · referans hedefinin HÜKMÜ pakete girer — belge bloğu birinci kaynaktır", () => {
  const refler = baglamMontajla(refProg(), "ADM-REF")!.referanslar;
  const knn1 = refler.find((r) => r.kod === "KNN-1")!;
  assert.equal(knn1.tip, "Karar");
  assert.match(knn1.hüküm!, /spec→kanon→motor sırasını eksiksiz izler/u, "belge bloğunun Hüküm satırı");
  assert.match(knn1.gerekçe!, /geçici çift anlam üretir/u, "belge bloğunun Gerekçe satırı");
  assert.doesNotMatch(knn1.hüküm!, /ALAN-KOPYASI/u, "belge bloğu varken alan kopyası okunmaz");
});

test("A · Kural düğümünün hükmü de girer — hüküm Kural'ın ALANINDA yaşamaz, belgesindedir", () => {
  const knn2 = baglamMontajla(refProg(), "ADM-REF")!.referanslar.find((r) => r.kod === "KNN-2")!;
  assert.equal(knn2.tip, "Kural aşamaKapısı", "kuralTanım tipi adıyla birlikte yazılır");
  assert.match(knn2.hüküm!, /kapsam envanteri ve sahipli borç kaydı olmadan kapatılamaz/u);
});

test("A · belge bloğu yoksa `karar:` alanı ikinci kaynaktır (sessiz boşluk yok)", () => {
  const knn3 = baglamMontajla(refProg(), "ADM-REF")!.referanslar.find((r) => r.kod === "KNN-3")!;
  assert.match(knn3.hüküm!, /karar alanı hüküm olarak okunur/u);
});

test("A · çözülmeyen referans metin uydurmaz — çözüldü:false kalır", () => {
  const yok = baglamMontajla(refProg(), "ADM-REF")!.referanslar.find((r) => r.kod === "KNN-YOK")!;
  assert.equal(yok.çözüldü, false);
  assert.equal(yok.hüküm, undefined, "çözülmeyen hedeften metin ÜRETİLMEZ");
});

test("A · bağımlılık kenarı hedef Adım'ın `ne:` cümlesini alır — görev/kabul ALMAZ", () => {
  const paket = baglamMontajla(refProg(), "ADM-REF")!;
  const zemin = paket.referanslar.find((r) => r.kod === "ADM-ZEMIN")!;
  assert.equal(zemin.tür, "bağımlılık");
  assert.match(zemin.hüküm!, /Zemin işi: yüzey envanterini çıkarmak/u, "`ne:` cümlesi zemini bir cümlede verir");
  const prompt = promptUret(paket);
  assert.doesNotMatch(prompt, /ZEMİNİN-GÖREVİ/u, "bağımlı Adım'ın görevi O ADIMIN yürütücüsünündür");
  assert.doesNotMatch(prompt, /ZEMİNİN-KABULÜ/u, "bağımlı Adım'ın kabul listesi prompt'u ikiye katlardı");
});

test("A · promptUret 📎 bölmesi KOD LİSTESİ değil HÜKÜM basar (Founder kusuru)", () => {
  const prompt = promptUret(baglamMontajla(refProg(), "ADM-REF")!);
  assert.match(prompt, /## 📎 Referans/u);
  assert.match(prompt, /- Hüküm: Her göç spec→kanon→motor sırasını eksiksiz izler/u,
    "hükmün kendisi prompt'ta — ajan aramaya gitmez");
  assert.match(prompt, /- Gerekçe: Tüketiciyi kaynağından önce değiştirmek/u);
  assert.match(prompt, /## 🔗 Bağımlılık/u);
  assert.match(prompt, /- Ne: Zemin işi/u);
});

test("A · aynı paket aynı prompt'u üretir (determinizm bozulmadı)", () => {
  const paket = baglamMontajla(refProg(), "ADM-REF")!;
  assert.equal(promptUret(paket), promptUret(paket));
  assert.equal(promptUret(baglamMontajla(refProg(), "ADM-REF")!), promptUret(paket),
    "aynı kaynaktan iki kez montajlanan paket de aynı prompt'u verir");
});

/** Referans bölmesinin (📎 + 🔗) kart gövdesini ölçer — başlık ve not hariç. */
function referansGovdesi(prompt: string): string {
  const böl = (baş: string): string => {
    const i = prompt.indexOf(baş);
    if (i === -1) return "";
    const son = prompt.indexOf("\n## ", i + 1);
    return prompt.slice(i, son === -1 ? undefined : son);
  };
  return [böl("## 📎 Referans"), böl("## 🔗 Bağımlılık")].join("\n")
    .split("\n").filter((r) => r.startsWith("### ") || r.startsWith("- ")).join("\n");
}

test("A · referans bölmesi TAVANI AŞMAZ — kenar sayısı ne olursa olsun (adil pay)", () => {
  // Her hükmü tavanın kendisi kadar uzun kenarlarla yükle: tek kart bile tavanı yerdi.
  for (const n of [1, 4, 12, 40, 120]) {
    const kenarlar: RefCozum[] = Array.from({ length: n }, (_, i) => ({
      kod: `KNN-${i}`, tür: "referans" as const, çözüldü: true,
      dosya: "yasa/kanon/str.sar", tip: "Karar",
      hüküm: `${i}·hüküm ${"H".repeat(REFERANS_BOLME_TAVANI)}`,
      gerekçe: `${i}·gerekçe ${"G".repeat(REFERANS_BOLME_TAVANI)}`,
    }));
    const paylar = adilPaylarHesapla(kenarlar.map(referansKartiTamBoyu), REFERANS_BOLME_TAVANI);
    const toplam = kenarlar.reduce((t, r, i) => t + referansKartiUret(r, paylar[i]).satırlar.join("\n").length, 0);
    assert.ok(toplam <= REFERANS_BOLME_TAVANI, `${n} kenar tavanı aşmamalı (${toplam})`);
  }
});

test("A · darlıkta GEREKÇE düşer, HÜKÜM yaşar — bağlayıcı cümle susturulmaz", () => {
  const r: RefCozum = {
    kod: "KNN-DAR", tür: "referans", çözüldü: true, dosya: "yasa/kanon/str.sar", tip: "Karar",
    hüküm: "H".repeat(300), gerekçe: "G".repeat(300),
  };
  const metin = referansKartiUret(r, 200).satırlar.join("\n");
  assert.match(metin, /- Hüküm: H+/u, "hüküm kartta kalır");
  assert.ok(!metin.includes("- Gerekçe:"), "gerekçe darlıkta tümüyle düşer");
  assert.ok(metin.length <= 200, "kart payını aşmaz");
});

test("A · kırpılan referans SUSMAZ: ✂️ damgası ve `gezin <KOD>` adresi taşır", () => {
  const r: RefCozum = {
    kod: "KNN-KIRP", tür: "referans", çözüldü: true, dosya: "yasa/kanon/str.sar", tip: "Karar",
    hüküm: "H".repeat(2000), gerekçe: "G".repeat(2000),
  };
  const { satırlar, kırpıldı } = referansKartiUret(r, 400);
  assert.equal(kırpıldı, true);
  const metin = satırlar.join("\n");
  assert.match(metin, /✂️/u, "kırpma sessiz değildir");
  assert.match(metin, /gezin KNN-KIRP/u, "tam metnin adresi kartın kendisinde yazılıdır");
});

test("A · pay bir başlığı bile taşımıyorsa başlık kırpılır — tavan iddiası her koşulda doğru", () => {
  const r: RefCozum = {
    kod: "KNN-COK-UZUN-BIR-KANON-KODU", tür: "referans", çözüldü: true,
    dosya: "yasa/kanon/cok/derin/bir/yol.sar", tip: "Karar", hüküm: "H".repeat(500),
  };
  const metin = referansKartiUret(r, 20).satırlar.join("\n");
  assert.ok(metin.length <= 20, `başlık bile payı aşmamalı (${metin.length})`);
});

// ── B · ÜRETİR MEYVESİNİN HEDEF YOLU ────────────────────────────────────────

const MEYVE_SAR = String.raw`
Kod( kod: KOD-M1, dosya: "cekirdek/src/hedef.ts", ne: "🍎 hedef modül" )
Katman( kod: K-MEYVE ){
  Adım( kod: ADM-M1, görev: "üret", üretir: [ KOD-M1 ] )
  Adım( kod: ADM-M2, görev: "üret", üretir: [ Veri( kod: VR-M2, ne: "Devir kaydı — hedef: ` + "`" + `nitelik/goc/devir.sar` + "`" + `." ) ] )
  Adım( kod: ADM-M3, görev: "üret", üretir: [ Karar( kod: KRR-M3, ne: "kapı hükmü" ) ] )
  Adım( kod: ADM-M4, görev: "üret", üretir: [ KOD-HIC-YOK ] )
  Adım( kod: ADM-M5, görev: "üret", üretir: [ Veri( kod: VR-M5, ne: "yolu hiç beyan edilmemiş veri" ) ] )
  Adım( kod: ADM-M0, görev: "üretmez" )
}
`;
const meyveProg = (): Map<string, Program> => new Map([["m.sar", ayristir(belirtecle(MEYVE_SAR))]]);

test("B · KOD atıflı meyve: hedef düğümün `dosya:` beyanı prompt'a yol olarak girer", () => {
  const paket = baglamMontajla(meyveProg(), "ADM-M1")!;
  assert.deepEqual(paket.meyveler.map((m) => [m.kod, m.tür, m.yol, m.yolKaynağı]),
    [["KOD-M1", "Kod", "cekirdek/src/hedef.ts", "dosya"]]);
  assert.match(promptUret(paket), /- \*\*KOD-M1\*\* · Kod → `cekirdek\/src\/hedef\.ts`/u);
});

test("B · satır-içi meyve: `ne:` cümlesine gömülü hedef yol kurtarılır ve İŞARETLENİR", () => {
  const paket = baglamMontajla(meyveProg(), "ADM-M2")!;
  const m = paket.meyveler[0];
  assert.equal(m.yol, "nitelik/goc/devir.sar");
  assert.equal(m.yolKaynağı, "ne", "yolun düzyazıdan geldiği gizlenmez");
  const prompt = promptUret(paket);
  assert.match(prompt, /`nitelik\/goc\/devir\.sar`/u, "hedef yol prompt'ta görünür");
  assert.match(prompt, /`dosya:` beyanı eksik/u, "kanonik beyanın eksikliği ajana söylenir");
  assert.doesNotMatch(prompt.split("## ✅")[0], /^Veri\(…\)$/mu, "eski `Veri(…)` gösterimi geri gelmez");
});

test("B · dosya beyan etmeyen tür (Karar) yol yerine TÜRÜN ANLAMINI yazar — boş kalmaz", () => {
  const paket = baglamMontajla(meyveProg(), "ADM-M3")!;
  assert.equal(paket.meyveler[0].yol, undefined);
  assert.match(paket.meyveler[0].anlam!, /dosya değil — kanona\/plana yazılan Karar düğümü/u);
  assert.match(promptUret(paket), /- \*\*KRR-M3\*\* · Karar → dosya değil/u);
});

test("B · yolsuz ürün meyvesi eksik beyanı ADIYLA söyler (sessiz boşluk yok)", () => {
  const paket = baglamMontajla(meyveProg(), "ADM-M5")!;
  assert.match(paket.meyveler[0].anlam!, /hedef yol beyan edilmemiş/u);
});

test("B · çözülmeyen meyve KOD'u açıkça bildirilir", () => {
  const paket = baglamMontajla(meyveProg(), "ADM-M4")!;
  assert.equal(paket.meyveler[0].çözüldü, false);
  assert.match(promptUret(paket), /meyve düğümü hiçbir `\.sar` kaynağında bulunamadı/u);
});

test("B · üretir kenarı yoksa 🍎 bölmesi hiç basılmaz", () => {
  const paket = baglamMontajla(meyveProg(), "ADM-M0")!;
  assert.deepEqual(paket.meyveler, []);
  assert.doesNotMatch(promptUret(paket), /## 🍎 Üretir/u);
});

test("B · meyve çözümü satır-içi bildirime iner (kodluDugumBul widget değerlerini tarar)", () => {
  assert.ok(kodluDugumBul(meyveProg(), "VR-M2"), "satır-içi meyve KOD ile bulunabilir");
  assert.equal(meyveleriCoz(meyveProg(), kodluDugumBul(meyveProg(), "ADM-M1")!).length, 1);
});

// ── C · BECERİ SEÇİMİ HEDEFİ TUTAR ──────────────────────────────────────────

const AYIRT_SAR = String.raw`
Etmen( kod: ETM-AYIRT, tür: uzman, uzmanlık: "form", yetki: L3, bellek: izole, ne: "form uzmanı" ){
  Beceri( kod: BCR-CIPLAK, ne: "form reçetesi", kurallar: "c-kural", antiDesen: "c-anti" )
  Beceri( kod: BCR-YAPISAL, ne: "ölçüm reçetesi", kurallar: "y-kural", antiDesen: "y-anti" )
  Tetikleyici( kod: TRG-CIPLAK, koşul: görev, tetikler: BCR-CIPLAK, ne: "form içeren Adım gelince ateşler" )
  Tetikleyici( kod: TRG-YAPISAL, koşul: adım.durum == geliştirmede, tetikler: BCR-YAPISAL, ne: "yapısal koşul" )
}
Etmen( kod: ETM-CIPLAK-HEDEF, tür: uzman, uzmanlık: "x", yetki: L3, bellek: izole, ne: "çıplak koşulla çağrılan" ){
  Beceri( kod: BCR-ETM, ne: "etmen becerisi", kurallar: "e-kural", antiDesen: "e-anti" )
}
Tetikleyici( kod: TRG-ETMEN-CIPLAK, koşul: görev, tetikler: ETM-CIPLAK-HEDEF, ne: "etmen düzeyi çıplak koşul" )
Katman( kod: K-AYIRT ){
  Adım( kod: ADM-GOC-KAPI, görev: "göç kapısını kapat", durum: geliştirmede )
  Adım( kod: ADM-KOPRU, görev: "adres formunu kur", durum: beklemede )
}
Görev( kod: GRV-KOPRU, ne: "form işini uzmana atar", gerçekleştirir: ADM-KOPRU, atanan: ETM-AYIRT, durum: beklemede )
`;
const ayirtProg = (): Map<string, Program> => new Map([["a.sar", ayristir(belirtecle(AYIRT_SAR))]]);

test("C · kosulAyirtEdici: çıplak atom seçmez, yapısal ifade seçer", () => {
  const koşul = (kaynak: string) => {
    const trg = ayristir(belirtecle(`Tetikleyici( kod: T, koşul: ${kaynak}, tetikler: B )`)).bildirimler[0];
    return trg.parametreler.find((p) => p.ad === "koşul")!.deger;
  };
  assert.equal(kosulAyirtEdici(koşul("görev")), false, "çıplak alan adı = varlık testi = seçim değil");
  assert.equal(kosulAyirtEdici(koşul("adım.durum")), false, "nokta-erişimi de tek başına varlık testidir");
  assert.equal(kosulAyirtEdici(koşul("adım.durum == geliştirmede")), true, "karşılaştırma ayırt eder");
});

test("C · çıplak varlık koşullu Tetikleyici ALAKASIZ kartı artık ateşlemez (Founder kusuru)", () => {
  const kodlar = baglamMontajla(ayirtProg(), "ADM-GOC-KAPI")!.beceriler.map((b) => b.kod);
  assert.ok(!kodlar.includes("BCR-CIPLAK"), "kampanya kapanış Adımına form reçetesi düşmez");
});

test("C · ALAKALI kart susturulmadı: yapısal koşul aynı Adımda ateşlemeye devam eder", () => {
  const b = baglamMontajla(ayirtProg(), "ADM-GOC-KAPI")!.beceriler;
  assert.deepEqual(b.map((x) => x.kod), ["BCR-YAPISAL"]);
  assert.equal(b[0].tetikleyici, "TRG-YAPISAL");
});

test("C · kart SUSTURULMADI: aynı beceri gerçek hedefine Görev köprüsünden girer", () => {
  const b = baglamMontajla(ayirtProg(), "ADM-KOPRU")!.beceriler;
  const form = b.find((x) => x.kod === "BCR-CIPLAK");
  assert.ok(form, "form Adımı reçeteyi ALIR — kapanan şey ses değil, yanlış hedefti");
  assert.equal(form!.etmen, "ETM-AYIRT", "kaynak artık tetik değil, atanan uzmandır");
  assert.equal(form!.tetikleyici, undefined);
});

test("C · Etmen düzeyi tetikleyicide de aynı kapı işler (HALKA-ORK-A03)", () => {
  const paket = baglamMontajla(ayirtProg(), "ADM-GOC-KAPI")!;
  assert.equal(paket.etmen, undefined, "çıplak varlık koşulu bir ajanı da devreye alamaz");
  assert.ok(!paket.beceriler.some((b) => b.kod === "BCR-ETM"));
});

// ── ÇIKTININ KENDİSİ: KULLANICININ GÖRDÜĞÜ PROMPT ───────────────────────────

/** `sefKomutu`'nun stdout'a bastığı metnin tamamını yakalar (etkili kabuğu ölçer). */
function sefCiktisi(dizin: string, adimKod: string): { çıktı: string; kod: number } {
  const satırlar: string[] = [];
  const asıl = console.log;
  console.log = (...a: unknown[]) => { satırlar.push(a.map(String).join(" ")); };
  try {
    return { kod: sefKomutu(dizin, adimKod), çıktı: satırlar.join("\n") };
  } finally {
    console.log = asıl;
  }
}

test("SONUÇ NÖBETİ — `sarmal sef` ÇIKTISINDA hüküm metni ve hedef yol GERÇEKTEN var", () => {
  // Bu nöbet parçaları değil, kullanıcının gördüğü SONUCU ölçer: CLI kabuğundan
  // geçen tam prompt. Üç kalemin üçü de tek çıktıda kanıtlanır.
  const dizin = mkdtempSync(join(tmpdir(), "sarmal-sef-"));
  try {
    writeFileSync(join(dizin, "kanon.sar"), REF_SAR, "utf8");
    writeFileSync(join(dizin, "meyve.sar"), String.raw`
Katman( kod: K-SONUC ){
  Adım( kod: ADM-SONUC, görev: "kapıyı kapat", durum: geliştirmede,
        referans: [ KNN-1 ], bağımlı: [ ADM-ZEMIN ],
        üretir: [ Veri( kod: VR-SONUC, ne: "Devir kaydı — hedef: ` + "`" + `nitelik/goc/sonuc.sar` + "`" + `." ) ],
        kabul: [ "kapı kapanır" ] )
}
`, "utf8");
    const { çıktı, kod } = sefCiktisi(dizin, "ADM-SONUC");
    assert.equal(kod, 0, "komut başarıyla döner");
    // A — referansın METNİ (yalnız kodu değil)
    assert.match(çıktı, /Her göç spec→kanon→motor sırasını eksiksiz izler/u,
      "ÇIKTIDA hükmün kendisi var — 'referans: KNN-1 → ✓ dosya' satırı yeterli DEĞİLDİR");
    assert.match(çıktı, /Zemin işi: yüzey envanterini çıkarmak/u, "bağımlılığın zemin cümlesi çıktıda");
    // B — meyvenin hedef yolu
    assert.match(çıktı, /## 🍎 Üretir/u);
    assert.match(çıktı, /VR-SONUC.*Veri.*nitelik\/goc\/sonuc\.sar/u,
      "ÇIKTIDA meyvenin kodu, türü ve hedef yolu birlikte var");
    // Çözüm satırları (eski davranış) KAYBOLMADI — metin onların yerine değil, yanına geldi.
    assert.match(çıktı, /referans: KNN-1 → ✓/u);
  } finally {
    rmSync(dizin, { recursive: true, force: true });
  }
});

test("SONUÇ NÖBETİ — GERÇEK depoda çözülen her referansın hükmü prompt'ta görünür", () => {
  // Fikstür yeşil kalıp ürünün kırık kalması bugün iki kez ölçüldü; bu nöbet
  // canlı kanonun kendisini okur. Beklenti kaynaktan TÜRETİLİR (cümle kopyalanmaz),
  // fakat boşa geçmemesi için kenar ve metin sayıları ayrıca eşiklenir.
  const kök = fileURLToPath(new URL("../../..", import.meta.url));   // _Sarmal
  const programlar = programHaritasi(kök);
  const paket = baglamMontajla(programlar, "KPN-A05");
  assert.ok(paket, "KPN-A05 canlı planda bulunmalı");
  const prompt = promptUret(paket!);
  const metinli = paket!.referanslar.filter((r) => r.çözüldü && r.hüküm);
  assert.ok(metinli.length >= 4, `çözülen kenarların metni okunmalı (${metinli.length})`);
  for (const r of metinli) {
    const baş = r.hüküm!.slice(0, 40);
    assert.ok(prompt.includes(baş), `${r.kod} hükmünün metni prompt'ta yok: "${baş}"`);
  }
  const yollu = paket!.meyveler.filter((m) => m.yol);
  assert.ok(yollu.length >= 1, "kapanış Adımının meyvesi bir hedef yol taşır");
  for (const m of yollu) assert.ok(prompt.includes(m.yol!), `${m.kod} hedef yolu prompt'ta yok`);
  assert.ok(!paket!.beceriler.some((b) => b.kod === "VTR-BCR-FORM"),
    "kampanya kapanış Adımına form reçetesi düşmez");
});

// ── EKL-F10-A12 · Founder geribildirimi ŞEF paketine ve prompt'a iner (STR-4) ──
test("EKL-F10-A12: ŞEF paketi hedefin ve zemininin geribildirimini taşır; prompt bölümü yalnız kanal varken doğar", () => {
  const sar = `Katman( kod: KG ){
  Adım( kod: G0, durum: tamamlandı, görev: "zemin", takdir: "tam isabet", öneri: "yorumları kısalt" )
  Adım( kod: G1, görev: "üstüne inşa", bağımlı: [ G0 ], teşekkür: "eline sağlık" )
  Adım( kod: G2, görev: "sessiz" )
}`;
  const prog = new Map([["g.sar", ayristir(belirtecle(sar))]]);
  const p1 = baglamMontajla(prog, "G1")!;
  assert.deepEqual(p1.geribildirim, [
    { adım: "G1", kanal: "teşekkür", not: "eline sağlık" },
    { adım: "G0", kanal: "takdir", not: "tam isabet" },
    { adım: "G0", kanal: "öneri", not: "yorumları kısalt" },
  ], "önce hedefin kanalları, sonra bağımlı zeminin kanalları, kaynak sırasıyla");
  const prompt = promptUret(p1);
  assert.match(prompt, /## ❤️ Founder Geribildirimi/);
  assert.ok(prompt.indexOf("## 🔗 Bağımlılık") < prompt.indexOf("## ❤️ Founder Geribildirimi"), "geribildirim bölümü bağımlılık bölmesinden sonra gelir");
  assert.match(prompt, /- G1 · teşekkür: eline sağlık/);
  assert.match(prompt, /- G0 · takdir: tam isabet/);
  const p2 = baglamMontajla(prog, "G2")!;
  assert.equal(p2.geribildirim, undefined, "kanalsız Adımda bileşen doğmaz");
  assert.doesNotMatch(promptUret(p2), /Founder Geribildirimi/);
});

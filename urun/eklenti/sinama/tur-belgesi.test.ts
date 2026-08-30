// ═══════════════════════════════════════════════════════════════════════════
// tur-belgesi.test.ts — 📄 TURUN BELGE YOLU NÖBETİ (PRF-A06)
//
//   Bu nöbetin koruduğu hüküm tek cümledir: TUR HİÇBİR DOSYA AÇMAZ. Ölçülen
//   kusur (2026-08-29, Founder'ın canlı penceresi) otuz dört buçuk saniyelik
//   bir turdu ve sürenin yalnız yaklaşık yedi saniyesi saf çekirdekteydi; geri
//   kalanı iki yüz yetmiş altı `openTextDocument` çağrısıydı.
//
//   Yedi güvence:
//     ① AÇIK BELGE ÖNCELİKLİ — açık dosya için disk HİÇ okunmaz (kirli
//        tamponun tanısı diskteki eski metinden üretilemez).
//     ② Açık olmayan dosya diskten gelir ve kimliği korunur.
//     ③ Okunamayan dosya turu DÜŞÜRMEZ; atlanır ve sayılır.
//     ④ Dili `sarmal` olmayan açık belge turun dışındadır (eski
//        `languageId !== "sarmal"` süzgecinin ikizi).
//     ⑤ Disk kaydının satır yüzü doğrudur — tanı konumu buna bağlıdır.
//     ⑥ Git karşılaştırma görünümü dosyanın yerine GEÇMEZ (bu turun kendi
//        kusuru: şemasız eşleme tanıyı kaynağın eski sürümünden üretirdi).
//     ⑦ Çıktı kanalı ve adsız tampon gibi dosya olmayan şemalar tur evrenine girmez.
//
//   PRF-KP-A03 ile eklenen dört güvence (denetçinin birinci eksiği: açma yasağı
//   saf modülde ölçülüyordu, fakat çağrının kabuğa geri konmasını hiçbir nöbet
//   engellemiyordu):
//     ⑧ KAYNAK METNİ NÖBETİ — `denetleHepsi` gövdesinde `openTextDocument`
//        çağrı sayısı SIFIRDIR ve dağıtım noktası belgeye kendisi ulaşmaz.
//     ⑨ Disk kaydının satır sözleşmesi kilitlidir: CRLF, imsiz gelen metin,
//        boş dosya ve yalnız taşıyıcı dönüşle biten dosya (bilinçli kapsam dışı).
//     ⑩ Program haritası: disk kaydı önbelleğe yazılmaz, açık belge önbellekten
//        okunur, söz dizimi kırık disk belgesi haritaya girmez ve turu düşürmez.
//     ⑪ Okunan bayt sayacı kabuğun HAM baytını toplar, çözülmüş metnin
//        uzunluğunu değil.
//   Koşum: cd eklenti && npm test
// ═══════════════════════════════════════════════════════════════════════════
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type * as vscode from "vscode";
import type { Program } from "../../cekirdek/src/sozdizim.ts";
import { belirtecle } from "../../cekirdek/src/belirtec.ts";
import { ayristir } from "../../cekirdek/src/ayristirici.ts";
import {
  açıkBelgeHaritası, type BelgeKabugu, type BelgeYuzu, diskBelgesi, turBelgeleriniTopla,
  turProgramlariniKur,
} from "../src/tur-belgesi.ts";

/** Sahte kimlik — gerçek `Uri` yerine yalnız yol taşır; modül vscode çağırmaz. */
const uriYap = (fsPath: string): vscode.Uri => ({ fsPath } as unknown as vscode.Uri);

/**
 * Sahte kabuk. DİKKAT: bu kabukta belge AÇAN bir üye YOKTUR ve olmaması
 * nöbetin kendisidir — arayüze böyle bir üye eklenirse bu sahte derlenmez.
 */
function kabukYap(o: {
  açık?: Record<string, { metin: string; dil?: string }>;
  disk?: Record<string, string>;
}): { kabuk: BelgeKabugu; okunanlar: string[] } {
  const okunanlar: string[] = [];
  const açık = o.açık ?? {};
  const disk = o.disk ?? {};
  const kabuk: BelgeKabugu = {
    açıkBelge: (yol) => (yol in açık ? diskBelgesi(uriYap(yol), açık[yol]!.metin) : undefined),
    dilKimliği: (yol) => (yol in açık ? (açık[yol]!.dil ?? "sarmal") : undefined),
    oku: async (yol) => {
      okunanlar.push(yol);
      return yol in disk
        ? { belge: diskBelgesi(uriYap(yol), disk[yol]!), bayt: Buffer.byteLength(disk[yol]!, "utf8") }
        : undefined;
    },
  };
  return { kabuk, okunanlar };
}

// ── ① AÇIK BELGE ÖNCELİKLİ: KİRLİ TAMPON DİSKE EZDİRİLMEZ ────────────────────

test("TUR: açık belge diskten ÖNCE gelir ve o dosya için disk hiç okunmaz", async () => {
  const { kabuk, okunanlar } = kabukYap({
    açık: { "/p/a.sar": { metin: 'Faz( kod: KAYDEDILMEMIS )' } },
    disk: { "/p/a.sar": 'Faz( kod: DISKTEKI_ESKI )' },
  });
  const { belgeler, sayaç } = await turBelgeleriniTopla(["/p/a.sar"], kabuk);

  assert.equal(belgeler.get("/p/a.sar")?.getText(), 'Faz( kod: KAYDEDILMEMIS )',
    "kirli tampon diskteki eski metne ezdirildi; panel kullanıcının GÖRDÜĞÜ metni anlatmaz");
  assert.deepEqual(okunanlar, [],
    "açık belge için disk okundu; okuma boşuna maliyettir ve kirli tamponu ezme riskidir");
  assert.deepEqual(sayaç, { açıktan: 1, diskten: 0, atlanan: 0 });
});

// ── ② AÇIK OLMAYAN DOSYA DİSKTEN GELİR ───────────────────────────────────────

test("TUR: açık olmayan dosya diskten okunur ve kimliği korunur", async () => {
  const { kabuk, okunanlar } = kabukYap({ disk: { "/p/b.sar": 'Faz( kod: B )' } });
  const { belgeler, sayaç } = await turBelgeleriniTopla(["/p/b.sar"], kabuk);

  assert.equal(belgeler.get("/p/b.sar")?.getText(), 'Faz( kod: B )');
  assert.equal(belgeler.get("/p/b.sar")?.uri.fsPath, "/p/b.sar",
    "kimlik yoldan sapıyor; tanı yayını başka bir dosyayı adresler");
  assert.deepEqual(okunanlar, ["/p/b.sar"]);
  assert.deepEqual(sayaç, { açıktan: 0, diskten: 1, atlanan: 0 });
});

// ── ③ OKUNAMAYAN DOSYA TURU DÜŞÜRMEZ ─────────────────────────────────────────

test("TUR: silinmiş/erişilemeyen dosya atlanır, tur ayakta kalır", async () => {
  const { kabuk } = kabukYap({ disk: { "/p/var.sar": 'Faz( kod: VAR )' } });
  const { belgeler, sayaç } = await turBelgeleriniTopla(["/p/yok.sar", "/p/var.sar"], kabuk);

  assert.equal(belgeler.has("/p/yok.sar"), false);
  assert.equal(belgeler.get("/p/var.sar")?.getText(), 'Faz( kod: VAR )',
    "tek bir okunamayan dosya bütün turu düşürdü; bu, ölçülen kusurdan ağır bir davranıştır");
  assert.deepEqual(sayaç, { açıktan: 0, diskten: 1, atlanan: 1 });
});

// ── ④ DİL SÜZGECİ: ESKİ languageId SÜZGECİNİN İKİZİ ──────────────────────────

test("TUR: dili elle değiştirilmiş açık belge turun dışındadır", async () => {
  const { kabuk, okunanlar } = kabukYap({
    açık: { "/p/c.sar": { metin: "düz metin", dil: "plaintext" } },
  });
  const { belgeler, sayaç } = await turBelgeleriniTopla(["/p/c.sar"], kabuk);

  assert.equal(belgeler.size, 0, "sarmal olmayan dil turu kirletti");
  assert.deepEqual(okunanlar, [],
    "dili sarmal olmayan dosya diskten okundu; süzgeç okumadan ÖNCE işlemeli");
  assert.deepEqual(sayaç, { açıktan: 0, diskten: 0, atlanan: 1 });
});

// ── ⑤ SATIR YÜZÜ: TANI KONUMU BUNA BAĞLIDIR ──────────────────────────────────

test("TUR: disk kaydının satır sayısı ve satır metni gerçek belgeyle aynı sözleşmededir", () => {
  const belge: BelgeYuzu = diskBelgesi(uriYap("/p/d.sar"), "birinci\nikinci\nüçüncü");
  assert.equal(belge.lineCount, 3, "satır sayısı yanlış; tanı satırı kırpılır ya da taşar");
  assert.equal(belge.lineAt(0).text, "birinci");
  assert.equal(belge.lineAt(2).text, "üçüncü");
  assert.equal(belge.lineAt(99).text, "",
    "aralık dışı satır patlıyor; tanı konumu bir kez kayarsa bütün tur çöker");
  // Tek satırlık dosya da bir satırdır: sıfır dönerse tanı üretimi konumu -1'e kırpar.
  assert.equal(diskBelgesi(uriYap("/p/e.sar"), "tek").lineCount, 1);
});

// ── ⑥ ŞEMA SÜZGECİ: GİT GÖRÜNÜMÜ DOSYANIN YERİNE GEÇEMEZ ─────────────────────
//
//   Ölçülen kusur (2026-08-29, bu turun kendi kusuru): açık belgeler yalnız
//   `fsPath` ile eşlenirse git karşılaştırma görünümü aynı yolu gösterdiği için
//   haritaya girer ve dosyanın tanısı onun git'teki ESKİ sürümünden üretilir.

const belgeUydur = (şema: string, fsPath: string) =>
  ({ uri: { scheme: şema, fsPath } as unknown as vscode.Uri });

test("TUR: git karşılaştırma görünümü açık belge haritasına GİRMEZ", () => {
  const dosya = belgeUydur("file", "/p/a.sar");
  const gitGörünümü = belgeUydur("git", "/p/a.sar");
  // Git görünümü SONRA gelir: süzgeç yoksa haritada o kazanır ve dosyayı ezer.
  const harita = açıkBelgeHaritası([dosya, gitGörünümü]);

  assert.equal(harita.size, 1, "aynı yol iki kez haritaya girdi");
  assert.equal(harita.get("/p/a.sar"), dosya,
    "git görünümü dosyanın yerine geçti; tanı kaynağın ESKİ sürümünden üretilir " +
    "ve kullanıcı dosyasında olmayan bir hatayı panelde görür");
});

test("TUR: çıktı kanalı ve adsız tampon gibi dosya olmayan belgeler haritaya girmez", () => {
  const harita = açıkBelgeHaritası([
    belgeUydur("output", "/p/kanal"),
    belgeUydur("untitled", "/p/adsiz.sar"),
    belgeUydur("file", "/p/gercek.sar"),
  ]);
  assert.deepEqual([...harita.keys()], ["/p/gercek.sar"],
    "dosya olmayan şemalar tur evrenine sızdı");
});

// ── ⑧ KAYNAK METNİ NÖBETİ: AÇMA ÇAĞRISI KABUĞA GERİ KONAMAZ ─────────────────
//
//   Saf modülün belge açmaması, kabuğun açmadığını kanıtlamaz: `denetleHepsi`
//   gövdesine geri konan tek bir `openTextDocument` satırı otuz dört buçuk
//   saniyeyi geri getirir ve yukarıdaki yedi güvencenin hiçbiri onu görmez.
//   Bu yüzden kabuğun kaynak metni okunur ve çağrı sayılır; desen
//   onay-yuzeyleri.test.ts ile fikir-paneli.test.ts nöbetlerinin ikizidir.

/** Eklenti kabuğunun kaynak metni (fikir-paneli.test.ts `EKLENTI_KAYNAK` deseni). */
const EKLENTI_KAYNAK = readFileSync(fileURLToPath(new URL("../src/eklenti.ts", import.meta.url)), "utf8");

/**
 * `denetleHepsi` gövdesi: `const denetleHepsi` ile onu izleyen `const denetimKilidi`
 * arasındaki dilim. Dilim adla kesilir ki nöbet dosyanın başka yerindeki meşru
 * bir açma çağrısını (kullanıcı eylemiyle belge açma) yanlışlıkla saymasın.
 */
function denetleHepsiGövdesi(): string {
  const baş = EKLENTI_KAYNAK.indexOf("const denetleHepsi");
  const son = EKLENTI_KAYNAK.indexOf("const denetimKilidi", baş);
  assert.ok(baş >= 0 && son > baş, "denetleHepsi gövdesi bulunamadı; nöbet boşlukta ölçüm yapamaz");
  return EKLENTI_KAYNAK.slice(baş, son);
}

test("KAYNAK: denetleHepsi gövdesinde openTextDocument çağrı sayısı SIFIRDIR", () => {
  const gövde = denetleHepsiGövdesi();
  // Ölçü ÇAĞRIYA bakar (onay-yuzeyleri.test.ts deseni): gövdedeki yorumlar eski
  // kusuru anmak için adı geçirir ve bu meşrudur; sayılan şey parantezli çağrıdır.
  const açmaSayısı = (gövde.match(/openTextDocument\s*\(/g) ?? []).length;
  assert.equal(açmaSayısı, 0,
    "tur belge açıyor; saf modülün açmaması kabuğa geri konan tek satırı engellemez ve " +
    "iki yüz yetmiş altı dosyada yaklaşık yirmi yedi saniye geri gelir");
  // Kabuk belgeleri ve program haritasını saf modülden alır; ikisi de burada kurulmaz.
  assert.ok(gövde.includes("turBelgeleriniTopla("),
    "kabuk belgeleri saf modülden toplamıyor; açma yasağı nöbetsiz kalır");
  assert.ok(gövde.includes("turProgramlariniKur("),
    "kabuk program haritasını saf modülde kurmuyor; önbellek nöbeti kabuğu görmez");
});

test("KAYNAK: yuzeylereDagit gövdesi belgeye kendisi ulaşmaz", () => {
  // Ayrıştırma yolu yasağı (`programAl(` · `ayristir(` · `belirtecle(`) fikir-paneli.test.ts
  // içindeki "fikir paneli: kayıtlar TEK defterden gelir ve defter yeni panele
  // bağlanmıştır" nöbetinde ölçülür ve burada yinelenmez. Orada eksik kalan şey
  // belge I/O'sudur: dağıtım noktası ne belge açar ne dosya okur; belgeyi ve
  // programı çağırandan alır.
  const gövde = /function yuzeylereDagit\([\s\S]*?\n\}/.exec(EKLENTI_KAYNAK)?.[0] ?? "";
  assert.ok(gövde.length > 0, "yuzeylereDagit gövdesi bulunamadı");
  for (const yasak of ["openTextDocument", "readFile", "workspace.fs"]) {
    assert.ok(!gövde.includes(yasak),
      `dağıtım noktası belgeye kendisi ulaşıyor (${yasak}); tur başına ikinci bir I/O doğar`);
  }
});

// ── ⑨ SATIR SÖZLEŞMESİ: CRLF · İMSİZ METİN · BOŞ DOSYA · YALNIZ TAŞIYICI DÖNÜŞ ──

test("SATIR: CRLF dosyada satır sayısı ve satır metni VS Code belge modeliyle aynıdır", () => {
  // PRF-KP-A01 birinci kararı: satırlar `\r?\n` ile bölünür. Yalnız `\n` ile bölen
  // eski sözleşme her satırın sonunda taşıyıcı dönüşü bırakıyordu ve satır uzunluğu
  // bir fazlaydı; tanı aralığı rastlantıyla doğru çıkıyordu, çünkü sözcük deseni
  // taşıyıcı dönüşte durur. VS Code "A\r\nB\r\n" metnini üç satır sayar ve ilk
  // satırı "A" okur.
  const belge = diskBelgesi(uriYap("/p/crlf.sar"), "A\r\nB\r\n");
  assert.equal(belge.lineCount, 3, "CRLF satır sayısı VS Code belge modelinden sapıyor");
  assert.equal(belge.lineAt(0).text, "A",
    "satır sonunda taşıyıcı dönüş kaldı; satır uzunluğu bir fazla ve satır metni sözleşme dışı");
  assert.equal(belge.lineAt(1).text, "B");
  assert.equal(belge.lineAt(2).text, "");
});

test("SATIR: metin disk kaydına imsiz gelir; bayt sırası imini kabuğun çözücüsü soyar, kayıt soymaz", () => {
  // Sözleşme iki yarımdır. Kabuk `new TextDecoder("utf-8")` çözücüsünü varsayılan
  // ayarıyla kullanır ve o ayar imi soyar; disk kaydı bu yüzden imi aramaz ve verilen
  // metni olduğu gibi taşır. Soyma sorumluluğu kayda da verilirse iki katman aynı işi
  // yapar ve biri sessizce bayatlar.
  const ham = Buffer.from("\uFEFFFaz( kod: AB )\n", "utf8");
  const çözülmüş = new TextDecoder("utf-8").decode(ham);
  assert.equal(ham.byteLength, 18);
  assert.equal(çözülmüş.length, 15, "çözücü imi soymadı; kabuk sözleşmesi bozuk");
  assert.ok(!çözülmüş.startsWith("\uFEFF"));
  const belge = diskBelgesi(uriYap("/p/bom.sar"), çözülmüş);
  assert.equal(belge.lineAt(0).text, "Faz( kod: AB )", "ilk satır im taşıyor; tanı sütunu bir kayar");
  assert.equal(belge.lineCount, 2);
  // Kaydın kendisi soymaz: imli metin verilirse im satırda kalır, çünkü sorumluluk kabuktadır.
  assert.equal(diskBelgesi(uriYap("/p/imli.sar"), "\uFEFFX").lineAt(0).text, "\uFEFFX",
    "disk kaydı im soyuyor; sözleşme kabuğa aitti ve artık iki katman aynı işi yapıyor");
  // Kabuk çözücüyü imi KORUYAN ayarla kurmaz; kurarsa metin kayda imli gelir.
  assert.ok(!denetleHepsiGövdesi().includes("ignoreBOM"),
    "kabuk çözücüyü ignoreBOM ile kurmuş; metin disk kaydına imli gelir");
});

test("SATIR: boş dosya tek satırdır", () => {
  // Boş dizeyi bölmek tek boş dize döner; sıfır dönseydi tanı üretimi konumu eksi bire kırpardı.
  const belge = diskBelgesi(uriYap("/p/bos.sar"), "");
  assert.equal(belge.lineCount, 1, "boş dosya sıfır satır sayıldı; tanı konumu eksi bire kırpılır");
  assert.equal(belge.lineAt(0).text, "");
});

test("SATIR: yalnız taşıyıcı dönüşle biten dosya BİLİNÇLE tek satırdır (beyan edilen kapsam dışı uç)", () => {
  // PRF-KP-A01 birinci kararının beyan edilen ucu: VS Code "A\rB" metnini iki satır
  // sayar, disk kaydı tek satır. Karar kaydına göre sözcükleyici de yalnız yeni satırı
  // saydığı için kayıt motorla uyumludur; uç onarılmaz, beyan edilir. Bu iddia
  // sözleşmeyi kilitler: biri yalnız `\r` desteği eklerse nöbet kırmızıya döner ve
  // karar yeniden verilmek zorunda kalır.
  const belge = diskBelgesi(uriYap("/p/cr.sar"), "A\rB");
  assert.equal(belge.lineCount, 1, "yalnız taşıyıcı dönüş satır sayıldı; PRF-KP-A01 kararı sessizce değişti");
  assert.equal(belge.lineAt(0).text, "A\rB");
});

// ── ⑩ PROGRAM HARİTASI: ÖNBELLEK YALNIZ AÇIK BELGE İÇİNDİR ───────────────────
//
//   Önbellek belge SÜRÜMÜNE anahtarlıdır ve diskten okunan kaydın sürümü yoktur;
//   sürümsüz bir kayıt bir kez yazıldığında dosya diskte değişse bile sonsuza dek
//   taze sayılırdı. Nöbetin ölçtüğü şey sahte önbelleğin KİMİN İÇİN ve KAÇ KEZ
//   çağrıldığıdır.

/** Sahte önbellek: aldığı açık belgeleri sırayla kaydeder ve daima verilen ağacı döner. */
function önbellekYap(ağaç: Program | undefined): {
  programAl: (açık: { kimlik: string }) => Program | undefined; çağrılar: string[];
} {
  const çağrılar: string[] = [];
  return { programAl: (açık) => { çağrılar.push(açık.kimlik); return ağaç; }, çağrılar };
}

test("HARİTA: disk kaydı önbelleğe yazılmaz; programAl yalnız açık belge için ve yalnız bir kez çağrılır", () => {
  const belgeler = new Map<string, BelgeYuzu>([
    ["/p/acik.sar", diskBelgesi(uriYap("/p/acik.sar"), "Faz( kod: ACIK )")],
    ["/p/disk.sar", diskBelgesi(uriYap("/p/disk.sar"), "Faz( kod: DISK )")],
  ]);
  const önbellekAğacı = ayristir(belirtecle("Faz( kod: ONBELLEK )"));
  const { programAl, çağrılar } = önbellekYap(önbellekAğacı);
  const programlar = turProgramlariniKur(
    belgeler, new Map([["/p/acik.sar", { kimlik: "açık" }]]), programAl);

  assert.deepEqual(çağrılar, ["açık"],
    "önbellek disk kaydı için de çağrıldı; sürümsüz kayıt bir kez yazılınca sonsuza dek taze sayılır");
  const disk = programlar.get("/p/disk.sar");
  assert.ok(disk !== undefined && disk !== önbellekAğacı, "disk kaydı önbellekten geldi; doğrudan ayrıştırılmalıydı");
  assert.ok(JSON.stringify(disk).includes('"DISK"'), "disk programı diskteki metinden üretilmedi");
});

test("HARİTA: açık belge önbellekten okunur, metni yeniden ayrıştırılmaz", () => {
  // Açık belgenin metni BİLEREK kırıktır: harita onu yeniden ayrıştırsaydı ya
  // düşerdi ya da haritaya girmezdi. Önbellekten gelen ağaç girdiğine göre açık
  // belge editör süsleriyle AYNI ağacı paylaşır ve ikinci bir ayrıştırma doğmaz.
  const belgeler = new Map<string, BelgeYuzu>([
    ["/p/acik.sar", diskBelgesi(uriYap("/p/acik.sar"), "Faz( kod: ")],
  ]);
  const önbellekAğacı = ayristir(belirtecle("Faz( kod: ONBELLEK )"));
  const { programAl, çağrılar } = önbellekYap(önbellekAğacı);
  const programlar = turProgramlariniKur(
    belgeler, new Map([["/p/acik.sar", { kimlik: "açık" }]]), programAl);

  assert.equal(programlar.get("/p/acik.sar"), önbellekAğacı,
    "açık belge önbellekteki ağaçla değil yeniden ayrıştırmayla geldi; editör süsleriyle ağaç ayrıştı");
  assert.deepEqual(çağrılar, ["açık"]);
  // Önbellek açık belgeyi ayrıştırılamaz sayıyorsa harita da onu almaz; tek-dosya yolu yakalar.
  assert.equal(turProgramlariniKur(
    belgeler, new Map([["/p/acik.sar", { kimlik: "açık" }]]), önbellekYap(undefined).programAl).size, 0);
});

test("HARİTA: söz dizimi kırık disk belgesi haritaya girmez ve turu düşürmez", () => {
  const belgeler = new Map<string, BelgeYuzu>([
    ["/p/kirik.sar", diskBelgesi(uriYap("/p/kirik.sar"), "Faz( kod: ")],
    ["/p/saglam.sar", diskBelgesi(uriYap("/p/saglam.sar"), "Faz( kod: SAGLAM )")],
  ]);
  const { programAl, çağrılar } = önbellekYap(undefined);
  let programlar: Map<string, Program> | undefined;
  assert.doesNotThrow(() => { programlar = turProgramlariniKur(belgeler, new Map(), programAl); },
    "tek bir kırık dosya bütün turu düşürdü; onun hatası tek dosya yolunun işidir");
  assert.equal(programlar?.has("/p/kirik.sar"), false, "kırık belge haritaya girdi; çapraz denetim ağacı kirlenir");
  assert.ok(programlar?.has("/p/saglam.sar"), "kırık komşu sağlam belgeyi haritadan düşürdü");
  assert.deepEqual(çağrılar, [], "açık belge yokken önbellek çağrıldı");
});

// ── ⑪ OKUNAN BAYT: KABUĞUN HAM BAYTI TOPLANIR, ÇÖZÜLMÜŞ UZUNLUK DEĞİL ────────
//
//   PRF-KP-A01 üçüncü kararı: boyut sınırı konmaz, fakat turun okuduğu toplam
//   merceğe düşer. Sayı ham tampondan gelir; çözülmüş metnin uzunluğu bayt sırası
//   imini kaybeder ve geçersiz baytı üç baytlık yer tutucuya çevirir.

/** Ham bayt sayacı için sahte kabuk: her disk dosyası aynı imli tamponla okunur. */
function baytKabuğuYap(ham: Buffer, açıkYollar: readonly string[], okunamayan: readonly string[]): BelgeKabugu {
  const çözülmüş = new TextDecoder("utf-8").decode(ham);
  return {
    açıkBelge: (yol) => (açıkYollar.includes(yol) ? diskBelgesi(uriYap(yol), "Faz( kod: ACIK )") : undefined),
    dilKimliği: (yol) => (açıkYollar.includes(yol) ? "sarmal" : undefined),
    oku: async (yol) => (okunamayan.includes(yol)
      ? undefined
      : { belge: diskBelgesi(uriYap(yol), çözülmüş), bayt: ham.byteLength }),
  };
}

test("BAYT: imli dosyada okunan bayt on sekizdir, çözülmüş on beş karakter değil", async () => {
  const ham = Buffer.from("\uFEFFFaz( kod: AB )\n", "utf8");
  assert.equal(ham.byteLength, 18);
  assert.equal(new TextDecoder("utf-8").decode(ham).length, 15);
  const { okunanBayt, sayaç, belgeler } = await turBelgeleriniTopla(
    ["/p/bom.sar"], baytKabuğuYap(ham, [], []));

  assert.equal(okunanBayt, 18, "sayaç çözülmüş metnin uzunluğunu topluyor; bayt sırası imi kayboldu");
  assert.equal(belgeler.get("/p/bom.sar")?.getText().length, 15, "belge metni imli geldi");
  assert.deepEqual(sayaç, { açıktan: 0, diskten: 1, atlanan: 0 });
});

test("BAYT: toplam yalnız diskten okunan dosyaları sayar; açık ve atlanan dosya sayıma girmez", async () => {
  const ham = Buffer.from("\uFEFFFaz( kod: AB )\n", "utf8");
  const { okunanBayt, sayaç } = await turBelgeleriniTopla(
    ["/p/bir.sar", "/p/acik.sar", "/p/yok.sar", "/p/iki.sar"],
    baytKabuğuYap(ham, ["/p/acik.sar"], ["/p/yok.sar"]));

  assert.equal(okunanBayt, 36, "toplam iki disk dosyasının ham baytı değil; açık ya da atlanan dosya sayıma girdi");
  assert.deepEqual(sayaç, { açıktan: 1, diskten: 2, atlanan: 1 });
});

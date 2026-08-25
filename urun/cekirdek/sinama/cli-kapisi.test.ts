// ═══════════════════════════════════════════════════════════════════════════
// cli-kapisi.test.ts — 🚪 CLI dağıtıcısının ham yığın izi vermemesi nöbeti
//   (ETM-SAR-MOTOR onarımı · ölçülmüş kusur: sarmal.ts:777'deki eski dağıtıcı
//   tanımadığı HER dizeyi dosya adı sayıyor, `readFileSync` çağırıyor ve beş
//   somut komutu (--help · -h · help · siniflama · durum-guncelle) Node'un ham
//   ENOENT yığın iziyle çökertiyordu — kullanıcı `node:fs:435` görüyordu.
//
//   ŞARTLI KABUL turu (ETM-SAR-MOTOR ikinci geçiş) iki ek kusur ölçtü ve bu
//   dosyaya iki yeni bölüm ekledi:
//     ⑤ dizin bekçisi: var OLAN ama DOSYA OLMAYAN bir yol (ör. "." ya da
//        "./src") eskiden `!existsSync` bekçisinden geçip ham `readFileSync`
//        çağrısına düşüyordu; artık `statSync(...).isFile()` ile ayıklanır.
//     ⑥ MCP listesi tek-kaynak bütünlüğü: `MCP_ARACLARI` artık elle yazılmış
//        ikinci bir kopya değil, mcp-metinleri.ts'teki MCP_ARAC_ADI'dan
//        türetilir ("kurallar" gibi eksik kalan araçlar da artık tanınır) ve
//        bu türetim aynı adlı bir DİZİN çalışma alanında bulunsa bile MCP
//        yönlendirmesini gölgeletmez (ad çakışması testi).
//
//   Nöbet altı ayrı davranışı GERÇEK SÜREÇ koşturarak ölçer (uydurma import
//   değil — YUZ-1.2: kabuğun kendisi sınanmazsa dağıtıcı yeniden çökebilir ve
//   kimse fark etmez):
//     ① yardım yüzeyi (--help · -h · help) çıkış 0 ile gruplanmış, tam cümleli
//        kullanım metni basar;
//     ② MCP'de yaşayan araç adları CLI'da çağrılınca sessiz çökme yerine
//        "bu bir MCP aracı" yönlendirmesi verir — liste mcp-metinleri.ts'ten
//        türetildiği için kaynak büyüdükçe kendiliğinden büyür;
//     ③ tanınmayan komut dizesi (dosya da değil) tek satırlık dürüst hata basar,
//        makul bir yazım-yakınlığı varsa komutu önerir;
//     ④ gerçekten bulunamayan bir .sar dosya yolu "dosya bulunamadı" cümlesi
//        verir — ham `readFileSync` istisnası değil;
//     ⑤ var olan ama dosya olmayan bir yol (dizin) ham yığın izi yerine
//        "sarmal denetle" önerisi taşıyan dürüst bir cümle verir;
//     ⑥ MCP aracıyla aynı adlı bir dizin varken bile MCP yönlendirmesi kazanır.
//   Yedinci bölüm mutlu yolun (var olan dosya) bu kapılardan hiçbirine
//   takılmadığını, existsSync/statSync koruması eklenmeden ÖNCEKİ davranışın
//   aynen sürdüğünü kanıtlar (regresyon bekçisi).
//
//   MUTASYON KANITI bu dosyanın DIŞINDA yürütüldü (bkz. teslim raporu): her
//   onarım `src/sarmal.ts` üzerinde bilerek geçici olarak devre dışı bırakıldı,
//   bu süitin kırmızıya döndüğü gözlendi, sonra onarım geri konup yeşile
//   dönüldüğü doğrulandı — çünkü bu dosyanın DAHİLİ bir mutasyon testi kendi
//   kaynağını çalışırken düzenlemek anlamına gelir ki bu, koşan `node --test`
//   sürecinin dosya sistemi kilidiyle çakışan kırılgan bir desendir.
// ═══════════════════════════════════════════════════════════════════════════

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
// Sadece OKUMA (dosya bu Adımın çitinde değiştirilemez varlıklardan biridir):
// büyüme-tamlığı testi MCP_ARAC_ADI'nı tek kaynaktan alır, kendi kopyasını
// elle yazmaz — aksi hâlde bu test dosyası da ikinci bir bayat liste olurdu.
import { MCP_ARAC_ADI } from "../src/mcp-metinleri.ts";

const SARMAL = fileURLToPath(new URL("../src/sarmal.ts", import.meta.url));

/** Ham Node yığın izinin imzaları — bu desenlerden biri çıktıda görünürse
 *  dağıtıcı hâlâ çöküyor demektir (kaçış deseni: gerçek hata METNİ bu
 *  kelimeleri taşımaz, yalnız Node'un kendi iz dökümü taşır). */
const YIGIT_IZI_IMZALARI = /at (Object|Module|async |file:)|node:internal\/|node:fs:\d|errno: -2|code: 'ENOENT'|Node\.js v\d/;

function yigitIziYok(cikti: string, baglam: string): void {
  assert.doesNotMatch(cikti, YIGIT_IZI_IMZALARI, `${baglam}: çıktı hâlâ ham Node yığın izi taşıyor:\n${cikti}`);
}

/** `sarmal <args>` gerçek alt süreç olarak koşturulur; çıkış kodu ne olursa
 *  olsun (execFileSync sıfır-dışıda fırlatır) stdout+stderr birlikte + kod
 *  döner — dağıtıcının başarı/başarısızlık YOLLARININ İKİSİ de aynı yolla
 *  ölçülür (sablon.test.ts ile aynı desen · YUZ-1.2). `cwd` verilirse alt süreç
 *  o dizinde koşar — dizin bekçisi testleri "sarmal ." çağrısını gerçek bir
 *  çalışma dizininden koşturmak zorundadır, aksi hâlde repo kökü ölçülür. */
function calistir(args: string[], opts?: { cwd?: string }): { cikti: string; kod: number } {
  try {
    const stdout = execFileSync(process.execPath, [SARMAL, ...args], {
      encoding: "utf8",
      timeout: 30_000,
      ...(opts?.cwd ? { cwd: opts.cwd } : {}),
    });
    return { cikti: stdout, kod: 0 };
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string; status?: number | null };
    return { cikti: `${err.stdout ?? ""}${err.stderr ?? ""}`, kod: err.status ?? 1 };
  }
}

// ── ① Ölçülmüş kusurun beş somut komutu — hiçbiri artık ham yığın izi vermez ──

const OLCULMUS_BES_KOMUT: Array<{ args: string[]; beklenenKod: number }> = [
  { args: ["--help"], beklenenKod: 0 },
  { args: ["-h"], beklenenKod: 0 },
  { args: ["help"], beklenenKod: 0 },
  { args: ["siniflama"], beklenenKod: 1 },
  { args: ["durum-guncelle"], beklenenKod: 1 },
];

for (const { args, beklenenKod } of OLCULMUS_BES_KOMUT) {
  test(`ölçülmüş kusur onarıldı: "sarmal ${args.join(" ")}" artık ham yığın izi vermez (çıkış ${beklenenKod})`, () => {
    const { cikti, kod } = calistir(args);
    yigitIziYok(cikti, `sarmal ${args.join(" ")}`);
    assert.equal(kod, beklenenKod, `çıkış kodu beklenmiyor:\n${cikti}`);
    assert.ok(cikti.trim().length > 0, "çıktı boş kalmamalı — sessiz çökme de yasaktır");
  });
}

// ── ② Yardım yüzeyi: üç çağrı biçimi de aynı gruplanmış, tam cümleli metni basar ──

for (const bayrak of ["--help", "-h", "help"]) {
  test(`"sarmal ${bayrak}" gruplanmış kullanım metnini basar, çıkış 0`, () => {
    const { cikti, kod } = calistir([bayrak]);
    assert.equal(kod, 0);
    yigitIziYok(cikti, `sarmal ${bayrak}`);
    // Gruplama gerçekten var mı — en az üç başlık grubu görünür olmalı.
    assert.match(cikti, /DOĞUŞ VE ŞABLON/);
    assert.match(cikti, /ŞEF VE ORKESTRASYON/);
    assert.match(cikti, /PROJE GENELİ DENETİM/);
    // Otuz dört alt komuttan birkaç örnek isim tam cümleli açıklamayla birlikte görünmeli.
    assert.match(cikti, /denetle <dizin>.+Proje dizinini uçtan uca denetler/);
    assert.match(cikti, /sef <ADIM-KOD>.+bağlam-montajlı prompt/);
    // MCP-yalnız araçlar ayrıca listelenir ki kullanıcı "neden burada yok" diye şaşırmasın.
    assert.match(cikti, /MCP-YALNIZ ARAÇLAR/);
    // Şart 2 kapanışı: "kurallar" eskiden bu listede EKSİKTİ (elle yazılmış
    // sekizli kopya) — artık tek kaynaktan türediği için burada de görünmeli.
    for (const arac of ["siniflama", "durum-guncelle", "kavram", "kurallar", "prizma", "bul", "bicimle", "iskelet", "denetle-proje"]) {
      assert.match(cikti, new RegExp(arac.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `yardım metni "${arac}" MCP aracını anmıyor`);
    }
  });
}

// ── ②b Doküman drifti nöbeti (Şart 3 kapanışı — "AYRICA BİR SAYI YANLIŞTIR") ──
//    yardimMetni() JSDoc'u alt komut sayısını ELLE anar (kanondan üretilmez —
//    bilinçli tercih, bkz. fonksiyonun kendi yorumu). Bu test o sayının gerçek
//    dağıtıcı dal sayısıyla senkron kaldığını GERÇEK KAYNAK METNİNDEN ölçer:
//    her `if (yol === "...")` gövdesi bir alt komuttur, --help/-h/help meta-dalı
//    hariç. Eski hâlde ölçülen gerçek sayı otuz dört idi, belge otuz yedi diyordu.

test('yardimMetni() JSDoc\'undaki alt komut sayısı dağıtıcının gerçek dal sayısıyla birebir örtüşür (doküman drifti nöbeti)', () => {
  const kaynak = readFileSync(fileURLToPath(new URL("../src/sarmal.ts", import.meta.url)), "utf8");
  const dallar = [...kaynak.matchAll(/if \(yol === "([^"]+)"/g)].map((m) => m[1]);
  const gercekSayi = dallar.filter((ad) => ad !== "--help").length;
  assert.equal(
    gercekSayi,
    34,
    `dağıtıcıdaki gerçek alt komut sayısı değişmiş görünüyor (${gercekSayi}) — bu sayı ve yardimMetni() JSDoc'u BİRLİKTE güncellenmeli`,
  );
  assert.match(
    kaynak,
    /yüzeyi — otuz dört alt komutu/,
    `yardimMetni() JSDoc'u gerçek sayıyla (${gercekSayi}) senkron değil — "otuz dört" ibaresi bulunamadı`,
  );
});

// ── ③ Yalnız MCP'de yaşayan dokuz araç — sessiz çökme yerine dürüst yönlendirme ──
//    ("kurallar" bu turda eklendi: eski elle-yazılmış sekizli kopyada eksikti.)

const MCP_ARACLARI = ["siniflama", "durum-guncelle", "kavram", "kurallar", "prizma", "bul", "bicimle", "iskelet", "denetle-proje"];

for (const arac of MCP_ARACLARI) {
  test(`"sarmal ${arac}" MCP-yalnız araç olduğunu söyler, sessiz çökmez (çıkış 1)`, () => {
    const { cikti, kod } = calistir([arac]);
    assert.equal(kod, 1);
    yigitIziYok(cikti, `sarmal ${arac}`);
    assert.match(cikti, /MCP/, "MCP aracı olduğu söylenmeli");
    assert.match(cikti, new RegExp(`mcp__sarmal__${arac}`), "nasıl çağrılacağı (araç adı) söylenmeli");
  });
}

// ── ③b Tek-kaynak bütünlüğü: mcp-metinleri.ts'teki HER araç adı tanınır ──────
//    Şart 2'nin kalıcı kanıtı: liste artık elle bakımlı değil, MCP_ARAC_ADI'dan
//    türetiliyor. Bu test o türetime GÜVENMEZ, tek kaynağı BAĞIMSIZCA okur ve
//    her adın CLI'da "Bilinmeyen komut" ile karşılanmadığını doğrular — kaynağa
//    yeni bir araç eklendiğinde bu test onu OTOMATİK kapsar (elle liste büyütme
//    gerekmez), çünkü döngü Object.values(MCP_ARAC_ADI) üzerinde çalışır.
test("mcp-metinleri.ts'teki MCP_ARAC_ADI içindeki her araç adı CLI'da tanınır (CLI komutu ya da MCP yönlendirmesi) — hiçbiri 'Bilinmeyen komut' vermez", () => {
  const araclar = Object.values(MCP_ARAC_ADI);
  assert.ok(araclar.length >= 18, `MCP_ARAC_ADI beklenenden az araç taşıyor (${araclar.length}) — kaynak küçülmüş olabilir`);
  for (const ad of araclar) {
    const { cikti } = calistir([ad]);
    yigitIziYok(cikti, `sarmal ${ad} (tek-kaynak tamlık taraması)`);
    assert.doesNotMatch(cikti, /Bilinmeyen komut/, `"${ad}" CLI'da tanınmadı — MCP_ARACLARI türetimi ya da BILINEN_KOMUTLAR listesi güncel değil`);
  }
});

// ── ④ Tanınmayan komut dizesi — dürüst tek satır hata + varsa öneri ──────────

test('yazım hatası içeren tanınmayan komut ("denetl") en yakın bilinen komutu ("denetle") önerir', () => {
  const { cikti, kod } = calistir(["denetl"]);
  assert.equal(kod, 1);
  yigitIziYok(cikti, "sarmal denetl");
  assert.match(cikti, /Bilinmeyen komut/);
  assert.match(cikti, /"sarmal denetle"/, "yakın komut önerilmeli");
  assert.match(cikti, /sarmal --help/, "yardım komutu anılmalı");
});

test("hiçbir bilinen komuta yakın olmayan rastgele bir dize de dürüst tek satır hata verir (uydurma öneri basmaz)", () => {
  const { cikti, kod } = calistir(["qqzzxx-bilinmeyen-komut-999"]);
  assert.equal(kod, 1);
  yigitIziYok(cikti, "sarmal qqzzxx-bilinmeyen-komut-999");
  assert.match(cikti, /Bilinmeyen komut/);
  assert.match(cikti, /sarmal --help/);
});

// ── ⑤ Var olmayan .sar dosyası — "dosya bulunamadı" cümlesi, ham istisna değil ──

test('"sarmal olmayan.sar" ham readFileSync istisnası yerine anlaşılır bir cümle basar', () => {
  const { cikti, kod } = calistir(["olmayan.sar"]);
  assert.equal(kod, 1);
  yigitIziYok(cikti, "sarmal olmayan.sar");
  assert.match(cikti, /Dosya bulunamadı/);
  assert.match(cikti, /"olmayan\.sar"/);
});

test("bir dizin içindeki var olmayan .sar yolu da aynı dürüst cümleyi verir", () => {
  const kok = mkdtempSync(join(tmpdir(), "sarmal-cli-kapisi-"));
  try {
    const yol = join(kok, "hic-yok", "hayali.sar");
    const { cikti, kod } = calistir([yol]);
    assert.equal(kod, 1);
    yigitIziYok(cikti, `sarmal ${yol}`);
    assert.match(cikti, /Dosya bulunamadı/);
  } finally {
    rmSync(kok, { recursive: true, force: true });
  }
});

// ── ⑤b Dizin bekçisi (Şart 1 kapanışı) — var olan ama DOSYA olmayan bir yol ──
//    Eski bekçi yalnız `!existsSync(yol)` ayıklıyordu; var olan bir DİZİN aşağıdaki
//    readFileSync'e düşüp ham `node:fs:435` yığın izi basıyordu. Ölçülmüş üç somut
//    hâlin en ağırı budur çünkü "sarmal ." yeni bir kullanıcının en olası ilk çağrısıdır.

test('"sarmal ." (çalışma dizininin kendisi) ham yığın izi vermez, dizin olduğunu söyler ve "sarmal denetle" önerir', () => {
  const kok = mkdtempSync(join(tmpdir(), "sarmal-cli-kapisi-dizin-nokta-"));
  try {
    const { cikti, kod } = calistir(["."], { cwd: kok });
    yigitIziYok(cikti, "sarmal . (dizin bekçisi — en ağır hâl)");
    assert.equal(kod, 1);
    assert.match(cikti, /"\."/, "hangi yolun dizin olduğu adıyla söylenmeli");
    assert.match(cikti, /dizindir/, "kullanıcıya ne olduğu dürüstçe söylenmeli");
    assert.match(cikti, /sarmal denetle \./, "proje geneli denetim önerisi verilmeli");
  } finally {
    rmSync(kok, { recursive: true, force: true });
  }
});

test('"sarmal ./altdizin" bir alt dizin yolu da aynı dürüst dizin cümlesini verir, ham yığın izi vermez', () => {
  const kok = mkdtempSync(join(tmpdir(), "sarmal-cli-kapisi-dizin-alt-"));
  try {
    mkdirSync(join(kok, "src"));
    const { cikti, kod } = calistir(["./src"], { cwd: kok });
    yigitIziYok(cikti, "sarmal ./src (dizin bekçisi — alt dizin hâli)");
    assert.equal(kod, 1);
    assert.match(cikti, /dizindir/);
    assert.match(cikti, /sarmal denetle/);
  } finally {
    rmSync(kok, { recursive: true, force: true });
  }
});

// ── ⑥ Ad çakışması (Şart 1 + Şart 2 birleşimi) — MCP yönlendirmesi dizin bekçisinden ÖNCE gelir ──
//    Denetçinin üçüncü somut ölçümü: çalışma dizininde bir MCP aracıyla aynı
//    adlı klasör (ör. "siniflama") varsa `sarmal siniflama` yine MCP yönlendirmesi
//    almalı, yeni dizin bekçisine düşüp "dizindir" dememelidir.

test('çalışma dizininde bir MCP aracıyla aynı adlı klasör ("siniflama") varken "sarmal siniflama" yine MCP yönlendirmesi alır, dizin bekçisine düşmez', () => {
  const kok = mkdtempSync(join(tmpdir(), "sarmal-cli-kapisi-adcakisma-"));
  try {
    mkdirSync(join(kok, "siniflama"));
    const { cikti, kod } = calistir(["siniflama"], { cwd: kok });
    yigitIziYok(cikti, 'sarmal siniflama (adı çakışan "siniflama/" klasörü varken)');
    assert.equal(kod, 1);
    assert.match(cikti, /MCP/, "MCP aracı olduğu söylenmeli — dizin bekçisi bunu gölgelememeli");
    assert.match(cikti, /mcp__sarmal__siniflama/);
    assert.doesNotMatch(cikti, /dizindir/, "dizin bekçisi MCP yönlendirmesinin ÖNÜNE geçmemeli");
  } finally {
    rmSync(kok, { recursive: true, force: true });
  }
});

// ── ⑦ Regresyon bekçisi: mutlu yol (var olan gerçek dosya) hiçbir yeni kapıya takılmaz ──

test("mutlu yol korunur: var olan geçerli bir .sar dosyası eskisi gibi ayrıştırılıp basılır", () => {
  const kok = mkdtempSync(join(tmpdir(), "sarmal-cli-kapisi-mutlu-"));
  try {
    const yol = join(kok, "x.sar");
    writeFileSync(yol, 'Blok( kod: B1, ne: "hedef blok" ) { }\n', "utf8");
    const { cikti, kod } = calistir([yol]);
    yigitIziYok(cikti, `sarmal ${yol}`);
    assert.equal(kod, 0, `mutlu yol artık çöküyor ya da hata veriyor:\n${cikti}`);
    assert.match(cikti, /Program —/, "ağaç yüzü hâlâ basılmalı");
    assert.doesNotMatch(cikti, /Dosya bulunamadı/);
    assert.doesNotMatch(cikti, /Bilinmeyen komut/);
  } finally {
    rmSync(kok, { recursive: true, force: true });
  }
});

test('bilinen bir alt komut ("denetle") eksik zorunlu argümanla çağrıldığında kendi kullanım satırını basar (mevcut desen — genelleme bu deseni bozmamalı)', () => {
  const { cikti, kod } = calistir(["denetle"]);
  assert.equal(kod, 1);
  yigitIziYok(cikti, "sarmal denetle (argümansız)");
  assert.match(cikti, /denetle için proje dizini gerekli/);
});

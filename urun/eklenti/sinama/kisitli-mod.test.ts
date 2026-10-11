// ═══════════════════════════════════════════════════════════════════════════
// kisitli-mod.test.ts — 🔒 KISITLI MODDA EKLENTİNİN SESİ (MGZ-A02)
//
//   Ölçülmüş kusur (HTR-KISITLI-MODDA-EKLENTI-SESSIZ · 2026-09-17): Founder hiç
//   açılmamış bir Sarmal ağacını açtığında pencere Kısıtlı Modda doğdu; .sar
//   dosyası düz metin göründü, renk gelmedi, sol şeritte Sarmal simgesi ve durum
//   çubuğunda Sarmal işareti belirmedi ve eklenti neden sustuğunu hiçbir yerde
//   söylemedi. Adımın ilk işi ölçümdü: eklenti bildirimi güvenilmeyen çalışma
//   alanı beyanını (`capabilities.untrustedWorkspaces`) HİÇ taşımıyordu. VS Code
//   beyansız ve kod girişi olan bir eklentiyi Kısıtlı Modda bütünüyle kapatır;
//   dil tanımı ve dilbilgisi renklendirmesi de onunla birlikte düşer.
//
//   Onarımın sınırı: güvenilmeyen modda kod çalıştıran bir yetenek açılmaz. Tam
//   denetim diski tarar ve mühürlü dosya bulunca `git` koşturur; paneller o turdan
//   beslenir. Kısıtlı modda bu yüzden yalnız bildirimsel dil yüzü (dil tanımı,
//   dilbilgisi renklendirmesi, parçacıklar) ve tek bir durum çubuğu işareti
//   çalışır; işaret kapalı kalanı ve güvenmenin yolunu tek cümleyle söyler.
//
//   Davranış nöbetleri eklentinin GERÇEK girişini sahte bir editörde koşturur
//   (etkinlesme-kabugu.ts). Renklendirmenin ekranda görünmesi bu süitin
//   ölçemeyeceği bir şeydir; burada yalnız bildirimin onu taşıdığı ölçülür ve
//   gerçek editördeki bakış Founder'a bırakılır.
//
//   KARŞILAMA GÖRÜNÜMÜ (MGZ-A08 · Founder hükmü 2026-10-10): görünümlerin güvene
//   bağlanmasının bedeli Sarmal simgesinin kısıtlı modda sol şeritten kalkmasıydı.
//   Simge artık kalır; kısıtlı modda kapta tek bir karşılama görünümü açılır ve
//   neyin kapalı olduğunu söyleyip Klasöre Güven bağlantısını verir. Üçüncü
//   bölümün nöbetleri bunu bildirimden, katalogdan ve gerçek girişten ölçer.
// ═══════════════════════════════════════════════════════════════════════════

import { test, after } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { etkinlestir, geciciAlan, kabukTemizle, type EtkinEklenti } from "./etkinlesme-kabugu.ts";
import { BAGLAM, BOLUM_SIRASI_GORUNUSU, RAY_BOLUMU, RAY_GORUNUSLERI, YUVA_GORUNUSLERI, yuvaBaglamDegeri } from "../src/bolum-cekirdek.ts";
import { KAPSAYICI_SIMGE } from "../src/simge-cizelgesi.ts";
import { KISITLI_MOD_METINLERI, yuzeyDiliniAyarla } from "../src/yuzey-metinleri.ts";

const yol = (g: string): string => fileURLToPath(new URL(g, import.meta.url));
interface Gorunum { id: string; type?: string; name?: string; icon?: string; when?: string }
const PAKET = JSON.parse(readFileSync(yol("../package.json"), "utf8")) as {
  capabilities?: { untrustedWorkspaces?: { supported?: unknown; description?: string } };
  contributes: {
    languages: Array<{ id: string; extensions?: string[] }>;
    grammars: Array<{ language: string; path: string }>;
    configurationDefaults: Record<string, Record<string, unknown>>;
    viewsContainers: { activitybar: Array<{ id: string; icon: string }> };
    views: Record<string, Gorunum[]>;
    viewsWelcome?: Array<{ view: string; contents: string; when?: string }>;
    commands: Array<{ command: string }>;
  };
};
const NLS = {
  tr: JSON.parse(readFileSync(yol("../package.nls.tr.json"), "utf8")) as Record<string, string>,
  en: JSON.parse(readFileSync(yol("../package.nls.json"), "utf8")) as Record<string, string>,
};
const GUVEN_KOMUTU = "workbench.trust.manage";
/** VS Code'un çalışma alanı güvenini taşıyan yerleşik bağlam anahtarı. */
const GUVEN_ANAHTARI = "isWorkspaceTrusted";
const EMOJI = /\p{Extended_Pictographic}/u;

/** `%anahtar%` yer tutucusunu bir dil dosyasında çözer. */
const nls = (deger: string | undefined, dil: "tr" | "en"): string | undefined => {
  const es = /^%(.+)%$/u.exec(deger ?? "");
  return es ? NLS[dil][es[1]!] : deger;
};

// ── ① ÖLÇÜM: bildirim ───────────────────────────────────────────────────────

test("MGZ-A02 ÖLÇÜM: bildirim güvenilmeyen çalışma alanı beyanını taşır ve sınırlı destek ilan eder", () => {
  const beyan = PAKET.capabilities?.untrustedWorkspaces;
  assert.ok(beyan, "capabilities.untrustedWorkspaces yok — VS Code eklentiyi Kısıtlı Modda bütünüyle kapatır ve dil tanımı da düşer");
  assert.equal(beyan.supported, "limited",
    "destek sınırlı ilan edilmeli: tam destek güven isteyen denetimi açar, desteksizlik dil tanımını kapatır");
  for (const dil of ["tr", "en"] as const) {
    const metin = nls(beyan.description, dil);
    assert.ok(metin && metin.length > 0, `${dil}: kısıtlı mod açıklaması dil dosyasında yok`);
    assert.doesNotMatch(metin, EMOJI, `${dil}: açıklama emoji taşıyor`);
    assert.match(metin, dil === "tr" ? /güven/u : /trust/u, `${dil}: açıklama güvenle neyin açıldığını söylemiyor`);
  }
});

test("MGZ-A02: dil tanımı ve renklendirme bildirimseldir ve ASCII dışı harf işareti Sarmal dilinde kapalıdır", () => {
  const dil = PAKET.contributes.languages.find((l) => l.id === "sarmal");
  assert.ok(dil?.extensions?.includes(".sar"), ".sar uzantısı Sarmal diline bildirimle bağlı değil");
  const dilbilgisi = PAKET.contributes.grammars.find((g) => g.language === "sarmal");
  assert.ok(dilbilgisi && existsSync(yol(join("..", dilbilgisi.path))), "renklendirmenin dilbilgisi bildirimde ya da diskte yok");
  assert.equal(PAKET.contributes.configurationDefaults["[sarmal]"]?.["editor.unicodeHighlight.nonBasicASCII"], false,
    "Kısıtlı Modda VS Code Türkçe harflerin hepsini kutuyla işaretler — Sarmal dili için bu işaret varsayılan olarak kapalı olmalı");
});

test("MGZ-A02: Sarmal panelleri güvene bağlıdır; kısıtlı modda yalnız sağlayıcı istemeyen karşılama görünümü açılır", () => {
  const gorunumler = PAKET.contributes.views["sarmal-yol"] ?? [];
  assert.ok(gorunumler.length > 0, "görünüm kabı boş — nöbet boş küme üstünde koşar");
  let karsilamaSayisi = 0;
  for (const g of gorunumler) {
    // MGZ-A08: yalnız güvenilmeyen klasörde görünen karşılama görünümü bu kuralın
    // tek istisnasıdır; sağlayıcı istemediğini üçüncü bölümün nöbetleri ölçer.
    if (g.when === `!${GUVEN_ANAHTARI}`) { karsilamaSayisi += 1; continue; }
    const parcalar = (g.when ?? "").split("&&").map((p) => p.trim());
    assert.ok(parcalar.includes(GUVEN_ANAHTARI),
      `${g.id} güvene bağlı değil (koşul: ${g.when ?? "yok"}) — kısıtlı modda sağlayıcısız açılır ve bozuk görünür`);
  }
  assert.ok(karsilamaSayisi <= 1, `kısıtlı modda ${karsilamaSayisi} görünüm açılıyor — tek bir karşılama görünümü beklenir`);
});

// ── ② DAVRANIŞ: gerçek giriş sahte editörde ─────────────────────────────────

const acik: EtkinEklenti[] = [];
// Etkinleşmeler kapanır; açılan her geçici klasör ve paketlenmiş giriş,
// sınamalar başarısız olsa da silinir.
after(() => { for (const e of acik.splice(0)) e.kapat(); kabukTemizle(); });

/** Tek projeli ağaç: sağlam bir dosya ve sözdizimi kırık bir dosya. */
function agacKur(): { alan: string; plan: string; kirik: string } {
  const alan = geciciAlan("sarmal-kisitli-mod-");
  mkdirSync(join(alan, "proje"), { recursive: true });
  writeFileSync(join(alan, "proje", "proje_anadizin.sar"), 'ÇalışmaAlanı( kod: PROJE, ad: "proje" )\n', "utf8");
  const plan = join(alan, "proje", "plan.sar");
  writeFileSync(plan, 'Faz( kod: F1, ad: "sağlam" )\n', "utf8");
  const kirik = join(alan, "proje", "kirik.sar");
  writeFileSync(kirik, 'Faz( kod: F2 ad: "kırık" )\n', "utf8");
  return { alan, plan, kirik };
}

/** Eşzamansız işlerin kuyruğu boşalsın diye kısa bir bekleme — kısıtlı modda hiçbir tur başlamamalı. */
const bekle = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

test("MGZ-A02: güvenilmeyen klasörde eklenti diski taramaz, tanı üretmez ve durumu tek bir işaretle söyler", async () => {
  const a = agacKur();
  const e = etkinlestir({ klasorler: [a.alan], etkinDosya: a.plan, guvenilir: false });
  acik.push(e);
  await bekle(300);
  assert.equal(e.kayit.dosyaAramasi, 0, "kısıtlı modda çalışma alanı tarandı — güven isteyen tur koştu");
  assert.equal(e.kayit.tanilar.size, 0, "kısıtlı modda tanı üretildi — denetim kapalı kalmalı");
  assert.equal(e.kayit.kanallar.size, 0, "kısıtlı modda çıktı kanalı açıldı — tam etkinleşme koştu");
  const gorunen = e.kayit.durumOgeleri.filter((o) => o.gorunur);
  assert.equal(gorunen.length, 1, `kısıtlı modda tek bir işaret beklenir, görünen: ${gorunen.map((o) => o.text).join(" | ") || "hiçbiri"}`);
  const isaret = gorunen[0]!;
  assert.match(isaret.text, /Sarmal/u, "işaret hangi araca ait olduğunu söylemiyor");
  assert.match(isaret.text, /kısıtlı/iu, "işaret kısıtlı modu adıyla söylemiyor");
  assert.equal(isaret.command, GUVEN_KOMUTU, "işarete tıklamak VS Code'un çalışma alanı güveni ekranını açmalı");
  const ipucu = String(isaret.tooltip);
  assert.match(ipucu, /güven/u, "ipucu güvenmenin yolunu söylemiyor");
  assert.match(ipucu, /denetim/u, "ipucu kapalı kalan denetimi anmıyor");
  assert.match(ipucu, /renklendir/u, "ipucu çalışmaya devam edeni (tanıma ve renklendirme) söylemiyor");
  assert.equal(ipucu.trim().match(/[.!?](?=\s|$)/gu)?.length, 1, `ipucu tek bir cümle olmalı: ${ipucu}`);
  assert.doesNotMatch(ipucu, EMOJI, "ipucu emoji taşıyor");
  assert.equal((e.yuz?.bolumYuvasiAl as ((s: number) => unknown) | undefined)?.(1), undefined,
    "güven verilmeden kardeş eklenti arayüzü açıldı");
  // `activate()` sözünü bekleyen kardeş eklenti dış yüzü bir söz sanarsa sonsuza dek asılır.
  assert.equal((e.yuz as Record<string, unknown> | undefined)?.then, undefined, "kısıtlı modun dış yüzü bir söz gibi görünüyor");
});

test("MGZ-A02: kısıtlı modda bir Sarmal komutu çağrılırsa çalışmaz ve aynı cümleyle güveni gösterir", async () => {
  const a = agacKur();
  const e = etkinlestir({ klasorler: [a.alan], etkinDosya: a.plan, guvenilir: false });
  acik.push(e);
  const katkilar = PAKET.contributes.commands.map((k) => k.command);
  for (const komut of katkilar) assert.ok(e.kayit.komutlar.has(komut), `${komut} kısıtlı modda kayıtsız — çağrılınca "komut bulunamadı" der`);
  await e.kayit.komutlar.get("sarmal.iskeletKur")!();
  const isaret = e.kayit.durumOgeleri.find((o) => o.gorunur);
  assert.deepEqual(e.kayit.bilgiler, [String(isaret?.tooltip)], "komut kısıtlı modun cümlesini söylemedi ya da başka bir şey söyledi");
  assert.equal(e.kayit.dosyaAramasi, 0, "kısıtlı modda komut diske dokundu");
  assert.equal(existsSync(join(a.alan, "proje", "is")), false, "kısıtlı modda iskelet yazıldı — kod çalıştıran yetenek açıldı");
});

test("MGZ-A02: klasöre güvenilince eklenti pencere yeniden yüklenmeden tam açılır ve işaret kalkar", async () => {
  const a = agacKur();
  const e = etkinlestir({ klasorler: [a.alan], etkinDosya: a.plan, guvenilir: false });
  acik.push(e);
  const isaret = e.kayit.durumOgeleri.find((o) => o.gorunur);
  assert.ok(isaret, "güven verilmeden önce kısıtlı mod işareti yok");
  e.guvenVer();
  await e.turBekle();
  assert.equal(isaret.gorunur, false, "güven verildiği hâlde kısıtlı mod işareti duruyor");
  assert.ok(e.kayit.dosyaAramasi > 0, "güven verildiği hâlde tam denetim turu koşmadı");
  assert.ok((e.kayit.tanilar.get(a.kirik) ?? []).some((d) => d.code === "söz-dizim"),
    "güven verildiği hâlde kırık dosyanın tanısı Sorunlar paneline düşmedi");
  assert.ok(e.kayit.kanallar.size > 0, "güven verildiği hâlde tam etkinleşmenin kanalları açılmadı");
  // Komutlar artık gerçek işleyicidir: kısıtlı modun cümlesi bir daha söylenmez.
  // Zararsız bir komut seçilir (Yol Haritasını yenile yalnız bir tur ister).
  const once = e.kayit.bilgiler.length;
  await e.kayit.komutlar.get("sarmal.yolHaritasiYenile")?.();
  assert.ok(!e.kayit.bilgiler.slice(once).includes(String(isaret.tooltip)), "güven verildiği hâlde komut kısıtlı modun cümlesini söylüyor");
  const ozet = (e.yuz?.sonGoruntuOzeti as (() => { kirik: string[] } | undefined) | undefined)?.();
  assert.deepEqual(ozet?.kirik, [a.kirik], "güvenden sonra eklentinin dış yüzü tam etkinleşmeye bağlanmadı");
});

test("MGZ-A02: güvenilir klasörde kısıtlı mod işareti hiç görünmez", async () => {
  const a = agacKur();
  const e = etkinlestir({ klasorler: [a.alan], etkinDosya: a.plan });
  acik.push(e);
  await e.turBekle();
  assert.ok(e.kayit.durumOgeleri.every((o) => o.command !== GUVEN_KOMUTU), "güvenilir klasörde kısıtlı mod işareti kuruldu");
});

// ── ③ KARŞILAMA GÖRÜNÜMÜ (MGZ-A08) ──────────────────────────────────────────
//   MGZ-A02 bütün görünümleri güvene bağlamıştı, çünkü sağlayıcısı olmayan bir
//   görünüm "veri sağlayıcı yok" der ya da sonsuza dek yükleniyor görünür. VS Code
//   ise görünür görünümü kalmayan bir eklenti kabını sol şeritteki simgesiyle
//   birlikte gizler; bedel Sarmal simgesinin kısıtlı modda kaybolmasıydı. Founder'ın
//   2026-10-10 hükmüyle simge kalır: kısıtlı modda kapta tek bir karşılama görünümü
//   açılır, neyin kapalı olduğunu söyler ve güven ekranına götüren Klasöre Güven
//   bağlantısını verir. VS Code karşılama içeriğini sağlayıcısı olmayan bir ağaç
//   görünümünde de çizdiği için görünüm yalnız bildirimde yaşar; kısıtlı modda kod
//   çalışmaz, diske ve sürece dokunulmaz. Güven gelince görünümün koşulu düşer ve
//   olağan görünümler yeniden yüklemesiz açılır.

const KAP = "sarmal-yol";
const MINI_GRAF_AYARI = "config.sarmal.miniGraf";
/** Görünüm koşullarının okuyabildiği bağlam anahtarları; yenisi doğarsa bileşimlere de girmelidir. */
const BILINEN_ANAHTARLAR = new Set<string>([GUVEN_ANAHTARI, BAGLAM.rayGizli, BAGLAM.seciliYuva, MINI_GRAF_AYARI]);

/**
 * Bildirimdeki bir `when` koşulunu verilen bağlamda değerlendirir. Yalnız görünüm
 * koşullarının bugün kullandığı biçimler tanınır: `&&` ile bağlı terimler; terim
 * `ad`, `!ad` ya da `ad == değer` biçimindedir. Tanınmayan bir terim sessizce
 * yanlış hüküm vermesin diye hata fırlatır.
 */
function kosulTutar(kosul: string | undefined, baglam: Readonly<Record<string, unknown>>): boolean {
  if (!kosul) return true;
  return kosul.split("&&").map((t) => t.trim()).every((terim) => {
    const esitlik = /^([\w.]+)\s*==\s*([\w.-]+)$/u.exec(terim);
    if (esitlik) return baglam[esitlik[1]!] !== undefined && String(baglam[esitlik[1]!]) === esitlik[2];
    const olumsuz = /^!([\w.]+)$/u.exec(terim);
    if (olumsuz) return !baglam[olumsuz[1]!];
    if (/^[\w.]+$/u.test(terim)) return Boolean(baglam[terim]);
    throw new Error(`koşul değerlendiricisi bu terimi tanımıyor: ${terim}`);
  });
}

/** Bir koşulun okuduğu bağlam anahtarları. */
const kosulAnahtarlari = (kosul: string | undefined): string[] =>
  (kosul ?? "").split("&&").map((t) => t.trim()).filter(Boolean).map((t) => /^!?([\w.]+)/u.exec(t)?.[1] ?? t);

/**
 * Eklentinin kendi kurduğu bağlam anahtarlarının ve Mini Graf ayarının bütün
 * bileşimleri; güven anahtarı dışarıdan verilir. Kısıtlı modda eklenti hiçbir
 * anahtar kurmaz, fakat nöbet her bileşime bakar ki sonradan kurulan bir anahtar
 * kısıtlı moddaki görünümü değiştiremesin.
 */
function baglamlar(guvenilir: boolean): Array<Record<string, unknown>> {
  const sonuc: Array<Record<string, unknown>> = [];
  for (const rayGizli of [undefined, false, true])
    for (const yuva of [undefined, RAY_BOLUMU, ...YUVA_GORUNUSLERI.map((_, i) => yuvaBaglamDegeri(i))])
      for (const miniGraf of [true, false])
        sonuc.push({ [GUVEN_ANAHTARI]: guvenilir, [BAGLAM.rayGizli]: rayGizli, [BAGLAM.seciliYuva]: yuva, [MINI_GRAF_AYARI]: miniGraf });
  return sonuc;
}

/** Bir bağlamda koşulu tutan görünümler, bildirimdeki sırayla. */
const gorunenler = (baglam: Readonly<Record<string, unknown>>): string[] =>
  (PAKET.contributes.views[KAP] ?? []).filter((g) => kosulTutar(g.when, baglam)).map((g) => g.id);

/** Kısıtlı modda kapta görünen tek görünüm; yoksa ya da birden çoksa sınama düşer. */
function karsilamaGorunumu(): Gorunum {
  const gorunen = gorunenler({ [GUVEN_ANAHTARI]: false });
  assert.equal(gorunen.length, 1, `kısıtlı modda kapta tek bir karşılama görünümü beklenir, görünen: ${gorunen.join(" · ") || "hiçbiri"}`);
  return PAKET.contributes.views[KAP]!.find((g) => g.id === gorunen[0])!;
}

test("MGZ-A08 ÖLÇÜM: kısıtlı modda kapta görünür bir görünüm kalır, bu yüzden Sarmal simgesi sol şeritten kalkmaz", (t) => {
  const kap = PAKET.contributes.viewsContainers.activitybar.find((k) => k.id === KAP);
  assert.equal(kap?.icon, KAPSAYICI_SIMGE, "sol şeritteki Sarmal simgesi bu kabın simgesidir; kap ya da simgesi değişmiş");
  const gorunumler = PAKET.contributes.views[KAP] ?? [];
  // Bildirimin bugünkü güven koşulları ölçülür ve sınama çıktısına yazılır.
  for (const g of gorunumler) t.diagnostic(`${g.id}: ${g.when ?? "koşulsuz"}`);
  const yabanci = gorunumler.flatMap((g) => kosulAnahtarlari(g.when)).filter((a) => !BILINEN_ANAHTARLAR.has(a));
  assert.deepEqual(yabanci, [], "görünüm koşulu nöbetin bileşimlerinde olmayan bir bağlam anahtarı okuyor — anahtarı bileşimlere ekle");
  for (const b of baglamlar(false)) {
    const gorunen = gorunenler(b);
    assert.equal(gorunen.length, 1,
      `kısıtlı modda kapta ${gorunen.length} görünüm görünür (${gorunen.join(" · ") || "hiçbiri"}). VS Code görünür görünümü ` +
      `kalmayan eklenti kabını sol şeritteki simgesiyle birlikte gizler; tek bir karşılama görünümü beklenir. Bağlam: ${JSON.stringify(b)}`);
  }
});

test("MGZ-A08: karşılama görünümü sağlayıcı istemez — ağaç görünümüdür, içeriği bildirimdedir ve yalnız güvenilmeyen klasörde görünür", () => {
  const k = karsilamaGorunumu();
  assert.equal(k.when, `!${GUVEN_ANAHTARI}`, "karşılama görünümünün koşulu yalnız güvensizliktir");
  assert.ok(k.type === undefined || k.type === "tree",
    `karşılama görünümü ${k.type} türünde — webview görünümü sağlayıcı olmadan sonsuza dek yüklenir, karşılama içeriğini yalnız ağaç görünümü çizer`);
  assert.equal(k.icon, KAPSAYICI_SIMGE, "kısıtlı modda kapta tek başına duran görünüm kabın Sarmal sarmalını taşır");
  for (const dil of ["tr", "en"] as const) {
    const ad = nls(k.name, dil);
    assert.ok(ad && !/%/u.test(ad), `${dil}: karşılama görünümünün adı yerelleştirme dosyasında yok`);
    assert.ok(!ad.includes("Sarmal"), `${dil}: görünüm adı kabın adını tekrar ediyor: ${ad}`);
  }
  const icerikler = (PAKET.contributes.viewsWelcome ?? []).filter((w) => w.view === k.id);
  assert.equal(icerikler.length, 1, "karşılama görünümünün bildirimde tek bir karşılama içeriği olmalı");
  assert.match(icerikler[0]!.contents, /^%[^%]+%$/u, "karşılama içeriği yerelleştirme anahtarıyla yazılmalı; metin bildirime gömülemez");
  for (const b of baglamlar(true))
    assert.ok(!gorunenler(b).includes(k.id), `güvenilir klasörde karşılama görünümü görünüyor: ${JSON.stringify(b)}`);
});

test("MGZ-A08: güvenilir klasörde görünen görünümler değişmez", () => {
  const guvenilir = (ek: Record<string, unknown>): string[] => gorunenler({ [GUVEN_ANAHTARI]: true, [MINI_GRAF_AYARI]: true, ...ek });
  // Beklenen kümeler bildirimden değil bölüm modelinden kurulur: Ray seçiliyken
  // bölüm sırası ile Ray'in altı paneli, bir yuva seçiliyken sıra ile o yuva.
  assert.deepEqual(guvenilir({}), [BOLUM_SIRASI_GORUNUSU, ...RAY_GORUNUSLERI], "ilk açılışta görünen görünümler değişmiş");
  assert.deepEqual(guvenilir({ [BAGLAM.seciliYuva]: RAY_BOLUMU, [BAGLAM.rayGizli]: false }), [BOLUM_SIRASI_GORUNUSU, ...RAY_GORUNUSLERI],
    "Ray seçiliyken görünen görünümler değişmiş");
  assert.deepEqual(guvenilir({ [MINI_GRAF_AYARI]: false }), [BOLUM_SIRASI_GORUNUSU, ...RAY_GORUNUSLERI.filter((g) => g !== "sarmalMiniGraf")],
    "Mini Graf kapalıyken görünen görünümler değişmiş");
  YUVA_GORUNUSLERI.forEach((yuva, i) => {
    assert.deepEqual(guvenilir({ [BAGLAM.seciliYuva]: yuvaBaglamDegeri(i), [BAGLAM.rayGizli]: true }), [BOLUM_SIRASI_GORUNUSU, yuva],
      `${yuva} seçiliyken görünen görünümler değişmiş`);
  });
});

test("MGZ-A08: karşılama metni iki dildedir, yüzey kataloğundan gelir, kapalı olanı söyler ve Klasöre Güven bağlantısı taşır", () => {
  const icerik = (PAKET.contributes.viewsWelcome ?? []).find((w) => w.view === karsilamaGorunumu().id);
  assert.ok(icerik, "karşılama içeriği bildirimde yok");
  const metinler: Partial<Record<"tr" | "en", string>> = {};
  for (const dil of ["tr", "en"] as const) {
    yuzeyDiliniAyarla(dil);
    try {
      const katalog = KISITLI_MOD_METINLERI.karsilama(GUVEN_KOMUTU);
      assert.equal(nls(icerik.contents, dil), katalog,
        `${dil}: yerelleştirme dosyasındaki karşılama metni katalogdan ayrışmış — metnin tek kaynağı yuzey-metinleri.ts'tir ve dosya onu birebir aynalar`);
      const satirlar = katalog.split("\n");
      // VS Code her satırı ayrı paragraf çizer; kendi satırında duran tek bağlantı düğme olur.
      assert.equal(satirlar.at(-1), `[${KISITLI_MOD_METINLERI.guvenDugmesi}](command:${GUVEN_KOMUTU})`,
        `${dil}: son satır güven ekranını açan Klasöre Güven düğmesi değil`);
      assert.equal(satirlar.filter((s) => s.includes("command:")).length, 1, `${dil}: metin birden çok komut bağlantısı taşıyor`);
      const govde = satirlar.slice(0, -1);
      assert.ok(govde.length > 0 && govde.every((s) => /\.$/u.test(s)), `${dil}: her paragraf tam cümleyle bitmeli`);
      assert.doesNotMatch(katalog, EMOJI, `${dil}: karşılama metni emoji taşıyor`);
      const duz = govde.join(" ");
      if (dil === "tr") {
        assert.equal(KISITLI_MOD_METINLERI.guvenDugmesi, "Klasöre Güven");
        for (const [desen, ne] of [[/renklendir/u, "çalışmaya devam edeni"], [/[Dd]enetim/u, "kapalı kalan denetimi"],
          [/Sorunlar/u, "Sorunlar panelinin boş kalacağını"], [/panel/u, "kapalı kalan panelleri"], [/güven/u, "güvenmenin yolunu"]] as const)
          assert.match(duz, desen, `tr: metin ${ne} söylemiyor`);
      } else {
        assert.equal(KISITLI_MOD_METINLERI.guvenDugmesi, "Trust Folder");
        for (const [desen, ne] of [[/colors/u, "what keeps working"], [/[Vv]alidation/u, "that validation is off"],
          [/Problems/u, "that the Problems panel stays empty"], [/panels/u, "that the panels are off"], [/trust/u, "how to trust"]] as const)
          assert.match(duz, desen, `en: the text does not say ${ne}`);
      }
      metinler[dil] = katalog;
    } finally {
      yuzeyDiliniAyarla("tr");
    }
  }
  assert.notEqual(metinler.tr, metinler.en, "İngilizce karşılık Türkçe metnin aynısı — ikinci dil yazılmamış");
});

test("MGZ-A08: kısıtlı modda hiçbir görünüm sağlayıcısı kurulmaz; güven gelince görünen her panel sağlayıcısını yeniden yüklemesiz alır", async () => {
  const karsilama = karsilamaGorunumu().id;
  const ilkAcilis = gorunenler({ [GUVEN_ANAHTARI]: true, [MINI_GRAF_AYARI]: true });
  const a = agacKur();
  const e = etkinlestir({ klasorler: [a.alan], etkinDosya: a.plan, guvenilir: false });
  acik.push(e);
  await bekle(300);
  assert.deepEqual([...e.kayit.gorunumKayitlari], [], "kısıtlı modda bir görünüm sağlayıcısı kuruldu — karşılama sağlayıcı istemez, paneller güveni bekler");
  assert.equal(e.kayit.dosyaAramasi, 0, "kısıtlı modda çalışma alanı tarandı");
  e.guvenVer();
  await e.turBekle();
  assert.ok(!e.kayit.gorunumKayitlari.includes(karsilama), "güvenden sonra karşılama görünümüne sağlayıcı kuruldu");
  assert.deepEqual([...e.kayit.gorunumKayitlari].sort(), [...ilkAcilis].sort(),
    "güvenden sonra ilk açılışta görünen her panel sağlayıcısını almalı ve fazlası kurulmamalı");
  // Baştan güvenilir bir klasörde de aynı küme kurulur.
  const b = agacKur();
  const g = etkinlestir({ klasorler: [b.alan], etkinDosya: b.plan });
  acik.push(g);
  await g.turBekle();
  assert.deepEqual([...g.kayit.gorunumKayitlari].sort(), [...ilkAcilis].sort(), "güvenilir klasörde kurulan sağlayıcılar değişmiş");
});

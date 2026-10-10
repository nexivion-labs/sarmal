// ═══════════════════════════════════════════════════════════════════════════
// mcpb-bildirimi.test.ts — EKL-F6-A03 masaüstü eklenti bildirimi nöbeti
//
//   Bu nöbetin varlık sebebi şudur: `manifest.json` bir yüzdür, kaynak değildir.
//   İçindeki her alanın gerçeği başka bir dosyada yaşar — ad ile sürüm paket
//   bildiriminde, lisans LICENSE.md ile eklenti paketinde, depo adresi eklenti
//   paketinde, giriş dosyası diskte, gizlilik adresi ise iki tanıtım yüzünde.
//   İkisinden biri tek taraflı değişirse bildirim sessizce yalan söylemeye
//   başlar ve yalanı ilk gören, paketi kuran yabancı olur. Bu yüzden burada
//   bildirim kendi içinde tutarlı sayılmaz; her alan KAYNAĞIYLA karşılaştırılır
//   ve ayrışma süiti kırmızıya çevirir.
//
//   Alan adları MCPB bildirim şemasının 0.3 sürümünden alınmıştır: zorunlu
//   haneler `name`, `version`, `description`, `author` ve `server`; yerel
//   bağlayıcıların dizin kuralı bunlara `privacy_policies` dizisini ekler ve
//   dizinin HTTPS adreslerden kurulmasını ister.
// ═══════════════════════════════════════════════════════════════════════════
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const CEKIRDEK = fileURLToPath(new URL("../", import.meta.url));
const DEPO_KOKU = fileURLToPath(new URL("../../../", import.meta.url));
const BILDIRIM_YOLU = join(CEKIRDEK, "manifest.json");
const MCP_YOLU = join(CEKIRDEK, "src", "mcp.ts");

/** Bildirimin bağlı olduğu şema sürümü — dizin kuralının okuduğu hane. */
const BEKLENEN_SPEC = "0.3";
/** 0.3 şemasının zorunlu tuttuğu haneler (manifest_version dahil edilmiştir). */
const ZORUNLU_ALANLAR = ["manifest_version", "name", "version", "description", "author", "server"] as const;
/** Şemanın platform numaralandırması. */
const IZINLI_PLATFORMLAR = ["darwin", "win32", "linux"];

// ── tipler ──────────────────────────────────────────────────────────────────

interface Bildirim {
  manifest_version?: string;
  name?: string;
  display_name?: string;
  version?: string;
  description?: string;
  author?: { name?: string; url?: string };
  repository?: { type?: string; url?: string };
  homepage?: string;
  documentation?: string;
  license?: string;
  icon?: string;
  keywords?: string[];
  privacy_policies?: string[];
  compatibility?: { platforms?: string[]; runtimes?: { node?: string } };
  server?: {
    type?: string;
    entry_point?: string;
    mcp_config?: { command?: string; args?: string[]; env?: Record<string, string> };
  };
}

interface PaketBildirimi {
  name?: string;
  version?: string;
  license?: string;
  keywords?: string[];
  engines?: { node?: string };
  repository?: { url?: string };
  dependencies?: Record<string, string>;
}

/** Bildirimin ölçüleceği kaynaklar — her alanın gerçeği nereden okunuyorsa. */
interface Gercek {
  cekirdekAdi: string;
  cekirdekSurumu: string;
  nodeSarti: string;
  eklentiLisansi: string;
  depoAdresi: string;
  eklentiAnahtarlari: string[];
  lisansMetni: string;
  /** Eklentideki marka ikonunun ham baytları — paket kökündeki kopyanın aslı. */
  eklentiIkonu: Buffer;
  /** Sunucunun telde ilan ettiği sürüm — paket sürümüyle aynı olmalıdır (Founder hükmü 2026-09-16). */
  sunucuTeliSurumu: string;
  /** [dosya adı, içerik] — gizlilik adresinin görünmesi gereken tanıtım yüzleri. */
  tanitimYuzleri: Array<[string, string]>;
}

// ── kaynaklar ───────────────────────────────────────────────────────────────

function json<T>(yol: string): T {
  return JSON.parse(readFileSync(yol, "utf8")) as T;
}

const BILDIRIM = json<Bildirim>(BILDIRIM_YOLU);
const CEKIRDEK_PAKETI = json<PaketBildirimi>(join(CEKIRDEK, "package.json"));
const EKLENTI_PAKETI = json<PaketBildirimi>(join(DEPO_KOKU, "urun", "eklenti", "package.json"));

const GERCEK: Gercek = {
  cekirdekAdi: CEKIRDEK_PAKETI.name ?? "",
  cekirdekSurumu: CEKIRDEK_PAKETI.version ?? "",
  nodeSarti: CEKIRDEK_PAKETI.engines?.node ?? "",
  eklentiLisansi: EKLENTI_PAKETI.license ?? "",
  depoAdresi: EKLENTI_PAKETI.repository?.url ?? "",
  eklentiAnahtarlari: EKLENTI_PAKETI.keywords ?? [],
  eklentiIkonu: readFileSync(join(DEPO_KOKU, "urun", "eklenti", "ikonlar", "sarmal-ikon.png")),
  sunucuTeliSurumu: sunucuTeliSurumu(readFileSync(join(CEKIRDEK, "src", "mcp.ts"), "utf8")),
  lisansMetni: readFileSync(join(DEPO_KOKU, "LICENSE.md"), "utf8"),
  tanitimYuzleri: [
    ["README.md", readFileSync(join(DEPO_KOKU, "README.md"), "utf8")],
    ["README.en.md", readFileSync(join(DEPO_KOKU, "README.en.md"), "utf8")],
  ],
};

/** LICENSE.md gövdesinden SPDX kimliği okunur — lisans adı elle yazılmaz. */
function lisansKimligi(metin: string): string {
  if (metin.includes("Apache License") && metin.includes("Version 2.0")) return "Apache-2.0";
  return "bilinmeyen";
}

/** mcp.ts gövdesindeki SUNUCU ilanından tel sürümü okunur — sayı elle yazılmaz. */
function sunucuTeliSurumu(metin: string): string {
  const eslesme = /const SUNUCU = \{ name: "sarmal", version: "([^"]+)" \}/.exec(metin);
  return eslesme?.[1] ?? "bulunamadı";
}

const esit = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

// ── nöbetin kalbi: bildirim ile kaynak arasındaki ayrışma ───────────────────

/**
 * Bildirimin her alanını kendi kaynağıyla karşılaştırır ve ayrışan alanların
 * adlarını döndürür. Boş dizi, bildirimin bugünkü gerçeği taşıdığı demektir.
 */
function bildirimAyrismalari(b: Bildirim, g: Gercek): string[] {
  const ayrisma: string[] = [];

  for (const alan of ZORUNLU_ALANLAR)
    if (b[alan] === undefined) ayrisma.push(`${alan}(eksik)`);

  if (b.manifest_version !== BEKLENEN_SPEC) ayrisma.push("manifest_version");
  if (b.name !== g.cekirdekAdi) ayrisma.push("name");
  if (b.version !== g.cekirdekSurumu) ayrisma.push("version");
  // Paket ile sunucu aynı sürümü söylemelidir: dizin incelemesi iki farklı sayı
  // görünce hangisine güveneceğini bilemez ve kurulanın hangi değişiklikle
  // geldiği okunamaz hâle gelir (Founder hükmü 2026-09-16).
  if (g.cekirdekSurumu !== g.sunucuTeliSurumu) ayrisma.push("version(sunucu-teliyle-ayrışık)");
  if (!b.description?.trim()) ayrisma.push("description");
  if (!b.author?.name?.trim()) ayrisma.push("author.name");

  // Lisans ÜÇ kaynakta birden aynı olmalıdır: bildirim, LICENSE.md ve eklenti
  // paketi. Biri ötekinden ayrılırsa hangisinin doğru olduğu okunamaz hâle gelir.
  if (b.license !== lisansKimligi(g.lisansMetni)) ayrisma.push("license(LICENSE.md-ile-ayrışık)");
  if (b.license !== g.eklentiLisansi) ayrisma.push("license(eklenti-ile-ayrışık)");

  if (b.repository?.type !== "git") ayrisma.push("repository.type");
  if (b.repository?.url !== g.depoAdresi) ayrisma.push("repository.url");

  // Tanıtım adresleri deponun kendi adresinden türemelidir; başka bir yere
  // bakan bir bildirim, kurulanın kaynağını bulmasını engeller.
  for (const [ad, deger] of [["homepage", b.homepage], ["documentation", b.documentation]] as Array<[string, string | undefined]>)
    if (!deger || !deger.startsWith(g.depoAdresi)) ayrisma.push(ad);

  if (!esit(b.keywords, g.eklentiAnahtarlari)) ayrisma.push("keywords");

  // İkon paket kökünün İÇİNDE yaşamalıdır, çünkü paketleme kökün dışına çıkan bir
  // yolu taşıyamaz; ayrıca eklentideki aslıyla bayt bayt aynı kalmalıdır, yoksa
  // aynı markanın iki ayrı yüzü doğar ve hangisinin güncel olduğu okunamaz.
  const ikon = b.icon;
  if (!ikon) {
    ayrisma.push("icon(eksik)");
  } else if (ikon.startsWith("/") || ikon.includes("..")) {
    ayrisma.push("icon(paket-kökünün-dışında)");
  } else if (!existsSync(join(CEKIRDEK, ikon))) {
    ayrisma.push("icon(diskte-yok)");
  } else if (!readFileSync(join(CEKIRDEK, ikon)).equals(g.eklentiIkonu)) {
    ayrisma.push("icon(eklentideki-asliyla-ayrışık)");
  }

  // Dizin kuralının üçüncü parçası: HTTPS adresten kurulu bir dizi ve o adresin
  // tanıtım yüzlerinde GERÇEKTEN yaşaması. Uydurulmuş bir adres burada düşer.
  if (!Array.isArray(b.privacy_policies) || b.privacy_policies.length === 0) {
    ayrisma.push("privacy_policies(boş)");
  } else {
    b.privacy_policies.forEach((adres, i) => {
      if (!adres.startsWith("https://")) ayrisma.push(`privacy_policies[${i}](https-değil)`);
      for (const [ad, metin] of g.tanitimYuzleri)
        if (!metin.includes(adres)) ayrisma.push(`privacy_policies[${i}](${ad}-içinde-yok)`);
    });
  }

  if (b.compatibility?.runtimes?.node !== g.nodeSarti) ayrisma.push("compatibility.runtimes.node");
  const platformlar = b.compatibility?.platforms ?? [];
  if (platformlar.length === 0) ayrisma.push("compatibility.platforms(boş)");
  for (const platform of platformlar)
    if (!IZINLI_PLATFORMLAR.includes(platform)) ayrisma.push(`compatibility.platforms(${platform})`);

  const sunucu = b.server;
  if (sunucu?.type !== "node") ayrisma.push("server.type");
  const giris = sunucu?.entry_point;
  if (!giris) {
    ayrisma.push("server.entry_point(eksik)");
  } else {
    if (!existsSync(join(CEKIRDEK, giris))) ayrisma.push("server.entry_point(diskte-yok)");
    // Giriş dosyasının VAR OLMASI yetmez: bildirimin gösterdiği dosya gerçekten
    // MCP sunucusu olmalıdır, yoksa paket başka bir gövdeyi başlatır.
    else if (resolve(CEKIRDEK, giris) !== MCP_YOLU) ayrisma.push("server.entry_point(mcp-sunucusu-değil)");
  }
  if (sunucu?.mcp_config?.command !== "node") ayrisma.push("server.mcp_config.command");
  if (!esit(sunucu?.mcp_config?.args, giris ? [`\${__dirname}/${giris}`] : []))
    ayrisma.push("server.mcp_config.args");
  if (sunucu?.mcp_config?.env === undefined) ayrisma.push("server.mcp_config.env(eksik)");

  return ayrisma;
}

// ── ① canlı bildirim: bugünkü gerçekle sıfır ayrışma ────────────────────────

test("EKL-F6-A03 nöbeti ①: manifest.json'ın her alanı kaynağıyla birebirdir", () => {
  assert.deepEqual(bildirimAyrismalari(BILDIRIM, GERCEK), []);

  // Ölçümün kendisi de beyan edilir: alanların hangi kaynaktan geldiği burada
  // okunur, böylece kaynak değişirse nöbet değil bildirim düzeltilir.
  assert.equal(BILDIRIM.name, CEKIRDEK_PAKETI.name);
  assert.equal(BILDIRIM.version, CEKIRDEK_PAKETI.version);
  assert.equal(BILDIRIM.compatibility?.runtimes?.node, CEKIRDEK_PAKETI.engines?.node);
  assert.equal(BILDIRIM.license, "Apache-2.0");
  assert.equal(BILDIRIM.repository?.url, EKLENTI_PAKETI.repository?.url);
  assert.equal(BILDIRIM.server?.entry_point, "src/mcp.ts");
});

// ── ② mutasyon kanıtı: her bağ tek tek koparılır ────────────────────────────
//   Mutasyonlar yalnız BELLEKTEKİ kopya üzerinde yaşar; manifest.json dosyasına
//   tek bayt yazılmaz, kırmızı senaryo süitin kendi içinde kalır.

test("EKL-F6-A03 nöbeti ②: kaynaktan kopan her alan nöbeti kırmızıya düşürür", () => {
  const boz = (yama: Partial<Bildirim>): string[] => bildirimAyrismalari({ ...BILDIRIM, ...yama }, GERCEK);

  // Ad ve sürüm paket bildiriminden ayrılırsa yakalanır.
  assert.ok(boz({ name: "sarmal" }).includes("name"));
  assert.ok(boz({ version: "9.9.9" }).includes("version"));

  // Lisans yalanı İKİ kaynağa birden düşer — tek bir dosyayı kandırmak yetmez.
  const lisansYalani = boz({ license: "MIT" });
  assert.ok(lisansYalani.includes("license(LICENSE.md-ile-ayrışık)"));
  assert.ok(lisansYalani.includes("license(eklenti-ile-ayrışık)"));

  // Depo adresi eklenti paketinden ayrışırsa yakalanır.
  assert.ok(boz({ repository: { type: "git", url: "https://example.com/baska" } }).includes("repository.url"));

  // Şema sürümü kayarsa dizin kuralı başka bir bildirimi okur.
  assert.ok(boz({ manifest_version: "0.2" }).includes("manifest_version"));

  // Zorunlu hane düşerse şekil nöbeti konuşur.
  assert.ok(boz({ author: undefined }).includes("author(eksik)"));
  assert.ok(boz({ server: undefined }).includes("server(eksik)"));

  // Node şartı paket bildiriminden ayrılırsa yakalanır.
  assert.ok(boz({ compatibility: { platforms: ["darwin"], runtimes: { node: ">=20" } } })
    .includes("compatibility.runtimes.node"));

  // Giriş dosyası: olmayan yol, var olan ama yanlış dosya ve kayan argüman.
  assert.ok(boz({ server: { ...BILDIRIM.server, entry_point: "src/yok.ts" } }).includes("server.entry_point(diskte-yok)"));
  assert.ok(boz({ server: { ...BILDIRIM.server, entry_point: "src/sarmal.ts" } })
    .includes("server.entry_point(mcp-sunucusu-değil)"));
  assert.ok(boz({ server: { ...BILDIRIM.server, mcp_config: { command: "node", args: ["${__dirname}/src/sarmal.ts"], env: {} } } })
    .includes("server.mcp_config.args"));

  // Anahtar kümesi eklenti paketinden ayrışırsa yakalanır.
  assert.ok(boz({ keywords: [...GERCEK.eklentiAnahtarlari, "uydurma"] }).includes("keywords"));
});

// ── ③ gizlilik adresi: uydurulamaz, iki tanıtım yüzünde de yaşamalıdır ──────

test("EKL-F6-A03 nöbeti ③: gizlilik adresi HTTPS'tir ve iki tanıtım yüzünde de yaşar", () => {
  const adresler = BILDIRIM.privacy_policies ?? [];
  assert.ok(adresler.length > 0, "privacy_policies dizisi boş — dizin kuralı bunu ANINDA RET sebebi sayar");
  for (const adres of adresler) {
    assert.ok(adres.startsWith("https://"), `${adres} HTTPS değil`);
    for (const [ad, metin] of GERCEK.tanitimYuzleri)
      assert.ok(metin.includes(adres), `${adres} ${ad} içinde geçmiyor — bildirim uydurma bir adrese bakıyor`);
  }

  const boz = (yama: Partial<Bildirim>): string[] => bildirimAyrismalari({ ...BILDIRIM, ...yama }, GERCEK);
  // Mutasyon: dizi boşalırsa, adres HTTP'ye düşerse ya da depoda karşılığı
  // olmayan bir adrese kayarsa nöbet üçünü de ayrı ayrı adlandırır.
  assert.ok(boz({ privacy_policies: [] }).includes("privacy_policies(boş)"));
  assert.ok(boz({ privacy_policies: ["http://example.com/gizlilik"] }).includes("privacy_policies[0](https-değil)"));
  const uydurma = boz({ privacy_policies: ["https://example.com/gizlilik"] });
  assert.ok(uydurma.includes("privacy_policies[0](README.md-içinde-yok)"));
  assert.ok(uydurma.includes("privacy_policies[0](README.en.md-içinde-yok)"));
});

// ── ④ sıfır bağımlılık (STR-3.1): yayın hazırlığı çalışma zamanı borcu ekleyemez ──

test("EKL-F6-A03 nöbeti ④: çekirdek çalışma zamanında SIFIR bağımlılık taşır", () => {
  const bagimliliklar = CEKIRDEK_PAKETI.dependencies ?? {};
  assert.deepEqual(
    Object.keys(bagimliliklar), [],
    "çekirdeğe çalışma zamanı bağımlılığı eklenmiş — STR-3.1 açık çekirdeğin bunu yasaklar",
  );
  // Paketleme aracı (@anthropic-ai/mcpb) bir YAPI aracıdır; bildirimde de,
  // bağımlılık listesinde de yaşamaz. Gövdeye sızarsa burada görünür.
  assert.ok(!Object.keys(bagimliliklar).includes("@anthropic-ai/mcpb"));
});

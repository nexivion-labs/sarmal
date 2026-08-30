// ═══════════════════════════════════════════════════════════════════════════
// mcp.test.ts — MCP sunucusu uçtan uca (A11/E2 · örtü-farkındalık)
//   Sunucu stdio JSON-RPC olduğundan alt-süreçle sınanır (import yan-etkili:
//   stdin dinleyicisi test sürecini asılı bırakır — spawn temiz sınır).
// ═══════════════════════════════════════════════════════════════════════════
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const MCP = fileURLToPath(new URL("../src/mcp.ts", import.meta.url));
const KAYIT = fileURLToPath(new URL("../../../oz/siniflama/kayit.json", import.meta.url));

/** MCP'ye tek tools/call gönderir, yanıt metnini döndürür (stdin kapanınca süreç biter). */
function mcpAraci(arac: string, args: Record<string, unknown>): string {
  const istekler = [
    { jsonrpc: "2.0", id: 1, method: "initialize", params: {} },
    { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: arac, arguments: args } },
  ].map((x) => JSON.stringify(x)).join("\n") + "\n";
  const ham = execFileSync(process.execPath, [MCP], { input: istekler, encoding: "utf8", timeout: 30_000 });
  const satirlar = ham.trim().split("\n").filter(Boolean);
  const yanit = JSON.parse(satirlar[satirlar.length - 1]) as { result?: { content?: Array<{ text?: string }> } };
  return yanit.result?.content?.map((c) => c.text).join("\n") ?? "";
}
const mcpDenetle = (args: Record<string, unknown>): string => mcpAraci("denetle", args);

test("A11/E2: MCP denetle örtü-farkında — dizin verilince örtü-enum sahte uyarı üretmez", () => {
  const kaynak = 'Etmen( kod: ETM-ORTU, tür: özel_tür, uzmanlık: deneme, yetki: L3, bellek: izole, ne: "örtü fikstürü", uygular: ANY-DENEME )';
  // ① örtüsüz: taban kanon 'özel_tür'ü tanımaz → geçersiz-enum
  const tabansiz = mcpDenetle({ kaynak });
  assert.match(tabansiz, /geçersiz-enum/, tabansiz);
  // ② örtülü çalışma-alanı: ortu.json tür enum'unu genişletir → uyarı SUSAR
  const kok = mkdtempSync(join(tmpdir(), "sarmal-mcp-ortu-"));
  try {
    mkdirSync(join(kok, "oz", "siniflama"), { recursive: true });
    writeFileSync(join(kok, "oz", "siniflama", "ortu.json"),
      JSON.stringify({ semalar: { Etmen: { enum: { "tür": ["özel_tür"] } } } }));
    const ortulu = mcpDenetle({ kaynak, dizin: kok });
    assert.doesNotMatch(ortulu, /geçersiz-enum.*özel_tür/, ortulu);
  } finally {
    rmSync(kok, { recursive: true, force: true });
  }
});

// ── BKM-SNV2-A04: siniflama-yüzü rütbe-atlama uyumu (test-nöbeti) ────────────────────
//   Sınav-2 A1 bulgusu: ajan Adım'ın YALNIZ Katman'a konabileceğini sandı
//   (rütbe-atlamalı sarma yüzeye çıkmıyordu). Nöbet: MCP siniflama{Adım}
//   çıktısı güncel izinliSarma kanonundan AKAR — kanon değişirse test kanonla
//   birlikte yürür, elle liste drift'i imkânsız.

test("A04: siniflama{Adım} konabilirliği izinliSarma kanonundan akar (rütbe-atlama görünür)", () => {
  const kanon = JSON.parse(readFileSync(KAYIT, "utf8")) as { izinliSarma: Record<string, string[]> };
  const beklenen = Object.entries(kanon.izinliSarma)
    .filter(([, cocuklar]) => cocuklar.includes("Adım"))
    .map(([ebeveyn]) => ebeveyn);
  // A1 senaryosu ölü kalsın: rütbe-atlama kanonda YAŞIYOR olmalı (Blok+Faz+Katman)
  for (const e of ["Blok", "Faz", "Katman"]) assert.ok(beklenen.includes(e), `kanonda ${e}→Adım sarması yok`);
  const cikti = mcpAraci("siniflama", { tip: "Adım" });
  const satir = cikti.split("\n").find((s) => s.includes("şuraya konabilir"));
  assert.ok(satir, `siniflama{Adım} 'şuraya konabilir' satırı yok:\n${cikti}`);
  for (const e of beklenen) assert.ok(satir!.includes(e), `konabilir satırı kanondaki "${e}" ebeveynini göstermiyor: ${satir}`);
});

test("A04: siniflama{Adım} şeması koni alanlarını tipleriyle listeler (A5)", () => {
  const cikti = mcpAraci("siniflama", { tip: "Adım" });
  for (const alan of ["görev", "kabul", "sınır", "dokunulmaz", "referans"]) {
    assert.ok(cikti.includes(`"${alan}"`), `siniflama{Adım} şemasında koni alanı "${alan}" görünmüyor:\n${cikti}`);
  }
  // tür haritası: metin/liste ayrımı ajana görünür (kabul liste; görev/sınır
  // NTK-A04 ile birleşik tür — hem tek cümle hem madde listesi geçerli, MIM-1.6)
  assert.match(cikti, /"kabul":\s*"liste"/, cikti);
  assert.match(cikti, /"görev":\s*"metin\|liste"/, cikti);
});

// ── V1B-ROLINDEKS-A01: TIP-1.16 çapraz rol indeksi MCP yüzünde ────────────────
//   Madde rol indekslerinden söz ediyordu ama sicilde rol alanı yoktu; alan
//   kayit.json widgetTipleri[].caprazRoller olarak indi. Nöbet ÜRETİM YOLUNU taze
//   süreçte ölçer: alt-süreç MCP sunucusu kayit.json'u kendisi yükler ve
//   siniflama{Sözleşme} yanıtı hem metin hem yapısal içerikte rol listesi taşır.
test("TIP-1.16: siniflama{Sözleşme} yanıtı yuzey+arkayuz çapraz rollerini taze süreçten döndürür", () => {
  const istekler = [
    { jsonrpc: "2.0", id: 1, method: "initialize", params: {} },
    { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "siniflama", arguments: { tip: "Sözleşme" } } },
  ].map((x) => JSON.stringify(x)).join("\n") + "\n";
  const ham = execFileSync(process.execPath, [MCP], { input: istekler, encoding: "utf8", timeout: 30_000 });
  const satirlar = ham.trim().split("\n").filter(Boolean);
  const yanit = JSON.parse(satirlar[satirlar.length - 1]) as {
    result?: { content?: Array<{ text?: string }>; structuredContent?: { tip?: string; aile?: string; caprazRoller?: string[] } };
  };
  const metin = yanit.result?.content?.map((c) => c.text).join("\n") ?? "";
  assert.ok(metin.includes("çapraz roller (TIP-1.16)"), `metin yüzünde çapraz rol satırı yok:\n${metin}`);
  assert.ok(metin.includes("yuzey") && metin.includes("arkayuz"), `rol satırı iki rolü birden saymalı:\n${metin}`);
  const yapisal = yanit.result?.structuredContent;
  assert.deepEqual(yapisal?.caprazRoller, ["yuzey", "arkayuz"],
    "yapısal içerik Sözleşme için yuzey+arkayuz rol listesini taşımalı");
  assert.equal(yapisal?.aile, "urun", "çok-üyelik ana aileyi değiştirmez — Sözleşme urun ailesinde kalır");
});

// ── ADM-DGS-02: doğuş-eksik — MIM-3 hükmünün tek-dosya yüzü ─────────────────────────
//   Sınav-1 dersi: ajan anadizinsiz tarlaya plan yazdı, tek-dosya denetimi
//   sustu. Nöbet: köksüz plan uyarır; doğuş bağı (Teknoloji/çağır/TAKIM-ref/
//   temel-kök) ya da anadizinli dizin bağlamı varsa SUSAR.

test("DGS-02: köksüz plan kaynağı 'doğuş-eksik' uyarır — bağlı/anadizinli halleri susar", () => {
  const plan = 'Faz( kod: FZ-DGS, ad: "deneme" ) {\n  Adım( kod: ADM-DGS-X, ne: "yalın plan" )\n}\n';
  // ① köksüz kaynak (proje bağlamı yok) → uyarı
  assert.match(mcpDenetle({ kaynak: plan }), /doğuş-eksik/);
  // ② Teknoloji ilanı taşıyan kaynak → susar
  assert.doesNotMatch(mcpDenetle({ kaynak: 'Teknoloji( kod: FLUTTER, ne: "çerçeve" )\n' + plan }), /doğuş-eksik/);
  // ③ çağır köprüsü → susar (anadizine bağlanma niyeti beyanlı)
  assert.doesNotMatch(mcpDenetle({ kaynak: "çağır ANA-KOK\n" + plan }), /doğuş-eksik/);
  // ④ TAKIM-önekli bağımlı referansı → susar
  const takimli = 'Faz( kod: FZ-DGS, ad: "deneme" ) {\n  Adım( kod: ADM-DGS-X, ne: "bağlı plan", bağımlı: [ TAKIM-ONYUZ ] )\n}\n';
  assert.doesNotMatch(mcpDenetle({ kaynak: takimli }), /doğuş-eksik/);
  // ⑤ anadizinli dizin bağlamı (find-up) → susar; proje-denetimi devralır
  const kok = mkdtempSync(join(tmpdir(), "sarmal-dgs-"));
  try {
    writeFileSync(join(kok, "deneme_anadizin.sar"), 'Proje( kod: PRJ-DGS, ad: "d", ne: "deneme kökü" )\n');
    assert.doesNotMatch(mcpDenetle({ kaynak: plan, dizin: kok }), /doğuş-eksik/);
  } finally {
    rmSync(kok, { recursive: true, force: true });
  }
});

// ── IDA dersi (2026-07-14): TEK-DOSYA YANLIŞ-YEŞİL ──────────────────────────
//   Fabrikadaki ajan tek-dosya `denetle` "temiz"ini PROJE-yeşili sandı → ana-yok +
//   17 kayıp-yapı kaçtı, "bitti" dedi. Nöbet: projede temiz tek-dosya sonucu bile
//   `denetle-proje`ye yükseltme uyarısı taşır; projesiz kaynak düz yeşil kalır.
test("IDA-yanlış-yeşil: projede temiz tek-dosya denetimi 'denetle-proje' uyarısı ZORUNLU taşır", () => {
  const kaynak = 'Teknoloji( kod: NEXTJS, ne: "çerçeve" )\n';   // tek-dosya temiz (0 tanı)
  // ① proje bağlamı YOK → düz yeşil, yükseltilecek proje yok → uyarı YOK
  const kokusuz = mcpDenetle({ kaynak });
  assert.doesNotMatch(kokusuz, /denetle-proje/, kokusuz);
  assert.match(kokusuz, /Drift yok/, kokusuz);
  // ② anadizinli dizin bağlamı → TEMİZ OLSA DA proje-yükseltme uyarısı dayatılır (yanlış-yeşil ölür)
  const kok = mkdtempSync(join(tmpdir(), "sarmal-yesil-"));
  try {
    writeFileSync(join(kok, "ida_anadizin.sar"), 'Proje( kod: PRJ-IDA, ad: "ida", ne: "kök" )\n');
    const projede = mcpDenetle({ kaynak, dizin: kok });
    assert.match(projede, /Tek-dosya temiz/, projede);        // clean-path branch
    assert.match(projede, /denetle-proje/, projede);          // yükseltme dayatılıyor
    assert.match(projede, /PROJE-yeşili DEĞİL/, projede);     // yanlış-yeşil açıkça reddediliyor
  } finally {
    rmSync(kok, { recursive: true, force: true });
  }
});

test("SNV3: kurallar bilinmeyen kategoriye yakın-öneri verir (ayraç/harf normalize)", () => {
  const cikti = mcpAraci("kurallar", { kategori: "Dil-" });
  assert.match(cikti, /Şunu mu demek istedin: dil/, cikti);
});

// ── GBR-A04 / #7: iskelet MCP aracı (ilan→scaffold→doldur MCP'de kapanır) ────
//   Founder feedback #7: kayıp-yapı'nın çözümü scaffold ama ajan MCP'den üretemiyordu.
//   Nöbet: önizleme diske DOKUNMAZ · uret:true ilan-edilen eksik yapıyı üretir · sonra TAM.
test("GBR-A04/#7: iskelet — önizleme diske dokunmaz, uret:true ilan-edilen eksik yapıyı üretir", () => {
  const kok = mkdtempSync(join(tmpdir(), "sarmal-iskelet-"));
  try {
    writeFileSync(join(kok, "i_anadizin.sar"),
      'Proje( kod: PRJ-I, ad: "i", ne: "kök" ) {\n  Kitaplık( kod: KTP-A, yol: "app/", ne: "router" )\n}\n');
    // ① ÖNİZLEME (uret yok) → 'app/' eksiği listeler, DİSKE YAZMAZ
    const onizle = mcpAraci("iskelet", { dizin: kok });
    assert.match(onizle, /ÖNİZLEME|Üretilecek/, onizle);
    assert.match(onizle, /app/, onizle);
    assert.ok(!existsSync(join(kok, "app")), "önizleme diske DOKUNMAMALI (güvenli varsayılan)");
    // ② uret:true → 'app/' diskte OLUŞUR
    const uret = mcpAraci("iskelet", { dizin: kok, uret: true });
    assert.match(uret, /ÜRETİLDİ|oluşturuldu/, uret);
    assert.ok(existsSync(join(kok, "app")), "uret:true ilan-edilen 'app/' dizinini üretmeli");
    // ③ tekrar önizleme → artık TAM (üretilecek yeni yok)
    assert.match(mcpAraci("iskelet", { dizin: kok }), /ZATEN TAM|üretilecek yeni yok/i);
  } finally { rmSync(kok, { recursive: true, force: true }); }
});

test("GBR-A04/#7: iskelet giriş dosyası yoksa dürüst ana-yok hatası (üretim yok)", () => {
  const kok = mkdtempSync(join(tmpdir(), "sarmal-iskelet-bos-"));
  try {
    const s = mcpAraci("iskelet", { dizin: kok });
    assert.match(s, /giriş dosyası yok|ana-yok/, s);
  } finally { rmSync(kok, { recursive: true, force: true }); }
});

// ═══ BKM-MCP-A01: 6 araç (denetle-proje · etki · bul · bicimle · prizma · durum-guncelle) ═══

const SARMAL = fileURLToPath(new URL("../src/sarmal.ts", import.meta.url));

/** MCP'ye tek tools/call gönderir; {metin, isError} çifti döndürür (hata-yolu sınamaları için). */
function mcpAraciTam(arac: string, args: Record<string, unknown>): { metin: string; isError: boolean } {
  const istekler = [
    { jsonrpc: "2.0", id: 1, method: "initialize", params: {} },
    { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: arac, arguments: args } },
  ].map((x) => JSON.stringify(x)).join("\n") + "\n";
  const ham = execFileSync(process.execPath, [MCP], { input: istekler, encoding: "utf8", timeout: 60_000 });
  const satirlar = ham.trim().split("\n").filter(Boolean);
  const yanit = JSON.parse(satirlar[satirlar.length - 1]) as { result?: { content?: Array<{ text?: string }>; isError?: boolean } };
  return { metin: yanit.result?.content?.map((c) => c.text).join("\n") ?? "", isError: yanit.result?.isError === true };
}

/** Ortak fikstür: anadizinli mini çalışma-alanı (iki bağımlı Adım'lı plan). */
function fiksturKur(): string {
  const kok = mkdtempSync(join(tmpdir(), "sarmal-mcp6-"));
  writeFileSync(join(kok, "deneme_anadizin.sar"), 'Proje( kod: PRJ-MCP6, ad: "d", ne: "deneme kökü" )\n');
  writeFileSync(join(kok, "plan.sar"), [
    'Faz( kod: FZ-MCP6, ad: "deneme fazı" ) {',
    '  Adım( kod: ADM-MCP6-A, ne: "temel adım", durum: beklemede ) {',
    '    görev: "kavuşum köprüsünü hazırla"',
    '  }',
    '  Adım( kod: ADM-MCP6-B, ne: "bağımlı adım", bağımlı: [ ADM-MCP6-A ] )',
    '}',
    "",
  ].join("\n"));
  return kok;
}

test("MCP-A01: tools/list 18 aracı — ogret (DVR-A04) dahil — bildirir", () => {
  const istekler = [
    { jsonrpc: "2.0", id: 1, method: "initialize", params: {} },
    { jsonrpc: "2.0", id: 2, method: "tools/list" },
  ].map((x) => JSON.stringify(x)).join("\n") + "\n";
  const ham = execFileSync(process.execPath, [MCP], { input: istekler, encoding: "utf8", timeout: 30_000 });
  const yanit = JSON.parse(ham.trim().split("\n").filter(Boolean).pop()!) as { result: { tools: Array<{ name: string }> } };
  const adlar = yanit.result.tools.map((t) => t.name);
  for (const a of ["denetle-proje", "iskelet", "etki", "bul", "bicimle", "prizma", "durum-guncelle", "dogus", "kavram", "karne", "ogret"]) {
    assert.ok(adlar.includes(a), `tools/list '${a}' aracını bildirmiyor: ${adlar.join(" · ")}`);
  }
  assert.equal(adlar.length, 18, `18 araç beklenir, ${adlar.length} bulundu`);
});

test("KVR-A09: kavram aracı — kelime sorgusu kanon eşlemesini, bağlam sorgusu aile önerilerini döndürür", () => {
  const istekler = [
    { jsonrpc: "2.0", id: 1, method: "initialize", params: {} },
    { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "kavram", arguments: { kelime: "kapsayıcı" } } },
    { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "kavram", arguments: { baglam: "Ekran" } } },
    { jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "kavram", arguments: {} } },
  ].map((x) => JSON.stringify(x)).join("\n") + "\n";
  const ham = execFileSync(process.execPath, [MCP], { input: istekler, encoding: "utf8", timeout: 30_000 });
  const satirlar = ham.trim().split("\n").filter(Boolean).map((s) => JSON.parse(s) as {
    id: number; result?: { content: Array<{ text: string }>; isError?: boolean };
  });
  const yanit = (id: number) => satirlar.find((y) => y.id === id)!.result!;
  // kelime → kanon kavramı + Flutter eşlemesi (diskten — OGR-3)
  assert.match(yanit(2).content[0].text, /kapsayıcı/u);
  assert.match(yanit(2).content[0].text, /Container/u);
  // bağlam → aile önerileri (zorlamasız dil + gerçek üye eşlemesi)
  assert.match(yanit(3).content[0].text, /öneri — dayatma değil/u);
  assert.match(yanit(3).content[0].text, /gezinme-ailesi/u);
  assert.match(yanit(3).content[0].text, /MenuAnchor/u);
  // girdisiz çağrı → dürüst hata (kullanım tarifiyle)
  assert.equal(yanit(4).isError, true);
  assert.match(yanit(4).content[0].text, /kelime.*baglam|baglam.*kelime/u);
});

test("MCP-A01: denetle-proje çıktısı CLI `sarmal denetle` ile BİREBİR (tek-kaynak kanıtı)", () => {
  const kok = fiksturKur();
  try {
    let cli: string;
    try {
      cli = execFileSync(process.execPath, [SARMAL, "denetle", kok], { encoding: "utf8", timeout: 60_000 });
    } catch (e) {
      const h = e as { stdout?: string; stderr?: string };
      cli = [h.stdout, h.stderr].filter(Boolean).join("\n");
    }
    const mcp = mcpAraciTam("denetle-proje", { dizin: kok });
    assert.equal(mcp.metin.trimEnd(), cli.trimEnd(), "MCP denetle-proje çıktısı CLI'dan sapıyor — tek-kaynak bozulmuş");
  } finally {
    rmSync(kok, { recursive: true, force: true });
  }
});

test("MCP-A01: etki ileri kapanışı döndürür; bilinmeyen KOD dürüst hata", () => {
  const kok = fiksturKur();
  try {
    const s = mcpAraciTam("etki", { kod: "ADM-MCP6-A", dizin: kok });
    assert.equal(s.isError, false, s.metin);
    assert.match(s.metin, /ADM-MCP6-B/, s.metin);       // B, A'yı bekliyor → etkide görünür
    const yok = mcpAraciTam("etki", { kod: "ADM-YOK", dizin: kok });
    assert.equal(yok.isError, true, yok.metin);
    assert.match(yok.metin, /grafikte yok/, yok.metin);
  } finally {
    rmSync(kok, { recursive: true, force: true });
  }
});

test("MCP-A01: bul KOD/ad/görev alanlarında konumlu eşleşme verir; eşleşmesiz boş ≠ hata", () => {
  const kok = fiksturKur();
  try {
    const gorevle = mcpAraciTam("bul", { metin: "kavuşum köprüsü", dizin: kok });
    assert.equal(gorevle.isError, false, gorevle.metin);
    assert.match(gorevle.metin, /plan\.sar:\d+:\d+.*ADM-MCP6-A.*görev/, gorevle.metin);
    const kodla = mcpAraciTam("bul", { metin: "mcp6-b", dizin: kok });
    assert.match(kodla.metin, /ADM-MCP6-B/, kodla.metin);   // KOD eşleşmesi harf-duyarsız
    const bos = mcpAraciTam("bul", { metin: "böyle-bir-metin-yok", dizin: kok });
    assert.equal(bos.isError, false, bos.metin);
    assert.match(bos.metin, /boş ≠ hata/, bos.metin);
  } finally {
    rmSync(kok, { recursive: true, force: true });
  }
});

test("MCP-A01: bicimle BÇ-standart döndürür ve idempotenttir; dosya YAZMAZ", () => {
  const dagnik = 'Faz( kod: FZ-B, ad: "a" ) {\n        Adım( kod: ADM-B, ne: "b" )   \n}\n';
  const bir = mcpAraciTam("bicimle", { kaynak: dagnik });
  assert.equal(bir.isError, false, bir.metin);
  assert.match(bir.metin, /\n  Adım\( kod: ADM-B/, bir.metin);       // 2 boşluk/kat
  const iki = mcpAraciTam("bicimle", { kaynak: bir.metin });
  assert.equal(iki.metin, bir.metin, "bicimle idempotent değil");
});

test("MCP-A01: prizma dört yüzü döndürür (json ayrıştırılabilir · md belge yüzü); bozuk kaynak dürüst hata", () => {
  const kaynak = 'Adım( kod: ADM-P, ne: "prizma denemesi" )';
  const json = mcpAraciTam("prizma", { kaynak, yuz: "json" });
  assert.equal(json.isError, false, json.metin);
  const yapi = JSON.parse(json.metin) as { kod?: string };
  assert.equal(yapi.kod, "ADM-P");
  for (const yuz of ["yaml", "xml", "md"]) {
    const s = mcpAraciTam("prizma", { kaynak, yuz });
    assert.equal(s.isError, false, `${yuz} yüzü hata verdi: ${s.metin}`);
    assert.ok(s.metin.length > 0, `${yuz} yüzü boş döndü`);
  }
  const bozuk = mcpAraciTam("prizma", { kaynak: "Adım( kod: ", yuz: "json" });
  assert.equal(bozuk.isError, true, bozuk.metin);
  const yanlisYuz = mcpAraciTam("prizma", { kaynak, yuz: "toml" });
  assert.equal(yanlisYuz.isError, true, yanlisYuz.metin);
});

test("MCP-A01: durum-guncelle yalnız Adım.durum'u geçerli enum'a yazar; geçersizde DOKUNMAZ", () => {
  const kok = fiksturKur();
  const plan = join(kok, "plan.sar");
  try {
    // ① geçerli geçiş: beklemede → geliştirmede (dosyada değişir, başka şey değişmez)
    const once = readFileSync(plan, "utf8");
    const s = mcpAraciTam("durum-guncelle", { dizin: kok, kod: "ADM-MCP6-A", durum: "geliştirmede" });
    assert.equal(s.isError, false, s.metin);
    const sonra = readFileSync(plan, "utf8");
    assert.match(sonra, /ADM-MCP6-A[^)]*durum: geliştirmede/, "durum dosyaya yazılmadı");
    assert.equal(sonra.replace("geliştirmede", "beklemede"), once, "durum dışında bir şey değişti — DAR SINIR ihlali");
    // ② geçersiz enum: dürüst hata + dosyaya dokunulmaz
    const gecersiz = mcpAraciTam("durum-guncelle", { dizin: kok, kod: "ADM-MCP6-A", durum: "bitti" });
    assert.equal(gecersiz.isError, true, gecersiz.metin);
    assert.match(gecersiz.metin, /Geçersiz durum/, gecersiz.metin);
    assert.equal(readFileSync(plan, "utf8"), sonra, "geçersiz enum'da dosyaya dokunuldu");
    // ③ bilinmeyen Adım: dürüst hata + dosyaya dokunulmaz
    const yok = mcpAraciTam("durum-guncelle", { dizin: kok, kod: "ADM-YOK", durum: "tamamlandı" });
    assert.equal(yok.isError, true, yok.metin);
    assert.equal(readFileSync(plan, "utf8"), sonra, "bilinmeyen Adım'da dosyaya dokunuldu");
  } finally {
    rmSync(kok, { recursive: true, force: true });
  }
});

// ── RF-T6-A03: kural↔kapı haritası MOTORDAN türetilir (elle rapor emekli) ────
test("RF-T6-A03: MCP kurallar (kategorisiz) kural↔kapı haritasını türetir — tanı bağları görünür", () => {
  const cikti = mcpAraci("kurallar", {});
  assert.match(cikti, /KURAL↔KAPI HARİTASI \(motordan türetildi/, "harita bölümü yok");
  assert.match(cikti, /YUZ-4\.1 → düşük-kontrast · geçersiz-renk · ham-renk/, "YUZ-4.1 tanı bağı haritada görünmeli (renk kanunu)");
  assert.match(cikti, /DIL-3\.1 → izinsiz-sarma · kenar-metin/, "DIL-3.1 bağı haritada görünmeli (izinli sarma)");
  const es = /Bağlı: (\d+)\/(\d+) kural/.exec(cikti);
  assert.ok(es && Number(es[1]) >= 20, `en az 20 kural bağlı olmalı (enforcement 🟢 aktarımı): ${es?.[0]}`);
});

// ── HTR-A05 (IDA dogfood oturum-2 · DOC-3): oz-ailesi dosya-kökü serbest gösterim ──
test("HTR-A05: siniflama{Hatırlatıcı} 'dosya kökünde serbest yerleşir' der (kök-serbest yanılgısı bitti)", () => {
  const cikti = mcpAraci("siniflama", { tip: "Hatırlatıcı" });
  const satir = cikti.split("\n").find((s) => s.includes("şuraya konabilir"));
  assert.ok(satir, `'şuraya konabilir' satırı yok:\n${cikti}`);
  assert.match(satir!, /dosya kökünde SERBEST|oz ailesi/, `oz-ailesi kök-serbest mesajı yok: ${satir}`);
  assert.doesNotMatch(satir!, /izinliSarma değeri değil/, "eski yanıltıcı mesaj kalmamalı");
});

test("HTR-A05: DurumKaydı (diğer oz-tipi) da dosya-kökü serbest mesajını alır", () => {
  const satir = mcpAraci("siniflama", { tip: "DurumKaydı" }).split("\n").find((s) => s.includes("şuraya konabilir"));
  assert.match(satir ?? "", /dosya kökünde SERBEST|oz ailesi/);
});

test("HTR-A05: temel-aile kök (ÇalışmaAlanı · konabilir boş) 'proje/dosya kökü' der; konabilir'i olan tip eski davranış", () => {
  const cal = mcpAraci("siniflama", { tip: "ÇalışmaAlanı" }).split("\n").find((s) => s.includes("şuraya konabilir"));
  assert.match(cal ?? "", /proje\/dosya KÖKÜ|kök widget/, "temel-aile kök mesajı");
  // konabilir'i dolu olan tip (Adım) eski davranışı korur (regresyon yok — kök-serbest mesajı ALMAZ)
  const adim = mcpAraci("siniflama", { tip: "Adım" }).split("\n").find((s) => s.includes("şuraya konabilir"));
  assert.doesNotMatch(adim ?? "", /dosya kökünde SERBEST/, "konabilir'i olan tip kök-serbest mesajı ALMAZ");
});

// ── DVR-A04 (OGR-2.2): ogret aracı — beceri dağıtım kapısı ─────────────────────
test("DVR-A04: konusuz ogret karşılama kartını döndürür (CLI ile aynı kaynak — YUZ-1)", () => {
  const m = mcpAraci("ogret", {});
  assert.match(m, /SARMAL KARŞILAMA KARTI/);
  assert.match(m, /Proje\( kod: PRJ-ILK/, "kopyalanabilir minimal örnek kartta");
});

test("DVR-A04: konulu ogret eşleşen Beceri kartının TAM metnini döndürür; eşleşmeyen konu kart listesiyle hata verir", () => {
  const kart = mcpAraci("ogret", { konu: "uretir-kenari" });
  assert.match(kart, /BCR-URETIR-KENARI/, "kart tam metniyle döner");
  assert.match(kart, /antiDesen/, "kartın şema gövdesi eksiksiz");
  const kod = mcpAraci("ogret", { konu: "BCR-DURUM-AKISI" });
  assert.match(kod, /durum_akisi_becerisi/, "BCR koduyla da eşleşir");
  const yok = mcpAraci("ogret", { konu: "boyle-bir-konu-yok" });
  assert.match(yok, /eşleşen beceri kartı bulunamadı/);
  assert.match(yok, /Mevcut kartlar/, "hata yolu mevcut kartları sayar (koridor, labirent değil)");
});

// ── ADM-STD-MCP-DIKSIYON (OGR-2.1 + YAS-3.4): araç hataları yol gösterir ────────
test("MCP-DIKSIYON: denetle'ye DİZİN verilince ham EISDIR yerine denetle-proje önerisi döner", () => {
  const cikti = mcpDenetle({ yol: "." });   // '.' bir dizindir → EISDIR yolu
  assert.ok(cikti.includes("denetle-proje"), `öneri yok:\n${cikti}`);
  assert.ok(cikti.includes("DİZİN"), "hata dizin durumunu açıkça söylemeli");
  assert.ok(!cikti.includes("EISDIR"), "ham hata kodu kullanıcı yüzüne sızmamalı");
});
test("MCP-DIKSIYON: sef Adım kodu olmadan çağrılınca kullanım örneği içeren hata döner", () => {
  const cikti = mcpAraci("sef", { dizin: "." });
  assert.ok(cikti.includes("kullanım: sef("), `kullanım örneği yok:\n${cikti}`);
  assert.ok(cikti.includes("denetle-proje") || cikti.includes("gezin"), "sonraki adım (açık Adımları bulma) önerilmeli");
});

// ═══ GOC-A10 (Founder 2026-08-23): dogus aracı türü sorar — tur verilmezse YAZMAZ ═══
test("GOC-A10: dogus aracı — tur verilmezse soruyu döndürür ve dosya yazmaz; calisma-alani çatı doğurur; geçersiz tür hata döner", () => {
  const kok = mkdtempSync(join(tmpdir(), "sarmal-mcp-dogus-"));
  try {
    const soru = mcpAraciTam("dogus", { hedef: join(kok, "a") });
    assert.equal(soru.isError, false);
    assert.match(soru.metin, /Ne doğsun\?/u, "tür verilmeyince soru döner");
    assert.match(soru.metin, /Hiçbir dosya yazılmadı/u);
    assert.equal(existsSync(join(kok, "a")), false, "soru turunda hedef dizin bile açılmaz");
    const cati = mcpAraciTam("dogus", { hedef: join(kok, "b"), tur: "calisma-alani", ad: "çatı", proje: "ilk" });
    assert.equal(cati.isError, false, cati.metin);
    assert.match(cati.metin, /çalışma alanı "çatı"/u);
    assert.ok(existsSync(join(kok, "b", "çatı_anadizin.sar")), "çatı ilanı kökte doğar");
    assert.ok(existsSync(join(kok, "b", "ilk", "ilk_anadizin.sar")), "ilk proje kendi kökünde doğar");
    const tek = mcpAraciTam("dogus", { hedef: join(kok, "c"), tur: "proje", ad: "tekil" });
    assert.equal(tek.isError, false, tek.metin);
    assert.ok(existsSync(join(kok, "c", "tekil_anadizin.sar")));
    const bozuk = mcpAraciTam("dogus", { hedef: join(kok, "d"), tur: "bahçe" });
    assert.equal(bozuk.isError, true);
    assert.match(bozuk.metin, /tur yalnız "proje" ya da "calisma-alani"/u);
  } finally {
    rmSync(kok, { recursive: true, force: true });
  }
});

// ── EKL-F10-A12 · bul aracı dört geribildirim kanalının metnini de arar ────────
test("EKL-F10-A12: bul aracı takdir metnini bulur ve eşleşen alanı kanal adıyla raporlar", () => {
  const kok = mkdtempSync(join(tmpdir(), "sarmal-mcp-geribildirim-"));
  writeFileSync(join(kok, "deneme_anadizin.sar"), 'Proje( kod: PRJ-GB, ad: "d", ne: "deneme kökü" )\n');
  writeFileSync(join(kok, "plan.sar"), [
    'Faz( kod: FZ-GB, ad: "geribildirim fazı" ) {',
    '  Adım( kod: ADM-GB-A, ne: "ölçüm merceği", durum: tamamlandı, takdir: "Tebrikler, harika işçilik çıkarmışsınız" )',
    '}',
    "",
  ].join("\n"));
  const s = mcpAraciTam("bul", { dizin: kok, metin: "harika işçilik" });
  assert.equal(s.isError, false, s.metin);
  assert.match(s.metin, /\[Adım ADM-GB-A\] takdir: Tebrikler, harika işçilik/, s.metin);
  const yok = mcpAraciTam("bul", { dizin: kok, metin: "hiç geçmeyen ifade" });
  assert.match(yok.metin, /geribildirim alanında geçmiyor/, yok.metin);
});

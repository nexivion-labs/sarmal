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
// ═══════════════════════════════════════════════════════════════════════════

import { test, after } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { etkinlestir, geciciAlan, type EtkinEklenti } from "./etkinlesme-kabugu.ts";

const yol = (g: string): string => fileURLToPath(new URL(g, import.meta.url));
const PAKET = JSON.parse(readFileSync(yol("../package.json"), "utf8")) as {
  capabilities?: { untrustedWorkspaces?: { supported?: unknown; description?: string } };
  contributes: {
    languages: Array<{ id: string; extensions?: string[] }>;
    grammars: Array<{ language: string; path: string }>;
    configurationDefaults: Record<string, Record<string, unknown>>;
    views: Record<string, Array<{ id: string; when?: string }>>;
    commands: Array<{ command: string }>;
  };
};
const NLS = {
  tr: JSON.parse(readFileSync(yol("../package.nls.tr.json"), "utf8")) as Record<string, string>,
  en: JSON.parse(readFileSync(yol("../package.nls.json"), "utf8")) as Record<string, string>,
};
const GUVEN_KOMUTU = "workbench.trust.manage";
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

test("MGZ-A02: Sarmal panelleri güvene bağlıdır; kısıtlı modda sağlayıcısız görünüm açılmaz", () => {
  const gorunumler = PAKET.contributes.views["sarmal-yol"] ?? [];
  assert.ok(gorunumler.length > 0, "görünüm kabı boş — nöbet boş küme üstünde koşar");
  for (const g of gorunumler) {
    const parcalar = (g.when ?? "").split("&&").map((p) => p.trim());
    assert.ok(parcalar.includes("isWorkspaceTrusted"),
      `${g.id} güvene bağlı değil (koşul: ${g.when ?? "yok"}) — kısıtlı modda sağlayıcısız açılır ve bozuk görünür`);
  }
});

// ── ② DAVRANIŞ: gerçek giriş sahte editörde ─────────────────────────────────

const acik: EtkinEklenti[] = [];
after(() => { for (const e of acik.splice(0)) e.kapat(); });

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

// ═══════════════════════════════════════════════════════════════════════════
// kanon-kesfi.test.ts — 🧭 EKL-F6-A04 nöbetleri: ilandan keşif ve sessiz düşüşün sonu
//
//   Founder canlı gözlemi 2026-08-21: yeni ve boş bir çalışma alanında açılan
//   bir kanon dosyası alışılmış görüntüyü vermedi. Üç kusurdan biri, tip sistemi
//   kaydının SABİT `_Sarmal` klasör adıyla aranmasıydı; ad tutmayınca eklenti
//   sessizce gömülü taban kanona düşüyordu.
//
//   Bu dosya metin avlamaz, DAVRANIŞ ölçer. Diskte gerçek fikstür ağaçları
//   kurulur, keşif çekirdeği onlara karşı koşturulur ve eklentinin kanon
//   çözümleyicisi sahte bir yürütücüye paketlenip gerçekten çalıştırılır.
// ═══════════════════════════════════════════════════════════════════════════
import { test } from "node:test";
import assert from "node:assert/strict";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import esbuild from "esbuild";
import { VARSAYILAN } from "../arac/renk-uret.mjs";
import { ilanliVarliklar, varlikDosyasiBul, varlikKokuBul, yazimKokuBul } from "../src/kanon-kesif.ts";

const yol = (u: string): string => fileURLToPath(new URL(u, import.meta.url));
const KOK = dirname(yol("../package.json"));
const GERCEK_KAYIT = yol("../../../oz/siniflama/kayit.json");
const KAYIT_GORELI = join("oz", "siniflama", "kayit.json");

/** Bir varlık kökü kurar: ilan dosyası, istenirse kanon kaydı ve bir belge. */
function varlikKur(kok: string, ad: string, secenek: { kanon?: boolean; ogrenme?: boolean } = {}): string {
  const dizin = join(kok, ad);
  mkdirSync(dizin, { recursive: true });
  writeFileSync(join(dizin, `${ad}_anadizin.sar`),
    `ÇalışmaAlanı( kod: ${ad.toUpperCase()}, ad: "${ad}" )\n`, "utf8");
  if (secenek.kanon) {
    mkdirSync(join(dizin, "oz", "siniflama"), { recursive: true });
    copyFileSync(GERCEK_KAYIT, join(dizin, KAYIT_GORELI));
  }
  if (secenek.ogrenme) mkdirSync(join(dizin, "ogrenme"), { recursive: true });
  return dizin;
}

function gecici(onek: string): string {
  return realpathSync(mkdtempSync(join(tmpdir(), onek)));
}

// ── 1) İLANDAN KEŞİF: klasörün adı hiçbir şey ilan etmez ────────────────────

test("A04: varlık kökü klasör adından DEĞİL, *_anadizin.sar ilanından bulunur", () => {
  const alan = gecici("sarmal-kesif-");
  const varlik = varlikKur(alan, "kurumsal_urun", { kanon: true });
  const belgeDizin = join(varlik, "plan", "derin", "daha-derin");
  mkdirSync(belgeDizin, { recursive: true });

  assert.equal(varlikKokuBul(belgeDizin), varlik,
    "ilanı taşıyan dizin varlık kökü sayılmalı — ad `_Sarmal` olmadığı için kök bulunamıyorsa keşif hâlâ ada bağlıdır");
  assert.equal(varlikKokuBul(alan), undefined,
    "ilansız dizin kök ilan edilemez; kök uydurmak sessiz düşüşten daha kötüdür");
});

test("A04: kanon kaydı, adı `_Sarmal` olmayan bir varlık kökünde bulunur", () => {
  const alan = gecici("sarmal-kesif-");
  const varlik = varlikKur(alan, "kurumsal_urun", { kanon: true });
  // Belge varlığın DIŞINDA: yukarı yürüyüş kaydı bulamaz, ilan taraması bulmalı.
  const disBelge = join(alan, "belgeler");
  mkdirSync(disBelge, { recursive: true });

  assert.equal(varlikDosyasiBul(varlik, KAYIT_GORELI, [alan]), join(varlik, KAYIT_GORELI),
    "kayıt varlığın kendi ağacında bulunmalı");
  assert.equal(varlikDosyasiBul(disBelge, KAYIT_GORELI, [alan]), join(varlik, KAYIT_GORELI),
    "kayıt, çalışma alanında ilan edilmiş varlıktan okunmalı — bulunamazsa eklenti taban kanona düşer");
});

test("A04: iki aday varsa İLAN EDİLMİŞ olan kazanır; ilansız klasör yalnız son çaredir", () => {
  const alan = gecici("sarmal-kesif-");
  // Alfabetik olarak önce gelen ilansız klasör de kanon taşıyor.
  const ilansiz = join(alan, "aaa_ilansiz");
  mkdirSync(join(ilansiz, "oz", "siniflama"), { recursive: true });
  copyFileSync(GERCEK_KAYIT, join(ilansiz, KAYIT_GORELI));
  const ilanli = varlikKur(alan, "zzz_ilanli", { kanon: true });
  const disBelge = join(alan, "belgeler");
  mkdirSync(disBelge, { recursive: true });

  assert.deepEqual(ilanliVarliklar(alan), [ilanli], "ilan listesi yalnız ilan taşıyan klasörü vermeli");
  assert.equal(varlikDosyasiBul(disBelge, KAYIT_GORELI, [alan]), join(ilanli, KAYIT_GORELI),
    "ilan edilmiş varlık, alfabetik olarak önce gelen ilansız klasöre yenilmemeli");
});

test("A04 GERİYE DÖNÜK UYUM: ilanını yazmamış bir depo da kanonsuz bırakılmaz", () => {
  const alan = gecici("sarmal-kesif-");
  const eski = join(alan, "_Sarmal");
  mkdirSync(join(eski, "oz", "siniflama"), { recursive: true });
  copyFileSync(GERCEK_KAYIT, join(eski, KAYIT_GORELI));
  const disBelge = join(alan, "belgeler");
  mkdirSync(disBelge, { recursive: true });

  assert.equal(varlikDosyasiBul(disBelge, KAYIT_GORELI, [alan]), join(eski, KAYIT_GORELI),
    "bugünkü tek depo düzeni çalışmaya devam etmeli — onarım geriye dönük uyumu bozamaz");
});

test("A04: geribildirim hasadının hedefi de ilandan bulunur (takdir.ts sabit yolunun yerine)", () => {
  const alan = gecici("sarmal-kesif-");
  varlikKur(alan, "birinci_varlik");
  const ogrenmeli = varlikKur(alan, "ikinci_varlik", { ogrenme: true });

  assert.equal(yazimKokuBul(undefined, [alan], "ogrenme"), ogrenmeli,
    "hedef klasörü zaten olan varlık seçilmeli — hasat var olmayan bir yola yazılamaz");
  const belgeDizin = join(alan, "birinci_varlik", "plan");
  mkdirSync(belgeDizin, { recursive: true });
  assert.equal(yazimKokuBul(belgeDizin, [alan], "ogrenme"), join(alan, "birinci_varlik"),
    "açık belgenin kendi varlığı her zaman önce gelir — hasat başka varlığa taşmaz");
});

// ── 2) SESSİZ DÜŞÜŞ YASAK: kanon yoksa kullanıcıya SÖYLENİR ────────────────
//
//   Nöbet metin avı değildir: `ortak.ts` ve `taban-kanon.ts` sahte bir
//   yürütücüyle paketlenir ve GERÇEKTEN koşturulur; durum çubuğuna giden her
//   çağrı sayılır. `snfBul` düşüş dalında işareti vermeyi bırakırsa bu sınama
//   kırmızıya döner (mutasyon kanıtı).

const gerek = createRequire(import.meta.url);

const PAKETLENMIS = (() => {
  const dizin = mkdtempSync(join(tmpdir(), "sarmal-kanon-kesfi-"));
  const sahteYol = join(dizin, "sahte-vscode.cjs");
  writeFileSync(sahteYol, "module.exports = globalThis.__SARMAL_SAHTE_VSCODE__;\n");
  const giris = join(dizin, "giris.ts");
  writeFileSync(giris,
    `export { snfBul, rozetRenkleri } from ${JSON.stringify(join(KOK, "src", "ortak.ts"))};\n` +
    `export { TabanKanonCubugu, tabanKanonDurumu, tabanKanonSifirla } from ${JSON.stringify(join(KOK, "src", "taban-kanon.ts"))};\n` +
    `export { yuzeyDiliniAyarla } from ${JSON.stringify(join(KOK, "src", "yuzey-metinleri.ts"))};\n`);
  const cikti = join(dizin, "kanon-kesfi.cjs");
  esbuild.buildSync({
    entryPoints: [giris],
    bundle: true, format: "cjs", platform: "node", outfile: cikti,
    alias: { vscode: sahteYol }, logLevel: "silent",
  });
  return realpathSync(cikti);
})();

interface CubukKaydi { metin?: string; ipucu?: string; gorunur: boolean; gizlendi: number; gosterildi: number }

function sahteYurutucu(koklar: string[]): { cubuk: CubukKaydi; vscode: unknown } {
  const cubuk: CubukKaydi = { gorunur: false, gizlendi: 0, gosterildi: 0 };
  const vscode = {
    StatusBarAlignment: { Left: 1, Right: 2 },
    ThemeColor: class { id: string; constructor(id: string) { this.id = id; } },
    window: {
      createStatusBarItem: () => ({
        set text(v: string) { cubuk.metin = v; },
        set tooltip(v: string) { cubuk.ipucu = v; },
        set backgroundColor(_v: unknown) { /* renk kaydı ölçülmez */ },
        show(): void { cubuk.gorunur = true; cubuk.gosterildi += 1; },
        hide(): void { cubuk.gorunur = false; cubuk.gizlendi += 1; },
        dispose(): void {},
      }),
    },
    workspace: {
      workspaceFolders: koklar.map((k, index) => ({ name: `alan${index}`, index, uri: { fsPath: k } })),
    },
    Uri: { joinPath: (...p: unknown[]) => p },
  };
  return { cubuk, vscode };
}

interface KanonModulu {
  snfBul(doc: { uri: { fsPath: string } }): unknown;
  rozetRenkleri(): Record<string, string>;
  TabanKanonCubugu: new () => { dispose(): void };
  tabanKanonDurumu(): { düşüldü: boolean; belge?: string };
  tabanKanonSifirla(): void;
  yuzeyDiliniAyarla(dil: string): void;
}

function kanonModulu(vscode: unknown): KanonModulu {
  (globalThis as Record<string, unknown>).__SARMAL_SAHTE_VSCODE__ = vscode;
  delete gerek.cache[PAKETLENMIS];
  const modul = gerek(PAKETLENMIS) as KanonModulu;
  modul.yuzeyDiliniAyarla("tr");
  modul.tabanKanonSifirla();
  return modul;
}

test("A04 DAVRANIŞ: kanon bulunamayınca taban kanona düşüldüğü SÖYLENİR (sessiz düşüş yasak)", () => {
  const alan = gecici("sarmal-kanonsuz-");
  const belge = join(alan, "bos.sar");
  writeFileSync(belge, "Faz( kod: F1, ad: \"deneme\" )\n", "utf8");

  const { cubuk, vscode } = sahteYurutucu([alan]);
  const modul = kanonModulu(vscode);
  const isaret = new modul.TabanKanonCubugu();
  assert.equal(cubuk.gorunur, false, "kanon henüz sorulmadan işaret görünmemeli");

  assert.ok(modul.snfBul({ uri: { fsPath: belge } }), "gömülü taban kanon yine de dönmeli — kör kalmak onarım değildir");
  assert.equal(modul.tabanKanonDurumu().düşüldü, true, "düşüş kaydedilmedi — kullanıcı hangi kanonla çalıştığını bilemez");
  assert.equal(cubuk.gorunur, true, "durum çubuğu işareti gösterilmedi — düşüş SESSİZ kaldı");
  assert.match(String(cubuk.metin), /Sarmal/, "işaret hangi araca ait olduğunu söylemeli");
  assert.match(String(cubuk.ipucu), /anadizin/, "ipucu çözümü söylemeli: ilan edilmiş bir varlık kökü");
  assert.match(String(cubuk.ipucu), /bulunamadı/, "ipucu sebebi tam cümleyle söylemeli");
  isaret.dispose();
});

test("A04 DAVRANIŞ: kanon ilandan bulununca işaret kalkar ve gömülü kanona düşülmez", () => {
  const alan = gecici("sarmal-kanonlu-");
  const varlik = varlikKur(alan, "kurumsal_urun", { kanon: true });
  const belge = join(varlik, "plan", "is.sar");
  mkdirSync(dirname(belge), { recursive: true });
  writeFileSync(belge, "Faz( kod: F1, ad: \"deneme\" )\n", "utf8");

  const { cubuk, vscode } = sahteYurutucu([alan]);
  const modul = kanonModulu(vscode);
  const isaret = new modul.TabanKanonCubugu();
  assert.ok(modul.snfBul({ uri: { fsPath: belge } }));
  assert.equal(modul.tabanKanonDurumu().düşüldü, false,
    "kayıt ilan edilmiş varlık kökünde duruyorken taban kanona düşülmemeli");
  assert.equal(cubuk.gorunur, false, "kanon bulunduğunda işaret görünmemeli");
  isaret.dispose();
});

test("A04 DAVRANIŞ: rozet renkleri de ilandan okunur — sabit `_Sarmal` adı sökülmüştür", () => {
  const alan = gecici("sarmal-rozet-");
  const varlik = varlikKur(alan, "kurumsal_urun", { kanon: true });
  const kanon = JSON.parse(readFileSync(join(varlik, KAYIT_GORELI), "utf8")).renkPaleti.driftRozetleri;

  const { vscode } = sahteYurutucu([alan]);
  const modul = kanonModulu(vscode);
  assert.equal(modul.rozetRenkleri().hata, kanon.hata,
    "rozet renkleri `_Sarmal` adı olmayan bir varlıktan okunamadı — eski sabit yol geri gelmiş olabilir");
});

// ── 3) KULLANICI AYARI ÜSTÜNDÜR: varsayılan yalnız susanı konuşturur ────────

test("A04: BİÇİM varsayılanı ilan yoluyla gelir — aktivasyonda ayar yazılmaz", () => {
  const paket = JSON.parse(readFileSync(yol("../package.json"), "utf8"));
  const vars = paket.contributes.configurationDefaults;
  // ⚖️ Founder 2026-08-22: RENK bu ilanla taşınmaz ve taşınamaz; ilan boyayıcıya
  // ulaşmadığı iki kez ölçülmüştür. Ayrıntılı gerekçe ve nöbeti: renk-yolu.test.ts.
  // BİÇİM ise dil kapsamlı bir editör ayarıdır ve bu ilanla gerçekten çalışır.
  assert.equal(vars["editor.tokenColorCustomizations"], undefined,
    "paket yeniden dizgi rengi ilan ediyor — çalışmadığı hâlde çalışıyormuş gibi duran bir beyandır");
  assert.equal(vars["[sarmal]"]["editor.wordWrap"], "bounded");
  assert.equal(vars["[sarmal]"]["editor.wordWrapColumn"], 110);
  assert.equal(vars["[sarmal]"]["editor.wrappingIndent"], "deepIndent");
  assert.equal(vars["[sarmal]"]["editor.guides.indentation"], false,
    "VS Code'un kendi girinti kılavuzu açık kalırsa Sarmal'ın kendi çizgisiyle üst üste biner (çift çizgi)");
});

test("A04: her tablo TEK YERDE yaşar — biçim pakette, renk depo tercihinde", () => {
  // Renk tabloları bilinçli olarak depoda yaşar, çünkü paket hiçbir renk ilanı
  // taşımaz (hüküm 2026-08-24: renk dayatılmaz — bkz. renk-yolu.test.ts);
  // biçim tercihleri ise pakette yaşar ve depoda ikizlenmez, çünkü aynı olgunun
  // iki kaydı zamanla sessizce ayrışır (YUZ-1.2).
  const ayar = JSON.parse(readFileSync(VARSAYILAN.AYAR!, "utf8"));
  assert.ok(ayar["editor.semanticTokenColorCustomizations"]?.rules,
    "anlamsal renkler depo tercihinden de kalkmış — paket bu ilanı artık taşımadığı için "
    + "Founder'ın alıştığı görünüm bu depoda temasız kalır");
  assert.equal(ayar["[sarmal]"], undefined,
    "biçim tercihleri hem depoda hem pakette — mağazadan kuran kullanıcının gördüğü biçim depo ikiziyle ayrışabilir");
});

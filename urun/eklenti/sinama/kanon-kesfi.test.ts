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
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import esbuild from "esbuild";
import { VARSAYILAN, uret } from "../arac/renk-uret.mjs";
import {
  PAKET_KANON_DIZINI, hasatHedefiBul, ilanliVarliklar, isaretciPlani, isaretciYaz, ortamDegiskenleriniCoz,
  surumeBagliEklentiYolu, tamDenetimKanonuBul, tamDenetimKokTuru, varlikDosyasiBul, varlikKokuBul, yazimKokuBul,
} from "../src/kanon-kesif.ts";
import { dogusYaz } from "../../cekirdek/src/dogus.ts";
import { denetimKos } from "../../cekirdek/src/denetim.ts";
import { panelCaprazUreticiKumesi } from "../../cekirdek/src/kapi-kapsami.ts";
import { siniflamaYukle } from "../../cekirdek/src/siniflama.ts";

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
  // EKL-F6-A10: hedefi taşıma sorusu artık bir sorgudur; burada fikstürün kendi ölçüsü verilir.
  const tasir = (k: string): boolean => existsSync(join(k, "ogrenme"));

  assert.equal(yazimKokuBul(undefined, [alan], tasir), ogrenmeli,
    "hedefi taşıyan varlık seçilmeli — hasat var olmayan bir yola yazılamaz");
  const belgeDizin = join(alan, "birinci_varlik", "plan");
  mkdirSync(belgeDizin, { recursive: true });
  assert.equal(yazimKokuBul(belgeDizin, [alan], tasir), join(alan, "birinci_varlik"),
    "açık belgenin kendi varlığı her zaman önce gelir — hasat başka varlığa taşmaz");
});

// ── 1b) EKL-F6-A10 · HASAT İLAN EDİLEN RAFA YAZAR ─────────────────────────
//
//   Ölçülmüş kusur: hasat yolu `<kök>/ogrenme/geribildirim.sar` diye sabit
//   kuruluyordu, oysa doğuş paketi öğrenme rafını öğreti kitaplığının içinde
//   ilan eder. Nöbet GERÇEK bir doğuş ağacında koşar: hedef ilandan çözülür,
//   hasat komutunun yaptığı gibi o hedefe yazılır ve ağacın tam denetimi koşturulur.
//   Mutasyon kanıtı (2026-09-15 koşusu; yedekten bayt özdeş geri alındı): hedef
//   çözümü eski sabit yola döndürüldüğünde iki sınama da düştü; birincisi yol
//   farkını ve kökte doğan `beyansız-yapı` tanısını, ikincisi rafsız ağaçta
//   uydurulan hedefi yakaladı.

const GERCEK_SNF = siniflamaYukle(GERCEK_KAYIT);

test("EKL-F6-A10: hasat doğuş ağacının ilan ettiği öğrenme rafına yazar ve beyansız klasör doğurmaz", () => {
  const kok = gecici("sarmal-hasat-");
  dogusYaz(kok, "deneme", "2026-09-15", "proje");
  const hedef = hasatHedefiBul(undefined, [kok], () => GERCEK_SNF);
  assert.ok(hedef, "hasat hedefi bulunamadı — komut hiçbir şey yazmadan sessizce dönerdi");
  assert.equal(hedef.goreli, "ogreti/ogrenme/geribildirim.sar",
    "hasat ilan edilen rafa değil başka bir yola gidiyor");
  assert.equal(hedef.dosya, join(kok, "ogreti", "ogrenme", "geribildirim.sar"));
  assert.ok(existsSync(hedef.dosya), "doğuşun yazdığı geribildirim dosyası hedefte değil");
  assert.equal(hasatHedefiBul(join(kok, "is", "plan"), [kok], () => GERCEK_SNF)?.dosya, hedef.dosya,
    "açık belge ağacın içindeyken hedef değişmemeli");

  // Hasat komutunun yazımı: hedefin klasörü yoksa doğar, dosya yazılır.
  mkdirSync(dirname(hedef.dosya), { recursive: true });
  writeFileSync(hedef.dosya, "// hasat sınaması\n", "utf8");
  const sonuc = denetimKos(kok, { snfYol: GERCEK_KAYIT, bugun: "2026-09-15", tamListe: true });
  const beyansiz = sonuc.akis.flatMap((r) => r.tanilar).filter((t) => t.kod === "beyansız-yapı");
  assert.equal(beyansiz.length, 0, `hasat beyansız klasör doğurdu: ${beyansiz.map((t) => t.mesaj).join(" | ")}`);
  assert.equal(existsSync(join(kok, "ogrenme")), false, "kökün altında ilan edilmemiş ogrenme/ klasörü doğdu");
});

test("EKL-F6-A10: öğrenme rafı ilan edilmemişse hasat hedefi yoktur ve klasör uydurulmaz", () => {
  const alan = gecici("sarmal-hasat-rafsiz-");
  const varlik = varlikKur(alan, "rafsiz_varlik");
  assert.equal(hasatHedefiBul(varlik, [alan], () => GERCEK_SNF), undefined,
    "raf ilan edilmemişken hedef uyduruldu — hasat beyansız bir klasör doğururdu");
  assert.equal(hasatHedefiBul(undefined, [alan], () => GERCEK_SNF), undefined);
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
    `export { KANON_ISARETCISI_KOMUTU, TabanKanonCubugu, tabanKanonDurumu, tabanKanonSifirla, tamDenetimSonucu } from ${JSON.stringify(join(KOK, "src", "taban-kanon.ts"))};\n` +
    `export { KANON_ISARETCISI_METINLERI, TABAN_KANON_METINLERI, yuzeyDiliniAyarla } from ${JSON.stringify(join(KOK, "src", "yuzey-metinleri.ts"))};\n`);
  const cikti = join(dizin, "kanon-kesfi.cjs");
  esbuild.buildSync({
    entryPoints: [giris],
    bundle: true, format: "cjs", platform: "node", outfile: cikti,
    alias: { vscode: sahteYol }, logLevel: "silent",
  });
  return realpathSync(cikti);
})();

interface CubukKaydi { metin?: string; ipucu?: string; komut?: string; gorunur: boolean; gizlendi: number; gosterildi: number }

function sahteYurutucu(koklar: string[]): { cubuk: CubukKaydi; vscode: unknown } {
  const cubuk: CubukKaydi = { gorunur: false, gizlendi: 0, gosterildi: 0 };
  const vscode = {
    StatusBarAlignment: { Left: 1, Right: 2 },
    ThemeColor: class { id: string; constructor(id: string) { this.id = id; } },
    window: {
      createStatusBarItem: () => ({
        set text(v: string) { cubuk.metin = v; },
        set tooltip(v: string) { cubuk.ipucu = v; },
        set command(v: string) { cubuk.komut = v; },
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
  tabanKanonDurumu(): { düşüldü: boolean; belge?: string; atlanan: readonly string[]; coken: readonly { kok: string; hata: string }[] };
  tabanKanonSifirla(): void;
  tamDenetimSonucu(olculen: readonly string[], atlanan: readonly string[], tamTur: boolean,
    coken?: readonly { kok: string; hata: string }[]): void;
  KANON_ISARETCISI_KOMUTU: string;
  TABAN_KANON_METINLERI: {
    cubukIpucu(belge?: string): string;
    atlandiIpucu(kokler: readonly string[]): string;
    coktuIpucu(coken: readonly { kok: string; hata: string }[], sonucuAtla?: boolean): string;
  };
  KANON_ISARETCISI_METINLERI: { eklentiKanonu: string };
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

test("A04 DAVRANIŞ: ÖRTÜSÜZ projede gömülü kanon normaldir — işaret GÖSTERİLMEZ", () => {
  // Founder 2026-09-02: işaretin koşulu daraltıldı. Gerekçe hükmün kendi
  // cümlesindedir — kullanıcı, gördüğünün PROJESİNİN KENDİ tip sistemi olduğunu
  // sanmasın. Örtü yoksa proje kendi tipini hiç eklememiştir ve gömülü kanon
  // onun tam karşılığıdır; eski koşulda ise kanon araması yukarı yürüdüğü için
  // Sarmal deposunun kendi kökü dışında çalışan HERKES bu işareti alıyordu.
  const alan = gecici("sarmal-kanonsuz-");
  const belge = join(alan, "bos.sar");
  writeFileSync(belge, "Faz( kod: F1, ad: \"deneme\" )\n", "utf8");

  const { cubuk, vscode } = sahteYurutucu([alan]);
  const modul = kanonModulu(vscode);
  const isaret = new modul.TabanKanonCubugu();

  assert.ok(modul.snfBul({ uri: { fsPath: belge } }), "gömülü taban kanon yine de dönmeli — kör kalmak onarım değildir");
  assert.equal(modul.tabanKanonDurumu().düşüldü, false,
    "örtüsüz projede işaret yakıldı — doğan her yeni proje ilk gününde sahte uyarıyla karşılanır");
  assert.equal(cubuk.gorunur, false, "durum çubuğu işareti gürültü olarak gösterildi");
  isaret.dispose();
});

test("A04 DAVRANIŞ: ÖRTÜLÜ projede taban bulunamazsa düşüş SÖYLENİR (sessiz düşüş yasak)", () => {
  // Gerçek kusur budur: örtü tabana EKLENEREK yüklenir, dolayısıyla taban
  // bulunamadığında kullanıcının kendi ilan ettiği tipler sessizce düşer ve
  // sebebi hiçbir yerden okunamaz.
  const alan = gecici("sarmal-ortulu-");
  const belge = join(alan, "bos.sar");
  writeFileSync(belge, "Faz( kod: F1, ad: \"deneme\" )\n", "utf8");
  mkdirSync(join(alan, "oz", "siniflama"), { recursive: true });
  writeFileSync(join(alan, "oz", "siniflama", "ortu.json"), JSON.stringify({ departmanlar: ["uyumluluk"] }), "utf8");

  const { cubuk, vscode } = sahteYurutucu([alan]);
  const modul = kanonModulu(vscode);
  const isaret = new modul.TabanKanonCubugu();
  assert.equal(cubuk.gorunur, false, "kanon henüz sorulmadan işaret görünmemeli");

  assert.ok(modul.snfBul({ uri: { fsPath: belge } }), "gömülü taban kanon yine de dönmeli — kör kalmak onarım değildir");
  assert.equal(modul.tabanKanonDurumu().düşüldü, true, "düşüş kaydedilmedi — kullanıcı kendi tiplerinin neden yüklenmediğini bilemez");
  assert.equal(cubuk.gorunur, true, "durum çubuğu işareti gösterilmedi — düşüş SESSİZ kaldı");
  assert.match(String(cubuk.metin), /Sarmal/, "işaret hangi araca ait olduğunu söylemeli");
  // EKL-F6-A09: çözüm artık kanon işaretçisidir; kopya önerisi terk edilmiştir.
  assert.match(String(cubuk.ipucu), /Kanon İşaretçisini Yaz/, "ipucu çözümü söylemeli: kanon işaretçisini yazan komut");
  assert.doesNotMatch(String(cubuk.ipucu), /kayit\.json/,
    "ipucu terk edilmiş kopya çözümünü öneriyor — kanon kaydı projeye kopyalanmaz (BKM-DNT-A15)");
  assert.equal(cubuk.komut, modul.KANON_ISARETCISI_KOMUTU, "işarete tıklamak işaretçi komutunu çalıştırmalı");
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

// ── 5) KANON İŞARETÇİSİ: doğan kök tek başına açıldığında panel kör kalmaz ───
//   Ölçülen kusur (BKM-DNT-A15): doğuş paketiyle doğan bir kökte hiçbir kanon
//   kaydı yoktur; `eklenti.ts` tam-orkestrasyon turunda kaydı bulamayınca o kökü
//   ATLAR ve panelin proje kapsamlı tanıları o ağaçta hiç doğmaz. Onarım kopya
//   değil ADRESTİR: doğan kök yalnız bir işaretçi taşır.

test("BKM-DNT-A15: kanon işaretçisi taban kaydı çözer — kopya olmadan panel kör kalmaz", () => {
  const alan = gecici("sarmal-isaretci-");
  const kurulum = varlikKur(alan, "sarmal_kurulumu", { kanon: true });
  const dogan = varlikKur(alan, "dogan_proje");           // kanon YOK — doğuş paketi kopya yazmaz
  const isaretciDizin = join(dogan, "oz", "siniflama");
  mkdirSync(isaretciDizin, { recursive: true });

  // ① İşaretçi YOKKEN: kayıt çözülemez ve panel bu kökte kör kalır.
  assert.equal(varlikDosyasiBul(dogan, KAYIT_GORELI, [dogan]), undefined,
    "işaretçisiz kökte kayıt çözülüyor — fikstür ölçülen kusuru yeniden üretemiyor");

  // ② İşaretçi VARKEN: kayıt doğuran kurulumdan çözülür.
  writeFileSync(join(isaretciDizin, "isaretci.json"),
    JSON.stringify({ kanonKoku: kurulum, kayit: KAYIT_GORELI }), "utf8");
  assert.equal(varlikDosyasiBul(dogan, KAYIT_GORELI, [dogan]), join(kurulum, KAYIT_GORELI),
    "işaretçi taban kaydı çözmedi — panel hâlâ kör");

  // ③ İşaretçi ÖRTÜYÜ sunmaz: doğuran kurulumun kendi tip katkısı doğan projeye
  //    sızarsa varlık ayrılığı bulanır (STR-3 kırmızı çizgisi).
  const ortuGoreli = join("oz", "siniflama", "ortu.json");
  writeFileSync(join(kurulum, ortuGoreli), JSON.stringify({ semalar: {} }), "utf8");
  assert.equal(varlikDosyasiBul(dogan, ortuGoreli, [dogan]), undefined,
    "işaretçi örtüyü de sunuyor — kurulumun tip katkısı doğan projenin görünümüne sızar");

  // ④ İşaretçi var olan bir kaydı GÖLGELEMEZ: gerçek kayıt her zaman önce gelir.
  mkdirSync(join(dogan, "oz", "siniflama"), { recursive: true });
  copyFileSync(GERCEK_KAYIT, join(dogan, KAYIT_GORELI));
  assert.equal(varlikDosyasiBul(dogan, KAYIT_GORELI, [dogan]), join(dogan, KAYIT_GORELI),
    "kökün kendi kaydı varken işaretçi öne geçti — son çare olmaktan çıkmış");
});

test("BKM-DNT-A15: bozuk ya da göreli adres taşıyan işaretçi YOK sayılır", () => {
  const alan = gecici("sarmal-isaretci-bozuk-");
  const dogan = varlikKur(alan, "dogan_proje");
  const isaretciDizin = join(dogan, "oz", "siniflama");
  mkdirSync(isaretciDizin, { recursive: true });
  const isaretci = join(isaretciDizin, "isaretci.json");

  for (const [ad, icerik] of [
    ["ayrıştırılamayan json", "{ bu json değil"],
    ["alanı olmayan kayıt", JSON.stringify({ baska: "şey" })],
    ["göreli adres", JSON.stringify({ kanonKoku: "../sarmal" })],
    ["boş adres", JSON.stringify({ kanonKoku: "" })],
    ["diskte olmayan adres", JSON.stringify({ kanonKoku: join(alan, "hic_yok") })],
  ] as const) {
    writeFileSync(isaretci, icerik, "utf8");
    assert.equal(varlikDosyasiBul(dogan, KAYIT_GORELI, [dogan]), undefined,
      `${ad}: çözülemeyen işaretçi kayıt döndürdü — var olmayan adres, adres olmamaktan kötüdür`);
  }
});

// ── 5ʹ) EKL-F6-A08 · TAŞINABİLİR İŞARETÇİ ADRESİ ────────────────────────────
//   Founder hükmü 2026-09-16: doğan kökün kayıtları motorun yolunu SARMAL_KOK
//   ortam değişkeninden okur ve varsayılan taşımaz. İşaretçi de aynı değişkenle
//   yazıldığı için okuyucunun onu ÇÖZEBİLMESİ ölçülür: çözemezse doğan ağaç
//   kendi kanonunu bulamaz ve panel o kökte kör kalır. Okuma yolu genişler,
//   YAZIM yolu değişmez — sürüme bağlı yol yasağı ile mutlaklık şartı durur.

test("EKL-F6-A08: ortamDegiskenleriniCoz — tanımlı değişken genişler, eksik değişken adresi ÇÖZÜLEMEZ yapar", () => {
  const ortam = { SARMAL_KOK: "/kurulum", BOS: "" };
  assert.equal(ortamDegiskenleriniCoz("${SARMAL_KOK}/oz", ortam), "/kurulum/oz");
  assert.equal(ortamDegiskenleriniCoz("$SARMAL_KOK/oz", ortam), "/kurulum/oz");
  assert.equal(ortamDegiskenleriniCoz("/mutlak/yol", ortam), "/mutlak/yol", "değişken taşımayan yol olduğu gibi dönmeli");
  assert.equal(ortamDegiskenleriniCoz("${YOK_BOYLE}/oz", ortam), undefined, "tanımsız değişken yarım yol bırakmamalı");
  assert.equal(ortamDegiskenleriniCoz("${BOS}/oz", ortam), undefined, "boş değişken de çözülmemiş sayılır");
});

test("EKL-F6-A08: doğuşun yazdığı değişkenli işaretçi çözülür; değişken tanımsızken işaretçi YOK sayılır", () => {
  const alan = gecici("sarmal-isaretci-degisken-");
  const kurulum = varlikKur(alan, "sarmal_kurulumu", { kanon: true });
  const dogan = varlikKur(alan, "dogan_proje");
  const isaretciDizin = join(dogan, "oz", "siniflama");
  mkdirSync(isaretciDizin, { recursive: true });
  writeFileSync(join(isaretciDizin, "isaretci.json"),
    JSON.stringify({ kanonKoku: "${SARMAL_KOK}", kayit: KAYIT_GORELI }), "utf8");

  const onceki = process.env.SARMAL_KOK;
  try {
    // ① Değişken TANIMLI: adres genişler ve taban kayıt doğuran kurulumdan çözülür.
    process.env.SARMAL_KOK = kurulum;
    assert.equal(varlikDosyasiBul(dogan, KAYIT_GORELI, [dogan]), join(kurulum, KAYIT_GORELI),
      "değişkenli işaretçi çözülmedi — doğan ağaç kendi kanonunu bulamaz ve panel kör kalır");
    // ② Değişken TANIMSIZ: yarım genişletilmiş yol adres sayılmaz.
    delete process.env.SARMAL_KOK;
    assert.equal(varlikDosyasiBul(dogan, KAYIT_GORELI, [dogan]), undefined,
      "tanımsız değişkenle yarım genişletilmiş adres kayıt döndürdü — var olmayan adres, adres olmamaktan kötüdür");
  } finally {
    if (onceki === undefined) delete process.env.SARMAL_KOK;
    else process.env.SARMAL_KOK = onceki;
  }
});

test("EKL-F6-A08: işaretçinin YAZIM yolu değişmedi — göreli ve sürüme bağlı adres hâlâ reddedilir", () => {
  const alan = gecici("sarmal-isaretci-yazim-");
  const hedef = varlikKur(alan, "hedef_proje");
  mkdirSync(join(hedef, "oz", "siniflama"), { recursive: true });
  assert.throws(() => isaretciYaz(hedef, "../sarmal"), /göreli adres taşıyamaz/u,
    "yazım yolu göreli adresi geçirdi — okuma tarafındaki genişletme yazım şartını gevşetmemeli");
  assert.throws(() => isaretciYaz(hedef, join(alan, "extensions", "nexivion-labs.sarmal-0.9.190")), /sürüme bağlı/u,
    "yazım yolu sürüme bağlı klasörü geçirdi — ilk güncellemede kırılan adres yazılır");
});

// ── 6) EKL-F6-A09 · MAĞAZADAN KURULAN EKLENTİDE TAM DENETİM ─────────────────
//   Ölçülen kusur: `eklenti.ts` tip kaydını bulamadığı kökün tam denetimini bir
//   `continue` ile sessizce atlıyordu. Mağaza paketi diskte hiçbir kanon dosyası
//   taşımadığı için işaretçiden önce doğmuş ağaçta panel kırık atıf, disk
//   mutabakatı ve bağımlılık grafı tanılarını hiç göstermiyordu. Fikstür mağaza
//   paketini taklit eder: derleme üreticisi sürüm adlı bir eklenti klasörüne
//   GERÇEKTEN koşturulur ve keşif o klasördeki kopyaya karşı ölçülür.
//
//   Mutasyon kanıtı (2026-09-15 koşusu; her mutasyon `cp` yedeğinden bayt özdeş
//   geri alındı ve sınamalar yeşile döndü): paketin kopyasına düşen dal
//   söküldüğünde mağaza sınaması düştü; kopya zincirin başına alındığında
//   gölgeleme sınaması düştü; kabuk atlanan kökleri işarete bildirmeyi
//   bıraktığında kaynak sınaması, işaret atlanan kökü göstermeyi bıraktığında
//   işaret sınaması düştü.

const GERCEK_REHBER = yol("../../../oz/siniflama/rehber.json");

/** Mağaza paketinin taklidi: üretici sürüm adlı bir eklenti klasörüne koşturulur; paketin kanon kökü döner. */
function magazaPaketi(): { alan: string; eklenti: string; paketKanonKoku: string } {
  const alan = gecici("sarmal-magaza-");
  const eklenti = join(alan, "extensions", "nexivion-labs.sarmal-0.9.190");
  const uretim = join(alan, "uretim");
  mkdirSync(uretim, { recursive: true });
  mkdirSync(eklenti, { recursive: true });
  copyFileSync(VARSAYILAN.PAKET, join(uretim, "package.json"));
  copyFileSync(VARSAYILAN.AYAR!, join(uretim, "settings.json"));
  const yollar = {
    PAKET: join(uretim, "package.json"), AYAR: join(uretim, "settings.json"), GOMULU: join(uretim, "gomulu-kanon.ts"),
    TEMA_KOYU: join(uretim, "sarmal-koyu.json"), TEMA_ACIK: join(uretim, "sarmal-acik.json"),
    KANON_KOPYA: join(eklenti, PAKET_KANON_DIZINI),
  };
  uret(yollar);   // ← derleme üreticisi GERÇEKTEN koşar; kopya elle kurulmaz
  return { alan, eklenti, paketKanonKoku: join(eklenti, PAKET_KANON_DIZINI) };
}

/**
 * İşaretçiden önce doğmuş ağacın taklidi: doğuş ağacının işaretçisi ağacın
 * DIŞINA taşınır (silinmez) ve plana bir kırık bağımlılık eklenir, böylece tam
 * denetimin koşup koşmadığı bir hata bulgusuyla okunabilir.
 */
function isaretcisizAgac(alan: string): string {
  const kok = join(alan, "eski_proje");
  mkdirSync(kok, { recursive: true });
  dogusYaz(kok, "eski", "2026-09-15", "proje");
  renameSync(join(kok, "oz", "siniflama", "isaretci.json"), join(alan, "ayrilan-isaretci.json"));
  const plan = join(kok, "is", "plan", "faz", "1_dogus.sar");
  writeFileSync(plan, readFileSync(plan, "utf8").replace("bağımlı: []", "bağımlı: [ADM-YOK-99]"), "utf8");
  return kok;
}

type DenetimSonucu = ReturnType<typeof denetimKos>;

/** Hata düzeyli bulguların karşılaştırılabilir imzası; süzgeç verilirse yalnız o üreticilerin bulguları. */
function hataImzalari(sonuc: DenetimSonucu, suzgec?: ReadonlySet<string>): string[] {
  return sonuc.akis.flatMap((r) => r.tanilar
    .filter((t) => t.duzey === "hata")
    .filter((t) => !suzgec || suzgec.has(sonuc.koken.get(t) ?? ""))
    .map((t) => `${r.dosya}:${t.satir}:${t.sutun} [${t.kod}] ${t.mesaj}`)).sort();
}

test("EKL-F6-A09: derleme kanon kaydını ve rehberi pakete bayt özdeş kopyalar", () => {
  const { paketKanonKoku } = magazaPaketi();
  assert.equal(readFileSync(join(paketKanonKoku, KAYIT_GORELI), "utf8"), readFileSync(GERCEK_KAYIT, "utf8"),
    "paketteki tip kaydı kaynaktan ayrışmış — kopya ikinci bir elle yazılmış kaynak gibi davranıyor");
  assert.equal(readFileSync(join(paketKanonKoku, "oz", "siniflama", "rehber.json"), "utf8"), readFileSync(GERCEK_REHBER, "utf8"),
    "paketteki rehber kaynaktan ayrışmış");
});

test("EKL-F6-A09: kanonsuz kökte tam denetim paketin kopyasıyla koşar ve komut satırıyla aynı hata bulgularını verir", () => {
  const { alan, paketKanonKoku } = magazaPaketi();
  const kok = isaretcisizAgac(alan);

  // ① Fikstür kusuru yeniden üretir: paketin kopyası olmadan kanon çözülemez.
  assert.equal(tamDenetimKanonuBul(kok, [kok]), undefined,
    "işaretçisiz ağaçta kanon çözülüyor — fikstür ölçülen kusuru yeniden üretemiyor");

  // ② Paketin kopyası son çare olarak devreye girer.
  const kanon = tamDenetimKanonuBul(kok, [kok], paketKanonKoku);
  assert.ok(kanon, "kanonsuz kökte tam denetim yine atlanıyor — mağaza kullanıcısının paneli eksik konuşur");
  assert.equal(kanon.kaynak, "paket");
  assert.equal(kanon.snfYol, join(paketKanonKoku, KAYIT_GORELI));

  // ③ Panelin tam denetimi komut satırının hükmüyle aynıdır. Kabuğun yaptığı gibi
  //    `denetimKos` paketin kopyasıyla koşturulur ve panel üretici kümesiyle süzülür;
  //    komut satırı aynı gövdeyi deponun kendi kaydıyla koşturur (sarmal.ts SNF_YOL).
  const panel = denetimKos(kok, { snfYol: kanon.snfYol, bugun: "2026-09-15", tamListe: true });
  const cli = denetimKos(kok, { snfYol: GERCEK_KAYIT, bugun: "2026-09-15", tamListe: true });
  const panelHatalari = hataImzalari(panel, panelCaprazUreticiKumesi());
  const cliHatalari = hataImzalari(cli);
  assert.ok(cliHatalari.some((h) => h.includes("[kırık-referans]")),
    `komut satırı fikstürün kırık bağımlılığını görmedi — ölçüm boş küme üstünde koşar: ${cliHatalari.join(" | ")}`);
  assert.deepEqual(panelHatalari, cliHatalari,
    "paketin kopyasıyla koşan panel, komut satırının hata bulgularından ayrışıyor");
});

test("EKL-F6-A09: gerçek kanon ya da işaretçi varken paketin kopyası devreye girmez", () => {
  const { alan, paketKanonKoku } = magazaPaketi();

  // ① Kökün kendi kaydı.
  const kanonlu = varlikKur(alan, "kanonlu_proje", { kanon: true });
  assert.deepEqual(tamDenetimKanonuBul(kanonlu, [kanonlu], paketKanonKoku),
    { snfYol: join(kanonlu, KAYIT_GORELI), kaynak: "proje" },
    "kökün kendi kaydı varken paketin kopyası öne geçti — gerçek kanon gölgelendi");

  // ② İşaretçinin adresi.
  const kurulum = varlikKur(alan, "sarmal_kurulumu", { kanon: true });
  const dogan = varlikKur(alan, "dogan_proje");
  mkdirSync(join(dogan, "oz", "siniflama"), { recursive: true });
  writeFileSync(join(dogan, "oz", "siniflama", "isaretci.json"), JSON.stringify({ kanonKoku: kurulum }), "utf8");
  assert.deepEqual(tamDenetimKanonuBul(dogan, [dogan], paketKanonKoku),
    { snfYol: join(kurulum, KAYIT_GORELI), kaynak: "proje" },
    "işaretçi varken paketin kopyası öne geçti — işaretçi son çare olmaktan önce gelmeli");

  // ③ Çalışma alanında ilan edilmiş kardeş varlığın kaydı (tek adaylı ayrı alan:
  //    sonuç dizin okuma sırasına bağlı kalmasın).
  const kardesAlani = gecici("sarmal-kardes-");
  const kardes = varlikKur(kardesAlani, "kanonlu_kardes", { kanon: true });
  const arayan = varlikKur(kardesAlani, "kardes_arayan");
  assert.deepEqual(tamDenetimKanonuBul(arayan, [kardesAlani], paketKanonKoku),
    { snfYol: join(kardes, KAYIT_GORELI), kaynak: "proje" },
    "çalışma alanındaki ilanlı varlığın kaydı varken paketin kopyası öne geçti");
});

test("EKL-F6-A09: paketin kopyası da yoksa kök atlanır ve durum çubuğu tam denetimin koşmadığını söyler", () => {
  const alan = gecici("sarmal-atlanan-");
  const kok = varlikKur(alan, "kanonsuz_proje");
  const diger = varlikKur(alan, "diger_proje");
  assert.equal(tamDenetimKanonuBul(kok, [kok], join(alan, "kopyasi-olmayan-paket")), undefined,
    "okunamayan paket kopyası kanon diye döndü");

  const { cubuk, vscode } = sahteYurutucu([alan]);
  const modul = kanonModulu(vscode);
  const isaret = new modul.TabanKanonCubugu();
  assert.equal(cubuk.gorunur, false, "hiçbir kök atlanmamışken işaret görünmemeli");

  modul.tamDenetimSonucu([kok, diger], [kok], true);
  assert.deepEqual(modul.tabanKanonDurumu().atlanan, [kok]);
  assert.equal(cubuk.gorunur, true, "tam denetim koşmadı ama durum çubuğu SUSTU — boş panel temiz ağaç sanılır");
  assert.match(String(cubuk.metin), /tam denetim koşmadı/, "işaret denetimin koşmadığını adıyla söylemeli");
  assert.ok(String(cubuk.ipucu).includes(kok), "ipucu atlanan kökü adıyla söylemeli");
  assert.match(String(cubuk.ipucu), /temiz olduğu anlamına gelmez/, "ipucu boş panelin hüküm olmadığını söylemeli");

  // Daraltılmış tur yalnız ölçtüğü kökün hanesini tazeler; öteki kökün kaydı korunur.
  modul.tamDenetimSonucu([diger], [], false);
  assert.equal(cubuk.gorunur, true, "başka kökü ölçen dar tur atlanan kökün işaretini sildi");
  modul.tamDenetimSonucu([kok], [], false);
  assert.equal(cubuk.gorunur, false, "kök denetlendiği hâlde işaret kalkmadı");
  isaret.dispose();
});

test("EKL-F6-A09 KAYNAK: kabuk kanonu paketin köküyle çözer ve atlanan kökleri işarete bildirir", () => {
  const kaynak = readFileSync(join(KOK, "src", "eklenti.ts"), "utf8");
  const bas = kaynak.indexOf("const denetleHepsi");
  const govde = kaynak.slice(bas, kaynak.indexOf("const denetimKilidi", bas));
  assert.match(kaynak, /const paketKanonKoku = join\(context\.extensionPath, PAKET_KANON_DIZINI\)/,
    "paketin kanon kökü eklentinin kurulu klasöründen türetilmiyor");
  assert.match(govde, /tamDenetimKanonuBul\(kokYol, koklar, paketKanonKoku\)/,
    "tam denetim turu paketin kopyasını keşfe vermiyor");
  // MGZ-A04: çağrı dördüncü argüman olarak çöken kökleri de taşır; atlanan kök
  // bildirimi aynı yerde kalır ve bu desen onu eskisi kadar sıkı ölçer.
  assert.match(govde, /tamDenetimSonucu\(denetlenenKokler, atlananKokler, darKok === undefined[,)]/,
    "tam denetim turu atlanan kökleri işarete bildirmiyor — atlama yeniden sessizleşir");
  assert.doesNotMatch(govde, /if \(!snfYol\) continue/, "sessiz atlama satırı geri gelmiş");
});

// ── 7) EKL-F6-A09 · İŞARETÇİYİ YAZAN KOMUT ─────────────────────────────────
//   Ölçülen kusur: işaretçiden önce doğmuş ağaçlara işaretçiyi yazan hiçbir yol
//   yoktu ve taban kanon işaretinin ipucu terk edilmiş kopya çözümünü öneriyordu.
//   Komutun kararı saf çekirdektedir; nöbetler kararı ve yazımı gerçek fikstür
//   ağaçlarına karşı koşturur. En sert koruma sürüm adresidir: eklenti klasörünün
//   adı her güncellemede değiştiği için o klasörü gösteren işaretçi ilk güncellemede
//   kırılırdı.
//
//   Mutasyon kanıtı (2026-09-15 koşusu; her mutasyon `cp` yedeğinden bayt özdeş
//   geri alındı ve sınamalar yeşile döndü): karardan sürüm süzgeci söküldüğünde
//   ve yazımdan son savunma söküldüğünde sürüm sınaması düştü; ipucu yeniden
//   kayit.json dosyasına yönlendirildiğinde ipucu sınamaları düştü; muhtaçlık
//   ölçüsü her kökü muhtaç saydığında yazım sınaması düştü.

/** Kanon kökü kurar: ilan, tip kaydı ve rehber — işaretçinin sunduğu iki dosyanın ikisi de. */
function kanonKokuKur(alan: string, ad: string): string {
  const kok = varlikKur(alan, ad, { kanon: true });
  copyFileSync(GERCEK_REHBER, join(kok, "oz", "siniflama", "rehber.json"));
  return kok;
}

/** Sürüm adlı eklenti klasörünün taklidi: içinde kanon kopyası bulunan paket kökü. */
function surumluPaketKoku(alan: string): string {
  const kok = join(alan, "extensions", "nexivion-labs.sarmal-0.9.190", PAKET_KANON_DIZINI);
  mkdirSync(join(kok, "oz", "siniflama"), { recursive: true });
  copyFileSync(GERCEK_KAYIT, join(kok, KAYIT_GORELI));
  copyFileSync(GERCEK_REHBER, join(kok, "oz", "siniflama", "rehber.json"));
  return kok;
}

test("EKL-F6-A09: işaretçi komutu çalışma alanındaki kanon köküne işaretçi yazar ve ağaç tek başına açıldığında kanonu bulur", () => {
  const alan = gecici("sarmal-isaretci-yaz-");
  const kurulum = kanonKokuKur(alan, "sarmal_kurulumu");
  const hedef = isaretcisizAgac(alan);
  const eklentiYolu = join(alan, "extensions", "nexivion-labs.sarmal-0.9.190");

  const plan = isaretciPlani(hedef, [alan], eklentiYolu);
  assert.deepEqual(plan, { tur: "yaz", hedef, kanonKoku: kurulum }, "komut çalışma alanındaki kanon kökünü bulamadı");
  const yazilan = isaretciYaz(hedef, kurulum, eklentiYolu);
  assert.equal(yazilan, join(hedef, "oz", "siniflama", "isaretci.json"));
  assert.equal(JSON.parse(readFileSync(yazilan, "utf8")).kanonKoku, kurulum, "işaretçi kanon kökünün adresini taşımıyor");

  // Ağaç TEK BAŞINA açıldığında kanon işaretçiden çözülür; paketin kopyası devreye girmez.
  assert.deepEqual(tamDenetimKanonuBul(hedef, [hedef], join(alan, "paket-kopyasi")),
    { snfYol: join(kurulum, KAYIT_GORELI), kaynak: "proje" }, "yazılan işaretçi tek başına açılan ağaçta çözülmüyor");
  assert.deepEqual(isaretciPlani(hedef, [alan], eklentiYolu), { tur: "gereksiz", hedef },
    "işaretçi yazıldıktan sonra komut ikinci bir işaretçi yazmaya kalkıyor");

  // İşaretçi doğuşun ilan ettiği rafa indi: denetim beyansız yapı görmez.
  const sonuc = denetimKos(hedef, { snfYol: GERCEK_KAYIT, bugun: "2026-09-15", tamListe: true });
  assert.equal(sonuc.akis.flatMap((r) => r.tanilar).filter((t) => t.kod === "beyansız-yapı").length, 0,
    "işaretçi yazımı ilan edilmemiş yapı doğurdu");
});

test("EKL-F6-A09: işaretçi komutu sürüme bağlı bir eklenti klasörüne asla yazmaz", () => {
  const alan = gecici("sarmal-isaretci-surum-");
  const hedef = isaretcisizAgac(alan);
  const isaretci = join(hedef, "oz", "siniflama", "isaretci.json");
  const surumlu = surumluPaketKoku(alan);

  // ① Desen: sürüm adlı eklenti klasörü tanınır, sürüm taşımayan depo klasörü tanınmaz.
  assert.equal(surumeBagliEklentiYolu(surumlu), true, "sürüm adlı eklenti klasörü tanınmadı");
  assert.equal(surumeBagliEklentiYolu(join(alan, "Nexivion-Labs", "sarmal")), false);
  assert.equal(surumeBagliEklentiYolu(join(alan, "kod", "sarmal-0.9.1")), false, "yayıncı taşımayan klasör sürüme bağlı sayıldı");

  // ② Tek aday sürüm adlı klasörse karar yazım DEĞİLDİR: eklentinin kanonu zaten çalışıyor.
  assert.deepEqual(isaretciPlani(hedef, [hedef, surumlu]), { tur: "eklenti-kanonu", hedef },
    "işaretçi sürüme bağlı eklenti klasörünü gösterecekti — eklenti güncellenince adres kırılır");

  // ③ Çalışan eklentinin kendi klasörü adında sürüm taşımasa da (geliştirme kipi) seçilmez.
  const gelistirme = join(alan, "gelistirme_eklentisi");
  const icKanon = join(gelistirme, PAKET_KANON_DIZINI);
  mkdirSync(join(icKanon, "oz", "siniflama"), { recursive: true });
  copyFileSync(GERCEK_KAYIT, join(icKanon, KAYIT_GORELI));
  copyFileSync(GERCEK_REHBER, join(icKanon, "oz", "siniflama", "rehber.json"));
  assert.deepEqual(isaretciPlani(hedef, [hedef, icKanon], gelistirme), { tur: "eklenti-kanonu", hedef },
    "çalışan eklentinin kendi klasörü işaretçi adresi olarak seçildi");

  // ④ Son savunma: karar atlanıp yazım doğrudan çağrılsa bile dosya inmez.
  assert.throws(() => isaretciYaz(hedef, surumlu), /sürüme bağlı/);
  assert.throws(() => isaretciYaz(hedef, icKanon, gelistirme), /sürüme bağlı/);
  assert.equal(existsSync(isaretci), false, "sürüme bağlı adres dosyaya indi");

  // ⑤ Gerçek bir kanon kökü de varsa o seçilir; sürüm adlı aday yine atlanır.
  const kurulum = kanonKokuKur(alan, "sarmal_kurulumu");
  assert.deepEqual(isaretciPlani(hedef, [surumlu, alan], gelistirme), { tur: "yaz", hedef, kanonKoku: kurulum });
});

test("EKL-F6-A09: raf ilan edilmemiş ağaçta işaretçi klasör uydurmaz", () => {
  const alan = gecici("sarmal-isaretci-rafsiz-");
  const kurulum = kanonKokuKur(alan, "sarmal_kurulumu");
  const hedef = varlikKur(alan, "rafsiz_proje");
  assert.deepEqual(isaretciPlani(hedef, [alan]), { tur: "raf-yok", hedef, kanonKoku: kurulum });
  assert.equal(existsSync(join(hedef, "oz")), false, "karar ilan edilmemiş bir klasör doğurdu");
});

test("EKL-F6-A09: işaretin ipucu işaretçiyi önerir, kopya çözümünü önermez ve komut iki dilde ilan edilmiştir", () => {
  const paket = JSON.parse(readFileSync(yol("../package.json"), "utf8")) as {
    contributes: { commands: Array<{ command: string }> };
  };
  const { vscode } = sahteYurutucu([]);
  const modul = kanonModulu(vscode);
  assert.deepEqual(paket.contributes.commands.find((k) => k.command === modul.KANON_ISARETCISI_KOMUTU),
    { command: "sarmal.kanonIsaretcisiYaz", title: "%command.writeCanonPointer%", category: "%sarmal.category%" },
    "işaretçi komutu paket bildiriminde ilan edilmemiş");
  const ciftDil = {
    tr: JSON.parse(readFileSync(yol("../package.nls.tr.json"), "utf8")) as Record<string, string>,
    en: JSON.parse(readFileSync(yol("../package.nls.json"), "utf8")) as Record<string, string>,
  };
  const emoji = /\p{Extended_Pictographic}/u;
  for (const dil of ["tr", "en"] as const) {
    const ad = ciftDil[dil]["command.writeCanonPointer"];
    assert.ok(ad, `${dil}: komutun adı dil dosyasında yok`);
    assert.doesNotMatch(ad, emoji, `${dil}: komut adı emoji taşıyor`);
    modul.yuzeyDiliniAyarla(dil);
    const ipucu = modul.TABAN_KANON_METINLERI.cubukIpucu("/proje/plan.sar");
    assert.ok(ipucu.includes(`Sarmal: ${ad}`), `${dil}: ipucu işaretçi komutunu adıyla önermiyor`);
    assert.match(ipucu, /isaretci\.json/, `${dil}: ipucu işaretçinin dosyasını söylemiyor`);
    assert.doesNotMatch(ipucu, /kayit\.json/, `${dil}: ipucu terk edilmiş kopya çözümünü öneriyor`);
    assert.doesNotMatch(ipucu, emoji, `${dil}: ipucu emoji taşıyor`);
    assert.ok(modul.TABAN_KANON_METINLERI.atlandiIpucu(["/proje"]).includes(`Sarmal: ${ad}`),
      `${dil}: atlama ipucu işaretçi komutunu adıyla anmıyor`);
  }
  modul.yuzeyDiliniAyarla("tr");
  assert.match(modul.KANON_ISARETCISI_METINLERI.eklentiKanonu, /kendi kanon kopyasıyla zaten çalışıyor ve işaretçiye gerek yok/);
  modul.yuzeyDiliniAyarla("en");
  assert.match(modul.KANON_ISARETCISI_METINLERI.eklentiKanonu, /already runs on its own canon copy, so no pointer is needed/);

  // KAYNAK: kabuk komutu bu kimlikle kaydeder ve kararı saf çekirdekten alır.
  const kaynak = readFileSync(join(KOK, "src", "eklenti.ts"), "utf8");
  assert.match(kaynak, /registerCommand\(KANON_ISARETCISI_KOMUTU,/, "kabuk işaretçi komutunu kaydetmiyor");
  assert.match(kaynak, /isaretciPlani\(hedef, koklar, context\.extensionPath\)/,
    "kabuk kararı eklentinin kendi klasörünü bilmeden veriyor — sürüm süzgeci kör kalır");
});

// ── 8) MGZ-A04 · ÇÖKEN KÖK DE İŞARETE BİLDİRİLİR ─────────────────────────────
//   Ölçülen kusur (HTR-TAM-DENETIM-COKUSU-SESSIZ-DUSUYOR · 2026-09-15): tam
//   denetim turu `denetimKos` çağrısını bir try/catch bloğu içinde koşturuyor ve
//   çağrı çökünce hatayı yutuyordu. Kanonsuz kök EKL-F6-A09'dan beri durum
//   çubuğundaki işarete bildiriliyordu, fakat çöken kök bu bildirime
//   katılmıyordu; panel o kökün proje kapsamlı tanılarını hiç göstermiyor ve
//   kullanıcı tam denetimin orada koşmadığını hiçbir yerden okuyamıyordu.
//
//   Çöküş fikstürde ZORLANIR ve uydurulmaz: kökün kendi örtüsüne (ortu.json)
//   birleştirme çatışması işaretleri yazılır. Bu, bir dal birleştirmesinin
//   gerçekten bırakabileceği bir dosyadır; tek dosya yolu örtüyü sessizce
//   atladığı için renk ve tek dosya tanıları çalışmaya devam eder, tam denetim
//   ise örtüyü okurken çöker. Çöküşün kendisi bu Adımda onarılmaz; yalnız
//   görünür kılınır (Adımın sınırı).

/** Kökün örtüsüne birleştirme çatışması bırakır; tam denetim bu dosyayı okurken çöker. */
function ortusuCatismali(kok: string): void {
  mkdirSync(join(kok, "oz", "siniflama"), { recursive: true });
  writeFileSync(join(kok, "oz", "siniflama", "ortu.json"),
    "<<<<<<< HEAD\n{ \"semalar\": {} }\n=======\n{}\n>>>>>>> yan-dal\n", "utf8");
}

test("MGZ-A04: çöken kök durum çubuğu işaretinde görünür ve sebebi kanonsuzluk değil çöküş olarak söylenir", (t) => {
  const alan = gecici("sarmal-coken-isaret-");
  t.after(() => rmSync(alan, { recursive: true, force: true }));   // başarısızlıkta da silinir
  const coken = varlikKur(alan, "coken_proje");
  const saglam = varlikKur(alan, "saglam_proje");

  const { cubuk, vscode } = sahteYurutucu([alan]);
  const modul = kanonModulu(vscode);
  const isaret = new modul.TabanKanonCubugu();
  modul.tamDenetimSonucu([coken, saglam], [], true, [{ kok: coken, hata: "Unexpected token '<' in JSON" }]);

  assert.deepEqual(modul.tabanKanonDurumu().coken, [{ kok: coken, hata: "Unexpected token '<' in JSON" }],
    "çöken kök durumda kayıtlı değil — tur onu bildirse de işaret göremez");
  assert.equal(cubuk.gorunur, true, "tam denetim çöktü ama durum çubuğu SUSTU — boş panel temiz ağaç sanılır");
  assert.match(String(cubuk.metin), /tam denetim koşmadı/, "işaret denetimin koşmadığını adıyla söylemeli");
  const ipucu = String(cubuk.ipucu);
  assert.ok(ipucu.includes(coken), "ipucu çöken kökü adıyla söylemeli");
  assert.ok(!ipucu.includes(saglam), "ipucu sağlıklı koşan kökü de çökmüş gibi anıyor");
  assert.ok(ipucu.includes("Unexpected token '<' in JSON"), "ipucu çöküşün iletisini taşımıyor");
  assert.match(ipucu, /hata/, "ipucu sebebin bir hata olduğunu söylemeli");
  assert.doesNotMatch(ipucu, /tip sistemi kaydı bulunamadığı/,
    "çöken kökün sebebi kanonsuzluk diye söyleniyor — kullanıcı yanlış onarıma yönlenir");
  assert.match(ipucu, /temiz olduğu anlamına gelmez/, "ipucu boş panelin hüküm olmadığını söylemeli");
  assert.match(ipucu, /sarmal denetle/, "ipucu hatanın tamamını gösteren yolu söylemeli");
  assert.equal(cubuk.komut, undefined,
    "yalnız çöküş varken işarete tıklamak kanon işaretçisi komutunu çalıştırıyor — kanonu olan kökte yanlış onarımdır");

  // Daraltılmış tur yalnız ölçtüğü kökün hanesini tazeler; çöken kökün kaydı korunur.
  modul.tamDenetimSonucu([saglam], [], false, []);
  assert.equal(cubuk.gorunur, true, "başka kökü ölçen dar tur çöken kökün işaretini sildi");
  modul.tamDenetimSonucu([coken], [], false, []);
  assert.equal(cubuk.gorunur, false, "kök yeniden sağlıklı koştuğu hâlde işaret kalkmadı");

  // Kanonsuz kök ile çöken kök aynı anda: iki sebep de kendi cümlesiyle söylenir.
  modul.tamDenetimSonucu([coken, saglam], [saglam], true, [{ kok: coken, hata: "ENOENT" }]);
  const ikili = String(cubuk.ipucu);
  assert.match(ikili, /tip sistemi kaydı bulunamadığı/, "kanonsuz kökün sebebi kayboldu");
  assert.ok(ikili.includes("ENOENT"), "çöken kökün sebebi kayboldu");
  assert.equal(cubuk.komut, modul.KANON_ISARETCISI_KOMUTU, "kanonsuz kök varken işaret işaretçi komutunu çalıştırmalı");

  // Tam tur her iki listeyi de baştan kurar: sorun kalmayınca işaret gizlenir.
  modul.tamDenetimSonucu([coken, saglam], [], true, []);
  assert.equal(cubuk.gorunur, false, "tam tur temiz bitince işaret kalkmadı");
  isaret.dispose();
});

test("MGZ-A04: çöküş ipucu iki dilde aynı bilgiyi taşır ve emoji taşımaz", () => {
  const { vscode } = sahteYurutucu([]);
  const modul = kanonModulu(vscode);
  const kayit = [{ kok: "/proje/bozuk", hata: "Unexpected token" }];
  const emoji = /\p{Extended_Pictographic}/u;
  for (const [dil, sebep] of [["tr", /hata/], ["en", /error/]] as const) {
    modul.yuzeyDiliniAyarla(dil);
    const ipucu = modul.TABAN_KANON_METINLERI.coktuIpucu(kayit);
    assert.ok(ipucu.includes("/proje/bozuk"), `${dil}: ipucu kökü anmıyor`);
    assert.ok(ipucu.includes("Unexpected token"), `${dil}: ipucu hatanın iletisini taşımıyor`);
    assert.match(ipucu, sebep, `${dil}: ipucu sebebi söylemiyor`);
    assert.match(ipucu, /sarmal denetle/, `${dil}: ipucu komut satırı yolunu söylemiyor`);
    assert.doesNotMatch(ipucu, emoji, `${dil}: ipucu emoji taşıyor`);
  }
  modul.yuzeyDiliniAyarla("tr");
});

test("MGZ-A04: birleşik ipucunda sonuç cümlesi bir kez geçer ve birden çok çöken kök çoğul söylenir", () => {
  const bir = [{ kok: "/alan/a", hata: "ENOENT" }];
  const iki = [...bir, { kok: "/alan/b", hata: "Unexpected token" }];
  for (const [dil, sonuc, tekil, cogul] of [
    ["tr", /Kırık atıf, disk mutabakatı ve bağımlılık grafı tanıları/gu, /Şu kökte/u, /Şu köklerde/u],
    ["en", /Broken reference, disk reconciliation and dependency graph diagnostics/gu, /for this root/u, /for these roots/u],
  ] as const) {
    const { cubuk, vscode } = sahteYurutucu([]);
    const modul = kanonModulu(vscode);
    modul.yuzeyDiliniAyarla(dil);
    const isaret = new modul.TabanKanonCubugu();
    // Kanonsuz kök ile çöken kök birlikte: iki sebep, tek sonuç cümlesi.
    modul.tamDenetimSonucu(["/alan/k", "/alan/a"], ["/alan/k"], true, bir);
    const birlesik = String(cubuk.ipucu);
    assert.equal(birlesik.match(sonuc)?.length ?? 0, 1, `${dil}: birleşik ipucunda sonuç cümlesi bir kez geçmeli:\n${birlesik}`);
    assert.ok(birlesik.includes("/alan/k") && birlesik.includes("/alan/a"), `${dil}: birleşik ipucu iki kökü de anmalı`);
    // Tek çöken kök tekil, birden çoğu çoğul söylenir; ikisi de sonucu kendisi taşır.
    const tek = modul.TABAN_KANON_METINLERI.coktuIpucu(bir);
    assert.match(tek, tekil, `${dil}: tek çöken kök tekil söylenmeli`);
    assert.doesNotMatch(tek, cogul, `${dil}: tek çöken kök çoğul söyleniyor`);
    assert.equal(tek.match(sonuc)?.length ?? 0, 1, `${dil}: tek başına çöküş ipucu sonuç cümlesini taşımalı`);
    const cok = modul.TABAN_KANON_METINLERI.coktuIpucu(iki);
    assert.match(cok, cogul, `${dil}: birden çok çöken kök çoğul söylenmeli:\n${cok}`);
    assert.doesNotMatch(cok, tekil, `${dil}: birden çok çöken kök tekil söyleniyor:\n${cok}`);
    assert.equal(cok.match(sonuc)?.length ?? 0, 1, `${dil}: çoğul çöküş ipucu sonuç cümlesini bir kez taşımalı`);
    isaret.dispose();
  }
});

test("MGZ-A04: zorla çökertilen kökün tam denetimi yutulmaz; tur onu çöken kök olarak bildirir ve öteki kökler koşmaya devam eder", (t) => {
  const alan = gecici("sarmal-coken-tur-");
  t.after(() => rmSync(alan, { recursive: true, force: true }));   // başarısızlıkta da silinir
  const bozuk = varlikKur(alan, "bozuk_proje", { kanon: true });
  const saglam = varlikKur(alan, "saglam_proje", { kanon: true });
  const kanonsuz = join(alan, "kanonsuz_disari");
  mkdirSync(kanonsuz, { recursive: true });
  ortusuCatismali(bozuk);

  const kosulan: string[] = [];
  const kos = (kok: string, kanon: { snfYol: string }): void => {
    kosulan.push(kok);
    denetimKos(kok, { snfYol: kanon.snfYol, bugun: "2026-10-10", tamListe: true });
  };
  // ① Fikstür ölçülen kusuru yeniden üretir: aynı gövde bu kökte GERÇEKTEN çöker.
  assert.throws(() => kos(bozuk, { snfYol: join(bozuk, KAYIT_GORELI) }), SyntaxError,
    "çatışmalı örtü tam denetimi çökertmiyor — fikstür kusuru yeniden üretemiyor");
  kosulan.length = 0;

  // ② Kabuğun kök turu: kanon keşfi ve koşu saf gövdeden geçer.
  const tur = tamDenetimKokTuru(
    [bozuk, kanonsuz, saglam],
    (kok) => tamDenetimKanonuBul(kok, [kok], join(alan, "kopyasi-olmayan-paket")),
    kos,
  );
  assert.deepEqual(tur.coken.map((c) => c.kok), [bozuk], "çöken kök turun çöküş listesine girmedi — hata yine yutuldu");
  assert.match(tur.coken[0]!.hata, /JSON/, "çöküşün iletisi kaybolmuş");
  assert.deepEqual(tur.atlanan, [kanonsuz], "kanonsuz kök atlananlar listesinden düştü ya da çöken kök oraya karıştı");
  assert.deepEqual(kosulan, [bozuk, saglam], "bir kökün çöküşü sıradaki kökün tam denetimini durdurdu");

  // ③ Turun sonucu işarete gider ve işaret çöken kökü gösterir.
  const { cubuk, vscode } = sahteYurutucu([alan]);
  const modul = kanonModulu(vscode);
  const isaret = new modul.TabanKanonCubugu();
  modul.tamDenetimSonucu([bozuk, kanonsuz, saglam], tur.atlanan, true, tur.coken);
  assert.equal(cubuk.gorunur, true, "çökmeye zorlanan kök durum çubuğu işaretinde görünmüyor");
  assert.ok(String(cubuk.ipucu).includes(bozuk), "işaretin ipucu çöken kökü adıyla anmıyor");
  isaret.dispose();
});

test("MGZ-A04 KAYNAK: kabuk kök turunu saf gövdeden koşturur ve çöken kökleri işarete bildirir", () => {
  const kaynak = readFileSync(join(KOK, "src", "eklenti.ts"), "utf8");
  const bas = kaynak.indexOf("const denetleHepsi");
  const govde = kaynak.slice(bas, kaynak.indexOf("const denetimKilidi", bas));
  assert.match(govde, /tamDenetimKokTuru\(/, "tam denetimin kök turu saf gövdeden geçmiyor — çöküş kabuğun içinde yutulabilir");
  assert.match(govde, /tamDenetimSonucu\(denetlenenKokler, atlananKokler, darKok === undefined, cokenKokler\)/,
    "tam denetim turu çöken kökleri işarete bildirmiyor — çöküş yeniden sessizleşir");
  assert.doesNotMatch(govde, /catch \{ \/\* tam orkestrasyon/, "çöküşü yutan eski catch satırı geri gelmiş");
});

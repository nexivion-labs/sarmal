// ═══════════════════════════════════════════════════════════════════════════
// dogus.test.ts — 🎁 Doğuş paketi yazıcısının nöbeti (DPK-A02)
//
//   Üç söz sınanır: ① boş dizinde doğan proje GERÇEK denetimden sıfır hata ile
//   çıkar (flutter-create paritesi — CLI alt-süreçle, sahte değil) ② var olan
//   dosya ASLA ezilmez (dolu-dizin sözleşmesi) ③ kod türetimi Türkçe harfleri
//   güvenle ASCII kısaltmaya indirir.
// ═══════════════════════════════════════════════════════════════════════════

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { dogusYaz, dogusManifesti, dogusKodu, dogusRaporu } from "../src/dogus.ts";

const KOK = fileURLToPath(new URL("..", import.meta.url));

function geciciDizin(): string {
  return mkdtempSync(join(tmpdir(), "sarmal-dogus-"));
}

test("dogusKodu: Türkçe ad güvenli BÜYÜK kısaltmaya iner", () => {
  assert.equal(dogusKodu("bahçe projem"), "BAHCE-PROJEM");
  assert.equal(dogusKodu("Işık Ölçer"), "ISIK-OLCER");
  assert.equal(dogusKodu("  "), "PROJE");
});

/** Tek projenin onaylı manifesti — beş iskelet dosyası, yönerge ikizi ve kökün beş kapısı. */
const PROJE_MANIFESTI: readonly string[] = [
  "deneme_anadizin.sar",
  "is/durum/durum_devir.sar",
  "ogreti/ogrenme/dersler.sar",
  "ogreti/ogrenme/geribildirim.sar",
  "is/plan/ilk_plan.sar",
  "AGENTS.md",
  "CLAUDE.md",
  ".gitignore",
  ".mcp.json",
  ".claude/settings.json",
  ".claude/kanca/dogus-kilidi.sh",
  ".claude/kanca/denetim-kapisi.sh",
  "oz/siniflama/isaretci.json",
];

test("dogusManifesti: onaylı manifest — iskelet + yönerge ikizi + kökün kapıları, hepsi yer-tutucusuz doğar", () => {
  const m = dogusManifesti("deneme", "2026-07-17");
  assert.deepEqual(m.map((d) => d.yol), PROJE_MANIFESTI);
  for (const d of m) {
    assert.ok(!d.icerik.includes("{{"), `${d.yol} doldurulmamış yer-tutucu taşıyor`);
    if (TARIHSIZ_DOSYALAR.has(d.yol)) continue;
    assert.ok(d.icerik.includes("2026-07-17"), `${d.yol} doğum tarihini taşımıyor`);
  }
});

/**
 * Doğum tarihi taşımayan dosyalar ve GEREKÇESİ. Kapı ayarı yürütücünün KENDİ
 * şemasıyla okunur ve o şemada serbest bir metin alanı yoktur; oraya tarih
 * taşısın diye uydurma bir anahtar koymak dosyayı şema dışına düşürür ve doğan
 * kökün ilk turunu kancasız bırakma riski doğurur. Liste bilinçli olarak KAPALI
 * tutulur: yeni bir dosya buraya ancak yazılı bir gerekçeyle girer.
 */
const TARIHSIZ_DOSYALAR = new Set([".claude/settings.json"]);

test("dogusYaz + GERÇEK denetim: boş dizinde doğan proje sıfır hata verir", () => {
  const dizin = geciciDizin();
  try {
    const sonuc = dogusYaz(dizin, "bahce-deneme", "2026-07-17");
    assert.equal(sonuc.yazilan.length, PROJE_MANIFESTI.length);
    assert.equal(sonuc.atlanan.length, 0);
    assert.equal(sonuc.genisletilen.length, 0);
    const s = spawnSync(process.execPath, [join(KOK, "src", "sarmal.ts"), "denetle", dizin],
      { encoding: "utf8" });
    assert.equal(s.status, 0, `denetle sıfırla çıkmalı — çıktı:\n${s.stdout}\n${s.stderr}`);
    assert.match(s.stdout, /0 hata/, "doğan proje hatasız denetlenmeli");
  } finally {
    rmSync(dizin, { recursive: true, force: true });
  }
});

test("dolu-dizin sözleşmesi: var olan dosya ezilmez, atlanır ve raporlanır", () => {
  const dizin = geciciDizin();
  try {
    mkdirSync(join(dizin, "is", "durum"), { recursive: true });
    const emek = "// kullanıcının kendi emeği — dokunulmamalı\n";
    writeFileSync(join(dizin, "is", "durum", "durum_devir.sar"), emek, "utf8");
    const sonuc = dogusYaz(dizin, "deneme", "2026-07-17");
    assert.deepEqual(sonuc.atlanan, ["is/durum/durum_devir.sar"]);
    assert.equal(readFileSync(join(dizin, "is", "durum", "durum_devir.sar"), "utf8"), emek);
    assert.match(dogusRaporu(sonuc, dizin), /Dokunulmayanlar/u, "rapor ne yapılmadığını söylemeli");
    // İkinci koşu: hiçbir yeni dosya doğmaz (idempotens)
    const tekrar = dogusYaz(dizin, "deneme", "2026-07-17");
    assert.equal(tekrar.yazilan.length, 0);
    assert.equal(tekrar.genisletilen.length, 0, "istisnası tam olan yok sayma dosyasına ikinci kez dokunulmaz");
    assert.equal(tekrar.atlanan.length, PROJE_MANIFESTI.length);
    assert.match(dogusRaporu(tekrar, dizin), /paket daha önce kurulmuş/u);
  } finally {
    rmSync(dizin, { recursive: true, force: true });
  }
});

// ── GOC-A10 (Founder 2026-08-23): tek proje mi, çalışma alanı mı? ─────────────
//   Doğuş komutu artık türü sorar; çalışma alanı seçilince hedef ÇalışmaAlanı
//   kökü olur ve ilk proje onun altında kendi köküyle doğar (MIM-1.1).
import { dogusTuruCoz, dogusSorusu, DOGUS_TURLERI } from "../src/dogus.ts";

test("GOC-A10: dogusTuruCoz — serbest cevap iki türe iner, tanınmayan cevap tanımsız kalır", () => {
  assert.deepEqual(DOGUS_TURLERI, ["proje", "calisma-alani"]);
  for (const c of ["proje", "1", "tek", "Tek Proje"]) assert.equal(dogusTuruCoz(c), "proje", c);
  for (const c of ["calisma-alani", "2", "alan", "Çalışma Alanı", "çatı"]) assert.equal(dogusTuruCoz(c), "calisma-alani", c);
  assert.equal(dogusTuruCoz("bahçe"), undefined);
  assert.equal(dogusTuruCoz(undefined), undefined);
  assert.match(dogusSorusu(), /tek proje/u);
  assert.match(dogusSorusu(), /çalışma alanı/u);
  assert.match(dogusSorusu(), /MIM-1\.1/u, "soru kanon dayanağını söyler");
});

test("GOC-A10: çalışma alanı manifesti — çatı ilanı + dil bağlamı + ilk projenin kendi kökündeki tam paketi", () => {
  const m = dogusManifesti("Nexi Çatı", "2026-08-25", "calisma-alani");
  assert.deepEqual(m.map((d) => d.yol), [
    "nexi_çatı_anadizin.sar",
    "AGENTS.md",
    "CLAUDE.md",
    ".gitignore",
    ".mcp.json",
    ".claude/settings.json",
    ".claude/kanca/dogus-kilidi.sh",
    ".claude/kanca/denetim-kapisi.sh",
    "oz/siniflama/isaretci.json",
    ...PROJE_MANIFESTI.map((y) => `ilk_proje/${y.replace("deneme_anadizin.sar", "ilk_proje_anadizin.sar")}`),
  ]);
  for (const d of m) assert.ok(!d.icerik.includes("{{"), `${d.yol} doldurulmamış yer-tutucu taşıyor`);
  const cati = m[0].icerik;
  assert.match(cati, /ÇalışmaAlanı\( kod: CAL-NEXI-CATI, ad: "Nexi Çatı"/u, "çatı ÇalışmaAlanı köküyle doğar");
  assert.match(cati, /Kitaplık\( kod: KTP-ILK-PROJE, yol: "ilk_proje\/"/u, "ilk proje çatıda Kitaplık olarak ilan edilir");
  const ilkAnadizin = m.find((d) => d.yol === "ilk_proje/ilk_proje_anadizin.sar")!;
  assert.match(ilkAnadizin.icerik, /Proje\( kod: PRJ-ILK-PROJE, ad: "ilk_proje", rejim: katı/u, "ilk proje kendi Proje köküyle doğar");
  // ilk proje adı seçilebilir
  const m2 = dogusManifesti("çatı", "2026-08-25", "calisma-alani", "Bahçe Uygulaması");
  assert.ok(m2.some((d) => d.yol === "bahçe_uygulaması/bahçe_uygulaması_anadizin.sar"));
  assert.match(m2[0].icerik, /yol: "bahçe_uygulaması\/"/u);
  // proje türü değişmedi (geriye uyumluluk)
  assert.deepEqual(dogusManifesti("deneme", "2026-08-25", "proje").map((d) => d.yol), dogusManifesti("deneme", "2026-08-25").map((d) => d.yol));
});

test("GOC-A10: dogusYaz(calisma-alani) + GERÇEK denetim — kökten başlayan yapı sıfır hata verir", () => {
  const dizin = geciciDizin();
  try {
    const sonuc = dogusYaz(dizin, "deneme-cati", "2026-08-25", "calisma-alani", "ilk_proje");
    assert.equal(sonuc.tur, "calisma-alani");
    assert.equal(sonuc.proje, "ilk_proje");
    assert.equal(sonuc.yazilan.length, 9 + PROJE_MANIFESTI.length, "çatı kendi kapılarını taşır, ilk proje de kendi kapılarını");
    assert.ok(readFileSync(join(dizin, "deneme_cati_anadizin.sar"), "utf8").includes("ÇalışmaAlanı("));
    assert.match(dogusRaporu(sonuc, dizin), /çalışma alanı "deneme-cati"/u);
    assert.match(dogusRaporu(sonuc, dizin), /ilk_proje\/is\/plan\/ilk_plan\.sar/u, "rapor ilk projenin planına yönlendirir");
    const s = spawnSync(process.execPath, [join(KOK, "src", "sarmal.ts"), "denetle", dizin], { encoding: "utf8" });
    assert.equal(s.status, 0, `denetle sıfırla çıkmalı — çıktı:\n${s.stdout}\n${s.stderr}`);
    assert.match(s.stdout, /0 hata/, "doğan çalışma alanı hatasız denetlenmeli");
  } finally {
    rmSync(dizin, { recursive: true, force: true });
  }
});

test("GOC-A10: CLI — uçbirim yokken --tur verilmezse tek proje varsayılır ve ipucu basılır; --tur calisma-alani çatı doğurur; geçersiz tür reddedilir", () => {
  const a = geciciDizin();
  const b = geciciDizin();
  try {
    const s1 = spawnSync(process.execPath, [join(KOK, "src", "sarmal.ts"), "doğuş", a, "--ad", "tekil"], { encoding: "utf8" });
    assert.equal(s1.status, 0, s1.stderr);
    assert.match(s1.stderr, /tek proje varsayıldı/u, "uçbirim yokken varsayım açıkça söylenir");
    assert.match(s1.stdout, /"tekil" \(kod kısaltması: TEKIL\)/u);
    assert.ok(readFileSync(join(a, "tekil_anadizin.sar"), "utf8").includes("Proje( kod: PRJ-TEKIL"));
    const s2 = spawnSync(process.execPath, [join(KOK, "src", "sarmal.ts"), "doğuş", b, "--tur", "calisma-alani", "--ad", "çatım", "--proje", "ilk"], { encoding: "utf8" });
    assert.equal(s2.status, 0, s2.stderr);
    assert.doesNotMatch(s2.stderr, /varsayıldı/u);
    assert.match(s2.stdout, /çalışma alanı "çatım"/u);
    assert.ok(readFileSync(join(b, "ilk", "ilk_anadizin.sar"), "utf8").includes("Proje( kod: PRJ-ILK"));
    const s3 = spawnSync(process.execPath, [join(KOK, "src", "sarmal.ts"), "doğuş", join(b, "yok"), "--tur", "bahçe"], { encoding: "utf8" });
    assert.equal(s3.status, 1);
    assert.match(s3.stderr, /--tur yalnız "proje" ya da "calisma-alani"/u);
  } finally {
    rmSync(a, { recursive: true, force: true });
    rmSync(b, { recursive: true, force: true });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// BKM-DNT-A15 · DOĞAN KÖKÜN KAPILARI
//
//   Aşağıdaki nöbetler kapıların VARLIĞINI değil DAVRANIŞINI ölçer. Varlık
//   ölçümü tek başına yanıltıcıdır: yok sayma dosyası yazılmış olabilir fakat
//   istisnası eksikse hafıza yine depoya girmez, kanca kurulmuş olabilir fakat
//   yanlış pozitif üretiyorsa ajanın işini keser. Bu yüzden her nöbet gerçek bir
//   git deposu ya da gerçek bir kanca koşumu üstünden ölçer.
// ═══════════════════════════════════════════════════════════════════════════

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname } from "node:path";
import {
  KURESEL_YOK_SAYMA_DESENLERI, yokSaymaIstisnaSatirlari, yokSaymaIstisnasiEksikleri, yokSaymaRaporu,
} from "../src/yonerge-ikizi.ts";
import { SARMAL_KURULUM_KOKU, SARMAL_MCP_YOLU, SARMAL_MOTOR_YOLU } from "../src/dogus.ts";

/** Giriş ilanı deseni parçalardan kurulur: kaynak metni okuyan kancalar bu
 *  dosyayı bir yazım hedefi sanmasın (ölçüm aracı ölçtüğü kapıyı tetiklemez). */
const ILAN_SONEKI = "_anadizin" + ".sar";

/** Fikstür deposu: küresel yok sayma kuralının birebir taklidi yerel ayara konur. */
function kureselYokSaymaliDepo(desenler: readonly string[]): { kok: string; sil: () => void } {
  const ust = geciciDizin();
  const kural = join(ust, "kuresel_yoksayma");
  writeFileSync(kural, desenler.join("\n") + "\n", "utf8");
  const kok = join(ust, "depo");
  mkdirSync(kok, { recursive: true });
  execFileSync("git", ["-C", kok, "init", "-q"], { stdio: "ignore" });
  execFileSync("git", ["-C", kok, "config", "core.excludesFile", kural], { stdio: "ignore" });
  return { kok, sil: () => rmSync(ust, { recursive: true, force: true }) };
}

/** `git check-ignore` ile ölçüm: dosya yok sayılıyor mu? */
function yokSayiliyorMu(kok: string, goreli: string): boolean {
  try {
    execFileSync("git", ["-C", kok, "check-ignore", "-q", goreli], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

test("BKM-DNT-A15 · yok sayma istisnası: küresel kural *.sar taşısa bile doğan projede hiçbir kaynak yok sayılmaz", () => {
  const { kok, sil } = kureselYokSaymaliDepo(KURESEL_YOK_SAYMA_DESENLERI);
  try {
    dogusYaz(kok, "fikstur", "2026-09-09");
    const olculenler = [
      "fikstur" + ILAN_SONEKI,
      "is/plan/ilk_plan.sar",
      "is/durum/durum_devir.sar",
      "ogreti/ogrenme/dersler.sar",
      "ogreti/ogrenme/geribildirim.sar",
      "CLAUDE.md",
      "AGENTS.md",
    ];
    for (const y of olculenler) {
      assert.ok(existsSync(join(kok, y)), `${y} diskte yok — ölçüm konusuz kalır`);
      assert.equal(yokSayiliyorMu(kok, y), false, `${y} küresel kurala takıldı: proje hafızası depoya girmiyor`);
    }
    // Kontrol ölçümü: gerçekten yok sayılan bir dosya da vardır. Nöbet her şeye
    // yeşil demiyor; git kuralının kendisi bu depoda fiilen çalışıyor.
    mkdirSync(join(kok, "node_modules"), { recursive: true });
    writeFileSync(join(kok, "node_modules", "x.txt"), "x", "utf8");
    assert.equal(yokSayiliyorMu(kok, "node_modules/x.txt"), true, "yok sayma dosyası fiilen çalışmıyor — ölçüm anlamsız");
  } finally {
    sil();
  }
});

test("BKM-DNT-A15 · yok sayma dosyası: var olan satırlar korunur, istisna tek kez eklenir, ikinci koşu dokunmaz", () => {
  const dizin = geciciDizin();
  try {
    const emek = "# kullanıcının kendi kuralları\n*.log\ngizli/\n";
    writeFileSync(join(dizin, ".gitignore"), emek, "utf8");
    const sonuc = dogusYaz(dizin, "deneme", "2026-09-09");
    assert.deepEqual(sonuc.genisletilen, [".gitignore"], "eksik istisnası olan dosya genişletilir, atlanmaz");
    const yeni = readFileSync(join(dizin, ".gitignore"), "utf8");
    for (const satir of emek.split("\n").filter(Boolean)) {
      assert.ok(yeni.includes(satir), `mevcut satır silinmiş: ${satir}`);
    }
    assert.deepEqual(yokSaymaIstisnasiEksikleri(yeni), [], "istisna tam değil");
    for (const istisna of yokSaymaIstisnaSatirlari()) {
      const kez = yeni.split("\n").filter((s) => s.trim() === istisna).length;
      assert.equal(kez, 1, `${istisna} ${kez} kez yazıldı — istisna tek kez yazılmalı`);
    }
    assert.match(dogusRaporu(sonuc, dizin), /Genişletilenler/u, "rapor genişletmeyi ayrı başlıkla söyler");
    // İkinci koşu: istisna tamdır, dosyaya bir daha dokunulmaz.
    const oncekiBayt = readFileSync(join(dizin, ".gitignore"), "utf8");
    const tekrar = dogusYaz(dizin, "deneme", "2026-09-09");
    assert.deepEqual(tekrar.genisletilen, []);
    assert.ok(tekrar.atlanan.includes(".gitignore"));
    assert.equal(readFileSync(join(dizin, ".gitignore"), "utf8"), oncekiBayt, "ikinci koşu dosyayı değiştirdi");
  } finally {
    rmSync(dizin, { recursive: true, force: true });
  }
});

test("BKM-DNT-A15 · yokSaymaIstisnasiEksikleri: yorum satırı istisna KURMAZ, yalnız anar", () => {
  assert.deepEqual(yokSaymaIstisnasiEksikleri(undefined), yokSaymaIstisnaSatirlari(), "dosya yoksa hepsi eksiktir");
  assert.deepEqual(yokSaymaIstisnasiEksikleri("# !*.sar\n!CLAUDE.md\n!AGENTS.md\n"), ["!*.sar"]);
  assert.deepEqual(yokSaymaIstisnasiEksikleri("  !*.sar  \n!CLAUDE.md\n!AGENTS.md"), [], "baştaki ve sondaki boşluk kırpılır");
  assert.match(yokSaymaRaporu(join(geciciDizin(), "olmayan")), /🛡️⛔/u, "istisnası olmayan kök kırmızı okunur");
});

test("BKM-DNT-A15 · doğan kök tek başına açıldığında beş kapının beşi de yerindedir", () => {
  const dizin = geciciDizin();
  try {
    dogusYaz(dizin, "kapili", "2026-09-09");

    // ① yok sayma istisnası
    assert.deepEqual(yokSaymaIstisnasiEksikleri(readFileSync(join(dizin, ".gitignore"), "utf8")), []);

    // ② yürütücü ayarı — sunucunun adresi diskte GERÇEKTEN vardır
    const ayar = JSON.parse(readFileSync(join(dizin, ".mcp.json"), "utf8")) as
      { mcpServers: Record<string, { command: string; args: string[] }> };
    const sunucu = ayar.mcpServers.sarmal;
    assert.equal(sunucu.command, "node");
    assert.equal(sunucu.args[0], SARMAL_MCP_YOLU);
    assert.ok(existsSync(sunucu.args[0]), "yürütücü ayarı var olmayan bir sunucuyu gösteriyor");

    // ③ yönerge ikizi — iki kanat BAYT ÖZDEŞ
    const claude = readFileSync(join(dizin, "CLAUDE.md"), "utf8");
    const agents = readFileSync(join(dizin, "AGENTS.md"), "utf8");
    assert.equal(claude, agents, "yönerge ikizi doğuş anında ayrışmış");
    assert.ok(claude.length > 0);

    // ④ kapı kancaları — kurulum kökün KENDİ dosyasında, motorun adresi gerçek
    const kancaAyari = readFileSync(join(dizin, ".claude", "settings.json"), "utf8");
    assert.match(kancaAyari, /dogus-kilidi\.sh/u);
    assert.match(kancaAyari, /denetim-kapisi\.sh/u);
    for (const k of ["dogus-kilidi.sh", "denetim-kapisi.sh"]) {
      assert.ok(existsSync(join(dizin, ".claude", "kanca", k)), `${k} doğmadı`);
    }
    const kapi = readFileSync(join(dizin, ".claude", "kanca", "denetim-kapisi.sh"), "utf8");
    assert.ok(kapi.includes(SARMAL_MOTOR_YOLU), "denetim kapısı motorun adresini taşımıyor");
    assert.ok(existsSync(SARMAL_MOTOR_YOLU), "motorun adresi diskte yok");

    // ⑤ kanon işaretçisi — KOPYA DEĞİL ADRES; taban kayıt o adreste gerçekten var
    const isaretci = JSON.parse(readFileSync(join(dizin, "oz", "siniflama", "isaretci.json"), "utf8")) as
      { kanonKoku: string; kayit: string };
    assert.equal(isaretci.kanonKoku, SARMAL_KURULUM_KOKU);
    assert.ok(existsSync(join(isaretci.kanonKoku, isaretci.kayit)), "işaretçi var olmayan bir kanonu gösteriyor");
    assert.ok(!existsSync(join(dizin, "oz", "siniflama", "kayit.json")),
      "kanon doğan köke KOPYALANMIŞ — işaretçi adres olmalı, kopya değil (kanon sahibine özel kapılar yanlış ağaçta uyanır)");
  } finally {
    rmSync(dizin, { recursive: true, force: true });
  }
});

/** Kancayı gerçek bir kanca girdisiyle koşturur ve reddedip reddetmediğini döndürür. */
function kilitReddettiMi(kancaYolu: string, girdi: unknown): boolean {
  const s = spawnSync("sh", [kancaYolu], { input: JSON.stringify(girdi), encoding: "utf8" });
  return /DOĞUŞ KİLİDİ/u.test(`${s.stdout}${s.stderr}`);
}

test("BKM-DNT-A15 · doğuş kilidi: gerçek yazım hedefini reddeder, deseni yalnızca ANAN komutu geçirir", () => {
  const dizin = geciciDizin();
  try {
    dogusYaz(dizin, "kilitli", "2026-09-09");
    const kanca = join(dizin, ".claude", "kanca", "dogus-kilidi.sh");
    const varOlan = join(dizin, "kilitli" + ILAN_SONEKI);
    const yeni = join(dizin, "yeni" + ILAN_SONEKI);
    const bash = (command: string) => ({ tool_name: "Bash", cwd: dizin, tool_input: { command } });

    // REDDEDİLENLER — hepsi GERÇEK bir yazım hedefi kurar.
    assert.equal(kilitReddettiMi(kanca, { tool_name: "Write", cwd: dizin, tool_input: { file_path: yeni } }), true,
      "araç yolu doğrudan bildiriyor: yeni bir giriş ilanı elle yazılamaz");
    assert.equal(kilitReddettiMi(kanca, bash(`echo x > ${yeni}`)), true, "yönlendirme hedefi ölçülmedi");
    assert.equal(kilitReddettiMi(kanca, bash(`cp ${varOlan} ${yeni}`)), true, "kopyalama hedefi ölçülmedi");
    assert.equal(kilitReddettiMi(kanca, bash(`echo x | tee ${yeni}`)), true, "tee hedefi ölçülmedi");

    // GEÇİRİLENLER — hiçbiri yeni bir giriş ilanı YAZMAZ.
    assert.equal(kilitReddettiMi(kanca, { tool_name: "Write", cwd: dizin, tool_input: { file_path: varOlan } }), false,
      "var olan giriş ilanını düzenlemek serbesttir");
    assert.equal(kilitReddettiMi(kanca, bash(`cat > ${join(dizin, "not.md")} <<EOF\nkural: -> ${yeni} elle yazilmaz\nEOF`)), false,
      "belge GÖVDESİ komut değildir: deseni yalnızca anan not reddedildi (2026-09-09 yanlış pozitifi)");
    assert.equal(kilitReddettiMi(kanca, bash(`echo dogus paketi -> ${yeni} yazar`)), false,
      "ok işareti yönlendirme değildir");
    // Gövdede GERÇEK bir yönlendirme deyimi ALINTILANIYOR: bir çalışma notu
    // yasak komutu örnek olarak yazabilir. Kabuk için bu satır komut değil
    // veridir; kanca da öyle okumalıdır. Ok kalkanı bu vakayı YAKALAMAZ, çünkü
    // ortada gerçek bir ">" vardır — vakayı yalnız heredoc sökümü geçirir.
    assert.equal(
      kilitReddettiMi(kanca, bash(`cat > ${join(dizin, "not.md")} <<NOT\nyasak ornek: echo x > ${yeni}\nNOT`)),
      false,
      "heredoc GÖVDESİNDE alıntılanan yönlendirme komut sanıldı — gövde veridir, komut değil");
    assert.equal(kilitReddettiMi(kanca, bash(`cat ${varOlan}`)), false, "salt okuma yazım değildir");
    assert.equal(kilitReddettiMi(kanca, bash("echo x > olmayan/dizin/yeni" + ILAN_SONEKI)), false,
      "üst dizini diskte olmayan göreli yol: adres çözülemez, kilit uydurma adrese dayanarak reddetmez");
  } finally {
    rmSync(dizin, { recursive: true, force: true });
  }
});

test("BKM-DNT-A15 · doğan ağaç Kitaplık kademesi açar ve giriş ilanına Faz yazılmaz (Founder 2026-09-09)", () => {
  const proje = dogusManifesti("deneme", "2026-09-09")[0].icerik;
  const cati = dogusManifesti("çatı", "2026-09-09", "calisma-alani")[0].icerik;
  for (const [ad, ilan] of [["proje", proje], ["çalışma alanı", cati]] as const) {
    assert.match(ilan, /Kitaplık\(/u, `${ad} giriş ilanı Kitaplık kademesi açmıyor`);
    assert.doesNotMatch(ilan, /^ {2}Raf\(/mu, `${ad} giriş ilanı kökün altına çıplak Raf yazıyor`);
    assert.doesNotMatch(ilan, /^\s*Faz\(/mu, `${ad} giriş ilanına zaman ekseni sızmış`);
  }
  // Rehber şablonlarıyla aynı mimari: ikisi de Kitaplık öğretir (tek öğretim yüzeyi).
  for (const sablon of ["proje.sar", "calisma_alani.sar"]) {
    const rehber = readFileSync(join(KOK, "..", "..", "ogreti", "sablon", sablon), "utf8");
    assert.match(rehber, /Kitaplık\(/u, `${sablon} Kitaplık öğretmiyor`);
    assert.doesNotMatch(rehber, /^ {2}Raf\(/mu, `${sablon} kökün altına çıplak Raf yazıyor`);
  }
});

test("BKM-DNT-A15 · kurulum adresleri diskte gerçektir (uydurma yol yazılmaz)", () => {
  assert.ok(existsSync(SARMAL_KURULUM_KOKU), "kurulum kökü çözülemedi");
  assert.ok(existsSync(SARMAL_MCP_YOLU), "sunucu giriş dosyası çözülemedi");
  assert.ok(existsSync(SARMAL_MOTOR_YOLU), "motor giriş dosyası çözülemedi");
  assert.equal(dirname(SARMAL_MCP_YOLU), dirname(SARMAL_MOTOR_YOLU));
});

#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// denetim-kapisi.mjs — 🚪 KAYNAK YAZIM KAPISI (PostToolUse · Write | Edit | Bash)
//   Doğuş paketi üretti: {{TARIH}} · kök: {{AD}}
//
//   HÜKÜM. Bir `.sar` dosyasına dokunulduktan sonra denetim İNSAN ÖFKESİYLE
//   değil KANCAYLA koşar. Hata varsa çıktı ajana ZORLA döner (çıkış kodu 2) ve
//   ajan hata varken ikinci bir kaynak dosyası yazamaz; uyarı ile temiz sonuç
//   bilgi olarak döner. Gerekçe ölçülmüştür: kapı atlanabilir olduğu sürece
//   atlanmaktadır ve metinle verilen her uyarı en az yedi kez unutulmuştur.
//
//   İŞLETİM SİSTEMİNDEN BAĞIMSIZDIR (HTR-DOGUS-WINDOWS-KANCALARI · 2026-10-22).
//   Bu dosya kabuk sürümünün (ogreti/sablon/dogus/denetim_kapisi.sh) Node ile
//   yazılmış karşılığıdır ve yalnız Node'un yerleşik modüllerini kullanır; `jq`,
//   `find` ve `grep` gerektirmez. Kanca ayarı onu kabuksuz çağırır, dolayısıyla
//   Windows'ta Git Bash kurulu olmasa da çalışır. İki sürüm aynı girdiye aynı
//   çıkış kodunu ve aynı tanıyı verir; eşlik doğuş paketinin sınamasında ölçülür.
//
//   KÖK. Denetim bu kökün kendisinde koşar; kökü CLAUDE_PROJECT_DIR bildirir,
//   dolayısıyla ajanın o anki çalışma dizini yanlış bir ağacı denetlemeye yol
//   açmaz. Motorun adresi TAŞINABİLİRDİR: {{KOKDEGISKENI}} ortam değişkeninden
//   çözülür ve varsayılan taşımaz, çünkü varsayılan bir değer arızayı susturur ve
//   kullanıcıyı yanlış bir kuruluma sessizce bağlar.
//
//   İKİ DİLLİ ÖZET (HTR-KANCA-OZETI-IKI-DILLI-DEGIL). Motor SARMAL_DIL değişkenine
//   uyar; kapı özet satırını Türkçe ve İngilizce sözcüklerin ikisiyle de arar,
//   dolayısıyla İngilizce kipte de özet düşmez.
//
//   ARIZA-GÜVENLİ: girdi okunamazsa kapı sessizce çekilir. MOTOR bundan AYRILIR:
//   motorun bulunamaması ürünün kendi bağıdır ve sessiz geçilmez — kapı tek
//   satırla durumu söyler ve onarımı gösterir.
// ═══════════════════════════════════════════════════════════════════════════
import { closeSync, lstatSync, mkdtempSync, openSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

/** Motorun taşınabilir adresi; `${DEĞİŞKEN}` biçimi koşum anında ortamdan genişletilir. */
const MOTOR_SABLONU = "{{MOTOR}}";
/** Motorun kurulum kökünü taşıyan ortam değişkeninin adı. */
const KOK_DEGISKENI = "{{KOKDEGISKENI}}";
/** "Son iki dakika" penceresi (`find -mmin -2` ile aynı: 120 saniyeden genç). */
const PENCERE_MS = 120_000;
/** Arama derinliği (`find -maxdepth 8` ile aynı). */
const DERINLIK = 8;
/** Özet satırının iki dildeki sözcükleri. */
const OZET_DESENI = /ÖZET:|Yapı temiz|SUMMARY:|structure is clean/u;
const HATA_OZETI_DESENI = /ÖZET:|SUMMARY:/u;

/** Motorun yolunu ortamdan genişletir; tanımsız değişken boş dizgeye açılır (kabukla aynı). */
export function motorYolu(ortam = process.env) {
  return MOTOR_SABLONU.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/gu, (_, ad) => ortam[ad] ?? "");
}

/** Motor bulunamadığında basılan tek satır; onarım cümlesi işletim sistemine göre yazılır. */
export function motorYokMetni(kok, motor, platform = process.platform) {
  const onarim = platform === "win32"
    ? `(Windows'ta: setx ${KOK_DEGISKENI} "<Sarmal kurulumunun kökü>")`
    : `(kabuk açılış dosyana: export ${KOK_DEGISKENI}=<Sarmal kurulumunun kökü>)`;
  return `🚪⚠️ sarmal-kapı · ${kok} · DENETİM KOŞMADI: motor bulunamadı (${motor}) — onarım: ${KOK_DEGISKENI} ortam değişkenini Sarmal kurulumunun köküne ayarla ${onarim} ve oturumu yeniden aç.`;
}

/**
 * Kökün altında adı `desen`e uyan ve `uygun(durum, simdi)` sınamasından geçen
 * girdileri bulur; `find KOK -maxdepth 8 -name … -not -path '*\/node_modules\/*'
 * -not -path '*\/.git\/*'` ile aynıdır. Sembolik bağlantılar izlenmez. Dönen yollar
 * köke görelidir ve eğik çizgiyle yazılır.
 */
export function girdileriBul(kok, desen, uygun, simdi = Date.now(), platform = process.platform) {
  const sonuc = [];
  const ziyaret = (dizin, goreli, derin) => {
    let girdiler;
    try { girdiler = readdirSync(dizin, { withFileTypes: true }); } catch { return; }
    for (const g of girdiler) {
      const rel = goreli ? `${goreli}/${g.name}` : g.name;
      const tam = `${kok}/${rel}`;
      const yolMetni = platform === "win32" ? tam.replaceAll("\\", "/") : tam;
      const disarida = yolMetni.includes("/node_modules/") || yolMetni.includes("/.git/");
      if (!disarida && desen.test(g.name)) {
        try { if (uygun(lstatSync(tam), simdi)) sonuc.push(rel); } catch { /* okunamayan girdi sayılmaz */ }
      }
      if (g.isDirectory() && derin + 1 < DERINLIK) ziyaret(tam, rel, derin + 1);
    }
  };
  ziyaret(kok, "", 0);
  return sonuc;
}

/** Son iki dakikada içeriği ya da durumu değişmiş bir `.sar` var mı (Bash dokunuşu için). */
export function yeniDegisenVarMi(kok, simdi = Date.now(), platform = process.platform) {
  return girdileriBul(kok, /\.sar$/su,
    (s, t) => t - s.mtimeMs < PENCERE_MS || t - s.ctimeMs < PENCERE_MS, simdi, platform).length > 0;
}

/** Son iki dakikada adına mühür yazılmış dosyaların listesi; kabukla aynı biçimde sıralı. */
export function yeniMuhurler(kok, simdi = Date.now(), platform = process.platform) {
  return girdileriBul(kok, /^@.*@_.*\.sar$/su, (s, t) => t - s.ctimeMs < PENCERE_MS, simdi, platform)
    .sort((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b)))
    .slice(0, 8);
}

/** `jq -r '… // ""'` ile kabuğun komut yerine koymasının birleşik karşılığı. */
function jqMetni(v) {
  if (v === undefined || v === null || v === false) return "";
  const s = typeof v === "string" ? v : JSON.stringify(v, null, 2);
  return s.replace(/\n+$/u, "");
}

/** jq'nun `{hookSpecificOutput:{…, additionalContext:.}}` çıktısıyla bayt bayt aynı biçim. */
function baglamCiktisi(metin) {
  const cikti = { hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: metin } };
  return `${JSON.stringify(cikti, null, 2).replace(/\u007f/gu, "\\u007f")}\n`;
}

/** Motoru koşturur; standart çıktı ile hata çıktısı kabuktaki gibi tek dosyada birleşir. */
function denetimKostur(motor, kok) {
  const dizin = mkdtempSync(join(tmpdir(), "sarmal-kapi-"));
  try {
    const dosya = join(dizin, "gunluk");
    const fd = openSync(dosya, "w");
    let durum;
    try {
      durum = spawnSync(process.execPath, [motor, "denetle", kok], { stdio: ["ignore", fd, fd] }).status;
    } finally {
      closeSync(fd);
    }
    return { basarili: durum === 0, metin: readFileSync(dosya, "utf8") };
  } finally {
    rmSync(dizin, { recursive: true, force: true });
  }
}

/**
 * Kapının kararı (disk ve motorla etkileşir). Dönen nesne kancanın yazacağı
 * standart çıktıyı, hata çıktısını ve çıkış kodunu taşır.
 */
export function kapi(girdi, kok, ortam = process.env, platform = process.platform) {
  const sessiz = { stdout: "", stderr: "", kod: 0 };
  const g = girdi !== null && typeof girdi === "object" ? girdi : {};
  const arac = jqMetni(g.tool_name);
  const girdiAlani = g.tool_input !== null && typeof g.tool_input === "object" ? g.tool_input : {};

  // Kapı yalnız GERÇEK bir kaynak dokunuşunda uyanır. Write ve Edit hedefini
  // kendisi bildirir; Bash için son iki dakikada değişmiş bir `.sar` dosyası
  // aranır, çünkü yazımın hangi kabuk deyimiyle yapıldığı kapıyı ilgilendirmez.
  // Değişiklik tarihi ile birlikte durum tarihi de okunur: yeniden adlandırma
  // değişiklik tarihini korur, yalnız durum tarihini günceller.
  if (arac === "Write" || arac === "Edit") {
    if (!jqMetni(girdiAlani.file_path).endsWith(".sar")) return sessiz;
  } else if (arac === "Bash") {
    if (!jqMetni(girdiAlani.command).includes(".sar")) return sessiz;
    if (!yeniDegisenVarMi(kok, Date.now(), platform)) return sessiz;
  } else {
    return sessiz;
  }

  // MOTOR BULUNAMAZSA KAPI SUSMAZ (EKL-F6-A08 · Founder hükmü 2026-09-16). Kapı
  // yine BLOKLAMAZ (çıkış 0): ortada bir kaynak hatası yoktur, yalnız denetim
  // koşamamıştır.
  const motor = motorYolu(ortam);
  let motorVar = false;
  try { motorVar = statSync(motor).isFile(); } catch { motorVar = false; }
  if (!motorVar) return { stdout: baglamCiktisi(motorYokMetni(kok, motor, platform)), stderr: "", kod: 0 };

  // YENİ MÜHÜR GÖRÜNÜR BİR OLAYDIR (MIM-3.4). Mühür meşru bir beyandır ve kapıyı
  // durdurmaz, fakat sessiz de geçemez.
  const muhurler = yeniMuhurler(kok, Date.now(), platform);
  const muhur = muhurler.length > 0 ? ` · 📛 yeni mühür: ${muhurler.map((m) => `${m} `).join("")}` : "";

  const { basarili, metin } = denetimKostur(motor, kok);
  const satirlar = metin.split("\n");
  if (basarili) {
    const ozet = satirlar.find((s) => OZET_DESENI.test(s));
    return { stdout: baglamCiktisi(`🚪✅ sarmal-kapı · ${kok} · ${ozet || "denetim temiz"}${muhur}`), stderr: "", kod: 0 };
  }
  let hata = `✖ sarmal-kapı · ${kok} · DENETİM HATA VERDİ — hata varken ikinci kaynak dosyası yazılmaz, önce düzelt:${muhur}\n`;
  for (const s of satirlar.filter((x) => x.startsWith("✖")).slice(0, 12)) hata += `${s}\n`;
  const ozet = satirlar.find((s) => HATA_OZETI_DESENI.test(s));
  if (ozet !== undefined) hata += `${ozet}\n`;
  return { stdout: "", stderr: hata, kod: 2 };
}

/**
 * Kabuğun `$PWD` değeri: ortamdaki PWD bu dizini gösteriyorsa odur (sembolik
 * bağlantılı yol korunur), göstermiyorsa fiziksel çalışma dizinidir.
 */
function kabukPwd() {
  const fiziksel = process.cwd();
  const ortam = process.env.PWD;
  if (ortam && ortam.startsWith("/")) {
    try {
      const a = statSync(ortam);
      const b = statSync(fiziksel);
      if (a.dev === b.dev && a.ino === b.ino) return ortam;
    } catch { /* PWD geçersizse fiziksel dizin kullanılır */ }
  }
  return fiziksel;
}

async function ana() {
  const kok = process.env.CLAUDE_PROJECT_DIR || kabukPwd();
  let metin = "";
  try {
    process.stdin.setEncoding("utf8");
    for await (const parca of process.stdin) metin += parca;
  } catch {
    return;
  }
  let girdi;
  try { girdi = JSON.parse(metin); } catch { girdi = {}; }
  const sonuc = kapi(girdi, kok);
  if (sonuc.stdout) process.stdout.write(sonuc.stdout);
  if (sonuc.stderr) process.stderr.write(sonuc.stderr);
  process.exitCode = sonuc.kod;
}

/** Betik kanca olarak mı koşuyor, yoksa bir sınama tarafından mı yüklendi. */
function anaModulMu() {
  const arg = process.argv[1];
  if (arg === undefined) return false;
  return basename(arg).toLowerCase() === basename(fileURLToPath(import.meta.url)).toLowerCase();
}

if (anaModulMu()) await ana();

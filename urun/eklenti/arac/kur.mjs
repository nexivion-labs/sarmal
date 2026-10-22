// ═══════════════════════════════════════════════════════════════════════════
// arac/kur.mjs — 📦 TEK KOMUTLA PAKETLE VE KUR
//
//   Founder'ın deneme döngüsünü kısaltır. Bugüne kadar bu iş beş elle adımdı:
//   sürümü yükselt, geçici çalışma ağacı aç, node_modules'ü bağla, paketle,
//   kur, ağacı temizle. Beş adımın her biri unutulabilir ve biri unutulunca
//   Founder YANLIŞ SÜRÜMÜ dener; bu, bugün bilfiil yaşandı.
//
//   KRİTİK TASARIM HÜKMÜ — paket ÇALIŞMA AĞACINDAN değil, mühürlenmiş HEAD'den
//   üretilir. Sebebi ölçülmüş bir olaydır: eklenti kaynakları çekirdekten yirmi
//   dört dosya içeri alır, dolayısıyla paralel koşan bir ajanın yarım işi
//   sessizce pakete girer. Founder o paketi denediğinde gördüğü kusur kimin
//   olduğu belirsizleşir ve bir tur boşa gider. Geçici çalışma ağacı bu
//   belirsizliği yapısal olarak imkânsız kılar.
//
//   DERLEME DAMGASI VE KURULUM DOĞRULAMASI (EKL-F6-A11). Geçici ağaçtaki paket
//   bildirimine üretildiği işlemenin kimliği yazılır; ana ağaçtaki bildirim hiç
//   değişmez. Kurulumdan hemen sonra kurulu paket, VS Code'un kendi kayıt
//   dosyasından okunur ve az önce üretilen paketle sürüm ile damga üzerinden
//   karşılaştırılır. Aynı numarayla yeniden paketlenen eklenti düzenleyicide
//   tazelenmez (HTR-SURUM-DAMGASI-TUZAGI); bu ayrışma artık kurulumun hemen
//   ardından adıyla söylenir ve betik sıfırdan farklı kodla çıkar. Karşılaştırma
//   saf gövdededir (src/surum-tazeligi.ts) ve eklenti süitinde sınanır.
//   `--yerel` paketi damgasızdır, çünkü çalışma ağacı bir işlemeye karşılık gelmez;
//   o kipte yalnız sürüm karşılaştırılır.
//
//   Kullanım:  node arac/kur.mjs           → HEAD'den paketle ve kur
//              node arac/kur.mjs --yerel   → çalışma ağacından paketle (riskli)
//              node arac/kur.mjs --yalniz-paketle
// ═══════════════════════════════════════════════════════════════════════════
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, symlinkSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { damgaliBildirim, kurulumuDogrula } from "../src/surum-tazeligi.ts";

const EKLENTI = resolve(fileURLToPath(new URL("..", import.meta.url)));
const DEPO = resolve(EKLENTI, "..", "..");
const UZANTI_KLASORU = join(homedir(), ".vscode", "extensions");
const bayrak = (ad) => process.argv.includes(ad);

/** Dosyayı okur; okunamayan dosya için tanımsız döner. */
function okuVarsa(yol) {
  try { return readFileSync(yol, "utf8"); } catch { return undefined; }
}

/** Geçici ağaçtaki paket bildirimini işleme kimliğiyle damgalar ve damgayı döndürür. */
function damgala(eklentiDizini) {
  const isleme = execFileSync("git", ["rev-parse", "HEAD"], { cwd: eklentiDizini, encoding: "utf8" }).trim();
  const yol = join(eklentiDizini, "package.json");
  writeFileSync(yol, damgaliBildirim(readFileSync(yol, "utf8"), isleme));
  return isleme;
}

/** Komutu koşturur ve çıktısını olduğu gibi akıtır; hata çıkarsa fırlatır. */
function kos(komut, argumanlar, dizin) {
  execFileSync(komut, argumanlar, { cwd: dizin, stdio: "inherit" });
}

/** Paketin adını sürümüyle birlikte verir (vsce'nin ürettiği adla aynı). */
function paketAdi(eklentiDizini) {
  const p = JSON.parse(readFileSync(join(eklentiDizini, "package.json"), "utf8"));
  return { ad: `${p.name}-${p.version}.vsix`, surum: p.version };
}

/** Çalışma ağacında mühürlenmemiş değişiklik var mı? (yalnız bilgi amaçlı) */
function muhursuzDegisiklikVar() {
  const c = execFileSync("git", ["status", "--porcelain"], { cwd: DEPO, encoding: "utf8" });
  return c.trim().length > 0;
}

function paketle(dizin) {
  kos("npm", ["run", "build"], dizin);
  kos("npx", ["vsce", "package", "--no-dependencies", "--readme-path", "README.en.md"], dizin);
  return join(dizin, paketAdi(dizin).ad);
}

const yerel = bayrak("--yerel");
let gecici;

try {
  let kaynak = EKLENTI;
  let damga;

  if (!yerel) {
    if (muhursuzDegisiklikVar()) {
      console.log("ℹ Çalışma ağacında mühürlenmemiş değişiklik var; paket yine de HEAD'den üretilecek.");
      console.log("  Çalışma ağacından paketlemek istersen --yerel bayrağını ver (sahada ajan koşuyorsa riskli).");
    }
    gecici = mkdtempSync(join(tmpdir(), "sarmal-paket-"));
    kos("git", ["worktree", "add", "--detach", gecici, "HEAD"], DEPO);
    kaynak = join(gecici, "urun", "eklenti");
    // Bağımlılıklar yeniden kurulmaz; eklentinin çalışma zamanı bağımlılığı yoktur
    // ve derleme araçları ana ağaçtakilerle birebir aynıdır (STR-3.1).
    symlinkSync(join(EKLENTI, "node_modules"), join(kaynak, "node_modules"));
    damga = damgala(kaynak);
  }

  const vsix = paketle(kaynak);
  // Sürüm ÜRETİLEN paketten okunur: HEAD'den paketlenirken çalışma ağacında
  // işlenmemiş bir sürüm yükseltmesi dururdu ve ileti yanlış numarayı söylerdi.
  const uretilen = { surum: paketAdi(kaynak).surum, damga };
  if (!yerel) copyFileSync(vsix, join(EKLENTI, paketAdi(kaynak).ad));

  if (!bayrak("--yalniz-paketle")) {
    kos("code", ["--install-extension", vsix, "--force"], DEPO);
    const hukum = kurulumuDogrula(UZANTI_KLASORU, uretilen, okuVarsa);
    if (hukum.tur === "ayrisma") {
      console.error(`\n⛔ Kurulum doğrulanamadı. ${hukum.ayrisma.satir}`);
      process.exitCode = 1;
    } else {
      if (hukum.tur === "olculemedi") {
        console.log(`\nℹ Kurulu paket ${UZANTI_KLASORU} altında okunamadı; kurulumun sürüm doğrulaması yapılamadı.`);
      }
      const dogrulandi = hukum.tur === "uyumlu" ? " ve kurulu paketle doğrulandı" : "";
      console.log(`\n✅ ${uretilen.surum} kuruldu${dogrulandi}. Şimdi VS Code penceresini yenile: ⇧⌘P → Reload Window`);
    }
  } else {
    console.log(`\n✅ ${uretilen.surum} paketlendi: ${vsix}`);
    const hukum = kurulumuDogrula(UZANTI_KLASORU, uretilen, okuVarsa);
    if (hukum.tur === "ayrisma") console.log(`ℹ Paket kurulmadı ve kurulu paket geride kaldı. ${hukum.ayrisma.satir}`);
  }
} finally {
  if (gecici) {
    try { kos("git", ["worktree", "remove", "--force", gecici], DEPO); } catch { rmSync(gecici, { recursive: true, force: true }); }
    execFileSync("git", ["worktree", "prune"], { cwd: DEPO });
  }
}

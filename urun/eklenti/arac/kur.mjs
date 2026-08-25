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
//   Kullanım:  node arac/kur.mjs           → HEAD'den paketle ve kur
//              node arac/kur.mjs --yerel   → çalışma ağacından paketle (riskli)
//              node arac/kur.mjs --yalniz-paketle
// ═══════════════════════════════════════════════════════════════════════════
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, symlinkSync, readFileSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const EKLENTI = resolve(fileURLToPath(new URL("..", import.meta.url)));
const DEPO = resolve(EKLENTI, "..", "..");
const bayrak = (ad) => process.argv.includes(ad);

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
  kos("npx", ["vsce", "package", "--no-dependencies"], dizin);
  return join(dizin, paketAdi(dizin).ad);
}

const yerel = bayrak("--yerel");
const { surum } = paketAdi(EKLENTI);
let gecici;

try {
  let kaynak = EKLENTI;

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
  }

  const vsix = paketle(kaynak);
  if (!yerel) copyFileSync(vsix, join(EKLENTI, paketAdi(kaynak).ad));

  if (!bayrak("--yalniz-paketle")) {
    kos("code", ["--install-extension", vsix, "--force"], DEPO);
    console.log(`\n✅ ${surum} kuruldu. Şimdi VS Code penceresini yenile: ⇧⌘P → Reload Window`);
  } else {
    console.log(`\n✅ ${surum} paketlendi: ${vsix}`);
  }
} finally {
  if (gecici) {
    try { kos("git", ["worktree", "remove", "--force", gecici], DEPO); } catch { rmSync(gecici, { recursive: true, force: true }); }
    execFileSync("git", ["worktree", "prune"], { cwd: DEPO });
  }
}

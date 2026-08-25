// ═══════════════════════════════════════════════════════════════════════════
// simge-uret.mjs — Simge VARYANT üreticisi (VIT-KIMLIK-A03 · tek doğruluk kaynağı)
//
//   Amaç:   Yol Haritası ağacının iconPath'i ile .sar dosya ikonu somut renkli
//           SVG dosyası ister (VS Code kısıtı: TreeItem.iconPath ve
//           contributes.languages[].icon currentColor ÇÖZMEZ). YUZ-4.1 gereği
//           rafın KAYNAK dosyalarına renk GÖMÜLMEZ; renkli varyantlar bu
//           üreticiyle her build'de yeniden türer ve renk DEĞERLERİ yalnız
//           buradaki iki çizelgede yaşar. Kaynağa renk sızarsa üretici
//           YÜKSEK SESLE düşer (aşağıdaki currentColor nöbeti).
//   Girdi:  medya/simgeler/*.svg — currentColor konturlu kaynaklar
//           (altı eksen tipi; Founder 2026-07-28 geometrik aile). Dosya ikonu
//           ise marka ikonudur ve üretilmez: ikonlar/sarmal.svg birebir ilan
//           edilir (Founder hükmü 2026-08-04).
//   Çıktı:  medya/simgeler/uretilmis/
//           • <tip>-<evre>-<tema>.svg — eksen tipleri × üç kapsayıcı evre ×
//             iki tema. YUZ-4 Founder kilidi (2026-07-12) korunur: ŞEKİL=TİP
//             DAİMA, RENK=DURUM daima — evre renkleri bugüne dek ThemeIcon'a
//             verilen tema renklerinin (testing.iconPassed · charts.yellow ·
//             disabledForeground) varsayılan-tema karşılıklarıdır.
//   Çalıştıran: npm run build / test (renk-uret.mjs'den hemen sonra).
//
//   renk-uret dersi (TERRA-RED onarımı) burada baştan uygulanır: üretim
//   mantığı dışa-açık `uret(yollar)` fonksiyonundadır — nöbet testi üreticiyi
//   GEÇİCİ kopyalara karşı gerçekten koşturabilir.
// ═══════════════════════════════════════════════════════════════════════════
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const VARSAYILAN = {
  RAF:       fileURLToPath(new URL("../medya/simgeler", import.meta.url)),
  URETILMIS: fileURLToPath(new URL("../medya/simgeler/uretilmis", import.meta.url)),
};

// ── RENK ÇİZELGELERİ — renk değerinin yaşadığı TEK yer (YUZ-4.1) ─────────────
/** Tema-nötr kontur çifti (.sar dosya ikonu): VS Code'un varsayılan ikon
 *  ön-plan değerleri — açık tema #424242, koyu tema #C5C5C5. */
export const TEMA_KONTUR = { acik: "#1D74E0", koyu: "#4DA6FF" };  // marka mavisi (Founder tercihi, 2026-08-04)
/** Kapsayıcı EVRE renkleri (YUZ-4: renk=DURUM): bugüne dek ağaç ikonunun
 *  ThemeColor'ına verilen üç rolün varsayılan açık/koyu tema karşılıkları. */
export const EVRE_RENK = {
  bitti:    { acik: "#388A34", koyu: "#73C991" },   // testing.iconPassed
  suruyor:  { acik: "#BF8803", koyu: "#CCA700" },   // charts.yellow
  bekliyor: { acik: "#616161", koyu: "#8B949E" },   // disabledForeground (mat)
};

/** SATIR simgelerinin ANLAM renkleri (VIT-KIMLIK-A05 · EVRE_RENK deseninin
 *  genişlemesi): bugüne dek panellerde ThemeColor rolleriyle verilen anlamların
 *  varsayılan-tema karşılıkları. Anahtar RENK DEĞİL ANLAMDIR — panel "hata"
 *  ister, kırmızının kaç olduğunu yalnız bu çizelge bilir (YUZ-4.1). */
export const ANLAM_RENK = {
  duz:     { acik: "#424242", koyu: "#C5C5C5" },   // icon.foreground (renksiz ThemeIcon karşılığı)
  bilgi:   { acik: "#1A85FF", koyu: "#3794FF" },   // charts.blue
  uyari:   { acik: "#BF8803", koyu: "#CCA700" },   // charts.yellow
  hata:    { acik: "#CD3131", koyu: "#F14C4C" },   // charts.red
  basari:  { acik: "#388A34", koyu: "#73C991" },   // testing.iconPassed / yeşil aile
  notr:    { acik: "#616161", koyu: "#8B949E" },   // disabledForeground (mat)
  turuncu: { acik: "#D18616", koyu: "#D18616" },   // charts.orange (etki · doğrulanmamış)
  kenar:   { acik: "#FF79C6", koyu: "#FF79C6" },   // sarmal.kenar (bağımlılık pembesi)
  aktif:   { acik: "#0090F1", koyu: "#007FD4" },   // focusBorder (aktif seferin nabzı)
};

/** Dosya ikonunun kaynak adı — evre taşımaz, yalnız tema çifti üretir. */

/** currentColor'ı somut renkle değiştirir; kaynakta currentColor yoksa kaynak
 *  boyanmış demektir ve bu YUZ-4.1 ihlalidir — sessiz geçilmez, üretim düşer. */
function boya(ad, icerik, renk) {
  if (!icerik.includes("currentColor")) {
    throw new Error(`simge-uret: ${ad} kaynağında currentColor yok — rafa renk gömülmüş (YUZ-4.1).`);
  }
  return icerik.replaceAll("currentColor", renk);
}

/** Raf kaynaklarından tüm varyantları üretir; yazılan dosya adlarını döndürür.
 *  Yollar geçersiz kılınabilir (nöbet testi geçici kopyalara koşturur). */
export function uret(yollar = {}) {
  const { RAF, URETILMIS } = { ...VARSAYILAN, ...yollar };
  mkdirSync(URETILMIS, { recursive: true });

  // Panel simgeleri (panel-*.svg) EVRE TAŞIMAZ: görünüş ikonunu VS Code'un
  // kendisi tema rengiyle maskeler, currentColor kaynak doğrudan ilan edilir.
  // Evre × tema varyantı eksen tiplerinin, anlam × tema varyantı satır
  // simgelerinin (satir-*.svg · VIT-KIMLIK-A05) ağaç satırları içindir.
  const dosyalar = readdirSync(RAF, { withFileTypes: true })
    .filter((g) => g.isFile() && g.name.endsWith(".svg") && !g.name.startsWith("panel-"))
    .map((g) => g.name)
    .sort();
  const eksenler = dosyalar.filter((d) => !d.startsWith("satir-"));
  const satirlar = dosyalar.filter((d) => d.startsWith("satir-"));

  const yazilan = [];
  for (const dosya of eksenler) {
    const ad = dosya.replace(/\.svg$/, "");
    const icerik = readFileSync(join(RAF, dosya), "utf8");
    // Eksen tipi: evre × tema (YUZ-4 — şekil tipten, renk durumdan).
    for (const [evre, temalar] of Object.entries(EVRE_RENK)) {
      for (const [tema, renk] of Object.entries(temalar)) {
        const hedef = `${ad}-${evre}-${tema}.svg`;
        writeFileSync(join(URETILMIS, hedef), boya(dosya, icerik, renk));
        yazilan.push(hedef);
      }
    }
  }
  for (const dosya of satirlar) {
    const ad = dosya.replace(/\.svg$/, "");
    const icerik = readFileSync(join(RAF, dosya), "utf8");
    // Satır simgesi: anlam × tema (YUZ-4 ikizi — şekil kademeyi/işi, renk anlamı söyler).
    for (const [anlam, temalar] of Object.entries(ANLAM_RENK)) {
      for (const [tema, renk] of Object.entries(temalar)) {
        const hedef = `${ad}-${anlam}-${tema}.svg`;
        writeFileSync(join(URETILMIS, hedef), boya(dosya, icerik, renk));
        yazilan.push(hedef);
      }
    }
  }
  return { RAF, URETILMIS, yazilan };
}

// Doğrudan çalıştırma (npm run build): varsayılan yollara üret.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { yazilan } = uret();
  console.log(`🎨 simge rafından üretildi → medya/simgeler/uretilmis (${yazilan.length} varyant)`);
}

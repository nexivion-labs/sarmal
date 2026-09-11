// ═══════════════════════════════════════════════════════════════════════════
// dogus.ts — 🎁 DOĞUŞ PAKETİ YAZICISI (DPK-A02 · Founder 2026-07-17 · GOC-A10 · Founder 2026-08-23)
//
//   "flutter create" paritesi: boş dizinde tek komutla ÇALIŞIR proje doğar —
//   anadizin (MIM-3) + durum devri + öğrenme rafı + ilk plan (MIM-1 tam-zincir).
//   Şablonlar TEK kaynaktan okunur: ogreti/sablon/dogus/ (insan gözle açar,
//   düzenler; burada metin tutulmaz — YUZ-1.2). Yer-tutucular: {{AD}} ad ·
//   {{KOD}} koddan türetilmiş BÜYÜK kısaltma · {{TARIH}} doğum günü ·
//   {{PROJE}} / {{PROJEKOD}} çalışma alanının ilk projesi.
//
//   İKİ TÜR (GOC-A10 · Founder 2026-08-23): doğuş komutu artık "tek proje mi,
//   çalışma alanı mı" diye sorar. `proje` türünde hedef dizin doğrudan Proje
//   kökü olur; `calisma-alani` türünde hedef dizin ÇalışmaAlanı kökü olur ve
//   ilk proje onun altında kendi köküyle doğar (MIM-1.1: çalışma alanı en az
//   bir bağımsız Proje kökünü sarar). Soru metni CLI ile MCP'de aynı sestir.
//
//   KÖKÜN KAPILARI (BKM-DNT-A15 · 2026-09-09): paket bir zamanlar yalnız altı
//   dosya yazıyordu ve doğan kökü KAPISIZ bırakıyordu. Ölçüm beş eksiği tek tek
//   göstermiştir: yok sayma istisnası olmadan küresel `*.sar` kuralı projenin
//   bütün hafızasını depodan uzak tutuyor, yürütücü ayarı olmadan ajan ürünün
//   araçlarına hiç erişemiyor, yönerge ikizinin tek kanadı doğduğu için ikiz
//   nöbeti kendi konusunu bulamıyor, kanca olmadan hiçbir yazımdan sonra denetim
//   koşmuyor ve kanon işaretçisi olmadan eklenti tip sistemi kaydını çözemiyordu.
//   Beş kapı artık her doğan kökle birlikte doğar ve hepsi o kökün KENDİ
//   dosyalarında yaşar; kullanıcının makinesindeki küresel ayarlara dokunulmaz.
//
//   KİTAPLIK KADEMESİ ZORUNLUDUR (Founder hükmü 2026-09-09): giriş ilanı artık
//   Kitaplık açar ve rafları Kitaplıkların içine koyar; kökün altına çıplak Raf
//   yazılmaz. Doğan proje ağacı bu yüzden `is/`, `ogreti/` ve `oz/` kitaplıklarını
//   taşır. Aynı hükmün ikinci yarısı zaman eksenidir: çalışma alanı doğrudan Faz
//   içeremez ve giriş ilanına hiçbir Faz yazılmaz; mevsim, projenin plan dosyasında yaşar.
//
//   Governance≠Compiler korunur: motor İSKELETİ yazar, NİYETİ insan/ajan
//   doldurur — doğan her dosya kendi doldurma öğretisini içinde taşır (YAS-3.4).
//   Dolu-dizin sözleşmesi (YUZ-1.3 ruhu): var olan dosya ASLA ezilmez, atlanır
//   ve rapor ne yapılmadığını açıkça söyler. Tek istisna yok sayma dosyasıdır ve
//   orada da silme yoktur: yalnız eksik istisna satırı sona eklenir.
//
//   İki katman AYRIK (iskeletci.ts deseni):
//     dogusManifesti()  → saf; diske dokunmaz (test edilebilir)
//     dogusYaz()        → etkili; manifesti diske yazar (ezmez → atlar)
// ═══════════════════════════════════════════════════════════════════════════

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dilBaglami } from "./dil-baglami.ts";   // DPK-A03: ajan dil bağlamı — kanondan üretilir
import { yokSaymaIstisnaSatirlari, yokSaymaIstisnasiEksikleri } from "./yonerge-ikizi.ts";   // BKM-DNT-A15: küresel yok sayma tuzağının desen listesi TEK kaynaktadır

const DOGUS_SABLON_KOK = fileURLToPath(new URL("../../../ogreti/sablon/dogus/", import.meta.url));

/**
 * DOĞURAN KURULUMUN KÖKÜ (BKM-DNT-A15). Doğan kökün kapıları, kendisini doğuran
 * Sarmal kurulumunun adresini bilmek zorundadır: yürütücü ayarı sunucuyu, kapı
 * kancası motoru, kanon işaretçisi ise tip sistemi kaydını o adresten çözer.
 * Adres tahmin edilmez, ÖLÇÜLÜR: bu modülün kendi dosya yolundan yukarı çıkılır,
 * dolayısıyla kurulum nereye kurulmuş olursa olsun doğan kök doğru yeri gösterir.
 */
export const SARMAL_KURULUM_KOKU = resolve(fileURLToPath(new URL("../../../", import.meta.url)));
/** Sunucunun giriş dosyası — doğan kökün yürütücü ayarı bunu çağırır. */
export const SARMAL_MCP_YOLU = join(SARMAL_KURULUM_KOKU, "urun", "cekirdek", "src", "mcp.ts");
/** Komut satırı motoru — doğan kökün kapı kancası bunu koşturur. */
export const SARMAL_MOTOR_YOLU = join(SARMAL_KURULUM_KOKU, "urun", "cekirdek", "src", "sarmal.ts");

/** Doğuş türü: hedef dizin doğrudan Proje kökü mü, yoksa ÇalışmaAlanı kökü mü olur. */
export type DogusTuru = "proje" | "calisma-alani";
export const DOGUS_TURLERI: readonly DogusTuru[] = ["proje", "calisma-alani"];
/** Çalışma alanı seçilip proje adı verilmediğinde ilk projenin adı. */
export const VARSAYILAN_ILK_PROJE = "ilk_proje";

export interface DogusDosya {
  /** hedef köke göreli yol (POSIX). */
  yol: string;
  icerik: string;
  /**
   * VAR OLAN DOSYAYI GENİŞLETME KURALI (BKM-DNT-A15). Dolu-dizin sözleşmesinin
   * normu atlamaktır: mevcut kayıt sahibinindir ve ezilmez. Yok sayma dosyası bu
   * normun tek istisnasıdır ve istisnanın gerekçesi ölçülmüştür: kullanıcının
   * kendi `.gitignore` dosyası varken paketin sessizce atlaması, küresel kuralın
   * `*.sar` desenini yok saydığı bir makinede projenin bütün hafızasını depodan
   * uzak tutar. Bu yüzden o dosya için ATLAMAK yerine GENİŞLETMEK yazılmıştır:
   * işlev var olan metni alır, yalnız EKSİK istisna satırlarını sona ekler ve
   * hiçbir mevcut satırı silmez; eklenecek bir şey yoksa `undefined` döner ve
   * dosyaya hiç dokunulmaz.
   */
  genislet?: (mevcut: string) => string | undefined;
}

export interface DogusSonuc {
  tur: DogusTuru;
  ad: string;
  kod: string;
  /** çalışma alanı türünde altında doğan ilk projenin adı; proje türünde tanımsız. */
  proje?: string;
  yazilan: string[];
  atlanan: string[];
  /** var olduğu hâlde eksiği tamamlanan dosyalar (bugün yalnız yok sayma dosyası). */
  genisletilen: string[];
}

/** Proje adından BÜYÜK kod kısaltması türetir: "bahçe projem" → "BAHCE-PROJEM". */
export function dogusKodu(ad: string): string {
  const ascii = ad
    .toLocaleLowerCase("tr")
    .replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ı/g, "i")
    .replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return (ascii || "proje").toUpperCase();
}

/** Addan dosya/klasör adı türetir: "Bahçe Projem" → "bahçe_projem" (DIL-1.2 alt çizgi ayracı). */
export function dogusDosyaAdi(ad: string): string {
  return ad
    .toLocaleLowerCase("tr")
    .replace(/[^a-zçğıöşü0-9]+/gu, "_")
    .replace(/^_+|_+$/g, "") || "proje";
}

/**
 * Serbest yazılmış tür cevabını çözer: "1", "proje", "tek" → proje; "2", "alan",
 * "çalışma alanı", "calisma-alani", "çatı" → calisma-alani; tanınmayan cevap tanımsız döner.
 */
export function dogusTuruCoz(ham: string | undefined): DogusTuru | undefined {
  if (ham === undefined) return undefined;
  const t = ham.trim().toLocaleLowerCase("tr").replace(/\s+/g, " ");
  if (["proje", "1", "tek", "tek proje", "tek-proje"].includes(t)) return "proje";
  if (["calisma-alani", "calisma alani", "çalışma alanı", "çalışma-alanı", "alan", "2", "çatı", "cati"].includes(t)) return "calisma-alani";
  return undefined;
}

/** Tür sorusunun metni — CLI ile MCP aynı sesi verir (YUZ-1.2 tek kaynak). */
export function dogusSorusu(): string {
  return [
    "❓ Ne doğsun? Doğuş komutu iki kademe bilir:",
    "   ① tek proje      — hedef dizin doğrudan Proje kökü olur: anadizin, durum devri, öğrenme rafı ve ilk plan.",
    "   ② çalışma alanı  — hedef dizin ÇalışmaAlanı kökü olur; ilk proje onun altında kendi köküyle doğar",
    "                      (MIM-1.1: çalışma alanı en az bir bağımsız Proje kökünü sarar, kimlikleri birleştirmez).",
    "   Seçim komut satırında --tur proje | --tur calisma-alani, MCP çağrısında tur alanıyla verilir;",
    "   çalışma alanında ilk projenin adı --proje <ad> (MCP: proje) ile seçilir, verilmezse " + VARSAYILAN_ILK_PROJE + " olur.",
  ].join("\n");
}

/** Şablon dosyasını okuyup yer-tutucuları doldurur. Dosya yoksa fırlatır (kurulum kusuru). */
function sablonDoldur(dosya: string, degerler: Readonly<Record<string, string>>): string {
  let metin = readFileSync(join(DOGUS_SABLON_KOK, dosya), "utf8");
  for (const [anahtar, deger] of Object.entries(degerler)) {
    // Yerine koyma İŞLEVLE yapılır: değer bir dosya yoludur ve `$&` gibi bir
    // dizi taşırsa dizge biçimi onu özel anlamıyla okur, işlev biçimi okumaz.
    metin = metin.replace(new RegExp(`\\{\\{${anahtar}\\}\\}`, "g"), () => deger);
  }
  return metin;
}

/**
 * DOĞAN KÖKÜN KAPILARI (BKM-DNT-A15 · saf). Bir kök, tek başına açıldığında
 * ürünün kendi kapılarının orada çalışmasıyla yaşayabilir; kapısız doğan kök,
 * ürünün bütün vaadini ilk turda kaybeder. Beş kapı buradan doğar ve beşi de
 * DOĞAN KÖKÜN KENDİ dosyalarında yaşar — kullanıcının makinesindeki küresel
 * ayarlara dokunulmaz (Adım sınırı).
 *
 *   ① yok sayma dosyası — küresel kural `*.sar` desenini yok sayıyorsa projenin
 *      bütün hafızası depoya hiç girmez; istisna bu dosyada yaşar.
 *   ② yürütücü ayarı — doğan kök Sarmal sunucusunu doğuran kurulumdan çözer ve
 *      ajan ilk turdan itibaren ürünün araçlarını kullanır.
 *   ③ kapı kancaları — ön kapı yeni bir giriş ilanının elle yazılmasını
 *      reddeder, arka kapı her kaynak yazımından sonra denetimi koşturur.
 *   ④ kanon işaretçisi — tip sistemi kaydının ADRESİ; kopya değildir.
 *   ⑤ yönerge ikizi — `CLAUDE.md` ile `AGENTS.md` bayt özdeş doğar (aşağıda,
 *      dil bağlamının yanında; ikizlik iki kanadın birlikte doğmasıyla kurulur).
 */
function kokKapilari(ad: string, tarih: string): DogusDosya[] {
  const d = {
    AD: ad,
    KOD: dogusKodu(ad),
    TARIH: tarih,
    MOTOR: SARMAL_MOTOR_YOLU,
    MOTORMCP: SARMAL_MCP_YOLU,
    KANONKOK: SARMAL_KURULUM_KOKU,
  };
  const yoksayma = sablonDoldur("yoksayma.txt", d);
  return [
    {
      yol: ".gitignore",
      icerik: yoksayma,
      genislet: (mevcut) => {
        const eksikler = yokSaymaIstisnasiEksikleri(mevcut);
        if (eksikler.length === 0) return undefined;
        const ayrac = mevcut.endsWith("\n") || mevcut.length === 0 ? "" : "\n";
        return `${mevcut}${ayrac}\n${YOKSAYMA_ISTISNA_BASLIGI}\n${eksikler.join("\n")}\n`;
      },
    },
    { yol: ".mcp.json",                        icerik: sablonDoldur("yurutucu_ayari.json", d) },
    { yol: ".claude/settings.json",            icerik: sablonDoldur("kanca_ayari.json", d) },
    { yol: ".claude/kanca/dogus-kilidi.sh",    icerik: sablonDoldur("dogus_kilidi.sh", d) },
    { yol: ".claude/kanca/denetim-kapisi.sh",  icerik: sablonDoldur("denetim_kapisi.sh", d) },
    { yol: "oz/siniflama/isaretci.json",       icerik: sablonDoldur("kanon_isaretcisi.json", d) },
  ];
}

/**
 * Var olan bir yok sayma dosyasına eklenen istisnaların başlığı. Başlık şart
 * değildir fakat gereklidir: eklenen üç satırı gören kişi altı ay sonra onların
 * neden orada olduğunu okuyabilmelidir, yoksa ilk temizlikte silinirler.
 */
const YOKSAYMA_ISTISNA_BASLIGI =
  "# ── Sarmal doğuş paketi: küresel yok sayma kuralının istisnası (silme) ──";

/** Tek projenin paketi (saf). Manifest DPK-A01 Founder onaylıdır. */
function projePaketi(ad: string, tarih: string): DogusDosya[] {
  const kod = dogusKodu(ad);
  const dosyaAdi = dogusDosyaAdi(ad);
  const d = { AD: ad, KOD: kod, TARIH: tarih };
  // DPK-A03: ajan dil bağlamı — AGENTS.md çok-ajan konvansiyonudur (Codex/Cursor/Claude
  // ailesi okur); içerik kanondan DERLENİR, projeye giren ajan dili ilk turdan öğrenir.
  // BKM-DNT-A15: aynı metin `CLAUDE.md` adıyla da doğar. İki dosya BAYT ÖZDEŞTİR ve
  // özdeşliği doğuş anında kurmak zorunludur, çünkü yönerge ikizi nöbeti ancak iki
  // kanat da varken kendi konusunu bulur; tek kanatla doğan bir kökte nöbet ölçtüğü
  // şeyi hiç göremez ve sessizce yeşil kalır.
  const yonerge = dilBaglami(tarih);
  return [
    { yol: `${dosyaAdi}_anadizin.sar`,       icerik: sablonDoldur("anadizin.sar", d) },
    { yol: "is/durum/durum_devir.sar",       icerik: sablonDoldur("durum_devir.sar", d) },
    { yol: "ogreti/ogrenme/dersler.sar",     icerik: sablonDoldur("dersler.sar", d) },
    { yol: "ogreti/ogrenme/geribildirim.sar", icerik: sablonDoldur("geribildirim.sar", d) },
    { yol: "is/plan/ilk_plan.sar",           icerik: sablonDoldur("ilk_plan.sar", d) },
    { yol: "AGENTS.md",                      icerik: yonerge },
    { yol: "CLAUDE.md",                      icerik: yonerge },
    ...kokKapilari(ad, tarih),
  ];
}

/**
 * Doğuş paketinin dosya manifesti (saf — diske dokunmaz).
 * `proje` türü tek projenin paketidir; `calisma-alani` türü çatı ilanı + dil bağlamı +
 * ilk projenin kendi klasöründe doğan tam paketidir (her proje bağımsız kök · MIM-3).
 */
export function dogusManifesti(ad: string, tarih: string, tur: DogusTuru = "proje", projeAdi?: string): DogusDosya[] {
  if (tur === "proje") return projePaketi(ad, tarih);
  const proje = (projeAdi ?? VARSAYILAN_ILK_PROJE).trim() || VARSAYILAN_ILK_PROJE;
  const projeDosya = dogusDosyaAdi(proje);
  const alan = { AD: ad, KOD: dogusKodu(ad), TARIH: tarih, PROJE: projeDosya, PROJEKOD: dogusKodu(proje) };
  const yonerge = dilBaglami(tarih);
  return [
    { yol: `${dogusDosyaAdi(ad)}_anadizin.sar`, icerik: sablonDoldur("calisma_alani_anadizin.sar", alan) },
    { yol: "AGENTS.md",                          icerik: yonerge },
    { yol: "CLAUDE.md",                          icerik: yonerge },
    // Çatı da tek başına açılabilen bir köktür ve kendi kapılarını taşır. Kapılar
    // ayrıca ilk projenin kökünde de doğar, çünkü MIM-3 gereği her proje kendi
    // deposunda yaşayabilir ve o depo tek başına klonlandığında kapısız kalmamalıdır.
    ...kokKapilari(ad, tarih),
    ...projePaketi(proje, tarih).map((d) => ({ ...d, yol: `${projeDosya}/${d.yol}` })),
  ];
}

/**
 * Paketi hedef dizine yazar. Var olan dosyayı EZMEZ — atlar ve raporlar
 * (dolu-dizin sözleşmesi: mevcut kayıt sahibinindir, komut ne yapmadığını söyler).
 */
export function dogusYaz(hedefKok: string, ad?: string, tarih?: string, tur: DogusTuru = "proje", projeAdi?: string): DogusSonuc {
  const kok = resolve(hedefKok);
  const isim = (ad ?? basename(kok)).trim() || "proje";
  const gun = tarih ?? new Date().toISOString().slice(0, 10);
  const proje = tur === "calisma-alani" ? ((projeAdi ?? VARSAYILAN_ILK_PROJE).trim() || VARSAYILAN_ILK_PROJE) : undefined;
  const sonuc: DogusSonuc = {
    tur, ad: isim, kod: dogusKodu(isim), ...(proje ? { proje } : {}),
    yazilan: [], atlanan: [], genisletilen: [],
  };
  for (const d of dogusManifesti(isim, gun, tur, proje)) {
    const tam = join(kok, d.yol);
    if (existsSync(tam)) {
      // Var olan dosya kullanıcınındır. Tek istisna, kendi genişletme kuralını
      // taşıyan dosyadır: orada da hiçbir satır SİLİNMEZ, yalnız eksik olan eklenir.
      const genisletilmis = d.genislet?.(readFileSync(tam, "utf8"));
      if (genisletilmis === undefined) {
        sonuc.atlanan.push(d.yol);   // kullanıcının emeğini ezme (iskeletci ile aynı söz)
        continue;
      }
      writeFileSync(tam, genisletilmis, "utf8");
      sonuc.genisletilen.push(d.yol);
      continue;
    }
    mkdirSync(dirname(tam), { recursive: true });
    writeFileSync(tam, d.icerik, "utf8");
    sonuc.yazilan.push(d.yol);
  }
  return sonuc;
}

/** İnsan/ajan-yüzlü doğuş raporu — CLI ve MCP aynı sesi verir (YUZ-1.2 tek kaynak). */
export function dogusRaporu(s: DogusSonuc, hedef: string): string {
  const satirlar: string[] = [];
  if (s.tur === "calisma-alani") {
    satirlar.push(`🎁 DOĞUŞ PAKETİ — çalışma alanı "${s.ad}" (kod kısaltması: CAL-${s.kod}) ve altında ilk proje "${s.proje}" → ${hedef}`);
  } else {
    satirlar.push(`🎁 DOĞUŞ PAKETİ — "${s.ad}" (kod kısaltması: ${s.kod}) → ${hedef}`);
  }
  if (s.yazilan.length) {
    satirlar.push("", "🌱 Doğan dosyalar:");
    for (const y of s.yazilan) satirlar.push(`   + ${y}`);
  }
  if (s.genisletilen.length) {
    satirlar.push("", "🛡️ Genişletilenler (vardı — hiçbir satır silinmedi, yalnız eksik istisna eklendi):");
    for (const y of s.genisletilen) satirlar.push(`   ~ ${y}`);
  }
  if (s.atlanan.length) {
    satirlar.push("", "🛡️ Dokunulmayanlar (zaten vardı — mevcut kayıt sahibinindir, ezilmez):");
    for (const y of s.atlanan) satirlar.push(`   = ${y}`);
  }
  const planYolu = s.tur === "calisma-alani" ? `${dogusDosyaAdi(s.proje ?? VARSAYILAN_ILK_PROJE)}/is/plan/ilk_plan.sar` : "is/plan/ilk_plan.sar";
  satirlar.push(
    "",
    s.yazilan.length || s.genisletilen.length
      ? `🧭 Sıradaki iş: ${planYolu} içindeki kuruluş Adımı (mimari diyalog). Doğrulama: sarmal denetle <dizin> — sıfır hata beklenir.`
      : "📪 Yazılacak yeni dosya yoktu — paket daha önce kurulmuş görünüyor.");
  if (s.yazilan.length) {
    satirlar.push(
      `🚪 Kökün kapıları kuruldu: yok sayma istisnası (${yokSaymaIstisnaSatirlari().join(" · ")}), yürütücü ayarı, yönerge ikizi, doğuş kilidi ile denetim kancası ve kanon işaretçisi.`,
      `   Kapıların adresi doğuran kurulumdur: ${SARMAL_KURULUM_KOKU} — kurulum taşınırsa .mcp.json, .claude/kanca/ ve oz/siniflama/isaretci.json içindeki yollar elle güncellenir.`);
  }
  return satirlar.join("\n");
}

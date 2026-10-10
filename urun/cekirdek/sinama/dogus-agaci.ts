// ═══════════════════════════════════════════════════════════════════════════
// dogus-agaci.ts — 🌳 FİKSTÜR YOLLARININ TEK KAYNAĞI (HST-MTR-A07)
//
//   Bu modül sınamaların ağaç yollarını elle yazmaz; onları doğuş paketinin
//   kendisinden türetir. Gerekçe HTR-FIKSTUR-YOLLARI-GERCEK-AGACA-BENZEMIYOR
//   kaydının dersidir: gerçekte üretilmeyen bir yolu fikstüre yazmak, yanlış
//   davranışı sessizce kanunlaştırır. Paket plan rafını, Faz klasörünü ya da ilk
//   Faz dosyasının adını değiştirdiğinde bu modülü okuyan her fikstür kendiliğinden
//   yeni ağaca taşınır ve hiçbir sınama dosyasında yol satırı değiştirilmez.
//
//   SEÇİMİN ÖLÇÜLMÜŞ GEREKÇESİ (2026-10-10). Doğuşun plan adresi otuz beş günde
//   üç biçim almıştır: önce kökün hemen altındaki çıplak plan rafı, 2026-09-11
//   tarihinde işin kitaplığındaki plan rafı, 2026-09-29 tarihinde o rafın Faz
//   klasöründeki sıra önekli dosya. Elle yazılmış fikstür yolları iki geçişte de
//   geride kalmıştır. Sınama kaynaklarında dizge ya da birleştirme argümanı olarak
//   yazılmış plan yolları sayıldığında, birinci geçişten önce iki yüz dört olan
//   çıplak yol sayısı geçişten sonra azalmamış ve bu Adımdan önce iki yüz on dokuza
//   çıkmıştır; ikinci geçişten on bir gün sonra işin kitaplığına bakan iki yüz
//   altmış dokuz yolun yalnız altmış altısı Faz dosyası biçimindedir. Elle hizalama
//   bir kez yapılsa da bir sonraki geçişte yeniden bayatlar; türetim ise
//   bayatlamaya kapalıdır.
//
//   Türetim iki bağımsız kaynaktan yapılır ve ikisi modül yüklenirken birbirini
//   doğrular. Birinci kaynak paketin manifestidir ve hangi dosyaların yazıldığını
//   söyler: giriş ilanı, ilk Faz dosyası ve durum kaydı. İkinci kaynak doğan giriş
//   ilanının motor tarafından çözülen iskeletidir ve hangi klasörün Kitaplık,
//   hangisinin Raf olduğunu söyler. Plan rafı, ilk Faz dosyasını içeren en derin
//   ilanlı Raftır; Faz dosyası ayrıca motorun kendi Faz dosyası kuralından geçer.
//   İki kaynak ayrışırsa modül fırlatır ve onu okuyan her sınama adıyla kırmızıya
//   düşer. Sessiz bir varsayılan bilinçle yoktur.
//
//   Kitaplık düzeni, yani kullanıcının planını doğrudan bir Kitaplık olarak ilan
//   ettiği ağaç, meşru bir kullanımdır ve bu modülün konusu değildir. O düzeni
//   sınayan fikstürler kendi ilanlarını elle yazmaya devam eder, çünkü o ilan
//   doğuştan gelmez, kullanıcının kendi kararıdır.
// ═══════════════════════════════════════════════════════════════════════════
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, posix } from "node:path";
import { fileURLToPath } from "node:url";
import { ayristir } from "../src/ayristirici.ts";
import { belirtecle } from "../src/belirtec.ts";
import { FAZ_DOSYASI_YERI } from "../src/denetci.ts";
import { dogusDosyaAdi, dogusKodu, dogusManifesti, dogusYaz, type DogusDosya } from "../src/dogus.ts";
import { iskeletPlani } from "../src/iskeletci.ts";
import { siniflamaYukle, type Siniflama } from "../src/siniflama.ts";

/** Fikstür ağaçlarının doğum günü. Tanıların bir bölümü tarihe duyarlı olduğu için sabittir. */
export const DOGUS_TARIHI = "2026-10-10";
/** Varsayılan proje adı. Yollar addan bağımsızdır; adı yalnız giriş ilanının dosya adı taşır. */
export const VARSAYILAN_AD = "deneme";

const SNF_YOL = fileURLToPath(new URL("../../../oz/siniflama/kayit.json", import.meta.url));
let snfOnbellek: Siniflama | undefined;
const snf = (): Siniflama => (snfOnbellek ??= siniflamaYukle(SNF_YOL));

/** Doğuşun yazdığı ağacın köke göreli adresleri; hepsi paketten türetilir. */
export interface DogusDuzeni {
  /** Giriş ilanı. */
  anadizin: string;
  /** Plan rafını taşıyan Kitaplığın klasörü. */
  planKitapligi: string;
  /** Plan rafının klasörü. */
  planRafi: string;
  /** Faz dosyalarının klasörü (MIM-1.2). */
  fazKlasoru: string;
  /** Paketin yazdığı ilk Faz dosyası. */
  ilkFaz: string;
  /** Durum kaydı. */
  durumKaydi: string;
}

/** Bir .sar metninin kök düzeyindeki bildirimlerinin tip adları. */
function kokTipleri(icerik: string): string[] {
  return ayristir(belirtecle(icerik)).bildirimler.filter((d) => d.tur === "widget").map((d) => d.ad);
}

/** Manifestte koşulu karşılayan TEK dosyayı bulur; sıfır ya da birden çok eşleşme fırlatır. */
function tekBul(dosyalar: readonly DogusDosya[], ne: string, kosul: (d: DogusDosya) => boolean): DogusDosya {
  const bulunan = dosyalar.filter(kosul);
  if (bulunan.length !== 1) {
    throw new Error(`dogus-agaci: doğuş manifestinde tek bir ${ne} bekleniyordu, ${bulunan.length} bulundu` +
      ` (${bulunan.map((d) => d.yol).join(", ") || "hiçbiri"}). Paketin düzeni değişmiş olabilir; türetim kuralını paketle birlikte güncelle.`);
  }
  return bulunan[0];
}

/** Adaylar arasında en uzun (en derin) klasörü döndürür. */
const enDerin = (adaylar: readonly string[]): string | undefined => [...adaylar].sort((a, b) => b.length - a.length)[0];

/**
 * Doğuş paketinin `proje` türünde yazdığı ağacın düzeni. Ad yalnız giriş ilanının
 * dosya adını etkiler; klasörler addan bağımsızdır.
 */
export function dogusDuzeni(ad: string = VARSAYILAN_AD): DogusDuzeni {
  const sar = dogusManifesti(ad, DOGUS_TARIHI, "proje").filter((d) => d.yol.endsWith(".sar"));
  const anadizin = tekBul(sar, "giriş ilanı", (d) => d.yol.endsWith("_anadizin.sar") && !d.yol.includes("/"));
  const ilkFaz = tekBul(sar, "Faz dosyası", (d) => kokTipleri(d.icerik).includes("Faz"));
  const durumKaydi = tekBul(sar, "durum kaydı", (d) => kokTipleri(d.icerik).includes("DurumKaydı"));

  // İkinci kaynak: giriş ilanının motorca çözülen iskeleti (Kitaplık ve Raf klasörleri).
  const dizinler = iskeletPlani(ayristir(belirtecle(anadizin.icerik)), snf()).ogeler.filter((o) => o.tur === "dizin");
  const icinde = (klasor: string, yol: string): boolean => yol.startsWith(`${klasor}/`);
  const planRafi = enDerin(dizinler.filter((o) => o.icerikRafi === true && icinde(o.yol, ilkFaz.yol)).map((o) => o.yol));
  if (planRafi === undefined) {
    throw new Error(`dogus-agaci: ilk Faz dosyası (${ilkFaz.yol}) doğan giriş ilanının hiçbir Rafında yaşamıyor.`);
  }
  const planKitapligi = enDerin(dizinler.filter((o) => o.icerikRafi !== true && icinde(o.yol, planRafi)).map((o) => o.yol));
  if (planKitapligi === undefined) {
    throw new Error(`dogus-agaci: plan rafı (${planRafi}) bir Kitaplığın içinde ilan edilmemiş; doğuş kökün altına çıplak Raf yazmaz.`);
  }
  if (!FAZ_DOSYASI_YERI.test(ilkFaz.yol)) {
    throw new Error(`dogus-agaci: ilk Faz dosyası (${ilkFaz.yol}) motorun Faz dosyası kuralına uymuyor (MIM-1.2).`);
  }
  return {
    anadizin: anadizin.yol, planKitapligi, planRafi,
    fazKlasoru: posix.dirname(ilkFaz.yol), ilkFaz: ilkFaz.yol, durumKaydi: durumKaydi.yol,
  };
}

/** Varsayılan adla türetilmiş düzen. Klasörler addan bağımsız olduğu için çoğu fikstür bunu okur. */
export const DUZEN: DogusDuzeni = dogusDuzeni();

/** Plan rafının altındaki bir yol. */
export function planYolu(...parcalar: string[]): string {
  return posix.join(DUZEN.planRafi, ...parcalar);
}

/** Faz klasöründe sıra önekli Faz dosyası (MIM-1.2). Motorun Faz dosyası kuralına uymayan ad fırlatır. */
export function fazYolu(sira: number, ad: string): string {
  const yol = `${DUZEN.fazKlasoru}/${sira}_${ad}.sar`;
  if (!FAZ_DOSYASI_YERI.test(yol)) throw new Error(`dogus-agaci: ${yol} motorun Faz dosyası kuralına uymuyor.`);
  return yol;
}

/**
 * Doğuşun öğrettiği tam zincirde bir Faz dosyası metni: Faz → Blok → Katman →
 * AltKatman → Adımlar. Doğan giriş ilanı katı rejim beyan ettiği için Katman ile
 * Adım arasındaki departman kademesi atlanamaz. Katman zemin bağını verilen
 * `zemin` satırından alır; verilmezse doğuşun kendi Kuruluş Katmanı gibi geçici
 * teknoloji kaçışıyla doğar, çünkü taze bir ağaçta henüz Teknoloji ilanı yoktur.
 */
export function fazMetni(s: {
  /** Faz, Blok, Katman ve AltKatman kodlarının ortak eki. */
  ek: string;
  /** AltKatmanın gövdesine girecek Adım satırları. */
  adimlar: string;
  /** Blok kodu; verilmezse `BLK-<ek>`. */
  blokKodu?: string;
  /** Katmanın zemin bağı satırı (ör. `takım: X` ya da `kullanır: Y`). */
  zemin?: string;
}): string {
  const zemin = s.zemin ?? 'teknolojiBağımsız: "Sınama fikstürü; doğuş anında henüz Teknoloji ilanı yoktur."';
  return [
    `Faz( kod: FAZ-${s.ek}, ad: "${s.ek} Mevsimi", ne: "Sınama fikstürünün zaman halkası" ) {`,
    `  Blok( kod: ${s.blokKodu ?? `BLK-${s.ek}`}, ad: "${s.ek} Bloku", ne: "Sınama fikstürünün iş gövdesi" ) {`,
    `    Katman( kod: KAT-${s.ek}, ad: "${s.ek} Katmanı", ${zemin}, ne: "Sınama fikstürünün katmanı" ) {`,
    `      AltKatman( kod: ALT-${s.ek}, ad: "${s.ek} Modülü", departman: kodlama, ne: "Sınama fikstürünün modülü" ) {`,
    s.adimlar.replace(/\n$/u, ""),
    "      }",
    "    }",
    "  }",
    "}",
    "",
  ].join("\n");
}

/** Doğuş paketiyle diske kurulmuş bir proje ağacı. */
export interface DogusAgaci extends DogusDuzeni {
  /** Ağacın mutlak kökü. */
  kok: string;
  /** Köke göreli yola metin yazar, eksik klasörleri açar ve mutlak yolu döndürür. */
  yaz(yol: string, metin: string): string;
  /** Köke göreli yoldaki dosyayı okur. */
  oku(yol: string): string;
  /**
   * Giriş ilanının kök düğümünün gövdesine, kapanış parantezinden hemen önce
   * ilan ekler. Doğuşun öğrettiği ilk iş budur: Teknoloji ve Takım ilanı giriş
   * ilanının içine yazılır.
   */
  ilanEkle(ilan: string): void;
  /** Ağacı diskten siler. */
  sil(): void;
}

export interface AgacSecenegi {
  /** Proje adı. */
  ad?: string;
  /** Doğum günü. */
  tarih?: string;
  /** Verilirse ağaç bu dizinde doğar; verilmezse geçici bir dizin açılır. */
  kok?: string;
  /** Geçici dizinin ön eki. */
  onek?: string;
  /** Verilirse paketin yazdığı ilk Faz dosyasının içeriği bununla değiştirilir. */
  ilkFaz?: string;
}

/** Kök düğümün kapanış parantezinden önce ilan ekler; dosya o parantezle bitmiyorsa fırlatır. */
function kokGovdesineEkle(dosya: string, ilan: string): void {
  const metin = readFileSync(dosya, "utf8");
  const kapanis = metin.lastIndexOf("}");
  if (kapanis < 0 || metin.slice(kapanis + 1).trim() !== "") {
    throw new Error(`dogus-agaci: ${dosya} kök düğümün kapanış parantezini son söz olarak taşımıyor; ilan eklenemez.`);
  }
  const ek = ilan.endsWith("\n") ? ilan : `${ilan}\n`;
  writeFileSync(dosya, `${metin.slice(0, kapanis)}${ek}${metin.slice(kapanis)}`, "utf8");
}

/** Kökü verilen, diskte zaten doğmuş bir proje ağacının tutamaçları. */
function agacTutamaci(kok: string, ad: string): DogusAgaci {
  const duzen = dogusDuzeni(ad);
  const yaz = (yol: string, metin: string): string => {
    const tam = join(kok, yol);
    mkdirSync(dirname(tam), { recursive: true });
    writeFileSync(tam, metin, "utf8");
    return tam;
  };
  return {
    ...duzen,
    kok,
    yaz,
    oku: (yol) => readFileSync(join(kok, yol), "utf8"),
    ilanEkle: (ilan) => kokGovdesineEkle(join(kok, duzen.anadizin), ilan),
    sil: () => rmSync(kok, { recursive: true, force: true }),
  };
}

/** Doğuş paketiyle bir proje doğurur ve ağacın tutamaçlarını döndürür. */
export function dogusAgaciKur(secenek: AgacSecenegi = {}): DogusAgaci {
  const ad = secenek.ad ?? VARSAYILAN_AD;
  const kok = secenek.kok ?? mkdtempSync(join(tmpdir(), secenek.onek ?? "sarmal-dogus-agaci-"));
  const sonuc = dogusYaz(kok, ad, secenek.tarih ?? DOGUS_TARIHI, "proje");
  if (sonuc.atlanan.length > 0) {
    throw new Error(`dogus-agaci: ${kok} boş değildi ve paket şu dosyaları atladı: ${sonuc.atlanan.join(", ")}.`);
  }
  const agac = agacTutamaci(kok, ad);
  if (secenek.ilkFaz !== undefined) agac.yaz(agac.ilkFaz, secenek.ilkFaz);
  return agac;
}

/** Doğuş paketiyle kurulmuş bir çalışma alanı ve altındaki proje ağaçları. */
export interface CalismaAlani {
  /** Çatının mutlak kökü. */
  kok: string;
  /** Çatının giriş ilanı, köke göreli. */
  anadizin: string;
  /** Proje adı → çatının altındaki klasöründe doğmuş proje ağacı. */
  projeler: Map<string, DogusAgaci>;
  /** Çatının giriş ilanına ilan ekler. */
  ilanEkle(ilan: string): void;
  /** Bütün çatıyı diskten siler. */
  sil(): void;
}

/** Çatıya katılacak proje: adı ve çatıya göreli klasörü (verilmezse addan türer). */
export interface CatiProjesi {
  ad: string;
  klasor?: string;
}

/**
 * Doğuş paketiyle bir çalışma alanı kurar. İlk proje paketin kendisiyle, çatıyla
 * birlikte doğar. Sonraki her proje, doğuşun çatı ilanına yazdığı öğretiyi izler:
 * kendi klasöründe tek proje olarak doğar ve çatının giriş ilanına bir Kitaplık
 * satırıyla katılır. Klasör iç içe verilirse (ör. bir şablon kitaplığının altındaki
 * proje) her ara klasör de bir kez Kitaplık olarak ilan edilir.
 */
export function calismaAlaniKur(s: { ad?: string; projeler: readonly CatiProjesi[]; tarih?: string; onek?: string }): CalismaAlani {
  if (s.projeler.length === 0) throw new Error("dogus-agaci: çalışma alanı en az bir proje sarar (MIM-1.1).");
  const ad = s.ad ?? "cati";
  const tarih = s.tarih ?? DOGUS_TARIHI;
  const [ilk, ...sonrakiler] = s.projeler;
  const ilkKlasor = dogusDosyaAdi(ilk.ad);
  if (ilk.klasor !== undefined && ilk.klasor !== ilkKlasor) {
    throw new Error(`dogus-agaci: ilk proje paketin kendisiyle doğar ve klasörü addan türer (${ilkKlasor}); başka klasör sonraki projelere verilir.`);
  }
  const kok = mkdtempSync(join(tmpdir(), s.onek ?? "sarmal-dogus-cati-"));
  dogusYaz(kok, ad, tarih, "calisma-alani", ilk.ad);
  const anadizin = tekBul(dogusManifesti(ad, tarih, "calisma-alani", ilk.ad), "çatı giriş ilanı",
    (d) => d.yol.endsWith("_anadizin.sar") && !d.yol.includes("/")).yol;
  const ilanEkle = (ilan: string): void => kokGovdesineEkle(join(kok, anadizin), ilan);
  const projeler = new Map<string, DogusAgaci>([[ilk.ad, agacTutamaci(join(kok, ilkKlasor), ilk.ad)]]);

  // Sonraki projeler: her biri kendi klasöründe doğar; klasör kademeleri bir ağaçta toplanır.
  type Dugum = { parca: string; yol: string; proje?: string; alt: Map<string, Dugum> };
  const agac = new Map<string, Dugum>();
  for (const p of sonrakiler) {
    if (projeler.has(p.ad)) throw new Error(`dogus-agaci: '${p.ad}' adlı proje çatıda zaten var.`);
    const klasor = p.klasor ?? dogusDosyaAdi(p.ad);
    projeler.set(p.ad, dogusAgaciKur({ ad: p.ad, tarih, kok: join(kok, klasor) }));
    let duzey = agac;
    const parcalar = klasor.split("/");
    parcalar.forEach((parca, i) => {
      const yol = parcalar.slice(0, i + 1).join("/");
      const d = duzey.get(parca) ?? { parca, yol, alt: new Map<string, Dugum>() };
      if (i === parcalar.length - 1) d.proje = p.ad;
      duzey.set(parca, d);
      duzey = d.alt;
    });
  }
  // Çatının öğrettiği katılım: her klasör kademesi bir Kitaplıktır; en içteki proje köküdür.
  const ilanlar = (duzey: Map<string, Dugum>, derinlik: number): string[] => [...duzey.values()].flatMap((d) => {
    const girinti = "  ".repeat(derinlik);
    const ne = d.proje !== undefined
      ? `${d.proje} projesi; kendi kökü ${d.yol}/ altındaki giriş ilanındadır`
      : `${d.parca} kitaplığı; altındaki her klasör kendi Proje köküdür`;
    const bas = `${girinti}Kitaplık( kod: KTP-${dogusKodu(d.yol.split("/").join(" "))}, yol: "${d.parca}/", ne: "${ne}" )`;
    return d.alt.size === 0 ? [bas] : [`${bas} {`, ...ilanlar(d.alt, derinlik + 1), `${girinti}}`];
  });
  if (agac.size > 0) ilanEkle(ilanlar(agac, 1).join("\n"));
  return { kok, anadizin, projeler, ilanEkle, sil: () => rmSync(kok, { recursive: true, force: true }) };
}

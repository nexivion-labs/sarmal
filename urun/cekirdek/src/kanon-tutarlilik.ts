// ═══════════════════════════════════════════════════════════════════════════
// kanon-tutarlilik.ts — göç belge turu A03 kapanışı resmi kanon türevini üret
//
// Kaynak yalnız yasa/kanon sekizlisi, canlı tanı sicili ve canlı sınıflamadır.
// geneldurum/ okunmaz. Çıktı bir kanon değildir; kaynak mühürlü ölçüm yüzüdür.
// ═══════════════════════════════════════════════════════════════════════════

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { ayristir } from "./ayristirici.ts";
import { belirtecle } from "./belirtec.ts";
import { siniflamaOrtuMerge, siniflamaOrtuYukle, siniflamaYukle, type Siniflama } from "./siniflama.ts";
import {
  EMEKLI_TANI_KODLARI,
  EMEKLILIK_BORCU_TANI_KODLARI,
  ONCEKI_TANI_KODLARI,
  YENI_TANI_KANONU,
  YENI_TANI_KODLARI,
} from "./tani-sicili.ts";
import type { Deger, Dugum } from "./sozdizim.ts";

export interface KanonMaddesiOlcumu {
  readonly dosya: string;
  readonly kod: string;
  readonly rol: "Karar" | "Kural";
  readonly ornek: string;
  readonly tanilar: readonly string[];
  readonly dayanaklar: readonly string[];
  readonly dortParcaTam: boolean;
}

export interface KanonTutarlilikSonucu {
  readonly degisti: boolean;
  readonly dosya: string;
  readonly madde: number;
  readonly yeni: number;
  readonly onceki: number;
  readonly emekli: number;
  readonly emeklilikBorcu: number;
}

const sha256 = (metin: string): string => createHash("sha256").update(metin).digest("hex");
const hucre = (metin: string): string => metin.replace(/\r?\n/g, " ").replace(/\|/g, "\\|").trim();

function degerKodlari(deger: Deger | undefined): string[] {
  if (!deger) return [];
  if (deger.tur === "liste") return (deger.ogeler ?? []).flatMap(degerKodlari);
  return deger.metin ? [deger.metin] : [];
}

function alanKodlari(dugum: Dugum, ad: string): string[] {
  const alan = [...dugum.parametreler, ...dugum.ozellikler].find((p) => p.ad === ad);
  return degerKodlari(alan?.deger);
}

function dugumleriGez(dugumler: readonly Dugum[], ziyaret: (dugum: Dugum) => void): void {
  for (const dugum of dugumler) {
    ziyaret(dugum);
    dugumleriGez(dugum.cocuklar, ziyaret);
  }
}

function ornekBolumu(belge: string): string {
  return belge.match(/\*\*Örnek:\*\*\s*([\s\S]*?)(?=\n\*\*Zorlama:\*\*)/)?.[1]?.trim() ?? "—";
}

export function kanonMaddeleriniOlc(kokYolu: string): { maddeler: readonly KanonMaddesiOlcumu[]; muhurler: readonly string[]; demet: string } {
  const kok = resolve(kokYolu);
  const dizin = join(kok, "yasa", "kanon");
  const dosyalar = readdirSync(dizin).filter((ad) => ad.endsWith(".sar")).sort();
  const maddeler: KanonMaddesiOlcumu[] = [];
  const muhurler: string[] = [];
  for (const dosya of dosyalar) {
    const kaynak = readFileSync(join(dizin, dosya), "utf8");
    muhurler.push(`${dosya}:${sha256(kaynak)}`);
    const program = ayristir(belirtecle(kaynak));
    dugumleriGez(program.bildirimler, (dugum) => {
      const rol = dugum.tur === "kuralTanım" ? "Kural" : dugum.tur === "widget" && dugum.ad === "Karar" ? "Karar" : undefined;
      if (!rol) return;
      const kod = alanKodlari(dugum, "kod")[0];
      if (!kod) throw new Error(`${dosya}:${dugum.satir} maddesinde kod yok.`);
      const belge = dugum.belge ?? "";
      maddeler.push({
        dosya,
        kod,
        rol,
        ornek: ornekBolumu(belge),
        tanilar: alanKodlari(dugum, "tanı"),
        dayanaklar: alanKodlari(dugum, "dayanak").filter((deger) => deger !== "aksiyom"),
        dortParcaTam: ["Hüküm", "Gerekçe", "Örnek", "Zorlama"].every((bolum) => belge.includes(`**${bolum}:**`)),
      });
    });
  }
  const kodlar = new Set(maddeler.map((m) => m.kod));
  if (dosyalar.length !== 8 || maddeler.length !== 150 || kodlar.size !== 150) {
    throw new Error(`Resmi kanon 150/150 değil: ${dosyalar.length} dosya, ${maddeler.length}/${kodlar.size} madde.`);
  }
  return { maddeler, muhurler, demet: sha256(`${muhurler.join("\n")}\n`) };
}

function dinamikTaniKodlari(snf: Siniflama, sabit: ReadonlySet<string>): string[] {
  const sonuc = new Set<string>();
  for (const kurallar of Object.values(snf.zorunluKenarlar ?? {})) {
    for (const kural of kurallar) if (kural.tanı && !sabit.has(kural.tanı)) sonuc.add(kural.tanı);
  }
  return [...sonuc].sort((a, b) => a.localeCompare(b, "tr"));
}

function maddeTaniIndeksi(maddeler: readonly KanonMaddesiOlcumu[]): Map<string, string[]> {
  const indeks = new Map<string, string[]>();
  for (const madde of maddeler) {
    for (const tani of madde.tanilar) {
      const liste = indeks.get(tani) ?? [];
      if (!liste.includes(madde.kod)) liste.push(madde.kod);
      indeks.set(tani, liste);
    }
  }
  return indeks;
}

export function kanonTutarlilikMetni(kokYolu: string): string {
  const kok = resolve(kokYolu);
  const olcum = kanonMaddeleriniOlc(kok);
  const snfYolu = join(kok, "oz", "siniflama", "kayit.json");
  const ortuYolu = join(kok, "oz", "siniflama", "ortu.json");
  const sicilYolu = join(kok, "urun", "cekirdek", "src", "tani-sicili.ts");
  const snfKaynak = readFileSync(snfYolu, "utf8");
  const ortuKaynak = existsSync(ortuYolu) ? readFileSync(ortuYolu, "utf8") : undefined;
  const sicilKaynak = readFileSync(sicilYolu, "utf8");
  const snf = siniflamaOrtuMerge(siniflamaYukle(snfYolu), siniflamaOrtuYukle(kok));
  const sabit = new Set([...ONCEKI_TANI_KODLARI, ...YENI_TANI_KODLARI]);
  const dinamik = dinamikTaniKodlari(snf, sabit);
  const canli = new Set([...sabit, ...dinamik]);
  const maddeKodlari = new Set(olcum.maddeler.map((m) => m.kod));
  const taniIndeks = maddeTaniIndeksi(olcum.maddeler);
  const karar = olcum.maddeler.filter((m) => m.rol === "Karar").length;
  const kural = olcum.maddeler.filter((m) => m.rol === "Kural").length;
  const eksikOrnek = olcum.maddeler.filter((m) => m.ornek === "—");
  const eksikDortParca = olcum.maddeler.filter((m) => !m.dortParcaTam);
  const kirikDayanak = olcum.maddeler.flatMap((m) => m.dayanaklar.filter((d) => !maddeKodlari.has(d)).map((d) => `${m.kod}→${d}`));
  const eslesmeyenYeni = YENI_TANI_KANONU.filter((t) => !maddeKodlari.has(t.madde));
  const emekliCanli = EMEKLI_TANI_KODLARI.filter((kod) => canli.has(kod));
  const borcCanli = EMEKLILIK_BORCU_TANI_KODLARI.filter((kod) => canli.has(kod));
  const yuz33 = YENI_TANI_KANONU.filter((t) => t.madde === "YUZ-3.3" && t.kod === "tanı-yüzeyi-karışması");

  // Kanonun Karar/Kural rol dağılımı için beklenen sayılar TEK bu iki değişkende
  // yaşar; hem aşağıdaki canlı-ölçüm nöbeti hem de tutarlılık tablosundaki "Rol
  // dağılımı" satırı bunları okur. Değer elle yazılmış bir dondurma (pin) olmak
  // zorundadır çünkü nöbetin görevi kanonun rol dağılımı meşru biçimde değiştiğinde
  // (örn. Kural maddesi sayısı yüz on ikiden yüz on üçe çıktığında) bunu bilinçli bir
  // insan onayına bağlamaktır; sayı canlı ölçümün kendisinden türetilseydi (ör.
  // doğrudan `karar`/`kural` değişkenleriyle eşitlenseydi) nöbet hiçbir zaman
  // tetiklenemezdi ve kapı işlevini yitirirdi. Daha önce bu iki sayı burada ve
  // tutarlılık tablosunda ayrı ayrı elle yazılmıştı; nöbet yüz on üçe taşınırken
  // tablo satırı yüz on ikide unutulmuş ve tip denetimi bu sapmayı "113 ile 112'nin
  // kesişimi yok" hatasıyla yakalamıştı. Tek değişkene indirgemek bu sınıftan bir
  // sapmanın yapısal olarak tekrar etmesini engeller: kanon meşru biçimde
  // büyüdüğünde güncellenecek tek bir sayı çifti kalır.
  const beklenenKarar = 37;
  const beklenenKural = 113;

  // Sayı çiftleri 2026-08-24 tarihinde bilinçli olarak güncellendi: durum-boyutu
  // tanısı Founder hükmüyle emekliye ayrıldı (canlı sabit 102→101, emekli 14→15,
  // emeklilik borcu 39→38) — sabit karakter sınırı yeni kanonda norm değildir.
  if (karar !== beklenenKarar || kural !== beklenenKural || YENI_TANI_KANONU.length !== 73 || ONCEKI_TANI_KODLARI.length !== 101 ||
      EMEKLI_TANI_KODLARI.length !== 15 || EMEKLILIK_BORCU_TANI_KODLARI.length !== 38 ||
      emekliCanli.length !== 0 || borcCanli.length !== 38 || yuz33.length !== 1) {
    throw new Error("Kanon/tanı kümesi değişmezleri beklenen canlı ölçümle uyuşmuyor.");
  }

  const muhurSatirlari = olcum.muhurler.map((muhur) => {
    const [dosya, sha] = muhur.split(":");
    return `| \`yasa/kanon/${dosya}\` | \`${sha}\` |`;
  });
  const ornekSatirlari = olcum.maddeler.map((m) => `| \`${m.kod}\` | ${m.rol} | \`${m.dosya}\` | ${hucre(m.ornek)} |`);
  const yeniSatirlari = YENI_TANI_KANONU.map((t) =>
    `| \`${t.kod}\` | \`${t.madde}\` | ${t.kademe} | ${t.kapsam} | \`${t.uretici}\` |`);
  const oncekiSatirlari = [...ONCEKI_TANI_KODLARI].sort((a, b) => a.localeCompare(b, "tr")).map((kod) =>
    `| \`${kod}\` | ${taniIndeks.get(kod)?.map((m) => `\`${m}\``).join(" · ") ?? "doğrudan madde iddiası yok"} | canlı-sabit |`);
  const dinamikSatirlari = dinamik.map((kod) => `| \`${kod}\` | \`oz/siniflama/kayit.json.zorunluKenarlar\` | canlı-dinamik |`);

  const tutarlilik: Array<[string, string, string | number, boolean]> = [
    ["Resmi kaynak dosyası", "8", olcum.muhurler.length, olcum.muhurler.length === 8],
    ["Kanon maddesi", "150 tekil", new Set(olcum.maddeler.map((m) => m.kod)).size, new Set(olcum.maddeler.map((m) => m.kod)).size === 150],
    ["Rol dağılımı", `${beklenenKarar} Karar + ${beklenenKural} Kural`, `${karar} Karar + ${kural} Kural`, karar === beklenenKarar && kural === beklenenKural],
    ["Dört parçalı madde", "150/150", `${150 - eksikDortParca.length}/150`, eksikDortParca.length === 0],
    ["Kanonik örnek", "150/150", `${150 - eksikOrnek.length}/150`, eksikOrnek.length === 0],
    ["Çözülemeyen dayanak", "0", kirikDayanak.length, kirikDayanak.length === 0],
    ["Yeni tanı→madde eşleşme eksiği", "0", eslesmeyenYeni.length, eslesmeyenYeni.length === 0],
    ["Canlı-emekli kesişimi", "0", emekliCanli.length, emekliCanli.length === 0],
  ];
  const tutarlilikSatirlari = tutarlilik.map(([olcu, beklenen, gercek, gecti]) =>
    `| ${olcu} | ${beklenen} | ${gercek} | ${gecti ? "GEÇTİ" : "SAPMA"} |`);

  return [
    "// is/nitelik/goc/kanon_tutarlilik.sar — göç belge turu A03 kapanışı",
    "// Bu dosya türetilmiş ölçüm yüzüdür; kanon değildir ve hüküm değiştiremez.",
    `// KAYNAK-MUHRU kanon-demeti-sha256:${olcum.demet}`,
    "",
    "-->|",
    "# Kanon tutarlılık yüzü",
    "",
    "Bu türev yalnız `yasa/kanon/` altındaki sekiz resmi hüküm dosyasını, canlı tanı sicilini ve canlı sınıflamayı okur. `geneldurum/` kaynak değildir ve bu üreticide tüketilmez.",
    "",
    "## Kaynak mühürleri",
    "",
    "| Kaynak | SHA-256 |",
    "|---|---|",
    ...muhurSatirlari,
    `| kanon demeti | \`${olcum.demet}\` |`,
    `| \`urun/cekirdek/src/tani-sicili.ts\` | \`${sha256(sicilKaynak)}\` |`,
    `| \`oz/siniflama/kayit.json\` | \`${sha256(snfKaynak)}\` |`,
    ...(ortuKaynak ? [`| \`oz/siniflama/ortu.json\` | \`${sha256(ortuKaynak)}\` |`] : []),
    "",
    "## Resmi kanon ölçümü ve değişmezler",
    "",
    "| Ölçü | Beklenen | Gerçek | Sonuç |",
    "|---|---:|---:|---|",
    ...tutarlilikSatirlari,
    "",
    `Resmi sonuç ${olcum.maddeler.length}/${olcum.maddeler.length} maddedir. Tek adres \`yasa/kanon/\`; bu türev hüküm metni kurmaz.`,
    "",
    "## Kanonik örnekler — 150/150",
    "",
    "| Madde | Rol | Resmi dosya | Kanondan ölçülen Örnek bölümü |",
    "|---|---|---|---|",
    ...ornekSatirlari,
    "",
    "## Tanı ↔ madde haritası — yeni küme",
    "",
    `Plan konisindeki 69 yeni tanı tabanı canlı sicilde korunur; YUZ-3.3 maddesinin \`tanı-yüzeyi-karışması\` kaydı buna eklenen yetmişinci kimliktir. Güncel küme ${YENI_TANI_KANONU.length} tanıdır ve düzey dağılımı ${YENI_TANI_KANONU.filter((t) => t.kademe === "hata").length} hata + ${YENI_TANI_KANONU.filter((t) => t.kademe === "uyarı").length} uyarı + ${YENI_TANI_KANONU.filter((t) => t.kademe === "bilgi").length} bilgidir.`,
    "",
    "| Tanı | Kanon maddesi | Canlı düzey | Kapsam | Üretici |",
    "|---|---|---|---|---|",
    ...yeniSatirlari,
    "",
    "## Canlı korunan sabit küme",
    "",
    `Yeni kümeden önceki ${ONCEKI_TANI_KODLARI.length} sabit kimlik canlı sicilde korunur. Kanonun yapısal \`tanı:\` alanında açıkça geçen maddeler ikinci sütunda gösterilir; “doğrudan madde iddiası yok” ifadesi yeni bir eşleme icat edilmediğini bildirir.`,
    "",
    "| Korunan kimlik | Yapısal kanon iddiası | Durum |",
    "|---|---|---|",
    ...oncekiSatirlari,
    "",
    "## Sınıflamadan türeyen canlı kimlikler",
    "",
    `Sabit 171 kimliğe ek olarak ${dinamik.length} kimlik canlı \`zorunluKenarlar\` verisinden türetilir. Bunlar sabit yönlendirme sayısına veya yeni-küme düzey dağılımına eklenmez.`,
    "",
    "| Kimlik | Kaynak | Durum |",
    "|---|---|---|",
    ...dinamikSatirlari,
    "",
    "## Güncel emekli kümesi ve emeklilik borcu",
    "",
    `Emekli kararı uygulanmış ve canlı sicilden çıkmış küme ${EMEKLI_TANI_KODLARI.length} kimliktir: ${EMEKLI_TANI_KODLARI.map((kod) => `\`${kod}\``).join(" · ")}.`,
    "",
    `Emekli kararı bulunduğu hâlde uyumluluk için sabit veya sınıflama-türevli sicilde yaşamayı sürdüren açık borç ${EMEKLILIK_BORCU_TANI_KODLARI.length} kimliktir: ${EMEKLILIK_BORCU_TANI_KODLARI.map((kod) => `\`${kod}\``).join(" · ")}. Bu küme “emekli” diye yanlış sayılmaz; çelişki raporunda açık kalır.`,
    "",
    "## Çelişki raporu",
    "",
    "| Bulgu | Ölçüm | Hüküm |",
    "|---|---:|---|",
    `| Planın 69 yeni tanı damgası ile canlı sicil | 69 + YUZ-3.3'ten 1 + iki gözlem + ORK-8'den 1 = ${YENI_TANI_KANONU.length} | ÇÖZÜLDÜ · güncel sayı ${YENI_TANI_KANONU.length} |`,
    `| Yeni tanının resmi maddesi eksik | ${eslesmeyenYeni.length} | ${eslesmeyenYeni.length === 0 ? "YOK" : "AÇIK"} |`,
    `| Kanonik örnek eksiği | ${eksikOrnek.length} | ${eksikOrnek.length === 0 ? "YOK" : "AÇIK"} |`,
    `| Dört parçalı madde eksiği | ${eksikDortParca.length} | ${eksikDortParca.length === 0 ? "YOK" : "AÇIK"} |`,
    `| Çözülemeyen kanon dayanağı | ${kirikDayanak.length} | ${kirikDayanak.length === 0 ? "YOK" : "AÇIK"} |`,
    `| Uygulanmış emekli kümesinin canlı sicille kesişimi | ${emekliCanli.length} | ${emekliCanli.length === 0 ? "YOK" : "AÇIK"} |`,
    `| Emeklilik kararı uygulanmamış canlı kimlik | ${borcCanli.length} | AÇIK · Founder sahipliği gerekir |`,
    `| Eski \`geneldurum/\` türevi | ${existsSync(join(kok, "geneldurum")) ? "dizin var" : "0"} | ${existsSync(join(kok, "geneldurum")) ? "AÇIK · nihai arşive taşı" : "YOK · arşiv işlemi gerekmiyor"} |`,
    "",
    "Kanon dosyalarının hiçbir baytı bu üretimde değiştirilmez. Kaynak mühürleri yukarıdaki sekiz SHA-256 değeriyle yeniden üretilebilir.",
    "|<--",
    "",
    "Veri( kod: VR-GOC-KANON-TUTARLILIK-MUHRU,",
    `      ne: "Resmi yasa/kanon sekizlisinin ${olcum.maddeler.length}/${olcum.maddeler.length} maddesi, ${karar} Karar ve ${kural} Kural rolüyle ölçüldü; sekiz kaynak SHA-256 değeri ve demet mührü bu türevde kayıtlıdır." )`,
    "",
    "Veri( kod: VR-GOC-TANI-MADDE-HARITASI,",
    `      ne: "Planın 69 yeni tanı tabanı YUZ-3.3 tanısıyla, iki gözlemle ve ORK-8 mevsim vadesiyle ${YENI_TANI_KANONU.length} canlı yeni kimliğe ulaşır; önceki ${ONCEKI_TANI_KODLARI.length} sabit kimlik, ${dinamik.length} sınıflama-türevli kimlik, ${EMEKLI_TANI_KODLARI.length} uygulanmış emekli kimlik ve ${EMEKLILIK_BORCU_TANI_KODLARI.length} açık emeklilik borcu ayrı kümeler olarak ölçülür." )`,
    "",
    "Veri( kod: VR-GOC-KANON-TUTARLILIK-SONUCU,",
    `      ne: "Kanonik örnek eksiği ${eksikOrnek.length}, dört-parça eksiği ${eksikDortParca.length}, çözülemeyen dayanak ${kirikDayanak.length}, yeni tanı madde eksiği ${eslesmeyenYeni.length} ve canlı-emekli kesişimi ${emekliCanli.length}; açık tek sınıfsal çelişki ${borcCanli.length} uygulanmamış emeklilik kararıdır." )`,
    "",
  ].join("\n");
}

export function kanonTutarlilikUret(kokYolu: string): KanonTutarlilikSonucu {
  const kok = resolve(kokYolu);
  const hedef = join(kok, "is", "nitelik", "goc", "kanon_tutarlilik.sar");
  const yeni = kanonTutarlilikMetni(kok);
  const mevcut = existsSync(hedef) ? readFileSync(hedef, "utf8") : undefined;
  if (yeni !== mevcut) writeFileSync(hedef, yeni, "utf8");
  return {
    degisti: yeni !== mevcut,
    dosya: hedef,
    madde: 150,
    yeni: YENI_TANI_KANONU.length,
    onceki: ONCEKI_TANI_KODLARI.length,
    emekli: EMEKLI_TANI_KODLARI.length,
    emeklilikBorcu: EMEKLILIK_BORCU_TANI_KODLARI.length,
  };
}

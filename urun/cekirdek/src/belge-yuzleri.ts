// ═══════════════════════════════════════════════════════════════════════════
// belge-yuzleri.ts — kalıcı README/indeks/Diátaxis yüzlerini tek kaynaktan üret
//
// Elle korunan giriş ile üretilen kanonik bölge ayrı işaretlenir. Üretici ilk
// göçte kısa bir giriş kurar; sonraki koşularda girişe dokunmaz ve yalnız kendi
// bölgesini değiştirir. Bütün diziler sıralı, bütün ölçümler canlı kaynaktandır.
// ═══════════════════════════════════════════════════════════════════════════

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { ayristir } from "./ayristirici.ts";
import { belirtecle } from "./belirtec.ts";
import { sarmalKavramSozlugu } from "./cevir.ts";
import { MCP_ARAC_ADI } from "./mcp-metinleri.ts";
import {
  siniflamaOrtuMerge,
  siniflamaOrtuYukle,
  siniflamaYukle,
  taksonomiBlokUygula,
  taksonomiMd,
  type Siniflama,
} from "./siniflama.ts";
import { ONCEKI_TANI_METINLERI, TANI_METINLERI } from "./tani-metinleri.ts";
import { YENI_TANI_KANONU } from "./tani-sicili.ts";
import type { Dugum } from "./sozdizim.ts";

export type BelgeAmaci = "README" | "indeks" | "Reference" | "Tutorial" | "How-To" | "Explanation";

export interface BelgeYuzuHedefi {
  readonly kimlik: string;
  readonly yol: string;
  readonly amac: BelgeAmaci;
}

export interface BelgeYuzuSonucu {
  readonly degisen: readonly string[];
  readonly degismeyen: readonly string[];
  readonly kanonMaddesi: number;
  readonly aracSayisi: number;
}

export const ELLE_BAS = "<!-- SARMAL:ELLE-KORUNAN:BAS -->";
export const ELLE_SON = "<!-- SARMAL:ELLE-KORUNAN:SON -->";
export const URETIM_BAS = (kimlik: string): string => `<!-- SARMAL:URETILEN:${kimlik}:BAS -->`;
export const URETIM_SON = (kimlik: string): string => `<!-- SARMAL:URETILEN:${kimlik}:SON -->`;

export const BELGE_YUZU_HEDEFLERI: readonly BelgeYuzuHedefi[] = [
  { kimlik: "KOK-README-TR", yol: "README.md", amac: "README" },
  { kimlik: "KOK-README-EN", yol: "README.en.md", amac: "README" },
  { kimlik: "KOK-NEDIR", yol: "NEDIR.md", amac: "Explanation" },
  { kimlik: "KOK-KAVRAMLAR", yol: "KAVRAMLAR.md", amac: "indeks" },
  { kimlik: "KOK-ROLLER", yol: "ROL-HARITASI.md", amac: "Explanation" },
  { kimlik: "CEKIRDEK-README", yol: "urun/cekirdek/README.md", amac: "README" },
  { kimlik: "EKLENTI-README", yol: "urun/eklenti/README.md", amac: "How-To" },
  { kimlik: "REHBER-DIL", yol: "urun/eklenti/medya/rehber/01-dil.md", amac: "Tutorial" },
  { kimlik: "REHBER-DENETIM", yol: "urun/eklenti/medya/rehber/02-denetim.md", amac: "How-To" },
  { kimlik: "REHBER-OKUMA", yol: "urun/eklenti/medya/rehber/03-okuma.md", amac: "How-To" },
  { kimlik: "REHBER-OGRENIM", yol: "urun/eklenti/medya/rehber/04-ogrenim.md", amac: "Tutorial" },
  { kimlik: "REHBER-BICIM", yol: "urun/eklenti/medya/rehber/05-bicim.md", amac: "How-To" },
  { kimlik: "REHBER-GEZINME", yol: "urun/eklenti/medya/rehber/06-gezinme.md", amac: "How-To" },
  { kimlik: "SNF-REFERENCE", yol: "oz/siniflama/kayit.md", amac: "Reference" },
  { kimlik: "ORNEK-OKU", yol: "ogreti/ornek/OKU.md", amac: "indeks" },
  { kimlik: "SABLON-OKU", yol: "ogreti/sablon/OKU.md", amac: "How-To" },
] as const;

const markdownKacis = (metin: string): string => metin.replace(/\|/g, "\\|");
const sha256 = (metin: string): string => createHash("sha256").update(metin).digest("hex");

function dugumleriGez(dugumler: readonly Dugum[], ziyaret: (dugum: Dugum) => void): void {
  for (const dugum of dugumler) {
    ziyaret(dugum);
    dugumleriGez(dugum.cocuklar, ziyaret);
  }
}

export function kanonOlc(kok: string): { madde: number; karar: number; kural: number; kodlar: readonly string[]; muhurler: readonly string[] } {
  const dizin = join(kok, "yasa", "kanon");
  const dosyalar = readdirSync(dizin).filter((ad) => ad.endsWith(".sar")).sort();
  const kodlar: string[] = [];
  let karar = 0;
  let kural = 0;
  const muhurler: string[] = [];
  for (const dosya of dosyalar) {
    const kaynak = readFileSync(join(dizin, dosya), "utf8");
    muhurler.push(`${dosya}:${sha256(kaynak)}`);
    const program = ayristir(belirtecle(kaynak));
    dugumleriGez(program.bildirimler, (dugum) => {
      const maddeMi = (dugum.tur === "widget" && dugum.ad === "Karar") || dugum.tur === "kuralTanım";
      if (!maddeMi) return;
      const kod = dugum.parametreler.find((p) => p.ad === "kod")?.deger.metin;
      if (!kod) throw new Error(`${dosya}:${dugum.satir} kanon maddesinde kod yok.`);
      kodlar.push(kod);
      if (dugum.tur === "kuralTanım") kural++;
      else karar++;
    });
  }
  if (dosyalar.length !== 8 || kodlar.length !== 151 || new Set(kodlar).size !== 151) {
    throw new Error(`Kanon ölçümü beklenmedik: ${dosyalar.length} dosya, ${kodlar.length}/${new Set(kodlar).size} madde.`);
  }
  return { madde: kodlar.length, karar, kural, kodlar, muhurler };
}

export function belgeBolgesiUygula(mevcut: string | undefined, hedef: BelgeYuzuHedefi, baslik: string, giris: string, govde: string): string {
  const elleVarsayilan = [ELLE_BAS, `# ${baslik}`, "", giris, ELLE_SON].join("\n");
  const uretim = [URETIM_BAS(hedef.kimlik), `<!-- SARMAL:DIATAXIS ${hedef.amac} -->`, govde.trim(), URETIM_SON(hedef.kimlik)].join("\n");
  if (!mevcut || !mevcut.includes(ELLE_BAS) || !mevcut.includes(ELLE_SON)) return `${elleVarsayilan}\n\n${uretim}\n`;
  const elleBas = mevcut.indexOf(ELLE_BAS);
  const elleSon = mevcut.indexOf(ELLE_SON, elleBas) + ELLE_SON.length;
  const elle = mevcut.slice(elleBas, elleSon);
  const uBas = mevcut.indexOf(URETIM_BAS(hedef.kimlik));
  const uSon0 = mevcut.indexOf(URETIM_SON(hedef.kimlik), uBas);
  if (uBas >= 0 && uSon0 >= uBas) {
    const uSon = uSon0 + URETIM_SON(hedef.kimlik).length;
    return `${mevcut.slice(0, uBas)}${uretim}${mevcut.slice(uSon)}`;
  }
  return `${elle}\n\n${uretim}\n`;
}

interface BelgeOlgulari {
  readonly kok: string;
  readonly snf: Siniflama;
  readonly kanon: ReturnType<typeof kanonOlc>;
  readonly hata: number;
  readonly uyari: number;
  readonly bilgi: number;
  readonly problems: number;
  readonly hatirlaticilar: number;
  readonly bildirimler: number;
  readonly arac: number;
  /**
   * Statik `TANI_METINLERI` + `ONCEKI_TANI_METINLERI` kataloglarında Türkçe/
   * İngilizce metni hazır bulunan tanı kimliği sayısı — belge yüzlerindeki
   * "Tanı metinlerinin N'i ... iki dilli" cümlesinin canlı kaynağı.
   */
  readonly ikiDilliTani: number;
}

function olgulariOlc(kok: string): BelgeOlgulari {
  const say = (kademe: "hata" | "uyarı" | "bilgi"): number =>
    YENI_TANI_KANONU.filter((kayit) => kayit.kademe === kademe).length;
  const matris = readFileSync(join(kok, "is", "nitelik", "goc", "tani_yuzeyi_yonlendirme_matrisi.sar"), "utf8");
  const rota = (ad: string): number => {
    const eslesme = matris.split("\n").find((satir) => satir.startsWith(`| ${ad} |`))?.match(/^\| [^|]+ \| (\d+) \|/);
    if (!eslesme) throw new Error(`${ad} yönlendirme sayısı matriste bulunamadı.`);
    return Number(eslesme[1]);
  };
  // Matrisin "Toplam" satırı kalın (**171**) biçimlidir; `rota()`nın çıplak
  // sayı deseni burada eşleşmez, ayrı bir desenle okunur.
  const sicilToplamiSatiri = matris.split("\n").find((satir) => satir.startsWith("| **Toplam** |"));
  const sicilToplamiEslesme = sicilToplamiSatiri?.match(/^\| \*\*Toplam\*\* \| \*\*(\d+)\*\* \|/);
  if (!sicilToplamiEslesme) throw new Error("Yönlendirme matrisinde Toplam satırı bulunamadı.");
  const sicilToplami = Number(sicilToplamiEslesme[1]);
  const olgular: BelgeOlgulari = {
    kok,
    snf: siniflamaOrtuMerge(
      siniflamaYukle(join(kok, "oz", "siniflama", "kayit.json")),
      siniflamaOrtuYukle(kok),
    ),
    kanon: kanonOlc(kok),
    hata: say("hata"),
    uyari: say("uyarı"),
    bilgi: say("bilgi"),
    problems: rota("Problems"),
    hatirlaticilar: rota("Hatırlatıcılar"),
    bildirimler: rota("Bildirimler"),
    arac: Object.values(MCP_ARAC_ADI).length,
    ikiDilliTani: Object.keys(TANI_METINLERI).length + Object.keys(ONCEKI_TANI_METINLERI).length,
  };
  if (`${olgular.hata}/${olgular.uyari}/${olgular.bilgi}` !== "47/16/11" ||
      `${olgular.problems}/${olgular.hatirlaticilar}/${olgular.bildirimler}` !== "143/4/28" ||
      olgular.arac !== 18 ||
      olgular.ikiDilliTani !== 174) {
    throw new Error("Bağlayıcı belge ölçümleri beklenen canlı dağılımla uyuşmuyor.");
  }
  // Sayılar 2026-08-27 tarihinde bir kez ilerledi: ORK-8 mevsim ritüelinin ilk
  // motor karşılığı `mevsim-vadesi-geçti` doğdu (Founder hükmü); bilgi kademesi
  // ondan on bire, Bildirimler yüzeyi yirmi yediden yirmi sekize ve iki dilli
  // katalog yüz yetmiş ikiden yüz yetmiş üçe çıktı.
  // 174 vs 175 farkının kayıtlı gerekçesi: sicilToplami (matrisin "Toplam"
  // satırı) SABIT_TANI_KODLARI'nın tamamını (ONCEKI_TANI_KODLARI + YENI_
  // TANI_KANONU = 102 + 70 = 172 kimlik) sayar. ikiDilliTani ise yalnız
  // TANI_METINLERI + ONCEKI_TANI_METINLERI statik kataloglarında gerçek
  // Türkçe/İngilizce metni HAZIR duran kimlikleri sayar (70 + 101 = 171).
  // Aradaki tek fark "söz-dizim" kimliğidir: o da iki dillidir ama metni
  // statik katalogdan değil, ayrıştırıcının o anki SozDizimHatasi nesnesinden
  // (bkz. tani-metinleri.ts sozDizimTanisi: hata.message / hata.ingilizceMesaj)
  // her seferinde yeniden üretilir — sabit bir katalog girdisi olamaz çünkü
  // cümlesi hatanın konumuna ve içeriğine göre değişir. Bu yüzden "171" (yüz
  // metinlerindeki ifade) ile matrisin "172"si (sicil toplamı) ÇELİŞMEZ; ikisi
  // farklı kümeleri ölçer. Aşağıdaki eşitlik bu varsayımı canlı sınar: kırılırsa
  // ya statik katalog ya matris ya da "yalnız bir dinamik kimlik var" varsayımı
  // bozulmuş demektir ve biri yanlış ölçülüyordur.
  if (sicilToplami - olgular.ikiDilliTani !== 1) {
    throw new Error(
      `Sicil toplamı (${sicilToplami}) ile statik iki dilli tanı kataloğu (${olgular.ikiDilliTani}) arasındaki fark artık 1 değil; ` +
      `"yalnız söz-dizim kimliği katalog dışı" varsayımı bozulmuş olabilir — kaynağı yeniden ölç.`,
    );
  }
  return olgular;
}

function kokReadme(o: BelgeOlgulari): string {
  return `Sarmal, yazılım niyetini bildirimsel \`.sar\` kaynaklarında tutan; planı, kuralları, ajan bağlamını ve denetim yüzlerini aynı kaynaktan besleyen açık bir çalışma alanı dilidir.

## Tek kaynak ve ölçülen yüzler

Kanonun tek adresi [\`yasa/kanon/\`](yasa/kanon/) altındaki sekiz bölüm dosyasıdır. Bu kaynaklarda ${o.kanon.madde} tekil madde yaşar: ${o.kanon.karar} Karar ve ${o.kanon.kural} Kural. Kalıcı belgeler hüküm kopyası değil, bu kaynaklardan üretilen okuma yüzleridir.

Yeni tanı kümesi ${o.hata} hata, ${o.uyari} uyarı ve ${o.bilgi} bilgi düzeyindedir. Sabit sicilin yönlendirme matrisi ${o.problems} Problems, ${o.hatirlaticilar} Hatırlatıcılar ve ${o.bildirimler} Bildirimler (Gözlemler) olarak ölçülür. Tanı metinlerinin ${o.ikiDilliTani}'i, ${o.arac} MCP aracının açıklamaları, manifest, karşılama kartı ve ajan dil bağlamı Türkçe ve İngilizce yüz taşır. İngilizce başlangıç yüzü [README.en.md](README.en.md) dosyasındadır.

## Açık sınır

Sarmal [Apache-2.0](LICENSE.md) lisansı ile açıktır. kapalı ürün, **Sarmal ile yönetilen ayrı kapalı ürün**dür; bu belge o ürünün içeriğini anlatmaz.

Kendi etmenini yazma yeteneği de açık kapsamın parçasıdır: **Etmen · Beceri · Tetikleyici + sef**. \`Etmen\` kimliği ve yetkisi, \`Beceri\` uygulanabilir bilgisini, \`Tetikleyici\` ne zaman devreye gireceğini bildirir; \`sef\` ise Adım konisini bu bağlamla kurar.

## Başlangıç

Kurulum tek adımdır ve Node 23.6 ya da üstünü ister: \`cd urun/cekirdek && npm link\` komutu \`sarmal\` komutunu kabuğa bağlar; sürüm şartının kaynağı \`urun/cekirdek/package.json\` dosyasıdır. \`cd urun/cekirdek && npm test\` çekirdek davranışını sınar. İlk kanonik proje kartı için \`sarmal ogret\`, bütün çalışma alanını denetlemek için \`sarmal denetle .\`, bir şablonu görmek için \`sarmal başla proje\` kullanılır. Onay gerektiren işler kullanıcı yüzünde **ONAYLAR** paneline gider.

## Belge haritası

[NEDIR.md](NEDIR.md) kavramsal açıklamayı, [KAVRAMLAR.md](KAVRAMLAR.md) başvuru indeksini, [ROL-HARITASI.md](ROL-HARITASI.md) açık/kapalı rol sınırını, [urun/eklenti/README.md](urun/eklenti/README.md) eklentiyi kullanma görevini ve [oz/siniflama/kayit.md](oz/siniflama/kayit.md) tam tip/alan Reference tablosunu verir.`;
}

function kokReadmeEn(o: BelgeOlgulari): string {
  return `Sarmal is an open workspace language that keeps software intent in declarative \`.sar\` sources and derives plans, rules, agent context, and diagnostic reading surfaces from those sources.

## One source, measured surfaces

The only canonical address is the eight section files under [\`yasa/kanon/\`](yasa/kanon/). They contain ${o.kanon.madde} unique articles: ${o.kanon.karar} Decisions and ${o.kanon.kural} Rules. Documents are derived reading surfaces, not a second canon.

The new diagnostic set contains ${o.hata} errors, ${o.uyari} warnings, and ${o.bilgi} informational diagnostics. The fixed registry routing matrix sends ${o.problems} items to Problems, ${o.hatirlaticilar} to Reminders, and ${o.bildirimler} to Notifications (Observations). All ${o.ikiDilliTani} diagnostic messages, the descriptions of ${o.arac} MCP tools, the manifest, welcome card, and agent language context have Turkish and English surfaces.

## Open boundary

Sarmal is open under [Apache-2.0](LICENSE.md). kapalı ürün is a separate closed product managed with Sarmal; this document does not describe its contents.

Writing your own agent is part of the open capability: **Etmen · Beceri · Tetikleyici + sef**. \`Etmen\` declares identity and authority, \`Beceri\` holds applicable knowledge, \`Tetikleyici\` states when it applies, and \`sef\` assembles that context around an Adım.

## Start

Installation is a single step and requires Node 23.6 or newer: \`cd urun/cekirdek && npm link\` binds the \`sarmal\` command to your shell; the version requirement lives in \`urun/cekirdek/package.json\`. Use \`sarmal ogret\` for the canonical welcome card, \`sarmal denetle .\` to check a workspace, and \`sarmal başla proje\` to inspect the project template. Work that needs approval appears in the **APPROVALS (ONAYLAR)** panel. The Turkish primary surface is [README.md](README.md).`;
}

function nedir(o: BelgeOlgulari): string {
  return `## Niyetin çalışan haritası

Sarmal, kaynak kodun yerine geçen bir programlama dili değildir. İnsan ve etmenin üzerinde uzlaştığı niyeti, yapıyı, işi ve sınırları tek bir graf içinde görünür kılar. Diskteki gerçek ile bildirilen plan ayrıştığında denetim bunu tanı olarak gösterir; araçlar ve okuma yüzleri aynı anlam ağacından türediği için ikinci bir eş-yetkili belge kurulmaz.

Kanon ${o.kanon.madde} maddelik sekiz bölümden oluşur ve yalnız \`yasa/kanon/\` altında yaşar. Katı üretim omurgası \`ÇalışmaAlanı → Auth → Proje[*] → Faz → Blok → Katman → AltKatman → Adım → üretir → Meyve → dosya\` zinciridir. Esnek rejim bilinçli bir istisnadır; gerekçesi açık yazılır.

Sarmal Apache-2.0 ile açıktır. kapalı ürün, Sarmal ile yönetilen ayrı kapalı üründür; açık dilin belgesi kapalı ürünün içeriğini taşımaz. Bu ayrım, açık dilin kendi etmenini yazma yeteneğini kapsamasına engel değildir: Etmen, Beceri, Tetikleyici ve sef açık araç zinciridir.`;
}

function roller(): string {
  return `## Yetki ve ürün sınırı

Founder kanonik yönü ve açık/kapalı ürün sınırını karara bağlar. Üretici, verilmiş koni içindeki ürünü ve kanıtı üretir; Kontrolcü kabul ölçütünü bağımsız ölçer. ŞEF işi seçer, Adım konisini kurar ve Etmen · Beceri · Tetikleyici bağlamını \`sef\` yüzüne taşır. Hiçbir rol kanonik hükmü bir Markdown yüzünde değiştiremez.

Sarmal Apache-2.0 lisanslı açık dildir. kapalı ürün, Sarmal ile yönetilen ayrı kapalı üründür; rol haritası onun içeriğini değil yalnız sınırını bildirir. Kullanıcı onayı gereken eylemler ONAYLAR panelinde görünür.`;
}

function kavramlar(o: BelgeOlgulari): string {
  const aileSatirlari = Object.entries(o.snf.aileler ?? {})
    .sort(([a], [b]) => a.localeCompare(b, "tr"))
    .map(([ad, ne]) => `| ${markdownKacis(ad)} | ${markdownKacis(ne)} |`);
  const sarmalKavramSatirlari = Object.entries(sarmalKavramSozlugu())
    .sort(([a], [b]) => a.localeCompare(b, "tr"))
    .map(([ad, g]) => `| \`${markdownKacis(ad)}\`${g.en ? ` · ${markdownKacis(g.en)}` : ""} | ${markdownKacis(g.nerede ?? "—")} | ${markdownKacis(g.dayanak)} |`);
  return `## Kaynak indeksi

| Aranan kavram | Tek kaynak | Okuma yüzü |
|---|---|---|
| Kanonik hüküm | \`yasa/kanon/\` içindeki sekiz dosya | \`${o.kanon.madde}\` madde; metin burada yinelenmez |
| Tip, alan, enum ve sarma | \`oz/siniflama/kayit.json\` | [tam Reference tablosu](oz/siniflama/kayit.md) |
| Tanı kimliği ve düzeyi | \`urun/cekirdek/src/tani-sicili.ts\` | ${o.hata} hata · ${o.uyari} uyarı · ${o.bilgi} bilgi |
| Araç metni | \`urun/cekirdek/src/mcp-metinleri.ts\` | ${o.arac} iki dilli MCP aracı |
| Karşılama kartı | \`urun/cekirdek/src/ogret.ts\` | \`sarmal ogret\` |
| Ajan çıktı dili | \`urun/cekirdek/src/dil-baglami.ts\` | Türkçe / İngilizce |

## Üretim omurgası

Katı rejimde zincir \`ÇalışmaAlanı → Auth → Proje[*] → Faz → Blok → Katman → AltKatman → Adım → üretir → Meyve → dosya\` biçimindedir. Faz zamanı, Blok işi, Katman teknolojiyi, AltKatman departmanı ve Adım akışı taşır. Esnek rejim yalnız gerekçeli istisnadır.

## Tip aileleri

| Aile | Canlı sınıflama açıklaması |
|---|---|
${aileSatirlari.join("\n")}

Alan ayrıntısı bu indekste kopyalanmaz; \`kayit.json\`dan üretilen Reference yüzüne gidilir.

## Sarmal'ın kendi kavramları

Aşağıdaki kavramlar Sarmal'ın kendi mimarisine aittir ve \`kavram\` aracıyla
sorgulanabilir. Tanımın kendisi burada değil, sözlüğün tek kaynağında yaşar;
bu bölüm o kaynaktan üretilir ve her kavramın kanonik dayanağını gösterir.

| Kavram | Nerede yaşar | Kanonik dayanak |
|---|---|---|
${sarmalKavramSatirlari.join("\n")}`;
}

function cekirdekReadme(o: BelgeOlgulari): string {
  return `## Geliştirme yüzü

Çekirdek; belirteçleme, ayrıştırma, doğrulama, proje denetimi, nötr graf, belge üretimi ve ${o.arac} MCP aracının çalışma mantığını taşır. Kanonik hükmün evi bu dizin değil, üst kökteki \`yasa/kanon/\` sekizlisidir.

\`npm run tip-denetle\` TypeScript kapısını, \`npm test\` çekirdek süitini çalıştırır. Üst kökü denetlemek için \`node src/sarmal.ts denetle ../..\`, kalıcı belge yüzlerini tazelemek için \`node src/sarmal.ts belge-yuzleri-uret ../..\` kullanılır.

Belge üretim yolu iki parçalıdır. \`belgele.ts\` tekil \`.sar\` kaynağını Markdown'a yansıtır; \`belge-yuzleri.ts\` README, indeks ve Diátaxis bölgelerini canlı kanon, sınıflama ve sicilden üretir. \`siniflama.ts\` ise ${o.snf.widgetTipleri.length} tipin tam alan tablosunu ayrı Reference yüzünde kurar.`;
}

function eklentiReadme(o: BelgeOlgulari): string {
  return `<!-- SARMAL:GOREV:TAM -->
## Görev: eklentiyi çalıştırıp bir çalışma alanını denetlemek

1. \`cd urun/eklenti && npm install\` ile geliştirme bağımlılıklarını kurun.
2. \`npm run build\` ile eklenti tip kapısını çalıştırın.
3. Editörde depo kökünü (F5 yapılandırması \`.vscode/launch.json\` dosyasındadır) ya da \`urun/eklenti\` dizinini açıp geliştirme ana bilgisayarını başlatın.
4. Bir \`.sar\` dosyası açın; sorunları Problems, gözlemleri Bildirimler (Gözlemler), ileri bağlamı Hatırlatıcılar yüzünde izleyin.
5. Onay gerektiren bir eylemi **ONAYLAR** panelinden değerlendirin.

Eklenti manifesti ve karşılama yüzü Türkçe/İngilizce haneler taşır. Tanı metinlerinin ${o.ikiDilliTani}'i ve ${o.arac} MCP aracının açıklamaları da iki dillidir. Yeni tanı dağılımı ${o.hata} hata, ${o.uyari} uyarı ve ${o.bilgi} bilgidir; sabit yönlendirme matrisi ${o.problems}/${o.hatirlaticilar}/${o.bildirimler} olarak ölçülür.

Sarmal Apache-2.0 lisanslıdır. Lisans bildirimi [LICENSE.md](LICENSE.md) dosyasındadır.`;
}

function rehberDil(): string {
  return `<!-- SARMAL:ADIM-ZINCIRI:CALISTIRILABILIR -->
## Çalışan ilk zincir

1. \`ilk_proje_anadizin.sar\` dosyasını oluşturun ve \`sarmal ogret\` kartındaki anadizin örneğini kopyalayın.
2. \`plan/ilk_plan.sar\` dosyasını oluşturup aynı karttaki katı zinciri kopyalayın.
3. Kökten \`sarmal denetle .\` komutunu çalıştırın.
4. Tanı varsa öneriyi kaynağa uygulayın ve aynı komutu yeniden çalıştırın.

\`sarmal ogret\` örneği, Faz → Blok → Katman → AltKatman → Adım zincirinin ayrıştırılıp denetlendiği tek kaynaklı çalıştırılabilir karttır. Katı rejimde hiçbir kademe atlanmaz.`;
}

function rehberDenetim(o: BelgeOlgulari): string {
  return `<!-- SARMAL:GOREV:TAM -->
## Görev: tanıyı doğru okuma yüzünde kapatmak

1. Çalışma alanı kökünde \`sarmal denetle .\` çalıştırın.
2. Hata ve uyarıyı Problems yüzünde, ileri bağlamı Hatırlatıcılar yüzünde, bilgi gözlemini Bildirimler (Gözlemler) yüzünde açın.
3. Tanının gösterdiği kaynak satırını ve öneriyi izleyerek \`.sar\` kaynağını düzeltin.
4. Aynı komutu yeniden çalıştırın; ilgili kimliğin kaybolduğunu ölçün.

Yeni sicil kümesi ${o.hata} hata, ${o.uyari} uyarı ve ${o.bilgi} bilgidir. Sabit sicilin yönlendirme matrisi ${o.problems} Problems, ${o.hatirlaticilar} Hatırlatıcılar ve ${o.bildirimler} Bildirimler (Gözlemler) üretir.`;
}

function rehberOkuma(): string {
  return `<!-- SARMAL:GOREV:TAM -->
## Görev: bir kaynağın insan yüzünü üretmek

1. Geçerli bir \`.sar\` kaynak dosyası seçin.
2. \`sarmal belge kaynak.sar --yaz cikti.md\` komutunu çalıştırın.
3. Çıktının kaynak düğümlerini ve belge bloklarını taşıdığını okuyun.
4. Kaynağı değiştirmeden komutu yeniden çalıştırıp çıktının aynı kaldığını doğrulayın.

Markdown türevi hüküm kaynağı değildir. Kanonik hükmün tek adresi \`yasa/kanon/\`; genel belge üreticisinin girdisi ise seçilen \`.sar\` dosyasıdır.`;
}

function rehberOgrenim(): string {
  return `<!-- SARMAL:ADIM-ZINCIRI:CALISTIRILABILIR -->
## Öğretim zincirini çalıştırmak

1. Terminalde \`sarmal ogret\` çalıştırın.
2. Karttaki iki dosyayı belirtilen konumlara kopyalayın.
3. \`sarmal denetle .\` ile örneği doğrulayın.
4. Bir tanının \`bkz\` işaretçisi varsa \`ogrenme/\` rafındaki ilgili Beceri kaynağını okuyun ve yeniden denetleyin.

Karşılama kartı sınıflama, koni alanları ve zorunlu kenarlardan üretilir; Türkçe ve İngilizce aynı yapı kaynağını kullanır.`;
}

function rehberBicim(): string {
  return `<!-- SARMAL:GOREV:TAM -->
## Görev: kaynağı kanonik biçime getirmek

1. Biçimlenecek \`.sar\` dosyasını kaydedin.
2. Editörde “Belgeyi Biçimlendir” eylemini çalıştırın; araç kullanan etmen aynı çekirdeğe \`bicimle\` MCP aracıyla ulaşır.
3. \`sarmal dosya.sar\` ile tek dosya söz dizimini doğrulayın.
4. Kökten \`sarmal denetle .\` çalıştırıp biçim değişikliğinin anlam grafını bozmadığını ölçün.

Biçimleyici hüküm üretmez; DIL-2 şekil sözleşmesini uygular. Katı plan örnekleri Faz → Blok → Katman → AltKatman → Adım sırasını korur.`;
}

function rehberGezinme(): string {
  return `<!-- SARMAL:GOREV:TAM -->
## Görev: bir kimliğin tanımına ve etkisine gitmek

1. Aranan kanonik KOD'u seçin.
2. \`sarmal gezin KOD .\` ile tanımı ve başvuruları bulun.
3. \`sarmal etki KOD .\` ile aşağı akış etkisini okuyun.
4. Değişiklikten sonra \`sarmal denetle .\` çalıştırıp kırık başvuru kalmadığını doğrulayın.

Gezinme dosya adına değil çözülen KOD grafına dayanır. Plan omurgası Faz → Blok → Katman → AltKatman → Adım; teslim bağı ise Adım → üretir → Meyve → dosya yönündedir.`;
}

function dosyalariBul(kok: string, goreli = ""): string[] {
  const dizin = join(kok, goreli);
  const sonuc: string[] = [];
  for (const girdi of readdirSync(dizin, { withFileTypes: true })) {
    const yol = goreli ? `${goreli}/${girdi.name}` : girdi.name;
    if (girdi.isDirectory()) sonuc.push(...dosyalariBul(kok, yol));
    else sonuc.push(yol);
  }
  return sonuc.sort((a, b) => a.localeCompare(b, "tr"));
}

function ornekOku(kok: string): string {
  const dosyalar = dosyalariBul(join(kok, "ogreti", "ornek")).filter((ad) => ad !== "OKU.md");
  return `## Örnek dizini

Bu raf, doğru ve bilerek hatalı örnekleri birlikte taşır. Bilerek hatalı sekiz dosya öğretim fikstürüdür; üretici onları onarmaz. Her örneğin beklenen sonucu dosyanın kendi açıklamasından ve denetim süitinden okunur.

${dosyalar.map((ad) => `- [\`${ad}\`](${ad})`).join("\n")}

Bir örneği sınamak için kökten \`sarmal ogreti/ornek/dosya.sar\` kullanın; bütün çalışma alanı kapısı için \`sarmal denetle .\` çalıştırın.`;
}

function sablonOku(kok: string): string {
  const dosyalar = readdirSync(join(kok, "ogreti", "sablon"))
    .filter((ad) => ad.endsWith(".sar"))
    .sort((a, b) => a.localeCompare(b, "tr"));
  return `<!-- SARMAL:GOREV:TAM -->
## Görev: kanonik bir şablonla başlamak

1. \`sarmal başla\` komutuyla kullanılabilir türleri görün.
2. \`sarmal başla proje\` gibi bir çağrıyla seçilen şablonu alın.
3. Yer tutucuları gerçek niyet, kimlik ve sınırlarla doldurun.
4. Kaynağı uygun rafa kaydedip \`sarmal denetle .\` çalıştırın.

Şablon kaynakları (${dosyalar.length}):

${dosyalar.map((ad) => `- [\`${ad}\`](${ad})`).join("\n")}

Katı proje planı Faz → Blok → Katman → AltKatman → Adım zincirini izler. Kendi etmenini yazma yeteneği açıktır; \`etmen.sar\` Etmen · Beceri · Tetikleyici bağlamına, \`sef\` ise Adım konisine bağlanır.`;
}

function yuzIcerigi(hedef: BelgeYuzuHedefi, o: BelgeOlgulari): { baslik: string; giris: string; govde: string } {
  switch (hedef.kimlik) {
    case "KOK-README-TR": return { baslik: "Sarmal", giris: "Bu kısa giriş elle korunur; aşağıdaki ürün özeti kanonik kaynaklardan üretilir.", govde: kokReadme(o) };
    case "KOK-README-EN": return { baslik: "Sarmal", giris: "This short introduction is manually preserved; the product summary below is generated from canonical sources.", govde: kokReadmeEn(o) };
    case "KOK-NEDIR": return { baslik: "Sarmal nedir?", giris: "Bu giriş elle korunur; kavramsal açıklama kanonik omurgadan üretilir.", govde: nedir(o) };
    case "KOK-KAVRAMLAR": return { baslik: "Kavramlar", giris: "Bu giriş elle korunur; aşağıdaki gezinme indeksi canlı kaynaklardan üretilir.", govde: kavramlar(o) };
    case "KOK-ROLLER": return { baslik: "Rol haritası", giris: "Bu giriş elle korunur; rol ve ürün sınırı bağlayıcı karardan üretilir.", govde: roller() };
    case "CEKIRDEK-README": return { baslik: "Sarmal çekirdeği", giris: "Bu geliştirme girişi elle korunur; komut ve kaynak özeti canlı koddan üretilir.", govde: cekirdekReadme(o) };
    case "EKLENTI-README": return { baslik: "Sarmal eklentisi", giris: "Bu kullanım girişi elle korunur; görev adımları manifest ve canlı sicilden üretilir.", govde: eklentiReadme(o) };
    case "REHBER-DIL": return { baslik: "Dil — ilk çalışan zincir", giris: "Bu rehber girişi elle korunur; adım zinciri karşılama kartına bağlanır.", govde: rehberDil() };
    case "REHBER-DENETIM": return { baslik: "Canlı denetim", giris: "Bu rehber girişi elle korunur; görev canlı tanı ve yönlendirme ölçümünden üretilir.", govde: rehberDenetim(o) };
    case "REHBER-OKUMA": return { baslik: "Okuma yüzü", giris: "Bu rehber girişi elle korunur; görev belge üreticisinin sözleşmesinden üretilir.", govde: rehberOkuma() };
    case "REHBER-OGRENIM": return { baslik: "Öğrenim", giris: "Bu rehber girişi elle korunur; çalışan zincir karşılama kartına bağlanır.", govde: rehberOgrenim() };
    case "REHBER-BICIM": return { baslik: "Biçimlendirici", giris: "Bu rehber girişi elle korunur; görev canlı biçim çekirdeğine bağlanır.", govde: rehberBicim() };
    case "REHBER-GEZINME": return { baslik: "Gezinme ve etki", giris: "Bu rehber girişi elle korunur; görev canlı kimlik grafına bağlanır.", govde: rehberGezinme() };
    case "ORNEK-OKU": return { baslik: "Örnekler", giris: "Bu giriş elle korunur; dosya indeksi çalışma ağacından üretilir.", govde: ornekOku(o.kok) };
    case "SABLON-OKU": return { baslik: "Şablonlar", giris: "Bu giriş elle korunur; tür indeksi şablon kaynaklarından üretilir.", govde: sablonOku(o.kok) };
    default: throw new Error(`Belge yüzü için üretici yok: ${hedef.kimlik}`);
  }
}

function siniflamaYuzuUygula(mevcut: string | undefined, snf: Siniflama): string {
  const blok = taksonomiMd(snf);
  if (mevcut?.includes(ELLE_BAS) && mevcut.includes(ELLE_SON)) return taksonomiBlokUygula(mevcut, blok);
  return [
    ELLE_BAS,
    "# Sınıflama — tip ve alan Reference yüzü",
    "",
    "Bu giriş elle korunur. Makine envanteri yalnız `oz/siniflama/kayit.json` kaynağından üretilir.",
    ELLE_SON,
    "",
    blok,
    "",
  ].join("\n");
}

export function belgeYuzleriniUret(kokYolu: string): BelgeYuzuSonucu {
  const kok = resolve(kokYolu);
  const o = olgulariOlc(kok);
  const degisen: string[] = [];
  const degismeyen: string[] = [];
  for (const hedef of BELGE_YUZU_HEDEFLERI) {
    const tamYol = join(kok, hedef.yol);
    const mevcut = existsSync(tamYol) ? readFileSync(tamYol, "utf8") : undefined;
    const yeni = hedef.kimlik === "SNF-REFERENCE"
      ? siniflamaYuzuUygula(mevcut, o.snf)
      : (() => {
          const icerik = yuzIcerigi(hedef, o);
          return belgeBolgesiUygula(mevcut, hedef, icerik.baslik, icerik.giris, icerik.govde);
        })();
    const liste = yeni === mevcut ? degismeyen : degisen;
    liste.push(hedef.yol);
    if (yeni !== mevcut) {
      mkdirSync(dirname(tamYol), { recursive: true });
      writeFileSync(tamYol, yeni, "utf8");
    }
  }
  return { degisen, degismeyen, kanonMaddesi: o.kanon.madde, aracSayisi: o.arac };
}

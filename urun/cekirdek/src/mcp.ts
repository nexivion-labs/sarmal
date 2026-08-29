// ═══════════════════════════════════════════════════════════════════════════
// mcp.ts — Sarmal MCP sunucusu (ajanın Sarmal-gözü · RAY-3a)
//
//   ELLE stdio JSON-RPC 2.0 — SIFIR bağımlılık (STR-3.1). MCP protokolü basit:
//   stdin'den newline-delimited JSON istekleri gelir, stdout'a JSON cevaplar
//   gider. SDK yok — Sarmal drift'ten korur, kendisi bağımlılık-drift'ine
//   düşmez; kendi MCP'mizi elle örmek = kara-kutu değil, tam anladığımız dogfood.
//
//   Araçlar (dikey dilim — motor İŞLEVİ hazır, MCP yalnız sarar; ORK-6.3):
//     basla     { tur? }         → DOĞUŞ REHBERİ (OGR-2): omurga sırası + koni-dolu şablon (dosya YAZMAZ).
//                                   NOT: araç adı + property ASCII olmalı (API kuralı: ^[a-zA-Z0-9_.-]$).
//     denetle   { kaynak | yol } → Türkçe, konumlu drift tanıları (SNF-0 şema+sarma).
//     kurallar  { kategori? }    → dil kuralları külliyatı (yasa/genel_kurallar, .sar kaynağıyla).
//     siniflama { tip? }         → SNF-0 kanonu: aileler·tipler·kenarlar·şema (tip verilirse detay).
//   BKM-MCP-A01 ekleri (6 araç · Founder "hepsini yap" 2026-07-12):
//     denetle-proje { dizin }    → CLI TAM-denetimi alt-süreç köprüsüyle (çıktı birebir · tek-kaynak).
//     etki    { kod, dizin }     → etkiCoz ileri kapanışı: doğrudan+geçişli bekleyenler.
//     bul     { metin, dizin }   → düğüm KOD/ad/niyetinde metin arama (⌘T'nin ajan hâli).
//     bicimle { kaynak }         → BÇ-standart biçim (çekirdek bicimle.ts · dosya YAZMAZ).
//     prizma  { kaynak, yuz }    → json/yaml/xml/md yüzleri (CLI ile aynı çekirdek · YUZ-1.2).
//     durum-guncelle { dizin, kod, durum } → İLK YAZAN ARAÇ (dar sınır: yalnız Adım.durum,
//                                   yalnız geçerli enum, satirdaDegerDegistir + kilit + guard).
//
//   KRİTİK: stdout YALNIZ JSON-RPC taşır. Kayıt/uyarı için stderr kullan
//   (console.log stdout'u kirletir → protokol bozulur).
//
//   Kullanım:  node src/mcp.ts   (stdio; bir MCP istemcisi sarar)
// ═══════════════════════════════════════════════════════════════════════════

import { createInterface } from "node:readline";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { belirtecle, SozDizimHatasi } from "./belirtec.ts";
import { ayristir } from "./ayristirici.ts";
import { dogrula } from "./dogrulayici.ts";
import { dogusEksikTanilari, anadizinBul, adAlaniKapisi } from "./denetci.ts";  // doğuş-rehberi turu: MIM-3'ün tek-dosya yüzü
import { siniflamaYukle, siniflamaOrtuMerge, siniflamaOrtuYukle, type Siniflama } from "./siniflama.ts";
import { ogretKarti } from "./ogret.ts";   // davranış-katmanı turu: öğretim kapısı — CLI ile aynı kaynak (YUZ-1.2)
import { programHaritasi, baglamMontajla, promptUret, tokenSay, kavramVerisiYukle } from "./sef.ts";
import { karneRaporu } from "./karne.ts";   // EMJ-A05: karne raporu yüzü
import { cevir, etkinCiktiDili } from "./cevir.ts";
import { MCP_ARAC_ADI, mcpAracSemalari } from "./mcp-metinleri.ts";
import { agacYüz } from "./agac.ts";   // ağaç-yüzü turu: MCP yüzü aynı ağaç üreticisini çağırır (YUZ-1.1)
import { dagKur } from "./dag.ts";
import { grafYuz } from "./graf.ts";  // VIT-GRAF-A02: MCP yüzü aynı kanonik serileştiriciyi çağırır (YUZ-1.2)
import { sablonMetni, sablonTurleri, mimariDiyalog } from "./sablon.ts";  // şablon kütüphanesi tek kaynak (YUZ-1.2)
import { iskeletPlani, iskeletYaz } from "./iskeletci.ts";  // GBR-A04/#7: iskelet aracı CLI --iskelet ile TEK çekirdek (YUZ-1.2)
import { dizindenIndeks, gezinRaporu, dosyaOkuGuvenli } from "./kimlik.ts"; // EKL-F11-A05: gezin aracı = eklentinin F12/⇧F12'siyle aynı çekirdek (YUZ-1.2)
import { etkiMetni } from "./etki.ts";        // BKM-MCP-A01: etki aracı = CLI etki yüzüyle aynı çekirdek (YUZ-1.2)
import { bicimle } from "./bicimle.ts";       // BKM-MCP-A01: biçim motoru çekirdekte — eklenti de buradan içe alır
import { yansıt, type Yüz } from "./prizma.ts";
import { belgeMd } from "./belgele.ts";       // prizma md yüzü (Prizma: tek kaynak → dört yüz)
import { adimDurumYaz } from "./koniYaz.ts";  // durum-guncelle: TEK yazım mekanizması (SENK-A05 kilit + guard)
import { adimEtiketiBul } from "./dongu.ts";  // Adım → dosya etiketi (YUZ-1.2: çözüm tek yerde)
import { dogusYaz, dogusRaporu, dogusTuruCoz, dogusSorusu } from "./dogus.ts";  // dogus: doğuş paketi yazıcısı (DPK-A02 · GOC-A10 tür sorusu)
import { sozDizimTanisi, taniDilineCevir } from "./tani-metinleri.ts";
import type { Dugum } from "./sozdizim.ts";
import type { Tani } from "./tani.ts";

// ── sabitler ─────────────────────────────────────────────────────────────────
const SUNUCU = { name: "sarmal", version: "0.14.0" };  // 0.14.0: GOC-A10 dogus aracı tür sorusu (tur · proje alanları, tur yoksa yazmadan sorar). 0.13.0: MIM-1.2 nazik rejim (tarih güçlü tavsiye — doğuş rehberi ④ + ogret kartı; sahte-faz kalktı). 0.12.0: zaman-ekseni turu zaman bağı öğretimi (mevsim:/planlanmamış: — ogret kartı + doğuş rehberi ④ tam-zincir düzeltmesi: bayat 'rütbe-atlama serbest' kalktı). 0.11.0: davranış-katmanı turu ogret beceri-dağıtımı + 17 araca NE ZAMAN cümlesi (18 araç). 0.10.0: EMJ-A05 karne aracı (17 araç) — onaylı ⭐ skalası + kadro dökümü. 0.9.0: KVR-A09 kavram (16). 0.8.0: DPK-A02 dogus (15). 0.7.0: GBR-A04/#7 iskelet (14). 0.6.0: BKM-MCP-A01 (6)
const PROTOKOL = "2024-11-05"; // istemci başka sürüm isterse onunkini yansıtırız
const SNF_YOL = fileURLToPath(new URL("../../../oz/siniflama/kayit.json", import.meta.url));
const YASA_KOK = fileURLToPath(new URL("../../../yasa/kanon/", import.meta.url));

// SNF-0 kaydı bir kez yüklenir (siniflamaYukle saf: JSON.parse, stdout'a yazmaz).
// KANON-CACHE BEYANI (A11/E2): taban kanon SÜREÇ-BAŞI yüklenir ve süreç ömrünce
// tazedir varsayılır — kanon değişimi MCP yeniden başlatma ister (bilinçli:
// kanon nadiren değişir; gezin'in dosya-indeksi ise her çağrıda taze taranır,
// çünkü .sar dosyaları SÜREKLİ değişir — iki karar farklı değişim-hızına göre).
// ÇalışmaAlanı ÖRTÜSÜ ise çağrı-anında çözülür (aşağıda etkinSnf — bayat örtü yok).
const snf = siniflamaYukle(SNF_YOL);
// siniflama aracının detay görünümü ham kayıttan okur (Sema tipinin dışındaki
// alanlar — enum/opsiyonel/kural/tür — da ajana aynen gitsin).
const snfHam = JSON.parse(readFileSync(SNF_YOL, "utf8"));

// Kanon bölümleri → dosya: raf DİNAMİK okunur (elle liste = drift fabrikası —
// yeni bölüm dosyası eklenince MCP kendiliğinden görür; kategori = dosya kökü).
// Eski genel_kurallar rafı 2026-07-31 tarihinde arşive indi; kaynak artık kanon.
const KURAL_DOSYALARI: Record<string, string> = {};
for (const dosya of readdirSync(YASA_KOK)) {
  if (dosya.endsWith(".sar") || dosya.endsWith(".md")) {
    KURAL_DOSYALARI[dosya.replace(/\.(sar|md)$/, "")] = dosya;
  }
}

// tools/list okuma yüzü tek katalogdan ve tek dil kapısından kurulur.
// Şema tipleri/enumlar/required alanları kanonik kaynaklarından aynı biçimde akar.
const MCP_DILI = etkinCiktiDili();
const MCP_ARAC_SEMALARI = mcpAracSemalari(MCP_DILI, {
  kuralBolumleri: Object.keys(KURAL_DOSYALARI),
  sablonTurleri: sablonTurleri(),
  adimDurumlari: snf.semalar?.["Adım"]?.enum?.durum ?? [],
});
// ── JSON-RPC tipleri (yalın) ────────────────────────────────────────────────
interface Istek {
  jsonrpc?: string;
  id?: number | string | null;
  method?: string;
  params?: any;
}
type Cevap = { jsonrpc: "2.0"; id: number | string | null } & (
  | { result: any }
  | { error: { code: number; message: string } }
);

// ── araç: denetle ───────────────────────────────────────────────────────────
interface DenetimSonucu {
  tanilar: Tani[];
  ozet: { hata: number; uyari: number };
}

export function denetleAraci(kaynak: string, etkinSnf: Siniflama = snf, dogusBaglami: "var" | "yok" = "var"): DenetimSonucu {
  let tanilar: Tani[];
  try {
    const program = ayristir(belirtecle(kaynak));
    // Ham kaynak DA geçilir: şekil nöbetleri (belge bloğu · çok satırlı değer)
    // kaynak ile türetilen yüzü karşılaştırır, ayrıştırılmış ağaçtan ölçülemez.
    // Geçilmezse bu iki hüküm YALNIZ bu yüzeyde susar ve yüzler arasında tanı
    // farkı doğar — bu hâl `tanı-yüzü-uyumsuz` hükmünün yasakladığı durumdur.
    tanilar = dogrula(program, etkinSnf, undefined, kaynak);
    // doğuş-rehberi turu: proje bağlamı YOKSA (anadizinsiz kaynak/dizin) doğuş-eksik
    // bekçisi de koşar — plan boş tarlaya yazılıyorsa tek-dosya yüzü artık susmaz.
    if (dogusBaglami === "yok") tanilar.push(...dogusEksikTanilari(program));
  } catch (e) {
    if (e instanceof SozDizimHatasi) {
      // Söz dizim hatası da bir tanıdır — ajan aynı kanaldan görsün.
      tanilar = [taniDilineCevir(sozDizimTanisi(e), MCP_DILI)];
    } else throw e;
  }
  const hata = tanilar.filter((t) => t.duzey === "hata").length;
  const uyari = tanilar.filter((t) => t.duzey === "uyarı").length;
  return { tanilar, ozet: { hata, uyari } };
}

/** Doğuş bağlamı var mı? — verilen kökten YUKARI yürüyerek anadizin arar
 *  (siniflamaOrtuYukle find-up deseninin ikizi; kök verilmemişse bağlam yok). */
function anadizinVarMi(kok?: string): boolean {
  if (!kok) return false;
  let d = resolve(kok);
  for (let seviye = 0; seviye < 12; seviye++) {
    if (anadizinBul(d)) return true;
    const ust = dirname(d);
    if (ust === d) break;
    d = ust;
  }
  return false;
}

/** TEK-DOSYA sonucunun YANLIŞ-YEŞİL olmasını engelleyen zorlayıcı kayıt (IDA dersi
 *  2026-07-14: ajan tek-dosya `denetle` "temiz"ini PROJE-yeşili sandı → ana-yok +
 *  17 kayıp-yapı kaçtı, "bitti" dedi). Kaynak bir projenin parçasıysa (anadizin
 *  up-tree bulundu) sonuç MUTLAKA proje denetimine yükseltmeyi dayatır. */
const PROJE_UYARISI =
  "⚠️ TEK-DOSYA sınırı (A7): bu sonuç PROJE-yeşili DEĞİL — ana-yok · kayıp-yapı · " +
  "kırık-referans · DAG/döngü · disk-mutabakat BURADA KOŞMAZ. 'Bitti/temiz' demeden " +
  "ÖNCE MUTLAKA `denetle-proje { dizin }` koş; TAM hüküm yalnız oradan alınır.";

/** Tanıları ajanın okuyabileceği Türkçe metne çevirir (CLI raporla ile aynı ruh).
 *  projedeMi: kaynak bir PROJE'nin parçası mı (anadizin up-tree var mı) — öyleyse
 *  temiz sonuç bile proje-denetimine yükseltme uyarısı taşır (yanlış-yeşil ölür). */
export function taniMetni(s: DenetimSonucu, projedeMi = false): string {
  if (s.tanilar.length === 0) {
    return projedeMi
      ? `✅ Tek-dosya temiz — .sar Sınıflama'ya (SNF-0) uygun.\n${PROJE_UYARISI}`
      : "✅ Drift yok — .sar Sınıflama'ya (SNF-0) uygun.";
  }
  const im = (d: string): string => (d === "hata" ? "✖" : d === "uyarı" ? "⚠" : "ℹ");
  const satirlar = s.tanilar.map((t) => {
    const konum = t.satir > 0 ? ` ${t.satir}:${t.sutun}` : "";
    const oneri = t.oneri ? `\n   ↳ ${t.oneri}` : "";
    return `${im(t.duzey)}${konum} [${t.kod}] ${t.mesaj}${oneri}`;
  });
  // YUZ-3.2 çapraz-yönlendirme: ajanın ⌘+tık'ı, az önce okuduğu çıktının içindeki
  // davettir — tanıda geçen bir KOD'a bakmanın kısa yolu burada söylenir.
  const govde = `── DENETİM (${s.ozet.hata} hata · ${s.ozet.uyari} uyarı) ──\n${satirlar.join("\n")}` +
    `\n🧭 Tanıda geçen bir KOD'un tanımına/atıflarına gitmek için: gezin { kod, dizin } (F12'nin ajan hâli).`;
  // Projede kısmi (tek-dosya) tanı listesi de tam-hüküm SANILMASIN.
  return projedeMi ? `${govde}\n${PROJE_UYARISI}` : govde;
}

// ── araç: kurallar (yasa/kanon külliyatı) ───────────────────────────────────
function kurallarAraci(kategori?: string): { metin: string; isError: boolean } {
  // Kategorisiz çağrı: bölüm listesi + kural↔kapı haritası (eski dizin.md
  // gövdesi arşive indi; kanonda bölümler kategoridir, özet sentezlenir).
  const anahtar = kategori ?? "";
  const dosya = anahtar ? KURAL_DOSYALARI[anahtar] : undefined;
  if (anahtar && !dosya) {
    // SNV3 bulgusu (DIL-1.2): ajan tire-ayraçlı varyant denedi (dogus-omurgasi) —
    // ayraç/harf farkını normalize edip yakın adayı ÖNER (siniflama deseni).
    const norm = (s: string): string => s.toLocaleLowerCase("tr").replace(/[-_]/g, "");
    const yakin = Object.keys(KURAL_DOSYALARI).filter((k) => norm(k) === norm(anahtar) || norm(k).includes(norm(anahtar)));
    return {
      metin: `✖ Bilinmeyen kategori: "${anahtar}".${yakin.length ? ` Şunu mu demek istedin: ${yakin.join(" · ")}?` : ""} Geçerli: ${Object.keys(KURAL_DOSYALARI).join(" · ")}`,
      isError: true,
    };
  }
  try {
    const govde = dosya ? readFileSync(YASA_KOK + dosya, "utf8") : "";
    const baslik = dosya
      ? `── 📜 yasa/kanon/${dosya} ──\n\n`
      : `── 📜 yasa/kanon — kanon bölümleri (bölüm adına "kategori" ver) ──\n`;
    let ek = !dosya
      ? `\n── Bölümler (kurallar aracına "kategori" ver) ──\n${Object.keys(KURAL_DOSYALARI).join(" · ")}`
      : "";
    // ── RF-T6-A03: kural↔kapı haritası MOTORDAN türetilir (elle enforcement
    //    raporu emekli): her Kural'ın tanı: beyanı taranır; bağlı/bağsız sayımı
    //    dürüst karnedir — bağsız kural "kâğıtta" demektir (YAS-2.3 katman beyanıyla).
    if (!dosya) {
      const baglar: string[] = [];
      let toplam = 0;
      for (const [, d] of Object.entries(KURAL_DOSYALARI)) {
        try {
          const p = ayristir(belirtecle(readFileSync(YASA_KOK + d, "utf8")));
          const gez = (n: import("./sozdizim.ts").Dugum): void => {
            if (n.tur === "kuralTanım") {
              toplam++;
              const alan = (ad: string) => [...n.parametreler, ...n.ozellikler].find((x) => x.ad === ad)?.deger;
              const kod = alan("kod")?.metin ?? n.ad;
              const tani = alan("tanı");
              if (tani) {
                const kodlar = (tani.tur === "liste" ? (tani.ogeler ?? []) : [tani])
                  .map((x) => x.metin).filter(Boolean);
                if (kodlar.length) baglar.push(`  ${kod} → ${kodlar.join(" · ")}`);
              }
            }
            for (const c of n.cocuklar) gez(c);
          };
          for (const b of p.bildirimler) gez(b);
        } catch { /* kırık yasa dosyası haritayı düşürmez — kendi denetiminde yakalanır */ }
      }
      ek += `\n\n── 🔗 KURAL↔KAPI HARİTASI (motordan türetildi) ──\n` +
        `Bağlı: ${baglar.length}/${toplam} kural (tanı: kenarı — iddialar sicilde doğrulanır; bağsız kural kâğıtta kalmış niyettir)\n` +
        baglar.join("\n");
    }
    return { metin: baslik + govde + ek, isError: false };
  } catch (e) {
    return { metin: `✖ Kural dosyası okunamadı: ${(e as Error).message}`, isError: true };
  }
}

// ── araç: siniflama (SNF-0 kanonu) ──────────────────────────────────────────
function siniflamaAraci(tip?: string): { metin: string; yapisal: any; isError: boolean } {
  const tipler: Array<{ ad: string; aile: string; ne: string; caprazRoller?: string[] }> = snfHam.widgetTipleri ?? [];
  if (tip) {
    const t = tipler.find((x) => x.ad === tip);
    if (!t) {
      // en yakın adı öner (basit içerme — ajan yazım hatasını hızlı düzeltsin)
      const yakin = tipler.filter((x) => x.ad.toLocaleLowerCase("tr").includes(tip.toLocaleLowerCase("tr"))).map((x) => x.ad);
      return {
        metin: `✖ Bilinmeyen tip: "${tip}".${yakin.length ? ` Şunu mu demek istedin: ${yakin.join(" · ")}?` : ""}`,
        yapisal: null,
        isError: true,
      };
    }
    // doğuş-rehberi turu: şema NORMALİZE kanondan gider — enum'da `*` görünmez (ajan `durum: *beklemede`
    // kopyalamasın), varsayılan ayrı `varsayilan` alanı olarak zaten şemada görünür.
    const sema = snf.semalar?.[t.ad] ?? snfHam.semalar?.[t.ad] ?? null;
    const icerebilir = snfHam.izinliSarma?.[t.ad] ?? null;
    const konabilir = Object.entries(snfHam.izinliSarma ?? {})
      .filter(([, cocuklar]) => (cocuklar as string[]).includes(t.ad))
      .map(([e]) => e);
    const yuzey = (snfHam.yuzeyKurali?.duzen ?? []).includes(t.ad)
      ? "düzen (yüzey ağacında çocuk sarar)"
      : (snfHam.yuzeyKurali?.yaprak ?? []).includes(t.ad)
        ? "yaprak (çocuk sarmaz)"
        : null;
    // TIP-1.16 çapraz rol indeksi: tip ana ailesini korur, çapraz rol sorgusunda da
    // bulunur (örn. Sözleşme → yuzey+arkayuz). Kaynak: kayit.json widgetTipleri[].caprazRoller.
    const detay = { tip: t.ad, aile: t.aile, caprazRoller: t.caprazRoller ?? null, ne: t.ne, sema, icerebilir, konabilir, yuzeyKurali: yuzey, ortakEnum: snfHam.ortakEnum ?? null };
    const satirlar = [
      `── 🗂️ ${t.ad} (aile: ${t.aile}) ──`,
      `ne: ${t.ne}`,
      t.caprazRoller?.length ? `çapraz roller (TIP-1.16): ${t.caprazRoller.join(" · ")} — tip ana ailesinde kalır, bu rol sorgularında da bulunur` : "",
      sema ? `şema: ${JSON.stringify(sema, null, 2)}` : "şema: (yok — serbest alanlar)",
      icerebilir ? `içerebilir: ${(icerebilir as string[]).join(" · ")}` : "içerebilir: (izinliSarma'da konteyner değil)",
      // hatırlatıcı-rayı turu (DOC-3): konabilir boşken aile-farkında dürüst mesaj — 'hiçbir yere
      // konamaz' yanılgısını bitir. oz-ailesi (DurumKaydı/Hatırlatıcı) DOSYA-KÖKÜ serbest
      // yerleşir (üst-seviye widget); temel-aile (Proje/Uygulama/ÇalışmaAlanı) proje köküdür.
      konabilir.length ? `şuraya konabilir: ${konabilir.join(" · ")}`
        : t.aile === "oz" ? "şuraya konabilir: 🗂️ dosya kökünde SERBEST yerleşir (oz ailesi üst-seviye widget — DurumKaydı/Hatırlatıcı gibi; ebeveyn gerekmez)"
        : t.aile === "temel" ? "şuraya konabilir: 🌱 proje/dosya KÖKÜ (kendisi kök widget — Proje/Uygulama/ÇalışmaAlanı)"
        : "şuraya konabilir: (izinliSarma değeri değil — üst-seviye/yüzey kuralına bakın)",
      yuzey ? `yüzey kuralı: ${yuzey}` : "",
    ].filter(Boolean);
    return { metin: satirlar.join("\n"), yapisal: detay, isError: false };
  }
  // genel bakış
  const aileGrup: Record<string, string[]> = {};
  for (const t of tipler) (aileGrup[t.aile] ??= []).push(t.ad);
  const kenarlar = (snfHam.kenarTipleri ?? []).map((e: any) => `${e.ad}: ${e.ne ?? ""}`);
  const satirlar = [
    `── 🗂️ SNF-0 kanonu — ${tipler.length} tip · ${(snfHam.kenarTipleri ?? []).length} kenar ──`,
    "",
    "AİLELER VE TİPLER:",
    ...Object.entries(aileGrup).map(([a, ts]) => `  ${a}: ${ts.join(" · ")}`),
    "",
    "KENARLAR (tipli ilişkiler):",
    ...kenarlar.map((k: string) => `  • ${k}`),
    "",
    `YÜZEY KURALI: düzen=${(snfHam.yuzeyKurali?.duzen ?? []).join(",")} · yaprak=${(snfHam.yuzeyKurali?.yaprak ?? []).join(",")}`,
    "",
    `Detay için: siniflama { tip: "Adım" } — şema/sarma ilişkileri döner.`,
  ];
  const yapisal = { aileler: aileGrup, kenarTipleri: snfHam.kenarTipleri, yuzeyKurali: snfHam.yuzeyKurali, izinliSarma: snfHam.izinliSarma };
  return { metin: satirlar.join("\n"), yapisal, isError: false };
}

// ── araç: başla (DOĞUŞ REHBERİ — OGR-2/doğuş-rehberi turu) ───────────────────────────
// Motor DENETLER ama YÖNLENDİRMEZDİ (kör drift): ajan boş tarlaya düşüp ana.sar/
// teknoloji/plan-ekseni/koni atlıyordu. başla, MIM-4 doğuş omurgasını + koni-dolu şablonu ELE
// verir — Flutter'ın scaffold'u gibi doğuş sırasını öğretir. Dosya YAZMAZ.
const DOGUS_OMURGASI = [
  "🌱 ① <varlık>_anadizin.sar (KÖK; eski adı ana.sar) — Proje ya da ÇalışmaAlanı, kullanılan Teknoloji ve Takım ORADA ilan edilir; teknolojisi ilan edilmemiş yüzey DOĞMAZ",
  "⚖️ ② Yasa/Anayasa — planı sınırlayan üst hüküm katmanıdır; plan onun altında yazılır",
  "🔩 ③ Mekanizma — kesişen altyapı (yönetişim · RBAC · telemetri · denetim izi) BİR KEZ ilan edilir; plan Adımları ona REFERANS verir, içine kopyalamaz. Yasa'nın küçük kardeşi, Plan'ın abisidir — DAĞITMAK YASAKTIR. Modüller arası sıra bağımlı-DAG, aktivasyon faz etiketiyle",
  "📋 ④ Plan — Faz(ZAMAN 🌀) → Blok(İŞ 🪵) → Katman(TEKNOLOJİ 🌿, Takım bağlı) → Adım(AKIŞ 🍃) (dört eksen · TAM-ZİNCİR zorunlu: her Blok bir zaman halkasına, her Adım bir Katman'a bağlanır; ters sarma yasaktır). Zaman bağı nazik rejimdedir: tarih GÜÇLÜ TAVSİYEDİR — hedefTarih verirsen (\"YYYY-AA-GG\" ya da ay hassasiyetiyle \"YYYY-AA\") vade nöbeti rötarı takip eder; vermezsen Faz yine açılır, motor yalnız hatırlatır (iş akışı kesilmez; erteleme meşru). Blok zamana üç yolla bağlanır (bir bağ tek yerde yazılır): Faz gövdesine iç içe yazım · Faz'ın `çağır BLK-X` listesi · Blok'un `mevsim: FAZ-X` alanı; önceliklendirme bekleyen iş dürüst beyanla durur: `planlanmamış: \"neden\"`. Blok kimliği TEKİL — sonraki fazlarda aynı gövde sürer (Provider deseni); Adım mekanizmalara `bağımlı:` verir. İhtiyaçları Gereksinim olarak İLAN et ve Adımlar ona bağlansın; böylece hangi Adımın hangi ihtiyacı karşıladığı İZLENEBİLİR kalır",
  "🎯 ⑤ Her Adım KONİ taşır — görev·kabul·üretir·bağımlı·referans·sınır (bekçi: konisiz-adım)",
  "🌉 ⑥ KAVUŞUM · SÖZLEŞME ÖNCE (contract-first) — farklı Takım'a bağlı Adımlar ORTAK Sözleşme köprüsüyle kavuşur, köprüsüz paralel koşulamaz (bekçi: kavuşumsuz-paralellik — F2); Adım üretir Ekran · Ekran çağırır Uç · Uç bağlanır Sözleşme (bekçi: öksüz-düğme·kavuşumsuz-ekran)",
  "🍎 ⑦ ÜRETİM-YERİ — üretilebilir artefakt (Ekran·Uç·Tablo·Servis·Kimlik) `dosya:` ile KODUNUN düşeceği yeri beyan eder; yoksa ağaçtan türetilir — üreten taraf klasör uydurmaz",
];

// Şablonlar artık sablon/*.sar dosyalarında yaşar (tek kaynak) → sablon.ts okur.
// başla üreteci hem bu MCP aracından hem CLI'dan aynı kütüphaneyi çağırır (YUZ-1.2).

/** sef aracı: bir Adım'ın koni+beceri-dolu ŞEF prompt'unu üretir (dizin = .sar ağacı kökü). */
function sefAraci(dizin: string, adimKod: string): { metin: string; isError: boolean } {
  // ADM-STD-MCP-DIKSIYON (OGR-2.1 · YAS-3.4 ③): boş argüman ham hataya düşmesin —
  // aracın doğru kullanımı hata iletisinin kendisinden öğrenilir.
  if (!adimKod.trim()) {
    return { metin: "✖ sef bir Adım kodu ister — kullanım: sef(dizin: \"<kök>\", adim: \"ADM-X\"). Açık Adımları görmek için denetle-proje (motor-susmaz listesi) ya da gezin(<ADIM-KOD>) kullan.", isError: true };
  }
  const programlar = programHaritasi(dizin);
  const paket = baglamMontajla(programlar, adimKod, undefined, undefined, kavramVerisiYukle());
  if (!paket) {
    return { metin: `✖ '${adimKod}' kodlu Adım bulunamadı (${programlar.size} .sar tarandı — dizin: ${dizin}). Kodu doğrula: gezin(${adimKod}) düğümü iki yönde gösterir; yanlış dizin verdiysen kökü düzelt.`, isError: true };
  }
  const prompt = promptUret(paket);
  return { metin: `${prompt}\n\n📊 ~${tokenSay(prompt)} token (yaklaşık)`, isError: false };
}

/** kavram aracı (KVR-A09): kelime → çeviri katmanının birleşik sonucu; bağlam → harita aileleri.
 *  YUZ-1.2 ②: veri her çağrıda DİSKTEN okunur, yanıtta gömülü kopya yoktur.
 *  STR-3: sorgu kapısıdır — öneri sunar, seçim yapmaz; bulunamama hata değil bulgudur. */
function kavramAraci(kelime?: string, baglam?: string): { metin: string; isError: boolean } {
  if (!kelime && !baglam) {
    return { metin: "✖ kavram için `kelime` ya da `baglam` gerekli — kelime: serbest terim (ör. 'kapsayıcı', 'hover'); baglam: harita anahtarı (ör. 'Ekran', 'Adım.görev').", isError: true };
  }
  const s: string[] = [];
  if (kelime) {
    const c = cevir(kelime);
    if (!c.bulundu) {
      s.push(`'${kelime}' dört sözlükte de bulunamadı — kanonda böyle bir kavram yaşamıyor.`);
      s.push("↳ Kullanıcının tarifini kaydet ve kavramı BOŞLUK ADAYI olarak raporla; sözlüğe sessizce eklemek yasaktır. Aday aileleri görmek için `baglam` sorgusu kullanılabilir.");
    } else {
      s.push(`🔍 '${kelime}' sorgusu:`);
      if (c.stack) s.push(`- Kanon kavramı '${c.stack.kavram}' → ${Object.entries(c.stack.hedefler).map(([k, v]) => `${k}: ${v}`).join(" · ")}`);
      if (c.sarmal) {
        s.push(`- 🌀 Sarmal kavramı '${c.sarmal.kavram}'${c.sarmal.en ? ` (${c.sarmal.en})` : ""}${c.sarmal.nerede ? ` — ${c.sarmal.nerede}` : ""}`);
        s.push(`  ${c.sarmal.tanim}`);
        s.push(`  ↳ Kanonik dayanak: ${c.sarmal.dayanak}`);
      }
      if (c.i18n) s.push(`- Sarmal dili (${c.i18n.tur}): ${Object.entries(c.i18n.diller).map(([d, v]) => `${d}=${v}`).join(" · ")}`);
      if (c.terim) s.push(`- Terim: ${c.terim.tr} ↔ ${c.terim.en}`);
    }
  }
  if (baglam) {
    const veri = kavramVerisiYukle();
    if (!veri) return { metin: "✖ kavram verisi yüklenemedi — bilgi/tasarim_sozlugu altındaki harita ya da kanon okunamadı.", isError: true };
    const bağlamKaydı = veri.harita.bağlamlar?.[baglam];
    if (!bağlamKaydı) {
      s.push(`'${baglam}' haritada tanımlı bir bağlam değil. Tanımlı anahtarlar: ${Object.keys(veri.harita.bağlamlar ?? {}).join(" · ")}`);
    } else {
      s.push(`🗺️ '${baglam}' bağlamının aday aileleri (öneri — dayatma değil):`);
      for (const aileAd of bağlamKaydı.öner ?? []) {
        const aile = veri.harita.aileler?.[aileAd];
        if (!aile) continue;
        s.push(`### ${aileAd}${aile.soru ? ` — ${aile.soru}` : ""}`);
        for (const yol of aile.üyeler ?? []) {
          const dugum = yol.split(".").reduce<unknown>(
            (o, p) => (o && typeof o === "object" ? (o as Record<string, unknown>)[p] : undefined), veri.kanon);
          const eş = dugum && typeof dugum === "object"
            ? Object.entries(dugum as Record<string, string>).map(([k, v]) => `${k}: ${v}`).join(" · ")
            : "⚠️ kanonda çözülmedi (nöbet: baglam-haritasi.test)";
          s.push(`- ${yol} → ${eş}`);
        }
      }
    }
  }
  return { metin: s.join("\n"), isError: false };
}

/** gezin aracı: kod → tanım + atıflar (eklenti F12/⇧F12 ile aynı çekirdek — kimlik.ts · YUZ-1.2).
 *  Her çağrıda dizin taze taranır (~200ms/155 dosya) — MCP süreci uzun yaşar,
 *  bayat indeks riskine karşı doğruluk tercih edildi (önbellek gerekirse sonra). */
// EMJ-A05: CLI `sarmal karne` ile BİREBİR aynı çekirdek (karneRaporu) — çift mantık yok (YUZ-1.2).
/** davranış-katmanı turu (OGR-2.2): öğretim kapısı — konusuz: kanondan karşılama kartı (CLI ile
 *  AYNI üretici — YUZ-1.2 çift-kaynak yasak); konulu: ogrenme/ rafındaki eşleşen
 *  Beceri kartının TAM metni (tek kaynak: kartın kendisi — özet türetilmez). */
function ogretAraci(konu?: string): { metin: string; isError: boolean } {
  if (!konu?.trim()) return { metin: ogretKarti(snf), isError: false };
  const kok = join(SNF_YOL, "..", "..", "..");   // oz/siniflama/kayit.json → repo kökü
  const rafi = join(kok, "ogreti", "ogrenme");
  const anahtar = konu.trim().toLocaleLowerCase("tr").replace(/[^a-zçğıöşü0-9]+/g, "_");
  try {
    const adaylar = readdirSync(rafi).filter((a) => a.endsWith(".sar"));
    for (const dosya of adaylar) {
      const icerik = readFileSync(join(rafi, dosya), "utf8");
      const kodM = icerik.match(/Beceri\(\s*kod:\s*([A-ZÇĞİÖŞÜ0-9-]+(?:\.[0-9]+){0,2})/u);
      const kodEs = kodM && kodM[1].toLocaleLowerCase("tr").replace(/[^a-zçğıöşü0-9]+/g, "_") === anahtar;
      if (kodEs || dosya.replace(/\.sar$/, "").includes(anahtar)) {
        return { metin: `📚 ${dosya} (ogrenme/ rafı — kartın tam metni):\n\n${icerik}`, isError: false };
      }
    }
    return { metin: `✖ '${konu}' ile eşleşen beceri kartı bulunamadı. Mevcut kartlar: ${adaylar.join(" · ")}\n\nKarşılama kartı için konusuz çağır.`, isError: true };
  } catch (e) {
    return { metin: `✖ ogrenme rafı okunamadı: ${(e as Error).message}`, isError: true };
  }
}

function karneAraci(dizin: string): { metin: string; isError: boolean } {
  const etkinSnf = siniflamaOrtuMerge(snf, siniflamaOrtuYukle(dizin));
  const rapor = karneRaporu(etkinSnf, programHaritasi(dizin));
  return { metin: rapor, isError: rapor.startsWith("✖") };
}

function gezinAraci(dizin: string, kod: string): { metin: string; isError: boolean } {
  if (!kod) return { metin: "✖ gezin: 'kod' argümanı gerekli (aranacak düğümün kimliği).", isError: true };
  const indeks = dizindenIndeks(dizin);
  if (!indeks.dosyaSayisi()) {
    return { metin: `✖ '${dizin}' altında .sar bulunamadı — dizin bir çalışma-alanı kökü olmalı.`, isError: true };
  }
  const rapor = gezinRaporu(indeks, kod, dosyaOkuGuvenli);   // NTK-A06: bağlam kartı MCP yüzünde de
  return { metin: rapor, isError: rapor.startsWith("✖") };
}

// VIT-GRAF-A02: CLI `sarmal graf` ile BİREBİR aynı serileştirici (grafYuz) — çift mantık yok (YUZ-1.2).
function grafAraci(dizin: string, kok?: string): { metin: string; isError: boolean } {
  const programlar = programHaritasi(dizin);
  if (!programlar.size) {
    return { metin: `✖ '${dizin}' altında .sar bulunamadı — dizin bir çalışma-alanı kökü olmalı.`, isError: true };
  }
  // ORK-4 (KPS-ADA-A01): CLI ikizinin taşıdığı ad alanı kapısı burada da taşınır.
  const kapi = adAlaniKapisi(programlar, dizin);
  const çıktı = grafYuz(dagKur(programlar, { adAlaniCozulur: (h, d) => kapi.cozulur(h, d) }), kok);
  if (çıktı === undefined) {
    return { metin: `✖ '${kok}' kodlu düğüm grafikte yok — önce ilan et (kod: ${kok}).`, isError: true };
  }
  return { metin: çıktı, isError: false };
}

function baslaAraci(tur?: string): { metin: string; isError: boolean } {
  const omurga = "🌳 DOĞUŞ OMURGASI (üstteki abi alttakini DOĞURUR, alttaki ona bağımlıdır):\n" +
    DOGUS_OMURGASI.map((s) => "  " + s).join("\n");
  if (!tur) {
    return {
      metin: [
        "🌱 SARMAL DOĞUŞ REHBERİ — yazmadan ÖNCE oku; motor yalnız denetlemez, yönlendirir de.",
        "",
        mimariDiyalog(),
        "",
        omurga,
        "",
        `📐 Koni-dolu şablon iste: başla { tür: ${sablonTurleri().map((t) => `"${t}"`).join(" | ")} }`,
        "",
        "🖼️ DOLU vitrin örnekleri (kopyala ve uyarla; düğüm baştan dolu doğsun): ornek/vitrinler/dogus_proje.sar · dogus_ekran.sar · dogus_etmen.sar.",
        "⚠️ Motor seni yönlendirir — yazınca denetle ile gör: anadizin-plan-karışması · ana-yok · konisiz-adım · öksüz-düğme · kavuşumsuz-ekran · sözleşmesiz-uç.",
        "📜 Kural: kurallar · 🗂️ Tip: siniflama · ✅ Doğrulama: denetle · 🧭 Gezinme: gezin { kod } (⌘+tık/F12'nin ajan hâli — KOD gördüğünde dosya tarama, gezin'e sor).",
        "GÖREV: bu araç REHBER ve şablon verir; dosyayı SEN yazarsın — burası yönetişim katmanıdır, derleyici değil.",
      ].join("\n"),
      isError: false,
    };
  }
  const s = sablonMetni(tur);
  if (!s) {
    return {
      metin: `✖ Bilinmeyen tür: "${tur}". Geçerli: ${sablonTurleri().join(" · ")}`,
      isError: true,
    };
  }
  return {
    metin: [
      s.baslik,
      "",
      ...(["proje", "çalışmaalanı"].includes(tur.toLocaleLowerCase("tr")) ? [mimariDiyalog(), ""] : []),
      omurga,
      "",
      "📋 ŞABLON (kopyala, doldur — <...> yer-tutucuları gerçek değerle değiştir):",
      "```sar",
      s.sablon,
      "```",
      "",
      "🛡️ BEKÇİ (bu şablonu boş bırakırsan motor uyarır): " + s.bekci,
      "",
      "✍️ Yazınca denetle { kaynak } ile doğrula — motor eksik niyeti SÖYLER.",
    ].join("\n"),
    isError: false,
  };
}

// ── BKM-MCP-A01 araçları ─────────────────────────────────────────────────────

const SARMAL_CLI = fileURLToPath(new URL("./sarmal.ts", import.meta.url));

/** denetle-proje: CLI TAM-denetimi alt-süreç köprüsüyle — çıktı AYNEN döner.
 *  BİLİNÇLİ ARA-ÇÖZÜM (kapi_kapsami.sar'da beyanlı): denetleKomutu'nun saf
 *  kütüphaneleştirilmesi RAY-3'ün işi; o güne dek tek-kaynak alt-süreçle korunur. */
function denetleProjeAraci(dizin: string): { metin: string; isError: boolean } {
  try {
    const cikti = execFileSync(process.execPath, [SARMAL_CLI, "denetle", dizin],
      { encoding: "utf8", timeout: 120_000, maxBuffer: 32 * 1024 * 1024 });
    return { metin: cikti.trimEnd(), isError: false };
  } catch (e) {
    const h = e as { stdout?: string; stderr?: string; status?: number | null; message?: string };
    const metin = [h.stdout, h.stderr].filter(Boolean).join("\n").trimEnd();
    // çıkış 4 = drift bulundu — denetim deseniyle tutarlı: drift aracın SONUCU, hatası değil.
    if (h.status === 4 && metin) return { metin, isError: false };
    return { metin: metin || `✖ denetle-proje koşulamadı: ${h.message ?? "bilinmeyen hata"}`, isError: true };
  }
}

/** iskelet: giriş dosyasında İLAN EDİLEN ama diskte OLMAYAN yapıyı üretir (GBR-A04/#7).
 *  Çekirdek CLI --iskelet ile TEK kaynak (iskeletPlani + iskeletYaz · YUZ-1.2). Güvenli
 *  varsayılan ÖNİZLEME (uret=false diske dokunmaz); mevcut yapı EZİLMEZ. */
function iskeletAraci(dizin: string, uret: boolean): { metin: string; isError: boolean } {
  const anaAdi = anadizinBul(dizin);
  if (!anaAdi || !existsSync(anaAdi)) {
    return { metin: `✖ '${dizin}' içinde giriş dosyası yok (ana-yok) — önce <varlık>_anadizin.sar yaz (başla { tür }), sonra iskelet.`, isError: true };
  }
  let program;
  try {
    program = ayristir(belirtecle(readFileSync(anaAdi, "utf8")));
  } catch (e) {
    return { metin: `✖ Giriş dosyası ayrıştırılamadı (${anaAdi}): ${(e as Error).message} — söz-dizimi düzelt, sonra iskelet.`, isError: true };
  }
  const etkinSnf = siniflamaOrtuMerge(snf, siniflamaOrtuYukle(dizin));
  const plan = iskeletPlani(program, etkinSnf);
  const giris = anaAdi.slice(anaAdi.lastIndexOf("/") + 1);

  if (!uret) {
    // ── ÖNİZLEME (güvenli varsayılan · diske DOKUNMAZ) ──
    const eksik = plan.ogeler.filter((o) => !existsSync(join(dizin, o.yol)));
    if (!eksik.length) {
      return { metin: `✅ İskelet ZATEN TAM → ${dizin} (giriş: ${giris})\nİlan-edilen ${plan.ogeler.length} yapının hepsi diskte var — üretilecek yeni yok.`, isError: false };
    }
    const liste = eksik.map((o) => `  + ${o.tur.padEnd(6)} ${o.yol}`).join("\n");
    return {
      metin: `🔍 İSKELET ÖNİZLEME → ${dizin} (giriş: ${giris})\n` +
        `Üretilecek ${eksik.length} EKSİK yapı (mevcutlara DOKUNULMAZ):\n${liste}\n\n` +
        `⚙️ Gerçekten üret: iskelet { dizin: "${dizin}", uret: true }`,
      isError: false,
    };
  }

  // ── GERÇEK ÜRETİM (iskeletYaz — CLI --iskelet ile aynı çekirdek) ──
  const sonuc = iskeletYaz(plan, dizin);
  const olusan = sonuc.filter((u) => u.durum === "oluşturuldu");
  const dz = olusan.filter((u) => u.oge.tur === "dizin").length;
  const ds = olusan.filter((u) => u.oge.tur === "dosya").length;
  const atlanan = sonuc.length - olusan.length;
  const liste = olusan.length ? olusan.map((u) => `  + ${u.oge.tur.padEnd(6)} ${u.oge.yol}`).join("\n") : "  (yeni üretilmedi — ilan-edilen her şey zaten diskte vardı)";
  return {
    metin: `✅ İSKELET ÜRETİLDİ → ${dizin} (giriş: ${giris})\n${liste}\n\n` +
      `📊 ${dz} dizin · ${ds} dosya oluşturuldu${atlanan ? ` · ${atlanan} atlandı (zaten vardı, EZİLMEDİ)` : ""}.\n` +
      `🧭 Sıradaki: denetle-proje { dizin: "${dizin}" } — kayıp-yapı temizlendi mi doğrula.`,
    isError: false,
  };
}

/** etki: ileri kapanış — CLI etki yüzüyle aynı çekirdek (etkiMetni · YUZ-1.2). */
function etkiAraci(dizin: string, kod: string): { metin: string; isError: boolean } {
  if (!kod) return { metin: "✖ etki: 'kod' argümanı gerekli (ör. SEF-ATF-A01).", isError: true };
  const programlar = programHaritasi(dizin);
  if (!programlar.size) {
    return { metin: `✖ '${dizin}' altında .sar bulunamadı — dizin bir çalışma-alanı kökü olmalı.`, isError: true };
  }
  const metin = etkiMetni(dagKur(programlar), kod);
  return {
    metin: metin + "\n🧭 Listedeki bir KOD'un tanımına/atıflarına gitmek için: gezin { kod, dizin } (F12'nin ajan hâli).",
    isError: metin.startsWith("✖"),
  };
}

/** bul: düğüm KOD/ad/niyet metin araması (⌘T'nin ajan hâli) — programHaritasi üstünde saf gezinti. */
function bulAraci(dizin: string, metin: string): { metin: string; isError: boolean } {
  if (!metin) return { metin: "✖ bul: 'metin' argümanı gerekli.", isError: true };
  const programlar = programHaritasi(dizin);
  if (!programlar.size) {
    return { metin: `✖ '${dizin}' altında .sar bulunamadı — dizin bir çalışma-alanı kökü olmalı.`, isError: true };
  }
  const SONUC_SINIRI = 50;
  const norm = (s: string): string => s.toLocaleLowerCase("tr");
  const aranan = norm(metin);
  const sonuclar: string[] = [];
  let toplam = 0;
  for (const [etiket, program] of programlar) {
    const gez = (d: Dugum): void => {
      const p = (ad: string): string | undefined => d.parametreler.find((x) => x.ad === ad)?.deger.metin;
      const kod = p("kod");
      const ad = p("ne") ?? p("ad");
      const gorev = d.ozellikler.find((x) => x.ad === "görev")?.deger.metin;
      // eşleşen İLK alan raporlanır (kod > ad > görev > belge) — tek düğüm tek satır.
      const alan = kod && norm(kod).includes(aranan) ? ["kod", kod]
        : ad && norm(ad).includes(aranan) ? ["ad", ad]
        : gorev && norm(gorev).includes(aranan) ? ["görev", gorev]
        : d.belge && norm(d.belge).includes(aranan) ? ["belge", d.belge] : undefined;
      if (alan) {
        toplam++;
        if (sonuclar.length < SONUC_SINIRI) {
          const kisa = alan[1].length > 100 ? alan[1].slice(0, 97) + "…" : alan[1];
          sonuclar.push(`  ${etiket}:${d.satir}:${d.sutun}  [${d.ad}${kod ? ` ${kod}` : ""}] ${alan[0]}: ${kisa.replace(/\n/g, " · ")}`);
        }
      }
      for (const c of d.cocuklar) gez(c);
    };
    for (const b of program.bildirimler) gez(b);
  }
  if (!toplam) {
    return { metin: `🔎 "${metin}" hiçbir düğümün KOD/ad/görev/belge alanında geçmiyor (${programlar.size} .sar tarandı — boş ≠ hata).`, isError: false };
  }
  const kirpNotu = toplam > SONUC_SINIRI ? `\n… ilk ${SONUC_SINIRI} gösterildi (toplam ${toplam} — aramayı daralt).` : "";
  return {
    metin: `🔎 "${metin}" → ${toplam} düğüm:\n${sonuclar.join("\n")}${kirpNotu}` +
      "\n🧭 Bir sonucun tanımı/atıfları için: gezin { kod, dizin } (F12'nin ajan hâli).",
    isError: false,
  };
}

/** bicimle: BÇ-standart metin döndürür — dosya YAZMAZ (yazmak çağıranın işi). */
function bicimleAraci(kaynak: string): { metin: string; isError: boolean } {
  if (typeof kaynak !== "string" || !kaynak.trim()) {
    return { metin: "✖ bicimle: 'kaynak' argümanı gerekli (.sar kaynak metni).", isError: true };
  }
  return { metin: bicimle(kaynak, "\n"), isError: false };
}

/** prizma: json/yaml/xml yansıt + md belge yüzü — CLI ile aynı çekirdek (YUZ-1.2). */
function prizmaAraci(kaynak: string, yuz: string): { metin: string; isError: boolean } {
  const YUZLER = ["json", "yaml", "xml", "md"];
  if (!YUZLER.includes(yuz)) {
    return { metin: `✖ prizma: bilinmeyen yüz "${yuz}". Geçerli: ${YUZLER.join(" · ")}`, isError: true };
  }
  try {
    const metin = yuz === "md" ? belgeMd(kaynak) : yansıt(kaynak, yuz as Yüz);
    return { metin, isError: false };
  } catch (e) {
    if (e instanceof SozDizimHatasi) {
      return { metin: `✖ prizma: kaynak ayrıştırılamadı — ${e.satir}:${e.sutun} ${e.message}`, isError: true };
    }
    throw e;
  }
}

/** durum-guncelle: İLK yazan araç — DAR SINIR (yalnız Adım.durum · yalnız kanon enum ·
 *  adimDurumYaz: kilit + satirdaDegerDegistir + re-parse guard; şüphede DOKUNMAZ). */
function durumGuncelleAraci(dizin: string, kod: string, durum: string): { metin: string; isError: boolean } {
  const gecerli = snf.semalar?.["Adım"]?.enum?.durum ?? [];   // normalize kanon — `*` çözülmüş (doğuş-rehberi turu)
  if (!kod) return { metin: "✖ durum-guncelle: 'kod' argümanı gerekli (Adım KOD'u).", isError: true };
  if (!gecerli.includes(durum)) {
    return {
      metin: `✖ Geçersiz durum: "${durum}" — dosyaya DOKUNULMADI. Geçerli (kanondan): ${gecerli.join(" · ")}`,
      isError: true,
    };
  }
  const programlar = programHaritasi(dizin);
  if (!programlar.size) {
    return { metin: `✖ '${dizin}' altında .sar bulunamadı — dizin bir çalışma-alanı kökü olmalı.`, isError: true };
  }
  const etiket = adimEtiketiBul(programlar, kod);
  if (!etiket) {
    return { metin: `✖ '${kod}' kodlu Adım bulunamadı (${programlar.size} .sar tarandı) — dosyaya DOKUNULMADI.`, isError: true };
  }
  // TUR-2 DURUM MAKİNESİ: geçiş tablosu KANONDAN geçer — yasak geçiş (bloklu→
  // tamamlandı) adimDurumYaz içinde YAZ-ANINDA reddedilir (üç yazıcı tek mesaj).
  const s = adimDurumYaz(join(dizin, etiket), kod, durum, snf.durumGecisleri);
  if (!s.yazildi) {
    return { metin: `✖ durum yazılamadı (fail-safe — dosyaya dokunulmadı): ${s.sebep}`, isError: true };
  }
  return {
    metin: `✍️ ${etiket} → ${kod} durum: ${durum} (yalnız durum alanı — kilit+guard'lı tek-yazar, SENK-A05).` +
      `\n🧭 TAM hüküm için değişiklikten sonra: denetle-proje { dizin } koş.`,
    isError: false,
  };
}

// ── istek işleyici ──────────────────────────────────────────────────────────
function hata(id: number | string | null, code: number, mesaj: string): Cevap {
  return { jsonrpc: "2.0", id, error: { code, message: mesaj } };
}

function aracCagir(id: number | string | null, params: any): Cevap {
  const ad = params?.name;
  const arg0 = params?.arguments ?? {};

  if (ad === MCP_ARAC_ADI.sef) {
    const s = sefAraci(typeof arg0.dizin === "string" ? arg0.dizin : ".", typeof arg0.adim === "string" ? arg0.adim : "");
    return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text: s.metin }], isError: s.isError } };
  }
  if (ad === MCP_ARAC_ADI.ogret) {
    const s = ogretAraci(typeof arg0.konu === "string" ? arg0.konu : undefined);
    return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text: s.metin }], isError: s.isError } };
  }
  if (ad === MCP_ARAC_ADI.kavram) {
    const s = kavramAraci(
      typeof arg0.kelime === "string" ? arg0.kelime : undefined,
      typeof arg0.baglam === "string" ? arg0.baglam : undefined);
    return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text: s.metin }], isError: s.isError } };
  }
  if (ad === MCP_ARAC_ADI.basla) {
    const s = baslaAraci(typeof arg0.tur === "string" ? arg0.tur : undefined);
    return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text: s.metin }], isError: s.isError } };
  }
  if (ad === MCP_ARAC_ADI.karne) {
    const s = karneAraci(typeof arg0.dizin === "string" ? arg0.dizin : ".");
    return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text: s.metin }], isError: s.isError } };
  }
  if (ad === MCP_ARAC_ADI.dogus) {
    if (typeof arg0.hedef !== "string" || !arg0.hedef.trim()) {
      return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text: "✖ dogus için hedef dizin gerekli: { hedef: \"<dizin>\", tur: \"proje\" | \"calisma-alani\", ad?: \"<ad>\", proje?: \"<ilk-proje-adı>\" }" }], isError: true } };
    }
    // GOC-A10 (Founder 2026-08-23): tür verilmemişse araç YAZMAZ, soruyu sorar — ajan aynı çağrıyı tur alanıyla yineler.
    const turHam = typeof arg0.tur === "string" ? arg0.tur : undefined;
    const tur = dogusTuruCoz(turHam);
    if (turHam === undefined) {
      return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text: dogusSorusu() + "\n\n🧭 Hiçbir dosya yazılmadı. Yazım için aynı çağrıyı tur alanıyla yinele: { hedef: \"" + arg0.hedef + "\", tur: \"proje\" | \"calisma-alani\", ad?, proje? }" }], isError: false } };
    }
    if (!tur) {
      return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text: `✖ tur yalnız "proje" ya da "calisma-alani" olabilir; verilen: "${turHam}".\n` + dogusSorusu() }], isError: true } };
    }
    try {
      const s = dogusYaz(arg0.hedef, typeof arg0.ad === "string" ? arg0.ad : undefined, undefined, tur, typeof arg0.proje === "string" ? arg0.proje : undefined);
      return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text: dogusRaporu(s, arg0.hedef) }], isError: false } };
    } catch (e) {
      return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text: "✖ Doğuş paketi yazılamadı: " + (e as Error).message }], isError: true } };
    }
  }
  if (ad === MCP_ARAC_ADI.graf) {
    const s = grafAraci(typeof arg0.dizin === "string" ? arg0.dizin : ".", typeof arg0.kok === "string" ? arg0.kok : undefined);
    return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text: s.metin }], isError: s.isError } };
  }
  if (ad === MCP_ARAC_ADI.gezin) {
    const s = gezinAraci(typeof arg0.dizin === "string" ? arg0.dizin : ".", typeof arg0.kod === "string" ? arg0.kod : "");
    return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text: s.metin }], isError: s.isError } };
  }
  if (ad === MCP_ARAC_ADI.kurallar) {
    const s = kurallarAraci(typeof arg0.kategori === "string" ? arg0.kategori : undefined);
    return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text: s.metin }], isError: s.isError } };
  }
  if (ad === MCP_ARAC_ADI.denetleProje) {
    if (typeof arg0.dizin !== "string" || !arg0.dizin) return hata(id, -32602, "denetle-proje: 'dizin' argümanı gerekli.");
    const s = denetleProjeAraci(arg0.dizin);
    return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text: s.metin }], isError: s.isError } };
  }
  if (ad === MCP_ARAC_ADI.iskelet) {
    if (typeof arg0.dizin !== "string" || !arg0.dizin) return hata(id, -32602, "iskelet: 'dizin' argümanı gerekli.");
    const s = iskeletAraci(arg0.dizin, arg0.uret === true);
    return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text: s.metin }], isError: s.isError } };
  }
  if (ad === MCP_ARAC_ADI.etki) {
    const s = etkiAraci(typeof arg0.dizin === "string" ? arg0.dizin : ".", typeof arg0.kod === "string" ? arg0.kod : "");
    return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text: s.metin }], isError: s.isError } };
  }
  if (ad === MCP_ARAC_ADI.bul) {
    const s = bulAraci(typeof arg0.dizin === "string" ? arg0.dizin : ".", typeof arg0.metin === "string" ? arg0.metin : "");
    return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text: s.metin }], isError: s.isError } };
  }
  if (ad === MCP_ARAC_ADI.bicimle) {
    const s = bicimleAraci(typeof arg0.kaynak === "string" ? arg0.kaynak : "");
    return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text: s.metin }], isError: s.isError } };
  }
  if (ad === MCP_ARAC_ADI.prizma) {
    if (typeof arg0.kaynak !== "string") return hata(id, -32602, "prizma: 'kaynak' argümanı gerekli.");
    const s = prizmaAraci(arg0.kaynak, typeof arg0.yuz === "string" ? arg0.yuz : "");
    return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text: s.metin }], isError: s.isError } };
  }
  if (ad === MCP_ARAC_ADI.durumGuncelle) {
    const s = durumGuncelleAraci(
      typeof arg0.dizin === "string" ? arg0.dizin : ".",
      typeof arg0.kod === "string" ? arg0.kod : "",
      typeof arg0.durum === "string" ? arg0.durum : "");
    return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text: s.metin }], isError: s.isError } };
  }
  if (ad === MCP_ARAC_ADI.siniflama) {
    const s = siniflamaAraci(typeof arg0.tip === "string" ? arg0.tip : undefined);
    return {
      jsonrpc: "2.0",
      id,
      result: { content: [{ type: "text", text: s.metin }], structuredContent: s.yapisal ?? undefined, isError: s.isError },
    };
  }
  if (ad !== MCP_ARAC_ADI.denetle) return hata(id, -32602, `Bilinmeyen araç: ${ad}`);

  const arg = params?.arguments ?? {};
  let kaynak: string;
  if (typeof arg.kaynak === "string") {
    kaynak = arg.kaynak;
  } else if (typeof arg.yol === "string") {
    try {
      kaynak = readFileSync(arg.yol, "utf8");
    } catch (e) {
      // Araç çalıştı ama girdi okunamadı → isError'lı içerik (protokol hatası değil).
      // ADM-STD-MCP-DIKSIYON (OGR-2.1 · YAS-3.4 ③): ham hata yerine doğru yolu öğret —
      // en sık yanlış kullanım, denetle'ye DİZİN verilmesidir (EISDIR).
      const kodu = (e as NodeJS.ErrnoException).code;
      const metin = kodu === "EISDIR"
        ? `✖ '${arg.yol}' bir DİZİN — denetle TEK dosya denetler. Dizin/proje denetimi için denetle-proje aracını kullan (dizin: "${arg.yol}").`
        : `✖ Dosya okunamadı: ${(e as Error).message} — tek dosya için denetle (yol: dosya.sar), dizin için denetle-proje.`;
      return {
        jsonrpc: "2.0",
        id,
        result: { content: [{ type: "text", text: metin }], isError: true },
      };
    }
  } else {
    return hata(id, -32602, "denetle: 'kaynak' ya da 'yol' argümanı gerekli.");
  }

  // A11/E2: örtü çağrı-anında çözülür — yol'dan (dosyanın dizini) ya da dizin
  // argümanından find-up; ikisi de yoksa taban kanon (dış/kör ajan = taban davranışı).
  const ortuKoku = typeof arg.yol === "string" ? dirname(arg.yol)
    : typeof arg.dizin === "string" ? arg.dizin : undefined;
  const etkinSnf = ortuKoku ? siniflamaOrtuMerge(snf, siniflamaOrtuYukle(ortuKoku)) : snf;
  const projedeMi = anadizinVarMi(ortuKoku);   // IDA dersi: projede tek-dosya temizi yanlış-yeşildir
  const sonuc = denetleAraci(kaynak, etkinSnf, projedeMi ? "var" : "yok");
  // ağaç-yüzü turu: agac=true → yanıta ağaç yüzü de eklenir (CLI --agac ile AYNI
  // çekirdek agacYüz — dört yüzey tek üreticiyi çağırır, kopya render yasak).
  let agacMetni: string | undefined;
  if (arg.agac === true) {
    try { agacMetni = agacYüz(kaynak); }
    catch { agacMetni = undefined; }   // ağaç çizilemiyorsa denetim sonucu yine döner
  }
  return {
    jsonrpc: "2.0",
    id,
    result: {
      content: [
        { type: "text", text: taniMetni(sonuc, projedeMi) },
        ...(agacMetni ? [{ type: "text", text: "🌳 Yapı ağacı:\n```\n" + agacMetni.trimEnd() + "\n```" }] : []),
      ],
      structuredContent: agacMetni ? { ...sonuc, agac: agacMetni } : sonuc,
      isError: false, // drift = aracın SONUCU, aracın hatası değil
    },
  };
}

/** Bir JSON-RPC isteğini işler. Bildirim (id yok) → null (cevap yazılmaz). */
function isle(istek: Istek): Cevap | null {
  const { id, method, params } = istek;

  // Bildirimler (notifications/initialized vb.) id taşımaz → yanıtsız yut.
  if (id === undefined || id === null) return null;

  switch (method) {
    case "initialize":
      return {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: typeof params?.protocolVersion === "string" ? params.protocolVersion : PROTOKOL,
          capabilities: { tools: {} },
          serverInfo: SUNUCU,
        },
      };
    case "tools/list":
      return { jsonrpc: "2.0", id, result: { tools: MCP_ARAC_SEMALARI } };
    case "tools/call":
      return aracCagir(id, params);
    case "ping":
      return { jsonrpc: "2.0", id, result: {} };
    default:
      return hata(id, -32601, `Bilinmeyen metod: ${method}`);
  }
}

// ── stdio döngüsü (newline-delimited JSON-RPC) ──────────────────────────────
const rl = createInterface({ input: process.stdin });
rl.on("line", (satir) => {
  const s = satir.trim();
  if (!s) return;
  let istek: Istek;
  try {
    istek = JSON.parse(s);
  } catch {
    // Ayrıştırılamayan satır: id bilinmediği için sessiz geç (JSON-RPC gereği).
    return;
  }
  const cevap = isle(istek);
  if (cevap) process.stdout.write(JSON.stringify(cevap) + "\n");
});

process.stderr.write(
  `sarmal MCP hazır (stdio · ${SUNUCU.version} · dil: ${MCP_DILI}) — ` +
  `araçlar: ${MCP_ARAC_SEMALARI.map((a) => a.name).join(" · ")} · SNF: ${SNF_YOL}\n`,
);

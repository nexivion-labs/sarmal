#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// sarmal.ts — Komut girişi (CLI · #6 IDA dogfood: gerçek `sarmal` bin'i — tanı
//   mesajlarındaki "sarmal denetle/başla/--iskelet" artık GERÇEK komut. Kurulum:
//   cd cekirdek && npm link  →  `sarmal` global. node 22.6+ .ts'i native strip eder.)
//
//   Kullanım:
//     node src/sarmal.ts <dosya.sar>                    → ağaç + drift denetimi
//     node src/sarmal.ts <dosya.sar> --iskelet <hedef>  → klasör/dosya üret
//     node src/sarmal.ts denetle <dizin>                → proje dizinini denetle (Kapı 2)
//
//   Çıkış kodu (TEK sözleşme — RPR-1 bulgusu ile birleştirildi):
//     0 temiz/yalnız-uyarı · 1 kullanım hatası · 2 söz dizim hatası · 4 drift (hata).
// ═══════════════════════════════════════════════════════════════════════════

import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { join, dirname, basename, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { belirtecle, SozDizimHatasi } from "./belirtec.ts";
import { ayristir } from "./ayristirici.ts";
import { agaciYaz } from "./yazdir.ts";
import { dogrula, dayanaksizKurallar, beyanliDayanaksizKurallar } from "./dogrulayici.ts";
import { siniflamaYukle, siniflamaOrtuMerge, siniflamaOrtuYukle, taksonomiMd, taksonomiBlokUygula } from "./siniflama.ts";
import { iskeletPlani, iskeletYaz } from "./iskeletci.ts";
import { denetle, diskTara, kodIndeksle, adAlaniKapisi, referansTanilari, kuralTanilari, anaYokTanisi, programlariYukle, yinelenenKodTanilari, dosyalararasiCatismaTanilari, gizliBagimlilikTanilari, donguTanilari, yetimMeyveTanilari, docDriftTanilari, beyansizYapiTanilari, teknolojisizYuzeyTanilari, tekCocukTanilari, anadizinBul, adAyraciTanilari, halefTanilari, kapsamTanilari, rafsizAnadizinTanilari, kavusumsuzParalellikTanilari, fazVadeTanilari, katmansizTeknolojiTanilari, beceriDriftTanilari, kullanimsizTipTanilari, hiyerarsiTanilari, dayanakTanilari, dayanaksizKararlar, anadizinSekliTanilari, yerelEvre1Yumusat, siloBlokTanilari, kavusumsuzDilimTanilari, acikAdimTanilari, acikAdimGosterimi, dersAcikAdimSayisi, acikHatirlaticiGosterimi, dogusEksikProjeTanilari, olgunlukOnayiTanilari, planlamaEvresiMi, evre1Yumusat, metinAtifTanilari } from "./denetci.ts";
import { sefKomutu, programHaritasi } from "./sef.ts";
import { karneRaporu } from "./karne.ts";   // EMJ-A05: karne raporu yüzü (CLI ve MCP aynı çekirdek)
import { gezinKomutu, dizindenIndeks , INDEKS_DISI } from "./kimlik.ts";   // EKL-F11-A05: F12/⇧F12'nin CLI ikizi · kanıt-ekseni turu: denetim metin-atıf gözü
import { donguKos, donguIzle } from "./makro-dongu.ts";   // ORK-3.3: makro-döngü koşucusu
import { sefDogrulaKomutu } from "./sozlesme.ts";
import { sefDonguKomutu, sefAkisKomutu, sefParalelKomutu, demoEtmenYap, adimEtiketiBul, programlariTopla } from "./dongu.ts";
import type { DonguSonuç, SonYaz, KomutEk } from "./dongu.ts";
import { adimGeriYaz, adimDurumYaz, muhurDurum } from "./koniYaz.ts";
import { izliEtmenYap } from "./kopru/iz.ts";
import { sefRbacKomutu } from "./rbac.ts";
import { taniKodCoz } from "./tani-sicili.ts";   // göç motor turu A02 kapanışı · Karar A: katlanmış arama adı girdide çözülür
import { sefGatewayKomutu } from "./gateway.ts";
import { nvidiaEtmenYap, sefAracKanitKomutu, üretimKöprüsüYap } from "./kopru/nvidia.ts";
import { ligKomutu, LIG_MODELLER } from "./kopru/lig.ts";
import { dagKur, dagTanilari, durumTutarlilikTanilari, kopukZincirTanilari, kayipKenarTanilari, ozBagimlilikTanilari, karneOzeti, motorSirala, topolojikSira, blokRayi, secilebilirAdimlar } from "./dag.ts";
import { denetimKos, kilitOku } from "./denetim.ts";   // saf denetim çekirdeği — bu kabuk yalnız sunum yapar
import { icindekilerBloku } from "./icindekiler.ts";   // MD içindekiler çekirdeği (eski defter üreticisinden devralındı)
import { belgeYuzleriniUret } from "./belge-yuzleri.ts";
import { kanonTutarlilikUret } from "./kanon-tutarlilik.ts";
// CLI kapısı turu (Şart 2 kapanışı): MCP-yalnız araç listesi ARTIK elle yazılmış
// ikinci bir kopya DEĞİL — tek kaynak mcp-metinleri.ts'teki MCP_ARAC_ADI'dan
// TÜRETİLİR (bu dosya yalnız OKUNUR, asla değiştirilmez · YUZ-1.2). Kaynak
// büyüdükçe (yeni bir MCP aracı eklendikçe) bu liste kendiliğinden büyür.
import { MCP_ARAC_ADI } from "./mcp-metinleri.ts";

// `--gercek` bayrağı → demo-stub yerine GERÇEK NVIDIA etmeni enjekte (STR-3 köprü).
// `--iz` bayrağı → EtmenÇağır izleme-sarmalayıcıyla sarılır (HALKA-IZLE-A01):
// her çağrı .sarmal/trace/<koşu>.jsonl'e HAM kaydedilir (tam şeffaflık).
//
// 🔌 kanıt-ekseni turu: köprü ÜRETİM YOLUNA bağlandı. Eskiden `nvidiaEtmenYap()` ARGÜMANSIZ
// çağrılıyordu → köprü undefined → `tools` API'ye HİÇ gitmiyordu → tek tur, tek JSON,
// SIFIR araç. Araçlar (dosya-oku · dosya-yaz · test-koş) vardı ama üretim yolunda
// kimse onlara ulaşamıyordu; köprü yalnız `sef-arac-kanit` demo komutunda veriliyordu.
// Artık üretimKöprüsüYap(dizin) enjekte edilir: katalog + FAIL-CLOSED izin matrisi
// (üretici yazar/sınar · denetçi YAZAMAZ) + kök-sınırlı yürütücüler.
// ⚠️ `dizin` = araçların diske dokunabileceği TEK alan. Repo kökünde --gercek koşmak,
// üreticiye repo üzerinde yazma izni vermektir — gerçek koşular tek-kullanımlık
// fikstür dizininde yapılır (kanıt-ekseni turu).
function etmenSeç(dizin = ".") {
  const gercek = process.argv.includes("--gercek");
  const taban = gercek ? nvidiaEtmenYap(üretimKöprüsüYap(dizin)) : demoEtmenYap();
  if (!process.argv.includes("--iz")) return taban;
  const dosya = join(dizin, ".sarmal", "trace", `kosu-${new Date().toISOString().replace(/[:.]/g, "-")}.jsonl`);
  console.log(`📜 iz: trace → ${dosya} (HAM prompt+yanıt · rotasyon 5MB)`);
  return izliEtmenYap(taban, {
    dosya,
    model: gercek ? (process.env.NVIDIA_MODEL ?? "meta/llama-3.3-70b-instruct") : "demo-stub",
  });
}

// Dalga 3 kabuk ekleri: --guvenlik (üçüncü halka · GUV-A03) + --yaz başlangıç
// durum-yayını (IZLE-A02: koşu başlarken durum: geliştirmede — panel anlık görür).
function komutEkSeç(dizin: string, sozlesmeDizin?: string): KomutEk {
  const guvenlikAktif = process.argv.includes("--guvenlik") ? true : undefined;
  let onBasla: KomutEk["onBasla"];
  if (process.argv.includes("--yaz")) {
    onBasla = (adimKod: string): void => {
      const etiket = adimEtiketiBul(programlariTopla(dizin, sozlesmeDizin), adimKod);
      if (!etiket) return;
      const s = adimDurumYaz(join(dizin, etiket), adimKod, "geliştirmede");
      console.log(s.yazildi
        ? `🚦 durum yayını (IZLE-A02): ${etiket} → ${adimKod} durum: geliştirmede`
        : `🚦 durum yayını atlandı (fail-safe): ${s.sebep}`);
    };
  }
  // kanıt-ekseni turu: kontrol-noktası disk I/O'su KABUKTA yaşar — dongu.ts `node:fs`siz
  // kalır (döngü diske bakmaz; köprü sicili diske bakar, döngü sicili okur).
  const knDeposu: KomutEk["knDeposu"] = {
    oku: (yol) => (existsSync(yol) ? readFileSync(yol, "utf8") : undefined),
    yaz: (yol, içerik) => { mkdirSync(dirname(yol), { recursive: true }); writeFileSync(yol, içerik, "utf8"); },
  };
  return { guvenlikAktif, onBasla, knDeposu };
}

// `--yaz` bayrağı → koşu kararı plana geri yazılır (STR-4 · sonYaz enjeksiyonu —
// dongu koniYaz'ı BİLMEZ, döngüsel-import yok; kabuk bağlar).
function geriYaziciSeç(dizin: string, sozlesmeDizin?: string): SonYaz | undefined {
  if (!process.argv.includes("--yaz")) return undefined;
  return (adimKod: string, sonuç: DonguSonuç): void => {
    const etiket = adimEtiketiBul(programlariTopla(dizin, sozlesmeDizin), adimKod);
    if (!etiket) { console.error(`✍️  --yaz: '${adimKod}' Adım dosyası bulunamadı — plan güncellenmedi.`); return; }
    const gy = adimGeriYaz(join(dizin, etiket), adimKod, sonuç, {
      tarih: new Date().toISOString().slice(0, 10),
      model: process.env.NVIDIA_MODEL ?? (process.argv.includes("--gercek") ? "meta/llama-3.3-70b-instruct" : "demo-stub"),
    });
    console.log(gy.yazildi
      ? `✍️  plan güncellendi (canlı spec): ${etiket} → durum: ${muhurDurum(sonuç.mühür)} + koşu kaydı`
      : `✍️  --yaz başarısız (fail-safe, dosyaya dokunulmadı): ${gy.sebep}`);
  };
}
import { ebediEnvanter, ebediTanilar, muhurTanilari, EBEDI_KILIT_ADI } from "./kuralci.ts";
import { belgeMd } from "./belgele.ts";
import { yansıt, type Yüz } from "./prizma.ts";
import { agacYüz, agacBlokUygula } from "./agac.ts";
import { etkiMetni } from "./etki.ts";
import { grafYuz } from "./graf.ts";
import { sablonMetni, sablonTurleri, mimariDiyalog } from "./sablon.ts";
import { designmdTema, temaDesignmd } from "./tema-designmd.ts";
import { cevir } from "./cevir.ts";
import { yonergeIkiziDenetle, ikizRaporu, YONERGE_IKIZLERI } from "./yonerge-ikizi.ts";   // KYN-MTR-A02: yönerge ikizi nöbeti kök kapısıdır, varlık denetiminden ayrıdır
import { kokYuzeyiDenetle, kokYuzeyiRaporu } from "./kok-yuzeyi.ts";   // KYN-MTR-A04: kök yüzeyi nöbeti de kök kapısıdır ve varlık karnesine yazmaz
import type { EbediKilit } from "./kuralci.ts";
import type { Program, Dugum } from "./sozdizim.ts";
import type { Tani } from "./tani.ts";

// ── Çıkış kapısı: makine yüzü boruya EKSİKSİZ teslim edilir ─────────────────
//   ÖLÇÜLMÜŞ KUSUR (HTR-YANSIT-JSON-BORUDA-KIRPILIYOR · 2026-08-31). POSIX'te
//   `process.stdout` bir BORUYA bağlıyken yazma ASENKRONDUR: tek bir büyük
//   `write()` çağrısında çekirdek boru tamponunun aldığı kadarı (64 KiB)
//   eşzamanlı gider, geri kalanı kullanıcı alanı kuyruğuna girer. Bu dosyanın
//   her dağıtım kolu çıktısını bastıktan hemen sonra `process.exit()` çağırır
//   ve `process.exit()` kuyruğu boşaltmadan süreci kapatır; kuyrukta bekleyen
//   bayt SESSİZCE kaybolur, hiçbir hata basılmaz ve çıkış kodu sıfır kalır.
//   Ölçüm şudur: `yansıt <büyük>.sar --json | wc -c` tam 65.536 bayt (geçersiz
//   JSON) verir, aynı çağrı bir dosyaya yönlendirilince 212.389 bayt (geçerli
//   JSON) verir. Dosya ve uçbirim etkilenmez, çünkü POSIX'te ikisine yazma
//   zaten eşzamanlıdır; kusur yalnız boruda, yani ajanların ve alt-süreç
//   köprülerinin tükettiği yolda yaşar.
//
//   ONARIM TEK KAPIDIR. Altmış küsur `process.exit()` çağrısını tek tek
//   sarmalamak yerine, standart akışların tanıtıcısı DAĞITICI HİÇ ÇALIŞMADAN
//   ÖNCE bloklamaya alınır. Bloklu tanıtıcıda her `write()` baytları teslim
//   etmeden dönmez, dolayısıyla `process.exit()` çağrıldığı anda kuyrukta
//   hiçbir şey kalmaz. Komutların ÜRETTİĞİ İÇERİK bir bayt değişmez; değişen
//   tek şey çıktının eksiksiz teslim edilmesidir.
//
//   FAIL-SAFE. `_handle` Node'un belgelenmemiş iç yüzeyidir (yargs'ın uzun
//   yıllardır taşıdığı `set-blocking` bağımlılığının kullandığı desenin ta
//   kendisi). Tanıtıcının bulunmadığı ya da `setBlocking` taşımadığı bir
//   ortamda kapı sessizce hiçbir şey yapmaz ve davranış bugünküyle aynı kalır;
//   kapının kendisi hiçbir koşulda çökmez.
function ciktiKapisiniEsZamanliyaAl(): void {
  for (const akis of [process.stdout, process.stderr]) {
    const tanitici = (akis as unknown as { _handle?: { setBlocking?: (blokla: boolean) => void } })._handle;
    if (typeof tanitici?.setBlocking === "function") tanitici.setBlocking(true);
  }
}
ciktiKapisiniEsZamanliyaAl();

const args = process.argv.slice(2);
const yol = args[0];

// ── Yardım-yüzeyi sabitleri (CLI kapısı turu · ölçülmüş kusur onarımı) ───────
//   Bilinmeyen-komut önerisi ve MCP-yalnız araç yönlendirmesi bu iki listeden
//   beslenir. `yol` daha atanır atanmaz, her iki dispatch noktasından (aşağıdaki
//   erken --help ve satır ~776'daki geç bilinmeyen-komut yakalayıcısı) ÖNCE
//   burada tanımlanır — geç tanımlansaydı erken --help çağrısı kendisi TDZ'de
//   çökerdi (tam da onarmaya çalıştığımız ham-çökme sınıfından biri).
const BILINEN_KOMUTLAR: readonly string[] = [
  "başla", "basla", "doğuş", "dogus", "belge", "yansıt", "yansit", "agac", "ağaç", "tema-md",
  "denetle", "kilitle", "yonerge-ikizi", "kok-yuzeyi", "graf", "gezin", "etki", "sira", "ray",
  "sonraki", "omurga", "sef", "sef-dogrula", "sef-dongu", "sef-akis", "sef-paralel",
  "sef-arac-kanit", "dongu-kos", "rbac", "gateway", "lig", "belge-yuzleri-uret",
  "kanon-tutarlilik-uret", "taksonomi-uret", "icindekiler", "ogret", "karne", "cevir", "help",
];
// CLI kapısı turu (Şart 2 kapanışı — ölçülmüş kusur onarımı): elle yazılmış
// sekizli kopya emekli edildi. Bu liste artık mcp-metinleri.ts'teki TEK KAYNAK
// MCP_ARAC_ADI'dan türetilir: CLI'da zaten kendi adıyla yaşayan araçlar
// (BILINEN_KOMUTLAR'da aynı adla geçen sef/ogret/karne/basla/dogus/graf/gezin/
// denetle/etki) burada TEKRAR anılmaz — yalnız komut satırında karşılığı
// olmayan, GERÇEKTEN MCP-yalnız araçlar kalır (ör. kurallar, siniflama, kavram).
const MCP_ARACLARI: readonly string[] = Object.values(MCP_ARAC_ADI).filter(
  (ad) => !BILINEN_KOMUTLAR.includes(ad),
);

if (yol === "--help" || yol === "-h" || yol === "help") {
  console.log(yardimMetni());
  process.exit(0);
}

if (!yol) {
  console.error("Kullanım: node src/sarmal.ts <dosya.sar> [--iskelet <hedef>] | denetle <dizin> | yonerge-ikizi [kök] [--sahnelenmiş] | kok-yuzeyi [kök] | doğuş <hedef> [--ad <proje-adı>] | sarmal --help (tam komut listesi)");
  process.exit(1);
}

const bayrakIdx = args.indexOf("--iskelet");
const hedef = bayrakIdx >= 0 ? args[bayrakIdx + 1] : undefined;
if (bayrakIdx >= 0 && !hedef) {
  console.error("✖ --iskelet için hedef dizin gerekli: --iskelet <hedef>");
  process.exit(1);
}

// SNF-0 kayıt dosyası (repo kökündeki oz/siniflama/kayit.json).
const SNF_YOL = fileURLToPath(new URL("../../../oz/siniflama/kayit.json", import.meta.url));

/** `--sozlesme <dizin>` bayrağını ayrıştırır (A26 · cross-entity ŞEF sözleşme kaynağı):
 *  graf/Adım bir varlıkta (ör. _KapaliUrun), SZL-* sözleşmeleri başka varlıkta (ör. _Sarmal).
 *  Yoksa undefined (mevcut davranış). Değer eksik/bozuksa kullanım hatası (çıkış 1). */
function sozlesmeDizinAyristir(): string | undefined {
  const i = args.indexOf("--sozlesme");
  if (i < 0) return undefined;
  const d = args[i + 1];
  if (!d || d.startsWith("--")) {
    console.error("✖ --sozlesme için dizin gerekli: --sozlesme <dizin>");
    process.exit(1);
  }
  return d;
}

// ── `yonerge-ikizi [kök] [--sahnelenmiş]` alt komutu (KYN-MTR-A02 · YUZ-1.2) ──
//    Çalışma alanı kökündeki yönerge ikizlerinin (CLAUDE.md ≡ AGENTS.md) bayt
//    özdeşliğini denetler. Ayrışma varsa ayrışan satırları adresiyle basar ve 4
//    ile çıkar; kapı bu çıkış koduyla işlemeyi reddeder. Sınır gereği motor
//    dosyaları EŞİTLEMEZ, çünkü hangi yüzün doğru olduğuna insan karar verir.
//
//    KİP SEÇİMİ. Bayraksız çağrı ÇALIŞMA AĞACINI ölçer; komutu elle koşturan insan
//    elindeki dosyaları sorar ve henüz sahnelenmemiş bir ayrışmayı da görmelidir.
//    `--sahnelenmiş` bayrağı deponun index yüzünü ölçer ve "bu işleme depoya
//    ayrışmış bir ikiz yazar mı?" sorusunu sorar; kanca yalnız bu kipi kullanır.
//    İki kip birbirinin yerine geçmez ve rapor hangi yüzü ölçtüğünü söyler.
if (yol === "yonerge-ikizi") {
  const kok = args[1] && !args[1].startsWith("--") ? args[1] : ".";
  const kip = args.includes("--sahnelenmiş") ? "sahnelenmiş" : "çalışma-ağacı";
  const tanilar = yonergeIkiziDenetle(kok, YONERGE_IKIZLERI, kip);
  console.log(ikizRaporu(tanilar, YONERGE_IKIZLERI, kip));
  process.exit(tanilar.some((t) => t.duzey === "hata") ? 4 : 0);
}

// ── `kok-yuzeyi [kök]` alt komutu (KYN-MTR-A04 · MIM-3 · STR-3) ──────────────
//    Çalışma alanı kökündeki yüzey dosyalarının (tanıtım, katkı rehberi, güvenlik,
//    davranış kuralı, yürütücü yönergesi) metnindeki kod atıflarını açık aracın
//    kimlik evrenine vurur ve karşılıksız kalanları adresiyle bildirir.
//
//    NEDEN AYRI KAPI. Kök yüzeyleri iki varlığın da ÜSTÜNDE yaşar. Bu ölçüm varlık
//    denetimine katılsaydı kök bulgusu tek bir varlığın karnesine yazılır ve iki
//    varlığın sonucu birbirine karışırdı; ayrı kapı, kapsamın çalışma alanı kökü
//    olduğunu yapısal olarak beyan eder.
//
//    ÇIKIŞ KODU. Yalnız HATA düzeyindeki bulgu kapıyı kapatır: ilan edilmiş bir
//    yüzeyin diskte bulunamaması ya da atıf evreninin okunamaması. Karşılıksız
//    atıf UYARI konuşur, çünkü bulgunun onarımı metni yazan insanın kararıdır ve
//    motor kök yüzeyinin içeriğini kendiliğinden tazelemez.
if (yol === "kok-yuzeyi") {
  const kok = args[1] && !args[1].startsWith("--") ? args[1] : ".";
  const bulgular = kokYuzeyiDenetle(kok);
  console.log(kokYuzeyiRaporu(bulgular));
  process.exit(bulgular.some((b) => b.tani.duzey === "hata") ? 4 : 0);
}

// ── `denetle <dizin> [--ana <spec.sar>]` alt komutu (Kapı 2 · PLN-1) ─────────
//    --ana: dizin İÇİNDEKİ ana.sar yerine dış spec kullan (3-repo senaryosu:
//    spec bir repoda, gerçeklik başka repoda — hedefe dokunmadan denetle).
//    --tam-liste: gösterim özetlemesini kapatır (her bulgu kendi satırında).
if (yol === "denetle") {
  const dizin = args[1];
  if (!dizin || dizin.startsWith("--")) {
    console.error("✖ denetle için proje dizini gerekli: sarmal denetle <dizin> [--ana <spec.sar>] [--tam-liste]");
    process.exit(1);
  }
  const anaIdx = args.indexOf("--ana");
  const anaYolu = anaIdx >= 0 ? args[anaIdx + 1] : undefined;
  if (anaIdx >= 0 && !anaYolu) {
    console.error("✖ --ana için spec dosyası gerekli: --ana <spec.sar>");
    process.exit(1);
  }
  process.exit(denetleKomutu(dizin, anaYolu));
}

// ── `doğuş <hedef> [--tur proje|calisma-alani] [--ad <ad>] [--proje <ilk-proje>]` (DPK-A02 · GOC-A10) ──
//    Boş dizinde çalışır proje doğurur: anadizin + durum devri + öğrenme rafı +
//    ilk plan (MIM-1). Tür sorusu (Founder 2026-08-23): tek proje mi, çalışma alanı mı?
//    --tur verilmezse etkileşimli uçbirimde sorulur; uçbirim yoksa tek proje varsayılır
//    ve ipucu basılır. Var olan dosya EZİLMEZ (dolu-dizin sözleşmesi). ASCII eşi: dogus.
if (yol === "doğuş" || yol === "dogus") {
  const hedef = args[1];
  if (!hedef || hedef.startsWith("--")) {
    console.error("✖ doğuş için hedef dizin gerekli: sarmal doğuş <hedef> [--tur proje|calisma-alani] [--ad <ad>] [--proje <ilk-proje-adı>]");
    process.exit(1);
  }
  const secenek = (bayrak: string, acik: string): string | undefined => {
    const idx = args.indexOf(bayrak);
    if (idx < 0) return undefined;
    const deger = args[idx + 1];
    if (!deger || deger.startsWith("--")) {
      console.error(`✖ ${bayrak} için ${acik} gerekli: ${bayrak} <${acik}>`);
      process.exit(1);
    }
    return deger;
  };
  const ad = secenek("--ad", "ad");
  const proje = secenek("--proje", "ilk-proje-adı");
  const turHam = secenek("--tur", "tür");
  const { dogusYaz, dogusRaporu, dogusTuruCoz, dogusSorusu } = await import("./dogus.ts");
  let tur = dogusTuruCoz(turHam);
  if (turHam !== undefined && !tur) {
    console.error(`✖ --tur yalnız "proje" ya da "calisma-alani" olabilir; verilen: "${turHam}".\n${dogusSorusu()}`);
    process.exit(1);
  }
  if (!tur) {
    if (process.stdin.isTTY && process.stdout.isTTY) {
      const { createInterface } = await import("node:readline/promises");
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      console.log(dogusSorusu());
      const cevap = await rl.question("   Seçimin [1 = tek proje · 2 = çalışma alanı]: ");
      rl.close();
      tur = dogusTuruCoz(cevap);
      if (!tur) {
        console.error(`✖ Cevap anlaşılmadı: "${cevap}". 1 ya da 2 yaz, ya da --tur bayrağını ver.`);
        process.exit(1);
      }
    } else {
      tur = "proje";
      console.error("ℹ️ --tur verilmedi ve etkileşimli uçbirim yok; tek proje varsayıldı. Çalışma alanı doğurmak için: --tur calisma-alani");
    }
  }
  const sonuc = dogusYaz(hedef, ad, undefined, tur, proje);
  console.log(dogusRaporu(sonuc, hedef));
  process.exit(0);
}

// ── `dongu-kos <DNG-KOD> [dizin] [--izle] [--aralik <ms>]` (ORK-3.3 · DNG-KOS) ──
//    Makro-döngü koşucusu: el/koşul anında; olay/zaman --izle kipiyle.
//    Çıkış: 0 sağlıklı durdu · 4 tanım yok · 5 ilerlemesiz (insan baksın).
if (yol === "dongu-kos") {
  const kod = args[1];
  if (!kod || kod.startsWith("--")) {
    console.error("✖ dongu-kos için Döngü KOD gerekli: sarmal dongu-kos <DNG-KOD> [dizin] [--izle] [--aralik <ms>]");
    process.exit(1);
  }
  const dizin = args[2] && !args[2].startsWith("--") ? args[2] : ".";
  const aralikIdx = args.indexOf("--aralik");
  const aralikMs = aralikIdx >= 0 ? Number(args[aralikIdx + 1]) : undefined;
  const raporla = (s: import("./makro-dongu.ts").KosumSonucu): never => {
    for (const t of s.turlar) {
      console.log(`🔁 tur ${t.tur}: ${t.kosulan.map((k) => `${k.kod}(${k.cikis})`).join(" · ") || "—"} → hata ${t.hata} · uyarı ${t.uyari} [${t.karar}]`);
    }
    console.log(`${s.cikis === 0 ? "✅" : s.cikis === 5 ? "🛑" : "✖"} ${s.gerekce} (${s.turlar.length} tur)`);
    process.exit(s.cikis);
  };
  if (args.includes("--izle")) {
    // top-level await: süreç izleme boyunca yaşar; bitince raporla process.exit eder
    // (await'siz bırakılırsa akış alttaki dosya-açma varsayılanına DÜŞER — duman dersi).
    raporla(await donguIzle(dizin, kod, etmenSeç(dizin), { aralikMs }));
  } else {
    raporla(donguKos(dizin, kod, etmenSeç(dizin)));
  }
}

// ── `gezin <KOD> [dizin]` alt komutu (EKL-F11-A05 · salt-okuma) ──────────────
//    Bir KOD'un tanımı + tüm atıfları (dosya:satır:sütun) — eklentinin
//    F12/⇧F12'si ve MCP `gezin` aracıyla AYNI çekirdek (kimlik.ts · YUZ-1.2).
if (yol === "gezin") {
  const kod = args[1];
  if (!kod || kod.startsWith("--")) {
    console.error("✖ gezin için KOD gerekli: sarmal gezin <KOD> [dizin]");
    process.exit(1);
  }
  const dizin = args[2] && !args[2].startsWith("--") ? args[2] : ".";
  process.exit(gezinKomutu(dizin, kod));
}

// ── `sef <ADIM-KOD> [dizin]` alt komutu (RAY-3 · salt-okuma) ─────────────────
//    Bir Adım'ın koni'sinden bağlam-montajlı prompt + token raporu üretir.
//    Etmen çağırmaz, dosya yazmaz (ilk nefes). STR-3: açık jenerik mekanizma.
if (yol === "sef") {
  const adimKod = args[1];
  if (!adimKod || adimKod.startsWith("--")) {
    console.error("✖ sef için Adım KOD gerekli: sarmal sef <ADIM-KOD> [dizin]");
    process.exit(1);
  }
  const dizin = args[2] && !args[2].startsWith("--") ? args[2] : ".";
  process.exit(sefKomutu(dizin, adimKod));
}

// ── `sef-dogrula <SOZLESME-KOD> <cikti.json> [dizin]` (RAY-3 · Aşama 2 · B.1/B.2) ─
//    Etmen çıktısını / ŞEF kararını Sarmal'ın kendi sözleşmesine (mek_sef.sar) vurur.
if (yol === "sef-dogrula") {
  const sozlesmeKod = args[1];
  const ciktiYolu = args[2];
  if (!sozlesmeKod || !ciktiYolu || sozlesmeKod.startsWith("--") || ciktiYolu.startsWith("--")) {
    console.error("✖ Kullanım: sarmal sef-dogrula <SOZLESME-KOD> <cikti.json> [dizin]");
    process.exit(1);
  }
  const dizin = args[3] && !args[3].startsWith("--") ? args[3] : ".";
  process.exit(sefDogrulaKomutu(dizin, sozlesmeKod, ciktiYolu));
}

// ── `sef-dongu <ADIM-KOD> [dizin]` (RAY-3 · Aşama 3) ─────────────────────────
//    İzole üret→denetle→yama döngüsü + karar/mühür. Gerçek Etmen politikası GİZLİ
//    (STR-3) → CLI demo-stub etmen enjekte eder (kuru-çalıştırma, mekanizmayı gösterir).
if (yol === "sef-dongu") {
  const adimKod = args[1];
  if (!adimKod || adimKod.startsWith("--")) {
    console.error("✖ sef-dongu için Adım KOD gerekli: sarmal sef-dongu <ADIM-KOD> [dizin] [--sozlesme <dizin>]");
    process.exit(1);
  }
  const dizin = args[2] && !args[2].startsWith("--") ? args[2] : ".";
  const sozlesmeDizin = sozlesmeDizinAyristir();
  process.exit(sefDonguKomutu(dizin, adimKod, etmenSeç(dizin), sozlesmeDizin, geriYaziciSeç(dizin, sozlesmeDizin), komutEkSeç(dizin, sozlesmeDizin)));
}

// ── `sef-arac-kanit [dizin]` — CANLI tool-round kanıtı ─────────────────────────
//    Gerçek NVIDIA LLM'e dosya-oku aracı sun; model ister → gateway keser/izin verir →
//    sonuç geri beslenir → model DEVAM eder. İki senaryo (izinli · izinsiz-RED). GERÇEK
//    API çağrısı yapar (token harcar) → --gercek ZORUNLU (kazara koşu güvenliği).
if (yol === "sef-arac-kanit") {
  if (!process.argv.includes("--gercek")) {
    console.error("✖ sef-arac-kanit CANLI kanıt turudur — GERÇEK NVIDIA çağrısı yapar (token harcar).\n" +
      "  Bilerek koş: sarmal sef-arac-kanit [dizin] --gercek [--dosya <yol>]");
    process.exit(1);
  }
  const dizin = args[1] && !args[1].startsWith("--") ? args[1] : ".";
  const dosyaIdx = args.indexOf("--dosya");
  const okunacak = dosyaIdx >= 0 && args[dosyaIdx + 1] ? args[dosyaIdx + 1] : "README.md";
  process.exit(sefAracKanitKomutu(dizin, okunacak));
}

// ── `sef-akis <ADIM1> <ADIM2> ... [dizin]` (RAY-3 · Aşama 4 · D.3) ─────────────
//    Çok-adımlı ŞEF zinciri: her Adım'ın kararı sonrakine handoff olur + kontrol noktası.
//    Yol-göstergesi (. veya / içeren) argüman dizindir; kalanı Adım kodları.
if (yol === "sef-akis") {
  const sozlesmeDizin = sozlesmeDizinAyristir();
  const sozIdx = args.indexOf("--sozlesme");
  // --sozlesme <dizin> ikilisini (bayrak + değer) dışla — değer dizin sanılmasın.
  const rest = args.filter((a, i) => i >= 1 && !a.startsWith("--") && i !== sozIdx + 1);
  const dizinArg = rest.find((a) => a === "." || a.includes("/") || a.startsWith(".."));
  const adımlar = rest.filter((a) => a !== dizinArg);
  if (adımlar.length === 0) {
    console.error("✖ Kullanım: sarmal sef-akis <ADIM1> <ADIM2> ... [dizin] [--sirali] [--sozlesme <dizin>]");
    process.exit(1);
  }
  // ── ORK-3 (ZINCIR-A03): --sirali → elle sıra yerine MOTOR sırası (Kahn rütbesi).
  let akisAdimlari = adımlar;
  if (args.includes("--sirali")) {
    const { programlar } = programlariYukle(dizinArg ?? ".");
    akisAdimlari = motorSirala(adımlar, dagKur(programlar));
    console.log(`🔢 --sirali: motor sırası uygulandı → ${akisAdimlari.join(" → ")}`);
  }
  process.exit(sefAkisKomutu(dizinArg ?? ".", akisAdimlari, etmenSeç(dizinArg ?? "."), sozlesmeDizin, geriYaziciSeç(dizinArg ?? ".", sozlesmeDizin), komutEkSeç(dizinArg ?? ".", sozlesmeDizin)));
}

// ── `sef-paralel <ADIM...> [dizin]` (HALKA-ORK-A02) — bağımsız Adımlar eşzamanlı ──
//    Paralel kümeler DAG'dan (Kahn seviyeleri); seviye içi eşzamanlı (--cap N),
//    seviyeler arası bariyer. Çekirdek döngü SAF/senkron kalır (orkestra katmanı).
if (yol === "sef-paralel") {
  const sozlesmeDizin = sozlesmeDizinAyristir();
  const sozIdx = args.indexOf("--sozlesme");
  const capIdx = args.indexOf("--cap");
  const rest = args.filter((a, i) => i >= 1 && !a.startsWith("--") && i !== sozIdx + 1 && i !== capIdx + 1);
  const dizinArg = rest.find((a) => a === "." || a.includes("/") || a.startsWith(".."));
  const adımlar = rest.filter((a) => a !== dizinArg);
  if (adımlar.length === 0) {
    console.error("✖ Kullanım: sarmal sef-paralel <ADIM1> <ADIM2> ... [dizin] [--cap N] [--guvenlik] [--iz] [--yaz]");
    process.exit(1);
  }
  const cap = capIdx >= 0 ? Number(args[capIdx + 1]) || 4 : undefined;
  const d = dizinArg ?? ".";
  process.exit(await sefParalelKomutu(d, adımlar, etmenSeç(d), sozlesmeDizin, geriYaziciSeç(d, sozlesmeDizin),
    { ...(komutEkSeç(d, sozlesmeDizin) ?? {}), esZamanLimit: cap }));
}

// ── `rbac [dizin]` (RAY-3 · Aşama 4 · D.1) — Etmen kadrosunu yetki kurallarına vurur ──
if (yol === "rbac") {
  const dizin = args[1] && !args[1].startsWith("--") ? args[1] : ".";
  process.exit(sefRbacKomutu(dizin));
}

// ── `gateway [dizin]` (RAY-3 · Aşama 4 · Gateway-RAY) — Etmen mcpİzinleri beyanlarını denetler ──
if (yol === "gateway") {
  const dizin = args[1] && !args[1].startsWith("--") ? args[1] : ".";
  process.exit(sefGatewayKomutu(dizin));
}

// ── `sira [dizin]` (ORK-3) — bağımlılık-güdümlü topolojik sıra + türetilmiş ardıllar ──
if (yol === "sira") {
  const dizin = args[1] && !args[1].startsWith("--") ? args[1] : ".";
  process.exit(siraKomutu(dizin));
}

// ── `ray [dizin]` (E1-A07) — Blok→ray OTOMATİK iniş: tüm Blok'lar elle-wire'sız topolojik rayda ──
if (yol === "ray") {
  const dizin = args[1] && !args[1].startsWith("--") ? args[1] : ".";
  process.exit(rayKomutu(dizin));
}

// ── `sonraki [dizin]` — Adım-seçici: şimdi koşulabilir Adımlar (ŞEF'in girdisi) ──
if (yol === "sonraki") {
  const dizin = args[1] && !args[1].startsWith("--") ? args[1] : ".";
  process.exit(sonrakiKomutu(dizin));
}

// ── `omurga [dizin]` — akış omurgası CANLI: proje hangi durakta + hangi bekçi aktif ──
if (yol === "omurga") {
  const dizin = args[1] && !args[1].startsWith("--") ? args[1] : ".";
  process.exit(omurgaKomutu(dizin));
}

// ── `lig <plan.sar> [--karar <k.md>] [--modeller a,b,c]` (STR-3.2 çalgıcı-ligi) ──
//    Planı lig modellerine sunar, yapılandırılmış görüş + uzlaşı sentezi döner.
if (yol === "lig") {
  const planYolu = args[1];
  if (!planYolu || planYolu.startsWith("--")) {
    console.error("✖ Kullanım: sarmal lig <plan.sar> [--karar <karar.md>] [--modeller a,b,c]");
    process.exit(1);
  }
  const kararIdx = args.indexOf("--karar");
  const kararYolu = kararIdx >= 0 ? args[kararIdx + 1] : undefined;
  const modelIdx = args.indexOf("--modeller");
  const modeller = modelIdx >= 0 && args[modelIdx + 1] ? args[modelIdx + 1].split(",") : LIG_MODELLER;
  process.exit(ligKomutu(planYolu, kararYolu, modeller));
}

// ── `belge <dosya.sar> [--yaz <hedef.md>]` alt komutu (DIL-2 ⑥) ──────────────
//    Tek kaynak .sar → MD ÜRETİLİR (elle MD-ikiz yasak). stdout ya da dosya.
if (yol === "belge") {
  const dosya = args[1];
  if (!dosya || dosya.startsWith("--")) {
    console.error("✖ belge için .sar dosyası gerekli: sarmal belge <dosya.sar> [--yaz <hedef.md>]");
    process.exit(1);
  }
  const yazIdx = args.indexOf("--yaz");
  const mdHedef = yazIdx >= 0 ? args[yazIdx + 1] : undefined;
  if (yazIdx >= 0 && !mdHedef) {
    console.error("✖ --yaz için hedef dosya gerekli: --yaz <hedef.md>");
    process.exit(1);
  }
  try {
    const md = belgeMd(readFileSync(dosya, "utf8"));
    if (mdHedef) { writeFileSync(mdHedef, md, "utf8"); console.log(`✅ Belge yazıldı → ${mdHedef}`); }
    else console.log(md);
    process.exit(0);
  } catch (e) {
    if (e instanceof SozDizimHatasi) { console.error(`✖ Söz dizimi (${e.satir}:${e.sutun}): ${e.message}`); process.exit(2); }
    throw e;
  }
}

// ── `belge-yuzleri-uret [dizin]` (göç belge turu A02 kapanışı) ─────────────────────────────
//    Kalıcı README/indeks/Diátaxis yüzlerinin yalnız işaretli üretim bölgelerini
//    canlı kanon, sınıflama ve tanı sicilinden tazeler; elle girişleri korur.
if (yol === "belge-yuzleri-uret") {
  const dizin = args[1] && !args[1].startsWith("--") ? args[1] : "..";
  const sonuc = belgeYuzleriniUret(dizin);
  console.log(`📚 belge yüzleri: ${sonuc.degisen.length} değişti · ${sonuc.degismeyen.length} aynı · ${sonuc.kanonMaddesi} madde · ${sonuc.aracSayisi} araç.`);
  process.exit(0);
}

// ── `kanon-tutarlilik-uret [dizin]` (göç belge turu A03 kapanışı) ─────────────────────────
//    Resmi kanon sekizlisinden örnek, tanı eşlemesi, değişmez ve kaynak mührü
//    üretir. Çıktı türevdir; kanon dosyalarına yazmaz.
if (yol === "kanon-tutarlilik-uret") {
  const dizin = args[1] && !args[1].startsWith("--") ? args[1] : "..";
  const sonuc = kanonTutarlilikUret(dizin);
  console.log(`⚖️ kanon tutarlılık: ${sonuc.degisti ? "tazelendi" : "aynı"} · ${sonuc.madde} madde · ${sonuc.yeni} yeni · ${sonuc.onceki} önceki · ${sonuc.emekli} emekli · ${sonuc.emeklilikBorcu} açık emeklilik borcu.`);
  process.exit(0);
}

// ── `yansıt <dosya.sar> --json|--yaml|--xml [--yaz <hedef>]` (FEL-5 Prizma) ──
//    Tek kaynak .sar → seçilen YÜZ: JSON ⚙️makine · YAML 🔧config · XML 🤖ajan
//    (MD 👤insan = `belge` komutu). Dört yüz de TEK parse'tan → drift imkânsız.
if (yol === "yansıt" || yol === "yansit") {
  const dosya = args[1];
  if (!dosya || dosya.startsWith("--")) {
    console.error("✖ yansıt için .sar dosyası gerekli: sarmal yansıt <dosya.sar> --json|--yaml|--xml [--yaz <hedef>]");
    process.exit(1);
  }
  const yüz: Yüz | undefined = args.includes("--json") ? "json" : args.includes("--yaml") ? "yaml" : args.includes("--xml") ? "xml" : undefined;
  if (!yüz) {
    console.error("✖ yüz seç: --json (makine) · --yaml (config) · --xml (ajan)");
    process.exit(1);
  }
  const yazIdx = args.indexOf("--yaz");
  const hedef = yazIdx >= 0 ? args[yazIdx + 1] : undefined;
  if (yazIdx >= 0 && !hedef) {
    console.error("✖ --yaz için hedef dosya gerekli: --yaz <hedef>");
    process.exit(1);
  }
  try {
    const çıktı = yansıt(readFileSync(dosya, "utf8"), yüz);
    if (hedef) { writeFileSync(hedef, çıktı, "utf8"); console.log(`✅ ${yüz.toUpperCase()} yüzü yazıldı → ${hedef}`); }
    else process.stdout.write(çıktı);
    process.exit(0);
  } catch (e) {
    if (e instanceof SozDizimHatasi) { console.error(`✖ Söz dizimi (${e.satir}:${e.sutun}): ${e.message}`); process.exit(2); }
    throw e;
  }
}

// ── `agac <dosya.sar> [--kod] [--yaz <hedef>]` (FEL-5 Prizma · 5. yüz · YUZ-1.1) ─
//    Tek kaynak .sar → 🌳 AĞAÇ yüzü: ├──/└── klasör-ağacı çizimi (insan, bir
//    bakışta). --kod: her satıra [KOD] kimlik etiketi. Kaynak ASLA değişmez.
// ── `etki <KOD> [dizin]` (YUZ-3 · VIT-K77-A03) — bu düğüme dokunursam ne etkilenir? ──
//    DAG ters-türetmesinden ileri kapanış: doğrudan + geçişli bekleyenler,
//    topolojik sırada, durum rozetli (deterministik — STR-3.1 AÇIK).
if (yol === "etki") {
  const kod = args[1];
  if (!kod || kod.startsWith("--")) {
    console.error("✖ Kullanım: sarmal etki <KOD> [dizin]");
    process.exit(1);
  }
  const dizin = args[2] && !args[2].startsWith("--") ? args[2] : ".";
  const { programlar, hatalar } = programlariYukle(dizin);
  if (hatalar.length) {
    console.error(`✖ ${hatalar.length} sözdizim hatası — önce düzelt (sarmal <dosya> ile bak).`);
    process.exit(2);
  }
  console.log(etkiMetni(dagKur(programlar), kod));
  process.exit(0);
}

// ── `başla [tür]` (SABLON-KUTUPHANE) — doğuş rehberi + kanonik şablon ─────────
//    Şablon kütüphanesi (sablon/*.sar) tek kaynaktan okunur; MCP başla aracıyla
//    aynı sablon.ts'i çağırır (YUZ-1.2). Tür yoksa liste, tür varsa dolu şablon.
if (yol === "başla" || yol === "basla") {
  const tur = args[1];
  if (!tur || tur.startsWith("--")) {
    console.log([
      "🌱 SARMAL ŞABLON KÜTÜPHANESİ — kanonik şablonlar sablon/ altında yaşar.",
      "",
      mimariDiyalog(),
      "",
      `📐 Kullanım: sarmal başla <tür>   ·   türler: ${sablonTurleri().join(" · ")}`,
      "",
      "Her şablon eksiksiz gelir (boş iskelet bırakma — eksik niyet drift'e yol açar);",
      "yazdıktan sonra `sarmal denetle` ile doğrula.",
    ].join("\n"));
    process.exit(0);
  }
  const s = sablonMetni(tur);
  if (!s) {
    console.error(`✖ Bilinmeyen tür: "${tur}". Geçerli: ${sablonTurleri().join(" · ")}`);
    process.exit(1);
  }
  // DIL-1.2 önek (GBR-A05 · IDA #3): anadizin kökü (proje/çalışmaalanı) için beklenen
  // KAYIT adını AÇIKÇA yaz — öneksiz `anadizin.sar` proje-düzeyinde 'ana-yok' olarak
  // patlıyordu; ajan/kullanıcı doğru dosya adını baştan bilsin.
  const turKucuk = tur.toLocaleLowerCase("tr");
  const anadizinKok = turKucuk === "proje" || turKucuk === "çalışmaalanı" || turKucuk === "calismaalani";
  console.log([
    s.baslik, "",
    ...(turKucuk === "proje" ? [mimariDiyalog(), ""] : []),
    "📋 ŞABLON (kopyala, doldur — <...> yer-tutucuları gerçek değerle değiştir):",
    "", s.sablon, "",
    ...(anadizinKok ? ["💾 KAYDET: giriş dosyasını '<varlık>_anadizin.sar' olarak yaz (ör. ida_anadizin.sar) —", "   önek varlık kimliğidir; motor giriş dosyasını bu desenle tanır (öneksiz ad 'ana-yok' verir · MIM-3).", ""] : []),
    "🛡️ BEKÇİ (boş bırakırsan motor uyarır): " + s.bekci,
  ].join("\n"));
  process.exit(0);
}

// ── `graf [dizin] [--kok KOD]` (VIT-GRAF-A01) — kanonik graf yüzü ─────────────
//    Derleyicinin Dag çıktısı DIŞA AÇIK determinist JSON: düğümler (içerme +
//    bağımlılık kenarlı) + kopuk uçlar + karne. IDE·AI·araçlar aynı grafı okur.
if (yol === "graf") {
  const dizin = args[1] && !args[1].startsWith("--") ? args[1] : ".";
  const kokIdx = args.indexOf("--kok");
  const kok = kokIdx >= 0 ? args[kokIdx + 1] : undefined;
  if (kokIdx >= 0 && (!kok || kok.startsWith("--"))) {
    console.error("✖ --kok için düğüm kodu gerekli: sarmal graf <dizin> --kok <KOD>");
    process.exit(1);
  }
  const { programlar, hatalar } = programlariYukle(dizin);
  if (hatalar.length) {
    console.error(`✖ ${hatalar.length} sözdizim hatası — önce düzelt (sarmal <dosya> ile bak).`);
    process.exit(2);
  }
  // ORK-4 (KPS-ADA-A01): graf yüzü de ad alanı kapısını taşır — aynı hedef
  // denetimde çözülüp grafta kopuk görünemez (tek kurucu: adAlaniKapisi).
  const kapi = adAlaniKapisi(programlar, dizin);
  const çıktı = grafYuz(dagKur(programlar, { adAlaniCozulur: (h, d) => kapi.cozulur(h, d) }), kok);
  if (çıktı === undefined) {
    console.error(`✖ '${kok}' kodlu düğüm grafikte yok — önce ilan et (kod: ${kok}).`);
    process.exit(1);
  }
  process.stdout.write(çıktı);
  process.exit(0);
}

// ── `icindekiler <dosya.md>` (EKL-F9-A12) — ### başlıklardan içindekiler bloğu ──
//    KARARLAR.md gibi uzun defterlerde tarama derdi biter: işaretli blok idempotent
//    yazılır (taksonomi-uret deseni), elle bölgeler korunur.
if (yol === "icindekiler") {
  const dosyaYolu = args[1];
  if (!dosyaYolu || dosyaYolu.startsWith("--")) {
    console.error("✖ Kullanım: sarmal icindekiler <dosya.md>");
    process.exit(1);
  }
  const BAS = "<!-- SARMAL:ICINDEKILER -->";
  const SON = "<!-- /SARMAL:ICINDEKILER -->";
  const eski = readFileSync(dosyaYolu, "utf8");
  // Tek kaynak: icindekiler.ts icindekilerBloku — her tüketici AYNI
  // algoritmayı paylaşır (iki yüz ayrışamaz).
  const blok = icindekilerBloku(eski);
  const basliklar = eski.split("\n").filter((s) => s.startsWith("### "));
  let yeni: string;
  const b0 = eski.indexOf(BAS);
  const s0 = eski.indexOf(SON);
  if (b0 >= 0 && s0 > b0) {
    yeni = eski.slice(0, b0) + blok + eski.slice(s0 + SON.length);
  } else {
    const satirlar = eski.split("\n");
    const ilkBolum = satirlar.findIndex((s) => s.startsWith("## "));
    const ek = blok.split("\n").concat("");
    if (ilkBolum >= 0) satirlar.splice(ilkBolum, 0, ...ek);
    else satirlar.push("", ...blok.split("\n"));
    yeni = satirlar.join("\n");
  }
  if (yeni === eski) console.log(`✅ içindekiler güncel — ${dosyaYolu} değişmedi (idempotent).`);
  else { writeFileSync(dosyaYolu, yeni); console.log(`📑 içindekiler tazelendi → ${dosyaYolu} (${basliklar.length} başlık).`); }
  process.exit(0);
}

// ── `ogret [konu]` (davranış-katmanı turu · OGR-2.2) — karşılama kartı: ilk temas tek ekranda ──
//    Kart KANONDAN üretilir (ogret.ts — YUZ-1.2: bayatlamaz). Konu kartları (beceri
//    dağıtımı) davranış-katmanı turu'ün işi; konulu çağrı dürüstçe karşılama kartına yönlendirir.
if (yol === "ogret") {
  const { ogretKarti } = await import("./ogret.ts");
  const snf = siniflamaYukle(SNF_YOL);
  if (args[1] && !args[1].startsWith("--")) {
    console.log(`ℹ️ Konu kartları henüz yolda (davranış-katmanı turu — MCP beceri dağıtımı); şimdilik karşılama kartı:\n`);
  }
  console.log(ogretKarti(snf));
  process.exit(0);
}

// ── `taksonomi-uret [dizin]` (BKM-OLG-A01) — kayit.json → kayit.md makine-envanteri ──
//    Şema↔doküman drifti imkânsızlaşır: tablo elle değil kanondan üretilir; işaretli
//    bölge idempotent yazılır, elle anlatı blokları korunur.
if (yol === "taksonomi-uret") {
  const dizin = args[1] && !args[1].startsWith("--") ? args[1] : "..";
  const mdYolu = join(dizin, "oz", "siniflama", "kayit.md");
  if (!existsSync(mdYolu)) {
    console.error(`✖ taksonomi-uret: ${mdYolu} bulunamadı.`);
    process.exit(1);
  }
  const snf = siniflamaOrtuMerge(siniflamaYukle(SNF_YOL), siniflamaOrtuYukle(dizin));
  const eski = readFileSync(mdYolu, "utf8");
  const yeni = taksonomiBlokUygula(eski, taksonomiMd(snf));
  if (yeni === eski) {
    console.log(`✅ taksonomi güncel — ${mdYolu} değişmedi (idempotent).`);
  } else {
    writeFileSync(mdYolu, yeni);
    console.log(`📇 makine-envanteri tazelendi → ${mdYolu} (kaynak: kayit.json kanonu).`);
  }
  process.exit(0);
}

if (yol === "agac" || yol === "ağaç") {
  const dosya = args[1];
  if (!dosya || dosya.startsWith("--")) {
    console.error("✖ agac için .sar dosyası gerekli: sarmal agac <dosya.sar> [--kod] [--kok <KOD>] [--yaz <hedef.txt>] [--readme <hedef.md>]");
    process.exit(1);
  }
  const kodVar = args.includes("--kod");
  const yazIdx = args.indexOf("--yaz");
  const hedef = yazIdx >= 0 ? args[yazIdx + 1] : undefined;
  if (yazIdx >= 0 && !hedef) {
    console.error("✖ --yaz için hedef dosya gerekli: --yaz <hedef.txt>");
    process.exit(1);
  }
  // ağaç-yüzü turu: --kok <KOD> → yalnız o düğümün alt-ağacı basılır.
  const kokIdx = args.indexOf("--kok");
  const altKok = kokIdx >= 0 ? args[kokIdx + 1] : undefined;
  if (kokIdx >= 0 && (!altKok || altKok.startsWith("--"))) {
    console.error("✖ --kok için düğüm KOD'u gerekli: --kok <KOD>");
    process.exit(1);
  }
  // ağaç-yüzü turu: --readme <md> → işaretli SARMAL:AGAC bloğu idempotent yenilenir.
  const rIdx = args.indexOf("--readme");
  const readmeHedef = rIdx >= 0 ? args[rIdx + 1] : undefined;
  if (rIdx >= 0 && (!readmeHedef || readmeHedef.startsWith("--"))) {
    console.error("✖ --readme için hedef .md gerekli: --readme <README.md>");
    process.exit(1);
  }
  try {
    const çıktı = agacYüz(readFileSync(dosya, "utf8"), { kod: kodVar, altKok });
    if (readmeHedef) {
      const eski = existsSync(readmeHedef) ? readFileSync(readmeHedef, "utf8") : "";
      const yeni = agacBlokUygula(eski, çıktı);
      if (yeni === eski) console.log(`✅ README ağacı güncel — ${readmeHedef} değişmedi (idempotent).`);
      else { writeFileSync(readmeHedef, yeni, "utf8"); console.log(`🌳 README ağacı tazelendi → ${readmeHedef} (kaynak: ${dosya}).`); }
    } else if (hedef) {
      writeFileSync(hedef, çıktı, "utf8");
      console.log(`✅ Ağaç yüzü yazıldı → ${hedef}`);
    } else process.stdout.write(çıktı);
    process.exit(0);
  } catch (e) {
    if (e instanceof SozDizimHatasi) { console.error(`✖ Söz dizimi (${e.satir}:${e.sutun}): ${e.message}`); process.exit(2); }
    if (e instanceof Error && e.message.includes("ağaç-yüzü turu")) { console.error(`✖ ${e.message}`); process.exit(1); }
    throw e;
  }
}

// ── `tema-md <dosya>` alt komutu (D3/D4): DESIGN.md ↔ Tema dönüştürücü ───────
//    Varsayılan: DESIGN.md → Tema.sar (import). --dışa: Tema.sar → DESIGN.md.
//    DESIGN.md = Google Labs AÇIK standart (Apache-2.0); Stitch ARACINA değil
//    STANDARDA bağlan (YUZ-1.1) — tüm DESIGN.md araçlarıyla konuş.
if (yol === "tema-md") {
  const dosya = args[1];
  if (!dosya || dosya.startsWith("--")) {
    console.error("✖ tema-md için dosya gerekli: sarmal tema-md <dosya.md | dosya.sar> [--dışa]");
    process.exit(1);
  }
  const disa = args.includes("--dışa");
  try {
    const icerik = readFileSync(dosya, "utf8");
    console.log(disa ? temaDesignmd(ayristir(belirtecle(icerik))) : designmdTema(icerik));
    process.exit(0);
  } catch (e) {
    if (e instanceof SozDizimHatasi) { console.error(`✖ ${dosya}:${e.satir}:${e.sutun} — ${e.message}`); process.exit(2); }
    throw e;
  }
}

// ── `karne [dizin]` alt komutu (EMJ-A05): etmen karne raporu ─────────────────
//    Onaylı ⭐ skalasını KANONDAN basar + kadrodaki Etmen'leri listeler; sicil
//    verisi henüz toplanmadığından derece BASILMAZ (dürüstlük sözleşmesi).
if (yol === "karne") {
  const dizin = args[1] && !args[1].startsWith("--") ? args[1] : ".";
  const snf = siniflamaOrtuMerge(siniflamaYukle(SNF_YOL), siniflamaOrtuYukle(dizin));
  console.log(karneRaporu(snf, programHaritasi(dizin)));
  process.exit(0);
}

// ── `cevir <kelime>` alt komutu: çeviri katmanı (3 sözlük tek kapı) ─────────
//    ① keyword i18n (Ekran→Screen) ② stack kod (kutu→Container) ③ TR↔EN terim.
//    View-layer (karar A): kanonik TR; ilk tr/en, az/ar sonra.
if (yol === "cevir") {
  const kelime = args[1];
  if (!kelime || kelime.startsWith("--")) {
    console.error("✖ cevir için kelime gerekli: sarmal cevir <kelime>");
    process.exit(1);
  }
  const c = cevir(kelime);
  if (!c.bulundu) {
    console.log(`ℹ "${kelime}" sözlüklerde yok (keyword/kavram/terim değil ya da henüz eklenmedi).`);
    process.exit(0);
  }
  console.log(`🔤 "${kelime}"`);
  if (c.i18n) {
    console.log(`  [dil] ${c.i18n.tur} · kanonik: ${c.i18n.kanonik}`);
    for (const [dl, kr] of Object.entries(c.i18n.diller)) console.log(`     ${dl}: ${kr}`);
  }
  if (c.stack) {
    console.log(`  [stack] kavram: ${c.stack.kavram}`);
    for (const [dl, kr] of Object.entries(c.stack.hedefler)) if (!dl.startsWith("_")) console.log(`     ${dl}: ${kr}`);
  }
  if (c.terim) console.log(`  [terim] ${c.terim.tr} ↔ ${c.terim.en}`);
  process.exit(0);
}

// ── `kilitle <dizin>` alt komutu (M-2 · PLN-6): EBEDİ kuralları mühürler ─────
//    Bilinçli + loglu işlem (FEL-4): mühür sonrası ebedi kurala her dokunuş
//    `ebedi-ihlal` HATASI verir; yeniden mühürleme yalnız bu komutla.
if (yol === "kilitle") {
  const dizin = args[1];
  if (!dizin || dizin.startsWith("--")) {
    console.error("✖ kilitle için proje dizini gerekli: sarmal kilitle <dizin>");
    process.exit(1);
  }
  process.exit(kilitleKomutu(dizin));
}

// ── Bilinmeyen komut / MCP-yalnız araç / bulunamayan dosya (CLI kapısı turu) ──
//   Buraya kadar hiçbir `yol === "..."` dalı eşleşmedi: `yol` ya tanınmayan bir
//   alt komut ya da (var olması gereken) bir .sar dosya yolu. Eskiden üçü de aynı
//   ham `readFileSync` çağrısına düşüyordu ve Node'un kendi yığın izini basıyordu
//   (kök sebep: dağıtıcı tanımadığı her dizeyi dosya adı sayıyordu). Üç durum
//   burada ayrı ayrı ayıklanır ki kullanıcı hiçbir zaman ham yığın izi görmesin.
// MCP-yalnız araç adı HER ZAMAN MCP yönlendirmesi alır — bu denetim existsSync'ten
// ÖNCE gelir. Aksi hâlde çalışma dizininde araç adıyla AYNI adlı bir klasör
// (ör. "siniflama") bulunduğunda existsSync(yol) true döner ve aşağıdaki
// var-olan-ama-dosya-değil bekçisi MCP yönlendirmesini gölgelerdi (Şart 1/Şart 2
// birbirini örterdi — ölçülmüş kusurun üçüncü somut hâli).
if (MCP_ARACLARI.includes(yol)) {
  console.error(`✖ "${yol}" komut satırında yaşamaz — yalnız Sarmal MCP sunucusu üzerinden çağrılan bir araçtır. Çözüm: MCP sunucusu bağlıysa "${yol}" aracını doğrudan çağır (araç adı: mcp__sarmal__${yol}); komut satırından eşdeğer bir kanıt istiyorsan "sarmal --help" ile mevcut komutlara bak.`);
  process.exit(1);
}

if (!existsSync(yol)) {
  const dosyaGibiMi = yol.includes(".") || yol.includes("/") || yol.includes("\\");
  if (dosyaGibiMi) {
    console.error(`✖ Dosya bulunamadı: "${yol}". Çözüm: yol yazımını denetle ve var olan bir .sar dosyasının doğru yolunu ver; proje geneli bir denetim istiyorsan "sarmal denetle <dizin>" komutunu kullan.`);
    process.exit(1);
  }
  const benzer = enYakinKomut(yol, BILINEN_KOMUTLAR);
  console.error(`✖ Bilinmeyen komut: "${yol}".${benzer ? ` Bunu mu demek istedin: "sarmal ${benzer}"?` : ""} Çözüm: tam komut listesi için "sarmal --help" çalıştır.`);
  process.exit(1);
}

// Var olan ama DOSYA olmayan bir yol (Şart 1 kapanışı — ölçülmüş kusur): eskiden
// yalnız `!existsSync(yol)` ayıklanıyordu, bu yüzden var olan bir dizin (ör. "."
// ya da "./src") aşağıdaki readFileSync çağrısına düşüp Node'un ham `node:fs:435`
// yığın izini basıyordu. Burada gerçekten DOSYA mı ölçülür; değilse tek satırlık
// dürüst bir hata basılır. Dizin özel olarak ele alınır çünkü bir dizin verildiğinde
// kullanıcının en olası niyeti proje geneli denetimdir (ör. yeni kullanıcının
// yazacağı ilk komut olan "sarmal .").
const yolDurumu = statSync(yol);
if (!yolDurumu.isFile()) {
  if (yolDurumu.isDirectory()) {
    console.error(`✖ "${yol}" bir dizindir, .sar dosyası değildir. Çözüm: bu dizinin proje genelinde denetimini istiyorsan "sarmal denetle ${yol}" komutunu çalıştır; belirli bir .sar dosyasını incelemek istiyorsan dosyanın tam yolunu ver.`);
  } else {
    console.error(`✖ "${yol}" bir .sar dosyası değildir (desteklenmeyen dosya sistemi türü). Çözüm: var olan bir .sar dosyasının yolunu ver.`);
  }
  process.exit(1);
}

try {
  const kaynak = readFileSync(yol, "utf8");
  const program = ayristir(belirtecle(kaynak));
  console.log(agaciYaz(program));

  // Tekil dosya da örtü-farkındadır: dosyanın bulunduğu dizinin
  // oz/siniflama/ortu.json'u varsa enum genişler; yoksa taban (find-up sonraki tur).
  const snf = siniflamaOrtuMerge(siniflamaYukle(SNF_YOL), siniflamaOrtuYukle(dirname(yol)));
  const tanilar = dogrula(program, snf, yol, kaynak);   // RF-T6-A04: ÖzelKural hedef-süzgeci · ham metin: şekil nöbeti
  // göç motor turu A10 kapanışı (2026-07-27): tek-dosya önek bekçisi emekli edildi
  // (`öneksiz-anadizin` · `eski-giriş-adı`); giriş dosyasının kanonik adı artık
  // MIM-3 disk mutabakatı ile DIL-1.2 ad sözleşmesinin işidir.

  if (hedef) {
    // Drift'li ağaç iskeletlenmez — sağlam kök → düzenli dal.
    if (tanilar.some((t) => t.duzey === "hata")) {
      tanilariYaz(yol, tanilar);
      console.error("\n✖ İskelet üretilmedi — önce yukarıdaki drift'i gider.");
      process.exit(4);
    }
    iskeletiUret(program, snf, hedef);
  } else {
    tanilariYaz(yol, tanilar);
    // C9 (bug-avı · sinav2-A7 akrabası): tek-dosya "temiz"i bütün-temiz sanılmasın.
    console.log("ℹ Tek-dosya görünümü — çok-dosya tanıları (kırık-referans · yinelenen-kod · DAG/döngü · yapı-aynası) yalnız `sarmal denetle <dizin>` kapısında koşar.");
    if (tanilar.some((t) => t.duzey === "hata")) process.exit(4);
  }
} catch (e) {
  if (e instanceof SozDizimHatasi) {
    console.error(`✖ ${yol}:${e.satir}:${e.sutun} — ${e.message}`);
    process.exit(2);
  }
  throw e;
}

function iskeletiUret(
  program: Parameters<typeof iskeletPlani>[0],
  snf: Parameters<typeof iskeletPlani>[1],
  hedef: string,
): void {
  const uygulamalar = iskeletYaz(iskeletPlani(program, snf), hedef);
  console.log(`\n── İSKELET → ${hedef} ──`);
  let dizin = 0;
  let dosya = 0;
  let atlandi = 0;
  for (const u of uygulamalar) {
    const im = u.durum === "atlandı" ? "·" : "+";
    const et = u.durum === "atlandı" ? "atlandı" : u.oge.tur;
    console.log(`${im} ${et.padEnd(7)} ${u.oge.yol}${u.durum === "atlandı" ? "   (zaten var)" : ""}`);
    if (u.durum === "atlandı") atlandi++;
    else if (u.oge.tur === "dizin") dizin++;
    else dosya++;
  }
  console.log(`\n✅ ${dizin} dizin · ${dosya} dosya oluşturuldu${atlandi ? ` · ${atlandi} atlandi` : ""}.`);
}

/**
 * Proje dizinini denetler (Kapı 2): ana.sar → beklenen · disk → gerçek.
 *   1. MIM-3: ana.sar var mı?           → yoksa ana-yok (hata) + çık
 *   2. tüm .sar'lar ayrışır            → KOD indeksi (çok-dosya dar kapsam)
 *   3. denetle: kayıp-yapı · bildirilmemiş-dosya · yer-uyuşmazlığı
 *   4. referansTanıları: kırık-referans (dosya başına)
 *   5. kuralTanıları: kural-ihlali (ASCII-kebap ad zorlaması)
 *  Çıkış: 0 temiz/yalnız-uyarı · 2 söz dizim hatası · 4 denetim drift'i (hata).
 */
function denetleKomutu(dizin: string, anaYolu?: string): number {
  console.log(`── DENETİM → ${dizin}${anaYolu ? ` (spec: ${anaYolu})` : ""} ──`);
  // BKM-OLG-A07: vade nöbetlerinin "bugün"ü CLI bayrağından enjekte edilir (determinizm).
  const tarihIdx = args.indexOf("--tarih");
  const bugun = tarihIdx >= 0 && args[tarihIdx + 1] && !args[tarihIdx + 1].startsWith("--")
    ? args[tarihIdx + 1]
    : undefined;
  // KARAR mantığı saf çekirdekte yaşar (denetim.ts denetimKos — programatik yüz);
  // bu kabuk yalnız SUNUMDUR: akışı raporla ile basar, özet metnini kurar, çıkış kodunu döner.
  // ÖZETLEME KAPALI KİPİ: `--tam-liste` gösterim katlamasını tamamen kapatır.
  // Üç-satır kısıtı insan okuyucu içindir; ölçüm yapan ajan tam dökümü ister ve
  // tür dökümündeki sayılar iki kipte de aynıdır (değişen yalnız sunumdur).
  const tamListe = args.includes("--tam-liste");
  const s = denetimKos(dizin, { anaYolu, bugun, snfYol: SNF_YOL, tamListe });
  if (s.sozdizimHata) {
    const h = s.sozdizimHata;
    console.error(`✖ ${h.etiket}:${h.satir}:${h.sutun} — ${h.mesaj}`);
    return s.cikis;
  }
  // göç motor turu A02 kapanışı (Karar A · ikinci parça): `--tanı <kod>` süzgeci hem kanonik
  // hem katlanmış (diakritiksiz) yazımı KABUL eder; başlıkta ve raporda basılan
  // kimlik HER ZAMAN kanoniktir. Bayrak verilmezse çıktı bayt-bayt değişmez.
  const taniIdx = args.findIndex((a) => a === "--tanı" || a === "--tani");
  const taniGirdi = taniIdx >= 0 && args[taniIdx + 1] && !args[taniIdx + 1].startsWith("--")
    ? args[taniIdx + 1]
    : undefined;
  let suzgec: string | undefined;
  if (taniIdx >= 0) {
    if (!taniGirdi) {
      console.error("✖ --tanı için tanı kimliği gerekli: --tanı <kod> (kanonik ya da diakritiksiz yazım kabul edilir)");
      return 1;
    }
    suzgec = taniKodCoz(taniGirdi, siniflamaOrtuMerge(siniflamaYukle(SNF_YOL), siniflamaOrtuYukle(dizin)));
    if (!suzgec) {
      console.error(`✖ '${taniGirdi}' tanı sicilinde çözülmedi — motor uydurma kimlik basmaz; sicildeki kanonik yazımı kullan.`);
      return 1;
    }
    console.log(`🔎 Tanı süzgeci: ${suzgec}${suzgec === taniGirdi ? "" : ` (girdi '${taniGirdi}' katlanmış arama adıyla çözüldü)`} — özet satırı TAM koşumu anlatır, süzgeç yalnız listeyi daraltır.`);
  }
  if (tamListe) {
    console.log("🔓 Özetleme kapalı (--tam-liste): aynı türden bulgular tek satıra katlanmadı, her bulgu kendi satırıyla basıldı. Tür dökümündeki sayılar özetli kiptekilerle birebir aynıdır — değişen yalnız sunumdur.");
  }
  for (const r of s.akis) {
    const tanilar = suzgec ? r.tanilar.filter((t) => t.kod === suzgec) : r.tanilar;
    if (tanilar.length) raporla(r.dosya, tanilar);
  }
  if (!s.tamKosum) return s.cikis;

  const muafNotu = s.muaflar.size
    ? `\nℹ️ ${s.muaflar.size} dosya bilerek-hatalı (tanıları atlandı): ${[...s.muaflar].join(" · ")}`
    : "";
  // ── YUZ-3 (VIT-K77-A02): build-sonu karnesi — tek bakışta plan sağlığı.
  const krn = s.karne!;
  const kd = krn.durumlar;
  // OGR-5: karne ürün kapsamındadır; örnek dünyasının açık Adımları ayrı satırla görünür.
  const dersNotu = s.dersAcik > 0
    ? `\n📚 Örnek dünyasında ${s.dersAcik} açık Adım — ders malzemesidir ve kasıtlı olarak açıktır; ürün gündemine ve karneye girmez.`
    : "";
  // RF-T6-A02 · SOL HÜKMÜ (b): dayanak eşleme borcu KARNEDE yaşar (tek satır, ürün/örnek ayrık).
  const dy = s.dayanak;
  const dayanakNotu = dy.urun > 0
    ? `\n⚖️ Dayanak eşleme: ürün ${dy.urun} kural dayanaksız — nöbet işaretledi (Problems/denetim; dayanak: K-nn yaz ya da dayanaksız: "gerekçe" beyan et)${dy.kuralsizKarar ? ` · ters envanter: ${dy.kuralsizKarar} kilitli karar hiçbir kuralın dayanağı değil` : ""}`
    : `\n⚖️ Dayanak haritası TAM: ürün kuralları bağlı${dy.beyanli ? ` (bilinçli-beyanlı ${dy.beyanli} dahil)` : ""} · ders-dünyası ${dy.ornek} örnek kuralı kasıtlı olarak dayanaksızdır${dy.kuralsizKarar ? ` · ters envanter: ${dy.kuralsizKarar} kilitli karar hiçbir kuralın dayanağı değil` : ""}`;
  const karneSatiri = `📋 Karne (ürün): ${krn.dugum} düğüm · ${krn.adim} Adım → 🟢 ${kd["tamamlandı"] ?? 0} · 🟡 ${kd["geliştirmede"] ?? 0} · 🔵 ${kd["beklemede"] ?? 0} · ⛔ ${kd["bloklu"] ?? 0}${dayanakNotu}${dersNotu}`;
  // MOTOR SUSMAZ (Founder 2026-07-14): açık adım varken motor "bitti/TAM-yeşil" DEMEZ.
  const acikSayi = s.acikAdimlar.length;
  const acikBlok = (): string => {
    if (acikSayi === 0) return "";
    const gelistirmede = s.acikAdimlar.filter((a) => /geliştirmede/.test(a.tani.mesaj)).length;
    const bekleyen = acikSayi - gelistirmede;
    const liste = s.acikAdimlar.slice(0, 8).map((a) => `   • ${a.tani.mesaj.replace(/^.. AÇIK ADIM \([^)]*\) /, "").replace(/\. Motor bunu.*$/, "")}`).join("\n");
    const artan = acikSayi > 8 ? `\n   … ve ${acikSayi - 8} açık Adım daha` : "";
    return `\n\n🚧 MOTOR SUSMUYOR — ${acikSayi} açık Adım (🚧 ${gelistirmede} geliştirmede · 🔵 ${bekleyen} beklemede). Hepsi 'tamamlandı' olunca motor susar:\n${liste}${artan}`;
  };
  // ── TÜR DÖKÜMÜ — kapının kendi sayısını dürüstçe söylediği yer ──────────────
  //   Dosya başına basılan özet satırı yalnız O DOSYANIN kalanını anlatır; bir
  //   tanının gerçek ağırlığı ancak burada görünür. Sayı ayrı bir sayaçtan değil,
  //   hata/uyarı toplamını da üreten tek sayım noktasından gelir (denetimKos),
  //   bu yüzden çıktıyı metin olarak ayrıştırmaya gerek yoktur.
  const turBloku = (): string => {
    if (!s.turDokumu.length) return "";
    const rozet = (d: string): string => (d === "hata" ? "✖ hata" : d === "uyarı" ? "⚠ uyarı" : "ℹ bilgi");
    const gercekToplam = s.turDokumu.reduce((t, r) => t + r.toplam, 0);
    const basilanSatir = s.akis.reduce((t, r) => t + r.tanilar.length, 0);
    const genislik = Math.max(...s.turDokumu.map((r) => String(r.toplam).length));
    const satirlar = s.turDokumu.map((r) =>
      `   ${String(r.toplam).padStart(genislik)} × ${r.kod} — ${r.dosyaSayisi} dosya · ${r.duzeyler.map(rozet).join(" + ")}`).join("\n");
    return `\n\n📊 TÜR DÖKÜMÜ — ${s.turDokumu.length} tanı türü · ${gercekToplam} GERÇEK bulgu (yukarıda ${basilanSatir} satır basıldı; aradaki fark özet satırlarına katlandı):\n${satirlar}\n   ℹ️ Bu sayılar tam sayımdır: özet satırlarının katladığı bulgular dâhildir. Tek tek görmek istersen denetimi \`--tam-liste\` ile koştur; tek bir türe bakmak istersen \`--tanı <kimlik>\` süzgecini kullan.`;
  };
  if (s.toplamHata + s.toplamUyari === 0) {
    if (acikSayi === 0) {
      console.log(`\n✅ Drift yok + tüm Adımlar tamamlandı — disk ${s.anaEtiket} ilanına uygun (kod=KANUN, klasör=ayna). Motor SUSTU (TAM-yeşil).${muafNotu}\n${karneSatiri}${turBloku()}`);
      return 0;
    }
    console.log(`\n🟡 Yapı temiz (drift yok) AMA iş bitmedi — motor susmuyor.${muafNotu}\n${karneSatiri}${acikBlok()}${turBloku()}`);
    return 0;
  }
  const riskli = [...s.dosyaTanilari.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
    .map(([d, n]) => `${d} (${n})`).join(" · ");
  console.log(`\n── ÖZET: ${s.toplamHata} hata · ${s.toplamUyari} uyarı ──${muafNotu}\n${karneSatiri}${riskli ? `\n🔥 En çok tanı: ${riskli}` : ""}${acikBlok()}${turBloku()}`);
  return s.cikis;
}

/** İki dize arasındaki Levenshtein düzenleme uzaklığı — bilinmeyen komut için en
 *  yakın öneriyi bulmakta kullanılır (CLI kapısı turu). */
function duzenlemeUzakligi(a: string, b: string): number {
  const satirlar = a.length + 1;
  const sutunlar = b.length + 1;
  const dp: number[][] = Array.from({ length: satirlar }, () => new Array<number>(sutunlar).fill(0));
  for (let i = 0; i < satirlar; i++) dp[i][0] = i;
  for (let j = 0; j < sutunlar; j++) dp[0][j] = j;
  for (let i = 1; i < satirlar; i++) {
    for (let j = 1; j < sutunlar; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

/** Bilinmeyen bir komuta en yakın tanınan komutu önerir; uzaklık makul değilse
 *  (yazım hatası gibi görünmüyorsa) undefined döner — uydurma öneri basılmaz. */
function enYakinKomut(girdi: string, adaylar: readonly string[]): string | undefined {
  let enIyi: string | undefined;
  let enKisaMesafe = Infinity;
  for (const aday of adaylar) {
    const mesafe = duzenlemeUzakligi(girdi, aday);
    if (mesafe < enKisaMesafe) { enKisaMesafe = mesafe; enIyi = aday; }
  }
  return enKisaMesafe <= Math.max(2, Math.ceil(girdi.length / 2)) ? enIyi : undefined;
}

/** `--help` · `-h` · `help` yüzeyi — otuz dört alt komutu gruplanmış biçimde,
 *  her birinin ne işe yaradığını tam cümleyle anlatır (CLI kapısı turu ·
 *  ölçülmüş kusur onarımı). Kanondan üretilmez; komut envanteri değiştiğinde
 *  elle güncellenir — YUZ-1.2 anlamında ikinci kaynak değil, dağıtıcının
 *  kendi yansımasıdır. */
function yardimMetni(): string {
  const grup = (baslik: string, satirlar: string[]): string =>
    `${baslik}\n` + satirlar.map((s) => `  ${s}`).join("\n");
  return [
    "🌀 SARMAL — komut satırı arayüzü. Kullanım: sarmal <komut> [argümanlar]",
    "",
    grup("🌱 DOĞUŞ VE ŞABLON", [
      "başla [tür]                                Kanonik şablon kütüphanesini listeler; tür verilirse o şablonun tam metnini basar.",
      "doğuş <hedef> [--tur proje|calisma-alani] Boş bir dizinde yeni proje ya da çalışma alanı doğurur; tür verilmezse sorar. Ek: --ad <ad> --proje <ilk-proje-adı>.",
    ]),
    "",
    grup("🌳 TEKİL DOSYA YÜZLERİ (Prizma — kaynak asla değişmez)", [
      "<dosya.sar> [--iskelet <hedef>]             Dosyayı ayrıştırır, ağacını ve drift tanılarını basar; --iskelet ile klasör/dosya iskeleti üretir.",
      "belge <dosya.sar> [--yaz <hedef.md>]        İnsan-okur Markdown yüzünü üretir.",
      "yansıt <dosya.sar> --json|--yaml|--xml      Makine/config/ajan yüzünü üretir (JSON · YAML · XML).",
      "agac <dosya.sar> [--kod] [--kok K] [...]    Klasör-ağacı çizimini basar (├──/└──).",
      "tema-md <dosya> [--dışa]                    DESIGN.md standardı ile Sarmal Tema kaynağı arasında dönüştürür.",
    ]),
    "",
    grup("🚦 PROJE GENELİ DENETİM", [
      "denetle <dizin> [--ana S] [--tam-liste]     Proje dizinini uçtan uca denetler: yapı, kural, DAG ve dayanak tanılarını tek raporda toplar (Kapı 2).",
      "kilitle <dizin>                             Dizindeki EBEDİ kuralları mühürler; mühür sonrası her dokunuş ebedi-ihlal hatası doğurur.",
      "yonerge-ikizi [kök] [--sahnelenmiş]         CLAUDE.md ile AGENTS.md yönerge ikizlerinin bayt özdeşliğini denetler.",
      "kok-yuzeyi [kök]                            Çalışma alanı kökündeki yüzey dosyalarının kod atıflarını denetler.",
    ]),
    "",
    grup("🧭 YAPI VE BAĞIMLILIK SORGULARI", [
      "graf [dizin] [--kok K]                      Kanonik graf yüzünü (düğüm + kenar + karne) JSON olarak basar.",
      "gezin <KOD> [dizin]                         Bir kodun tanımını ve tüm atıflarını dosya:satır:sütun olarak listeler.",
      "etki <KOD> [dizin]                          Bir düğüme dokunulursa hangi Adımların etkileneceğini topolojik sırada gösterir.",
      "sira <dizin>                                Bağımlılık zincirinden türetilen topolojik yürütme sırasını listeler.",
      "ray <dizin>                                 Bloklardan otomatik türetilen ray sırasını (Blok→ray) gösterir.",
      "sonraki <dizin>                             Şu anda koşulabilir Adımları listeler (ŞEF'in girdisi).",
      "omurga <dizin>                              Projenin akış omurgasında hangi durakta olduğunu canlı gösterir.",
    ]),
    "",
    grup("🎯 ŞEF VE ORKESTRASYON", [
      "sef <ADIM-KOD> [dizin]                      Bir Adımın konisinden bağlam-montajlı prompt ve token raporu üretir (dosya yazmaz).",
      "sef-dogrula <SÖZLEŞME-KOD> <çıktı.json>     Etmen çıktısını bir sözleşmeye vurar.",
      "sef-dongu <ADIM-KOD> [dizin] [bayraklar]    İzole üret→denetle→yama döngüsünü koşturur.",
      "sef-akis <ADIM1> <ADIM2> ... [dizin]        Çok adımlı ŞEF zincirini, kararı bir sonrakine devrederek koşturur.",
      "sef-paralel <ADIM1> <ADIM2> ... [dizin]     Bağımsız Adımları DAG'dan türetilen paralel kümelerde eşzamanlı koşturur.",
      "sef-arac-kanit [dizin] --gercek             Gerçek NVIDIA modeliyle canlı tool-round kanıtı üretir (token harcar).",
      "dongu-kos <DNG-KOD> [dizin] [--izle]        Bir Döngü tanımını el/koşul ya da olay/zaman kipinde koşturur.",
      "rbac [dizin]                                Etmen kadrosunu yetki kurallarına vurur.",
      "gateway [dizin]                             Etmenlerin mcpİzinleri beyanlarını denetler.",
      "lig <plan.sar> [--karar K] [--modeller ...] Planı çalgıcı-ligi modellerine sunar, uzlaşı sentezi döner.",
    ]),
    "",
    grup("🛠️ ÜRETİM VE BAKIM", [
      "belge-yuzleri-uret [dizin]                  Kalıcı yüzlerin (README, indeks) işaretli üretim bölgelerini kanondan tazeler.",
      "kanon-tutarlilik-uret [dizin]                Kanon sekizlisinden örnek, tanı eşlemesi ve kaynak mührü üretir.",
      "taksonomi-uret [dizin]                      kayit.json şemasından kayit.md makine-envanterini üretir.",
      "icindekiler <dosya.md>                      Bir Markdown dosyasının ### başlıklarından içindekiler bloğu üretir.",
    ]),
    "",
    grup("📖 BİLGİ", [
      "ogret [konu]                                Kanondan üretilen karşılama kartını basar.",
      "karne [dizin]                                Etmen karne raporunu (onaylı skala + kadro) basar.",
      "cevir <kelime>                               Bir kelimeyi i18n, stack ve terim sözlüklerinde arar.",
    ]),
    "",
    `MCP-YALNIZ ARAÇLAR — komut satırı karşılığı yoktur, yalnız Sarmal MCP sunucusundan çağrılır: ${MCP_ARACLARI.join(" · ")}`,
    "",
    "Çıkış kodu sözleşmesi: 0 temiz/yalnız-uyarı · 1 kullanım hatası · 2 söz dizim hatası · 4 drift (hata).",
  ].join("\n");
}

// ── `sira <dizin>` (ORK-3) — DAG'dan türetilmiş yürütme sırası ────────────────
//    Bağımlılık zinciri olan Adım'ları topolojik sırada + türetilmiş ardıllarıyla
//    listeler. Döngü varsa sıra üretilemez (döngüsel-bağımlılık → çıkış 4).
function siraKomutu(dizin: string): number {
  const { programlar, hatalar } = programlariYukle(dizin);
  if (hatalar.length) {
    console.error(`✖ ${hatalar.length} sözdizim hatası — önce düzelt (sarmal <dosya> ile bak).`);
    return 2;
  }
  const dag = dagKur(programlar);
  const donguTani = dagTanilari(dag);
  if (donguTani.length) {
    console.error(`✖ ${donguTani.length} düğüm bağımlılık döngüsünde — topolojik sıra üretilemez:`);
    for (const { dosya, tani } of donguTani) console.error(`  • ${tani.mesaj} (${dosya}:${tani.satir})`);
    return 4;
  }
  const { sira } = topolojikSira(dag);
  const zincirli = sira.filter((k) => {
    const d = dag.dugumler.get(k)!;
    return d.tip === "Adım" && (d.oncekiler.length > 0 || d.sonrakiler.length > 0);
  });
  console.log(`🔗 Bağımlılık güdümlü sıra — ${dag.dugumler.size} düğüm · ${zincirli.length} zincirli Adım\n`);
  let no = 1;
  for (const kod of zincirli) {
    const d = dag.dugumler.get(kod)!;
    const onc = d.oncekiler.length ? `  ← önce: [${d.oncekiler.join(", ")}]` : "";
    const ard = d.sonrakiler.length ? `  → sonra: [${d.sonrakiler.join(", ")}]` : "";
    console.log(`${String(no++).padStart(3)}. ${kod}${onc}${ard}`);
  }
  if (!zincirli.length) console.log("(hiçbir Adım'da bağımlı/besler kenarı yok — tüm işler bağımsız)");
  return 0;
}

// ── `sonraki <dizin>` — Adım-seçici CANLI ────────────────────────────────────
//    "Şimdi ne koşulabilir?" — bütün öncülleri tamamlanmış, açık (beklemede/
//    geliştirmede) Adımları topolojik sırada gösterir; geliştirmede olan (aktif
//    cephe · ORK-3.2) öne alınır. Deterministik MEKANİZMA (STR-3 AÇIK); HANGİSİNİN
//    seçileceği/kime atanacağı ZEKÂ'nın işidir (Apex, gizli). ŞEF bir sonraki
//    işi bu listenin başından alır.
function sonrakiKomutu(dizin: string): number {
  const { programlar, hatalar } = programlariYukle(dizin);
  if (hatalar.length) {
    console.error(`✖ ${hatalar.length} sözdizim hatası — önce düzelt (sarmal <dosya> ile bak).`);
    return 2;
  }
  const dag = dagKur(programlar);
  const donguTani = dagTanilari(dag);
  if (donguTani.length) {
    console.error(`✖ ${donguTani.length} düğüm bağımlılık döngüsünde — seçici güvenli sıra üretemez:`);
    for (const { dosya, tani } of donguTani) console.error(`  • ${tani.mesaj} (${dosya}:${tani.satir})`);
    return 4;
  }
  const hazir = secilebilirAdimlar(dag);
  if (!hazir.length) {
    console.log("🟢 Koşulabilir Adım yok — ray boşaldı ya da açık Adımların öncülleri henüz bitmedi (denetle motor-susmaz gündemini gösterir).");
    return 0;
  }
  const aktif = hazir.filter((a) => a.aktif).length;
  console.log(`🎯 Adım-seçici — ${hazir.length} koşulabilir Adım (🚧 ${aktif} aktif cephe · 🔵 ${hazir.length - aktif} hazır-bekleyen)\n`);
  let no = 1;
  for (const a of hazir) {
    const im = a.aktif ? "🚧" : "🔵";
    console.log(`${String(no++).padStart(3)}. ${im} ${a.kod} — ${a.ne || "(niyet yazılmamış)"}`);
    console.log(`      ${a.dosya}:${a.satir}`);
  }
  console.log(`\n▶ ŞEF girdisi: sıradaki = ${hazir[0].kod} (${hazir[0].aktif ? "aktif cephe — önce bunu bitir" : "hazır — öncülleri tamam"}). Hangisinin seçileceği ve kime atanacağı orkestrasyon zekâsının işidir.`);
  return 0;
}

// ── `ray <dizin>` (E1-A07) — Blok→ray OTOMATİK iniş ──────────────────────────
//    İlan edilen HER Blok, bağımlı DAG'ının topolojik sırasına elle-wire OLMADAN
//    iner; durumu Adımlardan türetilir. "Makine takip eder, insan wire etmez"
//    (Founder 2026-07-13 · anadizin-takip mekanizması · STR-3 AÇIK mekanizma).
function rayKomutu(dizin: string): number {
  const { programlar, hatalar } = programlariYukle(dizin);
  if (hatalar.length) {
    console.error(`✖ ${hatalar.length} sözdizim hatası — önce düzelt (sarmal <dosya> ile bak).`);
    return 2;
  }
  const dag = dagKur(programlar);
  const donguTani = dagTanilari(dag);
  if (donguTani.length) {
    console.error(`✖ ${donguTani.length} düğüm bağımlılık döngüsünde — ray sırası üretilemez:`);
    for (const { dosya, tani } of donguTani) console.error(`  • ${tani.mesaj} (${dosya}:${tani.satir})`);
    return 4;
  }
  const ray = blokRayi(programlar, dag);
  if (!ray.length) {
    console.log("🚂 Rayda Blok yok — henüz Blok ilan edilmemiş (anadizin/plan'da Blok açınca otomatik iner).");
    return 0;
  }
  const ikon = (d: string) => d === "tamamlandı" ? "🟢" : d === "geliştirmede" ? "🚧" : "🔵";
  const kalan = ray.filter((b) => b.durum !== "tamamlandı").length;
  console.log(`🚂 RAY — Blok→ray otomatik iniş (E1-A07) · ${ray.length} Blok · ${kalan} açık (elle-wire yok, DAG'dan türetildi)\n`);
  for (const b of ray) {
    const onc = b.oncekiler.length ? `  ← önce: [${b.oncekiler.join(", ")}]` : "";
    console.log(`${String(b.sira).padStart(3)}. ${ikon(b.durum)} ${b.kod} — ${b.ad}${onc}`);
    console.log(`      ${b.dosya}:${b.satir}`);
  }
  console.log(kalan ? `\n🚧 Motor susmaz: ${kalan} Blok tamamlanmayı bekliyor.` : `\n🟢 Tüm Bloklar tamamlandı — ray boşaldı, motor susar.`);
  return 0;
}

// ── `omurga <dizin>` — Akış omurgası CANLI (akis_omurgasi.sar'ın çalışan yüzü) ──
//    Projenin hangi durakta olduğunu DURUMDAN hesaplar + her durağın motora İŞLİ
//    bekçilerini gösterir. Harita (plan/akis_omurgasi.sar) betimler; bu komut YÜRÜTÜR.
function omurgaKomutu(dizin: string): number {
  const { programlar, hatalar } = programlariYukle(dizin);
  if (hatalar.length) {
    console.error(`✖ ${hatalar.length} sözdizim hatası — önce düzelt (sarmal <dosya> ile bak).`);
    return 2;
  }
  // Proje geneli düğüm-tipi varlığı (durak sinyalleri) + Adım durum sayımı.
  const tipVar = new Set<string>();
  const durumSay = new Map<string, number>();
  let koniDolu = 0, adimTop = 0;
  const gez = (n: Dugum): void => {
    if (n.tur === "widget") {
      tipVar.add(n.ad);
      if (n.ad === "Adım") {
        adimTop++;
        const al = (a: string) => [...n.parametreler, ...n.ozellikler].find((x) => x.ad === a)?.deger?.metin;
        const d = al("durum"); if (d) durumSay.set(d, (durumSay.get(d) ?? 0) + 1);
        if (al("görev") || al("kabul") || al("referans") || al("üretir")) koniDolu++;   // koni sinyali (herhangi koni alanı)
      }
    }
    for (const c of n.cocuklar) gez(c);
  };
  for (const p of programlar.values()) for (const b of p.bildirimler) gez(b);

  const has = (...t: string[]) => t.some((x) => tipVar.has(x));
  const anadizinVar = !!anadizinBul(dizin);
  const kodlanan = (durumSay.get("geliştirmede") ?? 0) + (durumSay.get("tamamlandı") ?? 0);
  const hepsiBitti = adimTop > 0 && durumSay.get("tamamlandı") === adimTop;

  // Durak durumları: ✅ geçildi · 🔄 aktif · ⬜ henüz · 👤 insan
  interface D { ikon: string; ad: string; durum: string; bekci: string }
  const dur = (kosul: boolean, aktif: boolean) => kosul ? "✅" : aktif ? "🔄" : "⬜";
  const dogus = anadizinVar && has("Teknoloji", "Takım");
  const yasa = has("Anayasa", "Kural", "GenelKural", "ÖzelKural", "Mekanizma");
  const iskelet = has("Blok") && has("Katman", "AltKatman") && has("Adım");
  const koni = adimTop > 0 && koniDolu === adimTop;
  const duraklar: D[] = [
    { ikon: dur(dogus, anadizinVar), ad: "🌱 DOĞUŞ", durum: dogus ? "kimlik+teknoloji ilanlı" : anadizinVar ? "anadizin var, Teknoloji/Takım eksik" : "anadizin yok", bekci: "ana-yok · rafsız-anadizin · anadizin-plan-karışması · doğuş-sırası · teknolojisiz-yüzey" },
    { ikon: dur(yasa, dogus), ad: "⚖️ YASA+MEKANİZMA", durum: yasa ? "yasa/mekanizma ilanlı" : "yasa henüz yok", bekci: "kural-ihlali · kural-çatışması · ebedi-ihlal · kapsam" },
    { ikon: dur(iskelet, yasa || dogus), ad: "🧱 İSKELET/DİKEY-DİLİM", durum: iskelet ? "tam-zincir plan var" : "plan iskeleti eksik", bekci: "silo-blok · kavuşumsuz-dilim · fazsız-blok · katmansız-adım · DAG · ray" },
    { ikon: dur(koni, iskelet), ad: "🎯 KONİ+KAVUŞUM", durum: adimTop ? `${koniDolu}/${adimTop} Adım koni-dolu` : "Adım yok", bekci: "konisiz-adım · öksüz-düğme · kavuşumsuz-ekran · yetim-meyve · çalışma-anı-konisi üretir ✓" },
    { ikon: "👤", ad: "🔒 OLGUNLUK KAPISI", durum: "İNSAN ONAYI — makine karışmaz", bekci: "olgunluk-onayı HATIRLATICI ✓ (B2=A · geçiş anında ateşler, kesmez)" },
    { ikon: dur(hepsiBitti, kodlanan > 0), ad: "⌨️ KODLA→ÇALIŞTIR→DÜZELT", durum: kodlanan ? `${kodlanan} Adım kodlanıyor/kodlandı` : "kodlama başlamadı", bekci: "ŞEF: üretici≠denetçi · kabulGate · AŞ-0..10 (hedef #13)" },
    { ikon: dur(hepsiBitti, kodlanan > 0), ad: "✅ DURUM", durum: `🟢 ${durumSay.get("tamamlandı") ?? 0} · 🚧 ${durumSay.get("geliştirmede") ?? 0} · 🔵 ${durumSay.get("beklemede") ?? 0}${(durumSay.get("doğrulanmamış") ?? 0) > 0 ? ` · 🟠 ${durumSay.get("doğrulanmamış")}` : ""}`, bekci: "açık-adım (MOTOR-SUSMAZ) · durum-tutarsızlığı · gayrimeşru-geçiş · faz-vade" },
  ];

  console.log(`🧭 AKIŞ OMURGASI — ${dizin} (harita: plan/akis_omurgasi.sar · her durağın bekçileri motora İŞLİ)\n`);
  console.log("  EVRE 1 · PLAN ──────────────────────────────────────────────");
  for (let i = 0; i < 5; i++) { const d = duraklar[i]; console.log(`  ${d.ikon} ${d.ad} — ${d.durum}\n      🛡️ ${d.bekci}`); }
  console.log("  EVRE 2 · KOD ───────────────────────────────────────────────");
  for (let i = 5; i < 7; i++) { const d = duraklar[i]; console.log(`  ${d.ikon} ${d.ad} — ${d.durum}\n      🛡️ ${d.bekci}`); }
  // Odak = sırayla ilk "✅ değil ve 👤 değil" durak (henüz geçilmemiş ilk kapı).
  const odak = duraklar.find((d) => d.ikon !== "✅" && d.ikon !== "👤");
  if (!anadizinVar) console.log("\n⬜ Henüz doğuş yok — `sarmal başla proje` ile başla (DOĞUŞ durağı).");
  else if (hepsiBitti && !odak) console.log("\n🟢 Tüm Adımlar tamamlandı — yolculuk bitti, motor susar (TAM-yeşil).");
  else if (odak) console.log(`\n👉 Şu an odak: ${odak.ad.replace(/^\S+ /, "")} — bir sonraki geçilecek durak.`);
  else console.log("\n🔒 Plan olgun görünüyor — OLGUNLUK KAPISI: insan onayıyla EVRE-2'ye geç.");
  return 0;
}

/** Proje kökündeki ebedi mührü okur (yoksa undefined — tüm ebediler mühürsüz sayılır). */

/**
 * EBEDİ kuralları mühürler (M-2 · PLN-6). Bilinçli + loglu işlem (FEL-4):
 * mühür sonrası ebedi kurala her dokunuş `ebedi-ihlal` HATASI verir;
 * yeniden mühürleme yalnız bu komutla (karar KARARLAR'a yazılmalı).
 */
function kilitleKomutu(dizin: string): number {
  // A08 (bug-avı C1): TEK ortak yükleyici (denetle ile DRY) — bilerek-hatalı
  // pragması artık tanınır: muaf+bozuk dosya mühürlemeyi KESMEZ (eskiden kendi
  // yükleyicisi pragmayı bilmiyordu, tek bozuk fikstür tüm kilitlemeyi çıkış-2
  // ile durduruyordu). Muaf-OLMAYAN sözdizim hatası kapıyı kapatmaya devam eder.
  const { programlar, muaflar, hatalar } = programlariYukle(dizin);
  if (hatalar.length) {
    const h = hatalar[0];
    console.error(`✖ ${h.etiket}:${h.satir}:${h.sutun} — ${h.mesaj}`);
    return 2;
  }
  if (muaflar.size) console.log(`ℹ ${muaflar.size} dosya bilerek-hatalı — parse edilenler envantere girer, bozuk olanlar mühürlemeyi kesmez.`);
  const env = ebediEnvanter(programlar);
  if (env.size === 0) {
    console.log("ℹ Mühürlenecek ebedi kural yok (ebedi: evet taşıyan Kural bulunamadı).");
    return 0;
  }
  const kilit: EbediKilit = {
    not: "EBEDİ kural mührü — 'sarmal kilitle <dizin>' üretir; ELLE DÜZENLENMEZ (FEL-4: değişiklik = bilinçli karar + KARARLAR kaydı + yeniden mühür).",
    muhurlenme: new Date().toISOString().slice(0, 10),
    kurallar: Object.fromEntries([...env.entries()].map(([kod, e]) => [kod, e.imza])),
  };
  writeFileSync(join(dizin, EBEDI_KILIT_ADI), JSON.stringify(kilit, null, 2).normalize("NFC") + "\n", "utf8");
  console.log(`🔏 ${env.size} ebedi kural mühürlendi → ${join(dizin, EBEDI_KILIT_ADI)}`);
  for (const [kod, e] of env) console.log(`   · ${kod}  (${e.dosya}:${e.satir})`);
  return 0;
}

/** Denetim tanılarını yazar (konumsuzlarda kaynak gösterilmez — mesaj yolu içerir). */
function raporla(kaynak: string, tanilar: Tani[]): void {
  if (tanilar.length === 0) return;
  const im = (d: string): string => (d === "hata" ? "✖" : d === "uyarı" ? "⚠" : "ℹ");
  for (const t of tanilar) {
    const konum = t.satir > 0 ? ` ${kaynak}:${t.satir}:${t.sutun}` : "";
    console.log(`${im(t.duzey)}${konum} [${t.kod}] ${t.mesaj}`);
    if (t.oneri) console.log(`   ↳ ${t.oneri}`);
  }
}

function tanilariYaz(yol: string, tanilar: Tani[]): void {
  if (tanilar.length === 0) {
    console.log("\n✅ Drift yok — ağaç Sınıflama'ya (SNF-0) uygun.");
    return;
  }
  const im = (d: string): string => (d === "hata" ? "✖" : d === "uyarı" ? "⚠" : "ℹ");
  console.log(`\n── DRİFT (${tanilar.length}) ──`);
  for (const t of tanilar) {
    console.log(`${im(t.duzey)} ${yol}:${t.satir}:${t.sutun} [${t.kod}] ${t.mesaj}`);
    if (t.oneri) console.log(`   ↳ ${t.oneri}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// arayuz-isareti-envanteri.test.ts — 🎨 ARAYÜZ İŞARETİ ENVANTERİ VE CIRCIR NÖBETİ
//                                     (VIT-KIMLIK-A07 · YUZ-4.2)
//
//   YUZ-4.2 HÜKMÜ ŞUDUR: kullanıcıya görünen her arayüz işareti kilitli vektörel
//   simge ailesinden gelir ve yüzey metinlerinde emoji arayüz işareti olarak
//   kullanılamaz. Yasağın DIŞINDA kalan iki alan madde metninde ayrı ayrı
//   sayılmıştır: birincisi KAYNAK ANLATIMIDIR, yani Adım ile Kural gövdelerindeki
//   niyet cümleleri ve dilin kendi emoji yazımı; ikincisi TAKDİR YÜZEYİDİR, yani
//   etmen davranışının insan diliyle takdir edildiği yer.
//
//   ── ÖLÇÜMÜN İKİ DÜZELTMESİ (2026-09-10 · bu turun kendi taraması) ─────────
//
//   ① ANAHTAR ÇAKIŞMASI ONARILDI. Envanter sahibi bugüne dek yalnız ÜYE ADIYLA
//      anahtarlanıyordu ve iki ayrı katalog aynı üye adını taşıdığında iki
//      yüzey tek satırda toplanıyordu: `bekliyorSus` hem Onaylar yüzeyinin
//      📬 dekoruydu hem takdir yüzeyinin ❤️ dekoru ve ikisi tek kalem
//      sayıldığı için Onaylar yüzeyinin işareti takdir muafiyetinin altına
//      saklanmıştı. Anahtar artık `KATALOG.üye` biçimindedir; iki yüzey iki
//      satırdır ve sınıfları ayrı ayrı yazılır.
//
//   ② "AÇIK BORÇ" SAYISI ŞİŞKİNDİ. Önceki tur kataloğun KAYNAK satırlarını
//      saydı ve emoji taşıyan her satırı borç yazdı. Oysa koni kartı ile
//      konuşma kartı metinleri basılmadan önce `aileyeCevir` süzgecinden geçer
//      (yolharitasi.ts): katalogdaki emoji orada bir ARAYÜZ İŞARETİ değil,
//      ARAYUZ_ISARETI çizelgesinin ANAHTARIDIR ve kullanıcı vektörel simgeyi
//      görür. Bu kalemler artık `çevrili` sınıfındadır; borç değildirler ve
//      kapanışları simge-cizelgesi.test.ts webview nöbetleriyle korunur.
//
//   ── ALTI SINIF ───────────────────────────────────────────────────────────
//   `takdir` · `yazım`   — YUZ-4.2'nin iki muafiyeti; hükmen meşrudur.
//   `çevrili`            — katalog satırı emojiyi yalnız çizelge ANAHTARI
//                          olarak taşır; basılan yüzey aileye çevrilir.
//   `günlük`             — çıktı kanalı ve konsol satırı; Adımın kendi üç
//                          sınıfındaki "geliştirici gözüne bakan iç kayıt".
//   `sınır`              — SINIR VAKASI: ipucu balonu, bildirim/durum çubuğu
//                          ve satır-içi dekor. Founder hükmü bekler (aşağıda).
//   `borç`               — kalan açık borç; YUZ-4.2 kapsamındadır.
//
//   ── SINIR VAKASI: FOUNDER HÜKMÜ BEKLER ───────────────────────────────────
//   Bir ipucu balonu ya da bir bildirim metni "arayüz işareti" midir, yoksa
//   dilin kendi yazımı mıdır? Bu nöbet bunu KENDİ KARARLAŞTIRMAZ ve o kalemlere
//   DOKUNMAZ. Sorunun kökü fiziktir: ARAYUZ_ISARETI çizelgesinin belgesi,
//   ailenin ulaşamadığı yüzeyleri (bildirim ve tanı iletisi düz metindir, durum
//   çubuğu yalnız codicon yazı tipi basar, ağaç öğesinin etiketi ve açıklaması
//   resim taşımaz) bilerek kapsam dışında bırakmış ve "oralardaki işaretin
//   akıbeti Founder kararıdır" diye yazmıştır. `sınır` sınıfı o beyanın
//   sayılabilir hâlidir; hüküm geldiğinde kalemler ya `borç` olur ya muaf.
//
//   ── BU NÖBET NE YAPAR VE NE YAPMAZ ───────────────────────────────────────
//   Borcu kapatmaz; borcun BÜYÜMESİNİ imkânsız kılar ve kapanışını görünür
//   kılar. Circir iki yönde de çalışır — yeni bir emoji eklenirse ya da bir
//   sahibin sayısı artarsa nöbet kırmızıya döner; sayı DÜŞERSE de kırmızıya
//   döner, çünkü ilerleme sessizce kaydedilirse envanter bayatlar ve bir
//   sonraki tur neyin kaldığını okuyamaz.
//
//   ERİŞİM ELLE SEÇİLMİŞ BİR LİSTE DEĞİLDİR. Tarama kataloğun TAMAMINI gezer;
//   elle seçilmiş bir liste, ertesi gün eklenen metni yeşilden geçirir ve
//   nöbetin adını yalanlar (bu deponun VIT-POSTA-A03 dersi). Yorumlar düşürülür,
//   çünkü ölçülen şey KULLANICIYA BASILAN metindir; kaynak anlatımı hükmen
//   meşrudur ve zaten yorum satırlarında yaşar.
//   Koşum: cd urun/eklenti && npm test
// ═══════════════════════════════════════════════════════════════════════════
import "./dil-kur.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const oku = (u: string): string => readFileSync(fileURLToPath(new URL(u, import.meta.url)), "utf8");
const EMOJI = /\p{Extended_Pictographic}/u;

type Sinif = "takdir" | "yazım" | "çevrili" | "günlük" | "sınır" | "borç";

/**
 * ENVANTER — sahip başına emoji taşıyan KOD satırı sayısı ve kalemin sınıfı.
 * Anahtar `KATALOG.üye` biçimindedir; katalog dışında yaşayan dışa-açık işlev
 * kendi adıyla anılır. Sınıfların anlamı dosya başlığındadır.
 */
const ENVANTER: Record<string, { adet: number; sinif: Sinif }> = {
  // ── TAKDİR YÜZEYİ (hükmen meşru · YUZ-4.2 ikinci muafiyet) ────────────────
  "TAKDIR_METINLERI.bekliyorSus": { adet: 1, sinif: "takdir" },
  "TAKDIR_METINLERI.bosDavetIpucu": { adet: 1, sinif: "takdir" },
  "TAKDIR_METINLERI.hasat": { adet: 1, sinif: "takdir" },
  "TAKDIR_METINLERI.hasatBos": { adet: 1, sinif: "takdir" },
  "TAKDIR_METINLERI.karsilama": { adet: 1, sinif: "takdir" },
  "TAKDIR_METINLERI.lensBasligi": { adet: 1, sinif: "takdir" },
  "TAKDIR_METINLERI.yerTutucu": { adet: 1, sinif: "takdir" },
  takdirKanallari: { adet: 4, sinif: "takdir" },
  // ── DİLİN KENDİ EMOJİ YAZIMI (hükmen meşru · YUZ-4.2 birinci muafiyet) ────
  emojiEsdegerDetayi: { adet: 1, sinif: "yazım" },
  emojiIpucuSatiri: { adet: 2, sinif: "yazım" },
  emojiYazimiIpucu: { adet: 2, sinif: "yazım" },
  tipTamamlamaDetayi: { adet: 8, sinif: "yazım" },
  // ── ÇEVRİLİ: emoji yalnız ARAYUZ_ISARETI anahtarıdır; yüzey vektörel basar ─
  //    Kapanışı simge-cizelgesi.test.ts'in webview nöbetleri korur: iki kartın
  //    bastığı metinlerde süzgeç sonrası emoji SIFIRDIR ve bu mutasyonla
  //    kanıtlanmıştır. Buradaki satırlar bu yüzden borç DEĞİLDİR.
  "YOL_METINLERI.alan": { adet: 4, sinif: "çevrili" },
  "YOL_METINLERI.bagimliDugumler": { adet: 1, sinif: "çevrili" },
  "YOL_METINLERI.bagliKurallar": { adet: 1, sinif: "çevrili" },
  "YOL_METINLERI.beceriler": { adet: 1, sinif: "çevrili" },
  "YOL_METINLERI.dogrudan": { adet: 1, sinif: "çevrili" },
  "YOL_METINLERI.dosyadaAc": { adet: 1, sinif: "çevrili" },
  "YOL_METINLERI.etkiledigiDugumler": { adet: 1, sinif: "çevrili" },
  "YOL_METINLERI.gecisli": { adet: 1, sinif: "çevrili" },
  "YOL_METINLERI.hamPrompt": { adet: 1, sinif: "çevrili" },
  "YOL_METINLERI.hamYanit": { adet: 1, sinif: "çevrili" },
  "YOL_METINLERI.konusmaOzeti": { adet: 1, sinif: "çevrili" },
  // ── GÜNLÜK: çıktı kanalı ve konsol — Adımın üçüncü sınıfı (iç kayıt) ──────
  "IZ_METINLERI.denetimCoktu": { adet: 1, sinif: "günlük" },
  "IZ_METINLERI.eklentiEtkin": { adet: 1, sinif: "günlük" },
  "IZ_METINLERI.izTuru": { adet: 2, sinif: "günlük" },
  "IZ_METINLERI.panelTuru": { adet: 2, sinif: "günlük" },
  "IZ_METINLERI.performansTuru": { adet: 2, sinif: "günlük" },
  "IZ_METINLERI.turCoktu": { adet: 2, sinif: "günlük" },
  "IZ_METINLERI.yavasGenisletme": { adet: 2, sinif: "günlük" },
  // ── SINIR VAKASI · İPUCU BALONU (hover markdown) ──────────────────────────
  "IPUCU_BELGE_METINLERI.acilis": { adet: 2, sinif: "sınır" },
  "IPUCU_BELGE_METINLERI.kapanis": { adet: 2, sinif: "sınır" },
  "IPUCU_SOZCE_METINLERI.akisOku": { adet: 2, sinif: "sınır" },
  "IPUCU_SOZCE_METINLERI.i18n": { adet: 2, sinif: "sınır" },
  "IPUCU_SOZCE_METINLERI.islec": { adet: 2, sinif: "sınır" },
  "YILDIZ_METINLERI.ipucu": { adet: 2, sinif: "sınır" },
  "YOL_METINLERI.aktifIpucu": { adet: 1, sinif: "sınır" },
  "YOL_METINLERI.blokluAlt": { adet: 1, sinif: "sınır" },
  "YOL_METINLERI.planlanmamis": { adet: 1, sinif: "sınır" },
  "YOL_METINLERI.tarife": { adet: 1, sinif: "sınır" },
  "YOL_METINLERI.varlikIpucu": { adet: 1, sinif: "sınır" },
  anahtarIpucu: { adet: 1, sinif: "sınır" },
  bolumEtiketiIpucu: { adet: 4, sinif: "sınır" },
  caprazBakisIpucu: { adet: 2, sinif: "sınır" },
  ipucuIslecMetni: { adet: 2, sinif: "sınır" },
  kararMetniIpucuEki: { adet: 2, sinif: "sınır" },
  kenarIpucu: { adet: 2, sinif: "sınır" },
  parametreIpucu: { adet: 2, sinif: "sınır" },
  tipIpucuMetni: { adet: 5, sinif: "sınır" },
  varsayilanlarIpucu: { adet: 2, sinif: "sınır" },
  yetkiIpucu: { adet: 2, sinif: "sınır" },
  // ── SINIR VAKASI · BİLDİRİM VE DURUM ÇUBUĞU ───────────────────────────────
  "EKLENTI_KABUK_METINLERI.eskiKopyaSaltOkunur": { adet: 2, sinif: "sınır" },
  "EKLENTI_KABUK_METINLERI.giydirKlasorGerekli": { adet: 2, sinif: "sınır" },
  "EKLENTI_KABUK_METINLERI.giydirildi": { adet: 2, sinif: "sınır" },
  "GIYDIR_METINLERI.soru": { adet: 1, sinif: "sınır" },
  "YOL_METINLERI.geriAlma": { adet: 1, sinif: "sınır" },
  "YOL_METINLERI.yasakGecis": { adet: 1, sinif: "sınır" },
  iskeletKuruldu: { adet: 2, sinif: "sınır" },
  panelOdakMesaji: { adet: 1, sinif: "sınır" },
  // ── SINIR VAKASI · SATIR-İÇİ DEKOR (after.contentText) ────────────────────
  "ONAY_YUZEY_METINLERI.bekliyorSus": { adet: 1, sinif: "sınır" },
  "YILDIZ_METINLERI.terfiBekliyor": { adet: 1, sinif: "sınır" },
  "YILDIZ_METINLERI.uyari": { adet: 1, sinif: "sınır" },
  // ── AÇIK BORÇ: BUGÜN BOŞ ──────────────────────────────────────────────────
  //    Son üç yüzey bu turda kapandı: kod eylemi (⌘.) başlıkları, hızlı seçim
  //    yer tutucusu ve tamamlama ayrıntısı. Üçünde de VS Code metnin yanına
  //    resim çizmez, dolayısıyla kapanış işareti KALDIRMAK demekti (YUZ-4.2:
  //    ikon metinsel etiketin yerine geçemez, düştüğünde etiket tek başına
  //    yeter). Hane bilerek BOŞ bırakıldı ve silinmedi: yeni bir borç doğduğunda
  //    yeri hazırdır ve sınıfın kendisi kaybolmadığı için sayaç susmaz.
};

/**
 * Kataloğun TAMAMINI gezer ve emoji taşıyan kod satırlarını sahibine yazar.
 * Yorum ve blok yorum satırları düşürülür: ölçülen şey kullanıcıya BASILAN
 * metindir, yorumdaki emoji ise kaynak anlatımıdır ve hükmen meşrudur.
 *
 * Anahtar `KATALOG.üye` biçimindedir. Kapsayıcı, satır başında duran dışa-açık
 * bildirimden okunur; üye ise onun içindeki alan adıdır. İkisi aynıysa (katalog
 * dışında yaşayan dışa-açık bir işlev) anahtar tek addır. Bu ayrım şart: iki
 * katalog aynı üye adını taşıdığında tek anahtar iki yüzeyi birleştirir ve
 * birinin sınıfı ötekinin altına saklanır (bu dosyanın ① düzeltmesi).
 */
function envanteriOlc(): Map<string, number> {
  const ham = oku("../src/yuzey-metinleri.ts").split("\n");
  const sayim = new Map<string, number>();
  let blokYorum = false;
  let sahip = "(dosya başı)";
  let kapsayici = "(dosya başı)";
  for (const satir of ham) {
    const kirp = satir.trim();
    if (blokYorum) { if (kirp.includes("*/")) blokYorum = false; continue; }
    if (kirp.startsWith("/*")) { if (!kirp.includes("*/")) blokYorum = true; continue; }
    if (kirp.startsWith("//") || kirp.startsWith("*")) continue;
    const ust = /^export (?:function|const) (\w+)/.exec(satir)?.[1];
    if (ust) kapsayici = ust;
    const ad = /export (?:function|const) (\w+)/.exec(satir)?.[1]
      ?? /^\s*get (\w+)\s*\(/.exec(satir)?.[1]
      ?? /^\s*(\w+):\s*\(/.exec(satir)?.[1];
    if (ad) sahip = ad;
    if (EMOJI.test(satir.split("//")[0])) {
      const anahtar = kapsayici === sahip ? sahip : `${kapsayici}.${sahip}`;
      sayim.set(anahtar, (sayim.get(anahtar) ?? 0) + 1);
    }
  }
  return sayim;
}

test("ENVANTER ERİŞİMİ: tarama kataloğun tamamını gezer ve boş küme üstünde koşmaz", () => {
  const olculen = envanteriOlc();
  assert.ok(olculen.size > 50,
    `envanter beklenmedik biçimde küçük (${olculen.size} sahip); tarama kataloğu gezmiyor olabilir`);
});

test("ENVANTER ANAHTARI: sahip adı KATALOĞUYLA birlikte anılır — iki yüzey tek satıra düşemez", () => {
  const olculen = envanteriOlc();
  // Ölçülmüş çakışma: `bekliyorSus` hem Onaylar hem takdir yüzeyinde yaşar ve
  // ikisinin sınıfı AYRIDIR. Anahtar kataloğu taşımazsa biri ötekinin
  // muafiyetine saklanır; nöbet bu yüzden ayrımın kendisini ölçer.
  for (const anahtar of ["ONAY_YUZEY_METINLERI.bekliyorSus", "TAKDIR_METINLERI.bekliyorSus"]) {
    assert.ok(olculen.has(anahtar),
      `${anahtar} ölçümde yok — anahtar kataloğu yitirmiş, çakışan üye adları yeniden birleşir`);
  }
  assert.equal(olculen.get("bekliyorSus"), undefined,
    "kataloğu olmayan çıplak 'bekliyorSus' anahtarı doğdu — iki yüzey yine tek satırda toplanıyor");
});

test("CIRCIR: hiçbir metin sahibine YENİ emoji eklenmedi ve hiçbir sayı ARTMADI", () => {
  const olculen = envanteriOlc();
  const yeniler: string[] = [];
  const artanlar: string[] = [];
  for (const [sahip, adet] of olculen) {
    const kayitli = ENVANTER[sahip];
    if (!kayitli) { yeniler.push(`${sahip} (${adet})`); continue; }
    if (adet > kayitli.adet) artanlar.push(`${sahip}: ${kayitli.adet} → ${adet}`);
  }
  assert.deepEqual(yeniler, [] as string[],
    "Bu metin sahiplerine emoji GİRDİ ve envanterde karşılıkları yok: " + yeniler.join(", ") +
    " — YUZ-4.2 kullanıcıya görünen yüzeylerde emojiyi arayüz işareti olarak yasaklar. " +
    "İşareti kilitli vektörel aileden (simge-cizelgesi.ts) al; metin yalnız kelimeyi taşısın.");
  assert.deepEqual(artanlar, [] as string[],
    "Bu sahiplerde emoji sayısı ARTTI: " + artanlar.join(", ") +
    " — borç büyüyemez; yeni işaret vektörel aileden gelir.");
});

test("CIRCIR: kapanan borç envantere İŞLENİR — ilerleme sessiz kalamaz", () => {
  const olculen = envanteriOlc();
  const azalanlar: string[] = [];
  const kaybolanlar: string[] = [];
  for (const [sahip, kayitli] of Object.entries(ENVANTER)) {
    const adet = olculen.get(sahip);
    if (adet === undefined) { kaybolanlar.push(sahip); continue; }
    if (adet < kayitli.adet) azalanlar.push(`${sahip}: ${kayitli.adet} → ${adet}`);
  }
  const mesaj = "Envanter GERÇEKTEN İYİYE gitti fakat kayıt güncellenmedi. " +
    "Bu bir kusur değil, kayıt borcudur: sayıyı burada düşür (ya da sahibi listeden çıkar) ki " +
    "bir sonraki tur neyin kaldığını okuyabilsin.";
  assert.deepEqual(azalanlar, [] as string[], "AZALAN: " + azalanlar.join(", ") + " — " + mesaj);
  assert.deepEqual(kaybolanlar, [] as string[], "KAYBOLAN: " + kaybolanlar.join(", ") + " — " + mesaj);
});

test("ENVANTER: her sınıf AYRI sayılır ve açık borç muafiyetin altına saklanamaz", (t) => {
  const toplam: Record<Sinif, number> = { takdir: 0, yazım: 0, çevrili: 0, günlük: 0, sınır: 0, borç: 0 };
  for (const kayitli of Object.values(ENVANTER)) toplam[kayitli.sinif] += kayitli.adet;
  // Sayı bir iddia değil, ÖLÇÜMDÜR ve gizlenmez (YUZ-3.1: hiçbir yüzey bir
  // tanıyı gizleyemez). VIT-KIMLIK-A07'nin üçüncü kabul ölçütü ancak `borç`
  // SIFIRA indiğinde ve `sınır` hükme bağlandığında karşılanır.
  t.diagnostic(`VIT-KIMLIK-A07 · açık borç: ${toplam.borç} · sınır vakası (Founder hükmü bekler): ${toplam.sınır}`);
  t.diagnostic(`hükmen muaf: takdir ${toplam.takdir} · dilin yazımı ${toplam.yazım} · aileye çevrili ${toplam.çevrili} · günlük ${toplam.günlük}`);
  const olculenToplam = [...envanteriOlc().values()].reduce((a, b) => a + b, 0);
  const kayitliToplam = Object.values(toplam).reduce((a, b) => a + b, 0);
  assert.equal(kayitliToplam, olculenToplam,
    `envanterin sınıf toplamı (${kayitliToplam}) ölçülen satır sayısından (${olculenToplam}) ayrı — ` +
    "bir kalem sınıfsız kalmış ya da iki kez sayılmış");
});

// ═══════════════════════════════════════════════════════════════════════════
// KAPANAN YÜZEYLER GERİ AÇILAMAZ
//
//   Bu turda kapanan yüzeyler ailenin FİZİKSEL olarak ulaştığı yerlerdir:
//   webview sekmesinin ikon yuvası, webview gövdesine gömülen SVG ve satırın
//   kendi `iconPath`i. Aşağıdaki nöbetler hem metnin emojisiz kaldığını hem de
//   işaretin GERÇEKTEN aileye bağlandığını ölçer — yalnız emojiyi silmek,
//   işareti sessizce kaybetmek olurdu.
// ═══════════════════════════════════════════════════════════════════════════

test("KAPANDI: iki webview sekmesinin başlığı emojisiz, işareti sekmenin ikon yuvasında", async () => {
  const { YOL_METINLERI } = await import("../src/yuzey-metinleri.ts");
  for (const [ad, metin] of [
    ["koni kartı başlığı", YOL_METINLERI.kartBasligi("VIT-KIMLIK-A07")],
    ["konuşma kartı başlığı", YOL_METINLERI.konusmaBasligi("üretici", "VIT-KIMLIK-A07")],
  ] as const) {
    assert.ok(!EMOJI.test(metin), `${ad} hâlâ emoji taşıyor: ${metin}`);
    assert.ok(metin.includes("VIT-KIMLIK-A07"), `${ad} metinsel etiketini yitirmiş — ikon etiketi İKAME EDEMEZ`);
  }
  const kaynak = oku("../src/yolharitasi.ts");
  assert.ok(/acikKart\.iconPath\s*=\s*satirIkonu\(context\.extensionUri,\s*"kart"\)/.test(kaynak),
    "koni kartı sekmesi ailenin 'kart' simgesini takmıyor — emoji silindi, yerine işaret KONMADI");
  assert.ok(/panel\.iconPath\s*=\s*satirIkonu\(context\.extensionUri,\s*"kosum"\)/.test(kaynak),
    "konuşma kartı sekmesi ailenin 'kosum' simgesini takmıyor — emoji silindi, yerine işaret KONMADI");
});

test("KAPANDI: okuma modu başlığı ile hata kutusu işaretini gömülü aile SVG'sinden alır", async () => {
  const { ONIZLEME_METINLERI } = await import("../src/yuzey-metinleri.ts");
  assert.ok(!EMOJI.test(ONIZLEME_METINLERI.agacBasligi),
    `okuma modu yapı başlığı hâlâ emoji taşıyor: ${ONIZLEME_METINLERI.agacBasligi}`);
  const kaynak = oku("../src/onizleme.ts");
  assert.ok(kaynak.includes('aileIsareti("agac")'),
    "okuma modu yapı başlığı aileye bağlanmamış — işaret sessizce kayboldu");
  assert.ok(kaynak.includes('aileIsareti("uyari")'),
    "okuma modu hata kutusu aileye bağlanmamış — ⚠️ silindiyse yerine aile işareti gelmeli");
  assert.ok(!EMOJI.test(kaynak.split("\n").filter((s) => s.includes("sarmal-hata")).join("\n")),
    "okuma modunun hata kutusu satırlarında hâlâ emoji var");
  assert.ok(kaynak.includes("satirSvgGovdesi"),
    "okuma modu gömülü SVG'yi tek kaynaktan (simge-cizelgesi) almıyor; ikinci bir çizim yolu doğar");
});

test("KAPANDI: kod eylemi · hızlı seçim · tamamlama ayrıntısı — çizilemeyen yerde işaret DÜŞER", async () => {
  const { DUZELTME_METINLERI, TAMAMLAMA_METINLERI, YOL_METINLERI, alaniMaddeleBasligi, onerilenYazimaDuzelt, ifadePaletiDetayi } =
    await import("../src/yuzey-metinleri.ts");
  // Bu üç yüzeyde VS Code metnin yanına resim çizmez: kod eylemi (⌘.) menüsünün
  // satırı, hızlı seçimin yer tutucusu ve tamamlama listesinin ayrıntı sütunu
  // düz metindir. YUZ-4.2 işaretin kilitli aileden gelmesini şart koşar; aile
  // ulaşamıyorsa işaret düşer ve KELİME kalır — ikon zaten etiketi İKAME ETMEZ.
  for (const [ad, metin] of [
    ["beceri terfisi", DUZELTME_METINLERI.beceriTerfisi],
    ["tabloyu hizala", DUZELTME_METINLERI.tabloyuHizala],
    ["uzun niyeti katla", DUZELTME_METINLERI.uzunNiyetiKatla],
    ["koşuya başla", DUZELTME_METINLERI.kosuyaBasla],
    ["adımı tamamla", DUZELTME_METINLERI.adimiTamamla],
    ["karar özeti ekle", DUZELTME_METINLERI.kararOzetiEkle],
    ["alanı maddele", alaniMaddeleBasligi("görev")],
    ["önerilen yazıma düzelt", onerilenYazimaDuzelt("Adım")],
    ["tipografi rolü", TAMAMLAMA_METINLERI.tipografiRolu],
    ["ifade paleti", ifadePaletiDetayi("kademe")],
    ["ray seç", YOL_METINLERI.raySec],
  ] as const) {
    assert.ok(!EMOJI.test(metin), `${ad} hâlâ emoji taşıyor: ${metin}`);
    assert.ok(metin.trim().length > 3, `${ad} işaretle birlikte metnini de yitirmiş: "${metin}"`);
  }
});

test("KAPANDI: ağaç satırlarının etiketi işareti İKİ KEZ söylemez", async () => {
  const { YOL_METINLERI } = await import("../src/yuzey-metinleri.ts");
  // Bu beş metin, satırın KENDİ iconPath'inin zaten çizdiği işareti ikinci kez
  // emojiyle yazıyordu (uyarı satırı `simge:"uyari"` taşır, aktif varlık satırı
  // vurgu rengine döner, geliştirmedeki Adım sarı ikonludur). Kopya düştü;
  // işaret satırın ikon yuvasında yaşamaya devam eder.
  for (const [ad, metin] of [
    ["kırık dosya", YOL_METINLERI.kirikDosya(3)],
    ["okunamayan dosya", YOL_METINLERI.okunamayanDosya(2)],
    ["küme açıklaması", YOL_METINLERI.kumeAciklama(4)],
    ["aktif varlık açıklaması", YOL_METINLERI.aktifAciklama("[2/5]")],
    ["geliştiriliyor", YOL_METINLERI.gelistiriliyor],
  ] as const) {
    assert.ok(!EMOJI.test(metin), `${ad} hâlâ emoji taşıyor: ${metin}`);
    assert.ok(metin.trim().length > 0, `${ad} metinsel etiketini tümden yitirmiş`);
  }
  const kaynak = oku("../src/yolharitasi.ts");
  assert.ok(!/nedenAktif = n \? `🟡/.test(kaynak),
    "aktif Adım açıklaması hâlâ 🟡 basıyor — satırın ikon rengi bunu zaten söyler");
  assert.ok(!EMOJI.test(oku("../src/minigraf-cekirdek.ts").split("\n")
    .filter((s) => s.includes("class=\"k\"")).join("\n")),
    "mini grafın boş hâli hâlâ emoji basıyor");
});

// ═══════════════════════════════════════════════════════════════════════════
// MANİFEST, REHBER VE PARÇACIK YÜZEYLERİ (VIT-KIMLIK-A07 · 2026-09-13)
//
//   Yukarıdaki envanter yalnız metin kataloğunu (yuzey-metinleri.ts) gezer.
//   Kullanıcıya basılan metnin bir bölümü ise eklentinin MANİFESTİNDE yaşar:
//   komut paletinin ve menülerin komut başlıkları, Ayarlar sayfasının
//   açıklamaları, karşılama rehberinin adım başlıkları ve sayfaları, anlamsal
//   simge açıklaması, ürün ikon temasının adı ve tamamlama listesine düşen
//   parçacık açıklamaları. 2026-09-13 ölçümüne dek bu yüzeylerin hiçbiri bir
//   nöbete bağlı değildi ve yerelleştirme dosyalarındaki 92 dizenin 21'i emoji
//   taşıyordu. On dördü arayüz işaretiydi ve kalktı: bu yüzeyler düz metin
//   basar, aile oraya ulaşamaz, dolayısıyla işaret düşer ve kelime kalır
//   (YUZ-4.2: ikon metinsel etiketin yerine geçemez, düştüğünde etiket tek
//   başına yeter). Kalan yedisi takdir yüzeyinin komutlarıdır ve hükmen meşrudur.
//
//   ÖLÇÜ EMOJİ SUNUMUDUR. Bu yüzeylerdeki metin, okuma modunun kanonik adında
//   geçen `↔` gibi tipografik okları da taşır. Bu oklar Unicode'un resimsi
//   sınıfındadır fakat varsayılan sunumları METİNDİR ve emoji olarak çizilmez.
//   Ölçü bu yüzden yalnız emoji olarak basılan işareti sayar: kendiliğinden
//   emoji sunumlu karakteri ya da emoji seçicisiyle (VS16) biten resimsi
//   karakteri.
// ═══════════════════════════════════════════════════════════════════════════

const EMOJI_SUNUMU = /\p{Emoji_Presentation}|\p{Extended_Pictographic}\uFE0F/u;

/** Yerelleştirme dizelerinde emoji taşımasına izin verilen anahtarlar. İki dil
 *  dosyası AYNI kümeyi taşır; küme dışında emoji belirirse süit kırmızıya döner,
 *  kümedeki bir kalem emojisini yitirirse de kırmızıya döner (kayıt borcu). */
const MANIFEST_ENVANTERI: Readonly<Record<string, Sinif>> = {
  // TAKDİR YÜZEYİ: yorum dizisinin satır-içi kanal düğmeleri (package.json
  // `comments/commentThread/context`) ile takdir ve hasat komutları. Kanal
  // adları takdirKanallari çizelgesinin dört kanalıdır ve katalogda da
  // `takdir` sınıfındadır; iki yüzey aynı kanalı aynı işaretle söyler.
  "command.writeAppreciation": "takdir",
  "command.writeFeedback": "takdir",
  "command.harvestFeedback": "takdir",
  "command.sendThanks": "takdir",
  "command.sendAppreciation": "takdir",
  "command.sendHonor": "takdir",
  "command.sendSuggestion": "takdir",
};

/** Parçacık açıklamalarının emoji taşıyan kalemleri. Tamamlama listesinde tip
 *  adına eklenen tip emojisidir ve katalogdaki `tipTamamlamaDetayi` emsaliyle
 *  aynı `yazım` sınıfındadır. Dördünden üçünün emojisi (Faz, Katman, Adım)
 *  bugün kanonun tip emoji çizelgesiyle çelişir; bu bir arayüz işareti kusuru
 *  değil içerik kaymasıdır ve bu Adımın kapsamı dışında ayrı borç olarak
 *  raporlanmıştır. Nöbet sayıyı sabitler; kayma onarıldığında da yeşil kalır. */
const PARCACIK_ENVANTERI: Readonly<Record<string, Sinif>> = {
  Blok: "yazım", Faz: "yazım", Katman: "yazım", Adım: "yazım",
};

const dizinOku = (u: string): string[] => readdirSync(fileURLToPath(new URL(u, import.meta.url)));

test("MANİFEST: iki yerelleştirme dosyasının emoji taşıyan anahtar kümesi envanterle BİREBİRDİR", () => {
  const beklenen = Object.keys(MANIFEST_ENVANTERI).sort();
  for (const dosya of ["package.nls.json", "package.nls.tr.json"]) {
    const nls = JSON.parse(oku(`../${dosya}`)) as Record<string, string>;
    const anahtarlar = Object.keys(nls);
    assert.ok(anahtarlar.length > 80,
      `${dosya} beklenmedik biçimde küçük (${anahtarlar.length} anahtar); tarama dosyayı gezmiyor olabilir`);
    const emojili = anahtarlar.filter((a) => EMOJI_SUNUMU.test(nls[a] ?? "")).sort();
    const yeniler = emojili.filter((a) => !(a in MANIFEST_ENVANTERI));
    const kayiplar = beklenen.filter((a) => !emojili.includes(a));
    assert.deepEqual(yeniler, [] as string[],
      `${dosya}: bu manifest dizelerine emoji GİRDİ: ${yeniler.join(", ")} — YUZ-4.2 kullanıcıya ` +
      "görünen yüzeylerde emojiyi arayüz işareti olarak yasaklar. Komut başlığı, ayar açıklaması " +
      "ve rehber başlığı düz metindir; aile oraya ulaşamaz, işaret düşer ve kelime kalır.");
    assert.deepEqual(kayiplar, [] as string[],
      `${dosya}: envanterdeki ${kayiplar.join(", ")} artık emoji taşımıyor — bu bir kusur değil ` +
      "kayıt borcudur; kalemi MANIFEST_ENVANTERI'nden düşür ki sonraki tur neyin kaldığını okuyabilsin.");
  }
});

test("MANİFEST: package.json'un doğrudan dizeleri ve karşılama rehberinin sayfaları emojisizdir", () => {
  const bulgular: string[] = [];
  const gez = (deger: unknown, yol: string): void => {
    if (typeof deger === "string") { if (EMOJI_SUNUMU.test(deger)) bulgular.push(`package.json${yol}`); return; }
    if (deger && typeof deger === "object") for (const [k, v] of Object.entries(deger)) gez(v, `${yol}.${k}`);
  };
  gez(JSON.parse(oku("../package.json")), "");
  const rehber = dizinOku("../medya/rehber/").filter((f) => f.endsWith(".md"));
  assert.ok(rehber.length >= 6, `karşılama rehberinin sayfaları bulunamadı (${rehber.length}); tarama boş küme üstünde koşuyor`);
  for (const f of rehber) if (EMOJI_SUNUMU.test(oku(`../medya/rehber/${f}`))) bulgular.push(`medya/rehber/${f}`);
  assert.deepEqual(bulgular, [] as string[],
    "Bu manifest yüzeylerinde emoji var: " + bulgular.join(", ") +
    " — YUZ-4.2: kullanıcıya görünen metinde işaret kilitli vektörel aileden gelir ya da düşer.");
});

test("PARÇACIK: tamamlama listesine düşen parçacık metinlerinde emoji yalnız envanterdeki kalemlerdedir", () => {
  const dosyalar = dizinOku("../snippets/").filter((f) => f.endsWith(".code-snippets"));
  assert.ok(dosyalar.length > 0, "parçacık dosyası bulunamadı; tarama boş küme üstünde koşuyor");
  const bulunan: string[] = [];
  let toplam = 0;
  for (const f of dosyalar) {
    const parcaciklar = JSON.parse(oku(`../snippets/${f}`)) as Record<string, { prefix?: string | string[]; description?: string }>;
    for (const [ad, p] of Object.entries(parcaciklar)) {
      toplam++;
      if (EMOJI_SUNUMU.test([p.prefix ?? ""].flat().join(" "))) bulunan.push(`${ad}.prefix`);
      if (EMOJI_SUNUMU.test(p.description ?? "")) bulunan.push(ad);
    }
  }
  assert.ok(toplam > 5, `parçacık sayısı beklenmedik biçimde küçük (${toplam})`);
  assert.deepEqual(bulunan.sort(), Object.keys(PARCACIK_ENVANTERI).sort(),
    "Parçacık metinlerinde emoji taşıyan kalem kümesi envanterden ayrıştı — yeni bir emoji girdiyse " +
    "YUZ-4.2 onu yasaklar; bir kalem emojisini yitirdiyse PARCACIK_ENVANTERI'nden düşür.");
});

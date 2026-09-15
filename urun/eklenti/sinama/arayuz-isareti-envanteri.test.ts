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
//      satırdır ve sınıfları ayrı ayrı yazılır. Onaylar notu Founder sade
//      hâli, 2026-09-13 ile emojisiz kaldığı için ayrım bugün gerçek kataloğun
//      bir mutantıyla ölçülür: nota emoji geri konur ve kalemin Onaylar
//      kataloğuna yazıldığı görülür.
//
//   ② "AÇIK BORÇ" SAYISI ŞİŞKİNDİ. Önceki tur kataloğun KAYNAK satırlarını
//      saydı ve emoji taşıyan her satırı borç yazdı. Oysa koni kartı ile
//      konuşma kartı metinleri basılmadan önce `aileyeCevir` süzgecinden geçer
//      (yolharitasi.ts): katalogdaki emoji orada bir ARAYÜZ İŞARETİ değil,
//      ARAYUZ_ISARETI çizelgesinin ANAHTARIDIR ve kullanıcı vektörel simgeyi
//      görür. Bu kalemler artık `çevrili` sınıfındadır; borç değildirler ve
//      kapanışları simge-cizelgesi.test.ts webview nöbetleriyle korunur.
//
//   ── BEŞ SINIF ────────────────────────────────────────────────────────────
//   `takdir` · `yazım`   — YUZ-4.2'nin iki muafiyeti; hükmen meşrudur.
//   `çevrili`            — katalog satırı emojiyi yalnız çizelge ANAHTARI
//                          olarak taşır; basılan yüzey aileye çevrilir.
//   `günlük`             — çıktı kanalı ve konsol satırı; Adımın kendi üç
//                          sınıfındaki "geliştirici gözüne bakan iç kayıt".
//   `borç`               — açık borç; YUZ-4.2 kapsamındadır. Founder sade
//                          hâli, 2026-09-13 ile SIFIRA indi ve öyle kalır.
//
//   ── SINIR VAKASI KAPANDI (Founder sade hâli, 2026-09-13) ──────────────────
//   Bildirim ile durum çubuğu 2026-09-10'dan beri `sınır` sınıfındaydı, çünkü
//   kontrolcünün yüzeyin fiziksel yeteneğine dayanan muafiyeti YUZ-4.2'nin
//   lafzıyla çatışıyordu. Founder'ın sade hâli kararı çatışmayı kanon lafzına
//   dokunmadan çözdü: eldeki simgelerle çizilebilen yerde işaret aileden gelir,
//   çizilemeyen yerde işaret düşer ve yalnız kelime kalır. Bildirim kutusu ile
//   durum çubuğu iletisi eklentinin görselini taşımaz; oradaki emoji kalktı ve
//   kelime kaldı. Durum çubuğu öğelerinin VS Code codicon'ları emoji değildir
//   ve bu kararın dışındadır. Eski `borç` kalemleri olan satır sonu notları
//   simgeyi dekorun görsel ekinden, raftaki kapı, terfi ve uyarı simgelerinin
//   üretilmiş varyantlarıyla çizer ve kelime yanında kalır. `sınır` sınıfı bu
//   yüzden kalktı ve `borç` sınıfında kalem kalmadı.
//
//   ── BU NÖBET NE YAPAR VE NE YAPMAZ ───────────────────────────────────────
//   Borç sıfırdır; nöbet onun yeniden doğmasını imkânsız kılar ve her
//   değişikliği görünür kılar. Circir iki yönde de çalışır — yeni bir emoji eklenirse ya da bir
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
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const oku = (u: string): string => readFileSync(fileURLToPath(new URL(u, import.meta.url)), "utf8");
const EMOJI = /\p{Extended_Pictographic}/u;

type Sinif = "takdir" | "yazım" | "çevrili" | "günlük" | "borç";

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
  // ── İPUCU BALONU: işaret aileden gelir (kontrolcü hükmü 2026-09-10) ──────
  //    Katalog balonun işaretini emojiyle değil ailenin adıyla yazar ve çizimi
  //    etkinleşmede kurulan çiziciye bırakır. Kalan iki kalemdeki ❌, belge
  //    iskeletinin kod bloğunda ve bölüm açıklamasında anti-desen maddelerinin
  //    kaynakta nasıl YAZILDIĞINI anlatır; bir işaret değil dilin yazımıdır.
  "IPUCU_BELGE_METINLERI.acilis": { adet: 2, sinif: "yazım" },
  ipucuIslecMetni: { adet: 2, sinif: "yazım" },
  // ── KAPANAN KALEMLER (VIT-KIMLIK-A07 · Founder sade hâli, 2026-09-13) ─────
  //    Eski `sınır` sınıfı: bildirim metinleri (giydirme sorusu ve sonucu,
  //    klasör gerekli uyarısı, eski kopya uyarısı, iskelet sonucu, yasak geçiş)
  //    ve durum çubuğu iletileri (panel odağı, geri alma) emojisiz kaldı ve
  //    yalnız kelime taşır. Eski `borç` sınıfı: satır sonu notlarının (onay
  //    bekliyor, terfi bekliyor, uyarı) kelimesi emojisizdir ve işaret dekorun
  //    görsel ekinde aileden çizilir. On bir kalem listeden düştü; `borç`
  //    sınıfında kalem kalmadı ve aşağıdaki nöbet onun sıfır kaldığını ölçer.
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
function envanteriOlc(kaynak: string = oku("../src/yuzey-metinleri.ts")): Map<string, number> {
  const ham = kaynak.split("\n");
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
  // Erişim, borcun büyüklüğüyle değil kataloğun başına, ortasına ve sonuna
  // varmakla ölçülür: borç kapandıkça sahip sayısı düşer ve düşmesi doğrudur
  // (2026-09-13 turu altmış dört sahibi kırk üçe indirdi). Aşağıdaki üç sahip
  // hükmen muaftır, dolayısıyla temizlikle kaybolmaz; biri görünmezse tarama
  // kataloğun o bölgesine inmiyordur.
  for (const sahip of ["IZ_METINLERI.izTuru", "TAKDIR_METINLERI.karsilama", "emojiYazimiIpucu"])
    assert.ok(olculen.has(sahip), `tarama ${sahip} sahibine varmadı; kataloğun bir bölgesi ölçüm dışında kalıyor`);
  assert.ok(olculen.size > 20,
    `envanter beklenmedik biçimde küçük (${olculen.size} sahip); tarama kataloğu gezmiyor olabilir`);
});

test("ENVANTER ANAHTARI: sahip adı KATALOĞUYLA birlikte anılır — iki yüzey tek satıra düşemez", () => {
  const olculen = envanteriOlc();
  // Ölçülmüş çakışma: `bekliyorSus` hem Onaylar hem takdir yüzeyinde yaşar ve
  // ikisinin sınıfı AYRIDIR. Anahtar kataloğu taşımazsa biri ötekinin
  // muafiyetine saklanır; nöbet bu yüzden ayrımın kendisini ölçer.
  assert.ok(olculen.has("TAKDIR_METINLERI.bekliyorSus"),
    "TAKDIR_METINLERI.bekliyorSus ölçümde yok — anahtar kataloğu yitirmiş, çakışan üye adları yeniden birleşir");
  assert.equal(olculen.get("bekliyorSus"), undefined,
    "kataloğu olmayan çıplak 'bekliyorSus' anahtarı doğdu — iki yüzey yine tek satırda toplanıyor");
  // Onaylar notu Founder sade hâli, 2026-09-13 ile emojisiz kaldı. Ayrımın bugün
  // de işlediği gerçek kataloğun bir mutantıyla ölçülür: nota emoji geri konur
  // ve ölçüm onu takdir yüzeyinin değil Onaylar kataloğunun kalemi olarak yazmalıdır.
  const kaynak = oku("../src/yuzey-metinleri.ts");
  const satir = 'get bekliyorSus(): string { return yuzeyMetni("Founder onayını bekliyor"';
  assert.ok(kaynak.includes(satir), "Onaylar notunun satırı katalogda bulunamadı; mutant boşa kurulur");
  const mutant = envanteriOlc(kaynak.replace(satir, satir.replace('("Founder', '("📬 Founder')));
  assert.equal(mutant.get("ONAY_YUZEY_METINLERI.bekliyorSus"), 1,
    "Onaylar notuna konan emoji Onaylar kataloğunun kalemi olarak sayılmadı — anahtar kataloğu yitirmiş");
  assert.equal(mutant.get("TAKDIR_METINLERI.bekliyorSus"), olculen.get("TAKDIR_METINLERI.bekliyorSus"),
    "Onaylar notunun emojisi takdir yüzeyinin kalemine eklendi — iki yüzey yine tek satırda toplanıyor");
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
  const toplam: Record<Sinif, number> = { takdir: 0, yazım: 0, çevrili: 0, günlük: 0, borç: 0 };
  for (const kayitli of Object.values(ENVANTER)) toplam[kayitli.sinif] += kayitli.adet;
  // Sayı bir iddia değil, ÖLÇÜMDÜR ve gizlenmez (YUZ-3.1: hiçbir yüzey bir
  // tanıyı gizleyemez). VIT-KIMLIK-A07'nin üçüncü kabul ölçütü `borç` SIFIRDA
  // karşılanır; aşağıdaki nöbet bu sıfırı ayrıca kilitler.
  t.diagnostic(`VIT-KIMLIK-A07 · açık borç: ${toplam.borç}`);
  t.diagnostic(`hükmen muaf: takdir ${toplam.takdir} · dilin yazımı ${toplam.yazım} · aileye çevrili ${toplam.çevrili} · günlük ${toplam.günlük}`);
  const olculenToplam = [...envanteriOlc().values()].reduce((a, b) => a + b, 0);
  const kayitliToplam = Object.values(toplam).reduce((a, b) => a + b, 0);
  assert.equal(kayitliToplam, olculenToplam,
    `envanterin sınıf toplamı (${kayitliToplam}) ölçülen satır sayısından (${olculenToplam}) ayrı — ` +
    "bir kalem sınıfsız kalmış ya da iki kez sayılmış");
});

test("ENVANTER: açık borç SIFIRDIR — borç sınıfına yeni kalem yazılamaz", () => {
  // Founder sade hâli, 2026-09-13 son üç borç kalemini kapattı. Circir yeni bir
  // emojiyi zaten kırmızıya düşürür; bu nöbet onu `borç` diye kaydedip susturma
  // yolunu kapatır. Yeni bir borç ancak Founder hükmüyle ve bu nöbet bilerek
  // güncellenerek doğabilir.
  const borclar = Object.entries(ENVANTER).filter(([, k]) => k.sinif === "borç").map(([s, k]) => `${s} (${k.adet})`);
  assert.deepEqual(borclar, [] as string[],
    "Envantere açık borç yazıldı: " + borclar.join(", ") + " — YUZ-4.2 kullanıcıya görünen yüzeyde " +
    "emojiyi yasaklar; işaret aileden gelir, aile ulaşamıyorsa işaret düşer ve kelime kalır.");
});

test("KAPANDI: bildirim, durum çubuğu iletisi, satır sonu notu ve planlanmamış sayacı kelimeyle konuşur", async () => {
  const m = await import("../src/yuzey-metinleri.ts");
  // Founder sade hâli, 2026-09-13: bildirim kutusu ile durum çubuğu iletisi
  // eklentinin görselini taşımaz, dolayısıyla emoji kalkar ve kelime kalır.
  // Satır sonu notunun simgesini dekor ekler; katalog yalnız kelimeyi taşır.
  // Her metin iki dilde emojisiz olmalı ve kendi kelimesini korumalıdır.
  try {
    for (const dil of ["tr", "en"] as const) {
      m.yuzeyDiliniAyarla(dil);
      const tr = dil === "tr";
      for (const [ad, metin, kelime] of [
        ["giydirme sorusu", m.GIYDIR_METINLERI.soru, tr ? "giydirilmemiş" : "appearance applied"],
        ["giydirildi bildirimi", m.EKLENTI_KABUK_METINLERI.giydirildi, tr ? "giydirildi" : "Workspace dressed"],
        ["klasör gerekli bildirimi", m.EKLENTI_KABUK_METINLERI.giydirKlasorGerekli, tr ? "klasör aç" : "open a folder"],
        ["eski kopya bildirimi", m.EKLENTI_KABUK_METINLERI.eskiKopyaSaltOkunur, tr ? "ESKİ kopya" : "HISTORICAL copy"],
        ["iskelet bildirimi", m.iskeletKuruldu(2, 1), tr ? "Iskelet kuruldu" : "Scaffold built"],
        ["yasak geçiş bildirimi", m.YOL_METINLERI.yasakGecis("'ADM-1' bloklu → tamamlandı YAZILAMAZ", "ADM-1", "bloklu", "tamamlandı"), tr ? "YAZILAMAZ" : "not allowed"],
        ["panel odağı iletisi", m.panelOdakMesaji("sarmal"), tr ? "panel odağı" : "panel focus"],
        ["geri alma iletisi", m.YOL_METINLERI.geriAlma("ADM-1", "tamamlandı", "beklemede"), tr ? "geri-alma" : "rollback"],
        ["onay notu", m.ONAY_YUZEY_METINLERI.bekliyorSus, tr ? "Founder onayını bekliyor" : "awaiting Founder approval"],
        ["terfi notu", m.YILDIZ_METINLERI.terfiBekliyor, tr ? "terfi bekliyor" : "promotion pending"],
        ["uyarı notu", m.YILDIZ_METINLERI.uyari, tr ? "uyarı" : "warning"],
      ] as const) {
        assert.ok(!EMOJI.test(metin), `${ad} (${dil}) hâlâ emoji taşıyor: ${metin}`);
        assert.ok(metin.includes(kelime), `${ad} (${dil}) kelimesini yitirmiş: "${metin}"`);
      }
      assert.equal(m.YOL_METINLERI.planlanmamisSayac(2, 5), tr ? "planlanmamış [2/5]" : "unscheduled [2/5]",
        `planlanmamış sayacı (${dil}) kelime ve sayıdan oluşmuyor`);
    }
  } finally {
    m.yuzeyDiliniAyarla("tr");
  }
  // İşaret sessizce kaybolmadı: satır sonu notları aile simgesiyle kurulur ve
  // Yol Haritası sayacı katalogdaki kelimeden okunur.
  const yildiz = oku("../src/yildiz.ts");
  for (const not of ["terfiBekliyor", "uyari"])
    for (const evre of ["parlak", "sonuk"])
      assert.ok(yildiz.includes(`rozet("${not}", "${evre}"`),
        `yildiz.ts ${not} notunun ${evre} evresini aile simgesiyle kurmuyor — nabız ya da işaret kaybolmuş`);
  assert.ok(/satirSonuSecenekleri\(vscode, baglam\.extensionUri, not, evre, etiket\)/.test(yildiz),
    "yildiz.ts rozetini satır sonu hanesinden (simge-cizelgesi.ts) kurmuyor");
  assert.ok(/YOL_METINLERI\.planlanmamisSayac\(o\.tamam, o\.toplam\)/.test(oku("../src/yolharitasi.ts")),
    "Yol Haritası planlanmamış sayacını katalogdaki kelimeden okumuyor");
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

test("KAPANDI: düz metin ipucu ve ağaç açıklaması işareti DÜŞÜRÜR, kelimeyi korur", async () => {
  const { YOL_METINLERI, caprazBakisIpucu } = await import("../src/yuzey-metinleri.ts");
  // Ağaç öğesinin düz ipucu, belge bağlantısının ipucu ve ağaç satırının
  // açıklama sütunu resim taşımaz; aile oraya ulaşamaz. Bu yüzeylerde emoji
  // tek başına bir işaretti ve kanon onu yasaklar (YUZ-4.2), dolayısıyla işaret
  // düştü ve anlamı kelime taşır. Etki ile beceri sayaçlarında işaretin kendisi
  // tek etiketti; yerine sayının ne olduğunu söyleyen kelime kondu.
  for (const [ad, metin, kelime] of [
    ["varlık ipucu", YOL_METINLERI.varlikIpucu("Proje", "PRJ-X", "/kok", 3, 2), "bloklu"],
    ["aktif varlık ipucu", YOL_METINLERI.aktifIpucu("ipucu"), "AKTİF VARLIK"],
    ["çapraz bakış ipucu", caprazBakisIpucu("VIT-KIMLIK-A07"), "VIT-KIMLIK-A07"],
    ["etki sayacı", YOL_METINLERI.etkiSayaci(3, 5), "geçişli"],
    ["beceri sayacı", YOL_METINLERI.beceriSayisi(4), "beceri"],
    ["geçişli kenar notu", YOL_METINLERI.gecisliDuz, "geçişli"],
    ["doğrudan kenar notu", YOL_METINLERI.dogrudanDuz, "doğrudan"],
  ] as const) {
    assert.ok(!EMOJI.test(metin), `${ad} hâlâ emoji taşıyor: ${metin}`);
    assert.ok(metin.includes(kelime), `${ad} metinsel etiketini yitirmiş: "${metin}"`);
  }
  const kaynak = oku("../src/yolharitasi.ts");
  assert.ok(!/ROL_SIMGE/.test(kaynak), "koşum satırının rol emojisi çizelgesi geri döndü");
  assert.ok(/YOL_METINLERI\.gecisliDuz : YOL_METINLERI\.dogrudanDuz/.test(kaynak),
    "ağaç satırının kenar notu emojili webview kelimesine geri döndü — ağaç düz metin basar");
  assert.ok(/YOL_METINLERI\.etkiSayaci\(/.test(kaynak) && /YOL_METINLERI\.beceriSayisi\(/.test(kaynak),
    "etki ya da beceri sayacı katalog kelimesinden okunmuyor — işaret emojiye geri dönmüş olabilir");
});

test("KAPANDI: ipucu balonu işaretini aileden alır — çizici yokken işaret düşer, kelime kalır", async () => {
  const m = await import("../src/yuzey-metinleri.ts");
  const { SATIR_SIMGELERI, satirSvgKaynagi, satirSvgVaryanti, ipucuIsaretiMd } = await import("../src/simge-cizelgesi.ts");
  // Balon Markdown olarak çizilir ve dosya adresli görsel kabul eder; aile
  // oraya ULAŞIR (kontrolcü hükmü 2026-09-10). Katalog işaretin ADINI verir,
  // etkinleşme kapısı çiziciyi kurar. Nöbet üç şeyi ölçer: çizici yokken hiçbir
  // balonda emoji kalmadığını, çizici kuruluyken her balonun aile işareti
  // çağırdığını ve istenen her adın ailede gerçekten bulunduğunu.
  const balonlar = (): ReadonlyArray<readonly [string, string]> => [
    // Belge iskeletinin kod bloğundaki ❌ dilin yazımıdır; ölçüm kod bloğunu ayırır.
    ["belge açılışı", m.IPUCU_BELGE_METINLERI.acilis.replace(/```[\s\S]*?```/g, "")],
    ["belge kapanışı", m.IPUCU_BELGE_METINLERI.kapanis],
    ["bölüm etiketi", m.bolumEtiketiIpucu("desenler", "açıklama")],
    ["serbest bölüm etiketi", m.bolumEtiketiIpucu("serbest")],
    ["varsayılanlar", m.varsayilanlarIpucu({ durum: "beklemede" })],
    ["kenar", m.kenarIpucu("bağımlı", "depends on", "ileri", "ne", "")],
    ["anahtar", m.anahtarIpucu("kod", "açıklama", "")],
    ["parametre", m.parametreIpucu("ad", "açıklama", "")],
    ["yetki", m.yetkiIpucu("açıklama", "- L1")],
    ["akış oku", m.IPUCU_SOZCE_METINLERI.akisOku],
    ["i18n", m.IPUCU_SOZCE_METINLERI.i18n("#a.b")],
    ["işleç", m.IPUCU_SOZCE_METINLERI.islec("==", "eşitlik")],
    ["sade tip kartı", m.tipIpucuMetni("Adım", "plan", "ne", undefined)],
    ["zengin tip kartı", m.tipIpucuMetni("Adım", "plan", "ne", { tanim: "t", yeri: "y", gorev: "g", ajan: "a", insan: "i" })],
    ["karar eki", m.kararMetniIpucuEki("özet", "hüküm")],
    ["Kuzey Yıldızı", m.YILDIZ_METINLERI.ipucu("neden")],
    ["tarife", m.YOL_METINLERI.tarife("2026-09-30")],
    ["planlanmamış", m.YOL_METINLERI.planlanmamis("neden")],
    ["bloklu alt", m.YOL_METINLERI.blokluAlt(2)],
  ];
  const istenen = new Set<string>();
  try {
    for (const dil of ["tr", "en"] as const) {
      m.yuzeyDiliniAyarla(dil);
      m.ipucuIsaretCiziciniKur(undefined);
      for (const [ad, metin] of balonlar()) {
        assert.ok(!EMOJI.test(metin), `${ad} balonu (${dil}) hâlâ emoji taşıyor: ${metin.slice(0, 90)}`);
        assert.ok(metin.replace(/[\s*_`·:—-]/g, "").length > 3,
          `${ad} balonu (${dil}) işaretle birlikte metnini de yitirmiş`);
      }
      m.ipucuIsaretCiziciniKur((ad, anlam) => { istenen.add(ad); return `[[${ad}:${anlam}]]`; });
      for (const [ad, metin] of balonlar())
        assert.ok(/\[\[[a-z-]+:[a-z]+\]\] /.test(metin),
          `${ad} balonu (${dil}) aile işaretini çağırmıyor — işaret sessizce kaybolmuş`);
    }
  } finally {
    m.ipucuIsaretCiziciniKur(undefined);
    m.yuzeyDiliniAyarla("tr");
  }
  const aile = new Set<string>(SATIR_SIMGELERI);
  for (const ad of istenen) {
    assert.ok(aile.has(ad), `balon "${ad}" işaretini istiyor ama bu ad satır ailesinde yok`);
    const kaynak = satirSvgKaynagi(ad as (typeof SATIR_SIMGELERI)[number]);
    assert.ok(existsSync(fileURLToPath(new URL(`../${kaynak}`, import.meta.url))),
      `balonun istediği "${ad}" simgesinin rafta kaynağı yok (${kaynak})`);
  }
  assert.equal(ipucuIsaretiMd(`file:///e/${satirSvgVaryanti("tip", "duz", "koyu")}`),
    "![](file:///e/medya/simgeler/uretilmis/satir-tip-duz-koyu.svg|width=14,height=14)",
    "balona gömülen işaret üretilmiş varyantı boş alternatif metinle ve sabit ölçüyle çağırmalı");
  assert.ok(/ipucuIsaretCiziciniKur\(ipucuIsaretCizicisi\(context\.extensionUri\)\)/.test(oku("../src/eklenti.ts")),
    "etkinleşme kapısı ipucu çiziciyi kurmuyor — balonlar işaretsiz kalır");
  const ipucuKaynagi = oku("../src/ipucu.ts");
  assert.ok(/activeColorTheme\.kind/.test(ipucuKaynagi) && /satirSvgVaryanti\(ad, anlam, tema\)/.test(ipucuKaynagi),
    "ipucu çizicisi tema kanalını ya da üretilmiş varyantı okumuyor — <img> currentColor çözmez");
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

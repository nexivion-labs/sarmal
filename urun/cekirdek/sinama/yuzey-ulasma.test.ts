// ═══════════════════════════════════════════════════════════════════════════
// yuzey-ulasma.test.ts — 🧭 YÖNLENDİRME × ULAŞMA NÖBETİ (BKM-DNT-A02 · mutasyon
//   kanıtlı)
//
//   Bu süit iki ayrı olguyu sınar ve ikisinin karıştırılmasının kaydı nasıl
//   bayatlattığını gösterir.
//
//   BİRİNCİ AİLE — FARK. `yuzeyUlasmaOzeti` her ilan girdisini bir sunum
//   yüzeyine YÖNLENDİRİR ve o yüzeye ULAŞIP ulaşmadığını ayrıca okur. Farkın
//   sıfır olması gereken yarısı (hata ya da uyarı basıp panele ulaşamayan
//   girdi) canlı ilanda BOŞTUR; kalan yarısı gerekçe taşımak zorundadır.
//   Nöbetin kendi doğruluğu ayrıca ölçülür: ulaşmayan girdi sayısının canlı
//   ilanda SIFIRDAN BÜYÜK olduğu sınanır, çünkü hiçbir şey saymayan bir ölçüm
//   de yeşil kalır ve yeşilliği bir şey kanıtlamaz.
//
//   İKİNCİ AİLE — KAYIT. `tani_yuzeyi_yonlendirme_matrisi.sar` aynı olguyu üç
//   yerde söyler (Çıkarım düğümü · düzyazı · çizelge) ve üçü elle yazıldığı
//   için birbirinden ayrışmıştı: çizelge 175 kimlik ve 143/2/30 dağılımı
//   yazarken Çıkarım düğümü 171 kimlik ve 143/4/24 dağılımı yazıyordu.
//   `matrisKayitSapmalari` üçünü hem birbirine hem canlı ölçüme karşı tartar.
//
//   Bütün mutasyonlar yalnız BELLEKTEKİ kopyalar üstünde yaşar; ne ilana ne
//   kayda tek bayt yazılır.
// ═══════════════════════════════════════════════════════════════════════════
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { KAPI_KAPSAMI, type KapiGirdisi } from "../src/kapi-kapsami.ts";
import {
  yuzeyUlasmaOzeti, oncekiKademeOlcumu, kayitIddialari, matrisKayitSapmalari,
} from "../src/yuzey-ulasma.ts";
import { ONCEKI_TANI_KODLARI, SABIT_TANI_KODLARI, YENI_TANI_KANONU } from "../src/tani-sicili.ts";

const KAYIT_YOLU = fileURLToPath(
  new URL("../../../is/nitelik/goc/tani_yuzeyi_yonlendirme_matrisi.sar", import.meta.url));
const KAYNAK_DIZINI = fileURLToPath(new URL("../src", import.meta.url));

// ── BİRİNCİ AİLE · FARK ────────────────────────────────────────────────────

test("BKM-DNT-A02: hata ya da uyarı basıp panele ulaşamayan ve İKİZSİZ girdi SIFIRDIR", () => {
  const ozet = yuzeyUlasmaOzeti();
  assert.deepEqual(ozet.sessizFark.map((s) => s.uretici), [],
    "YUZ-3.1 gizleme yasağı: Problems yüzeyine yönlendirilen bir girdi ya o yüzeye ulaşır ya da panelde yaşayan bir ikiz beyan eder");
  // Problems hanesindeki ulaşmayanların TAMAMI ikizle korunmuş olmalıdır;
  // korunmayan bir satır kalırsa yukarıdaki küme zaten dolar.
  assert.equal(ozet.yuzeyler.problems.ulasmayan, ozet.ikizliFark.length);
});

// İKİZ İSTİSNASININ KENDİ NÖBETİ. İstisna bir kaçış deliği olsaydı adı yazılan
// her şey onu açardı; burada beyanın ÖLÇÜLDÜĞÜ gösterilir.
test("BKM-DNT-A02: panel ikizi beyanı ölçülür — ikiz panelden düşünce koruma kalkar", () => {
  const ozet = yuzeyUlasmaOzeti();
  assert.equal(ozet.ikizliFark.length, 1, "bugün tam olarak bir girdi ikiz istisnasıyla korunur");
  const korunan = ozet.ikizliFark[0].uretici;
  const ikizAdi = KAPI_KAPSAMI.find((g) => g.uretici === korunan)?.panelIkizi;
  assert.ok(ikizAdi, `${korunan} bir panel ikizi beyan etmeli`);

  // MUTASYON: ikizin kendisi panelden düşerse istisna düşer ve satır sessiz farka geçer.
  const mutant: KapiGirdisi[] = KAPI_KAPSAMI.map((g) => g.uretici === ikizAdi
    ? { ...g, yuzeyler: g.yuzeyler.filter((y) => y !== "panel") }
    : g);
  const bozuk = yuzeyUlasmaOzeti(mutant);
  assert.ok(bozuk.sessizFark.some((s) => s.uretici === korunan),
    "ikizi panelden düşen girdi artık korunmamalı — beyan ölçülmeseydi burası yeşil kalırdı");
  assert.equal(yuzeyUlasmaOzeti(KAPI_KAPSAMI).sessizFark.length, 0, "geri alınca nöbet yeşile döner");
});

test("BKM-DNT-A02: ulaşmayan her girdi gerekçe taşır ve gerekçesiz ulaşmama YOKTUR", () => {
  const ozet = yuzeyUlasmaOzeti();
  assert.deepEqual(ozet.gerekcesizFark.map((s) => s.uretici), [],
    "gerekçesiz bir ulaşmama sessiz bir gizleme kararıdır");
  for (const satir of ozet.gerekceliFark) {
    assert.ok((satir.gerekce ?? "").length > 20, `${satir.uretici} gerekçesi bir cümle taşımıyor`);
  }
});

// NÖBETİN KENDİ DOĞRULUĞU. Yukarıdaki iki nöbet BOŞ küme bekler; boş küme bir
// ölçümün geçtiğini de, ölçümün hiç koşmadığını da anlatabilir. Bu sınama farkın
// GERÇEKTEN sayıldığını gösterir: canlı ilanda ulaşmayan girdi vardır ve sayısı
// yüzey sayaçlarıyla birebir tutar.
test("BKM-DNT-A02: nöbet gerçekten sayıyor — canlı ilanda ulaşmayan girdi vardır ve sayaçlar tutar", () => {
  const ozet = yuzeyUlasmaOzeti();
  assert.equal(ozet.satirlar.length, KAPI_KAPSAMI.length, "her ilan girdisi tam bir satır üretir");
  const ulasmayan = ozet.satirlar.filter((s) => !s.ulasir);
  assert.ok(ulasmayan.length > 0,
    "canlı ilanda ulaşmayan girdi olmasaydı fark ölçümü hiçbir şey saymayan bir nöbet olurdu");
  assert.equal(ulasmayan.length, ozet.gerekceliFark.length + ozet.gerekcesizFark.length);
  const toplamYonlendirilen = Object.values(ozet.yuzeyler).reduce((t, y) => t + y.yonlendirilen, 0);
  assert.equal(toplamYonlendirilen, KAPI_KAPSAMI.length, "her girdi tam olarak bir yüzeye yönlendirilir");
  for (const sayac of Object.values(ozet.yuzeyler)) {
    assert.equal(sayac.yonlendirilen, sayac.ulasan + sayac.ulasmayan, "kayıp ya da çift sayım yoktur");
  }
});

test("MUTASYON: hata kademeli bir girdi panel yüzeyini kaybedince sessiz fark KIRMIZI yanar", () => {
  const saglam = yuzeyUlasmaOzeti();
  assert.equal(saglam.sessizFark.length, 0);

  const kurban = KAPI_KAPSAMI.find((g) => g.kademe === "hata" && g.yuzeyler.includes("panel"));
  assert.ok(kurban, "ilanda panel yüzeyli hata kademeli bir girdi bulunmalı");
  const mutant: KapiGirdisi[] = KAPI_KAPSAMI.map((g) =>
    g.uretici === kurban.uretici ? { ...g, yuzeyler: g.yuzeyler.filter((y) => y !== "panel") } : g);

  const bozuk = yuzeyUlasmaOzeti(mutant);
  assert.deepEqual(bozuk.sessizFark.map((s) => s.uretici), [kurban.uretici],
    "panelini kaybeden hata üreticisi sessiz farka düşmeli");
  assert.equal(bozuk.yuzeyler.problems.ulasmayan, saglam.yuzeyler.problems.ulasmayan + 1);

  // Kaynak birebir geri konduğunda nöbet yeşile döner.
  assert.equal(yuzeyUlasmaOzeti(KAPI_KAPSAMI).sessizFark.length, 0);
});

test("MUTASYON: ulaşmayan bir girdinin gerekçesi silinince gerekçesiz fark KIRMIZI yanar", () => {
  const kurban = KAPI_KAPSAMI.find((g) => !g.yuzeyler.includes("panel"));
  assert.ok(kurban, "ilanda yalnız komut satırında kalan bir girdi bulunmalı");
  const mutant: KapiGirdisi[] = KAPI_KAPSAMI.map((g) =>
    g.uretici === kurban.uretici ? { uretici: g.uretici, modul: g.modul, kademe: g.kademe, yuzeyler: g.yuzeyler } : g);

  const bozuk = yuzeyUlasmaOzeti(mutant);
  assert.equal(bozuk.gerekcesizFark.length, 1);
  assert.equal(bozuk.gerekcesizFark[0].uretici, kurban.uretici);
  assert.equal(yuzeyUlasmaOzeti(KAPI_KAPSAMI).gerekcesizFark.length, 0);
});

test("MUTASYON: bilgi kademesine düşen bir girdi Problems hanesinden Bildirimler hanesine geçer", () => {
  const saglam = yuzeyUlasmaOzeti();
  const kurban = KAPI_KAPSAMI.find((g) => g.kademe === "hata");
  assert.ok(kurban);
  const mutant: KapiGirdisi[] = KAPI_KAPSAMI.map((g) =>
    g.uretici === kurban.uretici ? { ...g, kademe: "bilgi" as const } : g);
  const bozuk = yuzeyUlasmaOzeti(mutant);
  assert.equal(bozuk.yuzeyler.problems.yonlendirilen, saglam.yuzeyler.problems.yonlendirilen - 1,
    "yönlendirme kararı kademeden türer ve ikinci bir çizelgeden değil");
  assert.equal(bozuk.yuzeyler.bildirimler.yonlendirilen, saglam.yuzeyler.bildirimler.yonlendirilen + 1);
});

// ── ÖNCEKİ GÖVDENİN KADEME ÖLÇÜMÜ ──────────────────────────────────────────

test("BKM-DNT-A02: önceki gövdenin kademe dağılımı kaynaktan ölçülür ve tam takım kalır", () => {
  const olcum = oncekiKademeOlcumu(KAYNAK_DIZINI);
  assert.equal(olcum.toplam, ONCEKI_TANI_KODLARI.length,
    "her önceki kimlik tam olarak bir haneye düşer — kayıp ya da çift sayım yoktur");
  assert.ok(olcum.hata + olcum.uyari + olcum.bilgi > 0, "tarama hiçbir kademe ölçemiyorsa desen bozulmuştur");
  // Ölçülemeyen ve bağlamsal haneler DÜRÜSTLÜK hanesidir; şişmeleri taramanın
  // körleştiğini bildirir ve o hâlde dağılım güvenilmez olur.
  assert.ok(olcum.baglamsal.length + olcum.olculemeyen.length < ONCEKI_TANI_KODLARI.length / 5,
    "bağlamsal ve ölçülemeyen kimlikler gövdenin beşte birini aşarsa tarama körleşmiştir");
});

// ── İKİNCİ AİLE · KAYIT ────────────────────────────────────────────────────

test("BKM-DNT-A02: kaydın üç sayı kaynağı okunur ve tam takımdır", () => {
  const iddialar = kayitIddialari(readFileSync(KAYIT_YOLU, "utf8"));
  const kaynaklar = new Set(iddialar.map((i) => i.kaynak));
  assert.deepEqual([...kaynaklar].sort(), ["düzyazı", "çizelge", "çıkarım"].sort(),
    "üç sayı kaynağının üçü de okunabilmeli — okunamayan iddia ölçülmemiş iddiadır");
  assert.equal(iddialar.length, 17, "kaydın on yedi sayısal iddiasının tamamı okunmalı");
});

test("BKM-DNT-A02: kaydın üç sayı kaynağı birbiriyle ve canlı ölçümle uyuşur", () => {
  const sapmalar = matrisKayitSapmalari(readFileSync(KAYIT_YOLU, "utf8"), yuzeyUlasmaOzeti());
  assert.deepEqual(sapmalar, [], `yönlendirme matrisi kaydı bayat:\n  ${sapmalar.join("\n  ")}`);
});

test("BKM-DNT-A02: canlı ölçüm bugünkü sicili birebir sayar", () => {
  const ozet = yuzeyUlasmaOzeti();
  assert.equal(ozet.sicilToplami, SABIT_TANI_KODLARI.length);
  assert.equal(ozet.yeniKimlik, YENI_TANI_KANONU.length);
  assert.equal(ozet.oncekiKimlik, ONCEKI_TANI_KODLARI.length);
  assert.equal(ozet.yeniKimlik + ozet.oncekiKimlik, ozet.sicilToplami);
  // KPS-MHR-A01 (2026-09-11): MIM-3.4 `sonraya-bırakılmış-dosya` bilinçli bir ileri
  // bağlam beyanıdır ve Founder hükmüyle Hatırlatıcılar hanesine gider.
  assert.equal(ozet.hatirlaticiKimlik, 3, "ileri-bağlam kümesi KYN-YUZ-A02 daraltması ve MIM-3.4 ile üç kimliktir");
});

test("MUTASYON: çizelgenin bir hanesi kaydırılınca kayıt nöbeti KIRMIZI yanar", () => {
  const saglam = readFileSync(KAYIT_YOLU, "utf8");
  const ozet = yuzeyUlasmaOzeti();
  assert.deepEqual(matrisKayitSapmalari(saglam, ozet), []);

  // ① Çizelgenin Problems hanesi tek başına kayarsa yüzey toplamı sicil boyutunu
  //    vermez; kaydın eski uyarısının "iki sayı ters yönde kayabilir" açığı budur.
  const tekKayma = saglam.replace("| Problems | 144 |", "| Problems | 143 |");
  assert.notEqual(tekKayma, saglam, "mutasyon deseni kayda uymadı — nöbet yanlış satırı ölçüyor olabilir");
  const sapma1 = matrisKayitSapmalari(tekKayma, ozet);
  assert.ok(sapma1.some((s) => s.includes("sicil boyutunu vermiyor")), sapma1.join(" · "));

  // ② İki hane ters yönde birlikte kayarsa toplam korunur; nöbet bunu Çıkarım
  //    düğümüyle ayrışma üstünden yakalar — tek bir kaynağa yazmak yetmez.
  const ciftKayma = saglam
    .replace("| Problems | 144 |", "| Problems | 143 |")
    .replace("| Bildirimler | 32 |", "| Bildirimler | 33 |");
  const sapma2 = matrisKayitSapmalari(ciftKayma, ozet);
  assert.ok(sapma2.some((s) => s.startsWith("problems hanesi kaynaklar arasında ayrışıyor")), sapma2.join(" · "));

  // ③ Canlı sicilden türeyen hane kaydırılınca ölçümle ayrışma bildirilir.
  const toplamKayma = saglam.replace("| **Toplam** | **179** |", "| **Toplam** | **178** |");
  const sapma3 = matrisKayitSapmalari(toplamKayma, ozet);
  assert.ok(sapma3.some((s) => s.includes("canlı ölçümle uyuşmuyor")), sapma3.join(" · "));

  // Kaynak birebir geri konduğunda nöbet yeşile döner.
  assert.deepEqual(matrisKayitSapmalari(saglam, ozet), []);
});

test("MUTASYON: Çıkarım düğümünün sayısı kaydın çizelgesinden ayrılınca nöbet KIRMIZI yanar", () => {
  const saglam = readFileSync(KAYIT_YOLU, "utf8");
  const ozet = yuzeyUlasmaOzeti();
  // Kaydın 2026-09-10 öncesi hâli tam da buydu: Çıkarım düğümü 171 kimlik ve
  // 143/4/24 dağılımı yazarken çizelge 175 kimlik ve 143/2/30 yazıyordu.
  const bayat = saglam
    .replace("sicilin 179 kimliğinin tamamını tek yüzeye YÖNLENDİRİR",
      "sicilin 171 kimliğinin tamamını tek yüzeye YÖNLENDİRİR")
    .replace("dağılım 144 Problems, 3 Hatırlatıcılar ve 32 Bildirimler",
      "dağılım 143 Problems, 4 Hatırlatıcılar ve 24 Bildirimler");
  assert.notEqual(bayat, saglam, "mutasyon deseni Çıkarım düğümüne uymadı");
  const sapmalar = matrisKayitSapmalari(bayat, ozet);
  assert.ok(sapmalar.some((s) => s.startsWith("toplam hanesi kaynaklar arasında ayrışıyor")), sapmalar.join(" · "));
  assert.ok(sapmalar.some((s) => s.startsWith("hatırlatıcılar hanesi canlı ölçümle uyuşmuyor")), sapmalar.join(" · "));
  assert.deepEqual(matrisKayitSapmalari(saglam, ozet), []);
});

test("MUTASYON: bir sayı kaynağı kayıttan tümüyle silinince nöbet sessiz kalmaz", () => {
  const saglam = readFileSync(KAYIT_YOLU, "utf8");
  const eksik = saglam.replace(/^\| Hatırlatıcılar \| 3 \|.*$/m, "| Hatırlatıcılar | — |");
  assert.notEqual(eksik, saglam);
  const sapmalar = matrisKayitSapmalari(eksik, yuzeyUlasmaOzeti());
  assert.ok(sapmalar.some((s) => s.startsWith("okunamayan iddia")), sapmalar.join(" · "));
});

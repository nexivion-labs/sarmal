// ═══════════════════════════════════════════════════════════════════════════
// delik-kapama.test.ts — 🕳️ TUR-2 TEST DELİKLERİ (RF-T2-A01 · teftiş 🟠)
//
//   Teftiş bulgusu: sarmal.ts/denetleKomutu (50KB, bilgi-süzme bug'ının evi) ·
//   yolcoz · tema · yazdir TESTSİZDİ. Asgari nöbetler: her modülün çekirdek
//   davranışı + denetleKomutu'na "bilgi tanıları ÇIKTIDA VAR" assert'i
//   (alt-süreç — gerçek CLI yüzeyi, bilgi-süzme sınıfı bir daha sessiz olamaz).
//
//   GERÇEK AĞAÇ (HST-MTR-A07 · 2026-10-10): komut satırı fikstürleri artık
//   doğuş paketinin yazdığı ağaçta kurulur ve plan yollarını `dogus-agaci.ts`
//   modülünden okur. Eski fikstürler kökün altına çıplak bir plan rafı yazıyordu
//   ve her biri iki ilgisiz hatayla (Fazsız Blok, rejim beyanı eksik) doğuyordu;
//   bu yüzden EVRE-2 nöbetinin çıkış kodu ölçümü hiçbir şey ölçmüyordu, çünkü
//   EVRE-1 de dört koduyla çıkıyordu. Doğuş ağacı hatasız doğduğu için çıkış kodu
//   artık yalnız sınanan tanının düzeyini taşır. Kullanıcının planını doğrudan
//   Kitaplık ilan ettiği DIŞ-PROJE fikstürü meşru bir düzeni sınar ve korunur.
// ═══════════════════════════════════════════════════════════════════════════
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { belirtecle } from "../src/belirtec.ts";
import { ayristir } from "../src/ayristirici.ts";
import { kebaba, dosyaAdi, birles, degerMetni } from "../src/yolcoz.ts";
import { temaDenetle } from "../src/tema.ts";
import { agaciYaz } from "../src/yazdir.ts";
import { calismaAlaniKur, dogusAgaciKur, fazMetni, planYolu } from "./dogus-agaci.ts";

const parse = (k: string) => ayristir(belirtecle(k));

// ── yolcoz.ts — yol türetme çekirdeği ────────────────────────────────────────

test("yolcoz: kebaba Türkçe-güvenli + ALT-ÇİZGİ ayraçlı indirger (DIL-1.2 · İ/ı casing tuzağı yok)", () => {
  assert.equal(kebaba("Kimlik Doğrulama"), "kimlik_dogrulama");
  assert.equal(kebaba("IŞIK Şeridi"), "isik_seridi");
  assert.ok(!kebaba("ÖdemeİşAkışı").includes("İ"), "İ diakritiği ASCII’ye inmeli (çift alfabe geçiş kuralı)");
});

test("yolcoz: dosyaAdi + birles — düğümden yol, ayraç DIL-1.2 alt-çizgi", () => {
  const p = parse(`Blok( kod: BLK-T, ad: "kimlik-akisi", ne: "t" ) { }`);
  assert.equal(dosyaAdi(p.bildirimler[0]), "kimlik_akisi");
  assert.equal(birles("plan", "kimlik"), "plan/kimlik");
  assert.equal(birles("", "kimlik"), "kimlik", "boş kök yutulur — baştaki ayraç üretmez");
});

test("yolcoz: degerMetni — kod/metin/sayı değerleri metne iner", () => {
  const p = parse(`Adım( kod: ADM-T, ne: "x", sıra: 3, hedef: KOD-X )`);
  const alan = (ad: string) => p.bildirimler[0].parametreler.find((x) => x.ad === ad)!.deger;
  assert.equal(degerMetni(alan("kod")), "ADM-T");
  assert.equal(degerMetni(alan("ne")), "x");
  assert.equal(degerMetni(alan("sıra")), "3");
});

// ── tema.ts — YUZ-4.1 renk bekçileri (motorda olduğu iddiası artık testli) ──────

test("tema: geçersiz-renk HATA + düşük-kontrast UYARI (YUZ-4.1 — WCAG AA 4.5:1, ana↔nötr)", () => {
  const p = parse(`Tema( kod: TEM-T, ne: "bozuk tema",
  renkler: { ana: "#GGGGGG", nötr: "#FFFFFF" } )
Tema( kod: TEM-K, ne: "düşük kontrast",
  renkler: { ana: "#EEEEEE", nötr: "#FFFFFF" } )`);
  const tanilar = temaDenetle(p);
  assert.ok(tanilar.some((t) => t.kod === "geçersiz-renk" && t.duzey === "hata"),
    "bozuk hex geçersiz-renk HATASI üretmeli (YUZ-4.1 motor iddiası)");
  assert.ok(tanilar.some((t) => t.kod === "düşük-kontrast"),
    "beyaza-yakın ana ↔ beyaz nötr düşük-kontrast üretmeli");
});

test("tema: sağlıklı tema tanı almaz (yanlış-pozitif yok)", () => {
  const p = parse(`Tema( kod: TEM-S, ne: "sağlıklı",
  renkler: { ana: "#FFFFFF", nötr: "#1E1E1E" } )`);
  assert.equal(temaDenetle(p).length, 0);
});

// ── yazdir.ts — ağaç görünümü ────────────────────────────────────────────────

test("yazdir: agaciYaz düğüm hiyerarşisini girintiyle basar", () => {
  const p = parse(`Blok( kod: BLK-Y, ne: "t" ) {
  Katman( kod: KAT-Y, ne: "k" ) {
    Adım( kod: ADM-Y, durum: beklemede, ne: "iş" )
  }
}`);
  const cikti = agaciYaz(p);
  assert.ok(cikti.includes("BLK-Y") && cikti.includes("KAT-Y") && cikti.includes("ADM-Y"),
    "üç kademe de çıktıda olmalı");
  assert.ok(cikti.indexOf("BLK-Y") < cikti.indexOf("KAT-Y") &&
            cikti.indexOf("KAT-Y") < cikti.indexOf("ADM-Y"), "hiyerarşi sırası korunmalı");
});

// ── sarmal.ts denetleKomutu — CLI yüzeyi: BİLGİ tanıları ÇIKTIDA VAR ─────────
//   (bilgi-süzme vakasının nöbeti: gerçek alt-süreç, gerçek stdout.)

test("denetleKomutu: bilgi tanıları CLI çıktısında GÖRÜNÜR — bilgi-süzme sınıfı kapalı", () => {
  const agac = dogusAgaciKur({
    onek: "sarmal-cli-",
    ilkFaz: fazMetni({ ek: "D", blokKodu: "SEFER-1",   // öneksiz blok — bilgi tanısı bekleniyor (BLK yok)
      adimlar: '        Adım( kod: ADM-D1, durum: beklemede, ne: "iş", bağımlı: [] )' }),
  });
  try {
    const kok = fileURLToPath(new URL("..", import.meta.url));
    const s = spawnSync(process.execPath, [join(kok, "src", "sarmal.ts"), "denetle", agac.kok],
      { encoding: "utf8", timeout: 60000 });
    const cikti = (s.stdout ?? "") + (s.stderr ?? "");
    assert.ok(cikti.includes("öneksiz-blok") || cikti.includes("tek-çocuk-kapsayıcı"),
      `bilgi tanısı CLI çıktısında YOK — bilgi-süzme geri dönmüş:\n${cikti.slice(0, 800)}`);
    assert.ok(/ℹ/.test(cikti), "bilgi düzeyi işareti (ℹ) çıktıda görünmeli");
  } finally { agac.sil(); }
});

// ── GBR-A01 (IDA #4-CLI) — EVRE-farkında severity: CLI kapısı uçtan-uca ──────
//   Planlarken (EVRE-1, Adım beklemede) declared-but-not-built kayıp-yapı ℹ (bilgi),
//   17-sert-HATA değil; kod başlayınca (EVRE-2, Adım geliştirmede) ✖ (hata).
//   Doğuş ağacında `app/` ilan edilir fakat diske indirilmez; plan rafı doğuşla
//   zaten diskte olduğu için tek kayıp yapı odur.
function evreAgaciKur(adimDurum: string) {
  const agac = dogusAgaciKur({
    onek: "sarmal-evre-",
    ilkFaz: fazMetni({ ek: "E", adimlar: `        Adım( kod: ADM-E, durum: ${adimDurum}, ne: "adım", bağımlı: [] )` }),
  });
  agac.ilanEkle('  Kitaplık( kod: KTP-YOK, yol: "app/", ne: "ilan-edildi-üretilmedi" )');
  return agac;
}
const evreCliDenetle = (dizin: string) => {
  const kok = fileURLToPath(new URL("..", import.meta.url));
  const s = spawnSync(process.execPath, [join(kok, "src", "sarmal.ts"), "denetle", dizin],
    { encoding: "utf8", timeout: 60000 });
  return { cikti: (s.stdout ?? "") + (s.stderr ?? ""), kod: s.status };
};

test("GBR-A01 CLI: EVRE-1 (Adım beklemede) → kayıp-yapı ℹ BİLGİ, sert HATA değil (planlama penceresi)", () => {
  const agac = evreAgaciKur("beklemede");
  try {
    const { cikti, kod } = evreCliDenetle(agac.kok);
    const satir = cikti.split("\n").find((l) => l.includes("[kayıp-yapı]"));
    assert.ok(satir, `kayıp-yapı tanısı çıktıda GÖRÜNMELİ (kör değil):\n${cikti.slice(0, 900)}`);
    assert.ok(satir!.startsWith("ℹ"), `EVRE-1: kayıp-yapı BİLGİ (ℹ) olmalı, sert HATA değil — satır: ${satir}`);
    assert.match(cikti, /planlama evresinde/, "planlama evresi üretim ipucu çıktıda görünmeli");
    assert.ok(!/⛔ [1-9]/.test(cikti), `EVRE-1'de kayıp-yapı ⛔ hata saymamalı (TAM-yeşil erişilebilir):\n${cikti.slice(-400)}`);
    // Doğuş ağacı hatasız doğar: TAM-yeşil burada ilk kez ölçülebilir, çünkü eski
    // çıplak fikstür iki ilgisiz hatayla doğuyordu ve EVRE-1 de dört koduyla çıkıyordu.
    assert.equal(kod, 0, `EVRE-1'de kayıp-yapı kapıyı kapatmamalı (çıkış 0):\n${cikti.slice(0, 900)}`);
  } finally { agac.sil(); }
});

test("GBR-A01 CLI: EVRE-2 (Adım geliştirmede) → kayıp-yapı ✖ HATA (kod başladı, mutabakat kalkmaz)", () => {
  const agac = evreAgaciKur("geliştirmede");
  try {
    const { cikti, kod } = evreCliDenetle(agac.kok);
    const satir = cikti.split("\n").find((l) => l.includes("[kayıp-yapı]"));
    assert.ok(satir, `kayıp-yapı tanısı çıktıda GÖRÜNMELİ:\n${cikti.slice(0, 900)}`);
    assert.ok(satir!.startsWith("✖"), `EVRE-2: kayıp-yapı sert HATA (✖) olmalı — satır: ${satir}`);
    assert.equal(kod, 4, "EVRE-2'de yapısal hata → çıkış 4 (kapı kapalı)");
    assert.match(cikti, /── ÖZET: 1 hata/u, "kapıyı kapatan tek hata kayıp-yapı olmalı");
  } finally { agac.sil(); }
});

// ── GBR-A02 (IDA #14) — açık-adım gürültü özeti: CLI uçtan-uca ───────────────
//   Çok beklemede-Adım DRİFT bölümünde TEK özet satırı (per-adım spam yok); ama
//   kapanış motor-susmaz sayısı TAM kalır (özet gösterim, sayım değil).
test("GBR-A02 CLI: 6 beklemede Adım → DRİFT'te tek [açık-adım] özet satırı, kapanış 6 sayar (motor susmaz)", () => {
  // Doğuşun ilk Faz dosyası bu fikstürle değişir; ağaçta yalnız bu altı Adım yaşar.
  const adimlar = Array.from({ length: 6 }, (_, i) =>
    `        Adım( kod: ADM-B${i}, durum: beklemede, ne: "iş ${i}", bağımlı: [] )`).join("\n");
  const agac = dogusAgaciKur({ onek: "sarmal-acik-", ilkFaz: fazMetni({ ek: "A", adimlar }) });
  try {
    const kok = fileURLToPath(new URL("..", import.meta.url));
    const s = spawnSync(process.execPath, [join(kok, "src", "sarmal.ts"), "denetle", agac.kok],
      { encoding: "utf8", timeout: 60000 });
    const cikti = (s.stdout ?? "") + (s.stderr ?? "");
    // DRİFT bölümünde [açık-adım] tanısı TEK satır (per-adım 6 satır DEĞİL)
    const acikSatirlari = cikti.split("\n").filter((l) => l.includes("[açık-adım]"));
    assert.equal(acikSatirlari.length, 1, `açık-adım DRİFT satırı TEK olmalı (özet); gelen ${acikSatirlari.length}:\n${acikSatirlari.join("\n")}`);
    assert.match(acikSatirlari[0], /6 adım BEKLEMEDE/, "özet satırı 6 beklemede sayısını gösterir");
    // Kapanış motor-susmaz TAM sayar (6) — özet sayımı bozmadı
    assert.match(cikti, /MOTOR SUSMUYOR — 6 açık Adım/, `kapanış 6 açık Adım saymalı (motor-susmaz korunur):\n${cikti.slice(-500)}`);
  } finally { agac.sil(); }
});

// ── Tarihsiz Faz fikstürleri (iki evre) — CLI uçtan-uca ──────────────────────
//   MIM-1.2: tarih güçlü tavsiyedir; eksikliği iki evrede de ihlal değildir.
//   Fikstürler aşağıdaki A10 emeklilik nöbetinin girdisidir. Faz, doğuşun
//   yazdığı yerde ve hedef tarihsiz yaşar.
function fazAgaciKur(adimDurum: string) {
  return dogusAgaciKur({
    onek: "sarmal-faz-",
    ilkFaz: fazMetni({ ek: "CLI", adimlar: `        Adım( kod: ADM-CLI, durum: ${adimDurum}, ne: "adım", bağımlı: [] )` }),
  });
}
const fazCliCikti = (dizin: string) => {
  const kok = fileURLToPath(new URL("..", import.meta.url));
  const s = spawnSync(process.execPath, [join(kok, "src", "sarmal.ts"), "denetle", dizin, "--tarih", "2026-07-15"],
    { encoding: "utf8", timeout: 60000 });
  return (s.stdout ?? "") + (s.stderr ?? "");
};

// GOC-MOTOR-A10 · EMEKLİLİK NÖBETİ (2026-07-27): `faz-tarihsiz` emekli edildi.
//   Eski ihlal fikstürleri (EVRE-1 ve EVRE-2 tarihsiz Faz) korunur; ikisinde de
//   CLI çıktısının artık bu kimliği BASMAMASI nöbete alınır. MIM-1.2: tarih güçlü
//   tavsiyedir, eksikliği ihlal değildir — motor ısrar etmez.
test("A10 emeklilik: tarihsiz Faz CLI kapısında artık faz-tarihsiz BASMAZ (iki evrede de)", () => {
  for (const evre of ["beklemede", "geliştirmede"]) {
    const agac = fazAgaciKur(evre);
    try {
      const cikti = fazCliCikti(agac.kok);
      assert.ok(!cikti.includes("[faz-tarihsiz]"),
        `emekli tanı '[faz-tarihsiz]' CLI çıktısına geri dönmüş (evre: ${evre}):\n${cikti.slice(0, 700)}`);
    } finally { agac.sil(); }
  }
});

// ── 6) SIR NÖBETİ — nvidia köprüsü anahtarı hata metnine sızdırmaz ────────────
//    (Sol/GPT-5.6 mimari teftişinin kritik bulgusu: execFileSync istisnası curl
//    argümanlarını — Bearer anahtarı dahil — mesajında taşıyor, ŞEF çıktısına
//    aynen geçiyordu. sırRedakte bu sınıfı kapatır; bu test nöbetidir.)
test("nvidia: sırRedakte — Bearer/nvapi anahtarı hata metninden silinir (sır sızıntısı sınıfı kapalı)", async () => {
  const { sırRedakte } = await import("../src/kopru/nvidia.ts");
  const anahtar = "nvapi-GIZLI-abc123XYZ_deneme";
  const hamHata =
    `Command failed: curl -sS -m 180 -X POST https://integrate.api.nvidia.com/v1/chat/completions ` +
    `-H Authorization: Bearer ${anahtar} -H Accept: application/json --data-binary @-\ncurl: (6) Could not resolve host`;
  const temiz = sırRedakte(hamHata, anahtar);
  assert.ok(!temiz.includes(anahtar), "anahtar değeri redakte edilmiş metinde ASLA görünmemeli");
  assert.ok(!/nvapi-(?!\*\*\*)[A-Za-z0-9_-]+/.test(temiz), "nvapi- deseni maskesiz kalmamalı");
  assert.ok(/Bearer \*\*\*/.test(temiz), "Bearer başlığı *** ile maskelenmeli");
  assert.ok(temiz.includes("Could not resolve host"), "hata teşhis bilgisi (sır dışı) korunmalı");
  // Anahtar parametresi verilmese bile desen-tabanlı maske çalışır (savunma derinliği).
  const desensiz = sırRedakte(hamHata);
  assert.ok(!desensiz.includes(anahtar), "anahtar parametresiz çağrıda da desen maskesi yakalamalı");
});

// ── DIŞ-PROJE NÖBETİ (sahaya çıkış · Founder "eklenti hazır mı" denetimi) ─────
//   kullanımsız-tip bekçisi (RF-T6-A05) DOGFOOD-only: Sarmal'ın KENDİ deposunda
//   (kanon-sahibi) çalışır; dış-proje Sarmal'ın 98 tipini kullanmak zorunda
//   DEĞİL. Sahada yakalandı: dış-proje 90 tip gürültüyle boğuluyordu. Ayraç:
//   denetlenen dizinde oz/siniflama/kayit.json var mı (kanon sahibi mi).
//   Bu fikstür kullanıcının planını doğrudan Kitaplık olarak ilan ettiği düzeni
//   sınar; o düzen doğuştan gelmez, meşrudur ve bilinçle elle yazılı kalır.
test("denetleKomutu: DIŞ-projede kullanımsız-tip SUSAR (dogfood-only · sahaya çıkış nöbeti)", () => {
  const dizin = mkdtempSync(join(tmpdir(), "sarmal-dis-"));
  try {
    writeFileSync(join(dizin, "musteri_anadizin.sar"), `Proje( kod: PRJ-DIS, ad: "dış müşteri projesi", ne: "IDA benzeri dış bahçe" ) {
  Kitaplık( kod: KTP-P, yol: "plan/", ne: "planlar" )
}
`);
    mkdirSync(join(dizin, "plan"));
    writeFileSync(join(dizin, "plan", "is.sar"), `Blok( kod: BLK-X, ne: "iş bloğu" ) {
  Katman( kod: KAT-X, ne: "katman" ) {
    Adım( kod: ADM-X, durum: beklemede, ne: "adım", bağımlı: [] )
  }
}
`);
    const kok = fileURLToPath(new URL("..", import.meta.url));
    const s = spawnSync(process.execPath, [join(kok, "src", "sarmal.ts"), "denetle", dizin],
      { encoding: "utf8", timeout: 60000 });
    const cikti = (s.stdout ?? "") + (s.stderr ?? "");
    assert.ok(!cikti.includes("kullanımsız-tip"),
      `dış-projede kullanımsız-tip GÜRÜLTÜSÜ var — dogfood-only ayracı bozulmuş:\n${cikti.slice(0, 600)}`);
  } finally { rmSync(dizin, { recursive: true, force: true }); }
});

// ── HTR-A03 (IDA dogfood oturum-2 · FİKİR-2) — açık-hatırlatıcı özeti: CLI uçtan-uca ──
test("HTR-A03 CLI: 5 açık hatırlatıcı → DRİFT'te tek özet satırı (per-node 5 satır DEĞİL)", () => {
  const agac = dogusAgaciKur({ onek: "sarmal-htr3-" });
  try {
    const htr = Array.from({ length: 5 }, (_, i) =>
      `Hatırlatıcı( kod: HTR-${i}, durum: açık, çapa: gelecek, ne: "hatırlatma ${i}" )`).join("\n");
    agac.yaz(planYolu("htr.sar"), htr + "\n");
    const kok = fileURLToPath(new URL("..", import.meta.url));
    const s = spawnSync(process.execPath, [join(kok, "src", "sarmal.ts"), "denetle", agac.kok], { encoding: "utf8", timeout: 60000 });
    const cikti = (s.stdout ?? "") + (s.stderr ?? "");
    const satirlar = cikti.split("\n").filter((l) => l.includes("[açık-hatırlatıcı]"));
    assert.equal(satirlar.length, 1, `açık-hatırlatıcı satırı TEK olmalı (özet); gelen ${satirlar.length}`);
    assert.match(satirlar[0], /5 açık\/kararlaşmış hatırlatıcı/, "özet 5 sayısını gösterir");
  } finally { agac.sil(); }
});

// ═══════════════════════════════════════════════════════════════════════════
// ORK-4 · YÜRÜTME KENARI KAPISININ UÇTAN UCA BAĞI (KPS-ADA-A01 · ikinci tur)
//
//   `dag.test.ts` içindeki nöbetler `dagKur` işlevinin MANTIĞINI ölçer; bu nöbet
//   ise DENETİM AKIŞININ o mantığa gerçekten bağlı olduğunu ölçer. Ayrım
//   önemlidir: mantık doğru olduğu hâlde `denetim.ts` kapıyı `dagKur` çağrısına
//   geçirmezse bütün birim nöbetleri yeşil kalır ve kopuk-zincir uyarıları
//   sessizce geri döner. Ölçülmüş kusur tam olarak buydu.
//
//   MUTASYON KANITI: `denetim.ts` içindeki `dagKur(programlar, { adAlaniCozulur:
//   … })` çağrısından ikinci argüman silindiğinde birinci hüküm düşer
//   ("çözülen çapraz kenar kopuk-zincir bildirmemeli"). Geri alınmıştır.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * İki projeli çatı fikstürü: doğuşun çatısı, altında `acik` ve `kapali` projeleri
 * (her biri doğuşla doğar ve çatıya Kitaplık satırıyla katılır). Çatıyı döndürür;
 * denetim KAPALI projenin kökünden koşar.
 */
function catiFiksturuKur(hedefKodu: string) {
  const cati = calismaAlaniKur({ ad: "deneme", onek: "sarmal-ork4-", projeler: [{ ad: "acik" }, { ad: "kapali" }] });
  const acik = cati.projeler.get("acik")!;
  const kapali = cati.projeler.get("kapali")!;
  acik.yaz(acik.ilkFaz, fazMetni({ ek: "A",
    adimlar: '        Adım( kod: ADM-HEDEF, durum: beklemede, ne: "kardeş kökteki hedef" )' }));
  kapali.yaz(kapali.ilkFaz, fazMetni({ ek: "K",
    adimlar: `        Adım( kod: ADM-KAYNAK, durum: beklemede, ne: "çapraz kenar taşıyan iş", bağımlı: [ ${hedefKodu} ] )` }));
  return { cati, kapaliKok: kapali.kok };
}

function denetimCiktisi(dizin: string): string {
  const kok = fileURLToPath(new URL("..", import.meta.url));
  const s = spawnSync(process.execPath, [join(kok, "src", "sarmal.ts"), "denetle", dizin, "--tam-liste"],
    { encoding: "utf8", timeout: 120000 });
  return (s.stdout ?? "") + (s.stderr ?? "");
}

test("ORK-4 uçtan uca: kardeş kökte çözülen ad alanlı yürütme kenarı DENETİMDE kopuk-zincir bildirmez", () => {
  const { cati, kapaliKok } = catiFiksturuKur("PRJ-ACIK::ADM-HEDEF");
  try {
    const cikti = denetimCiktisi(kapaliKok);
    assert.ok(!cikti.includes("kopuk-zincir"),
      `çatının duyurduğu kardeş kökte çözülen kenar kopuk sayılmamalı:\n${cikti.slice(0, 1200)}`);
  } finally { cati.sil(); }
});

test("ORK-4 uçtan uca: kardeş kökte de bulunmayan ad alanlı hedef DENETİMDE kopuk-zincir bildirir", () => {
  const { cati, kapaliKok } = catiFiksturuKur("PRJ-ACIK::ADM-YOK");
  try {
    const cikti = denetimCiktisi(kapaliKok);
    assert.ok(cikti.includes("kopuk-zincir"),
      `gerçekten çözülmeyen hedef sessiz kalmamalı:\n${cikti.slice(0, 1200)}`);
    assert.ok(cikti.includes("PRJ-ACIK::ADM-YOK"), "uyarı hedefi adıyla anmalı");
  } finally { cati.sil(); }
});

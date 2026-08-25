// ═══════════════════════════════════════════════════════════════════════════
// yonerge-ikizi.test.ts — 👯 Yönerge İkizi Nöbeti sınamaları (KYN-MTR-A02)
//
//   Bu dosya üç kabul ölçütünün ikisini doğrudan kanıtlar, üçüncüsünün ise motor
//   tarafını kanıtlar. Birinci ölçüt, iki dosya ayrıştığında nöbetin kırılması ve
//   ayrışan satırların adresiyle raporda görünmesidir; bunu hem uydurma girdiyle
//   hem de deponun gerçek dosyalarından türetilen bir mutasyonla sınarız. İkinci
//   ölçüt, ikiz listesinin tek yerde tanımlı olmasıdır; bunu listenin biçimini ve
//   nöbetin listeye bağlı davranışını ölçerek sınarız. Üçüncü ölçüt kancanın
//   ayrışmış ikizle yapılan işlemeyi reddetmesidir; kancanın kabuk tarafı bu
//   süitin dışında koşulur, ancak kancanın dayandığı çıkış kodu burada sınanır.
//
//   İKİ KİP AYRI AYRI SINANIR. Nöbet iki yüz ölçer: çalışma ağacı ile deponun
//   sahnelenmiş yüzü. Bölüm ⑩ atılabilir gerçek bir git deposu kurar ve "biri
//   sahnelenmiş, öteki sahnelenmemiş" tuzağını kurarak sahnelenmiş kipin kırıldığını,
//   çalışma ağacı kipinin ise o senaryoda hiçbir şey göremediğini birlikte gösterir;
//   bölüm ⑪ ise iki kipin birbirinin yerine geçmediğini ve varsayılanın sessizce
//   değişmediğini nöbete bağlar. Sınamalar hiçbir depoya işleme yazmaz: `git show
//   :<yol>` index'i okur ve index'i doldurmak için `git add` yeter.
//
//   CANLI NÖBET. Bu dosyadaki 'canlı' başlıklı sınama uydurma girdi kullanmaz;
//   çalışma alanının kökündeki gerçek CLAUDE.md ile AGENTS.md dosyalarını okur.
//   Dolayısıyla ikisi ayrıştığı gün `npm test` kırmızıya döner ve ayrışma koşuda
//   da yakalanır; nöbetin yalnız kancaya bağlı kalması, kancayı atlayan bir akışta
//   ayrışmanın sessizce geçmesi anlamına gelirdi.
// ═══════════════════════════════════════════════════════════════════════════

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import {
  YONERGE_IKIZLERI,
  AYRISMA_GOSTERIM_SINIRI,
  ikizAyrismasi,
  ikizleriOku,
  ikizleriOkuSahnelenmis,
  ikizRaporu,
  satirFarklari,
  yonergeIkiziDenetle,
  type IkizKumesi,
} from "../src/yonerge-ikizi.ts";

/** Çalışma alanı kökü: sinama/ → cekirdek/ → _Sarmal/ → kök. */
const KOK = fileURLToPath(new URL("../../../", import.meta.url));

const kume = (dosyalar: string[]): IkizKumesi => ({
  ad: "deneme kümesi",
  dosyalar,
  gerekce: "Sınama kümesi; gerekçe alanının tanı önerisine taşındığı burada da görünür.",
});

// ── ① Özdeşlik: aynı metin hiçbir tanı üretmez ───────────────────────────────

test("özdeş ikizler hiçbir tanı üretmez", () => {
  const metin = "birinci satır\nikinci satır\nüçüncü satır\n";
  const tanilar = ikizAyrismasi(kume(["A.md", "B.md"]), [
    { yol: "A.md", icerik: metin },
    { yol: "B.md", icerik: metin },
  ]);
  assert.deepEqual(tanilar, []);
  assert.match(ikizRaporu(tanilar), /ayrışma yok/);
});

// ── ② Ayrışma: nöbet kırılır ve ayrışan SATIRLAR raporda görünür ─────────────

test("tek satır ayrıştığında nöbet kırılır ve ayrışan satır numarası ile iki yüzü raporda görünür", () => {
  const tanilar = ikizAyrismasi(kume(["A.md", "B.md"]), [
    { yol: "A.md", icerik: "başlık\nkural bir\nkural iki\n" },
    { yol: "B.md", icerik: "başlık\nkural BİR\nkural iki\n" },
  ]);
  assert.equal(tanilar.length, 1);
  const t = tanilar[0]!;
  assert.equal(t.duzey, "hata");
  assert.equal(t.kod, "ikiz-ayrışması");
  assert.equal(t.satir, 2, "ayrışma ikinci satırdadır ve tanı o satırı adresler");
  assert.match(t.mesaj, /«kural bir»/);
  assert.match(t.mesaj, /«kural BİR»/);
  assert.match(t.mesaj, /A\.md/);
  assert.match(t.mesaj, /B\.md/);
  // Sınır: motor eşitlemeyi ÖNERMEZ, düzeltmeyi insana bırakır.
  assert.match(t.oneri ?? "", /elle eşitle/);
  assert.match(ikizRaporu(tanilar), /👯⛔/);
});

test("birden çok satır ayrıştığında her satır ayrı ayrı adreslenir", () => {
  const tanilar = ikizAyrismasi(kume(["A.md", "B.md"]), [
    { yol: "A.md", icerik: "bir\niki\nüç\ndört\n" },
    { yol: "B.md", icerik: "bir\nIKI\nüç\nDÖRT\n" },
  ]);
  assert.deepEqual(tanilar.map((t) => t.satir), [2, 4]);
});

test("dosyalardan biri daha uzunsa fazla satırlar da ayrışma olarak bildirilir", () => {
  const tanilar = ikizAyrismasi(kume(["A.md", "B.md"]), [
    { yol: "A.md", icerik: "bir\niki\n" },
    { yol: "B.md", icerik: "bir\niki\nfazladan üçüncü\n" },
  ]);
  // Sondaki satır atlaması yüzünden iki fark doğar: üçüncü satırın kendisi ve
  // dosya sonundaki boş satırın kaymış konumu. İkisi de gerçek ayrışmadır.
  assert.deepEqual(tanilar.map((t) => t.satir), [3, 4]);
  assert.match(tanilar[0]!.mesaj, /«fazladan üçüncü»/);
  assert.match(tanilar[1]!.mesaj, /satır yok — dosya burada bitiyor/);
});

test("görünmez ayrışma da yakalanır: yalnız sondaki satır atlaması farklıysa nöbet kırılır", () => {
  const tanilar = ikizAyrismasi(kume(["A.md", "B.md"]), [
    { yol: "A.md", icerik: "tek satır\n" },
    { yol: "B.md", icerik: "tek satır" },
  ]);
  assert.equal(tanilar.length, 1, "bayt özdeşliği aranır; normalleştirme yapılmaz");
  assert.equal(tanilar[0]!.satir, 2);
});

test("tanı seli özetlenir ve özet satırı kaç bulgunun yerine geçtiğini dürüstçe söyler", () => {
  const a = Array.from({ length: 40 }, (_, i) => `satır ${i}`).join("\n");
  const b = Array.from({ length: 40 }, (_, i) => `SATIR ${i}`).join("\n");
  const tanilar = ikizAyrismasi(kume(["A.md", "B.md"]), [
    { yol: "A.md", icerik: a },
    { yol: "B.md", icerik: b },
  ]);
  assert.equal(tanilar.length, AYRISMA_GOSTERIM_SINIRI + 1, "sınır kadar bulgu artı bir özet satırı");
  const ozet = tanilar[tanilar.length - 1]!;
  assert.equal(ozet.ozetlenen, 40 - AYRISMA_GOSTERIM_SINIRI);
  assert.match(ozet.mesaj, /toplam 40 satır/);
});

// ── ③ Eksik dosya ve bozuk küme ──────────────────────────────────────────────

test("ikizlerden biri diskte yoksa bu eksiklik hata olarak bildirilir", () => {
  const tanilar = ikizAyrismasi(kume(["A.md", "B.md"]), [
    { yol: "A.md", icerik: "bir\n" },
    { yol: "B.md" },
  ]);
  assert.equal(tanilar.length, 1);
  assert.equal(tanilar[0]!.kod, "ikiz-eksik-dosya");
  assert.equal(tanilar[0]!.duzey, "hata");
  // Kurulum tuzağı öneride anılır: dosya diskte olup depoda görünmeyebilir.
  assert.match(tanilar[0]!.oneri ?? "", /yok sayma/);
});

test("tek dosyalı küme uyarı üretir çünkü bir dosya kendisiyle ayrışamaz", () => {
  const tanilar = ikizAyrismasi(kume(["A.md"]), [{ yol: "A.md", icerik: "bir\n" }]);
  assert.equal(tanilar.length, 1);
  assert.equal(tanilar[0]!.kod, "ikiz-tekil");
  assert.equal(tanilar[0]!.duzey, "uyarı");
});

// ── ④ Çıpa otorite değildir: fark simetrik olarak bildirilir ─────────────────

test("çıpa dosya doğru sayılmaz; tanı iki yüzü de göstererek kararı insana bırakır", () => {
  const ileri = ikizAyrismasi(kume(["A.md", "B.md"]), [
    { yol: "A.md", icerik: "x\n" },
    { yol: "B.md", icerik: "y\n" },
  ]);
  const geri = ikizAyrismasi(kume(["B.md", "A.md"]), [
    { yol: "A.md", icerik: "x\n" },
    { yol: "B.md", icerik: "y\n" },
  ]);
  assert.equal(ileri.length, geri.length, "yön değişse de ayrışma sayısı aynıdır");
  assert.equal(ileri[0]!.satir, geri[0]!.satir);
  for (const t of [...ileri, ...geri]) {
    assert.match(t.mesaj, /«x»/);
    assert.match(t.mesaj, /«y»/);
  }
});

// ── ⑤ Üçten çok üye: liste genişlediğinde nöbet kendiliğinden kapsar ─────────

test("kümeye üçüncü dosya eklendiğinde nöbet onu da kapsar (tek satırlık genişleme)", () => {
  const tanilar = ikizAyrismasi(kume(["A.md", "B.md", "C.md"]), [
    { yol: "A.md", icerik: "aynı\n" },
    { yol: "B.md", icerik: "aynı\n" },
    { yol: "C.md", icerik: "başka\n" },
  ]);
  assert.equal(tanilar.length, 1);
  assert.match(tanilar[0]!.mesaj, /C\.md/);
});

// ── ⑥ İkiz listesi TEK KAYNAK: biçim nöbeti ─────────────────────────────────

test("ikiz listesi tek kaynaktır ve her küme en az iki köke göreli dosya taşır", () => {
  assert.ok(YONERGE_IKIZLERI.length >= 1, "liste boş kalmamalıdır");
  for (const k of YONERGE_IKIZLERI) {
    assert.ok(k.dosyalar.length >= 2, `'${k.ad}' kümesi en az iki dosya taşımalıdır`);
    assert.equal(new Set(k.dosyalar).size, k.dosyalar.length, `'${k.ad}' kümesinde yinelenen yol var`);
    assert.ok(k.gerekce.trim().length > 0, `'${k.ad}' kümesi gerekçesiz kalmamalıdır`);
    for (const yol of k.dosyalar) {
      assert.ok(!yol.startsWith("/"), `'${yol}' mutlak yol; ikiz yolları köke görelidir`);
      assert.ok(!yol.includes(".."), `'${yol}' kökün dışına çıkıyor`);
    }
  }
});

test("yürütücü yönergesi kümesi hem CLAUDE.md hem AGENTS.md dosyalarını kapsar", () => {
  const yollar = YONERGE_IKIZLERI.flatMap((k) => k.dosyalar);
  assert.ok(yollar.includes("CLAUDE.md"));
  assert.ok(yollar.includes("AGENTS.md"));
});

// ── ⑦ CANLI NÖBET: deponun gerçek dosyaları ─────────────────────────────────

test("canlı: çalışma alanı kökündeki yönerge ikizleri bugün özdeştir", () => {
  const tanilar = yonergeIkiziDenetle(KOK);
  assert.deepEqual(
    tanilar.map((t) => t.mesaj),
    [],
    "Yönerge ikizi ayrıştı. Motor hangi yüzün doğru olduğunu bilemez ve kopyalamaz; " +
      "iki dosyayı elle eşitle, sonra süiti yeniden koş.",
  );
});

test("canlı: okuyucu katmanı gerçek dosyaları köke göreli yollarıyla bulur", () => {
  for (const k of YONERGE_IKIZLERI) {
    const okunan = ikizleriOku(KOK, k);
    assert.equal(okunan.length, k.dosyalar.length);
    for (const o of okunan) {
      assert.ok(existsSync(join(KOK, o.yol)), `'${o.yol}' kökte bulunamadı`);
      assert.equal(typeof o.icerik, "string", `'${o.yol}' okunamadı`);
    }
  }
});

// ── ⑧ MUTASYON KANITI: nöbet gerçekten koruyor mu? ──────────────────────────
//     Yeşil bir süit tek başına korumanın çalıştığını kanıtlamaz. Aşağıdaki sınama
//     deponun GERÇEK metnini alır, tek bir satırını bozar ve nöbetin bu bozulmayı
//     yakaladığını gösterir; böylece canlı sınamanın yeşil oluşu tesadüf değildir.

test("mutasyon kanıtı: gerçek yönerge metninin tek satırı bozulduğunda nöbet kırılır", () => {
  const k = YONERGE_IKIZLERI[0]!;
  const gercek = readFileSync(join(KOK, k.dosyalar[0]!), "utf8");
  const satirlar = gercek.split("\n");
  const hedef = satirlar.findIndex((s) => s.trim().length > 0);
  assert.ok(hedef >= 0, "gerçek yönerge metni boş olmamalıdır");
  const bozuk = [...satirlar];
  bozuk[hedef] = bozuk[hedef] + " ← bilinçli mutasyon";

  const tanilar = ikizAyrismasi(k, [
    { yol: k.dosyalar[0]!, icerik: gercek },
    ...k.dosyalar.slice(1).map((y) => ({ yol: y, icerik: bozuk.join("\n") })),
  ]);
  assert.ok(tanilar.length > 0, "mutasyon yakalanmadı — nöbet bu korumayı sınamıyor demektir");
  assert.equal(tanilar[0]!.kod, "ikiz-ayrışması");
  assert.equal(tanilar[0]!.satir, hedef + 1);
});

// ── ⑨ Satır farkı yardımcısının kendisi ─────────────────────────────────────

test("satırFarkları konum tabanlı eşleme yapar ve farkı olduğu gibi bildirir", () => {
  assert.deepEqual(satirFarklari("a\nb", "a\nb"), []);
  assert.deepEqual(satirFarklari("a\nb", "a\nc"), [{ satir: 2, cipa: "b", karsi: "c" }]);
  assert.deepEqual(satirFarklari("a", "a\nb"), [{ satir: 2, cipa: undefined, karsi: "b" }]);
});

// ── ⑩ SAHNELENMİŞ YÜZ: kapının gerçekten ölçmesi gereken soru ────────────────
//
//     NEDEN BU BÖLÜM VAR. Nöbet doğduğunda yalnız çalışma ağacını okuyordu ve
//     bağımsız denetçi bunun kapıyı en kritik anında kör bıraktığını gerçek bir
//     işlemeyle gösterdi: iki ikize de aynı satır eklenir, fakat yalnız biri
//     sahnelenir; çalışma ağacı özdeş kaldığı için kapı yeşil verir ve depoya
//     ayrışmış bir ikiz girer. Aşağıdaki sınamalar o senaryoyu UYDURMA girdiyle
//     değil, atılabilir bir GERÇEK git deposu kurup index'i gerçekten bozarak
//     kanıtlar; çünkü sahnelenmiş yüz taklit edilebilen bir şey değildir.
//
//     İşleme atılmaz: `git show :<yol>` index girdisini okur ve index'i doldurmak
//     için `git add` yeter. Sınama hiçbir depoya işleme yazmaz.

/** Depo kurulamıyorsa (git yoksa) sınama kendini atlar; kırmızı sahte olmaz. */
function gitVarMi(): boolean {
  try {
    execFileSync("git", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/** Atılabilir bir git deposu kurar ve içinde çalışacak işleve yolunu verir. */
function denemeDeposunda(is: (depo: string) => void): void {
  const depo = mkdtempSync(join(tmpdir(), "sarmal-ikiz-"));
  try {
    execFileSync("git", ["-C", depo, "init", "-q"], { stdio: "ignore" });
    is(depo);
  } finally {
    rmSync(depo, { recursive: true, force: true });
  }
}

const denemeKumesi: IkizKumesi = {
  ad: "deneme yönergesi",
  dosyalar: ["CLAUDE.md", "AGENTS.md"],
  gerekce: "Deneme deposu kümesi; sahnelenmiş yüzün çalışma ağacından ayrılabildiğini gösterir.",
};

test("sahnelenmiş yüz: biri sahnelenmiş öteki sahnelenmemiş ayrışma NÖBETİ KIRAR (çalışma ağacı kör kalır)", (t) => {
  if (!gitVarMi()) return t.skip("git bulunamadı; sahnelenmiş yüz bu makinede ölçülemez");

  denemeDeposunda((depo) => {
    // ① İki ikiz özdeş doğar ve ikisi de sahnelenir; başlangıç durumu temizdir.
    const taban = "# yönerge\nbirinci kural\nikinci kural\n";
    writeFileSync(join(depo, "CLAUDE.md"), taban);
    writeFileSync(join(depo, "AGENTS.md"), taban);
    execFileSync("git", ["-C", depo, "add", "-f", "CLAUDE.md", "AGENTS.md"], { stdio: "ignore" });
    assert.deepEqual(
      yonergeIkiziDenetle(depo, [denemeKumesi], "sahnelenmiş"), [],
      "özdeş ve birlikte sahnelenmiş ikizler sahnelenmiş yüzde de temiz olmalıdır",
    );

    // ② Denetçinin kurduğu tuzak: aynı satır İKİ dosyaya da yazılır, fakat
    //    zorlama her dosya için ayrı gerektiğinden yalnız biri sahnelenir.
    const yeni = taban + "üçüncü kural\n";
    writeFileSync(join(depo, "CLAUDE.md"), yeni);
    writeFileSync(join(depo, "AGENTS.md"), yeni);
    execFileSync("git", ["-C", depo, "add", "-f", "CLAUDE.md"], { stdio: "ignore" });

    // ③ Çalışma ağacı yüzü ÖZDEŞTİR — eski nöbetin kör kaldığı nokta tam burasıdır.
    assert.deepEqual(
      yonergeIkiziDenetle(depo, [denemeKumesi], "çalışma-ağacı"), [],
      "diskteki iki dosya bu senaryoda gerçekten özdeştir; kusur çalışma ağacında görünmez",
    );

    // ④ Sahnelenmiş yüz ayrışıktır ve nöbet KIRILIR. Kapının aradığı davranış budur.
    const sahne = yonergeIkiziDenetle(depo, [denemeKumesi], "sahnelenmiş");
    assert.ok(sahne.length > 0, "sahnelenmiş ayrışma yakalanmadı — kapı yine kör demektir");
    assert.equal(sahne[0]!.kod, "ikiz-ayrışması");
    assert.equal(sahne[0]!.duzey, "hata", "kanca yalnız hata düzeyinde durur");
    assert.equal(sahne[0]!.satir, 4, "ayrışma sahnelenmiş yüzün dördüncü satırındadır");
    // Rapor hangi yüzü ölçtüğünü söylemek zorundadır; söylemezse kullanıcı diskteki
    // dosyaları karşılaştırır, hiçbir fark bulamaz ve raporu yanlış sanar.
    assert.match(sahne[0]!.mesaj, /sahnelenmiş yüz/);
    assert.match(sahne[0]!.oneri ?? "", /git add -f/);

    // ⑤ Eksik olan sahneleme tamamlanınca kapı kendiliğinden açılır.
    execFileSync("git", ["-C", depo, "add", "-f", "AGENTS.md"], { stdio: "ignore" });
    assert.deepEqual(
      yonergeIkiziDenetle(depo, [denemeKumesi], "sahnelenmiş"), [],
      "iki ikiz de sahnelendikten sonra sahnelenmiş yüz temizlenmelidir",
    );
  });
});

test("sahnelenmiş yüz: hiç sahnelenmemiş ikiz eksik bildirilir (kurulum tuzağının ta kendisi)", (t) => {
  if (!gitVarMi()) return t.skip("git bulunamadı; sahnelenmiş yüz bu makinede ölçülemez");

  denemeDeposunda((depo) => {
    const metin = "# yönerge\ntek kural\n";
    writeFileSync(join(depo, "CLAUDE.md"), metin);
    writeFileSync(join(depo, "AGENTS.md"), metin);
    // Yalnız biri depoya girer; ötekisi diskte durur fakat depoya hiç eklenmez.
    execFileSync("git", ["-C", depo, "add", "-f", "CLAUDE.md"], { stdio: "ignore" });

    // Çalışma ağacında iki dosya da var ve özdeş; eski nöbet burada yeşil verirdi.
    assert.deepEqual(yonergeIkiziDenetle(depo, [denemeKumesi], "çalışma-ağacı"), []);

    const sahne = yonergeIkiziDenetle(depo, [denemeKumesi], "sahnelenmiş");
    assert.equal(sahne.length, 1);
    assert.equal(sahne[0]!.kod, "ikiz-eksik-dosya");
    assert.equal(sahne[0]!.duzey, "hata");
    assert.match(sahne[0]!.mesaj, /sahnelenmiş yüz/);
    assert.match(sahne[0]!.mesaj, /AGENTS\.md/);
    assert.match(sahne[0]!.oneri ?? "", /git add -f/);
  });
});

test("sahnelenmiş okuyucu index'i okur, diski değil: sahnelenmemiş düzenleme okumaya sızmaz", (t) => {
  if (!gitVarMi()) return t.skip("git bulunamadı; sahnelenmiş yüz bu makinede ölçülemez");

  denemeDeposunda((depo) => {
    writeFileSync(join(depo, "CLAUDE.md"), "sahnelenen metin\n");
    writeFileSync(join(depo, "AGENTS.md"), "sahnelenen metin\n");
    execFileSync("git", ["-C", depo, "add", "-f", "CLAUDE.md", "AGENTS.md"], { stdio: "ignore" });
    // Diskteki iki dosya da sahnelendikten SONRA değişir; index eski metni tutar.
    writeFileSync(join(depo, "CLAUDE.md"), "sonradan yazılan metin\n");
    writeFileSync(join(depo, "AGENTS.md"), "sonradan yazılan metin\n");

    const sahnelenmis = ikizleriOkuSahnelenmis(depo, denemeKumesi);
    for (const o of sahnelenmis) assert.equal(o.icerik, "sahnelenen metin\n", `'${o.yol}' index yüzünü vermedi`);

    const diskten = ikizleriOku(depo, denemeKumesi);
    for (const o of diskten) assert.equal(o.icerik, "sonradan yazılan metin\n", `'${o.yol}' disk yüzünü vermedi`);
  });
});

// ── ⑪ İKİ KİP AYRIDIR: biri ötekinin yerine geçmez ──────────────────────────

test("kip varsayılanı çalışma ağacıdır ve rapor ölçtüğü yüzü adıyla söyler", () => {
  const temiz = ikizAyrismasi(kume(["A.md", "B.md"]), [
    { yol: "A.md", icerik: "aynı\n" },
    { yol: "B.md", icerik: "aynı\n" },
  ]);
  assert.match(ikizRaporu(temiz, YONERGE_IKIZLERI), /çalışma ağacı yüzü/);
  assert.match(ikizRaporu(temiz, YONERGE_IKIZLERI, "sahnelenmiş"), /sahnelenmiş yüz/);

  // Aynı olgu, ölçülen yüze göre AYRI cümle kurar; kimlik ortaktır, cümle değil.
  const girdi = [{ yol: "A.md", icerik: "x\n" }, { yol: "B.md", icerik: "y\n" }];
  const agac = ikizAyrismasi(kume(["A.md", "B.md"]), girdi, "çalışma-ağacı");
  const sahne = ikizAyrismasi(kume(["A.md", "B.md"]), girdi, "sahnelenmiş");
  assert.equal(agac[0]!.kod, sahne[0]!.kod);
  assert.match(agac[0]!.mesaj, /çalışma ağacı/);
  assert.match(sahne[0]!.mesaj, /sahnelenmiş yüz/);
  assert.notEqual(agac[0]!.oneri, sahne[0]!.oneri, "iki kipin onarım yolu aynı değildir");
});

test("canlı: çalışma ağacı yüzü kip eklendikten sonra da ölçülmeye devam eder", () => {
  // Kabul ölçütü gereği açık nöbet: sahnelenmiş kip, çalışma ağacı kipinin YERİNE
  // geçmez. Bu sınama kırılırsa varsayılan kip sessizce değişmiş demektir ve
  // henüz sahnelenmemiş bir ayrışma yazarına anında görünmez olur.
  const tanilar = yonergeIkiziDenetle(KOK);
  assert.deepEqual(tanilar.map((t) => t.mesaj), [], "çalışma ağacı yüzünde ayrışma var");
  assert.match(ikizRaporu(tanilar), /çalışma ağacı yüzü/);
});

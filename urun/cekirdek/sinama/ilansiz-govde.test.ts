// ═══════════════════════════════════════════════════════════════════════════
// ilansiz-govde.test.ts — 🕳️ İLAN YOKLUĞU BEKÇİSİNİN FİKSTÜRLÜ NÖBETİ
//
//   Bu süit, Yapı-Önce hükmünün dosya düzeyindeki deliğini kapatan bekçiyi
//   gerçek bir disk fikstürü üzerinde sınar. Delik ölçülerek bulunmuştu: ilan
//   edilmiş bir kitaplığın içine konan kaynak dosyası denetimden sıfır hata
//   ile geçiyor ve motor onu hiç görmüyordu.
//
//   Süit üç şeyi ayrı ayrı kanıtlar. Birincisi bekçinin gerçekten konuştuğudur:
//   kitaplığa ve çalışma alanı köküne konan ilansız gövde için tanı üretilir.
//   İkincisi eşiğin doğru yerde durduğudur: bir rafın altında yaşayan gövde
//   sessizce kabul edilir, çünkü rafın beyanı raf düzeyinde bir desendir ve
//   altındaki gövdeleri kapsar. Üçüncüsü muafiyetin tuttuğudur: örnek dünyası,
//   üretilen dosyalar, şablon rafı, sınama fikstürleri ve giriş dosyasının
//   kendisi yanlış pozitif üretmez.
//
//   Fikstür geçici bir sanal ağaçta kurulur ve canlı çalışma ağacına hiçbir
//   bayt yazılmaz; böylece nöbetin kırmızı senaryosu süitin kendi içinde yaşar.
// ═══════════════════════════════════════════════════════════════════════════
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { belirtecle } from "../src/belirtec.ts";
import { ayristir } from "../src/ayristirici.ts";
import { iskeletPlani } from "../src/iskeletci.ts";
import { siniflamaYukle } from "../src/siniflama.ts";
import { diskTara, ilansizGovdeDenetle } from "../src/denetci.ts";
import { denetimKos } from "../src/denetim.ts";
import type { Tani } from "../src/tani.ts";

const SNF_YOL = fileURLToPath(new URL("../../../oz/siniflama/kayit.json", import.meta.url));
const snf = siniflamaYukle(SNF_YOL);

/**
 * Fikstür ağacının giriş dosyası. Ağaç bilerek her iki tipi de taşır: `bilgi/`
 * ile `ornek/` ve `sablon/` birer kitaplıktır ve yalnız raf beyan ederler,
 * `plan/` ise bir raftır ve gövde taşımaya ilan edilmiştir.
 */
const ANADIZIN = `Proje( kod: ANA, ad: "deneme", rejim: esnek,
  ne: "İlan yokluğu bekçisinin fikstür ağacı" ) {
  Kitaplık( kod: KTP-BILGI, yol: "bilgi/", ne: "kitaplık — yalnız raf taşır",
    raflar: { sozluk: "raf düzeyinde beyan edilmiş gövde deseni" } )
  Raf( kod: RAF-PLAN, yol: "plan/", ne: "raf — gövde taşımaya ilan edilmiştir" )
  Kitaplık( kod: KTP-ORNEK, yol: "ornek/", ne: "örnek dünyası — muaf",
    raflar: { uretilen: "üretilen dosyalar — muaf" } )
  Kitaplık( kod: KTP-SABLON, yol: "sablon/", ne: "şablon rafı — muaf", raflar: {} )
}
`;

/** Fikstürü geçici bir kökte kurar; dönen yol çağıranın sorumluluğundadır. */
function fiksturKur(): string {
  const kok = mkdtempSync(join(tmpdir(), "sarmal-ilansiz-"));
  for (const dizin of ["bilgi/sozluk", "plan", "ornek/uretilen", "sablon"]) {
    mkdirSync(join(kok, dizin), { recursive: true });
  }
  const yaz = (yol: string, govde: string): void =>
    writeFileSync(join(kok, yol), govde, "utf8");
  yaz("deneme_anadizin.sar", ANADIZIN);
  // İlansız gövdeler: biri kitaplığın içinde, biri çalışma alanının kökünde.
  yaz("bilgi/kacak_sozluk.sar", 'Bellek( kod: BLK-KACAK, ne: "ilansız gövde" )\n');
  yaz("bilgi/ikinci_kacak.sar", 'Bellek( kod: BLK-KACAK-2, ne: "aynı kökün ikinci belirtisi" )\n');
  yaz("kok_kacagi.sar", 'Bellek( kod: BLK-KOK, ne: "kökteki ilansız gövde" )\n');
  // İlanlı gövdeler ve muaf dünyalar: hiçbiri tanı üretmemelidir.
  yaz("plan/canli_is.sar", 'Bellek( kod: BLK-PLAN, ne: "rafın altındaki gövde" )\n');
  yaz("bilgi/sozluk/kitap.sar", 'Bellek( kod: BLK-SOZLUK, ne: "kompakt rafın altındaki gövde" )\n');
  yaz("ornek/deneme.sar", 'Bellek( kod: BLK-ORNEK, ne: "örnek dünyası" )\n');
  yaz("ornek/uretilen/cikti.sar", 'Bellek( kod: BLK-URETILEN, ne: "üretilen dosya" )\n');
  yaz("sablon/kalip.sar", 'Bellek( kod: BLK-SABLON, ne: "şablon rafı" )\n');
  return kok;
}

/** Fikstür kökünde bekçiyi saf biçimde koşar (plan + disk anlık görüntüsü). */
function bekciyiKos(kok: string): Tani[] {
  const ana = ayristir(belirtecle(ANADIZIN));
  const plan = iskeletPlani(ana, snf);
  return ilansizGovdeDenetle(plan, diskTara(kok), "deneme_anadizin.sar").map((k) => k.tani);
}

test("ilansız-gövde: kitaplığa ve köke konan ilansız kaynak dosyası tanı üretir", () => {
  const kok = fiksturKur();
  try {
    const tanilar = bekciyiKos(kok);
    const yerler = tanilar.map((t) => t.kod);
    assert.deepEqual(yerler, ["ilansız-gövde", "ilansız-gövde"],
      `beklenen iki kök yerine şu tanılar üretildi: ${JSON.stringify(tanilar.map((t) => t.mesaj))}`);
    // Kök bulgusu ile kitaplık bulgusu ayrı cümlelerle konuşur; ikisi de kendi
    // kapsayıcısını adıyla anar, çünkü düzeltme o kapsayıcının ilanına yazılır.
    const kokTanisi = tanilar.find((t) => /kökünde/.test(t.mesaj));
    const kitaplikTanisi = tanilar.find((t) => /'bilgi\/'/.test(t.mesaj));
    assert.ok(kokTanisi, "çalışma alanı kökündeki ilansız gövde bildirilmedi");
    assert.ok(kitaplikTanisi, "kitaplıktaki ilansız gövde bildirilmedi");
    assert.match(kokTanisi.mesaj, /kok_kacagi\.sar/);
    assert.match(kitaplikTanisi.mesaj, /kacak_sozluk\.sar/);
  } finally {
    rmSync(kok, { recursive: true, force: true });
  }
});

test("ilansız-gövde: aynı kökün belirtileri tek satıra toplanır ve sayısı yazılır", () => {
  const kok = fiksturKur();
  try {
    const kitaplik = bekciyiKos(kok).find((t) => /'bilgi\/'/.test(t.mesaj));
    assert.ok(kitaplik, "kitaplık bulgusu üretilmedi");
    // İki dosya tek bulguda toplanır: bir kitaplığın iki ilansız gövde taşıması
    // iki ayrı olgu değil, tek bir eksik ilanın iki belirtisidir.
    assert.match(kitaplik.mesaj, /2 kaynak dosyası/);
    assert.match(kitaplik.mesaj, /ikinci_kacak\.sar/);
  } finally {
    rmSync(kok, { recursive: true, force: true });
  }
});

test("ilansız-gövde: raf, kompakt raf, örnek, üretilen, şablon ve giriş dosyası temizdir", () => {
  const kok = fiksturKur();
  try {
    const tanilar = bekciyiKos(kok);
    const metinler = tanilar.map((t) => t.mesaj).join("\n");
    for (const muaf of ["canli_is.sar", "kitap.sar", "deneme.sar", "cikti.sar", "kalip.sar"]) {
      assert.ok(!metinler.includes(muaf),
        `yanlış pozitif: '${muaf}' bildirilmemeliydi, çünkü ya ilanlı bir rafın altında yaşıyor ya da muafiyet listesindedir`);
    }
    // Giriş dosyası adı cümlede geçer (düzeltmenin yazılacağı adres olarak),
    // bu yüzden muafiyeti ad araması ile değil SAYIMLA ölçülür: kökte yalnız
    // bir ilansız gövde vardır ve giriş dosyası ona katılmamıştır.
    const kokTanisi = tanilar.find((t) => /kökünde/.test(t.mesaj));
    assert.ok(kokTanisi, "kök bulgusu üretilmedi");
    assert.match(kokTanisi.mesaj, /1 kaynak dosyası/,
      "giriş dosyası ilansız gövde sayılmış — kendi alt ağacını ilan eden belge kendi ilanını bekleyemez");
  } finally {
    rmSync(kok, { recursive: true, force: true });
  }
});

test("ilansız-gövde: eşik raf ile kitaplığı ayırır — tip değişince hüküm de değişir", () => {
  const kok = fiksturKur();
  try {
    // Aynı disk, tek fark ilanın tipi: kitaplık raf olarak beyan edilirse aynı
    // gövde artık ilanlıdır. Bu, eşiğin gerçekten raf/kitaplık ayrımından
    // okunduğunu gösterir; sabit bir klasör listesinden değil.
    const rafliAna = ANADIZIN
      .replace('Kitaplık( kod: KTP-BILGI, yol: "bilgi/", ne: "kitaplık — yalnız raf taşır",\n    raflar: { sozluk: "raf düzeyinde beyan edilmiş gövde deseni" } )',
        'Raf( kod: RAF-BILGI, yol: "bilgi/", ne: "artık raf — gövde taşır" )');
    assert.notEqual(rafliAna, ANADIZIN, "fikstür dönüşümü uygulanmadı");
    const plan = iskeletPlani(ayristir(belirtecle(rafliAna)), snf);
    const tanilar = ilansizGovdeDenetle(plan, diskTara(kok), "deneme_anadizin.sar");
    assert.ok(!tanilar.some((k) => /'bilgi\/'/.test(k.tani.mesaj)),
      "kitaplık rafa dönüştüğü hâlde gövde hâlâ ilansız sayılıyor — eşik tipi okumuyor");
  } finally {
    rmSync(kok, { recursive: true, force: true });
  }
});

test("ilansız-gövde: gözlem düzeyinde doğar ve düzeltmeyi gösteren öneri taşır", () => {
  const kok = fiksturKur();
  try {
    for (const tani of bekciyiKos(kok)) {
      // Yeni bir hüküm doğrudan uyarı ya da hata düzeyinde doğamaz: terfi
      // kapısı sayacı sıfırlanmadan kademe atlanmasını yasaklar.
      assert.equal(tani.duzey, "bilgi", tani.mesaj);
      assert.ok(tani.oneri && tani.oneri.includes("Raf( kod: RAF-"),
        "öneri düzeltmeyi tarif ediyor ama yapıştırılabilir bir iskelet göstermiyor");
      assert.ok(tani.dilMetinleri?.en.mesaj, "tanının İngilizce okuma yüzü yok");
    }
  } finally {
    rmSync(kok, { recursive: true, force: true });
  }
});

test("ilansız-gövde: bekçi Problems yüzeyine yayılır ve ilan satırını gösterir", () => {
  const kok = fiksturKur();
  try {
    // KYN-MTR-A05: eklentinin canlı tanı yolu artık CLI'nin çağırdığı AYNI gövdeyi
    // (`denetimKos`) çağırıp tam akışı tek-kaynaklı panel kod kümesiyle süzüyor;
    // burada görünen bulgu — ilansız-gövde panelde de ilan edilmiş kimliklerden
    // biridir (bkz. cekirdek/src/kapi-kapsami.ts) — Problems panelinde de görünür.
    const bulgular = denetimKos(kok, { snfYol: SNF_YOL }).akis
      .flatMap((r) => r.tanilar.map((tani) => ({ dosya: r.dosya, tani })))
      .filter((k) => k.tani.kod === "ilansız-gövde");
    assert.equal(bulgular.length, 2, "canlı yüzeyde bekçi susuyor");
    for (const { dosya, tani } of bulgular) {
      assert.ok(dosya.endsWith("deneme_anadizin.sar"),
        "tanı giriş dosyasına bağlanmalı, çünkü düzeltme oraya yazılır");
      assert.equal(typeof tani.satir, "number");
    }
    // Kitaplık bulgusu ilanın yaşadığı satırı gösterir; kök bulgusunun ilan
    // satırı yoktur ve dosya başına düşer.
    const kitaplik = bulgular.find((k) => /'bilgi\/'/.test(k.tani.mesaj));
    assert.ok(kitaplik && kitaplik.tani.satir > 0,
      "kitaplık bulgusu ilanın satırını göstermeli — düzeltme o satıra yazılır");
  } finally {
    rmSync(kok, { recursive: true, force: true });
  }
});

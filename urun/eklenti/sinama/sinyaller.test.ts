// ═══════════════════════════════════════════════════════════════════════════
// sinyaller.test.ts — 🚦 SİNYALLER SEKMESİNİN NÖBETİ (PNL-A09 · OZK-14 · YAS-3.1)
//
//   Kabul ölçütlerinin saf çekirdekteki ayağı:
//     · Üç bant YAS-3.1'in üç düzeyiyle birebir eşleşir ve hiçbir tanı başka bir
//       düzeyin bandına düşmez — tanı sicilinin bütün kayıtları ve bütün düzeyleri
//       üzerinden ölçülür.
//     · Sekmedeki tanı sayısı, denetim sonucundan Hatırlatıcılar yüzeyine yönlenen
//       tanılar çıkınca kalanın sayısına eşittir — motorun gerçek çıktısı (Sarmal
//       deposunun kendi .sar dosyaları) üzerinden ölçülür; düzey başına da eşittir.
//     · Her tanı panelde yalnız bir kez görünür (YUZ-3.3): Hatırlatıcılar yüzeyine
//       yönlenen tanı Sinyaller'de yoktur, öteki her tanı Sinyaller'de tam bir kez
//       yer alır; yönlendirme motorun `beklenenSunumYuzeyi` kararıdır.
//     · Kural bağı olan her tanıda kanon maddesi görünür, bağı olmayanda madde boştur
//       — sicilin kural bağı ve kanonun kendi `tanı:` kenarlarından kurulan harita.
//     · Türe göre toplama (PNL-A28): projenin banttaki kayıtları türlere toplanır,
//       türlerin sayıları projenin ve bandın sayısıyla tutar, hiçbir kayıt kaybolmaz
//       ve ortak öneri yalnız bütün kayıtlarda aynen geçen cümlelerden kurulur.
//   Panelde çizim, tıklama ve Makinist'ten çıkış panel.test.ts dosyasındadır; gerçek
//   VS Code ölçümü sinama_vscode/suite/sinyaller.test.ts dosyasındadır.
// ═══════════════════════════════════════════════════════════════════════════

import "./dil-kur.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { YENI_TANI_KANONU, YENI_TANI_INDEKS, ONCEKI_TANI_KODLARI } from "../../cekirdek/src/tani-sicili.ts";
import { ayristir } from "../../cekirdek/src/ayristirici.ts";
import { belirtecle } from "../../cekirdek/src/belirtec.ts";
import { dogrula } from "../../cekirdek/src/dogrulayici.ts";
import { siniflamaYukle } from "../../cekirdek/src/siniflama.ts";
import type { Program } from "../../cekirdek/src/sozdizim.ts";
import type { Tani } from "../../cekirdek/src/tani.ts";
import {
  BANT_DUZEYI, SINYAL_BANTLARI, KayitDefteri, sinyalPanosu, duzeyBandi, kanonMaddeleri, kanonTaniHaritasi, ortakCumleler, sinyalModeli,
  type SinyalModeli,
} from "../src/sinyaller-cekirdek.ts";
import { panoKaydi, yuzeyeAyir, type YuzeyKaydi } from "../src/yuzey-cekirdek.ts";
import { panoKumeMetni } from "../src/yuzey-metinleri.ts";
import { beklenenSunumYuzeyi, ILERI_BAGLAM_KIMLIKLERI } from "../../cekirdek/src/denetim.ts";

/** Denetim tarafının yönlendirmesi: kayıt Hatırlatıcılar yüzeyine mi gider (motorun kararı)? */
const hatirlaticiya = (k: YuzeyKaydi): boolean => beklenenSunumYuzeyi(k.tani) === "hatırlatıcılar";

const DEPO = fileURLToPath(new URL("../../..", import.meta.url));

function sarDosyalari(dizin: string, cikti: string[] = []): string[] {
  for (const ad of readdirSync(dizin)) {
    if (ad.startsWith(".") || ["node_modules", "dist", "dist-sinama"].includes(ad)) continue;
    const yol = join(dizin, ad);
    if (statSync(yol).isDirectory()) sarDosyalari(yol, cikti);
    else if (ad.endsWith(".sar")) cikti.push(yol);
  }
  return cikti;
}

const tani = (kod: string, duzey: string, satir = 1): Tani => ({ kod, duzey, mesaj: kod, satir, sutun: 1 }) as Tani;
const kayit = (t: Tani, dosya = "/p/a.sar", proje = { kod: "P", ad: "Proje" }): YuzeyKaydi => ({ proje, dosya, tani: t });
const bagsiz = (): string[] => [];

test("PNL-A09 · üç bant YAS-3.1'in üç düzeyiyle birebir eşleşir: Dur HATA, Dikkat UYARI, Bilgi BİLGİ; bilinmeyen düzey hiçbir banda yerleşmez", () => {
  assert.deepEqual([...SINYAL_BANTLARI], ["dur", "dikkat", "bilgi"]);
  assert.deepEqual(BANT_DUZEYI, { dur: "hata", dikkat: "uyarı", bilgi: "bilgi" });
  assert.equal(new Set(Object.values(BANT_DUZEYI)).size, 3, "iki bant aynı düzeyi taşıyor");
  for (const b of SINYAL_BANTLARI) assert.equal(duzeyBandi(BANT_DUZEYI[b]), b, `${b}: eşleme geri dönmüyor`);
  for (const yabanci of ["", "kritik", "HATA", "uyari", "toString", "__proto__"]) assert.equal(duzeyBandi(yabanci), undefined, `${yabanci}: bilinmeyen düzey bir banda düştü`);
  const m = sinyalModeli([kayit(tani("x", "kritik"))], undefined, bagsiz);
  assert.equal(m.toplam, 0);
  assert.equal(m.bantsiz, 1, "bandı olmayan kayıt sessizce yutuldu ya da bir banda yerleşti");
});

test("PNL-A09 · tanı sicilinin bütün kayıtları ve bütün düzeyleri: her tanı yalnız kendi düzeyinin bandına düşer", () => {
  const kayitlar: YuzeyKaydi[] = [];
  for (const k of YENI_TANI_KANONU) {
    for (const d of new Set([k.kademe, k.kanonDüzey, ...(k.tarihselKademe ? [k.tarihselKademe] : [])])) kayitlar.push(kayit(tani(k.kod, d)));
  }
  // Hatırlatıcılar yüzeyine yönlenen kodlar her düzeyde de gelse Sinyaller'e girmez (yönlendirme koda bağlıdır).
  for (const kod of ILERI_BAGLAM_KIMLIKLERI) for (const d of ["hata", "uyarı", "bilgi"]) kayitlar.push(kayit(tani(kod, d)));
  assert.ok(kayitlar.length >= YENI_TANI_KANONU.length, "sicil boş okundu");
  const m = sinyalModeli(kayitlar, undefined, bagsiz);
  assert.equal(m.bantsiz, 0, "sicilde bandı olmayan bir düzey var");
  const sinyalde = kayitlar.filter((k) => !hatirlaticiya(k));
  assert.ok(sinyalde.length < kayitlar.length, "fikstürde Hatırlatıcılar yüzeyine yönlenen kayıt yok");
  assert.equal(m.hatirlatici, kayitlar.length - sinyalde.length, "Hatırlatıcılar yüzeyine yönlenen kayıt Sinyaller'e girdi ya da öteki bir kayıt düştü");
  assert.equal(m.toplam, sinyalde.length, "bir kayıt düştü ya da ikizlendi");
  for (const b of m.bantlar) {
    for (const p of b.projeler) for (const s of p.satirlar) {
      assert.equal(s.kayit.tani.duzey, BANT_DUZEYI[b.bant], `${s.kayit.tani.kod}: ${s.kayit.tani.duzey} düzeyindeki tanı ${b.bant} bandına düştü`);
      assert.equal(s.bant, b.bant);
      assert.ok(!ILERI_BAGLAM_KIMLIKLERI.has(s.kayit.tani.kod), `${s.kayit.tani.kod}: Hatırlatıcılar yüzeyine yönlenen tanı Sinyaller'de`);
    }
  }
  const sayi = (d: string): number => sinyalde.filter((k) => k.tani.duzey === d).length;
  assert.deepEqual(m.bantlar.map((b) => b.sayi), [sayi("hata"), sayi("uyarı"), sayi("bilgi")]);
});

test("PNL-A09 · sekmedeki tanı sayısı denetim sonucunun sayısına eşittir: motorun Sarmal deposundaki gerçek çıktısı, toplamda ve düzey başına", () => {
  const snf = siniflamaYukle(join(DEPO, "oz", "siniflama", "kayit.json"));
  const kayitlar: YuzeyKaydi[] = [];
  for (const dosya of sarDosyalari(DEPO)) {
    const ham = readFileSync(dosya, "utf8");
    let program: Program;
    try { program = ayristir(belirtecle(ham)); } catch { continue; }
    const proje = { kod: dosya.includes("/ogreti/") ? "ORNEK" : "SARMAL", ad: dosya.includes("/ogreti/") ? "Örnek" : "Sarmal" };
    for (const t of dogrula(program, snf, dosya, ham)) kayitlar.push({ proje, dosya, tani: t });
  }
  assert.ok(kayitlar.length > 50, `fikstür küçük: ${kayitlar.length} tanı`);
  const m = sinyalModeli(kayitlar, "SARMAL", (kod) => kanonMaddeleri(kod));
  // Sayı = denetim sonucu eksi Hatırlatıcılar yüzeyine yönlenenler; depoda o tanılardan gerçekten vardır.
  const sinyalde = kayitlar.filter((k) => !hatirlaticiya(k));
  assert.ok(sinyalde.length < kayitlar.length, "depoda Hatırlatıcılar yüzeyine yönlenen tanı yok: nöbet hiçbir şeyi ölçmüyor");
  assert.equal(m.toplam, sinyalde.length, "Sinyaller sekmesinin sayısı denetim sonucu eksi Hatırlatıcılar yüzeyine yönlenenlerden ayrıştı");
  assert.equal(m.hatirlatici, kayitlar.length - sinyalde.length);
  assert.equal(m.bantsiz, 0);
  for (const b of m.bantlar) assert.equal(b.sayi, sinyalde.filter((k) => k.tani.duzey === b.duzey).length, `${b.bant}: düzey sayısı ayrıştı`);
  // Hiçbir kayıt iki kez yerleşmez: modeldeki kayıt nesneleri girdinin kendisidir ve tekildir.
  const yerlesen = m.bantlar.flatMap((b) => b.projeler.flatMap((p) => p.satirlar.map((s) => s.kayit)));
  assert.equal(new Set(yerlesen).size, sinyalde.length);
  // Panelde her tanı bir kez (YUZ-3.3): Makinist'in Hatırlatıcılar grubunu besleyen dağıtım ile Sinyaller ayrık ve
  // birlikte tamdır; Bilgi bandı Bildirimler yüzeyinin (durum çubuğundaki Gözlemler sayacının) kendisidir.
  const dagilim = yuzeyeAyir(kayitlar);
  const anahtar = (k: YuzeyKaydi): string => `${k.dosya}:${k.tani.satir}:${k.tani.sutun}:${k.tani.kod}`;
  const makinistte = new Set(dagilim.hatırlatıcılar.map(anahtar));
  assert.deepEqual(yerlesen.filter((k) => makinistte.has(anahtar(k))).map(anahtar), [], "aynı tanı hem Makinist'te hem Sinyaller'de");
  assert.equal(m.bantlar.find((b) => b.bant === "bilgi")!.sayi, dagilim.bildirimler.length, "Bilgi bandı eski Gözlemler kümesinden ayrıştı");
  assert.equal(m.bantlar.filter((b) => b.bant !== "bilgi").reduce((t, b) => t + b.sayi, 0), dagilim.problems.length, "Dur ve Dikkat Sorunlar kümesinden ayrıştı");
  // Odaktaki proje her bandın en üstünde ve açıktır; bant içinde kayıtlar dosyaya, sonra satıra göre dizilir.
  for (const b of m.bantlar) {
    if (b.projeler.some((p) => p.proje.kod === "SARMAL")) assert.equal(b.projeler[0]!.proje.kod, "SARMAL", `${b.bant}: odaktaki proje üstte değil`);
    for (const p of b.projeler) {
      assert.equal(p.odakta, p.proje.kod === "SARMAL");
      const sira = p.satirlar.map((s) => [s.kayit.dosya, s.kayit.tani.satir] as const);
      for (let i = 1; i < sira.length; i++) {
        const [d0, s0] = sira[i - 1]!; const [d1, s1] = sira[i]!;
        assert.ok(d0.localeCompare(d1, "tr") < 0 || (d0 === d1 && s0 <= s1), `${b.bant}/${p.proje.kod}: kayıtlar dosya ve satır sırasında değil`);
      }
    }
  }
});

/**
 * PNL-A28 nöbetinin ölçüsü: her bantta ve her projede türlerin sayısı kayıtlardaki farklı tür sayısıdır,
 * türlerin kayıtları birleşince projenin kayıtlarının tamamı çıkar (kayıp ya da çift yok), tür sayıları
 * projenin ve bandın sayısıyla tutar, türler çoktan aza dizilir ve tür içinde kayıtlar dosya ve satır sırasındadır.
 */
function turToplamasiniOlc(m: SinyalModeli): void {
  for (const b of m.bantlar) {
    let bantToplami = 0;
    for (const p of b.projeler) {
      const yer = `${b.bant}/${p.proje.kod}`;
      assert.equal(p.turler.length, new Set(p.satirlar.map((s) => s.kayit.tani.kod)).size, `${yer}: tür sayısı farklı kod sayısından ayrıştı`);
      const turKayitlari = p.turler.flatMap((t) => t.satirlar);
      assert.equal(turKayitlari.length, p.satirlar.length, `${yer}: türlerin toplamı projenin sayısıyla tutmuyor`);
      assert.equal(new Set(turKayitlari).size, p.satirlar.length, `${yer}: bir kayıt iki türde ya da hiçbirinde`);
      assert.ok(p.satirlar.every((s) => turKayitlari.includes(s)), `${yer}: kayıt kayboldu`);
      for (const t of p.turler) assert.ok(t.satirlar.every((s) => s.kayit.tani.kod === t.kod), `${yer}/${t.kod}: başka türün kaydı`);
      for (let i = 1; i < p.turler.length; i++) {
        const [a, c] = [p.turler[i - 1]!, p.turler[i]!];
        assert.ok(a.satirlar.length > c.satirlar.length || (a.satirlar.length === c.satirlar.length && a.kod.localeCompare(c.kod, "tr") < 0),
          `${yer}: türler çoktan aza dizili değil (${a.kod} ${a.satirlar.length} · ${c.kod} ${c.satirlar.length})`);
      }
      for (const t of p.turler) {
        const sira = t.satirlar.map((s) => p.satirlar.indexOf(s));
        assert.deepEqual(sira, [...sira].sort((x, y) => x - y), `${yer}/${t.kod}: tür içinde kayıtlar dosya sırasını yitirdi`);
      }
      bantToplami += p.turler.reduce((t, x) => t + x.satirlar.length, 0);
    }
    assert.equal(bantToplami, b.sayi, `${b.bant}: tür toplamları bandın sayısıyla tutmuyor`);
  }
}

test("PNL-A28 · türe göre toplama motorun Sarmal deposundaki gerçek çıktısında: tür sayısı farklı kod sayısıdır, toplamlar proje ve bant sayısıyla tutar, hiçbir kayıt kaybolmaz, türler çoktan aza", () => {
  const snf = siniflamaYukle(join(DEPO, "oz", "siniflama", "kayit.json"));
  const kayitlar: YuzeyKaydi[] = [];
  for (const dosya of sarDosyalari(DEPO)) {
    const ham = readFileSync(dosya, "utf8");
    let program: Program;
    try { program = ayristir(belirtecle(ham)); } catch { continue; }
    const proje = { kod: dosya.includes("/ogreti/") ? "ORNEK" : "SARMAL", ad: dosya.includes("/ogreti/") ? "Örnek" : "Sarmal" };
    for (const t of dogrula(program, snf, dosya, ham)) kayitlar.push({ proje, dosya, tani: t });
  }
  const m = sinyalModeli(kayitlar, "SARMAL", (kod) => kanonMaddeleri(kod));
  // Nöbet bir şey ölçsün: en az bir projede aynı türden birden çok kayıt toplanmış olmalı.
  assert.ok(m.bantlar.some((b) => b.projeler.some((p) => p.turler.some((t) => t.satirlar.length > 1))), "gerçek çıktıda çok kayıtlı tür yok: nöbet hiçbir şeyi ölçmüyor");
  turToplamasiniOlc(m);
});

test("PNL-A28 · türe göre toplama: çoktan aza ve eşitlikte kimlik sırası; ortak öneri yalnız bütün kayıtlarda aynen geçen cümlelerdir, anlam iletilerin ortak son cümlesidir; hiçbir metin değişmez", () => {
  const t = (kod: string, satir: number, mesaj: string, oneri?: string, dosya = "/p/a.sar"): YuzeyKaydi =>
    kayit({ kod, duzey: "bilgi", mesaj, satir, sutun: 1, ...(oneri ? { oneri } : {}) } as Tani, dosya);
  const girdi = [
    t("b-tür", 9, "B bir. Ortak kural.", "Bağı ekle. Örnek: `B1` yaz."),
    t("a-tür", 4, "A tek."),
    t("b-tür", 2, "B iki. Ortak kural.", "Bağı ekle. Örnek: `B2` yaz.", "/p/c.sar"),
    t("c-tür", 7, "C bir.", "Sil."),
    t("b-tür", 5, "B üç. Ortak kural.", "Bağı ekle. Örnek: `B3` yaz."),
    t("c-tür", 1, "C iki.", "Taşı."),
  ];
  const kopya = JSON.stringify(girdi);
  const m = sinyalModeli(girdi, "P", bagsiz);
  const p = m.bantlar.find((b) => b.bant === "bilgi")!.projeler[0]!;
  assert.deepEqual(p.turler.map((x) => [x.kod, x.satirlar.length]), [["b-tür", 3], ["c-tür", 2], ["a-tür", 1]]);
  // Tür içinde kayıtlar dosyaya, sonra satıra göre kalır.
  assert.deepEqual(p.turler[0]!.satirlar.map((s) => `${s.kayit.dosya}:${s.kayit.tani.satir}`), ["/p/a.sar:5", "/p/a.sar:9", "/p/c.sar:2"]);
  assert.equal(p.turler[0]!.ortakOneri, "Bağı ekle.", "ortak öneri ilk cümle olmalı; kayda özgü örnek ortak değildir");
  assert.equal(p.turler[0]!.ortakAnlam, "Ortak kural.");
  assert.equal(p.turler[1]!.ortakOneri, undefined, "ortak cümlesi olmayan önerilerden ortak öneri uydurulmamalı");
  assert.equal(p.turler[1]!.ortakAnlam, undefined);
  // Sınır: tanıların düzeyi, sayısı ve metni değişmez.
  assert.equal(JSON.stringify(girdi), kopya, "toplama tanı kaydını değiştirdi");
  assert.equal(m.toplam, girdi.length);
  turToplamasiniOlc(m);
  // Ortak cümle: bir metin boşsa ortak cümle yoktur; tek metnin bütün cümleleri ortaktır.
  assert.deepEqual(ortakCumleler(["Bir. İki.", undefined]), []);
  assert.deepEqual(ortakCumleler(["Bir. İki."]), ["Bir.", "İki."]);
  // Kayıtların yalnız bir kısmında geçen cümle ortak değildir.
  assert.deepEqual(ortakCumleler(["Sil. Kaydet.", "Sil.", "Taşı. Kaydet."]), []);
  assert.deepEqual(ortakCumleler(["Önce kapat. Örnek: `durum: tamamlandı` yap.", "Önce kapat. Örnek: `durum: beklemede` yap."]), ["Önce kapat."]);
});

test("PNL-A09 · kanon maddesi: sicilin kural bağı ve kanonun tanı: kenarlarından okunur; bağı olmayan tanıda madde uydurulmaz", () => {
  // Sicilin her kaydı kendi maddesini taşır.
  for (const k of YENI_TANI_KANONU) assert.ok(kanonMaddeleri(k.kod).includes(k.madde), `${k.kod}: sicil bağı (${k.madde}) okunmadı`);
  // Haritasız, sicilde maddesi olmayan tanının maddesi boştur.
  const bagsizKod = ONCEKI_TANI_KODLARI.find((k) => !YENI_TANI_INDEKS.has(k))!;
  assert.deepEqual(kanonMaddeleri(bagsizKod), [], `${bagsizKod}: bağı olmayan tanıya madde uyduruldu`);
  assert.deepEqual(kanonMaddeleri("hiç-yok-böyle-bir-tanı"), []);
  // Kural↔kapı haritası kanonun kendisinden kurulur (kurallar aracının okuduğu kenar).
  const kanon = join(DEPO, "yasa", "kanon");
  const programlar = readdirSync(kanon).filter((f) => f.endsWith(".sar")).map((f) => ayristir(belirtecle(readFileSync(join(kanon, f), "utf8"))));
  const harita = kanonTaniHaritasi(programlar);
  assert.ok(harita.size > 20, `harita boş ya da küçük: ${harita.size}`);
  // Haritadaki her bağ kanonda gerçekten yazılıdır: maddenin kaynağında tanı kodu `tanı:` kenarında durur.
  const metin = readdirSync(kanon).filter((f) => f.endsWith(".sar")).map((f) => readFileSync(join(kanon, f), "utf8")).join("\n");
  for (const [kod, maddeler] of harita) for (const madde of maddeler) assert.ok(metin.includes(madde) && metin.includes(kod), `${madde} → ${kod} kanonda yok`);
  // Harita sicilde maddesi olmayan eski tanılara da madde verir; sicil bağı önce gelir ve hiçbir madde iki kez yazılmaz.
  const eski = [...harita.keys()].find((k) => !YENI_TANI_INDEKS.has(k))!;
  assert.ok(eski, "haritada sicil dışı tanı yok; ölçüm boş küme üstünde koşar");
  assert.deepEqual(kanonMaddeleri(eski, harita), harita.get(eski));
  const ikisi = [...harita.keys()].find((k) => YENI_TANI_INDEKS.has(k));
  if (ikisi) {
    const m = kanonMaddeleri(ikisi, harita);
    assert.equal(m[0], YENI_TANI_INDEKS.get(ikisi)!.madde, "sicil bağı önce gelmeli");
    assert.equal(new Set(m).size, m.length, "aynı madde iki kez yazıldı");
  }
  // Modelde madde alanı yalnız bağı olanda doludur.
  const m = sinyalModeli([kayit(tani(YENI_TANI_KANONU[0]!.kod, "hata")), kayit(tani(bagsizKod, "uyarı"), "/p/b.sar")], undefined, (kod) => kanonMaddeleri(kod));
  const satirlar = m.bantlar.flatMap((b) => b.projeler.flatMap((p) => p.satirlar));
  assert.deepEqual(satirlar.map((s) => s.maddeler.length > 0), [true, false]);
});

test("PNL-A09 · YAS-3.3 gruplaması: odaktaki proje adı ne olursa olsun bandın en üstünde ve açıktır; ötekiler adlarına göre dizilir ve kapalıdır", () => {
  const p = (kod: string, ad: string) => ({ kod, ad });
  const kayitlar = [
    kayit(tani("a", "hata", 3), "/z/z.sar", p("ZETA", "Zeta")),
    kayit(tani("a", "hata", 1), "/a/a.sar", p("ALFA", "Alfa")),
    kayit(tani("a", "hata", 2), "/m/m.sar", p("MU", "Mü")),
    kayit(tani("b", "hata", 9), "/z/b.sar", p("ZETA", "Zeta")),
  ];
  const m = sinyalModeli(kayitlar, "ZETA", bagsiz);
  const dur = m.bantlar[0]!;
  assert.deepEqual(dur.projeler.map((x) => [x.proje.kod, x.odakta]), [["ZETA", true], ["ALFA", false], ["MU", false]], "odaktaki proje üstte değil ya da ötekiler ada göre dizilmemiş");
  assert.deepEqual(dur.projeler[0]!.satirlar.map((s) => s.kayit.dosya), ["/z/b.sar", "/z/z.sar"], "bant içinde tanılar dosyaya göre dizilmemiş");
  assert.deepEqual(sinyalModeli(kayitlar, undefined, bagsiz).bantlar[0]!.projeler.map((x) => x.proje.kod), ["ALFA", "MU", "ZETA"]);
});

test("PNL-A09 · kayıt defteri: kapsam süzgecinden geçen kayıtlar yayınlanır; budama, silme ve boşaltma kayıt bırakmaz", () => {
  const yayinlar: string[][] = [];
  const d = new KayitDefteri<string>((k) => yayinlar.push(k), (dosya) => !dosya.startsWith("/dis/"));
  d.yaz("/p/a.sar", ["a1", "a2"], false);
  d.yaz("/dis/b.sar", ["b1"], false);
  d.yaz("/p/c.sar", ["c1"]);
  assert.deepEqual(yayinlar.at(-1), ["a1", "a2", "c1"], "kapsam dışı kayıt yayınlandı");
  d.buda(new Set(["/p/c.sar", "/dis/b.sar"]));
  d.yayımla();
  assert.deepEqual(yayinlar.at(-1), ["c1"]);
  d.sil("/p/c.sar");
  assert.deepEqual(yayinlar.at(-1), []);
  d.yaz("/p/a.sar", ["a1"], false);
  d.temizle();
  assert.deepEqual(d.gorunenler(), []);
});

test("PNL-A31 · Sinyaller pano metni: tek tanı Makinist'in kayıt bloğunun aynısıdır ve kanon maddesi eklenir; grup başlıkla bütün tanıları alt alta verir, boş küme pano üretmez", () => {
  const a = { ...tani("T-1", "hata", 4), oneri: "şöyle düzelt" } as Tani;
  const m = sinyalModeli([kayit(a), kayit(tani("T-2", "hata", 9), "/p/b.sar")], undefined, (k) => (k === "T-1" ? ["YAS-3.1"] : []));
  const satirlar = m.bantlar[0]!.projeler[0]!.satirlar;
  const tek = sinyalPanosu([satirlar[0]!])!;
  assert.equal(tek.adet, 1);
  assert.equal(tek.metin, panoKaydi(satirlar[0]!.kayit, ["YAS-3.1"]));
  for (const p of ["T-1", "hata düzeyi", "Ne yapmalı: şöyle düzelt", "Kanon maddesi: YAS-3.1", "Kaynak: /p/a.sar:4:1"]) assert.ok(tek.metin.includes(p), p);
  assert.ok(!sinyalPanosu([satirlar[1]!])!.metin.includes("Kanon maddesi"), "bağı olmayan tanıda madde uydurulmaz");
  const grup = sinyalPanosu(satirlar, "Proje")!;
  assert.equal(grup.adet, 2);
  assert.equal(grup.metin, panoKumeMetni("Proje", satirlar.map((s) => panoKaydi(s.kayit, s.maddeler))));
  assert.equal(sinyalPanosu([], "Boş"), undefined);
});

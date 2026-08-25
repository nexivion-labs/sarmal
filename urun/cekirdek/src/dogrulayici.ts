// ═══════════════════════════════════════════════════════════════════════════
// dogrulayici.ts — Doğrulayıcı (Faz 3)
//
//   Söz dizim ağacını SNF-0'a karşı denetler → Tanı[] (Türkçe drift + öneri).
//   Denetimler:
//     • bilinmeyen-tip : widget tipi Sınıflama'da VE belge ilanında yok (typo kalkanı)
//     • izinsiz-sarma  : ebeveyn bu çocuğu saramaz (TIP-2.4; öneri: doğru ebeveyn)
//     • TIP-1 anlık tip: «Tip Ad(aile, içerir){ne:}» İLANI tipi geçerli kılar —
//       kural: "tanımsız yasak değil, İLANSIZ yasak" (Founder kararı 2026-07-02).
//       aile-geçersiz (uyarı) · tarif-eksik: ne yoksa çevirmen ajan çeviremez (uyarı)
//       · içerir sarmayı TANIMLAR (parent-user) · ilanlı tip çocuk olarak serbest yerleşir (v1).
// ═══════════════════════════════════════════════════════════════════════════

import type { Program, Dugum, Deger } from "./sozdizim.ts";
import type { Siniflama } from "./siniflama.ts";
import type { Tani } from "./tani.ts";
import { kuralDenetle } from "./kuralci.ts";
import { temaDenetle } from "./tema.ts";
import { taniSicili, YENI_TANI_INDEKS } from "./tani-sicili.ts";   // RF-T6-A03: Kural.tanı iddia-doğrulama
import { bicimle } from "./bicimle.ts";
import {
  ORTAK_TANI_METINLERI, ORTAK_TANI_METINLERI_EN,
  eskiTani, yeniTani, taniDilineCevir,
} from "./tani-metinleri.ts";
import type { TaniBaglami } from "./tani-metinleri.ts";
import { zorunluKenarIngilizcesi, type CiktiDili } from "./cevir.ts";

interface KullaniciTip {
  aile?: string;
  icerir?: string[];   // verilmişse: izinli çocuk listesi; yoksa yaprak (çocuk sarmaz)
  neVar: boolean;      // gövdede ne: tarifi var mı (çeviri şartı)
}

interface Baglam {
  gecerli: Set<string>;   // yerleşik ∪ kullanıcı-tanımlı tip adları
  yerlesik: Set<string>;  // yalnız SNF-0 built-in tipleri
  kullanici: Map<string, KullaniciTip>;
  snf: Siniflama;
  out: Tani[];
  /** Denetlenen dosyanın etiketi — şekil nöbeti kullanıcıya dosyayı söyler. */
  dosyaYolu?: string;
}

/**
 * Programı SNF-0'a karşı doğrular.
 *
 * `ham` verilirse yeni kanonun ŞEKİL nöbetleri de koşar: belge bloğunun ve çok
 * satırlı değerin biçimlendirmede kayıpsız kalması yalnız kaynak metinle
 * karşılaştırılarak ölçülebilir. Ham metin verilmezse bu iki nöbet susar —
 * uydurma bulgu üretmek yerine ölçmediğini söylemek dürüst olandır.
 *
 * `secenek.ozetle` false verilirse gösterim katmanının hiçbir katlaması
 * uygulanmaz ve her bulgu kendi satırıyla döner. Ölçüm yapan bir ajan ya da
 * kontrolcü tam dökümü böyle ister; okunabilirlik için kurulan kısıt, sayımı
 * yapan gözü kör edecek bir zorunluluk değildir.
 */
export interface DogrulaSecenek {
  /** Gösterim katmanının tanı selini tek satıra indirmesi açık mı (varsayılan: açık). */
  ozetle?: boolean;
  /** Yalnız okuma yüzünün dili; kaynak ve tanı kimlikleri değişmez. */
  dil?: CiktiDili;
}

export function dogrula(program: Program, snf: Siniflama, dosyaYolu?: string, ham?: string, secenek?: DogrulaSecenek): Tani[] {
  const ozetle = secenek?.ozetle !== false;
  const dil = secenek?.dil ?? "tr";
  const yerlesik = new Set<string>(snf.widgetTipleri.map((t) => t.ad));
  const gecerli = new Set<string>(yerlesik);
  const kullanici = new Map<string, KullaniciTip>();
  const baglam: Baglam = { gecerli, yerlesik, kullanici, snf, out: [], dosyaYolu };

  // Ön geçiş: TÜM Tip ilanlarını topla (iç içe dahil) — ilan, kullanımdan
  // SONRA da gelebilir (bildirim sırası özgür).
  const topla = (d: Dugum): void => {
    if (d.tur === "tipTanım") {
      gecerli.add(d.ad);
      kullanici.set(d.ad, tanimiOku(d, baglam));
    }
    for (const c of d.cocuklar) topla(c);
  };
  for (const b of program.bildirimler) topla(b);

  // DIL-2.1: altında widget olmayan /// blokları — belge kime ait?
  for (const s of program.sahipsizBelgeler ?? []) {
    // MDR-A02: gözlem+gerekçe mesajda, çözüm öneri alanında (R4 kapanışı — öneri boştu).
    baglam.out.push(eskiTani("sahipsiz-belge", "uyarı", {}, { satir: s.satir, sutun: s.sutun }));
  }

  for (const d of program.bildirimler) gez(d, undefined, baglam);

  // DIL-3/YAS-2.3 kural motoru M-1: kural hijyeni + Değerlendirme tutarlılığı (PLN-6).
  baglam.out.push(...kuralDenetle(program, snf, dosyaYolu));   // RF-T6-A04: ÖzelKural hedef-süzgeci yol ister
  // D2: Tema içerik denetimi (geçersiz-renk hex + WCAG AA kontrast — DESIGN.md deseni).
  baglam.out.push(...temaDenetle(program));
  // HZL-B01 (Founder 2026-07-12): yürürlük modeli — revize damgası halefsiz olamaz
  // (kim güncelledi bilinmeden tarihçeye inen karar = kör damga).
  const halefGez = (d: Dugum): void => {
    if (d.tur === "widget" && d.ad === "Karar") {
      const alan = (ad: string) => [...d.parametreler, ...d.ozellikler].find((p) => p.ad === ad)?.deger?.metin;
      if (alan("durum") === "revize" && !alan("halef")) {
        baglam.out.push(eskiTani("halefsiz-revize", "uyarı",
          { kod: alan("kod") }, { satir: d.satir, sutun: d.sutun }));
      }
    }
    for (const c of d.cocuklar) halefGez(c);
  };
  for (const d of program.bildirimler) halefGez(d);
  // KOD-ÖNEK bekçisi (Founder 2026-07-12): Blok kodu 'BLK' taşımalı — panelde
  // SEF-PLAN/HALKA gibi öneksiz Bloklar tip kimliğini addan söylemiyordu.
  const onekGez = (d: Dugum): void => {
    if (d.tur === "widget" && d.ad === "Blok") {
      const kod = [...d.parametreler, ...d.ozellikler].find((p) => p.ad === "kod")?.deger?.metin;
      if (kod && !kod.includes("BLK")) {
        baglam.out.push(eskiTani("öneksiz-blok", "bilgi", { kod }, { satir: d.satir, sutun: d.sutun }));
      }
    }
    for (const c of d.cocuklar) onekGez(c);
  };
  for (const d of program.bildirimler) onekGez(d);

  // YİNELENEN-PARAMETRE (TUR-2 · RF-T2-A01 — karne motor bulgusu, kanıt vakası
  // durum_devir çift-parametre): aynı düğümde aynı adlı alan İKİ KEZ yazılırsa
  // motor İLK değeri okur, ikincisi sessizce çöpe gider — panelin "ikinci-yazım
  // körlüğü" dersinin ayrıştırıcı ikizi. Parametre VE gövde-özelliği birlikte
  // sayılır (alanDeger dersi: iki ev de aynı alanın evi).
  const yinelenenGez = (d: Dugum): void => {
    if (d.tur === "widget" || d.tur === "tipTanım" || d.tur === "kuralTanım") {
      const gorulen = new Map<string, number>();
      for (const p of [...d.parametreler, ...d.ozellikler]) {
        const onceki = gorulen.get(p.ad);
        if (onceki !== undefined) {
          baglam.out.push(eskiTani("yinelenen-parametre", "uyarı",
            { alan: p.ad, ilkSatır: onceki },
            { satir: p.deger.satir ?? d.satir, sutun: p.deger.sutun ?? d.sutun }));
        } else {
          gorulen.set(p.ad, p.deger.satir ?? d.satir);
        }
      }
    }
    for (const c of d.cocuklar) yinelenenGez(c);
  };
  for (const d of program.bildirimler) yinelenenGez(d);

  // GAYRİMEŞRU-GEÇİŞ (TUR-2 · Founder kilidi reform ③): yazıcılar yasak geçişi
  // zaten REDDEDER; bu bekçi ELLE yazımı yakalar — statik dosyada "geçiş" ancak
  // koşu mühründen okunur: son koşu BLOCKED demişken durum: tamamlandı yazan
  // Adım, bloklu→tamamlandı'yı motorun arkasından geçirmiş demektir.
  const gecisGez = (d: Dugum): void => {
    if (d.tur === "widget" && d.ad === "Adım") {
      const alanDeger = (ad: string) => [...d.parametreler, ...d.ozellikler].find((p) => p.ad === ad)?.deger;
      const durum = alanDeger("durum")?.metin;
      const kosu = alanDeger("koşu");
      if (durum === "tamamlandı" && kosu?.tur === "widget" && kosu.dugum) {
        const karar = [...kosu.dugum.parametreler, ...kosu.dugum.ozellikler]
          .find((p) => p.ad === "karar")?.deger?.metin;
        if (karar === "BLOCKED") {
          baglam.out.push(eskiTani("gayrimeşru-geçiş", "uyarı",
            { kusur: "bloklu" }, { satir: d.satir, sutun: d.sutun }));
        }
        // YAS-4.2 (kanıt-ekseni turu): son koşu COMPLETED (kanıtsız teslim) mühürlüyken durum
        // "tamamlandı" — kanıtsız terfi motorun arkasından elle geçirilmiş demektir
        // (kanıtlı terfi yalnız VERIFIED yazımından gelir; o, koşu kaydını da günceller).
        if (karar === "COMPLETED") {
          baglam.out.push(eskiTani("gayrimeşru-geçiş", "uyarı",
            { kusur: "kanıtsız" }, { satir: d.satir, sutun: d.sutun }));
        }
      }
    }
    for (const c of d.cocuklar) gecisGez(c);
  };
  for (const d of program.bildirimler) gecisGez(d);

  // TANI-İDDİASI DOĞRULAMA (RF-T6-A03 · Founder tema bekçisi bulgusu: "MOTORDA ✅"
  // elle yazılmış cümleydi, makine okumuyordu): Kural düğümü `tanı:` kenarıyla
  // kendisini zorlayan kapıları beyan eder; beyan edilen kod motorun tanı
  // sicilinde yoksa UYARI — sahte-motor-iddiası yapısal imkânsız. Sicil:
  // sabit kodlar ∪ kanon zorunluKenarlar (tani-sicili.ts).
  const sicil = taniSicili(snf);
  const taniIddiaGez = (d: Dugum): void => {
    if (d.tur === "kuralTanım" || (d.tur === "widget" && (d.ad === "Kural" || d.ad === "GenelKural" || d.ad === "ÖzelKural"))) {
      const taniP = [...d.parametreler, ...d.ozellikler].find((p) => p.ad === "tanı");
      if (taniP) {
        const hedefler = taniP.deger.tur === "liste" ? (taniP.deger.ogeler ?? []) : [taniP.deger];
        for (const h of hedefler) {
          const kod = h.metin;
          if (!kod) continue;
          if (!sicil.has(kod)) {
            baglam.out.push(eskiTani("doğrulanamayan-tanı-iddiası", "uyarı",
              { kod }, { satir: h.satir ?? d.satir, sutun: h.sutun ?? d.sutun }));
          }
        }
      }
    }
    for (const c of d.cocuklar) taniIddiaGez(c);
  };
  for (const d of program.bildirimler) taniIddiaGez(d);

  // ══ YENİ KANON · TEK-DOSYA KAPSAMI (motor turu ikinci halkası) ═════════════
  //   Beş tanı, kararını yalnız açık dosyanın ayrıştırılmış ağacından ve kendi
  //   kaynak metninden verebildiği için burada yaşar. Proje indeksi, disk
  //   görüntüsü ya da bağımlılık grafı gerektiren hiçbir ölçüm bu boru hattında
  //   yapılmaz; onlar Proje kapısının işidir.
  sekilDriftDenetle(program, ham, baglam);
  const yeniGez = (d: Dugum): void => {
    ilgiliOnekDenetle(d, baglam);
    semaDisiAlanDenetle(d, baglam);
    gorunurlukSozlesmesiDenetle(d, baglam);
    for (const c of d.cocuklar) yeniGez(c);
  };
  for (const d of program.bildirimler) yeniGez(d);

  // RF-T6-A02 salience onarımı (Founder saha geri-bildirimi 2026-07-19: '80 uyarı'
  // — Problems paneli tekil dökümle boğulmaz): dayanaksız-kural nöbeti dosya
  // başına TEK özet satır konuşur. Tekil döküm küme-eşleme oturumunun işidir
  // (bir kez elle bağla, sonra makine tutar); nöbet görünür kalır, bağırmaz.
  {
    const tekil = baglam.out.filter((t) => t.kod === "dayanaksız-kural");
    if (ozetle && tekil.length > 1) {
      const kalan = baglam.out.filter((t) => t.kod !== "dayanaksız-kural");
      const adlar = tekil.map((t) => /\(([^)]+)\)/u.exec(t.mesaj)?.[1] ?? "?");
      const ozet = eskiTani("dayanaksız-kural", "bilgi",
        { özet: true, sayı: tekil.length, adlar },
        { satir: tekil[0].satir, sutun: tekil[0].sutun });
      // Katlanan bulgular yok olmadı; satır hepsinin yerine geçiyor ve kaç
      // bulgunun yerine geçtiğini kendi üstünde taşıyor.
      kalan.push({ ...ozet, ozetlenen: tekil.length });
      return gozlemOzetle(kalan, ozetle).map((t) => taniDilineCevir(t, dil));
    }
  }
  return gozlemOzetle(baglam.out, ozetle).map((t) => taniDilineCevir(t, dil));
}

// ══ YENİ KANON · TEK-DOSYA ÜRETİCİLERİ ═══════════════════════════════════════

/** Bir dosyada aynı yeni tanıdan kaç bulgu tekil olarak basılır. */
const GOZLEM_TEKIL_SINIRI = 3;

/**
 * Görünürlük ve tanı dürüstlüğü hükmü, yinelenen aynı-kök bulguların anlam
 * kaybetmeden özetlenmesini ister. Yeni kanonun tanıları göç boyunca çok sayıda
 * bulgu üretir; sayım korunur, ayrıntı ilk üç örnekte yaşar ve gerisi tek satıra
 * iner. Önceki tanılar bu özetten etkilenmez.
 *
 * Katlanan bulguların sayısı özet satırının `ozetlenen` alanına yazılır: özet
 * bir SAKLAMA değil bir DEVRETMEDİR, çünkü akışı okuyan sayaç kaç bulgunun
 * temsil edildiğini satırın kendisinden öğrenebilir.
 */
function gozlemOzetle(tanilar: Tani[], ozetle = true): Tani[] {
  if (!ozetle) return tanilar;
  const sayac = new Map<string, number>();
  for (const t of tanilar) {
    if (!YENI_TANI_INDEKS.has(t.kod)) continue;
    sayac.set(t.kod, (sayac.get(t.kod) ?? 0) + 1);
  }
  const tasan = [...sayac].filter(([, n]) => n > GOZLEM_TEKIL_SINIRI).map(([k]) => k);
  if (!tasan.length) return tanilar;

  const out: Tani[] = [];
  const gorulen = new Map<string, number>();
  for (const t of tanilar) {
    if (!tasan.includes(t.kod)) { out.push(t); continue; }
    const n = (gorulen.get(t.kod) ?? 0) + 1;
    gorulen.set(t.kod, n);
    if (n <= GOZLEM_TEKIL_SINIRI) { out.push(t); continue; }
    if (n === GOZLEM_TEKIL_SINIRI + 1) {
      const toplam = sayac.get(t.kod) ?? n;
      out.push({
        duzey: t.duzey, kod: t.kod,
        mesaj: ORTAK_TANI_METINLERI.dosyaBulguOzeti({ toplam, sınır: GOZLEM_TEKIL_SINIRI }),
        satir: t.satir, sutun: t.sutun,
        oneri: t.oneri,
        ozetlenen: toplam - GOZLEM_TEKIL_SINIRI,
        dilMetinleri: {
          tr: {
            mesaj: ORTAK_TANI_METINLERI.dosyaBulguOzeti({ toplam, sınır: GOZLEM_TEKIL_SINIRI }),
            ...(t.dilMetinleri?.tr.oneri === undefined ? {} : { oneri: t.dilMetinleri.tr.oneri }),
          },
          en: {
            mesaj: ORTAK_TANI_METINLERI_EN.dosyaBulguOzeti({ toplam, sınır: GOZLEM_TEKIL_SINIRI }),
            ...(t.dilMetinleri?.en.oneri === undefined ? {} : { oneri: t.dilMetinleri.en.oneri }),
          },
        },
      });
    }
  }
  return out;
}

/** Sekiz kanonik bölüm öneki — `ilgili` üyeliklerinin kapalı kümesi. */
const BOLUM_ONEKLERI: ReadonlySet<string> = new Set(["MIM", "DIL", "TIP", "YAS", "YUZ", "STR", "OGR", "ORK"]);

/**
 * Çok-üyelik bekçisi: `ilgili` listesi yalnız sekiz kanonik bölüm önekinden
 * kurulur; tanımsız ve yinelenen üyelik reddedilir. Karşılaştırma tamamen
 * yereldir — önek kümesi kapalı olduğu için proje indeksi gerekmez.
 */
function ilgiliOnekDenetle(d: Dugum, b: Baglam): void {
  const p = [...d.parametreler, ...d.ozellikler].find((x) => x.ad === "ilgili");
  if (!p) return;
  const ogeler = p.deger.tur === "liste" ? (p.deger.ogeler ?? []) : [p.deger];
  const gorulen = new Set<string>();
  for (const o of ogeler) {
    const uye = o.metin?.trim();
    if (!uye) continue;
    if (!BOLUM_ONEKLERI.has(uye)) {
      b.out.push(yeniTani("ilgili-önek-geçersiz",
        { uye, kusur: "bu üyelik sekiz kanonik bölüm önekinin dışında" },
        { satir: o.satir ?? p.satir, sutun: o.sutun ?? p.sutun }));
      continue;
    }
    if (gorulen.has(uye)) {
      b.out.push(yeniTani("ilgili-önek-geçersiz",
        { uye, kusur: "aynı üyelik listede ikinci kez yazılmış" },
        { satir: o.satir ?? p.satir, sutun: o.sutun ?? p.sutun }));
      continue;
    }
    gorulen.add(uye);
  }
}

/**
 * İlanlı ortak alan sözlüğü: her tipte meşru sayılan çekirdek alanlar. Şema
 * kayıtları tipe özgü alanları taşır; bu küme ise tipten bağımsız kimlik,
 * anlatı ve yaşam-döngüsü alanlarını toplar. Kenar adları ayrıca sözlüğe
 * katılır, çünkü kenar sözleşmesi şemanın değil ilişki kanonunun işidir.
 */
const ORTAK_ALANLAR: ReadonlySet<string> = new Set([
  "kod", "ad", "ne", "tür", "durum", "sürüm", "gerekçe", "not", "kaynak", "sahip",
  "görünürlük", "açılmaKoşulu", "ebedi", "dosya", "etiket", "ilgili", "emoji", "ikon",
  "başlık", "açıklama", "örnek", "sınır", "kabul", "görev", "koşu", "rapor", "yama",
  "hedef", "değer", "birim", "öncelik", "planlanmamış", "dayanaksız", "muafiyet",
]);

/**
 * Şema-dışı alan bekçisi: bir düğümde kullanılan her parametre ve gövde
 * özelliği ya tipin kanonik şemasında ya ilanlı ortak alan sözlüğünde
 * bulunmalıdır. Şema dışındaki alan veri olarak durabilir fakat doğrulanmış
 * sayılmaz. Ölçüm yereldir: alan adı dosyada, şema sınıflama kaydındadır.
 */
function semaDisiAlanDenetle(d: Dugum, b: Baglam): void {
  if (d.tur !== "widget") return;
  const sema = b.snf.semalar?.[d.ad];
  if (!sema) return;                    // şemasız tip: sözleşme ilan edilmemiş, ölçüm yapılmaz
  if (!b.yerlesik.has(d.ad)) return;    // kullanıcı tipi kendi ilanıyla yaşar
  if (b.kullanici.has(d.ad)) return;

  const izinli = new Set<string>(ORTAK_ALANLAR);
  for (const k of b.snf.kenarTipleri) izinli.add(k.ad);
  for (const alan of Object.keys(b.snf.ortakEnum ?? {})) izinli.add(alan);
  for (const alan of sema.zorunlu) izinli.add(alan);
  for (const alan of sema.opsiyonel ?? []) izinli.add(alan.split(/[\s(]/)[0]);
  for (const alan of Object.keys(sema.enum ?? {})) izinli.add(alan);
  for (const alan of Object.keys(sema.tür ?? {})) izinli.add(alan);
  for (const alan of Object.keys(sema.varsayilan ?? {})) izinli.add(alan);
  for (const kos of sema.kosullu ?? []) { izinli.add(kos.alan); for (const g of kos.gerekli) izinli.add(g); }
  for (const grup of sema.enAzBiri ?? []) for (const g of grup) izinli.add(g);
  for (const grup of sema.birindenBiri ?? []) for (const g of grup) izinli.add(g);

  for (const p of [...d.parametreler, ...d.ozellikler]) {
    if (izinli.has(p.ad)) continue;
    b.out.push(yeniTani("şema-dışı-alan",
      { ad: d.ad, kimlik: kimlik(d), alan: p.ad },
      { satir: p.satir, sutun: p.sutun }));
  }
}

/**
 * Görünürlük sözleşmesi bekçisi: her yüzey düğümü görünürlüğünü tam bir kez
 * beyan eder; gizli yüzey ayrıca çözülebilir bir açılma koşulu taşır.
 * Alanların varlığı ve tekilliği yerel bir denetimdir. Açılma koşulunun HEDEF
 * çözümlemesi bilinçli olarak bu üreticinin dışındadır: koşulun içinde bir
 * kimlik geçiyorsa onu Proje kapısının kırık-referans bekçisi çözer; tek ihlal
 * iki tanıya bölünmez.
 */
function gorunurlukSozlesmesiDenetle(d: Dugum, b: Baglam): void {
  if (d.tur !== "widget") return;
  if (!b.yerlesik.has(d.ad) || b.kullanici.has(d.ad)) return;
  const { duzen, yaprak } = b.snf.yuzeyKurali;
  if (!duzen.includes(d.ad) && !yaprak.includes(d.ad)) return;

  const alanlar = [...d.parametreler, ...d.ozellikler].filter((x) => x.ad === "görünürlük");
  if (alanlar.length === 0) {
    b.out.push(yeniTani("görünürlük-sözleşmesi-eksik",
      { ad: d.ad, kimlik: kimlik(d), kusur: "görünürlük beyanı hiç yazılmamış" },
      { satir: d.satir, sutun: d.sutun }));
    return;
  }
  if (alanlar.length > 1) {
    b.out.push(yeniTani("görünürlük-sözleşmesi-eksik",
      { ad: d.ad, kimlik: kimlik(d), kusur: `görünürlük beyanı ${alanlar.length} kez yazılmış, oysa tam bir kez yazılır` },
      { satir: alanlar[1].satir, sutun: alanlar[1].sutun }));
    return;
  }
  if (alanlar[0].deger.metin === "gizli") {
    const kosul = [...d.parametreler, ...d.ozellikler].find((x) => x.ad === "açılmaKoşulu");
    if (!kosul || !kosul.deger.metin?.trim()) {
      b.out.push(yeniTani("görünürlük-sözleşmesi-eksik",
        { ad: d.ad, kimlik: kimlik(d), kusur: "yüzey gizli beyan edilmiş ama açılma koşulu yazılmamış" },
        { satir: alanlar[0].satir, sutun: alanlar[0].sutun }));
    }
  }
}

/** Kaynaktaki belge bloklarını (açılış imi ile ayna kapanış imi arası) çıkarır. */
function belgeBolgeleri(kaynak: string): Array<{ satir: number; icerik: string[] }> {
  const out: Array<{ satir: number; icerik: string[] }> = [];
  const satirlar = kaynak.split(/\r?\n/);
  let acik: { satir: number; icerik: string[] } | undefined;
  for (let i = 0; i < satirlar.length; i++) {
    const s = satirlar[i];
    if (!acik) {
      if (s.includes("-->|")) acik = { satir: i + 1, icerik: [] };
      continue;
    }
    if (s.includes("|<--")) { out.push(acik); acik = undefined; continue; }
    acik.icerik.push(s);
  }
  return out;
}

/** Kaynaktaki üç-tırnaklı çok satırlı değerleri çıkarır. */
function cokSatirliBolgeler(kaynak: string): Array<{ satir: number; icerik: string[] }> {
  const out: Array<{ satir: number; icerik: string[] }> = [];
  const satirlar = kaynak.split(/\r?\n/);
  let acik: { satir: number; icerik: string[] } | undefined;
  for (let i = 0; i < satirlar.length; i++) {
    const s = satirlar[i];
    const kac = (s.match(/"""/g) ?? []).length;
    if (!acik) {
      if (kac === 1) acik = { satir: i + 1, icerik: [] };
      continue;
    }
    if (kac >= 1) { out.push(acik); acik = undefined; continue; }
    acik.icerik.push(s);
  }
  return out;
}

/** Yapısal girintiyi düşürür — kanon yalnız bu girintinin düzenlenmesine izin verir. */
function girintisiz(satirlar: string[]): string[] {
  const dolu = satirlar.filter((s) => s.trim() !== "");
  if (!dolu.length) return [];
  const enAz = Math.min(...dolu.map((s) => s.length - s.trimStart().length));
  const kirpik = [...satirlar];
  while (kirpik.length && kirpik[0].trim() === "") kirpik.shift();
  while (kirpik.length && kirpik[kirpik.length - 1].trim() === "") kirpik.pop();
  return kirpik.map((s) => (s.trim() === "" ? "" : s.slice(enAz)));
}

/** İki satır dizisinin ilk farklı satırının sırası (yoksa sıfır). */
function ilkFark(a: string[], c: string[]): number {
  const n = Math.max(a.length, c.length);
  for (let i = 0; i < n; i++) if (a[i] !== c[i]) return i + 1;
  return 0;
}

/**
 * Şekil muhafazası nöbeti: kaynak ile ondan türetilen biçimli yüz arasında
 * belge bloğunun ve çok satırlı değerin içeriği birebir kalmalıdır.
 * Biçimlendirici yalnız yapısal girintiyi, izinli çevre boşluklarını ve baştaki
 * ya da sondaki boş satırları düzenleyebilir; metnin kendisine dokunamaz.
 */
function sekilDriftDenetle(program: Program, ham: string | undefined, b: Baglam): void {
  if (!ham) return;
  let bicimli: string;
  try {
    bicimli = bicimle(ham, "\n");
  } catch {
    return;   // söz dizimi bozuk kaynağın şekli ölçülmez; onu söz dizim bekçisi konuşur
  }
  b.out.push(...sekilDriftTanilari(ham, bicimli, b.dosyaYolu));
}

/**
 * Kaynak metin ile ondan türetilen yüzü karşılaştırır ve şekil kaybını bildirir.
 *
 * Karar mantığı ayrı ve saf tutulur, çünkü bu iki hüküm ancak biçimlendirici
 * bozulduğunda sağlanır: koşulu doğrudan enjekte edilmeden sınanamaz. Motorun
 * kendi dürüstlüğünü denetleyen hükümlerde nöbet, arızayı kendisi kurar.
 */
export function sekilDriftTanilari(kaynak: string, yuz: string, dosyaYolu?: string): Tani[] {
  const out: Tani[] = [];
  const kaynakBelge = belgeBolgeleri(kaynak);
  const yuzBelge = belgeBolgeleri(yuz);
  if (kaynakBelge.length !== yuzBelge.length) {
    out.push(yeniTani("belge-şekil-drift",
      { dosya: dosyaYolu ?? "bu dosya", fark: 1 },
      { satir: kaynakBelge[0]?.satir ?? 1, sutun: 1 }));
  } else {
    for (let i = 0; i < kaynakBelge.length; i++) {
      const fark = ilkFark(girintisiz(kaynakBelge[i].icerik), girintisiz(yuzBelge[i].icerik));
      if (!fark) continue;
      out.push(yeniTani("belge-şekil-drift",
        { dosya: dosyaYolu ?? "bu dosya", fark },
        { satir: kaynakBelge[i].satir + fark, sutun: 1 }));
    }
  }

  const kaynakDeger = cokSatirliBolgeler(kaynak);
  const yuzDeger = cokSatirliBolgeler(yuz);
  if (kaynakDeger.length !== yuzDeger.length) {
    out.push(yeniTani("çok-satırlı-değer-drift",
      { alan: "çok satırlı değer", fark: 1 },
      { satir: kaynakDeger[0]?.satir ?? 1, sutun: 1 }));
    return out;
  }
  for (let i = 0; i < kaynakDeger.length; i++) {
    const fark = ilkFark(girintisiz(kaynakDeger[i].icerik), girintisiz(yuzDeger[i].icerik));
    if (!fark) continue;
    out.push(yeniTani("çok-satırlı-değer-drift",
      { alan: "çok satırlı değer", fark },
      { satir: kaynakDeger[i].satir + fark, sutun: 1 }));
  }
  return out;
}

/** Tip ilanını okur + ilanın kendisini denetler (aile-geçersiz · tarif-eksik). */
function tanimiOku(d: Dugum, b: Baglam): KullaniciTip {
  const aileP = d.parametreler.find((p) => p.ad === "aile");
  const aile = aileP?.deger.metin;
  const icerirP = d.parametreler.find((p) => p.ad === "içerir");
  const icerir = icerirP
    ? (icerirP.deger.ogeler ?? [icerirP.deger]).map((v) => v.metin ?? "").filter(Boolean)
    : undefined;
  const neVar = d.ozellikler.some((o) => o.ad === "ne");

  if (aile && b.snf.aileler && !(aile in b.snf.aileler)) {
    b.out.push(eskiTani("aile-geçersiz", "uyarı",
      { ad: d.ad, aile, aileler: Object.keys(b.snf.aileler) }, { satir: d.satir, sutun: d.sutun }));
  }
  if (!neVar) {
    b.out.push(eskiTani("tarif-eksik", "uyarı", { ad: d.ad }, { satir: d.satir, sutun: d.sutun }));
  }
  return { aile, icerir, neVar };
}

function gez(d: Dugum, ebeveyn: Dugum | undefined, b: Baglam): void {
  if (d.tur === "widget") {
    tipDenetle(d, b);
    kimlikDenetle(d, b);
    adBicimiDenetle(d, b);           // DIL-1.2 casing (BKM-KAPI-A03)
    semaDenetle(d, b);
    zorunluKenarDenetle(d, b);
    hamRenkDenetle(d, b);            // TAS-B01 ham-renk (rol yerine hex — YUZ-4.1'in rol-zorunlu kardeşi)
    hatirlatmaDenetle(d, b);
    politikaDayanakDenetle(d, b);
    bellekTerfiDenetle(d, b);
    adimDurumDenetle(d, b);
    if (ebeveyn?.tur === "widget") sarmaDenetle(ebeveyn, d, b);
  } else if (d.tur === "kuralTanım") {
    // ②-B2: Kural bildirimi de kimlik + şema bekçisinden geçer (bypass kapandı).
    kimlikDenetle(d, b);
    semaDenetle(d, b);
  } else if (d.tur === "tipTanım") {
    adBicimiDenetle(d, b);           // DIL-1.2: kullanıcı tipi de aynı kurala tabi (TIP-1 birinci-sınıf)
  }
  // Parametre/özellik değerlerinin içindeki widget'ları da tip-denetle
  // (örn. yasa: Yasa(...)) — sarma uygulanmaz (adlı parametre, containment değil).
  for (const p of d.parametreler) degerdeGez(p.deger, b);
  for (const o of d.ozellikler) degerdeGez(o.deger, b);
  for (const c of d.cocuklar) gez(c, d, b);
}

/**
 * DIL-1.2 ad-biçimi bekçisi (BKM-KAPI-A03 · v1 ilk-harf): tip adı BÜYÜK harfle,
 * parametre/özellik adı küçük harfle başlar. Türkçe harf destekli (toLocale, "tr").
 * İç-yapı analizi (bitişik kelime sınırı) v2'ye; dosya adları ad-ihlali kapısının işidir.
 */
function adBicimiDenetle(d: Dugum, b: Baglam): void {
  const ilk = d.ad?.[0];
  if (ilk && /\p{L}/u.test(ilk) && ilk !== ilk.toLocaleUpperCase("tr")) {
    b.out.push(eskiTani("ad-biçimi", "uyarı",
      { ad: d.ad, kusur: "tip", onerilen: `${ilk.toLocaleUpperCase("tr")}${d.ad.slice(1)}` },
      { satir: d.satir, sutun: d.sutun }));
  }
  for (const p of [...d.parametreler, ...d.ozellikler]) {
    const pi = p.ad?.[0];
    if (pi && /\p{L}/u.test(pi) && pi !== pi.toLocaleLowerCase("tr")) {
      b.out.push(eskiTani("ad-biçimi", "uyarı",
        { ad: p.ad, kusur: "parametre", onerilen: `${pi.toLocaleLowerCase("tr")}${p.ad.slice(1)}` },
        { satir: p.satir, sutun: p.sutun }));
    }
  }
}

// durum-boyutu bekçisi 2026-08-24 emekli edildi (Founder hükmü): DurumKaydı için
// sabit karakter sınırı yeni kanonda norm değildir ve çapraz harita bu tanıyı
// zaten EMEKLİ ilan etmişti; proje büyüdükçe sınır kayıpsız devri kırpıyordu.
// Emeklilik kaydı tani-sicili.ts (EMEKLI_TANI_KODLARI) ve çapraz haritadadır.

/**
 * DIL-1.2 kimlik bekçisi (KRR-MUT-8): `kod:` İLK parametredir — kimlik her zaman
 * ilk bakışta. Varlığı şema zorlar (ana tiplerde zorunlu; yüzey yaprakları muaf);
 * burada yalnız SIRA denetlenir. Uyarı düzeyi: eski dosyaları kırmaz, görünür kılar.
 */
function kimlikDenetle(d: Dugum, b: Baglam): void {
  const i = d.parametreler.findIndex((p) => p.ad === "kod");
  if (i <= 0) return;   // yok (şema işi) ya da zaten ilk
  const p = d.parametreler[i];
  b.out.push(eskiTani("kod-ilk-değil", "uyarı",
    { ad: d.ad, sıra: i + 1 }, { satir: p.satir, sutun: p.sutun }));
}

function degerdeGez(deger: Deger, b: Baglam): void {
  if (deger.tur === "widget" && deger.dugum) gez(deger.dugum, undefined, b);
  else if (deger.tur === "liste") for (const o of deger.ogeler ?? []) degerdeGez(o, b);
  else if (deger.tur === "harita") for (const c of deger.ciftler ?? []) degerdeGez(c.deger, b);
}

/**
 * Şema-zorlaması (TIP-2 · DIL-3): yerleşik tipin zorunlu alanları var mı?
 * Alan = parametre VEYA özellik (gövde). Yalnız YERLEŞİK + şemalı + kullanıcı
 * tarafından yeniden-tanımlanmamış tipler denetlenir. Eksik alan = uyarı
 * (FEL-4: makine GÖRÜR ve SÖYLER; yarım-yazımı bloklamaz — hata değil).
 */
/** Değer bildirilen türe uymuyorsa Türkçe kusur ifadesi, uyuyorsa boş döner (F9-A03).
 *  Birleşik tür (NTK-A04 · TIP-2 ②): "metin|liste" gibi | ile ayrılan türlerde
 *  değer üyelerden BİRİNE uyuyorsa geçerlidir (görev/sınır hem dizgi hem madde listesi). */
function turUymaz(deger: string, tur: string): string | undefined {
  if (tur.includes("|")) {
    const uyeler = tur.split("|");
    const kusurlar = uyeler.map((u) => turUymaz(deger, u));
    return kusurlar.every(Boolean) ? kusurlar[0] : undefined;
  }
  switch (tur) {
    case "sayı":     return /^-?\d+$/.test(deger) ? undefined : "tam sayı olmalı";
    case "ondalık":  return /^-?\d+([.,]\d+)?$/.test(deger) ? undefined : "sayı olmalı";
    case "tarih": {
      if (/^(belirsiz|\?|tbd)$/i.test(deger)) return undefined;   // dürüst bilinmezlik (MIM-1.2 ②)
      const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(deger);
      if (!m) return "Tarih ISO 8601 biçiminde yazılır: gün belliyse YYYY-AA-GG, yalnız ay belliyse YYYY-AA; henüz bilinmiyorsa 'belirsiz' yazılabilir.";
      // Sol zemin denetimi bulgusu (2026-07-20): biçim yetmez, TAKVİM gerçeği gerekir —
      // 2026-13 (13. ay) ve 2026-02-31 (şubat 31) sessizce kabul ediliyordu.
      const [, y, ay, gun] = m;
      if (+ay < 1 || +ay > 12) return `takvimde olmayan ay taşıyor (${ay} — ay 01-12 aralığındadır)`;
      if (gun !== undefined) {
        const sonGun = new Date(+y, +ay, 0).getDate();
        if (+gun < 1 || +gun > sonGun) return `takvimde olmayan gün taşıyor (${y}-${ay} ayı ${String(sonGun).padStart(2, "0")} gün çeker, ${gun} yazılmış)`;
      }
      return undefined;
    }
    case "mantıksal":return /^(evet|hayır|true|false)$/.test(deger) ? undefined : "mantıksal olmalı (evet·hayır)";
    case "eposta-biçimi": return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(deger) ? undefined : "e-posta biçiminde olmalı";
    default:         return undefined;   // metin·liste·SZL-KOD → yapısal, burada denetlenmez
  }
}

function semaDenetle(d: Dugum, b: Baglam): void {
  // ②-B2 mutabakat: `Kural ad(...)` ayrı düğüm türüne (kuralTanım) düştüğü için
  // semalar.Kural HİÇ uygulanmıyordu (bypass) — artık Kural şemasıyla denetlenir.
  const tip = d.tur === "kuralTanım" ? "Kural" : d.ad;
  const sema = b.snf.semalar?.[tip];
  if (!sema) return;
  if (d.tur === "widget") {
    if (!b.yerlesik.has(d.ad)) return;    // Tip ile yeniden tanımlanmışsa şema düşer
    if (b.kullanici.has(d.ad)) return;
  }

  // Mevcut alanlar: parametreler ∪ özellikler adları (--> "besler" özelliği dahil).
  const mevcut = new Set<string>();
  for (const p of d.parametreler) mevcut.add(p.ad);
  for (const o of d.ozellikler) mevcut.add(o.ad);

  const eksikler: string[] = [];
  for (const alan of sema.zorunlu) if (!mevcut.has(alan)) eksikler.push(alan);
  // birindenBiri: [["ne","ad"]] — gruptan en az biri bulunmalı (F8 1. dalga)
  for (const grup of sema.birindenBiri ?? [])
    if (!grup.some((alan: string) => mevcut.has(alan))) eksikler.push(grup.join(" | "));

  // GBR-A06 (IDA dogfood #13): belge YANLIŞ-DÜĞÜM tespiti — düğüm belge-eksik ama
  // BİR ÇOCUĞU belge taşıyorsa, belge büyük olasılıkla düğümün İÇİNE (ilk çocuğun
  // önüne) konmuştur; DIL-2/DIL-2.1: belge düğümden HEMEN ÖNCE olmalı. Böyle bir hâlde
  // kuru "belge eksik" mesajı kullanıcıyı yanlış yere düzeltmeye iter → yol göster.
  const belgeGerekli = !!sema.belgeZorunlu || (sema.bolumZorunlu?.length ?? 0) > 0;
  const yanlisBelgeCocuk = belgeGerekli && !d.belge
    ? d.cocuklar.find((c) => c.tur === "widget" && c.belge)
    : undefined;

  // Belge zorunlulugu (YAS-4 tam isabet): Beceri/Yetenek zengin acikla-blogu
  // (-->| <ne-zaman> <desenler> |<--) tasimali — kuru skill = corba, ajan tahmin eder.
  // Belge yanlış-düğüme bağlıysa 'eksik-alan'a EKLENMEZ (yanlış-düğüm tanısı daha isabetli).
  if (sema.belgeZorunlu && !d.belge && !yanlisBelgeCocuk) eksikler.push(ORTAK_TANI_METINLERI.belgeEksikAdi({}));

  // Anlati standardi (EKL-F2-A02): olgu parametrede, muhakeme belgede.
  // Semada bolumZorunlu varsa belge blogu "## Bolum" basliklarini tasimali
  // (orn. Blok → Amac·Kapsam·Sonuc). Kapsam ic yapisi (giris+≥3 gelisme+sonuc)
  // insan disiplinidir (OGR-1.4); makine varligi zorlar.
  if (sema.bolumZorunlu?.length) {
    if (!d.belge) {
      if (!yanlisBelgeCocuk) eksikler.push(ORTAK_TANI_METINLERI.anlatiBelgesiEksikAdi({ bölümler: sema.bolumZorunlu }));
    } else {
      for (const bolum of sema.bolumZorunlu) {
        const baslik = new RegExp("^\\s*##\\s*" + bolum + "(?=\\s|$)", "mu"); // \b Türkçe harfte çalışmaz (ç/ş/ü kelime-dışı sayılır)
        if (!baslik.test(d.belge)) eksikler.push(ORTAK_TANI_METINLERI.belgeBolumuEksikAdi({ bölüm: bolum }));
      }
    }
  }

  if (yanlisBelgeCocuk) {
    b.out.push(eskiTani("belge-yanlış-düğüm", "uyarı",
      {
        ad: d.ad, kimlik: kimlik(d),
        çocukAd: yanlisBelgeCocuk.ad, çocukKimlik: kimlik(yanlisBelgeCocuk),
        bölümler: sema.bolumZorunlu ?? ["…"],
      },
      { satir: d.satir, sutun: d.sutun }));
  }

  // Enum denetimi (F9-A02 · tek-kaynak): şemada enum'u olan alan, izinli değer
  // dışında bir değer taşıyorsa uyar. Gövde (özellik) değerleri de kapsanır.
  // "Adım.durum" İSTİSNA: adimDurumDenetle tek yetkili (çapa-bilinçli bekçi) —
  // aynı kusura çift tanı basılmaz (②-B10 mutabakat düzeltmesi, KRR-MUT Sütun D).
  const tumEnum = { ...(b.snf.ortakEnum ?? {}), ...(sema.enum ?? {}) };
  for (const [alan, izinli] of Object.entries(tumEnum)) {
    if (d.ad === "Adım" && alan === "durum") continue;
    const p = [...d.parametreler, ...d.ozellikler].find((x) => x.ad === alan);
    const deger = p?.deger.metin;
    if (deger && !izinli.includes(deger)) {
      b.out.push(eskiTani("geçersiz-enum", "uyarı",
        { ad: d.ad, kimlik: kimlik(d), alan, deger, izinli },
        { satir: p!.satir, sutun: p!.sutun }));
    }
  }

  // Tür denetimi (F9-A03 · alanTurleri): şemada türü bildirilen alan, değeri o
  // türe uymuyorsa uyar (tanımlı-ama-ölü alanTurleri yeteneği kapandı).
  for (const [alan, tur] of Object.entries(sema.tür ?? {})) {
    const p = [...d.parametreler, ...d.ozellikler].find((x) => x.ad === alan);
    const deger = p?.deger.metin;
    if (deger === undefined) continue;
    const hata = turUymaz(deger, tur);
    if (hata) {
      b.out.push(eskiTani("geçersiz-tür", "uyarı",
        { ad: d.ad, kimlik: kimlik(d), alan, kusur: hata, deger, tür: tur },
        { satir: p!.satir, sutun: p!.sutun }));
    }
  }

  // Koşullu: bir alan belirli değerdeyse ek alanlar gerekir.
  for (const kos of sema.kosullu ?? []) {
    const p = [...d.parametreler, ...d.ozellikler].find((x) => x.ad === kos.alan);
    const deger = p?.deger.metin;
    if (deger === kos.deger) {
      for (const alan of kos.gerekli) if (!mevcut.has(alan)) eksikler.push(alan);
    }
  }

  if (eksikler.length) {
    b.out.push(eskiTani("eksik-alan", "uyarı",
      { ad: d.ad, kimlik: kimlik(d), eksikler }, { satir: d.satir, sutun: d.sutun }));
  }

  // En-az-biri: gruplardan hiçbiri tam değilse (örn. Sözleşme iki-yüz).
  if (sema.enAzBiri && !sema.enAzBiri.some((grup) => grup.every((a) => mevcut.has(a)))) {
    const secenekler = sema.enAzBiri.map((g) => g.join("+")).join(" · ");
    b.out.push(eskiTani("eksik-alan", "uyarı",
      { ad: d.ad, kimlik: kimlik(d), secenekler, enAzBiri: true }, { satir: d.satir, sutun: d.sutun }));
  }
}

/**
 * Zorunlu-kenar bekçisi (TIP-2.3 · CUE'nun `!` ödüncü · KÖR DRİFT kalkanı): bazı tipler
 * bir davranış/kavuşum kenarı taşımak ZORUNDADIR — etkileşimli Düğme bir Uç'a
 * (çağırır) ya da Ekran'a (gider) bağlanmalı; Ekran bir plan Adım'ına (referans)
 * kavuşmalı; Uç bir Sözleşme'ye bağlanmalı. Gruptan en az biri yoksa özel tanı
 * (uyarı düzeyi: iskelet aşaması meşru, ama makine GÖRÜR ve SÖYLER — yapı geçerli
 * ama niyet boş = kör drift). Şemadan bağımsızdır: yüzey yaprakları da denetlenir.
 */
function zorunluKenarDenetle(d: Dugum, b: Baglam): void {
  const kurallar = b.snf.zorunluKenarlar?.[d.ad];
  if (!kurallar) return;
  if (!b.yerlesik.has(d.ad)) return;   // Tip ile yeniden tanımlanmışsa düşer
  if (b.kullanici.has(d.ad)) return;
  const mevcut = new Set<string>();
  for (const p of d.parametreler) mevcut.add(p.ad);
  for (const o of d.ozellikler) mevcut.add(o.ad);
  for (const kural of kurallar) {
    if (kural.ancak) {   // bağlam-duyarlı: koşul sağlanmıyorsa bu kural denetlenmez
      const p = [...d.parametreler, ...d.ozellikler].find((x) => x.ad === kural.ancak!.alan);
      const deger = p?.deger.metin;
      if (!deger || !kural.ancak.değerler.includes(deger)) continue;
    }
    if (kural.grup.some((k) => mevcut.has(k))) continue;   // en az biri var → temiz
    const kimlikDegeri = kimlik(d);
    const turkceMesaj = ORTAK_TANI_METINLERI.zorunluKenarCumlesi({
      ad: d.ad, kimlik: kimlikDegeri, kanonCumlesi: kural.mesaj,
    });
    const turkceTipAciklamasi = b.snf.widgetTipleri.find((t) => t.ad === d.ad)?.ne ?? "";
    const ingilizce = zorunluKenarIngilizcesi(
      d.ad, kimlikDegeri, kural.grup, turkceTipAciklamasi,
    );
    b.out.push({
      duzey: kural.düzey ?? "uyarı", kod: kural.tanı,
      mesaj: turkceMesaj,
      satir: d.satir, sutun: d.sutun,
      oneri: kural.öneri,
      dilMetinleri: {
        tr: { mesaj: turkceMesaj, oneri: kural.öneri },
        en: ingilizce,
      },
    });
  }
}

/**
 * TAS-B01 ham-renk bekçisi (geçersiz-renk kapısının ROL-ZORUNLU kardeşi · YUZ-4.1 ailesi):
 * bir YÜZEY widget'ı (Tema HARİÇ) parametre/özellik değerinde ham hex (#RGB/#RRGGBB)
 * taşıyorsa uyar — renk NİYETİ rol adıyla (birincil · vurgu …) ifade edilir, DEĞER
 * teknoloji temasında yaşar (TAS-A01 token-ROL sözleşmesi). Tema muaf: değer-taşıyan
 * eski biçim YUZ-4 bekçilerinin (tema.ts geçersiz-renk/kontrast) işi. Tip TANIMI muaf:
 * `Tip X( renk: "#…" )` eklenti-dekor yapılandırmasıdır (TIP-1), yüzey niyeti değil.
 */
const HAM_HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
function hamRenkDenetle(d: Dugum, b: Baglam): void {
  if (d.ad === "Tema") return;
  if (!b.yerlesik.has(d.ad) || b.kullanici.has(d.ad)) return;
  const { duzen, yaprak } = b.snf.yuzeyKurali;
  if (!duzen.includes(d.ad) && !yaprak.includes(d.ad)) return;
  const bak = (alan: string, v: Deger): void => {
    if (v.metin && HAM_HEX.test(v.metin)) {
      // MDR-A02: plan-adresi (TAS-A01/B01) kullanıcı mesajından yoruma indi (Founder kararı:
      // defter-dışı kısayol mesajda yaşamaz) — rol→değer ayrımının uygulandığı Adımlar: TAS-A01/B01.
      b.out.push(eskiTani("ham-renk", "uyarı",
        { ad: d.ad, kimlik: kimlik(d), alan, deger: v.metin },
        { satir: v.satir, sutun: v.sutun }));
    }
    for (const o of v.ogeler ?? []) bak(alan, o);
    for (const c of v.ciftler ?? []) bak(`${alan}.${c.ad}`, c.deger);
  };
  for (const p of [...d.parametreler, ...d.ozellikler]) bak(p.ad, p.deger);
}

/** Düğümün kod'unu (yoksa adını) kısa kimlik olarak döndürür. */
/**
 * Alanı HEM parametre (imza) HEM özellik (gövde) listesinde arar. Gramer
 * `durum`/`terfi` gibi alanların gövdede yazılmasına izin verir (SD); yalnız
 * `parametreler`e bakan denetçiler gövdedeki değeri SESSİZCE atlardı — enum
 * denetimi delik açardı (Motor uzmanı bulgusu, 2026-07-06). Tek kaynak burası.
 */
function alanDeger(d: Dugum, ad: string): string | undefined {
  return (d.parametreler.find((p) => p.ad === ad) ??
          d.ozellikler.find((o) => o.ad === ad))?.deger.metin;
}

function kimlik(d: Dugum): string {
  return alanDeger(d, "kod") ?? d.ad;
}

/**
 * Hatırlatıcı(durum: açık) → MAVİ bilgi tanısı (YUZ-4.1): problem panelinde HER ZAMAN
 * görünür (workspace-wide, eklenti tarar). "İnsan hatırlamaz, sistem gösterir" (TIP-1.12).
 */
function hatirlatmaDenetle(d: Dugum, b: Baglam): void {
  if (d.ad !== "Hatırlatıcı") return;
  const durum = alanDeger(d, "durum");
  const ne = alanDeger(d, "ne") ?? "";
  const kisa = ne.length > 90 ? ne.slice(0, 90) + "…" : ne;
  // DIL-4 ② (oturum 29): işaret ÜNLEM — hatırlatıcı dikkat ister, raptiye değil.
  if (durum === "açık") {
    b.out.push(eskiTani("açık-hatırlatıcı", "bilgi",
      { kimlik: kimlik(d), ne: kisa }, { satir: d.satir, sutun: d.sutun }));
    return;
  }
  // TIP-1.12 ② yaşam döngüsü: kararlaştı = iş ZİNCİRDE olmalı — hatırlat: hedefi şema
  // (kosullu) zorlar; buradaki bilgi-tanısı insan yüzüne yolu gösterir.
  if (durum === "kararlaştı") {
    const hedef = alanDeger(d, "hatırlat");
    b.out.push(eskiTani("kararlaşmış-hatırlatıcı", "bilgi",
      { kimlik: kimlik(d), hedef, ne: kisa }, { satir: d.satir, sutun: d.sutun }));
  }
}

/**
 * Politika → Karar bağı (BKM-OLG-A04 · oturum 29): bir Politika hangi KARAR'a
 * yaslandığını `dayanak:` ile söyleyebilmeli — dayanaksız politika "kim karar
 * verdi?" sorusunu cevapsız bırakır (governance izlenebilirliği). Düzey: bilgi
 * (kapıyı doldurmaz, editör/tek-dosya yüzeyinde yaşar — açık-hatırlatıcı deseni).
 */
function politikaDayanakDenetle(d: Dugum, b: Baglam): void {
  if (d.ad !== "Politika") return;
  if (alanDeger(d, "dayanak") !== undefined) return;
  b.out.push(eskiTani("politika-dayanaksız", "bilgi",
    { kimlik: kimlik(d) }, { satir: d.satir, sutun: d.sutun }));
}

/**
 * Kural → Karar bağı (RF-T6-A02 · Founder 2026-07-12: "her kuralı açıp ilgili
 * karara bağlamamız gerekiyordu"). SOL HÜKMÜ (2026-07-19 bağımsız denetim,
 * seçenek b): İLK eşleme yapılana dek panel nöbeti SUSAR — toplu geçiş borcu
 * günlük Problems'ın normal durumu yapılmaz; sayı yalnız denetle KARNESİNDE
 * tek satır yaşar. Küme-eşleme bitince dosya-tanısı yeniden açılır ("bir kez
 * elle bağla, sonra makine tutar" — planın kendi sırası). Yeniden açılırken
 * mesaj Sol'un eylem-odaklı cümlesiyle kurulur (rapor: sol_dayanak_denetim_raporu.md).
 */
function kuralMi(d: Dugum): boolean {
  // Kural evreni kuralci ile AYNI (tek kaynak — aynı evren iki yerde tanımlanmaz): `Kural ad(...)` bildirimi (kuralTanım)
  // + kapsam-özelleşmiş GenelKural/ÖzelKural widget'ları + düz Kural widget'ı.
  return d.tur === "kuralTanım" ||
    d.ad === "Kural" || d.ad === "GenelKural" || d.ad === "ÖzelKural";
}

/** Bilinçli-dayanaksızlık beyanı (eşleme oturumu hükmü 2026-07-19): kural
 *  `dayanaksız: "gerekçe metni"` taşıyorsa dayanak borcu BİLİNÇLİ beyanlıdır —
 *  planlanmamış deseninin yasa ikizi: neden metni zorunlu, boş beyan sayılmaz. */
function dayanaksizBeyanli(d: Dugum): boolean {
  const p = [...d.parametreler, ...d.ozellikler].find((x) => x.ad === "dayanaksız");
  return Boolean(p?.deger.metin?.trim());
}

/** Karne sayacı: programdaki dayanaksız kural KOD'ları (Sol gözlemi: boş liste
 *  dayanak SAYILMAZ — dayanak: [] nöbeti susturamaz). Bilinçli beyanlı kural
 *  borç listesine girmez (ayrı sayaç: beyanliDayanaksizKurallar). */
export function dayanaksizKurallar(program: Program): string[] {
  const out: string[] = [];
  const dayanakli = (d: Dugum): boolean => {
    const p = [...d.parametreler, ...d.ozellikler].find((x) => x.ad === "dayanak");
    if (!p) return false;
    if (p.deger.tur === "liste") return (p.deger.ogeler?.length ?? 0) > 0;   // boş liste = dayanaksız
    return Boolean(p.deger.metin);
  };
  const gezz = (d: Dugum): void => {
    if (kuralMi(d) && !dayanakli(d) && !dayanaksizBeyanli(d)) {
      const kod = [...d.parametreler, ...d.ozellikler].find((x) => x.ad === "kod")?.deger?.metin;
      out.push(kod ?? d.ad);
    }
    for (const c of d.cocuklar) gezz(c);
  };
  for (const b of program.bildirimler) gezz(b);
  return out;
}

/** Bilinçli-beyanlı dayanaksız kurallar — karne şeffaflığı (beyan gizleme değildir). */
export function beyanliDayanaksizKurallar(program: Program): string[] {
  const out: string[] = [];
  const gezz = (d: Dugum): void => {
    if (kuralMi(d) && dayanaksizBeyanli(d)) {
      const kod = [...d.parametreler, ...d.ozellikler].find((x) => x.ad === "kod")?.deger?.metin;
      out.push(kod ?? d.ad);
    }
    for (const c of d.cocuklar) gezz(c);
  };
  for (const b of program.bildirimler) gezz(b);
  return out;
}

/**
 * Bellek(terfi: bekliyor) → SARI uyarı (YUZ-4.1 ikinci yarı): değerli/tekrar eden ders
 * Beceri'ye terfi ETMELİ — "skile dönüştür + bir kenara (Etmen/Adım) bağla".
 * Terfi edilmeyen değerli ders = kayıp öğrenme (CLAUDE.md Bellek→Beceri zorlaması).
 */
function bellekTerfiDenetle(d: Dugum, b: Baglam): void {
  if (d.ad !== "Bellek") return;
  const terfi = alanDeger(d, "terfi");
  if (terfi !== "bekliyor") return;
  const ne = alanDeger(d, "ne") ?? "";
  const kisa = ne.length > 70 ? ne.slice(0, 70) + "…" : ne;
  b.out.push(eskiTani("beceri-terfisi", "uyarı",
    { kimlik: kimlik(d), ne: kisa }, { satir: d.satir, sutun: d.sutun }));
}

/** Adım durum enum'u (EKL-F7-A01 · STR-4): beklemede → geliştirmede → tamamlandı | bloklu.
 *  Yokluk = beklemede (varsayılan, yol haritası paneli böyle okur).
 *  Değerler KANONDAN okunur (KRR-MUT Sütun D — elle kopya ×3 tek kaynağa indi). */
function adimDurumlari(b: Baglam): Set<string> {
  return new Set(b.snf.semalar?.["Adım"]?.enum?.["durum"] ?? ["beklemede", "geliştirmede", "tamamlandı", "bloklu"]);
}
function adimDurumDenetle(d: Dugum, b: Baglam): void {
  if (d.ad !== "Adım") return;
  // Gövde (özellik) olarak yazılan durum'u da yakala — enum deliği kapandı.
  const p = d.parametreler.find((x) => x.ad === "durum") ??
            d.ozellikler.find((x) => x.ad === "durum");
  if (!p || !p.deger.metin) return;
  if (p.deger.metin === "geliştirmede") {
    // 🚧 çapa (EKL-F7-A05 → Founder entegrasyonu 2026-07-06): ŞU AN nerede
    // çalışıldığı panelde MAVİ görünür — "insan hatırlamaz, sistem gösterir".
    const ne = alanDeger(d, "ne") ?? "";
    b.out.push(eskiTani("geliştirmede-çapa", "bilgi",
      { kimlik: kimlik(d), ne: ne.length > 70 ? ne.slice(0, 70) + "…" : ne },
      { satir: d.satir, sutun: d.sutun }));
    return;
  }
  if (p.deger.metin === "bloklu") {
    // ⛔ rozet (STR-4): ŞEF koşusu BLOCKED mühürledi — uçucu sonuç plana KALICI
    // yansıdı; kırmızı görünürlük panelde/Problems'te ("insan hatırlamaz, sistem gösterir").
    const ne = alanDeger(d, "ne") ?? "";
    // MDR-A02: "ŞEF kararı BLOCKED" iç-jargonu açıldı (R1) — yeni kullanıcı ŞEF'i/BLOCKED'ı bilmez.
    b.out.push(eskiTani("bloklu-çapa", "uyarı",
      { kimlik: kimlik(d), ne: ne.length > 70 ? ne.slice(0, 70) + "…" : ne },
      { satir: d.satir, sutun: d.sutun }));
    return;
  }
  if (p.deger.metin === "doğrulanmamış") {
    // 🟠 çapa (YAS-4.2 · kanıt-ekseni turu): ŞEF koşusu COMPLETED mühürledi — iş teslim edildi
    // ama bağımsız kanıt yok; plan yüzeyi bunu 'tamamlandı'dan AYIRIR (kör-drift YAS-3.4).
    const ne = alanDeger(d, "ne") ?? "";
    b.out.push(eskiTani("doğrulanmamış-çapa", "uyarı",
      { kimlik: kimlik(d), ne: ne.length > 70 ? ne.slice(0, 70) + "…" : ne },
      { satir: d.satir, sutun: d.sutun }));
    return;
  }
  if (adimDurumlari(b).has(p.deger.metin)) return;
  b.out.push(eskiTani("geçersiz-durum", "uyarı",
    { kimlik: kimlik(d), deger: p.deger.metin }, { satir: p.satir, sutun: p.sutun }));
}

function tipDenetle(d: Dugum, b: Baglam): void {
  if (b.gecerli.has(d.ad)) return;
  const yakin = enYakin(d.ad, [...b.gecerli]);
  b.out.push(eskiTani("bilinmeyen-tip", "hata",
    { ad: d.ad, yakin }, { satir: d.satir, sutun: d.sutun }));
}

function sarmaDenetle(ebeveyn: Dugum, cocuk: Dugum, b: Baglam): void {
  const e = ebeveyn.ad;
  const c = cocuk.ad;

  // TIP-1 anlık tip: EBEVEYN kullanıcı-tanımlıysa sarmayı İLANI belirler —
  // içerir: verilmişse o liste; verilmemişse yaprak (çocuk sarmaz).
  const eTanim = b.kullanici.get(e);
  if (eTanim) {
    if (eTanim.icerir) {
      if (!eTanim.icerir.includes(c)) {
        ekleSarma(b, cocuk, c, { kusur: "ilan-dışı", ebeveyn: e, çocuk: c, izinli: eTanim.icerir });
      }
    } else {
      ekleSarma(b, cocuk, c, { kusur: "ilansız-yaprak", ebeveyn: e, çocuk: c });
    }
    return;
  }
  // ÇOCUK kullanıcı-tanımlıysa: ilanlı tip serbest yerleşir (v1 — TIP-1 ⑥).
  if (b.kullanici.has(c)) return;
  if (!b.yerlesik.has(e) || !b.yerlesik.has(c)) return;

  const { duzen, yaprak } = b.snf.yuzeyKurali;

  if (duzen.includes(e)) {
    if (!(duzen.includes(c) || yaprak.includes(c))) {
      ekleSarma(b, cocuk, c, { kusur: "yüzey-dışı", ebeveyn: e, çocuk: c });
    }
    return;
  }
  if (yaprak.includes(e)) {
    ekleSarma(b, cocuk, c, { kusur: "yaprak", ebeveyn: e, çocuk: c });
    return;
  }
  const izinli = b.snf.izinliSarma[e];
  if (izinli) {
    if (!izinli.includes(c)) {
      ekleSarma(b, cocuk, c, { kusur: "izinsiz-çocuk", ebeveyn: e, çocuk: c, izinli });
    } else if (e === "AltKatman" && c === "AltKatman" &&
               cocuk.cocuklar.some((t) => t.tur === "widget" && t.ad === "AltKatman")) {
      // AltKatman derinlik freni (RF-T3-A01: eşik 3→4+ seviyeye indi — MIM-1.5 ideali
      // Katman→AltKatman→Adım'ı meşru üçüncü kademe yaptı, Alt² artık fren yemez):
      // AltKatman³ zinciri = 4+ seviyeli dal — ceza değil soru.
      b.out.push(eskiTani("derin-dal", "bilgi", {}, { satir: cocuk.satir, sutun: cocuk.sutun }));
    } else if (e === "Katman" && c === "Adım" &&
               ebeveyn.cocuklar.find((t) => t.tur === "widget" && t.ad === "Adım") === cocuk) {
      // MIM-1.5 bekçisi (RF-T3-A01): önerilen diziliş Katman → AltKatman → Adım.
      // Düzey BİLGİ — yapısal öneridir, zorunlu değildir. Katman başına TEK tanı
      // (yalnız İLK Adım çocuğunda ateşlenir — panel/CLI seli önlenir). Mesaj
      // ZAMANSIZDIR (OGR-2.1 sade dil): plan/tarih notu koda yazılmaz, planda yaşar.
      b.out.push(eskiTani("çıplak-adımlı-katman", "bilgi", {}, { satir: cocuk.satir, sutun: cocuk.sutun }));
    }
    // MIM-1 TERFİ (Founder onayı 2026-07-12): eski-diziliş kademe tanısı görevini
    // tamamlayıp KALKTI — Blok→Faz kanondan silindi, eski yazım artık izinsiz-sarma HATASIDIR.
    return;
  }
  // e geçerli ama sarma tablosunda yok → containment yapmaz.
  ekleSarma(b, cocuk, c, { kusur: "sarmaz", ebeveyn: e, çocuk: c });
}

// ORK-2.1 (BKM-KAPI-A04): gömülü Mekanizma'ya ÖZEL yönlendirme — kesişen altyapı
// BİR KEZ üst-düzeyde ilan edilir, plan Adım'ı 'bağımlı:' ile referans verir. Bu
// yönlendirmenin CÜMLESİ katalogda yaşar; burada yalnız hangi ebeveynlerin meşru
// olduğu HESAPLANIR ve bağlam olarak geçilir (CDL-A02 tek kaynak hükmü).
function ekleSarma(b: Baglam, cocuk: Dugum, c: string, baglam: TaniBaglami): void {
  b.out.push(eskiTani("izinsiz-sarma", "hata",
    { ...baglam, ebeveynler: mesruEbeveynler(c, b.snf) },
    { satir: cocuk.satir, sutun: cocuk.sutun }));
}

/** Bir tipin kanona göre altına konabileceği ebeveynler — cümle değil, OLGU. */
function mesruEbeveynler(c: string, snf: Siniflama): string[] {
  const ebeveynler: string[] = [];
  for (const [e, cocuklar] of Object.entries(snf.izinliSarma)) {
    if (cocuklar.includes(c)) ebeveynler.push(e);
  }
  if (snf.yuzeyKurali.duzen.includes(c) || snf.yuzeyKurali.yaprak.includes(c)) {
    ebeveynler.push(ORTAK_TANI_METINLERI.yuzeyDuzeniEbeveyni({}));
  }
  return ebeveynler;
}

// ── öneri motoru: en yakın geçerli ad (Levenshtein) ──────────────────────────

function enYakin(ad: string, adaylar: string[]): string | undefined {
  let en: string | undefined;
  let enUzaklik = Infinity;
  const a = ad.toLocaleLowerCase("tr");
  for (const c of adaylar) {
    const u = uzaklik(a, c.toLocaleLowerCase("tr"));
    if (u < enUzaklik) { enUzaklik = u; en = c; }
  }
  return enUzaklik <= 3 ? en : undefined;
}

function uzaklik(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const d: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const bedel = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + bedel);
    }
  }
  return d[m][n];
}

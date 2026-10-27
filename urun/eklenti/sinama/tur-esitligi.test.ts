// ═══════════════════════════════════════════════════════════════════════════
// tur-esitligi.test.ts — ⏱️ TUR EŞİTLİĞİ NÖBETİ (PNL-A14)
//
//   PNL-A14 denetim turunu iki yerde hızlandırdı: dosyalar sırayla değil
//   sınırlı eşzamanlılıkla okunur ve tek-dosya tanısı metni ikinci kez
//   ayrıştırmak yerine turun ağacını kullanır. Adımın sınırı denetim
//   kurallarının değişmemesi, turun ürettiği tanıların BİREBİR aynı
//   kalmasıdır. Bu nöbet o sınırın ölçüsüdür.
//
//   Ölçüm GERÇEK bir ağaç üzerinde yapılır: varsayılan olarak bu deponun kendi
//   kökü (yüzlerce gerçek `.sar` dosyası, gerçek kanon, gerçek tanılar);
//   `SARMAL_TUR_ESITLIGI_KOKU` ortam değişkeni başka bir çalışma alanı kökü
//   verir. Eklentinin gerçek girişi sahte editörde iki kez etkinleşir:
//
//     · ÜRETİM paketi bugünkü kaynaktır.
//     · BAŞVURU paketi `src/tur-belgesi.ts` yerine `tur-belgesi-referans.ts`
//       modülünü koyar; o modül değişiklikten ÖNCEKİ iki davranışı (sıralı
//       okuma, tanı için taze ayrıştırma) eski gövdeyle taşır.
//
//   İki etkinleşmede de okumalar yola bağlı yapay bir gecikmeyle biter; böylece
//   paralel okumaların BİTİŞ SIRASI istek sırasından farklıdır ve okumaların
//   bitiş sırasına bağımlı bir toplama ancak böyle görünür olur.
//
//   Ağacın üç gerçek dosyası editörde açık sayılır ve turun üç belge yolunu
//   birden koşturur: biri kaydedilmemiş bir düzenleme taşır (bellekten okunur;
//   eklenen sahipsiz belge yorumu yalnız bellekteki metinde vardır ve bir uyarı
//   doğurur), biri kaydedilmemiş ve söz dizimi kırık bir düzenleme taşır (ağacı
//   kurulamaz; söz dizimi tanısı tanının kendi ayrıştırmasından gelir), biri
//   temizdir (BKM-DNT-A18 gereği diskten okunur). Böylece "kaydedilmemiş
//   değişiklik taşıyan açık belge bellekten okunur" kuralı ve ağacı olmayan
//   belgenin tanı yolu da aynı karşılaştırmaya girer.
//
//   Karşılaştırılan çıktı turun bütün dış yüzüdür: Sorunlar koleksiyonu (dosya
//   ekleme sırasıyla), Hatırlatıcılar ile Bildirimler kayıtları, tur görüntüsü
//   (ağaçların kendisiyle, harita sırasıyla), panellerin gösterdiği kodlar ve
//   kanal satırının belge sayaçları. Fark bulunduğunda nöbet farkın ilk yerini
//   adıyla söyler; yirmi megabaytlık bir döküm basmaz.
// ═══════════════════════════════════════════════════════════════════════════

import "./dil-kur.ts";
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { sarKapsamDisi } from "../src/izleyici-cekirdek.ts";
import { etkinlestir, kabukTemizle, paketKur, sonTurGoruntusu, type EtkinEklenti } from "./etkinlesme-kabugu.ts";

after(() => kabukTemizle());

const KOK = process.env.SARMAL_TUR_ESITLIGI_KOKU
  ?? fileURLToPath(new URL("../../../", import.meta.url)).replace(/\/$/, "");
const TUR_BELGESI = fileURLToPath(new URL("../src/tur-belgesi.ts", import.meta.url));
const REFERANS = fileURLToPath(new URL("./tur-belgesi-referans.ts", import.meta.url));

/** Yola bağlı, belirlenimci 0–3 ms gecikme (FNV-1a): bitiş sırası istek sırasından ayrışır. */
function gecikme(yol: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < yol.length; i++) { h ^= yol.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0) % 4;
}

/** Kökün tur evrenindeki `.sar` dosyaları (gizli dizinler ve kapsam dışı raflar hariç), sıralı. */
function sarDosyalari(kok: string): string[] {
  const bulunan: string[] = [];
  const in_ = (dizin: string): void => {
    for (const g of readdirSync(dizin, { withFileTypes: true })) {
      if (g.name.startsWith(".") || g.name === "node_modules") continue;
      const yol = join(dizin, g.name);
      if (g.isDirectory()) in_(yol);
      else if (g.name.endsWith(".sar") && !g.name.endsWith("_anadizin.sar") && !sarKapsamDisi(relative(kok, yol))) bulunan.push(yol);
    }
  };
  in_(kok);
  return bulunan.sort();
}

/** Açık sayılacak üç dosya: kaydedilmemiş düzenleme · kaydedilmemiş kırık düzenleme · temiz. */
function acikBelgeler(): { yol: string; metin?: string }[] {
  const dosyalar = sarDosyalari(KOK);
  const sec = (oran: number): string => dosyalar[Math.floor(dosyalar.length * oran)]!;
  const [duzenli, kirik, temiz] = [sec(1 / 4), sec(1 / 2), sec(3 / 4)];
  return [
    { yol: duzenli, metin: `${readFileSync(duzenli, "utf8")}\n/// PNL-A14 eşitlik nöbeti: kaydedilmemiş düzenleme\n` },
    { yol: kirik, metin: `${readFileSync(kirik, "utf8")}\n((( PNL-A14 eşitlik nöbeti: kırık düzenleme\n` },
    { yol: temiz },
  ];
}

/** Turun dış yüzü: her parça ayrı ayrı karşılaştırılır. */
interface TurCiktisi {
  tanilar: [string, unknown[]][];
  yuzey: unknown;
  programlar: [string, unknown][];
  goruntu: unknown;
  paneller: unknown;
  belgeler: string | undefined;
}

async function turCiktisi(paket: string, acik: { yol: string; metin?: string }[]): Promise<TurCiktisi> {
  // Kimlik indeksi taraması turla aynı anda koşar fakat turun hiçbir çıktısına
  // girmez (tur indeksi okumaz); deponun bütün .md ve .ts dosyalarını okuduğu için
  // nöbetin süresini ikiye katlıyordu. İki pakette de aynı biçimde kapatılır.
  const e: EtkinEklenti = etkinlestir({
    klasorler: [KOK], paket, okumaGecikmesi: gecikme, acikBelgeler: acik, bosArama: ["**/*.{sar,md,ts}"],
  });
  try {
    await e.turBekle(300_000);
    const g = sonTurGoruntusu();
    assert.ok(g, "paket tur görüntüsü kapısını taşımıyor; nöbet ağacı göremez");
    const tur = [...e.kayit.kanallar.values()].flat().find((s) => s.includes("belgeler:"));
    return {
      tanilar: [...e.kayit.tanilar],
      yuzey: e.yuz?.yuzeyKayitlari?.(),
      programlar: [...g.programlar],
      goruntu: { yollar: g.yollar, kirik: g.kirik, okunamayan: g.okunamayan, dilDışı: g.dilDışı, tetik: g.tetik, kapsam: g.kapsam },
      paneller: { onay: e.yuz?.onayKapilari?.(), yolHaritasi: e.yuz?.yolHaritasiKodlari?.() },
      // Belge sayaçları ve okunan bayt (süreler değil): "belgeler: …" bölümü.
      belgeler: tur ? /belgeler: [^|]*/u.exec(tur)?.[0]?.trim() : undefined,
    };
  } finally {
    e.kapat();
  }
}

/** İki listede ilk ayrışan girdinin adı (anahtar ya da sıra); ayrışma yoksa `undefined`. */
function ilkAyrisma(a: [string, unknown][], b: [string, unknown][]): string | undefined {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    if (a[i]?.[0] !== b[i]?.[0]) return `${i}. sıradaki dosya: ${a[i]?.[0] ?? "(yok)"} ≠ ${b[i]?.[0] ?? "(yok)"}`;
    if (JSON.stringify(a[i]?.[1]) !== JSON.stringify(b[i]?.[1])) return `${a[i]![0]} içeriği`;
  }
  return undefined;
}

test("EŞİTLİK (PNL-A14): gerçek ağaçta hızlı tur ile değişiklik öncesi tur birebir aynı tanıyı ve görüntüyü üretir", async () => {
  const acik = acikBelgeler();
  const uretim = await turCiktisi(await paketKur(), acik);
  const basvuru = await turCiktisi(await paketKur({ yerineKoy: { [TUR_BELGESI]: REFERANS } }), acik);

  // Nöbet boş bir ağaçta ya da belge yolları koşmadan yeşil kalıp hiçbir şey
  // ölçmüyor olmasın. Ön koşul BAŞVURU çıktısında, yani değişiklik öncesi turda
  // ölçülür: üretimdeki bir kusur ön koşula değil aşağıdaki eşitliğe takılır ve
  // farkın yeri adıyla okunur.
  assert.ok(basvuru.programlar.length >= 20, `ağaç çok küçük (${basvuru.programlar.length} program); ölçüm gerçek bir ağaç ister`);
  const taniSayisi = basvuru.tanilar.reduce((t, [, l]) => t + l.length, 0);
  assert.ok(taniSayisi > 0, "Sorunlar koleksiyonunda hiç tanı yok; tanı yolu ölçülmüyor");
  assert.match(basvuru.belgeler ?? "", /açıktan 2 ·/u, "kaydedilmemiş iki açık belge bellekten okunmadı; belge yolu ölçülmüyor");
  assert.deepEqual((basvuru.goruntu as { kirik: string[] }).kirik, [acik[1]!.yol],
    "kaydedilmemiş kırık düzenleme turun kırık listesine girmedi; ağaçsız tanı yolu ölçülmüyor");

  assert.equal(uretim.belgeler, basvuru.belgeler, "belge sayaçları ya da okunan bayt toplamı ayrıştı");
  assert.deepEqual(uretim.goruntu, basvuru.goruntu, "tur görüntüsünün yol kümeleri ayrıştı");
  const program = ilkAyrisma(uretim.programlar, basvuru.programlar);
  assert.equal(program, undefined, `tur görüntüsünün ağaçları ayrıştı: ${program}`);
  const tani = ilkAyrisma(uretim.tanilar, basvuru.tanilar);
  assert.equal(tani, undefined, `Sorunlar koleksiyonu ayrıştı: ${tani}`);
  assert.equal(JSON.stringify(uretim.yuzey), JSON.stringify(basvuru.yuzey), "Hatırlatıcılar ya da Bildirimler kayıtları ayrıştı");
  assert.deepEqual(uretim.paneller, basvuru.paneller, "panellerin gösterdiği kodlar ayrıştı");
});

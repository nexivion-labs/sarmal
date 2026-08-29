// ═══════════════════════════════════════════════════════════════════════════
// yolharitasi-cekirdek.ts — 🪆 VARLIK KÜMESİ ÇEKİRDEĞİ (EKL-F7-A09)
//
//   Founder hükmü (2026-08-24): yol haritasında varlıklar birbirini kapsayan
//   kümeler gibi görünür — kökte yalnız kapsayıcı durur, kapsananlar onun
//   altına iner. Bu dosya o ilişkinin vscode'suz saf çekirdeğidir; panel
//   (yolharitasi.ts) yalnız buradan okur ve birim nöbeti bu dosyayı sınar
//   (yolharitasi-hiyerarsi.test.ts). Dosya AİDİYET çözümüne dokunmaz: bir
//   dosyanın hangi varlığa ait olduğu yukarı yürüme ile (varlikBul) bulunur,
//   burada yalnız varlıkların birbirini kapsaması modellenir.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Bir yol, verilen kökün KAPSAMINDA mı? Kökün kendisi de kapsama dâhildir.
 *
 * Sınır klasör ayracıdır ve bu bilerek böyledir: çıplak `startsWith` kullanılsa
 * "…-arsiv" gibi ad benzerliği taşıyan kardeş bir kök yanlışlıkla kapsanan
 * sayılırdı. Yol ayırıcıları karşılaştırma öncesinde eşitlenir ve sondaki ayırıcı
 * düşer; aksi hâlde aynı dizin iki farklı yazımla iki farklı kök sayılırdı.
 *
 * BU İŞLEV KAPSAMA İLİŞKİSİNİN TEK EVİDİR. Yol haritasındaki varlık kümeleri de,
 * panellerin aktif varlık süzgeci de (eklenti.panelDeGorunur) buradan okur.
 * İkinci bir kapsama kuralı yazılmaz: iki kural olsaydı biri sessizce bayatlar ve
 * yol haritası bir varlığı çatının altında gösterirken paneller onu gizlerdi.
 */
export function kapsamIcinde(yol: string, ustKok: string): boolean {
  const duzle = (y: string): string => y.replace(/\\/g, "/").replace(/\/+$/, "");
  const k = duzle(yol);
  const u = duzle(ustKok);
  return k === u || k.startsWith(`${u}/`);
}


/** Her varlığı, kök dizinini önek olarak kapsayan EN DERİN diğer varlığa
 *  bağlar; üstü olmayan varlık küme köküdür. */
export function varlikUstleri<T extends { kokDizin: string }>(varliklar: readonly T[]): Map<T, T | undefined> {
  const usteBagla = new Map<T, T | undefined>();
  for (const v of varliklar) {
    let ust: T | undefined;
    for (const aday of varliklar) {
      if (aday === v || aday.kokDizin === v.kokDizin) continue;
      if (!kapsamIcinde(v.kokDizin, aday.kokDizin)) continue;
      if (!ust || aday.kokDizin.length > ust.kokDizin.length) ust = aday;
    }
    usteBagla.set(v, ust);
  }
  return usteBagla;
}

/** Varlık satırının simgesi tipine göre ayrışır (Founder 2026-08-25): kapsayan
 *  çalışma alanı İSTASYONDUR, kapsanan proje ile uygulama SEFERDİR — tren
 *  dilinde lokomotifler istasyonun çatısı altında yaşar. */
export function varlikSimgesi(tip: string): "istasyon" | "sefer" {
  return tip === "ÇalışmaAlanı" ? "istasyon" : "sefer";
}

/** Bir dosya yolunun yaşadığı EN DERİN varlık — iç içe köklerde ilk eşleşen
 *  değil en uzun önek kazanır; aktiflik nabzı yanlış kümeye vurmaz. */
export function enDerinVarlik<T extends { kokDizin: string }>(varliklar: readonly T[], yol: string): T | undefined {
  let secim: T | undefined;
  for (const v of varliklar) {
    if (!kapsamIcinde(yol, v.kokDizin)) continue;
    if (!secim || v.kokDizin.length > secim.kokDizin.length) secim = v;
  }
  return secim;
}

// ── ⚡ PRF-A06: KENAR YAPISI İMZASI VE TOPOLOJİK SIRA BELLEĞİ ────────────────
//
//   Ölçülmüş kusur (2026-08-29, bu Adımın ölçüm merceği): panel tazelemesi her
//   turda `topolojikSira` işlevini bütün grafa yeniden koşturuyordu. İşlevin
//   maliyeti düğüm sayısıyla karesel büyür, çünkü sırada bir sonraki düğümü
//   seçen yardımcısı her adımda bütün anahtar listesini yeniden kurup
//   sıralamaktadır. Ölçüm şudur: sarmal kökünde bin üç yüz altmış iki düğüm için
//   üç yüz yetmiş altı milisaniye, dört projeyi kapsayan çatı kökünde iki bin
//   dokuz yüz otuz iki düğüm için iki bin doksan üç milisaniye. Bu süre, tur
//   koşarken eklenti sürecinin bölünmeden bloke olduğu süredir ve Founder'ın
//   yazarken duyduğu takılmanın ölçülmüş kaynağıdır.
//
//   Onarımın dayanağı şudur: sıra, kenar yapısının SAF bir işlevidir. Bir `.sar`
//   kaydının büyük çoğunluğu düz yazıya (`ne:`, `koşu:`, `rapor:`) ya da duruma
//   dokunur ve kenar yapısına hiç dokunmaz; böyle bir turda önceki sıra hâlâ
//   birebir doğrudur ve yeniden hesaplanması saf israftır. İmza kenar yapısının
//   kanonik özetidir ve iki milisaniyenin altında kurulur; imza değişmediyse
//   hesap hiç koşmaz, değiştiyse eskisi gibi tam hesap koşar. Böylece hiçbir
//   turda bayat sıra gösterilmez ve kenar değiştiren turda gerileme olmaz.
//
//   Motorun kendisine (cekirdek/dag.ts) DOKUNULMAMIŞTIR: bu Adımın sınırı
//   çekirdeği artımlı hâle getirmeyi dışarıda bırakır. Karesel maliyet orada
//   durmaya devam eder ve ayrı bir Adımın konusudur; burada yalnız o maliyetin
//   kaç kez ödendiği düşürülür.

/** İmzanın okuduğu en dar düğüm yüzü — çekirdeğin `Dag` tipine bağlanmadan
 *  yapısal olarak eşleşir, böylece çekirdek imzası değişse de bu dosya
 *  vscode'suz ve motor-bağımsız kalır. */
export interface KenarliDugum {
  readonly oncekiler: readonly string[];
  readonly sonrakiler: readonly string[];
}

/**
 * Kenar yapısının kanonik özeti — topolojik sıranın ve etki kapanışının
 * bağlı olduğu TEK girdi.
 *
 * Özet, düğüm anahtarlarına göre SIRALANIR: `dagKur` haritasını dosya keşif
 * sırasıyla kurar ve aynı graf iki turda farklı ekleme sırasıyla doğabilir.
 * Sıralama olmasaydı yapı hiç değişmediği hâlde imza değişir, önbellek ıskalar
 * ve kazanç sessizce kaybolurdu. Kenar listeleri de sıralanır: aynı gerekçe
 * onlar için de geçerlidir.
 *
 * Ayraçlar (`<`, `>`, `;`) kod ile kenar listesi arasındaki sınırı belirsiz
 * bırakmaz; ayraçsız birleştirmede iki ayrı grafın aynı dizeye çökmesi
 * mümkündür ve o durumda değişen bir yapı değişmemiş sayılırdı.
 */
export function grafImzasi(dugumler: ReadonlyMap<string, KenarliDugum>): string {
  const parcalar: string[] = [];
  for (const kod of [...dugumler.keys()].sort()) {
    const d = dugumler.get(kod)!;
    parcalar.push(kod, "<", [...d.oncekiler].sort().join(","),
                  ">", [...d.sonrakiler].sort().join(","), ";");
  }
  return parcalar.join("");
}

/**
 * Topolojik sıra belleği: aynı kenar yapısı için hesabı bir kez koşar.
 *
 * Bellek YALNIZ imzaya bakar ve başka hiçbir şeye bakmaz; bu yüzden bayat sıra
 * döndürmesi imkânsızdır — yapı değiştiği anda imza da değişir ve hesap koşar.
 * `yenidenHesaplandi` alanı nöbetin ölçtüğü kanıttır: hesabın koşup koşmadığı
 * süre ölçümüne değil bu bayrağa bakılarak sınanır, çünkü süre ölçümü makinenin
 * anlık yüküne göre dalgalanır ve nöbeti kırılgan yapardı.
 */
export class SiraBellegi {
  private imza: string | undefined;
  private sira: readonly string[] = [];

  al(imza: string, hesapla: () => readonly string[]): { sira: readonly string[]; yenidenHesaplandi: boolean } {
    if (this.imza === imza) return { sira: this.sira, yenidenHesaplandi: false };
    this.imza = imza;
    this.sira = hesapla();
    return { sira: this.sira, yenidenHesaplandi: true };
  }

  /** Belleği boşaltır — bir sonraki istek hesabı koşturur. */
  unut(): void { this.imza = undefined; this.sira = []; }
}

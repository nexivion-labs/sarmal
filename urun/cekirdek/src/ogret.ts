// ═══════════════════════════════════════════════════════════════════════════
// ogret.ts — 🚪 KARŞILAMA KARTI (davranış-katmanı turu · OGR-2.2 davranış katmanı)
//
//   Sarmal'la İLK KEZ karşılaşan bir ajanın/geliştiricinin tek ekranda yönünü
//   bulması: kopyalanabilir minimal geçerli dosya + tam omurga + koni alanları
//   + yaz→denetle→düzelt döngüsü. Kart KANONDAN ÜRETİLİR (YUZ-1.2: elle yazılmaz,
//   kanon değişince kart kendiliğinden değişir — bayatlamaz): plan eksenlerinin
//   anlatısı widgetTipleri.ne'den, koni alanları KONI_ALANLARI'ndan, zorunlu
//   kenar kuralları snf.zorunluKenarlar'dan gelir. SAF — diske/konsola dokunmaz;
//   CLI kabuğu (sarmal.ts `ogret`) yalnız basar.
// ═══════════════════════════════════════════════════════════════════════════

import type { Siniflama } from "./siniflama.ts";
import { KONI_ALANLARI } from "./koni.ts";
import { MCP_ARAC_ADI } from "./mcp-metinleri.ts";   // araç adları protokol kimliğidir — anlatı onları sicilden okur
import { DOSYA_MUHRU_KUMESI, type MuhurTuru } from "./kimlik.ts";   // KPS-MHR-A01: mühür kümesi tek çözücünün yanından okunur
import { YENI_TANI_KANONU } from "./tani-sicili.ts";   // KPS-MHR-A01: MIM-3.4 tanıları sicilden okunur
import {
  dilHanesi,
  etkinCiktiDili,
  sozlukAdi,
  sozlukDegeri,
  sozlukDuzYazisi,
  type CiktiDili,
} from "./cevir.ts";

/** Kopyalanabilir MİNİMAL GEÇERLİ proje — kartın kendi kendini kanıtlayan çekirdeği:
 *  test iki dosyayı diske yazar ve `denetle` ⛔0 bekler (kart yalan söyleyemez).
 *  İKİ dosya bilinçlidir (MIM-1.3 kuruluş kuralı): anadizin MİMARİYİ çizer, plan
 *  AYRI dosyada (is/plan/ rafında) büyür — tek-dosya örneği bu kuralı ihlal ederdi. */
export const MINIMAL_ANADIZIN = `-->|
## Amaç
Sarmal ile ilk proje — bu dosya mimariyi çizer, plan ayrı dosyada büyür.
## Kapsam
Bir teknoloji ilanı ve işin kitaplığı; ilk iş is/plan/ilk_plan.sar dosyasındadır.
## Sonuç
denetle ⛔0 — kart örneği kendini kanıtlar.
|<--
Proje( kod: PRJ-ILK, ad: "ilk_proje", rejim: katı, ne: "Sarmal ile ilk proje" ) {
  Teknoloji( kod: TEK-TS, ne: "TypeScript çalışma dili" )
  // ⚠️ KİTAPLIK KADEMESİ ZORUNLUDUR (Founder hükmü 2026-09-09): dallanan her klasör
  //    bir Kitaplıktır ve raflar Kitaplıkların İÇİNDE yaşar; kökün altına çıplak Raf
  //    yazılmaz, çünkü kök ağaç büyüdükçe okunamaz bir raf listesine döner.
  Kitaplık( kod: KTP-IS, yol: "is/", ne: "İşin kitaplığı — planın rafı burada yaşar" ) {
    Raf( kod: RAF-PLAN, yol: "plan/", ne: "plan dosyaları rafı" )
  }
}`;

export const MINIMAL_PLAN = `Faz( kod: FAZ-MVP, ad: "İlk Sürüm Mevsimi", ne: "ilk sürüm dönemi", hedefTarih: "2026-12-31" ) {
  // ⚠️ Belge bloğu KENDİNDEN SONRAKİ düğüme bağlanır — bu belge Blok'undur, Faz'ın değil.
  //    Her Blok kendi belge bloğunu taşır (Amaç · Kapsam · Sonuç zorunludur).
  -->|
  ## Amaç
  İlk işi taşıyan çekirdek gövde — Blok, işin fazlar boyu büyüyen tek evidir.
  ## Kapsam
  Bir teknoloji katmanı, bir departman modülü ve iki iş adımı.
  ## Sonuç
  Adımlar kapanınca gövde biter; kapanış kanıtı koşu alanına yazılır.
  |<--
  Blok( kod: BLK-CEKIRDEK, ad: "Çekirdek Gövde", ne: "çekirdek iş" ) {
    Katman( kod: KAT-ARKAYUZ, ad: "Arka Yüz", ne: "arka yüz teknolojisi", kullanır: TEK-TS ) {
      // Katman → AltKatman → Adım: Adımlar departman modüllerinde toplanır.
      AltKatman( kod: ALT-KODLAMA, ad: "Kodlama", departman: kodlama, ne: "kod yazım modülü" ) {
        Adım( kod: ADM-ILK, durum: beklemede, ne: "ilk işin amacı ve çözdüğü problem",
              görev: "yapılacak işlemler burada tam cümlelerle anlatılır",
              kabul: [ "sınanabilir bitiş koşulu burada yazılır" ] )
        Adım( kod: ADM-IKINCI, durum: beklemede, ne: "ikinci işin amacı",
              görev: "işlemler", kabul: [ "bitiş koşulu" ] )
      }
    }
  }
}`;

// ═══════════════════════════════════════════════════════════════════════════
// 🌱 DOĞUŞ ANLATISI — BKM-DNT-A16 · Founder hükmü 2026-09-09
//
//   Ölçülmüş kök sebep şudur: beceri kartları yalnız bir Adım `geliştirmede`
//   durumundayken ateşler, dolayısıyla henüz hiçbir Adımı bulunmayan BOŞ bir
//   ağaçta hiçbir kart ateşleyemez. Doğuş anı, öğretinin ulaşamadığı tek andır
//   ve yanlış ağacın kurulduğu an tam olarak o andır. Bu yüzden öğreti burada,
//   ajanın atlayamayacağı iki kanaldan verilir: boş dizinde de koşan rehber
//   (`basla`) ve oturum açılışında kendiliğinden basılan karşılama kartı
//   (`ogret`). Metin TEK yerde yaşar ve üç çağrı yerinden okunur (YUZ-1.2);
//   elle ikizlenirse kanallardan biri sessizce bayatlar.
//
//   Araç adları kanonik sicilden (MCP_ARAC_ADI) okunur: bir araç yeniden
//   adlandırıldığında anlatı kendiliğinden tazelenir, elle bakım gerekmez.
// ═══════════════════════════════════════════════════════════════════════════
export function dogusAnlatisi(dil: CiktiDili = etkinCiktiDili()): string {
  const y = (tr: string, en: string): string => dilHanesi({ tr, en }, dil);
  const A = MCP_ARAC_ADI;
  const b: string[] = [];

  // ① NE İÇİN VARIZ — ürünün hedefi (FEL-1 · FEL-2 tezlerinin ajan yüzü).
  b.push(y(
    "🌍 NE İÇİN VARIZ — bir ağaç kurmadan önce bunu oku.",
    "🌍 WHAT WE EXIST FOR — read this before you build a tree.",
  ));
  b.push(y(
    "   Sarmal kod üretmez, NİYET üretir: klasör düzenini, teknoloji bağını ve işin",
    "   Sarmal does not produce code, it produces INTENT: it writes the folder layout, the",
  ));
  b.push(y(
    "   sırasını bildirimsel `.sar` dosyalarına yazar, sonra planla disk arasındaki",
    "   technology binding and the order of work into declarative `.sar` files, then measures",
  ));
  b.push(y(
    "   ayrışmayı ölçer. Hedef şudur: uzun ömürlü, az kişili, karar yoğun ve ajan",
    "   the drift between plan and disk. The goal is this: long-lived, small-team,",
  ));
  b.push(y(
    "   ağırlıklı işi insan ile ajan BİRLİKTE yürütebilsin. İnsan niyeti ve onayı",
    "   decision-heavy, agent-heavy work carried out by human and agent TOGETHER. The human",
  ));
  b.push(y(
    "   verir, ajan üretir, motor ikisi arasındaki farkı görünür kılar. Bu yüzden bir",
    "   gives the intent and the approval, the agent produces, and the engine makes the gap",
  ));
  b.push(y(
    "   ağaç kurmak klasör açmak değil, bir işin kalıcı hafızasını yazmaktır.",
    "   between them visible. Building a tree is not creating folders; it is writing the durable memory of a body of work.",
  ));
  b.push("");

  // ② KADEMELİ DOĞUŞ — araç sırası kanonik sicilden okunur.
  b.push(y(
    "🪜 AĞAÇ TEK HAMLEDE DEĞİL, KADEME KADEME KURULUR — her kademe insan onayından geçer.",
    "🪜 A TREE IS BUILT TIER BY TIER, NEVER IN ONE STROKE — every tier passes human approval.",
  ));
  b.push(y(
    `   Sıra zorunludur ve elle yazımın yerine geçer: ① \`${A.basla}\` yazmadan önce rehberi`,
    `   The order is mandatory and replaces hand-writing: ① \`${A.basla}\` gives the guide and the`,
  ));
  b.push(y(
    `   ve kademe şablonunu verir (BOŞ dizinde de koşar) · ② \`${A.dogus}\` çalışır ağacı ARAÇ`,
    `   tier template before you write (it runs in an EMPTY directory too) · ② \`${A.dogus}\` lets the`,
  ));
  b.push(y(
    `   olarak doğurur · ③ \`${A.iskelet}\` ilandaki eksik yapıyı diske indirir · ④ her \`.sar\``,
    `   TOOL give birth to a working tree · ③ \`${A.iskelet}\` lands the declared-but-missing structure on`,
  ));
  b.push(y(
    `   yazımından sonra \`${A.denetleProje}\` koşar ve çıktısı OKUNMADAN sonraki kademeye geçilmez.`,
    `   disk · ④ after every \`.sar\` write \`${A.denetleProje}\` runs, and no next tier starts before its output is read.`,
  ));
  b.push(y(
    "   Kademeler ayrı onay duraklarıdır ve şu sırayla açılır: kapsayıcı tipi seçimi →",
    "   The tiers are separate approval stops and open in this order: choosing the container type →",
  ));
  b.push(y(
    "   Teknoloji ile Takım ilanı → Kitaplık ve Raf mimarisi → plan ekseni (② bölümündeki",
    "   declaring Technology and Team → the Kitaplık/Raf architecture → the plan axes (the chain in",
  ));
  b.push(y(
    "   zincir). Üst kademe onaylanmadan alt kademe yazılmaz; bir kademe atlanıp doğrudan",
    "   section ②). No lower tier is written before the upper one is approved; skipping a tier and",
  ));
  b.push(y(
    "   altındaki açılmaz. Giriş ilanı MİMARİYİ çizer, plan AYRI dosyada büyür ve zaman",
    "   opening the one below it is forbidden. The entry declaration draws the ARCHITECTURE, the plan",
  ));
  b.push(y(
    "   ekseni (Faz) giriş ilanına HİÇ yazılmaz (bekçi: anadizin-plan-karışması).",
    "   grows in a SEPARATE file, and the time axis (Faz) is NEVER written into the entry declaration.",
  ));
  b.push("");

  // ③ DİYALOG DİSİPLİNİ — planlama yavaştır.
  b.push(y(
    "💬 PLANLAMA YAVAŞTIR: ÖNCE KONUŞ, SONRA YAZ.",
    "💬 PLANNING IS SLOW: TALK FIRST, WRITE AFTERWARDS.",
  ));
  b.push(y(
    "   Bir ağaç kurmadan önce mimariyi KONUŞ. Önce yalnız giriş ilanını çıkar ve",
    "   Discuss the architecture before you build a tree. Produce only the entry declaration first",
  ));
  b.push(y(
    "   onaylat; plan dosyasını ancak ilan onaylandıktan sonra aç. Her kademede somut",
    "   and have it approved; open the plan file only after that approval. At every tier offer",
  ));
  b.push(y(
    "   seçenekler sun, her seçeneği tek cümleyle tanımla ve seçimi kullanıcıya bırak —",
    "   concrete options, define each in one sentence, and leave the choice to the user — never",
  ));
  b.push(y(
    `   kendi başına tahmin etme. Belirsizlik gördüğünde varsayım değil SORU üret; bu`,
    `   guess on your own. When you meet ambiguity, produce a QUESTION, not an assumption; the`,
  ));
  b.push(y(
    `   disiplinin ayrıntılı yüzü \`${A.ogret} { konu: "niyet-diyalogu" }\` kartındadır.`,
    `   detailed face of this discipline lives in the \`${A.ogret} { konu: "niyet-diyalogu" }\` card.`,
  ));
  b.push(y(
    "   🚫 ÖLÇÜLMÜŞ ANTİ-DESENLER — beşi de gerçek koşumlarda kaydedildi:",
    "   🚫 MEASURED ANTI-PATTERNS — all five were recorded in real runs:",
  ));
  b.push(y(
    "     • boş dizinde ağacı ELLE yazmak ve doğuş araçlarını hiç çağırmamak;",
    "     • hand-writing the tree in an empty directory and never calling the birth tools;",
  ));
  b.push(y(
    `     • şema aracını rehber yerine kullanmak — \`${A.siniflama}\` neyin İZİNLİ olduğunu`,
    `     • using the schema tool as a guide — \`${A.siniflama}\` says what is PERMITTED, while the`,
  ));
  b.push(y(
    `       söyler, düzen ise neyin DOĞRU olduğunu; düzen ÖNCE okunur;`,
    `       layout says what is CORRECT; the layout is read FIRST;`,
  ));
  b.push(y(
    "     • bir kademeyi atlayıp doğrudan alt kademeyi açmak;",
    "     • skipping a tier and opening the one below it directly;",
  ));
  b.push(y(
    "     • zaman eksenini (Faz) giriş ilanına yazmak;",
    "     • writing the time axis (Faz) into the entry declaration;",
  ));
  b.push(y(
    "     • üretilen dosyayı denetlemeden teslim etmek.",
    "     • delivering a produced file without checking it.",
  ));
  b.push("");
  // ④ DOSYA MÜHÜRLERİ (KPS-MHR-A01 · MIM-3.4 · OGR-3): doğuş anı, ajanın bir
  //    dosyayı "eski" diye yeniden adlandırmaya ya da silmeye en yatkın olduğu
  //    andır; canlı kaynaktan ayırmanın tek meşru yolu burada öğretilir.
  b.push(...dosyaMuhruOgretisi(dil));
  return b.join("\n");
}

/** Mühür türünün davranış cümlesi — iki dilde tek yerde yazılır. */
const MUHUR_DAVRANISI: Readonly<Record<MuhurTuru, { tr: string; en: string }>> = {
  "arşiv": {
    tr: "işi bitmiş, dondurulmuş tarih; motor okumaz, dosya graf, kod dizini, karne ve açık iş gündemi dışında kalır",
    en: "finished, frozen history; the engine does not read it and the file stays outside the graph, the code index, the scorecard and the open-work agenda",
  },
  "eğitim": {
    tr: "öğretim malzemesi; okunur ve sözleşmelerine göre doğrulanır, fakat karneye ve yürütme gündemine sayılmaz",
    en: "teaching material; it is read and validated against its contracts, but not counted in the scorecard or the execution agenda",
  },
  "sonra": {
    tr: "sonraya bırakılmış iş; içerik okunmaz, dosya bekleme süresiyle birlikte Hatırlatıcılar yüzeyinde görünür kalır",
    en: "deferred work; its content is not read, and the file stays visible on the Reminders surface together with its waiting time",
  },
};

/**
 * 📛 DOSYA MÜHRÜ ÖĞRETİSİ (KPS-MHR-A01 · OGR-3). Karşılama kartı, doğuş rehberi
 * ve doğan projenin ajan bağlamı bu tek üreticiden okur (YUZ-1.2). Etiketler
 * mühür kümesinden, tanı kimlikleri ve düzeyleri tanı sicilinden gelir; bağlayıcı
 * metin kanonda kalır ve kart onu yinelemez, adresini verir (`kurallar mim`).
 */
export function dosyaMuhruOgretisi(dil: CiktiDili = etkinCiktiDili()): string[] {
  const y = (tr: string, en: string): string => dilHanesi({ tr, en }, dil);
  const b: string[] = [];
  b.push(y(
    "📛 DOSYA MÜHÜRLERİ — bir `.sar` dosyasını canlı kaynaktan ayırmanın tek meşru yolu (kanon: MIM-3.4 · `kurallar mim`).",
    "📛 FILE SEALS — the only legitimate way to take a `.sar` file out of the live source (canon: MIM-3.4 · `kurallar mim`).",
  ));
  b.push(y(
    "   Mühür dosya ADININ başına yazılır: `@ETİKET@_ad.sar`. Etiket büyük ASCII harfleriyle yazılır ve mührü izleyen ad küçük harfle sürer. Dosyayı silme, taşıma ya da adına \"eski\" ekleme; mühürle.",
    "   The seal is written at the START of the file NAME: `@ETİKET@_ad.sar`. The tag uses upper-case ASCII letters and the name after the seal continues in lower case. Do not delete, move or rename the file to \"old\"; seal it.",
  ));
  for (const [etiket, tur] of DOSYA_MUHRU_KUMESI) {
    // İm `▸` seçildi: `•` imi bu anlatıda ölçülmüş anti-desenlere ayrılmıştır ve nöbet onları sayar.
    b.push(`     ▸ \`@${etiket}@_\` — ${dil === "tr" ? MUHUR_DAVRANISI[tur].tr : MUHUR_DAVRANISI[tur].en}`);
  }
  const tanilar = YENI_TANI_KANONU.filter((t) => t.madde === "MIM-3.4").map((t) => `\`${t.kod}\` (${t.kademe})`).join(" · ");
  b.push(y(
    `   Küme kapalıdır. Mühür sessiz değildir: her denetim mühürlü dosyayı türüyle ve adıyla listeler ve biçime uymayan adı uyarır — ${tanilar}.`,
    `   The set is closed. A seal is never silent: every check lists the sealed file with its type and name and warns about a name that breaks the form — ${tanilar}.`,
  ));
  b.push(y(
    "   Mühür bir bulguyu susturmak için kullanılamaz ve ebedî kural taşıyan dosya arşiv mührü alamaz (`ebedi-ihlal`).",
    "   A seal cannot be used to silence a finding, and a file carrying an eternal rule cannot take the archive seal (`ebedi-ihlal`).",
  ));
  return b;
}

/** Karşılama kartını kanondan derler (saf). Tek iskelet, iki düzyazı hanesi. */
export function ogretKarti(snf: Siniflama, dil: CiktiDili = etkinCiktiDili()): string {
  const y = (tr: string, en: string): string => dilHanesi({ tr, en }, dil);
  const tipAdi = (ad: string): string => sozlukAdi("widget", ad, dil);
  const kenarAdi = (ad: string): string => sozlukAdi("kenar", ad, dil);
  const alanAdi = (ad: string): string => sozlukAdi("parametre", ad, dil);
  const kodluAd = (cevrilmis: string, kanonik: string): string =>
    dil === "tr" || cevrilmis === kanonik ? cevrilmis : `${cevrilmis} (canonical: ${kanonik})`;
  const ne = new Map(snf.widgetTipleri.map((t) => [t.ad, t.ne]));
  const tipNe = (ad: string, yedek: string): string =>
    sozlukDuzYazisi("widgetNe", ad, ne.get(ad) ?? yedek, dil);
  const b: string[] = [];

  b.push(y(
    "🚪 SARMAL KARŞILAMA KARTI — bu kart kanondan üretilir, bu yüzden bayatlamaz",
    "🚪 SARMAL WELCOME CARD — this card is generated from canon, so it cannot go stale",
  ));
  b.push("");
  b.push(y(
    "Sarmal, klasör/dosya hiyerarşisini ve kurallarını bildirimsel `.sar` dosyalarıyla",
    "Sarmal declares folder/file hierarchy and rules in declarative `.sar` files; it does",
  ));
  b.push(y(
    "tanımlar; kod üretmez, NİYET üretir — motor plan↔disk driftini denetler.",
    "not produce code, it produces INTENT — the engine checks plan↔disk drift.",
  ));
  b.push("");
  // 🌱 DOĞUŞ ANLATISI (BKM-DNT-A16): kartın en ağır bölümü buradadır, çünkü boş bir
  //    dizinde ajanın GÖRDÜĞÜ İLK ŞEY bu karttır ve hiçbir beceri kartı o anda
  //    ateşleyemez. Metin `basla` rehberiyle AYNI üreticiden gelir (YUZ-1.2).
  b.push(dogusAnlatisi(dil));
  b.push("");
  b.push(y(
    "① KOPYALA-BAŞLA — iki dosya: anadizin MİMARİYİ çizer, plan AYRI dosyada büyür;",
    "① COPY AND START — two files: the root file draws the ARCHITECTURE; the plan grows in a SEPARATE file;",
  ));
  b.push(y(
    "   kaydedilip `sarmal denetle .` koşulunca ⛔0 geçer:",
    "   after saving them, run `sarmal denetle .`; the result is ⛔0:",
  ));
  b.push("");
  b.push("─── ilk_proje_anadizin.sar ───");
  b.push(MINIMAL_ANADIZIN);
  b.push("");
  b.push("─── is/plan/ilk_plan.sar ───");
  b.push(MINIMAL_PLAN);
  b.push("");
  b.push(y(
    "② PLAN EKSENLERİ VE DEPARTMAN (katı rejimde Faz → Blok → Katman → AltKatman → Adım):",
    "② PLAN AXES AND DISCIPLINE (strict mode uses Phase → Block → Layer → Sublayer → Step):",
  ));
  b.push(`   🌀 ${kodluAd(tipAdi("Faz"), "Faz")} — ${tipNe("Faz", "ZAMAN")}`);
  b.push(`   🪵 ${kodluAd(tipAdi("Blok"), "Blok")} — ${tipNe("Blok", "İŞ")}`);
  b.push(`   🌿 ${kodluAd(tipAdi("Katman"), "Katman")} — ${tipNe("Katman", "TEKNOLOJİ")}`);
  b.push(`   🍃 ${kodluAd(tipAdi("Adım"), "Adım")} — ${tipNe("Adım", "AKIŞ")}`);
  // DEPARTMAN EKSENİ — kapalı küme + kaçış kapısı (TIP-2.5 katkılı örtü).
  // Ölçülmüş boşluk (2026-07-28): bu mekanizma iki öğretim yüzeyinde de SIFIR kez
  // geçiyordu ve depoda tek bir ortu.json yoktu. Sonucu sessiz yalan beyandı: işi
  // beşliye girmeyen bir kullanıcı `departman: kodlama` yazıyor, motor bunu
  // yakalayamıyor ve kapı ⛔0/⚠0 dönüyor. Kapı yeşil, veri yalan.
  const departmanlar = snf.semalar?.["AltKatman"]?.enum?.["departman"] ?? [];
  if (departmanlar.length) {
    const altSimge = snf.tipSimgeleri?.["AltKatman"] ?? "🌾";
    const degerler = departmanlar.map((deger) => sozlukDegeri("departman", deger, dil));
    b.push(y(
      `   ${altSimge} AltKatman — DEPARTMAN ekseni: her AltKatman çekirdek kümeden tam olarak`,
      `   ${altSimge} ${kodluAd(tipAdi("AltKatman"), "AltKatman")} — DISCIPLINE axis: every Sublayer carries exactly one`,
    ));
    b.push(y(
      `   birini \`departman:\` alanıyla taşır (${degerler.join(" · ")}).`,
      `   member of the core set through the canonical \`departman:\` field (${degerler.join(" · ")}).`,
    ));
    b.push(y(
      "   İşin bu kümeye GİRMİYORSA yanlış etiket yazma: motor yanlış etiketi yakalayamaz,",
      "   If the work DOES NOT FIT this set, do not write a false label: the engine cannot detect that lie,",
    ));
    b.push(y(
      "   kapı yeşil kalır ve planın sessizce yalan söyler. Doğru yol KATKILI ÖRTÜDÜR",
      "   the gate stays green, and the plan silently becomes false. The correct path is an ADDITIVE OVERLAY",
    ));
    b.push(y(
      "   (TIP-2.5): ÇalışmaAlanı kökünde `oz/siniflama/ortu.json` dosyasına kendi",
      "   (TIP-2.5): add your own value to `oz/siniflama/ortu.json` at the Workspace root.",
    ));
    b.push(y(
      "   değerini EKLERSİN; taban küme silinmez ya da yeniden adlandırılmaz, örtü",
      "   The base set is never deleted or renamed; the overlay only performs a union.",
    ));
    b.push(y(
      "   yalnız birleşim yapar. Örtü yukarı doğru aranır — kökte bir kez yazarsan",
      "   Overlay lookup walks upward: write it once at the root and every project below",
    ));
    b.push(y(
      "   altındaki bütün projeler miras alır.",
      "   inherits it.",
    ));
  }
  b.push(y(
    "   🕰️ Zaman bağı: tarih GÜÇLÜ TAVSİYEDİR — hedefTarih verirsen",
    "   🕰️ Time binding: a date is STRONGLY RECOMMENDED — if you provide `hedefTarih`,",
  ));
  b.push(y(
    "   (\"YYYY-AA-GG\" ya da ay hassasiyetiyle \"YYYY-AA\") vade nöbeti rötarı/yaklaşanı",
    "   (`\"YYYY-AA-GG\"` or month precision `\"YYYY-AA\"`) the deadline guard tracks overdue",
  ));
  b.push(y(
    "   takip eder; vermezsen Faz yine açılır, motor yalnız hatırlatır (yol kesmez).",
    "   and approaching work; without it the Phase still opens and the engine only reminds you.",
  ));
  b.push(y(
    "   Blok mevsime `mevsim: FAZ-…` ya da Faz'ın `çağır` listesiyle de bağlanabilir",
    "   A Block may bind to its season with `mevsim: FAZ-…` or the Phase's `çağır` list",
  ));
  b.push(y(
    "   (bir bağ tek yerde yazılır); önceliklendirmeyi bekleyen iş: `planlanmamış: \"neden\"`.",
    "   (write one binding in one place); work awaiting prioritization uses `planlanmamış: \"neden\"`.",
  ));
  b.push("");
  b.push(y(
    "③ KONİ ALANLARI (Adım'ın zengin alanları — orkestratör buradan prompt üretir):",
    "③ CONTEXT-CONE FIELDS (the Step's rich fields — the orchestrator builds the prompt from them):",
  ));
  const koniAlanlari = KONI_ALANLARI.map((ad) => {
    const kenar = kenarAdi(ad);
    return kenar === ad ? alanAdi(ad) : kenar;
  });
  b.push(y(
    `   ${koniAlanlari.join(" · ")} (+ kapanışta \`üretir:\` meyve kenarı)`,
    `   ${koniAlanlari.join(" · ")} (+ the canonical \`üretir:\` fruit edge at closure)`,
  ));
  b.push(y(
    "   `geliştirmede` Adım koni-dolu olmalı ve `bağımlı:` alanı zorunludur; kademe atlamak yasaktır:",
    "   An in-progress Step must have a full cone and the canonical `bağımlı:` field is mandatory; skipping stages is forbidden:",
  ));
  b.push(y(
    "   beklemede → geliştirmede → tamamlandı.",
    "   pending (`beklemede`) → in progress (`geliştirmede`) → done (`tamamlandı`).",
  ));
  b.push("");

  // ④ Zorunlu kenarlar — KANONDAN (yeni kural eklenince kart kendiliğinden güncellenir).
  const zk = Object.entries(snf.zorunluKenarlar ?? {});
  if (zk.length) {
    b.push(y(
      "④ ZORUNLU KENARLAR (kanon zorunluKenarlar — motor bu tanılarla denetler):",
      "④ REQUIRED EDGES (canon `zorunluKenarlar` — the engine checks them through these diagnostics):",
    ));
    for (const [tip, kurallar] of zk) {
      const gorunenTip = kodluAd(tipAdi(tip), tip);
      for (const k of kurallar) {
        const grup = k.grup.map((ad) => {
          const kenar = kenarAdi(ad);
          return kenar === ad ? alanAdi(ad) : kenar;
        });
        b.push(`   ${gorunenTip} → ${grup.join("|")} (${y("tanı", "diagnostic")}: ${k.tanı})`);
      }
    }
    b.push("");
  }

  b.push(y(
    "⚖️ DAYANAK KENARI: bir Kural hangi karardan doğduğunu `dayanak: [ YAS-2 ]`",
    "⚖️ RATIONALE EDGE: a Rule states which decision gave rise to it with `dayanak: [ YAS-2 ]`;",
  ));
  b.push(y(
    "   ile söyler — hedef KARAR düğümüdür (başka tip uyarılır), revize/tarihçe karara",
    "   the target is a DECISION node (other types are flagged). Do not bind to a revised or",
  ));
  b.push(y(
    "   yaslanılmaz (yürürlük halefte); graf/gezin bu kenarı iki yönde izler.",
    "   archived decision (the successor is in force); `graf`/`gezin` trace this edge both ways.",
  ));
  b.push("");
  b.push(y(
    "⑤ DÖNGÜ: yaz → `sarmal denetle .` → tanıların önerisini uygula → yeniden denetle.",
    "⑤ LOOP: write → `sarmal denetle .` → apply the diagnostics' suggestions → check again.",
  ));
  b.push(y(
    "   Hedef ⛔0. Derinlik: `sarmal kurallar` · `sarmal siniflama` · MCP `sarmal` araçları.",
    "   Target ⛔0. Go deeper with `sarmal kurallar` · `sarmal siniflama` · MCP `sarmal` tools.",
  ));
  b.push("");
  // 🚦 Koni kapısı (davranış-katmanı turu): karşılama kartı bugüne kadar `sef` aracını hiç
  // tanıtmıyordu; mekanizma çalışıyor fakat ajana varlığı söylenmiyordu. Tanıtım
  // liste maddesi değildir — aracın NE ZAMAN çağrılacağını söyler.
  b.push(y(
    "🚦 BİR ADIMI İŞLEMEYE BAŞLAMADAN ÖNCE `sef` ARACINI ÇAĞIR. Adımın konisini, kritik",
    "🚦 BEFORE YOU START WORKING ON A STEP, CALL THE `sef` TOOL. It gives you the Step's cone,",
  ));
  b.push(y(
    "   kısıtlarını ve o Adımda ateşleyen beceri kartlarını hazır bir prompt olarak sana",
    "   critical constraints, and the skill cards triggered for that Step as a ready prompt;",
  ));
  b.push(y(
    "   bu araç verir; bağlamı elle toplamaya çalışma. Beceri kartları `ogreti/ogrenme/` rafında",
    "   do not gather context by hand. Skill cards live on the `ogreti/ogrenme/` shelf and `sef`",
  ));
  b.push(y(
    "   yaşar ve `sef` bunları kendiliğinden enjekte eder; bir kart bütçe payına sığmayıp",
    "   injects them automatically. If a card does not fit its budget share and is trimmed",
  ));
  b.push(y(
    "   ✂️ damgasıyla kırpıldıysa tam metnini `sarmal gezin <KART-KODU>` ile açarsın.",
    "   with a ✂️ mark, open its full text with `sarmal gezin <KART-KODU>`.",
  ));
  b.push(y(
    "   Kontrolcü asistanın anayasası, kuralları ve Etmen tanımı `oz/kayit/asistan_kontrolcu.sar`",
    "   The controller assistant's constitution, rules, and Agent declaration are in",
  ));
  b.push(y(
    "   dosyasındadır; bu depoda çalışıyorsan işe oradan başlarsın.",
    "   `oz/kayit/asistan_kontrolcu.sar`; if you work in this repository, start there.",
  ));
  b.push("");
  // 🤖 Asistan Protokolü (ADM-STD-OGRET-PROTOKOL · STR-3.2 ④): her yürütücü
  // oturumu aynı beş yönergeyle açar. Beş maddeyi aşma; kart kanondan üretilir.
  b.push(y(
    "🤖 ASİSTAN PROTOKOLÜ (yürütücüden bağımsız açılış):",
    "🤖 ASSISTANT PROTOCOL (implementation-independent opening):",
  ));
  b.push(y(
    "   ① İKİ VARLIK: önce hangi varlıkta çalıştığını söyle; denetimi O varlığa",
    "   ① TWO ENTITIES: first state which entity you are working in; run the check against THAT",
  ));
  b.push(y(
    "     koş ve raporda varlığı adıyla an — tek varlığın sonucunu toplam gibi sunma.",
    "     entity and name it in the report — never present one entity's result as the total.",
  ));
  b.push(y(
    "   ② MCP-ÖNCE: şema/tip/desen öğrenimi siniflama · kavram · gezin araçlarından;",
    "   ② MCP FIRST: learn schemas, types, and patterns through `siniflama` · `kavram` · `gezin`;",
  ));
  b.push(y(
    "     örnek dosyayı ham okuma (bayat olabilir — kanon canlı kaynaktır).",
    "     do not learn from a raw example file (it may be stale — canon is the live source).",
  ));
  b.push(y(
    "   ③ KARAR→PLAN: kilitli karar plana iner — uygulama isteyen kararı",
    "   ③ DECISION→PLAN: a locked decision flows into the plan — do not leave a decision that",
  ));
  b.push(y(
    "     plansız bırakma; bekliyor kararı UYGULAMA (önce Founder kilidi).",
    "     requires implementation unplanned; DO NOT implement a waiting decision (Founder locks it first).",
  ));
  b.push(y(
    "   ④ DURUM AKIŞI: beklemede → geliştirmede → tamamlandı; kademe atlamak yasaktır,",
    "   ④ STATUS FLOW: pending (`beklemede`) → in progress (`geliştirmede`) → done (`tamamlandı`);",
  ));
  b.push(y(
    "     kapanış koşu kanıtı + üretir meyvesi ister.",
    "     stage skipping is forbidden, and closure requires run evidence plus a `üretir` fruit.",
  ));
  b.push(y(
    "   ⑤ TEK FORMAT: içerik yalnız .sar'da yaşar, .md yalnız işaretçidir —",
    "   ⑤ ONE FORMAT: content lives only in `.sar`; `.md` is only a pointer —",
  ));
  b.push(y(
    "     içerik biriktirme, kaynağı güncelle.",
    "     do not accumulate content there; update the source.",
  ));
  return b.join("\n");
}

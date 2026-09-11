// ═══════════════════════════════════════════════════════════════════════════
// graf.ts — 🕸️ KANONİK GRAF YÜZÜ (VIT-GRAF-A01 · KOD-GRAF-YUZ)
//
//   "Graph dosyalardan çizilmez — derleyicinin çıktısıdır." Dış mühendis
//   gözlemi ORK-3 mimarimizi bağımsız doğruladı: dagKur zaten AST'den kanonik
//   Dag kurar; bu yüz onu DIŞA AÇIK determinist JSON'a seriler — IDE · AI
//   (MCP) · araçlar AYNI grafı okur, dosya taramaz. İki kenar ailesi:
//   içerme (kapsayan — Blok▸Faz▸Katman▸Adım) + bağımlılık (öncekiler/
//   sonrakiler). etki.ts yüz-deseni: SAF üretici + CLI kabuğu sarmal.ts'te.
//   STR-3.1: graph-DB YOK — Map+JSON bu ölçeği karşılar (~700 düğüm).
// ═══════════════════════════════════════════════════════════════════════════

import type { Dag, KarneOzeti } from "./dag.ts";
import { karneOzeti } from "./dag.ts";
import { etkiCoz } from "./etki.ts";

/** Tek düğümün dışa açık hâli — alan sırası SABİT (determinist çıktı). */
export interface GrafDugum {
  kod: string;
  /** KPS-KOD-A01 · ORK-4: kod kardeş projelerde ortaksa `kod` alanı `PRJ::KOD`
   *  anahtarıdır ve ilan edilen çıplak kod burada durur; ortak değilse alan hiç
   *  yazılmaz (tek projeli deponun çıktısı bayt bayt aynı kalır). */
  yerelKod?: string;
  tip: string;            // Adım · Katman · Faz · Blok …
  dosya: string;
  satır: number;
  durum?: string;
  kapsayan?: string;      // içerme kenarı (en yakın KOD'lu ata — türetilir, ORK-1.2)
  mevsim?: string;        // VIT-GRAF-A12: Blok'un bağlı olduğu Faz (zaman-ekseni aidiyeti — Faz'ın gerçek/sanal `çağır` çocuğundan türetilir, MIM-1.2)
  öncekiler: string[];    // bağımlılık kenarı (yazılı beyan + mekanik genişleme)
  sonrakiler: string[];   // ters-türetilmiş ardıllar (ORK-1.2 — .sar'a yazılmaz)
  hatırlatanlar?: string[];   // hatırlatıcı-rayı turu: bu düğüme `hatırlat` eden Hatırlatıcılar (yumuşak-kenar gelen · ileri-bağlama)
  hatırlatıyor?: string[];    // hatırlatıcı-rayı turu: bu düğümün `hatırlat` hedefleri (yumuşak-kenar giden)
  dayanıyor?: string[];       // RF-T6-A02 + Sol ①: Kural'ın dayandığı Kararlar (yumuşak-kenar giden)
  dayananlar?: string[];      // RF-T6-A02 + Sol ①: bu Karar'a dayanan Kurallar (yumuşak-kenar gelen — türetilir)
}

export interface GrafYuzu {
  kök?: string;           // alt-graf istendiyse odak düğüm
  düğümler: GrafDugum[];
  /** çözülmeyen kenar uçları — kopuk varken graf "tam" gibi DAVRANMAZ (dürüst çıktı). */
  kopuk: Dag["kopuk"];
  /** MIM-1.1 (KPS-CAT-A01): çatının rafı altında yaşayıp çatıya bağlanamayan
   *  Proje kökleri. Boş olduğunda alan hiç yazılmaz — tek projeli bir deponun
   *  graf çıktısı bu alandan tek bayt bile etkilenmez. */
  çatısız?: Dag["catisiz"];
  /** ORK-4 (KPS-KOD-A01): kardeş projelerde ortak kodlar — BEKLENEN durum, tanı
   *  değil; hangi kodun hangi Projelerde `PRJ::KOD` anahtarına alındığını söyler.
   *  Boşsa alan hiç yazılmaz. */
  ortakKod?: Dag["ortakKod"];
  /** ORK-4 (KPS-KOD-A01): aynı Proje kodunu taşıyan birden çok kök — ad alanı
   *  çoğalmıştır ve çevrim ayıramaz; susma burada adıyla görünür. Boşsa yazılmaz. */
  ayrışamayan?: Dag["ayrisamayan"];
  özet: KarneOzeti;
}

/** Alt-graf düğüm kümesi: kök + kapsadıkları + kapsayan zinciri (atalar) + ileri kapanış. */
function altKume(dag: Dag, kök: string): Set<string> {
  const küme = new Set<string>([kök]);
  for (const [kod, d] of dag.dugumler) {                    // kökün kapsadıkları
    let a = d.kapsayan;
    while (a) { if (a === kök) { küme.add(kod); break; } a = dag.dugumler.get(a)?.kapsayan; }
  }
  let ata = dag.dugumler.get(kök)?.kapsayan;                // kökün ataları (bağlam)
  while (ata) { küme.add(ata); ata = dag.dugumler.get(ata)?.kapsayan; }
  for (const kod of [...küme]) {                            // ileri kapanış (etkilenenler)
    const e = etkiCoz(dag, kod);
    if (e) for (const k of [...e.dogrudan, ...e.gecisli]) küme.add(k);
  }
  for (const kod of [...küme]) {                            // hatırlatıcı-rayı turu: hatırlat komşuları (yumuşak-kenar — HTR alt-grafta görünsün)
    const d = dag.dugumler.get(kod);
    if (d?.hatırlatanlar) for (const h of d.hatırlatanlar) küme.add(h);
    if (d?.hatırlatıyor) for (const t of d.hatırlatıyor) if (dag.dugumler.has(t)) küme.add(t);
    if (d?.dayananlar) for (const h of d.dayananlar) küme.add(h);                       // RF-T6-A02 + Sol ①
    if (d?.dayanıyor) for (const t of d.dayanıyor) if (dag.dugumler.has(t)) küme.add(t);
  }
  return küme;
}

/**
 * Dag → dışa açık graf (saf): düğümler `kod`'a göre sıralı, kenar listeleri
 * sıralı, kopuklar kaynak+hedefe göre sıralı → aynı girdi = AYNI çıktı (kanonik).
 * `kök` verilirse alt-graf (altKume); bilinmeyen kök → undefined (dürüst hata).
 */
export function grafCikar(dag: Dag, kök?: string): GrafYuzu | undefined {
  if (kök && !dag.dugumler.has(kök)) return undefined;
  const küme = kök ? altKume(dag, kök) : undefined;
  const içinde = (k: string): boolean => !küme || küme.has(k);

  const düğümler: GrafDugum[] = [...dag.dugumler.values()]
    .filter((d) => içinde(d.kod))
    .sort((a, b) => a.kod.localeCompare(b.kod, "tr"))
    .map((d) => ({
      kod: d.kod,
      ...(d.yerelKod ? { yerelKod: d.yerelKod } : {}),
      tip: d.tip, dosya: d.dosya, satır: d.satir,
      ...(d.durum ? { durum: d.durum } : {}),
      ...(d.kapsayan ? { kapsayan: d.kapsayan } : {}),
      ...(d.mevsim ? { mevsim: d.mevsim } : {}),
      öncekiler: [...d.oncekiler].sort((a, b) => a.localeCompare(b, "tr")),
      sonrakiler: [...d.sonrakiler].sort((a, b) => a.localeCompare(b, "tr")),
      ...(d.hatırlatanlar?.length ? { hatırlatanlar: [...d.hatırlatanlar].sort((a, b) => a.localeCompare(b, "tr")) } : {}),
      ...(d.hatırlatıyor?.length ? { hatırlatıyor: [...d.hatırlatıyor].sort((a, b) => a.localeCompare(b, "tr")) } : {}),
      ...(d.dayanıyor?.length ? { dayanıyor: [...d.dayanıyor].sort((a, b) => a.localeCompare(b, "tr")) } : {}),
      ...(d.dayananlar?.length ? { dayananlar: [...d.dayananlar].sort((a, b) => a.localeCompare(b, "tr")) } : {}),
    }));

  const kopuk = dag.kopuk
    .filter((k) => içinde(k.kaynak))
    .sort((a, b) => `${a.kaynak}→${a.hedef}`.localeCompare(`${b.kaynak}→${b.hedef}`, "tr"));

  // özet alt-graf üzerinden (filtreli mini-Dag — karne mantığı TEK kaynak kalır)
  const çatısız = dag.catisiz.filter((c) => içinde(c.proje));
  // KPS-KOD-A01: ortak kod ölçümü alt-grafta yalnız kümedeki anahtarlara iner.
  const ortakKod = dag.ortakKod
    .map((o) => ({ kod: o.kod, projeler: o.projeler.filter((p) => içinde(`${p}::${o.kod}`)) }))
    .filter((o) => o.projeler.length);
  const özetDag: Dag = küme
    ? { dugumler: new Map([...dag.dugumler].filter(([k]) => küme.has(k))), kopuk, oz: dag.oz, disProje: dag.disProje, catisiz: çatısız, ortakKod, ayrisamayan: dag.ayrisamayan }
    : dag;

  return {
    ...(kök ? { kök } : {}), düğümler, kopuk,
    ...(çatısız.length ? { çatısız } : {}),
    ...(ortakKod.length ? { ortakKod } : {}),
    ...(dag.ayrisamayan.length ? { ayrışamayan: dag.ayrisamayan } : {}),
    özet: karneOzeti(özetDag),
  };
}

/**
 * ÖZET YÜZÜ (BKM-MCP-A03). Tam graf bu depoda 436.698 karakter ve 19.194 satır
 * ölçülmüştür (2026-09-10); ilk dış kullanıcı 2026-09-05 tarihinde 55.916
 * karakterlik bir çıktının istemci sınırını aşıp dosyaya düştüğünü ve yalnız
 * kuyruğunu okuyabildiğini bildirmiştir. Sınırı aşan bir cevap, cevap değildir.
 *
 * Bu yüz SERİLEŞTİRİCİYİ DEĞİŞTİRMEZ — `grafYuz` olduğu gibi durur ve ayrıntı
 * isteyen onu çağırmaya devam eder. Özet, aynı `grafCikar` çekirdeğinden türer;
 * ikinci bir graf mantığı doğmaz (YUZ-1.2). İçerik üç bölümdür: karne, kök
 * kademesi (kapsayanı olmayan düğümler) ve tip dökümü. Ayrıntı kök koduyla
 * istenir ve çıktının son satırı bunu açıkça söyler, çünkü kırpılmış bir cevabın
 * nasıl açılacağını söylememek kullanıcıyı tahmine bırakır.
 */
export function grafOzetYuzu(g: GrafYuzu, ayrintiIpucu = 'graf { dizin, kok: "<KOD>" }'): string {
  const KOK_SINIRI = 40;
  const kokler = g.düğümler.filter((d) => d.kapsayan === undefined);
  const tipSayisi = new Map<string, number>();
  for (const d of g.düğümler) tipSayisi.set(d.tip, (tipSayisi.get(d.tip) ?? 0) + 1);
  const tipDokumu = [...tipSayisi.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "tr"))
    .map(([tip, n]) => `${tip} ${n}`)
    .join(" · ");
  const gosterilen = kokler.slice(0, KOK_SINIRI);
  const satirlar = [
    "🕸️ GRAF — ÖZET KİPİ (varsayılan). Tam düğüm listesi ayrıntı kipindedir.",
    "",
    `📋 Karne: ${JSON.stringify(g.özet)}`,
    `🔢 Düğüm ${g.düğümler.length} · kök kademesi ${kokler.length} · kopuk uç ${g.kopuk.length}`,
    `🗂️ Tip dökümü: ${tipDokumu || "(düğüm yok)"}`,
    "",
    `🌱 KÖK KADEMESİ${kokler.length > KOK_SINIRI ? ` (ilk ${KOK_SINIRI})` : ""}:`,
    ...gosterilen.map((d) => `   ${d.kod} [${d.tip}]${d.durum ? ` · ${d.durum}` : ""} — ${d.dosya}:${d.satır}`),
    ...(kokler.length > KOK_SINIRI ? [`   … ${kokler.length - KOK_SINIRI} kök daha var (ayrıntı için kök kodu ver).`] : []),
  ];
  if (g.kopuk.length) {
    const ilk = g.kopuk.slice(0, 10);
    satirlar.push("", `🔌 KOPUK UÇLAR${g.kopuk.length > 10 ? " (ilk 10)" : ""}:`);
    for (const k of ilk) satirlar.push(`   ${k.kaynak} → ${k.hedef}`);
    if (g.kopuk.length > 10) satirlar.push(`   … ${g.kopuk.length - 10} kopuk uç daha.`);
  }
  // MIM-1.1 (KPS-CAT-A01): bağın kurulamadığı hâl susmaz — çatının altında
  // yaşayıp çatıya bağlanamayan Proje kökü burada adıyla görünür.
  if (g.çatısız?.length) {
    satirlar.push("", `🏛️ ÇATIYA BAĞLANAMAYAN PROJE KÖKÜ (${g.çatısız.length}):`);
    for (const c of g.çatısız) satirlar.push(`   ${c.proje} — ${c.dosya}:${c.satir} · ${c.sebep}`);
  }
  // ORK-4 (KPS-KOD-A01): ortak kod BEKLENEN durumdur ve tanı değildir; yüz onu
  // ölçüm olarak basar ki "yüz müşterinin Kitaplığı nereye gitti" sorusunun
  // cevabı okunsun. Ayrışamayan kök ise çevrimin sustuğu yerdir ve susmaz.
  if (g.ortakKod?.length) {
    satirlar.push("", `🔀 KARDEŞ PROJELERDE ORTAK KOD (${g.ortakKod.length} · beklenen durum, tanı değil — her biri kendi Projesi altında \`PRJ::KOD\` anahtarıyla ayrı düğümdür):`);
    for (const o of g.ortakKod) satirlar.push(`   ${o.kod} → ${o.projeler.join(" · ")}`);
  }
  if (g.ayrışamayan?.length) {
    satirlar.push("", `⚠️ AD ALANI OLMADAN AYRIŞAMAYAN PROJE KÖKÜ (${g.ayrışamayan.length} · aynı Proje kodu birden çok kökte ilanlı; \`PRJ::KOD\` iki kökü birden gösterdiği için çevrim bu kökleri AYIRAMADI ve ilk tanım kazandı):`);
    for (const a of g.ayrışamayan) satirlar.push(`   ${a.kod} — ${a.dosyalar.join(" · ")}`);
  }
  satirlar.push("", `🔍 AYRINTI: bir düğümün tam alt-grafını (kapsadıkları · ataları · ileri kapanışı) almak için ${ayrintiIpucu} çağır.`);
  return satirlar.join("\n") + "\n";
}

/** JSON yüzü (saf render): 2-boşluk girintili, determinist. */
export function grafYuz(dag: Dag, kök?: string): string | undefined {
  const g = grafCikar(dag, kök);
  return g ? JSON.stringify(g, null, 2) + "\n" : undefined;
}

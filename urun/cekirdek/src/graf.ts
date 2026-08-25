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
      kod: d.kod, tip: d.tip, dosya: d.dosya, satır: d.satir,
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
  const özetDag: Dag = küme
    ? { dugumler: new Map([...dag.dugumler].filter(([k]) => küme.has(k))), kopuk, oz: dag.oz }
    : dag;

  return { ...(kök ? { kök } : {}), düğümler, kopuk, özet: karneOzeti(özetDag) };
}

/** JSON yüzü (saf render): 2-boşluk girintili, determinist. */
export function grafYuz(dag: Dag, kök?: string): string | undefined {
  const g = grafCikar(dag, kök);
  return g ? JSON.stringify(g, null, 2) + "\n" : undefined;
}

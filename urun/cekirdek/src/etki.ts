// ═══════════════════════════════════════════════════════════════════════════
// etki.ts — 💥 ETKİ-ANALİZİ YÜZÜ (YUZ-3 · VIT-K77-A03 · KOD-ETKI-YUZ)
//
//   "Bu düğüme dokunursam NE etkilenir?" — DAG ters-türetmesinden (ORK-1.2:
//   ardıl HESAPLANIR) verilen KOD'un İLERİ kapanışı: onu bekleyen doğrudan +
//   geçişli tüm ardıllar, topolojik sırada, durum rozetleriyle. agac.ts yüz
//   deseni: SAF üretici (test edilebilir) + CLI kabuğu sarmal.ts'te.
//   STR-3.1 kesimi: deterministik I/O-şekli → 🔓 AÇIK ("riskli mi" skorlaması
//   GİZLİ politika — burada yok).
// ═══════════════════════════════════════════════════════════════════════════

import type { Dag, DagDugum } from "./dag.ts";
import { topolojikSira } from "./dag.ts";

export interface EtkiSonuc {
  kod: string;
  /** düğümü doğrudan bekleyenler (birinci halka). */
  dogrudan: string[];
  /** geçişli bekleyenler (ikinci+ halka; doğrudanlar hariç). */
  gecisli: string[];
  /** hatırlatıcı-rayı turu (BUG-2): bu düğüme `hatırlat` eden Hatırlatıcılar (yumuşak-kenar · ileri-bağlama).
   *  Topolojik ardıl DEĞİL — düğüm işlenince gözden geçirilecek bağlam; sıra/sayım'a girmez. */
  hatırlatBaglari: string[];
}

const DURUM_ROZET: Record<string, string> = {
  "tamamlandı": "🟢", "geliştirmede": "🟡", "beklemede": "🔵", "bloklu": "⛔",
};

/** İleri kapanış (saf): verilen KOD'u bekleyen tüm ardıllar, topolojik sırada.
 *  @param hazirSira PRF-A05 saha bulgusu (🐢 ~950 ms/Adım): çağıran topolojik sırayı
 *    zaten hesapladıysa buradan enjekte eder — tüm-graf sıralaması her çağrıda
 *    tekrarlanmaz (panel yenile() sırayı bir kez kurar, kenar grupları paylaşır).
 *    Verilmezse davranış aynen eski: sıra yerinde hesaplanır. */
export function etkiCoz(dag: Dag, kod: string, hazirSira?: readonly string[]): EtkiSonuc | undefined {
  const d = dag.dugumler.get(kod);
  if (!d) return undefined;
  const dogrudanKume = new Set(d.sonrakiler);
  const kapanis = new Set<string>();
  const yigin = [...d.sonrakiler];
  while (yigin.length) {
    const k = yigin.pop()!;
    if (kapanis.has(k)) continue;
    kapanis.add(k);
    yigin.push(...(dag.dugumler.get(k)?.sonrakiler ?? []));
  }
  const sira = hazirSira ?? topolojikSira(dag).sira;
  const rutbe = new Map(sira.map((k, i) => [k, i]));
  const sirali = [...kapanis].sort((a, b) => (rutbe.get(a) ?? 0) - (rutbe.get(b) ?? 0));
  return {
    kod,
    dogrudan: sirali.filter((k) => dogrudanKume.has(k)),
    gecisli: sirali.filter((k) => !dogrudanKume.has(k)),
    hatırlatBaglari: [...(d.hatırlatanlar ?? [])].sort((a, b) => a.localeCompare(b, "tr")),
  };
}

function satir(dag: Dag, kod: string, onek: string): string {
  const d = dag.dugumler.get(kod);
  const rozet = d?.durum ? (DURUM_ROZET[d.durum] ?? "·") : "·";
  return `${onek}${rozet} ${kod}${d ? `  (${d.tip} · ${d.dosya})` : ""}`;
}

/** İnsan yüzü (saf render): rozetli etki listesi ya da dürüst "bekleyen yok". */
export function etkiMetni(dag: Dag, kod: string): string {
  const e = etkiCoz(dag, kod);
  if (!e) return `✖ '${kod}' kodlu düğüm grafikte yok — önce ilan et (kod: ${kod}).`;
  const bas = `💥 Etki analizi — ${kod}: bu düğüme dokunursan…`;
  const bolum = (baslik: string, kodlar: string[]): string[] =>
    kodlar.length ? [baslik, ...kodlar.map((k) => satir(dag, k, "  "))] : [];
  // hatırlatıcı-rayı turu: hatırlat-bağı AYRI bölüm (topolojik ardıl DEĞİL — düğüm işlenince gözden geçirilecek bağlam).
  const htrBolum = e.hatırlatBaglari.length
    ? ["", `🔔 Hatırlat-bağı (${e.hatırlatBaglari.length} · bu düğüm işlenince gözden geçir · topolojik sıra dışı):`,
       ...e.hatırlatBaglari.map((k) => satir(dag, k, "  "))]
    : [];
  if (!e.dogrudan.length && !e.gecisli.length) {
    return `${bas}\n\n✅ Bu düğümü bekleyen yok — etki bu düğümle sınırlı (boş ≠ hata).${htrBolum.join("\n")}`;
  }
  return [
    bas,
    "",
    ...bolum(`⚡ Doğrudan bekleyenler (${e.dogrudan.length}):`, e.dogrudan),
    ...bolum(`🌊 Geçişli bekleyenler (${e.gecisli.length}):`, e.gecisli),
    ...htrBolum,
    "",
    `Toplam ${e.dogrudan.length + e.gecisli.length} düğüm bu değişiklikten etkilenir (topolojik sırada${e.hatırlatBaglari.length ? ` · +${e.hatırlatBaglari.length} hatırlat-bağı` : ""}).`,
  ].join("\n");
}

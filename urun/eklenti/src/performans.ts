// ═══════════════════════════════════════════════════════════════════════════

import { IZ_METINLERI } from "./yuzey-metinleri.ts";
// performans.ts — 🔬 PERFORMANS MERCEĞİ (PRF-A01 · VS Code'suz saf sayaç)
//
//   SRN-IDE-KASMA-SOL-KOSUSU tanısının ölçüm ayağı: hangi izleyici kaç olay
//   üretiyor, bir tam-proje denetimi kaç ms sürüyor — bugüne dek hiçbir yerde
//   görünmüyordu. Mercek sayar, denetim TURU bittiğinde tek satır özet düşer;
//   kanal yazıcısı dışarıdan verilir (eklenti.ts 'Sarmal Performans' çıktı
//   kanalını bağlar) — modül vscode'suzdur, davranış testi host istemez.
//
//   Maliyet disiplini (PRF-A01 sınırı): sayaç artırımı sabit-zamanlıdır;
//   metin üretimi ve kanal yazımı YALNIZ denetim turlarında olur.
// ═══════════════════════════════════════════════════════════════════════════

/** Bir tam-proje denetim turunun kimliği — özet satırının girdisi. */
export interface TurBilgi {
  /** Turu ne tetikledi (başlangıç · sar-olayı · disk-olayı · ayar …) */
  tetik: string;
  /** Turun toplam süresi (ms) */
  süreMs: number;
  /** Turda taranan .sar dosya sayısı */
  dosyaSayısı: number;
  /**
   * ⚡ PRF-A06: turun çapraz-dosya denetiminin DARALTILDIĞI varlık kökü; tam
   * turda verilmez. Değer tetik alanına iliştirilir, çünkü kanal satırının
   * biçimi yüzey metinlerinde tek kaynaktan yaşar ve bu Adım o kaynağa
   * dokunmaz. Founder kanalda dar turu tam turdan ayırt edebilmelidir: aksi
   * hâlde düşen süre, işin hızlanmasından mı yoksa kapsamın daralmasından mı
   * geldiği okunamaz bir sayı olurdu.
   */
  kapsam?: string;
}

/** Tetik etiketini kapsam işaretiyle birleştirir — dar tur kanalda görünür
 *  olur ve süre karşılaştırması kapsamıyla birlikte okunur. */
export function tetikEtiketi(bilgi: TurBilgi): string {
  return bilgi.kapsam ? `${bilgi.tetik} · dar kapsam=${bilgi.kapsam}` : bilgi.tetik;
}

export class PerformansMercegi {
  /** İzleyici başına olay sayısı (son turdan beri) */
  private olaylar = new Map<string, number>();
  /** Süzgeçte elenen olay sayısı (PRF-A02 gürültü süzgeci doldurur) */
  private süzülen = 0;
  /** Koşan denetim varken atlanan istek sayısı (PRF-A02 kilidi doldurur) */
  private atlanan = 0;
  /** Geciktiriciye takılıp tek tura inen istek sayısı */
  private ertelenen = 0;

  /** Özet satırını yazan kanal (eklenti.ts çıktı kanalını bağlar). */
  private readonly yaz: (satır: string) => void;

  constructor(yaz: (satır: string) => void) { this.yaz = yaz; }

  /** İzleyiciden olay geldi — sabit-zamanlı sayım. */
  olayGeldi(kaynak: string): void {
    this.olaylar.set(kaynak, (this.olaylar.get(kaynak) ?? 0) + 1);
  }

  /** Gürültü süzgeci bir olayı eledi (denetim tetiklenmedi). */
  süzüldü(): void { this.süzülen += 1; }

  /** Koşan denetim varken gelen istek atlandı (tur sonunda telafi edilir). */
  atlandı(): void { this.atlanan += 1; }

  /** İstek geciktiriciye takıldı — sel tek tura iner. */
  ertelendi(): void { this.ertelenen += 1; }

  /**
   * Denetim turu bitti: birikimin özetini tek satırda yaz ve sayaçları sıfırla.
   * Satır geri de döner — davranış testi kanala bakmadan doğrular.
   */
  turBitti(bilgi: TurBilgi, zaman: Date = new Date()): string {
    const saat = zaman.toTimeString().slice(0, 8);
    const olayDökümü = [...this.olaylar.entries()]
      .map(([kaynak, sayı]) => `${kaynak} ${sayı}`)
      .join(" · ") || IZ_METINLERI.olayYok;
    const satır = IZ_METINLERI.performansTuru({
      saat, sure: bilgi.süreMs, dosya: bilgi.dosyaSayısı, tetik: tetikEtiketi(bilgi),
      olaylar: olayDökümü, suzulen: this.süzülen, atlanan: this.atlanan,
      ertelenen: this.ertelenen,
    });
    this.olaylar.clear();
    this.süzülen = 0;
    this.atlanan = 0;
    this.ertelenen = 0;
    this.yaz(satır);
    return satır;
  }
}

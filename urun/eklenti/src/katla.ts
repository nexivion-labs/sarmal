// ═══════════════════════════════════════════════════════════════════════════
// katla.ts — Uzun niyet katlayıcısı (SAF — EKL-F4-A01)
//
//   Amaç:   110 sütunu aşan tek-satır dizgi parametresini DIL-2.2 üç-tırnak
//           biçimine katlamak: göz sağa kaymaz, niyet alt alta okunur.
//   Kapsam: yalnız `ad: "…"` kalıbındaki güvenli satırlar; kaçış (\") içeren,
//           yorumlu ya da kalıp-dışı satıra DOKUNULMAZ (null döner).
//   Neden:  biçimlendirici bunu OTOMATİK yapamaz — katlama değere satır sonu
//           katar, anlam-koruma güvencesi bozulurdu; bu yüzden 💡 ÖNERİDİR.
//   Sonuç:  duzeltme.ts ampulü bu fonksiyonu tek tıkla uygular.
// ═══════════════════════════════════════════════════════════════════════════

export const KATLAMA_ESIGI = 110;

/** Satır katlanabilir uzun bir dizgi-parametresi mi? Katlanmışsa satırlar, değilse null. */
export function uzunNiyetiKatla(satir: string, esik = KATLAMA_ESIGI): string[] | null {
  if (satir.length <= esik) return null;
  if (satir.includes("//") || satir.includes('"""') || satir.includes("\\")) return null;

  // `  ad: "metin"` + kuyruk — ya da imza-içi son parametre:
  // `  Adım( kod: X, ne: "metin" )` (öntakı kendi satırına alınır — F5 güçlendirmesi)
  const es = /^(\s*)(?:([\p{L}_][\p{L}\p{N}_]*\(\s*(?:[^"()]*?,)?)\s*)?([\p{L}_][\p{L}\p{N}_]*):(\s+)"([^"]*)"(\s*[,)]*\s*)$/u.exec(satir);
  if (!es) return null;
  const [, girinti, ontaki, ad, , metin, kuyruk] = es;
  if (metin.length < 60) return null;              // kısa değer — katlama fayda etmez
  if (ontaki && !/,\s*$/.test(ontaki)) return null; // öntakı virgülle bitmeli (güvenli kalıp)

  const govdeGirinti = girinti + "  ";
  const genislik = Math.max(48, esik - govdeGirinti.length - 4);

  // Sözcük sınırından sar (emoji/Türkçe güvenli — yalnız boşluktan bölünür).
  const parcalar: string[] = [];
  let kalan = metin.trim();
  while (kalan.length > genislik) {
    let kes = kalan.lastIndexOf(" ", genislik);
    if (kes < genislik * 0.5) kes = kalan.indexOf(" ", genislik); // upuzun sözcük
    if (kes === -1) break;
    parcalar.push(kalan.slice(0, kes));
    kalan = kalan.slice(kes + 1);
  }
  if (kalan) parcalar.push(kalan);
  if (parcalar.length < 2) return null;

  const bas = ontaki
    ? [`${girinti}${ontaki.trimEnd()}`, `${govdeGirinti}${ad}: """`]
    : [`${girinti}${ad}: """`];
  return [
    ...bas,
    ...parcalar.map((p) => `${govdeGirinti}${p}`),
    `${govdeGirinti}"""${kuyruk.trimEnd()}`,
  ];
}

// ── EKL-F4-A05 · Tablo hizalayıcı (saf) ──────────────────────────────────────
// Belge bloğundaki markdown tabloyu sütun-nizami hizalar (💡 ampul uygular —
// belge içeriği kullanıcı KARARIYLA değişir, biçimlendirici DOKUNMAZ · DIL-2).

/** Ardışık `| … |` satırlarını sütunlarına göre hizalar; tablo değilse null. */
export function tabloHizala(satirlar: string[]): string[] | null {
  if (satirlar.length < 2) return null;
  const gen = (s: string): number => [...s].length;          // emoji/Türkçe güvenli yaklaşık
  const ayrik = satirlar.map((s) => /^(\s*)\|(.*)\|\s*$/.exec(s));
  if (ayrik.some((e) => !e)) return null;
  const girinti = ayrik[0]![1];
  const hucreler = ayrik.map((e) => e![2].split("|").map((h) => h.trim()));
  const kolonSayisi = Math.max(...hucreler.map((h) => h.length));
  const ayracMi = (h: string[]): boolean => h.every((x) => /^:?-{2,}:?$/.test(x) || x === "");

  const genislik: number[] = Array.from({ length: kolonSayisi }, (_, k) =>
    Math.max(3, ...hucreler.filter((h) => !ayracMi(h)).map((h) => gen(h[k] ?? ""))));

  const ciz = hucreler.map((h) =>
    girinti + "| " + Array.from({ length: kolonSayisi }, (_, k) => {
      if (ayracMi(h)) return "-".repeat(genislik[k]);
      const x = h[k] ?? "";
      return x + " ".repeat(Math.max(0, genislik[k] - gen(x)));
    }).join(" | ") + " |");
  return ciz.join("\n") === satirlar.join("\n") ? null : ciz;   // zaten nizami → öneri yok
}

/**
 * ZRF-A05 (MIM-1.6 ② hüneri): noktalı-virgülle dizilmiş tek-satır görev/sınır
 * değerini madde listesine çevirir. Satır `alan: "a; b; c"` biçimindeyse ve
 * en az iki madde çıkıyorsa çok-satırlı liste metni döner; yoksa undefined.
 * SAF — vscode'suz, davranış-testli (duzeltme.ts yalnız uygular).
 */
export function noktaliVirgulMaddele(satir: string): string | undefined {
  const es = /^(\s*)(görev|sınır):\s*"([^"]*)"(,?)\s*$/u.exec(satir);
  if (!es || !es[3].includes("; ")) return undefined;
  const [, girinti, alan, deger, kuyruk] = es;
  const maddeler = deger.split(/;\s+/).map((m) => m.trim()).filter((m) => m !== "");
  if (maddeler.length < 2) return undefined;
  return `${girinti}${alan}: [\n` +
    maddeler.map((m) => `${girinti}  "${m}"`).join(",\n") +
    `\n${girinti}]${kuyruk}`;
}

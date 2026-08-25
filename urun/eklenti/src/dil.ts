// ═══════════════════════════════════════════════════════════════════════════
// dil.ts — VS Code yüzeyleri için TEK etkin dil kapısı
//
//   `sarmal.dil = otomatik` iken yalnız VS Code'un görüntü dili okunur.
//   Açık `tr`/`en` seçimi bu değeri ezer. Başka bir ortam, işletim sistemi,
//   dosya ya da süreç dili okunmaz; .sar kaynağının dili daima Türkçedir.
// ═══════════════════════════════════════════════════════════════════════════

import * as vscode from "vscode";
import DIL_SOZLUGU from "../../../oz/ceviri/dil-sozlugu.json";
import {
  dilSozlugunuBagla,
  type CiktiDili,
  type DilSozlugu,
} from "../../cekirdek/src/cevir.ts";

// Paketleyici JSON'u eklenti gövdesine alır; kurulu VSIX depo dışına çıkıp dosya aramaz.
dilSozlugunuBagla(DIL_SOZLUGU as unknown as DilSozlugu);

export type DilAyari = "otomatik" | CiktiDili;

/** Ayar anahtarı da etkin dil okumasıyla aynı kapıda yaşar. */
export function dilAyariDegistiMi(olay: vscode.ConfigurationChangeEvent): boolean {
  return olay.affectsConfiguration("sarmal.dil");
}

/** Eklentinin bütün okuma yüzeylerinin kullandığı tek etkin dil çözümleyicisi. */
export function etkinDil(): CiktiDili {
  const ayar = vscode.workspace
    .getConfiguration("sarmal")
    .get<DilAyari>("dil", "otomatik");
  if (ayar === "tr" || ayar === "en") return ayar;
  return vscode.env.language.toLocaleLowerCase().startsWith("tr") ? "tr" : "en";
}

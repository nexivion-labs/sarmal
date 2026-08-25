// ═══════════════════════════════════════════════════════════════════════════
// teknoloji-simgesi.ts — 🏷️ DOSYA UZANTISI → TEKNOLOJİ SİMGESİ (tek kaynak)
//
//   Founder hükmü 2026-07-28: "bir Sarmal veya herhangi bir dosya türü ile ilgili
//   her bildirim, gözlem veya sorun, o dosyanın ilgili olduğu teknolojinin
//   logosunu/ikonunu taşısın."
//
//   NEDEN AYRI BİR MODÜL: üç panel (Hatırlatıcılar · Gözlemler · Onaylar)
//   aynı soruyu soruyor — "bu satır hangi dosyaya ait ve o dosya hangi teknoloji?"
//   Üçü ayrı ayrı cevaplarsa üç çizelge doğar ve zamanla ayrışırlar; bu deponun
//   bugün ölçtüğü kusurun ta kendisidir (iki simge çizelgesi sessizce ayrışmıştı).
//
//   SİMGE İCAT EDİLMEZ, İLANDAN OKUNUR. Eşleme eklentinin KENDİ paket bildirimindeki
//   `contributes.languages` girdilerinden türer: her dilin `extensions` listesi ile
//   `icon` alanı okunur. Yani `.sar` dosyasının panelde göreceği simge, aynı dosyanın
//   sekmesinde ve dosya ağacında gördüğü simgenin TA KENDİSİDİR — ikinci bir çizelge
//   yazılmaz. Yarın ikinci bir dil ilan edilirse panel onu kendiliğinden tanır.
//
//   NEDEN `resourceUri` YETMEDİ: bir ağaç satırına `resourceUri` verildiğinde VS Code
//   simgeyi DOSYA SİMGE TEMASINDAN çizer. Katlanabilir satırlarda bu yol klasör gibi
//   davranıyor ve dil simgesi hiç devreye girmiyor; Founder canlı görünümde dosya
//   satırının simgesiz kaldığını gördü. Doğrudan `iconPath` vermek bu yolu atlar ve
//   simgeyi temadan bağımsız garanti eder.
// ═══════════════════════════════════════════════════════════════════════════

import * as vscode from "vscode";

/** Bir dil ilanının panel için gereken iki alanı. */
interface DilIlani {
  readonly extensions?: readonly string[];
  readonly icon?: { readonly light?: string; readonly dark?: string };
}

/** Uzantı → simge yolu (aydınlık/karanlık). Yollar eklenti köküne GÖRELİDİR. */
export type SimgeCizelgesi = ReadonlyMap<string, { readonly light: string; readonly dark: string }>;

/**
 * Paket bildirimindeki dil ilanlarından uzantı çizelgesini kurar. SAF işlev:
 * vscode kabuğu istemez, bu yüzden nöbet gerçek bildirimle koşabilir.
 *
 * Uzantılar küçük harfe indirilir; `.SAR` yazan bir dosya da tanınır. İkon
 * ilan etmeyen dil sessizce atlanır — simgesi olmayan dil için uydurma yapılmaz.
 */
export function simgeCizelgesiKur(diller: readonly DilIlani[]): SimgeCizelgesi {
  const cizelge = new Map<string, { light: string; dark: string }>();
  for (const dil of diller) {
    const light = dil.icon?.light ?? dil.icon?.dark;
    const dark = dil.icon?.dark ?? dil.icon?.light;
    if (!light || !dark) continue;
    for (const uzanti of dil.extensions ?? []) {
      cizelge.set(uzanti.toLocaleLowerCase("tr"), { light, dark });
    }
  }
  return cizelge;
}

/** Yolun uzantısını döner (noktayla, küçük harf); uzantısız yolda boş dizge. */
export function uzantiAl(dosyaYolu: string): string {
  const ad = dosyaYolu.slice(Math.max(dosyaYolu.lastIndexOf("/"), dosyaYolu.lastIndexOf("\\")) + 1);
  const nokta = ad.lastIndexOf(".");
  return nokta > 0 ? ad.slice(nokta).toLocaleLowerCase("tr") : "";
}

/**
 * Panel satırının taşıyacağı teknoloji simgesi. Çizelgede karşılığı olmayan
 * uzantı için `undefined` döner ve çağıran KENDİ yedeğine düşer; uydurma bir
 * simge basılmaz, çünkü yanlış teknoloji göstermek hiç göstermemekten kötüdür.
 */
export function teknolojiSimgesi(
  kok: vscode.Uri,
  cizelge: SimgeCizelgesi,
  dosyaYolu: string,
): { light: vscode.Uri; dark: vscode.Uri } | undefined {
  const kayit = cizelge.get(uzantiAl(dosyaYolu));
  if (!kayit) return undefined;
  return {
    light: vscode.Uri.joinPath(kok, ...kayit.light.replace(/^\.\//, "").split("/")),
    dark: vscode.Uri.joinPath(kok, ...kayit.dark.replace(/^\.\//, "").split("/")),
  };
}

/**
 * Eklentinin kendi bildiriminden çizelgeyi kurar. Tek çağrı noktası budur;
 * paneller çizelgeyi kendileri kurmaz, buradan alır.
 */
export function eklentiCizelgesi(eklenti: vscode.Extension<unknown>): SimgeCizelgesi {
  const paket = eklenti.packageJSON as { contributes?: { languages?: DilIlani[] } } | undefined;
  return simgeCizelgesiKur(paket?.contributes?.languages ?? []);
}

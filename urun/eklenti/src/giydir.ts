// ═══════════════════════════════════════════════════════════════════════════
// giydir.ts — 🎨 Çalışma Alanını Giydir (vscode kabuğu · BKM-SNV2-A03)
//
//   Komut, kanondaki renk ve dekor ayarlarını AÇIKÇA İSTENDİĞİNDE o çalışma
//   alanına yazar. Elle çalışan bir kolaylıktır; yazdığı hedef yalnız Workspace
//   olduğu için kullanıcının kendi ayarı hiçbir koşulda ezilmez.
//
//   VIT-KIMLIK-A04 (Founder sorusu 2026-07-29: "bir Sarmal projesi açıldığında
//   geliştirici renkler için giydir demek zorunda mı?"): AÇILIŞTA ÇIKAN TEKLİF
//   KALDIRILDI. Teklif, renklerin ancak ayar yazılarak ulaşabildiği bir tasarım
//   kusurunun belirtisiydi; renk artık pakette İLAN EDİLEREK ulaşıyor
//   (contributes.semanticTokenScopes + contributes.themes, arac/renk-uret.mjs
//   üretimi). İlan hiçbir dosyaya yazmadığı için sormaya da gerek kalmadı:
//   bir geliştiricinin ürünle ilk karşılaşması bir izin sorusu olmamalıdır.
//
//   Sınırlar (plan konisi): kullanıcı ayarı EZİLMEZ — yalnız Workspace hedefi;
//   rakip eklentiye yalnız KURULUYSA ve yalnız susturma anahtarıyla dokunulur.
//   Üretim tablosu giydir-ayar.ts'te (SAF — palette-drift nöbeti oradan sınar).
// ═══════════════════════════════════════════════════════════════════════════
import * as vscode from "vscode";
import { giydirAyarlari, RAKIP_SUSTURMA } from "./giydir-ayar.ts";
import { EKLENTI_KABUK_METINLERI } from "./yuzey-metinleri.ts";

/** Kanondaki renk/dekor ayarlarını Workspace hedefine yazar (komutun gövdesi). */
async function giydir(): Promise<void> {
  if (!vscode.workspace.workspaceFolders?.length) {
    void vscode.window.showWarningMessage(EKLENTI_KABUK_METINLERI.giydirKlasorGerekli);
    return;
  }
  const cfg = vscode.workspace.getConfiguration();
  for (const [anahtar, deger] of Object.entries(giydirAyarlari())) {
    await cfg.update(anahtar, deger, vscode.ConfigurationTarget.Workspace);
  }
  // Rakip gürültü: yalnız kuruluysa, yalnız susturma anahtarıyla (mevcut liste korunur).
  for (const { eklenti, anahtar, deger } of RAKIP_SUSTURMA) {
    if (!vscode.extensions.getExtension(eklenti)) continue;
    const mevcut = cfg.get<string[]>(anahtar) ?? [];
    if (!mevcut.includes(deger)) await cfg.update(anahtar, [...mevcut, deger], vscode.ConfigurationTarget.Workspace);
  }
  void vscode.window.showInformationMessage(EKLENTI_KABUK_METINLERI.giydirildi);
}

/** Kayıt YALNIZ komutu tanıtır; aktivasyonda hiçbir ayar yazılmaz ve hiçbir
 *  soru sorulmaz. Nöbet (giydirmesiz-renk.test.ts) bu sessizliği sahte bir
 *  yürütücüyle ölçer: kayıt sırasında sıfır ayar yazımı, sıfır ileti. */
export function giydirKaydi(context: vscode.ExtensionContext): void {
  context.subscriptions.push(vscode.commands.registerCommand("sarmal.giydir", () => void giydir()));
}

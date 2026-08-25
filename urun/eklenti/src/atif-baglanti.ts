// ═══════════════════════════════════════════════════════════════════════════
// atif-baglanti.ts — 👁️ Çapraz-varlık atıf BAKIŞI (VIT-GRAF-A14 · Founder ek hükmü 2026-08-04)
//
//   Ölçülmüş kusur: atif-dekor koşu/anlatı metinlerindeki kod atıflarını iki
//   varlığın ORTAK evreninden süslüyor, F12 (gezinme.ts) ise MIM-1.1 varlık
//   süzgeciyle çözüyor — _Sarmal'dan bakınca BLK-ZKA gibi 1245 kod altı çizili
//   ama tıklaması ÖLÜ. Adım hükmü: hedef öbür varlıktaysa gezinme sınırı
//   OKUR-YALNIZ aşar; dosya salt okunur açılır. Bu bağımlılık DEĞİLDİR, yalnız
//   bakıştır (STR-3 kod bağımlılığını yasaklar, insan bakışını değil).
//
//   Mekanizma: F12'nin yapısal olarak KÖR olduğu atıflar (tüm tanımlar başka
//   varlıkta) DocumentLink olur; link `command:` kapısından geçer ve hedef
//   editörde OTURUM-SALT-OKUNUR açılır. F12'nin bugünkü çözümü olan atıflara
//   BURADAN link üretilmez — mevcut çözüm aynen kalır (Adım sınırı). Karar
//   mantığı saf çekirdekte (atif-cekirdek.caprazAtifSec — fikstürlü sınamada).
//
//   PERFORMANS: yeni tarama AÇILMAZ — tanım evreni, dekor ve gezinmenin zaten
//   canlı tuttuğu kimlik indeksinden (cekirdek/kimlik.ts) tek geçişte okunur.
// ═══════════════════════════════════════════════════════════════════════════

import * as vscode from "vscode";
import { kimlikIndeksi, INDEKS_DISI, type Tanim } from "../../cekirdek/src/kimlik.ts";
import { atifAraliklariTopla, caprazAtifSec } from "./atif-cekirdek.ts";
import { caprazBakisIpucu } from "./yuzey-metinleri.ts";

/** Komut kimliği — link kapısı ile kayıt AYNI sabitten okur (yazım kayması imkânsız). */
export const CAPRAZ_BAKIS_KOMUTU = "sarmal.caprazBakis";

interface CaprazBakisHedefi { dosya: string; satir: number; sutun: number; kod: string }

/** Çapraz-varlık atıflarını salt-okunur bakış linkine çeviren sağlayıcı. */
export function caprazAtifSaglayici(
  varlikKoku: (yol: string) => string | undefined,
): vscode.DocumentLinkProvider {
  return {
    provideDocumentLinks(doc) {
      if (doc.uri.scheme !== "file" || doc.languageId !== "sarmal") return undefined;

      // Kirli tampon tazeliği (atif-dekor deseni): karar vermeden önce aktif belge indekse yazılır.
      kimlikIndeksi.dosyaGuncelle(doc.uri.fsPath, doc.getText());

      // Tanım evreni DEKORLA AYNI süzgeçten tek geçişte kurulur (KPN-A01): süs ile
      // tıklama iki ayrı evrenden beslenirse süslü-ama-ölü sözce geri doğar.
      const tanimlar = kimlikIndeksi.tumTanimlar(
        (d) => d === doc.uri.fsPath || !INDEKS_DISI.test(d));
      const tanimHaritasi = new Map<string, Tanim[]>();
      for (const t of tanimlar) {
        const liste = tanimHaritasi.get(t.kod) ?? [];
        liste.push(t);
        tanimHaritasi.set(t.kod, liste);
      }
      const kodlar = new Set(tanimHaritasi.keys());
      const buradakiTanimlar = new Set(
        tanimlar.filter((t) => t.dosya === doc.uri.fsPath).map((t) => `${t.kod}@${t.satir - 1}`));

      const satirlar: string[] = [];
      for (let s = 0; s < doc.lineCount; s++) satirlar.push(doc.lineAt(s).text);

      const kaynakKok = varlikKoku(doc.uri.fsPath);
      const linkler: vscode.DocumentLink[] = [];
      for (const a of atifAraliklariTopla(satirlar, kodlar, buradakiTanimlar)) {
        const hedef = caprazAtifSec(tanimHaritasi.get(a.kod) ?? [], kaynakKok, varlikKoku);
        if (!hedef) continue;   // F12'nin işi ya da çözülmeyen kod — buradan link çıkmaz
        const arg: CaprazBakisHedefi = { dosya: hedef.dosya, satir: hedef.satir, sutun: hedef.sutun, kod: a.kod };
        const link = new vscode.DocumentLink(
          new vscode.Range(a.satir, a.baslangic, a.satir, a.bitis),
          vscode.Uri.parse(`command:${CAPRAZ_BAKIS_KOMUTU}?${encodeURIComponent(JSON.stringify(arg))}`));
        link.tooltip = caprazBakisIpucu(a.kod);
        linkler.push(link);
      }
      return linkler;
    },
  };
}

/** Kayıt: sağlayıcı + salt-okunur açış komutu birlikte kurulur. */
export function caprazAtifKaydi(
  context: vscode.ExtensionContext,
  varlikKoku: (yol: string) => string | undefined,
): void {
  context.subscriptions.push(
    vscode.languages.registerDocumentLinkProvider("sarmal", caprazAtifSaglayici(varlikKoku)),
    vscode.commands.registerCommand(CAPRAZ_BAKIS_KOMUTU, async (hedef: CaprazBakisHedefi) => {
      if (!hedef?.dosya) return;
      const konum = new vscode.Position(Math.max(0, (hedef.satir ?? 1) - 1), Math.max(0, (hedef.sutun ?? 1) - 1));
      await vscode.window.showTextDocument(vscode.Uri.file(hedef.dosya), {
        preview: true,
        selection: new vscode.Range(konum, konum),
      });
      // Okur-yalnız bakış: hedef editör bu OTURUMDA salt okunur işaretlenir —
      // varlık sınırı aşılır ama yazma kapısı açılmaz (Adım hükmü · STR-3).
      await vscode.commands.executeCommand("workbench.action.files.setActiveEditorReadonlyInSession");
    }),
  );
}

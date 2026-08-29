// ═══════════════════════════════════════════════════════════════════════════
// gezinme.ts — 🎯 Kimlik-gezinme ailesi: F12 · ⇧F12 · F2 · Ctrl+T (EKL-F11-A02/A03 · YUZ-3.2)
//
//   Beş ekosistemin ortak kas hafızası Sarmal'a iner: F12 atıftan tanım
//   düğümüne zıplar, ⇧F12 bir kod'un tüm atıflarını listeler, F2 bir kod'u
//   TÜM dokunuşlarıyla yeniden adlandırır, Ctrl+T kod/ad'a atlar. Konumlar
//   kimlik indeksinden (cekirdek/kimlik.ts · EKL-F11-A01/A05 — MCP `gezin`
//   aracı ve CLI ile AYNI çekirdek, DIL-2); sorgu öncesi AKTİF belge
//   tazelenir ki kirli (kaydedilmemiş) tampondaki kod da bulunur olsun —
//   tek dosya taraması ~1.6ms, hissedilmez.
//
//   MIM-1.1/STR-3 varlık sınırı: kaynak dosyanın varlık kökü bulunur, sonuçlar
//   o varlık + köksüz dosyalarla sınırlanır (Nexivion'dayken Nexivion) —
//   çapraz-varlık atıf zaten denetçinin yasağında, gezinme de sınırı aşmaz.
//   Köksüz kaynaktan sınır çizilmez (yapışkan-panel felsefesiyle tutarlı).
//   F2 aynı süzgeçle yazar: başka varlığın dosyasına DOKUNMAZ.
// ═══════════════════════════════════════════════════════════════════════════

import * as vscode from "vscode";
import { kimlikIndeksi, gezinmeSuzgeci, adAlanliTanimlar, type DosyaSuzgeci } from "../../cekirdek/src/kimlik.ts";   // ORK-4: ad alanlı kod kardeş kökte çözülür (KPS-ADA-A01)
import { GEZINME_METINLERI, kanonikWidgetAdi } from "./yuzey-metinleri.ts";

/** Kod sözcesi: tire/alt-çizgi İÇEREN tam sözce (EKL-F11-A01 · şüphedeDur).
 *  VS Code'un varsayılan sözcük deseni tirede böler — buradaki desen bölmez.
 *  ORK-4 ad alanı ayracı (`::`) da sözcenin İÇİNDEDİR (KPS-ADA-A01): ayraç
 *  dışarıda kalsaydı imleç `PRJ-A::KOD-X` üstündeyken yalnız yarısı seçilir ve
 *  F12 ad alanının kendisini arardı. */
const KOD_SOZCUK = /[0-9A-Za-zÇĞİÖŞÜçğıöşü_][0-9A-Za-zÇĞİÖŞÜçğıöşü_-]*(?:::[0-9A-Za-zÇĞİÖŞÜçğıöşü_][0-9A-Za-zÇĞİÖŞÜçğıöşü_-]*)?(?:\.[0-9]+){0,2}/;

export function gezinmeKaydi(
  context: vscode.ExtensionContext,
  varlikKoku: (yol: string) => string | undefined,
): void {
  // KPN-A01: karar mantığı SAF çekirdekte (kimlik.gezinmeSuzgeci — fikstürlü testli):
  // ürün kaynaklı gezinmede ders-dünyası (şablon/örnek) kopyaları sonuca girmez,
  // MIM-1.1 varlık sınırı korunur, ders dosyası kendi evreninde serbest gezinir.
  const suzgec = (kaynak: vscode.TextDocument): DosyaSuzgeci =>
    gezinmeSuzgeci(kaynak.uri.scheme === "file" ? kaynak.uri.fsPath : undefined, varlikKoku);

  const kodAl = (doc: vscode.TextDocument, poz: vscode.Position): string | undefined => {
    const aralik = doc.getWordRangeAtPosition(poz, KOD_SOZCUK);
    return aralik ? doc.getText(aralik) : undefined;
  };

  // Kirli tampon tazeliği: sorgudan hemen önce aktif belge indekse yazılır —
  // kapsam-dışı (ornek/arsiv…) belge DAHİL: açık dosyanın KENDİ içinde gezinme
  // her zaman çalışmalı (vscode-test dersi: ornek/ altındaki dosyada F12 ölüydü).
  // Kirlilik sınırlı: kapsam-dışı belge KAPANINCA indeksten düşer (eklenti.ts).
  const tazele = (doc: vscode.TextDocument): void => {
    if (doc.uri.scheme !== "file") return;
    if (doc.isDirty || !kimlikIndeksi.dosyaVar(doc.uri.fsPath))
      kimlikIndeksi.dosyaGuncelle(doc.uri.fsPath, doc.getText());
  };

  const yer = (dosya: string, satir: number, sutun: number, uzunluk: number): vscode.Location =>
    new vscode.Location(
      vscode.Uri.file(dosya),
      new vscode.Range(satir - 1, sutun - 1, satir - 1, sutun - 1 + uzunluk));

  context.subscriptions.push(
    // F12 · Tanıma Git — yinelenen tanım varsa hepsi listelenir (dürüst ayna).
    vscode.languages.registerDefinitionProvider("sarmal", {
      provideDefinition(doc, poz) {
        const kod = kodAl(doc, poz);
        if (!kod) return undefined;
        tazele(doc);
        const yerel = kimlikIndeksi.tanimlar(kod, suzgec(doc));
        // ORK-4 (KPS-ADA-A01): ad alanlı kodun tanımı yüklü evrende değil, çatının
        // duyurduğu kardeş kökte yaşar; yerel indeks sustuğunda oraya bakılır.
        const kaynak = doc.uri.scheme === "file" ? doc.uri.fsPath : undefined;
        const tanimlar = yerel.length || !kaynak ? yerel : adAlanliTanimlar(kod, kaynak);
        return tanimlar.map((t) => yer(t.dosya, t.satir, t.sutun, t.kod.length));
      },
    }),
    // ⇧F12 · Tüm Referanslar — atıflar + (istenirse) tanımın kendisi.
    vscode.languages.registerReferenceProvider("sarmal", {
      provideReferences(doc, poz, baglam) {
        const kod = kodAl(doc, poz);
        if (!kod) return undefined;
        tazele(doc);
        const s = suzgec(doc);
        const yerler = kimlikIndeksi.atiflar(kod, s)
          .map((a) => yer(a.dosya, a.satir, a.sutun, kod.length));
        if (baglam.includeDeclaration) {
          // ORK-4: ad alanlı kodun tanımı kardeş köktedir; yerel indeks susunca
          // ⇧F12 de tanıma gitme ile AYNI çekirdekten okur (YUZ-1.2).
          const yerelTanimlar = kimlikIndeksi.tanimlar(kod, s);
          const kaynak = doc.uri.scheme === "file" ? doc.uri.fsPath : undefined;
          const tanimlar = yerelTanimlar.length || !kaynak
            ? yerelTanimlar : adAlanliTanimlar(kod, kaynak);
          yerler.push(...tanimlar.map((t) => yer(t.dosya, t.satir, t.sutun, t.kod.length)));
        }
        return yerler;
      },
    }),
    // F2 · Yeniden Adlandır (A03) — tanım + TÜM atıflar tek WorkspaceEdit'te
    // (DIL-1.2 göçünde 47 dosya elle taranmıştı; o acı buraya iner). Geri-al
    // VS Code güvencesinde; dosya-adı taşıma İLK SÜRÜMDE KAPSAM DIŞI (bilgi verilir).
    vscode.languages.registerRenameProvider("sarmal", {
      prepareRename(doc, poz) {
        const aralik = doc.getWordRangeAtPosition(poz, KOD_SOZCUK);
        if (!aralik) throw new Error(GEZINME_METINLERI.yenidenAdlandirilacakKodYok);
        const kod = doc.getText(aralik);
        tazele(doc);
        if (!kimlikIndeksi.tanimlar(kod).length && !kimlikIndeksi.atiflar(kod).length)
          throw new Error(GEZINME_METINLERI.indeksteYok(kod));
        return { range: aralik, placeholder: kod };
      },
      provideRenameEdits(doc, poz, yeniAd) {
        const kod = kodAl(doc, poz);
        if (!kod) return undefined;
        yeniAd = yeniAd.trim();
        if (!/^[0-9A-Za-zÇĞİÖŞÜçğıöşü_][0-9A-Za-zÇĞİÖŞÜçğıöşü_-]*$/.test(yeniAd))
          throw new Error(GEZINME_METINLERI.gecersizKod(yeniAd));
        if (yeniAd === kod) return undefined;
        tazele(doc);
        const s = suzgec(doc);
        const duzenle = new vscode.WorkspaceEdit();
        const konumlar = [...kimlikIndeksi.tanimlar(kod, s), ...kimlikIndeksi.atiflar(kod, s)];
        for (const k of konumlar) {
          duzenle.replace(vscode.Uri.file(k.dosya),
            new vscode.Range(k.satir - 1, k.sutun - 1, k.satir - 1, k.sutun - 1 + kod.length), yeniAd);
        }
        // Dosya adı koddan türemişse (kod→ad indirme izi) elle taşınmalı — dürüst bilgi.
        const adGovdesi = kod.toLocaleLowerCase("tr").replace(/-/g, "_");
        const dosyaEsli = kimlikIndeksi.tanimlar(kod, s)
          .filter((t) => t.dosya.toLocaleLowerCase("tr").includes(adGovdesi));
        if (dosyaEsli.length) {
          void vscode.window.showInformationMessage(GEZINME_METINLERI.dosyaAdlari(kod, dosyaEsli.length));
        }
        return duzenle;
      },
    }),
    // Ctrl+T · Çalışma-alanı sembolleri (A03) — tüm kod tanımları + ad: değerleri.
    vscode.languages.registerWorkspaceSymbolProvider({
      provideWorkspaceSymbols(sorgu) {
        const kucuk = sorgu.toLocaleLowerCase("tr");
        return kimlikIndeksi.tumTanimlar()
          .filter((t) => !sorgu
            || t.kod.toLocaleLowerCase("tr").includes(kucuk)
            || (t.ad ?? "").toLocaleLowerCase("tr").includes(kucuk))
          .map((t) => {
            const gorunenTip = kanonikWidgetAdi(t.tip, t.tip);
            return new vscode.SymbolInformation(
              t.kod,
              t.tip === "tipTanım" ? vscode.SymbolKind.Class
                : t.tip === "kuralTanım" ? vscode.SymbolKind.Interface
                : vscode.SymbolKind.Field,
              t.ad ? `${gorunenTip} · ${t.ad}` : gorunenTip,
              yer(t.dosya, t.satir, t.sutun, t.kod.length));
          });
      },
    }),
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// gorsel-esad.ts — 🪞 Kaynak içi görsel eşadlar (CDL-A08)
//
//   İngilizce okuma yüzünde kanonik Türkçe widget adını yalnız dekorasyonla
//   örter ve sözlüğün İngilizce etiketini aynı yere basar. Kaynak metne hiçbir
//   düzenleme uygulanmaz: kaydetme, kopyalama, ayrıştırma ve git yüzü daima
//   Türkçedir. İmlecin bulunduğu satır süslenmez; düzenleyen kişi gerçek metni
//   görür. Türkçe yüzde dekorasyon türü ve editör dinleyicileri hiç kurulmaz.
// ═══════════════════════════════════════════════════════════════════════════

import type * as vscode from "vscode";
import { belirtecle } from "../../cekirdek/src/belirtec.ts";
import { sozlukAdi, type CiktiDili } from "../../cekirdek/src/cevir.ts";

/** Sözlük kapısının sınamada mutasyona uğratılabilen dar yüzü. */
export type WidgetAdiKapisi = (ad: string, dil: CiktiDili) => string;

/** VS Code aralığına çevrilmeden önceki saf görsel eşad kararı. */
export interface GorselEsadAraligi {
  readonly satir: number;
  readonly baslangic: number;
  readonly bitis: number;
  readonly kaynak: string;
  readonly etiket: string;
}

const varsayilanWidgetAdi: WidgetAdiKapisi = (ad, dil) => sozlukAdi("widget", ad, dil);

/**
 * Kaynakta gerçekten duran kanonik widget sözcelerini toplar. Belirteçleyici
 * dizgi, yorum ve belge bloklarını zaten ayırdığı için oralardaki düzyazı
 * çevrilmez. Emoji eşadları da kaynak dilimi kanonik adla birebir olmadığı için
 * dışarıda kalır. Bozuk/geçici belge editör akışını kesmez; o kare dekorsuzdur.
 */
export function gorselEsadAraliklari(
  kaynak: string,
  dil: CiktiDili,
  widgetAdi: WidgetAdiKapisi = varsayilanWidgetAdi,
): GorselEsadAraligi[] {
  if (dil !== "en") return [];
  const satirlar = kaynak.split("\n");
  try {
    return belirtecle(kaynak).flatMap((belirtec): GorselEsadAraligi[] => {
      if (belirtec.tur !== "ad") return [];
      const etiket = widgetAdi(belirtec.deger, dil);
      if (etiket === belirtec.deger) return [];
      const satir = belirtec.satir - 1;
      const baslangic = belirtec.sutun - 1;
      // Belirteçleyici emoji eşadını ve NFC normalizasyonunu kanonikleştirebilir;
      // dekorasyon yalnız ham kaynak dilimi aynıysa konumu güvenle kullanır.
      if (satirlar[satir]?.slice(baslangic, baslangic + belirtec.deger.length) !== belirtec.deger) return [];
      return [{
        satir,
        baslangic,
        bitis: baslangic + belirtec.deger.length,
        kaynak: belirtec.deger,
        etiket,
      }];
    });
  } catch {
    return [];
  }
}

interface EtkinKatman {
  readonly tur: vscode.TextEditorDecorationType;
  readonly abonelikler: vscode.Disposable[];
}

/**
 * Görsel eşad yaşam döngüsü. `etkinDil` doğrudan dil.ts kapısıdır; bu modül
 * ikinci bir dil kararı vermez. Ayar olayı dışarıdan aynı kapının anahtar
 * süzgeciyle gelir. Türkçe etkinleştiği anda dinleyiciler ve dekorasyon türü
 * birlikte elden çıkarılır.
 */
export function gorselEsadKaydi(
  context: vscode.ExtensionContext,
  kabuk: typeof vscode,
  etkinDil: () => CiktiDili,
  dilAyariDegistiMi: (olay: vscode.ConfigurationChangeEvent) => boolean,
): void {
  let katman: EtkinKatman | undefined;

  const boya = (editor: vscode.TextEditor): void => {
    if (!katman || editor.document.languageId !== "sarmal") return;
    const imlecSatirlari = new Set(editor.selections.map((secim) => secim.active.line));
    const dekor: vscode.DecorationOptions[] = gorselEsadAraliklari(editor.document.getText(), "en")
      .filter((esad) => !imlecSatirlari.has(esad.satir))
      .map((esad) => ({
        range: new kabuk.Range(esad.satir, esad.baslangic, esad.satir, esad.bitis),
        renderOptions: {
          before: {
            contentText: esad.etiket,
            color: new kabuk.ThemeColor("editor.foreground"),
            // İngilizce etiket kaynak sözcesinin genişliğini devralır: saydam
            // Türkçe token satırda ikinci bir boşluk bırakmaz.
            margin: `0 -${esad.kaynak.length}ch 0 0`,
          },
        },
      }));
    editor.setDecorations(katman.tur, dekor);
  };

  const gorunenleriBoya = (): void => {
    for (const editor of kabuk.window.visibleTextEditors) boya(editor);
  };

  const kapat = (): void => {
    if (!katman) return;
    for (const abonelik of katman.abonelikler) abonelik.dispose();
    katman.tur.dispose();
    katman = undefined;
  };

  const ac = (): void => {
    if (katman || etkinDil() !== "en") return;
    const tur = kabuk.window.createTextEditorDecorationType({
      color: "transparent",
      rangeBehavior: kabuk.DecorationRangeBehavior.ClosedClosed,
    });
    katman = {
      tur,
      abonelikler: [
        kabuk.window.onDidChangeVisibleTextEditors(gorunenleriBoya),
        kabuk.window.onDidChangeTextEditorSelection((olay) => boya(olay.textEditor)),
        kabuk.workspace.onDidChangeTextDocument((olay) => {
          for (const editor of kabuk.window.visibleTextEditors) {
            if (editor.document === olay.document) boya(editor);
          }
        }),
      ],
    };
    gorunenleriBoya();
  };

  const diliEsitle = (): void => {
    if (etkinDil() === "en") {
      ac();
      gorunenleriBoya();
    } else {
      kapat();
    }
  };

  const ayarAboneligi = kabuk.workspace.onDidChangeConfiguration((olay) => {
    if (dilAyariDegistiMi(olay)) diliEsitle();
  });
  context.subscriptions.push(ayarAboneligi, { dispose: kapat });
  diliEsitle();
}

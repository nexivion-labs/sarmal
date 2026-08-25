// ═══════════════════════════════════════════════════════════════════════════
// takdir.ts — 🙏❤️🏅💡 FOUNDER GERİBİLDİRİM KANALLARI (STR-4)
//
//   "Teşekkür, takdir, onur — üçü de sistemde olsun; bir de öneri. Ajanların
//    öğrenme mekanizmasına bağlayacağız: hangi görevden memnun kaldığımızı,
//    hangi davranışı takdir ettiğimizi öğrenmiş olacaklar." (Founder 14:50)
//
//   Tamamlanan Adım'ın üstünde geribildirim lensi yaşar → tıkla → kanal seç
//   (🙏 teşekkür · ❤️ takdir · 🏅 onur · 💡 öneri) → not yaz → parametre olarak
//   DİLE işlenir. Hasat komutu (sarmal.geribildirimHasadi) tüm notları
//   ogrenme/geribildirim.sar'a Bellek(tür: kullanıcı) kayıtları olarak döşer —
//   RAY-3 koşumunda etmenlerin izole hafızalarına dağıtılacak (STR-4).
// ═══════════════════════════════════════════════════════════════════════════

import * as vscode from "vscode";
import { dirname, join } from "node:path";
import { rozetRenkleri } from "./ortak.ts";
import { yazimKokuBul } from "./kanon-kesif.ts";   // EKL-F6-A04: hedef varlık İLANDAN bulunur
import { programAl } from "./onbellek.ts";           // EKL-F9-A06: paylaşımlı AST önbelleği
import { nabizAbone, geciktir } from "./nabiz.ts";   // EKL-F9-A07/A08: tek kalp + tek geciktirici
import { degerBicimle, satirdaDegerDegistir } from "../../cekirdek/src/deger-yaz.ts";
import type { Dugum } from "../../cekirdek/src/sozdizim.ts";
// VIT-POSTA-A02 devamı: ekleme noktası doğrulaması karar yazımıyla AYNI evden
// gelir. Bağımsız denetim aynı kör aritmetiğin (sütun − 1 + uzunluk) bu dosyada
// ikinci bir kopyasını ölçtü; kopya doğrulamasız kalırsa tırnaklı "tamamlandı"
// değerinde geribildirim eki dizginin içine düşer ve dosya bozulur.
import { eklemeNoktasiDenetimi } from "./onay-cekirdek.ts";
import { EKLENTI_KABUK_METINLERI, TAKDIR_METINLERI, takdirKanallari } from "./yuzey-metinleri.ts";

interface KanalNotu {
  param: string;
  emoji: string;
  deger?: string;
  degerSatir?: number;
  degerSutun?: number;
  degerUzunluk?: number;
}

interface GeribildirimNoktasi {
  satir: number;
  kod: string;
  kanallar: KanalNotu[];         // dolu olanlar
  durumSatir: number;            // `tamamlandı` sonu — ekleme noktası
  durumSutun: number;
}

function noktalariTopla(doc: vscode.TextDocument): GeribildirimNoktasi[] {
  const noktalar: GeribildirimNoktasi[] = [];
  const bildirimler: Dugum[] | undefined = programAl(doc)?.bildirimler;   // EKL-F9-A06: tek parse
  if (!bildirimler) return noktalar;

  const gez = (d: Dugum): void => {
    if (d.ad === "Adım") {
      // A11/E1: durum gövde-özelliği de olabilir — motorla aynı ikili arama.
      const durum = d.parametreler.find((p) => p.ad === "durum") ?? d.ozellikler.find((p) => p.ad === "durum");
      if (durum?.deger.metin === "tamamlandı") {
        const kanallar: KanalNotu[] = [];
        for (const k of takdirKanallari()) {
          const p = d.parametreler.find((x) => x.ad === k.param) ?? d.ozellikler.find((x) => x.ad === k.param);
          if (p?.deger.metin !== undefined) kanallar.push({
            param: k.param, emoji: k.emoji, deger: p.deger.metin,
            degerSatir: p.deger.satir - 1, degerSutun: p.deger.sutun - 1,
            degerUzunluk: p.deger.metin.length,
          });
        }
        noktalar.push({
          satir: d.satir - 1,
          kod: (d.parametreler.find((x) => x.ad === "kod") ?? d.ozellikler.find((x) => x.ad === "kod"))?.deger.metin ?? "?",
          kanallar,
          durumSatir: durum.deger.satir - 1,
          durumSutun: durum.deger.sutun - 1 + "tamamlandı".length,
        });
      }
    }
    for (const c of d.cocuklar) gez(c);
  };
  for (const b of bildirimler) gez(b);
  return noktalar;
}

export function takdirKaydi(baglam: vscode.ExtensionContext): void {
  const degisti = new vscode.EventEmitter<void>();

  // ── ✍️ editör-içi geribildirim BLOĞU (Founder 14:54: "kendi penceresi olsun,
  //    ufak bir metin bloğu açılsın") — VS Code Yorum API'si: çok satırlı kutu,
  //    altında dört kanal düğmesi; tamamlanmış adım satırlarında + işareti de çıkar.
  const kutu = vscode.comments.createCommentController("sarmal-geribildirim", EKLENTI_KABUK_METINLERI.geribildirimDenetleyicisi);
  kutu.options = {
    placeHolder: TAKDIR_METINLERI.yerTutucu,
    prompt: TAKDIR_METINLERI.istem,
  };
  kutu.commentingRangeProvider = {
    provideCommentingRanges(doc) {
      if (doc.languageId !== "sarmal" || doc.uri.scheme !== "file") return [];
      return noktalariTopla(doc).map((n) => new vscode.Range(n.satir, 0, n.satir, 0));
    },
  };
  const acikKutular = new Map<string, vscode.CommentThread>();

  // NOT (0.9.75): lens artık liste akışına gittiğinden bu pencere açıcı çağrılmıyor —
  // VS Code Comments çizimini geri getirirse lens buraya yeniden bağlanabilir (parkta).
  const kutuAc = (uri: vscode.Uri, n: GeribildirimNoktasi): void => {
    const anahtar = uri.toString() + ":" + n.satir;
    // ÖLÜ REFERANS NÖBETİ (Eklenti uzmanı teşhisi): kullanıcı pencereyi native
    // kapattığında thread dispose edilir ama haritadan silinmez; atılmışı
    // diriltmek "bir daha açılmıyor" bugunu doğurur. Her seferinde TAZE thread.
    acikKutular.get(anahtar)?.dispose();
    acikKutular.delete(anahtar);
    // Karşılama notu: comment'i olan thread GC edilmez (boş-taslak riski kalkar).
    const karsilama: vscode.Comment = {
      body: new vscode.MarkdownString(
        TAKDIR_METINLERI.karsilama(n.kod)),
      mode: vscode.CommentMode.Preview,
      author: { name: "Sarmal" },
    };
    const kutucuk = kutu.createCommentThread(uri, new vscode.Range(n.satir, 0, n.satir, 0), [karsilama]);
    kutucuk.label = TAKDIR_METINLERI.etiket(n.kod);
    kutucuk.canReply = true;
    kutucuk.collapsibleState = vscode.CommentThreadCollapsibleState.Expanded;
    // İmleç ve görüş alanı satıra gitsin — pencere gözün önünde doğsun
    const editor = vscode.window.activeTextEditor;
    if (editor?.document.uri.toString() === uri.toString()) {
      editor.selection = new vscode.Selection(n.satir, 0, n.satir, 0);
      editor.revealRange(new vscode.Range(n.satir, 0, n.satir, 0),
        vscode.TextEditorRevealType.InCenterIfOutsideViewport);
    }
    acikKutular.set(anahtar, kutucuk);
  };

  /** Kanal notunun tek yazıcısı: parametreyi Adım'a işler (yeni ekler / mevcudu değiştirir). */
  const kanalYaz = async (doc: vscode.TextDocument, satir: number, param: string, emoji: string, metin: string): Promise<void> => {
    const n = noktalariTopla(doc).find((x) => x.satir === satir);
    if (!n) return;
    // EKL-F9-A09: yazım quote-güvenli TEK yardımcıdan (deger-yaz) — ad-hoc temizlik bitti.
    const mevcut = n.kanallar.find((k) => k.param === param);
    const duzenleme = new vscode.WorkspaceEdit();
    if (mevcut?.degerSatir !== undefined) {
      const eskiSatir = doc.lineAt(mevcut.degerSatir).text;
      const yeniSatir = satirdaDegerDegistir(eskiSatir, mevcut.degerSutun! + 1, mevcut.degerUzunluk!, metin);
      if (yeniSatir === null) return;   // fail-safe: konum bayat — dosyayı bozma
      duzenleme.replace(doc.uri,
        new vscode.Range(mevcut.degerSatir, 0, mevcut.degerSatir, eskiSatir.length), yeniSatir);
    } else {
      // Ekleme noktası kanıtlanmadan yazılmaz: noktanın hemen önünde "tamamlandı"
      // değerinin kendisi durmalı ve satır NFC olmalıdır. Uymayan noktaya yazmak
      // dosyayı sessizce bozar; fail-safe yukarıdaki bayat-konum korumasının ikizidir.
      const denetim = eklemeNoktasiDenetimi(doc.lineAt(n.durumSatir).text, "tamamlandı", n.durumSutun);
      if (denetim.tur !== "doğru") {
        vscode.window.showWarningMessage(TAKDIR_METINLERI.eklemeNoktasi(n.kod, denetim.bulunan));
        return;
      }
      duzenleme.insert(doc.uri, new vscode.Position(n.durumSatir, n.durumSutun),
        `, ${param}: ${degerBicimle(metin)}`);
    }
    await vscode.workspace.applyEdit(duzenleme);
    await doc.save();
    vscode.window.showInformationMessage(TAKDIR_METINLERI.islendi(emoji, n.kod));
    degisti.fire(); susle();
  };

  const gonderYap = (param: string, emoji: string) => async (yanit: vscode.CommentReply): Promise<void> => {
    const metin = yanit.text.trim();
    if (!metin) return;
    const doc = await vscode.workspace.openTextDocument(yanit.thread.uri);
    const aralik = yanit.thread.range;
    if (!aralik) return;   // CommentThread.range opsiyonel (@types/vscode) — aralıksız yanıt işlenmez
    const satir = aralik.start.line;
    await kanalYaz(doc, satir, param, emoji, metin);
    yanit.thread.dispose();
    acikKutular.delete(yanit.thread.uri.toString() + ":" + satir);
  };

  // ── satır sonu süsleri: dolu kanallar sabit · boş nokta 💓 atar ────────────
  // Kalp rengi KANONDAN (driftRozetleri.kalp — KRR-MUT Sütun D: elle kopya indi).
  const kalp = rozetRenkleri().kalp;
  const doluSusu = vscode.window.createTextEditorDecorationType({
    after: { color: kalp },
  });
  const davetDolu = vscode.window.createTextEditorDecorationType({
    after: { contentText: TAKDIR_METINLERI.bekliyorSus, color: kalp },
  });
  const davetBos = vscode.window.createTextEditorDecorationType({
    after: { contentText: "  🤍", color: `${kalp}55` },
  });
  let davetAraliklar: vscode.DecorationOptions[] = [];
  let davetAtis = true;
  const davetBoya = (): void => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== "sarmal" || editor.document.uri.scheme !== "file") return;
    editor.setDecorations(davetAtis ? davetDolu : davetBos, davetAraliklar);
    editor.setDecorations(davetAtis ? davetBos : davetDolu, []);
  };
  const davetKalbi = nabizAbone((a) => { davetAtis = a; davetBoya(); });   // tek nabız (EKL-F9-A08)

  const susle = (): void => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== "sarmal" || editor.document.uri.scheme !== "file") return;
    const noktalar = noktalariTopla(editor.document);
    const dolular = noktalar
      .filter((n) => n.kanallar.length)
      .map((n) => ({
        range: editor.document.lineAt(n.durumSatir).range,   // Adım başlığı değil, DURUM satırı (Founder 2026-07-09)
        renderOptions: { after: { contentText: "  " + n.kanallar.map((k) => k.emoji).join("") } },
        hoverMessage: new vscode.MarkdownString(
          n.kanallar.map((k) => `${k.emoji} **${k.param}:** ${k.deger}`).join("\n\n")),
      }));
    editor.setDecorations(doluSusu, dolular);
    davetAraliklar = noktalar
      .filter((n) => !n.kanallar.length)
      .map((n) => ({
        range: editor.document.lineAt(n.durumSatir).range,   // Adım başlığı değil, DURUM satırı (Founder 2026-07-09)
        hoverMessage: new vscode.MarkdownString(TAKDIR_METINLERI.bosDavetIpucu),
      }));
    davetBoya();
  };
  const susleGecikmeli = geciktir(susle);   // 350ms — tuş vuruşu başına tek hesap (EKL-F9-A07)

  // ── geribildirim lensi ─────────────────────────────────────────────────────
  const lensSaglayici: vscode.CodeLensProvider = {
    onDidChangeCodeLenses: degisti.event,
    provideCodeLenses(doc) {
      if (doc.languageId !== "sarmal" || doc.uri.scheme !== "file") return [];
      return noktalariTopla(doc).map((n) => new vscode.CodeLens(
        new vscode.Range(n.durumSatir, 0, n.durumSatir, 0),   // Adım üstü değil, DURUM satırı (Founder 2026-07-09)
        {
          title: TAKDIR_METINLERI.lensBasligi(!!n.kanallar.length, n.kanallar.map((k) => k.emoji).join(" ")),
          tooltip: TAKDIR_METINLERI.lensIpucu(n.kod),
          command: "sarmal.geribildirimYaz",
          arguments: [n],
        },
      ));
    },
  };

  // Lens tıklaması LİSTE akışına gider (0.9.75): VS Code 1.128 Comments arayüzünü
  // hiç çizmedi (onay kuyruğu saha bulgusuyla aynı) — kanal seçimi + not kutusu
  // her sürümde çalışan yapı taşlarıdır; editör-içi pencere (kutuAc) çizen
  // sürümlerde + işaretinden hâlâ açılabilir (bonus yüzey).
  const geribildirimYaz = async (n: GeribildirimNoktasi): Promise<void> => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;
    const kanal = await vscode.window.showQuickPick(
      takdirKanallari().map((k) => {
        const mevcut = n.kanallar.find((x) => x.param === k.param);
        return { label: `${k.emoji} ${k.ad}`, description: k.ipucu,
                 detail: mevcut?.deger ? TAKDIR_METINLERI.mevcutNot(mevcut.deger) : undefined, k };
      }),
      { placeHolder: TAKDIR_METINLERI.kanalSec(n.kod) });
    if (!kanal) return;
    const mevcut = n.kanallar.find((x) => x.param === kanal.k.param);
    const metin = (await vscode.window.showInputBox({
      prompt: TAKDIR_METINLERI.notIstemi(kanal.k.emoji, kanal.k.ad),
      value: mevcut?.deger ?? "",
      placeHolder: kanal.k.ipucu,
    }))?.trim();
    if (!metin) return;
    await kanalYaz(editor.document, n.satir, kanal.k.param, kanal.k.emoji, metin);
  };

  // ── 🌾 HASAT: tüm geribildirim → ogrenme/geribildirim.sar (STR-4 öğrenme bağı) ──
  const hasat = async (): Promise<void> => {
    const dosyalar = await vscode.workspace.findFiles(
      "**/*.sar", "**/{arsiv,node_modules,fikstur}/**");
    type Kayit = { kanal: string; emoji: string; kod: string; not: string; dosya: string };
    const kayitlar: Kayit[] = [];
    for (const uri of dosyalar) {
      if (uri.fsPath.endsWith("geribildirim.sar")) continue;   // kendi hasadını biçmez
      try {
        const doc = await vscode.workspace.openTextDocument(uri);
        for (const n of noktalariTopla(doc))
          for (const k of n.kanallar)
            kayitlar.push({ kanal: k.param, emoji: k.emoji, kod: n.kod, not: k.deger ?? "",
                            dosya: vscode.workspace.asRelativePath(uri) });
      } catch { /* ayrışamayan dosya hasada girmez */ }
    }
    if (!kayitlar.length) {
      vscode.window.showInformationMessage(TAKDIR_METINLERI.hasatBos);
      return;
    }
    const koklar = (vscode.workspace.workspaceFolders ?? []).map((k) => k.uri.fsPath);
    if (!koklar.length) return;
    // EKL-F6-A04: hasadın yazılacağı varlık kökü SABİT bir klasör adından değil,
    // `*_anadizin.sar` ilanından bulunur. Eski hâli `_Sarmal` adını kaynağa
    // yazıyordu; başka adla açılan bir depoda hasat var olmayan bir yola gidiyordu.
    const aktifYol = vscode.window.activeTextEditor?.document.uri.fsPath;
    const varlikKoku = yazimKokuBul(
      aktifYol ? dirname(aktifYol) : undefined, koklar, "ogrenme");
    if (!varlikKoku) return;
    const hedef = vscode.Uri.file(join(varlikKoku, "ogrenme", "geribildirim.sar"));
    const gun = new Date().toISOString().slice(0, 10);
    const gov = kayitlar.map((k, i) =>
      `Bellek( kod: GBK-${String(i + 1).padStart(3, "0")}, tür: kullanıcı,\n` +
      `        ne: "${k.emoji} [${k.kanal}] ${k.not.replace(/"/g, "'")} — hedef: ${k.kod} (${k.dosya})" )`
    ).join("\n\n");
    const icerik = `// ═══════════════════════════════════════════════════════════════════════════
// ogrenme/geribildirim.sar — 🌾 GERİBİLDİRİM HASADI (STR-4 · ÜRETİLEN dosya)
//
//   sarmal.geribildirimHasadi komutu yazar (son hasat: ${gun}) — elle
//   DÜZENLENMEZ, kaynak notlar Adım parametrelerinde yaşar. RAY-3 koşumu bu
//   kayıtları, adımı üstlenen etmenlerin İZOLE hafızalarına dağıtacak.
// ═══════════════════════════════════════════════════════════════════════════

${gov}
`;
    await vscode.workspace.fs.writeFile(hedef, Buffer.from(icerik, "utf8"));
    vscode.window.showInformationMessage(TAKDIR_METINLERI.hasat(kayitlar.length));
  };

  baglam.subscriptions.push(
    vscode.languages.registerCodeLensProvider("sarmal", lensSaglayici),
    vscode.commands.registerCommand("sarmal.geribildirimYaz", geribildirimYaz),
    vscode.commands.registerCommand("sarmal.takdirYaz", geribildirimYaz),   // eski ad yaşasın
    vscode.commands.registerCommand("sarmal.geribildirimHasadi", hasat),
    vscode.commands.registerCommand("sarmal.gonderTesekkur", gonderYap("teşekkür", "🙏")),
    vscode.commands.registerCommand("sarmal.gonderTakdir",   gonderYap("takdir", "❤️")),
    vscode.commands.registerCommand("sarmal.gonderOnur",     gonderYap("onur", "🏅")),
    vscode.commands.registerCommand("sarmal.gonderOneri",    gonderYap("öneri", "💡")),
    kutu,
    vscode.window.onDidChangeActiveTextEditor(susle),
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document === vscode.window.activeTextEditor?.document) susleGecikmeli.cagir();   // 350ms (EKL-F9-A07)
    }),
    davetKalbi, susleGecikmeli,
    { dispose: () => { for (const t of acikKutular.values()) t.dispose(); acikKutular.clear(); } },
    doluSusu, davetDolu, davetBos, degisti,
  );
  susle();
}

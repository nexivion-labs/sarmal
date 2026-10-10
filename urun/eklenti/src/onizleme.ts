// ═══════════════════════════════════════════════════════════════════════════
// onizleme.ts — .sar Okuma Modu = YERLİ CustomEditor (sekme YERİNDE tip değiştirir)
//
//   Yol ayrımı 3 (Founder 2026-07-03): sekme kapat/aç hilesi VS Code'un tab
//   modeliyle kavga etti (başka belgeler kapanıyor, çift sekme doğuyordu).
//   Doğru mekanizma: CustomReadonlyEditorProvider — VS Code'un kendi
//   "Reopen Editor With" altyapısı. `workbench.action.toggleEditorType`
//   AYNI SEKMEYİ yerinde kod↔okuma çevirir; diğer sekmelere DOKUNULMAZ,
//   her belge kendi sekmesinde bağımsız moda sahip.
//
//   MASA DÜZENİ (EKL-F6-A05 · Founder hükmü 2026-09-16): yüzeyin GÖVDESİ artık
//   bu dosyada değil, vscode tanımayan saf çekirdektedir (onizleme-cekirdek.ts).
//   Burada yalnız kabuk yaşar: belgeyi okur, kanon paletini çözer, simgeleri
//   gömer, atıf hedeflerini kimlik indeksinden sorar ve komut bağını kurar.
//   Ayrımın sebebi ölçümdür — nöbet yüzeyi ancak kabuksuz üretebildiğinde sayar.
//
//   Render: .sar → onizleme-cekirdek.masaSayfasi → webview (script'siz CSP;
//   yalnız kendi ürettiğimiz kaçışlı komut bağları için komut kapısı açıktır).
// ═══════════════════════════════════════════════════════════════════════════

import * as vscode from "vscode";
import { readFileSync } from "node:fs";
import { SozDizimHatasi } from "../../cekirdek/src/belirtec.ts";
import { kimlikIndeksi, INDEKS_DISI } from "../../cekirdek/src/kimlik.ts";
import { GOMULU_SNF, snfBul } from "./ortak.ts";
import { ONIZLEME_METINLERI } from "./yuzey-metinleri.ts";
// VIT-KIMLIK-A07: okuma modunun işaretleri de kilitli aileden; yapı ağacının
// plan kademeleri eksen rafından, öteki satırlar satır rafından çizilir.
import {
  satirSvgGovdesi, eksenSvgGovdesi, EKSEN_TIPLERI,
  type SatirSimgesi, type EksenTipi,
} from "./simge-cizelgesi.ts";
import {
  masaSayfasi, hataSayfasi, type AtifHedefi, type MasaGirdisi, type RenkPaleti,
} from "./onizleme-cekirdek.ts";

// Ağaç ve aile renklerinin TEK kaynağı sınıflama kanonudur (renkPaleti). Bu
// dosya 2026-09-02 tarihine kadar "kanon yokken devreye girer" notuyla elle
// yazılmış iki yedek harita taşıyordu; ölçüm ikisinin de hem kanondan sapmış
// (öz ailesinin rengi yedekte başkaydı) hem de ulaşılmaz olduğunu gösterdi,
// çünkü sınıflama çözücüsü kanon bulamadığında zaten gömülü kanona düşer ve o
// kanon paleti taşır. Sapmış ve ölü bir kopya YUZ-1.2'nin yasakladığı elle
// ikizdir; kaldırıldı ve tek yedek gömülü kanon bırakıldı (BKM-DNT-A07).

let stil = "";

/**
 * 🎨 VIT-KIMLIK-A07 — okuma modunun ARAYÜZ İŞARETLERİ. Okuma modu bir
 * webview'dir, yani ailenin FİZİKSEL olarak ulaştığı bir yüzeydir; buradaki
 * işaret bu yüzden emojiyle değil kilitli vektörel aileden çizilir (YUZ-4.2).
 * Kök yoksa (paket dışı koşum) işaret SESSİZCE düşer ve metinsel etiket tek
 * başına kalır — ikon zaten etiketi İKAME ETMEZ, yalnız yanında durur.
 */
let ikonKoku: vscode.Uri | undefined;
function ikonOku(goreliYol: string): string {
  return readFileSync(vscode.Uri.joinPath(ikonKoku!, ...goreliYol.split("/")).fsPath, "utf8");
}
function aileIsareti(ad: SatirSimgesi): string {
  if (!ikonKoku) return "";
  try { return satirSvgGovdesi(ad, ikonOku); } catch { return ""; }
}
function eksenIsareti(tip: EksenTipi): string {
  if (!ikonKoku) return "";
  try { return eksenSvgGovdesi(tip, ikonOku); } catch { return ""; }
}

/** Bir düğüm tipinin yapı ağacındaki işareti — plan kademesi kendi eksen
 *  simgesini, kural tanımı cetveli, geri kalanı tip yapbozunu taşır. */
function dugumSimgesi(tip: string): string {
  if ((EKSEN_TIPLERI as readonly string[]).includes(tip)) return eksenIsareti(tip as EksenTipi);
  if (tip === "kuralTanım") return aileIsareti("kural");
  if (tip === "dosya") return aileIsareti("dosya");
  return aileIsareti("tip");
}

/** Kaynağın bir satırını EDİTÖRDE açan komut bağı (Yol Haritası ile aynı kapı). */
function satirKomutu(dosya: string, satir: number): string {
  return `command:sarmal.dosyaAc?${encodeURIComponent(JSON.stringify([dosya, satir]))}`;
}

export function onizlemeKaydi(context: vscode.ExtensionContext): void {
  ikonKoku = context.extensionUri;
  try {
    stil = readFileSync(vscode.Uri.joinPath(context.extensionUri, "medya", "onizleme.css").fsPath, "utf8");
  } catch { stil = ""; }

  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider("sarmal.okuma", new OkumaSaglayici(), {
      webviewOptions: { retainContextWhenHidden: true },
      supportsMultipleEditorsPerDocument: false,
    }),
    // Kod → okuma ve okuma → kod: İKİSİ DE yerli tip-değişimi (aynı sekme).
    vscode.commands.registerCommand("sarmal.onizleme", () =>
      vscode.commands.executeCommand("workbench.action.toggleEditorType")),
    vscode.commands.registerCommand("sarmal.kaynagaDon", () =>
      vscode.commands.executeCommand("workbench.action.toggleEditorType")),
  );
}

class OkumaSaglayici implements vscode.CustomReadonlyEditorProvider {
  openCustomDocument(uri: vscode.Uri): vscode.CustomDocument {
    return { uri, dispose: () => { /* durum yok */ } };
  }

  async resolveCustomEditor(dokuman: vscode.CustomDocument, panel: vscode.WebviewPanel): Promise<void> {
    // Betik YOK; yalnız kendi ürettiğimiz kaçışlı komut bağları açıktır
    // (minigraf.ts ile aynı kapı) — ağaç satırı ve çapraz dosya atfı bundan geçer.
    panel.webview.options = { enableScripts: false, enableCommandUris: true };
    const doc = await vscode.workspace.openTextDocument(dokuman.uri);

    const yenile = (): void => { panel.webview.html = sayfaUret(doc); };

    // Yazdıkça canlı (300ms) — yalnız BU belge.
    let zamanlayici: ReturnType<typeof setTimeout> | undefined;
    const geciktirYenile = (): void => {
      if (zamanlayici) clearTimeout(zamanlayici);
      zamanlayici = setTimeout(yenile, 300);
    };
    const abone = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() !== dokuman.uri.toString()) return;
      geciktirYenile();
    });
    // 🩹 Bayat-önizleme tamiri (Founder bulgusu · 2026-08-10): editör DIŞINDAN
    // değişen dosya (ajan aracı, git, biçimlendirici) onDidChangeTextDocument
    // ateşlemez ve retainContextWhenHidden eski HTML'i saklar. İki kapak:
    // ① disk izleyicisi — dosya dışarıdan değişince taze çizim,
    // ② görünürlük — sekmeye geri dönüldüğünde taze çizim.
    const izleyici = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(
        vscode.Uri.joinPath(dokuman.uri, ".."),
        dokuman.uri.path.split("/").pop() ?? "*"));
    izleyici.onDidChange(geciktirYenile);
    izleyici.onDidCreate(geciktirYenile);
    const gorunurluk = panel.onDidChangeViewState((e) => {
      if (e.webviewPanel.visible) yenile();
    });
    panel.onDidDispose(() => { abone.dispose(); izleyici.dispose(); gorunurluk.dispose(); });

    yenile();
  }
}

/**
 * Bir KOD'un tanımına giden bağ. Hedef AYNI dosyadaysa kaynak bölmesindeki o
 * satırın çapasına gidilir ve okuyucu belgeden ayrılmadan atıflar arasında
 * gezinir; BAŞKA dosyadaysa o dosyanın o satırı editörde açılır. Tanımı
 * bulunmayan sözce undefined döner ve yüzeyde BAĞLANTI OLMAZ — kırık atıf
 * bağlantı gibi görünmez (baglanti-cekirdek.ts ile aynı dürüstlük kuralı).
 */
function atifCozucu(yol: string): (kod: string) => AtifHedefi | undefined {
  return (kod) => {
    // Evren dekorla AYNI süzgeçten okunur (atif-baglanti.ts deseni): süs ile
    // tıklama iki ayrı evrenden beslenirse süslü-ama-ölü sözce doğar.
    const tanimlar = kimlikIndeksi.tanimlar(kod, (d) => d === yol || !INDEKS_DISI.test(d));
    if (!tanimlar.length) return undefined;
    const ipucu = ONIZLEME_METINLERI.atifIpucu(kod);
    const burada = tanimlar.find((t) => t.dosya === yol);
    return burada
      ? { href: `#s-${burada.satir}`, ipucu }
      : { href: satirKomutu(tanimlar[0].dosya, tanimlar[0].satir), ipucu };
  };
}

function sayfaUret(doc: vscode.TextDocument): string {
  // Kaydedilmemiş değişiklik varsa editör metni gerçektir; yoksa DİSK gerçektir,
  // çünkü dışarıdan değişen dosyada TextDocument tazelenmemiş olabilir (2026-08-10).
  let metin: string;
  if (doc.isDirty) { metin = doc.getText(); }
  else { try { metin = readFileSync(doc.uri.fsPath, "utf8"); } catch { metin = doc.getText(); } }

  // Çözücü yalnız bozuk bir kayıt dosyasında tanımsız döner; o hâlde de yedek
  // elle yazılmış bir harita değil, paketle gelen gömülü kanondur.
  const snf = snfBul(doc) ?? GOMULU_SNF;
  const aileHaritasi = new Map<string, string>((snf.widgetTipleri ?? []).map((t) => [t.ad, t.aile]));
  const palet = ((snf as { renkPaleti?: RenkPaleti }).renkPaleti
    ?? (GOMULU_SNF as { renkPaleti?: RenkPaleti }).renkPaleti ?? {}) as RenkPaleti;

  const yol = doc.uri.scheme === "file" ? doc.uri.fsPath : "";
  // Kirli tampon tazeliği (gezinme.ts deseni): atıf sorulmadan önce bu belge
  // indekse yazılır ki kaydedilmemiş metindeki tanım da çözülsün.
  if (yol) kimlikIndeksi.dosyaGuncelle(yol, metin);

  const girdi: MasaGirdisi = {
    kaynak: metin,
    dosyaAdi: vscode.workspace.asRelativePath(doc.uri),
    palet,
    aile: (tipAd) => aileHaritasi.get(tipAd),
    simge: dugumSimgesi,
    agacSimgesi: aileIsareti("agac"),
    atifCoz: yol ? atifCozucu(yol) : () => undefined,
    satirBaglantisi: (satir) => (yol ? satirKomutu(yol, satir) : `#s-${satir}`),
    metinler: ONIZLEME_METINLERI,
    stil,
  };

  try {
    return masaSayfasi(girdi, ONIZLEME_METINLERI.htmlDili);
  } catch (e) {
    const uyari = aileIsareti("uyari");
    const govde = e instanceof SozDizimHatasi
      ? `<div class="sarmal-hata">${uyari}<b>${ONIZLEME_METINLERI.sozDizimBasligi}</b> (${e.satir}:${e.sutun}) — ${kacir(e.message)}<br><small>${ONIZLEME_METINLERI.duzelinceYenilenir}</small></div>`
      : `<div class="sarmal-hata">${uyari}${ONIZLEME_METINLERI.beklenmeyenHata}</div>`;
    return hataSayfasi(govde, { palet, stil }, ONIZLEME_METINLERI.htmlDili);
  }
}

/** Hata kutusuna giren çözücü iletisi için kaçış (CSP script'siz; salt metin). */
function kacir(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

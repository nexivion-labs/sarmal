// Sahte kardeş eklenti (VIT-K78-A10 sınama fikstürü). Gerçek bir kardeş eklentinin
// yapacağı şeyi yapar: açık eklentinin dış yüzünden bölüm yuvası arayüzünün birinci
// sürümünü alır, iki bölüm kaydeder ve kayıtları kendi `context.subscriptions`
// kümesine koyar. `kapat` işlevi eklentinin kapanışında VS Code'un yapacağını,
// yani kayıtların serbest bırakılmasını, sınamanın istediği anda yapar.
//
// Bütün kayıt çağrıları BU dosyadan yapılır: açık eklenti kaydın sahibini çağrı
// yığınından ölçtüğü için sahip bu fikstür olur. `dene` işlevi güvenlik
// sınamalarının reddedilmesi beklenen kayıtlarını da buradan dener.
"use strict";
const vscode = require("vscode");

exports.activate = async function activate(context) {
  const sarmal = vscode.extensions.getExtension("nexivion-labs.sarmal");
  const yuz = sarmal ? await sarmal.activate() : undefined;
  const yuva = yuz && typeof yuz.bolumYuvasiAl === "function" ? yuz.bolumYuvasiAl(1) : undefined;
  const cozulen = {};
  const simge = (ad) => vscode.Uri.joinPath(context.extensionUri, ad);
  const saglayici = (kimlik, baslik) => ({
    resolveWebviewView(gorunum) {
      cozulen[kimlik] = (cozulen[kimlik] || 0) + 1;
      gorunum.webview.html = "<!DOCTYPE html><html><body><h3>" + baslik + "</h3><p>Sahte kardeş bölümü.</p></body></html>";
    },
  });
  let kayitlar = [];
  const kur = () => {
    if (!yuva) return;
    kayitlar = [
      yuva.bolumKaydet({
        kimlik: "birinci",
        ad: "Birinci",
        ipucu: "Birinci sahte bölüm",
        simge: simge("simge-bir.svg"),
        saglayici: saglayici("birinci", "Birinci bölüm"),
      }),
      yuva.bolumKaydet({
        kimlik: "ikinci",
        ad: "İkinci",
        simge: { acik: simge("simge-iki-acik.svg"), koyu: simge("simge-iki-koyu.svg") },
        saglayici: saglayici("ikinci", "İkinci bölüm"),
      }),
    ];
    for (const k of kayitlar) context.subscriptions.push(k);
  };
  kur();
  // PNL-A13: Tren Canlı yuvası. Kayıt yalnız sınama isteyince yapılır (öteki süitler Tren'i yalın görür);
  // kayıt, güncelleme ve bırakma BU dosyadan yapılır, böylece yuva sahibi bu fikstür olarak ölçer.
  const trenYuvasi = yuz && typeof yuz.trenYuvasiAl === "function" ? yuz.trenYuvasiAl(1) : undefined;
  let canli;
  const canliEylemleri = [];
  const canliGorunurluk = [];
  return {
    trenYuvasiVar: trenYuvasi !== undefined,
    canliEylemleri,
    canliGorunurluk,
    /** Canlı görünüme gövde kaydeder; "kabul" ya da ret metni döner. */
    canliKur(html) {
      try {
        canli = trenYuvasi.canliKaydet({ html, eylem: (e) => canliEylemleri.push(e) });
        canli.gorunurlukDegisti((v) => canliGorunurluk.push(v));
        context.subscriptions.push(canli);
        return "kabul";
      } catch (e) { return String(e && e.message); }
    },
    canliGuncelle(html) { canli.guncelle(html); },
    canliGorunurMu() { return !!canli && canli.gorunurMu; },
    canliKapat() { if (canli) canli.dispose(); canli = undefined; },
    /** Reddedilmesi beklenen bir Canlı kaydını dener; hata metnini ya da "kabul" döner. */
    canliDene(html) {
      try { const d = trenYuvasi.canliKaydet({ html }); d.dispose(); return "kabul"; } catch (e) { return String(e && e.message); }
    },
    yuvaVar: yuva !== undefined,
    bolumSecVar: yuva !== undefined && "bolumSec" in yuva,
    cozulen,
    kur,
    kapat() { for (const k of kayitlar) k.dispose(); },
    /** Çözümde hata veren sağlayıcıyla bir bölüm kaydeder. */
    bozukKaydet() {
      context.subscriptions.push(yuva.bolumKaydet({
        kimlik: "bozuk",
        ad: "Bozuk",
        simge: simge("simge-bir.svg"),
        saglayici: { resolveWebviewView() { throw new Error("sahte kardeş: sağlayıcı çözülemedi"); } },
      }));
    },
    /** Reddedilmesi beklenen bir kaydı dener; hata metnini ya da "kabul" döner. */
    dene(kimlik, ad, simgeAdresi) {
      try {
        const d = yuva.bolumKaydet({
          kimlik, ad, simge: vscode.Uri.parse(simgeAdresi), saglayici: saglayici(kimlik, ad),
        });
        d.dispose();
        return "kabul";
      } catch (e) {
        return String(e && e.message);
      }
    },
  };
};

exports.deactivate = function deactivate() {};

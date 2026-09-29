// Sahte kardeş eklenti (VIT-K78-A10 sınama fikstürü). Gerçek bir kardeş eklentinin
// yapacağı şeyi yapar: açık eklentinin dış yüzünden bölüm yuvası arayüzünün birinci
// sürümünü alır, iki bölüm kaydeder ve kayıtları kendi `context.subscriptions`
// kümesine koyar. `kapat` işlevi eklentinin kapanışında VS Code'un yapacağını,
// yani kayıtların serbest bırakılmasını, sınamanın istediği anda yapar.
"use strict";
const vscode = require("vscode");

exports.activate = async function activate(context) {
  const sarmal = vscode.extensions.getExtension("nexivion-labs.sarmal");
  const yuz = sarmal ? await sarmal.activate() : undefined;
  const yuva = yuz && typeof yuz.bolumYuvasiAl === "function" ? yuz.bolumYuvasiAl(1) : undefined;
  const cozulen = {};
  const saglayici = (kimlik, baslik) => ({
    resolveWebviewView(gorunum) {
      cozulen[kimlik] = (cozulen[kimlik] || 0) + 1;
      gorunum.webview.html = "<!DOCTYPE html><html><body><h3>" + baslik + "</h3><p>Sahte kardeş bölümü.</p></body></html>";
    },
  });
  const kayitlar = [];
  if (yuva) {
    kayitlar.push(yuva.bolumKaydet({
      kimlik: "birinci",
      ad: "Birinci",
      ipucu: "Birinci sahte bölüm",
      simge: vscode.Uri.joinPath(context.extensionUri, "simge-bir.svg"),
      saglayici: saglayici("birinci", "Birinci bölüm"),
    }));
    kayitlar.push(yuva.bolumKaydet({
      kimlik: "ikinci",
      ad: "İkinci",
      simge: {
        acik: vscode.Uri.joinPath(context.extensionUri, "simge-iki-acik.svg"),
        koyu: vscode.Uri.joinPath(context.extensionUri, "simge-iki-koyu.svg"),
      },
      saglayici: saglayici("ikinci", "İkinci bölüm"),
    }));
    for (const k of kayitlar) context.subscriptions.push(k);
  }
  return {
    yuvaVar: yuva !== undefined,
    cozulen,
    kapat() { for (const k of kayitlar) k.dispose(); },
  };
};

exports.deactivate = function deactivate() {};

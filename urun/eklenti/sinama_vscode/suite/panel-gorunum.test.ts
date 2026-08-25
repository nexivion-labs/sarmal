// ═══════════════════════════════════════════════════════════════════════════
// panel-gorunum.test.ts — 🖼️ PANEL SATIRLARININ GERÇEK VS Code GÖRÜNÜŞÜ
//
//   Birim süiti saf metin katalogunu ve saf gruplamayı ölçebilir; ağaç
//   satırının GERÇEKTEN hangi simgeyi ve hangi tema rolünü taşıdığını
//   ölçemez, çünkü `vscode.ThemeIcon` ile `vscode.ThemeColor` yalnız gerçek
//   editör kabuğunda vardır. Founder'ın 2026-07-28 tarihli canlı gözden
//   geçirmesinde bulunan dört kusur tam olarak burada yaşıyordu: proje
//   satırları üç panelde aynı simgeyi taşıyordu, kayıtlar türlerine göre
//   hiçbir görsel ayrım taşımıyordu, bir kaydın etiketi ham dosya yolu olarak
//   basılıyordu ve grup başlıkları çıplak tanı kimliğiydi.
//
//   Nöbet sağlayıcıları GERÇEK yollarından koşturur: kayıtlar `yerlestir` ile
//   yerleşir, ağaç `getChildren` ile gezilir, satır `getTreeItem` ile üretilir.
//   Hiçbir satır elle kurulmaz.
// ═══════════════════════════════════════════════════════════════════════════

import * as assert from "node:assert";
import * as vscode from "vscode";
import { Hatirlaticilar } from "../../src/hatirlaticilar.ts";
import { Bildirimler } from "../../src/bildirimler.ts";
import type { YuzeyKaydi } from "../../src/yuzey-cekirdek.ts";

const PROJE = { kod: "SRM", ad: "Sarmal" };
const TAM_YOL = "/Users/biri/Belgeler/proje/_Sarmal/yasa/kararlar/dil_format.sar";

function kayit(kod: string, mesaj: string, dosya = "/p/plan/omurga.sar"): YuzeyKaydi {
  return {
    proje: PROJE,
    dosya,
    tani: {
      duzey: "bilgi", kod, mesaj, satir: 12, sutun: 3,
      oneri: `Yapıştır-düzelt: ${kod} için kanonik yazımı kullan.`,
    },
  };
}

/** ThemeIcon kimliğini okur (satır simgesi gerçekten kurulmuş mu). */
function simgeKimligi(item: vscode.TreeItem): string {
  const ikon = item.iconPath;
  assert.ok(ikon instanceof vscode.ThemeIcon, "satır ThemeIcon taşımıyor");
  return (ikon as vscode.ThemeIcon).id;
}

/** ThemeIcon'un tema rolünü okur (renk ham değer değil, rol adı olmalı). */
function temaRolu(item: vscode.TreeItem): string | undefined {
  const ikon = item.iconPath as vscode.ThemeIcon;
  const renk = ikon.color as vscode.ThemeColor | undefined;
  return renk ? (renk as unknown as { id: string }).id : undefined;
}

describe("Sarmal panel satırları — gerçek VS Code görünüşü", () => {
  it("üç panel bakışta ayrılır: proje satırı simgeleri birbirinden ve roketten farklıdır", () => {
    const htr = new Hatirlaticilar();
    const bld = new Bildirimler();
    htr.yerlestir([kayit("açık-hatırlatıcı", "Bu iş bilerek sonraya bırakıldı.")]);
    bld.yerlestir([kayit("şema-dışı-alan", "Bir alan şemada ilan edilmemiş.")]);

    const htrProje = htr.getTreeItem(htr.getChildren()[0]);
    const bldProje = bld.getTreeItem(bld.getChildren()[0]);
    const a = simgeKimligi(htrProje);
    const b = simgeKimligi(bldProje);

    assert.notStrictEqual(a, b,
      `Hatırlatıcılar ile Bildirimler aynı proje satırı simgesini kullanıyor: ${a}`);
    for (const s of [a, b]) {
      assert.notStrictEqual(s, "rocket",
        "panel Yol Haritasının roket simgesini kullanıyor; iki panel bakışta ayrılmaz");
    }
  });

  it("Bildirimler kayıtları türlerine göre ayrılır ve rengi TEMA ROLÜNDEN alır", () => {
    const bld = new Bildirimler();
    // İkisi de bilgi düzeyindedir; kanonun hedef düzeyleri farklıdır.
    bld.yerlestir([
      kayit("şema-dışı-alan", "Bir alan şemada ilan edilmemiş."),
      kayit("kural-sözleşmesi-eksik", "Bir kural üçlüsünü tamamlamıyor."),
    ]);
    const proje = bld.getChildren()[0];
    const gruplar = bld.getChildren(proje);
    assert.strictEqual(gruplar.length, 2, "iki ayrı kök iki grup satırı vermeliydi");

    const rozetler = new Set<string>();
    for (const grup of gruplar) {
      const kayitlar = bld.getChildren(grup);
      assert.strictEqual(kayitlar.length, 1, "her kayıt kendi grubunun altında yaşamalı");
      const item = bld.getTreeItem(kayitlar[0]);
      const rol = temaRolu(item);
      assert.ok(rol, "kayıt satırı tema rolü taşımıyor; renk kanondan okunmuyor");
      assert.ok(!/^#|\brgb\(/.test(rol!), `renk ham değer olarak gömülmüş: ${rol}`);
      rozetler.add(`${simgeKimligi(item)}|${rol}`);
    }
    assert.strictEqual(rozetler.size, 2,
      `iki ayrı doğa aynı rozetle basılıyor: ${[...rozetler].join(" · ")}`);
  });

  it("hiçbir kayıt etiketi ham dosya yolu değildir; tam yol yalnız ipucunda kalır", () => {
    const bld = new Bildirimler();
    bld.yerlestir([kayit("kanonik-kaynak-biçimi",
      `"${TAM_YOL}" dosyası kanonik hüküm metnini kaynak-gerçek gibi taşıyor.`, TAM_YOL)]);
    const proje = bld.getChildren()[0];
    const grup = bld.getChildren(proje)[0];
    const item = bld.getTreeItem(bld.getChildren(grup)[0]);
    const etiket = String(item.label);

    assert.ok(!etiket.includes("/Users/"), `etikete mutlak dosya yolu sızmış: ${etiket}`);
    assert.ok(etiket.includes("dil_format.sar"), "etiket dosya adını taşımalı");
    const ipucu = (item.tooltip as vscode.MarkdownString).value;
    assert.ok(ipucu.includes(TAM_YOL), "tam yol ipucunda kaybolmamalı");
  });

  it("grup başlığı çıplak tanı kimliği değildir; kimlik açıklamada durur", () => {
    const bld = new Bildirimler();
    bld.yerlestir([
      kayit("şema-dışı-alan", "Birinci bulgu."),
      kayit("şema-dışı-alan", "İkinci bulgu."),
    ]);
    const proje = bld.getChildren()[0];
    const grup = bld.getTreeItem(bld.getChildren(proje)[0]);
    const baslik = String(grup.label);

    assert.notStrictEqual(baslik, "şema-dışı-alan",
      "grup başlığı hâlâ çıplak tanı kimliği");
    assert.ok(baslik.split(" ").length > 2, `grup başlığı bir cümle değil: ${baslik}`);
    assert.ok(String(grup.description).includes("şema-dışı-alan"),
      "tanı kimliği açıklamadan da düşmüş; aranabilirlik kaybolur");
  });

  it("Bildirimler ağacının kademeleri tutarlı: TEK kayıtlık kök de grup satırı alır", () => {
    const bld = new Bildirimler();
    bld.yerlestir([
      kayit("şema-dışı-alan", "Birinci bulgu."),
      kayit("şema-dışı-alan", "İkinci bulgu."),
      kayit("düzyazı-koşul", "Tek başına duran bulgu."),
    ]);
    const proje = bld.getChildren()[0];
    const cocuklar = bld.getChildren(proje);
    assert.strictEqual(cocuklar.length, 2, "iki kök iki satır vermeliydi");
    for (const c of cocuklar) {
      const item = bld.getTreeItem(c);
      assert.strictEqual(item.collapsibleState, vscode.TreeItemCollapsibleState.Collapsed,
        `bir kayıt grup açılmadan basılmış: ${String(item.label)}`);
      assert.strictEqual(item.contextValue, "sarmalBildirimOzeti",
        "kademe tutarsız: bazı kayıtlar grubun içinde, bazıları yanında duruyor");
    }
  });
});

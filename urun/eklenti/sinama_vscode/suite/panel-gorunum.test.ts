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
//
//   AĞAÇ ÜÇ KADEMEDİR: Proje → Dosya → kayıt (VIT-GRAF-A13). Bu dosyanın üç
//   nöbeti, ara kademenin aynı-kök özeti olduğu eski düzene göre yazılmıştı ve
//   ara kademe dosya satırına döndüğünde güncellenmemişti; MGZ-A01 onları
//   bugünkü düzene, nöbetlerin korudukları sözleşme değişmeden çevirdi.
//
//   DİL BAĞI: bu paket üretim modüllerini kendi kopyası olarak içerir ve
//   eklentinin etkinleşmede kurduğu dil bağı bu kopyaya ulaşmaz. Bağ, üretimin
//   kullandığı aynı etkin dil kapısından (`dil.ts · etkinDil`) burada kurulur.
// ═══════════════════════════════════════════════════════════════════════════

import * as assert from "node:assert";
import * as fs from "node:fs";
import * as vscode from "vscode";
import { Hatirlaticilar } from "../../src/hatirlaticilar.ts";
import { Bildirimler } from "../../src/bildirimler.ts";
import { yuzeyDiliniAyarla } from "../../src/yuzey-metinleri.ts";
import { etkinDil } from "../../src/dil.ts";
import { eklentiCizelgesi } from "../../src/teknoloji-simgesi.ts";
import { varlikSimgesi } from "../../src/yolharitasi-cekirdek.ts";
import type { YuzeyKaydi } from "../../src/yuzey-cekirdek.ts";

const PROJE = { kod: "SRM", ad: "Sarmal" };
const TAM_YOL = "/Users/biri/Belgeler/proje/_Sarmal/yasa/kararlar/dil_format.sar";

function kayit(
  kod: string, mesaj: string, dosya = "/p/plan/omurga.sar",
  duzey: YuzeyKaydi["tani"]["duzey"] = "bilgi",
): YuzeyKaydi {
  return {
    proje: PROJE,
    dosya,
    tani: {
      duzey, kod, mesaj, satir: 12, sutun: 3,
      oneri: `Yapıştır-düzelt: ${kod} için kanonik yazımı kullan.`,
    },
  };
}

// ── 🎨 SATIR SİMGESİ OKUMASI (VIT-KIMLIK-A05) ───────────────────────────────
//   Satırlar artık codicon (`ThemeIcon`) taşımaz: geometrik ailenin üretilmiş
//   anlam×tema varyantı iki-tema Uri çifti olarak kurulur ve codicon kimliğine
//   geri düşüş yoktur. Bu dosyanın iki nöbeti ThemeIcon kimliği ile ThemeColor
//   rolünü okuyordu ve o geçişte güncellenmemişti (MGZ-A01 ölçümü). Okuma artık
//   varyant dosya adından yapılır: `satir-<simge>-<anlam>-<tema>.svg`. Simge
//   kimliği şekli, anlam rengi söyler; ham renk değeri adreste yaşayamaz.

const VARYANT = /\/satir-([a-z0-9]+(?:-[a-z0-9]+)*?)-([a-z]+)-(acik|koyu)\.svg$/;

/** Eklenti kökü — sağlayıcılar simgelerini üretimdeki gibi buradan çözer. */
function eklentiKoku(): vscode.Uri {
  const eklenti = vscode.extensions.getExtension("nexivion-labs.sarmal");
  assert.ok(eklenti, "eklenti yüklenmemiş");
  return eklenti!.extensionUri;
}

function varyant(item: vscode.TreeItem): { simge: string; anlam: string } {
  const ikon = item.iconPath as { light?: vscode.Uri; dark?: vscode.Uri } | undefined;
  assert.ok(ikon && ikon.light instanceof vscode.Uri && ikon.dark instanceof vscode.Uri,
    "satır iki-tema simge çifti taşımıyor");
  const acik = VARYANT.exec(ikon!.light!.path);
  const koyu = VARYANT.exec(ikon!.dark!.path);
  assert.ok(acik && koyu, `simge üretilmiş varyant değil: ${ikon!.light!.path}`);
  assert.strictEqual(acik![1], koyu![1], "iki tema farklı şekil taşıyor");
  assert.strictEqual(acik![2], koyu![2], "iki tema farklı anlam taşıyor");
  for (const u of [ikon!.light!, ikon!.dark!]) {
    assert.ok(fs.existsSync(u.fsPath), `simge varyantı diskte yok: ${u.fsPath}`);
  }
  return { simge: acik![1]!, anlam: acik![2]! };
}

/** Satır simgesinin şekil kimliği (satır simgesi gerçekten kurulmuş mu). */
function simgeKimligi(item: vscode.TreeItem): string {
  return varyant(item).simge;
}

/** Satır simgesinin anlam rengi (renk ham değer değil, anlam adı olmalı). */
function temaRolu(item: vscode.TreeItem): string | undefined {
  return varyant(item).anlam;
}

/** Sağlayıcıya üretimin bağladığı simge kaynağını bağlar (eklenti.ts kaydı ile aynı). */
function kur<T extends { simgeKaynaginiBagla(kok: vscode.Uri, cizelge: ReturnType<typeof eklentiCizelgesi>): void }>(
  saglayici: T,
): T {
  const eklenti = vscode.extensions.getExtension("nexivion-labs.sarmal")!;
  saglayici.simgeKaynaginiBagla(eklentiKoku(), eklentiCizelgesi(eklenti));
  return saglayici;
}

describe("Sarmal panel satırları — gerçek VS Code görünüşü", () => {
  before(() => { yuzeyDiliniAyarla(etkinDil()); });

  it("PNL-A25: Hatırlatıcılar ve Gözlemler'in Proje satırı Yol Haritasının Proje simgesini taşır; çatı simgesi Proje satırında görünmez", () => {
    // VIT-KIMLIK-A05'te ayrı görünümler bakışta ayrılsın diye her panel kendi proje simgesini taşıyordu. Paneller
    // tek kabın sekmeleri olunca Founder her Proje satırının Yol Haritasındaki Proje simgesini taşımasına hükmetti.
    const htr = kur(new Hatirlaticilar());
    const bld = kur(new Bildirimler());
    htr.yerlestir([kayit("açık-hatırlatıcı", "Bu iş bilerek sonraya bırakıldı.")]);
    bld.yerlestir([kayit("şema-dışı-alan", "Bir alan şemada ilan edilmemiş.")]);
    for (const s of [simgeKimligi(htr.getTreeItem(htr.getChildren()[0])), simgeKimligi(bld.getTreeItem(bld.getChildren()[0]))]) {
      assert.strictEqual(s, varlikSimgesi("Proje"), `Proje satırı Yol Haritasının Proje simgesini taşımıyor: ${s}`);
      assert.notStrictEqual(s, varlikSimgesi("ÇalışmaAlanı"), "Proje satırında çatı simgesi görünüyor");
    }
  });

  it("Bildirimler kayıtları türlerine göre ayrılır ve rengi TEMA ROLÜNDEN alır", () => {
    const bld = kur(new Bildirimler());
    // Rozetin türü motorun taşıdığı GERÇEK düzeydir (yol-dekor.ts · BILDIRIM_ROZET):
    // yüzey kanon hedefinden ikinci bir "aday" düzey çıkarmaz. Bu nöbet eskiden iki
    // bilgi kaydının kanon hedefleri farklı diye ayrı rozet almasını bekliyordu; o
    // kural sökülmüştür (MGZ-A01 ölçümü). Ayrı doğa artık ayrı düzeyle kurulur.
    bld.yerlestir([
      kayit("şema-dışı-alan", "Bir alan şemada ilan edilmemiş."),
      kayit("kural-sözleşmesi-eksik", "Bir kural üçlüsünü tamamlamıyor.",
        "/p/plan/omurga.sar", "uyarı"),
    ]);
    const proje = bld.getChildren()[0];
    const dosyalar = bld.getChildren(proje);
    assert.strictEqual(dosyalar.length, 1, "aynı dosyanın iki kaydı tek dosya satırı vermeliydi");
    const kayitlar = bld.getChildren(dosyalar[0]);
    assert.strictEqual(kayitlar.length, 2, "iki kayıt da dosya satırının altında yaşamalı");

    const rozetler = new Set<string>();
    for (const k of kayitlar) {
      const item = bld.getTreeItem(k);
      const rol = temaRolu(item);
      assert.ok(rol, "kayıt satırı anlam rengi taşımıyor; renk kanondan okunmuyor");
      assert.ok(!/^#|\brgb\(/.test(rol!), `renk ham değer olarak gömülmüş: ${rol}`);
      rozetler.add(`${simgeKimligi(item)}|${rol}`);
    }
    assert.strictEqual(rozetler.size, 2,
      `iki ayrı doğa aynı rozetle basılıyor: ${[...rozetler].join(" · ")}`);
  });

  it("hiçbir kayıt etiketi ham dosya yolu değildir; tam yol yalnız ipucunda kalır", () => {
    const bld = kur(new Bildirimler());
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

  it("ara kademe başlığı çıplak tanı kimliği değildir; kimlik kaydın ipucunda durur", () => {
    const bld = kur(new Bildirimler());
    bld.yerlestir([
      kayit("şema-dışı-alan", "Birinci bulgu."),
      kayit("şema-dışı-alan", "İkinci bulgu."),
    ]);
    const proje = bld.getChildren()[0];
    const dosyaOgesi = bld.getChildren(proje)[0];
    const dosya = bld.getTreeItem(dosyaOgesi);
    const baslik = String(dosya.label);

    assert.notStrictEqual(baslik, "şema-dışı-alan",
      "ara kademe başlığı hâlâ çıplak tanı kimliği");
    assert.strictEqual(baslik, "omurga.sar", `ara kademe başlığı dosya adı değil: ${baslik}`);
    for (const k of bld.getChildren(dosyaOgesi)) {
      const ipucu = (bld.getTreeItem(k).tooltip as vscode.MarkdownString).value;
      assert.ok(ipucu.includes("şema-dışı-alan"),
        "tanı kimliği kaydın ipucundan da düşmüş; aranabilirlik kaybolur");
    }
  });

  it("Bildirimler ağacının kademeleri tutarlı: TEK kayıtlık dosya da dosya satırı alır", () => {
    const bld = kur(new Bildirimler());
    bld.yerlestir([
      kayit("şema-dışı-alan", "Birinci bulgu."),
      kayit("şema-dışı-alan", "İkinci bulgu."),
      kayit("düzyazı-koşul", "Tek başına duran bulgu.", "/p/plan/tek.sar"),
    ]);
    const proje = bld.getChildren()[0];
    const cocuklar = bld.getChildren(proje);
    assert.strictEqual(cocuklar.length, 2, "iki dosya iki satır vermeliydi");
    for (const c of cocuklar) {
      const item = bld.getTreeItem(c);
      assert.strictEqual(item.collapsibleState, vscode.TreeItemCollapsibleState.Collapsed,
        `bir kayıt grup açılmadan basılmış: ${String(item.label)}`);
      assert.strictEqual(item.contextValue, "sarmalBildirimDosyasi",
        "kademe tutarsız: bazı kayıtlar grubun içinde, bazıları yanında duruyor");
    }
  });
});

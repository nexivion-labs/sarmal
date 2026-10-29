// ═══════════════════════════════════════════════════════════════════════════
// proje-simgesi.test.ts — 🚉 PROJE SATIRI YOL HARİTASININ PROJE SİMGESİNİ TAŞIR (PNL-A25)
//
//   Founder 2026-10-28: Sinyaller'in proje satırları çatı simgesiyle çiziliyordu.
//   Panelin bütün sekmelerinde Proje kimliğini taşıyan her satır Yol Haritasının
//   kullandığı Proje simgesini taşır; çatı simgesi yalnız çalışma alanının kendi
//   satırındadır. Simge tipin kaydından (`varlikSimgesi`) okunur.
//
//   Ölçüm, çatı biçimli örnek çalışma alanının (ogreti/ornek/calisma_alani) gerçek
//   ayrıştırılmış ağacı üzerinde yapılır: Yol Haritasının varlık satırlarının çizdiği
//   simge ile Sinyaller, Hatırlatıcılar, Fikirler ve Gözlemler panellerinin aynı
//   varlığın Proje satırına çizdiği simge karşılaştırılır.
// ═══════════════════════════════════════════════════════════════════════════

import "./dil-kur.ts";
import { Uri } from "./kabuk-kur.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { ayristir } from "../../cekirdek/src/ayristirici.ts";
import { belirtecle } from "../../cekirdek/src/belirtec.ts";
import type { Program } from "../../cekirdek/src/sozdizim.ts";
import type { YuzeyKaydi } from "../src/yuzey-cekirdek.ts";

const { YolHaritasi, projeKimligi } = await import("../src/yolharitasi.ts");
const { turGoruntusunuYayinla } = await import("../src/tur-goruntusu.ts");
const { SinyallerAgaci } = await import("../src/sinyaller.ts");
const { Hatirlaticilar } = await import("../src/hatirlaticilar.ts");
const { Fikirler } = await import("../src/fikirler.ts");
const { Bildirimler } = await import("../src/bildirimler.ts");
const { varlikSimgesi } = await import("../src/yolharitasi-cekirdek.ts");

const EKLENTI_KOKU = fileURLToPath(new URL("..", import.meta.url));
const CATI = fileURLToPath(new URL("../../../ogreti/ornek/calisma_alani", import.meta.url));
const kok = Uri.file(EKLENTI_KOKU);

function sarlar(dizin: string, out: string[] = []): string[] {
  for (const ad of readdirSync(dizin)) {
    const y = join(dizin, ad);
    if (statSync(y).isDirectory()) sarlar(y, out);
    else if (ad.endsWith(".sar")) out.push(y);
  }
  return out;
}

/** Simge yolunun satır çizelgesi adı: `satir-<ad>-<anlam>-acik.svg`. */
const simgeAdi = (item: { iconPath?: unknown }): string =>
  /satir-([a-z-]+?)-(?:duz|notr|bilgi|uyari|hata|basari|aktif|turuncu)-acik\.svg$/.exec(String((item.iconPath as { light?: { fsPath?: string } } | undefined)?.light?.fsPath ?? ""))?.[1] ?? "";

test("PNL-A25 · Sinyaller, Hatırlatıcılar, Fikirler ve Gözlemler'in her Proje satırı Yol Haritasının aynı varlığa çizdiği simgeyi taşır; çatı simgesi yalnız çalışma alanının kendi satırındadır", () => {
  const yollar = sarlar(CATI);
  const programlar = new Map<string, Program>(yollar.map((y) => [y, ayristir(belirtecle(readFileSync(y, "utf8")))]));
  const goruntu = { programlar, yollar, kirik: [], okunamayan: 0, dilDışı: [], tetik: "sinama", kapsam: undefined, belgeler: new Map() };
  turGoruntusunuYayinla(goruntu as never);
  const yol = new YolHaritasi();
  yol.eklentiKoku = kok as never;
  yol.yenile({ ...goruntu, sıra: 1 } as never);
  // Yol Haritasının varlık satırları: kod → çizilen simge (kapsanan projeler çatının çocuğudur).
  const raySimgesi = new Map<string, string>();
  const gez = (o?: unknown): void => {
    for (const c of yol.getChildren(o as never) as Array<{ tur: string; kod?: string }>) {
      if (c.tur !== "varlık") continue;
      raySimgesi.set(c.kod!, simgeAdi(yol.getTreeItem(c as never)));
      gez(c);
    }
  };
  gez();
  assert.ok(raySimgesi.size >= 5, `Yol Haritasında çatı ve dört proje bekleniyordu: ${[...raySimgesi.keys()].join(", ")}`);
  // Her varlığın kendi dosyasından bir kayıt: proje kimliği eklentinin kendi yolundan (tip dahil) gelir.
  const kayitlar: YuzeyKaydi[] = yollar.map((dosya) => ({
    proje: projeKimligi(dosya), dosya, tani: { kod: "örnek-bilgi", duzey: "bilgi", mesaj: "örnek", satir: 1, sutun: 1 },
  }) as YuzeyKaydi);
  const projeler = new Set(kayitlar.map((k) => k.proje.kod));
  assert.ok(projeler.size === raySimgesi.size, "her varlığın en az bir kaydı olmalı");

  const sinyaller = new SinyallerAgaci(kok as never);
  sinyaller.yerlestir(kayitlar, undefined);
  const hatirlaticilar = new Hatirlaticilar();
  hatirlaticilar.simgeKaynaginiBagla(kok as never, new Map());
  hatirlaticilar.yerlestir(kayitlar.map((k) => ({ ...k, tani: { ...k.tani, kod: "açık-hatırlatıcı" } })) as YuzeyKaydi[]);
  const bildirimler = new Bildirimler();
  bildirimler.simgeKaynaginiBagla(kok as never, new Map());
  bildirimler.yerlestir(kayitlar);
  const fikirler = new Fikirler();
  fikirler.simgeKaynaginiBagla(kok as never);
  fikirler.yerlestir(kayitlar.map((k) => ({ proje: k.proje, dosya: k.dosya, fikir: { kod: "FKR-X", ne: "örnek", satir: 1 } })) as never);

  type Satir = { proje: string; simge: string };
  const paneller: Record<string, Satir[]> = {
    Sinyaller: (sinyaller.getChildren((sinyaller.getChildren() as unknown[])[2]) as Array<{ grup: { proje: { kod: string } } }>)
      .map((o) => ({ proje: o.grup.proje.kod, simge: simgeAdi(sinyaller.getTreeItem(o)) })),
    Hatırlatıcılar: (hatirlaticilar.getChildren() as Array<{ kume: { proje: { kod: string } } }>)
      .map((o) => ({ proje: o.kume.proje.kod, simge: simgeAdi(hatirlaticilar.getTreeItem(o as never)) })),
    Gözlemler: (bildirimler.getChildren() as Array<{ kume: { proje: { kod: string } } }>)
      .map((o) => ({ proje: o.kume.proje.kod, simge: simgeAdi(bildirimler.getTreeItem(o as never)) })),
    Fikirler: (fikirler.getChildren() as Array<{ kume: { proje: { kod: string } } }>)
      .map((o) => ({ proje: o.kume.proje.kod, simge: simgeAdi(fikirler.getTreeItem(o as never)) })),
  };
  for (const [ad, satirlar] of Object.entries(paneller)) {
    assert.equal(satirlar.length, raySimgesi.size, `${ad}: her varlığın bir Proje satırı olmalı`);
    for (const s of satirlar) {
      assert.equal(s.simge, raySimgesi.get(s.proje), `${ad}: ${s.proje} satırının simgesi Yol Haritasındakinden farklı (${s.simge} · ${raySimgesi.get(s.proje)})`);
    }
    // Çatı simgesi yalnız çalışma alanının kendi satırındadır; Proje satırlarında hiç görünmez.
    const catiSatiri = satirlar.filter((s) => s.simge === varlikSimgesi("ÇalışmaAlanı")).map((s) => s.proje);
    assert.deepEqual(catiSatiri, ["CAL-ORNEK-CATI"], `${ad}: çatı simgesi çatının kendi satırı dışında görünüyor`);
  }
});

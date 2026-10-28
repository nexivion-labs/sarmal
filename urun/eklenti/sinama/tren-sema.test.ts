// ═══════════════════════════════════════════════════════════════════════════
// tren-sema.test.ts — 🪪 AJAN ŞEMASI VE PROFİL KARTI (PNL-A11 · OZK-13 DÖRDÜNCÜSÜ)
//
//   Ölçülenler: örgüt yalnız `yönetir` kenarından kurulur ve kayıtlı her ajan şemada
//   tam bir kez görünür; departman ilan edilmiş Raf ya da Kitaplığın metninden okunur;
//   kartın her satırının anahtarı kaynaktaki doğru satıra çözülür (ayrıştırıcıdan
//   bağımsız metin denetimiyle); görünüm ayarı varsayılana düşer; kaçırma tamdır.
//   Fikstürdeki bütün adlar uydurmadır.
// ═══════════════════════════════════════════════════════════════════════════

import "./dil-kur.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { belirtecle } from "../../cekirdek/src/belirtec.ts";
import { ayristir } from "../../cekirdek/src/ayristirici.ts";
import type { Program } from "../../cekirdek/src/sozdizim.ts";
import { trenOzetiCikar, ilanAdi } from "../src/tren-cekirdek.ts";
import {
  kartAnahtarlari, kartVerisi, trenGitKonumu, trenSemaGorunumNormalle, trenSemaHtml, trenSemasi, yonetimZinciri, TREN_SEMA_GORUNUMLERI,
} from "../src/tren-gorunum.ts";
import { TREN_BETIGI } from "../src/tren-betik.ts";

const DOSYALAR: Record<string, string> = {
  "/sahte/proje_anadizin.sar": `Proje( kod: PRJ-ORNEK, ad: "Örnek" ) {
  Kitaplık( kod: KTP-KADRO, yol: "kadro/", ne: "kadro kitaplığı" ) {
    Raf( kod: RAF-EKIP, yol: "ekip/", ne: "🧩 Ekip Departmanı — örnek açıklama",
      raflar: { alfa: "🤖 Alfa takımı — örnek ekip" } )
  }
  Raf( kod: RAF-DENETIM, yol: "denetim/", ne: "Denetim Gözleri — bağımsız gözler" )
}
`,
  "/sahte/kadro/ekip/alfa/alfa.sar": `Etmen( kod: ETM-DIR, ad: "alfa-direktor", tür: yönetici,
  uzmanlık: "yönetim",
  yetki: L4,
  bellek: paylaşık,
  ne: "direktör",
  uygular: ANY-ORNEK,
  yönetir: [ ETM-U1, ETM-U2, ETM-YOK ] ) {
  Kanca( kod: KNC-DIR, evre: önce, ne: "kanca" )
}
Etmen( kod: ETM-U1, ad: "uzman-bir", tür: uzman,
  uzmanlık: "birinci",
  yetki: L3,
  bellek: izole,
  ne: "uzman bir",
  sınır: "yalnız kendi dosyası",
  uygular: ANY-ORNEK ) {
  Beceri( kod: BCR-U1, ad: "beceri-bir", ne: "beceri" )
  Yetenek( kod: YTN-U1, ne: "yetenek" )
  Tetikleyici( kod: TRG-U1, ne: "tetikleyici" )
}
Etmen( kod: ETM-U2, ad: "uzman-iki <img src=x onerror=alert(1)>", tür: uzman,
  yetki: L3,
  bellek: izole,
  ne: "uzman iki",
  uygular: ANY-YOK )
`,
  "/sahte/denetim/goz.sar": `Etmen( kod: ETM-GOZ, ad: "goz", tür: uzman,
  yetki: L5,
  bellek: izole,
  ne: "denetçi",
  uygular: ANY-ORNEK )
`,
  "/sahte/lider.sar": `Anayasa( kod: ANY-ORNEK, ne: "örnek anayasa" )
Etmen( kod: ETM-APEX, ad: "lider", tür: apex, yetki: L4, bellek: paylaşık, ne: "lider", uygular: ANY-ORNEK,
  yönetir: [ ETM-DIR ] )
Etmen( kod: ETM-DONGU-A, tür: uzman, yetki: L3, bellek: izole, ne: "a", uygular: ANY-ORNEK, yönetir: ETM-DONGU-B )
Etmen( kod: ETM-DONGU-B, tür: uzman, yetki: L3, bellek: izole, ne: "b", uygular: ANY-ORNEK, yönetir: ETM-DONGU-A )
Etmen( kod: ETM-IKINCI-YON, tür: yönetici, yetki: L4, bellek: paylaşık, ne: "ikinci yönetici", uygular: ANY-ORNEK,
  yönetir: ETM-U1 )
`,
};
const programlar = (): Map<string, Program> => new Map(Object.entries(DOSYALAR).map(([d, m]) => [d, ayristir(belirtecle(m))]));
const satirMetni = (dosya: string, satir: number): string => DOSYALAR[dosya]!.split("\n")[satir - 1] ?? "";

test("PNL-A11 örgüt: yalnız yönetir kenarı, ilk yönetici kuralı, apex, döngü; her ajan şemada tam bir kez", () => {
  const o = trenOzetiCikar(programlar());
  const s = trenSemasi(o);
  assert.deepEqual(s.apexler.map((g) => g.etmen.kod), ["ETM-APEX"]);
  assert.equal(s.ust.get("ETM-DIR"), "ETM-APEX", "apex'in yönettiği direktör");
  assert.equal(s.ust.get("ETM-U1"), "ETM-DIR", "iki yöneticisi olan ajanda kaynak sırasındaki ilk yönetici geçerlidir");
  const grup = (kod: string) => s.departmanlar.flatMap((d) => d.gruplar).find((g) => g.etmen.kod === kod);
  assert.deepEqual(grup("ETM-DIR")?.astlar.map((g) => g.etmen.kod), ["ETM-U1", "ETM-U2"], "Etmen olmayan yönetir hedefi şemaya girmez");
  assert.equal(grup("ETM-DIR")?.yoneticisiz, false, "apex'in yönettiği ajan 'yöneticisi yok' değildir");
  assert.equal(grup("ETM-GOZ")?.yoneticisiz, true);
  assert.equal(grup("ETM-IKINCI-YON")?.yoneticisiz, true);
  assert.deepEqual(grup("ETM-DONGU-A")?.astlar.map((g) => g.etmen.kod), ["ETM-DONGU-B"], "döngüdeki ajanlar kaybolmaz ve bir kez görünür");
  assert.equal(s.sayac.yoneticisiz, 2);
  assert.deepEqual(s.departmanlar.map((d) => d.raf?.ad ?? "(rafsız)"), ["Ekip Departmanı", "Denetim Gözleri", "(rafsız)"],
    "departman adı ilan metninden, sıra ilanın kaynak sırasıdır");
  assert.equal(o.etmenler.find((e) => e.kod === "ETM-DIR")?.ekip?.ad, "Alfa takımı", "ekip adı kompakt raflar girdisinden");
  // Her ajan şemada tam bir kez (kutu ya da çip olarak).
  const html = trenSemaHtml(o).sema;
  for (const e of o.etmenler) {
    const n = (html.match(new RegExp(`class="(?:ajan|cip) [^"]*" data-kod="${e.kod}"`, "g")) ?? []).length;
    assert.equal(n, 1, `${e.kod} şemada ${n} kez`);
  }
  assert.deepEqual(yonetimZinciri(o.etmenler.find((e) => e.kod === "ETM-U1")!, s).map((e) => e.kod), ["ETM-APEX", "ETM-DIR"]);
  assert.equal(ilanAdi("", "🤖 Alfa takımı — örnek", "K"), "Alfa takımı");
  assert.equal(ilanAdi("Ad", "ne", "K"), "Ad");
  assert.equal(ilanAdi("", "", "K"), "K");
  // OZK-16: lider ajan ve denetim gözleri (L5) "Makinist'e bağlı" işaretini taşır; ötekiler taşımaz.
  const isaretli = [...html.matchAll(/data-kod="([A-Z0-9-]+)"(?:(?!<\/button>)[\s\S])*?Makinist&#39;e bağlı/g)].map((m) => m[1]).sort();
  assert.deepEqual(isaretli, ["ETM-APEX", "ETM-GOZ"]);
  const yuva = trenSemaHtml(trenOzetiCikar(new Map([["/sahte/a.sar", ayristir(belirtecle('Etmen( kod: ETM-TEK, tür: uzman, yetki: L3 )'))]]))).sema;
  assert.ok(/class="tr-apex-yuva">Lider ajan · tanımlı değil<span class="rz-m"/.test(yuva), "lider ajan koltuğu yokluğunu ve işaretini yazmalı");
});

test("PNL-A11 kart: her satırın anahtarı .sar kaynağındaki doğru satıra çözülür (bağımsız metin denetimi)", () => {
  const o = trenOzetiCikar(programlar());
  const BEKLENEN: Record<string, string> = {
    uzmanlik: "uzmanlık:", yetki: "yetki:", bellek: "bellek:", ne: "ne:", sinir: "sınır:", uygular: "uygular:", yonetir: "yönetir:",
  };
  let toplam = 0;
  for (const e of o.etmenler) {
    for (const anahtar of kartAnahtarlari(e)) {
      const k = trenGitKonumu(o, anahtar);
      assert.ok(k, `${anahtar} çözülmedi`);
      const m = satirMetni(k.dosya, k.satir);
      const [tur, , ek] = anahtar.split("|");
      const i = Number(ek);
      const hedef = tur === "u" ? e.uygular[i] : tur === "y" ? e.yonetir[i] : undefined;
      const beklenen = tur === "e" ? `kod: ${e.kod}`
        : tur === "a" ? BEKLENEN[ek!]!
          : tur === "c" ? `kod: ${e.altlar[i]!.kod}`
            : tur === "r" ? (ek === "d" ? `kod: ${e.departman!.kod}` : `${e.ekip!.kod}:`)
              : hedef?.dosya ? `kod: ${hedef.kod}` : (tur === "u" ? "uygular:" : "yönetir:");
      assert.ok(m.includes(beklenen), `${anahtar} → ${k.dosya}:${k.satir} "${m.trim()}" (beklenen "${beklenen}")`);
      toplam++;
    }
    // Kart her kenarın her hedefini ve ilan edilmiş her alanı satır olarak taşır (eksik satır gezinmeyi sessizce düşürür).
    const say = (on: string) => kartAnahtarlari(e).filter((a) => a.startsWith(on)).length;
    assert.deepEqual([say("u|"), say("y|"), say("c|"), say("a|") - (e.uygular.length && e.uygularSatir ? 1 : 0) - (e.yonetir.length && e.yonetirSatir ? 1 : 0)],
      [e.uygular.length, e.yonetir.length, e.altlar.length, Object.values(e.alanlar).filter(Boolean).length], `${e.kod}: kartın satırları eksik`);
  }
  assert.ok(toplam >= 30, `yalnız ${toplam} anahtar ölçüldü`);
  // Kart verisi kaynağın değerlerini taşır.
  const s = trenSemasi(o);
  const v = kartVerisi(o.etmenler.find((e) => e.kod === "ETM-U1")!, s);
  assert.deepEqual(v.f, [["uzmanlik", "birinci"], ["yetki", "L3"], ["bellek", "izole"], ["ne", "uzman bir"], ["sinir", "yalnız kendi dosyası"]]);
  assert.deepEqual(v.c.map((c) => c[1]), ["BCR-U1", "YTN-U1", "TRG-U1"]);
  assert.deepEqual([v.m, v.n, v.l, v.p], [["ETM-DIR", "alfa-direktor"], 0, "lider", [["ETM-APEX", "lider"], ["ETM-DIR", "alfa-direktor"]]]);
  assert.deepEqual(kartVerisi(o.etmenler.find((e) => e.kod === "ETM-U2")!, s).u, [["ANY-YOK", 0]], "çözülemeyen uygular hedefi işaretlenir");
  // Bozuk ya da yabancı anahtar hiçbir dosya açmaz.
  for (const kotu of ["x|ETM-U1", "a|ETM-U1|olmayan", "c|ETM-U1|99", "u|ETM-U1|abc", "e|YOK", "r|ETM-GOZ|k", 5, null, "e|".padEnd(500, "x")]) {
    assert.equal(trenGitKonumu(o, kotu), undefined, String(kotu));
  }
});

test("PNL-A11 görünüm ve kaçırma: ayar varsayılana düşer, kap niteliği taşır; ad ve veri HTML olarak yorumlanmaz", () => {
  assert.deepEqual([...TREN_SEMA_GORUNUMLERI], ["seritler"]);
  for (const v of [undefined, "", "sutunlar", 3, null]) assert.equal(trenSemaGorunumNormalle(v), "seritler");
  const h = trenSemaHtml(trenOzetiCikar(programlar()), trenSemaGorunumNormalle("bilinmeyen"));
  assert.ok(h.sema.includes('id="tren-sema" data-gorunum="seritler"'));
  assert.ok(!h.sema.includes("<img") && !h.profil.includes("<img"), "ajan adı HTML olarak basılmış");
  assert.ok(h.profil.includes("&lt;img"), "ajan adı kart verisinde kaçırılmış olmalı");
  // İstemci kartı yalnız textContent ile kurar: betikte innerHTML yalnız iplik SVG'sinde kullanılır.
  assert.deepEqual([...new Set([...TREN_BETIGI.matchAll(/(\w+)\.innerHTML\s*=/g)].map((m) => m[1]))], ["svg"]);
  assert.ok(!TREN_BETIGI.includes("acquireVsCodeApi"), "Tren betiği webview API'sini ikinci kez almaz");
});

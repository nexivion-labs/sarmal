// agac.test.ts — 🌳 Ağaç yüzü birim sınaması (YUZ-1.1 · ADM-AGAC-S1)
//   Fikstür .sar → beklenen ├──/└── çizimi. Köşe durumları: kardeş/son-kardeş,
//   derinlik, hizalama, `raflar:{}` kısayolu, kararlılık rozeti, --kod varyantı.

import { test } from "node:test";
import assert from "node:assert/strict";
import { agacYüz } from "../src/agac.ts";

test("düz kardeşler: ara ├──, son └──", () => {
  const kaynak = `Proje( kod: ANA, ad: "k", ne: "kök" ) {
    Raf( kod: A, yol: "a/", ne: "birinci" )
    Raf( kod: B, yol: "b/", ne: "ikinci" )
  }`;
  const cizim = agacYüz(kaynak, { kokAd: "k/" });
  const satırlar = cizim.trimEnd().split("\n");
  assert.equal(satırlar[0], "k/");
  assert.ok(satırlar[1].startsWith("├── a/"), satırlar[1]);
  assert.ok(satırlar[2].startsWith("└── b/"), satırlar[2]);
});

test("derinlik: alt-ağaç dikey │ ve boşluk önekleri doğru", () => {
  const kaynak = `Proje( kod: ANA, ad: "k", ne: "kök" ) {
    Kitaplık( kod: A, yol: "a/", ne: "üst" ) {
      Raf( kod: A1, yol: "a1/", ne: "iç" )
    }
    Raf( kod: B, yol: "b/", ne: "son" )
  }`;
  const s = agacYüz(kaynak, { kokAd: "k/" }).trimEnd().split("\n");
  // A ara-kardeş olduğu için çocuğu "│   " önekiyle iner
  assert.ok(s[2].startsWith("│   └── a1/"), s[2]);
  assert.ok(s[3].startsWith("└── b/"), s[3]);
});

test("hizalama: tüm '# yorum' aynı sütunda başlar", () => {
  const kaynak = `Proje( kod: ANA, ad: "k", ne: "kök" ) {
    Raf( kod: A, yol: "kisa/", ne: "bir" )
    Raf( kod: B, yol: "cok-daha-uzun-ad/", ne: "iki" )
  }`;
  const s = agacYüz(kaynak, { kokAd: "k/" }).trimEnd().split("\n").filter((l) => l.includes("#"));
  const sutunlar = s.map((l) => l.indexOf("#"));
  assert.equal(sutunlar[0], sutunlar[1], "yorum sütunları hizasız: " + sutunlar);
});

test("raflar:{} kısayolu yaprak çocuk olur", () => {
  const kaynak = `Proje( kod: ANA, ad: "k", ne: "kök" ) {
    Kitaplık( kod: C, yol: "c/", ne: "çekirdek", raflar: { src: "kaynak", test: "sınama" } )
  }`;
  const cizim = agacYüz(kaynak, { kokAd: "k/" });
  assert.ok(cizim.includes("├── src/"), "src/ yaprağı yok");
  assert.ok(cizim.includes("└── test/"), "test/ son-yaprağı yok");
  assert.ok(/src\/\s+# kaynak/.test(cizim), "raf yorumu bağlanmadı");
});

test("kararlılık:değişmez → [değişmez] rozeti", () => {
  const kaynak = `Proje( kod: ANA, ad: "k", ne: "kök" ) {
    Yasa( kod: GK, ne: "kural", kararlılık: değişmez )
  }`;
  assert.ok(agacYüz(kaynak, { kokAd: "k/" }).includes("[değişmez]"));
});

test("--kod varyantı: [KOD] etiketi eklenir, sadede eklenmez", () => {
  const kaynak = `Proje( kod: ANA, ad: "k", ne: "kök" ) {
    Raf( kod: RAF-X, yol: "x/", ne: "iks" )
  }`;
  assert.ok(agacYüz(kaynak, { kokAd: "k/", kod: true }).includes("[RAF-X]"));
  assert.ok(!agacYüz(kaynak, { kokAd: "k/" }).includes("[RAF-X]"));
});

test("alt-ağaç kökü: kokAd verilince kök satırı o ad olur (kapsam ①)", () => {
  const kaynak = `Kitaplık( kod: C, yol: "cekirdek/", ne: "motor" ) {
    Raf( kod: S, yol: "src/", ne: "kaynak" )
  }`;
  const s = agacYüz(kaynak, { kokAd: "cekirdek/" }).trimEnd().split("\n");
  assert.equal(s[0], "cekirdek/");
  assert.ok(s[1].startsWith("└── src/"), s[1]);
});

// ── ADM-AGAC-R1/S2: README oto-blok idempotenliği + elle bölge koruması ───────
import { agacBlokUygula, AGAC_BAS, AGAC_SON } from "../src/agac.ts";

test("S2 · agacBlokUygula: iki üretim bit-birebir aynı; işaret dışı README metni korunur", () => {
  const agac = "kok/\n├── a/  # bir\n└── b/  # iki";
  const elle = "# Benim projem\n\nElle yazılmış anlatı — KORUNMALI.\n";
  const bir = agacBlokUygula(elle, agac);
  const iki = agacBlokUygula(bir, agac);
  assert.equal(bir, iki, "idempotent: iki üretim farkı boş diff olmalı");
  assert.ok(iki.includes("Elle yazılmış anlatı — KORUNMALI."), "işaret dışı metin korunmalı");
  assert.ok(iki.includes(AGAC_BAS) && iki.includes(AGAC_SON), "işaretçiler yerinde");
  // kaynak değişti → yalnız blok değişir
  const uc = agacBlokUygula(iki, agac + "\n└── c/  # üç");
  assert.ok(uc.includes("Elle yazılmış anlatı — KORUNMALI.") && uc.includes("c/"));
});

// ── ADM-AGAC-L2: alt-ağaç kökü çözümü ─────────────────────────────────────────
test("L2 · agacYüz altKok: yalnız verilen düğümün ağacı; geçersiz KOD Türkçe hata", () => {
  const kaynak = `Proje( kod: PRJ-T, ad: "t", ne: "t" ) {
    Kitaplık( kod: KTP-A, yol: "a/", ne: "birinci" ) { Kitaplık( kod: KTP-A1, yol: "a1/", ne: "içteki" ) }
    Kitaplık( kod: KTP-B, yol: "b/", ne: "ikinci" )
  }`;
  const alt = agacYüz(kaynak, { altKok: "KTP-A" });
  assert.ok(alt.includes("a1/") && !alt.includes("b/"), "yalnız KTP-A alt-ağacı basılmalı:\n" + alt);
  assert.throws(() => agacYüz(kaynak, { altKok: "KTP-YOK" }), /kodlu düğüm bu kaynakta yok/);
});

// ── ADM-AGAC-E2 değişmezi: ağaç yüzü KAYNAK sırasını korur (outline ile tek kaynak) ──
test("E2 · agacUret düğüm sırası = kaynak sırası (outline aynı AST'den aynı sırayla okur)", () => {
  const kaynak = `Proje( kod: PRJ-S, ad: "s", ne: "s" ) {
    Kitaplık( kod: KTP-2, yol: "zeta/", ne: "önce yazıldı" )
    Kitaplık( kod: KTP-1, yol: "alfa/", ne: "sonra yazıldı" )
  }`;
  const cikti = agacYüz(kaynak);
  assert.ok(cikti.indexOf("zeta/") < cikti.indexOf("alfa/"),
    "sıra alfabetik DEĞİL kaynak sırası olmalı:\n" + cikti);
});

// ── HST-YUZ-A02 · ÇOK SATIRLI NE METNİ AĞAÇ ÇİZGİSİNİ KIRMAZ (HTR-AGAC-COK-SATIRLI-NE-KIRIYOR) ──
//   Ölçülen kusur (2026-09-16 · yeniden 2026-10-10): yorum yalnız ⏎ işaretini tek
//   satıra indiriyordu; gerçek satır sonu taşıyan ne metninin ikinci satırı sütun
//   sıfırdan başlıyor ve ağaç çizgisini kırıyordu. Depoda bir plan dosyasında yirmi
//   dört satır böyle kırılıyordu. Nöbet üç yüzü birlikte ölçer: çekirdek gövdesi,
//   README otomatik bloğu ve komut satırının ağaç çıktısı aynı gövdeden geçer.
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync as dosyaYaz, readFileSync as dosyaOku, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join as birlestir } from "node:path";
import { fileURLToPath } from "node:url";

const COK_SATIRLI = `Proje( kod: PRJ-CS, ad: "k", ne: "kök" ) {
    Raf( kod: RAF-A, yol: "a/", ne: """
      birinci satır
        girintili ikinci satır
      """ )
    Raf( kod: RAF-B, yol: "b/", ne: "üst\\nalt" )
    Raf( kod: RAF-D, yol: "d/", ne: "eski${"\r"}satır sonu" )
    Raf( kod: RAF-C, yol: "c/", ne: "tek satır ⏎ işaretli devam" )
  }`;

/** Kök satırından sonraki her satır bir dal önekiyle başlamalıdır; başlamayan satır çizgiyi kırar. */
function kirikSatirlar(cizim: string): string[] {
  return cizim.trimEnd().split("\n").slice(1).filter((s) => !/^(?:[│ ]{4})*(?:├── |└── )/.test(s));
}

test("HST-YUZ-A02: gerçek satır sonu taşıyan ne metni ağaçta tek satırda görünür", () => {
  const cizim = agacYüz(COK_SATIRLI, { kokAd: "k/" });
  assert.deepEqual(kirikSatirlar(cizim), [], "ağaç çizgisi kırıldı:\n" + cizim);
  const s = cizim.trimEnd().split("\n");
  assert.equal(s.length, 5, "her düğüm tek satır olmalı:\n" + cizim);
  assert.match(s[1], /^├── a\/ +# birinci satır girintili ikinci satır$/);
  assert.match(s[2], /^├── b\/ +# üst alt$/);
  assert.match(s[3], /^├── d\/ +# eski satır sonu$/, "tek başına CR de satır sonudur");
  // ⏎ işaretinin bugünkü davranışı korunur (regresyon).
  assert.match(s[4], /^└── c\/ +# tek satır işaretli devam$/);
});

test("HST-YUZ-A02: README otomatik bloğu ve komut satırının ağaç çıktısı aynı düzeltmeden yararlanır", () => {
  // README bloğu: agacBlokUygula çekirdeğin çizdiği ağacı aynen gömer.
  const blok = agacBlokUygula("", agacYüz(COK_SATIRLI, { kokAd: "k/" }));
  const icerik = blok.slice(blok.indexOf("```\n") + 4, blok.lastIndexOf("\n```"));
  assert.deepEqual(kirikSatirlar(icerik), [], "README bloğunda ağaç çizgisi kırıldı:\n" + icerik);

  // Komut satırı: `sarmal agac` ile `--readme` gerçek süreçte koşar.
  const SARMAL = fileURLToPath(new URL("../src/sarmal.ts", import.meta.url));
  const kok = mkdtempSync(birlestir(tmpdir(), "sarmal-agac-cs-"));
  try {
    const plan = birlestir(kok, "plan.sar");
    const readme = birlestir(kok, "README.md");
    dosyaYaz(plan, COK_SATIRLI + "\n", "utf8");
    const cli = execFileSync(process.execPath, [SARMAL, "agac", plan], { encoding: "utf8" });
    assert.deepEqual(kirikSatirlar(cli), [], "komut satırı ağacında çizgi kırıldı:\n" + cli);
    assert.equal(cli.trimEnd().split("\n").length, 5, "komut satırı ağacı düğüm başına tek satır basmalı:\n" + cli);
    assert.ok(!cli.includes("\r"), "komut satırı ağacında satır başına dönüş kalmamalı");
    execFileSync(process.execPath, [SARMAL, "agac", plan, "--readme", readme], { encoding: "utf8" });
    const md = dosyaOku(readme, "utf8");
    const mdBlok = md.slice(md.indexOf("```\n") + 4, md.lastIndexOf("\n```"));
    assert.deepEqual(kirikSatirlar(mdBlok), [], "üretilen README bloğunda çizgi kırıldı:\n" + mdBlok);
  } finally {
    rmSync(kok, { recursive: true, force: true });
  }
});

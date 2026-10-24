// ═══════════════════════════════════════════════════════════════════════════
// prizma-md.test.ts — 🔺 Prizmanın Markdown yüzü nöbetleri (KYN-KYN-A05)
//
//   ① DÖNÜŞÜM — bir plan fikstürünün MD yüzü başlık, tablo ve bağlantı taşır;
//      ham kaynak kod bloğuna sarılmaz (kabulün birinci maddesi).
//   ② ALTIN ÇIKTI — fikstürün yüzü aşağıdaki altın metinle bayt bayt aynıdır;
//      çıktıya zaman damgası, sıra kayması ya da ortam bilgisi sızarsa kırmızı.
//   ③ İDEMPOTENS (YUZ-1.3) — aynı kaynak iki AYRI süreçte (CLI `yansıt --md`)
//      bayt bayt aynı çıktıyı verir; canlı plan dosyası üstünde ölçülür.
//   ④ CANLI PLAN — Eylül Faz dosyasının yüzü başlık, tablo, bağlantı taşır ve
//      `sarmal` kod çiti ya da çıplak düğüm bildirimi içermez.
//   Sınır: süit canlı ağaca yazmaz; kaynak dosyalar yalnız okunur.
// ═══════════════════════════════════════════════════════════════════════════

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { prizmaMd } from "../src/prizma-md.ts";

const SARMAL = fileURLToPath(new URL("../src/sarmal.ts", import.meta.url));
const CANLI_PLAN = fileURLToPath(new URL("../../../is/plan/faz/5_eylul_lansman.sar", import.meta.url));
const KANON_YUZ = fileURLToPath(new URL("../../../yasa/kanon/yuz.sar", import.meta.url));

// Tarafsız plan fikstürü: Faz → Blok → Katman → AltKatman → iki Adım.
const FIKSTUR = `-->|
# Örnek Faz
Bu Faz, Markdown yüzünün **okunur** dönüşümünü sınamak için kurulmuş tarafsız bir fikstürdür.
|<--
Faz( kod: FAZ-ORNEK, ad: "Örnek Mevsim", hedefTarih: "2026-10-31", ne: "Sınama mevsimi" ) {
  Blok( kod: BLK-ORNEK, ad: "Örnek Blok", ne: "Yüz sınaması" ) {
    Katman( kod: ORN-K1, ad: "Yüz Katmanı", takım: TAKIM-ORNEK ) {
      AltKatman( kod: ORN-K1-AK1, ad: "Kodlama", departman: kodlama ) {
        /// Birinci Adımın belgesi: tablo hücresine \`|\` sızmaz.
        Adım( kod: ORN-A01, ad: "Dönüşümü Yazmak", durum: tamamlandı, öncelik: p1, bağımlı: [], referans: [ YUZ-1.2 ],
          ne: "Kaynak bir kod bloğuna sarılmaz; düğüm alanları başlık, tablo ve bağlantı olarak görünür ve belge blokları düz Markdown olarak akar." ) {
          görev: [ "Dönüşümü yaz.", "Nöbeti kur." ]
          kabul: [ "İki koşu aynı çıktıyı verir." ]
          sınır: "Kaynak biçimi değişmez | yüz türetilmiştir."
        }
        Adım( kod: ORN-A02, ad: "Tanıtım Yüzünde Göstermek", durum: beklemede, öncelik: p2, bağımlı: [ ORN-A01 ],
          ne: "Kısa ne." )
      }
    }
  }
}
`;

/** Ham kaynağın yüze sızdığını gösteren işaretler: `sarmal` çiti ya da çıplak düğüm bildirimi. */
const HAM_KAYNAK = /```sarmal|^\s*(Faz|Blok|Katman|AltKatman|Adım|Karar|Kural)\(\s*kod:/m;

// Altın çıktı: resmî üretici (`sarmal yansıt <fikstür> --md`) ile üretilmiştir; elle düzenlenmez.
const ALTIN = [
  "<a id=\"FAZ-ORNEK\"></a>",
  "",
  "# Faz · FAZ-ORNEK · Örnek Mevsim",
  "",
  "## Örnek Faz",
  "Bu Faz, Markdown yüzünün **okunur** dönüşümünü sınamak için kurulmuş tarafsız bir fikstürdür.",
  "",
  "| Alan | Değer |",
  "|---|---|",
  "| hedefTarih | 2026-10-31 |",
  "| ne | Sınama mevsimi |",
  "",
  "<a id=\"BLK-ORNEK\"></a>",
  "",
  "## Blok · BLK-ORNEK · Örnek Blok",
  "",
  "| Alan | Değer |",
  "|---|---|",
  "| ne | Yüz sınaması |",
  "",
  "<a id=\"ORN-K1\"></a>",
  "",
  "### Katman · ORN-K1 · Yüz Katmanı",
  "",
  "| Alan | Değer |",
  "|---|---|",
  "| takım | `TAKIM-ORNEK` |",
  "",
  "<a id=\"ORN-K1-AK1\"></a>",
  "",
  "#### AltKatman · ORN-K1-AK1 · Kodlama",
  "",
  "| Alan | Değer |",
  "|---|---|",
  "| departman | kodlama |",
  "",
  "| Kod | Tip | Ad | Durum |",
  "|---|---|---|---|",
  "| [ORN-A01](#ORN-A01) | Adım | Dönüşümü Yazmak | tamamlandı |",
  "| [ORN-A02](#ORN-A02) | Adım | Tanıtım Yüzünde Göstermek | beklemede |",
  "",
  "<a id=\"ORN-A01\"></a>",
  "",
  "##### Adım · ORN-A01 · Dönüşümü Yazmak",
  "",
  "Birinci Adımın belgesi: tablo hücresine `|` sızmaz.",
  "",
  "| Alan | Değer |",
  "|---|---|",
  "| durum | tamamlandı |",
  "| öncelik | p1 |",
  "| bağımlı | — |",
  "| referans | `YUZ-1.2` |",
  "| sınır | Kaynak biçimi değişmez \\| yüz türetilmiştir. |",
  "",
  "**Ne**",
  "",
  "Kaynak bir kod bloğuna sarılmaz; düğüm alanları başlık, tablo ve bağlantı olarak görünür ve belge blokları düz Markdown olarak akar.",
  "",
  "**Görev**",
  "",
  "- Dönüşümü yaz.",
  "- Nöbeti kur.",
  "",
  "**Kabul**",
  "",
  "- İki koşu aynı çıktıyı verir.",
  "",
  "<a id=\"ORN-A02\"></a>",
  "",
  "##### Adım · ORN-A02 · Tanıtım Yüzünde Göstermek",
  "",
  "| Alan | Değer |",
  "|---|---|",
  "| durum | beklemede |",
  "| öncelik | p2 |",
  "| bağımlı | [ORN-A01](#ORN-A01) |",
  "| ne | Kısa ne. |",
].join("\n") + "\n";

test("① dönüşüm: plan fikstürünün MD yüzü başlık, tablo ve bağlantı taşır; ham kaynak sarılmaz", () => {
  const md = prizmaMd(FIKSTUR);
  assert.match(md, /^# Faz · FAZ-ORNEK · Örnek Mevsim$/m, "kök düğüm başlık olmadı");
  assert.match(md, /^##### Adım · ORN-A01 · Dönüşümü Yazmak$/m, "Adım kademesine göre başlık olmadı");
  assert.match(md, /^\| Alan \| Değer \|$/m, "alan tablosu yok");
  assert.match(md, /^\| Kod \| Tip \| Ad \| Durum \|$/m, "çocuk dizini tablosu yok");
  assert.match(md, /\| bağımlı \| \[ORN-A01\]\(#ORN-A01\) \|/, "aynı dosyadaki bağımlı kimlik bağlantı olmadı");
  assert.match(md, /<a id="ORN-A01"><\/a>/, "bağlantı hedefi (çapa) yok");
  assert.match(md, /\| referans \| `YUZ-1\.2` \|/, "dosya dışı kimlik satır içi kod olmadı");
  assert.match(md, /^- Dönüşümü yaz\.$/m, "cümle listesi madde listesi olarak akmadı");
  assert.match(md, /Kaynak biçimi değişmez \\\| yüz/, "tablo hücresindeki | kaçırılmadı");
  assert.match(md, /^## Örnek Faz$/m, "belge bloğu düz Markdown olarak akmadı");
  assert.doesNotMatch(md, HAM_KAYNAK, "ham kaynak yüze sızdı");
});

test("② altın çıktı: fikstürün MD yüzü bayt bayt altın metindir", () => {
  assert.equal(prizmaMd(FIKSTUR), ALTIN);
});

test("③ idempotens: canlı plan iki ayrı süreçte bayt bayt aynı MD yüzünü verir (YUZ-1.3)", () => {
  const kos = (): Buffer => execFileSync(process.execPath, [SARMAL, "yansıt", CANLI_PLAN, "--md"], { encoding: "buffer", maxBuffer: 64 * 1024 * 1024 });
  const bir = kos();
  const iki = kos();
  assert.ok(bir.length > 0, "yüz boş döndü");
  assert.ok(bir.equals(iki), "iki koşu ayrı bayt dizisi üretti");
  assert.equal(bir.toString("utf8"), prizmaMd(readFileSync(CANLI_PLAN, "utf8")), "CLI ile çekirdek ayrıştı");
});

test("④ canlı plan ve kanon: başlık, tablo, bağlantı var; ham kaynak yok", () => {
  const plan = prizmaMd(readFileSync(CANLI_PLAN, "utf8"));
  assert.match(plan, /^#{1,6} Adım · /m, "Adım başlığı yok");
  assert.match(plan, /^\| Alan \| Değer \|$/m, "alan tablosu yok");
  assert.match(plan, /\]\(#[^)]+\)/, "iç bağlantı yok");
  assert.doesNotMatch(plan, HAM_KAYNAK, "ham kaynak yüze sızdı");

  const kanon = prizmaMd(readFileSync(KANON_YUZ, "utf8"));
  // Belge bloğu kendi başlığını taşıdığı için sentetik başlık basılmaz; başlık kök kademesine kayar.
  assert.match(kanon, /^## YUZ-1\.2 · Elle Yazılan İkiz Yasağı \[HATA\]$/m, "kanon maddesinin başlığı yok");
  assert.match(kanon, /\| dayanak \| \[YUZ-1\]\(#YUZ-1\) \|/, "dayanak bağlantı olmadı");
  assert.doesNotMatch(kanon, HAM_KAYNAK, "ham kaynak yüze sızdı");
});

// dil-denetimi-kapsami.test.ts — 🧹 Dil denetiminin kapsam nöbeti (BKM-KBK-A02).
//
//   Sözleşme: ESLint yalnız HATA sınıfı kuralları ve kullanılmayan kodu denetler;
//   biçim (girinti, tırnak, satır uzunluğu, noktalı virgül) Sarmal'ın kendi
//   biçimlendiricisinin işidir ve iki kapsam çakışmaz. Bu nöbet iki paketin
//   yapılandırmasını gerçekten yükler, etkin kural kümesini çıkarır ve orada tek
//   bir biçim kuralının bile açık olmadığını ölçer. Ayrıca çekirdek kuralların
//   (kullanılmayan kod, açık any) gerçekten açık olduğunu doğrular; aksi hâlde
//   yapılandırma sessizce boşalabilir ve süit yine yeşil kalırdı.

import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { BICIM_KURALLARI_YASAK } from "../../eslint.ortak.mjs";

type KuralDegeri = string | number | [string | number, ...unknown[]];
type Yapilandirma = { rules?: Record<string, KuralDegeri>; plugins?: Record<string, unknown> };

async function etkinKurallar(paket: "cekirdek" | "eklenti"): Promise<Map<string, KuralDegeri>> {
  const yol = fileURLToPath(new URL(`../../${paket}/eslint.config.mjs`, import.meta.url));
  const mod = (await import(yol)) as { default: Yapilandirma[] };
  const kurallar = new Map<string, KuralDegeri>();
  for (const parca of mod.default) for (const [ad, deger] of Object.entries(parca.rules ?? {})) kurallar.set(ad, deger);
  return kurallar;
}

const acik = (d: KuralDegeri | undefined): boolean => {
  const seviye = Array.isArray(d) ? d[0] : d;
  return seviye === "error" || seviye === "warn" || seviye === 1 || seviye === 2;
};

for (const paket of ["cekirdek", "eklenti"] as const) {
  test(`${paket}: dil denetimi biçim kuralı taşımaz — biçim Sarmal'ın biçimlendiricisinindir`, async () => {
    const kurallar = await etkinKurallar(paket);
    const bicim = [...kurallar.keys()].filter((ad) => {
      const kok = ad.includes("/") ? ad.slice(ad.lastIndexOf("/") + 1) : ad;
      return ad.startsWith("@stylistic") || BICIM_KURALLARI_YASAK.includes(kok);
    }).filter((ad) => acik(kurallar.get(ad)));
    assert.deepEqual(bicim, [], `${paket} dil denetimi biçim kuralı açmış: ${bicim.join(", ")} — iki biçimlendirici çakışır`);
  });

  test(`${paket}: çekirdek kurallar açık — kullanılmayan kod ve açık any hata sınıfıdır`, async () => {
    const kurallar = await etkinKurallar(paket);
    for (const ad of ["@typescript-eslint/no-unused-vars", "@typescript-eslint/no-explicit-any", "no-empty"]) {
      assert.ok(acik(kurallar.get(ad)), `${paket}: '${ad}' kuralı açık değil — yapılandırma sessizce boşalmış`);
    }
    assert.ok(kurallar.size >= 20, `${paket}: etkin kural sayısı ${kurallar.size}; önerilen küme yüklenmemiş görünüyor`);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// paket-icerigi.test.ts — 📦 paketlenecek dosya LİSTESİNİ ölçen nöbet
//
//   BULGUNUN DOĞUŞU. Bağımsız kapı denetçisi 2026-08-23 tarihinde depoda duran
//   sarmal-0.9.150.vsix dosyasının saat 06:28'de üretildiğini, buna karşılık
//   `.vscodeignore` dosyasının saat 07:51'de sıkılaştırıldığını ölçmüştür.
//   Aradaki fark yüzünden diskteki paket dört yüz kırk sekiz dosya taşımış ve
//   içinde kullanıcıya gitmemesi gereken beş kalem — eklentinin kendi plan
//   dosyası, üç derleme betiği ve gerçek yürütücü sınamasının tsconfig'i —
//   sessizce sızmıştır. O tarihte paketin TAZELİĞİNİ ölçen bir nöbet vardı,
//   fakat paketin İÇERİĞİNİ ölçen hiçbir nöbet yoktu; derlenmiş gövde güncel
//   olsa bile dışlama listesi gevşerse hiçbir sınama bunu yakalamıyordu.
//
//   BU NÖBETİN ÖLÇTÜĞÜ. `@vscode/vsce` paketinin `listFiles` API'si, güncel
//   `.vscodeignore` kurallarını uygulayarak VSIX'e girecek gerçek dosya
//   listesini üretir — ayrı bir paketleme süreci başlatmadan, disk üzerinde
//   .vsix yazmadan. Bu nöbet o listeyi alır ve üç deseni sınar: plan.sar kök
//   dosyası, arac/ derleme betikleri klasörü ve sinama_vscode/ gerçek
//   yürütücü sınama klasörü listede YOKTUR. Ayrıca listenin boş olmadığını ve
//   makul bir büyüklükte olduğunu ölçer; boş ya da güdük bir küme üstünde
//   koşan bir sınama sahte yeşil verir ve hiçbir şey ölçmemiş olur.
//
//   NÖBETİN DÜRÜSTLÜK SINIRI AÇIKÇA YAZILIR. Bu nöbet yalnız bu çalışma
//   ağacında, güncel `.vscodeignore` ile üretilecek dosya LİSTESİNİ ölçer.
//   Kullanıcının makinesine önceden kurulmuş bir kopyanın içeriğini bu nöbet
//   göremez; kurulu kopya, kurulduğu andaki dışlama listesinin donmuş bir
//   fotoğrafıdır ve bu nöbetin ölçüm alanının dışındadır. Aynı şekilde bu
//   nöbet bir dosyanın İÇİNDEKİ metni değil, yalnız hangi dosyaların pakete
//   GİRDİĞİNİ ölçer; paketlenen bir dosyanın içeriği bayatsa bunu yakalamaz.
// ═══════════════════════════════════════════════════════════════════════════
import { test } from "node:test";
import assert from "node:assert/strict";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { listFiles } from "@vscode/vsce";

const EKLENTI_KOKU = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));

/** Kullanıcıya gitmemesi gereken desenler; her biri gerekçesiyle birlikte. */
const YASAKLI_DESENLER: { ad: string; sinar: (yol: string) => boolean }[] = [
  {
    ad: "eklentinin kendi plan dosyası (plan.sar)",
    sinar: (yol) => yol === "plan.sar",
  },
  {
    ad: "derleme betikleri klasörü (arac/)",
    sinar: (yol) => yol === "arac" || yol.startsWith("arac/"),
  },
  {
    ad: "gerçek yürütücü sınama klasörü (sinama_vscode/)",
    sinar: (yol) => yol === "sinama_vscode" || yol.startsWith("sinama_vscode/"),
  },
];

// Liste modül yüklenirken BİR KEZ hesaplanır; her sınama aynı listeyi paylaşır
// — hem gereksiz yinelenen taramayı önler hem de tüm sınamaların aynı ölçümü
// gördüğünü garanti eder.
const PAKETLENECEK_LISTE: string[] = await listFiles({ cwd: EKLENTI_KOKU });

test("PKI: paketlenecek liste boş değildir ve makul büyüklüktedir", () => {
  assert.ok(
    PAKETLENECEK_LISTE.length > 50,
    `paketlenecek liste yalnız ${PAKETLENECEK_LISTE.length} dosya döndürdü; nöbet boş ya da ` +
      "güdük küme üstünde koşuyorsa hiçbir şeyi gerçekten ölçmemiş olur",
  );
});

for (const desen of YASAKLI_DESENLER) {
  test(`PKI: yasaklı desen pakette yok — ${desen.ad}`, () => {
    const sizanlar = PAKETLENECEK_LISTE.filter(desen.sinar);
    assert.deepEqual(
      sizanlar,
      [],
      `"${desen.ad}" deseni paketlenecek listede bulundu: ${sizanlar.join(", ")}\n` +
        "↳ .vscodeignore bu deseni artık dışlamıyor; kullanıcıya gitmemesi gereken bir " +
        "kalem sessizce pakete sızmış olabilir. .vscodeignore dosyasını denetle.",
    );
  });
}

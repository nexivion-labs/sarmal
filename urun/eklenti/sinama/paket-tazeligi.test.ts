// ═══════════════════════════════════════════════════════════════════════════
// paket-tazeligi.test.ts — 📦 TANI ÜÇLÜSÜNÜN DÖRDÜNCÜ KOPYASI
//
//   BULGUNUN DOĞUŞU. 2026-08-23 tarihinde Founder, Sorunlar panelinde iki hata
//   gördüğünü bildirdi: kanonun ORK-3.4 ve YUZ-3.4 maddeleri "bu hükmün motorda
//   karşılığı var" diye iddia ediyordu, buna karşılık eklenti bu iddiayı
//   doğrulayamadığını söylüyordu. Aynı denetim kaynaktan koşturulduğunda sonuç
//   sıfır hataydı. Çelişkinin sebebi ölçümle bulundu: kullanıcının makinesinde
//   koşan paketlenmiş gövde, iki kanon maddesinden ÖNCE derlenmişti ve kendi
//   taşıdığı tanı sicili eskiydi.
//
//   NEDEN HİÇBİR NÖBET YAKALAMADI. Tanı üçlüsü kuralı (sicil kaydı · üreten kod
//   · kanon maddesi) üç kopyayı iki yönde birbirine bağlar, ama üçünün de KAYNAK
//   ağacında yaşadığını varsayar. Oysa DÖRDÜNCÜ bir kopya vardır: paketlenmiş
//   eklenti gövdesi, üçlünün donmuş bir fotoğrafıdır. Fotoğraf sessizce
//   bayatlayabilir ve bayatladığında kullanıcı, kanonun kendisiyle çeliştiğini
//   sanır. Ürün ile kaynağın çeliştiği bir an, aracın bütün iddiasını zayıflatır.
//
//   BU NÖBETİN ÖLÇTÜĞÜ. Derlenmiş gövde varsa, motorun tanı sicilindeki HER
//   kimliğin gövdede de yaşadığı ölçülür; ayrıca gövdenin sicil kaynağından
//   daha eski olmadığı ölçülür. Birincisi eksik kimliği, ikincisi bayat
//   fotoğrafı yakalar.
//
//   NÖBETİN DÜRÜSTLÜK SINIRI AÇIKÇA YAZILIR. Bu nöbet, KULLANICININ makinesinde
//   kurulu olan sürümü ölçemez; depo, kendi dışına kurulmuş bir kopyayı göremez.
//   Ölçebildiği tek şey, bu çalışma ağacında derlenmiş gövdenin kaynakla
//   uyuşmasıdır. Kurulu kopyanın tazeliği yayın anının sorumluluğudur ve bu
//   sınır burada gizlenmez.
//
//   KAÇIŞ ÇÖZÜMÜ NEDEN ŞART. Derleyici, gövdeyi ASCII olarak yazar: Latin-1
//   aralığındaki harfleri `\xNN`, ötesindeki harfleri `\uXXXX` biçimine kaçırır.
//   Türkçe kimlikler bu yüzden gövdede ham hâlleriyle aranamaz; iki kaçış biçimi
//   de çözülmeden yapılan arama SAHTE bir eksiklik raporu üretir. Bu tuzağa bu
//   bulgunun araştırmasında bizzat düşüldü ve ders buraya yazıldı.
// ═══════════════════════════════════════════════════════════════════════════
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { taniSicili } from "../../cekirdek/src/tani-sicili.ts";

const yol = (u: string): string => fileURLToPath(new URL(u, import.meta.url));
const GOVDE_YOLU = yol("../dist/eklenti.js");
const SICIL_YOLU = yol("../../cekirdek/src/tani-sicili.ts");

/**
 * Derleyicinin ASCII kaçışlarını geri çözer. İki biçim de çözülür, çünkü
 * yalnız birini çözen bir arama Türkçe kimliklerin bir kısmını göremez ve
 * göremediği her kimliği "eksik" diye raporlar.
 */
function kacislariCoz(metin: string): string {
  return metin
    .replace(/\\u([0-9a-fA-F]{4})/g, (_m, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\x([0-9a-fA-F]{2})/g, (_m, h) => String.fromCharCode(parseInt(h, 16)));
}

/** Gövde bir yapı ürünüdür ve depoda izlenmez; yoksa nöbet sebebini söyleyerek atlar. */
const govdeVar = existsSync(GOVDE_YOLU);

// ── ① SİCİLDEKİ HER KİMLİK DERLENMİŞ GÖVDEDE DE YAŞAR ─────────────────────

test("PKT: motorun tanı sicilindeki her kimlik derlenmiş gövdede de bulunur", { skip: govdeVar ? false : "dist/eklenti.js henüz derlenmemiş — önce `npm run build` koşulur" }, () => {
  const govde = kacislariCoz(readFileSync(GOVDE_YOLU, "utf8"));
  const kimlikler = [...taniSicili()];
  assert.ok(kimlikler.length > 100,
    `sicil ${kimlikler.length} kimlik döndürdü; nöbet boş ya da güdük küme üstünde koşuyorsa hiçbir şey ölçmez`);
  const eksik = kimlikler.filter((k) => !govde.includes(k));
  assert.deepEqual(eksik, [],
    `derlenmiş gövde ${eksik.length} tanı kimliğini taşımıyor: ${eksik.join(", ")}\n` +
    "↳ Gövde kaynaktan eskidir; kanon bu kimlikleri iddia ederken ürün onları tanımaz ve " +
    "kullanıcı kanonun kendisiyle çeliştiğini sanır. `npm run build` ile gövdeyi tazele.");
});

// ── ② GÖVDE, SİCİL KAYNAĞINDAN ESKİ DEĞİLDİR ──────────────────────────────

test("PKT: derlenmiş gövde, tanı sicili kaynağından daha eski değildir", { skip: govdeVar ? false : "dist/eklenti.js henüz derlenmemiş — önce `npm run build` koşulur" }, () => {
  const govdeZaman = statSync(GOVDE_YOLU).mtimeMs;
  const sicilZaman = statSync(SICIL_YOLU).mtimeMs;
  assert.ok(govdeZaman >= sicilZaman,
    "derlenmiş gövde, tanı sicili kaynağından daha eski — üçlünün dördüncü kopyası bayatlamış.\n" +
    `↳ gövde: ${new Date(govdeZaman).toISOString()} · sicil: ${new Date(sicilZaman).toISOString()}\n` +
    "↳ Bu tam olarak 2026-08-23 bulgusunun şeklidir: kaynak yeşil, ürün kırmızı. `npm run build` koş.");
});

// ── ③ KAÇIŞ ÇÖZÜCÜSÜ GERÇEKTEN ÇALIŞIR (nöbetin kendi aleti sınanır) ──────

test("PKT: kaçış çözücüsü iki biçimi de çözer — yoksa nöbet sahte eksik raporlar", () => {
  assert.equal(kacislariCoz("\\xF6ncelik"), "öncelik",
    "Latin-1 kaçışı çözülmüyor — ö, ü, ç taşıyan kimlikler gövdede bulunamaz ve nöbet yalancı alarm verir");
  assert.equal(kacislariCoz("ate\\u015flemi\\u015f"), "ateşlemiş",
    "Unicode kaçışı çözülmüyor — ş, ı, ğ taşıyan kimlikler gövdede bulunamaz");
  assert.equal(kacislariCoz("\\xF6nceliksiz-ad\\u0131m"), "önceliksiz-adım",
    "iki biçim bir arada çözülmüyor — bulgunun araştırmasında düşülen tuzak tam buydu");
});

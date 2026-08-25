// ═══════════════════════════════════════════════════════════════════════════
// rbac.ts — Etmen yetki (RBAC) zorlaması (RAY-3 · Aşama 4 · D.1)
//
//   Bu zorlama, ŞEF runtime çalışmasının yetki kaleminden doğmuştur. O kalemin
//   plan kaydı bugün repo İÇİNDE, `arsiv/omurga-v0-plan-kapali/orkestrasyon/sef_plani.sar`
//   gövdesinde yaşar. Arşiv gövdesi CANLI bir `.sar` ilanı olmadığı için taşıdığı
//   Adım kodu motorun çözebileceği bir tanım vermez; bu yüzden köken burada kodla
//   değil anlatıyla anılır.
//
//   Sınıflamada duran yapısal Etmen kurallarını (kayit.json → semalar.Etmen.
//   yapisalKurallar · KRR-MUT-4 "beklemede-runtime") zorlar. GRAF ön-denetimi
//   (kayıt-anı · Etmen beyanları) dördünü tutar:
//     1. apex TEKİL                         → rbac-apex-tekil
//     2. tür:yönetici üretemez (üretir yok)  → rbac-yönetici-üretir
//     3. yetki:L5 + bellek:paylaşık = HATA   → rbac-l5-paylaşık (EBEDİ · izole zorunlu)
//     4. yetki:L6 kalıcı atanamaz            → rbac-l6-kalıcı
//   Beşinci şart olan "L5 YALNIZ denetim ailesine verilir" beyan anında
//   ZORLANAMAZ, çünkü Etmen ilanı bir rol alanı taşımaz ve motor L5 yazılmış bir
//   uzmanı denetçiden ayırt edemez; o şartı yalnız ÇAĞRI-anı gateway'i
//   (rbacÇağrıDenetle · döngü rol atarken) tutar. Ölçüm 2026-08-09'da yapıldı:
//   `tür: uzman · yetki: L5 · bellek: izole` beyan eden bir Etmen sıfır ihlal
//   döndürür. AÇIK BORÇ (V1B-RBAC-A01): sınıflama kaydı bu şartı hâlâ zorlanan
//   üç şartla aynı ✅ damgası altında topluyor ve o damga bu şart için fazla
//   iddialıdır; düzeltme kayit.json'a inmelidir, fakat o dosyanın değişmesi dört
//   ayrı türevi (bir öğretim belge yüzünü, bir mühür kaydını, bir tutarlılık
//   kaydını ve gömülü bir ikizi) birden bayatlattığı için ayrı bir Adımda
//   yapılacaktır.
//
//   GRAF kapısı iki yüzeyden okunur ve ikisi de AYNI saf üreticiyi (rbacGrafDenetle)
//   AYNI program kümesi üzerinde çağırır: ana denetim akışı (denetci.ts
//   `sefAkisiTanilari` → denetim.ts "iş bölümü" kapısı → `denetle` · `denetle-proje`)
//   ve ayrı `sarmal rbac <dizin>` alt komutu. Kümeyi tek bir yerde, aşağıdaki
//   `rbacKapsami` süzgeci tanımlar; iki yüzey de onu çağırır, çünkü kapsam kuralı
//   iki yerde yazıldığı sürece iki yüzeyin ayrışması an meselesidir. Ayrışma
//   2026-08-09 denetiminde ölçüldü: alt komut hiç süzmediği için `ornek/` altına
//   konan ihlalli bir kadroyu iki ihlal diye bildiriyor, ana akış ise sıfır
//   bildiriyordu. Bu YANLIŞ KIRMIZI, Adımın kapattığı yanlış yeşilin aynadaki
//   ikizidir: kullanıcı ders fikstürünü "onarmaya" kalkar ve kasıtlı dersi bozar.
//   Tek üretici, tek küme, iki yüzey — aynı ihlal iki kez sayılmaz; nöbeti
//   sinama/rbac.test.ts tutar. STR-3: bu mekanizma AÇIK; hangi Etmene hangi profil
//   atanır (seçim/routing) GİZLİ (E-grubu · _KapaliUrun). SAF çekirdek.
// ═══════════════════════════════════════════════════════════════════════════

import type { Program, Dugum } from "./sozdizim.ts";
import type { Tani } from "./tani.ts";
import { eskiTani } from "./tani-metinleri.ts";   // tanı cümlesi tek kaynakta yaşar (CDL-A02)
import { INDEKS_DISI } from "./kimlik.ts";   // OGR-5 ders-dünyası sınırı tek kaynaktan okunur
import { programVeMuaflar } from "./sef.ts";

export type Bellek = "izole" | "paylaşık";
/** ŞEF'in bir role atadığı Etmen yetki profili (GİZLİ ürün bunu hesaplar). */
export interface RolProfil { yetki: string; bellek: Bellek; }
export interface RbacIhlal { kural: string; mesaj: string; }

/** Kanonik rol→profil — FAIL-CLOSED varsayılan (rolProfil verilmezse bu; RBAC hep aktif).
 *  güvenlik (HALKA-GUV-A01): üçüncü rol — denetim AİLESİ (denetçiyle aynı yetki sınıfı:
 *  L5 · izole; üretim taşıyamaz, yargılar). */
export const VARSAYILAN_ROL_PROFIL: Record<string, RolProfil> = {
  "üretici": { yetki: "L3", bellek: "paylaşık" },
  "denetçi": { yetki: "L5", bellek: "izole" },
  "güvenlik": { yetki: "L5", bellek: "izole" },
};

// ── ÇAĞRI-anı gateway (saf) ─────────────────────────────────────────────────

/** Bir rol-atamasını yetki değişmezlerine vurur (çağrı yapılmadan ÖNCE). */
export function rbacÇağrıDenetle(rol: string, profil: RolProfil): RbacIhlal[] {
  const out: RbacIhlal[] = [];
  if (rol === "denetçi") {
    if (profil.yetki !== "L5") {
      out.push({ kural: "L5-denetçi", mesaj: `denetçi yetki L5 olmalı (geldi: ${profil.yetki}) — L5 yalnız denetçiye` });
    }
    if (profil.bellek !== "izole") {
      out.push({ kural: "denetçi-izole", mesaj: `denetçi bellek izole olmalı (geldi: ${profil.bellek}) — L5+paylaşık = HATA (EBEDİ)` });
    }
  } else if (rol === "güvenlik") {
    // HALKA-GUV-A01: güvenlik-denetçi de denetim ailesi — L5 · izole zorunlu.
    if (profil.yetki !== "L5") {
      out.push({ kural: "L5-güvenlik", mesaj: `güvenlik-denetçi yetki L5 olmalı (geldi: ${profil.yetki}) — denetim ailesi` });
    }
    if (profil.bellek !== "izole") {
      out.push({ kural: "güvenlik-izole", mesaj: `güvenlik-denetçi bellek izole olmalı (geldi: ${profil.bellek}) — denetim izole (EBEDİ)` });
    }
  } else if (rol === "üretici") {
    if (profil.yetki === "L5") {
      out.push({ kural: "L5-yalnız-denetçi", mesaj: "üretici L5 yetki alamaz — L5 denetim ailesine (denetçi·güvenlik) ayrılmış" });
    }
  }
  return out;
}

// ── GRAF ön-denetim (saf) ───────────────────────────────────────────────────

function alan(node: Dugum, ad: string): string | undefined {
  const p = node.parametreler.find((x) => x.ad === ad) ?? node.ozellikler.find((x) => x.ad === ad);
  return p?.deger.metin;
}
function alanVar(node: Dugum, ad: string): boolean {
  return node.parametreler.some((x) => x.ad === ad) || node.ozellikler.some((x) => x.ad === ad);
}

/**
 * RBAC'ın YARGILADIĞI program kümesi — kapsam kuralının TEK tanımı (saf).
 *
 * İki şey elenir ve ikisinin de gerekçesi kendi hükmündedir. Ders dünyası
 * (`INDEKS_DISI`: arsiv · ornek · fikstur · sablon …) OGR-5 gereği elenir, çünkü
 * o dosyalar kasıtlı olarak hatalıdır ve ürün bulgusu sayılmaları öğretim
 * malzemesini kusur diye gösterir. Muaf ("bilerek-hatalı") dosyalar elenir,
 * çünkü muafiyet o dosyanın tanılarının bilerek feragat edildiğinin ilanıdır ve
 * bir alt komutun feragati görmezden gelmesi kapanmış bir kararı yeniden açar.
 *
 * Bu süzgeç ayrı bir işlev olarak yaşar, çünkü iki yüzey (ana denetim akışı ile
 * `sarmal rbac` alt komutu) aynı kümeyi okumak ZORUNDADIR: Adımın kabul ölçütü
 * ikisinin bildirdiği sayının tutmasını ister ve kapsam kuralı iki yerde
 * kopyalandığı sürece o eşitlik yalnız bugünkü ağaç temiz olduğu için doğru
 * görünür. Süzgeci kopyalamak yerine çağırmak, eşitliği tesadüf olmaktan
 * çıkarıp yapısal hâle getirir.
 */
export function rbacKapsami(
  programlar: ReadonlyMap<string, Program>,
  muaflar?: ReadonlySet<string>,
): ReadonlyMap<string, Program> {
  return new Map(
    [...programlar].filter(([dosya]) => !muaflar?.has(dosya) && !INDEKS_DISI.test(dosya)),
  );
}

/** Bir program haritasındaki Etmen beyanlarını 4 yapısal RBAC kuralına vurur (saf).
 *  apex-tekil DOSYA (program) kapsamında sayılır — ilk dilim; çalışma-alanı-geneli sonra.
 *  KAPSAM: bu işlev kendisine VERİLEN kümeyi yargılar, süzmez — süzgeç `rbacKapsami`
 *  içinde tek yerde yaşar ve çağrı yerinde uygulanır. */
export function rbacGrafDenetle(programlar: ReadonlyMap<string, Program>): Array<{ dosya: string; tani: Tani }> {
  const out: Array<{ dosya: string; tani: Tani }> = [];
  for (const [dosya, program] of programlar) {
    const etmenler: Dugum[] = [];
    const gez = (n: Dugum): void => {
      if (n.tur === "widget" && n.ad === "Etmen") etmenler.push(n);
      for (const c of n.cocuklar) gez(c);
    };
    for (const b of program.bildirimler) gez(b);

    let apexSayısı = 0;
    for (const e of etmenler) {
      const kod = alan(e, "kod") ?? e.ad;
      const tür = alan(e, "tür");
      const yetki = alan(e, "yetki");
      const bellek = alan(e, "bellek");
      // MDR-A02 (CDL-A02 ile tazelendi): tanı kimliği kurucunun ilk argümanında
      // LİTERAL olarak yazılır — tanı-sicili nöbeti kaynak taramasını bu desenle
      // yapar; kimliği değişkene saklayan yardımcı biçim üç kodu hem sicilden
      // hem nöbetten kaçırıyordu (envanter bulgusu).
      const konum = { satir: e.satir, sutun: e.sutun };
      const ekle = (tani: Tani) => out.push({ dosya, tani });

      if (tür === "apex") apexSayısı++;
      if (tür === "yönetici" && alanVar(e, "üretir")) ekle(eskiTani("rbac-yönetici-üretir", "hata", { etmen: kod }, konum));
      if (yetki === "L5" && bellek === "paylaşık") ekle(eskiTani("rbac-l5-paylaşık", "hata", { etmen: kod }, konum));
      if (yetki === "L6") ekle(eskiTani("rbac-l6-kalıcı", "hata", { etmen: kod }, konum));
    }
    if (apexSayısı > 1) {
      out.push({ dosya, tani: eskiTani("rbac-apex-tekil", "hata", { sayı: apexSayısı }, { satir: 0, sutun: 0 }) });
    }
  }
  return out;
}

// ── ALT KOMUTUN SAF ÇEKİRDEĞİ ───────────────────────────────────────────────

/**
 * `sarmal rbac <dizin>` alt komutunun SAF çekirdeği — diski okur, kapsamı süzer
 * ve tanıları VERİ olarak döndürür; konsol ve süreç yan-etkisi yoktur.
 *
 * Çekirdek kabuktan ayrıldı, çünkü nöbetin ölçmesi gereken şey kabuğun bastığı
 * metin değil, alt komutun hangi kümeyi yargıladığıdır. Nöbet bu işlevi çağırır;
 * kabuk da bu işlevi çağırır. Sınama süzgeci KENDİ kopyasıyla kursaydı, birileri
 * kabuktan `rbacKapsami` çağrısını sökebilir ve nöbet yeşil kalırdı — ölçtüğü şey
 * üretim yolu değil kendi ikizi olurdu.
 */
export function rbacAltKomutTanilari(
  dizin: string,
): { programSayisi: number; tanilar: Array<{ dosya: string; tani: Tani }> } {
  const { programlar: hepsi, muaflar } = programVeMuaflar(dizin);
  const programlar = rbacKapsami(hepsi, muaflar);
  return { programSayisi: programlar.size, tanilar: rbacGrafDenetle(programlar) };
}

// ── ETKİLİ CLI KABUĞU ───────────────────────────────────────────────────────

/** `sarmal rbac <dizin>` — dizindeki Etmen kadrosunu RBAC kurallarına vurur.
 *  Kapsamı ana denetim akışıyla AYNI süzgeçten (rbacKapsami) alır; iki yüzeyin
 *  bildirdiği sayı bu yüzden koşuldan bağımsız olarak tutar. Bu kabuk yalnız
 *  sunum yapar; karar `rbacAltKomutTanilari` içindedir. */
export function sefRbacKomutu(dizin: string): number {
  const { programSayisi, tanilar } = rbacAltKomutTanilari(dizin);
  if (tanilar.length === 0) {
    console.log(`✅ RBAC temiz — Etmen kadrosu yetki kurallarına uygun (${programSayisi} .sar).`);
    return 0;
  }
  console.log(`✖ RBAC — ${tanilar.length} ihlal (${programSayisi} .sar):`);
  for (const { dosya, tani } of tanilar) console.log(`   • [${tani.kod}] ${dosya}: ${tani.mesaj}`);
  return 4;
}

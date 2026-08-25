// ═══════════════════════════════════════════════════════════════════════════
// gateway.ts — Etmen↔araç izin kapısı (RAY-3 · Aşama 4 · Gateway-RAY)
//
//   Bu kapı, ŞEF runtime çalışmasının araç köprüsü kaleminden doğmuştur. O kalemin
//   plan kaydı bugün repo İÇİNDE, `arsiv/omurga-v0-plan-kapali/orkestrasyon/sef_plani.sar`
//   gövdesinde yaşar. Arşiv gövdesi CANLI bir `.sar` ilanı olmadığı için taşıdığı
//   Adım kodu motorun çözebileceği bir tanım vermez; bu yüzden köken burada kodla
//   değil anlatıyla anılır.
//
//   Bir Etmen bir aracı (MCP/Araç) çağırmadan ÖNCE gateway iki-koşullu kapıdan
//   geçirir (AND):
//     ① BEYAN (least-privilege · AÇIK): araç+mod Etmen'in mcpİzinleri BEYANINDA yok
//        → RED. Yazılmayan araç YASAKTIR (deny-by-default).
//     ② MATRİS (gerçek atama · fail-closed): izin-matrisi (etmen×araç×mod) İZİN
//        vermiyorsa → RED. Matris VERİLMEZSE boş = HER ŞEY RED (asla fail-open).
//
//   ⚖️ STR-3.1 KESİM TESTİ: bu MEKANİZMA (mod enum · O(1) lookup · eksik=RED · fail-closed)
//   AÇIK'tır. Matris HÜCRELERİ (kim gerçekte ne alır) + sayısal eşik (bütçe/hız/risk) +
//   routing = GİZLİ ürün → matris ENJEKTE edilir (rbac.ts VARSAYILAN_ROL_PROFIL deseni;
//   GİZLİ politika _KapaliUrun'ta doldurur). SAF çekirdek — dosya yazmaz, çağrı yapmaz.
// ═══════════════════════════════════════════════════════════════════════════

import type { Program, Dugum, Deger } from "./sozdizim.ts";
import type { Tani } from "./tani.ts";
import { eskiTani } from "./tani-metinleri.ts";   // tanı cümlesi tek kaynakta yaşar (CDL-A02)
import { programHaritasi } from "./sef.ts";

// ── Tipler ───────────────────────────────────────────────────────────────────

export type Mod = "oku" | "yaz" | "çağır";
export const MODLAR: readonly Mod[] = ["oku", "yaz", "çağır"];

/** Etmen'in `mcpİzinleri`nde beyan ettiği bir araç-izni (least-privilege birimi). */
export interface İzinBeyan { araç: string; mod: Mod; }

/** İzin kapısının çok-değerli sonucu (SZL-ARAÇ-SONUÇ.durum'a beslenir). */
export interface İzinKararı { izinli: boolean; sebep: string; }

/** Gerçek izin ataması: etmen → araç → izinli modlar. İSKELET AÇIK; hücreler GİZLİ enjekte. */
export type İzinMatrisi = ReadonlyMap<string, ReadonlyMap<string, ReadonlySet<Mod>>>;

/** FAIL-CLOSED varsayılan: boş matris = her araç RED (GİZLİ ürün doldurmazsa erişim yok). */
export const BOŞ_MATRIS: İzinMatrisi = new Map();

// ── SAF ÇEKİRDEK ────────────────────────────────────────────────────────────

/** `mcpİzinleri` ham string-listesini ("MCP-KOD:mod") İzinBeyan çiftlerine çözer (saf).
 *  Biçimsiz/geçersiz-mod girdiler ATLANIR — biçim tanısı gatewayGrafDenetle'de raporlanır. */
export function beyanÇöz(ham: readonly string[]): İzinBeyan[] {
  const out: İzinBeyan[] = [];
  for (const g of ham) {
    const i = g.lastIndexOf(":");
    if (i <= 0) continue;                                   // "ARAÇ:mod" değil
    const araç = g.slice(0, i).trim();
    const mod = g.slice(i + 1).trim();
    if (araç && (MODLAR as readonly string[]).includes(mod)) out.push({ araç, mod: mod as Mod });
  }
  return out;
}

/**
 * İki-koşullu araç-izin kapısı (saf · fail-closed).
 * ① least-privilege beyan (araç+mod beyanlarda YOK → RED) ∧
 * ② izin-matrisi (etmen×araç×mod İZİN yok → RED; matris verilmezse boş = RED).
 */
export function araçİzinDenetle(
  etmen: string,
  araç: string,
  mod: Mod,
  beyanlar: readonly İzinBeyan[],
  matris: İzinMatrisi = BOŞ_MATRIS,
): İzinKararı {
  // ① BEYAN — Etmen bu aracı+modu istediğini deklare etmiş mi? (yazılmayan yasak)
  if (!beyanlar.some((b) => b.araç === araç && b.mod === mod)) {
    return { izinli: false, sebep: `least-privilege: '${etmen}' aracı '${araç}:${mod}' beyan etmemiş (yazılmayan yasak)` };
  }
  // ② MATRİS — GİZLİ atama bu erişime izin veriyor mu? (fail-closed lookup)
  const izinliModlar = matris.get(etmen)?.get(araç);
  if (!izinliModlar || !izinliModlar.has(mod)) {
    return { izinli: false, sebep: `izin-matrisi: '${etmen}' → '${araç}:${mod}' atanmamış (fail-closed — eksik=RED)` };
  }
  return { izinli: true, sebep: `beyan ∧ matris: '${etmen}' → '${araç}:${mod}' izinli` };
}

// ── GRAF ön-denetim (saf) ───────────────────────────────────────────────────

function alanDeğeri(node: Dugum, ad: string): Dugum["parametreler"][number] | undefined {
  return node.parametreler.find((x) => x.ad === ad) ?? node.ozellikler.find((x) => x.ad === ad);
}

/** Bir Değer'deki KOD/metin token'larını düzleştirir (liste içi dahil, saf). */
function kodlariCikar(d: Deger): string[] {
  if (d.tur === "liste") return (d.ogeler ?? []).flatMap(kodlariCikar);
  if (d.tur === "kod" || d.tur === "metin") return d.metin ? [d.metin] : [];
  return [];
}

/** Program haritasındaki tanımlı MCP/Araç KOD'larını toplar (tanımsız-araç denetimi için, saf). */
function tanımlıAraçlar(programlar: ReadonlyMap<string, Program>): Set<string> {
  const set = new Set<string>();
  const gez = (n: Dugum): void => {
    if (n.tur === "widget" && (n.ad === "MCP" || n.ad === "Araç")) {
      const kod = alanDeğeri(n, "kod")?.deger.metin;
      if (kod) set.add(kod);
    }
    for (const c of n.cocuklar) gez(c);
  };
  for (const p of programlar.values()) for (const b of p.bildirimler) gez(b);
  return set;
}

/**
 * Etmen `mcpİzinleri` beyanlarını tarar (saf): biçim geçerli mi ("ARAÇ:mod"),
 * mod geçerli enum mu, atıf edilen araç tanımlı mı. Kayıt-anı ön-denetim (rbacGrafDenetle deseni).
 */
export function gatewayGrafDenetle(programlar: ReadonlyMap<string, Program>): Array<{ dosya: string; tani: Tani }> {
  const out: Array<{ dosya: string; tani: Tani }> = [];
  const araçlar = tanımlıAraçlar(programlar);
  for (const [dosya, program] of programlar) {
    const gez = (n: Dugum): void => {
      if (n.tur === "widget" && n.ad === "Etmen") {
        const izinP = alanDeğeri(n, "mcpİzinleri");
        const etmenKod = alanDeğeri(n, "kod")?.deger.metin ?? n.ad;
        if (izinP) {
          for (const ham of kodlariCikar(izinP.deger)) {
            const i = ham.lastIndexOf(":");
            const araç = i > 0 ? ham.slice(0, i).trim() : "";
            const mod = i > 0 ? ham.slice(i + 1).trim() : "";
            const ekle = (kusur: string) =>
              out.push({ dosya, tani: eskiTani("gateway-izin-biçim", "hata",
                { etmen: etmenKod, kusur, ham, mod, araç }, { satir: n.satir, sutun: n.sutun }) });
            if (i <= 0 || !araç) { ekle("biçim"); continue; }
            if (!(MODLAR as readonly string[]).includes(mod)) { ekle("mod"); continue; }
            if (!araçlar.has(araç)) ekle("araç");
          }
        }
      }
      for (const c of n.cocuklar) gez(c);
    };
    for (const b of program.bildirimler) gez(b);
  }
  return out;
}

// ── ETKİLİ CLI KABUĞU ───────────────────────────────────────────────────────

/** `sarmal gateway <dizin>` — Etmen kadrosunun mcpİzinleri beyanlarını denetler. */
export function sefGatewayKomutu(dizin: string): number {
  const programlar = programHaritasi(dizin);
  const tanilar = gatewayGrafDenetle(programlar);
  if (tanilar.length === 0) {
    console.log(`✅ Gateway temiz — Etmen mcpİzinleri beyanları geçerli (${programlar.size} .sar).`);
    return 0;
  }
  console.log(`✖ Gateway — ${tanilar.length} izin-beyan ihlali (${programlar.size} .sar):`);
  for (const { dosya, tani } of tanilar) console.log(`   • [${tani.kod}] ${dosya}: ${tani.mesaj}`);
  return 4;
}

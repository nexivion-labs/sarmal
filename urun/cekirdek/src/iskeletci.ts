// ═══════════════════════════════════════════════════════════════════════════
// iskeletci.ts — İskeletçi (Faz 5)
//
//   Söz dizim ağacını GERÇEK klasör/dosya iskeletine döker (kök→dal→yaprak).
//     • kaplar (temel/plan: ÇalışmaAlanı·Uygulama·Proje·Blok·Katman) → dizin
//       (Faz İSTİSNA: ZAMAN halkası, yol-şeffaf — klasör açmaz · MIM-1.2)
//     • Adım (yaprak 🍂)                                                  → .md dosya (bağlam-konisi)
//     • diğer aileler (teknoloji/çağır/karar/yüzey…)                      → iskelet dışı
//
//   İki katman AYRIK:
//     iskeletPlanı()  → saf; diske dokunmaz (test edilebilir)
//     iskeletYaz()    → etkili; planı diske yazar (var olan dosyayı EZMEZ → atlar)
// ═══════════════════════════════════════════════════════════════════════════

import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import type { Program, Dugum } from "./sozdizim.ts";
import type { Siniflama } from "./siniflama.ts";
import { birles, dosyaAdi, paramBul, paramMetni, degerMetni } from "./yolcoz.ts";
import { KONI_ALANLARI, koniAlani } from "./koni.ts";

export interface IskeletOge {
  tur: "dizin" | "dosya";
  /** hedef köke göreli yol (POSIX). */
  yol: string;
  /** dosya için içerik. */
  icerik?: string;
  /** düğümün KOD'u (yer-uyuşmazlığı eşlemesi için). */
  kod?: string;
  /** ilan eden düğümün kaynak konumu (Denetçi tanıları için). */
  satir?: number;
  sutun?: number;
  /** Raf dizini: İÇERİĞİ SERBEST — Denetçi yalnız varlığını arar, içindeki
   *  dosyaları yetim saymaz (dosya-tipi→raf kuralları v2 · PLN-3 P2). */
  icerikSerbest?: boolean;
  /**
   * Bu dizin bir RAF mıdır, yani gövde taşımaya ilan edilmiş bir yer midir?
   *
   * Ayrım sınıflamanın kendi tarifinden doğar ve iki tipi birbirinden ayırır:
   * Raf "klasör ilanıdır ve içerik rafın içine sarılır" derken Kitaplık
   * "dallanan klasördür, kitaplıkta RAFLAR durur" der. Bu yüzden bir rafın
   * beyanı raf DÜZEYİNDE bir desendir ve altındaki gövdeler için ayrı bir ilan
   * gerekmez; bir kitaplık ise yalnız raf taşımaya ilan edilmiştir ve doğrudan
   * içine konan bir kaynak gövdesinin ilanı hiçbir yerde yazmaz. İlan yokluğu
   * bekçisi (denetci.ts · ilansizGovdeDenetle) eşiğini bu alandan okur.
   */
  icerikRafi?: boolean;
  /** Adım dosyası için beyan edilen durum (kanıt-ekseni turu · B5): artefakt-yerel evre
   *  kararı buradan türer — başlamış (geliştirmede/tamamlandı) Adım taşıyan
   *  alt-ağaç EVRE-2, taşımayan yeni ilan EVRE-1 yumuşatması alır. */
  durum?: string;
}

/** MIM-1.4 ③ (GBR-A11): teknoloji-ailesi düğümünün beyan ettiği bir ayak izi —
 *  config/scaffold/üretilen dosya. Yol, İLANIN YAŞADIĞI dizine göreli çözülmüş
 *  gelir (çok-app bahçede her ilan kendi yerine göre). Denetçi bu yolları
 *  ilan-edilmiş omurga-dışı sayar (sebep-bağlı beyaz-liste). */
export interface AyakIzi {
  /** hedef köke göreli yol (POSIX) — dizinse alt-ağacı da kapsar. */
  yol: string;
  /** beyan eden teknoloji-ailesi düğümünün kimliği (kod → ad → tip). */
  teknoloji: string;
  /** beyanın kaynak konumu (çift-yönlü ayna nudge'ı için). */
  satir: number;
  sutun: number;
}

export interface IskeletPlan {
  ogeler: IskeletOge[];
  /** teknoloji-ailesi ayakizi beyanları (MIM-1.4 ③) — yoksa boş/tanımsız. */
  ayakIzleri?: AyakIzi[];
}

export interface Uygulama {
  oge: IskeletOge;
  durum: "oluşturuldu" | "atlandı";
}

/** Programdan iskelet planını hesaplar (saf — diske dokunmaz). */
export function iskeletPlani(program: Program, snf: Siniflama): IskeletPlan {
  const aile = new Map<string, string>(snf.widgetTipleri.map((t) => [t.ad, t.aile]));
  const kenarlar = new Set<string>(snf.kenarTipleri.map((k) => k.ad));
  const ogeler: IskeletOge[] = [];
  const ayakIzleri: AyakIzi[] = [];

  const gez = (node: Dugum, ebeveynYol: string, kok: boolean): void => {
    if (node.tur !== "widget") return; // çağır / tipTanım / kuralTanım → iskelet dışı

    if (node.ad === "Adım") {
      const yol = birles(ebeveynYol, dosyaAdi(node) + ".md");
      ogeler.push({
        tur: "dosya", yol, icerik: adimIcerigi(node, kenarlar),
        kod: paramMetni(node, "kod"), satir: node.satir, sutun: node.sutun,
        durum: paramMetni(node, "durum"),   // kanıt-ekseni turu: artefakt-yerel evre sinyali
      });
      return; // yaprak — çocuk sarmaz
    }

    // Kitaplık/Raf (PLN-3 P2 + metafor 2026-07-02): klasör ilanı — yeri `yol:`
    // parametresinden. Kitaplık dallanır; Raf YAPRAKTIR (raf içinde raf olmaz —
    // doğrulayıcı TIP-2.4 ile zorlar; kompakt `raflar:` haritası yalnız Kitaplık/kapta).
    if (node.ad === "Raf" || node.ad === "Kitaplık") {
      const ham = paramMetni(node, "yol") ?? dosyaAdi(node) + "/";
      const yol = birles(ebeveynYol, ham.replace(/\/+$/, ""));
      ogeler.push({
        tur: "dizin", yol, kod: paramMetni(node, "kod"),
        satir: node.satir, sutun: node.sutun, icerikSerbest: true,
        // Yalnız Raf gövde taşır; Kitaplık raf taşır (SNF-0 tariflerinin ayrımı).
        icerikRafi: node.ad === "Raf",
      });
      if (node.ad === "Kitaplık") kompaktRaflar(node, yol, ogeler);
      for (const c of node.cocuklar) gez(c, yol, false);
      return;
    }

    const a = aile.get(node.ad);

    // MIM-1.4 ③ (GBR-A11): teknoloji-ailesi düğümü (Teknoloji·Takım·MCP·Araç·Model·
    // Ortam) `ayakizi:` listesiyle kendi config/scaffold/üretilen dosya izini
    // SAHİPLENİR. İz, ilanın yaşadığı dizine (ebeveynYol) göreli çözülür —
    // çok-app bahçede her ilan kendi yerine göre. Teknoloji iskelet üretmez
    // (spine değil); yalnız izi toplanır.
    if (a === "teknoloji") {
      const p = paramBul(node, "ayakizi");
      const kimlik = paramMetni(node, "kod") ?? paramMetni(node, "ad") ?? node.ad;
      for (const oge of p?.deger.ogeler ?? []) {
        const ham = degerMetni(oge).replace(/\/+$/, "");
        if (!ham) continue;
        ayakIzleri.push({ yol: birles(ebeveynYol, ham), teknoloji: kimlik, satir: oge.satir, sutun: oge.sutun });
      }
      return;
    }

    if (a === "temel" || a === "plan") {
      // Kök = Dizin kuralı (PLN-3 P1): en-üst temel-aile düğümü (Proje/Uygulama/
      // ÇalışmaAlanı) hedef dizinin KENDİSİDİR — kendine klasör açmaz.
      if (kok && a === "temel") {
        kompaktRaflar(node, ebeveynYol, ogeler);
        for (const c of node.cocuklar) gez(c, ebeveynYol, false);
        return;
      }
      // MIM-1.2: Faz = ZAMAN (büyüme dönemi/halka), KLASÖR DEĞİL — bir Blok fazlar-arası
      //   AYNI yerde büyür (çağır sürekliliği); Faz'a klasör verilirse çok-fazlı Blok
      //   iki dizine bölünür. Faz YOL-ŞEFFAF: dizin açmaz, çocukları ebeveyn yolunu sürdürür.
      if (node.ad === "Faz") {
        kompaktRaflar(node, ebeveynYol, ogeler);
        for (const c of node.cocuklar) gez(c, ebeveynYol, false);
        return;
      }
      // GBR-A07 (IDA dogfood #10): kök-olmayan temel/plan düğümü (Uygulama/Blok/Katman)
      // klasör segmentini önce `yol:`'dan alır (Kitaplık/Raf ile aynı ilke), yoksa
      // ad/kod'dan türer (dosyaAdi — mevcut davranış). Böylece Kitaplık(yol:"x/") içine
      // eşadlı Uygulama koyunca 'x/x' çift-yolu, yol: ile kontrol edilir. `yol: "."`
      // (ya da boş) → düğüm KENDİ klasörünü açmaz, ebeveyn dizininde yaşar (çift-yol panzehiri).
      const hamYol = (paramMetni(node, "yol") ?? dosyaAdi(node)).replace(/\/+$/, "");
      if (hamYol === "." || hamYol === "") {
        kompaktRaflar(node, ebeveynYol, ogeler);
        for (const c of node.cocuklar) gez(c, ebeveynYol, false);
        return;
      }
      const yol = birles(ebeveynYol, hamYol);
      ogeler.push({ tur: "dizin", yol, kod: paramMetni(node, "kod"), satir: node.satir, sutun: node.sutun });
      kompaktRaflar(node, yol, ogeler);
      for (const c of node.cocuklar) gez(c, yol, false);
    }
    // diğer aileler: iskelet dışı (spine değil)
  };

  for (const d of program.bildirimler) gez(d, "", true);
  return { ogeler, ayakIzleri };
}

/** Planı hedef kökün altına yazar. Var olan dosyayı EZMEZ (atlar). */
export function iskeletYaz(plan: IskeletPlan, hedefKok: string): Uygulama[] {
  const sonuc: Uygulama[] = [];
  for (const oge of plan.ogeler) {
    const tam = join(hedefKok, oge.yol);
    if (oge.tur === "dizin") {
      // Var olan dizin de "atlandı" sayılır (RPR-1 bulgu 2: sayaç yanıltmasın).
      if (existsSync(tam)) {
        sonuc.push({ oge, durum: "atlandı" });
      } else {
        mkdirSync(tam, { recursive: true });
        sonuc.push({ oge, durum: "oluşturuldu" });
      }
    } else if (existsSync(tam)) {
      sonuc.push({ oge, durum: "atlandı" }); // kullanıcının emeğini ezme
    } else {
      mkdirSync(dirname(tam), { recursive: true });
      writeFileSync(tam, oge.icerik ?? "", "utf8");
      sonuc.push({ oge, durum: "oluşturuldu" });
    }
  }
  return sonuc;
}

// ── yardımcılar ──────────────────────────────────────────────────────────────
// (yol/ad çözümü ortak yolcoz.ts'te — üret ↔ denetle simetrisi, FEL-3)

/**
 * Kompakt yaprak alt-raflar (Founder 2026-07-02: "raf içinde bir liste olmalı"):
 *   raflar: { src: "tarif", sinama: "tarif" }   ← harita: ad → ne (yol = ad + /)
 *   raflar: [ src, sinama ]                     ← liste: yalnız adlar
 * Yaprak alt-raf ayrı Raf widget'ı istemez; Raf widget'ı yalnız İÇERİK taşıyan
 * ya da DALLANAN raflara yazılır. Denetçi bu yaprakları da kayıp-yapı ile korur.
 */
function kompaktRaflar(node: Dugum, tabanYol: string, ogeler: IskeletOge[]): void {
  const p = paramBul(node, "raflar");
  if (!p) return;
  if (p.deger.tur === "harita") {
    for (const c of p.deger.ciftler ?? []) {
      ogeler.push({
        tur: "dizin", yol: birles(tabanYol, c.ad.replace(/\/+$/, "")),
        satir: c.satir, sutun: c.sutun, icerikSerbest: true, icerikRafi: true,
      });
    }
  } else if (p.deger.tur === "liste") {
    for (const o of p.deger.ogeler ?? []) {
      if (!o.metin) continue;
      ogeler.push({
        tur: "dizin", yol: birles(tabanYol, o.metin.replace(/\/+$/, "")),
        satir: o.satir, sutun: o.sutun, icerikSerbest: true, icerikRafi: true,
      });
    }
  }
}

/** Adım için bağlam-konili markdown üretir. */
function adimIcerigi(node: Dugum, kenarlar: Set<string>): string {
  const kod = paramMetni(node, "kod") ?? node.ad;
  const ad = paramMetni(node, "ad") ?? kod;
  const s: string[] = [];
  s.push("---", `kod: ${kod}`, `ad: ${ad}`, "tür: adım", "---", "");
  // davranış-katmanı turu (OGR-2.2): kapı tabelası — dosyayı İLK gören ajan yönünü bulur (yalnız
  // YENİ üretilen dosya; iskeletYaz mevcut dosyayı zaten ezmez — STR-4 kademe).
  s.push("> 🚪 Bu dosya bir Sarmal iskelet ürünüdür — plan ekseni: Faz → Blok → Katman → Adım.", ">    Doğrula: `sarmal denetle .` · ilk temas kartı: `sarmal ogret`.", "");
  s.push(`# 🍂 Adım: ${ad}  (${kod})`, "");
  s.push("> Bağlam-konisi (Adım şeması) — orkestratör buradan prompt üretir.", "");
  for (const alan of KONI_ALANLARI) {
    s.push(`## ${alan}`, koniAlani(node, alan), "");
  }
  const kenarParams = node.parametreler.filter((p) => kenarlar.has(p.ad));
  if (kenarParams.length) {
    s.push("## bağlar (kenarlar)");
    for (const p of kenarParams) s.push(`- ${p.ad}: ${degerMetni(p.deger)}`);
    s.push("");
  }
  return s.join("\n");
}


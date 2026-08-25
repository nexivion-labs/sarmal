  // ═══════════════════════════════════════════════════════════════════════════
// renk.ts — Anlamsal renklendirme (semantic tokens) · AĞAÇ METAFORU
//
//   Omurga (kök→yaprak) ağaç renkleriyle boyanır (Founder 2026-07-01):
//     🌱 kök (Proje) koyu kahve · 🪵 gövde (Blok) kahve · 🌿 dal (Faz) açık kahve
//     🍃 ufak dal (Katman) daha açık · 🍂 yaprak (Adım) yeşil · 🍎 meyve (urun) mor erik
//   Omurga dışı aileler → SNF-0 aile paleti.
//   Parametre adları + KOD'lar → SOLUK/nötr (ağaç renkleri yıldız kalsın, göz yorulmasın).
//   Renkler package.json'da. Ayrıştırılamayan belge → boyama yok.
// ═══════════════════════════════════════════════════════════════════════════

import * as vscode from "vscode";
import { programAl } from "./onbellek.ts";   // EKL-F9-A06: paylaşımlı AST önbelleği
import type { Dugum, Deger } from "../../cekirdek/src/sozdizim.ts";
import { snfBul } from "./ortak.ts";

// Ağaç omurgası — TİP'e göre (kök koyu → yaprak yeşil).
const AGAC_TOKEN: Record<string, string> = {
  "ÇalışmaAlanı": "sarmalBahce",
  "Uygulama": "sarmalAgac",
  "Proje": "sarmalKok",
  "Blok": "sarmalGovde",
  "Faz": "sarmalDal",
  "Katman": "sarmalAltDal",
  "AltKatman": "sarmalAltDal",   // ufak dal — aynı renk ailesi, ayrışma girinti+ad
  "Adım": "sarmalYaprak",
};

// Omurga dışı → AİLE'ye göre (meyve dahil).
const AILE_TOKEN: Record<string, string> = {
  temel: "sarmalKok",
  plan: "sarmalGovde",
  bilgi: "sarmalBilgi",
  orkestrasyon: "sarmalOrkestrasyon",
  etmen: "sarmalEtmen",
  yuzey: "sarmalYuzey",
  yasa: "sarmalYasa",
  teknoloji: "sarmalTeknoloji",
  urun: "sarmalMeyve",
  surec: "sarmalSurec",
  nitelik: "sarmalNitelik",
  oz: "sarmalOz",
  davranis: "sarmalDavranis",
  arkayuz: "sarmalArkayuz",
};

// K2 imza renkleri (EKL-F3-A03): SNF renkPaleti.kodOnekleri anahtarı → token adı.
// Bu eşleme renk-uret.mjs ile BİREBİR aynı sırada tutulur (renk oradan üretilir).
const ONEK_TOKEN: Record<string, string> = {
  "ETM|ORK|ANY": "sarmalKodEtmen",
  "BCR|YTN": "sarmalKodBeceri",
  "BLK|TTK|KNC": "sarmalKodBellek",
  "HTR": "sarmalKodHatir",
  "K|SD|GK|FEL": "sarmalKodYasa",
  "EKR|TEM|KRT": "sarmalKodYuzey",
  "PLN|ADM|FZ|KTM|EKL": "sarmalKodPlan",
  "SNF|DRM|RAY": "sarmalKodOz",
};

const TOKEN_LISTE = [
  "sarmalBahce", "sarmalAgac", "sarmalKok", "sarmalGovde", "sarmalDal", "sarmalAltDal", "sarmalYaprak", "sarmalMeyve",
  "sarmalBilgi", "sarmalOrkestrasyon", "sarmalEtmen", "sarmalYuzey", "sarmalYasa", "sarmalTeknoloji", "sarmalSurec", "sarmalNitelik", "sarmalOz", "sarmalDavranis", "sarmalArkayuz",
  "sarmalParam", "sarmalKod", "sarmalKenar",
  ...Object.values(ONEK_TOKEN),
];
const PARAM = TOKEN_LISTE.indexOf("sarmalParam");
const KOD = TOKEN_LISTE.indexOf("sarmalKod");
// 🔗 kenar alanları (bağımlı·besler) özgü renkte — bağımlılık iskeleti tek bakışta seçilir (ORK-1.2)
const KENAR = TOKEN_LISTE.indexOf("sarmalKenar");
const KENAR_ALANLARI = new Set(["bağımlı", "besler"]);

/** "ETM-PY-PYTEST" → sarmalKodEtmen dizini; eşleşme yoksa genel KOD. */
function kodDizini(metin: string): number {
  const onek = metin.split("-")[0];
  for (const [grup, token] of Object.entries(ONEK_TOKEN)) {
    if (grup.split("|").includes(onek)) return TOKEN_LISTE.indexOf(token);
  }
  return KOD;
}
export const efsane = new vscode.SemanticTokensLegend(TOKEN_LISTE, []);

export function renkSaglayici(): vscode.DocumentSemanticTokensProvider {
  return {
    provideDocumentSemanticTokens(doc) {
      const snf = snfBul(doc);
      if (!snf) return null;
      const aile = new Map<string, string>(snf.widgetTipleri.map((t) => [t.ad, t.aile]));

      const bildirimler: Dugum[] | undefined = programAl(doc)?.bildirimler;   // EKL-F9-A06: tek parse
      if (!bildirimler) return null;

      const tokenlar: Array<{ s: number; c: number; u: number; t: number }> = [];
      const ekle = (satir: number, sutun: number, uzunluk: number, idx: number): void => {
        if (idx >= 0 && uzunluk > 0) tokenlar.push({ s: satir - 1, c: sutun - 1, u: uzunluk, t: idx });
      };

      const degerTokenla = (v: Deger): void => {
        if (v.tur === "kod" && v.metin) ekle(v.satir, v.sutun, v.metin.length, kodDizini(v.metin));
        else if (v.tur === "widget" && v.dugum) gez(v.dugum);
        else if (v.tur === "liste") for (const o of v.ogeler ?? []) degerTokenla(o);
        else if (v.tur === "harita") for (const c of v.ciftler ?? []) { ekle(c.satir, c.sutun, c.ad.length, PARAM); degerTokenla(c.deger); }
      };

      const gez = (d: Dugum): void => {
        if (d.tur === "widget") {
          const tip = AGAC_TOKEN[d.ad] ?? (aile.has(d.ad) ? AILE_TOKEN[aile.get(d.ad)!] : undefined);
          if (tip) ekle(d.satir, d.sutun, d.ad.length, TOKEN_LISTE.indexOf(tip));
        }
        for (const p of d.parametreler) { ekle(p.satir, p.sutun, p.ad.length, KENAR_ALANLARI.has(p.ad) ? KENAR : PARAM); degerTokenla(p.deger); }
        for (const o of d.ozellikler) { ekle(o.satir, o.sutun, o.ad.length, KENAR_ALANLARI.has(o.ad) ? KENAR : PARAM); degerTokenla(o.deger); }
        for (const c of d.cocuklar) gez(c);
      };
      for (const b of bildirimler) gez(b);

      tokenlar.sort((x, y) => x.s - y.s || x.c - y.c);
      const yapici = new vscode.SemanticTokensBuilder(efsane);
      for (const tk of tokenlar) yapici.push(tk.s, tk.c, tk.u, tk.t, 0);
      return yapici.build();
    },
  };
}

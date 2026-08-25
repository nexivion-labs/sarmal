// ═══════════════════════════════════════════════════════════════════════════
// ayristirici.ts — Ayrıştırıcı (parser)
//
//   Belirteç[] → Söz Dizim Ağacı (Program). Gramer DIL-1.3 · DIL-1.2 · TIP-1 kurallarına göre:
//     bildirim   := çağır | tipTanım | kuralTanım | widget
//     çağır      := "çağır" AD
//     tipTanım   := "Tip" AD paramListesi gövde?
//     kuralTanım := "Kural" AD paramListesi gövde?
//     widget     := AD paramListesi gövde?
//     paramListesi := "(" ( AD ":" değer ("," )? )* ")"
//     gövde        := "{" ( özellik | widget )* "}"
//     özellik      := AD ":" değer
//     değer        := metin | kod | sayı | "[" değer ("," değer)* "]"
// ═══════════════════════════════════════════════════════════════════════════

import type { Belirtec, BelirtecTuru } from "./belirtec.ts";
import { SozDizimHatasi } from "./belirtec.ts";
import type { Program, Dugum, Param, Deger, DugumTuru, HaritaCifti } from "./sozdizim.ts";

/** Belirteç dizisi üzerinde konumlu okuyucu. */
class Okuyucu {
  private bel: Belirtec[];
  private p = 0;
  /** Altında widget bulunmayan /// blokları (DIL-2.1 → sahipsiz-belge uyarısı). */
  sahipsiz: { satir: number; sutun: number }[] = [];
  constructor(bel: Belirtec[]) {
    this.bel = bel;
  }
  simdi(): Belirtec { return this.bel[this.p]; }
  sonraki(): Belirtec | undefined { return this.bel[this.p + 1]; }
  ilerle(): Belirtec { return this.bel[this.p++]; }
  bitti(): boolean { return this.simdi().tur === "dosyaSonu"; }
  /** Ardışık /// satırlarını tek belgeye toplar (DIL-2.2). */
  belgeTopla(): { metin: string; satir: number; sutun: number } | undefined {
    if (this.simdi().tur !== "belge") return undefined;
    const ilk = this.simdi();
    const satirlar: string[] = [];
    while (this.simdi().tur === "belge") satirlar.push(this.ilerle().deger);
    return { metin: satirlar.join("\n"), satir: ilk.satir, sutun: ilk.sutun };
  }
  bekle(tur: BelirtecTuru, ne: string, ingilizceNe: string): Belirtec {
    if (this.simdi().tur !== tur) {
      const bulunan = this.simdi().deger || this.simdi().tur;
      const ingilizceBulunan = this.simdi().deger || (this.simdi().tur === "dosyaSonu" ? "end of file" : this.simdi().tur);
      throw new SozDizimHatasi(
        `${ne} bekleniyordu, "${bulunan}" bulundu.`,
        this.simdi().satir, this.simdi().sutun,
        `${ingilizceNe} was expected, "${ingilizceBulunan}" was found.`,
      );
    }
    return this.ilerle();
  }
}

/** .sar belirteçlerini söz dizim ağacına ayrıştırır. */
export function ayristir(belirtecler: Belirtec[]): Program {
  const ok = new Okuyucu(belirtecler);
  const bildirimler: Dugum[] = [];
  while (!ok.bitti()) {
    const belge = ok.belgeTopla();                    // /// bloğu (DIL-2.2)
    if (belge && ok.bitti()) {
      ok.sahipsiz.push({ satir: belge.satir, sutun: belge.sutun });
      break;
    }
    const d = ayristirBildirim(ok);
    if (belge) d.belge = belge.metin;
    bildirimler.push(d);
  }
  return {
    bildirimler,
    ...(ok.sahipsiz.length ? { sahipsizBelgeler: ok.sahipsiz } : {}),
  };
}

function ayristirBildirim(ok: Okuyucu): Dugum {
  const t = ok.simdi();
  if (t.tur !== "ad") {
    const bulunan = t.deger || t.tur;
    throw new SozDizimHatasi(
      `Bildirim başında bir ad bekleniyordu (widget tipi · çağır · Tip · Kural), "${bulunan}" bulundu.`,
      t.satir, t.sutun,
      `A name was expected at the start of the declaration (widget type · çağır · Tip · Kural); "${bulunan}" was found.`,
    );
  }
  if (t.deger === "çağır") return ayristirCagir(ok);
  if (t.deger === "Tip") return ayristirTanim(ok, "tipTanım");
  if (t.deger === "Kural") return ayristirTanim(ok, "kuralTanım");
  return ayristirWidget(ok);
}

// çağır KOD [@mühür:<hash>]  (DIL-1.4 · doğuş-rehberi turu) — parametresiz, gövdesiz;
// opsiyonel mühür pini `mühür` parametresi olarak taşınır (hedef içerik-hash'i).
function ayristirCagir(ok: Okuyucu): Dugum {
  const anahtar = ok.ilerle(); // çağır
  const kod = ok.bekle("ad", "çağrılacak KOD (örn. FLUTTER)", "the code to call (for example FLUTTER)");
  const parametreler: Param[] = [];
  if (ok.simdi().tur === "mühür") {
    const m = ok.ilerle();
    parametreler.push({
      ad: "mühür",
      deger: { tur: "metin", metin: m.deger, satir: m.satir, sutun: m.sutun },
      satir: m.satir, sutun: m.sutun,
    });
  }
  return dugum("çağır", kod.deger, parametreler, [], [], anahtar);
}

// Tip Ad(...) {...}  /  Kural ad(...) {...}  (TIP-1 · DIL-3)
function ayristirTanim(ok: Okuyucu, tur: DugumTuru): Dugum {
  const anahtar = ok.ilerle(); // Tip | Kural
  const ad = ok.bekle(
    "ad", tur === "tipTanım" ? "tip adı" : "kural adı",
    tur === "tipTanım" ? "a type name" : "a rule name",
  );
  const parametreler = ayristirParamListesi(ok);
  const { ozellikler, cocuklar } = ayristirGovde(ok);
  return dugum(tur, ad.deger, parametreler, ozellikler, cocuklar, anahtar);
}

// Tip(...) {...}  (DIL-1.3) — widget bildirimi.
function ayristirWidget(ok: Okuyucu): Dugum {
  const isim = ok.ilerle(); // tip adı
  const parametreler = ayristirParamListesi(ok);
  const { ozellikler, cocuklar } = ayristirGovde(ok);
  return dugum("widget", isim.deger, parametreler, ozellikler, cocuklar, isim);
}

// "(" ( ad: değer , )* ")"
function ayristirParamListesi(ok: Okuyucu): Param[] {
  ok.bekle("parenAç", '"(" (parametre listesi başı)', '"(" (start of parameter list)');
  const params: Param[] = [];
  while (ok.simdi().tur !== "parenKapa" && !ok.bitti()) {
    const ad = ok.bekle("ad", "parametre adı", "a parameter name");
    ok.bekle("ikiNokta", '":" (parametre değeri için)', '":" (before the parameter value)');
    const deger = ayristirDeger(ok);
    params.push({ ad: ad.deger, deger, satir: ad.satir, sutun: ad.sutun });
    if (ok.simdi().tur === "virgül") ok.ilerle();
    else break;
  }
  ok.bekle("parenKapa", '")" (parametre listesi sonu)', '")" (end of parameter list)');
  return params;
}

// "{" ( ad: değer  |  Tip(...)... )* "}"  — özellik ya da çocuk-widget
function ayristirGovde(ok: Okuyucu): { ozellikler: Param[]; cocuklar: Dugum[] } {
  const ozellikler: Param[] = [];
  const cocuklar: Dugum[] = [];
  if (ok.simdi().tur !== "süsAç") return { ozellikler, cocuklar };
  ok.ilerle(); // {
  while (ok.simdi().tur !== "süsKapa" && !ok.bitti()) {
    // /// belgesi (DIL-2.2): yalnız ÇOCUK-WIDGET'a bağlanır; özellik/ok/kapanış
    // altında kalırsa sahipsizdir (Denetçi uyarır).
    const belge = ok.belgeTopla();
    if (belge) {
      const cocukGeliyor = ok.simdi().tur === "ad" && ok.sonraki()?.tur !== "ikiNokta";
      if (!cocukGeliyor) {
        ok.sahipsiz.push({ satir: belge.satir, sutun: belge.sutun });
        continue; // özellik/ok/kapanış kendi turunda işlenir
      } else {
        const c = ayristirBildirim(ok);
        c.belge = belge.metin;
        cocuklar.push(c);
        if (ok.simdi().tur === "virgül") ok.ilerle();
        continue;
      }
    }
    // "--> KOD" akış şekeri (DIL-1.4): besler kenarının kısa yolu.
    if (ok.simdi().tur === "ok") {
      const okImi = ok.ilerle();
      const hedef = ok.bekle("ad", "akış hedefi KOD (örn. --> ADM-GIRIS)", "a flow target code (for example --> ADM-GIRIS)");
      ozellikler.push({
        ad: "besler",
        deger: { tur: "kod", metin: hedef.deger, satir: hedef.satir, sutun: hedef.sutun },
        satir: okImi.satir, sutun: okImi.sutun,
      });
    } else if (ok.simdi().tur === "ad" && ok.sonraki()?.tur === "ikiNokta") {
      // "ad :" ise özellik; değilse (örn. "Tip (") çocuk-widget bildirimi.
      const ad = ok.ilerle();
      ok.ilerle(); // :
      const deger = ayristirDeger(ok);
      ozellikler.push({ ad: ad.deger, deger, satir: ad.satir, sutun: ad.sutun });
    } else {
      cocuklar.push(ayristirBildirim(ok));
    }
    if (ok.simdi().tur === "virgül") ok.ilerle();
  }
  ok.bekle("süsKapa", '"}" (gövde sonu)', '"}" (end of body)');
  return { ozellikler, cocuklar };
}

// değer := ifade zinciri (DIL-1.3) — atomlar DIL-1.3'ün mevcut değerleri.
// Öncelik (gevşekten sıkıya): veya < ve < karşılaştırma < +- < */% < değil < atom.
// Tek atomlu değer ESKİSİ GİBİ döner (geriye-uyum) — ifade yalnız işleç görülünce doğar.
function ayristirDeger(ok: Okuyucu): Deger {
  return ayristirVeya(ok);
}

function ikili(sol: Deger, islem: string, sag: Deger): Deger {
  return { tur: "ifade", islem, sol, sag, satir: sol.satir, sutun: sol.sutun };
}

function ayristirVeya(ok: Okuyucu): Deger {
  let sol = ayristirVe(ok);
  while (ok.simdi().tur === "ad" && ok.simdi().deger === "veya") {
    ok.ilerle();
    sol = ikili(sol, "veya", ayristirVe(ok));
  }
  return sol;
}

function ayristirVe(ok: Okuyucu): Deger {
  let sol = ayristirKarsilastirma(ok);
  while (ok.simdi().tur === "ad" && ok.simdi().deger === "ve") {
    ok.ilerle();
    sol = ikili(sol, "ve", ayristirKarsilastirma(ok));
  }
  return sol;
}

const KARSILASTIRMA = new Set(["==", "!=", "<", "<=", ">", ">="]);

function ayristirKarsilastirma(ok: Okuyucu): Deger {
  const sol = ayristirToplama(ok);
  if (ok.simdi().tur === "işleç" && KARSILASTIRMA.has(ok.simdi().deger)) {
    const islem = ok.ilerle().deger;
    return ikili(sol, islem, ayristirToplama(ok));
  }
  return sol;
}

function ayristirToplama(ok: Okuyucu): Deger {
  let sol = ayristirCarpma(ok);
  while (ok.simdi().tur === "işleç" && (ok.simdi().deger === "+" || ok.simdi().deger === "-")) {
    const islem = ok.ilerle().deger;
    sol = ikili(sol, islem, ayristirCarpma(ok));
  }
  return sol;
}

function ayristirCarpma(ok: Okuyucu): Deger {
  let sol = ayristirBirim(ok);
  while (ok.simdi().tur === "işleç" && (ok.simdi().deger === "*" || ok.simdi().deger === "/" || ok.simdi().deger === "%")) {
    const islem = ok.ilerle().deger;
    sol = ikili(sol, islem, ayristirBirim(ok));
  }
  return sol;
}

function ayristirBirim(ok: Okuyucu): Deger {
  if (ok.simdi().tur === "ad" && ok.simdi().deger === "değil") {
    const t = ok.ilerle();
    return { tur: "ifade", islem: "değil", sag: ayristirBirim(ok), satir: t.satir, sutun: t.sutun };
  }
  return ayristirAtom(ok);
}

// metin | kod | sayı | #anahtar | kullanıcı.ad | [ liste ] | Ad(...) widget | { harita }
function ayristirAtom(ok: Okuyucu): Deger {
  const t = ok.simdi();
  if (t.tur === "metin") { ok.ilerle(); return { tur: "metin", metin: t.deger, satir: t.satir, sutun: t.sutun }; }
  if (t.tur === "sayı") { ok.ilerle(); return { tur: "sayı", metin: t.deger, satir: t.satir, sutun: t.sutun }; }
  if (t.tur === "anahtar") { ok.ilerle(); return { tur: "anahtar", metin: t.deger, satir: t.satir, sutun: t.sutun }; }
  if (t.tur === "parenAç") {
    // ( ifade ) — gruplama (DIL-1.3)
    ok.ilerle();
    const ic = ayristirDeger(ok);
    ok.bekle("parenKapa", '")" (ifade grubu sonu)', '")" (end of expression group)');
    return ic;
  }
  if (t.tur === "ad") {
    // Ad'ı "(" izliyorsa değer bir WIDGET'tır (örn. yasa: Yasa(...)).
    if (ok.sonraki()?.tur === "parenAç") {
      const dugum = ayristirWidget(ok);
      return { tur: "widget", dugum, satir: t.satir, sutun: t.sutun };
    }
    ok.ilerle();
    // Ad'ı "." izliyorsa nokta-erişimidir: kullanıcı.ad (DIL-1.3).
    if (ok.simdi().tur === "nokta") {
      let yol = t.deger;
      while (ok.simdi().tur === "nokta") {
        ok.ilerle(); // .
        yol += "." + ok.bekle("ad", "erişim alanı (örn. kullanıcı.ad)", "an access field (for example kullanıcı.ad)").deger;
      }
      return { tur: "erişim", metin: yol, satir: t.satir, sutun: t.sutun };
    }
    return { tur: "kod", metin: t.deger, satir: t.satir, sutun: t.sutun };
  }
  if (t.tur === "köşeAç") {
    ok.ilerle(); // [
    const ogeler: Deger[] = [];
    while (ok.simdi().tur !== "köşeKapa" && !ok.bitti()) {
      ogeler.push(ayristirDeger(ok));
      if (ok.simdi().tur === "virgül") ok.ilerle();
      else break;
    }
    ok.bekle("köşeKapa", '"]" (liste sonu)', '"]" (end of list)');
    return { tur: "liste", ogeler, satir: t.satir, sutun: t.sutun };
  }
  if (t.tur === "süsAç") {
    ok.ilerle(); // {
    const ciftler: HaritaCifti[] = [];
    while (ok.simdi().tur !== "süsKapa" && !ok.bitti()) {
      const ad = ok.bekle("ad", "harita anahtarı", "a map key");
      ok.bekle("ikiNokta", '":" (harita değeri için)', '":" (before the map value)');
      const deger = ayristirDeger(ok);
      ciftler.push({ ad: ad.deger, deger, satir: ad.satir, sutun: ad.sutun });
      if (ok.simdi().tur === "virgül") ok.ilerle();
      else break;
    }
    ok.bekle("süsKapa", '"}" (harita sonu)', '"}" (end of map)');
    return { tur: "harita", ciftler, satir: t.satir, sutun: t.sutun };
  }
  // A09/C6 (bug-avı): değer konumundaki '-' en sık negatif-sayı denemesidir —
  // genel "Değer bekleniyordu" yerine yol gösteren özel mesaj (DIL-1.3: negatif
  // literal v1 dışı — bilinçli sınır, yasada beyanlı).
  if (t.tur === "işleç" && t.deger === "-") {
    throw new SozDizimHatasi(
      'Negatif sayı literali henüz desteklenmiyor — değeri pozitif tasarla (örneğin ceza: 5 ile ayrı bir yön alanı) ya da metin olarak tırnakla ("-5").',
      t.satir, t.sutun,
      'Negative number literals are not supported yet — model the value as positive (for example, use ceza: 5 with a separate direction field) or quote it as text ("-5").',
    );
  }
  const bulunan = t.deger || t.tur;
  throw new SozDizimHatasi(
    `Değer bekleniyordu (metin · KOD · sayı · liste · widget · harita · #anahtar · ifade), "${bulunan}" bulundu.`,
    t.satir, t.sutun,
    `A value was expected (text · CODE · number · list · widget · map · #key · expression); "${bulunan}" was found.`,
  );
}

function dugum(
  tur: DugumTuru, ad: string,
  parametreler: Param[], ozellikler: Param[], cocuklar: Dugum[],
  konum: Belirtec,
): Dugum {
  return { tur, ad, parametreler, ozellikler, cocuklar, satir: konum.satir, sutun: konum.sutun };
}

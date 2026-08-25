// ═══════════════════════════════════════════════════════════════════════════
// ipucu.ts — Üzerine-gelme açıklaması (HoverProvider)
//
//   Bir widget tipi / kenar / anahtar / parametre üstüne gelince Türkçe
//   açıklama baloncuğu (SNF-0'dan). Öğrenmeyi hızlandırır, tahmini bitirir.
// ═══════════════════════════════════════════════════════════════════════════

import * as vscode from "vscode";
import { agacYüz } from "../../cekirdek/src/agac.ts";   // ağaç-yüzü turu
import { snfBul, rehberBul, simgeSec } from "./ortak.ts";
// SAF veri mantığı — fikstürlü testte (NTK-A01): tanım taraması + hüküm eki + blok tespiti
import { kodTanimlariTara, kararMetniEki, blokIcindeMi, tanimOzetiCikar } from "./ipucu-cekirdek.ts";
// VIT-GRAF-A14: satır-regex'in kaçırdığı (çok satırlı yazılmış) tanımlar için AST yedeği —
// kimlik indeksi dekorla AYNI evrendir; süslü sözcenin ipucusuz kalması yapısal olarak kapanır.
import { kimlikIndeksi, INDEKS_DISI, dosyaOkuGuvenli } from "../../cekirdek/src/kimlik.ts";
// EMJ-A03: emoji yüzü — kanon emojisine hover'da emoji↔ad karşılığı; Türkçe
// baloncuklara emoji eşdeğeri satırı (iki yüz birbirini öğretir).
import { emojiDeseni, emojiSozceCoz, emojiKarsiligi, yazimDisiMi } from "./emoji-yuz.ts";
// EMJ-A05: Etmen hover'ına karne satırı — sicil yokken dürüst tek cümle (çekirdek DIL-2 tek ses).
import { karneSatiri } from "../../cekirdek/src/karne.ts";
import {
  sozlukAdi,
  sozlukDuzYazisi,
  type CiktiDili,
} from "../../cekirdek/src/cevir.ts";
import {
  IPUCU_BELGE_METINLERI, IPUCU_SOZCE_METINLERI,
  anahtarIpucu, bolumEtiketiIpucu, emojiBolumAdi, emojiIpucuSatiri,
  emojiYazimiIpucu, ipucuAnahtarMetni, ipucuBolumMetni, ipucuIslecMetni,
  ipucuParamMetni, kenarIpucu, parametreIpucu, tipIpucuMetni,
  varsayilanlarIpucu, yetkiIpucu,
} from "./yuzey-metinleri.ts";

const EMOJI_DESENI = emojiDeseni();

/** Türkçe baloncuğa emoji eşdeğeri satırı — kanonda emojisi olmayan ad için boş. */
function emojiSatiri(ad: string): string {
  const emoji = emojiKarsiligi(ad);
  return emoji ? emojiIpucuSatiri(emoji) : "";
}

// ── F5-A02 · KOD indeksi: çalışma alanındaki tüm `kod: X` bildirimleri ───────
// Hover anında hedef düğümün kim olduğunu söyler (koni önizlemesi).
// Önbellek 20 sn tazedir — dosya kurtarma değil, göz atma aracıdır.
interface KodKaydi { dosya: vscode.Uri; satir: number; tip: string; ne: string; hukum?: string; ozet?: string }
let kodIndeks: Map<string, KodKaydi> | undefined;
let kodIndeksZamani = 0;

async function kodIndeksle(): Promise<Map<string, KodKaydi>> {
  const simdi = Date.now();
  if (kodIndeks && simdi - kodIndeksZamani < 20_000) return kodIndeks;
  const indeks = new Map<string, KodKaydi>();
  const dosyalar = await vscode.workspace.findFiles(
    "**/*.sar", "**/{arsiv,node_modules,fikstur}/**");
  for (const uri of dosyalar) {
    try {
      // Tarama mantığı saf çekirdekte (ipucu-cekirdek.ts) — ilk tanım kazanır (dedup burada).
      const metin = (await vscode.workspace.openTextDocument(uri)).getText();
      for (const t of kodTanimlariTara(metin)) {
        if (indeks.has(t.kod)) continue;
        indeks.set(t.kod, { dosya: uri, satir: t.satir, tip: t.tip, ne: t.ne, hukum: t.hukum, ozet: t.ozet });
      }
    } catch { /* açılamayan dosya indekse girmez */ }
  }
  kodIndeks = indeks; kodIndeksZamani = simdi;
  return indeks;
}

// ── VIT-GRAF-A14 · Kimlik-indeksi yedeği ─────────────────────────────────────
//   kodIndeksle'nin satır-regex'i, `kod:` alanı widget açılışından AYRI satırda
//   yazılmış 297 tanımı kaçırıyordu (ölçüm: 2353 AST tanımının %13'ü) — sözce
//   dekorla süsleniyor ama üzerine gelince pencere BOŞ kalıyordu. Yedek, dekorun
//   evreni olan kimlik indeksinden tanımı bulur ve YALNIZ hedef dosyayı okur —
//   yeni tarama açılmaz (VIT-GRAF-A14 performans hükmü: mevcut indeks kullanılır).
function kimlikYedekIpucu(
  kod: string, doc: vscode.TextDocument, aralik: vscode.Range, etkinDil: CiktiDili,
): vscode.Hover | undefined {
  // Dekorla AYNI süzgeç (KPN-A01): ders-dünyası kopyaları evrene girmez, belgenin kendisi girer.
  const tanimlar = kimlikIndeksi.tanimlar(kod, (d) => d === doc.uri.fsPath || !INDEKS_DISI.test(d));
  if (!tanimlar.length) return undefined;   // çözülmeyen kod ipucu uydurmaz (dürüst yüzey)
  const t = tanimlar[0];
  const metin = dosyaOkuGuvenli(t.dosya);
  const ozet = metin ? tanimOzetiCikar(metin, kod) : undefined;
  const gorunenTip = sozlukAdi("widget", ozet?.tip ?? t.tip, etkinDil);
  const uri = vscode.Uri.file(t.dosya);
  const goreli = vscode.workspace.asRelativePath(uri);
  return baloncuk(
    `🧩 **${kod}** — ${gorunenTip}${ozet?.ad ? ` · ${ozet.ad}` : ""}` +
    (ozet?.ne ? `\n\n${ozet.ne}` : "") +
    `\n\n📍 [${goreli}:${t.satir}](${uri.toString()}#L${t.satir})`,
    aralik);
}

/** İmleç bir -->| ... |<-- belge bloğunun İÇİNDE mi? — mantık saf çekirdekte (ipucu-cekirdek.ts). */
function blokIcinde(doc: vscode.TextDocument, pos: vscode.Position): boolean {
  const satirlar: string[] = [];
  for (let s = 0; s <= pos.line; s++) satirlar.push(doc.lineAt(s).text);
  return blokIcindeMi(satirlar, pos.line, pos.character);
}

export function ipucuSaglayici(dil: () => CiktiDili): vscode.HoverProvider {
  return {
    async provideHover(doc, pos) {
      const snf = snfBul(doc);
      if (!snf) return undefined;
      const etkinDil = dil();

      // ── DIL-2 sınır imleri — DIL-1.4 akış okundan ÖNCE denetlenir (karışmasın) ──
      const acilis = doc.getWordRangeAtPosition(pos, /-->\|/);
      if (acilis) {
        return baloncuk(IPUCU_BELGE_METINLERI.acilis, acilis);
      }
      const kapanis = doc.getWordRangeAtPosition(pos, /\|<--/);
      if (kapanis) {
        return baloncuk(IPUCU_BELGE_METINLERI.kapanis, kapanis);
      }

      // ── Blok İÇİ: belge metnidir — parametre/tip hover'ları susturulur (belge belge kalır).
      //    NTK-A01 (Founder isteği): KOD atıfları İSTİSNADIR — belge bloğundaki DIL-1.1 gibi
      //    bir atfa gelen kullanıcı, hedefi dosya açmadan ipucu penceresinde görür.
      if (blokIcinde(doc, pos)) {
        const kodAralik = doc.getWordRangeAtPosition(pos, /[\p{Lu}][\p{Lu}\p{N}]*(-[\p{Lu}\p{N}]+)+/u);
        if (kodAralik) {
          const kelime = doc.getText(kodAralik);
          const kayit = (await kodIndeksle()).get(kelime);
          if (kayit) {
            const gorunenTip = sozlukAdi("widget", kayit.tip, etkinDil);
            const goreli = vscode.workspace.asRelativePath(kayit.dosya);
            return baloncuk(
              `🧩 **${kelime}** — ${gorunenTip}` +
              (kayit.ne ? `\n\n${kayit.ne}` : "") +
              kararMetniEki(kayit) +
              `\n\n📍 [${goreli}:${kayit.satir + 1}](${kayit.dosya.toString()}#L${kayit.satir + 1})`,
              kodAralik);
          }
          // VIT-GRAF-A14: satır-regex kaçırdıysa AST yedeği konuşur (çok satırlı tanım).
          const yedek = kimlikYedekIpucu(kelime, doc, kodAralik, etkinDil);
          if (yedek) return yedek;
        }
        const tag = doc.getWordRangeAtPosition(pos, /<\/?[\p{L}\p{N}_-]+(\s[^>]*)?>/u);
        if (tag) {
          const ad = /<\/?([\p{L}\p{N}_-]+)/u.exec(doc.getText(tag))?.[1] ?? "";
          const aciklama = ipucuBolumMetni(ad);
          return baloncuk(bolumEtiketiIpucu(ad, aciklama), tag);
        }
        return undefined;
      }

      // ── EMJ-A03: kanon emojisi — YAZIMDAKİ emojiye emoji↔ad baloncuğu.
      //    Dizgi/yorum içindeki emoji İÇERİKTİR (EMJ-A02: içerik korunur) — susulur.
      const emojiAralik = doc.getWordRangeAtPosition(pos, EMOJI_DESENI);
      if (emojiAralik) {
        const satirlar: string[] = [];
        for (let s = 0; s <= pos.line; s++) satirlar.push(doc.lineAt(s).text);
        if (!yazimDisiMi(satirlar, pos.line, emojiAralik.start.character + 1)) {
          const cozum = emojiSozceCoz(doc.getText(emojiAralik));
          if (cozum) {
            const bolumAd = emojiBolumAdi(cozum.bolum);
            const aciklama =
              cozum.bolum === "kademe" ? (() => {
                const tip = snf.widgetTipleri.find((t) => t.ad === cozum.ad);
                return tip ? sozlukDuzYazisi("widgetNe", tip.ad, tip.ne, etkinDil) : undefined;
              })()
              : cozum.bolum === "parametre" ? ipucuParamMetni(cozum.ad)
              : undefined;
            return baloncuk(emojiYazimiIpucu(
              doc.getText(emojiAralik), cozum.ad, bolumAd, aciklama,
            ), emojiAralik);
          }
        }
      }

      const aralik = doc.getWordRangeAtPosition(pos, /[\p{L}_][\p{L}\p{N}_]*(-[\p{L}\p{N}_]+)*/u);
      if (aralik) {
        const kelime = doc.getText(aralik);

        // F5-A02: KOD atfı → hedef düğümün koni önizlemesi (kim, ne, nerede)
        if (/^[\p{Lu}][\p{Lu}\p{N}]*(-[\p{Lu}\p{N}]+)+$/u.test(kelime)) {
          const kayit = (await kodIndeksle()).get(kelime);
          if (kayit) {
            const tipBilgi = snf.widgetTipleri.find((t) => t.ad === kayit.tip);
            const simge = tipBilgi ? (simgeSec(snf, kayit.tip, tipBilgi.aile) ?? "🧩") : "🧩";
            const gorunenTip = sozlukAdi("widget", kayit.tip, etkinDil);
            const goreli = vscode.workspace.asRelativePath(kayit.dosya);
            // ağaç-yüzü turu: Kitaplık/Raf hover'ında alt-ağaç (YUZ-1.1 — aynı agacYüz çekirdeği)
            let agacEk = "";
            if (kayit.tip === "Kitaplık" || kayit.tip === "Raf") {
              try {
                const kaynakDoc = await vscode.workspace.openTextDocument(kayit.dosya);
                agacEk = "\n\n```\n" + agacYüz(kaynakDoc.getText(), { altKok: kelime }).trimEnd() + "\n```";
              } catch { agacEk = ""; }   // çizilemiyorsa hover sade kalır
            }
            // EMJ-A05: Etmen düğümünün karne satırı — sicil yokken derece basılmaz (dürüstlük).
            const karneEk = kayit.tip === "Etmen" && karneSatiri(snf) ? `\n\n${karneSatiri(snf)}` : "";
            return baloncuk(
              `${simge} **${kelime}** — ${gorunenTip}` +
              (kayit.ne ? `\n\n${kayit.ne}` : "") +
              kararMetniEki(kayit) +
              karneEk +
              agacEk +
              `\n\n📍 [${goreli}:${kayit.satir + 1}](${kayit.dosya.toString()}#L${kayit.satir + 1})`,
              aralik);
          }
          // VIT-GRAF-A14: satır-regex kaçırdıysa AST yedeği konuşur (çok satırlı tanım) —
          // dekorun süslediği hiçbir sözce ipucusuz kalmaz, tanımsız sözceye ipucu uydurulmaz.
          const yedek = kimlikYedekIpucu(kelime, doc, aralik, etkinDil);
          if (yedek) return yedek;
        }

        const tip = snf.widgetTipleri.find((t) => t.ad === kelime);
        if (tip) {
          const rehber = rehberBul(doc);
          const zengin = etkinDil === "tr" ? rehber?.[tip.ad] : undefined;
          const simge = simgeSec(snf, tip.ad, tip.aile) ?? "🧩";
          const ne = sozlukDuzYazisi("widgetNe", tip.ad, tip.ne, etkinDil);
          const gorunenAd = sozlukAdi("widget", tip.ad, etkinDil);
          // doğuş-rehberi turu (CUE `*` ödüncü): kanon varsayılanları hover'da GÖRÜNÜR —
          // yazılmayan alan hangi değere düşüyor, geliştirici tipin üstünde okur.
          const vars = snf.semalar?.[tip.ad]?.varsayilan;
          const varsEk = vars && Object.keys(vars).length ? varsayilanlarIpucu(vars) : "";
          return baloncuk(
            tipIpucuMetni(
              gorunenAd,
              tip.aile,
              ne,
              zengin,
              simge,
              etkinDil,
            ) + varsEk + emojiSatiri(tip.ad),
            aralik,
          );
        }

        const kenar = snf.kenarTipleri.find((k) => k.ad === kelime);
        if (kenar) {
          const ne = sozlukDuzYazisi("kenarNe", kenar.ad, kenar.ne, etkinDil);
          const gorunenAd = sozlukAdi("kenar", kenar.ad, etkinDil);
          return baloncuk(kenarIpucu(
            kenar.ad, gorunenAd, kenar.yon, ne, emojiSatiri(kenar.ad),
          ), aralik);
        }

        const anahtarMetni = ipucuAnahtarMetni(kelime);
        if (anahtarMetni) return baloncuk(anahtarIpucu(kelime, anahtarMetni, emojiSatiri(kelime)), aralik);
        // EKL-F9-A10: yetki hover'ı KANONDAN beslenir (yetkiSozlugu tek kaynak) —
        // tamamlama L1-L6 kademelerini, ipucu erişim ilanını gösteriyordu; ikisi
        // aynı sözlüğe bağlandı (tutarsızlık kapandı).
        if (kelime === "yetki" && snf.yetkiSozlugu) {
          const kademeler = Object.entries(snf.yetkiSozlugu)
            .map(([k, v]) => `- \`${k}\` — ${v}`).join("\n");
          return baloncuk(yetkiIpucu(ipucuParamMetni("yetki") ?? "", kademeler), aralik);
        }
        const parametreMetni = ipucuParamMetni(kelime);
        if (parametreMetni) return baloncuk(parametreIpucu(
          kelime, parametreMetni, emojiSatiri(kelime),
        ), aralik);
      }

      // ── kelime-dışı sözceler: --> · #anahtar · işleçler (DIL-1.3/1.4) ──────────
      const ok = doc.getWordRangeAtPosition(pos, /-->/);
      if (ok) {
        return baloncuk(IPUCU_SOZCE_METINLERI.akisOku, ok);
      }

      const i18n = doc.getWordRangeAtPosition(pos, /#[\p{L}_][\p{L}\p{N}_]*(\.[\p{L}_][\p{L}\p{N}_]*)*/u);
      if (i18n) {
        const anahtar = doc.getText(i18n);
        return baloncuk(IPUCU_SOZCE_METINLERI.i18n(anahtar), i18n);
      }

      const islec = doc.getWordRangeAtPosition(pos, /==|!=|<=|>=|(?<=\s)[-+*/%<>](?=\s)/);
      if (islec) {
        const im = doc.getText(islec);
        const islecMetni = ipucuIslecMetni(im);
        if (islecMetni) return baloncuk(IPUCU_SOZCE_METINLERI.islec(im, islecMetni), islec);
      }

      return undefined;
    },
  };
}

function baloncuk(md: string, aralik: vscode.Range): vscode.Hover {
  return new vscode.Hover(new vscode.MarkdownString(md), aralik);
}

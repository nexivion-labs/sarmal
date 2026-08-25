// ═══════════════════════════════════════════════════════════════════════════
// onbellek.ts — ⚡ Paylaşımlı AST önbelleği (EKL-F9-A06)
//
//   renk · takdir · anahat · dallar · denetim aynı belgeyi BAĞIMSIZ parse
//   ediyordu (tuş vuruşu başına 4-5 parse). Belge-versiyon anahtarlı TEK parse:
//   aynı (uri, version) ikinci kez ayrıştırılmaz. Sözdizim hatasında undefined
//   döner — tüketici kendi "önceki çizim kalsın / anahat yok" davranışını korur.
//   Konum bilgisi isteyen tüketici (SozDizimHatasi satır:sütun — eklenti.ts
//   tanila/iskeletKur) doğrudan parse etmeye devam eder; önbellek onun yerine
//   geçmez. Kapanan belge bellekten düşer (F10-A11 ölü-thread nöbeti dersi).
// ═══════════════════════════════════════════════════════════════════════════

import type * as vscode from "vscode";
import { belirtecle } from "../../cekirdek/src/belirtec.ts";
import { ayristir } from "../../cekirdek/src/ayristirici.ts";
import type { Program } from "../../cekirdek/src/sozdizim.ts";

interface Kayit { versiyon: number; program?: Program }
const bellek = new Map<string, Kayit>();

/** Belge-versiyon anahtarlı tek parse; sözdizim hatası → undefined (tüketici karar verir). */
export function programAl(doc: vscode.TextDocument): Program | undefined {
  const anahtar = doc.uri.toString();
  const k = bellek.get(anahtar);
  if (k && k.versiyon === doc.version) return k.program;
  let program: Program | undefined;
  try { program = ayristir(belirtecle(doc.getText())); }
  catch { program = undefined; }
  bellek.set(anahtar, { versiyon: doc.version, program });
  return program;
}

/** Kapanan belgeyi bellekten düşür — eklenti.ts onDidCloseTextDocument bağlar. */
export function belgeKapandi(doc: vscode.TextDocument): void {
  bellek.delete(doc.uri.toString());
}

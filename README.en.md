<!-- SARMAL:ELLE-KORUNAN:BAS -->
# Sarmal

[![kapı](https://github.com/nexivion-labs/sarmal/actions/workflows/kapi.yml/badge.svg)](https://github.com/nexivion-labs/sarmal/actions/workflows/kapi.yml)

Sarmal is an open-source language that keeps a software project's plan, rules and decisions in `.sar` files. Those files are readable by people and checkable by machines: the engine compares the plan with the disk on every save, the VS Code extension shows the result in panels, and the MCP server hands the same information to AI agents. Sarmal does not generate code; it makes the why and the order of the code impossible to lose.

## The problem it solves

In a project driven by AI agents the plan stays in the chat, the decision stays in the previous session's context, the code runs ahead of the plan, and three weeks later nobody can say which task was done for what reason. Every session starts from zero, the human re-explains the context, and the explanation drifts a little each time. The agent's intelligence is not the problem; the problem is that the project's memory lives where no machine can read it.

Sarmal pulls that memory into a single source. A plan is written on four axes: time (Faz), work (Blok), technology (Katman) and flow (Adım). Every Adım declares its task, its acceptance criteria, its boundary, the decision it rests on and the file it produces. Decisions are recorded with their rationale, rules live in one canon, and the engine checks all of these declarations against reality: does the declared file exist, does a task marked done carry evidence, is the referenced decision actually defined, is a newly created folder declared.

## How it works: a real example

Suppose a small project born from the starter kit contains this Blok (`plan/randevu.sar`):

```sar
Blok( kod: BLK-RANDEVU-API, ad: "Randevu Ucu", mevsim: FAZ-RANDEVU-DOGUS,
  ne: "Randevu oluşturma ucunun yazımı" ) {
  Katman( kod: KAT-RANDEVU-ARKAYUZ, ad: "Arka Yüz", teknolojiBağımsız: "seçim kuruluş Adımında" ) {
    AltKatman( kod: ALT-RANDEVU-UC, ad: "Uç", departman: kodlama ) {
      Adım( kod: ADM-RANDEVU-01, ad: "Randevu ucu", durum: tamamlandı,
        görev: "POST /randevu ucunu yaz",
        kabul: [ "uç 201 döner" ],
        üretir: [ Meyve( kod: MYV-RANDEVU-UC, tür: Kod, dosya: "src/randevu.ts" ) ] )
      Adım( kod: ADM-RANDEVU-02, ad: "Randevu sınaması", durum: geliştirmede,
        bağımlı: [ ADM-RANDEVU-01 ], referans: [ KRR-RANDEVU-03 ],
        görev: "Ucun sınamasını yaz",
        kabul: [ "sınama yeşil" ] )
    }
  }
}
```

The first Adım claims to be done, but `src/randevu.ts` does not exist on disk; the second Adım references a decision nobody wrote. `sarmal denetle .` reports it like this (real output, lines wrapped; messages are in Turkish today):

```
✖ plan/randevu.sar:9:19 [meyve-dosyası-eksik] Meyve "MYV-RANDEVU-UC" (tür: Kod) dosya-zorunlu
  bir teslim ama beyan edilen yol diskte çözülmüyor ("src/randevu.ts").
✖ plan/randevu.sar:11:50 [kırık-referans] 'referans: KRR-RANDEVU-03' hedefi çözülmüyor —
  bu KOD hiçbir .sar'da tanımlı değil.
```

Once the file is written and the reference fixed, the engine notices something else: the `src/` folder exists on disk but was never declared in the project's entry file.

```
✖ [beyansız-yapı] 'src/' diskte var ama randevu_anadizin.sar'da ilan edilmemiş — açılan her
  klasör giriş dosyasında bildirilmelidir; ilansız yapı zamanla plandan kopar.
```

Declare the folder and the scorecard is clean: sixteen nodes, three Adım, zero errors. The plan cannot lie and neither can the disk; when they diverge, no human has to notice.

## What changes for agents

The MCP server exposes the same files to an agent through eighteen tools. `sef` assembles an Adım's cone, that is its task, acceptance criteria, boundary, rationale and last run summary, into a single prompt; `gezin` returns a code's definition and every reference to it; `etki` tells which Adım are affected when a node is touched; `denetle-proje` returns the verdict for the whole project. The agent queries the graph instead of scanning files, and context survives a new session because it lives in the source, not in the chat. Producer and reviewer are separate roles; closing an Adım requires evidence, and the engine surfaces closings that have none.

## Who it is for

Long-lived projects run by one to three people, dense with decisions, where agents do most of the work. Not for a five-hundred-person monorepo; mature tools exist there and Sarmal would become a second source of truth. It does not compete with Git: Git keeps the history of lines, Sarmal keeps the plan-level meaning of the same change. It does not compete with an issue tracker either: it keeps no task list, it measures whether the work matches reality.

The language surface is Turkish by design: keywords, diagnostics and the canon are written in Turkish, and the extension and MCP texts are bilingual. English aliases for keywords are a planned second-version decision.

This repository is managed with Sarmal itself: the plan, status record and reminders under `is/` are the proof that the language runs on its own work, and they are published as they are.

The sections below are generated from canonical sources; only this introduction is written by hand.
<!-- SARMAL:ELLE-KORUNAN:SON -->

<!-- SARMAL:URETILEN:KOK-README-EN:BAS -->
<!-- SARMAL:DIATAXIS README -->
## Installation

The core requires Node 23.6 or newer: `cd urun/cekirdek && npm link` binds the `sarmal` command to your shell; the version requirement lives in `urun/cekirdek/package.json`. The extension installs from the marketplace once published; until then it is built inside `urun/eklenti` with `npm install && npm run build` and run with F5 in a development window ([urun/eklenti/README.md](urun/eklenti/README.md)). The MCP server starts over stdio with `node urun/cekirdek/src/mcp.ts`; for Claude Code, `claude mcp add sarmal -- node <repo>/urun/cekirdek/src/mcp.ts` is enough.

## First five minutes

1. `sarmal doğuş <folder> --tur proje --ad <Name>` creates the entry file, the first plan, the status record and the agent instructions in an empty folder.
2. `sarmal denetle <folder>` gives the first verdict; a newborn project starts with zero errors and its only open Adım is the founding dialogue.
3. The founding Adım writes no code: it declares the technology and the team in the entry file and replaces the starter kit's instruction texts with your own sentences.
4. `sarmal sef <ADIM-CODE> <folder>` prints an Adım's cone as the prompt to hand to an agent; `sarmal sonraki <folder>` lists the Adım that can run now.
5. `sarmal ogret` shows the welcome card, `sarmal başla` the template library, and `sarmal gezin <CODE> <folder>` a code's definition with every reference to it.

## Shelf map

[`yasa/kanon/`](yasa/kanon/) is the only address of the canon: eight section files hold 157 unique articles, 38 Decisions and 119 Rules. [`oz/siniflama/`](oz/siniflama/) is the type system; [`ogreti/`](ogreti/) carries templates, examples and teaching surfaces; [`is/`](is/) is Sarmal's own plan, status record and reminders; [`urun/cekirdek/`](urun/cekirdek/) is the engine, CLI and MCP server, [`urun/eklenti/`](urun/eklenti/) the VS Code extension. Documents are derived reading surfaces, not a second canon.

## Learn

[NEDIR.md](NEDIR.md) is the conceptual explanation (Turkish), [KAVRAMLAR.md](KAVRAMLAR.md) the reference index, [ROL-HARITASI.md](ROL-HARITASI.md) the open/closed role boundary, [urun/eklenti/README.md](urun/eklenti/README.md) the how-to for the extension and [oz/siniflama/kayit.md](oz/siniflama/kayit.md) the full type and field reference. Writing your own agent is part of the open capability: **Etmen · Beceri · Tetikleyici + sef**. `Etmen` declares identity and authority, `Beceri` holds applicable knowledge, `Tetikleyici` states when it applies, and `sef` assembles that context around an Adım.

## Contributing and license

Contribution flow is in [CONTRIBUTING.md](CONTRIBUTING.md), conduct in [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md), security reporting in [SECURITY.md](SECURITY.md). Sarmal is open under [Apache-2.0](LICENSE.md); third-party attributions live in [NOTICE.md](NOTICE.md). A separate closed product is managed with Sarmal; this document does not describe its contents.

## Measured surfaces

The new diagnostic set contains 47 errors, 16 warnings, and 11 informational diagnostics. The fixed registry routing matrix sends 143 items to Problems, 4 to Reminders, and 28 to Notifications (Observations). 174 diagnostic messages, the descriptions of 18 MCP tools, the manifest, the welcome card and these document surfaces are bilingual; the numbers are measured from source, never typed by hand.
<!-- SARMAL:URETILEN:KOK-README-EN:SON -->

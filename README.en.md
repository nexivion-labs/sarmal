<!-- SARMAL:ELLE-KORUNAN:BAS -->
# Sarmal

[![kapı](https://github.com/nexivion-labs/sarmal/actions/workflows/kapi.yml/badge.svg)](https://github.com/nexivion-labs/sarmal/actions/workflows/kapi.yml)

This short introduction is manually preserved; the product summary below is generated from canonical sources.
<!-- SARMAL:ELLE-KORUNAN:SON -->

<!-- SARMAL:URETILEN:KOK-README-EN:BAS -->
<!-- SARMAL:DIATAXIS README -->
Sarmal is an open workspace language that keeps software intent in declarative `.sar` sources and derives plans, rules, agent context, and diagnostic reading surfaces from those sources.

## One source, measured surfaces

The only canonical address is the eight section files under [`yasa/kanon/`](yasa/kanon/). They contain 157 unique articles: 38 Decisions and 119 Rules. Documents are derived reading surfaces, not a second canon.

The new diagnostic set contains 47 errors, 16 warnings, and 11 informational diagnostics. The fixed registry routing matrix sends 143 items to Problems, 4 to Reminders, and 28 to Notifications (Observations). All 174 diagnostic messages, the descriptions of 18 MCP tools, the manifest, welcome card, and agent language context have Turkish and English surfaces.

## Open boundary

Sarmal is open under [Apache-2.0](LICENSE.md). A separate closed product is managed with Sarmal; this document does not describe its contents.

Writing your own agent is part of the open capability: **Etmen · Beceri · Tetikleyici + sef**. `Etmen` declares identity and authority, `Beceri` holds applicable knowledge, `Tetikleyici` states when it applies, and `sef` assembles that context around an Adım.

## Start

Installation is a single step and requires Node 23.6 or newer: `cd urun/cekirdek && npm link` binds the `sarmal` command to your shell; the version requirement lives in `urun/cekirdek/package.json`. Use `sarmal ogret` for the canonical welcome card, `sarmal denetle .` to check a workspace, and `sarmal başla proje` to inspect the project template. Work that needs approval appears in the **APPROVALS (ONAYLAR)** panel. The Turkish primary surface is [README.md](README.md).
<!-- SARMAL:URETILEN:KOK-README-EN:SON -->

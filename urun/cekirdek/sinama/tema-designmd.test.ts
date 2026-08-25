// tema-designmd.test.ts — Tema ↔ DESIGN.md dönüştürücü (D3/D4) sınamaları

import { test } from "node:test";
import assert from "node:assert/strict";
import { designmdTema, temaDesignmd } from "../src/tema-designmd.ts";
import { belirtecle } from "../src/belirtec.ts";
import { ayristir } from "../src/ayristirici.ts";

const DESIGNMD = `---
name: Heritage
description: Architectural Minimalism
colors:
  primary: "#1A1C1E"
  secondary: "#6C7278"
  neutral: "#F7F5F2"
typography:
  h1:
    fontFamily: Public Sans
    fontSize: 3rem
rounded:
  sm: 4px
spacing:
  md: 16px
---

## Overview

Architectural Minimalism meets Journalistic Gravitas.
`;

test("D3: DESIGN.md → Tema .sar (renkler EN→TR eşlenir)", () => {
  const sar = designmdTema(DESIGNMD);
  assert.match(sar, /Tema\(\s*kod:\s*TEM-Heritage/);
  assert.match(sar, /ana:\s*"#1A1C1E"/);
  assert.match(sar, /ikincil:\s*"#6C7278"/);
  assert.match(sar, /nötr:\s*"#F7F5F2"/);
  assert.match(sar, /h1:\s*"Public Sans 3rem"/);
  assert.match(sar, /yuvarlaklık:.*sm:\s*"4px"/);
  assert.match(sar, /boşluk:.*md:\s*"16px"/);
});

test("D3 çıktısı motor-yeşil (üretilen .sar ayrışır)", () => {
  const sar = designmdTema(DESIGNMD);
  const program = ayristir(belirtecle(sar));
  assert.equal(program.bildirimler[0].ad, "Tema");
});

test("D4: Tema .sar → DESIGN.md (ana→primary, nested typography)", () => {
  const program = ayristir(belirtecle(designmdTema(DESIGNMD)));
  const md = temaDesignmd(program);
  assert.match(md, /name: Heritage/);
  assert.match(md, /primary: "#1A1C1E"/);
  assert.match(md, /neutral: "#F7F5F2"/);
  assert.match(md, /fontFamily: Public Sans/);
  assert.match(md, /fontSize: 3rem/);
});

test("round-trip: DESIGN.md → Tema → DESIGN.md → Tema (renk+font korunur)", () => {
  const md2 = temaDesignmd(ayristir(belirtecle(designmdTema(DESIGNMD))));
  const sar2 = designmdTema(md2);
  assert.match(sar2, /ana:\s*"#1A1C1E"/);
  assert.match(sar2, /nötr:\s*"#F7F5F2"/);
  assert.match(sar2, /h1:\s*"Public Sans 3rem"/);
});

test("D4: description/Overview export'ta korunur (ne = parametre)", () => {
  const md = temaDesignmd(ayristir(belirtecle(designmdTema(DESIGNMD))));
  assert.match(md, /description: Architectural Minimalism meets/);
  assert.match(md, /## Overview\n\nArchitectural Minimalism meets/);
});

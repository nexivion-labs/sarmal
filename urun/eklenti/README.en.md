# Sarmal: Plan & Guardrails for AI Agents

Write your project's plan, structure and rules in `.sar` files. Sarmal checks the plan against the disk on every save and serves the same truth to your AI agents over MCP.

Sarmal is an open-source language for declaring a software project's folder structure, plan and rules. It does not generate code; it keeps the why and the order of the code from getting lost. You declare the architecture and the work. The engine compares the declaration with the disk on every save and puts any drift in front of you as a diagnostic that explains the cause and the fix. The plan stops being a slide deck and becomes the one living, checked source of truth for the project, for you and for your AI agents alike.

![Visual Studio Code with Sarmal: Roadmap and Mini Graph on the left, a highlighted plan file in the middle, the Problems panel at the bottom](https://github.com/nexivion-labs/sarmal/raw/HEAD/urun/eklenti/medya/ekran/editor.png)

## What you get in the editor

Syntax highlighting and semantic coloring, an outline, folding, signature help, completion fed by the canon, format on save and clickable reference paths come with the install. Findings land in the editor's own Problems panel. Each of the 196 diagnostics has an English and a Turkish body, and each one explains the fix in full sentences instead of only naming the defect.

The side panels make the plan visible. Roadmap lists phases, blocks and steps with their status, Mini Graph draws the dependency skeleton, Approvals collects the gates that wait for a decision, and Reminders and Observations carry the engine's watches in plain language. The status bar shows their counters, and when the type registry cannot be found it says plainly that the built-in base canon is in use. No fallback is silent.

## One principle for the English window

Sarmal is a language with Turkish roots, and the extension keeps one simple rule for English users. A `.sar` file looks exactly the way it does in every other window: the file stays Turkish and nothing is painted over it. The interface, the diagnostics and the hover tips speak English, and they quote the real Turkish names found in your file, so what the message says is what you can search for in the source.

## Colors, MCP and privacy

The extension forces no color on you. The grammar emits standard scope names, so your own theme colors Sarmal source from the moment you install. If you want the canon's palette, the Sarmal Dark and Sarmal Light themes ship in the package, and so does the North Star product icon theme.

If you work with AI agents, the Sarmal core includes an MCP server with 18 tools. Agents read the plan through them, get a plan step's full context from the chef tool and move status through a single authoritative gate. Setup steps are in the repository README.

Sarmal is entirely local. The extension has zero runtime dependencies, makes no network calls and sends no data anywhere. The privacy policy explains how that claim was measured so you can repeat the measurement yourself.

## Links

Source, documentation and issues: https://github.com/nexivion-labs/sarmal. License: Apache-2.0. Developed by Nexivion Labs.

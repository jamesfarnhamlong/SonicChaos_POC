# Sonic Chaos — Windows proof of concept

A GameMaker proof of concept for recreating *Sonic Chaos* Master System behaviour on Windows. The current playable baseline is **POC 14.5**.

This repository tracks the current working project rather than storing a new copy of the whole project for every test build. Git history and version tags preserve milestones.

## Start here

- [POC 14.5 notes and test checklist](README_14_5.md)
- [Detailed historical prototype notes](README_POC.md)
- [Original-engine research and partial disassembly](https://github.com/jamesfarnhamlong/sonic-chaos-reference)

Open `SonicChaos_POC.yyp` in GameMaker LTS 2026 and run the first stage. Press **F3** for the Chaos movement/collision diagnostic overlay. See the 14.5 notes for the current test order and known limitations.

## Repository workflow

The root of this repository is always the newest complete source project. Experimental ZIPs and compiled builds stay outside the repository. Significant playable states can be preserved with Git tags such as `poc-14.5`.

When updating from a complete test ZIP, replace the project files in this working copy, review every change in GitHub Desktop, commit the source update, and push it. Any files intentionally removed by the new build must also be removed from this working copy.

## Scope and provenance

The original GameMaker project is derived from [Open Sonic SMS](https://github.com/joaoaraya/prj-openSonicSMS). The Chaos-specific work uses verified findings from the companion engine-reference repository.

No Sonic Chaos ROM is included. Sonic characters, graphics, audio, game code and related material belong to their respective rights holders. This is a non-commercial research and fan-development project.


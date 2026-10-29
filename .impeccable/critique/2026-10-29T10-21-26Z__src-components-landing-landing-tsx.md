---
target: la presentazione su / e /basics
total_score: 22
max_score: 32
na_heuristics: 7,10
p0_count: 0
p1_count: 3
target_identity: "file:/home/claude/guitar.coach/src/components/landing/landing.tsx"
target_fingerprint: "sha256:427f7cbbbdcead3672db86d79111db5f5239a24ed2499919c815f8e8a8e994ef"
target_path: /home/claude/guitar.coach/src/components/landing/landing.tsx
timestamp: 2026-10-29T10-21-26Z
slug: src-components-landing-landing-tsx
---
Method: dual-agent (A: design review · B: detector + browser). Target: src/components/landing/landing.tsx (the public presentation, Persuade) plus /basics with the four figures. Browser overlay skipped: no harness browser tab, Playwright screenshots only. Detector on .tsx sources: regex rules only, 0 findings (undercount). Detector on the rendered page via Chromium --no-sandbox: 21 findings (2 warning, 19 advisory).

| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 2 | Hero shows "G giusto" as if it happened; it is an example and does not say so |
| 2 | Match System / Real World | 2 | "tab", "pennata", "battuta", "si sale di 5 battiti", rhythm symbols unexplained |
| 3 | User Control and Freedom | 3 | No traps; no way back to top after the long table |
| 4 | Consistency and Standards | 4 | Same tokens, chips and buttons as the app |
| 5 | Error Prevention | 3 | Nowhere says a computer and a microphone are needed |
| 6 | Recognition Rather Than Recall | 3 | Rhythm symbols must be decoded |
| 7 | Flexibility and Efficiency | n/a | Persuade surface |
| 8 | Aesthetic and Minimalist Design | 2 | Six equal cards, then an 18-row table with a symbols column before the second CTA |
| 9 | Error Recovery | 3 | Nothing to get wrong on the page; a 500 from auth lands as a blank page (environment) |
| 10 | Help and Documentation | n/a | The page is the explanation; help sits behind the account |
| Total | | 22/32 (69%) | Acceptable, one point under Good |

Design specificity: half authored (the hero right side is built from the app's real pieces: ChordDiagram, TransitionHint, feedback band), half category template below it (three cards, dark block with numbered circles, 3x2 feature grid, table, final box). The hero is a photograph (aria-hidden): the title promises "someone who listens" and the page lets nobody be heard; every route redirects to /account.

Deterministic scan: 17 low-contrast, one cause: --color-chord-C #b06a14 with white 12px bold text = 4.27:1 (need 4.5), 13 chips in the table and 4 in the progressions block; 1 hero-eyebrow-chip; 1 line-length on the "Perché esiste" intro (~90 chars/line despite max-w-[68ch]); 2 straggler ("rosso.", "manico."). No numeric false positives.
Browser: all text contrasts above 5.5:1 except chip C; FCP 260ms; 0 console errors; no horizontal overflow at 1440/1024; click targets under 40px only "Brani" (58x20) and "Accedi" (71x20); heading outline without skips.

Priority issues:
- [P1] The offer is described, not demonstrated. Fix: a microphone try without account in the hero (play any string, detect.ts shows the note, nothing saved), consistent with PRODUCT.md. Product decision. /impeccable shape
- [P1] Nothing says a computer and a microphone are needed. Fix ctaNote: "Bastano un'email e una password. Serve un computer con microfono; sul telefono non ancora." Not a new claim: PRODUCT.md constraint. /impeccable clarify
- [P1] The "Dopo" card speaks like a teacher to someone without vocabulary ("L'anulare si sposta di una corda, stesso tasto, ..."). Fix: show instead a string flagged red in the diagram with the band "Non sento la corda Si" (existing play.feedback texts). Changes the scene, not facts. /impeccable clarify
- [P2] The songs section is a catalogue: 18 rows with symbols and "Si suona dalla Lezione 3"; "Tom Dooley (La)" reads as an article. Fix: the four lesson-2 songs with "Con due accordi, G e D, suoni già questi quattro" (count computed from path.ts), full table under "Tutti i 18", drop the Ritmo column. /impeccable distill
- [P2] "Cosa trovi dentro": six equal cards; "Anche per mancini" sixth. Fix: three cards and a text line; left-handed in the CTA note. /impeccable distill

Personas: Jordan trips on "tab", "battuta", "5 battiti", reads "qualcuno che ascolta" literally; no public help. Riley: DB down gives a bare 500 on sign-up; hero always "G giusto"; table min-w 720px scrolls without indicator. Beginner with guitar in hand: 4000px and an account before touching a string; nylon strings not addressed. Casey: out of scope today; the CTA note is what protects them.

/basics figures: style fits the tokens. 1024x1024 in a 280x240 object-contain box, drawn content occupies a fraction of the canvas (parts guitar ~93px wide). parts.svg: no labels, caption lists nine names pointing at nothing. sit.svg: stool without back vs "bordo della sedia", headstock below the shoulder vs "all'altezza della spalla". left.svg: fist grip from the bass side, knuckles out, thumb invisible: exactly what points 1-2 forbid; the placeholder teaches less wrong. pick.svg: almost the whole pick shows vs "punta: pochi mm". Cross-cutting: fixed 240px height leaves blank in sections 3 and 5; captions are name lists. ReadBox: "capotasto (linea spessa)" clipped right; "dito, con il numero" shows a dot without a number. At 1024x768 the sidebar clips "Insegnante" and "Aiuto".

Minor: "Brani" nav link hidden under sm; footer does not link /terms; intro line-length fix with max-w-[60ch]; brass button 17px only on landing.

Questions: why does the tuner sit behind the account if the account only syncs progress? What if the hero showed "Non sento la corda Si" instead of "G giusto"? Who decides a generated figure is right: the eye or a checklist next to the prompt in scripts/figures.json?

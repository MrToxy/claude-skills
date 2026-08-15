# Cookbook — the whiteboard

Load this only when a board file exists, the user drew one, or a decision has
more than three moving parts and you want to offer one.

Optional, always. Never block on a drawing, never ask the user to open a board
before answering, never reply with "see the board" — assume they will not look
at it.

Degradation, in order:

| State | What you do |
|---|---|
| User drew a board | Read it first. It is authoritative for structure. Append-only markup. |
| No board | Produce the same structure inline as text, and write a board file as a byproduct. |
| Board written, never opened | No loss. The inline version was the deliverable. |

So a board write is **in addition to** the explanation, never instead of it. The
inline form of a flow is a numbered list or `A --> B` text; the board just makes
it manipulable for someone who wants that.

**Ownership.** Tag every element you create with an id prefixed `sl-`. Elements
without that prefix are the user's:

- your own elements — rewrite, move, delete freely
- anything of theirs — never move, never delete, never tidy. Append near it and
  say in the chat what you added.

The moment a board contains one user-drawn element, the whole board switches to
append-only.

One board per effort: `.sight/<effort>/board.excalidraw`. Not one per phase —
phases are your boundaries, the system the user is drawing isn't cut that way,
and a per-phase board loses the through-line exactly where fog lifts. Not one
global board either; that accumulates unrelated topics until nothing on it can
be trusted.

Inside the board, one **frame per horizon**, named for the map row it belongs to
(`07 — tenant isolation`). Frames are addressable: say "frame 07" and the user
knows where to look, and you know which elements to read.

Throwaway boards are fine and expected: `probes/<nn>/board.excalidraw` dies with
its spike. Promote one out of the probe only if it explains a structural
decision, and then it lives next to the ADR, not on the effort board.

Never hand-write Excalidraw JSON. An element is ~30 fields and an arrow that
doesn't bind at both ends silently stops following its boxes:

```
sight add '[{"box":"Queue","at":[0,0]},{"box":"Worker"},
            {"arrow":["Queue","Worker"],"label":"events"},
            {"frame":"07 — tenant isolation","contains":["Queue","Worker"]}]'
sight ids            # every id on the board, mine (sl-) vs theirs
sight board .sight/<effort>/board.excalidraw    # → localhost:3777, autosaves
```

Boxes are referenced by label, so you never track ids. `board-add.mjs` refuses
to reframe an element that isn't `sl-` prefixed.

Setup, once per repo, only if you want the board offline:

```
npm i -D @excalidraw/excalidraw react react-dom esbuild
```

First `board` run bundles it into `.sight/vendor/` (~8MB, excluded from git,
rebuilt per machine). Without those packages the CDN fallback still works, but
needs network.

If the board file exists, it is a first-class input — read it at the start of
every session, before MAP.md.

### Starting from a sketch

When a board does exist it often predates everything else: the user had a rough
idea and drew it rather than writing it. That sketch is then the best available
statement of intent — read it before asking a single question.

What to do with it:

1. **Restate it as a numbered flow** and ask which edges are wrong. The drawing
   is a claim; check it against the code.
2. **Mine the gaps — they are the fog.** A rough sketch's ambiguities map almost
   one-to-one onto the Phase 0 question list:

| On the board | Question it generates |
|---|---|
| unlabelled arrow | what crosses here, and in what shape? |
| box with no inbound arrow | who triggers this? |
| two boxes at the same level, no edge | ordering, or independence? |
| a cloud, a `?`, a scribble | flagged uncertainty — likely a PROBE row |
| same word on two boxes | one thing or two? glossary decides |

3. **Source questions to elements** so the user can see where each came from:
   `Q3 ← arrow queue→worker (unlabelled)`.

Rules:
- **Never tidy the sketch.** Redrawing it neatly destroys the signal in what was
  left vague, and takes the drawing away from the person who made it.
- Roughness is not a defect to be fixed before work starts. A messy board with
  three question marks is more useful than a clean one that guessed.
- Fidelity grows as fog lifts: scribble → labelled edges → frames per horizon.
  The board is where remaining fog stays visible.

Excalidraw files are JSON: `elements[]` with `type`, `text`, and arrow
`startBinding`/`endBinding` pointing at element ids. Boxes and arrows recover as
a real graph, so a hand-drawn flow is readable structure, not a picture.

Use it to:
- Extract the flow the user drew, restate it as a numbered list, and ask which
  edges are wrong. Their drawing is a claim about the system; check it against
  the code.
- Mark up: append elements in a distinct colour for what you'd add, with a text
  label saying why. Never move or delete what the user drew.
- Show a probe's result as a diff on the board where the decision is
  structural.

Rewriting the whole file is expensive and destroys their layout — append near
the relevant element instead, and say in the chat what you added.

No board? A dropped photo or screenshot of one still works as input; the
round-trip doesn't. Offer to start a board when a decision has more than three
moving parts.

# Accessibility playtest — wanted: blind and low-vision players

> **Open call, since 2026-09-01.** The game is public ([itch.io](https://zrebec.itch.io/minefield) ·
> [GitHub Pages](https://zrebec.github.io/minefield/)) and its audio accessibility layer has never
> been tested by anyone who actually plays without sight. This document is the brief: what we built,
> what we are unsure about, and the exact questions whose answers would change the code.
> Companion references: [`accessibility-sonar-beacon.md`](accessibility-sonar-beacon.md) (the audio
> encoding), [`accessibility-orientation.md`](accessibility-orientation.md) (`E`/`G` bearings),
> [`accessibility-detector.md`](accessibility-detector.md) (the deaf-side visual detector).

## Why this call exists

Minefield publicly promises that v1.0 is **playable start to finish by blind players** — not
"compatible", playable. The whole game is a deduction puzzle whose only real input is sound: the
mines are never shown to anyone.

That promise is currently backed by **one pair of sighted, hearing ears**. Every mapping in the
game — pan for east/west, pitch for north/south, volume for distance — was chosen from first
principles and tuned by ear by the author, who is not the player this was built for. The mappings
are internally consistent, which is not the same as being *readable*. We do not know:

- whether **higher pitch = north** is the intuitive direction, or backwards;
- whether the sonar sweep reads as a **map** or as a burst of noise;
- whether the earcons are **telling each other apart** in real play;
- whether the spoken layer helps, or interrupts at the worst moment (the author's own verdict on it
  is "it talks too much", but that is a sighted person's judgement of a screen reader).

**One honest paragraph from a screen-reader player is worth more than another month of guessing.**
You do not need to finish a run, and you do not need to write a report — a single "this one is
backwards" is a useful answer.

## Where to play

- **Browser:** <https://zrebec.itch.io/minefield> or <https://zrebec.github.io/minefield/>
- The game opens on a loading picture and waits for **one key** (`Enter`, gamepad Start, or a tap).
  That key is also what unlocks sound — browsers refuse audio until a real key press.
- Press **`H`** on any screen for the full spoken briefing: goal, controls, rules, glossary, and what
  every sound means. It is the intended entry point; nothing else has to be read first.
- **Headphones matter.** Direction is carried by stereo panning, which a mono speaker collapses to
  nothing. If you play on a laptop speaker, please say so — half the cues are gone by design.

## Tell us about your setup

Please include, even in a one-line report:

| | Why it matters |
|---|---|
| **Screen reader + version** (NVDA, JAWS, VoiceOver, Orca, TalkBack…) | Live-region behaviour differs sharply between them — especially how `assertive` interrupts |
| **Browser + OS** | Web Audio panning and live-region timing are both browser-specific |
| **Headphones / stereo speakers / mono** | Pan is half of the directional information |
| **Your hearing** (if relevant) | Some cues sit at 110–140 Hz, some at 700+; a high-frequency loss changes what "audible" means |
| **Screen reader speech rate** | Fast speech changes whether spoken lines arrive in time to act on |

## What we are unsure about

Each section names what the game currently does, then the question. Answer any subset — skipping the
rest costs nothing.

### 1. The step warning (fires after every step)

The core signal: how many of the **four orthogonal cells** around you hold a mine (diagonals never
count — you cannot move diagonally). A pip pattern, no direction:

| Adjacent mines | Sound |
|---|---|
| 0 | silence |
| 1 | 250 Hz · 1 very short tick (20 ms) |
| 2 | 740 Hz · 2 pips |
| 3 | 587 Hz · 3 pips |
| 4 | 440 Hz · 4 pips |
| 5–6 | 330 / 220 Hz · 5–6 fast pips |
| 7–8 | 110 Hz · 3–4 long low pulses |

**Questions.** Can you count the pips reliably while moving, or do you go by pitch? The "1 mine" tick
is deliberately small and quiet, which **breaks the pitch ladder** (1 is *lower* than 2, 3 and 4) —
does that read as "barely anything, relax", or does it confuse the scale? Is silence-for-zero a
comfortable "safe" or an ambiguous "did the game hear me?"

### 2. Sonar sweep — `D` (unlimited, ~2 s per sweep)

One blip per live mine within **5 cells**, nearest first, one every 120 ms, up to 16 blips:

- **pan** = east/west of you (right-hand mine → right ear),
- **pitch** = north/south — **higher = north**, 440 Hz on your row, ±55 Hz per row (≈165–715 Hz),
- **volume** = distance — nearer is louder,
- **nothing in range** = one low 140 Hz blip ("all clear").

**Questions.** Is *higher = north* the direction you expect, or is it inverted for you? With many
mines in range, does the sweep build a picture, or collapse into a chord you cannot parse — and if
so, would fewer blips (a smaller radius) or a slower sweep help more? Can you tell the "all clear"
blip apart from a single distant mine? Does pressing `D` twice in a row help you re-read it, or do
you want a repeat key that replays the last sweep verbatim?

### 3. Exit beacon — `E` (also speaks the exit's bearing)

A single 200 ms tone:

- **volume = how close you are to the exit column** — this is *inverted* from what people usually
  assume: at the start of a run (≈31 columns away) it is a near-silent whisper, and it **swells** as
  you move east, reaching full volume within 3 columns of the exit;
- **pitch = north/south**, same rule as the sonar (higher = exit is north), but a much finer step:
  18 Hz per row against the sonar's 55;
- **exactly on the exit's row** the tone becomes a **double beep** — "you are level, go straight
  east".

**Questions.** Does "louder = closer" read correctly, or did you first hear it as "loud = far, this
is urgent"? Is 18 Hz per row enough to tell one row from the next, or does it need the sonar's
coarser step? Is the double beep unmistakable? And: the beacon is *not* played automatically at run
start (it would be inaudible at that distance) — did you miss it there?

### 4. The other earcons

| Event | Sound |
|---|---|
| **Flag placed** (`F`, or Shift+arrow) | 90 ms blip, **panned** to the flagged cell, **pitched** up/down for north/south (440 Hz ±120) |
| **Flag taken back** | 110 Hz, 40 ms, centred — deliberately carries *no* position |
| **Step refused** by a wall, fence, building or the board edge | descending double beep, 190 → 130 Hz, centred |
| **Pause / resume** | two tones, 494 → 330 descending for pause, 330 → 494 ascending for resume, plus the word "PAUSE" |
| **Gem collected** | a rising chime, 880 Hz upward, higher with each gem in a combo |
| **Footstep** | a short low crunch, different per terrain (grass / snow / dust) |
| **Enemy plane** | an approaching drone, plus a spoken warning and a spoken result of its drop |

**Questions.** Which two of these do you confuse? We already suspect **flag-removal (110 Hz)** sits
on top of the **7–8 mine warning (110 Hz)** — different length, same pitch — and that the blocked-move
beeps (130/190 Hz) are close neighbours to both. Does that happen in play, or only on paper? Is the
flag-placement blip's position information actually usable when you are flagging by triangulation?
Should gems get a **directional** earcon like the sonar, instead of only the spoken `G` bearing?

### 5. The spoken layer (your screen reader, not ours)

The game never speaks for itself — it writes into ARIA live regions and your screen reader does the
talking (deliberate; there is no built-in TTS). `assertive` carries warnings and explosions;
`polite` carries score, level, mode, gem pickups and the plane.

**Questions.** Is the balance right, or does the assertive channel cut your reader off mid-sentence
at the moment you most needed the previous line? Do spoken lines arrive **fast enough to act on**, or
does the beep get there first and the words arrive after you have already moved? Is the `H` briefing
too long to sit through — should it be sectioned (controls / rules / sounds) rather than one block?
What is missing entirely? (Two candidates are already on our list and parked pending this playtest:
a key that reads the **remaining time**, and letter echo when typing your 3-character high-score
name — which today is silent.)

### 6. Getting in and getting around

**Question.** Walk us through your first two minutes: the loading key, the title screen, the story
intro (any key skips), starting a run, the first step. Where did you have to guess? The title screen
mirrors its menu and the high-score table into a browsable (non-live) region, and a short hint
region points at `H` — did you find them, or did your reader go straight past?

### 7. Fairness

`E` (exit) and `G` (nearest gem, its colour, how many are left) exist because a sighted player *sees*
the exit gap and the gems before taking a step. We consider them **parity, not assistance** — the
mines stay hidden for everyone — so runs that use them are not flagged on the leaderboard.

**Question.** Does that hold up from your side? Is anything still one-sided — information a sighted
player gets for free that you have to work for, or the reverse?

## What is not up for change

Not to shut down discussion — just so nobody spends their effort on a door we have already closed:

- **The mines stay hidden.** Every player deduces them from the warning counts. Any "just show the
  nearby mines" answer breaks the game for everyone equally.
- **No continuous danger compass.** A stereo cue that constantly named the dominant mine direction
  shipped once and was reverted: it fired without adjacent danger, collided semantically with the
  step warning, and told you nothing about which *step* was safe. On-demand cues (`D`, `E`, `G`) are
  the accepted shape. See `accessibility-orientation.md` → "Compass post-mortem".
- **No built-in speech synthesis.** Your screen reader, your voice, your speed.

Everything else — every frequency, every mapping direction, the pacing, the wording, which events
deserve a sound at all — is open.

## How to send it

- **itch.io:** a comment on <https://zrebec.itch.io/minefield> (no GitHub account needed).
- **GitHub:** an issue at <https://github.com/zrebec/minefield/issues> — title it
  `a11y playtest: <what>`.

A useful report is short: your setup line, then one sentence per thing that was wrong, backwards, or
inaudible. "The sonar pitch is upside down for me" is a complete and actionable report.

Thank you — genuinely. This is the one test the game cannot run on itself.

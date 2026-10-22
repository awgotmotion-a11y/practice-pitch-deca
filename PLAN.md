# DECA Prep App: Plan

Goal: one app where a DECA competitor can (1) drill cluster exams and vocab weighted exactly like the real test, and (2) run a full role-play or pitch against an AI judge that runs the room the way state and ICDC judges do, then shows them what to fix.

---

## 1. What already exists (researched 2026-10-22)

| Product | What it does well | Gap we can beat |
|---|---|---|
| **PI Coach** (trypicoach.com) | Original scenario per event/level, real 10-min prep timer, speech transcription (wpm, fillers, pauses), per-PI scoring Novice→Exemplary with the transcript quote that earned it, 830 flashcards, Blitz drills, no-account trial (3 free) | Judge questions are post-hoc, not a live conversation. Little exam-bank depth. |
| **Decademy** (decademy.app) | 40,000+ original MC cluster questions, AI role-plays | Volume over quality; no published item quality data |
| **Prilo** (prilo.ai/deca) | AI judge with *visual* (webcam) analysis, PI scoring, exam analytics, custom exam uploads, topic mastery | General-purpose prep brand, not DECA-native |
| **Case Ace** (caseace.app) | Mic + camera spoken practice, "next rep" loop, 3 free | Thin exam side |
| **GlassEDGE** (glassedge.org) | Free, run by ICDC finalists; written-event gallery; AI rubric feedback + transcript | Free/volunteer; limited depth and polish |
| **Decka** (iOS app) | Unlimited role-plays, practice tests, flashcards on mobile | Mobile only, generic AI feedback |
| **DECA Coach** (deca-coach.vercel.app) | Small hobby project | — |
| **DECA+** (official, $295/chapter/yr) | Real past association + ICDC exams (14) and scenarios (81), written-event winners | Static PDFs, no practice loop, no feedback |

**Takeaway:** the baseline everyone has is scenario generation + AI feedback + flashcards. To stand out we need **(a) a live, voice-to-voice judge**, **(b) proof that our scores match real judges**, **(c) exams weighted to the official blueprint for each level**, and **(d) a chapter/advisor product** (that's where the money is: DECA+ already shows chapters will pay per seat).

### ⚠️ DECA+ content cannot go into the app
DECA+'s acceptable use policy forbids posting or sharing any exam, scenario or written entry "in whole or in part" outside the buying chapter. A chapter that breaks this **loses state and ICDC eligibility**, and the whole association can lose access to exams. So once you get DECA+ access:
- **OK:** reading it yourself to learn the style, difficulty, scenario length and how judge questions are phrased.
- **Not OK:** copying, paraphrasing, uploading, or using it as model training or few-shot data for a public app.

All content in the app has to be original (that's what PI Coach, Decademy and Case Ace say too). Use "DECA-style" wording and add a "not affiliated with DECA Inc." disclaimer, since DECA is a trademark.

---

## 2. How the real events work (what we're simulating)

- **Cluster exam:** 100 multiple-choice items. The instructional-area mix depends on the cluster *and* the level (district, association, ICDC). The official 2026-27 counts are in [data/blueprint-2026-27.json](data/blueprint-2026-27.json). Example: Finance puts 24 / 28 / 30 items on Financial Analysis at district / state / ICDC.
- **Individual role-play:** 10 min prep with notes, then up to 10 min in front of a judge who plays a character (owner, manager, client). The judge asks follow-up questions and scores the listed Performance Indicators (usually 5) plus 21st Century Skills on the official evaluation form.
- **Team decision making:** 2 people, 30 min prep, up to 15 min presentation, judge Q&A.
- **Written and pitch events** (business plans, Innovation Plan, Start-Up, etc.): a pre-made deck or plan, a timed presentation, then judge Q&A against that event's rubric.
- Performance Indicators come from DECA's 7 PI lists (Business Admin Core, BM+A, Entrepreneurship, Finance, Hospitality, Marketing, PFL). Load the current list from the DECA Guide each year.

> Before Phase 1, check timings and rubric point values against the current DECA Guide (issuu.com/decainc). They change year to year.

---

## 3. Features

### Must-have for launch (MVP)
1. **Event picker:** cluster → event → level. Everything else keys off this.
2. **Exam bank:**
   - Original MC items tagged `cluster / instructional area / PI / difficulty`, each with an explanation.
   - **Full mock exam** sampled to the blueprint counts for the chosen level.
   - **Topic drills** on one instructional area.
   - Results broken down by instructional area.
3. **Vocab:** terms tied to PIs, with spaced repetition (FSRS algorithm) and a timed blitz mode.
4. **AI role-play judge (voice):**
   - Generates an original scenario for the event's PIs.
   - Real prep timer with a notes pad.
   - The student talks; the judge **speaks back in character** and asks 2–3 follow-ups based on what the student actually said.
   - Hard stop at the time limit.
   - Score sheet laid out like the official form. Each PI gets a score plus the transcript quote that earned it and one concrete fix.
   - Delivery stats: wpm, filler words, pauses.
5. **Accounts and history:** saved sessions, progress over time. A few free reps without an account (PI Coach's no-signup trial lowers the barrier).

### What will set us apart
6. **Judge calibration you can show people:**
   - Collect 100–200 real role-play recordings that experienced judges or advisors scored by hand (with consent).
   - Measure how closely the AI's scores match theirs (quadratic weighted kappa) and publish the number. None of the competitors do this.
7. **One weak-area loop:** missed exam questions in, say, Pricing automatically queue a Pricing vocab set and a role-play whose PIs include Pricing.
8. **Judge personas and difficulty:** friendly district judge vs. tough ICDC judge who interrupts and pushes back on numbers.
9. **Pitch / written-event mode:** upload the deck or plan, present it, get a mock Q&A pulled from the document's weak spots, and get scored on that event's rubric. The repo name points here.
10. **Team mode:** 2 students in one session, 30/15 timers, judge questions directed at each partner.
11. **Advisor / chapter dashboard:**
    - Assign events.
    - See each member's weak areas.
    - Chapter leaderboard.
    - Per-seat billing, priced against DECA+'s $295.
12. **Webcam delivery feedback** (eye contact, posture), opt-in. Prilo has this. Add it later.

### Leave out until users ask
Native mobile app (build a PWA first), social features, live human-judge marketplace.

---

## 4. Should we "train a model"? Not at first.

- **Don't fine-tune at launch.** A strong LLM (Claude) prompted with the event's PIs, the official rubric wording and a few original sample transcripts per score band already does the job. You'd also have no legal training data for fine-tuning: DECA+ is off-limits.
- **What needs to be built is the evaluation set** from feature 6. It tells you whether prompt changes help or hurt.
- **Fine-tune or distill later**, once you have thousands of consented sessions with human scores, to lower cost and raise agreement.
- **Question generation:**
  1. The LLM drafts items per instructional area and PI.
  2. Strong competitors (chapter officers, ICDC finalists) review them before they go live.
  3. Track per-item stats (% correct, discrimination) and retire bad items automatically.
  4. Aim for about 3–5k reviewed items. Quality beats Decademy's raw 40k.

---

## 5. Suggested stack (boring on purpose)

| Need | Choice | Why |
|---|---|---|
| App | **Next.js (React) + TypeScript, deployed on Vercel** | One codebase for web and PWA |
| DB, auth, file storage | **Supabase** (Postgres + Auth + Storage) | Accounts, sessions, audio, row-level security for chapters |
| Judge and generation | **Claude API** (Sonnet for live turns, Opus for final scoring and item writing) with structured JSON output | Rubric-shaped scores and quotes come back typed |
| Speech-to-text | Deepgram or OpenAI Whisper (streaming) | Live transcript and filler counts |
| Judge voice | ElevenLabs or OpenAI TTS (streaming) | Judge talks back in under ~1s |
| Payments | Stripe (individual subscriptions + chapter seats) | |
| Analytics / errors | PostHog + Sentry | |

---

## Beta status (2026-10-22)
Built:
- Blueprint mock exams and topic drills (222 original seed items across all 31 instructional areas).
- Vocab: 165 terms, flashcards and a 60s Blitz.
- Weak-area loop: dashboard → drill / vocab / targeted role-play.
- Voice AI judge: Web Speech API, follow-ups per level, scoring on 70 PI + 30 21st Century Skills points, delivery stats.
- Access-code gate.

Not yet built: accounts and server DB, advisor dashboard, calibration eval set, pitch / written-event mode, payments, reviewed bank at 3–5k items (run `scripts/generate-items.mjs`).

## 6. Course of action

**Phase 0: Foundations (week 1)**
- [ ] Pick a name. Clear the trademark: never use "DECA" in the product name.
- [ ] Pull the current PI lists, event list, timings and evaluation-form wording from the DECA Guide into `data/`.
- [ ] Recruit 3–5 strong competitors or advisors as reviewers and judge-scorers. They are the moat.

**Phase 1: Exam + vocab MVP (weeks 2–4)**
- [ ] Data model: `items`, `vocab`, `attempts`, `users`.
- [ ] Generate a first batch of items for one cluster (Marketing is the largest), review them, publish.
- [ ] Blueprint-weighted mock exam, topic drills, IA breakdown, FSRS flashcards.
- [ ] Ship to your own chapter. Watch real usage.

**Phase 2: AI judge (weeks 4–8)**
- [ ] Scenario generator per event and PIs (original scenarios only).
- [ ] Text version first: prep timer → typed answer → rubric score with quotes. This validates the scoring prompt cheaply.
- [ ] Then voice: streaming speech-to-text → in-character judge follow-ups → text-to-speech → hard time limit.
- [ ] Delivery metrics.
- [ ] Build the human-scored evaluation set and report the agreement score. Iterate until it is close to how much two human judges agree with each other.

**Phase 3: Make it a product (weeks 8–12)**
- [ ] Accounts, history, progress charts, weak-area loop.
- [ ] Stripe: free tier (a few reps per month), student plan, chapter seats.
- [ ] Advisor dashboard.
- [ ] Privacy:
  - Users are minors (mostly 14–18). Require parent consent under 13.
  - Get explicit consent before storing recordings, and let users delete them.
  - Write a privacy policy that schools will accept (FERPA, if schools sign up).
- [ ] Rate limits and a cost cap per user (LLM and voice calls are the main cost).

**Phase 4: Launch (time it to the season)**
- [ ] Beta with 2–3 chapters **before districts (Dec–Jan)**. Public launch before state CDCs (Feb–Mar). ICDC push in April.
- [ ] Growth: r/DECA, chapter officers, advisors, short TikTok/YouTube clips of the judge in action.
- [ ] Each year: refresh items for the new blueprint and PIs, which DECA publishes before every season.

**Later:** pitch / written-event mode, team mode, webcam feedback, mobile app.

---

## 7. Risks
- **Copyright / DECA policy:** keep all content original (see §1).
- **Judge accuracy:** scores that are confidently wrong destroy trust. Only claim accuracy you've measured.
- **Voice latency and cost:** cap session length and cache scenarios.
- **Seasonality:** usage spikes Dec–Apr. Chapter subscriptions smooth revenue.

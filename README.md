# PitchPrep (beta): DECA-style practice

Cluster exam practice weighted to the official 2026–27 blueprint, spaced-repetition vocab, and an AI role-play judge you present to out loud. See [PLAN.md](PLAN.md) for the roadmap.

## Run it
```bash
npm install
cp .env.example .env.local   # add your ANTHROPIC_API_KEY
npm run dev                  # http://localhost:3000
```
Exams and vocab work without a key. The role-play judge needs one.

## What's in the beta
| Area | Where |
|---|---|
| Event / level picker, weak-area dashboard | `app/page.tsx` |
| Blueprint mock exams, topic drills, missed-question review | `app/exam/page.tsx`, `lib/deca.ts` |
| Flashcards (Leitner boxes) and 60s Blitz | `app/vocab/page.tsx` |
| AI judge: scenario → prep timer → voice presentation → live follow-ups → scored evaluation form | `app/roleplay/page.tsx`, `app/api/ai/route.ts`, `lib/speech.ts` |
| Question bank / vocab / blueprint | `data/` |

Progress is saved in each student's browser (localStorage). Accounts come later.

## Growing the question bank
```bash
node scripts/generate-items.mjs 20                       # 20 new questions for every instructional area
node scripts/generate-items.mjs 30 "Pricing,Promotion"   # specific areas
```
New items land in `data/items.generated.json` and show up in the app right away. Have a strong competitor review them, then move the good ones into `data/items.json`.

**Content rule:** everything must be original. Never paste in DECA+ exams/scenarios or questions from other prep sites.

## Launch checklist (what's left for a human)
Everything else is built and tested. These steps need your accounts:

1. **Get an API key.** Create one at console.anthropic.com. Under Billing → Limits, set a **monthly spend limit** (start around $25 for a beta). Everyone shares the access code, so the spend limit is your real cost protection.
2. **Deploy on Vercel.** Sign in at vercel.com with GitHub, then **Add New → Project** and import `practice-pitch-deca`. The defaults work. Before deploying, add these environment variables:
   - `ANTHROPIC_API_KEY`: your key
   - `BETA_ACCESS_CODE`: a code only chapter members get
3. **Officer test run (about 30 minutes).** Before sharing, have 2–3 strong competitors each run 2–3 role-plays across different events and levels. Check that:
   - scenarios read like real DECA role-plays
   - the judge's questions respond to what was actually said
   - scores land within roughly ±10 of what an experienced judge would give
   Note anything off and send it back.
4. **Advisor OK.** Show your advisor the Privacy page (`/privacy`). Answers are sent to an AI service, members are minors, and nothing is stored on a server.
5. **Share** the URL and access code with members. Voice input works best in Chrome and Edge on a laptop. On phones, typing is more reliable.

**Re-check the scoring forms each season.** Forms per event type live in `formFor()` in `lib/deca.ts`. Principles, Series and PFL were checked against DECA's public 2023–2025 sample events. The Team Decision Making form comes from an older public sample, so confirm it against the current DECA Guide.

## Checking the data
`npm run check` validates every question and prints how full each cluster's mock exam is. Run it after adding questions.

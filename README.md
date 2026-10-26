# PitchPrep (beta): DECA-style practice

Cluster exams weighted to the official 2026–27 blueprint, spaced-repetition vocab, and live voice judges you present to out loud: role-plays for every DECA role-play event, plus the Pitch Room (DECA Judge for business plans, Q&A Drill, Shark Tank, Cold Call, Professional Selling). See [PLAN.md](PLAN.md) for the roadmap.

## Run it
```bash
npm install
npm run dev:vinext            # http://localhost:3001 (needs `npx wrangler login` for the AI binding)
npm run deploy:vinext         # deploys to Cloudflare Workers
```
No API key needed. The AI runs on Cloudflare Workers AI (`@cf/openai/gpt-oss-120b` for the judge and scoring, MeloTTS for the judge's voice) on the account's free daily allowance. `app/api/ai/route.ts` stops at 9,000 of the 10,000 free neurons a day, so it never bills; a full role-play costs about 360, so roughly 25 sessions a day. The limit resets at 8 PM Eastern.

## What's in the beta
| Area | Where |
|---|---|
| Event / level picker, weak-area dashboard | `app/page.tsx` |
| Blueprint mock exams, topic drills, missed-question review | `app/exam/page.tsx`, `lib/deca.ts` |
| Flashcards (Leitner boxes) and 60s Blitz | `app/vocab/page.tsx` |
| Role-play: scenario from real PIs → prep timer → live voice judge with 2 follow-ups → 2026–27 evaluation form | `app/roleplay/page.tsx` |
| Pitch Room: DECA Judge, Q&A Drill, Shark Tank, Cold Call, Professional Selling | `app/room/page.tsx`, `lib/personas.ts` |
| Live voice engine (mic, speech-to-text, turn-taking, recording, delivery metrics) | `lib/room.ts`, `components/LiveRoom.tsx` |
| Judge prompts and scoring | `lib/judge.ts`, `app/api/ai/route.ts` |
| Official 2026–27 evaluation forms | `lib/forms.ts` (`npx tsx lib/forms.ts` checks every form totals 100) |
| Question bank (818), vocab, blueprint, BA Core PIs | `data/` |

Progress is saved in each student's browser (localStorage). Accounts come later.

## Growing the question bank
`data/items.generated.json` holds 401 original items added Oct 2026 so mock exams don't repeat. Have a strong competitor review them, then move the good ones into `data/items.json`. (`scripts/generate-items.mjs` still uses the Anthropic API and needs a key.)

**Content rule:** everything must be original. Never paste in DECA+ exams/scenarios or questions from other prep sites.

## Launch checklist (what's left for a human)
1. **Access code (recommended).** The free AI budget is shared by everyone with the link. Set a code only chapter members get: `npx wrangler secret put BETA_ACCESS_CODE`.
2. **Officer test run (about 30 minutes).** Have 2–3 strong competitors each run 2–3 sessions across events and levels. Check that scenarios read like real DECA role-plays, the judge's questions respond to what was said, and scores land within roughly ±10 of an experienced judge.
3. **Advisor OK.** Show your advisor the Privacy page (`/privacy`). Answers are sent to an AI service, members are minors, and nothing is stored on a server.
4. **Share** the URL and access code. Voice works best in Chrome or Edge on a laptop; on phones, typing is more reliable.

**Re-check the scoring forms each season.** `lib/forms.ts` follows the 2026–27 DECA Guide and DECA's 2026 sample events: Novice/Developing/Proficient/Exemplary levels, Solution and Career Competencies rows, Team Decision Making cut to 5 PIs. Marketing Management Series was dropped for 2026–27.

## Checking the data
`npm run check` validates every question and prints how full each cluster's mock exam is. Run it after adding questions.

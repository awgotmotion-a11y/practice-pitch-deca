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

## Deploy for your chapter (Vercel)
1. Push to GitHub and import the repo at vercel.com.
2. Add `ANTHROPIC_API_KEY` and `BETA_ACCESS_CODE` in Project → Settings → Environment Variables.
3. Share the URL and access code with members. Voice input works in Chrome and Edge. Other browsers can type.

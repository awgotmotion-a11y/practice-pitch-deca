import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { eventByCode, formFor, maxOf, type Bands } from "@/lib/deca";

export const maxDuration = 120;

const client = new Anthropic();
const MODEL = "claude-opus-5-5";


const Scenario = z.object({
  title: z.string(),
  company: z.string(),
  studentRole: z.string().describe("Who the participant plays, e.g. 'marketing consultant'"),
  judgeName: z.string(),
  judgeRole: z.string().describe("Who the judge plays, e.g. 'owner of FreshBlend'"),
  situation: z.string().describe("3-5 short paragraphs of background, constraints and numbers"),
  task: z.string().describe("What the participant must present and recommend"),
  pis: z.array(z.object({ text: z.string(), ia: z.string() })),
});

const Question = z.object({ say: z.string() });

const Score = z.object({
  pis: z.array(
    z.object({
      pi: z.string(),
      score: z.number(),
      level: z.enum(["Little/No Value", "Below Expectations", "Meets Expectations", "Exceeds Expectations"]),
      quote: z.string().describe("Exact words from the transcript that earned the credit, or '' if none"),
      feedback: z.string(),
      fix: z.string().describe("One concrete thing to say or do next time"),
    }),
  ),
  skills: z.array(z.object({ skill: z.string(), score: z.number(), feedback: z.string() })),
  summary: z.string(),
  topFixes: z.array(z.string()),
});

const PERSONAS: Record<string, string> = {
  district: "a friendly, encouraging district-level judge. Ask clear, fair follow-up questions.",
  association: "an experienced state-level judge. Ask probing follow-ups that test whether the plan would really work.",
  icdc: "a demanding ICDC judge and seasoned executive. Push back on weak reasoning, ask for numbers, timelines and trade-offs, and challenge one assumption directly.",
};

const Body = z.object({
  kind: z.enum(["scenario", "question", "score"]),
  event: z.object({ code: z.string(), name: z.string(), cluster: z.string(), team: z.boolean().optional() }),
  level: z.enum(["district", "association", "icdc"]),
  areas: z.array(z.string()).max(30).default([]),
  focus: z.array(z.string()).max(5).default([]),
  scenario: Scenario.optional(),
  transcript: z.array(z.object({ who: z.enum(["student", "judge"]), text: z.string().max(20000) })).max(20).default([]),
  delivery: z.object({ wpm: z.number(), fillersPerMin: z.number(), longPauses: z.number() }).optional(),
});

async function ask<T extends z.ZodType>(schema: T, system: string, user: string, effort: "low" | "medium" | "high") {
  const res = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort, format: betaZodOutputFormat(schema) },
    system,
    messages: [{ role: "user", content: user }],
  });
  if (res.stop_reason === "refusal" || !res.parsed_output) throw new Error("The AI declined or returned no result. Try again.");
  return res.parsed_output as z.infer<T>;
}

const LABELS = ["Little/No Value", "Below Expectations", "Meets Expectations", "Exceeds Expectations"];
const bandText = (b: Bands) => b.map(([lo, hi], i) => `${LABELS[i]} ${lo}-${hi}`).join(", ");

const SYSTEM = `You simulate DECA competitive-event role-plays for high school students practicing for competition.
Everything you write must be original. Never reproduce or paraphrase official DECA exams or scenarios.`;

export async function POST(req: Request) {
  const code = process.env.BETA_ACCESS_CODE;
  if (code && req.headers.get("x-access-code") !== code) {
    return Response.json({ error: "Access code required" }, { status: 401 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Bad request" }, { status: 400 });
  const b = parsed.data;
  // Trust our own event table, not the client's copy of it.
  const ev = eventByCode(b.event.code);
  const form = formFor(ev);
  const ctx = `Event: ${ev.name} (${ev.code}), ${ev.cluster} cluster, ${b.level} level${ev.team ? ", team of two presenting together" : ""}.`;

  try {
    if (b.kind === "scenario") {
      const out = await ask(
        Scenario,
        SYSTEM,
        `${ctx}
Write a new, realistic role-play scenario in the style of DECA ${b.level} competition.
- Exactly ${form.pis} performance indicators written the way DECA phrases them ("Explain...", "Describe...", "Discuss...", "Determine...").
- Each PI's "ia" must be one of these instructional areas: ${b.areas.join(", ")}.
${b.focus.length ? `- At least 2 PIs must come from these areas the student is weak in: ${b.focus.join(", ")}.` : ""}
- Include concrete details (numbers, constraints, a stakeholder concern) that reward analytical thinking.
- ${b.level === "icdc" ? "Make the problem complex with competing priorities." : b.level === "association" ? "Moderate complexity." : "Keep it approachable."}`,
        "medium",
      );
      return Response.json(out);
    }

    if (!b.scenario) return Response.json({ error: "Missing scenario" }, { status: 400 });
    const s = b.scenario;
    const scenarioText = `${ctx}
SCENARIO: ${s.title} — ${s.company}
Participant role: ${s.studentRole}. Judge role: ${s.judgeName}, ${s.judgeRole}.
${s.situation}
TASK: ${s.task}
PERFORMANCE INDICATORS:
${s.pis.map((p, i) => `${i + 1}. ${p.text} (${p.ia})`).join("\n")}`;
    const transcript = b.transcript.map((t) => `${t.who === "judge" ? "JUDGE" : "PARTICIPANT"}: ${t.text}`).join("\n\n");

    if (b.kind === "question") {
      const out = await ask(
        Question,
        `${SYSTEM}\nYou are role-playing ${s.judgeName}, ${s.judgeRole}. You are ${PERSONAS[b.level]}`,
        `${scenarioText}\n\nTRANSCRIPT SO FAR:\n${transcript}\n\nAsk your next single follow-up question, in character, spoken aloud (1-2 sentences). Base it on what the participant actually said or skipped. Don't repeat a question already asked. Output only the question.`,
        "low",
      );
      return Response.json(out);
    }

    const piMax = maxOf(form.piBands);
    const out = await ask(
      Score,
      `${SYSTEM}\nYou are a calibrated DECA judge scoring with the official-style evaluation form. Be honest: name-dropping a concept is not demonstrating it. Most first attempts land in Below or Meets Expectations.`,
      `${scenarioText}

TRANSCRIPT:
${transcript || "(no response given)"}
${b.delivery ? `\nDELIVERY: ${b.delivery.wpm} words/min, ${b.delivery.fillersPerMin} filler words/min, ${b.delivery.longPauses} long pauses.` : ""}

Score each PI from 0 to ${piMax} (${bandText(form.piBands)}).
Score each of these 21st Century Skills, in this order and with these exact names:
${form.skills.map((k) => `- ${k.name}: 0 to ${maxOf(k.bands)} (${bandText(k.bands)})`).join("\n")}
Quotes must be copied exactly from the participant's words. Give 3 top fixes, most impactful first.`,
      "high",
    );
    // Keep scores on the form even if the model drifts outside a range.
    const clamp = (n: number, max: number) => Math.max(0, Math.min(max, Math.round(n)));
    const pis = out.pis.map((p) => {
      const score = clamp(p.score, piMax);
      return { ...p, score, level: LABELS[form.piBands.findIndex(([lo, hi]) => score >= lo && score <= hi)] };
    });
    const skills = form.skills.map((k, i) => ({
      skill: k.name,
      score: clamp(out.skills[i]?.score ?? 0, maxOf(k.bands)),
      max: maxOf(k.bands),
      feedback: out.skills[i]?.feedback ?? "",
    }));
    return Response.json({ ...out, pis, skills, piMax });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError || /authentication method/i.test((err as Error).message)) {
      return Response.json({ error: "Server is missing a valid ANTHROPIC_API_KEY." }, { status: 500 });
    }
    if (err instanceof Anthropic.RateLimitError) {
      return Response.json({ error: "Too many requests right now. Wait a minute and try again." }, { status: 429 });
    }
    if (err instanceof Anthropic.APIError) {
      return Response.json({ error: `AI service error (${err.status ?? "network"}).` }, { status: 502 });
    }
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}

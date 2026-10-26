import { env } from "cloudflare:workers";
import { unauthorized, userFrom } from "@/lib/auth";
import { z } from "zod";
import { eventByCode, isRoleplay, SELLING_BRIEFS, type Level } from "@/lib/deca";
import { COLD_FORM, DRILL_FORM, PLAN_FORM, SELLING_FORM, SHARK_FORM, levelOf, maxOf, roleplayForm, writtenByCode, type Form } from "@/lib/forms";
import {
  clip, persona, pickArea, realPis, scenarioPrompt, scorePrompt, writtenPrompt, SCENARIO_SCHEMA, SCORE_SCHEMA, WRITTEN_SCHEMA,
  type Judge, type Mode, type Prospect, type Scenario,
} from "@/lib/judge";

// Free Workers AI: the account gets 10,000 neurons a day; DAILY_CAP keeps the whole club under it so nothing is ever billed.
// ponytail: one global cap; add per-student limits if one person starts eating the day.
const MODEL = "@cf/openai/gpt-oss-120b";
const TTS = "@cf/myshell-ai/melotts";
const DAILY_CAP = 9000;
const TTS_PER_CHAR = 18.63 / 900; // MeloTTS: 18.63 neurons per audio minute, ~900 spoken characters a minute

const today = () => new Date().toISOString().slice(0, 10);
const used = async () => Number(await env.USAGE.get("n:" + today())) || 0;
async function spend(n: number) {
  const k = "n:" + today();
  await env.USAGE.put(k, String(Math.round(((Number(await env.USAGE.get(k)) || 0) + n) * 10) / 10), { expirationTtl: 172800 });
}
class Budget extends Error {}
async function guard(estimate: number) {
  if ((await used()) + estimate > DAILY_CAP) throw new Budget();
}

type Msg = { role: "system" | "user" | "assistant"; content: string };
type Out = { output?: { type: string; content?: { text?: string }[] }[]; usage?: { neurons?: number; input_tokens?: number; output_tokens?: number } };

async function llm(messages: Msg[], o: { effort: "low" | "medium" | "high"; max: number; schema?: object }) {
  const out = (await env.AI.run(MODEL, {
    input: messages,
    reasoning: { effort: o.effort },
    max_output_tokens: o.max,
    ...(o.schema ? { text: { format: { type: "json_schema", name: "result", schema: o.schema, strict: true } } } : {}),
  })) as Out;
  const u = out.usage ?? {};
  await spend(u.neurons ?? (u.input_tokens ?? 2000) * 0.0318 + (u.output_tokens ?? o.max) * 0.0682);
  return (out.output ?? []).filter((x) => x.type === "message").flatMap((x) => x.content ?? []).map((c) => c.text ?? "").join("").trim();
}

const json = <T,>(text: string): T => JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));

type Raw = { rows: { name: string; score: number; why: string; quote: string }[]; outcome: string; verdict: string; strengths: string[]; fixes: { said: string; try: string; why: string }[]; drill: string; questions?: string[] };
async function grade(messages: Msg[], schema: object) {
  try {
    return json<Raw>(await llm(messages, { effort: "medium", max: 8000, schema }));
  } catch {
    return json<Raw>(await llm(messages, { effort: "low", max: 8000, schema })); // one retry on a malformed reply
  }
}
// Trust the model for judgement, not arithmetic: match rows to the form, clamp to each row's max, label and total here.
function report(form: Form, fb: Raw) {
  const rows = form.rows.map((r, i) => {
    const key = r.name.toLowerCase().slice(0, 14);
    const got = fb.rows.find((x) => x.name.toLowerCase().startsWith(key)) ?? fb.rows[i] ?? { score: 0, why: "", quote: "" };
    const max = maxOf(r.bands);
    const score = Math.max(0, Math.min(max, Math.round(Number(got.score) || 0)));
    return { name: r.name, group: r.group, max, score, level: levelOf(r.bands, score), why: clip(got.why, 500), quote: clip(got.quote, 300) };
  });
  return {
    form: form.title, rows, total: rows.reduce((n, r) => n + r.score, 0), max: rows.reduce((n, r) => n + r.max, 0),
    outcome: clip(fb.outcome, 60), verdict: clip(fb.verdict, 600), drill: clip(fb.drill, 600),
    strengths: fb.strengths.slice(0, 3).map((s) => clip(s, 400)),
    fixes: fb.fixes.slice(0, 3).map((f) => ({ said: clip(f.said, 300), try: clip(f.try, 400), why: clip(f.why, 300) })),
  };
}

// A 20-page entry is ~60k characters; past this we grade the start and say so.
const ENTRY_MAX = 70000;
async function toText(file: File) {
  const r = await env.AI.toMarkdown({ name: file.name, blob: file });
  return r.format === "error" ? "" : (r.data ?? "").trim();
}

async function speak(text: string) {
  try {
    const r = (await env.AI.run(TTS, { prompt: text, lang: "en" })) as { audio?: string };
    await spend(text.length * TTS_PER_CHAR);
    return typeof r?.audio === "string" ? r.audio : null;
  } catch {
    return null; // the browser falls back to its own voice
  }
}

// ---------------------------------------------------------------- request shapes
const Level = z.enum(["district", "association", "icdc"]);
const ModeZ = z.enum(["roleplay", "plan", "drill", "shark", "cold", "selling"]);
const Difficulty = z.enum(["friendly", "realistic", "tough"]).default("realistic");
const Str = z.record(z.string(), z.unknown()).optional();
const ScenarioZ = z.object({
  title: z.string(), company: z.string(), studentRole: z.string(), judgeName: z.string(), judgeRole: z.string(),
  situation: z.string(), task: z.string(), pis: z.array(z.object({ text: z.string(), ia: z.string() })).max(8), questions: z.array(z.string()).max(4),
});
const Body = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("scenario"), event: z.string(), level: Level, focus: z.array(z.string()).max(5).default([]) }),
  z.object({
    kind: z.literal("turn"), mode: ModeZ, difficulty: Difficulty, event: z.string().optional(), scenario: ScenarioZ.optional(),
    plan: z.string().max(12000).default(""), judge: Str, prospect: Str, voice: z.boolean().default(true),
    history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(12000) })).max(60),
  }),
  z.object({ kind: z.literal("speak"), text: z.string().max(600) }),
  z.object({
    kind: z.literal("score"), mode: ModeZ, event: z.string().optional(), scenario: ScenarioZ.optional(), plan: z.string().max(12000).default(""),
    pitch: z.string().max(600).default(""), judge: Str, prospect: Str, metrics: z.record(z.string(), z.unknown()).optional(),
    transcript: z.array(z.object({ who: z.enum(["you", "judge"]), text: z.string().max(8000) })).max(120),
  }),
  // Sent as multipart form data so a file can come along; text is used when pasted.
  z.object({ kind: z.literal("written"), event: z.string(), text: z.string().max(200000).default("") }),
]);

const toJudge = (j?: Record<string, unknown>): Judge | undefined =>
  j ? { name: clip(j.name, 60), role: clip(j.role, 120), style: clip(j.style, 300), focus: clip(j.focus, 300) } : undefined;
const toProspect = (p?: Record<string, unknown>): Prospect | undefined =>
  p ? Object.fromEntries(Object.entries(p).slice(0, 30).map(([k, v]) => [k, clip(v, 500)])) : undefined;
const scenarioText = (s: Scenario) =>
  `SCENARIO: ${s.title} at ${s.company}. Participant: ${s.studentRole}. Judge: ${s.judgeName}, ${s.judgeRole}.\n${s.situation}\nTASK: ${s.task}\nPERFORMANCE INDICATORS:\n${s.pis.map((p, i) => `${i + 1}. ${p.text}`).join("\n")}\nJUDGE QUESTIONS: ${s.questions.join(" | ")}`;

function formFor(mode: Mode, event: string | undefined, scenario?: Scenario): Form {
  if (mode === "roleplay") {
    const ev = eventByCode(event ?? "");
    return roleplayForm(isRoleplay(ev) ? ev.kind : "principles", (scenario?.pis ?? []).map((p) => clip(p.text, 200)));
  }
  return { plan: PLAN_FORM, selling: SELLING_FORM, shark: SHARK_FORM, cold: COLD_FORM, drill: DRILL_FORM }[mode];
}

// ---------------------------------------------------------------- routes
export async function GET() {
  return Response.json({ used: Math.round(await used()), cap: DAILY_CAP }, { headers: { "cache-control": "no-store" } });
}

export async function POST(req: Request) {
  if (!(await userFrom(req))) return unauthorized(); // members only: keeps the free AI budget for the chapter
  const fd = req.headers.get("content-type")?.startsWith("multipart/form-data") ? await req.formData().catch(() => null) : null;
  const file = fd?.get("file");
  const parsed = Body.safeParse(fd ? { kind: "written", event: fd.get("event"), text: fd.get("text") ?? "" } : await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Bad request" }, { status: 400 });
  const b = parsed.data;

  try {
    if (b.kind === "speak") {
      await guard(15);
      return Response.json({ audio: await speak(b.text) });
    }

    if (b.kind === "scenario") {
      // Trust our own event table, not the client's copy of it.
      const ev = eventByCode(b.event);
      if (!isRoleplay(ev)) return Response.json({ error: "That event has no role-play." }, { status: 400 });
      const area = pickArea(ev, b.level as Level, b.focus);
      const given = ev.kind === "principles" ? realPis(area, 4) : [];
      await guard(400);
      const s = json<Scenario>(await llm([{ role: "user", content: scenarioPrompt(ev, b.level as Level, area, given) }], { effort: "medium", max: 6000, schema: SCENARIO_SCHEMA }));
      if (given.length) s.pis = given;
      s.questions = s.questions.slice(0, 2);
      return Response.json({ ...s, area });
    }

    if (b.kind === "turn") {
      const sys = persona({
        mode: b.mode, difficulty: b.difficulty, ev: b.event ? eventByCode(b.event) : undefined, scenario: b.scenario,
        plan: b.plan, judge: toJudge(b.judge), prospect: toProspect(b.prospect),
      });
      const messages: Msg[] = [{ role: "system", content: sys }, ...b.history.slice(-40)];
      await guard(JSON.stringify(messages).length / 4 * 0.0318 + 60);
      let reply = (await llm(messages, { effort: "low", max: 700 })).replace(/[*_#`]/g, "");
      let end = /\[END\]/i.test(reply);
      reply = reply.replace(/\[END\]/gi, "").trim() || "Could you say that again?";
      // A question still needs an answer: drop any sign-off tacked on after it and keep the round open.
      if (end && b.mode === "roleplay" && reply.includes("?") && b.history.length < 50) {
        reply = reply.slice(0, reply.lastIndexOf("?") + 1);
        end = false;
      }
      return Response.json({ reply, end, audio: b.voice ? await speak(clip(reply, 600)) : null });
    }

    if (b.kind === "written") {
      const we = writtenByCode(b.event);
      if (!we) return Response.json({ error: "Pick a written or pitch-deck event." }, { status: 400 });
      let text = b.text.trim();
      if (!text && file && typeof file !== "string") {
        // PDF and Word conversion is free; images would spend neurons, so they are refused.
        if (!/\.(pdf|docx)$/i.test(file.name) || file.size > 15e6) return Response.json({ error: "Upload a PDF or Word (.docx) file under 15 MB." }, { status: 400 });
        text = await toText(file);
      }
      if (text.length < 300)
        return Response.json({ error: "Couldn't read enough text from that file. If it's scanned or made of images, export it as a PDF from Google Docs, Slides or Word, or paste the text instead." }, { status: 400 });
      const messages: Msg[] = [
        { role: "system", content: writtenPrompt({ form: we.form, event: `${we.name} (${we.code})`, deck: !!we.deck }) },
        { role: "user", content: `Length: about ${text.split(/\s+/).length} words.\n<entry>\n${text.slice(0, ENTRY_MAX)}\n</entry>` },
      ];
      await guard(JSON.stringify(messages).length / 4 * 0.0318 + 500);
      const fb = await grade(messages, WRITTEN_SCHEMA);
      return Response.json({ ...report(we.form, fb), questions: (fb.questions ?? []).slice(0, 3).map((q) => clip(q, 300)), cut: text.length > ENTRY_MAX });
    }

    // score
    const form = formFor(b.mode, b.event, b.scenario);
    const ev = b.event ? eventByCode(b.event) : undefined;
    const context =
      b.mode === "roleplay" && b.scenario ? scenarioText(b.scenario)
      : b.mode === "selling" && ev ? `Participant: ${SELLING_BRIEFS[ev.code]?.you}. Buyer: ${SELLING_BRIEFS[ev.code]?.buyer}, who wants ${SELLING_BRIEFS[ev.code]?.wants}.`
      : b.mode === "cold" ? (b.pitch ? `What the student was selling: ${b.pitch}` : "")
      : b.plan;
    const transcript = b.transcript.map((x) => `${x.who === "you" ? "YOU" : "THEM"}: ${x.text}`).join("\n").slice(-40000);
    const messages: Msg[] = [
      { role: "system", content: scorePrompt({ mode: b.mode, form, context, metrics: b.metrics, prospect: toProspect(b.prospect), judge: toJudge(b.judge) }) },
      { role: "user", content: `Transcript:\n${transcript}` },
    ];
    await guard(JSON.stringify(messages).length / 4 * 0.0318 + 400);
    return Response.json(report(form, await grade(messages, SCORE_SCHEMA)));
  } catch (err) {
    const msg = String((err as Error)?.message ?? err);
    if (err instanceof Budget || /4006|allocation|neurons/i.test(msg)) return Response.json({ error: "budget" }, { status: 429 });
    return Response.json({ error: msg.slice(0, 300) }, { status: 500 });
  }
}

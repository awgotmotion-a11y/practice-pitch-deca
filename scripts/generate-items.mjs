// Grow the exam bank with original, blueprint-tagged questions.
// Usage: node scripts/generate-items.mjs [perArea=20] ["Area One,Area Two"]
// Output goes to data/items.generated.json. Have a strong competitor review items,
// then move the good ones into data/items.json.
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { readFileSync, writeFileSync } from "node:fs";

const read = (p) => JSON.parse(readFileSync(new URL(`../data/${p}`, import.meta.url), "utf8"));
const blueprint = read("blueprint-2026-27.json");
const seed = read("items.json");
const generated = read("items.generated.json");

const perArea = Number(process.argv[2] ?? 20);
const allAreas = [...new Set(Object.values(blueprint.clusters).flatMap(Object.keys))];
const areas = process.argv[3] ? process.argv[3].split(",").map((s) => s.trim()) : allAreas;

const Items = z.object({
  items: z.array(z.object({ q: z.string(), c: z.array(z.string()), a: z.number(), e: z.string() })),
});

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const client = new Anthropic();

for (const ia of areas) {
  const existing = [...seed, ...generated].filter((i) => i.ia === ia);
  const seen = new Set(existing.map((i) => norm(i.q)));
  const res = await client.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    output_config: { effort: "medium", format: zodOutputFormat(Items) },
    messages: [{
      role: "user",
      content: `Write ${perArea} ORIGINAL multiple-choice questions for high school DECA cluster exam practice in the instructional area "${ia}".
Rules:
- Match the style and difficulty of DECA district-to-ICDC exams: business scenarios, applied concepts, some calculations where the area allows.
- Exactly 4 choices; "a" is the 0-based index of the single correct answer; vary its position.
- "e" is a one- or two-sentence explanation of why the answer is right.
- Do not copy or paraphrase official DECA exam items.
- Don't duplicate these existing questions:
${existing.slice(0, 80).map((i) => `- ${i.q}`).join("\n")}`,
    }],
  });
  if (res.stop_reason !== "end_turn" || !res.parsed_output) {
    console.warn(`${ia}: skipped (${res.stop_reason})`);
    continue;
  }
  const slug = ia.toLowerCase().replace(/[^a-z]+/g, "-");
  let added = 0;
  for (const it of res.parsed_output.items) {
    if (it.c.length !== 4 || it.a < 0 || it.a > 3 || seen.has(norm(it.q))) continue;
    seen.add(norm(it.q));
    generated.push({ id: `g-${slug}-${Date.now().toString(36)}-${added}`, ia, ...it });
    added++;
  }
  writeFileSync(new URL("../data/items.generated.json", import.meta.url), JSON.stringify(generated, null, 1));
  console.log(`${ia}: +${added} (bank now ${existing.length + added})`);
}

// Judge's evaluation forms. Shared by the scoring API (which clamps to them) and the report UI.
// Sources: DECA Guide 2026-27 and DECA's 2026 district sample events (PMK, RMS, MTDM, PFL), EIB and
// Professional Selling presentation forms. ponytail: re-check point bands each season.

export const LEVELS4 = ["Novice", "Developing", "Proficient", "Exemplary"] as const;

/** Inclusive point ranges for Novice, Developing, Proficient, Exemplary. */
export type Bands = [number, number][];
export type Row = { name: string; desc?: string; group: string; bands: Bands };
export type Form = { id: string; title: string; rows: Row[] };

const B = {
  pi12: [[0, 3], [4, 7], [8, 11], [12, 12]],
  pi10: [[0, 3], [4, 6], [7, 9], [10, 10]],
  pi17: [[0, 5], [6, 11], [12, 16], [17, 17]],
  sol8: [[0, 2], [3, 5], [6, 7], [8, 8]],
  cc6: [[0, 1], [2, 3], [4, 5], [6, 6]],
  oi10: [[0, 3], [4, 6], [7, 9], [10, 10]],
  oi8: [[0, 2], [3, 5], [6, 7], [8, 8]],
  oi7: [[0, 2], [3, 4], [5, 6], [7, 7]],
  c15: [[0, 5], [6, 10], [11, 14], [15, 15]],
  t5: [[0, 1], [2, 3], [4, 4], [5, 5]],
} satisfies Record<string, Bands>;

export const maxOf = (b: Bands) => b[b.length - 1][1];
export const formMax = (f: Form) => f.rows.reduce((n, r) => n + maxOf(r.bands), 0);
export const levelOf = (b: Bands, score: number) => LEVELS4[Math.max(0, b.findIndex(([lo, hi]) => score >= lo && score <= hi))];

/** Bands for our own (non-DECA) rubrics: quarters of the max. */
const quarters = (max: number): Bands => {
  const a = Math.round(max * 0.3), b = Math.round(max * 0.6), c = Math.round(max * 0.85);
  return [[0, a], [a + 1, b], [b + 1, c], [c + 1, max]];
};

const SOLUTION: Row[] = [
  { name: "Unique", desc: "Original thinking, fresh perspectives and an insightful approach", group: "Solution", bands: B.sol8 },
  { name: "Practical", desc: "An actionable, viable solution in a real-world context", group: "Solution", bands: B.sol8 },
  { name: "Effective", desc: "A solution that achieves relevant outcomes", group: "Solution", bands: B.sol8 },
];
const COMPETENCIES: Row[] = [
  { name: "Critical Thinking", desc: "Think critically to understand and solve problems", group: "Career Competencies", bands: B.cc6 },
  { name: "Communication", desc: "Communicate clearly, effectively and with reason", group: "Career Competencies", bands: B.cc6 },
  { name: "Decision Making", desc: "Consider the impacts of decisions", group: "Career Competencies", bands: B.cc6 },
];
const impression = (bands: Bands): Row => ({
  name: "Overall Impression",
  desc: "Overall career readiness through professionalism, poise and confidence",
  group: "Overall Impression",
  bands,
});

export type RoleplayKind = "principles" | "series" | "tdm" | "pfl";
export const PI_COUNT: Record<RoleplayKind, number> = { principles: 4, series: 5, tdm: 5, pfl: 3 };

/** Role-play / case study form: the scenario's PIs, then Solution, Career Competencies, Overall Impression. Totals 100. */
export function roleplayForm(kind: RoleplayKind, pis: string[]): Form {
  const [piBands, oi] = kind === "principles" ? [B.pi12, B.oi10] : kind === "pfl" ? [B.pi17, B.oi7] : [B.pi10, B.oi8];
  return {
    id: `roleplay-${kind}`,
    title: "Judge's Evaluation Form (2026–27)",
    rows: [...pis.map((name) => ({ name, group: "Performance Indicators", bands: piBands })), ...SOLUTION, ...COMPETENCIES, impression(oi)],
  };
}

const technique = (persuasion: [string, string]): Row[] => [
  { name: "Organization", desc: "Logical sequence that is easy to follow", group: "Presentation Technique", bands: B.t5 },
  { name: persuasion[0], desc: persuasion[1], group: "Presentation Technique", bands: B.t5 },
  { name: "Delivery", desc: "Engages the audience through interactive techniques", group: "Presentation Technique", bands: B.t5 },
  { name: "Presentation Design", desc: "Visual aids add value (can't be judged from audio; scored on how well you describe them)", group: "Presentation Technique", bands: B.t5 },
  { name: "Overall Impression", desc: "Professionalism, poise and confidence", group: "Presentation Technique", bands: B.t5 },
];

/** Business plan presentation (Independent Business Plan form; other plan events are close to it). */
export const PLAN_FORM: Form = {
  id: "plan",
  title: "Presentation Evaluation Form · business plan events (2026–27)",
  rows: [
    { name: "Business Concept & Value", desc: "What the business is and why it matters", group: "Presentation Content", bands: B.c15 },
    { name: "Problem & Market Opportunity", desc: "Why there is a clear need", group: "Presentation Content", bands: B.c15 },
    { name: "Customer & Competitive Positioning", desc: "Target customers and position against competitors", group: "Presentation Content", bands: B.c15 },
    { name: "Solution & Execution", desc: "How it operates and is delivered; realistic and feasible", group: "Presentation Content", bands: B.c15 },
    { name: "Financial Viability & Investment Case", desc: "How it makes money and a justified financing request", group: "Presentation Content", bands: B.c15 },
    ...technique(["Persuasion", "A persuasive case that the plan is worth pursuing"]),
  ],
};

/** Professional Selling, Hospitality and Tourism Professional Selling, Financial Consulting. */
export const SELLING_FORM: Form = {
  id: "selling",
  title: "Presentation Evaluation Form · Professional Selling and Consulting (2026–27)",
  rows: [
    { name: "Opening/Engagement", desc: "Confident opening that engages, builds credibility and frames the dialogue", group: "Presentation Content", bands: B.c15 },
    { name: "Assessing Needs", desc: "Insight into the client's goals, challenges and expectations", group: "Presentation Content", bands: B.c15 },
    { name: "Positioning Value", desc: "Features, benefits and value aligned to the needs you found", group: "Presentation Content", bands: B.c15 },
    { name: "Solution Recommendation", desc: "The right recommendation, handling questions and objections accurately", group: "Presentation Content", bands: B.c15 },
    { name: "Closing and Follow-up", desc: "Guides the client to a decision or next step", group: "Presentation Content", bands: B.c15 },
    ...technique(["Effectiveness", "Persuades, informs or inspires with a clear message"]),
  ],
};

const custom = (id: string, title: string, rows: [string, number, string][]): Form => ({
  id,
  title,
  rows: rows.map(([name, max, desc]) => ({ name, desc, group: "Scorecard", bands: quarters(max) })),
});

/** Practice-only rubrics for modes DECA doesn't score. */
export const SHARK_FORM = custom("shark", "Shark Tank scorecard", [
  ["Clarity of the pitch", 20, "Who you are, the ask and why it matters, fast"],
  ["Command of the numbers", 20, "Sales, margins, CAC, valuation without guessing"],
  ["Handling pushback", 20, "Stays calm and answers the actual objection"],
  ["Credibility and traction", 20, "Proof: customers, sales, results"],
  ["Confidence and delivery", 20, "Pace, poise, no rambling"],
]);
export const COLD_FORM = custom("cold", "Cold call scorecard", [
  ["Opener", 20, "Who you are and why you called, in under 15 seconds"],
  ["Discovery", 20, "Questions that uncovered their real situation"],
  ["Objection handling", 20, "Acknowledged, then answered without arguing"],
  ["The ask", 20, "A clear, small next step"],
  ["Adapted to their style", 20, "Matched their tone instead of reading a script"],
]);
export const DRILL_FORM = custom("drill", "Q&A drill scorecard", [
  ["Answers first, then explains", 25, "One-sentence answer before the detail"],
  ["Specific evidence and numbers", 25, "Facts, figures, examples"],
  ["Consistent with the plan", 25, "No contradictions with what you said before"],
  ["Composure under pressure", 25, "No defensiveness, no dodging"],
]);

/** Self-check: `npx tsx lib/forms.ts` — every DECA form must total 100. */
if (typeof window === "undefined" && typeof process !== "undefined" && process.argv[1]?.endsWith("forms.ts")) {
  const all = [
    roleplayForm("principles", ["a", "b", "c", "d"]),
    roleplayForm("series", ["a", "b", "c", "d", "e"]),
    roleplayForm("tdm", ["a", "b", "c", "d", "e"]),
    roleplayForm("pfl", ["a", "b", "c"]),
    PLAN_FORM, SELLING_FORM, SHARK_FORM, COLD_FORM, DRILL_FORM,
  ];
  for (const f of all) console.assert(formMax(f) === 100, f.id, formMax(f));
  console.assert(levelOf(B.pi12, 9) === "Proficient" && levelOf(B.sol8, 8) === "Exemplary", "levels");
  console.log("forms self-check ok");
}

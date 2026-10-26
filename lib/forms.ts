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
  w9: [[0, 3], [4, 6], [7, 8], [9, 9]],
  w12: [[0, 3], [4, 7], [8, 11], [12, 12]],
  w20: [[0, 7], [8, 13], [14, 19], [20, 20]],
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

// ---------------------------------------------------------------- written entries and pitch decks
// Written Entry Evaluation Forms from the 2026-27 DECA Guide (BOR, EIB, EBG, EFB, IBP and PM guideline PDFs).

type W = [group: string, name: string, bands: Bands, desc: string];
const written = (id: string, title: string, rows: W[]): Form => ({
  id, title, rows: rows.map(([group, name, bands, desc]) => ({ group, name, bands, desc })),
});
const EXEC = "Executive Summary", PRO = "Professional Standards";
const layout = (bands: Bands): W => [PRO, "Professional layout and grammar", bands, "Professional layout, appropriate business language and correct grammar"];

const BOR_FORM = written("w-bor", "Written Entry Evaluation Form · Business Operations Research (2026–27)", [
  [EXEC, "Executive summary", B.pi10, "Clear, concise, well-structured summary (one to three pages) covering key aspects of the project"],
  ["Introduction", "Business description", B.sol8, "The business, its primary products or services, purpose/mission, target market and current strategy for customer loyalty"],
  ["Research Methods", "Research design and rationale", B.sol8, "Methodologies (qualitative, quantitative, primary, secondary) and why they fit the study's goals, with a clear data collection process"],
  ["Research Methods", "Research execution", B.sol8, "Research carried out in a clear, organized, professional way; logical and thorough"],
  ["Findings and Conclusions", "Findings tied to objectives", B.sol8, "Interprets the findings and connects them to the study's objectives and questions"],
  ["Findings and Conclusions", "Evidence-based conclusions", B.sol8, "Logical conclusions supported by the findings"],
  ["Proposed Strategic Plan", "Objectives and rationale", B.w12, "Actionable objectives with a practical rationale based on data, research and logical analysis"],
  ["Proposed Strategic Plan", "Activities and timelines", B.w12, "Actionable, logical activities with realistic timelines"],
  ["Proposed Strategic Plan", "Metrics and KPIs", B.w12, "Effective metrics or key performance indicators to measure the plan's effectiveness"],
  ["Proposed Budget", "Budget, viability and ROI", B.sol8, "Identifies and justifies all costs, addresses financial viability and potential ROI"],
  layout(B.cc6),
]);

const plan = (id: string, title: string, intl: boolean): Form => written(id, title, [
  [EXEC, "Executive summary", B.pi10, "Explains the business concept and model, summarizing key elements of the plan and the value it creates"],
  ...(intl ? [["International Business Situation Analysis", "Country situation analysis", B.t5, "Economic, governmental, legal, cultural and market conditions of the selected country and how they affect the business"] as W] : []),
  ["Problem & Business Opportunity", "Problem and why it matters", B.pi10, `The problem(s) addressed and why they matter${intl ? " in the international market" : " to the target market"}`],
  ["Customer Segments & Channels", "Customers and channels", B.pi10, "Target customers and how the business will reach and serve them, aligned to their needs"],
  ["Unique Value Proposition & Competitive Advantage", "Value proposition and advantage", B.pi10, "A clear value proposition: what makes it different and hard to copy, creating a lasting advantage"],
  ["Solution", "Solution feasibility", intl ? B.pi10 : B.c15, `How the solution and its key features address the problem, showing it is realistic and feasible${intl ? " in the international context" : ""}`],
  ["Revenue Model & Key Metrics", "Revenue model and metrics", B.pi10, "How the business makes money and the key metrics that track performance; a realistic path to sustainability"],
  ["Cost Structure", "Operating costs", B.pi10, "The main costs of operating and how they relate to delivering the product or service"],
  ["Detailed Financials", "Projections and capital plan", B.pi10, "Analyzes financial projections and a plan to meet capital needs"],
  ["Conclusion & Financing Request", "Viability and financing request", B.pi10, "Why the venture is viable, with a clear, justified request for financing"],
  layout(B.t5),
]);

const EBG_FORM = written("w-ebg", "Written Entry Evaluation Form · Business Growth Plan (2026–27)", [
  [EXEC, "Executive summary", B.pi10, "Summarizes the growth plan, highlighting key strategies and the value of the proposed expansion"],
  ["Introduction", "Current operations", B.w9, "Current business operations, products or services and unique characteristics"],
  ["Introduction", "Current position", B.w9, "Shows an understanding of the business's current position"],
  ["SWOT Analysis", "SWOT analysis", B.pi10, "Strengths, weaknesses, opportunities and threats of the business"],
  ["SWOT Analysis", "How SWOT informs growth", B.pi10, "How those factors inform growth decisions"],
  ["Growth & Expansion Strategy", "Growth opportunities", B.pi10, "Expansion strategies, market opportunities and marketing approach"],
  ["Growth & Expansion Strategy", "Long-term growth fit", B.pi10, "How the strategy supports long-term growth"],
  ["Financing Plan", "Finances and capital needs", B.pi10, "Current financial situation, costs and capital needs"],
  ["Financing Plan", "Sustaining growth", B.pi10, "How the business can support and sustain growth, including the timeline to profitability"],
  ["Conclusion", "Why the strategy will work", B.cc6, "Synthesizes why the proposed strategy will successfully expand the business"],
  layout(B.cc6),
]);

const EFB_FORM = written("w-efb", "Written Entry Evaluation Form · Franchise Business Plan (2026–27)", [
  [EXEC, "Executive summary", B.pi10, "Clear, well-structured summary (one to three pages) of all key aspects, including the rationale for obtaining franchise rights"],
  ["Business History, Background & Objectives", "Company background", B.sol8, "The company, its goals, achievements and challenges, and its requirements for franchising"],
  ["Business Environment", "Environmental factors", B.sol8, "Economic, demographic, technological and regulatory conditions and their impact in the selected market"],
  ["Products and/or Services", "Products and services", B.sol8, "How the products or services meet customer needs and fit the franchise model"],
  ["Present Market", "Market analysis", B.sol8, "Customer characteristics, growth potential and pricing; how the business fits the market"],
  ["Competition", "Competitor analysis", B.sol8, "Competitors' strengths and weaknesses and the franchise's advantages and disadvantages"],
  ["Marketing Plan", "Marketing plan", B.sol8, "Current marketing assessed, plus future strategies for brand awareness, new customers and growth"],
  ["Management & Organization", "Management and succession", B.sol8, "The management team, how to strengthen it, a succession plan and added personnel"],
  ["Business Resources", "Business resources", B.sol8, "Resources needed to operate efficiently and serve customers"],
  ["Financial Plan & Data", "Financials and capital", B.pi10, "Sales and profit trends, a two-year operating statement and one-year cash flow, and a plan to obtain capital"],
  ["Conclusion & Financial Request", "Viability and financing request", B.pi10, "Why the franchise is viable, with a clear, justified request for financing"],
  layout(B.cc6),
]);

const PM_FORM = written("w-pm", "Written Entry Evaluation Form · Project Management (2026–27)", [
  [EXEC, "Executive summary", B.pi10, "Clear, concise, well-structured summary (one to three pages) covering all key aspects of the project"],
  ["Initiating", "Need and project scope", B.pi10, "Defines the need or opportunity and the project scope with depth and real-world relevance"],
  ["Planning and Organizing", "Project plan components", B.w20, "Goals, HR plan, schedule and milestones, quality, risk and budget, justified and aligned to the goals"],
  ["Execution", "Implementation narrative", B.w20, "Well-documented account of how the plan was carried out: coordination, adaptation and decisions"],
  ["Monitoring and Controlling", "Monitoring and controlling", B.pi10, "How feedback, data and checkpoints tracked schedule, quality and budget and resolved problems"],
  ["Closing the Project", "Evaluation and lessons learned", B.w20, "Success judged on key metrics, insightful lessons learned and forward-looking recommendations"],
  layout(B.pi10),
]);

// Pitch-deck events have no written form: the deck is judged inside the presentation. We score the deck against the content
// rows plus the three technique rows a deck shows; Delivery and Overall Impression (10 points) are only judged live.
const DECK = "Presentation Content", TECH = "Presentation Technique (from the deck)";
const deckTech = (persuasion: [string, string]): W[] => [
  [TECH, "Organization", B.t5, "Logical sequence that is easy to follow"],
  [TECH, persuasion[0], B.t5, persuasion[1]],
  [TECH, "Presentation Design", B.t5, "Visuals and themes are appropriate, professional and add value"],
];
const ESB_DECK = written("d-esb", "Pitch deck review · Start-Up Business Plan (2026–27)", [
  [DECK, "Business Concept & Solution", B.c15, "The concept, how it works and how its features meet a defined need, with evidence it can succeed"],
  [DECK, "Problem & Business Opportunity", B.c15, "The problem, why it matters and what causes it: size, urgency, market relevance"],
  [DECK, "Customer Segments & Channels", B.c15, "Target customers, their needs and behaviors, and how the business reaches and serves them"],
  [DECK, "Unique Value Proposition & Competitive Advantage", B.c15, "What makes it different, with comparisons to existing options, and why it is hard to copy"],
  [DECK, "Financial Plan & Request", B.c15, "Revenue, pricing, expenses, key metrics and a clear financial request backed by evidence"],
  ...deckTech(["Persuasion", "A persuasive case that the plan is worth pursuing"]),
]);
const EIP_DECK = written("d-eip", "Pitch deck review · Innovation Plan (2026–27)", [
  [DECK, "Overview", B.c15, "The idea, its customers and the problem it solves, and why it is worth pursuing"],
  [DECK, "Business Opportunity", B.c15, "The underlying need: root causes, scope, urgency and relevance, with evidence"],
  [DECK, "Customer Segments", B.c15, "Defends the chosen segments with a clear understanding of their needs, behaviors and challenges"],
  [DECK, "Unique Value Proposition", B.c15, "What makes the solution different and why it matters, compared to existing options"],
  [DECK, "Solution", B.c15, "Key features, how they solve the problem and support the value proposition, and feasibility"],
  ...deckTech(["Persuasion", "A persuasive case that the innovation plan is worth pursuing"]),
]);
const IMC_DECK = written("d-imc", "Pitch deck review · Integrated Marketing Campaign (2026–27)", [
  [DECK, "Knowledge of Industry/Brand", B.t5, "The industry, the organization and the product or service's position in it"],
  [DECK, "Business Opportunity", B.t5, "The opportunity, goals and objectives, and the target market"],
  [DECK, "Research, Insights and Connection to Campaign", B.c15, "Research method, results and how the findings shape the campaign"],
  [DECK, "Campaign Strategy", B.c15, "Feasible, creative ideas based on data and analysis that address the opportunity"],
  [DECK, "Campaign Activities and Schedule", B.c15, "Actionable activities with realistic timelines, aligned to target markets and channels"],
  [DECK, "Proposed Budget", B.pi10, "Justified campaign costs, key expenses and financial viability"],
  [DECK, "Impact and Measurement", B.pi10, "Relevant metrics to measure the campaign's results"],
  ...deckTech(["Effectiveness", "Persuades, informs or inspires with a clear message"]),
]);

export type WrittenEvent = { code: string; name: string; group: string; form: Form; deck?: boolean };
const BOR = "Operations Research (20-page written)", PLANS = "Business Plans", PM = "Project Management (20-page written)", IMC = "Integrated Marketing Campaign (pitch deck)";
export const WRITTEN_EVENTS: WrittenEvent[] = [
  { code: "BOR", name: "Business Services Operations Research", group: BOR, form: BOR_FORM },
  { code: "BMOR", name: "Buying and Merchandising Operations Research", group: BOR, form: BOR_FORM },
  { code: "FOR", name: "Finance Operations Research", group: BOR, form: BOR_FORM },
  { code: "HTOR", name: "Hospitality and Tourism Operations Research", group: BOR, form: BOR_FORM },
  { code: "SEOR", name: "Sports and Entertainment Marketing Operations Research", group: BOR, form: BOR_FORM },
  { code: "EIB", name: "Independent Business Plan", group: PLANS, form: plan("w-eib", "Written Entry Evaluation Form · Independent Business Plan (2026–27)", false) },
  { code: "IBP", name: "International Business Plan", group: PLANS, form: plan("w-ibp", "Written Entry Evaluation Form · International Business Plan (2026–27)", true) },
  { code: "EBG", name: "Business Growth Plan", group: PLANS, form: EBG_FORM },
  { code: "EFB", name: "Franchise Business Plan", group: PLANS, form: EFB_FORM },
  { code: "ESB", name: "Start-Up Business Plan (pitch deck)", group: PLANS, form: ESB_DECK, deck: true },
  { code: "EIP", name: "Innovation Plan (pitch deck)", group: PLANS, form: EIP_DECK, deck: true },
  { code: "PMBS", name: "Business Solutions Project", group: PM, form: PM_FORM },
  { code: "PMCD", name: "Career Development Project", group: PM, form: PM_FORM },
  { code: "PMCA", name: "Community Awareness Project", group: PM, form: PM_FORM },
  { code: "PMCG", name: "Community Giving Project", group: PM, form: PM_FORM },
  { code: "PMFL", name: "Financial Literacy Project", group: PM, form: PM_FORM },
  { code: "PMSP", name: "Sales Project", group: PM, form: PM_FORM },
  { code: "IMCE", name: "Integrated Marketing Campaign: Event", group: IMC, form: IMC_DECK, deck: true },
  { code: "IMCP", name: "Integrated Marketing Campaign: Product", group: IMC, form: IMC_DECK, deck: true },
  { code: "IMCS", name: "Integrated Marketing Campaign: Service", group: IMC, form: IMC_DECK, deck: true },
];
export const writtenByCode = (code: string) => WRITTEN_EVENTS.find((e) => e.code === code);

/** Self-check: `npx tsx lib/forms.ts` — every DECA form must total 100 (pitch-deck reviews 90: delivery rows are live-only). */
if (typeof window === "undefined" && typeof process !== "undefined" && process.argv[1]?.endsWith("forms.ts")) {
  const all = [
    roleplayForm("principles", ["a", "b", "c", "d"]),
    roleplayForm("series", ["a", "b", "c", "d", "e"]),
    roleplayForm("tdm", ["a", "b", "c", "d", "e"]),
    roleplayForm("pfl", ["a", "b", "c"]),
    PLAN_FORM, SELLING_FORM, SHARK_FORM, COLD_FORM, DRILL_FORM,
  ];
  for (const f of all) console.assert(formMax(f) === 100, f.id, formMax(f));
  for (const e of WRITTEN_EVENTS) console.assert(formMax(e.form) === (e.deck ? 90 : 100), e.code, formMax(e.form));
  // Rows are matched to the model's answer by their first 14 characters, so those must be unique within a form.
  for (const e of WRITTEN_EVENTS) console.assert(new Set(e.form.rows.map((r) => r.name.toLowerCase().slice(0, 14))).size === e.form.rows.length, e.code, "row prefixes");
  console.assert(levelOf(B.pi12, 9) === "Proficient" && levelOf(B.sol8, 8) === "Exemplary", "levels");
  console.log("forms self-check ok");
}

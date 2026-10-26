import blueprint from "@/data/blueprint-2026-27.json";
import seedItems from "@/data/items.json";
import generatedItems from "@/data/items.generated.json";
import { PI_COUNT, type RoleplayKind } from "./forms";

export type Level = "district" | "association" | "icdc";
export const LEVELS: { id: Level; label: string }[] = [
  { id: "district", label: "District" },
  { id: "association", label: "State (Association)" },
  { id: "icdc", label: "ICDC" },
];

export type Cluster = keyof typeof blueprint.clusters;
export type Item = { id: string; ia: string; q: string; c: string[]; a: number; e: string };

/** How the event is judged: a role-play/case study form, a sales presentation, or a business plan pitch. */
export type EventKind = RoleplayKind | "selling" | "plan";
export type DecaEvent = { code: string; name: string; cluster: Cluster; kind: EventKind; team?: boolean };

const BAC = "Business Administration Core" as const;
// ponytail: hand-maintained from deca.org/compete (2026-27 list, 60 HS events); re-check each season.
// Marketing Management Series was dropped for 2026-27. Online events and project/research events are left out: no live judge to practice against.
export const EVENTS: DecaEvent[] = [
  { code: "PBM", name: "Principles of Business Management and Administration", cluster: BAC, kind: "principles" },
  { code: "PEN", name: "Principles of Entrepreneurship", cluster: BAC, kind: "principles" },
  { code: "PFN", name: "Principles of Finance", cluster: BAC, kind: "principles" },
  { code: "PHT", name: "Principles of Hospitality and Tourism", cluster: BAC, kind: "principles" },
  { code: "PMK", name: "Principles of Marketing", cluster: BAC, kind: "principles" },
  { code: "ACT", name: "Accounting Applications Series", cluster: "Finance", kind: "series" },
  { code: "BFS", name: "Business Finance Series", cluster: "Finance", kind: "series" },
  { code: "HRM", name: "Human Resources Management Series", cluster: "Business Management + Administration", kind: "series" },
  { code: "ENT", name: "Entrepreneurship Series", cluster: "Entrepreneurship", kind: "series" },
  { code: "HLM", name: "Hotel and Lodging Management Series", cluster: "Hospitality + Tourism", kind: "series" },
  { code: "QSRM", name: "Quick Serve Restaurant Management Series", cluster: "Hospitality + Tourism", kind: "series" },
  { code: "RFSM", name: "Restaurant and Food Service Management Series", cluster: "Hospitality + Tourism", kind: "series" },
  { code: "AAM", name: "Apparel and Accessories Marketing Series", cluster: "Marketing", kind: "series" },
  { code: "ASM", name: "Automotive Services Marketing Series", cluster: "Marketing", kind: "series" },
  { code: "BSM", name: "Business Services Marketing Series", cluster: "Marketing", kind: "series" },
  { code: "FMS", name: "Food Marketing Series", cluster: "Marketing", kind: "series" },
  { code: "MCS", name: "Marketing Communications Series", cluster: "Marketing", kind: "series" },
  { code: "RMS", name: "Retail Merchandising Series", cluster: "Marketing", kind: "series" },
  { code: "SEM", name: "Sports and Entertainment Marketing Series", cluster: "Marketing", kind: "series" },
  { code: "PFL", name: "Personal Financial Literacy", cluster: "Personal Financial Literacy", kind: "pfl" },
  { code: "BLTDM", name: "Business Law and Ethics Team Decision Making", cluster: "Business Management + Administration", kind: "tdm", team: true },
  { code: "BTDM", name: "Buying and Merchandising Team Decision Making", cluster: "Marketing", kind: "tdm", team: true },
  { code: "ETDM", name: "Entrepreneurship Team Decision Making", cluster: "Entrepreneurship", kind: "tdm", team: true },
  { code: "FTDM", name: "Financial Services Team Decision Making", cluster: "Finance", kind: "tdm", team: true },
  { code: "HTDM", name: "Hospitality Services Team Decision Making", cluster: "Hospitality + Tourism", kind: "tdm", team: true },
  { code: "MTDM", name: "Marketing Management Team Decision Making", cluster: "Marketing", kind: "tdm", team: true },
  { code: "STDM", name: "Sports and Entertainment Marketing Team Decision Making", cluster: "Marketing", kind: "tdm", team: true },
  { code: "TTDM", name: "Travel and Tourism Team Decision Making", cluster: "Hospitality + Tourism", kind: "tdm", team: true },
  { code: "PSE", name: "Professional Selling", cluster: "Marketing", kind: "selling" },
  { code: "HTPS", name: "Hospitality and Tourism Professional Selling", cluster: "Hospitality + Tourism", kind: "selling" },
  { code: "FCE", name: "Financial Consulting", cluster: "Finance", kind: "selling" },
  { code: "EIB", name: "Independent Business Plan", cluster: "Entrepreneurship", kind: "plan" },
  { code: "ESB", name: "Start-Up Business Plan", cluster: "Entrepreneurship", kind: "plan" },
  { code: "EIP", name: "Innovation Plan", cluster: "Entrepreneurship", kind: "plan" },
  { code: "EBG", name: "Business Growth Plan", cluster: "Entrepreneurship", kind: "plan" },
  { code: "EFB", name: "Franchise Business Plan", cluster: "Entrepreneurship", kind: "plan" },
  { code: "IBP", name: "International Business Plan", cluster: "Entrepreneurship", kind: "plan" },
];

export const eventByCode = (code: string) => EVENTS.find((e) => e.code === code) ?? EVENTS[4];
export const isRoleplay = (e: DecaEvent): e is DecaEvent & { kind: RoleplayKind } => e.kind in PI_COUNT;

/** Prep and presentation minutes, per the 2026-27 DECA Guide. Selling and plan events are prepared ahead: 15 minutes including questions. */
export const timing = (e: DecaEvent) =>
  e.kind === "tdm" ? { prep: 30, present: 15 } : e.kind === "selling" || e.kind === "plan" ? { prep: 0, present: 15 } : { prep: 10, present: 10 };

/** The 2026-27 Professional Selling and Consulting prompts (paraphrased from the DECA Guide). */
export const SELLING_BRIEFS: Record<string, { you: string; buyer: string; wants: string }> = {
  PSE: {
    you: "a sales representative for a company whose platform combines AI-powered customer service tools with retail analytics",
    buyer: "the owner of a regional retail chain",
    wants: "faster customer response times, lower staffing costs, smarter inventory and a better in-store and online customer experience",
  },
  HTPS: {
    you: "a sales representative for a tour wholesaler that designs immersive, experience-based group travel packages (culinary tours, cultural immersions, adventure itineraries)",
    buyer: "the owner of a local travel agency",
    wants: "to move away from traditional group bus tours and modernize the agency's offerings for younger travelers",
  },
  FCE: {
    you: "a financial consultant",
    buyer: "a small-business owner in their late 50s",
    wants: "to explore selling, transferring or winding down the business ahead of retirement while maximizing financial security",
  },
};

const LEVEL_INDEX: Record<Level, number> = { district: 0, association: 1, icdc: 2 };

/** Instructional area -> item count for one 100-item exam. */
export function blueprintFor(cluster: Cluster, level: Level): Record<string, number> {
  const areas = blueprint.clusters[cluster] as Record<string, number[]>;
  return Object.fromEntries(Object.entries(areas).map(([ia, counts]) => [ia, counts[LEVEL_INDEX[level]]]));
}

export const ITEMS: Item[] = [...(seedItems as Item[]), ...(generatedItems as Item[])];

export const areasFor = (cluster: Cluster) => Object.keys(blueprint.clusters[cluster]);

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Shuffle answer choices so the correct letter isn't predictable. */
export function shuffleChoices(item: Item): Item {
  const order = shuffle(item.c.map((_, i) => i));
  return { ...item, c: order.map((i) => item.c[i]), a: order.indexOf(item.a) };
}

/** Sample a mock exam matching the blueprint; areas with a thin bank contribute what they have. */
export function buildMockExam(cluster: Cluster, level: Level): Item[] {
  const picked = Object.entries(blueprintFor(cluster, level)).flatMap(([ia, n]) =>
    shuffle(ITEMS.filter((i) => i.ia === ia)).slice(0, n),
  );
  return shuffle(picked).map(shuffleChoices);
}

export function buildDrill(ias: string[], n: number): Item[] {
  return shuffle(ITEMS.filter((i) => ias.includes(i.ia))).slice(0, n).map(shuffleChoices);
}

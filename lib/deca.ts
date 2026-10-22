import blueprint from "@/data/blueprint-2026-27.json";
import seedItems from "@/data/items.json";
import generatedItems from "@/data/items.generated.json";

export type Level = "district" | "association" | "icdc";
export const LEVELS: { id: Level; label: string }[] = [
  { id: "district", label: "District" },
  { id: "association", label: "State (Association)" },
  { id: "icdc", label: "ICDC" },
];

export type Cluster = keyof typeof blueprint.clusters;
export type Item = { id: string; ia: string; q: string; c: string[]; a: number; e: string };

export type DecaEvent = { code: string; name: string; cluster: Cluster; team?: boolean };

// ponytail: hand-maintained from the DECA Guide; re-check each season.
export const EVENTS: DecaEvent[] = [
  { code: "PBM", name: "Principles of Business Management and Administration", cluster: "Business Administration Core" },
  { code: "PEN", name: "Principles of Entrepreneurship", cluster: "Business Administration Core" },
  { code: "PFN", name: "Principles of Finance", cluster: "Business Administration Core" },
  { code: "PHT", name: "Principles of Hospitality and Tourism", cluster: "Business Administration Core" },
  { code: "PMK", name: "Principles of Marketing", cluster: "Business Administration Core" },
  { code: "ACT", name: "Accounting Applications Series", cluster: "Finance" },
  { code: "BFS", name: "Business Finance Series", cluster: "Finance" },
  { code: "HRM", name: "Human Resources Management Series", cluster: "Business Management + Administration" },
  { code: "ENT", name: "Entrepreneurship Series", cluster: "Entrepreneurship" },
  { code: "HLM", name: "Hotel and Lodging Management Series", cluster: "Hospitality + Tourism" },
  { code: "QSRM", name: "Quick Serve Restaurant Management Series", cluster: "Hospitality + Tourism" },
  { code: "RFSM", name: "Restaurant and Food Service Management Series", cluster: "Hospitality + Tourism" },
  { code: "AAM", name: "Apparel and Accessories Marketing Series", cluster: "Marketing" },
  { code: "ASM", name: "Automotive Services Marketing Series", cluster: "Marketing" },
  { code: "BSM", name: "Business Services Marketing Series", cluster: "Marketing" },
  { code: "FMS", name: "Food Marketing Series", cluster: "Marketing" },
  { code: "MMS", name: "Marketing Management Series", cluster: "Marketing" },
  { code: "RMS", name: "Retail Merchandising Series", cluster: "Marketing" },
  { code: "SEM", name: "Sports and Entertainment Marketing Series", cluster: "Marketing" },
  { code: "PFL", name: "Personal Financial Literacy", cluster: "Personal Financial Literacy" },
  { code: "BLTDM", name: "Business Law and Ethics Team Decision Making", cluster: "Business Management + Administration", team: true },
  { code: "BTDM", name: "Buying and Merchandising Team Decision Making", cluster: "Marketing", team: true },
  { code: "ETDM", name: "Entrepreneurship Team Decision Making", cluster: "Entrepreneurship", team: true },
  { code: "FTDM", name: "Financial Services Team Decision Making", cluster: "Finance", team: true },
  { code: "HTDM", name: "Hospitality Services Team Decision Making", cluster: "Hospitality + Tourism", team: true },
  { code: "MTDM", name: "Marketing Management Team Decision Making", cluster: "Marketing", team: true },
  { code: "STDM", name: "Sports and Entertainment Marketing Team Decision Making", cluster: "Marketing", team: true },
  { code: "TTDM", name: "Travel and Tourism Team Decision Making", cluster: "Hospitality + Tourism", team: true },
];

export const eventByCode = (code: string) => EVENTS.find((e) => e.code === code) ?? EVENTS[0];

/** Prep and presentation minutes, per the DECA Guide format. */
export const timing = (e: DecaEvent) => (e.team ? { prep: 30, present: 15 } : { prep: 10, present: 10 });

/** 21st Century Skills rows on the role-play evaluation form, 0-6 each. */
export const SKILLS = [
  "Reason effectively and use systems thinking",
  "Make judgments and decisions, and solve problems",
  "Communicate clearly",
  "Show evidence of creativity",
  "Overall impression and responses to the judge's questions",
];

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

// Validate the question bank and report how full each mock exam is.
// Usage: node scripts/check-data.mjs   (exits 1 on any invalid item)
import { readFileSync } from "node:fs";

const read = (p) => JSON.parse(readFileSync(new URL(`../data/${p}`, import.meta.url), "utf8"));
const bp = read("blueprint-2026-27.json").clusters;
const items = [...read("items.json"), ...read("items.generated.json")];
const areas = new Set(Object.values(bp).flatMap(Object.keys));
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

const errors = [];
const ids = new Set();
const stems = new Set();
for (const it of items) {
  const where = it.id ?? JSON.stringify(it).slice(0, 60);
  if (!it.id || ids.has(it.id)) errors.push(`${where}: missing or duplicate id`);
  if (stems.has(norm(it.q ?? ""))) errors.push(`${where}: duplicate question`);
  if (!areas.has(it.ia)) errors.push(`${where}: unknown instructional area "${it.ia}"`);
  if (!Array.isArray(it.c) || it.c.length !== 4 || new Set(it.c).size !== 4) errors.push(`${where}: needs 4 distinct choices`);
  if (!Number.isInteger(it.a) || it.a < 0 || it.a > 3) errors.push(`${where}: answer index must be 0-3`);
  if (!it.e) errors.push(`${where}: missing explanation`);
  ids.add(it.id);
  stems.add(norm(it.q ?? ""));
}

const count = {};
for (const it of items) count[it.ia] = (count[it.ia] ?? 0) + 1;
console.log(`${items.length} items\n\nMock exam size (district / state / ICDC):`);
for (const [cluster, ias] of Object.entries(bp)) {
  const sizes = [0, 1, 2].map((l) => Object.entries(ias).reduce((n, [ia, k]) => n + Math.min(k[l], count[ia] ?? 0), 0));
  console.log(`  ${cluster.padEnd(38)} ${sizes.join(" / ")}`);
}
if (errors.length) {
  console.error(`\n${errors.length} problem(s):\n  ${errors.join("\n  ")}`);
  process.exit(1);
}
console.log("\nAll items valid.");

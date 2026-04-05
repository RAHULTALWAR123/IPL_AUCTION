/**
 * ipl_bowlers_raw.csv → players_bowlers_enriched.csv + players_bowlers_seed.sql
 * - Maps only public.players columns; batting_avg & strike_rate = NULL; runs = 0 (batting).
 * - wickets, bowling_avg, economy from bowler sheet; matches = MAT.
 * - Drops rows whose name already appears in players_batters_enriched.csv.
 * Run: node supabase/seeds/enrich-bowlers.mjs
 * Raw/enriched CSVs are not committed; add ipl_bowlers_raw.csv (and batters enriched if deduping) locally to regenerate.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NORM = (s) => s.trim().toLowerCase();
const PG_NULL = "\\N";

const OVERSEAS_ENTRIES = [
  ["Mitchell Marsh", "Australia"],
  ["Jos Buttler", "England"],
  ["Nicholas Pooran", "West Indies"],
  ["Heinrich Klaasen", "South Africa"],
  ["Aiden Markram", "South Africa"],
  ["Travis Head", "Australia"],
  ["Phil Salt", "England"],
  ["Ryan Rickelton", "South Africa"],
  ["Tristan Stubbs", "South Africa"],
  ["Sherfane Rutherford", "West Indies"],
  ["Josh Inglis", "Australia"],
  ["Tim David", "Australia"],
  ["Faf Du Plessis", "South Africa"],
  ["David Miller", "South Africa"],
  ["Quinton De Kock", "South Africa"],
  ["Devon Conway", "New Zealand"],
  ["Jonny Bairstow", "England"],
  ["Romario Shepherd", "West Indies"],
  ["Jacob Bethell", "England"],
  ["Jofra Archer", "England"],
  ["Glenn Maxwell", "Australia"],
  ["Corbin Bosch", "South Africa"],
  ["Lockie Ferguson", "New Zealand"],
  ["Kusal Mendis", "Sri Lanka"],
  ["Gerald Coetzee", "South Africa"],
  ["Jamie Overton", "England"],
  ["Matthew Breetzke", "South Africa"],
  ["Xavier Bartlett", "Australia"],
  ["Dushmantha Chameera", "Sri Lanka"],
  ["Kagiso Rabada", "South Africa"],
  ["Wiaan Mulder", "South Africa"],
  ["Kwena Maphaka", "South Africa"],
  ["Spencer Johnson", "Australia"],
  ["Trent Boult", "New Zealand"],
  ["Mitchell Starc", "Australia"],
  ["Will Jacks", "England"],
  ["Liam Livingstone", "England"],
  ["Sam Curran", "England"],
  ["Marcus Stoinis", "Australia"],
  ["Andre Russell", "West Indies"],
  ["Sunil Narine", "West Indies"],
  ["Moeen Ali", "England"],
  ["Rashid Khan", "Afghanistan"],
  ["Rahmanullah Gurbaz", "Afghanistan"],
  ["Shimron Hetmyer", "West Indies"],
  ["Pat Cummins", "Australia"],
  ["Rovman Powell", "West Indies"],
  ["Kamindu Mendis", "Sri Lanka"],
  ["Marco Jansen", "South Africa"],
  ["Azmatullah Omarzai", "Afghanistan"],
  ["Wanindu Hasaranga", "Sri Lanka"],
  ["Maheesh Theekshana", "Sri Lanka"],
  ["Fazalhaq Farooqi", "Afghanistan"],
  ["Noor Ahmad", "Afghanistan"],
  ["Dewald Brevis", "South Africa"],
  ["Donovan Ferreira", "South Africa"],
  ["Mitchell Santner", "New Zealand"],
  ["Sediqullah Atal", "Afghanistan"],
  ["Rachin Ravindra", "New Zealand"],
  ["Jake Fraser - McGurk", "Australia"],
  ["Josh Hazlewood", "Australia"],
  ["Eshan Malinga", "Sri Lanka"],
  ["Matheesha Pathirana", "Sri Lanka"],
  ["William O Rourke", "New Zealand"],
  ["Mustafizur Rahman", "Bangladesh"],
  ["Lungisani Ngidi", "South Africa"],
  ["Nuwan Thushara", "Sri Lanka"],
  ["Nathan Ellis", "Australia"],
  ["Richard Gleeson", "England"],
  ["Anrich Nortje", "South Africa"],
  ["Adam Zampa", "Australia"],
  ["Mujeeb-ur-Rahman", "Afghanistan"],
  ["Kyle Jamieson", "New Zealand"],
];

const OVERSEAS_COUNTRY = Object.fromEntries(
  OVERSEAS_ENTRIES.map(([n, c]) => [NORM(n), c])
);

function nationalityFor(name) {
  return OVERSEAS_COUNTRY[NORM(name)] ?? "India";
}

function isOverseasFn(name) {
  return nationalityFor(name) !== "India";
}

function sqlQuote(str) {
  return `'${String(str).replace(/'/g, "''")}'`;
}

/** Strict numeric for bowling_avg / economy (no date-corruption strings). */
function parseNumericOrNull(val) {
  const v = String(val ?? "").trim();
  if (!v) return { csv: PG_NULL, sql: "NULL" };
  if (!/^-?\d+(\.\d+)?$/.test(v)) return { csv: PG_NULL, sql: "NULL" };
  return { csv: v, sql: v };
}

function escapeCsv(v) {
  const s = v == null ? "" : String(v);
  if (/[,"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function parseCsvLine(line) {
  const parts = [];
  let cur = "";
  let q = false;
  for (let j = 0; j < line.length; j++) {
    const c = line[j];
    if (c === '"') q = !q;
    else if (c === "," && !q) {
      parts.push(cur);
      cur = "";
    } else cur += c;
  }
  parts.push(cur);
  return parts;
}

function loadExistingBatterNames() {
  const p = path.join(__dirname, "players_batters_enriched.csv");
  if (!fs.existsSync(p)) {
    console.warn("Missing players_batters_enriched.csv — no duplicate filtering.");
    return new Set();
  }
  const lines = fs.readFileSync(p, "utf8").trim().split(/\r?\n/);
  const set = new Set();
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const name = parseCsvLine(line)[0]?.trim();
    if (name) set.add(NORM(name));
  }
  return set;
}

const rawPath = path.join(__dirname, "ipl_bowlers_raw.csv");
const outCsv = path.join(__dirname, "players_bowlers_enriched.csv");
const outSql = path.join(__dirname, "players_bowlers_seed.sql");

const existingBatters = loadExistingBatterNames();
const text = fs.readFileSync(rawPath, "utf8");
const lines = text.trim().split(/\r?\n/);
const header = lines[0].split(",").map((h) => h.trim());

const rows = [];
let skippedDuplicate = 0;
for (let i = 1; i < lines.length; i++) {
  if (!lines[i].trim()) continue;
  const parts = parseCsvLine(lines[i]);
  const o = {};
  header.forEach((h, idx) => {
    o[h] = parts[idx]?.trim() ?? "";
  });
  const name = o["Player Name"];
  if (!name) continue;
  if (existingBatters.has(NORM(name))) {
    skippedDuplicate += 1;
    continue;
  }
  rows.push(o);
}

rows.sort((a, b) => {
  const wb = Number(b.WKT) || 0;
  const wa = Number(a.WKT) || 0;
  if (wb !== wa) return wb - wa;
  return String(a["Player Name"]).localeCompare(String(b["Player Name"]));
});

const outHeader = [
  "name",
  "role",
  "nationality",
  "is_overseas",
  "base_price",
  "set_category",
  "set_order",
  "matches",
  "runs",
  "batting_avg",
  "strike_rate",
  "wickets",
  "bowling_avg",
  "economy",
  "image_url",
];

const outLines = [outHeader.join(",")];
const sqlValues = [];

rows.forEach((r, idx) => {
  const name = r["Player Name"];
  const nat = nationalityFor(name);
  const overseas = isOverseasFn(name);
  let setCategory = "bowlers_pool";
  if (idx < 20) setCategory = "marquee";
  else if (idx < 55) setCategory = "bowlers_core";
  const order = idx + 1;

  const wkt = Math.max(0, Math.floor(Number(r.WKT) || 0));
  const mat = Math.max(0, Math.floor(Number(r.MAT) || 0));
  const bAvg = parseNumericOrNull(r.AVG);
  const eco = parseNumericOrNull(r.ECO);

  outLines.push(
    [
      escapeCsv(name),
      "bowler",
      escapeCsv(nat),
      overseas ? "true" : "false",
      "2.00",
      escapeCsv(setCategory),
      String(order),
      String(mat),
      "0",
      PG_NULL,
      PG_NULL,
      String(wkt),
      bAvg.csv,
      eco.csv,
      PG_NULL,
    ].join(",")
  );

  sqlValues.push(
    `(${[
      sqlQuote(name),
      sqlQuote("bowler"),
      sqlQuote(nat),
      overseas ? "true" : "false",
      "2.00",
      sqlQuote(setCategory),
      String(order),
      String(mat),
      "0",
      "NULL",
      "NULL",
      String(wkt),
      bAvg.sql,
      eco.sql,
      "NULL",
    ].join(", ")})`
  );
});

fs.writeFileSync(outCsv, outLines.join("\n") + "\n", "utf8");

const sqlBody = `-- Seed bowlers only (names already in players batters CSV are skipped).
-- Batting fields are NULL / runs 0; bowling stats from bowler extract.
INSERT INTO public.players (
  name, role, nationality, is_overseas, base_price, set_category, set_order,
  matches, runs, batting_avg, strike_rate, wickets, bowling_avg, economy, image_url
) VALUES
${sqlValues.join(",\n")};
`;

fs.writeFileSync(outSql, sqlBody, "utf8");

console.log(
  "Wrote",
  outCsv,
  "and",
  outSql,
  "—",
  rows.length,
  "bowlers;",
  skippedDuplicate,
  "skipped (already in players_batters_enriched.csv)"
);

/**
 * Reads ipl_batters_raw.csv → players_batters_enriched.csv (players table shape + team).
 * Run from repo: node supabase/seeds/enrich-batters.mjs
 * Raw/enriched CSVs are not committed; add ipl_batters_raw.csv here to regenerate outputs.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const NORM = (s) => s.trim().toLowerCase();

const WICKET_KEEPERS = new Set(
  [
    "K L Rahul",
    "Ishan Kishan",
    "Rishabh Pant",
    "Sanju Samson",
    "Josh Inglis",
    "Jos Buttler",
    "Heinrich Klaasen",
    "Phil Salt",
    "Quinton De Kock",
    "MS Dhoni",
    "Jitesh Sharma",
    "Abishek Porel",
    "Dhruv Jurel",
    "Prabhsimran Singh",
    "Jonny Bairstow",
    "Rahmanullah Gurbaz",
    "Kusal Mendis",
    "Robin Minz",
    "Donovan Ferreira",
    "Urvil Patel",
    "Nicholas Pooran",
    "Tristan Stubbs",
  ].map(NORM)
);

const ALL_ROUNDERS = new Set(
  [
    "Ravindra Jadeja",
    "Hardik Pandya",
    "Axar Patel",
    "Sunil Narine",
    "Venkatesh Iyer",
    "Marcus Stoinis",
    "Mitchell Marsh",
    "Andre Russell",
    "Liam Livingstone",
    "Sam Curran",
    "Washington Sundar",
    "Krunal Pandya",
    "Rachin Ravindra",
    "Mitchell Santner",
    "Moeen Ali",
    "Rahul Tewatia",
    "Will Jacks",
    "Glenn Maxwell",
    "Shivam Dube",
    "Nitish Kumar Reddy",
    "Romario Shepherd",
    "Azmatullah Omarzai",
    "Kamindu Mendis",
    "Vijay Shankar",
    "Ramandeep Singh",
    "Shardul Thakur",
  ].map(NORM)
);

const BOWLERS = new Set(
  [
    "Rashid Khan",
    "Mitchell Starc",
    "Trent Boult",
    "Kagiso Rabada",
    "Marco Jansen",
    "Jofra Archer",
    "Harshal Patel",
    "Arshdeep Singh",
    "Varun Chakaravarthy",
    "Yash Dayal",
    "Spencer Johnson",
    "Lockie Ferguson",
    "Fazalhaq Farooqi",
    "Akash Madhwal",
    "Kumar Kartikeya Singh",
    "Simarjeet Singh",
    "Mohit Sharma",
    "Khaleel Ahmed",
    "Karn Sharma",
    "Sandeep Sharma",
    "Akash Deep",
    "Kuldeep Yadav",
    "Ravi Bishnoi",
    "Noor Ahmad",
    "Maheesh Theekshana",
    "Wanindu Hasaranga",
    "Sai Kishore",
    "Mohammed Siraj",
    "Bhuvneshwar Kumar",
    "Mohammad Shami",
    "Deepak Chahar",
    "Avesh Khan",
    "Tushar Deshpande",
    "Mohd Arshad Khan",
    "Gerald Coetzee",
    "Xavier Bartlett",
    "Harshit Rana",
    "Anshul Kamboj",
    "Vipraj Nigam",
    "Suryansh Shedge",
    "Prince Yadav",
    "Digvesh Singh",
    "Dushmantha Chameera",
    "Kwena Maphaka",
    "Raj Angad Bawa",
    "Atharva Taide",
    "Madhav Tiwari",
    "Harpreet Brar",
    "Abhinav Manohar",
    "Sediqullah Atal",
    "Deepak Hooda",
    "Ravichandran Ashwin",
    "Jake Fraser - McGurk",
    "Corbin Bosch",
    "Pat Cummins",
  ].map(NORM)
);

/** Non-Indian nationalities (exact Player Name → country). Others default India. */
const OVERSEAS_COUNTRY = Object.fromEntries(
  [
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
  ].map(([n, c]) => [NORM(n), c])
);

function isBowlerOnly(name) {
  return BOWLERS.has(NORM(name));
}

/** Roles in output: batsman | all_rounder | wicket_keeper only (pure bowlers omitted). */
function roleFor(name) {
  const k = NORM(name);
  if (WICKET_KEEPERS.has(k)) return "wicket_keeper";
  if (ALL_ROUNDERS.has(k)) return "all_rounder";
  return "batsman";
}

function nationalityFor(name) {
  return OVERSEAS_COUNTRY[NORM(name)] ?? "India";
}

function isOverseas(name) {
  return nationalityFor(name) !== "India";
}

function parseNum(v) {
  const t = String(v).trim();
  if (t === "" || t === "-") return "";
  const n = Number(t);
  return Number.isFinite(n) ? String(n) : "";
}

function escapeCsv(v) {
  const s = v == null ? "" : String(v);
  if (/[,"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** PostgreSQL COPY treats \N as NULL (avoids "" → numeric parse errors). */
const PG_NULL = "\\N";

function sqlQuote(str) {
  return `'${String(str).replace(/'/g, "''")}'`;
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

const rawPath = path.join(__dirname, "ipl_batters_raw.csv");
const outPath = path.join(__dirname, "players_batters_enriched.csv");
const sqlPath = path.join(__dirname, "players_batters_seed.sql");

const text = fs.readFileSync(rawPath, "utf8");
const lines = text.trim().split(/\r?\n/);
const header = lines[0].split(",").map((h) => h.trim());

const rows = [];
for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue;
  const parts = parseCsvLine(line);
  const o = {};
  header.forEach((h, idx) => {
    o[h] = parts[idx]?.trim() ?? "";
  });
  rows.push(o);
}

rows.sort((a, b) => {
  const rb = Number(b.Runs) || 0;
  const ra = Number(a.Runs) || 0;
  if (rb !== ra) return rb - ra;
  return String(a["Player Name"]).localeCompare(String(b["Player Name"]));
});

const filtered = rows.filter((r) => !isBowlerOnly(r["Player Name"]));

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

filtered.forEach((r, idx) => {
  const name = r["Player Name"];
  const nat = nationalityFor(name);
  const overseas = isOverseas(name);
  let setCategory = "batters_pool";
  if (idx < 30) setCategory = "marquee";
  else if (idx < 90) setCategory = "batters_core";
  const order = idx + 1;
  const battingAvg = parseNum(r.AVG);
  const sr = parseNum(r.SR);

  const batAvgOut = battingAvg === "" ? PG_NULL : battingAvg;
  const srOut = sr === "" ? PG_NULL : sr;

  const line = [
    escapeCsv(name),
    escapeCsv(roleFor(name)),
    escapeCsv(nat),
    overseas ? "true" : "false",
    "2.00",
    escapeCsv(setCategory),
    String(order),
    escapeCsv(r.Matches),
    escapeCsv(r.Runs),
    batAvgOut,
    srOut,
    "0",
    PG_NULL,
    PG_NULL,
    PG_NULL,
  ];
  outLines.push(line.join(","));

  const sqlBat = battingAvg === "" ? "NULL" : battingAvg;
  const sqlSr = sr === "" ? "NULL" : sr;
  sqlValues.push(
    `(${[
      sqlQuote(name),
      sqlQuote(roleFor(name)),
      sqlQuote(nat),
      overseas ? "true" : "false",
      "2.00",
      sqlQuote(setCategory),
      String(order),
      String(Number(r.Matches) || 0),
      String(Number(r.Runs) || 0),
      sqlBat,
      sqlSr,
      "0",
      "NULL",
      "NULL",
      "NULL",
    ].join(", ")})`
  );
});

fs.writeFileSync(outPath, outLines.join("\n") + "\n", "utf8");

const sqlBody = `-- Seed batters into public.players (run in Supabase SQL Editor).
-- id / created_at / updated_at use table defaults.
INSERT INTO public.players (
  name, role, nationality, is_overseas, base_price, set_category, set_order,
  matches, runs, batting_avg, strike_rate, wickets, bowling_avg, economy, image_url
) VALUES
${sqlValues.join(",\n")};
`;

fs.writeFileSync(sqlPath, sqlBody, "utf8");

console.log(
  "Wrote",
  outPath,
  "rows:",
  filtered.length,
  "(excluded",
  rows.length - filtered.length,
  "bowlers)"
);
console.log("Wrote", sqlPath, "for SQL Editor (use this if CSV import fails).");

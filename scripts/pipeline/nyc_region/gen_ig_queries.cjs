const fs = require("fs");
const path = require("path");

const INPUT = path.join(__dirname, "nyc_region_final.json");
const OUTPUT = path.join(__dirname, "ig_queries.txt");

const venues = JSON.parse(fs.readFileSync(INPUT, "utf8"));

console.log("🔵 Loaded venues:", venues.length);

let queries = venues.map(v => 
  `${v.venueName} New York instagram`
).join("\n");

fs.writeFileSync(OUTPUT, queries);

console.log("📄 IG query file created →", OUTPUT);

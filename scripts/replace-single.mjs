import { readFileSync, writeFileSync } from "node:fs";
const p = "src/routes/app.analytics.tsx";
let t = readFileSync(p, "utf8");
let b = t;
t = t.split('emoji="📊"').join('emoji="ChartColumn"');
if (t !== b) { writeFileSync(p, t, "utf8"); console.log("updated"); } else console.log("no change");
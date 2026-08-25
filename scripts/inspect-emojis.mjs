import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const src = join(process.cwd(), "src");
const emojiRe =
  /[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{2702}\u{2705}]/gu;

const SKIP = new Set(["node_modules"]);

function walk(dir) {
  let out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(tsx|ts|css|md)$/.test(entry.name) && full.includes(join("src"))) out.push(full);
  }
  return out;
}

const files = walk(src);
const max = (a, b) => (a > b ? a : b);

for (const file of files.sort()) {
  const content = readFileSync(file, "utf8");
  const lines = content.split(/\r?\n/);
  let hits = 0;
  const lineHits = [];
  lines.forEach((line, i) => {
    const matches = [...line.matchAll(emojiRe)];
    if (matches.length) {
      hits += matches.length;
      lineHits.push(`${i + 1}: ${line.trim()}`);
    }
  });
  if (hits) {
    console.log(`\n=== ${file} (${hits}) ===`);
    for (const l of lineHits) console.log(l.slice(0, 220));
  }
}
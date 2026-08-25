import { readFileSync, writeFileSync } from "node:fs";

// Reliable emoji -> icon / text replacements across remaining route files.
// Strings are written with "\uXXXX" escapes so the source stays ASCII-safe.

const FILES_PATTERNS = [
  {
    path: "src/routes/app.numi.tsx",
    pairs: [
      ['emoji="🤖"', 'emoji="Bot"'],
      ["💬 {c.title}", "{c.title}"],
      ["<span aria-hidden>{q.emoji}</span> {q.label}", "<Icon symbol={q.icon} size={14} className=\"mr-1 inline-block align-[-2px]\" /> {q.label}"],
      ["{USER.avatar}", '<Icon symbol={USER.avatar} size={18} />'],
    ],
  },
];

for (const { path, pairs } of FILES_PATTERNS) {
  let text = readFileSync(path, "utf8");
  let before = text;
  for (const [from, to] of pairs) {
    text = text.split(from).join(to);
  }
  if (text !== before) {
    writeFileSync(path, text, "utf8");
    console.log(`updated ${path}`);
  } else {
    console.log(`NO CHANGE ${path}`);
  }
}
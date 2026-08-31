import { readFileSync } from "node:fs";
import { parse } from "@babel/parser";

const files = [
  "src/components/numind/icon.tsx",
  "src/components/numind/ui-kit.tsx",
  "src/components/numind/celebration.tsx",
  "src/components/layout/AppShell.tsx",
  "src/components/layout/SiteChrome.tsx",
  "src/components/auth/AuthCard.tsx",
  "src/lib/mock-data.ts",
  "src/lib/numind-store.tsx",
  "src/lib/focus-sounds.ts",
  "src/lib/server-functions.ts",
  "src/routes/index.tsx",
  "src/routes/about.tsx",
  "src/routes/features.tsx",
  "src/routes/forgot-password.tsx",
  "src/routes/reset-password.tsx",
  "src/routes/signup.tsx",
  "src/routes/onboarding.tsx",
  "src/routes/app.index.tsx",
  "src/routes/app.analytics.tsx",
  "src/routes/app.focus.tsx",
  "src/routes/app.garden.tsx",
  "src/routes/app.journey.tsx",
  "src/routes/app.learning.tsx",
  "src/routes/app.memory-lane.tsx",
  "src/routes/app.mind-gym.tsx",
  "src/routes/app.notifications.tsx",
  "src/routes/app.numi.tsx",
  "src/routes/app.play.tsx",
  "src/routes/app.profile.tsx",
  "src/routes/app.quest.tsx",
  "src/routes/app.rewards.tsx",
  "src/routes/app.safety.tsx",
  "src/routes/app.together.tsx",
  "src/routes/app.journal.tsx",
  "src/routes/app.check-ins.tsx",
  "src/routes/app.reports.tsx",
  "src/lib/screening-instruments.ts",
  "src/components/numind/safety-support.tsx",
];

let fail = 0;
for (const f of files) {
  try {
    const code = readFileSync(f, "utf8");
    parse(code, {
      sourceType: "module",
      plugins: ["typescript", "jsx"],
      errorRecovery: false,
    });
    console.log("OK  " + f);
  } catch (e) {
    fail++;
    console.log("FAIL " + f + " :: " + e.message);
  }
}
console.log(fail ? `\n${fail} file(s) failed` : "\nAll files parsed cleanly");
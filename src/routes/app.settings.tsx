import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useNuMind } from "@/lib/numind-store";
import { PageHeader, SoftCard, SectionTitle, DisclaimerNote } from "@/components/numind/ui-kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/settings")({
  head: () => ({
    meta: [
      { title: "Settings — NuMind" },
      { name: "description", content: "Account, notifications, appearance, accessibility, privacy, AI and community preferences." },
      { property: "og:title", content: "Settings — NuMind" },
      { property: "og:description", content: "Account, notifications, appearance, accessibility, privacy, AI and community preferences." },
    ],
  }),
  component: SettingsPage,
});

function Row({ label, hint, control }: { label: string; hint?: string; control: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3 last:border-0">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      {control}
    </div>
  );
}

function Toggle({ defaultOn = true, label }: { defaultOn?: boolean; label: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2">
      <span className="sr-only">{label}</span>
      <input type="checkbox" defaultChecked={defaultOn} className="peer sr-only" />
      <span className="h-6 w-11 rounded-full bg-muted p-0.5 transition peer-checked:bg-teal peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--color-ring)]">
        <span className="block h-5 w-5 rounded-full bg-surface shadow transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

function SettingsPage() {
  const { theme, setTheme, fontScale, setFontScale } = useNuMind();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader emoji="⚙️" title="Settings" subtitle="Everything tuned the way you like it." />

      <div className="grid gap-4">
        <SoftCard>
          <SectionTitle>Account</SectionTitle>
          <Row label="Profile" hint="Avatar, nickname and goals" control={<Link to="/app/profile" className="focus-ring rounded-full bg-muted px-4 py-2 text-sm font-semibold">Edit</Link>} />
          <Row label="Password & security" control={<button className="focus-ring rounded-full bg-muted px-4 py-2 text-sm font-semibold">Manage</button>} />
          <Row label="Delete account" hint="This removes your data permanently" control={<button className="focus-ring rounded-full bg-destructive/15 px-4 py-2 text-sm font-semibold text-destructive">Delete</button>} />
        </SoftCard>

        <SoftCard>
          <SectionTitle>Notifications</SectionTitle>
          <Row label="Daily Reset reminder" control={<Toggle label="Daily Reset reminder" />} />
          <Row label="Streak nudges" control={<Toggle label="Streak nudges" />} />
          <Row label="Garden & rewards" control={<Toggle label="Garden and rewards" />} />
          <Row label="Community activity" control={<Toggle defaultOn={false} label="Community activity" />} />
          <Row label="Reminder time" control={<select className="focus-ring rounded-full border border-border bg-background px-4 py-2 text-sm"><option>Morning</option><option>Afternoon</option><option>Evening</option><option>Custom</option></select>} />
        </SoftCard>

        <SoftCard>
          <SectionTitle>Appearance</SectionTitle>
          <div className="flex gap-2">
            {(["light", "dark", "system"] as const).map((t) => (
              <button key={t} onClick={() => setTheme(t)} aria-pressed={theme === t} className={cn("focus-ring rounded-full px-4 py-2 text-sm font-medium capitalize", theme === t ? "bg-brand font-bold text-navy" : "bg-muted")}>
                {t === "light" ? "☀️ Light" : t === "dark" ? "🌙 Dark" : "🖥 System"}
              </button>
            ))}
          </div>
        </SoftCard>

        <SoftCard>
          <SectionTitle>Accessibility</SectionTitle>
          <label htmlFor="font" className="text-sm font-medium">Font size — {fontScale}%</label>
          <input id="font" type="range" min={90} max={130} step={5} value={fontScale} onChange={(e) => setFontScale(Number(e.target.value))} className="focus-ring mt-3 w-full accent-[var(--color-teal)]" />
          <Row label="Reduce motion" hint="Also follows your system setting" control={<Toggle defaultOn={false} label="Reduce motion" />} />
          <Row label="High contrast text" control={<Toggle defaultOn={false} label="High contrast text" />} />
        </SoftCard>

        <SoftCard>
          <SectionTitle>Privacy</SectionTitle>
          <Row label="Private journal" hint="Never shown in community" control={<Toggle label="Private journal" />} />
          <Row label="Export my data" control={<button className="focus-ring rounded-full bg-muted px-4 py-2 text-sm font-semibold">Export</button>} />
          <Row label="Delete my data" control={<button className="focus-ring rounded-full bg-muted px-4 py-2 text-sm font-semibold">Request</button>} />
        </SoftCard>

        <SoftCard>
          <SectionTitle>AI</SectionTitle>
          <Row label="Numi personalization" control={<Toggle label="Numi personalization" />} />
          <Row label="Let Numi remember my goals" control={<Toggle label="Numi memory" />} />
          <div className="mt-3">
            <DisclaimerNote>Numi is an AI wellness companion, not a healthcare professional.</DisclaimerNote>
          </div>
        </SoftCard>

        <SoftCard>
          <SectionTitle>Community</SectionTitle>
          <Row label="Show my nickname on posts" control={<Toggle label="Show nickname" />} />
          <Row label="Appear in community milestones" control={<Toggle label="Community milestones" />} />
        </SoftCard>

        <SoftCard>
          <SectionTitle>Legal</SectionTitle>
          <div className="flex flex-wrap gap-2">
            <Link to="/terms" className="focus-ring rounded-full bg-muted px-4 py-2 text-sm font-semibold">Terms</Link>
            <Link to="/privacy" className="focus-ring rounded-full bg-muted px-4 py-2 text-sm font-semibold">Privacy Policy</Link>
            <Link to="/app/safety" className="focus-ring rounded-full bg-muted px-4 py-2 text-sm font-semibold">Safety Center</Link>
          </div>
        </SoftCard>
      </div>
    </div>
  );
}

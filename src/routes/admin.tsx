import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ADMIN_METRICS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "NuMind Admin" },
      { name: "description", content: "Mock admin dashboard for content, gamification and engagement metrics." },
      { property: "og:title", content: "NuMind Admin" },
      { property: "og:description", content: "Mock admin dashboard for content, gamification and engagement metrics." },
    ],
  }),
  component: Admin,
});

const SECTIONS = ["Dashboard","Users","Subscriptions","Quests","Mind Gym","Healthy Play","Learning Lounge","Quizzes","XP","Levels","Badges","Rewards","Garden Items","Themes","Numi Prompts","Notifications","Together Moderation","Safety Resources","Seasonal Events","Feature Flags","Analytics"];

function Admin() {
  const [section, setSection] = useState("Dashboard");
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-60 shrink-0 border-r border-border bg-sidebar p-4 lg:block">
        <p className="mb-4 px-2 text-sm font-bold">🧠 NuMind Admin</p>
        <nav className="grid gap-0.5" aria-label="Admin">
          {SECTIONS.map((s) => (
            <button key={s} onClick={() => setSection(s)} aria-current={section === s ? "page" : undefined} className={cn("focus-ring rounded-xl px-3 py-2 text-left text-sm", section === s ? "bg-brand font-semibold text-navy" : "text-muted-foreground hover:bg-muted")}>
              {s}
            </button>
          ))}
        </nav>
      </aside>
      <main className="min-w-0 flex-1 p-6">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">{section}</h1>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">Mock data</span>
          <select className="focus-ring ml-auto rounded-full border border-border bg-card px-4 py-2 text-sm" aria-label="Date range">
            <option>Last 7 days</option><option>Last 30 days</option><option>Last quarter</option>
          </select>
        </div>
        <div className="mb-4 flex gap-2 overflow-x-auto lg:hidden">
          {SECTIONS.slice(0, 6).map((s) => (
            <button key={s} onClick={() => setSection(s)} className={cn("shrink-0 rounded-full px-3 py-1.5 text-xs", section === s ? "bg-brand text-navy" : "bg-muted")}>{s}</button>
          ))}
        </div>

        {section === "Dashboard" || section === "Analytics" ? (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {ADMIN_METRICS.map((m) => (
              <li key={m.label} className="card-soft p-4">
                <p className="text-xs text-muted-foreground">{m.label}</p>
                <p className="mt-1 text-xl font-bold">{m.value}</p>
                <p className={cn("text-xs font-semibold", m.delta.startsWith("-") ? "text-destructive" : "text-teal")}>{m.delta}</p>
              </li>
            ))}
          </ul>
        ) : (
          <div className="card-soft p-6">
            <p className="font-semibold">{section} management</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create, edit, publish and schedule {section.toLowerCase()} content. Mock UI for Phase 1 review.
            </p>
            <table className="mt-5 w-full text-left text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr><th className="py-2">Name</th><th>Status</th><th>Updated</th><th /></tr>
              </thead>
              <tbody>
                {["Item A", "Item B", "Item C"].map((r, i) => (
                  <tr key={r} className="border-t border-border">
                    <td className="py-3 font-medium">{section} — {r}</td>
                    <td><span className={cn("rounded-full px-3 py-1 text-xs font-semibold", i === 1 ? "bg-muted" : "bg-mint/40")}>{i === 1 ? "Draft" : "Published"}</span></td>
                    <td className="text-muted-foreground">2 days ago</td>
                    <td className="text-right"><button className="focus-ring rounded-full bg-muted px-3 py-1.5 text-xs font-semibold">Edit</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-6 text-xs text-muted-foreground">
          Journal entries and Numi conversations are never surfaced here as analytics.
        </p>
      </main>
    </div>
  );
}

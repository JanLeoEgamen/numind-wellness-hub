import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useNuMind } from "@/lib/numind-store";
import { PageHeader, SoftCard, SectionTitle, DisclaimerNote } from "@/components/numind/ui-kit";
import { cn } from "@/lib/utils";
import type { UserSettings } from "@/lib/server-functions";
import { changeMyPassword, deleteMyAccount, exportMyData } from "@/lib/server-functions";
import { signOut } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

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

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2">
      <span className="sr-only">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span className="h-6 w-11 rounded-full bg-muted p-0.5 transition peer-checked:bg-teal peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--color-ring)]">
        <span className="block h-5 w-5 rounded-full bg-surface shadow transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

function SettingsPage() {
  const { settings, setSettings } = useNuMind();
  const navigate = useNavigate();
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteDataOpen, setDeleteDataOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const patch = (p: Partial<UserSettings>) => setSettings(p);

  const toastError = (e: unknown, fallback: string) =>
    toast.error(e instanceof Error ? e.message : fallback);

  const submitPassword = async () => {
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match.");
      return;
    }
    setChangingPassword(true);
    try {
      await changeMyPassword({ data: { newPassword } });
      toast.success("Password updated.");
      setPasswordOpen(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (e) {
      toastError(e, "Could not update your password.");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await exportMyData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `numind-data-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Your data export is ready.");
    } catch (e) {
      toastError(e, "Could not export your data.");
    } finally {
      setExporting(false);
    }
  };

  const deleteAccountFlow = async (source: "account" | "data") => {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteMyAccount();
      try {
        await signOut();
      } catch {
        // The session is gone with the deleted user; navigation still works.
      }
      navigate({ to: "/" });
      toast.success(source === "account" ? "Your account was deleted." : "Your data was deleted.");
    } catch (e) {
      toastError(e, "Could not delete your account.");
      setDeleting(false);
      setDeleteOpen(false);
      setDeleteDataOpen(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader emoji="⚙️" title="Settings" subtitle="Everything tuned the way you like it." />

      <div className="grid gap-4">
        <SoftCard>
          <SectionTitle>Account</SectionTitle>
          <Row label="Profile" hint="Avatar, nickname and goals" control={<Link to="/app/profile" className="focus-ring rounded-full bg-muted px-4 py-2 text-sm font-semibold">Edit</Link>} />
          <Row label="Password & security" control={<button onClick={() => setPasswordOpen(true)} className="focus-ring rounded-full bg-muted px-4 py-2 text-sm font-semibold">Manage</button>} />
          <Row label="Delete account" hint="This removes your data permanently" control={<button onClick={() => setDeleteOpen(true)} className="focus-ring rounded-full bg-destructive/15 px-4 py-2 text-sm font-semibold text-destructive">Delete</button>} />
        </SoftCard>

        <SoftCard>
          <SectionTitle>Notifications</SectionTitle>
          <Row label="Daily Reset reminder" control={<Toggle checked={settings.dailyResetReminder} onChange={(v) => patch({ dailyResetReminder: v })} label="Daily Reset reminder" />} />
          <Row label="Streak nudges" control={<Toggle checked={settings.streakNudges} onChange={(v) => patch({ streakNudges: v })} label="Streak nudges" />} />
          <Row label="Garden & rewards" control={<Toggle checked={settings.gardenRewards} onChange={(v) => patch({ gardenRewards: v })} label="Garden and rewards" />} />
          <Row label="Community activity" control={<Toggle checked={settings.communityActivity} onChange={(v) => patch({ communityActivity: v })} label="Community activity" />} />
          <Row label="Reminder time" control={
            <select value={settings.reminderTime} onChange={(e) => patch({ reminderTime: e.target.value as UserSettings["reminderTime"] })} className="focus-ring rounded-full border border-border bg-background px-4 py-2 text-sm">
              <option value="Morning">Morning</option>
              <option value="Afternoon">Afternoon</option>
              <option value="Evening">Evening</option>
              <option value="Custom">Custom</option>
            </select>
          } />
        </SoftCard>

        <SoftCard>
          <SectionTitle>Appearance</SectionTitle>
          <div className="flex gap-2">
            {(["light", "dark", "system"] as const).map((t) => (
              <button key={t} onClick={() => patch({ theme: t })} aria-pressed={settings.theme === t} className={cn("focus-ring rounded-full px-4 py-2 text-sm font-medium capitalize", settings.theme === t ? "bg-brand font-bold text-navy" : "bg-muted")}>
                {t === "light" ? "☀️ Light" : t === "dark" ? "🌙 Dark" : "🖥 System"}
              </button>
            ))}
          </div>
        </SoftCard>

        <SoftCard>
          <SectionTitle>Accessibility</SectionTitle>
          <label htmlFor="font" className="text-sm font-medium">Font size — {settings.fontScale}%</label>
          <input id="font" type="range" min={90} max={130} step={5} value={settings.fontScale} onChange={(e) => patch({ fontScale: Number(e.target.value) })} className="focus-ring mt-3 w-full accent-[var(--color-teal)]" />
          <Row label="Reduce motion" hint="Also follows your system setting" control={<Toggle checked={settings.reduceMotion} onChange={(v) => patch({ reduceMotion: v })} label="Reduce motion" />} />
          <Row label="High contrast text" control={<Toggle checked={settings.highContrast} onChange={(v) => patch({ highContrast: v })} label="High contrast text" />} />
        </SoftCard>

        <SoftCard>
          <SectionTitle>Privacy</SectionTitle>
          <Row label="Private journal" hint="Never shown in community" control={<Toggle checked={settings.privateJournal} onChange={(v) => patch({ privateJournal: v })} label="Private journal" />} />
          <Row label="Export my data" control={<button onClick={handleExport} disabled={exporting} className="focus-ring rounded-full bg-muted px-4 py-2 text-sm font-semibold disabled:opacity-50">{exporting ? "Exporting…" : "Export"}</button>} />
          <Row label="Delete my data" control={<button onClick={() => setDeleteDataOpen(true)} className="focus-ring rounded-full bg-muted px-4 py-2 text-sm font-semibold">Request</button>} />
        </SoftCard>

        <SoftCard>
          <SectionTitle>AI</SectionTitle>
          <Row label="Numi personalization" control={<Toggle checked={settings.numiPersonalization} onChange={(v) => patch({ numiPersonalization: v })} label="Numi personalization" />} />
          <Row label="Let Numi remember my goals" control={<Toggle checked={settings.numiMemory} onChange={(v) => patch({ numiMemory: v })} label="Numi memory" />} />
          <div className="mt-3">
            <DisclaimerNote>Numi is an AI wellness companion, not a healthcare professional.</DisclaimerNote>
          </div>
        </SoftCard>

        <SoftCard>
          <SectionTitle>Community</SectionTitle>
          <Row label="Show my nickname on posts" control={<Toggle checked={settings.showNickname} onChange={(v) => patch({ showNickname: v })} label="Show nickname" />} />
          <Row label="Appear in community milestones" control={<Toggle checked={settings.appearInMilestones} onChange={(v) => patch({ appearInMilestones: v })} label="Community milestones" />} />
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

      {/* Password & security */}
      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>Change your password</DialogTitle>
            <DialogDescription>
              You'll stay signed in everywhere. Use at least 8 characters.
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              submitPassword();
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="new-password">New password</Label>
              <Input id="new-password" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input id="confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <DialogFooter className="sm:justify-end">
              <Button type="button" variant="ghost" onClick={() => setPasswordOpen(false)} disabled={changingPassword}>Cancel</Button>
              <Button type="submit" disabled={changingPassword}>{changingPassword ? "Updating…" : "Update password"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete account */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="max-w-sm rounded-3xl text-center">
          <AlertDialogHeader className="items-center text-center">
            <span className="text-4xl" aria-hidden>🗑️</span>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes your account, journal, XP, garden and all personal data. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                deleteAccountFlow("account");
              }}
              disabled={deleting}
              className="bg-destructive text-white hover:brightness-110"
            >
              {deleting ? "Deleting…" : "Delete account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete my data */}
      <AlertDialog open={deleteDataOpen} onOpenChange={setDeleteDataOpen}>
        <AlertDialogContent className="max-w-sm rounded-3xl text-center">
          <AlertDialogHeader className="items-center text-center">
            <span className="text-4xl" aria-hidden>🫧</span>
            <AlertDialogTitle>Delete all of your data?</AlertDialogTitle>
            <AlertDialogDescription>
              This erases your account and everything in it — journal, habits, XP, garden, memories and Numi conversations. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                deleteAccountFlow("data");
              }}
              disabled={deleting}
              className="bg-destructive text-white hover:brightness-110"
            >
              {deleting ? "Deleting…" : "Delete my data"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

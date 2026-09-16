import { useCallback, useEffect, useState } from "react";

import {
  canPromptInstall,
  detectPlatform,
  isStandalone,
  promptInstall,
  subscribeToInstallChanges,
  supportsInstallPrompt,
  type InstallOutcome,
} from "@/lib/pwa";

export type InstallStatus = "installed" | "installable" | "ios" | "unsupported";

export interface PwaInstall {
  /** False during SSR and the first paint, so markup can match on hydration. */
  ready: boolean;
  status: InstallStatus;
  install: () => Promise<InstallOutcome>;
}

function resolveStatus(): InstallStatus {
  if (isStandalone()) return "installed";
  if (canPromptInstall()) return "installable";
  // iOS (Safari and every other browser on iOS) never fires the prompt, so it
  // gets written instructions instead of a button.
  if (detectPlatform() === "ios") return "ios";
  if (supportsInstallPrompt()) return "installable";
  return "unsupported";
}

/** Reads whether NuMind can be installed on this device, and triggers the prompt. */
export function usePwaInstall(): PwaInstall {
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<InstallStatus>("unsupported");

  useEffect(() => {
    setStatus(resolveStatus());
    setReady(true);

    const unsubscribe = subscribeToInstallChanges(() => setStatus(resolveStatus()));
    const displayMode = window.matchMedia("(display-mode: standalone)");
    const onChange = () => setStatus(resolveStatus());

    displayMode.addEventListener("change", onChange);
    window.addEventListener("appinstalled", onChange);

    return () => {
      unsubscribe();
      displayMode.removeEventListener("change", onChange);
      window.removeEventListener("appinstalled", onChange);
    };
  }, []);

  const install = useCallback(() => promptInstall(), []);

  return { ready, status, install };
}

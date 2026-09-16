/**
 * PWA plumbing for NuMind: service worker registration, install prompt capture
 * and platform detection.
 *
 * The root route imports this, and the root route also renders on the server,
 * so every entry point guards on `window`.
 *
 * @see public/sw.js for the caching strategy
 * @see public/manifest.webmanifest for the install metadata
 */
import { toast } from "sonner";

/** Shape Chrome and Edge fire for `beforeinstallprompt`. */
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt: () => Promise<void>;
}

export type InstallPlatform = "ios" | "chromium" | "other";
export type InstallOutcome = "accepted" | "dismissed" | "unavailable";

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const subscribers = new Set<() => void>();

function notifySubscribers() {
  subscribers.forEach((listener) => listener());
}

/*
 * Captured at module scope on purpose: Chrome can fire `beforeinstallprompt`
 * before React hydrates, and a listener attached in an effect would miss it.
 */
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    notifySubscribers();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    notifySubscribers();
  });
}

export function subscribeToInstallChanges(listener: () => void): () => void {
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
  };
}

/** True once the browser is ready to show its native install prompt. */
export function canPromptInstall(): boolean {
  return deferredPrompt !== null;
}

/** True when the browser supports the install prompt at all (Chromium engines). */
export function supportsInstallPrompt(): boolean {
  return typeof window !== "undefined" && "onbeforeinstallprompt" in window;
}

export async function promptInstall(): Promise<InstallOutcome> {
  if (!deferredPrompt) return "unavailable";
  const event = deferredPrompt;
  try {
    await event.prompt();
    const { outcome } = await event.userChoice;
    return outcome;
  } finally {
    deferredPrompt = null;
    notifySubscribers();
  }
}

/** True when NuMind is already running as an installed app. */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const mediaMatch =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches;
  const iosStandalone =
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return mediaMatch || iosStandalone;
}

export function detectPlatform(): InstallPlatform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  const iPadOsSafari =
    typeof document !== "undefined" && /Macintosh/.test(ua) && "ontouchend" in document;
  if (/iPad|iPhone|iPod/.test(ua) || iPadOsSafari) return "ios";
  if (supportsInstallPrompt()) return "chromium";
  return "other";
}

/**
 * Registers `public/sw.js`. Deliberately a no-op outside production builds so
 * the Lovable editor preview and local `vite dev` never end up with a worker
 * serving stale HTML.
 */
export function registerServiceWorker(): void {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  if (!import.meta.env.PROD) return;

  window.addEventListener(
    "load",
    () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .then((registration) => {
          registration.addEventListener("updatefound", () => {
            const installing = registration.installing;
            if (!installing) return;
            installing.addEventListener("statechange", () => {
              // A controller already exists, so this is an update rather than
              // the very first install.
              if (installing.state === "installed" && navigator.serviceWorker.controller) {
                toast("A new version of NuMind is ready — refresh to update.");
              }
            });
          });
        })
        .catch((error: unknown) => {
          console.warn("NuMind: service worker registration failed", error);
        });
    },
    { once: true },
  );
}

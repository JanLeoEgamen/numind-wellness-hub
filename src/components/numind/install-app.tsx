import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { Icon } from "@/components/numind/icon";
import { NumiAvatar, SoftCard } from "@/components/numind/ui-kit";
import { usePwaInstall } from "@/hooks/usePwaInstall";

/**
 * Landing-page install section (README §8).
 *
 * The panel below the copy is device aware: Chromium gets a real install button
 * (native `beforeinstallprompt`), iOS gets Add to Home Screen steps because
 * Safari has no install prompt, and everything else gets a hint. During SSR the
 * button renders as a neutral placeholder, so the server HTML and the first
 * client render match.
 */

const HIGHLIGHTS = [
  {
    symbol: "Smartphone",
    title: "One tap to install",
    text: "Added from this page — no app store, nothing to download.",
  },
  {
    symbol: "Cloud",
    title: "Works offline",
    text: "Opens full screen and keeps your recent pages available.",
  },
  {
    symbol: "RefreshCcw",
    title: "Always current",
    text: "Updates itself whenever NuMind ships something new.",
  },
];

function InstallPanel() {
  const { ready, status, install } = usePwaInstall();

  async function handleInstall() {
    const outcome = await install();
    if (outcome === "accepted") {
      toast.success("NuMind is on your home screen — enjoy!");
    } else if (outcome === "dismissed") {
      toast("No rush — you can install any time from this page.");
    } else {
      toast("Open your browser menu and choose “Install NuMind”.");
    }
  }

  if (!ready) {
    return (
      <>
        <button
          type="button"
          disabled
          aria-busy="true"
          className="w-full cursor-default rounded-full bg-brand px-6 py-3.5 text-base font-bold text-navy opacity-60"
        >
          Install NuMind
        </button>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Checking what this device supports…
        </p>
      </>
    );
  }

  if (status === "installed") {
    return (
      <>
        <p className="flex items-center justify-center gap-2 text-sm font-semibold text-teal">
          <Icon symbol="CircleCheck" size={18} /> Installed on this device
        </p>
        <Link
          to="/app"
          className="focus-ring mt-4 inline-flex w-full items-center justify-center rounded-full bg-brand px-6 py-3.5 text-base font-bold text-navy shadow-glow"
        >
          Open the app
        </Link>
      </>
    );
  }

  if (status === "ios") {
    return (
      <>
        <p className="text-sm font-semibold">On iPhone or iPad:</p>
        <ol className="mt-3 grid list-decimal gap-2 pl-5 text-sm text-muted-foreground">
          <li>Tap the Share button in Safari&rsquo;s toolbar.</li>
          <li>Scroll the sheet and choose &ldquo;Add to Home Screen&rdquo;.</li>
          <li>Tap &ldquo;Add&rdquo; — NuMind appears with your other apps.</li>
        </ol>
        <p className="mt-4 text-xs text-muted-foreground">
          iOS only installs home-screen apps from Safari, so open NuMind there if you are reading
          this in another browser.
        </p>
      </>
    );
  }

  if (status === "unsupported") {
    return (
      <>
        <p className="text-sm text-muted-foreground">
          This browser cannot install web apps. Open NuMind in Chrome or Edge on Android or desktop
          — or in Safari on iPhone and iPad — and use this section again.
        </p>
        <Link
          to="/faq"
          className="focus-ring mt-4 inline-flex items-center gap-1 text-sm font-semibold text-teal"
        >
          More questions? <Icon symbol="ArrowRight" size={16} />
        </Link>
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void handleInstall()}
        className="focus-ring w-full rounded-full bg-brand px-6 py-3.5 text-base font-bold text-navy shadow-glow"
      >
        <Icon symbol="Smartphone" size={16} className="mr-2 inline-block align-[-2px]" /> Install
        NuMind
      </button>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Works in Chrome, Edge and Android browsers. Takes a second, installs no extra storage.
      </p>
    </>
  );
}

export function InstallAppSection() {
  return (
    <section id="install" className="bg-hero scroll-mt-20 py-16">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2">
        <div>
          <span className="inline-flex rounded-full bg-surface px-4 py-1.5 text-xs font-bold shadow-soft">
            Install the app
          </span>
          <h2 className="mt-5 text-3xl font-bold">Keep NuMind one tap away</h2>
          <p className="mt-3 max-w-lg text-muted-foreground">
            Add NuMind to your phone or desktop straight from this page. It opens full screen, works
            offline and updates itself — no store, nothing to download.
          </p>
          <ul className="mt-7 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {HIGHLIGHTS.map((item) => (
              <li key={item.title} className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-surface text-teal shadow-soft">
                  <Icon symbol={item.symbol} size={18} />
                </span>
                <span>
                  <span className="block font-semibold">{item.title}</span>
                  <span className="block text-sm text-muted-foreground">{item.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <SoftCard className="mx-auto w-full max-w-md">
          <div className="flex items-center gap-3">
            <NumiAvatar size={48} />
            <div>
              <p className="font-bold">NuMind app</p>
              <p className="text-xs text-muted-foreground">
                Free · Android, iOS, Windows and macOS
              </p>
            </div>
          </div>
          <div className="mt-5">
            <InstallPanel />
          </div>
        </SoftCard>
      </div>
    </section>
  );
}

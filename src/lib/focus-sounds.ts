// Web Audio ambient sounds + completion chime for the Focus Zone.
// All sounds are generated locally with the Web Audio API — zero assets, zero
// network requests, works offline. The AudioContext is only ever created from a
// user gesture (clicking Start or a sound button), which browsers require.

export type FocusSound = "off" | "rain" | "waves" | "white" | "brown";

const SOUND_LABELS: Record<Exclude<FocusSound, "off">, string> = {
  rain: "Rain",
  waves: "Waves",
  white: "White",
  brown: "Brown",
};

function noiseBuffer(ac: AudioContext, kind: "white" | "brown"): AudioBuffer {
  const length = ac.sampleRate * 2;
  const buffer = ac.createBuffer(1, length, ac.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    if (kind === "white") {
      data[i] = white;
    } else {
      // Brown noise: integrate + gentle decay, then amplify back to range.
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
  }
  return buffer;
}

export class FocusSoundPlayer {
  private ctx: AudioContext | null = null;
  private sources: AudioBufferSourceNode[] = [];
  private gains: GainNode[] = [];
  private lfo: { stop: () => void } | null = null;

  private ensure(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      type AudioCtor = typeof AudioContext;
      const Ctor: AudioCtor | undefined =
        window.AudioContext ?? (window as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  play(kind: Exclude<FocusSound, "off">): void {
    this.stop();
    const ac = this.ensure();
    if (!ac) return;

    const source = ac.createBufferSource();
    source.buffer = noiseBuffer(ac, kind === "white" ? "white" : "brown");
    source.loop = true;

    const filter = ac.createBiquadFilter();
    filter.type = "lowpass";
    const gain = ac.createGain();

    if (kind === "rain") {
      filter.frequency.value = 1500;
      gain.gain.value = 0.16;
    } else if (kind === "waves") {
      filter.frequency.value = 420;
      gain.gain.value = 0.34;
    } else if (kind === "white") {
      filter.frequency.value = 3200;
      gain.gain.value = 0.07;
    } else {
      filter.frequency.value = 650;
      gain.gain.value = 0.3;
    }

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ac.destination);
    source.start();

    this.sources = [source];
    this.gains = [gain];

    // A slow swell LFO gives rain and waves a natural, breathing feel.
    if (kind === "rain" || kind === "waves") {
      const lfo = ac.createOscillator();
      const lfoGain = ac.createGain();
      lfo.type = "sine";
      lfo.frequency.value = kind === "rain" ? 0.3 : 0.11;
      lfoGain.gain.value = kind === "rain" ? 0.06 : 0.16;
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      lfo.start();
      this.lfo = {
        stop: () => {
          try {
            lfo.stop();
          } catch {
            /* already stopped */
          }
          lfo.disconnect();
          lfoGain.disconnect();
        },
      };
    }
  }

  stop(): void {
    for (const s of this.sources) {
      try {
        s.stop();
      } catch {
        /* already stopped */
      }
      s.disconnect();
    }
    for (const g of this.gains) g.disconnect();
    this.lfo?.stop();
    this.sources = [];
    this.gains = [];
    this.lfo = null;
  }

  // Gentle ascending arpeggio (C5 E5 G5 C6) used at phase transitions.
  chime(): void {
    const ac = this.ensure();
    if (!ac) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const t0 = ac.currentTime + i * 0.12;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.22, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.1);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(t0);
      osc.stop(t0 + 1.2);
    });
  }
}

export const focusSoundPlayer = new FocusSoundPlayer();
export { SOUND_LABELS };

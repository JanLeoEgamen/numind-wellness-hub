// Official screening instrument content for the Symptom Check-Ins feature
// (README: PHQ-9 §21, GAD-7 §22).
//
// IMPORTANT: The item wording below is the verified official PHQ-9 and GAD-7
// text. Do not paraphrase questionnaire items. These questionnaires are
// screening tools only — they do not provide a diagnosis or replace evaluation
// by a qualified healthcare professional.

export type ScreeningInstrumentId = "PHQ9" | "GAD7";

export type ScreeningResponseOption = { value: number; label: string };

export type ScreeningRange = {
  min: number;
  max: number;
  label: "Minimal" | "Mild" | "Moderate" | "Moderately severe" | "Severe";
};

export type ScreeningInstrument = {
  id: ScreeningInstrumentId;
  consumerLabel: string;
  secondaryLabel: string;
  description: string;
  emoji: string;
  tone: "teal" | "lavender" | "mint" | "sun" | "coral" | "cyan";
  heading: string;
  /** Shown before beginning (required for PHQ-9). */
  preamble: string | null;
  /** Verbatim official questionnaire items — never paraphrase. */
  items: readonly string[];
  responseScale: ScreeningResponseOption[];
  scoreMax: number;
  ranges: ScreeningRange[];
  /** Required result display text; the "[range]" token is replaced. */
  finishedText: string;
  resultDisclaimer: string;
};

const RESPONSE_SCALE: ScreeningResponseOption[] = [
  { value: 0, label: "Not at all" },
  { value: 1, label: "Several days" },
  { value: 2, label: "More than half the days" },
  { value: 3, label: "Nearly every day" },
];

// ---------------------------------------------------------------------------
// PHQ-9 — official 9-item wording
// ---------------------------------------------------------------------------
const PHQ9_ITEMS: readonly string[] = [
  "Little interest or pleasure in doing things",
  "Feeling down, depressed, or hopeless",
  "Trouble falling or staying asleep, or sleeping too much",
  "Feeling tired or having little energy",
  "Poor appetite or overeating",
  "Feeling bad about yourself — or that you are a failure or have let yourself or your family down",
  "Trouble concentrating on things, such as reading the newspaper or watching television",
  "Moving or speaking so slowly that other people could have noticed. Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual",
  "Thoughts that you would be better off dead, or of hurting yourself in some way",
];

// ---------------------------------------------------------------------------
// GAD-7 — official 7-item wording
// ---------------------------------------------------------------------------
const GAD7_ITEMS: readonly string[] = [
  "Feeling nervous, anxious, or on edge",
  "Not being able to stop or control worrying",
  "Worrying too much about different things",
  "Trouble relaxing",
  "Being so restless that it is hard to sit still",
  "Becoming easily annoyed or irritable",
  "Feeling afraid, as if something awful might happen",
];

export const SCREENING_INSTRUMENTS: ScreeningInstrument[] = [
  {
    id: "PHQ9",
    consumerLabel: "Depression Symptom Check-In",
    secondaryLabel: "PHQ-9",
    description: "A 9-item screening questionnaire about how you've felt over the last two weeks.",
    emoji: "HeartPulse",
    tone: "lavender",
    heading: "Over the last 2 weeks, how often have you been bothered by any of the following problems?",
    preamble:
      "The PHQ-9 is a screening questionnaire. It does not provide a diagnosis or replace evaluation by a qualified healthcare professional.",
    items: PHQ9_ITEMS,
    responseScale: RESPONSE_SCALE,
    scoreMax: 27,
    ranges: [
      { min: 0, max: 4, label: "Minimal" },
      { min: 5, max: 9, label: "Mild" },
      { min: 10, max: 14, label: "Moderate" },
      { min: 15, max: 19, label: "Moderately severe" },
      { min: 20, max: 27, label: "Severe" },
    ],
    finishedText:
      "Your responses fall within the [range] symptom range on this screening questionnaire.",
    resultDisclaimer: "This result is not a diagnosis.",
  },
  {
    id: "GAD7",
    consumerLabel: "Anxiety Symptom Check-In",
    secondaryLabel: "GAD-7",
    description: "A 7-item screening questionnaire about how you've felt over the last two weeks.",
    emoji: "HeartPulse",
    tone: "teal",
    heading: "Over the last 2 weeks, how often have you been bothered by the following problems?",
    preamble: null,
    items: GAD7_ITEMS,
    responseScale: RESPONSE_SCALE,
    scoreMax: 21,
    ranges: [
      { min: 0, max: 4, label: "Minimal" },
      { min: 5, max: 9, label: "Mild" },
      { min: 10, max: 14, label: "Moderate" },
      { min: 15, max: 21, label: "Severe" },
    ],
    finishedText:
      "Your responses fall within the [range] symptom range on this screening questionnaire.",
    resultDisclaimer: "This result is not a diagnosis.",
  },
];

export function getScreeningInstrument(id: ScreeningInstrumentId): ScreeningInstrument {
  const found = SCREENING_INSTRUMENTS.find((i) => i.id === id);
  if (!found) throw new Error(`Unknown screening instrument: ${id}`);
  return found;
}

function clampToScale(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(3, Math.round(value)));
}

/** Deterministic total + range for a completed item response set. */
export function scoreResponses(
  id: ScreeningInstrumentId,
  responses: number[],
): { score: number; rangeLabel: ScreeningRange["label"] } {
  const instrument = getScreeningInstrument(id);
  const score = instrument.items.reduce((sum, _, idx) => sum + clampToScale(responses[idx]), 0);
  const range =
    instrument.ranges.find((r) => score >= r.min && score <= r.max) ??
    instrument.ranges[instrument.ranges.length - 1]!;
  return { score, rangeLabel: range.label };
}

/**
 * PHQ-9 SAFETY LOGIC (README §25): a non-zero PHQ-9 item 9 response must
 * trigger deterministic application handling. This is a pure function computed
 * on the client; it never asks Numi whether support should appear.
 */
export function isPhq9SafetyFlagged(
  instrument: ScreeningInstrumentId,
  responses: number[],
): boolean {
  return instrument === "PHQ9" && clampToScale(responses[8]) > 0;
}

/** The required result sentence with the actual range label substituted. */
export function finishedSentence(instrument: ScreeningInstrumentId, rangeLabel: string): string {
  return getScreeningInstrument(instrument).finishedText.replace("[range]", rangeLabel);
}
/**
 * Fit engine: turns a handful of body measurements into a band/cup
 * recommendation, sister sizes, a shape read and per-style fit notes.
 *
 * The engine is pure and synchronous. All math runs in inches; centimetre
 * input is converted up front. A Python port lives in apps/api/fit_engine.py
 * and both are held to the same golden fixtures in fixtures/profiles.json.
 */

export type Unit = 'in' | 'cm';
export type CupScale = 'UK' | 'US';
export type BustMethod = 'standing' | 'leaning' | 'blended';
export type Shape = 'shallow' | 'balanced' | 'projected' | 'unknown';
export type Outlook = 'good' | 'gap-risk' | 'spill-risk' | 'unknown';

export interface Measurements {
  unit: Unit;
  /** Snug underbust, standing, measured on the exhale. */
  underbust: number;
  /** Fullest bust measurement while standing upright. */
  bustStanding: number;
  /** Fullest bust measurement bent forward 90 degrees at the waist. */
  bustLeaning?: number;
  /** Optional shape input: front-to-back depth at the apex. */
  depth?: number;
  /** Optional shape input: breast root width, side to side. */
  width?: number;
}

export interface Size {
  band: number;
  cup: string;
  label: string;
}

export interface StyleFit {
  id: string;
  name: string;
  outlook: Outlook;
  /** User depth-to-width ratio divided by the style's ideal ratio. */
  ratio: number | null;
}

export interface TraceStep {
  step: string;
  detail: string;
}

export interface Recommendation {
  scale: CupScale;
  size: Size;
  alternate: Size | null;
  sisterSizes: Size[];
  bandInches: number;
  effectiveBust: number;
  bustMethod: BustMethod;
  cupSteps: number;
  shape: Shape;
  dwr: number | null;
  styles: StyleFit[];
  notes: string[];
  trace: TraceStep[];
}

export class MeasurementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MeasurementError';
  }
}

export const CM_PER_INCH = 2.54;

/** Maximum standing-vs-leaning gap (in) before the readings get blended. */
export const LEAN_TOLERANCE = 2;
/** Depth-to-width thresholds for the shape read. */
export const DWR_PROJECTED = 1.1;
export const DWR_SHALLOW = 0.9;
/** Allowed deviation from a style's ideal depth-to-width ratio. */
export const STYLE_TOLERANCE = 0.15;

export const CUP_SCALES: Record<CupScale, readonly string[]> = {
  UK: ['AA', 'A', 'B', 'C', 'D', 'DD', 'E', 'F', 'FF', 'G', 'GG', 'H', 'HH', 'J', 'JJ', 'K', 'KK', 'L'],
  US: ['AA', 'A', 'B', 'C', 'D', 'DD', 'DDD', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q'],
};

/**
 * Cut archetypes with the depth-to-width ratio each one is patterned for.
 * Shallow-friendly cuts sit low; deep, seamed cups sit high.
 */
export const STYLES = [
  { id: 'plunge', name: 'Plunge', idealDwr: 0.85 },
  { id: 'balconette', name: 'Balconette', idealDwr: 0.95 },
  { id: 'molded', name: 'Molded T-shirt', idealDwr: 1.0 },
  { id: 'full-cup', name: 'Seamed full cup', idealDwr: 1.15 },
] as const;

/** Half-up rounding, identical in JS and Python (no banker's rounding). */
export function roundHalfUp(x: number): number {
  return Math.floor(x + 0.5);
}

function round2(x: number): number {
  return roundHalfUp(x * 100) / 100;
}

function fmt(x: number): string {
  return round2(x).toFixed(2).replace(/\.?0+$/, '');
}

function makeSize(band: number, steps: number, scale: CupScale): Size | null {
  const cups = CUP_SCALES[scale];
  if (steps < 0 || steps >= cups.length || band < 20) return null;
  const cup = cups[steps];
  return { band, cup, label: `${band}${cup}` };
}

function toInches(value: number | undefined, unit: Unit): number | undefined {
  if (value === undefined) return undefined;
  return unit === 'cm' ? value / CM_PER_INCH : value;
}

function validate(m: Measurements): void {
  const fields: [string, number | undefined][] = [
    ['underbust', m.underbust],
    ['standing bust', m.bustStanding],
    ['leaning bust', m.bustLeaning],
    ['apex depth', m.depth],
    ['root width', m.width],
  ];
  for (const [name, value] of fields) {
    if (value === undefined) continue;
    if (!Number.isFinite(value) || value <= 0) {
      throw new MeasurementError(`${name} must be a positive number`);
    }
  }
  if ((m.depth === undefined) !== (m.width === undefined)) {
    throw new MeasurementError('apex depth and root width are used together; provide both or neither');
  }
}

export function recommend(m: Measurements, scale: CupScale = 'UK'): Recommendation {
  validate(m);
  const trace: TraceStep[] = [];
  const notes: string[] = [];

  const ub = toInches(m.underbust, m.unit)!;
  const standing = toInches(m.bustStanding, m.unit)!;
  const leaning = toInches(m.bustLeaning, m.unit);
  const depth = toInches(m.depth, m.unit);
  const width = toInches(m.width, m.unit);

  if (ub < 20 || ub > 60) {
    throw new MeasurementError('underbust is outside the supported range (20-60 in / 51-152 cm)');
  }
  if (m.unit === 'cm') {
    trace.push({ step: 'Convert', detail: `Centimetres converted to inches (÷ ${CM_PER_INCH}).` });
  }

  // 1. Band: snug underbust rounded to the nearest even number.
  const band = roundHalfUp(ub / 2) * 2;
  trace.push({ step: 'Band', detail: `Underbust ${fmt(ub)} in rounds to band ${band}.` });

  // 2. Effective bust: leaning captures tissue that standing misses.
  let bust = standing;
  let method: BustMethod = 'standing';
  if (leaning !== undefined) {
    const gap = Math.abs(leaning - standing);
    if (gap <= LEAN_TOLERANCE) {
      bust = leaning;
      method = 'leaning';
      trace.push({
        step: 'Bust',
        detail: `Standing and leaning are within ${LEAN_TOLERANCE} in, so the leaning ${fmt(leaning)} in is used.`,
      });
    } else {
      bust = (standing + leaning + 0.9 * leaning) / 3;
      method = 'blended';
      trace.push({
        step: 'Bust',
        detail: `Standing and leaning differ by ${fmt(gap)} in; blended to ${fmt(bust)} in.`,
      });
      notes.push('Standing and leaning readings differ a lot. A lying-down measurement can confirm the blend.');
    }
  } else {
    trace.push({ step: 'Bust', detail: `Standing bust ${fmt(standing)} in (add a leaning reading to refine).` });
  }

  if (bust <= ub) {
    throw new MeasurementError('bust must be larger than underbust');
  }

  // 3. Cup: one cup step per inch of bust over the measured underbust.
  const diff = bust - ub;
  let steps = roundHalfUp(diff);
  trace.push({ step: 'Cup', detail: `Bust − underbust = ${fmt(diff)} in → ${steps} cup steps.` });

  // 4. Shape: depth-to-width ratio nudges the cup up or down.
  let shape: Shape = 'unknown';
  let dwr: number | null = null;
  if (depth !== undefined && width !== undefined) {
    dwr = round2(depth / width);
    if (dwr > DWR_PROJECTED) {
      shape = 'projected';
      steps += 1;
      trace.push({ step: 'Shape', detail: `Depth/width ${fmt(dwr)} > ${DWR_PROJECTED}: projected, up one cup.` });
    } else if (dwr < DWR_SHALLOW) {
      shape = 'shallow';
      steps -= 1;
      trace.push({ step: 'Shape', detail: `Depth/width ${fmt(dwr)} < ${DWR_SHALLOW}: shallow, down one cup.` });
    } else {
      shape = 'balanced';
      trace.push({ step: 'Shape', detail: `Depth/width ${fmt(dwr)} is balanced; no adjustment.` });
    }
  }

  steps = Math.max(steps, 0);
  const size = makeSize(band, steps, scale);
  if (!size) {
    throw new MeasurementError('measurements fall outside the supported size table');
  }
  trace.push({ step: 'Size', detail: `${scale} ${size.label}.` });

  // 5. Alternate band when the underbust sits near an odd number.
  let alternate: Size | null = null;
  const nearestOdd = band + (ub < band ? -1 : 1);
  if (Math.abs(ub - nearestOdd) <= 0.5) {
    const altBand = ub < band ? band - 2 : band + 2;
    const altSteps = ub < band ? steps + 1 : steps - 1;
    alternate = makeSize(altBand, altSteps, scale);
    if (alternate) {
      notes.push(`Underbust sits between bands. Try ${alternate.label} if ${size.label} feels loose or tight at the band.`);
    }
  }

  // 6. Sister sizes keep cup volume while moving the band.
  const sisterSizes = [makeSize(band - 2, steps + 1, scale), makeSize(band + 2, steps - 1, scale)].filter(
    (s): s is Size => s !== null
  );

  // 7. Style outlook against each cut's patterned depth-to-width ratio.
  const styles: StyleFit[] = STYLES.map((s) => {
    if (dwr === null) return { id: s.id, name: s.name, outlook: 'unknown' as Outlook, ratio: null };
    const ratio = round2(dwr / s.idealDwr);
    let outlook: Outlook = 'good';
    if (ratio > 1 + STYLE_TOLERANCE) outlook = 'spill-risk';
    else if (ratio < 1 - STYLE_TOLERANCE) outlook = 'gap-risk';
    return { id: s.id, name: s.name, outlook, ratio };
  });
  if (dwr !== null) {
    styles.sort((a, b) => Math.abs(1 - a.ratio!) - Math.abs(1 - b.ratio!));
  }

  return {
    scale,
    size,
    alternate,
    sisterSizes,
    bandInches: band,
    effectiveBust: round2(bust),
    bustMethod: method,
    cupSteps: steps,
    shape,
    dwr,
    styles,
    notes,
    trace,
  };
}

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  CUP_SCALES,
  MeasurementError,
  recommend,
  roundHalfUp,
  type CupScale,
  type Measurements,
} from '../src/index';

interface Profile {
  name: string;
  input: Measurements;
  scale: CupScale;
  expected: {
    label: string;
    alternate: string | null;
    sisters: string[];
    bustMethod: string;
    effectiveBust: number;
    cupSteps: number;
    shape: string;
    dwr: number | null;
    styles: [string, string][];
  };
}

const fixtures = JSON.parse(
  readFileSync(new URL('../../../fixtures/profiles.json', import.meta.url), 'utf8')
) as { profiles: Profile[]; errors: { name: string; input: Measurements; match: string }[] };

describe('golden profiles (shared with the Python port)', () => {
  it.each(fixtures.profiles.map((p) => [p.name, p] as const))('%s', (_name, p) => {
    const rec = recommend(p.input, p.scale);
    const e = p.expected;
    expect(rec.size.label).toBe(e.label);
    expect(rec.alternate?.label ?? null).toBe(e.alternate);
    expect(rec.sisterSizes.map((s) => s.label)).toEqual(e.sisters);
    expect(rec.bustMethod).toBe(e.bustMethod);
    expect(rec.effectiveBust).toBeCloseTo(e.effectiveBust, 2);
    expect(rec.cupSteps).toBe(e.cupSteps);
    expect(rec.shape).toBe(e.shape);
    if (e.dwr === null) expect(rec.dwr).toBeNull();
    else expect(rec.dwr).toBeCloseTo(e.dwr, 2);
    expect(rec.styles.map((s) => [s.id, s.outlook])).toEqual(e.styles);
  });

  it.each(fixtures.errors.map((c) => [c.name, c] as const))('rejects %s', (_name, c) => {
    expect(() => recommend(c.input)).toThrow(MeasurementError);
    expect(() => recommend(c.input)).toThrow(new RegExp(c.match));
  });
});

describe('sizing rules', () => {
  it('rounds half up, not to even', () => {
    expect(roundHalfUp(14.5)).toBe(15);
    expect(roundHalfUp(15.5)).toBe(16);
    expect(roundHalfUp(-0.5)).toBe(0);
  });

  it('adds one cup step per inch over the underbust', () => {
    const labels = [1, 2, 3, 4].map(
      (d) => recommend({ unit: 'in', underbust: 32, bustStanding: 32 + d }).size.cup
    );
    expect(labels).toEqual(['A', 'B', 'C', 'D']);
  });

  it('gives the same answer in centimetres and inches', () => {
    const inches = recommend({ unit: 'in', underbust: 30, bustStanding: 36, bustLeaning: 37 });
    const cm = recommend({ unit: 'cm', underbust: 76.2, bustStanding: 91.44, bustLeaning: 93.98 });
    expect(cm.size).toEqual(inches.size);
    expect(cm.effectiveBust).toBeCloseTo(inches.effectiveBust, 2);
  });

  it('keeps cup volume constant across sister sizes', () => {
    const rec = recommend({ unit: 'in', underbust: 32, bustStanding: 37 });
    const index = (cup: string) => CUP_SCALES.UK.indexOf(cup);
    const [down, up] = rec.sisterSizes;
    expect(down.band).toBe(rec.size.band - 2);
    expect(index(down.cup)).toBe(index(rec.size.cup) + 1);
    expect(up.band).toBe(rec.size.band + 2);
    expect(index(up.cup)).toBe(index(rec.size.cup) - 1);
  });

  it('only offers an alternate band near the midpoint', () => {
    expect(recommend({ unit: 'in', underbust: 32, bustStanding: 37 }).alternate).toBeNull();
    expect(recommend({ unit: 'in', underbust: 32.6, bustStanding: 37 }).alternate?.band).toBe(34);
    expect(recommend({ unit: 'in', underbust: 31.4, bustStanding: 37 }).alternate?.band).toBe(30);
  });

  it('explains every step it takes', () => {
    const rec = recommend({ unit: 'cm', underbust: 76, bustStanding: 92, bustLeaning: 94, depth: 11, width: 9 });
    expect(rec.trace.map((t) => t.step)).toEqual(['Convert', 'Band', 'Bust', 'Cup', 'Shape', 'Size']);
  });

  it('refuses sizes past the end of the cup table', () => {
    expect(() => recommend({ unit: 'in', underbust: 30, bustStanding: 55 })).toThrow(/size table/);
  });
});

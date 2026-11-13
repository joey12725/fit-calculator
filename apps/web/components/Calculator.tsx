'use client';

import { useMemo, useState } from 'react';
import {
  CM_PER_INCH,
  MeasurementError,
  recommend,
  type CupScale,
  type Measurements,
  type Outlook,
  type Recommendation,
  type Unit,
} from '@fit-calculator/engine';

type Field = 'underbust' | 'bustStanding' | 'bustLeaning' | 'depth' | 'width';
type Values = Record<Field, string>;

interface Sample {
  id: string;
  label: string;
  unit: Unit;
  values: Values;
}

/** Fabricated profiles for the demo. None of these belong to a real person. */
export const SAMPLES: Sample[] = [
  {
    id: 'a',
    label: 'Sample A',
    unit: 'in',
    values: { underbust: '31.25', bustStanding: '37', bustLeaning: '38.5', depth: '', width: '' },
  },
  {
    id: 'b',
    label: 'Sample B',
    unit: 'cm',
    values: { underbust: '76', bustStanding: '92', bustLeaning: '94', depth: '11', width: '9' },
  },
  {
    id: 'c',
    label: 'Sample C',
    unit: 'in',
    values: { underbust: '36.6', bustStanding: '41', bustLeaning: '', depth: '3.2', width: '4.4' },
  },
];

const FIELDS: { key: Field; label: string; hint: string; optional?: boolean; group: 'core' | 'shape' }[] = [
  { key: 'underbust', label: 'Underbust (snug)', hint: 'Standing, tape level, on the exhale', group: 'core' },
  { key: 'bustStanding', label: 'Bust, standing', hint: 'Fullest point, tape level', group: 'core' },
  {
    key: 'bustLeaning',
    label: 'Bust, leaning',
    hint: 'Bent forward 90° at the waist',
    optional: true,
    group: 'core',
  },
  { key: 'depth', label: 'Apex depth', hint: 'Chest wall to apex', optional: true, group: 'shape' },
  { key: 'width', label: 'Root width', hint: 'Side to side at the root', optional: true, group: 'shape' },
];

const OUTLOOK: Record<Outlook, { text: string; className: string }> = {
  good: { text: 'Good match', className: 'bg-brand-soft text-brand-ink' },
  'gap-risk': { text: 'May gap', className: 'bg-amber-50 text-amber-800' },
  'spill-risk': { text: 'May spill', className: 'bg-accent-soft text-accent' },
  unknown: { text: 'Add shape', className: 'bg-gray-100 text-muted' },
};

function toMeasurements(unit: Unit, v: Values): Measurements {
  const num = (s: string) => (s.trim() === '' ? undefined : Number(s));
  return {
    unit,
    underbust: num(v.underbust) ?? NaN,
    bustStanding: num(v.bustStanding) ?? NaN,
    bustLeaning: num(v.bustLeaning),
    depth: num(v.depth),
    width: num(v.width),
  };
}

function convertValues(values: Values, to: Unit): Values {
  const factor = to === 'cm' ? CM_PER_INCH : 1 / CM_PER_INCH;
  const out = { ...values };
  for (const key of Object.keys(out) as Field[]) {
    const n = Number(out[key]);
    if (out[key].trim() !== '' && Number.isFinite(n)) out[key] = String(Math.round(n * factor * 10) / 10);
  }
  return out;
}

function Toggle<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-lg border border-line bg-white p-0.5">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          aria-pressed={o === value}
          onClick={() => onChange(o)}
          className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
            o === value ? 'bg-ink text-white' : 'text-muted hover:text-ink'
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

export function Calculator() {
  const [unit, setUnit] = useState<Unit>(SAMPLES[1].unit);
  const [scale, setScale] = useState<CupScale>('UK');
  const [values, setValues] = useState<Values>(SAMPLES[1].values);
  const [sample, setSample] = useState<string | null>(SAMPLES[1].id);

  const result = useMemo((): { rec: Recommendation } | { error: string } => {
    try {
      return { rec: recommend(toMeasurements(unit, values), scale) };
    } catch (err) {
      if (err instanceof MeasurementError) return { error: err.message };
      throw err;
    }
  }, [unit, values, scale]);

  const setField = (key: Field, value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    setSample(null);
  };

  const changeUnit = (next: Unit) => {
    if (next === unit) return;
    setValues((v) => convertValues(v, next));
    setUnit(next);
  };

  const loadSample = (s: Sample) => {
    setUnit(s.unit);
    setValues(s.values);
    setSample(s.id);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <section aria-labelledby="inputs" className="rounded-2xl border border-line bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="inputs" className="text-lg font-semibold">
            Measurements
          </h2>
          <Toggle label="Units" options={['in', 'cm']} value={unit} onChange={changeUnit} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {SAMPLES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => loadSample(s)}
              className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                sample === s.id
                  ? 'border-brand bg-brand-soft text-brand-ink'
                  : 'border-line text-muted hover:border-brand hover:text-ink'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {(['core', 'shape'] as const).map((group) => (
          <fieldset key={group} className="mt-6">
            <legend className="text-xs font-semibold tracking-wide text-muted uppercase">
              {group === 'core' ? 'Tape measurements' : 'Shape profile (optional)'}
            </legend>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {FIELDS.filter((f) => f.group === group).map((f) => (
                <label key={f.key} className="block">
                  <span className="text-sm font-medium">
                    {f.label}
                    {f.optional && <span className="font-normal text-muted"> · optional</span>}
                  </span>
                  <span className="mt-1 flex items-center rounded-lg border border-line bg-white focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
                    <input
                      inputMode="decimal"
                      value={values[f.key]}
                      onChange={(e) => setField(f.key, e.target.value)}
                      className="w-full rounded-lg bg-transparent px-3 py-2 tabular-nums outline-none"
                      aria-describedby={`${f.key}-hint`}
                    />
                    <span className="pr-3 text-sm text-muted">{unit}</span>
                  </span>
                  <span id={`${f.key}-hint`} className="mt-1 block text-xs text-muted">
                    {f.hint}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </section>

      <section aria-labelledby="result" className="rounded-2xl border border-line bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="result" className="text-lg font-semibold">
            Recommendation
          </h2>
          <Toggle label="Cup scale" options={['UK', 'US']} value={scale} onChange={setScale} />
        </div>

        {'error' in result ? (
          <p role="alert" className="mt-6 rounded-lg bg-accent-soft px-4 py-3 text-sm text-accent">
            Check the measurements: {result.error}.
          </p>
        ) : (
          <Result rec={result.rec} unit={unit} />
        )}
      </section>
    </div>
  );
}

function Result({ rec, unit }: { rec: Recommendation; unit: Unit }) {
  const bust = unit === 'cm' ? `${(rec.effectiveBust * CM_PER_INCH).toFixed(1)} cm` : `${rec.effectiveBust} in`;
  const stats = [
    { label: 'Band', value: String(rec.bandInches) },
    { label: 'Working bust', value: bust, sub: rec.bustMethod },
    { label: 'Cup steps', value: String(rec.cupSteps) },
    { label: 'Shape', value: rec.shape === 'unknown' ? '—' : rec.shape, sub: rec.dwr ? `D/W ${rec.dwr}` : undefined },
  ];

  return (
    <div className="mt-6 space-y-8">
      <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
        <div>
          <p className="text-sm text-muted">Start with</p>
          <p data-testid="size" className="text-6xl font-semibold tracking-tight text-brand-ink tabular-nums">
            {rec.size.label}
          </p>
        </div>
        <div className="space-y-1 pb-2 text-sm">
          {rec.alternate && (
            <p>
              <span className="text-muted">Between bands: </span>
              <span className="font-medium">{rec.alternate.label}</span>
            </p>
          )}
          <p>
            <span className="text-muted">Sister sizes: </span>
            <span className="font-medium">{rec.sisterSizes.map((s) => s.label).join(' · ')}</span>
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl bg-canvas px-4 py-3">
            <dt className="text-xs text-muted">{s.label}</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums first-letter:uppercase">{s.value}</dd>
            {s.sub && <dd className="text-xs text-muted">{s.sub}</dd>}
          </div>
        ))}
      </dl>

      <div>
        <h3 className="text-sm font-semibold">Style outlook</h3>
        <ul className="mt-3 divide-y divide-line rounded-xl border border-line">
          {rec.styles.map((s) => (
            <li key={s.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span>{s.name}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${OUTLOOK[s.outlook].className}`}>
                {OUTLOOK[s.outlook].text}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {rec.notes.length > 0 && (
        <ul className="space-y-2 text-sm">
          {rec.notes.map((n) => (
            <li key={n} className="rounded-lg border-l-4 border-accent bg-accent-soft/50 px-4 py-2">
              {n}
            </li>
          ))}
        </ul>
      )}

      <div>
        <h3 className="text-sm font-semibold">How it got there</h3>
        <ol className="mt-3 space-y-2 text-sm">
          {rec.trace.map((t, i) => (
            <li key={t.step} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand-ink">
                {i + 1}
              </span>
              <span>
                <span className="font-medium">{t.step}.</span> <span className="text-muted">{t.detail}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

# Architecture

```
            ┌────────────────────────────┐
            │  fixtures/profiles.json     │  golden, fabricated profiles
            └──────────┬─────────┬───────┘
                       │         │
         Vitest suite  ▼         ▼  pytest suite
┌──────────────────────────┐   ┌──────────────────────────┐
│ packages/engine (TS)     │   │ apps/api/fit_engine.py   │
│ recommend(m, scale)      │   │ recommend(m, scale)      │
└──────────┬───────────────┘   └──────────┬───────────────┘
           │ workspace import              │
┌──────────▼───────────────┐   ┌──────────▼───────────────┐
│ apps/web (Next.js 16)    │   │ apps/api/main.py         │
│ Calculator, client-side  │   │ POST /fit/recommend      │
└──────────────────────────┘   │ GET  /healthz            │
                               └──────────────────────────┘
```

## Engine package

`@fit-calculator/engine` is a dependency-free TypeScript module. It exports `recommend()`, the `Measurements` / `Recommendation` types, `MeasurementError`, and the tuning constants. The package points `main` at its TypeScript source and the web app lists it in `transpilePackages`, so there's no separate build step.

## Web app

`apps/web` is a Next.js App Router project styled with Tailwind CSS 4. The page is server-rendered; the `Calculator` component is a client component that keeps the form state, converts values when the unit toggle changes, and calls `recommend()` on every edit. Invalid input renders the engine's error message rather than a stale or guessed size.

Sample profiles A–C in `components/Calculator.tsx` are fabricated for the demo.

## API

`apps/api` is a FastAPI app with a Pydantic request model. It's a thin wrapper around `fit_engine.recommend()` and returns the dataclass result as JSON. Interactive docs are at `/docs` when running locally.

```bash
uvicorn apps.api.main:app --reload
```

## Tests and CI

| Suite | Command | Covers |
| --- | --- | --- |
| Engine | `pnpm test` | golden fixtures, rounding, unit conversion, sister sizes, alternate bands, trace |
| UI | `pnpm test` | default render, cup scale toggle, samples, unit conversion, error state |
| API | `pytest` | the same golden fixtures through the Python port, plus the HTTP endpoints |

GitHub Actions runs lint, typecheck, tests and a production build for the web side, and Ruff plus pytest for the API.

## Deploying

The web app is a standard Next.js project. On Vercel, set the project root to `apps/web` and leave the build command at its default; pnpm workspaces are detected automatically. The API runs anywhere that can run `uvicorn`.

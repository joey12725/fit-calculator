# Fit model

The engine lives in [`packages/engine/src/index.ts`](../packages/engine/src/index.ts) with a line-for-line Python port in [`apps/api/fit_engine.py`](../apps/api/fit_engine.py). This page describes the rules both implement.

## Inputs

| Field | Required | Meaning |
| --- | --- | --- |
| `unit` | yes | `in` or `cm` |
| `underbust` | yes | Snug underbust, standing, tape level, on the exhale |
| `bustStanding` | yes | Fullest bust, standing upright |
| `bustLeaning` | no | Fullest bust, bent forward 90° at the waist |
| `depth` | with `width` | Apex depth from chest wall, front to back |
| `width` | with `depth` | Breast root width, side to side |

`scale` (`UK` or `US`, default `UK`) picks the cup letters.

Validation rejects non-positive or non-numeric values, a depth without a width (or the reverse), an underbust outside 20–60 in (51–152 cm), a working bust that isn't larger than the underbust, and sizes past the end of the cup table. Errors are thrown as `MeasurementError` (TypeScript) or raised as `MeasurementError` (Python, a `ValueError` subclass). The API turns them into HTTP 422.

## Rules

Everything runs in inches. Rounding is half-up (`floor(x + 0.5)`) in both languages, so Python's round-half-to-even never sneaks in.

1. **Band.** `band = roundHalfUp(underbust / 2) × 2`.
2. **Working bust.**
   - No leaning reading: the standing bust.
   - `|leaning − standing| ≤ 2 in`: the leaning bust.
   - Otherwise: `(standing + leaning + 0.9 × leaning) / 3`, plus a note suggesting a lying-down check.
3. **Cup steps.** `roundHalfUp(workingBust − underbust)`. The cup difference is taken against the measured underbust, not the rounded band.
4. **Shape.** `dwr = depth / width`, rounded to 2 places.
   - `dwr > 1.1`: projected, +1 cup step.
   - `dwr < 0.9`: shallow, −1 cup step.
   - Otherwise balanced.
5. **Alternate band.** If the underbust is within 0.5 in of the odd number between the chosen band and its neighbour, the neighbour band is offered too. Going down a band adds a cup step; going up removes one.
6. **Sister sizes.** `(band − 2, steps + 1)` and `(band + 2, steps − 1)`, dropped if they fall off the table.
7. **Style outlook.** For each cut, `ratio = dwr / idealDwr`. Above `1.15` is a spill risk, below `0.85` a gap risk, otherwise a good match. Styles are sorted by `|1 − ratio|`, closest first. Without a shape profile every style reads `unknown`.

## Cup tables

Index = cup steps.

| Steps | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UK | AA | A | B | C | D | DD | E | F | FF | G | GG | H | HH | J | JJ | K | KK | L |
| US | AA | A | B | C | D | DD | DDD | G | H | I | J | K | L | M | N | O | P | Q |

## Style catalogue

| Cut | Patterned depth ÷ width |
| --- | --- |
| Plunge | 0.85 |
| Balconette | 0.95 |
| Molded T-shirt | 1.00 |
| Seamed full cup | 1.15 |

## Tuning

The thresholds are exported constants: `LEAN_TOLERANCE`, `DWR_PROJECTED`, `DWR_SHALLOW`, `STYLE_TOLERANCE`, `CUP_SCALES` and `STYLES`. Change them in both engines, update `fixtures/profiles.json`, and run `pnpm test` and `pytest`. A change that lands in only one language fails the other suite.

To add a style, append to `STYLES` in both files. To add a regional cup scale (EU, FR, AU), add a key to `CUP_SCALES` and widen the `CupScale` type.

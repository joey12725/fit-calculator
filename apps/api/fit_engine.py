"""Python port of the fit engine in packages/engine/src/index.ts.

Both implementations are checked against fixtures/profiles.json, so a change
to the sizing rules has to land in both places to keep the suites green.
"""

from __future__ import annotations

import math
from dataclasses import asdict, dataclass, field
from typing import Literal

Unit = Literal["in", "cm"]
CupScale = Literal["UK", "US"]

CM_PER_INCH = 2.54
LEAN_TOLERANCE = 2.0
DWR_PROJECTED = 1.1
DWR_SHALLOW = 0.9
STYLE_TOLERANCE = 0.15

CUP_SCALES: dict[str, list[str]] = {
    "UK": [
        "AA",
        "A",
        "B",
        "C",
        "D",
        "DD",
        "E",
        "F",
        "FF",
        "G",
        "GG",
        "H",
        "HH",
        "J",
        "JJ",
        "K",
        "KK",
        "L",
    ],
    "US": [
        "AA",
        "A",
        "B",
        "C",
        "D",
        "DD",
        "DDD",
        "G",
        "H",
        "I",
        "J",
        "K",
        "L",
        "M",
        "N",
        "O",
        "P",
        "Q",
    ],
}

STYLES = [
    ("plunge", "Plunge", 0.85),
    ("balconette", "Balconette", 0.95),
    ("molded", "Molded T-shirt", 1.0),
    ("full-cup", "Seamed full cup", 1.15),
]


class MeasurementError(ValueError):
    pass


@dataclass
class Measurements:
    unit: Unit
    underbust: float
    bustStanding: float
    bustLeaning: float | None = None
    depth: float | None = None
    width: float | None = None


@dataclass
class Size:
    band: int
    cup: str
    label: str


@dataclass
class StyleFit:
    id: str
    name: str
    outlook: str
    ratio: float | None


@dataclass
class Recommendation:
    scale: str
    size: Size
    alternate: Size | None
    sisterSizes: list[Size]
    bandInches: int
    effectiveBust: float
    bustMethod: str
    cupSteps: int
    shape: str
    dwr: float | None
    styles: list[StyleFit]
    notes: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return asdict(self)


def round_half_up(x: float) -> int:
    return math.floor(x + 0.5)


def _round2(x: float) -> float:
    return round_half_up(x * 100) / 100


def _make_size(band: int, steps: int, scale: str) -> Size | None:
    cups = CUP_SCALES[scale]
    if steps < 0 or steps >= len(cups) or band < 20:
        return None
    return Size(band=band, cup=cups[steps], label=f"{band}{cups[steps]}")


def _validate(m: Measurements) -> None:
    fields = {
        "underbust": m.underbust,
        "standing bust": m.bustStanding,
        "leaning bust": m.bustLeaning,
        "apex depth": m.depth,
        "root width": m.width,
    }
    for name, value in fields.items():
        if value is None:
            continue
        if not math.isfinite(value) or value <= 0:
            raise MeasurementError(f"{name} must be a positive number")
    if (m.depth is None) != (m.width is None):
        raise MeasurementError("apex depth and root width are used together; provide both or neither")


def recommend(m: Measurements, scale: CupScale = "UK") -> Recommendation:
    _validate(m)

    def conv(v: float | None) -> float | None:
        return None if v is None else (v / CM_PER_INCH if m.unit == "cm" else v)

    ub = conv(m.underbust)
    standing = conv(m.bustStanding)
    leaning = conv(m.bustLeaning)
    depth = conv(m.depth)
    width = conv(m.width)
    notes: list[str] = []

    if ub < 20 or ub > 60:
        raise MeasurementError("underbust is outside the supported range (20-60 in / 51-152 cm)")

    band = round_half_up(ub / 2) * 2

    bust, method = standing, "standing"
    if leaning is not None:
        if abs(leaning - standing) <= LEAN_TOLERANCE:
            bust, method = leaning, "leaning"
        else:
            bust, method = (standing + leaning + 0.9 * leaning) / 3, "blended"
            notes.append(
                "Standing and leaning readings differ a lot. A lying-down measurement can confirm the blend."
            )

    if bust <= ub:
        raise MeasurementError("bust must be larger than underbust")

    steps = round_half_up(bust - ub)

    shape, dwr = "unknown", None
    if depth is not None and width is not None:
        dwr = _round2(depth / width)
        if dwr > DWR_PROJECTED:
            shape, steps = "projected", steps + 1
        elif dwr < DWR_SHALLOW:
            shape, steps = "shallow", steps - 1
        else:
            shape = "balanced"

    steps = max(steps, 0)
    size = _make_size(band, steps, scale)
    if size is None:
        raise MeasurementError("measurements fall outside the supported size table")

    alternate = None
    below = ub < band
    nearest_odd = band - 1 if below else band + 1
    if abs(ub - nearest_odd) <= 0.5:
        alternate = _make_size(band - 2 if below else band + 2, steps + 1 if below else steps - 1, scale)
        if alternate:
            notes.append(
                f"Underbust sits between bands. Try {alternate.label} "
                f"if {size.label} feels loose or tight at the band."
            )

    sisters = [
        s
        for s in (
            _make_size(band - 2, steps + 1, scale),
            _make_size(band + 2, steps - 1, scale),
        )
        if s
    ]

    styles: list[StyleFit] = []
    for sid, name, ideal in STYLES:
        if dwr is None:
            styles.append(StyleFit(sid, name, "unknown", None))
            continue
        ratio = _round2(dwr / ideal)
        outlook = "good"
        if ratio > 1 + STYLE_TOLERANCE:
            outlook = "spill-risk"
        elif ratio < 1 - STYLE_TOLERANCE:
            outlook = "gap-risk"
        styles.append(StyleFit(sid, name, outlook, ratio))
    if dwr is not None:
        styles.sort(key=lambda s: abs(1 - s.ratio))

    return Recommendation(
        scale=scale,
        size=size,
        alternate=alternate,
        sisterSizes=sisters,
        bandInches=band,
        effectiveBust=_round2(bust),
        bustMethod=method,
        cupSteps=steps,
        shape=shape,
        dwr=dwr,
        styles=styles,
        notes=notes,
    )

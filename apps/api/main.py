"""FastAPI service exposing the fit engine over HTTP.

Run from the repo root:  uvicorn apps.api.main:app --reload
"""

from typing import Literal

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from .fit_engine import MeasurementError, Measurements, recommend

app = FastAPI(
    title="Fit Calculator API",
    version="1.0.0",
    description="Measurements in, band/cup recommendation out.",
)


class RecommendRequest(BaseModel):
    unit: Literal["in", "cm"] = "in"
    scale: Literal["UK", "US"] = "UK"
    underbust: float = Field(gt=0, description="Snug underbust, standing")
    bustStanding: float = Field(gt=0, description="Fullest bust, standing")
    bustLeaning: float | None = Field(default=None, gt=0, description="Fullest bust, leaning 90 degrees")
    depth: float | None = Field(default=None, gt=0, description="Apex depth, front to back")
    width: float | None = Field(default=None, gt=0, description="Breast root width")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "unit": "in",
                    "scale": "UK",
                    "underbust": 31.25,
                    "bustStanding": 37,
                    "bustLeaning": 38.5,
                }
            ]
        }
    }


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


@app.post("/fit/recommend")
async def fit_recommend(body: RecommendRequest):
    m = Measurements(
        unit=body.unit,
        underbust=body.underbust,
        bustStanding=body.bustStanding,
        bustLeaning=body.bustLeaning,
        depth=body.depth,
        width=body.width,
    )
    try:
        return recommend(m, body.scale).to_dict()
    except MeasurementError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

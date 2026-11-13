import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from apps.api.fit_engine import MeasurementError, Measurements, recommend
from apps.api.main import app

FIXTURES = json.loads((Path(__file__).parents[3] / "fixtures" / "profiles.json").read_text())
client = TestClient(app)


@pytest.mark.parametrize("profile", FIXTURES["profiles"], ids=lambda p: p["name"])
def test_engine_matches_golden_fixtures(profile):
    rec = recommend(Measurements(**profile["input"]), profile["scale"])
    exp = profile["expected"]
    assert rec.size.label == exp["label"]
    assert (rec.alternate.label if rec.alternate else None) == exp["alternate"]
    assert [s.label for s in rec.sisterSizes] == exp["sisters"]
    assert rec.bustMethod == exp["bustMethod"]
    assert rec.effectiveBust == pytest.approx(exp["effectiveBust"])
    assert rec.cupSteps == exp["cupSteps"]
    assert rec.shape == exp["shape"]
    assert rec.dwr == (None if exp["dwr"] is None else pytest.approx(exp["dwr"]))
    assert [[s.id, s.outlook] for s in rec.styles] == exp["styles"]


@pytest.mark.parametrize("case", FIXTURES["errors"], ids=lambda c: c["name"])
def test_engine_rejects_bad_input(case):
    with pytest.raises(MeasurementError, match=case["match"]):
        recommend(Measurements(**case["input"]))


def test_healthz():
    response = client.get("/healthz")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_recommend_endpoint():
    response = client.post(
        "/fit/recommend",
        json={
            "unit": "in",
            "scale": "UK",
            "underbust": 31.25,
            "bustStanding": 37,
            "bustLeaning": 38.5,
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["size"]["label"] == "32F"
    assert body["alternate"]["label"] == "30FF"


def test_recommend_endpoint_reports_measurement_errors():
    response = client.post("/fit/recommend", json={"underbust": 34, "bustStanding": 33})
    assert response.status_code == 422
    assert "bust must be larger" in response.json()["detail"]

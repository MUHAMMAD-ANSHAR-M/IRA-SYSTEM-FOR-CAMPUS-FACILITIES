from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uvicorn

from app.models.demand_forecaster import DemandForecaster
from app.models.underutilization_detector import UnderutilizationDetector
from app.models.no_show_predictor import NoShowPredictor
from app.models.anomaly_detector import BookingAnomalyDetector
from app.config import HOST, PORT

app = FastAPI(
    title="IRA Smart Campus AI Microservice",
    description="Microservice providing demand forecasting, underutilization detection, no-show prediction, and booking anomaly scoring.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Instantiate models
forecaster = DemandForecaster()
forecaster.load()

underutilization = UnderutilizationDetector()
underutilization.load()

no_show = NoShowPredictor()
no_show.load()

anomaly = BookingAnomalyDetector()
anomaly.load()

# Request schemas
class DemandRequest(BaseModel):
    day_of_week: int = Field(..., ge=0, le=6, description="0=Mon, 6=Sun")
    hour: int = Field(..., ge=0, le=23)
    facility_type: str = "classroom"
    department: str = "CSE"
    duration_hours: int = 2
    semester_phase: str = "regular"
    facility_capacity: int = 60
    expected_attendees: int = 45

class NoShowRequest(BaseModel):
    day_of_week: int = 1
    hour: int = 10
    facility_type: str = "computer_lab"
    department: str = "CSE"
    duration_hours: int = 2
    semester_phase: str = "regular"
    lead_time_days: int = 5
    facility_capacity: int = 60
    expected_attendees: int = 50

class FacilityMetricItem(BaseModel):
    facility_id: str
    name: str
    type: str
    capacity: int
    booked_hours: float
    available_hours: float = 40.0
    avg_attendees: Optional[float] = None
    recent_conflicts: Optional[int] = 0

class UnderutilizationRequest(BaseModel):
    facilities: List[FacilityMetricItem]

class AnomalyRequest(BaseModel):
    duration_hours: int = 2
    lead_time_days: int = 5
    facility_capacity: int = 60
    expected_attendees: int = 40

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "ai-microservice",
        "models_loaded": {
            "demand_forecaster": forecaster.pipeline is not None,
            "no_show_classifier": no_show.pipeline is not None,
            "underutilization_detector": True,
            "anomaly_detector": anomaly.model is not None
        }
    }

@app.post("/predict/demand")
def predict_demand(req: DemandRequest):
    score = forecaster.predict(req.model_dump())
    intensity = "HIGH" if score > 70 else ("MODERATE" if score > 40 else "LOW")
    return {
        "demand_score": score,
        "intensity": intensity,
        "recommendation": (
            "Peak demand expected! Prioritize academic sessions over elective club bookings."
            if intensity == "HIGH"
            else "Standard availability expected."
        )
    }

@app.post("/predict/no-show")
def predict_no_show(req: NoShowRequest):
    return no_show.predict_probability(req.model_dump())

@app.post("/predict/anomaly")
def detect_anomaly(req: AnomalyRequest):
    return anomaly.detect(req.model_dump())

@app.post("/analytics/underutilization")
def analyze_underutilization(req: UnderutilizationRequest):
    raw_list = [f.model_dump() for f in req.facilities]
    return underutilization.analyze_facilities(raw_list)

@app.get("/recommendations/overview")
def get_model_insights():
    return {
        "system_status": "Active and Monitoring Campus Utilization",
        "models": {
            "forecaster": "XGBoost Regressor (Trained on 6mo synthetic dataset)",
            "no_show": "Random Forest Classifier (Features: lead-time, capacity ratio, semester phase)",
            "clustering": "K-Means (3 clusters: Underutilized <30%, Balanced 30-75%, Overdemanded >75%)",
            "anomaly": "Isolation Forest (Contamination: 0.03)"
        }
    }

if __name__ == "__main__":
    uvicorn.run("app.main:app", host=HOST, port=PORT, reload=False)

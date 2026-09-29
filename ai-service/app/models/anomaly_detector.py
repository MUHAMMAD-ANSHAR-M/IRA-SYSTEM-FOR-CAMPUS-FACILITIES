import json
import numpy as np
import pandas as pd
from pathlib import Path
from ..config import MODEL_DIR

class BookingAnomalyDetector:
    def __init__(self):
        self.model_path = MODEL_DIR / "anomaly_detector.json"
        self.mean = None
        self.cov_inv = None
        self.threshold = None

    def _extract_matrix(self, df: pd.DataFrame) -> np.ndarray:
        feats = []
        for _, row in df.iterrows():
            dur = float(row.get("duration_hours", 2))
            lead = float(row.get("lead_time_days", 5))
            cap = float(row.get("facility_capacity", 60))
            att = float(row.get("expected_attendees", 40))
            ratio = att / max(cap, 1.0)
            feats.append([dur, lead, cap, att, ratio])
        return np.array(feats, dtype=np.float64)

    def train(self, df: pd.DataFrame, contamination: float = 0.03):
        X = self._extract_matrix(df)
        self.mean = np.mean(X, axis=0)
        cov = np.cov(X, rowvar=False) + 1e-4 * np.eye(X.shape[1])
        self.cov_inv = np.linalg.pinv(cov)

        diff = X - self.mean
        dist_sq = np.sum((diff @ self.cov_inv) * diff, axis=1)
        self.threshold = float(np.percentile(dist_sq, 100.0 * (1.0 - contamination)))

        with open(self.model_path, "w") as f:
            json.dump({
                "mean": self.mean.tolist(),
                "cov_inv": self.cov_inv.tolist(),
                "threshold": self.threshold
            }, f, indent=2)

        return {"status": "trained", "model": "Multivariate Distance Anomaly Detector", "threshold": round(self.threshold, 2)}

    def load(self):
        if self.model_path.exists():
            try:
                with open(self.model_path, "r") as f:
                    data = json.load(f)
                    self.mean = np.array(data["mean"])
                    self.cov_inv = np.array(data["cov_inv"])
                    self.threshold = data["threshold"]
                return True
            except Exception:
                return False
        return False

    def detect(self, booking_data: dict) -> dict:
        if self.mean is None:
            if not self.load():
                dur = booking_data.get("duration_hours", 2)
                is_anom = dur > 6
                return {"is_anomaly": is_anom, "anomaly_score": 2.5 if is_anom else 0.5, "flag_reason": "Excessive duration" if is_anom else "Normal"}

        df = pd.DataFrame([booking_data])
        X = self._extract_matrix(df)
        diff = X - self.mean
        dist_sq = float(np.sum((diff @ self.cov_inv) * diff, axis=1)[0])
        is_anomaly = bool(dist_sq > self.threshold)

        return {
            "is_anomaly": is_anomaly,
            "anomaly_score": round(dist_sq, 3),
            "flag_reason": "Irregular resource footprint (high duration, attendee-capacity mismatch, or abnormal lead time)" if is_anomaly else "Standard operational pattern"
        }

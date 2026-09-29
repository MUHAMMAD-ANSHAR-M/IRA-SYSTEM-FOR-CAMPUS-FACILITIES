import json
import numpy as np
import pandas as pd
from pathlib import Path
from ..config import MODEL_DIR

class UnderutilizationDetector:
    def __init__(self):
        self.model_path = MODEL_DIR / "kmeans_utilization.json"
        self.centroids = None

    def fit(self, facilities_stats: list, k: int = 3, max_iter: int = 50):
        if not facilities_stats:
            return None
        df = pd.DataFrame(facilities_stats)
        X = df[["utilization_rate", "capacity_efficiency", "weekly_bookings"]].values.astype(np.float64)

        # K-Means initialization
        np.random.seed(42)
        idx = np.random.choice(len(X), k, replace=False) if len(X) >= k else range(len(X))
        centroids = X[idx].copy()

        for _ in range(max_iter):
            # Assign clusters
            distances = np.linalg.norm(X[:, np.newaxis] - centroids, axis=2)
            labels = np.argmin(distances, axis=1)

            new_centroids = np.array([
                X[labels == j].mean(axis=0) if np.sum(labels == j) > 0 else centroids[j]
                for j in range(k)
            ])
            if np.allclose(centroids, new_centroids, atol=1e-3):
                break
            centroids = new_centroids

        self.centroids = centroids
        with open(self.model_path, "w") as f:
            json.dump({"centroids": centroids.tolist()}, f, indent=2)

        return {"status": "trained", "cluster_centers": centroids.tolist()}

    def load(self):
        if self.model_path.exists():
            try:
                with open(self.model_path, "r") as f:
                    data = json.load(f)
                    self.centroids = np.array(data["centroids"])
                return True
            except Exception:
                return False
        return False

    def analyze_facilities(self, facilities: list) -> dict:
        results = []
        underutilized = []
        balanced = []
        overdemanded = []
        recommendations = []

        for f in facilities:
            booked = float(f.get("booked_hours", 0))
            available = max(float(f.get("available_hours", 40)), 1.0)
            util_rate = round((booked / available) * 100.0, 1)

            cap = max(int(f.get("capacity", 50)), 1)
            avg_att = float(f.get("avg_attendees", cap * 0.7))
            cap_eff = round((avg_att / cap) * 100.0, 1)

            if util_rate < 30.0:
                cat = "UNDERUTILIZED"
                underutilized.append(f.get("name"))
                recommendations.append({
                    "facility": f.get("name"),
                    "type": "CONSOLIDATE",
                    "severity": "MEDIUM",
                    "utilization": f"{util_rate}%",
                    "message": f"{f.get('name')} is under-utilized at {util_rate}%. Consider consolidating smaller classes here or scheduling maintenance during low-trough hours."
                })
            elif util_rate > 75.0:
                cat = "OVERDEMANDED"
                overdemanded.append(f.get("name"))
                recommendations.append({
                    "facility": f.get("name"),
                    "type": "RELIEVE_CONGESTION",
                    "severity": "HIGH",
                    "utilization": f"{util_rate}%",
                    "message": f"{f.get('name')} is near peak capacity ({util_rate}%). High risk of booking contention. Recommend shifting elective workshops to parallel facilities."
                })
            else:
                cat = "BALANCED"
                balanced.append(f.get("name"))

            results.append({
                "facility_id": f.get("facility_id"),
                "name": f.get("name"),
                "type": f.get("type"),
                "capacity": cap,
                "utilization_rate": util_rate,
                "capacity_efficiency": cap_eff,
                "classification": cat,
                "booked_hours": booked,
                "available_hours": available
            })

        avg_util = round(float(np.mean([r["utilization_rate"] for r in results])), 1) if results else 0.0

        return {
            "summary": {
                "total_analyzed": len(facilities),
                "underutilized_count": len(underutilized),
                "balanced_count": len(balanced),
                "overdemanded_count": len(overdemanded),
                "avg_campus_utilization": avg_util
            },
            "facility_breakdown": results,
            "actionable_recommendations": recommendations
        }

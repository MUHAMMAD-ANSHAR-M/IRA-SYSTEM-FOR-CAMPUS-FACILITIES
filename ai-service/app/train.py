import os
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
import sys
from pathlib import Path

# Ensure app package is importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.data.synthetic_generator import generate_synthetic_bookings
from app.models.demand_forecaster import DemandForecaster
from app.models.underutilization_detector import UnderutilizationDetector
from app.models.no_show_predictor import NoShowPredictor
from app.models.anomaly_detector import BookingAnomalyDetector

def run_training():
    print("=" * 60)
    print("Starting Campus AI/ML Training Pipeline...")
    print("=" * 60)

    print("\n1. Generating synthetic 6-month campus booking records...")
    df = generate_synthetic_bookings(n_records=3000, random_seed=42)
    print(f"   Generated {len(df)} records.")

    print("\n2. Training Demand Forecaster (XGBoost / GBDT)...")
    forecaster = DemandForecaster()
    forecast_results = forecaster.train(df)
    print(f"   Demand Forecaster Results: {forecast_results}")

    print("\n3. Training No-Show Predictor (Random Forest)...")
    no_show = NoShowPredictor()
    no_show_results = no_show.train(df)
    print(f"   No-Show Classifier Results: {no_show_results}")

    print("\n4. Training Anomaly Detector (Isolation Forest)...")
    anomaly = BookingAnomalyDetector()
    anomaly_results = anomaly.train(df)
    print(f"   Anomaly Detector Results: {anomaly_results}")

    print("\n5. Initializing Underutilization Detector (K-Means)...")
    sample_stats = [
        {"utilization_rate": 18.5, "capacity_efficiency": 25.0, "weekly_bookings": 4},
        {"utilization_rate": 22.0, "capacity_efficiency": 30.0, "weekly_bookings": 5},
        {"utilization_rate": 55.0, "capacity_efficiency": 72.0, "weekly_bookings": 18},
        {"utilization_rate": 62.0, "capacity_efficiency": 80.0, "weekly_bookings": 20},
        {"utilization_rate": 88.0, "capacity_efficiency": 92.0, "weekly_bookings": 32},
        {"utilization_rate": 94.0, "capacity_efficiency": 95.0, "weekly_bookings": 35}
    ]
    u_detector = UnderutilizationDetector()
    kmeans_results = u_detector.fit(sample_stats)
    print(f"   K-Means Results: {kmeans_results}")

    print("\nAll models trained and persisted to saved_models/ successfully!")
    return {
        "demand_forecast": forecast_results,
        "no_show": no_show_results,
        "anomaly": anomaly_results
    }

if __name__ == "__main__":
    run_training()

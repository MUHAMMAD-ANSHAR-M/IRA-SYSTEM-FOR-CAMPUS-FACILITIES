import random
import datetime
import pandas as pd
import numpy as np

FACILITY_TYPES = ["classroom", "computer_lab", "seminar_hall", "auditorium", "sports_facility"]
DEPARTMENTS = ["CSE", "ECE", "MECH", "CIVIL", "MANAGEMENT", "SPORTS", "STUDENT_AFFAIRS"]
EQUIPMENT_OPTIONS = ["projector", "computers", "ac", "audio_system", "smart_board", "lab_kits"]

def generate_synthetic_bookings(n_records: int = 2500, random_seed: int = 42) -> pd.DataFrame:
    random.seed(random_seed)
    np.random.seed(random_seed)

    records = []
    base_date = datetime.datetime.now() - datetime.timedelta(days=180)

    for i in range(n_records):
        day_offset = random.randint(0, 180)
        rec_date = base_date + datetime.timedelta(days=day_offset)
        day_of_week = rec_date.weekday() # 0-6 (0=Mon, 6=Sun)

        # Peak hours weighting: 9am-4pm higher probability
        hour_weights = np.array([
            0.01, 0.01, 0.01, 0.01, 0.01, 0.01, # 0-5
            0.02, 0.04, 0.08, 0.12, 0.15, 0.14, # 6-11
            0.08, 0.12, 0.12, 0.06, 0.02, 0.01, # 12-17
            0.01, 0.01, 0.00, 0.00, 0.00, 0.00  # 18-23
        ], dtype=np.float64)
        hour_weights = hour_weights / np.sum(hour_weights)
        hour = int(np.random.choice(range(24), p=hour_weights))
        duration_hours = random.choice([1, 2, 3])

        # Semester phase: 0 = regular, 1 = midterms (day 45-60, 135-150), 2 = finals (day 80-95, 170-180), 3 = fest/weekend
        if 45 <= day_offset <= 60 or 135 <= day_offset <= 150:
            semester_phase = "midterm"
        elif 80 <= day_offset <= 95 or 170 <= day_offset <= 180:
            semester_phase = "finals"
        elif day_of_week in [5, 6]:
            semester_phase = "weekend_fests"
        else:
            semester_phase = "regular"

        facility_type = random.choice(FACILITY_TYPES)
        department = random.choice(DEPARTMENTS)
        lead_time_days = random.randint(1, 30)

        # Capacity logic based on facility type
        if facility_type == "classroom":
            capacity = random.choice([40, 60, 80])
            expected_attendees = int(capacity * random.uniform(0.5, 0.95))
        elif facility_type == "computer_lab":
            capacity = random.choice([30, 50, 60])
            expected_attendees = int(capacity * random.uniform(0.6, 0.98))
        elif facility_type == "seminar_hall":
            capacity = random.choice([120, 200])
            expected_attendees = int(capacity * random.uniform(0.3, 0.9))
        elif facility_type == "auditorium":
            capacity = random.choice([400, 800])
            expected_attendees = int(capacity * random.uniform(0.4, 0.85))
        else: # sports
            capacity = random.choice([50, 100])
            expected_attendees = int(capacity * random.uniform(0.2, 0.8))

        # No-show probability logic
        # High lead time + low capacity utilization + club/informal event -> higher no show
        no_show_prob = 0.05
        if lead_time_days > 14:
            no_show_prob += 0.12
        if expected_attendees / max(capacity, 1) < 0.4:
            no_show_prob += 0.15
        if day_of_week in [5, 6]:
            no_show_prob += 0.08
        if semester_phase in ["finals", "midterm"]:
            no_show_prob -= 0.05
        no_show_prob = max(0.01, min(0.75, no_show_prob))
        is_no_show = 1 if random.random() < no_show_prob else 0

        # Demand pressure score (synthetic target for demand forecast)
        base_demand = 30.0
        if 9 <= hour <= 14:
            base_demand += 40.0
        if day_of_week < 5:
            base_demand += 20.0
        if semester_phase in ["midterm", "finals"]:
            base_demand += 15.0
        if facility_type in ["computer_lab", "seminar_hall"]:
            base_demand += 10.0
        demand_score = min(100.0, max(5.0, base_demand + random.gauss(0, 5)))

        records.append({
            "booking_id": f"BKG-{i+1:05d}",
            "date": rec_date.strftime("%Y-%m-%d"),
            "day_of_week": day_of_week,
            "hour": hour,
            "duration_hours": duration_hours,
            "semester_phase": semester_phase,
            "facility_type": facility_type,
            "department": department,
            "facility_capacity": capacity,
            "expected_attendees": expected_attendees,
            "lead_time_days": lead_time_days,
            "is_no_show": is_no_show,
            "demand_score": round(demand_score, 2)
        })

    df = pd.DataFrame(records)
    return df

if __name__ == "__main__":
    df = generate_synthetic_bookings()
    print(f"Generated {len(df)} records. Sample head:")
    print(df.head(3))

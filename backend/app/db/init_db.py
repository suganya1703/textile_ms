from backend.app.core.database import engine, SessionLocal, Base
from backend.app.models import Setting
import backend.app.models  # Ensure all models are loaded

DEFAULT_SETTINGS = [
    {"key": "company_name", "value": "Everest Textile Mills", "description": "Active mill tenant name"},
    {"key": "low_stock_threshold_kg", "value": "100.0", "description": "Yarn stock threshold triggering low-stock warning"},
    {"key": "overhead_rate_per_hour", "value": "250.0", "description": "Factory machine overhead allocation per hour (₹)"},
    {"key": "four_point_grade_a_max", "value": "20.0", "description": "Max defect points per 100 sq yd for Grade A pass (ASTM D5430)"},
    {"key": "four_point_grade_b_max", "value": "40.0", "description": "Max defect points per 100 sq yd for Grade B concession (ASTM D5430)"},
    {"key": "expected_yield_ratio", "value": "0.95", "description": "Expected fabric yield ratio from yarn (0.95 = 5% normal process loss)"},
    {"key": "tax_rate_pct", "value": "5.0", "description": "Applicable GST tax rate percentage on fabric dispatches"},
    {"key": "four_point_standard_source", "value": "ASTM D5430 - 4-Point System (American Society for Testing and Materials)", "description": "Official standard reference"},
    {"key": "public_base_url", "value": "http://localhost:5173", "description": "Base URL encoded into Roll Passport QR codes for network and mobile access"}
]

def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        for s in DEFAULT_SETTINGS:
            existing = db.query(Setting).filter(Setting.key == s["key"]).first()
            if not existing:
                db.add(Setting(key=s["key"], value=s["value"], description=s["description"]))
        db.commit()
        print("Database schema created and initial settings verified.")
    finally:
        db.close()

if __name__ == "__main__":
    init_db()

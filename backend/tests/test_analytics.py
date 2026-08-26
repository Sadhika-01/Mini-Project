import sys
import os
import unittest
from fastapi.testclient import TestClient

# Add app to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.main import app
from app.core.database import SessionLocal, engine, Base
from app.models.user import User
from app.models.activity_log import ActivityLog
from app.services.activity_service import log_activity

class AnalyticsTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)

        db = SessionLocal()
        db.query(ActivityLog).delete()
        db.query(User).filter(User.email == "analytics_test@example.com").delete()
        db.commit()

        # Register User
        res_reg = cls.client.post(
            "/api/v1/auth/register",
            json={"name": "Analytics Student", "email": "analytics_test@example.com", "password": "password123"}
        )
        cls.token = res_reg.json()["access_token"]
        cls.user_id = res_reg.json()["user"]["id"]

        # Insert known sample activities into PostgreSQL
        log_activity(db, cls.user_id, "login", metadata={"email": "analytics_test@example.com"})
        log_activity(db, cls.user_id, "create_group", related_entity_id=1, metadata={"name": "Analytics Group"})
        log_activity(db, cls.user_id, "upload_resource", related_entity_id=10, metadata={"filename": "doc1.pdf"})
        log_activity(db, cls.user_id, "upload_resource", related_entity_id=11, metadata={"filename": "doc2.pdf"})
        log_activity(db, cls.user_id, "ai_explain_doubt", metadata={"question": "What is analytics?"})
        log_activity(db, cls.user_id, "ai_generate_summary", related_entity_id=10, metadata={"filename": "doc1.pdf"})

        db.close()

    def test_analytics_overview_calculation(self):
        response = self.client.get(
            "/api/v1/analytics/overview",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        self.assertEqual(response.status_code, 200, response.text)
        data = response.json()

        # Verify calculated metrics match known activity counts
        self.assertEqual(data["resource_uploads_count"], 2)
        self.assertEqual(data["ai_interactions_count"], 2)
        self.assertTrue(data["total_activities"] >= 7)  # Register + Login + Sample logs
        self.assertTrue(data["total_active_days"] >= 1)
        self.assertTrue(data["estimated_study_hours"] > 0)
        self.assertTrue(len(data["weekly_trend"]) == 7)
        self.assertTrue(len(data["recent_activities"]) >= 7)

if __name__ == "__main__":
    unittest.main()

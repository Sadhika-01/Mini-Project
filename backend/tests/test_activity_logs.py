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
from app.services.activity_service import get_user_activity_logs

class ActivityLogsTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)

        db = SessionLocal()
        db.query(ActivityLog).delete()
        db.query(User).filter(User.email == "activity_logger@example.com").delete()
        db.commit()

        # Register User
        res_reg = cls.client.post(
            "/api/v1/auth/register",
            json={"name": "Activity Logger", "email": "activity_logger@example.com", "password": "password123"}
        )
        cls.token = res_reg.json()["access_token"]
        cls.user_id = res_reg.json()["user"]["id"]
        db.close()

    def test_01_verify_activity_logging(self):
        # 1. Perform Login
        self.client.post(
            "/api/v1/auth/login",
            json={"email": "activity_logger@example.com", "password": "password123"}
        )

        # 2. Create Group
        res_group = self.client.post(
            "/api/v1/groups/",
            json={"name": "Activity Test Group", "description": "Group for testing activity logs"},
            headers={"Authorization": f"Bearer {self.token}"}
        )
        group_id = res_group.json()["id"]

        # 3. Ask AI Question
        self.client.post(
            "/api/v1/ai/explain",
            json={"question": "What is activity logging?", "category": "Database"},
            headers={"Authorization": f"Bearer {self.token}"}
        )

        # 4. Query PostgreSQL Activity Logs
        db = SessionLocal()
        logs = get_user_activity_logs(db, self.user_id)
        db.close()

        activity_types = [log.activity_type for log in logs]
        self.assertIn("register", activity_types)
        self.assertIn("login", activity_types)
        self.assertIn("create_group", activity_types)
        self.assertIn("ai_explain_doubt", activity_types)

if __name__ == "__main__":
    unittest.main()

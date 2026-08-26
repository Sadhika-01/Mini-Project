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

class LeaderboardTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)

        db = SessionLocal()
        db.query(ActivityLog).delete()
        db.query(User).filter(User.email.in_(["lb_alpha@example.com", "lb_beta@example.com"])).delete()
        db.commit()

        # Register User Alpha
        res_a = cls.client.post(
            "/api/v1/auth/register",
            json={"name": "Leaderboard Alpha", "email": "lb_alpha@example.com", "password": "password123"}
        )
        cls.token_a = res_a.json()["access_token"]
        cls.user_a_id = res_a.json()["user"]["id"]

        # Register User Beta
        res_b = cls.client.post(
            "/api/v1/auth/register",
            json={"name": "Leaderboard Beta", "email": "lb_beta@example.com", "password": "password123"}
        )
        cls.token_b = res_b.json()["access_token"]
        cls.user_b_id = res_b.json()["user"]["id"]

        # Log activities: User A does 3 activities (+75 XP), User B does 0 extra
        log_activity(db, cls.user_a_id, "upload_resource", metadata={"filename": "notes.pdf"})  # +30
        log_activity(db, cls.user_a_id, "ai_explain_doubt", metadata={"question": "Doubt?"})   # +15
        log_activity(db, cls.user_a_id, "create_group", metadata={"name": "Group A"})          # +30

        db.close()

    def test_leaderboard_xp_and_ranking_updates(self):
        # 1. Fetch initial leaderboard
        res1 = self.client.get(
            "/api/v1/leaderboard/",
            headers={"Authorization": f"Bearer {self.token_a}"}
        )
        self.assertEqual(res1.status_code, 200)
        rankings1 = res1.json()["rankings"]

        # User A should be rank 1
        entry_a = next(r for r in rankings1 if r["user_id"] == self.user_a_id)
        entry_b = next(r for r in rankings1 if r["user_id"] == self.user_b_id)

        self.assertEqual(entry_a["rank"], 1)
        self.assertTrue(entry_a["total_xp"] > entry_b["total_xp"])
        initial_xp_b = entry_b["total_xp"]

        # 2. User B performs activities (+30 upload + 30 create_group + 30 upload = +90 XP)
        db = SessionLocal()
        log_activity(db, self.user_b_id, "upload_resource", metadata={"filename": "res1.pdf"})
        log_activity(db, self.user_b_id, "upload_resource", metadata={"filename": "res2.pdf"})
        log_activity(db, self.user_b_id, "create_group", metadata={"name": "Beta Group"})
        db.close()

        # 3. Fetch leaderboard again and verify User B's XP increased and rank updated
        res2 = self.client.get(
            "/api/v1/leaderboard/",
            headers={"Authorization": f"Bearer {self.token_b}"}
        )
        rankings2 = res2.json()["rankings"]
        updated_b = next(r for r in rankings2 if r["user_id"] == self.user_b_id)

        self.assertEqual(updated_b["total_xp"], initial_xp_b + 90)
        self.assertEqual(updated_b["rank"], 1)  # User B took rank 1!

if __name__ == "__main__":
    unittest.main()

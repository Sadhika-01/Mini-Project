import sys
import os
import unittest
from fastapi.testclient import TestClient

# Add app to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.main import app
from app.core.database import SessionLocal, engine, Base
from app.models.user import User
from app.models.planner import StudyGoal, PlannerTask, StudySession, PointRecord

class PlannerTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)

        db = SessionLocal()
        db.query(PointRecord).delete()
        db.query(StudySession).delete()
        db.query(PlannerTask).delete()
        db.query(StudyGoal).delete()
        db.query(User).filter(User.email == "planner_tester@example.com").delete()
        db.commit()

        # Register User
        res_reg = cls.client.post(
            "/api/v1/auth/register",
            json={"name": "Planner Tester", "email": "planner_tester@example.com", "password": "password123"}
        )
        cls.token = res_reg.json()["access_token"]
        cls.user_id = res_reg.json()["user"]["id"]
        db.close()

    def test_complete_planner_lifecycle(self):
        headers = {"Authorization": f"Bearer {self.token}"}

        # 1. Create Daily Goal
        res_goal = self.client.post(
            "/api/v1/planner/goals",
            json={"title": "Complete 20 DSA problems", "description": "Leetcode Trees", "goal_type": "daily"},
            headers=headers
        )
        self.assertEqual(res_goal.status_code, 201)
        goal_id = res_goal.json()["id"]

        # 2. Create Task
        res_task = self.client.post(
            "/api/v1/planner/tasks",
            json={"title": "Study OS Chapter 4", "description": "Virtual Memory", "priority": "high"},
            headers=headers
        )
        self.assertEqual(res_task.status_code, 201)
        task_id = res_task.json()["id"]

        # 3. Record Study Session
        res_sess = self.client.post(
            "/api/v1/planner/sessions",
            json={"subject": "Operating Systems", "duration_minutes": 90, "notes": "Covered page replacement"},
            headers=headers
        )
        self.assertEqual(res_sess.status_code, 201)

        # 4. Complete Task (+5 points)
        res_comp_task = self.client.post(f"/api/v1/planner/tasks/{task_id}/complete", headers=headers)
        self.assertEqual(res_comp_task.status_code, 200)
        self.assertEqual(res_comp_task.json()["status"], "completed")

        # 5. Complete Goal (+10 points)
        res_comp_goal = self.client.post(f"/api/v1/planner/goals/{goal_id}/complete", headers=headers)
        self.assertEqual(res_comp_goal.status_code, 200)
        self.assertEqual(res_comp_goal.json()["status"], "completed")

        # 6. Verify AT-MOST-ONCE Point Awarding (Complete goal AGAIN)
        res_repeat_goal = self.client.post(f"/api/v1/planner/goals/{goal_id}/complete", headers=headers)
        self.assertEqual(res_repeat_goal.status_code, 200)

        # 7. Check Stats (Should have 10 (session) + 5 (task) + 10 (goal) = 25 points from planner)
        res_stats = self.client.get("/api/v1/planner/stats", headers=headers)
        self.assertEqual(res_stats.status_code, 200)
        stats = res_stats.json()

        self.assertEqual(stats["todays_goals_completed"], 1)
        self.assertEqual(stats["completed_tasks_count"], 1)
        self.assertEqual(stats["total_study_hours"], 1.5)
        self.assertEqual(stats["total_points"], 25)

        # 8. Check Leaderboard integration (points reflected in total_xp)
        res_lb = self.client.get("/api/v1/leaderboard/", headers=headers)
        self.assertEqual(res_lb.status_code, 200)
        rankings = res_lb.json()["rankings"]
        user_rank = next(r for r in rankings if r["user_id"] == self.user_id)
        self.assertTrue(user_rank["total_xp"] >= 75)  # 50 (register) + 25 (planner)

if __name__ == "__main__":
    unittest.main()

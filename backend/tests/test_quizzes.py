import sys
import os
import unittest
import io
from fastapi.testclient import TestClient

# Add app to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.main import app
from app.core.database import SessionLocal, engine, Base
from app.models.user import User
from app.models.group import Group, GroupMember
from app.models.resource import Resource
from app.models.quiz import Quiz, QuizQuestion, QuizAttempt
from app.models.planner import PointRecord
from app.models.activity_log import ActivityLog

class QuizzesTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)

        db = SessionLocal()
        db.query(PointRecord).delete()
        db.query(ActivityLog).delete()
        db.query(QuizAttempt).delete()
        db.query(QuizQuestion).delete()
        db.query(Quiz).delete()
        db.query(Resource).delete()
        db.query(GroupMember).delete()
        db.query(Group).delete()
        db.query(User).filter(User.email == "quiz_tester@example.com").delete()
        db.commit()

        # Register User
        res_reg = cls.client.post(
            "/api/v1/auth/register",
            json={"name": "Quiz Tester", "email": "quiz_tester@example.com", "password": "password123"}
        )
        cls.token = res_reg.json()["access_token"]
        cls.user_id = res_reg.json()["user"]["id"]

        # Create Group
        res_group = cls.client.post(
            "/api/v1/groups/",
            json={"name": "Quiz Study Group", "description": "Group for testing quiz generation"},
            headers={"Authorization": f"Bearer {cls.token}"}
        )
        cls.group_id = res_group.json()["id"]

        # Upload Sample PDF Resource
        minimal_pdf = (
            b"%PDF-1.4\n"
            b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n"
            b"2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n"
            b"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n"
            b"4 0 obj << /Length 75 >> stream\n"
            b"BT /F1 12 Tf 100 700 Td (Cloud Computing Architecture and Distributed Systems Quiz Study Material) Tj ET\n"
            b"endstream\nendobj\n"
            b"5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n"
            b"xref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000252 00000 n \n0000000377 00000 n \n"
            b"trailer << /Size 6 /Root 1 0 R >>\nstartxref\n448\n%%EOF\n"
        )
        res_upload = cls.client.post(
            f"/api/v1/groups/{cls.group_id}/resources/upload",
            files={"file": ("quiz_study_guide.pdf", io.BytesIO(minimal_pdf), "application/pdf")},
            headers={"Authorization": f"Bearer {cls.token}"}
        )
        cls.resource_id = res_upload.json()["id"]
        db.close()

    def test_quiz_generation_and_attempt_lifecycle(self):
        headers = {"Authorization": f"Bearer {self.token}"}

        # 1. Generate Quiz from PDF Resource
        res_gen = self.client.post(
            "/api/v1/quizzes/generate",
            json={"resource_id": self.resource_id, "num_questions": 5},
            headers=headers
        )
        self.assertEqual(res_gen.status_code, 201, res_gen.text)
        quiz_data = res_gen.json()
        quiz_id = quiz_data["id"]

        self.assertEqual(quiz_data["num_questions"], 5)
        self.assertEqual(len(quiz_data["questions"]), 5)
        for q in quiz_data["questions"]:
            self.assertEqual(len(q["options"]), 4)

        # 2. Retrieve Quiz details (Start Quiz)
        res_get = self.client.get(f"/api/v1/quizzes/{quiz_id}", headers=headers)
        self.assertEqual(res_get.status_code, 200)

        # 3. Submit Quiz Attempt with correct answers to score 100%
        # Fetch question objects from DB to get correct_answer
        db = SessionLocal()
        questions = db.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz_id).all()
        answers_payload = {str(q.id): q.correct_answer for q in questions}
        db.close()

        res_submit = self.client.post(
            f"/api/v1/quizzes/{quiz_id}/attempt",
            json={"answers": answers_payload},
            headers=headers
        )
        self.assertEqual(res_submit.status_code, 200, res_submit.text)
        result = res_submit.json()

        self.assertEqual(result["score"], 5)
        self.assertEqual(result["percentage"], 100.0)
        self.assertEqual(result["points_earned"], 25)  # 10 (completion) + 15 (high score bonus)

        # 4. Verify Activity Logs in DB
        db = SessionLocal()
        logs = db.query(ActivityLog).filter(ActivityLog.user_id == self.user_id).all()
        act_types = [l.activity_type for l in logs]
        self.assertIn("quiz_generated", act_types)
        self.assertIn("quiz_started", act_types)
        self.assertIn("quiz_completed", act_types)
        db.close()

if __name__ == "__main__":
    unittest.main()

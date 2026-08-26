import sys
import os
import unittest
from fastapi.testclient import TestClient

# Add app to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.main import app
from app.core.database import SessionLocal, engine, Base
from app.models.user import User

class AITestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)

        # Set up test user
        db = SessionLocal()
        db.query(User).filter(User.email == "ai_tester@example.com").delete()
        db.commit()

        res_reg = cls.client.post(
            "/api/v1/auth/register",
            json={"name": "AI Tester", "email": "ai_tester@example.com", "password": "password123"}
        )
        cls.token = res_reg.json()["access_token"]
        db.close()

    def test_01_academic_test_endpoint(self):
        response = self.client.post(
            "/api/v1/ai/test-academic",
            json={"question": "Explain CAP theorem in distributed database systems."},
            headers={"Authorization": f"Bearer {self.token}"}
        )
        self.assertEqual(response.status_code, 200, response.text)
        data = response.json()
        self.assertEqual(data["question"], "Explain CAP theorem in distributed database systems.")
        self.assertIn("response", data)
        self.assertIn("source", data)

    def test_02_explain_doubt_endpoint(self):
        response = self.client.post(
            "/api/v1/ai/explain",
            json={
                "question": "What is the role of backpropagation in neural networks?",
                "category": "Machine Learning"
            },
            headers={"Authorization": f"Bearer {self.token}"}
        )
        self.assertEqual(response.status_code, 200, response.text)
        data = response.json()
        self.assertIn("explanation", data)

    def test_03_improve_answer_endpoint(self):
        response = self.client.post(
            "/api/v1/ai/improve-answer",
            json={
                "question": "What is deadlocking in OS?",
                "raw_answer": "When process waits for another process."
            },
            headers={"Authorization": f"Bearer {self.token}"}
        )
        self.assertEqual(response.status_code, 200, response.text)
        data = response.json()
        self.assertIn("improved_answer", data)

if __name__ == "__main__":
    unittest.main()

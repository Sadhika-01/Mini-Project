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
from app.models.flashcard import FlashcardSet, Flashcard
from app.models.activity_log import ActivityLog

class FlashcardsTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)

        db = SessionLocal()
        db.query(ActivityLog).delete()
        db.query(Flashcard).delete()
        db.query(FlashcardSet).delete()
        db.query(Resource).delete()
        db.query(GroupMember).delete()
        db.query(Group).delete()
        db.query(User).filter(User.email == "flashcard_tester@example.com").delete()
        db.commit()

        # Register User
        res_reg = cls.client.post(
            "/api/v1/auth/register",
            json={"name": "Flashcard Tester", "email": "flashcard_tester@example.com", "password": "password123"}
        )
        cls.token = res_reg.json()["access_token"]
        cls.user_id = res_reg.json()["user"]["id"]

        # Create Group
        res_group = cls.client.post(
            "/api/v1/groups/",
            json={"name": "Flashcard Study Group", "description": "Group for flashcards test"},
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
            b"BT /F1 12 Tf 100 700 Td (Cloud Computing Concepts Flashcard Revision Material) Tj ET\n"
            b"endstream\nendobj\n"
            b"5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n"
            b"xref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000252 00000 n \n0000000377 00000 n \n"
            b"trailer << /Size 6 /Root 1 0 R >>\nstartxref\n448\n%%EOF\n"
        )
        res_upload = cls.client.post(
            f"/api/v1/groups/{cls.group_id}/resources/upload",
            files={"file": ("flashcard_study_material.pdf", io.BytesIO(minimal_pdf), "application/pdf")},
            headers={"Authorization": f"Bearer {cls.token}"}
        )
        cls.resource_id = res_upload.json()["id"]
        db.close()

    def test_flashcard_generation_and_review_lifecycle(self):
        headers = {"Authorization": f"Bearer {self.token}"}

        # 1. Generate Flashcard Set from PDF Resource
        res_gen = self.client.post(
            "/api/v1/flashcards/generate",
            json={"resource_id": self.resource_id, "num_cards": 5},
            headers=headers
        )
        self.assertEqual(res_gen.status_code, 201, res_gen.text)
        set_data = res_gen.json()
        set_id = set_data["id"]

        self.assertTrue(set_data["num_cards"] >= 5)
        self.assertTrue(len(set_data["cards"]) >= 5)
        for c in set_data["cards"]:
            self.assertTrue(len(c["front"]) > 0)
            self.assertTrue(len(c["back"]) > 0)

        # 2. Retrieve Flashcard Set by ID (Review Flashcards)
        res_get = self.client.get(f"/api/v1/flashcards/{set_id}", headers=headers)
        self.assertEqual(res_get.status_code, 200)
        retrieved_set = res_get.json()
        self.assertEqual(retrieved_set["id"], set_id)

        # 3. List My Flashcard Sets
        res_my = self.client.get("/api/v1/flashcards/my", headers=headers)
        self.assertEqual(res_my.status_code, 200)
        my_sets = res_my.json()
        self.assertTrue(len(my_sets) >= 1)

        # 4. Verify Activity Logs in DB
        db = SessionLocal()
        logs = db.query(ActivityLog).filter(ActivityLog.user_id == self.user_id).all()
        act_types = [l.activity_type for l in logs]
        self.assertIn("flashcards_generated", act_types)
        self.assertIn("flashcards_reviewed", act_types)
        db.close()

if __name__ == "__main__":
    unittest.main()

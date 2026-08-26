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

class PDFSummarizeTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)

        # Set up test user & group
        db = SessionLocal()
        db.query(Resource).delete()
        db.query(GroupMember).delete()
        db.query(Group).delete()
        db.query(User).filter(User.email == "pdf_summarize_test@example.com").delete()
        db.commit()

        # Register User
        res_reg = cls.client.post(
            "/api/v1/auth/register",
            json={"name": "PDF Summarizer Tester", "email": "pdf_summarize_test@example.com", "password": "password123"}
        )
        cls.token = res_reg.json()["access_token"]

        # Create Group
        res_group = cls.client.post(
            "/api/v1/groups/",
            json={"name": "PDF Test Group", "description": "Group for testing PDF summaries"},
            headers={"Authorization": f"Bearer {cls.token}"}
        )
        cls.group_id = res_group.json()["id"]
        db.close()

    def test_01_upload_and_summarize_pdf(self):
        # Generate a valid PDF stream using reportlab or minimal PDF structure
        # Standard minimal PDF file with extractable text
        minimal_pdf = (
            b"%PDF-1.4\n"
            b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n"
            b"2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n"
            b"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n"
            b"4 0 obj << /Length 75 >> stream\n"
            b"BT /F1 12 Tf 100 700 Td (Cloud Computing Architecture and Distributed Systems Overview) Tj ET\n"
            b"endstream\nendobj\n"
            b"5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n"
            b"xref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000252 00000 n \n0000000377 00000 n \n"
            b"trailer << /Size 6 /Root 1 0 R >>\nstartxref\n448\n%%EOF\n"
        )

        file_obj = io.BytesIO(minimal_pdf)

        # Upload PDF
        res_upload = self.client.post(
            f"/api/v1/groups/{self.group_id}/resources/upload",
            files={"file": ("cloud_lecture_slides.pdf", file_obj, "application/pdf")},
            headers={"Authorization": f"Bearer {self.token}"}
        )
        self.assertEqual(res_upload.status_code, 201, res_upload.text)
        resource_id = res_upload.json()["id"]

        # Request AI Summary
        res_summarize = self.client.post(
            f"/api/v1/resources/{resource_id}/summarize",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        self.assertEqual(res_summarize.status_code, 200, res_summarize.text)
        data = res_summarize.json()

        self.assertEqual(data["resource_id"], resource_id)
        self.assertEqual(data["filename"], "cloud_lecture_slides.pdf")
        self.assertIn("summary", data)
        self.assertTrue(len(data["summary"]) > 0)

if __name__ == "__main__":
    unittest.main()

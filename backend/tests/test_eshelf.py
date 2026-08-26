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

class EShelfTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)

        # Set up test user and group
        db = SessionLocal()
        db.query(Resource).delete()
        db.query(GroupMember).delete()
        db.query(Group).delete()
        db.query(User).filter(User.email == "eshelf_tester@example.com").delete()
        db.commit()

        # Register User
        res_reg = cls.client.post(
            "/api/v1/auth/register",
            json={"name": "E-Shelf Tester", "email": "eshelf_tester@example.com", "password": "password123"}
        )
        cls.token = res_reg.json()["access_token"]

        # Create Group
        res_group = cls.client.post(
            "/api/v1/groups/",
            json={"name": "E-Shelf Study Group", "description": "Resource sharing group"},
            headers={"Authorization": f"Bearer {cls.token}"}
        )
        cls.group_id = res_group.json()["id"]
        db.close()

    def test_01_upload_pdf_success(self):
        pdf_content = b"%PDF-1.4 sample pdf content for testing e-shelf resource upload"
        file_obj = io.BytesIO(pdf_content)

        response = self.client.post(
            f"/api/v1/groups/{self.group_id}/resources/upload",
            files={"file": ("lecture_slides.pdf", file_obj, "application/pdf")},
            headers={"Authorization": f"Bearer {self.token}"}
        )

        self.assertEqual(response.status_code, 201, response.text)
        data = response.json()
        self.assertEqual(data["filename"], "lecture_slides.pdf")
        self.assertEqual(data["file_type"], "pdf")
        self.assertEqual(data["file_size"], len(pdf_content))
        self.__class__.uploaded_resource_id = data["id"]

    def test_02_get_group_resources(self):
        response = self.client.get(
            f"/api/v1/groups/{self.group_id}/resources",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        self.assertEqual(response.status_code, 200)
        resources = response.json()
        self.assertTrue(len(resources) >= 1)
        self.assertEqual(resources[0]["filename"], "lecture_slides.pdf")

    def test_03_download_resource(self):
        response = self.client.get(
            f"/api/v1/resources/{self.uploaded_resource_id}/download",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"%PDF-1.4", response.content)

    def test_04_upload_invalid_extension(self):
        file_obj = io.BytesIO(b"malicious script content")
        response = self.client.post(
            f"/api/v1/groups/{self.group_id}/resources/upload",
            files={"file": ("script.exe", file_obj, "application/octet-stream")},
            headers={"Authorization": f"Bearer {self.token}"}
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("Unsupported file format", response.json()["detail"])

if __name__ == "__main__":
    unittest.main()

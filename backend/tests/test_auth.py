import sys
import os
import unittest
from fastapi.testclient import TestClient

# Add app to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.main import app
from app.core.database import SessionLocal, engine, Base
from app.models.user import User

class AuthTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)
        cls.test_email = "testuser_unit@example.com"
        cls.test_password = "password123"
        cls.test_name = "Unit Test User"

    def setUp(self):
        # Clean up test user if exists
        db = SessionLocal()
        db.query(User).filter(User.email == self.test_email).delete()
        db.commit()
        db.close()

    def test_01_register_user_success(self):
        response = self.client.post(
            "/api/v1/auth/register",
            json={
                "name": self.test_name,
                "email": self.test_email,
                "password": self.test_password
            }
        )
        self.assertEqual(response.status_code, 201, response.text)
        data = response.json()
        self.assertIn("access_token", data)
        self.assertEqual(data["token_type"], "bearer")
        self.assertEqual(data["user"]["email"], self.test_email)
        self.assertEqual(data["user"]["name"], self.test_name)

    def test_02_register_duplicate_email(self):
        # Register first time
        self.client.post(
            "/api/v1/auth/register",
            json={
                "name": self.test_name,
                "email": self.test_email,
                "password": self.test_password
            }
        )
        # Register second time
        response = self.client.post(
            "/api/v1/auth/register",
            json={
                "name": self.test_name,
                "email": self.test_email,
                "password": self.test_password
            }
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("already exists", response.json()["detail"])

    def test_03_login_success(self):
        # Register user first
        self.client.post(
            "/api/v1/auth/register",
            json={
                "name": self.test_name,
                "email": self.test_email,
                "password": self.test_password
            }
        )
        # Login
        response = self.client.post(
            "/api/v1/auth/login",
            json={
                "email": self.test_email,
                "password": self.test_password
            }
        )
        self.assertEqual(response.status_code, 200, response.text)
        data = response.json()
        self.assertIn("access_token", data)

    def test_04_login_invalid_password(self):
        # Register user first
        self.client.post(
            "/api/v1/auth/register",
            json={
                "name": self.test_name,
                "email": self.test_email,
                "password": self.test_password
            }
        )
        # Attempt login with wrong password
        response = self.client.post(
            "/api/v1/auth/login",
            json={
                "email": self.test_email,
                "password": "wrongpassword"
            }
        )
        self.assertEqual(response.status_code, 401)

    def test_05_protected_route_me(self):
        # Register user and get token
        reg_res = self.client.post(
            "/api/v1/auth/register",
            json={
                "name": self.test_name,
                "email": self.test_email,
                "password": self.test_password
            }
        )
        token = reg_res.json()["access_token"]

        # Call /me without token -> 401
        res_no_token = self.client.get("/api/v1/auth/me")
        self.assertEqual(res_no_token.status_code, 401)

        # Call /me with token -> 200
        res_with_token = self.client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(res_with_token.status_code, 200)
        self.assertEqual(res_with_token.json()["email"], self.test_email)

if __name__ == "__main__":
    unittest.main()

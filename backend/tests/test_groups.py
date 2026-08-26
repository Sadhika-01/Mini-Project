import sys
import os
import unittest
from fastapi.testclient import TestClient

# Add app to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.main import app
from app.core.database import SessionLocal, engine, Base
from app.models.user import User
from app.models.group import Group, GroupMember

class StudyGroupTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)

        # Create User A & User B
        db = SessionLocal()
        db.query(GroupMember).delete()
        db.query(Group).delete()
        db.query(User).filter(User.email.in_(["usera@example.com", "userb@example.com"])).delete()
        db.commit()

        # Register User A
        res_a = cls.client.post(
            "/api/v1/auth/register",
            json={"name": "User A", "email": "usera@example.com", "password": "password123"}
        )
        cls.token_a = res_a.json()["access_token"]
        cls.user_a_id = res_a.json()["user"]["id"]

        # Register User B
        res_b = cls.client.post(
            "/api/v1/auth/register",
            json={"name": "User B", "email": "userb@example.com", "password": "password123"}
        )
        cls.token_b = res_b.json()["access_token"]
        cls.user_b_id = res_b.json()["user"]["id"]

        db.close()

    def test_group_lifecycle(self):
        # 1. User A creates group
        res_create = self.client.post(
            "/api/v1/groups/",
            json={"name": "AWS Architecture Group", "description": "Cloud discussion group"},
            headers={"Authorization": f"Bearer {self.token_a}"}
        )
        self.assertEqual(res_create.status_code, 201, res_create.text)
        group_data = res_create.json()
        group_id = group_data["id"]
        self.assertEqual(group_data["name"], "AWS Architecture Group")
        self.assertEqual(group_data["member_count"], 1)

        # 2. User B sees the group in Browse Groups
        res_browse = self.client.get(
            "/api/v1/groups/",
            headers={"Authorization": f"Bearer {self.token_b}"}
        )
        self.assertEqual(res_browse.status_code, 200)
        groups = res_browse.json()
        target = next((g for g in groups if g["id"] == group_id), None)
        self.assertIsNotNone(target)
        self.assertFalse(target["is_member"])

        # 3. User B joins the group
        res_join = self.client.post(
            f"/api/v1/groups/{group_id}/join",
            headers={"Authorization": f"Bearer {self.token_b}"}
        )
        self.assertEqual(res_join.status_code, 200)
        self.assertTrue(res_join.json()["is_member"])
        self.assertEqual(res_join.json()["member_count"], 2)

        # 4. Both users can see group membership
        res_members_a = self.client.get(
            f"/api/v1/groups/{group_id}/members",
            headers={"Authorization": f"Bearer {self.token_a}"}
        )
        self.assertEqual(res_members_a.status_code, 200)
        member_ids_a = [m["user_id"] for m in res_members_a.json()]
        self.assertIn(self.user_a_id, member_ids_a)
        self.assertIn(self.user_b_id, member_ids_a)

        res_members_b = self.client.get(
            f"/api/v1/groups/{group_id}/members",
            headers={"Authorization": f"Bearer {self.token_b}"}
        )
        self.assertEqual(res_members_b.status_code, 200)
        self.assertEqual(len(res_members_b.json()), 2)

        # 5. User B leaves the group
        res_leave = self.client.post(
            f"/api/v1/groups/{group_id}/leave",
            headers={"Authorization": f"Bearer {self.token_b}"}
        )
        self.assertEqual(res_leave.status_code, 200)

        # Check membership after leave
        res_members_after = self.client.get(
            f"/api/v1/groups/{group_id}/members",
            headers={"Authorization": f"Bearer {self.token_a}"}
        )
        member_ids_after = [m["user_id"] for m in res_members_after.json()]
        self.assertIn(self.user_a_id, member_ids_after)
        self.assertNotIn(self.user_b_id, member_ids_after)

if __name__ == "__main__":
    unittest.main()
